/**
 * 🎯 Question Difficulty & Adaptive Selection Module
 * 
 * ระบบจัดการความยากของคำถามและการเลือกคำถามแบบ Adaptive
 * อิงทฤษฎี Vygotsky's ZPD และ Item Response Theory (IRT)
 * 
 * Features:
 * 1. Difficulty classification (1-5 scale)
 * 2. Adaptive question selection based on student performance
 * 3. Difficulty ladder progression
 * 4. Mastery threshold management
 * 5. Anti-frustration mechanics
 * 
 * References:
 * - Vygotsky, L. S. (1978). Zone of Proximal Development
 * - Rasch, G. (1960). Item Response Theory
 * - Csikszentmihalyi, M. (1990). Flow Theory
 * 
 * @module questionDifficulty
 * @version 1.0.0
 */

/**
 * Difficulty Levels
 * Based on Bloom's Taxonomy complexity + expected student performance
 */
const DIFFICULTY_LEVELS = {
  VERY_EASY: {
    level: 1,
    name: 'ง่ายมาก',
    description: 'ความจำ/ความเข้าใจพื้นฐาน',
    bloomLevels: ['Remember', 'Understand'],
    expectedPassRate: 0.85,  // 85% ของนักเรียนควรทำได้
    minScore: 8,             // คะแนนขั้นต่ำที่คาดหวัง (out of 20)
    icon: '🌱'
  },
  EASY: {
    level: 2,
    name: 'ง่าย',
    description: 'การประยุกต์ใช้เบื้องต้น',
    bloomLevels: ['Apply'],
    expectedPassRate: 0.70,
    minScore: 10,
    icon: '🌿'
  },
  MEDIUM: {
    level: 3,
    name: 'ปานกลาง',
    description: 'การวิเคราะห์และสังเคราะห์',
    bloomLevels: ['Analyze'],
    expectedPassRate: 0.55,
    minScore: 12,
    icon: '🌳'
  },
  HARD: {
    level: 4,
    name: 'ยาก',
    description: 'การประเมินค่าและตัดสิน',
    bloomLevels: ['Evaluate'],
    expectedPassRate: 0.40,
    minScore: 14,
    icon: '🌲'
  },
  VERY_HARD: {
    level: 5,
    name: 'ยากมาก',
    description: 'การสร้างสรรค์และบูรณาการ',
    bloomLevels: ['Create'],
    expectedPassRate: 0.25,
    minScore: 16,
    icon: '🏔️'
  }
}

/**
 * Adaptive Selection Configuration
 */
const ADAPTIVE_CONFIG = {
  // Mastery thresholds
  masteryThreshold: 0.70,      // 70% เพื่อเลื่อนระดับ
  frustrationThreshold: 0.30,  // ต่ำกว่า 30% = ลดระดับ
  
  // Progression rules
  successesToLevelUp: 2,       // ต้องผ่าน 2 ครั้งติดต่อกันเพื่อเลื่อนระดับ
  failuresToLevelDown: 3,      // fail 3 ครั้งติดต่อกันจึงลดระดับ
  
  // Anti-frustration
  maxConsecutiveHard: 2,       // ไม่ให้คำถามยากติดต่อกันเกิน 2 ข้อ
  cooldownAfterFail: 1,        // หลัง fail ให้ข้อง่ายกว่า 1 ข้อ
  
  // Starting difficulty per grade level
  startingDifficulty: {
    'ป.4': 1, 'ป.5': 1, 'ป.6': 2,
    'ม.1': 2, 'ม.2': 2, 'ม.3': 3,
    'ม.4': 3, 'ม.5': 3, 'ม.6': 4
  }
}

/**
 * 🔍 Analyze question to determine difficulty
 * ใช้ heuristics + optional AI analysis
 * 
 * @param {Object} question - Question object
 * @returns {Object} Difficulty analysis result
 */
