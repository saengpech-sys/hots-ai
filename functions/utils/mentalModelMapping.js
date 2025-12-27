/**
 * 🧠 Mental Model Mapping & Conceptual Change Engine
 * 
 * ระบบสกัด "Conceptual Change" เชิงคุณภาพ (Qualitative Engine)
 * วิเคราะห์การเปลี่ยนแปลงมโนทัศน์ของนักเรียนจากบทสนทนา
 * 
 * Features:
 * 1. Concept Extraction - สกัดแนวคิดหลักจากคำตอบ
 * 2. Mental Model Mapping - สร้างแผนภาพความคิด
 * 3. Conceptual Change Detection - ตรวจจับการเปลี่ยนแปลงมโนทัศน์
 * 4. Qualitative Synthesis - สังเคราะห์เชิงคุณภาพ
 * 5. Misconception Identification - ระบุความเข้าใจผิด
 * 6. Learning Progression Narrative - สร้างเรื่องเล่าพัฒนาการ
 * 
 * Impact for C10:
 * - หลักฐานเชิงประจักษ์ว่า "กระบวนการคิดเปลี่ยนไปอย่างไร"
 * - ไม่ใช่แค่คะแนนสูงขึ้น
 * 
 * Academic References:
 * - Vosniadou, S. (2013). Conceptual Change in Learning and Instruction
 * - Chi, M. T. H. (2008). Three Types of Conceptual Change
 * - diSessa, A. A. (2006). A History of Conceptual Change Research
 * - Posner, G. J., et al. (1982). Accommodation of a Scientific Conception
 * 
 * @version 1.0.0
 * @author HOTS-AI Research Team
 */

const admin = require('firebase-admin')

/**
 * 🎯 Conceptual Change Types (Based on Chi, 2008)
 */
const CONCEPTUAL_CHANGE_TYPES = {
  BELIEF_REVISION: {
    name: 'การปรับความเชื่อ',
    description: 'เปลี่ยนความเชื่อที่มีอยู่เดิมเป็นความเชื่อใหม่',
    examples: ['เปลี่ยนจากคิดว่า...เป็นเข้าใจว่า...', 'แก้ไขความเข้าใจผิดเดิม']
  },
  MENTAL_MODEL_TRANSFORMATION: {
    name: 'การเปลี่ยนรูปแบบความคิด',
    description: 'เปลี่ยนวิธีการมองปัญหาหรือสถานการณ์',
    examples: ['มองจากหลายมุม', 'เชื่อมโยงแนวคิดใหม่']
  },
  CATEGORICAL_SHIFT: {
    name: 'การเปลี่ยนหมวดหมู่',
    description: 'จัดกลุ่มแนวคิดใหม่ในหมวดหมู่ที่ถูกต้องกว่า',
    examples: ['เข้าใจความแตกต่างระหว่าง...', 'แยกแยะได้ชัดเจนขึ้น']
  },
  KNOWLEDGE_ENRICHMENT: {
    name: 'การเสริมความรู้',
    description: 'เพิ่มเติมรายละเอียดให้ความรู้ที่มีอยู่',
    examples: ['เพิ่มตัวอย่าง', 'อธิบายได้ละเอียดขึ้น']
  }
}

/**
 * 🔍 Concept Indicators for HOTS Dimensions
 */
const CONCEPT_INDICATORS = {
  analysis: {
    keywords: ['แยก', 'จำแนก', 'เปรียบเทียบ', 'แตกต่าง', 'คล้ายกัน', 'ความสัมพันธ์', 'องค์ประกอบ', 'โครงสร้าง'],
    patterns: [
      { pattern: 'แบ่งออกเป็น', level: 'basic' },
      { pattern: 'ความสัมพันธ์ระหว่าง', level: 'intermediate' },
      { pattern: 'วิเคราะห์เชิงลึก', level: 'advanced' }
    ]
  },
  reasoning: {
    keywords: ['เพราะ', 'ดังนั้น', 'เนื่องจาก', 'ส่งผล', 'เหตุ', 'ผล', 'สรุป', 'ถ้า...แล้ว'],
    patterns: [
      { pattern: 'เพราะว่า', level: 'basic' },
      { pattern: 'ส่งผลให้', level: 'intermediate' },
      { pattern: 'ตามหลักการ', level: 'advanced' }
    ]
  },
  creativity: {
    keywords: ['ใหม่', 'แตกต่าง', 'สร้างสรรค์', 'นวัตกรรม', 'คิดค้น', 'ประยุกต์', 'ออกแบบ', 'แก้ปัญหา'],
    patterns: [
      { pattern: 'ความคิดใหม่', level: 'basic' },
      { pattern: 'ประยุกต์ใช้', level: 'intermediate' },
      { pattern: 'ออกแบบแก้ปัญหา', level: 'advanced' }
    ]
  },
  evidence: {
    keywords: ['ตัวอย่าง', 'หลักฐาน', 'ข้อมูล', 'สถิติ', 'แหล่งอ้างอิง', 'พิสูจน์', 'ยืนยัน'],
    patterns: [
      { pattern: 'ตัวอย่างเช่น', level: 'basic' },
      { pattern: 'จากข้อมูล', level: 'intermediate' },
      { pattern: 'หลักฐานสนับสนุน', level: 'advanced' }
    ]
  }
}

