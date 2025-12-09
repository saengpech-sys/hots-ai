import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from './auth'

export const useNotificationStore = defineStore('notifications', () => {
  const authStore = useAuthStore()
  
  const notifications = ref([])
  const loading = ref(false)
  let unsubscribe = null

  const unreadCount = computed(() => {
    return notifications.value.filter(n => !n.read).length
  })

  const recentNotifications = computed(() => {
    return notifications.value.slice(0, 10)
  })

  function subscribeToNotifications() {
    if (!authStore.user?.uid) return

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', authStore.user.uid),
      orderBy('timestamp', 'desc')
    )

    unsubscribe = onSnapshot(q, (snapshot) => {
      notifications.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }))
    })
  }

  function unsubscribeFromNotifications() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    notifications.value = []
  }

  async function markAsRead(notificationId) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Mark as read error:', error)
    }
  }

  async function markAllAsRead() {
    try {
      const unreadNotifications = notifications.value.filter(n => !n.read)
      await Promise.all(
        unreadNotifications.map(n => markAsRead(n.id))
      )
    } catch (error) {
      console.error('Mark all as read error:', error)
    }
  }

  async function deleteNotification(notificationId) {
    try {
      await doc(db, 'notifications', notificationId).delete()
    } catch (error) {
      console.error('Delete notification error:', error)
    }
  }

  async function createNotification(userId, type, title, message, data = {}) {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        type, // 'risk-alert', 'improvement', 'goal-reminder', 'achievement', 'teacher-message'
        title,
        message,
        data,
        read: false,
        timestamp: serverTimestamp()
      })
    } catch (error) {
      console.error('Create notification error:', error)
      throw error
    }
  }

  return {
    notifications,
    loading,
    unreadCount,
    recentNotifications,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification
  }
})
