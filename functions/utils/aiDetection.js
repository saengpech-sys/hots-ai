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
 * 🆕 Keystroke Dynamics Analysis
 * วิเคราะห์รูปแบบการกดแป้นพิมพ์แบบละเอียด
 * 
 * Features:
 * - Key hold duration (dwell time)
 * - Inter-key interval (flight time)
 * - Digraph patterns
 * - Rhythm consistency
 * 
 * @param {Array} keystrokeData - Array of keystroke events with timestamps
 * @returns {Object} Keystroke analysis result
 */
function analyzeKeystrokeDynamics(keystrokeData) {
  if (!keystrokeData || keystrokeData.length < 10) {
    return {
      analyzed: false,
      reason: 'Insufficient keystroke data (need at least 10 keystrokes)',
      signals: []
    }
  }
  
  const signals = []
  
  // 1. Calculate dwell times (key press duration)
  const dwellTimes = []
  for (const event of keystrokeData) {
    if (event.type === 'keyup' && event.dwellTime !== undefined) {
      dwellTimes.push(event.dwellTime)
    }
  }
  
  // 2. Calculate flight times (time between key releases)
  const flightTimes = []
  for (let i = 1; i < keystrokeData.length; i++) {
    if (keystrokeData[i].timestamp && keystrokeData[i - 1].timestamp) {
      const flight = keystrokeData[i].timestamp - keystrokeData[i - 1].timestamp
      if (flight > 0 && flight < 5000) { // Filter outliers
        flightTimes.push(flight)
      }
    }
  }
  
  // 3. Statistical analysis of dwell times
  if (dwellTimes.length >= 5) {
    const avgDwell = dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length
    const dwellVariance = dwellTimes.reduce((sum, t) => sum + Math.pow(t - avgDwell, 2), 0) / dwellTimes.length
    const dwellStdDev = Math.sqrt(dwellVariance)
    const dwellCV = dwellStdDev / avgDwell
    
    // Very uniform dwell time is suspicious (human typing varies naturally)
    if (dwellCV < 0.15) {
      signals.push({
        type: 'uniform_dwell_time',
        cv: Math.round(dwellCV * 100) / 100,
        avgDwell: Math.round(avgDwell),
        weight: 20,
        description: `เวลากดปุ่มสม่ำเสมอผิดปกติ (CV=${dwellCV.toFixed(2)}) - อาจเป็น bot หรือ paste`
      })
    }
    
    // Average dwell time too fast or too slow
    if (avgDwell < 50) {
      signals.push({
        type: 'very_short_dwell',
        avgDwell: Math.round(avgDwell),
        weight: 15,
        description: `เวลากดปุ่มสั้นมาก (${Math.round(avgDwell)}ms) - เร็วกว่าปกติ`
      })
    }
  }
  
  // 4. Statistical analysis of flight times
  if (flightTimes.length >= 5) {
    const avgFlight = flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length
    const flightVariance = flightTimes.reduce((sum, t) => sum + Math.pow(t - avgFlight, 2), 0) / flightTimes.length
    const flightStdDev = Math.sqrt(flightVariance)
    const flightCV = flightStdDev / avgFlight
    
    // Very uniform flight time is suspicious
    if (flightCV < 0.20) {
      signals.push({
        type: 'uniform_flight_time',
        cv: Math.round(flightCV * 100) / 100,
        avgFlight: Math.round(avgFlight),
        weight: 20,
        description: `จังหวะการพิมพ์สม่ำเสมอผิดปกติ (CV=${flightCV.toFixed(2)}) - อาจเป็น automated input`
      })
    }
  }
  
  // 5. Detect bursts (rapid typing followed by long pauses)
  let burstCount = 0
  let longPauseCount = 0
  const BURST_THRESHOLD = 50   // ms - faster than typical typing
  const PAUSE_THRESHOLD = 2000 // ms - long thinking pause
  
  for (const flight of flightTimes) {
    if (flight < BURST_THRESHOLD) burstCount++
    if (flight > PAUSE_THRESHOLD) longPauseCount++
  }
  
  const burstRatio = burstCount / flightTimes.length
  if (burstRatio > 0.5) {
    signals.push({
      type: 'high_burst_ratio',
      ratio: Math.round(burstRatio * 100),
      weight: 15,
      description: `${Math.round(burstRatio * 100)}% เป็นการพิมพ์เร็วผิดปกติ (burst typing)`
    })
  }
  
  // 6. Lack of thinking pauses in long text
  const totalKeystrokes = keystrokeData.length
  if (totalKeystrokes > 100 && longPauseCount < 2) {
    signals.push({
      type: 'no_thinking_pauses',
      keystrokes: totalKeystrokes,
      pauses: longPauseCount,
      weight: 15,
      description: `พิมพ์ ${totalKeystrokes} ตัวอักษรโดยแทบไม่หยุดคิด`
    })
  }
  
  // 7. Rhythm consistency (standard deviation of rhythm)
  if (flightTimes.length >= 10) {
    // Calculate local rhythm consistency
    const rhythmChanges = []
    for (let i = 1; i < flightTimes.length; i++) {
      const change = Math.abs(flightTimes[i] - flightTimes[i - 1])
      rhythmChanges.push(change)
    }
    
    const avgRhythmChange = rhythmChanges.reduce((a, b) => a + b, 0) / rhythmChanges.length
    
    // Very consistent rhythm (low change) is suspicious
    if (avgRhythmChange < 30) {
      signals.push({
        type: 'machine_like_rhythm',
        avgChange: Math.round(avgRhythmChange),
        weight: 25,
        description: `จังหวะการพิมพ์คงที่เหมือนเครื่อง (avg change=${Math.round(avgRhythmChange)}ms)`
      })
    }
  }
  
  // Calculate total suspicion score
  const totalWeight = signals.reduce((sum, s) => sum + (s.weight || 0), 0)
  const suspicionScore = Math.min(100, totalWeight)
  
  return {
    analyzed: true,
    suspicionScore,
    signals,
    signalCount: signals.length,
    riskLevel: suspicionScore >= 50 ? 'HIGH' : suspicionScore >= 30 ? 'MEDIUM' : 'LOW',
    metrics: {
      keystrokeCount: keystrokeData.length,
      dwellTimesCount: dwellTimes.length,
      flightTimesCount: flightTimes.length,
      avgDwellTime: dwellTimes.length > 0 ? Math.round(dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length) : null,
      avgFlightTime: flightTimes.length > 0 ? Math.round(flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length) : null,
      burstRatio: Math.round(burstRatio * 100) / 100,
      longPauseCount
    },
    interpretation: suspicionScore >= 50 
      ? '⚠️ รูปแบบการพิมพ์ผิดปกติ - อาจเป็น automated input หรือ copy-paste'
      : suspicionScore >= 30
        ? '📊 รูปแบบการพิมพ์น่าสังเกต - ควรติดตาม'
        : '✅ รูปแบบการพิมพ์ปกติ'
  }
}