/**
 * 🧠 Mental Model Mapper
 */
class MentalModelMapper {
  constructor(db) {
    this.db = db
  }
  
  /**
   * Build mental model map for a student's learning session
   * @param {string} studentId - Student ID
   * @param {string} sessionId - Session ID (optional, for single session analysis)
   * @param {Object} options - Mapping options
   * @returns {Object} Mental model map
   */
  async buildMentalModelMap(studentId, sessionId = null, options = {}) {
    const {
      includeRawResponses = false,
      maxAssessments = 20
    } = options
    
    // Get assessments with student answers
    let query = this.db.collection('assessments')
      .where('studentId', '==', studentId)
      .orderBy('createdAt', 'asc')
      .limit(maxAssessments)
    
    if (sessionId) {
      query = query.where('sessionId', '==', sessionId)
    }
    
    const snapshot = await query.get()
    const assessments = []
    
    snapshot.forEach(doc => {
      const data = doc.data()
      if (data.studentAnswer && data.rubricScores) {
        assessments.push({
          id: doc.id,
          ...data
        })
      }
    })
    
    if (assessments.length < 2) {
      return {
        success: false,
        error: 'Need at least 2 assessments with answers for mental model mapping',
        assessmentCount: assessments.length
      }
    }
    
    // Extract concepts from each response
    const conceptSequence = this.extractConceptSequence(assessments)
    
    // Build mental model map
    const mentalModelMap = {
      studentId,
      sessionId,
      assessmentCount: assessments.length,
      timeSpan: this.calculateTimeSpan(assessments),
      
      // Concept nodes and edges
      conceptNetwork: this.buildConceptNetwork(conceptSequence),
      
      // Conceptual changes detected
      conceptualChanges: this.detectConceptualChanges(conceptSequence),
      
      // Dimension-specific analysis
      dimensionModels: this.buildDimensionModels(conceptSequence),
      
      // Misconceptions identified
      misconceptions: this.identifyMisconceptions(assessments),
      
      // Overall synthesis
      qualitativeSynthesis: null,
      
      // Narrative summary
      learningNarrative: null,
      
      generatedAt: new Date().toISOString()
    }
    
    // Generate synthesis
    mentalModelMap.qualitativeSynthesis = this.synthesizeQualitatively(mentalModelMap)
    
    // Generate learning narrative
    mentalModelMap.learningNarrative = this.generateLearningNarrative(mentalModelMap, assessments)
    
    // Include raw responses if requested
    if (includeRawResponses) {
      mentalModelMap.rawResponses = assessments.map(a => ({
        id: a.id,
        answer: a.studentAnswer,
        scores: a.rubricScores,
        date: a.createdAt
      }))
    }
    
    return {
      success: true,
      mentalModelMap
    }
  }
  
  /**
   * Extract concept sequence from assessments
   */
  extractConceptSequence(assessments) {
    return assessments.map((assessment, index) => {
      const answer = assessment.studentAnswer || ''
      const scores = assessment.rubricScores || {}
      
      return {
        index,
        assessmentId: assessment.id,
        date: assessment.createdAt,
        
        // Extract concepts by dimension
        concepts: {
          analysis: this.extractDimensionConcepts(answer, 'analysis'),
          reasoning: this.extractDimensionConcepts(answer, 'reasoning'),
          creativity: this.extractDimensionConcepts(answer, 'creativity'),
          evidence: this.extractDimensionConcepts(answer, 'evidence')
        },
        
        // Overall concept characteristics
        characteristics: this.analyzeResponseCharacteristics(answer),
        
        // Associated scores
        scores
      }
    })
  }
  
  /**
   * Extract concepts for a specific dimension
   */
  extractDimensionConcepts(answer, dimension) {
    const indicators = CONCEPT_INDICATORS[dimension]
    if (!indicators) return { keywords: [], patterns: [], level: 'unknown' }
    
    const foundKeywords = []
    const foundPatterns = []
    let highestLevel = 'none'
    const levelOrder = { none: 0, basic: 1, intermediate: 2, advanced: 3 }
    
    // Find keywords
    for (const keyword of indicators.keywords) {
      if (answer.includes(keyword)) {
        foundKeywords.push(keyword)
      }
    }
    
    // Find patterns and determine level
    for (const { pattern, level } of indicators.patterns) {
      if (answer.includes(pattern)) {
        foundPatterns.push({ pattern, level })
        if (levelOrder[level] > levelOrder[highestLevel]) {
          highestLevel = level
        }
      }
    }
    
    return {
      keywords: foundKeywords,
      patterns: foundPatterns,
      level: highestLevel,
      richness: foundKeywords.length + foundPatterns.length * 2
    }
  }
  
