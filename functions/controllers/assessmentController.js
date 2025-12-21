/**
 * 📝 Assessment Controller
 * 
 * HTTP handler for student answer assessment
 * Cleaned up and modularized version
 */

const admin = require('firebase-admin')
const { checkIPRateLimit, checkUserRateLimit } = require('../utils/rateLimiter')
const { comprehensiveAIDetection } = require('../utils/aiDetection')
const { getFallbackAssessment } = require('../utils/reliability')
const { performCompleteAssessment } = require('../services/assessmentService')
const { calculatePoints, checkBadges, calculateStreak } = require('../gamification')

/**
 * Handle assessment request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} deps - Dependencies { db, openai }
 */
async function handleAssessment(req, res, deps) {
  const { db, openai } = deps
  
  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return res.status(405).send({ error: 'Method not allowed' })
    }

    const { 
      studentId, 
      sessionId, 
      courseId, 
      questionId, 
      questionContext, 
      studentAnswer, 
      learningOutcomes, 
      typingFingerprint,
      gradeLevel,
      subject
    } = req.body

    // Validate required fields
    if (!studentId || !sessionId || !studentAnswer) {
      return res.status(400).send({ 
        error: 'Missing required fields: studentId, sessionId, studentAnswer' 
      })
    }

    // 🚦 Rate Limiting
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip
    const ipRateResult = checkIPRateLimit(ip, 'assessment')
    if (!ipRateResult.allowed) {
      console.warn(`🚨 IP rate limit exceeded: ${ip}`)
      return res.status(429).send({
        error: 'Too Many Requests',
        message: 'คุณส่งคำขอเร็วเกินไป กรุณารอสักครู่',
        retryAfter: 60
      })
    }

    const userRateResult = await checkUserRateLimit(db, studentId, 'assessment')
    if (!userRateResult.allowed) {
      return res.status(429).send({
        error: 'Rate Limit Exceeded',
        message: userRateResult.error || 'คุณส่งคำตอบเร็วเกินไป กรุณารอ 5 นาที',
        remaining: userRateResult.remaining,
        resetAt: userRateResult.resetAt
      })
    }

    // Check OpenAI configuration
    if (!openai) {
      return res.status(500).send({
        error: 'OpenAI API not configured',
        message: 'Please set OPENAI_API_KEY environment variable'
      })
    }

    // 🔍 AI Content Detection (warning only)
    if (typingFingerprint) {
      const aiDetection = comprehensiveAIDetection(studentAnswer, typingFingerprint)
      if (aiDetection.isLikelyAI && aiDetection.confidence > 0.7) {
        // Log but don't block - just warn
        await db.collection('aiDetectionLogs').add({
          studentId,
          sessionId,
          confidence: aiDetection.confidence,
          signals: aiDetection.signals,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
      }
    }

    // Get session data for scaffolding context
    const sessionRef = db.collection('sessions').doc(sessionId)
    const sessionDoc = await sessionRef.get()
    const sessionData = sessionDoc.data() || {}

    // Perform complete assessment
    const result = await performCompleteAssessment(
      { openai, db, admin },
      {
        studentId,
        sessionId,
        courseId,
        questionId,
        questionContext,
        studentAnswer,
        learningOutcomes,
        typingFingerprint,
        gradeLevel,
        subject,
        isScaffolding: sessionData.isScaffolding || false,
        scaffoldingAttempts: sessionData.scaffoldingAttempts || 0,
        previousAnswer: sessionData.previousAnswer || null
      }
    )

    if (!result.success) {
      // Use fallback and log error
      console.error('Assessment failed:', result.error)
      const fallbackData = getFallbackAssessment('Assessment service error')
      
      const assessmentRef = await db.collection('assessments').add({
        sessionId,
        studentId,
        courseId: courseId || null,
        questionId: questionId || null,
        ...fallbackData,
        isFallback: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })

      return res.status(200).json({
        success: true,
        id: assessmentRef.id,
        result: fallbackData,
        warning: 'Used fallback scoring due to service issue'
      })
    }

    const assessmentData = result.data

    // Calculate gamification
    const pointsEarned = calculatePoints(assessmentData)
    const newBadges = await checkBadgesForStudent(db, studentId, assessmentData)

    // Save assessment to Firestore
    const assessmentDoc = {
      sessionId,
      studentId,
      courseId: courseId || null,
      questionId: questionId || null,
      questionContext: questionContext || 'General HOTS Assessment',
      rawAnswer: studentAnswer,
      rubricScores: assessmentData.rubricScores,
      overallScore: assessmentData.overallScore,
      feedbackText: assessmentData.feedback,
      strengths: assessmentData.strengths || [],
      weaknesses: assessmentData.weaknesses || [],
      suggestions: assessmentData.suggestions || [],
      chainOfThought: assessmentData.chainOfThought || null,
      confidence: assessmentData.confidence || null,
      confidenceReason: assessmentData.confidenceReason || null,
      loAssessment: assessmentData.loAssessment || null,
      aiDetection: assessmentData.aiDetection || null,
      gamification: {
        pointsEarned,
        newBadges
      },
      promptVersion: assessmentData.promptVersion,
      auditTrail: assessmentData.auditTrail,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }

    const assessmentRef = await db.collection('assessments').add(assessmentDoc)

    // Handle scaffolding (probing question for low scores)
    if (assessmentData.probingQuestion && assessmentData.overallScore < 10) {
      await sessionRef.update({
        isScaffolding: true,
        scaffoldingAttempts: (sessionData.scaffoldingAttempts || 0) + 1,
        previousAnswer: studentAnswer,
        probingQuestion: assessmentData.probingQuestion
      })
    }

    // Update student progress
    if (courseId) {
      await updateStudentProgressWithGamification(
        db,
        studentId,
        courseId,
        assessmentData,
        pointsEarned
      )
    }

    return res.status(200).json({
      success: true,
      id: assessmentRef.id,
      result: assessmentDoc
    })

  } catch (error) {
    console.error('Assessment controller error:', error)
    return res.status(500).send({
      error: 'Internal server error',
      message: error.message
    })
  }
}

