<template>
  <div class="admin-lo-manager">
    <div class="page-header">
      <button @click="$router.back()" class="back-btn">← กลับ</button>
      <div class="header-content">
        <h1>🔧 Admin: จัดการ Learning Outcomes</h1>
        <p class="subtitle">แก้ไข LO ที่ผ่านของนักเรียนแต่ละคน</p>
      </div>
    </div>

    <!-- Course Selection -->
    <div class="card">
      <h2>📚 เลือกรายวิชา</h2>
      <div class="course-selector">
        <select v-model="selectedCourseId" @change="onCourseChange" class="form-select">
          <option value="">-- เลือกรายวิชา --</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.courseCode }} - {{ course.courseName }}
          </option>
        </select>
      </div>
    </div>

    <!-- Course Info & LO List -->
    <div v-if="selectedCourse" class="card">
      <h2>🎯 Learning Outcomes ของวิชา ({{ learningOutcomes.length }} รายการ)</h2>
      <div class="lo-list-header">
        <div class="lo-item-preview" v-for="lo in learningOutcomes" :key="lo.code || lo.loCode">
          <span class="lo-code-badge">{{ lo.code || lo.loCode }}</span>
          <span class="lo-desc">{{ lo.description || lo.loDescription }}</span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Student Search & Filter -->
    <div v-if="selectedCourseId && !loading" class="card">
      <h2>🔍 ค้นหานักเรียน</h2>
      <div class="search-filters">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="ค้นหา รหัสนักเรียน, ชื่อ..."
          class="search-input"
        >
        <select v-model="filterGrade" class="filter-select">
          <option value="">ทุกชั้น</option>
          <option v-for="grade in availableGrades" :key="grade" :value="grade">
            ชั้น {{ grade }}
          </option>
        </select>
        <select v-model="filterRoom" class="filter-select">
          <option value="">ทุกห้อง</option>
          <option v-for="room in availableRooms" :key="room" :value="room">
            ห้อง {{ room }}
          </option>
        </select>
      </div>
    </div>

    <!-- Student List -->
    <div v-if="selectedCourseId && !loading && filteredStudents.length > 0" class="students-section">
      <h2>👥 รายชื่อนักเรียน ({{ filteredStudents.length }} คน)</h2>
      
      <div 
        v-for="student in filteredStudents" 
        :key="student.id"
        class="student-card card"
        :class="{ expanded: expandedStudentId === student.id }"
      >
        <!-- Student Header -->
        <div class="student-header" @click="toggleStudent(student.id)">
          <div class="student-info">
            <span class="student-id">{{ student.studentId }}</span>
            <span class="student-name">{{ student.name }}</span>
            <span class="student-class">{{ student.grade }}/{{ student.room }}</span>
          </div>
          <div class="student-progress">
            <span class="lo-count" :class="getProgressClass(student.passedLOs.length, learningOutcomes.length)">
              {{ student.passedLOs.length }} / {{ learningOutcomes.length }} LO
            </span>
            <span class="toggle-icon">{{ expandedStudentId === student.id ? '▼' : '▶' }}</span>
          </div>
        </div>

        <!-- LO Overview (Always visible) -->
        <div class="lo-overview">
          <span 
            v-for="lo in learningOutcomes" 
            :key="lo.code || lo.loCode"
            class="lo-mini-badge"
            :class="{ passed: student.passedLOs.includes(lo.code || lo.loCode) }"
            :title="lo.description || lo.loDescription"
          >
            {{ lo.code || lo.loCode }}
          </span>
        </div>

        <!-- Expanded Details -->
        <div v-if="expandedStudentId === student.id" class="student-details">
          <!-- Quick Add Missing LOs -->
          <div class="quick-add-section">
            <h4>⚡ Quick Add: เพิ่ม LO ที่ยังไม่ผ่าน</h4>
            <div class="missing-los">
              <span v-if="getMissingLOs(student.passedLOs).length === 0" class="all-passed">
                🎉 ผ่านครบทุก LO แล้ว!
              </span>
              <button 
                v-for="lo in getMissingLOs(student.passedLOs)" 
                :key="lo.code || lo.loCode"
                class="btn-add-lo"
                @click="quickAddLO(student, lo.code || lo.loCode)"
                :disabled="saving"
              >
                ➕ {{ lo.code || lo.loCode }}
              </button>
            </div>
          </div>

          <!-- Assessment History -->
          <div class="assessments-section">
            <h4>📋 ประวัติการประเมิน ({{ student.assessments.length }} ครั้ง)</h4>
            
            <div v-if="student.assessments.length === 0" class="no-assessments">
              ยังไม่มีประวัติการประเมิน
            </div>
            
            <div 
              v-for="(assessment, idx) in student.assessments.slice(0, showAllAssessments[student.id] ? undefined : 5)" 
              :key="assessment.id"
              class="assessment-item"
            >
              <div class="assessment-header">
                <span class="assessment-num">#{{ student.assessments.length - idx }}</span>
                <span class="assessment-date">{{ formatDate(assessment.createdAt) }}</span>
                <span class="assessment-score" :class="getScoreClass(assessment.overallScore)">
                  {{ assessment.overallScore }}/20
                </span>
                <span v-if="assessment.loAssessment?.manuallyModified" class="manual-badge">
                  ✏️ แก้ไขแล้ว
                </span>
              </div>
              
              <div class="assessment-los">
                <span class="lo-label">LO ที่ผ่าน:</span>
                <span 
                  v-if="assessment.loAssessment?.passedLOs?.length > 0"
                  v-for="lo in assessment.loAssessment.passedLOs" 
                  :key="lo"
                  class="lo-badge passed"
                >
                  {{ lo }}
                </span>
                <span v-else class="no-lo">ไม่มี</span>
                
                <button 
                  class="btn-edit-lo"
                  @click="openEditModal(student, assessment)"
                >
                  ✏️ แก้ไข
                </button>
              </div>
            </div>
            
            <button 
              v-if="student.assessments.length > 5"
              class="btn-show-more"
              @click="toggleShowAllAssessments(student.id)"
            >
              {{ showAllAssessments[student.id] ? '▲ แสดงน้อยลง' : `▼ แสดงทั้งหมด (${student.assessments.length} ครั้ง)` }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="selectedCourseId && !loading && filteredStudents.length === 0" class="empty-state card">
      <div class="empty-icon">📭</div>
      <h3>ไม่พบนักเรียน</h3>
      <p>ไม่มีนักเรียนที่ตรงกับเงื่อนไขการค้นหา หรือยังไม่มีนักเรียนทำการประเมินในวิชานี้</p>
    </div>

    <!-- Edit LO Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>✏️ แก้ไข LO - Assessment #{{ editingAssessment?.num }}</h3>
          <button class="close-btn" @click="closeEditModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="assessment-info">
            <p><strong>นักเรียน:</strong> {{ editingStudent?.name }}</p>
            <p><strong>วันที่:</strong> {{ formatDate(editingAssessment?.createdAt) }}</p>
            <p><strong>คะแนน:</strong> {{ editingAssessment?.overallScore }}/20</p>
          </div>

          <div class="lo-checkboxes">
            <h4>เลือก LO ที่ผ่าน:</h4>
            <label 
              v-for="lo in learningOutcomes" 
              :key="lo.code || lo.loCode"
              class="lo-checkbox"
            >
              <input 
                type="checkbox" 
                :value="lo.code || lo.loCode"
                v-model="editingLOs"
              >
              <span class="lo-code">{{ lo.code || lo.loCode }}</span>
              <span class="lo-desc">{{ lo.description || lo.loDescription }}</span>
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeEditModal">ยกเลิก</button>
          <button class="btn btn-primary" @click="saveEditedLOs" :disabled="saving">
            {{ saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Success/Error Toast -->
    <div v-if="toast.show" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import { 
  getStudentPassedLOs, 
  updateAssessmentPassedLOs,
  addLOToAssessment 
} from '@/utils/loProgress'

const authStore = useAuthStore()

// State
const courses = ref([])
const selectedCourseId = ref('')
const selectedCourse = ref(null)
const learningOutcomes = ref([])
const students = ref([])
const loading = ref(false)
const saving = ref(false)

// Search & Filter
const searchQuery = ref('')
const filterGrade = ref('')
const filterRoom = ref('')

// UI State
const expandedStudentId = ref(null)
const showAllAssessments = ref({})

// Edit Modal
const showEditModal = ref(false)
const editingStudent = ref(null)
const editingAssessment = ref(null)
const editingLOs = ref([])

// Toast
const toast = ref({ show: false, message: '', type: 'success' })

// Load courses on mount
onMounted(async () => {
  try {
    const coursesRef = collection(db, 'courses')
    const q = query(coursesRef, where('teacherId', '==', authStore.user.uid))
    const snapshot = await getDocs(q)
    
    courses.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading courses:', error)
    showToast('เกิดข้อผิดพลาดในการโหลดรายวิชา', 'error')
  }
})

// Course change handler
async function onCourseChange() {
  if (!selectedCourseId.value) {
    selectedCourse.value = null
    learningOutcomes.value = []
    students.value = []
    return
  }

  loading.value = true
  try {
    // Load course details
    const courseDoc = await getDoc(doc(db, 'courses', selectedCourseId.value))
    if (courseDoc.exists()) {
      selectedCourse.value = { id: courseDoc.id, ...courseDoc.data() }
      learningOutcomes.value = selectedCourse.value.learningOutcomes || []
    }

    // Load student progress data
    await loadStudentData()
  } catch (error) {
    console.error('Error loading course:', error)
    showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลรายวิชา', 'error')
  } finally {
    loading.value = false
  }
}

// Load student data with their assessments
async function loadStudentData() {
  try {
    // Get all assessments for this course
    const assessmentsRef = collection(db, 'assessments')
    const q = query(
      assessmentsRef,
      where('courseId', '==', selectedCourseId.value)
    )
    const snapshot = await getDocs(q)

    // Group by student
    const studentMap = new Map()

    for (const docSnap of snapshot.docs) {
      const assessment = { id: docSnap.id, ...docSnap.data() }
      const studentId = assessment.studentId

      if (!studentMap.has(studentId)) {
        // Load student info
        let studentInfo = {
          uid: studentId,
          studentId: studentId,
          name: 'ไม่ระบุชื่อ',
          grade: '-',
          room: '-'
        }

        try {
          const userDoc = await getDoc(doc(db, 'users', studentId))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            studentInfo = {
              uid: studentId,
              studentId: userData.studentId || studentId,
              name: userData.displayName || 'ไม่ระบุชื่อ',
              grade: userData.grade || '-',
              room: userData.room || '-'
            }
          }
        } catch (err) {
          console.warn('Could not load student info:', studentId)
        }

        studentMap.set(studentId, {
          id: studentId,
          ...studentInfo,
          assessments: [],
          passedLOs: []
        })
      }

      studentMap.get(studentId).assessments.push(assessment)
    }

    // Calculate passed LOs for each student and sort assessments
    for (const student of studentMap.values()) {
      // Sort assessments by date (newest first)
      student.assessments.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || 0
        const dateB = b.createdAt?.toMillis?.() || 0
        return dateB - dateA
      })

      // Calculate unique passed LOs
      const passedLOsSet = new Set()
      student.assessments.forEach(a => {
        if (a.loAssessment?.passedLOs) {
          a.loAssessment.passedLOs.forEach(lo => passedLOsSet.add(lo))
        }
      })
      student.passedLOs = Array.from(passedLOsSet).sort()
    }

    students.value = Array.from(studentMap.values())
  } catch (error) {
    console.error('Error loading student data:', error)
    throw error
  }
}

