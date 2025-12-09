<template>
  <div class="progress-analytics">
    <div class="page-header">
      <div>
        <h1>📊 Progress Analytics</h1>
        <p>Track your HOTS skill development over time</p>
      </div>
      <div class="header-actions">
        <select v-model="selectedTimeRange" class="time-range-select">
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <button @click="exportData" class="btn btn-outline">
          📥 Export Data
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading analytics...</p>
    </div>

    <div v-else-if="assessmentHistory.length === 0" class="empty-state card">
      <div class="empty-icon">📈</div>
      <h3>No Assessment Data Yet</h3>
      <p>Complete some assessments to see your progress trends here!</p>
      <router-link to="/chat" class="btn btn-primary">Start Learning</router-link>
    </div>

    <div v-else class="analytics-content">
      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card card">
          <div class="card-icon">📊</div>
          <div class="card-content">
            <div class="card-value">{{ assessmentHistory.length }}</div>
            <div class="card-label">Total Assessments</div>
          </div>
        </div>

        <div class="summary-card card">
          <div class="card-icon">⭐</div>
          <div class="card-content">
            <div class="card-value">{{ averageScore.toFixed(1) }}/20</div>
            <div class="card-label">Average Score</div>
            <div class="card-trend" :class="scoreTrend > 0 ? 'positive' : scoreTrend < 0 ? 'negative' : 'neutral'">
              {{ scoreTrend > 0 ? '↗' : scoreTrend < 0 ? '↘' : '→' }} {{ Math.abs(scoreTrend).toFixed(1) }}
            </div>
          </div>
        </div>

        <div class="summary-card card">
          <div class="card-icon">🔥</div>
          <div class="card-content">
            <div class="card-value">{{ currentStreak }} days</div>
            <div class="card-label">Current Streak</div>
          </div>
        </div>

        <div class="summary-card card">
          <div class="card-icon">💪</div>
          <div class="card-content">
            <div class="card-value">{{ strongestDimension.name }}</div>
            <div class="card-label">Strongest Skill</div>
            <div class="card-trend positive">{{ strongestDimension.score.toFixed(1) }}/5</div>
          </div>
        </div>
      </div>

      <!-- Overall Score Trend Chart -->
      <div class="chart-container card">
        <h3>📈 Overall Score Trend</h3>
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
                <!-- Grid lines -->
                <line v-for="i in 5" :key="'grid-' + i" 
                      :x1="0" :y1="i * chartHeight / 5" 
                      :x2="chartWidth" :y2="i * chartHeight / 5"
                      stroke="var(--border-color)" stroke-width="1" opacity="0.3" />
                
                <!-- Score line -->
                <polyline 
                  :points="scoreLinePoints"
                  fill="none"
                  stroke="#667eea"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                
                <!-- Data points -->
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
        <h3>🎯 HOTS Dimensions Progress</h3>
        <div class="dimensions-chart">
          <div v-for="dim in dimensionStats" :key="dim.name" class="dimension-row">
            <div class="dimension-label">{{ dim.emoji }} {{ dim.name }}</div>
            <div class="dimension-bars">
              <div class="bar-group">
                <div class="bar-label">Previous</div>
                <div class="progress-bar">
                  <div class="progress-fill previous" :style="{ width: (dim.previous / 5 * 100) + '%' }">
                    {{ dim.previous.toFixed(1) }}
                  </div>
                </div>
              </div>
              <div class="bar-group">
                <div class="bar-label">Current</div>
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
        <h3>📚 Recent Assessments</h3>
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
            <div v-if="assessment.courseId" class="assessment-course">
              Course: {{ assessment.courseId }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const loading = ref(true)
const selectedTimeRange = ref(30)
const assessmentHistory = ref([])

const chartWidth = 800
const chartHeight = 300

// Computed: Average score
const averageScore = computed(() => {
  if (assessmentHistory.value.length === 0) return 0
  const total = assessmentHistory.value.reduce((sum, a) => sum + a.overallScore, 0)
  return total / assessmentHistory.value.length
})

// Computed: Score trend (comparing recent half vs older half)
const scoreTrend = computed(() => {
  if (assessmentHistory.value.length < 4) return 0
  
  const mid = Math.floor(assessmentHistory.value.length / 2)
  const recentHalf = assessmentHistory.value.slice(0, mid)
  const olderHalf = assessmentHistory.value.slice(mid)
  
  const recentAvg = recentHalf.reduce((sum, a) => sum + a.overallScore, 0) / recentHalf.length
  const olderAvg = olderHalf.reduce((sum, a) => sum + a.overallScore, 0) / olderHalf.length
  
  return recentAvg - olderAvg
})

// Computed: Current streak
const currentStreak = computed(() => {
  if (assessmentHistory.value.length === 0) return 0
  
  let streak = 1
  const today = new Date().toDateString()
  
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

// Computed: Strongest dimension
const strongestDimension = computed(() => {
  if (assessmentHistory.value.length === 0) {
    return { name: 'N/A', score: 0 }
  }
  
  const dimensions = {
    analysis: { name: 'Analysis', emoji: '🔍', total: 0 },
    reasoning: { name: 'Reasoning', emoji: '🧠', total: 0 },
    creativity: { name: 'Creativity', emoji: '💡', total: 0 },
    evidence: { name: 'Evidence', emoji: '📚', total: 0 }
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

// Computed: Dimension statistics (previous vs current)
const dimensionStats = computed(() => {
  if (assessmentHistory.value.length < 2) return []
  
  const mid = Math.floor(assessmentHistory.value.length / 2)
  const recentHalf = assessmentHistory.value.slice(0, mid)
  const olderHalf = assessmentHistory.value.slice(mid)
  
  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  const emojis = { analysis: '🔍', reasoning: '🧠', creativity: '💡', evidence: '📚' }
  const names = { analysis: 'Analysis', reasoning: 'Reasoning', creativity: 'Creativity', evidence: 'Evidence' }
  
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

// Computed: Chart data
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

// Methods
async function loadAssessmentHistory() {
  loading.value = true
  
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
    loading.value = false
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp)
  return `${date.getDate()}/${date.getMonth() + 1}`
}

function formatDateTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getScoreClass(score) {
  if (score >= 16) return 'excellent'
  if (score >= 12) return 'good'
  if (score >= 8) return 'fair'
  return 'needs-improvement'
}

function exportData() {
  const csv = [
    ['Date', 'Score', 'Analysis', 'Reasoning', 'Creativity', 'Evidence'],
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
  link.download = `progress-analytics-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  loadAssessmentHistory()
})
</script>

<style scoped>
.progress-analytics {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.page-header h1 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.page-header p {
  margin: 0;
  color: var(--text-secondary);
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
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
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

.analytics-content {
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
  grid-template-columns: 150px 1fr;
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
  grid-template-columns: 180px 100px 1fr auto;
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

.assessment-course {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .progress-analytics {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
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
}
</style>
