/**
 * 📈 Learning Trajectory Analytics Module
 * 
 * ระบบวิเคราะห์วิถีการเรียนรู้เชิงลึกสำหรับงานวิจัย C10
 * 
 * Features:
 * 1. Sequential Pattern Analysis - วิเคราะห์ลำดับการพัฒนา
 * 2. Stuck Point Detection - ตรวจจับจุดติดขัด
 * 3. Growth Modeling - สร้างโมเดลการเติบโต
 * 4. SEM-Ready Export - ส่งออกสำหรับ Structural Equation Modeling
 * 5. Dimension Dependency Analysis - วิเคราะห์ความสัมพันธ์ระหว่างมิติ
 * 6. Progress Visualization Data - ข้อมูลสำหรับแสดงผล
 * 
 * Academic References:
 * - Bollen, K. A. (1989). Structural Equations with Latent Variables
 * - Fischer, K. W. (1980). Dynamic Development of Psychological Structures
 * - Siegler, R. S. (2006). Microgenetic Analyses of Learning
 * 
 * @version 1.0.0
 * @author HOTS-AI Research Team
 */

const admin = require('firebase-admin')

/**
 * 🔬 Learning State Definitions
 */
const LEARNING_STATES = {
  NOVICE: { min: 0, max: 4, label: 'มือใหม่', color: '#ef4444' },
  DEVELOPING: { min: 5, max: 9, label: 'กำลังพัฒนา', color: '#f97316' },
  COMPETENT: { min: 10, max: 14, label: 'มีความสามารถ', color: '#eab308' },
  PROFICIENT: { min: 15, max: 17, label: 'เชี่ยวชาญ', color: '#22c55e' },
  EXPERT: { min: 18, max: 20, label: 'เชี่ยวชาญมาก', color: '#10b981' }
}

/**
 * 🔍 Dimension State Definitions (per dimension 0-5)
 */
const DIMENSION_STATES = {
  STRUGGLING: { min: 0, max: 1, label: 'ต้องพัฒนา' },
  EMERGING: { min: 2, max: 2, label: 'กำลังเริ่ม' },
  DEVELOPING: { min: 3, max: 3, label: 'กำลังพัฒนา' },
  PROFICIENT: { min: 4, max: 4, label: 'เชี่ยวชาญ' },
  MASTERY: { min: 5, max: 5, label: 'ยอดเยี่ยม' }
}

/**
 * 📊 Learning Trajectory Analyzer
 */
class LearningTrajectoryAnalyzer {
  constructor(db) {
    this.db = db
  }
  
