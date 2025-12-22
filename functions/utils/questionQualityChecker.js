/**
 * ✅ Question Quality Checker Module
 * 
 * ตรวจสอบคุณภาพคำถามที่ครูสร้างว่าเป็น HOTS หรือไม่
 * - Bloom's Taxonomy Level Detection
 * - Question Stem Analysis
 * - Cognitive Complexity Assessment
 * - Answer Space Analysis
 * 
 * References:
 * - Anderson & Krathwohl (2001). Bloom's Revised Taxonomy
 * - Webb (2002). Depth of Knowledge
 * - Hess et al. (2009). Cognitive Rigor Matrix
 * 
 * @module questionQualityChecker
 * @version 1.0.0
 */

/**
 * Bloom's Taxonomy Verb Categories
 */
const BLOOMS_VERBS = {
  // Lower-Order Thinking Skills (LOTS)
  remember: {
    level: 1,
    category: 'LOTS',
    verbs: [
      'จำ', 'ท่อง', 'ระบุ', 'บอก', 'เลือก', 'จับคู่', 'ตั้งชื่อ', 'กำหนด',
      'define', 'list', 'name', 'recall', 'identify', 'match', 'recognize', 'state',
      'memorize', 'repeat', 'label', 'select'
    ],
    examples: ['คืออะไร', 'มีอะไรบ้าง', 'ใครเป็นคน', 'เกิดขึ้นเมื่อไหร่']
  },
  understand: {
    level: 2,
    category: 'LOTS',
    verbs: [
      'อธิบาย', 'แปลความ', 'สรุป', 'ยกตัวอย่าง', 'จัดกลุ่ม', 'เปรียบเทียบ',
      'explain', 'describe', 'summarize', 'interpret', 'classify', 'compare',
      'discuss', 'illustrate', 'paraphrase', 'restate'
    ],
    examples: ['อธิบายว่า', 'หมายความว่าอย่างไร', 'สรุปได้ว่า']
  },
  apply: {
    level: 3,
    category: 'LOTS',
    verbs: [
      'ใช้', 'ประยุกต์', 'แก้ปัญหา', 'คำนวณ', 'ทดลอง', 'แสดง', 'ปฏิบัติ',
      'apply', 'use', 'solve', 'demonstrate', 'implement', 'execute', 'calculate',
      'show', 'practice', 'operate'
    ],
    examples: ['นำไปใช้', 'แก้ปัญหา', 'คำนวณหา']
  },
  
  // Higher-Order Thinking Skills (HOTS)
  analyze: {
    level: 4,
    category: 'HOTS',
    verbs: [
      'วิเคราะห์', 'แยกแยะ', 'เปรียบเทียบ', 'ตรวจสอบ', 'จัดระเบียบ', 'หาความสัมพันธ์',
      'analyze', 'examine', 'compare', 'contrast', 'differentiate', 'distinguish',
      'categorize', 'investigate', 'organize', 'attribute', 'deconstruct'
    ],
    examples: ['วิเคราะห์ว่า', 'ทำไมจึง', 'ความสัมพันธ์ระหว่าง', 'แตกต่างกันอย่างไร']
  },
  evaluate: {
    level: 5,
    category: 'HOTS',
    verbs: [
      'ประเมิน', 'ตัดสิน', 'วิจารณ์', 'ให้เหตุผล', 'สนับสนุน', 'โต้แย้ง', 'ตัดสินใจ',
      'evaluate', 'judge', 'critique', 'justify', 'argue', 'defend', 'assess',
      'appraise', 'recommend', 'prioritize', 'rate', 'decide'
    ],
    examples: ['เห็นด้วยหรือไม่', 'ดีที่สุด', 'เหมาะสมหรือไม่', 'ควรหรือไม่ควร']
  },
  create: {
    level: 6,
    category: 'HOTS',
    verbs: [
      'สร้าง', 'ออกแบบ', 'วางแผน', 'คิดค้น', 'ผลิต', 'พัฒนา', 'แต่ง', 'ประดิษฐ์',
      'create', 'design', 'plan', 'develop', 'produce', 'compose', 'construct',
      'invent', 'formulate', 'hypothesize', 'propose', 'generate'
    ],
    examples: ['ออกแบบ', 'วางแผน', 'สร้างสรรค์', 'คิดวิธีใหม่']
  }
}

