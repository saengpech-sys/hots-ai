/**
 * HOTS AI ChatLoop - National Scale Functions
 * Organization Management, Curriculum Sync, Portfolio Generation
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })

const db = admin.firestore()

// ==================== ORGANIZATION MANAGEMENT ====================

/**
 * Create a new organization (School, ESA, or Ministry)
 * Ministry Admin only
 */
exports.createOrganization = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { type, parentId, name, code, province, district, region, ...otherData } = req.body

      if (!type || !name) {
        return res.status(400).send({ error: 'Missing required fields: type, name' })
      }

      const orgData = {
        type, // 'school' | 'esa' | 'ministry'
        parentId: parentId || null,
        name,
        code: code || null,
        province: province || null,
        district: district || null,
        region: region || null,
        isActive: true,
        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...otherData
      }

      // Auto-set esaId for schools
      if (type === 'school' && parentId) {
        orgData.esaId = parentId
      }

      const orgRef = await db.collection('organizations').add(orgData)

      res.status(200).send({
        success: true,
        organizationId: orgRef.id,
        message: 'Organization created successfully'
      })
    } catch (error) {
      console.error('Error creating organization:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Get organization hierarchy (tree structure)
 */
exports.getOrganizationHierarchy = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { orgId, type } = req.query

      let query = db.collection('organizations')

      if (orgId) {
        // Get children of specific org
        query = query.where('parentId', '==', orgId)
      } else if (type) {
        // Get all of specific type
        query = query.where('type', '==', type)
      }

      const snapshot = await query.get()
      const organizations = []

      snapshot.forEach(doc => {
        organizations.push({ id: doc.id, ...doc.data() })
      })

      res.status(200).send({
        success: true,
        organizations
      })
    } catch (error) {
      console.error('Error getting organizations:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

// ==================== MASTER CURRICULUM MANAGEMENT ====================

/**
 * Create Master Curriculum (Ministry Admin only)
 */
exports.createMasterCurriculum = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const {
        curriculumYear,
        subjectCode,
        subjectName,
        subjectNameEn,
        educationLevel,
        gradeLevel,
        semester,
        standards,
        learningOutcomes
      } = req.body

      if (!curriculumYear || !subjectCode || !gradeLevel || !learningOutcomes) {
        return res.status(400).send({
          error: 'Missing required fields: curriculumYear, subjectCode, gradeLevel, learningOutcomes'
        })
      }

      const curriculumData = {
        curriculumYear,
        subjectCode,
        subjectName: subjectName || '',
        subjectNameEn: subjectNameEn || '',
        educationLevel: educationLevel || 'secondary',
        gradeLevel,
        semester: semester || 1,
        standards: standards || [],
        learningOutcomes: learningOutcomes || [],
        approvedBy: 'OBEC',
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        version: '1.0',
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }

      const curriculumRef = await db.collection('master_curriculums').add(curriculumData)

      res.status(200).send({
        success: true,
        curriculumId: curriculumRef.id,
        message: 'Master curriculum created successfully'
      })
    } catch (error) {
      console.error('Error creating master curriculum:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Get Master Curriculums by grade/subject
 */
exports.getMasterCurriculums = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { gradeLevel, subjectCode } = req.query

      let query = db.collection('master_curriculums').where('isActive', '==', true)

      if (gradeLevel) {
        query = query.where('gradeLevel', '==', gradeLevel)
      }

      if (subjectCode) {
        query = query.where('subjectCode', '==', subjectCode)
      }

      const snapshot = await query.get()
      const curriculums = []

      snapshot.forEach(doc => {
        curriculums.push({ id: doc.id, ...doc.data() })
      })

      res.status(200).send({
        success: true,
        curriculums
      })
    } catch (error) {
      console.error('Error getting master curriculums:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

// ==================== STUDENT PORTFOLIO ====================

/**
 * Generate Student Portfolio (aggregated data)
 */
exports.generateStudentPortfolio = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { studentId } = req.query

      if (!studentId) {
        return res.status(400).send({ error: 'Missing studentId' })
      }

      // Get student data
      const studentDoc = await db.collection('users').doc(studentId).get()
      if (!studentDoc.exists) {
        return res.status(404).send({ error: 'Student not found' })
      }

      const studentData = studentDoc.data()

      // Get all assessments
      const assessmentsSnapshot = await db
        .collection('assessments')
        .where('studentId', '==', studentId)
        .orderBy('createdAt', 'desc')
        .get()

      // Calculate HOTS Profile
      const hotsScores = {
        analysis: [],
        reasoning: [],
        creativity: [],
        evidence: []
      }

      const masteredLOs = new Map()

      assessmentsSnapshot.forEach(doc => {
        const assessment = doc.data()
        
        // Collect scores
        if (assessment.rubricScores) {
          hotsScores.analysis.push(assessment.rubricScores.analysis || 0)
          hotsScores.reasoning.push(assessment.rubricScores.reasoning || 0)
          hotsScores.creativity.push(assessment.rubricScores.creativity || 0)
          hotsScores.evidence.push(assessment.rubricScores.evidence || 0)
        }

        // Track LO mastery
        if (assessment.loAssessment && assessment.loAssessment.passedLOs) {
          assessment.loAssessment.passedLOs.forEach(lo => {
            if (!masteredLOs.has(lo)) {
              masteredLOs.set(lo, {
                code: lo,
                masteryLevel: 0,
                assessmentCount: 0,
                lastAssessedAt: assessment.createdAt
              })
            }
            const loData = masteredLOs.get(lo)
            loData.assessmentCount++
            loData.lastAssessedAt = assessment.createdAt
          })
        }
      })

      // Calculate averages
      const calculateAvg = (scores) => {
        if (scores.length === 0) return 0
        return scores.reduce((a, b) => a + b, 0) / scores.length
      }

      const hotsProfile = {
        analysis: {
          score: parseFloat(calculateAvg(hotsScores.analysis).toFixed(2)),
          assessmentCount: hotsScores.analysis.length
        },
        reasoning: {
          score: parseFloat(calculateAvg(hotsScores.reasoning).toFixed(2)),
          assessmentCount: hotsScores.reasoning.length
        },
        creativity: {
          score: parseFloat(calculateAvg(hotsScores.creativity).toFixed(2)),
          assessmentCount: hotsScores.creativity.length
        },
        evidence: {
          score: parseFloat(calculateAvg(hotsScores.evidence).toFixed(2)),
          assessmentCount: hotsScores.evidence.length
        }
      }

      // Create/Update Portfolio
      const portfolioData = {
        studentId,
        schoolId: studentData.schoolId || null,
        studentName: studentData.displayName || 'Unknown',
        studentCode: studentData.studentId || null,
        enrollmentYear: studentData.enrollmentYear || null,
        currentGradeLevel: studentData.gradeLevel || null,
        hotsProfile,
        masteredLOs: Array.from(masteredLOs.values()),
        totalAssessments: assessmentsSnapshot.size,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }

      const portfolioId = `portfolio_${studentId}`
      await db.collection('student_portfolios').doc(portfolioId).set(portfolioData, { merge: true })

      res.status(200).send({
        success: true,
        portfolio: portfolioData
      })
    } catch (error) {
      console.error('Error generating portfolio:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Export Portfolio as JSON (for university integration)
 */
exports.exportPortfolio = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { studentId, format } = req.query

      if (!studentId) {
        return res.status(400).send({ error: 'Missing studentId' })
      }

      const portfolioId = `portfolio_${studentId}`
      const portfolioDoc = await db.collection('student_portfolios').doc(portfolioId).get()

      if (!portfolioDoc.exists) {
        return res.status(404).send({ error: 'Portfolio not found' })
      }

      const portfolio = portfolioDoc.data()

      if (format === 'json') {
        res.status(200).json(portfolio)
      } else {
        // Default: structured response
        res.status(200).send({
          success: true,
          portfolio,
          exportedAt: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error exporting portfolio:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

// ==================== ANALYTICS (National/ESA/School Level) ====================

/**
 * Get School Analytics
 */
exports.getSchoolAnalytics = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { schoolId, academicYear, gradeLevel } = req.query

      if (!schoolId) {
        return res.status(400).send({ error: 'Missing schoolId' })
      }

      let query = db.collection('assessments').where('schoolId', '==', schoolId)

      if (academicYear) {
        query = query.where('academicYear', '==', parseInt(academicYear))
      }

      if (gradeLevel) {
        query = query.where('gradeLevel', '==', gradeLevel)
      }

      const snapshot = await query.limit(1000).get()

      // Calculate aggregated stats
      const stats = {
        totalAssessments: snapshot.size,
        hotsAverage: { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 },
        studentCount: new Set()
      }

      const scores = { analysis: [], reasoning: [], creativity: [], evidence: [] }

      snapshot.forEach(doc => {
        const assessment = doc.data()
        stats.studentCount.add(assessment.studentId)

        if (assessment.rubricScores) {
          scores.analysis.push(assessment.rubricScores.analysis || 0)
          scores.reasoning.push(assessment.rubricScores.reasoning || 0)
          scores.creativity.push(assessment.rubricScores.creativity || 0)
          scores.evidence.push(assessment.rubricScores.evidence || 0)
        }
      })

      const calculateAvg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

      stats.hotsAverage = {
        analysis: parseFloat(calculateAvg(scores.analysis).toFixed(2)),
        reasoning: parseFloat(calculateAvg(scores.reasoning).toFixed(2)),
        creativity: parseFloat(calculateAvg(scores.creativity).toFixed(2)),
        evidence: parseFloat(calculateAvg(scores.evidence).toFixed(2))
      }

      stats.studentCount = stats.studentCount.size

      res.status(200).send({
        success: true,
        schoolId,
        stats
      })
    } catch (error) {
      console.error('Error getting school analytics:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Scheduled function to compute national analytics (runs daily)
 */
exports.computeNationalAnalytics = functions.pubsub
  .schedule('0 2 * * *') // Every day at 2 AM
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    try {
      console.log('Starting national analytics computation...')

      const now = new Date()
      const academicYear = now.getFullYear() + 543 // Convert to Buddhist year
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      // Get all assessments from last month
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const snapshot = await db
        .collection('assessments')
        .where('createdAt', '>=', lastMonth)
        .get()

      // Aggregate by grade level and subject
      const aggregated = {}

      snapshot.forEach(doc => {
        const assessment = doc.data()
        const key = `${assessment.gradeLevel}_${assessment.subjectCode || 'general'}`

        if (!aggregated[key]) {
          aggregated[key] = {
            academicYear,
            gradeLevel: assessment.gradeLevel,
            subjectCode: assessment.subjectCode || 'general',
            month,
            totalAssessments: 0,
            students: new Set(),
            schools: new Set(),
            scores: { analysis: [], reasoning: [], creativity: [], evidence: [] }
          }
        }

        const data = aggregated[key]
        data.totalAssessments++
        data.students.add(assessment.studentId)
        data.schools.add(assessment.schoolId)

        if (assessment.rubricScores) {
          data.scores.analysis.push(assessment.rubricScores.analysis || 0)
          data.scores.reasoning.push(assessment.rubricScores.reasoning || 0)
          data.scores.creativity.push(assessment.rubricScores.creativity || 0)
          data.scores.evidence.push(assessment.rubricScores.evidence || 0)
        }
      })

      // Save to national_analytics collection
      const batch = db.batch()

      Object.entries(aggregated).forEach(([key, data]) => {
        const calculateAvg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

        const analyticsData = {
          academicYear: data.academicYear,
          gradeLevel: data.gradeLevel,
          subjectCode: data.subjectCode,
          month: data.month,
          totalAssessments: data.totalAssessments,
          totalStudents: data.students.size,
          totalSchools: data.schools.size,
          hotsAverage: {
            analysis: parseFloat(calculateAvg(data.scores.analysis).toFixed(2)),
            reasoning: parseFloat(calculateAvg(data.scores.reasoning).toFixed(2)),
            creativity: parseFloat(calculateAvg(data.scores.creativity).toFixed(2)),
            evidence: parseFloat(calculateAvg(data.scores.evidence).toFixed(2))
          },
          computedAt: admin.firestore.FieldValue.serverTimestamp()
        }

        const docRef = db.collection('national_analytics').doc(`${data.academicYear}_${data.month}_${key}`)
        batch.set(docRef, analyticsData, { merge: true })
      })

      await batch.commit()

      console.log(`National analytics computed for ${Object.keys(aggregated).length} groups`)
      return null
    } catch (error) {
      console.error('Error computing national analytics:', error)
      return null
    }
  })

module.exports = {
  createOrganization: exports.createOrganization,
  getOrganizationHierarchy: exports.getOrganizationHierarchy,
  createMasterCurriculum: exports.createMasterCurriculum,
  getMasterCurriculums: exports.getMasterCurriculums,
  generateStudentPortfolio: exports.generateStudentPortfolio,
  exportPortfolio: exports.exportPortfolio,
  getSchoolAnalytics: exports.getSchoolAnalytics,
  computeNationalAnalytics: exports.computeNationalAnalytics
}
