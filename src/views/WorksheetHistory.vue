<template>
  <div class="worksheet-history-view">
    <!-- Top Navigation -->
    <nav class="top-navbar">
      <div class="nav-brand">
        <router-link :to="backRoute" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <span class="brand-icon">📜</span>
        <span class="brand-text">ประวัติการทำใบงาน</span>
      </div>
    </nav>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
      <p>กำลังโหลดประวัติ...</p>
    </div>

    <!-- Main Content -->
    <div v-else class="history-container">
      <!-- Worksheet Info Header -->
      <header v-if="worksheet" class="worksheet-header">
        <div class="header-content">
          <h1>{{ worksheet.title }}</h1>
          <p class="course-name">{{ worksheet.courseName || worksheet.metadata?.courseName }}</p>
        </div>
        <div class="header-stats">
          <div class="stat-item">
            <span class="stat-value">{{ submissions.length }}</span>
            <span class="stat-label">ครั้งที่ทำ</span>
          </div>
          <div class="stat-item" v-if="bestSubmission">
            <span class="stat-value best">{{ bestSubmission.assessment?.totalScore?.toFixed(1) || '-' }}</span>
            <span class="stat-label">คะแนนดีที่สุด</span>
          </div>
          <div class="stat-item" v-if="worksheet.retrySettings?.scoreMode">
            <span class="stat-value mode">
              {{ scoreModeBadge }}
            </span>
            <span class="stat-label">โหมดบันทึกคะแนน</span>
          </div>
        </div>
      </header>

      <!-- Score Comparison Chart -->
      <section v-if="submissions.length > 1" class="chart-section">
        <h3>📊 กราฟเปรียบเทียบคะแนน</h3>
        <div class="score-chart">
          <div v-for="(sub, idx) in submissions" :key="sub.id" class="chart-bar">
            <div class="bar-container">
              <div 
                class="bar-fill" 
                :class="{ 'best': sub.id === bestSubmission?.id }"
                :style="{ height: getBarHeight(sub) + '%' }"
              ></div>
            </div>
            <span class="bar-label">ครั้งที่ {{ submissions.length - idx }}</span>
            <span class="bar-value">{{ sub.assessment?.totalScore?.toFixed(1) || '-' }}</span>
          </div>
        </div>
      </section>

      <!-- Submissions List -->
      <section class="submissions-section">
        <h3>📝 รายการทำทั้งหมด</h3>
        
        <div v-if="submissions.length === 0" class="empty-state">
          <span class="material-icons">assignment</span>
          <p>ยังไม่มีประวัติการทำใบงานนี้</p>
          <router-link :to="`/worksheet/${worksheetId}`" class="btn btn-primary">
            เริ่มทำใบงาน
          </router-link>
        </div>

        <div v-else class="submissions-list">
          <div 
            v-for="(submission, index) in submissions" 
            :key="submission.id" 
            class="submission-card"
            :class="{ 
              'is-best': submission.id === bestSubmission?.id,
              'is-recorded': isRecordedScore(submission)
            }"
          >
            <div class="submission-header">
              <div class="attempt-badge">
                <span class="attempt-number">ครั้งที่ {{ submissions.length - index }}</span>
                <span v-if="submission.id === bestSubmission?.id" class="best-badge">
                  🏆 คะแนนดีที่สุด
                </span>
                <span v-if="isRecordedScore(submission)" class="recorded-badge">
                  ✓ คะแนนที่บันทึก
                </span>
              </div>
              <span class="submission-date">
                {{ formatDate(submission.submittedAt) }}
              </span>
            </div>

            <div class="submission-body">
              <!-- Score Display -->
              <div class="score-section">
                <div class="main-score">
                  <span class="score-value">{{ submission.assessment?.totalScore?.toFixed(1) || '-' }}</span>
                  <span class="score-max">/ {{ getTotalMaxScore() }}</span>
                </div>
                <div class="percentage" v-if="submission.assessment?.percentage">
                  {{ submission.assessment.percentage.toFixed(0) }}%
                </div>
              </div>

              <!-- ARCE Scores -->
              <div v-if="submission.assessment?.rubricScores" class="arce-scores">
                <div 
                  v-for="(score, key) in submission.assessment.rubricScores" 
                  :key="key" 
                  class="arce-item"
                  :class="key"
                >
                  <span class="arce-icon">{{ getArceIcon(key) }}</span>
                  <span class="arce-score">{{ score }}/5</span>
                </div>
              </div>

              <!-- Time Spent -->
              <div class="meta-info">
                <span v-if="submission.timeSpent" class="time-spent">
                  <span class="material-icons">timer</span>
                  {{ formatDuration(submission.timeSpent) }}
                </span>
                <span v-if="submission.status" class="status-badge" :class="submission.status">
                  {{ getStatusLabel(submission.status) }}
                </span>
              </div>

              <!-- Feedback Preview -->
              <div v-if="submission.assessment?.feedback" class="feedback-preview">
                <strong>💡 คำแนะนำ:</strong>
                <p>{{ truncateFeedback(submission.assessment.feedback) }}</p>
              </div>
            </div>

            <div class="submission-actions">
              <button @click="viewDetail(submission.id)" class="btn btn-outline btn-sm">
                <span class="material-icons">visibility</span>
                ดูรายละเอียด
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Retry Button -->
      <div v-if="canRetry" class="retry-section">
        <router-link :to="`/worksheet/${worksheetId}`" class="btn btn-primary btn-lg">
          <span class="material-icons">replay</span>
          ทำใบงานอีกครั้ง
          <span v-if="maxAttempts" class="attempt-remaining">
            (เหลือ {{ maxAttempts - submissions.length }} ครั้ง)
          </span>
        </router-link>
      </div>

      <div v-else-if="!canRetry && maxAttemptsReached" class="no-retry-section">
        <span class="material-icons">block</span>
        <p>คุณทำครบ {{ maxAttempts }} ครั้งแล้ว</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const worksheetId = route.params.id

