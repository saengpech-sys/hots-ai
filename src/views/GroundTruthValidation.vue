<template>
  <div class="ground-truth-validation">
    <div class="page-header">
      <h1>🎯 Ground Truth Validation</h1>
      <p class="subtitle">Expert Calibration for AI Assessment Quality</p>
    </div>

    <!-- Stats Overview -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalAssessments }}</div>
        <div class="stat-label">Total Assessments</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.calibrated }}</div>
        <div class="stat-label">Expert Calibrated</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.pendingReview }}</div>
        <div class="stat-label">Pending Review</div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-value">{{ stats.agreementRate }}%</div>
        <div class="stat-label">Agreement Rate</div>
      </div>
    </div>

    <!-- Filter Controls -->
    <div class="filter-bar">
      <select v-model="filters.course" @change="fetchAssessments">
        <option value="">All Courses</option>
        <option v-for="course in courses" :key="course.id" :value="course.id">
          {{ course.name }}
        </option>
      </select>
      <select v-model="filters.status">
        <option value="all">All Status</option>
        <option value="pending">Pending Review</option>
        <option value="calibrated">Calibrated</option>
        <option value="disputed">Disputed</option>
      </select>
      <button class="btn btn-primary" @click="fetchRandomSample">
        🎲 Random Sample (20)
      </button>
    </div>

    <!-- Assessment List -->
    <div class="assessment-list">
      <div 
        v-for="assessment in filteredAssessments" 
        :key="assessment.id"
        class="assessment-card"
        :class="{ 'is-calibrated': assessment.expertScores }"
      >
        <div class="assessment-header">
          <span class="assessment-id">#{{ assessment.id.slice(0, 8) }}</span>
          <span class="assessment-date">{{ formatDate(assessment.createdAt) }}</span>
          <span 
            class="status-badge"
            :class="getStatusClass(assessment)"
          >
            {{ getStatusLabel(assessment) }}
          </span>
        </div>

        <div class="question-box">
          <label>Question:</label>
          <p>{{ assessment.question }}</p>
        </div>

        <div class="answer-box">
          <label>Student Answer:</label>
          <p>{{ assessment.studentAnswer }}</p>
        </div>

        <div class="scores-comparison">
          <!-- AI Scores -->
          <div class="score-column ai-scores">
            <h4>🤖 AI Assessment</h4>
            <div class="score-grid">
              <div v-for="dim in dimensions" :key="dim.key" class="score-item">
                <span class="dim-label">{{ dim.label }}</span>
                <span class="dim-score">{{ assessment.rubricScores?.[dim.key] || 0 }}/5</span>
              </div>
            </div>
            <div class="total-score">
              Total: {{ calculateTotal(assessment.rubricScores) }}/20
            </div>
          </div>

          <!-- Expert Scores -->
          <div class="score-column expert-scores">
            <h4>👩‍🏫 Expert Calibration</h4>
            <div v-if="assessment.expertScores" class="score-grid">
              <div v-for="dim in dimensions" :key="dim.key" class="score-item">
                <span class="dim-label">{{ dim.label }}</span>
                <span class="dim-score">{{ assessment.expertScores[dim.key] }}/5</span>
              </div>
            </div>
            <div v-else class="calibration-form">
              <div v-for="dim in dimensions" :key="dim.key" class="form-row">
                <label>{{ dim.label }}:</label>
                <select v-model="calibrationInput[assessment.id][dim.key]">
                  <option v-for="n in 6" :key="n-1" :value="n-1">{{ n-1 }}</option>
                </select>
              </div>
              <textarea 
                v-model="calibrationInput[assessment.id].notes"
                placeholder="Expert notes (optional)"
                rows="2"
              ></textarea>
              <button 
                class="btn btn-success" 
                @click="submitCalibration(assessment)"
              >
                ✓ Submit Calibration
              </button>
            </div>
          </div>
        </div>

        <!-- Discrepancy Alert -->
        <div 
          v-if="assessment.expertScores && hasDiscrepancy(assessment)"
          class="discrepancy-alert"
        >
          ⚠️ Significant discrepancy detected! 
          Difference: {{ calculateDiscrepancy(assessment) }} points
        </div>

        <!-- Actions -->
        <div class="assessment-actions">
          <button 
            v-if="assessment.expertScores" 
            class="btn btn-outline"
            @click="toggleDetails(assessment.id)"
          >
            {{ showDetails[assessment.id] ? 'Hide' : 'Show' }} Details
          </button>
          <button 
            v-if="hasDiscrepancy(assessment)"
            class="btn btn-warning"
            @click="flagForReview(assessment)"
          >
            🚩 Flag for Review
          </button>
        </div>

        <!-- Expanded Details -->
        <div v-if="showDetails[assessment.id]" class="details-panel">
          <div class="detail-row">
            <span>AI Feedback:</span>
            <p>{{ assessment.feedback }}</p>
          </div>
          <div v-if="assessment.expertNotes" class="detail-row">
            <span>Expert Notes:</span>
            <p>{{ assessment.expertNotes }}</p>
          </div>
          <div class="detail-row">
            <span>Confidence:</span>
            <p>{{ (assessment.confidence * 100).toFixed(0) }}%</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="pagination">
      <button :disabled="page === 1" @click="page--">Previous</button>
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="page++">Next</button>
    </div>

    <!-- Export Section -->
    <div class="export-section">
      <h3>📤 Export Ground Truth Dataset</h3>
      <div class="export-options">
        <button class="btn btn-primary" @click="exportCSV">
          Export CSV (for SPSS/R)
        </button>
        <button class="btn btn-secondary" @click="exportJSON">
          Export JSON (for ML Training)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const dimensions = [
  { key: 'analysis', label: 'Analysis' },
  { key: 'reasoning', label: 'Reasoning' },
  { key: 'creativity', label: 'Creativity' },
  { key: 'evidence', label: 'Evidence' }
]

