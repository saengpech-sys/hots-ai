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
const assessmentController = require('./controllers/assessmentController')
const knowledgeSheetController = require('./controllers/knowledgeSheetController')
const dataCleanupController = require('./controllers/dataCleanupController')

// OpenAI API Key secret - imported from centralized client
const openaiApiKey = openaiApiKeySecret

// =============================================================================

// ============================================================
// 📝 ASSESSMENT CONTROLLER EXPORTS
// ============================================================
exports.assessAnswer = assessmentController.assessAnswer
exports.assessSubmissionMultiPass = assessmentController.assessSubmissionMultiPass
exports.assessAnswerMultiAgent = assessmentController.assessAnswerMultiAgent

// ============================================================
// 📚 LESSON PLAN CONTROLLER EXPORTS
// ============================================================
exports.generateLessonPlan = generationController.generateLessonPlan

// ============================================================
// 📋 WORKSHEET CONTROLLER EXPORTS
// ============================================================
exports.generateWorksheet = worksheetController.generateWorksheet
exports.generateElectronicWorksheet = worksheetController.generateElectronicWorksheet
exports.assessWorksheetSubmission = worksheetController.assessWorksheetSubmission
exports.reassessWorksheetSubmission = worksheetController.reassessWorksheetSubmission
exports.getWorksheetReports = worksheetController.getWorksheetReports
exports.syncLearningRoomWorksheets = worksheetController.syncLearningRoomWorksheets

// ============================================================
// 🔬 RESEARCH CONTROLLER EXPORTS  
// ============================================================
exports.getGrowthHistory = researchController.getGrowthHistory
exports.researchDataQuality = researchController.researchDataQuality
exports.logSequenceEventAPI = researchController.logSequenceEventAPI
exports.finalizeSequenceAPI = researchController.finalizeSequenceAPI
exports.exportKAnonymousDataAPI = researchController.exportKAnonymousDataAPI
exports.assessReidentificationRiskAPI = researchController.assessReidentificationRiskAPI
exports.researchReadinessV2 = researchController.researchReadinessV2
exports.getLearningSequences = researchController.getLearningSequences
exports.exportSEMData = researchController.exportSEMData
exports.getMentalModelMap = researchController.getMentalModelMap
exports.getConceptualChangeAnalysis = researchController.getConceptualChangeAnalysis
exports.calculateRealTimeIRR = researchController.calculateRealTimeIRR

// ============================================================
// 🛡️ QUALITY ASSURANCE CONTROLLER EXPORTS
// ============================================================
exports.getFairnessReport = qualityAssuranceController.getFairnessReport
exports.submitForReview = qualityAssuranceController.submitForReview
exports.getReviewQueue = qualityAssuranceController.getReviewQueue
exports.submitExpertReview = qualityAssuranceController.submitExpertReview
exports.getValidationData = qualityAssuranceController.getValidationData
exports.getGradeCalibration = qualityAssuranceController.getGradeCalibration
exports.getCalibrationReport = qualityAssuranceController.getCalibrationReport
exports.getGoldenDatasetStats = qualityAssuranceController.getGoldenDatasetStats
exports.addGoldenSample = qualityAssuranceController.addGoldenSample
exports.runBiasDetection = qualityAssuranceController.runBiasDetection
exports.getExpertValidationData = qualityAssuranceController.getExpertValidationData
exports.getGoldenDatasetStatsCallable = qualityAssuranceController.getGoldenDatasetStatsCallable

// ============================================================
// ⏰ SCHEDULED CONTROLLER EXPORTS
// ============================================================
exports.scheduledCleanupRateLimits = scheduledController.scheduledCleanupRateLimits
exports.scheduledCleanupAuditLogs = scheduledController.scheduledCleanupAuditLogs
exports.scheduledReconciliation = scheduledController.scheduledReconciliation
exports.triggerReconciliation = scheduledController.triggerReconciliation
exports.generateDailyReport = scheduledController.generateDailyReport
exports.analyzeTalentTracks = scheduledController.analyzeTalentTracks

// ============================================================
// 🎯 ADAPTIVE CONTROLLER EXPORTS
// ============================================================
exports.updateAdaptivePath = adaptiveController.updateAdaptivePath
exports.generateAdaptivePath = adaptiveController.generateAdaptivePath

// ============================================================
// 🏥 SYSTEM HEALTH CONTROLLER EXPORTS
// ============================================================
exports.healthCheck = systemHealthController.healthCheck
exports.systemDebug = systemHealthController.systemDebug
exports.syncProgress = systemHealthController.syncProgress
exports.reliabilityReport = systemHealthController.reliabilityReport

// ============================================================
// 🔍 AI DETECTION CONTROLLER EXPORTS
// ============================================================
exports.analyzeAIContent = aiDetectionController.analyzeAIContent
exports.getFlaggedAssessments = aiDetectionController.getFlaggedAssessments
exports.aiDetectionStats = aiDetectionController.aiDetectionStats

