/**
 * 🔍 Gibberish Detection Module
 * 
 * ระบบตรวจจับข้อความไร้ความหมาย/มั่ว
 * ป้องกันการเพิ่มภาระครูโดยกรองคำตอบที่ไม่มีสาระออกก่อนส่ง Human Review
 * 
 * Detection Categories:
 * 1. Repeated Characters - ตัวอักษรซ้ำๆ (กกกกก, aaaaa)
 * 2. Keyboard Smash - พิมพ์มั่ว (asdfgh, qwerty)
 * 3. Random Thai - พิมพ์ไทยมั่ว (ฟหกดเ, ดกดกด)
 * 4. Low Entropy - ความหลากหลายต่ำ
 * 5. No Real Words - ไม่มีคำจริงในภาษา
 * 6. Excessive Punctuation - เครื่องหมายวรรคตอนเกิน
 * 7. Meaningless Patterns - รูปแบบไร้ความหมาย
 * 
 * @version 1.0.0
 * @since 2025-12-29
 */

/**
 * 📊 Detection Configuration
 */
const GIBBERISH_CONFIG = {
  // Minimum text length to analyze (shorter = auto-reject)
  minLengthForAnalysis: 20,
  
  // Thresholds for gibberish detection
  thresholds: {
    repeatedCharRatio: 0.4,      // > 40% same char = gibberish (lowered from 0.5)
    uniqueCharRatio: 0.1,        // < 10% unique chars = low entropy (lowered from 0.15)
    punctuationRatio: 0.25,      // > 25% punctuation = excessive (lowered from 0.3)
    consonantOnlyRatio: 0.7,     // > 70% consonants only = keyboard smash (lowered from 0.8)
    realWordRatio: 0.25,         // < 25% real words = likely gibberish (lowered from 0.3)
    maxConsecutiveRepeats: 3,    // > 3 same char in row = suspicious (lowered from 4)
    minWordVariety: 3,           // < 3 unique words = too repetitive
  },
  
  // Gibberish score threshold (0-100)
  gibberishThreshold: 50,  // >= 50 = definitely gibberish (lowered from 60)
  suspiciousThreshold: 35, // >= 35 = suspicious, needs AI confirmation (lowered from 40)
}

/**
 * 🔤 Common keyboard patterns (mashing)
 */
const KEYBOARD_PATTERNS = {
  // English QWERTY patterns
  english: [
    'qwerty', 'asdfgh', 'zxcvbn', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
    'qazwsx', 'wsxedc', 'edcrfv', 'rfvtgb', 'tgbyhn', 'yhnujm',
    'qweasd', 'asdqwe', 'asdzxc', 'zxcasd',
    'abcdef', 'bcdefg', 'cdefgh', 'defghi', '123456', '654321',
    'aaaaaa', 'bbbbbb', 'gggggg', 'hhhhhh', // Single char repetition
  ],
  // Thai keyboard patterns (ฟหกด equivalent positions)
  thai: [
    'ฟหกด', 'เ้าส', 'ๆไำพ', 'ดเ้า', 'กดเา', 'หกดา',
    'ฟหกดส', 'เ้าสว', 'ๆไำพะ', 'ดกดก', 'เาเา', 'สวสว',
    'ไไไไ', 'เเเเ', 'าาาา', 'สสสส', 'ดดดด', 'กกกก',
  ]
}

/**
 * 📝 Common Thai stop words (real words to check against)
 */
