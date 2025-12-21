/**
 * 🔍 AI Content Detection Module
 * 
 * ระบบตรวจจับคำตอบที่อาจสร้างโดย AI
 * สำหรับรักษาความน่าเชื่อถือของการประเมิน
 * 
 * Detection Methods:
 * 1. Statistical Patterns - ความผิดปกติทางสถิติ
 * 2. Linguistic Analysis - รูปแบบภาษาที่ AI ชอบใช้
 * 3. Behavioral Signals - พฤติกรรมการพิมพ์
 * 4. Perplexity Score - ความซับซ้อนของภาษา
 * 
 * Note: ระบบนี้เป็นการประเมินเบื้องต้น
 * ไม่ได้ตัดสินว่าเป็น AI 100% แต่ flag ให้ครูตรวจสอบ
 */

/**
 * 🔍 AI Detection Signals
 * สัญญาณที่บ่งชี้ว่าอาจเป็นข้อความที่สร้างโดย AI
 */
const AI_SIGNALS = {
  // Thai AI-generated text patterns
  FORMAL_CONNECTORS: [
    'นอกจากนี้', 'ยิ่งไปกว่านั้น', 'ในทำนองเดียวกัน', 'อย่างไรก็ตาม',
    'กล่าวคือ', 'ดังนั้น', 'เพราะฉะนั้น', 'โดยสรุป', 'สรุปได้ว่า',
    'ประการแรก', 'ประการที่สอง', 'ประการสุดท้าย', 'ในขณะเดียวกัน'
  ],
  
  // Over-structured patterns
  LIST_PATTERNS: [
    /^[1-9]\.\s/gm,  // Numbered lists
    /^•\s/gm,        // Bullet points
    /^-\s/gm,        // Dash lists
    /ข้อที่\s?\d/g,  // Thai numbered items
  ],
  
  // Hedging language (common in AI)
  HEDGING_WORDS: [
    'อาจจะ', 'น่าจะ', 'ค่อนข้าง', 'โดยทั่วไป', 'ส่วนใหญ่', 
    'ในบางกรณี', 'ขึ้นอยู่กับ', 'แตกต่างกันไป'
  ],
  
  // Perfect grammar indicators (Thai students often make casual errors)
  OVERLY_FORMAL: [
    'ซึ่ง', 'อัน', 'ที่ซึ่ง', 'โดยที่', 'กระนั้น', 'ทั้งนี้',
    'ด้วยเหตุนี้', 'เป็นที่ทราบกันดีว่า', 'ไม่อาจปฏิเสธได้ว่า'
  ],
  
  // English AI patterns (for English answers)
  ENGLISH_AI_PATTERNS: [
    'furthermore', 'moreover', 'additionally', 'in conclusion',
    'it is important to note', 'it is worth mentioning',
    'firstly', 'secondly', 'lastly', 'in summary',
    'as mentioned earlier', 'as previously stated'
  ]
}

/**
 * 🔍 Analyze Text for AI Generation Signals
 * วิเคราะห์ข้อความเพื่อหาสัญญาณ AI
 * 
 * @param {string} text - ข้อความที่ต้องการวิเคราะห์
 * @returns {Object} Analysis result
 */
