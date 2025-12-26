/**
 * 📊 Automated Reliability Ecosystem
 * 
 * ระบบตรวจสอบความเชื่อมั่นอัตโนมัติสำหรับงานวิจัย C10
 * Active Calibration System with Golden Dataset Integration
 * 
 * Features:
 * 1. Golden Dataset Management - ชุดข้อมูลมาตรฐานสำหรับเทียบเคียง
 * 2. Real-time IRR Calculation - คำนวณ Cohen's Kappa แบบ Real-time
 * 3. Bias Detection System - ตรวจจับอคติอัตโนมัติ
 * 4. Expert Sampling - ระบบสุ่มคำตอบให้ผู้เชี่ยวชาญตรวจ
 * 5. Drift Detection - ตรวจจับการเปลี่ยนแปลงของ AI
 * 6. Calibration Alerts - แจ้งเตือนเมื่อต้อง Calibrate
 * 
 * Academic References:
 * - Cohen, J. (1960). A coefficient of agreement for nominal scales.
 * - Gwet, K. L. (2014). Handbook of Inter-Rater Reliability.
 * - Mehrabi et al. (2021). A Survey on Bias and Fairness in ML.
 * 
 * @version 1.0.0
 * @author HOTS-AI Research Team
 */

const { 
  calculateWeightedKappa, 
  calculateICC, 
  calculateMAE,
  comprehensiveIRRAnalysis 
} = require('./interRaterReliability')

/**
 * 🏆 Golden Dataset Configuration
 */
const GOLDEN_DATASET_CONFIG = {
  minimumSamples: 50,          // ขั้นต่ำสำหรับ Golden Dataset
  targetSamples: 100,          // เป้าหมาย
  refreshInterval: 30,         // วัน - รีเฟรชทุก 30 วัน
  stratifiedSampling: true,    // Stratified by score levels
  scoreStrata: [
    { name: 'low', range: [0, 6], targetPercent: 0.25 },
    { name: 'medium', range: [7, 13], targetPercent: 0.50 },
    { name: 'high', range: [14, 20], targetPercent: 0.25 }
  ],
  dimensions: ['analysis', 'reasoning', 'creativity', 'evidence']
}

/**
 * 🔍 Bias Detection Configuration
 */
const BIAS_DETECTION_CONFIG = {
  lengthBias: {
    enabled: true,
    correlationThreshold: 0.4,  // r > 0.4 indicates bias
    minSamplesForAnalysis: 30
  },
  vocabularyBias: {
    enabled: true,
    complexWordThreshold: 0.3,  // >30% complex words
    correlationThreshold: 0.35
  },
  scoringPatterns: {
    leniencyThreshold: 0.7,     // Mean > 70% of max = lenient
    severityThreshold: 0.3,     // Mean < 30% of max = severe
    centralTendencyThreshold: 0.15 // SD < 15% of max = central tendency
  },
  dimensionBias: {
    enabled: true,
    imbalanceThreshold: 1.5     // Max/Min ratio > 1.5 = dimension bias
  }
}

/**
 * 📈 Drift Detection Configuration
 */
const DRIFT_DETECTION_CONFIG = {
  windowSize: 100,             // Rolling window size
  significanceLevel: 0.05,     // p-value threshold
  driftThreshold: 0.15,        // Mean difference threshold
  alertCooldown: 24 * 60 * 60 * 1000, // 24 hours between alerts
  metrics: ['meanScore', 'scoreDistribution', 'dimensionRatios']
}

/**
 * 🏆 Golden Dataset Manager
 * จัดการ Golden Dataset สำหรับ Calibration
 */
class GoldenDatasetManager {
  constructor(db) {
    this.db = db
    this.collection = 'goldenDataset'
    this.config = GOLDEN_DATASET_CONFIG
  }
  