// ============================================================
// 📊 RESEARCH STATS CONTROLLER EXPORTS
// ============================================================
exports.calculateIRR = researchStatsController.calculateIRR
exports.irrReport = researchStatsController.irrReport
exports.calculateEffectSize = researchStatsController.calculateEffectSize
exports.researchSummary = researchStatsController.researchSummary
exports.correlationAnalysis = researchStatsController.correlationAnalysis
exports.logInterventionEvent = researchStatsController.logInterventionEvent

// ============================================================
// 📈 ANALYTICS CONTROLLER EXPORTS
// ============================================================
exports.getStudentTrajectoryV2 = analyticsController.getStudentTrajectory
exports.exportSEMDataV2 = analyticsController.exportSEMData
exports.generateClassAnalyticsV2 = analyticsController.generateClassAnalytics
exports.generateClassAnalytics = analyticsController.generateClassAnalytics

// ============================================================
// 👨‍🏫 REVIEW CONTROLLER EXPORTS
// ============================================================
exports.submitTeacherReviewV2 = reviewController.submitTeacherReview
exports.submitAppealV2 = reviewController.submitAppeal
exports.resolveAppealV2 = reviewController.resolveAppeal
exports.getPendingAppeals = reviewController.getPendingAppeals
exports.submitTeacherReview = reviewController.submitTeacherReview
exports.submitAppeal = reviewController.submitAppeal
exports.resolveAppeal = reviewController.resolveAppeal

// ============================================================
// 🎓 CERTIFICATION CONTROLLER EXPORTS
// ============================================================
exports.getTeacherCertification = certificationController.getTeacherCertification
exports.issueBadge = certificationController.issueBadge
exports.verifyBadge = certificationController.verifyBadge
exports.getTrainingModules = certificationController.getTrainingModules
exports.submitCalibration = certificationController.submitCalibration
exports.getCertificationLeaderboard = certificationController.getCertificationLeaderboard

// ============================================================
// 📊 ESA DASHBOARD CONTROLLER EXPORTS
// ============================================================
exports.getESADashboard = esaDashboardController.getESADashboard
exports.getESASchools = esaDashboardController.getESASchools
exports.getESAHOTSGap = esaDashboardController.getESAHOTSGap
exports.getESAEquityReport = esaDashboardController.getESAEquityReport
exports.getESAResourceRecommendations = esaDashboardController.getESAResourceRecommendations

// ============================================================
// 🏫 SCHOOL ONBOARDING CONTROLLER EXPORTS
// ============================================================
exports.registerSchool = schoolOnboardingController.registerSchool
exports.verifyRegistration = schoolOnboardingController.verifyRegistration
exports.approveRegistration = schoolOnboardingController.approveRegistration
exports.rejectRegistration = schoolOnboardingController.rejectRegistration
exports.getRegistrationStatus = schoolOnboardingController.getRegistrationStatus
exports.getPendingRegistrations = schoolOnboardingController.getPendingRegistrations
exports.getOnboardingAnalytics = schoolOnboardingController.getOnboardingAnalytics

// ============================================================
// 🇹🇭 MINISTRY DASHBOARD CONTROLLER EXPORTS
// ============================================================
exports.getNationalOverview = ministryDashboardController.getNationalOverview
exports.getESARankings = ministryDashboardController.getESARankings
exports.getNationalHOTSGap = ministryDashboardController.getNationalHOTSGap
exports.getPolicyInsights = ministryDashboardController.getPolicyInsights
exports.getTalentPipeline = ministryDashboardController.getTalentPipeline
exports.exportNationalReport = ministryDashboardController.exportNationalReport

// ============================================================
// 📚 COURSE CONTROLLER EXPORTS
// ============================================================
exports.getCoursesV2 = courseController.getCourses
exports.generateLearningOutcomesV2 = courseController.generateLearningOutcomes
exports.generateCourseStructureV2 = courseController.generateCourseStructure
exports.generateLearningUnitV2 = courseController.generateLearningUnit
exports.generateLearningOutcomes = courseController.generateLearningOutcomes
exports.generateCourseStructure = courseController.generateCourseStructure
exports.generateLearningUnit = courseController.generateLearningUnit

// ============================================================
// ❓ QUESTION CONTROLLER EXPORTS
// ============================================================
exports.generateHOTSQuestionV2 = questionController.generateHOTSQuestion
exports.validateQuestionQualityV2 = questionController.validateQuestionQuality
exports.generateFallbackQuestionV2 = questionController.generateFallbackQuestion
exports.generateSolutionV2 = questionController.generateSolution
exports.generateHOTSQuestion = questionController.generateHOTSQuestion
exports.validateQuestionQuality = questionController.validateQuestionQuality
exports.generateFallbackQuestion = questionController.generateFallbackQuestion
exports.generateSolution = questionController.generateSolution

// ============================================================
// 🏆 LEADERBOARD CONTROLLER EXPORTS
// ============================================================
exports.getLeaderboardV2 = leaderboardController.getLeaderboard
exports.getLeaderboard = leaderboardController.getLeaderboard

