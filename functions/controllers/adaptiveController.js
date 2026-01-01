/**
 * Adaptive Learning Controller
 * Handles personalized learning paths and adaptive assessments
 * 
 * Functions:
 * - generateAdaptivePath: Generate personalized learning path based on weak LOs
 * - updateAdaptivePath: Update progress on adaptive learning path steps
 */

const functions = require('firebase-functions')
const { getDb, admin, FieldValue } = require('../shared/firebase')
const cors = require('cors')({ origin: true })

/**
 * Generate Adaptive Learning Path for student
 * Analyzes weak LOs and creates personalized learning sequence
 * POST { studentId, courseId }
 */
const generateAdaptivePath = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const db = getDb()
      const { studentId, courseId } = req.body

      if (!studentId || !courseId) {
        return res.status(400).send({ 
          error: 'Missing required fields: studentId, courseId' 
        })
      }

      // Get student progress - USE REAL ASSESSMENT DATA
      const progressRef = db.collection('studentProgress').doc(`${studentId}_${courseId}`)
      const progressDoc = await progressRef.get()
      
      if (!progressDoc.exists) {
        return res.status(404).send({ error: 'Student progress not found' })
      }
      
      // 🔧 GET ACTUAL PASSED LOs FROM ASSESSMENTS (not cached data)
      const assessmentsSnapshot = await db.collection('assessments')
        .where('studentId', '==', studentId)
        .where('courseId', '==', courseId)
        .get()
      
      // Count real passed LOs
      const realPassedLOsSet = new Set()
      assessmentsSnapshot.docs.forEach(doc => {
        const assessment = doc.data()
        if (assessment.loAssessment?.passedLOs) {
          assessment.loAssessment.passedLOs.forEach(lo => realPassedLOsSet.add(lo))
        }
      })
      
      const passedLOs = Array.from(realPassedLOsSet)
      
      // Get course and all LOs
      const courseDoc = await db.collection('courses').doc(courseId).get()
      if (!courseDoc.exists) {
        return res.status(404).send({ error: 'Course not found' })
      }
      
      const courseData = courseDoc.data()
      const allLOs = courseData.learningOutcomes || []
      
      // 🔍 Debug logging - NOW USING REAL DATA
      console.log('📊 Adaptive Path Debug (REAL DATA):', {
        studentId,
        courseId,
        allLOs: allLOs.map(lo => lo.code || lo),
        realPassedLOs: passedLOs,
        realPassedLOsCount: passedLOs.length,
        allLOsStructure: allLOs.length > 0 ? allLOs[0] : 'empty'
      })
      
      // Identify weak LOs (not passed yet) - NOW USING REAL DATA
      // Handle both string array and object array formats
      const weakLOs = allLOs.filter(lo => {
        const loCode = typeof lo === 'string' ? lo : lo.code
        const isPassed = passedLOs.includes(loCode)
        console.log(`  LO ${loCode}: passed=${isPassed} (from real assessments)`)
        return !isPassed
      })
      
      console.log('🎯 Weak LOs found:', weakLOs.map(lo => typeof lo === 'string' ? lo : lo.code))
      
      if (weakLOs.length === 0) {
        return res.status(200).send({
          success: true,
          message: 'All Learning Outcomes mastered!',
          pathSteps: []
        })
      }
      
      // 🔧 Normalize weak LOs to object format {code, description}
      const normalizedWeakLOs = weakLOs.map(lo => {
        if (typeof lo === 'string') {
          // Find description from allLOs
          const fullLO = allLOs.find(l => (typeof l === 'string' ? l : l.code) === lo)
          return {
            code: lo,
            description: typeof fullLO === 'object' ? fullLO.description : `Learning Outcome ${lo}`
          }
        }
        return lo
      })
      
      // Get student's historical performance on each weak LO  
      const historicalAssessments = await db.collection('assessments')
        .where('studentId', '==', studentId)
        .where('courseId', '==', courseId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get()
      
      const loPerformance = {}
      normalizedWeakLOs.forEach(lo => {
        loPerformance[lo.code] = {
          attempts: 0,
          avgScore: 0,
          scores: []
        }
      })
      
      historicalAssessments.forEach(doc => {
        const assessment = doc.data()
        const loAssessment = assessment.loAssessment || {}
        const passedInThisAssessment = loAssessment.passedLOs || []
        const totalScore = assessment.totalScore || 0
        
        normalizedWeakLOs.forEach(lo => {
          if (assessment.relatedLOs && assessment.relatedLOs.includes(lo.code)) {
            loPerformance[lo.code].attempts++
            loPerformance[lo.code].scores.push(totalScore)
          }
        })
      })
      
      // Calculate average scores
      Object.keys(loPerformance).forEach(loCode => {
        const perf = loPerformance[loCode]
        if (perf.scores.length > 0) {
          perf.avgScore = perf.scores.reduce((a, b) => a + b, 0) / perf.scores.length
        }
      })
      
      // Sort weak LOs by priority (lowest avg score first, then by attempts)
      const prioritizedLOs = normalizedWeakLOs.sort((a, b) => {
        const perfA = loPerformance[a.code]
        const perfB = loPerformance[b.code]
        
        if (perfA.avgScore !== perfB.avgScore) {
          return perfA.avgScore - perfB.avgScore
        }
        return perfB.attempts - perfA.attempts // More attempts = higher priority
      })
      
      // Take top 3 weakest LOs
      const targetLOs = prioritizedLOs.slice(0, 3)
      
      console.log('🎯 Target LOs for adaptive path:', targetLOs.map(lo => lo.code))
      
      // Generate learning path for each target LO
      const pathSteps = []
      
      for (const lo of targetLOs) {
        const perf = loPerformance[lo.code]
        
        // Step 1: Micro-lesson (if available)
        const microLessonsSnapshot = await db.collection('microLessons')
          .where('courseId', '==', courseId)
          .where('relatedLOs', 'array-contains', lo.code)
          .limit(1)
          .get()
        
        if (!microLessonsSnapshot.empty) {
          const lesson = microLessonsSnapshot.docs[0].data()
          pathSteps.push({
            type: 'micro-lesson',
            loCode: lo.code,
            loDescription: lo.description,
            lessonId: microLessonsSnapshot.docs[0].id,
            title: lesson.title,
            content: lesson.content,
            estimatedMinutes: lesson.estimatedMinutes || 5,
            completed: false
          })
        }
        
        // Step 2: Easy question (difficulty 1-2)
        pathSteps.push({
          type: 'question-easy',
          loCode: lo.code,
          loDescription: lo.description,
          difficulty: perf.attempts === 0 ? 1 : 2,
          questionType: 'Analysis',
          completed: false
        })
        
        // Step 3: Micro-lesson (if available)
        pathSteps.push({
          type: 'micro-lesson',
          loCode: lo.code,
          loDescription: lo.description,
          completed: false
        })
        
        // Step 4: Challenge question (difficulty 3-4)
        pathSteps.push({
          type: 'question-hard',
          loCode: lo.code,
          loDescription: lo.description,
          difficulty: 3,
          questionType: 'Analysis',
          completed: false
        })
      }
      
      // Save path to Firestore
      const pathId = `path_${studentId}_${Date.now()}`
      await db.collection('learningPaths').doc(pathId).set({
        studentId,
        courseId,
        targetLOs: targetLOs.map(lo => lo.code),
        steps: pathSteps,
        status: 'active',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })
      
      return res.status(200).send({
        success: true,
        pathId,
        targetLOs: targetLOs.map(lo => ({
          code: lo.code,
          description: lo.description,
          performance: loPerformance[lo.code]
        })),
        pathSteps,
        message: `Created adaptive learning path with ${pathSteps.length} steps targeting ${targetLOs.length} Learning Outcomes`
      })
    } catch (error) {
      console.error('Error generating adaptive path:', error)
      return res.status(500).send({
        success: false,
        error: error.message
      })
    }
  })
})

