/**
 * 👥 Human-in-the-Loop Review Queue Module
 * 
 * ระบบ Queue สำหรับการตรวจสอบโดยมนุษย์
 * กรณี AI มี confidence ต่ำ หรือ edge cases
 * 
 * Features:
 * 1. Automatic flagging based on confidence
 * 2. Review queue management
 * 3. Calibration tracking
 * 4. Expert consensus building
 * 
 * Use Cases:
 * - Low AI confidence (< 70%)
 * - Borderline scores (e.g., 2.5 → 2 or 3?)
 * - AI detection flags
 * - Student appeals
 * - Periodic calibration samples
 */

/**
 * Review Queue Priorities
 */
const REVIEW_PRIORITY = {
  URGENT: 1,      // Needs review within 1 hour
  HIGH: 2,        // Needs review within 24 hours
  MEDIUM: 3,      // Needs review within 3 days
  LOW: 4,         // Review when available
  CALIBRATION: 5  // Periodic calibration sample
}

/**
 * Review Reasons
 */
const REVIEW_REASONS = {
  LOW_CONFIDENCE: 'low_confidence',
  BORDERLINE_SCORE: 'borderline_score',
  AI_DETECTION: 'ai_detection',
  STUDENT_APPEAL: 'student_appeal',
  CALIBRATION_SAMPLE: 'calibration_sample',
  ANOMALY_DETECTED: 'anomaly_detected',
  HIGH_STAKES: 'high_stakes',
  DIMENSION_MISMATCH: 'dimension_mismatch'
}

/**
 * Review Status
 */
const REVIEW_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ESCALATED: 'escalated',
  DISMISSED: 'dismissed'
}

/**
 * Thresholds for automatic flagging
 */
const AUTO_FLAG_THRESHOLDS = {
  LOW_CONFIDENCE: 70,           // Flag if AI confidence < 70%
  BORDERLINE_TOLERANCE: 0.3,    // Flag if score is within 0.3 of threshold
  AI_DETECTION_SCORE: 50,       // Flag if AI detection score > 50
  DIMENSION_VARIANCE: 3,        // Flag if max-min dimension score > 3
  CALIBRATION_SAMPLE_RATE: 0.05 // Sample 5% for calibration
}

/**
 * Check if assessment needs human review
 * @param {Object} assessment - Assessment result
 * @param {Object} options - Additional context
 * @returns {Object} Flag decision
 */
