<template>
  <div class="parent-notifications">
    <!-- Header -->
    <div class="notification-header">
      <h2>🔔 การแจ้งเตือน</h2>
      <div class="header-actions">
        <button 
          v-if="unreadCount > 0"
          class="mark-all-btn"
          @click="markAllAsRead"
        >
          ✓ อ่านทั้งหมด
        </button>
        <button class="settings-btn" @click="showSettings = true">
          ⚙️
        </button>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <button 
        :class="['filter-tab', { active: filter === 'all' }]"
        @click="filter = 'all'"
      >
        ทั้งหมด
        <span v-if="totalCount" class="count-badge">{{ totalCount }}</span>
      </button>
      <button 
        :class="['filter-tab', { active: filter === 'unread' }]"
        @click="filter = 'unread'"
      >
        ยังไม่อ่าน
        <span v-if="unreadCount" class="count-badge highlight">{{ unreadCount }}</span>
      </button>
      <button 
        :class="['filter-tab', { active: filter === 'important' }]"
        @click="filter = 'important'"
      >
        ⭐ สำคัญ
      </button>
    </div>

    <!-- Category Filter -->
    <div class="category-filter">
      <button 
        v-for="cat in categories"
        :key="cat.key"
        :class="['category-btn', { active: selectedCategory === cat.key }]"
        @click="selectedCategory = selectedCategory === cat.key ? null : cat.key"
      >
        {{ cat.icon }} {{ cat.label }}
      </button>
    </div>

    <!-- Notifications List -->
    <div class="notifications-list">
      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>กำลังโหลด...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredNotifications.length === 0" class="empty-state">
        <span class="empty-icon">🔔</span>
        <p>ไม่มีการแจ้งเตือน</p>
      </div>

      <!-- Notification Items -->
      <div 
        v-else
        v-for="notif in filteredNotifications"
        :key="notif.id"
        :class="['notification-item', { 
          unread: !notif.read,
          important: notif.important 
        }]"
        @click="openNotification(notif)"
      >
        <div class="notif-icon" :class="notif.category">
          {{ getCategoryIcon(notif.category) }}
        </div>
        
        <div class="notif-content">
          <div class="notif-header">
            <span class="notif-title">{{ notif.title }}</span>
            <span class="notif-time">{{ formatTime(notif.createdAt) }}</span>
          </div>
          <p class="notif-message">{{ notif.message }}</p>
          
          <!-- Student Info -->
          <div v-if="notif.studentName" class="student-info">
            <span class="student-badge">👤 {{ notif.studentName }}</span>
            <span v-if="notif.courseName" class="course-badge">📚 {{ notif.courseName }}</span>
          </div>
          
          <!-- Progress Indicator (for achievement notifications) -->
          <div v-if="notif.progress" class="progress-indicator">
            <div class="progress-bar">
              <div 
                class="progress-fill"
                :style="{ width: `${notif.progress}%` }"
              ></div>
            </div>
            <span class="progress-text">{{ notif.progress }}%</span>
          </div>
          
          <!-- Score Display -->
          <div v-if="notif.score !== undefined" class="score-display">
            <span class="score-label">คะแนน:</span>
            <span :class="['score-value', getScoreClass(notif.score, notif.maxScore)]">
              {{ notif.score }}/{{ notif.maxScore }}
            </span>
          </div>
          
          <!-- Action Button -->
          <button 
            v-if="notif.actionUrl"
            class="action-btn"
            @click.stop="goToAction(notif)"
          >
            {{ notif.actionLabel || 'ดูรายละเอียด' }} →
          </button>
        </div>

        <!-- Actions -->
        <div class="notif-actions">
          <button 
            class="icon-btn"
            @click.stop="toggleImportant(notif)"
            :title="notif.important ? 'เลิกทำเครื่องหมาย' : 'ทำเครื่องหมายสำคัญ'"
          >
            {{ notif.important ? '⭐' : '☆' }}
          </button>
          <button 
            class="icon-btn"
            @click.stop="deleteNotification(notif)"
            title="ลบ"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- Load More -->
    <div v-if="hasMore" class="load-more">
      <button @click="loadMore" :disabled="loadingMore">
        {{ loadingMore ? 'กำลังโหลด...' : 'โหลดเพิ่มเติม' }}
      </button>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
      <div class="settings-modal">
        <div class="modal-header">
          <h3>⚙️ ตั้งค่าการแจ้งเตือน</h3>
          <button class="close-btn" @click="showSettings = false">✕</button>
        </div>
        
        <div class="settings-content">
          <!-- Push Notifications -->
          <div class="setting-section">
            <h4>🔔 Push Notifications</h4>
            <label class="setting-toggle">
              <input type="checkbox" v-model="settings.pushEnabled">
              <span class="toggle-slider"></span>
              <span class="toggle-label">เปิดการแจ้งเตือน Push</span>
            </label>
          </div>
          
          <!-- Email Notifications -->
          <div class="setting-section">
            <h4>📧 Email Notifications</h4>
            <label class="setting-toggle">
              <input type="checkbox" v-model="settings.emailEnabled">
              <span class="toggle-slider"></span>
              <span class="toggle-label">รับแจ้งเตือนทาง Email</span>
            </label>
            
            <div v-if="settings.emailEnabled" class="email-frequency">
              <label>ความถี่:</label>
              <select v-model="settings.emailFrequency">
                <option value="instant">ทันที</option>
                <option value="daily">รายวัน (สรุปเช้า)</option>
                <option value="weekly">รายสัปดาห์</option>
              </select>
            </div>
          </div>
          
          <!-- Notification Types -->
          <div class="setting-section">
            <h4>📋 ประเภทการแจ้งเตือน</h4>
            <div class="notification-types">
              <label v-for="type in notificationTypes" :key="type.key" class="type-toggle">
                <input type="checkbox" v-model="settings.enabledTypes[type.key]">
                <span>{{ type.icon }} {{ type.label }}</span>
              </label>
            </div>
          </div>
          
          <!-- Quiet Hours -->
          <div class="setting-section">
            <h4>🌙 ช่วงเวลาเงียบ</h4>
            <label class="setting-toggle">
              <input type="checkbox" v-model="settings.quietHoursEnabled">
              <span class="toggle-slider"></span>
              <span class="toggle-label">เปิดช่วงเวลาเงียบ</span>
            </label>
            
            <div v-if="settings.quietHoursEnabled" class="quiet-hours-config">
              <div class="time-range">
                <label>
                  จาก:
                  <input type="time" v-model="settings.quietStart">
                </label>
                <label>
                  ถึง:
                  <input type="time" v-model="settings.quietEnd">
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" @click="showSettings = false">ยกเลิก</button>
          <button class="btn-primary" @click="saveSettings">บันทึก</button>
        </div>
      </div>
    </div>

    <!-- Notification Detail Modal -->
    <div v-if="selectedNotification" class="modal-overlay" @click.self="selectedNotification = null">
      <div class="detail-modal">
        <div class="modal-header">
          <span class="detail-icon" :class="selectedNotification.category">
            {{ getCategoryIcon(selectedNotification.category) }}
          </span>
          <h3>{{ selectedNotification.title }}</h3>
          <button class="close-btn" @click="selectedNotification = null">✕</button>
        </div>
        
        <div class="detail-content">
          <div class="detail-meta">
            <span class="detail-time">{{ formatDate(selectedNotification.createdAt) }}</span>
            <span v-if="selectedNotification.studentName" class="detail-student">
              👤 {{ selectedNotification.studentName }}
            </span>
          </div>
          
          <p class="detail-message">{{ selectedNotification.message }}</p>
          
          <!-- Additional Details based on category -->
          <div v-if="selectedNotification.category === 'achievement'" class="achievement-details">
            <div class="achievement-card">
              <span class="achievement-icon">🏆</span>
              <div class="achievement-info">
                <span class="achievement-name">{{ selectedNotification.achievementName }}</span>
                <span class="achievement-desc">{{ selectedNotification.achievementDesc }}</span>
              </div>
            </div>
          </div>
          
          <div v-if="selectedNotification.category === 'assessment'" class="assessment-details">
            <div class="scores-breakdown">
              <h4>📊 คะแนนละเอียด</h4>
              <div class="score-grid">
                <div 
                  v-for="(score, key) in selectedNotification.rubricScores" 
                  :key="key"
                  class="score-item"
                >
                  <span class="score-label">{{ getScoreLabel(key) }}</span>
                  <div class="score-bar">
                    <div 
                      class="score-fill"
                      :style="{ width: `${(score / 5) * 100}%` }"
                    ></div>
                  </div>
                  <span class="score-value">{{ score }}/5</span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="selectedNotification.category === 'lo'" class="lo-details">
            <h4>🎯 Learning Outcomes ที่ผ่าน</h4>
            <div class="lo-list">
              <span 
                v-for="lo in selectedNotification.passedLOs" 
                :key="lo"
                class="lo-badge"
              >
                ✓ {{ lo }}
              </span>
            </div>
          </div>
        </div>
        
        <div v-if="selectedNotification.actionUrl" class="modal-footer">
          <button class="btn-primary" @click="goToAction(selectedNotification)">
            {{ selectedNotification.actionLabel || 'ดูรายละเอียด' }} →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  collection, query, where, orderBy, limit, 
  onSnapshot, updateDoc, deleteDoc, doc, 
  writeBatch, getDocs, startAfter
} from 'firebase/firestore'
import { db } from '@/firebase/config'

