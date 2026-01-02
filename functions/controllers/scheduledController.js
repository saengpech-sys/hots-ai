/**
 * Scheduled Tasks Controller
 * Handles all scheduled/cron-based Cloud Functions
 * 
 * Functions:
 * - generateDailyReport: Daily assessment summary report (0:00 daily)
 * - analyzeTalentTracks: Weekly talent track analysis (Monday 0:00)
 */

const functions = require('firebase-functions')
const { getDb, admin, FieldValue } = require('../shared/firebase')
const { cleanupRateLimits } = require('../utils/rateLimiter')
const { calculatePointsSimple } = require('../gamification')

/**
 * Generate Daily Report
 * Runs at midnight (Bangkok time) every day
 * Creates summary of previous day's assessments
 */
const generateDailyReport = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    const db = getDb()
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
      generatedAt: FieldValue.serverTimestamp()
    })
    
    return null
  })

/**
 * Analyze Talent Tracks
 * Runs every Monday at midnight (Bangkok time)
 * Identifies students for Research/Innovation tracks based on A.R.C.E. scores
 */
const analyzeTalentTracks = functions.pubsub
  .schedule('every monday 00:00')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    const db = getDb()
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
              talentAnalysisLastRun: FieldValue.serverTimestamp(),
              talentScores: avgScores
            })
            
            // Create notification
            await db.collection('notifications').add({
              userId: studentId,
              type: 'talent_badge',
              title: '🎉 You have been identified for a Talent Track!',
              message: `Based on your consistent performance, you have been tagged for: ${newTags.map(t => t.replace('_', ' ').toUpperCase()).join(', ')}`,
              read: false,
              createdAt: FieldValue.serverTimestamp()
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

/**
 * Scheduled cleanup for rate limits (runs daily at 3 AM)
 */
const scheduledCleanupRateLimits = functions.pubsub
  .schedule('0 3 * * *')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    const db = getDb()
    console.log('🧹 Starting scheduled rate limit cleanup...')
    
    try {
      const result = await cleanupRateLimits(db)
      console.log('✅ Rate limit cleanup completed: ' + result.deleted + ' entries deleted')
      
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
const scheduledCleanupAuditLogs = functions.pubsub
  .schedule('0 2 * * 0')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    const db = getDb()
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
        console.log('✅ Deleted ' + parseLogsSnap.size + ' old AI parse logs')
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
        console.log('✅ Deleted ' + antiCheatSnap.size + ' resolved anti-cheat logs')
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

/**
 * Scheduled reconciliation for assessment-studentProgress desync
 * Runs every 6 hours to catch and fix any data inconsistencies
 */
const scheduledReconciliation = functions.pubsub
  .schedule('0 */6 * * *')  // Every 6 hours
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    const db = getDb()
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
      
      console.log('📊 Found ' + studentCourseMap.size + ' student-course pairs to check')
      
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
              lastReconciledAt: FieldValue.serverTimestamp(),
              createdAt: FieldValue.serverTimestamp(),
              createdBy: 'reconciliation'
            })
            
            stats.fixed++
            console.log('✅ Created missing progress for ' + key)
          } else {
            // Check for mismatches
            const storedLOs = new Set(progressDoc.data().passedLOs || [])
            const missing = [...expectedLOs].filter(lo => !storedLOs.has(lo))
            
            if (missing.length > 0) {
              // Fix the mismatch
              await progressRef.update({
                passedLOs: FieldValue.arrayUnion(...missing),
                totalPassed: FieldValue.increment(missing.length),
                lastReconciledAt: FieldValue.serverTimestamp()
              })
              
              stats.fixed++
              console.log('✅ Fixed ' + key + ': added ' + missing.length + ' missing LOs')
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
      console.log('📊 Reconciliation completed in ' + duration + 'ms: checked=' + stats.checked + ', fixed=' + stats.fixed + ', errors=' + stats.errors.length)
      
      // Store report
      await db.collection('systemReports').add({
        type: 'reconciliation',
        timestamp: FieldValue.serverTimestamp(),
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
const triggerReconciliation = functions.https.onCall(async (data, context) => {
  const db = getDb()
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
      lastReconciledAt: FieldValue.serverTimestamp(),
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

module.exports = {
  generateDailyReport,
  analyzeTalentTracks,
  scheduledCleanupRateLimits,
  scheduledCleanupAuditLogs,
  scheduledReconciliation,
  triggerReconciliation
}
