<template>
  <div class="lesson-plan-editor">
    <!-- Top Navigation -->
    <nav class="top-navbar">
      <div class="nav-brand">
        <button class="back-btn" @click="confirmBack">
          <span class="material-icons">arrow_back</span>
        </button>
        <span class="brand-icon">✏️</span>
        <span class="brand-text">{{ isEditing ? 'แก้ไขแผนการสอน' : 'สร้างแผนการสอนใหม่' }}</span>
      </div>
      <div class="nav-actions">
        <span v-if="hasUnsavedChanges" class="unsaved-badge">
          <span class="material-icons">warning</span>
          มีการเปลี่ยนแปลงที่ยังไม่บันทึก
        </span>
        <button class="btn btn-outline" @click="saveDraft" :disabled="saving">
          <span class="material-icons">save</span>
          บันทึกแบบร่าง
        </button>
        <button class="btn btn-primary" @click="saveAndPublish" :disabled="saving">
          <span class="material-icons">publish</span>
          บันทึกและเผยแพร่
        </button>
      </div>
    </nav>

    <div class="editor-container">
      <!-- Sidebar: Steps -->
      <aside class="editor-sidebar">
        <div class="steps-nav">
          <button 
            v-for="(step, index) in steps" 
            :key="step.id"
            :class="['step-item', { active: currentStep === index, completed: isStepCompleted(index) }]"
            @click="goToStep(index)"
          >
            <span class="step-number">{{ index + 1 }}</span>
            <span class="step-icon">{{ step.icon }}</span>
            <span class="step-name">{{ step.name }}</span>
            <span v-if="isStepCompleted(index)" class="step-check">✓</span>
          </button>
        </div>

        <div class="ai-assist-section">
          <h4>🤖 AI ช่วยเหลือ</h4>
          <button class="btn btn-ai" @click="generateCurrentSection" :disabled="generating">
            <span class="material-icons">auto_awesome</span>
            {{ generating ? 'กำลังสร้าง...' : 'สร้างส่วนนี้ด้วย AI' }}
          </button>
          <button class="btn btn-outline btn-sm" @click="generateAllSections" :disabled="generating">
            สร้างทั้งหมด
          </button>
        </div>
      </aside>

      <!-- Main Editor -->
      <main class="editor-main">
        <!-- Step 0: Basic Info -->
        <div v-show="currentStep === 0" class="editor-step">
          <div class="step-header">
            <h2>📋 ข้อมูลพื้นฐาน</h2>
            <p>กรอกข้อมูลพื้นฐานของแผนการสอน</p>
          </div>

          <div class="form-grid">
            <div class="form-group full-width">
              <label>ชื่อแผนการสอน <span class="required">*</span></label>
              <input 
                v-model="form.title" 
                type="text" 
                class="form-control"
                placeholder="เช่น แผนการสอนเรื่องสมการเชิงเส้น"
              >
            </div>

            <div class="form-group">
              <label>รายวิชา <span class="required">*</span></label>
              <select v-model="form.courseId" class="form-control">
                <option value="">เลือกรายวิชา</option>
                <option v-for="course in courses" :key="course.id" :value="course.id">
                  {{ course.code }} - {{ course.name }}
                </option>
              </select>
            </div>

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
              <label>ระยะเวลา (นาที)</label>
              <input 
                v-model.number="form.duration" 
                type="number" 
                class="form-control"
                min="30"
                max="180"
              >
            </div>

            <div class="form-group">
              <label>หัวข้อ/เรื่อง</label>
              <input 
                v-model="form.topic" 
                type="text" 
                class="form-control"
                placeholder="หัวข้อหลักที่สอน"
              >
            </div>

            <div class="form-group full-width">
              <label>Learning Outcomes ที่เกี่ยวข้อง</label>
              <div class="los-selector" v-if="selectedCourseLOs.length">
                <label 
                  v-for="lo in selectedCourseLOs" 
                  :key="lo.code" 
                  class="lo-checkbox"
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
              <p v-else class="helper-text">เลือกรายวิชาเพื่อแสดง Learning Outcomes</p>
            </div>
          </div>
        </div>

        <!-- Step 1: Objectives -->
        <div v-show="currentStep === 1" class="editor-step">
          <div class="step-header">
            <h2>🎯 จุดประสงค์การเรียนรู้</h2>
            <p>ระบุจุดประสงค์ที่นักเรียนจะบรรลุหลังเรียน</p>
          </div>

          <div class="objectives-editor">
            <div 
              v-for="(obj, index) in form.objectives" 
              :key="index"
              class="objective-item"
            >
              <span class="obj-number">{{ index + 1 }}.</span>
              <input 
                v-model="form.objectives[index]" 
                type="text"
                class="form-control"
                placeholder="ระบุจุดประสงค์การเรียนรู้"
              >
              <button class="btn-icon danger" @click="removeObjective(index)" v-if="form.objectives.length > 1">
                <span class="material-icons">close</span>
              </button>
            </div>
            <button class="btn btn-outline btn-sm" @click="addObjective">
              <span class="material-icons">add</span>
              เพิ่มจุดประสงค์
            </button>
          </div>

          <div class="tip-box">
            <span class="tip-icon">💡</span>
            <div class="tip-content">
              <strong>เคล็ดลับ:</strong> จุดประสงค์ที่ดีควรใช้กริยา Bloom's Taxonomy เช่น วิเคราะห์, สังเคราะห์, ประเมินค่า
            </div>
          </div>
        </div>

        <!-- Step 2: 5E Activities -->
        <div v-show="currentStep === 2" class="editor-step">
          <div class="step-header">
            <h2>📚 กิจกรรมการเรียนรู้ (5E)</h2>
            <p>ออกแบบกิจกรรมตามรูปแบบ 5E Model</p>
          </div>

          <div class="activities-editor">
            <!-- Engagement -->
            <div class="activity-section engagement">
              <div class="activity-section-header">
                <span class="phase-badge">🔥 Engagement</span>
                <span class="phase-thai">ขั้นนำเข้าสู่บทเรียน</span>
                <div class="duration-input">
                  <input 
                    v-model.number="form.activities.engagement.duration" 
                    type="number"
                    min="5"
                    max="30"
                  >
                  <span>นาที</span>
                </div>
              </div>
              <textarea 
                v-model="form.activities.engagement.description"
                class="form-control"
                placeholder="อธิบายกิจกรรมนำเข้าสู่บทเรียน..."
                rows="3"
              ></textarea>
              <div class="activity-sub-section">
                <label>คำถามกระตุ้นความคิด</label>
                <div v-for="(q, i) in form.activities.engagement.questions" :key="i" class="inline-input">
                  <input 
                    v-model="form.activities.engagement.questions[i]"
                    class="form-control"
                    placeholder="คำถาม..."
                  >
                  <button class="btn-icon" @click="form.activities.engagement.questions.splice(i, 1)">
                    <span class="material-icons">close</span>
                  </button>
                </div>
                <button class="btn-add-sm" @click="form.activities.engagement.questions.push('')">
                  + เพิ่มคำถาม
                </button>
              </div>
            </div>

            <!-- Exploration -->
            <div class="activity-section exploration">
              <div class="activity-section-header">
                <span class="phase-badge">🔍 Exploration</span>
                <span class="phase-thai">ขั้นสำรวจและค้นหา</span>
                <div class="duration-input">
                  <input 
                    v-model.number="form.activities.exploration.duration" 
                    type="number"
                    min="5"
                    max="30"
                  >
                  <span>นาที</span>
                </div>
              </div>
              <textarea 
                v-model="form.activities.exploration.description"
                class="form-control"
                placeholder="อธิบายกิจกรรมให้นักเรียนสำรวจและค้นหา..."
                rows="3"
              ></textarea>
              <div class="activity-sub-section">
                <label>กิจกรรม</label>
                <div v-for="(a, i) in form.activities.exploration.activities" :key="i" class="inline-input">
                  <input 
                    v-model="form.activities.exploration.activities[i]"
                    class="form-control"
                    placeholder="กิจกรรม..."
                  >
                  <button class="btn-icon" @click="form.activities.exploration.activities.splice(i, 1)">
                    <span class="material-icons">close</span>
                  </button>
                </div>
                <button class="btn-add-sm" @click="form.activities.exploration.activities.push('')">
                  + เพิ่มกิจกรรม
                </button>
              </div>
            </div>

            <!-- Explanation -->
            <div class="activity-section explanation">
              <div class="activity-section-header">
                <span class="phase-badge">💡 Explanation</span>
                <span class="phase-thai">ขั้นอธิบายและลงข้อสรุป</span>
                <div class="duration-input">
                  <input 
                    v-model.number="form.activities.explanation.duration" 
                    type="number"
                    min="5"
                    max="30"
                  >
                  <span>นาที</span>
                </div>
              </div>
              <textarea 
                v-model="form.activities.explanation.description"
                class="form-control"
                placeholder="อธิบายกิจกรรมสรุปความรู้..."
                rows="3"
              ></textarea>
              <div class="activity-sub-section">
                <label>แนวคิดหลัก</label>
                <div v-for="(c, i) in form.activities.explanation.keyConcepts" :key="i" class="inline-input">
                  <input 
                    v-model="form.activities.explanation.keyConcepts[i]"
                    class="form-control"
                    placeholder="แนวคิดหลัก..."
                  >
                  <button class="btn-icon" @click="form.activities.explanation.keyConcepts.splice(i, 1)">
                    <span class="material-icons">close</span>
                  </button>
                </div>
                <button class="btn-add-sm" @click="form.activities.explanation.keyConcepts.push('')">
                  + เพิ่มแนวคิด
                </button>
              </div>
            </div>

            <!-- Elaboration -->
            <div class="activity-section elaboration">
              <div class="activity-section-header">
                <span class="phase-badge">🚀 Elaboration</span>
                <span class="phase-thai">ขั้นขยายความรู้</span>
                <div class="duration-input">
                  <input 
                    v-model.number="form.activities.elaboration.duration" 
                    type="number"
                    min="5"
                    max="30"
                  >
                  <span>นาที</span>
                </div>
              </div>
              <textarea 
                v-model="form.activities.elaboration.description"
                class="form-control"
                placeholder="อธิบายกิจกรรมขยายความรู้และประยุกต์ใช้..."
                rows="3"
              ></textarea>
              <div class="activity-sub-section">
                <label>การบูรณาการ HOTS</label>
                <textarea 
                  v-model="form.activities.elaboration.hotsIntegration"
                  class="form-control"
                  placeholder="อธิบายว่ากิจกรรมนี้ส่งเสริม HOTS อย่างไร..."
                  rows="2"
                ></textarea>
              </div>
            </div>

            <!-- Evaluation -->
            <div class="activity-section evaluation">
              <div class="activity-section-header">
                <span class="phase-badge">📊 Evaluation</span>
                <span class="phase-thai">ขั้นประเมินผล</span>
                <div class="duration-input">
                  <input 
                    v-model.number="form.activities.evaluation.duration" 
                    type="number"
                    min="5"
                    max="30"
                  >
                  <span>นาที</span>
                </div>
              </div>
              <textarea 
                v-model="form.activities.evaluation.description"
                class="form-control"
                placeholder="อธิบายวิธีการประเมินผล..."
                rows="3"
              ></textarea>
              <div class="activity-sub-section">
                <label>วิธีการประเมิน</label>
                <div v-for="(m, i) in form.activities.evaluation.methods" :key="i" class="inline-input">
                  <input 
                    v-model="form.activities.evaluation.methods[i]"
                    class="form-control"
                    placeholder="วิธีการประเมิน..."
                  >
                  <button class="btn-icon" @click="form.activities.evaluation.methods.splice(i, 1)">
                    <span class="material-icons">close</span>
                  </button>
                </div>
                <button class="btn-add-sm" @click="form.activities.evaluation.methods.push('')">
                  + เพิ่มวิธีการ
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Assessment -->
        <div v-show="currentStep === 3" class="editor-step">
          <div class="step-header">
            <h2>📋 เกณฑ์การประเมิน (A.R.C.E.)</h2>
            <p>กำหนดเกณฑ์การประเมินตาม HOTS Rubric</p>
          </div>

          <div class="rubric-editor">
            <div class="rubric-item" v-for="(rubric, key) in form.rubric" :key="key">
              <div class="rubric-header">
                <span class="rubric-icon">{{ getRubricIcon(key) }}</span>
                <span class="rubric-name">{{ getRubricName(key) }}</span>
                <div class="weight-input">
                  <input 
                    v-model.number="rubric.weight"
                    type="number"
                    min="0"
                    max="100"
                  >
                  <span>%</span>
                </div>
              </div>
              <div class="rubric-body">
                <label>เกณฑ์การประเมิน</label>
                <textarea 
                  v-model="rubric.criteria"
                  class="form-control"
                  placeholder="อธิบายเกณฑ์การประเมิน..."
                  rows="2"
                ></textarea>
                
                <label>ระดับคะแนน</label>
                <div class="level-inputs">
                  <div class="level-input" v-for="score in [5, 4, 3, 2, 1]" :key="score">
                    <span class="level-score">{{ score }}</span>
                    <input 
                      v-model="rubric.levels[score]"
                      class="form-control"
                      :placeholder="`คำอธิบายระดับ ${score} คะแนน`"
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Materials & Integration -->
        <div v-show="currentStep === 4" class="editor-step">
          <div class="step-header">
            <h2>📦 สื่อและการบูรณาการ</h2>
            <p>ระบุสื่อการสอนและการบูรณาการข้ามสาระ</p>
          </div>

          <div class="materials-section">
            <h3>สื่อและอุปกรณ์</h3>
            <div v-for="(m, i) in form.materials" :key="i" class="inline-input">
              <input 
                v-model="form.materials[i]"
                class="form-control"
                placeholder="สื่อ/อุปกรณ์..."
              >
              <button class="btn-icon" @click="form.materials.splice(i, 1)">
                <span class="material-icons">close</span>
              </button>
            </div>
            <button class="btn btn-outline btn-sm" @click="form.materials.push('')">
              <span class="material-icons">add</span>
              เพิ่มสื่อ/อุปกรณ์
            </button>
          </div>

          <div class="integration-section">
            <h3>การบูรณาการข้ามสาระ</h3>
            <div class="form-group">
              <label>สาระการเรียนรู้ที่เกี่ยวข้อง</label>
              <div class="chips-input">
                <span 
                  v-for="(s, i) in form.integration.subjects" 
                  :key="i" 
                  class="chip"
                >
                  {{ s }}
                  <button @click="form.integration.subjects.splice(i, 1)">×</button>
                </span>
                <input 
                  type="text"
                  placeholder="พิมพ์แล้วกด Enter"
                  @keyup.enter="addSubject"
                  class="chip-input"
                >
              </div>
            </div>
            <div class="form-group">
              <label>ทักษะศตวรรษที่ 21</label>
              <div class="skills-checkboxes">
                <label v-for="skill in skills21" :key="skill" class="skill-checkbox">
                  <input type="checkbox" :value="skill" v-model="form.integration.skills">
                  {{ skill }}
                </label>
              </div>
            </div>
          </div>

          <div class="notes-section">
            <h3>หมายเหตุ/ข้อเสนอแนะ</h3>
            <textarea 
              v-model="form.notes"
              class="form-control"
              placeholder="หมายเหตุเพิ่มเติมสำหรับครูผู้สอน..."
              rows="4"
            ></textarea>
          </div>
        </div>

        <!-- Navigation -->
        <div class="step-navigation">
          <button 
            class="btn btn-outline" 
            @click="prevStep" 
            :disabled="currentStep === 0"
          >
            <span class="material-icons">chevron_left</span>
            ก่อนหน้า
          </button>
          <div class="step-dots">
            <span 
              v-for="(step, index) in steps" 
              :key="step.id"
              :class="['dot', { active: currentStep === index, completed: isStepCompleted(index) }]"
              @click="goToStep(index)"
            ></span>
          </div>
          <button 
            class="btn btn-primary" 
            @click="nextStep"
            :disabled="currentStep === steps.length - 1"
          >
            ถัดไป
            <span class="material-icons">chevron_right</span>
          </button>
        </div>
      </main>
    </div>

    <!-- Confirm Back Modal -->
    <div v-if="showConfirmBack" class="modal-overlay" @click="showConfirmBack = false">
      <div class="confirm-modal" @click.stop>
        <h3>⚠️ มีการเปลี่ยนแปลงที่ยังไม่บันทึก</h3>
        <p>คุณต้องการบันทึกก่อนออกหรือไม่?</p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="discardAndLeave">ไม่บันทึก</button>
          <button class="btn btn-secondary" @click="showConfirmBack = false">ยกเลิก</button>
          <button class="btn btn-primary" @click="saveAndLeave">บันทึกและออก</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLessonPlanStore } from '@/stores/lessonPlan'