  /**
   * Build complete learning trajectory for a student
   * @param {string} studentId - Student ID
   * @param {string} courseId - Optional course filter
   * @returns {Object} Complete trajectory analysis
   */
  async buildStudentTrajectory(studentId, courseId = null) {
    // Get all assessments for student
    let query = this.db.collection('assessments')
      .where('studentId', '==', studentId)
      .orderBy('createdAt', 'asc')
    
    if (courseId) {
      query = query.where('courseId', '==', courseId)
    }
    
    const snapshot = await query.get()
    const assessments = []
    
    snapshot.forEach(doc => {
      assessments.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    if (assessments.length < 2) {
      return {
        success: false,
        error: 'Need at least 2 assessments for trajectory analysis',
        assessmentCount: assessments.length
      }
    }
    
    // Build trajectory
    const trajectory = {
      studentId,
      courseId,
      assessmentCount: assessments.length,
      timeSpan: this.calculateTimeSpan(assessments),
      
      // Overall progression
      overallProgression: this.analyzeOverallProgression(assessments),
      
      // Dimension-specific trajectories
      dimensionTrajectories: this.analyzeDimensionTrajectories(assessments),
      
      // State transitions
      stateTransitions: this.analyzeStateTransitions(assessments),
      
      // Stuck points
      stuckPoints: this.detectStuckPoints(assessments),
      
      // Growth patterns
      growthPatterns: this.identifyGrowthPatterns(assessments),
      
      // Sequential patterns
      sequentialPatterns: this.mineSequentialPatterns(assessments),
      
      // Dimension dependencies
      dimensionDependencies: this.analyzeDimensionDependencies(assessments),
      
      // Milestones
      milestones: this.identifyMilestones(assessments),
      
      // Generated at
      generatedAt: new Date().toISOString()
    }
    
    return {
      success: true,
      trajectory
    }
  }
  
  /**
   * Calculate time span of assessments
   */
  calculateTimeSpan(assessments) {
    if (assessments.length < 2) return null
    
    const firstDate = new Date(assessments[0].createdAt)
    const lastDate = new Date(assessments[assessments.length - 1].createdAt)
    const diffMs = lastDate - firstDate
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    return {
      startDate: firstDate.toISOString(),
      endDate: lastDate.toISOString(),
      durationDays: diffDays,
      averageInterval: diffDays / (assessments.length - 1)
    }
  }
  
  /**
   * Analyze overall score progression
   */
  analyzeOverallProgression(assessments) {
    const scores = assessments.map((a, index) => {
      const total = (a.rubricScores?.analysis || 0) +
                   (a.rubricScores?.reasoning || 0) +
                   (a.rubricScores?.creativity || 0) +
                   (a.rubricScores?.evidence || 0)
      
      return {
        index,
        date: a.createdAt,
        totalScore: total,
        state: this.getOverallState(total)
      }
    })
    
    // Calculate trend
    const trend = this.calculateTrend(scores.map(s => s.totalScore))
    
    // Calculate growth
    const firstScore = scores[0].totalScore
    const lastScore = scores[scores.length - 1].totalScore
    const growth = lastScore - firstScore
    const growthPercent = firstScore > 0 ? (growth / firstScore) * 100 : 0
    
    // Calculate statistics
    const allScores = scores.map(s => s.totalScore)
    const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length
    const variance = allScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / allScores.length
    const sd = Math.sqrt(variance)
    
    return {
      scores,
      trend,
      growth: {
        absolute: growth,
        percentage: Math.round(growthPercent * 100) / 100,
        interpretation: this.interpretGrowth(growth)
      },
      statistics: {
        mean: Math.round(mean * 100) / 100,
        sd: Math.round(sd * 100) / 100,
        min: Math.min(...allScores),
        max: Math.max(...allScores),
        range: Math.max(...allScores) - Math.min(...allScores)
      },
      startState: scores[0].state,
      currentState: scores[scores.length - 1].state
    }
  }
  
  /**
   * Analyze trajectory for each dimension
   */
  analyzeDimensionTrajectories(assessments) {
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const trajectories = {}
    
    for (const dim of dimensions) {
      const dimScores = assessments.map((a, index) => ({
        index,
        date: a.createdAt,
        score: a.rubricScores?.[dim] || 0,
        state: this.getDimensionState(a.rubricScores?.[dim] || 0)
      }))
      
      const scores = dimScores.map(d => d.score)
      const trend = this.calculateTrend(scores)
      const growth = scores[scores.length - 1] - scores[0]
      
      trajectories[dim] = {
        scores: dimScores,
        trend,
        growth,
        startScore: scores[0],
        currentScore: scores[scores.length - 1],
        peakScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        volatility: this.calculateVolatility(scores),
        plateaus: this.detectPlateaus(scores),
        breakthroughs: this.detectBreakthroughs(scores)
      }
    }
    
    return trajectories
  }
  
  /**
   * Analyze state transitions
   */
  analyzeStateTransitions(assessments) {
    const states = assessments.map(a => {
      const total = (a.rubricScores?.analysis || 0) +
                   (a.rubricScores?.reasoning || 0) +
                   (a.rubricScores?.creativity || 0) +
                   (a.rubricScores?.evidence || 0)
      return this.getOverallState(total)
    })
    
    // Build transition matrix
    const transitions = {}
    const stateNames = Object.keys(LEARNING_STATES)
    
    for (const from of stateNames) {
      transitions[from] = {}
      for (const to of stateNames) {
        transitions[from][to] = 0
      }
    }
    
    // Count transitions
    for (let i = 0; i < states.length - 1; i++) {
      const from = states[i].name
      const to = states[i + 1].name
      transitions[from][to]++
    }
    
    // Calculate probabilities
    const probabilities = {}
    for (const from of stateNames) {
      const total = Object.values(transitions[from]).reduce((a, b) => a + b, 0)
      probabilities[from] = {}
      for (const to of stateNames) {
        probabilities[from][to] = total > 0 
          ? Math.round((transitions[from][to] / total) * 100) / 100 
          : 0
      }
    }
    
    // Identify common paths
    const paths = this.identifyCommonPaths(states)
    
    return {
      transitionMatrix: transitions,
      probabilities,
      stateSequence: states.map(s => s.name),
      commonPaths: paths,
      totalTransitions: states.length - 1
    }
  }
  
  /**
   * Detect stuck points (where student struggles repeatedly)
   */
  detectStuckPoints(assessments) {
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const stuckPoints = []
    
    for (const dim of dimensions) {
      const scores = assessments.map(a => a.rubricScores?.[dim] || 0)
      
      // Find sequences where score stays below threshold
      const threshold = 3
      let stuckStart = null
      let stuckDuration = 0
      
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] < threshold) {
          if (stuckStart === null) {
            stuckStart = i
            stuckDuration = 1
          } else {
            stuckDuration++
          }
        } else {
          if (stuckStart !== null && stuckDuration >= 3) {
            stuckPoints.push({
              dimension: dim,
              startIndex: stuckStart,
              endIndex: i - 1,
              duration: stuckDuration,
              averageScore: scores.slice(stuckStart, i).reduce((a, b) => a + b, 0) / stuckDuration,
              resolved: true,
              resolvedAt: i
            })
          }
          stuckStart = null
          stuckDuration = 0
        }
      }
      
      // Check if still stuck at the end
      if (stuckStart !== null && stuckDuration >= 3) {
        stuckPoints.push({
          dimension: dim,
          startIndex: stuckStart,
          endIndex: scores.length - 1,
          duration: stuckDuration,
          averageScore: scores.slice(stuckStart).reduce((a, b) => a + b, 0) / stuckDuration,
          resolved: false,
          resolvedAt: null
        })
      }
    }
    