function shouldFlagForReview(assessment, options = {}) {
  const flags = []
  let priority = REVIEW_PRIORITY.LOW

  const {
    isHighStakes = false,
    forceCalibration = false,
    studentAppealed = false
  } = options

  // 1. Check AI confidence
  if (assessment.aiConfidence !== undefined && assessment.aiConfidence < AUTO_FLAG_THRESHOLDS.LOW_CONFIDENCE) {
    flags.push({
      reason: REVIEW_REASONS.LOW_CONFIDENCE,
      details: `AI confidence: ${assessment.aiConfidence}%`,
      threshold: AUTO_FLAG_THRESHOLDS.LOW_CONFIDENCE
    })
    priority = Math.min(priority, REVIEW_PRIORITY.HIGH)
  }

  // 2. Check for borderline scores
  const scores = assessment.rubricScores || {}
  for (const [dim, score] of Object.entries(scores)) {
    // Check if score is borderline at passing threshold (3)
    if (Math.abs(score - 3) <= AUTO_FLAG_THRESHOLDS.BORDERLINE_TOLERANCE) {
      flags.push({
        reason: REVIEW_REASONS.BORDERLINE_SCORE,
        details: `${dim} score ${score} is borderline`,
        dimension: dim
      })
      priority = Math.min(priority, REVIEW_PRIORITY.MEDIUM)
    }
  }

  // 3. Check AI detection
  if (assessment.aiDetection && assessment.aiDetection.isLikelyAI) {
    flags.push({
      reason: REVIEW_REASONS.AI_DETECTION,
      details: `AI detection confidence: ${assessment.aiDetection.confidence}%`,
      signals: assessment.aiDetection.signals
    })
    priority = Math.min(priority, REVIEW_PRIORITY.HIGH)
  }

  // 4. Check dimension variance (possible inconsistent scoring)
  const scoreValues = Object.values(scores)
  if (scoreValues.length === 4) {
    const maxScore = Math.max(...scoreValues)
    const minScore = Math.min(...scoreValues)
    if (maxScore - minScore > AUTO_FLAG_THRESHOLDS.DIMENSION_VARIANCE) {
      flags.push({
        reason: REVIEW_REASONS.DIMENSION_MISMATCH,
        details: `Score variance: ${maxScore - minScore} (max: ${maxScore}, min: ${minScore})`,
        scores
      })
      priority = Math.min(priority, REVIEW_PRIORITY.MEDIUM)
    }
  }

  // 5. Student appeal
  if (studentAppealed) {
    flags.push({
      reason: REVIEW_REASONS.STUDENT_APPEAL,
      details: 'Student requested review'
    })
    priority = Math.min(priority, REVIEW_PRIORITY.HIGH)
  }

  // 6. High stakes assessment
  if (isHighStakes) {
    flags.push({
      reason: REVIEW_REASONS.HIGH_STAKES,
      details: 'High stakes assessment requires verification'
    })
    priority = Math.min(priority, REVIEW_PRIORITY.URGENT)
  }

  // 7. Random calibration sample
  if (forceCalibration || Math.random() < AUTO_FLAG_THRESHOLDS.CALIBRATION_SAMPLE_RATE) {
    flags.push({
      reason: REVIEW_REASONS.CALIBRATION_SAMPLE,
      details: 'Selected for calibration'
    })
    // Calibration samples can be low priority
    if (flags.length === 1) {
      priority = REVIEW_PRIORITY.CALIBRATION
    }
  }

  return {
    needsReview: flags.length > 0,
    flags,
    priority,
    priorityName: Object.keys(REVIEW_PRIORITY).find(k => REVIEW_PRIORITY[k] === priority)
  }
}

/**
 * Create review queue item
 * @param {Object} assessment - Assessment to review
 * @param {Object} flagResult - Result from shouldFlagForReview
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Review queue item
 */
function createReviewQueueItem(assessment, flagResult, metadata = {}) {
  const now = new Date()
  
  // Calculate due date based on priority
  const dueDateMs = {
    [REVIEW_PRIORITY.URGENT]: 1 * 60 * 60 * 1000,      // 1 hour
    [REVIEW_PRIORITY.HIGH]: 24 * 60 * 60 * 1000,       // 24 hours
    [REVIEW_PRIORITY.MEDIUM]: 3 * 24 * 60 * 60 * 1000, // 3 days
    [REVIEW_PRIORITY.LOW]: 7 * 24 * 60 * 60 * 1000,    // 7 days
    [REVIEW_PRIORITY.CALIBRATION]: 14 * 24 * 60 * 60 * 1000 // 14 days
  }

  return {
    id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    assessmentId: assessment.assessmentId || assessment.id,
    studentId: assessment.studentId,
    sessionId: assessment.sessionId,
    questionId: assessment.questionId,
    
    // Original assessment
    originalAssessment: {
      rubricScores: assessment.rubricScores,
      feedback: assessment.feedback,
      aiConfidence: assessment.aiConfidence,
      aiConfidenceReason: assessment.aiConfidenceReason,
      chainOfThought: assessment.chainOfThought
    },
    
    // Student answer for context
    studentAnswer: assessment.studentAnswer || metadata.studentAnswer,
    questionContext: assessment.questionContext || metadata.questionContext,
    
    // Review metadata
    flags: flagResult.flags,
    priority: flagResult.priority,
    priorityName: flagResult.priorityName,
    status: REVIEW_STATUS.PENDING,
    
    // Timestamps
    createdAt: now.toISOString(),
    dueAt: new Date(now.getTime() + dueDateMs[flagResult.priority]).toISOString(),
    
    // Assignment
    assignedTo: null,
    assignedAt: null,
    
    // Resolution
    resolvedBy: null,
    resolvedAt: null,
    resolution: null,
    
    // Additional context
    metadata: {
      courseId: metadata.courseId,
      gradeLevel: metadata.gradeLevel,
      subject: metadata.subject,
      ...metadata
    }
  }
}