const stats = ref({
  totalAssessments: 0,
  calibrated: 0,
  pendingReview: 0,
  agreementRate: 0
})

const courses = ref([])
const assessments = ref([])
const filters = reactive({
  course: '',
  status: 'all'
})
const page = ref(1)
const pageSize = 10
const showDetails = ref({})
const calibrationInput = ref({})
const loading = ref(false)

const filteredAssessments = computed(() => {
  let result = assessments.value
  
  if (filters.status === 'pending') {
    result = result.filter(a => !a.expertScores)
  } else if (filters.status === 'calibrated') {
    result = result.filter(a => a.expertScores)
  } else if (filters.status === 'disputed') {
    result = result.filter(a => a.expertScores && hasDiscrepancy(a))
  }
  
  const start = (page.value - 1) * pageSize
  return result.slice(start, start + pageSize)
})

const totalPages = computed(() => 
  Math.ceil(assessments.value.length / pageSize)
)

onMounted(async () => {
  await fetchCourses()
  await fetchAssessments()
  await fetchStats()
})

async function fetchCourses() {
  try {
    const q = query(
      collection(db, 'courses'),
      where('teacherId', '==', authStore.user.uid)
    )
    const snapshot = await getDocs(q)
    courses.value = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (error) {
    console.error('Error fetching courses:', error)
  }
}

async function fetchAssessments() {
  loading.value = true
  try {
    let q = query(
      collection(db, 'assessments'),
      orderBy('createdAt', 'desc'),
      limit(100)
    )

    if (filters.course) {
      q = query(
        collection(db, 'assessments'),
        where('courseId', '==', filters.course),
        orderBy('createdAt', 'desc'),
        limit(100)
      )
    }

    const snapshot = await getDocs(q)
    assessments.value = snapshot.docs.map(d => {
      const data = { id: d.id, ...d.data() }
      // Initialize calibration input
      if (!calibrationInput.value[d.id]) {
        calibrationInput.value[d.id] = {
          analysis: 0,
          reasoning: 0,
          creativity: 0,
          evidence: 0,
          notes: ''
        }
      }
      return data
    })
  } catch (error) {
    console.error('Error fetching assessments:', error)
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const calibratedQuery = query(
      collection(db, 'assessments'),
      where('expertScores', '!=', null),
      limit(1000)
    )
    // Note: This requires a composite index
    
    // Calculate stats from loaded assessments
    const total = assessments.value.length
    const calibrated = assessments.value.filter(a => a.expertScores).length
    
    let agreementSum = 0
    let agreementCount = 0
    
    assessments.value.forEach(a => {
      if (a.expertScores && a.rubricScores) {
        const aiTotal = calculateTotal(a.rubricScores)
        const expertTotal = calculateTotal(a.expertScores)
        const diff = Math.abs(aiTotal - expertTotal)
        agreementSum += (20 - diff) / 20
        agreementCount++
      }
    })
    
    stats.value = {
      totalAssessments: total,
      calibrated,
      pendingReview: total - calibrated,
      agreementRate: agreementCount > 0 
        ? (agreementSum / agreementCount * 100).toFixed(1)
        : 0
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
  }
}

async function fetchRandomSample() {
  loading.value = true
  try {
    const q = query(
      collection(db, 'assessments'),
      where('expertScores', '==', null),
      limit(100)
    )
    const snapshot = await getDocs(q)
    const allPending = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    
    // Random shuffle and take 20
    assessments.value = allPending
      .sort(() => Math.random() - 0.5)
      .slice(0, 20)
    
    // Initialize calibration inputs
    assessments.value.forEach(a => {
      if (!calibrationInput.value[a.id]) {
        calibrationInput.value[a.id] = {
          analysis: 0,
          reasoning: 0,
          creativity: 0,
          evidence: 0,
          notes: ''
        }
      }
    })
    
    page.value = 1
  } catch (error) {
    console.error('Error fetching random sample:', error)
  } finally {
    loading.value = false
  }
}

async function submitCalibration(assessment) {
  const input = calibrationInput.value[assessment.id]
  
  try {
    await updateDoc(doc(db, 'assessments', assessment.id), {
      expertScores: {
        analysis: parseInt(input.analysis),
        reasoning: parseInt(input.reasoning),
        creativity: parseInt(input.creativity),
        evidence: parseInt(input.evidence)
      },
      expertNotes: input.notes,
      calibratedBy: authStore.user.uid,
      calibratedAt: serverTimestamp()
    })
    
    // Update local state
    assessment.expertScores = {
      analysis: parseInt(input.analysis),
      reasoning: parseInt(input.reasoning),
      creativity: parseInt(input.creativity),
      evidence: parseInt(input.evidence)
    }
    assessment.expertNotes = input.notes
    
    await fetchStats()
    
    alert('Calibration saved successfully!')
  } catch (error) {
    console.error('Error saving calibration:', error)
    alert('Error saving calibration')
  }
}

async function flagForReview(assessment) {
  try {
    await updateDoc(doc(db, 'assessments', assessment.id), {
      flaggedForReview: true,
      flaggedAt: serverTimestamp(),
      flaggedBy: authStore.user.uid
    })
    alert('Assessment flagged for review')
  } catch (error) {
    console.error('Error flagging assessment:', error)
  }
}

function calculateTotal(scores) {
  if (!scores) return 0
  return Object.values(scores).reduce((sum, s) => sum + (s || 0), 0)
}

function hasDiscrepancy(assessment) {
  if (!assessment.expertScores || !assessment.rubricScores) return false
  return calculateDiscrepancy(assessment) >= 4
}

function calculateDiscrepancy(assessment) {
  if (!assessment.expertScores || !assessment.rubricScores) return 0
  const aiTotal = calculateTotal(assessment.rubricScores)
  const expertTotal = calculateTotal(assessment.expertScores)
  return Math.abs(aiTotal - expertTotal)
}

function toggleDetails(id) {
  showDetails.value[id] = !showDetails.value[id]
}

function getStatusClass(assessment) {
  if (!assessment.expertScores) return 'status-pending'
  if (hasDiscrepancy(assessment)) return 'status-disputed'
  return 'status-calibrated'
}

function getStatusLabel(assessment) {
  if (!assessment.expertScores) return 'Pending'
  if (hasDiscrepancy(assessment)) return 'Disputed'
  return 'Calibrated'
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function exportCSV() {
  const headers = [
    'assessment_id',
    'question',
    'student_answer',
    'ai_analysis',
    'ai_reasoning',
    'ai_creativity',
    'ai_evidence',
    'ai_total',
    'expert_analysis',
    'expert_reasoning',
    'expert_creativity',
    'expert_evidence',
    'expert_total',
    'discrepancy',
    'calibrated_date'
  ]
  
  const rows = assessments.value
    .filter(a => a.expertScores)
    .map(a => [
      a.id,
      `"${(a.question || '').replace(/"/g, '""')}"`,
      `"${(a.studentAnswer || '').replace(/"/g, '""')}"`,
      a.rubricScores?.analysis || 0,
      a.rubricScores?.reasoning || 0,
      a.rubricScores?.creativity || 0,
      a.rubricScores?.evidence || 0,
      calculateTotal(a.rubricScores),
      a.expertScores?.analysis || 0,
      a.expertScores?.reasoning || 0,
      a.expertScores?.creativity || 0,
      a.expertScores?.evidence || 0,
      calculateTotal(a.expertScores),
      calculateDiscrepancy(a),
      formatDate(a.calibratedAt)
    ])
  
  const BOM = '\uFEFF'
  const csvContent = BOM + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ground_truth_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

function exportJSON() {
  const data = assessments.value
    .filter(a => a.expertScores)
    .map(a => ({
      id: a.id,
      question: a.question,
      studentAnswer: a.studentAnswer,
      aiScores: a.rubricScores,
      expertScores: a.expertScores,
      feedback: a.feedback,
      confidence: a.confidence,
      calibratedAt: a.calibratedAt
    }))
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ground_truth_${new Date().toISOString().split('T')[0]}.json`
  link.click()
}
</script>

<style scoped>
.ground-truth-validation {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  color: var(--primary-color);
}

.subtitle {
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-card.highlight {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: white;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.8;
  margin-top: 0.5rem;
}

.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.filter-bar select {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  min-width: 150px;
}

.assessment-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.assessment-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-left: 4px solid var(--border-color);
}

.assessment-card.is-calibrated {
  border-left-color: var(--success-color);
}

.assessment-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.assessment-id {
  font-family: monospace;
  background: var(--bg-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.assessment-date {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: auto;
}

.status-pending {
  background: var(--warning-bg);
  color: var(--warning-color);
}

.status-calibrated {
  background: var(--success-bg);
  color: var(--success-color);
}

.status-disputed {
  background: var(--error-bg);
  color: var(--error-color);
}

.question-box,
.answer-box {
  margin-bottom: 1rem;
}

.question-box label,
.answer-box label {
  font-weight: 600;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 0.5rem;
}

.question-box p,
.answer-box p {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  margin: 0;
  line-height: 1.6;
}

.scores-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin: 1.5rem 0;
}

.score-column {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
}

.score-column h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
}

.score-grid {
  display: grid;
  gap: 0.5rem;
}

.score-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: var(--card-bg);
  border-radius: 4px;
}

.dim-label {
  font-weight: 500;
}

.dim-score {
  font-weight: 600;
  color: var(--primary-color);
}

.total-score {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  font-weight: 600;
  text-align: right;
}

.calibration-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-row select {
  width: 80px;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.calibration-form textarea {
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  resize: vertical;
}

.discrepancy-alert {
  background: var(--error-bg);
  color: var(--error-color);
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  font-weight: 500;
}

.assessment-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.details-panel {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--border-color);
}

.detail-row {
  margin-bottom: 1rem;
}

.detail-row span {
  font-weight: 600;
  display: block;
  margin-bottom: 0.25rem;
}

.detail-row p {
  margin: 0;
  color: var(--text-secondary);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin: 2rem 0;
}

.export-section {
  background: var(--card-bg);
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  margin-top: 2rem;
}

.export-section h3 {
  margin-bottom: 1rem;
}

.export-options {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-success {
  background: var(--success-color);
  color: white;
}

.btn-warning {
  background: var(--warning-color);
  color: white;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .scores-comparison {
    grid-template-columns: 1fr;
  }
  
  .export-options {
    flex-direction: column;
  }
}
</style>
