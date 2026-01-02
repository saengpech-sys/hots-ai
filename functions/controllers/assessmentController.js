/**
 * 📝 Assessment Controller
 * 
 * Cloud Functions สำหรับประเมินคำตอบนักเรียน
 * - assessAnswer: ประเมิน HOTS พร้อม AI
 * - assessSubmissionMultiPass: Multi-pass assessment
 * - assessAnswerMultiAgent: Multi-agent assessment
 * 
 * ย้ายมาจาก index.js เพื่อ Clean Architecture
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })

// Get db lazily
const getDb = () => admin.firestore()

// Import utilities
const { checkIPRateLimit, checkUserRateLimit } = require('../utils/rateLimiter')
const distributedRateLimiter = require('../utils/distributedRateLimiter')
const { getOpenAIClient, openaiApiKeySecret, getDefaultModel } = require('../utils/openaiClient')
const { CircuitBreaker } = require('../utils/circuitBreaker')
const { detectEmotionalState, detectSpeedRun, detectHackerAttempt, validateAntiCheat, detectCopyPaste } = require('../utils/antiCheat')
const { createAssessmentPrompt } = require('../utils/prompts')
const { getFallbackAssessment, logReliabilityEvent, executeWithRetry, parseAIResponseSafely, calculateReliabilityScore } = require('../utils/reliability')
const { assessLearningOutcomes, updateStudentLOProgress } = require('../utils/loAssessment')
const { calculatePointsSimple, checkBadges, calculateStreak } = require('../gamification')
const { logLearningEvent, updateGrowthHistory, EVENT_TYPES, logSequenceEvent, SEQUENCE_EVENT_TYPES } = require('../utils/researchData')
const { generateAdaptiveScaffolding, formatScaffoldingMessage, SCAFFOLDING_LEVELS } = require('../utils/adaptiveScaffolding')
const { adjustForDoubleCounting } = require('../utils/constructValidity')
const { checkScoreAppropriateness } = require('../utils/gradeLevelCalibration')
const { quickAICheck, comprehensiveAIDetection } = require('../utils/aiDetection')
const { recordModelFingerprint } = require('../utils/modelDriftDetector')
const { shouldFlagForReview, createReviewQueueItem } = require('../utils/humanInTheLoop')
const { runMultiAgentAssessment } = require('../utils/multiAgentAssessment')
const { getLLMProvider } = require('../utils/llmProvider')
const { saveAssessmentWithTransaction, checkDuplicateSubmission, generateIdempotencyKey } = require('../utils/dataConsistency')

// Circuit Breaker for OpenAI
const openaiCircuitBreaker = new CircuitBreaker('openai-assessment', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,
  monitoringWindow: 60000
})

// ============================================================
// 📝 MAIN ASSESSMENT FUNCTION
// ============================================================

exports.assessAnswer = functions.runWith({ secrets: [openaiApiKeySecret] }).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { 
        studentId, sessionId, courseId, questionId, questionContext, studentAnswer, 
        learningOutcomes, typingFingerprint,
        // 🔬 NEW: Research metadata fields
        answerMetrics,       // { wordCount, charCount, sentenceCount }
        timingMetrics,       // { answerDurationMs, firstKeystrokeMs }
        revisionMetrics,     // { revisionCount, majorRevisions }
        assessmentType,      // "pretest" | "posttest" | "formative"
        experimentGroup,     // "control" | "treatment" | null
        sessionNumber,       // nth session for this student
        weekOfTerm,          // Week 1-20
        // 🔬 PHASE 2: Grade-level calibration
        gradeLevel,          // e.g., "ม.3", "ป.6" - for grade-appropriate scoring
        subject,             // e.g., "วิทยาศาสตร์", "ภาษาไทย"
        // 🆕 IDEMPOTENCY: Prevent duplicate submissions
        idempotencyKey       // Client-generated unique key per submission attempt
      } = req.body

      // Validate input
      if (!studentId || !sessionId || !studentAnswer) {
        return res.status(400).send({ 
          error: 'Missing required fields: studentId, sessionId, studentAnswer' 
        })
      }

      // 🆕 IDEMPOTENCY CHECK: Prevent duplicate submissions from network retries
      const effectiveIdempotencyKey = idempotencyKey || `${sessionId}_${questionId || 'general'}_${Date.now()}`
      
      // Check if this request was already processed
      const existingAssessment = await db.collection('assessments')
        .where('idempotencyKey', '==', effectiveIdempotencyKey)
        .limit(1)
        .get()
      
      if (!existingAssessment.empty) {
        console.log(`🔄 Idempotent request detected: ${effectiveIdempotencyKey}`)
        const cachedResult = existingAssessment.docs[0]
        return res.status(200).json({
          success: true,
          cached: true,
          id: cachedResult.id,
          result: cachedResult.data(),
          message: 'Assessment already processed (duplicate request)'
        })
      }

      // 🛡️ SERVER-SIDE VALIDATION: Minimum answer length (20 characters)
      // Client-side validation can be bypassed - this is the authoritative check
      const MIN_ANSWER_LENGTH = 20
      if (!studentAnswer || studentAnswer.trim().length < MIN_ANSWER_LENGTH) {
        console.warn(`⚠️ Answer too short from student ${studentId}: ${studentAnswer?.length || 0} chars`)
        return res.status(400).send({
          error: 'Answer too short',
          message: `คำตอบต้องมีความยาวอย่างน้อย ${MIN_ANSWER_LENGTH} ตัวอักษร (ขณะนี้มี ${studentAnswer?.trim()?.length || 0} ตัวอักษร)`,
          minLength: MIN_ANSWER_LENGTH,
          actualLength: studentAnswer?.trim()?.length || 0
        })
      }

      // 🚦 RATE LIMITING: ป้องกัน spam API calls (Distributed-first with fallback)
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip
      
      // Try distributed rate limiter first (Redis/Firestore)
      let rateLimitResult
      try {
        rateLimitResult = await distributedRateLimiter.checkUserRateLimit(studentId, 'assessment')
        if (!rateLimitResult.allowed) {
          console.warn(`🚨 Distributed rate limit exceeded: ${studentId}`)
          return res.status(429).send({
            error: 'Rate Limit Exceeded',
            message: rateLimitResult.blockedUntil 
              ? `คุณถูกบล็อคชั่วคราว กรุณารอจนถึง ${new Date(rateLimitResult.blockedUntil).toLocaleTimeString('th-TH')}`
              : 'คุณส่งคำตอบเร็วเกินไป กรุณารอสักครู่',
            remaining: rateLimitResult.remaining,
            retryAfter: rateLimitResult.retryAfter || 60,
            backend: rateLimitResult.backend
          })
        }
      } catch (distRateLimitErr) {
        console.warn('⚠️ Distributed rate limiter failed, falling back to basic:', distRateLimitErr.message)
        // Fallback to basic rate limiter
        const ipRateResult = checkIPRateLimit(ip, 'assessment')
        if (!ipRateResult.allowed) {
          console.warn(`🚨 IP rate limit exceeded: ${ip}`)
          return res.status(429).send({
            error: 'Too Many Requests',
            message: 'คุณส่งคำขอเร็วเกินไป กรุณารอสักครู่',
            retryAfter: 60
          })
        }

        const userRateResult = await checkUserRateLimit(db, studentId, 'assessment')
        if (!userRateResult.allowed) {
          console.warn(`🚨 User rate limit exceeded: ${studentId}`)
          return res.status(429).send({
            error: 'Rate Limit Exceeded',
            message: userRateResult.error || 'คุณส่งคำตอบเร็วเกินไป กรุณารอ 5 นาที',
            remaining: userRateResult.remaining,
            resetAt: userRateResult.resetAt
          })
        }
      }

      // Validate OpenAI is configured (early check before expensive operations)
      try {
        getOpenAIClient()
      } catch (err) {
        return res.status(500).send({
          error: 'OpenAI API not configured',
          message: 'Please set OpenAI API key secret using: firebase functions:secrets:set OPENAI_API_KEY'
        })
      }

      // 🆕 EMOTIONAL SUPPORT DETECTION: ตรวจจับความเครียด/ท้อแท้
      const emotionalState = detectEmotionalState(studentAnswer)
      if (emotionalState.isEmotional && emotionalState.intensity !== 'low') {
        console.log(`💙 Emotional state detected for student ${studentId}:`, emotionalState)
        
        // Log emotional state
        await db.collection('emotionalLogs').add({
          studentId,
          sessionId,
          emotionType: emotionalState.emotionType,
          intensity: emotionalState.intensity,
          matchedPatterns: emotionalState.matchedPatterns,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
        
        // Return supportive response instead of assessment
        if (emotionalState.intensity === 'high') {
          return res.status(200).json({
            success: true,
            isSupportiveMode: true,
            emotionalState: emotionalState,
            supportiveMessage: '💙 ครูเห็นว่าหนูกำลังรู้สึกท้อแท้หรือเครียด ไม่เป็นไรนะ การเรียนรู้ต้องใช้เวลา\n\n🌟 ลองหยุดพักสักครู่ หายใจลึกๆ แล้วค่อยกลับมาทำใหม่\n\n💪 ถ้ายังไม่เข้าใจ ลองอ่านคำถามอีกครั้งช้าๆ หรือถามครูผู้สอนได้เลยนะ\n\n📚 ความผิดพลาดคือส่วนหนึ่งของการเรียนรู้ ไม่มีใครเก่งตั้งแต่เริ่มต้น!',
            tips: [
              'ลองแบ่งคำถามออกเป็นส่วนย่อยๆ',
              'เขียนสิ่งที่รู้ออกมาก่อน',
              'ถามตัวเองว่า "คำถามนี้ถามอะไรจริงๆ"',
              'ปรึกษาเพื่อนหรือครู'
            ]
          })
        }
      }

      // 🆕 SPEED RUN DETECTION: ตรวจจับการตอบเร็วเกินไป
      const speedRunResult = detectSpeedRun(studentAnswer, typingFingerprint)
      if (speedRunResult.isSpeedRun) {
        console.warn(`⚡ Speed run detected for student ${studentId}:`, speedRunResult)
        
        await db.collection('antiCheatLogs').add({
          studentId,
          sessionId,
          type: 'speed_run',
          timeSpent: speedRunResult.timeSpent,
          expectedMinTime: speedRunResult.expectedMinTime,
          reason: speedRunResult.reason,
          answerLength: studentAnswer.length,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
        
        return res.status(400).send({
          error: 'Speed run detected',
          speedRun: true,
          message: `⚡ ตอบเร็วเกินไป! ${speedRunResult.reason}\n\n📝 คำถาม HOTS ต้องใช้เวลาคิดวิเคราะห์ กรุณาอ่านคำถามอีกครั้งและคิดให้รอบคอบก่อนตอบ`,
          timeSpent: speedRunResult.timeSpent,
          expectedMinTime: speedRunResult.expectedMinTime
        })
      }

      // 🆕 HACKER/CODE DETECTION: ตรวจจับ code และ prompt injection
      const hackerResult = detectHackerAttempt(studentAnswer)
      if (hackerResult.isHacker) {
        console.warn(`🚨 Hacker attempt detected for student ${studentId}:`, hackerResult)
        
        await db.collection('antiCheatLogs').add({
          studentId,
          sessionId,
          type: 'hacker_attempt',
          hackerType: hackerResult.type,
          severity: hackerResult.severity,
          reason: hackerResult.reason,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
        
        // Different messages based on type
        let warningMessage = ''
        if (hackerResult.type === 'prompt_injection') {
          warningMessage = '🛡️ ระบบตรวจพบความพยายามแทรกคำสั่ง\n\nการกระทำนี้ถูกบันทึกไว้แล้ว กรุณาตอบคำถามตามปกติ'
        } else {
          warningMessage = `🤖 กรุณาตอบเป็น "ภาษาคน" ไม่ใช่โค้ดโปรแกรม!\n\nระบบตรวจพบ: ${hackerResult.reason}\n\n📝 คำถาม HOTS ต้องการคำตอบที่แสดงการคิดวิเคราะห์ ไม่ใช่โค้ดคอมพิวเตอร์`
        }
        
        return res.status(400).send({
          error: 'Invalid answer content',
          hackerAttempt: true,
          type: hackerResult.type,
          severity: hackerResult.severity,
          message: warningMessage
        })
      }

      // 🆕 Enhanced Anti-Cheat: Server-side validation with typing fingerprint
      const antiCheatResult = validateAntiCheat(studentAnswer, typingFingerprint)
      if (!antiCheatResult.isValid) {
        console.warn(`🚨 Anti-cheat triggered for student ${studentId}:`, antiCheatResult.reasons)
        
        // Log suspicious activity
        await db.collection('antiCheatLogs').add({
          studentId,
          sessionId,
          questionId: questionId || null,
          answer: studentAnswer.substring(0, 200), // Store only first 200 chars
          typingFingerprint: typingFingerprint || null,
          reasons: antiCheatResult.reasons,
          suspiciousLevel: antiCheatResult.suspiciousLevel,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
        
        return res.status(400).send({
          error: 'Possible copy-paste detected',
          antiCheat: true,
          details: antiCheatResult.reasons,
          suspiciousLevel: antiCheatResult.suspiciousLevel
        })
      }
      
      // Log warning-level detections for review
      if (antiCheatResult.suspiciousLevel >= 30) {
        await db.collection('antiCheatLogs').add({
          studentId,
          sessionId,
          questionId: questionId || null,
          level: 'warning',
          suspiciousLevel: antiCheatResult.suspiciousLevel,
          reasons: antiCheatResult.reasons,
          warnings: antiCheatResult.warnings || [],
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      // 🆕 SCAFFOLDING: Check if this is a retry attempt
      const sessionRef = db.collection('sessions').doc(sessionId)
      const sessionDoc = await sessionRef.get()
      const sessionData = sessionDoc.data() || {}
      const scaffoldingAttempts = sessionData.scaffoldingAttempts || 0
      const previousAnswer = sessionData.previousAnswer || null
      const isScaffolding = sessionData.isScaffolding || false

      // 🔬 PHASE 2: Fetch student data early for grade-level calibration
      let studentData = null
      try {
        const studentDoc = await db.collection('users').doc(studentId).get()
        if (studentDoc.exists) {
          const data = studentDoc.data()
          studentData = {
            displayName: data.displayName || 'Unknown Student',
            studentId: data.studentId || null,
            grade: data.grade || null,
            room: data.room || null,
            section: data.section || null,
            schoolId: data.schoolId || null
          }
        }
      } catch (error) {
        console.error('Error fetching student data for grade context:', error)
      }

      // Create assessment prompt for OpenAI
      const prompt = createAssessmentPrompt(questionContext, studentAnswer, {
        isScaffolding,
        scaffoldingAttempts,
        previousAnswer,
        gradeLevel: gradeLevel || studentData?.grade || null,  // 🔬 PHASE 2: Pass grade level
        subject: subject || null  // 🔬 PHASE 2: Pass subject for context
      })

      // Get model from config or env - Default to gpt-4o-mini (locked version recommended)
      const model = process.env.OPENAI_MODEL || functions.config().openai?.model || 'gpt-4o-mini-2024-07-18'

      // � CIRCUIT BREAKER: Check if OpenAI service is healthy before calling
      if (!openaiCircuitBreaker.canExecute()) {
        console.warn('🔌 Circuit breaker OPEN - using fallback immediately')
        
        const circuitState = openaiCircuitBreaker.getState()
        
        // Log circuit breaker trip
        await logReliabilityEvent(db, {
          type: 'CIRCUIT_BREAKER_OPEN',
          studentId,
          sessionId,
          circuitState,
          message: 'OpenAI circuit breaker is open, using fallback'
        })
        
        // Use fallback assessment
        const fallbackResult = getFallbackAssessment(studentAnswer, 'OpenAI service temporarily unavailable (circuit breaker)')
        
        const fallbackData = {
          sessionId,
          studentId,
          courseId: courseId || null,
          questionId: questionId || null,
          questionContext: questionContext || 'General HOTS Assessment',
          rawAnswer: studentAnswer,
          rubricScores: fallbackResult.rubricScores,
          overallScore: Object.values(fallbackResult.rubricScores).reduce((a, b) => a + b, 0),
          feedbackText: fallbackResult.feedback,
          isFallback: true,
          fallbackReason: 'circuit_breaker_open',
          circuitState: circuitState.state,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          reliabilityScore: 15
        }
        
        const fallbackRef = await db.collection('assessments').add(fallbackData)
        
        return res.status(503).json({
          success: true,
          id: fallbackRef.id,
          result: fallbackData,
          warning: 'Service temporarily degraded - using fallback scoring',
          retryAfter: Math.ceil(openaiCircuitBreaker.config.timeout / 1000)
        })
      }

      // 🛡️ RELIABILITY: Execute OpenAI call with retry mechanism + circuit breaker tracking
      let responseText, completion
      const aiCallResult = await executeWithRetry(async () => {
        const result = await getOpenAIClient().chat.completions.create({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational assessor specializing in Higher-Order Thinking Skills (HOTS) evaluation. You provide accurate, constructive feedback in Thai language. Always respond with valid JSON format. CRITICAL: You MUST output valid JSON only, no markdown formatting.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0,        // Phase 2: Zero temperature for consistent scoring
          seed: 42,              // Phase 2: Fixed seed for reproducibility
          max_tokens: 1500       // Increased for CoT reasoning
        })
        return result
      }, { maxRetries: 3 })

      // 🛡️ RELIABILITY: Handle AI call failure with fallback
      if (!aiCallResult.success) {
        console.error('OpenAI call failed after retries:', aiCallResult.errors)
        
        // 🔌 Record failure with circuit breaker
        openaiCircuitBreaker.recordFailure(aiCallResult.errors[aiCallResult.errors.length - 1] || new Error('Unknown AI error'))
        
        // Log reliability event
        await logReliabilityEvent(db, {
          type: 'AI_CALL_FAILED',
          studentId,
          sessionId,
          errors: aiCallResult.errors,
          attempts: aiCallResult.attempts,
          circuitState: openaiCircuitBreaker.getState().state
        })
        
        // Use fallback assessment
        const fallbackResult = getFallbackAssessment(studentAnswer, 'AI service unavailable after retries')
        
        // Save fallback assessment
        const fallbackData = {
          sessionId,
          studentId,
          courseId: courseId || null,
          questionId: questionId || null,
          questionContext: questionContext || 'General HOTS Assessment',
          rawAnswer: studentAnswer,
          rubricScores: fallbackResult.rubricScores,
          overallScore: Object.values(fallbackResult.rubricScores).reduce((a, b) => a + b, 0),
          feedbackText: fallbackResult.feedback,
          isFallback: true,
          fallbackReason: 'AI service unavailable',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          reliabilityScore: 20 // Very low reliability for fallback
        }
        
        const fallbackRef = await db.collection('assessments').add(fallbackData)
        
        return res.status(200).json({
          success: true,
          id: fallbackRef.id,
          result: fallbackData,
          warning: 'Used fallback scoring due to AI service issue'
        })
      }

      completion = aiCallResult.result
      responseText = completion.choices[0].message.content
      
      // � Record success with circuit breaker
      openaiCircuitBreaker.recordSuccess()
      
      // �🔬 PHASE 2: Store raw response for audit trail
      const rawAIResponse = responseText

      // 🛡️ RELIABILITY: Use safe parser with schema validation
      const parseResult = parseAIResponseSafely(responseText)
      let assessmentResult
      
      if (parseResult.success) {
        assessmentResult = parseResult.data
        
        // Log any warnings
        if (parseResult.warnings.length > 0) {
          console.warn('Parse warnings:', parseResult.warnings)
        }
      } else {
        console.error('Parse failed:', parseResult.errors)
        
        // Log failed parse
        await db.collection('aiParseLogs').add({
          studentId,
          sessionId,
          rawResponse: responseText.substring(0, 2000),
          errors: parseResult.errors,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
        
        // Use fallback if parse completely failed
        if (!parseResult.data) {
          const fallbackResult = getFallbackAssessment(studentAnswer, 'Failed to parse AI response')
          assessmentResult = fallbackResult
        } else {
          assessmentResult = parseResult.data
        }
      }

      // Calculate reliability score
      const reliabilityScore = calculateReliabilityScore(
        assessmentResult,
        parseResult,
        aiCallResult.attempts
      )

      // Calculate overall score
      const rubricScores = assessmentResult.rubricScores
      
      // 🔬 PHASE 3: Check for Reasoning-Evidence double-counting
      // Apply adjustment if correlation is high (prevents score inflation)
      const doubleCountAdjustment = adjustForDoubleCounting(rubricScores)
      
      // Use adjusted scores for overall calculation if adjustment was applied
      const effectiveScores = doubleCountAdjustment.adjusted 
        ? doubleCountAdjustment.adjustedScores 
        : rubricScores
      
      const overallScore = 
        effectiveScores.analysis + 
        effectiveScores.reasoning + 
        effectiveScores.creativity + 
        effectiveScores.evidence
      
      // Log if adjustment was made
      if (doubleCountAdjustment.adjusted) {
        console.log(`📐 Score adjustment applied: ${doubleCountAdjustment.originalTotal} → ${doubleCountAdjustment.adjustedTotal} (${doubleCountAdjustment.reason})`)
      }

      // 🔬 PHASE 2: Grade-level score appropriateness check
      const gradeContext = gradeLevel || studentData?.grade
      let scoreAppropriatenessCheck = null
      if (gradeContext) {
        scoreAppropriatenessCheck = checkScoreAppropriateness(rubricScores, gradeContext)
        if (scoreAppropriatenessCheck.flags && scoreAppropriatenessCheck.flags.length > 0) {
          console.log(`📊 Grade appropriateness concerns for ${gradeContext}:`, scoreAppropriatenessCheck)
        }
      }

      // 🔬 PHASE 2: Adaptive Scaffolding with dimension-specific support
      // 🔬 PHASE 3: Added dimension variance trigger - คะแนนแต่ละมิติต่างกันมาก = ต้องการ scaffolding
      const dimensionScores = [rubricScores.analysis, rubricScores.reasoning, rubricScores.creativity, rubricScores.evidence]
      const maxDimScore = Math.max(...dimensionScores)
      const minDimScore = Math.min(...dimensionScores)
      const dimensionVariance = maxDimScore - minDimScore
      
      // Trigger scaffolding if:
      // 1. Overall score < 10 (original condition)
      // 2. OR Dimension variance > 3 (new: significant imbalance in skills)
      const needsScaffoldingForScore = overallScore < 10
      const needsScaffoldingForVariance = dimensionVariance > 3 && overallScore < 16  // Don't scaffold high performers
      const shouldScaffold = (needsScaffoldingForScore || needsScaffoldingForVariance) && scaffoldingAttempts < 2 && !isScaffolding
      
      if (shouldScaffold) {
        // Log why scaffolding was triggered
        const scaffoldReason = needsScaffoldingForScore 
          ? 'LOW_OVERALL_SCORE' 
          : 'HIGH_DIMENSION_VARIANCE'
        
        // Use new adaptive scaffolding module (wrap rubricScores in object)
        const scaffoldingResult = generateAdaptiveScaffolding(
          { rubricScores },
          scaffoldingAttempts,
          { maxAttempts: 2 }
        )
        
        // Check if scaffolding is actually needed (module may decide otherwise)
        if (scaffoldingResult.needed === false) {
          console.log('Scaffolding skipped:', scaffoldingResult.reason || 'No reason provided')
          // Continue to save assessment normally
        } else {
          // Store scaffolding context for future analysis
          await db.collection('scaffoldingLogs').add({
            studentId,
            sessionId,
            questionId: questionId || null,
            attempt: scaffoldingAttempts + 1,
            rubricScores,
            weakestDimension: scaffoldingResult.weakestDimension || null,
            scaffoldingLevel: scaffoldingResult.level || null,
            scaffoldType: scaffoldingResult.scaffoldType || null,
            // 🔬 PHASE 3: Track why scaffolding was triggered
            scaffoldReason,
            dimensionVariance,
            overallScore,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          })
          
          // Don't save final assessment yet - return probing question
          await sessionRef.set({
            isScaffolding: true,
            scaffoldingAttempts: scaffoldingAttempts + 1,
            previousAnswer: studentAnswer,
            probingQuestion: scaffoldingResult.prompts?.[0] || null, // Use first prompt
            scaffoldingContext: {
              weakestDimension: scaffoldingResult.weakestDimension || null,
              level: scaffoldingResult.level || null,
              scaffoldType: scaffoldingResult.scaffoldType || null
            },
            lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true })

          return res.status(200).json({
            success: true,
            needsScaffolding: true,
            probingQuestion: scaffoldingResult.prompts?.[0] || null,
            scaffoldingInfo: {
              targetDimension: scaffoldingResult.weakestDimension || null,
              scaffoldType: scaffoldingResult.scaffoldType || null,
              level: scaffoldingResult.level || null,
              explanation: scaffoldingResult.explanation || null
            },
            currentScore: overallScore,
            attemptsRemaining: 2 - (scaffoldingAttempts + 1)
          })
        }
      }

      // Reset scaffolding state if this is the final answer
      if (isScaffolding) {
        await sessionRef.set({
          isScaffolding: false,
          previousAnswer: null,
          probingQuestion: null,
          scaffoldingContext: null
        }, { merge: true })
      }

      // ประเมิน Learning Outcomes ถ้ามี
      let loAssessment = null
      console.log('LO Assessment check:', { 
        hasLOs: !!learningOutcomes, 
        loCount: learningOutcomes?.length, 
        hasCourseId: !!courseId,
        learningOutcomes: JSON.stringify(learningOutcomes)
      })
      
      if (learningOutcomes && learningOutcomes.length > 0 && courseId) {
        console.log('Starting LO assessment...')
        loAssessment = await assessLearningOutcomesInternal(
          studentAnswer,
          learningOutcomes,
          assessmentResult
        )
        console.log('LO assessment result:', JSON.stringify(loAssessment))
      } else {
        console.log('Skipping LO assessment - missing requirements')
      }

      // 🆕 PERSONALIZED FEEDBACK 2.0: Get historical progress for comparison
      let historicalComparison = null
      let personalizedFeedback = assessmentResult.feedback
      
      try {
        const twoWeeksAgo = new Date()
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
        
        const recentAssessments = await db.collection('assessments')
          .where('studentId', '==', studentId)
          .where('courseId', '==', courseId || null)
          .where('createdAt', '>=', twoWeeksAgo)
          .orderBy('createdAt', 'desc')
          .limit(10)
          .get()
        
        if (!recentAssessments.empty) {
          const previousScores = {
            analysis: [],
            reasoning: [],
            creativity: [],
            evidence: [],
            overall: []
          }
          
          recentAssessments.forEach(doc => {
            const data = doc.data()
            if (data.rubricScores) {
              previousScores.analysis.push(data.rubricScores.analysis)
              previousScores.reasoning.push(data.rubricScores.reasoning)
              previousScores.creativity.push(data.rubricScores.creativity)
              previousScores.evidence.push(data.rubricScores.evidence)
              previousScores.overall.push(data.overallScore)
            }
          })
          
          // Calculate averages from recent history
          const calculateAvg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
          
          const avgScores = {
            analysis: calculateAvg(previousScores.analysis),
            reasoning: calculateAvg(previousScores.reasoning),
            creativity: calculateAvg(previousScores.creativity),
            evidence: calculateAvg(previousScores.evidence),
            overall: calculateAvg(previousScores.overall)
          }
          
          historicalComparison = {
            previousAverage: avgScores,
            currentScores: rubricScores,
            improvements: [],
            declines: [],
            sampleSize: previousScores.overall.length
          }
          
          // Compare each dimension
          const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
          dimensions.forEach(dim => {
            const diff = rubricScores[dim] - avgScores[dim]
            if (diff > 0.5) {
              historicalComparison.improvements.push({
                dimension: dim,
                previous: avgScores[dim].toFixed(1),
                current: rubricScores[dim],
                improvement: diff.toFixed(1)
              })
            } else if (diff < -0.5) {
              historicalComparison.declines.push({
                dimension: dim,
                previous: avgScores[dim].toFixed(1),
                current: rubricScores[dim],
                decline: Math.abs(diff).toFixed(1)
              })
            }
          })
          
          // Generate personalized feedback based on progress
          const progressFeedback = []
          
          if (historicalComparison.improvements.length > 0) {
            progressFeedback.push('\n\n🎉 **ความก้าวหน้าของคุณ:**')
            historicalComparison.improvements.forEach(imp => {
              const dimName = {
                analysis: 'การวิเคราะห์',
                reasoning: 'การให้เหตุผล',
                creativity: 'ความคิดสร้างสรรค์',
                evidence: 'การใช้หลักฐาน'
              }[imp.dimension]
              progressFeedback.push(
                `- **${dimName}** พัฒนาขึ้นเห็นได้ชัด! จาก ${imp.previous}/5 เป็น ${imp.current}/5 (+${imp.improvement}) 🚀`
              )
            })
          }
          
          if (historicalComparison.declines.length > 0) {
            progressFeedback.push('\n\n💪 **จุดที่ควรให้ความสนใจ:**')
            historicalComparison.declines.forEach(dec => {
              const dimName = {
                analysis: 'การวิเคราะห์',
                reasoning: 'การให้เหตุผล',
                creativity: 'ความคิดสร้างสรรค์',
                evidence: 'การใช้หลักฐาน'
              }[dec.dimension]
              progressFeedback.push(
                `- **${dimName}** ลดลงจากเดิมเล็กน้อย (จาก ${dec.previous}/5 เป็น ${dec.current}/5) ลองเน้นที่ด้านนี้ในครั้งถัดไปนะ`
              )
            })
          }
          
          if (overallScore > avgScores.overall + 2) {
            progressFeedback.push('\n\n⭐ **น่าทึ่ง!** คะแนนรวมของคุณสูงกว่าค่าเฉลี่ยล่าสุดของคุณเอง! คงความสม่ำเสมอแบบนี้ต่อไปนะ')
          }
          
          if (progressFeedback.length > 0) {
            personalizedFeedback += '\n\n---\n' + progressFeedback.join('\n')
          }
          
        }
      } catch (error) {
        console.error('Error generating historical comparison:', error)
        // Continue without personalized feedback if error
      }

      // 🆕 Fetch question data for progressive LO tracking
      let questionData = null
      if (questionId) {
        try {
          const questionDoc = await db.collection('questions').doc(questionId).get()
          if (questionDoc.exists) {
            questionData = questionDoc.data()
          }
        } catch (error) {
          console.error('Error fetching question data:', error)
        }
      }

      // Note: studentData already fetched earlier for grade-level calibration

      // Save assessment to Firestore
      const assessmentData = {
        sessionId,
        studentId,
        courseId: courseId || null,
        questionId: questionId || null,
        questionContext: questionContext || 'General HOTS Assessment',
        rawAnswer: studentAnswer,
        rubricScores: {
          analysis: Math.min(5, Math.max(0, rubricScores.analysis)),
          reasoning: Math.min(5, Math.max(0, rubricScores.reasoning)),
          creativity: Math.min(5, Math.max(0, rubricScores.creativity)),
          evidence: Math.min(5, Math.max(0, rubricScores.evidence))
        },
        overallScore: Math.min(20, Math.max(0, overallScore)),
        feedbackText: personalizedFeedback, // 🆕 Enhanced with historical comparison
        historicalComparison: historicalComparison, // 🆕 Store comparison data
        suggestions: assessmentResult.suggestions || [],
        strengths: assessmentResult.strengths || [],
        weaknesses: assessmentResult.weaknesses || [],
        loAssessment: loAssessment || null,
        questionData: questionData, // 🆕 Store question data for progressive LO tracking
        studentData: studentData, // 🆕 DENORMALIZED: Student info for faster reports
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        aiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18',
        
        // 🔬 PHASE 2: Full Audit Trail for AI Assessment
        promptVersion: 'v3.0-cot-confidence',  // Phase 2 prompt with CoT
        
        // 🔬 PHASE 2: AI Confidence & Chain of Thought
        aiConfidence: assessmentResult.confidence || null,
        aiConfidenceReason: assessmentResult.confidenceReason || null,
        chainOfThought: assessmentResult.chainOfThought || null,
        
        // 🔬 PHASE 2: Audit Trail - store for reproducibility research
        auditTrail: {
          modelUsed: model,
          temperature: 0,
          seed: 42,
          maxTokens: 1500,
          rawResponseLength: rawAIResponse?.length || 0,
          // Note: Full rawResponse stored separately in aiAuditLogs for privacy
          parseAttempts: parseResult?.errors?.length > 0 ? 2 : 1,
          apiCallAttempts: aiCallResult?.attempts || 1,
          timestamp: new Date().toISOString(),
          // 🔬 PHASE 3: Model fingerprint for exact reproducibility
          systemFingerprint: completion?.system_fingerprint || null,
          completionId: completion?.id || null,
          modelSnapshot: completion?.model || model  // Actual model used (may differ from requested)
        },
        
        // 🛡️ Reliability Score (0-100)
        reliabilityScore: reliabilityScore,
        isFallback: assessmentResult.isFallback || false,
        
        // 🔍 AI Detection - ตรวจจับคำตอบที่อาจสร้างโดย AI
        aiDetection: (() => {
          const detection = quickAICheck(studentAnswer)
          return {
            score: detection.score,
            riskLevel: detection.riskLevel,
            flagged: detection.shouldFlag,
            topSignal: detection.topSignal
          }
        })(),
        
        // Answer metrics (RQ3: Learning Analytics)
        answerMetrics: answerMetrics ? {
          wordCount: answerMetrics.wordCount || 0,
          charCount: answerMetrics.charCount || 0,
          sentenceCount: answerMetrics.sentenceCount || 0,
          avgWordsPerSentence: answerMetrics.avgWordsPerSentence || 0,
          uniqueWordRatio: answerMetrics.uniqueWordRatio || 0
        } : null,
        
        // Timing metrics (RQ3: Learning Analytics)
        timingMetrics: timingMetrics ? {
          answerDurationMs: timingMetrics.answerDurationMs || 0,
          firstKeystrokeMs: timingMetrics.firstKeystrokeMs || 0,
          thinkingPauseCount: timingMetrics.thinkingPauseCount || 0,
          avgTypingSpeed: timingMetrics.avgTypingSpeed || 0
        } : null,
        
        // Revision metrics (RQ3: Learning Analytics)
        revisionMetrics: revisionMetrics ? {
          revisionCount: revisionMetrics.revisionCount || 0,
          majorRevisions: revisionMetrics.majorRevisions || 0
        } : null,
        
        // 🆕 IDEMPOTENCY: Store key to prevent duplicate processing
        idempotencyKey: effectiveIdempotencyKey,
        
        // Assessment context (RQ1: Effectiveness)
        assessmentContext: {
          assessmentType: assessmentType || 'formative',  // pretest | posttest | formative
          experimentGroup: experimentGroup || null,        // control | treatment
          sessionNumber: sessionNumber || null,
          weekOfTerm: weekOfTerm || null,
          scaffoldingProvided: scaffoldingAttempts > 0,
          scaffoldingLevel: scaffoldingAttempts
        },
        
        // 🔬 PHASE 3: Double-Counting Adjustment metadata
        scoreAdjustment: doubleCountAdjustment.adjusted ? {
          applied: true,
          reason: doubleCountAdjustment.reason,
          method: doubleCountAdjustment.adjustmentMethod,
          originalTotal: doubleCountAdjustment.originalTotal,
          adjustedTotal: doubleCountAdjustment.adjustedTotal,
          adjustmentFactor: doubleCountAdjustment.adjustmentFactor,
          correlation: doubleCountAdjustment.correlation
        } : {
          applied: false,
          reason: 'no_adjustment_needed'
        }
      }

      // 🆕 ATOMIC BATCH WRITE: All critical writes in single transaction
      // This prevents data desync between assessments and studentProgress
      const batch = db.batch()
      
      // 1️⃣ Create assessment document
      const assessmentRef = db.collection('assessments').doc()
      batch.set(assessmentRef, assessmentData)
      
      // 2️⃣ Update session document
      batch.update(sessionRef, {
        messageCount: admin.firestore.FieldValue.increment(1),
        lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      // 3️⃣ Prepare studentProgress update (if courseId exists)
      let progressUpdateData = null
      let pointsEarned = 0
      let newBadges = []
      
      if (courseId) {
        const progressRef = db.collection('studentProgress').doc(`${studentId}_${courseId}`)
        const progressDoc = await progressRef.get()
        
        // Calculate points
        pointsEarned = calculatePointsSimple(assessmentData)
        
        // Calculate passed LOs
        const passedLOs = loAssessment?.passedLOs || []
        
        if (progressDoc.exists) {
          const currentData = progressDoc.data()
          const currentPassed = currentData.passedLOs || []
          const updatedPassedLOs = [...new Set([...currentPassed, ...passedLOs])]
          
          // Calculate streak
          const currentDate = new Date().toISOString()
          const streakUpdate = calculateStreak(currentData.lastActiveDate, currentDate)
          
          progressUpdateData = {
            passedLOs: updatedPassedLOs,
            totalPassed: updatedPassedLOs.length,
            lastAssessedAt: admin.firestore.FieldValue.serverTimestamp(),
            assessmentCount: admin.firestore.FieldValue.increment(1),
            totalPoints: admin.firestore.FieldValue.increment(pointsEarned),
            lastActiveDate: currentDate
          }
          
          // Add streak data if applicable
          if (streakUpdate && streakUpdate.increment) {
            progressUpdateData.currentStreak = admin.firestore.FieldValue.increment(1)
            const newStreak = (currentData.currentStreak || 0) + 1
            if (newStreak > (currentData.maxStreak || 0)) {
              progressUpdateData.maxStreak = newStreak
            }
          }
          
          batch.update(progressRef, progressUpdateData)
          
          // Check for badges (after batch commit we'll handle this)
          const courseDoc = await db.collection('courses').doc(courseId).get()
          const totalLOs = courseDoc.exists ? (courseDoc.data().learningOutcomes?.length || 0) : 0
          newBadges = checkBadges({
            ...currentData,
            totalPassed: updatedPassedLOs.length,
            totalPoints: (currentData.totalPoints || 0) + pointsEarned,
            currentStreak: streakUpdate?.increment ? (currentData.currentStreak || 0) + 1 : currentData.currentStreak
          }, totalLOs)
          
        } else {
          // Create new progress document
          progressUpdateData = {
            studentId,
            courseId,
            passedLOs: passedLOs,
            totalPassed: passedLOs.length,
            lastAssessedAt: admin.firestore.FieldValue.serverTimestamp(),
            assessmentCount: 1,
            totalPoints: pointsEarned,
            currentStreak: 1,
            maxStreak: 1,
            lastActiveDate: new Date().toISOString(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          }
          batch.set(progressRef, progressUpdateData)
        }
      }
      
      // 🔒 COMMIT ATOMIC BATCH - All or nothing
      try {
        await batch.commit()
        console.log(`✅ Atomic batch committed: assessment=${assessmentRef.id}, points=${pointsEarned}`)
      } catch (batchError) {
        console.error('❌ Atomic batch failed:', batchError)
        return res.status(500).send({
          error: 'Database transaction failed',
          message: 'ไม่สามารถบันทึกผลการประเมินได้ กรุณาลองใหม่',
          retryable: true
        })
      }
      
      // Handle badge updates asynchronously (non-critical)
      if (newBadges.length > 0 && courseId) {
        const progressRef = db.collection('studentProgress').doc(`${studentId}_${courseId}`)
        const badgeIds = newBadges.map(b => b.id)
        const badgePoints = newBadges.reduce((sum, b) => sum + b.points, 0)
        
        progressRef.update({
          badges: admin.firestore.FieldValue.arrayUnion(...badgeIds),
          totalPoints: admin.firestore.FieldValue.increment(badgePoints)
        }).catch(err => console.error('Badge update failed (non-critical):', err))
      }

      // 🔬 PHASE 3: Track model fingerprint for drift detection (non-blocking)
      if (completion?.system_fingerprint) {
        recordModelFingerprint(db, {
          systemFingerprint: completion.system_fingerprint,
          completionId: completion.id,
          modelSnapshot: completion.model,
          modelRequested: model
        }, {
          rubricScores: assessmentData.rubricScores,
          overallScore: assessmentData.overallScore
        }).catch(err => console.error('Model fingerprint recording failed:', err))
      }

      // 📊 RESEARCH: Log Learning Event (non-blocking)
      logLearningEvent(db, {
        eventType: assessmentType === 'pretest' ? EVENT_TYPES.PRETEST 
                 : assessmentType === 'posttest' ? EVENT_TYPES.POSTTEST 
                 : EVENT_TYPES.CHAT_ASSESSMENT,
        studentId,
        courseId: courseId || null,
        assessmentId: assessmentRef.id,
        questionId: questionId || null,
        sessionId,
        rubricScores: assessmentData.rubricScores,
        overallScore: assessmentData.overallScore,
        aiConfidence: assessmentData.aiConfidence,
        reliabilityScore: assessmentData.reliabilityScore,
        targetLOs: learningOutcomes || [],
        passedLOs: loAssessment?.passedLOs || [],
        timingMetrics,
        answerMetrics,
        isFallback: assessmentData.isFallback || false,
        scaffoldingLevel: scaffoldingAttempts,
        experimentGroup,
        weekOfTerm
      }).catch(err => console.error('Learning event log failed:', err))

      // 📈 RESEARCH: Update Growth History (non-blocking)
      if (courseId) {
        updateGrowthHistory(db, studentId, courseId, assessmentData.rubricScores, 'chat')
          .catch(err => console.error('Growth history update failed:', err))
      }

      // 🔬 PHASE 2: Human-in-the-Loop flagging for low confidence assessments
      const reviewDecision = shouldFlagForReview(assessmentData)
      if (reviewDecision.shouldFlag) {
        // Create review queue item asynchronously
        createReviewQueueItem(db, assessmentRef.id, assessmentData, reviewDecision.reason, reviewDecision.priority)
          .then(() => console.log(`📋 Assessment ${assessmentRef.id} flagged for review: ${reviewDecision.reason}`))
          .catch(err => console.error('Review queue creation failed:', err))
      }

      // Return result
      return res.status(200).json({
        success: true,
        id: assessmentRef.id,
        result: assessmentData,
        // 🔬 PHASE 2: Include review status for transparency
        reviewStatus: reviewDecision.shouldFlag ? {
          flagged: true,
          reason: reviewDecision.reason,
          priority: reviewDecision.priority
        } : null
      })

    } catch (error) {
      console.error('Assessment error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

async function assessLearningOutcomesInternal(studentAnswer, learningOutcomes, assessmentResult) {
  try {
    // 🔧 FIX: Use getOpenAIClient() instead of undefined 'openai' variable
    let openaiClient
    try {
      openaiClient = getOpenAIClient()
    } catch (err) {
      console.warn('OpenAI not configured, skipping LO assessment')
      return { passedLOs: [], analysis: 'AI not configured' }
    }

    // 🔧 FIX: Normalize learningOutcomes - รองรับทั้ง string array และ object array
    const normalizedLOs = learningOutcomes.map((lo, idx) => {
      // ถ้าเป็น string เช่น "LO1" หรือ "วิเคราะห์..."
      if (typeof lo === 'string') {
        return {
          loCode: lo.startsWith('LO') ? lo : `LO${idx + 1}`,
          loDescription: lo.startsWith('LO') ? `Learning Outcome ${lo}` : lo
        }
      }
      // ถ้าเป็น object
      return {
        loCode: lo.loCode || lo.code || `LO${idx + 1}`,
        loDescription: lo.loDescription || lo.description || 'No description'
      }
    })

    // 🔍 Debug logging
    console.log('🎓 LO Assessment Input:', {
      learningOutcomesCount: normalizedLOs.length,
      learningOutcomes: normalizedLOs.map(lo => ({
        code: lo.loCode,
        description: (lo.loDescription || '').substring(0, 50) + '...'
      })),
      rubricScores: assessmentResult.rubricScores || assessmentResult
    })

    // สร้าง prompt สำหรับประเมิน LO (ใช้ normalizedLOs)
    const loList = normalizedLOs.map((lo, idx) => {
      return `${idx + 1}. [${lo.loCode}] ${lo.loDescription}`
    }).join('\n')

    // 🔧 FIX: Handle assessmentResult ทั้ง object ที่มี rubricScores และ object ที่เป็น rubricScores เอง
    const rubricScores = assessmentResult.rubricScores || assessmentResult

    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการประเมินผลการเรียนรู้ตาม Learning Outcomes (LOs) ที่เคร่งครัดเรื่องหลักฐานและความเที่ยงตรง

อินพุต
คำตอบของนักเรียน (Student Answer):
${studentAnswer}

ผลการประเมิน HOTS (0–5):
- การวิเคราะห์ (analysis): ${rubricScores.analysis || 0}
- การให้เหตุผล (reasoning): ${rubricScores.reasoning || 0}
- ความคิดสร้างสรรค์ (creativity): ${rubricScores.creativity || 0}
- การใช้หลักฐาน (evidence): ${rubricScores.evidence || 0}

รายการ Learning Outcomes (loList): ${loList}
> หมายเหตุ: แต่ละ LO ต้องมีรหัสระบุชัด เช่น "LO1: …", "LO2: …" (ใช้รหัสดังกล่าวในเอาต์พุต)

คำสั่ง (เกณฑ์การผ่าน LO)
ประเมินว่า "คำตอบของนักเรียน" แสดงให้เห็นว่า “ผ่าน” LO ใดบ้าง โดยต้องผ่านครบทั้ง 3 เงื่อนไขต่อ LO:
1) การตรงประเด็นเนื้อหา: เนื้อหา/สาระสำคัญในคำตอบครอบคลุมเจตนารมณ์ของ LO อย่างมีนัยสำคัญ (ไม่ใช่เพียงการเอ่ยถึงผิวเผิน)
2) ระดับความเข้าใจและทักษะ: มีหลักฐานเชิงคุณภาพของความเข้าใจ/ทักษะที่ LO คาดหวัง (เช่น นิยามที่ถูกต้อง ความเชื่อมโยงเหตุ–ผล การสังเคราะห์แนวคิด การประยุกต์ ฯลฯ)
3) เกณฑ์ HOTS ขั้นต่ำ: มิติ HOTS ที่ “เกี่ยวข้องกับ LO นั้น” ต้องมีคะแนนอย่างน้อย 3/5
   - แนวโยงคำกริยา–มิติ HOTS เพื่อระบุ “มิติที่เกี่ยวข้อง”:
     - วิเคราะห์/จำแนก/เปรียบเทียบ → analysis ≥ 3
     - ให้เหตุผล/อธิบายเหตุ–ผล/สรุปเชิงตรรกะ → reasoning ≥ 3
     - สร้างสรรค์/ออกแบบ/เสนอแนวคิดใหม่ → creativity ≥ 3
     - อ้างอิง/ยกตัวอย่างมีที่มา/ใช้ข้อมูลสนับสนุน → evidence ≥ 3
   - หาก LO สะท้อนหลายทักษะหลัก ให้ตรวจ ทุกมิติที่เกี่ยวข้อง ต้อง ≥ 3/5 ทั้งหมด

ข้อควรระวัง:
- ให้ "ผ่าน" เฉพาะ LO ที่มี หลักฐานชัดเจนในคำตอบ เท่านั้น ห้ามอนุมานเกินจากข้อความที่ปรากฏ
- ถ้าอินพุต HOTS ของมิติที่จำเป็น หายไป/ไม่ระบุ ให้ถือว่า ไม่ผ่าน เงื่อนไขข้อ (3)
- หากคำตอบนอกเรื่อง/สั้นมาก/ขาดสาระ ให้ถือว่าไม่ผ่านทุก LO
- หาก LO ไม่มีรหัส ให้ ละเว้น จากการพิจารณา (ไม่สร้างรหัสขึ้นเอง)

รูปแบบเอาต์พุต (เคร่งครัด)
ส่งคืน JSON เท่านั้น โดยมี 2 คีย์ และห้ามมีคีย์อื่น/ข้อความประกอบ:
{
  "passedLOs": ["LO1", "LO2"],
  "analysis": "สรุปเหตุผล 2–3 ประโยคว่าทำไม LO เหล่านี้จึงผ่าน โดยอ้างอิงหลักฐานจากคำตอบและการผ่านเกณฑ์ HOTS ที่เกี่ยวข้อง"
}

แนวทางการเขียน "analysis":
- ระบุภาพรวมของหลักฐานในคำตอบที่สอดคล้องกับ LO ที่ผ่าน (เช่น นิยามถูกต้อง เชื่อมเหตุ–ผลได้ สร้างแนวคิดใหม่ ฯลฯ)
- ระบุอย่างกระชับว่ามิติ HOTS ใดบ้างที่ถึงเกณฑ์ (≥3/5) และเชื่อมกับข้อกำหนดของ LO
- หากไม่ผ่านสัก LO ให้ "passedLOs": [] และอธิบายสั้น ๆ ว่าเหตุผลหลักคืออะไร (เช่น เนื้อหาไม่ครอบคลุม/คะแนน HOTS ไม่ถึงเกณฑ์)

ตัวอย่างรูปแบบเอาต์พุต (เป็นแม่แบบ ไม่ใช่คำตอบจริง)
{
  "passedLOs": ["LO1", "LO3"],
  "analysis": "คำตอบวิเคราะห์องค์ประกอบและเชื่อมเหตุ–ผลได้ตรงตาม LO1 และเสนอแนวคิดใหม่ที่ใช้งานได้ตาม LO3 โดยมิติ analysis และ creativity อยู่ที่ ≥3/5 พร้อมยกตัวอย่างอ้างอิงที่เหมาะสม"
}`

    const model = process.env.OPENAI_MODEL || functions.config().openai?.model || 'gpt-4o-mini-2024-07-18'
    
    const completion = await openaiClient.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert in learning outcome assessment. You provide accurate, evidence-based evaluations. Always respond with valid JSON only, no markdown.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0,         // Phase 2: Zero temperature for consistent LO scoring
      seed: 42,               // Phase 2: Fixed seed for reproducibility
      max_tokens: 500
    })

    const responseText = completion.choices[0].message.content
    
    // Clean response - remove markdown code blocks if present
    let cleanedText = responseText.trim()
    
    // Remove ```json or ``` wrapper
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
      cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
    }
    
    const loResult = JSON.parse(cleanedText)

    console.log('✅ LO Assessment Result:', {
      passedLOs: loResult.passedLOs,
      analysisPreview: (loResult.analysis || '').substring(0, 100) + '...'
    })

    return {
      passedLOs: loResult.passedLOs || [],
      analysis: loResult.analysis || 'ไม่สามารถวิเคราะห์ได้'
    }

  } catch (error) {
    console.error('LO Assessment error:', error)
    return {
      passedLOs: [],
      analysis: 'เกิดข้อผิดพลาดในการประเมิน LO'
    }
  }
}

/**
 * Update student progress in Firestore
 * @param {string} studentId - The student's ID
 * @param {string} courseId - The course ID
 * @param {Array} passedLOs - Array of LO codes that were passed
 */
