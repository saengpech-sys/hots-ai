<template>
  <div class="teacher-worksheets-view">
    <!-- Top Navigation -->
    <nav class="top-navbar">
      <div class="nav-brand">
        <router-link to="/teacher" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <span class="brand-icon">📋</span>
        <span class="brand-text">จัดการใบงานอิเล็กทรอนิกส์</span>
      </div>
      <div class="nav-actions">
        <button class="btn btn-primary" @click="showCreateModal = true">
          <span class="material-icons">add</span>
          สร้างใบงานใหม่
        </button>
      </div>
    </nav>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
      <p>กำลังโหลดใบงาน...</p>
    </div>

    <!-- Content -->
    <div v-else class="worksheets-container">
      <!-- Stats Overview -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-icon">📝</span>
          <div class="stat-info">
            <span class="stat-value">{{ worksheets.length }}</span>
            <span class="stat-label">ใบงานทั้งหมด</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">✅</span>
          <div class="stat-info">
            <span class="stat-value">{{ publishedCount }}</span>
            <span class="stat-label">เผยแพร่แล้ว</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">📊</span>
          <div class="stat-info">
            <span class="stat-value">{{ totalSubmissions }}</span>
            <span class="stat-label">การส่งงานทั้งหมด</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">⭐</span>
          <div class="stat-info">
            <span class="stat-value">{{ averageScore }}%</span>
            <span class="stat-label">คะแนนเฉลี่ย</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-container">
        <button class="tab-btn" :class="{ active: activeTab === 'worksheets' }" @click="activeTab = 'worksheets'">
          📝 ใบงาน ({{ worksheets.length }})
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'rooms' }" @click="activeTab = 'rooms'; loadRooms()">
          🏫 ห้องกิจกรรม ({{ rooms.length }})
        </button>
      </div>

      <!-- Tab: Worksheets -->
      <div v-if="activeTab === 'worksheets'">
        <!-- Filters -->
        <div class="filter-row">
          <div class="search-box">
            <span class="material-icons">search</span>
            <input type="text" v-model="searchQuery" placeholder="ค้นหาใบงาน...">
          </div>
          <select v-model="filterStatus">
            <option value="">ทุกสถานะ</option>
            <option value="draft">ฉบับร่าง</option>
            <option value="published">เผยแพร่แล้ว</option>
          </select>
          <select v-model="filterCourse">
            <option value="">ทุกรายวิชา</option>
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.courseCode }} - {{ course.courseName }}
            </option>
          </select>
        </div>

        <!-- Worksheets Table -->
      <div class="worksheets-table" v-if="filteredWorksheets.length > 0">
        <table>
          <thead>
            <tr>
              <th>ชื่อใบงาน</th>
              <th>รายวิชา</th>
              <th>สถานะ</th>
              <th>ผู้ส่ง</th>
              <th>คะแนนเฉลี่ย</th>
              <th>สร้างเมื่อ</th>
              <th>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ws in filteredWorksheets" :key="ws.id">
              <td>
                <div class="ws-title-cell">
                  <strong>{{ ws.metadata?.title || 'ใบงาน' }}</strong>
                  <span class="ws-meta">
                    {{ ws.metadata?.totalQuestions || 0 }} คำถาม • {{ ws.metadata?.maxScore || 0 }} คะแนน
                  </span>
                  <div class="ws-arce-badges" v-if="ws.metadata?.arceFocus?.length">
                    <span v-for="arce in ws.metadata.arceFocus" :key="arce" :class="['arce-mini-badge', arce]">
                      {{ getArceIcon(arce) }} {{ arce.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                </div>
              </td>
              <td>{{ ws.courseName || '-' }}</td>
              <td>
                <span class="status-badge" :class="ws.status">
                  {{ getStatusLabel(ws.status) }}
                </span>
              </td>
              <td>{{ ws.stats?.totalSubmitted || 0 }}</td>
              <td>{{ ws.stats?.averageScore ? ws.stats.averageScore.toFixed(1) + '%' : '-' }}</td>
              <td>{{ formatDate(ws.createdAt) }}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn-icon" @click="previewWorksheet(ws)" title="ดูตัวอย่าง">
                    <span class="material-icons">visibility</span>
                  </button>
                  <button class="btn-icon" @click="editWorksheet(ws)" title="แก้ไข">
                    <span class="material-icons">edit</span>
                  </button>
                  <button class="btn-icon" @click="togglePublish(ws)" 
                          :title="ws.status === 'published' ? 'ซ่อน' : 'เผยแพร่'">
                    <span class="material-icons">{{ ws.status === 'published' ? 'unpublished' : 'publish' }}</span>
                  </button>
                  <button class="btn-icon" @click="viewReport(ws)" title="รายงาน">
                    <span class="material-icons">bar_chart</span>
                  </button>
                  <button class="btn-icon" @click="duplicateWorksheet(ws)" title="คัดลอก">
                    <span class="material-icons">content_copy</span>
                  </button>
                  <button class="btn-icon danger" @click="deleteWorksheet(ws)" title="ลบ">
                    <span class="material-icons">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State for Worksheets -->
      <div v-else class="empty-state">
        <span class="material-icons">assignment</span>
        <h3>ยังไม่มีใบงาน</h3>
        <p>เริ่มสร้างใบงานอิเล็กทรอนิกส์จากแผนการสอน</p>
        <button class="btn btn-primary" @click="showCreateModal = true">
          <span class="material-icons">add</span>
          สร้างใบงานใหม่
        </button>
      </div>
      </div>

      <!-- Tab: Rooms -->
      <div v-if="activeTab === 'rooms'">
        <div class="rooms-section">
          <div v-if="rooms.length > 0" class="rooms-grid">
            <div v-for="room in rooms" :key="room.id" class="room-card-manage">
              <div class="room-header">
                <span class="room-icon">🏫</span>
                <span class="room-status-badge" :class="room.status">
                  {{ room.status === 'published' ? 'เปิดให้เข้าถึง' : 'ฉบับร่าง' }}
                </span>
              </div>
              <h3>{{ room.name }}</h3>
              <p class="room-desc">{{ room.description || 'ไม่มีคำอธิบาย' }}</p>
              <div class="room-info">
                <span v-if="room.courseName">📚 {{ room.courseName }}</span>
                <span>📝 {{ room.worksheetIds?.length || 0 }} ใบงาน</span>
              </div>
              <div class="room-actions">
                <button class="btn btn-sm" :class="room.status === 'published' ? 'btn-outline' : 'btn-success'" 
                        @click="toggleRoomStatus(room)">
                  <span class="material-icons">{{ room.status === 'published' ? 'unpublished' : 'publish' }}</span>
                  {{ room.status === 'published' ? 'ซ่อนห้อง' : 'เผยแพร่ห้อง' }}
                </button>
                <button class="btn btn-sm btn-outline" @click="viewRoom(room.id)">
                  <span class="material-icons">visibility</span>
                  ดูห้อง
                </button>
                <button class="btn btn-sm btn-danger" @click="deleteRoom(room)">
                  <span class="material-icons">delete</span>
                </button>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <span class="material-icons">school</span>
            <h3>ยังไม่มีห้องกิจกรรม</h3>
            <p>ห้องกิจกรรมจะถูกสร้างเมื่อคุณสร้างใบงานและเลือก "สร้างห้องกิจกรรมพร้อมกัน"</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Worksheet Generator Modal -->
    <WorksheetGeneratorModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @generated="onWorksheetGenerated"
    />

    <!-- Preview Modal -->
    <div v-if="showPreview" class="modal-overlay" @click.self="showPreview = false">
      <div class="modal-content modal-xl">
        <div class="modal-header">
          <h2>👁️ ตัวอย่างใบงาน: {{ previewingWorksheet?.metadata?.title }}</h2>
          <button class="btn-close" @click="showPreview = false">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body preview-body">
          <div v-if="previewingWorksheet" class="worksheet-preview">
            <div class="preview-header">
              <h3>{{ previewingWorksheet.metadata?.title }}</h3>
              <p>{{ previewingWorksheet.metadata?.description }}</p>
              <div class="preview-meta">
                <span>⏱️ {{ previewingWorksheet.metadata?.duration || 50 }} นาที</span>
                <span>📝 {{ previewingWorksheet.metadata?.totalQuestions || 0 }} คำถาม</span>
                <span>⭐ {{ previewingWorksheet.metadata?.maxScore || 0 }} คะแนน</span>
              </div>
            </div>
            
            <div v-for="section in previewingWorksheet.sections" :key="section.phase" class="preview-section">
              <h4 class="section-phase">{{ getPhaseEmoji(section.phase) }} {{ getPhaseLabel(section.phase) }}</h4>
              <p class="section-intro">{{ section.introduction }}</p>
              
              <div v-for="(q, idx) in section.questions" :key="idx" class="preview-question">
                <div class="question-header">
                  <span class="q-number">{{ q.questionNumber || idx + 1 }}</span>
                  <span class="q-type">{{ getQuestionTypeLabel(q.type) }}</span>
                  <span class="q-score">{{ q.maxScore }} คะแนน</span>
                </div>
                <p class="q-text">{{ q.questionText }}</p>
                <div class="q-arce">
                  <span v-for="arce in q.arceFocus" :key="arce" :class="['arce-badge', arce]">
                    {{ getArceIcon(arce) }} {{ getArceLabel(arce) }}
                  </span>
                </div>
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
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import WorksheetGeneratorModal from '@/components/WorksheetGeneratorModal.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(true)
const worksheets = ref([])
const rooms = ref([])
const courses = ref([])
const searchQuery = ref('')
const filterStatus = ref('')
const filterCourse = ref('')
const activeTab = ref('worksheets')

// Modals
const showCreateModal = ref(false)
const showSelectPlan = ref(false)
const showPreview = ref(false)
const loadingPlans = ref(false)
const lessonPlans = ref([])
const selectedPlan = ref(null)
const generatingWorksheet = ref(false)
const previewingWorksheet = ref(null)

// Computed
const filteredWorksheets = computed(() => {
  let result = [...worksheets.value]
  
  if (filterStatus.value) {
    result = result.filter(ws => ws.status === filterStatus.value)
  }
  
  if (filterCourse.value) {
    // Support both top-level and metadata.courseId
    result = result.filter(ws => {
      const wsCourseid = ws.courseId || ws.metadata?.courseId
      return wsCourseid === filterCourse.value
    })
  }
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(ws => {
      const title = ws.title || ws.metadata?.title || ''
      const topic = ws.metadata?.topic || ''
      const courseName = ws.courseName || ws.metadata?.courseName || ''
      return title.toLowerCase().includes(q) ||
             topic.toLowerCase().includes(q) ||
             courseName.toLowerCase().includes(q)
    })
  }
  
  return result.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0)
    const dateB = b.createdAt?.toDate?.() || new Date(0)
    return dateB - dateA
  })
})

