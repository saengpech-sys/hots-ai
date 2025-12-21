const { cleanAIResponse, safeParseJSON, validateRubricScores } = require('./aiParser')

/**
 * 🛡️ HOTS AI Reliability Module
 * 
 * ระบบเพิ่มความน่าเชื่อถือให้ได้ 95%+
 * 
 * Components:
 * 1. Schema Validation - ตรวจสอบโครงสร้าง AI response
 * 2. Retry Mechanism - retry พร้อม exponential backoff
 * 3. Fallback Handler - กรณี AI fail
 * 4. Health Check - ตรวจสอบสถานะระบบ
 * 5. Error Recovery - กู้คืนจาก errors
 */

/**
 * 📝 Assessment Response Schema
 * ใช้ validate AI response ก่อน process
 */
const ASSESSMENT_SCHEMA = {
  required: ['feedback', 'rubricScores'],
  rubricScores: {
    required: ['analysis', 'reasoning', 'creativity', 'evidence'],
    type: 'number',
    min: 0,
    max: 5
  },
  optional: ['suggestions', 'strengths', 'weaknesses', 'loAssessment', 'probingQuestion', 
             'confidence', 'confidenceReason', 'chainOfThought']
}

/**
 * ✅ Validate AI Assessment Response with detailed errors
 * @param {Object} response - AI response to validate
 * @returns {Object} { isValid, errors, warnings, sanitized }
 */
function validateAssessmentSchema(response) {
  const result = {
    isValid: true,
    errors: [],
    warnings: [],
    sanitized: null
  }

  // Check if response exists
  if (!response || typeof response !== 'object') {
    result.isValid = false
    result.errors.push('Response is not an object')
    return result
  }

  // Check required fields
  for (const field of ASSESSMENT_SCHEMA.required) {
    if (!(field in response)) {
      result.isValid = false
      result.errors.push(`Missing required field: ${field}`)
    }
  }

  // Validate rubricScores
  if (response.rubricScores) {
    const scores = response.rubricScores
    
    for (const dim of ASSESSMENT_SCHEMA.rubricScores.required) {
      if (!(dim in scores)) {
        result.isValid = false
        result.errors.push(`Missing rubricScores.${dim}`)
      } else {
        const score = scores[dim]
        
        // Check type
        if (typeof score !== 'number') {
          // Try to convert
          const parsed = parseFloat(score)
          if (isNaN(parsed)) {
            result.isValid = false
            result.errors.push(`rubricScores.${dim} is not a number: ${score}`)
          } else {
            result.warnings.push(`rubricScores.${dim} converted from ${typeof score} to number`)
            scores[dim] = parsed
          }
        }
        
        // Check bounds
        if (typeof scores[dim] === 'number') {
          if (scores[dim] < ASSESSMENT_SCHEMA.rubricScores.min) {
            result.warnings.push(`rubricScores.${dim} clamped from ${scores[dim]} to 0`)
            scores[dim] = 0
          }
          if (scores[dim] > ASSESSMENT_SCHEMA.rubricScores.max) {
            result.warnings.push(`rubricScores.${dim} clamped from ${scores[dim]} to 5`)
            scores[dim] = 5
          }
          // Round to 1 decimal place
          scores[dim] = Math.round(scores[dim] * 10) / 10
        }
      }
    }
  }

  // Validate feedback
  if (response.feedback) {
    if (typeof response.feedback !== 'string') {
      result.isValid = false
      result.errors.push('feedback is not a string')
    } else if (response.feedback.length < 10) {
      result.warnings.push('feedback is very short')
    }
  }

  // Validate optional arrays
  const arrayFields = ['suggestions', 'strengths', 'weaknesses']
  for (const field of arrayFields) {
    if (field in response && !Array.isArray(response[field])) {
      result.warnings.push(`${field} converted to array`)
      response[field] = response[field] ? [String(response[field])] : []
    }
  }

  // Validate loAssessment if present
  if (response.loAssessment) {
    if (!Array.isArray(response.loAssessment.passedLOs)) {
      result.warnings.push('loAssessment.passedLOs converted to array')
      response.loAssessment.passedLOs = []
    }
  }

  // Validate confidence if present
  if ('confidence' in response) {
    const conf = parseFloat(response.confidence)
    if (isNaN(conf)) {
      result.warnings.push('confidence is not a number, set to null')
      response.confidence = null
    } else {
      response.confidence = Math.min(100, Math.max(0, conf))
    }
  }

  // Create sanitized response
  if (result.isValid || result.errors.length === 0) {
    result.sanitized = {
      feedback: response.feedback || '',
      rubricScores: {
        analysis: response.rubricScores?.analysis ?? 0,
        reasoning: response.rubricScores?.reasoning ?? 0,
        creativity: response.rubricScores?.creativity ?? 0,
        evidence: response.rubricScores?.evidence ?? 0
      },
      suggestions: response.suggestions || [],
      strengths: response.strengths || [],
      weaknesses: response.weaknesses || [],
      loAssessment: response.loAssessment || null,
      probingQuestion: response.probingQuestion || null,
      confidence: response.confidence ?? null,
      confidenceReason: response.confidenceReason || null,
      chainOfThought: response.chainOfThought || null
    }
  }

  return result
}

