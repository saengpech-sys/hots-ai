<template>
  <div class="portfolio-container">
    <!-- Header -->
    <div class="header-section">
      <button @click="$router.push('/teacher')" class="btn-back">← กลับ</button>
      <div class="header-content">
        <div class="header-left">
          <img :src="authStore.user?.photoURL || '/default-avatar.png'" class="teacher-avatar" />
          <div class="header-info">
            <h1>💼 Teacher Professional Portfolio</h1>
            <p>{{ authStore.user?.displayName || 'ครู' }}</p>
          </div>
        </div>
        <button @click="exportPortfolio" class="btn btn-primary" :disabled="exporting">
          {{ exporting ? 'กำลังสร้าง...' : '📄 Export Portfolio' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
      <p>กำลังโหลดข้อมูล Portfolio...</p>
    </div>

    <div v-else class="content-wrapper">
      <!-- Impact Summary Cards -->
      <div class="stats-grid">
        <div class="stat-card border-blue">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <p class="stat-label">นักเรียนทั้งหมด</p>
            <h3 class="stat-value">{{ stats.totalStudents }}</h3>
            <p class="stat-sub">ใน {{ stats.totalCourses }} รายวิชา</p>
          </div>
        </div>

        <div class="stat-card border-purple">
          <div class="stat-icon">🌟</div>
          <div class="stat-content">
            <p class="stat-label">Talent Track</p>
            <h3 class="stat-value">{{ stats.talentCount }}</h3>
            <p class="stat-sub text-green">{{ stats.talentPercentage }}% ของนักเรียน</p>
          </div>
        </div>

        <div class="stat-card border-green">
          <div class="stat-icon">📈</div>
          <div class="stat-content">
            <p class="stat-label">การประเมินทั้งหมด</p>
            <h3 class="stat-value">{{ stats.totalAssessments }}</h3>
            <p class="stat-sub">เฉลี่ย {{ stats.avgScore.toFixed(1) }}/20</p>
          </div>
        </div>

        <div class="stat-card border-amber">
          <div class="stat-icon">🎯</div>
          <div class="stat-content">
            <p class="stat-label">LO ที่นักเรียนผ่าน</p>
            <h3 class="stat-value">{{ stats.totalPassedLOs }}</h3>
            <p class="stat-sub">จาก {{ stats.totalLOs }} LO</p>
          </div>
        </div>
      </div>

      <div class="main-grid">
        <!-- Course Performance -->
        <div class="card course-section">
          <h3 class="section-title">
            <span class="title-icon">📚</span>
            ผลงานตามรายวิชา
          </h3>
          <div class="course-list">
            <div v-for="course in courses" :key="course.id" class="course-item">
              <div class="course-header">
                <span class="course-name">{{ course.code ? course.code + ' - ' : '' }}{{ course.name }}</span>
                <span class="course-badge">{{ course.studentCount }} นักเรียน</span>
              </div>
              <div class="course-stats">
                <div class="mini-stat">
                  <span class="mini-label">คำถาม</span>
                  <span class="mini-value">{{ course.questionCount }}</span>
                </div>
                <div class="mini-stat">
                  <span class="mini-label">แผนการสอน</span>
                  <span class="mini-value">{{ course.lessonPlanCount }}</span>
                </div>
                <div class="mini-stat">
                  <span class="mini-label">ใบงาน</span>
                  <span class="mini-value">{{ course.worksheetCount }}</span>
                </div>
                <div class="mini-stat">
                  <span class="mini-label">LO</span>
                  <span class="mini-value">{{ course.loCount }}</span>
                </div>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: course.completionRate + '%' }"></div>
              </div>
              <span class="completion-text">{{ course.completionRate }}% ความสมบูรณ์</span>
            </div>
            <div v-if="courses.length === 0" class="empty-message">
              ยังไม่มีรายวิชา
            </div>
          </div>
        </div>

        <!-- Teacher Badges -->
        <div class="card badges-section">
          <h3 class="section-title">
            <span class="title-icon">🏆</span>
            รางวัลและเกียรติบัตร
            <span class="earned-count" v-if="earnedBadges.length > 0">{{ earnedBadges.length }} / {{ allBadges.length }}</span>
          </h3>
          <div class="badges-grid">
            <div v-for="badge in earnedBadges" :key="badge.id" class="badge-card earned">
              <div class="badge-glow"></div>
              <div class="badge-icon earned-icon">{{ badge.icon }}</div>
              <h4 class="badge-name">{{ badge.name }}</h4>
              <p class="badge-criteria">{{ badge.criteria }}</p>
              <span class="badge-date">✅ ได้รับเมื่อ {{ formatDate(badge.earnedAt) }}</span>
            </div>
            <div v-for="badge in unearnedBadges" :key="badge.id" class="badge-card locked">
              <div class="badge-icon locked-icon">🔒</div>
              <h4 class="badge-name">{{ badge.name }}</h4>
              <p class="badge-criteria">{{ badge.criteria }}</p>
              <div class="badge-progress-bar">
                <div class="badge-progress-fill" :style="{ width: badge.progress + '%' }"></div>
              </div>
              <span class="badge-progress-text">{{ badge.currentValue || 0 }} / {{ badge.requirement }} ({{ badge.progress }}%)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- HOTS Dimension Analysis -->
      <div class="card dimension-section">
        <h3 class="section-title">
          <span class="title-icon">📊</span>
          ผลการประเมิน HOTS (A.R.C.E.)
        </h3>
        <div class="dimension-grid">
          <div v-for="dim in dimensionStats" :key="dim.key" class="dimension-card">
            <div class="dim-header">
              <span class="dim-icon">{{ dim.icon }}</span>
              <span class="dim-name">{{ dim.name }}</span>
            </div>
            <div class="dim-score">{{ dim.avgScore.toFixed(1) }}<span class="dim-max">/5</span></div>
            <div class="dim-bar">
              <div class="dim-fill" :style="{ width: (dim.avgScore / 5 * 100) + '%', background: dim.color }"></div>
            </div>
            <p class="dim-count">จาก {{ dim.count }} การประเมิน</p>
          </div>
        </div>
      </div>

      <!-- Top Students -->
      <div class="card students-section">
        <h3 class="section-title">
          <span class="title-icon">⭐</span>
          นักเรียนดีเด่น
          <span class="student-count" v-if="topStudents.length > 0">Top {{ topStudents.length }}</span>
        </h3>
        <div v-if="topStudents.length > 0" class="students-grid">
          <div v-for="(student, index) in topStudents" :key="student.id" class="student-card" :class="{ 'top-three': index < 3 }">
            <div class="student-rank" :class="getRankClass(index)">{{ index + 1 }}</div>
            <img v-if="student.photoURL" :src="student.photoURL" class="student-avatar-img" />
            <div v-else class="student-avatar">{{ student.name?.charAt(0) || '?' }}</div>
            <div class="student-info">
              <span class="student-id-badge">🎫 {{ student.studentId || '-' }}</span>
              <h4>{{ student.name || 'นักเรียน' }}</h4>
              <p class="student-course">📚 {{ student.courseName }}</p>
            </div>
            <div class="student-stats">
              <span class="student-score" :class="getScoreClass(student.avgScore)">
                {{ student.avgScore.toFixed(1) }}<span class="score-max">/20</span>
              </span>
              <span class="student-lo">🎯 {{ student.passedLOs }} LO</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-message">
          <span class="empty-icon">📭</span>
          <p>ยังไม่มีข้อมูลนักเรียน</p>
          <small>นักเรียนจะปรากฏเมื่อมีการประเมินคำตอบ</small>
        </div>
      </div>

      <!-- Activity Timeline -->
      <div class="card timeline-section">
        <h3 class="section-title">
          <span class="title-icon">📅</span>
          กิจกรรมล่าสุด
        </h3>
        <div class="timeline">
          <div v-for="activity in recentActivities" :key="activity.id" class="timeline-item">
            <div class="timeline-icon" :style="{ background: activity.color }">
              {{ activity.icon }}
            </div>
            <div class="timeline-content">
              <p class="timeline-text">{{ activity.text }}</p>
              <span class="timeline-date">{{ formatDate(activity.timestamp) }}</span>
            </div>
          </div>
          <div v-if="recentActivities.length === 0" class="empty-message">
            ยังไม่มีกิจกรรม
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
import { db } from '@/firebase/config'
import { 
  collection, query, where, getDocs, orderBy, limit 
} from 'firebase/firestore'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(true)
const exporting = ref(false)

// Data
const courses = ref([])
const stats = ref({
  totalStudents: 0,
  totalCourses: 0,
  talentCount: 0,
  talentPercentage: 0,
  totalAssessments: 0,
  avgScore: 0,
  totalPassedLOs: 0,
  totalLOs: 0
})
const dimensionStats = ref([])
const topStudents = ref([])
const recentActivities = ref([])
const teacherBadges = ref([])

// Badge definitions
const allBadges = [
  { id: 'first_course', name: 'สร้างรายวิชาแรก', icon: '📚', criteria: 'สร้างรายวิชาอย่างน้อย 1 วิชา', requirement: 1, field: 'courses' },
  { id: 'question_master', name: 'นักสร้างคำถาม', icon: '💡', criteria: 'สร้างคำถามครบ 50 ข้อ', requirement: 50, field: 'questions' },
  { id: 'lesson_expert', name: 'ผู้เชี่ยวชาญแผนการสอน', icon: '📝', criteria: 'สร้างแผนการสอนครบ 10 แผน', requirement: 10, field: 'lessonPlans' },
  { id: 'worksheet_pro', name: 'Pro ใบงาน', icon: '📋', criteria: 'สร้างใบงานครบ 20 ใบ', requirement: 20, field: 'worksheets' },
  { id: 'student_helper', name: 'ผู้ช่วยเหลือนักเรียน', icon: '🤝', criteria: 'นักเรียนผ่าน LO ครบ 100 รายการ', requirement: 100, field: 'passedLOs' },
  { id: 'hots_champion', name: 'HOTS Champion', icon: '🏆', criteria: 'นักเรียนได้คะแนนเฉลี่ย 16/20 ขึ้นไป', requirement: 16, field: 'avgScore' },
  { id: 'calibrator', name: 'Expert Calibrator', icon: '⚖️', criteria: 'ทำ Calibration ครบ 20 รายการ', requirement: 20, field: 'calibrations' },
  { id: 'community_star', name: 'ดาว PLC', icon: '⭐', criteria: 'แชร์เนื้อหาใน PLC ครบ 10 รายการ', requirement: 10, field: 'plcPosts' }
]

const earnedBadges = computed(() => teacherBadges.value.filter(b => b.earned))
const unearnedBadges = computed(() => teacherBadges.value.filter(b => !b.earned))

onMounted(async () => {
  await loadPortfolioData()
})

async function loadPortfolioData() {
  if (!authStore.user?.uid) {
    loading.value = false
    return
  }
  
  try {
    loading.value = true
    
    // Step 1: Load courses first
    await loadCourses()
    
    // Step 2: Load assessments (needs courses)
    await loadAssessments()
    
    // Step 3: Load badges (needs courses + stats from assessments)
    await loadBadges()
    
    // Step 4: Load activities (independent)
    await loadActivities()
    
  } catch (err) {
    console.error('Error loading portfolio:', err)
  } finally {
    loading.value = false
  }
}

async function loadCourses() {
  const teacherId = authStore.user.uid
  
  // Load courses
  const coursesSnap = await getDocs(query(
    collection(db, 'courses'),
    where('teacherId', '==', teacherId)
  ))
  
  const coursesList = []
  let totalStudents = new Set()
  let totalLOs = 0
  let totalPassedLOsUnique = new Set() // Track unique passed LOs across all students
  const studentProgressData = {} // Store student progress for later use
  
  for (const courseDoc of coursesSnap.docs) {
    const courseData = courseDoc.data()
    const courseId = courseDoc.id
    
    // Count questions
    const questionsSnap = await getDocs(query(
      collection(db, 'questions'),
      where('courseId', '==', courseId)
    ))
    
    // Count lesson plans
    const lpSnap = await getDocs(query(
      collection(db, 'lessonPlans'),
      where('courseId', '==', courseId)
    ))
    
    // Count worksheets
    const wsSnap = await getDocs(query(
      collection(db, 'eWorksheets'),
      where('courseId', '==', courseId)
    ))
    
    // Count students and their passed LOs from studentProgress
    const progressSnap = await getDocs(query(
      collection(db, 'studentProgress'),
      where('courseId', '==', courseId)
    ))
    
    let coursePassedLOCount = 0
    progressSnap.docs.forEach(doc => {
      const data = doc.data()
      if (data.studentId) {
        totalStudents.add(data.studentId)
        // Store progress data for later
        if (!studentProgressData[data.studentId]) {
          studentProgressData[data.studentId] = {
            passedLOs: [],
            courses: []
          }
        }
        // Add unique passed LOs
        if (data.passedLOs && Array.isArray(data.passedLOs)) {
          coursePassedLOCount += data.passedLOs.length
          data.passedLOs.forEach(lo => {
            totalPassedLOsUnique.add(`${courseId}_${lo}`)
            studentProgressData[data.studentId].passedLOs.push(lo)
          })
        }
        studentProgressData[data.studentId].courses.push({
          courseId,
          courseName: courseData.courseName || courseData.name || 'ไม่มีชื่อ'
        })
      }
    })
    
    const loCount = courseData.learningOutcomes?.length || 0
    totalLOs += loCount
    
    // Calculate completion rate
    const hasQuestions = questionsSnap.size > 0
    const hasLessons = lpSnap.size > 0
    const hasWorksheets = wsSnap.size > 0
    const hasLOs = loCount > 0
    const completionRate = Math.round(
      ((hasQuestions ? 25 : 0) + (hasLessons ? 25 : 0) + (hasWorksheets ? 25 : 0) + (hasLOs ? 25 : 0))
    )
    
    coursesList.push({
      id: courseId,
      name: courseData.courseName || courseData.name || courseData.title || 'ไม่มีชื่อ',
      code: courseData.courseCode || '',
      studentCount: progressSnap.size,
      questionCount: questionsSnap.size,
      lessonPlanCount: lpSnap.size,
      worksheetCount: wsSnap.size,
      loCount: loCount,
      passedLOCount: coursePassedLOCount,
      completionRate
    })
  }
  
  courses.value = coursesList
  stats.value.totalCourses = coursesList.length
  stats.value.totalStudents = totalStudents.size
  stats.value.totalLOs = totalLOs
  stats.value.totalPassedLOs = totalPassedLOsUnique.size // Use unique count
  
  // Store for later use in loadAssessments
  window._studentProgressData = studentProgressData
}

async function loadAssessments() {
  const teacherId = authStore.user.uid
  
  // Get all course IDs
  const courseIds = courses.value.map(c => c.id)
  if (courseIds.length === 0) return
  
  let allAssessments = []
  let dimTotals = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
  let dimCounts = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
  let studentScores = {}
  
  // First, load all unique student IDs from studentProgress and get their user data
  const studentUserData = {}
  const progressData = window._studentProgressData || {}
  const allStudentIds = Object.keys(progressData)
  
  // Load user data for students (batch query)
  if (allStudentIds.length > 0) {
    try {
      // Firebase allows max 10 in 'in' query, so batch
      for (let i = 0; i < allStudentIds.length; i += 10) {
        const batch = allStudentIds.slice(i, i + 10)
        const usersSnap = await getDocs(query(
          collection(db, 'users'),
          where('__name__', 'in', batch)
        ))
        usersSnap.docs.forEach(doc => {
          const userData = doc.data()
          studentUserData[doc.id] = {
            displayName: userData.displayName || userData.name || 'นักเรียน',
            studentId: userData.studentId || doc.id.slice(-5),
            email: userData.email || '',
            photoURL: userData.photoURL || ''
          }
        })
      }
    } catch (e) {
      console.error('Error loading user data:', e)
    }
  }
  
  // Load assessments for each course
  for (const courseId of courseIds) {
    try {
      const assessSnap = await getDocs(query(
        collection(db, 'assessments'),
        where('courseId', '==', courseId),
        orderBy('timestamp', 'desc'),
        limit(200)
      ))
      
      assessSnap.docs.forEach(doc => {
        const data = doc.data()
        allAssessments.push({ id: doc.id, ...data, courseId })
        
        // Calculate dimension averages
        if (data.rubricScores) {
          Object.keys(dimTotals).forEach(key => {
            if (data.rubricScores[key] !== undefined) {
              dimTotals[key] += data.rubricScores[key]
              dimCounts[key]++
            }
          })
        }
        
        // Track student scores
        const studentId = data.studentId || data.userId
        const totalScore = data.totalScore || 
          (data.rubricScores ? Object.values(data.rubricScores).reduce((a, b) => a + b, 0) : 0)
        
        if (studentId) {
          if (!studentScores[studentId]) {
            // Get student info from users collection (preferred) or denormalized data
            const userInfo = studentUserData[studentId] || {}
            const studentInfo = data.studentData || {}
            const progressInfo = progressData[studentId] || {}
            
            studentScores[studentId] = { 
              scores: [], 
              passedLOs: progressInfo.passedLOs?.length || 0, // Use from studentProgress
              name: userInfo.displayName || studentInfo.displayName || data.studentName || 'นักเรียน',
              studentId: userInfo.studentId || studentInfo.studentId || data.studentCode || studentId.slice(-5),
              photoURL: userInfo.photoURL || studentInfo.photoURL || '',
              courseId,
              courseName: courses.value.find(c => c.id === courseId)?.name || ''
            }
          }
          studentScores[studentId].scores.push(totalScore)
        }
      })
    } catch (err) {
      console.error('Error loading assessments for course:', courseId, err)
    }
  }
  
  // Calculate stats
  stats.value.totalAssessments = allAssessments.length
  // Note: totalPassedLOs is already set in loadCourses from studentProgress
  
  if (allAssessments.length > 0) {
    const totalScoreSum = allAssessments.reduce((sum, a) => {
      const score = a.totalScore || 
        (a.rubricScores ? Object.values(a.rubricScores).reduce((x, y) => x + y, 0) : 0)
      return sum + score
    }, 0)
    stats.value.avgScore = totalScoreSum / allAssessments.length
  }
  
  // Dimension stats
  dimensionStats.value = [
    { key: 'analysis', name: 'Analysis (วิเคราะห์)', icon: '🔍', color: '#667eea', avgScore: dimCounts.analysis > 0 ? dimTotals.analysis / dimCounts.analysis : 0, count: dimCounts.analysis },
    { key: 'reasoning', name: 'Reasoning (เหตุผล)', icon: '🧠', color: '#764ba2', avgScore: dimCounts.reasoning > 0 ? dimTotals.reasoning / dimCounts.reasoning : 0, count: dimCounts.reasoning },
    { key: 'creativity', name: 'Creativity (สร้างสรรค์)', icon: '💡', color: '#f59e0b', avgScore: dimCounts.creativity > 0 ? dimTotals.creativity / dimCounts.creativity : 0, count: dimCounts.creativity },
    { key: 'evidence', name: 'Evidence (หลักฐาน)', icon: '📊', color: '#10b981', avgScore: dimCounts.evidence > 0 ? dimTotals.evidence / dimCounts.evidence : 0, count: dimCounts.evidence }
  ]
  
  // Top students - with complete data
  const studentList = Object.entries(studentScores).map(([id, data]) => ({
    id,
    name: data.name,
    studentId: data.studentId,
    courseName: data.courseName,
    avgScore: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0,
    passedLOs: data.passedLOs
  }))
  
  topStudents.value = studentList
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10)
  
  // Talent count (students with avgScore >= 16)
  stats.value.talentCount = studentList.filter(s => s.avgScore >= 16).length
  stats.value.talentPercentage = stats.value.totalStudents > 0 
    ? Math.round(stats.value.talentCount / stats.value.totalStudents * 100) 
    : 0
}

