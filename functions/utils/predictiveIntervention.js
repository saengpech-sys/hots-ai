/**
 * 🔮 Predictive Intervention System (Early Warning System)
 * 
 * ระบบทำนายและป้องกันปัญหาการเรียนรู้ล่วงหน้า
 * ยกระดับจาก "วิเคราะห์" สู่ "ทำนายและป้องกัน"
 * 
 * Features:
 * 1. Risk Prediction - ทำนายความเสี่ยงที่จะติดขัด
 * 2. Dimension Vulnerability Analysis - วิเคราะห์จุดอ่อนรายมิติ
 * 3. Intervention Recommendation - แนะนำชุดการสอนล่วงหน้า
 * 4. Cohort Risk Analysis - วิเคราะห์ความเสี่ยงระดับกลุ่ม
 * 5. Proactive Alert System - แจ้งเตือนครูล่วงหน้า
 * 
 * Impact for C10:
 * - เปลี่ยนบทบาทครูจาก "ผู้ประเมิน" เป็น "Proactive Coach"
 * - Personalized Learning ระดับประเทศ
 * 
 * Academic References:
 * - Baker, R. S. (2014). Educational Data Mining and Learning Analytics
 * - Romero, C. & Ventura, S. (2010). Educational Data Mining
 * - Arnold, K. E., & Pistilli, M. D. (2012). Course Signals at Purdue
 * 
 * @version 1.0.0
 * @author HOTS-AI Research Team
 */

const admin = require('firebase-admin')

/**
 * 🎯 Risk Level Definitions
 */
const RISK_LEVELS = {
  CRITICAL: { min: 0.8, max: 1.0, label: 'วิกฤต', color: '#dc2626', priority: 1 },
  HIGH: { min: 0.6, max: 0.79, label: 'สูง', color: '#f97316', priority: 2 },
  MODERATE: { min: 0.4, max: 0.59, label: 'ปานกลาง', color: '#eab308', priority: 3 },
  LOW: { min: 0.2, max: 0.39, label: 'ต่ำ', color: '#22c55e', priority: 4 },
  MINIMAL: { min: 0, max: 0.19, label: 'น้อยมาก', color: '#10b981', priority: 5 }
}

/**
 * 📚 Intervention Strategies
 */
const INTERVENTION_STRATEGIES = {
  analysis: {
    scaffolding: [
      { level: 1, name: 'การจัดระเบียบข้อมูล', description: 'ฝึกแยกแยะข้อมูลออกเป็นส่วนๆ ใช้ตารางหรือแผนภาพ' },
      { level: 2, name: 'การหาความสัมพันธ์', description: 'ฝึกหาความเชื่อมโยงระหว่างข้อมูล ใช้ Cause-Effect Diagram' },
      { level: 3, name: 'การวิเคราะห์เชิงลึก', description: 'ฝึกตั้งคำถามเชิงวิเคราะห์ ใช้ SWOT Analysis' }
    ],
    resources: ['Graphic Organizers', 'Fishbone Diagram Templates', 'Compare-Contrast Charts'],
    activities: ['ใบงานการจำแนกประเภท', 'กิจกรรมจับคู่ความสัมพันธ์', 'Case Study วิเคราะห์สถานการณ์']
  },
  reasoning: {
    scaffolding: [
      { level: 1, name: 'การให้เหตุผลพื้นฐาน', description: 'ฝึกใช้ If-Then Statements' },
      { level: 2, name: 'การเชื่อมโยงเหตุผล', description: 'ฝึกสร้าง Logic Chain และ Argument Mapping' },
      { level: 3, name: 'การประเมินเหตุผล', description: 'ฝึกตรวจสอบความสมเหตุสมผลและหา Fallacies' }
    ],
    resources: ['Logic Puzzles', 'Debate Frameworks', 'Argument Templates'],
    activities: ['ใบงานการอ้างเหตุผล', 'กิจกรรมโต้วาทีเชิงสร้างสรรค์', 'การวิเคราะห์ข่าว']
  },
  creativity: {
    scaffolding: [
      { level: 1, name: 'การคิดแบบ Divergent', description: 'ฝึก Brainstorming และ Mind Mapping' },
      { level: 2, name: 'การเชื่อมโยงความคิด', description: 'ฝึกหา Analogies และ Metaphors' },
      { level: 3, name: 'การสร้างนวัตกรรม', description: 'ฝึก SCAMPER และ Design Thinking' }
    ],
    resources: ['Mind Mapping Tools', 'SCAMPER Cards', 'Innovation Canvases'],
    activities: ['ใบงาน What If?', 'กิจกรรม Reverse Brainstorming', 'โปรเจกต์ออกแบบแก้ปัญหา']
  },
  evidence: {
    scaffolding: [
      { level: 1, name: 'การรวบรวมหลักฐาน', description: 'ฝึกค้นหาและจัดระเบียบข้อมูล' },
      { level: 2, name: 'การประเมินหลักฐาน', description: 'ฝึกตรวจสอบความน่าเชื่อถือของแหล่งข้อมูล' },
      { level: 3, name: 'การอ้างอิงหลักฐาน', description: 'ฝึกเขียนอ้างอิงและสร้างเหตุผลจากหลักฐาน' }
    ],
    resources: ['Source Evaluation Checklists', 'Citation Guides', 'Evidence Strength Scales'],
    activities: ['ใบงานตรวจสอบแหล่งข้อมูล', 'กิจกรรม Fact vs Opinion', 'การเขียนรายงานอ้างอิง']
  }
}