    // Sort by duration (longest first)
    stuckPoints.sort((a, b) => b.duration - a.duration)
    
    // Generate insights
    const insights = this.generateStuckPointInsights(stuckPoints)
    
    return {
      points: stuckPoints,
      totalStuckPoints: stuckPoints.length,
      unresolvedCount: stuckPoints.filter(p => !p.resolved).length,
      mostChallengingDimension: this.findMostChallengingDimension(stuckPoints),
      insights
    }
  }
  
  /**
   * Identify growth patterns
   */
  identifyGrowthPatterns(assessments) {
    const patterns = {
      steady: false,        // Consistent upward trend
      plateauing: false,    // Growth then stabilization
      oscillating: false,   // Up and down movement
      breakthrough: false,  // Sudden improvement
      declining: false,     // Downward trend
      pattern: 'unknown'
    }
    
    const scores = assessments.map(a => 
      (a.rubricScores?.analysis || 0) +
      (a.rubricScores?.reasoning || 0) +
      (a.rubricScores?.creativity || 0) +
      (a.rubricScores?.evidence || 0)
    )
    
    const trend = this.calculateTrend(scores)
    const volatility = this.calculateVolatility(scores)
    
    // Determine primary pattern
    if (trend.slope > 0.5 && volatility < 2) {
      patterns.steady = true
      patterns.pattern = 'steady_growth'
    } else if (trend.slope > 0.2 && volatility >= 2) {
      patterns.oscillating = true
      patterns.pattern = 'oscillating_growth'
    } else if (Math.abs(trend.slope) <= 0.2 && scores.length > 5) {
      // Check if it's a plateau after growth
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2))
      const secondHalf = scores.slice(Math.floor(scores.length / 2))
      const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      
      if (secondMean > firstMean + 2) {
        patterns.plateauing = true
        patterns.pattern = 'growth_then_plateau'
      }
    } else if (trend.slope < -0.3) {
      patterns.declining = true
      patterns.pattern = 'declining'
    }
    
    // Check for breakthrough (sudden jump of 5+ points)
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] - scores[i - 1] >= 5) {
        patterns.breakthrough = true
        if (patterns.pattern === 'unknown') {
          patterns.pattern = 'breakthrough'
        }
        break
      }
    }
    
    return {
      ...patterns,
      trend,
      volatility,
      interpretation: this.interpretPattern(patterns.pattern)
    }
  }
  
  /**
   * Mine sequential patterns in learning
   */
  mineSequentialPatterns(assessments) {
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const sequences = []
    
    // Track which dimension improves after which
    const improvementSequences = {}
    
    for (let i = 1; i < assessments.length; i++) {
      const prev = assessments[i - 1]
      const curr = assessments[i]
      
      const improvedDims = []
      for (const dim of dimensions) {
        const prevScore = prev.rubricScores?.[dim] || 0
        const currScore = curr.rubricScores?.[dim] || 0
        
        if (currScore > prevScore) {
          improvedDims.push(dim)
        }
      }
      
      if (improvedDims.length > 0) {
        sequences.push({
          fromIndex: i - 1,
          toIndex: i,
          improvedDimensions: improvedDims
        })
        
        // Track sequence patterns
        const key = improvedDims.sort().join('→')
        improvementSequences[key] = (improvementSequences[key] || 0) + 1
      }
    }
    
    // Find common co-improvements
    const coImprovements = this.findCoImprovementPatterns(assessments)
    
    // Find prerequisite patterns (A improves before B)
    const prerequisites = this.findPrerequisitePatterns(assessments)
    
    return {
      sequences,
      improvementFrequency: improvementSequences,
      coImprovements,
      prerequisites,
      mostCommonSequence: Object.entries(improvementSequences)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'
    }
  }
  
  /**
   * Analyze dependencies between dimensions
   */
  analyzeDimensionDependencies(assessments) {
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const correlations = {}
    
    // Calculate correlation between each pair of dimensions
    for (let i = 0; i < dimensions.length; i++) {
      for (let j = i + 1; j < dimensions.length; j++) {
        const dim1 = dimensions[i]
        const dim2 = dimensions[j]
        
        const scores1 = assessments.map(a => a.rubricScores?.[dim1] || 0)
        const scores2 = assessments.map(a => a.rubricScores?.[dim2] || 0)
        
        const r = this.calculatePearsonCorrelation(scores1, scores2)
        
        correlations[`${dim1}_${dim2}`] = {
          dimension1: dim1,
          dimension2: dim2,
          correlation: r,
          interpretation: this.interpretCorrelation(r)
        }
      }
    }
    
    // Find strong dependencies
    const strongDependencies = Object.values(correlations)
      .filter(c => Math.abs(c.correlation) >= 0.5)
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    
    // Lagged correlations (does improvement in A predict improvement in B?)
    const laggedCorrelations = this.calculateLaggedCorrelations(assessments)
    
    return {
      contemporaneous: correlations,
      strongDependencies,
      laggedCorrelations,
      insights: this.generateDependencyInsights(correlations, laggedCorrelations)
    }
  }
  
  /**
   * Identify learning milestones
   */
  identifyMilestones(assessments) {
    const milestones = []
    
    for (let i = 0; i < assessments.length; i++) {
      const a = assessments[i]
      const total = (a.rubricScores?.analysis || 0) +
                   (a.rubricScores?.reasoning || 0) +
                   (a.rubricScores?.creativity || 0) +
                   (a.rubricScores?.evidence || 0)
      
      // Check for state transition milestones
      if (i > 0) {
        const prevTotal = (assessments[i-1].rubricScores?.analysis || 0) +
                         (assessments[i-1].rubricScores?.reasoning || 0) +
                         (assessments[i-1].rubricScores?.creativity || 0) +
                         (assessments[i-1].rubricScores?.evidence || 0)
        
        const prevState = this.getOverallState(prevTotal)
        const currState = this.getOverallState(total)
        
        if (currState.name !== prevState.name && 
            Object.keys(LEARNING_STATES).indexOf(currState.name) > 
            Object.keys(LEARNING_STATES).indexOf(prevState.name)) {
          milestones.push({
            type: 'STATE_ADVANCEMENT',
            index: i,
            date: a.createdAt,
            fromState: prevState.name,
            toState: currState.name,
            score: total,
            description: `ก้าวขึ้นสู่ระดับ "${currState.label}"`
          })
        }
      }
      
      // Check for dimension mastery
      for (const dim of ['analysis', 'reasoning', 'creativity', 'evidence']) {
        const score = a.rubricScores?.[dim] || 0
        if (score >= 4 && i > 0 && (assessments[i-1].rubricScores?.[dim] || 0) < 4) {
          milestones.push({
            type: 'DIMENSION_MASTERY',
            index: i,
            date: a.createdAt,
            dimension: dim,
            score,
            description: `เชี่ยวชาญมิติ ${this.getDimensionLabel(dim)}`
          })
        }
      }
      
      // Check for perfect score
      if (total === 20 && i > 0) {
        const prevTotal = assessments.slice(0, i)
          .map(aa => (aa.rubricScores?.analysis || 0) + (aa.rubricScores?.reasoning || 0) +
                     (aa.rubricScores?.creativity || 0) + (aa.rubricScores?.evidence || 0))
          .every(t => t < 20)
        
        if (prevTotal) {
          milestones.push({
            type: 'PERFECT_SCORE',
            index: i,
            date: a.createdAt,
            score: total,
            description: 'ได้คะแนนเต็ม 20 คะแนนครั้งแรก!'
          })
        }
      }
    }
    
    return milestones
  }
  
  // === Helper Methods ===
  
  getOverallState(totalScore) {
    for (const [name, config] of Object.entries(LEARNING_STATES)) {
      if (totalScore >= config.min && totalScore <= config.max) {
        return { name, ...config }
      }
    }
    return { name: 'UNKNOWN', label: 'ไม่ทราบ' }
  }
  
  getDimensionState(score) {
    for (const [name, config] of Object.entries(DIMENSION_STATES)) {
      if (score >= config.min && score <= config.max) {
        return { name, ...config }
      }
    }
    return { name: 'UNKNOWN', label: 'ไม่ทราบ' }
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
  
  calculateTrend(scores) {
    const n = scores.length
    if (n < 2) return { slope: 0, intercept: 0, direction: 'stable' }
    
    // Simple linear regression
    const xMean = (n - 1) / 2
    const yMean = scores.reduce((a, b) => a + b, 0) / n
    
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (scores[i] - yMean)
      denominator += (i - xMean) * (i - xMean)
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0
    const intercept = yMean - slope * xMean
    
    let direction = 'stable'
    if (slope > 0.3) direction = 'increasing'
    else if (slope < -0.3) direction = 'decreasing'
    
    return {
      slope: Math.round(slope * 1000) / 1000,
      intercept: Math.round(intercept * 100) / 100,
      direction
    }
  }
  
  calculateVolatility(scores) {
    if (scores.length < 2) return 0
    
    let sumDiff = 0
    for (let i = 1; i < scores.length; i++) {
      sumDiff += Math.abs(scores[i] - scores[i - 1])
    }
    
    return Math.round((sumDiff / (scores.length - 1)) * 100) / 100
  }
  
  calculatePearsonCorrelation(x, y) {
    const n = x.length
    if (n < 2) return 0
    
    const xMean = x.reduce((a, b) => a + b, 0) / n
    const yMean = y.reduce((a, b) => a + b, 0) / n
    
    let sumXY = 0, sumX2 = 0, sumY2 = 0
    
    for (let i = 0; i < n; i++) {
      const dx = x[i] - xMean
      const dy = y[i] - yMean
      sumXY += dx * dy
      sumX2 += dx * dx
      sumY2 += dy * dy
    }
    
    if (sumX2 === 0 || sumY2 === 0) return 0
    
    return Math.round((sumXY / Math.sqrt(sumX2 * sumY2)) * 1000) / 1000
  }
  
  interpretCorrelation(r) {
    const absR = Math.abs(r)
    if (absR < 0.2) return 'Very weak'
    if (absR < 0.4) return 'Weak'
    if (absR < 0.6) return 'Moderate'
    if (absR < 0.8) return 'Strong'
    return 'Very strong'
  }
  
  interpretGrowth(growth) {
    if (growth >= 8) return 'ก้าวหน้าอย่างยอดเยี่ยม'
    if (growth >= 5) return 'ก้าวหน้าอย่างมาก'
    if (growth >= 3) return 'ก้าวหน้าดี'
    if (growth >= 1) return 'ก้าวหน้าเล็กน้อย'
    if (growth === 0) return 'คงที่'
    return 'ถดถอย'
  }
  
  interpretPattern(pattern) {
    const interpretations = {
      steady_growth: 'มีพัฒนาการอย่างต่อเนื่องและสม่ำเสมอ',
      oscillating_growth: 'มีพัฒนาการแต่ยังไม่คงที่ มีขึ้นลง',
      growth_then_plateau: 'พัฒนาได้ดีแล้วคงที่ อาจต้องการความท้าทายใหม่',
      breakthrough: 'มีการก้าวกระโดด แสดงถึงการ "คลิก" ความเข้าใจ',
      declining: 'คะแนนลดลง อาจต้องการความช่วยเหลือ',
      unknown: 'รูปแบบไม่ชัดเจน ต้องเก็บข้อมูลเพิ่ม'
    }
    return interpretations[pattern] || 'ไม่ทราบ'
  }
  
  detectPlateaus(scores) {
    const plateaus = []
    let plateauStart = null
    
    for (let i = 1; i < scores.length; i++) {
      if (Math.abs(scores[i] - scores[i - 1]) <= 1) {
        if (plateauStart === null) plateauStart = i - 1
      } else {
        if (plateauStart !== null && (i - plateauStart) >= 3) {
          plateaus.push({
            startIndex: plateauStart,
            endIndex: i - 1,
            duration: i - plateauStart,
            score: scores[plateauStart]
          })
        }
        plateauStart = null
      }
    }
    
    // Check end
    if (plateauStart !== null && (scores.length - plateauStart) >= 3) {
      plateaus.push({
        startIndex: plateauStart,
        endIndex: scores.length - 1,
        duration: scores.length - plateauStart,
        score: scores[plateauStart]
      })
    }
    
    return plateaus
  }
  
  detectBreakthroughs(scores) {
    const breakthroughs = []
    
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] - scores[i - 1] >= 2) {
        breakthroughs.push({
          index: i,
          beforeScore: scores[i - 1],
          afterScore: scores[i],
          jump: scores[i] - scores[i - 1]
        })
      }
    }
    
    return breakthroughs
  }
  
  identifyCommonPaths(states) {
    const pathCounts = {}
    
    // 2-state paths
    for (let i = 0; i < states.length - 1; i++) {
      const path = `${states[i].name}→${states[i + 1].name}`
      pathCounts[path] = (pathCounts[path] || 0) + 1
    }
    
    // Sort by frequency
    return Object.entries(pathCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }))
  }
  
  findMostChallengingDimension(stuckPoints) {
    const dimCounts = {}
    
    for (const point of stuckPoints) {
      dimCounts[point.dimension] = (dimCounts[point.dimension] || 0) + point.duration
    }
    
    const sorted = Object.entries(dimCounts).sort(([, a], [, b]) => b - a)
    return sorted[0]?.[0] || null
  }
  
  generateStuckPointInsights(stuckPoints) {
    const insights = []
    
    if (stuckPoints.length === 0) {
      insights.push('ไม่พบจุดติดขัดที่สำคัญ - นักเรียนมีพัฒนาการต่อเนื่อง')
      return insights
    }
    
    const unresolved = stuckPoints.filter(p => !p.resolved)
    if (unresolved.length > 0) {
      const dims = [...new Set(unresolved.map(p => this.getDimensionLabel(p.dimension)))]
      insights.push(`ยังติดขัดในมิติ: ${dims.join(', ')} - ต้องการความช่วยเหลือเพิ่มเติม`)
    }
    
    const longest = stuckPoints[0]
    if (longest && longest.duration >= 5) {
      insights.push(`มิติที่ท้าทายที่สุดคือ "${this.getDimensionLabel(longest.dimension)}" ติดขัด ${longest.duration} ครั้งติดต่อกัน`)
    }
    
    return insights
  }
  
  findCoImprovementPatterns(assessments) {
    const coPatterns = {}
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    
    for (let i = 1; i < assessments.length; i++) {
      const improved = []
      
      for (const dim of dimensions) {
        if ((assessments[i].rubricScores?.[dim] || 0) > 
            (assessments[i-1].rubricScores?.[dim] || 0)) {
          improved.push(dim)
        }
      }
      
      if (improved.length >= 2) {
        for (let j = 0; j < improved.length; j++) {
          for (let k = j + 1; k < improved.length; k++) {
            const key = [improved[j], improved[k]].sort().join('+')
            coPatterns[key] = (coPatterns[key] || 0) + 1
          }
        }
      }
    }
    
    return Object.entries(coPatterns)
      .sort(([, a], [, b]) => b - a)
      .map(([pair, count]) => ({
        dimensions: pair.split('+'),
        frequency: count
      }))
  }
  
  findPrerequisitePatterns(assessments) {
    // Does improving in A predict improving in B later?
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const prerequisites = []
    
    for (const dim1 of dimensions) {
      for (const dim2 of dimensions) {
        if (dim1 === dim2) continue
        
        let count = 0
        let total = 0
        
        for (let i = 1; i < assessments.length - 1; i++) {
          // Did dim1 improve?
          const dim1Improved = (assessments[i].rubricScores?.[dim1] || 0) > 
                              (assessments[i-1].rubricScores?.[dim1] || 0)
          
          if (dim1Improved) {
            total++
            // Did dim2 improve next?
            const dim2ImprovedNext = (assessments[i+1].rubricScores?.[dim2] || 0) > 
                                    (assessments[i].rubricScores?.[dim2] || 0)
            if (dim2ImprovedNext) count++
          }
        }
        
        if (total >= 3) {
          const probability = count / total
          if (probability >= 0.5) {
            prerequisites.push({
              prerequisite: dim1,
              dependent: dim2,
              probability: Math.round(probability * 100) / 100,
              sampleSize: total
            })
          }
        }
      }
    }
    
    return prerequisites.sort((a, b) => b.probability - a.probability)
  }
  
  calculateLaggedCorrelations(assessments) {
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const lagged = []
    
    for (const dim1 of dimensions) {
      for (const dim2 of dimensions) {
        if (dim1 === dim2) continue
        
        // Correlate dim1 at time t with dim2 at time t+1
        const x = assessments.slice(0, -1).map(a => a.rubricScores?.[dim1] || 0)
        const y = assessments.slice(1).map(a => a.rubricScores?.[dim2] || 0)
        
        const r = this.calculatePearsonCorrelation(x, y)
        
        if (Math.abs(r) >= 0.3) {
          lagged.push({
            predictor: dim1,
            outcome: dim2,
            laggedCorrelation: r,
            interpretation: r > 0 
              ? `${this.getDimensionLabel(dim1)} สูง → ${this.getDimensionLabel(dim2)} มีแนวโน้มสูงตามมา`
              : `${this.getDimensionLabel(dim1)} สูง → ${this.getDimensionLabel(dim2)} มีแนวโน้มลด`
          })
        }
      }
    }
    
    return lagged.sort((a, b) => Math.abs(b.laggedCorrelation) - Math.abs(a.laggedCorrelation))
  }
  
  generateDependencyInsights(correlations, laggedCorrelations) {
    const insights = []
    
    // Strong contemporaneous correlations
    const strong = Object.values(correlations).filter(c => Math.abs(c.correlation) >= 0.6)
    for (const c of strong) {
      insights.push({
        type: 'STRONG_CORRELATION',
        message: `${this.getDimensionLabel(c.dimension1)} และ ${this.getDimensionLabel(c.dimension2)} มีความสัมพันธ์${c.correlation > 0 ? 'เชิงบวก' : 'เชิงลบ'}สูง (r=${c.correlation})`
      })
    }
    
    // Lagged patterns
    for (const l of laggedCorrelations.slice(0, 3)) {
      insights.push({
        type: 'LAGGED_CORRELATION',
        message: l.interpretation
      })
    }
    
    if (insights.length === 0) {
      insights.push({
        type: 'INDEPENDENT',
        message: 'แต่ละมิติพัฒนาค่อนข้างอิสระจากกัน'
      })
    }
    
    return insights
  }
}

