/**
 * 🎓 Grade-Level Calibration Module
 * 
 * ระบบปรับความคาดหวังตามระดับพัฒนาการทางปัญญา
 * อิงทฤษฎี Cognitive Development ของ Piaget และ Case
 * 
 * Features:
 * 1. Empirical grade-level anchors
 * 2. Developmental stage mapping
 * 3. Age-appropriate expectations
 * 4. Norming data integration
 * 
 * References:
 * - Piaget, J. (1952). Origins of Intelligence in Children
 * - Case, R. (1985). Intellectual Development: Birth to Adulthood
 * - Fischer, K. W. (1980). Theory of Cognitive Development
 */

/**
 * Thai Education Grade Level Mapping
 */
const GRADE_LEVELS = {
  // ประถมศึกษา (Primary)
  'ป.1': { age: 6, stage: 'preoperational', thaiName: 'ประถมศึกษาปีที่ 1' },
  'ป.2': { age: 7, stage: 'preoperational', thaiName: 'ประถมศึกษาปีที่ 2' },
  'ป.3': { age: 8, stage: 'concrete', thaiName: 'ประถมศึกษาปีที่ 3' },
  'ป.4': { age: 9, stage: 'concrete', thaiName: 'ประถมศึกษาปีที่ 4' },
  'ป.5': { age: 10, stage: 'concrete', thaiName: 'ประถมศึกษาปีที่ 5' },
  'ป.6': { age: 11, stage: 'concrete_late', thaiName: 'ประถมศึกษาปีที่ 6' },
  
  // มัธยมศึกษาตอนต้น (Lower Secondary)
  'ม.1': { age: 12, stage: 'transition', thaiName: 'มัธยมศึกษาปีที่ 1' },
  'ม.2': { age: 13, stage: 'formal_early', thaiName: 'มัธยมศึกษาปีที่ 2' },
  'ม.3': { age: 14, stage: 'formal_early', thaiName: 'มัธยมศึกษาปีที่ 3' },
  
  // มัธยมศึกษาตอนปลาย (Upper Secondary)
  'ม.4': { age: 15, stage: 'formal', thaiName: 'มัธยมศึกษาปีที่ 4' },
  'ม.5': { age: 16, stage: 'formal', thaiName: 'มัธยมศึกษาปีที่ 5' },
  'ม.6': { age: 17, stage: 'formal_mature', thaiName: 'มัธยมศึกษาปีที่ 6' }
}

/**
 * Cognitive Development Stages (Piaget + Case)
 */
const COGNITIVE_STAGES = {
  preoperational: {
    ageRange: '2-7',
    characteristics: [
      'Symbolic thinking developing',
      'Egocentrism',
      'Limited logical reasoning',
      'Focus on single aspects'
    ],
    hotsExpectations: {
      analysis: { max: 2, typical: 1 },
      reasoning: { max: 2, typical: 1 },
      creativity: { max: 3, typical: 2 },
      evidence: { max: 2, typical: 1 }
    }
  },
  
  concrete: {
    ageRange: '7-11',
    characteristics: [
      'Logical thinking about concrete events',
      'Understanding conservation',
      'Can classify and seriate',
      'Difficulty with abstract concepts'
    ],
    hotsExpectations: {
      analysis: { max: 3, typical: 2 },
      reasoning: { max: 3, typical: 2 },
      creativity: { max: 4, typical: 2 },
      evidence: { max: 3, typical: 2 }
    }
  },
  
  concrete_late: {
    ageRange: '11-12',
    characteristics: [
      'Transitioning to abstract thought',
      'Can apply logic to more complex situations',
      'Beginning hypothetical thinking'
    ],
    hotsExpectations: {
      analysis: { max: 4, typical: 3 },
      reasoning: { max: 4, typical: 3 },
      creativity: { max: 4, typical: 3 },
      evidence: { max: 4, typical: 3 }
    }
  },
  
  transition: {
    ageRange: '12-13',
    characteristics: [
      'Entering formal operations',
      'Can think abstractly sometimes',
      'Developing systematic thinking'
    ],
    hotsExpectations: {
      analysis: { max: 4, typical: 3 },
      reasoning: { max: 4, typical: 3 },
      creativity: { max: 5, typical: 3 },
      evidence: { max: 4, typical: 3 }
    }
  },
  
  formal_early: {
    ageRange: '13-15',
    characteristics: [
      'Abstract reasoning developing',
      'Can think hypothetically',
      'Beginning systematic problem-solving'
    ],
    hotsExpectations: {
      analysis: { max: 5, typical: 4 },
      reasoning: { max: 5, typical: 4 },
      creativity: { max: 5, typical: 4 },
      evidence: { max: 5, typical: 3 }
    }
  },
  
  formal: {
    ageRange: '15-17',
    characteristics: [
      'Full abstract reasoning',
      'Systematic and logical thinking',
      'Can consider multiple perspectives'
    ],
    hotsExpectations: {
      analysis: { max: 5, typical: 4 },
      reasoning: { max: 5, typical: 4 },
      creativity: { max: 5, typical: 4 },
      evidence: { max: 5, typical: 4 }
    }
  },
  
  formal_mature: {
    ageRange: '17+',
    characteristics: [
      'Mature formal operations',
      'Complex multi-factor analysis',
      'Sophisticated reasoning'
    ],
    hotsExpectations: {
      analysis: { max: 5, typical: 5 },
      reasoning: { max: 5, typical: 5 },
      creativity: { max: 5, typical: 5 },
      evidence: { max: 5, typical: 5 }
    }
  }
}

