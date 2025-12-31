/**
 * 🎯 Adaptive Scaffolding Module (Enhanced for C10 Research)
 * 
 * ระบบ Scaffolding อัจฉริยะที่ปรับตามจุดอ่อนเฉพาะมิติ
 * อิงทฤษฎี Vygotsky's Zone of Proximal Development
 * 
 * Features:
 * 1. Dimension-specific scaffolding prompts
 * 2. Progressive hint levels (implicit → explicit)
 * 3. Adaptive difficulty adjustment
 * 4. Metacognitive prompts
 * 5. 🔴 NEW: Scaffolding Effectiveness Tracking (Research Grade)
 * 6. 🔴 NEW: Metacognitive Prompting System
 * 7. 🔴 NEW: Strategy Comparison Analytics
 * 
 * References:
 * - Vygotsky, L. S. (1978). Mind in Society
 * - Wood, Bruner & Ross (1976). Role of tutoring in problem solving
 * - Puntambekar & Hubscher (2005). Tools for Scaffolding
 * - Schraw & Dennison (1994). Metacognitive Awareness Inventory
 * - Flavell (1979). Metacognition and cognitive monitoring
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
  // Guard against missing or invalid assessment result
  if (!assessmentResult || !assessmentResult.rubricScores) {
    return {
      needed: false,
      reason: 'No valid assessment scores available',
      error: 'Missing rubricScores'
    }
  }
  
  const { rubricScores } = assessmentResult
  
  // Guard against null/undefined rubricScores
  if (!rubricScores || typeof rubricScores !== 'object') {
    return {
      needed: false,
      reason: 'Invalid rubricScores format',
      error: 'rubricScores is null or not an object'
    }
  }
  
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

// =====================================================
// 🔴 NEW: Enhanced Metacognitive Scaffolding System
// =====================================================

/**
 * 🧠 Metacognitive Scaffolding Strategies
 * Based on Schraw & Dennison (1994) MAI Framework
 */
const METACOGNITIVE_STRATEGIES = {
  declarative: {
    name: 'Declarative Knowledge',
    thai: 'ความรู้เชิงประกาศ',
    description: 'Knowledge about self as learner and factors affecting performance',
    prompts: [
      'ลองคิดดูว่าตัวเองรู้อะไรเกี่ยวกับเรื่องนี้บ้าง?',
      'คำถามนี้เกี่ยวข้องกับความรู้เรื่องอะไรที่เคยเรียนมา?',
      'ตัวเองถนัดการคิดแบบไหนมากที่สุด?'
    ]
  },
  procedural: {
    name: 'Procedural Knowledge',
    thai: 'ความรู้เชิงกระบวนการ',
    description: 'Knowledge about strategies and procedures',
    prompts: [
      'จะใช้วิธีคิดแบบไหนในการตอบคำถามนี้?',
      'มีขั้นตอนอะไรบ้างที่ควรทำก่อน-หลัง?',
      'เคยใช้วิธีนี้กับโจทย์แบบนี้ได้ผลไหม?'
    ]
  },
  conditional: {
    name: 'Conditional Knowledge',
    thai: 'ความรู้เชิงเงื่อนไข',
    description: 'Knowledge about when and why to use strategies',
    prompts: [
      'ทำไมถึงเลือกใช้วิธีนี้? มีวิธีอื่นที่ดีกว่าไหม?',
      'ถ้าวิธีนี้ไม่ได้ผล จะลองทำอะไรต่อ?',
      'สถานการณ์แบบไหนที่วิธีนี้จะเหมาะที่สุด?'
    ]
  },
  planning: {
    name: 'Planning',
    thai: 'การวางแผน',
    description: 'Goal setting and resource allocation before learning',
    prompts: [
      'ก่อนตอบ ลองวางแผนว่าจะพูดถึงอะไรบ้าง?',
      'คำตอบที่ดีควรมีกี่ส่วน? แต่ละส่วนคืออะไร?',
      'จะเรียงลำดับความคิดอย่างไรให้ชัดเจน?'
    ]
  },
  monitoring: {
    name: 'Monitoring',
    thai: 'การตรวจสอบ',
    description: 'Awareness of comprehension and task performance',
    prompts: [
      'ตอนนี้คำตอบครบถ้วนหรือยัง? ขาดอะไรอีก?',
      'ส่วนไหนของคำตอบที่ยังไม่มั่นใจ?',
      'ถ้าอ่านคำตอบตัวเองอีกครั้ง ตรงไหนที่ยังไม่ชัด?'
    ]
  },
  evaluation: {
    name: 'Evaluation',
    thai: 'การประเมิน',
    description: 'Appraisal of products and processes of learning',
    prompts: [
      'คำตอบนี้ตอบโจทย์ที่ถามหรือเปล่า?',
      'ถ้าให้คะแนนตัวเอง จะให้เท่าไร? เพราะอะไร?',
      'ถ้าจะตอบใหม่ จะปรับปรุงตรงไหนบ้าง?'
    ]
  }
}

