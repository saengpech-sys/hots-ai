/**
 * Anti-Cheat Utility Module
 * ระบบป้องกันการโกงในการพิมพ์คำตอบ
 * 
 * หลักการ:
 * 1. Keystroke Dynamics - วิเคราะห์รูปแบบการพิมพ์
 * 2. Paste Detection - ตรวจจับการวางข้อความ
 * 3. Typing Speed Analysis - วิเคราะห์ความเร็วในการพิมพ์
 * 4. Text Similarity Check - ตรวจสอบความคล้ายคลึงกับคำตอบเดิม
 * 5. Mobile/PC Detection - ปรับ threshold ตามอุปกรณ์
 */

// ===== DEVICE DETECTION =====

/**
 * ตรวจสอบว่าเป็น Mobile หรือไม่
 */
function isMobileDevice() {
  if (typeof window === 'undefined') return false
  
  const userAgent = navigator.userAgent || navigator.vendor || window.opera
  
  // ตรวจสอบจาก userAgent
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i
  const isMobileUA = mobileRegex.test(userAgent.toLowerCase())
  
  // ตรวจสอบจาก touch support
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  
  // ตรวจสอบจาก screen size
  const isSmallScreen = window.innerWidth <= 768
  
  return isMobileUA || (hasTouch && isSmallScreen)
}

/**
 * ตรวจสอบว่าเป็น Tablet หรือไม่
 */
function isTabletDevice() {
  if (typeof window === 'undefined') return false
  
  const userAgent = navigator.userAgent.toLowerCase()
  const isTabletUA = /ipad|android(?!.*mobile)|tablet/i.test(userAgent)
  const isMediumScreen = window.innerWidth > 768 && window.innerWidth <= 1024
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  
  return isTabletUA || (hasTouch && isMediumScreen)
}

/**
 * ดึงข้อมูลอุปกรณ์
 */
function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return { type: 'unknown', isMobile: false, isTablet: false, hasTouch: false }
  }
  
  const isMobile = isMobileDevice()
  const isTablet = isTabletDevice()
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  
  let type = 'desktop'
  if (isMobile) type = 'mobile'
  else if (isTablet) type = 'tablet'
  
  return {
    type,
    isMobile,
    isTablet,
    hasTouch,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    userAgent: navigator.userAgent,
    platform: navigator.platform
  }
}

// ===== CONFIGURATION =====

// Configuration สำหรับ PC
const PC_CONFIG = {
  MIN_TYPING_SPEED: 20,           // CPM
  MAX_NORMAL_TYPING_SPEED: 400,   // CPM - PC พิมพ์ได้เร็ว
  MIN_KEYSTROKE_INTERVAL: 30,     // ms
  BURST_CHAR_THRESHOLD: 50,       // chars
  BURST_TIME_WINDOW: 3000,        // 3 seconds
  MIN_KEYSTROKE_RATIO: 0.7,       // 70%
  SUDDEN_JUMP_THRESHOLD: 20,      // chars
  SUDDEN_JUMP_TIME: 500,          // ms
}

// Configuration สำหรับ Mobile - ผ่อนปรนกว่าเพราะพิมพ์ช้ากว่า + autocomplete/swipe
const MOBILE_CONFIG = {
  MIN_TYPING_SPEED: 5,            // CPM - Mobile พิมพ์ช้ากว่ามาก
  MAX_NORMAL_TYPING_SPEED: 300,   // CPM - เพิ่มเพื่อรองรับ swipe typing
  MIN_KEYSTROKE_INTERVAL: 30,     // ms - ลดลงเพื่อรองรับ swipe
  BURST_CHAR_THRESHOLD: 50,       // chars - เพิ่มเพราะ autocomplete ได้หลายตัว
  BURST_TIME_WINDOW: 5000,        // 5 seconds - ให้เวลามากขึ้น
  MIN_KEYSTROKE_RATIO: 0.3,       // 30% - ผ่อนปรนมากเพราะ autocomplete/swipe/prediction
  SUDDEN_JUMP_THRESHOLD: 25,      // chars - เพิ่มเพื่อรองรับ autocomplete phrases
  SUDDEN_JUMP_TIME: 1000,         // ms - ให้เวลามากขึ้น
}

