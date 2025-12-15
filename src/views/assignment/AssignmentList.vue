<template>
  <div class="assignment-list">
    <!-- Header -->
    <div class="page-header">
      <h1>📋 งานที่มอบหมาย</h1>
      <button v-if="isTeacher" class="btn-create" @click="showCreateModal = true">
        ➕ สร้างงานใหม่
      </button>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <button 
        v-for="tab in filterTabs" 
        :key="tab.value"
        :class="['tab', { active: activeFilter === tab.value }]"
        @click="activeFilter = tab.value"
      >
        {{ tab.icon }} {{ tab.label }}
        <span class="count" v-if="tab.count">{{ tab.count }}</span>
      </button>
    </div>

    <!-- Course Filter (for students) -->
    <div class="course-filter" v-if="!isTeacher && courses.length > 1">
      <select v-model="selectedCourse">
        <option value="">📚 ทุกรายวิชา</option>
        <option v-for="course in courses" :key="course.id" :value="course.id">
          {{ course.name }}
        </option>
      </select>
    </div>

    <!-- Loading -->
    <LoadingSpinner v-if="loading" />

    <!-- Empty State -->
    <EmptyState 
      v-else-if="filteredAssignments.length === 0"
      icon="📭"
      title="ไม่มีงาน"
      :description="isTeacher ? 'สร้างงานใหม่เพื่อมอบหมายให้นักเรียน' : 'ยังไม่มีงานที่มอบหมายในขณะนี้'"
    />

    <!-- Assignments Grid -->
    <div class="assignments-grid" v-else>
      <div 
        v-for="assignment in filteredAssignments"
        :key="assignment.id"
        class="assignment-card"
        :class="{ overdue: isOverdue(assignment), completed: hasSubmitted(assignment) }"
        @click="viewAssignment(assignment.id)"
      >
        <div class="card-header">
          <span class="course-badge">{{ assignment.courseName }}</span>
          <span class="status-badge" :class="getStatusClass(assignment)">
            {{ getStatusLabel(assignment) }}
          </span>
        </div>

        <h3 class="assignment-title">{{ assignment.title }}</h3>
        
        <p class="assignment-description">
          {{ truncate(assignment.description, 100) }}
        </p>

        <div class="assignment-meta">
          <span class="meta-item">
            📊 {{ assignment.maxScore || 20 }} คะแนน
          </span>
          <span class="meta-item">
            📝 {{ assignment.submissionCount || 0 }}/{{ assignment.totalStudents || 0 }} ส่งแล้ว
          </span>
        </div>

        <div class="deadline-section">
          <span class="deadline-icon">⏰</span>
          <span class="deadline-text" :class="{ urgent: isUrgent(assignment) }">
            {{ formatDeadline(assignment.deadline) }}
          </span>
        </div>

        <!-- Progress Bar (for teachers) -->
        <div v-if="isTeacher" class="progress-section">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: getProgressPercent(assignment) + '%' }"
            ></div>
          </div>
          <span class="progress-text">{{ getProgressPercent(assignment) }}% ส่งแล้ว</span>
        </div>

        <!-- Student Submission Status -->
        <div v-else class="submission-status">
          <template v-if="hasSubmitted(assignment)">
            <span class="submitted-badge">✅ ส่งแล้ว</span>
            <span class="score" v-if="getMyScore(assignment)">
              {{ getMyScore(assignment) }}/{{ assignment.maxScore || 20 }}
            </span>
          </template>
          <template v-else>
            <span class="not-submitted">❌ ยังไม่ส่ง</span>
          </template>
        </div>
      </div>
    </div>

    <!-- Create Assignment Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal create-modal">
          <div class="modal-header">
            <h2>➕ สร้างงานใหม่</h2>
            <button class="close-btn" @click="showCreateModal = false">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>รายวิชา *</label>
              <select v-model="newAssignment.courseId" required>
                <option value="">-- เลือกรายวิชา --</option>
                <option v-for="course in teacherCourses" :key="course.id" :value="course.id">
                  {{ course.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>ชื่องาน *</label>
              <input 
                v-model="newAssignment.title"
                type="text"
                placeholder="เช่น ใบงานที่ 1 - การวิเคราะห์ข้อมูล"
              >
            </div>

            <div class="form-group">
              <label>คำอธิบาย</label>
              <textarea 
                v-model="newAssignment.description"
                placeholder="อธิบายรายละเอียดงาน..."
                rows="4"
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>คะแนนเต็ม</label>
                <input 
                  v-model.number="newAssignment.maxScore"
                  type="number"
                  min="1"
                  max="100"
                >
              </div>
              <div class="form-group">
                <label>กำหนดส่ง</label>
                <input 
                  v-model="newAssignment.deadline"
                  type="datetime-local"
                >
              </div>
            </div>

            <div class="form-group">
              <label>Learning Outcomes ที่เกี่ยวข้อง</label>
              <div class="lo-selector" v-if="selectedCourseLOs.length > 0">
                <div 
                  v-for="lo in selectedCourseLOs"
                  :key="lo.id"
                  :class="['lo-option', { selected: newAssignment.learningOutcomes.includes(lo.id) }]"
                  @click="toggleLO(lo.id)"
                >
                  <input type="checkbox" :checked="newAssignment.learningOutcomes.includes(lo.id)">
                  <span>{{ lo.code }}: {{ lo.description }}</span>
                </div>
              </div>
              <p v-else class="hint">เลือกรายวิชาก่อนเพื่อดู LO</p>
            </div>

            <div class="form-group">
              <label>
                <input type="checkbox" v-model="newAssignment.allowLateSubmission">
                อนุญาตส่งงานหลังกำหนด
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="showCreateModal = false">ยกเลิก</button>
            <button 
              class="btn-primary"
              @click="createAssignment"
              :disabled="!canCreate || creating"
            >
              {{ creating ? 'กำลังสร้าง...' : '✅ สร้างงาน' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(true)
const assignments = ref([])
const courses = ref([])
const teacherCourses = ref([])
const mySubmissions = ref([])

const activeFilter = ref('all')
const selectedCourse = ref('')
const showCreateModal = ref(false)
const creating = ref(false)

const newAssignment = ref({
  courseId: '',
  title: '',
  description: '',
  maxScore: 20,
  deadline: '',
  learningOutcomes: [],
  allowLateSubmission: false
})

// Computed
const isTeacher = computed(() => authStore.user?.role === 'teacher')

const filterTabs = computed(() => {
  const tabs = [
    { value: 'all', label: 'ทั้งหมด', icon: '📋', count: assignments.value.length }
  ]
  
  if (isTeacher.value) {
    tabs.push(
      { value: 'active', label: 'กำลังเปิด', icon: '🟢', count: assignments.value.filter(a => !isPastDeadline(a)).length },
      { value: 'closed', label: 'ปิดแล้ว', icon: '🔴', count: assignments.value.filter(a => isPastDeadline(a)).length }
    )
  } else {
    tabs.push(
      { value: 'pending', label: 'รอส่ง', icon: '⏳', count: assignments.value.filter(a => !hasSubmitted(a)).length },
      { value: 'submitted', label: 'ส่งแล้ว', icon: '✅', count: assignments.value.filter(a => hasSubmitted(a)).length }
    )
  }
  
  return tabs
})

const filteredAssignments = computed(() => {
  let result = [...assignments.value]
  
  // Filter by course
  if (selectedCourse.value) {
    result = result.filter(a => a.courseId === selectedCourse.value)
  }
  
  // Filter by tab
  switch (activeFilter.value) {
    case 'active':
      result = result.filter(a => !isPastDeadline(a))
      break
    case 'closed':
      result = result.filter(a => isPastDeadline(a))
      break
    case 'pending':
      result = result.filter(a => !hasSubmitted(a))
      break
    case 'submitted':
      result = result.filter(a => hasSubmitted(a))
      break
  }
  
  // Sort by deadline (closest first)
  result.sort((a, b) => {
    const deadlineA = a.deadline?.toDate?.() || new Date(a.deadline)
    const deadlineB = b.deadline?.toDate?.() || new Date(b.deadline)
    return deadlineA - deadlineB
  })
  
  return result
})

const selectedCourseLOs = computed(() => {
  if (!newAssignment.value.courseId) return []
  const course = teacherCourses.value.find(c => c.id === newAssignment.value.courseId)
  return course?.learningOutcomes || []
})

const canCreate = computed(() => {
  return newAssignment.value.courseId && newAssignment.value.title.trim()
})

// Methods
async function loadAssignments() {
  loading.value = true
  try {
    if (isTeacher.value) {
      // Load teacher's courses first
      const coursesQuery = query(
        collection(db, 'courses'),
        where('teacherId', '==', authStore.user.uid)
      )
      const coursesSnapshot = await getDocs(coursesQuery)
      teacherCourses.value = coursesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      
      const courseIds = teacherCourses.value.map(c => c.id)
      
      if (courseIds.length > 0) {
        // Load assignments for teacher's courses
        const assignmentsQuery = query(
          collection(db, 'assignments'),
          where('courseId', 'in', courseIds.slice(0, 10)) // Firestore limit
        )
        const assignmentsSnapshot = await getDocs(assignmentsQuery)
        assignments.value = assignmentsSnapshot.docs.map(d => {
          const data = d.data()
          const course = teacherCourses.value.find(c => c.id === data.courseId)
          return {
            id: d.id,
            ...data,
            courseName: course?.name || 'รายวิชา'
          }
        })
      }
    } else {
      // Student: Load enrolled courses' assignments
      const enrollmentsQuery = query(
        collection(db, 'enrollments'),
        where('studentId', '==', authStore.user.uid)
      )
      const enrollSnapshot = await getDocs(enrollmentsQuery)
      const courseIds = enrollSnapshot.docs.map(d => d.data().courseId)
      
      if (courseIds.length > 0) {
        // Get courses
        const coursesQuery = query(
          collection(db, 'courses'),
          where('__name__', 'in', courseIds.slice(0, 10))
        )
        const coursesSnapshot = await getDocs(coursesQuery)
        courses.value = coursesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        
        // Get assignments
        const assignmentsQuery = query(
          collection(db, 'assignments'),
          where('courseId', 'in', courseIds.slice(0, 10))
        )
        const assignmentsSnapshot = await getDocs(assignmentsQuery)
        assignments.value = assignmentsSnapshot.docs.map(d => {
          const data = d.data()
          const course = courses.value.find(c => c.id === data.courseId)
          return {
            id: d.id,
            ...data,
            courseName: course?.name || 'รายวิชา'
          }
        })
        
        // Get my submissions
        const subsQuery = query(
          collection(db, 'submissions'),
          where('studentId', '==', authStore.user.uid)
        )
        const subsSnapshot = await getDocs(subsQuery)
        mySubmissions.value = subsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      }
    }
  } catch (error) {
    console.error('Error loading assignments:', error)
  } finally {
    loading.value = false
  }
}

function hasSubmitted(assignment) {
  return mySubmissions.value.some(s => s.assignmentId === assignment.id)
}

function getMyScore(assignment) {
  const sub = mySubmissions.value.find(s => s.assignmentId === assignment.id)
  return sub?.finalScore
}

function isOverdue(assignment) {
  if (!assignment.deadline) return false
  const deadline = assignment.deadline.toDate ? assignment.deadline.toDate() : new Date(assignment.deadline)
  return deadline < new Date() && !hasSubmitted(assignment)
}

function isUrgent(assignment) {
  if (!assignment.deadline) return false
  const deadline = assignment.deadline.toDate ? assignment.deadline.toDate() : new Date(assignment.deadline)
  const hoursLeft = (deadline - new Date()) / (1000 * 60 * 60)
  return hoursLeft > 0 && hoursLeft < 24
}

function isPastDeadline(assignment) {
  if (!assignment.deadline) return false
  const deadline = assignment.deadline.toDate ? assignment.deadline.toDate() : new Date(assignment.deadline)
  return deadline < new Date()
}

function getStatusClass(assignment) {
  if (hasSubmitted(assignment)) return 'submitted'
  if (isOverdue(assignment)) return 'overdue'
  if (isUrgent(assignment)) return 'urgent'
  return 'active'
}

function getStatusLabel(assignment) {
  if (hasSubmitted(assignment)) return '✅ ส่งแล้ว'
  if (isOverdue(assignment)) return '⚠️ เลยกำหนด'
  if (isUrgent(assignment)) return '🔥 ใกล้ครบกำหนด'
  return '🟢 เปิดรับ'
}

function getProgressPercent(assignment) {
  if (!assignment.totalStudents) return 0
  return Math.round((assignment.submissionCount || 0) / assignment.totalStudents * 100)
}

function formatDeadline(deadline) {
  if (!deadline) return 'ไม่กำหนด'
  const date = deadline.toDate ? deadline.toDate() : new Date(deadline)
  const now = new Date()
  const diff = date - now
  
  if (diff < 0) {
    return `เลยกำหนด ${formatDate(date)}`
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `อีก ${days} วัน (${formatDate(date)})`
  } else if (hours > 0) {
    return `อีก ${hours} ชั่วโมง`
  } else {
    const minutes = Math.floor(diff / (1000 * 60))
    return `อีก ${minutes} นาที`
  }
}

function formatDate(date) {
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function truncate(text, length) {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

function toggleLO(loId) {
  const idx = newAssignment.value.learningOutcomes.indexOf(loId)
  if (idx === -1) {
    newAssignment.value.learningOutcomes.push(loId)
  } else {
    newAssignment.value.learningOutcomes.splice(idx, 1)
  }
}

function viewAssignment(id) {
  router.push(`/assignments/${id}`)
}

async function createAssignment() {
  if (!canCreate.value) return
  
  creating.value = true
  try {
    const course = teacherCourses.value.find(c => c.id === newAssignment.value.courseId)
    
    const assignmentData = {
      courseId: newAssignment.value.courseId,
      courseName: course?.name || '',
      teacherId: authStore.user.uid,
      title: newAssignment.value.title.trim(),
      description: newAssignment.value.description.trim(),
      maxScore: newAssignment.value.maxScore || 20,
      deadline: newAssignment.value.deadline ? Timestamp.fromDate(new Date(newAssignment.value.deadline)) : null,
      learningOutcomes: newAssignment.value.learningOutcomes,
      allowLateSubmission: newAssignment.value.allowLateSubmission,
      submissionCount: 0,
      totalStudents: course?.studentCount || 0,
      status: 'active',
      createdAt: serverTimestamp()
    }
    
    await addDoc(collection(db, 'assignments'), assignmentData)
    
    showCreateModal.value = false
    newAssignment.value = {
      courseId: '',
      title: '',
      description: '',
      maxScore: 20,
      deadline: '',
      learningOutcomes: [],
      allowLateSubmission: false
    }
    
    await loadAssignments()
  } catch (error) {
    console.error('Error creating assignment:', error)
    alert('เกิดข้อผิดพลาด')
  } finally {
    creating.value = false
  }
}

onMounted(loadAssignments)
</script>

<style scoped>
.assignment-list {
  max-width: 1000px;
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

.btn-create {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 500;
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--card-bg);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
}

.tab.active {
  background: var(--primary-color);
  color: white;
}

.count {
  padding: 2px 8px;
  background: var(--bg-secondary);
  border-radius: 10px;
  font-size: 0.8rem;
}

.tab.active .count {
  background: rgba(255,255,255,0.2);
}

/* Course Filter */
.course-filter {
  margin-bottom: 16px;
}

.course-filter select {
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  min-width: 200px;
}

/* Assignments Grid */
.assignments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.assignment-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 2px solid transparent;
}

.assignment-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.assignment-card.overdue {
  border-color: #ef4444;
}

.assignment-card.completed {
  border-color: #10b981;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.course-badge {
  padding: 4px 10px;
  background: var(--bg-secondary);
  border-radius: 12px;
  font-size: 0.8rem;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.status-badge.active { background: #d1fae5; color: #059669; }
.status-badge.urgent { background: #fef3c7; color: #d97706; }
.status-badge.overdue { background: #fee2e2; color: #dc2626; }
.status-badge.submitted { background: #dbeafe; color: #2563eb; }

.assignment-title {
  font-size: 1.1rem;
  margin-bottom: 8px;
}

.assignment-description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 12px;
  line-height: 1.5;
}

.assignment-meta {
  display: flex;
  gap: 16px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.deadline-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 12px;
}

.deadline-text {
  font-size: 0.9rem;
}

.deadline-text.urgent {
  color: #f59e0b;
  font-weight: 600;
}

/* Progress Section */
.progress-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-color);
  border-radius: 4px;
}

.progress-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Submission Status */
.submission-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.submitted-badge {
  color: #10b981;
  font-weight: 500;
}

.not-submitted {
  color: #ef4444;
}

.score {
  font-weight: 700;
  color: var(--primary-color);
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

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.lo-selector {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.lo-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color);
}

.lo-option:last-child {
  border-bottom: none;
}

.lo-option.selected {
  background: var(--primary-light);
}

.hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
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
