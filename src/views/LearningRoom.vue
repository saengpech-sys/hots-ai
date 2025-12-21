<template>
  <div class="learning-room-view">
    <!-- Top Navigation -->
    <nav class="top-navbar">
      <div class="nav-brand">
        <router-link :to="backRoute" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <span class="brand-icon">🏫</span>
        <span class="brand-text">{{ room?.name || 'ห้องกิจกรรม' }}</span>
      </div>
      <div class="nav-actions">
        <div class="room-status" :class="room?.status">
          {{ getStatusLabel(room?.status) }}
        </div>
        <button v-if="isTeacher" class="btn btn-outline btn-sm" @click="editRoom">
          <span class="material-icons">edit</span>
          แก้ไข
        </button>
      </div>
    </nav>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
      <p>กำลังโหลดห้องกิจกรรม...</p>
    </div>

    <!-- Room Content -->
    <div v-else-if="room" class="room-container">
      <!-- Room Header -->
      <header class="room-header">
        <div class="room-meta">
          <h1>ห้องกิจกรรม: {{ room.name }}</h1>
          <p class="room-description">{{ room.description }}</p>
          <div class="room-tags">
            <span class="tag course-tag" v-if="room.courseCode">
              📚 {{ room.courseCode }}
            </span>
            <span class="tag topic-tag" v-if="room.topic && room.topic !== room.name">
              📖 {{ room.topic }}
            </span>
          </div>
        </div>
        <div class="room-stats" v-if="isTeacher">
          <div class="stat-item">
            <span class="stat-value">{{ worksheets.length }}</span>
            <span class="stat-label">ใบงาน</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ totalSubmissions }}</span>
            <span class="stat-label">ผู้ส่ง</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ averageScore }}%</span>
            <span class="stat-label">คะแนนเฉลี่ย</span>
          </div>
        </div>
      </header>

      <!-- Student View: Worksheet List -->
      <section v-if="!isTeacher" class="worksheets-section">
        <h2 class="section-title">📝 ใบงานในห้องกิจกรรมนี้</h2>
        
        <div v-if="worksheets.length === 0" class="empty-state">
          <span class="material-icons">assignment</span>
          <p>ยังไม่มีใบงานในห้องกิจกรรมนี้</p>
        </div>

        <div v-else class="worksheet-cards">
          <div v-for="(ws, index) in worksheets" :key="ws.id" class="worksheet-card" :class="['worksheet-color-' + (index % 6), { 'completed': getSubmissionStatus(ws.id) === 'graded' }]">
            <div class="worksheet-number-badge" :class="'badge-color-' + (index % 6)">
              ใบงาน {{ index + 1 }}
            </div>
            <div class="ws-header">
              <h3>{{ ws.metadata?.title || 'ใบงาน' }}</h3>
              <span class="ws-status" :class="getSubmissionStatus(ws.id)">
                {{ getSubmissionStatusLabel(ws.id) }}
              </span>
            </div>
            <p class="ws-description">{{ ws.metadata?.description }}</p>
            <div class="ws-info">
              <span><span class="material-icons">timer</span> {{ ws.metadata?.duration || 50 }} นาที</span>
              <span><span class="material-icons">quiz</span> {{ ws.metadata?.totalQuestions || 0 }} คำถาม</span>
              <span><span class="material-icons">stars</span> {{ ws.metadata?.maxScore || 0 }} คะแนน</span>
            </div>
            <div class="ws-arce" v-if="ws.metadata?.arceFocus">
              <span v-for="arce in ws.metadata.arceFocus" :key="arce" :class="['arce-badge', arce]">
                {{ getArceIcon(arce) }} {{ getArceLabel(arce) }}
              </span>
            </div>
            <div class="ws-actions">
              <button v-if="getSubmissionStatus(ws.id) === 'graded'" 
                      class="btn btn-outline" 
                      @click="viewResult(ws.id)">
                <span class="material-icons">visibility</span>
                ดูผลประเมิน
              </button>
              <button v-else 
                      class="btn btn-primary" 
                      @click="startWorksheet(ws.id)"
                      :disabled="ws.status !== 'published'">
                <span class="material-icons">{{ getSubmissionStatus(ws.id) === 'draft' ? 'edit' : 'play_arrow' }}</span>
                {{ getSubmissionStatus(ws.id) === 'draft' ? 'ทำต่อ' : 'เริ่มทำ' }}
              </button>
            </div>
            <!-- Show score if graded -->
            <div v-if="getSubmissionStatus(ws.id) === 'graded'" class="ws-score">
              <div class="score-circle" :class="getScoreClass(getSubmissionScore(ws.id))">
                {{ getSubmissionScore(ws.id) }}%
              </div>
              <span class="pa-level">{{ getSubmissionPaLevel(ws.id) }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Student View: Knowledge Sheets -->
      <section v-if="!isTeacher && knowledgeSheets.length > 0" class="knowledge-section">
        <h2 class="section-title">📖 ใบความรู้ประกอบการเรียน</h2>
        
        <div class="knowledge-cards">
          <div v-for="(ks, index) in knowledgeSheets" :key="ks.id" class="knowledge-card" :class="'knowledge-color-' + (index % 4)">
            <!-- Badge with lesson number -->
            <div class="ks-header-badge">
              <span class="ks-number">ใบความรู้ {{ index + 1 }}</span>
              <span v-if="ks.metadata?.planNumber" class="ks-plan-link">📝 ประกอบแผนที่ {{ ks.metadata.planNumber }}</span>
            </div>
            
            <h3>{{ ks.metadata?.title || ks.header?.topic || ks.metadata?.topic || 'ใบความรู้' }}</h3>
            <p class="ks-topic" v-if="ks.metadata?.topic">หัวข้อ: {{ ks.metadata.topic }}</p>
            <p class="ks-description">{{ ks.introduction?.overview || ks.header?.description || '' }}</p>
            
            <div class="ks-info">
              <span v-if="ks.sections?.length"><span class="material-icons">article</span> {{ ks.sections.length }} หัวข้อ</span>
              <span v-if="ks.vocabulary?.length"><span class="material-icons">translate</span> {{ ks.vocabulary.length }} คำศัพท์</span>
              <span v-if="ks.selfCheck?.questions?.length"><span class="material-icons">quiz</span> {{ ks.selfCheck.questions.length }} ข้อทดสอบ</span>
            </div>
            
            <router-link :to="`/knowledge-sheet/${ks.id}`" class="ks-read-btn">
              <span class="material-icons">menu_book</span>
              อ่านใบความรู้
              <span class="material-icons arrow">arrow_forward</span>
            </router-link>
          </div>
        </div>
      </section>

      <!-- Teacher View: Management -->
      <section v-if="isTeacher" class="teacher-section">
        <div class="teacher-actions">
          <button class="btn btn-primary" @click="showCreateWorksheet = true">
            <span class="material-icons">add</span>
            สร้างใบงานใหม่
          </button>
          <button class="btn btn-outline" @click="viewReports">
            <span class="material-icons">assessment</span>
            ดูรายงาน
          </button>
        </div>

        <h2 class="section-title">📋 ใบงานในห้องนี้</h2>
        
        <div class="worksheets-table" v-if="worksheets.length > 0">
          <table>
            <thead>
              <tr>
                <th>ชื่อใบงาน</th>
                <th>สถานะ</th>
                <th>ผู้ส่ง</th>
                <th>คะแนนเฉลี่ย</th>
                <th>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ws in worksheets" :key="ws.id">
                <td>
                  <div class="ws-title-cell">
                    <strong>{{ ws.metadata?.title || 'ใบงาน' }}</strong>
                    <span class="ws-meta">{{ ws.metadata?.totalQuestions || 0 }} คำถาม • {{ ws.metadata?.maxScore || 0 }} คะแนน</span>
                  </div>
                </td>
                <td>
                  <span class="status-badge" :class="ws.status">
                    {{ getStatusLabel(ws.status) }}
                  </span>
                </td>
                <td>{{ ws.stats?.totalSubmitted || 0 }}</td>
                <td>{{ ws.stats?.averageScore ? ws.stats.averageScore.toFixed(1) + '%' : '-' }}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon" @click="editWorksheet(ws.id)" title="แก้ไข">
                      <span class="material-icons">edit</span>
                    </button>
                    <button class="btn-icon" @click="togglePublish(ws)" :title="ws.status === 'published' ? 'ปิด' : 'เผยแพร่'">
                      <span class="material-icons">{{ ws.status === 'published' ? 'unpublished' : 'publish' }}</span>
                    </button>
                    <button class="btn-icon" @click="viewWorksheetReport(ws.id)" title="รายงาน">
                      <span class="material-icons">bar_chart</span>
                    </button>
                    <button class="btn-icon danger" @click="deleteWorksheet(ws.id)" title="ลบ">
                      <span class="material-icons">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="empty-state">
          <span class="material-icons">assignment</span>
          <p>ยังไม่มีใบงานในห้องนี้</p>
          <button class="btn btn-primary" @click="showCreateWorksheet = true">
            สร้างใบงานใหม่
          </button>
        </div>

        <!-- Teacher: Knowledge Sheets Section -->
        <div class="knowledge-section-teacher" v-if="knowledgeSheets.length > 0">
          <h2 class="section-title">📖 ใบความรู้ในห้องนี้ ({{ knowledgeSheets.length }})</h2>
          
          <div class="knowledge-table">
            <table>
              <thead>
                <tr>
                  <th>ชื่อใบความรู้</th>
                  <th>หัวข้อ</th>
                  <th>จำนวนเนื้อหา</th>
                  <th>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(ks, index) in knowledgeSheets" :key="ks.id">
                  <td>
                    <div class="ks-title-cell">
                      <span class="ks-number-mini">{{ index + 1 }}</span>
                      <strong>{{ ks.metadata?.title || ks.header?.topic || 'ใบความรู้' }}</strong>
                    </div>
                  </td>
                  <td>{{ ks.metadata?.topic || ks.header?.description || '-' }}</td>
                  <td>
                    <span v-if="ks.sections?.length">{{ ks.sections.length }} หัวข้อ</span>
                    <span v-if="ks.vocabulary?.length"> • {{ ks.vocabulary.length }} คำศัพท์</span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <router-link :to="`/knowledge-sheet/${ks.id}`" class="btn-icon" title="ดูใบความรู้">
                        <span class="material-icons">visibility</span>
                      </router-link>
                      <button class="btn-icon" @click="editKnowledgeSheet(ks.id)" title="แก้ไข">
                        <span class="material-icons">edit</span>
                      </button>
                      <button class="btn-icon danger" @click="deleteKnowledgeSheet(ks.id)" title="ลบ">
                        <span class="material-icons">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <!-- Not Found -->
    <div v-else class="error-container">
      <span class="material-icons">error_outline</span>
      <p>ไม่พบห้องกิจกรรมที่ต้องการ</p>
      <router-link :to="backRoute" class="btn btn-primary">กลับหน้าหลัก</router-link>
    </div>

    <!-- Worksheet Generator Modal -->
    <WorksheetGeneratorModal
      v-if="showCreateWorksheet"
      :existingRoomId="route.params.id"
      :existingRoomName="room?.name"
      :roomCourseId="room?.courseId"
      @close="showCreateWorksheet = false"
      @generated="onWorksheetGenerated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc, serverTimestamp, arrayRemove } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import WorksheetGeneratorModal from '@/components/WorksheetGeneratorModal.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL

// State
const loading = ref(true)
const room = ref(null)
const worksheets = ref([])
const knowledgeSheets = ref([])
const submissions = ref([])
const showCreateWorksheet = ref(false)
const lessonPlans = ref([])
const selectedPlan = ref(null)
const generatingWorksheet = ref(false)

// 🆕 Sequence Tracking
const sequenceId = ref(null)

// Computed
const isTeacher = computed(() => authStore.isTeacher)

const backRoute = computed(() => {
  if (room.value?.courseId) return `/courses`
  return isTeacher.value ? '/teacher' : '/student'
})

const totalSubmissions = computed(() => {
  return worksheets.value.reduce((sum, ws) => sum + (ws.stats?.totalSubmitted || 0), 0)
})

const averageScore = computed(() => {
  const validScores = worksheets.value.filter(ws => ws.stats?.averageScore)
  if (validScores.length === 0) return 0
  const total = validScores.reduce((sum, ws) => sum + ws.stats.averageScore, 0)
  return Math.round(total / validScores.length)
})

// Methods
function getStatusLabel(status) {
  const labels = {
    draft: 'ฉบับร่าง',
    published: 'เผยแพร่แล้ว',
    closed: 'ปิดแล้ว'
  }
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

function getSubmissionStatus(worksheetId) {
  const sub = submissions.value.find(s => s.worksheetId === worksheetId)
  return sub?.status || 'not_started'
}

function getSubmissionStatusLabel(worksheetId) {
  const status = getSubmissionStatus(worksheetId)
  const labels = {
    not_started: 'ยังไม่เริ่ม',
    draft: 'กำลังทำ',
    submitted: 'รอตรวจ',
    graded: 'ตรวจแล้ว'
  }
  return labels[status] || status
}

function getSubmissionScore(worksheetId) {
  const sub = submissions.value.find(s => s.worksheetId === worksheetId)
  return sub?.assessment?.summary?.percentage?.toFixed(0) || 0
}

function getSubmissionPaLevel(worksheetId) {
  const sub = submissions.value.find(s => s.worksheetId === worksheetId)
  return sub?.assessment?.summary?.paLevelText || ''
}

function getScoreClass(percentage) {
  const pct = parseFloat(percentage)
  if (pct >= 80) return 'excellent'
  if (pct >= 60) return 'good'
  if (pct >= 40) return 'fair'
  return 'poor'
}

function startWorksheet(worksheetId) {
  // 🆕 Log worksheet start event
  const ws = worksheets.value.find(w => w.id === worksheetId)
  logSequenceEvent('worksheet_started', {
    worksheetId,
    worksheetTitle: ws?.metadata?.title
  })
  
  router.push(`/worksheet/${worksheetId}?roomId=${route.params.id}`)
}

function viewResult(worksheetId) {
  const sub = submissions.value.find(s => s.worksheetId === worksheetId)
  if (sub) {
    // 🆕 Log result view event
    logSequenceEvent('result_viewed', {
      worksheetId,
      submissionId: sub.id
    })
    router.push(`/worksheet-result/${sub.id}`)
  }
}

function editRoom() {
  // TODO: Implement edit room modal
  alert('ฟีเจอร์แก้ไขห้องกิจกรรมกำลังพัฒนา')
}

function viewReports() {
  router.push(`/teacher/worksheet-reports/${route.params.id}`)
}

function editWorksheet(worksheetId) {
  router.push(`/teacher/worksheets?edit=${worksheetId}`)
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

function viewWorksheetReport(worksheetId) {
  router.push(`/teacher/worksheet-reports/${worksheetId}`)
}

async function deleteWorksheet(worksheetId) {
  if (!confirm('ต้องการลบใบงานนี้ใช่ไหม? การลบจะไม่สามารถกู้คืนได้')) return
  
  try {
    // ลบจาก eWorksheets
    await deleteDoc(doc(db, 'eWorksheets', worksheetId))
    
    // อัปเดต worksheetIds ใน room ปัจจุบัน
    const roomId = route.params.id
    if (roomId) {
      await updateDoc(doc(db, 'learningRooms', roomId), {
        worksheetIds: arrayRemove(worksheetId)
      })
    }
    
    // อัปเดต UI
    worksheets.value = worksheets.value.filter(ws => ws.id !== worksheetId)
    if (room.value?.worksheetIds) {
      room.value.worksheetIds = room.value.worksheetIds.filter(id => id !== worksheetId)
    }
  } catch (error) {
    console.error('Error deleting worksheet:', error)
    alert('เกิดข้อผิดพลาดในการลบ')
  }
}

// Knowledge Sheet functions
function editKnowledgeSheet(ksId) {
  router.push(`/knowledge-sheet/${ksId}?edit=true`)
}

async function deleteKnowledgeSheet(ksId) {
  if (!confirm('ต้องการลบใบความรู้นี้ใช่ไหม? การลบจะไม่สามารถกู้คืนได้')) return
  
  try {
    await deleteDoc(doc(db, 'knowledgeSheets', ksId))
    knowledgeSheets.value = knowledgeSheets.value.filter(ks => ks.id !== ksId)
  } catch (error) {
    console.error('Error deleting knowledge sheet:', error)
    alert('เกิดข้อผิดพลาดในการลบ')
  }
}

function createFromLessonPlan() {
  showCreateWorksheet.value = false
  showSelectPlan.value = true
  loadLessonPlans()
}

function createManual() {
  showCreateWorksheet.value = false
  router.push(`/teacher/worksheets?new=true&roomId=${route.params.id}`)
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
    
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    const response = await fetch(`${functionsUrl}/generateElectronicWorksheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonPlanId: plan.id,
        teacherId: authStore.user?.uid,
        lessonPlan: plan,
        courseId: room.value?.courseId || plan.courseId,
        courseCode: plan.courseCode || planContent.header?.courseCode,
        courseName: plan.courseName || planContent.header?.courseName,
        gradeLevel: plan.gradeLevel || planContent.header?.gradeLevel,
        unitNumber: plan.unitNumber || planContent.header?.unitNumber,
        unitName: plan.unitName || planContent.header?.unitName,
        planNumber: plan.planNumber || planContent.header?.planNumber,
        topic: plan.topic || planContent.header?.topic,
        activities: planContent.activities,
        objectives: planContent.objectives,
        learningOutcomes: plan.targetLOs || planContent.header?.targetLOs,
        arceFocus: plan.arceFocus || planContent.header?.arceFocus,
        worksheetType: 'comprehensive',
        duration: plan.duration || planContent.header?.duration || 50,
        roomName: room.value?.name
      })
    })

    const result = await response.json()
    
    if (result.success) {
      // Update room with new worksheet
      await updateDoc(doc(db, 'learningRooms', route.params.id), {
        worksheetIds: [...(room.value.worksheetIds || []), result.worksheetId],
        updatedAt: serverTimestamp()
      })
      
      // Reload worksheets
      await loadWorksheets()
      
      showSelectPlan.value = false
      selectedPlan.value = null
      alert('สร้างใบงานสำเร็จ!')
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

async function loadRoom() {
  try {
    loading.value = true
    const roomId = route.params.id
    
    const roomDoc = await getDoc(doc(db, 'learningRooms', roomId))
    if (roomDoc.exists()) {
      room.value = { id: roomDoc.id, ...roomDoc.data() }
      await loadWorksheets()
      await loadKnowledgeSheets()
      
      // Load submissions for student
      if (!isTeacher.value && authStore.user?.uid) {
        await loadSubmissions()
      }
    }
  } catch (error) {
    console.error('Error loading room:', error)
  } finally {
    loading.value = false
  }
}

// Handle worksheet generated from modal
async function onWorksheetGenerated(result) {
  showCreateWorksheet.value = false
  
  // Reload room to get updated worksheetIds
  await loadRoom()
  await loadWorksheets()
  
  alert(`✅ สร้างใบงานสำเร็จ!\n\nจำนวน ${result.totalQuestions || 'หลาย'} คำถาม\nคะแนนเต็ม ${result.maxScore || '-'} คะแนน`)
}

async function loadWorksheets() {
  if (!room.value?.worksheetIds?.length) {
    worksheets.value = []
    return
  }
  
  try {
    const worksheetPromises = room.value.worksheetIds.map(async (wsId) => {
      const wsDoc = await getDoc(doc(db, 'eWorksheets', wsId))
      if (wsDoc.exists()) {
        return { id: wsDoc.id, ...wsDoc.data() }
      }
      return null
    })
    
    const results = await Promise.all(worksheetPromises)
    worksheets.value = results.filter(Boolean)
  } catch (error) {
    console.error('Error loading worksheets:', error)
  }
}

async function loadKnowledgeSheets() {
  if (!room.value?.knowledgeSheetIds?.length) {
    knowledgeSheets.value = []
    return
  }
  
  // Helper to parse JSON strings back to objects
  const parseIfString = (val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val)
      } catch {
        return val
      }
    }
    return val
  }
  
  try {
    const ksPromises = room.value.knowledgeSheetIds.map(async (ksId, index) => {
      const ksDoc = await getDoc(doc(db, 'knowledgeSheets', ksId))
      if (ksDoc.exists()) {
        const data = ksDoc.data()
        return { 
          id: ksDoc.id, 
          ...data,
          // Parse stringified nested objects
          header: parseIfString(data.header),
          introduction: parseIfString(data.introduction),
          sections: parseIfString(data.sections) || [],
          vocabulary: parseIfString(data.vocabulary) || [],
          selfCheck: parseIfString(data.selfCheck),
          summary: parseIfString(data.summary),
          extension: parseIfString(data.extension),
          reflection: parseIfString(data.reflection),
          references: parseIfString(data.references),
          metadata: {
            ...(parseIfString(data.metadata) || {}),
            planNumber: index + 1 // Add plan number for display
          }
        }
      }
      return null
    })
    
    const results = await Promise.all(ksPromises)
    knowledgeSheets.value = results.filter(Boolean)
  } catch (error) {
    console.error('Error loading knowledge sheets:', error)
  }
}

async function loadSubmissions() {
  try {
    const q = query(
      collection(db, 'worksheetSubmissions'),
      where('studentId', '==', authStore.user?.uid)
    )
    const snapshot = await getDocs(q)
    submissions.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading submissions:', error)
  }
}

// 🆕 Sequence Tracking Functions
async function startSequenceTracking() {
  if (!authStore.user?.uid || isTeacher.value) return
  
  try {
    sequenceId.value = `ws_${Date.now()}_${authStore.user.uid.slice(-6)}`
    await logSequenceEvent('worksheet_room_enter', {
      roomId: route.params.id,
      roomName: room.value?.name
    })
  } catch (error) {
    console.warn('Sequence tracking start error:', error)
  }
}

async function logSequenceEvent(eventType, metadata = {}) {
  if (!sequenceId.value || !authStore.user?.uid) return
  
  try {
    await fetch(`${functionsUrl}/logSequenceEventAPI`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sequenceId: sequenceId.value,
        studentId: authStore.user.uid,
        eventType,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      })
    })
  } catch (error) {
    console.warn('Sequence log error:', error)
  }
}

async function finalizeSequenceTracking() {
  if (!sequenceId.value) return
  
  try {
    await fetch(`${functionsUrl}/finalizeSequenceAPI`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sequenceId: sequenceId.value,
        studentId: authStore.user?.uid,
        outcome: {
          worksheetsViewed: worksheets.value.length,
          submissionsCompleted: submissions.value.filter(s => s.status === 'graded').length
        }
      })
    })
  } catch (error) {
    console.warn('Sequence finalize error:', error)
  }
}

onMounted(async () => {
  await loadRoom()
  await startSequenceTracking()
})

onUnmounted(() => {
  finalizeSequenceTracking()
})
</script>

<style scoped>
.learning-room-view {
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

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.room-status {
  padding: 0.375rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.room-status.draft {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.room-status.published {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.room-status.closed {
  background: rgba(107, 114, 128, 0.15);
  color: #6b7280;
}

/* Loading & Error */
.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;
}

.error-container .material-icons {
  font-size: 4rem;
  color: var(--text-secondary);
}

/* Room Container */
.room-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Room Header */
.room-header {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.room-meta h1 {
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
}

.room-description {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.room-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.course-tag {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

.topic-tag {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.room-stats {
  display: flex;
  gap: 2rem;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Section */
.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

/* Worksheet Cards */
.worksheet-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.worksheet-card {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1.5rem;
  padding-top: 2.5rem;
  border: 2px solid var(--border-color);
  position: relative;
  transition: all 0.2s;
}

.worksheet-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.worksheet-card.completed {
  border-color: rgba(16, 185, 129, 0.5);
}

/* Worksheet Number Badge */
.worksheet-number-badge {
  position: absolute;
  top: -1px;
  left: -1px;
  padding: 0.35rem 1rem;
  border-radius: 16px 0 12px 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.badge-color-0 { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; }
.badge-color-1 { background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; }
.badge-color-2 { background: linear-gradient(135deg, #ec4899, #be185d); color: white; }
.badge-color-3 { background: linear-gradient(135deg, #10b981, #047857); color: white; }
.badge-color-4 { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
.badge-color-5 { background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; }

/* Worksheet Color Variants */
.worksheet-card.worksheet-color-0 { border-left: 4px solid #3b82f6; }
.worksheet-card.worksheet-color-1 { border-left: 4px solid #8b5cf6; }
.worksheet-card.worksheet-color-2 { border-left: 4px solid #ec4899; }
.worksheet-card.worksheet-color-3 { border-left: 4px solid #10b981; }
.worksheet-card.worksheet-color-4 { border-left: 4px solid #f59e0b; }
.worksheet-card.worksheet-color-5 { border-left: 4px solid #ef4444; }

.ws-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.ws-header h3 {
  font-size: 1.125rem;
  margin: 0;
}

.ws-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.ws-status.not_started {
  background: rgba(107, 114, 128, 0.15);
  color: #6b7280;
}

.ws-status.draft {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.ws-status.submitted {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.ws-status.graded {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.ws-description {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.ws-info {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.ws-info span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.ws-info .material-icons {
  font-size: 1rem;
}

.ws-arce {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.arce-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.arce-badge.analysis { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.arce-badge.reasoning { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.arce-badge.creativity { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.arce-badge.evidence { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

.ws-actions {
  display: flex;
  gap: 0.5rem;
}

.ws-score {
  position: absolute;
  top: 1rem;
  right: 1rem;
  text-align: center;
}

.score-circle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  border: 3px solid;
}

.score-circle.excellent { border-color: #10b981; color: #10b981; }
.score-circle.good { border-color: #3b82f6; color: #3b82f6; }
.score-circle.fair { border-color: #f59e0b; color: #f59e0b; }
.score-circle.poor { border-color: #ef4444; color: #ef4444; }

.pa-level {
  font-size: 0.65rem;
  color: var(--text-secondary);
}

/* Teacher Section */
.teacher-section {
  margin-top: 2rem;
}

.teacher-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

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

/* Knowledge Section Teacher */
.knowledge-section-teacher {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
}

.knowledge-table {
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.knowledge-table table {
  width: 100%;
  border-collapse: collapse;
}

.knowledge-table th,
.knowledge-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.knowledge-table th {
  background: var(--bg-primary);
  font-weight: 600;
  font-size: 0.875rem;
}

.ks-title-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.ks-number-mini {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.empty-state .material-icons {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
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
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
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
@media (max-width: 768px) {
  .room-container {
    padding: 1rem;
  }
  
  .room-header {
    flex-direction: column;
  }
  
  .room-stats {
    width: 100%;
    justify-content: space-around;
  }
  
  .worksheet-cards {
    grid-template-columns: 1fr;
  }
  
  .create-options {
    grid-template-columns: 1fr;
  }
  
  .teacher-actions {
    flex-direction: column;
  }
}

/* Knowledge Sheets Section */
.knowledge-section {
  margin-top: 2rem;
}

.knowledge-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.knowledge-card {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1.5rem;
  border: 2px solid var(--border-color);
  position: relative;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.knowledge-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgba(99, 102, 241, 0.5);
}

.knowledge-card.knowledge-color-0 { border-left: 5px solid #6366f1; }
.knowledge-card.knowledge-color-1 { border-left: 5px solid #10b981; }
.knowledge-card.knowledge-color-2 { border-left: 5px solid #f59e0b; }
.knowledge-card.knowledge-color-3 { border-left: 5px solid #ec4899; }

/* New header badge with plan link */
.ks-header-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.ks-number {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 24px;
  font-size: 0.875rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}

.ks-plan-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  padding: 0.375rem 0.75rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.knowledge-card h3 {
  font-size: 1.125rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-weight: 600;
}

.ks-topic {
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
  font-style: italic;
}

.ks-description {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex-grow: 1;
}

.ks-info {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  flex-wrap: wrap;
  background: var(--bg-tertiary, rgba(0, 0, 0, 0.1));
  padding: 0.75rem;
  border-radius: 8px;
}

.ks-info span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.ks-info .material-icons {
  font-size: 1rem;
  color: #6366f1;
}

/* Prominent read button */
.ks-read-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  color: #fff !important;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1rem;
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
  transition: all 0.2s ease;
  margin-top: auto;
}

.ks-read-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
  background: linear-gradient(135deg, #5855eb 0%, #7c4fe0 50%, #9740e0 100%);
}

.ks-read-btn .material-icons {
  font-size: 1.25rem;
}

.ks-read-btn .arrow {
  font-size: 1rem;
  margin-left: auto;
}

/* Dark mode adjustments */
.dark-mode .ks-plan-link {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.25);
}

.dark-mode .ks-info {
  background: rgba(255, 255, 255, 0.05);
}
</style>