/**
 * 🔮 Predictive Intervention Engine
 */
class PredictiveInterventionEngine {
  constructor(db) {
    this.db = db
  }
  
  /**
   * Predict risk for a single student
   * @param {string} studentId - Student ID
   * @param {string} courseId - Optional course filter
   * @returns {Object} Risk prediction and recommendations
   */
  async predictStudentRisk(studentId, courseId = null) {
    // Get student's assessment history
    let query = this.db.collection('assessments')
      .where('studentId', '==', studentId)
      .orderBy('createdAt', 'desc')
      .limit(20)
    
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
    
    if (assessments.length < 3) {
      return {
        success: false,
        error: 'Need at least 3 assessments for risk prediction',
        assessmentCount: assessments.length
      }
    }
    
    // Reverse to chronological order
    assessments.reverse()
    
    // Calculate risk factors
    const riskAnalysis = {
      studentId,
      courseId,
      assessmentCount: assessments.length,
      
      // Overall risk prediction
      overallRisk: this.calculateOverallRisk(assessments),
      
      // Dimension-specific vulnerability
      dimensionVulnerability: this.analyzeDimensionVulnerability(assessments),
      
      // Trajectory-based prediction
      trajectoryRisk: this.predictFromTrajectory(assessments),
      
      // Pattern-based prediction
      patternRisk: this.predictFromPatterns(assessments),
      
      // Volatility risk
      volatilityRisk: this.analyzeVolatilityRisk(assessments),
      
      // Generate interventions
      recommendedInterventions: null,
      
      // Alert level
      alertLevel: null,
      
      generatedAt: new Date().toISOString()
    }
    
    // Calculate aggregate risk
    riskAnalysis.aggregateRisk = this.calculateAggregateRisk(riskAnalysis)
    
    // Generate interventions based on risk
    riskAnalysis.recommendedInterventions = this.generateInterventions(riskAnalysis)
    
    // Determine alert level
    riskAnalysis.alertLevel = this.determineAlertLevel(riskAnalysis)
    
    return {
      success: true,
      prediction: riskAnalysis
    }
  }
  
  /**
   * Calculate overall risk score
   */
  calculateOverallRisk(assessments) {
    const recentAssessments = assessments.slice(-5)
    
    // Factor 1: Recent performance decline
    const performanceDecline = this.calculatePerformanceDecline(assessments)
    
    // Factor 2: Low absolute scores
    const lowScoreRisk = this.calculateLowScoreRisk(recentAssessments)
    
    // Factor 3: Stuck point detection
    const stuckRisk = this.detectCurrentStuckState(assessments)
    
    // Factor 4: Improvement stagnation
    const stagnationRisk = this.calculateStagnationRisk(assessments)
    
    // Weighted combination
    const weights = {
      performanceDecline: 0.30,
      lowScoreRisk: 0.25,
      stuckRisk: 0.25,
      stagnationRisk: 0.20
    }
    
    const riskScore = (
      performanceDecline * weights.performanceDecline +
      lowScoreRisk * weights.lowScoreRisk +
      stuckRisk * weights.stuckRisk +
      stagnationRisk * weights.stagnationRisk
    )
    
    return {
      score: Math.round(riskScore * 100) / 100,
      level: this.getRiskLevel(riskScore),
      factors: {
        performanceDecline: { score: performanceDecline, weight: weights.performanceDecline },
        lowScoreRisk: { score: lowScoreRisk, weight: weights.lowScoreRisk },
        stuckRisk: { score: stuckRisk, weight: weights.stuckRisk },
        stagnationRisk: { score: stagnationRisk, weight: weights.stagnationRisk }
      }
    }
  }
  
  /**
   * Calculate performance decline risk
   */
  calculatePerformanceDecline(assessments) {
    if (assessments.length < 3) return 0
    
    const scores = assessments.map(a => 
      (a.rubricScores?.analysis || 0) +
      (a.rubricScores?.reasoning || 0) +
      (a.rubricScores?.creativity || 0) +
      (a.rubricScores?.evidence || 0)
    )
    
    // Compare recent vs earlier performance
    const midPoint = Math.floor(scores.length / 2)
    const earlyMean = scores.slice(0, midPoint).reduce((a, b) => a + b, 0) / midPoint
    const lateMean = scores.slice(midPoint).reduce((a, b) => a + b, 0) / (scores.length - midPoint)
    
    // Calculate decline (normalized to 0-1)
    const decline = (earlyMean - lateMean) / 20 // 20 is max score
    
    // Only consider decline as risk (not improvement)
    return Math.max(0, Math.min(1, decline * 2))
  }
  
