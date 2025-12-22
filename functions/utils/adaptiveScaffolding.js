/**
 * 🎯 Adaptive Scaffolding Module
 * 
 * ระบบ Scaffolding อัจฉริยะที่ปรับตามจุดอ่อนเฉพาะมิติ
 * อิงทฤษฎี Vygotsky's Zone of Proximal Development
 * 
 * Features:
 * 1. Dimension-specific scaffolding prompts
 * 2. Progressive hint levels (implicit → explicit)
 * 3. Adaptive difficulty adjustment
 * 4. Metacognitive prompts
 * 
 * References:
 * - Vygotsky, L. S. (1978). Mind in Society
 * - Wood, Bruner & Ross (1976). Role of tutoring in problem solving
 * - Puntambekar & Hubscher (2005). Tools for Scaffolding
 */

/**
 * Scaffolding Levels
 * ระดับความช่วยเหลือจากน้อยไปมาก
 */
const SCAFFOLDING_LEVELS = {
  NONE: 0,           // ไม่มีช่วยเหลือ
  METACOGNITIVE: 1,  // ถามให้คิดทบทวน
  IMPLICIT: 2,       // บอกใบ้อ้อมๆ
  EXPLICIT: 3,       // บอกตรงๆ แต่ไม่ให้คำตอบ
  MODELING: 4        // แสดงตัวอย่างวิธีคิด
}

/**
 * Dimension-specific Scaffolding Strategies
 * กลยุทธ์ช่วยเหลือเฉพาะแต่ละมิติ
 */
