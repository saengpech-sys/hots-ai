<template>
  <div class="class-analytics">
    <div class="analytics-header">
      <h1>📊 วิเคราะห์ภาพรวมห้องเรียน</h1>
      <p class="subtitle">ข้อมูลเชิงลึกเพื่อการพัฒนาทักษะ HOTS ของนักเรียน</p>
    </div>

    <!-- Course Selector -->
    <div class="course-selector">
      <label for="course-select">เลือกคอร์สเรียน:</label>
      <select id="course-select" v-model="selectedCourseId" @change="onCourseChange">
        <option value="">-- กรุณาเลือกคอร์ส --</option>
        <option v-for="course in courses" :key="course.id" :value="course.id">
          {{ course.courseCode }} - {{ course.courseName }}
        </option>
      </select>
      <button 
        v-if="selectedCourseId" 
        @click="refreshReport" 
        :disabled="dashboardStore.loading"
        class="btn-refresh"
      >
        {{ dashboardStore.loading ? '⏳ กำลังสร้างรายงาน...' : '🔄 สร้างรายงานใหม่' }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="dashboardStore.loading && !dashboardStore.hasReport" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="dashboardStore.error" class="error-state">
      <p>❌ เกิดข้อผิดพลาด: {{ dashboardStore.error }}</p>
      <button @click="refreshReport" class="btn-retry">ลองอีกครั้ง</button>
    </div>

    <!-- No Data State -->
    <div v-else-if="!dashboardStore.hasReport && selectedCourseId" class="no-data-state">
      <p>📭 ยังไม่มีข้อมูลการประเมินสำหรับคอร์สนี้</p>
      <button @click="refreshReport" class="btn-generate">สร้างรายงาน</button>
    </div>

    <!-- Main Dashboard -->
    <div v-else-if="dashboardStore.hasReport" class="dashboard-content">
      
      <!-- Overview Cards -->
      <div class="overview-cards">
        <div class="card card-primary">
          <div class="card-icon">👥</div>
          <div class="card-content">
            <h3>{{ dashboardStore.totalStudents }}</h3>
            <p>นักเรียนทั้งหมด</p>
          </div>
        </div>

        <div class="card card-success">
          <div class="card-icon">✅</div>
          <div class="card-content">
            <h3>{{ dashboardStore.totalAssessments }}</h3>
            <p>การประเมินทั้งหมด</p>
          </div>
        </div>

        <div class="card card-info">
          <div class="card-icon">⭐</div>
          <div class="card-content">
            <h3>{{ averageOverallScore }}</h3>
            <p>คะแนนเฉลี่ยทั้งห้อง</p>
          </div>
        </div>

        <div class="card card-warning">
          <div class="card-icon">⚠️</div>
          <div class="card-content">
            <h3>{{ dashboardStore.strugglingStudents.length }}</h3>
            <p>ต้องการความช่วยเหลือ</p>
          </div>
        </div>
      </div>

      <!-- Rubric Dimension Analysis -->
      <div class="section rubric-analysis">
        <h2>📈 การวิเคราะห์ตามมิติ HOTS</h2>
        <div class="rubric-bars">
          <div 
            v-for="(value, dimension) in dashboardStore.rubricAverages" 
            :key="dimension"
            class="rubric-bar-container"
          >
            <div class="rubric-label">
              <span class="dimension-name">{{ getDimensionName(dimension) }}</span>
              <span class="dimension-score">{{ value.toFixed(2) }} / 5</span>
            </div>
            <div class="rubric-bar-track">
              <div 
                class="rubric-bar-fill" 
                :style="{ width: `${(value / 5) * 100}%`, backgroundColor: getDimensionColor(dimension) }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- LO Mastery Heatmap -->
      <div class="section lo-mastery">
        <h2>🎯 ความเชี่ยวชาญตาม Learning Outcomes</h2>
        <div v-if="Object.keys(dashboardStore.loMastery).length > 0" class="lo-grid">
          <div 
            v-for="(count, lo) in sortedLoMastery" 
            :key="lo"
            class="lo-card"
            :class="getLoMasteryClass(count)"
          >
            <div class="lo-code">{{ lo }}</div>
            <div class="lo-count">{{ count }} คน</div>
            <div class="lo-percentage">{{ ((count / dashboardStore.totalStudents) * 100).toFixed(0) }}%</div>
          </div>
        </div>
        <div v-else class="no-lo-data">
          <p>ยังไม่มีข้อมูล Learning Outcomes</p>
        </div>
      </div>

      <!-- Student Performance Lists -->
      <div class="section student-lists">
        <div class="student-list struggling">
          <h2>⚠️ นักเรียนที่ต้องการความช่วยเหลือ</h2>
          <div v-if="dashboardStore.strugglingStudents.length > 0">
            <div 
              v-for="studentId in dashboardStore.strugglingStudents" 
              :key="studentId"
              class="student-card"
            >
              <div class="student-info">
                <div class="student-name">
                  {{ getStudentName(studentId) }}
                </div>
                <div class="student-stats">
                  <span class="stat">
                    คะแนนเฉลี่ย: {{ getStudentAverage(studentId) }}
                  </span>
                  <span class="stat">
                    ประเมิน: {{ getStudentAssessmentCount(studentId) }} ครั้ง
                  </span>
                  <span class="stat">
                    LO ที่ผ่าน: {{ getStudentPassedLOs(studentId).length }}
                  </span>
                </div>
              </div>
              <button @click="viewStudentDetail(studentId)" class="btn-view">
                ดูรายละเอียด →
              </button>
            </div>
          </div>
          <p v-else class="no-students">✅ ไม่มีนักเรียนที่ต้องการความช่วยเหลือเร่งด่วน</p>
        </div>

        <div class="student-list top-performers">
          <h2>🌟 นักเรียนที่มีผลงานดีเด่น</h2>
          <div v-if="dashboardStore.topPerformers.length > 0">
            <div 
              v-for="studentId in dashboardStore.topPerformers" 
              :key="studentId"
              class="student-card"
            >
              <div class="student-info">
                <div class="student-name">
                  {{ getStudentName(studentId) }}
                </div>
                <div class="student-stats">
                  <span class="stat">
                    คะแนนเฉลี่ย: {{ getStudentAverage(studentId) }}
                  </span>
                  <span class="stat">
                    ประเมิน: {{ getStudentAssessmentCount(studentId) }} ครั้ง
                  </span>
                  <span class="stat">
                    LO ที่ผ่าน: {{ getStudentPassedLOs(studentId).length }}
                  </span>
                </div>
              </div>
              <button @click="viewStudentDetail(studentId)" class="btn-view">
                ดูรายละเอียด →
              </button>
            </div>
          </div>
          <p v-else class="no-students">ยังไม่มีนักเรียนที่ผ่านเกณฑ์ผลงานดีเด่น</p>
        </div>
      </div>

      <!-- Report Metadata -->
      <div class="report-metadata">
        <p>
          📅 รายงานสร้างเมื่อ: {{ formatDate(dashboardStore.currentReport.generatedAt) }}
        </p>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboardStore } from '@/stores/dashboard'