/**
 * 📤 SEM Data Exporter
 * Export data ready for Structural Equation Modeling
 */
class SEMDataExporter {
  constructor(db) {
    this.db = db
  }
  
  /**
   * Export data in SEM-ready format
   * @param {Object} options - Export options
   * @returns {Object} SEM-ready dataset
   */
  async exportForSEM(options = {}) {
    const {
      courseId = null,
      startDate = null,
      endDate = null,
      includeLatent = true,
      kAnonymity = 5          // Minimum group size for privacy
    } = options
    
    // Get assessments
    let query = this.db.collection('assessments')
    if (courseId) query = query.where('courseId', '==', courseId)
    
    const snapshot = await query.get()
    const records = []
    
    snapshot.forEach(doc => {
      const data = doc.data()
      
      // Date filter
      if (startDate && new Date(data.createdAt) < startDate) return
      if (endDate && new Date(data.createdAt) > endDate) return
      
      // Flatten for SEM
      records.push({
        // ID (anonymized)
        id: this.anonymizeId(doc.id),
        studentId: this.anonymizeId(data.studentId),
        
        // Observed variables (HOTS dimensions)
        analysis: data.rubricScores?.analysis || 0,
        reasoning: data.rubricScores?.reasoning || 0,
        creativity: data.rubricScores?.creativity || 0,
        evidence: data.rubricScores?.evidence || 0,
        
        // Total score (can be used as manifest or computed)
        totalScore: (data.rubricScores?.analysis || 0) +
                   (data.rubricScores?.reasoning || 0) +
                   (data.rubricScores?.creativity || 0) +
                   (data.rubricScores?.evidence || 0),
        
        // AI confidence (potential moderator)
        aiConfidence: data.confidence || 0,
        
        // Context variables
        gradeLevel: this.encodeGradeLevel(data.gradeLevel),
        isScaffolded: data.isScaffolding ? 1 : 0,
        scaffoldingAttempt: data.scaffoldingAttempts || 0,
        
        // Time variables
        timestamp: data.createdAt,
        dayOfWeek: new Date(data.createdAt).getDay(),
        hourOfDay: new Date(data.createdAt).getHours(),
        
        // Answer characteristics
        answerLength: (data.studentAnswer || '').length,
        answerWordCount: (data.studentAnswer || '').split(/\s+/).length
      })
    })
    
    // Apply k-anonymity
    const anonymizedRecords = this.applyKAnonymity(records, kAnonymity)
    
    // Generate SEM model specification
    const modelSpec = this.generateSEMModelSpec(includeLatent)
    
    // Generate correlation matrix
    const correlationMatrix = this.generateCorrelationMatrix(anonymizedRecords)
    
    return {
      success: true,
      n: anonymizedRecords.length,
      variables: Object.keys(anonymizedRecords[0] || {}),
      data: anonymizedRecords,
      modelSpecification: modelSpec,
      correlationMatrix,
      exportInfo: {
        kAnonymity,
        exportedAt: new Date().toISOString(),
        format: 'SEM-ready flat file'
      }
    }
  }
  