function analyzeQuestionDifficulty(question) {
  const analysis = {
    suggestedLevel: 3, // Default: Medium
    factors: [],
    confidence: 0.5
  }

  const text = question.question || question.text || ''
  const context = question.context || ''
  const combinedText = `${text} ${context}`.toLowerCase()

  // Factor 1: Question length (longer = potentially more complex)
  const wordCount = combinedText.split(/\s+/).length
  if (wordCount > 100) {
    analysis.factors.push({ factor: 'length', adjustment: +1, reason: 'คำถามยาว ต้องอ่านเยอะ' })
  } else if (wordCount < 30) {
    analysis.factors.push({ factor: 'length', adjustment: -1, reason: 'คำถามสั้น กระชับ' })
  }

  // Factor 2: Bloom's verbs detection
  const bloomVerbs = {
    create: ['ออกแบบ', 'สร้าง', 'ประดิษฐ์', 'พัฒนา', 'คิดค้น', 'เสนอ', 'วางแผน'],
    evaluate: ['ประเมิน', 'วิพากษ์', 'ตัดสิน', 'วิจารณ์', 'เปรียบเทียบ', 'ให้เหตุผล'],
    analyze: ['วิเคราะห์', 'แยกแยะ', 'จำแนก', 'สำรวจ', 'ตรวจสอบ', 'อธิบายความสัมพันธ์'],
    apply: ['ประยุกต์', 'ใช้', 'แก้ปัญหา', 'คำนวณ', 'แสดง', 'ทดลอง'],
    understand: ['อธิบาย', 'สรุป', 'ยกตัวอย่าง', 'เปรียบเทียบ', 'จัดกลุ่ม'],
    remember: ['บอก', 'ระบุ', 'จำ', 'ท่องจำ', 'รายการ', 'นิยาม']
  }

  for (const [level, verbs] of Object.entries(bloomVerbs)) {
    for (const verb of verbs) {
      if (combinedText.includes(verb)) {
        const adjustments = { create: +2, evaluate: +1, analyze: 0, apply: -1, understand: -1, remember: -2 }
        analysis.factors.push({ 
          factor: 'bloom_verb', 
          verb, 
          level, 
          adjustment: adjustments[level],
          reason: `พบคำกริยา "${verb}" ระดับ ${level}`
        })
        break // Only count first match per level
      }
    }
  }

  // Factor 3: Complexity indicators
  const complexityIndicators = [
    { pattern: /ถ้า.*แล้ว|หาก.*จะ/g, adjustment: +1, reason: 'มีเงื่อนไขซับซ้อน' },
    { pattern: /เปรียบเทียบ.*กับ|ต่างกัน.*อย่างไร/g, adjustment: +1, reason: 'ต้องเปรียบเทียบ' },
    { pattern: /หลาย.*ด้าน|ทุก.*มุม/g, adjustment: +1, reason: 'ต้องมองหลายมิติ' },
    { pattern: /ยกตัวอย่าง.*ประกอบ/g, adjustment: 0, reason: 'ต้องยกตัวอย่าง' },
    { pattern: /คืออะไร|หมายความว่า/g, adjustment: -1, reason: 'คำถามนิยาม' }
  ]

  for (const indicator of complexityIndicators) {
    if (indicator.pattern.test(combinedText)) {
      analysis.factors.push({
        factor: 'complexity_pattern',
        adjustment: indicator.adjustment,
        reason: indicator.reason
      })
    }
  }

  // Factor 4: Multiple parts
  const partIndicators = [/ประการแรก|ประการที่|ข้อที่/g, /1\)|2\)|3\)/g, /ก\.|ข\.|ค\./g]
  for (const pattern of partIndicators) {
    const matches = combinedText.match(pattern)
    if (matches && matches.length >= 2) {
      analysis.factors.push({
        factor: 'multiple_parts',
        count: matches.length,
        adjustment: Math.min(2, matches.length - 1),
        reason: `มี ${matches.length} ส่วนที่ต้องตอบ`
      })
      break
    }
  }

  // Factor 5: A.R.C.E. focus
  if (question.arceFocus) {
    const arceDifficulty = {
      analysis: 0,
      reasoning: +1,
      creativity: +1,
      evidence: 0
    }
    const focus = Array.isArray(question.arceFocus) ? question.arceFocus : [question.arceFocus]
    for (const f of focus) {
      if (arceDifficulty[f] !== undefined) {
        analysis.factors.push({
          factor: 'arce_focus',
          focus: f,
          adjustment: arceDifficulty[f],
          reason: `เน้น ${f}`
        })
      }
    }
  }

  // Calculate final difficulty level
  const totalAdjustment = analysis.factors.reduce((sum, f) => sum + (f.adjustment || 0), 0)
  analysis.suggestedLevel = Math.max(1, Math.min(5, 3 + Math.round(totalAdjustment / 2)))
  analysis.confidence = Math.min(0.9, 0.5 + (analysis.factors.length * 0.1))

  // Map to difficulty object
  const levelKey = Object.keys(DIFFICULTY_LEVELS).find(
    k => DIFFICULTY_LEVELS[k].level === analysis.suggestedLevel
  )
  analysis.difficulty = DIFFICULTY_LEVELS[levelKey]

  return analysis
}

