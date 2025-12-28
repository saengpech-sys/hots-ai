<template>
  <div class="mental-model-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>🧠 Mental Model Mapping</h1>
        <p class="subtitle">วิเคราะห์โครงข่ายแนวคิดและการเปลี่ยนแปลงมโนทัศน์</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="refreshData">
          🔄 รีเฟรช
        </button>
        <button class="btn btn-primary" @click="exportData">
          📤 Export
        </button>
      </div>
    </div>

    <!-- Student Selector (for teachers) -->
    <div v-if="isTeacher" class="student-selector card">
      <label>เลือกนักเรียน:</label>
      <select v-model="selectedStudentId" @change="loadMentalModel">
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
      <p>กำลังวิเคราะห์โครงข่ายแนวคิด...</p>
    </div>

    <!-- No Data State -->
    <div v-else-if="!mentalModel" class="no-data-state">
      <div class="icon">🧠</div>
      <h3>ยังไม่มีข้อมูลเพียงพอ</h3>
      <p>ต้องมีการประเมินอย่างน้อย 2 ครั้งเพื่อวิเคราะห์โครงข่ายแนวคิด</p>
    </div>

    <!-- Main Content -->
    <div v-else class="mental-model-content">
      <!-- Overview Cards -->
      <div class="overview-cards">
        <div class="overview-card">
          <div class="card-icon">📝</div>
          <div class="card-content">
            <h3>จำนวนการประเมิน</h3>
            <div class="stat-value">{{ mentalModel.assessmentCount }}</div>
            <small>{{ mentalModel.timeSpan?.durationDays || 0 }} วัน</small>
          </div>
        </div>

        <div class="overview-card">
          <div class="card-icon">🔗</div>
          <div class="card-content">
            <h3>ความหนาแน่นโครงข่าย</h3>
            <div class="stat-value">{{ (mentalModel.conceptNetwork?.networkDensity * 100).toFixed(0) }}%</div>
            <small>{{ getDensityLabel(mentalModel.conceptNetwork?.networkDensity) }}</small>
          </div>
        </div>

        <div class="overview-card">
          <div class="card-icon">🔄</div>
          <div class="card-content">
            <h3>การเปลี่ยนแปลง</h3>
            <div class="stat-value">{{ mentalModel.conceptualChanges?.summary?.totalChanges || 0 }}</div>
            <small>Conceptual Changes</small>
          </div>
        </div>

        <div class="overview-card highlight">
          <div class="card-icon">⭐</div>
          <div class="card-content">
            <h3>มิติที่โดดเด่น</h3>
            <div class="stat-value">{{ getStrongestDimension() }}</div>
            <small>Strongest Dimension</small>
          </div>
        </div>
      </div>

      <!-- Concept Network Visualization -->
      <div class="network-section card">
        <h2>🔗 โครงข่ายแนวคิด (Concept Network)</h2>
        <div class="network-container">
          <div class="network-graph">
            <svg ref="networkSvg" width="100%" height="400"></svg>
          </div>
          <div class="network-legend">
            <div class="legend-item">
              <span class="legend-dot analysis"></span> การวิเคราะห์
            </div>
            <div class="legend-item">
              <span class="legend-dot reasoning"></span> การให้เหตุผล
            </div>
            <div class="legend-item">
              <span class="legend-dot creativity"></span> ความคิดสร้างสรรค์
            </div>
            <div class="legend-item">
              <span class="legend-dot evidence"></span> การใช้หลักฐาน
            </div>
          </div>
        </div>

        <!-- Network Stats -->
        <div class="network-stats">
          <div class="stat">
            <label>จำนวน Concepts</label>
            <span>{{ mentalModel.conceptNetwork?.nodes?.length || 0 }}</span>
          </div>
          <div class="stat">
            <label>จำนวนการเชื่อมโยง</label>
            <span>{{ mentalModel.conceptNetwork?.edges?.length || 0 }}</span>
          </div>
          <div class="stat">
            <label>ความซับซ้อน</label>
            <span>{{ getComplexityLabel(mentalModel.conceptNetwork?.complexity) }}</span>
          </div>
        </div>
      </div>

      <!-- Conceptual Changes Timeline -->
      <div class="changes-section card">
        <h2>🔄 วิวัฒนาการทางความคิด (Conceptual Change)</h2>
        
        <div v-if="mentalModel.conceptualChanges?.significantChanges?.length > 0" class="changes-timeline">
          <div 
            v-for="(change, index) in mentalModel.conceptualChanges.significantChanges" 
            :key="index"
            class="change-item"
            :class="change.type?.toLowerCase()"
          >
            <div class="change-icon">{{ getChangeIcon(change.type) }}</div>
            <div class="change-content">
              <div class="change-header">
                <span class="change-type">{{ getChangeTypeName(change.type) }}</span>
                <span class="change-dim">{{ getDimensionLabel(change.dimension) }}</span>
              </div>
              <p class="change-description">{{ change.description }}</p>
              <div class="change-meta">
                <span>Assessment #{{ change.assessmentIndex + 1 }}</span>
                <span v-if="change.date">{{ formatDate(change.date) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="no-changes">
          <p>ยังไม่พบการเปลี่ยนแปลงทางมโนทัศน์ที่ชัดเจน</p>
          <small>ต้องมีข้อมูลมากขึ้นเพื่อวิเคราะห์การเปลี่ยนแปลง</small>
        </div>
      </div>

      <!-- Dimension Models -->
      <div class="dimension-section card">
        <h2>📊 รูปแบบความคิดรายมิติ</h2>
        <div class="dimension-grid">
          <div 
            v-for="dim in dimensions" 
            :key="dim.key"
            class="dimension-model"
            :class="{ strong: isStrongDimension(dim.key) }"
          >
            <div class="dim-header">
              <span class="dim-icon">{{ dim.icon }}</span>
              <span class="dim-name">{{ dim.label }}</span>
            </div>

            <div class="dim-progress">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: getDimensionProgress(dim.key) + '%' }"
                  :class="dim.key"
                ></div>
              </div>
              <span class="progress-label">{{ getDimensionLevel(dim.key) }}</span>
            </div>

            <div class="dim-keywords">
              <span 
                v-for="(keyword, i) in getDimensionKeywords(dim.key)" 
                :key="i"
                class="keyword-tag"
              >
                {{ keyword }}
              </span>
            </div>

            <p class="dim-insight">{{ getDimensionInsight(dim.key) }}</p>
          </div>
        </div>
      </div>

      <!-- Misconceptions -->
      <div v-if="mentalModel.misconceptions?.all?.length > 0" class="misconceptions-section card">
        <h2>⚠️ ความเข้าใจผิดที่ตรวจพบ</h2>
        <div class="misconception-list">
          <div 
            v-for="(misc, index) in mentalModel.misconceptions.all" 
            :key="index"
            class="misconception-item"
            :class="{ resolved: misc.resolved }"
          >
            <div class="misc-icon">{{ misc.resolved ? '✅' : '❌' }}</div>
            <div class="misc-content">
              <p class="misc-description">{{ misc.description }}</p>
              <div class="misc-meta">
                <span class="misc-dim">{{ getDimensionLabel(misc.dimension) }}</span>
                <span class="misc-status">{{ misc.resolved ? 'แก้ไขแล้ว' : 'ยังคงอยู่' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Learning Narrative -->
      <div class="narrative-section card">
        <h2>📖 สรุปเชิงคุณภาพ (Qualitative Synthesis)</h2>
        <div class="narrative-content">
          <div v-if="mentalModel.learningNarrative" class="narrative-text">
            {{ mentalModel.learningNarrative }}
          </div>
          <div v-else class="narrative-placeholder">
            ยังไม่มีข้อมูลเพียงพอสำหรับการสังเคราะห์เชิงคุณภาพ
          </div>
        </div>

        <div v-if="mentalModel.qualitativeSynthesis" class="synthesis-details">
          <h4>รายละเอียดการวิเคราะห์:</h4>
          <ul>
            <li v-for="(point, i) in mentalModel.qualitativeSynthesis.keyFindings" :key="i">
              {{ point }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/config'

const authStore = useAuthStore()

// State
const loading = ref(false)
const mentalModel = ref(null)
const selectedStudentId = ref('')
const students = ref([])

// Computed
const isTeacher = computed(() => authStore.user?.role === 'teacher')
const studentId = computed(() => selectedStudentId.value || authStore.user?.uid)

// Dimensions config
const dimensions = [
  { key: 'analysis', label: 'การวิเคราะห์', icon: '🔍' },
  { key: 'reasoning', label: 'การให้เหตุผล', icon: '🧠' },
  { key: 'creativity', label: 'ความคิดสร้างสรรค์', icon: '💡' },
  { key: 'evidence', label: 'การใช้หลักฐาน', icon: '📚' }
]

// Network SVG ref
const networkSvg = ref(null)

// Load mental model data
const loadMentalModel = async () => {
  if (!studentId.value) return
  
  loading.value = true
  
  try {
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || ''
    const response = await fetch(`${functionsUrl}/getMentalModelMap?studentId=${studentId.value}`)
    const data = await response.json()
    
    if (data.success) {
      mentalModel.value = data.mentalModelMap
      await nextTick()
      renderNetworkGraph()
    } else {
      mentalModel.value = null
      console.warn('Mental model not available:', data.error)
    }
  } catch (error) {
    console.error('Error loading mental model:', error)
    mentalModel.value = null
  } finally {
    loading.value = false
  }
}

// Load students (for teachers)
const loadStudents = async () => {
  if (!isTeacher.value) return
  
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      orderBy('displayName')
    )
    const snapshot = await getDocs(q)
    students.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading students:', error)
  }
}

// Render network graph using SVG
const renderNetworkGraph = () => {
  if (!networkSvg.value || !mentalModel.value?.conceptNetwork) return
  
  const svg = networkSvg.value
  const network = mentalModel.value.conceptNetwork
  const nodes = network.nodes || []
  const edges = network.edges || []
  
  // Clear existing
  svg.innerHTML = ''
  
  if (nodes.length === 0) {
    // Show empty state
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('x', '50%')
    text.setAttribute('y', '50%')
    text.setAttribute('text-anchor', 'middle')
    text.setAttribute('fill', '#999')
    text.textContent = 'ยังไม่มีข้อมูลโครงข่าย'
    svg.appendChild(text)
    return
  }
  
  const width = svg.clientWidth || 600
  const height = 400
  const centerX = width / 2
  const centerY = height / 2
  
  // Dimension colors
  const colors = {
    analysis: '#3b82f6',
    reasoning: '#8b5cf6',
    creativity: '#f59e0b',
    evidence: '#10b981',
    default: '#6b7280'
  }
  
  // Position nodes in a circular layout
  const radius = Math.min(width, height) / 3
  const nodePositions = {}
  
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2
    nodePositions[node.id || i] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    }
  })
  
  // Draw edges
  edges.forEach(edge => {
    const source = nodePositions[edge.source]
    const target = nodePositions[edge.target]
    if (!source || !target) return
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', source.x)
    line.setAttribute('y1', source.y)
    line.setAttribute('x2', target.x)
    line.setAttribute('y2', target.y)
    line.setAttribute('stroke', '#e5e7eb')
    line.setAttribute('stroke-width', Math.max(1, (edge.weight || 1) * 2))
    svg.appendChild(line)
  })
  
  // Draw nodes
  nodes.forEach((node, i) => {
    const pos = nodePositions[node.id || i]
    const color = colors[node.dimension] || colors.default
    const nodeSize = 8 + (node.richness || 1) * 3
    
    // Circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', pos.x)
    circle.setAttribute('cy', pos.y)
    circle.setAttribute('r', nodeSize)
    circle.setAttribute('fill', color)
    circle.setAttribute('stroke', 'white')
    circle.setAttribute('stroke-width', '2')
    svg.appendChild(circle)
    
    // Label
    if (node.label) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('x', pos.x)
      text.setAttribute('y', pos.y + nodeSize + 12)
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('font-size', '10')
      text.setAttribute('fill', '#374151')
      text.textContent = node.label.substring(0, 10)
      svg.appendChild(text)
    }
  })
}

