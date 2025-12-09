<template>
  <Teleport to="body">
    <div class="modal-overlay" @click="$emit('close')">
      <div class="generate-modal" @click.stop>
        <!-- Header -->
        <div class="modal-header">
          <div class="header-content">
            <span class="header-icon">🤖</span>
            <div>
              <h2>สร้างแผนการจัดการเรียนรู้ด้วย AI</h2>
              <p>กรอกข้อมูลเพื่อสร้างแผนการสอนที่ครบถ้วนตามมาตรฐาน</p>
            </div>
          </div>
          <button class="close-btn" @click="$emit('close')">
            <span class="material-icons">close</span>
          </button>
        </div>

        <!-- Content -->
        <div class="modal-content">
          <!-- Step 1: Course & Basic Info -->
          <div v-if="step === 1" class="step-content">
            <div class="step-indicator">
              <span class="step-badge active">1</span>
              <span class="step-line"></span>
              <span class="step-badge">2</span>
              <span class="step-line"></span>
              <span class="step-badge">3</span>
              <span class="step-line"></span>
              <span class="step-badge">4</span>
            </div>

            <h3>📚 ข้อมูลรายวิชาและครูผู้สอน</h3>
            
            <div class="form-group">
              <label>รายวิชา <span class="required">*</span></label>
              <select v-model="form.courseId" class="form-control" @change="onCourseChange">
                <option value="">เลือกรายวิชา</option>
                <option v-for="course in courses" :key="course.id" :value="course.id">
                  {{ course.courseCode || course.code || 'ไม่มีรหัส' }} - {{ course.courseName || course.name }}
                </option>
              </select>
              <p v-if="!courses || courses.length === 0" class="helper-text warning">
                ⚠️ ยังไม่มีรายวิชา กรุณาสร้างรายวิชาที่เมนู "จัดการรายวิชา" ก่อน
              </p>
            </div>

            <!-- Course Info Display (auto-filled) -->
            <div v-if="selectedCourse" class="course-info-box">
              <div class="info-row">
                <span class="info-label">รหัสวิชา:</span>
                <span class="info-value">{{ selectedCourse.courseCode || selectedCourse.code || 'ไม่ระบุ' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">ชื่อวิชา:</span>
                <span class="info-value">{{ selectedCourse.courseName || selectedCourse.name }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">กลุ่มสาระ:</span>
                <span class="info-value">{{ selectedCourse.subjectGroup || 'วิทยาศาสตร์และเทคโนโลยี' }}</span>
              </div>
              <div class="info-row" v-if="selectedCourse.description">
                <span class="info-label">คำอธิบายรายวิชา:</span>
                <span class="info-value desc">{{ selectedCourse.description }}</span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>ระดับชั้น</label>
                <select v-model="form.gradeLevel" class="form-control">
                  <option value="ม.1">ม.1</option>
                  <option value="ม.2">ม.2</option>
                  <option value="ม.3">ม.3</option>
                  <option value="ม.4">ม.4</option>
                  <option value="ม.5">ม.5</option>
                  <option value="ม.6">ม.6</option>
                </select>
              </div>

              <div class="form-group">
                <label>ภาคเรียนที่</label>
                <select v-model="form.semester" class="form-control">
                  <option :value="1">ภาคเรียนที่ 1</option>
                  <option :value="2">ภาคเรียนที่ 2</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>ปีการศึกษา</label>
                <select v-model="form.academicYear" class="form-control">
                  <option v-for="year in academicYears" :key="year" :value="year">{{ year }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>ชื่อครูผู้สอน</label>
                <input 
                  v-model="form.teacherName" 
                  type="text" 
                  class="form-control"
                  placeholder="นายแสงเพชร คำโพธิ์"
                >
              </div>
            </div>

            <div class="form-group">
              <label>โรงเรียน</label>
              <input 
                v-model="form.schoolName" 
                type="text" 
                class="form-control"
                placeholder="โรงเรียนสระบุรีวิทยาคม"
              >
            </div>
          </div>

          <!-- Step 2: Unit & Lesson Info -->
          <div v-if="step === 2" class="step-content">
            <div class="step-indicator">
              <span class="step-badge completed">✓</span>
              <span class="step-line active"></span>
              <span class="step-badge active">2</span>
              <span class="step-line"></span>
              <span class="step-badge">3</span>
              <span class="step-line"></span>
              <span class="step-badge">4</span>
            </div>

            <h3>📋 ข้อมูลหน่วยการเรียนรู้และแผน</h3>

            <div class="form-row">
              <div class="form-group">
                <label>หน่วยการเรียนรู้ที่</label>
                <input 
                  v-model.number="form.unitNumber" 
                  type="number" 
                  class="form-control"
                  min="1"
                  placeholder="1"
                >
              </div>

              <div class="form-group">
                <label>ชื่อหน่วยการเรียนรู้ <span class="required">*</span></label>
                <input 
                  v-model="form.unitName" 
                  type="text" 
                  class="form-control"
                  placeholder="เช่น รู้จัก Vue.js และการพัฒนาเว็บ"
                >
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>รวมเวลาหน่วย (ชม.)</label>
                <input 
                  v-model.number="form.unitTotalHours" 
                  type="number" 
                  class="form-control"
                  min="1"
                  placeholder="16"
                >
              </div>

              <div class="form-group">
                <label>แผนการจัดการเรียนรู้ที่</label>
                <input 
                  v-model.number="form.planNumber" 
                  type="number" 
                  class="form-control"
                  min="1"
                  placeholder="1"
                >
              </div>
            </div>

            <div class="form-group">
              <label>หัวข้อ/เรื่องที่ต้องการสอน <span class="required">*</span></label>
              <input 
                v-model="form.topic" 
                type="text" 
                class="form-control"
                placeholder="เช่น การสร้าง Component ใน Vue.js"
              >
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>ระยะเวลา</label>
                <select v-model="form.duration" class="form-control">
                  <option :value="50">50 นาที (1 คาบ)</option>
                  <option :value="100">100 นาที (2 คาบ)</option>
                  <option :value="150">150 นาที (3 คาบ)</option>
                </select>
              </div>

              <div class="form-group">
                <label>รูปแบบการสอน</label>
                <select v-model="form.teachingMethod" class="form-control">
                  <option value="5E">กระบวนการสืบเสาะ 5E</option>
                  <option value="PBL">Problem-Based Learning</option>
                  <option value="Cooperative">การเรียนรู้แบบร่วมมือ</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Step 3: Standards & Learning Outcomes -->
          <div v-if="step === 3" class="step-content">
            <div class="step-indicator">
              <span class="step-badge completed">✓</span>
              <span class="step-line completed"></span>
              <span class="step-badge completed">✓</span>
              <span class="step-line active"></span>
              <span class="step-badge active">3</span>
              <span class="step-line"></span>
              <span class="step-badge">4</span>
            </div>

            <h3>🎯 มาตรฐาน ตัวชี้วัด และผลการเรียนรู้</h3>

            <div class="form-group">
              <label>มาตรฐานการเรียนรู้</label>
              <textarea 
                v-model="form.standard"
                class="form-control"
                rows="2"
                placeholder="เช่น ว 4.2 เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริง..."
              ></textarea>
            </div>

            <div class="form-group">
              <label>ประเภทตัวชี้วัด</label>
              <div class="checkbox-row">
                <label class="checkbox-option">
                  <input type="checkbox" v-model="form.indicatorTypes" value="during">
                  ตัวชี้วัดระหว่างทาง
                </label>
                <label class="checkbox-option">
                  <input type="checkbox" v-model="form.indicatorTypes" value="final">
                  ตัวชี้วัดปลายทาง
                </label>
              </div>
              <p class="hint auto-detect-hint" v-if="form.indicators">
                <span class="material-icons">auto_fix_high</span>
                ระบบจะตรวจสอบประเภทตัวชี้วัดจากฐานข้อมูลหลักสูตรอัตโนมัติ
              </p>
            </div>

            <div class="form-group">
              <label>ตัวชี้วัด/ผลการเรียนรู้</label>
              <textarea 
                v-model="form.indicators"
                class="form-control"
                rows="3"
                placeholder="เช่น&#10;ว 4.2 ม.4/1 ประยุกต์ใช้แนวคิดเชิงคำนวณ...&#10;ว 4.1 ม.2/3 ออกแบบวิธีการแก้ปัญหา..."
              ></textarea>
              <p class="hint">พิมพ์รหัสตัวชี้วัด เช่น ว 4.2 ม.4/1 ระบบจะดึงข้อมูลจากหลักสูตรแกนกลางอัตโนมัติ</p>
            </div>

            <div v-if="courseLOs.length" class="los-section">
              <label>เลือก Learning Outcomes ที่เกี่ยวข้อง</label>
              <div class="los-list">
                <label 
                  v-for="lo in courseLOs" 
                  :key="lo.code" 
                  :class="['lo-item', { selected: form.targetLOs.includes(lo.code) }]"
                >
                  <input 
                    type="checkbox" 
                    :value="lo.code" 
                    v-model="form.targetLOs"
                  >
                  <span class="lo-code">{{ lo.code }}</span>
                  <span class="lo-desc">{{ lo.description }}</span>
                </label>
              </div>
            </div>
            <div v-else-if="selectedCourse" class="empty-los">
              <span class="empty-icon">📭</span>
              <p>รายวิชานี้ยังไม่มี Learning Outcomes</p>
              <p class="helper">AI จะสร้าง LO ให้อัตโนมัติตามหัวข้อที่ระบุ</p>
            </div>
          </div>

          <!-- Step 4: Additional Options -->
          <div v-if="step === 4" class="step-content">
            <div class="step-indicator">
              <span class="step-badge completed">✓</span>
              <span class="step-line completed"></span>
              <span class="step-badge completed">✓</span>
              <span class="step-line completed"></span>
              <span class="step-badge completed">✓</span>
              <span class="step-line active"></span>
              <span class="step-badge active">4</span>
            </div>

            <h3>⚙️ ตัวเลือกการประเมินและการบูรณาการ</h3>

            <div class="form-group">
              <label>HOTS Focus (A.R.C.E.)</label>
              <div class="hots-options">
                <label 
                  v-for="hots in hotsOptions" 
                  :key="hots.key"
                  :class="['hots-option', { selected: form.hotsFocus.includes(hots.key) }]"
                >
                  <input type="checkbox" :value="hots.key" v-model="form.hotsFocus">
                  <span class="hots-icon">{{ hots.icon }}</span>
                  <div class="hots-info">
                    <span class="hots-name">{{ hots.name }}</span>
                    <span class="hots-en">{{ hots.en }}</span>
                  </div>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>คุณลักษณะอันพึงประสงค์</label>
              <div class="traits-options">
                <label v-for="trait in desirableTraits" :key="trait.value" class="trait-option">
                  <input type="checkbox" :value="trait.value" v-model="form.desirableTraits">
                  <span>{{ trait.icon }} {{ trait.label }}</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>สมรรถนะสำคัญ</label>
              <div class="competencies-options">
                <label v-for="comp in competencies" :key="comp.value" class="competency-option">
                  <input type="checkbox" :value="comp.value" v-model="form.competencies">
                  <span>{{ comp.label }}</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>การบูรณาการ (ถ้ามี)</label>
              <div class="integration-options">
                <label class="integration-section">
                  <input type="checkbox" v-model="form.integration.worldClass">
                  📚 บูรณาการหลักสูตรโรงเรียนมาตรฐานสากล
                </label>
                <label class="integration-section">
                  <input type="checkbox" v-model="form.integration.sufficiencyEconomy">
                  🌿 บูรณาการกับปรัชญาของเศรษฐกิจพอเพียง
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>รูปแบบการเรียนรู้</label>
              <div class="learning-styles">
                <label class="style-option" v-for="style in learningStyles" :key="style.value">
                  <input type="radio" :value="style.value" v-model="form.learningStyle">
                  <span class="style-icon">{{ style.icon }}</span>
                  <span class="style-name">{{ style.name }}</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>หมายเหตุเพิ่มเติมสำหรับ AI (ถ้ามี)</label>
              <textarea 
                v-model="form.additionalNotes"
                class="form-control"
                placeholder="เช่น ต้องการให้เน้นการฝึกปฏิบัติจริง, ใช้ GitHub Copilot ช่วยเขียนโค้ด"
                rows="3"
              ></textarea>
            </div>
          </div>

          <!-- Generating State -->
          <div v-if="generating" class="generating-state">
            <div class="generating-animation">
              <span class="ai-icon">🤖</span>
              <div class="pulse-ring"></div>
            </div>
            <h3>AI กำลังสร้างแผนการจัดการเรียนรู้...</h3>
            <p>กรุณารอสักครู่ กระบวนการนี้อาจใช้เวลา 20-40 วินาที</p>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progress + '%' }"></div>
            </div>
            <p class="progress-text">{{ progressText }}</p>
          </div>
        </div>

        <!-- Footer -->
        <div v-if="!generating" class="modal-footer">
          <button 
            v-if="step > 1" 
            class="btn btn-outline" 
            @click="prevStep"
          >
            <span class="material-icons">chevron_left</span>
            ก่อนหน้า
          </button>
          <div class="spacer"></div>
          <button 
            v-if="step < 4" 
            class="btn btn-primary" 
            @click="nextStep"
            :disabled="!canProceed"
          >
            ถัดไป
            <span class="material-icons">chevron_right</span>
          </button>
          <button 
            v-else 
            class="btn btn-ai" 
            @click="generate"
            :disabled="!canGenerate"
          >
            <span class="material-icons">auto_awesome</span>
            สร้างแผนด้วย AI
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useLessonPlanStore } from '@/stores/lessonPlan'
import { INDICATORS } from '@/constants/curriculumStandards'

const props = defineProps({
  courses: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['close', 'generated'])

const lessonPlanStore = useLessonPlanStore()

const step = ref(1)
const generating = ref(false)
const progress = ref(0)
const progressText = ref('กำลังเตรียมข้อมูล...')
const courseLOs = ref([])
const selectedCourse = ref(null)

// Academic years options
const currentYear = new Date().getFullYear() + 543
const academicYears = [currentYear, currentYear - 1, currentYear + 1]

const hotsOptions = [
  { key: 'analysis', icon: '🔍', name: 'การวิเคราะห์', en: 'Analysis' },
  { key: 'reasoning', icon: '🧠', name: 'การให้เหตุผล', en: 'Reasoning' },
  { key: 'creativity', icon: '💡', name: 'ความคิดสร้างสรรค์', en: 'Creativity' },
  { key: 'evidence', icon: '📚', name: 'การใช้หลักฐาน', en: 'Evidence' }
]

const desirableTraits = [
  { value: 'discipline', label: 'มีวินัย', icon: '📏' },
  { value: 'diligent', label: 'ใฝ่เรียนรู้', icon: '📖' },
  { value: 'determined', label: 'มุ่งมั่นในการทำงาน', icon: '💪' },
  { value: 'honest', label: 'ซื่อสัตย์สุจริต', icon: '🤝' },
  { value: 'sufficient', label: 'อยู่อย่างพอเพียง', icon: '🌱' },
  { value: 'patriotic', label: 'รักชาติ ศาสน์ กษัตริย์', icon: '🇹🇭' },
  { value: 'thai_identity', label: 'รักความเป็นไทย', icon: '🪷' },
  { value: 'public_minded', label: 'มีจิตสาธารณะ', icon: '💚' }
]

const competencies = [
  { value: 'communication', label: '🗣️ ความสามารถในการสื่อสาร' },
  { value: 'thinking', label: '🧠 ความสามารถในการคิด' },
  { value: 'problem_solving', label: '🔧 ความสามารถในการแก้ปัญหา' },
  { value: 'life_skills', label: '🌟 ความสามารถในการใช้ทักษะชีวิต' },
  { value: 'technology', label: '💻 ความสามารถในการใช้เทคโนโลยี' }
]

const learningStyles = [
  { value: 'collaborative', icon: '👥', name: 'เรียนรู้แบบกลุ่ม' },
  { value: 'individual', icon: '👤', name: 'เรียนรู้รายบุคคล' },
  { value: 'mixed', icon: '🔄', name: 'ผสมผสาน' }
]

const form = reactive({
  // Step 1: Course & Basic
  courseId: '',
  gradeLevel: 'ม.4',
  semester: 2,
  academicYear: currentYear,
  teacherName: '',
  schoolName: '',
  
  // Step 2: Unit & Lesson
  unitNumber: 1,
  unitName: '',
  unitTotalHours: 16,
  planNumber: 1,
  topic: '',
  duration: 50,
  teachingMethod: '5E',
  
  // Step 3: Standards & LOs
  standard: '',
  indicatorTypes: ['final'],
  indicators: '',
  targetLOs: [],
  
  // Step 4: Options
  hotsFocus: ['analysis', 'reasoning', 'creativity', 'evidence'],
  desirableTraits: ['discipline', 'diligent', 'determined'],
  competencies: ['communication', 'thinking', 'problem_solving', 'technology'],
  integration: {
    worldClass: false,
    sufficiencyEconomy: false
  },
  learningStyle: 'mixed',
  additionalNotes: ''
})

const canProceed = computed(() => {
  if (step.value === 1) {
    return form.courseId
  }
  if (step.value === 2) {
    return form.unitName && form.topic
  }
  return true
})

const canGenerate = computed(() => {
  return form.courseId && form.unitName && form.topic
})

function onCourseChange() {
  const course = props.courses.find(c => c.id === form.courseId)
  selectedCourse.value = course || null
  courseLOs.value = course?.learningOutcomes || []
  form.targetLOs = []
}

/**
 * Auto-detect indicator types from database
 * เมื่อครูพิมพ์ตัวชี้วัด ระบบจะตรวจสอบจาก INDICATORS ว่าเป็นประเภทไหน
 */
function autoDetectIndicatorTypes() {
  if (!form.indicators || !form.gradeLevel) return
  
  const indicatorText = form.indicators.trim()
  if (!indicatorText) return
  
  // Parse indicator codes from text (e.g., "ว 4.2 ม.4/1", "ว 4.1 ม.2/3")
  const indicatorPattern = /ว\s*[\d.]+\s*[มป]\.\d+\/\d+/g
  const foundCodes = indicatorText.match(indicatorPattern) || []
  
  if (foundCodes.length === 0) return
  
  const detectedTypes = new Set()
  
  for (const code of foundCodes) {
    // Extract standard code (e.g., "ว 4.2") and normalize it
    const stdMatch = code.match(/ว\s*([\d.]+)/)
    const gradeMatch = code.match(/([มป]\.\d+)/)
    
    if (stdMatch && gradeMatch) {
      const standardCode = `ว ${stdMatch[1]}`
      const gradeLevel = gradeMatch[1]
      
      // Look up in database
      const indicators = INDICATORS[standardCode]?.[gradeLevel] || []
      
      // Find matching indicator
      const normalizedCode = code.replace(/\s+/g, ' ').trim()
      const found = indicators.find(ind => 
        ind.code.replace(/\s+/g, ' ').trim() === normalizedCode
      )
      
      if (found && found.type) {
        detectedTypes.add(found.type)
      }
    }
  }
  
  // Update form if types were detected
  if (detectedTypes.size > 0) {
    form.indicatorTypes = Array.from(detectedTypes)
  }
}

// Watch for indicator changes and auto-detect types
watch(() => form.indicators, () => {
  autoDetectIndicatorTypes()
}, { immediate: false })

function nextStep() {
  if (step.value < 4) {
    step.value++
  }
}

function prevStep() {
  if (step.value > 1) {
    step.value--
  }
}

async function generate() {
  generating.value = true
  progress.value = 0

  // Simulate progress
  const progressSteps = [
    { percent: 5, text: 'กำลังเตรียมข้อมูลรายวิชา...' },
    { percent: 15, text: 'กำลังวิเคราะห์มาตรฐานและตัวชี้วัด...' },
    { percent: 25, text: 'กำลังออกแบบจุดประสงค์การเรียนรู้ (K/P/A)...' },
    { percent: 35, text: 'กำลังสร้างกิจกรรม Engagement...' },
    { percent: 45, text: 'กำลังสร้างกิจกรรม Exploration...' },
    { percent: 55, text: 'กำลังสร้างกิจกรรม Explanation...' },
    { percent: 65, text: 'กำลังสร้างกิจกรรม Elaboration...' },
    { percent: 75, text: 'กำลังสร้างกิจกรรม Evaluation...' },
    { percent: 85, text: 'กำลังออกแบบเกณฑ์การประเมิน ARCE...' },
    { percent: 92, text: 'กำลังสร้างตารางการวัดและประเมินผล...' },
    { percent: 97, text: 'กำลังตรวจสอบและปรับปรุง...' }
  ]

  const progressInterval = setInterval(() => {
    const currentStep = progressSteps.find(s => s.percent > progress.value)
    if (currentStep) {
      progress.value = currentStep.percent
      progressText.value = currentStep.text
    }
  }, 2500)

  try {
    // Get full course info
    const course = selectedCourse.value || {}
    
    const result = await lessonPlanStore.generateWithAI({
      // Course Info
      courseId: form.courseId,
      courseCode: course.courseCode || course.code || '',
      courseName: course.courseName || course.name || '',
      courseDescription: course.description || '',
      subjectGroup: course.subjectGroup || 'วิทยาศาสตร์และเทคโนโลยี',
      learningOutcomes: course.learningOutcomes || [],
      
      // Basic Info
      gradeLevel: form.gradeLevel,
      semester: form.semester,
      academicYear: form.academicYear,
      teacherName: form.teacherName,
      schoolName: form.schoolName,
      
      // Unit & Lesson
      unitNumber: form.unitNumber,
      unitName: form.unitName,
      unitTotalHours: form.unitTotalHours,
      planNumber: form.planNumber,
      topic: form.topic,
      duration: form.duration,
      teachingMethod: form.teachingMethod,
      
      // Standards & LOs
      standard: form.standard,
      indicatorTypes: form.indicatorTypes,
      indicators: form.indicators,
      targetLOs: form.targetLOs,
      
      // Options
      hotsFocus: form.hotsFocus,
      desirableTraits: form.desirableTraits,
      competencies: form.competencies,
      integration: form.integration,
      learningStyle: form.learningStyle,
      additionalNotes: form.additionalNotes
    })

    clearInterval(progressInterval)
    progress.value = 100
    progressText.value = 'เสร็จสิ้น!'

    setTimeout(() => {
      emit('generated', result)
    }, 500)
  } catch (error) {
    clearInterval(progressInterval)
    console.error('Error generating:', error)
    alert('เกิดข้อผิดพลาดในการสร้างแผน: ' + error.message)
    generating.value = false
  }
}
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

.generate-modal {
  background: var(--bg-secondary);
  border-radius: 20px;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.1));
  border-bottom: 1px solid var(--border-color);
}

.header-content {
  display: flex;
  gap: 1rem;
}

.header-icon {
  font-size: 2.5rem;
}

.modal-header h2 {
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
}

.modal-header p {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Content */
.modal-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

/* Step Indicator */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.step-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.step-badge.active {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  border-color: transparent;
  color: white;
}

.step-badge.completed {
  background: #10b981;
  border-color: transparent;
  color: white;
}

.step-line {
  width: 30px;
  height: 3px;
  background: var(--border-color);
  border-radius: 2px;
}

.step-line.active,
.step-line.completed {
  background: linear-gradient(90deg, #8b5cf6, #ec4899);
}

/* Step Content */
.step-content h3 {
  font-size: 1.125rem;
  margin-bottom: 1rem;
}

/* Form Elements */
.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.required {
  color: #ef4444;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-control {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: all 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.helper-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.helper-text.warning {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
}

/* Course Info Box */
.course-info-box {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1.25rem;
}

.info-row {
  display: flex;
  gap: 0.75rem;
  padding: 0.375rem 0;
}

.info-label {
  font-weight: 500;
  color: var(--text-secondary);
  min-width: 100px;
}

.info-value {
  flex: 1;
}

.info-value.desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Checkbox Row */
.checkbox-row {
  display: flex;
  gap: 1.5rem;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

/* LO Section */
.los-section {
  margin-top: 1rem;
}

.los-section > label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.los-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.lo-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.lo-item:hover {
  border-color: #8b5cf6;
}

.lo-item.selected {
  background: rgba(139, 92, 246, 0.1);
  border-color: #8b5cf6;
}

.lo-item input {
  margin-top: 0.25rem;
}

.lo-code {
  font-weight: 600;
  color: #8b5cf6;
  white-space: nowrap;
}

.lo-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  flex: 1;
}

.empty-los {
  text-align: center;
  padding: 1.5rem;
  background: var(--bg-primary);
  border-radius: 12px;
}

.empty-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

.empty-los .helper {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

/* HOTS Options */
.hots-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.hots-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.hots-option:hover {
  border-color: #8b5cf6;
}

.hots-option.selected {
  background: rgba(139, 92, 246, 0.1);
  border-color: #8b5cf6;
}

.hots-option input {
  display: none;
}

.hots-icon {
  font-size: 1.25rem;
}

.hots-info {
  display: flex;
  flex-direction: column;
}

.hots-name {
  font-weight: 500;
  font-size: 0.875rem;
}

.hots-en {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Traits & Competencies */
.traits-options,
.competencies-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.trait-option,
.competency-option {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.trait-option:has(input:checked),
.competency-option:has(input:checked) {
  background: rgba(139, 92, 246, 0.1);
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.trait-option input,
.competency-option input {
  display: none;
}

/* Integration Options */
.integration-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.integration-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.9rem;
}

.integration-section:has(input:checked) {
  background: rgba(16, 185, 129, 0.1);
  border-color: #10b981;
}

/* Learning Styles */
.learning-styles {
  display: flex;
  gap: 0.75rem;
}

.style-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.style-option:hover {
  border-color: #8b5cf6;
}

.style-option:has(input:checked) {
  background: rgba(139, 92, 246, 0.1);
  border-color: #8b5cf6;
}

.style-option input {
  display: none;
}

.style-icon {
  font-size: 1.5rem;
}

.style-name {
  font-size: 0.8rem;
  text-align: center;
}

/* Generating State */
.generating-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.generating-animation {
  position: relative;
  margin-bottom: 1.5rem;
}

.ai-icon {
  font-size: 4rem;
  position: relative;
  z-index: 1;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  border: 3px solid rgba(139, 92, 246, 0.3);
  border-radius: 50%;
  animation: pulse 2s ease-out infinite;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}

.generating-state h3 {
  margin-bottom: 0.5rem;
}

.generating-state > p {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #ec4899);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.spacer {
  flex: 1;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 0.9rem;
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

.btn-ai {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: white;
}

.btn-ai:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn .material-icons {
  font-size: 1.125rem;
}

/* Responsive */
@media (max-width: 600px) {
  .generate-modal {
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-header {
    padding: 1rem;
  }

  .header-icon {
    font-size: 2rem;
  }

  .modal-content {
    padding: 1rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .hots-options {
    grid-template-columns: 1fr;
  }

  .learning-styles {
    flex-direction: column;
  }
}

/* Auto-detect hint */
.auto-detect-hint {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--success-color, #10b981);
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.auto-detect-hint .material-icons {
  font-size: 0.875rem;
}

.hint {
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin-top: 0.25rem;
}
</style>