async function updateStudentProgress(studentId, courseId, passedLOs, assessmentData = null) {
  try {
    const progressRef = db.collection('studentProgress')
      .doc(`${studentId}_${courseId}`)

    const progressDoc = await progressRef.get()
    const currentDate = new Date().toISOString()

    if (progressDoc.exists) {
      // อัพเดทความคืบหน้าที่มีอยู่
      const currentData = progressDoc.data()
      const currentPassed = currentData.passedLOs || []
      
      // รวม LO ใหม่ที่ผ่าน (ไม่ซ้ำ)
      const updatedPassedLOs = [...new Set([...currentPassed, ...passedLOs])]

      // 🆕 PROGRESSIVE LO TRACKING: Update accumulated scores
      const loProgress = currentData.loProgress || {}
      
      if (assessmentData && assessmentData.questionData && assessmentData.questionData.relatedLOs) {
        const relatedLOs = assessmentData.questionData.relatedLOs
        const rubricScores = assessmentData.rubricScores || {}
        const loConfigs = assessmentData.questionData.loConfigs || []
        const questionId = assessmentData.questionId

        // DYNAMIC SCORING: Fetch question psychometrics once
        let difficultyMultiplier = 1.0
        if (questionId) {
          try {
            const questionDoc = await db.collection('questions').doc(questionId).get()
            if (questionDoc.exists) {
              const qData = questionDoc.data()
              if (qData.psychometrics && qData.psychometrics.pValue) {
                const p = qData.psychometrics.pValue
                if (p < 0.4) {
                  difficultyMultiplier = 0.8 // Hard question
                  console.log(`Dynamic Scoring: Hard question (p=${p}), multiplier=0.8`)
                } else if (p > 0.8) {
                  difficultyMultiplier = 1.2 // Easy question
                  console.log(`Dynamic Scoring: Easy question (p=${p}), multiplier=1.2`)
                }
              }
            }
          } catch (err) {
            console.warn('Failed to fetch question psychometrics:', err)
          }
        }

        for (const loCode of relatedLOs) {
          // Find LO configuration to know which dimensions are relevant
          const loConfig = loConfigs.find(c => c.loCode === loCode || c.code === loCode)
          const relatedDimensions = loConfig?.relatedDimensions || ['analysis', 'reasoning', 'creativity', 'evidence']
          
          // Calculate target score
          let targetScore = Math.floor(relatedDimensions.length * 4 * difficultyMultiplier)

          // Initialize if doesn't exist
          if (!loProgress[loCode]) {
            loProgress[loCode] = {
              accumulatedScore: 0,
              targetScore: targetScore,
              attempts: 0,
              isPassed: false,
              lastAttemptDate: currentDate,
              strugglingDimensions: [],
              microLessonsViewed: []
            }
          } else {
             // Update target score if it was default or needs adjustment
             // Only update if the new target score is different and we want to adapt
             if (difficultyMultiplier !== 1.0) {
                loProgress[loCode].targetScore = targetScore
             }
          }

          const progress = loProgress[loCode]
          progress.attempts++
          progress.lastAttemptDate = currentDate

          // Accumulate scores from relevant dimensions (only if score >= 3)
          let earnedScore = 0
          const struggling = []
          
          relatedDimensions.forEach(dim => {
            const score = rubricScores[dim] || 0
            if (score >= 3) {
              earnedScore += score
            } else {
              struggling.push(dim)
            }
          })

          progress.accumulatedScore += earnedScore
          progress.strugglingDimensions = struggling

          // Check if passed threshold
          if (progress.accumulatedScore >= progress.targetScore && !progress.isPassed) {
            progress.isPassed = true
            // Add to passedLOs array if not already there
            if (!updatedPassedLOs.includes(loCode)) {
              updatedPassedLOs.push(loCode)
            }
          }
        }
      }

      // GAMIFICATION: Calculate points from this assessment
      let pointsEarned = 0
      if (assessmentData) {
        pointsEarned = calculatePoints(assessmentData)
      }

      // GAMIFICATION: Update streak
      const streakUpdate = calculateStreak(currentData.lastActiveDate, currentDate)
      let streakData = {}
      if (streakUpdate) {
        if (streakUpdate.increment) {
          streakData = {
            currentStreak: admin.firestore.FieldValue.increment(1),
            maxStreak: currentData.currentStreak + 1 > (currentData.maxStreak || 0) 
              ? currentData.currentStreak + 1 
              : currentData.maxStreak || 0,
            lastActiveDate: streakUpdate.lastActiveDate
          }
        } else if (streakUpdate.currentStreak !== undefined) {
          streakData = {
            currentStreak: streakUpdate.currentStreak,
            lastActiveDate: streakUpdate.lastActiveDate
          }
        }
      }

      // Update progress with gamification data + loProgress
      const updateData = {
        passedLOs: updatedPassedLOs,
        totalPassed: updatedPassedLOs.length,
        loProgress: loProgress, // 🆕 Progressive tracking
        lastAssessedAt: admin.firestore.FieldValue.serverTimestamp(),
        assessmentCount: admin.firestore.FieldValue.increment(1),
        totalPoints: admin.firestore.FieldValue.increment(pointsEarned),
        ...streakData
      }

      await progressRef.update(updateData)

      // GAMIFICATION: Check for new badges after update
      const updatedProgressDoc = await progressRef.get()
      const updatedStats = updatedProgressDoc.data()
      
      // Get total LOs in course for badge checking
      const courseDoc = await db.collection('courses').doc(courseId).get()
      const totalLOs = courseDoc.exists ? (courseDoc.data().learningOutcomes?.length || 0) : 0
      
      const newBadges = checkBadges(updatedStats, totalLOs)
      
      if (newBadges.length > 0) {
        const badgeIds = newBadges.map(b => b.id)
        const badgePoints = newBadges.reduce((sum, b) => sum + b.points, 0)
        
        await progressRef.update({
          badges: admin.firestore.FieldValue.arrayUnion(...badgeIds),
          totalPoints: admin.firestore.FieldValue.increment(badgePoints)
        })

        console.log(`🎖️ New badges earned by ${studentId}: ${badgeIds.join(', ')} (+${badgePoints} pts)`)
      }

      console.log(`Updated progress for ${studentId} in ${courseId}: ${updatedPassedLOs.length} LOs passed, +${pointsEarned} pts`)
    } else {
      // สร้างเอกสารใหม่
      let pointsEarned = 0
      if (assessmentData) {
        pointsEarned = calculatePoints(assessmentData)
      }

      // 🆕 Initialize loProgress for first-time assessment
      const loProgress = {}
      if (assessmentData && assessmentData.questionData && assessmentData.questionData.relatedLOs) {
        const relatedLOs = assessmentData.questionData.relatedLOs
        const rubricScores = assessmentData.rubricScores || {}
        const loConfigs = assessmentData.questionData.loConfigs || []

        relatedLOs.forEach(loCode => {
          const loConfig = loConfigs.find(c => c.loCode === loCode || c.code === loCode)
          const relatedDimensions = loConfig?.relatedDimensions || ['analysis', 'reasoning', 'creativity', 'evidence']
          
          let earnedScore = 0
          const struggling = []
          
          relatedDimensions.forEach(dim => {
            const score = rubricScores[dim] || 0
            if (score >= 3) {
              earnedScore += score
            } else {
              struggling.push(dim)
            }
          })

          loProgress[loCode] = {
            accumulatedScore: earnedScore,
            targetScore: relatedDimensions.length * 4,
            attempts: 1,
            isPassed: earnedScore >= relatedDimensions.length * 4,
            lastAttemptDate: currentDate,
            strugglingDimensions: struggling,
            microLessonsViewed: []
          }
        })
      }

      const initialData = {
        studentId,
        courseId,
        passedLOs: passedLOs,
        totalPassed: passedLOs.length,
        loProgress: loProgress, // 🆕 Progressive tracking
        assessmentCount: 1,
        firstAssessedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastAssessedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Gamification fields
        totalPoints: pointsEarned,
        currentStreak: 1,
        maxStreak: 1,
        lastActiveDate: currentDate,
        badges: [],
        achievements: []
      }

      await progressRef.set(initialData)

      // Check for first-time badges
      const courseDoc = await db.collection('courses').doc(courseId).get()
      const totalLOs = courseDoc.exists ? (courseDoc.data().learningOutcomes?.length || 0) : 0
      
      const newBadges = checkBadges(initialData, totalLOs)
      
      if (newBadges.length > 0) {
        const badgeIds = newBadges.map(b => b.id)
        const badgePoints = newBadges.reduce((sum, b) => sum + b.points, 0)
        
        await progressRef.update({
          badges: badgeIds,
          totalPoints: admin.firestore.FieldValue.increment(badgePoints)
        })

        console.log(`🎖️ Initial badges earned by ${studentId}: ${badgeIds.join(', ')} (+${badgePoints} pts)`)
      }

      console.log(`Created new progress for ${studentId} in ${courseId}: ${passedLOs.length} LOs passed, ${pointsEarned} pts`)
    }
  } catch (error) {
    console.error('Error updating student progress:', error)
    // ไม่ throw error เพื่อไม่ให้กระทบการประเมิน HOTS หลัก
  }
}

