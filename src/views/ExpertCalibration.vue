<template>
  <div class="expert-calibration-container">
    <nav class="navbar card">
      <div class="nav-left">
        <button @click="goBack" class="btn btn-secondary">← กลับ</button>
        <h1>🎯 Expert Calibration Mode</h1>
      </div>
      <div class="nav-right">
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
        <div class="stat-card">
          <h3>คะแนนเฉลี่ย Expert</h3>
          <div class="stat-value">{{ avgExpertScore.toFixed(1) }}</div>
          <div class="stat-desc">vs AI {{ avgAIScore.toFixed(1) }}</div>
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
              <div class="item-info">
                <span class="item-id">#{{ item.id.slice(-6) }}</span>
                <span class="item-date">{{ formatDate(item.timestamp) }}</span>
              </div>
              <div class="item-preview">
                {{ truncate(item.studentAnswer || item.answer, 50) }}
              </div>
              <div class="item-status">
                <span class="status-badge pending">รอตรวจสอบ</span>
              </div>
            </div>
          </div>

          <!-- Completed Section -->
          <div v-if="myCalibrations.length > 0" class="completed-section">
            <h3>✅ ที่ตรวจสอบแล้ว (ล่าสุด 10 รายการ)</h3>
            <div v-for="cal in myCalibrations.slice(0, 10)" :key="cal.id" class="calibration-item">
              <span class="cal-id">#{{ cal.assessmentId?.slice(-6) }}</span>
              <span class="cal-agreement" :class="getAgreementClass(cal.agreementScore)">
                {{ cal.agreementScore }}% agreement
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
              <h3>คำถาม:</h3>
              <p>{{ selectedAssessment.questionText || selectedAssessment.question || 'ไม่มีคำถาม' }}</p>
            </div>
            <div class="answer-box">
              <h3>คำตอบนักเรียน:</h3>
              <p>{{ selectedAssessment.studentAnswer || selectedAssessment.answer || 'ไม่มีคำตอบ' }}</p>
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
import { ref, computed, onMounted } from 'vue'
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

function selectAssessment(item) {
  selectedAssessment.value = item
  selectedId.value = item.id
  // Reset form
  expertScores.value = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
  expertFeedback.value = ''
  showAIScores.value = false
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
  router.back()
}
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

.nav-left h1 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
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
  border-radius: 10px;
  cursor: pointer;
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  transition: all 0.2s;
}

.assessment-item:hover {
  border-color: #667eea;
}

.assessment-item.active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.item-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.item-id {
  font-weight: 600;
  font-family: monospace;
  color: var(--text-primary);
}

.item-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.item-preview {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.pending {
  background: #fef3c7;
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
  padding: 0.5rem;
  font-size: 0.8rem;
  border-bottom: 1px solid var(--border-color);
}

.cal-id {
  font-family: monospace;
  color: var(--text-secondary);
}

.cal-agreement {
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.7rem;
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
}

.question-box p, .answer-box p {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.6;
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
