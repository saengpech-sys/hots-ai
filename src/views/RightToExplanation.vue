<template>
  <div class="right-to-explanation">
    <div class="page-header">
      <h1>💡 Right to Explanation</h1>
      <p class="subtitle">สิทธิในการได้รับคำอธิบายการประเมินโดย AI</p>
    </div>

    <!-- Assessment Selection -->
    <div class="assessment-selector">
      <h2>เลือกการประเมินที่ต้องการคำอธิบาย</h2>
      <select v-model="selectedAssessmentId" @change="loadAssessment">
        <option value="">-- เลือกการประเมิน --</option>
        <option 
          v-for="assessment in recentAssessments" 
          :key="assessment.id" 
          :value="assessment.id"
        >
          {{ formatDate(assessment.createdAt) }} - {{ truncate(assessment.question, 50) }}
        </option>
      </select>
    </div>

    <!-- Assessment Detail -->
    <div v-if="selectedAssessment" class="explanation-content">
      <!-- Original Assessment -->
      <div class="section">
        <h3>📝 คำถามและคำตอบ</h3>
        <div class="qa-box">
          <div class="qa-item">
            <label>คำถาม:</label>
            <p>{{ selectedAssessment.question }}</p>
          </div>
          <div class="qa-item">
            <label>คำตอบของคุณ:</label>
            <p>{{ selectedAssessment.studentAnswer }}</p>
          </div>
        </div>
      </div>

      <!-- Score Breakdown -->
      <div class="section">
        <h3>📊 คะแนนและเกณฑ์การให้คะแนน</h3>
        <div class="scores-grid">
          <div 
            v-for="dim in dimensions" 
            :key="dim.key" 
            class="score-card"
            :class="getScoreClass(selectedAssessment.rubricScores?.[dim.key])"
          >
            <div class="score-header">
              <span class="dim-icon">{{ dim.icon }}</span>
              <span class="dim-name">{{ dim.label }}</span>
            </div>
            <div class="score-value">
              {{ selectedAssessment.rubricScores?.[dim.key] || 0 }}/5
            </div>
            <div class="score-description">
              {{ getScoreDescription(dim.key, selectedAssessment.rubricScores?.[dim.key]) }}
            </div>
          </div>
        </div>
        <div class="total-score-box">
          <span>คะแนนรวม:</span>
          <span class="total">{{ calculateTotal(selectedAssessment.rubricScores) }}/20</span>
        </div>
      </div>

      <!-- AI Explanation -->
      <div class="section">
        <h3>🤖 คำอธิบายจาก AI</h3>
        <div class="explanation-box">
          <p v-if="selectedAssessment.feedback">
            {{ selectedAssessment.feedback }}
          </p>
          <p v-else class="no-feedback">
            ไม่มีคำอธิบายสำหรับการประเมินนี้
          </p>
        </div>
      </div>

      <!-- Detailed Breakdown Request -->
      <div class="section">
        <h3>🔍 ขอคำอธิบายเพิ่มเติม</h3>
        <div class="detailed-options">
          <button 
            v-for="dim in dimensions" 
            :key="dim.key"
            class="detail-btn"
            :class="{ active: expandedDimension === dim.key }"
            @click="requestDetailedExplanation(dim.key)"
          >
            {{ dim.icon }} {{ dim.label }}
          </button>
        </div>

        <div v-if="detailedExplanation" class="detailed-explanation">
          <h4>{{ getDimensionLabel(expandedDimension) }}</h4>
          <div v-if="loadingExplanation" class="loading">
            <div class="spinner"></div>
            <p>กำลังสร้างคำอธิบาย...</p>
          </div>
          <div v-else class="explanation-content-box">
            <div class="explanation-section">
              <strong>สิ่งที่ทำได้ดี:</strong>
              <p>{{ detailedExplanation.strengths }}</p>
            </div>
            <div class="explanation-section">
              <strong>สิ่งที่ควรปรับปรุง:</strong>
              <p>{{ detailedExplanation.improvements }}</p>
            </div>
            <div class="explanation-section">
              <strong>ตัวอย่างคำตอบที่ดีกว่า:</strong>
              <p class="example">{{ detailedExplanation.example }}</p>
            </div>
            <div class="explanation-section">
              <strong>เกณฑ์ที่ใช้ประเมิน:</strong>
              <p>{{ detailedExplanation.criteria }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Appeal Section -->
      <div class="section">
        <h3>📣 อุทธรณ์การประเมิน</h3>
        <p class="appeal-description">
          หากคุณเชื่อว่าการประเมินไม่ถูกต้อง คุณสามารถขออุทธรณ์เพื่อให้ครูผู้สอนพิจารณาทบทวนได้
        </p>
        <div class="appeal-form">
          <textarea 
            v-model="appealReason"
            placeholder="อธิบายเหตุผลที่คุณเชื่อว่าการประเมินควรได้รับการทบทวน..."
            rows="4"
          ></textarea>
          <div class="appeal-actions">
            <button 
              class="btn btn-outline"
              :disabled="!appealReason"
              @click="submitAppeal"
            >
              ส่งคำขออุทธรณ์
            </button>
            <span class="appeal-note">
              ครูผู้สอนจะพิจารณาภายใน 3-5 วันทำการ
            </span>
          </div>
        </div>
      </div>

      <!-- Confidence Level -->
      <div class="section">
        <h3>📈 ระดับความมั่นใจของ AI</h3>
        <div class="confidence-display">
          <div class="confidence-bar">
            <div 
              class="confidence-fill"
              :style="{ width: `${(selectedAssessment.confidence || 0.5) * 100}%` }"
              :class="getConfidenceClass(selectedAssessment.confidence)"
            ></div>
          </div>
          <span class="confidence-value">
            {{ ((selectedAssessment.confidence || 0.5) * 100).toFixed(0) }}%
          </span>
        </div>
        <p class="confidence-explanation">
          {{ getConfidenceExplanation(selectedAssessment.confidence) }}
        </p>
      </div>

      <!-- Audit Trail -->
      <div v-if="selectedAssessment.auditTrail" class="section">
        <h3>📋 Audit Trail</h3>
        <div class="audit-info">
          <div class="audit-item">
            <span class="label">Model:</span>
            <span class="value">{{ selectedAssessment.auditTrail.modelUsed }}</span>
          </div>
          <div class="audit-item">
            <span class="label">Prompt Version:</span>
            <span class="value">{{ selectedAssessment.auditTrail.promptVersion }}</span>
          </div>
          <div class="audit-item">
            <span class="label">Processing Time:</span>
            <span class="value">{{ selectedAssessment.auditTrail.processingTime }}ms</span>
          </div>
          <div v-if="selectedAssessment.auditTrail.retryCount > 0" class="audit-item warning">
            <span class="label">Retries:</span>
            <span class="value">{{ selectedAssessment.auditTrail.retryCount }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- No Assessment Selected -->
    <div v-else class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>เลือกการประเมินเพื่อดูคำอธิบาย</h3>
      <p>เลือกการประเมินจากรายการด้านบนเพื่อดูรายละเอียดและขอคำอธิบายเพิ่มเติม</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const dimensions = [
  { key: 'analysis', label: 'การวิเคราะห์', icon: '🔍' },
  { key: 'reasoning', label: 'การให้เหตุผล', icon: '🧠' },
  { key: 'creativity', label: 'ความคิดสร้างสรรค์', icon: '💡' },
  { key: 'evidence', label: 'การใช้หลักฐาน', icon: '📚' }
]

const recentAssessments = ref([])
const selectedAssessmentId = ref('')
const selectedAssessment = ref(null)
const expandedDimension = ref('')
const detailedExplanation = ref(null)
const loadingExplanation = ref(false)
const appealReason = ref('')

const scoreDescriptions = {
  analysis: {
    0: 'ยังไม่แสดงการวิเคราะห์',
    1: 'มีการวิเคราะห์เบื้องต้น',
    2: 'วิเคราะห์ได้บางส่วน',
    3: 'วิเคราะห์ได้ในระดับที่น่าพอใจ',
    4: 'วิเคราะห์ได้ดี แยกแยะชัดเจน',
    5: 'วิเคราะห์ได้ยอดเยี่ยม ลึกซึ้ง'
  },
  reasoning: {
    0: 'ยังไม่แสดงการให้เหตุผล',
    1: 'ให้เหตุผลเบื้องต้น',
    2: 'ให้เหตุผลได้บางส่วน',
    3: 'ให้เหตุผลได้สมเหตุสมผล',
    4: 'ให้เหตุผลได้ดี มีตรรกะ',
    5: 'ให้เหตุผลได้ยอดเยี่ยม เชื่อมโยงชัดเจน'
  },
  creativity: {
    0: 'ยังไม่แสดงความคิดสร้างสรรค์',
    1: 'มีความคิดสร้างสรรค์เล็กน้อย',
    2: 'มีความคิดสร้างสรรค์บ้าง',
    3: 'มีความคิดสร้างสรรค์ในระดับที่น่าพอใจ',
    4: 'มีความคิดสร้างสรรค์ดี',
    5: 'มีความคิดสร้างสรรค์ยอดเยี่ยม มีมุมมองใหม่'
  },
  evidence: {
    0: 'ยังไม่ใช้หลักฐานสนับสนุน',
    1: 'ใช้หลักฐานเบื้องต้น',
    2: 'ใช้หลักฐานบางส่วน',
    3: 'ใช้หลักฐานในระดับที่น่าพอใจ',
    4: 'ใช้หลักฐานได้ดี มีความน่าเชื่อถือ',
    5: 'ใช้หลักฐานได้ยอดเยี่ยม หลากหลายและเชื่อมโยง'
  }
}

onMounted(async () => {
  await fetchRecentAssessments()
})

async function fetchRecentAssessments() {
  try {
    const q = query(
      collection(db, 'assessments'),
      where('studentId', '==', authStore.user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    
    const snapshot = await getDocs(q)
    recentAssessments.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching assessments:', error)
  }
}

async function loadAssessment() {
  if (!selectedAssessmentId.value) {
    selectedAssessment.value = null
    return
  }

  try {
    const docRef = doc(db, 'assessments', selectedAssessmentId.value)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      selectedAssessment.value = { id: docSnap.id, ...docSnap.data() }
    }
    
    // Reset expanded state
    expandedDimension.value = ''
    detailedExplanation.value = null
    appealReason.value = ''
  } catch (error) {
    console.error('Error loading assessment:', error)
  }
}

async function requestDetailedExplanation(dimension) {
  if (expandedDimension.value === dimension) {
    expandedDimension.value = ''
    detailedExplanation.value = null
    return
  }

  expandedDimension.value = dimension
  loadingExplanation.value = true
  detailedExplanation.value = null

  try {
    // Call Cloud Function for detailed explanation
    const response = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/getDetailedExplanation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentId: selectedAssessment.value.id,
        dimension,
        question: selectedAssessment.value.question,
        answer: selectedAssessment.value.studentAnswer,
        score: selectedAssessment.value.rubricScores?.[dimension] || 0
      })
    })

    if (response.ok) {
      const data = await response.json()
      detailedExplanation.value = data.explanation
    } else {
      // Fallback explanation
      detailedExplanation.value = generateFallbackExplanation(dimension)
    }
  } catch (error) {
    console.error('Error getting explanation:', error)
    detailedExplanation.value = generateFallbackExplanation(dimension)
  } finally {
    loadingExplanation.value = false
  }
}