const THAI_COMMON_WORDS = new Set([
  // Pronouns
  'ผม', 'ฉัน', 'เรา', 'คุณ', 'เขา', 'มัน', 'พวก', 'ใคร', 'อะไร',
  // Verbs
  'เป็น', 'มี', 'ทำ', 'ไป', 'มา', 'ให้', 'ได้', 'คิด', 'รู้', 'เห็น', 'พูด', 'ต้อง', 'อยาก', 'ชอบ',
  // Connectors
  'และ', 'หรือ', 'แต่', 'เพราะ', 'ถ้า', 'เมื่อ', 'จึง', 'แล้ว', 'ก็', 'ยัง', 'ที่', 'ซึ่ง',
  // Common nouns
  'คน', 'สิ่ง', 'เรื่อง', 'ปัญหา', 'วิธี', 'ความ', 'การ', 'ความคิด', 'ผล', 'เหตุ',
  // Question words
  'ทำไม', 'อย่างไร', 'เท่าไหร่', 'กี่', 'ไหน',
  // Adjectives/Adverbs
  'ดี', 'มาก', 'น้อย', 'ใหม่', 'เก่า', 'สำคัญ', 'จริง', 'เหมือน', 'ต่าง', 'อื่น',
  // Time
  'วัน', 'เวลา', 'ตอน', 'ครั้ง', 'ทุก', 'บาง', 'แรก', 'สุดท้าย', 'ต่อไป',
  // Numbers
  'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า', 'สิบ', 'ร้อย', 'พัน',
  // Academic
  'ว่า', 'ตัวอย่าง', 'เช่น', 'กล่าว', 'นอกจาก', 'ด้วย', 'โดย', 'กับ', 'จาก', 'ถึง', 'สำหรับ',
])

/**
 * 📝 Common English words
 */
const ENGLISH_COMMON_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'because', 'however', 'therefore', 'example', 'reason', 'evidence', 'analysis',
])

/**
 * 🔍 Main Gibberish Detection Function
 * 
 * @param {string} text - Text to analyze
 * @returns {Object} Detection result
 */
function detectGibberish(text) {
  if (!text || typeof text !== 'string') {
    return {
      isGibberish: true,
      confidence: 100,
      score: 100,
      reason: 'Empty or invalid input',
      signals: ['no_text'],
      recommendation: 'reject'
    }
  }

  const cleanText = text.trim()
  
  // Too short to analyze properly
  if (cleanText.length < GIBBERISH_CONFIG.minLengthForAnalysis) {
    return {
      isGibberish: true,
      confidence: 95,
      score: 95,
      reason: `Text too short (${cleanText.length} chars, minimum ${GIBBERISH_CONFIG.minLengthForAnalysis})`,
      signals: ['too_short'],
      recommendation: 'reject'
    }
  }

  // 🆕 Quick early exit for EXTREME cases (all same char, pure keyboard smash)
  const quickResult = quickExtremeCheck(cleanText)
  if (quickResult.isExtreme) {
    return {
      isGibberish: true,
      isSuspicious: false,
      confidence: 98,
      score: 95,
      reason: quickResult.reason,
      signals: [quickResult.signal],
      details: [{ type: quickResult.signal, description: quickResult.reason }],
      recommendation: 'reject',
      thresholdsUsed: {
        gibberish: GIBBERISH_CONFIG.gibberishThreshold,
        suspicious: GIBBERISH_CONFIG.suspiciousThreshold
      }
    }
  }

  // Run all detection checks
  const signals = []
  let totalScore = 0
  let maxScore = 0

  // Check 1: Repeated Characters (weight: 30) - increased from 25
  const repeatedCheck = checkRepeatedCharacters(cleanText)
  if (repeatedCheck.detected) {
    signals.push({ type: 'repeated_chars', ...repeatedCheck })
    totalScore += repeatedCheck.score * 30  // weight 30
  }
  maxScore += 30

  // Check 2: Low Entropy / Unique Characters (weight: 25)
  const entropyCheck = checkLowEntropy(cleanText)
  if (entropyCheck.detected) {
    signals.push({ type: 'low_entropy', ...entropyCheck })
    totalScore += entropyCheck.score * 25  // weight 25
  }
  maxScore += 25

  // Check 3: Keyboard Smash Patterns (weight: 30) - increased
  const keyboardCheck = checkKeyboardPatterns(cleanText)
  if (keyboardCheck.detected) {
    signals.push({ type: 'keyboard_smash', ...keyboardCheck })
    totalScore += keyboardCheck.score * 30  // weight 30
  }
  maxScore += 30

  // Check 4: Real Word Ratio (weight: 25)
  const wordCheck = checkRealWords(cleanText)
  if (wordCheck.detected) {
    signals.push({ type: 'no_real_words', ...wordCheck })
    totalScore += wordCheck.score * 25  // weight 25
  }
  maxScore += 25

  // Check 5: Excessive Punctuation (weight: 15)
  const punctuationCheck = checkExcessivePunctuation(cleanText)
  if (punctuationCheck.detected) {
    signals.push({ type: 'excessive_punctuation', ...punctuationCheck })
    totalScore += punctuationCheck.score * 15  // weight 15
  }
  maxScore += 15

  // Check 6: Meaningless Patterns (weight: 15)
  const patternCheck = checkMeaninglessPatterns(cleanText)
  if (patternCheck.detected) {
    signals.push({ type: 'meaningless_patterns', ...patternCheck })
    totalScore += patternCheck.score * 15  // weight 15
  }
  maxScore += 15

  // Calculate normalized score (0-100)
  const normalizedScore = Math.round((totalScore / maxScore) * 100)
  
  // Determine result
  const isGibberish = normalizedScore >= GIBBERISH_CONFIG.gibberishThreshold
  const isSuspicious = normalizedScore >= GIBBERISH_CONFIG.suspiciousThreshold
  
  // Calculate confidence in our detection
  let confidence = normalizedScore
  if (signals.length >= 3) confidence = Math.min(100, confidence + 10)
  if (signals.length >= 4) confidence = Math.min(100, confidence + 10)

  return {
    isGibberish,
    isSuspicious: !isGibberish && isSuspicious,
    confidence: Math.min(100, confidence),
    score: normalizedScore,
    reason: generateReason(signals, normalizedScore),
    signals: signals.map(s => s.type),
    details: signals,
    recommendation: isGibberish ? 'reject' : (isSuspicious ? 'flag' : 'pass'),
    thresholdsUsed: {
      gibberish: GIBBERISH_CONFIG.gibberishThreshold,
      suspicious: GIBBERISH_CONFIG.suspiciousThreshold
    }
  }
}