/**
 * 🔄 Retry Configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT', 
    'ENOTFOUND',
    'EAI_AGAIN',
    'rate_limit_exceeded',
    '429',
    '500',
    '502',
    '503',
    '504'
  ]
}

/**
 * 🔄 Execute with Retry and Exponential Backoff
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @returns {Object} { success, result, attempts, errors }
 */
async function executeWithRetry(fn, options = {}) {
  const config = { ...RETRY_CONFIG, ...options }
  const errors = []
  let lastResult = null
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await fn()
      return {
        success: true,
        result,
        attempts: attempt,
        errors: errors.length > 0 ? errors : null
      }
    } catch (error) {
      const errorInfo = {
        attempt,
        message: error.message,
        code: error.code || error.status || 'UNKNOWN',
        timestamp: new Date().toISOString()
      }
      errors.push(errorInfo)
      
      console.error(`Attempt ${attempt}/${config.maxRetries} failed:`, error.message)
      
      // Check if error is retryable
      const isRetryable = config.retryableErrors.some(code => 
        error.message?.includes(code) || 
        error.code?.includes(code) ||
        String(error.status) === code
      )
      
      if (!isRetryable) {
        console.error('Error is not retryable, stopping')
        break
      }
      
      // Calculate delay with exponential backoff
      if (attempt < config.maxRetries) {
        const delay = Math.min(
          config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelayMs
        )
        console.log(`Waiting ${delay}ms before retry...`)
        await sleep(delay)
      }
      
      lastResult = error
    }
  }
  
  return {
    success: false,
    result: lastResult,
    attempts: errors.length,
    errors
  }
}

/**
 * 🆘 Fallback Assessment (when AI completely fails)
 * ใช้เมื่อ AI ไม่สามารถประเมินได้
 */
function getFallbackAssessment(studentAnswer, reason = 'AI service unavailable') {
  // Simple heuristic-based scoring as fallback
  const wordCount = studentAnswer.split(/\s+/).filter(w => w.length > 0).length
  const charCount = studentAnswer.length
  const hasNumbers = /\d/.test(studentAnswer)
  const hasBullets = /[•\-\d\.]/.test(studentAnswer)
  
  // Very basic scoring based on length and structure
  let baseScore = 1 // Minimum for submitting something
  
  if (wordCount >= 20) baseScore += 0.5
  if (wordCount >= 50) baseScore += 0.5
  if (charCount >= 100) baseScore += 0.5
  if (hasNumbers) baseScore += 0.25
  if (hasBullets) baseScore += 0.25
  
  baseScore = Math.min(2.5, baseScore) // Cap at 2.5 for fallback
  
  return {
    feedback: `⚠️ **ระบบประเมินชั่วคราว**\n\nขออภัย ระบบ AI ไม่สามารถประเมินคำตอบของคุณได้ในขณะนี้ (${reason})\n\nระบบได้ให้คะแนนเบื้องต้นตามความยาวและโครงสร้างของคำตอบ กรุณาลองส่งคำตอบใหม่อีกครั้งในภายหลังเพื่อรับ feedback ที่ละเอียดขึ้น`,
    rubricScores: {
      analysis: baseScore,
      reasoning: baseScore,
      creativity: baseScore,
      evidence: baseScore
    },
    suggestions: [
      'กรุณาลองส่งคำตอบใหม่อีกครั้งในภายหลัง',
      'หากปัญหายังคงอยู่ โปรดติดต่อครูผู้สอน'
    ],
    strengths: [],
    weaknesses: [],
    loAssessment: null,
    isFallback: true,
    fallbackReason: reason,
    confidence: 0,
    confidenceReason: 'Fallback scoring - AI unavailable'
  }
}

/**
 * 🏥 System Health Check
 * ตรวจสอบสถานะของ dependencies
 */
async function checkSystemHealth(openai, db) {
  const health = {
    timestamp: new Date().toISOString(),
    overall: 'healthy',
    components: {}
  }
  
  // Check OpenAI
  try {
    if (openai) {
      // Simple model list call to verify API
      await openai.models.list({ limit: 1 })
      health.components.openai = { status: 'healthy', latencyMs: 0 }
    } else {
      health.components.openai = { status: 'not_configured' }
      health.overall = 'degraded'
    }
  } catch (error) {
    health.components.openai = { 
      status: 'unhealthy', 
      error: error.message 
    }
    health.overall = 'degraded'
  }
  
  // Check Firestore
  try {
    const testRef = db.collection('_healthCheck').doc('test')
    await testRef.set({ timestamp: new Date() })
    await testRef.get()
    health.components.firestore = { status: 'healthy' }
  } catch (error) {
    health.components.firestore = { 
      status: 'unhealthy', 
      error: error.message 
    }
    health.overall = 'unhealthy'
  }
  
  return health
}