  /**
   * Add a validated sample to Golden Dataset
   * @param {Object} sample - Validated assessment sample
   * @returns {Object} Result of addition
   */
  async addGoldenSample(sample) {
    const {
      assessmentId,
      studentAnswer,
      questionContext,
      aiScores,
      expertScores,
      expertId,
      validationDate,
      gradeLevel,
      subject
    } = sample
    
    // Calculate agreement metrics
    const agreement = this.calculateSampleAgreement(aiScores, expertScores)
    
    // Determine stratum
    const totalExpertScore = Object.values(expertScores).reduce((a, b) => a + b, 0)
    const stratum = this.determineStratum(totalExpertScore)
    
    const goldenSample = {
      assessmentId,
      studentAnswer,
      questionContext,
      aiScores,
      expertScores,
      expertId,
      validationDate: validationDate || new Date().toISOString(),
      gradeLevel,
      subject,
      stratum,
      agreement,
      totalExpertScore,
      totalAIScore: Object.values(aiScores).reduce((a, b) => a + b, 0),
      metadata: {
        addedAt: new Date().toISOString(),
        version: '1.0',
        isActive: true
      }
    }
    
    try {
      const docRef = await this.db.collection(this.collection).add(goldenSample)
      
      // Update stratum counts
      await this.updateStratumCounts()
      
      return {
        success: true,
        sampleId: docRef.id,
        stratum,
        agreement
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * Calculate agreement between AI and Expert for a single sample
   */
  calculateSampleAgreement(aiScores, expertScores) {
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const agreement = {}
    
    for (const dim of dimensions) {
      const diff = Math.abs((aiScores[dim] || 0) - (expertScores[dim] || 0))
      agreement[dim] = {
        aiScore: aiScores[dim] || 0,
        expertScore: expertScores[dim] || 0,
        difference: diff,
        exactMatch: diff === 0,
        withinOne: diff <= 1
      }
    }
    
    const totalDiff = Math.abs(
      Object.values(aiScores).reduce((a, b) => a + b, 0) -
      Object.values(expertScores).reduce((a, b) => a + b, 0)
    )
    
    agreement.total = {
      totalDifference: totalDiff,
      averageDimensionDiff: totalDiff / 4,
      perfectAgreement: totalDiff === 0
    }
    
    return agreement
  }
  
  /**
   * Determine which stratum a score belongs to
   */
  determineStratum(totalScore) {
    for (const stratum of this.config.scoreStrata) {
      if (totalScore >= stratum.range[0] && totalScore <= stratum.range[1]) {
        return stratum.name
      }
    }
    return 'unknown'
  }
  
  /**
   * Update stratum counts for balancing
   */
  async updateStratumCounts() {
    const counts = {
      low: 0,
      medium: 0,
      high: 0,
      total: 0
    }
    
    const snapshot = await this.db.collection(this.collection)
      .where('metadata.isActive', '==', true)
      .get()
    
    snapshot.forEach(doc => {
      const data = doc.data()
      counts[data.stratum] = (counts[data.stratum] || 0) + 1
      counts.total++
    })
    
    // Store counts for reference
    await this.db.collection('systemConfig').doc('goldenDatasetStats').set({
      counts,
      lastUpdated: new Date().toISOString(),
      isBalanced: this.checkBalance(counts)
    }, { merge: true })
    
    return counts
  }
  
  /**
   * Check if dataset is balanced according to target percentages
   */
  checkBalance(counts) {
    if (counts.total < this.config.minimumSamples) {
      return { balanced: false, reason: 'Insufficient samples' }
    }
    
    for (const stratum of this.config.scoreStrata) {
      const actual = counts[stratum.name] / counts.total
      const target = stratum.targetPercent
      const tolerance = 0.1 // 10% tolerance
      
      if (Math.abs(actual - target) > tolerance) {
        return { 
          balanced: false, 
          reason: `${stratum.name} stratum imbalanced: ${(actual * 100).toFixed(1)}% vs ${(target * 100).toFixed(1)}% target`
        }
      }
    }
    
    return { balanced: true }
  }
  
  /**
   * Get samples needing expert validation
   * Intelligent sampling strategy
   */
  async getSamplesForValidation(count = 10, options = {}) {
    const { prioritizeRecent = true, diversifySubjects = true } = options
    
    // Get current stratum counts
    const stats = await this.db.collection('systemConfig').doc('goldenDatasetStats').get()
    const currentCounts = stats.exists ? stats.data().counts : { low: 0, medium: 0, high: 0, total: 0 }
    
    // Determine which strata need more samples
    const needed = {}
    for (const stratum of this.config.scoreStrata) {
      const target = Math.ceil(this.config.targetSamples * stratum.targetPercent)
      const current = currentCounts[stratum.name] || 0
      needed[stratum.name] = Math.max(0, target - current)
    }
    
    // Query unvalidated assessments
    let query = this.db.collection('assessments')
      .where('isValidated', '==', false)
      .orderBy('createdAt', prioritizeRecent ? 'desc' : 'asc')
      .limit(count * 3) // Get more to filter
    
    const snapshot = await query.get()
    const candidates = []
    
    snapshot.forEach(doc => {
      const data = doc.data()
      const totalScore = (data.rubricScores?.analysis || 0) +
                        (data.rubricScores?.reasoning || 0) +
                        (data.rubricScores?.creativity || 0) +
                        (data.rubricScores?.evidence || 0)
      
      candidates.push({
        assessmentId: doc.id,
        ...data,
        totalScore,
        stratum: this.determineStratum(totalScore)
      })
    })
    
    // Prioritize samples from underrepresented strata
    const selected = []
    const strataOrder = Object.entries(needed)
      .sort(([,a], [,b]) => b - a)
      .map(([name]) => name)
    
    for (const stratum of strataOrder) {
      const stratumCandidates = candidates.filter(c => c.stratum === stratum)
      const toSelect = Math.min(
        Math.ceil(count * this.config.scoreStrata.find(s => s.name === stratum).targetPercent),
        stratumCandidates.length,
        count - selected.length
      )
      
      selected.push(...stratumCandidates.slice(0, toSelect))
      
      if (selected.length >= count) break
    }
    
    // Fill remaining slots if needed
    if (selected.length < count) {
      const remaining = candidates.filter(c => !selected.includes(c))
      selected.push(...remaining.slice(0, count - selected.length))
    }
    
    return {
      samples: selected.slice(0, count),
      stratumNeeds: needed,
      currentCounts
    }
  }
  
  /**
   * Calculate Real-time IRR from Golden Dataset
   */
  async calculateRealTimeIRR(dimension = 'total') {
    const snapshot = await this.db.collection(this.collection)
      .where('metadata.isActive', '==', true)
      .get()
    
    const validations = []
    snapshot.forEach(doc => {
      validations.push(doc.data())
    })
    
    if (validations.length < 5) {
      return {
        success: false,
        error: `Insufficient golden samples. Need at least 5, have ${validations.length}`,
        n: validations.length
      }
    }
    
    // Use comprehensive IRR analysis
    return comprehensiveIRRAnalysis(validations, dimension)
  }
  
  /**
   * Get IRR by dimension
   */
  async getIRRByDimension() {
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence', 'total']
    const results = {}
    
    for (const dim of dimensions) {
      results[dim] = await this.calculateRealTimeIRR(dim)
    }
    
    return {
      byDimension: results,
      overallStatus: this.determineOverallStatus(results),
      generatedAt: new Date().toISOString()
    }
  }
  
  /**
   * Determine overall reliability status
   */
  determineOverallStatus(results) {
    const kappaValues = Object.values(results)
      .filter(r => r.success && r.weightedKappa)
      .map(r => r.weightedKappa.weightedKappa)
    
    if (kappaValues.length === 0) {
      return { status: 'insufficient_data', message: 'Not enough data for status determination' }
    }
    
    const avgKappa = kappaValues.reduce((a, b) => a + b, 0) / kappaValues.length
    
    if (avgKappa >= 0.80) {
      return { status: 'excellent', message: 'Reliability is excellent, ready for publication', avgKappa }
    } else if (avgKappa >= 0.60) {
      return { status: 'good', message: 'Reliability is acceptable for research', avgKappa }
    } else if (avgKappa >= 0.40) {
      return { status: 'moderate', message: 'Calibration recommended', avgKappa }
    } else {
      return { status: 'poor', message: 'Urgent calibration required', avgKappa }
    }
  }
}

/**
 * 🔍 Bias Detection System
 * ตรวจจับอคติในการประเมินของ AI
 */
class BiasDetectionSystem {
  constructor(db) {
    this.db = db
    this.config = BIAS_DETECTION_CONFIG
  }
  
  /**
   * Run comprehensive bias analysis
   * @param {Array} assessments - Array of assessment records
   * @returns {Object} Bias analysis report
   */
  async analyzeBias(assessments) {
    if (!assessments || assessments.length < this.config.lengthBias.minSamplesForAnalysis) {
      return {
        success: false,
        error: `Need at least ${this.config.lengthBias.minSamplesForAnalysis} samples, have ${assessments?.length || 0}`
      }
    }
    
    const report = {
      sampleSize: assessments.length,
      analyzedAt: new Date().toISOString(),
      biases: {}
    }
    
    // 1. Length Bias Analysis
    if (this.config.lengthBias.enabled) {
      report.biases.length = this.analyzeLengthBias(assessments)
    }
    
    // 2. Vocabulary Bias Analysis
    if (this.config.vocabularyBias.enabled) {
      report.biases.vocabulary = this.analyzeVocabularyBias(assessments)
    }
    
    // 3. Scoring Pattern Analysis
    report.biases.scoringPatterns = this.analyzeScoringPatterns(assessments)
    
    // 4. Dimension Bias Analysis
    if (this.config.dimensionBias.enabled) {
      report.biases.dimension = this.analyzeDimensionBias(assessments)
    }
    
    // Generate overall risk assessment
    report.overallRisk = this.calculateOverallRisk(report.biases)
    report.recommendations = this.generateRecommendations(report.biases)
    
    return {
      success: true,
      report
    }
  }
  
  /**
   * Analyze Length Bias
   * ตรวจสอบว่า AI ให้คะแนนสูงเมื่อคำตอบยาว
   */
  analyzeLengthBias(assessments) {
    const data = assessments.map(a => ({
      length: (a.studentAnswer || '').length,
      totalScore: (a.rubricScores?.analysis || 0) +
                  (a.rubricScores?.reasoning || 0) +
                  (a.rubricScores?.creativity || 0) +
                  (a.rubricScores?.evidence || 0)
    }))
    
    const correlation = this.calculatePearsonCorrelation(
      data.map(d => d.length),
      data.map(d => d.totalScore)
    )
    
    const hasBias = Math.abs(correlation.r) > this.config.lengthBias.correlationThreshold
    
    // Calculate length statistics
    const lengths = data.map(d => d.length)
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
    
    return {
      detected: hasBias,
      severity: hasBias ? (Math.abs(correlation.r) > 0.6 ? 'high' : 'medium') : 'none',
      correlation: correlation.r,
      interpretation: correlation.r > 0 
        ? 'Positive: Longer answers tend to get higher scores'
        : 'Negative: Shorter answers tend to get higher scores',
      threshold: this.config.lengthBias.correlationThreshold,
      statistics: {
        meanLength: Math.round(avgLength),
        minLength: Math.min(...lengths),
        maxLength: Math.max(...lengths)
      }
    }
  }
  
  /**
   * Analyze Vocabulary Bias
   * ตรวจสอบว่า AI ให้คะแนนสูงเมื่อใช้คำศัพท์ยาก
   */
  analyzeVocabularyBias(assessments) {
    const data = assessments.map(a => {
      const words = (a.studentAnswer || '').split(/\s+/)
      const complexWords = words.filter(w => w.length > 10).length
      const complexRatio = words.length > 0 ? complexWords / words.length : 0
      
      return {
        complexRatio,
        avgWordLength: words.length > 0 
          ? words.reduce((sum, w) => sum + w.length, 0) / words.length 
          : 0,
        totalScore: (a.rubricScores?.analysis || 0) +
                    (a.rubricScores?.reasoning || 0) +
                    (a.rubricScores?.creativity || 0) +
                    (a.rubricScores?.evidence || 0)
      }
    })
    
    const correlation = this.calculatePearsonCorrelation(
      data.map(d => d.avgWordLength),
      data.map(d => d.totalScore)
    )
    
    const hasBias = Math.abs(correlation.r) > this.config.vocabularyBias.correlationThreshold
    
    return {
      detected: hasBias,
      severity: hasBias ? (Math.abs(correlation.r) > 0.5 ? 'high' : 'medium') : 'none',
      correlation: correlation.r,
      interpretation: 'Correlation between average word length and score',
      threshold: this.config.vocabularyBias.correlationThreshold,
      statistics: {
        avgComplexRatio: data.reduce((a, b) => a + b.complexRatio, 0) / data.length,
        avgWordLength: data.reduce((a, b) => a + b.avgWordLength, 0) / data.length
      }
    }
  }
  
  /**
   * Analyze Scoring Patterns
   * ตรวจสอบ Leniency, Severity, Central Tendency
   */
  analyzeScoringPatterns(assessments) {
    const scores = assessments.map(a => 
      (a.rubricScores?.analysis || 0) +
      (a.rubricScores?.reasoning || 0) +
      (a.rubricScores?.creativity || 0) +
      (a.rubricScores?.evidence || 0)
    )
    
    const maxScore = 20
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
    const sd = Math.sqrt(variance)
    
    const normalizedMean = mean / maxScore
    const normalizedSD = sd / maxScore
    
    const patterns = {
      leniency: {
        detected: normalizedMean > this.config.scoringPatterns.leniencyThreshold,
        value: normalizedMean,
        threshold: this.config.scoringPatterns.leniencyThreshold,
        interpretation: 'Scores are consistently high'
      },
      severity: {
        detected: normalizedMean < this.config.scoringPatterns.severityThreshold,
        value: normalizedMean,
        threshold: this.config.scoringPatterns.severityThreshold,
        interpretation: 'Scores are consistently low'
      },
      centralTendency: {
        detected: normalizedSD < this.config.scoringPatterns.centralTendencyThreshold,
        value: normalizedSD,
        threshold: this.config.scoringPatterns.centralTendencyThreshold,
        interpretation: 'Scores cluster around the mean with little variation'
      }
    }
    
    return {
      patterns,
      statistics: {
        mean: Math.round(mean * 100) / 100,
        sd: Math.round(sd * 100) / 100,
        min: Math.min(...scores),
        max: Math.max(...scores),
        normalizedMean,
        normalizedSD
      },
      overallPattern: this.determineOverallPattern(patterns)
    }
  }
  
  /**
   * Analyze Dimension Bias
   * ตรวจสอบว่ามิติใดถูกให้คะแนนสูง/ต่ำเกินไป
   */
  analyzeDimensionBias(assessments) {
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const dimStats = {}
    
    for (const dim of dimensions) {
      const scores = assessments.map(a => a.rubricScores?.[dim] || 0)
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
      
      dimStats[dim] = {
        mean: Math.round(mean * 100) / 100,
        sd: Math.round(Math.sqrt(variance) * 100) / 100,
        min: Math.min(...scores),
        max: Math.max(...scores)
      }
    }
    
    // Check for imbalance
    const means = Object.values(dimStats).map(d => d.mean)
    const maxMean = Math.max(...means)
    const minMean = Math.min(...means)
    const ratio = minMean > 0 ? maxMean / minMean : Infinity
    
    const hasImbalance = ratio > this.config.dimensionBias.imbalanceThreshold
    
    return {
      detected: hasImbalance,
      severity: hasImbalance ? (ratio > 2 ? 'high' : 'medium') : 'none',
      dimensionStats: dimStats,
      imbalanceRatio: Math.round(ratio * 100) / 100,
      threshold: this.config.dimensionBias.imbalanceThreshold,
      highestDimension: dimensions[means.indexOf(maxMean)],
      lowestDimension: dimensions[means.indexOf(minMean)]
    }
  }
  
  /**
   * Calculate Pearson Correlation
   */
  calculatePearsonCorrelation(x, y) {
    const n = x.length
    if (n < 2) return { r: 0, interpretation: 'Insufficient data' }
    
    const meanX = x.reduce((a, b) => a + b, 0) / n
    const meanY = y.reduce((a, b) => a + b, 0) / n
    
    let sumXY = 0, sumX2 = 0, sumY2 = 0
    
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX
      const dy = y[i] - meanY
      sumXY += dx * dy
      sumX2 += dx * dx
      sumY2 += dy * dy
    }
    
    const r = sumXY / Math.sqrt(sumX2 * sumY2) || 0
    
    return {
      r: Math.round(r * 1000) / 1000,
      interpretation: this.interpretCorrelation(r)
    }
  }
  
  /**
   * Interpret correlation coefficient
   */
  interpretCorrelation(r) {
    const absR = Math.abs(r)
    if (absR < 0.1) return 'Negligible'
    if (absR < 0.3) return 'Weak'
    if (absR < 0.5) return 'Moderate'
    if (absR < 0.7) return 'Strong'
    return 'Very Strong'
  }
  
  /**
   * Determine overall scoring pattern
   */
  determineOverallPattern(patterns) {
    if (patterns.leniency.detected) return 'lenient'
    if (patterns.severity.detected) return 'severe'
    if (patterns.centralTendency.detected) return 'central_tendency'
    return 'normal'
  }
  
  /**
   * Calculate overall risk level
   */
  calculateOverallRisk(biases) {
    let riskScore = 0
    let riskFactors = []
    
    if (biases.length?.detected) {
      riskScore += biases.length.severity === 'high' ? 3 : 2
      riskFactors.push('Length bias')
    }
    
    if (biases.vocabulary?.detected) {
      riskScore += biases.vocabulary.severity === 'high' ? 3 : 2
      riskFactors.push('Vocabulary bias')
    }
    
    if (biases.scoringPatterns?.patterns?.leniency?.detected) {
      riskScore += 2
      riskFactors.push('Leniency')
    }
    
    if (biases.scoringPatterns?.patterns?.severity?.detected) {
      riskScore += 2
      riskFactors.push('Severity')
    }
    
    if (biases.scoringPatterns?.patterns?.centralTendency?.detected) {
      riskScore += 1
      riskFactors.push('Central tendency')
    }
    
    if (biases.dimension?.detected) {
      riskScore += biases.dimension.severity === 'high' ? 3 : 2
      riskFactors.push('Dimension imbalance')
    }
    
    let level = 'low'
    if (riskScore >= 6) level = 'high'
    else if (riskScore >= 3) level = 'medium'
    
    return {
      level,
      score: riskScore,
      factors: riskFactors,
      interpretation: this.getRiskInterpretation(level)
    }
  }
  
  /**
   * Get risk interpretation
   */
  getRiskInterpretation(level) {
    const interpretations = {
      low: 'Bias risk is acceptable. Continue monitoring.',
      medium: 'Some bias patterns detected. Consider calibration.',
      high: 'Significant bias detected. Urgent calibration recommended.'
    }
    return interpretations[level] || 'Unknown'
  }
  
  /**
   * Generate recommendations based on detected biases
   */
  generateRecommendations(biases) {
    const recommendations = []
    
    if (biases.length?.detected) {
      recommendations.push({
        priority: biases.length.severity === 'high' ? 'HIGH' : 'MEDIUM',
        issue: 'Length Bias Detected',
        action: 'Review scoring rubric to ensure length is not a scoring factor. Consider adding explicit length-neutrality in prompt.',
        metric: `Correlation: r=${biases.length.correlation}`
      })
    }
    
    if (biases.vocabulary?.detected) {
      recommendations.push({
        priority: biases.vocabulary.severity === 'high' ? 'HIGH' : 'MEDIUM',
        issue: 'Vocabulary Bias Detected',
        action: 'Ensure complex vocabulary is not rewarded unless relevant to content quality. Add vocabulary-neutrality instructions.',
        metric: `Correlation: r=${biases.vocabulary.correlation}`
      })
    }
    
    if (biases.scoringPatterns?.patterns?.leniency?.detected) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Leniency Pattern Detected',
        action: 'Calibrate AI with examples of lower-quality answers. Review anchor descriptions for high scores.',
        metric: `Mean score: ${(biases.scoringPatterns.statistics.normalizedMean * 100).toFixed(1)}%`
      })
    }
    