// ============================================================
// 📈 PROGRESS CONTROLLER EXPORTS
// ============================================================
exports.recalculateStudentProgress = progressController.recalculateStudentProgress
exports.dailyConsistencyCheck = progressController.dailyConsistencyCheck

// ============================================================
// 🎮 GAMIFICATION CONTROLLER EXPORTS
// ============================================================
exports.getBadgeDefinitions = gamificationController.getBadgeDefinitions
exports.claimDailyReward = gamificationController.claimDailyReward

// ============================================================
// 📖 KNOWLEDGE SHEET CONTROLLER EXPORTS
// ============================================================
exports.generateKnowledgeSheet = knowledgeSheetController.generateKnowledgeSheet
exports.generateBatchKnowledgeSheets = knowledgeSheetController.generateBatchKnowledgeSheets
exports.generateUnitKnowledgeSheet = knowledgeSheetController.generateUnitKnowledgeSheet
exports.getKnowledgeSheets = knowledgeSheetController.getKnowledgeSheets

// ============================================================
// 🗂️ DATA INTEGRITY CONTROLLER EXPORTS
// ============================================================
exports.onUserDelete = dataIntegrityController.onUserDelete

// ============================================================
// �� PORTFOLIO CONTROLLER EXPORTS
// ============================================================
exports.createEvidencePack = portfolioController.createEvidencePack
exports.verifyEvidence = portfolioController.verifyEvidence

// ============================================================
// 🔧 GENERATION CONTROLLER EXPORTS (Legacy)
// ============================================================
exports.generateMicroLessonV2 = generationController.generateMicroLesson
exports.getDetailedExplanation = generationController.getDetailedExplanation
exports.generateInterventions = generationController.generateInterventions

// ============================================================
// 🔧 V2 ALIASES FOR BACKWARDS COMPATIBILITY
// ============================================================
exports.healthCheckV2 = systemHealthController.healthCheck
exports.systemDebugV2 = systemHealthController.systemDebug
exports.syncProgressV2 = systemHealthController.syncProgress
exports.reliabilityReportV2 = systemHealthController.reliabilityReport
exports.analyzeAIContentV2 = aiDetectionController.analyzeAIContent
exports.getFlaggedAssessmentsV2 = aiDetectionController.getFlaggedAssessments
exports.aiDetectionStatsV2 = aiDetectionController.aiDetectionStats
exports.calculateIRRV2 = researchStatsController.calculateIRR
exports.irrReportV2 = researchStatsController.irrReport
exports.calculateEffectSizeV2 = researchStatsController.calculateEffectSize
exports.researchSummaryV2 = researchStatsController.researchSummary
exports.correlationAnalysisV2 = researchStatsController.correlationAnalysis
exports.logInterventionEventV2 = researchStatsController.logInterventionEvent
exports.recalculateStudentProgressV2 = progressController.recalculateStudentProgress
exports.dailyConsistencyCheckV2 = progressController.dailyConsistencyCheck
exports.onUserDeleteV2 = dataIntegrityController.onUserDelete
exports.createEvidencePackV2 = portfolioController.createEvidencePack
exports.verifyEvidenceV2 = portfolioController.verifyEvidence
exports.generateDailyReportV2 = scheduledController.generateDailyReport
exports.analyzeTalentTracksV2 = scheduledController.analyzeTalentTracks
exports.updateAdaptivePathV2 = adaptiveController.updateAdaptivePath
exports.generateAdaptivePathV2 = adaptiveController.generateAdaptivePath
exports.getBadgeDefinitionsV2 = gamificationController.getBadgeDefinitions
exports.claimDailyRewardV2 = gamificationController.claimDailyReward
exports.getDetailedExplanationV2 = generationController.getDetailedExplanation
exports.generateInterventionsV2 = generationController.generateInterventions
exports.generateKnowledgeSheetV2 = knowledgeSheetController.generateKnowledgeSheet
exports.generateBatchKnowledgeSheetsV2 = knowledgeSheetController.generateBatchKnowledgeSheets
exports.generateUnitKnowledgeSheetV2 = knowledgeSheetController.generateUnitKnowledgeSheet
exports.getKnowledgeSheetsV2 = knowledgeSheetController.getKnowledgeSheets
exports.getWorksheetReportsV2 = worksheetController.getWorksheetReports
exports.syncLearningRoomWorksheetsV2 = worksheetController.syncLearningRoomWorksheets
exports.generateElectronicWorksheetV2 = worksheetController.generateElectronicWorksheet

// ============================================================
// 🧹 DATA CLEANUP CONTROLLER EXPORTS
// ============================================================
exports.getOrphanedDataStats = dataCleanupController.getOrphanedDataStats
exports.cleanupOrphanedData = dataCleanupController.cleanupOrphanedData
exports.getDataStorageStats = dataCleanupController.getDataStorageStats
exports.resetCourseData = dataCleanupController.resetCourseData
exports.getInaccessibleData = dataCleanupController.getInaccessibleData
exports.cleanupInaccessibleData = dataCleanupController.cleanupInaccessibleData

console.log('📦 HOTS-AI Cloud Functions loaded (Clean Architecture v7.0)')