import { useAuthStore } from '@/stores/auth'
import { db } from '@/firebase/config'
import { collection, query, where, getDocs } from 'firebase/firestore'

const router = useRouter()
const dashboardStore = useDashboardStore()
const authStore = useAuthStore()

const selectedCourseId = ref('')
const courses = ref([])

// Computed
const averageOverallScore = computed(() => {
  if (!dashboardStore.rubricAverages) return '0.00'
  const avg = (
    dashboardStore.rubricAverages.analysis +
    dashboardStore.rubricAverages.reasoning +
    dashboardStore.rubricAverages.creativity +
    dashboardStore.rubricAverages.evidence
  ) / 4
  return avg.toFixed(2)
})

const sortedLoMastery = computed(() => {
  const entries = Object.entries(dashboardStore.loMastery)
  return Object.fromEntries(entries.sort((a, b) => b[1] - a[1]))
})

// Methods
async function loadCourses() {
  try {
    const coursesRef = collection(db, 'courses')
    const q = query(coursesRef, where('teacherId', '==', authStore.user.uid))
    const snapshot = await getDocs(q)
    
    courses.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Load courses error:', error)
  }
}

async function onCourseChange() {
  if (!selectedCourseId.value) {
    dashboardStore.clearReport()
    return
  }

  try {
    await dashboardStore.loadLatestReport(selectedCourseId.value)
    
    if (dashboardStore.hasReport) {
      // Fetch student details for all students in report
      const allStudentIds = [
        ...dashboardStore.strugglingStudents,
        ...dashboardStore.topPerformers,
        ...Object.keys(dashboardStore.studentPerformance)
      ]
      const uniqueIds = [...new Set(allStudentIds)]
      await dashboardStore.fetchAllStudentDetails(uniqueIds)
    }
  } catch (error) {
    console.error('Load report error:', error)
  }
}

async function refreshReport() {
  if (!selectedCourseId.value) return

  try {
    await dashboardStore.generateReport(selectedCourseId.value, authStore.user.uid)
    
    if (dashboardStore.hasReport) {
      // Fetch student details
      const allStudentIds = [
        ...dashboardStore.strugglingStudents,
        ...dashboardStore.topPerformers,
        ...Object.keys(dashboardStore.studentPerformance)
      ]
      const uniqueIds = [...new Set(allStudentIds)]
      await dashboardStore.fetchAllStudentDetails(uniqueIds)
    }
  } catch (error) {
    console.error('Generate report error:', error)
  }
}

