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
      'LearningRoomList': 'browsing',
      'MyProgress': 'browsing',
      'ProgressAnalytics': 'browsing',
      'Leaderboard': 'browsing',
      'Profile': 'browsing',
      'Home': 'idle'
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
      'LearningRoomList': '🏫 ห้องกิจกรรม',
      'MyProgress': '📈 ความคืบหน้า',
      'ProgressAnalytics': '📊 Analytics',
      'Leaderboard': '🏆 Leaderboard',
      'Profile': '👤 Profile',
      'Home': '🏠 Home',
      'AdaptiveLearning': '🎯 Adaptive Learning',
      'GoalSetting': '🎯 ตั้งเป้าหมาย',
      'ProgressMap': '🗺️ Progress Map'
    }
    return pageNames[routeName] || routeName
  }

  /**
   * Update presence document
   */
  async function updatePresence(additionalData = {}) {
    if (!authStore.user || !authStore.isStudent) return

    try {
      presenceDocRef = doc(db, 'userPresence', authStore.user.uid)
      
      const presenceData = {
        odId: authStore.user.uid,
        studentId: authStore.userData?.studentId || '',
        displayName: authStore.userData?.displayName || authStore.user.displayName || 'Unknown',
        role: authStore.userData?.role || 'student',
        currentPage: getPageName(route.name),
        currentActivity: getActivityFromRoute(route.name),
        courseId: route.query?.courseId || null,
        lastActive: serverTimestamp(),
        isOnline: true,
        ...additionalData
      }

      await setDoc(presenceDocRef, presenceData, { merge: true })
    } catch (error) {
      console.error('Failed to update presence:', error)
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
  watch(() => route.name, (newRouteName) => {
    if (isTracking.value && newRouteName) {
      updatePresence()
    }
  })

  // Lifecycle
  onMounted(() => {
    if (authStore.user && authStore.isStudent) {
      startHeartbeat()
      
      // Listen for visibility changes
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      // Listen for page unload
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
