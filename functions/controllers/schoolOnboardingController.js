/**
 * School Onboarding Controller
 * Self-service school registration and automated provisioning
 * Phase 6: National Scale Infrastructure
 * 
 * @module controllers/schoolOnboardingController
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })

// Lazy initialization - db is accessed only when functions are called
const getDb = () => admin.firestore()

// School registration status
const REGISTRATION_STATUS = {
  PENDING: 'pending',
  VERIFYING: 'verifying',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PROVISIONED: 'provisioned'
}

// School types in Thai education system
const SCHOOL_TYPES = {
  PRIMARY: 'primary',        // ประถมศึกษา
  SECONDARY: 'secondary',    // มัธยมศึกษา
  COMBINED: 'combined',      // ประถม-มัธยม
  VOCATIONAL: 'vocational',  // อาชีวศึกษา
  SPECIAL: 'special'         // การศึกษาพิเศษ
}

/**
 * Register School
 * Self-service school registration
 */
exports.registerSchool = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' })
      }

      const {
        schoolName,
        schoolCode,          // รหัสโรงเรียน (OBEC code)
        schoolType,
        esaId,              // เขตพื้นที่การศึกษา
        province,
        district,
        subdistrict,
        address,
        postalCode,
        phoneNumber,
        email,
        website,
        
        // Contact person
        directorName,
        directorEmail,
        directorPhone,
        
        // Registering user info
        registrantName,
        registrantEmail,
        registrantRole,
        registrantPhone,
        
        // School stats
        studentCount,
        teacherCount,
        gradeRange           // เช่น "ป.1-ป.6" หรือ "ม.1-ม.6"
      } = req.body

      // Validate required fields
      if (!schoolName || !schoolCode || !esaId || !registrantEmail) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: schoolName, schoolCode, esaId, registrantEmail' 
        })
      }

      // Check if school already registered
      const existingSchool = await getDb().collection('schools')
        .where('schoolCode', '==', schoolCode)
        .limit(1)
        .get()

      if (!existingSchool.empty) {
        return res.status(409).json({ 
          success: false, 
          error: 'School with this code already registered',
          existingSchoolId: existingSchool.docs[0].id
        })
      }

      // Check if registration request exists
      const existingRequest = await getDb().collection('schoolRegistrations')
        .where('schoolCode', '==', schoolCode)
        .where('status', 'in', ['pending', 'verifying'])
        .limit(1)
        .get()

      if (!existingRequest.empty) {
        return res.status(409).json({ 
          success: false, 
          error: 'Registration request already exists',
          requestId: existingRequest.docs[0].id,
          status: existingRequest.docs[0].data().status
        })
      }

      // Create registration request
      const registrationId = `REG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
      
      const registrationData = {
        registrationId,
        
        // School info
        schoolName,
        schoolCode,
        schoolType: schoolType || SCHOOL_TYPES.COMBINED,
        esaId,
        province: province || '',
        district: district || '',
        subdistrict: subdistrict || '',
        address: address || '',
        postalCode: postalCode || '',
        phoneNumber: phoneNumber || '',
        email: email || '',
        website: website || '',
        
        // Director info
        directorName: directorName || '',
        directorEmail: directorEmail || '',
        directorPhone: directorPhone || '',
        
        // Registrant info
        registrantName: registrantName || '',
        registrantEmail,
        registrantRole: registrantRole || 'teacher',
        registrantPhone: registrantPhone || '',
        
        // School stats
        studentCount: studentCount || 0,
        teacherCount: teacherCount || 0,
        gradeRange: gradeRange || '',
        
        // Status tracking
        status: REGISTRATION_STATUS.PENDING,
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        verifiedAt: null,
        approvedAt: null,
        provisionedAt: null,
        
        // Verification
        verificationCode: generateVerificationCode(),
        verificationSentAt: null,
        verificationAttempts: 0,
        
        // Notes
        internalNotes: [],
        rejectionReason: null
      }

      await getDb().collection('schoolRegistrations').doc(registrationId).set(registrationData)

      // Log event
      await logOnboardingEvent({
        type: 'registration_submitted',
        registrationId,
        schoolCode,
        schoolName,
        registrantEmail
      })

      // TODO: Send verification email to registrant

      return res.status(201).json({
        success: true,
        registrationId,
        status: REGISTRATION_STATUS.PENDING,
        message: 'Registration submitted successfully. Verification email will be sent shortly.',
        nextSteps: [
          'ตรวจสอบอีเมลเพื่อยืนยันการลงทะเบียน',
          'รอการอนุมัติจากเขตพื้นที่การศึกษา',
          'เมื่ออนุมัติแล้ว จะได้รับข้อมูลการเข้าใช้งาน'
        ]
      })

    } catch (error) {
      console.error('Error in registerSchool:', error)
      return res.status(500).json({ success: false, error: error.message })
    }
  })
})

/**
 * Verify Registration Email
 */
exports.verifyRegistration = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const { registrationId, verificationCode } = req.body

      if (!registrationId || !verificationCode) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing registrationId or verificationCode' 
        })
      }

      const regDoc = await getDb().collection('schoolRegistrations').doc(registrationId).get()

      if (!regDoc.exists) {
        return res.status(404).json({ success: false, error: 'Registration not found' })
      }

      const regData = regDoc.data()

      // Check if already verified
      if (regData.status !== REGISTRATION_STATUS.PENDING) {
        return res.status(400).json({ 
          success: false, 
          error: 'Registration already processed',
          status: regData.status
        })
      }

      // Check verification attempts
      if (regData.verificationAttempts >= 5) {
        await regDoc.ref.update({
          status: REGISTRATION_STATUS.REJECTED,
          rejectionReason: 'Too many verification attempts'
        })
        return res.status(403).json({ 
          success: false, 
          error: 'Too many verification attempts. Please submit a new registration.' 
        })
      }

      // Verify code
      if (regData.verificationCode !== verificationCode.toUpperCase()) {
        await regDoc.ref.update({
          verificationAttempts: admin.firestore.FieldValue.increment(1)
        })
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid verification code',
          attemptsRemaining: 4 - regData.verificationAttempts
        })
      }

      // Update status to verifying (awaiting ESA approval)
      await regDoc.ref.update({
        status: REGISTRATION_STATUS.VERIFYING,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      await logOnboardingEvent({
        type: 'registration_verified',
        registrationId,
        schoolCode: regData.schoolCode
      })

      return res.json({
        success: true,
        status: REGISTRATION_STATUS.VERIFYING,
        message: 'Email verified successfully. Awaiting ESA approval.',
        nextSteps: [
          'การลงทะเบียนส่งไปยังเขตพื้นที่การศึกษาแล้ว',
          'รอการอนุมัติภายใน 3-5 วันทำการ',
          'จะได้รับแจ้งผลทางอีเมลเมื่อมีการอนุมัติ'
        ]
      })

    } catch (error) {
      console.error('Error in verifyRegistration:', error)
      return res.status(500).json({ success: false, error: error.message })
    }
  })
})

/**
 * Approve School Registration (ESA Admin)
 */
exports.approveRegistration = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' })
      }

      const { registrationId, approvedBy, internalNotes } = req.body

      if (!registrationId || !approvedBy) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing registrationId or approvedBy' 
        })
      }

      const regDoc = await getDb().collection('schoolRegistrations').doc(registrationId).get()

      if (!regDoc.exists) {
        return res.status(404).json({ success: false, error: 'Registration not found' })
      }

      const regData = regDoc.data()

      if (regData.status !== REGISTRATION_STATUS.VERIFYING) {
        return res.status(400).json({ 
          success: false, 
          error: `Cannot approve registration with status: ${regData.status}` 
        })
      }

      // Begin provisioning
      const batch = getDb().batch()

      // Update registration status
      batch.update(regDoc.ref, {
        status: REGISTRATION_STATUS.APPROVED,
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        approvedBy,
        internalNotes: admin.firestore.FieldValue.arrayUnion({
          note: internalNotes || 'Approved',
          by: approvedBy,
          at: new Date().toISOString()
        })
      })

      await batch.commit()

      // Trigger provisioning
      const provisionResult = await provisionSchool(registrationId, regData)

      await logOnboardingEvent({
        type: 'registration_approved',
        registrationId,
        schoolCode: regData.schoolCode,
        approvedBy,
        provisionResult: provisionResult.success
      })

      return res.json({
        success: true,
        registrationId,
        status: provisionResult.success ? REGISTRATION_STATUS.PROVISIONED : REGISTRATION_STATUS.APPROVED,
        schoolId: provisionResult.schoolId,
        message: provisionResult.success 
          ? 'School approved and provisioned successfully'
          : 'School approved, provisioning pending'
      })

    } catch (error) {
      console.error('Error in approveRegistration:', error)
      return res.status(500).json({ success: false, error: error.message })
    }
  })
})

/**
 * Reject School Registration (ESA Admin)
 */
exports.rejectRegistration = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' })
      }

      const { registrationId, rejectedBy, reason } = req.body

      if (!registrationId || !rejectedBy || !reason) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing registrationId, rejectedBy, or reason' 
        })
      }

      const regDoc = await getDb().collection('schoolRegistrations').doc(registrationId).get()

      if (!regDoc.exists) {
        return res.status(404).json({ success: false, error: 'Registration not found' })
      }

      const regData = regDoc.data()

      await regDoc.ref.update({
        status: REGISTRATION_STATUS.REJECTED,
        rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
        rejectedBy,
        rejectionReason: reason,
        internalNotes: admin.firestore.FieldValue.arrayUnion({
          note: `Rejected: ${reason}`,
          by: rejectedBy,
          at: new Date().toISOString()
        })
      })

      await logOnboardingEvent({
        type: 'registration_rejected',
        registrationId,
        schoolCode: regData.schoolCode,
        rejectedBy,
        reason
      })

      // TODO: Send rejection email to registrant

      return res.json({
        success: true,
        status: REGISTRATION_STATUS.REJECTED,
        message: 'Registration rejected'
      })

    } catch (error) {
      console.error('Error in rejectRegistration:', error)
      return res.status(500).json({ success: false, error: error.message })
    }
  })
})

/**
 * Get Registration Status
 */
exports.getRegistrationStatus = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const registrationId = req.query.registrationId || req.body?.registrationId

      if (!registrationId) {
        return res.status(400).json({ success: false, error: 'Missing registrationId' })
      }

      const regDoc = await getDb().collection('schoolRegistrations').doc(registrationId).get()

      if (!regDoc.exists) {
        return res.status(404).json({ success: false, error: 'Registration not found' })
      }

      const regData = regDoc.data()

      // Return sanitized status (no internal info)
      return res.json({
        success: true,
        registration: {
          registrationId,
          schoolName: regData.schoolName,
          schoolCode: regData.schoolCode,
          status: regData.status,
          submittedAt: regData.submittedAt,
          verifiedAt: regData.verifiedAt,
          approvedAt: regData.approvedAt,
          provisionedAt: regData.provisionedAt,
          rejectionReason: regData.status === REGISTRATION_STATUS.REJECTED ? regData.rejectionReason : null
        },
        statusInfo: getStatusInfo(regData.status)
      })

    } catch (error) {
      console.error('Error in getRegistrationStatus:', error)
      return res.status(500).json({ success: false, error: error.message })
    }
  })
})

/**
 * Get Pending Registrations for ESA Admin
 */
exports.getPendingRegistrations = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const { esaId, status, limit = 50 } = req.query

      let query = getDb().collection('schoolRegistrations')

      if (esaId) {
        query = query.where('esaId', '==', esaId)
      }

      if (status) {
        query = query.where('status', '==', status)
      } else {
        // Default: show verifying (awaiting approval)
        query = query.where('status', '==', REGISTRATION_STATUS.VERIFYING)
      }

      query = query.orderBy('submittedAt', 'desc').limit(parseInt(limit))

      const snapshot = await query.get()

      const registrations = []
      snapshot.forEach(doc => {
        const data = doc.data()
        registrations.push({
          registrationId: doc.id,
          schoolName: data.schoolName,
          schoolCode: data.schoolCode,
          schoolType: data.schoolType,
          esaId: data.esaId,
          province: data.province,
          registrantName: data.registrantName,
          registrantEmail: data.registrantEmail,
          studentCount: data.studentCount,
          teacherCount: data.teacherCount,
          status: data.status,
          submittedAt: data.submittedAt,
          verifiedAt: data.verifiedAt
        })
      })

      return res.json({
        success: true,
        registrations,
        total: registrations.length
      })

    } catch (error) {
      console.error('Error in getPendingRegistrations:', error)
      return res.status(500).json({ success: false, error: error.message })
    }
  })
})

/**
 * Provision School
 * Create school record and initial resources
 */
async function provisionSchool(registrationId, regData) {
  try {
    const schoolId = `SCHOOL-${regData.schoolCode}`
    
    const batch = getDb().batch()

    // Create school document
    const schoolData = {
      id: schoolId,
      name: regData.schoolName,
      schoolCode: regData.schoolCode,
      schoolType: regData.schoolType,
      esaId: regData.esaId,
      province: regData.province,
      district: regData.district,
      subdistrict: regData.subdistrict,
      address: regData.address,
      postalCode: regData.postalCode,
      phoneNumber: regData.phoneNumber,
      email: regData.email,
      website: regData.website,
      
      directorName: regData.directorName,
      directorEmail: regData.directorEmail,
      directorPhone: regData.directorPhone,
      
      studentCount: regData.studentCount,
      teacherCount: regData.teacherCount,
      gradeRange: regData.gradeRange,
      
      status: 'active',
      tier: 'free',           // Start with free tier
      features: ['assessment', 'basic_analytics'],
      
      registrationId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
      
      // Analytics defaults
      totalAssessments: 0,
      avgScore: 0,
      lastActiveAt: null
    }

    batch.set(db.collection('schools').doc(schoolId), schoolData)

    // Create admin user for registrant (if not exists)
    const existingUser = await getDb().collection('users')
      .where('email', '==', regData.registrantEmail)
      .limit(1)
      .get()

    if (existingUser.empty) {
      // Create user placeholder - will be updated when user signs in with Google
      const userId = `pending-${Date.now()}`
      batch.set(db.collection('users').doc(userId), {
        email: regData.registrantEmail,
        displayName: regData.registrantName,
        role: 'teacher',
        schoolId,
        schoolName: regData.schoolName,
        esaId: regData.esaId,
        status: 'pending',      // Will be activated on first Google sign-in
        isSchoolAdmin: true,    // First user is school admin
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
    } else {
      // Update existing user with school info
      const existingDoc = existingUser.docs[0]
      batch.update(existingDoc.ref, {
        schoolId,
        schoolName: regData.schoolName,
        esaId: regData.esaId,
        isSchoolAdmin: true
      })
    }

    // Create school settings document
    batch.set(db.collection('schoolSettings').doc(schoolId), {
      schoolId,
      
      // Assessment settings
      assessmentSettings: {
        defaultModel: 'gpt-4o-mini',
        maxDailyAssessments: 100,
        enableAdaptiveDifficulty: true,
        enableScaffolding: true
      },
      
      // Notification settings
      notifications: {
        emailReports: true,
        weeklyDigest: true,
        alertThreshold: 8         // Alert if score below this
      },
      
      // Display settings
      display: {
        theme: 'light',
        language: 'th',
        showLeaderboard: true,
        showBadges: true
      },
      
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })

    // Update registration status
    batch.update(db.collection('schoolRegistrations').doc(registrationId), {
      status: REGISTRATION_STATUS.PROVISIONED,
      provisionedAt: admin.firestore.FieldValue.serverTimestamp(),
      schoolId
    })

    await batch.commit()

    // Log provisioning event
    await logOnboardingEvent({
      type: 'school_provisioned',
      registrationId,
      schoolId,
      schoolCode: regData.schoolCode,
      features: schoolData.features
    })

    // TODO: Send welcome email with login instructions

    return {
      success: true,
      schoolId,
      message: 'School provisioned successfully'
    }

  } catch (error) {
    console.error('Error provisioning school:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get Onboarding Analytics
 * Statistics for ESA/Ministry admin
 */
exports.getOnboardingAnalytics = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const { esaId, timeRange = '30d' } = req.query

      // Calculate date range
      const days = parseInt(timeRange) || 30
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      let query = getDb().collection('schoolRegistrations')

      if (esaId) {
        query = query.where('esaId', '==', esaId)
      }

      const snapshot = await query.get()

      // Calculate stats
      const stats = {
        total: 0,
        byStatus: {
          pending: 0,
          verifying: 0,
          approved: 0,
          rejected: 0,
          provisioned: 0
        },
        bySchoolType: {},
        recentSubmissions: 0,
        avgProcessingDays: 0
      }

      let totalProcessingMs = 0
      let processedCount = 0

      snapshot.forEach(doc => {
        const data = doc.data()
        stats.total++
        
        // Count by status
        stats.byStatus[data.status] = (stats.byStatus[data.status] || 0) + 1
        
        // Count by school type
        const type = data.schoolType || 'unknown'
        stats.bySchoolType[type] = (stats.bySchoolType[type] || 0) + 1
        
        // Count recent
        if (data.submittedAt?.toDate && data.submittedAt.toDate() >= startDate) {
          stats.recentSubmissions++
        }
        
        // Calculate processing time
        if (data.submittedAt && data.provisionedAt) {
          const submitted = data.submittedAt.toDate?.() || new Date(data.submittedAt)
          const provisioned = data.provisionedAt.toDate?.() || new Date(data.provisionedAt)
          totalProcessingMs += provisioned - submitted
          processedCount++
        }
      })

      if (processedCount > 0) {
        stats.avgProcessingDays = (totalProcessingMs / processedCount / (1000 * 60 * 60 * 24)).toFixed(1)
      }

      // Calculate conversion rates
      stats.conversionRates = {
        verificationRate: stats.total > 0 
          ? ((stats.byStatus.verifying + stats.byStatus.approved + stats.byStatus.provisioned) / stats.total * 100).toFixed(1) + '%'
          : '0%',
        approvalRate: (stats.byStatus.verifying + stats.byStatus.approved + stats.byStatus.provisioned) > 0
          ? ((stats.byStatus.approved + stats.byStatus.provisioned) / (stats.byStatus.verifying + stats.byStatus.approved + stats.byStatus.provisioned) * 100).toFixed(1) + '%'
          : '0%',
        provisionRate: stats.byStatus.approved > 0
          ? (stats.byStatus.provisioned / (stats.byStatus.approved + stats.byStatus.provisioned) * 100).toFixed(1) + '%'
          : '0%'
      }

      return res.json({
        success: true,
        analytics: stats,
        timeRange: `${days} days`,
        generatedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error in getOnboardingAnalytics:', error)
      return res.status(500).json({ success: false, error: error.message })
    }
  })
})

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Generate verification code
 */
function generateVerificationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Get status info for user display
 */
function getStatusInfo(status) {
  const statusMap = {
    [REGISTRATION_STATUS.PENDING]: {
      title: 'รอยืนยันอีเมล',
      description: 'กรุณาตรวจสอบอีเมลและกรอกรหัสยืนยัน',
      color: 'warning'
    },
    [REGISTRATION_STATUS.VERIFYING]: {
      title: 'รอการอนุมัติ',
      description: 'การลงทะเบียนอยู่ระหว่างการพิจารณาจากเขตพื้นที่การศึกษา',
      color: 'info'
    },
    [REGISTRATION_STATUS.APPROVED]: {
      title: 'อนุมัติแล้ว',
      description: 'กำลังตั้งค่าระบบสำหรับโรงเรียน',
      color: 'success'
    },
    [REGISTRATION_STATUS.REJECTED]: {
      title: 'ไม่ผ่านการอนุมัติ',
      description: 'กรุณาติดต่อเขตพื้นที่การศึกษาสำหรับรายละเอียดเพิ่มเติม',
      color: 'error'
    },
    [REGISTRATION_STATUS.PROVISIONED]: {
      title: 'พร้อมใช้งาน',
      description: 'โรงเรียนพร้อมเข้าใช้งานระบบ HOTS AI ChatLoop',
      color: 'success'
    }
  }
  
  return statusMap[status] || {
    title: 'ไม่ทราบสถานะ',
    description: 'กรุณาติดต่อผู้ดูแลระบบ',
    color: 'gray'
  }
}

/**
 * Log onboarding event
 */
async function logOnboardingEvent(event) {
  try {
    await getDb().collection('onboardingEvents').add({
      ...event,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    })
  } catch (error) {
    console.error('Error logging onboarding event:', error)
  }
}

module.exports = exports
