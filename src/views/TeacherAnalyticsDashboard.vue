<template>
  <div class="teacher-analytics">
    <div class="page-header">
      <div>
        <h1>🎯 แดชบอร์ดวิเคราะห์ข้อมูลนักเรียน</h1>
        <p>การคาดการณ์และข้อเสนอแนะเชิงลึกสำหรับการแทรกแซงการเรียนรู้</p>
      </div>
      <div class="header-actions">
        <select v-model="selectedCourse" class="course-select" @change="loadAnalytics">
          <option value="">วิชาทั้งหมด</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.courseCode }} - {{ course.courseName }}
          </option>
        </select>
        <select v-model="selectedGrade" class="grade-select" @change="loadRoomsAndAnalytics">
          <option value="">ชั้นทั้งหมด</option>
          <option v-for="grade in availableGrades" :key="grade" :value="grade">
            {{ grade }}
          </option>
        </select>
        <select v-model="selectedRoom" class="room-select" @change="filterStudents" :disabled="!selectedGrade">
          <option value="">ห้องทั้งหมด</option>
          <option v-for="room in availableRooms" :key="room" :value="room">
            ห้อง {{ room }}
          </option>
        </select>
        <select v-model="timeRange" class="time-select" @change="loadAnalytics">
          <option value="7">7 วันที่ผ่านมา</option>
          <option value="14">14 วันที่ผ่านมา</option>
          <option value="30">30 วันที่ผ่านมา</option>
        </select>
        <button @click="exportReport" class="btn btn-outline">
          📥 ส่งออกรายงาน
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูลการวิเคราะห์...</p>
    </div>

    <div v-else class="analytics-content">
      <!-- Risk Distribution Summary -->
      <div class="risk-summary card">
        <h3>🚨 การกระจายระดับความเสี่ยงของนักเรียน</h3>
        <div class="risk-cards">
          <div class="risk-card critical" @click="filterByRisk('critical')">
            <div class="risk-count">{{ riskDistribution.critical }}</div>
            <div class="risk-label">เสี่ยงวิกฤต</div>
            <div class="risk-desc">ต้องการแทรกแซงทันที</div>
          </div>
          <div class="risk-card high" @click="filterByRisk('high')">
            <div class="risk-count">{{ riskDistribution.high }}</div>
            <div class="risk-label">เสี่ยงสูง</div>
            <div class="risk-desc">ต้องติดตามอย่างใกล้ชิด</div>
          </div>
          <div class="risk-card moderate" @click="filterByRisk('moderate')">
            <div class="risk-count">{{ riskDistribution.moderate }}</div>
            <div class="risk-label">เสี่ยงปานกลาง</div>
            <div class="risk-desc">ติดตามเป็นระยะ</div>
          </div>
          <div class="risk-card low" @click="filterByRisk('low')">
            <div class="risk-count">{{ riskDistribution.low }}</div>
            <div class="risk-label">เสี่ยงต่ำ</div>
            <div class="risk-desc">เรียนได้ดี</div>
          </div>
        </div>
      </div>

      <!-- Talent Discovery Summary -->
      <div class="risk-summary card" style="margin-top: 20px;">
        <h3>🌟 การค้นพบพรสวรรค์ (Talent Discovery)</h3>
        <div class="risk-cards">
          <div class="risk-card talent-card research">
            <div class="risk-count">{{ talentStats.research }}</div>
            <div class="risk-label">Research Track</div>
            <div class="risk-desc">นักวิจัยรุ่นเยาว์</div>
          </div>
          <div class="risk-card talent-card innovation">
            <div class="risk-count">{{ talentStats.innovation }}</div>
            <div class="risk-label">Innovation Track</div>
            <div class="risk-desc">นวัตกรสร้างสรรค์</div>
          </div>
          <div class="risk-card talent-card total">
            <div class="risk-count">{{ talentStats.total }}</div>
            <div class="risk-label">รวมนักเรียนเก่ง</div>
            <div class="risk-desc">มีศักยภาพสูง</div>
          </div>
        </div>
      </div>

      <!-- At-Risk Students List -->
      <div class="at-risk-students card">
        <div class="card-header">
          <div>
            <h3>⚠️ นักเรียนที่ต้องเฝ้าระวัง ({{ filteredStudents.length }} คน)</h3>
            <div v-if="selectedGrade || selectedRoom" class="filter-info">
              <span v-if="selectedGrade">📚 {{ selectedGrade }}</span>
              <span v-if="selectedRoom">🚪 ห้อง {{ selectedRoom }}</span>
            </div>
          </div>
          <button @click="refreshAnalytics" class="btn btn-sm btn-outline">🔄 รีเฟรช</button>
        </div>
        
        <div v-if="filteredStudents.length === 0" class="empty-state">
          <p>{{ activeRiskFilter ? 'ไม่มีนักเรียนในกลุ่มเสี่ยงนี้' : 'ไม่มีนักเรียนที่ต้องเฝ้าระวัง! 🎉' }}</p>
        </div>

        <div v-else class="students-list">
          <div v-for="student in filteredStudents" :key="student.id" class="student-row">
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
              <button @click="viewIntervention(student)" class="btn btn-sm btn-primary">
                📋 ดูแผน
              </button>
              <button @click="generateIntervention(student)" class="btn btn-sm btn-outline"
                      :disabled="generatingFor === student.id">
                {{ generatingFor === student.id ? '⏳' : '🤖' }} สร้างแผน
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Class Skill Gap Heatmap -->
      <div class="heatmap-container card">
        <h3>🔥 แผนที่ความร้อนช่องว่างทักษะทั้งห้อง</h3>
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
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.page-header h1 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.page-header p {
  margin: 0;
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.course-select, 
.grade-select, 
.room-select, 
.time-select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-width: 150px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.course-select:hover,
.grade-select:hover,
.room-select:hover:not(:disabled),
.time-select:hover {
  border-color: var(--primary);
}

.room-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--bg-secondary);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.analytics-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.risk-summary {
  padding: 2rem;
}

