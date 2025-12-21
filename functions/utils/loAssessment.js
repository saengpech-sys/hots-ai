/**
 * 🎓 Learning Outcomes Assessment Module
 * 
 * ประเมิน LO ที่นักเรียนผ่านจากคำตอบ
 */

const { createLOAssessmentPrompt, LO_ASSESSMENT_SYSTEM_MESSAGE } = require('./prompts')
const { cleanAIResponse, safeParseJSON } = require('./aiParser')

/**
 * Assess which Learning Outcomes were demonstrated in student's answer
 * @param {Object} openai - OpenAI client instance
 * @param {string} studentAnswer - The student's answer text
 * @param {Array} learningOutcomes - Array of LO objects with loCode and loDescription
 * @param {Object} assessmentResult - The HOTS assessment result
 * @param {Object} options - Configuration options
 * @returns {Object} { passedLOs: [], analysis: string }
 */
async function assessLearningOutcomes(openai, studentAnswer, learningOutcomes, assessmentResult, options = {}) {
  const { model = 'gpt-4o-mini' } = options
  
  try {
    if (!openai) {
      console.warn('OpenAI not configured, skipping LO assessment')
      return { passedLOs: [], analysis: 'AI not configured' }
    }

    if (!learningOutcomes || learningOutcomes.length === 0) {
      return { passedLOs: [], analysis: 'No learning outcomes to assess' }
    }

    // 🔍 Debug logging
    console.log('🎓 LO Assessment Input:', {
      learningOutcomesCount: learningOutcomes.length,
      learningOutcomes: learningOutcomes.map(lo => ({
        code: lo.loCode || lo.code,
        description: (lo.loDescription || lo.description || '').substring(0, 50) + '...'
      })),
      rubricScores: assessmentResult.rubricScores
    })

    // Create prompt
    const prompt = createLOAssessmentPrompt(
      studentAnswer,
      learningOutcomes,
      assessmentResult.rubricScores
    )

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: LO_ASSESSMENT_SYSTEM_MESSAGE },
        { role: 'user', content: prompt }
      ],
      temperature: 0,         // Phase 2: Zero temperature for consistent LO scoring
      seed: 42,               // Phase 2: Fixed seed for reproducibility
      max_tokens: 500
    })

    const responseText = completion.choices[0].message.content
    
    // Clean and parse response
    const cleanedText = cleanAIResponse(responseText)
    const parseResult = safeParseJSON(cleanedText, { passedLOs: [], analysis: '' })
    
    if (!parseResult.success) {
      console.error('LO Assessment parse error:', parseResult.error)
      return {
        passedLOs: [],
        analysis: 'ไม่สามารถวิเคราะห์ได้'
      }
    }

    const loResult = parseResult.data

    console.log('✅ LO Assessment Result:', {
      passedLOs: loResult.passedLOs,
      analysisPreview: (loResult.analysis || '').substring(0, 100) + '...'
    })

    return {
      passedLOs: loResult.passedLOs || [],
      analysis: loResult.analysis || 'ไม่สามารถวิเคราะห์ได้'
    }

  } catch (error) {
    console.error('LO Assessment error:', error)
    return {
      passedLOs: [],
      analysis: 'เกิดข้อผิดพลาดในการประเมิน LO'
    }
  }
}

/**
 * Update student's LO progress in Firestore
 * @param {Object} db - Firestore database instance
 * @param {Object} admin - Firebase admin instance
 * @param {string} studentId - Student's ID
 * @param {string} courseId - Course ID
 * @param {Array} passedLOs - Array of LO codes that were passed
 * @param {Object} assessmentData - Assessment data with rubric scores
 * @returns {Object} Updated progress data
 */
