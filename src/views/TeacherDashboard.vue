<template>
  <div class="dashboard-container">
    <!-- Top Navigation -->
    <nav class="navbar card">
      <div class="nav-content">
        <h1 class="nav-title">👨‍🏫 Teacher Dashboard</h1>
        <div class="nav-actions">
          <button @click="toggleTheme" class="icon-btn">
            {{ isDarkMode ? '☀️' : '🌙' }}
          </button>
          <div class="user-menu">
            <img v-if="user?.photoURL" :src="user.photoURL" class="user-avatar" alt="Avatar" />
            <span class="user-name">{{ user?.displayName }}</span>
          </div>
          <button @click="handleSignOut" class="btn btn-secondary btn-sm">
            ออกจากระบบ
          </button>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="dashboard-content">
      <!-- Quick Actions -->
      <div class="quick-actions card">
        <h2>⚡ เมนูด่วน</h2>
        <div class="action-buttons">
          <button @click="$router.push('/courses')" class="action-btn">
            <span class="action-icon">📚</span>
            <div class="action-text">
              <strong>จัดการรายวิชา</strong>
              <small>สร้างและจัดการรายวิชา + Learning Outcomes</small>
            </div>
          </button>
          <button @click="$router.push('/questions')" class="action-btn">
            <span class="action-icon">💡</span>
            <div class="action-text">
              <strong>คลังคำถาม</strong>
              <small>สร้างและจัดการคำถาม HOTS ด้วย AI</small>
            </div>
          </button>
          <button @click="$router.push('/class-analytics')" class="action-btn">
            <span class="action-icon">📊</span>
            <div class="action-text">
              <strong>วิเคราะห์ภาพรวมห้องเรียน</strong>
              <small>ดูข้อมูลเชิงลึกและสรุปผลการประเมิน HOTS</small>
            </div>
          </button>
          <button @click="$router.push('/lo-reports')" class="action-btn">
            <span class="action-icon">🎯</span>
            <div class="action-text">
              <strong>รายงาน LO</strong>
              <small>ดูความก้าวหน้า Learning Outcomes ของนักเรียน</small>
            </div>
          </button>
          <button @click="$router.push('/teacher-analytics')" class="action-btn highlight-new">
            <span class="action-icon">🔮</span>
            <div class="action-text">
              <strong>AI Predictive Analytics</strong>
              <small>ทำนายความเสี่ยง + วิเคราะห์ช่องว่างทักษะ + แผนช่วยเหลือ</small>
            </div>
          </button>
          <button @click="$router.push('/realtime-monitor')" class="action-btn highlight-new">
            <span class="action-icon">📡</span>
            <div class="action-text">
              <strong>Real-time Monitor</strong>
              <small>ติดตามผลงานคลาสแบบเรียลไทม์ (Auto-refresh 30s)</small>
            </div>
          </button>
          <button @click="$router.push('/lesson-plans')" class="action-btn highlight-new">
            <span class="action-icon">📝</span>
            <div class="action-text">
              <strong>แผนการจัดการเรียนรู้</strong>
              <small>สร้างแผนการสอน 5E ด้วย AI + เกณฑ์ ARCE</small>
            </div>
          </button>
          <button @click="$router.push('/teacher/worksheets')" class="action-btn highlight-ai">
            <span class="action-icon">📋</span>
            <div class="action-text">
              <strong>ใบงานอิเล็กทรอนิกส์</strong>
              <small>สร้างใบงานจากแผนการสอน + ให้ AI ตรวจ</small>
            </div>
          </button>
          <button @click="$router.push('/curriculum-designer')" class="action-btn highlight-ai">
            <span class="action-icon">🎯</span>
            <div class="action-text">
              <strong>AI Curriculum Designer</strong>
              <small>สร้างโครงสร้างหลักสูตรทั้งรายวิชาด้วย AI</small>
            </div>
          </button>
          <button @click="$router.push('/quality-assurance')" class="action-btn highlight-new">
            <span class="action-icon">📊</span>
            <div class="action-text">
              <strong>Quality Assurance</strong>
              <small>ตรวจสอบความเป็นธรรม + Expert Review Queue</small>
            </div>
          </button>
          <button @click="$router.push('/micro-lessons')" class="action-btn">
            <span class="action-icon">📖</span>
            <div class="action-text">
              <strong>Micro Lessons</strong>
              <small>จัดการบทเรียนย่อยสำหรับ Adaptive Learning</small>
            </div>
          </button>
          <button @click="$router.push('/micro-lesson-library')" class="action-btn highlight-new">
            <span class="action-icon">📚</span>
            <div class="action-text">
              <strong>คลัง Micro Lessons</strong>
              <small>ดูบทเรียนที่ AI สร้าง + สถิติการใช้งาน</small>
            </div>
          </button>
          <button @click="$router.push('/expert-calibration')" class="action-btn highlight-expert">
            <span class="action-icon">⚖️</span>
            <div class="action-text">
              <strong>Expert Calibration</strong>
              <small>โหมดผู้เชี่ยวชาญ: ประเมินเทียบเคียง AI</small>
            </div>
          </button>
          <button @click="$router.push('/admin-lo-manager')" class="action-btn highlight-admin">
            <span class="action-icon">🔧</span>
            <div class="action-text">
              <strong>Admin: จัดการ LO</strong>
              <small>แก้ไข LO ที่ผ่านของนักเรียน</small>
            </div>
            <span class="badge-new">NEW</span>
          </button>
          <button @click="$router.push('/teacher-portfolio')" class="action-btn highlight-new">
            <span class="action-icon">💼</span>
            <div class="action-text">
              <strong>Teacher Portfolio</strong>
              <small>แฟ้มสะสมผลงานครู + รางวัลระดับโลก</small>
            </div>
          </button>
          <button @click="$router.push('/plc')" class="action-btn highlight-plc">
            <span class="action-icon">👥</span>
            <div class="action-text">
              <strong>PLC ชุมชนครู</strong>
              <small>แชร์แผนการสอน กลยุทธ์ ข้อมูลเชิงลึก</small>
            </div>
            <span class="badge-new">NEW</span>
          </button>
          <!-- Social Network Section -->
          <div class="action-divider">🌐 Social Network</div>
          <button @click="$router.push('/feed')" class="action-btn highlight-social">
            <span class="action-icon">📰</span>
            <div class="action-text">
              <strong>Social Feed</strong>
              <small>ดูโพสต์ แชร์ความรู้ กิจกรรม</small>
            </div>
          </button>
          <button @click="$router.push('/groups')" class="action-btn highlight-social">
            <span class="action-icon">👨‍👩‍👧‍👦</span>
            <div class="action-text">
              <strong>Groups</strong>
              <small>กลุ่มการเรียนรู้ ชุมชนครู</small>
            </div>
          </button>
          <button @click="$router.push('/teacher/inbox')" class="action-btn highlight-trust">
            <span class="action-icon">📥</span>
            <div class="action-text">
              <strong>Trust Inbox</strong>
              <small>ตรวจ AI Trust Queue + อนุมัติโพสต์</small>
            </div>
          </button>
          <button @click="$router.push('/teacher/appeals')" class="action-btn highlight-trust">
            <span class="action-icon">⚖️</span>
            <div class="action-text">
              <strong>Appeals Management</strong>
              <small>จัดการคำร้องอุทธรณ์จากนักเรียน</small>
            </div>
          </button>
          <!-- Research Tools Section -->
          <div class="action-divider">🔬 เครื่องมือวิจัย (Research)</div>
          <button @click="$router.push('/research/pretest-posttest')" class="action-btn highlight-research">
            <span class="action-icon">📋</span>
            <div class="action-text">
              <strong>Pre-test / Post-test</strong>
              <small>สร้างและจัดการแบบทดสอบก่อน-หลังเรียน</small>
            </div>
          </button>
          <button @click="$router.push('/research/expert-validation')" class="action-btn highlight-research">
            <span class="action-icon">🔬</span>
            <div class="action-text">
              <strong>Expert Validation</strong>
              <small>ตรวจสอบความตรงของ AI Scoring</small>
            </div>
          </button>
          <button @click="$router.push('/research/export')" class="action-btn highlight-research">
            <span class="action-icon">📦</span>
            <div class="action-text">
              <strong>Research Data Export</strong>
              <small>ส่งออกข้อมูลสำหรับวิเคราะห์ทางสถิติ</small>
            </div>
          </button>
          <button @click="$router.push('/research/ground-truth')" class="action-btn highlight-research">
            <span class="action-icon">🎯</span>
            <div class="action-text">
              <strong>Ground Truth Validation</strong>
              <small>Calibrate AI ด้วย Expert Scoring</small>
            </div>
            <span class="badge-new">NEW</span>
          </button>
          <button @click="$router.push('/research/ai-comparison')" class="action-btn highlight-research">
            <span class="action-icon">📊</span>
            <div class="action-text">
              <strong>AI vs Teacher Dashboard</strong>
              <small>IRR, Cohen's Kappa, Pearson r</small>
            </div>
            <span class="badge-new">NEW</span>
          </button>
          <button @click="$router.push('/research/expert-validation-dashboard')" class="action-btn highlight-research">
            <span class="action-icon">🎯</span>
            <div class="action-text">
              <strong>Expert Validation Dashboard</strong>
              <small>Golden Dataset, Bias Detection, Publication Ready</small>
            </div>
            <span class="badge-new">C10</span>
          </button>
          <!-- Admin Tools Section -->
          <div class="action-divider">🛠️ Admin Tools</div>
          <button @click="$router.push('/admin/system-check')" class="action-btn highlight-admin">
            <span class="action-icon">🔧</span>
            <div class="action-text">
              <strong>System Check</strong>
              <small>Integration Tests, Anti-Cheat Logs, Debug Tools</small>
            </div>
            <span class="badge-new">NEW</span>
          </button>
        </div>
      </div>

      <!-- Filter Section -->
      <div class="filter-section card">
        <h2>🔍 ค้นหาและกรองข้อมูล</h2>
        <div class="filter-grid">
          <div class="filter-item">
            <label>ชั้น</label>
            <select v-model="filters.grade" class="input-field">
              <option value="">ทั้งหมด</option>
              <option v-for="grade in grades" :key="grade" :value="grade">{{ grade }}</option>
            </select>
          </div>
          <div class="filter-item">
            <label>ห้อง</label>
            <select v-model="filters.room" class="input-field">
              <option value="">ทั้งหมด</option>
              <option v-for="room in 20" :key="room" :value="room">{{ room }}</option>
            </select>
          </div>
          <div class="filter-item">
            <label>ตอน</label>
            <select v-model="filters.section" class="input-field">
              <option value="">ทั้งหมด</option>
              <option value="ก">ก</option>
              <option value="ข">ข</option>
              <option value="ไม่มีตอน">ไม่มีตอน</option>
            </select>
          </div>
          <div class="filter-item">
            <button @click="resetFilters" class="btn btn-secondary">
              ล้างตัวกรอง
            </button>
          </div>
        </div>
      </div>

      <!-- Statistics Overview -->
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <h3>{{ totalStudentsFiltered }}</h3>
            <p>นักเรียนทั้งหมด</p>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">📝</div>
          <div class="stat-info">
            <h3>{{ totalAssessmentsFiltered }}</h3>
            <p>การประเมินทั้งหมด</p>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">⭐</div>
          <div class="stat-info">
            <h3>{{ classAverageFiltered.toFixed(1) }}</h3>
            <p>คะแนนเฉลี่ยห้อง</p>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">📈</div>
          <div class="stat-info">
            <h3>{{ activeTodayFiltered }}</h3>
            <p>ใช้งานวันนี้</p>
          </div>
        </div>
      </div>

      <!-- Export Section -->
      <div class="export-section card">
        <h2>📊 ส่งออกรายงาน</h2>
        <p>ส่งออกข้อมูลการประเมินของนักเรียนเป็นไฟล์ CSV</p>
        <button 
          @click="exportToCSV" 
          :disabled="loading || studentsData.length === 0"
          class="btn btn-primary"
        >
          📥 ดาวน์โหลดรายงาน CSV
        </button>
      </div>

      <!-- Students List -->
      <div class="students-section card">
        <h2>📋 รายชื่อนักเรียนและผลการประเมิน</h2>
        <div v-if="loading" class="loading-state">กำลังโหลดข้อมูล...</div>
        <div v-else-if="filteredStudents.length === 0" class="empty-state">
          ไม่พบข้อมูลนักเรียน
        </div>
        <div v-else class="table-container">
          <table class="students-table">
            <thead>
              <tr>
                <th>รหัสนักเรียน</th>
                <th>ชื่อ-นามสกุล</th>
                <th>ชั้น</th>
                <th>ห้อง</th>
                <th>เลขที่</th>
                <th>ตอน</th>
                <th>จำนวนครั้ง</th>
                <th>คะแนนเฉลี่ย</th>
                <th>จุดเด่น</th>
                <th>ควรพัฒนา</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in filteredStudents" :key="student.id" @click="viewStudentDetail(student)">
                <td>{{ student.studentId || '-' }}</td>
                <td class="student-name">{{ student.displayName }}</td>
                <td>{{ student.grade || '-' }}</td>
                <td>{{ student.room || '-' }}</td>
                <td>{{ student.number || '-' }}</td>
                <td>{{ student.section || '-' }}</td>
                <td>{{ student.assessmentCount || 0 }}</td>
                <td class="score-cell">{{ student.averageScore ? student.averageScore.toFixed(1) : '-' }}</td>
                <td class="strength-cell">{{ student.strongestSkill || '-' }}</td>
                <td class="weakness-cell">{{ student.weakestSkill || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Student Detail Modal (optional) -->
    <div v-if="selectedStudent" class="modal" @click.self="closeModal">
      <div class="modal-content card">
        <div class="modal-header">
          <h2>รายละเอียดนักเรียน</h2>
          <button @click="closeModal" class="close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="student-info">
            <p><strong>ชื่อ:</strong> {{ selectedStudent.displayName }}</p>
            <p><strong>รหัส:</strong> {{ selectedStudent.studentId }}</p>
            <p><strong>ชั้น:</strong> {{ selectedStudent.grade }} / {{ selectedStudent.room }}</p>
            <p><strong>คะแนนเฉลี่ย:</strong> {{ selectedStudent.averageScore?.toFixed(1) }}/20</p>
          </div>
          <div class="skills-breakdown">
            <h3>การวิเคราะห์ทักษะ</h3>
            <div v-if="selectedStudent.skills" class="skill-bars">
              <div v-for="(value, skill) in selectedStudent.skills" :key="skill" class="skill-row">
                <span class="skill-label">{{ getSkillLabel(skill) }}</span>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: `${(value/5)*100}%` }"></div>
                </div>
                <span class="skill-value">{{ value.toFixed(1) }}/5</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/config'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const user = computed(() => authStore.user)
const isDarkMode = computed(() => themeStore.isDarkMode)

const loading = ref(false)
const studentsData = ref([])
const assessmentsData = ref([])
const selectedStudent = ref(null)

const grades = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6']

const filters = ref({
  grade: '',
  room: '',
  section: ''
})

const filteredStudents = computed(() => {
  return studentsData.value.filter(student => {
    // Filter by grade
    if (filters.value.grade && student.grade !== filters.value.grade) {
      return false
    }
    
    // Filter by room (convert to string for comparison)
    if (filters.value.room && String(student.room) !== String(filters.value.room)) {
      return false
    }
    
    // Filter by section
    if (filters.value.section && student.section !== filters.value.section) {
      return false
    }
    
    return true
  })
})

// Recompute stats based on filtered students
const totalStudentsFiltered = computed(() => filteredStudents.value.length)

const totalAssessmentsFiltered = computed(() => {
  if (filteredStudents.value.length === 0) return 0
  const studentIds = filteredStudents.value.map(s => s.id)
  return assessmentsData.value.filter(a => studentIds.includes(a.studentId)).length
})

const classAverageFiltered = computed(() => {
  const scores = filteredStudents.value.filter(s => s.averageScore).map(s => s.averageScore)
  if (scores.length === 0) return 0
  return scores.reduce((a, b) => a + b, 0) / scores.length
})

const activeTodayFiltered = computed(() => {
  const today = new Date().toDateString()
  return filteredStudents.value.filter(s => 
    s.lastActive && new Date(s.lastActive).toDateString() === today
  ).length
})

onMounted(async () => {
  await loadTeacherData()
})

async function loadTeacherData() {
  try {
    loading.value = true
    
    // Load all students
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'student')
    )
    const usersSnapshot = await getDocs(usersQuery)
    
    // Load all assessments
    const assessmentsQuery = query(
      collection(db, 'assessments'),
      orderBy('createdAt', 'desc')
    )
    const assessmentsSnapshot = await getDocs(assessmentsQuery)
    assessmentsData.value = assessmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }))
    
    // Process students data with their assessments
    studentsData.value = usersSnapshot.docs.map(doc => {
      const studentData = doc.data()
      const studentAssessments = assessmentsData.value.filter(a => a.studentId === doc.id)
      
      // Calculate average scores
      let averageScore = null
      let skills = null
      let strongestSkill = null
      let weakestSkill = null
      
      if (studentAssessments.length > 0) {
        const totalScore = studentAssessments.reduce((sum, a) => sum + (a.overallScore || 0), 0)
        averageScore = totalScore / studentAssessments.length
        
        // Calculate skill averages
        const skillTotals = studentAssessments.reduce((acc, a) => {
          if (a.rubricScores) {
            acc.analysis += a.rubricScores.analysis || 0
            acc.reasoning += a.rubricScores.reasoning || 0
            acc.creativity += a.rubricScores.creativity || 0
            acc.evidence += a.rubricScores.evidence || 0
          }
          return acc
        }, { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 })
        
        skills = {
          analysis: skillTotals.analysis / studentAssessments.length,
          reasoning: skillTotals.reasoning / studentAssessments.length,
          creativity: skillTotals.creativity / studentAssessments.length,
          evidence: skillTotals.evidence / studentAssessments.length
        }
        
        // Find strongest and weakest skills
        const skillEntries = Object.entries(skills)
        skillEntries.sort((a, b) => b[1] - a[1])
        strongestSkill = getSkillLabel(skillEntries[0][0])
        weakestSkill = getSkillLabel(skillEntries[skillEntries.length - 1][0])
      }
      
      return {
        id: doc.id,
        ...studentData,
        assessmentCount: studentAssessments.length,
        averageScore,
        skills,
        strongestSkill,
        weakestSkill
      }
    })
    
  } catch (error) {
    console.error('Error loading teacher data:', error)
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  // Filters are applied automatically via computed property
  console.log('Filters applied:', filters.value)
}

