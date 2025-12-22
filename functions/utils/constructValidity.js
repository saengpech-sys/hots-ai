/**
 * 📐 Construct Validity Study Module
 * 
 * วิเคราะห์ Construct Validity ของ A.R.C.E. Rubric
 * - Factor Analysis (exploratory/confirmatory)
 * - Convergent & Discriminant Validity
 * - Double-counting Detection between dimensions
 * - Internal Consistency (Cronbach's Alpha per dimension)
 * 
 * References:
 * - Messick (1989). Validity
 * - Kane (2001). Current Concerns in Validity Theory
 * - Brennan (2001). Generalizability Theory
 * 
 * @module constructValidity
 * @version 1.0.0
 */

const admin = require('firebase-admin')

/**
 * A.R.C.E. Construct Definitions
 * ใช้เป็นฐานในการวิเคราะห์ว่าแต่ละ dimension วัดอะไร
 */
const ARCE_CONSTRUCTS = {
  analysis: {
    name: 'Analysis (การวิเคราะห์)',
    definition: 'ความสามารถในการแยกแยะส่วนประกอบ ระบุความสัมพันธ์ และหาโครงสร้างของข้อมูล',
    indicators: [
      'breaks down information into parts',
      'identifies relationships between components',
      'distinguishes relevant from irrelevant',
      'recognizes organizational patterns'
    ],
    relatedCognitive: ['Bloom: Analysis', 'SOLO: Multistructural → Relational']
  },
  reasoning: {
    name: 'Reasoning (การให้เหตุผล)',
    definition: 'ความสามารถในการสร้างข้อสรุปที่มีเหตุผล ใช้ตรรกะในการอธิบาย',
    indicators: [
      'draws logical conclusions',
      'provides valid arguments',
      'shows cause-effect thinking',
      'uses deductive/inductive reasoning'
    ],
    relatedCognitive: ['Bloom: Evaluation', 'SOLO: Extended Abstract']
  },
  creativity: {
    name: 'Creativity (ความคิดสร้างสรรค์)',
    definition: 'ความสามารถในการสร้างแนวคิดใหม่ มองปัญหาในมุมที่ต่าง ประยุกต์ความรู้ในบริบทใหม่',
    indicators: [
      'generates novel ideas',
      'offers unique perspectives',
      'applies knowledge to new contexts',
      'proposes innovative solutions'
    ],
    relatedCognitive: ['Bloom: Synthesis/Creation', 'SOLO: Extended Abstract']
  },
  evidence: {
    name: 'Evidence (การใช้หลักฐาน)',
    definition: 'ความสามารถในการอ้างอิงข้อมูล ใช้หลักฐานสนับสนุนข้อโต้แย้ง',
    indicators: [
      'cites relevant sources',
      'uses data to support claims',
      'provides concrete examples',
      'references prior knowledge appropriately'
    ],
    relatedCognitive: ['Bloom: Application/Evaluation', 'Facione: Explanation']
  }
}

/**
 * 📊 Calculate Correlation Matrix
 * คำนวณ correlation ระหว่างทุก dimension pair
 * 
 * @param {Array} assessments - Array of assessment objects with rubricScores
 * @returns {Object} Correlation matrix and analysis
 */
function calculateCorrelationMatrix(assessments) {
  if (!assessments || assessments.length < 30) {
    return { error: 'Need at least 30 assessments for correlation analysis' }
  }

  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  
  // Extract score arrays
  const scores = {}
  for (const dim of dimensions) {
    scores[dim] = assessments.map(a => a.rubricScores?.[dim] ?? 0)
  }
  
  // Calculate means
  const means = {}
  for (const dim of dimensions) {
    means[dim] = scores[dim].reduce((a, b) => a + b, 0) / scores[dim].length
  }
  
  // Calculate Pearson correlations
  const correlations = {}
  const n = assessments.length
  
  for (let i = 0; i < dimensions.length; i++) {
    for (let j = i; j < dimensions.length; j++) {
      const dim1 = dimensions[i]
      const dim2 = dimensions[j]
      
      if (i === j) {
        correlations[`${dim1}_${dim2}`] = 1.0
        continue
      }
      
      // Calculate covariance and standard deviations
      let sumXY = 0, sumX2 = 0, sumY2 = 0
      
      for (let k = 0; k < n; k++) {
        const x = scores[dim1][k] - means[dim1]
        const y = scores[dim2][k] - means[dim2]
        sumXY += x * y
        sumX2 += x * x
        sumY2 += y * y
      }
      
      const r = sumXY / (Math.sqrt(sumX2) * Math.sqrt(sumY2))
      correlations[`${dim1}_${dim2}`] = Math.round(r * 1000) / 1000
      correlations[`${dim2}_${dim1}`] = correlations[`${dim1}_${dim2}`]
    }
  }
  
  return {
    correlations,
    sampleSize: n,
    dimensions,
    matrix: formatCorrelationMatrix(correlations, dimensions)
  }
}