async function loadBadges() {
  const teacherId = authStore.user.uid
  
  // Calculate badge progress
  const badgeData = {
    courses: courses.value.length,
    questions: 0,
    lessonPlans: 0,
    worksheets: 0,
    passedLOs: stats.value.totalPassedLOs,
    avgScore: stats.value.avgScore,
    calibrations: 0,
    plcPosts: 0
  }
  
  // Count totals
  courses.value.forEach(c => {
    badgeData.questions += c.questionCount
    badgeData.lessonPlans += c.lessonPlanCount
    badgeData.worksheets += c.worksheetCount
  })
  
  // Count calibrations
  try {
    const calSnap = await getDocs(query(
      collection(db, 'calibrations'),
      where('expertId', '==', teacherId)
    ))
    badgeData.calibrations = calSnap.size
  } catch (e) {}
  
  // Count PLC posts
  try {
    const plcSnap = await getDocs(query(
      collection(db, 'communityPosts'),
      where('authorId', '==', teacherId)
    ))
    badgeData.plcPosts = plcSnap.size
  } catch (e) {}
  
  // Evaluate badges
  teacherBadges.value = allBadges.map(badge => {
    const currentValue = badgeData[badge.field] || 0
    const earned = currentValue >= badge.requirement
    const progress = Math.min(100, Math.round(currentValue / badge.requirement * 100))
    
    return {
      ...badge,
      earned,
      progress,
      currentValue,
      earnedAt: earned ? new Date() : null // In real app, track actual earn date
    }
  })
}