import { useAuthStore } from '@/stores/auth'
import { db } from '@/firebase/config'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const lessonPlanStore = useLessonPlanStore()
const authStore = useAuthStore()

const isEditing = computed(() => !!route.params.id)
const currentStep = ref(0)
const saving = ref(false)
const generating = ref(false)
const showConfirmBack = ref(false)
const hasUnsavedChanges = ref(false)
const courses = ref([])
const originalForm = ref(null)

const steps = [
  { id: 'basic', name: 'ข้อมูลพื้นฐาน', icon: '📋' },
  { id: 'objectives', name: 'จุดประสงค์', icon: '🎯' },
  { id: 'activities', name: 'กิจกรรม 5E', icon: '📚' },
  { id: 'assessment', name: 'การประเมิน', icon: '📊' },
  { id: 'materials', name: 'สื่อและการบูรณาการ', icon: '📦' }
]

const skills21 = [
  'Critical Thinking',
  'Creative Thinking',
  'Communication',
  'Collaboration',
  'Problem Solving',
  'Digital Literacy',
  'Information Literacy'
]

const form = reactive({
  title: '',
  courseId: '',
  gradeLevel: 'ม.4',
  duration: 50,
  topic: '',
  targetLOs: [],
  objectives: [''],
  activities: {
    engagement: {
      duration: 10,
      description: '',
      questions: [''],
      activities: []
    },
    exploration: {
      duration: 15,
      description: '',
      activities: [''],
      materials: []
    },
    explanation: {
      duration: 10,
      description: '',
      keyConcepts: [''],
      activities: []
    },
    elaboration: {
      duration: 10,
      description: '',
      activities: [''],
      hotsIntegration: ''
    },
    evaluation: {
      duration: 5,
      description: '',
      methods: ['']
    }
  },
  rubric: {
    analysis: {
      weight: 25,
      criteria: '',
      levels: { 5: '', 4: '', 3: '', 2: '', 1: '' }
    },
    reasoning: {
      weight: 25,
      criteria: '',
      levels: { 5: '', 4: '', 3: '', 2: '', 1: '' }
    },
    creativity: {
      weight: 25,
      criteria: '',
      levels: { 5: '', 4: '', 3: '', 2: '', 1: '' }
    },
    evidence: {
      weight: 25,
      criteria: '',
      levels: { 5: '', 4: '', 3: '', 2: '', 1: '' }
    }
  },
  materials: [''],
  integration: {
    subjects: [],
    skills: []
  },
  notes: ''
})

