<template>
  <div class="ground-truth-validation">
    <!-- Hero Header with Glassmorphism -->
    <div class="hero-header">
      <div class="hero-bg">
        <div class="hero-orb orb-1"></div>
        <div class="hero-orb orb-2"></div>
        <div class="hero-orb orb-3"></div>
      </div>
      <div class="hero-content">
        <div class="hero-icon">🎯</div>
        <h1>Ground Truth Validation</h1>
        <p class="subtitle">Expert Calibration for AI Assessment Quality</p>
      </div>
    </div>

    <!-- Stats Overview - Premium Cards -->
    <div class="stats-grid">
      <div class="stat-card glass">
        <div class="stat-icon">📊</div>
        <div class="stat-value">{{ stats.totalAssessments }}</div>
        <div class="stat-label">Total Assessments</div>
        <div class="stat-glow blue"></div>
      </div>
      <div class="stat-card glass">
        <div class="stat-icon">✅</div>
        <div class="stat-value">{{ stats.calibrated }}</div>
        <div class="stat-label">Expert Calibrated</div>
        <div class="stat-glow green"></div>
      </div>
      <div class="stat-card glass">
        <div class="stat-icon">⏳</div>
        <div class="stat-value">{{ stats.pendingReview }}</div>
        <div class="stat-label">Pending Review</div>
        <div class="stat-glow orange"></div>
      </div>
      <div class="stat-card glass highlight">
        <div class="stat-icon">🎯</div>
        <div class="stat-value">{{ stats.agreementRate }}%</div>
        <div class="stat-label">Agreement Rate</div>
        <div class="stat-glow purple"></div>
      </div>
    </div>

    <!-- Filter Controls - Modern Style -->
    <div class="filter-section glass">
      <div class="filter-group">
        <label class="filter-label">
          <span class="material-icons">school</span>
          Course
        </label>
        <div class="select-wrapper">
          <select v-model="filters.course" @change="fetchAssessments" class="modern-select">
            <option value="">All Courses</option>
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.courseCode || '' }} {{ course.courseName || course.name }}
            </option>
          </select>
          <span class="select-arrow material-icons">expand_more</span>
        </div>
      </div>
      
      <div class="filter-group">
        <label class="filter-label">
          <span class="material-icons">filter_list</span>
          Status
        </label>
        <div class="select-wrapper">
          <select v-model="filters.status" class="modern-select">
            <option value="all">All Status</option>
            <option value="pending">Pending Review</option>
            <option value="calibrated">Calibrated</option>
            <option value="disputed">Disputed</option>
          </select>
          <span class="select-arrow material-icons">expand_more</span>
        </div>
      </div>
      
      <button class="btn btn-ai" @click="fetchRandomSample">
        <span class="material-icons">casino</span>
        Random Sample (20)
      </button>
    </div>

    <!-- Assessment List -->
    <div class="assessment-list">
      <div 
        v-for="assessment in filteredAssessments" 
        :key="assessment.id"
        class="assessment-card glass"
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
          <label>📝 Question:</label>
          <p>{{ getQuestionText(assessment) || 'ไม่มีข้อมูลคำถาม' }}</p>
        </div>

        <div class="answer-box">
          <label>💬 Student Answer:</label>
          <p>{{ assessment.rawAnswer || assessment.studentAnswer || assessment.answer || 'ไม่มีข้อความ' }}</p>
        </div>

        <!-- Additional Metadata -->
        <div v-if="assessment.courseId || assessment.studentId" class="metadata-row">
          <span v-if="assessment.courseId" class="meta-tag course">
            <span class="material-icons">school</span>
            {{ getCourseName(assessment.courseId) }}
          </span>
          <span v-if="assessment.studentData?.grade" class="meta-tag grade">
            <span class="material-icons">person</span>
            {{ assessment.studentData.grade }}
          </span>
          <span v-if="assessment.aiConfidence" class="meta-tag confidence">
            <span class="material-icons">psychology</span>
            AI Confidence: {{ (assessment.aiConfidence * 100).toFixed(0) }}%
          </span>
        </div>

        <div class="scores-comparison">
          <!-- AI Scores -->
          <div class="score-column ai-scores">
            <h4>🤖 AI Assessment</h4>
            <div class="score-grid">
              <div v-for="dim in dimensions" :key="dim.key" class="score-item">
                <span class="dim-label">{{ dim.label }}</span>
                <div class="score-bar">
                  <div class="score-fill" :style="{ width: (assessment.rubricScores?.[dim.key] || 0) * 20 + '%' }"></div>
                </div>
                <span class="dim-score">{{ assessment.rubricScores?.[dim.key] || 0 }}/5</span>
              </div>
            </div>
            <div class="total-score">
              <span>Total:</span>
              <span class="total-value">{{ calculateTotal(assessment.rubricScores) }}/20</span>
            </div>
          </div>

          <!-- Expert Scores -->
          <div class="score-column expert-scores">
            <h4>👩‍🏫 Expert Calibration</h4>
            <div v-if="assessment.expertScores" class="score-grid">
              <div v-for="dim in dimensions" :key="dim.key" class="score-item">
                <span class="dim-label">{{ dim.label }}</span>
                <div class="score-bar expert">
                  <div class="score-fill" :style="{ width: assessment.expertScores[dim.key] * 20 + '%' }"></div>
                </div>
                <span class="dim-score">{{ assessment.expertScores[dim.key] }}/5</span>
              </div>
            </div>
            <div v-else class="calibration-form">
              <div v-for="dim in dimensions" :key="dim.key" class="form-row">
                <label>{{ dim.label }}:</label>
                <div class="score-selector">
                  <button 
                    v-for="n in 6" 
                    :key="n-1"
                    :class="['score-btn', { active: calibrationInput[assessment.id]?.[dim.key] === n-1 }]"
                    @click="setScore(assessment.id, dim.key, n-1)"
                  >
                    {{ n-1 }}
                  </button>
                </div>
              </div>
              <textarea 
                v-model="calibrationInput[assessment.id].notes"
                placeholder="Expert notes (optional)"
                rows="2"
                class="modern-textarea"
              ></textarea>
              <button 
                class="btn btn-success" 
                @click="submitCalibration(assessment)"
              >
                <span class="material-icons">check_circle</span>
                Submit Calibration
              </button>
            </div>
          </div>
        </div>

        <!-- Discrepancy Alert -->
        <div 
          v-if="assessment.expertScores && hasDiscrepancy(assessment)"
          class="discrepancy-alert"
        >
          <span class="material-icons">warning</span>
          Significant discrepancy detected! Difference: {{ calculateDiscrepancy(assessment) }} points
        </div>

        <!-- Actions -->
        <div class="assessment-actions">
          <button 
            v-if="assessment.expertScores" 
            class="btn btn-outline"
            @click="toggleDetails(assessment.id)"
          >
            <span class="material-icons">{{ showDetails[assessment.id] ? 'visibility_off' : 'visibility' }}</span>
            {{ showDetails[assessment.id] ? 'Hide' : 'Show' }} Details
          </button>
          <button 
            v-if="hasDiscrepancy(assessment)"
            class="btn btn-warning"
            @click="flagForReview(assessment)"
          >
            <span class="material-icons">flag</span>
            Flag for Review
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

