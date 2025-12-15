<template>
  <div class="assignment-submit">
    <LoadingSpinner v-if="loading" />

    <div v-else-if="!assignment" class="error-state">
      <div class="error-icon">📭</div>
      <h2>ไม่พบงาน</h2>
      <router-link to="/assignments" class="btn-back">← กลับหน้างาน</router-link>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="submit-header">
        <router-link :to="`/assignments/${assignmentId}`" class="back-link">
          ← กลับ
        </router-link>
        <h1>✍️ ส่งงาน</h1>
        <span class="assignment-title">{{ assignment.title }}</span>
      </div>

      <!-- Assignment Info Card -->
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">📚 รายวิชา</span>
          <span class="info-value">{{ assignment.courseName }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">📊 คะแนนเต็ม</span>
          <span class="info-value">{{ assignment.maxScore || 20 }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">⏰ กำหนดส่ง</span>
          <span class="info-value" :class="{ urgent: isUrgent }">
            {{ formatDeadline(assignment.deadline) }}
          </span>
        </div>
      </div>

      <!-- Description -->
      <div class="description-card" v-if="assignment.description">
        <h3>📝 คำสั่ง</h3>
        <p>{{ assignment.description }}</p>
      </div>

      <!-- Learning Outcomes -->
      <div class="lo-card" v-if="relatedLOs.length > 0">
        <h3>🎯 Learning Outcomes ที่จะประเมิน</h3>
        <ul>
          <li v-for="lo in relatedLOs" :key="lo.id">
            <strong>{{ lo.code }}:</strong> {{ lo.description }}
          </li>
        </ul>
      </div>

      <!-- Answer Form -->
      <div class="answer-section">
        <h2>✏️ คำตอบของคุณ</h2>
        
        <div class="answer-tips">
          <strong>💡 เคล็ดลับการตอบ:</strong>
          <ul>
            <li>แสดงการวิเคราะห์ (Analysis) อย่างชัดเจน</li>
            <li>ใช้เหตุผล (Reasoning) สนับสนุนคำตอบ</li>
            <li>แสดงความคิดสร้างสรรค์ (Creativity) ถ้าทำได้</li>
            <li>อ้างอิงหลักฐาน (Evidence) หรือตัวอย่างประกอบ</li>
          </ul>
        </div>

        <div class="textarea-wrapper">
          <textarea
            v-model="answer"
            :placeholder="'พิมพ์คำตอบของคุณที่นี่...\n\n(ควรมีความยาวอย่างน้อย 50 ตัวอักษร)'"
            rows="12"
            @paste.prevent="handlePaste"
            @copy.prevent
            @cut.prevent
            @contextmenu.prevent
          ></textarea>
          <div class="char-counter" :class="{ warning: answer.length < 50, ok: answer.length >= 50 }">
            {{ answer.length }} ตัวอักษร
            <span v-if="answer.length < 50">(ต้องการอย่างน้อย 50)</span>
          </div>
        </div>

        <!-- Copy Detection Warning -->
        <div v-if="copyWarning" class="copy-warning">
          <span class="warning-icon">⚠️</span>
          <span>ตรวจพบการวางข้อความ กรุณาพิมพ์คำตอบด้วยตนเอง</span>
        </div>
      </div>

      <!-- Submit Button -->
      <div class="submit-section">
        <div class="submit-info">
          <p v-if="isOverdue && !assignment.allowLateSubmission" class="late-warning">
            ⚠️ งานนี้เลยกำหนดส่งแล้วและไม่อนุญาตให้ส่งล่าช้า
          </p>
          <p v-else-if="isOverdue" class="late-notice">
            ⚠️ คุณกำลังส่งงานหลังกำหนด
          </p>
        </div>

        <div class="button-group">
          <button class="btn-preview" @click="showPreviewModal = true" :disabled="!canSubmit">
            👁️ ดูตัวอย่าง
          </button>
          <button 
            class="btn-submit" 
            @click="confirmSubmit"
            :disabled="!canSubmit || submitting"
          >
            {{ submitting ? 'กำลังส่ง...' : '📤 ส่งงาน' }}
          </button>
        </div>
      </div>

      <!-- Preview Modal -->
      <Teleport to="body">
        <div v-if="showPreviewModal" class="modal-overlay" @click.self="showPreviewModal = false">
          <div class="modal preview-modal">
            <div class="modal-header">
              <h2>👁️ ตรวจสอบคำตอบ</h2>
              <button class="close-btn" @click="showPreviewModal = false">✕</button>
            </div>
            <div class="modal-body">
              <div class="preview-content">
                {{ answer }}
              </div>
              <div class="preview-stats">
                <span>📝 {{ answer.length }} ตัวอักษร</span>
                <span>📄 {{ wordCount }} คำ</span>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showPreviewModal = false">
                แก้ไขต่อ
              </button>
              <button class="btn-primary" @click="submitAnswer" :disabled="submitting">
                {{ submitting ? 'กำลังส่ง...' : '✅ ยืนยันส่ง' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Confirm Modal -->
      <Teleport to="body">
        <div v-if="showConfirmModal" class="modal-overlay" @click.self="showConfirmModal = false">
          <div class="modal confirm-modal">
            <div class="modal-header">
              <h2>📤 ยืนยันการส่งงาน</h2>
              <button class="close-btn" @click="showConfirmModal = false">✕</button>
            </div>
            <div class="modal-body">
              <p>คุณแน่ใจหรือไม่ว่าต้องการส่งคำตอบนี้?</p>
              <div class="confirm-notice">
                <p>📌 หลังจากส่งแล้ว:</p>
                <ul>
                  <li>AI จะประเมินคำตอบอัตโนมัติ</li>
                  <li>ครูอาจตรวจสอบเพิ่มเติม</li>
                  <li>คุณสามารถยื่นอุทธรณ์ได้หากไม่เห็นด้วยกับคะแนน</li>
                </ul>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showConfirmModal = false">
                ยกเลิก
              </button>
              <button class="btn-primary" @click="submitAnswer" :disabled="submitting">
                {{ submitting ? 'กำลังส่ง...' : '✅ ยืนยันส่ง' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'

const assignmentId = route.params.id
const loading = ref(true)
const assignment = ref(null)
const relatedLOs = ref([])
const answer = ref('')
const copyWarning = ref(false)
const showPreviewModal = ref(false)
const showConfirmModal = ref(false)
const submitting = ref(false)

const isOverdue = computed(() => {
  if (!assignment.value?.deadline) return false
  const deadline = assignment.value.deadline.toDate ? assignment.value.deadline.toDate() : new Date(assignment.value.deadline)
  return deadline < new Date()
})

const isUrgent = computed(() => {
  if (!assignment.value?.deadline) return false
  const deadline = assignment.value.deadline.toDate ? assignment.value.deadline.toDate() : new Date(assignment.value.deadline)
  const hoursLeft = (deadline - new Date()) / (1000 * 60 * 60)
  return hoursLeft > 0 && hoursLeft < 24
})

const canSubmit = computed(() => {
  if (answer.value.length < 50) return false
  if (isOverdue.value && !assignment.value?.allowLateSubmission) return false
  return true
})

const wordCount = computed(() => {
  return answer.value.trim().split(/\s+/).filter(w => w).length
})

async function loadAssignment() {
  loading.value = true
  try {
    const assignmentDoc = await getDoc(doc(db, 'assignments', assignmentId))
    if (assignmentDoc.exists()) {
      assignment.value = { id: assignmentDoc.id, ...assignmentDoc.data() }
      
      // Load related LOs
      if (assignment.value.learningOutcomes?.length > 0 && assignment.value.courseId) {
        const courseDoc = await getDoc(doc(db, 'courses', assignment.value.courseId))
        if (courseDoc.exists()) {
          const courseLOs = courseDoc.data().learningOutcomes || []
          relatedLOs.value = courseLOs.filter(lo => 
            assignment.value.learningOutcomes.includes(lo.id)
          )
        }
      }
    }
  } catch (error) {
    console.error('Error loading assignment:', error)
  } finally {
    loading.value = false
  }
}

function handlePaste(e) {
  copyWarning.value = true
  setTimeout(() => { copyWarning.value = false }, 5000)
}

function formatDeadline(deadline) {
  if (!deadline) return 'ไม่กำหนด'
  const date = deadline.toDate ? deadline.toDate() : new Date(deadline)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function confirmSubmit() {
  showConfirmModal.value = true
}

async function submitAnswer() {
  if (!canSubmit.value || submitting.value) return
  
  submitting.value = true
  showPreviewModal.value = false
  showConfirmModal.value = false
  
  try {
    const response = await fetch(`${FUNCTIONS_URL}/assessSubmissionMultiPass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignmentId,
        studentId: authStore.user.uid,
        studentName: authStore.user.displayName,
        answer: answer.value,
        courseId: assignment.value.courseId,
        learningOutcomes: assignment.value.learningOutcomes || []
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      alert('✅ ส่งงานเรียบร้อยแล้ว!\n\nระบบ AI กำลังประเมินคำตอบของคุณ')
      router.push(`/submissions/${data.submissionId}`)
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.error || 'Unknown error'))
    }
  } catch (error) {
    console.error('Error submitting:', error)
    alert('เกิดข้อผิดพลาดในการส่งงาน')
  } finally {
    submitting.value = false
  }
}

onMounted(loadAssignment)
</script>

<style scoped>
.assignment-submit {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

/* Error State */
.error-state {
  text-align: center;
  padding: 60px 20px;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.btn-back {
  display: inline-block;
  margin-top: 20px;
  padding: 12px 24px;
  background: var(--primary-color);
  color: white;
  text-decoration: none;
  border-radius: 8px;
}

/* Header */
.submit-header {
  margin-bottom: 24px;
}

.back-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
}

.submit-header h1 {
  font-size: 1.5rem;
  margin: 8px 0;
}

.assignment-title {
  color: var(--text-secondary);
}

/* Info Card */
.info-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: var(--text-secondary);
}

.info-value.urgent {
  color: #f59e0b;
  font-weight: 600;
}

/* Description Card */
.description-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.description-card h3 {
  margin-bottom: 12px;
}

.description-card p {
  line-height: 1.8;
}

/* LO Card */
.lo-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.lo-card h3 {
  margin-bottom: 12px;
}

.lo-card ul {
  list-style: none;
  padding: 0;
}

.lo-card li {
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.lo-card li:last-child {
  border-bottom: none;
}

/* Answer Section */
.answer-section {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.answer-section h2 {
  margin-bottom: 16px;
}

.answer-tips {
  background: #fef3c7;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.answer-tips ul {
  margin: 8px 0 0 20px;
}

.textarea-wrapper {
  position: relative;
}

textarea {
  width: 100%;
  padding: 16px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-secondary);
  resize: vertical;
  font-size: 1rem;
  line-height: 1.6;
}

textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.char-counter {
  text-align: right;
  margin-top: 8px;
  font-size: 0.85rem;
}

.char-counter.warning {
  color: #f59e0b;
}

.char-counter.ok {
  color: #10b981;
}

/* Copy Warning */
.copy-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  background: #fee2e2;
  border-radius: 8px;
  color: #dc2626;
}

/* Submit Section */
.submit-section {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
}

.submit-info {
  margin-bottom: 16px;
}

.late-warning {
  color: #dc2626;
  font-weight: 500;
}

.late-notice {
  color: #f59e0b;
}

.button-group {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-preview {
  padding: 12px 24px;
  background: var(--bg-secondary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-preview:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-submit {
  padding: 12px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.preview-content {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  white-space: pre-wrap;
  line-height: 1.8;
  max-height: 300px;
  overflow-y: auto;
}

.preview-stats {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.confirm-notice {
  margin-top: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.confirm-notice ul {
  margin: 8px 0 0 20px;
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