/**
 * Empirical Anchor Examples by Grade Level
 * Based on developmental expectations
 */
const GRADE_ANCHORS = {
  'ป.4-6': {
    analysis: {
      5: 'แยกเรื่องออกเป็น 2-3 ส่วนหลักได้ชัดเจน และอธิบายความเกี่ยวข้องกันได้',
      4: 'แยกส่วนประกอบสำคัญได้ แต่อาจไม่ครบหรือเชื่อมโยงไม่สมบูรณ์',
      3: 'บอกได้ว่ามีส่วนไหนบ้าง แต่ยังอธิบายแบบเล่าเรื่องมากกว่าวิเคราะห์',
      2: 'พยายามแยกแยะ แต่ยังสับสนหรือแยกไม่ตรงประเด็น',
      1: 'ตอบกว้างๆ ไม่แยกส่วน',
      0: 'ไม่ตอบหรือตอบไม่เกี่ยวกับคำถาม'
    },
    reasoning: {
      5: 'อธิบายว่าทำไมถึงเป็นอย่างนั้น โดยใช้เหตุผลที่เข้าใจง่ายและถูกต้อง',
      4: 'มีเหตุผลสนับสนุน แต่อาจไม่ครบหรือมีบางส่วนที่ยังไม่ชัด',
      3: 'พยายามให้เหตุผล แต่ยังเป็นความเชื่อมากกว่าตรรกะ',
      2: 'มีเหตุผลบ้างแต่ไม่ค่อยสัมพันธ์กัน',
      1: 'ตอบแบบคาดเดาไม่มีเหตุผล',
      0: 'ไม่มีเหตุผลใดๆ'
    },
    creativity: {
      5: 'เสนอไอเดียที่แปลกใหม่และสามารถนำไปใช้ได้จริง',
      4: 'มีความคิดที่น่าสนใจ แตกต่างจากคำตอบทั่วไป',
      3: 'ปรับปรุงหรือต่อยอดจากสิ่งที่รู้อยู่แล้วเล็กน้อย',
      2: 'ตอบตามที่เรียนมาโดยไม่มีสิ่งใหม่',
      1: 'ทำซ้ำคำตอบที่เคยได้ยินมา',
      0: 'ไม่แสดงความคิดใดๆ'
    },
    evidence: {
      5: 'ยกตัวอย่างที่เฉพาะเจาะจงและอธิบายว่าเกี่ยวข้องอย่างไร',
      4: 'มีตัวอย่างที่เกี่ยวข้อง แต่อาจไม่ได้อธิบายความเชื่อมโยงชัด',
      3: 'ยกตัวอย่างได้ แต่ยังกว้างๆ หรือไม่ตรงประเด็นนัก',
      2: 'พูดถึงตัวอย่างแบบคลุมเครือ',
      1: 'ไม่มีตัวอย่างแต่อ้างว่ามี',
      0: 'ไม่มีหลักฐานหรือตัวอย่าง'
    }
  },
  
  'ม.1-3': {
    analysis: {
      5: 'แยกแยะองค์ประกอบได้ครบ เห็นโครงสร้างและความสัมพันธ์เชิงเหตุ-ผล',
      4: 'วิเคราะห์ได้ดี เห็นส่วนสำคัญ แต่อาจมีบางจุดที่เชื่อมโยงไม่ชัด',
      3: 'แยกบางประเด็นได้ แต่ยังขาดความลึกหรือมองภาพรวมไม่ครบ',
      2: 'พยายามวิเคราะห์แต่ยังเล่าเรื่องมากกว่าแยกแยะ',
      1: 'ตอบผิวเผิน ไม่มีการวิเคราะห์',
      0: 'ไม่วิเคราะห์หรือตอบนอกประเด็น'
    },
    reasoning: {
      5: 'เหตุผลเป็นลำดับขั้นตอน มีตรรกะชัดเจน สรุปสอดคล้อง',
      4: 'ให้เหตุผลได้ดี มีบางจุดที่อาจกระโดดข้ามขั้นตอน',
      3: 'มีเหตุผลพื้นฐาน แต่ยังมีช่องว่างในการอนุมาน',
      2: 'เหตุผลไม่ชัด อาจใช้ความเชื่อมากกว่าหลักการ',
      1: 'ตรรกะผิดพลาดหรือสรุปไม่ตามเหตุผล',
      0: 'ไม่มีเหตุผลที่ตรวจสอบได้'
    },
    creativity: {
      5: 'เสนอมุมมองใหม่ที่ไม่ซ้ำใคร มีความเป็นไปได้และน่าสนใจ',
      4: 'มีไอเดียสดใหม่อย่างน้อย 1 จุด แตกต่างจากคำตอบทั่วไป',
      3: 'ต่อยอดจากความรู้เดิมได้บ้าง แต่ยังไม่โดดเด่น',
      2: 'ใช้แนวคิดทั่วไป ไม่มีความแปลกใหม่',
      1: 'ทำซ้ำสิ่งที่เรียนมาโดยไม่มีการปรับ',
      0: 'ไม่แสดงความคิดริเริ่ม'
    },
    evidence: {
      5: 'ยกหลักฐานเฉพาะเจาะจง ตรงประเด็น อธิบายความเชื่อมโยงชัดเจน',
      4: 'มีหลักฐานที่เกี่ยวข้องและอธิบายได้พอสมควร',
      3: 'มีตัวอย่างแต่ยังทั่วไป หรือเชื่อมโยงหลวม',
      2: 'อ้างอิงกว้างๆ ไม่เจาะจง',
      1: 'กล่าวอ้างโดยไม่มีหลักฐานตรวจสอบได้',
      0: 'ไม่มีหลักฐานหรือตัวอย่าง'
    }
  },
  
  'ม.4-6': {
    analysis: {
      5: 'แยกแยะประเด็นซับซ้อน เห็นความสัมพันธ์หลายระดับ เชื่อมโยงข้ามศาสตร์ได้',
      4: 'วิเคราะห์ครอบคลุม มีโครงสร้างชัด อาจขาดมิติบางอย่าง',
      3: 'วิเคราะห์ได้ดีในบางมิติ แต่ยังไม่ครบถ้วน',
      2: 'วิเคราะห์ตื้น ไม่เห็นความซับซ้อน',
      1: 'อธิบายแบบเล่าเรื่องมากกว่าวิเคราะห์',
      0: 'ไม่วิเคราะห์หรือตอบนอกประเด็น'
    },
    reasoning: {
      5: 'เหตุผลเป็นระบบ มีตรรกะซับซ้อน พิจารณาข้อยกเว้นและข้อจำกัด',
      4: 'ให้เหตุผลดี มีการอนุมานที่ถูกต้อง อาจขาดความลึกบางจุด',
      3: 'มีเหตุผลพื้นฐานดี แต่ยังมีช่องโหว่ในตรรกะ',
      2: 'เหตุผลไม่แข็งแรง ขาดความสมบูรณ์',
      1: 'ตรรกะผิดพลาดหรือสรุปโดยไม่มีเหตุผลรองรับ',
      0: 'ไม่มีเหตุผล'
    },
    creativity: {
      5: 'เสนอกรอบคิดใหม่ มองปัญหาจากมุมที่ไม่ชัดเจนเดิม สังเคราะห์ข้ามศาสตร์',
      4: 'มีมุมมองใหม่ที่ชัดเจน สามารถนำไปพัฒนาต่อได้',
      3: 'ปรับประยุกต์ไอเดียเดิมได้บ้าง แต่ไม่โดดเด่น',
      2: 'ใช้แนวคิดทั่วไป ซ้ำแพทเทิร์นคุ้นเคย',
      1: 'ทำซ้ำความรู้เดิมไม่มีมุมใหม่',
      0: 'ไม่แสดงความคิดสร้างสรรค์'
    },
    evidence: {
      5: 'ยกหลักฐานหลายแหล่ง เฉพาะเจาะจง น่าเชื่อถือ เชื่อมโยงกับข้อสรุปอย่างเป็นระบบ',
      4: 'มีหลักฐานดี เกี่ยวข้องและอธิบายความสัมพันธ์ได้',
      3: 'มีหลักฐานแต่อาจไม่หลากหลายหรือเชื่อมโยงหลวม',
      2: 'อ้างอิงกว้างๆ ไม่เฉพาะเจาะจง',
      1: 'กล่าวอ้างลอยๆ ไม่มีหลักฐาน',
      0: 'ไม่มีการใช้หลักฐาน'
    }
  }
}