async function loadActivities() {
  const teacherId = authStore.user.uid
  const activities = []
  
  // Recent lesson plans
  try {
    const lpSnap = await getDocs(query(
      collection(db, 'lessonPlans'),
      where('teacherId', '==', teacherId),
      orderBy('createdAt', 'desc'),
      limit(5)
    ))
    lpSnap.docs.forEach(doc => {
      const data = doc.data()
      activities.push({
        id: 'lp-' + doc.id,
        icon: '📝',
        text: `สร้างแผนการสอน "${data.title || 'ไม่มีชื่อ'}"`,
        timestamp: data.createdAt,
        color: '#667eea'
      })
    })
  } catch (e) {}
  
  // Recent questions
  try {
    const qSnap = await getDocs(query(
      collection(db, 'questions'),
      where('createdBy', '==', teacherId),
      orderBy('createdAt', 'desc'),
      limit(5)
    ))
    qSnap.docs.forEach(doc => {
      const data = doc.data()
      activities.push({
        id: 'q-' + doc.id,
        icon: '💡',
        text: `สร้างคำถาม HOTS ใหม่`,
        timestamp: data.createdAt,
        color: '#f59e0b'
      })
    })
  } catch (e) {}
  
  // Recent worksheets
  try {
    const wsSnap = await getDocs(query(
      collection(db, 'eWorksheets'),
      where('teacherId', '==', teacherId),
      orderBy('createdAt', 'desc'),
      limit(5)
    ))
    wsSnap.docs.forEach(doc => {
      const data = doc.data()
      activities.push({
        id: 'ws-' + doc.id,
        icon: '📋',
        text: `สร้างใบงาน "${data.title || 'ไม่มีชื่อ'}"`,
        timestamp: data.createdAt,
        color: '#10b981'
      })
    })
  } catch (e) {}
  
  // Sort by timestamp
  activities.sort((a, b) => {
    const timeA = a.timestamp?.toDate?.() || a.timestamp || new Date(0)
    const timeB = b.timestamp?.toDate?.() || b.timestamp || new Date(0)
    return timeB - timeA
  })
  
  recentActivities.value = activities.slice(0, 10)
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric'
  }).format(date)
}

