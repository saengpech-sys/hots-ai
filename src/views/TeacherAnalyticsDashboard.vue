<template>
  <div class="teacher-analytics">
    <!-- Animated Background Orbs -->
    <div class="orb-container">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <!-- Hero Header -->
    <div class="hero-header glass-panel">
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-icon">🎯</span>
          <span>AI Analytics Hub</span>
        </div>
        <h1 class="hero-title">
          <span class="gradient-text">แดชบอร์ดวิเคราะห์ข้อมูลนักเรียน</span>
        </h1>
        <p class="hero-subtitle">การคาดการณ์และข้อเสนอแนะเชิงลึกสำหรับการแทรกแซงการเรียนรู้</p>
      </div>
      <div class="header-actions">
        <select v-model="selectedCourse" class="glass-select" @change="loadAnalytics">
          <option value="">วิชาทั้งหมด</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.courseCode }} - {{ course.courseName }}
          </option>
        </select>
        <select v-model="selectedGrade" class="glass-select" @change="loadRoomsAndAnalytics">
          <option value="">ชั้นทั้งหมด</option>
          <option v-for="grade in availableGrades" :key="grade" :value="grade">
            {{ grade }}
          </option>
        </select>
        <select v-model="selectedRoom" class="glass-select" @change="filterStudents" :disabled="!selectedGrade">
          <option value="">ห้องทั้งหมด</option>
          <option v-for="room in availableRooms" :key="room" :value="room">
            ห้อง {{ room }}
          </option>
        </select>
        <select v-model="timeRange" class="glass-select" @change="loadAnalytics">
          <option value="7">7 วันที่ผ่านมา</option>
          <option value="14">14 วันที่ผ่านมา</option>
          <option value="30">30 วันที่ผ่านมา</option>
        </select>
        <button @click="exportReport" class="btn btn-glass">
          <span class="material-icons">download</span>
          ส่งออกรายงาน
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state glass-panel">
      <div class="loader-ring"></div>
      <p>กำลังโหลดข้อมูลการวิเคราะห์...</p>
    </div>

    <div v-else class="analytics-content">
      <!-- Risk Distribution Summary -->
      <div class="risk-summary glass-card">
        <h3 class="section-title"><span class="gradient-text">🚨 การกระจายระดับความเสี่ยงของนักเรียน</span></h3>
        <div class="risk-cards">
          <div class="risk-card critical" @click="filterByRisk('critical')">
            <div class="risk-glow"></div>
            <div class="risk-count">{{ riskDistribution.critical }}</div>
            <div class="risk-label">เสี่ยงวิกฤต</div>
            <div class="risk-desc">ต้องการแทรกแซงทันที</div>
          </div>
          <div class="risk-card high" @click="filterByRisk('high')">
            <div class="risk-glow"></div>
            <div class="risk-count">{{ riskDistribution.high }}</div>
            <div class="risk-label">เสี่ยงสูง</div>
            <div class="risk-desc">ต้องติดตามอย่างใกล้ชิด</div>
          </div>
          <div class="risk-card moderate" @click="filterByRisk('moderate')">
            <div class="risk-glow"></div>
            <div class="risk-count">{{ riskDistribution.moderate }}</div>
            <div class="risk-label">เสี่ยงปานกลาง</div>
            <div class="risk-desc">ติดตามเป็นระยะ</div>
          </div>
          <div class="risk-card low" @click="filterByRisk('low')">
            <div class="risk-glow"></div>
            <div class="risk-count">{{ riskDistribution.low }}</div>
            <div class="risk-label">เสี่ยงต่ำ</div>
            <div class="risk-desc">เรียนได้ดี</div>
          </div>
        </div>
      </div>

      <!-- Talent Discovery Summary -->
      <div class="risk-summary glass-card">
        <h3 class="section-title"><span class="gradient-text">🌟 การค้นพบพรสวรรค์ (Talent Discovery)</span></h3>
        <div class="risk-cards">
          <div class="risk-card talent-card research">
            <div class="risk-glow"></div>
            <div class="risk-count">{{ talentStats.research }}</div>
            <div class="risk-label">Research Track</div>
            <div class="risk-desc">นักวิจัยรุ่นเยาว์</div>
          </div>
          <div class="risk-card talent-card innovation">
            <div class="risk-glow"></div>
            <div class="risk-count">{{ talentStats.innovation }}</div>
            <div class="risk-label">Innovation Track</div>
            <div class="risk-desc">นวัตกรสร้างสรรค์</div>
          </div>
          <div class="risk-card talent-card total">
            <div class="risk-glow"></div>
            <div class="risk-count">{{ talentStats.total }}</div>
            <div class="risk-label">รวมนักเรียนเก่ง</div>
            <div class="risk-desc">มีศักยภาพสูง</div>
          </div>
        </div>
      </div>

      <!-- At-Risk Students List -->
      <div class="at-risk-students glass-card">
        <div class="card-header">
          <div>
            <h3 class="section-title"><span class="gradient-text">⚠️ นักเรียนที่ต้องเฝ้าระวัง</span> ({{ filteredStudents.length }} คน)</h3>
            <div v-if="selectedGrade || selectedRoom" class="filter-info">
              <span v-if="selectedGrade" class="filter-badge">📚 {{ selectedGrade }}</span>
              <span v-if="selectedRoom" class="filter-badge">🚪 ห้อง {{ selectedRoom }}</span>
            </div>
          </div>
          <button @click="refreshAnalytics" class="btn btn-glow btn-sm">🔄 รีเฟรช</button>
        </div>
        
        <div v-if="filteredStudents.length === 0" class="empty-state glass-panel">
          <div class="empty-icon">🎉</div>
          <p>{{ activeRiskFilter ? 'ไม่มีนักเรียนในกลุ่มเสี่ยงนี้' : 'ไม่มีนักเรียนที่ต้องเฝ้าระวัง!' }}</p>
        </div>

        <div v-else class="students-list">
          <div v-for="student in filteredStudents" :key="student.id" class="student-row glass-row">
            <div class="student-info">
              <div class="student-avatar" :class="`risk-${student.riskLevel}`">
                {{ student.studentId?.slice(-2) || '??' }}
              </div>
              <div class="student-details">
                <div class="student-name">{{ student.name || 'ไม่ระบุชื่อ' }}</div>
                <div class="student-meta">
                  รหัส: {{ student.studentId }} | 
                  ชั้น: {{ student.grade || 'ไม่ระบุ' }}
                  <span v-if="student.room"> | ห้อง: {{ student.room }}</span>
                  <span v-if="student.number"> | เลขที่: {{ student.number }}</span>
                </div>
              </div>
            </div>

            <div class="risk-info">
              <div class="risk-score" :class="`risk-${student.riskLevel}`">
                {{ student.riskScore }}
              </div>
              <div class="risk-badge" :class="`risk-${student.riskLevel}`">
                {{ student.riskLevel }}
              </div>
            </div>

            <div class="skill-gaps">
              <span v-for="gap in student.gaps?.slice(0, 3)" :key="gap.dimension" 
                    class="gap-badge" :class="`severity-${gap.severity}`">
                {{ gap.emoji }} {{ gap.dimension }}
              </span>
            </div>

            <div class="actions">
              <button @click="viewIntervention(student)" class="btn btn-glow btn-sm">
                📋 ดูแผน
              </button>
              <button @click="generateIntervention(student)" class="btn btn-glass btn-sm"
                      :disabled="generatingFor === student.id">
                {{ generatingFor === student.id ? '⏳' : '🤖' }} สร้างแผน
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Class Skill Gap Heatmap -->
      <div class="heatmap-container glass-card">
        <h3 class="section-title"><span class="gradient-text">🔥 แผนที่ความร้อนช่องว่างทักษะทั้งห้อง</span></h3>
        <p class="subtitle">สีเข้มขึ้น = นักเรียนที่มีปัญหาในมิตินี้มากขึ้น</p>
        
        <div class="heatmap">
          <div class="heatmap-row" v-for="dimension in dimensions" :key="dimension.key">
            <div class="dimension-label">
              {{ dimension.emoji }} {{ dimension.name }}
            </div>
            <div class="heatmap-cells">
              <div 
                v-for="severity in ['critical', 'high', 'moderate', 'low']" 
                :key="severity"
                class="heatmap-cell"
                :class="`cell-${severity}`"
                :style="{ opacity: getHeatmapIntensity(dimension.key, severity) }"
                :title="`${getHeatmapCount(dimension.key, severity)} students with ${severity} gap in ${dimension.name}`"
              >
                {{ getHeatmapCount(dimension.key, severity) }}
              </div>
            </div>
          </div>
          <div class="heatmap-legend">
            <span class="legend-item"><div class="legend-color cell-critical"></div> วิกฤต</span>
            <span class="legend-item"><div class="legend-color cell-high"></div> สูง</span>
            <span class="legend-item"><div class="legend-color cell-moderate"></div> ปานกลาง</span>
            <span class="legend-item"><div class="legend-color cell-low"></div> ต่ำ</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Intervention Plan Modal -->
    <div v-if="selectedStudentPlan" class="modal-overlay" @click.self="selectedStudentPlan = null">
      <div class="intervention-modal card">
        <div class="modal-header">
          <h3>📋 แผนการแทรกแซง: {{ selectedStudentPlan.studentName }}</h3>
          <button @click="selectedStudentPlan = null" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <div class="plan-priority" :class="`priority-${selectedStudentPlan.priority}`">
            ระดับความสำคัญ: {{ selectedStudentPlan.priority?.toUpperCase() }}
          </div>

          <div class="plan-section">
            <h4>🚨 การดำเนินการเร่งด่วน (วันนี้)</h4>
            <ul>
              <li v-for="(action, idx) in selectedStudentPlan.immediateActions" :key="idx">
                {{ action }}
              </li>
            </ul>
          </div>

          <div class="plan-section">
            <h4>📅 แผนระยะสั้น (สัปดาห์นี้)</h4>
            <ul>
              <li v-for="(action, idx) in selectedStudentPlan.shortTermPlan" :key="idx">
                {{ action }}
              </li>
            </ul>
          </div>

          <div class="plan-section">
            <h4>📆 แผนระยะยาว (เดือนนี้)</h4>
            <ul>
              <li v-for="(action, idx) in selectedStudentPlan.longTermPlan" :key="idx">
                {{ action }}
              </li>
            </ul>
          </div>

          <div v-if="selectedStudentPlan.recommendedResources?.length" class="plan-section">
            <h4>📚 แหล่งข้อมูลแนะนำ</h4>
            <div class="resources-list">
              <div v-for="(resource, idx) in selectedStudentPlan.recommendedResources" :key="idx" 
                   class="resource-card">
                <div class="resource-type">{{ resource.type }}</div>
                <div class="resource-title">{{ resource.title }}</div>
                <div class="resource-desc">{{ resource.description }}</div>
                <div class="resource-time">⏱️ {{ resource.estimatedTime }}</div>
              </div>
            </div>
          </div>

          <div class="plan-section">
            <h4>👨‍👩‍👦 การติดต่อผู้ปกครอง</h4>
            <div class="parent-message">
              {{ selectedStudentPlan.parentCommunication }}
            </div>
            <button @click="copyToClipboard(selectedStudentPlan.parentCommunication)" class="btn btn-sm btn-outline">
              📋 คัดลอกข้อความ
            </button>
          </div>

          <div class="plan-section">
            <h4>📊 แผนการติดตาม</h4>
            <p>{{ selectedStudentPlan.monitoringPlan }}</p>
          </div>

          <div class="plan-section">
            <h4>🎯 เกณฑ์ความสำเร็จ</h4>
            <ul>
              <li v-for="(criteria, idx) in selectedStudentPlan.successCriteria" :key="idx">
                {{ criteria }}
              </li>
            </ul>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="markAsImplemented(selectedStudentPlan)" class="btn btn-primary">
            ✅ ทำแล้ว
          </button>
          <button @click="selectedStudentPlan = null" class="btn btn-outline">
            ปิด
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const loading = ref(true)
const selectedCourse = ref('')
const selectedGrade = ref('')
const selectedRoom = ref('')
const timeRange = ref(30)
const courses = ref([])
const atRiskStudents = ref([])
const allStudentsData = ref([]) // Store all students before filtering
const activeRiskFilter = ref(null)
const selectedStudentPlan = ref(null)
const generatingFor = ref(null)

