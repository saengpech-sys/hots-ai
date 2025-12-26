<template>
  <div class="learning-trajectory-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>📈 Learning Trajectory Analysis</h1>
        <p class="subtitle">วิเคราะห์วิถีการเรียนรู้และพัฒนาการ HOTS</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="refreshTrajectory">
          🔄 รีเฟรช
        </button>
        <button class="btn btn-primary" @click="exportTrajectory">
          📤 Export
        </button>
      </div>
    </div>

    <!-- Student Selector (for teachers) -->
    <div v-if="isTeacher" class="student-selector">
      <label>เลือกนักเรียน:</label>
      <select v-model="selectedStudentId" @change="loadTrajectory">
        <option value="">-- เลือกนักเรียน --</option>
        <option 
          v-for="student in students" 
          :key="student.id" 
          :value="student.id"
        >
          {{ student.displayName || student.email }}
        </option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังวิเคราะห์ข้อมูล...</p>
    </div>

    <!-- No Data State -->
    <div v-else-if="!trajectory" class="no-data-state">
      <div class="icon">📊</div>
      <h3>ยังไม่มีข้อมูลเพียงพอ</h3>
      <p>ต้องมีการประเมินอย่างน้อย 2 ครั้งเพื่อวิเคราะห์วิถีการเรียนรู้</p>
    </div>

    <!-- Trajectory Content -->
    <div v-else class="trajectory-content">
      <!-- Overview Cards -->
      <div class="overview-cards">
        <div class="overview-card growth">
          <div class="card-icon">📈</div>
          <div class="card-content">
            <h3>การเติบโต</h3>
            <div class="growth-value" :class="trajectory.overallProgression?.growth?.absolute >= 0 ? 'positive' : 'negative'">
              {{ trajectory.overallProgression?.growth?.absolute >= 0 ? '+' : '' }}{{ trajectory.overallProgression?.growth?.absolute }}
            </div>
            <small>{{ trajectory.overallProgression?.growth?.interpretation }}</small>
          </div>
        </div>

        <div class="overview-card state">
          <div class="card-icon">🎯</div>
          <div class="card-content">
            <h3>ระดับปัจจุบัน</h3>
            <div class="state-badge" :style="{ backgroundColor: trajectory.overallProgression?.currentState?.color }">
              {{ trajectory.overallProgression?.currentState?.label }}
            </div>
          </div>
        </div>

        <div class="overview-card pattern">
          <div class="card-icon">🔄</div>
          <div class="card-content">
            <h3>รูปแบบการเรียนรู้</h3>
            <div class="pattern-name">{{ getPatternLabel(trajectory.growthPatterns?.pattern) }}</div>
            <small>{{ trajectory.growthPatterns?.interpretation }}</small>
          </div>
        </div>

        <div class="overview-card assessments">
          <div class="card-icon">📝</div>
          <div class="card-content">
            <h3>จำนวนการประเมิน</h3>
            <div class="assessment-count">{{ trajectory.assessmentCount }}</div>
            <small>{{ trajectory.timeSpan?.durationDays }} วัน</small>
          </div>
        </div>
      </div>

      <!-- Score Trend Chart -->
      <div class="chart-section">
        <h2>📊 แนวโน้มคะแนนรวม</h2>
        <div class="chart-container">
          <canvas ref="trendChartRef"></canvas>
        </div>
        <div class="trend-info">
          <span class="trend-direction" :class="trajectory.overallProgression?.trend?.direction">
            {{ getTrendIcon(trajectory.overallProgression?.trend?.direction) }}
            {{ getTrendLabel(trajectory.overallProgression?.trend?.direction) }}
          </span>
          <span class="trend-slope">
            ความชัน: {{ trajectory.overallProgression?.trend?.slope?.toFixed(3) }}
          </span>
        </div>
      </div>

      <!-- Dimension Trajectories -->
      <div class="dimension-section">
        <h2>🎯 พัฒนาการรายมิติ</h2>
        <div class="dimension-grid">
          <div 
            v-for="dim in dimensions" 
            :key="dim.key"
            class="dimension-card"
            :class="{ 'needs-attention': trajectory.dimensionTrajectories?.[dim.key]?.currentScore < 3 }"
          >
            <div class="dim-header">
              <span class="dim-icon">{{ dim.icon }}</span>
              <span class="dim-name">{{ dim.label }}</span>
            </div>
            
            <div class="dim-scores">
              <div class="current-score">
                <span class="label">ปัจจุบัน</span>
                <span class="value">{{ trajectory.dimensionTrajectories?.[dim.key]?.currentScore || 0 }}/5</span>
              </div>
              <div class="growth-indicator" :class="getGrowthClass(trajectory.dimensionTrajectories?.[dim.key]?.growth)">
                {{ trajectory.dimensionTrajectories?.[dim.key]?.growth >= 0 ? '+' : '' }}{{ trajectory.dimensionTrajectories?.[dim.key]?.growth || 0 }}
              </div>
            </div>

            <div class="dim-mini-chart">
              <div 
                v-for="(point, index) in trajectory.dimensionTrajectories?.[dim.key]?.scores?.slice(-10)" 
                :key="index"
                class="mini-bar"
                :style="{ height: (point.score / 5 * 100) + '%' }"
                :title="`${point.score}/5`"
              ></div>
            </div>

            <div class="dim-stats">
              <div class="stat">
                <label>สูงสุด</label>
                <span>{{ trajectory.dimensionTrajectories?.[dim.key]?.peakScore }}/5</span>
              </div>
              <div class="stat">
                <label>ผันผวน</label>
                <span>{{ trajectory.dimensionTrajectories?.[dim.key]?.volatility?.toFixed(2) }}</span>
              </div>
            </div>

            <!-- Breakthroughs -->
            <div v-if="trajectory.dimensionTrajectories?.[dim.key]?.breakthroughs?.length" class="breakthroughs">
              <span class="breakthrough-badge">
                🚀 {{ trajectory.dimensionTrajectories[dim.key].breakthroughs.length }} ครั้งที่ก้าวกระโดด
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stuck Points -->
      <div v-if="trajectory.stuckPoints?.points?.length > 0" class="stuck-points-section">
        <h2>⚠️ จุดติดขัด (Stuck Points)</h2>
        <div class="stuck-info">
          <p class="stuck-summary">
            พบ {{ trajectory.stuckPoints.totalStuckPoints }} จุดติดขัด
            <span v-if="trajectory.stuckPoints.unresolvedCount > 0" class="unresolved">
              (ยังไม่แก้ไข {{ trajectory.stuckPoints.unresolvedCount }} จุด)
            </span>
          </p>
          <p v-if="trajectory.stuckPoints.mostChallengingDimension" class="most-challenging">
            มิติที่ท้าทายที่สุด: <strong>{{ getDimensionLabel(trajectory.stuckPoints.mostChallengingDimension) }}</strong>
          </p>
        </div>
        
        <div class="stuck-list">
          <div 
            v-for="(point, index) in trajectory.stuckPoints.points.slice(0, 5)" 
            :key="index"
            class="stuck-item"
            :class="{ resolved: point.resolved }"
          >
            <div class="stuck-header">
              <span class="dim-badge">{{ getDimensionLabel(point.dimension) }}</span>
              <span class="duration">{{ point.duration }} ครั้งติดต่อกัน</span>
              <span class="status-badge" :class="point.resolved ? 'resolved' : 'ongoing'">
                {{ point.resolved ? '✓ แก้ไขแล้ว' : '⚠️ ยังติดอยู่' }}
              </span>
            </div>
            <div class="stuck-detail">
              <span>คะแนนเฉลี่ยช่วงติด: {{ point.averageScore?.toFixed(1) }}/5</span>
            </div>
          </div>
        </div>

        <div class="stuck-insights">
          <h4>💡 ข้อเสนอแนะ</h4>
          <ul>
            <li v-for="(insight, index) in trajectory.stuckPoints.insights" :key="index">
              {{ insight }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Milestones -->
      <div v-if="trajectory.milestones?.length > 0" class="milestones-section">
        <h2>🏆 Milestones</h2>
        <div class="milestones-timeline">
          <div 
            v-for="(milestone, index) in trajectory.milestones" 
            :key="index"
            class="milestone-item"
            :class="milestone.type.toLowerCase()"
          >
            <div class="milestone-icon">
              {{ getMilestoneIcon(milestone.type) }}
            </div>
            <div class="milestone-content">
              <div class="milestone-title">{{ milestone.description }}</div>
              <div class="milestone-date">{{ formatDate(milestone.date) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dimension Dependencies -->
      <div class="dependencies-section">
        <h2>🔗 ความสัมพันธ์ระหว่างมิติ</h2>
        
        <div v-if="trajectory.dimensionDependencies?.strongDependencies?.length > 0" class="strong-deps">
          <h4>ความสัมพันธ์ที่แข็งแกร่ง</h4>
          <div class="dep-list">
            <div 
              v-for="(dep, index) in trajectory.dimensionDependencies.strongDependencies" 
              :key="index"
              class="dep-item"
            >
              <span class="dep-dims">
                {{ getDimensionLabel(dep.dimension1) }} 
                <span class="arrow">⟷</span> 
                {{ getDimensionLabel(dep.dimension2) }}
              </span>
              <span class="dep-value" :class="dep.correlation > 0 ? 'positive' : 'negative'">
                r = {{ dep.correlation?.toFixed(2) }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="trajectory.dimensionDependencies?.insights?.length > 0" class="dep-insights">
          <h4>💡 ข้อค้นพบ</h4>
          <ul>
            <li v-for="(insight, index) in trajectory.dimensionDependencies.insights" :key="index">
              {{ insight.message }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Sequential Patterns -->
      <div class="sequential-section">
        <h2>🔄 รูปแบบลำดับการพัฒนา</h2>
        
        <div class="sequential-info">
          <p>
            <strong>ลำดับที่พบบ่อยที่สุด:</strong> 
            {{ trajectory.sequentialPatterns?.mostCommonSequence || 'ยังไม่พบรูปแบบชัดเจน' }}
          </p>
        </div>

        <div v-if="trajectory.sequentialPatterns?.prerequisites?.length > 0" class="prerequisites">
          <h4>📚 ทักษะที่เป็นพื้นฐาน (Prerequisite)</h4>
          <div class="prereq-list">
            <div 
              v-for="(prereq, index) in trajectory.sequentialPatterns.prerequisites" 
              :key="index"
              class="prereq-item"
            >
              <span class="prereq-from">{{ getDimensionLabel(prereq.prerequisite) }}</span>
              <span class="prereq-arrow">→</span>
              <span class="prereq-to">{{ getDimensionLabel(prereq.dependent) }}</span>
              <span class="prereq-prob">{{ (prereq.probability * 100).toFixed(0) }}%</span>
            </div>
          </div>
        </div>

        <div v-if="trajectory.sequentialPatterns?.coImprovements?.length > 0" class="co-improvements">
          <h4>🤝 ทักษะที่พัฒนาไปด้วยกัน</h4>
          <div class="co-list">
            <div 
              v-for="(co, index) in trajectory.sequentialPatterns.coImprovements.slice(0, 3)" 
              :key="index"
              class="co-item"
            >
              {{ co.dimensions.map(d => getDimensionLabel(d)).join(' + ') }}
              <span class="co-freq">({{ co.frequency }} ครั้ง)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- State Transitions -->
      <div class="transitions-section">
        <h2>🔀 การเปลี่ยนแปลงระดับ</h2>
        
        <div class="state-sequence">
          <span 
            v-for="(state, index) in trajectory.stateTransitions?.stateSequence?.slice(-10)" 
            :key="index"
            class="state-chip"
            :class="state.toLowerCase()"
          >
            {{ getStateLabel(state) }}
          </span>
        </div>

        <div class="common-paths">
          <h4>เส้นทางที่พบบ่อย</h4>
          <div class="path-list">
            <div 
              v-for="(path, index) in trajectory.stateTransitions?.commonPaths" 
              :key="index"
              class="path-item"
            >
              <span class="path-name">{{ path.path }}</span>
              <span class="path-count">{{ path.count }} ครั้ง</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase/config'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const authStore = useAuthStore()

// State
const loading = ref(false)
const trajectory = ref(null)
const selectedStudentId = ref('')
const students = ref([])
const trendChartRef = ref(null)
let trendChart = null

// Dimensions
const dimensions = [
  { key: 'analysis', label: 'การวิเคราะห์', icon: '🔍' },
  { key: 'reasoning', label: 'การให้เหตุผล', icon: '🧠' },
  { key: 'creativity', label: 'ความคิดสร้างสรรค์', icon: '💡' },
  { key: 'evidence', label: 'การใช้หลักฐาน', icon: '📚' }
]

// Computed
const isTeacher = computed(() => authStore.user?.role === 'teacher')

// Methods
const loadTrajectory = async () => {
  const studentId = isTeacher.value ? selectedStudentId.value : authStore.user?.uid
  if (!studentId) return
  
  loading.value = true
  
  try {
    const getTrajectory = httpsCallable(functions, 'getStudentTrajectory')
    const result = await getTrajectory({ studentId })
    
    if (result.data.success) {
      trajectory.value = result.data.trajectory
      await nextTick()
      renderTrendChart()
    } else {
      trajectory.value = null
    }
  } catch (error) {
    console.error('Error loading trajectory:', error)
    trajectory.value = null
  } finally {
    loading.value = false
  }
}

const refreshTrajectory = () => {
  loadTrajectory()
}

const exportTrajectory = () => {
  if (!trajectory.value) return
  
  const data = JSON.stringify(trajectory.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trajectory_${selectedStudentId.value || authStore.user?.uid}_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const renderTrendChart = () => {
  if (!trendChartRef.value || !trajectory.value?.overallProgression?.scores) return
  
  // Destroy existing chart
  if (trendChart) {
    trendChart.destroy()
  }
  
  const scores = trajectory.value.overallProgression.scores
  const labels = scores.map((_, i) => `#${i + 1}`)
  const data = scores.map(s => s.totalScore)
  const colors = scores.map(s => s.state?.color || '#6b7280')
  
  // Calculate trend line
  const n = data.length
  const xMean = (n - 1) / 2
  const yMean = data.reduce((a, b) => a + b, 0) / n
  let numerator = 0, denominator = 0
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (data[i] - yMean)
    denominator += (i - xMean) * (i - xMean)
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0
  const intercept = yMean - slope * xMean
  const trendLine = data.map((_, i) => intercept + slope * i)
  
  trendChart = new Chart(trendChartRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'คะแนนรวม',
          data,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: colors,
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          label: 'แนวโน้ม',
          data: trendLine,
          borderColor: '#ef4444',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              if (context.datasetIndex === 0) {
                const state = scores[context.dataIndex]?.state
                return `ระดับ: ${state?.label || 'N/A'}`
              }
              return ''
            }
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 20,
          ticks: {
            stepSize: 5
          }
        }
      }
    }
  })
}

const getDimensionLabel = (dim) => {
  const labels = {
    analysis: 'การวิเคราะห์',
    reasoning: 'การให้เหตุผล',
    creativity: 'ความคิดสร้างสรรค์',
    evidence: 'การใช้หลักฐาน'
  }
  return labels[dim] || dim
}

const getPatternLabel = (pattern) => {
  const labels = {
    steady_growth: '📈 เติบโตสม่ำเสมอ',
    oscillating_growth: '📊 ขึ้นลงแต่มีแนวโน้มดี',
    growth_then_plateau: '📉 เติบโตแล้วคงที่',
    breakthrough: '🚀 ก้าวกระโดด',
    declining: '📉 ลดลง',
    unknown: '❓ ยังไม่ชัดเจน'
  }
  return labels[pattern] || pattern
}

const getTrendIcon = (direction) => {
  const icons = { increasing: '📈', decreasing: '📉', stable: '➡️' }
  return icons[direction] || '➡️'
}

const getTrendLabel = (direction) => {
  const labels = { increasing: 'เพิ่มขึ้น', decreasing: 'ลดลง', stable: 'คงที่' }
  return labels[direction] || 'ไม่ทราบ'
}

const getGrowthClass = (growth) => {
  if (growth > 0) return 'positive'
  if (growth < 0) return 'negative'
  return 'neutral'
}

const getMilestoneIcon = (type) => {
  const icons = {
    STATE_ADVANCEMENT: '🎯',
    DIMENSION_MASTERY: '⭐',
    PERFECT_SCORE: '🏆'
  }
  return icons[type] || '📌'
}

const getStateLabel = (state) => {
  const labels = {
    NOVICE: 'มือใหม่',
    DEVELOPING: 'พัฒนา',
    COMPETENT: 'พอใช้',
    PROFICIENT: 'ดี',
    EXPERT: 'เก่ง'
  }
  return labels[state] || state
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Lifecycle
onMounted(() => {
  if (!isTeacher.value) {
    loadTrajectory()
  }
})

watch(selectedStudentId, () => {
  if (selectedStudentId.value) {
    loadTrajectory()
  }
})
</script>

<style scoped>
.learning-trajectory-view {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.75rem;
  margin: 0;
}

.subtitle {
  color: var(--text-secondary);
  margin: 0.5rem 0 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.student-selector {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.student-selector select {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  min-width: 250px;
}

/* Loading & No Data States */
.loading-state, .no-data-state {
  text-align: center;
  padding: 4rem 2rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--bg-secondary);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.no-data-state .icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

/* Overview Cards */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.overview-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.overview-card .card-icon {
  font-size: 2rem;
}

.overview-card h3 {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 0.5rem;
}

.growth-value {
  font-size: 2rem;
  font-weight: 700;
}

.growth-value.positive { color: #22c55e; }
.growth-value.negative { color: #ef4444; }

.state-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  color: white;
  font-weight: 600;
}

.pattern-name {
  font-weight: 600;
  font-size: 1.1rem;
}

.assessment-count {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary);
}

/* Chart Section */
.chart-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.chart-section h2 {
  margin: 0 0 1rem;
}

.chart-container {
  height: 300px;
  position: relative;
}

.trend-info {
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.trend-direction.increasing { color: #22c55e; }
.trend-direction.decreasing { color: #ef4444; }
.trend-direction.stable { color: #6b7280; }

/* Dimension Section */
.dimension-section {
  margin-bottom: 2rem;
}

.dimension-section h2 {
  margin: 0 0 1rem;
}

.dimension-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.dimension-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.25rem;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.dimension-card.needs-attention {
  border-color: #f97316;
  background: #fff7ed;
}

.dim-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.dim-icon {
  font-size: 1.5rem;
}

.dim-name {
  font-weight: 600;
}

.dim-scores {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.current-score .label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: block;
}

.current-score .value {
  font-size: 1.5rem;
  font-weight: 700;
}

.growth-indicator {
  font-size: 1.25rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
}

.growth-indicator.positive { background: #dcfce7; color: #166534; }
.growth-indicator.negative { background: #fecaca; color: #991b1b; }
.growth-indicator.neutral { background: #f3f4f6; color: #6b7280; }

.dim-mini-chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 40px;
  margin-bottom: 1rem;
}

.mini-bar {
  flex: 1;
  background: var(--primary);
  border-radius: 2px 2px 0 0;
  min-height: 2px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.mini-bar:hover {
  opacity: 1;
}

.dim-stats {
  display: flex;
  gap: 1.5rem;
}

.dim-stats .stat {
  display: flex;
  flex-direction: column;
}

.dim-stats label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.breakthroughs {
  margin-top: 0.75rem;
}

.breakthrough-badge {
  font-size: 0.75rem;
  background: #dbeafe;
  color: #1e40af;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

/* Stuck Points */
.stuck-points-section {
  background: #fff7ed;
  border: 1px solid #fdba74;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.stuck-points-section h2 {
  margin: 0 0 1rem;
  color: #9a3412;
}

.stuck-info {
  margin-bottom: 1rem;
}

.unresolved {
  color: #dc2626;
  font-weight: 600;
}

.most-challenging {
  color: #9a3412;
}

.stuck-list {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stuck-item {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #fdba74;
}

.stuck-item.resolved {
  opacity: 0.7;
  border-color: #86efac;
}

.stuck-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.dim-badge {
  background: var(--primary);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.status-badge.resolved { background: #dcfce7; color: #166534; }
.status-badge.ongoing { background: #fecaca; color: #991b1b; }

.stuck-insights {
  background: white;
  border-radius: 8px;
  padding: 1rem;
}

.stuck-insights h4 {
  margin: 0 0 0.5rem;
}

.stuck-insights ul {
  margin: 0;
  padding-left: 1.25rem;
}

/* Milestones */
.milestones-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.milestones-section h2 {
  margin: 0 0 1rem;
}

.milestones-timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.milestone-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
  border-left: 4px solid var(--primary);
}

.milestone-item.state_advancement { border-left-color: #22c55e; }
.milestone-item.dimension_mastery { border-left-color: #f59e0b; }
.milestone-item.perfect_score { border-left-color: #8b5cf6; }

.milestone-icon {
  font-size: 1.5rem;
}

.milestone-title {
  font-weight: 600;
}

.milestone-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Dependencies Section */
.dependencies-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.dependencies-section h2 {
  margin: 0 0 1rem;
}

.strong-deps h4, .dep-insights h4 {
  margin: 0 0 0.75rem;
}

.dep-list {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.dep-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.dep-dims .arrow {
  color: var(--text-secondary);
  margin: 0 0.5rem;
}

.dep-value {
  font-weight: 600;
}

.dep-value.positive { color: #22c55e; }
.dep-value.negative { color: #ef4444; }

.dep-insights ul {
  margin: 0;
  padding-left: 1.25rem;
}

/* Sequential Section */
.sequential-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.sequential-section h2 {
  margin: 0 0 1rem;
}

.sequential-info {
  margin-bottom: 1.5rem;
}

.prerequisites h4, .co-improvements h4 {
  margin: 0 0 0.75rem;
}

.prereq-list, .co-list {
  display: grid;
  gap: 0.5rem;
}

.prereq-item, .co-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.prereq-arrow {
  color: var(--primary);
  font-weight: bold;
}

.prereq-prob, .co-freq {
  margin-left: auto;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* Transitions Section */
.transitions-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
}

.transitions-section h2 {
  margin: 0 0 1rem;
}

.state-sequence {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.state-chip {
  padding: 0.375rem 0.75rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 500;
}

.state-chip.novice { background: #fecaca; color: #991b1b; }
.state-chip.developing { background: #fed7aa; color: #9a3412; }
.state-chip.competent { background: #fef08a; color: #854d0e; }
.state-chip.proficient { background: #bbf7d0; color: #166534; }
.state-chip.expert { background: #a7f3d0; color: #065f46; }

.common-paths h4 {
  margin: 0 0 0.75rem;
}

.path-list {
  display: grid;
  gap: 0.5rem;
}

.path-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: var(--bg-primary);
  border-radius: 6px;
}

.path-count {
  color: var(--text-secondary);
}

/* Buttons */
.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-secondary {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-primary);
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .overview-cards {
    grid-template-columns: 1fr;
  }
  
  .dimension-grid {
    grid-template-columns: 1fr;
  }
}
</style>
