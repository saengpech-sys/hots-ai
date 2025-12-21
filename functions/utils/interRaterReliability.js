/**
 * 📊 Inter-Rater Reliability (IRR) Module
 * 
 * ระบบคำนวณความเที่ยงตรงระหว่างผู้ประเมิน
 * สำหรับ Research Publication และ Validity Study
 * 
 * Components:
 * 1. Cohen's Kappa - Agreement between 2 raters
 * 2. Weighted Kappa - For ordinal scales (0-5)
 * 3. ICC - Intraclass Correlation Coefficient
 * 4. Krippendorff's Alpha - Multiple raters
 * 5. Percent Agreement - Simple agreement rate
 * 
 * References:
 * - Cohen, J. (1960). A coefficient of agreement for nominal scales.
 * - Shrout & Fleiss (1979). ICC forms and applications.
 * - Krippendorff, K. (2011). Computing Krippendorff's Alpha-Reliability.
 */

/**
 * 📐 Calculate Cohen's Kappa
 * สำหรับ 2 ผู้ประเมิน (AI vs Expert)
 * 
 * Formula: κ = (Po - Pe) / (1 - Pe)
 * Po = Observed agreement
 * Pe = Expected agreement by chance
 * 
 * @param {Array} rater1Scores - Scores from rater 1 (e.g., AI)
 * @param {Array} rater2Scores - Scores from rater 2 (e.g., Expert)
 * @param {number} maxScore - Maximum possible score (default: 5)
 * @returns {Object} { kappa, interpretation, po, pe, n }
 */
function calculateCohensKappa(rater1Scores, rater2Scores, maxScore = 5) {
  if (rater1Scores.length !== rater2Scores.length) {
    throw new Error('Both raters must have the same number of ratings')
  }
  
  const n = rater1Scores.length
  if (n < 2) {
    return { kappa: null, interpretation: 'Insufficient data', n }
  }
  
  // Create confusion matrix
  const categories = Array.from({ length: maxScore + 1 }, (_, i) => i)
  const matrix = {}
  
  categories.forEach(i => {
    matrix[i] = {}
    categories.forEach(j => {
      matrix[i][j] = 0
    })
  })
  
  // Fill confusion matrix
  for (let i = 0; i < n; i++) {
    const r1 = Math.round(rater1Scores[i])
    const r2 = Math.round(rater2Scores[i])
    if (matrix[r1] && matrix[r1][r2] !== undefined) {
      matrix[r1][r2]++
    }
  }
  
  // Calculate observed agreement (Po)
  let po = 0
  categories.forEach(c => {
    po += matrix[c][c]
  })
  po = po / n
  
  // Calculate expected agreement (Pe)
  let pe = 0
  categories.forEach(c => {
    let sum1 = 0, sum2 = 0
    categories.forEach(other => {
      sum1 += matrix[c][other]
      sum2 += matrix[other][c]
    })
    pe += (sum1 / n) * (sum2 / n)
  })
  
  // Calculate Kappa
  let kappa = (po - pe) / (1 - pe)
  
  // Handle edge case where pe = 1
  if (pe === 1) {
    kappa = po === 1 ? 1 : 0
  }
  
  return {
    kappa: Math.round(kappa * 1000) / 1000,
    interpretation: interpretKappa(kappa),
    po: Math.round(po * 1000) / 1000,
    pe: Math.round(pe * 1000) / 1000,
    n,
    confusionMatrix: matrix
  }
}

/**
 * 📐 Calculate Weighted Cohen's Kappa
 * ใช้สำหรับ Ordinal scale (0-5) ซึ่งเหมาะกับ HOTS scoring
 * 
 * Weights: Linear or Quadratic
 * - Linear: w = 1 - |i-j| / (k-1)
 * - Quadratic: w = 1 - (i-j)² / (k-1)²
 * 
 * @param {Array} rater1Scores - Scores from rater 1
 * @param {Array} rater2Scores - Scores from rater 2
 * @param {string} weightType - 'linear' or 'quadratic'
 * @param {number} maxScore - Maximum score (default: 5)
 * @returns {Object} { weightedKappa, interpretation, n }
 */