  /**
   * Analyze overall response characteristics
   */
  analyzeResponseCharacteristics(answer) {
    const words = answer.split(/\s+/).filter(w => w.length > 0)
    const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    // Complexity indicators
    const hasConditionals = /ถ้า|หาก|กรณีที่/i.test(answer)
    const hasComparisons = /กว่า|มากกว่า|น้อยกว่า|เท่ากับ/i.test(answer)
    const hasExamples = /ตัวอย่าง|เช่น|อาทิ/i.test(answer)
    const hasReferences = /จาก|อ้างอิง|ตาม/i.test(answer)
    const hasMultiplePerspectives = /อีกด้านหนึ่ง|ในขณะที่|แต่อย่างไรก็ตาม/i.test(answer)
    
    // Count connectors (indicators of reasoning chains)
    const connectorCount = (answer.match(/เพราะ|ดังนั้น|จึง|เนื่องจาก|ส่งผล|ทำให้/g) || []).length
    
    return {
      length: answer.length,
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
      complexityIndicators: {
        hasConditionals,
        hasComparisons,
        hasExamples,
        hasReferences,
        hasMultiplePerspectives
      },
      connectorCount,
      complexityScore: this.calculateComplexityScore({
        hasConditionals,
        hasComparisons,
        hasExamples,
        hasReferences,
        hasMultiplePerspectives,
        connectorCount
      })
    }
  }
  
  /**
   * Calculate complexity score
   */
  calculateComplexityScore(indicators) {
    let score = 0
    if (indicators.hasConditionals) score += 2
    if (indicators.hasComparisons) score += 1.5
    if (indicators.hasExamples) score += 1.5
    if (indicators.hasReferences) score += 2
    if (indicators.hasMultiplePerspectives) score += 2.5
    score += Math.min(3, indicators.connectorCount * 0.5)
    
    return Math.round(score * 10) / 10
  }
  
  /**
   * Build concept network (nodes and edges)
   */
  buildConceptNetwork(conceptSequence) {
    const nodes = new Map() // concept -> { count, firstSeen, lastSeen, levels }
    const edges = new Map() // concept1-concept2 -> { count, strength }
    
    conceptSequence.forEach((item, timeIndex) => {
      const allConcepts = []
      
      // Collect concepts from all dimensions
      for (const dim of ['analysis', 'reasoning', 'creativity', 'evidence']) {
        const dimConcepts = item.concepts[dim]
        
        for (const keyword of dimConcepts.keywords) {
          allConcepts.push({ concept: keyword, dimension: dim, type: 'keyword' })
          
          // Update node
          if (!nodes.has(keyword)) {
            nodes.set(keyword, {
              concept: keyword,
              dimension: dim,
              count: 0,
              firstSeen: timeIndex,
              lastSeen: timeIndex,
              type: 'keyword'
            })
          }
          const node = nodes.get(keyword)
          node.count++
          node.lastSeen = timeIndex
        }
        
        for (const { pattern } of dimConcepts.patterns) {
          allConcepts.push({ concept: pattern, dimension: dim, type: 'pattern' })
          
          if (!nodes.has(pattern)) {
            nodes.set(pattern, {
              concept: pattern,
              dimension: dim,
              count: 0,
              firstSeen: timeIndex,
              lastSeen: timeIndex,
              type: 'pattern'
            })
          }
          const node = nodes.get(pattern)
          node.count++
          node.lastSeen = timeIndex
        }
      }
      
      // Create edges between co-occurring concepts
      for (let i = 0; i < allConcepts.length; i++) {
        for (let j = i + 1; j < allConcepts.length; j++) {
          const key = [allConcepts[i].concept, allConcepts[j].concept].sort().join('--')
          
          if (!edges.has(key)) {
            edges.set(key, {
              source: allConcepts[i].concept,
              target: allConcepts[j].concept,
              count: 0
            })
          }
          edges.get(key).count++
        }
      }
    })
    
    // Convert to arrays and add computed metrics
    const nodeArray = Array.from(nodes.values()).map(node => ({
      ...node,
      persistence: node.lastSeen - node.firstSeen + 1,
      frequency: node.count / conceptSequence.length
    }))
    
    const edgeArray = Array.from(edges.values()).map(edge => ({
      ...edge,
      strength: edge.count / conceptSequence.length
    }))
    
    // Sort by importance
    nodeArray.sort((a, b) => b.count - a.count)
    edgeArray.sort((a, b) => b.strength - a.strength)
    
    return {
      nodes: nodeArray.slice(0, 50), // Top 50 concepts
      edges: edgeArray.slice(0, 100), // Top 100 connections
      totalConcepts: nodes.size,
      networkDensity: edges.size > 0 ? edges.size / (nodes.size * (nodes.size - 1) / 2) : 0
    }
  }
  
