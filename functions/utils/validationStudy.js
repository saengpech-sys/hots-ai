/**
 * 📊 Validation Study Infrastructure Module
 * 
 * โครงสร้างพื้นฐานสำหรับการศึกษาความตรง (Validity Study)
 * รองรับการวิจัยเชิงปริมาณระดับ Publication
 * 
 * Components:
 * 1. Content Validity - Expert panel review
 * 2. Construct Validity - Factor analysis support
 * 3. Criterion Validity - External benchmark comparison
 * 4. Reliability Analysis - Internal consistency
 * 
 * References:
 * - Messick, S. (1989). Validity. Educational Measurement
 * - Cronbach, L. J. (1951). Coefficient alpha
 * - Lawshe, C. H. (1975). Content Validity Ratio (CVR)
 */

/**
 * Content Validity - Expert Panel Review
 */

/**
 * Calculate Content Validity Ratio (CVR)
 * Lawshe's formula: CVR = (ne - N/2) / (N/2)
 * 
 * @param {number} essentialCount - Experts rating item as "essential"
 * @param {number} totalExperts - Total number of experts
 * @returns {Object} CVR result
 */
function calculateCVR(essentialCount, totalExperts) {
  if (totalExperts < 2) {
    return { error: 'Need at least 2 experts' }
  }

  const cvr = (essentialCount - (totalExperts / 2)) / (totalExperts / 2)
  
  // Critical values for one-tailed test at p < .05
  const criticalValues = {
    5: 0.99, 6: 0.99, 7: 0.99, 8: 0.78, 9: 0.75, 10: 0.62,
    11: 0.59, 12: 0.56, 13: 0.54, 14: 0.51, 15: 0.49,
    20: 0.42, 25: 0.37, 30: 0.33, 35: 0.31, 40: 0.29
  }

  // Find appropriate critical value
  let criticalValue = 0.29 // default for large N
  for (const [n, cv] of Object.entries(criticalValues)) {
    if (totalExperts <= parseInt(n)) {
      criticalValue = cv
      break
    }
  }

  return {
    cvr: Math.round(cvr * 1000) / 1000,
    essentialCount,
    totalExperts,
    criticalValue,
    isSignificant: cvr >= criticalValue,
    interpretation: cvr >= 0.99 ? 'essential' :
                    cvr >= 0.50 ? 'useful' :
                    cvr >= 0 ? 'marginal' : 'not essential'
  }
}

/**
 * Calculate Content Validity Index (CVI)
 * Average of item CVRs
 * 
 * @param {Array} itemCVRs - Array of CVR values for each item
 * @returns {Object} CVI result
 */
function calculateCVI(itemCVRs) {
  if (itemCVRs.length === 0) {
    return { error: 'No items provided' }
  }

  const sum = itemCVRs.reduce((a, b) => a + b, 0)
  const cvi = sum / itemCVRs.length

  return {
    cvi: Math.round(cvi * 1000) / 1000,
    itemCount: itemCVRs.length,
    interpretation: cvi >= 0.80 ? 'acceptable' :
                    cvi >= 0.70 ? 'needs revision' : 'unacceptable',
    recommendation: cvi >= 0.80 
      ? 'Content validity is established'
      : 'Consider revising or removing low-CVR items'
  }
}

/**
 * Conduct expert panel review for A.R.C.E. rubric
 * @param {Array} expertRatings - Array of expert ratings
 * @returns {Object} Panel review results
 */
function conductExpertPanelReview(expertRatings) {
  // Expected structure: expertRatings = [
  //   { expertId, dimension, level, rating: 'essential'|'useful'|'not_necessary' }
  // ]

  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  const levels = [0, 1, 2, 3, 4, 5]
  
  const results = {
    byDimension: {},
    byLevel: {},
    overall: {},
    experts: new Set(expertRatings.map(r => r.expertId))
  }

  const totalExperts = results.experts.size

  // Analyze by dimension-level combination
  for (const dim of dimensions) {
    results.byDimension[dim] = {}
    
    for (const level of levels) {
      const ratings = expertRatings.filter(
        r => r.dimension === dim && r.level === level
      )
      
      const essentialCount = ratings.filter(r => r.rating === 'essential').length
      const cvr = calculateCVR(essentialCount, totalExperts)
      
      results.byDimension[dim][level] = {
        ...cvr,
        ratings: {
          essential: essentialCount,
          useful: ratings.filter(r => r.rating === 'useful').length,
          notNecessary: ratings.filter(r => r.rating === 'not_necessary').length
        }
      }
    }
    
    // Dimension-level CVI
    const dimCVRs = Object.values(results.byDimension[dim]).map(r => r.cvr || 0)
    results.byDimension[dim].cvi = calculateCVI(dimCVRs)
  }

  // Overall CVI
  const allCVRs = []
  for (const dim of dimensions) {
    for (const level of levels) {
      const cvr = results.byDimension[dim][level].cvr
      if (cvr !== undefined) allCVRs.push(cvr)
    }
  }
  results.overall = calculateCVI(allCVRs)

  return results
}