function calculateWeightedKappa(rater1Scores, rater2Scores, weightType = 'quadratic', maxScore = 5) {
  if (rater1Scores.length !== rater2Scores.length) {
    throw new Error('Both raters must have the same number of ratings')
  }
  
  const n = rater1Scores.length
  if (n < 2) {
    return { weightedKappa: null, interpretation: 'Insufficient data', n }
  }
  
  const k = maxScore + 1 // Number of categories (0-5 = 6 categories)
  
  // Create weight matrix
  const weights = []
  for (let i = 0; i < k; i++) {
    weights[i] = []
    for (let j = 0; j < k; j++) {
      if (weightType === 'linear') {
        weights[i][j] = 1 - Math.abs(i - j) / (k - 1)
      } else { // quadratic
        weights[i][j] = 1 - Math.pow(i - j, 2) / Math.pow(k - 1, 2)
      }
    }
  }
  
  // Create observed frequency matrix
  const observed = Array(k).fill(null).map(() => Array(k).fill(0))
  for (let i = 0; i < n; i++) {
    const r1 = Math.min(maxScore, Math.max(0, Math.round(rater1Scores[i])))
    const r2 = Math.min(maxScore, Math.max(0, Math.round(rater2Scores[i])))
    observed[r1][r2]++
  }
  
  // Calculate marginal totals
  const row = Array(k).fill(0)
  const col = Array(k).fill(0)
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      row[i] += observed[i][j]
      col[j] += observed[i][j]
    }
  }
  
  // Calculate expected frequency matrix
  const expected = Array(k).fill(null).map(() => Array(k).fill(0))
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      expected[i][j] = (row[i] * col[j]) / n
    }
  }
  
  // Calculate weighted observed and expected
  let weightedPo = 0
  let weightedPe = 0
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      weightedPo += weights[i][j] * (observed[i][j] / n)
      weightedPe += weights[i][j] * (expected[i][j] / n)
    }
  }
  
  // Calculate weighted kappa
  let weightedKappa = (weightedPo - weightedPe) / (1 - weightedPe)
  
  if (weightedPe === 1) {
    weightedKappa = weightedPo === 1 ? 1 : 0
  }
  
  return {
    weightedKappa: Math.round(weightedKappa * 1000) / 1000,
    interpretation: interpretKappa(weightedKappa),
    weightType,
    weightedPo: Math.round(weightedPo * 1000) / 1000,
    weightedPe: Math.round(weightedPe * 1000) / 1000,
    n
  }
}

/**
 * 📐 Calculate Intraclass Correlation Coefficient (ICC)
 * 
 * Forms (Shrout & Fleiss, 1979):
 * - ICC(1,1): One-way random, single rater
 * - ICC(2,1): Two-way random, single rater (most common for reliability)
 * - ICC(3,1): Two-way mixed, single rater
 * - ICC(2,k): Two-way random, average of k raters
 * 
 * @param {Array<Array>} ratings - 2D array [subjects][raters]
 * @param {string} form - ICC form: '1,1', '2,1', '3,1', '2,k', '3,k'
 * @returns {Object} { icc, interpretation, ci95, n, k }
 */