  /**
   * Detect conceptual changes between responses
   */
  detectConceptualChanges(conceptSequence) {
    const changes = []
    
    for (let i = 1; i < conceptSequence.length; i++) {
      const prev = conceptSequence[i - 1]
      const curr = conceptSequence[i]
      
      // Detect changes in each dimension
      for (const dim of ['analysis', 'reasoning', 'creativity', 'evidence']) {
        const prevLevel = prev.concepts[dim].level
        const currLevel = curr.concepts[dim].level
        
        const levelOrder = { none: 0, basic: 1, intermediate: 2, advanced: 3 }
        const levelChange = levelOrder[currLevel] - levelOrder[prevLevel]
        
        if (levelChange !== 0) {
          const changeType = this.classifyConceptualChange(prev, curr, dim)
          
          changes.push({
            fromIndex: i - 1,
            toIndex: i,
            dimension: dim,
            dimensionLabel: this.getDimensionLabel(dim),
            previousLevel: prevLevel,
            currentLevel: currLevel,
            direction: levelChange > 0 ? 'advancement' : 'regression',
            changeType,
            magnitude: Math.abs(levelChange),
            description: this.describeChange(prev, curr, dim, changeType)
          })
        }
      }
      
      // Detect complexity changes
      const complexityChange = curr.characteristics.complexityScore - prev.characteristics.complexityScore
      if (Math.abs(complexityChange) >= 2) {
        changes.push({
          fromIndex: i - 1,
          toIndex: i,
          dimension: 'overall_complexity',
          direction: complexityChange > 0 ? 'increased' : 'decreased',
          magnitude: Math.abs(complexityChange),
          description: complexityChange > 0 
            ? 'คำตอบมีความซับซ้อนและลึกซึ้งขึ้น'
            : 'คำตอบมีความเรียบง่ายขึ้น'
        })
      }
      
      // Detect new concepts emerging
      const newConcepts = this.findNewConcepts(prev, curr)
      if (newConcepts.length > 0) {
        changes.push({
          fromIndex: i - 1,
          toIndex: i,
          dimension: 'concept_emergence',
          direction: 'expansion',
          newConcepts,
          description: `เกิดแนวคิดใหม่: ${newConcepts.join(', ')}`
        })
      }
    }
    
    // Summarize changes
    const summary = {
      totalChanges: changes.length,
      advancements: changes.filter(c => c.direction === 'advancement' || c.direction === 'increased').length,
      regressions: changes.filter(c => c.direction === 'regression' || c.direction === 'decreased').length,
      conceptExpansions: changes.filter(c => c.dimension === 'concept_emergence').length,
      byDimension: {}
    }
    
    for (const dim of ['analysis', 'reasoning', 'creativity', 'evidence']) {
      summary.byDimension[dim] = changes.filter(c => c.dimension === dim).length
    }
    
    return {
      changes,
      summary,
      significantChanges: changes.filter(c => c.magnitude >= 2 || c.dimension === 'concept_emergence')
    }
  }
  
  /**
   * Classify type of conceptual change
   */
  classifyConceptualChange(prev, curr, dimension) {
    const prevConcepts = new Set([...prev.concepts[dimension].keywords, ...prev.concepts[dimension].patterns.map(p => p.pattern)])
    const currConcepts = new Set([...curr.concepts[dimension].keywords, ...curr.concepts[dimension].patterns.map(p => p.pattern)])
    
    const added = [...currConcepts].filter(c => !prevConcepts.has(c))
    const removed = [...prevConcepts].filter(c => !currConcepts.has(c))
    const retained = [...prevConcepts].filter(c => currConcepts.has(c))
    
    // Classify based on Chi's taxonomy
    if (removed.length > 0 && added.length > 0) {
      return CONCEPTUAL_CHANGE_TYPES.BELIEF_REVISION
    }
    
    if (added.length > retained.length) {
      return CONCEPTUAL_CHANGE_TYPES.MENTAL_MODEL_TRANSFORMATION
    }
    
    if (added.length > 0 && removed.length === 0) {
      return CONCEPTUAL_CHANGE_TYPES.KNOWLEDGE_ENRICHMENT
    }
    
    return CONCEPTUAL_CHANGE_TYPES.CATEGORICAL_SHIFT
  }
  
  /**
   * Describe a conceptual change
   */
  describeChange(prev, curr, dimension, changeType) {
    const dimLabel = this.getDimensionLabel(dimension)
    const prevLevel = prev.concepts[dimension].level
    const currLevel = curr.concepts[dimension].level
    
    if (changeType === CONCEPTUAL_CHANGE_TYPES.BELIEF_REVISION) {
      return `ปรับเปลี่ยนความเข้าใจใน${dimLabel} จากระดับ ${this.getLevelLabel(prevLevel)} เป็น ${this.getLevelLabel(currLevel)}`
    }
    
    if (changeType === CONCEPTUAL_CHANGE_TYPES.MENTAL_MODEL_TRANSFORMATION) {
      return `เปลี่ยนวิธีคิดใน${dimLabel} มีมุมมองใหม่`
    }
    
    if (changeType === CONCEPTUAL_CHANGE_TYPES.KNOWLEDGE_ENRICHMENT) {
      return `เสริมความรู้ใน${dimLabel} มีรายละเอียดมากขึ้น`
    }
    
    return `พัฒนาใน${dimLabel} จาก ${this.getLevelLabel(prevLevel)} เป็น ${this.getLevelLabel(currLevel)}`
  }
  
  /**
   * Find new concepts that emerged
   */
  findNewConcepts(prev, curr) {
    const newConcepts = []
    
    for (const dim of ['analysis', 'reasoning', 'creativity', 'evidence']) {
      const prevKeywords = new Set(prev.concepts[dim].keywords)
      
      for (const keyword of curr.concepts[dim].keywords) {
        if (!prevKeywords.has(keyword)) {
          newConcepts.push(keyword)
        }
      }
    }
    
    return newConcepts.slice(0, 5) // Top 5 new concepts
  }
  
