<template>
  <div class="submission-detail">
    <LoadingSpinner v-if="loading" />

    <div v-else-if="!submission" class="error-state">
      <div class="error-icon">📭</div>
      <h2>ไม่พบข้อมูลการส่งงาน</h2>
      <router-link to="/assignments" class="btn-back">← กลับหน้างาน</router-link>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="submission-header">
        <router-link 
          :to="isTeacher ? `/assignments/${submission.assignmentId}` : '/assignments'" 
          class="back-link"
        >
          ← กลับ
        </router-link>
        
        <div class="header-main">
          <div class="header-info">
            <span class="assignment-title">{{ submission.assignmentTitle || 'งาน' }}</span>
            <div v-if="isTeacher" class="student-info">
              <span class="student-name">{{ submission.studentName }}</span>
              <span class="student-id">{{ submission.studentNumber }}</span>
            </div>
          </div>
          
          <div class="status-section">
            <span :class="['status-badge', getStatusClass(submission.status)]">
              {{ getStatusLabel(submission.status) }}
            </span>
            <span class="submitted-date">
              ส่งเมื่อ {{ formatDate(submission.createdAt) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Score Summary -->
      <div class="score-summary" v-if="submission.finalScore !== undefined">
        <div class="total-score">
          <span class="score-value">{{ submission.finalScore }}</span>
          <span class="score-max">/{{ submission.maxScore || 20 }}</span>
        </div>
        
        <div class="arce-grid">
          <div class="arce-card analysis">
            <span class="arce-icon">🔍</span>
            <span class="arce-name">Analysis</span>
            <span class="arce-score">{{ submission.finalRubric?.analysis || 0 }}/5</span>
          </div>
          <div class="arce-card reasoning">
            <span class="arce-icon">🧠</span>
            <span class="arce-name">Reasoning</span>
            <span class="arce-score">{{ submission.finalRubric?.reasoning || 0 }}/5</span>
          </div>
          <div class="arce-card creativity">
            <span class="arce-icon">💡</span>
            <span class="arce-name">Creativity</span>
            <span class="arce-score">{{ submission.finalRubric?.creativity || 0 }}/5</span>
          </div>
          <div class="arce-card evidence">
            <span class="arce-icon">📚</span>
            <span class="arce-name">Evidence</span>
            <span class="arce-score">{{ submission.finalRubric?.evidence || 0 }}/5</span>
          </div>
        </div>
      </div>

      <!-- AI Assessment Details -->
      <div class="ai-assessment" v-if="submission.aiAssessment">
        <h2>🤖 การประเมินจาก AI</h2>
        
        <!-- Confidence Meter -->
        <div class="confidence-section">
          <span class="confidence-label">Confidence Score:</span>
          <div class="confidence-bar">
            <div 
              class="confidence-fill"
              :class="getConfidenceClass(submission.aiAssessment.confidence)"
              :style="{ width: (submission.aiAssessment.confidence * 100) + '%' }"
            ></div>
          </div>
          <span class="confidence-value">{{ (submission.aiAssessment.confidence * 100).toFixed(0) }}%</span>
        </div>

        <!-- Risk Flags -->
        <div v-if="submission.aiAssessment.riskFlags?.length > 0" class="risk-flags">
          <h4>⚠️ Risk Flags:</h4>
          <div class="flags-list">
            <span v-for="flag in submission.aiAssessment.riskFlags" :key="flag" class="flag-badge">
              {{ flag }}
            </span>
          </div>
        </div>

        <!-- AI Feedback -->
        <div class="ai-feedback" v-if="submission.aiAssessment.feedback">
          <h4>💬 Feedback จาก AI:</h4>
          <p>{{ submission.aiAssessment.feedback }}</p>
        </div>
      </div>

      <!-- Teacher Review -->
      <div class="teacher-review" v-if="submission.teacherReview">
        <h2>👨‍🏫 การตรวจจากครู</h2>
        
        <div class="reviewer-info">
          <span class="reviewer-name">{{ submission.teacherReview.teacherName }}</span>
          <span class="review-date">{{ formatDate(submission.teacherReview.reviewedAt) }}</span>
        </div>

        <div v-if="submission.teacherReview.adjustedRubric" class="adjusted-scores">
          <h4>คะแนนที่ปรับ:</h4>
          <div class="adjustment-grid">
            <div v-for="(score, dim) in submission.teacherReview.adjustedRubric" :key="dim" class="adjustment-item">
              <span class="dim-name">{{ dim }}</span>
              <span class="original-score">{{ submission.aiAssessment?.rubricScores?.[dim] || 0 }}</span>
              <span class="arrow">→</span>
              <span class="new-score">{{ score }}</span>
            </div>
          </div>
        </div>

        <div v-if="submission.teacherReview.comment" class="teacher-comment">
          <h4>💬 ความคิดเห็น:</h4>
          <p>{{ submission.teacherReview.comment }}</p>
        </div>
      </div>

      <!-- Answer Content -->
      <div class="answer-section">
        <h2>📝 คำตอบ</h2>
        <div class="answer-content">
          {{ submission.answer }}
        </div>
      </div>

      <!-- LO Assessment -->
      <div class="lo-section" v-if="submission.loAssessment?.passedLOs?.length > 0">
        <h2>🎯 Learning Outcomes ที่ผ่าน</h2>
        <div class="lo-badges">
          <span v-for="lo in submission.loAssessment.passedLOs" :key="lo" class="lo-badge">
            ✅ {{ lo }}
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions-section">
        <!-- Student Actions -->
        <template v-if="!isTeacher">
          <button 
            v-if="canAppeal" 
            class="btn-appeal"
            @click="goToAppeal"
          >
            📝 ยื่นอุทธรณ์
          </button>
        </template>

        <!-- Teacher Actions -->
        <template v-if="isTeacher && needsReview">
          <button class="btn-review" @click="showReviewModal = true">
            ✍️ ตรวจงาน
          </button>
        </template>
      </div>

      <!-- Teacher Review Modal -->
      <Teleport to="body">
        <div v-if="showReviewModal" class="modal-overlay" @click.self="showReviewModal = false">
          <div class="modal review-modal">
            <div class="modal-header">
              <h2>✍️ ตรวจงาน</h2>
              <button class="close-btn" @click="showReviewModal = false">✕</button>
            </div>

            <div class="modal-body">
              <!-- Current AI Scores -->
              <div class="current-scores">
                <h4>คะแนน AI (ปัจจุบัน):</h4>
                <div class="score-preview">
                  A: {{ submission.aiAssessment?.rubricScores?.analysis || 0 }} |
                  R: {{ submission.aiAssessment?.rubricScores?.reasoning || 0 }} |
                  C: {{ submission.aiAssessment?.rubricScores?.creativity || 0 }} |
                  E: {{ submission.aiAssessment?.rubricScores?.evidence || 0 }}
                </div>
              </div>

              <!-- Review Decision -->
              <div class="form-group">
                <label>การตัดสิน</label>
                <div class="decision-buttons">
                  <button 
                    :class="['decision-btn', { active: reviewDecision === 'approve' }]"
                    @click="reviewDecision = 'approve'"
                  >
                    ✅ อนุมัติคะแนน AI
                  </button>
                  <button 
                    :class="['decision-btn', { active: reviewDecision === 'adjust' }]"
                    @click="reviewDecision = 'adjust'"
                  >
                    ✏️ ปรับคะแนน
                  </button>
                </div>
              </div>

              <!-- Adjust Scores (if adjust selected) -->
              <div v-if="reviewDecision === 'adjust'" class="adjust-section">
                <h4>ปรับคะแนน:</h4>
                <div class="adjust-grid">
                  <div class="adjust-item">
                    <label>Analysis</label>
                    <input type="number" v-model.number="adjustedScores.analysis" min="0" max="5">
                  </div>
                  <div class="adjust-item">
                    <label>Reasoning</label>
                    <input type="number" v-model.number="adjustedScores.reasoning" min="0" max="5">
                  </div>
                  <div class="adjust-item">
                    <label>Creativity</label>
                    <input type="number" v-model.number="adjustedScores.creativity" min="0" max="5">
                  </div>
                  <div class="adjust-item">
                    <label>Evidence</label>
                    <input type="number" v-model.number="adjustedScores.evidence" min="0" max="5">
                  </div>
                </div>
              </div>

              <!-- Comment -->
              <div class="form-group">
                <label>ความคิดเห็น (ถ้ามี)</label>
                <textarea v-model="reviewComment" rows="3" placeholder="เพิ่มความคิดเห็นสำหรับนักเรียน..."></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-secondary" @click="showReviewModal = false">ยกเลิก</button>
              <button 
                class="btn-primary" 
                @click="submitReview"
                :disabled="submittingReview"
              >
                {{ submittingReview ? 'กำลังบันทึก...' : '✅ บันทึก' }}
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

const submissionId = route.params.id
const loading = ref(true)
const submission = ref(null)

// Review state
const showReviewModal = ref(false)
const reviewDecision = ref('approve')
const adjustedScores = ref({ analysis: 0, reasoning: 0, creativity: 0, evidence: 0 })
const reviewComment = ref('')
const submittingReview = ref(false)

const isTeacher = computed(() => authStore.user?.role === 'teacher')

const canAppeal = computed(() => {
  if (!submission.value) return false
  const status = submission.value.status
  return ['TEACHER_APPROVED', 'AUTO_APPROVED'].includes(status) && !submission.value.appeal
})

const needsReview = computed(() => {
  if (!submission.value) return false
  return submission.value.status === 'IN_TEACHER_QUEUE'
})

async function loadSubmission() {
  loading.value = true
  try {
    const submissionDoc = await getDoc(doc(db, 'submissions', submissionId))
    if (submissionDoc.exists()) {
      submission.value = { id: submissionDoc.id, ...submissionDoc.data() }
      
      // Init adjusted scores from AI scores
      if (submission.value.aiAssessment?.rubricScores) {
        adjustedScores.value = { ...submission.value.aiAssessment.rubricScores }
      }
    }
  } catch (error) {
    console.error('Error loading submission:', error)
  } finally {
    loading.value = false
  }
}

function getStatusClass(status) {
  return status?.toLowerCase().replace(/_/g, '-') || ''
}

function getStatusLabel(status) {
  const labels = {
    'SUBMITTED': '📝 รอประเมิน',
    'AI_SCORED': '🤖 AI ประเมินแล้ว',
    'IN_TEACHER_QUEUE': '👨‍🏫 รอครูตรวจ',
    'TEACHER_APPROVED': '✅ ครูอนุมัติ',
    'AUTO_APPROVED': '✅ อนุมัติอัตโนมัติ',
    'FINALIZED': '🏆 สมบูรณ์'
  }
  return labels[status] || status
}

function getConfidenceClass(confidence) {
  if (confidence >= 0.85) return 'high'
  if (confidence >= 0.7) return 'medium'
  return 'low'
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function goToAppeal() {
  router.push(`/appeal/${submissionId}`)
}

async function submitReview() {
  submittingReview.value = true
  try {
    const reviewData = {
      submissionId,
      teacherId: authStore.user.uid,
      teacherName: authStore.user.displayName,
      decision: reviewDecision.value,
      comment: reviewComment.value
    }
    
    if (reviewDecision.value === 'adjust') {
      reviewData.adjustedScores = adjustedScores.value
    }
    
    const response = await fetch(`${FUNCTIONS_URL}/submitTeacherReview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData)
    })
    
    const data = await response.json()
    
    if (data.success) {
      alert('✅ บันทึกการตรวจเรียบร้อยแล้ว')
      showReviewModal.value = false
      await loadSubmission()
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.error)
    }
  } catch (error) {
    console.error('Error submitting review:', error)
    alert('เกิดข้อผิดพลาด')
  } finally {
    submittingReview.value = false
  }
}

onMounted(loadSubmission)
</script>

<style scoped>
.submission-detail {
  max-width: 900px;
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
.submission-header {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
}

.back-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  display: inline-block;
  margin-bottom: 16px;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.assignment-title {
  display: block;
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.student-info {
  display: flex;
  gap: 12px;
  color: var(--text-secondary);
}

.status-section {
  text-align: right;
}

.status-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.9rem;
  margin-bottom: 8px;
}

.status-badge.submitted { background: #fef3c7; color: #d97706; }
.status-badge.ai-scored { background: #dbeafe; color: #2563eb; }
.status-badge.in-teacher-queue { background: #fce7f3; color: #db2777; }
.status-badge.teacher-approved { background: #d1fae5; color: #059669; }
.status-badge.auto-approved { background: #d1fae5; color: #059669; }
.status-badge.finalized { background: #c7d2fe; color: #6366f1; }

.submitted-date {
  display: block;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Score Summary */
.score-summary {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  text-align: center;
}

.total-score {
  margin-bottom: 20px;
}

.score-value {
  font-size: 3rem;
  font-weight: 700;
  color: var(--primary-color);
}

.score-max {
  font-size: 1.5rem;
  color: var(--text-secondary);
}

.arce-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.arce-card {
  padding: 16px;
  border-radius: 12px;
  text-align: center;
}

.arce-card.analysis { background: rgba(99, 102, 241, 0.1); }
.arce-card.reasoning { background: rgba(139, 92, 246, 0.1); }
.arce-card.creativity { background: rgba(236, 72, 153, 0.1); }
.arce-card.evidence { background: rgba(20, 184, 166, 0.1); }

.arce-icon {
  display: block;
  font-size: 1.5rem;
  margin-bottom: 4px;
}

.arce-name {
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.arce-score {
  font-weight: 700;
  font-size: 1.1rem;
}

/* AI Assessment */
.ai-assessment {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
}

.ai-assessment h2 {
  margin-bottom: 16px;
}

.confidence-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
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
}

.confidence-fill.high { background: #10b981; }
.confidence-fill.medium { background: #f59e0b; }
.confidence-fill.low { background: #ef4444; }

.confidence-value {
  font-weight: 600;
  min-width: 50px;
}

.risk-flags {
  margin-bottom: 16px;
}

.risk-flags h4 {
  margin-bottom: 8px;
}

.flags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.flag-badge {
  padding: 4px 12px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 20px;
  font-size: 0.85rem;
}

.ai-feedback {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.ai-feedback h4 {
  margin-bottom: 8px;
}

/* Teacher Review */
.teacher-review {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  border: 2px solid #10b981;
}

.teacher-review h2 {
  margin-bottom: 16px;
}

.reviewer-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  color: var(--text-secondary);
}

.adjusted-scores {
  margin-bottom: 16px;
}

.adjustment-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.adjustment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.original-score {
  color: var(--text-secondary);
  text-decoration: line-through;
}

.new-score {
  color: var(--primary-color);
  font-weight: 600;
}

.teacher-comment {
  padding: 16px;
  background: #fef3c7;
  border-radius: 8px;
}

.teacher-comment h4 {
  margin-bottom: 8px;
}

/* Answer Section */
.answer-section {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
}

.answer-section h2 {
  margin-bottom: 16px;
}

.answer-content {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  line-height: 1.8;
  white-space: pre-wrap;
}

/* LO Section */
.lo-section {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
}

.lo-section h2 {
  margin-bottom: 16px;
}

.lo-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lo-badge {
  padding: 8px 16px;
  background: #d1fae5;
  color: #059669;
  border-radius: 20px;
}

/* Actions */
.actions-section {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-appeal {
  padding: 12px 24px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

.btn-review {
  padding: 12px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
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

.current-scores {
  margin-bottom: 16px;
}

.score-preview {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-top: 8px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.decision-buttons {
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

.decision-btn.active {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

.adjust-section {
  margin-bottom: 16px;
}

.adjust-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 8px;
}

.adjust-item label {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 4px;
}

.adjust-item input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  text-align: center;
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

@media (max-width: 768px) {
  .arce-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .adjust-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
