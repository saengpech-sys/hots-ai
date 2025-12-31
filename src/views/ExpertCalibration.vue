<template>
  <div class="expert-calibration-container">
    <nav class="navbar card">
      <div class="nav-left">
        <button @click="goBack" class="btn btn-secondary">← กลับ</button>
        <h1>🎯 Expert Calibration Mode</h1>
      </div>
      <div class="nav-right">
        <button @click="showIRRReport = true" class="btn btn-irr-report">
          <span class="irr-icon">📊</span>
          <span class="irr-text">IRR Report</span>
          <span class="irr-badge" v-if="completedCount > 0">{{ completedCount }}</span>
        </button>
        <span class="badge">{{ authStore.user?.displayName || 'ผู้เชี่ยวชาญ' }}</span>
      </div>
    </nav>

    <div v-if="loading" class="loading-state">
      <LoadingSpinner />
      <p>กำลังโหลดข้อมูลการประเมิน...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <ErrorMessage :message="error" />
      <button @click="loadData" class="btn btn-primary">ลองใหม่</button>
    </div>

    <div v-else class="calibration-content">
      <!-- Stats Overview -->
      <div class="stats-grid">
        <div class="stat-card">
          <h3>รอการตรวจสอบ</h3>
          <div class="stat-value">{{ pendingCount }}</div>
        </div>
        <div class="stat-card">
          <h3>ตรวจสอบแล้ว</h3>
          <div class="stat-value">{{ completedCount }}</div>
        </div>
        <div class="stat-card">
          <h3>AI Agreement</h3>
          <div class="stat-value highlight">{{ agreementRate }}%</div>
          <div class="stat-desc">ความสอดคล้องกับ AI</div>
        </div>
        <div class="stat-card irr-card" :class="irrClass">
          <h3>Cohen's Kappa</h3>
          <div class="stat-value">{{ irrStats.kappa?.toFixed(3) || 'N/A' }}</div>
          <div class="stat-desc">{{ irrStats.interpretation || 'ต้องมี ≥5 รายการ' }}</div>
        </div>
      </div>

      <!-- IRR Details Panel (collapsible) -->
      <div v-if="irrStats.kappa !== null && completedCount >= 5" class="irr-details-panel card">
        <div class="irr-header" @click="showIRRDetails = !showIRRDetails">
          <h3>📊 รายละเอียด Inter-Rater Reliability</h3>
          <span class="toggle-icon">{{ showIRRDetails ? '▼' : '▶' }}</span>
        </div>
        <div v-if="showIRRDetails" class="irr-content">
          <div class="irr-metrics">
            <div class="irr-metric">
              <label>Weighted Kappa</label>
              <span class="metric-value">{{ irrStats.weightedKappa?.toFixed(3) || 'N/A' }}</span>
            </div>
            <div class="irr-metric">
              <label>Percent Agreement</label>
              <span class="metric-value">{{ (irrStats.percentAgreement * 100)?.toFixed(1) || 'N/A' }}%</span>
            </div>
            <div class="irr-metric">
              <label>MAE (Mean Abs Error)</label>
              <span class="metric-value">{{ irrStats.mae?.toFixed(2) || 'N/A' }}</span>
            </div>
            <div class="irr-metric">
              <label>Pearson Correlation</label>
              <span class="metric-value">{{ irrStats.pearson?.toFixed(3) || 'N/A' }}</span>
            </div>
          </div>
          <div class="irr-dimension-breakdown">
            <h4>รายมิติ:</h4>
            <div class="dimension-irr-grid">
              <div v-for="dim in dimensions" :key="dim.key" class="dim-irr-item">
                <span class="dim-label">{{ dim.label.split(' ')[0] }}</span>
                <span class="dim-kappa" :class="getKappaClass(irrStats.dimensions?.[dim.key]?.kappa)">
                  κ={{ irrStats.dimensions?.[dim.key]?.kappa?.toFixed(2) || '-' }}
                </span>
              </div>
            </div>
          </div>
          <div class="publication-status">
            <span v-if="irrStats.meetsPublicationStandard" class="pub-ready">
              ✅ พร้อมตีพิมพ์ (Publication Ready)
            </span>
            <span v-else class="pub-not-ready">
              ⚠️ ต้องการข้อมูลเพิ่มเติมเพื่อให้ได้มาตรฐานตีพิมพ์ (κ ≥ 0.80)
            </span>
          </div>
        </div>
      </div>

      <div class="main-content">
        <!-- Assessment List -->
        <div class="assessment-list card">
          <div class="list-header">
            <h2>รายการที่ต้องประเมินเทียบเคียง</h2>
            <button @click="loadData" class="btn-icon">🔄</button>
          </div>

          <div v-if="pendingAssessments.length === 0" class="empty-state">
            <p>🎉 ไม่มีรายการที่ต้องตรวจสอบในขณะนี้</p>
          </div>

          <div v-else class="assessment-items">
            <div 
              v-for="item in pendingAssessments" 
              :key="item.id"
              class="assessment-item"
              :class="{ active: selectedId === item.id }"
              @click="selectAssessment(item)"
            >
              <div class="item-header">
                <div class="item-score-badge">
                  <span class="score-value">{{ getTotalScore(item) }}</span>
                  <span class="score-max">/20</span>
                </div>
                <span class="item-date">{{ formatDate(item.timestamp) }}</span>
              </div>
              <div class="item-preview">
                <span class="preview-label">💬</span>
                {{ truncate(item.rawAnswer || item.studentAnswer || item.answer, 60) || 'ไม่มีข้อความ' }}
              </div>
              <div class="item-footer">
                <span class="status-badge pending">🔍 รอตรวจสอบ</span>
                <span class="item-dims" v-if="item.rubricScores">
                  A:{{ item.rubricScores.analysis || 0 }} 
                  R:{{ item.rubricScores.reasoning || 0 }} 
                  C:{{ item.rubricScores.creativity || 0 }} 
                  E:{{ item.rubricScores.evidence || 0 }}
                </span>
              </div>
            </div>
          </div>

          <!-- Completed Section -->
          <div v-if="myCalibrations.length > 0" class="completed-section">
            <h3>✅ ตรวจสอบแล้ว ({{ myCalibrations.length }} รายการ)</h3>
            <div v-for="cal in myCalibrations.slice(0, 10)" :key="cal.id" class="calibration-item">
              <div class="cal-scores">
                <span class="cal-expert">👤 {{ getCalTotal(cal.expertScores) }}</span>
                <span class="cal-vs">vs</span>
                <span class="cal-ai">🤖 {{ getCalTotal(cal.aiScores) }}</span>
              </div>
              <span class="cal-agreement" :class="getAgreementClass(cal.agreementScore)">
                {{ cal.agreementScore }}%
              </span>
              <span class="cal-date">{{ formatDate(cal.timestamp) }}</span>
            </div>
          </div>
        </div>

        <!-- Calibration Workspace -->
        <div v-if="selectedAssessment" class="calibration-workspace card">
          <div class="workspace-header">
            <h2>พื้นที่การให้คะแนน (Expert Scoring)</h2>
            <div class="ai-score-toggle">
              <label>
                <input type="checkbox" v-model="showAIScores"> แสดงคะแนน AI
              </label>
            </div>
          </div>

          <div class="qa-section">
            <div class="question-box">
              <h3>📝 คำถาม:</h3>
              <p v-if="loadingQuestion" class="loading-text">กำลังโหลด...</p>
              <p v-else>{{ currentQuestion || 'ไม่พบข้อมูลคำถาม' }}</p>
            </div>
            <div class="answer-box">
              <h3>💬 คำตอบนักเรียน:</h3>
              <p>{{ currentAnswer || 'ไม่มีคำตอบ' }}</p>
            </div>
          </div>

          <div class="scoring-grid">
            <div v-for="dim in dimensions" :key="dim.key" class="score-column">
              <h4>{{ dim.label }}</h4>
              
              <div class="score-inputs">
                <button 
                  v-for="score in [1, 2, 3, 4, 5]" 
                  :key="score"
                  class="score-btn"
                  :class="{ selected: expertScores[dim.key] === score }"
                  @click="expertScores[dim.key] = score"
                >
                  {{ score }}
                </button>
              </div>

              <div v-if="showAIScores && selectedAssessment.rubricScores" class="ai-score-display">
                AI: <strong>{{ selectedAssessment.rubricScores[dim.key] || 0 }}</strong>
                <span v-if="expertScores[dim.key] > 0" class="diff-indicator" :class="getDiffClass(dim.key)">
                  {{ getDiffText(dim.key) }}
                </span>
              </div>
            </div>
          </div>

          <div class="feedback-section">
            <label>ข้อเสนอแนะเพิ่มเติม (สำหรับปรับปรุง AI):</label>
            <textarea 
              v-model="expertFeedback" 
              rows="3" 
              placeholder="ระบุจุดที่ AI อาจประเมินคลาดเคลื่อน หรือข้อสังเกตเพิ่มเติม..."
            ></textarea>
          </div>

          <div class="action-buttons">
            <button @click="cancelSelection" class="btn btn-secondary">ยกเลิก</button>
            <button @click="submitCalibration" :disabled="!isComplete || submitting" class="btn btn-primary large">
              {{ submitting ? 'กำลังบันทึก...' : '✅ ยืนยันผลการประเมิน' }}
            </button>
          </div>
        </div>

        <div v-else class="no-selection card">
          <div class="no-selection-content">
            <span class="icon">👈</span>
            <p>เลือกรายการจากทางซ้ายเพื่อเริ่มการประเมิน</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { db } from '@/firebase/config'