// Available grades and rooms
const availableGrades = ref([])
const availableRooms = ref([])

const dimensions = [
  { key: 'analysis', name: 'การวิเคราะห์', emoji: '🔍' },
  { key: 'reasoning', name: 'การให้เหตุผล', emoji: '🧠' },
  { key: 'creativity', name: 'ความคิดสร้างสรรค์', emoji: '💡' },
  { key: 'evidence', name: 'การใช้หลักฐาน', emoji: '📚' }
]

// Computed: Risk distribution
const riskDistribution = computed(() => {
  const dist = { critical: 0, high: 0, moderate: 0, low: 0, unknown: 0 }
  filteredStudentsByRoom.value.forEach(student => {
    const level = student.riskLevel || 'unknown'
    dist[level] = (dist[level] || 0) + 1
  })
  return dist
})

// Computed: Talent stats
const talentStats = computed(() => {
  const stats = { research: 0, innovation: 0, total: 0 }
  filteredStudentsByRoom.value.forEach(student => {
    if (student.talentTags) {
      if (student.talentTags.includes('research_track')) stats.research++
      if (student.talentTags.includes('innovation_track')) stats.innovation++
      if (student.talentTags.length > 0) stats.total++
    }
  })
  return stats
})

// Computed: Filter students by room
const filteredStudentsByRoom = computed(() => {
  let students = allStudentsData.value

  if (selectedGrade.value) {
    students = students.filter(s => s.grade === selectedGrade.value)
  }

  if (selectedRoom.value) {
    students = students.filter(s => s.room === selectedRoom.value)
  }

  return students
})