function generateFallbackExplanation(dimension) {
  const score = selectedAssessment.value.rubricScores?.[dimension] || 0
  const dimLabel = getDimensionLabel(dimension)
  
  return {
    strengths: score >= 3 
      ? `คำตอบแสดงให้เห็นถึง${dimLabel}ในระดับที่น่าพอใจ`
      : 'ยังมีโอกาสในการพัฒนา',
    improvements: score < 4
      ? `ลองเพิ่มรายละเอียดที่แสดงถึง${dimLabel}ให้มากขึ้น`
      : 'คุณทำได้ดีมากแล้ว',
    example: 'คำตอบตัวอย่างจะขึ้นอยู่กับคำถามเฉพาะ',
    criteria: scoreDescriptions[dimension]?.[score] || 'ไม่มีข้อมูล'
  }
}

async function submitAppeal() {
  if (!appealReason.value) return

  try {
    await addDoc(collection(db, 'appeals'), {
      assessmentId: selectedAssessment.value.id,
      studentId: authStore.user.uid,
      reason: appealReason.value,
      originalScores: selectedAssessment.value.rubricScores,
      status: 'pending',
      createdAt: serverTimestamp()
    })

    alert('ส่งคำขออุทธรณ์เรียบร้อยแล้ว ครูผู้สอนจะพิจารณาภายใน 3-5 วันทำการ')
    appealReason.value = ''
  } catch (error) {
    console.error('Error submitting appeal:', error)
    alert('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง')
  }
}