/**
 * Construct Validity - Factor Analysis Support
 */

/**
 * Prepare data matrix for Factor Analysis
 * To be exported to R/SPSS for CFA
 * 
 * @param {Array} assessments - Array of assessments with rubricScores
 * @returns {Object} Data matrix and metadata
 */
function prepareFactorAnalysisData(assessments) {
  const matrix = []
  const metadata = {
    n: assessments.length,
    variables: ['analysis', 'reasoning', 'creativity', 'evidence'],
    descriptives: {}
  }

  // Build data matrix
  for (const assessment of assessments) {
    const scores = assessment.rubricScores || {}
    matrix.push([
      scores.analysis || 0,
      scores.reasoning || 0,
      scores.creativity || 0,
      scores.evidence || 0
    ])
  }

  // Calculate descriptive statistics
  for (let i = 0; i < 4; i++) {
    const variable = metadata.variables[i]
    const values = matrix.map(row => row[i])
    
    metadata.descriptives[variable] = {
      mean: mean(values),
      std: stdDev(values),
      min: Math.min(...values),
      max: Math.max(...values),
      skewness: calculateSkewness(values),
      kurtosis: calculateKurtosis(values)
    }
  }

  // Calculate correlation matrix
  metadata.correlationMatrix = calculateCorrelationMatrix(matrix)

  // KMO approximation (simplified)
  metadata.kmoApproximation = approximateKMO(metadata.correlationMatrix)

  return {
    matrix,
    metadata,
    csvFormat: matrixToCSV(matrix, metadata.variables),
    spssFormat: generateSPSSSyntax(metadata)
  }
}

// Helper statistics functions
function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function stdDev(arr) {
  const m = mean(arr)
  const squareDiffs = arr.map(x => Math.pow(x - m, 2))
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1))
}

function calculateSkewness(arr) {
  const n = arr.length
  const m = mean(arr)
  const s = stdDev(arr)
  const sum = arr.reduce((acc, x) => acc + Math.pow((x - m) / s, 3), 0)
  return (n / ((n - 1) * (n - 2))) * sum
}

function calculateKurtosis(arr) {
  const n = arr.length
  const m = mean(arr)
  const s = stdDev(arr)
  const sum = arr.reduce((acc, x) => acc + Math.pow((x - m) / s, 4), 0)
  const excess = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - 
                 (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3))
  return excess
}

function calculateCorrelationMatrix(matrix) {
  const n = matrix[0].length
  const correlations = []
  
  for (let i = 0; i < n; i++) {
    correlations[i] = []
    for (let j = 0; j < n; j++) {
      if (i === j) {
        correlations[i][j] = 1.0
      } else if (j < i) {
        correlations[i][j] = correlations[j][i]
      } else {
        const xi = matrix.map(row => row[i])
        const xj = matrix.map(row => row[j])
        correlations[i][j] = pearsonCorrelation(xi, xj)
      }
    }
  }
  
  return correlations
}

function pearsonCorrelation(x, y) {
  const n = x.length
  const mx = mean(x)
  const my = mean(y)
  
  let num = 0
  let den1 = 0
  let den2 = 0
  
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx
    const dy = y[i] - my
    num += dx * dy
    den1 += dx * dx
    den2 += dy * dy
  }
  
  return num / Math.sqrt(den1 * den2)
}

function approximateKMO(correlationMatrix) {
  // Simplified KMO approximation based on correlation magnitudes
  const n = correlationMatrix.length
  let sumCorr = 0
  let count = 0
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      sumCorr += Math.abs(correlationMatrix[i][j])
      count++
    }
  }
  
  const avgCorr = sumCorr / count
  
  // Heuristic: Higher average correlation = better factor structure
  return {
    value: Math.min(0.95, 0.5 + avgCorr * 0.5),
    interpretation: avgCorr >= 0.6 ? 'Marvelous' :
                    avgCorr >= 0.5 ? 'Meritorious' :
                    avgCorr >= 0.4 ? 'Mediocre' :
                    avgCorr >= 0.3 ? 'Miserable' : 'Unacceptable',
    note: 'Approximation only - run actual KMO in R/SPSS'
  }
}

function matrixToCSV(matrix, headers) {
  const rows = [headers.join(',')]
  for (const row of matrix) {
    rows.push(row.join(','))
  }
  return rows.join('\n')
}