const router = useRouter()
const authStore = useAuthStore()

// State
const notifications = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(true)
const lastDoc = ref(null)

const filter = ref('all')
const selectedCategory = ref(null)
const showSettings = ref(false)
const selectedNotification = ref(null)

// Settings
const settings = ref({
  pushEnabled: true,
  emailEnabled: true,
  emailFrequency: 'daily',
  quietHoursEnabled: false,
  quietStart: '22:00',
  quietEnd: '07:00',
  enabledTypes: {
    achievement: true,
    assessment: true,
    lo: true,
    streak: true,
    activity: true,
    reminder: true
  }
})

// Categories
const categories = [
  { key: 'achievement', icon: '🏆', label: 'ความสำเร็จ' },
  { key: 'assessment', icon: '📝', label: 'การประเมิน' },
  { key: 'lo', icon: '🎯', label: 'LO' },
  { key: 'streak', icon: '🔥', label: 'Streak' },
  { key: 'activity', icon: '📚', label: 'กิจกรรม' },
  { key: 'reminder', icon: '⏰', label: 'แจ้งเตือน' }
]

const notificationTypes = [
  { key: 'achievement', icon: '🏆', label: 'ความสำเร็จและเหรียญตรา' },
  { key: 'assessment', icon: '📝', label: 'ผลการประเมิน' },
  { key: 'lo', icon: '🎯', label: 'Learning Outcomes' },
  { key: 'streak', icon: '🔥', label: 'Streak และกิจกรรมต่อเนื่อง' },
  { key: 'activity', icon: '📚', label: 'กิจกรรมการเรียน' },
  { key: 'reminder', icon: '⏰', label: 'การแจ้งเตือนทั่วไป' }
]

