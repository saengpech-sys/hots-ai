<template>
  <div class="weekly-report">
    <!-- Header -->
    <div class="report-header">
      <div class="header-left">
        <h1>📊 รายงานประจำสัปดาห์</h1>
        <p class="subtitle">{{ formatWeekRange(selectedWeek) }}</p>
      </div>
      <div class="header-actions">
        <div class="week-selector">
          <button @click="previousWeek" class="nav-btn">←</button>
          <span class="current-week">สัปดาห์ที่ {{ weekNumber }}</span>
          <button @click="nextWeek" class="nav-btn" :disabled="isCurrentWeek">→</button>
        </div>
        <button class="export-btn" @click="exportReport">
          📤 ส่งออก PDF
        </button>
      </div>
    </div>

    <!-- Student Selector (for parent with multiple children) -->
    <div v-if="linkedStudents.length > 1" class="student-selector">
      <button 
        v-for="student in linkedStudents"
        :key="student.id"
        :class="['student-btn', { active: selectedStudentId === student.id }]"
        @click="selectStudent(student.id)"
      >
        <img :src="student.photoURL || '/default-avatar.png'" class="student-avatar" alt="avatar">
        <span>{{ student.name }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดรายงาน...</p>
    </div>

    <!-- Report Content -->
    <div v-else class="report-content">
      <!-- Summary Cards -->
      <div class="summary-section">
        <h2>📈 สรุปภาพรวม</h2>
        <div class="summary-cards">
          <div class="summary-card activity">
            <span class="card-icon">📚</span>
            <div class="card-content">
              <span class="card-value">{{ summary.totalActivities }}</span>
              <span class="card-label">กิจกรรมทั้งหมด</span>
            </div>
            <span :class="['trend', summary.activityTrend >= 0 ? 'up' : 'down']">
              {{ summary.activityTrend >= 0 ? '↑' : '↓' }} {{ Math.abs(summary.activityTrend) }}%
            </span>
          </div>

          <div class="summary-card time">
            <span class="card-icon">⏱️</span>
            <div class="card-content">
              <span class="card-value">{{ formatDuration(summary.totalTime) }}</span>
              <span class="card-label">เวลาเรียนรวม</span>
            </div>
            <span :class="['trend', summary.timeTrend >= 0 ? 'up' : 'down']">
              {{ summary.timeTrend >= 0 ? '↑' : '↓' }} {{ Math.abs(summary.timeTrend) }}%
            </span>
          </div>

          <div class="summary-card score">
            <span class="card-icon">⭐</span>
            <div class="card-content">
              <span class="card-value">{{ summary.avgScore.toFixed(1) }}</span>
              <span class="card-label">คะแนนเฉลี่ย</span>
            </div>
            <span :class="['trend', summary.scoreTrend >= 0 ? 'up' : 'down']">
              {{ summary.scoreTrend >= 0 ? '↑' : '↓' }} {{ Math.abs(summary.scoreTrend) }}%
            </span>
          </div>

          <div class="summary-card streak">
            <span class="card-icon">🔥</span>
            <div class="card-content">
              <span class="card-value">{{ summary.currentStreak }}</span>
              <span class="card-label">วัน Streak</span>
            </div>
            <span v-if="summary.streakRecord" class="streak-record">
              สูงสุด: {{ summary.streakRecord }} วัน
            </span>
          </div>
        </div>
      </div>

      <!-- HOTS Score Section -->
      <div class="hots-section">
        <h2>🧠 คะแนน HOTS (A.R.C.E.)</h2>
        <div class="hots-content">
          <div class="hots-chart">
            <div class="radar-chart-placeholder">
              <!-- Radar chart would go here -->
              <div class="dimension-bars">
                <div 
                  v-for="dim in hotsDimensions"
                  :key="dim.key"
                  class="dimension-bar"
                >
                  <div class="bar-header">
                    <span class="dim-icon">{{ dim.icon }}</span>
                    <span class="dim-name">{{ dim.name }}</span>
                    <span class="dim-score">{{ hotsScores[dim.key]?.toFixed(1) || 0 }}/5</span>
                  </div>
                  <div class="bar-track">
                    <div 
                      class="bar-fill"
                      :style="{ width: `${((hotsScores[dim.key] || 0) / 5) * 100}%` }"
                      :class="getScoreClass(hotsScores[dim.key])"
                    ></div>
                  </div>
                  <span :class="['trend-badge', hotsScores[dim.key + 'Trend'] >= 0 ? 'up' : 'down']">
                    {{ hotsScores[dim.key + 'Trend'] >= 0 ? '↑' : '↓' }} 
                    {{ Math.abs(hotsScores[dim.key + 'Trend'] || 0).toFixed(1) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="hots-analysis">
            <h3>💡 การวิเคราะห์</h3>
            <div class="analysis-content">
              <div class="strength-section">
                <h4>✅ จุดแข็ง</h4>
                <ul>
                  <li v-for="strength in analysis.strengths" :key="strength">
                    {{ strength }}
                  </li>
                </ul>
              </div>
              <div class="improvement-section">
                <h4>📈 ควรพัฒนา</h4>
                <ul>
                  <li v-for="area in analysis.improvements" :key="area">
                    {{ area }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Learning Outcomes Section -->
      <div class="lo-section">
        <h2>🎯 Learning Outcomes</h2>
        <div class="lo-summary">
          <div class="lo-stat">
            <span class="lo-value">{{ loProgress.passed }}</span>
            <span class="lo-label">ผ่านแล้ว</span>
          </div>
          <div class="lo-stat">
            <span class="lo-value">{{ loProgress.thisWeek }}</span>
            <span class="lo-label">ผ่านสัปดาห์นี้</span>
          </div>
          <div class="lo-stat">
            <span class="lo-value">{{ loProgress.remaining }}</span>
            <span class="lo-label">เหลืออีก</span>
          </div>
        </div>
        
        <div v-if="loProgress.newPassed?.length" class="new-los">
          <h3>🎉 LO ที่ผ่านใหม่สัปดาห์นี้</h3>
          <div class="lo-badges">
            <div 
              v-for="lo in loProgress.newPassed"
              :key="lo.code"
              class="lo-badge"
            >
              <span class="lo-code">{{ lo.code }}</span>
              <span class="lo-name">{{ lo.name }}</span>
              <span class="lo-date">{{ formatDate(lo.passedAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Daily Activity Section -->
      <div class="daily-section">
        <h2>📅 กิจกรรมรายวัน</h2>
        <div class="daily-chart">
          <div 
            v-for="day in dailyActivities"
            :key="day.date"
            class="day-column"
          >
            <div class="day-bar-container">
              <div 
                class="day-bar"
                :style="{ height: `${(day.activityCount / maxDailyActivity) * 100}%` }"
                :class="{ highlight: day.hasStreak }"
              >
                <span class="day-count" v-if="day.activityCount">{{ day.activityCount }}</span>
              </div>
            </div>
            <span class="day-label">{{ formatDayLabel(day.date) }}</span>
            <span v-if="day.hasStreak" class="streak-flame">🔥</span>
          </div>
        </div>
      </div>

      <!-- Detailed Activities -->
      <div class="activities-section">
        <h2>📝 รายละเอียดกิจกรรม</h2>
        
        <div class="activity-filters">
          <select v-model="activityFilter">
            <option value="all">ทั้งหมด</option>
            <option value="assessment">การประเมิน</option>
            <option value="worksheet">ใบงาน</option>
            <option value="lesson">บทเรียน</option>
          </select>
        </div>

        <div class="activity-list">
          <div 
            v-for="activity in filteredActivities"
            :key="activity.id"
            class="activity-item"
          >
            <div class="activity-icon" :class="activity.type">
              {{ getActivityIcon(activity.type) }}
            </div>
            <div class="activity-info">
              <span class="activity-title">{{ activity.title }}</span>
              <span class="activity-meta">
                {{ formatDate(activity.completedAt) }} • {{ activity.courseName }}
              </span>
            </div>
            <div v-if="activity.score !== undefined" class="activity-score">
              <span :class="['score', getScoreClass(activity.score / activity.maxScore * 5)]">
                {{ activity.score }}/{{ activity.maxScore }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Achievements Section -->
      <div v-if="achievements.length" class="achievements-section">
        <h2>🏆 ความสำเร็จประจำสัปดาห์</h2>
        <div class="achievements-grid">
          <div 
            v-for="achievement in achievements"
            :key="achievement.id"
            class="achievement-card"
          >
            <span class="achievement-icon">{{ achievement.icon }}</span>
            <div class="achievement-info">
              <span class="achievement-name">{{ achievement.name }}</span>
              <span class="achievement-desc">{{ achievement.description }}</span>
            </div>
            <span class="achievement-date">{{ formatDate(achievement.earnedAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Teacher Comments -->
      <div v-if="teacherComments.length" class="comments-section">
        <h2>💬 ความเห็นจากครู</h2>
        <div class="comments-list">
          <div 
            v-for="comment in teacherComments"
            :key="comment.id"
            class="comment-card"
          >
            <div class="comment-header">
              <img :src="comment.teacherPhoto || '/default-avatar.png'" class="teacher-avatar" alt="avatar">
              <div class="comment-meta">
                <span class="teacher-name">{{ comment.teacherName }}</span>
                <span class="comment-course">{{ comment.courseName }}</span>
              </div>
              <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
            </div>
            <p class="comment-text">{{ comment.text }}</p>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div class="recommendations-section">
        <h2>💡 คำแนะนำสำหรับสัปดาห์หน้า</h2>
        <div class="recommendations-list">
          <div 
            v-for="rec in recommendations"
            :key="rec.id"
            class="recommendation-card"
          >
            <span class="rec-icon">{{ rec.icon }}</span>
            <div class="rec-content">
              <span class="rec-title">{{ rec.title }}</span>
              <p class="rec-desc">{{ rec.description }}</p>
            </div>
            <button v-if="rec.actionUrl" class="rec-action" @click="goTo(rec.actionUrl)">
              {{ rec.actionLabel || 'ดูเพิ่มเติม' }} →
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Export Modal -->
    <div v-if="showExport" class="modal-overlay" @click.self="showExport = false">
      <div class="export-modal">
        <h3>📤 ส่งออกรายงาน</h3>
        <div class="export-options">
          <label>
            <input type="checkbox" v-model="exportOptions.summary">
            ภาพรวมสรุป
          </label>
          <label>
            <input type="checkbox" v-model="exportOptions.hots">
            คะแนน HOTS
          </label>
          <label>
            <input type="checkbox" v-model="exportOptions.lo">
            Learning Outcomes
          </label>
          <label>
            <input type="checkbox" v-model="exportOptions.activities">
            รายละเอียดกิจกรรม
          </label>
          <label>
            <input type="checkbox" v-model="exportOptions.achievements">
            ความสำเร็จ
          </label>
        </div>
        <div class="export-actions">
          <button class="btn-secondary" @click="showExport = false">ยกเลิก</button>
          <button class="btn-primary" @click="generatePDF">
            📄 สร้าง PDF
          </button>
          <button class="btn-primary" @click="sendEmail">
            📧 ส่ง Email
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'

const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(true)
const selectedWeek = ref(new Date())
const selectedStudentId = ref(null)
const linkedStudents = ref([])
const showExport = ref(false)
const activityFilter = ref('all')

// Report Data
const summary = ref({
  totalActivities: 0,
  totalTime: 0,
  avgScore: 0,
  currentStreak: 0,
  streakRecord: 0,
  activityTrend: 0,
  timeTrend: 0,
  scoreTrend: 0
})

const hotsScores = ref({
  analysis: 0,
  reasoning: 0,
  creativity: 0,
  evidence: 0
})

const analysis = ref({
  strengths: [],
  improvements: []
})

const loProgress = ref({
  passed: 0,
  thisWeek: 0,
  remaining: 0,
  newPassed: []
})

const dailyActivities = ref([])
const activities = ref([])
const achievements = ref([])
const teacherComments = ref([])
const recommendations = ref([])

// Export options
const exportOptions = ref({
  summary: true,
  hots: true,
  lo: true,
  activities: true,
  achievements: true
})

// Constants
const hotsDimensions = [
  { key: 'analysis', name: 'การวิเคราะห์', icon: '🔍' },
  { key: 'reasoning', name: 'การให้เหตุผล', icon: '🧩' },
  { key: 'creativity', name: 'ความคิดสร้างสรรค์', icon: '💡' },
  { key: 'evidence', name: 'หลักฐาน', icon: '📚' }
]

// Computed
const weekNumber = computed(() => {
  const start = new Date(selectedWeek.value.getFullYear(), 0, 1)
  const diff = selectedWeek.value - start
  const oneWeek = 7 * 24 * 60 * 60 * 1000
  return Math.ceil(diff / oneWeek)
})

const isCurrentWeek = computed(() => {
  const now = new Date()
  const currentWeekStart = getWeekStart(now)
  const selectedWeekStart = getWeekStart(selectedWeek.value)
  return currentWeekStart.getTime() === selectedWeekStart.getTime()
})

const maxDailyActivity = computed(() => {
  return Math.max(...dailyActivities.value.map(d => d.activityCount), 1)
})

const filteredActivities = computed(() => {
  if (activityFilter.value === 'all') return activities.value
  return activities.value.filter(a => a.type === activityFilter.value)
})

// Methods
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

function getWeekEnd(date) {
  const start = getWeekStart(date)
  return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
}

function formatWeekRange(date) {
  const start = getWeekStart(date)
  const end = getWeekEnd(date)
  
  const formatOptions = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('th-TH', formatOptions)} - ${end.toLocaleDateString('th-TH', formatOptions)} ${end.getFullYear() + 543}`
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate?.() || new Date(timestamp)
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short'
  })
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} นาที`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours} ชม. ${mins} นาที`
}

function formatDayLabel(date) {
  const d = new Date(date)
  const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
  return days[d.getDay()]
}

function getScoreClass(score) {
  if (score >= 4) return 'excellent'
  if (score >= 3) return 'good'
  if (score >= 2) return 'fair'
  return 'needs-improvement'
}

function getActivityIcon(type) {
  const icons = {
    assessment: '📝',
    worksheet: '📋',
    lesson: '📖',
    quiz: '❓'
  }
  return icons[type] || '📚'
}

function previousWeek() {
  const newDate = new Date(selectedWeek.value)
  newDate.setDate(newDate.getDate() - 7)
  selectedWeek.value = newDate
}

function nextWeek() {
  if (isCurrentWeek.value) return
  const newDate = new Date(selectedWeek.value)
  newDate.setDate(newDate.getDate() + 7)
  selectedWeek.value = newDate
}

function selectStudent(studentId) {
  selectedStudentId.value = studentId
  loadReport()
}

function goTo(url) {
  router.push(url)
}

function exportReport() {
  showExport.value = true
}

function generatePDF() {
  // PDF generation logic
  alert('กำลังสร้าง PDF...')
  showExport.value = false
}

function sendEmail() {
  // Email sending logic
  alert('กำลังส่ง Email...')
  showExport.value = false
}

// Load report data
async function loadReport() {
  loading.value = true
  
  try {
    const studentId = selectedStudentId.value
    const weekStart = getWeekStart(selectedWeek.value)
    const weekEnd = getWeekEnd(selectedWeek.value)
    
    // Load assessments for the week
    const assessmentsQuery = query(
      collection(db, 'assessments'),
      where('studentId', '==', studentId),
      where('createdAt', '>=', Timestamp.fromDate(weekStart)),
      where('createdAt', '<=', Timestamp.fromDate(weekEnd)),
      orderBy('createdAt', 'desc')
    )
    
    const assessmentsSnap = await getDocs(assessmentsQuery)
    const assessments = assessmentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'assessment'
    }))
    
    // Load worksheet submissions
    const worksheetsQuery = query(
      collection(db, 'worksheetSubmissions'),
      where('studentId', '==', studentId),
      where('submittedAt', '>=', Timestamp.fromDate(weekStart)),
      where('submittedAt', '<=', Timestamp.fromDate(weekEnd)),
      orderBy('submittedAt', 'desc')
    )
    
    const worksheetsSnap = await getDocs(worksheetsQuery)
    const worksheets = worksheetsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'worksheet'
    }))
    
    // Combine activities
    activities.value = [...assessments, ...worksheets].sort(
      (a, b) => (b.createdAt || b.submittedAt) - (a.createdAt || a.submittedAt)
    )
    
    // Calculate summary
    summary.value.totalActivities = activities.value.length
    
    // Calculate HOTS scores
    const hotsSum = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
    let hotsCount = 0
    
    assessments.forEach(a => {
      if (a.rubricScores) {
        Object.keys(hotsSum).forEach(key => {
          hotsSum[key] += a.rubricScores[key] || 0
        })
        hotsCount++
      }
    })
    
    if (hotsCount > 0) {
      Object.keys(hotsSum).forEach(key => {
        hotsScores.value[key] = hotsSum[key] / hotsCount
      })
    }
    
    // Calculate daily activities
    dailyActivities.value = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart)
      day.setDate(day.getDate() + i)
      const dayStr = day.toISOString().split('T')[0]
      
      const dayActivities = activities.value.filter(a => {
        const actDate = (a.createdAt || a.submittedAt)?.toDate?.() || new Date()
        return actDate.toISOString().split('T')[0] === dayStr
      })
      
      dailyActivities.value.push({
        date: day,
        activityCount: dayActivities.length,
        hasStreak: dayActivities.length > 0
      })
    }
    
    // Generate analysis
    const avgScore = Object.values(hotsScores.value).reduce((a, b) => a + b, 0) / 4
    summary.value.avgScore = avgScore
    
    const sortedDims = Object.entries(hotsScores.value)
      .filter(([k]) => !k.includes('Trend'))
      .sort((a, b) => b[1] - a[1])
    
    const dimNames = {
      analysis: 'การวิเคราะห์',
      reasoning: 'การให้เหตุผล',
      creativity: 'ความคิดสร้างสรรค์',
      evidence: 'การใช้หลักฐาน'
    }
    
    analysis.value.strengths = sortedDims.slice(0, 2).map(([k, v]) => 
      `${dimNames[k]} (${v.toFixed(1)}/5) - มีพัฒนาการดี`
    )
    
    analysis.value.improvements = sortedDims.slice(-2).reverse().map(([k, v]) => 
      `${dimNames[k]} (${v.toFixed(1)}/5) - ควรฝึกฝนเพิ่มเติม`
    )
    
    // Generate recommendations
    recommendations.value = [
      {
        id: 1,
        icon: '📚',
        title: 'ฝึกทักษะการวิเคราะห์',
        description: 'ลองทำแบบฝึกหัดเพิ่มเติมเกี่ยวกับการแยกแยะข้อมูล',
        actionUrl: '/adaptive-learning',
        actionLabel: 'ไปฝึก'
      },
      {
        id: 2,
        icon: '🎯',
        title: 'เป้าหมาย LO สัปดาห์หน้า',
        description: 'ลองพยายามผ่าน 2 LO ใหม่',
        actionUrl: '/goal-setting',
        actionLabel: 'ตั้งเป้าหมาย'
      }
    ]
    
  } catch (error) {
    console.error('Error loading report:', error)
  } finally {
    loading.value = false
  }
}

// Load linked students for parent
async function loadLinkedStudents() {
  if (authStore.isParent) {
    const linkedIds = authStore.userProfile?.linkedStudents || []
    // Load student details
    linkedStudents.value = linkedIds.map(id => ({ id, name: `Student ${id}` }))
    
    if (linkedStudents.value.length > 0) {
      selectedStudentId.value = linkedStudents.value[0].id
    }
  } else if (authStore.isStudent) {
    selectedStudentId.value = authStore.user?.uid
  }
}

watch(selectedWeek, () => {
  if (selectedStudentId.value) {
    loadReport()
  }
})

onMounted(async () => {
  await loadLinkedStudents()
  if (selectedStudentId.value) {
    await loadReport()
  }
})
</script>

<style scoped>
.weekly-report {
  padding: 1rem;
  max-width: 1100px;
  margin: 0 auto;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left h1 {
  margin: 0;
  font-size: 1.5rem;
}

.subtitle {
  color: var(--text-secondary);
  margin: 0.25rem 0 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.week-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-secondary);
  padding: 0.5rem;
  border-radius: 10px;
}

.nav-btn {
  padding: 0.5rem 0.75rem;
  background: var(--bg-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.current-week {
  font-weight: 600;
  padding: 0 0.5rem;
}

.export-btn {
  padding: 0.75rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

/* Student Selector */
.student-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  overflow-x: auto;
}

.student-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border: 2px solid transparent;
  border-radius: 20px;
  cursor: pointer;
}

.student-btn.active {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

.student-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

/* Loading */
.loading-state {
  text-align: center;
  padding: 4rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Summary Section */
.summary-section, .hots-section, .lo-section, .daily-section,
.activities-section, .achievements-section, .comments-section,
.recommendations-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.summary-section h2, .hots-section h2, .lo-section h2,
.daily-section h2, .activities-section h2, .achievements-section h2,
.comments-section h2, .recommendations-section h2 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 12px;
  position: relative;
}

.card-icon {
  font-size: 2rem;
}

.card-content {
  flex: 1;
}

.card-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.card-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.trend {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
}

.trend.up {
  background: #dcfce7;
  color: #166534;
}

.trend.down {
  background: #fee2e2;
  color: #991b1b;
}

.streak-record {
  font-size: 0.7rem;
  color: var(--text-secondary);
  position: absolute;
  bottom: 0.75rem;
  right: 0.75rem;
}

/* HOTS Section */
.hots-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .hots-content {
    grid-template-columns: 1fr;
  }
}

.dimension-bars {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dimension-bar {
  position: relative;
}

.bar-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.dim-icon {
  font-size: 1.25rem;
}

.dim-name {
  flex: 1;
  font-weight: 500;
}

.dim-score {
  font-weight: 700;
  color: var(--primary-color);
}

.bar-track {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.bar-fill.excellent { background: #10b981; }
.bar-fill.good { background: #3b82f6; }
.bar-fill.fair { background: #f59e0b; }
.bar-fill.needs-improvement { background: #ef4444; }

.trend-badge {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  border-radius: 8px;
}

.trend-badge.up {
  background: #dcfce7;
  color: #166534;
}

.trend-badge.down {
  background: #fee2e2;
  color: #991b1b;
}

.hots-analysis h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
}

.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.strength-section, .improvement-section {
  padding: 1rem;
  border-radius: 10px;
}

.strength-section {
  background: #dcfce7;
}

.improvement-section {
  background: #fef3c7;
}

.strength-section h4, .improvement-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
}

.strength-section ul, .improvement-section ul {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.85rem;
}

/* LO Section */
.lo-summary {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
}

.lo-stat {
  text-align: center;
}

.lo-value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
}

.lo-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.new-los h3 {
  margin: 1rem 0 0.75rem;
  font-size: 1rem;
}

.lo-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lo-badge {
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  background: #dcfce7;
  border-radius: 10px;
  min-width: 120px;
}

.lo-code {
  font-weight: 700;
  color: #166534;
}

.lo-name {
  font-size: 0.8rem;
  color: #15803d;
}

.lo-date {
  font-size: 0.7rem;
  color: #166534;
  margin-top: 0.25rem;
}

/* Daily Chart */
.daily-chart {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 150px;
  padding: 1rem 0;
}

.day-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.day-bar-container {
  flex: 1;
  width: 100%;
  max-width: 40px;
  display: flex;
  align-items: flex-end;
}

.day-bar {
  width: 100%;
  background: var(--primary-color);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding-bottom: 4px;
  transition: height 0.3s;
}

.day-bar.highlight {
  background: linear-gradient(to top, var(--primary-color), #f59e0b);
}

.day-count {
  font-size: 0.7rem;
  font-weight: 700;
  color: white;
}

.day-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.streak-flame {
  font-size: 0.75rem;
}

/* Activities */
.activity-filters {
  margin-bottom: 1rem;
}

.activity-filters select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border-radius: 10px;
}

.activity-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 1.25rem;
}

.activity-icon.assessment { background: #dbeafe; }
.activity-icon.worksheet { background: #dcfce7; }
.activity-icon.lesson { background: #f3e8ff; }

.activity-info {
  flex: 1;
}

.activity-title {
  display: block;
  font-weight: 500;
}

.activity-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.activity-score .score {
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
}

.score.excellent { background: #dcfce7; color: #166534; }
.score.good { background: #dbeafe; color: #1e40af; }
.score.fair { background: #fef3c7; color: #92400e; }
.score.needs-improvement { background: #fee2e2; color: #991b1b; }

/* Achievements */
.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
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
  font-size: 2rem;
}

.achievement-info {
  flex: 1;
}

.achievement-name {
  display: block;
  font-weight: 700;
  color: #92400e;
}

.achievement-desc {
  font-size: 0.8rem;
  color: #78350f;
}

.achievement-date {
  font-size: 0.7rem;
  color: #92400e;
}

/* Comments */
.comments-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.comment-card {
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 12px;
  border-left: 4px solid var(--primary-color);
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.teacher-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.comment-meta {
  flex: 1;
}

.teacher-name {
  display: block;
  font-weight: 600;
}

.comment-course {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.comment-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.comment-text {
  margin: 0;
  line-height: 1.6;
  color: var(--text-primary);
}

/* Recommendations */
.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recommendation-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 12px;
}

.rec-icon {
  font-size: 2rem;
}

.rec-content {
  flex: 1;
}

.rec-title {
  display: block;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.rec-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.rec-action {
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
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

.export-modal {
  background: var(--bg-primary);
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
}

.export-modal h3 {
  margin: 0 0 1rem 0;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.export-options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.export-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1rem;
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