import { 
  collection, query, where, getDocs, addDoc, serverTimestamp, 
  limit, orderBy 
} from 'firebase/firestore'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ErrorMessage from '@/components/ErrorMessage.vue'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(true)
const error = ref(null)
const submitting = ref(false)

// Data
const allAssessments = ref([])
const calibratedIds = ref(new Set())
const myCalibrations = ref([])
const selectedAssessment = ref(null)
const selectedId = ref(null)
const showAIScores = ref(false)
const showIRRDetails = ref(false)
const showIRRReport = ref(false)
const loadingQuestion = ref(false)
const currentQuestion = ref('')
const currentAnswer = ref('')

// IRR Stats
const irrStats = ref({
  kappa: null,
  weightedKappa: null,
  percentAgreement: null,
  mae: null,
  pearson: null,
  interpretation: null,
  meetsPublicationStandard: false,
  dimensions: {}
})

const expertScores = ref({
  analysis: 0,
  reasoning: 0,
  creativity: 0,
  evidence: 0
})
const expertFeedback = ref('')

// Computed stats from real data
const pendingAssessments = computed(() => 
  allAssessments.value.filter(a => !calibratedIds.value.has(a.id))
)

const pendingCount = computed(() => pendingAssessments.value.length)
const completedCount = computed(() => myCalibrations.value.length)

