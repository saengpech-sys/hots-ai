/**
 * 🔬 Research & Quality Assurance Controller
 * 
 * Cloud Functions สำหรับ:
 * - Fairness Audit API
 * - Human-in-the-Loop Queue
 * - Validation Study Data
 * - Calibration Reports
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })

// Import modules
const {
  generateFairnessReport,
  performPairwiseFairnessAnalysis,
  calculateDIF,
  PROTECTED_ATTRIBUTES
} = require('../utils/fairnessAudit')

const {
  shouldFlagForReview,
  createReviewQueueItem,
  createExpertReview,
  processCalibrationSample,
  getQueueStatistics,
  generateCalibrationReport,
  REVIEW_STATUS,
  REVIEW_PRIORITY
} = require('../utils/humanInTheLoop')

const {
  generateValidationReport,
  calculateCriterionValidity,
  calculateCronbachsAlpha,
  prepareFactorAnalysisData
} = require('../utils/validationStudy')

const {
  generateGradeCalibrationContext,
  getExpectedScoreRange,
  checkScoreAppropriateness,
  getAdjustedThresholds
} = require('../utils/gradeLevelCalibration')

// Lazy Firestore initialization (avoid calling before admin.initializeApp())
const getDb = () => admin.firestore()

/**
 * 📊 Get Fairness Audit Report
 * GET /api/fairness-report?courseId=xxx&startDate=xxx&endDate=xxx
 */