/**
 * Question Quality Indicators
 */
const QUALITY_INDICATORS = {
  good: {
    // Good HOTS questions have these characteristics
    openEnded: true,
    multipleValidAnswers: true,
    requiresJustification: true,
    connectsToRealWorld: true,
    involvesDecisionMaking: true
  },
  poor: {
    // Poor questions have these red flags
    singleCorrectAnswer: true,
    factRecall: true,
    yesNoQuestion: true,
    fillInTheBlank: true,
    trivialChoice: true
  }
}

/**
 * Red Flag Patterns for LOTS Questions
 */
const LOTS_PATTERNS = [
  // Thai patterns
  { pattern: /^.{0,20}คืออะไร\??$/i, flag: 'DEFINITION_RECALL' },
  { pattern: /^.{0,20}มีอะไรบ้าง\??$/i, flag: 'LIST_RECALL' },
  { pattern: /ใช่หรือไม่\??$/i, flag: 'YES_NO_QUESTION' },
  { pattern: /จริงหรือเท็จ\??$/i, flag: 'TRUE_FALSE' },
  { pattern: /เลือกข้อที่ถูก/i, flag: 'SINGLE_CHOICE' },
  { pattern: /เติมคำในช่องว่าง/i, flag: 'FILL_IN_BLANK' },
  { pattern: /เกิดขึ้นเมื่อ(ใด|ไหร่)/i, flag: 'DATE_RECALL' },
  { pattern: /อยู่ที่ไหน/i, flag: 'LOCATION_RECALL' },
  { pattern: /มีกี่(ข้อ|อย่าง|ประเภท)/i, flag: 'COUNT_RECALL' },
  
  // English patterns
  { pattern: /^what is .{1,30}\??$/i, flag: 'DEFINITION_RECALL' },
  { pattern: /^who (is|was|were)/i, flag: 'PERSON_RECALL' },
  { pattern: /^when did/i, flag: 'DATE_RECALL' },
  { pattern: /^where (is|was|were)/i, flag: 'LOCATION_RECALL' },
  { pattern: /true or false/i, flag: 'TRUE_FALSE' },
  { pattern: /fill in the blank/i, flag: 'FILL_IN_BLANK' },
  { pattern: /^(select|choose) the (correct|right)/i, flag: 'SINGLE_CHOICE' }
]

/**
 * HOTS Enhancer Patterns
 */
const HOTS_ENHANCERS = [
  // Thai patterns
  { pattern: /ทำไม.+จึง/i, score: 2, reason: 'Asks for causal reasoning' },
  { pattern: /วิเคราะห์.+อย่างไร/i, score: 3, reason: 'Explicit analysis request' },
  { pattern: /เห็นด้วยหรือไม่.+เพราะ/i, score: 3, reason: 'Requires evaluation + justification' },
  { pattern: /เปรียบเทียบ.+และ/i, score: 2, reason: 'Comparison required' },
  { pattern: /ออกแบบ.+เพื่อ/i, score: 3, reason: 'Design/creation task' },
  { pattern: /วางแผน.+อย่างไร/i, score: 3, reason: 'Planning required' },
  { pattern: /ถ้า.+จะเกิดอะไร/i, score: 2, reason: 'Hypothetical reasoning' },
  { pattern: /มีผลกระทบอย่างไร/i, score: 2, reason: 'Impact analysis' },
  { pattern: /แก้ปัญหา.+ได้อย่างไร/i, score: 2, reason: 'Problem-solving' },
  { pattern: /ข้อดีข้อเสีย/i, score: 2, reason: 'Pros/cons evaluation' },
  
  // English patterns
  { pattern: /why (do|does|did|would|should)/i, score: 2, reason: 'Causal reasoning' },
  { pattern: /how would you/i, score: 2, reason: 'Application/synthesis' },
  { pattern: /what if/i, score: 2, reason: 'Hypothetical reasoning' },
  { pattern: /compare and contrast/i, score: 3, reason: 'Comparison required' },
  { pattern: /evaluate.+and justify/i, score: 3, reason: 'Evaluation + justification' },
  { pattern: /design a/i, score: 3, reason: 'Creation task' },
  { pattern: /what are the implications/i, score: 2, reason: 'Impact analysis' },
  { pattern: /to what extent/i, score: 3, reason: 'Nuanced evaluation' }
]