const agreementRate = computed(() => {
  if (myCalibrations.value.length === 0) return 0
  const total = myCalibrations.value.reduce((sum, c) => sum + (c.agreementScore || 0), 0)
  return Math.round(total / myCalibrations.value.length)
})

// IRR class based on kappa value
const irrClass = computed(() => {
  const k = irrStats.value.kappa
  if (k === null) return ''
  if (k >= 0.8) return 'excellent'
  if (k >= 0.6) return 'good'
  if (k >= 0.4) return 'moderate'
  return 'poor'
})

const avgExpertScore = computed(() => {
  if (myCalibrations.value.length === 0) return 0
  let total = 0, count = 0
  myCalibrations.value.forEach(cal => {
    if (cal.expertScores) {
      Object.values(cal.expertScores).forEach(s => {
        total += s
        count++
      })
    }
  })
  return count > 0 ? total / count : 0
})

const avgAIScore = computed(() => {
  if (myCalibrations.value.length === 0) return 0
  let total = 0, count = 0
  myCalibrations.value.forEach(cal => {
    if (cal.aiScores) {
      Object.values(cal.aiScores).forEach(s => {
        total += s
        count++
      })
    }
  })
  return count > 0 ? total / count : 0
})

const dimensions = [
  { key: 'analysis', label: 'การวิเคราะห์ (Analysis)' },
  { key: 'reasoning', label: 'การให้เหตุผล (Reasoning)' },
  { key: 'creativity', label: 'ความคิดสร้างสรรค์ (Creativity)' },
  { key: 'evidence', label: 'การใช้หลักฐาน (Evidence)' }
]

