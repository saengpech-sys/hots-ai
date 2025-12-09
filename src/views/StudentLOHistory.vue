<template>
  <div class="lo-history">
    <div class="page-header">
      <h1>📈 ความคืบหน้า Learning Outcomes ของคุณ</h1>
      <p class="subtitle">ติดตามความก้าวหน้าในแต่ละรายวิชา</p>
    </div>

    <!-- System Update Notice -->
    <div class="system-notice card">
      <div class="notice-icon">🔄</div>
      <div class="notice-content">
        <h4>📢 ระบบประเมิน LO ใหม่ - เข้มงวดและแม่นยำยิ่งขึ้น</h4>
        <p><strong>เริ่ม 21 พ.ย. 2568:</strong> การประเมินผล LO ใช้เกณฑ์ใหม่ที่เข้มงวดขึ้น เพื่อสะท้อนความสามารถที่แท้จริงของคุณ</p>
        <div class="notice-highlight">
          📊 หาก LO ที่ผ่านลดลง แสดงว่าระบบกำลังประเมินตามมาตรฐานใหม่ที่สูงขึ้น
        </div>
      </div>
    </div>

    <!-- Course Filter -->
    <div v-if="!loading && enrolledCourses.length > 0" class="filter-section">
      <label for="course-filter" class="filter-label">🔍 เลือกรายวิชา:</label>
      <select 
        id="course-filter"
        v-model="selectedCourseId" 
        class="course-filter"
      >
        <option value="">📚 ทุกรายวิชา ({{ enrolledCourses.length }} วิชา)</option>
        <option 
          v-for="course in enrolledCourses" 
          :key="course.courseId" 
          :value="course.courseId"
        >
          {{ course.courseCode }} - {{ course.courseName }}
        </option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- No Data State -->
    <div v-if="!loading && enrolledCourses.length === 0" class="empty-state">
      <div class="empty-icon">📚</div>
      <h2>ยังไม่มีข้อมูลความคืบหน้า</h2>
      <p>เมื่อคุณเลือกรายวิชาและเริ่มทำการประเมิน ข้อมูลจะแสดงที่นี่</p>
      <button @click="$router.push('/student')" class="btn-primary">
        ไปยังหน้าหลัก
      </button>
    </div>

    <!-- Course Progress Cards -->
    <div v-if="!loading && filteredCourses.length > 0" class="courses-grid">
      <div 
        v-for="course in filteredCourses" 
        :key="course.courseId"
        class="course-card"
      >
        <!-- Course Header -->
        <div class="course-header">
          <h2>{{ course.courseCode }}</h2>
          <p class="course-name">{{ course.courseName }}</p>
        </div>

        <!-- Overall Progress -->
        <div class="overall-progress">
          <div class="progress-info">
            <span class="progress-label">ความคืบหน้าโดยรวม</span>
            <span class="progress-value">
              {{ course.progress.totalPassed }} / {{ course.totalLOs }} LO
              ({{ calculatePercentage(course.progress.totalPassed, course.totalLOs) }}%)
            </span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill"
              :style="{ 
                width: calculatePercentage(course.progress.totalPassed, course.totalLOs) + '%' 
              }"
            ></div>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats-row">
          <div class="stat-item">
            <div class="stat-icon">📝</div>
            <div class="stat-content">
              <div class="stat-value">{{ course.progress.assessmentCount }}</div>
              <div class="stat-label">ครั้งที่ประเมิน</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">⏰</div>
            <div class="stat-content">
              <div class="stat-value">{{ formatDate(course.progress.lastAssessedAt) }}</div>
              <div class="stat-label">ประเมินล่าสุด</div>
            </div>
          </div>
        </div>

        <!-- LO Checklist -->
        <div class="lo-checklist">
          <h3>Learning Outcomes ทั้งหมด</h3>
          <div class="lo-items">
            <div 
              v-for="lo in course.learningOutcomes" 
              :key="lo.code || lo.loCode"
              class="lo-item"
              :class="{ 'passed': isLOPassed(course.progress.passedLOs, lo.code || lo.loCode) }"
            >
              <div class="lo-status">
                <span v-if="isLOPassed(course.progress.passedLOs, lo.code || lo.loCode)" class="check-icon">✅</span>
                <span v-else class="pending-icon">⭕</span>
              </div>
              <div class="lo-details">
                <span class="lo-code">{{ lo.code || lo.loCode }}</span>
                <span class="lo-description">{{ lo.description || lo.loDescription }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="card-actions">
          <button 
            @click="goToCourse(course.courseId)" 
            class="btn-continue"
            :disabled="course.progress.totalPassed === course.totalLOs"
          >
            <span v-if="course.progress.totalPassed === course.totalLOs">
              🎉 ผ่านครบแล้ว
            </span>
            <span v-else>
              ▶️ ทำต่อ
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div v-if="!loading && filteredCourses.length > 0" class="summary-section">
      <h2>📊 สรุปภาพรวม{{ selectedCourseId ? ' (รายวิชาที่เลือก)' : '' }}</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-icon">📚</div>
          <div class="summary-content">
            <div class="summary-value">{{ filteredCourses.length }}</div>
            <div class="summary-label">รายวิชา{{ selectedCourseId ? 'ที่เลือก' : 'ที่เข้าร่วม' }}</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon">✅</div>
          <div class="summary-content">
            <div class="summary-value">{{ totalLOsPassed }}</div>
            <div class="summary-label">LO ที่ผ่านแล้ว</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon">🎯</div>
          <div class="summary-content">
            <div class="summary-value">{{ totalLOs }}</div>
            <div class="summary-label">LO ทั้งหมด</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon">📈</div>
          <div class="summary-content">
            <div class="summary-value">{{ overallCompletion }}%</div>
            <div class="summary-label">ความสำเร็จโดยรวม</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const enrolledCourses = ref([])
const loading = ref(true)
const selectedCourseId = ref('')

// Filtered courses based on selection
const filteredCourses = computed(() => {
  if (!selectedCourseId.value) {
    return enrolledCourses.value
  }
  return enrolledCourses.value.filter(c => c.courseId === selectedCourseId.value)
})

onMounted(async () => {
  await loadStudentProgress()
})

async function loadStudentProgress() {
  loading.value = true
  try {
    // โหลดความคืบหน้าทั้งหมดของนักเรียน
    const progressRef = collection(db, 'studentProgress')
    const q = query(progressRef, where('studentId', '==', authStore.user.uid))
    const snapshot = await getDocs(q)

    // โหลดข้อมูลรายวิชาแต่ละวิชา
    const coursePromises = snapshot.docs.map(async (progressDoc) => {
      const progressData = progressDoc.data()
      
      try {
        const courseDoc = await getDoc(doc(db, 'courses', progressData.courseId))
        if (courseDoc.exists()) {
          const courseData = courseDoc.data()
          return {
            courseId: progressData.courseId,
            courseCode: courseData.courseCode,
            courseName: courseData.courseName,
            courseDescription: courseData.courseDescription,
            learningOutcomes: courseData.learningOutcomes || [],
            totalLOs: (courseData.learningOutcomes || []).length,
            progress: {
              passedLOs: progressData.passedLOs || [],
              totalPassed: progressData.totalPassed || 0,
              assessmentCount: progressData.assessmentCount || 0,
              lastAssessedAt: progressData.lastAssessedAt
            }
          }
        }
      } catch (error) {
        console.error('Error loading course:', error)
      }
      return null
    })

    const courses = await Promise.all(coursePromises)
    enrolledCourses.value = courses.filter(c => c !== null)
  } catch (error) {
    console.error('Error loading student progress:', error)
  } finally {
    loading.value = false
  }
}

function isLOPassed(passedLOs, loCode) {
  return passedLOs.includes(loCode)
}

function calculatePercentage(passed, total) {
  if (total === 0) return 0
  return Math.round((passed / total) * 100)
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

function goToCourse(courseId) {
  localStorage.setItem('selectedCourseId', courseId)
  router.push('/student')
}

// Summary computeds
const totalLOsPassed = computed(() => 
  filteredCourses.value.reduce((sum, c) => sum + c.progress.totalPassed, 0)
)

const totalLOs = computed(() => 
  filteredCourses.value.reduce((sum, c) => sum + c.totalLOs, 0)
)

const overallCompletion = computed(() => {
  if (totalLOs.value === 0) return 0
  return Math.round((totalLOsPassed.value / totalLOs.value) * 100)
})
</script>

<style scoped>
.lo-history {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1rem;
}

.filter-section {
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.filter-label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
  white-space: nowrap;
}

.course-filter {
  flex: 1;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.course-filter:hover {
  border-color: var(--primary-color);
}

.course-filter:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.course-filter option {
  padding: 0.5rem;
  background: var(--bg-card);
  color: var(--text-primary);
}


/* Loading & Empty States */
.loading-state {
  text-align: center;
  padding: 4rem 2rem;
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
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
}

.empty-state h2 {
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.btn-primary {
  padding: 0.75rem 2rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
}

/* Courses Grid */
.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.course-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.course-header h2 {
  font-size: 1.5rem;
  color: var(--primary-color);
  margin-bottom: 0.25rem;
}

.course-name {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 500;
}

/* Progress */
.overall-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.progress-value {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.875rem;
}

.progress-bar {
  height: 10px;
  background: var(--border-color);
  border-radius: 5px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.3s ease;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.stat-icon {
  font-size: 1.75rem;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* LO Checklist */
.lo-checklist h3 {
  font-size: 1rem;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.lo-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.lo-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.lo-item.passed {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

.lo-status {
  flex-shrink: 0;
  font-size: 1.25rem;
}

.lo-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.lo-code {
  font-weight: 600;
  color: var(--primary-color);
  font-size: 0.875rem;
}

.lo-description {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.4;
}

/* Card Actions */
.card-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-continue {
  flex: 1;
  padding: 0.75rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-continue:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-continue:disabled {
  background: #10b981;
  cursor: not-allowed;
  opacity: 0.8;
}

/* Summary Section */
.summary-section {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.summary-section h2 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.summary-icon {
  font-size: 2.5rem;
}

.summary-content {
  flex: 1;
}

.summary-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
  margin-bottom: 0.25rem;
}

.summary-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* System Notice */
.system-notice {
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #e1f5fe, #f0f9ff);
  border-left: 4px solid #2196f3;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  padding: 1.25rem;
}

.dark-mode .system-notice {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border-left-color: #3b82f6;
}

.system-notice .notice-icon {
  font-size: 2rem;
  margin-right: 1rem;
  align-self: flex-start;
}

.notice-content h4 {
  color: #1976d2;
  font-size: 1.05rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.dark-mode .notice-content h4 {
  color: #60a5fa;
}

.notice-content p {
  color: #1565c0;
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.dark-mode .notice-content p {
  color: #93c5fd;
}

.notice-highlight {
  background: rgba(33, 150, 243, 0.1);
  padding: 0.75rem;
  border-radius: 6px;
  border-left: 3px solid #2196f3;
  font-size: 0.9rem;
  color: #1565c0;
  font-weight: 500;
}

.dark-mode .notice-highlight {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
}

/* Responsive */
@media (max-width: 768px) {
  .lo-history {
    padding: 1rem;
  }

  .courses-grid {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
