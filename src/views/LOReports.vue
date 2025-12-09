<template>
  <div class="lo-reports">
    <div class="page-header">
      <h1>📊 รายงานความคืบหน้า Learning Outcomes</h1>
      <p class="subtitle">ติดตามความก้าวหน้าของนักเรียนในแต่ละ Learning Outcome</p>
    </div>

    <!-- Data Mode Toggle -->
    <div v-if="false" class="card">
      <h3>📊 โหมดการแสดงข้อมูล</h3>
      <div class="mode-selector">
        <label class="mode-option">
          <input type="radio" v-model="dataMode" value="new" />
          <span>ระบบใหม่ (เข้มงวด)</span>
        </label>
        <label class="mode-option">
          <input type="radio" v-model="dataMode" value="legacy" />
          <span>ระบบเดิม (ข้อมูลเก่า)</span>
        </label>
      </div>
    </div>

    <!-- Course Selection -->
    <div class="card">
      <h2>🎯 เลือกรายวิชา</h2>
      <div class="course-selector">
        <select v-model="selectedCourseId" @change="loadCourseProgress" class="form-select">
          <option value="">-- เลือกรายวิชา --</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.courseCode }} - {{ course.courseName }}
          </option>
        </select>
        <button 
          v-if="selectedCourseId && progressData.length > 0"
          @click="exportToCSV" 
          class="btn-export"
        >
          📥 Export CSV
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Course Info & LO Stats -->
    <div v-if="selectedCourse && !loading" class="course-details">
      <div class="card">
        <h2>📖 ข้อมูลรายวิชา</h2>
        <div class="course-info">
          <p><strong>รหัสวิชา:</strong> {{ selectedCourse.courseCode }}</p>
          <p><strong>ชื่อวิชา:</strong> {{ selectedCourse.courseName }}</p>
          <p><strong>คำอธิบาย:</strong> {{ selectedCourse.courseDescription }}</p>
          <p><strong>จำนวน LO:</strong> {{ learningOutcomes.length }} รายการ</p>
        </div>
      </div>

      <!-- LO List with Progress -->
      <div class="card">
        <h2>📝 Learning Outcomes ทั้งหมด</h2>
        <div class="lo-list">
          <div 
            v-for="lo in learningOutcomes" 
            :key="lo.code || lo.loCode" 
            class="lo-item"
          >
            <div class="lo-header">
              <span class="lo-code">{{ lo.code || lo.loCode }}</span>
              <span class="lo-description">{{ lo.description || lo.loDescription }}</span>
            </div>
            <div class="lo-progress">
              <div class="progress-stats">
                <span class="students-passed">
                  นักเรียนที่ผ่าน: {{ countStudentsPassed(lo.code || lo.loCode) }} / {{ totalStudents }} คน
                </span>
                <span class="pass-rate">
                  ({{ calculatePassRate(lo.code || lo.loCode) }}%)
                </span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: calculatePassRate(lo.code || lo.loCode) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Student Progress Table -->
      <div class="card">
        <h2>👥 ความคืบหน้าแต่ละคน</h2>
        <div class="filters">
          <div class="filter-row">
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
            <select v-model="filterSection" class="filter-select">
              <option value="">ทุกตอน</option>
              <option v-for="section in availableSections" :key="section" :value="section">
                ตอน {{ section }}
              </option>
            </select>
          </div>
          <div class="filter-row">
            <select v-model="filterLOProgress" class="filter-select">
              <option value="">ทุกระดับความคืบหน้า</option>
              <option value="completed">ผ่านครบทุก LO ({{ learningOutcomes.length }}/{{ learningOutcomes.length }})</option>
              <option value="high">ความคืบหน้าสูง (>= 80%)</option>
              <option value="medium">ความคืบหน้าปานกลาง (50-79%)</option>
              <option value="low">ความคืบหน้าต่ำ (1-49%)</option>
              <option value="none">ยังไม่มีความคืบหน้า (0%)</option>
            </select>
            <select v-model="filterAssessmentCount" class="filter-select">
              <option value="">ทุกจำนวนการประเมิน</option>
              <option value="0">ยังไม่เคยประเมิน</option>
              <option value="low">ประเมินน้อย (1-5 ครั้ง)</option>
              <option value="medium">ประเมินปานกลาง (6-15 ครั้ง)</option>
              <option value="high">ประเมินมาก (> 15 ครั้ง)</option>
            </select>
            <button @click="clearAllFilters" class="btn-clear">
              🗑️ ล้างตัวกรอง
            </button>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="progress-table">
            <thead>
              <tr>
                <th>รหัสนักเรียน</th>
                <th>ชื่อ-นามสกุล</th>
                <th>ชั้น</th>
                <th>ห้อง</th>
                <th>ตอน</th>
                <th>LO ที่ผ่าน</th>
                <th>ความคืบหน้า</th>
                <th>ครั้งที่ประเมิน</th>
                <th>ประเมินล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredProgress.length === 0">
                <td colspan="9" class="no-data">
                  {{ selectedCourseId ? 'ยังไม่มีนักเรียนทำการประเมิน' : 'กรุณาเลือกรายวิชา' }}
                </td>
              </tr>
              <tr 
                v-for="progress in filteredProgress" 
                :key="progress.id"
                class="student-row"
                @click="viewStudentDetail(progress.studentUid)"
                :title="`คลิกเพื่อดูรายละเอียด ${progress.name}`"
              >
                <td>{{ progress.studentId }}</td>
                <td>{{ progress.name }}</td>
                <td>{{ progress.grade }}</td>
                <td>{{ progress.room }}</td>
                <td>{{ progress.section }}</td>
                <td>
                  <div class="passed-los">
                    <span 
                      v-for="loCode in progress.passedLOs" 
                      :key="loCode"
                      class="lo-badge"
                    >
                      {{ loCode }}
                    </span>
                    <span v-if="progress.passedLOs.length === 0" class="no-los">
                      ยังไม่ผ่าน LO
                    </span>
                  </div>
                </td>
                <td>
                  <div class="progress-cell">
                    <span class="progress-text">
                      {{ progress.actualPassedLOs }} / {{ learningOutcomes.length }}
                    </span>
                    <div class="mini-progress">
                      <div 
                        class="mini-progress-fill"
                        :style="{ 
                          width: learningOutcomes.length > 0 ? (progress.actualPassedLOs / learningOutcomes.length * 100) + '%' : '0%' 
                        }"
                      ></div>
                    </div>
                  </div>
                </td>
                <td>{{ progress.assessmentCount }} ครั้ง</td>
                <td>{{ formatDate(progress.lastAssessedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="stats-header">
        <h3>📊 สถิติสรุป{{ hasActiveFilters ? ' (ตามตัวกรองที่เลือก)' : '' }}</h3>
        <div v-if="hasActiveFilters" class="filter-summary">
          กำลังแสดง {{ totalStudents }} คนจากทั้งหมด {{ progressData.length }} คน
        </div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <div class="stat-value">{{ totalStudents }}</div>
            <div class="stat-label">{{ hasActiveFilters ? 'นักเรียนที่กรองแล้ว' : 'นักเรียนทั้งหมด' }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-value">{{ studentsWithProgress }}</div>
            <div class="stat-label">มีความคืบหน้า</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-content">
            <div class="stat-value">{{ averageCompletion }}%</div>
            <div class="stat-label">ความคืบหน้าเฉลี่ย</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-content">
            <div class="stat-value">{{ studentsCompleted }}</div>
            <div class="stat-label">ผ่านครบทุก LO</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import { getStudentPassedLOs } from '@/utils/loProgress'

const authStore = useAuthStore()
const router = useRouter()

const courses = ref([])
const selectedCourseId = ref('')
const selectedCourse = ref(null)
const learningOutcomes = ref([])
const progressData = ref([])
const loading = ref(false)
const searchQuery = ref('')
const filterGrade = ref('')
const filterRoom = ref('')
const filterSection = ref('')
const filterLOProgress = ref('')
const filterAssessmentCount = ref('')
const dataMode = ref('new') // Always use new mode for now

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return searchQuery.value || 
         filterGrade.value || 
         filterRoom.value || 
         filterSection.value || 
         filterLOProgress.value || 
         filterAssessmentCount.value
})

// Load all courses taught by this teacher
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
  }
})