// Computed: Filtered students by risk level
const filteredStudents = computed(() => {
  let students = filteredStudentsByRoom.value

  if (!activeRiskFilter.value) {
    students = students.filter(s => s.riskLevel === 'critical' || s.riskLevel === 'high')
  } else {
    students = students.filter(s => s.riskLevel === activeRiskFilter.value)
  }

  return students
})

// Methods
async function loadAnalytics() {
  loading.value = true
  try {
    // 1. Load courses
    const coursesQuery = query(
      collection(db, 'courses'),
      where('teacherId', '==', authStore.user.uid)
    )
    const coursesSnapshot = await getDocs(coursesQuery)
    courses.value = coursesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // 2. Load risk predictions
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - timeRange.value)

    let riskQuery = query(
      collection(db, 'riskPredictions'),
      where('timestamp', '>=', daysAgo),
      orderBy('timestamp', 'desc')
    )

    if (selectedCourse.value) {
      riskQuery = query(riskQuery, where('courseId', '==', selectedCourse.value))
    }

    const riskSnapshot = await getDocs(riskQuery)
    
    // Group by student (keep latest prediction per student)
    const studentRiskMap = new Map()
    riskSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const studentId = data.studentId
      
      if (!studentRiskMap.has(studentId) || 
          data.timestamp.toDate() > studentRiskMap.get(studentId).timestamp.toDate()) {
        studentRiskMap.set(studentId, {
          id: doc.id,
          studentId,
          ...data
        })
      }
    })

    // 3. Load skill gap analyses for each student
    const studentsWithData = []
    for (const [studentId, riskData] of studentRiskMap.entries()) {
      // Get latest skill gap analysis
      const gapQuery = query(
        collection(db, 'skillGapAnalyses'),
        where('studentId', '==', studentId),
        orderBy('timestamp', 'desc'),
        limit(1)
      )
      const gapSnapshot = await getDocs(gapQuery)
      const gapData = gapSnapshot.empty ? null : gapSnapshot.docs[0].data()

      // Get student profile
      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', studentId), limit(1)))
      const userData = userDoc.empty ? {} : userDoc.docs[0].data()

      studentsWithData.push({
        id: studentId,
        studentId: userData.studentId || studentId,
        name: userData.displayName || userData.email || 'Unknown',
        grade: userData.grade,
        room: userData.room,
        section: userData.section,
        number: userData.number,
        riskScore: riskData.riskScore,
        riskLevel: riskData.riskLevel,
        riskFactors: riskData.riskFactors,
        gaps: gapData?.gaps || [],
        dimensionAvgs: riskData.metrics?.dimensionAvgs || {},
        talentTags: userData.talentTags || []
      })
    }

    allStudentsData.value = studentsWithData.sort((a, b) => b.riskScore - a.riskScore)
    
    // Extract unique grades and rooms
    extractGradesAndRooms()

  } catch (error) {
    console.error('Error loading analytics:', error)
    alert('เกิดข้อผิดพลาดในการโหลดข้อมูล')
  } finally {
    loading.value = false
  }
}

