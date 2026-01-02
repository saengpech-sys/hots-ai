/**
 * Research Controller
 * จัดการ Research Data Export, IRR Analysis, AI Detection
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })

// Import research modules
const {
  EVENT_TYPES,
  logLearningEvent,
  exportResearchCSV,
  generateResearchSummary,
  calculateScoreCorrelation,
  logSequenceEvent,
  finalizeSequence,
  exportKAnonymousData,
  assessReidentificationRisk,
  calculateResearchReadiness
} = require('../utils/researchData')

const {
  calculateCohensKappa,
  calculateWeightedKappa,
  calculateICC,
  calculatePercentAgreement,
  comprehensiveIRRAnalysis,
  meetsPublicationStandard,
  calculateCohensD,
  generateReportText
} = require('../utils/interRaterReliability')

const {
  comprehensiveAIDetection,
  quickAICheck
} = require('../utils/aiDetection')

const getDb = () => admin.firestore()

/**
 * Calculate Inter-Rater Reliability
 */
exports.calculateIRR = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { rater1Scores, rater2Scores, categories, dimension } = req.body

      if (!rater1Scores || !rater2Scores) {
        return res.status(400).send({ error: 'Missing rater scores' })
      }

      if (rater1Scores.length !== rater2Scores.length) {
        return res.status(400).send({ error: 'Score arrays must be same length' })
      }

      const result = comprehensiveIRRAnalysis(rater1Scores, rater2Scores, {
        categories: categories || [0, 1, 2, 3, 4, 5],
        dimension: dimension || 'overall'
      })

      return res.status(200).send({
        success: true,
        analysis: result,
        meetsStandard: meetsPublicationStandard(result)
      })

    } catch (error) {
      console.error('Error calculating IRR:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Generate IRR Report
 */
exports.irrReport = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { courseId, dateRange, minSamples = 30 } = req.body
      const db = getDb()

      // Get calibration data
      let query = db.collection('calibrations')
      
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }

      if (dateRange?.start) {
        query = query.where('createdAt', '>=', new Date(dateRange.start))
      }

      const snapshot = await query.limit(500).get()

      if (snapshot.size < minSamples) {
        return res.status(400).send({
          error: `Need at least ${minSamples} samples, found ${snapshot.size}`
        })
      }

      // Extract scores by dimension
      const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
      const results = {}

      dimensions.forEach(dim => {
        const aiScores = []
        const humanScores = []

        snapshot.forEach(doc => {
          const data = doc.data()
          if (data.aiScore?.[dim] !== undefined && data.humanScore?.[dim] !== undefined) {
            aiScores.push(Math.round(data.aiScore[dim]))
            humanScores.push(Math.round(data.humanScore[dim]))
          }
        })

        if (aiScores.length >= 10) {
          results[dim] = comprehensiveIRRAnalysis(aiScores, humanScores, {
            dimension: dim,
            categories: [0, 1, 2, 3, 4, 5]
          })
        }
      })

      // Generate text report
      const reportText = generateReportText(results)

      return res.status(200).send({
        success: true,
        sampleSize: snapshot.size,
        dimensions: results,
        reportText,
        publicationReady: Object.values(results).every(r => 
          meetsPublicationStandard(r)
        )
      })

    } catch (error) {
      console.error('Error generating IRR report:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Calculate Effect Size (Cohen's d)
 */
exports.calculateEffectSize = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { preScores, postScores, controlScores, experimentScores } = req.body

      const results = {}

      // Within-group effect (pre-post)
      if (preScores && postScores) {
        if (preScores.length !== postScores.length) {
          return res.status(400).send({ error: 'Pre and post arrays must be same length' })
        }
        results.withinGroup = calculateCohensD(preScores, postScores, true)
      }

      // Between-group effect (control vs experiment)
      if (controlScores && experimentScores) {
        results.betweenGroup = calculateCohensD(controlScores, experimentScores, false)
      }

      return res.status(200).send({
        success: true,
        effectSize: results,
        interpretation: {
          small: 0.2,
          medium: 0.5,
          large: 0.8
        }
      })

    } catch (error) {
      console.error('Error calculating effect size:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Export Research Data
 */
exports.exportResearchData = functions.runWith({ 
  timeoutSeconds: 300,
  memory: '1GB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { courseId, format = 'json', anonymize = true, dateRange } = req.body
      const db = getDb()

      const data = await exportResearchCSV(db, { courseId, dateRange, anonymize })

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename=research_data.csv')
        return res.send(data)
      }

      return res.status(200).send({
        success: true,
        data,
        exportedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error exporting research data:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Research Summary Statistics
 */
exports.researchSummary = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId } = req.method === 'GET' ? req.query : req.body
      const db = getDb()

      const summary = await generateResearchSummary(db, { courseId })

      return res.status(200).send({
        success: true,
        summary
      })

    } catch (error) {
      console.error('Error generating research summary:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Correlation Analysis
 */
exports.correlationAnalysis = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId, variables } = req.body
      const db = getDb()

      const correlation = await calculateScoreCorrelation(db, { courseId, variables })

      return res.status(200).send({
        success: true,
        correlation
      })

    } catch (error) {
      console.error('Error calculating correlation:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Log Intervention Event
 */
exports.logInterventionEvent = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { studentId, courseId, interventionType, details } = req.body
      const db = getDb()

      await db.collection('interventions').add({
        studentId,
        courseId,
        interventionType,
        details,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })

      return res.status(200).send({ success: true })

    } catch (error) {
      console.error('Error logging intervention:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Get Growth History
 */
exports.getGrowthHistory = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { studentId, courseId, limit = 30 } = req.method === 'GET' ? req.query : req.body
      const db = getDb()

      if (!studentId) {
        return res.status(400).send({ error: 'Missing studentId' })
      }

      let query = db.collection('growthHistory')
        .where('studentId', '==', studentId)
        .orderBy('timestamp', 'desc')
        .limit(parseInt(limit))

      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }

      const snapshot = await query.get()
      const history = []

      snapshot.forEach(doc => {
        history.push({ id: doc.id, ...doc.data() })
      })

      return res.status(200).send({
        success: true,
        history
      })

    } catch (error) {
      console.error('Error getting growth history:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Research Data Quality Check
 */
exports.researchDataQuality = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId } = req.body
      const db = getDb()

      // Check various quality metrics
      const metrics = {
        totalAssessments: 0,
        withAuditTrail: 0,
        withTypingFingerprint: 0,
        withLOAssessment: 0,
        flaggedForAI: 0,
        calibrated: 0
      }

      const assessmentsSnapshot = await db.collection('assessments')
        .limit(1000)
        .get()

      assessmentsSnapshot.forEach(doc => {
        const data = doc.data()
        metrics.totalAssessments++
        if (data.auditTrail) metrics.withAuditTrail++
        if (data.typingFingerprint) metrics.withTypingFingerprint++
        if (data.loAssessment) metrics.withLOAssessment++
        if (data.flaggedForAI) metrics.flaggedForAI++
        if (data.calibrationId) metrics.calibrated++
      })

      // Calculate percentages
      const quality = {
        metrics,
        percentages: {
          auditTrail: metrics.totalAssessments > 0 ? (metrics.withAuditTrail / metrics.totalAssessments * 100).toFixed(1) : 0,
          typingFingerprint: metrics.totalAssessments > 0 ? (metrics.withTypingFingerprint / metrics.totalAssessments * 100).toFixed(1) : 0,
          loAssessment: metrics.totalAssessments > 0 ? (metrics.withLOAssessment / metrics.totalAssessments * 100).toFixed(1) : 0,
          calibrated: metrics.totalAssessments > 0 ? (metrics.calibrated / metrics.totalAssessments * 100).toFixed(1) : 0
        },
        overallScore: 0
      }

      // Calculate overall quality score
      quality.overallScore = (
        parseFloat(quality.percentages.auditTrail) * 0.3 +
        parseFloat(quality.percentages.typingFingerprint) * 0.2 +
        parseFloat(quality.percentages.loAssessment) * 0.3 +
        parseFloat(quality.percentages.calibrated) * 0.2
      ).toFixed(1)

      return res.status(200).send({
        success: true,
        quality
      })

    } catch (error) {
      console.error('Error checking data quality:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Analyze AI Content
 */
exports.analyzeAIContent = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { text, typingData } = req.body

      if (!text) {
        return res.status(400).send({ error: 'Missing text' })
      }

      const result = comprehensiveAIDetection(text, typingData)

      return res.status(200).send({
        success: true,
        analysis: result
      })

    } catch (error) {
      console.error('Error analyzing content:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Get Flagged Assessments
 */
exports.getFlaggedAssessments = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId, minRiskLevel = 0.5, limit = 50 } = req.body
      const db = getDb()

      let query = db.collection('assessments')
        .where('aiDetection.isLikelyAI', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit))

      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }

      const snapshot = await query.get()
      const flagged = []

      snapshot.forEach(doc => {
        const data = doc.data()
        if ((data.aiDetection?.overallRisk || 0) >= minRiskLevel) {
          flagged.push({
            id: doc.id,
            studentId: data.studentId,
            riskLevel: data.aiDetection?.overallRisk,
            signals: data.aiDetection?.signals,
            createdAt: data.createdAt
          })
        }
      })

      return res.status(200).send({
        success: true,
        flagged,
        count: flagged.length
      })

    } catch (error) {
      console.error('Error getting flagged assessments:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * AI Detection Statistics
 */
exports.aiDetectionStats = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId, dateRange } = req.body
      const db = getDb()

      let query = db.collection('assessments')
      
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }

      const snapshot = await query.limit(1000).get()

      const stats = {
        total: 0,
        flagged: 0,
        riskLevels: { low: 0, medium: 0, high: 0 },
        signals: {}
      }

      snapshot.forEach(doc => {
        const data = doc.data()
        stats.total++

        if (data.aiDetection?.isLikelyAI) {
          stats.flagged++
          
          const risk = data.aiDetection.overallRisk || 0
          if (risk < 0.3) stats.riskLevels.low++
          else if (risk < 0.7) stats.riskLevels.medium++
          else stats.riskLevels.high++

          // Count signals
          (data.aiDetection.signals || []).forEach(signal => {
            stats.signals[signal.type] = (stats.signals[signal.type] || 0) + 1
          })
        }
      })

      return res.status(200).send({
        success: true,
        stats,
        flagRate: stats.total > 0 ? (stats.flagged / stats.total * 100).toFixed(2) : 0
      })

    } catch (error) {
      console.error('Error getting AI detection stats:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Log Sequence Event API
 */
exports.logSequenceEventAPI = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { studentId, courseId, sessionId, eventType, metadata } = req.body
      const db = getDb()

      await logSequenceEvent(db, { studentId, courseId, sessionId, eventType, metadata })

      return res.status(200).send({ success: true })

    } catch (error) {
      console.error('Error logging sequence event:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Finalize Sequence API
 */
exports.finalizeSequenceAPI = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { sessionId, outcome } = req.body
      const db = getDb()

      await finalizeSequence(db, sessionId, outcome)

      return res.status(200).send({ success: true })

    } catch (error) {
      console.error('Error finalizing sequence:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Export K-Anonymous Data
 */
exports.exportKAnonymousDataAPI = functions.runWith({
  timeoutSeconds: 300,
  memory: '1GB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { kValue = 5, courseId } = req.body
      const db = getDb()

      const data = await exportKAnonymousData(db, { kValue, courseId })

      return res.status(200).send({
        success: true,
        data,
        kValue,
        exportedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error exporting k-anonymous data:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Assess Re-identification Risk
 */
exports.assessReidentificationRiskAPI = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId } = req.body
      const db = getDb()

      const risk = await assessReidentificationRisk(db, { courseId })

      return res.status(200).send({
        success: true,
        risk
      })

    } catch (error) {
      console.error('Error assessing risk:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Research Readiness V2
 */
exports.researchReadinessV2 = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId } = req.body
      const db = getDb()

      const readiness = await calculateResearchReadiness(db, { courseId })

      return res.status(200).send({
        success: true,
        readiness
      })

    } catch (error) {
      console.error('Error calculating research readiness:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Get Learning Sequences
 */
exports.getLearningSequences = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { studentId, courseId, limit = 50 } = req.body
      const db = getDb()

      let query = db.collection('learningSequences')
        .orderBy('startTime', 'desc')
        .limit(parseInt(limit))

      if (studentId) {
        query = query.where('studentId', '==', studentId)
      }

      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }

      const snapshot = await query.get()
      const sequences = []

      snapshot.forEach(doc => {
        sequences.push({ id: doc.id, ...doc.data() })
      })

      return res.status(200).send({
        success: true,
        sequences
      })

    } catch (error) {
      console.error('Error getting sequences:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

module.exports = exports

// ============================================================
// 🔬 Additional Research APIs (migrated from index.js)
// ============================================================

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