/**
 * Expert review result structure
 * @param {Object} originalAssessment - Original AI assessment
 * @param {Object} expertScores - Expert's scores
 * @param {string} expertId - Expert reviewer ID
 * @param {Object} options - Additional options
 * @returns {Object} Expert review result
 */
function createExpertReview(originalAssessment, expertScores, expertId, options = {}) {
  const aiScores = originalAssessment.rubricScores || {}
  
  // Calculate agreement metrics
  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  const differences = {}
  let totalAbsDiff = 0
  let exactMatches = 0

  for (const dim of dimensions) {
    const aiScore = aiScores[dim] || 0
    const expertScore = expertScores[dim] || 0
    const diff = expertScore - aiScore
    
    differences[dim] = {
      ai: aiScore,
      expert: expertScore,
      difference: diff,
      absoluteDifference: Math.abs(diff)
    }
    
    totalAbsDiff += Math.abs(diff)
    if (aiScore === expertScore) exactMatches++
  }

  const averageAbsDiff = totalAbsDiff / dimensions.length

  return {
    expertId,
    reviewedAt: new Date().toISOString(),
    
    // Expert assessment
    expertScores,
    expertFeedback: options.feedback || null,
    expertNotes: options.notes || null,
    
    // Agreement analysis
    agreement: {
      differences,
      averageAbsoluteDifference: Math.round(averageAbsDiff * 100) / 100,
      exactMatchCount: exactMatches,
      exactMatchRate: Math.round((exactMatches / dimensions.length) * 100),
      agreementLevel: averageAbsDiff <= 0.5 ? 'high' :
                      averageAbsDiff <= 1.0 ? 'moderate' : 'low'
    },
    
    // Decision
    decision: options.decision || 'confirm', // confirm, override, partial_override
    overrideReason: options.overrideReason || null,
    
    // Final scores (after expert review)
    finalScores: options.decision === 'confirm' ? aiScores : expertScores
  }
}

/**
 * Process calibration sample for IRR
 * @param {Array} reviews - Array of expert reviews for same item
 * @returns {Object} Calibration analysis
 */