function generateSPSSSyntax(metadata) {
  return `* HOTS AI Validation Study - Factor Analysis Syntax.
* Generated: ${new Date().toISOString()}.
* N = ${metadata.n}.

FACTOR
  /VARIABLES analysis reasoning creativity evidence
  /MISSING LISTWISE
  /ANALYSIS analysis reasoning creativity evidence
  /PRINT INITIAL KMO EXTRACTION ROTATION
  /FORMAT SORT BLANK(.30)
  /CRITERIA MINEIGEN(1) ITERATE(25)
  /EXTRACTION PC
  /CRITERIA ITERATE(25)
  /ROTATION VARIMAX
  /METHOD=CORRELATION.

RELIABILITY
  /VARIABLES=analysis reasoning creativity evidence
  /SCALE('ARCE') ALL
  /MODEL=ALPHA
  /STATISTICS=DESCRIPTIVE SCALE CORR
  /SUMMARY=TOTAL.
`
}

/**
 * Criterion Validity - External Benchmark Comparison
 */

/**
 * Compare AI scores with expert human scores
 * @param {Array} pairedScores - Array of {aiScore, expertScore} pairs
 * @returns {Object} Criterion validity metrics
 */
function calculateCriterionValidity(pairedScores) {
  if (pairedScores.length < 10) {
    return { error: 'Need at least 10 paired observations' }
  }

  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  const results = {
    byDimension: {},
    overall: {}
  }

  for (const dim of dimensions) {
    const aiScores = pairedScores.map(p => p.aiScore?.[dim] || 0)
    const expertScores = pairedScores.map(p => p.expertScore?.[dim] || 0)

    results.byDimension[dim] = {
      n: pairedScores.length,
      correlation: Math.round(pearsonCorrelation(aiScores, expertScores) * 1000) / 1000,
      meanAbsoluteError: calculateMAE(aiScores, expertScores),
      rootMeanSquareError: calculateRMSE(aiScores, expertScores),
      exactAgreementRate: calculateExactAgreement(aiScores, expertScores),
      adjacentAgreementRate: calculateAdjacentAgreement(aiScores, expertScores)
    }

    // Interpretation
    results.byDimension[dim].interpretation = 
      results.byDimension[dim].correlation >= 0.8 ? 'Excellent' :
      results.byDimension[dim].correlation >= 0.6 ? 'Good' :
      results.byDimension[dim].correlation >= 0.4 ? 'Moderate' : 'Poor'
  }

  // Overall scores
  const overallAI = pairedScores.map(p => 
    Object.values(p.aiScore || {}).reduce((a, b) => a + b, 0)
  )
  const overallExpert = pairedScores.map(p => 
    Object.values(p.expertScore || {}).reduce((a, b) => a + b, 0)
  )

  results.overall = {
    correlation: Math.round(pearsonCorrelation(overallAI, overallExpert) * 1000) / 1000,
    meanAbsoluteError: calculateMAE(overallAI, overallExpert),
    interpretation: pearsonCorrelation(overallAI, overallExpert) >= 0.7 ? 'Valid' : 'Needs review'
  }

  return results
}

function calculateMAE(predicted, actual) {
  const n = predicted.length
  const sum = predicted.reduce((acc, p, i) => acc + Math.abs(p - actual[i]), 0)
  return Math.round((sum / n) * 1000) / 1000
}

function calculateRMSE(predicted, actual) {
  const n = predicted.length
  const sum = predicted.reduce((acc, p, i) => acc + Math.pow(p - actual[i], 2), 0)
  return Math.round(Math.sqrt(sum / n) * 1000) / 1000
}

function calculateExactAgreement(arr1, arr2) {
  const matches = arr1.filter((v, i) => Math.round(v) === Math.round(arr2[i])).length
  return Math.round((matches / arr1.length) * 100)
}

function calculateAdjacentAgreement(arr1, arr2) {
  const matches = arr1.filter((v, i) => Math.abs(Math.round(v) - Math.round(arr2[i])) <= 1).length
  return Math.round((matches / arr1.length) * 100)
}

/**
 * Reliability Analysis - Cronbach's Alpha
 */

/**
 * Calculate Cronbach's Alpha for internal consistency
 * @param {Array} itemScores - 2D array [respondents][items]
 * @returns {Object} Reliability result
 */
