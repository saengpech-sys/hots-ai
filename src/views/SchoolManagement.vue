<template>
  <div class="school-management">
    <div class="header">
      <div class="header-content">
        <div>
          <h1>📚 จัดการโรงเรียน</h1>
          <p class="school-name">{{ schoolInfo?.name || 'กำลังโหลด...' }}</p>
        </div>
        <div class="header-actions">
          <button @click="toggleTheme" class="icon-btn" :title="isDarkMode ? 'Light Mode' : 'Dark Mode'">
            {{ isDarkMode ? '☀️' : '🌙' }}
          </button>
          <button @click="$router.push(authStore.user?.role === 'admin' ? '/esa' : '/teacher')" class="btn-secondary">
            ← กลับ Dashboard
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👨‍🏫</div>
        <div class="stat-content">
          <h3>{{ stats.teacherCount }}</h3>
          <p>ครูทั้งหมด</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👨‍🎓</div>
        <div class="stat-content">
          <h3>{{ stats.studentCount }}</h3>
          <p>นักเรียนทั้งหมด</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <h3>{{ stats.averageHOTS.toFixed(2) }}</h3>
          <p>คะแนน HOTS เฉลี่ย</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-content">
          <h3>{{ stats.totalAssessments }}</h3>
          <p>การประเมินทั้งหมด</p>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions-bar">
      <button @click="$router.push('/class-analytics')" class="quick-btn">
        <span>📊</span> ดู Analytics
      </button>
      <button @click="$router.push('/lo-reports')" class="quick-btn">
        <span>🎯</span> รายงาน LO
      </button>
      <button @click="$router.push('/leaderboard')" class="quick-btn">
        <span>🏆</span> Leaderboard
      </button>
      <button @click="$router.push('/research/export')" class="quick-btn">
        <span>📦</span> Export Data
      </button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="{ active: activeTab === tab.id }"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Teachers Tab -->
      <div v-if="activeTab === 'teachers'" class="teachers-section">
        <div class="section-header">
          <h2>รายชื่อครู</h2>
          <button @click="showAddTeacherDialog = true" class="btn-primary">
            ➕ เพิ่มครู
          </button>
        </div>
        
        <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>
        
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>ชื่อ-นามสกุล</th>
              <th>อีเมล</th>
              <th>รายวิชาที่สอน</th>
              <th>นักเรียนที่ดูแล</th>
              <th>การกระทำ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="teacher in teachers" :key="teacher.uid">
              <td>{{ teacher.displayName }}</td>
              <td>{{ teacher.email }}</td>
              <td>{{ teacher.subjects?.join(', ') || '-' }}</td>
              <td>{{ teacher.studentCount || 0 }}</td>
              <td>
                <button @click="viewTeacherDetails(teacher)" class="btn-small">
                  ดูรายละเอียด
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Students Tab -->
      <div v-if="activeTab === 'students'" class="students-section">
        <div class="section-header">
          <h2>รายชื่อนักเรียน</h2>
          <div class="filters">
            <select v-model="selectedGrade" class="form-select">
              <option value="">ทุกระดับชั้น</option>
              <option value="m1">ม.1</option>
              <option value="m2">ม.2</option>
              <option value="m3">ม.3</option>
              <option value="m4">ม.4</option>
              <option value="m5">ม.5</option>
              <option value="m6">ม.6</option>
            </select>
          </div>
        </div>
        
        <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>
        
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>เลขประจำตัว</th>
              <th>ชื่อ-นามสกุล</th>
              <th>ระดับชั้น</th>
              <th>คะแนน HOTS</th>
              <th>การกระทำ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="student in filteredStudents" :key="student.uid">
              <td>{{ student.studentId }}</td>
              <td>{{ student.displayName }}</td>
              <td>{{ student.gradeLevel }}</td>
              <td>
                <span class="hots-badge" :class="getHOTSClass(student.hotsAverage)">
                  {{ student.hotsAverage?.toFixed(2) || 'N/A' }}
                </span>
              </td>
              <td>
                <button @click="viewStudentPortfolio(student)" class="btn-small">
                  Portfolio
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Analytics Tab -->
      <div v-if="activeTab === 'analytics'" class="analytics-section">
        <h2>การวิเคราะห์โรงเรียน</h2>
        
        <div v-if="analyticsLoading" class="loading">กำลังโหลดข้อมูล...</div>
        
        <div v-else class="analytics-grid">
          <!-- HOTS Breakdown -->
          <div class="analytics-card">
            <h3>คะแนน HOTS แยกตามมิติ</h3>
            <div class="hots-breakdown">
              <div v-for="dimension in ['analysis', 'reasoning', 'creativity', 'evidence']" 
                   :key="dimension" 
                   class="dimension-bar">
                <label>{{ getDimensionLabel(dimension) }}</label>
                <div class="progress-bar">
                  <div class="progress-fill" 
                       :style="{ width: (analytics.hotsAverage?.[dimension] || 0) * 20 + '%' }">
                  </div>
                </div>
                <span class="score">{{ analytics.hotsAverage?.[dimension]?.toFixed(2) || '0.00' }}</span>
              </div>
            </div>
          </div>

          <!-- Grade Performance -->
          <div class="analytics-card">
            <h3>ผลการเรียนแยกตามระดับชั้น</h3>
            <canvas ref="gradeChart"></canvas>
          </div>

          <!-- Export Options -->
          <div class="analytics-card">
            <h3>รายงาน</h3>
            <div class="export-buttons">
              <button @click="exportReport('pdf')" class="btn-secondary">
                📄 Export PDF
              </button>
              <button @click="exportReport('excel')" class="btn-secondary">
                📊 Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Teacher Dialog -->
    <div v-if="showAddTeacherDialog" class="modal-overlay" @click.self="showAddTeacherDialog = false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>➕ เพิ่มครูใหม่</h3>
          <button @click="showAddTeacherDialog = false" class="close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>ชื่อ-นามสกุล *</label>
            <input v-model="newTeacher.displayName" type="text" class="form-input" placeholder="ระบุชื่อ-นามสกุล" />
          </div>
          <div class="form-group">
            <label>อีเมล *</label>
            <input v-model="newTeacher.email" type="email" class="form-input" placeholder="teacher@school.ac.th" />
          </div>
          <div class="form-group">
            <label>รหัสผ่าน *</label>
            <input v-model="newTeacher.password" type="password" class="form-input" placeholder="อย่างน้อย 6 ตัวอักษร" />
          </div>
          <div class="form-group">
            <label>วิชาที่สอน (คั่นด้วยเครื่องหมายจุลภาค)</label>
            <input v-model="newTeacher.subjects" type="text" class="form-input" placeholder="คณิตศาสตร์, วิทยาศาสตร์" />
          </div>
          <p v-if="addTeacherError" class="error-message">{{ addTeacherError }}</p>
        </div>
        <div class="modal-footer">
          <button @click="showAddTeacherDialog = false" class="btn-secondary">ยกเลิก</button>
          <button @click="addTeacher" :disabled="addingTeacher" class="btn-primary">
            {{ addingTeacher ? 'กำลังสร้าง...' : 'เพิ่มครู' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const router = useRouter()

const activeTab = ref('teachers')
const loading = ref(false)
const analyticsLoading = ref(false)
const showAddTeacherDialog = ref(false)
const addingTeacher = ref(false)
const addTeacherError = ref('')

const newTeacher = ref({
  displayName: '',
  email: '',
  password: '',
  subjects: ''
})

const isDarkMode = computed(() => themeStore.isDarkMode)

const schoolInfo = ref(null)
const teachers = ref([])
const students = ref([])
const analytics = ref({})
const selectedGrade = ref('')

const tabs = [
  { id: 'teachers', label: 'ครู', icon: '👨‍🏫' },
  { id: 'students', label: 'นักเรียน', icon: '👨‍🎓' },
  { id: 'analytics', label: 'การวิเคราะห์', icon: '📊' }
]

const stats = computed(() => ({
  teacherCount: teachers.value.length,
  studentCount: students.value.length,
  totalAssessments: analytics.value.totalAssessments || 0,
  averageHOTS: analytics.value.hotsAverage 
    ? (analytics.value.hotsAverage.analysis + analytics.value.hotsAverage.reasoning + 
       analytics.value.hotsAverage.creativity + analytics.value.hotsAverage.evidence) / 4
    : 0
}))

const filteredStudents = computed(() => {
  if (!selectedGrade.value) return students.value
  return students.value.filter(s => s.gradeLevel === selectedGrade.value)
})

onMounted(async () => {
  await loadSchoolData()
  await loadTeachers()
  await loadStudents()
  await loadAnalytics()
})

async function loadSchoolData() {
  try {
    if (!authStore.schoolId) return
    
    const docRef = await getDocs(query(
      collection(db, 'organizations'),
      where('__name__', '==', authStore.schoolId)
    ))
    
    if (!docRef.empty) {
      schoolInfo.value = docRef.docs[0].data()
    }
  } catch (error) {
    console.error('Error loading school data:', error)
  }
}

async function loadTeachers() {
  try {
    loading.value = true
    const q = query(
      collection(db, 'users'),
      where('schoolId', '==', authStore.schoolId),
      where('role', '==', 'teacher')
    )
    const snapshot = await getDocs(q)
    teachers.value = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading teachers:', error)
  } finally {
    loading.value = false
  }
}

async function loadStudents() {
  try {
    loading.value = true
    const q = query(
      collection(db, 'users'),
      where('schoolId', '==', authStore.schoolId),
      where('role', '==', 'student')
    )
    const snapshot = await getDocs(q)
    students.value = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading students:', error)
  } finally {
    loading.value = false
  }
}

async function loadAnalytics() {
  try {
    analyticsLoading.value = true
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    const response = await fetch(
      `${functionsUrl}/getSchoolAnalytics?schoolId=${authStore.schoolId}`
    )
    const data = await response.json()
    if (data.success) {
      analytics.value = data.stats
    }
  } catch (error) {
    console.error('Error loading analytics:', error)
  } finally {
    analyticsLoading.value = false
  }
}

function getDimensionLabel(dimension) {
  const labels = {
    analysis: 'วิเคราะห์',
    reasoning: 'ให้เหตุผล',
    creativity: 'สร้างสรรค์',
    evidence: 'ใช้หลักฐาน'
  }
  return labels[dimension] || dimension
}

function getHOTSClass(score) {
  if (!score) return 'low'
  if (score >= 4) return 'high'
  if (score >= 3) return 'medium'
  return 'low'
}

function viewTeacherDetails(teacher) {
  // Navigate to teacher detail page
  console.log('View teacher:', teacher)
}

function viewStudentPortfolio(student) {
  router.push(`/student-portfolio/${student.uid}`)
}

function exportReport(format) {
  console.log('Export as:', format)
  alert(`กำลังพัฒนาฟีเจอร์ Export ${format.toUpperCase()}`)
}

function toggleTheme() {
  themeStore.toggleTheme()
}

async function addTeacher() {
  addTeacherError.value = ''
  
  // Validation
  if (!newTeacher.value.displayName || !newTeacher.value.email || !newTeacher.value.password) {
    addTeacherError.value = 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
    return
  }
  
  if (newTeacher.value.password.length < 6) {
    addTeacherError.value = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
    return
  }
  
  addingTeacher.value = true
  
  try {
    // Parse subjects
    const subjects = newTeacher.value.subjects
      ? newTeacher.value.subjects.split(',').map(s => s.trim()).filter(s => s)
      : []
    
    // Create user document in Firestore
    const teacherData = {
      displayName: newTeacher.value.displayName,
      email: newTeacher.value.email,
      role: 'teacher',
      schoolId: authStore.schoolId,
      subjects: subjects,
      studentCount: 0,
      createdAt: serverTimestamp(),
      // Note: In production, use Firebase Admin SDK to create auth user
      // This is a simplified version
      tempPassword: newTeacher.value.password // Store temporarily for manual setup
    }
    
    await addDoc(collection(db, 'users'), teacherData)
    
    // Reload teachers
    await loadTeachers()
    
    // Reset form
    newTeacher.value = {
      displayName: '',
      email: '',
      password: '',
      subjects: ''
    }
    
    showAddTeacherDialog.value = false
    alert('✅ เพิ่มครูสำเร็จ! ครูสามารถเข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่กำหนด')
  } catch (error) {
    console.error('Error adding teacher:', error)
    addTeacherError.value = 'เกิดข้อผิดพลาด: ' + error.message
  } finally {
    addingTeacher.value = false
  }
}
</script>

<style scoped>
.school-management {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;

  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.header {
  margin-bottom: 30px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.icon-btn {
  background: var(--card-bg);
  border: 2px solid var(--border-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.icon-btn:hover {
  background: var(--primary-color);
  transform: scale(1.1);
}

.header h1 {
  font-size: 2em;
  margin-bottom: 5px;
}

.school-name {
  color: var(--text-secondary);
  font-size: 1.1em;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  font-size: 2.5em;
}

.stat-content h3 {
  font-size: 2em;
  margin: 0;
  color: #4CAF50;
}

.stat-content p {
  margin: 5px 0 0 0;
  color: var(--text-secondary);
}

/* Quick Actions Bar */
.quick-actions-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: 2px solid var(--border-color, #e2e8f0);
  border-radius: 0.5rem;
  background: var(--bg-secondary);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.quick-btn:hover {
  border-color: #4299e1;
  background: linear-gradient(135deg, rgba(66, 153, 225, 0.1), rgba(99, 102, 241, 0.1));
  transform: translateY(-2px);
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.tabs button {
  padding: 12px 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1em;
  color: var(--text-secondary);
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
}

.tabs button:hover {
  color: #4CAF50;
}

.tabs button.active {
  color: #4CAF50;
  border-bottom-color: #4CAF50;
  font-weight: bold;
}

.tab-content {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filters {
  display: flex;
  gap: 10px;
}

.form-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1em;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.data-table th {
  background: #f5f5f5;
  font-weight: bold;
  color: var(--text-primary);
}

.data-table tr:hover {
  background: #f9f9f9;
}

.hots-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 0.9em;
}

.hots-badge.high {
  background: #4CAF50;
  color: white;
}

.hots-badge.medium {
  background: #FF9800;
  color: white;
}

.hots-badge.low {
  background: #f44336;
  color: white;
}

.btn-primary, .btn-secondary, .btn-small {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1em;
  transition: all 0.3s;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-primary:hover {
  background: #45a049;
}

.btn-secondary {
  background: #2196F3;
  color: white;
  margin: 5px;
}

.btn-secondary:hover {
  background: #0b7dda;
}

.btn-small {
  padding: 6px 12px;
  font-size: 0.9em;
  background: #f0f0f0;
  color: var(--text-primary);
}

.btn-small:hover {
  background: #e0e0e0;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.analytics-grid {
  display: grid;
  gap: 20px;
}

.analytics-card {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
}

.analytics-card h3 {
  margin-top: 0;
}

.hots-breakdown {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.dimension-bar {
  display: grid;
  grid-template-columns: 100px 1fr 60px;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  height: 24px;
  background: #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  transition: width 0.5s;
}

.export-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .tabs {
    flex-direction: column;
  }
  
  .data-table {
    font-size: 0.9em;
  }
}
</style>