/**
 * Get cognitive stage for grade level
 * @param {string} gradeLevel - Grade level (e.g., 'ม.3')
 * @returns {Object} Stage information
 */
function getCognitiveStage(gradeLevel) {
  const gradeInfo = GRADE_LEVELS[gradeLevel]
  
  if (!gradeInfo) {
    // Try to parse alternate formats
    const normalized = normalizeGradeLevel(gradeLevel)
    if (normalized && GRADE_LEVELS[normalized]) {
      return {
        gradeLevel: normalized,
        ...GRADE_LEVELS[normalized],
        stage: COGNITIVE_STAGES[GRADE_LEVELS[normalized].stage]
      }
    }
    return { error: 'Unknown grade level', input: gradeLevel }
  }

  return {
    gradeLevel,
    ...gradeInfo,
    stage: COGNITIVE_STAGES[gradeInfo.stage]
  }
}

/**
 * Normalize grade level to standard format
 */
function normalizeGradeLevel(input) {
  if (!input) return null
  
  const normalized = input.toString().trim()
  
  // Direct match
  if (GRADE_LEVELS[normalized]) return normalized
  
  // Common variations
  const variations = {
    'p1': 'ป.1', 'p2': 'ป.2', 'p3': 'ป.3', 'p4': 'ป.4', 'p5': 'ป.5', 'p6': 'ป.6',
    'm1': 'ม.1', 'm2': 'ม.2', 'm3': 'ม.3', 'm4': 'ม.4', 'm5': 'ม.5', 'm6': 'ม.6',
    'grade 1': 'ป.1', 'grade 2': 'ป.2', 'grade 3': 'ป.3', 'grade 4': 'ป.4', 
    'grade 5': 'ป.5', 'grade 6': 'ป.6', 'grade 7': 'ม.1', 'grade 8': 'ม.2',
    'grade 9': 'ม.3', 'grade 10': 'ม.4', 'grade 11': 'ม.5', 'grade 12': 'ม.6',
    '1': 'ป.1', '2': 'ป.2', '3': 'ป.3', '4': 'ป.4', '5': 'ป.5', '6': 'ป.6',
    '7': 'ม.1', '8': 'ม.2', '9': 'ม.3', '10': 'ม.4', '11': 'ม.5', '12': 'ม.6'
  }
  
  return variations[normalized.toLowerCase()] || null
}