// State
const loading = ref(true)
const worksheet = ref(null)
const submissions = ref([])

// Computed
const backRoute = computed(() => {
  if (route.query.roomId) return `/learning-room/${route.query.roomId}`
  return '/student'
})

const bestSubmission = computed(() => {
  if (submissions.value.length === 0) return null
  return submissions.value.reduce((best, current) => {
    const currentScore = current.assessment?.totalScore || 0
    const bestScore = best?.assessment?.totalScore || 0
    return currentScore > bestScore ? current : best
  }, submissions.value[0])
})

const scoreModeBadge = computed(() => {
  const mode = worksheet.value?.retrySettings?.scoreMode
  switch (mode) {
    case 'best': return '🏆 ดีที่สุด'
    case 'latest': return '📝 ล่าสุด'
    case 'average': return '📊 ค่าเฉลี่ย'
    case 'first': return '1️⃣ ครั้งแรก'
    default: return '🏆 ดีที่สุด'
  }
})

const maxAttempts = computed(() => {
  return worksheet.value?.retrySettings?.maxAttempts || null
})

const maxAttemptsReached = computed(() => {
  if (!maxAttempts.value) return false
  return submissions.value.length >= maxAttempts.value
})

const canRetry = computed(() => {
  const retrySettings = worksheet.value?.retrySettings
  if (!retrySettings?.allowRetry) return false
  if (maxAttemptsReached.value) return false
  
  // Check cooldown
  if (retrySettings.cooldownMinutes && submissions.value.length > 0) {
    const lastSubmission = submissions.value[0]
    const lastSubmitTime = lastSubmission.submittedAt?.toDate?.() || new Date(lastSubmission.submittedAt)
    const cooldownMs = retrySettings.cooldownMinutes * 60 * 1000
    if (Date.now() - lastSubmitTime.getTime() < cooldownMs) {
      return false
    }
  }
  
  return true
})

// Methods
function isRecordedScore(submission) {
  const mode = worksheet.value?.retrySettings?.scoreMode || 'best'
  
  switch (mode) {
    case 'best':
      return submission.id === bestSubmission.value?.id
    case 'latest':
      return submission.id === submissions.value[0]?.id
    case 'first':
      return submission.id === submissions.value[submissions.value.length - 1]?.id
    case 'average':
      return true // All scores count for average
    default:
      return submission.id === bestSubmission.value?.id
  }
}

function getBarHeight(submission) {
  const maxScore = getTotalMaxScore()
  const score = submission.assessment?.totalScore || 0
  return Math.max(5, (score / maxScore) * 100)
}