/**
 * 📊 Get student's current ability level for a specific LO or dimension
 * @param {Object} studentProgress - Student progress data
 * @param {string} targetLO - Target Learning Outcome (optional)
 * @returns {Object} Ability estimate
 */
function estimateStudentAbility(studentProgress, targetLO = null) {
  const estimate = {
    overallLevel: 3,    // Default: Medium
    confidence: 0.3,    // Low confidence without data
    recentTrend: 'stable',
    recommendedDifficulty: 3
  }

  if (!studentProgress || !studentProgress.assessments) {
    return estimate
  }

  // Get recent assessments (last 10)
  const recentAssessments = (studentProgress.assessments || [])
    .slice(-10)
    .filter(a => a.overallScore !== undefined)

  if (recentAssessments.length === 0) {
    return estimate
  }

  // Calculate average score
  const avgScore = recentAssessments.reduce((sum, a) => sum + a.overallScore, 0) / recentAssessments.length
  estimate.averageScore = avgScore

  // Map score to difficulty level
  if (avgScore >= 16) estimate.overallLevel = 4
  else if (avgScore >= 14) estimate.overallLevel = 3
  else if (avgScore >= 10) estimate.overallLevel = 2
  else estimate.overallLevel = 1

  // Check recent trend (last 3 vs previous 3)
  if (recentAssessments.length >= 6) {
    const recent3 = recentAssessments.slice(-3)
    const previous3 = recentAssessments.slice(-6, -3)
    const recentAvg = recent3.reduce((s, a) => s + a.overallScore, 0) / 3
    const prevAvg = previous3.reduce((s, a) => s + a.overallScore, 0) / 3

    if (recentAvg > prevAvg + 2) estimate.recentTrend = 'improving'
    else if (recentAvg < prevAvg - 2) estimate.recentTrend = 'declining'
  }

  // Check consecutive results
  const last3 = recentAssessments.slice(-3)
  const last3Passed = last3.filter(a => a.overallScore >= 12).length
  const last3Failed = last3.filter(a => a.overallScore < 10).length

  // Adjust recommendation based on trend
  if (last3Passed === 3 && estimate.recentTrend === 'improving') {
    estimate.recommendedDifficulty = Math.min(5, estimate.overallLevel + 1)
  } else if (last3Failed >= 2 || estimate.recentTrend === 'declining') {
    estimate.recommendedDifficulty = Math.max(1, estimate.overallLevel - 1)
  } else {
    estimate.recommendedDifficulty = estimate.overallLevel
  }

  // LO-specific analysis
  if (targetLO && studentProgress.loProgress?.[targetLO]) {
    const loData = studentProgress.loProgress[targetLO]
    if (loData.mastery !== undefined) {
      if (loData.mastery < 0.3) {
        estimate.recommendedDifficulty = Math.max(1, estimate.recommendedDifficulty - 1)
      } else if (loData.mastery > 0.7) {
        estimate.recommendedDifficulty = Math.min(5, estimate.recommendedDifficulty + 1)
      }
    }
  }

  estimate.confidence = Math.min(0.9, 0.3 + (recentAssessments.length * 0.06))

  return estimate
}

/**
 * 🎯 Select optimal question based on student ability
 * @param {Array} availableQuestions - Pool of questions
 * @param {Object} studentProgress - Student progress data
 * @param {Array} weakLOs - LOs that student is weak in
 * @param {Object} sessionContext - Current session context
 * @returns {Object} Selected question with reasoning
 */