    if (biases.scoringPatterns?.patterns?.severity?.detected) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Severity Pattern Detected',
        action: 'Calibrate AI with examples of quality answers. Review anchor descriptions for appropriate scoring.',
        metric: `Mean score: ${(biases.scoringPatterns.statistics.normalizedMean * 100).toFixed(1)}%`
      })
    }
    
    if (biases.scoringPatterns?.patterns?.centralTendency?.detected) {
      recommendations.push({
        priority: 'LOW',
        issue: 'Central Tendency Pattern',
        action: 'Encourage more differentiated scoring. Review extreme anchor examples.',
        metric: `Score SD: ${(biases.scoringPatterns.statistics.normalizedSD * 100).toFixed(1)}%`
      })
    }
    
    if (biases.dimension?.detected) {
      recommendations.push({
        priority: biases.dimension.severity === 'high' ? 'HIGH' : 'MEDIUM',
        issue: 'Dimension Imbalance Detected',
        action: `Review scoring for ${biases.dimension.lowestDimension} dimension. Consider dedicated calibration.`,
        metric: `Imbalance ratio: ${biases.dimension.imbalanceRatio}`
      })
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'INFO',
        issue: 'No Significant Bias Detected',
        action: 'Continue regular monitoring. Maintain current calibration.',
        metric: 'All metrics within acceptable range'
      })
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, INFO: 3 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }
}