// Computed
const filteredStudents = computed(() => {
  let filtered = students.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(s => 
      s.studentId?.toLowerCase().includes(query) ||
      s.name?.toLowerCase().includes(query)
    )
  }

  // Grade filter
  if (filterGrade.value) {
    filtered = filtered.filter(s => s.grade === filterGrade.value)
  }

  // Room filter
  if (filterRoom.value) {
    filtered = filtered.filter(s => s.room === filterRoom.value)
  }

  return filtered.sort((a, b) => {
    // Sort by student ID
    return (a.studentId || '').localeCompare(b.studentId || '')
  })
})

const availableGrades = computed(() => {
  const grades = [...new Set(students.value.map(s => s.grade).filter(g => g && g !== '-'))]
  return grades.sort()
})

const availableRooms = computed(() => {
  const rooms = [...new Set(students.value.map(s => s.room).filter(r => r && r !== '-'))]
  return rooms.sort((a, b) => {
    const numA = parseInt(a)
    const numB = parseInt(b)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    return a.localeCompare(b)
  })
})

// Methods
function toggleStudent(studentId) {
  expandedStudentId.value = expandedStudentId.value === studentId ? null : studentId
}

function toggleShowAllAssessments(studentId) {
  showAllAssessments.value[studentId] = !showAllAssessments.value[studentId]
}