// Load course progress data
async function loadCourseProgress() {
  if (!selectedCourseId.value) {
    selectedCourse.value = null
    learningOutcomes.value = []
    progressData.value = []
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

    // Load all student progress for this course
    const progressRef = collection(db, 'studentProgress')
    const q = query(progressRef, where('courseId', '==', selectedCourseId.value))
    const snapshot = await getDocs(q)

    // Load student details for each progress record
    const progressPromises = snapshot.docs.map(async (progressDoc) => {
      const progressDocData = progressDoc.data()
      
      // ใช้ utility function เพื่อดึง LO ที่ผ่านจริงจาก assessments (มาตรฐานเดียวกับหน้าอื่น)
      const loResult = await getStudentPassedLOs(progressDocData.studentId, selectedCourseId.value)
      
      // Get student info from profile
      let studentInfo = {
        id: progressDocData.studentId,
        name: 'ไม่ระบุชื่อ',
        studentId: progressDocData.studentId,
        grade: '-',
        room: '-',
        section: '-'
      }
      
      try {
        const studentDoc = await getDoc(doc(db, 'users', progressDocData.studentId))
        if (studentDoc.exists()) {
          const studentData = studentDoc.data()
          
          // ลองหาชื่อจากหลายแหล่ง
          let fullName = studentData.displayName || ''
          if (!fullName && (studentData.firstName || studentData.lastName)) {
            fullName = `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim()
          }
          
          studentInfo = {
            id: progressDocData.studentId,
            name: fullName || 'ไม่ระบุชื่อ',
            studentId: studentData.studentId || progressDocData.studentId,
            grade: studentData.grade || '-',
            room: studentData.room || '-',
            section: studentData.section || '-'
          }
        }
      } catch (error) {
        console.error('Error loading student:', error)
      }

      return {
        id: progressDoc.id,
        studentUid: progressDocData.studentId, // เก็บ uid ไว้สำหรับ navigate
        ...studentInfo,
        passedLOs: loResult.passedLOs, // ใช้ข้อมูลจาก utility function
        actualPassedLOs: loResult.passedLOs.length, // จำนวนจริงที่ผ่าน
        totalPassed: progressDocData.totalPassed || 0, // เก็บไว้เผื่อ backward compatibility
        assessmentCount: loResult.assessmentCount, // นับจาก utility function
        lastAssessedAt: progressDocData.lastAssessedAt
      }
    })

    progressData.value = await Promise.all(progressPromises)
  } catch (error) {
    console.error('Error loading progress:', error)
  } finally {
    loading.value = false
  }
}

// Filtered progress based on search
const filteredProgress = computed(() => {
  let filtered = progressData.value
  
  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p => 
      p.studentId?.toLowerCase().includes(query) ||
      p.name?.toLowerCase().includes(query)
    )
  }
  
  // Grade filter
  if (filterGrade.value) {
    filtered = filtered.filter(p => p.grade === filterGrade.value)
  }
  
  // Room filter
  if (filterRoom.value) {
    filtered = filtered.filter(p => p.room === filterRoom.value)
  }
  
  // Section filter
  if (filterSection.value) {
    filtered = filtered.filter(p => p.section === filterSection.value)
  }
  
  // LO Progress filter
  if (filterLOProgress.value) {
    const totalLOs = learningOutcomes.value.length
    filtered = filtered.filter(p => {
      const progressPercent = totalLOs > 0 ? (p.actualPassedLOs / totalLOs) * 100 : 0
      
      switch (filterLOProgress.value) {
        case 'completed': return p.actualPassedLOs === totalLOs && totalLOs > 0
        case 'high': return progressPercent >= 80 && progressPercent < 100
        case 'medium': return progressPercent >= 50 && progressPercent < 80
        case 'low': return progressPercent >= 1 && progressPercent < 50
        case 'none': return p.actualPassedLOs === 0
        default: return true
      }
    })
  }
  
  // Assessment count filter
  if (filterAssessmentCount.value) {
    filtered = filtered.filter(p => {
      const count = p.assessmentCount || 0
      switch (filterAssessmentCount.value) {
        case '0': return count === 0
        case 'low': return count >= 1 && count <= 5
        case 'medium': return count >= 6 && count <= 15
        case 'high': return count > 15
        default: return true
      }
    })
  }
  
  return filtered
})

// Count students who passed a specific LO (from filtered data)
function countStudentsPassed(loCode) {
  return filteredProgress.value.filter(p => p.passedLOs.includes(loCode)).length
}

// Calculate pass rate for a specific LO (from filtered data)
function calculatePassRate(loCode) {
  if (filteredProgress.value.length === 0) return 0
  const passed = countStudentsPassed(loCode)
  return Math.round((passed / filteredProgress.value.length) * 100)
}

// Total students (from filtered data)
const totalStudents = computed(() => filteredProgress.value.length)

// Students with at least one LO passed (from filtered data)
const studentsWithProgress = computed(() => 
  filteredProgress.value.filter(p => p.actualPassedLOs > 0).length
)

// Average completion percentage (from filtered data)
const averageCompletion = computed(() => {
  if (filteredProgress.value.length === 0 || learningOutcomes.value.length === 0) return 0
  
  const totalCompletion = filteredProgress.value.reduce((sum, p) => {
    return sum + (p.actualPassedLOs / learningOutcomes.value.length)
  }, 0)
  
  return Math.round((totalCompletion / filteredProgress.value.length) * 100)
})

// Students who completed all LOs (from filtered data)
const studentsCompleted = computed(() => 
  filteredProgress.value.filter(p => p.actualPassedLOs === learningOutcomes.value.length).length
)

// Available filter options
const availableGrades = computed(() => {
  const grades = [...new Set(progressData.value.map(p => p.grade).filter(g => g && g !== '-'))]
  return grades.sort()
})

const availableRooms = computed(() => {
  const rooms = [...new Set(progressData.value.map(p => p.room).filter(r => r && r !== '-'))]
  return rooms.sort((a, b) => {
    // Try to sort numerically if possible
    const numA = parseInt(a)
    const numB = parseInt(b)
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB
    }
    return a.localeCompare(b)
  })
})

const availableSections = computed(() => {
  const sections = [...new Set(progressData.value.map(p => p.section).filter(s => s && s !== '-'))]
  return sections.sort()
})

// Clear all filters
function clearAllFilters() {
  searchQuery.value = ''
  filterGrade.value = ''
  filterRoom.value = ''
  filterSection.value = ''
  filterLOProgress.value = ''
  filterAssessmentCount.value = ''
}

// Format date
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

// Export to CSV
function exportToCSV() {
  if (!selectedCourse.value || progressData.value.length === 0) return

  // Prepare CSV headers with BOM for Thai characters
  const headers = ['รหัสนักเรียน', 'ชื่อ-นามสกุล', 'ชั้น', 'ห้อง', 'ตอน', 'LO ที่ผ่าน', 'จำนวน LO ที่ผ่าน', 'ครั้งที่ประเมิน', 'ประเมินล่าสุด']
  
  // Prepare CSV rows
  const rows = progressData.value.map(p => [
    p.studentId,
    p.name,
    p.grade,
    p.room,
    p.section,
    p.passedLOs.join('; '),
    p.actualPassedLOs,
    p.assessmentCount,
    formatDate(p.lastAssessedAt)
  ])

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // Create blob and download
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `LO_Report_${selectedCourse.value.courseCode}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

// Navigate to student detail
function viewStudentDetail(studentUid) {
  router.push({
    name: 'StudentDetail',
    params: { studentId: studentUid },
    query: { courseId: selectedCourseId.value }
  })
}
</script>

<style scoped>
.lo-reports {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1rem;
}

.card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card h2 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

/* Course Selector */
.course-selector {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.form-select {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.btn-export {
  padding: 0.75rem 1.5rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-export:hover {
  background: #059669;
  transform: translateY(-1px);
}

/* Loading */
.loading-state {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Course Info */
.course-info p {
  margin: 0.5rem 0;
  color: var(--text-secondary);
}

.course-info strong {
  color: var(--text-primary);
  margin-right: 0.5rem;
}

/* LO List */
.lo-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.lo-item {
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.lo-header {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.lo-code {
  background: var(--primary-color);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.lo-description {
  color: var(--text-primary);
  line-height: 1.6;
}

.lo-progress {
  margin-top: 0.5rem;
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.students-passed {
  color: var(--text-secondary);
}

.pass-rate {
  color: var(--primary-color);
  font-weight: 600;
}

.progress-bar {
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.3s ease;
}

/* Filters */
.filters {
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: rgba(30, 41, 59, 0.8);
  border-radius: 16px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.search-input {
  flex: 1;
  min-width: 250px;
  padding: 0.875rem 1rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  background: rgba(30, 41, 59, 0.8);
  color: white;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.search-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2), 0 4px 16px rgba(99, 102, 241, 0.3);
  background: rgba(30, 41, 59, 0.95);
  transform: translateY(-1px);
}

.search-input::placeholder {
  color: rgba(148, 163, 184, 0.8);
  font-style: italic;
  font-weight: 400;
}

/* Table */
.table-wrapper {
  overflow-x: auto;
}

.progress-table {
  width: 100%;
  border-collapse: collapse;
}

.progress-table th,
.progress-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.progress-table th {
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
}

.progress-table td {
  color: var(--text-primary);
}

.student-row {
  cursor: pointer;
  transition: all 0.2s;
}

.student-row:hover {
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
  transform: scale(1.01);
}

.student-row:active {
  transform: scale(0.99);
}

.no-data {
  text-align: center !important;
  color: var(--text-secondary);
  padding: 2rem !important;
}

.passed-los {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lo-badge {
  background: #3b82f6;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.no-los {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-style: italic;
}

.progress-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.progress-text {
  font-weight: 600;
  font-size: 0.875rem;
}

.mini-progress {
  width: 100px;
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  background: #10b981;
  transition: width 0.3s ease;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.stat-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Responsive */
@media (max-width: 768px) {
  .lo-reports {
    padding: 1rem;
  }

  .course-selector {
    flex-direction: column;
  }

  .btn-export {
    width: 100%;
  }

  .progress-table {
    font-size: 0.875rem;
  }

  .progress-table th,
  .progress-table td {
    padding: 0.75rem 0.5rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filter-row {
    flex-direction: column;
    gap: 0.75rem;
  }

  .filter-select,
  .btn-clear {
    width: 100%;
  }
}

/* Filter specific styles */
.filter-row {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0.75rem;
  padding: 1rem;
  background: rgba(51, 65, 85, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.filter-row:last-child {
  margin-bottom: 0;
}

.filter-select {
  min-width: 180px;
  padding: 0.875rem 1rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  background: rgba(30, 41, 59, 0.8);
  color: white;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23e2e8f0%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%2C9%2012%2C15%2018%2C9%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1rem;
  padding-right: 3rem;
}

.filter-select:hover {
  border-color: #6366f1;
  background: rgba(30, 41, 59, 0.95);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  transform: translateY(-1px);
}

.filter-select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2), 0 4px 16px rgba(99, 102, 241, 0.3);
  background: rgba(30, 41, 59, 0.95);
}

.filter-select option {
  padding: 0.75rem 1rem;
  background: rgba(30, 41, 59, 0.95);
  color: white;
  border: none;
  margin: 2px 0;
  font-weight: 500;
}

.filter-select option:hover {
  background: rgba(99, 102, 241, 0.8);
  color: white;
}

.filter-select option:checked,
.filter-select option:selected {
  background: rgba(99, 102, 241, 0.9);
  color: white;
  font-weight: 600;
}

.filter-select option:first-child {
  font-style: italic;
  color: rgba(148, 163, 184, 0.9);
  background: rgba(30, 41, 59, 0.95);
}

.filter-select optgroup {
  background: rgba(51, 65, 85, 0.9);
  color: white;
  font-weight: 600;
  padding: 0.5rem;
}

.btn-clear {
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  white-space: nowrap;
}

.btn-clear:hover {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-clear:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}
</style>
