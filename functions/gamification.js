/**
 * Gamification System
 * Manages badges, points, achievements, and leaderboards
 * 
 * 🔬 PHASE 3 Updates:
 * - Added daily XP cap to prevent exploitation
 * - Added minimum score threshold for base points
 * - Added anti-gaming measures
 */

// 🔬 PHASE 3: Gamification Configuration
const GAMIFICATION_CONFIG = {
  // Daily XP cap to prevent exploitation
  dailyXPCap: 500,
  
  // Minimum score to earn base points (prevents spam submissions)
  minScoreForBasePoints: 8,  // Out of 20 - must show some HOTS
  
  // Minimum score thresholds for bonuses
  thresholds: {
    excellent: 18,    // 90% = 50 bonus
    good: 15,         // 75% = 20 bonus
    fair: 12,         // 60% = 10 bonus
    minimum: 8        // 40% = base points only
  },
  
  // Anti-gaming: minimum time between assessments for full points
  minTimeBetweenAssessments: 60,  // seconds
  rapidFirePenalty: 0.5,          // 50% points if too fast
  
  // Streak configurations
  streakBonusPerWeek: 5,          // Extra points per week of streak
  maxStreakBonus: 50              // Cap streak bonus
}

// Badge Definitions
const BADGES = {
  // Starter Badges
  FIRST_STEP: {
    id: 'FIRST_STEP',
    name: 'ก้าวแรก',
    description: 'ทำแบบทดสอบครั้งแรก',
    icon: '🌱',
    points: 10,
    condition: (stats) => stats.assessmentCount >= 1
  },
  CURIOUS_MIND: {
    id: 'CURIOUS_MIND',
    name: 'จิตใจแห่งการสำรวจ',
    description: 'ทำแบบทดสอบ 5 ครั้ง',
    icon: '🔍',
    points: 25,
    condition: (stats) => stats.assessmentCount >= 5
  },
  DEDICATED_LEARNER: {
    id: 'DEDICATED_LEARNER',
    name: 'นักเรียนผู้ทุ่มเท',
    description: 'ทำแบบทดสอบ 20 ครั้ง',
    icon: '📚',
    points: 50,
    condition: (stats) => stats.assessmentCount >= 20
  },
  
  // Streak Badges
  STREAK_3: {
    id: 'STREAK_3',
    name: 'สายฟ้า 3 วัน',
    description: 'ทำแบบทดสอบติดต่อกัน 3 วัน',
    icon: '⚡',
    points: 30,
    condition: (stats) => stats.currentStreak >= 3
  },
  STREAK_7: {
    id: 'STREAK_7',
    name: 'สัปดาห์แห่งความมุ่งมั่น',
    description: 'ทำแบบทดสอบติดต่อกัน 7 วัน',
    icon: '🔥',
    points: 70,
    condition: (stats) => stats.currentStreak >= 7
  },
  STREAK_30: {
    id: 'STREAK_30',
    name: 'ผู้ยิ่งใหญ่แห่งความต่อเนื่อง',
    description: 'ทำแบบทดสอบติดต่อกัน 30 วัน',
    icon: '👑',
    points: 300,
    condition: (stats) => stats.currentStreak >= 30
  },
  
  // Score-based Badges
  HIGH_SCORER: {
    id: 'HIGH_SCORER',
    name: 'ผู้ทำคะแนนสูง',
    description: 'ได้คะแนนรวม 18/20 ขึ้นไป',
    icon: '⭐',
    points: 40,
    condition: (stats) => stats.highestScore >= 18
  },
  PERFECT_SCORE: {
    id: 'PERFECT_SCORE',
    name: 'คะแนนเต็ม',
    description: 'ได้คะแนน 20/20',
    icon: '💯',
    points: 100,
    condition: (stats) => stats.highestScore >= 20
  },
  CONSISTENT_PERFORMER: {
    id: 'CONSISTENT_PERFORMER',
    name: 'ผลงานสม่ำเสมอ',
    description: 'เฉลี่ยคะแนน 15/20 จาก 10 ครั้งขึ้นไป',
    icon: '📈',
    points: 60,
    condition: (stats) => stats.assessmentCount >= 10 && stats.averageScore >= 15
  },
  
  // Skill-specific Badges
  MASTER_ANALYST: {
    id: 'MASTER_ANALYST',
    name: 'นักวิเคราะห์ระดับเซียน',
    description: 'คะแนนวิเคราะห์เฉลี่ย 4.5/5 จาก 5 ครั้งขึ้นไป',
    icon: '🧠',
    points: 50,
    condition: (stats) => stats.assessmentCount >= 5 && stats.avgAnalysis >= 4.5
  },
  MASTER_REASONING: {
    id: 'MASTER_REASONING',
    name: 'นักให้เหตุผลระดับเซียน',
    description: 'คะแนนเหตุผลเฉลี่ย 4.5/5 จาก 5 ครั้งขึ้นไป',
    icon: '💡',
    points: 50,
    condition: (stats) => stats.assessmentCount >= 5 && stats.avgReasoning >= 4.5
  },
  MASTER_CREATIVE: {
    id: 'MASTER_CREATIVE',
    name: 'นักสร้างสรรค์ระดับเซียน',
    description: 'คะแนนสร้างสรรค์เฉลี่ย 4.5/5 จาก 5 ครั้งขึ้นไป',
    icon: '🎨',
    points: 50,
    condition: (stats) => stats.assessmentCount >= 5 && stats.avgCreativity >= 4.5
  },
  MASTER_EVIDENCE: {
    id: 'MASTER_EVIDENCE',
    name: 'นักใช้หลักฐานระดับเซียน',
    description: 'คะแนนหลักฐานเฉลี่ย 4.5/5 จาก 5 ครั้งขึ้นไป',
    icon: '📊',
    points: 50,
    condition: (stats) => stats.assessmentCount >= 5 && stats.avgEvidence >= 4.5
  },
  
  // LO-based Badges
  LO_EXPLORER: {
    id: 'LO_EXPLORER',
    name: 'นักสำรวจ LO',
    description: 'ผ่าน 3 Learning Outcomes',
    icon: '🗺️',
    points: 30,
    condition: (stats) => stats.passedLOsCount >= 3
  },
  LO_MASTER: {
    id: 'LO_MASTER',
    name: 'ผู้เชี่ยวชาญ LO',
    description: 'ผ่าน 10 Learning Outcomes',
    icon: '🎓',
    points: 100,
    condition: (stats) => stats.passedLOsCount >= 10
  },
  LO_GRANDMASTER: {
    id: 'LO_GRANDMASTER',
    name: 'ปรมาจารย์ LO',
    description: 'ผ่านทุก Learning Outcomes ในคอร์ส',
    icon: '🏆',
    points: 200,
    condition: (stats, totalLOs) => stats.passedLOsCount >= totalLOs && totalLOs > 0
  },
  
  // Special Badges
  EARLY_BIRD: {
    id: 'EARLY_BIRD',
    name: 'นกตื่นเช้า',
    description: 'ทำแบบทดสอบก่อน 8:00 น. 5 ครั้ง',
    icon: '🌅',
    points: 20,
    condition: (stats) => stats.earlyBirdCount >= 5
  },
  NIGHT_OWL: {
    id: 'NIGHT_OWL',
    name: 'นกฮูกกลางคืน',
    description: 'ทำแบบทดสอบหลัง 22:00 น. 5 ครั้ง',
    icon: '🦉',
    points: 20,
    condition: (stats) => stats.nightOwlCount >= 5
  },
  SPEED_DEMON: {
    id: 'SPEED_DEMON',
    name: 'ความเร็วสุดขีด',
    description: 'ทำแบบทดสอบ 5 ข้อในหนึ่งวัน',
    icon: '⚡',
    points: 40,
    condition: (stats) => stats.maxDailyAssessments >= 5
  }
}

