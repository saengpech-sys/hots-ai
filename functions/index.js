// Load environment variables from .env file for local development
require('dotenv').config()

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })
const { calculatePoints, calculatePointsSimple, checkBadges, calculateStreak, BADGES } = require('./gamification')
const { 
  getOpenAIClient, 
  openaiApiKeySecret, 
  getDefaultModel, 
  MODELS 
} = require('./utils/openaiClient')

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

// �️ Anti-Cheat Module - detection functions
const {
  detectEmotionalState,
  detectSpeedRun,
  detectHackerAttempt,
  detectCopyPaste,
  validateAntiCheat,
  validateAssessmentResult
} = require('./utils/antiCheat')

// �🚦 Rate Limiter Module - ป้องกัน spam และค่าใช้จ่ายบานปลาย
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
  createAssessmentPrompt,
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

// ============================================================
// 🔥 FIREBASE INITIALIZATION (MUST BE BEFORE CONTROLLERS)
// ============================================================
admin.initializeApp()
const db = admin.firestore()

// ============================================================
// 📦 CONTROLLERS - Modular Backend Architecture (Phase 6+7)
// Controllers MUST be required AFTER admin.initializeApp()
// ============================================================
const qualityAssuranceController = require('./controllers/qualityAssuranceController')
const gamificationController = require('./controllers/gamificationController')
const generationController = require('./controllers/generationController')
const researchController = require('./controllers/researchController')
const systemController = require('./controllers/systemController')
const analyticsController = require('./controllers/analyticsController')
const reviewController = require('./controllers/reviewController')
const certificationController = require('./controllers/certificationController')
const esaDashboardController = require('./controllers/esaDashboardController')
const schoolOnboardingController = require('./controllers/schoolOnboardingController')
const ministryDashboardController = require('./controllers/ministryDashboardController')

// 🆕 Phase 7: New Controllers
const courseController = require('./controllers/courseController')
const questionController = require('./controllers/questionController')
const leaderboardController = require('./controllers/leaderboardController')
const progressController = require('./controllers/progressController')
const adaptiveController = require('./controllers/adaptiveController')
const scheduledController = require('./controllers/scheduledController')
const lessonPlanController = require('./controllers/lessonPlanController')
const dataIntegrityController = require('./controllers/dataIntegrityController')
const portfolioController = require('./controllers/portfolioController')
const researchStatsController = require('./controllers/researchStatsController')
const aiDetectionController = require('./controllers/aiDetectionController')
const systemHealthController = require('./controllers/systemHealthController')
const worksheetController = require('./controllers/worksheetController')
const assessmentController2 = require('./controllers/assessmentController')
const knowledgeSheetController = require('./controllers/knowledgeSheetController')

// OpenAI API Key secret - imported from centralized client
const openaiApiKey = openaiApiKeySecret

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

// OpenAI client is imported from ./utils/openaiClient.js
// Use getOpenAIClient() inside functions to get the client instance