// Helper functions
const getDensityLabel = (density) => {
  if (!density) return 'ไม่ทราบ'
  if (density < 0.2) return 'บางเบา'
  if (density < 0.5) return 'ปานกลาง'
  return 'หนาแน่น'
}

const getComplexityLabel = (complexity) => {
  if (!complexity) return 'ไม่ทราบ'
  if (complexity < 0.3) return 'ง่าย'
  if (complexity < 0.6) return 'ปานกลาง'
  return 'ซับซ้อน'
}

const getStrongestDimension = () => {
  if (!mentalModel.value?.dimensionModels) return 'N/A'
  
  const models = mentalModel.value.dimensionModels
  let strongest = null
  let maxScore = -1
  
  for (const [dim, model] of Object.entries(models)) {
    const score = model.currentLevel || model.averageRichness || 0
    if (score > maxScore) {
      maxScore = score
      strongest = dim
    }
  }
  
  return getDimensionLabel(strongest)
}

const isStrongDimension = (dim) => {
  if (!mentalModel.value?.dimensionModels) return false
  const model = mentalModel.value.dimensionModels[dim]
  return model && (model.currentLevel === 'advanced' || model.growth > 0)
}

const getDimensionProgress = (dim) => {
  if (!mentalModel.value?.dimensionModels) return 0
  const model = mentalModel.value.dimensionModels[dim]
  if (!model) return 0
  
  const levels = { none: 0, basic: 33, intermediate: 66, advanced: 100 }
  return levels[model.currentLevel] || 0
}