const isComplete = computed(() => {
  return Object.values(expertScores.value).every(s => s > 0)
})

onMounted(async () => {
  await loadData()
})

async function loadData() {
  try {
    loading.value = true
    error.value = null
    await Promise.all([
      loadPendingAssessments(),
      loadMyCalibrations()
    ])
  } catch (err) {
    console.error('Error loading data:', err)
    error.value = 'ไม่สามารถโหลดข้อมูลได้'
  } finally {
    loading.value = false
  }
}

async function loadPendingAssessments() {
  try {
    // Get recent assessments that have rubricScores
    const q = query(
      collection(db, 'assessments'),
      orderBy('timestamp', 'desc'),
      limit(50)
    )
    
    const snapshot = await getDocs(q)
    allAssessments.value = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(a => a.rubricScores) // Only those with AI scores
  } catch (err) {
    console.error('Error loading assessments:', err)
    throw err
  }
}

async function loadMyCalibrations() {
  if (!authStore.user?.uid) return
  
  try {
    // Get calibrations done by current user
    const q = query(
      collection(db, 'calibrations'),
      where('expertId', '==', authStore.user.uid),
      orderBy('timestamp', 'desc'),
      limit(100)
    )
    
    const snapshot = await getDocs(q)
    myCalibrations.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Track which assessments already calibrated
    calibratedIds.value = new Set(myCalibrations.value.map(c => c.assessmentId))
  } catch (err) {
    console.error('Error loading calibrations:', err)
    // If index missing, try without orderBy
    try {
      const q2 = query(
        collection(db, 'calibrations'),
        where('expertId', '==', authStore.user.uid),
        limit(100)
      )
      const snapshot = await getDocs(q2)
      myCalibrations.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      calibratedIds.value = new Set(myCalibrations.value.map(c => c.assessmentId))
    } catch (err2) {
      myCalibrations.value = []
      calibratedIds.value = new Set()
    }
  }
}

async function selectAssessment(item) {
  selectedAssessment.value = item
  selectedId.value = item.id
  // Reset form
  expertScores.value = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
  expertFeedback.value = ''
  showAIScores.value = false
  
  // Set answer - use rawAnswer (from backend) or studentAnswer or answer
  currentAnswer.value = item.rawAnswer || item.studentAnswer || item.answer || ''
  
  // Set question - try multiple sources
  // 1. questionData.question (stored from question bank)
  // 2. questionContext (question text stored directly)
  // 3. questionText or question field
  currentQuestion.value = ''
  
  if (item.questionData?.question) {
    currentQuestion.value = item.questionData.question
  } else if (item.questionContext && item.questionContext !== 'General HOTS Assessment') {
    currentQuestion.value = item.questionContext
  } else if (item.questionText) {
    currentQuestion.value = item.questionText
  } else if (item.question) {
    currentQuestion.value = item.question
  }
  
  // If still no question, try loading from questions collection
  if (!currentQuestion.value && item.questionId) {
    loadingQuestion.value = true
    try {
      const { doc, getDoc } = await import('firebase/firestore')
      const qDoc = await getDoc(doc(db, 'questions', item.questionId))
      if (qDoc.exists()) {
        currentQuestion.value = qDoc.data().question || qDoc.data().text || ''
      }
    } catch (e) {
      console.error('Error loading question:', e)
    } finally {
      loadingQuestion.value = false
    }
  }
}

function cancelSelection() {
  selectedAssessment.value = null
  selectedId.value = null
}