/**
 * Cloud Function to assess student answers using OpenAI
 * Evaluates Higher-Order Thinking Skills (HOTS)
 */
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
exports.generateLessonPlan = functions.runWith({ 
  secrets: [openaiApiKeySecret],
  timeoutSeconds: 540,  // เพิ่มเป็น 9 นาที สำหรับ AI generation ที่ซับซ้อน
  memory: '2GB'
}).https.onRequest(async (req, res) => {
  // Handle CORS preflight first
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.set('Access-Control-Max-Age', '3600')
    return res.status(204).send('')
  }
  
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

      // 🔧 FIX: Use getOpenAIClient() instead of undefined 'openai'
      let openaiClient
      try {
        openaiClient = getOpenAIClient()
      } catch (err) {
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

      const completion = await openaiClient.chat.completions.create({
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
  secrets: [openaiApiKeySecret],
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

      // 🔧 FIX: Use getOpenAIClient() instead of undefined 'openai'
      let openaiClient
      try {
        openaiClient = getOpenAIClient()
      } catch (err) {
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

      const completion = await openaiClient.chat.completions.create({
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

// ==========================================

/**
 * Generate Electronic Worksheet from Lesson Plan
 * สร้างใบงานอิเล็กทรอนิกส์อัจฉริยะจากแผนการสอน 5E + A.R.C.E.
 * - วิเคราะห์กิจกรรม 5E อย่างละเอียด
 * - สร้างคำถามตาม A.R.C.E. Framework
 * - ปรับตามบริบทและเนื้อหาของแต่ละแผน
 */
exports.generateElectronicWorksheet = functions.runWith({ 
  secrets: [openaiApiKeySecret],
  timeoutSeconds: 540,  // เพิ่มเป็น 9 นาที สำหรับ AI generation ที่ซับซ้อน
  memory: '2GB'
}).https.onRequest(async (req, res) => {
  // Handle CORS preflight first
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.set('Access-Control-Max-Age', '3600')
    return res.status(204).send('')
  }
  
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

      // 🔧 FIX: Use getOpenAIClient() instead of undefined 'openai'
      let openaiClient
      try {
        openaiClient = getOpenAIClient()
      } catch (err) {
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

      const completion = await openaiClient.chat.completions.create({
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
        // Enhanced markdown wrapper cleaning
        let cleanedText = responseText.trim()
        
        // Remove markdown code block wrappers
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
          cleanedText = cleanedText.trim()
        }
        
        // Try to find JSON object if there's extra text
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          cleanedText = jsonMatch[0]
        }
        
        worksheetData = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse worksheet JSON:', parseError.message)
        console.error('Response text preview:', responseText.substring(0, 500))
        return res.status(500).send({ 
          error: 'Failed to parse AI response',
          details: parseError.message,
          preview: responseText.substring(0, 200)
        })
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
  secrets: [openaiApiKeySecret],
  timeoutSeconds: 540,  // เพิ่มเป็น 9 นาที สำหรับ AI generation
  memory: '2GB'
}).https.onRequest(async (req, res) => {
  // Handle CORS preflight first
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.set('Access-Control-Max-Age', '3600')
    return res.status(204).send('')
  }
  
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const {
        submissionId,
        worksheetId,
        courseId, // 🆕 ดึง courseId เพื่อหา assessmentMode
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

      // 🆕 Get course setting for assessmentMode
      let useMultiAgent = false
      if (courseId) {
        try {
          const courseDoc = await db.collection('courses').doc(courseId).get()
          if (courseDoc.exists) {
            const courseData = courseDoc.data()
            useMultiAgent = courseData.assessmentMode === 'multi-agent'
            console.log(`📚 Course ${courseId} assessmentMode: ${courseData.assessmentMode || 'single'} (Multi-Agent: ${useMultiAgent})`)
          }
        } catch (err) {
          console.warn('Could not fetch course settings:', err.message)
        }
      }

      // Get OpenAI client
      let openai
      try {
        openai = getOpenAIClient()
      } catch (err) {
        return res.status(500).send({ error: 'OpenAI not configured' })
      }

      const model = getDefaultModel()

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
4. ทุก feedback เป็นภาษาไทย สุภาพ สร้างสรรค์ ให้กำลังใจ

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
</fluffy_content_detection>`
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
7. ทุก feedback เป็นภาษาไทย สุภาพ สร้างสรรค์ ให้กำลังใจ

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
</fluffy_content_detection>`
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

      let assessmentResult
      
      // 🤖 Multi-Agent Mode: Use 6 agents for more accurate assessment
      if (useMultiAgent && !isArceEvaluateWorksheet && !hasArceSituations) {
        console.log('🤖×6 Using Multi-Agent mode for worksheet assessment')
        
        // Combine all answers for multi-agent assessment
        const combinedAnswer = questionsForAssessment
          .map(q => `${q.prompt}: ${typeof q.studentAnswer === 'object' ? JSON.stringify(q.studentAnswer) : q.studentAnswer}`)
          .join('\n\n')
        
        const mainQuestion = questionsForAssessment[0]?.prompt || worksheet.metadata?.title || 'ใบงาน'
        
        try {
          const multiAgentResult = await runMultiAgentAssessment(
            combinedAnswer,
            mainQuestion,
            getOpenAIClient(),
            model,
            {
              gradeLevel: worksheet.metadata?.gradeLevel || 'ม.4',
              subjectArea: worksheet.metadata?.subjectGroup || 'ทั่วไป',
              expectedLOs: worksheet.metadata?.learningOutcomes || []
            }
          )
          
          // Map Multi-Agent result to worksheet assessment format
          const totalMaxScore = worksheet.scoring?.totalPoints || (questionsForAssessment.length * 5)
          const multiTotalScore = (multiAgentResult.consensus?.analysis || 0) +
                                  (multiAgentResult.consensus?.reasoning || 0) +
                                  (multiAgentResult.consensus?.creativity || 0) +
                                  (multiAgentResult.consensus?.evidence || 0)
          const percentage = Math.round((multiTotalScore / 20) * 100)
          const paLevel = percentage >= 80 ? 4 : percentage >= 60 ? 3 : percentage >= 40 ? 2 : 1
          const paLevelText = paLevel === 4 ? 'ระดับ 4: ดีมาก' : 
                              paLevel === 3 ? 'ระดับ 3: ดี' :
                              paLevel === 2 ? 'ระดับ 2: พอใช้' : 'ระดับ 1: ต้องปรับปรุง'
          
          assessmentResult = {
            summary: {
              totalScore: Math.round((percentage / 100) * totalMaxScore),
              maxScore: totalMaxScore,
              percentage,
              paLevel,
              paLevelText,
              overallFeedback: multiAgentResult.consensus?.feedback || 'การประเมินเสร็จสิ้น',
              recommendation: multiAgentResult.consensus?.recommendations?.[0] || 'ฝึกฝนต่อไป'
            },
            arceScores: {
              analysis: {
                raw: multiAgentResult.consensus?.analysis || 0,
                max: 5,
                percentage: ((multiAgentResult.consensus?.analysis || 0) / 5) * 100,
                feedback: multiAgentResult.agentResults?.analysis?.feedback || multiAgentResult.agentDetails?.analysis?.microFeedback || ''
              },
              reasoning: {
                raw: multiAgentResult.consensus?.reasoning || 0,
                max: 5,
                percentage: ((multiAgentResult.consensus?.reasoning || 0) / 5) * 100,
                feedback: multiAgentResult.agentResults?.reasoning?.feedback || multiAgentResult.agentDetails?.reasoning?.microFeedback || ''
              },
              creativity: {
                raw: multiAgentResult.consensus?.creativity || 0,
                max: 5,
                percentage: ((multiAgentResult.consensus?.creativity || 0) / 5) * 100,
                feedback: multiAgentResult.agentResults?.creativity?.feedback || multiAgentResult.agentDetails?.creativity?.microFeedback || ''
              },
              evidence: {
                raw: multiAgentResult.consensus?.evidence || 0,
                max: 5,
                percentage: ((multiAgentResult.consensus?.evidence || 0) / 5) * 100,
                feedback: multiAgentResult.agentResults?.evidence?.feedback || multiAgentResult.agentDetails?.evidence?.microFeedback || ''
              }
            },
            questionResults: questionsForAssessment.map(q => ({
              questionId: q.questionId,
              sectionId: q.sectionId,
              score: Math.round((percentage / 100) * q.maxScore),
              maxScore: q.maxScore,
              passed: percentage >= 50,
              feedback: multiAgentResult.consensus?.feedback || ''
            })),
            strengths: multiAgentResult.consensus?.strengths || multiAgentResult.strengths || [],
            weaknesses: multiAgentResult.consensus?.weaknesses || multiAgentResult.weaknesses || [],
            nextSteps: multiAgentResult.consensus?.recommendations || [],
            teacherNotes: `📊 ประเมินด้วย Multi-Agent (6 AI): ความเชื่อมั่น ${multiAgentResult.confidence || multiAgentResult.consensus?.averageConfidence || 'N/A'}%`,
            assessmentMode: 'multi-agent',
            // 🆕 เพิ่ม agentDetails ละเอียด เหมือน Chat
            agentDetails: {
              analysis: {
                agentName: 'Analysis Expert',
                score: multiAgentResult.agentDetails?.analysis?.score || 0,
                confidence: multiAgentResult.agentDetails?.analysis?.confidence || 0,
                microFeedback: multiAgentResult.agentDetails?.analysis?.microFeedback || '',
                chainOfThought: multiAgentResult.agentDetails?.analysis?.chainOfThought || ''
              },
              reasoning: {
                agentName: 'Reasoning Expert',
                score: multiAgentResult.agentDetails?.reasoning?.score || 0,
                confidence: multiAgentResult.agentDetails?.reasoning?.confidence || 0,
                microFeedback: multiAgentResult.agentDetails?.reasoning?.microFeedback || '',
                chainOfThought: multiAgentResult.agentDetails?.reasoning?.chainOfThought || ''
              },
              creativity: {
                agentName: 'Creativity Expert',
                score: multiAgentResult.agentDetails?.creativity?.score || 0,
                confidence: multiAgentResult.agentDetails?.creativity?.confidence || 0,
                microFeedback: multiAgentResult.agentDetails?.creativity?.microFeedback || '',
                chainOfThought: multiAgentResult.agentDetails?.creativity?.chainOfThought || ''
              },
              evidence: {
                agentName: 'Evidence Expert',
                score: multiAgentResult.agentDetails?.evidence?.score || 0,
                confidence: multiAgentResult.agentDetails?.evidence?.confidence || 0,
                microFeedback: multiAgentResult.agentDetails?.evidence?.microFeedback || '',
                chainOfThought: multiAgentResult.agentDetails?.evidence?.chainOfThought || ''
              },
              adversarial: multiAgentResult.agentDetails?.adversarial || {
                refinedScores: multiAgentResult.rubricScores || {},
                challenges: [],
                biasDetected: [],
                consistencyScore: 0
              },
              consensus: multiAgentResult.agentDetails?.consensus || {
                rubricScores: multiAgentResult.rubricScores || {},
                totalScore: multiAgentResult.totalScore || 0,
                confidence: multiAgentResult.confidence || 0,
                consensusLevel: 'moderate',
                feedback: multiAgentResult.feedback || ''
              }
            },
            multiAgentMetadata: {
              processingTimeMs: multiAgentResult.multiAgentMetadata?.processingTimeMs || 0,
              agentCount: 6,
              consensusLevel: multiAgentResult.agentDetails?.consensus?.consensusLevel || 'moderate'
            },
            agentDebate: multiAgentResult.adversarialRefinement || null
          }
          
          console.log('✅ Multi-Agent worksheet assessment completed:', {
            totalScore: assessmentResult.summary.totalScore,
            percentage: assessmentResult.summary.percentage
          })
          
        } catch (multiAgentError) {
          console.error('❌ Multi-Agent failed, falling back to single agent:', multiAgentError.message)
          // Fall through to single agent below
          assessmentResult = null
        }
      }
      
      // Single Agent Mode (default or fallback)
      if (!assessmentResult) {
        console.log('🤖×1 Using Single Agent mode for worksheet assessment')
        
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
        try {
          let cleanedText = responseText.trim()
          if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
            cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
          }
          assessmentResult = JSON.parse(cleanedText)
          assessmentResult.assessmentMode = 'single' // Mark as single agent
        } catch (parseError) {
          console.error('Failed to parse assessment JSON:', responseText)
          return res.status(500).send({ error: 'Failed to parse AI response' })
        }
      } // End of single agent block

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
            
            // 🎮 GAMIFICATION: เพิ่ม XP, Badge, Streak สำหรับ Worksheet (เหมือน Chat)
            const worksheetGamificationData = {
              rubricScores: worksheetAssessment.arceScores,
              overallScore: assessmentResult.summary.totalScore
            }
            const worksheetPointsEarned = calculatePointsSimple(worksheetGamificationData)
            
            // Calculate streak
            const currentDate = new Date().toISOString()
            const streakUpdate = calculateStreak(currentData.lastActiveDate, currentDate)
            
            const gamificationUpdate = {
              totalPoints: admin.firestore.FieldValue.increment(worksheetPointsEarned),
              worksheetCount: admin.firestore.FieldValue.increment(1),
              lastActiveDate: currentDate
            }
            
            // Add streak data if applicable
            if (streakUpdate && streakUpdate.increment) {
              gamificationUpdate.currentStreak = admin.firestore.FieldValue.increment(1)
              const newStreak = (currentData.currentStreak || 0) + 1
              if (newStreak > (currentData.maxStreak || 0)) {
                gamificationUpdate.maxStreak = newStreak
              }
            }
            
            await progressRef.update(gamificationUpdate)
            
            // Check for badges
            const courseDoc = await db.collection('courses').doc(submissionData.courseId).get()
            const totalLOs = courseDoc.exists ? (courseDoc.data().learningOutcomes?.length || 0) : 0
            const newBadges = checkBadges({
              ...currentData,
              totalPassed: updatedPassedLOs.length,
              totalPoints: (currentData.totalPoints || 0) + worksheetPointsEarned,
              currentStreak: streakUpdate?.increment ? (currentData.currentStreak || 0) + 1 : currentData.currentStreak,
              worksheetCount: (currentData.worksheetCount || 0) + 1
            }, totalLOs)
            
            // Update badges if new ones earned
            if (newBadges.length > 0) {
              const badgeIds = newBadges.map(b => b.id)
              const badgePoints = newBadges.reduce((sum, b) => sum + b.points, 0)
              await progressRef.update({
                badges: admin.firestore.FieldValue.arrayUnion(...badgeIds),
                totalPoints: admin.firestore.FieldValue.increment(badgePoints)
              })
              console.log(`🏆 Worksheet badges earned for ${submissionData.studentId}:`, badgeIds)
            }
            
            console.log(`🎮 Worksheet gamification: ${submissionData.studentId} earned ${worksheetPointsEarned} XP`)
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
              // 🎮 GAMIFICATION: Initialize for first worksheet submission
              totalPoints: calculatePointsSimple({
                rubricScores: worksheetAssessment.arceScores,
                overallScore: assessmentResult.summary.totalScore
              }),
              worksheetCount: 1,
              assessmentCount: 0,
              currentStreak: 1,
              maxStreak: 1,
              badges: [],
              lastActiveDate: new Date().toISOString(),
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              lastAssessedAt: admin.firestore.FieldValue.serverTimestamp()
            })
            
            console.log(`🎮 First worksheet: ${submissionData.studentId} started gamification`)
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
exports.healthCheck = systemHealthController.healthCheck
exports.systemDebug = systemHealthController.systemDebug
exports.syncProgress = systemHealthController.syncProgress
exports.reliabilityReport = systemHealthController.reliabilityReport

// ==========================================
// 🔍 AI DETECTION API
// ==========================================
// 🔄 REFACTORED: Now using aiDetectionController
exports.analyzeAIContent = aiDetectionController.analyzeAIContent
exports.getFlaggedAssessments = aiDetectionController.getFlaggedAssessments
exports.aiDetectionStats = aiDetectionController.aiDetectionStats

// ==========================================
// 📐 INTER-RATER RELIABILITY (IRR) API
// ==========================================
// 🔄 REFACTORED: Now using researchStatsController
exports.calculateIRR = researchStatsController.calculateIRR
exports.irrReport = researchStatsController.irrReport
exports.calculateEffectSize = researchStatsController.calculateEffectSize
exports.researchSummary = researchStatsController.researchSummary
exports.correlationAnalysis = researchStatsController.correlationAnalysis
exports.logInterventionEvent = researchStatsController.logInterventionEvent

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
      
      // Support both old (sequenceId) and new (sessionId) field names
      const { 
        sessionId, sequenceId, studentId, courseId, 
        questionId, eventType, data, metadata 
      } = req.body
      
      const effectiveSessionId = sessionId || sequenceId
      const effectiveData = data || metadata || {}
      
      if (!effectiveSessionId || !studentId || !eventType) {
        return res.status(400).json({ 
          error: 'Missing required fields: sessionId/sequenceId, studentId, eventType' 
        })
      }
      
      // Validate eventType - allow any string for flexibility
      const validTypes = Object.keys(SEQUENCE_EVENT_TYPES)
      const isValidType = validTypes.includes(eventType) || eventType.includes('_')
      
      if (!isValidType) {
        console.warn(`Unknown eventType: ${eventType}, allowing anyway`)
      }
      
      const result = await logSequenceEvent(db, {
        sessionId: effectiveSessionId,
        studentId,
        courseId: courseId || 'unknown',
        questionId: questionId || 'unknown',
        eventType,
        data: effectiveData
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
      
      // Support both old (sequenceId) and new (sessionId) field names
      const { sessionId, sequenceId, questionId, studentId, outcome } = req.body
      const effectiveSessionId = sessionId || sequenceId
      
      if (!effectiveSessionId) {
        return res.status(400).json({ 
          error: 'Missing required field: sessionId or sequenceId' 
        })
      }
      
      const result = await finalizeSequence(db, effectiveSessionId, questionId || 'session-end', outcome)
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

/**
 * 📊 Calculate Real-Time IRR (Callable version)
 * For ExpertValidationDashboard
 */
exports.calculateRealTimeIRR = functions.https.onCall(async (data, context) => {
  try {
    // Optional: Verify auth
    // if (!context.auth) {
    //   throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
    // }

    const dimension = data?.dimension || 'total'
    
    // Get validated assessments
    const snapshot = await db.collection('assessments')
      .where('expertValidation.isValidated', '==', true)
      .get()
    
    if (snapshot.empty) {
      return {
        success: false,
        error: 'No validated assessments found',
        validatedCount: 0
      }
    }
    
    // Extract validation data
    const validations = []
    snapshot.forEach(doc => {
      const d = doc.data()
      const expert = d.expertValidation
      
      if (expert && d.rubricScores) {
        validations.push({
          assessmentId: doc.id,
          aiScores: {
            analysis: d.rubricScores.analysis || 0,
            reasoning: d.rubricScores.reasoning || 0,
            creativity: d.rubricScores.creativity || 0,
            evidence: d.rubricScores.evidence || 0
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
    
    if (validations.length < 5) {
      return {
        success: false,
        error: `Insufficient validated assessments. Need at least 5, got ${validations.length}`,
        validatedCount: validations.length
      }
    }
    
    // Calculate IRR for each dimension
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const byDimension = {}
    
    for (const dim of dimensions) {
      const irrResult = comprehensiveIRRAnalysis(validations, dim)
      byDimension[dim] = {
        kappa: irrResult.cohensKappa || 0,
        spearman: irrResult.spearmanRho || 0,
        agreement: irrResult.percentAgreement || 0,
        status: getIRRStatus(irrResult.cohensKappa || 0)
      }
    }
    
    // Overall status
    const avgKappa = dimensions.reduce((sum, d) => sum + (byDimension[d].kappa || 0), 0) / 4
    const overallStatus = {
      kappa: avgKappa,
      status: getIRRStatus(avgKappa),
      interpretation: getKappaInterpretation(avgKappa)
    }
    
    return {
      success: true,
      byDimension,
      overallStatus,
      sampleSize: validations.length
    }
  } catch (error) {
    console.error('Error in calculateRealTimeIRR:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Helper: Get IRR Status from Kappa
 */
function getIRRStatus(kappa) {
  if (kappa >= 0.81) return 'excellent'
  if (kappa >= 0.61) return 'good'
  if (kappa >= 0.41) return 'moderate'
  if (kappa >= 0.21) return 'fair'
  return 'poor'
}

/**
 * Helper: Get Kappa Interpretation
 */
function getKappaInterpretation(kappa) {
  if (kappa >= 0.81) return 'Almost Perfect Agreement'
  if (kappa >= 0.61) return 'Substantial Agreement'
  if (kappa >= 0.41) return 'Moderate Agreement'
  if (kappa >= 0.21) return 'Fair Agreement'
  return 'Slight Agreement'
}

/**
 * 📊 Get Golden Dataset Stats (Callable version)
 * For ExpertValidationDashboard
 */
exports.getGoldenDatasetStatsCallable = functions.https.onCall(async (data, context) => {
  try {
    // Get golden samples
    const goldenSnapshot = await db.collection('goldenDataset').get()
    
    // Calculate stats
    const counts = {
      total: goldenSnapshot.size,
      high: 0,
      medium: 0,
      low: 0
    }
    
    const dimensions = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
    let totalDiffSum = 0
    
    goldenSnapshot.forEach(doc => {
      const d = doc.data()
      
      // Count by stratum (based on AI score total)
      const aiTotal = (d.aiScores?.analysis || 0) + (d.aiScores?.reasoning || 0) + 
                     (d.aiScores?.creativity || 0) + (d.aiScores?.evidence || 0)
      if (aiTotal >= 16) counts.high++
      else if (aiTotal >= 10) counts.medium++
      else counts.low++
      
      // Calculate diff per dimension
      if (d.aiScores && d.expertScores) {
        for (const dim of Object.keys(dimensions)) {
          const diff = Math.abs((d.aiScores[dim] || 0) - (d.expertScores[dim] || 0))
          dimensions[dim] += diff
          totalDiffSum += diff
        }
      }
    })
    
    // Average differences
    const n = Math.max(1, goldenSnapshot.size)
    const avgDiff = {
      analysis: dimensions.analysis / n,
      reasoning: dimensions.reasoning / n,
      creativity: dimensions.creativity / n,
      evidence: dimensions.evidence / n,
      overall: totalDiffSum / (n * 4)
    }
    
    return {
      success: true,
      stats: {
        counts,
        avgDiff,
        lastUpdated: new Date().toISOString()
      }
    }
  } catch (error) {
    console.error('Error in getGoldenDatasetStats:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

// ============================================================
// 📦 CONTROLLER RE-EXPORTS (Phase 6 Modular Architecture)
// These exports delegate to modular controller files for cleaner code
// ============================================================

// 🎮 Gamification Controller Exports
// Note: Using controller versions (duplicate implementations exist above - will be removed in v7.0)
// exports.getLeaderboard = gamificationController.getLeaderboard
// exports.getBadgeDefinitions = gamificationController.getBadgeDefinitions
// exports.claimDailyReward = gamificationController.claimDailyReward
// exports.generateDailyReport = gamificationController.generateDailyReport

// 📊 Analytics Controller Exports (NEW in Phase 6)
exports.getStudentTrajectoryV2 = analyticsController.getStudentTrajectory
exports.exportSEMDataV2 = analyticsController.exportSEMData
exports.generateClassAnalyticsV2 = analyticsController.generateClassAnalytics
// 🔄 REFACTORED: Main export now uses controller
exports.generateClassAnalytics = analyticsController.generateClassAnalytics

// 👨‍🏫 Review Controller Exports (NEW in Phase 6)
exports.submitTeacherReviewV2 = reviewController.submitTeacherReview
exports.submitAppealV2 = reviewController.submitAppeal
exports.resolveAppealV2 = reviewController.resolveAppeal
exports.getPendingAppeals = reviewController.getPendingAppeals
// 🔄 REFACTORED: Main exports now use controller
exports.submitTeacherReview = reviewController.submitTeacherReview
exports.submitAppeal = reviewController.submitAppeal
exports.resolveAppeal = reviewController.resolveAppeal

// 🎓 Teacher Certification Controller Exports (NEW in Phase 6)
exports.getTeacherCertification = certificationController.getTeacherCertification
exports.issueBadge = certificationController.issueBadge
exports.verifyBadge = certificationController.verifyBadge
exports.getTrainingModules = certificationController.getTrainingModules
exports.submitCalibration = certificationController.submitCalibration
exports.getCertificationLeaderboard = certificationController.getCertificationLeaderboard

// 📊 ESA Dashboard Controller Exports (NEW in Phase 6)
exports.getESADashboard = esaDashboardController.getESADashboard
exports.getESASchools = esaDashboardController.getESASchools
exports.getESAHOTSGap = esaDashboardController.getESAHOTSGap
exports.getESAEquityReport = esaDashboardController.getESAEquityReport
exports.getESAResourceRecommendations = esaDashboardController.getESAResourceRecommendations

// 🏫 School Onboarding Controller Exports (NEW in Phase 6)
exports.registerSchool = schoolOnboardingController.registerSchool
exports.verifyRegistration = schoolOnboardingController.verifyRegistration
exports.approveRegistration = schoolOnboardingController.approveRegistration
exports.rejectRegistration = schoolOnboardingController.rejectRegistration
exports.getRegistrationStatus = schoolOnboardingController.getRegistrationStatus
exports.getPendingRegistrations = schoolOnboardingController.getPendingRegistrations
exports.getOnboardingAnalytics = schoolOnboardingController.getOnboardingAnalytics

// 🇹🇭 Ministry Dashboard Controller Exports (NEW in Phase 6)
exports.getNationalOverview = ministryDashboardController.getNationalOverview
exports.getESARankings = ministryDashboardController.getESARankings
exports.getNationalHOTSGap = ministryDashboardController.getNationalHOTSGap
exports.getPolicyInsights = ministryDashboardController.getPolicyInsights
exports.getTalentPipeline = ministryDashboardController.getTalentPipeline
exports.exportNationalReport = ministryDashboardController.exportNationalReport

// ============================================================
// 📦 Phase 7: NEW CONTROLLER EXPORTS (Modular Refactoring)
// ============================================================

// 📚 Course Controller Exports
exports.getCoursesV2 = courseController.getCourses
exports.generateLearningOutcomesV2 = courseController.generateLearningOutcomes
exports.generateCourseStructureV2 = courseController.generateCourseStructure
exports.generateLearningUnitV2 = courseController.generateLearningUnit
// 🔄 REFACTORED: Main exports now use controller
exports.generateLearningOutcomes = courseController.generateLearningOutcomes
exports.generateCourseStructure = courseController.generateCourseStructure
exports.generateLearningUnit = courseController.generateLearningUnit

// ❓ Question Controller Exports
exports.generateHOTSQuestionV2 = questionController.generateHOTSQuestion
exports.validateQuestionQualityV2 = questionController.validateQuestionQuality
exports.generateFallbackQuestionV2 = questionController.generateFallbackQuestion
exports.generateSolutionV2 = questionController.generateSolution
// 🔄 REFACTORED: Main exports now use controller
exports.generateHOTSQuestion = questionController.generateHOTSQuestion
exports.validateQuestionQuality = questionController.validateQuestionQuality
exports.generateFallbackQuestion = questionController.generateFallbackQuestion
exports.generateSolution = questionController.generateSolution

// 🏆 Leaderboard Controller Exports
exports.getLeaderboardV2 = leaderboardController.getLeaderboard
exports.getBadgeDefinitionsV2 = leaderboardController.getBadgeDefinitions
exports.claimDailyRewardV2 = leaderboardController.claimDailyReward
// 🔄 REFACTORED: Main exports now use controller
exports.getLeaderboard = leaderboardController.getLeaderboard
exports.getBadgeDefinitions = leaderboardController.getBadgeDefinitions
exports.claimDailyReward = leaderboardController.claimDailyReward

// 📈 Progress Controller Exports
exports.generateClassAnalyticsV3 = progressController.generateClassAnalytics
exports.recalculateStudentProgressV2 = progressController.recalculateStudentProgress

// 🎯 Adaptive Learning Controller Exports
exports.generateAdaptivePathV2 = adaptiveController.generateAdaptivePath
exports.updateAdaptivePathV2 = adaptiveController.updateAdaptivePath
// 🔄 REFACTORED: Main export now uses controller
exports.generateAdaptivePath = adaptiveController.generateAdaptivePath

// ⏰ Scheduled Tasks Controller Exports
exports.generateDailyReportV2 = scheduledController.generateDailyReport
exports.analyzeTalentTracksV2 = scheduledController.analyzeTalentTracks
// 🔄 REFACTORED: Main exports now use controller
exports.generateDailyReport = scheduledController.generateDailyReport
exports.analyzeTalentTracks = scheduledController.analyzeTalentTracks

// 📚 Lesson Plan Controller Exports
exports.generateMicroLessonV2 = lessonPlanController.generateMicroLesson
exports.generateInterventionsV2 = lessonPlanController.generateInterventions
// 🔄 REFACTORED: Main export now uses controller
exports.generateInterventions = lessonPlanController.generateInterventions

// 🔒 Data Integrity Controller Exports
exports.onUserDeleteV2 = dataIntegrityController.onUserDelete
exports.dailyConsistencyCheckV2 = dataIntegrityController.dailyConsistencyCheck
// 🔄 REFACTORED: Main exports now use controller
exports.onUserDelete = dataIntegrityController.onUserDelete
exports.dailyConsistencyCheck = dataIntegrityController.dailyConsistencyCheck

// 📈 Progress Controller - recalculateStudentProgress
exports.recalculateStudentProgress = progressController.recalculateStudentProgress

// 📦 Portfolio Controller Exports
exports.verifyEvidenceV2 = portfolioController.verifyEvidence
exports.createEvidencePackV2 = portfolioController.createEvidencePack
exports.getDetailedExplanationV2 = portfolioController.getDetailedExplanation
// 🔄 REFACTORED: Main exports now use controller
exports.verifyEvidence = portfolioController.verifyEvidence
exports.createEvidencePack = portfolioController.createEvidencePack
exports.getDetailedExplanation = portfolioController.getDetailedExplanation

// 📊 Research Stats Controller Exports
exports.calculateIRRV2 = researchStatsController.calculateIRR
exports.irrReportV2 = researchStatsController.irrReport
exports.calculateEffectSizeV2 = researchStatsController.calculateEffectSize
exports.researchSummaryV2 = researchStatsController.researchSummary
exports.correlationAnalysisV2 = researchStatsController.correlationAnalysis
exports.logInterventionEventV2 = researchStatsController.logInterventionEvent

// 🔍 AI Detection Controller Exports
exports.analyzeAIContentV2 = aiDetectionController.analyzeAIContent
exports.getFlaggedAssessmentsV2 = aiDetectionController.getFlaggedAssessments
exports.aiDetectionStatsV2 = aiDetectionController.aiDetectionStats

// 🏥 System Health Controller Exports
exports.healthCheckV2 = systemHealthController.healthCheck
exports.systemDebugV2 = systemHealthController.systemDebug
exports.syncProgressV2 = systemHealthController.syncProgress
exports.reliabilityReportV2 = systemHealthController.reliabilityReport

// 📝 Worksheet Controller Exports
exports.generateElectronicWorksheetV2 = worksheetController.generateElectronicWorksheet
exports.getWorksheetReportsV2 = worksheetController.getWorksheetReports
exports.syncLearningRoomWorksheetsV2 = worksheetController.syncLearningRoomWorksheets
// 🔄 REFACTORED: Main exports now use controller
exports.getWorksheetReports = worksheetController.getWorksheetReports
exports.syncLearningRoomWorksheets = worksheetController.syncLearningRoomWorksheets

// 📊 Assessment Controller (New) Exports
exports.handleAssessmentV2 = assessmentController2.handleAssessment

// 📚 Knowledge Sheet Controller Exports
// 🔄 REFACTORED: Main exports now use controller (no V2 needed)
exports.generateKnowledgeSheet = knowledgeSheetController.generateKnowledgeSheet
exports.generateUnitKnowledgeSheet = knowledgeSheetController.generateUnitKnowledgeSheet
exports.generateBatchKnowledgeSheets = knowledgeSheetController.generateBatchKnowledgeSheets
exports.getKnowledgeSheets = knowledgeSheetController.getKnowledgeSheets
// Backward compatible V2 aliases
exports.generateKnowledgeSheetV2 = knowledgeSheetController.generateKnowledgeSheet
exports.generateUnitKnowledgeSheetV2 = knowledgeSheetController.generateUnitKnowledgeSheet
exports.generateBatchKnowledgeSheetsV2 = knowledgeSheetController.generateBatchKnowledgeSheets
exports.getKnowledgeSheetsV2 = knowledgeSheetController.getKnowledgeSheets
