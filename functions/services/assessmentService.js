/**
 * 📊 Assessment Service Module
 * 
 * Core assessment logic extracted from index.js
 * Handles HOTS assessment with OpenAI
 */

const { createAssessmentPrompt } = require('../utils/prompts')
const { cleanAIResponse, safeParseJSON } = require('../utils/aiParser')
const { validateAssessmentSchema, getFallbackAssessment } = require('../utils/reliability')
const { assessLearningOutcomes, updateStudentLOProgress } = require('../utils/loAssessment')
const { comprehensiveAIDetection } = require('../utils/aiDetection')

/**
 * AI Configuration for assessments
 */
const AI_CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  temperature: 0,      // Phase 2: Deterministic scoring
  seed: 42,            // Phase 2: Reproducibility
  maxTokens: 1500,
  maxRetries: 2
}

/**
 * Perform HOTS assessment on student answer
 * @param {Object} openai - OpenAI client
 * @param {Object} params - Assessment parameters
 * @returns {Object} Assessment result
 */
async function performHOTSAssessment(openai, params) {
  const {
    questionContext,
    studentAnswer,
    gradeLevel,
    subject,
    isScaffolding = false,
    scaffoldingAttempts = 0,
    previousAnswer = null
  } = params

  // Generate prompt
  const prompt = createAssessmentPrompt(questionContext, studentAnswer, {
    isScaffolding,
    scaffoldingAttempts,
    previousAnswer,
    gradeLevel,
    subject
  })

  let lastError = null
  let parseAttempts = 0

  // Retry loop for robustness
  for (let attempt = 0; attempt < AI_CONFIG.maxRetries; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational assessor for Higher-Order Thinking Skills (HOTS). Always respond with valid JSON only, no markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: AI_CONFIG.temperature,
        seed: AI_CONFIG.seed,
        max_tokens: AI_CONFIG.maxTokens
      })

      const responseText = completion.choices[0].message.content
      parseAttempts++

      // Clean and parse response
      const cleanedText = cleanAIResponse(responseText)
      const parseResult = safeParseJSON(cleanedText, null)

      if (!parseResult.success) {
        console.warn(`Attempt ${attempt + 1}: JSON parse failed`, parseResult.error)
        lastError = parseResult.error
        continue
      }

      const result = parseResult.data

      // Validate schema
      const validation = validateAssessmentSchema(result)
      if (!validation.isValid) {
        console.warn(`Attempt ${attempt + 1}: Schema validation failed`, validation.errors)
        lastError = validation.errors.join(', ')
        continue
      }

      // Calculate overall score
      const rubricScores = result.rubricScores
      const overallScore = (rubricScores.analysis || 0) + 
                          (rubricScores.reasoning || 0) + 
                          (rubricScores.creativity || 0) + 
                          (rubricScores.evidence || 0)

      // Build audit trail
      const auditTrail = {
        modelUsed: AI_CONFIG.model,
        temperature: AI_CONFIG.temperature,
        seed: AI_CONFIG.seed,
        maxTokens: AI_CONFIG.maxTokens,
        rawResponseLength: responseText.length,
        parseAttempts,
        timestamp: new Date().toISOString()
      }

      return {
        success: true,
        data: {
          ...result,
          overallScore,
          promptVersion: 'v3.0-cot-confidence',
          auditTrail
        }
      }

    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error.message)
      lastError = error.message
    }
  }

  // All retries failed - return fallback
  console.error('All assessment attempts failed, using fallback')
  return {
    success: false,
    error: lastError,
    data: getFallbackAssessment('Assessment failed after retries')
  }
}

/**
 * Complete assessment flow including LO assessment
 * @param {Object} deps - Dependencies (openai, db, admin)
 * @param {Object} params - Assessment parameters
 * @returns {Object} Complete assessment result
 */
async function performCompleteAssessment(deps, params) {
  const { openai, db, admin } = deps
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
    subject,
    isScaffolding,
    scaffoldingAttempts,
    previousAnswer
  } = params

  // Step 1: Perform HOTS assessment
  const hotsResult = await performHOTSAssessment(openai, {
    questionContext,
    studentAnswer,
    gradeLevel,
    subject,
    isScaffolding,
    scaffoldingAttempts,
    previousAnswer
  })

  if (!hotsResult.success) {
    return hotsResult
  }

  const assessmentData = hotsResult.data

  // Step 2: AI Detection (if typing fingerprint provided)
  if (typingFingerprint) {
    try {
      const aiDetection = comprehensiveAIDetection(studentAnswer, typingFingerprint)
      assessmentData.aiDetection = {
        isLikelyAI: aiDetection.isLikelyAI,
        confidence: aiDetection.confidence,
        signals: aiDetection.signals?.slice(0, 3) // Top 3 signals
      }
    } catch (err) {
      console.warn('AI detection failed:', err.message)
    }
  }

  // Step 3: LO Assessment (if learning outcomes provided)
  if (learningOutcomes && learningOutcomes.length > 0) {
    const loResult = await assessLearningOutcomes(
      openai,
      studentAnswer,
      learningOutcomes,
      assessmentData,
      { model: AI_CONFIG.model }
    )
    assessmentData.loAssessment = loResult

    // Update student progress
    if (courseId && loResult.passedLOs.length > 0) {
      try {
        await updateStudentLOProgress(
          db,
          admin,
          studentId,
          courseId,
          loResult.passedLOs,
          {
            questionId,
            rubricScores: assessmentData.rubricScores,
            questionData: { relatedLOs: learningOutcomes.map(lo => lo.loCode || lo.code) }
          }
        )
      } catch (err) {
        console.error('Failed to update LO progress:', err)
      }
    }
  }

  return {
    success: true,
    data: assessmentData
  }
}

module.exports = {
  AI_CONFIG,
  performHOTSAssessment,
  performCompleteAssessment
}