/**
 * 📈 Drift Detection System
 * ตรวจจับการเปลี่ยนแปลงของ AI Scoring
 */
class DriftDetectionSystem {
  constructor(db) {
    this.db = db
    this.config = DRIFT_DETECTION_CONFIG
  }
  
  /**
   * Analyze drift between two time periods
   */
  async analyzeDrift(recentAssessments, historicalAssessments) {
    if (recentAssessments.length < 20 || historicalAssessments.length < 20) {
      return {
        success: false,
        error: 'Need at least 20 samples in each period for drift detection'
      }
    }
    
    const report = {
      analyzedAt: new Date().toISOString(),
      recentSampleSize: recentAssessments.length,
      historicalSampleSize: historicalAssessments.length,
      drifts: {}
    }
    
    // Calculate statistics for both periods
    const recentStats = this.calculatePeriodStats(recentAssessments)
    const historicalStats = this.calculatePeriodStats(historicalAssessments)
    
    // Compare means
    report.drifts.meanScore = this.compareMeans(recentStats, historicalStats)
    
    // Compare distributions
    report.drifts.distribution = this.compareDistributions(recentStats, historicalStats)
    
    // Compare dimension ratios
    report.drifts.dimensionRatios = this.compareDimensionRatios(recentStats, historicalStats)
    
    // Overall drift assessment
    report.overallDrift = this.assessOverallDrift(report.drifts)
    report.alerts = this.generateDriftAlerts(report.drifts)
    
    return {
      success: true,
      report
    }
  }
  