function analyzeForAISignals(text) {
  if (!text || typeof text !== 'string') {
    return { score: 0, signals: [], interpretation: 'No text to analyze' }
  }
  
  const signals = []
  let totalWeight = 0
  
  // 1. Check formal connectors
  const connectorCount = AI_SIGNALS.FORMAL_CONNECTORS.filter(c => 
    text.includes(c)
  ).length
  
  if (connectorCount >= 3) {
    signals.push({
      type: 'formal_connectors',
      count: connectorCount,
      weight: Math.min(20, connectorCount * 5),
      description: `พบคำเชื่อมทางการ ${connectorCount} คำ (ปกติในเด็กจะน้อยกว่านี้)`
    })
    totalWeight += Math.min(20, connectorCount * 5)
  }
  
  // 2. Check list patterns
  let listCount = 0
  AI_SIGNALS.LIST_PATTERNS.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches) listCount += matches.length
  })
  
  if (listCount >= 3) {
    signals.push({
      type: 'structured_lists',
      count: listCount,
      weight: Math.min(15, listCount * 3),
      description: `พบรูปแบบ list ${listCount} จุด (AI ชอบตอบเป็น list)`
    })
    totalWeight += Math.min(15, listCount * 3)
  }
  
  // 3. Check hedging words
  const hedgingCount = AI_SIGNALS.HEDGING_WORDS.filter(h => 
    text.includes(h)
  ).length
  
  if (hedgingCount >= 4) {
    signals.push({
      type: 'hedging_language',
      count: hedgingCount,
      weight: Math.min(15, hedgingCount * 3),
      description: `พบคำระวังตัว ${hedgingCount} คำ (AI มักใช้เยอะ)`
    })
    totalWeight += Math.min(15, hedgingCount * 3)
  }
  
  // 4. Check overly formal language
  const formalCount = AI_SIGNALS.OVERLY_FORMAL.filter(f => 
    text.includes(f)
  ).length
  
  if (formalCount >= 2) {
    signals.push({
      type: 'overly_formal',
      count: formalCount,
      weight: Math.min(15, formalCount * 5),
      description: `พบภาษาทางการมาก ${formalCount} คำ (ไม่ปกติสำหรับนักเรียน)`
    })
    totalWeight += Math.min(15, formalCount * 5)
  }
  
  // 5. Check English AI patterns (if text contains English)
  const englishPatternCount = AI_SIGNALS.ENGLISH_AI_PATTERNS.filter(p => 
    text.toLowerCase().includes(p)
  ).length
  
  if (englishPatternCount >= 2) {
    signals.push({
      type: 'english_ai_patterns',
      count: englishPatternCount,
      weight: Math.min(20, englishPatternCount * 8),
      description: `พบรูปแบบภาษาอังกฤษแบบ AI ${englishPatternCount} รูปแบบ`
    })
    totalWeight += Math.min(20, englishPatternCount * 8)
  }
  
  // 6. Check sentence length consistency (AI tends to be very consistent)
  const sentences = text.split(/[.!?。]/g).filter(s => s.trim().length > 0)
  if (sentences.length >= 3) {
    const lengths = sentences.map(s => s.trim().length)
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avgLength, 2), 0) / lengths.length
    const cv = Math.sqrt(variance) / avgLength // Coefficient of variation
    
    if (cv < 0.25) { // Very consistent sentence lengths
      signals.push({
        type: 'uniform_sentence_length',
        cv: Math.round(cv * 100) / 100,
        weight: 15,
        description: `ความยาวประโยคสม่ำเสมอผิดปกติ (CV=${cv.toFixed(2)})`
      })
      totalWeight += 15
    }
  }
  
  // 7. Check for lack of personal markers
  const personalMarkers = ['ผม', 'ดิฉัน', 'ฉัน', 'เรา', 'หนู', 'กระผม', 'ข้าพเจ้า']
  const hasPersonalMarker = personalMarkers.some(m => text.includes(m))
  const textLength = text.length
  
  if (!hasPersonalMarker && textLength > 200) {
    signals.push({
      type: 'no_personal_voice',
      weight: 10,
      description: 'ไม่พบคำสรรพนามบุคคลที่ 1 (ข้อความไม่มี personal voice)'
    })
    totalWeight += 10
  }
  
  // 8. Check typing patterns (if available in metadata)
  // This would require timing data from frontend
  
  // Calculate final score (0-100)
  const aiScore = Math.min(100, totalWeight)
  
  return {
    score: aiScore,
    signals,
    signalCount: signals.length,
    interpretation: interpretAIScore(aiScore),
    riskLevel: getRiskLevel(aiScore),
    recommendation: getRecommendation(aiScore)
  }
}

/**
 * 🔍 Analyze Typing Behavior
 * วิเคราะห์พฤติกรรมการพิมพ์
 * 
 * @param {Object} typingMetrics - Timing data from frontend
 * @returns {Object} Behavior analysis
 */
function analyzeTypingBehavior(typingMetrics) {
  if (!typingMetrics) {
    return { suspicious: false, reason: 'No typing metrics available' }
  }
  
  const {
    totalTimeMs,
    characterCount,
    pauseCount,
    avgPauseDuration,
    backspaceCount,
    pasteDetected,
    rapidBurstCount
  } = typingMetrics
  
  const signals = []
  
  // 1. Check typing speed (characters per minute)
  const cpm = characterCount / (totalTimeMs / 60000)
  
  if (cpm > 400) { // Very fast typing
    signals.push({
      type: 'extremely_fast_typing',
      cpm: Math.round(cpm),
      description: `พิมพ์เร็วมาก ${Math.round(cpm)} CPM (ปกติ ~200-300)`
    })
  }
  
  // 2. Check pause patterns
  if (pauseCount === 0 && totalTimeMs > 30000) {
    signals.push({
      type: 'no_pauses',
      description: 'ไม่มีการหยุดคิดเลย (ผิดปกติสำหรับคำตอบยาว)'
    })
  }
  
  // 3. Check backspace ratio
  const backspaceRatio = backspaceCount / characterCount
  if (backspaceRatio < 0.01 && characterCount > 100) {
    signals.push({
      type: 'no_corrections',
      ratio: backspaceRatio,
      description: 'แทบไม่มีการแก้ไขเลย (copy-paste?)'
    })
  }
  
  // 4. Paste detection
  if (pasteDetected) {
    signals.push({
      type: 'paste_detected',
      description: 'ตรวจพบการ paste ข้อความ'
    })
  }
  
  // 5. Rapid burst typing
  if (rapidBurstCount > 3) {
    signals.push({
      type: 'rapid_bursts',
      count: rapidBurstCount,
      description: `พิมพ์เป็นช่วงๆ เร็วมาก ${rapidBurstCount} ครั้ง`
    })
  }
  
  return {
    suspicious: signals.length >= 2,
    signals,
    signalCount: signals.length,
    metrics: {
      cpm: Math.round(cpm),
      backspaceRatio: Math.round(backspaceRatio * 100) / 100,
      pauseCount
    }
  }
}