const getDimensionLevel = (dim) => {
  if (!mentalModel.value?.dimensionModels) return 'ไม่ทราบ'
  const model = mentalModel.value.dimensionModels[dim]
  if (!model) return 'ไม่ทราบ'
  
  const labels = { none: 'ไม่พบ', basic: 'พื้นฐาน', intermediate: 'ปานกลาง', advanced: 'ก้าวหน้า' }
  return labels[model.currentLevel] || 'ไม่ทราบ'
}

const getDimensionKeywords = (dim) => {
  if (!mentalModel.value?.dimensionModels) return []
  const model = mentalModel.value.dimensionModels[dim]
  return model?.topKeywords?.slice(0, 5) || []
}

const getDimensionInsight = (dim) => {
  if (!mentalModel.value?.dimensionModels) return ''
  const model = mentalModel.value.dimensionModels[dim]
  return model?.insight || ''
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

const getChangeIcon = (type) => {
  const icons = {
    'BELIEF_REVISION': '🔄',
    'MENTAL_MODEL_TRANSFORMATION': '🧠',
    'CATEGORICAL_SHIFT': '📁',
    'KNOWLEDGE_ENRICHMENT': '📚'
  }
  return icons[type] || '🔄'
}

const getChangeTypeName = (type) => {
  const names = {
    'BELIEF_REVISION': 'การปรับความเชื่อ',
    'MENTAL_MODEL_TRANSFORMATION': 'การเปลี่ยนรูปแบบความคิด',
    'CATEGORICAL_SHIFT': 'การเปลี่ยนหมวดหมู่',
    'KNOWLEDGE_ENRICHMENT': 'การเสริมความรู้'
  }
  return names[type] || type
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

const refreshData = () => {
  loadMentalModel()
}

const exportData = () => {
  if (!mentalModel.value) return
  
  const data = JSON.stringify(mentalModel.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mental_model_${studentId.value}_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Lifecycle
onMounted(async () => {
  if (isTeacher.value) {
    await loadStudents()
  } else {
    await loadMentalModel()
  }
})

watch(selectedStudentId, () => {
  if (selectedStudentId.value) {
    loadMentalModel()
  }
})
</script>

<style scoped>
.mental-model-view {
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
  gap: 0.75rem;
}

.card {
  background: var(--card-bg, #fff);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.student-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.student-selector select {
  flex: 1;
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

/* Loading & Empty States */
.loading-state,
.no-data-state {
  text-align: center;
  padding: 4rem 2rem;
}

.loading-state .spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--card-bg, #fff);
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.overview-card.highlight {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
}

.card-icon {
  font-size: 2rem;
}

.card-content h3 {
  font-size: 0.875rem;
  margin: 0;
  opacity: 0.8;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.card-content small {
  font-size: 0.75rem;
  opacity: 0.7;
}

/* Network Section */
.network-section h2 {
  margin: 0 0 1rem;
  font-size: 1.25rem;
}

.network-container {
  display: flex;
  gap: 1rem;
}

.network-graph {
  flex: 1;
  background: #f9fafb;
  border-radius: 8px;
  overflow: hidden;
}

.network-legend {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-dot.analysis { background: #3b82f6; }
.legend-dot.reasoning { background: #8b5cf6; }
.legend-dot.creativity { background: #f59e0b; }
.legend-dot.evidence { background: #10b981; }

.network-stats {
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.network-stats .stat {
  display: flex;
  flex-direction: column;
}

.network-stats .stat label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.network-stats .stat span {
  font-weight: 600;
}

/* Changes Timeline */
.changes-timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.change-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 4px solid var(--border-color);
}

.change-item.belief_revision { border-left-color: #3b82f6; }
.change-item.mental_model_transformation { border-left-color: #8b5cf6; }
.change-item.categorical_shift { border-left-color: #f59e0b; }
.change-item.knowledge_enrichment { border-left-color: #10b981; }

.change-icon {
  font-size: 1.5rem;
}

.change-header {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.change-type {
  font-weight: 600;
}

.change-dim {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.change-description {
  margin: 0 0 0.5rem;
}

.change-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.no-changes {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

/* Dimension Models */
.dimension-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.dimension-model {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1.25rem;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.dimension-model.strong {
  border-color: var(--primary-color);
  background: rgba(59, 130, 246, 0.05);
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

.dim-progress {
  margin-bottom: 1rem;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-fill.analysis { background: #3b82f6; }
.progress-fill.reasoning { background: #8b5cf6; }
.progress-fill.creativity { background: #f59e0b; }
.progress-fill.evidence { background: #10b981; }

.progress-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.dim-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.keyword-tag {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: #e5e7eb;
  border-radius: 4px;
}

.dim-insight {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Misconceptions */
.misconception-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.misconception-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #fef3c7;
  border-radius: 8px;
}

.misconception-item.resolved {
  background: #d1fae5;
}

.misc-icon {
  font-size: 1.25rem;
}

.misc-description {
  margin: 0 0 0.5rem;
}

.misc-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
}

.misc-dim {
  font-weight: 500;
}

.misc-status {
  color: var(--text-secondary);
}

/* Narrative */
.narrative-content {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.narrative-text {
  line-height: 1.7;
  white-space: pre-line;
}

.narrative-placeholder {
  color: var(--text-secondary);
  text-align: center;
  padding: 2rem;
}

.synthesis-details h4 {
  margin: 0 0 0.5rem;
}

.synthesis-details ul {
  margin: 0;
  padding-left: 1.5rem;
}

.synthesis-details li {
  margin-bottom: 0.5rem;
}

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color, #3b82f6);
  color: white;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Dark mode */
.dark-mode .card,
.dark-mode .overview-card {
  background: var(--card-bg-dark, #1f2937);
}

.dark-mode .network-graph,
.dark-mode .dimension-model,
.dark-mode .change-item,
.dark-mode .narrative-content {
  background: rgba(255, 255, 255, 0.05);
}

.dark-mode .misconception-item {
  background: rgba(251, 191, 36, 0.2);
}

.dark-mode .misconception-item.resolved {
  background: rgba(16, 185, 129, 0.2);
}
</style>
