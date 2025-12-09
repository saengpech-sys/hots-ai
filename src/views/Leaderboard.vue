<template>
  <div class="leaderboard-container">
    <div class="header">
      <h1>🏆 ลีดเดอร์บอร์ด</h1>
      <p class="subtitle">อันดับนักเรียนผู้ทำผลงานโดดเด่น</p>
    </div>

    <!-- Scope Selector -->
    <div class="controls card">
      <div class="scope-selector">
        <label>ขอบเขต:</label>
        <select v-model="scope" @change="refreshLeaderboard">
          <option value="course">ภายในคอร์ส</option>
          <option value="global">ทั้งระบบ</option>
        </select>
      </div>

      <div class="course-selector" v-if="scope === 'course'">
        <label>คอร์ส:</label>
        <select v-model="selectedCourseId" @change="refreshLeaderboard">
          <option value="">-- เลือกคอร์ส --</option>
          <option v-for="course in availableCourses" :key="course.id" :value="course.id">
            {{ course.courseCode }} - {{ course.courseName }}
          </option>
        </select>
      </div>

      <button @click="refreshLeaderboard" :disabled="gamificationStore.loading" class="btn-refresh">
        {{ gamificationStore.loading ? '⏳ กำลังโหลด...' : '🔄 รีเฟรช' }}
      </button>
    </div>

    <!-- My Rank Card -->
    <div v-if="myRank" class="my-rank-card card">
      <div class="rank-badge">
        <span class="rank-number">{{ myRank }}</span>
        <span class="rank-label">อันดับของคุณ</span>
      </div>
      <div class="my-stats">
        <div class="stat">
          <span class="stat-icon">⭐</span>
          <span class="stat-value">{{ gamificationStore.totalPoints }}</span>
          <span class="stat-label">คะแนน</span>
        </div>
        <div class="stat">
          <span class="stat-icon">🏅</span>
          <span class="stat-value">{{ gamificationStore.badgeCount }}</span>
          <span class="stat-label">เหรียญ</span>
        </div>
        <div class="stat">
          <span class="stat-icon">🔥</span>
          <span class="stat-value">{{ gamificationStore.currentStreak }}</span>
          <span class="stat-label">สตรีค</span>
        </div>
      </div>
    </div>

    <!-- Leaderboard List -->
    <div v-if="gamificationStore.loading && gamificationStore.leaderboard.length === 0" class="loading">
      <div class="spinner"></div>
      <p>กำลังโหลดอันดับ...</p>
    </div>

    <div v-else-if="gamificationStore.leaderboard.length === 0" class="empty-state card">
      <p>📭 ยังไม่มีข้อมูลในลีดเดอร์บอร์ด</p>
    </div>

    <div v-else class="leaderboard-list">
      <div 
        v-for="(entry, index) in gamificationStore.leaderboard" 
        :key="entry.studentId"
        class="leaderboard-item card"
        :class="{ 
          'is-me': entry.studentId === authStore.user?.uid,
          'rank-1': entry.rank === 1,
          'rank-2': entry.rank === 2,
          'rank-3': entry.rank === 3
        }"
      >
        <!-- Rank -->
        <div class="rank">
          <span v-if="entry.rank <= 3" class="medal">{{ getMedal(entry.rank) }}</span>
          <span v-else class="rank-number">{{ entry.rank }}</span>
        </div>

        <!-- Student Info -->
        <div class="student-info">
          <div class="student-name">
            {{ entry.name }}
            <span v-if="entry.studentId === authStore.user?.uid" class="you-badge">คุณ</span>
          </div>
          <div class="student-details">
            {{ entry.studentNumber }} | {{ entry.grade }}/{{ entry.room }}
          </div>
        </div>

        <!-- Stats -->
        <div class="stats">
          <div class="stat-item">
            <span class="stat-icon">⭐</span>
            <span class="stat-value">{{ entry.totalPoints }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">🏅</span>
            <span class="stat-value">{{ entry.badgeCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">🔥</span>
            <span class="stat-value">{{ entry.currentStreak }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">🎯</span>
            <span class="stat-value">{{ entry.passedLOsCount }} LOs</span>
          </div>
        </div>

        <!-- Leaderboard Score -->
        <div class="final-score">
          <span class="score-label">คะแนนรวม</span>
          <span class="score-value">{{ entry.leaderboardScore.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <!-- Load More Button -->
    <div v-if="gamificationStore.leaderboard.length >= 10" class="load-more">
      <button @click="loadMore" class="btn-secondary">โหลดเพิ่ม</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGamificationStore } from '@/stores/gamification'
import { useAuthStore } from '@/stores/auth'
import { db } from '@/firebase/config'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'

const gamificationStore = useGamificationStore()
const authStore = useAuthStore()

const scope = ref('course')
const selectedCourseId = ref('')
const availableCourses = ref([])
const limitCount = ref(10)

// Computed
const myRank = computed(() => {
  if (!authStore.user?.uid) return null
  return gamificationStore.getMyRank(authStore.user.uid)
})

// Methods
async function loadAvailableCourses() {
  try {
    // For students, load courses they're enrolled in (via sessions)
    if (authStore.isStudent) {
      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('studentId', '==', authStore.user.uid)
      )
      const sessionsSnapshot = await getDocs(sessionsQuery)
      
      const courseIds = [...new Set(sessionsSnapshot.docs.map(doc => doc.data().courseId))]
      
      // Get course details
      const courses = []
      for (const courseId of courseIds) {
        if (!courseId) continue
        
        const courseRef = doc(db, 'courses', courseId)
        const courseDoc = await getDoc(courseRef)
        
        if (courseDoc.exists()) {
          courses.push({
            id: courseDoc.id,
            ...courseDoc.data()
          })
        }
      }
      
      availableCourses.value = courses
      
      if (courses.length > 0 && !selectedCourseId.value) {
        selectedCourseId.value = courses[0].id
      }
    } else {
      // For teachers, load all courses
      const coursesSnapshot = await getDocs(collection(db, 'courses'))
      availableCourses.value = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    }
  } catch (error) {
    console.error('Load available courses error:', error)
  }
}

async function refreshLeaderboard() {
  const courseId = scope.value === 'course' ? selectedCourseId.value : null
  await gamificationStore.loadLeaderboard(courseId, scope.value, limitCount.value)
}

function loadMore() {
  limitCount.value += 10
  refreshLeaderboard()
}

function getMedal(rank) {
  const medals = {
    1: '🥇',
    2: '🥈',
    3: '🥉'
  }
  return medals[rank] || rank
}

// Lifecycle
onMounted(async () => {
  await loadAvailableCourses()
  
  // Load student's own progress
  if (authStore.user?.uid && selectedCourseId.value) {
    await gamificationStore.loadStudentProgress(authStore.user.uid, selectedCourseId.value)
  }
  
  await refreshLeaderboard()
})

onUnmounted(() => {
  // Cleanup if needed
})
</script>

<style scoped>
.leaderboard-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.scope-selector,
.course-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.controls label {
  font-weight: 600;
  color: var(--text-primary);
}

.controls select {
  padding: 0.5rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-width: 150px;
}

.btn-refresh {
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  margin-left: auto;
}

.btn-refresh:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* My Rank Card */
.my-rank-card {
  display: flex;
  gap: 2rem;
  align-items: center;
  padding: 2rem;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
}

.rank-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 100px;
}

.rank-number {
  font-size: 3rem;
  font-weight: 700;
}

.rank-label {
  font-size: 0.9rem;
  opacity: 0.9;
}

.my-stats {
  display: flex;
  gap: 2rem;
  flex: 1;
}

.my-stats .stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.9;
}

/* Loading */
.loading {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

/* Leaderboard List */
.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  transition: all 0.3s;
}

.leaderboard-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.leaderboard-item.is-me {
  border: 2px solid var(--primary-color);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%);
}

.leaderboard-item.rank-1 {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%);
}