/**
 * 🔍 Analyze Question Quality
 * วิเคราะห์คุณภาพคำถามว่าเป็น HOTS หรือไม่
 * 
 * @param {string} questionText - ข้อความคำถาม
 * @param {Object} options - ตัวเลือกเพิ่มเติม
 * @returns {Object} Quality analysis result
 */
function analyzeQuestionQuality(questionText, options = {}) {
  if (!questionText || typeof questionText !== 'string') {
    return { error: 'Invalid question text' }
  }
  
  const text = questionText.trim().toLowerCase()
  const analysis = {
    questionLength: questionText.length,
    wordCount: questionText.split(/\s+/).filter(w => w.length > 0).length,
    bloomsLevel: null,
    bloomsCategory: null,
    isHOTS: false,
    hotsScore: 0,
    flags: [],
    enhancers: [],
    recommendations: []
  }
  
  // 1. Check Bloom's verb level
  analysis.bloomsAnalysis = detectBloomsLevel(questionText)
  analysis.bloomsLevel = analysis.bloomsAnalysis.level
  analysis.bloomsCategory = analysis.bloomsAnalysis.category
  
  // 2. Check for LOTS red flags
  for (const lotsPat of LOTS_PATTERNS) {
    if (lotsPat.pattern.test(questionText)) {
      analysis.flags.push({
        type: lotsPat.flag,
        severity: 'warning',
        message: `Pattern suggests lower-order question: ${lotsPat.flag}`
      })
    }
  }
  
  // 3. Check for HOTS enhancers
  for (const enhancer of HOTS_ENHANCERS) {
    if (enhancer.pattern.test(questionText)) {
      analysis.enhancers.push({
        pattern: enhancer.reason,
        score: enhancer.score
      })
      analysis.hotsScore += enhancer.score
    }
  }
  
  // 4. Analyze question structure
  const structureAnalysis = analyzeQuestionStructure(questionText)
  analysis.structure = structureAnalysis
  
  if (structureAnalysis.isOpenEnded) analysis.hotsScore += 2
  if (structureAnalysis.requiresJustification) analysis.hotsScore += 2
  if (structureAnalysis.hasContext) analysis.hotsScore += 1
  
  // 5. Calculate final HOTS determination
  // Base score from Bloom's level
  if (analysis.bloomsLevel >= 4) analysis.hotsScore += (analysis.bloomsLevel - 3) * 2
  
  // Penalty for LOTS flags
  analysis.hotsScore -= analysis.flags.length * 2
  
  // Clamp score
  analysis.hotsScore = Math.max(0, Math.min(10, analysis.hotsScore))
  
  // Final determination
  analysis.isHOTS = analysis.hotsScore >= 5 && analysis.bloomsLevel >= 4
  
  // 6. Generate recommendations
  analysis.recommendations = generateQualityRecommendations(analysis)
  
  // 7. Quality grade
  analysis.grade = getQualityGrade(analysis)
  
  return analysis
}