  /**
   * Anonymize ID
   */
  anonymizeId(id) {
    if (!id) return 'unknown'
    // Create hash-like transformation
    return 'S' + Buffer.from(id).toString('base64').substring(0, 8)
  }
  
  /**
   * Encode grade level numerically
   */
  encodeGradeLevel(gradeLevel) {
    const encoding = {
      'ป.1': 1, 'ป.2': 2, 'ป.3': 3, 'ป.4': 4, 'ป.5': 5, 'ป.6': 6,
      'ม.1': 7, 'ม.2': 8, 'ม.3': 9, 'ม.4': 10, 'ม.5': 11, 'ม.6': 12
    }
    return encoding[gradeLevel] || 0
  }
  
  /**
   * Apply k-anonymity by generalizing quasi-identifiers
   */
  applyKAnonymity(records, k) {
    // Group by grade level and count
    const groups = {}
    
    for (const record of records) {
      const key = `${record.gradeLevel}`
      if (!groups[key]) groups[key] = []
      groups[key].push(record)
    }
    
    // Generalize small groups
    const result = []
    for (const [, group] of Object.entries(groups)) {
      if (group.length >= k) {
        result.push(...group)
      } else {
        // Generalize by removing quasi-identifiers
        result.push(...group.map(r => ({
          ...r,
          gradeLevel: 0, // Suppressed
          studentId: 'suppressed'
        })))
      }
    }
    
    return result
  }
  