function processCalibrationSample(reviews) {
  if (reviews.length < 2) {
    return { error: 'Need at least 2 reviews for calibration' }
  }

  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  const dimensionAnalysis = {}

  for (const dim of dimensions) {
    const scores = reviews.map(r => r.expertScores?.[dim] || 0)
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
    
    dimensionAnalysis[dim] = {
      scores,
      mean: Math.round(mean * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      std: Math.round(Math.sqrt(variance) * 100) / 100,
      range: Math.max(...scores) - Math.min(...scores),
      consensus: variance <= 0.5 ? 'high' : variance <= 1.0 ? 'moderate' : 'low'
    }
  }

  // Overall consensus
  const variances = Object.values(dimensionAnalysis).map(d => d.variance)
  const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length

  return {
    reviewerCount: reviews.length,
    dimensionAnalysis,
    overallConsensus: avgVariance <= 0.5 ? 'high' : avgVariance <= 1.0 ? 'moderate' : 'low',
    averageVariance: Math.round(avgVariance * 100) / 100,
    needsDiscussion: avgVariance > 1.0,
    recommendedFinalScore: calculateConsensusScore(dimensionAnalysis)
  }
}

/**
 * Calculate consensus score from multiple reviews
 */
function calculateConsensusScore(dimensionAnalysis) {
  const consensusScores = {}
  
  for (const [dim, analysis] of Object.entries(dimensionAnalysis)) {
    // Use median for better robustness
    const sorted = [...analysis.scores].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 !== 0 
      ? sorted[mid] 
      : (sorted[mid - 1] + sorted[mid]) / 2
    
    consensusScores[dim] = Math.round(median)
  }

  return consensusScores
}

/**
 * Get review queue statistics
 * @param {Array} queueItems - Array of queue items
 * @returns {Object} Queue statistics
 */
function getQueueStatistics(queueItems) {
  const stats = {
    total: queueItems.length,
    byStatus: {},
    byPriority: {},
    byReason: {},
    overdue: 0,
    averageResolutionTime: null
  }

  const resolutionTimes = []
  const now = new Date()

  for (const item of queueItems) {
    // By status
    stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1

    // By priority
    stats.byPriority[item.priorityName] = (stats.byPriority[item.priorityName] || 0) + 1

    // By reason
    for (const flag of (item.flags || [])) {
      stats.byReason[flag.reason] = (stats.byReason[flag.reason] || 0) + 1
    }

    // Check overdue
    if (item.status === REVIEW_STATUS.PENDING && new Date(item.dueAt) < now) {
      stats.overdue++
    }

    // Calculate resolution time
    if (item.resolvedAt && item.createdAt) {
      const resolutionMs = new Date(item.resolvedAt) - new Date(item.createdAt)
      resolutionTimes.push(resolutionMs)
    }
  }

  // Average resolution time
  if (resolutionTimes.length > 0) {
    const avgMs = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    stats.averageResolutionTime = {
      hours: Math.round(avgMs / (1000 * 60 * 60) * 10) / 10,
      formatted: formatDuration(avgMs)
    }
  }

  return stats
}

/**
 * Format duration in human readable form
 */
function formatDuration(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  return `${hours}h ${minutes}m`
}

/**
 * Generate calibration report
 * @param {Array} calibrationSamples - Processed calibration samples
 * @returns {Object} Calibration report
 */
function generateCalibrationReport(calibrationSamples) {
  if (calibrationSamples.length === 0) {
    return { error: 'No calibration samples' }
  }

  const report = {
    sampleCount: calibrationSamples.length,
    generatedAt: new Date().toISOString(),
    dimensionConsensus: {
      analysis: { high: 0, moderate: 0, low: 0 },
      reasoning: { high: 0, moderate: 0, low: 0 },
      creativity: { high: 0, moderate: 0, low: 0 },
      evidence: { high: 0, moderate: 0, low: 0 }
    },
    overallConsensus: { high: 0, moderate: 0, low: 0 },
    needsTraining: []
  }

  for (const sample of calibrationSamples) {
    // Dimension-level consensus
    for (const [dim, analysis] of Object.entries(sample.dimensionAnalysis || {})) {
      if (report.dimensionConsensus[dim]) {
        report.dimensionConsensus[dim][analysis.consensus]++
      }
    }

    // Overall consensus
    report.overallConsensus[sample.overallConsensus]++

    // Flag problematic dimensions
    for (const [dim, analysis] of Object.entries(sample.dimensionAnalysis || {})) {
      if (analysis.consensus === 'low') {
        report.needsTraining.push({
          dimension: dim,
          variance: analysis.variance,
          sampleId: sample.sampleId
        })
      }
    }
  }

  // Calculate consensus rates
  for (const dim of ['analysis', 'reasoning', 'creativity', 'evidence']) {
    const total = Object.values(report.dimensionConsensus[dim]).reduce((a, b) => a + b, 0)
    report.dimensionConsensus[dim].highRate = 
      Math.round((report.dimensionConsensus[dim].high / total) * 100)
  }

  const overallTotal = Object.values(report.overallConsensus).reduce((a, b) => a + b, 0)
  report.overallConsensusRate = Math.round((report.overallConsensus.high / overallTotal) * 100)

  // Recommendations
  report.recommendations = []
  
  if (report.overallConsensusRate < 70) {
    report.recommendations.push({
      priority: 'high',
      action: 'Conduct calibration training session',
      details: `Only ${report.overallConsensusRate}% high consensus rate`
    })
  }

  const problematicDimensions = Object.entries(report.dimensionConsensus)
    .filter(([_, stats]) => stats.highRate < 60)
    .map(([dim]) => dim)

  if (problematicDimensions.length > 0) {
    report.recommendations.push({
      priority: 'medium',
      action: 'Review rubric anchors for problematic dimensions',
      dimensions: problematicDimensions
    })
  }

  return report
}

module.exports = {
  REVIEW_PRIORITY,
  REVIEW_REASONS,
  REVIEW_STATUS,
  AUTO_FLAG_THRESHOLDS,
  shouldFlagForReview,
  createReviewQueueItem,
  createExpertReview,
  processCalibrationSample,
  getQueueStatistics,
  generateCalibrationReport
}
