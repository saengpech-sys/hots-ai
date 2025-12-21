<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content worksheet-generator-modal">
      <div class="modal-header">
        <h2>🆕 สร้างใบงานอิเล็กทรอนิกส์</h2>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-icons">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Step indicator -->
        <div class="step-indicator">
          <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
            <span class="step-number">1</span>
            <span class="step-label">เลือกแผน</span>
          </div>
          <div class="step-line" :class="{ completed: currentStep > 1 }"></div>
          <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
            <span class="step-number">2</span>
            <span class="step-label">ตั้งค่าใบงาน</span>
          </div>
          <div class="step-line" :class="{ completed: currentStep > 2 }"></div>
          <div class="step" :class="{ active: currentStep === 3 }">
            <span class="step-number">3</span>
            <span class="step-label">ยืนยัน</span>
          </div>
        </div>

        <!-- Step 1: Select Lesson Plan -->
        <div v-if="currentStep === 1" class="step-content">
          <h3>📚 เลือกแผนการสอน</h3>
          
          <!-- If plan is pre-selected (from LessonPlanDetail) -->
          <div v-if="preSelectedPlan" class="preselected-plan">
            <!-- Warning if already has worksheet -->
            <div v-if="preSelectedPlanHasWorksheet" class="existing-worksheet-warning">
              <span class="material-icons">warning</span>
              <div class="warning-content">
                <strong>แผนนี้มีใบงานอยู่แล้ว!</strong>
                <p>กรุณาลบใบงานเดิมก่อนจึงจะสร้างใบงานใหม่ได้</p>
                <p class="existing-title">ใบงานที่มี: "{{ getExistingWorksheet(preSelectedPlan.id)?.metadata?.title || 'ไม่ระบุชื่อ' }}"</p>
              </div>
            </div>

            <div class="plan-preview-card selected" :class="{ 'has-worksheet': preSelectedPlanHasWorksheet }">
              <div class="plan-badges">
                <span class="unit-badge">หน่วยที่ {{ preSelectedPlan.unitNumber || 1 }}</span>
                <span class="plan-badge">แผนที่ {{ preSelectedPlan.planNumber || 1 }}</span>
                <span v-if="preSelectedPlanHasWorksheet" class="worksheet-exists-badge">มีใบงานแล้ว</span>
              </div>
              <h4>{{ preSelectedPlan.topic || preSelectedPlan.title }}</h4>
              <p class="course-name">📚 {{ preSelectedPlan.courseName || 'ไม่ระบุวิชา' }}</p>
              <div class="plan-meta">
                <span>⏱️ {{ preSelectedPlan.duration || 50 }} นาที</span>
                <span>🎓 {{ preSelectedPlan.gradeLevel || 'ม.4' }}</span>
              </div>
            </div>
          </div>

          <!-- Plan selection for TeacherWorksheets/LearningRoom -->
          <div v-else class="plan-selection">
            <!-- Filter by course -->
            <div class="filter-section" v-if="!roomCourseId">
              <label>กรองตามรายวิชา:</label>
              <select v-model="filterCourseId" class="form-control">
                <option value="">ทั้งหมด</option>
                <option v-for="course in courses" :key="course.id" :value="course.id">
                  {{ course.courseCode }} - {{ course.courseName || course.name }}
                </option>
              </select>
            </div>

            <div v-if="loadingPlans" class="loading-plans">
              <span class="material-icons spin">sync</span>
              กำลังโหลดแผนการสอน...
            </div>

            <div v-else-if="filteredPlans.length === 0" class="no-plans">
              <span class="material-icons">info</span>
              <p>ไม่พบแผนการสอน {{ roomCourseId ? 'สำหรับรายวิชานี้' : '' }}</p>
            </div>

            <div v-else class="plans-list">
              <div 
                v-for="plan in filteredPlans" 
                :key="plan.id"
                class="plan-preview-card"
                :class="{ 
                  selected: selectedPlan?.id === plan.id,
                  'has-worksheet': hasWorksheetForPlan(plan.id),
                  disabled: hasWorksheetForPlan(plan.id)
                }"
                @click="selectPlan(plan)"
              >
                <div class="plan-badges">
                  <span class="unit-badge">หน่วยที่ {{ plan.unitNumber || plan.header?.unitNumber || 1 }}</span>
                  <span class="plan-badge">แผนที่ {{ plan.planNumber || plan.header?.planNumber || 1 }}</span>
                  <span v-if="hasWorksheetForPlan(plan.id)" class="worksheet-exists-badge">มีใบงานแล้ว</span>
                </div>
                <h4>{{ plan.topic || plan.title }}</h4>
                <p class="course-name">📚 {{ plan.courseName || plan.courseCode || 'ไม่ระบุวิชา' }}</p>
                <div class="plan-meta">
                  <span>⏱️ {{ plan.duration || 50 }} นาที</span>
                  <span>🎓 {{ plan.gradeLevel || 'ม.4' }}</span>
                </div>
                <!-- Show existing worksheet info -->
                <div v-if="hasWorksheetForPlan(plan.id)" class="existing-worksheet-info">
                  <span class="material-icons">description</span>
                  {{ getExistingWorksheet(plan.id)?.metadata?.title || 'ใบงานที่สร้างแล้ว' }}
                </div>
                <div class="selection-indicator" v-if="selectedPlan?.id === plan.id">
                  <span class="material-icons">check_circle</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Worksheet Options -->
        <div v-if="currentStep === 2" class="step-content">
          <h3>⚙️ ตั้งค่าใบงาน</h3>
          
          <div class="options-grid">
            <!-- Worksheet Type -->
            <div class="option-group full-width">
              <label>ประเภทใบงาน</label>
              <div class="type-options">
                <div 
                  class="type-card"
                  :class="{ selected: options.worksheetType === 'comprehensive' }"
                  @click="options.worksheetType = 'comprehensive'"
                >
                  <span class="type-icon">📝</span>
                  <strong>ครบทุกมิติ A.R.C.E.</strong>
                  <small>รวมทั้ง Analysis, Reasoning, Creativity, Evidence</small>
                </div>
                <div 
                  class="type-card"
                  :class="{ selected: options.worksheetType === 'analysis' }"
                  @click="options.worksheetType = 'analysis'"
                >
                  <span class="type-icon">🔍</span>
                  <strong>เน้นการวิเคราะห์</strong>
                  <small>Focus on Analysis dimension</small>
                </div>
                <div 
                  class="type-card"
                  :class="{ selected: options.worksheetType === 'creativity' }"
                  @click="options.worksheetType = 'creativity'"
                >
                  <span class="type-icon">💡</span>
                  <strong>เน้นความคิดสร้างสรรค์</strong>
                  <small>Focus on Creativity dimension</small>
                </div>
                <div 
                  class="type-card"
                  :class="{ selected: options.worksheetType === 'quick' }"
                  @click="options.worksheetType = 'quick'"
                >
                  <span class="type-icon">⚡</span>
                  <strong>ใบงานด่วน</strong>
                  <small>คำถามสั้น ทำเสร็จเร็ว</small>
                </div>
                <div 
                  class="type-card arce-evaluate-card"
                  :class="{ selected: options.worksheetType === 'arce_evaluate' }"
                  @click="options.worksheetType = 'arce_evaluate'"
                >
                  <span class="type-icon">🎯</span>
                  <strong>ใบงานวัดผล ARCE</strong>
                  <small>ขั้น Evaluate: Situation-Task-Expected</small>
                </div>
              </div>
            </div>

            <!-- ARCE Evaluate Notice -->
            <div v-if="options.worksheetType === 'arce_evaluate'" class="arce-evaluate-notice">
              <span class="material-icons">info</span>
              <div>
                <strong>📋 รูปแบบใบงานวัดผล ARCE</strong>
                <p>สร้างจากข้อมูลขั้น Evaluate ในแผนการสอน มีโครงสร้าง:</p>
                <ul>
                  <li><strong>Situation:</strong> สถานการณ์ปัญหาที่สอดคล้องกับแผน</li>
                  <li><strong>Task:</strong> คำสั่งที่ชัดเจนว่าให้นักเรียนทำอะไร</li>
                  <li><strong>Expected A/R/C/E:</strong> เกณฑ์ที่ AI ใช้ตรวจคำตอบ</li>
                </ul>
              </div>
            </div>

            <!-- Question Count -->
            <div class="option-group">
              <label>จำนวนคำถาม</label>
              <div class="slider-group">
                <input 
                  type="range" 
                  v-model.number="options.questionCount" 
                  min="3" 
                  max="15" 
                  class="slider"
                >
                <span class="slider-value">{{ options.questionCount }} ข้อ</span>
              </div>
              <small class="hint">แนะนำ 5-8 ข้อ สำหรับใบงาน 50 นาที</small>
            </div>

            <!-- Duration -->
            <div class="option-group">
              <label>เวลาทำใบงาน (นาที)</label>
              <div class="slider-group">
                <input 
                  type="range" 
                  v-model.number="options.duration" 
                  min="15" 
                  max="120" 
                  step="5"
                  class="slider"
                >
                <span class="slider-value">{{ options.duration }} นาที</span>
              </div>
            </div>

            <!-- Difficulty -->
            <div class="option-group">
              <label>ระดับความยาก</label>
              <select v-model="options.difficulty" class="form-control">
                <option value="easy">ง่าย - เหมาะกับผู้เรียนเริ่มต้น</option>
                <option value="medium">ปานกลาง - ท้าทายพอดี</option>
                <option value="hard">ยาก - ท้าทายมาก</option>
                <option value="mixed">ผสมผสาน - หลากหลายระดับ</option>
              </select>
            </div>

            <!-- Question Types -->
            <div class="option-group">
              <label>รูปแบบคำถาม</label>
              <div class="checkbox-group">
                <label class="checkbox-item">
                  <input type="checkbox" v-model="options.includeMultipleChoice">
                  <span>ปรนัย (Multiple Choice)</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="options.includeShortText">
                  <span>ตอบสั้น (Short Text)</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="options.includeOpenEnded">
                  <span>อัตนัย (Open-ended/Essay)</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="options.includeTable">
                  <span>ตาราง (Table)</span>
                </label>
              </div>
            </div>

            <!-- Include Reflection -->
            <div class="option-group">
              <label>ส่วนเพิ่มเติม</label>
              <div class="checkbox-group">
                <label class="checkbox-item">
                  <input type="checkbox" v-model="options.includeReflection">
                  <span>🪞 Self-Reflection (สะท้อนตนเอง)</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="options.includeRubric">
                  <span>📊 แสดงเกณฑ์คะแนน</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Room & Confirmation -->
        <div v-if="currentStep === 3" class="step-content">
          <h3>✅ ยืนยันการสร้าง</h3>

          <!-- Room Settings (only if not in existing room) -->
          <div v-if="!existingRoomId" class="room-settings">
            <h4>🏫 ห้องกิจกรรม</h4>
            <div class="room-option">
              <label class="radio-item">
                <input type="radio" v-model="options.roomOption" value="auto">
                <span>สร้างห้องอัตโนมัติ (ใช้ชื่อรายวิชา)</span>
              </label>
              <label class="radio-item">
                <input type="radio" v-model="options.roomOption" value="existing">
                <span>เพิ่มเข้าห้องที่มีอยู่</span>
              </label>
              <label class="radio-item">
                <input type="radio" v-model="options.roomOption" value="none">
                <span>ไม่สร้างห้อง (ใบงานอยู่ใน "จัดการใบงาน")</span>
              </label>
            </div>

            <!-- Select existing room -->
            <div v-if="options.roomOption === 'existing'" class="existing-room-select">
              <select v-model="options.existingRoomId" class="form-control">
                <option value="">-- เลือกห้อง --</option>
                <option v-for="room in existingRooms" :key="room.id" :value="room.id">
                  {{ room.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Summary -->
          <div class="summary-card">
            <h4>📋 สรุปใบงาน</h4>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="label">แผนการสอน:</span>
                <span class="value">{{ activePlan?.topic || activePlan?.title }}</span>
              </div>
              <div class="summary-item">
                <span class="label">รายวิชา:</span>
                <span class="value">{{ activePlan?.courseCode }} - {{ activePlan?.courseName }}</span>
              </div>
              <div class="summary-item">
                <span class="label">ประเภท:</span>
                <span class="value">{{ getTypeLabel(options.worksheetType) }}</span>
              </div>
              <div class="summary-item">
                <span class="label">จำนวนคำถาม:</span>
                <span class="value">{{ options.questionCount }} ข้อ</span>
              </div>
              <div class="summary-item">
                <span class="label">เวลา:</span>
                <span class="value">{{ options.duration }} นาที</span>
              </div>
              <div class="summary-item">
                <span class="label">ระดับความยาก:</span>
                <span class="value">{{ getDifficultyLabel(options.difficulty) }}</span>
              </div>
              <div class="summary-item" v-if="!existingRoomId">
                <span class="label">ห้องกิจกรรม:</span>
                <span class="value">{{ getRoomLabel() }}</span>
              </div>
              <div class="summary-item" v-else>
                <span class="label">เพิ่มเข้าห้อง:</span>
                <span class="value">{{ existingRoomName }}</span>
              </div>
            </div>
          </div>

          <!-- AI Note -->
          <div class="ai-note">
            <span class="material-icons">auto_awesome</span>
            <p>AI จะสร้างคำถามตามกิจกรรม 5E และประเมินตามเกณฑ์ A.R.C.E. โดยอัตโนมัติ</p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button 
          v-if="currentStep > 1" 
          class="btn btn-secondary"
          @click="currentStep--"
          :disabled="generating"
        >
          <span class="material-icons">arrow_back</span>
          ย้อนกลับ
        </button>
        <div class="spacer"></div>
        <button 
          class="btn btn-secondary" 
          @click="$emit('close')"
          :disabled="generating"
        >
          ยกเลิก
        </button>
        <button 
          v-if="currentStep < 3"
          class="btn btn-primary"
          @click="nextStep"
          :disabled="!canProceed"
        >
          ถัดไป
          <span class="material-icons">arrow_forward</span>
        </button>
        <button 
          v-else
          class="btn btn-primary btn-generate"
          @click="generate"
          :disabled="generating"
        >
          <span v-if="generating" class="material-icons spin">sync</span>
          <span v-else class="material-icons">auto_awesome</span>
          {{ generating ? 'กำลังสร้าง...' : 'สร้างใบงานด้วย AI' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { db } from '@/firebase/config'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  // Pre-selected lesson plan (from LessonPlanDetail)
  preSelectedPlan: {
    type: Object,
    default: null
  },
  // Existing room ID (from LearningRoom)
  existingRoomId: {
    type: String,
    default: null
  },
  // Existing room name
  existingRoomName: {
    type: String,
    default: ''
  },
  // Filter by course ID (for room-specific)
  roomCourseId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close', 'generated'])

const authStore = useAuthStore()

// State
const currentStep = ref(1) // Start at step 1, will adjust after loading
const loadingPlans = ref(false)
const generating = ref(false)
const lessonPlans = ref([])
const courses = ref([])
const existingRooms = ref([])
const existingWorksheets = ref([]) // Track existing worksheets
const selectedPlan = ref(null)
const filterCourseId = ref(props.roomCourseId || '')

// Options
const options = ref({
  worksheetType: 'comprehensive',
  questionCount: 8,
  duration: 50,
  difficulty: 'mixed',
  includeMultipleChoice: true,
  includeShortText: true,
  includeOpenEnded: true,
  includeTable: false,
  includeReflection: true,
  includeRubric: true,
  roomOption: props.existingRoomId ? 'existing' : 'auto',
  existingRoomId: props.existingRoomId || ''
})

// Computed
const activePlan = computed(() => props.preSelectedPlan || selectedPlan.value)

const filteredPlans = computed(() => {
  let plans = lessonPlans.value
  
  // Filter by room's course
  if (props.roomCourseId) {
    plans = plans.filter(p => p.courseId === props.roomCourseId)
  }
  // Filter by selected course
  else if (filterCourseId.value) {
    plans = plans.filter(p => p.courseId === filterCourseId.value)
  }
  
  // Sort by unit and plan number
  return plans.sort((a, b) => {
    const unitA = a.unitNumber || a.header?.unitNumber || 1
    const unitB = b.unitNumber || b.header?.unitNumber || 1
    if (unitA !== unitB) return unitA - unitB
    
    const planA = a.planNumber || a.header?.planNumber || 1
    const planB = b.planNumber || b.header?.planNumber || 1
    return planA - planB
  })
})

const canProceed = computed(() => {
  if (currentStep.value === 1) {
    // Must have a plan selected AND it should not have existing worksheet
    const plan = props.preSelectedPlan || selectedPlan.value
    if (!plan) return false
    if (hasWorksheetForPlan(plan.id)) return false
    return true
  }
  if (currentStep.value === 2) {
    return options.value.questionCount >= 3 && options.value.duration >= 15
  }
  return true
})

// Check if plan already has worksheet
function hasWorksheetForPlan(planId) {
  return existingWorksheets.value.some(ws => ws.lessonPlanId === planId)
}

function getExistingWorksheet(planId) {
  return existingWorksheets.value.find(ws => ws.lessonPlanId === planId)
}

// Computed: Check if preSelectedPlan already has worksheet
const preSelectedPlanHasWorksheet = computed(() => {
  if (!props.preSelectedPlan) return false
  return hasWorksheetForPlan(props.preSelectedPlan.id)
})

// Methods
function selectPlan(plan) {
  // Don't allow selecting plans that already have worksheets
  if (hasWorksheetForPlan(plan.id)) return
  selectedPlan.value = plan
}

function nextStep() {
  if (canProceed.value && currentStep.value < 3) {
    currentStep.value++
  }
}

function getTypeLabel(type) {
  const labels = {
    comprehensive: 'ครบทุกมิติ A.R.C.E.',
    analysis: 'เน้นการวิเคราะห์',
    creativity: 'เน้นความคิดสร้างสรรค์',
    quick: 'ใบงานด่วน',
    arce_evaluate: 'ใบงานวัดผล ARCE (ขั้น Evaluate)'
  }
  return labels[type] || type
}

function getDifficultyLabel(diff) {
  const labels = {
    easy: 'ง่าย',
    medium: 'ปานกลาง',
    hard: 'ยาก',
    mixed: 'ผสมผสาน'
  }
  return labels[diff] || diff
}

function getRoomLabel() {
  if (options.value.roomOption === 'auto') {
    return 'สร้างอัตโนมัติ'
  }
  if (options.value.roomOption === 'existing') {
    const room = existingRooms.value.find(r => r.id === options.value.existingRoomId)
    return room?.name || 'เลือกห้อง'
  }
  return 'ไม่สร้างห้อง'
}

async function loadData() {
  loadingPlans.value = true
  try {
    // Load lesson plans
    const plansQuery = query(
      collection(db, 'lessonPlans'),
      where('teacherId', '==', authStore.user?.uid),
      orderBy('createdAt', 'desc')
    )
    const plansSnapshot = await getDocs(plansQuery)
    lessonPlans.value = plansSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Load courses
    const coursesQuery = query(
      collection(db, 'courses'),
      where('teacherId', '==', authStore.user?.uid)
    )
    const coursesSnapshot = await getDocs(coursesQuery)
    courses.value = coursesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Load existing rooms
    const roomsQuery = query(
      collection(db, 'learningRooms'),
      where('teacherId', '==', authStore.user?.uid)
    )
    const roomsSnapshot = await getDocs(roomsQuery)
    existingRooms.value = roomsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Load existing worksheets to check which plans already have worksheets
    const worksheetsQuery = query(
      collection(db, 'eWorksheets'),
      where('teacherId', '==', authStore.user?.uid)
    )
    const worksheetsSnapshot = await getDocs(worksheetsQuery)
    existingWorksheets.value = worksheetsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

  } catch (error) {
    console.error('Error loading data:', error)
  } finally {
    loadingPlans.value = false
  }
}

async function generate() {
  if (!activePlan.value || generating.value) return
  
  generating.value = true
  
  try {
    const plan = activePlan.value
    const planContent = plan.content || plan
    
    // Build question types array
    const questionTypes = []
    if (options.value.includeMultipleChoice) questionTypes.push('multiple_choice')
    if (options.value.includeShortText) questionTypes.push('short_text')
    if (options.value.includeOpenEnded) questionTypes.push('open_ended')
    if (options.value.includeTable) questionTypes.push('table')
    
    // Determine room ID
    let roomId = null
    let createRoom = false
    
    if (props.existingRoomId) {
      roomId = props.existingRoomId
    } else if (options.value.roomOption === 'existing' && options.value.existingRoomId) {
      roomId = options.value.existingRoomId
    } else if (options.value.roomOption === 'auto') {
      createRoom = true
    }
    
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
        topic: plan.topic || planContent.header?.topic,
        activities: planContent.activities || planContent.activities5E,
        objectives: planContent.objectives || plan.objectives,
        learningOutcomes: plan.targetLOs || planContent.header?.targetLOs,
        arceFocus: plan.arceFocus || planContent.header?.arceFocus,
        // Custom options
        worksheetType: options.value.worksheetType,
        questionCount: options.value.questionCount,
        duration: options.value.duration,
        difficulty: options.value.difficulty,
        questionTypes: questionTypes,
        includeReflection: options.value.includeReflection,
        includeRubric: options.value.includeRubric,
        // Room options
        createRoom: createRoom,
        roomId: roomId
      })
    })

    const result = await response.json()
    
    if (result.success) {
      emit('generated', {
        worksheetId: result.worksheetId,
        roomId: result.roomId || roomId,
        totalQuestions: result.totalQuestions,
        maxScore: result.maxScore
      })
    } else {
      throw new Error(result.error || 'Failed to generate worksheet')
    }
  } catch (error) {
    console.error('Error generating worksheet:', error)
    alert('เกิดข้อผิดพลาดในการสร้างใบงาน: ' + error.message)
  } finally {
    generating.value = false
  }
}