/**
 * Format correlation matrix for display
 */
function formatCorrelationMatrix(correlations, dimensions) {
  const matrix = []
  for (const dim1 of dimensions) {
    const row = { dimension: dim1 }
    for (const dim2 of dimensions) {
      row[dim2] = correlations[`${dim1}_${dim2}`] ?? 1.0
    }
    matrix.push(row)
  }
  return matrix
}

/**
 * 🔍 Detect Double-Counting
 * ตรวจสอบว่า Reasoning และ Evidence มี correlation สูงเกินไปหรือไม่
 * (อาจวัดสิ่งเดียวกัน → double-counting)
 * 
 * @param {Array} assessments - Assessment data
 * @returns {Object} Double-counting analysis
 */
function detectDoubleCounting(assessments) {
  const corrResult = calculateCorrelationMatrix(assessments)
  
  if (corrResult.error) return corrResult
  
  const DOUBLE_COUNT_THRESHOLD = 0.85  // r > 0.85 suggests same construct
  const HIGH_CORRELATION_THRESHOLD = 0.70  // Warning zone
  
  const warnings = []
  const pairs = [
    ['analysis', 'reasoning'],
    ['analysis', 'creativity'],
    ['analysis', 'evidence'],
    ['reasoning', 'creativity'],
    ['reasoning', 'evidence'],
    ['creativity', 'evidence']
  ]
  
  const pairAnalysis = []
  
  for (const [dim1, dim2] of pairs) {
    const r = corrResult.correlations[`${dim1}_${dim2}`]
    const r2 = r * r  // Shared variance
    
    const status = r >= DOUBLE_COUNT_THRESHOLD 
      ? 'CRITICAL'
      : r >= HIGH_CORRELATION_THRESHOLD 
        ? 'WARNING' 
        : 'OK'
    
    pairAnalysis.push({
      pair: `${dim1} ↔ ${dim2}`,
      correlation: r,
      sharedVariance: Math.round(r2 * 100),
      status,
      interpretation: getCorrelationInterpretation(r, dim1, dim2)
    })
    
    if (status === 'CRITICAL') {
      warnings.push({
        type: 'DOUBLE_COUNTING',
        severity: 'high',
        message: `${dim1} และ ${dim2} มี correlation ${r.toFixed(2)} - อาจวัดสิ่งเดียวกัน`,
        recommendation: 'พิจารณารวม dimensions หรือแก้ไขเกณฑ์การให้คะแนน'
      })
    } else if (status === 'WARNING') {
      warnings.push({
        type: 'HIGH_CORRELATION',
        severity: 'medium',
        message: `${dim1} และ ${dim2} มี correlation ${r.toFixed(2)} - ค่อนข้างสูง`,
        recommendation: 'ติดตามและทบทวนเกณฑ์ในการประเมิน'
      })
    }
  }
  
  // Focus on Reasoning-Evidence pair (main concern from audit)
  const reasoningEvidenceR = corrResult.correlations['reasoning_evidence']
  const focusAnalysis = {
    pair: 'Reasoning ↔ Evidence',
    correlation: reasoningEvidenceR,
    sharedVariance: Math.round(reasoningEvidenceR * reasoningEvidenceR * 100),
    analysis: analyzeReasoningEvidenceOverlap(assessments, reasoningEvidenceR)
  }
  
  return {
    overallStatus: warnings.some(w => w.severity === 'high') ? 'NEEDS_ATTENTION' : 'OK',
    warnings,
    pairAnalysis,
    focusAnalysis,
    correlationMatrix: corrResult.matrix,
    recommendations: generateValidityRecommendations(warnings, focusAnalysis)
  }
}

/**
 * Get interpretation for correlation
 */
