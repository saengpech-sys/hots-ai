/**
 * 📊 ESA Executive Dashboard Engine
 * 
 * ระบบรายงานระดับเขตพื้นที่การศึกษา (ESA) และนโยบาย
 * สำหรับผู้บริหารใช้วางแผนการพัฒนาการคิดขั้นสูง
 * 
 * Features:
 * 1. HOTS Gap Analysis - วิเคราะห์ช่องว่างการคิดขั้นสูงรายโรงเรียน
 * 2. Regional Comparison - เปรียบเทียบระหว่างโรงเรียนในเขต
 * 3. Progress Tracking - ติดตามความก้าวหน้าระดับเขต
 * 4. Resource Allocation Recommendation - แนะนำการจัดสรรทรัพยากร
 * 5. Policy Impact Assessment - ประเมินผลกระทบของนโยบาย
 * 6. Real-time Dashboard Data - ข้อมูลสำหรับ Dashboard แบบ Real-time
 * 
 * Impact for C10:
 * - ขยายผลจากระดับโรงเรียนสู่ระดับนโยบาย (Policy Impact)
 * - เกณฑ์สำคัญของเชี่ยวชาญพิเศษ
 * 
 * @version 1.0.0
 * @author HOTS-AI Research Team
 */

const admin = require('firebase-admin')
const { performPairwiseFairnessAnalysis, calculateCohensD } = require('./fairnessAudit')

/**
 * 🎯 Performance Benchmarks
 */
const PERFORMANCE_BENCHMARKS = {
  excellent: { min: 16, max: 20, label: 'ดีเยี่ยม', color: '#10b981' },
  good: { min: 12, max: 15.99, label: 'ดี', color: '#22c55e' },
  satisfactory: { min: 8, max: 11.99, label: 'พอใช้', color: '#eab308' },
  needsImprovement: { min: 4, max: 7.99, label: 'ต้องปรับปรุง', color: '#f97316' },
  critical: { min: 0, max: 3.99, label: 'วิกฤต', color: '#dc2626' }
}

/**
 * 📊 ESA Metrics Configuration
 */
const ESA_METRICS = {
  hotsIndex: {
    name: 'HOTS Index',
    description: 'ดัชนีการคิดขั้นสูงรวม',
    weight: 0.4
  },
  growthRate: {
    name: 'Growth Rate',
    description: 'อัตราการเติบโต',
    weight: 0.25
  },
  equityIndex: {
    name: 'Equity Index',
    description: 'ดัชนีความเท่าเทียม',
    weight: 0.2
  },
  engagementRate: {
    name: 'Engagement Rate',
    description: 'อัตราการมีส่วนร่วม',
    weight: 0.15
  }
}

/**
 * 📈 Executive Dashboard Engine
 */
class ESADashboardEngine {
  constructor(db) {
    this.db = db
  }
  
  /**
   * Generate comprehensive ESA dashboard data
   * @param {string} esaId - Educational Service Area ID
   * @param {Object} options - Dashboard options
   * @returns {Object} Complete dashboard data
   */
  async generateDashboard(esaId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      compareWithPrevious = true,
      includeSchoolDetails = true
    } = options
    
    // Get all schools in ESA
    const schoolsSnapshot = await this.db.collection('schools')
      .where('esaId', '==', esaId)
      .get()
    
    if (schoolsSnapshot.empty) {
      return {
        success: false,
        error: 'No schools found in this ESA'
      }
    }
    
