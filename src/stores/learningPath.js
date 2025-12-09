import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '@/firebase/config'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { useAuthStore } from './auth'

export const useLearningPathStore = defineStore('learningPath', () => {
  const authStore = useAuthStore()
  
  // State
  const loProgress = ref({})
  const microLessonQueue = ref([])
  const loading = ref(false)
  const unsubscribe = ref(null)

  // Computed: Get LO progress percentage
  const getLOProgressPercentage = computed(() => (loCode) => {
    const progress = loProgress.value[loCode]
    if (!progress) return 0
    return Math.min(100, Math.round((progress.accumulatedScore / progress.targetScore) * 100))
  })

  // Computed: Get remaining score needed to pass
  const getRemainingScore = computed(() => (loCode) => {
    const progress = loProgress.value[loCode]
    if (!progress) return 0
    return Math.max(0, progress.targetScore - progress.accumulatedScore)
  })

  // Computed: Check if should offer micro lesson
  const shouldOfferMicroLesson = computed(() => (loCode) => {
    const progress = loProgress.value[loCode]
    if (!progress) return false

    const percentage = getLOProgressPercentage.value(loCode)
    
    // Criteria: 2+ attempts, < 50% progress, haven't viewed lesson
    return (
      progress.attempts >= 2 &&
      percentage < 50 &&
      progress.microLessonsViewed.length === 0
    )
  })

  // Actions
  
  /**
   * Load LO progress from studentProgress document
   */
  async function loadLOProgress(studentId, courseId) {
    if (unsubscribe.value) {
      unsubscribe.value()
    }

    loading.value = true
    
    try {
      const progressId = `${studentId}_${courseId}`
      const progressRef = doc(db, 'studentProgress', progressId)

      // Set up real-time listener
      unsubscribe.value = onSnapshot(
        progressRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data()
            loProgress.value = data.loProgress || {}
            
            // Check for LOs that need intervention
            checkInterventionTriggers()
          } else {
            loProgress.value = {}
            microLessonQueue.value = []
          }
          loading.value = false
        },
        (error) => {
          console.error('Error loading LO progress:', error)
          loading.value = false
        }
      )
    } catch (error) {
      console.error('Error setting up LO progress listener:', error)
      loading.value = false
    }
  }

  /**
   * Check which LOs need intervention
   */
  function checkInterventionTriggers() {
    const needsIntervention = []

    Object.keys(loProgress.value).forEach(loCode => {
      if (shouldOfferMicroLesson.value(loCode)) {
        // Check if not already in queue
        if (!microLessonQueue.value.includes(loCode)) {
          needsIntervention.push(loCode)
        }
      }
    })

    // Add to queue
    if (needsIntervention.length > 0) {
      microLessonQueue.value.push(...needsIntervention)
      console.log('🎓 Intervention needed for:', needsIntervention)
    }
  }

  /**
   * Get next LO that needs micro lesson
   */
  function getNextMicroLessonLO() {
    return microLessonQueue.value.shift()
  }

  /**
   * Mark micro lesson as viewed
   */
  function markLessonViewed(loCode, lessonId) {
    if (loProgress.value[loCode]) {
      loProgress.value[loCode].microLessonsViewed.push(lessonId)
    }
  }

  /**
   * Get LO progress display data
   */
  function getLOProgressDisplay(loCodes) {
    return loCodes.map(loCode => {
      const progress = loProgress.value[loCode] || {
        accumulatedScore: 0,
        targetScore: 12,
        attempts: 0,
        isPassed: false
      }

      return {
        code: loCode,
        percentage: getLOProgressPercentage.value(loCode),
        remaining: getRemainingScore.value(loCode),
        attempts: progress.attempts,
        isPassed: progress.isPassed,
        strugglingDimensions: progress.strugglingDimensions || [],
        needsIntervention: shouldOfferMicroLesson.value(loCode)
      }
    })
  }

  /**
   * Clean up listeners
   */
  function cleanup() {
    if (unsubscribe.value) {
      unsubscribe.value()
      unsubscribe.value = null
    }
    loProgress.value = {}
    microLessonQueue.value = []
  }

  return {
    // State
    loProgress,
    microLessonQueue,
    loading,

    // Computed
    getLOProgressPercentage,
    getRemainingScore,
    shouldOfferMicroLesson,

    // Actions
    loadLOProgress,
    checkInterventionTriggers,
    getNextMicroLessonLO,
    markLessonViewed,
    getLOProgressDisplay,
    cleanup
  }
})
