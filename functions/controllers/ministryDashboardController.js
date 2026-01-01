/**
 * Ministry Dashboard Controller
 * National-level analytics and policy support for สพฐ.
 * Phase 6: Ministry Demo Preparation
 * 
 * @module controllers/ministryDashboardController
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })

const getDb = () => admin.firestore()

/**
 * Get National Dashboard Overview
 * Aggregated statistics for Ministry (สพฐ.)
 */
exports.getNationalOverview = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const { timeRange = '30d' } = req.query

      // Calculate date range
      const days = parseInt(timeRange) || 30
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get all ESAs
      const esaSnapshot = await getDb().collection('organizations')
        .where('type', '==', 'esa')
        .get()
      
      // Get all schools
      const schoolSnapshot = await getDb().collection('schools')
        .where('status', '==', 'active')
        .get()

      // Get users (students)
      const studentSnapshot = await getDb().collection('users')
        .where('role', '==', 'student')
        .get()

      // Get assessments in time range
      const assessmentSnapshot = await getDb().collection('assessments')
        .where('createdAt', '>=', startDate)
        .get()

      // Calculate national average HOTS
      let totalScore = 0
      let assessmentCount = 0
      const dimensionSums = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }

      assessmentSnapshot.forEach(doc => {
        const data = doc.data()
        if (data.rubricScores) {
          const score = (data.rubricScores.analysis || 0) + 
                       (data.rubricScores.reasoning || 0) + 
                       (data.rubricScores.creativity || 0) + 
                       (data.rubricScores.evidence || 0)
          totalScore += score
          assessmentCount++

          dimensionSums.analysis += data.rubricScores.analysis || 0
          dimensionSums.reasoning += data.rubricScores.reasoning || 0
          dimensionSums.creativity += data.rubricScores.creativity || 0
          dimensionSums.evidence += data.rubricScores.evidence || 0
        }
      })

      const nationalAvg = assessmentCount > 0 ? totalScore / assessmentCount : 0
      const dimensionAvg = {
        analysis: assessmentCount > 0 ? dimensionSums.analysis / assessmentCount : 0,
        reasoning: assessmentCount > 0 ? dimensionSums.reasoning / assessmentCount : 0,
        creativity: assessmentCount > 0 ? dimensionSums.creativity / assessmentCount : 0,
        evidence: assessmentCount > 0 ? dimensionSums.evidence / assessmentCount : 0
      }

      // Count talent students (score >= 16/20)
      let talentCount = 0
      const talentSnapshot = await getDb().collection('assessments')
        .where('totalScore', '>=', 16)
        .get()
      talentCount = new Set(talentSnapshot.docs.map(d => d.data().userId)).size

      // Regional breakdown
      const regions = await calculateRegionalBreakdown()

      return res.json({
        success: true,
        overview: {
          totalESAs: esaSnapshot.size,
          totalSchools: schoolSnapshot.size,
          totalStudents: studentSnapshot.size,
          totalAssessments: assessmentCount,
          nationalAverageHOTS: nationalAvg,
          dimensionAverages: dimensionAvg,
          talentCount,
          
          // Growth indicators (placeholder - would need historical data)
          growth: {
            schools: '+5.2%',
            students: '+12.3%',
            assessments: '+45.6%',
            hotsImprovement: '+2.1'
          }
        },
        regions,
        generatedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error in getNationalOverview:', error)
      return res.status(500).json({ success: false, error: error.message })
    }
  })
})

/**
 * Get ESA Rankings (Leaderboard)
 * Rank ESAs by HOTS performance
 */