// Point calculation based on performance
// 🔬 PHASE 3: Enhanced with minimum threshold and anti-gaming
function calculatePoints(assessment, options = {}) {
  const { 
    todaysTotalXP = 0, 
    lastAssessmentTime = null,
    studentStats = {}
  } = options
  
  const overallScore = assessment.overallScore || 0
  const result = {
    basePoints: 0,
    bonusPoints: 0,
    totalEarned: 0,
    appliedCap: false,
    penalties: [],
    breakdown: {}
  }
  
  // 🔬 PHASE 3: Check minimum score threshold
  if (overallScore < GAMIFICATION_CONFIG.minScoreForBasePoints) {
    result.penalties.push({
      type: 'LOW_SCORE',
      message: `คะแนน ${overallScore}/20 ต่ำกว่าเกณฑ์ขั้นต่ำ (${GAMIFICATION_CONFIG.minScoreForBasePoints}/20)`,
      reduction: 'NO_BASE_POINTS'
    })
    result.breakdown.baseReason = 'Score below minimum threshold'
    // Still allow small participation points
    result.basePoints = 2
  } else {
    result.basePoints = 10
    result.breakdown.baseReason = 'Met minimum score threshold'
  }
  
  // 🔬 PHASE 3: Check for rapid-fire submissions (anti-gaming)
  let multiplier = 1.0
  if (lastAssessmentTime) {
    const timeDiff = (Date.now() - new Date(lastAssessmentTime).getTime()) / 1000
    if (timeDiff < GAMIFICATION_CONFIG.minTimeBetweenAssessments) {
      multiplier = GAMIFICATION_CONFIG.rapidFirePenalty
      result.penalties.push({
        type: 'RAPID_FIRE',
        message: `ส่งคำตอบเร็วเกินไป (${Math.round(timeDiff)}s < ${GAMIFICATION_CONFIG.minTimeBetweenAssessments}s)`,
        reduction: `${(1 - multiplier) * 100}%`
      })
    }
  }
  
  // Bonus points based on overall score
  let bonusPoints = 0
  
  if (overallScore >= 20) {
    bonusPoints = 50 // Perfect score
    result.breakdown.scoreBonus = 'Perfect score (20/20)'
  } else if (overallScore >= GAMIFICATION_CONFIG.thresholds.excellent) {
    bonusPoints = 30 // Excellent
    result.breakdown.scoreBonus = `Excellent (${overallScore}/20)`
  } else if (overallScore >= GAMIFICATION_CONFIG.thresholds.good) {
    bonusPoints = 20 // Good
    result.breakdown.scoreBonus = `Good (${overallScore}/20)`
  } else if (overallScore >= GAMIFICATION_CONFIG.thresholds.fair) {
    bonusPoints = 10 // Fair
    result.breakdown.scoreBonus = `Fair (${overallScore}/20)`
  } else if (overallScore >= GAMIFICATION_CONFIG.thresholds.minimum) {
    bonusPoints = 0 // Minimum - base points only
    result.breakdown.scoreBonus = `Minimum threshold met`
  }
  
  // Bonus for mastering specific skills (5/5 in any dimension)
  const rubricScores = assessment.rubricScores || {}
  let skillMasteryBonus = 0
  Object.entries(rubricScores).forEach(([dim, score]) => {
    if (score === 5) {
      skillMasteryBonus += 5
    }
  })
  if (skillMasteryBonus > 0) {
    bonusPoints += skillMasteryBonus
    result.breakdown.skillMastery = `${skillMasteryBonus} points for dimension mastery`
  }
  
  // Bonus for passing new LOs
  const newLOsCount = assessment.loAssessment?.passedLOs?.length || 0
  if (newLOsCount > 0) {
    bonusPoints += newLOsCount * 5
    result.breakdown.loBonus = `${newLOsCount * 5} points for ${newLOsCount} new LOs`
  }
  
  // Apply multiplier (for rapid-fire penalty)
  result.bonusPoints = Math.round(bonusPoints * multiplier)
  
  // Calculate total before cap
  let totalBeforeCap = result.basePoints + result.bonusPoints
  
  // 🔬 PHASE 3: Apply daily XP cap
  const remainingCap = GAMIFICATION_CONFIG.dailyXPCap - todaysTotalXP
  if (remainingCap <= 0) {
    result.totalEarned = 0
    result.appliedCap = true
    result.breakdown.capMessage = `Daily XP cap (${GAMIFICATION_CONFIG.dailyXPCap}) reached`
  } else if (totalBeforeCap > remainingCap) {
    result.totalEarned = remainingCap
    result.appliedCap = true
    result.breakdown.capMessage = `Reduced from ${totalBeforeCap} to ${remainingCap} due to daily cap`
  } else {
    result.totalEarned = totalBeforeCap
  }
  
  return result
}