const DIMENSION_STRATEGIES = {
  analysis: {
    name: 'การวิเคราะห์',
    icon: '🔍',
    bloomLevel: 'Analyze (L4)',
    cognitiveProcesses: ['แยกแยะ', 'จัดระเบียบ', 'อ้างเหตุผล'],
    scaffolds: {
      [SCAFFOLDING_LEVELS.METACOGNITIVE]: [
        'ลองนึกดูว่าในคำถามนี้มีกี่ส่วนสำคัญ?',
        'ถ้าต้องแบ่งเรื่องนี้เป็นหัวข้อย่อย จะแบ่งอย่างไร?',
        'อะไรคือจุดที่สำคัญที่สุดในคำถามนี้?'
      ],
      [SCAFFOLDING_LEVELS.IMPLICIT]: [
        'ลองดูว่ามีอะไรบ้างที่เหมือนกันหรือต่างกัน...',
        'สังเกตว่าสิ่งนี้ประกอบด้วยส่วนอะไรบ้าง...',
        'มีความสัมพันธ์อะไรระหว่างสิ่งเหล่านี้ไหม?'
      ],
      [SCAFFOLDING_LEVELS.EXPLICIT]: [
        'ลองแยกเป็นประเด็นหลัก 2-3 ข้อก่อน แล้วอธิบายแต่ละข้อ',
        'ให้เปรียบเทียบโดยดูที่: 1) ลักษณะ 2) วัตถุประสงค์ 3) ผลลัพธ์',
        'ลองตั้งคำถามว่า "ใคร ทำอะไร ที่ไหน เมื่อไร อย่างไร ทำไม"'
      ],
      [SCAFFOLDING_LEVELS.MODELING]: [
        'ตัวอย่าง: "เมื่อวิเคราะห์ปัญหาสิ่งแวดล้อม ผมแบ่งเป็น 1) สาเหตุจากธรรมชาติ 2) สาเหตุจากมนุษย์ 3) ผลกระทบ..."',
        'วิธีที่ดีคือ เริ่มจากภาพรวม แล้วค่อยซูมเข้าไปทีละส่วน เช่น...'
      ]
    },
    diagnosticQuestions: [
      'นักเรียนระบุองค์ประกอบหลักได้หรือไม่?',
      'มีการจัดกลุ่มหรือจำแนกหมวดหมู่หรือไม่?',
      'มีการชี้ความสัมพันธ์ระหว่างส่วนต่างๆ หรือไม่?'
    ]
  },

  reasoning: {
    name: 'การให้เหตุผล',
    icon: '🧠',
    bloomLevel: 'Evaluate (L5)',
    cognitiveProcesses: ['ตรวจสอบ', 'วิพากษ์', 'ตัดสิน'],
    scaffolds: {
      [SCAFFOLDING_LEVELS.METACOGNITIVE]: [
        'ทำไมถึงคิดอย่างนั้น?',
        'มีหลักฐานอะไรสนับสนุนความคิดของตัวเอง?',
        'ถ้าคนอื่นไม่เห็นด้วย เขาจะโต้แย้งอย่างไร?'
      ],
      [SCAFFOLDING_LEVELS.IMPLICIT]: [
        'ลองคิดถึงเหตุและผลที่ตามมา...',
        'ถ้า A เกิดขึ้น แล้ว B จะเป็นอย่างไร?',
        'มีความเป็นไปได้อื่นอีกไหม?'
      ],
      [SCAFFOLDING_LEVELS.EXPLICIT]: [
        'ลองใช้รูปแบบ "เพราะว่า... ดังนั้น... เพราะฉะนั้น..."',
        'ให้อธิบายเป็นลำดับขั้นตอน: 1) ข้อเท็จจริง 2) การอนุมาน 3) ข้อสรุป',
        'ลองพิสูจน์โดยใช้ตรรกะ: ถ้า..แล้ว..เพราะ..'
      ],
      [SCAFFOLDING_LEVELS.MODELING]: [
        'ตัวอย่างการให้เหตุผล: "น้ำท่วมเกิดขึ้นบ่อย (ข้อเท็จจริง) → เพราะป่าถูกตัด (สาเหตุ) → ดังนั้นต้องปลูกป่าทดแทน (ข้อสรุป)"',
        'ลองดูวิธีคิดแบบนี้: ถ้า X จริง และ Y จริง แล้ว Z ต้องจริงเพราะ...'
      ]
    },
    diagnosticQuestions: [
      'มีการแสดงความสัมพันธ์เชิงเหตุ-ผลหรือไม่?',
      'ข้อสรุปสอดคล้องกับเหตุผลที่ให้มาหรือไม่?',
      'มีการอนุมานที่ถูกต้องตามหลักตรรกะหรือไม่?'
    ]
  },

  creativity: {
    name: 'ความคิดสร้างสรรค์',
    icon: '💡',
    bloomLevel: 'Create (L6)',
    cognitiveProcesses: ['สร้าง', 'วางแผน', 'ผลิต'],
    scaffolds: {
      [SCAFFOLDING_LEVELS.METACOGNITIVE]: [
        'มีวิธีอื่นอีกไหมที่ยังไม่ได้ลอง?',
        'ถ้าไม่มีข้อจำกัด จะทำอะไรต่างออกไป?',
        'คนที่คิดต่างจากเราจะมองเรื่องนี้อย่างไร?'
      ],
      [SCAFFOLDING_LEVELS.IMPLICIT]: [
        'ลองคิดนอกกรอบ... ถ้าสมมติว่า...',
        'มีอะไรที่เคยเห็นในที่อื่นแล้วเอามาประยุกต์ได้ไหม?',
        'ถ้ารวม 2 ไอเดียเข้าด้วยกัน จะได้อะไร?'
      ],
      [SCAFFOLDING_LEVELS.EXPLICIT]: [
        'ลองใช้ SCAMPER: แทนที่ รวม ปรับ ขยาย ใช้อื่น กำจัด สลับ',
        'คิดหาทางเลือกอย่างน้อย 3 วิธี แล้วเลือกวิธีที่ดีที่สุด',
        'ลองตอบคำถาม "จะเกิดอะไรถ้า...?" อย่างน้อย 2 สถานการณ์'
      ],
      [SCAFFOLDING_LEVELS.MODELING]: [
        'ตัวอย่าง: "แทนที่จะแก้ปัญหาขยะแบบเดิม ผมคิดว่าถ้าเปลี่ยนขยะเป็นพลังงาน โดย... นี่คือวิธีใหม่ที่..."',
        'ดูตัวอย่าง: เมื่อ Edison คิดหลอดไฟ เขาไม่ได้ปรับปรุงเทียน แต่คิดใหม่หมดว่า...'
      ]
    },
    diagnosticQuestions: [
      'มีไอเดียใหม่หรือมุมมองที่ไม่ซ้ำใครหรือไม่?',
      'มีการเสนอทางเลือกหลายทางหรือไม่?',
      'มีการประยุกต์หรือต่อยอดจากความรู้เดิมหรือไม่?'
    ]
  },

  evidence: {
    name: 'การใช้หลักฐาน',
    icon: '📚',
    bloomLevel: 'Apply (L3)',
    cognitiveProcesses: ['ปฏิบัติ', 'นำไปใช้', 'สนับสนุน'],
    scaffolds: {
      [SCAFFOLDING_LEVELS.METACOGNITIVE]: [
        'มีตัวอย่างอะไรที่จะช่วยอธิบายได้?',
        'เคยเห็นหรืออ่านเจอเรื่องแบบนี้ที่ไหนไหม?',
        'ถ้าต้องพิสูจน์ให้คนอื่นเชื่อ ต้องใช้อะไร?'
      ],
      [SCAFFOLDING_LEVELS.IMPLICIT]: [
        'ลองนึกถึงประสบการณ์จริงที่เกี่ยวข้อง...',
        'มีข้อมูลหรือตัวเลขที่ช่วยสนับสนุนไหม?',
        'เคยเรียนหรืออ่านเจออะไรที่เกี่ยวกับเรื่องนี้?'
      ],
      [SCAFFOLDING_LEVELS.EXPLICIT]: [
        'ลองยกตัวอย่างที่เฉพาะเจาะจง โดยระบุ ใคร ที่ไหน เมื่อไร',
        'ใช้รูปแบบ: "ยกตัวอย่างเช่น... ซึ่งแสดงให้เห็นว่า..."',
        'อ้างอิงจากแหล่งที่มา: บทเรียน หนังสือ ข่าว หรือประสบการณ์'
      ],
      [SCAFFOLDING_LEVELS.MODELING]: [
        'ตัวอย่าง: "มลพิษทางอากาศส่งผลต่อสุขภาพ ดังจะเห็นได้จากกรณีหมอกควันภาคเหนือปี 2566 ที่ทำให้ผู้ป่วยโรคทางเดินหายใจเพิ่มขึ้น 30%..."',
        'ดูตัวอย่าง: เมื่อนักวิทยาศาสตร์สรุปว่า X เขาอ้างอิงข้อมูลจาก...'
      ]
    },
    diagnosticQuestions: [
      'มีการยกตัวอย่างประกอบหรือไม่?',
      'ตัวอย่างมีความเฉพาะเจาะจงหรือไม่?',
      'มีการเชื่อมโยงหลักฐานกับข้อสรุปหรือไม่?'
    ]
  }
}