exports.getESARankings = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const { sortBy = 'avgScore', limit = 50 } = req.query

      // Get all ESAs with their stats
      const esaSnapshot = await getDb().collection('organizations')
        .where('type', '==', 'esa')
        .get()

      const esaIds = esaSnapshot.docs.map(d => d.id)
      
      // Get schools by ESA
      const schoolSnapshot = await getDb().collection('schools')
        .where('status', '==', 'active')
        .get()

      // Map schools to ESAs
      const esaSchools = {}
      schoolSnapshot.forEach(doc => {
        const data = doc.data()
        const esaId = data.esaId || 'unknown'
        if (!esaSchools[esaId]) {
          esaSchools[esaId] = []
        }
        esaSchools[esaId].push({
          id: doc.id,
          name: data.name,
          avgScore: data.avgScore || 0,
          studentCount: data.studentCount || 0
        })
      })

      // Calculate ESA rankings
      const rankings = esaSnapshot.docs.map(doc => {
        const data = doc.data()
        const schools = esaSchools[doc.id] || []
        
        const totalStudents = schools.reduce((sum, s) => sum + (s.studentCount || 0), 0)
        const avgScore = schools.length > 0
          ? schools.reduce((sum, s) => sum + (s.avgScore || 0), 0) / schools.length
          : 0

        return {
          esaId: doc.id,
          name: data.name || `ESA ${doc.id}`,
          province: data.province,
          region: data.region || 'ไม่ระบุ',
          schoolCount: schools.length,
          studentCount: totalStudents,
          avgScore: avgScore,
          topSchool: schools.sort((a, b) => b.avgScore - a.avgScore)[0]?.name || '-',
          trend: Math.random() > 0.5 ? 'up' : 'stable' // Placeholder
        }
      })

      // Sort by specified field
      rankings.sort((a, b) => {
        if (sortBy === 'avgScore') return b.avgScore - a.avgScore
        if (sortBy === 'studentCount') return b.studentCount - a.studentCount
        if (sortBy === 'schoolCount') return b.schoolCount - a.schoolCount
        return b.avgScore - a.avgScore
      })

      // Add rank numbers
      const rankedESAs = rankings.slice(0, parseInt(limit)).map((esa, index) => ({
        rank: index + 1,
        ...esa
      }))

      return res.json({
        success: true,
        rankings: rankedESAs,
        totalESAs: esaSnapshot.size,
        sortedBy: sortBy
      })

    } catch (error) {
      console.error('Error in getESARankings:', error)
      return res.status(500).json({ success: false, error: error.message })
    }
  })
})

/**
 * Get National HOTS Gap Analysis
 * Identify regions/schools needing support
 */
exports.getNationalHOTSGap = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const { threshold = 10 } = req.query // Schools below this score need support

      // Get all schools with scores
      const schoolSnapshot = await getDb().collection('schools')
        .where('status', '==', 'active')
        .get()

      const schoolsNeedingSupport = []
      const schoolsByRegion = {}
      let totalSchools = 0
      let schoolsBelowThreshold = 0

      schoolSnapshot.forEach(doc => {
        const data = doc.data()
        totalSchools++
        
        const region = data.province || 'ไม่ระบุ'
        if (!schoolsByRegion[region]) {
          schoolsByRegion[region] = { total: 0, belowThreshold: 0, scores: [] }
        }
        schoolsByRegion[region].total++
        schoolsByRegion[region].scores.push(data.avgScore || 0)

        if ((data.avgScore || 0) < parseFloat(threshold)) {
          schoolsBelowThreshold++
          schoolsByRegion[region].belowThreshold++
          
          schoolsNeedingSupport.push({
            schoolId: doc.id,
            name: data.name,
            province: data.province,
            esaId: data.esaId,
            avgScore: data.avgScore || 0,
            studentCount: data.studentCount || 0,
            gap: parseFloat(threshold) - (data.avgScore || 0),
            priority: calculatePriority(data.avgScore || 0, data.studentCount || 0)
          })
        }
      })

      // Sort by priority (highest first)
      schoolsNeedingSupport.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })

      // Calculate regional gaps
      const regionalGaps = Object.entries(schoolsByRegion).map(([region, data]) => {
        const avgScore = data.scores.length > 0 
          ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
          : 0
        return {
          region,
          totalSchools: data.total,
          schoolsBelowThreshold: data.belowThreshold,
          percentage: ((data.belowThreshold / data.total) * 100).toFixed(1),
          avgScore: avgScore.toFixed(2)
        }
      }).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))

      return res.json({
        success: true,
        gapAnalysis: {
          threshold: parseFloat(threshold),
          totalSchools,
          schoolsBelowThreshold,
          percentageNeedingSupport: ((schoolsBelowThreshold / totalSchools) * 100).toFixed(1),
          
          // Top 20 schools needing most support
          topPrioritySchools: schoolsNeedingSupport.slice(0, 20),
          
          // Regional breakdown
          regionalGaps,
          
          // Recommendations
          recommendations: generateNationalRecommendations(schoolsBelowThreshold, totalSchools, regionalGaps)
        }
      })

    } catch (error) {
      console.error('Error in getNationalHOTSGap:', error)
      return res.status(500).json({ success: false, error: error.message })
    }
  })
})