function getMissingLOs(passedLOs) {
  return learningOutcomes.value.filter(lo => {
    const code = lo.code || lo.loCode
    return !passedLOs.includes(code)
  })
}

function getProgressClass(passed, total) {
  const percent = (passed / total) * 100
  if (percent === 100) return 'complete'
  if (percent >= 70) return 'high'
  if (percent >= 40) return 'medium'
  return 'low'
}

function getScoreClass(score) {
  if (score >= 16) return 'excellent'
  if (score >= 12) return 'good'
  if (score >= 8) return 'fair'
  return 'poor'
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Quick Add LO to latest assessment
async function quickAddLO(student, loCode) {
  if (!student.assessments.length) {
    showToast('ไม่มี Assessment ให้เพิ่ม LO', 'error')
    return
  }

  saving.value = true
  try {
    // Add to the latest assessment
    const latestAssessment = student.assessments[0]
    const success = await addLOToAssessment(
      latestAssessment.id, 
      loCode, 
      authStore.user.uid
    )

    if (success) {
      // Update local state
      if (!latestAssessment.loAssessment) {
        latestAssessment.loAssessment = { passedLOs: [] }
      }
      if (!latestAssessment.loAssessment.passedLOs.includes(loCode)) {
        latestAssessment.loAssessment.passedLOs.push(loCode)
      }
      latestAssessment.loAssessment.manuallyModified = true

      // Update student's overall passed LOs
      if (!student.passedLOs.includes(loCode)) {
        student.passedLOs.push(loCode)
        student.passedLOs.sort()
      }

      showToast(`เพิ่ม ${loCode} สำเร็จ`, 'success')
    } else {
      showToast('เกิดข้อผิดพลาดในการเพิ่ม LO', 'error')
    }
  } catch (error) {
    console.error('Error quick adding LO:', error)
    showToast('เกิดข้อผิดพลาด: ' + error.message, 'error')
  } finally {
    saving.value = false
  }
}

// Edit Modal
function openEditModal(student, assessment) {
  editingStudent.value = student
  editingAssessment.value = {
    ...assessment,
    num: student.assessments.indexOf(assessment) + 1
  }
  editingLOs.value = [...(assessment.loAssessment?.passedLOs || [])]
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editingStudent.value = null
  editingAssessment.value = null
  editingLOs.value = []
}

async function saveEditedLOs() {
  saving.value = true
  try {
    const success = await updateAssessmentPassedLOs(
      editingAssessment.value.id,
      editingLOs.value,
      authStore.user.uid
    )

    if (success) {
      // Update local state
      const student = students.value.find(s => s.id === editingStudent.value.id)
      const assessment = student.assessments.find(a => a.id === editingAssessment.value.id)
      
      if (assessment) {
        assessment.loAssessment = assessment.loAssessment || {}
        assessment.loAssessment.passedLOs = [...editingLOs.value]
        assessment.loAssessment.manuallyModified = true
      }

      // Recalculate student's overall passed LOs
      const passedLOsSet = new Set()
      student.assessments.forEach(a => {
        if (a.loAssessment?.passedLOs) {
          a.loAssessment.passedLOs.forEach(lo => passedLOsSet.add(lo))
        }
      })
      student.passedLOs = Array.from(passedLOsSet).sort()

      showToast('บันทึกสำเร็จ', 'success')
      closeEditModal()
    } else {
      showToast('เกิดข้อผิดพลาดในการบันทึก', 'error')
    }
  } catch (error) {
    console.error('Error saving LOs:', error)
    showToast('เกิดข้อผิดพลาด: ' + error.message, 'error')
  } finally {
    saving.value = false
  }
}

// Toast helper
function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}
</script>