function getCorrelationInterpretation(r, dim1, dim2) {
  if (r >= 0.85) {
    return `${dim1} และ ${dim2} แทบจะวัดสิ่งเดียวกัน - พิจารณารวมเป็น dimension เดียว`
  } else if (r >= 0.70) {
    return `มีความสัมพันธ์สูง - อาจมี conceptual overlap บ้าง แต่ยังแยกกันได้`
  } else if (r >= 0.50) {
    return `ความสัมพันธ์ปานกลาง - เป็นไปได้ว่าเชื่อมโยงกันตามธรรมชาติของ HOTS`
  } else if (r >= 0.30) {
    return `ความสัมพันธ์ต่ำถึงปานกลาง - แยก construct ได้ดี`
  } else {
    return `ความสัมพันธ์ต่ำ - เป็น construct ที่แยกจากกันชัดเจน`
  }
}

/**
 * 🔬 Analyze Reasoning-Evidence Overlap
 * วิเคราะห์เชิงลึกว่า Reasoning และ Evidence overlap กันอย่างไร
 */
function analyzeReasoningEvidenceOverlap(assessments, correlation) {
  const n = assessments.length
  
  // Count patterns
  let sameScore = 0
  let diff1 = 0
  let diff2plus = 0
  let reasoningHigher = 0
  let evidenceHigher = 0
  
  for (const a of assessments) {
    const r = a.rubricScores?.reasoning ?? 0
    const e = a.rubricScores?.evidence ?? 0
    const diff = Math.abs(r - e)
    
    if (diff === 0) sameScore++
    else if (diff === 1) diff1++
    else diff2plus++
    
    if (r > e) reasoningHigher++
    else if (e > r) evidenceHigher++
  }
  
  const analysis = {
    patterns: {
      identicalScores: `${Math.round(sameScore / n * 100)}%`,
      within1Point: `${Math.round((sameScore + diff1) / n * 100)}%`,
      differ2plus: `${Math.round(diff2plus / n * 100)}%`
    },
    direction: {
      reasoningHigher: `${Math.round(reasoningHigher / n * 100)}%`,
      evidenceHigher: `${Math.round(evidenceHigher / n * 100)}%`,
      equal: `${Math.round(sameScore / n * 100)}%`
    },
    interpretation: ''
  }
  
  // Generate interpretation
  if (sameScore / n > 0.5) {
    analysis.interpretation = '⚠️ มากกว่าครึ่งได้คะแนน Reasoning และ Evidence เท่ากัน - อาจเป็น halo effect หรือ rubric overlap'
  } else if ((sameScore + diff1) / n > 0.8) {
    analysis.interpretation = '⚠️ 80%+ ได้คะแนนต่างกันไม่เกิน 1 - อาจไม่ discriminate ได้ดีพอ'
  } else {
    analysis.interpretation = '✅ มี variance เพียงพอระหว่าง Reasoning และ Evidence'
  }
  
  return analysis
}

/**
 * 📊 Calculate Cronbach's Alpha
 * วัด internal consistency ของ rubric
 * 
 * @param {Array} assessments - Assessment data
 * @returns {Object} Cronbach's Alpha results
 */
function calculateCronbachAlpha(assessments) {
  if (!assessments || assessments.length < 30) {
    return { error: 'Need at least 30 assessments for reliability analysis' }
  }

  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  const k = dimensions.length
  const n = assessments.length
  
  // Extract scores
  const scores = assessments.map(a => 
    dimensions.map(d => a.rubricScores?.[d] ?? 0)
  )
  
  // Calculate item variances
  const itemVariances = []
  for (let j = 0; j < k; j++) {
    const itemScores = scores.map(s => s[j])
    const mean = itemScores.reduce((a, b) => a + b, 0) / n
    const variance = itemScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / (n - 1)
    itemVariances.push(variance)
  }
  
  // Calculate total score variance
  const totalScores = scores.map(s => s.reduce((a, b) => a + b, 0))
  const totalMean = totalScores.reduce((a, b) => a + b, 0) / n
  const totalVariance = totalScores.reduce((sum, s) => sum + Math.pow(s - totalMean, 2), 0) / (n - 1)
  
  // Cronbach's Alpha formula
  const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0)
  const alpha = (k / (k - 1)) * (1 - sumItemVariances / totalVariance)
  
  // Interpretation
  let interpretation
  if (alpha >= 0.90) interpretation = 'Excellent internal consistency'
  else if (alpha >= 0.80) interpretation = 'Good internal consistency'
  else if (alpha >= 0.70) interpretation = 'Acceptable internal consistency'
  else if (alpha >= 0.60) interpretation = 'Questionable internal consistency'
  else interpretation = 'Poor internal consistency'
  
  return {
    alpha: Math.round(alpha * 1000) / 1000,
    interpretation,
    itemVariances: dimensions.map((d, i) => ({ dimension: d, variance: Math.round(itemVariances[i] * 100) / 100 })),
    totalVariance: Math.round(totalVariance * 100) / 100,
    sampleSize: n,
    threshold: {
      excellent: 0.90,
      good: 0.80,
      acceptable: 0.70
    }
  }
}

