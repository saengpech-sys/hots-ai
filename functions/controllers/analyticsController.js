/**
 * Analytics Controller
 * จัดการ Class Analytics, Student Trajectory, SEM Data Export
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })

const getDb = () => admin.firestore()

/**
 * Generate Class Analytics
 * POST /generateClassAnalytics
 */
exports.generateClassAnalytics = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { courseId, teacherId } = req.body
      const db = getDb()

      if (!courseId || !teacherId) {
        return res.status(400).send({ error: 'courseId and teacherId required' })
      }

      // Get all assessments for this course
      const assessmentsSnap = await db.collection('assessments')
        .where('courseId', '==', courseId)
        .orderBy('createdAt', 'desc')
        .limit(1000)
        .get()

      if (assessmentsSnap.empty) {
        return res.status(200).send({
          success: true,
          analytics: {
            totalAssessments: 0,
            averageScore: 0,
            dimensionAverages: { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 },
            studentCount: 0,
            loProgress: {}
          }
        })
      }

      // Calculate analytics
      let totalScore = 0
      const dimensionTotals = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
      const studentIds = new Set()
      const loProgress = {}

      assessmentsSnap.forEach(doc => {
        const data = doc.data()
        const scores = data.rubricScores || {}
        
        totalScore += (scores.analysis || 0) + (scores.reasoning || 0) + 
                     (scores.creativity || 0) + (scores.evidence || 0)
        
        dimensionTotals.analysis += scores.analysis || 0
        dimensionTotals.reasoning += scores.reasoning || 0
        dimensionTotals.creativity += scores.creativity || 0
        dimensionTotals.evidence += scores.evidence || 0
        
        studentIds.add(data.studentId)

        // Track LO progress
        if (data.loAssessment?.passedLOs) {
          data.loAssessment.passedLOs.forEach(lo => {
            loProgress[lo] = (loProgress[lo] || 0) + 1
          })
        }
      })

      const count = assessmentsSnap.size

      const analytics = {
        totalAssessments: count,
        averageScore: Math.round((totalScore / count) * 10) / 10,
        dimensionAverages: {
          analysis: Math.round((dimensionTotals.analysis / count) * 10) / 10,
          reasoning: Math.round((dimensionTotals.reasoning / count) * 10) / 10,
          creativity: Math.round((dimensionTotals.creativity / count) * 10) / 10,
          evidence: Math.round((dimensionTotals.evidence / count) * 10) / 10
        },
        studentCount: studentIds.size,
        loProgress,
        generatedAt: new Date().toISOString()
      }

      // Save to course document
      await db.collection('courses').doc(courseId).update({
        'analytics.latest': analytics
      })

      res.status(200).send({ success: true, analytics })
    } catch (error) {
      console.error('Error generating class analytics:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Get Student Trajectory
 * POST /getStudentTrajectory
 */
exports.getStudentTrajectory = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { studentId, courseId, limit = 50 } = req.method === 'GET' ? req.query : req.body
      const db = getDb()

      if (!studentId) {
        return res.status(400).send({ error: 'studentId required' })
      }

      // Build query
      let query = db.collection('assessments')
        .where('studentId', '==', studentId)
        .orderBy('createdAt', 'asc')
        .limit(parseInt(limit))

      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }

      const assessmentsSnap = await query.get()

      const trajectory = []
      let cumulativeScore = 0
      let count = 0

      assessmentsSnap.forEach(doc => {
        const data = doc.data()
        const scores = data.rubricScores || {}
        const total = (scores.analysis || 0) + (scores.reasoning || 0) + 
                     (scores.creativity || 0) + (scores.evidence || 0)
        
        count++
        cumulativeScore += total

        trajectory.push({
          timestamp: data.createdAt?.toDate?.() || new Date(data.createdAt),
          score: total,
          cumulative: Math.round((cumulativeScore / count) * 10) / 10,
          scores,
          questionId: data.questionId,
          passedLOs: data.loAssessment?.passedLOs || []
        })
      })

      // Calculate growth metrics
      const growth = trajectory.length >= 2 ? {
        initial: trajectory[0]?.score || 0,
        final: trajectory[trajectory.length - 1]?.score || 0,
        change: (trajectory[trajectory.length - 1]?.score || 0) - (trajectory[0]?.score || 0),
        trend: calculateTrend(trajectory.map(t => t.score))
      } : null

      res.status(200).send({
        success: true,
        studentId,
        trajectory,
        growth,
        assessmentCount: trajectory.length
      })
    } catch (error) {
      console.error('Error getting student trajectory:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Export SEM Data (Structural Equation Modeling)
 * POST /exportSEMData
 */
exports.exportSEMData = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { courseId, format = 'json', anonymize = true } = req.body
      const db = getDb()

      // Get all assessments
      let query = db.collection('assessments').orderBy('createdAt', 'desc')
      
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }

      const assessmentsSnap = await query.limit(5000).get()
      const data = []

      assessmentsSnap.forEach(doc => {
        const assessment = doc.data()
        const scores = assessment.rubricScores || {}
        
        const record = {
          id: anonymize ? hashId(doc.id) : doc.id,
          studentId: anonymize ? hashId(assessment.studentId) : assessment.studentId,
          timestamp: assessment.createdAt?.toDate?.()?.toISOString() || null,
          // Latent variables (HOTS dimensions)
          analysis: scores.analysis || 0,
          reasoning: scores.reasoning || 0,
          creativity: scores.creativity || 0,
          evidence: scores.evidence || 0,
          // Manifest variables
          totalScore: (scores.analysis || 0) + (scores.reasoning || 0) + 
                     (scores.creativity || 0) + (scores.evidence || 0),
          passedLOCount: assessment.loAssessment?.passedLOs?.length || 0,
          // Metadata
          grade: assessment.grade || null,
          questionDifficulty: assessment.questionDifficulty || 'medium'
        }
        
        data.push(record)
      })

      if (format === 'csv') {
        const BOM = '\uFEFF'
        const headers = Object.keys(data[0] || {}).join(',')
        const rows = data.map(row => Object.values(row).join(','))
        const csv = BOM + headers + '\n' + rows.join('\n')
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', 'attachment; filename="sem_data.csv"')
        return res.send(csv)
      }

      res.status(200).send({
        success: true,
        data,
        metadata: {
          recordCount: data.length,
          variables: ['analysis', 'reasoning', 'creativity', 'evidence', 'totalScore', 'passedLOCount'],
          exportedAt: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Error exporting SEM data:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

// Helper: Calculate trend (positive, negative, stable)
function calculateTrend(scores) {
  if (scores.length < 3) return 'insufficient_data'
  
  const recent = scores.slice(-3)
  const earlier = scores.slice(0, 3)
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length
  
  const diff = recentAvg - earlierAvg
  
  if (diff > 1) return 'improving'
  if (diff < -1) return 'declining'
  return 'stable'
}

// Helper: Hash ID for anonymization
function hashId(id) {
  if (!id) return 'unknown'
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return 'anon_' + Math.abs(hash).toString(36)
}