function calculateCronbachsAlpha(itemScores) {
  const n = itemScores.length  // Number of respondents
  const k = itemScores[0].length  // Number of items

  if (n < 10 || k < 2) {
    return { error: 'Need at least 10 respondents and 2 items' }
  }

  // Calculate item variances
  const itemVariances = []
  for (let j = 0; j < k; j++) {
    const itemValues = itemScores.map(row => row[j])
    const itemVar = variance(itemValues)
    itemVariances.push(itemVar)
  }
  const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0)

  // Calculate total score variance
  const totalScores = itemScores.map(row => row.reduce((a, b) => a + b, 0))
  const totalVariance = variance(totalScores)

  // Cronbach's Alpha
  const alpha = (k / (k - 1)) * (1 - sumItemVariances / totalVariance)

  // Item-total correlations
  const itemTotalCorrelations = []
  for (let j = 0; j < k; j++) {
    const itemValues = itemScores.map(row => row[j])
    const correctedTotal = itemScores.map((row, i) => totalScores[i] - row[j])
    itemTotalCorrelations.push({
      item: j,
      correlation: Math.round(pearsonCorrelation(itemValues, correctedTotal) * 1000) / 1000
    })
  }

  // Alpha if item deleted
  const alphaIfDeleted = []
  for (let j = 0; j < k; j++) {
    const reducedScores = itemScores.map(row => row.filter((_, i) => i !== j))
    const reducedResult = calculateCronbachsAlphaRaw(reducedScores)
    alphaIfDeleted.push({
      item: j,
      alpha: reducedResult.alpha
    })
  }

  return {
    alpha: Math.round(alpha * 1000) / 1000,
    n,
    k,
    interpretation: alpha >= 0.9 ? 'Excellent' :
                    alpha >= 0.8 ? 'Good' :
                    alpha >= 0.7 ? 'Acceptable' :
                    alpha >= 0.6 ? 'Questionable' :
                    alpha >= 0.5 ? 'Poor' : 'Unacceptable',
    itemVariances: itemVariances.map(v => Math.round(v * 1000) / 1000),
    totalVariance: Math.round(totalVariance * 1000) / 1000,
    itemTotalCorrelations,
    alphaIfDeleted,
    recommendation: alpha >= 0.7 
      ? 'Internal consistency is acceptable for research use'
      : 'Consider revising items with low item-total correlations'
  }
}

function calculateCronbachsAlphaRaw(itemScores) {
  const k = itemScores[0].length
  const itemVariances = []
  for (let j = 0; j < k; j++) {
    const itemValues = itemScores.map(row => row[j])
    itemVariances.push(variance(itemValues))
  }
  const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0)
  const totalScores = itemScores.map(row => row.reduce((a, b) => a + b, 0))
  const totalVariance = variance(totalScores)
  const alpha = (k / (k - 1)) * (1 - sumItemVariances / totalVariance)
  return { alpha: Math.round(alpha * 1000) / 1000 }
}

function variance(arr) {
  const m = mean(arr)
  return arr.reduce((acc, x) => acc + Math.pow(x - m, 2), 0) / (arr.length - 1)
}

/**
 * Generate comprehensive validation study report
 * @param {Object} data - All validation data
 * @returns {Object} Complete validation report
 */
function generateValidationReport(data) {
  const report = {
    generatedAt: new Date().toISOString(),
    studyTitle: 'A.R.C.E. Framework Validation Study',
    sections: {}
  }

  // 1. Content Validity
  if (data.expertRatings) {
    report.sections.contentValidity = conductExpertPanelReview(data.expertRatings)
  }

  // 2. Construct Validity
  if (data.assessments && data.assessments.length >= 100) {
    report.sections.constructValidity = prepareFactorAnalysisData(data.assessments)
  }

  // 3. Criterion Validity
  if (data.pairedScores && data.pairedScores.length >= 10) {
    report.sections.criterionValidity = calculateCriterionValidity(data.pairedScores)
  }

  // 4. Reliability
  if (data.itemScores) {
    report.sections.reliability = calculateCronbachsAlpha(data.itemScores)
  }

  // Overall Assessment
  report.overallAssessment = {
    contentValidity: report.sections.contentValidity?.overall?.cvi >= 0.80 ? '✅ Established' : '⚠️ Needs work',
    constructValidity: '📊 See CFA results in R/SPSS',
    criterionValidity: report.sections.criterionValidity?.overall?.correlation >= 0.70 ? '✅ Valid' : '⚠️ Needs review',
    reliability: report.sections.reliability?.alpha >= 0.70 ? '✅ Acceptable' : '⚠️ Questionable'
  }

  return report
}

module.exports = {
  // Content Validity
  calculateCVR,
  calculateCVI,
  conductExpertPanelReview,
  
  // Construct Validity
  prepareFactorAnalysisData,
  
  // Criterion Validity
  calculateCriterionValidity,
  
  // Reliability
  calculateCronbachsAlpha,
  
  // Reporting
  generateValidationReport,
  
  // Utilities
  mean,
  stdDev,
  pearsonCorrelation
}
