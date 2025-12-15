<template>
  <div class="appeals-management">
    <!-- Header -->
    <div class="page-header">
      <h1>📋 จัดการอุทธรณ์</h1>
      <div class="header-stats">
        <span class="stat pending">⏳ {{ pendingCount }} รอพิจารณา</span>
        <span class="stat resolved">✅ {{ resolvedCount }} พิจารณาแล้ว</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="filter-group">
        <select v-model="selectedCourse">
          <option value="">📚 ทุกรายวิชา</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.name }}
          </option>
        </select>

        <select v-model="selectedStatus">
          <option value="">📋 ทุกสถานะ</option>
          <option value="PENDING">⏳ รอพิจารณา</option>
          <option value="RESOLVED">✅ พิจารณาแล้ว</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <LoadingSpinner v-if="loading" />

    <!-- Empty State -->
    <div v-else-if="filteredAppeals.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>ไม่มีอุทธรณ์</h3>
      <p>ยังไม่มีอุทธรณ์ในระบบ</p>
    </div>

    <!-- Appeals List -->
    <div class="appeals-list" v-else>
      <div 
        v-for="appeal in filteredAppeals"
        :key="appeal.id"
        class="appeal-card"
        :class="{ urgent: appeal.status === 'PENDING' }"
      >
        <div class="card-header">
          <div class="student-info">
            <span class="student-name">{{ appeal.studentName }}</span>
            <span class="course-name">{{ appeal.courseName }}</span>
          </div>
          <span :class="['status-badge', appeal.status.toLowerCase()]">
            {{ getStatusLabel(appeal.status) }}
          </span>
        </div>

        <div class="appeal-type-row">
          <span class="appeal-type">{{ getTypeLabel(appeal.type) }}</span>
          <span class="submitted-date">ยื่นเมื่อ {{ formatDate(appeal.createdAt) }}</span>
        </div>

        <h3 class="assignment-title">{{ appeal.assignmentTitle }}</h3>

        <!-- Current Score -->
        <div class="score-info">
          <span class="score-label">คะแนนปัจจุบัน:</span>
          <span class="score-value">{{ appeal.originalScore }}/20</span>
          <span class="arce-preview">
            (A:{{ appeal.originalRubric?.analysis }} R:{{ appeal.originalRubric?.reasoning }} 
            C:{{ appeal.originalRubric?.creativity }} E:{{ appeal.originalRubric?.evidence }})
          </span>
        </div>

        <!-- Reason -->
        <div class="reason-section">
          <h4>📝 เหตุผล:</h4>
          <p>{{ appeal.reason }}</p>
        </div>

        <!-- Evidence (if provided) -->
        <div v-if="appeal.evidence" class="evidence-section">
          <h4>📚 หลักฐาน:</h4>
          <p>{{ appeal.evidence }}</p>
        </div>

        <!-- Resolution (if exists) -->
        <div v-if="appeal.resolution" class="resolution-section">
          <h4>📋 ผลการพิจารณา:</h4>
          <div class="resolution-content">
            <span :class="['decision-badge', appeal.resolution.decision]">
              {{ getDecisionLabel(appeal.resolution.decision) }}
            </span>
            <span class="resolver-info">
              โดย {{ appeal.resolution.teacherName }} | {{ formatDate(appeal.resolution.resolvedAt) }}
            </span>
          </div>
          <p v-if="appeal.resolution.comment" class="resolution-comment">
            💬 {{ appeal.resolution.comment }}
          </p>
        </div>

        <!-- Actions -->
        <div class="card-actions">
          <router-link :to="`/submissions/${appeal.submissionId}`" class="btn-view">
            👁️ ดูงาน
          </router-link>
          <button 
            v-if="appeal.status === 'PENDING'" 
            class="btn-resolve"
            @click="openResolveModal(appeal)"
          >
            ⚖️ พิจารณา
          </button>
        </div>
      </div>
    </div>

    <!-- Resolve Modal -->
    <Teleport to="body">
      <div v-if="showResolveModal" class="modal-overlay" @click.self="closeResolveModal">
        <div class="modal resolve-modal">
          <div class="modal-header">
            <h2>⚖️ พิจารณาอุทธรณ์</h2>
            <button class="close-btn" @click="closeResolveModal">✕</button>
          </div>

          <div class="modal-body">
            <!-- Appeal Summary -->
            <div class="appeal-summary">
              <p><strong>นักเรียน:</strong> {{ selectedAppeal?.studentName }}</p>
              <p><strong>งาน:</strong> {{ selectedAppeal?.assignmentTitle }}</p>
              <p><strong>คะแนนปัจจุบัน:</strong> {{ selectedAppeal?.originalScore }}/20</p>
            </div>

            <!-- Decision -->
            <div class="form-group">
              <label>การตัดสิน *</label>
              <div class="decision-options">
                <button 
                  :class="['decision-btn approved', { active: resolution.decision === 'approved' }]"
                  @click="resolution.decision = 'approved'"
                >
                  ✅ อนุมัติ
                </button>
                <button 
                  :class="['decision-btn partial', { active: resolution.decision === 'partially_approved' }]"
                  @click="resolution.decision = 'partially_approved'"
                >
                  ⚡ อนุมัติบางส่วน
                </button>
                <button 
                  :class="['decision-btn rejected', { active: resolution.decision === 'rejected' }]"
                  @click="resolution.decision = 'rejected'"
                >
                  ❌ ปฏิเสธ
                </button>
              </div>
            </div>

            <!-- New Score (if approved/partial) -->
            <div v-if="resolution.decision !== 'rejected'" class="form-group">
              <label>ปรับคะแนนใหม่</label>
              <div class="score-adjust-grid">
                <div class="score-input">
                  <span>Analysis</span>
                  <input type="number" v-model.number="resolution.newRubric.analysis" min="0" max="5">
                </div>
                <div class="score-input">
                  <span>Reasoning</span>
                  <input type="number" v-model.number="resolution.newRubric.reasoning" min="0" max="5">
                </div>
                <div class="score-input">
                  <span>Creativity</span>
                  <input type="number" v-model.number="resolution.newRubric.creativity" min="0" max="5">
                </div>
                <div class="score-input">
                  <span>Evidence</span>
                  <input type="number" v-model.number="resolution.newRubric.evidence" min="0" max="5">
                </div>
              </div>
              <div class="new-total">
                คะแนนรวมใหม่: <strong>{{ newTotalScore }}/20</strong>
              </div>
            </div>

            <!-- Comment -->
            <div class="form-group">
              <label>ความคิดเห็น/เหตุผล</label>
              <textarea 
                v-model="resolution.comment"
                placeholder="อธิบายเหตุผลในการตัดสินใจ..."
                rows="4"
              ></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="closeResolveModal">ยกเลิก</button>
            <button 
              class="btn-primary"
              @click="submitResolution"
              :disabled="!resolution.decision || resolving"
            >
              {{ resolving ? 'กำลังบันทึก...' : '✅ บันทึก' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const authStore = useAuthStore()
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'

// State
const loading = ref(true)
const appeals = ref([])
const courses = ref([])
const selectedCourse = ref('')
const selectedStatus = ref('')

// Modal
const showResolveModal = ref(false)
const selectedAppeal = ref(null)
const resolving = ref(false)
const resolution = ref({
  decision: '',
  newRubric: { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 },
  comment: ''
})

// Computed
const pendingCount = computed(() => appeals.value.filter(a => a.status === 'PENDING').length)
const resolvedCount = computed(() => appeals.value.filter(a => a.status === 'RESOLVED').length)

const filteredAppeals = computed(() => {
  let result = [...appeals.value]
  
  if (selectedCourse.value) {
    result = result.filter(a => a.courseId === selectedCourse.value)
  }
  
  if (selectedStatus.value) {
    result = result.filter(a => a.status === selectedStatus.value)
  }
  
  // Sort: pending first, then by date
  result.sort((a, b) => {
    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1
    if (a.status !== 'PENDING' && b.status === 'PENDING') return 1
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
  })
  
  return result
})

const newTotalScore = computed(() => {
  const r = resolution.value.newRubric
  return (r.analysis || 0) + (r.reasoning || 0) + (r.creativity || 0) + (r.evidence || 0)
})

// Methods
async function loadData() {
  loading.value = true
  try {
    // Load teacher's courses
    const coursesQuery = query(
      collection(db, 'courses'),
      where('teacherId', '==', authStore.user.uid)
    )
    const coursesSnapshot = await getDocs(coursesQuery)
    courses.value = coursesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    
    const courseIds = courses.value.map(c => c.id)
    
    if (courseIds.length > 0) {
      // Load appeals for teacher's courses
      const appealsQuery = query(
        collection(db, 'appeals'),
        where('courseId', 'in', courseIds.slice(0, 10)),
        orderBy('createdAt', 'desc')
      )
      const appealsSnapshot = await getDocs(appealsQuery)
      appeals.value = appealsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    }
  } catch (error) {
    console.error('Error loading appeals:', error)
  } finally {
    loading.value = false
  }
}

function openResolveModal(appeal) {
  selectedAppeal.value = appeal
  resolution.value = {
    decision: '',
    newRubric: { ...appeal.originalRubric },
    comment: ''
  }
  showResolveModal.value = true
}

function closeResolveModal() {
  showResolveModal.value = false
  selectedAppeal.value = null
}

async function submitResolution() {
  if (!resolution.value.decision || resolving.value) return
  
  resolving.value = true
  try {
    const response = await fetch(`${FUNCTIONS_URL}/resolveAppeal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appealId: selectedAppeal.value.id,
        submissionId: selectedAppeal.value.submissionId,
        teacherId: authStore.user.uid,
        teacherName: authStore.user.displayName,
        decision: resolution.value.decision,
        newRubric: resolution.value.decision !== 'rejected' ? resolution.value.newRubric : null,
        comment: resolution.value.comment
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      alert('✅ บันทึกผลการพิจารณาเรียบร้อยแล้ว')
      closeResolveModal()
      await loadData()
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.error)
    }
  } catch (error) {
    console.error('Error resolving appeal:', error)
    alert('เกิดข้อผิดพลาด')
  } finally {
    resolving.value = false
  }
}

function getTypeLabel(type) {
  const labels = {
    'score_review': '📊 ทบทวนคะแนน',
    'technical_issue': '🔧 ปัญหาทางเทคนิค',
    'unfair_assessment': '⚖️ การประเมินไม่เป็นธรรม'
  }
  return labels[type] || type
}

function getStatusLabel(status) {
  const labels = {
    'PENDING': '⏳ รอพิจารณา',
    'RESOLVED': '✅ พิจารณาแล้ว'
  }
  return labels[status] || status
}

function getDecisionLabel(decision) {
  const labels = {
    'approved': '✅ อนุมัติ',
    'partially_approved': '⚡ อนุมัติบางส่วน',
    'rejected': '❌ ปฏิเสธ'
  }
  return labels[decision] || decision
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000)
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(loadData)
</script>

<style scoped>
.appeals-management {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 1.5rem;
}

.header-stats {
  display: flex;
  gap: 16px;
}

.stat {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.stat.pending {
  background: #fef3c7;
  color: #d97706;
}

.stat.resolved {
  background: #d1fae5;
  color: #059669;
}

/* Filters */
.filters-bar {
  margin-bottom: 20px;
}

.filter-group {
  display: flex;
  gap: 12px;
}

.filter-group select {
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--card-bg);
  border-radius: 12px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

/* Appeals List */
.appeals-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.appeal-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  border-left: 4px solid var(--border-color);
}

.appeal-card.urgent {
  border-left-color: #f59e0b;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.student-info {
  display: flex;
  flex-direction: column;
}

.student-name {
  font-weight: 600;
}

.course-name {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
}

.status-badge.pending {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.resolved {
  background: #d1fae5;
  color: #059669;
}

.appeal-type-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.assignment-title {
  font-size: 1.1rem;
  margin-bottom: 12px;
}

.score-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.score-value {
  font-weight: 600;
  color: var(--primary-color);
}

.arce-preview {
  color: var(--text-secondary);
}

.reason-section, .evidence-section {
  margin-bottom: 16px;
}

.reason-section h4, .evidence-section h4 {
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.reason-section p, .evidence-section p {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
}

.resolution-section {
  padding: 16px;
  background: #f0fdf4;
  border-radius: 8px;
  margin-bottom: 16px;
}

.resolution-section h4 {
  margin-bottom: 12px;
}

.resolution-content {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.decision-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
}

.decision-badge.approved {
  background: #d1fae5;
  color: #059669;
}

.decision-badge.partially_approved {
  background: #fef3c7;
  color: #d97706;
}

.decision-badge.rejected {
  background: #fee2e2;
  color: #dc2626;
}

.resolver-info {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.resolution-comment {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* Actions */
.card-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-view {
  padding: 8px 16px;
  background: var(--primary-light);
  color: var(--primary-color);
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.9rem;
}

.btn-resolve {
  padding: 8px 16px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: var(--card-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.appeal-summary {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 20px;
}

.appeal-summary p {
  margin-bottom: 4px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.decision-options {
  display: flex;
  gap: 12px;
}

.decision-btn {
  flex: 1;
  padding: 12px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  cursor: pointer;
}

.decision-btn.active.approved {
  border-color: #10b981;
  background: #d1fae5;
}

.decision-btn.active.partial {
  border-color: #f59e0b;
  background: #fef3c7;
}

.decision-btn.active.rejected {
  border-color: #ef4444;
  background: #fee2e2;
}

.score-adjust-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.score-input {
  text-align: center;
}

.score-input span {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 4px;
}

.score-input input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  text-align: center;
}

.new-total {
  text-align: center;
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  resize: vertical;
}

.btn-primary {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.5;
}

.btn-secondary {
  padding: 10px 20px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
}
</style>