// Extract unique grades from all students
function extractGradesAndRooms() {
  const grades = new Set()
  
  allStudentsData.value.forEach(student => {
    if (student.grade) {
      grades.add(student.grade)
    }
  })
  
  availableGrades.value = Array.from(grades).sort()
  
  // Update rooms when grade changes
  updateAvailableRooms()
}

// Update available rooms based on selected grade
function updateAvailableRooms() {
  if (!selectedGrade.value) {
    availableRooms.value = []
    return
  }
  
  const rooms = new Set()
  allStudentsData.value
    .filter(s => s.grade === selectedGrade.value)
    .forEach(student => {
      if (student.room) {
        rooms.add(student.room)
      }
    })
  
  availableRooms.value = Array.from(rooms).sort()
}

// Load rooms and analytics when grade changes
function loadRoomsAndAnalytics() {
  selectedRoom.value = '' // Reset room selection
  updateAvailableRooms()
}

// Filter students (no need to reload, just filter)
function filterStudents() {
  // Filtering is handled by computed properties
}

function filterByRisk(level) {
  activeRiskFilter.value = activeRiskFilter.value === level ? null : level
}

function getHeatmapCount(dimension, severity) {
  return filteredStudentsByRoom.value.filter(student => 
    student.gaps.some(gap => gap.dimension === dimension && gap.severity === severity)
  ).length
}