  /**
   * Calculate low score risk
   */
  calculateLowScoreRisk(recentAssessments) {
    const scores = recentAssessments.map(a => 
      (a.rubricScores?.analysis || 0) +
      (a.rubricScores?.reasoning || 0) +
      (a.rubricScores?.creativity || 0) +
      (a.rubricScores?.evidence || 0)
    )
    
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    
    // Risk increases as score decreases
    // Below 8 = high risk, 8-12 = moderate, above 12 = low
    if (mean <= 4) return 1.0
    if (mean <= 8) return 0.8 - ((mean - 4) * 0.15)
    if (mean <= 12) return 0.2 - ((mean - 8) * 0.05)
    return 0
  }
  
  /**
   * Detect if student is currently stuck
   */
  detectCurrentStuckState(assessments) {
    const lastFive = assessments.slice(-5)
    if (lastFive.length < 3) return 0
    
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    let stuckScore = 0
    
    for (const dim of dimensions) {
      const scores = lastFive.map(a => a.rubricScores?.[dim] || 0)
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length
      const maxChange = Math.max(...scores) - Math.min(...scores)
      
      // Stuck if low mean AND low variance
      if (mean < 3 && maxChange <= 1) {
        stuckScore += 0.25
      }
    }
    
    return stuckScore
  }
  
  /**
   * Calculate stagnation risk (no improvement over time)
   */
  calculateStagnationRisk(assessments) {
    if (assessments.length < 5) return 0
    
    const scores = assessments.map(a => 
      (a.rubricScores?.analysis || 0) +
      (a.rubricScores?.reasoning || 0) +
      (a.rubricScores?.creativity || 0) +
      (a.rubricScores?.evidence || 0)
    )
    
    // Linear regression to detect trend
    const n = scores.length
    const xMean = (n - 1) / 2
    const yMean = scores.reduce((a, b) => a + b, 0) / n
    
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (scores[i] - yMean)
      denominator += (i - xMean) * (i - xMean)
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0
    
    // Stagnation = slope near zero or negative
    if (slope <= -0.3) return 0.8  // Declining
    if (slope <= 0) return 0.5     // Stagnant
    if (slope < 0.2) return 0.3    // Slow progress
    return 0                        // Good progress
  }
  
  /**
   * Analyze dimension-specific vulnerability
   */
  analyzeDimensionVulnerability(assessments) {
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const vulnerabilities = {}
    
    for (const dim of dimensions) {
      const scores = assessments.map(a => a.rubricScores?.[dim] || 0)
      const recentScores = scores.slice(-5)
      
      // Calculate vulnerability factors
      const mean = recentScores.reduce((a, b) => a + b, 0) / recentScores.length
      const trend = this.calculateTrend(scores)
      const volatility = this.calculateVolatility(scores)
      const stuckCount = this.countStuckPeriods(scores)
      
      // Vulnerability score
      let vulnerability = 0
      
      // Low mean contributes to vulnerability
      vulnerability += Math.max(0, (3 - mean) / 3) * 0.4
      
      // Negative trend contributes
      vulnerability += Math.max(0, -trend.slope) * 0.3
      
      // High volatility contributes (indicates instability)
      vulnerability += Math.min(1, volatility / 2) * 0.15
      
      // Stuck periods contribute
      vulnerability += Math.min(1, stuckCount * 0.2) * 0.15
      
      vulnerability = Math.min(1, vulnerability)
      
      vulnerabilities[dim] = {
        score: Math.round(vulnerability * 100) / 100,
        level: this.getVulnerabilityLevel(vulnerability),
        factors: {
          currentMean: Math.round(mean * 100) / 100,
          trend: trend.direction,
          slope: trend.slope,
          volatility: volatility,
          stuckPeriods: stuckCount
        },
        prediction: this.predictNextPerformance(scores, dim)
      }
    }
    
    // Rank dimensions by vulnerability
    const ranked = Object.entries(vulnerabilities)
      .sort(([, a], [, b]) => b.score - a.score)
      .map(([dim]) => dim)
    
    return {
      dimensions: vulnerabilities,
      mostVulnerable: ranked[0],
      ranking: ranked,
      criticalCount: Object.values(vulnerabilities).filter(v => v.score >= 0.6).length
    }
  }
  
  /**
   * Predict future performance for a dimension
   */
  predictNextPerformance(scores, dimension) {
    if (scores.length < 3) {
      return { predicted: null, confidence: 'low', reason: 'Insufficient data' }
    }
    
    // Simple linear extrapolation
    const recentScores = scores.slice(-5)
    const trend = this.calculateTrend(recentScores)
    
    const lastScore = recentScores[recentScores.length - 1]
    const predictedScore = Math.max(0, Math.min(5, lastScore + trend.slope))
    
    // Confidence based on volatility
    const volatility = this.calculateVolatility(recentScores)
    let confidence = 'high'
    if (volatility > 1.5) confidence = 'low'
    else if (volatility > 0.8) confidence = 'medium'
    
    return {
      predicted: Math.round(predictedScore * 10) / 10,
      current: lastScore,
      expectedChange: Math.round((predictedScore - lastScore) * 10) / 10,
      confidence,
      dimension
    }
  }
  
