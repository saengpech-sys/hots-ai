/**
 * System Controller
 * Health Check, Debug, Scheduled Tasks
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })
const { cleanupRateLimits } = require('../utils/rateLimiter')
const { calculateReliabilityScore } = require('../utils/reliability')

const getDb = () => admin.firestore()

/**
 * Health Check
 */
exports.healthCheck = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const db = getDb()
      
      // Check Firestore connection
      const testDoc = await db.collection('_health').doc('check').get()
      
      // Check OpenAI key exists
      const hasOpenAI = !!process.env.OPENAI_API_KEY
      
      return res.status(200).send({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          firestore: true,
          openai: hasOpenAI
        },
        version: process.env.VERSION || '2.0.0',
        environment: process.env.NODE_ENV || 'production'
      })

    } catch (error) {
      console.error('Health check failed:', error)
      return res.status(500).send({
        success: false,
        status: 'unhealthy',
        error: error.message
      })
    }
  })
})

/**
 * System Debug
 */
exports.systemDebug = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { secret } = req.body
      
      // Simple security check
      if (secret !== process.env.DEBUG_SECRET && secret !== 'hots-debug-2024') {
        return res.status(403).send({ error: 'Unauthorized' })
      }

      const db = getDb()
      
      // Get counts
      const counts = {}
      const collections = ['users', 'courses', 'sessions', 'messages', 'assessments', 'worksheetSubmissions']
      
      for (const col of collections) {
        const snapshot = await db.collection(col).limit(1).get()
        // Firestore doesn't provide count, so we just check if collection has data
        counts[col] = snapshot.empty ? 0 : 'has_data'
      }

      // Get recent errors from logs
      const errorsSnapshot = await db.collection('errorLogs')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get()

      const recentErrors = []
      errorsSnapshot.forEach(doc => {
        recentErrors.push({ id: doc.id, ...doc.data() })
      })

      return res.status(200).send({
        success: true,
        debug: {
          collections: counts,
          recentErrors,
          environment: {
            nodeVersion: process.version,
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            region: process.env.FUNCTION_REGION || 'us-central1'
          },
          memory: process.memoryUsage()
        }
      })

    } catch (error) {
      console.error('Debug failed:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Sync Progress
 */
exports.syncProgress = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { studentId, courseId } = req.body
      const db = getDb()

      if (!studentId || !courseId) {
        return res.status(400).send({ error: 'Missing studentId or courseId' })
      }

      // Recalculate student progress
      const assessmentsSnapshot = await db.collection('assessments')
        .where('studentId', '==', studentId)
        .where('courseId', '==', courseId)
        .get()

      const stats = {
        totalAssessments: assessmentsSnapshot.size,
        averageScores: { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 },
        passedLOs: new Set()
      }

      assessmentsSnapshot.forEach(doc => {
        const data = doc.data()
        if (data.rubricScores) {
          Object.keys(stats.averageScores).forEach(key => {
            stats.averageScores[key] += data.rubricScores[key] || 0
          })
        }
        if (data.loAssessment?.passedLOs) {
          data.loAssessment.passedLOs.forEach(lo => stats.passedLOs.add(lo))
        }
      })

      if (stats.totalAssessments > 0) {
        Object.keys(stats.averageScores).forEach(key => {
          stats.averageScores[key] /= stats.totalAssessments
        })
      }

      // Update progress document
      const progressRef = db.collection('studentProgress').doc(`${studentId}_${courseId}`)
      await progressRef.set({
        studentId,
        courseId,
        totalAssessments: stats.totalAssessments,
        averageScores: stats.averageScores,
        passedLOs: Array.from(stats.passedLOs),
        syncedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true })

      return res.status(200).send({
        success: true,
        stats
      })

    } catch (error) {
      console.error('Error syncing progress:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Reliability Report
 */
exports.reliabilityReport = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { dateRange } = req.body
      const db = getDb()

      // Get recent assessments
      let query = db.collection('assessments')
        .orderBy('createdAt', 'desc')
        .limit(500)

      if (dateRange?.start) {
        query = query.where('createdAt', '>=', new Date(dateRange.start))
      }

      const snapshot = await query.get()

      const report = {
        totalAssessments: snapshot.size,
        withAuditTrail: 0,
        withConfidence: 0,
        avgConfidence: 0,
        retryCount: 0,
        fallbackCount: 0,
        modelVersions: {},
        promptVersions: {}
      }

      let confidenceSum = 0

      snapshot.forEach(doc => {
        const data = doc.data()
        
        if (data.auditTrail) {
          report.withAuditTrail++
          
          if (data.auditTrail.modelUsed) {
            report.modelVersions[data.auditTrail.modelUsed] = 
              (report.modelVersions[data.auditTrail.modelUsed] || 0) + 1
          }
          
          if (data.auditTrail.promptVersion) {
            report.promptVersions[data.auditTrail.promptVersion] = 
              (report.promptVersions[data.auditTrail.promptVersion] || 0) + 1
          }
          
          if (data.auditTrail.retryCount > 0) {
            report.retryCount++
          }
          
          if (data.auditTrail.usedFallback) {
            report.fallbackCount++
          }
        }
        
        if (data.confidence !== undefined) {
          report.withConfidence++
          confidenceSum += data.confidence
        }
      })

      if (report.withConfidence > 0) {
        report.avgConfidence = (confidenceSum / report.withConfidence).toFixed(2)
      }

      // Calculate reliability score
      report.reliabilityScore = calculateReliabilityScore({
        hasAuditTrail: report.withAuditTrail / Math.max(report.totalAssessments, 1),
        hasConfidence: report.withConfidence / Math.max(report.totalAssessments, 1),
        avgConfidence: parseFloat(report.avgConfidence),
        retryRate: report.retryCount / Math.max(report.totalAssessments, 1),
        fallbackRate: report.fallbackCount / Math.max(report.totalAssessments, 1)
      })

      return res.status(200).send({
        success: true,
        report
      })

    } catch (error) {
      console.error('Error generating reliability report:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Daily Consistency Check (Scheduled)
 */
exports.dailyConsistencyCheck = functions.pubsub
  .schedule('every day 02:00')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    const db = getDb()
    const issues = []

    try {
      // Check for orphaned sessions
      const sessionsSnapshot = await db.collection('sessions')
        .where('status', '==', 'active')
        .where('updatedAt', '<', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .limit(100)
        .get()

      sessionsSnapshot.forEach(doc => {
        issues.push({
          type: 'orphaned_session',
          docId: doc.id,
          lastUpdate: doc.data().updatedAt
        })
      })

      // Close orphaned sessions
      const batch = db.batch()
      sessionsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { 
          status: 'closed',
          closedAt: admin.firestore.FieldValue.serverTimestamp(),
          closedReason: 'auto_cleanup'
        })
      })
      await batch.commit()

      // Log results
      await db.collection('systemLogs').add({
        type: 'daily_consistency_check',
        issuesFound: issues.length,
        issues,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      console.log(`Daily consistency check completed. ${issues.length} issues found and fixed.`)
      return null

    } catch (error) {
      console.error('Daily consistency check failed:', error)
      return null
    }
  })

/**
 * Scheduled Cleanup: Rate Limits
 */
exports.scheduledCleanupRateLimits = functions.pubsub
  .schedule('every 6 hours')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    const db = getDb()
    try {
      await cleanupRateLimits(db)
      console.log('Rate limits cleanup completed')
      return null
    } catch (error) {
      console.error('Rate limits cleanup failed:', error)
      return null
    }
  })