  /**
   * Build dimension-specific models
   */
  buildDimensionModels(conceptSequence) {
    const models = {}
    
    for (const dim of ['analysis', 'reasoning', 'creativity', 'evidence']) {
      const dimensionData = conceptSequence.map(item => ({
        index: item.index,
        concepts: item.concepts[dim],
        score: item.scores[dim] || 0
      }))
      
      // Track level progression
      const levels = dimensionData.map(d => d.concepts.level)
      const levelOrder = { none: 0, basic: 1, intermediate: 2, advanced: 3 }
      const numericLevels = levels.map(l => levelOrder[l])
      
      // Calculate richness progression
      const richness = dimensionData.map(d => d.concepts.richness)
      
      // Find patterns
      const allKeywords = dimensionData.flatMap(d => d.concepts.keywords)
      const keywordFrequency = {}
      allKeywords.forEach(k => {
        keywordFrequency[k] = (keywordFrequency[k] || 0) + 1
      })
      
      const topKeywords = Object.entries(keywordFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([keyword, count]) => ({ keyword, count }))
      
      models[dim] = {
        dimensionLabel: this.getDimensionLabel(dim),
        progression: {
          levels,
          startLevel: levels[0],
          endLevel: levels[levels.length - 1],
          peakLevel: levels.reduce((max, l) => levelOrder[l] > levelOrder[max] ? l : max, 'none'),
          progressionType: this.classifyProgression(numericLevels)
        },
        richness: {
          values: richness,
          mean: this.calculateMean(richness),
          trend: this.calculateTrend(richness)
        },
        vocabulary: {
          totalKeywords: allKeywords.length,
          uniqueKeywords: Object.keys(keywordFrequency).length,
          topKeywords
        },
        scoreAlignment: this.calculateScoreAlignment(dimensionData)
      }
    }
    
    return models
  }
  
  /**
   * Classify progression type
   */
  classifyProgression(levels) {
    if (levels.length < 2) return 'insufficient_data'
    
    const trend = this.calculateTrend(levels)
    const volatility = this.calculateVolatility(levels)
    
    if (trend.slope > 0.3 && volatility < 0.5) return 'steady_growth'
    if (trend.slope > 0.1) return 'gradual_improvement'
    if (trend.slope < -0.1) return 'declining'
    if (volatility > 1) return 'unstable'
    return 'stable'
  }
  
  /**
   * Calculate alignment between concepts and scores
   */
  calculateScoreAlignment(dimensionData) {
    // Do concept richness correlate with scores?
    const richness = dimensionData.map(d => d.concepts.richness)
    const scores = dimensionData.map(d => d.score)
    
    const correlation = this.calculateCorrelation(richness, scores)
    
    return {
      correlation: Math.round(correlation * 100) / 100,
      interpretation: correlation > 0.5 ? 'Strong alignment' 
                    : correlation > 0.2 ? 'Moderate alignment'
                    : 'Weak alignment'
    }
  }
  
  /**
   * Identify misconceptions from responses
   */
  identifyMisconceptions(assessments) {
    const misconceptions = []
    
    // Look for patterns that indicate misconceptions
    const misconceptionPatterns = [
      { pattern: /เหมือน.*เพราะ.*เหมือน/i, type: 'circular_reasoning', description: 'การให้เหตุผลวนรอบ' },
      { pattern: /ทั้งหมด|ทุกอย่าง|เสมอ/i, type: 'overgeneralization', description: 'การสรุปกว้างเกินไป' },
      { pattern: /ไม่มีทาง|เป็นไปไม่ได้/i, type: 'absolute_thinking', description: 'การคิดแบบสุดโต่ง' },
      { pattern: /เพราะ.*บอก|ครูบอก/i, type: 'authority_appeal', description: 'การอ้างอำนาจแทนเหตุผล' }
    ]
    
    assessments.forEach((assessment, index) => {
      const answer = assessment.studentAnswer || ''
      
      for (const { pattern, type, description } of misconceptionPatterns) {
        if (pattern.test(answer)) {
          misconceptions.push({
            assessmentIndex: index,
            assessmentId: assessment.id,
            type,
            description,
            excerpt: this.extractExcerpt(answer, pattern)
          })
        }
      }
      
      // Check for very low dimension score with long answer (potential misconception)
      for (const dim of ['analysis', 'reasoning', 'creativity', 'evidence']) {
        const score = assessment.rubricScores?.[dim] || 0
        if (score <= 1 && answer.length > 100) {
          misconceptions.push({
            assessmentIndex: index,
            assessmentId: assessment.id,
            type: 'dimension_gap',
            dimension: dim,
            dimensionLabel: this.getDimensionLabel(dim),
            description: `คำตอบยาวแต่ขาด${this.getDimensionLabel(dim)}`,
            score
          })
        }
      }
    })
    
    // Track if misconceptions were resolved
    const resolved = []
    const unresolved = []
    
    for (const misc of misconceptions) {
      // Check if same type appears in later assessments
      const laterOccurrence = misconceptions.find(m => 
        m.type === misc.type && m.assessmentIndex > misc.assessmentIndex
      )
      
      if (laterOccurrence) {
        unresolved.push(misc)
      } else {
        resolved.push(misc)
      }
    }
    
    return {
      all: misconceptions,
      resolved,
      unresolved,
      summary: {
        total: misconceptions.length,
        resolvedCount: resolved.length,
        unresolvedCount: unresolved.length,
        types: [...new Set(misconceptions.map(m => m.type))]
      }
    }
  }
  
