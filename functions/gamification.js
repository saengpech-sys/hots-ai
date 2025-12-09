/**
 * Gamification System
 * Manages badges, points, achievements, and leaderboards
 */

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
function calculatePoints(assessment) {
  const basePoints = 10 // Base points for completing an assessment
  
  // Bonus points based on overall score
  let bonusPoints = 0
  const overallScore = assessment.overallScore || 0
  
  if (overallScore >= 20) {
    bonusPoints = 50 // Perfect score
  } else if (overallScore >= 18) {
    bonusPoints = 30 // Excellent
  } else if (overallScore >= 15) {
    bonusPoints = 20 // Good
  } else if (overallScore >= 12) {
    bonusPoints = 10 // Fair
  }
  
  // Bonus for mastering specific skills (5/5 in any dimension)
  const rubricScores = assessment.rubricScores || {}
  Object.values(rubricScores).forEach(score => {
    if (score === 5) {
      bonusPoints += 5
    }
  })
  
  // Bonus for passing new LOs
  const newLOsCount = assessment.loAssessment?.passedLOs?.length || 0
  bonusPoints += newLOsCount * 5
  
  return basePoints + bonusPoints
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
  calculatePoints,
  checkBadges,
  calculateStreak,
  calculateLeaderboardScore,
  calculateDailyReward
}