// 🔬 PHASE 3: Legacy wrapper for backward compatibility
function calculatePointsSimple(assessment) {
  const result = calculatePoints(assessment, {})
  return result.totalEarned
}

// Check which badges should be awarded
function checkBadges(studentStats, totalLOsInCourse = 0) {
  const earnedBadges = []
  
  Object.values(BADGES).forEach(badge => {
    // Check if student already has this badge
    if (studentStats.badges?.includes(badge.id)) {
      return // Already earned
    }
    
    // Check condition
    if (badge.condition(studentStats, totalLOsInCourse)) {
      earnedBadges.push(badge)
    }
  })
  
  return earnedBadges
}

// Calculate streak
function calculateStreak(lastActiveDate, currentDate) {
  if (!lastActiveDate) {
    return { currentStreak: 1, lastActiveDate: currentDate }
  }
  
  const last = new Date(lastActiveDate)
  const current = new Date(currentDate)
  
  // Reset time to midnight for accurate day comparison
  last.setHours(0, 0, 0, 0)
  current.setHours(0, 0, 0, 0)
  
  const diffDays = Math.floor((current - last) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    // Same day, don't increment streak
    return null // No change
  } else if (diffDays === 1) {
    // Consecutive day, increment streak
    return { increment: true, lastActiveDate: currentDate }
  } else {
    // Streak broken, reset to 1
    return { currentStreak: 1, lastActiveDate: currentDate }
  }
}