// Computed
const filteredNotifications = computed(() => {
  let result = [...notifications.value]
  
  if (filter.value === 'unread') {
    result = result.filter(n => !n.read)
  } else if (filter.value === 'important') {
    result = result.filter(n => n.important)
  }
  
  if (selectedCategory.value) {
    result = result.filter(n => n.category === selectedCategory.value)
  }
  
  return result
})

const unreadCount = computed(() => 
  notifications.value.filter(n => !n.read).length
)

const totalCount = computed(() => notifications.value.length)

// Methods
function getCategoryIcon(category) {
  const cat = categories.find(c => c.key === category)
  return cat?.icon || '🔔'
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate?.() || new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return 'เมื่อกี้'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชม. ที่แล้ว`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} วันที่แล้ว`
  
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate?.() || new Date(timestamp)
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getScoreClass(score, maxScore) {
  const percent = (score / maxScore) * 100
  if (percent >= 80) return 'excellent'
  if (percent >= 60) return 'good'
  if (percent >= 40) return 'fair'
  return 'needs-improvement'
}

function getScoreLabel(key) {
  const labels = {
    analysis: '🔍 การวิเคราะห์',
    reasoning: '🧩 การให้เหตุผล',
    creativity: '💡 ความคิดสร้างสรรค์',
    evidence: '📚 หลักฐาน'
  }
  return labels[key] || key
}

async function openNotification(notif) {
  // Mark as read
  if (!notif.read) {
    await updateDoc(doc(db, 'parentNotifications', notif.id), {
      read: true,
      readAt: new Date()
    })
    notif.read = true
  }
  
  selectedNotification.value = notif
}

async function toggleImportant(notif) {
  await updateDoc(doc(db, 'parentNotifications', notif.id), {
    important: !notif.important
  })
  notif.important = !notif.important
}

async function deleteNotification(notif) {
  if (!confirm('ลบการแจ้งเตือนนี้?')) return
  
  await deleteDoc(doc(db, 'parentNotifications', notif.id))
  notifications.value = notifications.value.filter(n => n.id !== notif.id)
}

async function markAllAsRead() {
  const batch = writeBatch(db)
  const unread = notifications.value.filter(n => !n.read)
  
  unread.forEach(n => {
    batch.update(doc(db, 'parentNotifications', n.id), {
      read: true,
      readAt: new Date()
    })
  })
  
  await batch.commit()
  notifications.value.forEach(n => n.read = true)
}

function goToAction(notif) {
  selectedNotification.value = null
  if (notif.actionUrl) {
    router.push(notif.actionUrl)
  }
}

async function saveSettings() {
  await updateDoc(doc(db, 'users', authStore.user.uid), {
    notificationSettings: { ...settings.value }
  })
  showSettings.value = false
  alert('บันทึกการตั้งค่าแล้ว')
}

// Load notifications
let unsubscribe = null
const PAGE_SIZE = 20

function loadNotifications() {
  loading.value = true
  
  const notifQuery = query(
    collection(db, 'parentNotifications'),
    where('parentId', '==', authStore.user?.uid),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE)
  )
  
  unsubscribe = onSnapshot(notifQuery, (snapshot) => {
    notifications.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    if (snapshot.docs.length > 0) {
      lastDoc.value = snapshot.docs[snapshot.docs.length - 1]
    }
    
    hasMore.value = snapshot.docs.length === PAGE_SIZE
    loading.value = false
  })
}