function setScore(assessmentId, dimension, score) {
  if (!calibrationInput.value[assessmentId]) {
    calibrationInput.value[assessmentId] = {
      analysis: 0,
      reasoning: 0,
      creativity: 0,
      evidence: 0,
      notes: ''
    }
  }
  calibrationInput.value[assessmentId][dimension] = score
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

// Helper: Get question text from multiple possible sources
function getQuestionText(assessment) {
  // Priority: questionData.question > questionContext > questionText > question
  if (assessment.questionData?.question) {
    return assessment.questionData.question
  }
  if (assessment.questionContext && assessment.questionContext !== 'General HOTS Assessment') {
    return assessment.questionContext
  }
  if (assessment.questionText) {
    return assessment.questionText
  }
  if (assessment.question) {
    return assessment.question
  }
  return null
}

// Helper: Get course name by ID
function getCourseName(courseId) {
  const course = courses.value.find(c => c.id === courseId)
  if (course) {
    return course.courseCode ? `${course.courseCode} ${course.courseName}` : course.courseName
  }
  return courseId?.slice(0, 8) || 'ไม่ระบุ'
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
/* ============================================
   Ground Truth Validation - Premium Modern UI
   ============================================ */

.ground-truth-validation {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
  padding: 0;
  color: #fff;
}

/* Hero Header */
.hero-header {
  position: relative;
  padding: 3rem 2rem 2rem;
  text-align: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.hero-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.4;
  animation: float 8s ease-in-out infinite;
}

.hero-orb.orb-1 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  top: -100px;
  left: -50px;
}

.hero-orb.orb-2 {
  width: 250px;
  height: 250px;
  background: linear-gradient(135deg, #f093fb, #f5576c);
  top: -50px;
  right: -50px;
  animation-delay: -2s;
}

.hero-orb.orb-3 {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #4facfe, #00f2fe);
  bottom: -50px;
  left: 50%;
  animation-delay: -4s;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.05); }
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.hero-header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.1rem;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  padding: 0 2rem;
  margin-bottom: 2rem;
}

.stat-card.glass {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 1.5rem;
  text-align: center;
  overflow: hidden;
  transition: all 0.3s ease;
}

.stat-card.glass:hover {
  transform: translateY(-5px);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.stat-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.25rem;
}

.stat-glow {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 3px;
  border-radius: 3px;
}