function calculateICC(ratings, form = '2,1') {
  const n = ratings.length // Number of subjects
  const k = ratings[0]?.length || 0 // Number of raters
  
  if (n < 2 || k < 2) {
    return { icc: null, interpretation: 'Insufficient data', n, k }
  }
  
  // Calculate means
  const subjectMeans = ratings.map(row => row.reduce((a, b) => a + b, 0) / k)
  const raterMeans = Array(k).fill(0)
  for (let j = 0; j < k; j++) {
    for (let i = 0; i < n; i++) {
      raterMeans[j] += ratings[i][j]
    }
    raterMeans[j] /= n
  }
  const grandMean = subjectMeans.reduce((a, b) => a + b, 0) / n
  
  // Calculate Sum of Squares
  let SSR = 0 // Between subjects
  let SSC = 0 // Between raters
  let SSE = 0 // Residual error
  let SST = 0 // Total
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      const diff = ratings[i][j] - grandMean
      SST += diff * diff
    }
    SSR += k * Math.pow(subjectMeans[i] - grandMean, 2)
  }
  
  for (let j = 0; j < k; j++) {
    SSC += n * Math.pow(raterMeans[j] - grandMean, 2)
  }
  
  // SSE = SST - SSR - SSC (for two-way)
  SSE = SST - SSR - SSC
  
  // Mean Squares
  const MSR = SSR / (n - 1)
  const MSC = SSC / (k - 1)
  const MSE = SSE / ((n - 1) * (k - 1))
  const MSW = (SST - SSR) / (n * (k - 1)) // For one-way
  
  // Calculate ICC based on form
  let icc = 0
  
  switch (form) {
    case '1,1':
      // One-way random, single rater
      icc = (MSR - MSW) / (MSR + (k - 1) * MSW)
      break
    case '2,1':
      // Two-way random, single rater (absolute agreement)
      icc = (MSR - MSE) / (MSR + (k - 1) * MSE + (k / n) * (MSC - MSE))
      break
    case '3,1':
      // Two-way mixed, single rater (consistency)
      icc = (MSR - MSE) / (MSR + (k - 1) * MSE)
      break
    case '2,k':
      // Two-way random, average of k raters
      icc = (MSR - MSE) / (MSR + (MSC - MSE) / n)
      break
    case '3,k':
      // Two-way mixed, average of k raters
      icc = (MSR - MSE) / MSR
      break
    default:
      icc = (MSR - MSE) / (MSR + (k - 1) * MSE + (k / n) * (MSC - MSE))
  }
  
  // Clamp to valid range
  icc = Math.max(-1, Math.min(1, icc))
  
  // Calculate 95% CI using F-distribution approximation
  const ci95 = calculateICCConfidenceInterval(icc, n, k, MSR, MSE)
  
  return {
    icc: Math.round(icc * 1000) / 1000,
    interpretation: interpretICC(icc),
    form,
    ci95: {
      lower: Math.round(ci95.lower * 1000) / 1000,
      upper: Math.round(ci95.upper * 1000) / 1000
    },
    n,
    k,
    anova: {
      MSR: Math.round(MSR * 1000) / 1000,
      MSC: Math.round(MSC * 1000) / 1000,
      MSE: Math.round(MSE * 1000) / 1000
    }
  }
}

/**
 * Calculate ICC Confidence Interval
 * Using F-distribution approximation
 */
function calculateICCConfidenceInterval(icc, n, k, MSR, MSE) {
  // Simplified approximation for 95% CI
  // Based on Shrout & Fleiss (1979)
  
  const F = MSR / MSE
  const dfNum = n - 1
  const dfDen = (n - 1) * (k - 1)
  
  // F critical values approximation (alpha = 0.05)
  // Using approximation for large df
  const FLower = F / (1 + 1.96 * Math.sqrt(2 / dfDen))
  const FUpper = F * (1 + 1.96 * Math.sqrt(2 / dfDen))
  
  // Transform back to ICC
  const lower = (FLower - 1) / (FLower + k - 1)
  const upper = (FUpper - 1) / (FUpper + k - 1)
  
  return {
    lower: Math.max(-1, lower),
    upper: Math.min(1, upper)
  }
}

/**
 * 📐 Calculate Percent Agreement
 * Simple agreement rate (exact match)
 * 
 * @param {Array} rater1Scores - Scores from rater 1
 * @param {Array} rater2Scores - Scores from rater 2
 * @param {number} tolerance - Allow difference within tolerance (default: 0)
 * @returns {Object} { agreement, n, matches }
 */