const selectedCourseLOs = computed(() => {
  if (!form.courseId) return []
  const course = courses.value.find(c => c.id === form.courseId)
  return course?.learningOutcomes || []
})

// Watch for changes
watch(form, () => {
  if (originalForm.value) {
    hasUnsavedChanges.value = JSON.stringify(form) !== JSON.stringify(originalForm.value)
  }
}, { deep: true })

function getRubricIcon(key) {
  const icons = { analysis: '🔍', reasoning: '🧠', creativity: '💡', evidence: '📚' }
  return icons[key] || '📋'
}

function getRubricName(key) {
  const names = {
    analysis: 'การวิเคราะห์ (Analysis)',
    reasoning: 'การให้เหตุผล (Reasoning)',
    creativity: 'ความคิดสร้างสรรค์ (Creativity)',
    evidence: 'หลักฐานอ้างอิง (Evidence)'
  }
  return names[key] || key
}

function isStepCompleted(index) {
  switch (index) {
    case 0: return form.title && form.courseId
    case 1: return form.objectives.some(o => o.trim())
    case 2: return form.activities.engagement.description || form.activities.exploration.description
    case 3: return Object.values(form.rubric).some(r => r.criteria)
    case 4: return form.materials.some(m => m.trim())
    default: return false
  }
}