    const schools = []
    schoolsSnapshot.forEach(doc => {
      schools.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    // Collect assessments from all schools
    const allAssessments = await this.collectESAAssessments(schools, startDate, endDate)
    
    if (allAssessments.length === 0) {
      return {
        success: false,
        error: 'No assessment data found in this ESA'
      }
    }
    
    // Generate dashboard components
    const dashboard = {
      esaId,
      generatedAt: new Date().toISOString(),
      dateRange: { startDate, endDate },
      
      // Overview metrics
      overview: this.generateOverviewMetrics(allAssessments, schools),
      
      // HOTS Gap Analysis
      hotsGapAnalysis: this.analyzeHOTSGap(allAssessments, schools),
      
      // School rankings
      schoolRankings: this.generateSchoolRankings(allAssessments, schools),
      
      // Dimension analysis
      dimensionAnalysis: this.analyzeDimensionsAcrossESA(allAssessments),
      
      // Equity analysis
      equityAnalysis: this.analyzeEquity(allAssessments, schools),
      
      // Progress tracking
      progressTracking: this.trackProgress(allAssessments, compareWithPrevious),
      
      // Resource recommendations
      resourceRecommendations: null,
      
      // Policy insights
      policyInsights: null
    }
    
    // Add school details if requested
    if (includeSchoolDetails) {
      dashboard.schoolDetails = await this.generateSchoolDetails(schools, allAssessments)
    }
    
    // Generate resource recommendations based on analysis
    dashboard.resourceRecommendations = this.generateResourceRecommendations(dashboard)
    
    // Generate policy insights
    dashboard.policyInsights = this.generatePolicyInsights(dashboard)
    
    return {
      success: true,
      dashboard
    }
  }
  
  /**
   * Collect all assessments from ESA schools
   */
  async collectESAAssessments(schools, startDate, endDate) {
    const schoolIds = schools.map(s => s.id)
    const allAssessments = []
    
    // Query in batches (Firestore limit)
    for (let i = 0; i < schoolIds.length; i += 10) {
      const batchIds = schoolIds.slice(i, i + 10)
      
      let query = this.db.collection('assessments')
        .where('schoolId', 'in', batchIds)
      
      if (startDate) {
        query = query.where('createdAt', '>=', startDate)
      }
      if (endDate) {
        query = query.where('createdAt', '<=', endDate)
      }
      
      const snapshot = await query.get()
      
      snapshot.forEach(doc => {
        allAssessments.push({
          id: doc.id,
          ...doc.data()
        })
      })
    }
    
    return allAssessments
  }
  
  /**
   * Generate overview metrics
   */
  generateOverviewMetrics(assessments, schools) {
    const totalAssessments = assessments.length
    const uniqueStudents = new Set(assessments.map(a => a.studentId)).size
    const uniqueTeachers = new Set(assessments.map(a => a.teacherId)).size
    
    // Calculate HOTS scores
    const hotsScores = assessments.map(a => ({
      total: (a.rubricScores?.analysis || 0) +
             (a.rubricScores?.reasoning || 0) +
             (a.rubricScores?.creativity || 0) +
             (a.rubricScores?.evidence || 0),
      ...a.rubricScores
    }))
    
    const totalScores = hotsScores.map(s => s.total)
    const avgScore = totalScores.reduce((a, b) => a + b, 0) / totalScores.length
    
    // Calculate dimension averages
    const dimensionAvgs = {
      analysis: this.calculateMean(hotsScores.map(s => s.analysis || 0)),
      reasoning: this.calculateMean(hotsScores.map(s => s.reasoning || 0)),
      creativity: this.calculateMean(hotsScores.map(s => s.creativity || 0)),
      evidence: this.calculateMean(hotsScores.map(s => s.evidence || 0))
    }
    
    // Performance distribution
    const distribution = this.calculateDistribution(totalScores)
    
    // Active school count
    const activeSchools = new Set(assessments.map(a => a.schoolId)).size
    
    return {
      totalAssessments,
      uniqueStudents,
      uniqueTeachers,
      totalSchools: schools.length,
      activeSchools,
      avgHOTSScore: Math.round(avgScore * 100) / 100,
      dimensionAverages: dimensionAvgs,
      performanceDistribution: distribution,
      engagementRate: Math.round((activeSchools / schools.length) * 100),
      assessmentsPerStudent: Math.round((totalAssessments / uniqueStudents) * 10) / 10
    }
  }
  
  /**
   * Analyze HOTS Gap across schools
   */
  analyzeHOTSGap(assessments, schools) {
    // Group assessments by school
    const bySchool = {}
    
    assessments.forEach(a => {
      const schoolId = a.schoolId
      if (!bySchool[schoolId]) {
        bySchool[schoolId] = []
      }
      bySchool[schoolId].push(a)
    })
    
    // Calculate school-level metrics
    const schoolMetrics = []
    
    for (const [schoolId, schoolAssessments] of Object.entries(bySchool)) {
      const school = schools.find(s => s.id === schoolId)
      const scores = schoolAssessments.map(a => 
        (a.rubricScores?.analysis || 0) +
        (a.rubricScores?.reasoning || 0) +
        (a.rubricScores?.creativity || 0) +
        (a.rubricScores?.evidence || 0)
      )
      
      const mean = this.calculateMean(scores)
      const sd = this.calculateSD(scores)
      
      schoolMetrics.push({
        schoolId,
        schoolName: school?.name || 'Unknown',
        schoolType: school?.type || 'Unknown',
        assessmentCount: schoolAssessments.length,
        studentCount: new Set(schoolAssessments.map(a => a.studentId)).size,
        hotsScore: {
          mean: Math.round(mean * 100) / 100,
          sd: Math.round(sd * 100) / 100,
          min: Math.min(...scores),
          max: Math.max(...scores)
        },
        performanceLevel: this.getPerformanceLevel(mean),
        dimensionScores: {
          analysis: this.calculateMean(schoolAssessments.map(a => a.rubricScores?.analysis || 0)),
          reasoning: this.calculateMean(schoolAssessments.map(a => a.rubricScores?.reasoning || 0)),
          creativity: this.calculateMean(schoolAssessments.map(a => a.rubricScores?.creativity || 0)),
          evidence: this.calculateMean(schoolAssessments.map(a => a.rubricScores?.evidence || 0))
        }
      })
    }
    
    // Sort by HOTS score
    schoolMetrics.sort((a, b) => b.hotsScore.mean - a.hotsScore.mean)
    
    // Calculate gap metrics
    const allMeans = schoolMetrics.map(s => s.hotsScore.mean)
    const esaMean = this.calculateMean(allMeans)
    const esaSD = this.calculateSD(allMeans)
    
    const topSchools = schoolMetrics.slice(0, 5)
    const bottomSchools = schoolMetrics.slice(-5).reverse()
    
    const topMean = this.calculateMean(topSchools.map(s => s.hotsScore.mean))
    const bottomMean = this.calculateMean(bottomSchools.map(s => s.hotsScore.mean))
    const gap = topMean - bottomMean
    
    return {
      esaMetrics: {
        mean: Math.round(esaMean * 100) / 100,
        sd: Math.round(esaSD * 100) / 100,
        coefficient: esaMean > 0 ? Math.round((esaSD / esaMean) * 100) : 0
      },
      schoolMetrics,
      gapAnalysis: {
        topToBottomGap: Math.round(gap * 100) / 100,
        topSchoolsMean: Math.round(topMean * 100) / 100,
        bottomSchoolsMean: Math.round(bottomMean * 100) / 100,
        gapSeverity: gap > 6 ? 'critical' : gap > 4 ? 'high' : gap > 2 ? 'moderate' : 'low'
      },
      topPerformers: topSchools,
      needsSupport: bottomSchools,
      belowAverageCount: schoolMetrics.filter(s => s.hotsScore.mean < esaMean).length,
      criticalCount: schoolMetrics.filter(s => s.hotsScore.mean < 8).length
    }
  }
  
  /**
   * Generate school rankings
   */
  generateSchoolRankings(assessments, schools) {
    // Group by school and calculate composite score
    const bySchool = {}
    
    assessments.forEach(a => {
      const schoolId = a.schoolId
      if (!bySchool[schoolId]) {
        bySchool[schoolId] = {
          assessments: [],
          students: new Set()
        }
      }
      bySchool[schoolId].assessments.push(a)
      bySchool[schoolId].students.add(a.studentId)
    })
    
    const rankings = []
    
    for (const [schoolId, data] of Object.entries(bySchool)) {
      const school = schools.find(s => s.id === schoolId)
      const scores = data.assessments.map(a => 
        (a.rubricScores?.analysis || 0) +
        (a.rubricScores?.reasoning || 0) +
        (a.rubricScores?.creativity || 0) +
        (a.rubricScores?.evidence || 0)
      )
      
      // Calculate metrics for composite score
      const hotsIndex = this.calculateMean(scores) / 20 // Normalized to 0-1
      const engagementRate = data.assessments.length / data.students.size / 10 // Per 10 assessments
      
      // Calculate growth (if possible)
      const sortedAssessments = [...data.assessments].sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      )
      
      let growthRate = 0
      if (sortedAssessments.length >= 10) {
        const firstHalf = sortedAssessments.slice(0, Math.floor(sortedAssessments.length / 2))
        const secondHalf = sortedAssessments.slice(Math.floor(sortedAssessments.length / 2))
        
        const firstMean = this.calculateMean(firstHalf.map(a => 
          (a.rubricScores?.analysis || 0) + (a.rubricScores?.reasoning || 0) +
          (a.rubricScores?.creativity || 0) + (a.rubricScores?.evidence || 0)
        ))
        const secondMean = this.calculateMean(secondHalf.map(a => 
          (a.rubricScores?.analysis || 0) + (a.rubricScores?.reasoning || 0) +
          (a.rubricScores?.creativity || 0) + (a.rubricScores?.evidence || 0)
        ))
        
        growthRate = (secondMean - firstMean) / (firstMean || 1)
      }
      
      // Composite score
      const compositeScore = (
        hotsIndex * ESA_METRICS.hotsIndex.weight +
        Math.min(1, Math.max(0, growthRate + 0.5)) * ESA_METRICS.growthRate.weight +
        Math.min(1, engagementRate) * ESA_METRICS.engagementRate.weight
      )
      
      rankings.push({
        schoolId,
        schoolName: school?.name || 'Unknown',
        schoolType: school?.type || 'Unknown',
        metrics: {
          hotsIndex: Math.round(hotsIndex * 100),
          growthRate: Math.round(growthRate * 100),
          engagementRate: Math.round(engagementRate * 100)
        },
        compositeScore: Math.round(compositeScore * 100),
        assessmentCount: data.assessments.length,
        studentCount: data.students.size,
        rank: 0 // Will be set after sorting
      })
    }
    
    // Sort and assign ranks
    rankings.sort((a, b) => b.compositeScore - a.compositeScore)
    rankings.forEach((r, index) => {
      r.rank = index + 1
      r.tier = index < rankings.length * 0.2 ? 'Top' 
             : index < rankings.length * 0.5 ? 'High'
             : index < rankings.length * 0.8 ? 'Middle' : 'Support'
    })
    
    return {
      rankings,
      topTier: rankings.filter(r => r.tier === 'Top'),
      supportTier: rankings.filter(r => r.tier === 'Support'),
      totalSchools: rankings.length
    }
  }
  