/**
 * 🎯 Generate Validity Recommendations
 */
function generateValidityRecommendations(warnings, focusAnalysis) {
  const recommendations = []
  
  // Based on warnings
  for (const w of warnings) {
    if (w.severity === 'high') {
      recommendations.push({
        priority: 'HIGH',
        action: w.recommendation,
        rationale: w.message
      })
    }
  }
  
  // Based on Reasoning-Evidence analysis
  if (focusAnalysis.correlation > 0.70) {
    recommendations.push({
      priority: 'MEDIUM',
      action: 'พิจารณาแก้ไข rubric descriptors เพื่อแยก Reasoning และ Evidence ให้ชัดเจนขึ้น',
      rationale: 'Reasoning เน้นที่ "process ของการคิด" ส่วน Evidence เน้นที่ "การนำข้อมูลมาใช้"'
    })
    
    recommendations.push({
      priority: 'MEDIUM',
      action: 'เพิ่มตัวอย่าง anchor responses ที่แสดงความแตกต่างระหว่าง Reasoning สูง/Evidence ต่ำ และกลับกัน',
      rationale: 'ช่วยให้ทั้ง AI และ human raters discriminate ได้ดีขึ้น'
    })
  }
  
  // General recommendations
  recommendations.push({
    priority: 'LOW',
    action: 'ทำ Factor Analysis (EFA/CFA) เพื่อยืนยัน 4-factor structure ของ A.R.C.E.',
    rationale: 'Empirical validation ของ construct structure'
  })
  
  return recommendations
}

/**
 * 📑 Run Full Validity Study
 * รัน comprehensive validity analysis
 * 
 * @param {Object} db - Firestore instance
 * @param {Object} options - Filter options (courseId, dateRange, etc.)
 * @returns {Object} Complete validity report
 */
async function runValidityStudy(db, options = {}) {
  // Fetch assessments
  let query = db.collection('assessments')
    .where('isFallback', '!=', true)
    .orderBy('isFallback')
    .orderBy('createdAt', 'desc')
    .limit(options.limit || 1000)
  
  if (options.courseId) {
    query = query.where('courseId', '==', options.courseId)
  }
  
  const snapshot = await query.get()
  const assessments = snapshot.docs.map(d => d.data())
  
  if (assessments.length < 30) {
    return { error: `Insufficient data: ${assessments.length} assessments (need 30+)` }
  }
  
  // Run all analyses
  const correlationAnalysis = calculateCorrelationMatrix(assessments)
  const doubleCountingAnalysis = detectDoubleCounting(assessments)
  const reliabilityAnalysis = calculateCronbachAlpha(assessments)
  
  // Descriptive statistics
  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  const descriptiveStats = {}
  
  for (const dim of dimensions) {
    const scores = assessments.map(a => a.rubricScores?.[dim] ?? 0)
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const sorted = [...scores].sort((a, b) => a - b)
    const median = scores.length % 2 === 0
      ? (sorted[scores.length / 2 - 1] + sorted[scores.length / 2]) / 2
      : sorted[Math.floor(scores.length / 2)]
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
    const stdDev = Math.sqrt(variance)
    
    descriptiveStats[dim] = {
      mean: Math.round(mean * 100) / 100,
      median,
      stdDev: Math.round(stdDev * 100) / 100,
      min: Math.min(...scores),
      max: Math.max(...scores),
      range: Math.max(...scores) - Math.min(...scores)
    }
  }
  
  // Generate report
  const report = {
    metadata: {
      runDate: new Date().toISOString(),
      sampleSize: assessments.length,
      filters: options
    },
    descriptiveStatistics: descriptiveStats,
    correlationAnalysis,
    doubleCountingAnalysis,
    reliabilityAnalysis,
    overallValidity: {
      status: determineOverallValidity(correlationAnalysis, doubleCountingAnalysis, reliabilityAnalysis),
      summary: generateValiditySummary(correlationAnalysis, doubleCountingAnalysis, reliabilityAnalysis)
    },
    constructs: ARCE_CONSTRUCTS
  }
  
  // Save report
  await db.collection('validityStudies').add({
    ...report,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  })
  
  return report
}