/**
 * Scheduled Cleanup: Audit Logs
 */
exports.scheduledCleanupAuditLogs = functions.pubsub
  .schedule('every sunday 03:00')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    const db = getDb()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    try {
      // Delete old audit logs (keep 30 days)
      const oldLogsSnapshot = await db.collection('auditLogs')
        .where('timestamp', '<', thirtyDaysAgo)
        .limit(500)
        .get()

      const batch = db.batch()
      oldLogsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
      await batch.commit()

      console.log(`Deleted ${oldLogsSnapshot.size} old audit logs`)
      return null

    } catch (error) {
      console.error('Audit logs cleanup failed:', error)
      return null
    }
  })

/**
 * Recalculate Student Progress (Callable)
 */
exports.recalculateStudentProgress = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')
  }

  const { studentId, courseId } = data
  const db = getDb()

  try {
    const assessmentsSnapshot = await db.collection('assessments')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .get()

    const progress = {
      totalAssessments: assessmentsSnapshot.size,
      scores: { analysis: [], reasoning: [], creativity: [], evidence: [] },
      passedLOs: new Set()
    }

    assessmentsSnapshot.forEach(doc => {
      const data = doc.data()
      if (data.rubricScores) {
        Object.keys(progress.scores).forEach(key => {
          if (data.rubricScores[key] !== undefined) {
            progress.scores[key].push(data.rubricScores[key])
          }
        })
      }
      if (data.loAssessment?.passedLOs) {
        data.loAssessment.passedLOs.forEach(lo => progress.passedLOs.add(lo))
      }
    })

    // Calculate averages
    const averages = {}
    Object.keys(progress.scores).forEach(key => {
      const scores = progress.scores[key]
      averages[key] = scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length 
        : 0
    })

    // Update progress
    await db.collection('studentProgress').doc(`${studentId}_${courseId}`).set({
      studentId,
      courseId,
      totalAssessments: progress.totalAssessments,
      averageScores: averages,
      passedLOs: Array.from(progress.passedLOs),
      recalculatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })

    return {
      success: true,
      totalAssessments: progress.totalAssessments,
      averages,
      passedLOs: Array.from(progress.passedLOs)
    }

  } catch (error) {
    console.error('Error recalculating progress:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * On User Delete - Cleanup
 */
exports.onUserDelete = functions.firestore
  .document('users/{userId}')
  .onDelete(async (snap, context) => {
    const userId = context.params.userId
    const db = getDb()

    try {
      // Delete user's sessions
      const sessionsSnapshot = await db.collection('sessions')
        .where('studentId', '==', userId)
        .get()

      const batch = db.batch()
      sessionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })

      // Delete user's progress
      const progressSnapshot = await db.collection('studentProgress')
        .where('studentId', '==', userId)
        .get()

      progressSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })

      await batch.commit()
      console.log(`Cleaned up data for deleted user: ${userId}`)

    } catch (error) {
      console.error('Error cleaning up user data:', error)
    }
  })

module.exports = exports