async function submitCalibration() {
  if (!selectedAssessment.value || !authStore.user?.uid) return
  
  try {
    submitting.value = true
    
    // Calculate agreement (simple absolute difference)
    const aiScores = selectedAssessment.value.rubricScores || {}
    let totalDiff = 0
    let dimCount = 0
    Object.keys(expertScores.value).forEach(key => {
      if (aiScores[key] !== undefined) {
        totalDiff += Math.abs(expertScores.value[key] - aiScores[key])
        dimCount++
      }
    })
    // Agreement: 100% if same, -20% per point difference
    const agreementScore = dimCount > 0 
      ? Math.max(0, Math.round(100 - (totalDiff / dimCount) * 20))
      : 100

    // Save calibration record
    const calibrationData = {
      assessmentId: selectedAssessment.value.id,
      expertScores: { ...expertScores.value },
      aiScores: { ...aiScores },
      feedback: expertFeedback.value,
      agreementScore,
      timestamp: serverTimestamp(),
      expertId: authStore.user.uid,
      expertName: authStore.user.displayName || 'Expert'
    }
    
    await addDoc(collection(db, 'calibrations'), calibrationData)

    // Update local state
    calibratedIds.value.add(selectedAssessment.value.id)
    myCalibrations.value.unshift({
      ...calibrationData,
      id: 'new-' + Date.now(),
      timestamp: new Date()
    })
    
    // Reset selection
    selectedAssessment.value = null
    selectedId.value = null
    
    alert('✅ บันทึกการประเมินเรียบร้อย!')

  } catch (err) {
    console.error('Error saving calibration:', err)
    alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message)
  } finally {
    submitting.value = false
  }
}

function getDiffClass(dimKey) {
  const ai = selectedAssessment.value?.rubricScores?.[dimKey] || 0
  const expert = expertScores.value[dimKey]
  if (expert === 0) return ''
  const diff = expert - ai
  if (diff === 0) return 'match'
  return diff > 0 ? 'higher' : 'lower'
}

function getDiffText(dimKey) {
  const ai = selectedAssessment.value?.rubricScores?.[dimKey] || 0
  const expert = expertScores.value[dimKey]
  if (expert === 0) return ''
  const diff = expert - ai
  if (diff === 0) return '✓ ตรงกัน'
  return diff > 0 ? `+${diff}` : `${diff}`
}

function getAgreementClass(score) {
  if (score >= 80) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

function getTotalScore(item) {
  if (!item?.rubricScores) return 0
  const scores = item.rubricScores
  return (scores.analysis || 0) + (scores.reasoning || 0) + (scores.creativity || 0) + (scores.evidence || 0)
}

function getCalTotal(scores) {
  if (!scores) return 0
  return (scores.analysis || 0) + (scores.reasoning || 0) + (scores.creativity || 0) + (scores.evidence || 0)
}

function getKappaClass(kappa) {
  if (kappa === null || kappa === undefined) return ''
  if (kappa >= 0.8) return 'excellent'
  if (kappa >= 0.6) return 'good'
  if (kappa >= 0.4) return 'moderate'
  return 'poor'
}

function truncate(text, length) {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(date)
}

function goBack() {
  router.push('/teacher')
}

// ============================================
// Cohen's Kappa & IRR Calculation Functions
// ============================================

/**
 * Calculate Cohen's Kappa for given ratings
 * Formula: κ = (Po - Pe) / (1 - Pe)
 */
function calculateCohensKappa(rater1Scores, rater2Scores, maxScore = 5) {
  if (rater1Scores.length !== rater2Scores.length || rater1Scores.length < 2) {
    return { kappa: null, interpretation: 'Insufficient data' }
  }
  
  const n = rater1Scores.length
  const categories = Array.from({ length: maxScore + 1 }, (_, i) => i)
  
  // Create confusion matrix
  const matrix = {}
  categories.forEach(i => {
    matrix[i] = {}
    categories.forEach(j => {
      matrix[i][j] = 0
    })
  })
  
  // Fill confusion matrix
  for (let i = 0; i < n; i++) {
    const r1 = Math.min(maxScore, Math.max(0, Math.round(rater1Scores[i])))
    const r2 = Math.min(maxScore, Math.max(0, Math.round(rater2Scores[i])))
    matrix[r1][r2]++
  }
  
  // Calculate observed agreement (Po)
  let po = 0
  categories.forEach(c => {
    po += matrix[c][c]
  })
  po = po / n
  
  // Calculate expected agreement (Pe)
  let pe = 0
  categories.forEach(c => {
    let sum1 = 0, sum2 = 0
    categories.forEach(other => {
      sum1 += matrix[c][other]
      sum2 += matrix[other][c]
    })
    pe += (sum1 / n) * (sum2 / n)
  })
  
  // Calculate Kappa
  let kappa = pe === 1 ? (po === 1 ? 1 : 0) : (po - pe) / (1 - pe)
  
  return {
    kappa: Math.round(kappa * 1000) / 1000,
    interpretation: interpretKappa(kappa),
    po: Math.round(po * 1000) / 1000,
    pe: Math.round(pe * 1000) / 1000
  }
}

/**
 * Calculate Weighted Kappa for ordinal scale
 */
function calculateWeightedKappa(rater1Scores, rater2Scores, maxScore = 5) {
  if (rater1Scores.length !== rater2Scores.length || rater1Scores.length < 2) {
    return null
  }
  
  const n = rater1Scores.length
  const k = maxScore + 1
  
  // Create quadratic weight matrix
  const weights = []
  for (let i = 0; i < k; i++) {
    weights[i] = []
    for (let j = 0; j < k; j++) {
      weights[i][j] = 1 - Math.pow(i - j, 2) / Math.pow(k - 1, 2)
    }
  }
  
  // Create observed frequency matrix
  const observed = Array(k).fill(null).map(() => Array(k).fill(0))
  for (let i = 0; i < n; i++) {
    const r1 = Math.min(maxScore, Math.max(0, Math.round(rater1Scores[i])))
    const r2 = Math.min(maxScore, Math.max(0, Math.round(rater2Scores[i])))
    observed[r1][r2]++
  }
  
  // Calculate marginal totals
  const row = Array(k).fill(0)
  const col = Array(k).fill(0)
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      row[i] += observed[i][j]
      col[j] += observed[i][j]
    }
  }
  
  // Calculate expected frequency matrix
  const expected = Array(k).fill(null).map(() => Array(k).fill(0))
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      expected[i][j] = (row[i] * col[j]) / n
    }
  }
  
  // Calculate weighted observed and expected
  let weightedPo = 0
  let weightedPe = 0
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      weightedPo += weights[i][j] * (observed[i][j] / n)
      weightedPe += weights[i][j] * (expected[i][j] / n)
    }
  }
  
  return weightedPe === 1 
    ? (weightedPo === 1 ? 1 : 0) 
    : (weightedPo - weightedPe) / (1 - weightedPe)
}