function calculateTotal(scores) {
  if (!scores) return 0
  return Object.values(scores).reduce((sum, s) => sum + (s || 0), 0)
}

function getScoreClass(score) {
  if (score >= 4) return 'excellent'
  if (score >= 3) return 'good'
  if (score >= 2) return 'fair'
  return 'needs-work'
}

function getScoreDescription(dimension, score) {
  return scoreDescriptions[dimension]?.[score || 0] || 'ไม่มีข้อมูล'
}

function getDimensionLabel(key) {
  return dimensions.find(d => d.key === key)?.label || key
}

function getConfidenceClass(confidence) {
  const c = confidence || 0.5
  if (c >= 0.8) return 'high'
  if (c >= 0.6) return 'medium'
  return 'low'
}

function getConfidenceExplanation(confidence) {
  const c = confidence || 0.5
  if (c >= 0.8) {
    return 'AI มีความมั่นใจสูงในการประเมินนี้ คะแนนมีความน่าเชื่อถือ'
  }
  if (c >= 0.6) {
    return 'AI มีความมั่นใจปานกลาง อาจมีความไม่แน่นอนในบางด้าน'
  }
  return 'AI มีความมั่นใจต่ำ แนะนำให้ขอการตรวจสอบจากครูผู้สอน'
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function truncate(text, length) {
  if (!text) return ''
  return text.length > length ? text.slice(0, length) + '...' : text
}
</script>

<style scoped>
.right-to-explanation {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  color: var(--primary-color);
}

.subtitle {
  color: var(--text-secondary);
}

.assessment-selector {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.assessment-selector h2 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
}

.assessment-selector select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--card-bg);
}

