/**
 * 🧪 AI Response Parser & Cleaner
 * 
 * ฟังก์ชันสำหรับ clean และ parse AI responses
 * รองรับ markdown wrappers จาก GPT models
 */

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
 * Safely parse AI response with fallback
 * 
 * @param {string} responseText - Raw AI response  
 * @param {Object} fallback - Fallback value if parse fails
 * @returns {{ success: boolean, data: Object|null, error?: string }}
 */
function safeParseJSON(responseText, fallback = null) {
  try {
    const cleaned = cleanAIResponse(responseText)
    const data = JSON.parse(cleaned)
    return { success: true, data }
  } catch (error) {
    console.error('JSON parse error:', error.message)
    console.error('Raw response:', responseText?.substring(0, 500))
    return { 
      success: false, 
      data: fallback, 
      error: error.message 
    }
  }
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
    fallbackReason: reason
  }
}

module.exports = {
  cleanAIResponse,
  safeParseJSON,
  validateRubricScores,
  createFallbackAssessment
}
