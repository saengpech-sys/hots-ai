/**
 * 🏅 Digital Badge Certification System
 * 
 * ระบบรับรองผู้ประเมินมนุษย์ (Human-AI Co-Certification)
 * Blockchain-based Digital Badge สำหรับผู้เชี่ยวชาญ HOTS
 * 
 * Features:
 * 1. Certification Levels - ระดับการรับรอง
 * 2. Calibration Tracking - ติดตามการ Calibrate
 * 3. Badge Issuance - ออก Digital Badge
 * 4. Verification System - ระบบตรวจสอบความถูกต้อง
 * 5. Renewal & Expiration - ต่ออายุและหมดอายุ
 * 6. Leaderboard - อันดับผู้เชี่ยวชาญ
 * 
 * Impact for C10:
 * - สร้างเครือข่ายวิชาชีพ (Professional Community)
 * - มาตรฐานการประเมินได้รับการยอมรับในวงกว้าง
 * 
 * @version 1.0.0
 * @author HOTS-AI Research Team
 */

const crypto = require('crypto')

/**
 * 🎯 Certification Levels
 */
const CERTIFICATION_LEVELS = {
  BRONZE: {
    id: 'bronze',
    name: 'Bronze Assessor',
    nameTh: 'ผู้ประเมินระดับทองแดง',
    requirements: {
      minCalibrations: 10,
      minKappa: 0.60,
      minAccuracy: 70
    },
    validityDays: 180,
    color: '#CD7F32',
    icon: '🥉'
  },
  SILVER: {
    id: 'silver',
    name: 'Silver Assessor',
    nameTh: 'ผู้ประเมินระดับเงิน',
    requirements: {
      minCalibrations: 30,
      minKappa: 0.70,
      minAccuracy: 80
    },
    validityDays: 365,
    color: '#C0C0C0',
    icon: '🥈'
  },
  GOLD: {
    id: 'gold',
    name: 'Gold Assessor',
    nameTh: 'ผู้ประเมินระดับทอง',
    requirements: {
      minCalibrations: 50,
      minKappa: 0.80,
      minAccuracy: 85
    },
    validityDays: 365,
    color: '#FFD700',
    icon: '🥇'
  },
  MASTER: {
    id: 'master',
    name: 'Master Assessor',
    nameTh: 'ผู้เชี่ยวชาญการประเมิน',
    requirements: {
      minCalibrations: 100,
      minKappa: 0.85,
      minAccuracy: 90,
      minDimensionKappa: 0.75
    },
    validityDays: 730,
    color: '#E5E4E2',
    icon: '🏆'
  },
  EXPERT: {
    id: 'expert',
    name: 'Expert Assessor',
    nameTh: 'ผู้ทรงคุณวุฒิการประเมิน HOTS',
    requirements: {
      minCalibrations: 200,
      minKappa: 0.90,
      minAccuracy: 95,
      minDimensionKappa: 0.80,
      goldenContributions: 20
    },
    validityDays: 1095,
    color: '#B9F2FF',
    icon: '💎'
  }
}

/**
 * 🏅 Badge Types
 */
const BADGE_TYPES = {
  CERTIFICATION: 'certification',
  ACHIEVEMENT: 'achievement',
  CONTRIBUTION: 'contribution',
  SPECIAL: 'special'
}

/**
 * 🎖️ Achievement Badges
 */