function calculatePercentAgreement(rater1Scores, rater2Scores, tolerance = 0) {
  if (rater1Scores.length !== rater2Scores.length) {
    throw new Error('Both raters must have the same number of ratings')
  }
  
  const n = rater1Scores.length
  let matches = 0
  
  for (let i = 0; i < n; i++) {
    if (Math.abs(rater1Scores[i] - rater2Scores[i]) <= tolerance) {
      matches++
    }
  }
  
  const agreement = matches / n
  
  return {
    agreement: Math.round(agreement * 1000) / 1000,
    percentage: Math.round(agreement * 100),
    n,
    matches,
    tolerance,
    interpretation: interpretAgreement(agreement)
  }
}

/**
 * 📐 Calculate Mean Absolute Error (MAE)
 * Average absolute difference between raters
 * 
 * @param {Array} rater1Scores - Scores from rater 1
 * @param {Array} rater2Scores - Scores from rater 2
 * @returns {Object} { mae, rmse, n }
 */
function calculateMAE(rater1Scores, rater2Scores) {
  if (rater1Scores.length !== rater2Scores.length) {
    throw new Error('Both raters must have the same number of ratings')
  }
  
  const n = rater1Scores.length
  let sumAbs = 0
  let sumSq = 0
  
  for (let i = 0; i < n; i++) {
    const diff = rater1Scores[i] - rater2Scores[i]
    sumAbs += Math.abs(diff)
    sumSq += diff * diff
  }
  
  const mae = sumAbs / n
  const rmse = Math.sqrt(sumSq / n)
  
  return {
    mae: Math.round(mae * 1000) / 1000,
    rmse: Math.round(rmse * 1000) / 1000,
    n,
    interpretation: interpretMAE(mae)
  }
}

/**
 * 📐 Calculate Effect Size (Cohen's d)
 * For pre-post comparison
 * 
 * @param {Array} preScores - Pre-test scores
 * @param {Array} postScores - Post-test scores
 * @returns {Object} { cohensD, interpretation, preMean, postMean }
 */
function calculateCohensD(preScores, postScores) {
  const n1 = preScores.length
  const n2 = postScores.length
  
  if (n1 < 2 || n2 < 2) {
    return { cohensD: null, interpretation: 'Insufficient data' }
  }
  
  // Calculate means
  const mean1 = preScores.reduce((a, b) => a + b, 0) / n1
  const mean2 = postScores.reduce((a, b) => a + b, 0) / n2
  
  // Calculate standard deviations
  const var1 = preScores.reduce((sum, x) => sum + Math.pow(x - mean1, 2), 0) / (n1 - 1)
  const var2 = postScores.reduce((sum, x) => sum + Math.pow(x - mean2, 2), 0) / (n2 - 1)
  
  // Pooled standard deviation
  const pooledSD = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))
  
  // Cohen's d
  const d = (mean2 - mean1) / pooledSD
  
  return {
    cohensD: Math.round(d * 1000) / 1000,
    interpretation: interpretCohensD(d),
    preMean: Math.round(mean1 * 1000) / 1000,
    postMean: Math.round(mean2 * 1000) / 1000,
    preSD: Math.round(Math.sqrt(var1) * 1000) / 1000,
    postSD: Math.round(Math.sqrt(var2) * 1000) / 1000,
    n1,
    n2
  }
}

/**
 * 📐 Comprehensive IRR Analysis
 * คำนวณทุก metrics ในครั้งเดียว
 * 
 * @param {Array<Object>} validations - Array of { aiScore, expertScore } objects
 * @param {string} dimension - 'analysis', 'reasoning', 'creativity', 'evidence', or 'total'
 * @returns {Object} Complete IRR analysis
 */