// Configuration สำหรับ Tablet - กลางๆ ระหว่าง PC และ Mobile
const TABLET_CONFIG = {
  MIN_TYPING_SPEED: 15,
  MAX_NORMAL_TYPING_SPEED: 300,
  MIN_KEYSTROKE_INTERVAL: 40,
  BURST_CHAR_THRESHOLD: 40,
  BURST_TIME_WINDOW: 3500,
  MIN_KEYSTROKE_RATIO: 0.6,
  SUDDEN_JUMP_THRESHOLD: 18,
  SUDDEN_JUMP_TIME: 600,
}

/**
 * ดึง configuration ตามอุปกรณ์
 */
function getDeviceConfig() {
  const deviceInfo = getDeviceInfo()
  
  if (deviceInfo.isMobile) return { ...MOBILE_CONFIG, deviceType: 'mobile' }
  if (deviceInfo.isTablet) return { ...TABLET_CONFIG, deviceType: 'tablet' }
  return { ...PC_CONFIG, deviceType: 'desktop' }
}

// Suspicious patterns (ใช้ร่วมกันทุกอุปกรณ์)
const SUSPICIOUS_PATTERNS = {
  multipleSpaces: /\s{4,}/,
  tabs: /\t/,
  unusualCharacters: /[^\u0E00-\u0E7Fa-zA-Z0-9\s.,!?()"\-\/:;@#$%&*+=\n]/,
  citationPatterns: /\[\d+\]|\(\d{4}\)|et al\.|ibid\./i,
  wikiPatterns: /\{\{.*?\}\}|\[\[.*?\]\]/,
}

/**
 * TypingTracker Class
 * ติดตามและวิเคราะห์การพิมพ์ของผู้ใช้
 * รองรับทั้ง PC และ Mobile
 */
class TypingTracker {
  constructor() {
    this.deviceInfo = getDeviceInfo()
    this.config = getDeviceConfig()
    this.reset()
  }
  
  reset() {
    this.keystrokes = []
    this.pasteEvents = []
    this.deletions = 0
    this.corrections = 0
    this.startTime = null
    this.lastKeystrokeTime = null
    this.burstBuffer = []
    this.totalCharactersTyped = 0
    this.characterInsertionHistory = []
    
    // 🆕 Mobile-specific tracking
    this.touchEvents = []
    this.autocompleteEvents = []
    this.inputMethodUsed = null // 'keyboard', 'voice', 'swipe', etc.
    this.focusLostCount = 0
    this.appSwitchCount = 0
  }
  
  /**
   * บันทึก keystroke event (PC)
   */
  recordKeystroke(event, currentTextLength) {
    const now = Date.now()
    
    if (!this.startTime) {
      this.startTime = now
    }
    
    const keystroke = {
      key: event.key,
      code: event.code,
      timestamp: now,
      timeSinceLast: this.lastKeystrokeTime ? now - this.lastKeystrokeTime : 0,
      textLengthAfter: currentTextLength,
      isDelete: event.key === 'Backspace' || event.key === 'Delete',
      isSpecial: event.ctrlKey || event.metaKey,
      shiftKey: event.shiftKey,
      // 🆕 เพิ่มข้อมูลอุปกรณ์
      deviceType: this.deviceInfo.type
    }
    
    // ตรวจจับ Ctrl+V (paste attempt) - PC only
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
      keystroke.isPasteAttempt = true
      console.warn('⚠️ Paste shortcut detected!')
    }
    
    this.keystrokes.push(keystroke)
    
    // นับ deletions และ corrections
    if (keystroke.isDelete) {
      this.deletions++
      if (this.keystrokes.length >= 2) {
        const prevKey = this.keystrokes[this.keystrokes.length - 2]
        if (!prevKey.isDelete) {
          this.corrections++
        }
      }
    }
    
    // นับตัวอักษรที่พิมพ์
    if (!keystroke.isDelete && !keystroke.isSpecial && keystroke.key.length === 1) {
      this.totalCharactersTyped++
      
      // ติดตาม burst typing
      this.burstBuffer.push(now)
      this.burstBuffer = this.burstBuffer.filter(t => now - t < this.config.BURST_TIME_WINDOW)
    }
    
    this.lastKeystrokeTime = now
    
    return keystroke
  }
  
  /**
   * 🆕 บันทึก touch/input event (Mobile)
   */
  recordTouchInput(event, currentTextLength, previousTextLength) {
    const now = Date.now()
    
    if (!this.startTime) {
      this.startTime = now
    }
    
    const lengthDiff = currentTextLength - previousTextLength
    
    const touchInput = {
      timestamp: now,
      timeSinceLast: this.lastKeystrokeTime ? now - this.lastKeystrokeTime : 0,
      lengthBefore: previousTextLength,
      lengthAfter: currentTextLength,
      lengthDiff,
      inputType: event.inputType || 'unknown', // insertText, insertCompositionText, deleteContentBackward, etc.
      data: event.data || null, // ตัวอักษรที่พิมพ์
      deviceType: this.deviceInfo.type
    }
    
    // ตรวจจับ autocomplete/suggestion (Mobile)
    // Mobile autocomplete มักใส่หลายตัวอักษรพร้อมกัน
    if (lengthDiff > 3 && event.inputType === 'insertText') {
      touchInput.possibleAutocomplete = true
      this.autocompleteEvents.push({
        timestamp: now,
        textAdded: event.data,
        length: lengthDiff
      })
    }
    
    // นับตัวอักษร
    if (lengthDiff > 0) {
      this.totalCharactersTyped += lengthDiff
    } else if (lengthDiff < 0) {
      this.deletions += Math.abs(lengthDiff)
    }
    
    this.touchEvents.push(touchInput)
    this.lastKeystrokeTime = now
    
    return touchInput
  }
  
  /**
   * บันทึก paste event (เมื่อมีการ paste แม้จะ prevent แล้ว)
   */
  recordPasteEvent(pastedTextLength = 0) {
    this.pasteEvents.push({
      timestamp: Date.now(),
      pastedLength: pastedTextLength,
      deviceType: this.deviceInfo.type
    })
  }
  
  /**
   * 🆕 บันทึกเมื่อ focus หลุด (อาจไปคัดลอกจากที่อื่น)
   */
  recordFocusLost() {
    this.focusLostCount++
  }
  
  /**
   * 🆕 บันทึกเมื่อสลับ app (Mobile)
   */
  recordAppSwitch() {
    this.appSwitchCount++
  }
  
  /**
   * บันทึกการเปลี่ยนแปลงของ text (สำหรับตรวจจับ sudden jump)
   */
  recordTextChange(newText, previousText) {
    const now = Date.now()
    const lengthDiff = newText.length - (previousText?.length || 0)
    
    this.characterInsertionHistory.push({
      timestamp: now,
      lengthBefore: previousText?.length || 0,
      lengthAfter: newText.length,
      lengthDiff,
      timeSinceLast: this.characterInsertionHistory.length > 0 
        ? now - this.characterInsertionHistory[this.characterInsertionHistory.length - 1].timestamp 
        : 0
    })
    
    // 🆕 ใช้ threshold ตามอุปกรณ์
    const jumpThreshold = this.config.SUDDEN_JUMP_THRESHOLD
    const jumpTime = this.config.SUDDEN_JUMP_TIME
    
    // ตรวจจับ sudden jump (น่าจะเป็น paste)
    // แต่ถ้าเป็น Mobile และมี autocomplete อาจเป็นปกติ
    if (lengthDiff > jumpThreshold) {
      const timeSinceLast = this.characterInsertionHistory.length > 1
        ? this.characterInsertionHistory[this.characterInsertionHistory.length - 1].timeSinceLast
        : 0
      
      // Mobile: ผ่อนปรนมากกว่าเพราะมี autocomplete
      const isMobile = this.deviceInfo.isMobile || this.deviceInfo.isTablet
      const adjustedTime = isMobile ? jumpTime * 1.5 : jumpTime
      
      if (timeSinceLast < adjustedTime || timeSinceLast === 0) {
        // ถ้าเป็น Mobile และ jump ไม่ใหญ่มาก อาจเป็น autocomplete
        if (isMobile && lengthDiff <= 20) {
          console.log(`📱 Mobile text jump (likely autocomplete): +${lengthDiff} chars`)
          return { suspicious: false, type: 'autocomplete', details: { lengthDiff, timeSinceLast } }
        }
        
        console.warn(`⚠️ Sudden text jump detected: +${lengthDiff} chars in ${timeSinceLast}ms`)
        return { suspicious: true, type: 'sudden_jump', details: { lengthDiff, timeSinceLast } }
      }
    }
    
    return { suspicious: false }
  }
  
  /**
   * วิเคราะห์ผลการพิมพ์ (ปรับตามอุปกรณ์)
   */
  analyze(finalText) {
    const result = {
      isValid: true,
      suspiciousLevel: 0,
      reasons: [],
      metrics: {},
      warnings: [],
      deviceInfo: this.deviceInfo
    }
    
    if (!finalText || finalText.length === 0) {
      return { ...result, isValid: false, reasons: ['Empty text'] }
    }
    
    const config = this.config
    const isMobile = this.deviceInfo.isMobile || this.deviceInfo.isTablet
    
    const totalTime = this.lastKeystrokeTime && this.startTime 
      ? (this.lastKeystrokeTime - this.startTime) / 1000 / 60
      : 0
    
    // 1. ตรวจสอบ Keystroke Ratio (ปรับตาม device)
    const keystrokeRatio = this.totalCharactersTyped / finalText.length
    result.metrics.keystrokeRatio = keystrokeRatio
    
    if (keystrokeRatio < config.MIN_KEYSTROKE_RATIO) {
      // Mobile ได้ penalty น้อยกว่าเพราะมี autocomplete/swipe typing
      // 🆕 ลด penalty และเพิ่ม tolerance
      const penalty = isMobile ? 10 : 20
      result.suspiciousLevel += penalty
      result.warnings.push(`Low keystroke ratio: ${(keystrokeRatio * 100).toFixed(1)}% (expected ≥${config.MIN_KEYSTROKE_RATIO * 100}% for ${config.deviceType})`)
    }
    
    // 2. ตรวจสอบ Typing Speed (ปรับตาม device)
    const typingSpeed = totalTime > 0 ? finalText.length / totalTime : 0
    result.metrics.typingSpeed = typingSpeed
    
    if (typingSpeed > config.MAX_NORMAL_TYPING_SPEED) {
      result.suspiciousLevel += 25
      result.reasons.push(`Unusually fast typing: ${typingSpeed.toFixed(0)} CPM (max for ${config.deviceType}: ${config.MAX_NORMAL_TYPING_SPEED} CPM)`)
    }
    
    // 3. ตรวจสอบ Paste Events
    if (this.pasteEvents.length > 0) {
      result.suspiciousLevel += 40
      result.reasons.push(`Paste events detected: ${this.pasteEvents.length} times`)
    }
    
    // 4. ตรวจสอบ Burst Typing (ปรับตาม device)
    const burstCount = this.burstBuffer.length
    if (burstCount > config.BURST_CHAR_THRESHOLD) {
      const penalty = isMobile ? 15 : 20
      result.suspiciousLevel += penalty
      result.warnings.push(`Burst typing detected: ${burstCount} chars in ${config.BURST_TIME_WINDOW / 1000}s`)
    }
    
    // 5. ตรวจสอบ Sudden Jumps (ปรับตาม device)
    const suspiciousJumps = this.characterInsertionHistory.filter(h => 
      h.lengthDiff > config.SUDDEN_JUMP_THRESHOLD && h.timeSinceLast < config.SUDDEN_JUMP_TIME
    )
    if (suspiciousJumps.length > 0) {
      // Mobile: ผ่อนปรนถ้า jump ไม่ใหญ่มาก (อาจเป็น autocomplete/prediction)
      // 🆕 เพิ่ม threshold และลด penalty
      const bigJumps = suspiciousJumps.filter(j => j.lengthDiff > 40) // เพิ่มจาก 25 เป็น 40
      if (bigJumps.length > 0 || !isMobile) {
        const penalty = isMobile ? 15 : 25 // ลด penalty
        result.suspiciousLevel += penalty
        result.warnings.push(`Sudden text jumps: ${suspiciousJumps.length} instances`)
      } else {
        // ไม่เพิ่ม penalty สำหรับ small jumps บน mobile
        result.metrics.autocompleteJumps = suspiciousJumps.length
      }
    }
    
    // 6. ตรวจสอบ Correction Rate
    const correctionRate = this.totalCharactersTyped > 0 
      ? this.corrections / this.totalCharactersTyped 
      : 0
    result.metrics.correctionRate = correctionRate
    
    // Mobile: มี autocorrect จึงอาจมี correction น้อย
    const minCorrectionThreshold = isMobile ? 0.005 : 0.01
    if (correctionRate < minCorrectionThreshold && finalText.length > 50) {
      result.warnings.push(`Very low correction rate: ${(correctionRate * 100).toFixed(2)}%`)
      result.suspiciousLevel += isMobile ? 5 : 10
    }
    
    // 7. ตรวจสอบ Keystroke Intervals (PC focused)
    if (!isMobile && this.keystrokes.length > 10) {
      const intervals = this.keystrokes
        .filter(k => k.timeSinceLast > 0)
        .map(k => k.timeSinceLast)
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const tooFastCount = intervals.filter(i => i < config.MIN_KEYSTROKE_INTERVAL).length
      const tooFastRatio = tooFastCount / intervals.length
      
      result.metrics.avgKeystrokeInterval = avgInterval
      result.metrics.tooFastKeystrokeRatio = tooFastRatio
      
      if (tooFastRatio > 0.5) {
        result.suspiciousLevel += 15
        result.warnings.push(`Too many fast keystrokes: ${(tooFastRatio * 100).toFixed(1)}%`)
      }
    }
    
    // 8. 🆕 Mobile-specific: ตรวจสอบ focus lost และ app switch
    if (isMobile) {
      if (this.focusLostCount > 3) {
        result.suspiciousLevel += 10
        result.warnings.push(`Focus lost ${this.focusLostCount} times (possible app switching)`)
      }
      if (this.appSwitchCount > 2) {
        result.suspiciousLevel += 15
        result.warnings.push(`App switched ${this.appSwitchCount} times`)
      }
      
      // Mobile autocomplete ถือเป็นปกติ
      if (this.autocompleteEvents.length > 0) {
        result.metrics.autocompleteCount = this.autocompleteEvents.length
        // ไม่เพิ่ม suspiciousLevel
      }
    }
    
    // 9. ตรวจสอบ Suspicious Patterns ใน text
    const patternResults = detectTextPatterns(finalText)
    if (patternResults.suspicious) {
      result.suspiciousLevel += patternResults.score
      result.reasons.push(...patternResults.reasons)
    }
    
    // คำนวณผลสุดท้าย
    result.suspiciousLevel = Math.min(100, result.suspiciousLevel)
    // 🆕 เพิ่ม threshold เป็น 70 เพื่อลด false positive
    result.isValid = result.suspiciousLevel < 70
    
    // เพิ่ม summary
    result.summary = {
      totalKeystrokes: this.keystrokes.length,
      totalTouchInputs: this.touchEvents.length,
      totalCharactersTyped: this.totalCharactersTyped,
      deletions: this.deletions,
      corrections: this.corrections,
      pasteAttempts: this.pasteEvents.length,
      totalTimeSeconds: totalTime * 60,
      deviceType: this.deviceInfo.type,
      autocompleteCount: this.autocompleteEvents.length,
      focusLostCount: this.focusLostCount,
      appSwitchCount: this.appSwitchCount
    }
    
    return result
  }
}