function resetFilters() {
  filters.value = {
    grade: '',
    room: '',
    section: ''
  }
}

function getSkillLabel(skill) {
  const labels = {
    analysis: 'วิเคราะห์',
    reasoning: 'เหตุผล',
    creativity: 'สร้างสรรค์',
    evidence: 'หลักฐาน'
  }
  return labels[skill] || skill
}

function viewStudentDetail(student) {
  selectedStudent.value = student
}

function closeModal() {
  selectedStudent.value = null
}

async function exportToCSV() {
  try {
    loading.value = true
    
    // CSV Header
    const headers = [
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล',
      'ชั้น',
      'ห้อง',
      'เลขที่',
      'ตอน',
      'จำนวนครั้งที่ทำ',
      'คะแนนเฉลี่ย',
      'คะแนนวิเคราะห์',
      'คะแนนเหตุผล',
      'คะแนนสร้างสรรค์',
      'คะแนนหลักฐาน',
      'จุดเด่น',
      'ควรพัฒนา'
    ]
    
    // CSV Rows
    const rows = filteredStudents.value.map(student => [
      student.studentId || '-',
      student.displayName || '-',
      student.grade || '-',
      student.room || '-',
      student.number || '-',
      student.section || '-',
      student.assessmentCount || 0,
      student.averageScore ? student.averageScore.toFixed(2) : '-',
      student.skills ? student.skills.analysis.toFixed(2) : '-',
      student.skills ? student.skills.reasoning.toFixed(2) : '-',
      student.skills ? student.skills.creativity.toFixed(2) : '-',
      student.skills ? student.skills.evidence.toFixed(2) : '-',
      student.strongestSkill || '-',
      student.weakestSkill || '-'
    ])
    
    // Create CSV content
    const csvContent = [
      '\ufeff', // UTF-8 BOM for Excel
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    console.error('Error exporting CSV:', error)
    alert('เกิดข้อผิดพลาดในการส่งออกไฟล์')
  } finally {
    loading.value = false
  }
}

function toggleTheme() {
  themeStore.toggleTheme()
}

async function handleSignOut() {
  if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
    await authStore.signOut()
    router.push('/')
  }
}
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  padding: 1rem;
  max-width: 1600px;
  margin: 0 auto;
}