function selectAdaptiveQuestion(availableQuestions, studentProgress, weakLOs = [], sessionContext = {}) {
  if (!availableQuestions || availableQuestions.length === 0) {
    return null
  }

  const selection = {
    question: null,
    reasoning: [],
    alternativesConsidered: 0
  }

  // Get student ability estimate
  const ability = estimateStudentAbility(studentProgress, weakLOs[0])
  selection.studentAbility = ability

  // Get session history
  const usedQuestionIds = new Set(sessionContext.usedQuestionIds || [])
  const lastDifficulty = sessionContext.lastDifficulty || ability.recommendedDifficulty
  const consecutiveHard = sessionContext.consecutiveHardCount || 0
  const lastFailed = sessionContext.lastAssessmentFailed || false

  // Filter unused questions
  let candidates = availableQuestions.filter(q => !usedQuestionIds.has(q.id))
  selection.alternativesConsidered = candidates.length

  if (candidates.length === 0) {
    // All used, pick least recently used
    candidates = [...availableQuestions].sort((a, b) => 
      (a.lastUsedAt || 0) - (b.lastUsedAt || 0)
    )
  }

  // Analyze difficulty of all candidates
  candidates = candidates.map(q => {
    const diffAnalysis = q.difficulty 
      ? { suggestedLevel: q.difficulty, confidence: 0.8 }
      : analyzeQuestionDifficulty(q)
    return {
      ...q,
      difficultyLevel: diffAnalysis.suggestedLevel || q.difficulty || 3,
      difficultyAnalysis: diffAnalysis
    }
  })

  // Determine target difficulty range
  let targetMin = ability.recommendedDifficulty - 1
  let targetMax = ability.recommendedDifficulty + 1

  // Anti-frustration: After fail, prefer easier
  if (lastFailed) {
    targetMax = ability.recommendedDifficulty
    selection.reasoning.push('หลังตอบผิด: เลือกคำถามไม่ยากเกินไป')
  }

  // Anti-frustration: Limit consecutive hard questions
  if (consecutiveHard >= ADAPTIVE_CONFIG.maxConsecutiveHard) {
    targetMax = Math.max(2, ability.recommendedDifficulty - 1)
    selection.reasoning.push(`ได้รับคำถามยากติดต่อกัน ${consecutiveHard} ข้อ: ลดความยาก`)
  }

  // Clamp target range
  targetMin = Math.max(1, targetMin)
  targetMax = Math.min(5, targetMax)

  // Priority 1: Weak LO + appropriate difficulty
  if (weakLOs.length > 0) {
    const weakLOCandidates = candidates.filter(q => {
      const relatedLOs = q.relatedLOs || []
      return relatedLOs.some(lo => weakLOs.includes(lo)) &&
             q.difficultyLevel >= targetMin &&
             q.difficultyLevel <= targetMax
    })

    if (weakLOCandidates.length > 0) {
      // Sort by closest to target difficulty
      weakLOCandidates.sort((a, b) => {
        const aDiff = Math.abs(a.difficultyLevel - ability.recommendedDifficulty)
        const bDiff = Math.abs(b.difficultyLevel - ability.recommendedDifficulty)
        return aDiff - bDiff
      })
      selection.question = weakLOCandidates[0]
      selection.reasoning.push(`เลือกคำถามที่เกี่ยวกับ LO ที่อ่อน: ${weakLOs[0]}`)
      selection.reasoning.push(`ความยากระดับ ${selection.question.difficultyLevel} (เป้าหมาย: ${ability.recommendedDifficulty})`)
      return selection
    }
  }

  // Priority 2: Appropriate difficulty within range
  const difficultyMatched = candidates.filter(q => 
    q.difficultyLevel >= targetMin && q.difficultyLevel <= targetMax
  )

  if (difficultyMatched.length > 0) {
    // Sort by closest to target
    difficultyMatched.sort((a, b) => {
      const aDiff = Math.abs(a.difficultyLevel - ability.recommendedDifficulty)
      const bDiff = Math.abs(b.difficultyLevel - ability.recommendedDifficulty)
      return aDiff - bDiff
    })
    selection.question = difficultyMatched[0]
    selection.reasoning.push(`เลือกคำถามความยากระดับ ${selection.question.difficultyLevel}`)
    return selection
  }

  // Priority 3: Any unused question (expand range)
  selection.question = candidates[0]
  selection.reasoning.push('ไม่มีคำถามในช่วงความยากที่เหมาะสม: เลือกคำถามที่มีอยู่')

  return selection
}

