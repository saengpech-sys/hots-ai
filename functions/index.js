const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { OpenAI } = require('openai')
const cors = require('cors')({ origin: true })
const { calculatePoints, calculatePointsSimple, checkBadges, calculateStreak, BADGES } = require('./gamification')
const { defineSecret } = require('firebase-functions/params')

// 🛡️ Reliability Module - เพิ่มความน่าเชื่อถือ 95%+
const {
  validateAssessmentSchema,
  executeWithRetry,
  getFallbackAssessment,
  parseAIResponseSafely,
  logReliabilityEvent,
  calculateReliabilityScore,
  RETRY_CONFIG
} = require('./utils/reliability')

// 🔒 Data Consistency Module
const {
  saveAssessmentWithTransaction,
  syncStudentProgress,
  verifyDataConsistency,
  generateIdempotencyKey,
  checkDuplicateSubmission
} = require('./utils/dataConsistency')

// 📊 Research Data Module - ข้อมูลเพื่อการวิจัย
const {
  EVENT_TYPES,
  SEQUENCE_EVENT_TYPES,
  logLearningEvent,
  updateGrowthHistory,
  logIntervention,
  calculateScoreCorrelation,
  exportResearchCSV,
  exportHierarchicalJSON,
  generateResearchSummary,
  calculateScaffoldingSummary,
  // 🔴 NEW: Sequential Pattern Mining
  logSequenceEvent,
  finalizeSequence,
  // 🔴 NEW: K-Anonymity
  exportKAnonymousData,
  assessReidentificationRisk,
  // 🔴 NEW: Research Readiness v2
  calculateResearchReadiness
} = require('./utils/researchData')

// 📐 Inter-Rater Reliability Module - IRR for Research Publication
const {
  calculateCohensKappa,
  calculateWeightedKappa,
  calculateICC,
  calculatePercentAgreement,
  calculateMAE,
  calculateCohensD,
  calculatePearsonCorrelation,
  comprehensiveIRRAnalysis,
  meetsPublicationStandard,
  generateReportText
} = require('./utils/interRaterReliability')

// 🔍 AI Detection Module - ตรวจจับคำตอบที่อาจสร้างโดย AI
const {
  analyzeForAISignals,
  analyzeTypingBehavior,
  comprehensiveAIDetection,
  quickAICheck
} = require('./utils/aiDetection')

// 🚦 Rate Limiter Module - ป้องกัน spam และค่าใช้จ่ายบานปลาย
const {
  checkUserRateLimit,
  checkIPRateLimit,
  cleanupRateLimits,
  RATE_LIMIT_CONFIG
} = require('./utils/rateLimiter')

// 🚦 Distributed Rate Limiter (for production scale)
const distributedRateLimiter = require('./utils/distributedRateLimiter')

// � Circuit Breaker for OpenAI API protection
const { CircuitBreaker, getCircuitBreaker } = require('./utils/circuitBreaker')
const openaiCircuitBreaker = new CircuitBreaker('openai-assessment', {
  failureThreshold: 5,       // Open after 5 failures
  successThreshold: 2,       // Close after 2 successes
  timeout: 30000,            // 30 seconds before half-open
  monitoringWindow: 60000    // 1 minute window
})

// �🔍 Model Drift Detector - track OpenAI model changes
const {
  recordModelFingerprint,
  analyzeModelDrift,
  getReproducibilityReport
} = require('./utils/modelDriftDetector')

// ✅ Question Quality Checker - validate HOTS questions
const {
  analyzeQuestionQuality,
  suggestHOTSTransformation,
  batchAnalyzeQuestions
} = require('./utils/questionQualityChecker')

// 📐 Construct Validity - A.R.C.E. validation
const {
  calculateCorrelationMatrix,
  detectDoubleCounting,
  calculateCronbachAlpha,
  adjustForDoubleCounting,
  checkCourseScoreAdjustment
} = require('./utils/constructValidity')

// 📊 Question Difficulty & Adaptive Selection
const {
  analyzeQuestionDifficulty,
  estimateStudentAbility,
  selectAdaptiveQuestion,
  updateDifficultyProgression
} = require('./utils/questionDifficulty')

// 📝 NEW: Modular Prompt System
const {
  sanitizeStudentInput,
  createAssessmentPrompt: createAssessmentPromptNew,
  createLOAssessmentPrompt,
  LO_ASSESSMENT_SYSTEM_MESSAGE
} = require('./utils/prompts')

// 🎓 NEW: LO Assessment Module  
const {
  assessLearningOutcomes,
  updateStudentLOProgress
} = require('./utils/loAssessment')

// 📊 NEW: Assessment Service
const {
  AI_CONFIG,
  performHOTSAssessment,
  performCompleteAssessment
} = require('./services/assessmentService')

// 🔬 NEW: Quality Assurance Modules (Phase 2+)
const {
  generateAdaptiveScaffolding,
  formatScaffoldingMessage,
  analyzeScaffoldingEffectiveness,
  SCAFFOLDING_LEVELS
} = require('./utils/adaptiveScaffolding')

const {
  shouldFlagForReview,
  createReviewQueueItem,
  REVIEW_PRIORITY
} = require('./utils/humanInTheLoop')

const {
  generateGradeCalibrationContext,
  getAdjustedThresholds,
  checkScoreAppropriateness
} = require('./utils/gradeLevelCalibration')

// 📊 NEW: Fairness & Validation
const fairnessAudit = require('./utils/fairnessAudit')
const validationStudy = require('./utils/validationStudy')

// 🤖 NEW: Multi-LLM Provider
const { getLLMProvider, createChatCompletion } = require('./utils/llmProvider')

// 📊 Quality Assurance Controller
const qualityAssuranceController = require('./controllers/qualityAssuranceController')

// 🤖 NEW: Multi-Agent Assessment System (C10 Research Grade)
const {
  runMultiAgentAssessment,
  AGENT_CONFIG
} = require('./utils/multiAgentAssessment')

// 🔬 NEW: Reliability Ecosystem (Golden Dataset, Bias Detection)
const {
  GoldenDatasetManager,
  BiasDetectionSystem,
  DriftDetectionSystem,
  ReliabilityEcosystem
} = require('./utils/reliabilityEcosystem')

// 📈 NEW: Learning Trajectory Analytics
const {
  LearningTrajectoryAnalyzer,
  SEMDataExporter
} = require('./utils/learningTrajectory')

admin.initializeApp()
const db = admin.firestore()

// Define OpenAI API Key as a secret
const openaiApiKey = defineSecret('OPENAI_API_KEY')

// =============================================================================
// 🔐 SECURITY: Role-Based Access Control (RBAC) Helper Functions
// =============================================================================

/**
 * 🔐 Verify that the caller has Teacher or Admin role
 * Use this for teacher-only endpoints (generateSolution, generateLessonPlan, etc.)
 * @param {Request} req - Express request with Authorization header
 * @param {Response} res - Express response
 * @returns {Object|null} - { uid, role } if authorized, null if not (response already sent)
 */
async function verifyTeacherRole(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).send({ 
      error: 'Unauthorized', 
      message: 'Missing or invalid Authorization header. Please login again.',
      code: 'AUTH_MISSING'
    })
    return null
  }
  
  try {
    const token = authHeader.split('Bearer ')[1]
    const decoded = await admin.auth().verifyIdToken(token)
    const userDoc = await db.collection('users').doc(decoded.uid).get()
    
    if (!userDoc.exists) {
      res.status(403).send({ 
        error: 'Forbidden', 
        message: 'User profile not found',
        code: 'USER_NOT_FOUND'
      })
      return null
    }
    
    const role = userDoc.data()?.role
    const allowedRoles = ['teacher', 'school_admin', 'esa_admin', 'ministry_admin']
    
    if (!allowedRoles.includes(role)) {
      console.warn(`🚨 RBAC: User ${decoded.uid} (role: ${role}) attempted teacher-only action`)
      res.status(403).send({ 
        error: 'Forbidden', 
        message: 'This action requires teacher or admin privileges',
        code: 'INSUFFICIENT_ROLE'
      })
      return null
    }
    
    return { uid: decoded.uid, role, email: decoded.email }
  } catch (err) {
    console.error('🔐 Auth verification failed:', err.message)
    
    if (err.code === 'auth/id-token-expired') {
      res.status(401).send({ 
        error: 'Token Expired', 
        message: 'Your session has expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      })
    } else {
      res.status(401).send({ 
        error: 'Unauthorized', 
        message: 'Invalid authentication token',
        code: 'TOKEN_INVALID'
      })
    }
    return null
  }
}

/**
 * 🔐 Verify that the caller is authenticated (any role)
 * Use this for endpoints that just need login, not specific role
 */
async function verifyAuthenticated(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).send({ 
      error: 'Unauthorized', 
      message: 'Authentication required',
      code: 'AUTH_MISSING'
    })
    return null
  }
  
  try {
    const token = authHeader.split('Bearer ')[1]
    const decoded = await admin.auth().verifyIdToken(token)
    return { uid: decoded.uid, email: decoded.email }
  } catch (err) {
    res.status(401).send({ 
      error: 'Unauthorized', 
      message: 'Invalid or expired token',
      code: 'TOKEN_INVALID'
    })
    return null
  }
}

/**
 * 🔐 Verify Admin role (school_admin, esa_admin, ministry_admin)
 */
async function verifyAdminRole(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).send({ error: 'Unauthorized', message: 'Missing auth token' })
    return null
  }
  
  try {
    const token = authHeader.split('Bearer ')[1]
    const decoded = await admin.auth().verifyIdToken(token)
    const userDoc = await db.collection('users').doc(decoded.uid).get()
    const role = userDoc.data()?.role
    
    const adminRoles = ['school_admin', 'esa_admin', 'ministry_admin']
    if (!adminRoles.includes(role)) {
      res.status(403).send({ error: 'Forbidden', message: 'Admin access required' })
      return null
    }
    
    return { uid: decoded.uid, role }
  } catch (err) {
    res.status(401).send({ error: 'Unauthorized', message: 'Invalid token' })
    return null
  }
}

// =============================================================================

// Initialize OpenAI
let openai
try {
  const apiKey = process.env.OPENAI_API_KEY
  if (apiKey) {
    openai = new OpenAI({ apiKey })
    console.log('✅ OpenAI initialized successfully')
  } else {
    console.warn('⚠️ OpenAI API key not found in environment')
  }
} catch (error) {
  console.error('❌ Error initializing OpenAI:', error)
}

/**
 * Cloud Function to assess student answers using OpenAI
 * Evaluates Higher-Order Thinking Skills (HOTS)
 */
exports.assessAnswer = functions.runWith({ secrets: [openaiApiKey] }).https.onRequest(async (req, res) => {
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

      // Check if OpenAI is configured
      if (!openai) {
        return res.status(500).send({
          error: 'OpenAI API not configured',
          message: 'Please set OpenAI API key using: firebase functions:config:set openai.key="your-key"'
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
        if (scoreAppropriatenessCheck.concerns.length > 0) {
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
        
        // Use new adaptive scaffolding module
        const scaffoldingResult = generateAdaptiveScaffolding(
          rubricScores,
          scaffoldingAttempts,
          { maxAttempts: 2 }
        )
        
        // Store scaffolding context for future analysis
        await db.collection('scaffoldingLogs').add({
          studentId,
          sessionId,
          questionId: questionId || null,
          attempt: scaffoldingAttempts + 1,
          rubricScores,
          weakestDimension: scaffoldingResult.weakestDimension,
          scaffoldingLevel: scaffoldingResult.level,
          scaffoldType: scaffoldingResult.scaffoldType,
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
          probingQuestion: scaffoldingResult.prompts[0], // Use first prompt
          scaffoldingContext: {
            weakestDimension: scaffoldingResult.weakestDimension,
            level: scaffoldingResult.level,
            scaffoldType: scaffoldingResult.scaffoldType
          },
          lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true })

        return res.status(200).json({
          success: true,
          needsScaffolding: true,
          probingQuestion: scaffoldingResult.prompts[0],
          scaffoldingInfo: {
            targetDimension: scaffoldingResult.weakestDimension,
            scaffoldType: scaffoldingResult.scaffoldType,
            level: scaffoldingResult.level,
            explanation: scaffoldingResult.explanation
          },
          currentScore: overallScore,
          attemptsRemaining: 2 - (scaffoldingAttempts + 1)
        })
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

/**
 * Create assessment prompt for OpenAI with optional scaffolding support
 * 
 * 🔬 PHASE 2 IMPROVEMENTS:
 * - Chain of Thought (CoT): AI reasons step-by-step before scoring
 * - AI Confidence Score: Self-reported confidence with reasoning
 * - Language Bias Prevention: Grade language separately, don't penalize
 * - Prompt Injection Defense: XML tags isolate student input
 * - Grade-Level Calibration: Context about expected student level
 * 
 * @param {string} context - Question context
 * @param {string} answer - Student's answer (will be sanitized)
 * @param {object} options - Configuration options
 */
function createAssessmentPrompt(context, answer, options = {}) {
  const { 
    isScaffolding, 
    scaffoldingAttempts, 
    previousAnswer,
    gradeLevel,
    subject
  } = options
  
  // 🛡️ PHASE 2: Sanitize student input to prevent prompt injection
  const sanitizedAnswer = answer
    .replace(/```/g, "'''")  // Escape code blocks
    .replace(/<\/?[a-zA-Z_][^>]*>/g, '')  // Remove XML-like tags
    .replace(/\{\{[^}]*\}\}/g, '')  // Remove template expressions
    .substring(0, 3000)  // Limit length
  
  let scaffoldingInstructions = ''
  if (isScaffolding && previousAnswer) {
    const sanitizedPreviousAnswer = previousAnswer
      .replace(/```/g, "'''")
      .replace(/<\/?[a-zA-Z_][^>]*>/g, '')
      .substring(0, 1500)
    
    scaffoldingInstructions = `

🔄 SCAFFOLDING MODE (ครั้งที่ ${scaffoldingAttempts + 1}/2):
นี่คือคำตอบครั้งที่ ${scaffoldingAttempts + 1} หลังจากถูกถามคำถามชี้แนะ
<previous_answer>${sanitizedPreviousAnswer}</previous_answer>
ให้ประเมินว่านักเรียนพัฒนาขึ้นหรือไม่ และให้คะแนนตามคำตอบปัจจุบัน`
  }

  // 🎓 PHASE 2: Grade-level calibration context
  let gradeContext = ''
  if (gradeLevel) {
    gradeContext = `
📚 ระดับชั้น: ${gradeLevel}${subject ? ` | วิชา: ${subject}` : ''}
⚖️ การปรับระดับ: ปรับความคาดหวังตามวุฒิภาวะของนักเรียนระดับ ${gradeLevel}
- สำหรับ ป.4-6: คาดหวังการคิดพื้นฐาน ตัวอย่างง่ายๆ
- สำหรับ ม.1-3: คาดหวังความเชื่อมโยงที่ซับซ้อนขึ้น
- สำหรับ ม.4-6: คาดหวังการวิเคราะห์เชิงลึก เชื่อมโยงข้ามศาสตร์
`
  }

  const needsProbingQuestion = !isScaffolding && scaffoldingAttempts === 0
  
  // 🔬 PHASE 2: Enhanced prompt with CoT, Confidence, and Bias Prevention
  return `
<system_instruction>
ประเมินคำตอบปลายเปิดของนักเรียนอย่างเป็นกลาง ตรวจสอบได้ และเป็นระบบ
ใช้ Chain-of-Thought reasoning ก่อนให้คะแนน
</system_instruction>

<objective>
- ให้คะแนนคำตอบของนักเรียนตามทักษะการคิดขั้นสูง (HOTS) 4 ด้าน
- คิดทีละขั้นตอน (Chain of Thought) ก่อนสรุปคะแนน
- รายงานระดับความมั่นใจในการประเมิน (0-100%)
- ส่งคืน "JSON เท่านั้น" ตามสคีมาที่กำหนด
</objective>

<input>
<context>${context || 'การประเมินทักษะการคิดทั่วไป'}</context>
${gradeContext}
<student_answer>${sanitizedAnswer}</student_answer>
</input>
${scaffoldingInstructions}

<bias_prevention>
⚠️ ข้อควรระวังเรื่องอคติในการประเมิน:
1. ภาษา ≠ การคิด: ความสามารถในการเขียนภาษาไม่ใช่ตัวชี้วัดทักษะการคิด
   - หากนักเรียนมีไอเดียดีแต่สื่อสารไม่ชัด ให้คะแนนตาม "ความคิด" ไม่ใช่ "การเขียน"
   - ตัวสะกดผิด/ไวยากรณ์ผิด ไม่หักคะแนนทักษะการคิด
2. ความยาว ≠ คุณภาพ: คำตอบสั้นที่ตรงประเด็นดีกว่าคำตอบยาวที่วนซ้ำ
3. สไตล์ ≠ สาระ: ไม่ให้คะแนนเพิ่มเพราะใช้ศัพท์ยากหรือโครงสร้างซับซ้อน
4. เป็นกลาง: ไม่มีอคติจากเพศ เชื้อชาติ หรือภูมิหลังที่อาจปรากฏในคำตอบ
</bias_prevention>

<fluffy_content_detection>
🎯 การตรวจจับคำตอบที่มีแต่ "น้ำ" (Fluffy Content):
คำตอบที่มีเฉพาะคำชมเชย/ความรู้สึกโดยไม่มีสาระ ต้องได้คะแนน 0 ใน R และ E:

ตัวอย่างคำตอบที่ "มีแต่น้ำ" (ต้องให้ R=0, E=0):
- "ผมคิดว่ามันดีมากๆ เลยครับเพราะมันสุดยอด"
- "เรื่องนี้น่าสนใจมากค่ะ ชอบมากเลย"
- "ดีมากครับ เห็นด้วยเลย"

การตรวจสอบ:
- มีการอ้างเหตุผลที่ตรวจสอบได้หรือไม่? (ถ้าไม่ R=0)
- มีการยกตัวอย่าง/หลักฐานเฉพาะเจาะจงหรือไม่? (ถ้าไม่ E=0)
- คำว่า "ดี" "สุดยอด" "น่าสนใจ" ไม่ใช่เหตุผล/หลักฐาน
</fluffy_content_detection>

<scoring_rubric>
หลักการให้คะแนน (0–5 เป็นจำนวนเต็ม)
ให้คะแนนตาม "สมอคะแนน (Anchors)" และเลือกคะแนนที่ "ต่ำสุดที่อธิบายพฤติกรรมของคำตอบครบถ้วน"

1) การวิเคราะห์ (Analysis)
- 5: แยกประเด็น/องค์ประกอบสำคัญครบ โครงสร้างชัด เชื่อมความสัมพันธ์สาเหตุ-ผลอย่างเป็นระบบ
- 4: แยกประเด็นหลักชัด มีโครงสร้างและความเชื่อมโยงส่วนใหญ่ถูกต้อง
- 3: แยกบางส่วนได้ เห็นโครงร่างการวิเคราะห์ แต่ขาดบางประเด็นสำคัญ
- 2: วิเคราะห์ตื้น อธิบายแบบเล่าเรื่องมากกว่าแยกส่วน
- 1: ระบุข้อเท็จจริงกระจัดกระจาย ไร้โครงสร้าง
- 0: ไม่วิเคราะห์/นอกเรื่อง

2) การให้เหตุผล (Reasoning)
- 5: เหตุผลเป็นลำดับ มีตรรกะ/การอนุมานถูกต้อง สรุปสอดคล้องกับเหตุผล
- 4: ลำดับคิดดี มีการอนุมานส่วนใหญ่ถูกต้อง มีจุดสะดุดเล็กน้อย
- 3: มีเหตุผลพื้นฐาน แต่ยังมีช่องโหว่/สรุปก้าวกระโดดบางช่วง
- 2: เหตุผลคลุมเครือ พิงความเชื่อมากกว่าตรรกะ
- 1: ตรรกะผิดพลาดบ่อย สรุปไม่ตามเหตุผล
- 0: ไม่มีเหตุผลที่ตรวจสอบได้

3) ความคิดสร้างสรรค์ (Creativity)
- 5: เสนอกรอบคิด/วิธีมองใหม่ ชี้มุมไม่ชัดเจนเดิม มีตัวอย่างสร้างสรรค์ที่เกี่ยวข้อง
- 4: มีมุมใหม่ชัดเจนอย่างน้อยหนึ่งจุด
- 3: ปรับ/ต่อยอดไอเดียเดิมได้บ้าง
- 2: ความคิดทั่วไป ซ้ำแพทเทิร์นคุ้นเคย
- 1: ทวนซ้ำความรู้เดิม ไร้มุมเพิ่ม
- 0: ไม่แสดงความคิดริเริ่ม

4) การใช้หลักฐาน (Evidence)
- 5: ยกหลักฐาน/ตัวอย่างเฉพาะเจาะจง ตรงประเด็น อธิบายความเชื่อมโยงกับข้อสรุปชัด
- 4: มีหลักฐานที่เกี่ยวข้องและอธิบายความเชื่อมโยงพอควร
- 3: มีตัวอย่างแต่ยังทั่วไป/เชื่อมโยงหลวม
- 2: อ้างกว้าง ๆ ไม่ชัดเจนหรือไม่สัมพันธ์กับข้อสรุป
- 1: กล่าวอ้างลอย ๆ ไร้ตัวอย่างตรวจสอบได้
- 0: ไม่มีหลักฐาน
</scoring_rubric>

<chain_of_thought_instructions>
🧠 ขั้นตอนการคิด (Chain of Thought) - ต้องทำก่อนให้คะแนน:

Step 1: อ่านคำตอบทั้งหมดและสรุปประเด็นหลัก (1-2 ประโยค)
Step 2: ระบุหลักฐานที่เห็นในแต่ละมิติ HOTS
Step 3: เปรียบเทียบหลักฐานกับ Anchor descriptions
Step 4: ตัดสินใจให้คะแนนพร้อมเหตุผลสั้นๆ
Step 5: ประเมินความมั่นใจโดยรวม

บันทึกการคิดทั้งหมดใน "chainOfThought" object ในผลลัพธ์
</chain_of_thought_instructions>

<confidence_instructions>
📊 ระดับความมั่นใจในการประเมิน (Confidence Score):
- 90-100%: คำตอบชัดเจน หลักฐานมาก ตรงกับ Anchors พอดี
- 70-89%: คำตอบค่อนข้างชัด มีบางจุดคลุมเครือเล็กน้อย
- 50-69%: คำตอบคลุมเครือ ต้องตีความมาก หรือ borderline ระหว่างคะแนน
- ต่ำกว่า 50%: คำตอบไม่ชัดเจน/สั้นมาก/ยากต่อการประเมิน

ต้องระบุเหตุผลใน "confidenceReason" เสมอ
</confidence_instructions>

${needsProbingQuestion ? `
<scaffolding_mode>
**โหมด Scaffolding (คะแนนรวมต่ำกว่า 10/20)**
เมื่อคำนวณคะแนนรวมได้น้อยกว่า 10 คะแนน:
- เพิ่มฟิลด์ "probingQuestion": คำถามชี้ทางภาษาไทย (1-2 ประโยค)
- คำถามต้องเฉพาะเจาะจงกับจุดอ่อนในคำตอบ
- ใช้ภาษาให้กำลังใจ เปิดโอกาสคิดต่อ
</scaffolding_mode>
` : ''}

<feedback_guidelines>
ข้อกำหนดการให้ข้อเสนอแนะ:
- ภาษาไทย สุภาพ กระชับ (2–3 ประโยค)
- "strengths/weaknesses" เป็นวลีสั้น ๆ ชี้จุดที่สังเกตได้จริง
- "suggestions" เป็นคำแนะนำเชิงปฏิบัติที่นำไปใช้พัฒนาได้ทันที
</feedback_guidelines>

<output_schema>
ส่งคืน JSON เท่านั้น ห้ามมี markdown wrapper (ไม่ต้องใส่ \`\`\`json):
{
  "chainOfThought": {
    "step1_summary": "สรุปประเด็นหลักของคำตอบ 1-2 ประโยค",
    "step2_evidence": {
      "analysis": "หลักฐานที่เห็นสำหรับมิตินี้",
      "reasoning": "หลักฐานที่เห็นสำหรับมิตินี้",
      "creativity": "หลักฐานที่เห็นสำหรับมิตินี้",
      "evidence": "หลักฐานที่เห็นสำหรับมิตินี้"
    },
    "step3_anchor_match": "อธิบายว่าหลักฐานตรงกับ Anchor ระดับไหน",
    "step4_decision": "เหตุผลการตัดสินใจให้คะแนน"
  },
  "rubricScores": {
    "analysis": 0-5,
    "reasoning": 0-5,
    "creativity": 0-5,
    "evidence": 0-5
  },
  "confidence": 0-100,
  "confidenceReason": "เหตุผลที่มั่นใจระดับนี้",
  "feedback": "ข้อเสนอแนะโดยรวมภาษาไทย 2-3 ประโยค",
  "strengths": ["จุดเด่น 1", "จุดเด่น 2"],
  "weaknesses": ["จุดที่ควรพัฒนา 1", "จุดที่ควรพัฒนา 2"],
  "suggestions": ["คำแนะนำ 1", "คำแนะนำ 2"]${needsProbingQuestion ? ',\n  "probingQuestion": "คำถามชี้ทาง (ถ้าคะแนนรวม < 10)"' : ''}
}
</output_schema>

<execution>
ทำงานตอนนี้กับอินพุตที่ให้ ส่งคืนเฉพาะ JSON ตามสคีมา
สำคัญ: ไม่ต้องใส่ \`\`\`json หรือ \`\`\` ครอบ JSON
</execution>
`
}

/**
 * Assess which Learning Outcomes were demonstrated in student's answer
 * @param {string} studentAnswer - The student's answer text
 * @param {Array} learningOutcomes - Array of LO objects with loCode and loDescription
 * @param {Object} assessmentResult - The HOTS assessment result
 * @returns {Object} { passedLOs: [], analysis: string }
 */
async function assessLearningOutcomesInternal(studentAnswer, learningOutcomes, assessmentResult) {
  try {
    if (!openai) {
      console.warn('OpenAI not configured, skipping LO assessment')
      return { passedLOs: [], analysis: 'AI not configured' }
    }

    // 🔍 Debug logging
    console.log('🎓 LO Assessment Input:', {
      learningOutcomesCount: learningOutcomes.length,
      learningOutcomes: learningOutcomes.map(lo => ({
        code: lo.loCode || lo.code,
        description: (lo.loDescription || lo.description || '').substring(0, 50) + '...'
      })),
      rubricScores: assessmentResult.rubricScores
    })

    // สร้าง prompt สำหรับประเมิน LO (รองรับทั้ง loCode/code และ loDescription/description)
    const loList = learningOutcomes.map((lo, idx) => {
      const code = lo.loCode || lo.code || `LO${idx + 1}`
      const description = lo.loDescription || lo.description || 'No description'
      return `${idx + 1}. [${code}] ${description}`
    }).join('\n')

    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการประเมินผลการเรียนรู้ตาม Learning Outcomes (LOs) ที่เคร่งครัดเรื่องหลักฐานและความเที่ยงตรง

อินพุต
คำตอบของนักเรียน (Student Answer):
${studentAnswer}

ผลการประเมิน HOTS (0–5):
- การวิเคราะห์ (analysis): ${assessmentResult.rubricScores.analysis}
- การให้เหตุผล (reasoning): ${assessmentResult.rubricScores.reasoning}
- ความคิดสร้างสรรค์ (creativity): ${assessmentResult.rubricScores.creativity}
- การใช้หลักฐาน (evidence): ${assessmentResult.rubricScores.evidence}

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
    
    const completion = await openai.chat.completions.create({
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
 * Validate assessment result structure
 */
function validateAssessmentResult(result) {
  if (!result || typeof result !== 'object') return false
  if (!result.rubricScores) return false
  if (typeof result.rubricScores.analysis !== 'number') return false
  if (typeof result.rubricScores.reasoning !== 'number') return false
  if (typeof result.rubricScores.creativity !== 'number') return false
  if (typeof result.rubricScores.evidence !== 'number') return false
  if (typeof result.feedback !== 'string') return false
  return true
}

/**
 * Detect possible copy-paste patterns
 * This is a simple heuristic-based detection
 */
function detectCopyPaste(text) {
  const indicators = {
    isPossibleCopyPaste: false,
    reasons: []
  }

  // Check for unusual formatting (multiple spaces, tabs)
  if (/\s{4,}/.test(text) || /\t/.test(text)) {
    indicators.reasons.push('Unusual spacing detected')
  }

  // Check for very long continuous text without breaks
  const words = text.split(/\s+/)
  const avgWordLength = text.length / words.length
  if (avgWordLength > 15) {
    indicators.reasons.push('Unusually long words detected')
  }

  // Check for mixed scripts or unusual characters
  if (/[^\u0E00-\u0E7Fa-zA-Z0-9\s.,!?()"\-]/.test(text)) {
    indicators.reasons.push('Unusual characters detected')
  }

  // If multiple indicators, flag as possible copy-paste
  if (indicators.reasons.length >= 2) {
    indicators.isPossibleCopyPaste = true
  }

  return indicators
}

/**
 * 🆕 Emotional Support Detection
 * ตรวจจับเมื่อนักเรียนแสดงความเครียด/ท้อแท้ เพื่อเปลี่ยนโหมดเป็น Supportive Mode
 */
function detectEmotionalState(text) {
  const emotionalPatterns = {
    stress: [
      /หนู(ทำ)?ไม่ไหว/i, /ไม่เข้าใจ(เลย)?/i, /ยากมาก/i, /ยากเกินไป/i,
      /เครียด/i, /กดดัน/i, /ท้อ(แท้)?/i, /หมดไฟ/i, /เหนื่อย/i,
      /ไม่รู้(จะ)?ทำ(ยังไง|อย่างไร)/i, /ช่วย(ด้วย|หน่อย)/i,
      /ไม่มีความสุข/i, /อยากร้องไห้/i, /กลัว/i
    ],
    frustration: [
      /ทำไม่(ได้|ถูก)/i, /ผิดอีกแล้ว/i, /ไม่เคยถูก/i,
      /โง่/i, /เกลียด(วิชานี้|ตัวเอง)/i, /ยอมแพ้/i
    ],
    confusion: [
      /งง(มาก)?/i, /สับสน/i, /ไม่เข้าใจคำถาม/i,
      /หมายความว่า(อะไร|ยังไง)/i, /ช่วยอธิบาย/i
    ]
  }
  
  const result = {
    isEmotional: false,
    emotionType: null,
    intensity: 'low',
    matchedPatterns: []
  }
  
  const lowerText = text.toLowerCase()
  let matchCount = 0
  
  for (const [emotionType, patterns] of Object.entries(emotionalPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerText)) {
        result.matchedPatterns.push(emotionType)
        matchCount++
        if (!result.emotionType) {
          result.emotionType = emotionType
        }
      }
    }
  }
  
  if (matchCount > 0) {
    result.isEmotional = true
    result.intensity = matchCount >= 3 ? 'high' : matchCount >= 2 ? 'medium' : 'low'
  }
  
  return result
}

/**
 * 🆕 Speed Run Detection (Minimum Time Threshold)
 * ตรวจจับการตอบเร็วเกินไป (< 10 วินาที) ซึ่งไม่สมเหตุสมผลสำหรับคำถาม HOTS
 */
function detectSpeedRun(text, typingFingerprint) {
  const MINIMUM_TIME_SECONDS = 10 // ขั้นต่ำ 10 วินาทีสำหรับคำถาม HOTS
  const MINIMUM_CHARS_PER_SECOND = 10 // สูงสุด 10 ตัวอักษร/วินาที (เร็วมาก)
  
  const result = {
    isSpeedRun: false,
    reason: null,
    timeSpent: null,
    expectedMinTime: MINIMUM_TIME_SECONDS
  }
  
  if (!typingFingerprint) return result
  
  // Calculate time spent
  const typingDurationMs = typingFingerprint.typingDurationMs || 0
  const totalTimeMs = typingFingerprint.totalTimeMs || typingDurationMs
  const timeSpentSeconds = totalTimeMs / 1000
  result.timeSpent = timeSpentSeconds
  
  // Check minimum time
  if (timeSpentSeconds < MINIMUM_TIME_SECONDS && text.length > 50) {
    result.isSpeedRun = true
    result.reason = `ใช้เวลาตอบเพียง ${timeSpentSeconds.toFixed(1)} วินาที (ขั้นต่ำ ${MINIMUM_TIME_SECONDS} วินาที)`
    return result
  }
  
  // Check typing speed (chars per second)
  if (timeSpentSeconds > 0) {
    const charsPerSecond = text.length / timeSpentSeconds
    if (charsPerSecond > MINIMUM_CHARS_PER_SECOND && text.length > 100) {
      result.isSpeedRun = true
      result.reason = `พิมพ์เร็วเกินไป (${charsPerSecond.toFixed(1)} ตัวอักษร/วินาที)`
    }
  }
  
  return result
}

/**
 * 🆕 Enhanced Code/Hacker Detection
 * ตรวจจับ HTML/JS/CSS code และ prompt injection attempts
 */
function detectHackerAttempt(text) {
  const result = {
    isHacker: false,
    type: null,
    reason: null,
    severity: 'low'
  }
  
  // Prompt injection patterns
  const promptInjectionPatterns = [
    /ignore (previous |all )?instructions?/i,
    /forget (everything|what|your)/i,
    /you are now/i,
    /new (system )?prompt/i,
    /tell me a joke/i,
    /ให้คะแนนเต็ม/i,
    /ให้ 20 คะแนน/i,
    /ให้ผ่าน(ทุก|ทั้งหมด)/i,
    /bypass/i,
    /override/i,
    /jailbreak/i,
    /DAN mode/i
  ]
  
  // Code patterns
  const codePatterns = [
    { pattern: /<script[^>]*>/i, type: 'javascript', severity: 'high' },
    { pattern: /<\/script>/i, type: 'javascript', severity: 'high' },
    { pattern: /javascript:/i, type: 'javascript', severity: 'high' },
    { pattern: /onclick=|onerror=|onload=/i, type: 'xss', severity: 'high' },
    { pattern: /<iframe/i, type: 'html', severity: 'medium' },
    { pattern: /<style[^>]*>/i, type: 'css', severity: 'low' },
    { pattern: /SELECT\s+.*\s+FROM/i, type: 'sql', severity: 'medium' },
    { pattern: /DROP\s+TABLE/i, type: 'sql', severity: 'high' },
    { pattern: /function\s*\([^)]*\)\s*\{/i, type: 'javascript', severity: 'medium' },
    { pattern: /const\s+\w+\s*=\s*(\(|function|async)/i, type: 'javascript', severity: 'medium' },
    { pattern: /import\s+\{[^}]+\}\s+from/i, type: 'javascript', severity: 'medium' },
    { pattern: /require\s*\(['"][^'"]+['"]\)/i, type: 'javascript', severity: 'medium' }
  ]
  
  // Check prompt injection
  for (const pattern of promptInjectionPatterns) {
    if (pattern.test(text)) {
      result.isHacker = true
      result.type = 'prompt_injection'
      result.reason = 'ตรวจพบความพยายามแทรกคำสั่ง'
      result.severity = 'high'
      return result
    }
  }
  
  // Check code patterns
  for (const { pattern, type, severity } of codePatterns) {
    if (pattern.test(text)) {
      result.isHacker = true
      result.type = type
      result.reason = `ตรวจพบโค้ด ${type.toUpperCase()}`
      result.severity = severity
      return result
    }
  }
  
  return result
}

/**
 * 🆕 Enhanced Anti-Cheat Validation
 * ตรวจสอบทั้ง text patterns และ typing fingerprint
 * รองรับทั้ง PC และ Mobile
 */
function validateAntiCheat(text, typingFingerprint) {
  const result = {
    isValid: true,
    suspiciousLevel: 0,
    reasons: [],
    warnings: [],
    deviceType: 'unknown'
  }
  
  if (!text || text.length === 0) {
    return result
  }
  
  // === DEVICE DETECTION ===
  const deviceInfo = typingFingerprint?.deviceInfo || {}
  const isMobile = deviceInfo.isMobile || deviceInfo.isTablet || deviceInfo.type === 'mobile' || deviceInfo.type === 'tablet'
  result.deviceType = deviceInfo.type || 'desktop'
  
  // === DEVICE-SPECIFIC THRESHOLDS ===
  const thresholds = isMobile ? {
    minKeystrokeRatio: 0.5,      // Mobile: 50% (มี autocomplete)
    maxTypingSpeed: 300,         // Mobile: 300 CPM (พิมพ์ช้ากว่า)
    minKeystrokeInterval: 50,    // Mobile: 50ms
    lowKeystrokePenalty: 20,     // Mobile: penalty น้อยกว่า
    suddenJumpPenalty: 20,       // Mobile: penalty น้อยกว่า (มี autocomplete)
  } : {
    minKeystrokeRatio: 0.6,      // PC: 60%
    maxTypingSpeed: 450,         // PC: 450 CPM
    minKeystrokeInterval: 30,    // PC: 30ms
    lowKeystrokePenalty: 30,     // PC: penalty ปกติ
    suddenJumpPenalty: 30,       // PC: penalty ปกติ
  }
  
  // === 1. TEXT PATTERN ANALYSIS ===
  const textPatterns = detectCopyPaste(text)
  if (textPatterns.isPossibleCopyPaste) {
    result.suspiciousLevel += 25
    result.reasons.push(...textPatterns.reasons)
  }
  
  // Check for academic citation patterns (likely copy from paper)
  if (/\[\d+\]|\(\d{4}\)|et al\.|ibid\./i.test(text)) {
    result.suspiciousLevel += 20
    result.reasons.push('Academic citation patterns detected')
  }
  
  // Check for Wikipedia markup
  if (/\{\{.*?\}\}|\[\[.*?\]\]/.test(text)) {
    result.suspiciousLevel += 30
    result.reasons.push('Wikipedia markup detected')
  }
  
  // Check for programming code patterns (unusual for HOTS answers)
  if (/function\s+\w+\s*\(|const\s+\w+\s*=|import\s+\{|<\/?[a-z]+>/i.test(text)) {
    result.suspiciousLevel += 15
    result.warnings.push('Code-like patterns detected')
  }
  
  // === 2. TYPING FINGERPRINT ANALYSIS (if provided) ===
  if (typingFingerprint) {
    const fp = typingFingerprint
    
    // 2.1 Keystroke ratio check (ปรับตาม device)
    if (text.length > 50 && fp.totalCharactersTyped !== undefined) {
      const keystrokeRatio = fp.totalCharactersTyped / text.length
      if (keystrokeRatio < thresholds.minKeystrokeRatio) {
        result.suspiciousLevel += thresholds.lowKeystrokePenalty
        result.reasons.push(`Low keystroke ratio: ${(keystrokeRatio * 100).toFixed(1)}% (expected ≥${thresholds.minKeystrokeRatio * 100}% for ${result.deviceType})`)
      } else if (keystrokeRatio < thresholds.minKeystrokeRatio + 0.2) {
        result.suspiciousLevel += Math.floor(thresholds.lowKeystrokePenalty / 2)
        result.warnings.push(`Below-average keystroke ratio: ${(keystrokeRatio * 100).toFixed(1)}%`)
      }
    }
    
    // 2.2 Typing speed analysis (ปรับตาม device)
    if (fp.typingDurationMs && fp.typingDurationMs > 0) {
      const typingSpeedCPM = (text.length / (fp.typingDurationMs / 1000 / 60))
      if (typingSpeedCPM > thresholds.maxTypingSpeed + 100) {
        result.suspiciousLevel += 25
        result.reasons.push(`Extremely fast typing: ${typingSpeedCPM.toFixed(0)} CPM (max for ${result.deviceType}: ${thresholds.maxTypingSpeed} CPM)`)
      } else if (typingSpeedCPM > thresholds.maxTypingSpeed) {
        result.suspiciousLevel += 10
        result.warnings.push(`Fast typing speed: ${typingSpeedCPM.toFixed(0)} CPM`)
      }
    }
    
    // 2.3 Paste event detection
    if (fp.pasteEventCount && fp.pasteEventCount > 0) {
      result.suspiciousLevel += 35
      result.reasons.push(`${fp.pasteEventCount} paste event(s) detected`)
    }
    
    // 2.4 Sudden text jumps (ปรับตาม device - Mobile มี autocomplete)
    if (fp.suspiciousJumps && fp.suspiciousJumps.length > 0) {
      // Mobile: ผ่อนปรนสำหรับ small jumps (autocomplete)
      const bigJumps = fp.suspiciousJumps.filter(j => j.lengthDiff > 25)
      
      if (isMobile && bigJumps.length === 0) {
        // Mobile with only small jumps = likely autocomplete
        result.warnings.push(`${fp.suspiciousJumps.length} small text jump(s) - possible autocomplete`)
        result.suspiciousLevel += 5
      } else {
        result.suspiciousLevel += thresholds.suddenJumpPenalty
        result.reasons.push(`${fp.suspiciousJumps.length} sudden text jump(s) detected`)
      }
    }
    
    // 2.5 Keystroke interval analysis (PC focused)
    if (!isMobile && fp.keystrokeIntervals && fp.keystrokeIntervals.length > 10) {
      const intervals = fp.keystrokeIntervals
      const tooFastCount = intervals.filter(i => i < thresholds.minKeystrokeInterval).length
      const tooFastRatio = tooFastCount / intervals.length
      
      if (tooFastRatio > 0.5) {
        result.suspiciousLevel += 15
        result.warnings.push(`Unusual keystroke pattern: ${(tooFastRatio * 100).toFixed(1)}% too fast`)
      }
    }
    
    // 2.6 Correction rate (ปรับตาม device - Mobile มี autocorrect)
    if (fp.totalCharactersTyped > 50 && fp.correctionCount !== undefined) {
      const correctionRate = fp.correctionCount / fp.totalCharactersTyped
      const minCorrectionThreshold = isMobile ? 0.002 : 0.005
      
      if (correctionRate < minCorrectionThreshold) {
        const penalty = isMobile ? 5 : 10
        result.suspiciousLevel += penalty
        result.warnings.push(`Very low correction rate: ${(correctionRate * 100).toFixed(2)}%`)
      }
    }
    
    // 2.7 🆕 Mobile-specific: Focus lost และ app switch
    if (isMobile) {
      if (fp.focusLostCount && fp.focusLostCount > 5) {
        result.suspiciousLevel += 10
        result.warnings.push(`Focus lost ${fp.focusLostCount} times`)
      }
      if (fp.appSwitchCount && fp.appSwitchCount > 3) {
        result.suspiciousLevel += 15
        result.warnings.push(`App switched ${fp.appSwitchCount} times`)
      }
      
      // Mobile autocomplete ถือเป็นปกติ - don't penalize
      if (fp.autocompleteCount && fp.autocompleteCount > 0) {
        console.log(`Mobile autocomplete detected: ${fp.autocompleteCount} times (normal behavior)`)
      }
    }
  }
  
  // === 3. FINAL DETERMINATION ===
  result.suspiciousLevel = Math.min(100, result.suspiciousLevel)
  
  // Block if suspicious level >= 50
  if (result.suspiciousLevel >= 50) {
    result.isValid = false
  }
  
  return result
}

/**
 * Cloud Function to generate Learning Outcomes using AI
 * 🔐 SECURED: Teacher/Admin only
 */
exports.generateLearningOutcomes = functions.runWith({ secrets: [openaiApiKey] }).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      // 🔐 RBAC: Verify teacher/admin role
      const caller = await verifyTeacherRole(req, res)
      if (!caller) return // Response already sent

      const { courseCode, courseName, courseDescription, learningStandards } = req.body

      if (!courseDescription || !learningStandards) {
        return res.status(400).send({ 
          error: 'Missing required fields: courseDescription, learningStandards' 
        })
      }

      if (!openai) {
        return res.status(500).send({
          error: 'OpenAI API not configured'
        })
      }

      // Create prompt for LO generation
      const prompt = `
คุณเป็นผู้เชี่ยวชาญด้านหลักสูตรการศึกษา กำลังออกแบบ Learning Outcomes (LO) สำหรับรายวิชา

รหัสวิชา: ${courseCode || 'N/A'}
ชื่อวิชา: ${courseName || 'N/A'}

คำอธิบายรายวิชา:
${courseDescription}

มาตรฐานการเรียนรู้:
${learningStandards}

กรุณาสร้าง Learning Outcomes (LO) จำนวน 5-8 ข้อ ที่:
1. สอดคล้องกับคำอธิบายรายวิชาและมาตรฐานการเรียนรู้
2. วัดผลได้ (Measurable) และชัดเจน
3. ครอบคลุมทักษะการคิดขั้นสูง (HOTS)
4. ใช้คำกริยาที่วัดได้ เช่น วิเคราะห์ สังเคราะห์ ประเมิน สร้างสรรค์

ส่งคืนเป็น JSON เท่านั้น ในรูปแบบ:
{
  "learningOutcomes": [
    {
      "code": "LO1",
      "description": "คำอธิบาย LO ข้อที่ 1",
      "category": "ความรู้/ทักษะ/คุณลักษณะ",
      "bloomLevel": "ระดับของ Bloom's Taxonomy"
    }
  ]
}
`

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18',
        messages: [
          {
            role: 'system',
            content: 'You are an expert curriculum designer. Always respond with valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })

      const responseText = completion.choices[0].message.content
      let result

      try {
        // Clean response - remove markdown code blocks if present
        let cleanedText = responseText.trim()
        
        // Remove ```json or ``` wrapper
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        
        result = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', responseText)
        throw new Error('Invalid response format from AI')
      }

      return res.status(200).json({
        success: true,
        learningOutcomes: result.learningOutcomes
      })

    } catch (error) {
      console.error('Generate LO error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

/**
 * Cloud Function to generate HOTS questions using AI
 * Based on Learning Outcomes and course context
 * 🔐 SECURED: Teacher/Admin only
 */
exports.generateHOTSQuestion = functions.runWith({ secrets: [openaiApiKey] }).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      // 🔐 RBAC: Verify teacher/admin role
      const caller = await verifyTeacherRole(req, res)
      if (!caller) return // Response already sent

      const { courseId, courseName, learningOutcomes, questionCount = 1 } = req.body

      if (!courseId || !learningOutcomes || learningOutcomes.length === 0) {
        return res.status(400).send({
          error: 'Missing required fields: courseId, learningOutcomes'
        })
      }

      if (!openai) {
        return res.status(500).send({
          error: 'OpenAI API not configured'
        })
      }

      // สร้าง prompt สำหรับ AI
      const loList = learningOutcomes.map((lo, idx) => {
        const code = lo.code || lo.loCode || `LO${idx + 1}`
        const description = lo.description || lo.loDescription || ''
        return `${code}: ${description}`
      }).join('\n')

      const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบคำถามเพื่อประเมินทักษะการคิดขั้นสูง (Higher-Order Thinking Skills)

**รายวิชา:** ${courseName || 'ไม่ระบุ'}

**Learning Outcomes ของรายวิชา:**
${loList}

**คำสั่ง:**
สร้างคำถาม HOTS จำนวน ${questionCount} ข้อ ที่:
1. เหมาะสมกับ Learning Outcomes ที่กำหนด (ครอบคลุมอย่างน้อย 1-2 LO ต่อคำถาม)
2. กระตุ้นให้นักเรียนคิดวิเคราะห์ ให้เหตุผล สร้างสรรค์ และใช้หลักฐานสนับสนุน
3. เป็นคำถามเปิด (Open-ended) ที่ไม่มีคำตอบเดียว
4. เหมาะกับระดับนักเรียนมัธยมศึกษา
5. ใช้ภาษาไทยที่เข้าใจง่าย น่าสนใจ และท้าทาย
6. มีความเป็น Constructed Response
ตอบกลับในรูปแบบ JSON:
{
  "questions": [
    {
      "question": "คำถามที่ 1",
      "hint": "คำใบ้หรือแนวทางในการตอบ",
      "category": "หมวดหมู่ของคำถาม (เช่น วิเคราะห์, สังเคราะห์, ประเมินค่า)",
      "relatedLOs": ["LO1", "LO2"],
      "expectedSkills": ["analysis", "reasoning"]
    }
  ]
}

**สำคัญ:** คำถามต้องกระตุ้นให้คิด ไม่ใช่ท่องจำ และเชื่อมโยงกับ LO ที่กำหนด`

      const model = process.env.OPENAI_MODEL || functions.config().openai?.model || 'gpt-4o-mini-2024-07-18'

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert in educational assessment and HOTS question design. You create engaging, thought-provoking questions in Thai language. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1500
      })

      const responseText = completion.choices[0].message.content
      let result

      try {
        // Clean response - remove markdown code blocks if present
        let cleanedText = responseText.trim()
        
        // Remove ```json or ``` wrapper
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        
        result = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', responseText)
        throw new Error('Invalid response format from AI')
      }

      // 🆕 QUALITY CHECK: Validate generated questions are HOTS-compliant
      const validatedQuestions = []
      for (const q of (result.questions || [])) {
        const qualityReport = analyzeQuestionQuality(q.question, {
          hint: q.hint,
          category: q.category,
          relatedLOs: q.relatedLOs
        })
        
        validatedQuestions.push({
          ...q,
          qualityMetrics: {
            bloomLevel: qualityReport.bloomAnalysis.dominantLevel,
            hotsScore: qualityReport.hotsScore,
            issues: qualityReport.issues?.slice(0, 3) || [],
            passesHOTSThreshold: qualityReport.hotsScore >= 70
          }
        })
      }

      return res.status(200).json({
        success: true,
        questions: validatedQuestions
      })

    } catch (error) {
      console.error('Generate HOTS Question error:', error)
      
      // Check if it's an OpenAI quota error
      if (error.status === 429 || error.code === 'insufficient_quota') {
        return res.status(429).send({
          error: 'OpenAI API quota exceeded',
          message: 'เครดิต OpenAI API หมดแล้ว กรุณาเติมเครดิตที่ https://platform.openai.com/account/billing หรือใช้ "สร้างคำถามเอง" แทน',
          type: 'quota_exceeded'
        })
      }
      
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

/**
 * 🆕 Cloud Function to validate question quality before saving
 * Checks if a question meets HOTS standards
 */
exports.validateQuestionQuality = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { question, hint, category, relatedLOs } = req.body

      if (!question) {
        return res.status(400).send({
          error: 'Missing required field: question'
        })
      }

      // Analyze question quality
      const qualityReport = analyzeQuestionQuality(question, {
        hint,
        category,
        relatedLOs
      })

      // Determine pass/fail
      const passesThreshold = qualityReport.hotsScore >= 70
      const needsImprovement = qualityReport.hotsScore < 50

      // Get transformation suggestions if needed
      let transformationSuggestions = null
      if (needsImprovement && qualityReport.bloomAnalysis.dominantLevel <= 3) {
        transformationSuggestions = suggestHOTSTransformation(question, qualityReport)
      }

      return res.status(200).json({
        success: true,
        valid: passesThreshold,
        hotsScore: qualityReport.hotsScore,
        bloomLevel: qualityReport.bloomAnalysis.dominantLevel,
        bloomCategory: qualityReport.bloomAnalysis.levelName,
        cognitiveComplexity: qualityReport.cognitiveComplexity,
        issues: qualityReport.issues || [],
        strengths: qualityReport.strengths || [],
        suggestions: transformationSuggestions,
        recommendation: passesThreshold 
          ? '✅ คำถามนี้เหมาะสำหรับประเมิน HOTS'
          : needsImprovement
            ? '⚠️ คำถามนี้ยังไม่ถึงมาตรฐาน HOTS แนะนำให้ปรับปรุง'
            : '📝 คำถามนี้พอใช้ได้ แต่ควรปรับให้ท้าทายขึ้น'
      })

    } catch (error) {
      console.error('Validate Question Quality error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

/**
 * 🆕 Cloud Function to generate a fallback question when question pool is exhausted
 * Uses weak LOs to create a targeted HOTS question on-the-fly
 */
exports.generateFallbackQuestion = functions.runWith({ secrets: [openaiApiKey] }).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { courseId, courseName, weakLOs, studentGrade, learningOutcomes } = req.body

      if (!courseId || !weakLOs || weakLOs.length === 0) {
        return res.status(400).send({
          error: 'Missing required fields: courseId, weakLOs (array of LO codes)'
        })
      }

      if (!openai) {
        return res.status(500).send({
          error: 'OpenAI API not configured'
        })
      }

      // Build LO context
      const targetLODescriptions = (learningOutcomes || [])
        .filter(lo => weakLOs.includes(lo.code || lo.loCode))
        .map(lo => `${lo.code || lo.loCode}: ${lo.description || lo.loDescription}`)
        .join('\n')

      const gradeContext = studentGrade ? `ระดับชั้น: ${studentGrade}` : 'ระดับมัธยมศึกษา'

      const prompt = `คุณเป็นผู้เชี่ยวชาญออกแบบคำถาม HOTS สำหรับนักเรียน${gradeContext}

**รายวิชา:** ${courseName || 'ไม่ระบุ'}

**Learning Outcomes ที่ต้องการประเมิน (นักเรียนยังอ่อนในเรื่องนี้):**
${targetLODescriptions || weakLOs.join(', ')}

**คำสั่ง:**
สร้างคำถาม HOTS 1 ข้อที่:
1. ตรงเป้าหมายกับ LO ที่กำหนด
2. กระตุ้นทักษะ Analysis, Reasoning, Creativity, และ Evidence
3. เป็นคำถามเปิด (Open-ended) ไม่มีคำตอบตายตัว
4. ท้าทายแต่ไม่ยากเกินไป (ระดับ Bloom's Analyze หรือ Evaluate)
5. ใช้บริบทที่นักเรียนเข้าใจได้
6. ไม่ซ้ำกับคำถามทั่วไป (ต้องมีความสร้างสรรค์)

ตอบกลับในรูปแบบ JSON:
{
  "question": "คำถาม HOTS ที่สร้างขึ้น",
  "hint": "คำใบ้สำหรับนักเรียนที่ติด",
  "category": "หมวดหมู่ (Analysis/Evaluation/Creation)",
  "relatedLOs": ["LO1", "LO2"],
  "targetedSkills": ["analysis", "reasoning", "creativity", "evidence"],
  "difficultyLevel": 3,
  "bloomLevel": "Analyze",
  "isGenerated": true,
  "generatedReason": "question_pool_exhausted"
}`

      const model = process.env.OPENAI_MODEL || functions.config().openai?.model || 'gpt-4o-mini'

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert in creating HOTS questions in Thai. Generate creative, engaging questions that assess higher-order thinking. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9, // Higher creativity for varied questions
        max_tokens: 800
      })

      const responseText = completion.choices[0].message.content
      let result

      try {
        let cleanedText = responseText.trim()
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        result = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse fallback question response:', responseText)
        throw new Error('Invalid response format from AI')
      }

      // Validate the generated question
      const qualityReport = analyzeQuestionQuality(result.question, {
        hint: result.hint,
        category: result.category,
        relatedLOs: result.relatedLOs
      })

      return res.status(200).json({
        success: true,
        question: {
          ...result,
          id: `generated_${Date.now()}`,
          courseId,
          isTemporary: true, // Not saved to DB
          qualityMetrics: {
            hotsScore: qualityReport.hotsScore,
            bloomLevel: qualityReport.bloomAnalysis.dominantLevel,
            passesHOTSThreshold: qualityReport.hotsScore >= 70
          }
        },
        source: 'ai_fallback',
        reason: 'question_pool_exhausted_for_weak_los'
      })

    } catch (error) {
      console.error('Generate Fallback Question error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

/**
 * Cloud Function to generate solution (เฉลย) for a question using AI
 * This creates a model answer that would score maximum points
 * 🔐 SECURED: Teacher/Admin only - Students should NOT access this!
 */
exports.generateSolution = functions.runWith({ secrets: [openaiApiKey] }).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      // 🔐 RBAC: Verify teacher/admin role - CRITICAL for exam security!
      const caller = await verifyTeacherRole(req, res)
      if (!caller) return // Response already sent
      console.log(`📝 generateSolution called by ${caller.role}: ${caller.uid}`)

      const { questionId, question, hint, category, relatedLOs, courseContext } = req.body

      if (!question) {
        return res.status(400).send({
          error: 'Missing required field: question'
        })
      }

      if (!openai) {
        return res.status(500).send({
          error: 'OpenAI API not configured'
        })
      }

      // สร้าง context สำหรับ AI
      let contextInfo = `คำถาม: ${question}\n`
      if (hint) contextInfo += `คำใบ้: ${hint}\n`
      if (category) contextInfo += `หมวดหมู่: ${category}\n`
      if (relatedLOs && relatedLOs.length > 0) {
        contextInfo += `Learning Outcomes ที่เกี่ยวข้อง: ${relatedLOs.join(', ')}\n`
      }
      if (courseContext) contextInfo += `บริบทรายวิชา: ${courseContext}\n`

      const prompt = `คุณเป็นนักเรียนที่มีความสามารถสูง กำลังทำข้อสอบ HOTS (Higher-Order Thinking Skills) และต้องการตอบให้ได้คะแนนเต็ม

${contextInfo}

**เกณฑ์การให้คะแนน (รวม 20 คะแนน):**
1. การวิเคราะห์ (Analysis) - 5 คะแนน: แยกประเด็น/องค์ประกอบสำคัญ เชื่อมความสัมพันธ์อย่างเป็นระบบ
2. การให้เหตุผล (Reasoning) - 5 คะแนน: เหตุผลเป็นลำดับ มีตรรกะ อนุมานถูกต้อง สรุปสอดคล้อง
3. ความคิดสร้างสรรค์ (Creativity) - 5 คะแนน: เสนอกรอบคิด/วิธีมองใหม่ มีตัวอย่างสร้างสรรค์
4. การใช้หลักฐาน (Evidence) - 5 คะแนน: ยกหลักฐาน/ตัวอย่างเฉพาะเจาะจง อธิบายความเชื่อมโยงชัด

**คำสั่ง:**
เขียนคำตอบที่:
1. ได้คะแนนเต็มทุกด้าน (20/20 คะแนน)
2. แสดงทักษะการคิดขั้นสูงครบทั้ง 4 ด้าน
3. มีโครงสร้างชัดเจน เหตุผลสมบูรณ์
4. ยกตัวอย่างและหลักฐานที่เฉพาะเจาะจง
5. มีความคิดสร้างสรรค์และมุมมองที่น่าสนใจ
6. เขียนเป็นร้อยแก้ว เหมาะสมกับระดับนักเรียนมัธยมศึกษา
7. ความยาวประมาณ 200-400 คำ

**หลังจากเขียนคำตอบแล้ว ให้วิเคราะห์คำตอบของตัวเอง** โดยประเมินว่าได้คะแนนเท่าไรในแต่ละด้าน และอธิบายว่าทำไม

ตอบกลับในรูปแบบ JSON:
{
  "answer": "คำตอบที่ได้คะแนนเต็ม 20 คะแนน",
  "analysis": {
    "analysisScore": 5,
    "analysisExplanation": "อธิบายว่าตอบส่วนไหนที่แสดงการวิเคราะห์",
    "reasoningScore": 5,
    "reasoningExplanation": "อธิบายว่าตอบส่วนไหนที่แสดงการให้เหตุผล",
    "creativityScore": 5,
    "creativityExplanation": "อธิบายว่าตอบส่วนไหนที่แสดงความคิดสร้างสรรค์",
    "evidenceScore": 5,
    "evidenceExplanation": "อธิบายว่าตอบส่วนไหนที่แสดงการใช้หลักฐาน"
  },
  "keyPoints": [
    "ประเด็นสำคัญข้อ 1 ที่ควรมีในคำตอบ",
    "ประเด็นสำคัญข้อ 2",
    "ประเด็นสำคัญข้อ 3"
  ],
  "teacherNotes": "คำแนะนำสำหรับครูในการใช้เฉลยนี้ เช่น จุดที่ควรเน้นกับนักเรียน หรือวิธีประยุกต์ใช้"
}

**สำคัญ:** คำตอบต้องเป็นแบบอย่างที่ดีสำหรับนักเรียน แสดงให้เห็นว่าคำตอบที่ได้คะแนนเต็มควรมีองค์ประกอบอะไรบ้าง`

      const model = process.env.OPENAI_MODEL || functions.config().openai?.model || 'gpt-4o-mini-2024-07-18'

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert student who excels at HOTS questions. You provide exemplary answers that demonstrate all aspects of higher-order thinking. Always respond with valid JSON in Thai language.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500
      })

      const responseText = completion.choices[0].message.content
      let result

      try {
        // Clean response - remove markdown code blocks if present
        let cleanedText = responseText.trim()
        
        // Remove ```json or ``` wrapper
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        
        result = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', responseText)
        throw new Error('Invalid response format from AI')
      }

      // บันทึกเฉลยลง Firestore
      if (questionId) {
        try {
          await db.collection('questions').doc(questionId).update({
            hasSolution: true,
            solution: {
              answer: result.answer,
              analysis: result.analysis,
              keyPoints: result.keyPoints || [],
              teacherNotes: result.teacherNotes || '',
              generatedAt: admin.firestore.FieldValue.serverTimestamp(),
              aiModel: model
            }
          })
          console.log(`Solution saved for question ${questionId}`)
        } catch (error) {
          console.error('Error saving solution to Firestore:', error)
          // ไม่ throw error เพราะเฉลยที่สร้างแล้วยังใช้งานได้
        }
      }

      return res.status(200).json({
        success: true,
        solution: result
      })

    } catch (error) {
      console.error('Generate Solution error:', error)
      
      // Check if it's an OpenAI quota error
      if (error.status === 429 || error.code === 'insufficient_quota') {
        return res.status(429).send({
          error: 'OpenAI API quota exceeded',
          message: 'เครดิต OpenAI API หมดแล้ว',
          type: 'quota_exceeded'
        })
      }
      
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

/**
 * Cloud Function to generate class analytics
 * Analyzes all assessments for a specific course to create insights
 * 🔐 SECURED: Teacher/Admin only
 */
exports.generateClassAnalytics = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      // 🔐 RBAC: Verify teacher/admin role
      const caller = await verifyTeacherRole(req, res)
      if (!caller) return // Response already sent

      const { courseId, teacherId } = req.body

      if (!courseId || !teacherId) {
        return res.status(400).send({ 
          error: 'Missing required fields: courseId, teacherId' 
        })
      }

      // Verify teacher owns this course
      const courseDoc = await db.collection('courses').doc(courseId).get()
      if (!courseDoc.exists || courseDoc.data().teacherId !== teacherId) {
        return res.status(403).send({ error: 'Unauthorized' })
      }

      const courseData = courseDoc.data()

      // Get all students in this course (via sessions)
      const sessionsSnapshot = await db.collection('sessions')
        .where('courseId', '==', courseId)
        .get()

      const studentIds = [...new Set(sessionsSnapshot.docs.map(doc => doc.data().studentId))]

      // Get all assessments for this course
      const assessmentsSnapshot = await db.collection('assessments')
        .where('courseId', '==', courseId)
        .get()

      if (assessmentsSnapshot.empty) {
        return res.status(200).send({
          courseId,
          courseName: courseData.courseName || courseData.name || 'Unknown Course',
          totalStudents: studentIds.length,
          totalAssessments: 0,
          message: 'No assessments found for this course'
        })
      }

      // Initialize analytics data
      const analytics = {
        totalAssessments: assessmentsSnapshot.size,
        totalStudents: studentIds.length,
        rubricAverages: {
          analysis: 0,
          reasoning: 0,
          creativity: 0,
          evidence: 0
        },
        studentPerformance: {},
        loMastery: {},
        strugglingStudents: [],
        topPerformers: []
      }

      // Process each assessment
      let totalScores = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
      
      assessmentsSnapshot.forEach(doc => {
        const assessment = doc.data()
        const { studentId, rubricScores, loAssessment } = assessment

        // Accumulate rubric scores
        if (rubricScores) {
          totalScores.analysis += rubricScores.analysis || 0
          totalScores.reasoning += rubricScores.reasoning || 0
          totalScores.creativity += rubricScores.creativity || 0
          totalScores.evidence += rubricScores.evidence || 0
        }

        // Track student performance
        if (!analytics.studentPerformance[studentId]) {
          analytics.studentPerformance[studentId] = {
            assessmentCount: 0,
            totalScore: 0,
            averageScore: 0,
            rubricTotals: { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 },
            passedLOs: new Set()
          }
        }

        const studentPerf = analytics.studentPerformance[studentId]
        studentPerf.assessmentCount++
        
        if (rubricScores) {
          const assessmentScore = (rubricScores.analysis + rubricScores.reasoning + 
                                   rubricScores.creativity + rubricScores.evidence) / 4
          studentPerf.totalScore += assessmentScore
          studentPerf.rubricTotals.analysis += rubricScores.analysis
          studentPerf.rubricTotals.reasoning += rubricScores.reasoning
          studentPerf.rubricTotals.creativity += rubricScores.creativity
          studentPerf.rubricTotals.evidence += rubricScores.evidence
        }

        // Track LO mastery
        if (loAssessment && loAssessment.passedLOs) {
          loAssessment.passedLOs.forEach(lo => {
            studentPerf.passedLOs.add(lo)
            analytics.loMastery[lo] = (analytics.loMastery[lo] || 0) + 1
          })
        }
      })

      // Calculate averages
      analytics.rubricAverages.analysis = totalScores.analysis / assessmentsSnapshot.size
      analytics.rubricAverages.reasoning = totalScores.reasoning / assessmentsSnapshot.size
      analytics.rubricAverages.creativity = totalScores.creativity / assessmentsSnapshot.size
      analytics.rubricAverages.evidence = totalScores.evidence / assessmentsSnapshot.size

      // Calculate student averages and identify struggling/top performers
      const studentScores = []
      
      for (const [studentId, perf] of Object.entries(analytics.studentPerformance)) {
        perf.averageScore = perf.totalScore / perf.assessmentCount
        perf.passedLOs = Array.from(perf.passedLOs)
        
        studentScores.push({
          studentId,
          averageScore: perf.averageScore,
          assessmentCount: perf.assessmentCount,
          passedLOsCount: perf.passedLOs.length
        })
      }

      // Sort by average score
      studentScores.sort((a, b) => a.averageScore - b.averageScore)

      // Identify struggling students (bottom 20% or score < 2.5)
      const strugglingThreshold = Math.max(2.5, studentScores[Math.floor(studentScores.length * 0.2)]?.averageScore || 0)
      analytics.strugglingStudents = studentScores
        .filter(s => s.averageScore < strugglingThreshold)
        .map(s => s.studentId)

      // Identify top performers (top 20% or score >= 4.0)
      const topThreshold = Math.min(4.0, studentScores[Math.floor(studentScores.length * 0.8)]?.averageScore || 5)
      analytics.topPerformers = studentScores
        .filter(s => s.averageScore >= topThreshold)
        .map(s => s.studentId)

      // Save analytics to Firestore
      const reportId = `${courseId}_${Date.now()}`
      await db.collection('classReports').doc(reportId).set({
        courseId,
        courseName: courseData.courseName || courseData.name || 'Unknown Course',
        teacherId,
        analytics,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      })

      return res.status(200).send({
        success: true,
        reportId,
        analytics
      })

    } catch (error) {
      console.error('Generate Class Analytics error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

/**
 * Scheduled function to generate daily reports (optional)
 */
exports.generateDailyReport = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    console.log('Running daily report generation...')
    
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Query assessments from yesterday
    const assessmentsSnapshot = await db.collection('assessments')
      .where('createdAt', '>=', yesterday)
      .where('createdAt', '<', today)
      .get()
    
    console.log(`Found ${assessmentsSnapshot.size} assessments from yesterday`)
    
    // Store report summary
    await db.collection('reports').add({
      date: yesterday,
      totalAssessments: assessmentsSnapshot.size,
      generatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    
    return null
  })

/**
 * Cloud Function to get leaderboard
 * Returns top students by score in a course or globally
 */
exports.getLeaderboard = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { courseId, scope = 'course', limit = 10 } = req.body

      let query = db.collection('studentProgress')

      // Filter by course if specified
      if (scope === 'course' && courseId) {
        query = query.where('courseId', '==', courseId)
      }

      const progressSnapshot = await query.get()

      if (progressSnapshot.empty) {
        return res.status(200).send({
          success: true,
          leaderboard: []
        })
      }

      // Calculate leaderboard scores
      const { calculateLeaderboardScore } = require('./gamification')
      const leaderboardData = []

      for (const doc of progressSnapshot.docs) {
        const data = doc.data()
        const studentId = data.studentId

        // Get student details
        const userDoc = await db.collection('users').doc(studentId).get()
        if (!userDoc.exists) continue

        const userData = userDoc.data()

        leaderboardData.push({
          studentId: data.studentId,
          name: userData.displayName || userData.name || 'Unknown',
          studentNumber: userData.studentId || 'N/A',
          grade: userData.grade || '',
          room: userData.room || '',
          totalPoints: data.totalPoints || 0,
          badges: data.badges || [],
          badgeCount: (data.badges || []).length,
          currentStreak: data.currentStreak || 0,
          passedLOsCount: data.totalPassed || 0,
          assessmentCount: data.assessmentCount || 0,
          leaderboardScore: calculateLeaderboardScore(data)
        })
      }

      // Sort by leaderboard score
      leaderboardData.sort((a, b) => b.leaderboardScore - a.leaderboardScore)

      // Add rank
      leaderboardData.forEach((entry, index) => {
        entry.rank = index + 1
      })

      // Limit results
      const limitedData = leaderboardData.slice(0, limit)

      return res.status(200).send({
        success: true,
        leaderboard: limitedData,
        total: leaderboardData.length
      })

    } catch (error) {
      console.error('Get Leaderboard error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

/**
 * Cloud Function to get badge definitions
 */
exports.getBadgeDefinitions = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { BADGES } = require('./gamification')
      
      return res.status(200).send({
        success: true,
        badges: Object.values(BADGES)
      })
    } catch (error) {
      console.error('Get Badge Definitions error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

// Daily Login Reward
exports.claimDailyReward = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { studentId, courseId } = req.body
      
      if (!studentId || !courseId) {
        return res.status(400).send({ 
          error: 'Missing required fields',
          message: 'studentId and courseId are required'
        })
      }
      
      const { calculateDailyReward } = require('./gamification')
      const progressId = `${studentId}_${courseId}`
      const progressRef = db.collection('studentProgress').doc(progressId)
      
      // Get current progress
      const progressDoc = await progressRef.get()
      
      if (!progressDoc.exists) {
        return res.status(404).send({
          error: 'Student progress not found'
        })
      }
      
      const progressData = progressDoc.data()
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      
      // Check if already claimed today
      if (progressData.lastDailyReward === today) {
        return res.status(200).send({
          success: false,
          alreadyClaimed: true,
          message: 'Daily reward already claimed today'
        })
      }
      
      // Calculate consecutive login days
      let consecutiveDays = progressData.consecutiveLoginDays || 0
      const lastRewardDate = progressData.lastDailyReward
      
      if (lastRewardDate) {
        const lastDate = new Date(lastRewardDate)
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        
        if (lastRewardDate === yesterdayStr) {
          // Consecutive day
          consecutiveDays += 1
        } else {
          // Streak broken
          consecutiveDays = 1
        }
      } else {
        // First time
        consecutiveDays = 1
      }
      
      // Calculate reward
      const reward = calculateDailyReward(consecutiveDays)
      
      // Update progress
      await progressRef.update({
        totalPoints: admin.firestore.FieldValue.increment(reward.points),
        lastDailyReward: today,
        consecutiveLoginDays: consecutiveDays,
        totalDailyRewards: admin.firestore.FieldValue.increment(1)
      })
      
      return res.status(200).send({
        success: true,
        reward: {
          points: reward.points,
          bonus: reward.bonus,
          message: reward.message,
          consecutiveDays: consecutiveDays
        }
      })
      
    } catch (error) {
      console.error('Claim Daily Reward error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

// ========================================
// ADAPTIVE LEARNING SYSTEM
// ========================================

/**
 * Generate Adaptive Learning Path for student
 * Analyzes weak LOs and creates personalized learning sequence
 */
exports.generateAdaptivePath = functions.runWith({ secrets: [openaiApiKey] }).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { studentId, courseId } = req.body

      if (!studentId || !courseId) {
        return res.status(400).send({ 
          error: 'Missing required fields: studentId, courseId' 
        })
      }

      // Get student progress - USE REAL ASSESSMENT DATA
      const progressRef = db.collection('studentProgress').doc(`${studentId}_${courseId}`)
      const progressDoc = await progressRef.get()
      
      if (!progressDoc.exists) {
        return res.status(404).send({ error: 'Student progress not found' })
      }
      
      // 🔧 GET ACTUAL PASSED LOs FROM ASSESSMENTS (not cached data)
      const assessmentsSnapshot = await db.collection('assessments')
        .where('studentId', '==', studentId)
        .where('courseId', '==', courseId)
        .get()
      
      // Count real passed LOs
      const realPassedLOsSet = new Set()
      assessmentsSnapshot.docs.forEach(doc => {
        const assessment = doc.data()
        if (assessment.loAssessment?.passedLOs) {
          assessment.loAssessment.passedLOs.forEach(lo => realPassedLOsSet.add(lo))
        }
      })
      
      const passedLOs = Array.from(realPassedLOsSet)
      
      // Get course and all LOs
      const courseDoc = await db.collection('courses').doc(courseId).get()
      if (!courseDoc.exists) {
        return res.status(404).send({ error: 'Course not found' })
      }
      
      const courseData = courseDoc.data()
      const allLOs = courseData.learningOutcomes || []
      
      // 🔍 Debug logging - NOW USING REAL DATA
      console.log('📊 Adaptive Path Debug (REAL DATA):', {
        studentId,
        courseId,
        allLOs: allLOs.map(lo => lo.code || lo),
        realPassedLOs: passedLOs, // Now from real assessments
        realPassedLOsCount: passedLOs.length,
        allLOsStructure: allLOs.length > 0 ? allLOs[0] : 'empty'
      })
      
      // Identify weak LOs (not passed yet) - NOW USING REAL DATA
      // Handle both string array and object array formats
      const weakLOs = allLOs.filter(lo => {
        const loCode = typeof lo === 'string' ? lo : lo.code
        const isPassed = passedLOs.includes(loCode) // Now using real assessment data
        console.log(`  LO ${loCode}: passed=${isPassed} (from real assessments)`)
        return !isPassed
      })
      
      console.log('🎯 Weak LOs found:', weakLOs.map(lo => typeof lo === 'string' ? lo : lo.code))
      
      if (weakLOs.length === 0) {
        return res.status(200).send({
          success: true,
          message: 'All Learning Outcomes mastered!',
          pathSteps: []
        })
      }
      
      // 🔧 Normalize weak LOs to object format {code, description}
      const normalizedWeakLOs = weakLOs.map(lo => {
        if (typeof lo === 'string') {
          // Find description from allLOs
          const fullLO = allLOs.find(l => (typeof l === 'string' ? l : l.code) === lo)
          return {
            code: lo,
            description: typeof fullLO === 'object' ? fullLO.description : `Learning Outcome ${lo}`
          }
        }
        return lo
      })
      
      // Get student's historical performance on each weak LO  
      const historicalAssessments = await db.collection('assessments')
        .where('studentId', '==', studentId)
        .where('courseId', '==', courseId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get()
      
      const loPerformance = {}
      normalizedWeakLOs.forEach(lo => {
        loPerformance[lo.code] = {
          attempts: 0,
          avgScore: 0,
          scores: []
        }
      })
      
      historicalAssessments.forEach(doc => {
        const assessment = doc.data()
        const loAssessment = assessment.loAssessment || {}
        const passedInThisAssessment = loAssessment.passedLOs || []
        const totalScore = assessment.totalScore || 0
        
        normalizedWeakLOs.forEach(lo => {
          if (assessment.relatedLOs && assessment.relatedLOs.includes(lo.code)) {
            loPerformance[lo.code].attempts++
            loPerformance[lo.code].scores.push(totalScore)
          }
        })
      })
      
      // Calculate average scores
      Object.keys(loPerformance).forEach(loCode => {
        const perf = loPerformance[loCode]
        if (perf.scores.length > 0) {
          perf.avgScore = perf.scores.reduce((a, b) => a + b, 0) / perf.scores.length
        }
      })
      
      // Sort weak LOs by priority (lowest avg score first, then by attempts)
      const prioritizedLOs = normalizedWeakLOs.sort((a, b) => {
        const perfA = loPerformance[a.code]
        const perfB = loPerformance[b.code]
        
        if (perfA.avgScore !== perfB.avgScore) {
          return perfA.avgScore - perfB.avgScore
        }
        return perfB.attempts - perfA.attempts // More attempts = higher priority
      })
      
      // Take top 3 weakest LOs
      const targetLOs = prioritizedLOs.slice(0, 3)
      
      console.log('🎯 Target LOs for adaptive path:', targetLOs.map(lo => lo.code))
      
      // Generate learning path for each target LO
      const pathSteps = []
      
      for (const lo of targetLOs) {
        const perf = loPerformance[lo.code]
        
        // Step 1: Micro-lesson (if available)
        const microLessonsSnapshot = await db.collection('microLessons')
          .where('courseId', '==', courseId)
          .where('relatedLOs', 'array-contains', lo.code)
          .limit(1)
          .get()
        
        if (!microLessonsSnapshot.empty) {
          const lesson = microLessonsSnapshot.docs[0].data()
          pathSteps.push({
            type: 'micro-lesson',
            loCode: lo.code,
            loDescription: lo.description,
            lessonId: microLessonsSnapshot.docs[0].id,
            title: lesson.title,
            content: lesson.content,
            estimatedMinutes: lesson.estimatedMinutes || 5,
            completed: false
          })
        }
        
        // Step 2: Easy question (difficulty 1-2)
        pathSteps.push({
          type: 'question-easy',
          loCode: lo.code,
          loDescription: lo.description,
          difficulty: perf.attempts === 0 ? 1 : 2,
          questionType: 'Analysis',
          completed: false
        })
        
        // Step 3: Micro-lesson (if available)
        pathSteps.push({
          type: 'micro-lesson',
          loCode: lo.code,
          loDescription: lo.description,
          completed: false
        })
        
        // Step 4: Challenge question (difficulty 3-4)
        pathSteps.push({
          type: 'question-hard',
          loCode: lo.code,
          loDescription: lo.description,
          difficulty: 3,
          questionType: 'Analysis',
          completed: false
        })
      }
      
      // Save path to Firestore
      const pathId = `path_${studentId}_${Date.now()}`
      await db.collection('learningPaths').doc(pathId).set({
        studentId,
        courseId,
        targetLOs: targetLOs.map(lo => lo.code),
        steps: pathSteps,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      return res.status(200).send({
        success: true,
        pathId,
        targetLOs: targetLOs.map(lo => ({
          code: lo.code,
          description: lo.description,
          performance: loPerformance[lo.code]
        })),
        pathSteps,
        message: `Created adaptive learning path with ${pathSteps.length} steps targeting ${targetLOs.length} Learning Outcomes`
      })
    } catch (error) {
      console.error('Error generating adaptive path:', error)
      return res.status(500).send({
        success: false,
        error: error.message
      })
    }
  })
})

exports.analyzeTalentTracks = functions.pubsub.schedule('every monday 00:00').timeZone('Asia/Bangkok').onRun(async (context) => {
  const db = admin.firestore()
  console.log('Starting weekly talent track analysis...')
  
  try {
    const studentsSnapshot = await db.collection('users').where('role', '==', 'student').get()
    let updateCount = 0
    
    for (const doc of studentsSnapshot.docs) {
      const studentId = doc.id
      const studentData = doc.data()
      
      // Get all assessments for this student
      const assessmentsSnapshot = await db.collection('assessments')
        .where('studentId', '==', studentId)
        .get()
        
      if (assessmentsSnapshot.empty) continue
      
      let totalScores = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
      let count = 0
      
      assessmentsSnapshot.forEach(assDoc => {
        const data = assDoc.data()
        if (data.rubricScores) {
          totalScores.analysis += data.rubricScores.analysis || 0
          totalScores.reasoning += data.rubricScores.reasoning || 0
          totalScores.creativity += data.rubricScores.creativity || 0
          totalScores.evidence += data.rubricScores.evidence || 0
          count++
        }
      })
      
      if (count < 5) continue // Need at least 5 assessments to qualify
      
      const avgScores = {
        analysis: totalScores.analysis / count,
        reasoning: totalScores.reasoning / count,
        creativity: totalScores.creativity / count,
        evidence: totalScores.evidence / count
      }
      
      const newTags = []
      
      // Research Track Criteria: High Evidence & Reasoning
      if (avgScores.evidence >= 4.0 && avgScores.reasoning >= 4.0) {
        newTags.push('research_track')
      }
      
      // Innovation Track Criteria: High Creativity & Analysis
      if (avgScores.creativity >= 4.0 && avgScores.analysis >= 4.0) {
        newTags.push('innovation_track')
      }
      
      // Update if tags found
      if (newTags.length > 0) {
        // Merge with existing tags, avoiding duplicates
        const currentTags = studentData.talentTags || []
        const updatedTags = [...new Set([...currentTags, ...newTags])]
        
        if (updatedTags.length !== currentTags.length) {
          await db.collection('users').doc(studentId).update({
            talentTags: updatedTags,
            talentAnalysisLastRun: admin.firestore.FieldValue.serverTimestamp(),
            talentScores: avgScores
          })
          
          // Create notification
          await db.collection('notifications').add({
            userId: studentId,
            type: 'talent_badge',
            title: '🎉 You have been identified for a Talent Track!',
            message: `Based on your consistent performance, you have been tagged for: ${newTags.map(t => t.replace('_', ' ').toUpperCase()).join(', ')}`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          })
          
          updateCount++
        }
      }
    }
    
    console.log(`Talent track analysis complete. Updated ${updateCount} students.`)
    return null
  } catch (error) {
    console.error('Error in analyzeTalentTracks:', error)
    return null
  }
})

// ==================== DATA INTEGRITY FUNCTIONS ====================

/**
 * CASCADE DELETE: Delete all related data when user account is deleted
 * Triggered when user document is deleted
 */
exports.onUserDelete = functions.firestore
  .document('users/{userId}')
  .onDelete(async (snap, context) => {
    const userId = context.params.userId
    const batch = db.batch()
    let deleteCount = 0

    console.log(`🗑️ Cascade delete triggered for user: ${userId}`)

    try {
      // 1. Delete assessments
      const assessmentsSnap = await db.collection('assessments')
        .where('studentId', '==', userId)
        .limit(500) // Firestore batch limit
        .get()
      
      assessmentsSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 2. Delete sessions
      const sessionsSnap = await db.collection('sessions')
        .where('studentId', '==', userId)
        .get()
      
      sessionsSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 3. Delete messages (nested in sessions, but query by from)
      const messagesSnap = await db.collection('messages')
        .where('studentId', '==', userId)
        .get()
      
      messagesSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 4. Delete studentProgress
      const progressSnap = await db.collection('studentProgress')
        .where('studentId', '==', userId)
        .get()
      
      progressSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 5. Delete reflections
      const reflectionsSnap = await db.collection('reflections')
        .where('studentId', '==', userId)
        .get()
      
      reflectionsSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 6. Delete notifications
      const notificationsSnap = await db.collection('notifications')
        .where('userId', '==', userId)
        .get()
      
      notificationsSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 7. Audit log
      batch.set(db.collection('auditLogs').doc(), {
        userId,
        action: 'cascade_delete',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          deletedDocuments: deleteCount,
          reason: 'User account deleted'
        }
      })

      // Commit batch
      await batch.commit()
      console.log(`✅ Cascade delete completed: ${deleteCount} documents deleted for user ${userId}`)

      return { success: true, deletedDocuments: deleteCount }
    } catch (error) {
      console.error('❌ Cascade delete error:', error)
      throw error
    }
  })

/**
 * CONSISTENCY CHECK: Scheduled function to verify data integrity
 * Runs daily at 2 AM
 */
exports.dailyConsistencyCheck = functions.pubsub
  .schedule('every day 02:00')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    console.log('🔍 Starting daily consistency check...')
    
    const issues = {
      orphanedAssessments: [],
      mismatchedLOProgress: [],
      invalidScores: [],
      totalChecked: 0
    }

    try {
      // Check 1: Find orphaned assessments (student doesn't exist)
      const assessmentsSnap = await db.collection('assessments')
        .where('createdAt', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
        .limit(1000)
        .get()

      for (const assessmentDoc of assessmentsSnap.docs) {
        issues.totalChecked++
        const assessment = assessmentDoc.data()
        
        // Check if student exists
        const studentDoc = await db.collection('users').doc(assessment.studentId).get()
        if (!studentDoc.exists) {
          issues.orphanedAssessments.push({
            id: assessmentDoc.id,
            studentId: assessment.studentId,
            createdAt: assessment.createdAt
          })
        }

        // Check score validity
        if (assessment.overallScore < 0 || assessment.overallScore > 20) {
          issues.invalidScores.push({
            id: assessmentDoc.id,
            score: assessment.overallScore
          })
        }
      }

      // Check 2: Verify LO progress consistency
      const progressSnap = await db.collection('studentProgress')
        .limit(100) // Sample check
        .get()

      for (const progressDoc of progressSnap.docs) {
        const [studentId, courseId] = progressDoc.id.split('_')
        const progressData = progressDoc.data()
        
        // Get all assessments for this student-course
        const studentAssessmentsSnap = await db.collection('assessments')
          .where('studentId', '==', studentId)
          .where('courseId', '==', courseId)
          .get()

        // Collect all passed LOs from assessments
        const passedLOsFromAssessments = new Set()
        studentAssessmentsSnap.docs.forEach(doc => {
          const los = doc.data().loAssessment?.passedLOs || []
          los.forEach(lo => passedLOsFromAssessments.add(lo))
        })

        // Compare with stored progress
        const passedLOsFromProgress = new Set(progressData.passedLOs || [])
        
        const missing = [...passedLOsFromAssessments].filter(lo => !passedLOsFromProgress.has(lo))
        const extra = [...passedLOsFromProgress].filter(lo => !passedLOsFromAssessments.has(lo))

        if (missing.length > 0 || extra.length > 0) {
          issues.mismatchedLOProgress.push({
            documentId: progressDoc.id,
            studentId,
            courseId,
            missing,
            extra
          })
        }
      }

      // Log results
      console.log('📊 Consistency Check Results:', JSON.stringify(issues, null, 2))

      // Store report
      await db.collection('systemReports').add({
        type: 'consistency_check',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        issues,
        summary: {
          totalChecked: issues.totalChecked,
          orphanedCount: issues.orphanedAssessments.length,
          mismatchedCount: issues.mismatchedLOProgress.length,
          invalidScoresCount: issues.invalidScores.length
        }
      })

      // Send alert if critical issues found
      if (issues.orphanedAssessments.length > 10 || issues.invalidScores.length > 0) {
        console.warn('⚠️ CRITICAL: Major consistency issues detected!')
        
        // 🔧 FIX: Log to critical alerts collection for admin notification
        await db.collection('criticalAlerts').add({
          type: 'DATA_CONSISTENCY_ISSUE',
          severity: 'critical',
          message: `ตรวจพบปัญหา Data Consistency: ${issues.orphanedAssessments.length} orphaned assessments, ${issues.invalidScores.length} invalid scores`,
          details: {
            orphanedCount: issues.orphanedAssessments.length,
            invalidScoresCount: issues.invalidScores.length,
            mismatchedCount: issues.mismatchedLOProgress.length
          },
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          resolved: false,
          notifiedAdmins: false
        })
        
        console.log('📧 Critical alert logged to criticalAlerts collection')
      }

      return { success: true, issues }
    } catch (error) {
      console.error('❌ Consistency check error:', error)
      return { success: false, error: error.message }
    }
  })

/**
 * MANUAL CONSISTENCY FIX: Recalculate studentProgress from assessments
 * Callable function for admin
 */
exports.recalculateStudentProgress = functions.https.onCall(async (data, context) => {
  // Check if caller is admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const callerDoc = await db.collection('users').doc(context.auth.uid).get()
  const callerRole = callerDoc.data()?.role
  
  if (callerRole !== 'ministry_admin' && callerRole !== 'esa_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can run this function')
  }

  const { studentId, courseId } = data

  if (!studentId || !courseId) {
    throw new functions.https.HttpsError('invalid-argument', 'studentId and courseId required')
  }

  try {
    // Get all assessments
    const assessmentsSnap = await db.collection('assessments')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .get()

    // Collect all passed LOs
    const passedLOs = new Set()
    let totalAssessments = 0
    let totalPoints = 0

    assessmentsSnap.docs.forEach(doc => {
      const assessment = doc.data()
      totalAssessments++
      
      // LOs
      const los = assessment.loAssessment?.passedLOs || []
      los.forEach(lo => passedLOs.add(lo))
      
      // Points
      totalPoints += assessment.gamification?.pointsEarned || 0
    })

    // Update studentProgress
    const progressRef = db.collection('studentProgress').doc(`${studentId}_${courseId}`)
    await progressRef.set({
      studentId,
      courseId,
      passedLOs: Array.from(passedLOs),
      totalAssessments,
      totalPoints,
      lastRecalculated: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })

    // Audit log
    await db.collection('auditLogs').add({
      userId: context.auth.uid,
      action: 'recalculate_progress',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        targetStudent: studentId,
        courseId,
        passedLOsCount: passedLOs.size,
        totalAssessments
      }
    })

    return {
      success: true,
      passedLOs: Array.from(passedLOs),
      totalAssessments,
      totalPoints
    }
  } catch (error) {
    console.error('Recalculation error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Generate Lesson Plan using AI (5E Model with ARCE Assessment)
 * ครบถ้วนตามโครงสร้างแผนการจัดการเรียนรู้มาตรฐานกระทรวงศึกษาธิการไทย
 * 🔐 SECURED: Teacher/Admin only
 */
exports.generateLessonPlan = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 180,
  memory: '1GB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      // 🔐 RBAC: Verify teacher/admin role
      const caller = await verifyTeacherRole(req, res)
      if (!caller) return // Response already sent

      const {
        teacherId,
        // Course Info
        courseId,
        courseCode,
        courseName,
        courseDescription,
        subjectGroup,
        learningOutcomes,
        // ข้อมูลหลักสูตรแกนกลาง
        courseType,
        selectedStandards,
        keyCompetencies,
        desiredCharacteristics,
        // Basic Info
        gradeLevel,
        semester,
        academicYear,
        teacherName,
        schoolName,
        // Unit & Lesson
        unitNumber,
        unitName,
        unitTotalHours,
        unitTotalPeriods,        // From CurriculumDesigner
        unitEssentialContent,    // สาระสำคัญของหน่วย
        unitLearningObjectives,  // จุดประสงค์ของหน่วย
        unitLOs,                 // LOs ของหน่วย
        totalPlansInUnit,        // จำนวนแผนทั้งหมดในหน่วย
        previousPlans,           // แผนก่อนหน้าที่สร้างแล้ว
        courseStructure,         // โครงสร้างรายวิชา
        planNumber,
        topic,
        duration,
        periods,                 // จำนวนคาบของแผนนี้
        teachingMethod,
        // Standards & LOs
        standard,
        indicatorTypes,
        indicators,
        targetLOs,
        planLOs,                 // LOs ของแผนนี้
        // ARCE Focus
        arce,
        arceFocus,
        hotsFocus,
        // Options
        desirableTraits,
        competencies,
        integration,
        learningStyle,
        additionalNotes
      } = req.body

      if (!courseId || !topic || !teacherId) {
        return res.status(400).send({
          error: 'Missing required fields: courseId, topic, teacherId'
        })
      }

      if (!openai) {
        return res.status(500).send({
          error: 'OpenAI API not configured'
        })
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

      // แต่ละแผน = 1 คาบ (50 นาที) เสมอ
      const actualPeriods = periods || 1
      const actualDuration = actualPeriods * 50

      // Build Learning Outcomes text from planLOs or unitLOs or targetLOs - ensure it's an array
      let effectiveLOs = planLOs || unitLOs || targetLOs || []
      if (!Array.isArray(effectiveLOs)) {
        effectiveLOs = []
      }
      const losText = effectiveLOs.length 
        ? effectiveLOs.map(lo => {
            const loData = learningOutcomes?.find(l => l.code === lo)
            return loData ? `- ${lo}: ${loData.description}` : `- ${lo}`
          }).join('\n')
        : 'AI จะสร้าง Learning Outcomes ให้อัตโนมัติ'

      // Build desirable traits text
      const traitsMap = {
        'discipline': 'มีวินัย',
        'diligent': 'ใฝ่เรียนรู้',
        'determined': 'มุ่งมั่นในการทำงาน',
        'honest': 'ซื่อสัตย์สุจริต',
        'sufficient': 'อยู่อย่างพอเพียง',
        'patriotic': 'รักชาติ ศาสน์ กษัตริย์',
        'thai_identity': 'รักความเป็นไทย',
        'public_minded': 'มีจิตสาธารณะ',
        // เพิ่ม key ตามที่ใช้ใน desiredCharacteristics
        'patriotism': 'รักชาติ ศาสน์ กษัตริย์',
        'honesty': 'ซื่อสัตย์สุจริต',
        'curiosity': 'ใฝ่เรียนรู้',
        'sufficiency': 'อยู่อย่างพอเพียง',
        'dedication': 'มุ่งมั่นในการทำงาน',
        'thaiIdentity': 'รักความเป็นไทย',
        'publicMind': 'มีจิตสาธารณะ'
      }

      // Build competencies text
      const compMap = {
        'communication': 'ความสามารถในการสื่อสาร',
        'thinking': 'ความสามารถในการคิด',
        'problem_solving': 'ความสามารถในการแก้ปัญหา',
        'problemSolving': 'ความสามารถในการแก้ปัญหา',
        'life_skills': 'ความสามารถในการใช้ทักษะชีวิต',
        'lifeSkills': 'ความสามารถในการใช้ทักษะชีวิต',
        'technology': 'ความสามารถในการใช้เทคโนโลยี'
      }
      // ใช้ keyCompetencies จากหลักสูตรถ้ามี หรือ competencies จาก request
      const effectiveCompetencies = keyCompetencies?.length > 0 ? keyCompetencies : (Array.isArray(competencies) ? competencies : [])
      const compText = effectiveCompetencies.length > 0 
        ? effectiveCompetencies.map(c => compMap[c] || c).join(', ') 
        : 'ความสามารถในการสื่อสาร, ความสามารถในการคิด'
      
      // ใช้ desiredCharacteristics จากหลักสูตรถ้ามี หรือ desirableTraits จาก request
      const effectiveTraits = desiredCharacteristics?.length > 0 ? desiredCharacteristics : (Array.isArray(desirableTraits) ? desirableTraits : [])
      const traitsText = effectiveTraits.length > 0 
        ? effectiveTraits.map(t => traitsMap[t] || t).join(', ') 
        : 'มีวินัย, ใฝ่เรียนรู้, มุ่งมั่นในการทำงาน'
      
      // ประเภทรายวิชา
      const isBasicCourse = courseType === 'basic'
      const standardsText = selectedStandards?.length > 0 
        ? selectedStandards.join(', ') 
        : ''

      // Integration text
      let integrationText = ''
      if (integration?.worldClass) {
        integrationText += '- บูรณาการหลักสูตรโรงเรียนมาตรฐานสากล (IS1, IS2, IS3)\n'
      }
      if (integration?.sufficiencyEconomy) {
        integrationText += '- บูรณาการปรัชญาของเศรษฐกิจพอเพียง (พอประมาณ, มีเหตุผล, มีภูมิคุ้มกัน)\n'
      }

      // Build ARCE focus text - ensure it's an array
      let effectiveArce = arce || arceFocus || hotsFocus || ['analysis', 'reasoning', 'creativity', 'evidence']
      // If it's not an array, use default
      if (!Array.isArray(effectiveArce)) {
        effectiveArce = ['analysis', 'reasoning', 'creativity', 'evidence']
      }
      const arceMap = {
        'analysis': 'การวิเคราะห์ (Analysis)',
        'reasoning': 'การให้เหตุผล (Reasoning)',
        'creativity': 'ความคิดสร้างสรรค์ (Creativity)',
        'evidence': 'การใช้หลักฐาน (Evidence)'
      }
      const arceText = effectiveArce.map(a => arceMap[a] || a).join(', ')

      // Build previous plans context
      let prevPlansText = ''
      if (Array.isArray(previousPlans) && previousPlans.length > 0) {
        prevPlansText = `\n📋 แผนที่สร้างไปแล้วในหน่วยนี้:
${previousPlans.map((p, i) => `- แผนที่ ${i + 1}: "${p.topic || 'ไม่ระบุ'}" (${p.periods || 2} คาบ, LOs: ${Array.isArray(p.los) ? p.los.join(', ') : 'ไม่ระบุ'})`).join('\n')}`
      }

      const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบแผนการจัดการเรียนรู้ตามมาตรฐานกระทรวงศึกษาธิการไทย สำหรับการขอเลื่อนวิทยฐานะครูชำนาญการพิเศษ

📚 ข้อมูลรายวิชา:
- รหัสวิชา: ${courseCode || 'ไม่ระบุ'}
- ชื่อวิชา: ${courseName || 'ไม่ระบุ'}
- คำอธิบายรายวิชา: ${courseDescription || 'ไม่ระบุ'}
- กลุ่มสาระการเรียนรู้: ${subjectGroup || 'วิทยาศาสตร์และเทคโนโลยี'}
- ระดับชั้น: ${gradeLevel || 'ม.4'}
- ภาคเรียนที่: ${semester || 2} ปีการศึกษา: ${academicYear || 2568}
- ประเภทรายวิชา: ${isBasicCourse ? '📘 รายวิชาพื้นฐาน (ต้องเคร่งครัดตามหลักสูตรแกนกลาง)' : '📗 รายวิชาเพิ่มเติม'}
- ครูผู้สอน: ${teacherName || 'ไม่ระบุ'}
- โรงเรียน: ${schoolName || 'ไม่ระบุ'}

📋 ข้อมูลตามหลักสูตรแกนกลาง พ.ศ. 2551 (ฉบับปรับปรุง 2560):
${standardsText ? `- มาตรฐานการเรียนรู้ที่เลือก: ${standardsText}` : ''}
- สมรรถนะสำคัญของผู้เรียน: ${compText}
- คุณลักษณะอันพึงประสงค์: ${traitsText}
${isBasicCourse ? '⚠️ รายวิชาพื้นฐาน: ต้องออกแบบให้สอดคล้องกับมาตรฐาน/ตัวชี้วัดตามหลักสูตรแกนกลางอย่างเคร่งครัด' : ''}

📋 ข้อมูลหน่วยการเรียนรู้ (สำคัญ - ต้องสร้างแผนให้สอดคล้อง!):
- หน่วยการเรียนรู้ที่: ${unitNumber || 1}
- ชื่อหน่วย: ${unitName || topic}
- รวมเวลาหน่วย: ${unitTotalPeriods || unitTotalHours || 4} คาบ
- สาระสำคัญของหน่วย: ${unitEssentialContent || 'ไม่ระบุ'}
- จุดประสงค์การเรียนรู้ของหน่วย: ${Array.isArray(unitLearningObjectives) ? unitLearningObjectives.join(', ') : unitLearningObjectives || 'ไม่ระบุ'}
- Learning Outcomes (LOs) ของหน่วย: ${unitLOs?.join(', ') || 'ไม่ระบุ'}
- จำนวนแผนทั้งหมดในหน่วยนี้: ${totalPlansInUnit || 2} แผน
${prevPlansText}

📝 ข้อมูลแผนการจัดการเรียนรู้นี้:
- แผนการจัดการเรียนรู้ที่: ${planNumber || 1} / ${totalPlansInUnit || 2}
- เรื่อง: ${topic}
- เวลา: ${actualPeriods} คาบ (${actualDuration} นาที โดย 1 คาบ = 50 นาที)
- Learning Outcomes (LOs) ที่เน้น: ${effectiveLOs?.join(', ') || 'ทุก LO ของหน่วย'}
- HOTS Focus (A.R.C.E.): ${arceText}
- วิธีการสอน: ${teachingMethod === '5E' ? 'กระบวนการสืบเสาะหาความรู้ 5 ขั้นตอน (5E)' : teachingMethod || '5E'}

🎯 มาตรฐานและตัวชี้วัด:
${standard || 'ให้ AI สร้างมาตรฐานที่เหมาะสมกับเนื้อหา'}
${indicators ? `ตัวชี้วัด:\n${indicators}` : ''}
ประเภทตัวชี้วัด: ${indicatorTypes?.includes('during') ? '☐ ตัวชี้วัดระหว่างทาง' : ''} ${indicatorTypes?.includes('final') ? '☑ ตัวชี้วัดปลายทาง' : '☑ ตัวชี้วัดปลายทาง'}

📖 Learning Outcomes จากรายวิชา:
${losText}

✨ คุณลักษณะอันพึงประสงค์ที่ต้องการเน้น:
${traitsText}

🌟 สมรรถนะสำคัญที่ต้องการเน้น:
${compText}

🔗 การบูรณาการ:
${integrationText || 'ไม่มีการบูรณาการพิเศษ'}

⚙️ ตัวเลือกเพิ่มเติม:
- รูปแบบการเรียนรู้: ${learningStyle === 'collaborative' ? 'เรียนรู้แบบกลุ่ม' : learningStyle === 'individual' ? 'เรียนรู้รายบุคคล' : 'ผสมผสาน'}
${additionalNotes ? `- หมายเหตุเพิ่มเติม: ${additionalNotes}` : ''}

⚠️ ข้อกำหนดสำคัญ:
1. แผนนี้ต้องสอดคล้องกับ "สาระสำคัญของหน่วย" และ "จุดประสงค์การเรียนรู้ของหน่วย" ที่กำหนดไว้
2. ต้องครอบคลุม Learning Outcomes (LOs) ที่ระบุในแผนนี้
3. กิจกรรมต้องเหมาะสมกับเวลา ${actualPeriods} คาบ (${actualDuration} นาที) โดยกิจกรรม 5E ทั้ง 5 ขั้น รวมกันต้องเท่ากับ ${actualDuration} นาทีพอดี
4. ถ้ามีแผนก่อนหน้าแล้ว ให้เนื้อหาต่อเนื่องและไม่ซ้ำซ้อน
5. เน้น HOTS ด้าน ${arceText}

🎯 การออกแบบ 5E Model ให้สอดคล้องกับ A.R.C.E. (สำคัญมาก!):
แต่ละขั้นตอนของ 5E ต้องออกแบบให้ส่งเสริมทักษะ HOTS ตามเกณฑ์ A.R.C.E. ดังนี้:

📌 ขั้นที่ 1 - Engagement (กระตุ้นความสนใจ): 5-8 นาที
   - เน้น Analysis (A): ตั้งคำถามให้วิเคราะห์สถานการณ์ ปัญหา หรือกรณีศึกษา
   - กิจกรรม: นำเสนอสถานการณ์ปัญหา, ถามคำถามเพื่อให้วิเคราะห์องค์ประกอบ, แยกแยะสิ่งที่รู้และไม่รู้

📌 ขั้นที่ 2 - Exploration (สำรวจ): 15-20 นาที
   - เน้น Evidence (E): ให้ค้นหาข้อมูล หลักฐาน ทดลอง สังเกต บันทึกผล
   - เน้น Analysis (A): วิเคราะห์ข้อมูลที่ค้นพบ จำแนกประเภท เปรียบเทียบ
   - กิจกรรม: ทดลอง/สำรวจ, รวบรวมหลักฐาน, บันทึกข้อมูลอย่างเป็นระบบ

📌 ขั้นที่ 3 - Explanation (อธิบาย): 10-12 นาที
   - เน้น Reasoning (R): อธิบายเหตุผล สรุปความสัมพันธ์ เชื่อมโยงหลักการ
   - เน้น Evidence (E): อ้างอิงหลักฐานจากการสำรวจมาสนับสนุนคำอธิบาย
   - กิจกรรม: นำเสนอข้อค้นพบ, อธิบายด้วยหลักการทางวิชาการ, ตอบคำถาม "ทำไม"

📌 ขั้นที่ 4 - Elaboration (ขยายความ): 8-12 นาที
   - เน้น Creativity (C): นำความรู้ไปประยุกต์ใช้สถานการณ์ใหม่ คิดวิธีแก้ปัญหาใหม่
   - เน้น Reasoning (R): เชื่อมโยงกับความรู้เดิมและสถานการณ์อื่น
   - กิจกรรม: แก้ปัญหาใหม่, ออกแบบ/สร้างสรรค์ผลงาน, ประยุกต์ใช้จริง

📌 ขั้นที่ 5 - Evaluation (ประเมินผล): 5-8 นาที
   - ครอบคลุมทั้ง A.R.C.E.: ประเมินความสามารถด้านวิเคราะห์ เหตุผล สร้างสรรค์ และหลักฐาน
   - กิจกรรม: ทำแบบทดสอบ HOTS, สะท้อนคิด, ประเมินตนเองและเพื่อน

⏱️ เวลารวม 5E = ${actualDuration} นาที (${actualPeriods} คาบ x 50 นาที)
   - Engagement: 5-8 นาที
   - Exploration: 15-20 นาที  
   - Explanation: 10-12 นาที
   - Elaboration: 8-12 นาที
   - Evaluation: 5-8 นาที

กรุณาสร้างแผนการจัดการเรียนรู้ที่ครบถ้วนตามโครงสร้างมาตรฐาน ตอบเป็น JSON ตามโครงสร้างนี้ (ไม่ต้องมี markdown wrapper):

{
  "title": "ชื่อแผนการจัดการเรียนรู้ที่ ${planNumber || 1} เรื่อง ${topic}",
  "header": {
    "planNumber": ${planNumber || 1},
    "courseCode": "${courseCode || ''}",
    "courseName": "${courseName || ''}",
    "subjectGroup": "${subjectGroup || 'วิทยาศาสตร์และเทคโนโลยี'}",
    "gradeLevel": "${gradeLevel || 'ม.4'}",
    "semester": ${semester || 2},
    "academicYear": ${academicYear || 2568},
    "teacherName": "${teacherName || ''}",
    "schoolName": "${schoolName || ''}",
    "unitNumber": ${unitNumber || 1},
    "unitName": "${unitName || topic}",
    "unitTotalPeriods": ${unitTotalPeriods || unitTotalHours || 4},
    "totalPlansInUnit": ${totalPlansInUnit || 2},
    "topic": "${topic}",
    "periods": ${actualPeriods},
    "duration": ${actualDuration},
    "teachingMethod": "${teachingMethod || '5E'}",
    "unitEssentialContent": "${(unitEssentialContent || '').replace(/"/g, '\\"')}",
    "targetLOs": ${JSON.stringify(effectiveLOs || [])}
  },
  "standard": {
    "code": "มาตรฐาน ว X.X",
    "description": "คำอธิบายมาตรฐาน..."
  },
  "indicators": {
    "types": ["${indicatorTypes?.join('","') || 'final'}"],
    "items": [
      {
        "code": "ว X.X ม.4/1",
        "description": "ตัวชี้วัด/ผลการเรียนรู้..."
      }
    ]
  },
  "objectives": {
    "knowledge": [
      "นักเรียนสามารถระบุ/อธิบาย... (ห้ามใส่ 'ด้านความรู้ (K):' นำหน้า)"
    ],
    "process": [
      "นักเรียนสามารถปฏิบัติ/วิเคราะห์... (ห้ามใส่ 'ด้านทักษะกระบวนการ (P):' นำหน้า)"
    ],
    "attitude": [
      "นักเรียนมีความตั้งใจ/มีวินัย... (ห้ามใส่ 'ด้านคุณลักษณะ (A):' นำหน้า)"
    ]
  },
  "essentialContent": "อธิบายสาระสำคัญ... (ห้ามใส่ 'สาระสำคัญ:' นำหน้า)",
  "learningContent": [
    "สาระการเรียนรู้ข้อที่ 1",
    "สาระการเรียนรู้ข้อที่ 2"
  ],
  "desirableTraits": {
    "selected": [/* วิเคราะห์และเลือกคุณลักษณะอันพึงประสงค์ที่เหมาะกับกิจกรรม เลือก 2-4 ข้อจาก: "patriotic" (รักชาติ ศาสน์ กษัตริย์), "honesty" (ซื่อสัตย์สุจริต), "discipline" (มีวินัย), "studious" (ใฝ่เรียนรู้), "self_sufficiency" (อยู่อย่างพอเพียง), "dedicated" (มุ่งมั่นในการทำงาน), "thai_identity" (รักความเป็นไทย), "public_mind" (มีจิตสาธารณะ) */],
    "description": "อธิบายละเอียดว่ากิจกรรมในแผนนี้ส่งเสริมคุณลักษณะที่เลือกอย่างไร เชื่อมโยงกับเนื้อหา ${topic}"
  },
  "competencies": {
    "selected": [/* วิเคราะห์และเลือกสมรรถนะที่เหมาะกับกิจกรรม เลือก 2-4 ข้อจาก: "communication" (ความสามารถในการสื่อสาร), "thinking" (ความสามารถในการคิด), "problem_solving" (ความสามารถในการแก้ปัญหา), "life_skills" (ความสามารถในการใช้ทักษะชีวิต), "technology" (ความสามารถในการใช้เทคโนโลยี) */],
    "descriptions": {
      /* สำหรับแต่ละสมรรถนะที่เลือก ให้อธิบายว่ากิจกรรมส่งเสริมอย่างไร เชื่อมโยงกับเนื้อหา ${topic} โดยเฉพาะ */
      "communication": "อธิบายการส่งเสริมสมรรถนะด้านการสื่อสารเชื่อมโยงกับกิจกรรมในแผน",
      "thinking": "อธิบายการส่งเสริมสมรรถนะด้านการคิดวิเคราะห์เชื่อมโยงกับเนื้อหา",
      "problem_solving": "อธิบายการส่งเสริมสมรรถนะด้านการแก้ปัญหาจากโจทย์ในกิจกรรม",
      "life_skills": "อธิบายการส่งเสริมทักษะชีวิตจากการนำความรู้ไปใช้",
      "technology": "อธิบายการส่งเสริมสมรรถนะด้านเทคโนโลยี (ถ้าเกี่ยวข้อง)"
    }
  },
  "integration": {
    "worldClass": false,
    "worldClassItems": null,
    "sufficiencyEconomy": false,
    "sufficiencyItems": null,
    "crossSubjects": [
      /* วิเคราะห์การบูรณาการข้ามสาระที่เหมาะกับหัวข้อ ${topic} ถ้ามี ให้ระบุ subject และ description */
    ]
  },
  "tasks": [
    "ภาระงาน: อธิบายงานที่นักเรียนต้องทำ (ห้ามใส่เลขข้อหน้า)",
    "ภาระงานอื่น",
    "ภาระงานอื่น",
    "ภาระงานอื่น",
    "ภาระงานอื่น"
  ],
  "assessment": {
    "table": [
      {
        "aspect": "ด้านความรู้ (K)",
        "item": "สิ่งที่ประเมิน",
        "method": "วิธีการ",
        "tool": "เครื่องมือ",
        "criteria": "เกณฑ์การผ่าน",
        "evaluator": "ครู/นักเรียน"
      },
      {
        "aspect": "ด้านทักษะ (P)",
        "item": "สิ่งที่ประเมิน",
        "method": "วิธีการ",
        "tool": "เครื่องมือ",
        "criteria": "เกณฑ์การผ่าน",
        "evaluator": "ครู/นักเรียน"
      },
      {
        "aspect": "ด้านคุณลักษณะ (A)",
        "item": "สิ่งที่ประเมิน",
        "method": "วิธีการ",
        "tool": "เครื่องมือ",
        "criteria": "เกณฑ์การผ่าน",
        "evaluator": "ครู/นักเรียน"
      }
    ],
    "rubric": {
      "analysis": {
        "weight": 25,
        "criteria": "เกณฑ์การประเมินด้านการวิเคราะห์สำหรับเรื่องนี้โดยเฉพาะ",
        "levels": {
          "5": "ดีเยี่ยม: อธิบายระดับ 5",
          "4": "ดี: อธิบายระดับ 4",
          "3": "พอใช้: อธิบายระดับ 3",
          "2": "ต้องปรับปรุง: อธิบายระดับ 2",
          "1": "ไม่ผ่าน: อธิบายระดับ 1"
        }
      },
      "reasoning": {
        "weight": 25,
        "criteria": "เกณฑ์การประเมินด้านการให้เหตุผล",
        "levels": {
          "5": "ดีเยี่ยม: ...",
          "4": "ดี: ...",
          "3": "พอใช้: ...",
          "2": "ต้องปรับปรุง: ...",
          "1": "ไม่ผ่าน: ..."
        }
      },
      "creativity": {
        "weight": 25,
        "criteria": "เกณฑ์การประเมินด้านความคิดสร้างสรรค์",
        "levels": {
          "5": "ดีเยี่ยม: ...",
          "4": "ดี: ...",
          "3": "พอใช้: ...",
          "2": "ต้องปรับปรุง: ...",
          "1": "ไม่ผ่าน: ..."
        }
      },
      "evidence": {
        "weight": 25,
        "criteria": "เกณฑ์การประเมินด้านการใช้หลักฐาน",
        "levels": {
          "5": "ดีเยี่ยม: ...",
          "4": "ดี: ...",
          "3": "พอใช้: ...",
          "2": "ต้องปรับปรุง: ...",
          "1": "ไม่ผ่าน: ..."
        }
      }
    }
  },
  "activities": {
    "totalDuration": ${actualDuration},
    "engagement": {
      "duration": 7,
      "arceFocus": ["analysis"],
      "arceDescription": "ส่งเสริมทักษะการวิเคราะห์ผ่านการตั้งคำถามและวิเคราะห์สถานการณ์",
      "steps": [
        "กิจกรรม/สิ่งที่ครูทำในขั้นกระตุ้นความสนใจ (ห้ามใส่เลขข้อหน้า)",
        "ตั้งคำถามกระตุ้นให้วิเคราะห์สถานการณ์ปัญหา",
        "ให้นักเรียนแยกแยะสิ่งที่รู้และไม่รู้"
      ],
      "questions": [
        "คำถามวิเคราะห์: ถ้า...จะเกิดอะไรขึ้น?",
        "คำถามแยกแยะ: องค์ประกอบของ...มีอะไรบ้าง?"
      ],
      "media": ["สื่อที่ใช้กระตุ้นความสนใจ"]
    },
    "exploration": {
      "duration": 18,
      "arceFocus": ["evidence", "analysis"],
      "arceDescription": "ส่งเสริมการใช้หลักฐานและวิเคราะห์ผ่านการสำรวจ ทดลอง เก็บข้อมูล",
      "steps": [
        "กิจกรรมสำรวจ/ทดลอง (ห้ามใส่เลขข้อหน้า)",
        "ให้นักเรียนรวบรวมข้อมูล/หลักฐานอย่างเป็นระบบ",
        "บันทึกผลการสังเกต/ทดลองลงในใบงาน",
        "วิเคราะห์ข้อมูลที่ได้ จำแนกประเภท เปรียบเทียบ",
        "สรุปผลการสำรวจเบื้องต้น"
      ],
      "materials": ["วัสดุอุปกรณ์ที่ใช้ในการสำรวจ/ทดลอง"],
      "media": ["สื่อที่ใช้ประกอบการสำรวจ"]
    },
    "explanation": {
      "duration": 10,
      "arceFocus": ["reasoning", "evidence"],
      "arceDescription": "ส่งเสริมการให้เหตุผลและใช้หลักฐานผ่านการอธิบายและอ้างอิงข้อมูล",
      "steps": [
        "นักเรียนนำเสนอข้อค้นพบจากการสำรวจ (ห้ามใส่เลขข้อหน้า)",
        "อธิบายเหตุผลที่ได้ผลลัพธ์เช่นนั้น",
        "อ้างอิงหลักฐานจากการสำรวจมาสนับสนุน",
        "ครูเชื่อมโยงกับหลักการ/ทฤษฎีทางวิชาการ"
      ],
      "keyConcepts": [
        "แนวคิดหลักที่ต้องเข้าใจ 1",
        "แนวคิดหลักที่ต้องเข้าใจ 2"
      ]
    },
    "elaboration": {
      "duration": 10,
      "arceFocus": ["creativity", "reasoning"],
      "arceDescription": "ส่งเสริมความคิดสร้างสรรค์และการให้เหตุผลผ่านการประยุกต์ใช้ความรู้",
      "steps": [
        "ให้โจทย์สถานการณ์ใหม่ที่ต้องประยุกต์ใช้ความรู้ (ห้ามใส่เลขข้อหน้า)",
        "นักเรียนคิดวิธีแก้ปัญหาอย่างสร้างสรรค์",
        "เชื่อมโยงความรู้กับสถานการณ์ในชีวิตจริง",
        "นำเสนอแนวคิดใหม่และให้เหตุผลสนับสนุน"
      ],
      "hotsIntegration": "กิจกรรมนี้ส่งเสริม Creativity ผ่านการคิดวิธีใหม่ และ Reasoning ผ่านการให้เหตุผลสนับสนุน",
      "media": ["สื่อประกอบการขยายความรู้"]
    },
    "evaluation": {
      "duration": 5,
      "arceFocus": ["analysis", "reasoning", "creativity", "evidence"],
      "arceDescription": "ประเมินครบ 4 มิติ A.R.C.E. ตามเกณฑ์ที่กำหนด",
      "steps": [
        "ทำแบบทดสอบ HOTS ที่ครอบคลุม A.R.C.E. (ห้ามใส่เลขข้อหน้า)",
        "สะท้อนคิดว่าได้เรียนรู้อะไร และจะนำไปใช้อย่างไร",
        "ประเมินตนเองตามเกณฑ์ A.R.C.E.",
        "รับ feedback จากครูและเพื่อน"
      ],
      "methods": [
        "แบบทดสอบ HOTS ครบ 4 ด้าน A.R.C.E.",
        "การสะท้อนคิด (Reflection)",
        "การประเมินตนเองและเพื่อน"
      ]
    }
  },
  "media": {
    "learningMaterials": [
      "สื่อการเรียนรู้เกี่ยวกับ...",
      "ใบงาน/ใบความรู้...",
      "สื่อนำเสนอ PowerPoint...",
      "วิดีโอการสอน...",
      "อุปกรณ์/เครื่องมือ..."
    ],
    "learningSources": [
      "เว็บไซต์/แหล่งข้อมูลออนไลน์...",
      "หนังสือ/ตำรา...",
      "บทความวิชาการ...",
      "ห้องปฏิบัติการ/สถานที่...",
      "ผู้เชี่ยวชาญ/วิทยากร..."
    ]
  },
  "postTeachingRecord": {
    "results": "",
    "innovations": "",
    "problems": "",
    "suggestions": "",
    "signatures": {
      "teacher": "${teacherName || ''}",
      "teacherPosition": "ครู วิทยฐานะครู...",
      "headOfDepartment": "",
      "viceDirector": "",
      "director": ""
    }
  },
  "worksheets": [
    {
      "number": 1,
      "title": "ชื่อใบงาน (ห้ามใส่ 'ใบงานที่ 1:' นำหน้า)",
      "phase": "exploration",
      "phaseLabel": "ขั้นสำรวจ (Exploration)",
      "arceFocus": ["evidence", "analysis"],
      "arceDescription": "ใบงานนี้ส่งเสริม Evidence ผ่านการรวบรวมข้อมูล และ Analysis ผ่านการวิเคราะห์สิ่งที่สังเกต",
      "objective": "วัตถุประสงค์ของใบงานที่สอดคล้องกับกิจกรรมขั้นสำรวจ + A.R.C.E.",
      "instructions": "คำชี้แจง/วิธีทำ",
      "questions": [
        "คำถาม/กิจกรรมที่ส่งเสริม Evidence: ให้บันทึกข้อมูล/หลักฐานที่พบ",
        "คำถาม/กิจกรรมที่ส่งเสริม Analysis: ให้วิเคราะห์/จำแนก/เปรียบเทียบข้อมูล"
      ]
    },
    {
      "number": 2,
      "title": "ชื่อใบงาน (ห้ามใส่ 'ใบงานที่ 2:' นำหน้า)",
      "phase": "elaboration",
      "phaseLabel": "ขั้นขยายความ (Elaboration)",
      "arceFocus": ["creativity", "reasoning"],
      "arceDescription": "ใบงานนี้ส่งเสริม Creativity ผ่านการออกแบบวิธีแก้ปัญหาใหม่ และ Reasoning ผ่านการให้เหตุผลสนับสนุน",
      "objective": "วัตถุประสงค์ของใบงานที่สอดคล้องกับกิจกรรมขั้นขยายความ + A.R.C.E.",
      "instructions": "คำชี้แจง/วิธีทำ",
      "questions": [
        "คำถาม/กิจกรรมที่ส่งเสริม Creativity: ให้ออกแบบ/สร้างสรรค์วิธีการใหม่",
        "คำถาม/กิจกรรมที่ส่งเสริม Reasoning: ให้อธิบายเหตุผลที่เลือกวิธีนี้"
      ]
    }
  ],
  "knowledgeSheets": [
    {
      "number": 1,
      "title": "ชื่อใบความรู้ (ห้ามใส่ 'ใบความรู้ที่ 1:' นำหน้า)",
      "phase": "explanation",
      "phaseLabel": "ขั้นอธิบาย (Explanation)",
      "arceFocus": ["reasoning", "evidence"],
      "arceDescription": "ใบความรู้นี้ส่งเสริม Reasoning ผ่านการอธิบายหลักการ และ Evidence ผ่านการอ้างอิงข้อมูลทางวิชาการ",
      "content": "เนื้อหาสาระความรู้ที่อธิบายหลักการ ทฤษฎี พร้อมตัวอย่างและหลักฐานอ้างอิง (อย่างน้อย 200 คำ)"
    }
  ],
  "essentialContent": "สาระสำคัญ: ดึงมาจากสาระสำคัญของหน่วย แล้วปรับให้เฉพาะแผนนี้"
}

⚠️ ข้อกำหนดสำคัญเพิ่มเติม:
1. worksheets แต่ละใบต้องระบุ phase ที่ใช้ (exploration, elaboration, evaluation) - สำคัญ!
2. knowledgeSheets แต่ละใบต้องระบุ phase ที่ใช้ (explanation) - สำคัญ!
3. essentialContent ต้องดึงมาจาก unitEssentialContent แล้วปรับให้เฉพาะเจาะแผนนี้
4. ห้ามใส่ "ใบงานที่ 1:", "ใบความรู้ที่ 1:" นำหน้าชื่อ - เพราะมีเลขลำดับแสดงอยู่แล้ว

🎯 ข้อกำหนดสำคัญเรื่องการวิเคราะห์ตามบริบท:
5. desirableTraits.selected - ต้องวิเคราะห์จริงว่ากิจกรรมในแผนส่งเสริมคุณลักษณะใดบ้าง เลือก 2-4 ข้อที่เหมาะสมที่สุด
6. desirableTraits.description - ต้องอธิบายละเอียดว่ากิจกรรมส่งเสริมคุณลักษณะที่เลือกอย่างไร เชื่อมโยงกับเนื้อหาโดยเฉพาะ
7. competencies.selected - ต้องวิเคราะห์จริงว่ากิจกรรมส่งเสริมสมรรถนะใดบ้าง เลือก 2-4 ข้อที่เหมาะสมที่สุด
8. competencies.descriptions - สำหรับแต่ละสมรรถนะที่เลือก ต้องอธิบายว่าส่งเสริมอย่างไร เชื่อมโยงกับกิจกรรมจริง
9. integration.crossSubjects - ถ้าเนื้อหาสามารถบูรณาการกับสาระอื่นได้ ให้ระบุพร้อมอธิบายการเชื่อมโยง`

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบแผนการจัดการเรียนรู้ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551 ของไทย 
มีความเชี่ยวชาญในการออกแบบกิจกรรมตามรูปแบบ 5E และการประเมินทักษะการคิดขั้นสูง (HOTS) ด้วยเกณฑ์ A.R.C.E.
เข้าใจการบูรณาการหลักสูตรโรงเรียนมาตรฐานสากลและปรัชญาของเศรษฐกิจพอเพียง
สร้างแผนที่ละเอียด มีคุณภาพ ใช้งานได้จริง เหมาะสำหรับการขอเลื่อนวิทยฐานะครูชำนาญการพิเศษ

🧠 สำคัญมาก - การวิเคราะห์ตามบริบท:
- คุณลักษณะอันพึงประสงค์ต้องวิเคราะห์จากกิจกรรมจริง ไม่ใช่ใส่แบบสุ่ม
- สมรรถนะสำคัญต้องวิเคราะห์จากกิจกรรมจริง พร้อมอธิบายการส่งเสริมอย่างเฉพาะเจาะจง
- การบูรณาการต้องดูจากเนื้อหาว่าเชื่อมโยงกับสาระอื่นได้อย่างไร

ตอบเป็นภาษาไทยและ JSON เท่านั้น ห้ามใช้ markdown wrapper`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })

      const responseText = completion.choices[0].message.content

      let result
      try {
        let cleanedText = responseText.trim()
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        result = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse AI response:', responseText)
        return res.status(500).send({
          error: 'Failed to parse AI response',
          rawResponse: responseText.substring(0, 1000)
        })
      }

      // Log usage
      await db.collection('aiUsageLogs').add({
        teacherId,
        feature: 'generateLessonPlan',
        courseId,
        topic,
        model,
        tokensUsed: completion.usage?.total_tokens || 0,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      })

      // Save lesson plan to Firestore with complete unit context
      const lessonPlanRef = await db.collection('lessonPlans').add({
        teacherId,
        courseId,
        courseCode: courseCode || '',
        courseName: courseName || '',
        // Unit info
        unitNumber: unitNumber || 1,
        unitName: unitName || '',
        unitTotalPeriods: unitTotalPeriods || unitTotalHours || 4,
        unitEssentialContent: unitEssentialContent || '',
        unitLOs: unitLOs || [],
        totalPlansInUnit: totalPlansInUnit || 2,
        // Plan info
        planNumber: planNumber || 1,
        topic,
        periods: actualPeriods,
        duration: actualDuration,
        targetLOs: effectiveLOs || [],
        arceFocus: effectiveArce || [],
        // General
        gradeLevel: gradeLevel || 'ม.4',
        semester: semester || 1,
        academicYear: academicYear || 2568,
        teachingMethod: teachingMethod || '5E',
        content: result,
        status: 'draft',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      return res.status(200).send({
        success: true,
        planId: lessonPlanRef.id,
        data: result
      })

    } catch (error) {
      console.error('❌ Error generating lesson plan:', error)
      return res.status(500).send({
        error: 'Failed to generate lesson plan',
        message: error.message
      })
    }
  })
})

/**
 * ==========================================
 * WORKSHEET & KNOWLEDGE SHEET GENERATORS
 * สร้างใบงานและใบความรู้แยกต่างหากเพื่อความลึกซึ้ง
 * ==========================================
 */

/**
 * Generate Worksheet - สร้างใบงานจากการวิเคราะห์แผนการสอน
 * เป็นโจทย์วัดผลสัมฤทธิ์ว่านักเรียนเรียนรู้จากกิจกรรมได้หรือไม่
 * 🔐 SECURED: Teacher/Admin only
 */
exports.generateWorksheet = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 120,
  memory: '512MB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      // 🔐 RBAC: Verify teacher/admin role
      const caller = await verifyTeacherRole(req, res)
      if (!caller) return // Response already sent

      const {
        teacherId,
        lessonPlanId,
        // ข้อมูลจากแผน
        courseName,
        courseCode,
        gradeLevel,
        topic,
        unitName,
        unitNumber,
        planNumber,
        // Full lesson plan สำหรับวิเคราะห์
        fullLessonPlan,
        // ภาระงานที่เลือก
        task,
        taskIndex,
        // ขั้น 5E ที่ใช้
        phase,
        phaseActivity,
        // A.R.C.E. ที่เน้น
        arceFocus,
        arceDescription,
        // ข้อมูลเพิ่มเติม
        objectives,
        essentialContent,
        learningContent,
        standard,
        indicators,
        duration,
        // กิจกรรม 5E ทั้งหมด
        activities5E,
        // ใบความรู้ที่เชื่อมโยง (ถ้ามี)
        knowledgeSheet
      } = req.body

      if (!topic) {
        return res.status(400).send({
          error: 'Missing required: topic'
        })
      }

      if (!openai) {
        return res.status(500).send({ error: 'OpenAI not configured' })
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
      
      const arceMap = {
        'analysis': { name: 'การวิเคราะห์', icon: '🔍', verbs: 'วิเคราะห์ จำแนก เปรียบเทียบ แยกแยะ ตรวจสอบ' },
        'reasoning': { name: 'การให้เหตุผล', icon: '🧠', verbs: 'อธิบาย สรุป เชื่อมโยง ให้เหตุผล พิสูจน์' },
        'creativity': { name: 'ความคิดสร้างสรรค์', icon: '💡', verbs: 'ออกแบบ สร้างสรรค์ คิดค้น ประดิษฐ์ นำเสนอแนวคิดใหม่' },
        'evidence': { name: 'การใช้หลักฐาน', icon: '📚', verbs: 'รวบรวม บันทึก อ้างอิง ยืนยัน พิสูจน์ด้วยหลักฐาน' }
      }

      const phaseMap = {
        'engagement': { name: 'กระตุ้นความสนใจ', focus: 'ตรวจสอบความรู้เดิมและความสนใจ' },
        'exploration': { name: 'สำรวจ', focus: 'วัดทักษะการสืบเสาะและรวบรวมข้อมูล' },
        'explanation': { name: 'อธิบาย', focus: 'วัดความเข้าใจและทักษะการอธิบาย' },
        'elaboration': { name: 'ขยายความ', focus: 'วัดการประยุกต์ใช้ความรู้ในสถานการณ์ใหม่' },
        'evaluation': { name: 'ประเมินผล', focus: 'ประเมินผลสัมฤทธิ์การเรียนรู้ทั้งหมด' }
      }

      // แปลง arceFocus เป็น array
      const arceFocusArr = Array.isArray(arceFocus) ? arceFocus : (arceFocus ? [arceFocus] : ['reasoning'])
      const arceInfo = arceFocusArr.map(a => arceMap[a]).filter(Boolean)
      
      // สร้าง context จาก activities5E
      let activities5EContext = ''
      if (activities5E) {
        const phases = ['engagement', 'exploration', 'explanation', 'elaboration', 'evaluation']
        phases.forEach(p => {
          if (activities5E[p]) {
            const act = activities5E[p]
            activities5EContext += `\n${phaseMap[p]?.name || p}: ${act.activity || act.description || ''}`
            if (act.task) activities5EContext += ` (ภาระงาน: ${act.task})`
          }
        })
      }

      // สร้าง objectives context
      let objectivesText = ''
      if (objectives) {
        if (objectives.knowledge) {
          objectivesText += `\nด้านความรู้ (K):\n${objectives.knowledge.map((o, i) => `  ${i + 1}. ${o}`).join('\n')}`
        }
        if (objectives.process) {
          objectivesText += `\nด้านทักษะ (P):\n${objectives.process.map((o, i) => `  ${i + 1}. ${o}`).join('\n')}`
        }
        if (objectives.attitude) {
          objectivesText += `\nด้านเจตคติ (A):\n${objectives.attitude.map((o, i) => `  ${i + 1}. ${o}`).join('\n')}`
        }
      }

      // สร้าง knowledge sheet context ถ้ามี
      let knowledgeSheetContext = ''
      if (knowledgeSheet) {
        knowledgeSheetContext = `
📖 ใบความรู้ที่นักเรียนได้ศึกษา:
- หัวข้อ: ${knowledgeSheet.metadata?.title || topic}
- เนื้อหาสำคัญ: ${JSON.stringify(knowledgeSheet.contentByBloom || knowledgeSheet.sections || {}, null, 2).slice(0, 1500)}...
`
      }

      const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบเครื่องมือวัดและประเมินผล

## 🎯 งานของคุณ
**วิเคราะห์แผนการสอน** แล้วสร้าง **ใบงานวัดผลสัมฤทธิ์** ที่จะใช้ตรวจสอบว่า:
1. นักเรียนได้เรียนรู้จากกิจกรรม 5E ตามที่กำหนดหรือไม่
2. นักเรียนบรรลุจุดประสงค์การเรียนรู้หรือไม่
3. นักเรียนพัฒนาทักษะ A.R.C.E. หรือไม่

## 📚 ข้อมูลแผนการสอน

### ข้อมูลพื้นฐาน:
- รายวิชา: ${courseCode || ''} ${courseName || ''}
- ระดับชั้น: ${gradeLevel || 'ม.4'}
- หน่วยที่ ${unitNumber || 1}: ${unitName || ''}
- แผนที่ ${planNumber || 1}: ${topic}

### มาตรฐานและตัวชี้วัด:
${standard ? `มาตรฐาน: ${JSON.stringify(standard)}` : ''}
${indicators ? `ตัวชี้วัด: ${JSON.stringify(indicators)}` : ''}

### จุดประสงค์การเรียนรู้ (ที่ต้องวัด):
${objectivesText || 'ตาม LO ของแผน'}

### สาระสำคัญ:
${essentialContent || 'ตามหัวข้อที่กำหนด'}

### เนื้อหาการเรียนรู้:
${JSON.stringify(learningContent || [], null, 2).slice(0, 1000)}

### กิจกรรม 5E (ที่นักเรียนทำ - สำคัญมาก):
${activities5EContext || 'ไม่ระบุ'}

${fullLessonPlan ? `### แผนการสอนฉบับเต็ม:
${JSON.stringify(fullLessonPlan, null, 2).slice(0, 2000)}...` : ''}

${knowledgeSheetContext}

---

## ⚙️ ข้อกำหนดใบงาน

### ภาระงานที่ต้องวัด:
"${task || topic}"

### ขั้น 5E ที่ใบงานนี้ใช้: ${phaseMap[phase]?.name || phase || 'evaluation'}
- จุดเน้นการวัด: ${phaseMap[phase]?.focus || 'ประเมินผลสัมฤทธิ์'}
${phaseActivity ? `- กิจกรรมในขั้นนี้: ${phaseActivity}` : ''}

### A.R.C.E. ที่วัด: ${arceInfo.map(a => `${a.icon} ${a.name}`).join(', ') || 'Reasoning'}
${arceInfo.map(a => `- ${a.name}: ใช้คำกริยา ${a.verbs}`).join('\n')}

### เวลา: ${duration || 15} นาที

---

## 📝 หลักการออกแบบ

1. **วัดตามจุดประสงค์**: ทุกคำถามต้องเชื่อมโยงกับจุดประสงค์การเรียนรู้ที่กำหนด
2. **สะท้อนกิจกรรม**: คำถามต้องสัมพันธ์กับกิจกรรมที่นักเรียนทำ
3. **วัด A.R.C.E.**: ต้องมีคำถามที่วัดทักษะ ${arceInfo.map(a => a.name).join(' และ ')}
4. **หลากหลายระดับ Bloom's**: มีทั้งคำถามระดับล่าง (จำ/เข้าใจ) และระดับสูง (วิเคราะห์/ประเมิน/สร้างสรรค์)
5. **ให้ feedback ได้**: ต้องมีแนวคำตอบที่ชัดเจนเพื่อให้ AI ประเมินได้

---

ตอบเป็น JSON (ห้าม markdown wrapper):
{
  "title": "ชื่อใบงาน (สั้น กระชับ)",
  "purpose": "จุดประสงค์ของใบงานนี้ - วัดอะไร",
  "phase": "${phase}",
  "phaseLabel": "${phaseMap[phase]?.name || phase}",
  "arceFocus": ${JSON.stringify(arceFocus)},
  
  "alignmentAnalysis": {
    "objectivesCovered": ["จุดประสงค์ที่ 1 ที่ใบงานนี้วัด", "จุดประสงค์ที่ 2"],
    "activitiesConnected": ["กิจกรรมที่เกี่ยวข้อง 1", "กิจกรรมที่ 2"],
    "arceSkillsMeasured": {
      "analysis": "วัดการวิเคราะห์อย่างไร (ถ้าเน้น)",
      "reasoning": "วัดการให้เหตุผลอย่างไร (ถ้าเน้น)",
      "creativity": "วัดความคิดสร้างสรรค์อย่างไร (ถ้าเน้น)",
      "evidence": "วัดการใช้หลักฐานอย่างไร (ถ้าเน้น)"
    }
  },
  
  "duration": ${duration || 15},
  "instructions": "คำชี้แจงวิธีทำที่ละเอียดชัดเจน",
  
  "sections": [
    {
      "id": "section_1",
      "title": "ส่วนที่ 1: ตรวจสอบความเข้าใจ",
      "phase": "${phase || 'evaluation'}",
      "description": "อธิบายเป้าหมายของส่วนนี้",
      "type": "comprehension",
      "bloomLevel": 2,
      "arceFocus": "reasoning",
      "questions": [
        {
          "id": "q_1_1",
          "type": "open_ended",
          "arceFocus": "reasoning",
          "maxScore": 5,
          "prompt": "คำถาม (เชื่อมโยงกับกิจกรรมที่ทำ)",
          "context": "บริบทจากกิจกรรมที่นักเรียนทำ (ถ้ามี)",
          "hints": "คำแนะนำช่วยคิด",
          "expectedAnswer": "แนวคำตอบที่ดี (สำหรับ AI ประเมิน)",
          "scoringRubric": {
            "excellent": {"score": 5, "criteria": "เกณฑ์ระดับดีเยี่ยม"},
            "good": {"score": 3, "criteria": "เกณฑ์ระดับดี"},
            "developing": {"score": 1, "criteria": "เกณฑ์ระดับกำลังพัฒนา"}
          }
        },
        {
          "id": "q_1_2",
          "type": "open_ended",
          "arceFocus": "reasoning",
          "maxScore": 5,
          "prompt": "คำถามที่ 2...",
          "context": "",
          "hints": "คำแนะนำ",
          "expectedAnswer": "แนวคำตอบ"
        }
      ]
    },
    {
      "id": "section_2",
      "title": "ส่วนที่ 2: ประยุกต์ใช้และวิเคราะห์",
      "phase": "${phase || 'evaluation'}",
      "description": "อธิบายเป้าหมายของส่วนนี้",
      "type": "application",
      "bloomLevel": 4,
      "arceFocus": "analysis",
      "questions": [
        {
          "id": "q_2_1",
          "type": "open_ended",
          "arceFocus": "analysis",
          "maxScore": 5,
          "prompt": "คำถามวิเคราะห์...",
          "context": "สถานการณ์หรือข้อมูลที่ต้องวิเคราะห์",
          "hints": "คำแนะนำ",
          "expectedAnswer": "แนวคำตอบ"
        }
      ]
    },
    {
      "id": "section_3",
      "title": "ส่วนที่ 3: ประเมินและสร้างสรรค์",
      "phase": "${phase || 'evaluation'}",
      "description": "อธิบายเป้าหมายของส่วนนี้",
      "type": "higher_order",
      "bloomLevel": 5,
      "arceFocus": "creativity",
      "questions": [
        {
          "id": "q_3_1",
          "type": "open_ended",
          "arceFocus": "creativity",
          "maxScore": 5,
          "prompt": "คำถามสร้างสรรค์...",
          "context": "",
          "hints": "คำแนะนำ",
          "expectedAnswer": "แนวคำตอบ"
        }
      ]
    }
  ],
  
  "reflection": {
    "question": "คำถามสะท้อนคิดท้ายใบงาน - สิ่งที่ได้เรียนรู้จากกิจกรรม",
    "prompts": ["หัวข้อสะท้อนคิด 1", "หัวข้อ 2"],
    "connectionToActivity": "เชื่อมโยงกับกิจกรรมที่ทำอย่างไร"
  },
  
  "scoring": {
    "totalPoints": 20,
    "passingScore": 12,
    "criteria": [
      { "aspect": "ความเข้าใจเนื้อหา", "points": 6, "description": "เกณฑ์" },
      { "aspect": "ทักษะการวิเคราะห์/เหตุผล", "points": 8, "description": "เกณฑ์" },
      { "aspect": "การสร้างสรรค์/ประยุกต์ใช้", "points": 6, "description": "เกณฑ์" }
    ],
    "arceScoring": {
      "analysis": {"maxScore": 5, "weight": 0.25},
      "reasoning": {"maxScore": 5, "weight": 0.25},
      "creativity": {"maxScore": 5, "weight": 0.25},
      "evidence": {"maxScore": 5, "weight": 0.25}
    }
  },
  
  "teacherNotes": {
    "assessmentPurpose": "ใบงานนี้วัดว่านักเรียนได้เรียนรู้อะไรจากกิจกรรม",
    "commonMisconceptions": ["ความเข้าใจผิดที่พบบ่อย 1", "ความเข้าใจผิดที่ 2"],
    "feedbackGuidelines": "แนวทางการให้ feedback แก่นักเรียน",
    "remediationSuggestions": "ข้อเสนอแนะสำหรับนักเรียนที่ยังไม่บรรลุจุดประสงค์"
  }
}

## ⚠️ ข้อกำหนดสำคัญ:
1. **sections ต้องมี id** - รูปแบบ section_1, section_2, ...
2. **questions ต้องมี id** - รูปแบบ q_1_1, q_1_2, q_2_1, ...
3. **type ต้องเป็น**: open_ended, short_text, multiple_choice, multi_choice, table, rating_scale
4. **arceFocus ต้องเป็น**: analysis, reasoning, creativity, evidence
5. **maxScore ต้องเป็นตัวเลข** (ปกติ 5 ต่อข้อ)
6. **ห้ามมี markdown wrapper** เช่น \`\`\`json`

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: `คุณเป็นผู้เชี่ยวชาญด้านการวัดและประเมินผลการเรียนรู้

หลักการสำคัญ:
1. ใบงานไม่ใช่แค่แบบฝึกหัด แต่เป็นเครื่องมือ "วัดผลสัมฤทธิ์" 
2. ทุกคำถามต้องเชื่อมโยงกับ:
   - จุดประสงค์การเรียนรู้ที่ต้องการวัด
   - กิจกรรม 5E ที่นักเรียนทำ
   - ทักษะ A.R.C.E. ที่ต้องการพัฒนา
3. ต้องมีแนวคำตอบชัดเจนเพื่อให้ประเมินได้

ตอบเป็น JSON เท่านั้น ห้าม markdown wrapper`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })

      const responseText = completion.choices[0].message.content
      let result
      try {
        let cleanedText = responseText.trim()
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        result = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse worksheet:', responseText)
        return res.status(500).send({ error: 'Failed to parse AI response' })
      }

      return res.status(200).send({ success: true, worksheet: result })

    } catch (error) {
      console.error('❌ Error generating worksheet:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * ==========================================
 * AI CURRICULUM DESIGNER FUNCTIONS
 * Phase 1: Generate Course Structure
 * Phase 2: Generate Learning Units
 * ==========================================
 */

/**
 * Generate Course Structure - Phase 1
 * Analyzes course description and LOs to create curriculum structure
 */
exports.generateCourseStructure = functions.runWith({ 
  timeoutSeconds: 180,
  memory: '1GB',
  secrets: [openaiApiKey]
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { 
        courseId, courseCode, courseName, description, 
        learningOutcomes, subjectGroup, gradeLevel, settings,
        // ข้อมูลหลักสูตรแกนกลาง
        courseType, selectedStandards, keyCompetencies, desiredCharacteristics
      } = req.body

      if (!courseId || !courseName || !learningOutcomes?.length) {
        return res.status(400).send({ 
          error: 'Missing required: courseId, courseName, learningOutcomes' 
        })
      }

      if (!openai) {
        return res.status(500).send({ error: 'OpenAI not configured' })
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
      const losText = learningOutcomes.map(lo => `${lo.code}: ${lo.description}`).join('\n')
      const totalHours = settings?.totalHours || 40
      const hotsRatio = settings?.hotsRatio || 40
      
      // ข้อมูลหลักสูตรแกนกลาง
      const isBasicCourse = courseType === 'basic'
      const standardsText = selectedStandards?.length > 0 
        ? selectedStandards.join(', ') 
        : 'ไม่ระบุ'
      
      // แปลง keyCompetencies เป็นข้อความ
      const competencyNames = {
        communication: 'ความสามารถในการสื่อสาร',
        thinking: 'ความสามารถในการคิด',
        problemSolving: 'ความสามารถในการแก้ปัญหา',
        lifeSkills: 'ความสามารถในการใช้ทักษะชีวิต',
        technology: 'ความสามารถในการใช้เทคโนโลยี'
      }
      const competenciesText = keyCompetencies?.length > 0 
        ? keyCompetencies.map(k => competencyNames[k] || k).join(', ')
        : 'ทั้ง 5 สมรรถนะ'
      
      // แปลง desiredCharacteristics เป็นข้อความ
      const characteristicNames = {
        patriotism: 'รักชาติ ศาสน์ กษัตริย์',
        honesty: 'ซื่อสัตย์สุจริต',
        discipline: 'มีวินัย',
        curiosity: 'ใฝ่เรียนรู้',
        sufficiency: 'อยู่อย่างพอเพียง',
        dedication: 'มุ่งมั่นในการทำงาน',
        thaiIdentity: 'รักความเป็นไทย',
        publicMind: 'มีจิตสาธารณะ'
      }
      const characteristicsText = desiredCharacteristics?.length > 0
        ? desiredCharacteristics.map(c => characteristicNames[c] || c).join(', ')
        : 'ทั้ง 8 คุณลักษณะ'
      
      // คำนวณจำนวนหน่วยที่เหมาะสม (4-8 แผนต่อหน่วย)
      // ถ้า 40 คาบ → ต้องมี 5-10 หน่วย (เพื่อให้แต่ละหน่วยมี 4-8 แผน)
      const minUnits = Math.max(5, Math.ceil(totalHours / 8)) // ถ้า 40 คาบ = min 5 หน่วย
      const maxUnits = Math.min(12, Math.ceil(totalHours / 4)) // ถ้า 40 คาบ = max 10 หน่วย
      const recommendedUnits = Math.ceil((minUnits + maxUnits) / 2) // แนะนำกลางๆ

      const prompt = `วิเคราะห์และออกแบบโครงสร้างรายวิชาต่อไปนี้:

📚 ข้อมูลรายวิชา:
- รหัสวิชา: ${courseCode}
- ชื่อวิชา: ${courseName}
- กลุ่มสาระ: ${subjectGroup || 'วิทยาศาสตร์และเทคโนโลยี'}
- ระดับชั้น: ${gradeLevel || 'ม.4'}
- ประเภทรายวิชา: ${isBasicCourse ? '📘 รายวิชาพื้นฐาน (ต้องเคร่งครัดตามหลักสูตรแกนกลาง)' : '📗 รายวิชาเพิ่มเติม (ยืดหยุ่นได้)'}
- คำอธิบายรายวิชา: ${description || 'ไม่มี'}

📋 มาตรฐานและตัวชี้วัดที่ครูกำหนด (ห้ามเปลี่ยนแปลง!):
${selectedStandards?.length > 0 
  ? selectedStandards.map(s => `- ${s}`).join('\n')
  : '⚠️ ครูยังไม่ได้กำหนดมาตรฐาน/ตัวชี้วัด - ให้แจ้งว่าครูต้องกำหนดเอง'}

📋 ข้อมูลตามหลักสูตรแกนกลาง พ.ศ. 2551 (ฉบับปรับปรุง 2560):
- สมรรถนะสำคัญของผู้เรียน: ${competenciesText}
- คุณลักษณะอันพึงประสงค์: ${characteristicsText}

🎯 Learning Outcomes (${learningOutcomes.length} ตัว):
${losText}

⚙️ การตั้งค่า:
- เวลาเรียนรวม: ${totalHours} คาบ (1 คาบ = 50 นาที = 1 ชั่วโมง)
- สัดส่วน HOTS Assessment: ${hotsRatio}%

⚠️⚠️⚠️ ข้อกำหนดเรื่องมาตรฐานและตัวชี้วัด - สำคัญมาก! ⚠️⚠️⚠️
${selectedStandards?.length > 0 
  ? `✅ ครูได้กำหนดมาตรฐาน/ตัวชี้วัดไว้แล้ว: ใช้ข้อมูลที่ครูกำหนดในส่วน "standards" โดยตรง ห้ามสร้างใหม่!`
  : `❌ ครูยังไม่ได้กำหนดมาตรฐาน/ตัวชี้วัด: 
   - ให้ใส่ standards เป็น array ว่าง []
   - เพิ่ม field "standardsWarning": "กรุณาให้ครูกำหนดมาตรฐานและตัวชี้วัดตามหลักสูตรแกนกลางด้วยตนเอง เนื่องจากต้องตรงกับเอกสารราชการ"
   - ห้ามสร้างมาตรฐาน/ตัวชี้วัดขึ้นมาเอง เพราะอาจไม่ตรงกับหลักสูตรแกนกลางจริง`}

⚠️ กฎสำคัญมาก - อ่านให้ครบ!
1. 1 แผน = 1 คาบ = 50 นาที เสมอ
2. ${totalHours} คาบ → ต้องมี ${totalHours} แผนทั้งหมด
3. ⭐ จำนวนหน่วย: ต้องมี ${minUnits}-${maxUnits} หน่วย (แนะนำ ${recommendedUnits} หน่วย)
4. ⭐ แต่ละหน่วย: ต้องมี 4-8 แผนเท่านั้น (ไม่เกิน 8 แผน!)
   - ถ้าหน่วยมีเนื้อหามาก ให้แบ่งเป็น 2 หน่วยย่อย
   - เช่น "หน่วยที่ 1: พื้นฐาน..." และ "หน่วยที่ 2: การประยุกต์..."

📋 งานของคุณ:
1. วิเคราะห์คำอธิบายรายวิชาและความสัมพันธ์ระหว่าง LO
2. ⭐ จัดกลุ่ม LO เป็นหน่วยการเรียนรู้ ${minUnits}-${maxUnits} หน่วย (แต่ละหน่วย 4-8 แผน)
3. ⚠️ ใช้มาตรฐาน/ตัวชี้วัดที่ครูกำหนดเท่านั้น (ถ้าไม่มี ให้เป็น array ว่างและเตือนครู)
4. วางกลยุทธ์ A.R.C.E. สำหรับรายวิชานี้
5. จัดสรรคาบให้แต่ละหน่วย (รวม = ${totalHours} คาบ, แต่ละหน่วย 4-8 คาบ)
6. สร้าง plansPreview ให้ครบตามจำนวนคาบของหน่วย

ตอบเป็น JSON format นี้เท่านั้น (ห้ามใส่ markdown wrapper):
{
  "totalUnits": ${recommendedUnits},
  "totalPlans": ${totalHours},
  "totalPeriods": ${totalHours},
  ${selectedStandards?.length > 0 
    ? `"standards": [/* ใช้มาตรฐาน/ตัวชี้วัดที่ครูกำหนดข้างต้น จัดรูปแบบเป็น: {"code": "ว X.X", "description": "...", "indicators": ["ว X.X ม.4/1", ...]} */]`
    : `"standards": [],
  "standardsWarning": "⚠️ กรุณาให้ครูกำหนดมาตรฐานและตัวชี้วัดตามหลักสูตรแกนกลาง พ.ศ. 2551 ด้วยตนเอง เนื่องจากข้อมูลต้องถูกต้องตรงตามเอกสารราชการ ระบบไม่สามารถสร้างให้อัตโนมัติได้"`},
  "arceStrategy": [
    {
      "dimension": "analysis",
      "icon": "🔍",
      "name": "การวิเคราะห์",
      "weight": 25,
      "focusAreas": "อธิบายบริบทเฉพาะของวิชาที่พัฒนาทักษะวิเคราะห์",
      "sampleQuestions": ["คำถามตัวอย่างที่ใช้พัฒนาทักษะวิเคราะห์ในวิชานี้ 1", "คำถามตัวอย่าง 2"],
      "activities": ["กิจกรรมที่ส่งเสริมการวิเคราะห์ 1", "กิจกรรม 2"],
      "unitsEmphasis": ["หน่วยที่เน้นมิตินี้"]
    },
    {
      "dimension": "reasoning",
      "icon": "🧠",
      "name": "การให้เหตุผล",
      "weight": 25,
      "focusAreas": "อธิบายบริบทเฉพาะของวิชาที่พัฒนาทักษะเหตุผล",
      "sampleQuestions": ["คำถามตัวอย่างที่ใช้พัฒนาทักษะเหตุผลในวิชานี้ 1", "คำถามตัวอย่าง 2"],
      "activities": ["กิจกรรมที่ส่งเสริมการให้เหตุผล 1", "กิจกรรม 2"],
      "unitsEmphasis": ["หน่วยที่เน้นมิตินี้"]
    },
    {
      "dimension": "creativity",
      "icon": "💡",
      "name": "ความคิดสร้างสรรค์",
      "weight": 25,
      "focusAreas": "อธิบายบริบทเฉพาะของวิชาที่พัฒนาทักษะสร้างสรรค์",
      "sampleQuestions": ["คำถามตัวอย่างที่ใช้พัฒนาทักษะสร้างสรรค์ในวิชานี้ 1", "คำถามตัวอย่าง 2"],
      "activities": ["กิจกรรมที่ส่งเสริมความคิดสร้างสรรค์ 1", "กิจกรรม 2"],
      "unitsEmphasis": ["หน่วยที่เน้นมิตินี้"]
    },
    {
      "dimension": "evidence",
      "icon": "📚",
      "name": "การใช้หลักฐาน",
      "weight": 25,
      "focusAreas": "อธิบายบริบทเฉพาะของวิชาที่พัฒนาทักษะใช้หลักฐาน",
      "sampleQuestions": ["คำถามตัวอย่างที่ใช้พัฒนาทักษะใช้หลักฐานในวิชานี้ 1", "คำถามตัวอย่าง 2"],
      "activities": ["กิจกรรมที่ส่งเสริมการใช้หลักฐาน 1", "กิจกรรม 2"],
      "unitsEmphasis": ["หน่วยที่เน้นมิตินี้"]
    }
  ],
  "unitsPreview": [
    {
      "name": "ชื่อหน่วย (ห้ามใส่ 'หน่วยที่ 1:' นำหน้า เพราะมีเลขลำดับแสดงอยู่แล้ว)",
      "periods": 6,
      "plans": 6,
      "los": ["LO1", "LO2"],
      "arceFocus": ["analysis", "reasoning"],
      "arceDistribution": {
        "analysis": "กิจกรรมวิเคราะห์ที่ใช้ในหน่วยนี้",
        "reasoning": "กิจกรรมให้เหตุผลที่ใช้ในหน่วยนี้",
        "creativity": "กิจกรรมสร้างสรรค์ที่ใช้ในหน่วยนี้",
        "evidence": "กิจกรรมใช้หลักฐานที่ใช้ในหน่วยนี้"
      },
      "plansPreview": [
        { 
          "topic": "ชื่อหัวข้อเนื้อหาแผนแรก", 
          "periods": 1, 
          "los": ["LO1"], 
          "arceFocus": "analysis",
          "uniqueKeyTopics": ["หัวข้อเฉพาะของแผนนี้ที่ไม่ซ้ำกับแผนอื่น 1", "หัวข้อเฉพาะ 2"]
        },
        { 
          "topic": "ชื่อหัวข้อเนื้อหาแผนที่สอง", 
          "periods": 1, 
          "los": ["LO1", "LO2"], 
          "arceFocus": "reasoning",
          "uniqueKeyTopics": ["หัวข้อเฉพาะของแผนนี้ที่ไม่ซ้ำกับแผนอื่น"]
        }
      ],
      "essentialContent": "สาระสำคัญของหน่วยนี้",
      "knowledgeScope": {
        "mustCover": ["เนื้อหาหลักที่ต้องสอนในหน่วยนี้เท่านั้น ห้ามซ้ำกับหน่วยอื่น"],
        "excludes": ["เนื้อหาที่ไม่รวมในหน่วยนี้ (สอนในหน่วยอื่น)"],
        "prerequisites": ["ความรู้ที่นักเรียนต้องมีก่อนเข้าเรียนหน่วยนี้"],
        "leadsTo": ["ความรู้จากหน่วยนี้จะนำไปใช้ในหน่วยไหน"]
      }
    }
  ],
  "assessmentStrategy": {
    "midterm": { "weight": 30, "type": "ข้อสอบ + ชิ้นงาน" },
    "final": { "weight": 30, "type": "ข้อสอบ + โปรเจค" },
    "continuous": { "weight": 40, "type": "ใบงาน + สังเกตพฤติกรรม + แบบฝึกหัด" }
  },
  "teachingStrategy": "อธิบายภาพรวมกลยุทธ์การสอนทั้งรายวิชา"
}

⚠️ สำคัญมาก - เงื่อนไขที่ต้องทำตาม:
1. ต้องมี ${minUnits}-${maxUnits} หน่วย (แนะนำ ${recommendedUnits} หน่วย)
2. แต่ละหน่วย periods: 4-8 เท่านั้น (ถ้าเนื้อหามาก ให้แบ่งหน่วย)
3. ผลรวม periods ของทุกหน่วย = ${totalHours} คาบ
4. plansPreview ต้องมีจำนวน = periods ของหน่วยนั้น`

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบหลักสูตรระดับพรีเมียม (Premium Curriculum Designer) เชี่ยวชาญ:
1. หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551 (ฉบับปรับปรุง 2560) อย่างลึกซึ้ง
2. มาตรฐานการเรียนรู้และตัวชี้วัดของทุกกลุ่มสาระ
3. สมรรถนะสำคัญ 5 ด้าน: สื่อสาร คิด แก้ปัญหา ทักษะชีวิต เทคโนโลยี
4. คุณลักษณะอันพึงประสงค์ 8 ประการ
5. การออกแบบย้อนกลับ (Backward Design)
6. การประเมินทักษะการคิดขั้นสูง A.R.C.E. (Analysis, Reasoning, Creativity, Evidence)
7. การจัดกลุ่ม Learning Outcomes อย่างมีประสิทธิภาพ
8. การกระจายน้ำหนักการประเมินตามมาตรฐาน

⭐ กฎสำคัญ: แต่ละหน่วยต้องมี 4-8 แผนเท่านั้น (ไม่เกิน 8 แผน!)
- ถ้าเนื้อหามาก ให้แบ่งเป็นหน่วยย่อย เช่น "หน่วยที่ 1: พื้นฐาน..." และ "หน่วยที่ 2: การประยุกต์..."
- สร้างหน่วยมากขึ้น ดีกว่าหน่วยน้อยแต่แผนเยอะ

🎯 หลักการสร้างโครงสร้างแบบ Premium Quality:

📐 กฎ "Content Mapping Matrix" (ป้องกันเนื้อหาซ้ำ 100%):
1. ก่อนออกแบบหน่วยใดๆ ให้สร้าง "แผนที่เนื้อหา" ในใจ โดยแบ่งเนื้อหาทั้งหมดเป็นก้อนๆ แยกกัน
2. แต่ละหน่วยต้องมี "พื้นที่เนื้อหาเฉพาะ" (Exclusive Content Territory) ที่ไม่ทับซ้อนกับหน่วยอื่น
3. ใช้หลัก MECE (Mutually Exclusive, Collectively Exhaustive):
   - ME: ทุกหน่วยต้องไม่มีเนื้อหาซ้ำกัน
   - CE: รวมทุกหน่วยต้องครอบคลุมเนื้อหาทั้งหมด

📊 โครงสร้างการแบ่งหน่วยแบบ Premium:
- หน่วยที่ 1-2: พื้นฐาน/นิยาม/ทฤษฎีหลัก (Foundation)
- หน่วยกลาง: การวิเคราะห์/การประยุกต์เฉพาะด้าน (Specialization)
- หน่วยท้าย: การบูรณาการ/สรุป/โปรเจค (Integration)

🔒 กฎเข้มงวดป้องกันเนื้อหาซ้ำ:
1. แต่ละหน่วยต้องมี knowledgeScope.mustCover ที่เป็น "เนื้อหาเฉพาะ" ไม่ใช่ "เนื้อหาทั่วไป"
   - ❌ ไม่ดี: "การเรียนรู้พื้นฐาน", "แนวคิดสำคัญ"
   - ✅ ดี: "กฎของนิวตัน 3 ข้อ", "สมการการเคลื่อนที่"
2. แต่ละแผนต้องมี uniqueKeyTopics ที่ระบุ "เนื้อหาเฉพาะแผนนี้เท่านั้น"
   - ❌ ไม่ดี: "ทบทวนเนื้อหา", "ต่อยอดความรู้"
   - ✅ ดี: "การคำนวณแรงโน้มถ่วง", "กราฟความเร่ง-เวลา"
3. ถ้าสองหน่วย/แผนเกี่ยวข้องกัน ต้องระบุความสัมพันธ์ใน prerequisites และ leadsTo

📌 สำหรับรายวิชาพื้นฐาน: ต้องยึดมาตรฐาน/ตัวชี้วัดตามหลักสูตรแกนกลางอย่างเคร่งครัด
📌 สำหรับรายวิชาเพิ่มเติม: สามารถออกแบบเนื้อหาและตัวชี้วัดได้ตามความเหมาะสม

ตอบเป็นภาษาไทยและ JSON format เท่านั้น ห้ามใช้ markdown wrapper`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })

      const responseText = completion.choices[0].message.content
      let result
      try {
        let cleanedText = responseText.trim()
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        result = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse course structure:', responseText)
        return res.status(500).send({ error: 'Failed to parse AI response' })
      }

      return res.status(200).send({ success: true, structure: result })

    } catch (error) {
      console.error('❌ Error generating course structure:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Generate Learning Unit - Phase 2
 * Creates detailed unit structure with lesson plans outline
 */
exports.generateLearningUnit = functions.runWith({ 
  timeoutSeconds: 180,
  memory: '1GB',
  secrets: [openaiApiKey]
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { 
        courseId, courseCode, courseName, courseDescription,
        allLearningOutcomes, unitIndex, unitName, unitHours, unitPeriods,
        planCount, targetLOs, courseStructure, settings,
        // ข้อมูลหลักสูตรแกนกลาง
        courseType, selectedStandards, keyCompetencies, desiredCharacteristics
      } = req.body

      const periods = unitPeriods || unitHours || 4 // 1 คาบ = 50 นาที
      // สำคัญ: 1 แผน = 1 คาบ (50 นาที) เสมอ
      const numberOfPlans = periods
      
      // ข้อมูลหลักสูตรแกนกลาง
      const isBasicCourse = courseType === 'basic'

      if (!courseId || !unitName || !targetLOs?.length) {
        return res.status(400).send({ 
          error: 'Missing required fields' 
        })
      }

      if (!openai) {
        return res.status(500).send({ error: 'OpenAI not configured' })
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
      
      // Get relevant LO descriptions
      const relevantLOs = allLearningOutcomes
        .filter(lo => targetLOs.includes(lo.code))
        .map(lo => `${lo.code}: ${lo.description}`)
        .join('\n')

      const prompt = `ออกแบบรายละเอียดหน่วยการเรียนรู้:

📚 ข้อมูลรายวิชา:
- รหัส: ${courseCode} ${courseName}
- คำอธิบาย: ${courseDescription || 'ไม่มี'}
- ประเภทรายวิชา: ${isBasicCourse ? '📘 รายวิชาพื้นฐาน (ต้องเคร่งครัดตามหลักสูตรแกนกลาง)' : '📗 รายวิชาเพิ่มเติม'}

📋 ข้อมูลตามหลักสูตรแกนกลาง:
${selectedStandards?.length > 0 ? `- มาตรฐานที่เกี่ยวข้อง: ${selectedStandards.join(', ')}` : ''}
${keyCompetencies?.length > 0 ? `- สมรรถนะสำคัญ: ${keyCompetencies.join(', ')}` : ''}
${desiredCharacteristics?.length > 0 ? `- คุณลักษณะอันพึงประสงค์: ${desiredCharacteristics.join(', ')}` : ''}

📦 หน่วยการเรียนรู้ที่ ${unitIndex + 1}: ${unitName}
- จำนวนคาบ: ${periods} คาบ (1 คาบ = 50 นาที)
- จำนวนแผนการสอน: ${numberOfPlans} แผน (สำคัญ: 1 แผน = 1 คาบ = 50 นาที)
- Learning Outcomes ที่เกี่ยวข้อง:
${relevantLOs}

🚫 เนื้อหาจากหน่วยอื่นที่ห้ามซ้ำ (ถ้ามี):
${courseStructure?.unitsPreview?.filter((u, i) => i !== unitIndex).map((u, i) => 
  `- หน่วยที่ ${i + 1 >= unitIndex ? i + 2 : i + 1} "${u.name}": ${u.knowledgeScope?.mustCover?.join(', ') || u.essentialContent || 'ไม่มีข้อมูล'}`
).join('\n') || 'ไม่มีหน่วยอื่น'}

🎯 กลยุทธ์ A.R.C.E. ของรายวิชา:
${JSON.stringify(courseStructure?.arceStrategy || [], null, 2)}
${isBasicCourse ? '\n⚠️ เนื่องจากเป็นรายวิชาพื้นฐาน ให้ออกแบบกิจกรรมให้สอดคล้องกับมาตรฐาน/ตัวชี้วัดตามหลักสูตรแกนกลางอย่างเคร่งครัด' : ''}

📋 งานของคุณ:
1. เขียนสาระสำคัญของหน่วยนี้
2. ออกแบบแผนการจัดการเรียนรู้ จำนวน ${numberOfPlans} แผน (สำคัญ: ต้องสร้างให้ครบ ${numberOfPlans} แผน)
3. กำหนด LO ที่จะประเมินในแต่ละแผน
4. วางลำดับเนื้อหาจากง่ายไปยาก
5. เชื่อมโยงกิจกรรมให้ต่อเนื่อง (แผนที่ 2 ต่อจากแผนที่ 1, แผนที่ 3 ต่อจากแผนที่ 2 ...)
6. ทุกแผน = 1 คาบ (50 นาที) เสมอ
7. ⚠️ ห้ามซ้ำเนื้อหากับหน่วยอื่น ให้ระบุ uniqueKeyTopics สำหรับแต่ละแผน

ตอบเป็น JSON (ห้าม markdown wrapper):
{
  "name": "${unitName}",
  "periods": ${periods},
  "planCount": ${numberOfPlans},
  "essentialContent": "สาระสำคัญของหน่วย (3-5 ประโยค อธิบายว่าหน่วยนี้นักเรียนจะเรียนรู้อะไร)",
  "knowledgeScope": {
    "mustCover": ["เนื้อหาหลักที่ต้องสอนในหน่วยนี้เท่านั้น ห้ามซ้ำกับหน่วยอื่น"],
    "excludes": ["เนื้อหาที่ไม่รวมในหน่วยนี้ (สอนในหน่วยอื่น)"],
    "prerequisites": ["ความรู้ที่นักเรียนต้องมีก่อนเข้าเรียนหน่วยนี้"]
  },
  "learningObjectives": {
    "knowledge": ["จุดประสงค์ด้าน K 1", "จุดประสงค์ด้าน K 2"],
    "process": ["จุดประสงค์ด้าน P 1", "จุดประสงค์ด้าน P 2"],
    "attitude": ["จุดประสงค์ด้าน A 1"]
  },
  "los": ${JSON.stringify(targetLOs)},
  "plans": [
    // สำคัญ: ต้องมีทั้งหมด ${numberOfPlans} แผน! (1 แผน = 1 คาบ = 50 นาที)
    // ห้ามใส่ "แผนที่ 1:", "แผนที่ 2:" นำหน้า topic เพราะมีเลขลำดับแสดงอยู่แล้ว
    {
      "topic": "ชื่อหัวข้อเนื้อหาโดยตรง (ไม่ต้องมี 'แผนที่ 1:' นำหน้า)",
      "periods": 1,
      "los": ["LO code ที่เกี่ยวข้อง"],
      "uniqueKeyTopics": ["เนื้อหาเฉพาะของแผนนี้ที่ไม่ซ้ำกับแผนอื่น 1", "เนื้อหาเฉพาะ 2"],
      "arce": {
        "analysis": "กิจกรรม/คำถามพัฒนาทักษะการวิเคราะห์",
        "reasoning": "กิจกรรม/คำถามพัฒนาทักษะการให้เหตุผล",
        "creativity": "กิจกรรม/คำถามพัฒนาทักษะการคิดสร้างสรรค์",
        "evidence": "กิจกรรม/คำถามพัฒนาทักษะการใช้หลักฐาน"
      },
      "arceFocus": "ด้านที่เน้นมากที่สุดตามบริบทเนื้อหา (analysis/reasoning/creativity/evidence)",
      "activities5E": {
        "engagement": "กิจกรรมขั้นนำ",
        "exploration": "กิจกรรมสำรวจ",
        "explanation": "กิจกรรมอธิบาย",
        "elaboration": "กิจกรรมขยายความ",
        "evaluation": "กิจกรรมประเมิน"
      },
      "status": "pending"
    },
    // แผนที่ 2, 3, ... จนครบ ${numberOfPlans} แผน (แต่ละแผนต้องมี uniqueKeyTopics ที่ไม่ซ้ำกัน!)
  ],
  "assessmentPlan": {
    "formative": ["วิธีการประเมินระหว่างเรียน"],
    "summative": ["วิธีการประเมินสรุป"]
  },
  "materialsNeeded": ["อุปกรณ์/สื่อที่ต้องเตรียม"]
}

สำคัญมาก - ต้องปฏิบัติตามอย่างเคร่งครัด: 
1. ⚠️ ต้องสร้าง plans array ให้มี ${numberOfPlans} รายการครบถ้วน! ห้ามขาด!
2. ทุกแผน periods: 1 เสมอ (1 แผน = 1 คาบ = 50 นาที)
3. ทุกแผนต้องมี arce ครบ 4 ด้าน (analysis, reasoning, creativity, evidence)
4. arceFocus กระจายให้สมดุล: แผนแรกๆ เน้น analysis, แผนกลาง เน้น reasoning/evidence, แผนท้าย เน้น creativity
5. หัวข้อแผนต้องต่อเนื่องกัน: แผน 1 → แผน 2 → แผน 3 → ... → แผน ${numberOfPlans}
6. ถ้า ${numberOfPlans} คาบ ต้องสร้าง ${numberOfPlans} แผน ห้ามน้อยกว่านี้!`

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: `คุณเป็นผู้เชี่ยวชาญการออกแบบหน่วยการเรียนรู้ระดับพรีเมียม (Premium Unit Designer) เข้าใจ:
1. การจัดลำดับเนื้อหาจากง่ายไปยาก (Scaffolding)
2. การเชื่อมโยงแผนการสอนให้ต่อเนื่อง - แผนที่ 2 ต่อจากแผนที่ 1, แผนที่ 3 ต่อจากแผนที่ 2
3. A.R.C.E. Framework - ทุกแผนต้องมีครบ 4 ด้าน:
   - Analysis: วิเคราะห์ แยกแยะ เปรียบเทียบ
   - Reasoning: ให้เหตุผล อธิบาย สรุป
   - Creativity: สร้างสรรค์ ออกแบบ คิดนอกกรอบ
   - Evidence: ใช้หลักฐาน ข้อมูล พิสูจน์
4. การออกแบบกิจกรรม 5E Model

⚠️ กฎสำคัญมาก: 
- 1 แผน = 1 คาบ = 50 นาที เสมอ (ทุกแผน periods: 1)
- N คาบ = N แผน (ถ้า 3 คาบ ต้องสร้าง 3 แผน)
- แผนต้องเรียงลำดับต่อเนื่อง: แผน 1 (เนื้อหาพื้นฐาน) → แผน 2 (ต่อยอด) → แผน 3 (สรุป/ประยุกต์)
- ทุกแผนต้องมี arce ครบ 4 ด้าน พร้อมกิจกรรม/คำถามเฉพาะ
- กระจาย arceFocus ให้สมดุล: แผน 1 เน้น A, แผน 2 เน้น R/E, แผน 3 เน้น C

🎯 หลักการสร้างแผนแบบ Premium Quality:

📐 กฎ "Plan Content Mapping" (ป้องกันเนื้อหาซ้ำ 100%):
1. ก่อนออกแบบแผนใดๆ ให้สร้าง "แผนที่เนื้อหา" โดยแบ่งเนื้อหาของหน่วยเป็นก้อนๆ ตามจำนวนแผน
2. แต่ละแผนต้องมี "พื้นที่เนื้อหาเฉพาะ" (Exclusive Content) ที่ไม่ทับซ้อนกับแผนอื่น
3. ใช้หลัก "Sequential Learning Path":
   - แผนที่ 1: นิยาม/พื้นฐาน → แผนที่ 2: การวิเคราะห์ → แผนที่ 3: การประยุกต์ → แผนท้าย: สรุป/สังเคราะห์

🔒 กฎเข้มงวดป้องกันเนื้อหาซ้ำ:
1. แต่ละแผนต้องมี uniqueKeyTopics ที่เป็น "เนื้อหาเฉพาะแผนนี้เท่านั้น"
   - ❌ ไม่ดี: "ทบทวนเนื้อหา", "ความรู้พื้นฐาน", "ต่อยอดความรู้"
   - ✅ ดี: "การหาพื้นที่วงกลมด้วยสูตร πr²", "การเปรียบเทียบพื้นที่รูปทรงต่างๆ"
2. uniqueKeyTopics ต้องเป็น "หัวข้อเฉพาะ" ไม่ใช่ "กิจกรรมทั่วไป"
3. ห้ามใช้คำว่า "ต่อ", "ต่อยอด", "ทบทวน" เพียงอย่างเดียว ต้องระบุเนื้อหาชัดเจน
4. เมื่อได้รับข้อมูลหน่วยอื่น ห้ามสร้างเนื้อหาซ้ำกับหน่วยเหล่านั้นโดยเด็ดขาด

📊 รูปแบบ Topic ที่ดี:
- ระบุ "สิ่งที่นักเรียนจะทำได้" หลังเรียนแผนนี้
- ใช้คำกริยาที่วัดได้: คำนวณ, วาด, เปรียบเทียบ, อธิบาย, ออกแบบ
- ตัวอย่าง: "การคำนวณเส้นรอบวง" (ไม่ใช่ "เรื่องเส้นรอบวง")

ตอบเป็นภาษาไทย JSON เท่านั้น ห้ามใช้ markdown wrapper`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })

      const responseText = completion.choices[0].message.content
      let result
      try {
        let cleanedText = responseText.trim()
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        result = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse learning unit:', responseText)
        return res.status(500).send({ error: 'Failed to parse AI response' })
      }

      // ตรวจสอบว่า plans ครบตามจำนวนคาบหรือไม่
      if (!result.plans || result.plans.length < numberOfPlans) {
        const existingCount = result.plans?.length || 0
        console.log(`⚠️ AI สร้างแผนไม่ครบ: ได้ ${existingCount}/${numberOfPlans} แผน`)
        
        if (!result.plans) result.plans = []
        
        // ถ้าขาดมากกว่า 5 แผน แสดงว่าหน่วยใหญ่เกินไป ควรแจ้งเตือน
        const missingCount = numberOfPlans - existingCount
        if (missingCount > 5) {
          console.log(`⚠️ หน่วยนี้มี ${numberOfPlans} คาบ ซึ่งมากเกินไป แนะนำให้แบ่งเป็นหน่วยย่อย`)
        }
        
        // สร้างชื่อแผนที่สมเหตุสมผลโดยดูจาก pattern ของแผนก่อนหน้า
        const getSmartTopicName = (planNum, existingPlans, unitName) => {
          // ดูว่าเหลือกี่แผนจากท้าย
          const remainingFromEnd = numberOfPlans - planNum + 1
          
          if (remainingFromEnd === 1) {
            return `สรุปและประเมินผล${unitName ? ': ' + unitName : ''}`
          } else if (remainingFromEnd === 2) {
            return `การนำเสนอและแลกเปลี่ยนเรียนรู้`
          } else if (remainingFromEnd === 3) {
            return `การประยุกต์ใช้ความรู้`
          } else if (remainingFromEnd <= 5) {
            return `กิจกรรมเสริมและฝึกปฏิบัติ (${planNum})`
          } else {
            // ดูจากแผนก่อนหน้าว่ามี pattern อะไร
            if (existingPlans.length > 0) {
              const lastTopic = existingPlans[existingPlans.length - 1].topic
              return `${lastTopic} (ต่อ) - ส่วนที่ ${planNum - existingCount + 1}`
            }
            return `เนื้อหาเพิ่มเติม (${planNum})`
          }
        }
        
        // เติมแผนที่ขาดให้ครบ
        while (result.plans.length < numberOfPlans) {
          const planNum = result.plans.length + 1
          const arceFocusOptions = ['analysis', 'reasoning', 'creativity', 'evidence']
          const focusIndex = (planNum - 1) % 4
          
          result.plans.push({
            topic: getSmartTopicName(planNum, result.plans.slice(0, existingCount), unitName),
            periods: 1,
            los: targetLOs,
            arce: {
              analysis: 'วิเคราะห์เนื้อหาและสถานการณ์ที่เกี่ยวข้อง',
              reasoning: 'อธิบายเหตุผลและความเชื่อมโยง',
              creativity: 'ออกแบบหรือสร้างสรรค์ผลงาน',
              evidence: 'รวบรวมและใช้หลักฐานสนับสนุน'
            },
            arceFocus: arceFocusOptions[focusIndex],
            status: 'pending'
          })
        }
        
        console.log(`✅ เติมแผนครบแล้ว: ${result.plans.length} แผน`)
      }
      
      // ตรวจสอบให้ทุกแผน periods = 1
      result.plans = result.plans.map(plan => ({
        ...plan,
        periods: 1,
        status: plan.status || 'pending'
      }))
      
      // เพิ่ม warning ถ้าหน่วยใหญ่เกินไป
      if (numberOfPlans > 10) {
        result.warning = `หน่วยนี้มี ${numberOfPlans} แผน ซึ่งค่อนข้างมาก แนะนำให้พิจารณาแบ่งเป็นหน่วยย่อย (ประมาณ 4-8 แผนต่อหน่วย)`
      }

      return res.status(200).send({ success: true, unit: result })

    } catch (error) {
      console.error('❌ Error generating learning unit:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

// ==========================================
// ELECTRONIC WORKSHEET SYSTEM
// ระบบใบงานอิเล็กทรอนิกส์ที่ยืดหยุ่นตามบริบทแผนการสอน
// ==========================================

/**
 * Generate Electronic Worksheet from Lesson Plan
 * สร้างใบงานอิเล็กทรอนิกส์อัจฉริยะจากแผนการสอน 5E + A.R.C.E.
 * - วิเคราะห์กิจกรรม 5E อย่างละเอียด
 * - สร้างคำถามตาม A.R.C.E. Framework
 * - ปรับตามบริบทและเนื้อหาของแต่ละแผน
 */
exports.generateElectronicWorksheet = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 180,
  memory: '1GB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const {
        lessonPlanId,
        teacherId,
        // Lesson Plan Data
        lessonPlan,
        // Course Info
        courseId,
        courseCode,
        courseName,
        gradeLevel,
        // Unit Info
        unitNumber,
        unitName,
        planNumber,
        topic,
        // Activities 5E
        activities,
        // Learning Outcomes
        objectives,
        learningOutcomes,
        // A.R.C.E. Configuration
        arceFocus,
        arceWeights,
        // Options
        worksheetType, // 'comprehensive' | 'analysis' | 'creativity' | 'quick'
        targetPhases,  // ['engagement', 'exploration', ...] for phase-specific
        duration,
        difficulty, // 'easy' | 'medium' | 'hard' | 'mixed'
        questionCount, // Number of questions to generate
        questionTypes, // ['multiple_choice', 'short_answer', 'essay', 'matching']
        includeReflection, // Include self-reflection section
        includeRubric, // Include scoring rubric display
        // Room Assignment
        roomName,
        roomDescription,
        createRoom, // Whether to create a new room
        roomId // Existing room ID to add worksheet to
      } = req.body

      if (!lessonPlanId && !lessonPlan) {
        return res.status(400).send({
          error: 'Missing required: lessonPlanId or lessonPlan data'
        })
      }

      if (!openai) {
        return res.status(500).send({ error: 'OpenAI not configured' })
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

      // Load lesson plan if ID provided
      let planData = lessonPlan
      if (lessonPlanId && !lessonPlan) {
        const planDoc = await db.collection('lessonPlans').doc(lessonPlanId).get()
        if (!planDoc.exists) {
          return res.status(404).send({ error: 'Lesson plan not found' })
        }
        planData = { id: planDoc.id, ...planDoc.data() }
      }

      // Extract activities from plan content or direct input
      const planContent = planData.content || planData
      const activities5E = activities || planContent.activities || {}
      const planObjectives = objectives || planContent.objectives || {}
      const planLOs = learningOutcomes || planContent.targetLOs || []
      const planArce = arceFocus || planContent.arceFocus || ['analysis', 'reasoning', 'creativity', 'evidence']

      // Build comprehensive context for AI
      const activitiesContext = buildActivitiesContext(activities5E)
      const objectivesContext = buildObjectivesContext(planObjectives)
      const arceContext = buildArceContext(planArce, arceWeights)

      // Build difficulty instructions
      const difficultyInstructions = {
        easy: 'คำถามง่าย เหมาะกับผู้เรียนเริ่มต้น มีตัวอย่างและคำแนะนำช่วย',
        medium: 'คำถามปานกลาง ท้าทายพอดี ต้องใช้การวิเคราะห์',
        hard: 'คำถามยาก ต้องคิดวิเคราะห์เชิงลึก มีสถานการณ์ซับซ้อน',
        mixed: 'ผสมผสานหลายระดับ เริ่มจากง่ายไปยาก'
      }

      // Build worksheet type instructions
      const typeInstructions = {
        comprehensive: 'ครอบคลุมทุกมิติ A.R.C.E. อย่างสมดุล',
        analysis: 'เน้นการวิเคราะห์ (Analysis) เป็นหลัก มีคำถามเชิงวิเคราะห์มาก',
        creativity: 'เน้นความคิดสร้างสรรค์ (Creativity) มีคำถามให้ออกแบบ/สร้างสรรค์',
        quick: 'คำถามสั้นกระชับ ทำได้เร็ว เน้นความเข้าใจพื้นฐาน',
        arce_evaluate: 'ใบงานวัดผล ARCE (ขั้น Evaluate) - ใช้โครงสร้าง Situation-Task-Expected_ARCE'
      }

      // Build question types instructions
      const qTypes = questionTypes || ['multiple_choice', 'short_text', 'open_ended']
      const questionTypeLabels = {
        multiple_choice: 'ปรนัย (4 ตัวเลือก)',
        short_text: 'ตอบสั้น (20-100 ตัวอักษร)',
        open_ended: 'อัตนัย/เรียงความ (100+ ตัวอักษร)',
        table: 'ตาราง (กรอกข้อมูลในตาราง)'
      }
      const allowedTypes = qTypes.map(t => questionTypeLabels[t] || t).join(', ')

      // Check if this is ARCE Evaluate worksheet type
      const isArceEvaluate = worksheetType === 'arce_evaluate'
      
      // Extract Evaluate phase content from activities5E for ARCE Evaluate worksheets
      let evaluateContent = ''
      if (isArceEvaluate && activities5E) {
        evaluateContent = activities5E.evaluation || activities5E.evaluate || ''
        if (typeof evaluateContent === 'object') {
          evaluateContent = JSON.stringify(evaluateContent, null, 2)
        }
      }

      // Build prompt based on worksheet type
      let prompt
      
      if (isArceEvaluate) {
        // 🎯 Special prompt for ARCE Evaluate worksheet (Situation-Task-Expected format)
        prompt = `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบ "ใบงานวัดผล ARCE" สำหรับขั้น Evaluate ในแผนการสอน 5E

📚 ข้อมูลแผนการสอน:
- รายวิชา: ${courseCode || ''} ${courseName || ''}
- ระดับชั้น: ${gradeLevel || 'ม.4'}
- หน่วยที่ ${unitNumber || 1}: ${unitName || ''}
- แผนที่ ${planNumber || 1}: ${topic || planData.topic || ''}
- ระยะเวลา: ${duration || 50} นาที

🎯 จุดประสงค์การเรียนรู้:
${objectivesContext}

📖 Learning Outcomes:
${planLOs.map(lo => `- ${lo}`).join('\n') || 'ตามจุดประสงค์ที่กำหนด'}

🔄 กิจกรรมขั้น Evaluate จากแผนการสอน:
${evaluateContent || activitiesContext}

✨ A.R.C.E. Framework ที่ต้องประเมิน:
${arceContext}

📋 โครงสร้างใบงานวัดผล ARCE (Situation-Task-Expected):
ใบงานนี้ใช้โครงสร้างพิเศษที่ช่วยให้นักเรียนเข้าใจชัดเจนว่าต้องตอบอะไร และช่วยให้ AI ประเมินได้แม่นยำ:

1. **Situation (สถานการณ์)**: บริบท/ปัญหาที่สอดคล้องกับแผนการสอน ต้องน่าสนใจและเกี่ยวข้องกับชีวิตจริง
2. **Task (ภารกิจ)**: คำสั่งที่ชัดเจนว่านักเรียนต้องทำอะไร ใช้ภาษาที่เข้าใจง่าย
3. **Expected_A (การวิเคราะห์ที่คาดหวัง)**: แนวทางการวิเคราะห์ที่ถูกต้อง - ใช้สำหรับ AI ประเมิน
4. **Expected_R (เหตุผลที่คาดหวัง)**: หลักการ/ทฤษฎีที่นักเรียนควรอ้างถึง - ใช้สำหรับ AI ประเมิน
5. **Expected_C (ผลงานที่คาดหวัง)**: ลักษณะชิ้นงาน/โค้ด/การออกแบบที่ควรได้ - ใช้สำหรับ AI ประเมิน
6. **Expected_E (หลักฐานที่คาดหวัง)**: ผลลัพธ์/ตัวอย่าง/หลักฐานที่ยืนยันความถูกต้อง - ใช้สำหรับ AI ประเมิน

กรุณาสร้างใบงานวัดผล ARCE ที่มี ${questionCount || 3} สถานการณ์ ตอบเป็น JSON (ห้าม markdown wrapper):
{
  "metadata": {
    "title": "${topic || 'ใบงาน'}",
    "description": "ใบงานประเมินทักษะการคิดขั้นสูงตาม A.R.C.E. Framework",
    "worksheetType": "arce_evaluate",
    "lessonPlanId": "${lessonPlanId || ''}",
    "courseId": "${courseId || ''}",
    "courseName": "${courseName || ''}",
    "gradeLevel": "${gradeLevel || 'ม.4'}",
    "unitNumber": ${unitNumber || 1},
    "unitName": "${unitName || ''}",
    "planNumber": ${planNumber || 1},
    "topic": "${topic || ''}",
    "duration": ${duration || 50},
    "totalQuestions": ${questionCount || 3},
    "maxScore": 0,
    "arceFocus": ["analysis", "reasoning", "creativity", "evidence"],
    "arceWeights": {
      "analysis": 25,
      "reasoning": 25,
      "creativity": 25,
      "evidence": 25
    }
  },
  "instructions": "อ่านสถานการณ์แต่ละข้ออย่างละเอียด แล้วทำภารกิจตามที่กำหนด โดยใช้ทักษะการคิดวิเคราะห์ การให้เหตุผล ความคิดสร้างสรรค์ และการใช้หลักฐาน",
  "settings": {
    "shuffleQuestions": false,
    "shuffleOptions": false,
    "showHints": true,
    "blockCopyPaste": true,
    "timeLimit": ${duration || 50},
    "allowLateSubmission": false
  },
  "sections": [
    {
      "id": "arce_situations",
      "title": "📋 สถานการณ์วัดผล ARCE",
      "description": "ทำภารกิจตามสถานการณ์ที่กำหนด แสดงทักษะการคิดขั้นสูงทั้ง 4 ด้าน",
      "phase": "evaluation",
      "arceFocus": ["analysis", "reasoning", "creativity", "evidence"],
      "questions": [
        // สร้าง ${questionCount || 3} สถานการณ์ โดยแต่ละสถานการณ์มีโครงสร้าง:
        {
          "id": "arce_1",
          "number": 1,
          "type": "arce_situation",
          "situation": "สถานการณ์/ปัญหาที่น่าสนใจ เกี่ยวข้องกับเนื้อหาที่เรียน (3-5 ประโยค)",
          "task": "ภารกิจที่ชัดเจน: ให้นักเรียนทำอะไร อธิบายให้ละเอียด (2-3 ประโยค)",
          "answerGuide": "แนวทางการตอบสำหรับนักเรียน: อธิบายว่าคำตอบที่ดีควรมีอะไรบ้าง",
          "expected": {
            "analysis": "แนวทางการวิเคราะห์ที่ถูกต้อง: ควรแยกแยะประเด็นอะไรบ้าง หาความสัมพันธ์อะไร",
            "reasoning": "หลักการ/เหตุผลที่ควรอ้างถึง: ทฤษฎี กฎ หลักการอะไรที่เกี่ยวข้อง",
            "creativity": "ลักษณะผลงานที่คาดหวัง: ควรนำเสนออย่างไร มีความคิดสร้างสรรค์อย่างไร",
            "evidence": "หลักฐาน/ตัวอย่างที่ยืนยันความถูกต้อง: ข้อมูล ตัวเลข ผลลัพธ์ที่ควรแสดง"
          },
          "rubric": {
            "5": "ตอบครบทุกด้าน (A-R-C-E) อย่างลึกซึ้ง มีตัวอย่างชัดเจน สร้างสรรค์",
            "4": "ตอบครบทุกด้าน มีเหตุผลดี อาจขาดตัวอย่างบ้าง",
            "3": "ตอบได้ 2-3 ด้าน มีเหตุผลพอสมควร",
            "2": "ตอบได้ 1-2 ด้าน เหตุผลยังไม่ชัดเจน",
            "1": "พยายามตอบแต่ยังไม่ตรงประเด็น",
            "0": "ไม่ตอบหรือไม่เกี่ยวข้อง"
          },
          "maxScore": 20,
          "minCharacters": 100,
          "required": true,
          "hints": [
            "อ่านสถานการณ์ให้เข้าใจก่อนตอบ",
            "ตอบให้ครบทั้ง 4 ด้าน: วิเคราะห์ เหตุผล สร้างสรรค์ หลักฐาน"
          ]
        }
        // ... สร้างเพิ่มตามจำนวนที่กำหนด
      ]
    }
  ],
  "selfReflection": {
    "enabled": ${includeReflection !== false},
    "prompt": "สะท้อนความคิดจากการทำใบงานวัดผล",
    "questions": [
      "ข้อใดที่ท้าทายที่สุด และคุณแก้ปัญหาอย่างไร?",
      "ทักษะ ARCE ด้านใดที่คุณทำได้ดี และด้านใดที่ต้องพัฒนา?"
    ]
  },
  "scoring": {
    "totalPoints": 0,
    "passingScore": 60,
    "arceDistribution": {
      "analysis": 25,
      "reasoning": 25,
      "creativity": 25,
      "evidence": 25
    }
  },
  "assessmentCriteria": {
    "paStandard": {
      "level1": "ระดับ 1: ต้องปรับปรุง (0-39%)",
      "level2": "ระดับ 2: พอใช้ (40-59%)",
      "level3": "ระดับ 3: ดี (60-79%)",
      "level4": "ระดับ 4: ดีมาก (80-100%)"
    }
  }
}

⚠️ ข้อกำหนดสำคัญ (ต้องปฏิบัติตามอย่างเคร่งครัด):
1. สร้างสถานการณ์ตามจำนวนที่กำหนด: ${questionCount || 3} สถานการณ์
2. แต่ละสถานการณ์ต้องมี: situation, task, answerGuide, expected (ครบ 4 ด้าน A-R-C-E)
3. สถานการณ์ต้องสอดคล้องกับเนื้อหาจากแผนการสอน โดยเฉพาะขั้น Evaluate
4. task ต้องชัดเจน ไม่กว้างเกินไป นักเรียนต้องรู้ว่าต้องทำอะไร
5. answerGuide ช่วยบอกนักเรียนว่าคำตอบที่ดีควรมีอะไรบ้าง
6. expected แต่ละด้านต้องเฉพาะเจาะจง ใช้ประเมินคำตอบได้
7. maxScore ของแต่ละข้อ = 20 คะแนน (5 คะแนนต่อด้าน ARCE)
8. question type ต้องเป็น "arce_situation"
9. เหมาะสมกับระดับชั้น ${gradeLevel || 'ม.4'}`
      } else {
        // Regular worksheet prompt (original)
        prompt = `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบใบงานอิเล็กทรอนิกส์สำหรับการเรียนการสอน

📚 ข้อมูลแผนการสอน:
- รายวิชา: ${courseCode || ''} ${courseName || ''}
- ระดับชั้น: ${gradeLevel || 'ม.4'}
- หน่วยที่ ${unitNumber || 1}: ${unitName || ''}
- แผนที่ ${planNumber || 1}: ${topic || planData.topic || ''}
- ระยะเวลา: ${duration || 50} นาที

🎯 จุดประสงค์การเรียนรู้:
${objectivesContext}

📖 Learning Outcomes:
${planLOs.map(lo => `- ${lo}`).join('\n') || 'ตามจุดประสงค์ที่กำหนด'}

🔄 กิจกรรมการเรียนรู้ 5E:
${activitiesContext}

✨ A.R.C.E. Framework:
${arceContext}

📋 การตั้งค่าใบงาน:
- ประเภท: ${typeInstructions[worksheetType] || typeInstructions.comprehensive}
- จำนวนคำถาม: ${questionCount || 8} ข้อ
- ระดับความยาก: ${difficultyInstructions[difficulty] || difficultyInstructions.mixed}
- รูปแบบคำถามที่ใช้ได้: ${allowedTypes}
${includeReflection !== false ? '- รวมคำถาม Self-Reflection ท้ายใบงาน' : ''}
${includeRubric !== false ? '- แสดงเกณฑ์การให้คะแนนในแต่ละข้อ' : ''}

กรุณาสร้างใบงานอิเล็กทรอนิกส์ที่:
1. สอดคล้องกับกิจกรรม 5E ที่กำหนดในแผน
2. ${typeInstructions[worksheetType] || 'ครอบคลุม A.R.C.E. Framework ทั้ง 4 ด้าน'}
3. ⚠️ มีคำถามรวมทั้งหมดเท่ากับ ${questionCount || 8} ข้อเท่านั้น (ห้ามเกิน ห้ามน้อยกว่า)
4. มีบริบท/กรณีศึกษาประกอบคำถามเพื่อกระตุ้นการคิด
5. ${difficultyInstructions[difficulty] || 'ผสมผสานหลายระดับความยาก'}
6. เหมาะสมกับระดับชั้น ${gradeLevel || 'ม.4'}

ตอบเป็น JSON (ห้าม markdown wrapper):
{
  "metadata": {
    "title": "ชื่อใบงาน (กระชับ ไม่ต้องมี 'ใบงานที่' นำหน้า)",
    "description": "คำอธิบายใบงาน 1-2 ประโยค",
    "lessonPlanId": "${lessonPlanId || ''}",
    "courseId": "${courseId || ''}",
    "courseName": "${courseName || ''}",
    "gradeLevel": "${gradeLevel || 'ม.4'}",
    "unitNumber": ${unitNumber || 1},
    "unitName": "${unitName || ''}",
    "planNumber": ${planNumber || 1},
    "topic": "${topic || ''}",
    "duration": ${duration || 50},
    "totalQuestions": ${questionCount || 8},
    "maxScore": 0,
    "arceFocus": ${JSON.stringify(planArce)},
    "arceWeights": {
      "analysis": ${arceWeights?.analysis || 25},
      "reasoning": ${arceWeights?.reasoning || 25},
      "creativity": ${arceWeights?.creativity || 25},
      "evidence": ${arceWeights?.evidence || 25}
    }
  },
  "instructions": "คำชี้แจงการทำใบงาน (2-3 ประโยค)",
  "settings": {
    "shuffleQuestions": false,
    "shuffleOptions": true,
    "showHints": true,
    "blockCopyPaste": true,
    "timeLimit": ${duration || 50},
    "allowLateSubmission": false
  },
  "sections": [
    // สร้าง 1-2 section ที่มีคำถามรวมกัน = ${questionCount || 8} ข้อ
    // ตัวอย่างโครงสร้าง section:
    {
      "id": "section_1",
      "title": "ส่วนที่ 1: ชื่อส่วน",
      "description": "คำอธิบาย",
      "phase": "engagement|exploration|explanation|elaboration|evaluation",
      "arceFocus": ["analysis"],
      "questions": [
        // คำถาม open_ended
        {
          "id": "q1",
          "number": 1,
          "type": "open_ended",
          "prompt": "คำถาม",
          "context": "บริบท (ถ้ามี)",
          "arceFocus": "analysis|reasoning|creativity|evidence",
          "bloomLevel": "analyze|understand|apply|create|evaluate",
          "required": true,
          "minCharacters": 50,
          "maxScore": 5,
          "rubric": { "5": "...", "4": "...", "3": "...", "2": "...", "1": "...", "0": "..." },
          "hints": ["คำแนะนำ"]
        },
        // คำถาม multiple_choice
        {
          "id": "q2",
          "number": 2,
          "type": "multiple_choice",
          "prompt": "คำถาม",
          "arceFocus": "analysis",
          "options": [
            { "id": "a", "text": "ตัวเลือก ก" },
            { "id": "b", "text": "ตัวเลือก ข" },
            { "id": "c", "text": "ตัวเลือก ค" },
            { "id": "d", "text": "ตัวเลือก ง" }
          ],
          "correctAnswer": "a",
          "maxScore": 1
        },
        // คำถาม table
        {
          "id": "q3",
          "number": 3,
          "type": "table",
          "prompt": "บันทึกข้อมูล",
          "arceFocus": "evidence",
          "required": true,
          "table": { "headers": ["หัวข้อ 1", "หัวข้อ 2"], "rows": 3, "editable": true },
          "maxScore": 5
        }
      ]
    }
  ],
  "selfReflection": {
    "enabled": ${includeReflection !== false},
    "prompt": "สะท้อนความคิดจากการทำใบงาน",
    "questions": ["สิ่งที่ได้เรียนรู้...", "จะนำไปใช้อย่างไร..."]
  },
  "scoring": {
    "totalPoints": 0,
    "passingScore": 0,
    "arceDistribution": {}
  },
  "assessmentCriteria": {
    "paStandard": {
      "level1": "ระดับ 1: ต้องปรับปรุง (0-39%)",
      "level2": "ระดับ 2: พอใช้ (40-59%)",
      "level3": "ระดับ 3: ดี (60-79%)",
      "level4": "ระดับ 4: ดีมาก (80-100%)"
    }
  }
}

⚠️ ข้อกำหนดสำคัญ (ต้องปฏิบัติตามอย่างเคร่งครัด):
1. ⚠️ จำนวนคำถามต้องเท่ากับ ${questionCount || 8} ข้อเท่านั้น (นับทุกคำถามในทุก section รวมกัน)
2. ไม่จำเป็นต้องมีครบทุกขั้น 5E - สร้าง section เฉพาะที่จำเป็นตามจำนวนคำถาม
3. กระจาย arceFocus ให้ครอบคลุม A.R.C.E. ตามที่กำหนด
4. type ของคำถาม ใช้ได้เฉพาะ: ${qTypes.join(', ')}
   - multiple_choice: มี options 4 ตัวเลือก (a,b,c,d) และ correctAnswer
   - short_text: minCharacters: 20-100
   - open_ended: minCharacters: 100+ พร้อม rubric
   - table: มี table.headers, table.rows, table.editable: true
5. ทุกคำถาม open_ended ต้องมี rubric และ hints
6. metadata.totalQuestions = ${questionCount || 8} (ต้องตรงกับจำนวนที่ระบุ)
7. ทุก question ต้องมี id ที่ไม่ซ้ำกัน (q1, q2, q3...)`
      } // End of else block for regular worksheet

      // Build system message based on worksheet type
      const systemMessage = isArceEvaluate 
        ? `คุณเป็นผู้เชี่ยวชาญออกแบบ "ใบงานวัดผล ARCE" ที่:
1. เข้าใจ A.R.C.E. Framework อย่างลึกซึ้ง (Analysis, Reasoning, Creativity, Evidence)
2. สร้างสถานการณ์ปัญหาที่น่าสนใจและเกี่ยวข้องกับชีวิตจริง
3. ออกแบบภารกิจที่ชัดเจน นักเรียนเข้าใจว่าต้องทำอะไร
4. กำหนด Expected_ARCE ที่เฉพาะเจาะจง ใช้ตรวจคำตอบได้
5. ⚠️ ปฏิบัติตามจำนวนสถานการณ์ที่ระบุอย่างเคร่งครัด
ตอบเป็นภาษาไทยและ JSON เท่านั้น`
        : `คุณเป็นผู้เชี่ยวชาญออกแบบใบงานอิเล็กทรอนิกส์ที่:
1. เข้าใจ 5E Model และ A.R.C.E. Framework อย่างลึกซึ้ง
2. สร้างคำถามที่กระตุ้นทักษะคิดขั้นสูง (HOTS)
3. ออกแบบ form ที่ใช้งานง่าย หลากหลายรูปแบบ
4. สร้าง rubric ที่ชัดเจนสำหรับการประเมิน
5. ⚠️ ปฏิบัติตามจำนวนคำถามที่ระบุอย่างเคร่งครัด ห้ามสร้างเกินหรือน้อยกว่า
ตอบเป็นภาษาไทยและ JSON เท่านั้น`

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })

      const responseText = completion.choices[0].message.content
      let worksheetData
      try {
        let cleanedText = responseText.trim()
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        worksheetData = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse worksheet JSON:', responseText)
        return res.status(500).send({ error: 'Failed to parse AI response' })
      }

      // Validate and fix metadata
      worksheetData.metadata = {
        ...worksheetData.metadata,
        lessonPlanId: lessonPlanId || null,
        courseId: courseId || null,
        teacherId: teacherId || null,
        createdAt: new Date().toISOString(),
        // 🎯 Store Learning Outcomes for assessment
        learningOutcomes: (planLOs || []).map((lo, idx) => {
          // Handle both string and object formats
          if (typeof lo === 'string') {
            return { loCode: `LO${idx + 1}`, loDescription: lo }
          }
          return {
            loCode: lo.loCode || lo.code || `LO${idx + 1}`,
            loDescription: lo.loDescription || lo.description || lo
          }
        })
      }

      // Calculate totals
      let totalQuestions = 0
      let maxScore = 0
      worksheetData.sections.forEach(section => {
        section.questions.forEach(q => {
          totalQuestions++
          maxScore += q.maxScore || 0
        })
      })
      worksheetData.metadata.totalQuestions = totalQuestions
      worksheetData.metadata.maxScore = maxScore
      worksheetData.scoring.totalPoints = maxScore

      // Handle Room Assignment
      let finalRoomId = null
      
      // Option 1: Use existing room ID provided
      if (roomId) {
        finalRoomId = roomId
        console.log(`✅ Using provided room ID: ${roomId}`)
      }
      // Option 2: Create room automatically or find existing for course
      else if (createRoom !== false && (roomName || roomDescription || courseId)) {
        // First, check if a room already exists for this course and teacher
        if (courseId && teacherId) {
          const existingRoomQuery = await db.collection('learningRooms')
            .where('courseId', '==', courseId)
            .where('teacherId', '==', teacherId)
            .limit(1)
            .get()
          
          if (!existingRoomQuery.empty) {
            // Use existing room
            finalRoomId = existingRoomQuery.docs[0].id
            console.log(`✅ Found existing room ${finalRoomId} for course ${courseId}`)
          }
        }
        
        // If no existing room, create a new one
        if (!finalRoomId) {
          // Build unique room name from course info
          let uniqueRoomName = roomName
          if (!uniqueRoomName) {
            if (courseCode && courseName) {
              uniqueRoomName = `${courseCode} - ${courseName}`
            } else if (courseName) {
              uniqueRoomName = courseName
            } else if (courseCode) {
              uniqueRoomName = `รายวิชา ${courseCode}`
            } else {
              uniqueRoomName = `ห้องกิจกรรม: ${topic || worksheetData.metadata.title}`
            }
          }
          
          const roomRef = await db.collection('learningRooms').add({
            name: uniqueRoomName,
            description: roomDescription || `ห้องกิจกรรมการเรียนรู้สำหรับวิชา ${courseName || topic}`,
            courseId: courseId || null,
            courseCode: courseCode || null,
            courseName: courseName || null,
            topic: topic || worksheetData.metadata.title,
            gradeLevel: gradeLevel || null,
            lessonPlanId: lessonPlanId || null,
            teacherId: teacherId || null,
            worksheetIds: [],
            status: 'published', // Published immediately so students can access
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          })
          finalRoomId = roomRef.id
          console.log(`✅ Created new room ${finalRoomId} for course ${courseId}`)
        }
      }

      // Save worksheet to Firestore
      const worksheetRef = await db.collection('eWorksheets').add({
        ...worksheetData,
        // Top-level fields for easier querying
        teacherId: teacherId || null,
        courseId: courseId || null,
        courseCode: courseCode || null,
        courseName: courseName || null,
        lessonPlanId: lessonPlanId || null,
        title: worksheetData.metadata?.title || topic || 'ใบงานไม่มีชื่อ',
        gradeLevel: gradeLevel || null,
        roomId: finalRoomId,
        status: 'draft',
        stats: {
          totalSubmitted: 0,
          averageScore: 0,
          passRate: 0
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      // Update room with worksheet ID
      if (finalRoomId) {
        await db.collection('learningRooms').doc(finalRoomId).update({
          worksheetIds: admin.firestore.FieldValue.arrayUnion(worksheetRef.id),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      // Log AI usage
      await db.collection('aiUsageLogs').add({
        teacherId,
        feature: 'generateElectronicWorksheet',
        lessonPlanId,
        model,
        tokensUsed: completion.usage?.total_tokens || 0,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      })

      return res.status(200).send({
        success: true,
        worksheetId: worksheetRef.id,
        roomId: finalRoomId,
        totalQuestions: totalQuestions,
        maxScore: maxScore,
        worksheet: worksheetData
      })

    } catch (error) {
      console.error('❌ Error generating electronic worksheet:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

// Helper functions for building context
function buildActivitiesContext(activities5E) {
  const phases = {
    engagement: { name: 'กระตุ้นความสนใจ', icon: '🔥' },
    exploration: { name: 'สำรวจค้นหา', icon: '🔍' },
    explanation: { name: 'อธิบายความรู้', icon: '💡' },
    elaboration: { name: 'ขยายความรู้', icon: '🚀' },
    evaluation: { name: 'ประเมินผล', icon: '📊' }
  }

  let context = ''
  for (const [phase, info] of Object.entries(phases)) {
    const activity = activities5E[phase]
    if (activity) {
      context += `\n${info.icon} ขั้น${info.name} (${phase}):`
      context += `\n  - เวลา: ${activity.duration || 10} นาที`
      if (activity.steps) {
        context += `\n  - กิจกรรม: ${activity.steps.slice(0, 3).join(', ')}`
      }
      if (activity.arceFocus) {
        const arce = Array.isArray(activity.arceFocus) ? activity.arceFocus.join(', ') : activity.arceFocus
        context += `\n  - A.R.C.E.: ${arce}`
      }
      if (activity.arceDescription) {
        context += `\n  - คำอธิบาย: ${activity.arceDescription}`
      }
      if (activity.questions) {
        context += `\n  - คำถาม: ${activity.questions.slice(0, 2).join(', ')}`
      }
      if (activity.keyConcepts) {
        context += `\n  - แนวคิดหลัก: ${activity.keyConcepts.join(', ')}`
      }
    }
  }
  return context || 'ไม่ระบุกิจกรรม'
}

function buildObjectivesContext(objectives) {
  let context = ''
  if (objectives.knowledge && objectives.knowledge.length) {
    context += `ด้านความรู้ (K):\n${objectives.knowledge.map(o => `  - ${o}`).join('\n')}\n`
  }
  if (objectives.process && objectives.process.length) {
    context += `ด้านทักษะ (P):\n${objectives.process.map(o => `  - ${o}`).join('\n')}\n`
  }
  if (objectives.attitude && objectives.attitude.length) {
    context += `ด้านคุณลักษณะ (A):\n${objectives.attitude.map(o => `  - ${o}`).join('\n')}\n`
  }
  return context || 'ตามแผนการสอน'
}

function buildArceContext(arceFocus, weights) {
  const arceMap = {
    analysis: { name: 'การวิเคราะห์', icon: '🔍', desc: 'แยกแยะ จำแนก เปรียบเทียบ' },
    reasoning: { name: 'การให้เหตุผล', icon: '🧠', desc: 'อธิบาย สรุป เชื่อมโยง' },
    creativity: { name: 'ความคิดสร้างสรรค์', icon: '💡', desc: 'ออกแบบ สร้างสรรค์ ประดิษฐ์' },
    evidence: { name: 'การใช้หลักฐาน', icon: '📚', desc: 'รวบรวม อ้างอิง พิสูจน์' }
  }

  const defaultWeights = { analysis: 25, reasoning: 25, creativity: 25, evidence: 25 }
  const actualWeights = weights || defaultWeights

  let context = ''
  const focusArr = Array.isArray(arceFocus) ? arceFocus : ['analysis', 'reasoning', 'creativity', 'evidence']
  
  focusArr.forEach(arce => {
    const info = arceMap[arce]
    if (info) {
      const weight = actualWeights[arce] || 25
      context += `${info.icon} ${info.name} (${weight}%): ${info.desc}\n`
    }
  })
  return context
}

/**
 * Assess Worksheet Submission
 * ตรวจใบงานด้วย AI ให้ feedback และคะแนน HOTS A.R.C.E.
 * พร้อมจุดแข็ง จุดอ่อน ข้อเสนอแนะตามมาตรฐาน PA/DPA
 */
exports.assessWorksheetSubmission = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 180,
  memory: '1GB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const {
        submissionId,
        worksheetId,
        answers,
        worksheetStructure,
        attemptNumber,
        previousBestScore,
        retrySettings
      } = req.body

      if (!worksheetId || !answers) {
        return res.status(400).send({
          error: 'Missing required: worksheetId, answers'
        })
      }

      if (!openai) {
        return res.status(500).send({ error: 'OpenAI not configured' })
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18'

      // Load worksheet structure if not provided
      let worksheet = worksheetStructure
      if (!worksheet) {
        const wsDoc = await db.collection('eWorksheets').doc(worksheetId).get()
        if (!wsDoc.exists) {
          return res.status(404).send({ error: 'Worksheet not found' })
        }
        worksheet = wsDoc.data()
      }

      // Build assessment prompt
      const questionsForAssessment = []
      worksheet.sections.forEach(section => {
        section.questions.forEach(q => {
          const answerKey = `${section.id}_${q.id}`
          const studentAnswer = answers[answerKey]
          if (studentAnswer !== undefined && studentAnswer !== '') {
            // Handle ARCE Situation question type specially
            if (q.type === 'arce_situation') {
              let formattedAnswer = studentAnswer
              // If it's a structured ARCE answer object
              if (typeof studentAnswer === 'object' && studentAnswer.type === 'arce_structured') {
                formattedAnswer = studentAnswer.fullText || JSON.stringify(studentAnswer)
              }
              
              questionsForAssessment.push({
                questionId: q.id,
                sectionId: section.id,
                phase: section.phase,
                type: q.type,
                situation: q.situation || '',
                task: q.task || '',
                expectedArce: q.expected || null, // Expected answers for each ARCE dimension
                prompt: q.task || q.prompt || '', // Use task as prompt for ARCE questions
                context: q.situation || q.context || '',
                arceFocus: ['analysis', 'reasoning', 'creativity', 'evidence'], // All 4 for ARCE Situation
                maxScore: q.maxScore || 20,
                rubric: q.rubric || null,
                studentAnswer: formattedAnswer
              })
            } else {
              questionsForAssessment.push({
                questionId: q.id,
                sectionId: section.id,
                phase: section.phase,
                type: q.type,
                prompt: q.prompt,
                context: q.context || '',
                arceFocus: q.arceFocus,
                maxScore: q.maxScore || 5,
                rubric: q.rubric || null,
                studentAnswer: studentAnswer
              })
            }
          }
        })
      })

      if (questionsForAssessment.length === 0) {
        return res.status(400).send({ error: 'No answers to assess' })
      }

      // Check if this is an ARCE Evaluate worksheet
      const isArceEvaluateWorksheet = worksheet.metadata?.worksheetType === 'arce_evaluate'
      const hasArceSituations = questionsForAssessment.some(q => q.type === 'arce_situation')

      // Build the appropriate prompt based on worksheet type
      let prompt
      
      if (isArceEvaluateWorksheet || hasArceSituations) {
        // Special assessment prompt for ARCE Evaluate worksheets
        prompt = `คุณเป็นผู้เชี่ยวชาญด้านการประเมินใบงานวัดผล ARCE (Analysis, Reasoning, Creativity, Evidence)

📚 ข้อมูลใบงาน:
- ชื่อใบงาน: ${worksheet.metadata?.title || 'ใบงานวัดผล ARCE'}
- รายวิชา: ${worksheet.metadata?.courseName || ''}
- หัวข้อ: ${worksheet.metadata?.topic || ''}
- ระดับชั้น: ${worksheet.metadata?.gradeLevel || 'ม.4'}

📋 คำตอบของนักเรียนที่ต้องประเมิน:
${questionsForAssessment.map((q, i) => {
  if (q.type === 'arce_situation') {
    return `
[สถานการณ์ที่ ${i + 1}]
📌 สถานการณ์: ${q.situation || q.context || ''}
🎯 ภารกิจ: ${q.task || q.prompt || ''}
📊 คะแนนเต็ม: ${q.maxScore} คะแนน (5 คะแนนต่อด้าน ARCE)
${q.expectedArce ? `
✅ เกณฑ์การประเมิน (Expected_ARCE):
- Expected_A (การวิเคราะห์ที่คาดหวัง): ${q.expectedArce.analysis || 'ไม่ระบุ'}
- Expected_R (เหตุผลที่คาดหวัง): ${q.expectedArce.reasoning || 'ไม่ระบุ'}
- Expected_C (ความสร้างสรรค์ที่คาดหวัง): ${q.expectedArce.creativity || 'ไม่ระบุ'}
- Expected_E (หลักฐานที่คาดหวัง): ${q.expectedArce.evidence || 'ไม่ระบุ'}` : ''}

📝 คำตอบของนักเรียน:
"""${q.studentAnswer}"""`
  } else {
    return `
[คำถามที่ ${i + 1}]
- คำถาม: ${q.prompt}
${q.context ? `- บริบท: ${q.context}` : ''}
- ประเภท: ${q.type}
- คะแนนเต็ม: ${q.maxScore}
- คำตอบนักเรียน: """${typeof q.studentAnswer === 'object' ? JSON.stringify(q.studentAnswer) : q.studentAnswer}"""`
  }
}).join('\n---\n')}

🎯 วิธีการประเมิน ARCE (แต่ละด้าน 0-5 คะแนน):
สำหรับคำถามประเภท ARCE Situation ให้ประเมินแยกแต่ละด้าน:

**A - Analysis (การวิเคราะห์):** 
- 5 = วิเคราะห์ได้ลึกซึ้ง ครอบคลุม แยกแยะประเด็นได้ครบถ้วน
- 4 = วิเคราะห์ได้ดี มีประเด็นสำคัญครบ
- 3 = วิเคราะห์ได้พอสมควร ยังขาดบางประเด็น
- 2 = วิเคราะห์ได้บางส่วน ไม่ครบถ้วน
- 1 = พยายามวิเคราะห์แต่ยังไม่ตรงประเด็น
- 0 = ไม่ได้วิเคราะห์

**R - Reasoning (การให้เหตุผล):**
- 5 = อ้างเหตุผล/หลักการได้ชัดเจน ถูกต้อง มีตรรกะดีเยี่ยม
- 4 = อ้างเหตุผลได้ดี มีหลักการสนับสนุน
- 3 = มีเหตุผลพอสมควร แต่ยังไม่ชัดเจนบางส่วน
- 2 = มีเหตุผลบ้าง แต่ยังไม่เพียงพอ
- 1 = พยายามให้เหตุผลแต่ยังไม่ถูกต้อง
- 0 = ไม่ได้ให้เหตุผล

**C - Creativity (ความคิดสร้างสรรค์):**
- 5 = มีความคิดริเริ่มโดดเด่น นำเสนอแนวทางใหม่ที่น่าสนใจมาก
- 4 = มีความคิดสร้างสรรค์ดี นำเสนอได้น่าสนใจ
- 3 = มีความคิดสร้างสรรค์พอสมควร
- 2 = มีความคิดบ้าง แต่ยังไม่โดดเด่น
- 1 = พยายามนำเสนอแต่ยังไม่ชัดเจน
- 0 = ไม่แสดงความคิดสร้างสรรค์

**E - Evidence (หลักฐาน):**
- 5 = ยกตัวอย่าง/หลักฐานได้ครบถ้วน ชัดเจน น่าเชื่อถือมาก
- 4 = มีหลักฐานดี ยกตัวอย่างได้เหมาะสม
- 3 = มีหลักฐานบางส่วน ยกตัวอย่างได้พอสมควร
- 2 = มีหลักฐานบ้าง แต่ยังไม่เพียงพอ
- 1 = พยายามยกตัวอย่างแต่ยังไม่ตรงประเด็น
- 0 = ไม่มีหลักฐานหรือตัวอย่าง

📊 มาตรฐาน PA/DPA:
- ระดับ 4 (ดีมาก): 80-100%
- ระดับ 3 (ดี): 60-79%
- ระดับ 2 (พอใช้): 40-59%
- ระดับ 1 (ต้องปรับปรุง): 0-39%

📝 ตอบเป็น JSON (ห้าม markdown wrapper):
{
  "summary": {
    "totalScore": 0,
    "maxScore": ${worksheet.scoring?.totalPoints || (questionsForAssessment.length * 20)},
    "percentage": 0,
    "paLevel": 1,
    "paLevelText": "ระดับ X: คำอธิบาย",
    "overallFeedback": "สรุปภาพรวมผลงาน กล่าวถึงจุดเด่นและสิ่งที่ควรพัฒนา",
    "recommendation": "ข้อเสนอแนะเชิงปฏิบัติสำหรับการพัฒนาต่อ"
  },
  "arceScores": {
    "analysis": {
      "raw": 0,
      "max": 5,
      "percentage": 0,
      "feedback": "อธิบายทักษะการวิเคราะห์ที่แสดงออก พร้อมยกตัวอย่างจากคำตอบ"
    },
    "reasoning": {
      "raw": 0,
      "max": 5,
      "percentage": 0,
      "feedback": "อธิบายทักษะการให้เหตุผลที่แสดงออก พร้อมยกตัวอย่าง"
    },
    "creativity": {
      "raw": 0,
      "max": 5,
      "percentage": 0,
      "feedback": "อธิบายความคิดสร้างสรรค์ที่แสดงออก พร้อมยกตัวอย่าง"
    },
    "evidence": {
      "raw": 0,
      "max": 5,
      "percentage": 0,
      "feedback": "อธิบายการใช้หลักฐานที่แสดงออก พร้อมยกตัวอย่าง"
    }
  },
  "questionResults": [
    {
      "questionId": "arce_1",
      "sectionId": "section_id",
      "type": "arce_situation",
      "situation": "สถานการณ์ที่กำหนด",
      "task": "ภารกิจที่กำหนด",
      "studentAnswer": "คำตอบของนักเรียน",
      "arceBreakdown": {
        "analysis": {
          "score": 0,
          "feedback": "ประเมินการวิเคราะห์เทียบกับ Expected_A",
          "matchLevel": "เปรียบเทียบกับ Expected_A ได้มาก/น้อยแค่ไหน"
        },
        "reasoning": {
          "score": 0,
          "feedback": "ประเมินการให้เหตุผลเทียบกับ Expected_R",
          "matchLevel": "เปรียบเทียบกับ Expected_R ได้มาก/น้อยแค่ไหน"
        },
        "creativity": {
          "score": 0,
          "feedback": "ประเมินความคิดสร้างสรรค์เทียบกับ Expected_C",
          "matchLevel": "เปรียบเทียบกับ Expected_C ได้มาก/น้อยแค่ไหน"
        },
        "evidence": {
          "score": 0,
          "feedback": "ประเมินหลักฐานเทียบกับ Expected_E",
          "matchLevel": "เปรียบเทียบกับ Expected_E ได้มาก/น้อยแค่ไหน"
        }
      },
      "totalScore": 0,
      "maxScore": 20,
      "passed": false,
      "feedback": "สรุปภาพรวมคำตอบ จุดเด่น-จุดที่ต้องพัฒนา",
      "suggestion": "คำแนะนำเพื่อพัฒนาแต่ละด้าน ARCE"
    }
  ],
  "strengths": [
    "จุดแข็ง 1: อธิบายพร้อมยกตัวอย่างจากคำตอบ",
    "จุดแข็ง 2: ..."
  ],
  "weaknesses": [
    "จุดที่ควรพัฒนา 1: อธิบายพร้อมแนะนำวิธีปรับปรุง",
    "จุดที่ควรพัฒนา 2: ..."
  ],
  "nextSteps": [
    "ขั้นตอนต่อไป 1: คำแนะนำเชิงปฏิบัติที่ทำได้ทันที",
    "ขั้นตอนต่อไป 2: ..."
  ],
  "teacherNotes": "บันทึกสำหรับครู"
}

⚠️ ข้อกำหนดสำคัญ:
1. สำหรับ arce_situation ให้ประเมินแยกทุกด้าน A-R-C-E และรวมคะแนน
2. เปรียบเทียบคำตอบนักเรียนกับ Expected_ARCE ที่กำหนดไว้
3. feedback ต้องเฉพาะเจาะจง อ้างอิงจากคำตอบจริง
4. ทุก feedback เป็นภาษาไทย สุภาพ สร้างสรรค์ ให้กำลังใจ`
      } else {
        // Original assessment prompt for regular worksheets
        prompt = `คุณเป็นผู้เชี่ยวชาญด้านการประเมินทักษะการคิดขั้นสูง (HOTS) ตามเกณฑ์ A.R.C.E., Bloom's Taxonomy และมาตรฐาน PA/DPA

📚 ข้อมูลใบงาน:
- ชื่อใบงาน: ${worksheet.metadata?.title || 'ใบงาน'}
- รายวิชา: ${worksheet.metadata?.courseName || ''}
- หัวข้อ: ${worksheet.metadata?.topic || ''}
- ระดับชั้น: ${worksheet.metadata?.gradeLevel || 'ม.4'}

📋 คำตอบของนักเรียนที่ต้องประเมิน:
${questionsForAssessment.map((q, i) => `
[คำถามที่ ${i + 1}]
- ID: ${q.questionId}
- Section: ${q.sectionId}
- ขั้น 5E: ${q.phase}
- A.R.C.E. Focus: ${q.arceFocus}
- คำถาม: ${q.prompt}
${q.context ? `- บริบท: ${q.context}` : ''}
- ประเภท: ${q.type}
- คะแนนเต็ม: ${q.maxScore}
${q.rubric ? `- เกณฑ์: ${JSON.stringify(q.rubric)}` : ''}
- คำตอบนักเรียน: """${typeof q.studentAnswer === 'object' ? JSON.stringify(q.studentAnswer) : q.studentAnswer}"""
`).join('\n---\n')}

🎯 เกณฑ์การประเมิน A.R.C.E. (แต่ละด้าน 0-5 คะแนน):
- Analysis (การวิเคราะห์): แยกแยะประเด็น วิเคราะห์องค์ประกอบ หาความสัมพันธ์
- Reasoning (การให้เหตุผล): อธิบายเหตุผล เชื่อมโยงหลักการ สรุปอย่างมีตรรกะ
- Creativity (ความคิดสร้างสรรค์): เสนอมุมมองใหม่ ออกแบบวิธีการใหม่ คิดนอกกรอบ
- Evidence (การใช้หลักฐาน): อ้างอิงข้อมูล ยกตัวอย่าง ใช้หลักฐานสนับสนุน

🧠 ระดับ Bloom's Taxonomy (1-6):
1 = Remember (จำ): ระลึก จำได้ ท่องจำ
2 = Understand (เข้าใจ): อธิบาย ตีความ สรุปความ
3 = Apply (ประยุกต์ใช้): ใช้ความรู้ในสถานการณ์ใหม่
4 = Analyze (วิเคราะห์): แยกแยะ หาความสัมพันธ์ เปรียบเทียบ
5 = Evaluate (ประเมิน): ตัดสินคุณค่า วิพากษ์ ให้เหตุผลสนับสนุน
6 = Create (สร้างสรรค์): ออกแบบ สร้างสิ่งใหม่ ประดิษฐ์

📊 มาตรฐาน PA/DPA:
- ระดับ 4 (ดีมาก): 80-100% - แสดงความเข้าใจลึกซึ้ง มีความคิดสร้างสรรค์โดดเด่น
- ระดับ 3 (ดี): 60-79% - แสดงความเข้าใจดี มีการวิเคราะห์และประยุกต์ใช้
- ระดับ 2 (พอใช้): 40-59% - แสดงความเข้าใจพื้นฐาน ยังต้องพัฒนา
- ระดับ 1 (ต้องปรับปรุง): 0-39% - ยังไม่แสดงความเข้าใจ ต้องการการช่วยเหลือ

📝 ตอบเป็น JSON (ห้าม markdown wrapper):
{
  "summary": {
    "totalScore": 0,
    "maxScore": ${worksheet.scoring?.totalPoints || 20},
    "percentage": 0,
    "paLevel": 1,
    "paLevelText": "ระดับ X: คำอธิบาย",
    "overallFeedback": "สรุปภาพรวมผลงาน 2-3 ประโยค กล่าวถึงจุดเด่นและสิ่งที่ควรพัฒนา",
    "recommendation": "ข้อเสนอแนะเชิงปฏิบัติสำหรับการพัฒนาต่อ"
  },
  "arceScores": {
    "analysis": {
      "raw": 0,
      "max": 5,
      "percentage": 0,
      "feedback": "อธิบายทักษะการวิเคราะห์ที่แสดงออก พร้อมยกตัวอย่างจากคำตอบ"
    },
    "reasoning": {
      "raw": 0,
      "max": 5,
      "percentage": 0,
      "feedback": "อธิบายทักษะการให้เหตุผลที่แสดงออก พร้อมยกตัวอย่าง"
    },
    "creativity": {
      "raw": 0,
      "max": 5,
      "percentage": 0,
      "feedback": "อธิบายความคิดสร้างสรรค์ที่แสดงออก พร้อมยกตัวอย่าง"
    },
    "evidence": {
      "raw": 0,
      "max": 5,
      "percentage": 0,
      "feedback": "อธิบายการใช้หลักฐานที่แสดงออก พร้อมยกตัวอย่าง"
    }
  },
  "questionResults": [
    {
      "questionId": "q1",
      "sectionId": "section_id",
      "question": "ข้อความคำถาม",
      "studentAnswer": "คำตอบของนักเรียน",
      "score": 0,
      "maxScore": 5,
      "passed": false,
      "bloomLevel": 4,
      "bloomName": "Analyze (วิเคราะห์)",
      "arceFocus": "analysis",
      "feedback": "ข้อเสนอแนะเฉพาะข้อนี้ - อธิบายว่าทำได้ดีอะไร และควรปรับปรุงอะไร",
      "suggestion": "คำแนะนำเพื่อพัฒนา ถ้าไม่ผ่านเกณฑ์"
    }
  ],
  "bloomAnalysis": {
    "dominantLevel": 4,
    "levelBreakdown": {
      "1": { "count": 0, "avgScore": 0 },
      "2": { "count": 0, "avgScore": 0 },
      "3": { "count": 0, "avgScore": 0 },
      "4": { "count": 0, "avgScore": 0 },
      "5": { "count": 0, "avgScore": 0 },
      "6": { "count": 0, "avgScore": 0 }
    },
    "insight": "วิเคราะห์ระดับการคิดของนักเรียน เช่น 'นักเรียนแสดงทักษะการวิเคราะห์ได้ดี แต่ยังต้องพัฒนาการประเมินและสร้างสรรค์'"
  },
  "strengths": [
    "จุดแข็ง 1: อธิบายพร้อมยกตัวอย่างจากคำตอบ",
    "จุดแข็ง 2: ..."
  ],
  "weaknesses": [
    "จุดที่ควรพัฒนา 1: อธิบายพร้อมแนะนำวิธีปรับปรุง",
    "จุดที่ควรพัฒนา 2: ..."
  ],
  "nextSteps": [
    "ขั้นตอนต่อไป 1: คำแนะนำเชิงปฏิบัติที่ทำได้ทันที",
    "ขั้นตอนต่อไป 2: ..."
  ],
  "teacherNotes": "บันทึกสำหรับครู - ข้อสังเกตพิเศษ จุดที่ควรให้ความช่วยเหลือ หรือศักยภาพที่เห็น"
}

⚠️ ข้อกำหนดสำคัญ:
1. ประเมิน bloomLevel ของแต่ละคำถามตามลักษณะการคิดที่คำถามต้องการ (1-6)
2. questionResults ต้องมีครบทุกข้อที่นักเรียนตอบ
3. feedback ต้องเฉพาะเจาะจง อ้างอิงจากคำตอบจริง ไม่ใช่คำกว้างๆ
4. strengths/weaknesses ต้องยกตัวอย่างจากคำตอบ
5. nextSteps ต้องเป็นสิ่งที่นักเรียนทำได้จริงเพื่อพัฒนาตัวเอง
6. teacherNotes สำหรับครูใช้วางแผนช่วยเหลือนักเรียน
7. ทุก feedback เป็นภาษาไทย สุภาพ สร้างสรรค์ ให้กำลังใจ`
      } // End of else block for regular worksheets

      // Use appropriate system message based on worksheet type
      const systemMessage = (isArceEvaluateWorksheet || hasArceSituations)
        ? `คุณเป็นผู้เชี่ยวชาญประเมินใบงานวัดผล ARCE ที่:
1. ประเมินแยกทุกด้าน A-R-C-E อย่างละเอียด
2. เปรียบเทียบคำตอบกับ Expected_ARCE ที่กำหนดไว้
3. ให้ feedback ที่สร้างสรรค์ เป็นกำลังใจ
4. ระบุจุดแข็ง/จุดอ่อนอย่างเฉพาะเจาะจงในแต่ละด้าน
5. แนะนำวิธีพัฒนาแต่ละด้าน ARCE อย่างเป็นรูปธรรม
ตอบเป็น JSON ภาษาไทยเท่านั้น`
        : `คุณเป็นผู้เชี่ยวชาญประเมินทักษะ HOTS ที่:
1. ประเมินอย่างยุติธรรม ตามหลักฐานในคำตอบ
2. ให้ feedback ที่สร้างสรรค์ เป็นกำลังใจ
3. ระบุจุดแข็ง/จุดอ่อนอย่างเฉพาะเจาะจง
4. แนะนำอย่างเป็นรูปธรรม ทำได้จริง
5. เข้าใจมาตรฐาน PA/DPA ของไทย
ตอบเป็น JSON ภาษาไทยเท่านั้น`

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })

      const responseText = completion.choices[0].message.content
      let assessmentResult
      try {
        let cleanedText = responseText.trim()
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        assessmentResult = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse assessment JSON:', responseText)
        return res.status(500).send({ error: 'Failed to parse AI response' })
      }

      // 🎯 LO Assessment: Evaluate Learning Outcomes if worksheet has LOs
      let loAssessment = { passedLOs: [], analysis: 'ไม่มี Learning Outcomes สำหรับประเมิน' }
      const worksheetLOs = worksheet.metadata?.learningOutcomes || []
      
      if (worksheetLOs.length > 0 && assessmentResult.arceScores) {
        // Combine all student answers for LO assessment
        const allAnswers = questionsForAssessment
          .map(q => `คำถาม: ${q.prompt}\nคำตอบ: ${typeof q.studentAnswer === 'object' ? JSON.stringify(q.studentAnswer) : q.studentAnswer}`)
          .join('\n\n---\n\n')
        
        // Build rubric scores for LO assessment (use average from ARCE scores)
        const rubricScores = {
          analysis: assessmentResult.arceScores.analysis?.raw || 0,
          reasoning: assessmentResult.arceScores.reasoning?.raw || 0,
          creativity: assessmentResult.arceScores.creativity?.raw || 0,
          evidence: assessmentResult.arceScores.evidence?.raw || 0
        }
        
        console.log('🎓 Worksheet LO Assessment - Input:', {
          worksheetId,
          loCount: worksheetLOs.length,
          rubricScores
        })
        
        // Call the shared LO assessment function
        loAssessment = await assessLearningOutcomesInternal(allAnswers, worksheetLOs, { rubricScores })
        
        console.log('✅ Worksheet LO Assessment - Result:', {
          passedLOs: loAssessment.passedLOs,
          analysisPreview: (loAssessment.analysis || '').substring(0, 100)
        })
      }
      
      // Add LO assessment to result
      assessmentResult.loAssessment = loAssessment

      // Save assessment to submission if submissionId provided
      if (submissionId) {
        await db.collection('worksheetSubmissions').doc(submissionId).update({
          assessment: assessmentResult,
          loAssessment: loAssessment,
          status: 'graded',
          gradedAt: admin.firestore.FieldValue.serverTimestamp()
        })

        // Get submission data for student progress update
        const submissionDoc = await db.collection('worksheetSubmissions').doc(submissionId).get()
        const submissionData = submissionDoc.data()

        // Update student progress with this assessment
        if (submissionData?.studentId && submissionData?.courseId) {
          const progressRef = db.collection('studentProgress').doc(`${submissionData.studentId}_${submissionData.courseId}`)
          const progressDoc = await progressRef.get()
          
          // Determine score mode from retrySettings
          const scoreMode = retrySettings?.scoreMode || worksheet.retrySettings?.scoreMode || 'best'
          const currentAttempt = attemptNumber || 1
          const currentScore = assessmentResult.summary.totalScore

          const worksheetAssessment = {
            worksheetId,
            submissionId,
            score: assessmentResult.summary.totalScore,
            maxScore: assessmentResult.summary.maxScore,
            percentage: assessmentResult.summary.percentage,
            paLevel: assessmentResult.summary.paLevel,
            arceScores: {
              analysis: assessmentResult.arceScores.analysis.raw,
              reasoning: assessmentResult.arceScores.reasoning.raw,
              creativity: assessmentResult.arceScores.creativity.raw,
              evidence: assessmentResult.arceScores.evidence.raw
            },
            // 🎯 Store LO assessment with worksheet assessment
            passedLOs: loAssessment.passedLOs || [],
            loAnalysis: loAssessment.analysis || '',
            // 🔄 Retry tracking
            attemptNumber: currentAttempt,
            scoreMode: scoreMode,
            assessedAt: new Date().toISOString()
          }

          if (progressDoc.exists) {
            const currentData = progressDoc.data()
            const currentPassedLOs = currentData.passedLOs || []
            // 🎯 Merge new passed LOs with existing ones
            const newPassedLOs = loAssessment.passedLOs || []
            const updatedPassedLOs = [...new Set([...currentPassedLOs, ...newPassedLOs])]
            
            // 🔄 Calculate recorded score based on score mode
            const worksheetScores = currentData.worksheetScores || {}
            const existingScoreData = worksheetScores[worksheetId] || { 
              bestScore: 0, 
              latestScore: 0, 
              firstScore: currentScore,
              attemptCount: 0,
              totalScore: 0 
            }
            
            const newBestScore = Math.max(existingScoreData.bestScore || 0, currentScore)
            const newAttemptCount = (existingScoreData.attemptCount || 0) + 1
            const newTotalScore = (existingScoreData.totalScore || 0) + currentScore
            const avgScore = newTotalScore / newAttemptCount
            
            // Determine which score to record based on mode
            let recordedScore
            switch (scoreMode) {
              case 'best':
                recordedScore = newBestScore
                break
              case 'latest':
                recordedScore = currentScore
                break
              case 'average':
                recordedScore = avgScore
                break
              case 'first':
                recordedScore = existingScoreData.firstScore || currentScore
                break
              default:
                recordedScore = newBestScore
            }
            
            // Update worksheet scores tracking
            worksheetScores[worksheetId] = {
              bestScore: newBestScore,
              latestScore: currentScore,
              firstScore: existingScoreData.firstScore || currentScore,
              attemptCount: newAttemptCount,
              totalScore: newTotalScore,
              avgScore: avgScore,
              recordedScore: recordedScore,
              scoreMode: scoreMode,
              lastAttemptAt: new Date().toISOString()
            }
            
            await progressRef.update({
              worksheetAssessments: admin.firestore.FieldValue.arrayUnion(worksheetAssessment),
              worksheetScores: worksheetScores,
              passedLOs: updatedPassedLOs,
              lastAssessedAt: admin.firestore.FieldValue.serverTimestamp()
            })
          } else {
            // First submission - initialize everything
            const worksheetScores = {}
            worksheetScores[worksheetId] = {
              bestScore: currentScore,
              latestScore: currentScore,
              firstScore: currentScore,
              attemptCount: 1,
              totalScore: currentScore,
              avgScore: currentScore,
              recordedScore: currentScore,
              scoreMode: scoreMode,
              lastAttemptAt: new Date().toISOString()
            }
            
            await progressRef.set({
              studentId: submissionData.studentId,
              courseId: submissionData.courseId,
              worksheetAssessments: [worksheetAssessment],
              worksheetScores: worksheetScores,
              passedLOs: loAssessment.passedLOs || [],
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              lastAssessedAt: admin.firestore.FieldValue.serverTimestamp()
            })
          }

          // 📊 Log Learning Event for research data (non-blocking)
          logLearningEvent(db, {
            studentId: submissionData.studentId,
            courseId: submissionData.courseId,
            eventType: EVENT_TYPES.WORKSHEET_SUBMISSION,
            rubricScores: worksheetAssessment.arceScores,
            passedLOs: loAssessment.passedLOs || [],
            metadata: {
              worksheetId,
              submissionId,
              score: assessmentResult.summary.totalScore,
              maxScore: assessmentResult.summary.maxScore,
              percentage: assessmentResult.summary.percentage,
              paLevel: assessmentResult.summary.paLevel,
              attemptNumber: currentAttempt,
              scoreMode: scoreMode
            }
          }).catch(err => console.error('Failed to log worksheet learning event:', err))
          
          // 📈 Update Growth History (non-blocking)
          updateGrowthHistory(db, {
            studentId: submissionData.studentId,
            courseId: submissionData.courseId,
            rubricScores: worksheetAssessment.arceScores,
            source: 'worksheet',
            metadata: { 
              worksheetId, 
              submissionId, 
              attemptNumber: currentAttempt,
              scoreMode: scoreMode
            }
          }).catch(err => console.error('Failed to update worksheet growth history:', err))
        }

        // Update worksheet stats
        await updateWorksheetStats(worksheetId, assessmentResult.summary)
      }

      return res.status(200).send({
        success: true,
        assessment: assessmentResult
      })

    } catch (error) {
      console.error('❌ Error assessing worksheet:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

// Helper function to update worksheet statistics
async function updateWorksheetStats(worksheetId, summary) {
  try {
    const wsRef = db.collection('eWorksheets').doc(worksheetId)
    const wsDoc = await wsRef.get()
    
    if (wsDoc.exists) {
      const currentStats = wsDoc.data().stats || { totalSubmitted: 0, averageScore: 0, passRate: 0 }
      const newTotal = currentStats.totalSubmitted + 1
      const newAverage = ((currentStats.averageScore * currentStats.totalSubmitted) + summary.percentage) / newTotal
      const passed = summary.percentage >= 60 ? 1 : 0
      const newPassRate = ((currentStats.passRate * currentStats.totalSubmitted) + (passed * 100)) / newTotal

      await wsRef.update({
        'stats.totalSubmitted': newTotal,
        'stats.averageScore': Math.round(newAverage * 100) / 100,
        'stats.passRate': Math.round(newPassRate * 100) / 100,
        'stats.lastSubmissionAt': admin.firestore.FieldValue.serverTimestamp()
      })
    }
  } catch (error) {
    console.error('Error updating worksheet stats:', error)
  }
}

/**
 * Get Teacher Worksheet Reports
 * รายงานผลการทำใบงานสำหรับครู
 */
exports.getWorksheetReports = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { teacherId, courseId, worksheetId, roomId, dateRange } = req.body

      if (!teacherId) {
        return res.status(400).send({ error: 'Missing required: teacherId' })
      }

      let query = db.collection('worksheetSubmissions')
        .where('status', '==', 'graded')

      // Apply filters
      if (worksheetId) {
        query = query.where('worksheetId', '==', worksheetId)
      }
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }

      const submissionsSnap = await query.orderBy('submittedAt', 'desc').limit(100).get()

      if (submissionsSnap.empty) {
        return res.status(200).send({
          success: true,
          report: {
            totalSubmissions: 0,
            submissions: [],
            summary: null
          }
        })
      }

      const submissions = []
      let totalScore = 0
      let totalMaxScore = 0
      const arceAggregated = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
      const paLevelCounts = { 1: 0, 2: 0, 3: 0, 4: 0 }

      for (const doc of submissionsSnap.docs) {
        const data = doc.data()
        const assessment = data.assessment

        if (assessment) {
          submissions.push({
            id: doc.id,
            studentId: data.studentId,
            studentData: data.studentData,
            worksheetId: data.worksheetId,
            score: assessment.summary.totalScore,
            maxScore: assessment.summary.maxScore,
            percentage: assessment.summary.percentage,
            paLevel: assessment.summary.paLevel,
            arceScores: assessment.arceScores,
            strengths: assessment.strengths,
            weaknesses: assessment.weaknesses,
            submittedAt: data.submittedAt,
            gradedAt: data.gradedAt
          })

          totalScore += assessment.summary.totalScore
          totalMaxScore += assessment.summary.maxScore
          
          arceAggregated.analysis += assessment.arceScores.analysis.raw || 0
          arceAggregated.reasoning += assessment.arceScores.reasoning.raw || 0
          arceAggregated.creativity += assessment.arceScores.creativity.raw || 0
          arceAggregated.evidence += assessment.arceScores.evidence.raw || 0

          if (assessment.summary.paLevel >= 1 && assessment.summary.paLevel <= 4) {
            paLevelCounts[assessment.summary.paLevel]++
          }
        }
      }

      const count = submissions.length
      const summary = count > 0 ? {
        totalSubmissions: count,
        averageScore: Math.round((totalScore / count) * 100) / 100,
        averagePercentage: Math.round(((totalScore / totalMaxScore) * 100) * 100) / 100,
        arceAverages: {
          analysis: Math.round((arceAggregated.analysis / count) * 100) / 100,
          reasoning: Math.round((arceAggregated.reasoning / count) * 100) / 100,
          creativity: Math.round((arceAggregated.creativity / count) * 100) / 100,
          evidence: Math.round((arceAggregated.evidence / count) * 100) / 100
        },
        paLevelDistribution: paLevelCounts,
        passRate: Math.round(((paLevelCounts[3] + paLevelCounts[4]) / count) * 100 * 100) / 100
      } : null

      return res.status(200).send({
        success: true,
        report: {
          totalSubmissions: count,
          submissions,
          summary
        }
      })

    } catch (error) {
      console.error('❌ Error getting worksheet reports:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

// ===== KNOWLEDGE SHEET GENERATOR =====
// ระบบสร้างใบความรู้จากการวิเคราะห์แผนการสอน
// โครงสร้างข้อมูลต้องตรงกับ KnowledgeSheetView.vue
// ✨ ปรับปรุง: รับ context จากใบความรู้หน่วยและแผนอื่นเพื่อไม่ซ้ำ
// ===== HELPER: Retry with Exponential Backoff =====
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1
      const isRetryable = error.status === 429 || error.status >= 500 || error.code === 'ECONNRESET'
      
      if (isLastAttempt || !isRetryable) {
        throw error
      }
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

// ===== HELPER: Validate Knowledge Sheet Structure =====
function validateKnowledgeSheet(data) {
  const errors = []
  const warnings = []
  
  // Required fields
  if (!data.metadata?.title) errors.push('Missing metadata.title')
  if (!data.sections || data.sections.length < 2) errors.push('Sections must have at least 2 items')
  if (!data.objectives?.mainObjective) warnings.push('Missing main objective')
  if (!data.vocabulary || data.vocabulary.length < 3) warnings.push('Should have at least 3 vocabulary items')
  if (!data.hotsIntegration?.analysisQuestions?.length) warnings.push('Missing analysis questions')
  if (!data.hotsIntegration?.reasoningQuestions?.length) warnings.push('Missing reasoning questions')
  if (!data.selfCheck?.questions?.length) warnings.push('Missing self-check questions')
  if (!data.summary?.keyTakeaways?.length) warnings.push('Missing key takeaways')
  
  // Validate sections content
  data.sections?.forEach((section, idx) => {
    if (!section.content?.mainContent || section.content.mainContent.length < 100) {
      warnings.push(`Section ${idx + 1} content is too short`)
    }
    if (!section.content?.keyPoints?.length) {
      warnings.push(`Section ${idx + 1} missing key points`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5))
  }
}

// ===== HELPER: Auto-fix Common Issues =====
function autoFixKnowledgeSheet(data, topic) {
  // Ensure metadata exists
  if (!data.metadata) {
    data.metadata = { title: `ใบความรู้: ${topic}`, generatedBy: 'AI' }
  }
  
  // Ensure objectives exists
  if (!data.objectives) {
    data.objectives = {
      mainObjective: `เพื่อให้นักเรียนเข้าใจเรื่อง ${topic}`,
      subObjectives: []
    }
  }
  
  // Ensure introduction exists
  if (!data.introduction) {
    data.introduction = {
      hook: `ทำไมเราต้องเรียนรู้เรื่อง ${topic}?`,
      overview: `ในใบความรู้นี้ เราจะเรียนรู้เกี่ยวกับ ${topic}`,
      priorKnowledge: []
    }
  }
  
  // Ensure sections is array
  if (!Array.isArray(data.sections)) {
    data.sections = []
  }
  
  // Ensure vocabulary is array with at least 3 items
  if (!Array.isArray(data.vocabulary) || data.vocabulary.length < 3) {
    data.vocabulary = data.vocabulary || []
  }
  
  // Ensure hotsIntegration exists
  if (!data.hotsIntegration) {
    data.hotsIntegration = {
      analysisQuestions: [],
      reasoningQuestions: [],
      creativityQuestions: [],
      evidenceQuestions: []
    }
  }
  
  // Ensure selfCheck exists
  if (!data.selfCheck) {
    data.selfCheck = { questions: [], trueOrFalse: [] }
  }
  
  // Ensure summary exists
  if (!data.summary) {
    data.summary = { keyTakeaways: [], mindMap: { central: topic, branches: [] } }
  }
  
  return data
}

exports.generateKnowledgeSheet = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 180,
  memory: '1GB'
}).https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
      }

      const {
        lessonPlanId,
        teacherId,
        courseId,
        courseCode,
        courseName,
        gradeLevel,
        unitNumber,
        unitName,
        planNumber,
        topic,
        objectives,
        essentialContent,
        learningContent,
        activities5E,
        targetLOs,
        standard,
        indicators,
        fullLessonPlan,
        // Options
        style = 'comprehensive',
        language = 'thai',
        createRoom = false,
        roomId = null,
        // ✨ Standalone mode: สร้างใบความรู้โดยไม่ต้องมีแผนการสอน
        standaloneMode = false,
        standaloneContent = null, // { topic, description, keyPoints, ... }
        // ✨ Context from other sheets to avoid duplication
        unitKnowledgeSheetId = null,
        otherPlansInUnit = [],
        planGuidance = null,
        // ✨ Retry settings
        maxRetries = 3
      } = req.body

      // Support standalone mode (no lesson plan required)
      const effectiveTopic = topic || standaloneContent?.topic
      
      if (!effectiveTopic) {
        return res.status(400).json({ error: 'Topic is required (either from lessonPlan or standaloneContent)' })
      }

      console.log('📖 Generating Knowledge Sheet for:', effectiveTopic, standaloneMode ? '(standalone)' : '')

      // ✨ Standalone mode: สร้าง context จาก standaloneContent
      let standaloneContext = ''
      if (standaloneMode && standaloneContent) {
        standaloneContext = `
## 📝 เนื้อหาที่ต้องการสร้างใบความรู้ (Standalone Mode):
- หัวข้อ: ${standaloneContent.topic}
- คำอธิบาย: ${standaloneContent.description || 'ไม่ระบุ'}
- ประเด็นสำคัญ: ${(standaloneContent.keyPoints || []).join(', ') || 'ไม่ระบุ'}
- ระดับ Bloom ที่ต้องการ: ${standaloneContent.bloomLevels?.join(', ') || '1-4'}
- A.R.C.E. ที่เน้น: ${standaloneContent.arceFocus?.join(', ') || 'analysis, reasoning'}
`
      }

      // ✨ ดึง context จากใบความรู้หน่วย (ถ้ามี)
      let unitContext = ''
      if (unitKnowledgeSheetId) {
        try {
          const unitKsDoc = await admin.firestore().collection('unitKnowledgeSheets').doc(unitKnowledgeSheetId).get()
          if (unitKsDoc.exists()) {
            const unitKs = unitKsDoc.data()
            const coreConcepts = typeof unitKs.coreConcepts === 'string' ? JSON.parse(unitKs.coreConcepts) : unitKs.coreConcepts
            const planGuidanceFromUnit = typeof unitKs.planGuidance === 'string' ? JSON.parse(unitKs.planGuidance) : unitKs.planGuidance
            
            // หา guidance สำหรับแผนนี้โดยเฉพาะ
            const thisGuidance = planGuidanceFromUnit?.find(g => g.planNumber === planNumber)
            
            unitContext = `
## 📚 Context จากใบความรู้รวมหน่วย:

### แนวคิดหลักของหน่วย (Core Concepts):
${coreConcepts?.map(c => `- ${c.name}: ${c.description}`).join('\n') || 'ไม่ระบุ'}

### แนวทางสำหรับแผนที่ ${planNumber}:
${thisGuidance ? `
- **เนื้อหาที่ควรเน้น**: ${thisGuidance.focusAreas?.join(', ') || '-'}
- **สิ่งที่ไม่ต้องสอนซ้ำ** (เพราะอยู่ในแผนอื่น): ${thisGuidance.avoidDuplication?.join(', ') || '-'}
- **ความรู้พื้นฐานที่ต้องอ้างอิง**: ${thisGuidance.prerequisiteFromUnit?.join(', ') || '-'}
- **จุดเด่นเฉพาะของแผนนี้**: ${thisGuidance.uniqueContribution || '-'}
` : 'ไม่มีแนวทางเฉพาะ'}
`
          }
        } catch (err) {
          console.warn('Could not fetch unit knowledge sheet:', err.message)
        }
      }

      // ✨ สร้าง context จากแผนอื่นในหน่วยเดียวกัน (เพื่อให้เน้นจุดเด่นต่างกัน ไม่ใช่ตัดเนื้อหาออก)
      let otherPlansContext = ''
      if (otherPlansInUnit?.length > 0) {
        otherPlansContext = `
## 📚 แผนอื่นในหน่วยเดียวกัน (สำหรับอ้างอิง):
${otherPlansInUnit.map(p => `- แผนที่ ${p.planNumber}: ${p.topic}`).join('\n')}

**หลักการสำคัญ**: 
1. ใบความรู้นี้ต้อง **ครบถ้วน** ตามเนื้อหาของแผนที่ ${planNumber}
2. ห้ามตัดเนื้อหาสำคัญออก แม้จะอยู่ในแผนอื่นด้วย
3. ให้เน้น "จุดเด่นเฉพาะ" และ "มุมมองที่ต่าง" จากแผนอื่น
4. ถ้ามีเนื้อหาพื้นฐานที่ต้องอ้างอิง ให้อธิบายย่อและอ้างอิงไปแผนที่เกี่ยวข้อง
`
      }

      // สร้าง context จากกิจกรรม 5E
      let activities5EText = ''
      if (activities5E) {
        const phaseNames = {
          engagement: 'กระตุ้นความสนใจ',
          exploration: 'สำรวจค้นหา',
          explanation: 'อธิบายความรู้',
          elaboration: 'ขยายความเข้าใจ',
          evaluation: 'ประเมินผล'
        }
        for (const phase of ['engagement', 'exploration', 'explanation', 'elaboration', 'evaluation']) {
          if (activities5E[phase]) {
            const act = activities5E[phase]
            activities5EText += `\n${phaseNames[phase]}: ${act.activity || act.description || JSON.stringify(act)}`
          }
        }
      }

      // สร้าง context จาก objectives
      let objectivesText = ''
      if (objectives) {
        if (typeof objectives === 'object' && !Array.isArray(objectives)) {
          if (objectives.knowledge?.length) objectivesText += `\nความรู้ (K): ${objectives.knowledge.join(', ')}`
          if (objectives.process?.length) objectivesText += `\nทักษะ (P): ${objectives.process.join(', ')}`
          if (objectives.attitude?.length) objectivesText += `\nเจตคติ (A): ${objectives.attitude.join(', ')}`
        } else if (Array.isArray(objectives)) {
          objectivesText = objectives.join(', ')
        }
      }

      // สร้าง context จาก learningContent
      let learningContentText = ''
      if (learningContent) {
        if (Array.isArray(learningContent)) {
          learningContentText = learningContent.map((c, i) => `${i + 1}. ${typeof c === 'string' ? c : c.title || c.content || JSON.stringify(c)}`).join('\n')
        } else if (typeof learningContent === 'object') {
          learningContentText = JSON.stringify(learningContent, null, 2)
        } else {
          learningContentText = learningContent
        }
      }

      const prompt = `คุณเป็นครูผู้เชี่ยวชาญด้านการสร้างใบความรู้ที่มีคุณภาพสูง

## 📋 ข้อมูลแผนการสอน

**รายวิชา:** ${courseCode || ''} ${courseName || topic}
**ระดับชั้น:** ${gradeLevel || 'ม.4'}
**หน่วยที่ ${unitNumber || 1}:** ${unitName || topic}
**แผนที่ ${planNumber || 1}:** ${topic}

**สาระสำคัญ:**
${essentialContent || 'ตามหัวข้อที่กำหนด'}

**จุดประสงค์การเรียนรู้:**
${objectivesText || 'ตามแผนการสอน'}

**เนื้อหาการเรียนรู้:**
${learningContentText || 'ตามหัวข้อที่กำหนด'}

**กิจกรรม 5E:**
${activities5EText || 'ไม่ระบุ'}

${unitContext}

${otherPlansContext}

---

## 🎯 สร้างใบความรู้ตามโครงสร้างนี้ (JSON):

{
  "metadata": {
    "title": "ใบความรู้ที่ ${planNumber || 1}: ${topic}",
    "courseCode": "${courseCode || ''}",
    "courseName": "${courseName || ''}",
    "unitNumber": ${unitNumber || 1},
    "unitName": "${unitName || ''}",
    "planNumber": ${planNumber || 1},
    "gradeLevel": "${gradeLevel || 'ม.4'}",
    "duration": "50 นาที",
    "focusedContent": true
  },

  "objectives": {
    "mainObjective": "จุดประสงค์หลักที่ชัดเจน 1 ประโยค (หลังศึกษาใบความรู้นี้แล้ว นักเรียนจะสามารถ...)",
    "subObjectives": [
      "นักเรียนสามารถอธิบาย... (ด้านความรู้ K)",
      "นักเรียนสามารถ... (ด้านทักษะ P)",
      "นักเรียนมีเจตคติที่ดีต่อ... (ด้านเจตคติ A)"
    ]
  },

  "introduction": {
    "hook": "คำถามหรือสถานการณ์ที่น่าสนใจเพื่อกระตุ้นความอยากรู้ของนักเรียน (2-3 ประโยค)",
    "overview": "ภาพรวมของเนื้อหาในใบความรู้นี้ว่าจะเรียนรู้อะไรบ้าง (2-3 ประโยค)",
    "priorKnowledge": [
      "ความรู้พื้นฐานที่นักเรียนควรมีก่อน 1",
      "ความรู้พื้นฐานที่นักเรียนควรมีก่อน 2"
    ],
    "connectionToUnit": "เนื้อหานี้เชื่อมโยงกับหน่วยการเรียนรู้อย่างไร"
  },

  "sections": [
    {
      "sectionNumber": 1,
      "title": "หัวข้อย่อยที่ 1 (ระดับ Bloom: จำ/เข้าใจ)",
      "bloomLevel": 1,
      "bloomName": "จำ (Remember)",
      "arceFocus": ["reasoning"],
      "content": {
        "mainContent": "เนื้อหาหลักอธิบายอย่างละเอียด ชัดเจน เข้าใจง่าย (อย่างน้อย 3-4 ย่อหน้า แต่ละย่อหน้า 3-4 ประโยค) เนื้อหาต้องถูกต้องตามหลักวิชาการ มีความลึกซึ้ง ครอบคลุมประเด็นสำคัญ",
        "keyPoints": [
          "ประเด็นสำคัญที่ 1 ที่ต้องจดจำ",
          "ประเด็นสำคัญที่ 2 ที่ต้องจดจำ",
          "ประเด็นสำคัญที่ 3 ที่ต้องจดจำ"
        ],
        "explanation": "คำอธิบายเพิ่มเติมหรือข้อสังเกตสำคัญ"
      },
      "examples": [
        {
          "title": "ตัวอย่างที่ 1: ชื่อตัวอย่าง",
          "scenario": "สถานการณ์ตัวอย่างที่ชัดเจน เกี่ยวข้องกับชีวิตจริง",
          "analysis": "การวิเคราะห์ตัวอย่างนี้",
          "solution": "ผลลัพธ์หรือวิธีแก้"
        }
      ],
      "diagrams": [
        {
          "type": "flowchart",
          "title": "แผนภาพแสดง...",
          "description": "ขั้นตอน: A → B → C → D (อธิบายแต่ละขั้นตอน)"
        }
      ],
      "tables": [
        {
          "title": "ตารางสรุป...",
          "headers": ["หัวข้อ 1", "หัวข้อ 2", "หัวข้อ 3"],
          "rows": [
            ["ข้อมูล 1", "ข้อมูล 2", "ข้อมูล 3"],
            ["ข้อมูล 4", "ข้อมูล 5", "ข้อมูล 6"]
          ]
        }
      ],
      "realWorldApplications": [
        "การนำไปใช้ในชีวิตจริง 1",
        "การนำไปใช้ในชีวิตจริง 2"
      ]
    },
    {
      "sectionNumber": 2,
      "title": "หัวข้อย่อยที่ 2 (ระดับ Bloom: เข้าใจ/ประยุกต์)",
      "bloomLevel": 2,
      "bloomName": "เข้าใจ (Understand)",
      "arceFocus": ["analysis", "reasoning"],
      "content": {
        "mainContent": "เนื้อหาส่วนที่ 2 อธิบายอย่างละเอียด...",
        "keyPoints": ["ประเด็นสำคัญ 1", "ประเด็นสำคัญ 2"],
        "explanation": "คำอธิบายเพิ่มเติม"
      },
      "examples": [],
      "techniques": [
        {
          "name": "เทคนิค/วิธีการที่ 1",
          "description": "คำอธิบายวิธีการ",
          "pros": ["ข้อดี 1", "ข้อดี 2"],
          "cons": ["ข้อจำกัด 1"]
        }
      ]
    },
    {
      "sectionNumber": 3,
      "title": "หัวข้อย่อยที่ 3 (ระดับ Bloom: ประยุกต์/วิเคราะห์)",
      "bloomLevel": 3,
      "bloomName": "ประยุกต์ใช้ (Apply)",
      "arceFocus": ["analysis"],
      "content": {
        "mainContent": "เนื้อหาส่วนที่ 3...",
        "keyPoints": ["ประเด็นสำคัญ 1", "ประเด็นสำคัญ 2"],
        "explanation": "คำอธิบายเพิ่มเติม"
      }
    },
    {
      "sectionNumber": 4,
      "title": "หัวข้อย่อยที่ 4 (ระดับ Bloom: วิเคราะห์/ประเมิน)",
      "bloomLevel": 4,
      "bloomName": "วิเคราะห์ (Analyze)",
      "arceFocus": ["analysis", "evidence"],
      "content": {
        "mainContent": "เนื้อหาส่วนที่ 4 เน้นการวิเคราะห์...",
        "keyPoints": ["ประเด็นสำคัญ 1", "ประเด็นสำคัญ 2"],
        "explanation": "คำอธิบายเพิ่มเติม"
      }
    }
  ],

  "vocabulary": [
    {
      "term": "English Term 1",
      "thai": "คำแปลภาษาไทย",
      "definition": "คำจำกัดความ/ความหมายโดยละเอียด"
    },
    {
      "term": "English Term 2",
      "thai": "คำแปลภาษาไทย",
      "definition": "คำจำกัดความ/ความหมายโดยละเอียด"
    }
  ],

  "hotsIntegration": {
    "analysisQuestions": [
      "คำถามวิเคราะห์ 1: จงวิเคราะห์ว่า... (เริ่มด้วย จง/ให้วิเคราะห์/เปรียบเทียบ/จำแนก)",
      "คำถามวิเคราะห์ 2: จงเปรียบเทียบความแตกต่างระหว่าง..."
    ],
    "reasoningQuestions": [
      "คำถามเหตุผล 1: เหตุใด...จึง... (เริ่มด้วย เหตุใด/ทำไม/อธิบายเหตุผล)",
      "คำถามเหตุผล 2: ถ้า...จะเกิดอะไรขึ้น เพราะเหตุใด"
    ],
    "creativityQuestions": [
      "คำถามสร้างสรรค์ 1: ให้ออกแบบ/คิดวิธีใหม่ในการ... (เริ่มด้วย ออกแบบ/สร้างสรรค์/คิดค้น)",
      "คำถามสร้างสรรค์ 2: ถ้านักเรียนเป็น... จะทำอย่างไร"
    ],
    "evidenceQuestions": [
      "คำถามหลักฐาน 1: ข้อมูลใดที่สนับสนุนว่า... (เริ่มด้วย ข้อมูล/หลักฐาน/พิสูจน์)",
      "คำถามหลักฐาน 2: จะพิสูจน์ได้อย่างไรว่า..."
    ]
  },

  "summary": {
    "keyTakeaways": [
      "สิ่งสำคัญที่ต้องจำ 1 (กระชับ ชัดเจน)",
      "สิ่งสำคัญที่ต้องจำ 2",
      "สิ่งสำคัญที่ต้องจำ 3",
      "สิ่งสำคัญที่ต้องจำ 4"
    ],
    "mindMap": {
      "central": "${topic}",
      "branches": [
        {
          "topic": "หัวข้อย่อย 1",
          "subtopics": ["รายละเอียด 1.1", "รายละเอียด 1.2"]
        },
        {
          "topic": "หัวข้อย่อย 2",
          "subtopics": ["รายละเอียด 2.1", "รายละเอียด 2.2"]
        },
        {
          "topic": "หัวข้อย่อย 3",
          "subtopics": ["รายละเอียด 3.1", "รายละเอียด 3.2"]
        }
      ]
    }
  },

  "selfCheck": {
    "questions": [
      {
        "question": "คำถามทดสอบความเข้าใจ 1 (Bloom ระดับ 1-2)",
        "type": "definition",
        "bloomLevel": 1,
        "hint": "คำใบ้ช่วยคิด",
        "answer": "คำตอบที่ถูกต้อง"
      },
      {
        "question": "คำถามทดสอบความเข้าใจ 2 (Bloom ระดับ 2-3)",
        "type": "open-ended",
        "bloomLevel": 2,
        "hint": "คำใบ้ช่วยคิด",
        "answer": "แนวคำตอบ"
      },
      {
        "question": "คำถามทดสอบความเข้าใจ 3 (Bloom ระดับ 3-4)",
        "type": "open-ended",
        "bloomLevel": 3,
        "hint": "คำใบ้ช่วยคิด"
      }
    ],
    "trueOrFalse": [
      {
        "statement": "ข้อความที่ 1 (ถูกหรือผิด)",
        "answer": true,
        "explanation": "อธิบายว่าทำไมถูก"
      },
      {
        "statement": "ข้อความที่ 2 (ถูกหรือผิด)",
        "answer": false,
        "explanation": "อธิบายว่าทำไมผิด และอะไรคือสิ่งที่ถูกต้อง"
      },
      {
        "statement": "ข้อความที่ 3 (ถูกหรือผิด)",
        "answer": true,
        "explanation": "อธิบายว่าทำไมถูก"
      }
    ]
  },

  "additionalResources": [
    {
      "type": "video",
      "title": "วิดีโอแนะนำ: ชื่อวิดีโอ",
      "description": "คำอธิบายว่าวิดีโอนี้เกี่ยวกับอะไร",
      "duration": "10 นาที"
    },
    {
      "type": "article",
      "title": "บทความ: ชื่อบทความ",
      "description": "คำอธิบายสั้นๆ ว่าบทความนี้มีเนื้อหาอะไร"
    }
  ],

  "connectionTo5E": {
    "engagement": "เนื้อหาส่วน introduction และ hook ใช้กระตุ้นความสนใจในขั้น Engagement",
    "exploration": "เนื้อหา sections ที่ 1-2 ให้ความรู้พื้นฐานสำหรับการสำรวจในขั้น Exploration",
    "explanation": "เนื้อหา sections ที่ 2-3 ช่วยอธิบายแนวคิดหลักในขั้น Explanation",
    "elaboration": "เนื้อหา sections ที่ 3-4 และ hotsIntegration ใช้ขยายความเข้าใจในขั้น Elaboration",
    "evaluation": "selfCheck และ hotsIntegration ใช้ประเมินความเข้าใจในขั้น Evaluation"
  }
}

## 📝 ข้อกำหนดสำคัญ:

1. **เนื้อหาต้องถูกต้องตามหลักวิชาการ** - ข้อมูลทั้งหมดต้องถูกต้อง แม่นยำ
2. **เนื้อหาต้องครบถ้วน** - ห้ามตัดเนื้อหาสำคัญออก แม้จะซ้ำกับแผนอื่น
3. **เน้นจุดเด่นเฉพาะ** - ถ้ามีเนื้อหาที่ซ้ำกับแผนอื่น ให้เน้นมุมมองที่ต่าง หรืออ้างอิงไปแผนที่เกี่ยวข้อง
4. **sections ต้องมีอย่างน้อย 4 หัวข้อ** - ครอบคลุมเนื้อหาสำคัญ
5. **แต่ละ section.content.mainContent ต้องมีเนื้อหาละเอียด** - อย่างน้อย 3-4 ย่อหน้า
6. **hotsIntegration ต้องมีคำถามครบทั้ง 4 ด้าน** - analysis, reasoning, creativity, evidence
7. **selfCheck ต้องมีทั้ง questions และ trueOrFalse** - พร้อมคำตอบและคำอธิบาย
8. **vocabulary ต้องมีคำศัพท์สำคัญอย่างน้อย 5 คำ** - พร้อมความหมายชัดเจน
9. **ภาษาเหมาะกับระดับชั้น ${gradeLevel || 'ม.4'}** - เข้าใจง่าย ชัดเจน
10. **ตอบเป็น JSON เท่านั้น** - ห้ามมี markdown wrapper เช่น \`\`\`json

${standaloneContext}

ตอบ JSON:`

      // ✨ Use retry with exponential backoff
      const openaiResponse = await retryWithBackoff(async () => {
        return openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18',
          messages: [
            {
              role: 'system',
              content: `คุณเป็นผู้เชี่ยวชาญด้านการสร้างสื่อการเรียนการสอนที่มีคุณภาพสูง

หลักการสำคัญ:
1. เนื้อหาต้องถูกต้องตามหลักวิชาการ 100%
2. อธิบายละเอียด ชัดเจน เข้าใจง่าย
3. มีตัวอย่างที่เกี่ยวข้องกับชีวิตจริง
4. ครอบคลุม Bloom's Taxonomy ทุกระดับ
5. ส่งเสริมทักษะการคิดขั้นสูง (HOTS) ตามกรอบ A.R.C.E.

⚠️ สำคัญมาก: ตอบเป็น JSON ที่ถูกต้องเท่านั้น ห้ามมี markdown wrapper
- ห้ามเริ่มด้วย \`\`\`json
- ห้ามลงท้ายด้วย \`\`\`
- เริ่มต้นด้วย { และจบด้วย } เท่านั้น`
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 8000,
          temperature: 0.7
        })
      }, maxRetries)

      let responseText = openaiResponse.choices[0].message.content.trim()
      
      // ✨ Enhanced markdown wrapper cleaning
      if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```(?:json)?\s*\n?/i, '')
        responseText = responseText.replace(/\n?```\s*$/i, '')
      }
      // Also handle case where it starts with ```json\n{
      responseText = responseText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
      
      // ✨ Try to fix common JSON issues
      if (!responseText.startsWith('{')) {
        const jsonStart = responseText.indexOf('{')
        if (jsonStart > -1) {
          responseText = responseText.substring(jsonStart)
        }
      }
      if (!responseText.endsWith('}')) {
        const jsonEnd = responseText.lastIndexOf('}')
        if (jsonEnd > -1) {
          responseText = responseText.substring(0, jsonEnd + 1)
        }
      }

      let knowledgeSheetData
      try {
        knowledgeSheetData = JSON.parse(responseText)
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError.message)
        console.error('Response preview:', responseText.substring(0, 500))
        throw new Error(`Invalid JSON response: ${parseError.message}`)
      }
      
      // Handle nested structure
      if (knowledgeSheetData.knowledgeSheet) {
        knowledgeSheetData = knowledgeSheetData.knowledgeSheet
      }

      // ✨ Auto-fix common issues
      knowledgeSheetData = autoFixKnowledgeSheet(knowledgeSheetData, effectiveTopic)

      // ✨ Validate and log quality score
      const validation = validateKnowledgeSheet(knowledgeSheetData)
      console.log(`📊 Knowledge Sheet Quality Score: ${validation.score}/100`)
      if (validation.warnings.length > 0) {
        console.log('⚠️ Warnings:', validation.warnings.join(', '))
      }
      if (!validation.isValid) {
        console.error('❌ Validation errors:', validation.errors)
        // Don't throw - return with validation info for transparency
      }

      // Add metadata
      const ksId = `ks_${Date.now()}`
      if (knowledgeSheetData.metadata) {
        knowledgeSheetData.metadata.id = ksId
        knowledgeSheetData.metadata.lessonPlanId = lessonPlanId
        knowledgeSheetData.metadata.generatedBy = 'AI'
        knowledgeSheetData.metadata.generatedAt = new Date().toISOString()
      } else {
        knowledgeSheetData.metadata = {
          id: ksId,
          lessonPlanId,
          topic,
          generatedBy: 'AI',
          generatedAt: new Date().toISOString()
        }
      }

      // Flatten complex nested objects for Firestore (sections, hotsIntegration, etc. as JSON strings)
      const firestoreData = {
        ...knowledgeSheetData,
        // Store complex nested arrays/objects as JSON strings to avoid Firestore nesting limits
        sections: JSON.stringify(knowledgeSheetData.sections || []),
        vocabulary: JSON.stringify(knowledgeSheetData.vocabulary || []),
        hotsIntegration: JSON.stringify(knowledgeSheetData.hotsIntegration || {}),
        selfCheck: JSON.stringify(knowledgeSheetData.selfCheck || {}),
        summary: JSON.stringify(knowledgeSheetData.summary || {}),
        additionalResources: JSON.stringify(knowledgeSheetData.additionalResources || []),
        connectionTo5E: JSON.stringify(knowledgeSheetData.connectionTo5E || {}),
        // Flatten introduction if complex
        introduction: typeof knowledgeSheetData.introduction === 'object' 
          ? JSON.stringify(knowledgeSheetData.introduction) 
          : knowledgeSheetData.introduction,
        // Flatten objectives if complex
        objectives: typeof knowledgeSheetData.objectives === 'object'
          ? JSON.stringify(knowledgeSheetData.objectives)
          : knowledgeSheetData.objectives,
        // Keep metadata and header as objects (they're shallow)
        lessonPlanId: lessonPlanId || null,
        teacherId: teacherId || null,
        courseId: courseId || null,
        status: 'published',
        style,
        language,
        // ✨ Add quality metadata
        qualityScore: validation.score,
        validationWarnings: validation.warnings,
        standaloneMode: standaloneMode || false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }

      // Save to Firestore
      const ksRef = await admin.firestore().collection('knowledgeSheets').add(firestoreData)

      // Update lesson plan with knowledge sheet reference (only if not standalone)
      if (lessonPlanId && !standaloneMode) {
        await admin.firestore().collection('lessonPlans').doc(lessonPlanId).update({
          knowledgeSheetId: ksRef.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      // Handle room assignment
      let finalRoomId = roomId
      if (createRoom && !roomId) {
        // Create new room for this course
        const roomData = {
          name: `${courseCode} - ${courseName}`,
          description: `ห้องกิจกรรมสำหรับรายวิชา ${courseName}`,
          courseId,
          teacherId,
          status: 'active',
          knowledgeSheetIds: [ksRef.id],
          worksheetIds: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }
        const roomRef = await admin.firestore().collection('learningRooms').add(roomData)
        finalRoomId = roomRef.id
      } else if (finalRoomId) {
        // Add to existing room
        await admin.firestore().collection('learningRooms').doc(finalRoomId).update({
          knowledgeSheetIds: admin.firestore.FieldValue.arrayUnion(ksRef.id),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      console.log('✅ Knowledge sheet created:', ksRef.id)

      return res.status(200).json({
        success: true,
        knowledgeSheetId: ksRef.id,
        knowledgeSheet: knowledgeSheetData,
        roomId: finalRoomId,
        // ✨ Include quality info
        quality: {
          score: validation.score,
          warnings: validation.warnings,
          isValid: validation.isValid
        },
        standaloneMode: standaloneMode || false
      })

    } catch (error) {
      console.error('❌ Error generating knowledge sheet:', error)
      return res.status(500).json({ 
        error: 'Failed to generate knowledge sheet',
        details: error.message 
      })
    }
  })
})

// ===== UNIT KNOWLEDGE SHEET GENERATOR =====
// สร้างใบความรู้รวมระดับหน่วย - รวบรวมจากทุกแผนในหน่วย
// ป้องกันเนื้อหาซ้ำซ้อนระหว่างแผน
exports.generateUnitKnowledgeSheet = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 300,  // Longer timeout for unit-level
  memory: '1GB'
}).https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
      }

      const {
        teacherId,
        courseId,
        courseCode,
        courseName,
        gradeLevel,
        unitNumber,
        unitName,
        lessonPlans,  // Array of lesson plans in this unit (full version)
        plansSummary, // Array of plan previews (from Curriculum Designer)
        essentialContent, // Unit's essential content
        unitLOs,      // Unit's learning outcomes
        allLearningOutcomes, // All course LOs
        standard,
        indicators,
        style = 'comprehensive',
        language = 'thai',
        // Room options
        createRoom = false,
        roomId = null,
        roomName = null
      } = req.body

      // Support both full lessonPlans and plansSummary (from Curriculum Designer)
      const hasFullPlans = lessonPlans?.length > 0
      const hasPreviewPlans = plansSummary?.length > 0
      
      if (!unitName || (!hasFullPlans && !hasPreviewPlans)) {
        return res.status(400).json({ error: 'unitName and (lessonPlans or plansSummary) are required' })
      }

      const planCount = hasFullPlans ? lessonPlans.length : plansSummary.length
      console.log('📚 Generating Unit Knowledge Sheet for:', unitName, 'with', planCount, 'plans', hasFullPlans ? '(full)' : '(preview)')

      // รวบรวมข้อมูลจากทุกแผน
      let plansOverview = ''
      
      if (hasFullPlans) {
        // Full lesson plans - extract detailed info
        plansOverview = lessonPlans.map((plan, idx) => {
          const content = plan.content || plan
          let objectives = ''
          if (content.objectives) {
            if (content.objectives.knowledge?.length) objectives += `K: ${content.objectives.knowledge.join(', ')} `
            if (content.objectives.process?.length) objectives += `P: ${content.objectives.process.join(', ')} `
            if (content.objectives.attitude?.length) objectives += `A: ${content.objectives.attitude.join(', ')}`
          }
          
          return `
แผนที่ ${plan.planNumber || idx + 1}: ${plan.topic || content.header?.topic}
- สาระสำคัญ: ${content.essentialContent || plan.essentialContent || '-'}
- จุดประสงค์: ${objectives || '-'}
- เนื้อหา: ${JSON.stringify(content.learningContent || []).slice(0, 500)}`
        }).join('\n---\n')
      } else {
        // Plan previews from Curriculum Designer - use available info
        plansOverview = plansSummary.map((plan, idx) => {
          const loDescriptions = (plan.los || []).map(loCode => {
            const lo = allLearningOutcomes?.find(l => l.code === loCode)
            return lo ? `${lo.code}: ${lo.description}` : loCode
          }).join(', ')
          
          return `
แผนที่ ${plan.planNumber || idx + 1}: ${plan.topic}
- เน้น A.R.C.E.: ${plan.arceFocus || 'ไม่ระบุ'}
- LO ที่เกี่ยวข้อง: ${loDescriptions || plan.los?.join(', ') || '-'}`
        }).join('\n---\n')
      }

      // รวบรวมคำศัพท์จากทุกแผน (only if full plans available)
      const allVocabulary = []
      if (hasFullPlans) {
        lessonPlans.forEach(plan => {
          const content = plan.content || plan
          if (content.vocabulary) allVocabulary.push(...content.vocabulary)
          if (content.learningContent) {
            content.learningContent.forEach(lc => {
              if (lc.vocabulary) allVocabulary.push(...lc.vocabulary)
            })
          }
        })
      }

      // Build LO context for preview mode
      const loContext = unitLOs?.length > 0 ? `
## 🎯 Learning Outcomes ของหน่วยนี้:
${unitLOs.map(loCode => {
  const lo = allLearningOutcomes?.find(l => l.code === loCode)
  return lo ? `- ${lo.code}: ${lo.description}` : `- ${loCode}`
}).join('\n')}
` : ''

      const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบหลักสูตรและสื่อการเรียนการสอน

## 🎯 งานของคุณ
สร้าง **ใบความรู้รวมระดับหน่วย** ที่ให้ภาพรวมของเนื้อหาทั้งหมดในหน่วย
${hasFullPlans ? 'รวบรวมจากทุกแผนในหน่วยนี้ โดยไม่ให้เนื้อหาซ้ำซ้อน' : 'สร้างจากโครงร่างแผนที่วางไว้ เพื่อให้นักเรียนเห็นภาพรวมก่อนเริ่มเรียน'}

## 📚 ข้อมูลหน่วยการเรียนรู้

**รายวิชา:** ${courseCode || ''} ${courseName || unitName}
**ระดับชั้น:** ${gradeLevel || 'ม.4'}
**หน่วยที่ ${unitNumber || 1}:** ${unitName}
**จำนวนแผน:** ${planCount} แผน
${essentialContent ? `**สาระสำคัญ:** ${essentialContent}` : ''}

${loContext}

${standard ? `**มาตรฐาน:** ${JSON.stringify(standard)}` : ''}
${indicators ? `**ตัวชี้วัด:** ${JSON.stringify(indicators)}` : ''}

---

## 📋 ภาพรวมแผนการสอนทั้งหมดในหน่วย:

${plansOverview}

---

## ⚙️ หลักการออกแบบใบความรู้รวมหน่วย:

1. **ไม่ซ้ำซ้อน**: จัดกลุ่มเนื้อหาที่คล้ายกันจากหลายแผนไว้ด้วยกัน
2. **ลำดับการเรียนรู้**: เริ่มจากพื้นฐาน → ซับซ้อน ตาม Bloom's Taxonomy
3. **เชื่อมโยง**: แสดงความสัมพันธ์ระหว่างเนื้อหาในแต่ละแผน
4. **ครอบคลุม**: มีเนื้อหาครบทุกจุดประสงค์ของหน่วย
5. **อ้างอิงแผน**: ระบุว่าแต่ละส่วนเกี่ยวข้องกับแผนใด

---

ตอบเป็น JSON (ห้าม markdown wrapper):

{
  "metadata": {
    "type": "unit",
    "title": "ใบความรู้รวมหน่วยที่ ${unitNumber}: ${unitName}",
    "courseCode": "${courseCode || ''}",
    "courseName": "${courseName || ''}",
    "unitNumber": ${unitNumber || 1},
    "unitName": "${unitName}",
    "gradeLevel": "${gradeLevel || 'ม.4'}",
    "totalPlans": ${planCount},
    "estimatedDuration": "${planCount * 50} นาที"
  },

  "unitOverview": {
    "description": "ภาพรวมหน่วยการเรียนรู้นี้ 3-4 ประโยค",
    "bigIdea": "แนวคิดหลักของหน่วย (Big Idea)",
    "essentialQuestions": [
      "คำถามสำคัญที่นักเรียนควรตอบได้หลังเรียนจบหน่วย 1",
      "คำถามสำคัญ 2",
      "คำถามสำคัญ 3"
    ],
    "learningProgression": [
      {"planNumber": 1, "focus": "เน้นอะไรในแผน 1", "builds": "ต่อยอดจาก..."},
      {"planNumber": 2, "focus": "เน้นอะไรในแผน 2", "builds": "ต่อยอดจากแผน 1"},
      ...
    ]
  },

  "objectives": {
    "unitObjective": "จุดประสงค์รวมของหน่วย (เมื่อจบหน่วยนี้ นักเรียนจะสามารถ...)",
    "byPlan": [
      {"planNumber": 1, "objectives": ["จุดประสงค์แผน 1"]},
      {"planNumber": 2, "objectives": ["จุดประสงค์แผน 2"]},
      ...
    ]
  },

  "coreConcepts": [
    {
      "id": "concept_1",
      "name": "แนวคิดหลักที่ 1",
      "description": "คำอธิบายแนวคิด",
      "relatedPlans": [1, 2],
      "prerequisite": null,
      "importance": "สำคัญอย่างไร"
    },
    {
      "id": "concept_2",
      "name": "แนวคิดหลักที่ 2",
      "description": "คำอธิบาย",
      "relatedPlans": [2, 3],
      "prerequisite": "concept_1",
      "importance": "ต่อยอดจาก concept_1"
    }
  ],

  "sections": [
    {
      "sectionNumber": 1,
      "title": "ส่วนที่ 1: ความรู้พื้นฐาน",
      "relatedPlans": [1],
      "bloomLevel": 1,
      "content": {
        "mainContent": "เนื้อหาพื้นฐานที่ต้องรู้ก่อน (รวมจากแผนที่เกี่ยวข้อง ไม่ซ้ำ)",
        "keyPoints": ["จุดสำคัญ 1", "จุดสำคัญ 2"]
      },
      "examples": [{"title": "ตัวอย่าง", "scenario": "...", "analysis": "..."}],
      "diagrams": [{"type": "flowchart", "title": "...", "description": "..."}]
    },
    {
      "sectionNumber": 2,
      "title": "ส่วนที่ 2: หลักการและแนวคิด",
      "relatedPlans": [1, 2],
      "bloomLevel": 2,
      "content": {
        "mainContent": "หลักการสำคัญ (รวมจากหลายแผน จัดเรียงให้เข้าใจง่าย)",
        "keyPoints": ["หลักการ 1", "หลักการ 2"]
      }
    },
    {
      "sectionNumber": 3,
      "title": "ส่วนที่ 3: การประยุกต์ใช้",
      "relatedPlans": [2, 3],
      "bloomLevel": 3,
      "content": {
        "mainContent": "วิธีนำความรู้ไปใช้",
        "keyPoints": ["วิธีใช้ 1", "วิธีใช้ 2"]
      }
    },
    {
      "sectionNumber": 4,
      "title": "ส่วนที่ 4: การวิเคราะห์และประเมิน",
      "relatedPlans": [3],
      "bloomLevel": 4,
      "content": {
        "mainContent": "การวิเคราะห์และประเมินผล",
        "keyPoints": ["แนวทางวิเคราะห์ 1", "แนวทาง 2"]
      }
    }
  ],

  "vocabulary": [
    {
      "term": "คำศัพท์ 1",
      "thai": "คำแปล",
      "definition": "ความหมาย",
      "firstIntroducedIn": 1
    }
  ],

  "conceptMap": {
    "central": "${unitName}",
    "branches": [
      {
        "concept": "แนวคิดหลัก 1",
        "plans": [1],
        "subtopics": ["หัวข้อย่อย 1.1", "หัวข้อย่อย 1.2"],
        "connections": ["เชื่อมโยงกับแนวคิด 2"]
      },
      {
        "concept": "แนวคิดหลัก 2",
        "plans": [1, 2],
        "subtopics": ["หัวข้อย่อย 2.1"],
        "connections": ["ต่อยอดจากแนวคิด 1"]
      }
    ]
  },

  "hotsIntegration": {
    "byPlan": [
      {
        "planNumber": 1,
        "arceFocus": ["reasoning"],
        "sampleQuestions": ["คำถาม HOTS สำหรับแผน 1"]
      },
      {
        "planNumber": 2,
        "arceFocus": ["analysis", "reasoning"],
        "sampleQuestions": ["คำถาม HOTS สำหรับแผน 2"]
      }
    ],
    "unitLevel": {
      "analysisQuestions": ["คำถามวิเคราะห์ระดับหน่วย 1", "คำถาม 2"],
      "reasoningQuestions": ["คำถามเหตุผลระดับหน่วย 1"],
      "creativityQuestions": ["คำถามสร้างสรรค์ระดับหน่วย 1"],
      "evidenceQuestions": ["คำถามหลักฐานระดับหน่วย 1"]
    }
  },

  "selfCheck": {
    "byPlan": [
      {"planNumber": 1, "questions": ["คำถามตรวจสอบแผน 1"]},
      {"planNumber": 2, "questions": ["คำถามตรวจสอบแผน 2"]}
    ],
    "unitSummary": {
      "questions": [
        {"question": "คำถามสรุปความเข้าใจหน่วย 1", "answer": "แนวคำตอบ"},
        {"question": "คำถามสรุปความเข้าใจหน่วย 2", "answer": "แนวคำตอบ"}
      ],
      "trueOrFalse": [
        {"statement": "ข้อความ 1", "answer": true, "explanation": "อธิบาย"}
      ]
    }
  },

  "planGuidance": [
    {
      "planNumber": 1,
      "focusAreas": ["เนื้อหาเฉพาะที่ควรเน้นในแผน 1 (ไม่ซ้ำกับแผนอื่น)"],
      "avoidDuplication": ["เนื้อหาที่ไม่ต้องสอนซ้ำเพราะอยู่ในแผนอื่น"],
      "prerequisiteFromUnit": ["ความรู้พื้นฐานจากใบความรู้รวมหน่วยที่ต้องอ้างอิง"],
      "uniqueContribution": "สิ่งที่แผนนี้เพิ่มเติมให้หน่วยโดยเฉพาะ"
    },
    {
      "planNumber": 2,
      "focusAreas": ["เนื้อหาเฉพาะแผน 2"],
      "avoidDuplication": ["ไม่ต้องสอนซ้ำจากแผน 1"],
      "prerequisiteFromUnit": ["อ้างอิง concept_1 จากใบความรู้หน่วย"],
      "uniqueContribution": "..."
    }
  ]
}`

      const openaiResponse = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18',
        messages: [
          {
            role: 'system',
            content: `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบหลักสูตร (Curriculum Design Expert)

หน้าที่หลัก: วิเคราะห์แผนการสอนทั้งหมดในหน่วย → สร้างใบความรู้รวมที่:
1. ไม่มีเนื้อหาซ้ำซ้อน
2. แสดงความเชื่อมโยงระหว่างแผน
3. จัดลำดับการเรียนรู้ตาม Bloom's Taxonomy
4. ให้ guidance ว่าแต่ละแผนควรเน้นอะไร

ตอบเป็น JSON เท่านั้น ห้ามมี markdown wrapper`
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 8000,
        temperature: 0.7
      })

      let responseText = openaiResponse.choices[0].message.content.trim()
      
      // Clean markdown wrapper
      if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```(?:json)?\s*\n?/i, '')
        responseText = responseText.replace(/\n?```\s*$/i, '')
      }

      let unitKsData = JSON.parse(responseText)
      
      // Add metadata
      const ksId = `unit_ks_${Date.now()}`
      unitKsData.metadata = {
        ...unitKsData.metadata,
        id: ksId,
        type: 'unit',
        generatedBy: 'AI',
        generatedAt: new Date().toISOString()
      }

      // Flatten for Firestore
      const firestoreData = {
        ...unitKsData,
        sections: JSON.stringify(unitKsData.sections || []),
        vocabulary: JSON.stringify(unitKsData.vocabulary || []),
        hotsIntegration: JSON.stringify(unitKsData.hotsIntegration || {}),
        selfCheck: JSON.stringify(unitKsData.selfCheck || {}),
        conceptMap: JSON.stringify(unitKsData.conceptMap || {}),
        coreConcepts: JSON.stringify(unitKsData.coreConcepts || []),
        planGuidance: JSON.stringify(unitKsData.planGuidance || []),
        unitOverview: JSON.stringify(unitKsData.unitOverview || {}),
        objectives: JSON.stringify(unitKsData.objectives || {}),
        teacherId: teacherId || null,
        courseId: courseId || null,
        status: 'published',
        style,
        language,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }

      // Save to Firestore
      const ksRef = await admin.firestore().collection('unitKnowledgeSheets').add(firestoreData)

      // Update all lesson plans with reference to unit knowledge sheet (only if full plans exist)
      if (hasFullPlans && lessonPlans?.length > 0) {
        const batch = admin.firestore().batch()
        lessonPlans.forEach(plan => {
          if (plan.id) {
            const planRef = admin.firestore().collection('lessonPlans').doc(plan.id)
            batch.update(planRef, {
              unitKnowledgeSheetId: ksRef.id,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            })
          }
        })
        await batch.commit()
      }

      // ✨ Handle Learning Room (create or update)
      let finalRoomId = roomId
      let roomInfo = null

      if (createRoom || roomId) {
        try {
          if (createRoom && !roomId) {
            // Create new learning room for the unit
            const newRoomData = {
              name: roomName || `ห้องกิจกรรม: หน่วยที่ ${unitNumber} - ${unitName}`,
              description: `ห้องกิจกรรมการเรียนรู้สำหรับหน่วยที่ ${unitNumber}: ${unitName}`,
              teacherId: teacherId || null,
              courseId: courseId || null,
              courseCode,
              courseName,
              gradeLevel,
              unitNumber,
              unitName,
              status: 'active',
              materials: [{
                type: 'unitKnowledgeSheet',
                id: ksRef.id,
                title: `ใบความรู้รวมหน่วยที่ ${unitNumber}`,
                addedAt: new Date().toISOString()
              }],
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }

            const roomRef = await admin.firestore().collection('learningRooms').add(newRoomData)
            finalRoomId = roomRef.id
            roomInfo = { id: roomRef.id, name: newRoomData.name, isNew: true }

            console.log('✅ Created new learning room:', roomRef.id)
          } else if (roomId) {
            // Add to existing room
            const roomRef = admin.firestore().collection('learningRooms').doc(roomId)
            const roomDoc = await roomRef.get()

            if (roomDoc.exists) {
              const existingMaterials = roomDoc.data().materials || []
              
              // Check if unit knowledge sheet already exists in materials
              const alreadyExists = existingMaterials.some(
                m => m.type === 'unitKnowledgeSheet' && m.id === ksRef.id
              )

              if (!alreadyExists) {
                await roomRef.update({
                  materials: admin.firestore.FieldValue.arrayUnion({
                    type: 'unitKnowledgeSheet',
                    id: ksRef.id,
                    title: `ใบความรู้รวมหน่วยที่ ${unitNumber}`,
                    addedAt: new Date().toISOString()
                  }),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                })
              }

              roomInfo = { id: roomId, name: roomDoc.data().name, isNew: false }
              console.log('✅ Added unit knowledge sheet to existing room:', roomId)
            }
          }

          // Update the unit knowledge sheet with room reference
          if (finalRoomId) {
            await ksRef.update({
              roomId: finalRoomId,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            })
          }
        } catch (roomError) {
          console.error('Warning: Could not handle learning room:', roomError)
          // Don't fail the whole operation, just log the warning
        }
      }

      console.log('✅ Unit Knowledge Sheet created:', ksRef.id)

      return res.status(200).json({
        success: true,
        unitKnowledgeSheetId: ksRef.id,
        unitKnowledgeSheet: unitKsData,
        planGuidance: unitKsData.planGuidance,
        room: roomInfo
      })

    } catch (error) {
      console.error('❌ Error generating unit knowledge sheet:', error)
      return res.status(500).json({ 
        error: 'Failed to generate unit knowledge sheet',
        details: error.message 
      })
    }
  })
})

// ========================================
// 📄 Batch Generate Knowledge Sheets for Multiple Plans
// ========================================
exports.generateBatchKnowledgeSheets = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 540,  // 9 minutes for multiple plans
  memory: '2GB'
}).https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
      }

      const {
        teacherId,
        courseId,
        courseCode,
        courseName,
        gradeLevel,
        unitNumber,
        unitName,
        lessonPlans,  // Array of lesson plans to generate knowledge sheets for
        style = 'comprehensive',
        language = 'thai',
        // ✨ NEW: Parallel processing options
        parallelLimit = 2,  // Process 2 at a time to balance speed vs rate limits
        maxRetries = 2
      } = req.body

      if (!lessonPlans || lessonPlans.length === 0) {
        return res.status(400).json({ error: 'Lesson plans are required' })
      }

      console.log(`📚 Batch generating ${lessonPlans.length} knowledge sheets for unit ${unitNumber} (parallel: ${parallelLimit})`)

      const results = []
      const errors = []

      // ✨ Helper function to generate a single knowledge sheet
      async function generateSingleSheet(plan, index, otherPlans) {
        console.log(`📖 Generating sheet ${index + 1}/${lessonPlans.length}: ${plan.topic}`)

        // สร้าง context จากแผนอื่นในหน่วย
        const otherPlansContext = otherPlans.length > 0 ? `
## 📚 แผนอื่นในหน่วยเดียวกัน:
${otherPlans.map(p => `- แผนที่ ${p.planNumber}: ${p.topic}`).join('\n')}

**หลักการสำคัญ**: 
1. ใบความรู้นี้ต้อง **ครบถ้วน** ตามเนื้อหาของแผนที่ ${plan.planNumber}
2. ห้ามตัดเนื้อหาสำคัญออก แม้จะอยู่ในแผนอื่นด้วย
3. ให้เน้น "จุดเด่นเฉพาะ" และ "มุมมองที่ต่าง" จากแผนอื่น
` : ''

        // สร้าง context จากกิจกรรม 5E
        let activities5EText = ''
        const activities5E = plan.activities5E || plan.content?.activities5E
        if (activities5E) {
          const phaseNames = {
            engagement: 'กระตุ้นความสนใจ',
            exploration: 'สำรวจค้นหา', 
            explanation: 'อธิบายความรู้',
            elaboration: 'ขยายความเข้าใจ',
            evaluation: 'ประเมินผล'
          }
          for (const phase of ['engagement', 'exploration', 'explanation', 'elaboration', 'evaluation']) {
            if (activities5E[phase]) {
              const act = activities5E[phase]
              activities5EText += `\n${phaseNames[phase]}: ${act.activity || act.description || JSON.stringify(act)}`
            }
          }
        }

        // สร้าง context จาก objectives
        let objectivesText = ''
        const objectives = plan.objectives || plan.content?.objectives
        if (objectives) {
          if (typeof objectives === 'object' && !Array.isArray(objectives)) {
            if (objectives.knowledge?.length) objectivesText += `\nความรู้ (K): ${objectives.knowledge.join(', ')}`
            if (objectives.process?.length) objectivesText += `\nทักษะ (P): ${objectives.process.join(', ')}`
            if (objectives.attitude?.length) objectivesText += `\nเจตคติ (A): ${objectives.attitude.join(', ')}`
          } else if (Array.isArray(objectives)) {
            objectivesText = objectives.join(', ')
          }
        }

        // สร้าง context จาก learningContent
        let learningContentText = ''
        const learningContent = plan.learningContent || plan.content?.learningContent
        if (learningContent) {
          if (Array.isArray(learningContent)) {
            learningContentText = learningContent.map((c, idx) => `${idx + 1}. ${typeof c === 'string' ? c : c.title || c.content || JSON.stringify(c)}`).join('\n')
          } else if (typeof learningContent === 'object') {
            learningContentText = JSON.stringify(learningContent, null, 2)
          } else {
            learningContentText = learningContent
          }
        }

        const essentialContent = plan.essentialContent || plan.content?.essentialContent
        const topic = plan.topic || plan.title

        const prompt = `คุณเป็นครูผู้เชี่ยวชาญด้านการสร้างใบความรู้ที่มีคุณภาพสูง

## 📋 ข้อมูลแผนการสอน

**รายวิชา:** ${courseCode || ''} ${courseName || topic}
**ระดับชั้น:** ${gradeLevel || 'ม.4'}
**หน่วยที่ ${unitNumber || 1}:** ${unitName || topic}
**แผนที่ ${plan.planNumber || 1}:** ${topic}

**สาระสำคัญ:**
${essentialContent || 'ตามหัวข้อที่กำหนด'}

**จุดประสงค์การเรียนรู้:**
${objectivesText || 'ตามแผนการสอน'}

**เนื้อหาการเรียนรู้:**
${learningContentText || 'ตามหัวข้อที่กำหนด'}

**กิจกรรม 5E:**
${activities5EText || 'ไม่ระบุ'}

${otherPlansContext}

---

## 🎯 สร้างใบความรู้ที่ครบถ้วนตาม JSON Schema นี้:

{
  "metadata": {
    "title": "ใบความรู้ที่ ${plan.planNumber || 1}: ${topic}",
    "courseCode": "${courseCode || ''}",
    "courseName": "${courseName || ''}",
    "unitNumber": ${unitNumber || 1},
    "unitName": "${unitName || ''}",
    "planNumber": ${plan.planNumber || 1},
    "gradeLevel": "${gradeLevel || 'ม.4'}",
    "duration": "50 นาที"
  },

  "objectives": {
    "mainObjective": "จุดประสงค์หลักที่ชัดเจน 1 ประโยค",
    "subObjectives": ["K objective", "P objective", "A objective"]
  },

  "introduction": {
    "hook": "คำถามหรือสถานการณ์กระตุ้นความอยากรู้",
    "overview": "ภาพรวมของเนื้อหา",
    "priorKnowledge": ["ความรู้พื้นฐานที่ควรมี"],
    "connectionToUnit": "เชื่อมโยงกับหน่วยการเรียนรู้อย่างไร"
  },

  "sections": [
    {
      "sectionNumber": 1,
      "title": "หัวข้อที่ 1",
      "bloomLevel": 1,
      "content": {
        "mainContent": "เนื้อหาหลัก 3-4 ย่อหน้า ครบถ้วนตามหลักวิชาการ",
        "keyPoints": ["ประเด็นสำคัญ 1", "ประเด็นสำคัญ 2", "ประเด็นสำคัญ 3"],
        "explanation": "คำอธิบายเพิ่มเติม"
      },
      "examples": [{"title": "", "scenario": "", "analysis": ""}],
      "diagrams": [{"type": "flowchart", "title": "", "description": ""}],
      "realWorldApplications": ["การใช้ในชีวิตจริง"]
    }
  ],

  "vocabulary": [
    {"term": "English Term", "thai": "คำแปล", "definition": "คำจำกัดความ"}
  ],

  "hotsIntegration": {
    "analysisQuestions": ["คำถามวิเคราะห์ (A)"],
    "reasoningQuestions": ["คำถามเหตุผล (R)"],
    "creativityQuestions": ["คำถามสร้างสรรค์ (C)"],
    "evidenceQuestions": ["คำถามหลักฐาน (E)"]
  },

  "summary": {
    "keyTakeaways": ["สิ่งสำคัญที่ต้องจำ 1", "สิ่งสำคัญ 2", "สิ่งสำคัญ 3"],
    "mindMap": {
      "central": "${topic}",
      "branches": [{"topic": "หัวข้อย่อย", "subtopics": ["รายละเอียด"]}]
    }
  },

  "selfCheck": {
    "questions": [
      {"question": "คำถามทดสอบ", "bloomLevel": 1, "hint": "คำใบ้", "answer": "คำตอบ"}
    ],
    "trueOrFalse": [
      {"statement": "ข้อความ", "answer": true, "explanation": "อธิบาย"}
    ]
  }
}

**สำคัญมาก**: 
- ใบความรู้ต้องครบถ้วนตามหลักวิชาการ ไม่ตัดเนื้อหาสำคัญออก
- ควรมี sections อย่างน้อย 3-4 sections ครอบคลุมเนื้อหาทั้งหมด
- แต่ละ section ต้องมี mainContent ที่อธิบายละเอียด

ตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown code block`

        // ✨ Call OpenAI with retry
        const openaiResponse = await retryWithBackoff(async () => {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey.value()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18',
              messages: [
                { role: 'system', content: 'คุณเป็นผู้เชี่ยวชาญด้านการศึกษาและการสร้างสื่อการสอน ตอบเป็น JSON เท่านั้น ห้ามมี markdown wrapper' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 8000
            })
          })
          
          if (!response.ok) {
            const err = new Error(`OpenAI error: ${response.status}`)
            err.status = response.status
            throw err
          }
          return response
        }, maxRetries)

        const openaiData = await openaiResponse.json()
        let responseText = openaiData.choices?.[0]?.message?.content

        // ✨ Enhanced cleaning
        let cleanedText = responseText.trim()
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        if (!cleanedText.startsWith('{')) {
          const jsonStart = cleanedText.indexOf('{')
          if (jsonStart > -1) cleanedText = cleanedText.substring(jsonStart)
        }
        if (!cleanedText.endsWith('}')) {
          const jsonEnd = cleanedText.lastIndexOf('}')
          if (jsonEnd > -1) cleanedText = cleanedText.substring(0, jsonEnd + 1)
        }

        const knowledgeSheet = JSON.parse(cleanedText)
        
        // ✨ Auto-fix and validate
        const fixedSheet = autoFixKnowledgeSheet(knowledgeSheet, topic)
        const validation = validateKnowledgeSheet(fixedSheet)

        // Save to Firestore
        const ksRef = await admin.firestore().collection('knowledgeSheets').add({
          lessonPlanId: plan.id,
          teacherId,
          courseId,
          courseCode,
          courseName,
          gradeLevel,
          unitNumber,
          unitName,
          planNumber: plan.planNumber,
          topic: topic,
          content: fixedSheet,
          status: 'published',
          style,
          language,
          batchGenerated: true,
          qualityScore: validation.score,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })

        // Update lesson plan with reference
        if (plan.id) {
          await admin.firestore().collection('lessonPlans').doc(plan.id).update({
            knowledgeSheetId: ksRef.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          })
        }

        console.log(`✅ Sheet ${index + 1} created: ${ksRef.id} (quality: ${validation.score})`)
        
        return {
          planId: plan.id,
          planNumber: plan.planNumber,
          topic: topic,
          knowledgeSheetId: ksRef.id,
          qualityScore: validation.score,
          success: true
        }
      }

      // ✨ Process in parallel batches
      async function processBatch(batch, startIndex) {
        return Promise.all(
          batch.map((plan, batchIndex) => {
            const globalIndex = startIndex + batchIndex
            const otherPlans = lessonPlans.filter((_, idx) => idx !== globalIndex)
            return generateSingleSheet(plan, globalIndex, otherPlans)
              .catch(err => ({
                planId: plan.id,
                planNumber: plan.planNumber,
                topic: plan.topic || plan.title,
                error: err.message,
                success: false
              }))
          })
        )
      }

      // Split into batches and process
      for (let i = 0; i < lessonPlans.length; i += parallelLimit) {
        const batch = lessonPlans.slice(i, i + parallelLimit)
        const batchResults = await processBatch(batch, i)
        
        batchResults.forEach(result => {
          if (result.success) {
            results.push(result)
          } else {
            errors.push(result)
          }
        })
        
        // Small delay between batches to avoid rate limiting
        if (i + parallelLimit < lessonPlans.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      console.log(`📚 Batch complete: ${results.length} success, ${errors.length} errors`)

      return res.status(200).json({
        success: true,
        totalPlans: lessonPlans.length,
        successCount: results.length,
        errorCount: errors.length,
        averageQuality: results.length > 0 
          ? Math.round(results.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / results.length)
          : 0,
        results,
        errors
      })

    } catch (error) {
      console.error('❌ Error in batch generation:', error)
      return res.status(500).json({ 
        error: 'Failed to batch generate knowledge sheets',
        details: error.message 
      })
    }
  })
})

// ==========================================
// 🛡️ RELIABILITY & HEALTH CHECK ENDPOINTS
// ==========================================

/**
 * 🏥 System Health Check
 * ตรวจสอบสถานะของ AI service และ database
 */
exports.healthCheck = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        components: {}
      }
      
      // Check Firestore
      try {
        const testRef = db.collection('_healthCheck').doc('ping')
        await testRef.set({ timestamp: new Date(), source: 'healthCheck' })
        health.components.firestore = { status: 'healthy' }
      } catch (error) {
        health.components.firestore = { status: 'unhealthy', error: error.message }
        health.status = 'degraded'
      }
      
      // Check OpenAI (if configured)
      if (openai) {
        try {
          await openai.models.list({ limit: 1 })
          health.components.openai = { status: 'healthy' }
        } catch (error) {
          health.components.openai = { status: 'unhealthy', error: error.message }
          health.status = 'degraded'
        }
      } else {
        health.components.openai = { status: 'not_configured' }
      }
      
      // Get recent reliability stats
      try {
        const oneDayAgo = new Date()
        oneDayAgo.setDate(oneDayAgo.getDate() - 1)
        
        const recentAssessments = await db.collection('assessments')
          .where('createdAt', '>=', oneDayAgo)
          .limit(100)
          .get()
        
        let totalReliability = 0
        let fallbackCount = 0
        let count = 0
        
        recentAssessments.forEach(doc => {
          const data = doc.data()
          if (data.reliabilityScore !== undefined) {
            totalReliability += data.reliabilityScore
            count++
          }
          if (data.isFallback) fallbackCount++
        })
        
        health.metrics = {
          assessmentsLast24h: recentAssessments.size,
          averageReliability: count > 0 ? Math.round(totalReliability / count) : null,
          fallbackRate: recentAssessments.size > 0 
            ? Math.round((fallbackCount / recentAssessments.size) * 100) 
            : 0
        }
      } catch (error) {
        health.metrics = { error: error.message }
      }
      
      return res.status(health.status === 'healthy' ? 200 : 503).json(health)
      
    } catch (error) {
      return res.status(500).json({
        status: 'unhealthy',
        error: error.message
      })
    }
  })
})

/**
 * 🧪 System Debug API
 * ดึง logs และสถิติสำหรับ debugging
 */
exports.systemDebug = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { type, hours = 24, limit: limitNum = 50 } = req.query
      
      const cutoff = new Date()
      cutoff.setHours(cutoff.getHours() - parseInt(hours))
      
      let result = {}
      
      switch (type) {
        case 'antiCheat':
          const antiCheatSnapshot = await db.collection('antiCheatLogs')
            .where('timestamp', '>=', cutoff)
            .orderBy('timestamp', 'desc')
            .limit(parseInt(limitNum))
            .get()
          
          result = {
            type: 'antiCheat',
            count: antiCheatSnapshot.size,
            logs: antiCheatSnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
            summary: {
              speedRuns: antiCheatSnapshot.docs.filter(d => d.data().type === 'speed_run').length,
              hackerAttempts: antiCheatSnapshot.docs.filter(d => d.data().type === 'hacker_attempt').length,
              copyPaste: antiCheatSnapshot.docs.filter(d => 
                (d.data().reasons || []).some(r => r.toLowerCase().includes('paste'))
              ).length
            }
          }
          break
          
        case 'emotional':
          const emotionalSnapshot = await db.collection('emotionalLogs')
            .where('timestamp', '>=', cutoff)
            .orderBy('timestamp', 'desc')
            .limit(parseInt(limitNum))
            .get()
          
          result = {
            type: 'emotional',
            count: emotionalSnapshot.size,
            logs: emotionalSnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
            summary: {
              highIntensity: emotionalSnapshot.docs.filter(d => d.data().intensity === 'high').length,
              mediumIntensity: emotionalSnapshot.docs.filter(d => d.data().intensity === 'medium').length
            }
          }
          break
          
        case 'parseErrors':
          const parseSnapshot = await db.collection('aiParseLogs')
            .where('timestamp', '>=', cutoff)
            .orderBy('timestamp', 'desc')
            .limit(parseInt(limitNum))
            .get()
          
          result = {
            type: 'parseErrors',
            count: parseSnapshot.size,
            logs: parseSnapshot.docs.map(d => ({ 
              id: d.id, 
              ...d.data(),
              rawResponse: d.data().rawResponse?.substring(0, 500) // Truncate for safety
            }))
          }
          break
          
        case 'reliability':
          // Get reliability stats
          const assessmentsSnapshot = await db.collection('assessments')
            .where('createdAt', '>=', cutoff)
            .limit(200)
            .get()
          
          let totalReliability = 0
          let fallbackCount = 0
          let count = 0
          const reliabilityBuckets = { high: 0, medium: 0, low: 0 }
          
          assessmentsSnapshot.forEach(doc => {
            const data = doc.data()
            if (data.reliabilityScore !== undefined) {
              totalReliability += data.reliabilityScore
              count++
              
              if (data.reliabilityScore >= 80) reliabilityBuckets.high++
              else if (data.reliabilityScore >= 50) reliabilityBuckets.medium++
              else reliabilityBuckets.low++
            }
            if (data.isFallback) fallbackCount++
          })
          
          result = {
            type: 'reliability',
            totalAssessments: assessmentsSnapshot.size,
            averageReliability: count > 0 ? Math.round(totalReliability / count) : null,
            fallbackCount,
            fallbackRate: assessmentsSnapshot.size > 0 
              ? Math.round((fallbackCount / assessmentsSnapshot.size) * 100) 
              : 0,
            buckets: reliabilityBuckets
          }
          break
          
        default:
          result = {
            availableTypes: ['antiCheat', 'emotional', 'parseErrors', 'reliability'],
            usage: '/systemDebug?type=antiCheat&hours=24&limit=50'
          }
      }
      
      return res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        hours: parseInt(hours),
        ...result
      })
      
    } catch (error) {
      console.error('System debug error:', error)
      return res.status(500).json({
        success: false,
        error: error.message
      })
    }
  })
})

/**
 * 🔄 Sync Student Progress
 * Manual trigger เพื่อ sync LO data จาก assessments + worksheets
 */
exports.syncProgress = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }
      
      const { studentId, courseId, verifyOnly } = req.body
      
      if (!studentId || !courseId) {
        return res.status(400).send({ error: 'studentId and courseId required' })
      }
      
      if (verifyOnly) {
        // Just verify consistency
        const verification = await verifyDataConsistency(db, studentId, courseId)
        return res.status(200).json({
          action: 'verify',
          ...verification
        })
      }
      
      // Full sync
      const result = await syncStudentProgress(db, studentId, courseId)
      return res.status(200).json({
        action: 'sync',
        ...result
      })
      
    } catch (error) {
      console.error('Sync error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 📊 Get Reliability Report
 * รายงานความน่าเชื่อถือของระบบ
 */
exports.reliabilityReport = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const days = parseInt(req.query.days) || 7
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      
      // Get assessments in date range
      const assessmentsSnap = await db.collection('assessments')
        .where('createdAt', '>=', cutoffDate)
        .orderBy('createdAt', 'desc')
        .limit(1000)
        .get()
      
      // Analyze reliability
      const stats = {
        totalAssessments: assessmentsSnap.size,
        period: `${days} days`,
        reliability: {
          scores: [],
          average: 0,
          min: 100,
          max: 0,
          below95: 0
        },
        fallbacks: {
          count: 0,
          rate: 0,
          reasons: {}
        },
        parseErrors: {
          count: 0,
          rate: 0
        },
        aiConfidence: {
          scores: [],
          average: 0,
          lowConfidenceCount: 0
        }
      }
      
      assessmentsSnap.forEach(doc => {
        const data = doc.data()
        
        // Reliability score
        if (data.reliabilityScore !== undefined) {
          stats.reliability.scores.push(data.reliabilityScore)
          stats.reliability.min = Math.min(stats.reliability.min, data.reliabilityScore)
          stats.reliability.max = Math.max(stats.reliability.max, data.reliabilityScore)
          if (data.reliabilityScore < 95) stats.reliability.below95++
        }
        
        // Fallbacks
        if (data.isFallback) {
          stats.fallbacks.count++
          const reason = data.fallbackReason || 'unknown'
          stats.fallbacks.reasons[reason] = (stats.fallbacks.reasons[reason] || 0) + 1
        }
        
        // Parse errors
        if (data.auditTrail?.parseAttempts > 1) {
          stats.parseErrors.count++
        }
        
        // AI Confidence
        if (data.aiConfidence !== undefined && data.aiConfidence !== null) {
          stats.aiConfidence.scores.push(data.aiConfidence)
          if (data.aiConfidence < 50) stats.aiConfidence.lowConfidenceCount++
        }
      })
      
      // Calculate averages
      if (stats.reliability.scores.length > 0) {
        stats.reliability.average = Math.round(
          stats.reliability.scores.reduce((a, b) => a + b, 0) / stats.reliability.scores.length
        )
      }
      
      if (stats.aiConfidence.scores.length > 0) {
        stats.aiConfidence.average = Math.round(
          stats.aiConfidence.scores.reduce((a, b) => a + b, 0) / stats.aiConfidence.scores.length
        )
      }
      
      // Calculate rates
      if (stats.totalAssessments > 0) {
        stats.fallbacks.rate = Math.round((stats.fallbacks.count / stats.totalAssessments) * 100)
        stats.parseErrors.rate = Math.round((stats.parseErrors.count / stats.totalAssessments) * 100)
      }
      
      // Overall reliability grade
      let grade = 'A'
      if (stats.reliability.average < 95) grade = 'B'
      if (stats.reliability.average < 85) grade = 'C'
      if (stats.reliability.average < 70) grade = 'D'
      if (stats.reliability.average < 50) grade = 'F'
      
      // Remove raw scores arrays
      delete stats.reliability.scores
      delete stats.aiConfidence.scores
      
      return res.status(200).json({
        success: true,
        grade,
        meetsTarget: stats.reliability.average >= 95,
        targetReliability: 95,
        ...stats,
        recommendations: generateRecommendations(stats)
      })
      
    } catch (error) {
      console.error('Reliability report error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 📋 Generate Recommendations based on stats
 */
function generateRecommendations(stats) {
  const recommendations = []
  
  if (stats.reliability.average < 95) {
    recommendations.push({
      priority: 'HIGH',
      issue: 'Reliability below 95% target',
      action: 'Review AI response parsing and add more fallback handlers'
    })
  }
  
  if (stats.fallbacks.rate > 5) {
    recommendations.push({
      priority: 'HIGH',
      issue: `High fallback rate (${stats.fallbacks.rate}%)`,
      action: 'Check OpenAI API status and error logs'
    })
  }
  
  if (stats.parseErrors.rate > 10) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: `High parse error rate (${stats.parseErrors.rate}%)`,
      action: 'Review AI prompt and response format requirements'
    })
  }
  
  if (stats.aiConfidence.average < 70) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: `Low AI confidence average (${stats.aiConfidence.average}%)`,
      action: 'Review question quality and student answer patterns'
    })
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'INFO',
      issue: 'System performing well',
      action: 'Continue monitoring'
    })
  }
  
  return recommendations
}

// ==========================================
// 🔍 AI DETECTION API
// ==========================================

/**
 * 🔍 Analyze Text for AI Generation
 * ตรวจจับว่าข้อความอาจสร้างโดย AI
 */
exports.analyzeAIContent = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
      }
      
      const { text, typingMetrics, studentId, courseId } = req.body
      
      if (!text) {
        return res.status(400).json({ error: 'text is required' })
      }
      
      // Get student history if available
      let studentHistory = null
      if (studentId && courseId) {
        const assessmentsSnap = await db.collection('assessments')
          .where('studentId', '==', studentId)
          .where('courseId', '==', courseId)
          .orderBy('createdAt', 'desc')
          .limit(10)
          .get()
        
        if (!assessmentsSnap.empty) {
          const lengths = []
          assessmentsSnap.forEach(doc => {
            const data = doc.data()
            if (data.answerMetrics?.charCount) {
              lengths.push(data.answerMetrics.charCount)
            }
          })
          
          if (lengths.length > 0) {
            studentHistory = {
              avgAnswerLength: lengths.reduce((a, b) => a + b, 0) / lengths.length,
              assessmentCount: lengths.length
            }
          }
        }
      }
      
      // Run comprehensive detection
      const result = comprehensiveAIDetection(text, typingMetrics, studentHistory)
      
      return res.status(200).json({
        success: true,
        ...result
      })
      
    } catch (error) {
      console.error('AI detection error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 🔍 Get Flagged Assessments
 * ดึงรายการ assessments ที่ถูก flag ว่าอาจเป็น AI
 */
exports.getFlaggedAssessments = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId, minScore = 60, limit: queryLimit = 50 } = req.query
      
      let query = db.collection('assessments')
        .where('aiDetection.flagged', '==', true)
        .orderBy('createdAt', 'desc')
      
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }
      
      const snapshot = await query.limit(parseInt(queryLimit)).get()
      
      const flaggedAssessments = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        flaggedAssessments.push({
          id: doc.id,
          studentId: data.studentId,
          studentData: data.studentData,
          courseId: data.courseId,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          
          // AI Detection info
          aiDetection: data.aiDetection,
          
          // Answer preview
          answerPreview: (data.studentAnswer || '').substring(0, 200) + '...',
          
          // Scores
          rubricScores: data.rubricScores,
          overallScore: data.overallScore,
          
          // Context
          questionData: data.questionData
        })
      })
      
      // Group by risk level
      const byRiskLevel = {
        CRITICAL: flaggedAssessments.filter(a => a.aiDetection?.riskLevel === 'CRITICAL'),
        HIGH: flaggedAssessments.filter(a => a.aiDetection?.riskLevel === 'HIGH'),
        MEDIUM: flaggedAssessments.filter(a => a.aiDetection?.riskLevel === 'MEDIUM')
      }
      
      return res.status(200).json({
        success: true,
        totalFlagged: flaggedAssessments.length,
        byRiskLevel: {
          critical: byRiskLevel.CRITICAL.length,
          high: byRiskLevel.HIGH.length,
          medium: byRiskLevel.MEDIUM.length
        },
        assessments: flaggedAssessments
      })
      
    } catch (error) {
      console.error('Get flagged assessments error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 🔍 AI Detection Statistics
 * สถิติการตรวจจับ AI ทั้งหมด
 */
exports.aiDetectionStats = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId, days = 30 } = req.query
      
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days))
      
      let query = db.collection('assessments')
        .where('createdAt', '>=', cutoffDate)
      
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }
      
      const snapshot = await query.get()
      
      let total = 0
      let withDetection = 0
      let flagged = 0
      const riskLevels = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
      const scores = []
      const signalCounts = {}
      
      snapshot.forEach(doc => {
        const data = doc.data()
        total++
        
        if (data.aiDetection) {
          withDetection++
          
          if (data.aiDetection.score) {
            scores.push(data.aiDetection.score)
          }
          
          if (data.aiDetection.riskLevel) {
            riskLevels[data.aiDetection.riskLevel] = (riskLevels[data.aiDetection.riskLevel] || 0) + 1
          }
          
          if (data.aiDetection.flagged) {
            flagged++
          }
          
          if (data.aiDetection.topSignal) {
            signalCounts[data.aiDetection.topSignal] = (signalCounts[data.aiDetection.topSignal] || 0) + 1
          }
        }
      })
      
      // Calculate statistics
      const avgScore = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
        : 0
      
      // Top signals
      const topSignals = Object.entries(signalCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([signal, count]) => ({ signal, count }))
      
      return res.status(200).json({
        success: true,
        period: `${days} days`,
        courseId: courseId || 'all',
        
        // Overview
        totalAssessments: total,
        withDetection,
        detectionRate: total > 0 ? Math.round((withDetection / total) * 100) : 0,
        
        // Flagging
        flaggedCount: flagged,
        flagRate: total > 0 ? Math.round((flagged / total) * 100) : 0,
        
        // Risk distribution
        riskDistribution: riskLevels,
        
        // Score statistics
        scoreStats: {
          average: avgScore,
          min: scores.length > 0 ? Math.min(...scores) : 0,
          max: scores.length > 0 ? Math.max(...scores) : 0
        },
        
        // Top signals
        topSignals,
        
        // Insights
        insights: generateAIDetectionInsights(total, flagged, riskLevels, avgScore)
      })
      
    } catch (error) {
      console.error('AI detection stats error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * Generate insights from AI detection data
 */
function generateAIDetectionInsights(total, flagged, riskLevels, avgScore) {
  const insights = []
  
  const flagRate = total > 0 ? (flagged / total) * 100 : 0
  
  if (flagRate < 5) {
    insights.push({
      type: 'positive',
      message: 'อัตราการ flag ต่ำ (< 5%) - นักเรียนส่วนใหญ่ตอบด้วยตัวเอง'
    })
  } else if (flagRate < 15) {
    insights.push({
      type: 'warning',
      message: `อัตราการ flag ปานกลาง (${flagRate.toFixed(1)}%) - ควรตรวจสอบเป็นระยะ`
    })
  } else {
    insights.push({
      type: 'critical',
      message: `อัตราการ flag สูง (${flagRate.toFixed(1)}%) - ควรดำเนินการป้องกัน`
    })
  }
  
  if (riskLevels.CRITICAL > 0) {
    insights.push({
      type: 'action',
      message: `พบ ${riskLevels.CRITICAL} รายการที่ต้องตรวจสอบเร่งด่วน (CRITICAL)`
    })
  }
  
  if (avgScore > 50) {
    insights.push({
      type: 'info',
      message: `คะแนน AI Detection เฉลี่ย ${avgScore} - สูงกว่าปกติ`
    })
  }
  
  return insights
}
// ==========================================
// 📐 INTER-RATER RELIABILITY (IRR) API
// ==========================================

/**
 * 📊 Calculate Inter-Rater Reliability
 * คำนวณความเที่ยงตรงระหว่าง AI และ Expert
 * สำหรับ Research Publication
 */
exports.calculateIRR = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId, dimension = 'total', minValidations = 5 } = req.query
      
      // Get validated assessments
      let query = db.collection('assessments')
        .where('expertValidation.isValidated', '==', true)
      
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }
      
      const snapshot = await query.get()
      
      if (snapshot.empty) {
        return res.status(200).json({
          success: false,
          error: 'No validated assessments found',
          validatedCount: 0
        })
      }
      
      // Extract validation data
      const validations = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        const expert = data.expertValidation
        
        if (expert && data.rubricScores) {
          validations.push({
            assessmentId: doc.id,
            aiScores: {
              analysis: data.rubricScores.analysis || 0,
              reasoning: data.rubricScores.reasoning || 0,
              creativity: data.rubricScores.creativity || 0,
              evidence: data.rubricScores.evidence || 0
            },
            expertScores: {
              analysis: expert.expertScores?.analysis || 0,
              reasoning: expert.expertScores?.reasoning || 0,
              creativity: expert.expertScores?.creativity || 0,
              evidence: expert.expertScores?.evidence || 0
            }
          })
        }
      })
      
      if (validations.length < minValidations) {
        return res.status(200).json({
          success: false,
          error: `Insufficient validated assessments. Need at least ${minValidations}, got ${validations.length}`,
          validatedCount: validations.length
        })
      }
      
      // Calculate comprehensive IRR
      const irrResults = comprehensiveIRRAnalysis(validations, dimension)
      
      // Also calculate per-dimension if total requested
      let dimensionBreakdown = null
      if (dimension === 'total') {
        dimensionBreakdown = {
          analysis: comprehensiveIRRAnalysis(validations, 'analysis'),
          reasoning: comprehensiveIRRAnalysis(validations, 'reasoning'),
          creativity: comprehensiveIRRAnalysis(validations, 'creativity'),
          evidence: comprehensiveIRRAnalysis(validations, 'evidence')
        }
      }
      
      return res.status(200).json({
        success: true,
        courseId: courseId || 'all',
        dimension,
        validatedCount: validations.length,
        
        // Main results
        results: irrResults,
        
        // Per-dimension breakdown
        dimensionBreakdown,
        
        // Publication readiness
        publicationReady: irrResults.summary?.meetsPublicationStandard || false,
        
        // Generated at
        generatedAt: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('Calculate IRR error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 📊 IRR Report for Publication
 * สร้างรายงาน IRR พร้อมตีพิมพ์
 */
exports.irrReport = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId, format = 'json' } = req.query
      
      // Get validated assessments
      let query = db.collection('assessments')
        .where('expertValidation.isValidated', '==', true)
      
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }
      
      const snapshot = await query.get()
      
      // Extract data
      const validations = []
      snapshot.forEach(doc => {
        const data = doc.data()
        const expert = data.expertValidation
        
        if (expert && data.rubricScores) {
          validations.push({
            aiScores: {
              analysis: data.rubricScores.analysis || 0,
              reasoning: data.rubricScores.reasoning || 0,
              creativity: data.rubricScores.creativity || 0,
              evidence: data.rubricScores.evidence || 0
            },
            expertScores: {
              analysis: expert.expertScores?.analysis || 0,
              reasoning: expert.expertScores?.reasoning || 0,
              creativity: expert.expertScores?.creativity || 0,
              evidence: expert.expertScores?.evidence || 0
            }
          })
        }
      })
      
      const n = validations.length
      
      if (n < 5) {
        return res.status(200).json({
          success: false,
          error: `Need at least 5 validated assessments for IRR report, got ${n}`,
          n
        })
      }
      
      // Calculate IRR for each dimension
      const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence', 'total']
      const results = {}
      
      for (const dim of dimensions) {
        results[dim] = comprehensiveIRRAnalysis(validations, dim)
      }
      
      // Generate publication-ready report
      const report = {
        title: 'Inter-Rater Reliability Analysis: AI vs Expert HOTS Assessment',
        generatedAt: new Date().toISOString(),
        sampleSize: n,
        courseId: courseId || 'All Courses',
        
        // Summary table
        summaryTable: {
          headers: ['Dimension', 'N', 'Weighted κ', 'ICC(2,1)', 'r', 'MAE', 'Interpretation'],
          rows: dimensions.map(dim => ({
            dimension: dim.charAt(0).toUpperCase() + dim.slice(1),
            n: results[dim].n,
            weightedKappa: results[dim].weightedKappa?.weightedKappa,
            icc: results[dim].icc?.icc,
            pearsonR: results[dim].pearsonR?.r,
            mae: results[dim].mae?.mae,
            interpretation: results[dim].summary?.overallReliability
          }))
        },
        
        // Detailed results
        detailedResults: results,
        
        // Publication metrics
        publicationMetrics: {
          meetsKappaThreshold: results.total.weightedKappa?.weightedKappa >= 0.60,
          meetsICCThreshold: results.total.icc?.icc >= 0.70,
          meetsSampleSize: n >= 30,
          overallReady: (results.total.weightedKappa?.weightedKappa >= 0.60) && 
                        (results.total.icc?.icc >= 0.70) && (n >= 30)
        },
        
        // Citation text
        citationText: results.total.reportText,
        
        // Recommendations
        recommendations: results.total.summary?.recommendations || []
      }
      
      if (format === 'csv') {
        // Generate CSV
        const BOM = '\uFEFF'
        let csv = 'Dimension,N,Weighted_Kappa,Kappa_Interpretation,ICC,ICC_CI_Lower,ICC_CI_Upper,ICC_Interpretation,Pearson_r,MAE,RMSE,Percent_Agreement\n'
        
        dimensions.forEach(dim => {
          const r = results[dim]
          csv += `${dim},${r.n},${r.weightedKappa?.weightedKappa || ''},${r.weightedKappa?.interpretation || ''},`
          csv += `${r.icc?.icc || ''},${r.icc?.ci95?.lower || ''},${r.icc?.ci95?.upper || ''},${r.icc?.interpretation || ''},`
          csv += `${r.pearsonR?.r || ''},${r.mae?.mae || ''},${r.mae?.rmse || ''},${r.percentAgreement?.percentage || ''}%\n`
        })
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename=IRR_Report_${new Date().toISOString().split('T')[0]}.csv`)
        return res.send(BOM + csv)
      }
      
      return res.status(200).json({
        success: true,
        report
      })
      
    } catch (error) {
      console.error('IRR Report error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 📊 Effect Size Calculation (Pre-Post)
 * คำนวณขนาดผลกระทบสำหรับ RQ1
 */
exports.calculateEffectSize = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId, experimentGroup } = req.query
      
      if (!courseId) {
        return res.status(400).json({ error: 'courseId is required' })
      }
      
      // Get pretest and posttest data
      const eventsQuery = db.collection('learningEvents')
        .where('courseId', '==', courseId)
        .where('eventType', 'in', ['PRETEST', 'POSTTEST'])
      
      const snapshot = await eventsQuery.get()
      
      const studentData = {}
      
      snapshot.forEach(doc => {
        const data = doc.data()
        const studentId = data.studentId
        
        if (!studentData[studentId]) {
          studentData[studentId] = { pretest: null, posttest: null }
        }
        
        const avgScore = data.score_average || 
          ((data.score_analysis || 0) + (data.score_reasoning || 0) + 
           (data.score_creativity || 0) + (data.score_evidence || 0)) / 4
        
        if (data.eventType === 'PRETEST') {
          studentData[studentId].pretest = avgScore
        } else if (data.eventType === 'POSTTEST') {
          studentData[studentId].posttest = avgScore
        }
      })
      
      // Filter students with both pre and post
      const preScores = []
      const postScores = []
      
      Object.values(studentData).forEach(s => {
        if (s.pretest !== null && s.posttest !== null) {
          preScores.push(s.pretest)
          postScores.push(s.posttest)
        }
      })
      
      if (preScores.length < 5) {
        return res.status(200).json({
          success: false,
          error: `Insufficient paired data. Need at least 5 pairs, got ${preScores.length}`,
          n: preScores.length
        })
      }
      
      // Calculate effect size
      const effectSize = calculateCohensD(preScores, postScores)
      
      // Calculate paired t-test (simplified)
      const differences = preScores.map((pre, i) => postScores[i] - pre)
      const meanDiff = differences.reduce((a, b) => a + b, 0) / differences.length
      const sdDiff = Math.sqrt(differences.reduce((sum, d) => sum + Math.pow(d - meanDiff, 2), 0) / (differences.length - 1))
      const tValue = meanDiff / (sdDiff / Math.sqrt(differences.length))
      const df = differences.length - 1
      // Simplified p-value approximation
      const pValue = Math.exp(-0.717 * Math.abs(tValue) - 0.416 * tValue * tValue / df)
      
      return res.status(200).json({
        success: true,
        courseId,
        n: preScores.length,
        
        // Descriptives
        pretest: {
          mean: effectSize.preMean,
          sd: effectSize.preSD
        },
        posttest: {
          mean: effectSize.postMean,
          sd: effectSize.postSD
        },
        
        // Effect size
        cohensD: effectSize.cohensD,
        interpretation: effectSize.interpretation,
        
        // Statistical test
        pairedTTest: {
          t: Math.round(tValue * 1000) / 1000,
          df,
          p: Math.round(pValue * 10000) / 10000,
          significant: pValue < 0.05
        },
        
        // Mean difference
        meanDifference: Math.round(meanDiff * 1000) / 1000,
        
        // Report text
        reportText: `A paired-samples t-test was conducted to compare HOTS scores before and after using the AI assessment system. ` +
          `There was a significant difference in scores before (M=${effectSize.preMean}, SD=${effectSize.preSD}) and ` +
          `after (M=${effectSize.postMean}, SD=${effectSize.postSD}) the intervention; t(${df})=${Math.round(tValue * 100) / 100}, p=${pValue < 0.001 ? '<.001' : pValue.toFixed(3)}. ` +
          `Cohen's d = ${effectSize.cohensD}, indicating a ${effectSize.interpretation.toLowerCase()} effect size.`
      })
      
    } catch (error) {
      console.error('Effect size calculation error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})
// ==========================================
// 📊 RESEARCH DATA API ENDPOINTS
// ==========================================

/**
 * 📤 Export Research Dataset (CSV, JSON, or Hierarchical JSON)
 * ส่งออกข้อมูลการเรียนรู้สำหรับงานวิจัย
 * 
 * Formats:
 * - csv: Flat CSV for SPSS/Excel
 * - json: Summary statistics
 * - hierarchical: Nested JSON (Student → Assessments → Details)
 */
exports.exportResearchData = functions.runWith({ 
  timeoutSeconds: 300,
  memory: '1GB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { 
        courseId, 
        format = 'csv', 
        dateFrom, 
        dateTo,
        // Hierarchical JSON options
        includeRawAnswers = 'false',
        includeSequences = 'true',
        includeDemographics = 'true',
        kAnonymity = '0'
      } = req.query
      
      if (!courseId) {
        return res.status(400).json({ error: 'courseId is required' })
      }
      
      // CSV Format
      if (format === 'csv') {
        const result = await exportResearchCSV(db, courseId, { dateFrom, dateTo })
        
        if (!result.success) {
          return res.status(500).json({ error: result.error })
        }
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`)
        return res.send(result.csv)
      }
      
      // Hierarchical JSON Format
      if (format === 'hierarchical') {
        const result = await exportHierarchicalJSON(db, courseId, {
          dateFrom,
          dateTo,
          includeRawAnswers: includeRawAnswers === 'true',
          includeSequences: includeSequences === 'true',
          includeDemographics: includeDemographics === 'true',
          kAnonymity: parseInt(kAnonymity) || 0
        })
        
        if (!result.success) {
          return res.status(500).json({ error: result.error })
        }
        
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`)
        return res.json(result.data)
      }
      
      // Default: JSON summary format
      const summary = await generateResearchSummary(db, courseId)
      return res.json(summary)
      
    } catch (error) {
      console.error('Export research data error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 📊 Research Summary & Statistics
 * สรุปสถิติเชิงพรรณนาสำหรับงานวิจัย
 */
exports.researchSummary = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId } = req.query
      
      if (!courseId) {
        return res.status(400).json({ error: 'courseId is required' })
      }
      
      const summary = await generateResearchSummary(db, courseId)
      
      // Add correlation analysis
      const correlation = await calculateScoreCorrelation(db, courseId)
      
      return res.json({
        ...summary,
        correlation
      })
      
    } catch (error) {
      console.error('Research summary error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 📐 Correlation Analysis
 * วิเคราะห์ความสัมพันธ์ระหว่าง Chat และ Worksheet scores
 */
exports.correlationAnalysis = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId } = req.query
      
      if (!courseId) {
        return res.status(400).json({ error: 'courseId is required' })
      }
      
      const result = await calculateScoreCorrelation(db, courseId)
      return res.json(result)
      
    } catch (error) {
      console.error('Correlation analysis error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 📚 Log Intervention (Micro-lesson, Knowledge Sheet, etc.)
 * บันทึกการเรียนเสริม/แทรกแซง
 */
exports.logInterventionEvent = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
      }
      
      const {
        studentId,
        courseId,
        interventionType, // 'micro_lesson' | 'knowledge_sheet' | 'teacher_feedback' | 'scaffolding'
        contentId,
        contentTitle,
        targetLOs,
        durationSec,
        completionRate,
        teacherId,
        notes
      } = req.body
      
      if (!studentId || !courseId || !interventionType) {
        return res.status(400).json({ 
          error: 'Missing required fields: studentId, courseId, interventionType' 
        })
      }
      
      const result = await logIntervention(db, {
        studentId,
        courseId,
        interventionType,
        contentId,
        contentTitle,
        targetLOs,
        durationSec,
        completionRate,
        teacherId,
        notes
      })
      
      return res.json(result)
      
    } catch (error) {
      console.error('Log intervention error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 📈 Student Growth History
 * ดึงประวัติพัฒนาการของนักเรียน
 */
exports.getGrowthHistory = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { studentId, courseId } = req.query
      
      if (!studentId || !courseId) {
        return res.status(400).json({ error: 'studentId and courseId are required' })
      }
      
      const historyDoc = await db.collection('studentGrowthHistory')
        .doc(`${studentId}_${courseId}`).get()
      
      if (!historyDoc.exists) {
        return res.json({
          success: true,
          studentId,
          courseId,
          history: [],
          message: 'No growth history found'
        })
      }
      
      const data = historyDoc.data()
      
      return res.json({
        success: true,
        studentId,
        courseId,
        history: data.history || [],
        latestScores: data.latestScores,
        latestAverage: data.latestAverage,
        totalEntries: data.totalEntries,
        firstEntry: data.firstEntry,
        lastUpdated: data.lastUpdated
      })
      
    } catch (error) {
      console.error('Get growth history error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 🔬 Research Data Quality Check
 * ตรวจสอบคุณภาพและความครบถ้วนของข้อมูลวิจัย
 */
exports.researchDataQuality = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId } = req.query
      
      if (!courseId) {
        return res.status(400).json({ error: 'courseId is required' })
      }
      
      // Check data completeness
      const [assessments, worksheets, events, interventions, growth] = await Promise.all([
        db.collection('assessments').where('courseId', '==', courseId).get(),
        db.collection('worksheetSubmissions').where('courseId', '==', courseId).get(),
        db.collection('learningEvents').where('courseId', '==', courseId).get(),
        db.collection('interventions').where('courseId', '==', courseId).get(),
        db.collection('studentGrowthHistory').where('courseId', '==', courseId).get()
      ])
      
      // Check for missing fields in assessments
      let missingReliabilityScore = 0
      let missingAiConfidence = 0
      let missingLOAssessment = 0
      
      assessments.forEach(doc => {
        const data = doc.data()
        if (data.reliabilityScore === undefined) missingReliabilityScore++
        if (data.aiConfidence === undefined) missingAiConfidence++
        if (!data.loAssessment) missingLOAssessment++
      })
      
      const quality = {
        courseId,
        checkedAt: new Date().toISOString(),
        
        // Data Volume
        dataVolume: {
          assessments: assessments.size,
          worksheets: worksheets.size,
          learningEvents: events.size,
          interventions: interventions.size,
          growthHistories: growth.size
        },
        
        // Data Completeness
        completeness: {
          assessmentsWithReliabilityScore: assessments.size > 0 
            ? Math.round(((assessments.size - missingReliabilityScore) / assessments.size) * 100) 
            : 0,
          assessmentsWithAiConfidence: assessments.size > 0 
            ? Math.round(((assessments.size - missingAiConfidence) / assessments.size) * 100) 
            : 0,
          assessmentsWithLOAssessment: assessments.size > 0 
            ? Math.round(((assessments.size - missingLOAssessment) / assessments.size) * 100) 
            : 0
        },
        
        // Data Synchronization
        synchronization: {
          eventToAssessmentRatio: assessments.size > 0 
            ? Math.round((events.size / assessments.size) * 100) / 100 
            : 0,
          hasInterventionData: interventions.size > 0,
          hasGrowthTracking: growth.size > 0
        },
        
        // Research Readiness Score (0-100) - Legacy version
        researchReadinessScore: calculateResearchReadinessLegacy(
          assessments.size,
          events.size,
          interventions.size,
          growth.size,
          missingReliabilityScore,
          missingAiConfidence
        ),
        
        // Recommendations
        recommendations: generateDataQualityRecommendations({
          assessments: assessments.size,
          events: events.size,
          interventions: interventions.size,
          growth: growth.size,
          missingReliability: missingReliabilityScore,
          missingConfidence: missingAiConfidence
        })
      }
      
      return res.json(quality)
      
    } catch (error) {
      console.error('Research data quality check error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * Calculate Research Readiness Score (Legacy - for researchDataQuality)
 */
function calculateResearchReadinessLegacy(assessments, events, interventions, growth, missingReliability, missingConfidence) {
  let score = 0
  
  // Volume score (max 30)
  if (assessments >= 100) score += 30
  else if (assessments >= 50) score += 20
  else if (assessments >= 20) score += 10
  
  // Event tracking score (max 25)
  if (events >= assessments * 0.9) score += 25
  else if (events >= assessments * 0.5) score += 15
  else if (events > 0) score += 5
  
  // Intervention data score (max 20)
  if (interventions >= 10) score += 20
  else if (interventions >= 5) score += 10
  else if (interventions > 0) score += 5
  
  // Growth tracking score (max 15)
  if (growth >= assessments * 0.8) score += 15
  else if (growth > 0) score += 10
  
  // Data quality score (max 10)
  const completenessRate = assessments > 0 
    ? ((assessments - missingReliability - missingConfidence) / (assessments * 2)) 
    : 0
  score += Math.round(completenessRate * 10)
  
  return Math.min(100, score)
}

/**
 * Generate Data Quality Recommendations
 */
function generateDataQualityRecommendations(data) {
  const recommendations = []
  
  if (data.assessments < 30) {
    recommendations.push({
      priority: 'HIGH',
      issue: `ข้อมูลน้อยเกินไป (${data.assessments} assessments)`,
      action: 'ต้องมีข้อมูลอย่างน้อย 30 ชุดสำหรับงานวิจัยที่น่าเชื่อถือ',
      impact: 'Statistical Significance'
    })
  }
  
  if (data.events < data.assessments * 0.5) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: 'Learning Events ไม่ครบถ้วน',
      action: 'ตรวจสอบว่าระบบบันทึก Events ทุกครั้งที่มีการประเมิน',
      impact: 'Data Triangulation'
    })
  }
  
  if (data.interventions === 0) {
    recommendations.push({
      priority: 'HIGH',
      issue: 'ไม่มีข้อมูล Intervention',
      action: 'เพิ่มการบันทึกเมื่อนักเรียนดู Micro-lesson หรือ Knowledge Sheet',
      impact: 'Pre/Post Analysis'
    })
  }
  
  if (data.growth === 0) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: 'ไม่มี Growth History',
      action: 'ระบบจะเริ่มบันทึกอัตโนมัติในการประเมินครั้งถัดไป',
      impact: 'Longitudinal Analysis'
    })
  }
  
  if (data.missingReliability > data.assessments * 0.1) {
    recommendations.push({
      priority: 'LOW',
      issue: `${data.missingReliability} assessments ไม่มี Reliability Score`,
      action: 'ข้อมูลเก่าก่อนอัพเกรดระบบ ไม่กระทบงานวิจัยหากใช้ข้อมูลใหม่',
      impact: 'System Validation'
    })
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'INFO',
      issue: 'ข้อมูลพร้อมสำหรับงานวิจัย',
      action: 'สามารถ Export และวิเคราะห์ได้ทันที',
      impact: 'Ready for Analysis'
    })
  }
  
  return recommendations
}

// ============================================================
// 🧹 SCHEDULED CLEANUP FUNCTIONS
// ============================================================

/**
 * Scheduled cleanup for rate limits (runs daily at 3 AM)
 */
exports.scheduledCleanupRateLimits = functions.pubsub
  .schedule('0 3 * * *')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    console.log('🧹 Starting scheduled rate limit cleanup...')
    
    try {
      const result = await cleanupRateLimits(db)
      console.log(`✅ Rate limit cleanup completed: ${result.deleted} entries deleted`)
      
      return { success: true, deleted: result.deleted }
    } catch (error) {
      console.error('❌ Rate limit cleanup failed:', error)
      return { success: false, error: error.message }
    }
  })

/**
 * Scheduled cleanup for old AI audit logs (runs weekly on Sunday at 2 AM)
 * Keeps logs for 30 days
 */
exports.scheduledCleanupAuditLogs = functions.pubsub
  .schedule('0 2 * * 0')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    console.log('🧹 Starting scheduled audit log cleanup...')
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30) // 30 days ago
    
    try {
      // Clean old AI parse logs
      const parseLogsSnap = await db.collection('aiParseLogs')
        .where('timestamp', '<', cutoffDate)
        .limit(500)
        .get()
      
      if (!parseLogsSnap.empty) {
        const batch = db.batch()
        parseLogsSnap.docs.forEach(doc => batch.delete(doc.ref))
        await batch.commit()
        console.log(`✅ Deleted ${parseLogsSnap.size} old AI parse logs`)
      }
      
      // Clean old anti-cheat logs (keep resolved ones for 7 days only)
      const resolvedCutoff = new Date()
      resolvedCutoff.setDate(resolvedCutoff.getDate() - 7)
      
      const antiCheatSnap = await db.collection('antiCheatLogs')
        .where('resolved', '==', true)
        .where('timestamp', '<', resolvedCutoff)
        .limit(500)
        .get()
      
      if (!antiCheatSnap.empty) {
        const batch = db.batch()
        antiCheatSnap.docs.forEach(doc => batch.delete(doc.ref))
        await batch.commit()
        console.log(`✅ Deleted ${antiCheatSnap.size} resolved anti-cheat logs`)
      }
      
      return { 
        success: true, 
        deletedParseLogs: parseLogsSnap.size,
        deletedAntiCheatLogs: antiCheatSnap.size
      }
    } catch (error) {
      console.error('❌ Audit log cleanup failed:', error)
      return { success: false, error: error.message }
    }
  })

// ============================================================
// � DATA RECONCILIATION FUNCTIONS
// ============================================================

/**
 * Scheduled reconciliation for assessment-studentProgress desync
 * Runs every 6 hours to catch and fix any data inconsistencies
 */
exports.scheduledReconciliation = functions.pubsub
  .schedule('0 */6 * * *')  // Every 6 hours
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    console.log('🔧 Starting scheduled reconciliation...')
    
    const stats = {
      checked: 0,
      fixed: 0,
      errors: [],
      startTime: Date.now()
    }
    
    try {
      // Get recent assessments (last 12 hours) to find potential desyncs
      const cutoffTime = new Date(Date.now() - 12 * 60 * 60 * 1000)
      
      const recentAssessmentsSnap = await db.collection('assessments')
        .where('createdAt', '>=', cutoffTime)
        .orderBy('createdAt', 'desc')
        .limit(500)
        .get()
      
      // Group by student-course pairs
      const studentCourseMap = new Map()
      
      recentAssessmentsSnap.docs.forEach(doc => {
        const data = doc.data()
        const key = `${data.studentId}_${data.courseId}`
        
        if (!studentCourseMap.has(key)) {
          studentCourseMap.set(key, {
            studentId: data.studentId,
            courseId: data.courseId,
            assessments: []
          })
        }
        
        studentCourseMap.get(key).assessments.push({
          id: doc.id,
          passedLOs: data.loAssessment?.passedLOs || [],
          createdAt: data.createdAt
        })
      })
      
      console.log(`📊 Found ${studentCourseMap.size} student-course pairs to check`)
      
      // Verify each pair
      for (const [key, data] of studentCourseMap) {
        stats.checked++
        
        try {
          const progressRef = db.collection('studentProgress').doc(key)
          const progressDoc = await progressRef.get()
          
          // Collect all passed LOs from assessments
          const expectedLOs = new Set()
          data.assessments.forEach(a => {
            a.passedLOs.forEach(lo => expectedLOs.add(lo))
          })
          
          // Get ALL assessments for complete picture
          const allAssessmentsSnap = await db.collection('assessments')
            .where('studentId', '==', data.studentId)
            .where('courseId', '==', data.courseId)
            .select('loAssessment')
            .get()
          
          allAssessmentsSnap.docs.forEach(doc => {
            const los = doc.data().loAssessment?.passedLOs || []
            los.forEach(lo => expectedLOs.add(lo))
          })
          
          if (!progressDoc.exists) {
            // Missing progress document - create it
            await progressRef.set({
              studentId: data.studentId,
              courseId: data.courseId,
              passedLOs: Array.from(expectedLOs),
              totalPassed: expectedLOs.size,
              assessmentCount: allAssessmentsSnap.size,
              lastReconciledAt: admin.firestore.FieldValue.serverTimestamp(),
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              createdBy: 'reconciliation'
            })
            
            stats.fixed++
            console.log(`✅ Created missing progress for ${key}`)
          } else {
            // Check for mismatches
            const storedLOs = new Set(progressDoc.data().passedLOs || [])
            const missing = [...expectedLOs].filter(lo => !storedLOs.has(lo))
            
            if (missing.length > 0) {
              // Fix the mismatch
              await progressRef.update({
                passedLOs: admin.firestore.FieldValue.arrayUnion(...missing),
                totalPassed: admin.firestore.FieldValue.increment(missing.length),
                lastReconciledAt: admin.firestore.FieldValue.serverTimestamp()
              })
              
              stats.fixed++
              console.log(`✅ Fixed ${key}: added ${missing.length} missing LOs`)
            }
          }
        } catch (pairError) {
          stats.errors.push({
            key,
            error: pairError.message
          })
        }
      }
      
      // Log results
      const duration = Date.now() - stats.startTime
      console.log(`📊 Reconciliation completed in ${duration}ms: checked=${stats.checked}, fixed=${stats.fixed}, errors=${stats.errors.length}`)
      
      // Store report
      await db.collection('systemReports').add({
        type: 'reconciliation',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        stats,
        durationMs: duration
      })
      
      return { success: true, ...stats }
    } catch (error) {
      console.error('❌ Reconciliation failed:', error)
      return { success: false, error: error.message, stats }
    }
  })

/**
 * Manual reconciliation trigger for specific student-course
 * Callable by admin
 */
exports.triggerReconciliation = functions.https.onCall(async (data, context) => {
  // Verify admin access
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
  }
  
  const callerDoc = await db.collection('users').doc(context.auth.uid).get()
  const callerRole = callerDoc.data()?.role
  
  if (!['teacher', 'ministry_admin', 'esa_admin', 'school_admin'].includes(callerRole)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }
  
  const { studentId, courseId } = data
  
  if (!studentId || !courseId) {
    throw new functions.https.HttpsError('invalid-argument', 'studentId and courseId required')
  }
  
  try {
    const key = `${studentId}_${courseId}`
    
    // Get all assessments
    const assessmentsSnap = await db.collection('assessments')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .get()
    
    // Collect all passed LOs
    const passedLOs = new Set()
    let totalPoints = 0
    
    assessmentsSnap.docs.forEach(doc => {
      const assessment = doc.data()
      const los = assessment.loAssessment?.passedLOs || []
      los.forEach(lo => passedLOs.add(lo))
      totalPoints += calculatePointsSimple(assessment)
    })
    
    // Update progress
    const progressRef = db.collection('studentProgress').doc(key)
    await progressRef.set({
      studentId,
      courseId,
      passedLOs: Array.from(passedLOs),
      totalPassed: passedLOs.size,
      assessmentCount: assessmentsSnap.size,
      totalPoints,
      lastReconciledAt: admin.firestore.FieldValue.serverTimestamp(),
      reconciledBy: context.auth.uid
    }, { merge: true })
    
    return {
      success: true,
      passedLOsCount: passedLOs.size,
      assessmentCount: assessmentsSnap.size,
      totalPoints
    }
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message)
  }
})

// ============================================================
// �🔬 RESEARCH DATA PIPELINE v3.0 - NEW APIs
// ============================================================

/**
 * 📊 Sequential Pattern Mining - Log Event
 * บันทึก micro-level events สำหรับ Sequential Pattern Mining
 */
exports.logSequenceEventAPI = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
      }
      
      const { sessionId, studentId, courseId, questionId, eventType, data } = req.body
      
      if (!sessionId || !studentId || !questionId || !eventType) {
        return res.status(400).json({ 
          error: 'Missing required fields: sessionId, studentId, questionId, eventType' 
        })
      }
      
      // Validate eventType
      const validTypes = Object.keys(SEQUENCE_EVENT_TYPES)
      if (!validTypes.includes(eventType)) {
        return res.status(400).json({ 
          error: `Invalid eventType. Must be one of: ${validTypes.join(', ')}` 
        })
      }
      
      const result = await logSequenceEvent(db, {
        sessionId,
        studentId,
        courseId,
        questionId,
        eventType,
        data
      })
      
      return res.json(result)
      
    } catch (error) {
      console.error('Log sequence event error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 📊 Sequential Pattern Mining - Finalize Sequence
 * สรุป sequence เมื่อจบการตอบคำถาม
 */
exports.finalizeSequenceAPI = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
      }
      
      const { sessionId, questionId } = req.body
      
      if (!sessionId || !questionId) {
        return res.status(400).json({ 
          error: 'Missing required fields: sessionId, questionId' 
        })
      }
      
      const result = await finalizeSequence(db, sessionId, questionId)
      return res.json(result)
      
    } catch (error) {
      console.error('Finalize sequence error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 📊 K-Anonymity Export
 * Enhanced anonymization สำหรับ publication-ready data
 */
exports.exportKAnonymousDataAPI = functions.runWith({
  timeoutSeconds: 300,
  memory: '1GB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId, k, level, format } = req.query
      
      if (!courseId) {
        return res.status(400).json({ error: 'courseId is required' })
      }
      
      const result = await exportKAnonymousData(db, courseId, {
        k: k ? parseInt(k) : 5,
        level: level || 'research',
        format: format || 'json'
      })
      
      if (!result.success) {
        return res.status(500).json({ error: result.error })
      }
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename=k${k}_${level}_${courseId}.csv`)
        return res.send(result.data)
      }
      
      return res.json(result)
      
    } catch (error) {
      console.error('K-Anonymity export error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 🔒 Re-identification Risk Assessment
 * ประเมินความเสี่ยงในการระบุตัวตนจากข้อมูล
 */
exports.assessReidentificationRiskAPI = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId } = req.query
      
      if (!courseId) {
        return res.status(400).json({ error: 'courseId is required' })
      }
      
      const result = await assessReidentificationRisk(db, courseId)
      return res.json(result)
      
    } catch (error) {
      console.error('Risk assessment error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 📈 Research Readiness Score v2
 * With Power Analysis and Statistical Requirements
 */
exports.researchReadinessV2 = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId } = req.query
      
      if (!courseId) {
        return res.status(400).json({ error: 'courseId is required' })
      }
      
      const result = await calculateResearchReadiness(db, courseId)
      return res.json(result)
      
    } catch (error) {
      console.error('Research readiness error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 📊 Get Learning Sequences
 * ดึงข้อมูล sequential pattern ของนักเรียน
 */
exports.getLearningSequences = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId, studentId, sessionId, finalizedOnly } = req.query
      
      let query = db.collection('learningSequences')
      
      if (courseId) query = query.where('courseId', '==', courseId)
      if (studentId) query = query.where('studentId', '==', studentId)
      if (sessionId) query = query.where('sessionId', '==', sessionId)
      if (finalizedOnly === 'true') query = query.where('finalized', '==', true)
      
      const sequences = await query.limit(500).get()
      
      const results = sequences.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Calculate common patterns if courseId provided
      let patternAnalysis = null
      if (courseId && results.length > 0) {
        const patterns = results
          .filter(r => r.sequenceSummary?.pattern)
          .map(r => r.sequenceSummary.pattern)
        
        const patternCounts = {}
        patterns.forEach(p => {
          patternCounts[p] = (patternCounts[p] || 0) + 1
        })
        
        const sortedPatterns = Object.entries(patternCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
        
        patternAnalysis = {
          totalSequences: patterns.length,
          uniquePatterns: Object.keys(patternCounts).length,
          topPatterns: sortedPatterns.map(([pattern, count]) => ({
            pattern,
            count,
            percentage: Math.round((count / patterns.length) * 100)
          }))
        }
      }
      
      return res.json({
        success: true,
        sequences: results,
        count: results.length,
        patternAnalysis
      })
      
    } catch (error) {
      console.error('Get learning sequences error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * Sync worksheet counts in learning rooms
 * Removes deleted worksheet IDs and returns actual count
 */
exports.syncLearningRoomWorksheets = functions.runWith({
  timeoutSeconds: 60,
  memory: '256MB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { roomId } = req.body
      
      if (roomId) {
        // Sync specific room
        const roomDoc = await db.collection('learningRooms').doc(roomId).get()
        if (!roomDoc.exists) {
          return res.status(404).send({ error: 'Room not found' })
        }
        
        const roomData = roomDoc.data()
        const worksheetIds = roomData.worksheetIds || []
        
        // Check which worksheets actually exist
        const existingIds = []
        for (const wsId of worksheetIds) {
          const wsDoc = await db.collection('eWorksheets').doc(wsId).get()
          if (wsDoc.exists) {
            existingIds.push(wsId)
          }
        }
        
        // Update if different
        if (existingIds.length !== worksheetIds.length) {
          await db.collection('learningRooms').doc(roomId).update({
            worksheetIds: existingIds
          })
        }
        
        return res.status(200).send({
          success: true,
          roomId,
          originalCount: worksheetIds.length,
          actualCount: existingIds.length,
          removed: worksheetIds.length - existingIds.length
        })
      } else {
        // Sync all rooms
        const roomsSnap = await db.collection('learningRooms').get()
        let totalSynced = 0
        let totalRemoved = 0
        
        for (const roomDoc of roomsSnap.docs) {
          const roomData = roomDoc.data()
          const worksheetIds = roomData.worksheetIds || []
          
          // Check which worksheets actually exist
          const existingIds = []
          for (const wsId of worksheetIds) {
            const wsDoc = await db.collection('eWorksheets').doc(wsId).get()
            if (wsDoc.exists) {
              existingIds.push(wsId)
            }
          }
          
          // Update if different
          if (existingIds.length !== worksheetIds.length) {
            await db.collection('learningRooms').doc(roomDoc.id).update({
              worksheetIds: existingIds
            })
            totalSynced++
            totalRemoved += worksheetIds.length - existingIds.length
          }
        }
        
        return res.status(200).send({
          success: true,
          roomsChecked: roomsSnap.size,
          roomsSynced: totalSynced,
          worksheetsRemoved: totalRemoved
        })
      }
    } catch (error) {
      console.error('❌ Sync error:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

// ============================================================
// 📊 QUALITY ASSURANCE ENDPOINTS (Phase 2+)
// ============================================================

/**
 * 📊 Get Fairness Report - Bias analysis across demographic groups
 * POST /getFairnessReport { courseId, period }
 */
exports.getFairnessReport = qualityAssuranceController.getFairnessReport

/**
 * 👁️ Submit Assessment for Expert Review
 * POST /submitForReview { assessmentId, reason, priority }
 */
exports.submitForReview = qualityAssuranceController.submitForReview

/**
 * 📋 Get Review Queue - Pending assessments for expert review
 * GET /getReviewQueue?status=pending
 */
exports.getReviewQueue = qualityAssuranceController.getReviewQueue

/**
 * ✅ Submit Expert Review - Human validation of AI assessment
 * POST /submitExpertReview { reviewId, expertScores, notes }
 */
exports.submitExpertReview = qualityAssuranceController.submitExpertReview

/**
 * 📐 Get Validation Data - Psychometric validation for research
 * POST /getValidationData { courseId, validationType }
 */
exports.getValidationData = qualityAssuranceController.getValidationData

/**
 * 🎓 Get Grade Calibration - Grade-appropriate scoring thresholds
 * GET /getGradeCalibration?gradeLevel=ม.3&subject=วิทยาศาสตร์
 */
exports.getGradeCalibration = qualityAssuranceController.getGradeCalibration

/**
 * 📊 Get Calibration Report - Expert agreement statistics
 * POST /getCalibrationReport { courseId }
 */
exports.getCalibrationReport = qualityAssuranceController.getCalibrationReport

// ============================================================================
// 🔧 GAP ANALYSIS FIX - Missing Backend Functions (Created: 2024-12-23)
// ============================================================================

/**
 * 🔄 Update Adaptive Path - Mark step as completed
 * POST /updateAdaptivePath { pathId, stepIndex, completed }
 */
exports.updateAdaptivePath = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { pathId, stepIndex, completed } = req.body

      if (!pathId || stepIndex === undefined) {
        return res.status(400).send({ 
          error: 'Missing required fields: pathId, stepIndex' 
        })
      }

      const pathRef = db.collection('learningPaths').doc(pathId)
      const pathDoc = await pathRef.get()

      if (!pathDoc.exists) {
        return res.status(404).send({ error: 'Learning path not found' })
      }

      const pathData = pathDoc.data()
      const steps = pathData.steps || []

      if (stepIndex < 0 || stepIndex >= steps.length) {
        return res.status(400).send({ error: 'Invalid step index' })
      }

      // Update step completion
      steps[stepIndex].completed = completed
      steps[stepIndex].completedAt = completed ? admin.firestore.FieldValue.serverTimestamp() : null

      // Check if all steps completed
      const allCompleted = steps.every(s => s.completed)
      const newStatus = allCompleted ? 'completed' : 'active'

      await pathRef.update({
        steps,
        status: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(allCompleted && { completedAt: admin.firestore.FieldValue.serverTimestamp() })
      })

      return res.status(200).send({
        success: true,
        status: newStatus,
        completedSteps: steps.filter(s => s.completed).length,
        totalSteps: steps.length
      })
    } catch (error) {
      console.error('Error updating adaptive path:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

/**
 * 📝 Assess Submission Multi-Pass - Multi-pass AI assessment for assignments
 * POST /assessSubmissionMultiPass { submissionId, assignmentId, studentAnswer|answer, questionText?, ... }
 */
exports.assessSubmissionMultiPass = functions.runWith({ secrets: [openaiApiKey] }).https.onRequest(async (req, res) => {
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
      const pass1Response = await openai.chat.completions.create({
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
        const pass2Response = await openai.chat.completions.create({
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
 * 👨‍🏫 Submit Teacher Review - Teacher reviews and adjusts AI assessment
 * POST /submitTeacherReview { assessmentId, teacherScores, teacherFeedback, approved }
 * 🔐 SECURED: Teacher/Admin only
 */
exports.submitTeacherReview = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      // 🔐 RBAC: Verify teacher/admin role
      const caller = await verifyTeacherRole(req, res)
      if (!caller) return // Response already sent

      const { assessmentId, teacherId, teacherScores, teacherFeedback, approved, adjustedScores } = req.body

      if (!assessmentId || !teacherId) {
        return res.status(400).send({ 
          error: 'Missing required fields: assessmentId, teacherId' 
        })
      }

      // Get original assessment
      const assessmentRef = db.collection('assessments').doc(assessmentId)
      const assessmentDoc = await assessmentRef.get()

      if (!assessmentDoc.exists) {
        // Try submissionAssessments collection
        const subAssessmentRef = db.collection('submissionAssessments').doc(assessmentId)
        const subDoc = await subAssessmentRef.get()
        
        if (!subDoc.exists) {
          return res.status(404).send({ error: 'Assessment not found' })
        }

        await subAssessmentRef.update({
          teacherReview: {
            teacherId,
            teacherScores: adjustedScores || teacherScores,
            teacherFeedback,
            approved,
            reviewedAt: admin.firestore.FieldValue.serverTimestamp()
          },
          status: approved ? 'approved' : 'needs_revision',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })

        return res.status(200).send({ success: true, message: 'Teacher review submitted' })
      }

      // Update main assessments collection
      await assessmentRef.update({
        teacherReview: {
          teacherId,
          teacherScores: adjustedScores || teacherScores,
          teacherFeedback,
          approved,
          reviewedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        finalScores: adjustedScores || assessmentDoc.data().rubricScores,
        status: approved ? 'approved' : 'needs_revision',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      // Log for IRR calculation
      await db.collection('teacherReviews').add({
        assessmentId,
        teacherId,
        originalScores: assessmentDoc.data().rubricScores,
        teacherScores: adjustedScores || teacherScores,
        feedback: teacherFeedback,
        approved,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      })

      return res.status(200).send({
        success: true,
        message: 'Teacher review submitted successfully'
      })
    } catch (error) {
      console.error('Error submitting teacher review:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

/**
 * 📝 Submit Appeal - Student submits score appeal
 * POST /submitAppeal { assessmentId, studentId, reason, expectedScores }
 */
exports.submitAppeal = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { assessmentId, studentId, reason, expectedScores, category } = req.body

      if (!assessmentId || !studentId || !reason) {
        return res.status(400).send({ 
          error: 'Missing required fields: assessmentId, studentId, reason' 
        })
      }

      // Check if appeal already exists
      const existingAppeals = await db.collection('appeals')
        .where('assessmentId', '==', assessmentId)
        .where('status', '==', 'pending')
        .get()

      if (!existingAppeals.empty) {
        return res.status(400).send({ 
          error: 'An appeal for this assessment is already pending' 
        })
      }

      // Get original assessment
      const assessmentDoc = await db.collection('assessments').doc(assessmentId).get()
      if (!assessmentDoc.exists) {
        return res.status(404).send({ error: 'Assessment not found' })
      }

      const appealRef = await db.collection('appeals').add({
        assessmentId,
        studentId,
        reason,
        expectedScores: expectedScores || null,
        category: category || 'scoring',
        originalScores: assessmentDoc.data().rubricScores,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      // Update assessment status
      await db.collection('assessments').doc(assessmentId).update({
        hasAppeal: true,
        appealId: appealRef.id
      })

      return res.status(200).send({
        success: true,
        appealId: appealRef.id,
        message: 'Appeal submitted successfully'
      })
    } catch (error) {
      console.error('Error submitting appeal:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

/**
 * ⚖️ Resolve Appeal - Teacher/Admin resolves student appeal
 * POST /resolveAppeal { appealId, resolution, adjustedScores, teacherNotes }
 * 🔐 SECURED: Teacher/Admin only
 */
exports.resolveAppeal = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      // 🔐 RBAC: Verify teacher/admin role
      const caller = await verifyTeacherRole(req, res)
      if (!caller) return // Response already sent

      const { appealId, resolution, adjustedScores, teacherNotes, reviewerId } = req.body

      if (!appealId || !resolution || !reviewerId) {
        return res.status(400).send({ 
          error: 'Missing required fields: appealId, resolution, reviewerId' 
        })
      }

      const appealRef = db.collection('appeals').doc(appealId)
      const appealDoc = await appealRef.get()

      if (!appealDoc.exists) {
        return res.status(404).send({ error: 'Appeal not found' })
      }

      const appealData = appealDoc.data()

      // Update appeal
      await appealRef.update({
        status: resolution, // 'approved', 'rejected', 'partial'
        adjustedScores: adjustedScores || null,
        teacherNotes,
        reviewerId,
        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      // If approved/partial, update assessment scores
      if ((resolution === 'approved' || resolution === 'partial') && adjustedScores) {
        const totalScore = Object.values(adjustedScores).reduce((a, b) => a + b, 0)
        await db.collection('assessments').doc(appealData.assessmentId).update({
          rubricScores: adjustedScores,
          totalScore,
          appealResolution: resolution,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      return res.status(200).send({
        success: true,
        message: `Appeal ${resolution}`
      })
    } catch (error) {
      console.error('Error resolving appeal:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

/**
 * 📖 Get Detailed Explanation - AI explains assessment scores
 * POST /getDetailedExplanation { assessmentId }
 */
exports.getDetailedExplanation = functions.runWith({ secrets: [openaiApiKey] }).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { assessmentId } = req.body

      if (!assessmentId) {
        return res.status(400).send({ error: 'Missing assessmentId' })
      }

      const assessmentDoc = await db.collection('assessments').doc(assessmentId).get()
      if (!assessmentDoc.exists) {
        return res.status(404).send({ error: 'Assessment not found' })
      }

      const assessment = assessmentDoc.data()
      const modelToUse = process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18'

      const response = await openai.chat.completions.create({
        model: modelToUse,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are an educational expert explaining assessment scores to students.
Provide detailed, constructive explanations in Thai language.
Be encouraging while being honest about areas for improvement.`
          },
          {
            role: 'user',
            content: `Explain this assessment in detail:
Question: ${assessment.questionText || 'N/A'}
Student Answer: ${assessment.studentAnswer || 'N/A'}
Scores: ${JSON.stringify(assessment.rubricScores)}
Total: ${assessment.totalScore}/20

Explain:
1. Why each dimension received its score
2. What was done well
3. Specific suggestions for improvement
4. How to improve each weak area`
          }
        ]
      })

      const explanation = response.choices[0].message.content

      // Cache explanation
      await db.collection('assessments').doc(assessmentId).update({
        detailedExplanation: explanation,
        explanationGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      return res.status(200).send({
        success: true,
        explanation,
        assessment: {
          rubricScores: assessment.rubricScores,
          totalScore: assessment.totalScore,
          feedback: assessment.feedback
        }
      })
    } catch (error) {
      console.error('Error getting detailed explanation:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

/**
 * 📚 Get Courses - List courses for a teacher
 * GET /getCourses?teacherId=xxx
 */
exports.getCourses = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { teacherId } = req.query

      let coursesQuery = db.collection('courses')
      
      if (teacherId) {
        coursesQuery = coursesQuery.where('teacherId', '==', teacherId)
      }

      const snapshot = await coursesQuery.orderBy('createdAt', 'desc').get()
      
      const courses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      return res.status(200).send({
        success: true,
        courses,
        count: courses.length
      })
    } catch (error) {
      console.error('Error getting courses:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

/**
 * 📖 Generate Micro Lesson - AI generates bite-sized learning content
 * POST /generateMicroLesson { courseId, topic, learningOutcome, difficulty }
 */
exports.generateMicroLesson = functions.runWith({ secrets: [openaiApiKey] }).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { courseId, topic, learningOutcome, difficulty, gradeLevel, subject } = req.body

      if (!topic) {
        return res.status(400).send({ error: 'Missing required field: topic' })
      }

      const modelToUse = process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18'

      const response = await openai.chat.completions.create({
        model: modelToUse,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are an expert educational content creator for Thai students.
Create engaging micro-lessons (5-10 minute learning modules).
Grade Level: ${gradeLevel || 'มัธยมศึกษา'}
Subject: ${subject || 'General'}

Return JSON:
{
  "title": "string",
  "objectives": ["..."],
  "content": {
    "introduction": "string",
    "mainContent": "string with markdown",
    "examples": ["..."],
    "summary": "string"
  },
  "activities": [{"type": "quiz|reflection|practice", "instruction": "string"}],
  "estimatedMinutes": number,
  "relatedLOs": ["..."]
}`
          },
          {
            role: 'user',
            content: `Create a micro-lesson about: ${topic}
${learningOutcome ? `Learning Outcome: ${learningOutcome}` : ''}
${difficulty ? `Difficulty: ${difficulty}` : ''}`
          }
        ]
      })

      const lesson = JSON.parse(
        response.choices[0].message.content
          .replace(/^```(?:json)?\s*\n?/i, '')
          .replace(/\n?```\s*$/i, '')
      )

      // Save to Firestore
      const lessonRef = await db.collection('microLessons').add({
        courseId: courseId || null,
        topic,
        learningOutcome,
        difficulty: difficulty || 'medium',
        gradeLevel,
        subject,
        ...lesson,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })

      return res.status(200).send({
        success: true,
        lessonId: lessonRef.id,
        ...lesson
      })
    } catch (error) {
      console.error('Error generating micro lesson:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

/**
 * 🎯 Generate Interventions - AI suggests personalized interventions
 * POST /generateInterventions { studentId, courseId }
 */
exports.generateInterventions = functions.runWith({ secrets: [openaiApiKey] }).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { studentId, courseId } = req.body

      if (!studentId) {
        return res.status(400).send({ error: 'Missing studentId' })
      }

      // Get student's assessment history
      let query = db.collection('assessments').where('studentId', '==', studentId)
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }
      
      const assessmentsSnapshot = await query.orderBy('timestamp', 'desc').limit(20).get()
      
      const assessments = assessmentsSnapshot.docs.map(doc => doc.data())

      if (assessments.length === 0) {
        return res.status(200).send({
          success: true,
          interventions: [],
          message: 'No assessment data available'
        })
      }

      // Calculate dimension averages
      const dimensionTotals = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
      assessments.forEach(a => {
        if (a.rubricScores) {
          Object.keys(dimensionTotals).forEach(dim => {
            dimensionTotals[dim] += a.rubricScores[dim] || 0
          })
        }
      })

      const dimensionAverages = {}
      Object.keys(dimensionTotals).forEach(dim => {
        dimensionAverages[dim] = (dimensionTotals[dim] / assessments.length).toFixed(2)
      })

      const modelToUse = process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18'

      const response = await openai.chat.completions.create({
        model: modelToUse,
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content: `You are an educational intervention specialist.
Based on student performance data, suggest specific interventions.
Return JSON array of interventions:
[{
  "type": "remediation|enrichment|practice|support",
  "priority": "high|medium|low",
  "targetDimension": "analysis|reasoning|creativity|evidence",
  "title": "string",
  "description": "string in Thai",
  "activities": ["specific activity suggestions"],
  "estimatedTime": "string",
  "resources": ["optional resource links"]
}]`
          },
          {
            role: 'user',
            content: `Student Performance (${assessments.length} assessments):
Dimension Averages (out of 5):
- Analysis: ${dimensionAverages.analysis}
- Reasoning: ${dimensionAverages.reasoning}
- Creativity: ${dimensionAverages.creativity}
- Evidence: ${dimensionAverages.evidence}

Suggest 3-5 targeted interventions.`
          }
        ]
      })

      const interventions = JSON.parse(
        response.choices[0].message.content
          .replace(/^```(?:json)?\s*\n?/i, '')
          .replace(/\n?```\s*$/i, '')
      )

      return res.status(200).send({
        success: true,
        studentId,
        performanceSummary: dimensionAverages,
        assessmentCount: assessments.length,
        interventions
      })
    } catch (error) {
      console.error('Error generating interventions:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

/**
 * ✅ Verify Evidence - Verify portfolio evidence authenticity
 * POST /verifyEvidence { evidenceId, verificationCode }
 */
exports.verifyEvidence = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { evidenceId, verificationCode } = req.body

      if (!evidenceId && !verificationCode) {
        return res.status(400).send({ 
          error: 'Provide either evidenceId or verificationCode' 
        })
      }

      let evidenceDoc
      
      if (verificationCode) {
        const snapshot = await db.collection('portfolioEvidence')
          .where('verificationCode', '==', verificationCode)
          .limit(1)
          .get()
        
        if (snapshot.empty) {
          return res.status(404).send({ 
            success: false, 
            verified: false,
            error: 'Evidence not found' 
          })
        }
        evidenceDoc = snapshot.docs[0]
      } else {
        const doc = await db.collection('portfolioEvidence').doc(evidenceId).get()
        if (!doc.exists) {
          return res.status(404).send({ 
            success: false, 
            verified: false,
            error: 'Evidence not found' 
          })
        }
        evidenceDoc = doc
      }

      const evidence = evidenceDoc.data()

      // Log verification attempt
      await db.collection('verificationLogs').add({
        evidenceId: evidenceDoc.id,
        verificationCode,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        ip: req.ip || 'unknown'
      })

      return res.status(200).send({
        success: true,
        verified: true,
        evidence: {
          id: evidenceDoc.id,
          studentId: evidence.studentId,
          type: evidence.type,
          title: evidence.title,
          score: evidence.score,
          createdAt: evidence.createdAt,
          courseId: evidence.courseId,
          courseName: evidence.courseName
        }
      })
    } catch (error) {
      console.error('Error verifying evidence:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

/**
 * 📦 Create Evidence Pack - Bundle portfolio evidence for sharing
 * POST /createEvidencePack { studentId, evidenceIds, title }
 */
exports.createEvidencePack = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { studentId, evidenceIds, title, description, isPublic } = req.body

      if (!studentId || !evidenceIds || evidenceIds.length === 0) {
        return res.status(400).send({ 
          error: 'Missing required fields: studentId, evidenceIds' 
        })
      }

      // Fetch evidence documents
      const evidencePromises = evidenceIds.map(id => 
        db.collection('portfolioEvidence').doc(id).get()
      )
      const evidenceDocs = await Promise.all(evidencePromises)

      const evidenceData = evidenceDocs
        .filter(doc => doc.exists)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

      if (evidenceData.length === 0) {
        return res.status(404).send({ error: 'No valid evidence found' })
      }

      // Generate verification code
      const verificationCode = `EP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      // Create evidence pack
      const packRef = await db.collection('evidencePacks').add({
        studentId,
        title: title || 'Evidence Pack',
        description: description || '',
        evidenceIds,
        evidenceCount: evidenceData.length,
        verificationCode,
        isPublic: isPublic || false,
        totalScore: evidenceData.reduce((sum, e) => sum + (e.score || 0), 0),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: null // Can add expiration if needed
      })

      return res.status(200).send({
        success: true,
        packId: packRef.id,
        verificationCode,
        evidenceCount: evidenceData.length,
        shareUrl: `${req.headers.origin || ''}/portfolio/verify?code=${verificationCode}`
      })
    } catch (error) {
      console.error('Error creating evidence pack:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

// =============================================================================
// 🤖 MULTI-AGENT ASSESSMENT SYSTEM (C10 Research Grade)
// =============================================================================

/**
 * 🤖 Multi-Agent Assessment - Professional-grade HOTS assessment
 * Uses 6 specialized agents for maximum accuracy
 * POST /assessAnswerMultiAgent { studentAnswer, question, context }
 */
exports.assessAnswerMultiAgent = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 300,
  memory: '1GB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { studentAnswer, question, context, studentId, sessionId } = req.body

      if (!studentAnswer || !question) {
        return res.status(400).send({ 
          error: 'Missing required fields: studentAnswer, question' 
        })
      }

      // Initialize OpenAI
      const openai = new OpenAI({ apiKey: openaiApiKey.value() })

      // Run multi-agent assessment
      const result = await runMultiAgentAssessment(
        openai,
        studentAnswer,
        question,
        context || {}
      )

      // Log for research
      if (studentId) {
        await logLearningEvent({
          studentId,
          eventType: 'MULTI_AGENT_ASSESSMENT',
          data: {
            questionId: question.id || 'unknown',
            totalScore: result.finalAssessment?.totalScore,
            agentScores: result.agentResults,
            confidence: result.finalAssessment?.confidence,
            processingTime: result.processingTime
          }
        })
      }

      return res.status(200).send({
        success: true,
        assessment: result.finalAssessment,
        agentDetails: result.agentResults,
        adversarialReview: result.adversarialReview,
        consensusProcess: result.consensusProcess,
        confidence: result.finalAssessment?.confidence,
        processingTime: result.processingTime
      })
    } catch (error) {
      console.error('Multi-agent assessment error:', error)
      return res.status(500).send({ 
        success: false, 
        error: error.message 
      })
    }
  })
})

// =============================================================================
// 📈 LEARNING TRAJECTORY ANALYTICS
// =============================================================================

/**
 * 📈 Get Student Learning Trajectory - Deep analysis of learning path
 * GET /getStudentTrajectory?studentId=xxx&courseId=yyy
 */
exports.getStudentTrajectory = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const studentId = req.query.studentId || req.body?.studentId
      const courseId = req.query.courseId || req.body?.courseId

      if (!studentId) {
        return res.status(400).send({ error: 'Missing studentId' })
      }

      // Fetch assessments for trajectory analysis
      let query = db.collection('assessments')
        .where('studentId', '==', studentId)
        .orderBy('createdAt', 'asc')
      
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }

      const snapshot = await query.limit(500).get()
      
      if (snapshot.empty) {
        return res.status(200).send({
          success: true,
          trajectory: null,
          message: 'No assessments found for trajectory analysis'
        })
      }

      const assessments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }))

      // Initialize analyzer and compute trajectory
      const analyzer = new LearningTrajectoryAnalyzer(studentId)
      const trajectory = analyzer.analyzeTrajectory(assessments)

      return res.status(200).send({
        success: true,
        trajectory: {
          studentId,
          assessmentCount: assessments.length,
          ...trajectory
        }
      })
    } catch (error) {
      console.error('Error getting trajectory:', error)
      return res.status(500).send({ 
        success: false, 
        error: error.message 
      })
    }
  })
})

/**
 * 📊 Export SEM-Ready Data - For structural equation modeling
 * POST /exportSEMData { courseId, minAssessments, kAnonymityThreshold }
 */
exports.exportSEMData = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      // Verify teacher role
      const auth = await verifyTeacherRole(req, res)
      if (!auth) return

      const { 
        courseId, 
        minAssessments = 3, 
        kAnonymityThreshold = 5 
      } = req.body

      // Fetch students with enough assessments
      const studentsQuery = await db.collection('users')
        .where('role', '==', 'student')
        .get()

      const studentTrajectories = []

      for (const studentDoc of studentsQuery.docs) {
        const studentId = studentDoc.id
        
        let assessmentQuery = db.collection('assessments')
          .where('studentId', '==', studentId)
          .orderBy('createdAt', 'asc')
        
        if (courseId) {
          assessmentQuery = assessmentQuery.where('courseId', '==', courseId)
        }

        const assessmentsSnap = await assessmentQuery.limit(200).get()
        
        if (assessmentsSnap.size >= minAssessments) {
          const assessments = assessmentsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date()
          }))

          const analyzer = new LearningTrajectoryAnalyzer(studentId)
          const trajectory = analyzer.analyzeTrajectory(assessments)
          
          studentTrajectories.push({
            studentId,
            studentData: studentDoc.data(),
            trajectory,
            assessmentCount: assessments.length
          })
        }
      }

      // Export to SEM format with k-anonymity
      const exporter = new SEMDataExporter()
      const semData = exporter.exportForSEM(studentTrajectories, {
        kAnonymityThreshold,
        includeRawScores: false
      })

      return res.status(200).send({
        success: true,
        data: semData,
        studentCount: studentTrajectories.length,
        exportedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error exporting SEM data:', error)
      return res.status(500).send({ 
        success: false, 
        error: error.message 
      })
    }
  })
})

// =============================================================================
// 🔬 RELIABILITY ECOSYSTEM (Golden Dataset, Bias, Drift)
// =============================================================================

/**
 * 🎯 Get Golden Dataset Stats - For research validation
 * GET /getGoldenDatasetStats
 */
exports.getGoldenDatasetStats = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Verify teacher role
      const auth = await verifyTeacherRole(req, res)
      if (!auth) return

      const goldenManager = new GoldenDatasetManager(db)
      const stats = await goldenManager.getDatasetStats()

      return res.status(200).send({
        success: true,
        stats
      })
    } catch (error) {
      console.error('Error getting golden dataset stats:', error)
      return res.status(500).send({ 
        success: false, 
        error: error.message 
      })
    }
  })
})

/**
 * ➕ Add to Golden Dataset - Expert-validated sample
 * POST /addGoldenSample { assessmentId, expertScores, expertId }
 */
exports.addGoldenSample = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      // Verify teacher role
      const auth = await verifyTeacherRole(req, res)
      if (!auth) return

      const { assessmentId, expertScores, expertId, notes } = req.body

      if (!assessmentId || !expertScores) {
        return res.status(400).send({ 
          error: 'Missing required fields: assessmentId, expertScores' 
        })
      }

      // Fetch original assessment
      const assessmentDoc = await db.collection('assessments').doc(assessmentId).get()
      if (!assessmentDoc.exists) {
        return res.status(404).send({ error: 'Assessment not found' })
      }

      const assessment = assessmentDoc.data()

      const goldenManager = new GoldenDatasetManager(db)
      const result = await goldenManager.addSample({
        originalAssessmentId: assessmentId,
        studentAnswer: assessment.studentAnswer,
        question: assessment.question,
        aiScores: assessment.rubricScores,
        expertScores,
        expertId: expertId || auth.uid,
        notes,
        metadata: {
          courseId: assessment.courseId,
          gradeLevel: assessment.gradeLevel
        }
      })

      return res.status(200).send({
        success: true,
        sampleId: result.id,
        message: 'Sample added to golden dataset'
      })
    } catch (error) {
      console.error('Error adding golden sample:', error)
      return res.status(500).send({ 
        success: false, 
        error: error.message 
      })
    }
  })
})

/**
 * 🔍 Run Bias Detection - Check for systematic biases
 * POST /runBiasDetection { assessmentIds }
 */
exports.runBiasDetection = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      // Verify teacher role
      const auth = await verifyTeacherRole(req, res)
      if (!auth) return

      const { courseId, limit = 100 } = req.body

      // Fetch recent assessments
      let query = db.collection('assessments')
        .orderBy('createdAt', 'desc')
        .limit(limit)
      
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }

      const snapshot = await query.get()
      const assessments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      const biasDetector = new BiasDetectionSystem()
      const biasReport = biasDetector.analyzeForBias(assessments)

      // Save report
      await db.collection('biasReports').add({
        ...biasReport,
        courseId,
        assessmentCount: assessments.length,
        analyzedBy: auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })

      return res.status(200).send({
        success: true,
        report: biasReport
      })
    } catch (error) {
      console.error('Error running bias detection:', error)
      return res.status(500).send({ 
        success: false, 
        error: error.message 
      })
    }
  })
})

/**
 * 📊 Get Expert Validation Dashboard Data
 * GET /getExpertValidationData
 */
exports.getExpertValidationData = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Verify teacher role
      const auth = await verifyTeacherRole(req, res)
      if (!auth) return

      // Get golden dataset stats
      const goldenSnapshot = await db.collection('goldenDataset')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get()

      const goldenSamples = goldenSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Calculate IRR if we have expert validations
      let irrMetrics = null
      if (goldenSamples.length >= 10) {
        const aiScores = goldenSamples.map(s => s.aiScores)
        const expertScores = goldenSamples.map(s => s.expertScores)
        
        // Calculate for each dimension
        const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
        irrMetrics = {}
        
        for (const dim of dimensions) {
          const aiDim = aiScores.map(s => s[dim] || 0)
          const expertDim = expertScores.map(s => s[dim] || 0)
          
          irrMetrics[dim] = {
            pearson: calculatePearsonCorrelation(aiDim, expertDim),
            mae: calculateMAE(aiDim, expertDim),
            weightedKappa: calculateWeightedKappa(aiDim, expertDim)
          }
        }

        // Overall
        const aiTotal = aiScores.map(s => 
          (s.analysis || 0) + (s.reasoning || 0) + (s.creativity || 0) + (s.evidence || 0)
        )
        const expertTotal = expertScores.map(s => 
          (s.analysis || 0) + (s.reasoning || 0) + (s.creativity || 0) + (s.evidence || 0)
        )
        
        irrMetrics.overall = {
          pearson: calculatePearsonCorrelation(aiTotal, expertTotal),
          mae: calculateMAE(aiTotal, expertTotal),
          icc: calculateICC(aiTotal.map((ai, i) => [ai, expertTotal[i]]))
        }
      }

      // Get recent bias reports
      const biasSnapshot = await db.collection('biasReports')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get()

      const biasReports = biasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Get pending validations (assessments needing expert review)
      const pendingSnapshot = await db.collection('assessments')
        .where('needsExpertReview', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get()

      const pendingValidations = pendingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      return res.status(200).send({
        success: true,
        data: {
          goldenDataset: {
            totalSamples: goldenSamples.length,
            samples: goldenSamples.slice(0, 10)
          },
          irrMetrics,
          biasReports,
          pendingValidations,
          publicationReadiness: irrMetrics?.overall?.icc?.value > 0.75 
            ? 'Ready' 
            : irrMetrics?.overall?.icc?.value > 0.6 
              ? 'Moderate' 
              : 'Needs Improvement'
        }
      })
    } catch (error) {
      console.error('Error getting expert validation data:', error)
      return res.status(500).send({ 
        success: false, 
        error: error.message 
      })
    }
  })
})

// =============================================================================
// 🧠 MENTAL MODEL MAPPING API (NEW)
// =============================================================================

const { MentalModelMapper } = require('./utils/mentalModelMapping')

/**
 * 🧠 Get Student Mental Model Map
 * สร้างแผนภาพโครงข่ายแนวคิดของนักเรียน
 * GET /getMentalModelMap?studentId=xxx&sessionId=yyy
 */
exports.getMentalModelMap = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const studentId = req.query.studentId || req.body?.studentId
      const sessionId = req.query.sessionId || req.body?.sessionId
      const includeRaw = req.query.includeRaw === 'true'

      if (!studentId) {
        return res.status(400).send({ error: 'Missing studentId' })
      }

      const mapper = new MentalModelMapper(db)
      const result = await mapper.buildMentalModelMap(studentId, sessionId, {
        includeRawResponses: includeRaw,
        maxAssessments: 50
      })

      if (!result.success) {
        return res.status(200).send({
          success: false,
          error: result.error,
          assessmentCount: result.assessmentCount
        })
      }

      return res.status(200).send({
        success: true,
        mentalModelMap: result.mentalModelMap
      })
    } catch (error) {
      console.error('Mental model mapping error:', error)
      return res.status(500).send({ 
        success: false, 
        error: error.message 
      })
    }
  })
})

/**
 * 🧠 Get Conceptual Change Analysis
 * วิเคราะห์การเปลี่ยนแปลงมโนทัศน์เชิงลึก
 */
exports.getConceptualChangeAnalysis = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { studentId, courseId, startDate, endDate } = req.query

      if (!studentId) {
        return res.status(400).send({ error: 'Missing studentId' })
      }

      // Get assessments with filters
      let query = db.collection('assessments')
        .where('studentId', '==', studentId)
        .orderBy('createdAt', 'asc')

      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }

      const snapshot = await query.limit(100).get()
      const assessments = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt)
        
        // Filter by date range if provided
        if (startDate && createdAt < new Date(startDate)) return
        if (endDate && createdAt > new Date(endDate)) return
        
        if (data.studentAnswer && data.rubricScores) {
          assessments.push({
            id: doc.id,
            ...data,
            createdAt
          })
        }
      })

      if (assessments.length < 3) {
        return res.status(200).send({
          success: false,
          error: 'Need at least 3 assessments for conceptual change analysis',
          assessmentCount: assessments.length
        })
      }

      // Analyze conceptual changes
      const mapper = new MentalModelMapper(db)
      const conceptSequence = mapper.extractConceptSequence(assessments)
      const conceptualChanges = mapper.detectConceptualChanges(conceptSequence)
      const dimensionModels = mapper.buildDimensionModels(conceptSequence)

      // Generate narrative
      const narrative = generateConceptualChangeNarrative(
        assessments,
        conceptualChanges,
        dimensionModels
      )

      return res.status(200).send({
        success: true,
        studentId,
        courseId: courseId || 'all',
        assessmentCount: assessments.length,
        timeSpan: {
          start: assessments[0].createdAt,
          end: assessments[assessments.length - 1].createdAt,
          durationDays: Math.ceil(
            (assessments[assessments.length - 1].createdAt - assessments[0].createdAt) / (1000 * 60 * 60 * 24)
          )
        },
        conceptualChanges,
        dimensionModels,
        narrative,
        generatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Conceptual change analysis error:', error)
      return res.status(500).send({ 
        success: false, 
        error: error.message 
      })
    }
  })
})

/**
 * Generate narrative for conceptual change analysis
 */
function generateConceptualChangeNarrative(assessments, changes, dimensionModels) {
  const parts = []
  
  // Opening
  parts.push(`จากการวิเคราะห์คำตอบ ${assessments.length} รายการ พบการเปลี่ยนแปลงทางมโนทัศน์ดังนี้:`)
  
  // Major changes
  if (changes.significantChanges && changes.significantChanges.length > 0) {
    parts.push(`\n**การเปลี่ยนแปลงที่สำคัญ:**`)
    for (const change of changes.significantChanges.slice(0, 3)) {
      const typeName = {
        'BELIEF_REVISION': 'การปรับความเชื่อ',
        'MENTAL_MODEL_TRANSFORMATION': 'การเปลี่ยนรูปแบบความคิด',
        'CATEGORICAL_SHIFT': 'การเปลี่ยนหมวดหมู่',
        'KNOWLEDGE_ENRICHMENT': 'การเสริมความรู้'
      }[change.type] || change.type
      
      parts.push(`- ${typeName}: ${change.description || 'ตรวจพบการเปลี่ยนแปลงในมิติ ' + change.dimension}`)
    }
  }
  
  // Dimension progress
  parts.push(`\n**พัฒนาการรายมิติ:**`)
  const dims = ['analysis', 'reasoning', 'creativity', 'evidence']
  const dimNames = {
    analysis: 'การวิเคราะห์',
    reasoning: 'การให้เหตุผล',
    creativity: 'ความคิดสร้างสรรค์',
    evidence: 'การใช้หลักฐาน'
  }
  
  for (const dim of dims) {
    const model = dimensionModels[dim]
    if (model) {
      const growth = model.growth || 0
      const trend = growth > 0 ? '↑ เพิ่มขึ้น' : growth < 0 ? '↓ ลดลง' : '→ คงที่'
      parts.push(`- ${dimNames[dim]}: ${trend}${Math.abs(growth) > 0 ? ` (${growth > 0 ? '+' : ''}${growth.toFixed(1)})` : ''}`)
    }
  }
  
  // Recommendations
  parts.push(`\n**ข้อเสนอแนะ:**`)
  if (changes.summary?.totalChanges > 0) {
    parts.push(`- นักเรียนแสดงพัฒนาการที่ดี ควรส่งเสริมการเรียนรู้เชิงลึกต่อไป`)
  } else {
    parts.push(`- ควรใช้คำถามกระตุ้นที่ท้าทายขึ้นเพื่อสร้างการเปลี่ยนแปลงทางมโนทัศน์`)
  }
  
  return parts.join('\n')
}