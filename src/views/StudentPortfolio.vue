<template>
  <div class="student-portfolio">
    <!-- Header -->
    <div class="portfolio-header">
      <div class="student-info">
        <div class="avatar">
          <img v-if="portfolio.photoURL" :src="portfolio.photoURL" alt="Student Photo" />
          <div v-else class="avatar-placeholder">{{ getInitials(portfolio.displayName) }}</div>
        </div>
        <div class="info-text">
          <h1>{{ portfolio.displayName }}</h1>
          <p class="student-id">รหัสนักเรียน: {{ portfolio.studentId }}</p>
          <p class="school-info">
            {{ portfolio.schoolName }} | {{ portfolio.grade }} ห้อง {{ portfolio.room }} เลขที่ {{ portfolio.number }}
          </p>
        </div>
      </div>
      <div class="header-actions">
        <button @click="exportPDF" class="btn-export">
          📄 Export PDF
        </button>
        <button @click="exportJSON" class="btn-export">
          💾 Export JSON
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>

    <!-- Portfolio Content -->
    <div v-else class="portfolio-content">
      <!-- HOTS Profile Card -->
      <div class="card hots-profile-card">
        <h2>🎯 โปรไฟล์ทักษะ HOTS</h2>
        <div class="hots-summary">
          <div class="overall-score">
            <div class="score-circle" :class="getScoreClass(portfolio.overallHOTS)">
              <span class="score-value">{{ portfolio.overallHOTS?.toFixed(2) || '-' }}</span>
              <span class="score-label">คะแนนเฉลี่ย</span>
            </div>
          </div>
          <div class="dimensions-grid">
            <div 
              v-for="dim in dimensions" 
              :key="dim.key" 
              class="dimension-card"
              :class="getScoreClass(portfolio.hotsBreakdown[dim.key])"
            >
              <div class="dim-icon">{{ dim.icon }}</div>
              <div class="dim-content">
                <h3>{{ dim.label }}</h3>
                <div class="dim-score">{{ portfolio.hotsBreakdown[dim.key]?.toFixed(2) || '-' }}</div>
                <div class="dim-progress">
                  <div 
                    class="dim-fill" 
                    :style="{ width: (portfolio.hotsBreakdown[dim.key] * 20) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- LO Mastery Card -->
      <div class="card lo-mastery-card">
        <h2>📚 การบรรลุ Learning Outcomes</h2>
        <div class="lo-stats">
          <div class="stat-item">
            <span class="stat-value">{{ portfolio.totalLOs || 0 }}</span>
            <span class="stat-label">LOs ทั้งหมด</span>
          </div>
          <div class="stat-item success">
            <span class="stat-value">{{ portfolio.passedLOs?.length || 0 }}</span>
            <span class="stat-label">ผ่านแล้ว</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ masteryPercentage }}%</span>
            <span class="stat-label">อัตราความสำเร็จ</span>
          </div>
        </div>

        <!-- LO List -->
        <div class="lo-grid">
          <div 
            v-for="lo in portfolio.loDetails" 
            :key="lo.code" 
            class="lo-card"
            :class="{ passed: lo.passed }"
          >
            <div class="lo-header">
              <strong>{{ lo.code }}</strong>
              <span class="lo-status">{{ lo.passed ? '✅ ผ่าน' : '⏳ รอผ่าน' }}</span>
            </div>
            <p class="lo-description">{{ lo.description }}</p>
            <div v-if="lo.passed" class="lo-achievement">
              <small>ผ่านเมื่อ: {{ formatDate(lo.passedAt) }}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Assessment History Card -->
      <div class="card assessment-history-card">
        <h2>📊 ประวัติการประเมิน</h2>
        <div class="history-stats">
          <div class="stat-item">
            <span class="stat-value">{{ portfolio.assessmentHistory?.length || 0 }}</span>
            <span class="stat-label">ครั้งทั้งหมด</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ avgAssessmentTime }}</span>
            <span class="stat-label">เวลาเฉลี่ย (นาที)</span>
          </div>
        </div>

        <!-- Timeline -->
        <div class="assessment-timeline">
          <div 
            v-for="(assessment, index) in recentAssessments" 
            :key="index" 
            class="timeline-item"
          >
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <strong>{{ assessment.courseName }}</strong>
                <span class="timeline-date">{{ formatDate(assessment.timestamp) }}</span>
              </div>
              <p class="timeline-question">{{ truncate(assessment.questionText, 100) }}</p>
              <div class="timeline-scores">
                <span 
                  v-for="dim in dimensions" 
                  :key="dim.key"
                  class="score-badge"
                  :class="getScoreClass(assessment.rubricScores[dim.key])"
                >
                  {{ dim.icon }} {{ assessment.rubricScores[dim.key] }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- View All Button -->
        <button v-if="portfolio.assessmentHistory?.length > 10" @click="viewAllAssessments" class="btn-view-all">
          ดูประวัติทั้งหมด ({{ portfolio.assessmentHistory.length }})
        </button>
      </div>

      <!-- Strengths & Recommendations Card -->
      <div class="card recommendations-card">
        <h2>💡 จุดเด่นและคำแนะนำ</h2>
        <div class="recommendations-content">
          <div class="strengths">
            <h3>🌟 จุดเด่น</h3>
            <ul>
              <li v-for="strength in portfolio.strengths" :key="strength">{{ strength }}</li>
            </ul>
          </div>
          <div class="improvements">
            <h3>📈 ควรพัฒนา</h3>
            <ul>
              <li v-for="improvement in portfolio.improvements" :key="improvement">{{ improvement }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const loading = ref(false)
const portfolio = ref({
  displayName: '',
  studentId: '',
  schoolName: '',
  grade: '',
  room: '',
  number: '',
  photoURL: '',
  overallHOTS: 0,
  hotsBreakdown: {
    analysis: 0,
    reasoning: 0,
    creativity: 0,
    evidence: 0
  },
  totalLOs: 0,
  passedLOs: [],
  loDetails: [],
  assessmentHistory: [],
  strengths: [],
  improvements: []
})

const dimensions = [
  { key: 'analysis', label: 'วิเคราะห์', icon: '🔍' },
  { key: 'reasoning', label: 'ให้เหตุผล', icon: '💭' },
  { key: 'creativity', label: 'สร้างสรรค์', icon: '🎨' },
  { key: 'evidence', label: 'หลักฐาน', icon: '📖' }
]

const masteryPercentage = computed(() => {
  if (!portfolio.value.totalLOs) return 0
  return Math.round((portfolio.value.passedLOs?.length || 0) / portfolio.value.totalLOs * 100)
})

const recentAssessments = computed(() => {
  return (portfolio.value.assessmentHistory || []).slice(0, 10)
})

const avgAssessmentTime = computed(() => {
  const times = portfolio.value.assessmentHistory?.map(a => a.timeSpent || 0) || []
  if (times.length === 0) return '-'
  const avg = times.reduce((sum, t) => sum + t, 0) / times.length
  return Math.round(avg)
})

onMounted(async () => {
  const studentId = route.params.studentId
  await loadPortfolio(studentId)
})

async function loadPortfolio(studentId) {
  try {
    loading.value = true
    
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    const response = await fetch(`${functionsUrl}/generateStudentPortfolio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId })
    })

    const data = await response.json()
    
    if (data.success && data.portfolio) {
      portfolio.value = {
        ...portfolio.value,
        ...data.portfolio
      }
    }
  } catch (error) {
    console.error('Error loading portfolio:', error)
    alert('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้')
  } finally {
    loading.value = false
  }
}

async function exportPDF() {
  try {
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    const response = await fetch(`${functionsUrl}/exportPortfolio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: portfolio.value.studentId,
        format: 'pdf'
      })
    })

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio_${portfolio.value.studentId}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Error exporting PDF:', error)
    alert('ไม่สามารถ Export PDF ได้')
  }
}