  /**
   * Predict risk from trajectory patterns
   */
  predictFromTrajectory(assessments) {
    const scores = assessments.map(a => 
      (a.rubricScores?.analysis || 0) +
      (a.rubricScores?.reasoning || 0) +
      (a.rubricScores?.creativity || 0) +
      (a.rubricScores?.evidence || 0)
    )
    
    // Identify trajectory pattern
    const pattern = this.identifyTrajectoryPattern(scores)
    
    // Risk based on pattern
    const patternRisks = {
      'declining': 0.9,
      'stagnant_low': 0.8,
      'oscillating': 0.5,
      'stagnant_mid': 0.4,
      'slow_growth': 0.2,
      'steady_growth': 0.1,
      'high_performer': 0.05
    }
    
    return {
      pattern: pattern.name,
      patternDescription: pattern.description,
      riskScore: patternRisks[pattern.name] || 0.5,
      trajectory: scores.slice(-10),
      projectedTrajectory: this.projectTrajectory(scores, 5)
    }
  }
  
  /**
   * Identify trajectory pattern
   */
  identifyTrajectoryPattern(scores) {
    const trend = this.calculateTrend(scores)
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const volatility = this.calculateVolatility(scores)
    
    if (trend.slope < -0.5) {
      return { name: 'declining', description: 'คะแนนลดลงอย่างต่อเนื่อง ต้องการความช่วยเหลือเร่งด่วน' }
    }
    
    if (mean < 8 && Math.abs(trend.slope) < 0.2) {
      return { name: 'stagnant_low', description: 'คะแนนต่ำและไม่มีพัฒนาการ ต้องการ Intervention' }
    }
    
    if (volatility > 3) {
      return { name: 'oscillating', description: 'คะแนนขึ้นลงไม่แน่นอน ต้องการความคงที่' }
    }
    
    if (mean >= 8 && mean < 14 && Math.abs(trend.slope) < 0.2) {
      return { name: 'stagnant_mid', description: 'คะแนนปานกลางแต่ไม่ก้าวหน้า ต้องการความท้าทายใหม่' }
    }
    
    if (trend.slope > 0 && trend.slope < 0.3) {
      return { name: 'slow_growth', description: 'มีพัฒนาการช้า อาจต้องการเร่งรัด' }
    }
    
    if (trend.slope >= 0.3) {
      return { name: 'steady_growth', description: 'มีพัฒนาการดี ควรรักษาระดับ' }
    }
    
    if (mean >= 16) {
      return { name: 'high_performer', description: 'ผลงานดีเยี่ยม ควรให้ความท้าทายขั้นสูง' }
    }
    
    return { name: 'unknown', description: 'รูปแบบไม่ชัดเจน ต้องติดตามเพิ่มเติม' }
  }
  
  /**
   * Project future trajectory
   */
  projectTrajectory(scores, periods) {
    if (scores.length < 3) return []
    
    const trend = this.calculateTrend(scores)
    const lastScore = scores[scores.length - 1]
    
    const projected = []
    for (let i = 1; i <= periods; i++) {
      const projectedScore = Math.max(0, Math.min(20, lastScore + (trend.slope * i)))
      projected.push({
        period: i,
        projectedScore: Math.round(projectedScore * 10) / 10,
        confidence: i <= 2 ? 'high' : i <= 4 ? 'medium' : 'low'
      })
    }
    
    return projected
  }
  
  /**
   * Predict from patterns (recurring behaviors)
   */
  predictFromPatterns(assessments) {
    const patterns = {
      dimensionImbalance: this.detectDimensionImbalance(assessments),
      timeOfDayEffect: this.analyzeTimeEffect(assessments),
      recoveryPattern: this.analyzeRecoveryPattern(assessments)
    }
    
    // Calculate pattern-based risk
    let patternRisk = 0
    
    if (patterns.dimensionImbalance.detected) {
      patternRisk += 0.3
    }
    
    if (patterns.recoveryPattern.poorRecovery) {
      patternRisk += 0.4
    }
    
    return {
      patterns,
      combinedRisk: Math.min(1, patternRisk)
    }
  }
  
  /**
   * Detect dimension imbalance
   */
  detectDimensionImbalance(assessments) {
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const dimMeans = {}
    
    for (const dim of dimensions) {
      const scores = assessments.map(a => a.rubricScores?.[dim] || 0)
      dimMeans[dim] = scores.reduce((a, b) => a + b, 0) / scores.length
    }
    
    const means = Object.values(dimMeans)
    const maxMean = Math.max(...means)
    const minMean = Math.min(...means)
    const imbalance = maxMean - minMean
    
    return {
      detected: imbalance >= 1.5,
      imbalance: Math.round(imbalance * 100) / 100,
      strongest: dimensions[means.indexOf(maxMean)],
      weakest: dimensions[means.indexOf(minMean)],
      dimensionMeans: dimMeans
    }
  }
  