// Load data on mount
onMounted(async () => {
  // Always load data to check existing worksheets
  await loadData()
  
  // If preSelectedPlan is provided and doesn't have worksheet, skip to step 2
  if (props.preSelectedPlan && !hasWorksheetForPlan(props.preSelectedPlan.id)) {
    currentStep.value = 2
  }
  // If has worksheet, stay on step 1 to show warning
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.worksheet-generator-modal {
  background: var(--bg-secondary);
  border-radius: 16px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

/* Step Indicator */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
  padding: 0 2rem;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.step-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.3s;
}

.step.active .step-number {
  background: var(--primary);
  color: white;
}

.step.completed .step-number {
  background: #10b981;
  color: white;
}

.step-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.step.active .step-label {
  color: var(--primary);
  font-weight: 600;
}

.step-line {
  flex: 1;
  height: 2px;
  background: var(--border-color);
  margin: 0 0.75rem;
  margin-bottom: 1.5rem;
  max-width: 80px;
  transition: background 0.3s;
}

.step-line.completed {
  background: #10b981;
}

/* Step Content */
.step-content h3 {
  margin: 0 0 1.5rem;
  font-size: 1.1rem;
}

/* Plan Selection */
.filter-section {
  margin-bottom: 1rem;
}

.filter-section label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.plans-list {
  display: grid;
  gap: 1rem;
  max-height: 350px;
  overflow-y: auto;
}

.plan-preview-card {
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.plan-preview-card:hover {
  border-color: var(--primary);
}

.plan-preview-card.selected {
  border-color: var(--primary);
  background: rgba(102, 126, 234, 0.1);
}

.plan-badges {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.unit-badge, .plan-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.unit-badge {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}

.plan-badge {
  background: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
}

/* Worksheet exists badge */
.worksheet-exists-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/* Plan card with existing worksheet */
.plan-preview-card.has-worksheet {
  opacity: 0.6;
  border-color: rgba(239, 68, 68, 0.3);
  cursor: not-allowed;
}

.plan-preview-card.has-worksheet:hover {
  border-color: rgba(239, 68, 68, 0.5);
}

.plan-preview-card.disabled {
  pointer-events: none;
}

.existing-worksheet-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  font-size: 0.8rem;
  color: #ef4444;
}

.existing-worksheet-info .material-icons {
  font-size: 1rem;
}

/* Warning for preselected plan */
.existing-worksheet-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.existing-worksheet-warning .material-icons {
  color: #ef4444;
  font-size: 1.5rem;
}

.warning-content {
  flex: 1;
}

.warning-content strong {
  color: #ef4444;
  display: block;
  margin-bottom: 0.25rem;
}

.warning-content p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.warning-content .existing-title {
  margin-top: 0.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.plan-preview-card h4 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.course-name {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.plan-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.selection-indicator {
  position: absolute;
  top: 1rem;
  right: 1rem;
  color: var(--primary);
}

.preselected-plan .plan-preview-card {
  cursor: default;
}

.loading-plans, .no-plans {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.loading-plans .material-icons,
.no-plans .material-icons {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  display: block;
}

/* Options Grid */
.options-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-group.full-width {
  grid-column: 1 / -1;
}

.option-group label {
  font-weight: 600;
  font-size: 0.9rem;
}

/* Type Options */
.type-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.type-card {
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.type-card:hover {
  border-color: var(--primary);
}

.type-card.selected {
  border-color: var(--primary);
  background: rgba(102, 126, 234, 0.1);
}

.type-card.arce-evaluate-card {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1));
  border-color: rgba(16, 185, 129, 0.3);
}

.type-card.arce-evaluate-card:hover {
  border-color: #10b981;
}

.type-card.arce-evaluate-card.selected {
  border-color: #10b981;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2));
}

.arce-evaluate-notice {
  display: flex;
  gap: 0.75rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 10px;
  padding: 1rem;
  margin-top: 1rem;
}

.arce-evaluate-notice .material-icons {
  color: #10b981;
  font-size: 1.25rem;
}

.arce-evaluate-notice strong {
  color: #10b981;
  display: block;
  margin-bottom: 0.25rem;
}

.arce-evaluate-notice p {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.arce-evaluate-notice ul {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.arce-evaluate-notice li {
  margin-bottom: 0.25rem;
}

.arce-evaluate-notice li strong {
  color: var(--text-primary);
  display: inline;
}

.type-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.type-card strong {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.type-card small {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Slider */
.slider-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-tertiary);
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
}

.slider-value {
  min-width: 60px;
  text-align: right;
  font-weight: 600;
  color: var(--primary);
}

.hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Checkbox Group */
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.checkbox-item input {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
}

/* Room Settings */
.room-settings {
  background: var(--bg-tertiary);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.room-settings h4 {
  margin: 0 0 1rem;
}

.room-option {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.radio-item input {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
}

.existing-room-select {
  margin-top: 0.75rem;
  padding-left: 1.5rem;
}

/* Summary Card */
.summary-card {
  background: var(--bg-tertiary);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.summary-card h4 {
  margin: 0 0 1rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-item .label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.summary-item .value {
  font-weight: 600;
}

/* AI Note */
.ai-note {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 10px;
  padding: 1rem;
}

.ai-note .material-icons {
  color: var(--primary);
}

.ai-note p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* Modal Footer */
.modal-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
}

.spacer {
  flex: 1;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--border-color);
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-generate {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.form-control {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 0.95rem;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary);
}

/* Animations */
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 600px) {
  .options-grid {
    grid-template-columns: 1fr;
  }
  
  .type-options {
    grid-template-columns: 1fr;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
  }
  
  .step-label {
    display: none;
  }
}
</style>
