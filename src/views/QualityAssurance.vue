<template>
  <div class="quality-assurance">
    <div class="header">
      <h1>📊 Quality Assurance Dashboard</h1>
      <p class="subtitle">ระบบควบคุมคุณภาพการประเมิน HOTS</p>
    </div>

    <!-- Tab Navigation -->
    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
        <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Fairness Report Tab -->
      <div v-if="activeTab === 'fairness'" class="fairness-panel">
        <div class="panel-header">
          <h2>📈 รายงานความเป็นธรรม (Fairness Report)</h2>
          <div class="controls">
            <select v-model="selectedCourse" @change="loadFairnessReport">
              <option value="">เลือกรายวิชา</option>
              <option v-for="course in courses" :key="course.id" :value="course.id">
                {{ course.name }}
              </option>
            </select>
            <select v-model="selectedPeriod">
              <option value="7d">7 วัน</option>
              <option value="30d">30 วัน</option>
              <option value="90d">90 วัน</option>
              <option value="all">ทั้งหมด</option>
            </select>
            <button class="btn-primary" @click="loadFairnessReport" :disabled="loading.fairness">
              {{ loading.fairness ? 'กำลังโหลด...' : 'สร้างรายงาน' }}
            </button>
          </div>
        </div>

        <div v-if="fairnessReport" class="fairness-content">
          <!-- Overall Metrics -->
          <div class="metrics-grid">
            <div class="metric-card" :class="getFairnessStatus(fairnessReport.overallFairness)">
              <div class="metric-label">ความเป็นธรรมโดยรวม</div>
              <div class="metric-value">{{ (fairnessReport.overallFairness * 100).toFixed(1) }}%</div>
              <div class="metric-status">{{ getFairnessLabel(fairnessReport.overallFairness) }}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">จำนวนการประเมิน</div>
              <div class="metric-value">{{ fairnessReport.totalAssessments }}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">กลุ่มที่วิเคราะห์</div>
              <div class="metric-value">{{ fairnessReport.groupsAnalyzed }}</div>
            </div>
            <div class="metric-card" :class="fairnessReport.concerns?.length > 0 ? 'warning' : 'good'">
              <div class="metric-label">ข้อกังวล</div>
              <div class="metric-value">{{ fairnessReport.concerns?.length || 0 }}</div>
            </div>
          </div>

          <!-- Pairwise Comparisons -->
          <div v-if="fairnessReport.pairwiseAnalysis" class="pairwise-section">
            <h3>📊 การเปรียบเทียบระหว่างกลุ่ม</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>มิติ</th>
                  <th>กลุ่ม A</th>
                  <th>กลุ่ม B</th>
                  <th>Cohen's d</th>
                  <th>ความแตกต่าง</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(comparison, idx) in fairnessReport.pairwiseAnalysis" :key="idx">
                  <td>{{ comparison.dimension }}</td>
                  <td>{{ comparison.groupA }} (M={{ comparison.meanA?.toFixed(2) }})</td>
                  <td>{{ comparison.groupB }} (M={{ comparison.meanB?.toFixed(2) }})</td>
                  <td :class="getEffectSizeClass(comparison.cohensD)">
                    {{ comparison.cohensD?.toFixed(3) }}
                  </td>
                  <td>{{ comparison.effectSize }}</td>
                  <td>
                    <span :class="['status-badge', comparison.isFair ? 'fair' : 'unfair']">
                      {{ comparison.isFair ? '✓ เป็นธรรม' : '⚠️ ควรตรวจสอบ' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Concerns -->
          <div v-if="fairnessReport.concerns?.length > 0" class="concerns-section">
            <h3>⚠️ ข้อกังวลที่ควรตรวจสอบ</h3>
            <div class="concern-list">
              <div v-for="(concern, idx) in fairnessReport.concerns" :key="idx" class="concern-item">
                <span class="concern-icon">⚠️</span>
                <div class="concern-content">
                  <div class="concern-title">{{ concern.dimension }} - {{ concern.attribute }}</div>
                  <div class="concern-description">{{ concern.description }}</div>
                  <div class="concern-recommendation">💡 {{ concern.recommendation }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="!loading.fairness" class="empty-state">
          <span class="empty-icon">📊</span>
          <p>เลือกรายวิชาและช่วงเวลาเพื่อสร้างรายงานความเป็นธรรม</p>
        </div>
      </div>

      <!-- Review Queue Tab -->
      <div v-if="activeTab === 'review'" class="review-panel">
        <div class="panel-header">
          <h2>👁️ คิวรอการตรวจสอบ (Review Queue)</h2>
          <div class="controls">
            <select v-model="reviewFilter">
              <option value="pending">รอตรวจสอบ</option>
              <option value="in_progress">กำลังตรวจสอบ</option>
              <option value="completed">เสร็จแล้ว</option>
              <option value="all">ทั้งหมด</option>
            </select>
            <button class="btn-secondary" @click="loadReviewQueue">
              🔄 รีเฟรช
            </button>
          </div>
        </div>

        <div v-if="reviewQueue.length > 0" class="review-list">
          <div 
            v-for="item in reviewQueue" 
            :key="item.id" 
            class="review-item"
            :class="getPriorityClass(item.priority)"
          >
            <div class="review-priority">
              <span class="priority-badge" :class="item.priority">
                {{ getPriorityLabel(item.priority) }}
              </span>
            </div>
            <div class="review-info">
              <div class="review-reason">{{ item.reason }}</div>
              <div class="review-meta">
                <span>🧑‍🎓 นักเรียน: {{ item.studentName || item.studentId }}</span>
                <span>📅 {{ formatDate(item.createdAt) }}</span>
                <span v-if="item.aiConfidence">🤖 AI Confidence: {{ (item.aiConfidence * 100).toFixed(0) }}%</span>
              </div>
              <div class="review-scores">
                <span v-for="(score, dim) in item.rubricScores" :key="dim" class="score-chip">
                  {{ getDimensionLabel(dim) }}: {{ score }}/5
                </span>
              </div>
            </div>
            <div class="review-actions">
              <button class="btn-primary" @click="openReviewModal(item)">
                ✏️ ตรวจสอบ
              </button>
              <button class="btn-secondary" @click="viewAssessmentDetail(item)">
                👁️ ดูรายละเอียด
              </button>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <span class="empty-icon">✅</span>
          <p>ไม่มีรายการรอตรวจสอบ</p>
        </div>
      </div>

      <!-- Calibration Tab -->
      <div v-if="activeTab === 'calibration'" class="calibration-panel">
        <div class="panel-header">
          <h2>🎯 รายงาน Calibration</h2>
          <div class="controls">
            <select v-model="selectedCourse" @change="loadCalibrationReport">
              <option value="">เลือกรายวิชา</option>
              <option v-for="course in courses" :key="course.id" :value="course.id">
                {{ course.name }}
              </option>
            </select>
            <button class="btn-primary" @click="loadCalibrationReport" :disabled="loading.calibration">
              สร้างรายงาน
            </button>
          </div>
        </div>

        <div v-if="calibrationReport" class="calibration-content">
          <div class="metrics-grid">
            <div class="metric-card" :class="calibrationReport.meetsStandard ? 'good' : 'warning'">
              <div class="metric-label">Cohen's Kappa</div>
              <div class="metric-value">{{ calibrationReport.cohensKappa?.toFixed(3) }}</div>
              <div class="metric-status">{{ getKappaInterpretation(calibrationReport.cohensKappa) }}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Percent Agreement</div>
              <div class="metric-value">{{ (calibrationReport.percentAgreement * 100).toFixed(1) }}%</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">จำนวนผู้เชี่ยวชาญ</div>
              <div class="metric-value">{{ calibrationReport.expertCount }}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">การประเมินที่ตรวจสอบ</div>
              <div class="metric-value">{{ calibrationReport.reviewedCount }}</div>
            </div>
          </div>

          <div v-if="calibrationReport.dimensionAgreement" class="dimension-agreement">
            <h3>📊 ความสอดคล้องรายมิติ</h3>
            <div class="agreement-bars">
              <div v-for="(agreement, dim) in calibrationReport.dimensionAgreement" :key="dim" class="agreement-row">
                <span class="dim-label">{{ getDimensionLabel(dim) }}</span>
                <div class="agreement-bar-container">
                  <div class="agreement-bar" :style="{ width: (agreement * 100) + '%' }"></div>
                </div>
                <span class="agreement-value">{{ (agreement * 100).toFixed(1) }}%</span>
              </div>
            </div>
          </div>

          <div v-if="!calibrationReport.meetsStandard" class="calibration-warning">
            <h3>⚠️ ต้องการ Calibration เพิ่มเติม</h3>
            <p>ค่า IRR ยังไม่ถึงเกณฑ์ที่ยอมรับได้สำหรับการวิจัย (κ ≥ 0.7)</p>
            <ul>
              <li>จัดประชุม calibration session กับผู้เชี่ยวชาญ</li>
              <li>ทบทวน rubric และเกณฑ์การให้คะแนน</li>
              <li>ฝึกอบรมเพิ่มเติมในมิติที่มีความไม่สอดคล้องสูง</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Grade Calibration Tab -->
      <div v-if="activeTab === 'grade'" class="grade-panel">
        <div class="panel-header">
          <h2>🎓 เกณฑ์ตามระดับชั้น</h2>
          <div class="controls">
            <select v-model="selectedGrade" @change="loadGradeCalibration">
              <option value="">เลือกระดับชั้น</option>
              <option value="ป.4">ป.4</option>
              <option value="ป.5">ป.5</option>
              <option value="ป.6">ป.6</option>
              <option value="ม.1">ม.1</option>
              <option value="ม.2">ม.2</option>
              <option value="ม.3">ม.3</option>
              <option value="ม.4">ม.4</option>
              <option value="ม.5">ม.5</option>
              <option value="ม.6">ม.6</option>
            </select>
          </div>
        </div>

        <div v-if="gradeCalibration" class="grade-content">
          <div class="cognitive-stage">
            <h3>🧠 ระยะพัฒนาการทางปัญญา</h3>
            <div class="stage-card">
              <div class="stage-name">{{ gradeCalibration.cognitiveStage?.name }}</div>
              <div class="stage-description">{{ gradeCalibration.cognitiveStage?.description }}</div>
              <div class="age-range">อายุ: {{ gradeCalibration.cognitiveStage?.ageRange }}</div>
            </div>
          </div>

          <div class="expected-ranges">
            <h3>📊 ช่วงคะแนนที่คาดหวัง</h3>
            <div class="range-grid">
              <div v-for="(range, dim) in gradeCalibration.expectedRanges" :key="dim" class="range-card">
                <div class="range-dim">{{ getDimensionLabel(dim) }}</div>
                <div class="range-values">
                  <span class="range-min">{{ range.min }}</span>
                  <span class="range-sep">-</span>
                  <span class="range-max">{{ range.max }}</span>
                </div>
                <div class="range-bar">
                  <div 
                    class="range-fill" 
                    :style="{ 
                      left: (range.min / 5 * 100) + '%',
                      width: ((range.max - range.min) / 5 * 100) + '%'
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div class="thresholds">
            <h3>🎯 เกณฑ์การผ่าน LO</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>มิติ</th>
                  <th>คะแนนขั้นต่ำ</th>
                  <th>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(threshold, dim) in gradeCalibration.adjustedThresholds" :key="dim">
                  <td>{{ getDimensionLabel(dim) }}</td>
                  <td>{{ threshold }}</td>
                  <td>{{ getThresholdNote(dim, threshold) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else class="empty-state">
          <span class="empty-icon">🎓</span>
          <p>เลือกระดับชั้นเพื่อดูเกณฑ์การประเมินที่เหมาะสม</p>
        </div>
      </div>
    </div>

    <!-- Expert Review Modal -->
    <div v-if="showReviewModal" class="modal-overlay" @click.self="closeReviewModal">
      <div class="modal-content review-modal">
        <div class="modal-header">
          <h2>✏️ Expert Review</h2>
          <button class="close-btn" @click="closeReviewModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="review-context">
            <h3>คำถาม</h3>
            <p class="question-text">{{ currentReview?.questionContext }}</p>
            
            <h3>คำตอบนักเรียน</h3>
            <p class="answer-text">{{ currentReview?.rawAnswer }}</p>
            
            <h3>คะแนนจาก AI</h3>
            <div class="ai-scores">
              <span v-for="(score, dim) in currentReview?.rubricScores" :key="dim" class="score-chip">
                {{ getDimensionLabel(dim) }}: {{ score }}/5
              </span>
            </div>
          </div>

          <div class="expert-scoring">
            <h3>คะแนนจากผู้เชี่ยวชาญ</h3>
            <div v-for="dim in dimensions" :key="dim" class="score-input-row">
              <label>{{ getDimensionLabel(dim) }}</label>
              <div class="score-buttons">
                <button 
                  v-for="n in 6" 
                  :key="n"
                  :class="['score-btn', { active: expertScores[dim] === n - 1 }]"
                  @click="expertScores[dim] = n - 1"
                >
                  {{ n - 1 }}
                </button>
              </div>
            </div>

            <div class="expert-notes">
              <label>หมายเหตุ</label>
              <textarea v-model="expertNotes" placeholder="บันทึกข้อสังเกตเพิ่มเติม..."></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeReviewModal">ยกเลิก</button>
          <button class="btn-primary" @click="submitExpertReview" :disabled="!isReviewComplete">
            ✅ บันทึก Expert Review
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL

// Tab state
const tabs = ref([
  { id: 'fairness', icon: '📈', label: 'Fairness Report', badge: null },
  { id: 'review', icon: '👁️', label: 'Review Queue', badge: 0 },
  { id: 'calibration', icon: '🎯', label: 'Calibration', badge: null },
  { id: 'grade', icon: '🎓', label: 'เกณฑ์ระดับชั้น', badge: null }
])
const activeTab = ref('fairness')

// Data
const courses = ref([])
const selectedCourse = ref('')
const selectedPeriod = ref('30d')
const selectedGrade = ref('')
const reviewFilter = ref('pending')

// Reports
const fairnessReport = ref(null)
const calibrationReport = ref(null)
const gradeCalibration = ref(null)
const reviewQueue = ref([])

// Loading states
const loading = ref({
  fairness: false,
  calibration: false,
  review: false,
  grade: false
})

// Review modal
const showReviewModal = ref(false)
const currentReview = ref(null)
const expertScores = ref({
  analysis: null,
  reasoning: null,
  creativity: null,
  evidence: null
})
const expertNotes = ref('')
const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']

// Computed
const isReviewComplete = computed(() => {
  return dimensions.every(dim => expertScores.value[dim] !== null)
})

// Methods
async function loadCourses() {
  try {
    const token = await auth.getIdToken()
    const response = await fetch(`${functionsUrl}/getCourses`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await response.json()
    courses.value = data.courses || []
  } catch (error) {
    console.error('Error loading courses:', error)
  }
}

async function loadFairnessReport() {
  if (!selectedCourse.value) return
  
  loading.value.fairness = true
  try {
    const token = await auth.getIdToken()
    const response = await fetch(`${functionsUrl}/getFairnessReport`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        courseId: selectedCourse.value,
        period: selectedPeriod.value
      })
    })
    fairnessReport.value = await response.json()
  } catch (error) {
    console.error('Error loading fairness report:', error)
  } finally {
    loading.value.fairness = false
  }
}

async function loadReviewQueue() {
  loading.value.review = true
  try {
    const token = await auth.getIdToken()
    const response = await fetch(`${functionsUrl}/getReviewQueue?status=${reviewFilter.value}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await response.json()
    reviewQueue.value = data.items || []
    
    // Update badge
    const pendingCount = data.items?.filter(i => i.status === 'pending').length || 0
    tabs.value.find(t => t.id === 'review').badge = pendingCount > 0 ? pendingCount : null
  } catch (error) {
    console.error('Error loading review queue:', error)
  } finally {
    loading.value.review = false
  }
}

async function loadCalibrationReport() {
  if (!selectedCourse.value) return
  
  loading.value.calibration = true
  try {
    const token = await auth.getIdToken()
    const response = await fetch(`${functionsUrl}/getCalibrationReport`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ courseId: selectedCourse.value })
    })
    calibrationReport.value = await response.json()
  } catch (error) {
    console.error('Error loading calibration report:', error)
  } finally {
    loading.value.calibration = false
  }
}

async function loadGradeCalibration() {
  if (!selectedGrade.value) return
  
  loading.value.grade = true
  try {
    const token = await auth.getIdToken()
    const response = await fetch(
      `${functionsUrl}/getGradeCalibration?gradeLevel=${encodeURIComponent(selectedGrade.value)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    gradeCalibration.value = await response.json()
  } catch (error) {
    console.error('Error loading grade calibration:', error)
  } finally {
    loading.value.grade = false
  }
}

function openReviewModal(item) {
  currentReview.value = item
  expertScores.value = {
    analysis: null,
    reasoning: null,
    creativity: null,
    evidence: null
  }
  expertNotes.value = ''
  showReviewModal.value = true
}

function closeReviewModal() {
  showReviewModal.value = false
  currentReview.value = null
}

async function submitExpertReview() {
  try {
    const token = await auth.getIdToken()
    await fetch(`${functionsUrl}/submitExpertReview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        reviewId: currentReview.value.id,
        expertScores: expertScores.value,
        notes: expertNotes.value
      })
    })
    
    closeReviewModal()
    loadReviewQueue()
  } catch (error) {
    console.error('Error submitting review:', error)
  }
}

function viewAssessmentDetail(item) {
  // Navigate to assessment detail
  window.open(`/assessment/${item.assessmentId}`, '_blank')
}

// Helper functions
function getDimensionLabel(dim) {
  const labels = {
    analysis: '🔍 การวิเคราะห์',
    reasoning: '💡 การให้เหตุผล',
    creativity: '🎨 ความคิดสร้างสรรค์',
    evidence: '📚 การใช้หลักฐาน'
  }
  return labels[dim] || dim
}

function getFairnessStatus(score) {
  if (score >= 0.9) return 'excellent'
  if (score >= 0.8) return 'good'
  if (score >= 0.7) return 'moderate'
  return 'warning'
}

function getFairnessLabel(score) {
  if (score >= 0.9) return 'ดีเยี่ยม'
  if (score >= 0.8) return 'ดี'
  if (score >= 0.7) return 'พอใช้'
  return 'ต้องปรับปรุง'
}

function getEffectSizeClass(d) {
  if (Math.abs(d) < 0.2) return 'negligible'
  if (Math.abs(d) < 0.5) return 'small'
  if (Math.abs(d) < 0.8) return 'medium'
  return 'large'
}

function getPriorityClass(priority) {
  return `priority-${priority}`
}

function getPriorityLabel(priority) {
  const labels = {
    high: '🔴 สูง',
    medium: '🟡 กลาง',
    low: '🟢 ต่ำ'
  }
  return labels[priority] || priority
}

function getKappaInterpretation(kappa) {
  if (kappa >= 0.81) return 'Almost Perfect'
  if (kappa >= 0.61) return 'Substantial'
  if (kappa >= 0.41) return 'Moderate'
  if (kappa >= 0.21) return 'Fair'
  return 'Poor'
}

function getThresholdNote(dim, threshold) {
  if (threshold <= 2) return 'ปรับลดสำหรับระดับชั้นนี้'
  if (threshold >= 4) return 'เกณฑ์ขั้นสูง'
  return 'เกณฑ์มาตรฐาน'
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  loadCourses()
  loadReviewQueue()
})
</script>

<style scoped>
.quality-assurance {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--text-secondary);
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0.5rem;
  background: var(--card-bg);
  padding: 0.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);
}

.tab:hover {
  background: var(--hover-bg);
}

.tab.active {
  background: var(--primary);
  color: white;
}

.tab-badge {
  background: var(--danger);
  color: white;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
}

/* Panel Headers */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.panel-header h2 {
  font-size: 1.25rem;
  color: var(--text-primary);
}

.controls {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.controls select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-primary);
}

/* Buttons */
.btn-primary {
  padding: 0.5rem 1rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.2s;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background: var(--hover-bg);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.metric-card {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  border: 1px solid var(--border);
}

.metric-card.excellent {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}

.metric-card.good {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

.metric-card.warning {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.metric-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.metric-status {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

/* Data Table */
.data-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
}

.data-table th,
.data-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.data-table th {
  background: var(--hover-bg);
  font-weight: 600;
  color: var(--text-secondary);
}

.data-table td {
  color: var(--text-primary);
}

/* Status Badge */
.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.fair {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.status-badge.unfair {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

/* Effect Size Classes */
.negligible { color: #22c55e; }
.small { color: #3b82f6; }
.medium { color: #f59e0b; }
.large { color: #ef4444; }

/* Concerns Section */
.concerns-section {
  margin-top: 2rem;
}

.concern-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.concern-item {
  display: flex;
  gap: 1rem;
  background: rgba(245, 158, 11, 0.1);
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
}

.concern-icon {
  font-size: 1.5rem;
}

.concern-title {
  font-weight: 600;
  color: var(--text-primary);
}

.concern-description {
  color: var(--text-secondary);
  margin: 0.5rem 0;
}

.concern-recommendation {
  color: var(--primary);
  font-size: 0.875rem;
}

/* Review List */
.review-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.review-item {
  display: flex;
  gap: 1rem;
  background: var(--card-bg);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  align-items: center;
}

.review-item.priority-high {
  border-left: 4px solid #ef4444;
}

.review-item.priority-medium {
  border-left: 4px solid #f59e0b;
}

.review-item.priority-low {
  border-left: 4px solid #22c55e;
}

.priority-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.priority-badge.high {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.priority-badge.medium {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.priority-badge.low {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.review-info {
  flex: 1;
}

.review-reason {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.review-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.review-scores {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.score-chip {
  background: var(--hover-bg);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.review-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Agreement Bars */
.agreement-bars {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.agreement-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.dim-label {
  width: 180px;
  color: var(--text-secondary);
}

.agreement-bar-container {
  flex: 1;
  height: 8px;
  background: var(--hover-bg);
  border-radius: 4px;
  overflow: hidden;
}

.agreement-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), #22c55e);
  border-radius: 4px;
}

.agreement-value {
  width: 60px;
  text-align: right;
  font-weight: 600;
}

/* Grade Calibration */
.cognitive-stage {
  margin-bottom: 2rem;
}

.stage-card {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--border);
}

.stage-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.5rem;
}

.stage-description {
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.age-range {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.range-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.range-card {
  background: var(--card-bg);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.range-dim {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.range-values {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.range-bar {
  height: 8px;
  background: var(--hover-bg);
  border-radius: 4px;
  position: relative;
}

.range-fill {
  position: absolute;
  height: 100%;
  background: var(--primary);
  border-radius: 4px;
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
}

.modal-content {
  background: var(--card-bg);
  border-radius: 16px;
  max-width: 700px;
  width: 90%;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border);
}

/* Review Modal Specific */
.review-context h3 {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  margin-top: 1rem;
}

.review-context h3:first-child {
  margin-top: 0;
}

.question-text,
.answer-text {
  background: var(--hover-bg);
  padding: 1rem;
  border-radius: 8px;
  color: var(--text-primary);
}

.ai-scores {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.expert-scoring {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.score-input-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.score-input-row label {
  width: 180px;
  color: var(--text-secondary);
}

.score-buttons {
  display: flex;
  gap: 0.5rem;
}

.score-btn {
  width: 40px;
  height: 40px;
  border: 2px solid var(--border);
  background: var(--card-bg);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.score-btn:hover {
  border-color: var(--primary);
}

.score-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.expert-notes {
  margin-top: 1.5rem;
}

.expert-notes label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

.expert-notes textarea {
  width: 100%;
  min-height: 100px;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-primary);
  resize: vertical;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

/* Calibration Warning */
.calibration-warning {
  background: rgba(245, 158, 11, 0.1);
  padding: 1.5rem;
  border-radius: 12px;
  border-left: 4px solid #f59e0b;
  margin-top: 2rem;
}

.calibration-warning h3 {
  color: #f59e0b;
  margin-bottom: 0.5rem;
}

.calibration-warning ul {
  margin-top: 1rem;
  padding-left: 1.5rem;
}

.calibration-warning li {
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

/* Responsive */
@media (max-width: 768px) {
  .tabs {
    flex-wrap: wrap;
  }
  
  .tab {
    flex: 1 0 45%;
    justify-content: center;
  }
  
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .controls {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .controls select,
  .controls button {
    flex: 1;
    min-width: 120px;
  }
  
  .review-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .review-actions {
    width: 100%;
    flex-direction: row;
  }
  
  .review-actions button {
    flex: 1;
  }
}
</style>