/**
 * 🆕 Build Keystroke Profile for Student
 * สร้าง profile การพิมพ์ของนักเรียนเพื่อเปรียบเทียบในอนาคต
 * 
 * @param {Array} keystrokeHistory - Array of past keystroke sessions
 * @returns {Object} Student typing profile
 */
function buildKeystrokeProfile(keystrokeHistory) {
  if (!keystrokeHistory || keystrokeHistory.length < 3) {
    return {
      profileBuilt: false,
      reason: 'Need at least 3 sessions to build profile'
    }
  }
  
  // Aggregate metrics across sessions
  const allDwellTimes = []
  const allFlightTimes = []
  const sessionMetrics = []
  
  for (const session of keystrokeHistory) {
    if (session.metrics) {
      if (session.metrics.avgDwellTime) allDwellTimes.push(session.metrics.avgDwellTime)
      if (session.metrics.avgFlightTime) allFlightTimes.push(session.metrics.avgFlightTime)
      sessionMetrics.push(session.metrics)
    }
  }
  
  // Calculate profile statistics
  const profile = {
    profileBuilt: true,
    sessionCount: keystrokeHistory.length,
    avgDwellTime: allDwellTimes.length > 0 
      ? Math.round(allDwellTimes.reduce((a, b) => a + b, 0) / allDwellTimes.length)
      : null,
    dwellTimeStdDev: calculateStdDev(allDwellTimes),
    avgFlightTime: allFlightTimes.length > 0
      ? Math.round(allFlightTimes.reduce((a, b) => a + b, 0) / allFlightTimes.length)
      : null,
    flightTimeStdDev: calculateStdDev(allFlightTimes),
    typingSpeedRange: {
      min: Math.min(...sessionMetrics.map(m => m.cpm || 0).filter(x => x > 0)),
      max: Math.max(...sessionMetrics.map(m => m.cpm || 0)),
      avg: Math.round(sessionMetrics.reduce((sum, m) => sum + (m.cpm || 0), 0) / sessionMetrics.length)
    }
  }
  
  // Define acceptable deviation range (2 standard deviations)
  profile.acceptableRanges = {
    dwellTime: {
      min: profile.avgDwellTime - 2 * (profile.dwellTimeStdDev || 20),
      max: profile.avgDwellTime + 2 * (profile.dwellTimeStdDev || 20)
    },
    flightTime: {
      min: profile.avgFlightTime - 2 * (profile.flightTimeStdDev || 50),
      max: profile.avgFlightTime + 2 * (profile.flightTimeStdDev || 50)
    }
  }
  
  return profile
}

