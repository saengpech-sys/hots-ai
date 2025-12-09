import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '@/firebase/config'
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore'
import { getStudentPassedLOs } from '@/utils/loProgress'

export const useGamificationStore = defineStore('gamification', () => {
  // State
  const studentProgress = ref(null)
  const actualPassedLOsData = ref(null) // จัดเก็บ LO ที่ผ่านจริงจาก assessments
  const badges = ref([])
  const badgeDefinitions = ref([])
  const leaderboard = ref([])
  const loading = ref(false)
  const error = ref(null)
  const unsubscribeProgress = ref(null)
  
  // Notification state
  const showBadgeNotification = ref(false)
  const newBadge = ref(null)
  const showPointsNotification = ref(false)
  const pointsEarned = ref(0)
  const previousBadges = ref([])
  const previousPoints = ref(0)

  // Computed
  const totalPoints = computed(() => studentProgress.value?.totalPoints || 0)
  const currentStreak = computed(() => studentProgress.value?.currentStreak || 0)
  const maxStreak = computed(() => studentProgress.value?.maxStreak || 0)
  const earnedBadges = computed(() => studentProgress.value?.badges || [])
  const badgeCount = computed(() => earnedBadges.value.length)
  const assessmentCount = computed(() => studentProgress.value?.assessmentCount || 0)
  const passedLOsCount = computed(() => studentProgress.value?.totalPassed || 0)
  
  // จำนวน LO ที่ผ่านจริง (จาก assessments) - ใช้ utility function มาตรฐาน
  const actualPassedLOsCount = computed(() => actualPassedLOsData.value?.passedLOs?.length || 0)
  const actualPassedLOs = computed(() => actualPassedLOsData.value?.passedLOs || [])

  // Get badge details from IDs
  const earnedBadgeDetails = computed(() => {
    if (!badgeDefinitions.value.length || !earnedBadges.value.length) return []
    return earnedBadges.value
      .map(badgeId => badgeDefinitions.value.find(b => b.id === badgeId))
      .filter(Boolean)
  })

  // Unearnerd badges
  const unearnedBadges = computed(() => {
    if (!badgeDefinitions.value.length) return []
    return badgeDefinitions.value.filter(badge => !earnedBadges.value.includes(badge.id))
  })

  // Current level (based on points)
  const level = computed(() => {
    const points = totalPoints.value
    if (points < 100) return 1
    if (points < 250) return 2
    if (points < 500) return 3
    if (points < 1000) return 4
    if (points < 2000) return 5
    return Math.floor(points / 500) + 1
  })

  // Points needed for next level
  const pointsToNextLevel = computed(() => {
    const currentLevel = level.value
    const levelThresholds = [0, 100, 250, 500, 1000, 2000]
    
    if (currentLevel < 6) {
      return levelThresholds[currentLevel] - totalPoints.value
    }
    
    const nextThreshold = currentLevel * 500
    return nextThreshold - totalPoints.value
  })

  // Progress percentage to next level
  const levelProgress = computed(() => {
    const currentLevel = level.value
    const levelThresholds = [0, 100, 250, 500, 1000, 2000]
    
    let currentThreshold, nextThreshold
    
    if (currentLevel < 6) {
      currentThreshold = levelThresholds[currentLevel - 1]
      nextThreshold = levelThresholds[currentLevel]
    } else {
      currentThreshold = (currentLevel - 1) * 500
      nextThreshold = currentLevel * 500
    }
    
    const progress = totalPoints.value - currentThreshold
    const total = nextThreshold - currentThreshold
    
    return Math.min(100, Math.max(0, (progress / total) * 100))
  })

  // Actions
  async function loadStudentProgress(studentId, courseId) {
    // ถ้าไม่มี studentId หรือ courseId ก็ไม่ทำอะไร
    if (!studentId || !courseId) {
      studentProgress.value = null
      actualPassedLOsData.value = null
      loading.value = false
      return
    }

    loading.value = true
    error.value = null

    try {
      const progressId = `${studentId}_${courseId}`
      const progressRef = doc(db, 'studentProgress', progressId)

      // โหลด LO ที่ผ่านจริงจาก assessments (ใช้ utility function มาตรฐาน)
      try {
        actualPassedLOsData.value = await getStudentPassedLOs(studentId, courseId)
        console.log('[gamification] Loaded actual passed LOs:', actualPassedLOsData.value)
      } catch (loErr) {
        console.warn('[gamification] Could not load actual passed LOs:', loErr)
        actualPassedLOsData.value = null
      }

      // Set up real-time listener
      unsubscribeProgress.value = onSnapshot(
        progressRef,
        async (snapshot) => {
          if (snapshot.exists()) {
            const newData = {
              id: snapshot.id,
              ...snapshot.data()
            }
            
            // Check for new badges
            if (studentProgress.value) {
              const oldBadges = studentProgress.value.badges || []
              const newBadges = newData.badges || []
              const addedBadges = newBadges.filter(b => !oldBadges.includes(b))
              
              if (addedBadges.length > 0) {
                // Show notification for the first new badge
                const badge = badgeDefinitions.value.find(b => b.id === addedBadges[0])
                if (badge) {
                  newBadge.value = badge
                  showBadgeNotification.value = true
                }
              }
              
              // Check for points increase
              const oldPoints = studentProgress.value.totalPoints || 0
              const newPoints = newData.totalPoints || 0
              if (newPoints > oldPoints) {
                pointsEarned.value = newPoints - oldPoints
                showPointsNotification.value = true
              }
            }
            
            studentProgress.value = newData
            
            // Refresh actual passed LOs เมื่อมีการเปลี่ยนแปลง
            try {
              actualPassedLOsData.value = await getStudentPassedLOs(studentId, courseId)
            } catch (loErr) {
              console.warn('[gamification] Could not refresh actual passed LOs:', loErr)
            }
          } else {
            // ไม่มี progress ยัง - ไม่ใช่ error
            studentProgress.value = null
          }
          loading.value = false
        },
        (err) => {
          console.log('Could not load student progress:', err.message)
          // ไม่แสดง error - เพียงแค่ตั้งค่า null
          studentProgress.value = null
          error.value = null
          loading.value = false
        }
      )

    } catch (err) {
      console.log('Could not load student progress:', err.message)
      // ไม่แสดง error - เพียงแค่ตั้งค่า null
      studentProgress.value = null
      error.value = null
      loading.value = false
    }
  }

  async function loadBadgeDefinitions() {
    try {
      const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'http://localhost:5001/hots-ai-chatloop/us-central1'
      
      const response = await fetch(`${functionsUrl}/getBadgeDefinitions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load badge definitions')
      }

      const data = await response.json()
      
      if (data.success) {
        badgeDefinitions.value = data.badges
      }

    } catch (err) {
      console.error('Load badge definitions error:', err)
      error.value = err.message
    }
  }

  async function loadLeaderboard(courseId = null, scope = 'course', limitCount = 10) {
    loading.value = true
    error.value = null

    try {
      const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'http://localhost:5001/hots-ai-chatloop/us-central1'
      
      const response = await fetch(`${functionsUrl}/getLeaderboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          courseId,
          scope,
          limit: limitCount
        })
      })

      if (!response.ok) {
        throw new Error('Failed to load leaderboard')
      }

      const data = await response.json()
      
      if (data.success) {
        leaderboard.value = data.leaderboard
      }

    } catch (err) {
      console.error('Load leaderboard error:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  function getMyRank(studentId) {
    const index = leaderboard.value.findIndex(entry => entry.studentId === studentId)
    return index >= 0 ? index + 1 : null
  }

  function getBadgeById(badgeId) {
    return badgeDefinitions.value.find(b => b.id === badgeId)
  }
  
  async function claimDailyReward(studentId, courseId) {
    try {
      const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'http://localhost:5001/hots-ai-chatloop/us-central1'
      
      const response = await fetch(`${functionsUrl}/claimDailyReward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId,
          courseId
        })
      })

      const data = await response.json()
      
      if (data.success && data.reward) {
        // Show points notification
        pointsEarned.value = data.reward.points
        showPointsNotification.value = true
        
        return data.reward
      } else if (data.alreadyClaimed) {
        return { alreadyClaimed: true }
      }
      
      return null

    } catch (err) {
      console.error('Claim daily reward error:', err)
      error.value = err.message
      return null
    }
  }

  function cleanup() {
    if (unsubscribeProgress.value) {
      unsubscribeProgress.value()
      unsubscribeProgress.value = null
    }
    studentProgress.value = null
    actualPassedLOsData.value = null
    leaderboard.value = []
    error.value = null
  }
  
  function closeBadgeNotification() {
    showBadgeNotification.value = false
    newBadge.value = null
  }
  
  function closePointsNotification() {
    showPointsNotification.value = false
    pointsEarned.value = 0
  }

  return {
    // State
    studentProgress,
    actualPassedLOsData,
    badges,
    badgeDefinitions,
    leaderboard,
    loading,
    error,
    
    // Notification state
    showBadgeNotification,
    newBadge,
    showPointsNotification,
    pointsEarned,
    
    // Computed
    totalPoints,
    currentStreak,
    maxStreak,
    earnedBadges,
    earnedBadgeDetails,
    unearnedBadges,
    badgeCount,
    assessmentCount,
    passedLOsCount,
    actualPassedLOsCount,
    actualPassedLOs,
    level,
    pointsToNextLevel,
    levelProgress,
    
    // Actions
    loadStudentProgress,
    loadBadgeDefinitions,
    loadLeaderboard,
    getMyRank,
    getBadgeById,
    claimDailyReward,
    closeBadgeNotification,
    closePointsNotification,
    cleanup
  }
})
