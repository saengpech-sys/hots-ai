const admin = require('firebase-admin')
const { checkIPRateLimit, checkUserRateLimit } = require('../utils/rateLimiter')
const { validateAntiCheat } = require('../utils/aiDetection')
const { 
  validateAssessmentSchema, 
  getFallbackAssessment 
} = require('../utils/reliability')
const { performCompleteAssessment } = require('../services/assessmentService')

/**
 * Handle assessment request
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} db - Firestore instance
 * @param {Object} openai - OpenAI instance
 */
async function handleAssessment(req, res, db, openai) {
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
      subject              // e.g., "วิทยาศาสตร์", "ภาษาไทย"
    } = req.body

    // Validate input
    if (!studentId || !sessionId || !studentAnswer) {
      return res.status(400).send({ 
        error: 'Missing required fields: studentId, sessionId, studentAnswer' 
      })
    }

    // 🚦 RATE LIMITING: ป้องกัน spam API calls
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip
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

    // Check if OpenAI is configured
    if (!openai) {
      return res.status(500).send({
        error: 'OpenAI API not configured',
        message: 'Please set OpenAI API key using: firebase functions:config:set openai.key="your-key"'
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
    // Note: createAssessmentPrompt needs to be imported or passed
    const prompt = createAssessmentPrompt(questionContext, studentAnswer, {
      isScaffolding,
      scaffoldingAttempts,
      previousAnswer,
      gradeLevel: gradeLevel || studentData?.grade || null,  // 🔬 PHASE 2: Pass grade level
      subject: subject || null  // 🔬 PHASE 2: Pass subject for context
    })

    // Get model from config or env
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

    // 🛡️ RELIABILITY: Execute OpenAI call with retry mechanism
    let responseText, completion
    const aiCallResult = await executeWithRetry(async () => {
      const result = await openai.chat.completions.create({
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
      
      // Log reliability event
      await logReliabilityEvent(db, {
        type: 'AI_CALL_FAILED',
        studentId,
        sessionId,
        errors: aiCallResult.errors,
        attempts: aiCallResult.attempts
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
    
    // 🔬 PHASE 2: Store raw response for audit trail
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
    const overallScore = 
      rubricScores.analysis + 
      rubricScores.reasoning + 
      rubricScores.creativity + 
      rubricScores.evidence

    // 🆕 SCAFFOLDING LOGIC: Check if score is low and should ask probing question
    const shouldScaffold = overallScore < 10 && scaffoldingAttempts < 2 && !isScaffolding
    
    if (shouldScaffold && assessmentResult.probingQuestion) {
      // Don't save final assessment yet - return probing question
      await sessionRef.set({
        isScaffolding: true,
        scaffoldingAttempts: scaffoldingAttempts + 1,
        previousAnswer: studentAnswer,
        probingQuestion: assessmentResult.probingQuestion,
        lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true })

      return res.status(200).json({
        success: true,
        needsScaffolding: true,
        probingQuestion: assessmentResult.probingQuestion,
        currentScore: overallScore,
        attemptsRemaining: 2 - (scaffoldingAttempts + 1)
      })
    }

    // Reset scaffolding state if this is the final answer
    if (isScaffolding) {
      await sessionRef.set({
        isScaffolding: false,
        previousAnswer: null,
        probingQuestion: null
      }, { merge: true })
    }

    // ประเมิน Learning Outcomes ถ้ามี
    let loAssessment = null
    if (learningOutcomes && learningOutcomes.length > 0 && courseId) {
      // Note: assessLearningOutcomesInternal needs to be imported or passed
      loAssessment = await assessLearningOutcomesInternal(
        studentAnswer,
        learningOutcomes,
        assessmentResult
      )
    }

    // Save assessment to Firestore
    const assessmentData = {
      sessionId,
      studentId,
      courseId: courseId || null,
      questionId: questionId || null,
      questionContext: questionContext || 'General HOTS Assessment',
      rawAnswer: studentAnswer,
      rubricScores: assessmentResult.rubricScores,
      overallScore,
      feedbackText: assessmentResult.feedback,
      suggestions: assessmentResult.suggestions || [],
      strengths: assessmentResult.strengths || [],
      weaknesses: assessmentResult.weaknesses || [],
      loAssessment: loAssessment || null,
      
      // 🔬 PHASE 2: New fields
      aiConfidence: assessmentResult.confidence || null,
      aiConfidenceReason: assessmentResult.confidenceReason || null,
      chainOfThought: assessmentResult.chainOfThought || null,
      
      // Audit Trail
      promptVersion: 'v3.0-cot-confidence',
      auditTrail: {
        modelUsed: model,
        temperature: 0,
        seed: 42,
        maxTokens: 1500,
        rawResponseLength: rawAIResponse.length,
        parseAttempts: 1,
        reliabilityScore,
        timestamp: new Date().toISOString()
      },
      
      // Research Metadata
      answerMetrics: answerMetrics || null,
      timingMetrics: timingMetrics || null,
      revisionMetrics: revisionMetrics || null,
      assessmentType: assessmentType || 'formative',
      experimentGroup: experimentGroup || null,
      sessionNumber: sessionNumber || 1,
      weekOfTerm: weekOfTerm || null,
      gradeLevel: gradeLevel || studentData?.grade || null,
      subject: subject || null,
      
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }

    const assessmentRef = await db.collection('assessments').add(assessmentData)

    // Update session with last assessment
    await sessionRef.update({
      lastAssessmentId: assessmentRef.id,
      lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
      messageCount: admin.firestore.FieldValue.increment(1)
    })

    return res.status(200).json({
      success: true,
      id: assessmentRef.id,
      result: assessmentData
    })

  } catch (error) {
    console.error('Error in assessAnswer:', error)
    return res.status(500).send({
      error: 'Internal Server Error',
      message: error.message
    })
  }
}

module.exports = { handleAssessment }
