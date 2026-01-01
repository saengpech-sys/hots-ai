/**
 * 🛡️ Anti-Cheat Utils Module
 * Detection functions for copy-paste, speed runs, hacking attempts
 * Extracted from index.js for modularity
 */

/**
 * 🆕 Detect Emotional State
 * ตรวจจับความเครียด/ท้อแท้จากคำตอบ
 */
function detectEmotionalState(text) {
  const emotionalPatterns = {
    stress: [
      /หนู(ทำ)?ไม่ไหว/i, /ไม่เข้าใจ(เลย)?/i, /ยากมาก/i, /ยากเกินไป/i,
      /เครียด/i, /กดดัน/i, /ท้อ(แท้)?/i, /หมดไฟ/i, /เหนื่อย/i,
      /ไม่รู้(จะ)?ทำ(ยังไง|อย่างไร)/i, /ช่วย(ด้วย|หน่อย)/i,
      /ไม่มีความสุข/i, /อยากร้องไห้/i, /กลัว/i
    ],
    frustration: [
      /ทำไม่(ได้|ถูก)/i, /ผิดอีกแล้ว/i, /ไม่เคยถูก/i,
      /โง่/i, /เกลียด(วิชานี้|ตัวเอง)/i, /ยอมแพ้/i
    ],
    confusion: [
      /งง(มาก)?/i, /สับสน/i, /ไม่เข้าใจคำถาม/i,
      /หมายความว่า(อะไร|ยังไง)/i, /ช่วยอธิบาย/i
    ]
  }
  
  const result = {
    isEmotional: false,
    emotionType: null,
    intensity: 'low',
    matchedPatterns: []
  }
  
  const lowerText = text.toLowerCase()
  let matchCount = 0
  
  for (const [emotionType, patterns] of Object.entries(emotionalPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerText)) {
        result.matchedPatterns.push(emotionType)
        matchCount++
        if (!result.emotionType) {
          result.emotionType = emotionType
        }
      }
    }
  }
  
  if (matchCount > 0) {
    result.isEmotional = true
    result.intensity = matchCount >= 3 ? 'high' : matchCount >= 2 ? 'medium' : 'low'
  }
  
  return result
}

/**
 * 🆕 Speed Run Detection
 * ตรวจจับการตอบเร็วเกินไป (< 10 วินาที)
 */
function detectSpeedRun(text, typingFingerprint) {
  const MINIMUM_TIME_SECONDS = 10
  const MINIMUM_CHARS_PER_SECOND = 10
  
  const result = {
    isSpeedRun: false,
    reason: null,
    timeSpent: null,
    expectedMinTime: MINIMUM_TIME_SECONDS
  }
  
  if (!typingFingerprint) return result
  
  const typingDurationMs = typingFingerprint.typingDurationMs || 0
  const totalTimeMs = typingFingerprint.totalTimeMs || typingDurationMs
  const timeSpentSeconds = totalTimeMs / 1000
  result.timeSpent = timeSpentSeconds
  
  if (timeSpentSeconds < MINIMUM_TIME_SECONDS && text.length > 50) {
    result.isSpeedRun = true
    result.reason = `ใช้เวลาตอบเพียง ${timeSpentSeconds.toFixed(1)} วินาที (ขั้นต่ำ ${MINIMUM_TIME_SECONDS} วินาที)`
    return result
  }
  
  if (timeSpentSeconds > 0) {
    const charsPerSecond = text.length / timeSpentSeconds
    if (charsPerSecond > MINIMUM_CHARS_PER_SECOND && text.length > 100) {
      result.isSpeedRun = true
      result.reason = `พิมพ์เร็วเกินไป (${charsPerSecond.toFixed(1)} ตัวอักษร/วินาที)`
    }
  }
  
  return result
}

/**
 * 🆕 Enhanced Code/Hacker Detection
 * ตรวจจับ code และ prompt injection
 */