/**
 * 🔍 Comprehensive AI Detection
 * วิเคราะห์แบบครบวงจร
 * 
 * @param {string} text - Answer text
 * @param {Object} typingMetrics - Optional typing behavior data
 * @param {Object} studentHistory - Optional historical data
 * @returns {Object} Full detection result
 */
function comprehensiveAIDetection(text, typingMetrics = null, studentHistory = null) {
  // 1. Text analysis
  const textAnalysis = analyzeForAISignals(text)
  
  // 2. Typing behavior analysis
  const typingAnalysis = typingMetrics ? analyzeTypingBehavior(typingMetrics) : null
  
  // 3. Historical comparison (if available)
  let historicalAnomaly = null
  if (studentHistory && studentHistory.avgAnswerLength) {
    const currentLength = text.length
    const avgLength = studentHistory.avgAnswerLength
    const lengthRatio = currentLength / avgLength
    
    if (lengthRatio > 3) {
      historicalAnomaly = {
        type: 'length_anomaly',
        ratio: Math.round(lengthRatio * 10) / 10,
        description: `คำตอบยาวกว่าปกติ ${lengthRatio.toFixed(1)} เท่า`
      }
    }
    
    // Vocabulary comparison would require more sophisticated analysis
  }
  
  // Calculate combined score
  let combinedScore = textAnalysis.score
  
  if (typingAnalysis?.suspicious) {
    combinedScore += 20
  }
  
  if (historicalAnomaly) {
    combinedScore += 15
  }
  
  combinedScore = Math.min(100, combinedScore)
  
  return {
    // Overall result
    score: combinedScore,
    riskLevel: getRiskLevel(combinedScore),
    interpretation: interpretAIScore(combinedScore),
    
    // Breakdown
    textAnalysis,
    typingAnalysis,
    historicalAnomaly,
    
    // Action
    requiresReview: combinedScore >= 50,
    shouldFlag: combinedScore >= 70,
    
    // Recommendation
    recommendation: getRecommendation(combinedScore),
    
    // Confidence
    confidence: calculateDetectionConfidence(textAnalysis, typingAnalysis)
  }
}

/**
 * Calculate detection confidence
 */
function calculateDetectionConfidence(textAnalysis, typingAnalysis) {
  let confidence = 'Low'
  
  // More signals = higher confidence in detection
  const totalSignals = textAnalysis.signalCount + (typingAnalysis?.signalCount || 0)
  
  if (totalSignals >= 5) {
    confidence = 'High'
  } else if (totalSignals >= 3) {
    confidence = 'Medium'
  }
  
  return confidence
}

/**
 * Interpretation helpers
 */
function interpretAIScore(score) {
  if (score < 20) return 'ปกติ - ไม่พบสัญญาณ AI'
  if (score < 40) return 'ต่ำ - มีบางสัญญาณแต่อาจเป็นปกติ'
  if (score < 60) return 'ปานกลาง - ควรตรวจสอบเพิ่มเติม'
  if (score < 80) return 'สูง - มีแนวโน้มเป็น AI-generated'
  return 'สูงมาก - ควร flag ให้ครูตรวจสอบ'
}

function getRiskLevel(score) {
  if (score < 30) return 'LOW'
  if (score < 50) return 'MEDIUM'
  if (score < 70) return 'HIGH'
  return 'CRITICAL'
}

function getRecommendation(score) {
  if (score < 30) {
    return 'ไม่ต้องดำเนินการ - ผ่านการตรวจ'
  }
  if (score < 50) {
    return 'อาจสังเกตในครั้งถัดไป - ยังไม่ต้อง flag'
  }
  if (score < 70) {
    return 'แนะนำให้ครูตรวจสอบคำตอบนี้'
  }
  return 'ควร flag ให้ครูตรวจสอบและพูดคุยกับนักเรียน'
}

/**
 * 🔍 Quick AI Check
 * ตรวจเร็วสำหรับใช้ใน assessment flow
 * 
 * @param {string} text - Answer text
 * @returns {Object} Quick result
 */
function quickAICheck(text) {
  const result = analyzeForAISignals(text)
  
  return {
    score: result.score,
    riskLevel: result.riskLevel,
    shouldFlag: result.score >= 60,
    topSignal: result.signals[0]?.description || null
  }
}

// ==========================================
// Exports
// ==========================================

module.exports = {
  AI_SIGNALS,
  analyzeForAISignals,
  analyzeTypingBehavior,
  comprehensiveAIDetection,
  quickAICheck,
  interpretAIScore,
  getRiskLevel,
  getRecommendation
}