/**
 * Check badges for student after assessment
 */
async function checkBadgesForStudent(db, studentId, assessmentData) {
  try {
    const userRef = db.collection('users').doc(studentId)
    const userDoc = await userRef.get()
    const userData = userDoc.data() || {}
    
    const currentBadges = userData.badges || []
    const newBadges = checkBadges(assessmentData, {
      totalAssessments: userData.totalAssessments || 0,
      currentStreak: userData.currentStreak || 0,
      totalPoints: userData.totalPoints || 0,
      badges: currentBadges
    })

    if (newBadges.length > 0) {
      await userRef.update({
        badges: admin.firestore.FieldValue.arrayUnion(...newBadges),
        lastBadgeEarned: newBadges[newBadges.length - 1],
        lastBadgeEarnedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }

    return newBadges
  } catch (error) {
    console.error('Error checking badges:', error)
    return []
  }
}

/**
 * Update student progress with gamification data
 */
async function updateStudentProgressWithGamification(db, studentId, courseId, assessmentData, pointsEarned) {
  try {
    const progressRef = db.collection('studentProgress').doc(`${studentId}_${courseId}`)
    const progressDoc = await progressRef.get()
    const currentDate = new Date().toISOString()

    const baseUpdate = {
      lastAssessedAt: admin.firestore.FieldValue.serverTimestamp(),
      assessmentCount: admin.firestore.FieldValue.increment(1),
      totalPoints: admin.firestore.FieldValue.increment(pointsEarned)
    }

    if (progressDoc.exists) {
      const currentData = progressDoc.data()
      
      // Calculate streak
      const streakUpdate = calculateStreak(currentData.lastActiveDate, currentDate)
      if (streakUpdate?.increment) {
        baseUpdate.currentStreak = admin.firestore.FieldValue.increment(1)
        baseUpdate.lastActiveDate = currentDate
        if (currentData.currentStreak + 1 > (currentData.maxStreak || 0)) {
          baseUpdate.maxStreak = currentData.currentStreak + 1
        }
      }

      await progressRef.update(baseUpdate)
    } else {
      await progressRef.set({
        studentId,
        courseId,
        passedLOs: [],
        totalPassed: 0,
        loProgress: {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        ...baseUpdate,
        currentStreak: 1,
        maxStreak: 1,
        lastActiveDate: currentDate
      })
    }
  } catch (error) {
    console.error('Error updating student progress:', error)
  }
}

module.exports = {
  handleAssessment
}