/**
 * 🎯 Scaffolding Strategy Types for Research Comparison
 */
const SCAFFOLDING_STRATEGY_TYPES = {
  METACOGNITIVE: 'metacognitive',      // Based on METACOGNITIVE_STRATEGIES
  MODELING: 'modeling',                 // Show example of thinking process
  QUESTIONING: 'questioning',           // Socratic questioning
  HINTING: 'hinting',                   // Progressive hints
  STRUCTURING: 'structuring',           // Provide structure/framework
  FEEDBACK: 'feedback'                  // Direct feedback on errors
}

/**
 * 🔬 Generate Metacognitive Scaffolding
 * Specifically designed to promote metacognition
 * 
 * @param {Object} assessmentResult - Current assessment
 * @param {string} targetDimension - Dimension to scaffold
 * @param {Object} studentProfile - Optional student profile
 * @returns {Object} Metacognitive scaffolding
 */
function generateMetacognitiveScaffolding(assessmentResult, targetDimension, studentProfile = null) {
  const { rubricScores } = assessmentResult
  const score = rubricScores[targetDimension] || 0
  
  // Select metacognitive strategy based on dimension and score
  let strategyType
  if (score <= 1) {
    strategyType = 'declarative' // Start with what they know
  } else if (score <= 2) {
    strategyType = 'procedural' // Focus on how to approach
  } else if (score <= 3) {
    strategyType = 'monitoring' // Help them check their work
  } else {
    strategyType = 'evaluation' // Refine and improve
  }
  
  const strategy = METACOGNITIVE_STRATEGIES[strategyType]
  const selectedPrompt = strategy.prompts[Math.floor(Math.random() * strategy.prompts.length)]
  
  // Customize based on dimension
  const dimensionContext = getDimensionMetacognitiveContext(targetDimension)
  
  return {
    strategyType: SCAFFOLDING_STRATEGY_TYPES.METACOGNITIVE,
    metacognitiveCategory: strategyType,
    categoryName: strategy.name,
    categoryNameThai: strategy.thai,
    prompt: selectedPrompt,
    dimensionContext,
    targetDimension,
    targetScore: score,
    theoreticalBasis: 'Schraw & Dennison (1994) MAI Framework',
    metadata: {
      generatedAt: new Date().toISOString(),
      strategyDescription: strategy.description
    }
  }
}

/**
 * Get dimension-specific metacognitive context
 */
function getDimensionMetacognitiveContext(dimension) {
  const contexts = {
    analysis: {
      focus: 'การแยกแยะและจัดโครงสร้าง',
      metacognitiveGoal: 'ให้ตระหนักถึงส่วนประกอบและความสัมพันธ์',
      selfQuestions: [
        'ฉันแยกประเด็นครบหรือยัง?',
        'ฉันเห็นความสัมพันธ์ระหว่างส่วนต่างๆ ไหม?'
      ]
    },
    reasoning: {
      focus: 'การให้เหตุผลและตรรกะ',
      metacognitiveGoal: 'ให้ตรวจสอบความสมเหตุสมผล',
      selfQuestions: [
        'เหตุผลของฉันต่อเนื่องกันไหม?',
        'ข้อสรุปของฉันสอดคล้องกับเหตุผลไหม?'
      ]
    },
    creativity: {
      focus: 'ความคิดสร้างสรรค์และมุมมองใหม่',
      metacognitiveGoal: 'ให้สำรวจความเป็นไปได้ที่หลากหลาย',
      selfQuestions: [
        'ฉันคิดนอกกรอบหรือยัง?',
        'มีมุมมองอื่นที่ยังไม่ได้ลองไหม?'
      ]
    },
    evidence: {
      focus: 'การใช้หลักฐานและตัวอย่าง',
      metacognitiveGoal: 'ให้ตรวจสอบความน่าเชื่อถือของหลักฐาน',
      selfQuestions: [
        'ฉันมีหลักฐานสนับสนุนเพียงพอไหม?',
        'ตัวอย่างที่ยกมาตรงประเด็นไหม?'
      ]
    }
  }
  
  return contexts[dimension] || contexts.analysis
}

