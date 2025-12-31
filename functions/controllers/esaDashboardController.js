/**
 * ESA Dashboard Controller
 * จัดการ Educational Service Area (ESA) Dashboard APIs
 * 
 * Phase 6: National Scale - ESA Integration
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })
const { ESADashboardEngine, PERFORMANCE_BENCHMARKS } = require('../utils/esaExecutiveDashboard')

const getDb = () => admin.firestore()

/**
 * Get ESA Dashboard Overview
 * POST /getESADashboard
 */
exports.getESADashboard = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { esaId, startDate, endDate, includeSchoolDetails } = 
        req.method === 'GET' ? req.query : req.body
      const db = getDb()

      if (!esaId) {
        return res.status(400).send({ error: 'esaId required' })
      }

      // Use ESA Dashboard Engine
      const engine = new ESADashboardEngine(db)
      const result = await engine.generateDashboard(esaId, {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        includeSchoolDetails: includeSchoolDetails !== false
      })

      if (!result.success) {
        return res.status(404).send({ success: false, error: result.error })
      }

      res.status(200).send({
        success: true,
        dashboard: result.dashboard
      })
    } catch (error) {
      console.error('Error generating ESA dashboard:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Get ESA School List
 * GET /getESASchools
 */
exports.getESASchools = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { esaId } = req.method === 'GET' ? req.query : req.body
      const db = getDb()

      if (!esaId) {
        return res.status(400).send({ error: 'esaId required' })
      }

      const schoolsSnap = await db.collection('schools')
        .where('esaId', '==', esaId)
        .orderBy('name', 'asc')
        .get()

      const schools = []
      for (const doc of schoolsSnap.docs) {
        const school = doc.data()
        
        // Get student count
        const studentsSnap = await db.collection('users')
          .where('schoolId', '==', doc.id)
          .where('role', '==', 'student')
          .count()
          .get()
        
        // Get teacher count
        const teachersSnap = await db.collection('users')
          .where('schoolId', '==', doc.id)
          .where('role', '==', 'teacher')
          .count()
          .get()

        schools.push({
          id: doc.id,
          name: school.name,
          code: school.code,
          address: school.address,
          district: school.district,
          province: school.province,
          studentCount: studentsSnap.data().count,
          teacherCount: teachersSnap.data().count,
          status: school.status || 'active',
          lastActivity: school.lastActivity?.toDate?.() || null
        })
      }

      res.status(200).send({
        success: true,
        schools,
        total: schools.length
      })
    } catch (error) {
      console.error('Error getting ESA schools:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Get ESA HOTS Gap Analysis
 * POST /getESAHOTSGap
 */
exports.getESAHOTSGap = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { esaId, dimension, gradeLevel } = req.body
      const db = getDb()

      if (!esaId) {
        return res.status(400).send({ error: 'esaId required' })
      }

      // Get schools in ESA
      const schoolsSnap = await db.collection('schools')
        .where('esaId', '==', esaId)
        .get()

      const schoolIds = schoolsSnap.docs.map(d => d.id)
      if (schoolIds.length === 0) {
        return res.status(404).send({ error: 'No schools found in this ESA' })
      }

      // Get assessments for analysis
      const gapData = []
      
      for (const schoolDoc of schoolsSnap.docs) {
        const schoolId = schoolDoc.id
        const schoolName = schoolDoc.data().name

        // Get assessments for this school
        let query = db.collection('assessments')
          .where('schoolId', '==', schoolId)
          .orderBy('createdAt', 'desc')
          .limit(500)

        const assessmentsSnap = await query.get()

        if (assessmentsSnap.empty) continue

        // Calculate averages
        const dimensions = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
        let count = 0

        assessmentsSnap.forEach(doc => {
          const data = doc.data()
          const scores = data.rubricScores || {}
          
          if (gradeLevel && data.grade !== gradeLevel) return

          dimensions.analysis += scores.analysis || 0
          dimensions.reasoning += scores.reasoning || 0
          dimensions.creativity += scores.creativity || 0
          dimensions.evidence += scores.evidence || 0
          count++
        })

        if (count > 0) {
          const avgScores = {
            analysis: dimensions.analysis / count,
            reasoning: dimensions.reasoning / count,
            creativity: dimensions.creativity / count,
            evidence: dimensions.evidence / count
          }

          const totalAvg = (avgScores.analysis + avgScores.reasoning + 
                          avgScores.creativity + avgScores.evidence) / 4

          // Find performance level
          let performanceLevel = 'critical'
          const total = avgScores.analysis + avgScores.reasoning + 
                       avgScores.creativity + avgScores.evidence
          
          for (const [level, benchmark] of Object.entries(PERFORMANCE_BENCHMARKS)) {
            if (total >= benchmark.min && total <= benchmark.max) {
              performanceLevel = level
              break
            }
          }

          // Find weakest dimension
          const weakestDim = Object.entries(avgScores)
            .sort((a, b) => a[1] - b[1])[0]

          gapData.push({
            schoolId,
            schoolName,
            avgScores,
            totalAvg: Math.round(totalAvg * 100) / 100,
            totalScore: Math.round(total * 100) / 100,
            performanceLevel,
            weakestDimension: weakestDim[0],
            assessmentCount: count,
            gap: {
              toGood: Math.max(0, 12 - total),
              toExcellent: Math.max(0, 16 - total)
            }
          })
        }
      }

      // Sort by total score (ascending = biggest gaps first)
      gapData.sort((a, b) => a.totalScore - b.totalScore)

      // Calculate ESA-wide averages
      const esaAverage = gapData.length > 0 ? {
        analysis: gapData.reduce((s, d) => s + d.avgScores.analysis, 0) / gapData.length,
        reasoning: gapData.reduce((s, d) => s + d.avgScores.reasoning, 0) / gapData.length,
        creativity: gapData.reduce((s, d) => s + d.avgScores.creativity, 0) / gapData.length,
        evidence: gapData.reduce((s, d) => s + d.avgScores.evidence, 0) / gapData.length
      } : null

      res.status(200).send({
        success: true,
        gapAnalysis: {
          schools: gapData,
          esaAverage,
          schoolsAnalyzed: gapData.length,
          benchmarks: PERFORMANCE_BENCHMARKS,
          recommendations: generateGapRecommendations(gapData, esaAverage)
        }
      })
    } catch (error) {
      console.error('Error getting ESA HOTS gap:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Get ESA Equity Report
 * POST /getESAEquityReport
 */
exports.getESAEquityReport = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { esaId, groupBy = 'school' } = req.body
      const db = getDb()

      if (!esaId) {
        return res.status(400).send({ error: 'esaId required' })
      }

      // Get all assessments from ESA schools
      const schoolsSnap = await db.collection('schools')
        .where('esaId', '==', esaId)
        .get()

      const schoolIds = schoolsSnap.docs.map(d => d.id)
      const schoolMap = {}
      schoolsSnap.docs.forEach(d => {
        schoolMap[d.id] = d.data()
      })

      // Collect all assessments
      const allData = []
      
      for (let i = 0; i < schoolIds.length; i += 10) {
        const batchIds = schoolIds.slice(i, i + 10)
        const assessmentsSnap = await db.collection('assessments')
          .where('schoolId', 'in', batchIds)
          .orderBy('createdAt', 'desc')
          .limit(1000)
          .get()

        assessmentsSnap.forEach(doc => {
          const data = doc.data()
          const scores = data.rubricScores || {}
          const total = (scores.analysis || 0) + (scores.reasoning || 0) +
                       (scores.creativity || 0) + (scores.evidence || 0)

          allData.push({
            schoolId: data.schoolId,
            schoolName: schoolMap[data.schoolId]?.name || 'Unknown',
            grade: data.grade,
            totalScore: total,
            ...scores
          })
        })
      }

      // Calculate equity metrics
      const groups = {}
      const groupKey = groupBy === 'grade' ? 'grade' : 'schoolId'

      allData.forEach(d => {
        const key = d[groupKey] || 'unknown'
        if (!groups[key]) {
          groups[key] = {
            name: groupBy === 'grade' ? `ม.${d.grade}` : d.schoolName,
            scores: [],
            count: 0
          }
        }
        groups[key].scores.push(d.totalScore)
        groups[key].count++
      })

      // Calculate statistics per group
      const groupStats = Object.entries(groups).map(([key, group]) => {
        const scores = group.scores
        const n = scores.length
        const mean = scores.reduce((a, b) => a + b, 0) / n
        const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n
        const std = Math.sqrt(variance)

        return {
          id: key,
          name: group.name,
          count: n,
          mean: Math.round(mean * 100) / 100,
          std: Math.round(std * 100) / 100,
          min: Math.min(...scores),
          max: Math.max(...scores)
        }
      })

      // Calculate equity index (coefficient of variation between groups)
      const groupMeans = groupStats.map(g => g.mean)
      const overallMean = groupMeans.reduce((a, b) => a + b, 0) / groupMeans.length
      const betweenGroupVar = groupMeans.reduce((a, m) => a + Math.pow(m - overallMean, 2), 0) / groupMeans.length
      const equityIndex = 1 - (Math.sqrt(betweenGroupVar) / (overallMean || 1))

      // Find highest and lowest performing groups
      groupStats.sort((a, b) => b.mean - a.mean)
      const highestGroup = groupStats[0]
      const lowestGroup = groupStats[groupStats.length - 1]
      const gap = highestGroup.mean - lowestGroup.mean

      res.status(200).send({
        success: true,
        equityReport: {
          esaId,
          groupBy,
          overallMean: Math.round(overallMean * 100) / 100,
          equityIndex: Math.round(equityIndex * 100) / 100,
          gap: Math.round(gap * 100) / 100,
          highestGroup: {
            name: highestGroup.name,
            mean: highestGroup.mean
          },
          lowestGroup: {
            name: lowestGroup.name,
            mean: lowestGroup.mean
          },
          groups: groupStats,
          interpretation: interpretEquityIndex(equityIndex),
          recommendations: generateEquityRecommendations(gap, lowestGroup, equityIndex)
        }
      })
    } catch (error) {
      console.error('Error getting ESA equity report:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Get ESA Resource Allocation Recommendations
 * POST /getESAResourceRecommendations
 */
exports.getESAResourceRecommendations = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { esaId, budget } = req.body
      const db = getDb()

      if (!esaId) {
        return res.status(400).send({ error: 'esaId required' })
      }

      // Get school performance data
      const schoolsSnap = await db.collection('schools')
        .where('esaId', '==', esaId)
        .get()

      const recommendations = []

      for (const schoolDoc of schoolsSnap.docs) {
        const school = schoolDoc.data()
        const schoolId = schoolDoc.id

        // Get recent assessment stats
        const assessmentsSnap = await db.collection('assessments')
          .where('schoolId', '==', schoolId)
          .orderBy('createdAt', 'desc')
          .limit(100)
          .get()

        if (assessmentsSnap.empty) {
          recommendations.push({
            schoolId,
            schoolName: school.name,
            priority: 'high',
            reason: 'ยังไม่มีการประเมิน',
            actions: ['จัดอบรมครูการใช้งานระบบ', 'สนับสนุนอุปกรณ์เทคโนโลยี']
          })
          continue
        }

        // Calculate average scores
        let total = 0
        let count = 0
        const dimensions = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }

        assessmentsSnap.forEach(doc => {
          const scores = doc.data().rubricScores || {}
          dimensions.analysis += scores.analysis || 0
          dimensions.reasoning += scores.reasoning || 0
          dimensions.creativity += scores.creativity || 0
          dimensions.evidence += scores.evidence || 0
          total += (scores.analysis || 0) + (scores.reasoning || 0) +
                  (scores.creativity || 0) + (scores.evidence || 0)
          count++
        })

        const avgTotal = total / count
        const avgDimensions = {
          analysis: dimensions.analysis / count,
          reasoning: dimensions.reasoning / count,
          creativity: dimensions.creativity / count,
          evidence: dimensions.evidence / count
        }

        // Find weakest dimension
        const weakest = Object.entries(avgDimensions)
          .sort((a, b) => a[1] - b[1])[0]

        // Determine priority and actions
        let priority = 'low'
        const actions = []

        if (avgTotal < 8) {
          priority = 'critical'
          actions.push('จัดโปรแกรมพัฒนาเข้มข้น')
          actions.push('จัดสรรครูพี่เลี้ยง')
        } else if (avgTotal < 12) {
          priority = 'high'
          actions.push('อบรมเชิงปฏิบัติการ')
        } else if (avgTotal < 16) {
          priority = 'medium'
        }

        // Add dimension-specific recommendations
        const dimensionNames = {
          analysis: 'การวิเคราะห์',
          reasoning: 'การให้เหตุผล',
          creativity: 'ความคิดสร้างสรรค์',
          evidence: 'การใช้หลักฐาน'
        }

        if (weakest[1] < 2.5) {
          actions.push(`พัฒนาทักษะ${dimensionNames[weakest[0]]}เป็นพิเศษ`)
        }

        recommendations.push({
          schoolId,
          schoolName: school.name,
          avgScore: Math.round(avgTotal * 100) / 100,
          weakestDimension: weakest[0],
          priority,
          actions,
          assessmentCount: count
        })
      }

      // Sort by priority
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      recommendations.sort((a, b) => {
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
        if (pDiff !== 0) return pDiff
        return a.avgScore - b.avgScore
      })

      // Calculate budget allocation if provided
      let budgetAllocation = null
      if (budget) {
        const criticalCount = recommendations.filter(r => r.priority === 'critical').length
        const highCount = recommendations.filter(r => r.priority === 'high').length
        const mediumCount = recommendations.filter(r => r.priority === 'medium').length
        
        const weights = {
          critical: 0.5,
          high: 0.3,
          medium: 0.15,
          low: 0.05
        }

        budgetAllocation = recommendations.map(r => ({
          schoolId: r.schoolId,
          schoolName: r.schoolName,
          allocation: Math.round(budget * weights[r.priority] / 
            (recommendations.filter(x => x.priority === r.priority).length || 1))
        }))
      }

      res.status(200).send({
        success: true,
        recommendations,
        budgetAllocation,
        summary: {
          critical: recommendations.filter(r => r.priority === 'critical').length,
          high: recommendations.filter(r => r.priority === 'high').length,
          medium: recommendations.filter(r => r.priority === 'medium').length,
          low: recommendations.filter(r => r.priority === 'low').length
        }
      })
    } catch (error) {
      console.error('Error getting ESA resource recommendations:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

// ============ Helper Functions ============

function generateGapRecommendations(gapData, esaAverage) {
  const recommendations = []
  
  // Find schools needing urgent support
  const criticalSchools = gapData.filter(s => s.performanceLevel === 'critical')
  if (criticalSchools.length > 0) {
    recommendations.push({
      priority: 'urgent',
      target: `${criticalSchools.length} โรงเรียน`,
      action: 'จัดโปรแกรมพัฒนาเร่งด่วน',
      schools: criticalSchools.map(s => s.schoolName)
    })
  }

  // Find common weak dimension
  if (esaAverage) {
    const weakestDim = Object.entries(esaAverage)
      .sort((a, b) => a[1] - b[1])[0]
    
    const dimNames = {
      analysis: 'การวิเคราะห์',
      reasoning: 'การให้เหตุผล',
      creativity: 'ความคิดสร้างสรรค์',
      evidence: 'การใช้หลักฐาน'
    }

    recommendations.push({
      priority: 'high',
      target: 'ทุกโรงเรียน',
      action: `จัดอบรมเน้นทักษะ${dimNames[weakestDim[0]]}`,
      reason: `คะแนนเฉลี่ย ${Math.round(weakestDim[1] * 100) / 100}/5 ต่ำที่สุด`
    })
  }

  return recommendations
}

function interpretEquityIndex(index) {
  if (index >= 0.9) return { level: 'excellent', text: 'ความเท่าเทียมสูงมาก' }
  if (index >= 0.8) return { level: 'good', text: 'ความเท่าเทียมดี' }
  if (index >= 0.7) return { level: 'fair', text: 'ความเท่าเทียมปานกลาง' }
  if (index >= 0.6) return { level: 'low', text: 'ความเท่าเทียมต่ำ' }
  return { level: 'critical', text: 'ต้องปรับปรุงความเท่าเทียมอย่างเร่งด่วน' }
}

function generateEquityRecommendations(gap, lowestGroup, equityIndex) {
  const recommendations = []

  if (gap > 5) {
    recommendations.push({
      priority: 'urgent',
      action: 'ลดช่องว่างระหว่างกลุ่ม',
      target: lowestGroup.name,
      detail: `ช่องว่าง ${gap.toFixed(1)} คะแนน ต้องการการสนับสนุนพิเศษ`
    })
  }

  if (equityIndex < 0.7) {
    recommendations.push({
      priority: 'high',
      action: 'เพิ่มการสนับสนุนกลุ่มที่ตามหลัง',
      detail: 'จัดสรรทรัพยากรตามความต้องการ ไม่ใช่เท่ากัน'
    })
  }

  return recommendations
}