  /**
   * Extract excerpt around matched pattern
   */
  extractExcerpt(text, pattern) {
    const match = text.match(pattern)
    if (!match) return ''
    
    const index = text.indexOf(match[0])
    const start = Math.max(0, index - 30)
    const end = Math.min(text.length, index + match[0].length + 30)
    
    return (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '')
  }
  
  /**
   * Generate qualitative synthesis
   */
  synthesizeQualitatively(mentalModelMap) {
    const synthesis = {
      overallDevelopment: '',
      dimensionInsights: {},
      conceptualGrowth: '',
      keyTransformations: [],
      recommendations: []
    }
    
    // Overall development
    const changes = mentalModelMap.conceptualChanges.summary
    if (changes.advancements > changes.regressions * 2) {
      synthesis.overallDevelopment = 'มีพัฒนาการที่ดีอย่างชัดเจน ความคิดมีความลึกซึ้งและซับซ้อนขึ้น'
    } else if (changes.advancements > changes.regressions) {
      synthesis.overallDevelopment = 'มีพัฒนาการในทิศทางที่ดี แต่ยังไม่คงที่'
    } else if (changes.advancements === changes.regressions) {
      synthesis.overallDevelopment = 'ยังไม่เห็นพัฒนาการที่ชัดเจน ต้องการการสนับสนุนเพิ่มเติม'
    } else {
      synthesis.overallDevelopment = 'ต้องการความช่วยเหลืออย่างเร่งด่วน พบการถดถอยในการคิด'
    }
    
    // Dimension insights
    for (const [dim, model] of Object.entries(mentalModelMap.dimensionModels)) {
      const prog = model.progression
      synthesis.dimensionInsights[dim] = {
        label: model.dimensionLabel,
        insight: this.generateDimensionInsight(prog, model.richness),
        growth: prog.progressionType
      }
    }
    
    // Conceptual growth
    const network = mentalModelMap.conceptNetwork
    if (network.totalConcepts > 20) {
      synthesis.conceptualGrowth = 'มีคลังแนวคิดที่หลากหลาย สามารถเชื่อมโยงความรู้ได้ดี'
    } else if (network.totalConcepts > 10) {
      synthesis.conceptualGrowth = 'กำลังสร้างคลังแนวคิด ควรเสริมการเชื่อมโยง'
    } else {
      synthesis.conceptualGrowth = 'คลังแนวคิดยังจำกัด ต้องการการขยายความรู้'
    }
    
    // Key transformations
    for (const change of mentalModelMap.conceptualChanges.significantChanges) {
      synthesis.keyTransformations.push({
        description: change.description,
        type: change.changeType?.name || change.direction,
        significance: 'high'
      })
    }
    
    // Recommendations
    const miscs = mentalModelMap.misconceptions.summary
    if (miscs.unresolvedCount > 0) {
      synthesis.recommendations.push(`แก้ไขความเข้าใจผิดที่ยังคงอยู่ ${miscs.unresolvedCount} ประเภท`)
    }
    
    // Find weakest dimension
    const dimModels = mentalModelMap.dimensionModels
    const weakestDim = Object.entries(dimModels)
      .sort(([, a], [, b]) => a.richness.mean - b.richness.mean)[0]
    
    if (weakestDim) {
      synthesis.recommendations.push(`เสริมทักษะ${weakestDim[1].dimensionLabel}เป็นพิเศษ`)
    }
    
    if (mentalModelMap.conceptNetwork.networkDensity < 0.1) {
      synthesis.recommendations.push('ฝึกการเชื่อมโยงแนวคิดข้ามหัวข้อ')
    }
    
    return synthesis
  }
  