/**
 * Update Adaptive Learning Path step completion
 * POST { pathId, stepIndex, completed }
 */
const updateAdaptivePath = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const db = getDb()
      const { pathId, stepIndex, completed } = req.body

      if (!pathId || stepIndex === undefined) {
        return res.status(400).send({ 
          error: 'Missing required fields: pathId, stepIndex' 
        })
      }

      const pathRef = db.collection('learningPaths').doc(pathId)
      const pathDoc = await pathRef.get()

      if (!pathDoc.exists) {
        return res.status(404).send({ error: 'Learning path not found' })
      }

      const pathData = pathDoc.data()
      const steps = pathData.steps || []

      if (stepIndex < 0 || stepIndex >= steps.length) {
        return res.status(400).send({ error: 'Invalid step index' })
      }

      // Update step completion
      steps[stepIndex].completed = completed
      steps[stepIndex].completedAt = completed ? FieldValue.serverTimestamp() : null

      // Check if all steps completed
      const allCompleted = steps.every(s => s.completed)
      const newStatus = allCompleted ? 'completed' : 'active'

      await pathRef.update({
        steps,
        status: newStatus,
        updatedAt: FieldValue.serverTimestamp(),
        ...(allCompleted && { completedAt: FieldValue.serverTimestamp() })
      })

      return res.status(200).send({
        success: true,
        status: newStatus,
        completedSteps: steps.filter(s => s.completed).length,
        totalSteps: steps.length
      })
    } catch (error) {
      console.error('Error updating adaptive path:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

module.exports = {
  generateAdaptivePath,
  updateAdaptivePath
}