/**
 * 🎯 Detect Bloom's Taxonomy Level
 */
function detectBloomsLevel(questionText) {
  const text = questionText.toLowerCase()
  let maxLevel = 1
  let maxCategory = 'LOTS'
  const detectedVerbs = []
  
  for (const [levelName, levelData] of Object.entries(BLOOMS_VERBS)) {
    for (const verb of levelData.verbs) {
      if (text.includes(verb.toLowerCase())) {
        detectedVerbs.push({ verb, level: levelData.level, category: levelData.category })
        if (levelData.level > maxLevel) {
          maxLevel = levelData.level
          maxCategory = levelData.category
        }
      }
    }
  }
  
  // Check examples too
  for (const [levelName, levelData] of Object.entries(BLOOMS_VERBS)) {
    for (const example of levelData.examples) {
      if (text.includes(example.toLowerCase())) {
        if (levelData.level > maxLevel || (levelData.level === maxLevel && levelData.category === 'HOTS')) {
          maxLevel = levelData.level
          maxCategory = levelData.category
        }
      }
    }
  }
  
  return {
    level: maxLevel,
    category: maxCategory,
    levelName: Object.keys(BLOOMS_VERBS).find(k => BLOOMS_VERBS[k].level === maxLevel) || 'remember',
    detectedVerbs,
    isHOTS: maxCategory === 'HOTS'
  }
}

/**
 * 📐 Analyze Question Structure
 */
function analyzeQuestionStructure(questionText) {
  const text = questionText.toLowerCase()
  
  return {
    // Open-ended indicators
    isOpenEnded: !text.includes('ใช่หรือไม่') && 
                 !text.includes('จริงหรือเท็จ') &&
                 !text.includes('true or false') &&
                 !text.includes('yes or no') &&
                 !text.match(/^.{0,30}(คือ|is|are)อะไร\??$/),
    
    // Justification required
    requiresJustification: text.includes('เพราะเหตุใด') ||
                          text.includes('อธิบายเหตุผล') ||
                          text.includes('ยกเหตุผล') ||
                          text.includes('explain why') ||
                          text.includes('justify') ||
                          text.includes('support your answer') ||
                          text.includes('พร้อมให้เหตุผล'),
    
    // Has context/scenario
    hasContext: questionText.length > 100 ||
                text.includes('สถานการณ์') ||
                text.includes('กรณี') ||
                text.includes('scenario') ||
                text.includes('given that') ||
                text.includes('suppose'),
    
    // Multiple parts
    hasMultipleParts: (questionText.match(/[ก-ฮa-z]\)/g) || []).length > 1 ||
                      text.includes('และอธิบาย') ||
                      text.includes('พร้อมยกตัวอย่าง'),
    
    // Word count check
    isSubstantial: questionText.split(/\s+/).length >= 15
  }
}

/**
 * 💡 Generate Quality Recommendations
 */