exports.getFairnessReport = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    const db = getDb()
    try {
      // Verify admin/teacher access
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const token = authHeader.split('Bearer ')[1]
      const decodedToken = await admin.auth().verifyIdToken(token)
      
      // Get parameters
      const { courseId, startDate, endDate, attributes } = req.query

      // Build query
      let query = db.collection('assessments')
      
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }
      
      if (startDate) {
        query = query.where('createdAt', '>=', new Date(startDate))
      }
      
      if (endDate) {
        query = query.where('createdAt', '<=', new Date(endDate))
      }

      const snapshot = await query.limit(5000).get()
      
      // Enrich with user demographics
      const assessments = []
      for (const doc of snapshot.docs) {
        const data = doc.data()
        
        // Get student info
        if (data.studentId) {
          const userDoc = await db.collection('users').doc(data.studentId).get()
          if (userDoc.exists) {
            const userData = userDoc.data()
            assessments.push({
              ...data,
              gender: userData.gender,
              schoolType: userData.schoolType,
              region: userData.region,
              gradeLevel: userData.gradeLevel
            })
          } else {
            assessments.push(data)
          }
        }
      }

      // Generate report
      const attributeList = attributes 
        ? attributes.split(',') 
        : Object.values(PROTECTED_ATTRIBUTES)

      const report = await generateFairnessReport(assessments, {
        attributes: attributeList,
        includeRecommendations: true
      })

      return res.status(200).json({
        success: true,
        report,
        metadata: {
          assessmentCount: assessments.length,
          generatedAt: new Date().toISOString(),
          generatedBy: decodedToken.uid
        }
      })

    } catch (error) {
      console.error('Fairness report error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 👥 Submit Assessment for Human Review
 * POST /api/review-queue
 */
exports.submitForReview = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const db = getDb()
    try {
      const { assessmentId, reason, isHighStakes, studentAppealed } = req.body

      // Get assessment
      const assessmentDoc = await db.collection('assessments').doc(assessmentId).get()
      if (!assessmentDoc.exists) {
        return res.status(404).json({ error: 'Assessment not found' })
      }

      const assessment = { id: assessmentId, ...assessmentDoc.data() }

      // Check if should flag
      const flagResult = shouldFlagForReview(assessment, {
        isHighStakes,
        studentAppealed,
        forceCalibration: reason === 'calibration'
      })

      if (!flagResult.needsReview && !studentAppealed) {
        return res.status(200).json({
          success: true,
          message: 'Assessment does not require review',
          flagResult
        })
      }

      // Create queue item
      const queueItem = createReviewQueueItem(assessment, flagResult, {
        courseId: assessment.courseId,
        gradeLevel: assessment.gradeLevel,
        subject: assessment.subject,
        studentAnswer: assessment.studentAnswer,
        questionContext: assessment.questionContext
      })

      // Save to Firestore
      await db.collection('reviewQueue').doc(queueItem.id).set(queueItem)

      // Update assessment with review status
      await db.collection('assessments').doc(assessmentId).update({
        pendingReview: true,
        reviewQueueId: queueItem.id
      })

      return res.status(200).json({
        success: true,
        queueItem: {
          id: queueItem.id,
          priority: queueItem.priority,
          priorityName: queueItem.priorityName,
          dueAt: queueItem.dueAt
        }
      })

    } catch (error) {
      console.error('Submit for review error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 📋 Get Review Queue
 * GET /api/review-queue?status=pending&priority=1
 */
exports.getReviewQueue = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    const db = getDb()
    try {
      // Verify teacher/admin access
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const token = authHeader.split('Bearer ')[1]
      await admin.auth().verifyIdToken(token)

      const { status, priority, limit = 50 } = req.query

      let query = db.collection('reviewQueue')
        .orderBy('priority', 'asc')
        .orderBy('createdAt', 'asc')

      if (status) {
        query = query.where('status', '==', status)
      }

      if (priority) {
        query = query.where('priority', '==', parseInt(priority))
      }

      const snapshot = await query.limit(parseInt(limit)).get()
      
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Get statistics
      const allItemsSnapshot = await db.collection('reviewQueue').get()
      const allItems = allItemsSnapshot.docs.map(doc => doc.data())
      const stats = getQueueStatistics(allItems)

      return res.status(200).json({
        success: true,
        items,
        statistics: stats
      })

    } catch (error) {
      console.error('Get review queue error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * ✅ Submit Expert Review
 * POST /api/expert-review
 */
exports.submitExpertReview = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const db = getDb()
    try {
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const token = authHeader.split('Bearer ')[1]
      const decodedToken = await admin.auth().verifyIdToken(token)

      const { 
        queueItemId, 
        expertScores, 
        feedback, 
        notes, 
        decision 
      } = req.body

      // Get queue item
      const queueDoc = await db.collection('reviewQueue').doc(queueItemId).get()
      if (!queueDoc.exists) {
        return res.status(404).json({ error: 'Queue item not found' })
      }

      const queueItem = queueDoc.data()

      // Create expert review
      const review = createExpertReview(
        queueItem.originalAssessment,
        expertScores,
        decodedToken.uid,
        { feedback, notes, decision }
      )

      // Update queue item
      await db.collection('reviewQueue').doc(queueItemId).update({
        status: REVIEW_STATUS.COMPLETED,
        resolvedBy: decodedToken.uid,
        resolvedAt: new Date().toISOString(),
        resolution: review
      })

      // Update original assessment if override
      if (decision === 'override' || decision === 'partial_override') {
        await db.collection('assessments').doc(queueItem.assessmentId).update({
          rubricScores: review.finalScores,
          expertReviewed: true,
          expertReviewedAt: new Date().toISOString(),
          expertReviewedBy: decodedToken.uid,
          originalAIScores: queueItem.originalAssessment.rubricScores
        })
      }

      // Remove pending flag
      await db.collection('assessments').doc(queueItem.assessmentId).update({
        pendingReview: false
      })

      return res.status(200).json({
        success: true,
        review: {
          agreement: review.agreement,
          decision,
          finalScores: review.finalScores
        }
      })

    } catch (error) {
      console.error('Expert review error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 📊 Get Validation Study Data
 * GET /api/validation-data?type=factor|criterion|reliability
 */
exports.getValidationData = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    const db = getDb()
    try {
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const token = authHeader.split('Bearer ')[1]
      await admin.auth().verifyIdToken(token)

      const { type, courseId, limit = 1000 } = req.query

      // Get assessments
      let query = db.collection('assessments')
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }
      
      const snapshot = await query.limit(parseInt(limit)).get()
      const assessments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      let result = {}

      switch (type) {
        case 'factor':
          // Prepare data for Factor Analysis
          result = prepareFactorAnalysisData(assessments)
          break

        case 'criterion':
          // Get expert-reviewed assessments for criterion validity
          const reviewedDocs = await db.collection('assessments')
            .where('expertReviewed', '==', true)
            .limit(500)
            .get()

          const pairedScores = reviewedDocs.docs.map(doc => {
            const data = doc.data()
            return {
              aiScore: data.originalAIScores || data.rubricScores,
              expertScore: data.rubricScores
            }
          })

          result = calculateCriterionValidity(pairedScores)
          break

        case 'reliability':
          // Prepare data for Cronbach's Alpha
          const itemScores = assessments.map(a => [
            a.rubricScores?.analysis || 0,
            a.rubricScores?.reasoning || 0,
            a.rubricScores?.creativity || 0,
            a.rubricScores?.evidence || 0
          ])
          
          result = calculateCronbachsAlpha(itemScores)
          break

        case 'full':
          // Generate complete validation report
          const data = {
            assessments,
            itemScores: assessments.map(a => [
              a.rubricScores?.analysis || 0,
              a.rubricScores?.reasoning || 0,
              a.rubricScores?.creativity || 0,
              a.rubricScores?.evidence || 0
            ])
          }
          
          // Get paired scores if available
          const expertReviewedDocs = await db.collection('assessments')
            .where('expertReviewed', '==', true)
            .limit(500)
            .get()

          if (expertReviewedDocs.size >= 10) {
            data.pairedScores = expertReviewedDocs.docs.map(doc => {
              const d = doc.data()
              return {
                aiScore: d.originalAIScores || d.rubricScores,
                expertScore: d.rubricScores
              }
            })
          }

          result = generateValidationReport(data)
          break

        default:
          return res.status(400).json({ error: 'Invalid type. Use: factor, criterion, reliability, or full' })
      }

      return res.status(200).json({
        success: true,
        type,
        result,
        metadata: {
          assessmentCount: assessments.length,
          generatedAt: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('Validation data error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 🎓 Get Grade Calibration Info
 * GET /api/grade-calibration?gradeLevel=ม.3
 */
exports.getGradeCalibration = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const { gradeLevel, subject } = req.query

      if (!gradeLevel) {
        return res.status(400).json({ error: 'gradeLevel is required' })
      }

      const calibrationContext = generateGradeCalibrationContext(gradeLevel, subject)
      const expectedRange = getExpectedScoreRange(gradeLevel)
      const thresholds = getAdjustedThresholds(gradeLevel)

      return res.status(200).json({
        success: true,
        gradeLevel,
        promptContext: calibrationContext,
        expectedScoreRange: expectedRange,
        adjustedThresholds: thresholds
      })

    } catch (error) {
      console.error('Grade calibration error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * 📈 Generate Calibration Report
 * GET /api/calibration-report
 */
exports.getCalibrationReport = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    const db = getDb()
    try {
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const token = authHeader.split('Bearer ')[1]
      await admin.auth().verifyIdToken(token)

      // Get completed calibration reviews
      const calibrationDocs = await db.collection('reviewQueue')
        .where('status', '==', REVIEW_STATUS.COMPLETED)
        .where('flags', 'array-contains', { reason: 'calibration_sample' })
        .limit(200)
        .get()

      if (calibrationDocs.empty) {
        return res.status(200).json({
          success: true,
          message: 'No calibration samples found',
          report: null
        })
      }

      // Process calibration samples
      const samples = calibrationDocs.docs.map(doc => {
        const data = doc.data()
        if (data.resolution) {
          return {
            sampleId: doc.id,
            dimensionAnalysis: {
              analysis: { 
                scores: [data.resolution.expertScores?.analysis],
                consensus: 'pending'
              },
              reasoning: { 
                scores: [data.resolution.expertScores?.reasoning],
                consensus: 'pending'
              },
              creativity: { 
                scores: [data.resolution.expertScores?.creativity],
                consensus: 'pending'
              },
              evidence: { 
                scores: [data.resolution.expertScores?.evidence],
                consensus: 'pending'
              }
            },
            overallConsensus: 'single_rater'
          }
        }
        return null
      }).filter(Boolean)

      const report = generateCalibrationReport(samples)

      return res.status(200).json({
        success: true,
        report,
        sampleCount: samples.length
      })

    } catch (error) {
      console.error('Calibration report error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

module.exports = exports
