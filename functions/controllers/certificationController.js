/**
 * Teacher Certification Controller
 * จัดการ Digital Badge, Certification, Training Modules
 * 
 * Phase 6: National Scale Teacher Network
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })

const {
  CERTIFICATION_LEVELS,
  BADGE_TYPES,
  CertificationManager,
  BadgeIssuer
} = require('../utils/digitalBadgeCertification')

const getDb = () => admin.firestore()

/**
 * Get Teacher Certification Status
 * GET /getTeacherCertification
 */
exports.getTeacherCertification = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { teacherId } = req.method === 'GET' ? req.query : req.body
      const db = getDb()

      if (!teacherId) {
        return res.status(400).send({ error: 'teacherId required' })
      }

      // Get teacher's calibration history
      const calibrationsSnap = await db.collection('calibrations')
        .where('expertId', '==', teacherId)
        .orderBy('createdAt', 'desc')
        .get()

      // Get existing certifications
      const certsSnap = await db.collection('certifications')
        .where('userId', '==', teacherId)
        .where('status', '==', 'active')
        .get()

      // Calculate metrics
      let totalCalibrations = calibrationsSnap.size
      let kappaSum = 0
      let accuracySum = 0
      let validCalibrations = 0

      calibrationsSnap.forEach(doc => {
        const data = doc.data()
        if (data.kappa !== undefined) {
          kappaSum += data.kappa
          validCalibrations++
        }
        if (data.accuracy !== undefined) {
          accuracySum += data.accuracy
        }
      })

      const avgKappa = validCalibrations > 0 ? kappaSum / validCalibrations : 0
      const avgAccuracy = validCalibrations > 0 ? accuracySum / validCalibrations : 0

      // Determine current and next level
      let currentLevel = null
      let nextLevel = null

      const levels = Object.values(CERTIFICATION_LEVELS)
      for (let i = levels.length - 1; i >= 0; i--) {
        const level = levels[i]
        if (
          totalCalibrations >= level.requirements.minCalibrations &&
          avgKappa >= level.requirements.minKappa &&
          avgAccuracy >= level.requirements.minAccuracy
        ) {
          currentLevel = level
          nextLevel = levels[i + 1] || null
          break
        }
      }

      // If no level achieved, next level is Bronze
      if (!currentLevel) {
        nextLevel = CERTIFICATION_LEVELS.BRONZE
      }

      // Get active badges
      const activeBadges = []
      certsSnap.forEach(doc => {
        activeBadges.push({
          id: doc.id,
          ...doc.data(),
          expiresAt: doc.data().expiresAt?.toDate?.() || null
        })
      })

      res.status(200).send({
        success: true,
        certification: {
          teacherId,
          currentLevel: currentLevel ? {
            id: currentLevel.id,
            name: currentLevel.name,
            nameTh: currentLevel.nameTh,
            icon: currentLevel.icon,
            color: currentLevel.color
          } : null,
          nextLevel: nextLevel ? {
            id: nextLevel.id,
            name: nextLevel.name,
            nameTh: nextLevel.nameTh,
            requirements: nextLevel.requirements
          } : null,
          progress: {
            calibrations: totalCalibrations,
            avgKappa: Math.round(avgKappa * 100) / 100,
            avgAccuracy: Math.round(avgAccuracy * 100) / 100,
            toNextLevel: nextLevel ? {
              calibrationsNeeded: Math.max(0, nextLevel.requirements.minCalibrations - totalCalibrations),
              kappaNeeded: Math.max(0, nextLevel.requirements.minKappa - avgKappa),
              accuracyNeeded: Math.max(0, nextLevel.requirements.minAccuracy - avgAccuracy)
            } : null
          },
          activeBadges
        }
      })
    } catch (error) {
      console.error('Error getting teacher certification:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Issue Digital Badge
 * POST /issueBadge
 */
exports.issueBadge = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { teacherId, badgeType, issuerId } = req.body
      const db = getDb()

      if (!teacherId || !badgeType) {
        return res.status(400).send({ error: 'teacherId and badgeType required' })
      }

      const level = CERTIFICATION_LEVELS[badgeType.toUpperCase()]
      if (!level) {
        return res.status(400).send({ error: 'Invalid badge type' })
      }

      // Verify teacher meets requirements
      const calibrationsSnap = await db.collection('calibrations')
        .where('expertId', '==', teacherId)
        .get()

      let kappaSum = 0
      let count = 0
      calibrationsSnap.forEach(doc => {
        const data = doc.data()
        if (data.kappa !== undefined) {
          kappaSum += data.kappa
          count++
        }
      })

      const avgKappa = count > 0 ? kappaSum / count : 0

      if (
        calibrationsSnap.size < level.requirements.minCalibrations ||
        avgKappa < level.requirements.minKappa
      ) {
        return res.status(400).send({
          error: 'Requirements not met',
          current: {
            calibrations: calibrationsSnap.size,
            avgKappa: Math.round(avgKappa * 100) / 100
          },
          required: level.requirements
        })
      }

      // Create certificate
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + level.validityDays)

      const certificateData = {
        userId: teacherId,
        level: level.id,
        levelName: level.name,
        levelNameTh: level.nameTh,
        icon: level.icon,
        color: level.color,
        issuedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
        issuedBy: issuerId || 'system',
        status: 'active',
        metrics: {
          calibrations: calibrationsSnap.size,
          avgKappa: Math.round(avgKappa * 100) / 100
        },
        verificationCode: generateVerificationCode()
      }

      const certRef = await db.collection('certifications').add(certificateData)

      // Update user profile
      await db.collection('users').doc(teacherId).update({
        'certification.currentLevel': level.id,
        'certification.latestBadgeId': certRef.id,
        'certification.updatedAt': admin.firestore.FieldValue.serverTimestamp()
      })

      res.status(200).send({
        success: true,
        certificate: {
          id: certRef.id,
          level: level.id,
          name: level.name,
          nameTh: level.nameTh,
          icon: level.icon,
          expiresAt: expiresAt.toISOString(),
          verificationCode: certificateData.verificationCode
        },
        message: `🎉 ยินดีด้วย! คุณได้รับ ${level.nameTh}`
      })
    } catch (error) {
      console.error('Error issuing badge:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Verify Badge
 * GET /verifyBadge
 */
exports.verifyBadge = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { verificationCode, certificateId } = req.method === 'GET' ? req.query : req.body
      const db = getDb()

      let certDoc

      if (verificationCode) {
        const certsSnap = await db.collection('certifications')
          .where('verificationCode', '==', verificationCode)
          .limit(1)
          .get()
        
        if (certsSnap.empty) {
          return res.status(404).send({ 
            success: false, 
            valid: false,
            error: 'Certificate not found' 
          })
        }
        certDoc = certsSnap.docs[0]
      } else if (certificateId) {
        certDoc = await db.collection('certifications').doc(certificateId).get()
        if (!certDoc.exists) {
          return res.status(404).send({ 
            success: false, 
            valid: false,
            error: 'Certificate not found' 
          })
        }
      } else {
        return res.status(400).send({ error: 'verificationCode or certificateId required' })
      }

      const cert = certDoc.data()
      const now = new Date()
      const expiresAt = cert.expiresAt?.toDate?.() || new Date(cert.expiresAt)
      const isExpired = now > expiresAt

      // Get teacher info
      const teacherDoc = await db.collection('users').doc(cert.userId).get()
      const teacher = teacherDoc.exists ? teacherDoc.data() : null

      res.status(200).send({
        success: true,
        valid: cert.status === 'active' && !isExpired,
        certificate: {
          id: certDoc.id,
          level: cert.level,
          levelName: cert.levelName,
          levelNameTh: cert.levelNameTh,
          icon: cert.icon,
          issuedAt: cert.issuedAt?.toDate?.()?.toISOString() || null,
          expiresAt: expiresAt.toISOString(),
          status: isExpired ? 'expired' : cert.status,
          holder: teacher ? {
            name: teacher.displayName || teacher.name,
            school: teacher.schoolName || null,
            province: teacher.province || null
          } : null
        }
      })
    } catch (error) {
      console.error('Error verifying badge:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Get Training Modules
 * GET /getTrainingModules
 */
exports.getTrainingModules = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const db = getDb()

      // Get all training modules
      const modulesSnap = await db.collection('trainingModules')
        .orderBy('order', 'asc')
        .get()

      if (modulesSnap.empty) {
        // Return default modules if none exist
        const defaultModules = [
          {
            id: 'module-1',
            title: 'บทนำ: กรอบแนวคิด A.R.C.E.',
            titleEn: 'Introduction to A.R.C.E. Framework',
            description: 'ทำความเข้าใจ 4 มิติของการประเมินทักษะการคิดขั้นสูง',
            duration: 30,
            order: 1,
            type: 'video',
            status: 'active'
          },
          {
            id: 'module-2',
            title: 'การให้คะแนนมิติ Analysis',
            titleEn: 'Scoring the Analysis Dimension',
            description: 'เรียนรู้เกณฑ์และตัวอย่างการให้คะแนนด้านการวิเคราะห์',
            duration: 45,
            order: 2,
            type: 'interactive',
            status: 'active'
          },
          {
            id: 'module-3',
            title: 'การให้คะแนนมิติ Reasoning',
            titleEn: 'Scoring the Reasoning Dimension',
            description: 'เรียนรู้เกณฑ์และตัวอย่างการให้คะแนนด้านการให้เหตุผล',
            duration: 45,
            order: 3,
            type: 'interactive',
            status: 'active'
          },
          {
            id: 'module-4',
            title: 'การให้คะแนนมิติ Creativity',
            titleEn: 'Scoring the Creativity Dimension',
            description: 'เรียนรู้เกณฑ์และตัวอย่างการให้คะแนนด้านความคิดสร้างสรรค์',
            duration: 45,
            order: 4,
            type: 'interactive',
            status: 'active'
          },
          {
            id: 'module-5',
            title: 'การให้คะแนนมิติ Evidence',
            titleEn: 'Scoring the Evidence Dimension',
            description: 'เรียนรู้เกณฑ์และตัวอย่างการให้คะแนนด้านหลักฐาน',
            duration: 45,
            order: 5,
            type: 'interactive',
            status: 'active'
          },
          {
            id: 'module-6',
            title: 'การ Calibrate กับระบบ AI',
            titleEn: 'Calibration with AI System',
            description: 'ฝึกประเมินและเปรียบเทียบกับ AI เพื่อสร้างความสอดคล้อง',
            duration: 60,
            order: 6,
            type: 'practice',
            status: 'active'
          },
          {
            id: 'module-7',
            title: 'แบบทดสอบรับรอง',
            titleEn: 'Certification Assessment',
            description: 'ทดสอบความเข้าใจและทักษะการประเมินเพื่อรับ Badge',
            duration: 30,
            order: 7,
            type: 'assessment',
            status: 'active'
          }
        ]

        return res.status(200).send({
          success: true,
          modules: defaultModules,
          totalDuration: defaultModules.reduce((sum, m) => sum + m.duration, 0)
        })
      }

      const modules = []
      modulesSnap.forEach(doc => {
        modules.push({ id: doc.id, ...doc.data() })
      })

      res.status(200).send({
        success: true,
        modules,
        totalDuration: modules.reduce((sum, m) => sum + (m.duration || 0), 0)
      })
    } catch (error) {
      console.error('Error getting training modules:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Submit Calibration Exercise
 * POST /submitCalibration
 */
exports.submitCalibration = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { teacherId, sampleId, teacherScores, timeSpent } = req.body
      const db = getDb()

      if (!teacherId || !sampleId || !teacherScores) {
        return res.status(400).send({ 
          error: 'teacherId, sampleId, and teacherScores required' 
        })
      }

      // Get golden sample
      const sampleDoc = await db.collection('goldenDataset').doc(sampleId).get()
      if (!sampleDoc.exists) {
        return res.status(404).send({ error: 'Sample not found' })
      }

      const sample = sampleDoc.data()
      const expertScores = sample.expertScores || sample.aiScores

      // Calculate differences
      const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
      let totalDiff = 0
      const diffs = {}

      dimensions.forEach(dim => {
        const diff = Math.abs((teacherScores[dim] || 0) - (expertScores[dim] || 0))
        diffs[dim] = diff
        totalDiff += diff
      })

      const accuracy = Math.max(0, 100 - (totalDiff * 5)) // 5% penalty per point diff
      const mae = totalDiff / 4 // Mean Absolute Error

      // Calculate Cohen's Kappa (simplified)
      const kappa = calculateSimpleKappa(teacherScores, expertScores)

      // Save calibration
      const calibrationData = {
        expertId: teacherId,
        sampleId,
        teacherScores,
        expertScores,
        differences: diffs,
        accuracy,
        mae,
        kappa,
        timeSpent: timeSpent || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }

      await db.collection('calibrations').add(calibrationData)

      // Update teacher stats
      const teacherRef = db.collection('users').doc(teacherId)
      await teacherRef.update({
        'calibrationStats.totalCalibrations': admin.firestore.FieldValue.increment(1),
        'calibrationStats.lastCalibration': admin.firestore.FieldValue.serverTimestamp()
      })

      // Generate feedback
      const feedback = generateCalibrationFeedback(diffs, accuracy)

      res.status(200).send({
        success: true,
        result: {
          accuracy,
          kappa: Math.round(kappa * 100) / 100,
          mae: Math.round(mae * 100) / 100,
          differences: diffs,
          feedback
        }
      })
    } catch (error) {
      console.error('Error submitting calibration:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Get Certification Leaderboard
 * GET /getCertificationLeaderboard
 */
exports.getCertificationLeaderboard = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { limit = 20, level } = req.method === 'GET' ? req.query : req.body
      const db = getDb()

      // Get all teachers with certifications
      let query = db.collection('users')
        .where('role', '==', 'teacher')
        .where('certification.currentLevel', '!=', null)
        .orderBy('certification.currentLevel')
        .limit(parseInt(limit))

      const teachersSnap = await query.get()
      const leaderboard = []

      const levelOrder = { expert: 5, master: 4, gold: 3, silver: 2, bronze: 1 }

      teachersSnap.forEach(doc => {
        const data = doc.data()
        if (level && data.certification?.currentLevel !== level) return

        leaderboard.push({
          teacherId: doc.id,
          name: data.displayName || data.name || 'ครู',
          school: data.schoolName || null,
          province: data.province || null,
          level: data.certification?.currentLevel,
          levelIcon: CERTIFICATION_LEVELS[data.certification?.currentLevel?.toUpperCase()]?.icon || '📋',
          calibrations: data.calibrationStats?.totalCalibrations || 0
        })
      })

      // Sort by level (highest first), then by calibrations
      leaderboard.sort((a, b) => {
        const levelDiff = (levelOrder[b.level] || 0) - (levelOrder[a.level] || 0)
        if (levelDiff !== 0) return levelDiff
        return b.calibrations - a.calibrations
      })

      // Add rank
      leaderboard.forEach((entry, index) => {
        entry.rank = index + 1
      })

      res.status(200).send({
        success: true,
        leaderboard,
        total: leaderboard.length
      })
    } catch (error) {
      console.error('Error getting certification leaderboard:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

// ============ Helper Functions ============

function generateVerificationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'HOTS-'
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function calculateSimpleKappa(scores1, scores2) {
  // Simplified weighted kappa calculation
  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  let agreements = 0
  let totalWeight = 0

  dimensions.forEach(dim => {
    const diff = Math.abs((scores1[dim] || 0) - (scores2[dim] || 0))
    const weight = 1 - (diff / 5) // Max diff is 5
    agreements += weight
    totalWeight += 1
  })

  return agreements / totalWeight
}

function generateCalibrationFeedback(diffs, accuracy) {
  const feedback = []

  if (accuracy >= 90) {
    feedback.push('🌟 ยอดเยี่ยม! การประเมินของคุณตรงกับผู้เชี่ยวชาญมาก')
  } else if (accuracy >= 75) {
    feedback.push('👍 ดีมาก! คุณมีความเข้าใจในเกณฑ์การประเมินที่ดี')
  } else if (accuracy >= 60) {
    feedback.push('📚 ปานกลาง ลองศึกษาเกณฑ์เพิ่มเติมเพื่อพัฒนา')
  } else {
    feedback.push('📖 ควรทบทวนเกณฑ์การประเมินอีกครั้ง')
  }

  // Specific dimension feedback
  const dimensions = {
    analysis: 'การวิเคราะห์',
    reasoning: 'การให้เหตุผล',
    creativity: 'ความคิดสร้างสรรค์',
    evidence: 'หลักฐาน'
  }

  Object.entries(diffs).forEach(([dim, diff]) => {
    if (diff >= 2) {
      feedback.push(`⚠️ มิติ ${dimensions[dim]}: ต่างจากผู้เชี่ยวชาญ ${diff} คะแนน ลองทบทวนเกณฑ์`)
    }
  })

  return feedback
}