.leaderboard-item.rank-2 {
  background: linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, rgba(100, 116, 139, 0.05) 100%);
}

.leaderboard-item.rank-3 {
  background: linear-gradient(135deg, rgba(205, 127, 50, 0.1) 0%, rgba(180, 100, 40, 0.05) 100%);
}

.rank {
  min-width: 60px;
  text-align: center;
}

.medal {
  font-size: 2.5rem;
}

.rank-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.student-info {
  flex: 1;
}

.student-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.you-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  background: var(--primary-color);
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.student-details {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.stats {
  display: flex;
  gap: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-item .stat-icon {
  font-size: 1.25rem;
}

.stat-item .stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.final-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
  padding-left: 1.5rem;
  border-left: 2px solid var(--border-color);
}

.score-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.score-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
}

.load-more {
  text-align: center;
  margin-top: 2rem;
}

.btn-secondary {
  padding: 0.75rem 2rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-secondary:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

/* Responsive */
@media (max-width: 768px) {
  .leaderboard-container {
    padding: 1rem;
  }

  .controls {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-refresh {
    margin-left: 0;
  }

  .my-rank-card {
    flex-direction: column;
    text-align: center;
  }

  .my-stats {
    justify-content: center;
  }

  .leaderboard-item {
    flex-wrap: wrap;
    gap: 1rem;
  }

  .stats {
    gap: 1rem;
    flex-wrap: wrap;
  }

  .final-score {
    border-left: none;
    border-top: 2px solid var(--border-color);
    padding-left: 0;
    padding-top: 1rem;
    width: 100%;
  }
}
</style>