/**
 * 🚨 Quick check for EXTREME gibberish cases
 * Early exit for obvious cases to save computation
 */
function quickExtremeCheck(text) {
  const cleanText = text.replace(/\s/g, '')
  if (cleanText.length === 0) {
    return { isExtreme: true, signal: 'empty', reason: 'ข้อความว่างเปล่า' }
  }
  
  // Check 1: Almost all same character (>= 80%)
  const charCounts = {}
  for (const char of cleanText) {
    charCounts[char] = (charCounts[char] || 0) + 1
  }
  const maxCount = Math.max(...Object.values(charCounts))
  const dominantRatio = maxCount / cleanText.length
  
  if (dominantRatio >= 0.8) {
    return { 
      isExtreme: true, 
      signal: 'repeated_chars', 
      reason: `ตัวอักษรเดียวซ้ำ ${Math.round(dominantRatio * 100)}%` 
    }
  }
  
  // Check 2: Very low unique character ratio (< 5%)
  const uniqueRatio = Object.keys(charCounts).length / cleanText.length
  if (uniqueRatio < 0.05) {
    return { 
      isExtreme: true, 
      signal: 'low_entropy', 
      reason: `ตัวอักษรที่ไม่ซ้ำน้อยมาก ${Math.round(uniqueRatio * 100)}%` 
    }
  }
  
  // Check 3: Contains obvious keyboard patterns
  const lowerText = text.toLowerCase()
  const extremePatterns = [
    'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
    'qwerty', 'asdfgh', 'zxcvbn',
    'ฟหกดเ', 'ๆไำพะ'
  ]
  
  for (const pattern of extremePatterns) {
    // Check if pattern appears multiple times or is large portion of text
    const regex = new RegExp(pattern, 'gi')
    const matches = text.match(regex)
    if (matches && (matches.length >= 2 || pattern.length > cleanText.length * 0.3)) {
      return { 
        isExtreme: true, 
        signal: 'keyboard_smash', 
        reason: `พบรูปแบบ keyboard "${pattern}" ${matches.length} ครั้ง` 
      }
    }
  }
  
  // Check 4: All punctuation / numbers only
  const punctAndNum = cleanText.match(/[0-9!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|~`\-]/g) || []
  if (punctAndNum.length / cleanText.length > 0.85) {
    return { 
      isExtreme: true, 
      signal: 'excessive_punctuation', 
      reason: 'เครื่องหมายวรรคตอน/ตัวเลขเกือบทั้งหมด' 
    }
  }
  
  return { isExtreme: false }
}

/**
 * Check for repeated characters
 */
function checkRepeatedCharacters(text) {
  const { maxConsecutiveRepeats, repeatedCharRatio } = GIBBERISH_CONFIG.thresholds
  
  // Check consecutive repeats
  let maxConsecutive = 1
  let currentConsecutive = 1
  
  for (let i = 1; i < text.length; i++) {
    if (text[i] === text[i - 1] && text[i] !== ' ') {
      currentConsecutive++
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
    } else {
      currentConsecutive = 1
    }
  }

  // Check overall repeated char ratio
  const charCounts = {}
  for (const char of text.replace(/\s/g, '')) {
    charCounts[char] = (charCounts[char] || 0) + 1
  }
  
  const totalChars = text.replace(/\s/g, '').length
  const maxCharCount = Math.max(...Object.values(charCounts))
  const repeatRatio = totalChars > 0 ? maxCharCount / totalChars : 0

  const hasLongRepeats = maxConsecutive > maxConsecutiveRepeats
  const hasHighRepeatRatio = repeatRatio > repeatedCharRatio

  const detected = hasLongRepeats || hasHighRepeatRatio
  let score = 0
  if (hasLongRepeats) score += 0.5
  if (hasHighRepeatRatio) score += 0.5

  return {
    detected,
    score,
    maxConsecutive,
    repeatRatio: Math.round(repeatRatio * 100) / 100,
    description: detected 
      ? `พบตัวอักษรซ้ำ ${maxConsecutive} ครั้งติดกัน, อัตราส่วนซ้ำ ${Math.round(repeatRatio * 100)}%`
      : null
  }
}

/**
 * Check for low entropy (character variety)
 */
function checkLowEntropy(text) {
  const { uniqueCharRatio, minWordVariety } = GIBBERISH_CONFIG.thresholds
  
  const cleanText = text.replace(/\s/g, '').toLowerCase()
  if (cleanText.length === 0) return { detected: true, score: 1 }
  
  const uniqueChars = new Set(cleanText).size
  const ratio = uniqueChars / cleanText.length
  
  // Also check word variety
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 1)
  const uniqueWords = new Set(words).size
  
  const hasLowCharEntropy = ratio < uniqueCharRatio
  const hasLowWordVariety = words.length > 3 && uniqueWords < minWordVariety

  const detected = hasLowCharEntropy || hasLowWordVariety
  let score = 0
  if (hasLowCharEntropy) score += 0.6
  if (hasLowWordVariety) score += 0.4

  return {
    detected,
    score,
    uniqueCharRatio: Math.round(ratio * 100) / 100,
    uniqueWords,
    description: detected
      ? `ความหลากหลายต่ำ: ${uniqueChars} ตัวอักษรจาก ${cleanText.length}, ${uniqueWords} คำที่ไม่ซ้ำ`
      : null
  }
}

/**
 * Check for keyboard smash patterns
 */
function checkKeyboardPatterns(text) {
  const lowerText = text.toLowerCase()
  let matchedPatterns = []
  
  // Check English patterns
  for (const pattern of KEYBOARD_PATTERNS.english) {
    if (lowerText.includes(pattern)) {
      matchedPatterns.push(pattern)
    }
  }
  
  // Check Thai patterns
  for (const pattern of KEYBOARD_PATTERNS.thai) {
    if (text.includes(pattern)) {
      matchedPatterns.push(pattern)
    }
  }

  // Check for consonant-only sequences (Thai or English)
  const thaiConsonants = /[ก-ฮ]{6,}/g
  const englishConsonants = /[bcdfghjklmnpqrstvwxyz]{5,}/gi
  
  const thaiConsonantMatches = text.match(thaiConsonants) || []
  const englishConsonantMatches = text.match(englishConsonants) || []
  
  if (thaiConsonantMatches.length > 0) {
    matchedPatterns.push(`Thai consonants: ${thaiConsonantMatches.join(', ')}`)
  }
  if (englishConsonantMatches.length > 0) {
    matchedPatterns.push(`English consonants: ${englishConsonantMatches.join(', ')}`)
  }

  const detected = matchedPatterns.length > 0
  const score = Math.min(1, matchedPatterns.length * 0.3)

  return {
    detected,
    score,
    matchedPatterns,
    description: detected
      ? `พบรูปแบบ keyboard smash: ${matchedPatterns.slice(0, 3).join(', ')}`
      : null
  }
}

/**
 * Check real word ratio
 */
function checkRealWords(text) {
  const { realWordRatio } = GIBBERISH_CONFIG.thresholds
  
  // Extract words (Thai and English)
  const words = text.split(/[\s,.\-!?]+/).filter(w => w.length >= 2)
  if (words.length === 0) return { detected: true, score: 1, reason: 'No words found' }
  
  let realWordCount = 0
  let checkedWords = []
  
  for (const word of words) {
    const lowerWord = word.toLowerCase()
    
    // Check if it's a Thai word
    if (/[\u0E00-\u0E7F]/.test(word)) {
      // For Thai, check if it contains common words/particles
      const isLikelyReal = THAI_COMMON_WORDS.has(word) || 
                          word.length >= 3 && /[ะาิีึืุูเแโใไ็่้๊๋ๆ]/.test(word)
      if (isLikelyReal) {
        realWordCount++
        checkedWords.push({ word, language: 'thai', real: true })
      } else {
        checkedWords.push({ word, language: 'thai', real: false })
      }
    }
    // Check if it's an English word
    else if (/[a-zA-Z]/.test(word)) {
      const isLikelyReal = ENGLISH_COMMON_WORDS.has(lowerWord) || 
                          (word.length >= 4 && /[aeiou]/i.test(word))
      if (isLikelyReal) {
        realWordCount++
        checkedWords.push({ word, language: 'english', real: true })
      } else {
        checkedWords.push({ word, language: 'english', real: false })
      }
    }
  }

  const ratio = realWordCount / words.length
  const detected = ratio < realWordRatio

  return {
    detected,
    score: detected ? Math.max(0, 1 - ratio) : 0,
    realWordRatio: Math.round(ratio * 100) / 100,
    totalWords: words.length,
    realWords: realWordCount,
    description: detected
      ? `คำที่มีความหมาย ${realWordCount}/${words.length} (${Math.round(ratio * 100)}%)`
      : null
  }
}

/**
 * Check for excessive punctuation
 */
function checkExcessivePunctuation(text) {
  const { punctuationRatio } = GIBBERISH_CONFIG.thresholds
  
  const punctuation = text.match(/[!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|~`\-]/g) || []
  const ratio = text.length > 0 ? punctuation.length / text.length : 0
  
  const detected = ratio > punctuationRatio

  return {
    detected,
    score: detected ? Math.min(1, ratio / punctuationRatio) : 0,
    punctuationRatio: Math.round(ratio * 100) / 100,
    description: detected
      ? `เครื่องหมายวรรคตอนมากเกิน ${Math.round(ratio * 100)}%`
      : null
  }
}