function getHeatmapIntensity(dimension, severity) {
  const count = getHeatmapCount(dimension, severity)
  const maxCount = Math.max(...filteredStudentsByRoom.value.map(s => 
    s.gaps.filter(g => g.dimension === dimension).length
  ))
  return maxCount > 0 ? Math.max(0.2, count / maxCount) : 0.2
}

async function generateIntervention(student) {
  generatingFor.value = student.id
  try {
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'http://localhost:5001/hots-ai-chatloop/us-central1'
    const response = await fetch(`${functionsUrl}/generateInterventions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: student.id,
        courseId: selectedCourse.value || null
      })
    })

    const data = await response.json()
    
    if (data.success) {
      selectedStudentPlan.value = {
        ...data,
        studentId: student.id,
        studentName: student.name
      }
      alert('✅ สร้างแผนการแทรกแซงสำเร็จ!')
    } else {
      throw new Error(data.error || 'ไม่สามารถสร้างแผนได้')
    }
  } catch (error) {
    console.error('Generate intervention error:', error)
    alert('เกิดข้อผิดพลาด: ' + error.message)
  } finally {
    generatingFor.value = null
  }
}

async function viewIntervention(student) {
  try {
    // Load existing intervention plan
    const planQuery = query(
      collection(db, 'interventionPlans'),
      where('studentId', '==', student.id),
      orderBy('timestamp', 'desc'),
      limit(1)
    )
    const planSnapshot = await getDocs(planQuery)
    
    if (planSnapshot.empty) {
      alert('ยังไม่มีแผนการแทรกแซง กรุณากดปุ่ม "สร้างแผน" เพื่อสร้างใหม่')
      return
    }

    const planData = planSnapshot.docs[0].data()
    selectedStudentPlan.value = {
      id: planSnapshot.docs[0].id,
      ...planData,
      studentId: student.id,
      studentName: student.name
    }
  } catch (error) {
    console.error('View intervention error:', error)
    alert('เกิดข้อผิดพลาดในการโหลดแผน')
  }
}

async function markAsImplemented(plan) {
  try {
    if (!plan.id) {
      alert('ไม่สามารถทำเครื่องหมายได้: ไม่พบ ID ของแผน')
      return
    }

    await updateDoc(doc(db, 'interventionPlans', plan.id), {
      implemented: true,
      implementedAt: new Date(),
      implementedBy: authStore.user.uid
    })

    alert('✅ บันทึกการดำเนินการแล้ว!')
    selectedStudentPlan.value = null
  } catch (error) {
    console.error('Mark implemented error:', error)
    alert('เกิดข้อผิดพลาด')
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('📋 คัดลอกข้อความแล้ว!')
  })
}

async function refreshAnalytics() {
  await loadAnalytics()
  alert('🔄 รีเฟรชข้อมูลแล้ว!')
}

function exportReport() {
  const studentsToExport = filteredStudentsByRoom.value
  
  const csv = [
    ['Student ID', 'Name', 'Grade', 'Room', 'Risk Score', 'Risk Level', ...dimensions.map(d => d.name)],
    ...studentsToExport.map(s => [
      s.studentId,
      s.name,
      s.grade || '',
      s.room || '',
      s.riskScore,
      s.riskLevel,
      ...dimensions.map(d => s.dimensionAvgs[d.key]?.toFixed(2) || '0')
    ])
  ].map(row => row.join(',')).join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `teacher-analytics-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  loadAnalytics()
})
</script>

<style scoped>
.teacher-analytics {
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d1421 100%);
  position: relative;
  overflow: hidden;
}

