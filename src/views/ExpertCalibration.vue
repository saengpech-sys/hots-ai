<template>
  <div class="expert-calibration-container">
    <nav class="navbar card">
      <div class="nav-left">
        <button @click="goBack" class="btn btn-secondary">← กลับ</button>
        <h1>🎯 Expert Calibration Mode</h1>
      </div>
      <div class="nav-right">
        <span class="badge">สำหรับผู้เชี่ยวชาญเท่านั้น</span>
      </div>
    </nav>

    <div v-if="loading" class="loading-state">
      <LoadingSpinner />
      <p>กำลังโหลดข้อมูลการประเมิน...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <ErrorMessage :message="error" />
      <button @click="loadPendingAssessments" class="btn btn-primary">ลองใหม่</button>
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
      </div>

      <!-- Assessment List -->
      <div class="assessment-list card">
        <div class="list-header">
          <h2>รายการที่ต้องประเมินเทียบเคียง</h2>
          <button @click="loadPendingAssessments" class="btn btn-icon">🔄</button>
        </div>

        <div v-if="assessments.length === 0" class="empty-state">
          <p>🎉 ไม่มีรายการที่ต้องตรวจสอบในขณะนี้</p>
        </div>

        <div v-else class="assessment-items">
          <div 
            v-for="item in assessments" 
            :key="item.id"
            class="assessment-item"
            :class="{ active: selectedId === item.id }"
            @click="selectAssessment(item)"
          >
            <div class="item-info">
              <span class="item-id">#{{ item.id.slice(-6) }}</span>
              <span class="item-date">{{ formatDate(item.timestamp) }}</span>
            </div>
            <div class="item-status">
              <span class="status-badge pending">รอตรวจสอบ</span>
            </div>
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
            <p>{{ selectedAssessment.questionText }}</p>
          </div>
          <div class="answer-box">
            <h3>คำตอบนักเรียน:</h3>
            <p>{{ selectedAssessment.studentAnswer }}</p>
          </div>
        </div>

        <div class="scoring-grid">
          <div v-for="dim in dimensions" :key="dim.key" class="score-column">
            <h4>{{ dim.label }}</h4>
            
            <div class="score-inputs">
              <button 
                v-for="score in 5" 
                :key="score"
                class="score-btn"
                :class="{ selected: expertScores[dim.key] === score }"
                @click="expertScores[dim.key] = score"
              >
                {{ score }}
              </button>
            </div>

            <div v-if="showAIScores" class="ai-score-display">
              AI: <strong>{{ selectedAssessment.rubricScores[dim.key] }}</strong>
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
          <button @click="submitCalibration" :disabled="!isComplete || submitting" class="btn btn-primary large">
            {{ submitting ? 'กำลังบันทึก...' : '✅ ยืนยันผลการประเมิน' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit, orderBy } from 'firebase/firestore'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ErrorMessage from '@/components/ErrorMessage.vue'

const router = useRouter()
const loading = ref(true)
const error = ref(null)
const submitting = ref(false)

const assessments = ref([])
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

// Mock stats for now
const pendingCount = ref(0)
const completedCount = ref(0)
const agreementRate = ref(0)

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
  await loadPendingAssessments()
})

async function loadPendingAssessments() {
  try {
    loading.value = true
    // Query assessments that need calibration (e.g., flagged or random sample)
    // For prototype, just get recent assessments
    const q = query(
      collection(db, 'assessments'),
      orderBy('timestamp', 'desc'),
      limit(20)
    )
    
    const snapshot = await getDocs(q)
    assessments.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    pendingCount.value = assessments.value.length
    loading.value = false
  } catch (err) {
    console.error('Error loading assessments:', err)
    error.value = 'ไม่สามารถโหลดข้อมูลได้'
    loading.value = false
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

async function submitCalibration() {
  if (!selectedAssessment.value) return
  
  try {
    submitting.value = true
    
    // Calculate agreement (simple absolute difference)
    const aiScores = selectedAssessment.value.rubricScores
    let totalDiff = 0
    Object.keys(expertScores.value).forEach(key => {
      totalDiff += Math.abs(expertScores.value[key] - aiScores[key])
    })
    const agreementScore = Math.max(0, 100 - (totalDiff * 5)) // Rough heuristic

    // Save calibration record
    await addDoc(collection(db, 'calibrations'), {
      assessmentId: selectedAssessment.value.id,
      expertScores: expertScores.value,
      aiScores: aiScores,
      feedback: expertFeedback.value,
      agreementScore,
      timestamp: serverTimestamp(),
      expertId: 'current-user-id' // TODO: Get from auth
    })

    // Remove from list (local update)
    assessments.value = assessments.value.filter(a => a.id !== selectedAssessment.value.id)
    selectedAssessment.value = null
    completedCount.value++
    
    // Update average agreement
    agreementRate.value = Math.round((agreementRate.value * (completedCount.value - 1) + agreementScore) / completedCount.value)

  } catch (err) {
    console.error('Error saving calibration:', err)
    alert('เกิดข้อผิดพลาดในการบันทึก')
  } finally {
    submitting.value = false
  }
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
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--bg-primary);
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.badge {
  background: #f59e0b;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  font-size: 0.875rem;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary);
  margin: 0.5rem 0;
}

.stat-value.highlight {
  color: var(--success);
}

.calibration-content {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1.5rem;
  align-items: start;
}

.assessment-list {
  height: calc(100vh - 250px);
  overflow-y: auto;
  padding: 1rem;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.assessment-item {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

.assessment-item:hover {
  background: var(--bg-hover);
}

.assessment-item.active {
  background: var(--primary-light);
  border-left: 4px solid var(--primary);
}

.item-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.calibration-workspace {
  padding: 2rem;
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.qa-section {
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.question-box, .answer-box {
  margin-bottom: 1.5rem;
}

.question-box h3, .answer-box h3 {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.question-box p, .answer-box p {
  font-size: 1.1rem;
  line-height: 1.6;
}

.scoring-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  margin-bottom: 2rem;
}

.score-column h4 {
  margin-bottom: 1rem;
  text-align: center;
}

.score-inputs {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.score-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  background: transparent;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.score-btn.selected {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  transform: scale(1.1);
}

.ai-score-display {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.feedback-section {
  margin-bottom: 2rem;
}

.feedback-section textarea {
  width: 100%;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin-top: 0.5rem;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1024px) {
  .calibration-content {
    grid-template-columns: 1fr;
  }
  
  .assessment-list {
    height: 300px;
  }
}
</style>
