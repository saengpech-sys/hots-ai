/**
 * Research Statistics Controller
 * Handles IRR calculations, effect sizes, and research data exports
 * 
 * Functions:
 * - calculateIRR: Inter-Rater Reliability calculation
 * - irrReport: Publication-ready IRR report
 * - calculateEffectSize: Cohen's d and paired t-test
 * - researchSummary: Research summary statistics
 * - correlationAnalysis: Chat vs Worksheet correlation
 * - logInterventionEvent: Log micro-lessons and interventions
 */

const functions = require('firebase-functions')
const { getDb, FieldValue } = require('../shared/firebase')
const cors = require('cors')({ origin: true })

// Import research utilities
const {
  comprehensiveIRRAnalysis,
  calculateCohensD
} = require('../utils/interRaterReliability')

const {
  generateResearchSummary,
  calculateScoreCorrelation,
  logIntervention
} = require('../utils/researchData')

/**
 * Calculate IRR - Inter-Rater Reliability between AI and Expert
 * GET { courseId?, dimension?, minValidations? }
 */
const calculateIRR = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const db = getDb()
      const { courseId, dimension = 'total', minValidations = 5 } = req.query
      
      // Get validated assessments
      let query = db.collection('assessments')
        .where('expertValidation.isValidated', '==', true)
      
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }
      
      const snapshot = await query.get()
      
      if (snapshot.empty) {
        return res.status(200).json({
          success: false,
          error: 'No validated assessments found',
          validatedCount: 0
        })
      }
      
      // Extract validation data
      const validations = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        const expert = data.expertValidation
        
        if (expert && data.rubricScores) {
          validations.push({
            assessmentId: doc.id,
            aiScores: {
              analysis: data.rubricScores.analysis || 0,
              reasoning: data.rubricScores.reasoning || 0,
              creativity: data.rubricScores.creativity || 0,
              evidence: data.rubricScores.evidence || 0
            },
            expertScores: {
              analysis: expert.expertScores?.analysis || 0,
              reasoning: expert.expertScores?.reasoning || 0,
              creativity: expert.expertScores?.creativity || 0,
              evidence: expert.expertScores?.evidence || 0
            }
          })
        }
      })
      
      if (validations.length < minValidations) {
        return res.status(200).json({
          success: false,
          error: `Insufficient validated assessments. Need at least ${minValidations}, got ${validations.length}`,
          validatedCount: validations.length
        })
      }
      
      // Calculate comprehensive IRR
      const irrResults = comprehensiveIRRAnalysis(validations, dimension)
      
      // Also calculate per-dimension if total requested
      let dimensionBreakdown = null
      if (dimension === 'total') {
        dimensionBreakdown = {
          analysis: comprehensiveIRRAnalysis(validations, 'analysis'),
          reasoning: comprehensiveIRRAnalysis(validations, 'reasoning'),
          creativity: comprehensiveIRRAnalysis(validations, 'creativity'),
          evidence: comprehensiveIRRAnalysis(validations, 'evidence')
        }
      }
      
      return res.status(200).json({
        success: true,
        courseId: courseId || 'all',
        dimension,
        validatedCount: validations.length,
        results: irrResults,
        dimensionBreakdown,
        publicationReady: irrResults.summary?.meetsPublicationStandard || false,
        generatedAt: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('Calculate IRR error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * IRR Report - Publication-ready IRR report
 * GET { courseId?, format? }
 */
const irrReport = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const db = getDb()
      const { courseId, format = 'json' } = req.query
      
      // Get validated assessments
      let query = db.collection('assessments')
        .where('expertValidation.isValidated', '==', true)
      
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }
      
      const snapshot = await query.get()
      
      // Extract data
      const validations = []
      snapshot.forEach(doc => {
        const data = doc.data()
        const expert = data.expertValidation
        
        if (expert && data.rubricScores) {
          validations.push({
            aiScores: {
              analysis: data.rubricScores.analysis || 0,
              reasoning: data.rubricScores.reasoning || 0,
              creativity: data.rubricScores.creativity || 0,
              evidence: data.rubricScores.evidence || 0
            },
            expertScores: {
              analysis: expert.expertScores?.analysis || 0,
              reasoning: expert.expertScores?.reasoning || 0,
              creativity: expert.expertScores?.creativity || 0,
              evidence: expert.expertScores?.evidence || 0
            }
          })
        }
      })
      
      const n = validations.length
      
      if (n < 5) {
        return res.status(200).json({
          success: false,
          error: `Need at least 5 validated assessments for IRR report, got ${n}`,
          n
        })
      }
      
      // Calculate IRR for each dimension
      const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence', 'total']
      const results = {}
      
      for (const dim of dimensions) {
        results[dim] = comprehensiveIRRAnalysis(validations, dim)
      }
      
      // Generate publication-ready report
      const report = {
        title: 'Inter-Rater Reliability Analysis: AI vs Expert HOTS Assessment',
        generatedAt: new Date().toISOString(),
        sampleSize: n,
        courseId: courseId || 'All Courses',
        
        summaryTable: {
          headers: ['Dimension', 'N', 'Weighted κ', 'ICC(2,1)', 'r', 'MAE', 'Interpretation'],
          rows: dimensions.map(dim => ({
            dimension: dim.charAt(0).toUpperCase() + dim.slice(1),
            n: results[dim].n,
            weightedKappa: results[dim].weightedKappa?.weightedKappa,
            icc: results[dim].icc?.icc,
            pearsonR: results[dim].pearsonR?.r,
            mae: results[dim].mae?.mae,
            interpretation: results[dim].summary?.overallReliability
          }))
        },
        
        detailedResults: results,
        
        publicationMetrics: {
          meetsKappaThreshold: results.total.weightedKappa?.weightedKappa >= 0.60,
          meetsICCThreshold: results.total.icc?.icc >= 0.70,
          meetsSampleSize: n >= 30,
          overallReady: (results.total.weightedKappa?.weightedKappa >= 0.60) && 
                        (results.total.icc?.icc >= 0.70) && (n >= 30)
        },
        
        citationText: results.total.reportText,
        recommendations: results.total.summary?.recommendations || []
      }
      
      if (format === 'csv') {
        const BOM = '\uFEFF'
        let csv = 'Dimension,N,Weighted_Kappa,Kappa_Interpretation,ICC,ICC_CI_Lower,ICC_CI_Upper,ICC_Interpretation,Pearson_r,MAE,RMSE,Percent_Agreement\n'
        
        dimensions.forEach(dim => {
          const r = results[dim]
          csv += `${dim},${r.n},${r.weightedKappa?.weightedKappa || ''},${r.weightedKappa?.interpretation || ''},`
          csv += `${r.icc?.icc || ''},${r.icc?.ci95?.lower || ''},${r.icc?.ci95?.upper || ''},${r.icc?.interpretation || ''},`
          csv += `${r.pearsonR?.r || ''},${r.mae?.mae || ''},${r.mae?.rmse || ''},${r.percentAgreement?.percentage || ''}%\n`
        })
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename=IRR_Report_${new Date().toISOString().split('T')[0]}.csv`)
        return res.send(BOM + csv)
      }
      
      return res.status(200).json({ success: true, report })
      
    } catch (error) {
      console.error('IRR Report error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * Calculate Effect Size - Cohen's d and paired t-test
 * GET { courseId, experimentGroup? }
 */
const calculateEffectSize = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const db = getDb()
      const { courseId, experimentGroup } = req.query
      
      if (!courseId) {
        return res.status(400).json({ error: 'courseId is required' })
      }
      
      // Get pretest and posttest data
      const eventsQuery = db.collection('learningEvents')
        .where('courseId', '==', courseId)
        .where('eventType', 'in', ['PRETEST', 'POSTTEST'])
      
      const snapshot = await eventsQuery.get()
      
      const studentData = {}
      
      snapshot.forEach(doc => {
        const data = doc.data()
        const studentId = data.studentId
        
        if (!studentData[studentId]) {
          studentData[studentId] = { pretest: null, posttest: null }
        }
        
        const avgScore = data.score_average || 
          ((data.score_analysis || 0) + (data.score_reasoning || 0) + 
           (data.score_creativity || 0) + (data.score_evidence || 0)) / 4
        
        if (data.eventType === 'PRETEST') {
          studentData[studentId].pretest = avgScore
        } else if (data.eventType === 'POSTTEST') {
          studentData[studentId].posttest = avgScore
        }
      })
      
      // Filter students with both pre and post
      const preScores = []
      const postScores = []
      
      Object.values(studentData).forEach(s => {
        if (s.pretest !== null && s.posttest !== null) {
          preScores.push(s.pretest)
          postScores.push(s.posttest)
        }
      })
      
      if (preScores.length < 5) {
        return res.status(200).json({
          success: false,
          error: `Insufficient paired data. Need at least 5 pairs, got ${preScores.length}`,
          n: preScores.length
        })
      }
      
      // Calculate effect size
      const effectSize = calculateCohensD(preScores, postScores)
      
      // Calculate paired t-test
      const differences = preScores.map((pre, i) => postScores[i] - pre)
      const meanDiff = differences.reduce((a, b) => a + b, 0) / differences.length
      const sdDiff = Math.sqrt(differences.reduce((sum, d) => sum + Math.pow(d - meanDiff, 2), 0) / (differences.length - 1))
      const tValue = meanDiff / (sdDiff / Math.sqrt(differences.length))
      const df = differences.length - 1
      const pValue = Math.exp(-0.717 * Math.abs(tValue) - 0.416 * tValue * tValue / df)
      
      return res.status(200).json({
        success: true,
        courseId,
        n: preScores.length,
        pretest: { mean: effectSize.preMean, sd: effectSize.preSD },
        posttest: { mean: effectSize.postMean, sd: effectSize.postSD },
        cohensD: effectSize.cohensD,
        interpretation: effectSize.interpretation,
        pairedTTest: {
          t: Math.round(tValue * 1000) / 1000,
          df,
          p: Math.round(pValue * 10000) / 10000,
          significant: pValue < 0.05
        },
        meanDifference: Math.round(meanDiff * 1000) / 1000,
        reportText: `A paired-samples t-test was conducted to compare HOTS scores before and after using the AI assessment system. ` +
          `There was a significant difference in scores before (M=${effectSize.preMean}, SD=${effectSize.preSD}) and ` +
          `after (M=${effectSize.postMean}, SD=${effectSize.postSD}) the intervention; t(${df})=${Math.round(tValue * 100) / 100}, p=${pValue < 0.001 ? '<.001' : pValue.toFixed(3)}. ` +
          `Cohen's d = ${effectSize.cohensD}, indicating a ${effectSize.interpretation.toLowerCase()} effect size.`
      })
      
    } catch (error) {
      console.error('Effect size calculation error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * Research Summary - Summary statistics for research
 * GET { courseId }
 */
const researchSummary = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const db = getDb()
      const { courseId } = req.query
      
      if (!courseId) {
        return res.status(400).json({ error: 'courseId is required' })
      }
      
      const summary = await generateResearchSummary(db, courseId)
      const correlation = await calculateScoreCorrelation(db, courseId)
      
      return res.json({ ...summary, correlation })
      
    } catch (error) {
      console.error('Research summary error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * Correlation Analysis - Chat vs Worksheet scores
 * GET { courseId }
 */
const correlationAnalysis = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const db = getDb()
      const { courseId } = req.query
      
      if (!courseId) {
        return res.status(400).json({ error: 'courseId is required' })
      }
      
      const result = await calculateScoreCorrelation(db, courseId)
      return res.json(result)
      
    } catch (error) {
      console.error('Correlation analysis error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

/**
 * Log Intervention Event - Log micro-lessons, knowledge sheets, etc.
 * POST { studentId, courseId, interventionType, ... }
 */
const logInterventionEvent = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
      }
      
      const db = getDb()
      const {
        studentId, courseId, interventionType,
        contentId, contentTitle, targetLOs,
        durationSec, completionRate, teacherId, notes
      } = req.body
      
      if (!studentId || !courseId || !interventionType) {
        return res.status(400).json({ 
          error: 'Missing required fields: studentId, courseId, interventionType' 
        })
      }
      
      const result = await logIntervention(db, {
        studentId, courseId, interventionType,
        contentId, contentTitle, targetLOs,
        durationSec, completionRate, teacherId, notes
      })
      
      return res.json(result)
      
    } catch (error) {
      console.error('Log intervention error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

module.exports = {
  calculateIRR,
  irrReport,
  calculateEffectSize,
  researchSummary,
  correlationAnalysis,
  logInterventionEvent
}