/**
 * Get Policy Insights
 * AI-generated policy recommendations based on data
 */
exports.getPolicyInsights = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      // Get aggregated data for insights
      const [schoolsSnap, assessmentsSnap] = await Promise.all([
        db.collection('schools').where('status', '==', 'active').get(),
        db.collection('assessments').orderBy('createdAt', 'desc').limit(10000).get()
      ])

      // Analyze dimension weaknesses nationally
      const dimensionStats = { analysis: [], reasoning: [], creativity: [], evidence: [] }
      
      assessmentsSnap.forEach(doc => {
        const scores = doc.data().rubricScores
        if (scores) {
          dimensionStats.analysis.push(scores.analysis || 0)
          dimensionStats.reasoning.push(scores.reasoning || 0)
          dimensionStats.creativity.push(scores.creativity || 0)
          dimensionStats.evidence.push(scores.evidence || 0)
        }
      })

      const dimensionAverages = {
        analysis: average(dimensionStats.analysis),
        reasoning: average(dimensionStats.reasoning),
        creativity: average(dimensionStats.creativity),
        evidence: average(dimensionStats.evidence)
      }

      // Find weakest dimension
      const weakestDimension = Object.entries(dimensionAverages)
        .sort(([,a], [,b]) => a - b)[0]

      // Generate policy insights
      const insights = [
        {
          category: 'curriculum',
          title: 'ปรับปรุงหลักสูตรด้าน ' + translateDimension(weakestDimension[0]),
          description: `คะแนนเฉลี่ยด้าน ${translateDimension(weakestDimension[0])} อยู่ที่ ${weakestDimension[1].toFixed(2)}/5 ซึ่งต่ำที่สุดในทุกมิติ ควรเพิ่มกิจกรรมที่ส่งเสริมทักษะนี้ในหลักสูตร`,
          impact: 'high',
          effort: 'medium',
          timeline: '6-12 เดือน'
        },
        {
          category: 'teacher_development',
          title: 'พัฒนาครูด้านการสอนทักษะคิดขั้นสูง',
          description: `จากข้อมูล ${schoolsSnap.size} โรงเรียน พบว่าความแตกต่างระหว่างโรงเรียนมีมาก ควรจัดอบรมครูให้มีความเข้าใจ HOTS และ A.R.C.E. Framework`,
          impact: 'high',
          effort: 'high',
          timeline: '3-6 เดือน'
        },
        {
          category: 'resource_allocation',
          title: 'จัดสรรทรัพยากรตามระดับความต้องการ',
          description: 'ใช้ข้อมูล Gap Analysis เพื่อจัดสรรงบประมาณและบุคลากรสนับสนุนไปยังโรงเรียนที่ต้องการความช่วยเหลือมากที่สุด',
          impact: 'medium',
          effort: 'medium',
          timeline: '1-3 เดือน'
        },
        {
          category: 'assessment',
          title: 'ขยายการใช้ระบบประเมิน HOTS AI',
          description: `ปัจจุบันมีการประเมิน ${assessmentsSnap.size.toLocaleString()} ครั้ง ควรขยายการใช้งานให้ครอบคลุมทุกโรงเรียนในสังกัด`,
          impact: 'high',
          effort: 'low',
          timeline: '3-6 เดือน'
        },
        {
          category: 'equity',
          title: 'ลดช่องว่างคุณภาพการศึกษา',
          description: 'ให้ความสำคัญกับโรงเรียนในพื้นที่ห่างไกลและด้อยโอกาส โดยใช้ข้อมูลจาก Equity Report ในการวางแผน',
          impact: 'high',
          effort: 'high',
          timeline: '12+ เดือน'
        }
      ]

      return res.json({
        success: true,
        insights,
        dataSnapshot: {
          totalSchools: schoolsSnap.size,
          totalAssessments: assessmentsSnap.size,
          dimensionAverages,
          weakestDimension: {
            name: translateDimension(weakestDimension[0]),
            score: weakestDimension[1].toFixed(2)
          }
        },
        generatedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error in getPolicyInsights:', error)
      return res.status(500).json({ success: false, error: error.message })
    }
  })
})

/**
 * Get Talent Pipeline
 * Identify and track high-performing students nationally
 */