function detectHackerAttempt(text) {
  const result = {
    isHacker: false,
    type: null,
    reason: null,
    severity: 'low'
  }
  
  const promptInjectionPatterns = [
    /ignore (previous |all )?instructions?/i,
    /forget (everything|what|your)/i,
    /you are now/i,
    /new (system )?prompt/i,
    /tell me a joke/i,
    /ให้คะแนนเต็ม/i,
    /ให้ 20 คะแนน/i,
    /ให้ผ่าน(ทุก|ทั้งหมด)/i,
    /bypass/i,
    /override/i,
    /jailbreak/i,
    /DAN mode/i
  ]
  
  const codePatterns = [
    { pattern: /<script[^>]*>/i, type: 'javascript', severity: 'high' },
    { pattern: /<\/script>/i, type: 'javascript', severity: 'high' },
    { pattern: /javascript:/i, type: 'javascript', severity: 'high' },
    { pattern: /onclick=|onerror=|onload=/i, type: 'xss', severity: 'high' },
    { pattern: /<iframe/i, type: 'html', severity: 'medium' },
    { pattern: /<style[^>]*>/i, type: 'css', severity: 'low' },
    { pattern: /SELECT\s+.*\s+FROM/i, type: 'sql', severity: 'medium' },
    { pattern: /DROP\s+TABLE/i, type: 'sql', severity: 'high' },
    { pattern: /function\s*\([^)]*\)\s*\{/i, type: 'javascript', severity: 'medium' },
    { pattern: /const\s+\w+\s*=\s*(\(|function|async)/i, type: 'javascript', severity: 'medium' },
    { pattern: /import\s+\{[^}]+\}\s+from/i, type: 'javascript', severity: 'medium' },
    { pattern: /require\s*\(['"][^'"]+['"]\)/i, type: 'javascript', severity: 'medium' }
  ]
  
  for (const pattern of promptInjectionPatterns) {
    if (pattern.test(text)) {
      result.isHacker = true
      result.type = 'prompt_injection'
      result.reason = 'ตรวจพบความพยายามแทรกคำสั่ง'
      result.severity = 'high'
      return result
    }
  }
  
  for (const { pattern, type, severity } of codePatterns) {
    if (pattern.test(text)) {
      result.isHacker = true
      result.type = type
      result.reason = `ตรวจพบโค้ด ${type.toUpperCase()}`
      result.severity = severity
      return result
    }
  }
  
  return result
}

/**
 * Detect copy-paste patterns in text
 */
function detectCopyPaste(text) {
  const result = { isSuspicious: false, reasons: [] }
  
  // Common Wikipedia formatting
  if (/\[\d+\]/.test(text)) {
    result.isSuspicious = true
    result.reasons.push('Wikipedia citation format detected')
  }
  
  // Unusual whitespace patterns
  if (/\t{2,}|\r\n{2,}/.test(text)) {
    result.isSuspicious = true
    result.reasons.push('Unusual whitespace patterns')
  }
  
  // Very long words (likely copy-paste of URLs or technical terms)
  const words = text.split(/\s+/)
  const longWords = words.filter(w => w.length > 30)
  if (longWords.length > 0) {
    result.isSuspicious = true
    result.reasons.push(`Very long words detected: ${longWords.length}`)
  }
  
  // Mixed scripts (Thai + unusual scripts)
  if (/[\u0E00-\u0E7F].*[\u4E00-\u9FFF]/.test(text)) {
    result.isSuspicious = true
    result.reasons.push('Mixed Thai and Chinese scripts')
  }
  
  return result
}

/**
 * 🆕 Enhanced Anti-Cheat Validation
 * Supports PC and Mobile
 */