function getRankClass(index) {
  if (index === 0) return 'gold'
  if (index === 1) return 'silver'
  if (index === 2) return 'bronze'
  return ''
}

function getScoreClass(score) {
  if (score >= 16) return 'excellent'
  if (score >= 12) return 'good'
  if (score >= 8) return 'fair'
  return 'needs-improvement'
}

async function exportPortfolio() {
  exporting.value = true
  
  try {
    // Create simple text report for now
    const report = `
===========================================
TEACHER PORTFOLIO REPORT
${authStore.user?.displayName || 'ครู'}
Generated: ${new Date().toLocaleDateString('th-TH')}
===========================================

📊 สถิติภาพรวม
- นักเรียนทั้งหมด: ${stats.value.totalStudents} คน
- จำนวนรายวิชา: ${stats.value.totalCourses} วิชา
- Talent Track: ${stats.value.talentCount} คน (${stats.value.talentPercentage}%)
- การประเมินทั้งหมด: ${stats.value.totalAssessments} ครั้ง
- คะแนนเฉลี่ย: ${stats.value.avgScore.toFixed(1)}/20
- LO ที่ผ่าน: ${stats.value.totalPassedLOs} รายการ

📚 รายวิชา
${courses.value.map(c => `- ${c.name}: ${c.studentCount} นักเรียน, ${c.questionCount} คำถาม`).join('\n')}

🏆 รางวัลที่ได้รับ
${earnedBadges.value.map(b => `- ${b.icon} ${b.name}`).join('\n') || '- ยังไม่มี'}

📊 ผล HOTS
${dimensionStats.value.map(d => `- ${d.name}: ${d.avgScore.toFixed(1)}/5`).join('\n')}
    `
    
    // Download as text file
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Teacher_Portfolio_${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
    
  } catch (err) {
    console.error('Error exporting:', err)
    alert('เกิดข้อผิดพลาดในการ Export')
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.portfolio-container {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.header-section {
  margin-bottom: 2rem;
}

.btn-back {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.teacher-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 3px solid #667eea;
}

.header-info h1 {
  margin: 0;
  font-size: 1.75rem;
  color: var(--text-primary);
}

.header-info p {
  margin: 0.25rem 0 0 0;
  color: var(--text-secondary);
}

.loading-container {
  text-align: center;
  padding: 3rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-card.border-blue { border-left: 4px solid #3b82f6; }
.stat-card.border-purple { border-left: 4px solid #8b5cf6; }
.stat-card.border-green { border-left: 4px solid #10b981; }
.stat-card.border-amber { border-left: 4px solid #f59e0b; }

.stat-icon {
  font-size: 2rem;
}

.stat-label {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.stat-value {
  margin: 0.25rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-sub {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.stat-sub.text-green {
  color: #10b981;
}

/* Main Grid */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.card {
  background: var(--card-bg);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  padding: 1.5rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.5rem 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.title-icon {
  font-size: 1.25rem;
}

/* Course List */
.course-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.course-item {
  background: var(--bg-tertiary);
  padding: 1rem;
  border-radius: 12px;
}

.course-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.course-name {
  font-weight: 600;
  color: var(--text-primary);
}

.course-badge {
  background: #667eea;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  font-size: 0.75rem;
}

.course-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.mini-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mini-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.mini-value {
  font-weight: 700;
  color: var(--text-primary);
}

.progress-bar {
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 3px;
}

.completion-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Badges */
.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.badge-card {
  background: var(--bg-tertiary);
  padding: 1.25rem 1rem;
  border-radius: 16px;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.badge-card.earned {
  border: 2px solid #f59e0b;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(234, 88, 12, 0.15) 100%);
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3);
  animation: badgePulse 2s ease-in-out infinite;
}

.badge-card.earned:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 30px rgba(245, 158, 11, 0.4);
}

.badge-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%);
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%) rotate(45deg); }
  100% { transform: translateX(100%) rotate(45deg); }
}

@keyframes badgePulse {
  0%, 100% { box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3); }
  50% { box-shadow: 0 4px 30px rgba(245, 158, 11, 0.5); }
}

.badge-card.locked {
  opacity: 0.7;
  border: 1px dashed var(--border-color);
}

.badge-card.locked:hover {
  opacity: 0.85;
  border-color: var(--text-secondary);
}

.badge-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  display: block;
}

.badge-icon.earned-icon {
  filter: drop-shadow(0 4px 8px rgba(245, 158, 11, 0.5));
}

.badge-icon.locked-icon {
  filter: grayscale(0.5);
}

.badge-name {
  margin: 0 0 0.5rem 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.badge-criteria {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.badge-date {
  font-size: 0.75rem;
  color: #10b981;
  font-weight: 600;
  display: block;
  margin-top: 0.75rem;
}

.badge-progress-bar {
  width: 100%;
  height: 6px;
  background: var(--bg-primary);
  border-radius: 3px;
  margin-top: 0.75rem;
  overflow: hidden;
}

.badge-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.badge-progress-text {
  font-size: 0.7rem;
  color: var(--text-secondary);
  display: block;
  margin-top: 0.5rem;
}

.earned-count {
  background: linear-gradient(135deg, #f59e0b, #ea580c);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 700;
  margin-left: 0.75rem;
}

/* Dimension Section */
.dimension-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.dimension-card {
  background: var(--bg-tertiary);
  padding: 1rem;
  border-radius: 12px;
  text-align: center;
}

.dim-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.dim-icon {
  font-size: 1.25rem;
}

.dim-name {
  font-size: 0.85rem;
  color: var(--text-primary);
}

.dim-score {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
}

.dim-max {
  font-size: 1rem;
  color: var(--text-secondary);
}

.dim-bar {
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin: 0.5rem 0;
}

.dim-fill {
  height: 100%;
  border-radius: 4px;
}

.dim-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Students Section */
.students-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.student-count {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.5rem;
}

.student-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--bg-tertiary);
  padding: 1rem 1.25rem;
  border-radius: 16px;
  position: relative;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.student-card:hover {
  transform: translateX(4px);
  border-color: var(--border-color);
}

.student-card.top-three {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-color: rgba(102, 126, 234, 0.3);
}

.student-rank {
  position: absolute;
  top: -8px;
  left: -8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.student-rank.gold {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border-color: #f59e0b;
  color: white;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
}

.student-rank.silver {
  background: linear-gradient(135deg, #d1d5db, #9ca3af);
  border-color: #9ca3af;
  color: white;
  box-shadow: 0 2px 8px rgba(156, 163, 175, 0.4);
}

.student-rank.bronze {
  background: linear-gradient(135deg, #d97706, #b45309);
  border-color: #b45309;
  color: white;
  box-shadow: 0 2px 8px rgba(180, 83, 9, 0.4);
}

.student-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.student-avatar-img {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid var(--border-color);
}

.student-info {
  flex: 1;
  min-width: 0;
}

.student-id-badge {
  display: inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  font-family: monospace;
  margin-bottom: 0.3rem;
}

.student-info h4 {
  margin: 0.25rem 0;
  font-size: 1rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.student-course {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.student-stats {
  text-align: right;
  flex-shrink: 0;
}

.student-score {
  display: block;
  font-weight: 700;
  font-size: 1.1rem;
  color: #10b981;
}

.student-score .score-max {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-secondary);
}

.student-score.excellent { color: #10b981; }
.student-score.good { color: #3b82f6; }
.student-score.fair { color: #f59e0b; }
.student-score.needs-improvement { color: #ef4444; }

.student-lo {
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.empty-message {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.5rem;
}

.empty-message p {
  margin: 0.5rem 0;
  font-size: 1rem;
}

.empty-message small {
  opacity: 0.7;
}

/* Timeline */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.timeline-item {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.timeline-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.timeline-content {
  flex: 1;
}

.timeline-text {
  margin: 0;
  color: var(--text-primary);
}

.timeline-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.empty-message {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

/* Responsive */
@media (max-width: 900px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
  
  .dimension-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .dimension-grid {
    grid-template-columns: 1fr;
  }
}
</style>
