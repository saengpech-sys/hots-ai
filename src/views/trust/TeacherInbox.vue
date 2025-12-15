<template>
  <div class="teacher-inbox">
    <!-- Header -->
    <div class="page-header">
      <h1>📥 กล่องงานรอตรวจ</h1>
      <div class="header-stats">
        <span class="stat pending">🔴 {{ stats.highPriority }} ด่วน</span>
        <span class="stat review">🟡 {{ stats.quickReview }} ตรวจเร็ว</span>
        <span class="stat auto">🟢 {{ stats.autoApproved }} ผ่านอัตโนมัติ</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <select v-model="selectedCourse">
        <option value="">📚 ทุกรายวิชา</option>
        <option v-for="course in courses" :key="course.id" :value="course.id">
          {{ course.name }}
        </option>
      </select>
      
      <select v-model="selectedPriority">
        <option value="">📋 ทุกระดับ</option>
        <option value="high">🔴 ด่วน (Confidence < 0.7)</option>
        <option value="medium">🟡 ตรวจเร็ว (0.7-0.84)</option>
        <option value="low">🟢 ผ่านอัตโนมัติ (≥ 0.85)</option>
      </select>
    </div>

    <!-- Loading -->
    <LoadingSpinner v-if="loading" />

    <!-- Empty State -->
    <EmptyState 
      v-else-if="filteredSubmissions.length === 0"
      icon="✅"
      title="ไม่มีงานรอตรวจ"
      description="ยินดีด้วย! งานทั้งหมดถูกตรวจแล้ว"
    />

    <!-- Submissions List -->
    <div class="submissions-list" v-else>
      <div 
        v-for="submission in filteredSubmissions"
        :key="submission.id"
        class="submission-card"
        :class="getPriorityClass(submission)"
      >
        <div class="card-header">
          <div class="student-info">
            <span class="student-name">{{ submission.studentName }}</span>
            <span class="assignment-name">{{ submission.assignmentTitle }}</span>
          </div>
          <div class="priority-badge" :class="getPriorityClass(submission)">
            {{ getPriorityLabel(submission) }}
          </div>
        </div>

        <!-- AI Assessment Summary -->
        <div class="ai-summary">
          <div class="score-preview">
            <span class="label">AI Score:</span>
            <span class="score">{{ submission.aiAssessment?.totalScore }}/20</span>
          </div>
          <div class="confidence-meter">
            <span class="label">Confidence:</span>
            <div class="meter-bar">
              <div 
                class="meter-fill"
                :style="{ width: `${(submission.aiAssessment?.confidence || 0) * 100}%` }"
                :class="getConfidenceClass(submission.aiAssessment?.confidence)"
              ></div>
            </div>
            <span class="value">{{ ((submission.aiAssessment?.confidence || 0) * 100).toFixed(0) }}%</span>
          </div>
        </div>

        <!-- Risk Flags -->
        <div v-if="submission.aiAssessment?.riskFlags?.length" class="risk-flags">
          <span class="flag" v-for="flag in submission.aiAssessment.riskFlags" :key="flag">
            ⚠️ {{ flag }}
          </span>
        </div>

        <!-- A.R.C.E. Preview -->
        <div class="arce-preview">
          <div class="dimension" v-for="dim in dimensions" :key="dim.key">
            <span class="dim-icon">{{ dim.icon }}</span>
            <span class="dim-score">{{ submission.aiAssessment?.rubricScores?.[dim.key] || 0 }}/5</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="card-actions">
          <router-link :to="`/submissions/${submission.id}`" class="btn-review">
            📝 ตรวจงาน
          </router-link>
          <button 
            v-if="(submission.aiAssessment?.confidence || 0) >= 0.85"
            class="btn-approve"
            @click="quickApprove(submission)"
          >
            ✅ อนุมัติ
          </button>
        </div>

        <div class="submitted-time">
          📅 ส่งเมื่อ {{ formatDate(submission.submittedAt) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import EmptyState from '@/components/EmptyState.vue'

const authStore = useAuthStore()
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'

// State
const loading = ref(true)
const submissions = ref([])
const courses = ref([])
const selectedCourse = ref('')
const selectedPriority = ref('')

// Dimensions
const dimensions = [
  { key: 'analysis', icon: '🔍' },
  { key: 'reasoning', icon: '🧠' },
  { key: 'creativity', icon: '💡' },
  { key: 'evidence', icon: '📚' }
]

// Computed
const stats = computed(() => {
  const all = submissions.value
  return {
    highPriority: all.filter(s => (s.aiAssessment?.confidence || 0) < 0.7).length,
    quickReview: all.filter(s => {
      const c = s.aiAssessment?.confidence || 0
      return c >= 0.7 && c < 0.85
    }).length,
    autoApproved: all.filter(s => (s.aiAssessment?.confidence || 0) >= 0.85).length
  }
})

const filteredSubmissions = computed(() => {
  let result = [...submissions.value]
  
  if (selectedCourse.value) {
    result = result.filter(s => s.courseId === selectedCourse.value)
  }
  
  if (selectedPriority.value) {
    result = result.filter(s => {
      const c = s.aiAssessment?.confidence || 0
      if (selectedPriority.value === 'high') return c < 0.7
      if (selectedPriority.value === 'medium') return c >= 0.7 && c < 0.85
      if (selectedPriority.value === 'low') return c >= 0.85
      return true
    })
  }
  
  // Sort by confidence (low first = high priority)
  result.sort((a, b) => (a.aiAssessment?.confidence || 0) - (b.aiAssessment?.confidence || 0))
  
  return result
})

// Methods
async function loadInbox() {
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
      // Load pending submissions (status = PENDING_REVIEW or QUICK_REVIEW)
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('courseId', 'in', courseIds.slice(0, 10)),
        where('status', 'in', ['PENDING_REVIEW', 'QUICK_REVIEW', 'AUTO_APPROVED'])
      )
      const submissionsSnapshot = await getDocs(submissionsQuery)
      
      submissions.value = submissionsSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }))
    }
  } catch (error) {
    console.error('Error loading inbox:', error)
  } finally {
    loading.value = false
  }
}