/**
 * Get expected score range for grade level
 * @param {string} gradeLevel - Grade level
 * @returns {Object} Expected score ranges per dimension
 */
function getExpectedScoreRange(gradeLevel) {
  const stageInfo = getCognitiveStage(gradeLevel)
  
  if (stageInfo.error) {
    return stageInfo
  }

  const expectations = stageInfo.stage.hotsExpectations
  
  return {
    gradeLevel: stageInfo.gradeLevel,
    stageName: stageInfo.stage.ageRange,
    characteristics: stageInfo.stage.characteristics,
    dimensions: {
      analysis: {
        typical: expectations.analysis.typical,
        maximum: expectations.analysis.max,
        passingThreshold: Math.min(3, expectations.analysis.typical)
      },
      reasoning: {
        typical: expectations.reasoning.typical,
        maximum: expectations.reasoning.max,
        passingThreshold: Math.min(3, expectations.reasoning.typical)
      },
      creativity: {
        typical: expectations.creativity.typical,
        maximum: expectations.creativity.max,
        passingThreshold: Math.min(3, expectations.creativity.typical)
      },
      evidence: {
        typical: expectations.evidence.typical,
        maximum: expectations.evidence.max,
        passingThreshold: Math.min(3, expectations.evidence.typical)
      }
    }
  }
}

