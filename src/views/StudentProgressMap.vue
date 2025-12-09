<template>
  <div class="progress-map-container">
    <div class="header">
      <h1>🗺️ แผนที่การเรียนรู้</h1>
      <p class="subtitle">ติดตาม Learning Outcomes และเหรียญที่ได้รับ</p>
    </div>

    <div v-if="!gamificationStore.studentProgress" class="empty card">
      <p>📚 เลือกคอร์สจาก Dashboard เพื่อดูความคืบหน้า</p>
      <button @click="goToDashboard" class="btn-primary">กลับไปที่ Dashboard</button>
    </div>

    <div v-else class="map-content">
      <!-- Progress Header -->
      <div class="progress-header card">
        <div class="left">
          <h2>{{ courseData?.courseName || courseData?.name || 'คอร์สที่เลือก' }}</h2>
          <p class="stats-line">
            <span>⭐ {{ gamificationStore.totalPoints }} แต้ม</span>
            <span>🔥 {{ gamificationStore.currentStreak }} วันติดต่อกัน</span>
            <span>🎯 {{ passedLOs.length }}/{{ totalLOs }} LO</span>
          </p>
        </div>
        <div class="right">
          <div class="level-display">
            <span class="level-label">Level</span>
            <span class="level-number">{{ gamificationStore.level }}</span>
          </div>
          <div class="level-progress">
            <div class="bar">
              <div class="fill" :style="{ width: `${gamificationStore.levelProgress}%` }"></div>
            </div>
            <div class="next">อีก {{ gamificationStore.pointsToNextLevel }} แต้ม</div>
          </div>
        </div>
      </div>

      <!-- Learning Outcomes -->
      <div class="lo-section card">
        <h3>📚 Learning Outcomes</h3>
        <div class="lo-progress-summary">
          <span>ผ่านแล้ว: <strong>{{ passedLOs.length }}</strong></span>
          <span>เหลืออีก: <strong>{{ totalLOs - passedLOs.length }}</strong></span>
          <span>ความคืบหน้า: <strong>{{ progressPercentage }}%</strong></span>
        </div>
        <div class="lo-grid">
          <div 
            v-for="lo in courseData?.learningOutcomes || []" 
            :key="lo.code" 
            class="lo-item" 
            :class="{ passed: passedLOs.includes(lo.code) }"
          >
            <div class="lo-header">
              <div class="lo-code">{{ lo.code }}</div>
              <div class="lo-status">{{ passedLOs.includes(lo.code) ? '✅' : '🔒' }}</div>
            </div>
            <div class="lo-desc">{{ lo.description }}</div>
          </div>
        </div>
      </div>

      <!-- Badges Section -->
      <div class="badges-section card">
        <div class="section-header">
          <h3>🏅 เหรียญตรา</h3>
          <span class="badge-count">{{ gamificationStore.badgeCount }}/{{ gamificationStore.badgeDefinitions.length }}</span>
        </div>
        
        <div v-if="gamificationStore.earnedBadgeDetails.length === 0" class="no-badges">
          <p>🎯 ยังไม่มีเหรียญ เริ่มทำ Assessment เพื่อรับเหรียญแรก!</p>
        </div>
        
        <div v-else class="badges-grid">
          <div 
            v-for="badge in gamificationStore.earnedBadgeDetails" 
            :key="badge.id"
            class="badge-item"
          >
            <div class="badge-icon">{{ badge.icon }}</div>
            <div class="badge-meta">
              <div class="badge-name">{{ badge.name }}</div>
              <div class="badge-desc">{{ badge.description }}</div>
              <div class="badge-points">+{{ badge.points }} แต้ม</div>
            </div>
          </div>
        </div>

        <!-- Show next badges to earn -->
        <div v-if="gamificationStore.unearnedBadges.length > 0" class="next-badges">
          <h4>🎖️ เหรียญถัดไปที่จะได้รับ</h4>
          <div class="next-badges-preview">
            <div 
              v-for="badge in gamificationStore.unearnedBadges.slice(0, 3)" 
              :key="badge.id"
              class="next-badge-item"
            >
              <div class="badge-icon locked">🔒</div>
              <div class="badge-meta">
                <div class="badge-name">{{ badge.name }}</div>
                <div class="badge-desc">{{ badge.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="stats-summary card">
        <h3>📊 สถิติโดยรวม</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-icon">📝</div>
            <div class="stat-value">{{ gamificationStore.assessmentCount }}</div>
            <div class="stat-label">จำนวนครั้งที่ทำ</div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">⭐</div>
            <div class="stat-value">{{ gamificationStore.totalPoints }}</div>
            <div class="stat-label">คะแนนสะสม</div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">🔥</div>
            <div class="stat-value">{{ gamificationStore.maxStreak }}</div>
            <div class="stat-label">สตรีคสูงสุด</div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">🏅</div>
            <div class="stat-value">{{ gamificationStore.badgeCount }}</div>
            <div class="stat-label">เหรียญที่ได้</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useGamificationStore } from '@/stores/gamification'
import { useAuthStore } from '@/stores/auth'
import { db } from '@/firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'vue-router'

const gamificationStore = useGamificationStore()
const authStore = useAuthStore()
const router = useRouter()

const courseData = computed(() => {
  // Try to get course data from studentProgress
  return gamificationStore.studentProgress || null
})

const passedLOs = computed(() => gamificationStore.studentProgress?.passedLOs || [])

const totalLOs = computed(() => {
  return courseData.value?.learningOutcomes?.length || 0
})

const progressPercentage = computed(() => {
  if (totalLOs.value === 0) return 0
  return Math.round((passedLOs.value.length / totalLOs.value) * 100)
})

onMounted(async () => {
  // Ensure badge definitions are loaded
  if (gamificationStore.badgeDefinitions.length === 0) {
    await gamificationStore.loadBadgeDefinitions()
  }

  // If we have student progress, try to load the course data
  if (gamificationStore.studentProgress?.courseId) {
    try {
      const courseDoc = await getDoc(doc(db, 'courses', gamificationStore.studentProgress.courseId))
      if (courseDoc.exists()) {
        // Store course data in studentProgress for display
        gamificationStore.studentProgress.courseName = courseDoc.data().courseName || courseDoc.data().name
        gamificationStore.studentProgress.learningOutcomes = courseDoc.data().learningOutcomes || []
      }
    } catch (error) {
      console.error('Error loading course data:', error)
    }
  }
})

function goToDashboard() {
  router.push('/student')
}
</script>

<style scoped>
.progress-map-container {
  max-width: 1200px;
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
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.card {
  padding: 2rem;
  border-radius: 16px;
  background: var(--bg-secondary);
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty {
  text-align: center;
  padding: 4rem 2rem;
}

.empty p {
  font-size: 1.125rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.btn-primary {
  padding: 0.75rem 2rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
}

.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}

/* Progress Header */
.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.left h2 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  font-size: 1.75rem;
}

.stats-line {
  display: flex;
  gap: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.stats-line span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

.level-display {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.level-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.level-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary-color);
}

.level-progress {
  min-width: 200px;
}

.bar {
  height: 10px;
  background: var(--bg-tertiary);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
  border-radius: 5px;
  transition: width 0.6s ease;
}

.next {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-align: right;
}

/* Learning Outcomes */
.lo-section h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.lo-progress-summary {
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--bg-tertiary);
  border-radius: 8px;
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.lo-progress-summary strong {
  color: var(--primary-color);
  font-weight: 700;
}

.lo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.lo-item {
  padding: 1rem;
  border-radius: 12px;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  transition: all 0.3s;
}

.lo-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.lo-item.passed {
  border-color: rgba(34, 197, 94, 0.4);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(16, 185, 129, 0.05));
}

.lo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.lo-code {
  font-weight: 700;
  color: var(--primary-color);
  font-size: 1.1rem;
}

.lo-status {
  font-size: 1.5rem;
}

.lo-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Badges Section */
.badges-section h3 {
  margin: 0;
  color: var(--text-primary);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.badge-count {
  font-size: 1.125rem;
  color: var(--primary-color);
  font-weight: 700;
}

.no-badges {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.badge-item {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(217, 119, 6, 0.05));
  border: 2px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
  transition: all 0.3s;
}

.badge-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.5);
}

.badge-icon {
  font-size: 3rem;
  min-width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-icon.locked {
  opacity: 0.4;
  filter: grayscale(1);
}

.badge-meta {
  flex: 1;
}

.badge-name {
  font-weight: 700;
  color: var(--text-primary);
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.badge-desc {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.4;
  margin-bottom: 0.5rem;
}

.badge-points {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: var(--primary-color);
  color: white;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

/* Next Badges */
.next-badges {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid var(--border-color);
}

.next-badges h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.next-badges-preview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.next-badge-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  opacity: 0.7;
}

/* Stats Summary */
.stats-summary h3 {
  margin: 0 0 1.5rem 0;
  color: var(--text-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  background: var(--bg-primary);
  border-radius: 12px;
  text-align: center;
  transition: all 0.3s;
}

.stat-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Responsive */
@media (max-width: 768px) {
  .progress-map-container {
    padding: 1rem;
  }

  .header h1 {
    font-size: 2rem;
  }

  .progress-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .right {
    align-items: flex-start;
    width: 100%;
  }

  .level-progress {
    width: 100%;
  }

  .stats-line {
    flex-wrap: wrap;
  }

  .lo-grid,
  .badges-grid,
  .next-badges-preview {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>