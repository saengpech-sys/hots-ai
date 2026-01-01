/**
 * Data Integrity Controller
 * Handles data consistency, cascade deletes, and scheduled checks
 * 
 * Functions:
 * - onUserDelete: Cascade delete when user is removed
 * - dailyConsistencyCheck: Scheduled daily data integrity verification
 */

const functions = require('firebase-functions')
const { getDb, admin, FieldValue } = require('../shared/firebase')

/**
 * Cascade Delete - Delete all related data when user account is deleted
 * Triggered when user document is deleted
 */
const onUserDelete = functions.firestore
  .document('users/{userId}')
  .onDelete(async (snap, context) => {
    const userId = context.params.userId
    const db = getDb()
    const batch = db.batch()
    let deleteCount = 0

    console.log(`🗑️ Cascade delete triggered for user: ${userId}`)

    try {
      // 1. Delete assessments
      const assessmentsSnap = await db.collection('assessments')
        .where('studentId', '==', userId)
        .limit(500) // Firestore batch limit
        .get()
      
      assessmentsSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 2. Delete sessions
      const sessionsSnap = await db.collection('sessions')
        .where('studentId', '==', userId)
        .get()
      
      sessionsSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 3. Delete messages (nested in sessions, but query by from)
      const messagesSnap = await db.collection('messages')
        .where('studentId', '==', userId)
        .get()
      
      messagesSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 4. Delete studentProgress
      const progressSnap = await db.collection('studentProgress')
        .where('studentId', '==', userId)
        .get()
      
      progressSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 5. Delete reflections
      const reflectionsSnap = await db.collection('reflections')
        .where('studentId', '==', userId)
        .get()
      
      reflectionsSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 6. Delete notifications
      const notificationsSnap = await db.collection('notifications')
        .where('userId', '==', userId)
        .get()
      
      notificationsSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 7. Audit log
      batch.set(db.collection('auditLogs').doc(), {
        userId,
        action: 'cascade_delete',
        timestamp: FieldValue.serverTimestamp(),
        metadata: {
          deletedDocuments: deleteCount,
          reason: 'User account deleted'
        }
      })

      // Commit batch
      await batch.commit()
      console.log(`✅ Cascade delete completed: ${deleteCount} documents deleted for user ${userId}`)

      return { success: true, deletedDocuments: deleteCount }
    } catch (error) {
      console.error('❌ Cascade delete error:', error)
      throw error
    }
  })

/**
 * Daily Consistency Check
 * Runs at 2 AM (Bangkok time) every day
 * Verifies data integrity across collections
 */
const dailyConsistencyCheck = functions.pubsub
  .schedule('every day 02:00')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    const db = getDb()
    console.log('🔍 Starting daily consistency check...')
    
    const issues = {
      orphanedAssessments: [],
      mismatchedLOProgress: [],
      invalidScores: [],
      totalChecked: 0
    }

    try {
      // Check 1: Find orphaned assessments (student doesn't exist)
      const assessmentsSnap = await db.collection('assessments')
        .where('createdAt', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
        .limit(1000)
        .get()

      for (const assessmentDoc of assessmentsSnap.docs) {
        issues.totalChecked++
        const assessment = assessmentDoc.data()
        
        // Check if student exists
        const studentDoc = await db.collection('users').doc(assessment.studentId).get()
        if (!studentDoc.exists) {
          issues.orphanedAssessments.push({
            id: assessmentDoc.id,
            studentId: assessment.studentId,
            createdAt: assessment.createdAt
          })
        }

        // Check score validity
        if (assessment.overallScore < 0 || assessment.overallScore > 20) {
          issues.invalidScores.push({
            id: assessmentDoc.id,
            score: assessment.overallScore
          })
        }
      }

      // Check 2: Verify LO progress consistency
      const progressSnap = await db.collection('studentProgress')
        .limit(100) // Sample check
        .get()

      for (const progressDoc of progressSnap.docs) {
        const [studentId, courseId] = progressDoc.id.split('_')
        const progressData = progressDoc.data()
        
        // Get all assessments for this student-course
        const studentAssessmentsSnap = await db.collection('assessments')
          .where('studentId', '==', studentId)
          .where('courseId', '==', courseId)
          .get()

        // Collect all passed LOs from assessments
        const passedLOsFromAssessments = new Set()
        studentAssessmentsSnap.docs.forEach(doc => {
          const los = doc.data().loAssessment?.passedLOs || []
          los.forEach(lo => passedLOsFromAssessments.add(lo))
        })

        // Compare with stored progress
        const passedLOsFromProgress = new Set(progressData.passedLOs || [])
        
        const missing = [...passedLOsFromAssessments].filter(lo => !passedLOsFromProgress.has(lo))
        const extra = [...passedLOsFromProgress].filter(lo => !passedLOsFromAssessments.has(lo))

        if (missing.length > 0 || extra.length > 0) {
          issues.mismatchedLOProgress.push({
            documentId: progressDoc.id,
            studentId,
            courseId,
            missing,
            extra
          })
        }
      }

      // Log results
      console.log('📊 Consistency Check Results:', JSON.stringify(issues, null, 2))

      // Store report
      await db.collection('systemReports').add({
        type: 'consistency_check',
        timestamp: FieldValue.serverTimestamp(),
        issues,
        summary: {
          totalChecked: issues.totalChecked,
          orphanedCount: issues.orphanedAssessments.length,
          mismatchedCount: issues.mismatchedLOProgress.length,
          invalidScoresCount: issues.invalidScores.length
        }
      })

      // Send alert if critical issues found
      if (issues.orphanedAssessments.length > 10 || issues.invalidScores.length > 0) {
        console.warn('⚠️ CRITICAL: Major consistency issues detected!')
        
        await db.collection('criticalAlerts').add({
          type: 'DATA_CONSISTENCY_ISSUE',
          severity: 'critical',
          message: `ตรวจพบปัญหา Data Consistency: ${issues.orphanedAssessments.length} orphaned assessments, ${issues.invalidScores.length} invalid scores`,
          details: {
            orphanedCount: issues.orphanedAssessments.length,
            invalidScoresCount: issues.invalidScores.length,
            mismatchedCount: issues.mismatchedLOProgress.length
          },
          timestamp: FieldValue.serverTimestamp(),
          resolved: false,
          notifiedAdmins: false
        })
        
        console.log('📧 Critical alert logged to criticalAlerts collection')
      }

      return { success: true, issues }
    } catch (error) {
      console.error('❌ Consistency check error:', error)
      return { success: false, error: error.message }
    }
  })

module.exports = {
  onUserDelete,
  dailyConsistencyCheck
}