<style scoped>
.admin-lo-manager {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.back-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
}

.header-content h1 {
  margin: 0;
  font-size: 1.75rem;
}

.subtitle {
  margin: 0.25rem 0 0 0;
  color: var(--text-secondary);
}

.card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.form-select, .search-input, .filter-select {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1rem;
}

.form-select {
  width: 100%;
  max-width: 400px;
}

.search-filters {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
}

.filter-select {
  min-width: 120px;
}

/* LO List Header */
.lo-list-header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.lo-item-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  font-size: 0.85rem;
}

.lo-code-badge {
  background: var(--primary-color);
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.75rem;
}

/* Student Card */
.student-card {
  margin-bottom: 0.75rem;
  transition: all 0.3s ease;
}

.student-card.expanded {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.student-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.5rem;
  transition: background 0.2s;
}

.student-header:hover {
  background: var(--bg-secondary);
}

.student-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.student-id {
  font-family: monospace;
  background: var(--bg-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.student-name {
  font-weight: 600;
}

.student-class {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.student-progress {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.lo-count {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-weight: 600;
  font-size: 0.85rem;
}

.lo-count.complete { background: #d4edda; color: #155724; }
.lo-count.high { background: #cce5ff; color: #004085; }
.lo-count.medium { background: #fff3cd; color: #856404; }
.lo-count.low { background: #f8d7da; color: #721c24; }

.toggle-icon {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* LO Overview */
.lo-overview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border-color);
}

.lo-mini-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: #f8d7da;
  color: #721c24;
}

.lo-mini-badge.passed {
  background: #d4edda;
  color: #155724;
}

/* Student Details */
.student-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.quick-add-section {
  margin-bottom: 1.5rem;
}

.quick-add-section h4 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
}

.missing-los {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn-add-lo {
  padding: 0.375rem 0.75rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.2s;
}

.btn-add-lo:hover {
  background: #218838;
}

.btn-add-lo:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.all-passed {
  color: #28a745;
  font-weight: 600;
}

/* Assessments */
.assessments-section h4 {
  margin: 0 0 1rem 0;
}

.assessment-item {
  background: var(--bg-secondary);
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}

.assessment-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.assessment-num {
  font-weight: 600;
  color: var(--text-secondary);
}

.assessment-date {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.assessment-score {
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.85rem;
}

.assessment-score.excellent { background: #d4edda; color: #155724; }
.assessment-score.good { background: #cce5ff; color: #004085; }
.assessment-score.fair { background: #fff3cd; color: #856404; }
.assessment-score.poor { background: #f8d7da; color: #721c24; }

.manual-badge {
  font-size: 0.75rem;
  color: #6c757d;
}

.assessment-los {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lo-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.lo-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.lo-badge.passed {
  background: #d4edda;
  color: #155724;
}

.no-lo {
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-style: italic;
}

.btn-edit-lo {
  margin-left: auto;
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.75rem;
}

.btn-edit-lo:hover {
  background: var(--bg-primary);
}

.btn-show-more {
  width: 100%;
  padding: 0.5rem;
  background: transparent;
  border: 1px dashed var(--border-color);
  border-radius: 0.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.btn-show-more:hover {
  background: var(--bg-secondary);
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
  background: var(--bg-primary);
  border-radius: 1rem;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
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

.assessment-info {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.assessment-info p {
  margin: 0.25rem 0;
}

.lo-checkboxes h4 {
  margin: 0 0 1rem 0;
}

.lo-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  cursor: pointer;
}

.lo-checkbox input {
  margin-top: 0.25rem;
}

.lo-checkbox .lo-code {
  font-weight: 600;
  background: var(--primary-color);
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
}

.lo-checkbox .lo-desc {
  flex: 1;
  font-size: 0.9rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-secondary {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Loading & Empty States */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 3rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  color: white;
  font-weight: 500;
  z-index: 2000;
  animation: slideIn 0.3s ease;
}

.toast.success {
  background: #28a745;
}

.toast.error {
  background: #dc3545;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .admin-lo-manager {
    padding: 1rem;
  }

  .student-info {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .search-filters {
    flex-direction: column;
  }

  .assessment-header {
    flex-wrap: wrap;
  }
}
</style>