function getTotalMaxScore() {
  if (!worksheet.value?.sections) return 100
  return worksheet.value.sections.reduce((total, section) => {
    return total + (section.questions || []).reduce((qTotal, q) => {
      return qTotal + (q.maxScore || q.points || 5)
    }, 0)
  }, 0)
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins} นาที ${secs} วินาที`
}

function getArceIcon(key) {
  const icons = {
    analysis: '🔍',
    reasoning: '🧠',
    creativity: '💡',
    evidence: '📚'
  }
  return icons[key] || '📌'
}

function getStatusLabel(status) {
  const labels = {
    submitted: 'ส่งแล้ว',
    graded: 'ตรวจแล้ว',
    draft: 'ฉบับร่าง'
  }
  return labels[status] || status
}

function truncateFeedback(feedback, maxLength = 100) {
  if (!feedback) return ''
  if (feedback.length <= maxLength) return feedback
  return feedback.substring(0, maxLength) + '...'
}

function viewDetail(submissionId) {
  router.push(`/worksheet-result/${worksheetId}?submissionId=${submissionId}`)
}

async function loadData() {
  try {
    loading.value = true
    
    // Load worksheet
    const worksheetDoc = await getDoc(doc(db, 'eWorksheets', worksheetId))
    if (worksheetDoc.exists()) {
      worksheet.value = { id: worksheetDoc.id, ...worksheetDoc.data() }
    }
    
    // Load submissions
    const userId = authStore.user?.uid
    if (userId) {
      const submissionsRef = collection(db, 'worksheetSubmissions')
      const q = query(
        submissionsRef,
        where('worksheetId', '==', worksheetId),
        where('studentId', '==', userId),
        orderBy('submittedAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      submissions.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    }
  } catch (error) {
    console.error('Error loading worksheet history:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.worksheet-history-view {
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
  color: var(--text-primary);
}

.brand-icon {
  font-size: 1.5rem;
}

.brand-text {
  font-weight: 600;
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
.history-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

/* Header */
.worksheet-header {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.header-content h1 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.course-name {
  color: var(--text-secondary);
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-value.best {
  color: #16a34a;
}

.stat-value.mode {
  font-size: 1rem;
  background: #f0fdf4;
  color: #166534;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

/* Chart Section */
.chart-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border-color);
}

.chart-section h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.1rem;
}

.score-chart {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 1rem;
  height: 200px;
  padding: 1rem;
}

.chart-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 60px;
}

.bar-container {
  width: 40px;
  height: 150px;
  background: var(--bg-primary);
  border-radius: 4px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.bar-fill {
  width: 100%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 4px 4px 0 0;
  transition: height 0.5s ease;
}

.bar-fill.best {
  background: linear-gradient(135deg, #22c55e, #16a34a);
}

.bar-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.bar-value {
  font-weight: 600;
  font-size: 0.875rem;
}

/* Submissions Section */
.submissions-section {
  margin-bottom: 2rem;
}

.submissions-section h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.1rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  text-align: center;
}

.empty-state .material-icons {
  font-size: 4rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.submissions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.submission-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  padding: 1.5rem;
  transition: all 0.2s;
}

.submission-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.submission-card.is-best {
  border-color: #22c55e;
  background: linear-gradient(135deg, var(--bg-secondary), #dcfce720);
}

.submission-card.is-recorded {
  position: relative;
}

.submission-card.is-recorded::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #667eea;
  border-radius: 12px 0 0 12px;
}

.submission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.attempt-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.attempt-number {
  font-weight: 600;
  color: var(--text-primary);
}

.best-badge {
  background: #dcfce7;
  color: #166534;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.recorded-badge {
  background: #e0e7ff;
  color: #4338ca;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.submission-date {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.submission-body {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
  margin-bottom: 1rem;
}

.score-section {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.main-score {
  display: flex;
  align-items: baseline;
}

.main-score .score-value {
  font-size: 2rem;
  font-weight: 700;
  color: #667eea;
}

.main-score .score-max {
  color: var(--text-secondary);
  font-size: 1rem;
}

.percentage {
  background: var(--bg-primary);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.875rem;
}

.arce-scores {
  display: flex;
  gap: 0.75rem;
}

.arce-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
}

.arce-item.analysis { background: #fef3c720; }
.arce-item.reasoning { background: #dbeafe20; }
.arce-item.creativity { background: #fce7f320; }
.arce-item.evidence { background: #dcfce720; }

.meta-info {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.time-spent {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.time-spent .material-icons {
  font-size: 1rem;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.graded {
  background: #dcfce7;
  color: #166534;
}

.status-badge.submitted {
  background: #fef3c7;
  color: #92400e;
}

.feedback-preview {
  width: 100%;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.feedback-preview strong {
  color: var(--text-primary);
  font-size: 0.875rem;
}

.feedback-preview p {
  color: var(--text-secondary);
  margin: 0.5rem 0 0 0;
  font-size: 0.875rem;
  line-height: 1.5;
}

.submission-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-sm {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-sm .material-icons {
  font-size: 1rem;
}

/* Retry Section */
.retry-section, .no-retry-section {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

.btn-lg {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  font-size: 1.1rem;
}

.attempt-remaining {
  font-size: 0.875rem;
  opacity: 0.8;
}

.no-retry-section {
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
}

.no-retry-section .material-icons {
  font-size: 2.5rem;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  text-decoration: none;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-outline:hover {
  background: var(--bg-primary);
  border-color: #667eea;
}

/* Dark Mode */
.html.dark-mode .stat-value.mode,
.html.dark-mode .best-badge {
  background: #16653433;
  color: #4ade80;
}

.html.dark-mode .recorded-badge {
  background: #4338ca33;
  color: #a5b4fc;
}

.html.dark-mode .status-badge.graded {
  background: #16653433;
  color: #4ade80;
}

.html.dark-mode .status-badge.submitted {
  background: #92400e33;
  color: #fbbf24;
}

/* Responsive */
@media (max-width: 768px) {
  .history-container {
    padding: 1rem;
  }
  
  .worksheet-header {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
  
  .header-stats {
    width: 100%;
    justify-content: space-around;
  }
  
  .score-chart {
    flex-wrap: wrap;
    height: auto;
  }
  
  .submission-body {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