/* Animated Orbs */
.orb-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 20s ease-in-out infinite;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  top: -200px;
  right: -200px;
}

.orb-2 {
  width: 500px;
  height: 500px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  bottom: -150px;
  left: -150px;
  animation-delay: -7s;
}

.orb-3 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -14s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(50px, -50px) scale(1.05); }
  50% { transform: translate(-30px, 30px) scale(0.95); }
  75% { transform: translate(-50px, -30px) scale(1.02); }
}

/* Hero Header */
.hero-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 2rem;
  padding: 2rem;
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 50px;
  font-size: 0.8rem;
  color: #a78bfa;
  margin-bottom: 1rem;
}

.badge-icon {
  font-size: 1rem;
}

.hero-title {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 800;
}

.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

/* Glass Components */
.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 20px;
}

.glass-card {
  position: relative;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 2rem;
  z-index: 1;
  transition: all 0.3s ease;
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.glass-select {
  padding: 0.75rem 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  min-width: 150px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.glass-select:hover:not(:disabled) {
  border-color: rgba(102, 126, 234, 0.5);
  background: rgba(0, 0, 0, 0.4);
}

.glass-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.glass-select option {
  background: #1a1a3e;
  color: #fff;
}

.glass-row {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  transition: all 0.3s ease;
}

.glass-row:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateX(5px);
}

/* Section Title */
.section-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 700;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  position: relative;
  z-index: 1;
}

