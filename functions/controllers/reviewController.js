/**
 * Review Controller
 * จัดการ Multi-pass Assessment, Teacher Review, Appeals
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })

const getDb = () => admin.firestore()

/**
 * Submit Teacher Review
 * POST /submitTeacherReview
 */
exports.submitTeacherReview = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { assessmentId, teacherId, teacherScores, feedback, override } = req.body
      const db = getDb()

      if (!assessmentId || !teacherId || !teacherScores) {
        return res.status(400).send({ 
          error: 'assessmentId, teacherId, and teacherScores required' 
        })
      }

      // Get original assessment
      const assessmentRef = db.collection('assessments').doc(assessmentId)
      const assessmentDoc = await assessmentRef.get()

      if (!assessmentDoc.exists) {
        return res.status(404).send({ error: 'Assessment not found' })
      }

      const assessment = assessmentDoc.data()
      const originalScores = assessment.rubricScores || {}

      // Calculate score differences
      const differences = {
        analysis: (teacherScores.analysis || 0) - (originalScores.analysis || 0),
        reasoning: (teacherScores.reasoning || 0) - (originalScores.reasoning || 0),
        creativity: (teacherScores.creativity || 0) - (originalScores.creativity || 0),
        evidence: (teacherScores.evidence || 0) - (originalScores.evidence || 0)
      }

      // Create review record
      const reviewData = {
        assessmentId,
        teacherId,
        originalScores,
        teacherScores,
        differences,
        feedback: feedback || '',
        override: override === true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }

      // Save review
      const reviewRef = await db.collection('teacherReviews').add(reviewData)

      // If override, update the assessment
      if (override) {
        await assessmentRef.update({
          'rubricScores': teacherScores,
          'reviewedBy': teacherId,
          'reviewedAt': admin.firestore.FieldValue.serverTimestamp(),
          'originalAIScores': originalScores,
          'hasTeacherOverride': true
        })
      } else {
        // Just mark as reviewed
        await assessmentRef.update({
          'reviewedBy': teacherId,
          'reviewedAt': admin.firestore.FieldValue.serverTimestamp(),
          'teacherAgreed': true
        })
      }

      res.status(200).send({
        success: true,
        reviewId: reviewRef.id,
        differences,
        overrideApplied: override === true
      })
    } catch (error) {
      console.error('Error submitting teacher review:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Submit Appeal (Student)
 * POST /submitAppeal
 */
exports.submitAppeal = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { assessmentId, studentId, reason, requestedScores } = req.body
      const db = getDb()

      if (!assessmentId || !studentId || !reason) {
        return res.status(400).send({ 
          error: 'assessmentId, studentId, and reason required' 
        })
      }

      // Get original assessment
      const assessmentDoc = await db.collection('assessments').doc(assessmentId).get()

      if (!assessmentDoc.exists) {
        return res.status(404).send({ error: 'Assessment not found' })
      }

      const assessment = assessmentDoc.data()

      // Verify student owns this assessment
      if (assessment.studentId !== studentId) {
        return res.status(403).send({ error: 'Not authorized to appeal this assessment' })
      }

      // Check for existing appeals
      const existingAppeals = await db.collection('appeals')
        .where('assessmentId', '==', assessmentId)
        .where('status', '==', 'pending')
        .get()

      if (!existingAppeals.empty) {
        return res.status(400).send({ error: 'An appeal is already pending for this assessment' })
      }

      // Create appeal
      const appealData = {
        assessmentId,
        studentId,
        courseId: assessment.courseId,
        originalScores: assessment.rubricScores,
        reason,
        requestedScores: requestedScores || null,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }

      const appealRef = await db.collection('appeals').add(appealData)

      // Update assessment to mark as appealed
      await db.collection('assessments').doc(assessmentId).update({
        'hasAppeal': true,
        'appealId': appealRef.id
      })

      res.status(200).send({
        success: true,
        appealId: appealRef.id,
        message: 'อุทธรณ์ถูกส่งแล้ว รอการพิจารณาจากครู'
      })
    } catch (error) {
      console.error('Error submitting appeal:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Resolve Appeal (Teacher)
 * POST /resolveAppeal
 */
exports.resolveAppeal = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { appealId, teacherId, decision, newScores, response } = req.body
      const db = getDb()

      if (!appealId || !teacherId || !decision) {
        return res.status(400).send({ 
          error: 'appealId, teacherId, and decision required' 
        })
      }

      if (!['approved', 'rejected', 'partial'].includes(decision)) {
        return res.status(400).send({ 
          error: 'decision must be approved, rejected, or partial' 
        })
      }

      // Get appeal
      const appealRef = db.collection('appeals').doc(appealId)
      const appealDoc = await appealRef.get()

      if (!appealDoc.exists) {
        return res.status(404).send({ error: 'Appeal not found' })
      }

      const appeal = appealDoc.data()

      if (appeal.status !== 'pending') {
        return res.status(400).send({ error: 'Appeal already resolved' })
      }

      // Update appeal
      await appealRef.update({
        status: decision,
        resolvedBy: teacherId,
        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
        teacherResponse: response || '',
        newScores: newScores || null
      })

      // If approved or partial, update assessment scores
      if (decision !== 'rejected' && newScores) {
        await db.collection('assessments').doc(appeal.assessmentId).update({
          'rubricScores': newScores,
          'appealResolved': true,
          'appealDecision': decision
        })
      } else {
        await db.collection('assessments').doc(appeal.assessmentId).update({
          'appealResolved': true,
          'appealDecision': decision
        })
      }

      res.status(200).send({
        success: true,
        decision,
        message: decision === 'approved' ? 'อุทธรณ์ได้รับการอนุมัติ' :
                 decision === 'partial' ? 'อุทธรณ์ได้รับการพิจารณาบางส่วน' :
                 'อุทธรณ์ถูกปฏิเสธ'
      })
    } catch (error) {
      console.error('Error resolving appeal:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Get Pending Appeals
 * GET /getPendingAppeals
 */
exports.getPendingAppeals = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { courseId, teacherId, status = 'pending' } = req.method === 'GET' ? req.query : req.body
      const db = getDb()

      let query = db.collection('appeals').where('status', '==', status)
      
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }

      const appealsSnap = await query.orderBy('createdAt', 'desc').limit(50).get()
      const appeals = []

      for (const doc of appealsSnap.docs) {
        const appeal = doc.data()
        
        // Get student info
        const studentDoc = await db.collection('users').doc(appeal.studentId).get()
        const student = studentDoc.exists ? studentDoc.data() : null

        appeals.push({
          id: doc.id,
          ...appeal,
          createdAt: appeal.createdAt?.toDate?.() || null,
          studentName: student?.displayName || 'นักเรียน',
          studentGrade: student?.grade,
          studentRoom: student?.room
        })
      }

      res.status(200).send({
        success: true,
        appeals,
        count: appeals.length
      })
    } catch (error) {
      console.error('Error getting pending appeals:', error)
      res.status(500).send({ error: error.message })
    }
  })
})