/**
 * Determine which dimensions need scaffolding
 * @param {Object} rubricScores - Current HOTS scores
 * @param {number} threshold - Score threshold (default: 3)
 * @returns {Array} Dimensions needing scaffolding
 */
function identifyWeakDimensions(rubricScores, threshold = 3) {
  const weakDimensions = []
  
  for (const [dim, score] of Object.entries(rubricScores)) {
    if (score < threshold) {
      weakDimensions.push({
        dimension: dim,
        score,
        gap: threshold - score,
        priority: threshold - score // Higher gap = higher priority
      })
    }
  }

  // Sort by priority (largest gap first)
  return weakDimensions.sort((a, b) => b.priority - a.priority)
}

/**
 * Generate adaptive scaffolding based on student's performance
 * @param {Object} assessmentResult - Current assessment with rubricScores
 * @param {number} attemptNumber - Current attempt number (1-based)
 * @param {Object} previousScaffolding - Previous scaffolding given
 * @returns {Object} Scaffolding intervention
 */
function generateAdaptiveScaffolding(assessmentResult, attemptNumber = 1, previousScaffolding = null) {
  const { rubricScores } = assessmentResult
  const overallScore = Object.values(rubricScores).reduce((a, b) => a + b, 0)

  // If passing, no scaffolding needed
  if (overallScore >= 12) { // 60% of 20
    return {
      needed: false,
      reason: 'Score above threshold'
    }
  }

  // Identify weak dimensions
  const weakDimensions = identifyWeakDimensions(rubricScores)
  
  if (weakDimensions.length === 0) {
    return {
      needed: false,
      reason: 'No weak dimensions identified'
    }
  }

  // Determine scaffolding level based on attempt number
  let scaffoldingLevel = SCAFFOLDING_LEVELS.METACOGNITIVE
  if (attemptNumber >= 2) scaffoldingLevel = SCAFFOLDING_LEVELS.IMPLICIT
  if (attemptNumber >= 3) scaffoldingLevel = SCAFFOLDING_LEVELS.EXPLICIT
  if (attemptNumber >= 4) scaffoldingLevel = SCAFFOLDING_LEVELS.MODELING

  // Check if same dimension was scaffolded before
  if (previousScaffolding && previousScaffolding.primaryDimension === weakDimensions[0].dimension) {
    // Escalate level
    scaffoldingLevel = Math.min(scaffoldingLevel + 1, SCAFFOLDING_LEVELS.MODELING)
  }

  // Get primary dimension to scaffold
  const primaryDimension = weakDimensions[0]
  const strategy = DIMENSION_STRATEGIES[primaryDimension.dimension]

  if (!strategy) {
    return {
      needed: true,
      error: 'Unknown dimension',
      dimension: primaryDimension.dimension
    }
  }

  // Select appropriate scaffold
  const scaffolds = strategy.scaffolds[scaffoldingLevel] || strategy.scaffolds[SCAFFOLDING_LEVELS.METACOGNITIVE]
  const selectedScaffold = scaffolds[Math.floor(Math.random() * scaffolds.length)]

  return {
    needed: true,
    primaryDimension: primaryDimension.dimension,
    dimensionName: strategy.name,
    dimensionIcon: strategy.icon,
    currentScore: primaryDimension.score,
    targetScore: 3,
    scaffoldingLevel,
    scaffoldingLevelName: Object.keys(SCAFFOLDING_LEVELS).find(
      k => SCAFFOLDING_LEVELS[k] === scaffoldingLevel
    ),
    prompt: selectedScaffold,
    diagnosticQuestions: strategy.diagnosticQuestions,
    otherWeakDimensions: weakDimensions.slice(1).map(d => ({
      dimension: d.dimension,
      score: d.score
    })),
    metadata: {
      attemptNumber,
      overallScore,
      generatedAt: new Date().toISOString()
    }
  }
}