  /**
   * Calculate statistics for a period
   */
  calculatePeriodStats(assessments) {
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const stats = {
      total: { scores: [], mean: 0, sd: 0 },
      byDimension: {}
    }
    
    for (const dim of dimensions) {
      stats.byDimension[dim] = { scores: [], mean: 0, sd: 0 }
    }
    
    assessments.forEach(a => {
      const totalScore = dimensions.reduce((sum, dim) => sum + (a.rubricScores?.[dim] || 0), 0)
      stats.total.scores.push(totalScore)
      
      for (const dim of dimensions) {
        stats.byDimension[dim].scores.push(a.rubricScores?.[dim] || 0)
      }
    })
    
    // Calculate mean and SD
    stats.total.mean = stats.total.scores.reduce((a, b) => a + b, 0) / stats.total.scores.length
    stats.total.sd = Math.sqrt(
      stats.total.scores.reduce((sum, s) => sum + Math.pow(s - stats.total.mean, 2), 0) / stats.total.scores.length
    )
    
    for (const dim of dimensions) {
      const dimStats = stats.byDimension[dim]
      dimStats.mean = dimStats.scores.reduce((a, b) => a + b, 0) / dimStats.scores.length
      dimStats.sd = Math.sqrt(
        dimStats.scores.reduce((sum, s) => sum + Math.pow(s - dimStats.mean, 2), 0) / dimStats.scores.length
      )
    }
    
    return stats
  }
  