/**
 * 📊 Parse AI Response with Full Error Recovery
 * @param {string} responseText - Raw AI response
 * @returns {Object} { success, data, errors, usedFallback }
 */
function parseAIResponseSafely(responseText) {
  const result = {
    success: false,
    data: null,
    errors: [],
    warnings: [],
    usedFallback: false
  }
  
  if (!responseText || typeof responseText !== 'string') {
    result.errors.push('Empty or invalid response text')
    return result
  }
  
  // Use aiParser for cleaning and initial parsing
  const parseResult = safeParseJSON(responseText)
  
  if (parseResult.success) {
    // Validate schema
    const validation = validateAssessmentSchema(parseResult.data)
    
    if (validation.isValid) {
      result.success = true
      result.data = validation.sanitized
      result.warnings = [...result.warnings, ...validation.warnings]
    } else {
      result.errors = validation.errors
      result.warnings = [...result.warnings, ...validation.warnings]
    }
  } else {
    result.errors.push(`JSON parse error: ${parseResult.error}`)
    
    // Try to extract scores using regex as last resort
    try {
      // Use cleaned text from aiParser if possible, otherwise raw
      const cleanedText = cleanAIResponse(responseText)
      const extractedScores = extractScoresFromText(cleanedText)
      
      if (extractedScores) {
        result.data = {
          feedback: 'ไม่สามารถอ่าน feedback จาก AI ได้',
          rubricScores: extractedScores,
          suggestions: [],
          strengths: [],
          weaknesses: [],
          loAssessment: null
        }
        result.success = true
        result.usedFallback = true
        result.warnings.push('Used regex extraction for scores')
      }
    } catch (extractError) {
      result.errors.push(`Regex extraction failed: ${extractError.message}`)
    }
  }
  
  return result
}

/**
 * 🔍 Extract scores from text using regex (emergency fallback)
 */
function extractScoresFromText(text) {
  const patterns = {
    analysis: /analysis["\s:]+(\d+(?:\.\d+)?)/i,
    reasoning: /reasoning["\s:]+(\d+(?:\.\d+)?)/i,
    creativity: /creativity["\s:]+(\d+(?:\.\d+)?)/i,
    evidence: /evidence["\s:]+(\d+(?:\.\d+)?)/i
  }
  
  const scores = {}
  let foundAny = false
  
  for (const [dim, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern)
    if (match) {
      scores[dim] = Math.min(5, Math.max(0, parseFloat(match[1])))
      foundAny = true
    } else {
      scores[dim] = 0
    }
  }
  
  return foundAny ? scores : null
}

/**
 * 📝 Log Reliability Event
 */
async function logReliabilityEvent(db, event) {
  try {
    await db.collection('reliabilityLogs').add({
      ...event,
      timestamp: require('firebase-admin').firestore.FieldValue.serverTimestamp()
    })
  } catch (error) {
    console.error('Failed to log reliability event:', error)
  }
}

/**
 * 💤 Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 🔢 Calculate Reliability Score
 * ใช้วัดความน่าเชื่อถือของ assessment
 */
function calculateReliabilityScore(assessmentResult, parseResult, retryAttempts) {
  let score = 100
  
  // Deduct for parse errors
  if (parseResult.errors?.length > 0) {
    score -= parseResult.errors.length * 10
  }
  
  // Deduct for warnings
  if (parseResult.warnings?.length > 0) {
    score -= parseResult.warnings.length * 2
  }
  
  // Deduct for retry attempts
  if (retryAttempts > 1) {
    score -= (retryAttempts - 1) * 5
  }
  
  // Deduct if used fallback
  if (parseResult.usedFallback) {
    score -= 30
  }
  
  // Deduct if low AI confidence
  if (assessmentResult?.confidence !== null && assessmentResult?.confidence < 50) {
    score -= 10
  }
  
  // Deduct if fallback assessment
  if (assessmentResult?.isFallback) {
    score -= 50
  }
  
  return Math.max(0, Math.min(100, score))
}

module.exports = {
  validateAssessmentSchema,
  executeWithRetry,
  getFallbackAssessment,
  checkSystemHealth,
  parseAIResponseSafely,
  extractScoresFromText,
  logReliabilityEvent,
  calculateReliabilityScore,
  sleep,
  ASSESSMENT_SCHEMA,
  RETRY_CONFIG
}