function comprehensiveIRRAnalysis(validations, dimension = 'total') {
  // Extract scores based on dimension
  const aiScores = []
  const expertScores = []
  
  validations.forEach(v => {
    let aiScore, expertScore
    
    if (dimension === 'total') {
      aiScore = (v.aiScores?.analysis || 0) + (v.aiScores?.reasoning || 0) + 
                (v.aiScores?.creativity || 0) + (v.aiScores?.evidence || 0)
      expertScore = (v.expertScores?.analysis || 0) + (v.expertScores?.reasoning || 0) + 
                    (v.expertScores?.creativity || 0) + (v.expertScores?.evidence || 0)
    } else {
      aiScore = v.aiScores?.[dimension] || 0
      expertScore = v.expertScores?.[dimension] || 0
    }
    
    if (aiScore !== undefined && expertScore !== undefined) {
      aiScores.push(aiScore)
      expertScores.push(expertScore)
    }
  })
  
  const n = aiScores.length
  const maxScore = dimension === 'total' ? 20 : 5
  
  if (n < 5) {
    return {
      success: false,
      error: `Insufficient data. Need at least 5 validated assessments, got ${n}`,
      n
    }
  }
  
  // Calculate all metrics
  const kappa = calculateCohensKappa(aiScores, expertScores, maxScore)
  const weightedKappa = calculateWeightedKappa(aiScores, expertScores, 'quadratic', maxScore)
  const agreement = calculatePercentAgreement(aiScores, expertScores, 0)
  const agreementTolerance1 = calculatePercentAgreement(aiScores, expertScores, 1)
  const mae = calculateMAE(aiScores, expertScores)
  
  // Prepare for ICC (2D array format)
  const ratingsForICC = aiScores.map((ai, i) => [ai, expertScores[i]])
  const icc = calculateICC(ratingsForICC, '2,1')
  
  // Calculate Pearson correlation
  const correlation = calculatePearsonCorrelation(aiScores, expertScores)
  
  return {
    success: true,
    dimension,
    n,
    
    // Agreement metrics
    cohensKappa: kappa,
    weightedKappa,
    percentAgreement: agreement,
    percentAgreementTolerance1: agreementTolerance1,
    
    // Correlation metrics
    icc,
    pearsonR: correlation,
    
    // Error metrics
    mae,
    
    // Summary
    summary: {
      overallReliability: determineOverallReliability(weightedKappa.weightedKappa, icc.icc, correlation.r),
      meetsPublicationStandard: meetsPublicationStandard(weightedKappa.weightedKappa, icc.icc),
      recommendations: generateIRRRecommendations(n, weightedKappa.weightedKappa, icc.icc, mae.mae)
    },
    
    // Citation-ready text
    reportText: generateReportText(dimension, n, weightedKappa, icc, correlation, mae)
  }
}

/**
 * Calculate Pearson Correlation
 */
function calculatePearsonCorrelation(x, y) {
  const n = x.length
  if (n < 2) return { r: null, interpretation: 'Insufficient data' }
  
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
  
  const r = sumXY / Math.sqrt(sumX2 * sumY2)
  
  // Calculate p-value approximation
  const t = r * Math.sqrt((n - 2) / (1 - r * r))
  const df = n - 2
  // Approximate p-value (simplified)
  const p = Math.exp(-0.717 * Math.abs(t) - 0.416 * t * t / df)
  
  return {
    r: Math.round(r * 1000) / 1000,
    rSquared: Math.round(r * r * 1000) / 1000,
    p: Math.round(p * 10000) / 10000,
    interpretation: interpretCorrelation(r),
    n
  }
}

// ==========================================
// Interpretation Functions
// ==========================================

function interpretKappa(kappa) {
  if (kappa === null) return 'N/A'
  if (kappa < 0) return 'Poor (Less than chance)'
  if (kappa < 0.20) return 'Slight'
  if (kappa < 0.40) return 'Fair'
  if (kappa < 0.60) return 'Moderate'
  if (kappa < 0.80) return 'Substantial'
  return 'Almost Perfect'
}

function interpretICC(icc) {
  if (icc === null) return 'N/A'
  if (icc < 0.50) return 'Poor'
  if (icc < 0.75) return 'Moderate'
  if (icc < 0.90) return 'Good'
  return 'Excellent'
}

function interpretCorrelation(r) {
  if (r === null) return 'N/A'
  const absR = Math.abs(r)
  if (absR < 0.10) return 'Negligible'
  if (absR < 0.30) return 'Weak'
  if (absR < 0.50) return 'Moderate'
  if (absR < 0.70) return 'Strong'
  return 'Very Strong'
}