function validateAntiCheat(text, typingFingerprint) {
  const result = {
    isValid: true,
    suspiciousLevel: 0,
    reasons: [],
    warnings: [],
    deviceType: 'unknown'
  }
  
  // Detect device type
  if (typingFingerprint) {
    if (typingFingerprint.isMobile || typingFingerprint.deviceType === 'mobile') {
      result.deviceType = 'mobile'
    } else if (typingFingerprint.isTouchDevice) {
      result.deviceType = 'tablet'
    } else {
      result.deviceType = 'desktop'
    }
  }
  
  // Thresholds based on device
  const thresholds = result.deviceType === 'mobile' 
    ? { minKeystrokeRatio: 0.3, maxTypingSpeed: 400, lowKeystrokePenalty: 20 }
    : { minKeystrokeRatio: 0.6, maxTypingSpeed: 600, lowKeystrokePenalty: 30 }
  
  // 1. TEXT PATTERN ANALYSIS
  const textPatterns = detectCopyPaste(text)
  if (textPatterns.isSuspicious) {
    result.suspiciousLevel += 25
    result.reasons.push(...textPatterns.reasons)
  }
  
  // Academic citation patterns
  if (/\[\d+\]|\(\d{4}\)|et al\.|ibid\./i.test(text)) {
    result.suspiciousLevel += 20
    result.reasons.push('Academic citation patterns detected')
  }
  
  // Wikipedia markup
  if (/\{\{.*?\}\}|\[\[.*?\]\]/.test(text)) {
    result.suspiciousLevel += 30
    result.reasons.push('Wikipedia markup detected')
  }
  
  // Code patterns
  if (/function\s+\w+\s*\(|const\s+\w+\s*=|import\s+\{|<\/?[a-z]+>/i.test(text)) {
    result.suspiciousLevel += 15
    result.warnings.push('Code-like patterns detected')
  }
  
  // 2. TYPING FINGERPRINT ANALYSIS
  if (typingFingerprint) {
    const fp = typingFingerprint
    
    // Keystroke ratio check
    if (text.length > 50 && fp.totalCharactersTyped !== undefined) {
      const keystrokeRatio = fp.totalCharactersTyped / text.length
      if (keystrokeRatio < thresholds.minKeystrokeRatio) {
        result.suspiciousLevel += thresholds.lowKeystrokePenalty
        result.reasons.push(`Low keystroke ratio: ${(keystrokeRatio * 100).toFixed(1)}%`)
      } else if (keystrokeRatio < thresholds.minKeystrokeRatio + 0.2) {
        result.suspiciousLevel += Math.floor(thresholds.lowKeystrokePenalty / 2)
        result.warnings.push(`Below-average keystroke ratio: ${(keystrokeRatio * 100).toFixed(1)}%`)
      }
    }
    
    // Typing speed analysis
    if (fp.typingDurationMs && fp.typingDurationMs > 0) {
      const typingSpeedCPM = (text.length / (fp.typingDurationMs / 1000 / 60))
      if (typingSpeedCPM > thresholds.maxTypingSpeed + 100) {
        result.suspiciousLevel += 25
        result.reasons.push(`Extremely fast typing: ${typingSpeedCPM.toFixed(0)} CPM`)
      } else if (typingSpeedCPM > thresholds.maxTypingSpeed) {
        result.suspiciousLevel += 10
        result.warnings.push(`Fast typing speed: ${typingSpeedCPM.toFixed(0)} CPM`)
      }
    }
    
    // Paste event detection
    if (fp.pasteCount && fp.pasteCount > 0) {
      const pasteRatio = (fp.totalCharactersPasted || 0) / text.length
      if (pasteRatio > 0.5) {
        result.suspiciousLevel += 35
        result.reasons.push(`High paste ratio: ${(pasteRatio * 100).toFixed(1)}%`)
      } else if (pasteRatio > 0.3) {
        result.suspiciousLevel += 20
        result.warnings.push(`Moderate paste content: ${(pasteRatio * 100).toFixed(1)}%`)
      }
    }
    
    // Focus loss detection
    if (result.deviceType === 'desktop') {
      if (fp.focusLossCount && fp.focusLossCount > 5) {
        result.suspiciousLevel += 15
        result.warnings.push(`High focus loss count: ${fp.focusLossCount}`)
      }
      if (fp.appSwitchCount && fp.appSwitchCount > 3) {
        result.suspiciousLevel += 15
        result.warnings.push(`App switched ${fp.appSwitchCount} times`)
      }
    }
  }
  
  // 3. FINAL DETERMINATION
  result.suspiciousLevel = Math.min(100, result.suspiciousLevel)
  
  if (result.suspiciousLevel >= 50) {
    result.isValid = false
  }
  
  return result
}

/**
 * Validate assessment result schema
 */
function validateAssessmentResult(result) {
  const requiredFields = ['rubricScores', 'feedback']
  const rubricDimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  
  for (const field of requiredFields) {
    if (!result[field]) return false
  }
  
  if (!result.rubricScores || typeof result.rubricScores !== 'object') return false
  
  for (const dim of rubricDimensions) {
    const score = result.rubricScores[dim]
    if (typeof score !== 'number' || score < 0 || score > 5) return false
  }
  
  return true
}

module.exports = {
  detectEmotionalState,
  detectSpeedRun,
  detectHackerAttempt,
  detectCopyPaste,
  validateAntiCheat,
  validateAssessmentResult
}