const ACHIEVEMENT_BADGES = {
  FIRST_CALIBRATION: {
    id: 'first_calibration',
    name: 'First Calibration',
    nameTh: 'การ Calibrate ครั้งแรก',
    description: 'Completed first calibration session',
    descriptionTh: 'ทำการ Calibrate ครั้งแรกสำเร็จ',
    icon: '🎯',
    points: 10
  },
  PERFECT_MATCH: {
    id: 'perfect_match',
    name: 'Perfect Match',
    nameTh: 'ตรงเป๊ะ',
    description: 'Achieved 100% agreement with AI on a calibration',
    descriptionTh: 'ให้คะแนนตรงกับ AI 100%',
    icon: '✨',
    points: 25
  },
  STREAK_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    nameTh: 'นักสู้ 7 วัน',
    description: 'Calibrated for 7 consecutive days',
    descriptionTh: 'Calibrate ติดต่อกัน 7 วัน',
    icon: '🔥',
    points: 50
  },
  STREAK_30: {
    id: 'streak_30',
    name: 'Month Master',
    nameTh: 'เจ้าแห่งเดือน',
    description: 'Calibrated for 30 consecutive days',
    descriptionTh: 'Calibrate ติดต่อกัน 30 วัน',
    icon: '⚡',
    points: 200
  },
  GOLDEN_CONTRIBUTOR: {
    id: 'golden_contributor',
    name: 'Golden Contributor',
    nameTh: 'ผู้สนับสนุน Golden Dataset',
    description: 'Contributed to Golden Dataset',
    descriptionTh: 'มีส่วนร่วมสร้าง Golden Dataset',
    icon: '🌟',
    points: 100
  },
  DIMENSION_MASTER: {
    id: 'dimension_master',
    name: 'Dimension Master',
    nameTh: 'เจ้าแห่งมิติ',
    description: 'Achieved κ ≥ 0.85 in all dimensions',
    descriptionTh: 'ได้ κ ≥ 0.85 ในทุกมิติ',
    icon: '🎓',
    points: 150
  },
  MENTOR: {
    id: 'mentor',
    name: 'Mentor',
    nameTh: 'พี่เลี้ยง',
    description: 'Helped 5 teachers achieve certification',
    descriptionTh: 'ช่วยครู 5 คนได้รับการรับรอง',
    icon: '👨‍🏫',
    points: 300
  }
}

/**
 * 🔐 Digital Badge Manager
 */
class DigitalBadgeManager {
  constructor(db) {
    this.db = db
    this.collection = 'digitalBadges'
    this.certCollection = 'certifications'
    this.calibrationCollection = 'calibrationRecords'
  }

  /**
   * Check eligibility and issue certification
   */
  async processCertification(teacherId) {
    // Get teacher's calibration history
    const calibrationStats = await this.getCalibrationStats(teacherId)
    
    if (!calibrationStats.success) {
      return calibrationStats
    }

    // Check each level from highest to lowest
    const levels = ['EXPERT', 'MASTER', 'GOLD', 'SILVER', 'BRONZE']
    let qualifiedLevel = null

    for (const level of levels) {
      if (this.meetsRequirements(calibrationStats.stats, CERTIFICATION_LEVELS[level])) {
        qualifiedLevel = level
        break
      }
    }

    if (!qualifiedLevel) {
      return {
        success: false,
        eligible: false,
        currentStats: calibrationStats.stats,
        nextLevel: 'BRONZE',
        requirements: CERTIFICATION_LEVELS.BRONZE.requirements,
        gap: this.calculateGap(calibrationStats.stats, CERTIFICATION_LEVELS.BRONZE)
      }
    }

    // Check if already has this certification
    const existingCert = await this.getCurrentCertification(teacherId)
    
    if (existingCert && existingCert.level === qualifiedLevel && !existingCert.expired) {
      return {
        success: true,
        alreadyCertified: true,
        certification: existingCert
      }
    }

    // Issue new certification
    const certification = await this.issueCertification(teacherId, qualifiedLevel, calibrationStats.stats)

    return {
      success: true,
      newCertification: true,
      certification,
      upgraded: existingCert ? true : false,
      previousLevel: existingCert?.level
    }
  }