  /**
   * Analyze time effect on performance
   */
  analyzeTimeEffect(assessments) {
    if (assessments.length < 10) {
      return { analyzed: false, reason: 'Insufficient data' }
    }
    
    const byHour = {}
    
    assessments.forEach(a => {
      const hour = new Date(a.createdAt).getHours()
      const totalScore = (a.rubricScores?.analysis || 0) +
                        (a.rubricScores?.reasoning || 0) +
                        (a.rubricScores?.creativity || 0) +
                        (a.rubricScores?.evidence || 0)
      
      if (!byHour[hour]) byHour[hour] = []
      byHour[hour].push(totalScore)
    })
    
    const hourMeans = {}
    for (const [hour, scores] of Object.entries(byHour)) {
      if (scores.length >= 2) {
        hourMeans[hour] = scores.reduce((a, b) => a + b, 0) / scores.length
      }
    }
    
    const hours = Object.keys(hourMeans).map(Number)
    const means = Object.values(hourMeans)
    
    if (means.length < 2) {
      return { analyzed: false, reason: 'Insufficient time variation' }
    }
    
    return {
      analyzed: true,
      bestHour: hours[means.indexOf(Math.max(...means))],
      worstHour: hours[means.indexOf(Math.min(...means))],
      hourMeans
    }
  }
  
  /**
   * Analyze recovery pattern after poor performance
   */
  analyzeRecoveryPattern(assessments) {
    const scores = assessments.map(a => 
      (a.rubricScores?.analysis || 0) +
      (a.rubricScores?.reasoning || 0) +
      (a.rubricScores?.creativity || 0) +
      (a.rubricScores?.evidence || 0)
    )
    
    let poorPerformanceCount = 0
    let recoveryCount = 0
    
    for (let i = 0; i < scores.length - 1; i++) {
      if (scores[i] < 10) {
        poorPerformanceCount++
        if (scores[i + 1] >= scores[i] + 2) {
          recoveryCount++
        }
      }
    }
    
    const recoveryRate = poorPerformanceCount > 0 
      ? recoveryCount / poorPerformanceCount 
      : 1
    
    return {
      poorPerformanceCount,
      recoveryCount,
      recoveryRate: Math.round(recoveryRate * 100) / 100,
      poorRecovery: recoveryRate < 0.5 && poorPerformanceCount >= 2
    }
  }
  
  /**
   * Analyze volatility risk
   */
  analyzeVolatilityRisk(assessments) {
    const scores = assessments.map(a => 
      (a.rubricScores?.analysis || 0) +
      (a.rubricScores?.reasoning || 0) +
      (a.rubricScores?.creativity || 0) +
      (a.rubricScores?.evidence || 0)
    )
    
    const volatility = this.calculateVolatility(scores)
    
    // High volatility = unpredictable, harder to help
    let risk = 0
    if (volatility > 4) risk = 0.8
    else if (volatility > 3) risk = 0.5
    else if (volatility > 2) risk = 0.3
    
    return {
      volatility: Math.round(volatility * 100) / 100,
      risk,
      interpretation: volatility > 3 
        ? 'ผลงานไม่คงที่ อาจมีปัจจัยภายนอกส่งผล'
        : 'ผลงานค่อนข้างสม่ำเสมอ'
    }
  }
  
  /**
   * Calculate aggregate risk from all factors
   */
  calculateAggregateRisk(riskAnalysis) {
    const weights = {
      overallRisk: 0.35,
      dimensionVulnerability: 0.25,
      trajectoryRisk: 0.25,
      volatilityRisk: 0.15
    }
    
    const aggregateScore = 
      (riskAnalysis.overallRisk.score * weights.overallRisk) +
      (riskAnalysis.dimensionVulnerability.dimensions[
        riskAnalysis.dimensionVulnerability.mostVulnerable
      ].score * weights.dimensionVulnerability) +
      (riskAnalysis.trajectoryRisk.riskScore * weights.trajectoryRisk) +
      (riskAnalysis.volatilityRisk.risk * weights.volatilityRisk)
    
    return {
      score: Math.round(aggregateScore * 100) / 100,
      level: this.getRiskLevel(aggregateScore),
      weights
    }
  }
  
  /**
   * Generate interventions based on risk analysis
   */
  generateInterventions(riskAnalysis) {
    const interventions = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      teacherActions: [],
      resources: []
    }
    
    // Get most vulnerable dimensions
    const vulnerableDims = Object.entries(riskAnalysis.dimensionVulnerability.dimensions)
      .filter(([, v]) => v.score >= 0.4)
      .sort(([, a], [, b]) => b.score - a.score)
    