.loader-ring {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  color: rgba(255, 255, 255, 0.6);
}

/* Analytics Content */
.analytics-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  position: relative;
  z-index: 1;
}

.risk-summary h3 {
  margin: 0 0 1.5rem 0;
}

/* Risk Cards with Glassmorphism */
.risk-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.risk-card {
  position: relative;
  padding: 2rem;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  overflow: hidden;
}

.risk-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.risk-card:hover {
  transform: translateY(-8px);
}

.risk-card:hover .risk-glow {
  opacity: 1;
}

.risk-card.critical {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.25));
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: white;
}

.risk-card.critical .risk-glow {
  box-shadow: 0 0 40px rgba(239, 68, 68, 0.5);
}

.risk-card.high {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.25));
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: white;
}

.risk-card.high .risk-glow {
  box-shadow: 0 0 40px rgba(245, 158, 11, 0.5);
}

.risk-card.moderate {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(202, 138, 4, 0.25));
  border: 1px solid rgba(234, 179, 8, 0.4);
  color: white;
}

.risk-card.moderate .risk-glow {
  box-shadow: 0 0 40px rgba(234, 179, 8, 0.5);
}

.risk-card.low {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.25));
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: white;
}

.risk-card.low .risk-glow {
  box-shadow: 0 0 40px rgba(16, 185, 129, 0.5);
}

.risk-count {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.risk-label {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.risk-desc {
  font-size: 0.85rem;
  opacity: 0.8;
}

/* At-Risk Students Card */
.at-risk-students {
  padding: 2rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.card-header h3 {
  margin: 0 0 0.5rem 0;
  color: white;
}

.filter-info {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.filter-info span {
  padding: 0.35rem 0.85rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
  border: 1px solid rgba(102, 126, 234, 0.3);
  color: #a78bfa;
  border-radius: 20px;
  font-weight: 500;
  font-size: 0.85rem;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state p {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.1rem;
}

/* Students List */
.students-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.student-row {
  display: grid;
  grid-template-columns: 2fr 1fr 2fr 1fr;
  gap: 1.5rem;
  align-items: center;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  transition: all 0.3s ease;
}

.student-row:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateX(5px);
}

.student-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.student-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  font-size: 1.1rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.student-avatar.risk-critical {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.student-avatar.risk-high {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.student-avatar.risk-moderate {
  background: linear-gradient(135deg, #eab308, #ca8a04);
}

.student-avatar.risk-low {
  background: linear-gradient(135deg, #10b981, #059669);
}

.student-name {
  font-weight: 600;
  color: white;
}

.student-meta {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

.risk-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.risk-score {
  font-size: 2rem;
  font-weight: 700;
}

.risk-score.risk-critical {
  color: #f87171;
}

.risk-score.risk-high {
  color: #fbbf24;
}

.risk-score.risk-moderate {
  color: #facc15;
}

.risk-score.risk-low {
  color: #34d399;
}

.risk-badge {
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: white;
}

.risk-badge.risk-critical {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.4));
  border: 1px solid rgba(239, 68, 68, 0.5);
}

.risk-badge.risk-high {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(217, 119, 6, 0.4));
  border: 1px solid rgba(245, 158, 11, 0.5);
}

.risk-badge.risk-moderate {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.3), rgba(202, 138, 4, 0.4));
  border: 1px solid rgba(234, 179, 8, 0.5);
}

.risk-badge.risk-low {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(5, 150, 105, 0.4));
  border: 1px solid rgba(16, 185, 129, 0.5);
}

.skill-gaps {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.gap-badge {
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.gap-badge.severity-critical {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.25));
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
}

.gap-badge.severity-high {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.25));
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fbbf24;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

/* Heatmap Container */
.heatmap-container {
  padding: 2rem;
}

.subtitle {
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 1.5rem;
}

.heatmap {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.heatmap-row {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1rem;
  align-items: center;
}

.dimension-label {
  font-weight: 600;
  color: white;
}

.heatmap-cells {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.heatmap-cell {
  padding: 1rem;
  border-radius: 12px;
  text-align: center;
  font-weight: 700;
  color: white;
  cursor: help;
  transition: all 0.3s ease;
}

.heatmap-cell:hover {
  transform: scale(1.05);
}

.heatmap-cell.cell-critical {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.6), rgba(220, 38, 38, 0.8));
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
}

.heatmap-cell.cell-high {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.6), rgba(217, 119, 6, 0.8));
  box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
}

