<template>
  <div class="pretest-posttest">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <router-link to="/teacher" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <div class="header-text">
          <h1>📊 Pre-test / Post-test</h1>
          <p>สร้างและจัดการแบบทดสอบสำหรับงานวิจัย (RQ1: Effectiveness)</p>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button 
        class="tab" 
        :class="{ active: activeTab === 'manage' }"
        @click="activeTab = 'manage'"
      >
        📋 จัดการแบบทดสอบ
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'assign' }"
        @click="activeTab = 'assign'"
      >
        👥 มอบหมายนักเรียน
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'results' }"
        @click="activeTab = 'results'"
      >
        📈 ผลการทดสอบ
      </button>
    </div>

    <!-- Tab: Manage Tests -->
    <div v-if="activeTab === 'manage'" class="tab-content">
      <div class="tests-grid">
        <!-- Create New Test Card -->
        <div class="create-test-card card" @click="showCreateModal = true">
          <span class="material-icons">add_circle</span>
          <h3>สร้างแบบทดสอบใหม่</h3>
          <p>สร้าง Pre-test หรือ Post-test</p>
        </div>

        <!-- Existing Tests -->
        <div v-for="test in tests" :key="test.id" class="test-card card">
          <div class="test-badge" :class="test.type">
            {{ test.type === 'pretest' ? 'Pre-test' : 'Post-test' }}
          </div>
          <h3>{{ test.name }}</h3>
          <p class="test-course">{{ test.courseName }}</p>
          <div class="test-stats">
            <span><strong>{{ test.questionCount }}</strong> ข้อ</span>
            <span><strong>{{ test.assignedCount }}</strong> คนทำ</span>
            <span><strong>{{ test.completedCount }}</strong> เสร็จ</span>
          </div>
          <div class="test-actions">
            <button class="btn btn-sm btn-outline" @click="editTest(test)">
              <span class="material-icons">edit</span>
            </button>
            <button class="btn btn-sm btn-outline" @click="viewResults(test)">
              <span class="material-icons">assessment</span>
            </button>
            <button class="btn btn-sm btn-primary" @click="assignTest(test)">
              มอบหมาย
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Assign Students -->
    <div v-if="activeTab === 'assign'" class="tab-content">
      <div class="assign-section">
        <div class="assign-header">
          <h2>มอบหมายนักเรียนเข้ากลุ่มทดลอง</h2>
          <p>กำหนดว่านักเรียนคนไหนอยู่กลุ่ม Control หรือ Treatment</p>
        </div>

        <div class="experiment-groups">
          <!-- Control Group -->
          <div class="group-card control">
            <div class="group-header">
              <h3>🔵 Control Group</h3>
              <span class="count">{{ controlStudents.length }} คน</span>
            </div>
            <p class="group-desc">กลุ่มควบคุม - ไม่ใช้ระบบ HOTS AI</p>
            <div class="student-list">
              <div v-for="student in controlStudents" :key="student.id" class="student-item">
                <span>{{ student.displayName }}</span>
                <button class="btn-remove" @click="moveToTreatment(student)">→</button>
              </div>
            </div>
          </div>

          <!-- Treatment Group -->
          <div class="group-card treatment">
            <div class="group-header">
              <h3>🟢 Treatment Group</h3>
              <span class="count">{{ treatmentStudents.length }} คน</span>
            </div>
            <p class="group-desc">กลุ่มทดลอง - ใช้ระบบ HOTS AI</p>
            <div class="student-list">
              <div v-for="student in treatmentStudents" :key="student.id" class="student-item">
                <button class="btn-remove" @click="moveToControl(student)">←</button>
                <span>{{ student.displayName }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Unassigned Students -->
        <div class="unassigned-section card">
          <h3>นักเรียนที่ยังไม่ได้จัดกลุ่ม ({{ unassignedStudents.length }} คน)</h3>
          <div class="unassigned-list">
            <div v-for="student in unassignedStudents" :key="student.id" class="unassigned-item">
              <span>{{ student.displayName }}</span>
              <div class="assign-buttons">
                <button class="btn btn-sm" @click="assignToControl(student)">Control</button>
                <button class="btn btn-sm btn-primary" @click="assignToTreatment(student)">Treatment</button>
              </div>
            </div>
          </div>
          
          <div class="bulk-actions">
            <button class="btn btn-outline" @click="randomAssign">
              <span class="material-icons">shuffle</span>
              สุ่มจัดกลุ่มอัตโนมัติ
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Results -->
    <div v-if="activeTab === 'results'" class="tab-content">
      <div class="results-section">
        <div class="results-header">
          <h2>ผลการทดสอบ Pre-test vs Post-test</h2>
          <div class="filter-group">
            <select v-model="selectedTestPair" class="form-control">
              <option value="">-- เลือกคู่แบบทดสอบ --</option>
              <option v-for="pair in testPairs" :key="pair.id" :value="pair.id">
                {{ pair.name }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="selectedTestPair" class="results-content">
          <!-- Summary Stats -->
          <div class="stats-cards">
            <div class="stat-card control">
              <h4>Control Group</h4>
              <div class="stat-row">
                <span>Pre-test:</span>
                <strong>{{ controlStats.pretest }} / 20</strong>
              </div>
              <div class="stat-row">
                <span>Post-test:</span>
                <strong>{{ controlStats.posttest }} / 20</strong>
              </div>
              <div class="stat-row gain">
                <span>Gain:</span>
                <strong :class="controlStats.gain >= 0 ? 'positive' : 'negative'">
                  {{ controlStats.gain >= 0 ? '+' : '' }}{{ controlStats.gain }}
                </strong>
              </div>
            </div>

            <div class="stat-card treatment">
              <h4>Treatment Group</h4>
              <div class="stat-row">
                <span>Pre-test:</span>
                <strong>{{ treatmentStats.pretest }} / 20</strong>
              </div>
              <div class="stat-row">
                <span>Post-test:</span>
                <strong>{{ treatmentStats.posttest }} / 20</strong>
              </div>
              <div class="stat-row gain">
                <span>Gain:</span>
                <strong :class="treatmentStats.gain >= 0 ? 'positive' : 'negative'">
                  {{ treatmentStats.gain >= 0 ? '+' : '' }}{{ treatmentStats.gain }}
                </strong>
              </div>
            </div>

            <div class="stat-card comparison">
              <h4>Statistical Comparison</h4>
              <div class="stat-row">
                <span>Effect Size (Cohen's d):</span>
                <strong>{{ effectSize }}</strong>
              </div>
              <div class="stat-row">
                <span>t-value:</span>
                <strong>{{ tValue }}</strong>
              </div>
              <div class="stat-row">
                <span>p-value:</span>
                <strong :class="pValue < 0.05 ? 'significant' : ''">{{ pValue }}</strong>
              </div>
            </div>
          </div>

          <!-- Export Button -->
          <div class="export-section">
            <button class="btn btn-primary" @click="exportResults">
              <span class="material-icons">download</span>
              Export ข้อมูลสำหรับ SPSS
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Test Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>สร้างแบบทดสอบใหม่</h3>
          <button class="btn-close" @click="showCreateModal = false">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>ชื่อแบบทดสอบ</label>
            <input v-model="newTest.name" type="text" class="form-control" placeholder="เช่น HOTS Pre-test ภาคเรียน 1/2568" />
          </div>
          
          <div class="form-group">
            <label>ประเภท</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" v-model="newTest.type" value="pretest" />
                <span>Pre-test</span>
              </label>
              <label class="radio-option">
                <input type="radio" v-model="newTest.type" value="posttest" />
                <span>Post-test</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>เลือกรายวิชา</label>
            <select v-model="newTest.courseId" class="form-control">
              <option value="">-- เลือกรายวิชา --</option>
              <option v-for="course in courses" :key="course.id" :value="course.id">
                {{ course.courseCode }} - {{ course.courseName }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>เลือกคำถาม (จากคลังคำถาม)</label>
            <div class="question-selector">
              <div v-for="q in availableQuestions" :key="q.id" class="question-checkbox">
                <label>
                  <input type="checkbox" v-model="newTest.questionIds" :value="q.id" />
                  <span class="question-preview">{{ q.question.substring(0, 100) }}...</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showCreateModal = false">ยกเลิก</button>
          <button class="btn btn-primary" @click="createTest" :disabled="!canCreateTest">
            สร้างแบบทดสอบ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Tabs
const activeTab = ref('manage')

// Data
const tests = ref([])
const courses = ref([])
const students = ref([])
const availableQuestions = ref([])
const testPairs = ref([])

// Create Test
const showCreateModal = ref(false)
const newTest = ref({
  name: '',
  type: 'pretest',
  courseId: '',
  questionIds: []
})

// Assign
const controlStudents = ref([])
const treatmentStudents = ref([])

// Results
const selectedTestPair = ref('')
const controlStats = ref({ pretest: 0, posttest: 0, gain: 0 })
const treatmentStats = ref({ pretest: 0, posttest: 0, gain: 0 })
const effectSize = ref('0.00')
const tValue = ref('0.00')
const pValue = ref('1.00')

// Computed
const unassignedStudents = computed(() => {
  const assignedIds = new Set([
    ...controlStudents.value.map(s => s.id),
    ...treatmentStudents.value.map(s => s.id)
  ])
  return students.value.filter(s => !assignedIds.has(s.id))
})

const canCreateTest = computed(() => {
  return newTest.value.name && newTest.value.courseId && newTest.value.questionIds.length > 0
})

// Methods
async function loadCourses() {
  try {
    const coursesRef = collection(db, 'courses')
    const q = query(coursesRef, where('teacherId', '==', authStore.user.uid))
    const snapshot = await getDocs(q)
    courses.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading courses:', error)
  }
}

async function loadTests() {
  try {
    const testsRef = collection(db, 'researchTests')
    const q = query(testsRef, where('teacherId', '==', authStore.user.uid))
    const snapshot = await getDocs(q)
    tests.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading tests:', error)
  }
}

async function loadStudents() {
  try {
    const studentsRef = collection(db, 'users')
    const q = query(studentsRef, where('role', '==', 'student'))
    const snapshot = await getDocs(q)
    students.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    // Separate by experiment group
    controlStudents.value = students.value.filter(s => s.experimentGroup === 'control')
    treatmentStudents.value = students.value.filter(s => s.experimentGroup === 'treatment')
  } catch (error) {
    console.error('Error loading students:', error)
  }
}

async function loadQuestions() {
  if (!newTest.value.courseId) {
    availableQuestions.value = []
    return
  }
  
  try {
    const questionsRef = collection(db, 'questions')
    const q = query(questionsRef, where('courseId', '==', newTest.value.courseId))
    const snapshot = await getDocs(q)
    availableQuestions.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading questions:', error)
  }
}

async function createTest() {
  try {
    const testData = {
      ...newTest.value,
      teacherId: authStore.user.uid,
      courseName: courses.value.find(c => c.id === newTest.value.courseId)?.courseName || '',
      questionCount: newTest.value.questionIds.length,
      assignedCount: 0,
      completedCount: 0,
      createdAt: new Date()
    }
    
    await addDoc(collection(db, 'researchTests'), testData)
    
    showCreateModal.value = false
    newTest.value = { name: '', type: 'pretest', courseId: '', questionIds: [] }
    await loadTests()
    
    alert('สร้างแบบทดสอบสำเร็จ!')
  } catch (error) {
    console.error('Error creating test:', error)
    alert('เกิดข้อผิดพลาด')
  }
}

async function assignToGroup(student, group) {
  try {
    await updateDoc(doc(db, 'users', student.id), {
      experimentGroup: group
    })
    
    // Update local state
    if (group === 'control') {
      controlStudents.value.push(student)
      treatmentStudents.value = treatmentStudents.value.filter(s => s.id !== student.id)
    } else {
      treatmentStudents.value.push(student)
      controlStudents.value = controlStudents.value.filter(s => s.id !== student.id)
    }
    
    // Update researchParticipants collection
    await addDoc(collection(db, 'researchParticipants'), {
      userId: student.id,
      experimentAssignment: {
        group: group,
        assignedAt: new Date(),
        cohort: `${new Date().getFullYear()}-sem${Math.ceil((new Date().getMonth() + 1) / 6)}`
      },
      createdAt: new Date()
    })
    
  } catch (error) {
    console.error('Error assigning student:', error)
  }
}

function assignToControl(student) {
  assignToGroup(student, 'control')
}

function assignToTreatment(student) {
  assignToGroup(student, 'treatment')
}

function moveToControl(student) {
  assignToGroup(student, 'control')
}

function moveToTreatment(student) {
  assignToGroup(student, 'treatment')
}

async function randomAssign() {
  const unassigned = [...unassignedStudents.value]
  
  // Shuffle
  for (let i = unassigned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[unassigned[i], unassigned[j]] = [unassigned[j], unassigned[i]]
  }
  
  // Assign half to each group
  const half = Math.ceil(unassigned.length / 2)
  
  for (let i = 0; i < unassigned.length; i++) {
    const group = i < half ? 'control' : 'treatment'
    await assignToGroup(unassigned[i], group)
  }
  
  alert(`สุ่มจัดกลุ่มเสร็จแล้ว!\nControl: ${half} คน\nTreatment: ${unassigned.length - half} คน`)
}

function editTest(test) {
  // TODO: Implement edit
  alert('ฟีเจอร์กำลังพัฒนา')
}

function viewResults(test) {
  activeTab.value = 'results'
}

function assignTest(test) {
  activeTab.value = 'assign'
}

function exportResults() {
  // Create CSV for SPSS
  let csv = 'StudentID,Group,Pretest_A,Pretest_R,Pretest_C,Pretest_E,Pretest_Total,Posttest_A,Posttest_R,Posttest_C,Posttest_E,Posttest_Total,Gain\n'
  
  // Add sample data (in real implementation, use actual data)
  const allStudents = [...controlStudents.value, ...treatmentStudents.value]
  allStudents.forEach((student, i) => {
    const group = controlStudents.value.includes(student) ? 0 : 1
    csv += `S${String(i + 1).padStart(3, '0')},${group},3,3,2,3,11,4,4,3,4,15,4\n`
  })
  
  // Download
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hots_prepost_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}

// Watchers
watch(() => newTest.value.courseId, loadQuestions)

onMounted(async () => {
  await loadCourses()
  await loadTests()
  await loadStudents()
})
</script>

<style scoped>
.pretest-posttest {
  min-height: 100vh;
  background: var(--bg-primary);
  padding: 1.5rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  text-decoration: none;
}

.header-text h1 {
  margin: 0;
  font-size: 1.5rem;
}

.header-text p {
  margin: 0.25rem 0 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
}

.tab {
  padding: 0.75rem 1.5rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  font-weight: 500;
}

.tab.active {
  background: var(--bg-secondary);
  color: #3b82f6;
}

.tab:hover:not(.active) {
  background: var(--bg-tertiary);
}

/* Cards */
.card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
}

/* Tests Grid */
.tests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.create-test-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 200px;
  cursor: pointer;
  border: 2px dashed var(--border-color);
  transition: all 0.2s;
}

.create-test-card:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.create-test-card .material-icons {
  font-size: 3rem;
  color: #3b82f6;
  margin-bottom: 1rem;
}

.create-test-card h3 {
  margin: 0 0 0.5rem;
}

.create-test-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.test-card {
  position: relative;
}

.test-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.test-badge.pretest {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.test-badge.posttest {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.test-card h3 {
  margin: 0 0 0.5rem;
  padding-right: 80px;
}

.test-course {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0 0 1rem;
}

.test-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.test-actions {
  display: flex;
  gap: 0.5rem;
}

/* Assign Section */
.assign-section {
  max-width: 1200px;
}

.assign-header {
  margin-bottom: 1.5rem;
}

.assign-header h2 {
  margin: 0 0 0.5rem;
}

.assign-header p {
  color: var(--text-secondary);
  margin: 0;
}

.experiment-groups {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 768px) {
  .experiment-groups {
    grid-template-columns: 1fr;
  }
}

.group-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid var(--border-color);
}

.group-card.control {
  border-color: rgba(59, 130, 246, 0.3);
}

.group-card.treatment {
  border-color: rgba(16, 185, 129, 0.3);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.group-header h3 {
  margin: 0;
}

.count {
  background: var(--bg-tertiary);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
}

.group-desc {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0 0 1rem;
}

.student-list {
  max-height: 300px;
  overflow-y: auto;
}

.student-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-radius: 6px;
}

.student-item:hover {
  background: var(--bg-tertiary);
}

.btn-remove {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
}

.btn-remove:hover {
  color: #3b82f6;
}

.unassigned-section {
  margin-top: 1.5rem;
}

.unassigned-section h3 {
  margin: 0 0 1rem;
}

.unassigned-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 1rem;
}

.unassigned-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-radius: 6px;
}

.unassigned-item:hover {
  background: var(--bg-tertiary);
}

.assign-buttons {
  display: flex;
  gap: 0.5rem;
}

.bulk-actions {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

/* Results Section */
.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.results-header h2 {
  margin: 0;
}

.filter-group {
  min-width: 250px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
}

.stat-card.control {
  border-left: 4px solid #3b82f6;
}

.stat-card.treatment {
  border-left: 4px solid #10b981;
}

.stat-card.comparison {
  border-left: 4px solid #8b5cf6;
}

.stat-card h4 {
  margin: 0 0 1rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.stat-row.gain {
  border-bottom: none;
  font-size: 1.1rem;
}

.positive { color: #10b981; }
.negative { color: #ef4444; }
.significant { color: #10b981; font-weight: 700; }

.export-section {
  text-align: center;
  margin-top: 2rem;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-outline:hover {
  background: var(--bg-tertiary);
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Form */
.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.radio-group {
  display: flex;
  gap: 1.5rem;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.question-selector {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.5rem;
}

.question-checkbox {
  padding: 0.5rem;
}

.question-checkbox label {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  cursor: pointer;
}

.question-preview {
  font-size: 0.875rem;
  color: var(--text-secondary);
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
  padding: 1rem;
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
}
</style>