  /**
   * Compare means between periods
   */
  compareMeans(recentStats, historicalStats) {
    const meanDiff = recentStats.total.mean - historicalStats.total.mean
    const pooledSD = Math.sqrt(
      (Math.pow(recentStats.total.sd, 2) + Math.pow(historicalStats.total.sd, 2)) / 2
    )
    
    const effectSize = pooledSD > 0 ? meanDiff / pooledSD : 0
    const driftDetected = Math.abs(meanDiff) > this.config.driftThreshold * 20 // 20 is max score
    
    return {
      driftDetected,
      recentMean: Math.round(recentStats.total.mean * 100) / 100,
      historicalMean: Math.round(historicalStats.total.mean * 100) / 100,
      difference: Math.round(meanDiff * 100) / 100,
      effectSize: Math.round(effectSize * 100) / 100,
      direction: meanDiff > 0 ? 'increasing' : meanDiff < 0 ? 'decreasing' : 'stable'
    }
  }
  
  /**
   * Compare score distributions
   */
  compareDistributions(recentStats, historicalStats) {
    // Simple distribution comparison using SD difference
    const sdDiff = recentStats.total.sd - historicalStats.total.sd
    const sdRatio = historicalStats.total.sd > 0 
      ? recentStats.total.sd / historicalStats.total.sd 
      : 1
    
    const driftDetected = Math.abs(sdRatio - 1) > 0.3 // 30% change in SD
    
    return {
      driftDetected,
      recentSD: Math.round(recentStats.total.sd * 100) / 100,
      historicalSD: Math.round(historicalStats.total.sd * 100) / 100,
      sdRatio: Math.round(sdRatio * 100) / 100,
      interpretation: sdRatio > 1.3 ? 'More variance' : sdRatio < 0.7 ? 'Less variance' : 'Stable variance'
    }
  }
  