/**
 * ตรวจสอบ patterns ที่น่าสงสัยใน text
 */
function detectTextPatterns(text) {
  const result = {
    suspicious: false,
    score: 0,
    reasons: []
  }
  
  if (!text) return result
  
  // 1. Multiple spaces (มักเกิดจาก copy จาก Word/PDF)
  if (SUSPICIOUS_PATTERNS.multipleSpaces.test(text)) {
    result.score += 10
    result.reasons.push('Multiple consecutive spaces detected')
  }
  
  // 2. Tabs
  if (SUSPICIOUS_PATTERNS.tabs.test(text)) {
    result.score += 15
    result.reasons.push('Tab characters detected')
  }
  
  // 3. Unusual characters
  if (SUSPICIOUS_PATTERNS.unusualCharacters.test(text)) {
    result.score += 10
    result.reasons.push('Unusual characters detected')
  }
  
  // 4. Citation patterns
  if (SUSPICIOUS_PATTERNS.citationPatterns.test(text)) {
    result.score += 25
    result.reasons.push('Academic citation patterns detected (possible copy from research paper)')
  }
  
  // 5. Wiki patterns
  if (SUSPICIOUS_PATTERNS.wikiPatterns.test(text)) {
    result.score += 30
    result.reasons.push('Wikipedia markup patterns detected')
  }
  
  // 6. ตรวจสอบความยาวคำเฉลี่ย (copy จาก academic text มักมีคำยาว)
  const words = text.split(/\s+/).filter(w => w.length > 0)
  if (words.length > 0) {
    const avgWordLength = text.replace(/\s+/g, '').length / words.length
    if (avgWordLength > 12) {
      result.score += 15
      result.reasons.push(`Unusually long average word length: ${avgWordLength.toFixed(1)} chars`)
    }
  }
  
  // 7. ตรวจสอบ mixed scripts ที่ผิดปกติ
  const thaiChars = (text.match(/[\u0E00-\u0E7F]/g) || []).length
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length
  const totalAlpha = thaiChars + englishChars
  
  if (totalAlpha > 50) {
    const scriptSwitches = countScriptSwitches(text)
    const switchRatio = scriptSwitches / text.length
    
    if (switchRatio > 0.1) {
      result.score += 10
      result.reasons.push(`Frequent script switching: ${scriptSwitches} switches`)
    }
  }
  
  result.suspicious = result.score > 0
  return result
}