/**
 * 📊 Scaffolding Effectiveness Tracker
 * Track and analyze which scaffolding strategies work best
 */
class ScaffoldingEffectivenessTracker {
  constructor(db) {
    this.db = db
    this.collection = 'scaffoldingEffectiveness'
  }
  
  /**
   * Log a scaffolding event with before/after scores
   * @param {Object} data - Scaffolding event data
   */
  async logScaffoldingEvent(data) {
    const {
      studentId,
      sessionId,
      questionId,
      courseId,
      strategyType,           // SCAFFOLDING_STRATEGY_TYPES
      scaffoldingLevel,       // SCAFFOLDING_LEVELS
      targetDimension,
      beforeScores,           // { analysis, reasoning, creativity, evidence }
      afterScores,            // { analysis, reasoning, creativity, evidence }
      scaffoldingContent,     // The actual scaffolding message
      responseTime,           // Time taken to respond after scaffolding (ms)
      attemptNumber,
      gradeLevel,
      metadata = {}
    } = data
    
    // Calculate improvements
    const improvements = this.calculateImprovements(beforeScores, afterScores, targetDimension)
    
    const event = {
      studentId,
      sessionId,
      questionId,
      courseId,
      strategyType,
      scaffoldingLevel,
      targetDimension,
      beforeScores,
      afterScores,
      improvements,
      scaffoldingContent,
      responseTime,
      attemptNumber,
      gradeLevel,
      metadata: {
        ...metadata,
        loggedAt: new Date().toISOString()
      }
    }
    
    try {
      const docRef = await this.db.collection(this.collection).add(event)
      return { success: true, eventId: docRef.id, improvements }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
  
  /**
   * Calculate improvements from scaffolding
   */
  calculateImprovements(beforeScores, afterScores, targetDimension) {
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const improvements = {
      byDimension: {},
      targetImprovement: 0,
      totalImprovement: 0,
      wasEffective: false,
      reachedThreshold: false
    }
    
    let totalBefore = 0
    let totalAfter = 0
    
    for (const dim of dimensions) {
      const before = beforeScores[dim] || 0
      const after = afterScores[dim] || 0
      const change = after - before
      
      improvements.byDimension[dim] = {
        before,
        after,
        change,
        improved: change > 0,
        reachedThreshold: after >= 3
      }
      
      if (dim === targetDimension) {
        improvements.targetImprovement = change
        improvements.reachedThreshold = after >= 3
      }
      
      totalBefore += before
      totalAfter += after
    }
    
    improvements.totalImprovement = totalAfter - totalBefore
    improvements.wasEffective = improvements.targetImprovement > 0
    improvements.effectivenessScore = this.calculateEffectivenessScore(improvements)
    
    return improvements
  }
  
  /**
   * Calculate effectiveness score (0-100)
   */
  calculateEffectivenessScore(improvements) {
    let score = 0
    
    // Target dimension improvement (max 50 points)
    if (improvements.targetImprovement > 0) {
      score += Math.min(50, improvements.targetImprovement * 20)
    }
    
    // Reached threshold bonus (25 points)
    if (improvements.reachedThreshold) {
      score += 25
    }
    
    // Total improvement bonus (max 25 points)
    if (improvements.totalImprovement > 0) {
      score += Math.min(25, improvements.totalImprovement * 5)
    }
    
    return Math.min(100, score)
  }
  
  /**
   * Analyze strategy effectiveness for research
   */
  async analyzeStrategyEffectiveness(options = {}) {
    const {
      strategyType = null,     // Filter by strategy type
      dimension = null,        // Filter by target dimension
      gradeLevel = null,       // Filter by grade level
      courseId = null,         // Filter by course
      startDate = null,
      endDate = null
    } = options
    
    let query = this.db.collection(this.collection)
    
    // Apply filters
    if (strategyType) query = query.where('strategyType', '==', strategyType)
    if (dimension) query = query.where('targetDimension', '==', dimension)
    if (gradeLevel) query = query.where('gradeLevel', '==', gradeLevel)
    if (courseId) query = query.where('courseId', '==', courseId)
    
    const snapshot = await query.get()
    const events = []
    
    snapshot.forEach(doc => {
      const data = doc.data()
      // Date filtering
      if (startDate && new Date(data.metadata?.loggedAt) < startDate) return
      if (endDate && new Date(data.metadata?.loggedAt) > endDate) return
      events.push(data)
    })
    
    if (events.length === 0) {
      return { success: false, error: 'No scaffolding events found' }
    }
    
    // Analyze by strategy type
    const byStrategy = this.aggregateByField(events, 'strategyType')
    
    // Analyze by dimension
    const byDimension = this.aggregateByField(events, 'targetDimension')
    
    // Analyze by scaffolding level
    const byLevel = this.aggregateByField(events, 'scaffoldingLevel')
    
    // Analyze by grade level
    const byGrade = this.aggregateByField(events, 'gradeLevel')
    
    // Find best performing strategies
    const bestStrategies = this.findBestStrategies(byStrategy)
    
    return {
      success: true,
      totalEvents: events.length,
      analysis: {
        byStrategy,
        byDimension,
        byLevel,
        byGrade
      },
      bestStrategies,
      recommendations: this.generateStrategyRecommendations(byStrategy, byDimension),
      researchFindings: this.generateResearchFindings(events, byStrategy),
      generatedAt: new Date().toISOString()
    }
  }
  
  /**
   * Aggregate events by a specific field
   */
  aggregateByField(events, field) {
    const groups = {}
    
    for (const event of events) {
      const key = event[field] || 'unknown'
      
      if (!groups[key]) {
        groups[key] = {
          count: 0,
          totalEffectiveness: 0,
          totalTargetImprovement: 0,
          totalOverallImprovement: 0,
          successCount: 0,
          thresholdReachedCount: 0
        }
      }
      
      const g = groups[key]
      const imp = event.improvements || {}
      
      g.count++
      g.totalEffectiveness += imp.effectivenessScore || 0
      g.totalTargetImprovement += imp.targetImprovement || 0
      g.totalOverallImprovement += imp.totalImprovement || 0
      if (imp.wasEffective) g.successCount++
      if (imp.reachedThreshold) g.thresholdReachedCount++
    }
    
    // Calculate averages
    for (const key of Object.keys(groups)) {
      const g = groups[key]
      g.avgEffectiveness = Math.round((g.totalEffectiveness / g.count) * 100) / 100
      g.avgTargetImprovement = Math.round((g.totalTargetImprovement / g.count) * 100) / 100
      g.avgOverallImprovement = Math.round((g.totalOverallImprovement / g.count) * 100) / 100
      g.successRate = Math.round((g.successCount / g.count) * 100)
      g.thresholdRate = Math.round((g.thresholdReachedCount / g.count) * 100)
    }
    
    return groups
  }
  
  /**
   * Find best performing strategies
   */
  findBestStrategies(byStrategy) {
    const ranked = Object.entries(byStrategy)
      .map(([strategy, stats]) => ({
        strategy,
        ...stats,
        // Composite score: effectiveness + success rate + threshold rate
        compositeScore: (stats.avgEffectiveness / 100 * 0.4) + 
                       (stats.successRate / 100 * 0.3) + 
                       (stats.thresholdRate / 100 * 0.3)
      }))
      .filter(s => s.count >= 5) // Minimum sample size
      .sort((a, b) => b.compositeScore - a.compositeScore)
    
    return ranked.map((r, i) => ({
      rank: i + 1,
      strategy: r.strategy,
      compositeScore: Math.round(r.compositeScore * 100),
      avgEffectiveness: r.avgEffectiveness,
      successRate: r.successRate,
      thresholdRate: r.thresholdRate,
      sampleSize: r.count
    }))
  }
  
  /**
   * Generate strategy recommendations
   */
  generateStrategyRecommendations(byStrategy, byDimension) {
    const recommendations = []
    
    // Find best strategy overall
    const bestOverall = Object.entries(byStrategy)
      .filter(([, s]) => s.count >= 5)
      .sort(([, a], [, b]) => b.avgEffectiveness - a.avgEffectiveness)[0]
    
    if (bestOverall) {
      recommendations.push({
        type: 'BEST_OVERALL',
        strategy: bestOverall[0],
        effectiveness: bestOverall[1].avgEffectiveness,
        message: `"${bestOverall[0]}" strategy shows highest effectiveness (${bestOverall[1].avgEffectiveness}%)`
      })
    }
    
    // Find best strategy per dimension
    for (const [dim, stats] of Object.entries(byDimension)) {
      if (stats.count >= 5 && stats.avgEffectiveness > 50) {
        recommendations.push({
          type: 'DIMENSION_SPECIFIC',
          dimension: dim,
          effectiveness: stats.avgEffectiveness,
          message: `For "${dim}" dimension: ${stats.successRate}% success rate`
        })
      }
    }
    
    // Identify underperforming strategies
    const underperformers = Object.entries(byStrategy)
      .filter(([, s]) => s.count >= 5 && s.avgEffectiveness < 30)
    
    for (const [strategy, stats] of underperformers) {
      recommendations.push({
        type: 'NEEDS_IMPROVEMENT',
        strategy,
        effectiveness: stats.avgEffectiveness,
        message: `"${strategy}" strategy underperforming (${stats.avgEffectiveness}%). Consider revision.`
      })
    }
    
    return recommendations
  }
  
  /**
   * Generate research findings from data
   */
  generateResearchFindings(events, byStrategy) {
    const findings = {
      summary: '',
      keyFindings: [],
      statisticalSummary: {}
    }
    
    // Overall statistics
    const totalEvents = events.length
    const effectiveEvents = events.filter(e => e.improvements?.wasEffective).length
    const overallSuccessRate = Math.round((effectiveEvents / totalEvents) * 100)
    
    findings.statisticalSummary = {
      n: totalEvents,
      successRate: overallSuccessRate,
      avgImprovement: Math.round(
        events.reduce((sum, e) => sum + (e.improvements?.targetImprovement || 0), 0) / totalEvents * 100
      ) / 100
    }
    
    // Key finding 1: Overall effectiveness
    findings.keyFindings.push({
      finding: `AI Scaffolding ส่งผลให้คะแนน HOTS เพิ่มขึ้นใน ${overallSuccessRate}% ของกรณี (N=${totalEvents})`,
      significance: overallSuccessRate > 50 ? 'positive' : 'needs_attention'
    })
    
    // Key finding 2: Best strategy
    const strategies = Object.entries(byStrategy).filter(([, s]) => s.count >= 5)
    if (strategies.length > 1) {
      const best = strategies.sort(([, a], [, b]) => b.avgEffectiveness - a.avgEffectiveness)[0]
      const worst = strategies.sort(([, a], [, b]) => a.avgEffectiveness - b.avgEffectiveness)[0]
      
      if (best && worst && best[0] !== worst[0]) {
        findings.keyFindings.push({
          finding: `กลยุทธ์ "${best[0]}" มีประสิทธิผลสูงกว่า "${worst[0]}" อย่างมีนัยสำคัญ (${best[1].avgEffectiveness}% vs ${worst[1].avgEffectiveness}%)`,
          significance: 'comparative'
        })
      }
    }
    
    // Key finding 3: Metacognitive vs others
    const metacog = byStrategy['metacognitive']
    const modeling = byStrategy['modeling']
    
    if (metacog && modeling && metacog.count >= 5 && modeling.count >= 5) {
      const comparison = metacog.avgEffectiveness > modeling.avgEffectiveness 
        ? 'Metacognitive prompting มีประสิทธิผลสูงกว่า Modeling'
        : 'Modeling มีประสิทธิผลสูงกว่า Metacognitive prompting'
      
      findings.keyFindings.push({
        finding: comparison,
        significance: 'research_implication',
        data: {
          metacognitive: metacog.avgEffectiveness,
          modeling: modeling.avgEffectiveness
        }
      })
    }
    
    // Generate summary
    findings.summary = `จากการวิเคราะห์ Scaffolding ${totalEvents} ครั้ง พบว่ามีอัตราความสำเร็จ ${overallSuccessRate}% ` +
      `โดยกลยุทธ์ที่มีประสิทธิผลสูงสุดคือ ${strategies[0]?.[0] || 'N/A'}`
    
    return findings
  }
}

// Export enhanced modules
module.exports = {
  SCAFFOLDING_LEVELS,
  DIMENSION_STRATEGIES,
  identifyWeakDimensions,
  generateAdaptiveScaffolding,
  formatScaffoldingMessage,
  analyzeScaffoldingEffectiveness,
  getScaffoldingStatistics,
  
  // New exports for C10 research
  METACOGNITIVE_STRATEGIES,
  SCAFFOLDING_STRATEGY_TYPES,
  generateMetacognitiveScaffolding,
  getDimensionMetacognitiveContext,
  ScaffoldingEffectivenessTracker
}
