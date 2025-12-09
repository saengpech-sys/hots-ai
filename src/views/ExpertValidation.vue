<template>
  <div class="expert-validation">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <router-link to="/teacher" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <div class="header-text">
          <h1>🔬 Expert Validation</h1>
          <p>ตรวจสอบความถูกต้องของคะแนน AI (RQ2: Validity Study)</p>
        </div>
      </div>
      
      <div class="header-stats">
        <div class="stat">
          <span class="stat-value">{{ validatedCount }}</span>
          <span class="stat-label">ตรวจแล้ว</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ pendingCount }}</span>
          <span class="stat-label">รอตรวจ</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ agreementRate }}%</span>
          <span class="stat-label">Agreement Rate</span>
        </div>
      </div>
    </div>

    <!-- Session Info -->
    <div v-if="!validationSession" class="start-session card">
      <h2>เริ่ม Validation Session</h2>
      <p>เลือกการตั้งค่าสำหรับการตรวจสอบคะแนน</p>
      
      <div class="session-options">
        <div class="form-group">
          <label>เลือกรายวิชา</label>
          <select v-model="selectedCourseId" class="form-control">
            <option value="">-- ทุกรายวิชา --</option>
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.courseCode }} - {{ course.courseName }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label>จำนวนตัวอย่าง</label>
          <select v-model="sampleSize" class="form-control">
            <option :value="10">10 คำตอบ</option>
            <option :value="20">20 คำตอบ</option>
            <option :value="50">50 คำตอบ</option>
            <option :value="100">100 คำตอบ</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>กลยุทธ์การสุ่ม</label>
          <select v-model="samplingStrategy" class="form-control">
            <option value="random">สุ่มทั่วไป</option>
            <option value="stratified">แบ่งตามคะแนน (ต่ำ/กลาง/สูง)</option>
            <option value="recent">ล่าสุด</option>
            <option value="unvalidated">ยังไม่เคยตรวจ</option>
          </select>
        </div>

        <div class="form-group">
          <label>ประเภทการตรวจ</label>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" v-model="validationType" value="single" />
              <span>Single Rater</span>
            </label>
            <label class="radio-option">
              <input type="radio" v-model="validationType" value="double" />
              <span>Double Blind (IRR)</span>
            </label>
          </div>
        </div>
      </div>
      
      <button class="btn btn-primary btn-lg" @click="startSession" :disabled="loadingSession">
        <span class="material-icons">play_arrow</span>
        {{ loadingSession ? 'กำลังโหลด...' : 'เริ่มตรวจสอบ' }}
      </button>
    </div>

    <!-- Validation Interface -->
    <div v-else class="validation-interface">
      <!-- Progress Bar -->
      <div class="progress-section">
        <div class="progress-info">
          <span>คำตอบที่ {{ currentIndex + 1 }} / {{ assessmentsToValidate.length }}</span>
          <span>{{ Math.round((currentIndex / assessmentsToValidate.length) * 100) }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${(currentIndex / assessmentsToValidate.length) * 100}%` }"></div>
        </div>
      </div>

      <!-- Current Assessment -->
      <div v-if="currentAssessment" class="assessment-panel">
        <!-- Question Context -->
        <div class="question-section card">
          <h3>📝 คำถาม</h3>
          <div class="question-text">{{ currentAssessment.questionContext }}</div>
          <div v-if="currentAssessment.questionData?.relatedLOs" class="related-los">
            <span class="lo-tag" v-for="lo in currentAssessment.questionData.relatedLOs" :key="lo">{{ lo }}</span>
          </div>
        </div>

        <!-- Student Answer -->
        <div class="answer-section card">
          <h3>💬 คำตอบนักเรียน</h3>
          <div class="answer-text">{{ currentAssessment.rawAnswer }}</div>
          <div class="answer-meta">
            <span v-if="currentAssessment.answerMetrics">
              📊 {{ currentAssessment.answerMetrics.wordCount }} คำ | 
              {{ currentAssessment.answerMetrics.charCount }} ตัวอักษร
            </span>
            <span v-if="currentAssessment.timingMetrics">
              ⏱️ {{ formatDuration(currentAssessment.timingMetrics.answerDurationMs) }}
            </span>
          </div>
        </div>

        <!-- Scoring Panel -->
        <div class="scoring-panel">
          <!-- AI Score (Hidden initially if blind mode) -->
          <div class="ai-score-section card" :class="{ 'blur': blindMode && !showAiScore }">
            <div class="section-header">
              <h3>🤖 คะแนนจาก AI</h3>
              <button v-if="blindMode && !showAiScore" class="btn btn-sm" @click="showAiScore = true">
                เปิดดู
              </button>
            </div>
            <div class="arce-scores">
              <div class="score-item analysis">
                <span class="label">A - วิเคราะห์</span>
                <span class="score">{{ currentAssessment.rubricScores.analysis }}/5</span>
              </div>
              <div class="score-item reasoning">
                <span class="label">R - เหตุผล</span>
                <span class="score">{{ currentAssessment.rubricScores.reasoning }}/5</span>
              </div>
              <div class="score-item creativity">
                <span class="label">C - สร้างสรรค์</span>
                <span class="score">{{ currentAssessment.rubricScores.creativity }}/5</span>
              </div>
              <div class="score-item evidence">
                <span class="label">E - หลักฐาน</span>
                <span class="score">{{ currentAssessment.rubricScores.evidence }}/5</span>
              </div>
            </div>
            <div class="total-score">รวม: {{ currentAssessment.overallScore }}/20</div>
          </div>

          <!-- Expert Score Input -->
          <div class="expert-score-section card">
            <h3>👨‍🏫 คะแนนจากผู้เชี่ยวชาญ</h3>
            
            <div class="score-inputs">
              <div class="score-input-group">
                <label>A - การวิเคราะห์</label>
                <div class="score-slider">
                  <input type="range" v-model.number="expertScores.analysis" min="0" max="5" step="1" />
                  <span class="score-value">{{ expertScores.analysis }}</span>
                </div>
                <p class="rubric-hint">แยกแยะประเด็น เปรียบเทียบ ระบุความสัมพันธ์</p>
              </div>
              
              <div class="score-input-group">
                <label>R - การให้เหตุผล</label>
                <div class="score-slider">
                  <input type="range" v-model.number="expertScores.reasoning" min="0" max="5" step="1" />
                  <span class="score-value">{{ expertScores.reasoning }}</span>
                </div>
                <p class="rubric-hint">อธิบายเหตุผล สรุปความ ลำดับความคิด</p>
              </div>
              
              <div class="score-input-group">
                <label>C - ความคิดสร้างสรรค์</label>
                <div class="score-slider">
                  <input type="range" v-model.number="expertScores.creativity" min="0" max="5" step="1" />
                  <span class="score-value">{{ expertScores.creativity }}</span>
                </div>
                <p class="rubric-hint">แนวคิดใหม่ มุมมองแปลกใหม่ ประยุกต์ใช้</p>
              </div>
              
              <div class="score-input-group">
                <label>E - การใช้หลักฐาน</label>
                <div class="score-slider">
                  <input type="range" v-model.number="expertScores.evidence" min="0" max="5" step="1" />
                  <span class="score-value">{{ expertScores.evidence }}</span>
                </div>
                <p class="rubric-hint">อ้างอิงข้อมูล ตัวอย่างประกอบ สนับสนุนคำตอบ</p>
              </div>
            </div>
            
            <div class="expert-total">
              รวม: {{ expertTotal }}/20
              <span v-if="showAiScore" class="diff" :class="diffClass">
                ({{ diffText }})
              </span>
            </div>

            <div class="form-group">
              <label>หมายเหตุ (ถ้ามี)</label>
              <textarea v-model="expertNotes" class="form-control" rows="2" placeholder="บันทึกเหตุผลหรือข้อสังเกต..."></textarea>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="validation-actions">
          <button class="btn btn-outline" @click="skipAssessment" :disabled="saving">
            <span class="material-icons">skip_next</span>
            ข้าม
          </button>
          <button class="btn btn-primary btn-lg" @click="submitValidation" :disabled="saving">
            <span class="material-icons">check</span>
            {{ saving ? 'กำลังบันทึก...' : 'บันทึก & ถัดไป' }}
          </button>
        </div>
      </div>

      <!-- Session Complete -->
      <div v-else class="session-complete card">
        <div class="complete-icon">✅</div>
        <h2>ตรวจสอบครบแล้ว!</h2>
        <p>คุณได้ตรวจสอบทั้งหมด {{ validatedInSession }} คำตอบ</p>
        
        <div class="session-stats">
          <div class="stat-item">
            <span class="label">Agreement Rate</span>
            <span class="value">{{ sessionAgreementRate }}%</span>
          </div>
          <div class="stat-item">
            <span class="label">Average Difference</span>
            <span class="value">{{ avgDifference }} คะแนน</span>
          </div>
        </div>

        <div class="complete-actions">
          <button class="btn btn-outline" @click="endSession">
            จบ Session
          </button>
          <button class="btn btn-primary" @click="loadMoreSamples">
            ตรวจเพิ่มอีก
          </button>
        </div>
      </div>
    </div>

    <!-- Rubric Reference Modal -->
    <div v-if="showRubricModal" class="modal-overlay" @click.self="showRubricModal = false">
      <div class="modal-content rubric-modal">
        <div class="modal-header">
          <h3>📋 เกณฑ์การให้คะแนน A.R.C.E.</h3>
          <button class="btn-close" @click="showRubricModal = false">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="rubric-table">
            <table>
              <thead>
                <tr>
                  <th>ระดับ</th>
                  <th>Analysis</th>
                  <th>Reasoning</th>
                  <th>Creativity</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>5</strong></td>
                  <td>วิเคราะห์ลึกซึ้ง ครบทุกมิติ</td>
                  <td>เหตุผลชัดเจน ลำดับสมบูรณ์</td>
                  <td>แนวคิดใหม่โดดเด่น</td>
                  <td>หลักฐานหลากหลาย น่าเชื่อถือ</td>
                </tr>
                <tr>
                  <td><strong>4</strong></td>
                  <td>วิเคราะห์ดี เกือบครบ</td>
                  <td>เหตุผลดี มีบางจุดขาด</td>
                  <td>มีความคิดสร้างสรรค์</td>
                  <td>หลักฐานเพียงพอ</td>
                </tr>
                <tr>
                  <td><strong>3</strong></td>
                  <td>วิเคราะห์ปานกลาง</td>
                  <td>เหตุผลพอใช้</td>
                  <td>มีบ้างแต่ไม่โดดเด่น</td>
                  <td>หลักฐานบางส่วน</td>
                </tr>
                <tr>
                  <td><strong>2</strong></td>
                  <td>วิเคราะห์ผิวเผิน</td>
                  <td>เหตุผลไม่ชัด</td>
                  <td>แทบไม่มี</td>
                  <td>หลักฐานน้อย</td>
                </tr>
                <tr>
                  <td><strong>1</strong></td>
                  <td>แทบไม่มีการวิเคราะห์</td>
                  <td>ไม่มีเหตุผล</td>
                  <td>ไม่มี</td>
                  <td>ไม่มีหลักฐาน</td>
                </tr>
                <tr>
                  <td><strong>0</strong></td>
                  <td colspan="4">ไม่ตอบ / ไม่เกี่ยวข้อง</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Rubric Button -->
    <button class="fab-rubric" @click="showRubricModal = true" title="ดูเกณฑ์การให้คะแนน">
      <span class="material-icons">help_outline</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { collection, query, where, getDocs, doc, updateDoc, addDoc, orderBy, limit, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// Session State
const validationSession = ref(null)
const loadingSession = ref(false)
const selectedCourseId = ref('')
const sampleSize = ref(20)
const samplingStrategy = ref('unvalidated')
const validationType = ref('single')
const blindMode = ref(true)
const showAiScore = ref(false)

// Data
const courses = ref([])
const assessmentsToValidate = ref([])
const currentIndex = ref(0)
const saving = ref(false)

// Expert Scoring
const expertScores = ref({
  analysis: 3,
  reasoning: 3,
  creativity: 3,
  evidence: 3
})
const expertNotes = ref('')

// Stats
const validatedCount = ref(0)
const pendingCount = ref(0)
const validatedInSession = ref(0)
const sessionValidations = ref([])

// UI
const showRubricModal = ref(false)

// Computed
const currentAssessment = computed(() => {
  if (currentIndex.value < assessmentsToValidate.value.length) {
    return assessmentsToValidate.value[currentIndex.value]
  }
  return null
})

const expertTotal = computed(() => {
  return expertScores.value.analysis + expertScores.value.reasoning + 
         expertScores.value.creativity + expertScores.value.evidence
})

const diffClass = computed(() => {
  if (!currentAssessment.value) return ''
  const diff = expertTotal.value - currentAssessment.value.overallScore
  if (Math.abs(diff) <= 2) return 'good'
  if (Math.abs(diff) <= 4) return 'moderate'
  return 'poor'
})

const diffText = computed(() => {
  if (!currentAssessment.value) return ''
  const diff = expertTotal.value - currentAssessment.value.overallScore
  if (diff === 0) return 'เท่ากัน'
  return diff > 0 ? `+${diff}` : `${diff}`
})

const agreementRate = computed(() => {
  if (sessionValidations.value.length === 0) return 0
  const goodAgreements = sessionValidations.value.filter(v => Math.abs(v.diff) <= 2).length
  return Math.round((goodAgreements / sessionValidations.value.length) * 100)
})

const sessionAgreementRate = computed(() => agreementRate.value)

const avgDifference = computed(() => {
  if (sessionValidations.value.length === 0) return 0
  const totalDiff = sessionValidations.value.reduce((sum, v) => sum + Math.abs(v.diff), 0)
  return (totalDiff / sessionValidations.value.length).toFixed(1)
})

// Methods
async function loadCourses() {
  try {
    const coursesRef = collection(db, 'courses')
    const q = query(coursesRef, where('teacherId', '==', authStore.user.uid))
    const snapshot = await getDocs(q)
    courses.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading courses:', error)
  }
}

async function loadStats() {
  try {
    // Count validated
    const validatedQuery = query(
      collection(db, 'assessments'),
      where('expertValidation.isValidated', '==', true)
    )
    const validatedSnapshot = await getDocs(validatedQuery)
    validatedCount.value = validatedSnapshot.size

    // Count pending (total - validated)
    const totalQuery = query(collection(db, 'assessments'), limit(1000))
    const totalSnapshot = await getDocs(totalQuery)
    pendingCount.value = totalSnapshot.size - validatedCount.value
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

async function startSession() {
  loadingSession.value = true
  
  try {
    // Build query based on settings
    let q
    const assessmentsRef = collection(db, 'assessments')
    
    if (selectedCourseId.value) {
      if (samplingStrategy.value === 'unvalidated') {
        q = query(
          assessmentsRef,
          where('courseId', '==', selectedCourseId.value),
          limit(sampleSize.value * 2)
        )
      } else {
        q = query(
          assessmentsRef,
          where('courseId', '==', selectedCourseId.value),
          orderBy('createdAt', 'desc'),
          limit(sampleSize.value * 2)
        )
      }
    } else {
      if (samplingStrategy.value === 'recent') {
        q = query(
          assessmentsRef,
          orderBy('createdAt', 'desc'),
          limit(sampleSize.value * 2)
        )
      } else {
        q = query(
          assessmentsRef,
          limit(sampleSize.value * 2)
        )
      }
    }
    
    const snapshot = await getDocs(q)
    let assessments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    // Filter unvalidated if needed
    if (samplingStrategy.value === 'unvalidated') {
      assessments = assessments.filter(a => !a.expertValidation?.isValidated)
    }
    
    // Stratified sampling
    if (samplingStrategy.value === 'stratified') {
      const low = assessments.filter(a => a.overallScore <= 7)
      const mid = assessments.filter(a => a.overallScore > 7 && a.overallScore <= 14)
      const high = assessments.filter(a => a.overallScore > 14)
      
      const perGroup = Math.ceil(sampleSize.value / 3)
      assessments = [
        ...low.slice(0, perGroup),
        ...mid.slice(0, perGroup),
        ...high.slice(0, perGroup)
      ]
    }
    
    // Random shuffle
    assessments = assessments.sort(() => Math.random() - 0.5)
    
    // Take sample size
    assessmentsToValidate.value = assessments.slice(0, sampleSize.value)
    
    // Create session
    validationSession.value = {
      id: `session_${Date.now()}`,
      startedAt: new Date(),
      expertId: authStore.user.uid,
      settings: {
        courseId: selectedCourseId.value,
        sampleSize: sampleSize.value,
        strategy: samplingStrategy.value,
        type: validationType.value
      }
    }
    
    currentIndex.value = 0
    sessionValidations.value = []
    validatedInSession.value = 0
    
    // Reset scores
    resetScores()
    
  } catch (error) {
    console.error('Error starting session:', error)
    alert('เกิดข้อผิดพลาดในการโหลดข้อมูล')
  } finally {
    loadingSession.value = false
  }
}

function resetScores() {
  expertScores.value = { analysis: 3, reasoning: 3, creativity: 3, evidence: 3 }
  expertNotes.value = ''
  showAiScore.value = !blindMode.value
}

async function submitValidation() {
  if (!currentAssessment.value) return
  
  saving.value = true
  
  try {
    const assessment = currentAssessment.value
    const aiTotal = assessment.overallScore
    const diff = expertTotal.value - aiTotal
    
    // Calculate agreement score (0-1)
    const maxPossibleDiff = 20
    const agreementScore = 1 - (Math.abs(diff) / maxPossibleDiff)
    
    // Update assessment with expert validation
    await updateDoc(doc(db, 'assessments', assessment.id), {
      expertValidation: {
        isValidated: true,
        expertScores: { ...expertScores.value },
        expertId: authStore.user.uid,
        expertNotes: expertNotes.value || null,
        validatedAt: new Date(),
        agreementScore: Math.round(agreementScore * 100) / 100,
        scoreDifference: diff
      }
    })
    
    // Track in session
    sessionValidations.value.push({
      assessmentId: assessment.id,
      aiScore: aiTotal,
      expertScore: expertTotal.value,
      diff: diff
    })
    
    validatedInSession.value++
    validatedCount.value++
    pendingCount.value--
    
    // Move to next
    currentIndex.value++
    resetScores()
    
  } catch (error) {
    console.error('Error saving validation:', error)
    alert('เกิดข้อผิดพลาดในการบันทึก')
  } finally {
    saving.value = false
  }
}

function skipAssessment() {
  currentIndex.value++
  resetScores()
}

function endSession() {
  validationSession.value = null
  assessmentsToValidate.value = []
  currentIndex.value = 0
}

async function loadMoreSamples() {
  currentIndex.value = 0
  await startSession()
}

function formatDuration(ms) {
  if (!ms) return '-'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  if (minutes > 0) {
    return `${minutes} นาที ${seconds % 60} วินาที`
  }
  return `${seconds} วินาที`
}

onMounted(async () => {
  await loadCourses()
  await loadStats()
})
</script>

<style scoped>
.expert-validation {
  min-height: 100vh;
  background: var(--bg-primary);
  padding: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  text-decoration: none;
}

.header-text h1 {
  margin: 0;
  font-size: 1.5rem;
}

.header-text p {
  margin: 0.25rem 0 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.header-stats {
  display: flex;
  gap: 1.5rem;
}

.header-stats .stat {
  text-align: center;
}

.header-stats .stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #10b981;
}

.header-stats .stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Card */
.card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
}

/* Start Session */
.start-session {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

.start-session h2 {
  margin: 0 0 0.5rem;
}

.start-session > p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.session-options {
  text-align: left;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.radio-group {
  display: flex;
  gap: 1rem;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

/* Progress Section */
.progress-section {
  margin-bottom: 1.5rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.progress-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #3b82f6);
  border-radius: 4px;
  transition: width 0.3s;
}

/* Assessment Panel */
.assessment-panel {
  display: grid;
  gap: 1.5rem;
}

.question-section h3,
.answer-section h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
}

.question-text {
  line-height: 1.6;
  white-space: pre-wrap;
}

.related-los {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.lo-tag {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
}

.answer-text {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 8px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.answer-meta {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  gap: 1rem;
}

/* Scoring Panel */
.scoring-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .scoring-panel {
    grid-template-columns: 1fr;
  }
}

.ai-score-section.blur {
  filter: blur(8px);
  user-select: none;
  position: relative;
}

.ai-score-section.blur::after {
  content: '🔒 คลิกเพื่อเปิดดู';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--bg-secondary);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  filter: none;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h3 {
  margin: 0;
}

.arce-scores {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.score-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--bg-primary);
}

.score-item.analysis { border-left: 3px solid #3b82f6; }
.score-item.reasoning { border-left: 3px solid #10b981; }
.score-item.creativity { border-left: 3px solid #f59e0b; }
.score-item.evidence { border-left: 3px solid #8b5cf6; }

.score-item .score {
  font-weight: 700;
}

.total-score {
  margin-top: 1rem;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 700;
}

/* Expert Score Section */
.score-inputs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.score-input-group label {
  font-weight: 500;
  margin-bottom: 0.25rem;
  display: block;
}

.score-slider {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.score-slider input[type="range"] {
  flex: 1;
  height: 8px;
  -webkit-appearance: none;
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.score-slider input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
}

.score-value {
  font-size: 1.25rem;
  font-weight: 700;
  min-width: 30px;
  text-align: center;
}

.rubric-hint {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.expert-total {
  margin-top: 1rem;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 700;
}

.diff {
  margin-left: 0.5rem;
  font-size: 1rem;
}

.diff.good { color: #10b981; }
.diff.moderate { color: #f59e0b; }
.diff.poor { color: #ef4444; }

/* Validation Actions */
.validation-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

/* Session Complete */
.session-complete {
  max-width: 500px;
  margin: 0 auto;
  text-align: center;
}

.complete-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.session-stats {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin: 1.5rem 0;
}

.stat-item {
  text-align: center;
}

.stat-item .label {
  display: block;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.stat-item .value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #10b981;
}

.complete-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-outline:hover {
  background: var(--bg-tertiary);
}

.btn-lg {
  padding: 1rem 2rem;
  font-size: 1rem;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* FAB */
.fab-rubric {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.fab-rubric:hover {
  transform: scale(1.1);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: 16px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
}

.modal-body {
  padding: 1.5rem;
}

.rubric-table table {
  width: 100%;
  border-collapse: collapse;
}

.rubric-table th,
.rubric-table td {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  text-align: left;
  font-size: 0.875rem;
}

.rubric-table th {
  background: var(--bg-tertiary);
  font-weight: 600;
}

.rubric-table tr:nth-child(even) {
  background: var(--bg-primary);
}
</style>