function goToStep(index) {
  currentStep.value = index
}

function nextStep() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function addObjective() {
  form.objectives.push('')
}

function removeObjective(index) {
  form.objectives.splice(index, 1)
}

function addSubject(e) {
  const value = e.target.value.trim()
  if (value && !form.integration.subjects.includes(value)) {
    form.integration.subjects.push(value)
    e.target.value = ''
  }
}

function confirmBack() {
  if (hasUnsavedChanges.value) {
    showConfirmBack.value = true
  } else {
    router.push('/lesson-plans')
  }
}

function discardAndLeave() {
  router.push('/lesson-plans')
}

async function saveAndLeave() {
  await saveDraft()
  router.push('/lesson-plans')
}

async function saveDraft() {
  await saveForm('draft')
}

async function saveAndPublish() {
  await saveForm('published')
}

async function saveForm(status) {
  if (saving.value) return
  
  try {
    saving.value = true
    
    const planData = {
      ...form,
      status,
      components: {
        objectives: form.objectives.filter(o => o.trim()),
        activities: form.activities,
        materials: form.materials.filter(m => m.trim()),
        integration: form.integration,
        notes: form.notes
      },
      assessment: {
        rubric: form.rubric
      }
    }

    if (isEditing.value) {
      await lessonPlanStore.updatePlan(route.params.id, planData)
    } else {
      const newPlan = await lessonPlanStore.createPlan(planData)
      router.replace(`/lesson-plans/${newPlan.id}/edit`)
    }

    hasUnsavedChanges.value = false
    originalForm.value = JSON.parse(JSON.stringify(form))
    
    if (status === 'published') {
      alert('บันทึกและเผยแพร่เรียบร้อยแล้ว!')
      router.push('/lesson-plans')
    } else {
      alert('บันทึกแบบร่างเรียบร้อยแล้ว!')
    }
  } catch (error) {
    console.error('Error saving:', error)
    alert('เกิดข้อผิดพลาดในการบันทึก')
  } finally {
    saving.value = false
  }
}