function getPriorityClass(submission) {
  const confidence = submission.aiAssessment?.confidence || 0
  if (confidence < 0.7) return 'high'
  if (confidence < 0.85) return 'medium'
  return 'low'
}

function getPriorityLabel(submission) {
  const confidence = submission.aiAssessment?.confidence || 0
  if (confidence < 0.7) return '🔴 ด่วน'
  if (confidence < 0.85) return '🟡 ตรวจเร็ว'
  return '🟢 ผ่านอัตโนมัติ'
}

function getConfidenceClass(confidence) {
  if (!confidence) return 'low'
  if (confidence >= 0.85) return 'high'
  if (confidence >= 0.7) return 'medium'
  return 'low'
}

async function quickApprove(submission) {
  if (!confirm('อนุมัติคะแนน AI โดยไม่แก้ไข?')) return
  
  try {
    const response = await fetch(`${FUNCTIONS_URL}/submitTeacherReview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId: submission.id,
        teacherId: authStore.user.uid,
        teacherName: authStore.user.displayName,
        decision: 'approve',
        finalRubric: submission.aiAssessment.rubricScores,
        comment: 'อนุมัติตามการประเมินของ AI'
      })
    })
    
    const data = await response.json()
    if (data.success) {
      // Remove from list
      submissions.value = submissions.value.filter(s => s.id !== submission.id)
      alert('✅ อนุมัติเรียบร้อยแล้ว')
    }
  } catch (error) {
    console.error('Error approving:', error)
    alert('เกิดข้อผิดพลาด')
  }
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

onMounted(loadInbox)
</script>

<style scoped>
.teacher-inbox {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

/* Header */
.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 1.5rem;
  margin-bottom: 12px;
}

.header-stats {
  display: flex;
  gap: 16px;
}

.stat {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.stat.pending {
  background: #fee2e2;
  color: #dc2626;
}

.stat.review {
  background: #fef3c7;
  color: #d97706;
}

.stat.auto {
  background: #d1fae5;
  color: #059669;
}

/* Filters */
.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.filters-bar select {
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
}

/* Submissions List */
.submissions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.submission-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  border-left: 4px solid var(--border-color);
}

.submission-card.high {
  border-left-color: #ef4444;
}

.submission-card.medium {
  border-left-color: #f59e0b;
}

.submission-card.low {
  border-left-color: #10b981;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.student-info {
  display: flex;
  flex-direction: column;
}

.student-name {
  font-weight: 600;
  font-size: 1.1rem;
}

.assignment-name {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.priority-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
}

.priority-badge.high {
  background: #fee2e2;
  color: #dc2626;
}

.priority-badge.medium {
  background: #fef3c7;
  color: #d97706;
}

.priority-badge.low {
  background: #d1fae5;
  color: #059669;
}

/* AI Summary */
.ai-summary {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.score-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-preview .score {
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--primary-color);
}

.confidence-meter {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.confidence-meter .label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.meter-bar {
  flex: 1;
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.meter-fill.high {
  background: #10b981;
}

.meter-fill.medium {
  background: #f59e0b;
}

.meter-fill.low {
  background: #ef4444;
}

.confidence-meter .value {
  font-weight: 600;
  min-width: 40px;
}

/* Risk Flags */
.risk-flags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.flag {
  padding: 4px 10px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  font-size: 0.85rem;
}

/* A.R.C.E. Preview */
.arce-preview {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.dimension {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--bg-secondary);
  border-radius: 20px;
  font-size: 0.9rem;
}

.dim-icon {
  font-size: 1rem;
}

.dim-score {
  font-weight: 600;
}

/* Actions */
.card-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.btn-review {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
}

.btn-approve {
  padding: 10px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

.submitted-time {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
</style>
