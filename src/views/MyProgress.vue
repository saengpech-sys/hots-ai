<template>
  <div class="my-progress">
    <div class="page-header">
      <h1>📊 ความคืบหน้าของฉัน</h1>
      <p>ติดตามพัฒนาการทักษะ HOTS และ Learning Outcomes ของคุณ</p>
    </div>

    <!-- Tabs Navigation -->
    <div class="tabs-container">
      <button 
        @click="activeTab = 'skills'"
        :class="['tab-btn', { active: activeTab === 'skills' }]"
      >
        🎯 ทักษะ HOTS
      </button>
      <button 
        @click="activeTab = 'learning-outcomes'"
        :class="['tab-btn', { active: activeTab === 'learning-outcomes' }]"
      >
        📚 Learning Outcomes
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- HOTS Skills Tab -->
      <div v-show="activeTab === 'skills'" class="skills-tab">
        <div class="tab-header">
          <div class="header-actions">
            <select v-model="selectedTimeRange" class="time-range-select" @change="loadAssessmentHistory">
              <option value="7">7 วันที่ผ่านมา</option>
              <option value="14">14 วันที่ผ่านมา</option>
              <option value="30">30 วันที่ผ่านมา</option>
              <option value="90">90 วันที่ผ่านมา</option>
            </select>
            <button @click="exportSkillsData" class="btn btn-outline">
              📥 ส่งออกข้อมูล
            </button>
          </div>
        </div>

        <div v-if="loadingSkills" class="loading-state">
          <div class="spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>

        <div v-else-if="assessmentHistory.length === 0" class="empty-state card">
          <div class="empty-icon">📈</div>
          <h3>ยังไม่มีข้อมูลการประเมิน</h3>
          <p>เริ่มทำแบบประเมินเพื่อดูกราฟพัฒนาการของคุณ!</p>
          <router-link to="/chat" class="btn btn-primary">เริ่มเรียนรู้</router-link>
        </div>

        <div v-else class="skills-content">
          <!-- Summary Cards -->
          <div class="summary-cards">
            <div class="summary-card card">
              <div class="card-icon">📊</div>
              <div class="card-content">
                <div class="card-value">{{ assessmentHistory.length }}</div>
                <div class="card-label">จำนวนการประเมิน</div>
              </div>
            </div>

            <div class="summary-card card">
              <div class="card-icon">⭐</div>
              <div class="card-content">
                <div class="card-value">{{ averageScore.toFixed(1) }}/20</div>
                <div class="card-label">คะแนนเฉลี่ย</div>
                <div class="card-trend" :class="scoreTrend > 0 ? 'positive' : scoreTrend < 0 ? 'negative' : 'neutral'">
                  {{ scoreTrend > 0 ? '↗' : scoreTrend < 0 ? '↘' : '→' }} {{ Math.abs(scoreTrend).toFixed(1) }}
                </div>
              </div>
            </div>

            <div class="summary-card card">
              <div class="card-icon">🔥</div>
              <div class="card-content">
                <div class="card-value">{{ currentStreak }} วัน</div>
                <div class="card-label">ทำต่อเนื่อง</div>
              </div>
            </div>

            <div class="summary-card card">
              <div class="card-icon">💪</div>
              <div class="card-content">
                <div class="card-value">{{ strongestDimension.name }}</div>
                <div class="card-label">ทักษะที่แข็งแกร่งสุด</div>
                <div class="card-trend positive">{{ strongestDimension.score.toFixed(1) }}/5</div>
              </div>
            </div>
          </div>

          <!-- Overall Score Trend Chart -->
          <div class="chart-container card">
            <h3>📈 กราฟคะแนนรวม</h3>
            <div class="chart-wrapper">
              <div class="chart-canvas">
                <div class="y-axis">
                  <span>20</span>
                  <span>15</span>
                  <span>10</span>
                  <span>5</span>
                  <span>0</span>
                </div>
                <div class="chart-area">
                  <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="line-chart">
                    <line v-for="i in 5" :key="'grid-' + i" 
                          :x1="0" :y1="i * chartHeight / 5" 
                          :x2="chartWidth" :y2="i * chartHeight / 5"
                          stroke="var(--border-color)" stroke-width="1" opacity="0.3" />
                    
                    <polyline 
                      :points="scoreLinePoints"
                      fill="none"
                      stroke="#667eea"
                      stroke-width="3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    
                    <circle v-for="(point, idx) in scorePoints" :key="'point-' + idx"
                            :cx="point.x" :cy="point.y" r="5"
                            fill="#667eea" stroke="white" stroke-width="2"
                            class="chart-point" />
                  </svg>
                  <div class="x-axis">
                    <span v-for="(date, idx) in chartDates" :key="'date-' + idx">
                      {{ formatDate(date) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- HOTS Dimensions Comparison -->
          <div class="dimensions-container card">
            <h3>🎯 เปรียบเทียบทักษะ HOTS (ก่อน vs ปัจจุบัน)</h3>
            <div class="dimensions-chart">
              <div v-for="dim in dimensionStats" :key="dim.name" class="dimension-row">
                <div class="dimension-label">{{ dim.emoji }} {{ dim.name }}</div>
                <div class="dimension-bars">
                  <div class="bar-group">
                    <div class="bar-label">ก่อนหน้า</div>
                    <div class="progress-bar">
                      <div class="progress-fill previous" :style="{ width: (dim.previous / 5 * 100) + '%' }">
                        {{ dim.previous.toFixed(1) }}
                      </div>
                    </div>
                  </div>
                  <div class="bar-group">
                    <div class="bar-label">ปัจจุบัน</div>
                    <div class="progress-bar">
                      <div class="progress-fill current" :style="{ width: (dim.current / 5 * 100) + '%' }">
                        {{ dim.current.toFixed(1) }}
                      </div>
                    </div>
                  </div>
                  <div class="improvement" :class="dim.improvement >= 0 ? 'positive' : 'negative'">
                    {{ dim.improvement >= 0 ? '+' : '' }}{{ dim.improvement.toFixed(1) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Assessments List -->
          <div class="recent-assessments card">
            <h3>📚 การประเมินล่าสุด</h3>
            <div class="assessments-list">
              <div v-for="assessment in recentAssessments" :key="assessment.id" class="assessment-item">
                <div class="assessment-date">{{ formatDateTime(assessment.timestamp) }}</div>
                <div class="assessment-score">
                  <div class="score-badge" :class="getScoreClass(assessment.overallScore)">
                    {{ assessment.overallScore }}/20
                  </div>
                </div>
                <div class="assessment-dimensions">
                  <span class="dim-badge">🔍 {{ assessment.rubricScores.analysis }}/5</span>
                  <span class="dim-badge">🧠 {{ assessment.rubricScores.reasoning }}/5</span>
                  <span class="dim-badge">💡 {{ assessment.rubricScores.creativity }}/5</span>
                  <span class="dim-badge">📚 {{ assessment.rubricScores.evidence }}/5</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Learning Outcomes Tab -->
      <div v-show="activeTab === 'learning-outcomes'" class="lo-tab">
        <!-- System Update Notice -->
        <div class="system-notice card">
          <div class="notice-icon">🔄</div>
          <div class="notice-content">
            <h4>📢 ประกาศสำคัญ: การปรับปรุงระบบประเมิน Learning Outcomes</h4>
            <p>
              <strong>เริ่มวันที่ 21 พ.ย. 2568:</strong> ระบบการประเมิน LO ได้รับการปรับปรุงให้เข้มงวดและแม่นยำยิ่งขึ้น เพื่อให้การประเมินสะท้อนความสามารถจริงของนักเรียน
            </p>
            <ul class="notice-list">
              <li><strong>เกณฑ์การผ่าน LO ใหม่:</strong> ต้องได้คะแนน HOTS ≥ 3 คะแนน (จาก 5) ในมิติที่เกี่ยวข้อง</li>
              <li><strong>การตรวจสอบเนื้อหา:</strong> ระบบตรวจสอบความสอดคล้องของเนื้อหาการตอบกับ LO</li>
              <li><strong>หลักฐานเชิงประจักษ์:</strong> ต้องแสดงการให้เหตุผลและหลักฐานประกอบคำตอบ</li>
            </ul>
            <p class="notice-result">
              📊 <strong>ผลกระทบ:</strong> การปรับปรุงนี้อาจทำให้จำนวน LO ที่ผ่านแล้วลดลงเล็กน้อย แต่จะสะท้อนความสามารถที่แท้จริงของคุณ
            </p>
          </div>
        </div>
        
        <!-- Course Filter -->
        <div v-if="!loadingLO && enrolledCourses.length > 0" class="filter-section">
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

        <div v-if="loadingLO" class="loading-state">
          <div class="spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>

        <div v-else-if="enrolledCourses.length === 0" class="empty-state card">
          <div class="empty-icon">📚</div>
          <h3>ยังไม่มีข้อมูลความคืบหน้า</h3>
          <p>เมื่อคุณเลือกรายวิชาและเริ่มทำการประเมิน ข้อมูลจะแสดงที่นี่</p>
          <router-link to="/student" class="btn btn-primary">ไปยังหน้าหลัก</router-link>
        </div>

        <div v-else>
          <!-- Course Progress Cards -->
          <div class="courses-grid">
            <div 
              v-for="course in filteredCourses" 
              :key="course.courseId"
              class="course-card card"
            >
              <div class="course-header">
                <h2>{{ course.courseCode }}</h2>
                <p class="course-name">{{ course.courseName }}</p>
              </div>

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
                    class="progress-fill lo-progress"
                    :style="{ 
                      width: calculatePercentage(course.progress.totalPassed, course.totalLOs) + '%' 
                    }"
                  ></div>
                </div>
              </div>

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
                    <div class="stat-value">{{ formatDateShort(course.progress.lastAssessedAt) }}</div>
                    <div class="stat-label">ประเมินล่าสุด</div>
                  </div>
                </div>
              </div>

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
          <div class="summary-section card">
            <h2>📊 สรุปภาพรวม{{ selectedCourseId ? ' (รายวิชาที่เลือก)' : '' }}</h2>
            <div class="summary-grid">
              <div class="summary-stat">
                <div class="summary-icon">📚</div>
                <div class="summary-content">
                  <div class="summary-value">{{ filteredCourses.length }}</div>
                  <div class="summary-label">รายวิชา{{ selectedCourseId ? 'ที่เลือก' : 'ที่เข้าร่วม' }}</div>
                </div>
              </div>
              <div class="summary-stat">
                <div class="summary-icon">✅</div>
                <div class="summary-content">
                  <div class="summary-value">{{ totalLOsPassed }}</div>
                  <div class="summary-label">LO ที่ผ่านแล้ว</div>
                </div>
              </div>
              <div class="summary-stat">
                <div class="summary-icon">🎯</div>
                <div class="summary-content">
                  <div class="summary-value">{{ totalLOs }}</div>
                  <div class="summary-label">LO ทั้งหมด</div>
                </div>
              </div>
              <div class="summary-stat">
                <div class="summary-icon">📈</div>
                <div class="summary-content">
                  <div class="summary-value">{{ overallCompletion }}%</div>
                  <div class="summary-label">ความสำเร็จโดยรวม</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { getStudentPassedLOs } from '@/utils/loProgress'

const authStore = useAuthStore()
const router = useRouter()

// Tab state
const activeTab = ref('skills')

// Skills tab state
const loadingSkills = ref(true)
const selectedTimeRange = ref(30)
const assessmentHistory = ref([])
const chartWidth = 800
const chartHeight = 300

// Learning Outcomes tab state
const loadingLO = ref(true)
const enrolledCourses = ref([])
const selectedCourseId = ref('')

// Skills tab - Computed
const averageScore = computed(() => {
  if (assessmentHistory.value.length === 0) return 0
  const total = assessmentHistory.value.reduce((sum, a) => sum + a.overallScore, 0)
  return total / assessmentHistory.value.length
})

const scoreTrend = computed(() => {
  if (assessmentHistory.value.length < 4) return 0
  
  const mid = Math.floor(assessmentHistory.value.length / 2)
  const recentHalf = assessmentHistory.value.slice(0, mid)
  const olderHalf = assessmentHistory.value.slice(mid)
  
  const recentAvg = recentHalf.reduce((sum, a) => sum + a.overallScore, 0) / recentHalf.length
  const olderAvg = olderHalf.reduce((sum, a) => sum + a.overallScore, 0) / olderHalf.length
  
  return recentAvg - olderAvg
})

const currentStreak = computed(() => {
  if (assessmentHistory.value.length === 0) return 0
  
  let streak = 1
  for (let i = 0; i < assessmentHistory.value.length - 1; i++) {
    const current = new Date(assessmentHistory.value[i].timestamp).toDateString()
    const next = new Date(assessmentHistory.value[i + 1].timestamp).toDateString()
    
    const currentDate = new Date(current)
    const nextDate = new Date(next)
    const dayDiff = Math.floor((currentDate - nextDate) / (1000 * 60 * 60 * 24))
    
    if (dayDiff === 1) {
      streak++
    } else {
      break
    }
  }
  
  return streak
})

const strongestDimension = computed(() => {
  if (assessmentHistory.value.length === 0) {
    return { name: 'N/A', score: 0 }
  }
  
  const dimensions = {
    analysis: { name: 'การวิเคราะห์', emoji: '🔍', total: 0 },
    reasoning: { name: 'การให้เหตุผล', emoji: '🧠', total: 0 },
    creativity: { name: 'ความคิดสร้างสรรค์', emoji: '💡', total: 0 },
    evidence: { name: 'การใช้หลักฐาน', emoji: '📚', total: 0 }
  }
  
  assessmentHistory.value.forEach(a => {
    dimensions.analysis.total += a.rubricScores.analysis
    dimensions.reasoning.total += a.rubricScores.reasoning
    dimensions.creativity.total += a.rubricScores.creativity
    dimensions.evidence.total += a.rubricScores.evidence
  })
  
  const avgDimensions = Object.entries(dimensions).map(([key, val]) => ({
    key,
    name: val.name,
    score: val.total / assessmentHistory.value.length
  }))
  
  avgDimensions.sort((a, b) => b.score - a.score)
  
  return avgDimensions[0]
})

const dimensionStats = computed(() => {
  if (assessmentHistory.value.length < 2) return []
  
  const mid = Math.floor(assessmentHistory.value.length / 2)
  const recentHalf = assessmentHistory.value.slice(0, mid)
  const olderHalf = assessmentHistory.value.slice(mid)
  
  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  const emojis = { analysis: '🔍', reasoning: '🧠', creativity: '💡', evidence: '📚' }
  const names = { 
    analysis: 'การวิเคราะห์', 
    reasoning: 'การให้เหตุผล', 
    creativity: 'ความคิดสร้างสรรค์', 
    evidence: 'การใช้หลักฐาน' 
  }
  
  return dimensions.map(dim => {
    const previousAvg = olderHalf.reduce((sum, a) => sum + a.rubricScores[dim], 0) / olderHalf.length
    const currentAvg = recentHalf.reduce((sum, a) => sum + a.rubricScores[dim], 0) / recentHalf.length
    
    return {
      name: names[dim],
      emoji: emojis[dim],
      previous: previousAvg,
      current: currentAvg,
      improvement: currentAvg - previousAvg
    }
  })
})

const scorePoints = computed(() => {
  if (assessmentHistory.value.length === 0) return []
  
  const maxPoints = 20
  const reversed = [...assessmentHistory.value].reverse()
  
  return reversed.map((a, idx) => ({
    x: (idx / (reversed.length - 1 || 1)) * chartWidth,
    y: chartHeight - (a.overallScore / maxPoints * chartHeight)
  }))
})

const scoreLinePoints = computed(() => {
  return scorePoints.value.map(p => `${p.x},${p.y}`).join(' ')
})

const chartDates = computed(() => {
  const reversed = [...assessmentHistory.value].reverse()
  const step = Math.ceil(reversed.length / 5)
  const dates = []
  
  for (let i = 0; i < reversed.length; i += step) {
    dates.push(reversed[i].timestamp)
  }
  
  return dates
})

const recentAssessments = computed(() => {
  return assessmentHistory.value.slice(0, 10)
})

// LO tab - Computed
const filteredCourses = computed(() => {
  if (!selectedCourseId.value) {
    return enrolledCourses.value
  }
  return enrolledCourses.value.filter(c => c.courseId === selectedCourseId.value)
})

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

// Methods - Skills tab
async function loadAssessmentHistory() {
  loadingSkills.value = true
  
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - selectedTimeRange.value)
    
    const q = query(
      collection(db, 'assessments'),
      where('studentId', '==', authStore.user.uid),
      where('timestamp', '>=', cutoffDate),
      orderBy('timestamp', 'desc'),
      limit(100)
    )
    
    const snapshot = await getDocs(q)
    assessmentHistory.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date()
    }))
  } catch (error) {
    console.error('Error loading assessment history:', error)
  } finally {
    loadingSkills.value = false
  }
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return '-'
    return `${date.getDate()}/${date.getMonth() + 1}`
  } catch (e) {
    return '-'
  }
}