.heatmap-cell.cell-moderate {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.6), rgba(202, 138, 4, 0.8));
  box-shadow: 0 4px 15px rgba(234, 179, 8, 0.3);
}

.heatmap-cell.cell-low {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.6), rgba(5, 150, 105, 0.8));
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.heatmap-legend {
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
}

.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 6px;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.95), rgba(20, 20, 40, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 2rem;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  width: 90%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  color: white;
  margin: 0;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 1.5rem;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
  color: #f87171;
}

.plan-priority {
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1.5rem;
  color: white;
}

.plan-priority.priority-critical {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.4));
  border: 1px solid rgba(239, 68, 68, 0.5);
}

.plan-priority.priority-high {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(217, 119, 6, 0.4));
  border: 1px solid rgba(245, 158, 11, 0.5);
}

.plan-priority.priority-moderate {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.3), rgba(202, 138, 4, 0.4));
  border: 1px solid rgba(234, 179, 8, 0.5);
}

.plan-priority.priority-low {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(5, 150, 105, 0.4));
  border: 1px solid rgba(16, 185, 129, 0.5);
}

.plan-section {
  margin-bottom: 1.5rem;
}

.plan-section h4 {
  margin: 0 0 0.75rem 0;
  color: white;
}

.plan-section ul {
  margin: 0;
  padding-left: 1.5rem;
}

.plan-section li {
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.8);
}

.resources-list {
  display: grid;
  gap: 1rem;
}

.resource-card {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.resource-type {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.3));
  border: 1px solid rgba(102, 126, 234, 0.4);
  color: #a78bfa;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.resource-title {
  font-weight: 600;
  color: white;
  margin-bottom: 0.25rem;
}

.resource-desc {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.resource-time {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.parent-message {
  padding: 1.25rem;
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-left: 4px solid #667eea;
  border-radius: 12px;
  margin-bottom: 1rem;
  white-space: pre-wrap;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
}

.modal-footer {
  display: flex;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Buttons */
.btn-glass {
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.btn-glass:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.25);
}

.btn-glow {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-glow:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.btn-glow:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Talent Cards */
.talent-card {
  position: relative;
  overflow: hidden;
}

.talent-card.research {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.25));
  border: 1px solid rgba(139, 92, 246, 0.4);
}

.talent-card.research .risk-glow {
  box-shadow: 0 0 40px rgba(139, 92, 246, 0.5);
}

.talent-card.research .risk-count {
  background: linear-gradient(135deg, #a78bfa, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.talent-card.innovation {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(236, 72, 153, 0.25));
  border: 1px solid rgba(236, 72, 153, 0.4);
}

.talent-card.innovation .risk-glow {
  box-shadow: 0 0 40px rgba(236, 72, 153, 0.5);
}

.talent-card.innovation .risk-count {
  background: linear-gradient(135deg, #f472b6, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.talent-card.total {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.25));
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.talent-card.total .risk-glow {
  box-shadow: 0 0 40px rgba(16, 185, 129, 0.5);
}

.talent-card.total .risk-count {
  background: linear-gradient(135deg, #34d399, #10b981);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Responsive */
@media (max-width: 1200px) {
  .student-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .glass-select {
    width: 100%;
  }
  
  .risk-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .risk-cards {
    grid-template-columns: 1fr;
  }
  
  .hero-header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  .filter-info {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .heatmap-row {
    grid-template-columns: 1fr;
  }
  
  .heatmap-cells {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