/**
 * Generate comprehensive scaffolding prompt for AI
 * @param {Object} scaffolding - Scaffolding object from generateAdaptiveScaffolding
 * @param {string} originalQuestion - The original question
 * @returns {string} Complete scaffolding message for student
 */
function formatScaffoldingMessage(scaffolding, originalQuestion = '') {
  if (!scaffolding.needed) {
    return null
  }

  const strategy = DIMENSION_STRATEGIES[scaffolding.primaryDimension]
  
  let message = `${strategy.icon} **ลองคิดเพิ่มเติมในด้าน${strategy.name}**\n\n`
  message += `💭 ${scaffolding.prompt}\n\n`
  
  // Add encouraging context based on level
  if (scaffolding.scaffoldingLevel === SCAFFOLDING_LEVELS.METACOGNITIVE) {
    message += `> ไม่ต้องรีบตอบ ค่อยๆ คิดทบทวน แล้วลองตอบใหม่อีกครั้ง`
  } else if (scaffolding.scaffoldingLevel === SCAFFOLDING_LEVELS.IMPLICIT) {
    message += `> คำใบ้นี้อาจช่วยให้คิดได้ชัดเจนขึ้น ลองปรับคำตอบดู`
  } else if (scaffolding.scaffoldingLevel === SCAFFOLDING_LEVELS.EXPLICIT) {
    message += `> ลองใช้วิธีนี้เพื่อจัดระเบียบความคิด แล้วเขียนใหม่`
  } else {
    message += `> ดูตัวอย่างวิธีคิด แล้วลองทำแบบเดียวกันกับคำถามของเรา`
  }

  return message
}

/**
 * Track scaffolding effectiveness
 * @param {Object} beforeScores - Scores before scaffolding
 * @param {Object} afterScores - Scores after scaffolding
 * @param {Object} scaffoldingUsed - Scaffolding that was applied
 * @returns {Object} Effectiveness analysis
 */
