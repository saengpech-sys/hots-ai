<template>
  <div class="realtime-monitor">
    <div class="page-header">
      <div>
        <h1>📊 Real-time Class Performance Monitor</h1>
        <p>Live updates every 30 seconds</p>
      </div>
      <div class="header-actions">
        <select v-model="selectedCourse" class="course-select" @change="loadMetrics">
          <option value="">All Courses</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.courseCode }} - {{ course.courseName }}
          </option>
        </select>
        <button @click="loadMetrics" class="btn btn-outline" :disabled="loading">
          {{ loading ? '⏳' : '🔄' }} Refresh
        </button>
        <button @click="exportMetrics" class="btn btn-outline">
          📥 Export CSV
        </button>
      </div>
    </div>

    <div class="auto-refresh-indicator" :class="{ active: autoRefresh }">
      <span class="pulse-dot"></span>
      Auto-refresh: {{ autoRefresh ? 'ON' : 'OFF' }} 
      <button @click="toggleAutoRefresh" class="toggle-btn">
        {{ autoRefresh ? 'Pause' : 'Resume' }}
      </button>
      <span v-if="autoRefresh && nextRefresh">Next: {{ nextRefresh }}s</span>
    </div>

    <div v-if="loading && !metrics" class="loading-state">
      <div class="spinner"></div>
      <p>Loading real-time metrics...</p>
    </div>

    <div v-else-if="metrics" class="metrics-grid">
      <!-- Live Activity Card -->
      <div class="metric-card card">
        <div class="card-icon">👥</div>
        <div class="card-content">
          <div class="metric-value">{{ metrics.activeStudents.today }}</div>
          <div class="metric-label">Active Students Today</div>
          <div class="metric-change positive" v-if="metrics.activeStudents.change > 0">
            ↗ +{{ metrics.activeStudents.change }} from yesterday
          </div>
          <div class="metric-change negative" v-else-if="metrics.activeStudents.change < 0">
            ↘ {{ metrics.activeStudents.change }} from yesterday
          </div>
        </div>
      </div>

      <!-- Average Score Today -->
      <div class="metric-card card">
        <div class="card-icon">⭐</div>
        <div class="card-content">
          <div class="metric-value">{{ metrics.avgScoreToday.toFixed(1) }}/20</div>
          <div class="metric-label">Average Score Today</div>
          <div class="metric-change" :class="metrics.avgScoreToday >= metrics.avgScoreWeek ? 'positive' : 'negative'">
            {{ metrics.avgScoreToday >= metrics.avgScoreWeek ? '↗' : '↘' }}
            {{ (metrics.avgScoreToday - metrics.avgScoreWeek).toFixed(1) }} vs week avg
          </div>
        </div>
      </div>

      <!-- Assessments Today -->
      <div class="metric-card card">
        <div class="card-icon">📝</div>
        <div class="card-content">
          <div class="metric-value">{{ metrics.assessmentsToday }}</div>
          <div class="metric-label">Assessments Completed</div>
          <div class="metric-subtext">{{ metrics.assessmentsThisHour }} in the last hour</div>
        </div>
      </div>

      <!-- Goals Achieved Today -->
      <div class="metric-card card">
        <div class="card-icon">🎯</div>
        <div class="card-content">
          <div class="metric-value">{{ metrics.goalsAchievedToday }}</div>
          <div class="metric-label">Goals Achieved Today</div>
          <div class="metric-subtext">{{ metrics.totalActiveGoals }} goals in progress</div>
        </div>
      </div>

      <!-- Trending LOs -->
      <div class="trending-section card">
        <h3>📈 Trending Learning Outcomes</h3>
        <div class="trending-list">
          <div v-if="metrics.trendingLOs.improving.length === 0 && metrics.trendingLOs.declining.length === 0" 
               class="empty-state">
            <p>Not enough data to show trends yet</p>
          </div>

          <div v-if="metrics.trendingLOs.improving.length > 0" class="trend-group">
            <h4 class="trend-title positive">↗ Improving</h4>
            <div class="trend-items">
              <div v-for="lo in metrics.trendingLOs.improving" :key="lo.code" class="trend-item improving">
                <div class="lo-code">{{ lo.code }}</div>
                <div class="lo-desc">{{ lo.description }}</div>
                <div class="lo-stats">
                  <span class="pass-rate">{{ lo.passRate }}% pass rate</span>
                  <span class="change positive">+{{ lo.change }}%</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="metrics.trendingLOs.declining.length > 0" class="trend-group">
            <h4 class="trend-title negative">↘ Needs Attention</h4>
            <div class="trend-items">
              <div v-for="lo in metrics.trendingLOs.declining" :key="lo.code" class="trend-item declining">
                <div class="lo-code">{{ lo.code }}</div>
                <div class="lo-desc">{{ lo.description }}</div>
                <div class="lo-stats">
                  <span class="pass-rate">{{ lo.passRate }}% pass rate</span>
                  <span class="change negative">{{ lo.change }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Achievements -->
      <div class="achievements-section card">
        <h3>🏆 Recent Achievements (Last Hour)</h3>
        <div v-if="metrics.recentAchievements.length === 0" class="empty-state">
          <p>No recent achievements</p>
        </div>
        <div v-else class="achievements-list">
          <div v-for="achievement in metrics.recentAchievements" :key="achievement.id" class="achievement-item">
            <div class="achievement-icon">{{ achievement.icon }}</div>
            <div class="achievement-details">
              <div class="achievement-title">{{ achievement.title }}</div>
              <div class="achievement-meta">
                {{ achievement.studentName }} • {{ formatTimeAgo(achievement.timestamp) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- HOTS Dimensions Performance (Today) -->
      <div class="dimensions-section card">
        <h3>🎯 HOTS Performance Today</h3>
        <div class="dimensions-chart">
          <RadarChart 
            :values="metrics.dimensionsToday"
            :size="300"
            fillColor="#667eea"
            strokeColor="#667eea"
          />
        </div>
        <div class="dimensions-legend">
          <div v-for="(value, key) in metrics.dimensionsToday" :key="key" class="legend-item">
            <span class="legend-label">{{ getDimensionLabel(key) }}</span>
            <span class="legend-value">{{ value.toFixed(2) }}/5</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import RadarChart from '@/components/RadarChart.vue'

const authStore = useAuthStore()

const loading = ref(true)
const selectedCourse = ref('')
const courses = ref([])
const metrics = ref(null)
const autoRefresh = ref(true)
const nextRefresh = ref(30)
let refreshInterval = null
let countdownInterval = null

async function loadMetrics() {
  loading.value = true
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const weekAgo = new Date(todayStart)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Load courses
    const coursesQuery = query(
      collection(db, 'courses'),
      where('teacherId', '==', authStore.user.uid)
    )
    const coursesSnapshot = await getDocs(coursesQuery)
    courses.value = coursesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Build base query
    let baseQuery = collection(db, 'assessments')
    if (selectedCourse.value) {
      baseQuery = query(baseQuery, where('courseId', '==', selectedCourse.value))
    }

    // Get assessments today
    const todayQuery = query(
      baseQuery,
      where('timestamp', '>=', todayStart),
      orderBy('timestamp', 'desc')
    )
    const todaySnapshot = await getDocs(todayQuery)
    const todayAssessments = todaySnapshot.docs.map(doc => doc.data())

    // Get assessments yesterday
    const yesterdayQuery = query(
      baseQuery,
      where('timestamp', '>=', yesterdayStart),
      where('timestamp', '<', todayStart)
    )
    const yesterdaySnapshot = await getDocs(yesterdayQuery)

    // Get assessments this hour
    const hourQuery = query(
      baseQuery,
      where('timestamp', '>=', oneHourAgo),
      orderBy('timestamp', 'desc')
    )
    const hourSnapshot = await getDocs(hourQuery)

    // Get assessments this week
    const weekQuery = query(
      baseQuery,
      where('timestamp', '>=', weekAgo),
      orderBy('timestamp', 'desc')
    )
    const weekSnapshot = await getDocs(weekQuery)
    const weekAssessments = weekSnapshot.docs.map(doc => doc.data())

    // Calculate metrics
    const uniqueStudentsToday = new Set(todayAssessments.map(a => a.studentId)).size
    const uniqueStudentsYesterday = new Set(
      yesterdaySnapshot.docs.map(doc => doc.data().studentId)
    ).size

    const avgScoreToday = todayAssessments.length > 0
      ? todayAssessments.reduce((sum, a) => sum + (a.overallScore || 0), 0) / todayAssessments.length
      : 0

    const avgScoreWeek = weekAssessments.length > 0
      ? weekAssessments.reduce((sum, a) => sum + (a.overallScore || 0), 0) / weekAssessments.length
      : 0

    // Calculate dimensions average for today
    const dimensionsToday = {
      analysis: 0,
      reasoning: 0,
      creativity: 0,
      evidence: 0
    }

    todayAssessments.forEach(a => {
      if (a.rubricScores) {
        dimensionsToday.analysis += a.rubricScores.analysis || 0
        dimensionsToday.reasoning += a.rubricScores.reasoning || 0
        dimensionsToday.creativity += a.rubricScores.creativity || 0
        dimensionsToday.evidence += a.rubricScores.evidence || 0
      }
    })

    Object.keys(dimensionsToday).forEach(key => {
      dimensionsToday[key] = todayAssessments.length > 0 
        ? dimensionsToday[key] / todayAssessments.length 
        : 0
    })

    // Get goals achieved today
    const goalsQuery = query(
      collection(db, 'studentGoals'),
      where('completedAt', '>=', todayStart),
      where('status', '==', 'completed')
    )
    const goalsSnapshot = await getDocs(goalsQuery)

    // Get active goals
    const activeGoalsQuery = query(
      collection(db, 'studentGoals'),
      where('status', '==', 'active')
    )
    const activeGoalsSnapshot = await getDocs(activeGoalsQuery)

    // Get recent achievements (badges, perfect scores, streaks)
    const recentAchievements = []
    
    // Perfect scores in last hour
    hourSnapshot.docs.forEach(doc => {
      const data = doc.data()
      if (data.overallScore === 20) {
        recentAchievements.push({
          id: doc.id,
          icon: '🌟',
          title: 'Perfect Score!',
          studentName: 'Student ' + (data.studentId?.slice(-4) || '????'),
          timestamp: data.timestamp?.toDate() || new Date()
        })
      }
    })

    // Goals completed in last hour
    const hourGoalsQuery = query(
      collection(db, 'studentGoals'),
      where('completedAt', '>=', oneHourAgo),
      where('status', '==', 'completed'),
      limit(5)
    )
    const hourGoalsSnapshot = await getDocs(hourGoalsQuery)
    hourGoalsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      recentAchievements.push({
        id: doc.id,
        icon: '🎯',
        title: `Goal Achieved: ${data.type}`,
        studentName: 'Student ' + (data.studentId?.slice(-4) || '????'),
        timestamp: data.completedAt?.toDate() || new Date()
      })
    })

    // Sort by timestamp
    recentAchievements.sort((a, b) => b.timestamp - a.timestamp)

    // Trending LOs (would need more complex logic - simplified here)
    const trendingLOs = {
      improving: [],
      declining: []
    }

    metrics.value = {
      activeStudents: {
        today: uniqueStudentsToday,
        yesterday: uniqueStudentsYesterday,
        change: uniqueStudentsToday - uniqueStudentsYesterday
      },
      avgScoreToday,
      avgScoreWeek,
      assessmentsToday: todayAssessments.length,
      assessmentsThisHour: hourSnapshot.size,
      goalsAchievedToday: goalsSnapshot.size,
      totalActiveGoals: activeGoalsSnapshot.size,
      dimensionsToday,
      trendingLOs,
      recentAchievements: recentAchievements.slice(0, 10)
    }

  } catch (error) {
    console.error('Load metrics error:', error)
  } finally {
    loading.value = false
  }
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

function startAutoRefresh() {
  nextRefresh.value = 30
  
  refreshInterval = setInterval(() => {
    loadMetrics()
    nextRefresh.value = 30
  }, 30000)

  countdownInterval = setInterval(() => {
    if (nextRefresh.value > 0) {
      nextRefresh.value--
    }
  }, 1000)
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((new Date() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function getDimensionLabel(key) {
  const labels = {
    analysis: '🔍 Analysis',
    reasoning: '🧠 Reasoning',
    creativity: '💡 Creativity',
    evidence: '📚 Evidence'
  }
  return labels[key] || key
}

function exportMetrics() {
  if (!metrics.value) return

  const csv = [
    ['Metric', 'Value'],
    ['Active Students Today', metrics.value.activeStudents.today],
    ['Average Score Today', metrics.value.avgScoreToday.toFixed(2)],
    ['Assessments Today', metrics.value.assessmentsToday],
    ['Goals Achieved Today', metrics.value.goalsAchievedToday],
    ['Analysis Avg', metrics.value.dimensionsToday.analysis.toFixed(2)],
    ['Reasoning Avg', metrics.value.dimensionsToday.reasoning.toFixed(2)],
    ['Creativity Avg', metrics.value.dimensionsToday.creativity.toFixed(2)],
    ['Evidence Avg', metrics.value.dimensionsToday.evidence.toFixed(2)]
  ].map(row => row.join(',')).join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `realtime-metrics-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  loadMetrics()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.realtime-monitor {
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
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
}

.course-select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.auto-refresh-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 2rem;
  border: 1px solid var(--border-color);
}

.auto-refresh-indicator.active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-color: #059669;
}

.pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.toggle-btn {
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: inherit;
  cursor: pointer;
  font-size: 0.875rem;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem;
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

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.metric-card {
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.card-icon {
  font-size: 3rem;
}

.card-content {
  flex: 1;
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.metric-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.metric-change {
  font-size: 0.875rem;
  font-weight: 600;
}

.metric-change.positive {
  color: #10b981;
}

.metric-change.negative {
  color: #ef4444;
}

.metric-subtext {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.trending-section,
.achievements-section,
.dimensions-section {
  grid-column: 1 / -1;
  padding: 2rem;
}

.trending-section h3,
.achievements-section h3,
.dimensions-section h3 {
  margin: 0 0 1.5rem 0;
}

.trend-group {
  margin-bottom: 1.5rem;
}

.trend-title {
  margin: 0 0 1rem 0;
  font-size: 1rem;
}

.trend-title.positive {
  color: #10b981;
}

.trend-title.negative {
  color: #ef4444;
}

.trend-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.trend-item {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border-left: 4px solid transparent;
}

.trend-item.improving {
  border-left-color: #10b981;
}

.trend-item.declining {
  border-left-color: #ef4444;
}

.lo-code {
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.lo-desc {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.lo-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
}

.pass-rate {
  color: var(--text-secondary);
}

.change {
  font-weight: 600;
}

.achievements-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.achievement-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.achievement-icon {
  font-size: 2rem;
}

.achievement-title {
  font-weight: 600;
  color: var(--text-primary);
}

.achievement-meta {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.dimensions-chart {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.dimensions-legend {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.legend-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.legend-label {
  font-weight: 600;
}

.legend-value {
  color: var(--primary);
  font-weight: 700;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .realtime-monitor {
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

  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