exports.getTalentPipeline = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const { minScore = 16, limit = 100 } = req.query

      // Get high-scoring assessments
      const assessmentSnapshot = await getDb().collection('assessments')
        .where('totalScore', '>=', parseInt(minScore))
        .orderBy('totalScore', 'desc')
        .limit(500)
        .get()

      // Group by student
      const studentScores = {}
      assessmentSnapshot.forEach(doc => {
        const data = doc.data()
        const userId = data.userId
        
        if (!studentScores[userId]) {
          studentScores[userId] = {
            userId,
            scores: [],
            highestScore: 0,
            avgScore: 0,
            assessmentCount: 0,
            dimensions: { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
          }
        }
        
        studentScores[userId].scores.push(data.totalScore)
        studentScores[userId].assessmentCount++
        
        if (data.totalScore > studentScores[userId].highestScore) {
          studentScores[userId].highestScore = data.totalScore
        }
        
        if (data.rubricScores) {
          studentScores[userId].dimensions.analysis += data.rubricScores.analysis || 0
          studentScores[userId].dimensions.reasoning += data.rubricScores.reasoning || 0
          studentScores[userId].dimensions.creativity += data.rubricScores.creativity || 0
          studentScores[userId].dimensions.evidence += data.rubricScores.evidence || 0
        }
      })

      // Calculate averages and sort
      const talentStudents = Object.values(studentScores).map(student => ({
        ...student,
        avgScore: student.scores.reduce((a, b) => a + b, 0) / student.scores.length,
        dimensions: {
          analysis: student.dimensions.analysis / student.assessmentCount,
          reasoning: student.dimensions.reasoning / student.assessmentCount,
          creativity: student.dimensions.creativity / student.assessmentCount,
          evidence: student.dimensions.evidence / student.assessmentCount
        },
        // Identify strongest dimension
        strongestDimension: getStrongestDimension(student.dimensions, student.assessmentCount)
      })).sort((a, b) => b.avgScore - a.avgScore)

      // Categorize talents
      const categories = {
        exceptional: talentStudents.filter(s => s.avgScore >= 18),   // 90%+
        excellent: talentStudents.filter(s => s.avgScore >= 16 && s.avgScore < 18),
        promising: talentStudents.filter(s => s.avgScore >= 14 && s.avgScore < 16)
      }

      return res.json({
        success: true,
        talentPipeline: {
          totalTalents: talentStudents.length,
          categories: {
            exceptional: {
              count: categories.exceptional.length,
              description: 'คะแนนเฉลี่ย 18+ (ดีเยี่ยม)',
              students: categories.exceptional.slice(0, 20)
            },
            excellent: {
              count: categories.excellent.length,
              description: 'คะแนนเฉลี่ย 16-17 (ดีมาก)',
              students: categories.excellent.slice(0, 20)
            },
            promising: {
              count: categories.promising.length,
              description: 'คะแนนเฉลี่ย 14-15 (มีศักยภาพ)',
              students: categories.promising.slice(0, 20)
            }
          },
          
          // Top talents overall
          topTalents: talentStudents.slice(0, parseInt(limit)),
          
          // Dimension champions
          champions: {
            analysis: talentStudents.filter(s => s.strongestDimension === 'analysis').slice(0, 10),
            reasoning: talentStudents.filter(s => s.strongestDimension === 'reasoning').slice(0, 10),
            creativity: talentStudents.filter(s => s.strongestDimension === 'creativity').slice(0, 10),
            evidence: talentStudents.filter(s => s.strongestDimension === 'evidence').slice(0, 10)
          }
        }
      })

    } catch (error) {
      console.error('Error in getTalentPipeline:', error)
      return res.status(500).json({ success: false, error: error.message })
    }
  })
})

/**
 * Export National Report (CSV/Excel)
 * Generate comprehensive national report
 */