/**
 * Calculate Mean Absolute Error
 */
function calculateMAE(arr1, arr2) {
  if (arr1.length !== arr2.length || arr1.length === 0) return null
  let sum = 0
  for (let i = 0; i < arr1.length; i++) {
    sum += Math.abs(arr1[i] - arr2[i])
  }
  return sum / arr1.length
}

/**
 * Calculate Pearson Correlation
 */
function calculatePearson(arr1, arr2) {
  if (arr1.length !== arr2.length || arr1.length < 2) return null
  
  const n = arr1.length
  const mean1 = arr1.reduce((a, b) => a + b, 0) / n
  const mean2 = arr2.reduce((a, b) => a + b, 0) / n
  
  let sumXY = 0, sumX2 = 0, sumY2 = 0
  for (let i = 0; i < n; i++) {
    const dx = arr1[i] - mean1
    const dy = arr2[i] - mean2
    sumXY += dx * dy
    sumX2 += dx * dx
    sumY2 += dy * dy
  }
  
  if (sumX2 === 0 || sumY2 === 0) return 0
  return sumXY / Math.sqrt(sumX2 * sumY2)
}

/**
 * Interpret Kappa value
 */
function interpretKappa(kappa) {
  if (kappa >= 0.81) return 'Excellent (ยอดเยี่ยม)'
  if (kappa >= 0.61) return 'Substantial (ดีมาก)'
  if (kappa >= 0.41) return 'Moderate (พอใช้)'
  if (kappa >= 0.21) return 'Fair (ต่ำ)'
  return 'Poor (ต้องปรับปรุง)'
}

/**
 * Calculate comprehensive IRR statistics from calibrations
 */