async function generateCurrentSection() {
  // TODO: Implement AI generation for current section
  generating.value = true
  setTimeout(() => {
    alert('ฟีเจอร์ AI กำลังพัฒนา')
    generating.value = false
  }, 1000)
}

async function generateAllSections() {
  // TODO: Implement AI generation for all sections
  generating.value = true
  setTimeout(() => {
    alert('ฟีเจอร์ AI กำลังพัฒนา')
    generating.value = false
  }, 1000)
}

async function loadCourses() {
  try {
    const q = query(
      collection(db, 'courses'),
      where('teacherId', '==', authStore.user?.uid)
    )
    const snapshot = await getDocs(q)
    courses.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading courses:', error)
  }
}

async function loadPlan() {
  if (!route.params.id) return
  
  try {
    const docRef = doc(db, 'lessonPlans', route.params.id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      form.title = data.title || ''
      form.courseId = data.courseId || ''
      form.gradeLevel = data.gradeLevel || 'ม.4'
      form.duration = data.duration || 50
      form.topic = data.topic || ''
      form.targetLOs = data.targetLOs || []
      form.objectives = data.components?.objectives?.length ? data.components.objectives : ['']
      
      if (data.components?.activities) {
        Object.assign(form.activities, data.components.activities)
      }
      
      if (data.assessment?.rubric) {
        Object.assign(form.rubric, data.assessment.rubric)
      }
      
      form.materials = data.components?.materials?.length ? data.components.materials : ['']
      form.integration = data.components?.integration || { subjects: [], skills: [] }
      form.notes = data.components?.notes || ''
      
      originalForm.value = JSON.parse(JSON.stringify(form))
    }
  } catch (error) {
    console.error('Error loading plan:', error)
  }
}