/**
 * Check for meaningless patterns
 */
function checkMeaninglessPatterns(text) {
  const patterns = []
  
  // Pattern 1: All same character word repeated
  const sameCharWordPattern = /\b(.)\1{3,}\b/g
  const sameCharMatches = text.match(sameCharWordPattern)
  if (sameCharMatches && sameCharMatches.length > 0) {
    patterns.push(`คำตัวเดียวซ้ำ: ${sameCharMatches.join(', ')}`)
  }
  
  // Pattern 2: Alternating characters (abababab)
  const alternatingPattern = /(.)\1*(.)\2*\1\2{2,}/g
  const alternatingMatches = text.match(alternatingPattern)
  if (alternatingMatches && alternatingMatches.length > 1) {
    patterns.push(`รูปแบบสลับ: ${alternatingMatches.slice(0, 2).join(', ')}`)
  }
  
  // Pattern 3: Number spam
  const numberSpam = text.match(/\d{10,}/g)
  if (numberSpam && numberSpam.length > 0) {
    patterns.push(`ตัวเลขยาว: ${numberSpam.join(', ')}`)
  }
  
  // Pattern 4: Random Thai vowels/tone marks without consonants
  const floatingMarks = text.match(/[่้๊๋ะาิีึืุูเแโใไๆ]{3,}/g)
  if (floatingMarks && floatingMarks.length > 0) {
    patterns.push(`สระ/วรรณยุกต์ลอย: ${floatingMarks.join(', ')}`)
  }
  
  // Pattern 5: Copy-paste artifacts
  const copyPaste = text.match(/(.{10,})\1{2,}/g)
  if (copyPaste && copyPaste.length > 0) {
    patterns.push('ข้อความซ้ำ copy-paste')
  }

  const detected = patterns.length > 0
  const score = Math.min(1, patterns.length * 0.3)

  return {
    detected,
    score,
    patterns,
    description: detected ? patterns.join('; ') : null
  }
}

