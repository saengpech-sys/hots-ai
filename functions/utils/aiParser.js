/**
 * 🧪 AI Response Parser & Cleaner
 * 
 * ฟังก์ชันสำหรับ clean และ parse AI responses
 * รองรับ markdown wrappers จาก GPT models
 * 
 * @version 2.0.0
 * @since 2025-12-23
 * 
 * NEW FEATURES:
 * - Retry mechanism for JSON parse
 * - Tolerance band for score comparison
 * - Enhanced fallback assessment
 */

/**
 * 📊 TOLERANCE BAND CONFIGURATION
 * ใช้เปรียบเทียบ AI scores กับ human scores
 * หรือเปรียบเทียบ scores ข้าม sessions
 */
const SCORE_TOLERANCE = {
  // Individual dimension tolerance (±0.5)
  dimension: 0.5,
  // Total score tolerance (±1.0)
  total: 1.0,
  // AI confidence threshold for flagging
  lowConfidenceThreshold: 70
}

/**
 * Clean markdown wrappers from AI response
 * GPT-4o-mini มักจะ wrap JSON ใน ```json blocks
 * 
 * @param {string} responseText - Raw AI response
 * @returns {string} Cleaned JSON string
 */
function cleanAIResponse(responseText) {
  if (!responseText) return ''
  
  let cleanedText = responseText.trim()
  
  // Remove markdown code blocks
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
    cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
  }
  
  // Handle edge cases
  cleanedText = cleanedText.trim()
  
  // Remove any leading/trailing non-JSON characters
  const jsonStart = cleanedText.indexOf('{')
  const jsonEnd = cleanedText.lastIndexOf('}')
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1)
  }
  
  return cleanedText
}

/**
 * 🔄 Safely parse AI response with retry mechanism
 * 
 * @param {string} responseText - Raw AI response  
 * @param {Object} options - Parse options
 * @param {number} options.maxRetries - Max retry attempts (default: 2)
 * @param {Object} options.fallback - Fallback value if all retries fail
 * @returns {{ success: boolean, data: Object|null, error?: string, attempts: number }}
 */
function safeParseJSON(responseText, options = {}) {
  const { maxRetries = 2, fallback = null } = options
  let lastError = null
  let attempts = 0
  
  for (let i = 0; i <= maxRetries; i++) {
    attempts++
    
    try {
      let textToParse = cleanAIResponse(responseText)
      
      // On retry, try more aggressive cleaning
      if (i > 0) {
        textToParse = aggressiveClean(textToParse, i)
      }
      
      const data = JSON.parse(textToParse)
      return { success: true, data, attempts }
    } catch (error) {
      lastError = error
      console.warn(`JSON parse attempt ${i + 1}/${maxRetries + 1} failed:`, error.message)
    }
  }
  
  // All retries failed
  console.error('All JSON parse attempts failed')
  console.error('Raw response:', responseText?.substring(0, 500))
  
  return { 
    success: false, 
    data: fallback, 
    error: lastError?.message,
    attempts
  }
}

/**
 * More aggressive cleaning for retry attempts
 */
function aggressiveClean(text, attempt) {
  let cleaned = text
  
  if (attempt >= 1) {
    // Remove common problematic characters
    cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Fix common JSON issues
    cleaned = cleaned.replace(/,\s*}/g, '}')
    cleaned = cleaned.replace(/,\s*]/g, ']')
  }
  
  if (attempt >= 2) {
    // Try to extract just the JSON object
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      cleaned = match[0]
    }
  }
  
  return cleaned
}

/**
 * Validate rubric scores structure
 * 
 * @param {Object} scores - Rubric scores object
 * @returns {{ valid: boolean, scores: Object, warnings: string[] }}
 */
function validateRubricScores(scores) {
  const warnings = []
  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  const validatedScores = {}
  
  for (const dim of dimensions) {
    let score = scores?.[dim]
    
    if (score === undefined || score === null) {
      warnings.push(`Missing score for ${dim}, using default 2`)
      score = 2
    } else if (typeof score !== 'number') {
      warnings.push(`Invalid score type for ${dim}, converting`)
      score = Number(score) || 2
    } else if (score < 0 || score > 5) {
      warnings.push(`Score out of range for ${dim}: ${score}, clamping`)
      score = Math.max(0, Math.min(5, score))
    }
    
    validatedScores[dim] = Math.round(score)
  }
  
  return {
    valid: warnings.length === 0,
    scores: validatedScores,
    warnings
  }
}

/**
 * 📊 Compare scores with tolerance band
 * 
 * @param {Object} scores1 - First set of rubric scores
 * @param {Object} scores2 - Second set of rubric scores
 * @param {Object} tolerance - Tolerance configuration
 * @returns {{ match: boolean, details: Object, totalDiff: number }}
 */