.risk-summary h3 {
  margin: 0 0 1.5rem 0;
}

.risk-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.risk-card {
  padding: 1.5rem;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 2px solid transparent;
}

.risk-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.risk-card.critical {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.risk-card.high {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.risk-card.moderate {
  background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
  color: white;
}

.risk-card.low {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.risk-count {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.risk-label {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.risk-desc {
  font-size: 0.875rem;
  opacity: 0.9;
}

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
}

.filter-info {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.filter-info span {
  padding: 0.25rem 0.75rem;
  background: var(--primary);
  color: white;
  border-radius: 12px;
  font-weight: 500;
}

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
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
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
}

.student-avatar.risk-critical {
  background: #ef4444;
}

.student-avatar.risk-high {
  background: #f59e0b;
}

.student-avatar.risk-moderate {
  background: #eab308;
}

.student-avatar.risk-low {
  background: #10b981;
}

.student-name {
  font-weight: 600;
  color: var(--text-primary);
}

.student-meta {
  font-size: 0.875rem;
  color: var(--text-secondary);
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
  color: #ef4444;
}

.risk-score.risk-high {
  color: #f59e0b;
}

.risk-score.risk-moderate {
  color: #eab308;
}

.risk-score.risk-low {
  color: #10b981;
}

.risk-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: white;
}

.risk-badge.risk-critical {
  background: #ef4444;
}

.risk-badge.risk-high {
  background: #f59e0b;
}

.risk-badge.risk-moderate {
  background: #eab308;
}

.risk-badge.risk-low {
  background: #10b981;
}

.skill-gaps {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.gap-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
}

.gap-badge.severity-critical {
  background: #fee2e2;
  color: #dc2626;
}

.gap-badge.severity-high {
  background: #fed7aa;
  color: #d97706;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.heatmap-container {
  padding: 2rem;
}

.subtitle {
  color: var(--text-secondary);
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
}

.heatmap-cells {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.heatmap-cell {
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  font-weight: 700;
  color: white;
  cursor: help;
}

.heatmap-cell.cell-critical {
  background: #ef4444;
}

.heatmap-cell.cell-high {
  background: #f59e0b;
}

.heatmap-cell.cell-moderate {
  background: #eab308;
}

.heatmap-cell.cell-low {
  background: #10b981;
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
}

.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.plan-priority {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1.5rem;
  color: white;
}

.plan-priority.priority-critical {
  background: #ef4444;
}

.plan-priority.priority-high {
  background: #f59e0b;
}

.plan-priority.priority-moderate {
  background: #eab308;
}

.plan-priority.priority-low {
  background: #10b981;
}

.plan-section {
  margin-bottom: 1.5rem;
}

.plan-section h4 {
  margin: 0 0 0.75rem 0;
  color: var(--text-primary);
}

.plan-section ul {
  margin: 0;
  padding-left: 1.5rem;
}

.plan-section li {
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.resources-list {
  display: grid;
  gap: 1rem;
}

.resource-card {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.resource-type {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: var(--primary);
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.resource-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.resource-desc {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.resource-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.parent-message {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border-left: 4px solid var(--primary);
  margin-bottom: 1rem;
  white-space: pre-wrap;
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

@media (max-width: 1200px) {
  .student-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .course-select,
  .grade-select,
  .room-select,
  .time-select {
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
  
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .filter-info {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>

.talent-card {
  border-left-width: 4px;
  border-left-style: solid;
}

.talent-card.research {
  border-left-color: #8b5cf6;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
}

.talent-card.research .risk-count {
  color: #8b5cf6;
}

.talent-card.innovation {
  border-left-color: #ec4899;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%);
}

.talent-card.innovation .risk-count {
  color: #ec4899;
}

.talent-card.total {
  border-left-color: #10b981;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
}

.talent-card.total .risk-count {
  color: #10b981;
}