async function loadMore() {
  if (!lastDoc.value || loadingMore.value) return
  
  loadingMore.value = true
  
  const moreQuery = query(
    collection(db, 'parentNotifications'),
    where('parentId', '==', authStore.user?.uid),
    orderBy('createdAt', 'desc'),
    startAfter(lastDoc.value),
    limit(PAGE_SIZE)
  )
  
  const snapshot = await getDocs(moreQuery)
  const moreNotifs = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
  
  notifications.value.push(...moreNotifs)
  
  if (snapshot.docs.length > 0) {
    lastDoc.value = snapshot.docs[snapshot.docs.length - 1]
  }
  
  hasMore.value = snapshot.docs.length === PAGE_SIZE
  loadingMore.value = false
}

// Load user settings
async function loadSettings() {
  const userDoc = await getDocs(doc(db, 'users', authStore.user?.uid))
  if (userDoc.exists() && userDoc.data().notificationSettings) {
    settings.value = { ...settings.value, ...userDoc.data().notificationSettings }
  }
}

onMounted(() => {
  loadNotifications()
  loadSettings()
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<style scoped>
.parent-notifications {
  padding: 1rem;
  max-width: 800px;
  margin: 0 auto;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.notification-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.mark-all-btn, .settings-btn {
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.filter-tab {
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-tab.active {
  background: var(--primary-color);
  color: white;
}

.count-badge {
  padding: 0.15rem 0.5rem;
  background: rgba(0,0,0,0.1);
  border-radius: 10px;
  font-size: 0.75rem;
}

.count-badge.highlight {
  background: #ef4444;
  color: white;
}

/* Category Filter */
.category-filter {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.category-btn {
  padding: 0.4rem 0.75rem;
  background: var(--bg-secondary);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.8rem;
  white-space: nowrap;
}

.category-btn.active {
  background: var(--primary-light);
  color: var(--primary-color);
}

/* Notification Items */
.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.notification-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.notification-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.notification-item.unread {
  background: linear-gradient(135deg, var(--primary-light) 0%, var(--bg-secondary) 100%);
  border-left: 4px solid var(--primary-color);
}

.notification-item.important {
  border-right: 4px solid #f59e0b;
}

.notif-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border-radius: 12px;
  font-size: 1.5rem;
}

.notif-icon.achievement { background: #fef3c7; }
.notif-icon.assessment { background: #dbeafe; }
.notif-icon.lo { background: #dcfce7; }
.notif-icon.streak { background: #fee2e2; }
.notif-icon.activity { background: #e0e7ff; }
.notif-icon.reminder { background: #f3e8ff; }

.notif-content {
  flex: 1;
}

.notif-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.25rem;
}

.notif-title {
  font-weight: 600;
  color: var(--text-primary);
}

.notif-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.notif-message {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.student-info {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.student-badge, .course-badge {
  padding: 0.2rem 0.5rem;
  background: var(--bg-primary);
  border-radius: 4px;
  font-size: 0.75rem;
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-color);
  transition: width 0.3s;
}

.progress-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary-color);
}

.score-display {
  margin-top: 0.5rem;
}

.score-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.score-value {
  font-weight: 700;
  margin-left: 0.25rem;
}

.score-value.excellent { color: #10b981; }
.score-value.good { color: #3b82f6; }
.score-value.fair { color: #f59e0b; }
.score-value.needs-improvement { color: #ef4444; }

.action-btn {
  margin-top: 0.5rem;
  padding: 0.4rem 0.75rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
}

.notif-actions {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.icon-btn {
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.icon-btn:hover {
  opacity: 1;
}

/* Load More */
.load-more {
  text-align: center;
  margin-top: 1rem;
}

.load-more button {
  padding: 0.75rem 1.5rem;
  background: var(--bg-secondary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* Loading & Empty */
.loading-state, .empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.settings-modal, .detail-modal {
  background: var(--bg-primary);
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  flex: 1;
}

.close-btn {
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  color: var(--text-secondary);
}

.detail-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 1.25rem;
}

/* Settings Content */
.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}

.setting-section {
  margin-bottom: 1.5rem;
}

.setting-section h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
}

.setting-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.toggle-slider {
  width: 48px;
  height: 24px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  position: relative;
  transition: background 0.3s;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: left 0.3s;
}

.setting-toggle input:checked + .toggle-slider {
  background: var(--primary-color);
}

.setting-toggle input:checked + .toggle-slider::after {
  left: 26px;
}

.setting-toggle input {
  display: none;
}

.email-frequency {
  margin-top: 0.75rem;
  padding-left: 54px;
}

.email-frequency select {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.notification-types {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.type-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.type-toggle input {
  width: 18px;
  height: 18px;
}

.quiet-hours-config {
  margin-top: 0.75rem;
  padding-left: 54px;
}

.time-range {
  display: flex;
  gap: 1rem;
}

.time-range input {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* Detail Content */
.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}

.detail-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.detail-message {
  line-height: 1.7;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.achievement-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
}

.achievement-icon {
  font-size: 2.5rem;
}

.achievement-name {
  display: block;
  font-weight: 700;
  font-size: 1.1rem;
  color: #92400e;
}

.achievement-desc {
  font-size: 0.85rem;
  color: #78350f;
}

.scores-breakdown {
  margin-top: 1rem;
}

.scores-breakdown h4 {
  margin: 0 0 1rem 0;
}

.score-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.score-item .score-label {
  width: 140px;
  font-size: 0.85rem;
}

.score-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background: var(--primary-color);
  border-radius: 4px;
}

.score-item .score-value {
  width: 40px;
  text-align: right;
  font-weight: 600;
}

.lo-details h4 {
  margin: 0 0 0.75rem 0;
}

.lo-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lo-badge {
  padding: 0.4rem 0.75rem;
  background: #dcfce7;
  color: #166534;
  border-radius: 20px;
  font-size: 0.85rem;
}

.modal-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}
</style>