function analyzeScaffoldingEffectiveness(beforeScores, afterScores, scaffoldingUsed) {
  const targetDimension = scaffoldingUsed.primaryDimension
  
  const improvement = {
    dimension: targetDimension,
    before: beforeScores[targetDimension] || 0,
    after: afterScores[targetDimension] || 0,
    change: (afterScores[targetDimension] || 0) - (beforeScores[targetDimension] || 0)
  }

  const overallBefore = Object.values(beforeScores).reduce((a, b) => a + b, 0)
  const overallAfter = Object.values(afterScores).reduce((a, b) => a + b, 0)

  // Check all dimensions
  const dimensionChanges = {}
  for (const dim of ['analysis', 'reasoning', 'creativity', 'evidence']) {
    dimensionChanges[dim] = {
      before: beforeScores[dim] || 0,
      after: afterScores[dim] || 0,
      change: (afterScores[dim] || 0) - (beforeScores[dim] || 0)
    }
  }

  return {
    targetImprovement: improvement,
    overallChange: overallAfter - overallBefore,
    effectiveness: improvement.change > 0 ? 'positive' : 
                   improvement.change === 0 ? 'neutral' : 'negative',
    reachedThreshold: improvement.after >= 3,
    scaffoldingLevel: scaffoldingUsed.scaffoldingLevel,
    allDimensionChanges: dimensionChanges,
    recommendation: improvement.change > 0 
      ? 'Scaffolding was effective, continue with similar approaches'
      : improvement.change === 0
        ? 'Consider escalating to more explicit scaffolding'
        : 'This scaffolding approach may not be suitable for this student'
  }
}

/**
 * Get scaffolding statistics for a course/teacher
 * @param {Array} scaffoldingRecords - Array of scaffolding records with effectiveness
 * @returns {Object} Aggregated statistics
 */
function getScaffoldingStatistics(scaffoldingRecords) {
  if (!scaffoldingRecords || scaffoldingRecords.length === 0) {
    return { error: 'No scaffolding records' }
  }

  const stats = {
    totalScaffoldings: scaffoldingRecords.length,
    byDimension: {},
    byLevel: {},
    overallEffectiveness: {
      positive: 0,
      neutral: 0,
      negative: 0
    },
    averageImprovement: 0
  }

  let totalImprovement = 0

  for (const record of scaffoldingRecords) {
    const dim = record.dimension || 'unknown'
    const level = record.scaffoldingLevel || 0

    // By dimension
    if (!stats.byDimension[dim]) {
      stats.byDimension[dim] = { count: 0, totalImprovement: 0, successRate: 0 }
    }
    stats.byDimension[dim].count++
    stats.byDimension[dim].totalImprovement += record.change || 0
    if (record.reachedThreshold) stats.byDimension[dim].successRate++

    // By level
    if (!stats.byLevel[level]) {
      stats.byLevel[level] = { count: 0, totalImprovement: 0 }
    }
    stats.byLevel[level].count++
    stats.byLevel[level].totalImprovement += record.change || 0

    // Overall effectiveness
    if (record.effectiveness) {
      stats.overallEffectiveness[record.effectiveness]++
    }

    totalImprovement += record.change || 0
  }

  stats.averageImprovement = Math.round((totalImprovement / scaffoldingRecords.length) * 100) / 100

  // Calculate rates
  for (const dim of Object.keys(stats.byDimension)) {
    const d = stats.byDimension[dim]
    d.averageImprovement = Math.round((d.totalImprovement / d.count) * 100) / 100
    d.successRate = Math.round((d.successRate / d.count) * 100)
  }

  for (const level of Object.keys(stats.byLevel)) {
    const l = stats.byLevel[level]
    l.averageImprovement = Math.round((l.totalImprovement / l.count) * 100) / 100
  }

  return stats
}

module.exports = {
  SCAFFOLDING_LEVELS,
  DIMENSION_STRATEGIES,
  identifyWeakDimensions,
  generateAdaptiveScaffolding,
  formatScaffoldingMessage,
  analyzeScaffoldingEffectiveness,
  getScaffoldingStatistics
}