/**
 * Generate human-readable reason
 */
function generateReason(signals, score) {
  if (signals.length === 0) {
    return 'ข้อความดูปกติ'
  }
  
  const reasons = signals
    .filter(s => s.description)
    .map(s => s.description)
  
  if (score >= GIBBERISH_CONFIG.gibberishThreshold) {
    return `ข้อความไร้ความหมาย (${score}%): ${reasons.slice(0, 2).join(', ')}`
  } else if (score >= GIBBERISH_CONFIG.suspiciousThreshold) {
    return `ข้อความน่าสงสัย (${score}%): ${reasons.slice(0, 2).join(', ')}`
  }
  
  return 'ข้อความดูปกติ'
}

/**
 * 🚀 Quick Gibberish Check (lightweight)
 * For fast validation before full analysis
 */
function quickGibberishCheck(text) {
  if (!text || text.trim().length < GIBBERISH_CONFIG.minLengthForAnalysis) {
    return { isGibberish: true, reason: 'too_short' }
  }
  
  const cleanText = text.trim()
  
  // Quick check 1: Repeated char ratio
  const charCounts = {}
  for (const char of cleanText.replace(/\s/g, '')) {
    charCounts[char] = (charCounts[char] || 0) + 1
  }
  const maxCount = Math.max(...Object.values(charCounts))
  const repeatRatio = maxCount / cleanText.replace(/\s/g, '').length
  
  if (repeatRatio > 0.6) {
    return { isGibberish: true, reason: 'high_repeat_ratio' }
  }
  
  // Quick check 2: Common keyboard patterns
  const lowerText = cleanText.toLowerCase()
  for (const pattern of ['qwerty', 'asdfgh', 'zxcvbn', 'ฟหกด', 'เ้าส']) {
    if (lowerText.includes(pattern)) {
      return { isGibberish: true, reason: 'keyboard_pattern' }
    }
  }
  
  // Quick check 3: Too few unique characters
  const uniqueRatio = new Set(cleanText.replace(/\s/g, '')).size / cleanText.replace(/\s/g, '').length
  if (uniqueRatio < 0.1) {
    return { isGibberish: true, reason: 'very_low_entropy' }
  }
  
  return { isGibberish: false, reason: null }
}

/**
 * 📊 Get Gibberish Summary Statistics
 * For analytics and monitoring
 */
function getGibberishStats(text) {
  const result = detectGibberish(text)
  return {
    score: result.score,
    isGibberish: result.isGibberish,
    isSuspicious: result.isSuspicious,
    signalCount: result.signals.length,
    recommendation: result.recommendation
  }
}

module.exports = {
  detectGibberish,
  quickGibberishCheck,
  getGibberishStats,
  GIBBERISH_CONFIG,
  KEYBOARD_PATTERNS,
  THAI_COMMON_WORDS,
  ENGLISH_COMMON_WORDS
}
