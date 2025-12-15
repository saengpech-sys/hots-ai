<template>
  <div class="assignment-detail">
    <LoadingSpinner v-if="loading" />

    <div v-else-if="!assignment" class="error-state">
      <div class="error-icon">📭</div>
      <h2>ไม่พบงาน</h2>
      <router-link to="/assignments" class="btn-back">← กลับหน้างาน</router-link>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="assignment-header">
        <router-link to="/assignments" class="back-link">← กลับ</router-link>
        
        <div class="header-main">
          <div class="header-info">
            <span class="course-badge">{{ assignment.courseName }}</span>
            <h1>{{ assignment.title }}</h1>
            <div class="header-meta">
              <span>📊 {{ assignment.maxScore || 20 }} คะแนน</span>
              <span>⏰ {{ formatDeadline(assignment.deadline) }}</span>
            </div>
          </div>
          
          <div class="header-actions" v-if="!isTeacher && !hasSubmitted">
            <router-link :to="`/assignments/${assignmentId}/submit`" class="btn-submit">
              ✍️ ส่งงาน
            </router-link>
          </div>
          
          <div class="header-status" v-else-if="hasSubmitted">
            <div class="submitted-info">
              <span class="submitted-badge">✅ ส่งแล้ว</span>
              <span class="submitted-score" v-if="mySubmission?.finalScore">
                {{ mySubmission.finalScore }}/{{ assignment.maxScore || 20 }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="description-section">
        <h2>📝 คำอธิบาย</h2>
        <div class="description-content">
          {{ assignment.description || 'ไม่มีคำอธิบาย' }}
        </div>
      </div>

      <!-- Learning Outcomes -->
      <div class="lo-section" v-if="assignment.learningOutcomes?.length > 0">
        <h2>🎯 Learning Outcomes</h2>
        <div class="lo-list">
          <div v-for="lo in relatedLOs" :key="lo.id" class="lo-item">
            <span class="lo-code">{{ lo.code }}</span>
            <span class="lo-desc">{{ lo.description }}</span>
          </div>
        </div>
      </div>

      <!-- Student's Submission (if submitted) -->
      <div v-if="hasSubmitted && mySubmission" class="my-submission-section">
        <h2>📄 คำตอบของฉัน</h2>
        
        <div class="submission-card">
          <div class="submission-meta">
            <span>📅 ส่งเมื่อ {{ formatDate(mySubmission.createdAt) }}</span>
            <span :class="['status-badge', mySubmission.status?.toLowerCase()]">
              {{ getStatusLabel(mySubmission.status) }}
            </span>
          </div>

          <div class="submission-answer">
            {{ mySubmission.answer }}
          </div>

          <!-- Scores -->
          <div v-if="mySubmission.finalRubric" class="scores-section">
            <h3>📊 คะแนน A.R.C.E.</h3>
            <div class="score-grid">
              <div class="score-item">
                <span class="score-label">Analysis</span>
                <span class="score-value">{{ mySubmission.finalRubric.analysis }}/5</span>
              </div>
              <div class="score-item">
                <span class="score-label">Reasoning</span>
                <span class="score-value">{{ mySubmission.finalRubric.reasoning }}/5</span>
              </div>
              <div class="score-item">
                <span class="score-label">Creativity</span>
                <span class="score-value">{{ mySubmission.finalRubric.creativity }}/5</span>
              </div>
              <div class="score-item">
                <span class="score-label">Evidence</span>
                <span class="score-value">{{ mySubmission.finalRubric.evidence }}/5</span>
              </div>
            </div>
            <div class="total-score">
              คะแนนรวม: <strong>{{ mySubmission.finalScore }}/{{ assignment.maxScore || 20 }}</strong>
            </div>
          </div>

          <!-- Feedback -->
          <div v-if="mySubmission.feedback" class="feedback-section">
            <h3>💬 Feedback</h3>
            <p>{{ mySubmission.feedback }}</p>
          </div>

          <!-- Appeal Button -->
          <div v-if="canAppeal" class="appeal-section">
            <router-link :to="`/appeal/${mySubmission.id}`" class="btn-appeal">
              📝 ยื่นอุทธรณ์
            </router-link>
          </div>
        </div>
      </div>

      <!-- Teacher View: Submissions List -->
      <div v-if="isTeacher" class="teacher-section">
        <div class="section-header">
          <h2>📝 งานที่ส่ง ({{ submissions.length }}/{{ assignment.totalStudents || 0 }})</h2>
          <button class="btn-export" @click="exportSubmissions">
            📥 Export
          </button>
        </div>

        <div class="submissions-table">
          <table>
            <thead>
              <tr>
                <th>นักเรียน</th>
                <th>วันที่ส่ง</th>
                <th>สถานะ</th>
                <th>คะแนน</th>
                <th>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sub in submissions" :key="sub.id">
                <td>
                  <div class="student-info">
                    <span class="student-name">{{ sub.studentName }}</span>
                    <span class="student-id">{{ sub.studentNumber }}</span>
                  </div>
                </td>
                <td>{{ formatDate(sub.createdAt) }}</td>
                <td>
                  <span :class="['status-badge', sub.status?.toLowerCase()]">
                    {{ getStatusLabel(sub.status) }}
                  </span>
                </td>
                <td>
                  <span v-if="sub.finalScore" class="score">{{ sub.finalScore }}/{{ assignment.maxScore || 20 }}</span>
                  <span v-else class="pending">รอตรวจ</span>
                </td>
                <td>
                  <router-link :to="`/submissions/${sub.id}`" class="btn-view">
                    👁️ ดู
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="submissions.length === 0" class="empty-submissions">
          <p>ยังไม่มีนักเรียนส่งงาน</p>
        </div>
      </div>

      <!-- Deadline Warning -->
      <div v-if="!isTeacher && !hasSubmitted && isOverdue" class="deadline-warning">
        <span class="warning-icon">⚠️</span>
        <span>งานนี้เลยกำหนดส่งแล้ว</span>
        <span v-if="assignment.allowLateSubmission">(อนุญาตให้ส่งล่าช้าได้)</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const assignmentId = route.params.id
const loading = ref(true)
const assignment = ref(null)
const mySubmission = ref(null)
const submissions = ref([])
const relatedLOs = ref([])

const isTeacher = computed(() => authStore.user?.role === 'teacher')

const hasSubmitted = computed(() => !!mySubmission.value)

const isOverdue = computed(() => {
  if (!assignment.value?.deadline) return false
  const deadline = assignment.value.deadline.toDate ? assignment.value.deadline.toDate() : new Date(assignment.value.deadline)
  return deadline < new Date()
})

const canAppeal = computed(() => {
  if (!mySubmission.value) return false
  const status = mySubmission.value.status
  return ['TEACHER_APPROVED', 'AUTO_APPROVED'].includes(status)
})

async function loadAssignment() {
  loading.value = true
  try {
    // Load assignment
    const assignmentDoc = await getDoc(doc(db, 'assignments', assignmentId))
    if (assignmentDoc.exists()) {
      assignment.value = { id: assignmentDoc.id, ...assignmentDoc.data() }
      
      // Load related LOs from course
      if (assignment.value.learningOutcomes?.length > 0 && assignment.value.courseId) {
        const courseDoc = await getDoc(doc(db, 'courses', assignment.value.courseId))
        if (courseDoc.exists()) {
          const courseLOs = courseDoc.data().learningOutcomes || []
          relatedLOs.value = courseLOs.filter(lo => 
            assignment.value.learningOutcomes.includes(lo.id)
          )
        }
      }
      
      if (isTeacher.value) {
        // Load all submissions for this assignment
        const subsQuery = query(
          collection(db, 'submissions'),
          where('assignmentId', '==', assignmentId)
        )
        const subsSnapshot = await getDocs(subsQuery)
        submissions.value = subsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      } else {
        // Load my submission
        const mySubQuery = query(
          collection(db, 'submissions'),
          where('assignmentId', '==', assignmentId),
          where('studentId', '==', authStore.user.uid)
        )
        const mySubSnapshot = await getDocs(mySubQuery)
        if (!mySubSnapshot.empty) {
          mySubmission.value = { id: mySubSnapshot.docs[0].id, ...mySubSnapshot.docs[0].data() }
        }
      }
    }
  } catch (error) {
    console.error('Error loading assignment:', error)
  } finally {
    loading.value = false
  }
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

function exportSubmissions() {
  const BOM = '\uFEFF'
  const headers = ['ชื่อ', 'เลขที่', 'วันที่ส่ง', 'สถานะ', 'A', 'R', 'C', 'E', 'คะแนนรวม']
  const rows = submissions.value.map(sub => [
    sub.studentName,
    sub.studentNumber,
    formatDate(sub.createdAt),
    getStatusLabel(sub.status),
    sub.finalRubric?.analysis || '',
    sub.finalRubric?.reasoning || '',
    sub.finalRubric?.creativity || '',
    sub.finalRubric?.evidence || '',
    sub.finalScore || ''
  ])
  
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `submissions_${assignment.value.title}.csv`
  a.click()
}

onMounted(loadAssignment)
</script>

<style scoped>
.assignment-detail {
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
.assignment-header {
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

.course-badge {
  display: inline-block;
  padding: 4px 12px;
  background: var(--bg-secondary);
  border-radius: 20px;
  font-size: 0.85rem;
  margin-bottom: 8px;
}

.header-info h1 {
  font-size: 1.5rem;
  margin-bottom: 12px;
}

.header-meta {
  display: flex;
  gap: 16px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.btn-submit {
  padding: 12px 24px;
  background: var(--primary-color);
  color: white;
  text-decoration: none;
  border-radius: 20px;
  font-weight: 500;
}

.submitted-info {
  text-align: right;
}

.submitted-badge {
  display: block;
  color: #10b981;
  font-weight: 500;
  margin-bottom: 4px;
}

.submitted-score {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
}

/* Description */
.description-section {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
}

.description-section h2 {
  margin-bottom: 16px;
}

.description-content {
  line-height: 1.8;
  color: var(--text-primary);
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

.lo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lo-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.lo-code {
  font-weight: 600;
  color: var(--primary-color);
}

/* My Submission */
.my-submission-section {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
}

.my-submission-section h2 {
  margin-bottom: 16px;
}

.submission-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.submission-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-secondary);
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
}

.status-badge.submitted { background: #fef3c7; color: #d97706; }
.status-badge.ai_scored { background: #dbeafe; color: #2563eb; }
.status-badge.in_teacher_queue { background: #fce7f3; color: #db2777; }
.status-badge.teacher_approved { background: #d1fae5; color: #059669; }
.status-badge.auto_approved { background: #d1fae5; color: #059669; }
.status-badge.finalized { background: #c7d2fe; color: #6366f1; }

.submission-answer {
  padding: 16px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.scores-section {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.scores-section h3 {
  margin-bottom: 12px;
  font-size: 1rem;
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.score-item {
  text-align: center;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.score-label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.score-value {
  font-size: 1.2rem;
  font-weight: 700;
}

.total-score {
  text-align: center;
  padding: 12px;
  font-size: 1.1rem;
}

.feedback-section {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  background: #fef3c7;
}

.feedback-section h3 {
  margin-bottom: 8px;
  font-size: 1rem;
}

.appeal-section {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.btn-appeal {
  display: inline-block;
  padding: 10px 20px;
  background: #f59e0b;
  color: white;
  text-decoration: none;
  border-radius: 8px;
}

/* Teacher Section */
.teacher-section {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.btn-export {
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.submissions-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

th {
  font-weight: 600;
  background: var(--bg-secondary);
}

.student-info {
  display: flex;
  flex-direction: column;
}

.student-name {
  font-weight: 500;
}

.student-id {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.score {
  font-weight: 700;
  color: var(--primary-color);
}

.pending {
  color: var(--text-secondary);
}

.btn-view {
  padding: 6px 12px;
  background: var(--primary-light);
  color: var(--primary-color);
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.85rem;
}

.empty-submissions {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

/* Deadline Warning */
.deadline-warning {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fef3c7;
  border-radius: 12px;
  color: #92400e;
}

.warning-icon {
  font-size: 1.5rem;
}
</style>