    // Generate interventions for each vulnerable dimension
    for (const [dim, vulnerability] of vulnerableDims) {
      const strategy = INTERVENTION_STRATEGIES[dim]
      if (!strategy) continue
      
      // Select scaffolding level based on current mean
      const scaffoldingLevel = vulnerability.factors.currentMean < 2 ? 1 
        : vulnerability.factors.currentMean < 3 ? 2 : 3
      
      const scaffolding = strategy.scaffolding.find(s => s.level === scaffoldingLevel)
      
      interventions.immediate.push({
        dimension: dim,
        dimensionLabel: this.getDimensionLabel(dim),
        vulnerability: vulnerability.score,
        scaffolding,
        priority: vulnerability.score >= 0.7 ? 'HIGH' : 'MEDIUM'
      })
      
      interventions.resources.push(...strategy.resources)
      
      // Teacher actions
      interventions.teacherActions.push({
        dimension: dim,
        action: `ให้ความช่วยเหลือพิเศษในมิติ ${this.getDimensionLabel(dim)}`,
        activities: strategy.activities.slice(0, 2),
        timeline: vulnerability.score >= 0.7 ? 'ภายใน 1 สัปดาห์' : 'ภายใน 2 สัปดาห์'
      })
    }
    
    // Add trajectory-based interventions
    if (riskAnalysis.trajectoryRisk.riskScore >= 0.5) {
      interventions.shortTerm.push({
        type: 'TRAJECTORY_INTERVENTION',
        pattern: riskAnalysis.trajectoryRisk.pattern,
        recommendation: this.getTrajectoryIntervention(riskAnalysis.trajectoryRisk.pattern)
      })
    }
    
    // Add general interventions based on overall risk
    if (riskAnalysis.overallRisk.score >= 0.7) {
      interventions.longTerm.push({
        type: 'COMPREHENSIVE_SUPPORT',
        recommendation: 'ต้องการแผนพัฒนารายบุคคลอย่างเข้มข้น',
        actions: [
          'นัดพูดคุยกับผู้ปกครอง',
          'จัดกลุ่มเรียนเสริม',
          'มอบหมายงานพิเศษตามระดับ'
        ]
      })
    }
    
    // Remove duplicate resources
    interventions.resources = [...new Set(interventions.resources)]
    