.explanation-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
}

.section h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.qa-box {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
}

.qa-item {
  margin-bottom: 1rem;
}

.qa-item:last-child {
  margin-bottom: 0;
}

.qa-item label {
  font-weight: 600;
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

.qa-item p {
  margin: 0;
  line-height: 1.6;
}

.scores-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.score-card {
  padding: 1rem;
  border-radius: 8px;
  background: var(--bg-secondary);
  border-left: 4px solid var(--border-color);
}

.score-card.excellent { border-left-color: #10b981; }
.score-card.good { border-left-color: #3b82f6; }
.score-card.fair { border-left-color: #f59e0b; }
.score-card.needs-work { border-left-color: #ef4444; }

.score-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.dim-icon {
  font-size: 1.25rem;
}

.dim-name {
  font-weight: 600;
}

.score-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary-color);
}

.score-description {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.total-score-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--primary-bg);
  border-radius: 8px;
  font-weight: 600;
}

.total-score-box .total {
  font-size: 1.5rem;
  color: var(--primary-color);
}

.explanation-box {
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 8px;
  line-height: 1.8;
}

.no-feedback {
  color: var(--text-secondary);
  font-style: italic;
}

.detailed-options {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.detail-btn {
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s;
}

.detail-btn:hover {
  border-color: var(--primary-color);
}

.detail-btn.active {
  border-color: var(--primary-color);
  background: var(--primary-bg);
}

.detailed-explanation {
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.detailed-explanation h4 {
  margin: 0 0 1rem 0;
  color: var(--primary-color);
}

.loading {
  text-align: center;
  padding: 2rem;
}

.spinner {
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

.explanation-content-box {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.explanation-section {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.explanation-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.explanation-section strong {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.explanation-section p {
  margin: 0;
  color: var(--text-secondary);
}

.explanation-section .example {
  background: var(--card-bg);
  padding: 1rem;
  border-radius: 4px;
  font-style: italic;
}

.appeal-description {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.appeal-form textarea {
  width: 100%;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  resize: vertical;
  font-family: inherit;
  margin-bottom: 1rem;
}

.appeal-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.appeal-note {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.confidence-display {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.confidence-bar {
  flex: 1;
  height: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s;
}

.confidence-fill.high { background: #10b981; }
.confidence-fill.medium { background: #f59e0b; }
.confidence-fill.low { background: #ef4444; }

.confidence-value {
  font-weight: bold;
  min-width: 50px;
}

.confidence-explanation {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.audit-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.audit-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 4px;
}

.audit-item.warning {
  background: var(--warning-bg);
}

.audit-item .label {
  color: var(--text-secondary);
}

.audit-item .value {
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: var(--card-bg);
  border-radius: 12px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .scores-grid {
    grid-template-columns: 1fr;
  }
  
  .audit-info {
    grid-template-columns: 1fr;
  }
}
</style>