  /**
   * Analyze dimensions across ESA
   */
  analyzeDimensionsAcrossESA(assessments) {
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const analysis = {}
    
    for (const dim of dimensions) {
      const scores = assessments.map(a => a.rubricScores?.[dim] || 0)
      const mean = this.calculateMean(scores)
      const sd = this.calculateSD(scores)
      
      // Distribution of scores
      const distribution = {
        0: scores.filter(s => s === 0).length,
        1: scores.filter(s => s === 1).length,
        2: scores.filter(s => s === 2).length,
        3: scores.filter(s => s === 3).length,
        4: scores.filter(s => s === 4).length,
        5: scores.filter(s => s === 5).length
      }
      
      const passRate = scores.filter(s => s >= 3).length / scores.length
      const masteryRate = scores.filter(s => s >= 4).length / scores.length
      
      analysis[dim] = {
        label: this.getDimensionLabel(dim),
        mean: Math.round(mean * 100) / 100,
        sd: Math.round(sd * 100) / 100,
        passRate: Math.round(passRate * 100),
        masteryRate: Math.round(masteryRate * 100),
        distribution,
        status: passRate >= 0.7 ? 'Strong' : passRate >= 0.5 ? 'Adequate' : 'NeedsWork'
      }
    }
    
    // Rank dimensions
    const ranked = Object.entries(analysis)
      .sort(([, a], [, b]) => b.mean - a.mean)
      .map(([dim], index) => ({ dimension: dim, rank: index + 1 }))
    
    const strongest = ranked[0].dimension
    const weakest = ranked[ranked.length - 1].dimension
    
    return {
      dimensions: analysis,
      ranking: ranked,
      strongest: {
        dimension: strongest,
        label: analysis[strongest].label,
        mean: analysis[strongest].mean
      },
      weakest: {
        dimension: weakest,
        label: analysis[weakest].label,
        mean: analysis[weakest].mean
      },
      focusArea: analysis[weakest].status === 'NeedsWork' ? weakest : null
    }
  }
  