/**
 * Determine overall validity status
 */
function determineOverallValidity(corr, doubleCounting, reliability) {
  let issues = 0
  
  if (doubleCounting.overallStatus === 'NEEDS_ATTENTION') issues++
  if (reliability.alpha < 0.70) issues++
  
  // Check if any correlation is too high
  const criticalPairs = doubleCounting.pairAnalysis?.filter(p => p.status === 'CRITICAL') || []
  if (criticalPairs.length > 0) issues++
  
  if (issues === 0) return 'GOOD'
  if (issues === 1) return 'ACCEPTABLE'
  return 'NEEDS_IMPROVEMENT'
}

/**
 * Generate validity summary
 */
function generateValiditySummary(corr, doubleCounting, reliability) {
  const points = []
  
  // Reliability
  if (reliability.alpha >= 0.80) {
    points.push(`✅ Internal consistency ดี (α = ${reliability.alpha})`)
  } else if (reliability.alpha >= 0.70) {
    points.push(`⚠️ Internal consistency พอใช้ได้ (α = ${reliability.alpha})`)
  } else {
    points.push(`❌ Internal consistency ต่ำ (α = ${reliability.alpha})`)
  }
  
  // Double counting
  const criticalPairs = doubleCounting.pairAnalysis?.filter(p => p.status === 'CRITICAL') || []
  const warningPairs = doubleCounting.pairAnalysis?.filter(p => p.status === 'WARNING') || []
  
  if (criticalPairs.length > 0) {
    points.push(`❌ พบ ${criticalPairs.length} คู่ที่อาจ double-count: ${criticalPairs.map(p => p.pair).join(', ')}`)
  } else if (warningPairs.length > 0) {
    points.push(`⚠️ พบ ${warningPairs.length} คู่ที่มี correlation สูง: ${warningPairs.map(p => p.pair).join(', ')}`)
  } else {
    points.push('✅ ทุก dimension แยกจากกันดี (discriminant validity)')
  }
  
  // Reasoning-Evidence focus
  if (doubleCounting.focusAnalysis?.correlation > 0.70) {
    points.push(`⚠️ Reasoning-Evidence มี correlation ${doubleCounting.focusAnalysis.correlation.toFixed(2)} - ควรทบทวน rubric`)
  }
  
  return points
}

/**
 * 🆕 Real-time Score Adjustment for Double-Counting
 * ปรับคะแนนเมื่อตรวจพบ Reasoning-Evidence overlap สูง
 * 
 * ใช้สำหรับ:
 * 1. Adjust individual assessment scores in real-time
 * 2. Flag assessments that may have inflated scores
 * 3. Calculate composite score when correlation > 0.80
 * 
 * @param {Object} rubricScores - Current rubric scores {analysis, reasoning, creativity, evidence}
 * @param {number|null} historicalCorrelation - Reasoning-Evidence correlation from recent assessments (optional)
 * @returns {Object} Adjusted scores and adjustment metadata
 */