/**
 * 🆕 Compare Current Session Against Profile
 * เปรียบเทียบ session ปัจจุบันกับ profile ปกติของนักเรียน
 * 
 * @param {Object} currentMetrics - Current session metrics
 * @param {Object} profile - Student's typing profile
 * @returns {Object} Comparison result
 */
function compareToProfile(currentMetrics, profile) {
  if (!profile.profileBuilt || !currentMetrics) {
    return { compared: false, reason: 'Profile or metrics not available' }
  }
  
  const deviations = []
  
  // Check dwell time deviation
  if (currentMetrics.avgDwellTime && profile.avgDwellTime) {
    const dwellDev = Math.abs(currentMetrics.avgDwellTime - profile.avgDwellTime) / (profile.dwellTimeStdDev || 20)
    if (dwellDev > 2) {
      deviations.push({
        type: 'dwell_time_anomaly',
        expected: profile.avgDwellTime,
        actual: currentMetrics.avgDwellTime,
        zScore: Math.round(dwellDev * 10) / 10,
        description: `เวลากดปุ่มต่างจากปกติ ${Math.round(dwellDev * 10) / 10} SD`
      })
    }
  }
  
  // Check flight time deviation
  if (currentMetrics.avgFlightTime && profile.avgFlightTime) {
    const flightDev = Math.abs(currentMetrics.avgFlightTime - profile.avgFlightTime) / (profile.flightTimeStdDev || 50)
    if (flightDev > 2) {
      deviations.push({
        type: 'flight_time_anomaly',
        expected: profile.avgFlightTime,
        actual: currentMetrics.avgFlightTime,
        zScore: Math.round(flightDev * 10) / 10,
        description: `จังหวะการพิมพ์ต่างจากปกติ ${Math.round(flightDev * 10) / 10} SD`
      })
    }
  }
  
  // Check typing speed deviation
  if (currentMetrics.cpm && profile.typingSpeedRange) {
    if (currentMetrics.cpm > profile.typingSpeedRange.max * 1.5) {
      deviations.push({
        type: 'speed_anomaly',
        expected: profile.typingSpeedRange.avg,
        actual: currentMetrics.cpm,
        description: `ความเร็วพิมพ์สูงกว่าปกติมาก (${currentMetrics.cpm} vs avg ${profile.typingSpeedRange.avg} CPM)`
      })
    }
  }
  
  return {
    compared: true,
    isAnomaly: deviations.length > 0,
    deviations,
    deviationCount: deviations.length,
    interpretation: deviations.length === 0
      ? '✅ รูปแบบการพิมพ์ตรงกับประวัติของนักเรียน'
      : deviations.length === 1
        ? '📊 พบความแตกต่างเล็กน้อย - ควรสังเกต'
        : '⚠️ รูปแบบการพิมพ์ต่างจากปกติมาก - ควรตรวจสอบ'
  }
}

/**
 * Helper: Calculate standard deviation
 */
function calculateStdDev(values) {
  if (!values || values.length < 2) return null
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length
  return Math.round(Math.sqrt(variance) * 10) / 10
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
  analyzeKeystrokeDynamics,
  buildKeystrokeProfile,
  compareToProfile,
  comprehensiveAIDetection,
  quickAICheck,
  interpretAIScore,
  getRiskLevel,
  getRecommendation
}