  /**
   * Analyze equity across schools and student groups
   */
  analyzeEquity(assessments, schools) {
    // Group schools by type
    const schoolTypeGroups = {}
    
    schools.forEach(school => {
      const type = school.type || 'unknown'
      if (!schoolTypeGroups[type]) {
        schoolTypeGroups[type] = []
      }
      schoolTypeGroups[type].push(school.id)
    })
    
    // Calculate scores by school type
    const typeScores = {}
    
    for (const [type, schoolIds] of Object.entries(schoolTypeGroups)) {
      const typeAssessments = assessments.filter(a => schoolIds.includes(a.schoolId))
      const scores = typeAssessments.map(a => 
        (a.rubricScores?.analysis || 0) +
        (a.rubricScores?.reasoning || 0) +
        (a.rubricScores?.creativity || 0) +
        (a.rubricScores?.evidence || 0)
      )
      
      typeScores[type] = {
        count: scores.length,
        schoolCount: schoolIds.length,
        mean: this.calculateMean(scores),
        sd: this.calculateSD(scores)
      }
    }
    
    // Calculate equity metrics between types
    const types = Object.keys(typeScores)
    const comparisons = []
    
    for (let i = 0; i < types.length; i++) {
      for (let j = i + 1; j < types.length; j++) {
        const type1 = types[i]
        const type2 = types[j]
        
        const diff = typeScores[type1].mean - typeScores[type2].mean
        const pooledSD = Math.sqrt(
          (Math.pow(typeScores[type1].sd, 2) + Math.pow(typeScores[type2].sd, 2)) / 2
        )
        const effectSize = pooledSD > 0 ? diff / pooledSD : 0
        
        comparisons.push({
          groups: [type1, type2],
          meanDiff: Math.round(diff * 100) / 100,
          effectSize: Math.round(effectSize * 100) / 100,
          interpretation: this.interpretEffectSize(Math.abs(effectSize)),
          concern: Math.abs(effectSize) >= 0.5
        })
      }
    }
    
    // Calculate overall equity index (0-100, higher = more equitable)
    const allEffectSizes = comparisons.map(c => Math.abs(c.effectSize))
    const avgEffectSize = this.calculateMean(allEffectSizes) || 0
    const equityIndex = Math.round(Math.max(0, 100 - (avgEffectSize * 50)))
    
    return {
      bySchoolType: typeScores,
      comparisons,
      equityIndex,
      equityLevel: equityIndex >= 80 ? 'High' : equityIndex >= 60 ? 'Moderate' : 'Low',
      concerningGaps: comparisons.filter(c => c.concern),
      recommendations: this.generateEquityRecommendations(comparisons, typeScores)
    }
  }
  