function generateQualityRecommendations(analysis) {
  const recommendations = []
  
  // Based on Bloom's level
  if (analysis.bloomsLevel <= 2) {
    recommendations.push({
      priority: 'HIGH',
      issue: 'Question tests lower-order thinking (Remember/Understand)',
      suggestion: 'Use verbs like วิเคราะห์, ประเมิน, ออกแบบ, เปรียบเทียบ to elevate cognitive level',
      example: 'Instead of "X คืออะไร", try "วิเคราะห์ว่า X มีผลกระทบต่อ Y อย่างไร"'
    })
  } else if (analysis.bloomsLevel === 3) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: 'Question tests Application level - borderline HOTS',
      suggestion: 'Add analysis or evaluation component',
      example: 'Add "และอธิบายเหตุผลที่เลือกวิธีนี้" to require justification'
    })
  }
  
  // Based on flags
  for (const flag of analysis.flags) {
    if (flag.type === 'YES_NO_QUESTION') {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Yes/No questions limit cognitive engagement',
        suggestion: 'Convert to open-ended by asking "ทำไม" or "อย่างไร"',
        example: '"เห็นด้วยหรือไม่" → "เห็นด้วยหรือไม่ เพราะเหตุใด จงอธิบายพร้อมยกหลักฐาน"'
      })
    }
    if (flag.type === 'DEFINITION_RECALL') {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Definition questions test pure recall',
        suggestion: 'Ask students to apply or analyze the concept',
        example: '"X คืออะไร" → "X มีความสำคัญอย่างไรในบริบทของ Y จงวิเคราะห์"'
      })
    }
  }
  
  // Based on structure
  if (!analysis.structure.requiresJustification) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: 'Question does not explicitly require justification',
      suggestion: 'Add "พร้อมอธิบายเหตุผล" or "จงยกหลักฐานสนับสนุน"',
      example: 'Ending with "เพราะเหตุใด" prompts deeper thinking'
    })
  }
  
  if (!analysis.structure.hasContext && analysis.questionLength < 100) {
    recommendations.push({
      priority: 'LOW',
      issue: 'Question lacks context or scenario',
      suggestion: 'Adding a realistic scenario increases cognitive demand',
      example: 'Start with "ในสถานการณ์ที่..." or provide a case study'
    })
  }
  
  return recommendations
}

/**
 * 🏆 Get Quality Grade
 */
function getQualityGrade(analysis) {
  if (analysis.hotsScore >= 8 && analysis.bloomsLevel >= 5 && analysis.flags.length === 0) {
    return {
      grade: 'A',
      label: 'Excellent HOTS Question',
      color: 'green',
      description: 'คำถามนี้ท้าทายการคิดขั้นสูงได้ดีเยี่ยม'
    }
  }
  if (analysis.hotsScore >= 6 && analysis.bloomsLevel >= 4) {
    return {
      grade: 'B',
      label: 'Good HOTS Question',
      color: 'blue',
      description: 'คำถามนี้ส่งเสริมการคิดขั้นสูงได้ดี'
    }
  }
  if (analysis.hotsScore >= 4 && analysis.bloomsLevel >= 3) {
    return {
      grade: 'C',
      label: 'Moderate - Could Improve',
      color: 'yellow',
      description: 'คำถามนี้เป็น HOTS ระดับปานกลาง ควรปรับปรุง'
    }
  }
  if (analysis.bloomsLevel >= 2) {
    return {
      grade: 'D',
      label: 'Mostly LOTS',
      color: 'orange',
      description: 'คำถามนี้เน้นความจำ/ความเข้าใจ ควรปรับเป็น HOTS'
    }
  }
  return {
    grade: 'F',
    label: 'Not HOTS',
    color: 'red',
    description: 'คำถามนี้เป็น LOTS ต้องปรับปรุงอย่างมาก'
  }
}

/**
 * 🔄 Suggest HOTS Transformation
 * แนะนำวิธีปรับคำถาม LOTS ให้เป็น HOTS
 * 
 * @param {string} lotsQuestion - คำถาม LOTS
 * @returns {Object} Transformation suggestions
 */