  /**
   * Generate SEM model specification
   */
  generateSEMModelSpec(includeLatent) {
    let spec = `# SEM Model Specification for HOTS Assessment
# Generated by HOTS-AI System

# ===============================
# Measurement Model (CFA)
# ===============================

# Latent Variable: HOTS (Higher-Order Thinking Skills)
HOTS =~ analysis + reasoning + creativity + evidence

`
    
    if (includeLatent) {
      spec += `# Second-order factors (optional)
# CriticalThinking =~ analysis + reasoning
# CreativeThinking =~ creativity + evidence

# ===============================
# Structural Model (if predictors available)
# ===============================

# HOTS ~ gradeLevel + isScaffolded + scaffoldingAttempt

# ===============================
# Residual Correlations (if needed)
# ===============================

# analysis ~~ reasoning  # If theory suggests correlation
# creativity ~~ evidence

`
    }
    
    spec += `# ===============================
# Model Fit Indices to Report
# ===============================
# - Chi-square (χ²) and df
# - CFI (≥ 0.95 good)
# - TLI (≥ 0.95 good)
# - RMSEA (≤ 0.06 good)
# - SRMR (≤ 0.08 good)
`
    
    return spec
  }
  
  /**
   * Generate correlation matrix for SEM
   */
  generateCorrelationMatrix(records) {
    const vars = ['analysis', 'reasoning', 'creativity', 'evidence', 'totalScore', 'aiConfidence']
    const matrix = {}
    
    for (const v1 of vars) {
      matrix[v1] = {}
      for (const v2 of vars) {
        if (v1 === v2) {
          matrix[v1][v2] = 1.0
        } else {
          const x = records.map(r => r[v1] || 0)
          const y = records.map(r => r[v2] || 0)
          matrix[v1][v2] = this.calculateCorrelation(x, y)
        }
      }
    }
    
    return matrix
  }
  
  /**
   * Calculate correlation
   */
  calculateCorrelation(x, y) {
    const n = x.length
    if (n < 2) return 0
    
    const xMean = x.reduce((a, b) => a + b, 0) / n
    const yMean = y.reduce((a, b) => a + b, 0) / n
    
    let sumXY = 0, sumX2 = 0, sumY2 = 0
    
    for (let i = 0; i < n; i++) {
      const dx = x[i] - xMean
      const dy = y[i] - yMean
      sumXY += dx * dy
      sumX2 += dx * dx
      sumY2 += dy * dy
    }
    
    if (sumX2 === 0 || sumY2 === 0) return 0
    
    return Math.round((sumXY / Math.sqrt(sumX2 * sumY2)) * 1000) / 1000
  }
}

// Export
module.exports = {
  LEARNING_STATES,
  DIMENSION_STATES,
  LearningTrajectoryAnalyzer,
  SEMDataExporter
}