async function exportJSON() {
  try {
    const dataStr = JSON.stringify(portfolio.value, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio_${portfolio.value.studentId}.json`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Error exporting JSON:', error)
    alert('ไม่สามารถ Export JSON ได้')
  }
}

function viewAllAssessments() {
  // Navigate to full assessment history
  console.log('View all assessments')
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getScoreClass(score) {
  if (score >= 4) return 'score-high'
  if (score >= 3) return 'score-medium'
  return 'score-low'
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function truncate(text, length) {
  if (!text || text.length <= length) return text
  return text.slice(0, length) + '...'
}
</script>

<style scoped>
.student-portfolio {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
}

.portfolio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 30px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}

.student-info {
  display: flex;
  align-items: center;
  gap: 25px;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #1976D2;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 2em;
  font-weight: bold;
}

.info-text h1 {
  margin: 0 0 8px 0;
  color: #333;
}

.student-id {
  color: #666;
  font-size: 0.95em;
  margin: 4px 0;
}

.school-info {
  color: #999;
  font-size: 0.9em;
  margin: 4px 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-export {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: #1976D2;
  color: white;
  cursor: pointer;
  font-size: 0.95em;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-export:hover {
  background: #1565C0;
  transform: translateY(-2px);
}

.loading {
  text-align: center;
  padding: 60px;
  color: #666;
  font-size: 1.1em;
}

.portfolio-content {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.card h2 {
  margin: 0 0 25px 0;
  color: #333;
  font-size: 1.5em;
}

/* HOTS Profile */
.hots-summary {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 30px;
  align-items: center;
}

.overall-score {
  display: flex;
  justify-content: center;
}

.score-circle {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 8px solid;
  transition: all 0.3s;
}

.score-circle.score-high {
  border-color: #4CAF50;
  background: rgba(76, 175, 80, 0.1);
}

.score-circle.score-medium {
  border-color: #FF9800;
  background: rgba(255, 152, 0, 0.1);
}

.score-circle.score-low {
  border-color: #f44336;
  background: rgba(244, 67, 54, 0.1);
}

.score-value {
  font-size: 3em;
  font-weight: bold;
  color: #333;
}

.score-label {
  font-size: 0.9em;
  color: #666;
  margin-top: 5px;
}

.dimensions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.dimension-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  border-radius: 8px;
  background: #f9f9f9;
  border-left: 4px solid;
}

.dimension-card.score-high {
  border-left-color: #4CAF50;
}

.dimension-card.score-medium {
  border-left-color: #FF9800;
}

.dimension-card.score-low {
  border-left-color: #f44336;
}

.dim-icon {
  font-size: 2.5em;
}

.dim-content {
  flex: 1;
}

.dim-content h3 {
  margin: 0 0 8px 0;
  font-size: 1em;
  color: #666;
}

.dim-score {
  font-size: 1.8em;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.dim-progress {
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.dim-fill {
  height: 100%;
  background: linear-gradient(90deg, #1976D2, #2196F3);
  transition: width 0.5s;
}

/* LO Mastery */
.lo-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.stat-item.success {
  background: rgba(76, 175, 80, 0.1);
}

.stat-value {
  display: block;
  font-size: 2.5em;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.stat-label {
  display: block;
  color: #666;
  font-size: 0.9em;
}

.lo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.lo-card {
  padding: 15px;
  background: #f9f9f9;
  border-radius: 8px;
  border-left: 4px solid #ddd;
}

.lo-card.passed {
  border-left-color: #4CAF50;
  background: rgba(76, 175, 80, 0.05);
}

.lo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.lo-status {
  font-size: 0.85em;
  padding: 4px 10px;
  border-radius: 12px;
  background: #e0e0e0;
}

.lo-card.passed .lo-status {
  background: #4CAF50;
  color: white;
}

.lo-description {
  color: #666;
  font-size: 0.9em;
  line-height: 1.5;
  margin: 8px 0;
}

.lo-achievement small {
  color: #999;
  font-size: 0.85em;
}

/* Assessment History */
.history-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.assessment-timeline {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.timeline-item {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 15px;
  position: relative;
}

.timeline-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 19px;
  top: 40px;
  width: 2px;
  height: calc(100% + 20px);
  background: #e0e0e0;
}

.timeline-marker {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #1976D2;
  margin-top: 5px;
}

.timeline-content {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.timeline-header strong {
  color: #333;
}

.timeline-date {
  color: #999;
  font-size: 0.85em;
}

.timeline-question {
  color: #666;
  font-size: 0.9em;
  margin: 8px 0;
}

.timeline-scores {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.score-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 600;
}

.score-badge.score-high {
  background: #4CAF50;
  color: white;
}

.score-badge.score-medium {
  background: #FF9800;
  color: white;
}

.score-badge.score-low {
  background: #f44336;
  color: white;
}

.btn-view-all {
  width: 100%;
  padding: 12px;
  margin-top: 20px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95em;
}

.btn-view-all:hover {
  background: #1976D2;
}

/* Recommendations */
.recommendations-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.strengths, .improvements {
  padding: 20px;
  border-radius: 8px;
}

.strengths {
  background: rgba(76, 175, 80, 0.05);
  border-left: 4px solid #4CAF50;
}

.improvements {
  background: rgba(255, 152, 0, 0.05);
  border-left: 4px solid #FF9800;
}

.strengths h3, .improvements h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.strengths ul, .improvements ul {
  margin: 0;
  padding-left: 25px;
}

.strengths li, .improvements li {
  margin-bottom: 10px;
  color: #666;
  line-height: 1.5;
}

@media (max-width: 1024px) {
  .hots-summary {
    grid-template-columns: 1fr;
  }

  .dimensions-grid {
    grid-template-columns: 1fr;
  }

  .recommendations-content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .portfolio-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }

  .student-info {
    flex-direction: column;
    align-items: flex-start;
  }

  .lo-stats, .history-stats {
    grid-template-columns: 1fr;
  }

  .lo-grid {
    grid-template-columns: 1fr;
  }
}
</style>
