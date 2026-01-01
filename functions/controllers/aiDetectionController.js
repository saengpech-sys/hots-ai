/**
 * AI Detection Controller
 * Handles AI content detection and flagged assessment management
 * 
 * Functions:
 * - analyzeAIContent: Analyze text for AI signals
 * - getFlaggedAssessments: Get assessments flagged as potentially AI-generated
 * - aiDetectionStats: AI detection statistics and insights
 */

const functions = require('firebase-functions')
const { getDb, FieldValue } = require('../shared/firebase')
const { comprehensiveAIDetection } = require('../utils/aiDetection')
const cors = require('cors')({ origin: true })

/**
 * Analyze AI Content - Check if text might be AI-generated
 * POST { text, typingMetrics?, studentId?, courseId? }
 */
const analyzeAIContent = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
      }
      
      const db = getDb()
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
 * Get Flagged Assessments - List assessments flagged as potentially AI-generated
 * GET { courseId?, minScore?, limit? }
 */
const getFlaggedAssessments = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const db = getDb()
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
          aiDetection: data.aiDetection,
          answerPreview: (data.studentAnswer || '').substring(0, 200) + '...',
          rubricScores: data.rubricScores,
          overallScore: data.overallScore,
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
 * AI Detection Stats - Statistics and insights
 * GET { courseId?, days? }
 */
const aiDetectionStats = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const db = getDb()
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
      
      // Generate insights
      const insights = generateAIDetectionInsights(total, flagged, riskLevels, avgScore)
      
      return res.status(200).json({
        success: true,
        period: `${days} days`,
        courseId: courseId || 'all',
        totalAssessments: total,
        withDetection,
        detectionRate: total > 0 ? Math.round((withDetection / total) * 100) : 0,
        flaggedCount: flagged,
        flagRate: total > 0 ? Math.round((flagged / total) * 100) : 0,
        riskDistribution: riskLevels,
        scoreStats: {
          average: avgScore,
          min: scores.length > 0 ? Math.min(...scores) : 0,
          max: scores.length > 0 ? Math.max(...scores) : 0
        },
        topSignals,
        insights
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

module.exports = {
  analyzeAIContent,
  getFlaggedAssessments,
  aiDetectionStats
}