async function updateStudentLOProgress(db, admin, studentId, courseId, passedLOs, assessmentData = null) {
  try {
    const progressRef = db.collection('studentProgress').doc(`${studentId}_${courseId}`)
    const progressDoc = await progressRef.get()
    const currentDate = new Date().toISOString()

    if (progressDoc.exists) {
      // Update existing progress
      const currentData = progressDoc.data()
      const currentPassed = currentData.passedLOs || []
      
      // Merge new passed LOs (no duplicates)
      const updatedPassedLOs = [...new Set([...currentPassed, ...passedLOs])]

      // Progressive LO Tracking
      const loProgress = currentData.loProgress || {}
      
      if (assessmentData && assessmentData.questionData && assessmentData.questionData.relatedLOs) {
        const relatedLOs = assessmentData.questionData.relatedLOs
        const rubricScores = assessmentData.rubricScores || {}
        const loConfigs = assessmentData.questionData.loConfigs || []
        const questionId = assessmentData.questionId

        // Dynamic scoring based on question difficulty
        let difficultyMultiplier = 1.0
        if (questionId) {
          try {
            const questionDoc = await db.collection('questions').doc(questionId).get()
            if (questionDoc.exists) {
              const qData = questionDoc.data()
              if (qData.psychometrics && qData.psychometrics.pValue) {
                const p = qData.psychometrics.pValue
                if (p < 0.4) difficultyMultiplier = 0.8      // Hard
                else if (p > 0.8) difficultyMultiplier = 1.2 // Easy
              }
            }
          } catch (err) {
            console.warn('Failed to fetch question psychometrics:', err)
          }
        }

        for (const loCode of relatedLOs) {
          const loConfig = loConfigs.find(c => c.loCode === loCode || c.code === loCode)
          const relatedDimensions = loConfig?.relatedDimensions || ['analysis', 'reasoning', 'creativity', 'evidence']
          
          // Calculate target score
          let targetScore = Math.floor(relatedDimensions.length * 4 * difficultyMultiplier)

          // Initialize if doesn't exist
          if (!loProgress[loCode]) {
            loProgress[loCode] = {
              accumulatedScore: 0,
              targetScore: targetScore,
              attempts: 0,
              isPassed: false,
              lastAttemptDate: currentDate,
              strugglingDimensions: [],
              microLessonsViewed: []
            }
          } else if (difficultyMultiplier !== 1.0) {
            loProgress[loCode].targetScore = targetScore
          }

          const progress = loProgress[loCode]
          progress.attempts++
          progress.lastAttemptDate = currentDate

          // Accumulate scores from relevant dimensions
          let earnedScore = 0
          const struggling = []
          
          relatedDimensions.forEach(dim => {
            const score = rubricScores[dim] || 0
            if (score >= 3) {
              earnedScore += score
            } else {
              struggling.push(dim)
            }
          })

          progress.accumulatedScore += earnedScore
          progress.strugglingDimensions = struggling

          // Check if passed threshold
          if (progress.accumulatedScore >= progress.targetScore && !progress.isPassed) {
            progress.isPassed = true
            if (!updatedPassedLOs.includes(loCode)) {
              updatedPassedLOs.push(loCode)
            }
          }
        }
      }

      // Update progress
      const updateData = {
        passedLOs: updatedPassedLOs,
        totalPassed: updatedPassedLOs.length,
        loProgress: loProgress,
        lastAssessedAt: admin.firestore.FieldValue.serverTimestamp(),
        assessmentCount: admin.firestore.FieldValue.increment(1)
      }

      await progressRef.update(updateData)

      return {
        passedLOs: updatedPassedLOs,
        loProgress,
        isNew: false
      }

    } else {
      // Create new progress document
      const newProgress = {
        studentId,
        courseId,
        passedLOs: passedLOs,
        totalPassed: passedLOs.length,
        loProgress: {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastAssessedAt: admin.firestore.FieldValue.serverTimestamp(),
        assessmentCount: 1
      }

      await progressRef.set(newProgress)

      return {
        passedLOs,
        loProgress: {},
        isNew: true
      }
    }

  } catch (error) {
    console.error('Error updating student LO progress:', error)
    throw error
  }
}

module.exports = {
  assessLearningOutcomes,
  updateStudentLOProgress
}
