<template>
  <div class="learning-rooms-view">
    <!-- Top Navigation -->
    <nav class="top-navbar">
      <div class="nav-brand">
        <router-link to="/student" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <span class="brand-icon">🏫</span>
        <span class="brand-text">ห้องกิจกรรมการเรียนรู้</span>
      </div>
      <div class="nav-actions">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input type="text" v-model="searchQuery" placeholder="ค้นหาห้องกิจกรรม...">
        </div>
      </div>
    </nav>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
      <p>กำลังโหลดห้องกิจกรรม...</p>
    </div>

    <!-- Room List -->
    <div v-else class="rooms-container">
      <!-- Course Filter -->
      <div class="filter-section" v-if="courses.length > 0">
        <label>กรองตามรายวิชา:</label>
        <select v-model="selectedCourse">
          <option value="">ทุกรายวิชา</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.courseCode }}{{ course.courseCode && course.courseName ? ' - ' : '' }}{{ course.courseName }}
          </option>
        </select>
      </div>

      <!-- Rooms Grid -->
      <div v-if="filteredRooms.length > 0" class="rooms-grid">
        <div v-for="(room, index) in filteredRooms" :key="room.id" class="room-card" :class="'room-color-' + (index % 6)" @click="enterRoom(room.id)">
          <div class="room-header">
            <div class="room-number-badge" :class="'badge-color-' + (index % 6)">
              ห้อง {{ index + 1 }}
            </div>
            <span class="room-status" :class="room.status">
              {{ getStatusLabel(room.status) }}
            </span>
          </div>
          <h3>{{ room.name }}</h3>
          <p class="room-description">{{ room.description }}</p>
          <div class="room-meta">
            <span v-if="room.courseCode" class="meta-item">
              📚 {{ room.courseCode }}
            </span>
            <span v-if="room.topic && room.topic !== room.name" class="meta-item">
              📖 {{ room.topic }}
            </span>
          </div>
          <div class="room-stats">
            <div class="stat">
              <span class="stat-value">{{ room.worksheetCount || 0 }}</span>
              <span class="stat-label">ใบงาน</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ getCompletedCount(room) }}</span>
              <span class="stat-label">ทำแล้ว</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ getProgressPercent(room) }}%</span>
              <span class="stat-label">ความคืบหน้า</span>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: getProgressPercent(room) + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <span class="material-icons">school</span>
        <h3>ยังไม่มีห้องกิจกรรม</h3>
        <p>รอครูผู้สอนเปิดห้องกิจกรรมการเรียนรู้</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(true)
const rooms = ref([])
const courses = ref([])
const submissions = ref([])
const searchQuery = ref('')
const selectedCourse = ref('')

// Computed
const filteredRooms = computed(() => {
  let result = rooms.value.filter(room => room.status === 'published')
  
  if (selectedCourse.value) {
    result = result.filter(room => 
      room.courseId === selectedCourse.value || 
      room.courseCode === selectedCourse.value
    )
  }
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(room => 
      room.name?.toLowerCase().includes(q) ||
      room.description?.toLowerCase().includes(q) ||
      room.courseName?.toLowerCase().includes(q)
    )
  }
  
  return result
})

// Methods
function getStatusLabel(status) {
  const labels = {
    draft: 'ฉบับร่าง',
    published: 'เปิดให้เข้าถึง',
    closed: 'ปิดแล้ว'
  }
  return labels[status] || status
}

function getCompletedCount(room) {
  if (!room.worksheetIds?.length) return 0
  return room.worksheetIds.filter(wsId => 
    submissions.value.some(s => s.worksheetId === wsId && s.status === 'graded')
  ).length
}

function getProgressPercent(room) {
  if (!room.worksheetIds?.length) return 0
  const completed = getCompletedCount(room)
  return Math.round((completed / room.worksheetIds.length) * 100)
}

function enterRoom(roomId) {
  router.push(`/learning-room/${roomId}`)
}

async function loadData() {
  try {
    loading.value = true
    
    // Load rooms (published ones)
    const roomsQuery = query(
      collection(db, 'learningRooms'),
      where('status', '==', 'published')
    )
    const roomsSnapshot = await getDocs(roomsQuery)
    rooms.value = roomsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      worksheetCount: doc.data().worksheetIds?.length || 0
    }))
    
    // Load user's enrolled courses
    if (authStore.user?.uid) {
      // Load submissions
      const subsQuery = query(
        collection(db, 'worksheetSubmissions'),
        where('studentId', '==', authStore.user.uid)
      )
      const subsSnapshot = await getDocs(subsQuery)
      submissions.value = subsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    }
    
    // Extract unique courses from rooms
    const courseMap = new Map()
    rooms.value.forEach(room => {
      // ดึง course จาก courseId หรือ courseCode
      if (room.courseId || room.courseCode) {
        const courseKey = room.courseId || room.courseCode
        if (!courseMap.has(courseKey)) {
          courseMap.set(courseKey, {
            id: room.courseId || room.courseCode,
            courseCode: room.courseCode || '',
            courseName: room.courseName || room.name || ''
          })
        }
      }
    })
    courses.value = Array.from(courseMap.values())
    
  } catch (error) {
    console.error('Error loading rooms:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.learning-rooms-view {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Navbar */
.top-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.back-link:hover {
  background: var(--bg-primary);
  color: var(--primary);
}

.brand-icon {
  font-size: 1.5rem;
}

.brand-text {
  font-size: 1rem;
  font-weight: 600;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.5rem 1rem;
}

.search-box .material-icons {
  color: var(--text-secondary);
  font-size: 1.25rem;
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  color: var(--text-primary);
  width: 200px;
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;
}

/* Container */
.rooms-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Filter */
.filter-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.filter-section label {
  font-weight: 500;
  color: var(--text-secondary);
}

.filter-section select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  outline: none;
}

/* Rooms Grid */
.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.room-card {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1.5rem;
  border: 2px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

.room-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.room-icon {
  font-size: 2rem;
}

/* Room Number Badge */
.room-number-badge {
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.badge-color-0 {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
}

.badge-color-1 {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: white;
}

.badge-color-2 {
  background: linear-gradient(135deg, #ec4899, #be185d);
  color: white;
}

.badge-color-3 {
  background: linear-gradient(135deg, #10b981, #047857);
  color: white;
}

.badge-color-4 {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.badge-color-5 {
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: white;
}

/* Room Card Color Variants */
.room-card.room-color-0 {
  border-left: 4px solid #3b82f6;
}

.room-card.room-color-1 {
  border-left: 4px solid #8b5cf6;
}

.room-card.room-color-2 {
  border-left: 4px solid #ec4899;
}

.room-card.room-color-3 {
  border-left: 4px solid #10b981;
}

.room-card.room-color-4 {
  border-left: 4px solid #f59e0b;
}

.room-card.room-color-5 {
  border-left: 4px solid #ef4444;
}

.room-status {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
}

.room-status.published {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.room-status.draft {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.room-status.closed {
  background: rgba(107, 114, 128, 0.15);
  color: #6b7280;
}

.room-card h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
}

.room-description {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.room-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.meta-item {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--bg-primary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.room-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary);
}

.stat-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.progress-bar {
  height: 6px;
  background: var(--bg-primary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
}

.empty-state .material-icons {
  font-size: 4rem;
  opacity: 0.5;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

/* Responsive */
@media (max-width: 768px) {
  .rooms-container {
    padding: 1rem;
  }
  
  .rooms-grid {
    grid-template-columns: 1fr;
  }
  
  .search-box input {
    width: 150px;
  }
  
  .filter-section {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