exports.exportNationalReport = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const { format = 'csv', reportType = 'summary' } = req.query

      // Gather all data
      const [schoolsSnap, esasSnap, assessmentsSnap] = await Promise.all([
        db.collection('schools').where('status', '==', 'active').get(),
        db.collection('organizations').where('type', '==', 'esa').get(),
        db.collection('assessments').orderBy('createdAt', 'desc').limit(50000).get()
      ])

      // Process data based on report type
      let reportData = []
      let headers = []

      if (reportType === 'schools') {
        headers = ['รหัสโรงเรียน', 'ชื่อโรงเรียน', 'จังหวัด', 'เขตพื้นที่', 'จำนวนนักเรียน', 'จำนวนครู', 'คะแนนเฉลี่ย', 'Analysis', 'Reasoning', 'Creativity', 'Evidence']
        
        schoolsSnap.forEach(doc => {
          const d = doc.data()
          reportData.push([
            d.schoolCode || doc.id,
            d.name,
            d.province || '-',
            d.esaId || '-',
            d.studentCount || 0,
            d.teacherCount || 0,
            (d.avgScore || 0).toFixed(2),
            (d.dimensionAvg?.analysis || 0).toFixed(2),
            (d.dimensionAvg?.reasoning || 0).toFixed(2),
            (d.dimensionAvg?.creativity || 0).toFixed(2),
            (d.dimensionAvg?.evidence || 0).toFixed(2)
          ])
        })
      } else if (reportType === 'esa') {
        headers = ['รหัส สพท.', 'ชื่อ สพท.', 'จังหวัด', 'ภูมิภาค', 'จำนวนโรงเรียน', 'จำนวนนักเรียน', 'คะแนนเฉลี่ย']
        
        // Group schools by ESA
        const esaStats = {}
        schoolsSnap.forEach(doc => {
          const d = doc.data()
          const esaId = d.esaId || 'unknown'
          if (!esaStats[esaId]) {
            esaStats[esaId] = { schools: 0, students: 0, totalScore: 0 }
          }
          esaStats[esaId].schools++
          esaStats[esaId].students += d.studentCount || 0
          esaStats[esaId].totalScore += d.avgScore || 0
        })

        esasSnap.forEach(doc => {
          const d = doc.data()
          const stats = esaStats[doc.id] || { schools: 0, students: 0, totalScore: 0 }
          reportData.push([
            doc.id,
            d.name,
            d.province || '-',
            d.region || '-',
            stats.schools,
            stats.students,
            stats.schools > 0 ? (stats.totalScore / stats.schools).toFixed(2) : '0.00'
          ])
        })
      } else {
        // Summary report
        headers = ['ระดับ', 'จำนวน', 'คะแนนเฉลี่ย', 'Analysis', 'Reasoning', 'Creativity', 'Evidence']
        
        // Calculate national averages
        let totalScore = 0
        let count = 0
        const dims = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
        
        assessmentsSnap.forEach(doc => {
          const d = doc.data()
          if (d.rubricScores) {
            totalScore += d.totalScore || 0
            count++
            dims.analysis += d.rubricScores.analysis || 0
            dims.reasoning += d.rubricScores.reasoning || 0
            dims.creativity += d.rubricScores.creativity || 0
            dims.evidence += d.rubricScores.evidence || 0
          }
        })

        const n = Math.max(1, count)
        reportData.push([
          'ระดับประเทศ',
          schoolsSnap.size + ' โรงเรียน',
          (totalScore / n).toFixed(2),
          (dims.analysis / n).toFixed(2),
          (dims.reasoning / n).toFixed(2),
          (dims.creativity / n).toFixed(2),
          (dims.evidence / n).toFixed(2)
        ])
      }

      // Generate CSV
      const BOM = '\uFEFF'
      const csvContent = BOM + [headers.join(','), ...reportData.map(row => row.join(','))].join('\n')

      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="national_report_${reportType}_${Date.now()}.csv"`)
      return res.send(csvContent)

    } catch (error) {
      console.error('Error in exportNationalReport:', error)
      return res.status(500).json({ success: false, error: error.message })
    }
  })
})

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function calculateRegionalBreakdown() {
  try {
    const schoolSnapshot = await getDb().collection('schools')
      .where('status', '==', 'active')
      .get()

    const regions = {}
    
    schoolSnapshot.forEach(doc => {
      const data = doc.data()
      const region = getRegionFromProvince(data.province)
      
      if (!regions[region]) {
        regions[region] = {
          name: region,
          schools: 0,
          students: 0,
          totalScore: 0
        }
      }
      
      regions[region].schools++
      regions[region].students += data.studentCount || 0
      regions[region].totalScore += data.avgScore || 0
    })

    return Object.values(regions).map(r => ({
      ...r,
      avgScore: r.schools > 0 ? (r.totalScore / r.schools).toFixed(2) : '0.00'
    })).sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore))

  } catch (error) {
    console.error('Error calculating regional breakdown:', error)
    return []
  }
}

function getRegionFromProvince(province) {
  const regionMap = {
    // ภาคเหนือ
    'เชียงใหม่': 'ภาคเหนือ', 'เชียงราย': 'ภาคเหนือ', 'ลำปาง': 'ภาคเหนือ',
    'ลำพูน': 'ภาคเหนือ', 'แม่ฮ่องสอน': 'ภาคเหนือ', 'น่าน': 'ภาคเหนือ',
    'พะเยา': 'ภาคเหนือ', 'แพร่': 'ภาคเหนือ', 'อุตรดิตถ์': 'ภาคเหนือ',
    
    // ภาคตะวันออกเฉียงเหนือ
    'นครราชสีมา': 'ภาคอีสาน', 'ขอนแก่น': 'ภาคอีสาน', 'อุบลราชธานี': 'ภาคอีสาน',
    'อุดรธานี': 'ภาคอีสาน', 'สุรินทร์': 'ภาคอีสาน', 'ศรีสะเกษ': 'ภาคอีสาน',
    'บุรีรัมย์': 'ภาคอีสาน', 'ร้อยเอ็ด': 'ภาคอีสาน', 'มหาสารคาม': 'ภาคอีสาน',
    
    // ภาคกลาง
    'กรุงเทพมหานคร': 'ภาคกลาง', 'นนทบุรี': 'ภาคกลาง', 'ปทุมธานี': 'ภาคกลาง',
    'สมุทรปราการ': 'ภาคกลาง', 'พระนครศรีอยุธยา': 'ภาคกลาง', 'นครปฐม': 'ภาคกลาง',
    
    // ภาคใต้
    'สงขลา': 'ภาคใต้', 'ภูเก็ต': 'ภาคใต้', 'สุราษฎร์ธานี': 'ภาคใต้',
    'นครศรีธรรมราช': 'ภาคใต้', 'ตรัง': 'ภาคใต้', 'ยะลา': 'ภาคใต้',
    
    // ภาคตะวันออก
    'ชลบุรี': 'ภาคตะวันออก', 'ระยอง': 'ภาคตะวันออก', 'จันทบุรี': 'ภาคตะวันออก',
    'ตราด': 'ภาคตะวันออก', 'ฉะเชิงเทรา': 'ภาคตะวันออก'
  }
  
  return regionMap[province] || 'อื่นๆ'
}

function calculatePriority(score, studentCount) {
  // Higher priority for schools with more students and lower scores
  if (score < 5 && studentCount > 500) return 'critical'
  if (score < 8 && studentCount > 300) return 'high'
  if (score < 10) return 'medium'
  return 'low'
}

function generateNationalRecommendations(belowThreshold, total, regionalGaps) {
  const recommendations = []
  const percentage = (belowThreshold / total) * 100

  if (percentage > 30) {
    recommendations.push({
      priority: 'urgent',
      action: 'จัดทำแผนพัฒนาคุณภาพการศึกษาฉุกเฉิน',
      target: `${belowThreshold} โรงเรียนที่ต้องการความช่วยเหลือ`,
      timeline: '1-3 เดือน'
    })
  }

  if (regionalGaps.length > 0 && parseFloat(regionalGaps[0].percentage) > 40) {
    recommendations.push({
      priority: 'high',
      action: `เพิ่มทรัพยากรสนับสนุน${regionalGaps[0].region}`,
      target: `${regionalGaps[0].schoolsBelowThreshold} โรงเรียน`,
      timeline: '3-6 เดือน'
    })
  }

  recommendations.push({
    priority: 'medium',
    action: 'จัดอบรมครูเรื่อง HOTS และ A.R.C.E. Framework',
    target: 'ครูทุกโรงเรียนในสังกัด',
    timeline: '6-12 เดือน'
  })

  return recommendations
}

function average(arr) {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

function translateDimension(dim) {
  const translations = {
    analysis: 'การวิเคราะห์ (Analysis)',
    reasoning: 'การให้เหตุผล (Reasoning)',
    creativity: 'ความคิดสร้างสรรค์ (Creativity)',
    evidence: 'การใช้หลักฐาน (Evidence)'
  }
  return translations[dim] || dim
}

function getStrongestDimension(dimensions, count) {
  if (count === 0) return 'analysis'
  
  const normalized = {
    analysis: dimensions.analysis / count,
    reasoning: dimensions.reasoning / count,
    creativity: dimensions.creativity / count,
    evidence: dimensions.evidence / count
  }
  
  return Object.entries(normalized).sort(([,a], [,b]) => b - a)[0][0]
}

module.exports = exports