/**
 * นับจำนวนครั้งที่เปลี่ยน script (ไทย <-> อังกฤษ)
 */
function countScriptSwitches(text) {
  let switches = 0
  let currentScript = null
  
  for (const char of text) {
    let charScript = null
    
    if (/[\u0E00-\u0E7F]/.test(char)) {
      charScript = 'thai'
    } else if (/[a-zA-Z]/.test(char)) {
      charScript = 'english'
    }
    
    if (charScript && currentScript && charScript !== currentScript) {
      switches++
    }
    
    if (charScript) {
      currentScript = charScript
    }
  }
  
  return switches
}

/**
 * ตรวจสอบความคล้ายคลึงของ text (สำหรับ server-side)
 * ใช้ Jaccard Similarity
 */
function calculateTextSimilarity(text1, text2) {
  if (!text1 || !text2) return 0
  
  // Tokenize by words
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  
  // Calculate Jaccard similarity
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  
  return union.size > 0 ? intersection.size / union.size : 0
}

/**
 * สร้าง typing fingerprint สำหรับส่งไป server
 */
function createTypingFingerprint(tracker) {
  return {
    keystrokeCount: tracker.keystrokes.length,
    touchInputCount: tracker.touchEvents?.length || 0,
    totalCharactersTyped: tracker.totalCharactersTyped,
    deletionCount: tracker.deletions,
    correctionCount: tracker.corrections,
    pasteEventCount: tracker.pasteEvents.length,
    typingDurationMs: tracker.lastKeystrokeTime && tracker.startTime 
      ? tracker.lastKeystrokeTime - tracker.startTime 
      : 0,
    keystrokeIntervals: tracker.keystrokes
      .filter(k => k.timeSinceLast > 0 && k.timeSinceLast < 5000)
      .slice(-50)
      .map(k => k.timeSinceLast),
    suspiciousJumps: tracker.characterInsertionHistory
      .filter(h => h.lengthDiff > 20 && h.timeSinceLast < 500)
      .map(h => ({ lengthDiff: h.lengthDiff, timeSinceLast: h.timeSinceLast })),
    // 🆕 Device info
    deviceInfo: tracker.deviceInfo,
    // 🆕 Mobile-specific
    autocompleteCount: tracker.autocompleteEvents?.length || 0,
    focusLostCount: tracker.focusLostCount || 0,
    appSwitchCount: tracker.appSwitchCount || 0
  }
}

// Export
export {
  TypingTracker,
  detectTextPatterns,
  calculateTextSimilarity,
  createTypingFingerprint,
  getDeviceInfo,
  getDeviceConfig,
  isMobileDevice,
  isTabletDevice,
  PC_CONFIG,
  MOBILE_CONFIG,
  TABLET_CONFIG,
  SUSPICIOUS_PATTERNS
}