/**
 * Get grade-appropriate rubric anchors
 * @param {string} gradeLevel - Grade level
 * @returns {Object} Grade-specific anchors
 */
function getGradeAnchors(gradeLevel) {
  const normalized = normalizeGradeLevel(gradeLevel)
  
  if (!normalized) {
    return { error: 'Unknown grade level', input: gradeLevel }
  }

  // Determine anchor group
  const gradeNum = parseInt(normalized.replace(/[^0-9]/g, ''))
  const isSecondary = normalized.startsWith('ม')
  
  let anchorKey
  if (!isSecondary && gradeNum >= 4 && gradeNum <= 6) {
    anchorKey = 'ป.4-6'
  } else if (isSecondary && gradeNum >= 1 && gradeNum <= 3) {
    anchorKey = 'ม.1-3'
  } else if (isSecondary && gradeNum >= 4 && gradeNum <= 6) {
    anchorKey = 'ม.4-6'
  } else {
    // Default to most appropriate
    anchorKey = !isSecondary ? 'ป.4-6' : 'ม.1-3'
  }

  return {
    gradeLevel: normalized,
    anchorGroup: anchorKey,
    anchors: GRADE_ANCHORS[anchorKey]
  }
}

/**
 * Generate calibrated assessment prompt context
 * @param {string} gradeLevel - Grade level
 * @param {string} subject - Subject area (optional)
 * @returns {string} Prompt context for AI
 */
function generateGradeCalibrationContext(gradeLevel, subject = null) {
  const stageInfo = getCognitiveStage(gradeLevel)
  const anchors = getGradeAnchors(gradeLevel)
  const expectations = getExpectedScoreRange(gradeLevel)

  if (stageInfo.error || anchors.error) {
    return `
📚 ระดับชั้น: ไม่ระบุ
⚖️ ใช้เกณฑ์มาตรฐานทั่วไป`
  }

  let context = `
📚 ระดับชั้น: ${stageInfo.gradeLevel} (${stageInfo.thaiName})
👤 อายุโดยประมาณ: ${stageInfo.age} ปี
🧠 ขั้นพัฒนาการ: ${stageInfo.stage.ageRange}
${subject ? `📖 วิชา: ${subject}` : ''}

⚙️ ลักษณะทางปัญญาของนักเรียนระดับนี้:
${stageInfo.stage.characteristics.map(c => `• ${c}`).join('\n')}

📊 ความคาดหวังที่เหมาะสมตามพัฒนาการ:
• Analysis: คะแนนปกติ ${expectations.dimensions.analysis.typical}/5 (สูงสุดที่คาดหวัง ${expectations.dimensions.analysis.maximum}/5)
• Reasoning: คะแนนปกติ ${expectations.dimensions.reasoning.typical}/5 (สูงสุดที่คาดหวัง ${expectations.dimensions.reasoning.maximum}/5)
• Creativity: คะแนนปกติ ${expectations.dimensions.creativity.typical}/5 (สูงสุดที่คาดหวัง ${expectations.dimensions.creativity.maximum}/5)
• Evidence: คะแนนปกติ ${expectations.dimensions.evidence.typical}/5 (สูงสุดที่คาดหวัง ${expectations.dimensions.evidence.maximum}/5)

🎯 เกณฑ์ผ่านที่ปรับตามระดับชั้น:
• ป.4-6: คะแนนรวม ≥ 8/20 ถือว่าแสดงทักษะการคิดที่เหมาะสม
• ม.1-3: คะแนนรวม ≥ 10/20 ถือว่าแสดงทักษะการคิดที่เหมาะสม  
• ม.4-6: คะแนนรวม ≥ 12/20 ถือว่าแสดงทักษะการคิดที่เหมาะสม

⚠️ หลักการปรับเกณฑ์:
1. ให้คะแนนตาม "สิ่งที่นักเรียนทำได้" ไม่ใช่ "สิ่งที่ผู้ใหญ่ทำได้"
2. คะแนน 3/5 = ถึงเกณฑ์สำหรับระดับชั้นนั้นๆ
3. คะแนน 5/5 = โดดเด่นเกินกว่าที่คาดหวังสำหรับระดับชั้น
4. พิจารณาความซับซ้อนของภาษาตามวัย ไม่หักคะแนนเพราะใช้คำง่าย`

  // Add grade-specific anchors
  if (anchors.anchors) {
    context += `

📌 ตัวอย่าง Anchor สำหรับ ${anchors.anchorGroup}:
【Analysis】
• 5: ${anchors.anchors.analysis[5]}
• 3: ${anchors.anchors.analysis[3]}
• 1: ${anchors.anchors.analysis[1]}

【Reasoning】  
• 5: ${anchors.anchors.reasoning[5]}
• 3: ${anchors.anchors.reasoning[3]}
• 1: ${anchors.anchors.reasoning[1]}`
  }

  return context
}