function calculateIRRStats() {
  if (myCalibrations.value.length < 5) {
    irrStats.value = {
      kappa: null,
      weightedKappa: null,
      percentAgreement: null,
      mae: null,
      pearson: null,
      interpretation: 'ต้องมีอย่างน้อย 5 รายการ',
      meetsPublicationStandard: false,
      dimensions: {}
    }
    return
  }
  
  const dims = ['analysis', 'reasoning', 'creativity', 'evidence']
  const allAI = []
  const allExpert = []
  const dimData = { analysis: { ai: [], expert: [] }, reasoning: { ai: [], expert: [] }, creativity: { ai: [], expert: [] }, evidence: { ai: [], expert: [] } }
  
  myCalibrations.value.forEach(cal => {
    if (!cal.aiScores || !cal.expertScores) return
    
    dims.forEach(dim => {
      const ai = cal.aiScores[dim]
      const expert = cal.expertScores[dim]
      if (ai !== undefined && expert !== undefined) {
        dimData[dim].ai.push(ai)
        dimData[dim].expert.push(expert)
        allAI.push(ai)
        allExpert.push(expert)
      }
    })
  })
  
  if (allAI.length < 5) {
    irrStats.value.kappa = null
    return
  }
  
  // Calculate overall metrics
  const kappaResult = calculateCohensKappa(allAI, allExpert)
  const weightedKappa = calculateWeightedKappa(allAI, allExpert)
  const mae = calculateMAE(allAI, allExpert)
  const pearson = calculatePearson(allAI, allExpert)
  
  // Calculate exact agreement percentage
  let exactMatch = 0
  for (let i = 0; i < allAI.length; i++) {
    if (Math.round(allAI[i]) === Math.round(allExpert[i])) exactMatch++
  }
  const percentAgreement = exactMatch / allAI.length
  
  // Calculate per-dimension
  const dimensions = {}
  dims.forEach(dim => {
    if (dimData[dim].ai.length >= 3) {
      const dimKappa = calculateCohensKappa(dimData[dim].ai, dimData[dim].expert)
      dimensions[dim] = {
        kappa: dimKappa.kappa,
        n: dimData[dim].ai.length
      }
    }
  })
  
  irrStats.value = {
    kappa: kappaResult.kappa,
    weightedKappa: weightedKappa ? Math.round(weightedKappa * 1000) / 1000 : null,
    percentAgreement,
    mae: mae ? Math.round(mae * 100) / 100 : null,
    pearson: pearson ? Math.round(pearson * 1000) / 1000 : null,
    interpretation: kappaResult.interpretation,
    meetsPublicationStandard: kappaResult.kappa >= 0.8,
    dimensions,
    n: allAI.length
  }
}

// Watch for changes in calibrations and recalculate IRR
watch(myCalibrations, () => {
  calculateIRRStats()
}, { deep: true })
</script>

<style scoped>
.expert-calibration-container {
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-left h1 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline:hover {
  background: var(--hover-bg);
}

/* IRR Report Button - Modern Gradient Style */
.btn-irr-report {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
  position: relative;
  overflow: hidden;
}

.btn-irr-report::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}

.btn-irr-report:hover::before {
  left: 100%;
}

.btn-irr-report:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
}

.irr-icon {
  font-size: 1.1rem;
}

.irr-text {
  font-size: 0.9rem;
}

.irr-badge {
  background: rgba(255,255,255,0.25);
  padding: 0.15rem 0.5rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 700;
}

.badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 99px;
  font-size: 0.875rem;
  font-weight: 600;
}

.loading-state, .error-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  border: 1px solid var(--border-color);
}

