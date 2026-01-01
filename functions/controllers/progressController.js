/**
 * Progress & Analytics Controller
 * Handles class analytics and student progress management
 * 
 * Functions:
 * - generateClassAnalytics: Generate analytics for a course
 * - recalculateStudentProgress: Recalculate student progress from assessments
 */

const functions = require('firebase-functions')
const { getDb, admin, FieldValue } = require('../shared/firebase')
const { verifyTeacherRole, verifyRoles, TEACHER_ROLES, ADMIN_ROLES } = require('../shared/auth')
const cors = require('cors')({ origin: true })

/**
 * Generate Class Analytics for a course
 * POST { courseId, teacherId }
 * 🔐 SECURED: Teacher/Admin only
 */
const generateClassAnalytics = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const db = getDb()

      // 🔐 RBAC: Verify teacher/admin role
      const caller = await verifyTeacherRole(req, res)
      if (!caller) return // Response already sent

      const { courseId, teacherId } = req.body

      if (!courseId || !teacherId) {
        return res.status(400).send({ 
          error: 'Missing required fields: courseId, teacherId' 
        })
      }

      // Verify teacher owns this course
      const courseDoc = await db.collection('courses').doc(courseId).get()
      if (!courseDoc.exists || courseDoc.data().teacherId !== teacherId) {
        return res.status(403).send({ error: 'Unauthorized' })
      }

      const courseData = courseDoc.data()

      // Get all students in this course (via sessions)
      const sessionsSnapshot = await db.collection('sessions')
        .where('courseId', '==', courseId)
        .get()

      const studentIds = [...new Set(sessionsSnapshot.docs.map(doc => doc.data().studentId))]

      // Get all assessments for this course
      const assessmentsSnapshot = await db.collection('assessments')
        .where('courseId', '==', courseId)
        .get()

      if (assessmentsSnapshot.empty) {
        return res.status(200).send({
          courseId,
          courseName: courseData.courseName || courseData.name || 'Unknown Course',
          totalStudents: studentIds.length,
          totalAssessments: 0,
          message: 'No assessments found for this course'
        })
      }

      // Initialize analytics data
      const analytics = {
        totalAssessments: assessmentsSnapshot.size,
        totalStudents: studentIds.length,
        rubricAverages: {
          analysis: 0,
          reasoning: 0,
          creativity: 0,
          evidence: 0
        },
        studentPerformance: {},
        loMastery: {},
        strugglingStudents: [],
        topPerformers: []
      }

      // Process each assessment
      let totalScores = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
      
      assessmentsSnapshot.forEach(doc => {
        const assessment = doc.data()
        const { studentId, rubricScores, loAssessment } = assessment

        // Accumulate rubric scores
        if (rubricScores) {
          totalScores.analysis += rubricScores.analysis || 0
          totalScores.reasoning += rubricScores.reasoning || 0
          totalScores.creativity += rubricScores.creativity || 0
          totalScores.evidence += rubricScores.evidence || 0
        }

        // Track student performance
        if (!analytics.studentPerformance[studentId]) {
          analytics.studentPerformance[studentId] = {
            assessmentCount: 0,
            totalScore: 0,
            averageScore: 0,
            rubricTotals: { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 },
            passedLOs: new Set()
          }
        }

        const studentPerf = analytics.studentPerformance[studentId]
        studentPerf.assessmentCount++
        
        if (rubricScores) {
          const assessmentScore = (rubricScores.analysis + rubricScores.reasoning + 
                                   rubricScores.creativity + rubricScores.evidence) / 4
          studentPerf.totalScore += assessmentScore
          studentPerf.rubricTotals.analysis += rubricScores.analysis
          studentPerf.rubricTotals.reasoning += rubricScores.reasoning
          studentPerf.rubricTotals.creativity += rubricScores.creativity
          studentPerf.rubricTotals.evidence += rubricScores.evidence
        }

        // Track LO mastery
        if (loAssessment && loAssessment.passedLOs) {
          loAssessment.passedLOs.forEach(lo => {
            studentPerf.passedLOs.add(lo)
            analytics.loMastery[lo] = (analytics.loMastery[lo] || 0) + 1
          })
        }
      })

      // Calculate averages
      analytics.rubricAverages.analysis = totalScores.analysis / assessmentsSnapshot.size
      analytics.rubricAverages.reasoning = totalScores.reasoning / assessmentsSnapshot.size
      analytics.rubricAverages.creativity = totalScores.creativity / assessmentsSnapshot.size
      analytics.rubricAverages.evidence = totalScores.evidence / assessmentsSnapshot.size

      // Calculate student averages and identify struggling/top performers
      const studentScores = []
      
      for (const [studentId, perf] of Object.entries(analytics.studentPerformance)) {
        perf.averageScore = perf.totalScore / perf.assessmentCount
        perf.passedLOs = Array.from(perf.passedLOs)
        
        studentScores.push({
          studentId,
          averageScore: perf.averageScore,
          assessmentCount: perf.assessmentCount,
          passedLOsCount: perf.passedLOs.length
        })
      }

      // Sort by average score
      studentScores.sort((a, b) => a.averageScore - b.averageScore)

      // Identify struggling students (bottom 20% or score < 2.5)
      const strugglingThreshold = Math.max(2.5, studentScores[Math.floor(studentScores.length * 0.2)]?.averageScore || 0)
      analytics.strugglingStudents = studentScores
        .filter(s => s.averageScore < strugglingThreshold)
        .map(s => s.studentId)

      // Identify top performers (top 20% or score >= 4.0)
      const topThreshold = Math.min(4.0, studentScores[Math.floor(studentScores.length * 0.8)]?.averageScore || 5)
      analytics.topPerformers = studentScores
        .filter(s => s.averageScore >= topThreshold)
        .map(s => s.studentId)

      // Save analytics to Firestore
      const reportId = `${courseId}_${Date.now()}`
      await db.collection('classReports').doc(reportId).set({
        courseId,
        courseName: courseData.courseName || courseData.name || 'Unknown Course',
        teacherId,
        analytics,
        generatedAt: FieldValue.serverTimestamp(),
        lastUpdated: FieldValue.serverTimestamp()
      })

      return res.status(200).send({
        success: true,
        reportId,
        analytics
      })

    } catch (error) {
      console.error('Generate Class Analytics error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

/**
 * Recalculate Student Progress from assessments
 * Callable function for admin/teacher
 * @param {Object} data - { studentId?, courseId }
 * @returns {Object} - { success, updated, results }
 */
const recalculateStudentProgress = functions.https.onCall(async (data, context) => {
  // Check if caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const db = getDb()
  const callerDoc = await db.collection('users').doc(context.auth.uid).get()
  const callerRole = callerDoc.data()?.role
  
  // Allow ministry_admin, esa_admin, or teacher
  const isAdmin = callerRole === 'ministry_admin' || callerRole === 'esa_admin'
  const isTeacher = callerRole === 'teacher'
  
  if (!isAdmin && !isTeacher) {
    throw new functions.https.HttpsError('permission-denied', 'Only teachers or admins can run this function')
  }

  const { studentId, courseId } = data

  if (!courseId) {
    throw new functions.https.HttpsError('invalid-argument', 'courseId is required')
  }

  // If teacher, verify they own this course
  if (isTeacher) {
    const courseDoc = await db.collection('courses').doc(courseId).get()
    if (!courseDoc.exists || courseDoc.data()?.teacherId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'You can only recalculate progress for your own courses')
    }
  }

  try {
    // Support both single student and batch (all students in course)
    let studentsToProcess = []
    
    if (studentId) {
      // Single student mode
      studentsToProcess = [studentId]
    } else {
      // Batch mode: get all students enrolled in this course
      const progressSnap = await db.collection('studentProgress')
        .where('courseId', '==', courseId)
        .get()
      
      studentsToProcess = [...new Set(progressSnap.docs.map(d => d.data().studentId))]
      
      // Also check assessments if no progress records exist
      if (studentsToProcess.length === 0) {
        const assessmentSnap = await db.collection('assessments')
          .where('courseId', '==', courseId)
          .get()
        studentsToProcess = [...new Set(assessmentSnap.docs.map(d => d.data().studentId).filter(Boolean))]
      }
    }
    
    let updatedCount = 0
    const results = []
    
    for (const sid of studentsToProcess) {
      // Get all assessments for this student
      const assessmentsSnap = await db.collection('assessments')
        .where('studentId', '==', sid)
        .where('courseId', '==', courseId)
        .get()

      // Collect all passed LOs
      const passedLOs = new Set()
      let totalAssessments = 0
      let totalPoints = 0

      assessmentsSnap.docs.forEach(doc => {
        const assessment = doc.data()
        totalAssessments++
        
        // LOs
        const los = assessment.loAssessment?.passedLOs || []
        los.forEach(lo => passedLOs.add(lo))
        
        // Points
        totalPoints += assessment.gamification?.pointsEarned || 0
      })

      // Update studentProgress
      const progressRef = db.collection('studentProgress').doc(`${sid}_${courseId}`)
      await progressRef.set({
        studentId: sid,
        courseId,
        passedLOs: Array.from(passedLOs),
        totalAssessments,
        totalPoints,
        lastRecalculated: FieldValue.serverTimestamp(),
        lastUpdated: FieldValue.serverTimestamp()
      }, { merge: true })
      
      updatedCount++
      results.push({
        studentId: sid,
        passedLOs: Array.from(passedLOs),
        totalAssessments
      })
    }

    // Audit log
    await db.collection('auditLogs').add({
      userId: context.auth.uid,
      action: 'recalculate_progress',
      timestamp: FieldValue.serverTimestamp(),
      metadata: {
        targetStudent: studentId || 'batch',
        courseId,
        studentsProcessed: updatedCount,
        mode: studentId ? 'single' : 'batch'
      }
    })

    return {
      success: true,
      updated: updatedCount,
      results: studentId ? results[0] : results.slice(0, 10) // Return first 10 in batch mode
    }
  } catch (error) {
    console.error('Recalculation error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

module.exports = {
  generateClassAnalytics,
  recalculateStudentProgress
}