function getDimensionName(dimension) {
  const names = {
    analysis: 'วิเคราะห์',
    reasoning: 'เหตุผล',
    creativity: 'สร้างสรรค์',
    evidence: 'หลักฐาน'
  }
  return names[dimension] || dimension
}

function getDimensionColor(dimension) {
  const colors = {
    analysis: '#3b82f6',
    reasoning: '#8b5cf6',
    creativity: '#ec4899',
    evidence: '#10b981'
  }
  return colors[dimension] || '#6b7280'
}

function getLoMasteryClass(count) {
  const percentage = (count / dashboardStore.totalStudents) * 100
  if (percentage >= 80) return 'mastery-high'
  if (percentage >= 50) return 'mastery-medium'
  return 'mastery-low'
}

function getStudentName(studentId) {
  const details = dashboardStore.studentDetails[studentId]
  if (details) {
    return `${details.name} (${details.studentId})`
  }
  return `นักเรียน ${studentId}`
}

function getStudentAverage(studentId) {
  const perf = dashboardStore.studentPerformance[studentId]
  return perf?.averageScore?.toFixed(2) || '0.00'
}

function getStudentAssessmentCount(studentId) {
  const perf = dashboardStore.studentPerformance[studentId]
  return perf?.assessmentCount || 0
}

function getStudentPassedLOs(studentId) {
  const perf = dashboardStore.studentPerformance[studentId]
  return perf?.passedLOs || []
}

function viewStudentDetail(studentId) {
  // Navigate to student detail page
  router.push(`/student-detail/${studentId}`)
}

function formatDate(timestamp) {
  if (!timestamp) return 'ไม่ทราบ'
  
  let date
  if (timestamp.toDate) {
    date = timestamp.toDate()
  } else if (timestamp instanceof Date) {
    date = timestamp
  } else {
    date = new Date(timestamp)
  }
  
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(async () => {
  await loadCourses()
})
</script>

<style scoped>
.class-analytics {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;

  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.analytics-header {
  text-align: center;
  margin-bottom: 2rem;
}

.analytics-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.course-selector {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.course-selector label {
  font-weight: 600;
  color: var(--text-primary);
}

.course-selector select {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
}

.course-selector select option {
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 0.5rem;
}

.btn-refresh {
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-refresh:hover:not(:disabled) {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-state,
.error-state,
.no-data-state {
  text-align: center;
  padding: 4rem 2rem;
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

.error-state p {
  color: var(--danger-color);
  margin-bottom: 1rem;
}

.btn-retry,
.btn-generate {
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

/* Overview Cards */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.card-icon {
  font-size: 3rem;
}

.card-content h3 {
  font-size: 2rem;
  margin: 0;
  color: var(--text-primary);
}

.card-content p {
  margin: 0.25rem 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Section Styling */
.section {
  margin-bottom: 3rem;
  padding: 2rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

/* Rubric Bars */
.rubric-bars {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.rubric-bar-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rubric-label {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
}

.dimension-name {
  color: var(--text-primary);
}

.dimension-score {
  color: var(--primary-color);
}

.rubric-bar-track {
  height: 24px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  overflow: hidden;
}

.rubric-bar-fill {
  height: 100%;
  border-radius: 12px;
  transition: width 0.6s ease;
}

/* LO Mastery Grid */
.lo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
}

.lo-card {
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  transition: transform 0.3s;
}

.lo-card:hover {
  transform: scale(1.05);
}

.mastery-high {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.mastery-medium {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.mastery-low {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.lo-code {
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.lo-count {
  font-size: 1.5rem;
  font-weight: 600;
}

.lo-percentage {
  font-size: 0.9rem;
  opacity: 0.9;
}

.no-lo-data {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

/* Student Lists */
.student-lists {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 2rem;
}

.student-list h2 {
  margin-bottom: 1rem;
}

.student-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  margin-bottom: 1rem;
  background: var(--bg-tertiary);
  border-radius: 8px;
  transition: all 0.3s;
}

.student-card:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.student-info {
  flex: 1;
}

.student-name {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.student-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.stat {
  display: inline-block;
}

.btn-view {
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
}

.btn-view:hover {
  background: var(--primary-dark);
}

.no-students {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-style: italic;
}

/* Report Metadata */
.report-metadata {
  text-align: center;
  padding: 1.5rem;
  margin-top: 2rem;
  background: var(--bg-tertiary);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Responsive */
@media (max-width: 768px) {
  .class-analytics {
    padding: 1rem;
  }

  .analytics-header h1 {
    font-size: 1.8rem;
  }

  .course-selector {
    flex-direction: column;
    align-items: stretch;
  }

  .overview-cards {
    grid-template-columns: 1fr;
  }

  .student-lists {
    grid-template-columns: 1fr;
  }

  .lo-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
}
</style>