  /**
   * Track progress over time
   */
  trackProgress(assessments, compareWithPrevious) {
    // Sort by date
    const sorted = [...assessments].sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    )
    
    if (sorted.length < 20) {
      return { analyzed: false, reason: 'Insufficient data for progress tracking' }
    }
    
    // Group by month
    const byMonth = {}
    
    sorted.forEach(a => {
      const date = new Date(a.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = []
      }
      byMonth[monthKey].push(a)
    })
    
    // Calculate monthly metrics
    const monthlyMetrics = []
    
    for (const [month, monthAssessments] of Object.entries(byMonth)) {
      const scores = monthAssessments.map(a => 
        (a.rubricScores?.analysis || 0) +
        (a.rubricScores?.reasoning || 0) +
        (a.rubricScores?.creativity || 0) +
        (a.rubricScores?.evidence || 0)
      )
      
      monthlyMetrics.push({
        month,
        assessmentCount: monthAssessments.length,
        studentCount: new Set(monthAssessments.map(a => a.studentId)).size,
        hotsScore: Math.round(this.calculateMean(scores) * 100) / 100,
        passRate: Math.round((scores.filter(s => s >= 12).length / scores.length) * 100)
      })
    }
    
    // Sort by month
    monthlyMetrics.sort((a, b) => a.month.localeCompare(b.month))
    
    // Calculate trend
    const scores = monthlyMetrics.map(m => m.hotsScore)
    const trend = this.calculateTrend(scores)
    
    // Month-over-month change
    let momChange = null
    if (monthlyMetrics.length >= 2) {
      const lastMonth = monthlyMetrics[monthlyMetrics.length - 1]
      const prevMonth = monthlyMetrics[monthlyMetrics.length - 2]
      momChange = {
        scoreChange: Math.round((lastMonth.hotsScore - prevMonth.hotsScore) * 100) / 100,
        passRateChange: lastMonth.passRate - prevMonth.passRate,
        assessmentChange: lastMonth.assessmentCount - prevMonth.assessmentCount
      }
    }
    