const publishedCount = computed(() => worksheets.value.filter(ws => ws.status === 'published').length)

const totalSubmissions = computed(() => worksheets.value.reduce((sum, ws) => sum + (ws.stats?.totalSubmitted || 0), 0))

const averageScore = computed(() => {
  const validScores = worksheets.value.filter(ws => ws.stats?.averageScore)
  if (validScores.length === 0) return 0
  const total = validScores.reduce((sum, ws) => sum + ws.stats.averageScore, 0)
  return Math.round(total / validScores.length)
})

// Methods
function getStatusLabel(status) {
  const labels = { draft: 'ฉบับร่าง', published: 'เผยแพร่แล้ว' }
  return labels[status] || status
}

function getArceIcon(arce) {
  const icons = { analysis: '🔍', reasoning: '🧠', creativity: '💡', evidence: '📚' }
  return icons[arce] || '📝'
}

function getArceLabel(arce) {
  const labels = { analysis: 'วิเคราะห์', reasoning: 'เหตุผล', creativity: 'สร้างสรรค์', evidence: 'หลักฐาน' }
  return labels[arce] || arce
}

function getPhaseEmoji(phase) {
  const emojis = {
    engagement: '🎯',
    exploration: '🔬',
    explanation: '📖',
    elaboration: '🚀',
    evaluation: '📊'
  }
  return emojis[phase] || '📝'
}