function formatDateTime(timestamp) {
  if (!timestamp) return '(รอบันทึกวันที่)'
  try {
    const date = timestamp?.toDate?.() || new Date(timestamp)
    if (isNaN(date.getTime())) return '(รอบันทึกวันที่)'
    return date.toLocaleString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    return '(รอบันทึกวันที่)'
  }
}

function getScoreClass(score) {
  if (score >= 16) return 'excellent'
  if (score >= 12) return 'good'
  if (score >= 8) return 'fair'
  return 'needs-improvement'
}

function exportSkillsData() {
  const csv = [
    ['วันที่', 'คะแนน', 'การวิเคราะห์', 'การให้เหตุผล', 'ความคิดสร้างสรรค์', 'การใช้หลักฐาน'],
    ...assessmentHistory.value.map(a => [
      formatDateTime(a.timestamp),
      a.overallScore,
      a.rubricScores.analysis,
      a.rubricScores.reasoning,
      a.rubricScores.creativity,
      a.rubricScores.evidence
    ])
  ].map(row => row.join(',')).join('\n')
  
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `hots-skills-progress-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// Methods - LO tab
async function loadStudentProgress() {
  loadingLO.value = true
  try {
    const progressRef = collection(db, 'studentProgress')
    const q = query(progressRef, where('studentId', '==', authStore.user.uid))
    const snapshot = await getDocs(q)

    const coursePromises = snapshot.docs.map(async (progressDoc) => {
      const progressData = progressDoc.data()
      
      try {
        const courseDoc = await getDoc(doc(db, 'courses', progressData.courseId))
        if (courseDoc.exists()) {
          const courseData = courseDoc.data()
          
          // ใช้ utility function เพื่อดึง LO ที่ผ่านจริงจาก assessments
          const loResult = await getStudentPassedLOs(authStore.user.uid, progressData.courseId)
          
          return {
            courseId: progressData.courseId,
            courseCode: courseData.courseCode,
            courseName: courseData.courseName,
            courseDescription: courseData.courseDescription,
            learningOutcomes: courseData.learningOutcomes || [],
            totalLOs: (courseData.learningOutcomes || []).length,
            progress: {
              passedLOs: loResult.passedLOs, // ใช้ข้อมูลจริงจาก assessments
              totalPassed: loResult.passedLOs.length, // นับจากข้อมูลจริง
              assessmentCount: loResult.assessmentCount, // นับจาก assessments จริง
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
    loadingLO.value = false
  }
}

function isLOPassed(passedLOs, loCode) {
  return passedLOs.includes(loCode)
}

function calculatePercentage(passed, total) {
  if (total === 0) return 0
  return Math.round((passed / total) * 100)
}

function formatDateShort(timestamp) {
  if (!timestamp) return '(รอบันทึกวันที่)'
  try {
    const date = timestamp?.toDate?.() || new Date(timestamp)
    if (isNaN(date.getTime())) return '(รอบันทึกวันที่)'
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  } catch (e) {
    return '(รอบันทึกวันที่)'
  }
}

function goToCourse(courseId) {
  localStorage.setItem('selectedCourseId', courseId)
  router.push('/student')
}

onMounted(async () => {
  await Promise.all([
    loadAssessmentHistory(),
    loadStudentProgress()
  ])
})
</script>

<style scoped>
.my-progress {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  font-size: 2rem;
}

.page-header p {
  margin: 0;
  color: var(--text-secondary);
}

/* Tabs */
.tabs-container {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid var(--border-color);
}

.tab-btn {
  padding: 1rem 2rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--text-secondary);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  bottom: -2px;
}

.tab-btn:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.tab-btn.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  background: transparent;
}

.tab-content {
  min-height: 400px;
}

/* Common */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: var(--text-secondary);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 4rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
}

.btn-outline {
  background: transparent;
  border: 2px solid var(--border-color);
  color: var(--text-primary);
}

.btn-outline:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.card {
  background: var(--bg-card);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Skills Tab */
.tab-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 2rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.time-range-select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
}

.skills-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
}

.card-icon {
  font-size: 2.5rem;
}

.card-content {
  flex: 1;
}

.card-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.card-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.card-trend {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.card-trend.positive {
  color: #10b981;
}

.card-trend.negative {
  color: #ef4444;
}

.card-trend.neutral {
  color: var(--text-secondary);
}

/* Chart */
.chart-container {
  padding: 2rem;
}

.chart-container h3 {
  margin: 0 0 1.5rem 0;
  color: var(--text-primary);
}

.chart-wrapper {
  overflow-x: auto;
}

.chart-canvas {
  display: flex;
  gap: 1rem;
  min-width: 800px;
}

.y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-right: 1rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.chart-area {
  flex: 1;
}

.line-chart {
  width: 100%;
  height: 300px;
  margin-bottom: 0.5rem;
}

.chart-point {
  cursor: pointer;
  transition: r 0.2s ease;
}

.chart-point:hover {
  r: 8;
}

.x-axis {
  display: flex;
  justify-content: space-between;
  padding-top: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* Dimensions */
.dimensions-container {
  padding: 2rem;
}

.dimensions-container h3 {
  margin: 0 0 1.5rem 0;
  color: var(--text-primary);
}

.dimensions-chart {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dimension-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 1.5rem;
  align-items: center;
}

.dimension-label {
  font-weight: 600;
  color: var(--text-primary);
}

.dimension-bars {
  display: grid;
  grid-template-columns: 1fr 1fr 80px;
  gap: 1rem;
  align-items: center;
}

.bar-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bar-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.progress-bar {
  background: var(--bg-secondary);
  border-radius: 8px;
  height: 32px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  transition: width 0.5s ease;
}

.progress-fill.previous {
  background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
}

.progress-fill.current {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.progress-fill.lo-progress {
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
}

.improvement {
  text-align: center;
  font-weight: 700;
  font-size: 1rem;
}

.improvement.positive {
  color: #10b981;
}

.improvement.negative {
  color: #ef4444;
}

/* Recent Assessments */
.recent-assessments {
  padding: 2rem;
}

.recent-assessments h3 {
  margin: 0 0 1.5rem 0;
  color: var(--text-primary);
}

.assessments-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.assessment-item {
  display: grid;
  grid-template-columns: 180px 100px 1fr;
  gap: 1.5rem;
  align-items: center;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.assessment-date {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.score-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 700;
  color: white;
}

.score-badge.excellent {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.score-badge.good {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.score-badge.fair {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.score-badge.needs-improvement {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.assessment-dimensions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.dim-badge {
  background: var(--bg-primary);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

/* LO Tab */
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
}

.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.course-card {
  padding: 1.5rem;
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
}

.summary-section {
  padding: 1.5rem;
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

.summary-stat {
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
  background: linear-gradient(135deg, #fef3cd, #fff3cd);
  border-left: 4px solid #ffc107;
  border-radius: 8px;
}

.dark-mode .system-notice {
  background: linear-gradient(135deg, #2d2a1f, #3d3520);
  border-left-color: #ffc107;
}

.system-notice .notice-icon {
  font-size: 2rem;
  margin-right: 1rem;
  align-self: flex-start;
}

.system-notice {
  display: flex;
  align-items: flex-start;
  padding: 1.25rem;
}

.notice-content h4 {
  color: #856404;
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.dark-mode .notice-content h4 {
  color: #ffda6a;
}

.notice-content p {
  color: #6c5700;
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.dark-mode .notice-content p {
  color: #e9c46a;
}

.notice-list {
  color: #6c5700;
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0.75rem 0 0.75rem 1.25rem;
  padding-left: 0;
}

.dark-mode .notice-list {
  color: #e9c46a;
}

.notice-list li {
  margin-bottom: 0.5rem;
}

.notice-list strong {
  color: #495057;
  font-weight: 600;
}

.dark-mode .notice-list strong {
  color: #ffc107;
}

.notice-result {
  background: rgba(255, 193, 7, 0.1);
  padding: 0.75rem;
  border-radius: 6px;
  border-left: 3px solid #ffc107;
  font-size: 0.9rem !important;
  margin-bottom: 0 !important;
}

.dark-mode .notice-result {
  background: rgba(255, 193, 7, 0.15);
}

@media (max-width: 768px) {
  .my-progress {
    padding: 1rem;
  }

  .tabs-container {
    overflow-x: auto;
  }

  .tab-btn {
    padding: 0.75rem 1.5rem;
    white-space: nowrap;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
  }

  .time-range-select {
    width: 100%;
  }

  .summary-cards {
    grid-template-columns: 1fr;
  }

  .dimension-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .dimension-bars {
    grid-template-columns: 1fr;
  }

  .assessment-item {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .courses-grid {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