    return interventions
  }
  
  /**
   * Get trajectory-specific intervention
   */
  getTrajectoryIntervention(pattern) {
    const interventions = {
      'declining': 'หยุดกิจกรรมปัจจุบัน ทบทวนพื้นฐาน และปรับความยากให้เหมาะสม',
      'stagnant_low': 'เริ่มต้นใหม่ด้วย scaffolding ระดับพื้นฐาน เน้นสร้างความมั่นใจ',
      'oscillating': 'หาสาเหตุของความไม่สม่ำเสมอ อาจเป็นปัจจัยภายนอก',
      'stagnant_mid': 'ให้โจทย์ที่ท้าทายขึ้น หรือเปลี่ยนแนวทางการสอน',
      'slow_growth': 'เพิ่มความถี่ของการฝึก และให้ feedback ที่ละเอียดขึ้น'
    }
    
    return interventions[pattern] || 'ติดตามต่อเนื่องและปรับกลยุทธ์ตามความเหมาะสม'
  }
  
  /**
   * Determine alert level for teacher notification
   */
  determineAlertLevel(riskAnalysis) {
    const score = riskAnalysis.aggregateRisk.score
    
    if (score >= 0.8) {
      return {
        level: 'CRITICAL',
        color: '#dc2626',
        message: 'ต้องการความช่วยเหลือเร่งด่วน',
        notifyImmediately: true,
        suggestedActions: ['นัดพบรายบุคคล', 'แจ้งผู้ปกครอง', 'ปรับแผนการสอน']
      }
    }
    
    if (score >= 0.6) {
      return {
        level: 'HIGH',
        color: '#f97316',
        message: 'มีความเสี่ยงสูง ควรให้ความช่วยเหลือภายใน 1 สัปดาห์',
        notifyImmediately: false,
        suggestedActions: ['เพิ่มการติดตาม', 'ให้งานเสริม', 'จับคู่กับ Peer']
      }
    }
    
    if (score >= 0.4) {
      return {
        level: 'MODERATE',
        color: '#eab308',
        message: 'มีความเสี่ยงปานกลาง ควรติดตามใกล้ชิด',
        notifyImmediately: false,
        suggestedActions: ['ตรวจสอบผลงานทุกสัปดาห์', 'ให้กำลังใจ']
      }
    }
    
    return {
      level: 'LOW',
      color: '#22c55e',
      message: 'ความเสี่ยงต่ำ ติดตามตามปกติ',
      notifyImmediately: false,
      suggestedActions: ['รักษาระดับ', 'ให้ความท้าทายเพิ่มเติม']
    }
  }
  
  /**
   * Predict risk for entire cohort (classroom/course)
   */
  async predictCohortRisk(courseId, options = {}) {
    const { includeDetails = false, minAssessments = 3 } = options
    
    // Get all students in the course
    const progressSnapshot = await this.db.collection('studentProgress')
      .where('courseId', '==', courseId)
      .get()
    
    const studentIds = new Set()
    progressSnapshot.forEach(doc => {
      const data = doc.data()
      if (data.studentId) studentIds.add(data.studentId)
    })
    
    if (studentIds.size === 0) {
      return {
        success: false,
        error: 'No students found in this course'
      }
    }
    
    // Analyze each student
    const studentRisks = []
    const riskDistribution = {
      CRITICAL: 0,
      HIGH: 0,
      MODERATE: 0,
      LOW: 0,
      MINIMAL: 0,
      INSUFFICIENT_DATA: 0
    }
    
    for (const studentId of studentIds) {
      const prediction = await this.predictStudentRisk(studentId, courseId)
      
      if (prediction.success) {
        const risk = {
          studentId,
          aggregateRisk: prediction.prediction.aggregateRisk,
          alertLevel: prediction.prediction.alertLevel,
          mostVulnerableDimension: prediction.prediction.dimensionVulnerability.mostVulnerable
        }
        
        if (includeDetails) {
          risk.fullPrediction = prediction.prediction
        }
        
        studentRisks.push(risk)
        riskDistribution[prediction.prediction.alertLevel.level]++
      } else {
        riskDistribution.INSUFFICIENT_DATA++
      }
    }
    
    // Sort by risk level
    studentRisks.sort((a, b) => b.aggregateRisk.score - a.aggregateRisk.score)
    
    // Identify dimension-level patterns
    const dimensionAtRisk = this.analyzeCohortDimensionVulnerability(studentRisks)
    
    // Generate cohort-level recommendations
    const cohortRecommendations = this.generateCohortRecommendations(riskDistribution, dimensionAtRisk)
    
    return {
      success: true,
      cohortAnalysis: {
        courseId,
        totalStudents: studentIds.size,
        analyzedStudents: studentRisks.length,
        riskDistribution,
        highRiskStudents: studentRisks.filter(s => s.aggregateRisk.score >= 0.6),
        moderateRiskStudents: studentRisks.filter(s => s.aggregateRisk.score >= 0.4 && s.aggregateRisk.score < 0.6),
        dimensionAtRisk,
        cohortRecommendations,
        allStudentRisks: includeDetails ? studentRisks : studentRisks.map(s => ({
          studentId: s.studentId,
          riskScore: s.aggregateRisk.score,
          riskLevel: s.alertLevel.level
        })),
        generatedAt: new Date().toISOString()
      }
    }
  }
  
  /**
   * Analyze cohort-level dimension vulnerability
   */
  analyzeCohortDimensionVulnerability(studentRisks) {
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const vulnerabilityCounts = {}
    
    for (const dim of dimensions) {
      vulnerabilityCounts[dim] = studentRisks.filter(
        s => s.mostVulnerableDimension === dim
      ).length
    }
    
    const total = studentRisks.length || 1
    const ranked = Object.entries(vulnerabilityCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([dim, count]) => ({
        dimension: dim,
        dimensionLabel: this.getDimensionLabel(dim),
        count,
        percentage: Math.round((count / total) * 100)
      }))
    
    return {
      ranking: ranked,
      mostVulnerable: ranked[0]?.dimension,
      concentration: ranked[0]?.percentage >= 40 ? 'high' : ranked[0]?.percentage >= 25 ? 'moderate' : 'distributed'
    }
  }
  
  /**
   * Generate cohort-level recommendations
   */
  generateCohortRecommendations(riskDistribution, dimensionAtRisk) {
    const recommendations = []
    
    const highRiskTotal = riskDistribution.CRITICAL + riskDistribution.HIGH
    const total = Object.values(riskDistribution).reduce((a, b) => a + b, 0) - riskDistribution.INSUFFICIENT_DATA
    
    if (total === 0) {
      return [{ priority: 'INFO', message: 'ไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์' }]
    }
    
    const highRiskPercent = (highRiskTotal / total) * 100
    
    if (highRiskPercent >= 30) {
      recommendations.push({
        priority: 'CRITICAL',
        type: 'CLASS_LEVEL',
        message: `มีนักเรียนความเสี่ยงสูง ${highRiskPercent.toFixed(0)}% ควรพิจารณาปรับแผนการสอนทั้งชั้น`,
        actions: [
          'ทบทวนเนื้อหาพื้นฐานทั้งชั้น',
          'จัดกลุ่มเรียนตามระดับ',
          'เพิ่ม scaffolding ในการสอน'
        ]
      })
    } else if (highRiskPercent >= 15) {
      recommendations.push({
        priority: 'HIGH',
        type: 'GROUP_LEVEL',
        message: `มีนักเรียนความเสี่ยงสูง ${highRiskPercent.toFixed(0)}% ควรจัดกลุ่มช่วยเหลือพิเศษ`,
        actions: [
          'จัดกลุ่มเรียนเสริม',
          'มอบหมาย Peer Tutoring',
          'ติดตามรายบุคคล'
        ]
      })
    }
    
    // Dimension-specific recommendations
    if (dimensionAtRisk.concentration === 'high') {
      const dim = dimensionAtRisk.mostVulnerable
      const strategy = INTERVENTION_STRATEGIES[dim]
      
      recommendations.push({
        priority: 'HIGH',
        type: 'DIMENSION_FOCUS',
        message: `มิติ ${this.getDimensionLabel(dim)} เป็นปัญหาหลักของชั้นเรียน (${dimensionAtRisk.ranking[0].percentage}% ของนักเรียน)`,
        actions: strategy.activities,
        resources: strategy.resources
      })
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'INFO',
        type: 'GENERAL',
        message: 'ภาพรวมของชั้นเรียนอยู่ในเกณฑ์ดี ควรรักษาระดับและให้ความท้าทายเพิ่มเติม',
        actions: ['จัดกิจกรรมเสริมสำหรับนักเรียนที่เก่ง', 'ติดตามนักเรียนกลุ่มเสี่ยงอย่างต่อเนื่อง']
      })
    }
    
    return recommendations
  }
  
  /**
   * Generate proactive alerts for teachers
   */
  async generateProactiveAlerts(teacherId) {
    // Get teacher's courses
    const coursesSnapshot = await this.db.collection('courses')
      .where('teacherId', '==', teacherId)
      .get()
    
    const alerts = []
    
    for (const courseDoc of coursesSnapshot.docs) {
      const courseId = courseDoc.id
      const courseName = courseDoc.data().name
      
      const cohortRisk = await this.predictCohortRisk(courseId)
      
      if (!cohortRisk.success) continue
      
      const analysis = cohortRisk.cohortAnalysis
      
      // Critical individual alerts
      for (const student of analysis.highRiskStudents.slice(0, 5)) {
        if (student.alertLevel.level === 'CRITICAL') {
          alerts.push({
            type: 'INDIVIDUAL_CRITICAL',
            courseId,
            courseName,
            studentId: student.studentId,
            riskScore: student.aggregateRisk.score,
            message: `นักเรียนต้องการความช่วยเหลือเร่งด่วนในวิชา ${courseName}`,
            suggestedActions: student.alertLevel.suggestedActions,
            priority: 1
          })
        }
      }
      
      // Class-level alerts
      const criticalCount = analysis.riskDistribution.CRITICAL + analysis.riskDistribution.HIGH
      if (criticalCount >= 3) {
        alerts.push({
          type: 'CLASS_ALERT',
          courseId,
          courseName,
          highRiskCount: criticalCount,
          message: `มีนักเรียนความเสี่ยงสูง ${criticalCount} คนในวิชา ${courseName}`,
          recommendations: analysis.cohortRecommendations,
          priority: 2
        })
      }
      
      // Dimension focus alert
      if (analysis.dimensionAtRisk.concentration === 'high') {
        alerts.push({
          type: 'DIMENSION_ALERT',
          courseId,
          courseName,
          dimension: analysis.dimensionAtRisk.mostVulnerable,
          dimensionLabel: this.getDimensionLabel(analysis.dimensionAtRisk.mostVulnerable),
          percentage: analysis.dimensionAtRisk.ranking[0].percentage,
          message: `มิติ ${this.getDimensionLabel(analysis.dimensionAtRisk.mostVulnerable)} เป็นจุดอ่อนหลักของวิชา ${courseName}`,
          priority: 3
        })
      }
    }
    
    // Sort by priority
    alerts.sort((a, b) => a.priority - b.priority)
    
    return {
      success: true,
      alerts,
      generatedAt: new Date().toISOString()
    }
  }
  
  // === Helper Methods ===
  
  getRiskLevel(score) {
    for (const [name, config] of Object.entries(RISK_LEVELS)) {
      if (score >= config.min && score <= config.max) {
        return { name, ...config }
      }
    }
    return { name: 'UNKNOWN', label: 'ไม่ทราบ' }
  }
  
  getVulnerabilityLevel(score) {
    if (score >= 0.7) return 'CRITICAL'
    if (score >= 0.5) return 'HIGH'
    if (score >= 0.3) return 'MODERATE'
    return 'LOW'
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
    
    const xMean = (n - 1) / 2
    const yMean = scores.reduce((a, b) => a + b, 0) / n
    
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (scores[i] - yMean)
      denominator += (i - xMean) * (i - xMean)
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0
    
    let direction = 'stable'
    if (slope > 0.3) direction = 'increasing'
    else if (slope < -0.3) direction = 'decreasing'
    
    return {
      slope: Math.round(slope * 1000) / 1000,
      intercept: Math.round((yMean - slope * xMean) * 100) / 100,
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
  
  countStuckPeriods(scores) {
    let stuckCount = 0
    let consecutive = 0
    
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] < 3) {
        consecutive++
        if (consecutive >= 3) stuckCount++
      } else {
        consecutive = 0
      }
    }
    
    return stuckCount
  }
}

// Export
module.exports = {
  RISK_LEVELS,
  INTERVENTION_STRATEGIES,
  PredictiveInterventionEngine
}
