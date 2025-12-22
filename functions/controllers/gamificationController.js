/**
 * Gamification Controller
 * จัดการ Leaderboard, Badges, Daily Rewards
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })
const { calculatePoints, checkBadges, calculateStreak, BADGES } = require('../gamification')

const getDb = () => admin.firestore()

/**
 * Get Leaderboard
 */
exports.getLeaderboard = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { courseId, timeframe = 'all', limit = 20 } = req.method === 'GET' ? req.query : req.body
      const db = getDb()

      let query = db.collection('users').where('role', '==', 'student')
      
      // Filter by course if specified
      if (courseId) {
        query = query.where('enrolledCourses', 'array-contains', courseId)
      }

      // Order by points
      query = query.orderBy('gamification.totalPoints', 'desc').limit(parseInt(limit))

      const snapshot = await query.get()
      const leaderboard = []

      snapshot.forEach(doc => {
        const data = doc.data()
        leaderboard.push({
          id: doc.id,
          displayName: data.displayName || 'นักเรียน',
          photoURL: data.photoURL,
          grade: data.grade,
          room: data.room,
          points: data.gamification?.totalPoints || 0,
          badges: data.gamification?.badges || [],
          streak: data.gamification?.currentStreak || 0,
          level: Math.floor((data.gamification?.totalPoints || 0) / 1000) + 1
        })
      })

      return res.status(200).send({
        success: true,
        leaderboard,
        timeframe,
        updatedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error getting leaderboard:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Get Badge Definitions
 */
exports.getBadgeDefinitions = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      return res.status(200).send({
        success: true,
        badges: BADGES
      })
    } catch (error) {
      console.error('Error getting badges:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Claim Daily Reward
 */
exports.claimDailyReward = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { userId } = req.body
      if (!userId) {
        return res.status(400).send({ error: 'Missing userId' })
      }

      const db = getDb()
      const userRef = db.collection('users').doc(userId)
      const userDoc = await userRef.get()

      if (!userDoc.exists) {
        return res.status(404).send({ error: 'User not found' })
      }

      const userData = userDoc.data()
      const gamification = userData.gamification || {}
      const lastClaimDate = gamification.lastDailyReward?.toDate?.() || null
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Check if already claimed today
      if (lastClaimDate) {
        const lastClaim = new Date(lastClaimDate)
        lastClaim.setHours(0, 0, 0, 0)
        if (lastClaim.getTime() === today.getTime()) {
          return res.status(400).send({ 
            error: 'Already claimed today',
            nextClaimAt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
          })
        }
      }

      // Calculate streak
      const newStreak = calculateStreak(lastClaimDate, gamification.currentStreak || 0)
      
      // Calculate reward based on streak
      const baseReward = 10
      const streakBonus = Math.min(newStreak * 2, 20) // Max 20 bonus
      const totalReward = baseReward + streakBonus

      // Update user
      await userRef.update({
        'gamification.totalPoints': admin.firestore.FieldValue.increment(totalReward),
        'gamification.currentStreak': newStreak,
        'gamification.lastDailyReward': admin.firestore.FieldValue.serverTimestamp()
      })

      return res.status(200).send({
        success: true,
        reward: {
          baseReward,
          streakBonus,
          totalReward,
          currentStreak: newStreak
        }
      })

    } catch (error) {
      console.error('Error claiming daily reward:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Generate Daily Report (Scheduled)
 */
exports.generateDailyReport = functions.pubsub
  .schedule('every day 23:00')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    const db = getDb()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    try {
      // Get today's assessments
      const assessmentsSnapshot = await db.collection('assessments')
        .where('createdAt', '>=', today)
        .get()

      const stats = {
        totalAssessments: assessmentsSnapshot.size,
        averageScore: 0,
        hotsLevels: { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
      }

      let totalScore = 0
      let count = 0

      assessmentsSnapshot.forEach(doc => {
        const data = doc.data()
        if (data.rubricScores) {
          count++
          Object.keys(stats.hotsLevels).forEach(key => {
            stats.hotsLevels[key] += data.rubricScores[key] || 0
          })
          totalScore += Object.values(data.rubricScores).reduce((a, b) => a + b, 0) / 4
        }
      })

      if (count > 0) {
        stats.averageScore = totalScore / count
        Object.keys(stats.hotsLevels).forEach(key => {
          stats.hotsLevels[key] /= count
        })
      }

      // Save daily report
      await db.collection('dailyReports').add({
        date: today,
        stats,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })

      console.log('Daily report generated:', stats)
      return null

    } catch (error) {
      console.error('Error generating daily report:', error)
      return null
    }
  })

module.exports = exports