  /**
   * Compare dimension ratios
   */
  compareDimensionRatios(recentStats, historicalStats) {
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const ratios = {}
    let anyDrift = false
    
    for (const dim of dimensions) {
      const recentMean = recentStats.byDimension[dim].mean
      const historicalMean = historicalStats.byDimension[dim].mean
      const diff = recentMean - historicalMean
      
      const driftDetected = Math.abs(diff) > this.config.driftThreshold * 5 // 5 is max per dimension
      if (driftDetected) anyDrift = true
      
      ratios[dim] = {
        driftDetected,
        recentMean: Math.round(recentMean * 100) / 100,
        historicalMean: Math.round(historicalMean * 100) / 100,
        difference: Math.round(diff * 100) / 100,
        direction: diff > 0 ? 'increasing' : diff < 0 ? 'decreasing' : 'stable'
      }
    }
    
    return {
      driftDetected: anyDrift,
      byDimension: ratios
    }
  }
  
  /**
   * Assess overall drift
   */
  assessOverallDrift(drifts) {
    let driftScore = 0
    let driftFactors = []
    
    if (drifts.meanScore?.driftDetected) {
      driftScore += 3
      driftFactors.push('Mean score shift')
    }
    
    if (drifts.distribution?.driftDetected) {
      driftScore += 2
      driftFactors.push('Distribution change')
    }
    
    if (drifts.dimensionRatios?.driftDetected) {
      driftScore += 2
      driftFactors.push('Dimension ratio change')
    }
    
    let severity = 'none'
    if (driftScore >= 5) severity = 'high'
    else if (driftScore >= 2) severity = 'moderate'
    else if (driftScore > 0) severity = 'low'
    
    return {
      severity,
      score: driftScore,
      factors: driftFactors,
      requiresCalibration: severity === 'high' || severity === 'moderate'
    }
  }
  