.stat-glow.blue { background: linear-gradient(90deg, transparent, #4facfe, transparent); }
.stat-glow.green { background: linear-gradient(90deg, transparent, #00f5a0, transparent); }
.stat-glow.orange { background: linear-gradient(90deg, transparent, #f5af19, transparent); }
.stat-glow.purple { background: linear-gradient(90deg, transparent, #a855f7, transparent); }

.stat-card.highlight {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.2));
  border-color: rgba(139, 92, 246, 0.4);
}

/* Filter Section */
.filter-section.glass {
  display: flex;
  align-items: flex-end;
  gap: 1.5rem;
  padding: 1.5rem 2rem;
  margin: 0 2rem 2rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-width: 180px;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

.filter-label .material-icons {
  font-size: 1rem;
}

.select-wrapper {
  position: relative;
}

.modern-select {
  width: 100%;
  padding: 0.875rem 2.5rem 0.875rem 1rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
  appearance: none;
  transition: all 0.2s;
}

.modern-select:hover {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.12);
}

.modern-select:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
}

.modern-select option {
  background: #1a1a2e;
  color: #fff;
  padding: 0.75rem;
}

.select-arrow {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.5);
  pointer-events: none;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
  transition: all 0.3s ease;
}

.btn-ai {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: white;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
}

.btn-ai:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(139, 92, 246, 0.5);
}

.btn-success {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.btn-warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.btn-outline {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Assessment List */
.assessment-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0 2rem;
}

.assessment-card.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 1.5rem;
  border-left: 4px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.assessment-card.glass:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.assessment-card.is-calibrated {
  border-left-color: #10b981;
}

.assessment-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.assessment-id {
  font-family: 'Monaco', 'Menlo', monospace;
  background: rgba(139, 92, 246, 0.2);
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #a78bfa;
}

.assessment-date {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
}

.status-badge {
  padding: 0.35rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: auto;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-pending {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.status-calibrated {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.status-disputed {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

/* Question & Answer Boxes */
.question-box,
.answer-box {
  margin-bottom: 1.25rem;
}

.question-box label,
.answer-box label {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
}

.question-box p,
.answer-box p {
  background: rgba(255, 255, 255, 0.05);
  padding: 1.25rem;
  border-radius: 12px;
  margin: 0;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Metadata Row */
.metadata-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 1rem 0;
  padding: 0.75rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
}

.meta-tag .material-icons {
  font-size: 1rem;
}

.meta-tag.course {
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
}

.meta-tag.grade {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.meta-tag.confidence {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

/* Scores Comparison */
.scores-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin: 1.5rem 0;
}

.score-column {
  background: rgba(255, 255, 255, 0.03);
  padding: 1.25rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.score-column h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
}

.ai-scores {
  border-left: 3px solid #3b82f6;
}

.expert-scores {
  border-left: 3px solid #10b981;
}

.score-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
}

.dim-label {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  width: 80px;
  flex-shrink: 0;
}

.score-bar {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.score-bar .score-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.score-bar.expert .score-fill {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.dim-score {
  font-weight: 700;
  color: #a78bfa;
  min-width: 40px;
  text-align: right;
}

.total-score {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: rgba(255, 255, 255, 0.7);
}

.total-value {
  font-size: 1.25rem;
  font-weight: 800;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Calibration Form */
.calibration-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.form-row label {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.score-selector {
  display: flex;
  gap: 0.5rem;
}

.score-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.score-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.score-btn.active {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
}

.modern-textarea {
  width: 100%;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: #fff;
  font-size: 0.95rem;
  resize: vertical;
  min-height: 80px;
}

.modern-textarea:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
}

.modern-textarea::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

/* Discrepancy Alert */
.discrepancy-alert {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  margin-top: 1rem;
  font-weight: 500;
}

.discrepancy-alert .material-icons {
  font-size: 1.25rem;
}

/* Assessment Actions */
.assessment-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-wrap: wrap;
}

/* Details Panel */
.details-panel {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
}

.detail-row {
  margin-bottom: 1rem;
}

.detail-row span {
  font-weight: 600;
  display: block;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
}

.detail-row p {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin: 2rem 0;
  padding: 0 2rem;
}

.pagination button {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination span {
  color: rgba(255, 255, 255, 0.6);
}

/* Export Section */
.export-section {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2rem;
  border-radius: 20px;
  text-align: center;
  margin: 2rem;
}

.export-section h3 {
  margin-bottom: 1rem;
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.9);
}

.export-options {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
    padding: 0 1rem;
  }
  
  .filter-section.glass {
    margin: 0 1rem 2rem;
    padding: 1rem;
  }
  
  .filter-group {
    min-width: 100%;
  }
  
  .scores-comparison {
    grid-template-columns: 1fr;
  }
  
  .assessment-list {
    padding: 0 1rem;
  }
  
  .export-section {
    margin: 2rem 1rem;
  }
  
  .export-options {
    flex-direction: column;
  }

  .hero-header h1 {
    font-size: 1.75rem;
  }
}
</style>