  /**
   * Generate learning narrative
   */
  generateLearningNarrative(mentalModelMap, assessments) {
    const narrative = {
      title: 'เรื่องเล่าพัฒนาการการเรียนรู้',
      sections: []
    }
    
    // Opening - describe starting point
    const firstAssessment = assessments[0]
    const firstCharacteristics = mentalModelMap.conceptNetwork.nodes
      .filter(n => n.firstSeen === 0)
      .slice(0, 3)
      .map(n => n.concept)
    
    narrative.sections.push({
      type: 'opening',
      title: 'จุดเริ่มต้น',
      content: `เริ่มต้นการเรียนรู้ด้วยแนวคิดพื้นฐาน${firstCharacteristics.length > 0 ? ' เช่น ' + firstCharacteristics.join(', ') : ''} คำตอบมีความยาว ${firstAssessment.studentAnswer?.length || 0} ตัวอักษร`
    })
    
    // Middle - significant changes
    const significantChanges = mentalModelMap.conceptualChanges.significantChanges
    if (significantChanges.length > 0) {
      const changeDescriptions = significantChanges
        .slice(0, 3)
        .map(c => c.description)
      
      narrative.sections.push({
        type: 'development',
        title: 'การเปลี่ยนแปลงสำคัญ',
        content: `ระหว่างการเรียนรู้ พบการเปลี่ยนแปลงสำคัญ: ${changeDescriptions.join('; ')}`
      })
    }
    
    // Challenges - misconceptions
    if (mentalModelMap.misconceptions.all.length > 0) {
      const miscTypes = [...new Set(mentalModelMap.misconceptions.all.map(m => m.description))]
      narrative.sections.push({
        type: 'challenges',
        title: 'ความท้าทาย',
        content: `พบความท้าทายในการเรียนรู้: ${miscTypes.slice(0, 3).join(', ')}${mentalModelMap.misconceptions.summary.resolvedCount > 0 ? ` และสามารถแก้ไขได้ ${mentalModelMap.misconceptions.summary.resolvedCount} ประเด็น` : ''}`
      })
    }
    
    // Ending - current state
    const lastAssessment = assessments[assessments.length - 1]
    const endingConcepts = mentalModelMap.conceptNetwork.nodes
      .filter(n => n.lastSeen === assessments.length - 1)
      .slice(0, 5)
      .map(n => n.concept)
    
    narrative.sections.push({
      type: 'conclusion',
      title: 'ปัจจุบัน',
      content: `ปัจจุบันมีคลังแนวคิดที่หลากหลาย${endingConcepts.length > 0 ? ' รวมถึง ' + endingConcepts.join(', ') : ''} ${mentalModelMap.qualitativeSynthesis.overallDevelopment}`
    })
    
    // Future directions
    narrative.sections.push({
      type: 'future',
      title: 'ทิศทางต่อไป',
      content: `คำแนะนำสำหรับการพัฒนาต่อ: ${mentalModelMap.qualitativeSynthesis.recommendations.join('; ')}`
    })
    
    // Generate summary paragraph
    narrative.summary = this.generateNarrativeSummary(mentalModelMap, assessments)
    
    return narrative
  }
  
  /**
   * Generate narrative summary paragraph
   */
  generateNarrativeSummary(mentalModelMap, assessments) {
    const duration = this.calculateTimeSpan(assessments)
    const synthesis = mentalModelMap.qualitativeSynthesis
    const changes = mentalModelMap.conceptualChanges.summary
    
    let summary = `ในช่วงเวลา ${duration?.durationDays || 'ไม่กี่'} วัน `
    summary += `จากการทำแบบประเมิน ${assessments.length} ครั้ง `
    summary += `พบว่า${synthesis.overallDevelopment} `
    
    if (changes.conceptExpansions > 0) {
      summary += `มีการขยายแนวคิดใหม่ ${changes.conceptExpansions} ครั้ง `
    }
    
    const strongDim = Object.entries(mentalModelMap.dimensionModels)
      .sort(([, a], [, b]) => b.richness.mean - a.richness.mean)[0]
    
    if (strongDim) {
      summary += `จุดแข็งอยู่ที่${strongDim[1].dimensionLabel} `
    }
    
    if (mentalModelMap.misconceptions.summary.unresolvedCount > 0) {
      summary += `แต่ยังมีความเข้าใจผิดที่ต้องแก้ไข `
    }
    
    summary += `โดยรวมแล้ว ${synthesis.conceptualGrowth}`
    
    return summary
  }
  
  /**
   * Compare mental models of multiple students
   */
  async compareStudentMentalModels(studentIds, courseId) {
    const models = []
    
    for (const studentId of studentIds) {
      const result = await this.buildMentalModelMap(studentId, null, { maxAssessments: 20 })
      if (result.success) {
        models.push({
          studentId,
          model: result.mentalModelMap
        })
      }
    }
    
    if (models.length < 2) {
      return { success: false, error: 'Need at least 2 students for comparison' }
    }
    
    // Compare concept networks
    const comparison = {
      studentCount: models.length,
      commonConcepts: this.findCommonConcepts(models),
      uniqueStrengths: this.findUniqueStrengths(models),
      progressionComparison: this.compareProgressions(models),
      recommendations: this.generateGroupRecommendations(models)
    }
    
    return { success: true, comparison }
  }
  
  /**
   * Find concepts common across students
   */
  findCommonConcepts(models) {
    if (models.length === 0) return []
    
    const conceptSets = models.map(m => 
      new Set(m.model.conceptNetwork.nodes.map(n => n.concept))
    )
    
    const common = [...conceptSets[0]].filter(concept =>
      conceptSets.every(set => set.has(concept))
    )
    
    return common.slice(0, 20)
  }
  
  /**
   * Find unique strengths per student
   */
  findUniqueStrengths(models) {
    return models.map(m => {
      const strongestDim = Object.entries(m.model.dimensionModels)
        .sort(([, a], [, b]) => b.richness.mean - a.richness.mean)[0]
      
      return {
        studentId: m.studentId,
        strongestDimension: strongestDim?.[0],
        strongestDimensionLabel: strongestDim?.[1].dimensionLabel,
        topConcepts: m.model.conceptNetwork.nodes.slice(0, 5).map(n => n.concept)
      }
    })
  }
  
  /**
   * Compare progressions across students
   */
  compareProgressions(models) {
    return models.map(m => ({
      studentId: m.studentId,
      advancements: m.model.conceptualChanges.summary.advancements,
      regressions: m.model.conceptualChanges.summary.regressions,
      overallDevelopment: m.model.qualitativeSynthesis.overallDevelopment
    }))
  }
  
