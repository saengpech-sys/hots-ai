/**
 * System Health Controller
 * Handles system monitoring, debugging, and reliability reporting
 * 
 * Functions:
 * - healthCheck: System health status check
 * - systemDebug: Debug logs and statistics
 * - syncProgress: Manual student progress sync
 * - reliabilityReport: System reliability report
 */

const functions = require('firebase-functions')
const { getDb, openai } = require('../shared/firebase')
const { verifyDataConsistency, syncStudentProgress } = require('../utils/dataConsistency')
const cors = require('cors')({ origin: true })

/**
 * Health Check - System status endpoint
 * GET
 */
const healthCheck = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const db = getDb()
      
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
 * System Debug - Debug logs and statistics
 * GET { type, hours?, limit? }
 */
const systemDebug = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const db = getDb()
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
 * Sync Progress - Manual student progress synchronization
 * POST { studentId, courseId, verifyOnly? }
 */
const syncProgress = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }
      
      const db = getDb()
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
 * Reliability Report - System reliability statistics
 * GET { days? }
 */
const reliabilityReport = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const db = getDb()
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
 * Generate Recommendations based on stats
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

module.exports = {
  healthCheck,
  systemDebug,
  syncProgress,
  reliabilityReport
}