    return {
      analyzed: true,
      monthlyMetrics,
      trend: {
        direction: trend.slope > 0.1 ? 'improving' : trend.slope < -0.1 ? 'declining' : 'stable',
        slope: trend.slope,
        interpretation: this.interpretTrend(trend.slope)
      },
      monthOverMonth: momChange,
      projection: this.projectFuturePerformance(monthlyMetrics)
    }
  }
  
  /**
   * Generate detailed school reports
   */
  async generateSchoolDetails(schools, allAssessments) {
    const details = []
    
    for (const school of schools) {
      const schoolAssessments = allAssessments.filter(a => a.schoolId === school.id)
      
      if (schoolAssessments.length === 0) {
        details.push({
          schoolId: school.id,
          schoolName: school.name,
          status: 'inactive',
          reason: 'No assessments found'
        })
        continue
      }
      
      const scores = schoolAssessments.map(a => 
        (a.rubricScores?.analysis || 0) +
        (a.rubricScores?.reasoning || 0) +
        (a.rubricScores?.creativity || 0) +
        (a.rubricScores?.evidence || 0)
      )
      
      // Dimension breakdown
      const dimensions = {}
      for (const dim of ['analysis', 'reasoning', 'creativity', 'evidence']) {
        const dimScores = schoolAssessments.map(a => a.rubricScores?.[dim] || 0)
        dimensions[dim] = {
          mean: Math.round(this.calculateMean(dimScores) * 100) / 100,
          passRate: Math.round((dimScores.filter(s => s >= 3).length / dimScores.length) * 100)
        }
      }
      
      // Find weakest dimension
      const weakest = Object.entries(dimensions)
        .sort(([, a], [, b]) => a.mean - b.mean)[0]
      
      details.push({
        schoolId: school.id,
        schoolName: school.name,
        schoolType: school.type,
        status: 'active',
        metrics: {
          assessmentCount: schoolAssessments.length,
          studentCount: new Set(schoolAssessments.map(a => a.studentId)).size,
          teacherCount: new Set(schoolAssessments.map(a => a.teacherId)).size,
          hotsScore: {
            mean: Math.round(this.calculateMean(scores) * 100) / 100,
            sd: Math.round(this.calculateSD(scores) * 100) / 100
          },
          passRate: Math.round((scores.filter(s => s >= 12).length / scores.length) * 100)
        },
        dimensions,
        weakestDimension: {
          dimension: weakest[0],
          label: this.getDimensionLabel(weakest[0]),
          mean: weakest[1].mean
        },
        performanceLevel: this.getPerformanceLevel(this.calculateMean(scores))
      })
    }
    
    return details
  }
  
  /**
   * Generate resource allocation recommendations
   */
  generateResourceRecommendations(dashboard) {
    const recommendations = []
    
    // Based on HOTS gap analysis
    if (dashboard.hotsGapAnalysis.gapAnalysis.gapSeverity === 'critical') {
      recommendations.push({
        priority: 'HIGH',
        type: 'RESOURCE_ALLOCATION',
        title: 'ลดช่องว่างการคิดขั้นสูงอย่างเร่งด่วน',
        description: 'พบช่องว่างคะแนนระหว่างโรงเรียนสูงมาก',
        actions: [
          'จัดสรรงบประมาณเพิ่มเติมให้โรงเรียนกลุ่มเสี่ยง',
          'ส่งครูต้นแบบไปช่วยเหลือ',
          'จัดอบรมเชิงปฏิบัติการ HOTS ให้ครู'
        ],
        targetSchools: dashboard.hotsGapAnalysis.needsSupport.map(s => s.schoolName),
        estimatedImpact: 'ลดช่องว่าง 30% ภายใน 1 ภาคเรียน'
      })
    }
    
    // Based on equity analysis
    if (dashboard.equityAnalysis.equityIndex < 60) {
      recommendations.push({
        priority: 'HIGH',
        type: 'EQUITY_INTERVENTION',
        title: 'เพิ่มความเท่าเทียมในการเรียนรู้',
        description: `ดัชนีความเท่าเทียม ${dashboard.equityAnalysis.equityIndex}% ต่ำกว่าเกณฑ์`,
        actions: [
          'ตรวจสอบทรัพยากรการเรียนการสอนในแต่ละประเภทโรงเรียน',
          'จัดหาสื่อการสอน HOTS เพิ่มเติม',
          'สร้างเครือข่ายแลกเปลี่ยนเรียนรู้ระหว่างโรงเรียน'
        ],
        gaps: dashboard.equityAnalysis.concerningGaps,
        estimatedImpact: 'เพิ่มดัชนีความเท่าเทียม 20%'
      })
    }
    
    // Based on dimension analysis
    if (dashboard.dimensionAnalysis.focusArea) {
      const weakDim = dashboard.dimensionAnalysis.weakest
      recommendations.push({
        priority: 'MEDIUM',
        type: 'CURRICULUM_FOCUS',
        title: `พัฒนาทักษะ${weakDim.label}เป็นพิเศษ`,
        description: `มิติ${weakDim.label}มีคะแนนเฉลี่ยต่ำสุดที่ ${weakDim.mean}`,
        actions: [
          `จัดอบรมครูเรื่องการสอน${weakDim.label}`,
          'พัฒนาแบบฝึกหัดเฉพาะทาง',
          'เพิ่มกิจกรรมการเรียนรู้ที่เน้นมิตินี้'
        ],
        estimatedImpact: `เพิ่มคะแนนเฉลี่ย${weakDim.label} 0.5-1.0 คะแนน`
      })
    }
    
    // Based on engagement
    if (dashboard.overview.engagementRate < 70) {
      recommendations.push({
        priority: 'MEDIUM',
        type: 'ENGAGEMENT_BOOST',
        title: 'เพิ่มการมีส่วนร่วมของโรงเรียน',
        description: `มีโรงเรียนที่ยังไม่ได้ใช้ระบบ ${100 - dashboard.overview.engagementRate}%`,
        actions: [
          'จัดประชุมชี้แจงผู้บริหารโรงเรียน',
          'ให้การสนับสนุนทางเทคนิค',
          'สร้างแรงจูงใจในการใช้ระบบ'
        ],
        estimatedImpact: 'เพิ่มอัตราการมีส่วนร่วม 20%'
      })
    }
    
    // Add general recommendation if no specific ones
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'INFO',
        type: 'MAINTENANCE',
        title: 'รักษาระดับการพัฒนาที่ดี',
        description: 'ภาพรวมของเขตพื้นที่อยู่ในเกณฑ์ดี',
        actions: [
          'รักษามาตรฐานการสอนปัจจุบัน',
          'แชร์ Best Practices ระหว่างโรงเรียน',
          'ตั้งเป้าหมายที่สูงขึ้น'
        ]
      })
    }
    
    return recommendations.sort((a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, INFO: 2 }
      return order[a.priority] - order[b.priority]
    })
  }
  
  /**
   * Generate policy insights
   */
  generatePolicyInsights(dashboard) {
    const insights = {
      keyFindings: [],
      strategicRecommendations: [],
      kpis: [],
      nextSteps: []
    }
    
    // Key findings
    insights.keyFindings.push({
      area: 'ภาพรวม HOTS',
      finding: `คะแนนเฉลี่ย HOTS ของเขตอยู่ที่ ${dashboard.overview.avgHOTSScore}/20 (${this.getPerformanceLevel(dashboard.overview.avgHOTSScore).label})`,
      trend: dashboard.progressTracking.trend?.direction || 'N/A'
    })
    
    if (dashboard.hotsGapAnalysis.gapAnalysis.gapSeverity !== 'low') {
      insights.keyFindings.push({
        area: 'ช่องว่างระหว่างโรงเรียน',
        finding: `พบช่องว่าง ${dashboard.hotsGapAnalysis.gapAnalysis.topToBottomGap} คะแนน ระหว่างโรงเรียนที่ดีที่สุดและต้องปรับปรุง`,
        severity: dashboard.hotsGapAnalysis.gapAnalysis.gapSeverity
      })
    }
    
    if (dashboard.equityAnalysis.concerningGaps.length > 0) {
      insights.keyFindings.push({
        area: 'ความเท่าเทียม',
        finding: `พบความแตกต่างอย่างมีนัยสำคัญระหว่างประเภทโรงเรียน`,
        gaps: dashboard.equityAnalysis.concerningGaps
      })
    }
    
    // Strategic recommendations
    insights.strategicRecommendations.push({
      timeframe: 'ระยะสั้น (1-3 เดือน)',
      actions: [
        'จัดทำแผนพัฒนาโรงเรียนกลุ่มเสี่ยง',
        'อบรมครูเรื่อง HOTS Assessment',
        'ติดตามผลการประเมินรายเดือน'
      ]
    })
    
    insights.strategicRecommendations.push({
      timeframe: 'ระยะกลาง (3-6 เดือน)',
      actions: [
        'พัฒนาหลักสูตร HOTS สำหรับเขต',
        'สร้างเครือข่าย PLC ระหว่างโรงเรียน',
        'จัดประกวดนวัตกรรมการสอน HOTS'
      ]
    })
    
    insights.strategicRecommendations.push({
      timeframe: 'ระยะยาว (6-12 เดือน)',
      actions: [
        'บูรณาการ HOTS ในทุกกลุ่มสาระ',
        'พัฒนาครูผู้นำด้าน HOTS Assessment',
        'สร้างระบบติดตามคุณภาพต่อเนื่อง'
      ]
    })
    
    // KPIs
    insights.kpis = [
      {
        name: 'คะแนนเฉลี่ย HOTS เขต',
        current: dashboard.overview.avgHOTSScore,
        target: Math.min(20, dashboard.overview.avgHOTSScore + 2),
        unit: 'คะแนน'
      },
      {
        name: 'ดัชนีความเท่าเทียม',
        current: dashboard.equityAnalysis.equityIndex,
        target: Math.min(100, dashboard.equityAnalysis.equityIndex + 15),
        unit: '%'
      },
      {
        name: 'โรงเรียนที่ใช้ระบบ',
        current: dashboard.overview.engagementRate,
        target: Math.min(100, dashboard.overview.engagementRate + 20),
        unit: '%'
      },
      {
        name: 'ช่องว่างระหว่างโรงเรียน',
        current: dashboard.hotsGapAnalysis.gapAnalysis.topToBottomGap,
        target: Math.max(2, dashboard.hotsGapAnalysis.gapAnalysis.topToBottomGap - 2),
        unit: 'คะแนน',
        lowerIsBetter: true
      }
    ]
    
    // Next steps
    insights.nextSteps = [
      'ประชุมผู้บริหารโรงเรียนเพื่อแจ้งผลวิเคราะห์',
      'จัดทำแผนปฏิบัติการรายโรงเรียน',
      'กำหนดผู้รับผิดชอบและติดตามผล',
      'รายงานผลต่อสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน'
    ]
    
    return insights
  }
  
  /**
   * Generate comparative report between ESAs
   */
  async generateESAComparison(esaIds) {
    const esaData = []
    
    for (const esaId of esaIds) {
      const dashboard = await this.generateDashboard(esaId, { includeSchoolDetails: false })
      if (dashboard.success) {
        esaData.push({
          esaId,
          overview: dashboard.dashboard.overview,
          gapSeverity: dashboard.dashboard.hotsGapAnalysis.gapAnalysis.gapSeverity,
          equityIndex: dashboard.dashboard.equityAnalysis.equityIndex
        })
      }
    }
    
    if (esaData.length < 2) {
      return { success: false, error: 'Need at least 2 ESAs for comparison' }
    }
    
    // Rank ESAs
    esaData.sort((a, b) => b.overview.avgHOTSScore - a.overview.avgHOTSScore)
    esaData.forEach((esa, index) => {
      esa.rank = index + 1
    })
    
    return {
      success: true,
      comparison: {
        esaCount: esaData.length,
        rankings: esaData,
        topPerformer: esaData[0],
        needsSupport: esaData[esaData.length - 1],
        averageHOTS: this.calculateMean(esaData.map(e => e.overview.avgHOTSScore)),
        averageEquity: this.calculateMean(esaData.map(e => e.equityIndex))
      }
    }
  }
  
  // === Helper Methods ===
  
  calculateMean(arr) {
    if (!arr || arr.length === 0) return 0
    return arr.reduce((a, b) => a + b, 0) / arr.length
  }
  
  calculateSD(arr) {
    if (!arr || arr.length < 2) return 0
    const mean = this.calculateMean(arr)
    const squaredDiffs = arr.map(x => Math.pow(x - mean, 2))
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1))
  }
  
  calculateDistribution(scores) {
    const distribution = {}
    
    for (const [level, config] of Object.entries(PERFORMANCE_BENCHMARKS)) {
      const count = scores.filter(s => s >= config.min && s <= config.max).length
      distribution[level] = {
        count,
        percentage: Math.round((count / scores.length) * 100),
        label: config.label,
        color: config.color
      }
    }
    
    return distribution
  }
  
  getPerformanceLevel(score) {
    for (const [level, config] of Object.entries(PERFORMANCE_BENCHMARKS)) {
      if (score >= config.min && score <= config.max) {
        return { level, ...config }
      }
    }
    return { level: 'unknown', label: 'ไม่ทราบ' }
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
  
  interpretEffectSize(d) {
    if (d < 0.2) return 'negligible'
    if (d < 0.5) return 'small'
    if (d < 0.8) return 'medium'
    return 'large'
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
      direction: slope > 0.1 ? 'improving' : slope < -0.1 ? 'declining' : 'stable'
    }
  }
  
  interpretTrend(slope) {
    if (slope > 0.3) return 'พัฒนาอย่างต่อเนื่อง'
    if (slope > 0.1) return 'มีแนวโน้มดีขึ้นเล็กน้อย'
    if (slope > -0.1) return 'คงที่'
    if (slope > -0.3) return 'มีแนวโน้มลดลงเล็กน้อย'
    return 'ต้องการความช่วยเหลือเร่งด่วน'
  }
  
  projectFuturePerformance(monthlyMetrics) {
    if (monthlyMetrics.length < 3) return null
    
    const scores = monthlyMetrics.map(m => m.hotsScore)
    const trend = this.calculateTrend(scores)
    const lastScore = scores[scores.length - 1]
    
    return {
      nextMonth: Math.round((lastScore + trend.slope) * 100) / 100,
      threeMonths: Math.round((lastScore + trend.slope * 3) * 100) / 100,
      confidence: monthlyMetrics.length >= 6 ? 'high' : 'moderate'
    }
  }
  
  generateEquityRecommendations(comparisons, typeScores) {
    const recommendations = []
    
    for (const comparison of comparisons) {
      if (comparison.concern) {
        const [type1, type2] = comparison.groups
        const lower = typeScores[type1].mean < typeScores[type2].mean ? type1 : type2
        
        recommendations.push({
          targetGroup: lower,
          gap: Math.abs(comparison.meanDiff),
          action: `ให้การสนับสนุนเพิ่มเติมแก่โรงเรียนประเภท ${lower}`
        })
      }
    }
    
    return recommendations
  }
}

// Export
module.exports = {
  PERFORMANCE_BENCHMARKS,
  ESA_METRICS,
  ESADashboardEngine
}