function getPhaseLabel(phase) {
  const labels = {
    engagement: 'Engagement (กระตุ้นความสนใจ)',
    exploration: 'Exploration (สำรวจ)',
    explanation: 'Explanation (อธิบาย)',
    elaboration: 'Elaboration (ขยายความ)',
    evaluation: 'Evaluation (ประเมิน)'
  }
  return labels[phase] || phase
}

function getQuestionTypeLabel(type) {
  const labels = {
    short_answer: 'คำตอบสั้น',
    long_answer: 'เรียงความ',
    multiple_choice: 'เลือกตอบ',
    diagram: 'วาดภาพ/แผนผัง'
  }
  return labels[type] || type
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getPlanTopic(plan) {
  return plan.topic || plan.content?.header?.topic || 'แผนการสอน'
}

function getPlanCourseName(plan) {
  return plan.courseName || plan.content?.header?.courseName || ''
}

function getPlanArceFocus(plan) {
  const focus = plan.arceFocus || plan.content?.header?.arceFocus
  return Array.isArray(focus) ? focus : focus ? [focus] : []
}

function hasExistingWorksheet(planId) {
  // Check if any worksheet is linked to this lesson plan
  return worksheets.value.some(ws => ws.lessonPlanId === planId)
}

function previewWorksheet(ws) {
  previewingWorksheet.value = ws
  showPreview.value = true
}

function editWorksheet(ws) {
  // Navigate to worksheet form editor
  router.push(`/teacher/worksheets/edit/${ws.id}`)
}

async function togglePublish(ws) {
  try {
    const newStatus = ws.status === 'published' ? 'draft' : 'published'
    await updateDoc(doc(db, 'eWorksheets', ws.id), {
      status: newStatus,
      updatedAt: serverTimestamp()
    })
    ws.status = newStatus
  } catch (error) {
    console.error('Error toggling publish:', error)
    alert('เกิดข้อผิดพลาด')
  }
}

function viewReport(ws) {
  router.push(`/teacher/worksheet-reports/${ws.id}`)
}

async function duplicateWorksheet(ws) {
  try {
    const newWs = {
      ...ws,
      metadata: {
        ...ws.metadata,
        title: ws.metadata?.title + ' (สำเนา)'
      },
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      stats: { totalSubmitted: 0, averageScore: null }
    }
    delete newWs.id
    
    const docRef = await addDoc(collection(db, 'eWorksheets'), newWs)
    worksheets.value.unshift({ id: docRef.id, ...newWs })
    alert('คัดลอกใบงานสำเร็จ')
  } catch (error) {
    console.error('Error duplicating worksheet:', error)
    alert('เกิดข้อผิดพลาดในการคัดลอก')
  }
}

async function deleteWorksheet(ws) {
  if (!confirm(`ต้องการลบใบงาน "${ws.metadata?.title}" ใช่ไหม?\nการลบจะไม่สามารถกู้คืนได้`)) return
  
  try {
    await deleteDoc(doc(db, 'eWorksheets', ws.id))
    worksheets.value = worksheets.value.filter(w => w.id !== ws.id)
    alert('ลบใบงานสำเร็จ')
  } catch (error) {
    console.error('Error deleting worksheet:', error)
    alert('เกิดข้อผิดพลาดในการลบ')
  }
}

function createFromLessonPlan() {
  showCreateModal.value = false
  showSelectPlan.value = true
  loadLessonPlans()
}

function createManual() {
  showCreateModal.value = false
  // TODO: Navigate to manual worksheet creator
  alert('ฟีเจอร์สร้างใบงานด้วยตนเองกำลังพัฒนา')
}

async function loadLessonPlans() {
  loadingPlans.value = true
  try {
    const q = query(
      collection(db, 'lessonPlans'),
      where('teacherId', '==', authStore.user?.uid)
    )
    const snapshot = await getDocs(q)
    lessonPlans.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Sort by unitNumber then planNumber (ascending)
    lessonPlans.value.sort((a, b) => {
      const unitA = a.unitNumber || a.content?.header?.unitNumber || 1
      const unitB = b.unitNumber || b.content?.header?.unitNumber || 1
      if (unitA !== unitB) return unitA - unitB
      
      const planA = a.planNumber || a.content?.header?.planNumber || 1
      const planB = b.planNumber || b.content?.header?.planNumber || 1
      return planA - planB
    })
  } catch (error) {
    console.error('Error loading lesson plans:', error)
  } finally {
    loadingPlans.value = false
  }
}

async function generateFromPlan() {
  if (!selectedPlan.value || generatingWorksheet.value) return
  
  generatingWorksheet.value = true
  try {
    const plan = selectedPlan.value
    const planContent = plan.content || plan
    const topic = plan.topic || planContent.header?.topic || 'ใบงาน'
    
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    const response = await fetch(`${functionsUrl}/generateElectronicWorksheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonPlanId: plan.id,
        teacherId: authStore.user?.uid,
        lessonPlan: plan,
        courseId: plan.courseId,
        courseCode: plan.courseCode || planContent.header?.courseCode,
        courseName: plan.courseName || planContent.header?.courseName,
        gradeLevel: plan.gradeLevel || planContent.header?.gradeLevel,
        unitNumber: plan.unitNumber || planContent.header?.unitNumber,
        unitName: plan.unitName || planContent.header?.unitName,
        planNumber: plan.planNumber || planContent.header?.planNumber,
        topic: topic,
        activities: planContent.activities,
        objectives: planContent.objectives,
        learningOutcomes: plan.targetLOs || planContent.header?.targetLOs,
        arceFocus: plan.arceFocus || planContent.header?.arceFocus,
        worksheetType: 'comprehensive',
        duration: plan.duration || planContent.header?.duration || 50,
        // Auto-create learning room
        roomName: `ห้องกิจกรรม: ${topic}`,
        roomDescription: `ใบงานออกแบบมาเพื่อให้นักเรียนได้วิเคราะห์${topic} ผ่านกิจกรรมต่างๆ ที่ส่งเสริมการคิดวิเคราะห์และการใช้หลักฐาน`
      })
    })

    const result = await response.json()
    
    if (result.success) {
      await loadWorksheets()
      await loadRooms() // Reload rooms as well
      showSelectPlan.value = false
      selectedPlan.value = null
      alert('สร้างใบงานและห้องกิจกรรมสำเร็จ!')
    } else {
      throw new Error(result.error || 'Failed to generate worksheet')
    }
  } catch (error) {
    console.error('Error generating worksheet:', error)
    alert('เกิดข้อผิดพลาดในการสร้างใบงาน: ' + error.message)
  } finally {
    generatingWorksheet.value = false
  }
}

// Handle worksheet generated from modal
async function onWorksheetGenerated(result) {
  showCreateModal.value = false
  await loadWorksheets()
  await loadRooms()
  
  alert(`✅ สร้างใบงานสำเร็จ!\n\nจำนวน ${result.totalQuestions || 'หลาย'} คำถาม\nคะแนนเต็ม ${result.maxScore || '-'} คะแนน`)
  
  // Navigate to room if created
  if (result.roomId) {
    if (confirm('ต้องการไปยังห้องกิจกรรมหรือไม่?')) {
      router.push(`/learning-room/${result.roomId}`)
    }
  }
}

async function loadWorksheets() {
  try {
    const userId = authStore.user?.uid
    if (!userId) {
      console.warn('No user ID available')
      return
    }
    
    // Query by top-level teacherId (new format)
    const q1 = query(
      collection(db, 'eWorksheets'),
      where('teacherId', '==', userId)
    )
    const snapshot1 = await getDocs(q1)
    
    // Also query by metadata.teacherId (old format - for backwards compatibility)
    const q2 = query(
      collection(db, 'eWorksheets'),
      where('metadata.teacherId', '==', userId)
    )
    const snapshot2 = await getDocs(q2)
    
    // Combine results and deduplicate by ID
    const worksheetMap = new Map()
    snapshot1.docs.forEach(doc => {
      worksheetMap.set(doc.id, { id: doc.id, ...doc.data() })
    })
    snapshot2.docs.forEach(doc => {
      if (!worksheetMap.has(doc.id)) {
        worksheetMap.set(doc.id, { id: doc.id, ...doc.data() })
      }
    })
    
    worksheets.value = Array.from(worksheetMap.values())
    
    // Extract unique courses
    const courseMap = new Map()
    worksheets.value.forEach(ws => {
      const courseId = ws.courseId || ws.metadata?.courseId
      const courseName = ws.courseName || ws.metadata?.courseName
      const courseCode = ws.courseCode || ws.metadata?.courseCode
      if (courseId && courseName) {
        courseMap.set(courseId, {
          id: courseId,
          courseCode: courseCode || '',
          courseName: courseName
        })
      }
    })
    courses.value = Array.from(courseMap.values())
  } catch (error) {
    console.error('Error loading worksheets:', error)
  }
}

async function loadRooms() {
  try {
    const userId = authStore.user?.uid
    if (!userId) return
    
    const q = query(
      collection(db, 'learningRooms'),
      where('teacherId', '==', userId)
    )
    const snapshot = await getDocs(q)
    rooms.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading rooms:', error)
  }
}

async function toggleRoomStatus(room) {
  try {
    const newStatus = room.status === 'published' ? 'draft' : 'published'
    await updateDoc(doc(db, 'learningRooms', room.id), {
      status: newStatus,
      updatedAt: serverTimestamp()
    })
    room.status = newStatus
    
    const msg = newStatus === 'published' 
      ? '✅ เผยแพร่ห้องกิจกรรมแล้ว นักเรียนสามารถเข้าถึงได้' 
      : '🔒 ซ่อนห้องกิจกรรมแล้ว นักเรียนจะไม่เห็นห้องนี้'
    alert(msg)
  } catch (error) {
    console.error('Error toggling room status:', error)
    alert('เกิดข้อผิดพลาด: ' + error.message)
  }
}

function viewRoom(roomId) {
  router.push(`/learning-room/${roomId}`)
}

async function deleteRoom(room) {
  const worksheetCount = room.worksheetIds?.length || 0
  const confirmMsg = worksheetCount > 0 
    ? `ต้องการลบห้องกิจกรรม "${room.name}" ใช่ไหม?\n\n⚠️ จะลบใบงาน ${worksheetCount} รายการในห้องนี้ด้วย!`
    : `ต้องการลบห้องกิจกรรม "${room.name}" ใช่ไหม?`
  
  if (!confirm(confirmMsg)) return
  
  try {
    // Delete all worksheets in the room first
    if (room.worksheetIds && room.worksheetIds.length > 0) {
      for (const wsId of room.worksheetIds) {
        await deleteDoc(doc(db, 'eWorksheets', wsId))
      }
      // Also remove from local state
      worksheets.value = worksheets.value.filter(ws => !room.worksheetIds.includes(ws.id))
    }
    
    // Then delete the room
    await deleteDoc(doc(db, 'learningRooms', room.id))
    rooms.value = rooms.value.filter(r => r.id !== room.id)
    
    alert(`ลบห้องกิจกรรมและใบงาน ${worksheetCount} รายการสำเร็จ`)
  } catch (error) {
    console.error('Error deleting room:', error)
    alert('เกิดข้อผิดพลาดในการลบ: ' + error.message)
  }
}

async function loadData() {
  try {
    loading.value = true
    await loadWorksheets()
    
    // Check if we should open create modal (from URL param)
    if (route.query.new) {
      showCreateModal.value = true
    }
  } catch (error) {
    console.error('Error loading data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.teacher-worksheets-view {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Navbar */
.top-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.back-link:hover {
  background: var(--bg-primary);
  color: var(--primary);
}

.brand-icon {
  font-size: 1.5rem;
}

.brand-text {
  font-size: 1rem;
  font-weight: 600;
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;
}

/* Container */
.worksheets-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid var(--border-color);
}

.stat-icon {
  font-size: 2rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Tabs */
.tabs-container {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 0;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -2px;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

/* Filter */
.filter-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  flex: 1;
  max-width: 300px;
}

.search-box .material-icons {
  color: var(--text-secondary);
  font-size: 1.25rem;
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  color: var(--text-primary);
  width: 100%;
}

.filter-row select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  outline: none;
}

/* Table */
.worksheets-table {
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.worksheets-table table {
  width: 100%;
  border-collapse: collapse;
}

.worksheets-table th,
.worksheets-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.worksheets-table th {
  background: var(--bg-primary);
  font-weight: 600;
  font-size: 0.875rem;
}

.worksheets-table tr:last-child td {
  border-bottom: none;
}

.ws-title-cell {
  display: flex;
  flex-direction: column;
}

.ws-title-cell strong {
  margin-bottom: 0.25rem;
}

.ws-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.ws-arce-badges {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.35rem;
}

.arce-mini-badge {
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
}

.arce-mini-badge.analysis {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1));
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.arce-mini-badge.reasoning {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.arce-mini-badge.creativity {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1));
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.arce-mini-badge.evidence {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1));
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.status-badge.draft {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.status-badge.published {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-primary);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--primary);
  color: white;
}

.btn-icon.danger:hover {
  background: #ef4444;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
}

.empty-state .material-icons {
  font-size: 4rem;
  opacity: 0.5;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.empty-state-inline {
  text-align: center;
  padding: 2rem;
}

/* Rooms Section */
.rooms-section {
  margin-top: 1rem;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.room-card-manage {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.room-card-manage:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.room-card-manage .room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.room-card-manage .room-icon {
  font-size: 1.5rem;
}

.room-status-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-weight: 500;
}

.room-status-badge.published {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.room-status-badge.draft {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.room-card-manage h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}

.room-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 1rem;
  line-height: 1.4;
}

.room-info {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.room-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
}

.btn-success {
  background: #10b981;
  color: white;
  border: none;
}

.btn-success:hover {
  background: #059669;
}

.btn-danger {
  background: transparent;
  color: var(--danger);
  border: 1px solid var(--danger);
}

.btn-danger:hover {
  background: var(--danger);
  color: white;
}

/* Modal */
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

.modal-content.modal-lg {
  max-width: 800px;
}

.modal-content.modal-xl {
  max-width: 1000px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
}

/* Create Options */
.create-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.option-card {
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.option-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.option-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 1rem;
}

.option-card h3 {
  margin-bottom: 0.5rem;
}

.option-card p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Plans List */
.plans-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.plan-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.plan-item:hover {
  border-color: var(--primary);
}

.plan-item.selected {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
}

.plan-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--bg-secondary);
}

.plan-item.disabled:hover {
  border-color: var(--border-color);
}

.plan-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.worksheet-exists-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  white-space: nowrap;
}

.plan-info h4 {
  margin: 0 0 0.25rem 0;
}

.plan-info p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.plan-arce {
  display: flex;
  gap: 0.25rem;
}

.arce-mini {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.arce-mini.analysis { background: rgba(59, 130, 246, 0.2); }
.arce-mini.reasoning { background: rgba(16, 185, 129, 0.2); }
.arce-mini.creativity { background: rgba(245, 158, 11, 0.2); }
.arce-mini.evidence { background: rgba(239, 68, 68, 0.2); }

.loading-inline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
}

/* Preview */
.preview-body {
  max-height: 60vh;
  overflow-y: auto;
}

.worksheet-preview {
  padding: 1rem;
}

.preview-header {
  text-align: center;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1.5rem;
}

.preview-header h3 {
  margin-bottom: 0.5rem;
}

.preview-header p {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.preview-meta {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.preview-section {
  margin-bottom: 2rem;
}

.section-phase {
  font-size: 1.125rem;
  margin-bottom: 0.5rem;
  color: var(--primary);
}

.section-intro {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1rem;
  padding-left: 1rem;
  border-left: 3px solid var(--border-color);
}

.preview-question {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.q-number {
  width: 28px;
  height: 28px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.q-type {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  color: var(--text-secondary);
}

.q-score {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--primary);
  font-weight: 600;
}

.q-text {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.q-arce {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.arce-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
}

.arce-badge.analysis { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.arce-badge.reasoning { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.arce-badge.creativity { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.arce-badge.evidence { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  text-decoration: none;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-outline {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-outline:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .worksheets-table {
    overflow-x: auto;
  }
}

@media (max-width: 768px) {
  .worksheets-container {
    padding: 1rem;
  }
  
  .stats-row {
    grid-template-columns: 1fr;
  }
  
  .filter-row {
    flex-direction: column;
  }
  
  .search-box {
    max-width: none;
  }
  
  .create-options {
    grid-template-columns: 1fr;
  }
}
</style>