onMounted(async () => {
  await loadCourses()
  await loadPlan()
  originalForm.value = JSON.parse(JSON.stringify(form))
})
</script>

<style scoped>
.lesson-plan-editor {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Navbar */
.top-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
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

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--bg-primary);
  color: var(--primary);
}

.brand-icon {
  font-size: 1.25rem;
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

.unsaved-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
  border-radius: 20px;
  font-size: 0.8rem;
}

.unsaved-badge .material-icons {
  font-size: 1rem;
}

/* Editor Container */
.editor-container {
  display: flex;
  min-height: calc(100vh - 60px);
}

/* Sidebar */
.editor-sidebar {
  width: 280px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.steps-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  color: var(--text-secondary);
}

.step-item:hover {
  background: var(--bg-primary);
}

.step-item.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.1));
  color: var(--primary);
}

.step-item.completed .step-number {
  background: #10b981;
  color: white;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.step-icon {
  font-size: 1.25rem;
}

.step-name {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
}

.step-check {
  color: #10b981;
  font-weight: bold;
}

.ai-assist-section {
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.ai-assist-section h4 {
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.btn-ai {
  width: 100%;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: white;
  margin-bottom: 0.5rem;
}

/* Editor Main */
.editor-main {
  flex: 1;
  padding: 2rem;
  max-width: 900px;
}

.editor-step {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.step-header {
  margin-bottom: 2rem;
}

.step-header h2 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.step-header p {
  color: var(--text-secondary);
}

/* Forms */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
}

.required {
  color: #ef4444;
}

.form-control {
  padding: 0.75rem 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: all 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.helper-text {
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-style: italic;
}

/* LO Selector */
.los-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  padding: 0.5rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.lo-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.lo-checkbox:hover {
  background: var(--bg-secondary);
}

.lo-checkbox input {
  margin-top: 0.25rem;
}

.lo-code {
  font-weight: 600;
  color: var(--primary);
  white-space: nowrap;
}

.lo-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Objectives Editor */
.objectives-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.objective-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.obj-number {
  font-weight: 600;
  color: var(--primary);
  min-width: 24px;
}

.objective-item .form-control {
  flex: 1;
}

/* Tip Box */
.tip-box {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 10px;
  margin-top: 1.5rem;
}

.tip-icon {
  font-size: 1.25rem;
}

.tip-content {
  font-size: 0.875rem;
  line-height: 1.5;
}

/* Activities Editor */
.activities-editor {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.activity-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.activity-section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.activity-section.engagement .activity-section-header {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(249, 115, 22, 0.05));
}

.activity-section.exploration .activity-section-header {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(14, 165, 233, 0.05));
}

.activity-section.explanation .activity-section-header {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(234, 179, 8, 0.05));
}

.activity-section.elaboration .activity-section-header {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05));
}