// Get leaderboard data
function calculateLeaderboardScore(studentStats) {
  // Weighted score for leaderboard
  return (
    (studentStats.totalPoints || 0) * 1 +
    (studentStats.badges?.length || 0) * 50 +
    (studentStats.currentStreak || 0) * 10 +
    (studentStats.passedLOsCount || 0) * 20
  )
}

// Calculate daily login reward
function calculateDailyReward(consecutiveDays) {
  const baseReward = 10
  const bonusMultiplier = Math.floor(consecutiveDays / 7) // Bonus every 7 days
  const dailyReward = baseReward + (bonusMultiplier * 5)
  
  return {
    points: dailyReward,
    bonus: bonusMultiplier > 0 ? bonusMultiplier * 5 : 0,
    message: bonusMultiplier > 0 
      ? `🎁 เข้าสู่ระบบติดต่อกัน ${consecutiveDays} วัน! โบนัส +${bonusMultiplier * 5} แต้ม!`
      : `✅ เข้าสู่ระบบประจำวัน +${dailyReward} แต้ม`
  }
}

module.exports = {
  BADGES,
  GAMIFICATION_CONFIG,
  calculatePoints,
  calculatePointsSimple,
  checkBadges,
  calculateStreak,
  calculateLeaderboardScore,
  calculateDailyReward
}