/**
 * 📈 Update student's difficulty progression
 * @param {Object} studentProgress - Current progress
 * @param {Object} assessmentResult - Latest assessment
 * @param {number} questionDifficulty - Difficulty of answered question
 * @returns {Object} Updated progression data
 */
function updateDifficultyProgression(studentProgress, assessmentResult, questionDifficulty) {
  const update = {
    currentLevel: studentProgress.currentDifficultyLevel || 3,
    consecutiveSuccesses: studentProgress.consecutiveSuccesses || 0,
    consecutiveFailures: studentProgress.consecutiveFailures || 0,
    totalAttempts: (studentProgress.totalAttempts || 0) + 1,
    action: 'none',
    newLevel: null
  }

  const score = assessmentResult.overallScore || 0
  const passThreshold = DIFFICULTY_LEVELS[Object.keys(DIFFICULTY_LEVELS).find(
    k => DIFFICULTY_LEVELS[k].level === questionDifficulty
  )]?.minScore || 12

  const passed = score >= passThreshold

  if (passed) {
    update.consecutiveSuccesses++
    update.consecutiveFailures = 0

    // Check for level up
    if (update.consecutiveSuccesses >= ADAPTIVE_CONFIG.successesToLevelUp && 
        update.currentLevel < 5) {
      update.action = 'level_up'
      update.newLevel = update.currentLevel + 1
      update.consecutiveSuccesses = 0
    }
  } else {
    update.consecutiveFailures++
    update.consecutiveSuccesses = 0

    // Check for level down
    if (update.consecutiveFailures >= ADAPTIVE_CONFIG.failuresToLevelDown &&
        update.currentLevel > 1) {
      update.action = 'level_down'
      update.newLevel = update.currentLevel - 1
      update.consecutiveFailures = 0
    }
  }

  // Calculate mastery at current level
  const attemptsAtLevel = studentProgress.attemptsAtLevel?.[update.currentLevel] || 0
  const passesAtLevel = studentProgress.passesAtLevel?.[update.currentLevel] || 0
  update.masteryAtLevel = attemptsAtLevel > 0 ? passesAtLevel / attemptsAtLevel : 0

  return update
}

/**
 * 🏷️ Suggest difficulty tag for a new question
 * @param {Object} question - Question to analyze
 * @param {string} gradeLevel - Target grade level
 * @returns {Object} Suggested difficulty with explanation
 */
function suggestQuestionDifficulty(question, gradeLevel = 'ม.3') {
  const analysis = analyzeQuestionDifficulty(question)
  
  // Adjust for grade level
  const gradeBaseline = ADAPTIVE_CONFIG.startingDifficulty[gradeLevel] || 3
  
  // If question seems hard for grade level, note it
  if (analysis.suggestedLevel > gradeBaseline + 1) {
    analysis.gradeWarning = `คำถามนี้อาจยากเกินไปสำหรับนักเรียน ${gradeLevel}`
  } else if (analysis.suggestedLevel < gradeBaseline - 1) {
    analysis.gradeWarning = `คำถามนี้อาจง่ายเกินไปสำหรับนักเรียน ${gradeLevel}`
  }

  return {
    suggestedDifficulty: analysis.suggestedLevel,
    difficultyName: analysis.difficulty.name,
    icon: analysis.difficulty.icon,
    factors: analysis.factors,
    confidence: analysis.confidence,
    gradeLevel,
    gradeBaseline,
    gradeWarning: analysis.gradeWarning || null,
    recommendation: `แนะนำให้ตั้งความยากเป็น "${analysis.difficulty.name}" (ระดับ ${analysis.suggestedLevel})`
  }
}

module.exports = {
  DIFFICULTY_LEVELS,
  ADAPTIVE_CONFIG,
  analyzeQuestionDifficulty,
  estimateStudentAbility,
  selectAdaptiveQuestion,
  updateDifficultyProgression,
  suggestQuestionDifficulty
}
