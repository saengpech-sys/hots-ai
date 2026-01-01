/**
 * 🏆 Leaderboard Controller
 * Handles gamification-related operations including:
 * - Leaderboard retrieval
 * - Badge definitions
 * - Daily rewards
 * 
 * @module controllers/leaderboardController
 */

const functions = require('firebase-functions')
const cors = require('cors')({ origin: true })
const { db, FieldValue } = require('../shared/firebase')

// Import gamification utilities
const { 
  calculateLeaderboardScore, 
  calculateDailyReward, 
  BADGES 
} = require('../gamification')

// =============================================================================
// 🏆 LEADERBOARD
// =============================================================================

/**
 * Get leaderboard
 * Returns top students by score in a course or globally
 */
exports.getLeaderboard = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { courseId, scope = 'course', limit = 10 } = req.body

      let query = db.collection('studentProgress')

      // Filter by course if specified
      if (scope === 'course' && courseId) {
        query = query.where('courseId', '==', courseId)
      }

      const progressSnapshot = await query.get()

      if (progressSnapshot.empty) {
        return res.status(200).send({
          success: true,
          leaderboard: []
        })
      }

      const leaderboardData = []

      for (const doc of progressSnapshot.docs) {
        const data = doc.data()
        const studentId = data.studentId

        // Get student details
        const userDoc = await db.collection('users').doc(studentId).get()
        if (!userDoc.exists) continue

        const userData = userDoc.data()

        leaderboardData.push({
          studentId: data.studentId,
          name: userData.displayName || userData.name || 'Unknown',
          studentNumber: userData.studentId || 'N/A',
          grade: userData.grade || '',
          room: userData.room || '',
          totalPoints: data.totalPoints || 0,
          badges: data.badges || [],
          badgeCount: (data.badges || []).length,
          currentStreak: data.currentStreak || 0,
          passedLOsCount: data.totalPassed || 0,
          assessmentCount: data.assessmentCount || 0,
          worksheetCount: data.worksheetCount || 0,
          totalActivities: (data.assessmentCount || 0) + (data.worksheetCount || 0),
          leaderboardScore: calculateLeaderboardScore(data)
        })
      }

      // Sort by leaderboard score
      leaderboardData.sort((a, b) => b.leaderboardScore - a.leaderboardScore)

      // Add rank
      leaderboardData.forEach((entry, index) => {
        entry.rank = index + 1
      })

      // Limit results
      const limitedData = leaderboardData.slice(0, limit)

      return res.status(200).send({
        success: true,
        leaderboard: limitedData,
        total: leaderboardData.length
      })

    } catch (error) {
      console.error('Get Leaderboard error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

// =============================================================================
// 🎖️ BADGES
// =============================================================================

/**
 * Get badge definitions
 */
exports.getBadgeDefinitions = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      return res.status(200).send({
        success: true,
        badges: Object.values(BADGES)
      })
    } catch (error) {
      console.error('Get Badge Definitions error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

// =============================================================================
// 🎁 DAILY REWARDS
// =============================================================================

/**
 * Claim daily login reward
 */
exports.claimDailyReward = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { studentId, courseId } = req.body
      
      if (!studentId || !courseId) {
        return res.status(400).send({ 
          error: 'Missing required fields',
          message: 'studentId and courseId are required'
        })
      }
      
      const progressId = `${studentId}_${courseId}`
      const progressRef = db.collection('studentProgress').doc(progressId)
      
      const progressDoc = await progressRef.get()
      
      if (!progressDoc.exists) {
        return res.status(404).send({
          error: 'Student progress not found'
        })
      }
      
      const progressData = progressDoc.data()
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      
      // Check if already claimed today
      if (progressData.lastDailyReward === today) {
        return res.status(200).send({
          success: false,
          alreadyClaimed: true,
          message: 'Daily reward already claimed today'
        })
      }
      
      // Calculate consecutive login days
      let consecutiveDays = progressData.consecutiveLoginDays || 0
      const lastRewardDate = progressData.lastDailyReward
      
      if (lastRewardDate) {
        const lastDate = new Date(lastRewardDate)
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        
        if (lastRewardDate === yesterdayStr) {
          consecutiveDays += 1
        } else {
          consecutiveDays = 1
        }
      } else {
        consecutiveDays = 1
      }
      
      // Calculate reward
      const reward = calculateDailyReward(consecutiveDays)
      
      // Update progress
      await progressRef.update({
        totalPoints: FieldValue.increment(reward.points),
        lastDailyReward: today,
        consecutiveLoginDays: consecutiveDays,
        totalDailyRewards: FieldValue.increment(1)
      })
      
      return res.status(200).send({
        success: true,
        reward: {
          points: reward.points,
          bonus: reward.bonus,
          message: reward.message,
          consecutiveDays: consecutiveDays
        }
      })
      
    } catch (error) {
      console.error('Claim Daily Reward error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

module.exports = exports
