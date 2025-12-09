/**
 * usePresence - Real-time user presence tracking
 * 
 * Features:
 * - Heartbeat every 30 seconds
 * - Track current page/activity
 * - Auto-cleanup on disconnect
 * - Minimal Firestore writes (~$0.21/month for 100 users)
 */

import { ref, onMounted, onUnmounted, watch } from 'vue'
import { doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import { useRoute } from 'vue-router'

// Presence document structure:
// userPresence/{odId} {
//   odId: string
//   studentId: string (e.g., "12345")
//   displayName: string
//   role: 'student' | 'teacher'
//   currentPage: string (route name)
//   currentActivity: 'idle' | 'chat' | 'worksheet' | 'browsing'
//   courseId: string | null
//   lastActive: Timestamp
//   isOnline: boolean
// }

const HEARTBEAT_INTERVAL = 30000 // 30 seconds
const OFFLINE_THRESHOLD = 60000 // 60 seconds = considered offline

export function usePresence() {
  const authStore = useAuthStore()
  const route = useRoute()
  
  const isTracking = ref(false)
  let heartbeatTimer = null
  let presenceDocRef = null

  /**
   * Get activity type from route name
   */
  function getActivityFromRoute(routeName) {
    const activityMap = {
      'Chat': 'chat',
      'LearningRoom': 'worksheet',
      'WorksheetForm': 'worksheet',
      'LearningRoomList': 'browsing',
      'MyProgress': 'browsing',
      'ProgressAnalytics': 'browsing',
      'Leaderboard': 'browsing',
      'Profile': 'browsing',
      'Home': 'idle',
      'StudentDashboard': 'browsing'
    }
    return activityMap[routeName] || 'browsing'
  }

  /**
   * Get user-friendly page name
   */
  function getPageName(routeName) {
    const pageNames = {
      'Chat': '💬 Assessment Chat',
      'LearningRoom': '📋 ทำใบงาน',
      'WorksheetForm': '📋 ทำใบงาน',
      'LearningRoomList': '🏫 ห้องกิจกรรม',
      'MyProgress': '📈 ความคืบหน้า',
      'ProgressAnalytics': '📊 Analytics',
      'Leaderboard': '🏆 Leaderboard',
      'Profile': '👤 Profile',
      'Home': '🏠 Home',
      'AdaptiveLearning': '🎯 Adaptive Learning',
      'GoalSetting': '🎯 ตั้งเป้าหมาย',
      'ProgressMap': '🗺️ Progress Map',
      'StudentDashboard': '📊 Dashboard'
    }
    return pageNames[routeName] || routeName || 'Unknown'
  }

  /**
   * Check if user is a student
   */
  function isStudent() {
    const role = authStore.userProfile?.role || authStore.userData?.role
    console.log('[Presence] Checking role:', role, 'isStudent computed:', authStore.isStudent)
    return role === 'student' || authStore.isStudent
  }

  /**
   * Update presence document
   */
  async function updatePresence(additionalData = {}) {
    // Must be logged in and be a student
    if (!authStore.user) {
      console.log('[Presence] No user logged in')
      return
    }
    
    if (!isStudent()) {
      console.log('[Presence] Not a student, skipping presence update')
      return
    }

    try {
      presenceDocRef = doc(db, 'userPresence', authStore.user.uid)
      
      const userData = authStore.userProfile || authStore.userData || {}
      const presenceData = {
        odId: authStore.user.uid,
        studentId: userData.studentId || '',
        displayName: userData.displayName || authStore.user.displayName || 'Unknown',
        role: 'student',
        currentPage: getPageName(route?.name),
        currentActivity: getActivityFromRoute(route?.name),
        courseId: route?.query?.courseId || null,
        lastActive: serverTimestamp(),
        isOnline: true,
        ...additionalData
      }

      console.log('[Presence] Updating:', presenceData.displayName, presenceData.currentPage)
      await setDoc(presenceDocRef, presenceData, { merge: true })
      console.log('[Presence] ✅ Updated successfully')
    } catch (error) {
      console.error('[Presence] Failed to update:', error)
    }
  }

  /**
   * Remove presence document (go offline)
   */
  async function removePresence() {
    if (!authStore.user) return

    try {
      presenceDocRef = doc(db, 'userPresence', authStore.user.uid)
      await deleteDoc(presenceDocRef)
    } catch (error) {
      console.error('Failed to remove presence:', error)
    }
  }

  /**
   * Start heartbeat
   */
  function startHeartbeat() {
    if (heartbeatTimer) return
    
    // Initial presence update
    updatePresence()
    
    // Heartbeat every 30 seconds
    heartbeatTimer = setInterval(() => {
      updatePresence()
    }, HEARTBEAT_INTERVAL)
    
    isTracking.value = true
  }

  /**
   * Stop heartbeat
   */
  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    isTracking.value = false
  }

  /**
   * Handle visibility change (tab hidden/shown)
   */
  function handleVisibilityChange() {
    if (document.hidden) {
      // Tab is hidden - update with idle status
      updatePresence({ currentActivity: 'idle' })
    } else {
      // Tab is visible - resume normal tracking
      updatePresence()
    }
  }

  /**
   * Handle before unload (browser close/refresh)
   */
  function handleBeforeUnload() {
    // Synchronous delete attempt (may not complete)
    removePresence()
  }

  // Watch route changes
  watch(() => route?.name, (newRouteName) => {
    if (isTracking.value && newRouteName) {
      updatePresence()
    }
  })

  // Watch for user login - start tracking when student logs in
  watch(() => authStore.user, (newUser) => {
    console.log('[Presence] User watch triggered:', newUser?.uid, 'isStudent:', isStudent())
    if (newUser && isStudent()) {
      console.log('[Presence] User logged in, starting heartbeat')
      startHeartbeat()
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('beforeunload', handleBeforeUnload)
    } else if (!newUser && isTracking.value) {
      console.log('[Presence] User logged out, stopping heartbeat')
      stopHeartbeat()
      removePresence()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, { immediate: true })

  // Also watch userProfile for role changes (this is the main one!)
  watch(() => authStore.userProfile, (newData) => {
    console.log('[Presence] userProfile watch triggered:', newData?.role, 'user:', authStore.user?.uid)
    if (newData && authStore.user && isStudent() && !isTracking.value) {
      console.log('[Presence] User profile loaded, starting heartbeat')
      startHeartbeat()
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('beforeunload', handleBeforeUnload)
    }
  }, { immediate: true, deep: true })

  // Also watch isStudent computed directly
  watch(() => authStore.isStudent, (newValue) => {
    console.log('[Presence] isStudent watch triggered:', newValue)
    if (newValue && authStore.user && !isTracking.value) {
      console.log('[Presence] isStudent became true, starting heartbeat')
      startHeartbeat()
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('beforeunload', handleBeforeUnload)
    }
  }, { immediate: true })

  // Lifecycle - cleanup on unmount
  onMounted(() => {
    // Check if user is already logged in
    if (authStore.user && isStudent()) {
      console.log('[Presence] Already logged in on mount, starting heartbeat')
      startHeartbeat()
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('beforeunload', handleBeforeUnload)
    }
  })

  onUnmounted(() => {
    stopHeartbeat()
    removePresence()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  return {
    isTracking,
    updatePresence,
    removePresence,
    startHeartbeat,
    stopHeartbeat
  }
}

/**
 * useOnlineStudents - For teachers to see online students
 */
export function useOnlineStudents(courseId = null) {
  const onlineStudents = ref([])
  const loading = ref(true)
  let unsubscribe = null

  function startListening() {
    loading.value = true
    
    // Calculate threshold (60 seconds ago)
    const thresholdTime = new Date(Date.now() - OFFLINE_THRESHOLD)
    
    // Build query
    let q = query(
      collection(db, 'userPresence'),
      where('role', '==', 'student'),
      where('isOnline', '==', true),
      orderBy('lastActive', 'desc')
    )

    // Real-time listener
    unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now()
      
      onlineStudents.value = snapshot.docs
        .map(doc => {
          const data = doc.data()
          const lastActive = data.lastActive?.toDate?.() || new Date(0)
          const isRecentlyActive = (now - lastActive.getTime()) < OFFLINE_THRESHOLD
          
          return {
            odId: doc.id,
            ...data,
            lastActive,
            isRecentlyActive,
            timeSinceActive: Math.floor((now - lastActive.getTime()) / 1000)
          }
        })
        .filter(student => {
          // Filter by course if specified
          if (courseId && student.courseId !== courseId) return false
          // Filter out stale entries
          return student.isRecentlyActive
        })
        .sort((a, b) => b.lastActive - a.lastActive)
      
      loading.value = false
    }, (error) => {
      console.error('Failed to listen to online students:', error)
      loading.value = false
    })
  }

  function stopListening() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  onMounted(() => {
    startListening()
  })

  onUnmounted(() => {
    stopListening()
  })

  return {
    onlineStudents,
    loading,
    startListening,
    stopListening
  }
}

/**
 * Activity icons for display
 */
export const activityIcons = {
  chat: '💬',
  worksheet: '📋',
  browsing: '👀',
  idle: '💤'
}

/**
 * Activity labels for display
 */
export const activityLabels = {
  chat: 'กำลังตอบคำถาม',
  worksheet: 'กำลังทำใบงาน',
  browsing: 'กำลังดูข้อมูล',
  idle: 'ไม่มีกิจกรรม'
}