/**
 * Cloud Function to generate Learning Outcomes using AI
 * 🔐 SECURED: Teacher/Admin only
 */

exports.assessSubmissionMultiPass = functions.runWith({ secrets: [openaiApiKeySecret] }).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { 
        submissionId, 
        assignmentId, 
        studentId,
        studentName,
        // Support both 'studentAnswer' and 'answer' for compatibility
        studentAnswer: studentAnswerDirect,
        answer: answerAlias,
        questionText,
        courseId,
        learningOutcomes
      } = req.body
      
      // Normalize answer field
      const studentAnswer = studentAnswerDirect || answerAlias
      
      if (!studentAnswer) {
        return res.status(400).send({ 
          error: 'Missing required field: studentAnswer (or answer)' 
        })
      }
      
      // Get question text from assignment if not provided
      let finalQuestionText = questionText
      if (!finalQuestionText && assignmentId) {
        const assignmentDoc = await db.collection('assignments').doc(assignmentId).get()
        if (assignmentDoc.exists) {
          const assignment = assignmentDoc.data()
          finalQuestionText = assignment.question || assignment.description || 'Assignment submission'
        }
      }
      
      if (!finalQuestionText) {
        finalQuestionText = 'Please assess this student submission'
      }

      const modelToUse = process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18'
      
      // Multi-pass assessment: Pass 1 - Initial scoring
      const pass1Response = await getOpenAIClient().chat.completions.create({
        model: modelToUse,
        temperature: 0,
        seed: 42,
        messages: [
          {
            role: 'system',
            content: `You are an educational assessment expert using A.R.C.E. rubric.
Score each dimension 0-5:
- Analysis: Breaking down concepts, identifying patterns
- Reasoning: Logical thinking, cause-effect relationships  
- Creativity: Novel ideas, unique perspectives
- Evidence: Supporting claims with examples/data

Return JSON only:
{
  "rubricScores": {"analysis": 0-5, "reasoning": 0-5, "creativity": 0-5, "evidence": 0-5},
  "totalScore": 0-20,
  "feedback": "string",
  "strengths": ["..."],
  "improvements": ["..."]
}`
          },
          {
            role: 'user',
            content: `Question: ${finalQuestionText}\n\nStudent Answer: ${studentAnswer}`
          }
        ]
      })

      let assessment = JSON.parse(
        pass1Response.choices[0].message.content
          .replace(/^```(?:json)?\s*\n?/i, '')
          .replace(/\n?```\s*$/i, '')
      )

      // Pass 2 - Verification (if score is borderline)
      const totalScore = assessment.totalScore
      if (totalScore >= 8 && totalScore <= 12) {
        const pass2Response = await getOpenAIClient().chat.completions.create({
          model: modelToUse,
          temperature: 0,
          seed: 42,
          messages: [
            {
              role: 'system',
              content: `Verify this assessment. Adjust scores if needed. Return same JSON format.`
            },
            {
              role: 'user',
              content: `Question: ${finalQuestionText}\nAnswer: ${studentAnswer}\nInitial Assessment: ${JSON.stringify(assessment)}`
            }
          ]
        })
        
        assessment = JSON.parse(
          pass2Response.choices[0].message.content
            .replace(/^```(?:json)?\s*\n?/i, '')
            .replace(/\n?```\s*$/i, '')
        )
      }

      // Save to Firestore
      const assessmentRef = db.collection('submissionAssessments').doc()
      await assessmentRef.set({
        submissionId: submissionId || assessmentRef.id,
        assignmentId,
        studentId,
        studentName: studentName || null,
        questionText: finalQuestionText,
        studentAnswer,
        learningOutcomes: learningOutcomes || [],
        ...assessment,
        modelUsed: modelToUse,
        assessmentType: 'multi-pass',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      })

      return res.status(200).send({
        success: true,
        submissionId: submissionId || assessmentRef.id,
        assessmentId: assessmentRef.id,
        ...assessment
      })
    } catch (error) {
      console.error('Error in multi-pass assessment:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

/**
 * ✅ Verify Evidence - Verify portfolio evidence authenticity
 * POST /verifyEvidence { evidenceId, verificationCode }
 */

exports.assessAnswerMultiAgent = functions.runWith({ 
  secrets: [openaiApiKeySecret],
  timeoutSeconds: 300,
  memory: '1GB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { 
        studentAnswer, 
        question, 
        questionContext, // Support same format as assessAnswer
        context, 
        studentId, 
        sessionId,
        courseId,
        questionId,
        learningOutcomes
      } = req.body

      // Support both formats
      const answerText = studentAnswer || req.body.studentAnswer
      const questionObj = question || { question: questionContext, id: questionId }
      const contextObj = context || { learningOutcomes }

      if (!answerText) {
        return res.status(400).send({ 
          error: 'Missing required field: studentAnswer' 
        })
      }

      // 🆕 Use LLMProvider with complete() method for Multi-Agent compatibility
      const { getLLMProvider } = require('./utils/llmProvider')
      const llmProvider = getLLMProvider()

      // 🆕 Build context string for the question
      let contextString = questionObj?.question || questionContext || ''
      if (contextObj?.learningOutcomes?.length > 0) {
        contextString += '\n\nLearning Outcomes:\n'
        contextObj.learningOutcomes.forEach(lo => {
          contextString += `- ${lo.code}: ${lo.description}\n`
        })
      }

      // Run multi-agent assessment with CORRECT parameter order:
      // runMultiAgentAssessment(llmProvider, context, answer, options)
      const result = await runMultiAgentAssessment(
        llmProvider,
        contextString,
        answerText,
        {
          gradeLevel: contextObj?.gradeLevel,
          subject: questionObj?.subject,
          parallelAgents: true,
          includeAdversarial: true
        }
      )

      // 🆕 Check for Multi-Agent errors
      if (!result.success) {
        console.error('Multi-Agent assessment failed:', result.error)
        return res.status(500).send({ 
          success: false, 
          error: result.error || 'Multi-Agent assessment failed'
        })
      }

      // Return multi-agent assessment result
      return res.status(200).send({
        success: true,
        assessment: result.finalAssessment || result,
        agentDetails: result.agentResults,
        confidence: result.confidence
      })
    } catch (error) {
      console.error('Multi-Agent assessment error:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

/**
 * 📊 Export SEM-Ready Data - For structural equation modeling
 * POST /exportSEMData { courseId, minAssessments, kAnonymityThreshold }
 */

// ============================================================
// 📦 MODULE EXPORTS
// ============================================================
module.exports = {
  assessAnswer: exports.assessAnswer,
  assessSubmissionMultiPass: exports.assessSubmissionMultiPass,
  assessAnswerMultiAgent: exports.assessAnswerMultiAgent
}