  /**
   * Generate group recommendations
   */
  generateGroupRecommendations(models) {
    const recommendations = []
    
    // Find common weak dimension
    const dimWeaknesses = {}
    for (const m of models) {
      const weakest = Object.entries(m.model.dimensionModels)
        .sort(([, a], [, b]) => a.richness.mean - b.richness.mean)[0]
      
      if (weakest) {
        dimWeaknesses[weakest[0]] = (dimWeaknesses[weakest[0]] || 0) + 1
      }
    }
    
    const mostCommonWeakness = Object.entries(dimWeaknesses)
      .sort(([, a], [, b]) => b - a)[0]
    
    if (mostCommonWeakness && mostCommonWeakness[1] >= models.length / 2) {
      recommendations.push({
        type: 'group_focus',
        target: 'all',
        action: `เน้นพัฒนา${this.getDimensionLabel(mostCommonWeakness[0])}ทั้งกลุ่ม`
      })
    }
    
    // Check for common misconceptions
    const allMisconceptions = models.flatMap(m => m.model.misconceptions.all.map(misc => misc.type))
    const miscCounts = {}
    allMisconceptions.forEach(m => { miscCounts[m] = (miscCounts[m] || 0) + 1 })
    
    for (const [type, count] of Object.entries(miscCounts)) {
      if (count >= models.length / 2) {
        recommendations.push({
          type: 'misconception_focus',
          target: 'all',
          action: `แก้ไขความเข้าใจผิดเรื่อง ${type} ที่พบบ่อยในกลุ่ม`
        })
      }
    }
    
    return recommendations
  }
  
  // === Helper Methods ===
  
  calculateTimeSpan(assessments) {
    if (assessments.length < 2) return null
    
    const first = new Date(assessments[0].createdAt)
    const last = new Date(assessments[assessments.length - 1].createdAt)
    const diffMs = last - first
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    return {
      startDate: first.toISOString(),
      endDate: last.toISOString(),
      durationDays: diffDays
    }
  }
  
  calculateMean(arr) {
    if (!arr || arr.length === 0) return 0
    return arr.reduce((a, b) => a + b, 0) / arr.length
  }
  
  calculateTrend(values) {
    const n = values.length
    if (n < 2) return { slope: 0, direction: 'stable' }
    
    const xMean = (n - 1) / 2
    const yMean = values.reduce((a, b) => a + b, 0) / n
    
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean)
      denominator += Math.pow(i - xMean, 2)
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0
    
    return {
      slope: Math.round(slope * 1000) / 1000,
      direction: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable'
    }
  }
  
  calculateVolatility(values) {
    if (values.length < 2) return 0
    
    let sum = 0
    for (let i = 1; i < values.length; i++) {
      sum += Math.abs(values[i] - values[i - 1])
    }
    
    return sum / (values.length - 1)
  }
  
  calculateCorrelation(x, y) {
    const n = x.length
    if (n < 2) return 0
    
    const xMean = this.calculateMean(x)
    const yMean = this.calculateMean(y)
    
    let sumXY = 0, sumX2 = 0, sumY2 = 0
    
    for (let i = 0; i < n; i++) {
      const dx = x[i] - xMean
      const dy = y[i] - yMean
      sumXY += dx * dy
      sumX2 += dx * dx
      sumY2 += dy * dy
    }
    
    if (sumX2 === 0 || sumY2 === 0) return 0
    
    return sumXY / Math.sqrt(sumX2 * sumY2)
  }
  
  getDimensionLabel(dim) {
    const labels = {
      analysis: 'การวิเคราะห์',
      reasoning: 'การให้เหตุผล',
      creativity: 'ความคิดสร้างสรรค์',
      evidence: 'การใช้หลักฐาน'
    }
    return labels[dim] || dim
  }
  
  getLevelLabel(level) {
    const labels = {
      none: 'ไม่พบ',
      basic: 'พื้นฐาน',
      intermediate: 'ปานกลาง',
      advanced: 'ก้าวหน้า'
    }
    return labels[level] || level
  }
  
  generateDimensionInsight(progression, richness) {
    if (progression.progressionType === 'steady_growth') {
      return `พัฒนาขึ้นอย่างสม่ำเสมอ จาก ${this.getLevelLabel(progression.startLevel)} ถึง ${this.getLevelLabel(progression.endLevel)}`
    }
    
    if (progression.progressionType === 'declining') {
      return `ต้องการความช่วยเหลือ มีแนวโน้มลดลง`
    }
    
    if (progression.progressionType === 'unstable') {
      return `ยังไม่คงที่ ผลงานขึ้นลง`
    }
    
    if (richness.trend.direction === 'increasing') {
      return `กำลังพัฒนา มีแนวคิดหลากหลายขึ้น`
    }
    
    return `คงที่อยู่ที่ระดับ ${this.getLevelLabel(progression.endLevel)}`
  }
}

// Export
module.exports = {
  CONCEPTUAL_CHANGE_TYPES,
  CONCEPT_INDICATORS,
  MentalModelMapper
}