function adjustForDoubleCounting(rubricScores, historicalCorrelation = null) {
  const { analysis, reasoning, creativity, evidence } = rubricScores
  
  // Default thresholds
  const ADJUSTMENT_THRESHOLD = 0.80   // Start adjusting at r > 0.80
  const CRITICAL_THRESHOLD = 0.90     // Strong adjustment at r > 0.90
  
  // Calculate real-time similarity between Reasoning and Evidence
  // This is a proxy when we don't have historical correlation
  const scoreDifference = Math.abs(reasoning - evidence)
  const maxScore = Math.max(reasoning, evidence)
  const similarityRatio = maxScore > 0 ? 1 - (scoreDifference / maxScore) : 0
  
  // Use historical correlation if available, otherwise use similarity proxy
  const effectiveCorrelation = historicalCorrelation ?? (similarityRatio * 0.9)  // Scale similarity to approximate correlation
  
  // Determine if adjustment is needed
  const needsAdjustment = effectiveCorrelation > ADJUSTMENT_THRESHOLD
  const isCritical = effectiveCorrelation > CRITICAL_THRESHOLD
  
  if (!needsAdjustment) {
    return {
      adjusted: false,
      originalScores: rubricScores,
      adjustedScores: rubricScores,
      originalTotal: analysis + reasoning + creativity + evidence,
      adjustedTotal: analysis + reasoning + creativity + evidence,
      adjustmentFactor: 1.0,
      reason: 'no_adjustment_needed',
      correlation: effectiveCorrelation
    }
  }
  
  // Calculate adjustment factor
  // Higher correlation = larger reduction to prevent double-counting
  const adjustmentFactor = isCritical 
    ? 0.75  // 25% reduction for critical overlap
    : 0.85  // 15% reduction for moderate overlap
  
  // Option 1: Reduce the higher of Reasoning/Evidence
  // This prevents inflating total when both measure the same thing
  let adjustedReasoning = reasoning
  let adjustedEvidence = evidence
  
  if (reasoning >= evidence) {
    // Reasoning is higher or equal - reduce it
    adjustedReasoning = Math.round(reasoning * adjustmentFactor * 10) / 10
  } else {
    // Evidence is higher - reduce it
    adjustedEvidence = Math.round(evidence * adjustmentFactor * 10) / 10
  }
  
  // Option 2 (Alternative): Use composite score
  // Weighted average gives more conservative estimate
  const compositeScore = Math.round(
    ((reasoning * 0.6) + (evidence * 0.4)) * 10
  ) / 10  // Weight reasoning slightly higher as it includes logical structure
  
  const adjustedScores = {
    analysis,
    reasoning: adjustedReasoning,
    creativity,
    evidence: adjustedEvidence
  }
  
  const originalTotal = analysis + reasoning + creativity + evidence
  const adjustedTotal = analysis + adjustedReasoning + creativity + adjustedEvidence
  const compositeTotal = analysis + compositeScore + creativity  // Use composite instead of both
  
  return {
    adjusted: true,
    originalScores: rubricScores,
    adjustedScores,
    originalTotal,
    adjustedTotal,
    compositeScore,
    compositeTotal,
    adjustmentFactor,
    adjustmentMethod: isCritical ? 'COMPOSITE' : 'REDUCE_HIGHER',
    reason: isCritical 
      ? 'critical_overlap_detected'
      : 'moderate_overlap_detected',
    correlation: effectiveCorrelation,
    recommendation: isCritical
      ? 'พิจารณาใช้ compositeScore แทน Reasoning+Evidence แยกกัน'
      : 'คะแนนปรับลดเล็กน้อยเพื่อชดเชย overlap ระหว่าง Reasoning-Evidence',
    audit: {
      scoreDifference,
      similarityRatio,
      historicalCorrelationUsed: historicalCorrelation !== null,
      thresholdUsed: isCritical ? CRITICAL_THRESHOLD : ADJUSTMENT_THRESHOLD
    }
  }
}

/**
 * 🆕 Check if course needs score adjustment based on historical data
 * Should be called periodically or when generating reports
 * 
 * @param {Object} db - Firestore instance
 * @param {string} courseId - Course ID
 * @param {number} sampleSize - Number of recent assessments to analyze
 * @returns {Object} Course-level adjustment recommendation
 */
async function checkCourseScoreAdjustment(db, courseId, sampleSize = 50) {
  try {
    const assessmentsRef = db.collection('assessments')
    const query = assessmentsRef
      .where('courseId', '==', courseId)
      .orderBy('timestamp', 'desc')
      .limit(sampleSize)
    
    const snapshot = await query.get()
    
    if (snapshot.empty || snapshot.size < 10) {
      return {
        needsAdjustment: false,
        reason: 'insufficient_data',
        sampleSize: snapshot.size
      }
    }
    
    const assessments = snapshot.docs.map(doc => doc.data())
    const doubleCounting = detectDoubleCounting(assessments)
    
    const reasoningEvidenceCorr = doubleCounting.focusAnalysis?.correlation || 0
    
    return {
      needsAdjustment: reasoningEvidenceCorr > 0.80,
      correlation: reasoningEvidenceCorr,
      sampleSize: assessments.length,
      status: doubleCounting.overallStatus,
      recommendation: reasoningEvidenceCorr > 0.80
        ? '⚠️ แนะนำให้เปิดใช้ auto-adjustment สำหรับ course นี้'
        : '✅ ไม่จำเป็นต้องปรับคะแนน',
      doubleCounting
    }
  } catch (error) {
    console.error('Error checking course score adjustment:', error)
    return {
      needsAdjustment: false,
      error: error.message
    }
  }
}

module.exports = {
  ARCE_CONSTRUCTS,
  calculateCorrelationMatrix,
  detectDoubleCounting,
  calculateCronbachAlpha,
  runValidityStudy,
  analyzeReasoningEvidenceOverlap,
  adjustForDoubleCounting,
  checkCourseScoreAdjustment
}