.navbar {
  margin-bottom: 1.5rem;
  padding: 1rem 1.5rem;
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.nav-title {
  margin: 0;
  font-size: 1.5rem;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filter-section {
  padding: 1.5rem;
}

.filter-section h2 {
  margin-bottom: 1rem;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: end;
}

.filter-item label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-info h3 {
  font-size: 2rem;
  margin: 0;
  color: var(--primary);
}

.stat-info p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.export-section {
  padding: 1.5rem;
  text-align: center;
}

.export-section h2 {
  margin-bottom: 0.5rem;
}

.export-section p {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.students-section {
  padding: 1.5rem;
}

.students-section h2 {
  margin-bottom: 1.5rem;
}

.table-container {
  overflow-x: auto;
}

.students-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.students-table th,
.students-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.students-table th {
  background: var(--bg-secondary);
  font-weight: 600;
  color: var(--text-primary);
}

.students-table tbody tr {
  cursor: pointer;
  transition: background 0.2s ease;
}

.students-table tbody tr:hover {
  background: var(--bg-secondary);
}

.student-name {
  font-weight: 600;
  color: var(--text-primary);
}

.score-cell {
  font-weight: 700;
  color: var(--primary);
}

.strength-cell {
  color: var(--success);
  font-weight: 600;
}

.weakness-cell {
  color: var(--warning);
  font-weight: 600;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h2 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-primary);
}

.student-info p {
  margin: 0.5rem 0;
  color: var(--text-primary);
}

.skills-breakdown {
  margin-top: 1.5rem;
}

.skills-breakdown h3 {
  margin-bottom: 1rem;
}

.skill-bars {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skill-row {
  display: grid;
  grid-template-columns: 100px 1fr 60px;
  gap: 1rem;
  align-items: center;
}

.skill-label {
  font-weight: 600;
  color: var(--text-primary);
}

.progress-bar {
  height: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  transition: width 0.3s ease;
}

.skill-value {
  font-weight: 700;
  color: var(--primary);
  text-align: right;
}

@media (max-width: 768px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .students-table {
    font-size: 0.75rem;
  }
  
  .students-table th,
  .students-table td {
    padding: 0.5rem;
  }
}

/* Quick Actions */
.quick-actions {
  margin-bottom: 2rem;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.action-btn.highlight-new {
  position: relative;
  border: 2px solid var(--primary);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
}

.action-btn.highlight-new::before {
  content: "✨ NEW";
  position: absolute;
  top: -10px;
  right: -10px;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5);
  animation: pulse-badge 2s ease-in-out infinite;
}

@keyframes pulse-badge {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.action-btn.highlight-new:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
}

.highlight-expert {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  border: none;
}

.highlight-expert:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.highlight-expert .action-text strong,
.highlight-expert .action-text small {
  color: white;
}

.highlight-admin {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border: none;
  position: relative;
}

.highlight-admin:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.highlight-admin .action-text strong,
.highlight-admin .action-text small {
  color: white;
}

.badge-new {
  position: absolute;
  top: -8px;
  right: 12px;
  background: #fbbf24;
  color: #1f2937;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: bold;
}

.highlight-ai {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: white;
  border: none;
  position: relative;
}

.highlight-ai::before {
  content: '⚡ AI';
  position: absolute;
  top: -8px;
  right: 12px;
  background: #fbbf24;
  color: #1f2937;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: bold;
}

.highlight-ai:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.highlight-ai .action-text strong,
.highlight-ai .action-text small {
  color: white;
}

/* Research Tools Styling */
.action-divider {
  grid-column: 1 / -1;
  text-align: center;
  padding: 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
  border-top: 1px dashed var(--border-color);
  margin-top: 0.5rem;
}

/* Social Network Styling */
.highlight-social {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  position: relative;
}

.highlight-social::before {
  content: '🌐 Social';
  position: absolute;
  top: -8px;
  right: 12px;
  background: #60a5fa;
  color: #1e3a8a;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: bold;
}

.highlight-social:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.highlight-social .action-text strong,
.highlight-social .action-text small {
  color: white;
}

/* Trust Layer Styling */
.highlight-trust {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  border: none;
  position: relative;
}

.highlight-trust::before {
  content: '🔒 Trust';
  position: absolute;
  top: -8px;
  right: 12px;
  background: #fbbf24;
  color: #78350f;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: bold;
}

.highlight-trust:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

.highlight-trust .action-text strong,
.highlight-trust .action-text small {
  color: white;
}

.highlight-research {
  background: linear-gradient(135deg, #0891b2, #0e7490);
  color: white;
  border: none;
  position: relative;
}

.highlight-research::before {
  content: '🔬 Research';
  position: absolute;
  top: -8px;
  right: 12px;
  background: #22d3ee;
  color: #164e63;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: bold;
}

.highlight-research:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(8, 145, 178, 0.4);
}

.highlight-research .action-text strong,
.highlight-research .action-text small {
  color: white;
}

/* PLC Community Styling */
.highlight-plc {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  position: relative;
}

.highlight-plc::before {
  content: '👥 PLC';
  position: absolute;
  top: -8px;
  right: 12px;
  background: #34d399;
  color: #064e3b;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: bold;
}

.highlight-plc:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.highlight-plc .action-text strong,
.highlight-plc .action-text small {
  color: white;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.action-btn:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
}

.action-icon {
  font-size: 2.5rem;
}

.action-text {
  flex: 1;
}

.action-text strong {
  display: block;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
  color: #ffffff;
  font-weight: 600;
}

.action-text small {
  color: #a0aec0;
  font-size: 0.9rem;
  line-height: 1.4;
}
</style>