.activity-section.evaluation .activity-section-header {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.05));
}

.phase-badge {
  font-weight: 700;
  font-size: 1rem;
}

.phase-thai {
  color: var(--text-secondary);
  font-size: 0.875rem;
  flex: 1;
}

.duration-input {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.duration-input input {
  width: 60px;
  padding: 0.375rem 0.5rem;
  text-align: center;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
}

.duration-input span {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.activity-section > textarea,
.activity-section > .activity-sub-section {
  margin: 1.25rem;
}

.activity-sub-section {
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.activity-sub-section label {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.inline-input {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.inline-input .form-control {
  flex: 1;
  padding: 0.5rem 0.75rem;
}

.btn-add-sm {
  background: transparent;
  border: 1px dashed var(--border-color);
  color: var(--text-secondary);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.btn-add-sm:hover {
  border-color: var(--primary);
  color: var(--primary);
}

/* Rubric Editor */
.rubric-editor {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.rubric-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.rubric-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.05));
  border-bottom: 1px solid var(--border-color);
}

.rubric-icon {
  font-size: 1.25rem;
}

.rubric-name {
  flex: 1;
  font-weight: 600;
}

.weight-input {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.weight-input input {
  width: 50px;
  padding: 0.375rem 0.5rem;
  text-align: center;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
}

.rubric-body {
  padding: 1.25rem;
}

.rubric-body label {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  margin-top: 1rem;
}

.rubric-body label:first-child {
  margin-top: 0;
}

.level-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.level-input {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.level-score {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.level-input .form-control {
  flex: 1;
  padding: 0.5rem 0.75rem;
}

/* Materials & Integration */
.materials-section,
.integration-section,
.notes-section {
  margin-bottom: 2rem;
}

.materials-section h3,
.integration-section h3,
.notes-section h3 {
  font-size: 1rem;
  margin-bottom: 1rem;
}

.chips-input {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.chip {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: rgba(102, 126, 234, 0.15);
  color: var(--primary);
  border-radius: 20px;
  font-size: 0.8rem;
}

.chip button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.chip-input {
  flex: 1;
  min-width: 150px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.chip-input:focus {
  outline: none;
}

.skills-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.skill-checkbox {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-primary);
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.skill-checkbox:has(input:checked) {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

/* Step Navigation */
.step-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
}

.step-dots {
  display: flex;
  gap: 0.5rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

.dot.active {
  background: var(--primary);
  transform: scale(1.2);
}

.dot.completed {
  background: #10b981;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 0.875rem;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
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

.btn-secondary {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn .material-icons {
  font-size: 1.125rem;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--bg-primary);
  color: var(--primary);
}

.btn-icon.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.btn-icon .material-icons {
  font-size: 1.125rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.confirm-modal {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
}

.confirm-modal h3 {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
}

.confirm-modal p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* Responsive */
@media (max-width: 1024px) {
  .editor-sidebar {
    width: 220px;
  }

  .step-name {
    display: none;
  }
}

@media (max-width: 768px) {
  .editor-container {
    flex-direction: column;
  }

  .editor-sidebar {
    width: 100%;
    flex-direction: row;
    padding: 1rem;
    gap: 1rem;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .steps-nav {
    flex-direction: row;
    gap: 0.25rem;
  }

  .step-item {
    padding: 0.5rem 0.75rem;
    flex-direction: column;
    gap: 0.25rem;
  }

  .step-number {
    display: none;
  }

  .step-icon {
    font-size: 1.5rem;
  }

  .ai-assist-section {
    display: none;
  }

  .editor-main {
    padding: 1rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .top-navbar {
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .nav-actions {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .unsaved-badge {
    display: none;
  }
}
</style>