function compareScoresWithTolerance(scores1, scores2, tolerance = SCORE_TOLERANCE) {
  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  const details = {}
  let totalDiff = 0
  let allMatch = true
  
  for (const dim of dimensions) {
    const s1 = scores1?.[dim] ?? 0
    const s2 = scores2?.[dim] ?? 0
    const diff = Math.abs(s1 - s2)
    
    details[dim] = {
      score1: s1,
      score2: s2,
      diff,
      withinTolerance: diff <= tolerance.dimension
    }
    
    totalDiff += diff
    
    if (diff > tolerance.dimension) {
      allMatch = false
    }
  }
  
  const total1 = Object.values(scores1 || {}).reduce((a, b) => a + b, 0)
  const total2 = Object.values(scores2 || {}).reduce((a, b) => a + b, 0)
  
  return {
    match: allMatch && totalDiff <= tolerance.total,
    details,
    totalDiff,
    total1,
    total2,
    totalDiffAbsolute: Math.abs(total1 - total2),
    toleranceUsed: tolerance
  }
}

/**
 * Check if score should be flagged for human review
 * 
 * ⚠️ Important: NOT flagged for review:
 * - Gibberish/meaningless answers (auto-scored 0 with high confidence)
 * - Clear high-quality answers (scored high with high confidence)
 * 
 * ✅ Flagged for review:
 * - Low AI confidence (ambiguous answers)
 * - All 5s without chain of thought (potential inflation)
 * - Missing reasoning explanation
 * 
 * @param {Object} assessment - Assessment result with confidence
 * @param {number} aiConfidence - AI confidence score (0-100)
 * @returns {{ shouldFlag: boolean, reasons: string[], priority: string }}
 */
function shouldFlagForReview(assessment, aiConfidence) {
  const reasons = []
  
  // 🆕 Skip review if gibberish was detected (handled separately)
  if (assessment?.gibberishDetection?.isGibberish) {
    return {
      shouldFlag: false,
      reasons: ['Gibberish detected - auto-handled'],
      priority: 'none',
      skipReason: 'gibberish'
    }
  }
  
  // 🆕 Skip review if all zeros WITH high confidence (clear gibberish/empty)
  const scores = assessment?.rubricScores
  if (scores) {
    const values = Object.values(scores)
    const allZero = values.every(v => v === 0)
    const allMax = values.every(v => v === 5)
    
    // All zeros with high confidence = clear low-quality, no need to review
    if (allZero && aiConfidence >= 80) {
      return {
        shouldFlag: false,
        reasons: ['All zeros with high confidence - clear low-quality answer'],
        priority: 'none',
        skipReason: 'clear_low_quality'
      }
    }
    
    // All 5s should be verified (potential inflation)
    if (allMax) {
      reasons.push('All dimensions scored 5 - verify for inflation')
    }
  }
  
  // Low confidence = ambiguous answer, needs human review
  if (aiConfidence < SCORE_TOLERANCE.lowConfidenceThreshold) {
    reasons.push(`Low AI confidence: ${aiConfidence}% (threshold: ${SCORE_TOLERANCE.lowConfidenceThreshold}%)`)
  }
  
  // Missing chain of thought = can't verify reasoning
  if (!assessment?.chainOfThought) {
    reasons.push('Missing chain of thought reasoning')
  }
  
  // 🆕 Suspicious gibberish (not definite) - flag for review
  if (assessment?.gibberishDetection?.isSuspicious) {
    reasons.push(`Suspicious text detected (score: ${assessment.gibberishDetection.score})`)
  }
  
  // Determine priority
  let priority = 'none'
  if (reasons.length > 0) {
    priority = 'normal'
    if (aiConfidence < 50) priority = 'high'
    if (reasons.length >= 3) priority = 'high'
  }
  
  return {
    shouldFlag: reasons.length > 0,
    reasons,
    priority
  }
}

/**
 * Create default/fallback assessment
 * 
 * @param {string} reason - Reason for fallback
 * @returns {Object} Default assessment structure
 */
function createFallbackAssessment(reason = 'Unknown error') {
  return {
    rubricScores: {
      analysis: 2,
      reasoning: 2,
      creativity: 2,
      evidence: 2
    },
    feedback: `ขออภัย ระบบไม่สามารถประเมินคำตอบได้ในขณะนี้ (${reason}) กรุณาลองใหม่อีกครั้ง`,
    isFallback: true,
    fallbackReason: reason,
    requiresHumanReview: true,
    chainOfThought: {
      step1_summary: 'ไม่สามารถประเมินได้',
      step2_evidence: {
        analysis: 'N/A - Fallback mode',
        reasoning: 'N/A - Fallback mode',
        creativity: 'N/A - Fallback mode',
        evidence: 'N/A - Fallback mode'
      },
      step3_anchor_match: 'ใช้คะแนนกลาง (2) เนื่องจากระบบไม่สามารถประเมินได้',
      step4_decision: reason
    },
    confidence: 0,
    confidenceReason: 'Fallback assessment - requires human review'
  }
}

module.exports = {
  cleanAIResponse,
  safeParseJSON,
  validateRubricScores,
  compareScoresWithTolerance,
  shouldFlagForReview,
  createFallbackAssessment,
  SCORE_TOLERANCE
}