/**
 * Adjust passing threshold based on grade
 * @param {string} gradeLevel - Grade level
 * @returns {Object} Adjusted thresholds
 */
function getAdjustedThresholds(gradeLevel) {
  const normalized = normalizeGradeLevel(gradeLevel)
  const gradeNum = parseInt((normalized || '').replace(/[^0-9]/g, '') || '0')
  const isSecondary = (normalized || '').startsWith('ม')
  
  let overallPassThreshold = 12  // Default ม.4-6
  let dimensionPassThreshold = 3
  
  if (!isSecondary) {
    // ป.1-6
    overallPassThreshold = 8
    dimensionPassThreshold = 2
  } else if (gradeNum <= 3) {
    // ม.1-3
    overallPassThreshold = 10
    dimensionPassThreshold = 3
  }

  return {
    gradeLevel: normalized || gradeLevel,
    overallPassThreshold,
    dimensionPassThreshold,
    maxScore: 20,
    passRate: Math.round((overallPassThreshold / 20) * 100)
  }
}

/**
 * Check if score is appropriate for grade level
 * @param {Object} rubricScores - HOTS scores
 * @param {string} gradeLevel - Grade level
 * @returns {Object} Appropriateness check
 */
function checkScoreAppropriateness(rubricScores, gradeLevel) {
  const expectations = getExpectedScoreRange(gradeLevel)
  
  if (expectations.error) {
    return { error: expectations.error }
  }

  const results = {
    gradeLevel: expectations.gradeLevel,
    dimensions: {},
    flags: [],
    overallAssessment: 'appropriate'
  }

  for (const [dim, score] of Object.entries(rubricScores)) {
    const expected = expectations.dimensions[dim]
    if (!expected) continue

    const isAboveMax = score > expected.maximum
    const isBelowTypical = score < expected.typical - 1
    const isOutstanding = score >= expected.maximum

    results.dimensions[dim] = {
      score,
      typicalExpected: expected.typical,
      maximumExpected: expected.maximum,
      status: isAboveMax ? 'exceptionally_high' :
              isOutstanding ? 'outstanding' :
              isBelowTypical ? 'below_typical' : 'appropriate'
    }

    if (isAboveMax) {
      results.flags.push({
        dimension: dim,
        type: 'above_developmental_expectation',
        message: `Score ${score} exceeds typical maximum ${expected.maximum} for ${expectations.gradeLevel}`
      })
    }
  }

  if (results.flags.length > 2) {
    results.overallAssessment = 'needs_review'
  }

  return results
}

module.exports = {
  GRADE_LEVELS,
  COGNITIVE_STAGES,
  GRADE_ANCHORS,
  getCognitiveStage,
  normalizeGradeLevel,
  getExpectedScoreRange,
  getGradeAnchors,
  generateGradeCalibrationContext,
  getAdjustedThresholds,
  checkScoreAppropriateness
}