  /**
   * Get teacher's calibration statistics
   */
  async getCalibrationStats(teacherId) {
    const snapshot = await this.db.collection(this.calibrationCollection)
      .where('teacherId', '==', teacherId)
      .orderBy('createdAt', 'desc')
      .get()

    if (snapshot.empty) {
      return {
        success: false,
        error: 'No calibration records found'
      }
    }

    const records = []
    snapshot.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() })
    })

    // Calculate statistics
    const totalCalibrations = records.length
    const kappaValues = records.filter(r => r.kappa !== null).map(r => r.kappa)
    const avgKappa = kappaValues.length > 0 
      ? kappaValues.reduce((a, b) => a + b, 0) / kappaValues.length 
      : 0

    // Calculate accuracy (percentage of scores within 1 point)
    const accuracyScores = records.filter(r => r.accuracy !== null).map(r => r.accuracy)
    const avgAccuracy = accuracyScores.length > 0
      ? accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length
      : 0

    // Dimension-specific kappa
    const dimensionKappas = {
      analysis: this.calculateDimensionKappa(records, 'analysis'),
      reasoning: this.calculateDimensionKappa(records, 'reasoning'),
      creativity: this.calculateDimensionKappa(records, 'creativity'),
      evidence: this.calculateDimensionKappa(records, 'evidence')
    }
    const minDimensionKappa = Math.min(...Object.values(dimensionKappas).filter(k => k !== null))

    // Count golden contributions
    const goldenContributions = records.filter(r => r.contributedToGolden).length

    // Calculate streak
    const streak = this.calculateStreak(records)

    return {
      success: true,
      stats: {
        totalCalibrations,
        avgKappa: Math.round(avgKappa * 1000) / 1000,
        avgAccuracy: Math.round(avgAccuracy * 10) / 10,
        dimensionKappas,
        minDimensionKappa: minDimensionKappa !== Infinity ? minDimensionKappa : null,
        goldenContributions,
        currentStreak: streak.current,
        longestStreak: streak.longest,
        lastCalibration: records[0]?.createdAt,
        recentPerformance: this.calculateRecentPerformance(records.slice(0, 20))
      }
    }
  }

  /**
   * Calculate dimension-specific kappa
   */
  calculateDimensionKappa(records, dimension) {
    const dimRecords = records.filter(r => r.dimensionKappas?.[dimension] !== undefined)
    if (dimRecords.length < 5) return null
    
    const values = dimRecords.map(r => r.dimensionKappas[dimension])
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 1000) / 1000
  }

  /**
   * Calculate calibration streak
   */
  calculateStreak(records) {
    if (records.length === 0) return { current: 0, longest: 0 }

    const dates = records.map(r => {
      const d = new Date(r.createdAt)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })

    const uniqueDates = [...new Set(dates)].sort().reverse()
    
    let currentStreak = 1
    let longestStreak = 1
    let tempStreak = 1

    for (let i = 1; i < uniqueDates.length; i++) {
      const curr = new Date(uniqueDates[i - 1])
      const prev = new Date(uniqueDates[i])
      const diffDays = Math.floor((curr - prev) / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        tempStreak++
        if (i === 1) currentStreak = tempStreak
      } else {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
        if (i === 1) currentStreak = 1
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak)

    return { current: currentStreak, longest: longestStreak }
  }

  /**
   * Calculate recent performance trend
   */
  calculateRecentPerformance(recentRecords) {
    if (recentRecords.length < 5) return { trend: 'insufficient_data' }

    const recentKappas = recentRecords.slice(0, 10).map(r => r.kappa).filter(k => k !== null)
    const olderKappas = recentRecords.slice(10, 20).map(r => r.kappa).filter(k => k !== null)

    if (recentKappas.length < 3 || olderKappas.length < 3) {
      return { trend: 'insufficient_data' }
    }

    const recentAvg = recentKappas.reduce((a, b) => a + b, 0) / recentKappas.length
    const olderAvg = olderKappas.reduce((a, b) => a + b, 0) / olderKappas.length
    const change = recentAvg - olderAvg

    return {
      trend: change > 0.05 ? 'improving' : change < -0.05 ? 'declining' : 'stable',
      recentAvg: Math.round(recentAvg * 1000) / 1000,
      change: Math.round(change * 1000) / 1000
    }
  }

  /**
   * Check if teacher meets requirements for a level
   */
  meetsRequirements(stats, levelConfig) {
    const reqs = levelConfig.requirements

    if (stats.totalCalibrations < reqs.minCalibrations) return false
    if (stats.avgKappa < reqs.minKappa) return false
    if (stats.avgAccuracy < reqs.minAccuracy) return false
    
    if (reqs.minDimensionKappa && (!stats.minDimensionKappa || stats.minDimensionKappa < reqs.minDimensionKappa)) {
      return false
    }
    
    if (reqs.goldenContributions && stats.goldenContributions < reqs.goldenContributions) {
      return false
    }

    return true
  }

  /**
   * Calculate gap to next level
   */
  calculateGap(stats, levelConfig) {
    const reqs = levelConfig.requirements
    const gap = {}

    if (stats.totalCalibrations < reqs.minCalibrations) {
      gap.calibrations = reqs.minCalibrations - stats.totalCalibrations
    }
    if (stats.avgKappa < reqs.minKappa) {
      gap.kappa = Math.round((reqs.minKappa - stats.avgKappa) * 1000) / 1000
    }
    if (stats.avgAccuracy < reqs.minAccuracy) {
      gap.accuracy = Math.round((reqs.minAccuracy - stats.avgAccuracy) * 10) / 10
    }

    return gap
  }

  /**
   * Issue certification badge
   */
  async issueCertification(teacherId, level, stats) {
    const levelConfig = CERTIFICATION_LEVELS[level]
    const now = new Date()
    const expiresAt = new Date(now.getTime() + levelConfig.validityDays * 24 * 60 * 60 * 1000)

    // Generate unique badge ID with hash
    const badgeData = `${teacherId}-${level}-${now.toISOString()}`
    const badgeHash = crypto.createHash('sha256').update(badgeData).digest('hex')
    const badgeId = `HOTS-${level.substring(0, 1)}${badgeHash.substring(0, 8).toUpperCase()}`

    const certification = {
      badgeId,
      teacherId,
      level,
      levelName: levelConfig.name,
      levelNameTh: levelConfig.nameTh,
      icon: levelConfig.icon,
      color: levelConfig.color,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      validityDays: levelConfig.validityDays,
      expired: false,
      revoked: false,
      statsAtIssuance: {
        totalCalibrations: stats.totalCalibrations,
        avgKappa: stats.avgKappa,
        avgAccuracy: stats.avgAccuracy,
        dimensionKappas: stats.dimensionKappas
      },
      verificationHash: badgeHash,
      metadata: {
        version: '1.0',
        issuer: 'HOTS-AI System',
        standard: 'Open Badges 2.0'
      }
    }

    // Save to database
    await this.db.collection(this.certCollection).doc(badgeId).set(certification)

    // Also save to teacher's badge collection
    await this.db.collection('users').doc(teacherId)
      .collection('badges').doc(badgeId).set({
        type: BADGE_TYPES.CERTIFICATION,
        ...certification
      })

    return certification
  }

  /**
   * Get current certification for teacher
   */
  async getCurrentCertification(teacherId) {
    const snapshot = await this.db.collection(this.certCollection)
      .where('teacherId', '==', teacherId)
      .where('revoked', '==', false)
      .orderBy('issuedAt', 'desc')
      .limit(1)
      .get()

    if (snapshot.empty) return null

    const cert = snapshot.docs[0].data()
    cert.expired = new Date(cert.expiresAt) < new Date()

    return cert
  }

  /**
   * Verify certification badge
   */
  async verifyCertification(badgeId) {
    const doc = await this.db.collection(this.certCollection).doc(badgeId).get()

    if (!doc.exists) {
      return {
        valid: false,
        reason: 'Badge not found'
      }
    }

    const cert = doc.data()
    const now = new Date()

    if (cert.revoked) {
      return {
        valid: false,
        reason: 'Badge has been revoked',
        revokedAt: cert.revokedAt
      }
    }

    if (new Date(cert.expiresAt) < now) {
      return {
        valid: false,
        reason: 'Badge has expired',
        expiredAt: cert.expiresAt
      }
    }

    // Verify hash
    const badgeData = `${cert.teacherId}-${cert.level}-${cert.issuedAt}`
    const expectedHash = crypto.createHash('sha256').update(badgeData).digest('hex')

    if (expectedHash !== cert.verificationHash) {
      return {
        valid: false,
        reason: 'Badge verification failed - hash mismatch'
      }
    }

    return {
      valid: true,
      certification: {
        badgeId: cert.badgeId,
        level: cert.level,
        levelName: cert.levelName,
        levelNameTh: cert.levelNameTh,
        icon: cert.icon,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
        teacherId: cert.teacherId
      }
    }
  }

  /**
   * Award achievement badge
   */
  async awardAchievementBadge(teacherId, achievementId) {
    const achievement = ACHIEVEMENT_BADGES[achievementId]
    if (!achievement) {
      return { success: false, error: 'Achievement not found' }
    }

    // Check if already awarded
    const existing = await this.db.collection('users').doc(teacherId)
      .collection('badges')
      .where('achievementId', '==', achievementId)
      .get()

    if (!existing.empty) {
      return { success: false, alreadyAwarded: true }
    }

    const badgeId = `ACH-${achievementId}-${Date.now()}`
    const badge = {
      badgeId,
      type: BADGE_TYPES.ACHIEVEMENT,
      achievementId,
      name: achievement.name,
      nameTh: achievement.nameTh,
      description: achievement.description,
      descriptionTh: achievement.descriptionTh,
      icon: achievement.icon,
      points: achievement.points,
      awardedAt: new Date().toISOString()
    }

    await this.db.collection('users').doc(teacherId)
      .collection('badges').doc(badgeId).set(badge)

    // Update total points
    await this.db.collection('users').doc(teacherId).set({
      badgePoints: admin.firestore.FieldValue.increment(achievement.points)
    }, { merge: true })

    return { success: true, badge }
  }

  /**
   * Check and award automatic achievements
   */
  async checkAndAwardAchievements(teacherId, calibrationStats) {
    const awarded = []

    // First calibration
    if (calibrationStats.totalCalibrations === 1) {
      const result = await this.awardAchievementBadge(teacherId, 'FIRST_CALIBRATION')
      if (result.success) awarded.push(result.badge)
    }

    // Streak achievements
    if (calibrationStats.currentStreak >= 7) {
      const result = await this.awardAchievementBadge(teacherId, 'STREAK_7')
      if (result.success) awarded.push(result.badge)
    }
    if (calibrationStats.currentStreak >= 30) {
      const result = await this.awardAchievementBadge(teacherId, 'STREAK_30')
      if (result.success) awarded.push(result.badge)
    }

    // Golden contributor
    if (calibrationStats.goldenContributions >= 1) {
      const result = await this.awardAchievementBadge(teacherId, 'GOLDEN_CONTRIBUTOR')
      if (result.success) awarded.push(result.badge)
    }

    // Dimension master
    const dimKappas = calibrationStats.dimensionKappas
    if (dimKappas && Object.values(dimKappas).every(k => k !== null && k >= 0.85)) {
      const result = await this.awardAchievementBadge(teacherId, 'DIMENSION_MASTER')
      if (result.success) awarded.push(result.badge)
    }

    return awarded
  }

  /**
   * Get teacher's badge portfolio
   */
  async getBadgePortfolio(teacherId) {
    const badgesSnapshot = await this.db.collection('users').doc(teacherId)
      .collection('badges')
      .orderBy('awardedAt', 'desc')
      .get()

    const badges = {
      certifications: [],
      achievements: [],
      contributions: [],
      special: [],
      totalPoints: 0
    }

    badgesSnapshot.forEach(doc => {
      const badge = doc.data()
      
      switch (badge.type) {
        case BADGE_TYPES.CERTIFICATION:
          badges.certifications.push(badge)
          break
        case BADGE_TYPES.ACHIEVEMENT:
          badges.achievements.push(badge)
          badges.totalPoints += badge.points || 0
          break
        case BADGE_TYPES.CONTRIBUTION:
          badges.contributions.push(badge)
          badges.totalPoints += badge.points || 0
          break
        case BADGE_TYPES.SPECIAL:
          badges.special.push(badge)
          badges.totalPoints += badge.points || 0
          break
      }
    })

    // Get current certification status
    const currentCert = badges.certifications.find(c => !c.expired && !c.revoked)

    return {
      teacherId,
      currentCertification: currentCert || null,
      badges,
      summary: {
        totalBadges: badgesSnapshot.size,
        totalPoints: badges.totalPoints,
        certificationLevel: currentCert?.level || 'none',
        achievementCount: badges.achievements.length
      }
    }
  }

  /**
   * Get certification leaderboard
   */
  async getLeaderboard(options = {}) {
    const { limit = 50, level = null } = options

    let query = this.db.collection(this.certCollection)
      .where('revoked', '==', false)
      .orderBy('issuedAt', 'desc')

    if (level) {
      query = query.where('level', '==', level)
    }

    const snapshot = await query.limit(limit * 2).get()

    // Group by teacher and get highest level
    const teacherCerts = {}
    snapshot.forEach(doc => {
      const cert = doc.data()
      if (!teacherCerts[cert.teacherId] || 
          this.getLevelRank(cert.level) > this.getLevelRank(teacherCerts[cert.teacherId].level)) {
        teacherCerts[cert.teacherId] = cert
      }
    })

    // Sort by level and stats
    const leaderboard = Object.values(teacherCerts)
      .filter(c => new Date(c.expiresAt) > new Date())
      .sort((a, b) => {
        const levelDiff = this.getLevelRank(b.level) - this.getLevelRank(a.level)
        if (levelDiff !== 0) return levelDiff
        return b.statsAtIssuance.avgKappa - a.statsAtIssuance.avgKappa
      })
      .slice(0, limit)
      .map((cert, index) => ({
        rank: index + 1,
        teacherId: cert.teacherId,
        level: cert.level,
        levelName: cert.levelNameTh,
        icon: cert.icon,
        avgKappa: cert.statsAtIssuance.avgKappa,
        totalCalibrations: cert.statsAtIssuance.totalCalibrations,
        issuedAt: cert.issuedAt
      }))

    return {
      leaderboard,
      totalCertified: Object.keys(teacherCerts).length,
      byLevel: this.countByLevel(Object.values(teacherCerts))
    }
  }

  /**
   * Get level rank for sorting
   */
  getLevelRank(level) {
    const ranks = { BRONZE: 1, SILVER: 2, GOLD: 3, MASTER: 4, EXPERT: 5 }
    return ranks[level] || 0
  }

  /**
   * Count certifications by level
   */
  countByLevel(certs) {
    const counts = { BRONZE: 0, SILVER: 0, GOLD: 0, MASTER: 0, EXPERT: 0 }
    certs.forEach(c => {
      if (counts[c.level] !== undefined) counts[c.level]++
    })
    return counts
  }

  /**
   * Generate shareable badge image data
   */
  generateBadgeImageData(certification) {
    const level = CERTIFICATION_LEVELS[certification.level]
    
    return {
      svg: this.generateBadgeSVG(certification, level),
      metadata: {
        badgeId: certification.badgeId,
        level: certification.level,
        holder: certification.teacherId,
        issuedAt: certification.issuedAt,
        expiresAt: certification.expiresAt,
        verifyUrl: `https://hots-ai.web.app/verify/${certification.badgeId}`
      }
    }
  }

  /**
   * Generate SVG badge
   */
  generateBadgeSVG(certification, level) {
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="350" viewBox="0 0 300 350">
  <defs>
    <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${level.color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${this.darkenColor(level.color)};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="300" height="350" rx="20" fill="#1a1a2e"/>
  
  <!-- Badge Circle -->
  <circle cx="150" cy="120" r="80" fill="url(#badgeGradient)" stroke="#fff" stroke-width="3"/>
  
  <!-- Icon -->
  <text x="150" y="140" text-anchor="middle" font-size="60">${level.icon}</text>
  
  <!-- Level Name -->
  <text x="150" y="230" text-anchor="middle" fill="#fff" font-family="Arial" font-size="18" font-weight="bold">
    ${level.nameTh}
  </text>
  <text x="150" y="255" text-anchor="middle" fill="#aaa" font-family="Arial" font-size="14">
    ${level.name}
  </text>
  
  <!-- Badge ID -->
  <text x="150" y="290" text-anchor="middle" fill="#666" font-family="monospace" font-size="10">
    ${certification.badgeId}
  </text>
  
  <!-- Stats -->
  <text x="150" y="315" text-anchor="middle" fill="#888" font-family="Arial" font-size="12">
    κ = ${certification.statsAtIssuance.avgKappa} | ${certification.statsAtIssuance.totalCalibrations} calibrations
  </text>
  
  <!-- HOTS-AI Logo -->
  <text x="150" y="340" text-anchor="middle" fill="#444" font-family="Arial" font-size="10">
    HOTS-AI Certification System
  </text>
</svg>`
  }

  /**
   * Darken color for gradient
   */
  darkenColor(hex) {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.max(0, (num >> 16) - 40)
    const g = Math.max(0, ((num >> 8) & 0x00FF) - 40)
    const b = Math.max(0, (num & 0x0000FF) - 40)
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
  }

  /**
   * Revoke certification
   */
  async revokeCertification(badgeId, reason, revokedBy) {
    const doc = await this.db.collection(this.certCollection).doc(badgeId).get()
    
    if (!doc.exists) {
      return { success: false, error: 'Badge not found' }
    }

    await this.db.collection(this.certCollection).doc(badgeId).update({
      revoked: true,
      revokedAt: new Date().toISOString(),
      revokedReason: reason,
      revokedBy
    })

    return { success: true, message: 'Certification revoked' }
  }
}

// Export
module.exports = {
  CERTIFICATION_LEVELS,
  BADGE_TYPES,
  ACHIEVEMENT_BADGES,
  DigitalBadgeManager
}