.stat-card.irr-card.excellent {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.stat-card.irr-card.good {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

.stat-card.irr-card.moderate {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.stat-card.irr-card.poor {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.stat-card h3 {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 0.5rem 0;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #667eea;
  margin: 0.5rem 0;
}

.stat-value.highlight {
  color: #10b981;
}

.stat-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.main-content {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 1.5rem;
  align-items: start;
}

.card {
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  padding: 1.25rem;
}

.assessment-list {
  max-height: calc(100vh - 320px);
  overflow-y: auto;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.list-header h2 {
  font-size: 1rem;
  margin: 0;
  color: var(--text-primary);
}

.btn-icon {
  background: var(--bg-tertiary);
  border: none;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.25rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.assessment-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.assessment-item {
  padding: 1rem;
  border-radius: 12px;
  cursor: pointer;
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  transition: all 0.2s;
}

.assessment-item:hover {
  border-color: #667eea;
  transform: translateX(4px);
}

.assessment-item.active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.15);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
}

.item-score-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0.3rem 0.7rem;
  border-radius: 8px;
  color: white;
  font-weight: 700;
}

.score-value {
  font-size: 1.1rem;
}

.score-max {
  font-size: 0.75rem;
  opacity: 0.8;
}

.item-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.item-preview {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.6rem;
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  line-height: 1.4;
}

.preview-label {
  flex-shrink: 0;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-dims {
  font-family: monospace;
  font-size: 0.7rem;
  color: var(--text-secondary);
  background: var(--bg-primary);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.pending {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
}

.completed-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.completed-section h3 {
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.calibration-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.5rem;
  font-size: 0.8rem;
  border-bottom: 1px solid var(--border-color);
}

.cal-scores {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 600;
}

.cal-expert {
  color: #3b82f6;
}

.cal-vs {
  color: var(--text-secondary);
  font-size: 0.7rem;
}

.cal-ai {
  color: #10b981;
}

.cal-agreement {
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.75rem;
}

.cal-agreement.high { background: #d1fae5; color: #065f46; }
.cal-agreement.medium { background: #fef3c7; color: #92400e; }
.cal-agreement.low { background: #fee2e2; color: #991b1b; }

.cal-date {
  color: var(--text-secondary);
  margin-left: auto;
}

/* Workspace */
.calibration-workspace {
  min-height: 500px;
}

.no-selection {
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-selection-content {
  text-align: center;
  color: var(--text-secondary);
}

.no-selection-content .icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.workspace-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.ai-score-toggle label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.qa-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.question-box, .answer-box {
  background: var(--bg-tertiary);
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.question-box h3, .answer-box h3 {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.question-box p, .answer-box p {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.6;
}

.loading-text {
  color: var(--text-secondary);
  font-style: italic;
}

.scoring-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.score-column {
  text-align: center;
}

.score-column h4 {
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.score-inputs {
  display: flex;
  gap: 0.25rem;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.score-btn {
  width: 36px;
  height: 36px;
  border: 2px solid var(--border-color);
  background: var(--card-bg);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-primary);
  transition: all 0.2s;
}

.score-btn:hover {
  border-color: #667eea;
}

.score-btn.selected {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.ai-score-display {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.diff-indicator {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.diff-indicator.match { background: #d1fae5; color: #065f46; }
.diff-indicator.higher { background: #dbeafe; color: #1e40af; }
.diff-indicator.lower { background: #fee2e2; color: #991b1b; }

.feedback-section {
  margin-bottom: 1.5rem;
}

.feedback-section label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.feedback-section textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--text-primary);
  resize: vertical;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn.large {
  padding: 1rem 2rem;
  font-size: 1rem;
}

/* IRR Stats Panel */
.irr-details-panel {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-color);
}

.irr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.irr-header h3 {
  font-size: 1.1rem;
  margin: 0;
  color: var(--text-primary);
}

.publication-badge {
  padding: 0.4rem 0.8rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
}

.publication-badge.ready {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.publication-badge.not-ready {
  background: #fef3c7;
  color: #92400e;
}

.irr-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.irr-metric {
  background: var(--bg-tertiary);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.irr-metric.primary {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.metric-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.metric-status {
  font-size: 0.7rem;
  font-weight: 600;
}

.metric-status.excellent { color: #10b981; }
.metric-status.good { color: #3b82f6; }
.metric-status.moderate { color: #f59e0b; }
.metric-status.poor { color: #ef4444; }

.irr-dimensions h4 {
  font-size: 0.9rem;
  margin: 0 0 0.75rem 0;
  color: var(--text-secondary);
}

.dimension-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dimension-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.dim-label {
  width: 80px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
}

.dim-bar-container {
  flex: 1;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.dim-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.dim-bar-fill.excellent { background: linear-gradient(90deg, #10b981 0%, #059669 100%); }
.dim-bar-fill.good { background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%); }
.dim-bar-fill.moderate { background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); }
.dim-bar-fill.poor { background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%); }

.dim-value {
  width: 50px;
  font-size: 0.8rem;
  font-weight: 600;
  text-align: right;
  color: var(--text-primary);
}

/* Responsive */
@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .qa-section {
    grid-template-columns: 1fr;
  }
  
  .scoring-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .assessment-list {
    max-height: 300px;
  }
}
</style>