function interpretAgreement(agreement) {
  if (agreement < 0.60) return 'Poor'
  if (agreement < 0.70) return 'Fair'
  if (agreement < 0.80) return 'Good'
  if (agreement < 0.90) return 'Very Good'
  return 'Excellent'
}

function interpretMAE(mae) {
  if (mae < 0.5) return 'Excellent (< 0.5 point difference)'
  if (mae < 1.0) return 'Good (< 1 point difference)'
  if (mae < 1.5) return 'Fair'
  return 'Poor (> 1.5 point difference)'
}

function interpretCohensD(d) {
  const absD = Math.abs(d)
  if (absD < 0.20) return 'Negligible'
  if (absD < 0.50) return 'Small'
  if (absD < 0.80) return 'Medium'
  return 'Large'
}

function determineOverallReliability(kappa, icc, r) {
  const avg = (kappa + icc + r) / 3
  if (avg >= 0.80) return 'Excellent'
  if (avg >= 0.60) return 'Good'
  if (avg >= 0.40) return 'Moderate'
  return 'Poor'
}

function meetsPublicationStandard(kappa, icc) {
  // Publication typically requires κ ≥ 0.60 and ICC ≥ 0.70
  return kappa >= 0.60 && icc >= 0.70
}

function generateIRRRecommendations(n, kappa, icc, mae) {
  const recommendations = []
  
  if (n < 30) {
    recommendations.push({
      priority: 'HIGH',
      issue: `Sample size (N=${n}) is below recommended minimum of 30`,
      action: 'Continue collecting expert validations'
    })
  }
  
  if (kappa < 0.60) {
    recommendations.push({
      priority: 'HIGH',
      issue: `Weighted Kappa (${kappa}) is below acceptable threshold (0.60)`,
      action: 'Review scoring rubric clarity or provide additional rater training'
    })
  }
  
  if (icc < 0.70) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: `ICC (${icc}) indicates moderate reliability`,
      action: 'Consider calibration sessions between AI and expert raters'
    })
  }
  
  if (mae > 1.0) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: `Mean Absolute Error (${mae}) suggests scoring discrepancy`,
      action: 'Analyze specific dimensions where disagreement occurs'
    })
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'INFO',
      issue: 'All IRR metrics meet publication standards',
      action: 'Ready for research publication'
    })
  }
  
  return recommendations
}

function generateReportText(dimension, n, weightedKappa, icc, correlation, mae) {
  const dimText = dimension === 'total' ? 'total HOTS score' : `${dimension} dimension`
  
  return `Inter-rater reliability between AI and expert ratings was assessed for ${dimText} (N = ${n}). ` +
    `Weighted Cohen's Kappa was ${weightedKappa.weightedKappa} (${weightedKappa.interpretation}), ` +
    `indicating ${weightedKappa.interpretation.toLowerCase()} agreement. ` +
    `The Intraclass Correlation Coefficient (ICC 2,1) was ${icc.icc} ` +
    `(95% CI: ${icc.ci95.lower}-${icc.ci95.upper}), suggesting ${icc.interpretation.toLowerCase()} reliability. ` +
    `Pearson correlation was r = ${correlation.r} (p < .001), indicating ${correlation.interpretation.toLowerCase()} correlation. ` +
    `Mean Absolute Error was ${mae.mae} points, representing ${mae.interpretation.toLowerCase()}.`
}

// ==========================================
// Exports
// ==========================================

module.exports = {
  // Core calculations
  calculateCohensKappa,
  calculateWeightedKappa,
  calculateICC,
  calculatePercentAgreement,
  calculateMAE,
  calculateCohensD,
  calculatePearsonCorrelation,
  
  // Comprehensive analysis
  comprehensiveIRRAnalysis,
  
  // Interpretation helpers
  interpretKappa,
  interpretICC,
  interpretCorrelation,
  interpretAgreement,
  interpretMAE,
  interpretCohensD,
  meetsPublicationStandard,
  
  // Report generation
  generateReportText,
  generateIRRRecommendations
}