function suggestHOTSTransformation(lotsQuestion) {
  const analysis = analyzeQuestionQuality(lotsQuestion)
  
  if (analysis.isHOTS) {
    return {
      originalIsHOTS: true,
      message: 'คำถามนี้เป็น HOTS อยู่แล้ว',
      suggestions: []
    }
  }
  
  const suggestions = []
  const text = lotsQuestion.toLowerCase()
  
  // Pattern-based transformations
  if (text.includes('คืออะไร') || text.match(/^what is/)) {
    suggestions.push({
      strategy: 'Add Analysis',
      original: lotsQuestion,
      transformed: lotsQuestion.replace(/คืออะไร\??$/i, 'มีความสำคัญอย่างไร และส่งผลกระทบต่อ ___ อย่างไร')
        .replace(/what is (.+)\??$/i, 'How does $1 impact ___ and why is it significant?'),
      explanation: 'เปลี่ยนจากถามนิยามเป็นถามความสำคัญและผลกระทบ'
    })
  }
  
  if (text.includes('มีอะไรบ้าง') || text.match(/^list the/)) {
    suggestions.push({
      strategy: 'Add Evaluation',
      original: lotsQuestion,
      transformed: lotsQuestion.replace(/มีอะไรบ้าง\??$/i, 'มีอะไรบ้าง และข้อใดสำคัญที่สุด เพราะเหตุใด')
        .replace(/^list the (.+)\??$/i, 'What are the $1 and which is most important? Justify your choice.'),
      explanation: 'เพิ่มการประเมินค่าและให้เหตุผล'
    })
  }
  
  // Generic enhancement
  if (!analysis.structure.requiresJustification) {
    suggestions.push({
      strategy: 'Add Justification',
      original: lotsQuestion,
      transformed: lotsQuestion.replace(/\??\s*$/, ' พร้อมอธิบายเหตุผลและยกหลักฐานสนับสนุน'),
      explanation: 'เพิ่มการให้เหตุผลและหลักฐาน'
    })
  }
  
  // Add scenario
  suggestions.push({
    strategy: 'Add Scenario',
    original: lotsQuestion,
    transformed: `สมมติว่าคุณเป็น ___ ในสถานการณ์ที่ ___ ${lotsQuestion} คุณจะวิเคราะห์และตัดสินใจอย่างไร`,
    explanation: 'เพิ่มบริบทและบทบาทเพื่อให้ต้องประยุกต์ใช้'
  })
  
  return {
    originalIsHOTS: false,
    originalGrade: analysis.grade,
    originalScore: analysis.hotsScore,
    suggestions
  }
}

/**
 * 📊 Batch Analyze Questions
 * วิเคราะห์คำถามหลายข้อพร้อมกัน
 * 
 * @param {Array} questions - Array of question texts or objects
 * @returns {Object} Batch analysis results
 */
function batchAnalyzeQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { error: 'Invalid questions array' }
  }
  
  const results = questions.map((q, index) => {
    const text = typeof q === 'string' ? q : q.questionText || q.text || q.question
    return {
      index,
      questionPreview: text?.substring(0, 100) + (text?.length > 100 ? '...' : ''),
      analysis: analyzeQuestionQuality(text)
    }
  })
  
  // Summary statistics
  const grades = results.map(r => r.analysis.grade?.grade).filter(Boolean)
  const hotsCount = results.filter(r => r.analysis.isHOTS).length
  const avgScore = results.reduce((sum, r) => sum + (r.analysis.hotsScore || 0), 0) / results.length
  
  const gradeDistribution = {}
  for (const g of grades) {
    gradeDistribution[g] = (gradeDistribution[g] || 0) + 1
  }
  
  return {
    totalQuestions: questions.length,
    summary: {
      hotsQuestions: hotsCount,
      lotsQuestions: questions.length - hotsCount,
      hotsPercentage: Math.round(hotsCount / questions.length * 100),
      averageScore: Math.round(avgScore * 10) / 10,
      gradeDistribution
    },
    details: results,
    overallAssessment: hotsCount / questions.length >= 0.7 
      ? '✅ Good HOTS coverage'
      : hotsCount / questions.length >= 0.5
        ? '⚠️ Moderate HOTS coverage - consider adding more HOTS questions'
        : '❌ Low HOTS coverage - majority are LOTS questions'
  }
}

module.exports = {
  BLOOMS_VERBS,
  QUALITY_INDICATORS,
  LOTS_PATTERNS,
  HOTS_ENHANCERS,
  analyzeQuestionQuality,
  detectBloomsLevel,
  analyzeQuestionStructure,
  suggestHOTSTransformation,
  batchAnalyzeQuestions
}