  /**
   * Generate drift alerts
   */
  generateDriftAlerts(drifts) {
    const alerts = []
    
    if (drifts.meanScore?.driftDetected) {
      alerts.push({
        type: 'MEAN_DRIFT',
        severity: Math.abs(drifts.meanScore.difference) > 3 ? 'HIGH' : 'MEDIUM',
        message: `Mean score has ${drifts.meanScore.direction} by ${Math.abs(drifts.meanScore.difference).toFixed(2)} points`,
        recommendation: 'Review recent calibration and prompt changes'
      })
    }
    
    if (drifts.distribution?.driftDetected) {
      alerts.push({
        type: 'DISTRIBUTION_DRIFT',
        severity: 'MEDIUM',
        message: `Score distribution has changed: ${drifts.distribution.interpretation}`,
        recommendation: 'Check for changes in student population or question difficulty'
      })
    }
    
    if (drifts.dimensionRatios?.driftDetected) {
      const driftingDims = Object.entries(drifts.dimensionRatios.byDimension)
        .filter(([, v]) => v.driftDetected)
        .map(([k]) => k)
      
      alerts.push({
        type: 'DIMENSION_DRIFT',
        severity: 'MEDIUM',
        message: `Dimension-specific drift in: ${driftingDims.join(', ')}`,
        recommendation: 'Review dimension-specific prompts and anchors'
      })
    }
    
    return alerts
  }
}

/**
 * 🎯 Export System Manager
 * Factory function to create reliability ecosystem
 */
function createReliabilityEcosystem(db) {
  return {
    goldenDataset: new GoldenDatasetManager(db),
    biasDetection: new BiasDetectionSystem(db),
    driftDetection: new DriftDetectionSystem(db)
  }
}

module.exports = {
  // Main factory
  createReliabilityEcosystem,
  
  // Individual managers
  GoldenDatasetManager,
  BiasDetectionSystem,
  DriftDetectionSystem,
  
  // Configurations
  GOLDEN_DATASET_CONFIG,
  BIAS_DETECTION_CONFIG,
  DRIFT_DETECTION_CONFIG
}
