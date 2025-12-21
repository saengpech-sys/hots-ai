<template>
  <div class="worksheet-editor-view">
    <!-- Top Navigation -->
    <nav class="top-navbar">
      <div class="nav-brand">
        <router-link to="/teacher/worksheets" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <span class="brand-icon">✏️</span>
        <span class="brand-text">แก้ไขใบงาน</span>
      </div>
      <div class="nav-actions">
        <button class="btn btn-outline" @click="previewWorksheet" :disabled="saving">
          <span class="material-icons">visibility</span>
          ดูตัวอย่าง
        </button>
        <button class="btn btn-primary" @click="saveWorksheet" :disabled="saving">
          <span v-if="saving" class="material-icons spin">sync</span>
          <span v-else class="material-icons">save</span>
          {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
        </button>
      </div>
    </nav>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
      <p>กำลังโหลดใบงาน...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-container">
      <span class="material-icons">error</span>
      <h3>เกิดข้อผิดพลาด</h3>
      <p>{{ error }}</p>
      <router-link to="/teacher/worksheets" class="btn btn-primary">กลับหน้าจัดการใบงาน</router-link>
    </div>

    <!-- Editor Content -->
    <div v-else-if="worksheet" class="editor-container">
      <!-- Metadata Section -->
      <section class="editor-section">
        <h2 class="section-title">
          <span class="material-icons">info</span>
          ข้อมูลใบงาน
        </h2>
        <div class="form-grid">
          <div class="form-group">
            <label>ชื่อใบงาน *</label>
            <input type="text" v-model="worksheet.metadata.title" placeholder="ชื่อใบงาน">
          </div>
          <div class="form-group">
            <label>คำอธิบาย</label>
            <textarea v-model="worksheet.metadata.description" rows="2" placeholder="คำอธิบายใบงาน"></textarea>
          </div>
          <div class="form-group half">
            <label>ระดับชั้น</label>
            <input type="text" v-model="worksheet.metadata.gradeLevel" placeholder="เช่น ม.4">
          </div>
          <div class="form-group half">
            <label>ระยะเวลา (นาที)</label>
            <input type="number" v-model.number="worksheet.metadata.duration" min="10" max="180">
          </div>
        </div>
      </section>

      <!-- 🔄 Retry Settings Section -->
      <section class="editor-section retry-section">
        <h2 class="section-title">
          <span class="material-icons">replay</span>
          ตั้งค่าการทำซ้ำ
        </h2>
        <div class="retry-settings">
          <div class="form-group toggle-group">
            <label class="toggle-label">
              <input type="checkbox" v-model="worksheet.retrySettings.allowRetry" class="toggle-input">
              <span class="toggle-slider"></span>
              <span class="toggle-text">อนุญาตให้นักเรียนทำซ้ำได้</span>
            </label>
          </div>

          <div v-if="worksheet.retrySettings.allowRetry" class="retry-options">
            <div class="form-row">
              <div class="form-group third">
                <label>จำนวนครั้งสูงสุด</label>
                <div class="input-with-hint">
                  <input type="number" v-model.number="worksheet.retrySettings.maxAttempts" min="0" max="10" class="form-input">
                  <span class="hint">(0 = ไม่จำกัด)</span>
                </div>
              </div>
              <div class="form-group third">
                <label>วิธีคิดคะแนน</label>
                <select v-model="worksheet.retrySettings.scoreMode" class="form-select">
                  <option value="best">🏆 ใช้คะแนนที่ดีที่สุด</option>
                  <option value="latest">🔄 ใช้คะแนนครั้งล่าสุด</option>
                  <option value="average">📊 ใช้ค่าเฉลี่ยทุกครั้ง</option>
                  <option value="first">1️⃣ ใช้คะแนนครั้งแรกเท่านั้น</option>
                </select>
              </div>
              <div class="form-group third">
                <label>รอก่อนทำซ้ำ (นาที)</label>
                <div class="input-with-hint">
                  <input type="number" v-model.number="worksheet.retrySettings.cooldownMinutes" min="0" max="1440" class="form-input">
                  <span class="hint">(0 = ทันที)</span>
                </div>
              </div>
            </div>
            <div class="form-group toggle-group">
              <label class="toggle-label">
                <input type="checkbox" v-model="worksheet.retrySettings.showPreviousScore" class="toggle-input">
                <span class="toggle-slider"></span>
                <span class="toggle-text">แสดงคะแนนครั้งก่อนให้นักเรียนเห็น</span>
              </label>
            </div>
            <div class="form-group toggle-group">
              <label class="toggle-label">
                <input type="checkbox" v-model="worksheet.retrySettings.showPreviousFeedback" class="toggle-input">
                <span class="toggle-slider"></span>
                <span class="toggle-text">แสดง Feedback ครั้งก่อนเพื่อการเรียนรู้</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <!-- Instructions Section -->
      <!-- Instructions Section -->
      <section class="editor-section instructions-section">
        <h2 class="section-title">
          <span class="material-icons">assignment</span>
          คำชี้แจง
        </h2>
        <div class="instructions-box">
          <textarea v-model="worksheet.instructions" rows="4" placeholder="คำชี้แจงการทำใบงาน เช่น ให้นักเรียนตอบคำถามต่อไปนี้โดยใช้ข้อมูลจากการสำรวจและวิเคราะห์ที่ได้ทำในห้องเรียน..."></textarea>
          <div class="instructions-hint">
            <span class="material-icons">lightbulb</span>
            คำชี้แจงที่ดีควรบอกเป้าหมาย วิธีการตอบ และเกณฑ์การให้คะแนน
          </div>
        </div>
      </section>

      <!-- Sections & Questions -->
      <section class="editor-section">
        <h2 class="section-title">
          <span class="material-icons">quiz</span>
          คำถาม ({{ getTotalQuestions }} ข้อ)
        </h2>

        <div v-for="(section, sIndex) in worksheet.sections" :key="section.id" class="question-section">
          <div class="section-header">
            <div class="section-info">
              <span class="phase-badge" :class="section.phase">{{ getPhaseEmoji(section.phase) }}</span>
              <input type="text" v-model="section.title" class="section-title-input" placeholder="ชื่อส่วน">
            </div>
            <div class="section-actions">
              <button class="btn-icon" @click="addQuestion(sIndex)" title="เพิ่มคำถาม">
                <span class="material-icons">add</span>
              </button>
              <button class="btn-icon danger" @click="removeSection(sIndex)" title="ลบส่วน" v-if="worksheet.sections.length > 1">
                <span class="material-icons">delete</span>
              </button>
            </div>
          </div>

          <div class="section-description">
            <input type="text" v-model="section.description" placeholder="คำอธิบายส่วนนี้">
          </div>

          <!-- Questions in Section -->
          <div v-for="(question, qIndex) in section.questions" :key="question.id" class="question-card">
            <div class="question-header">
              <span class="question-number">ข้อ {{ getGlobalQuestionNumber(sIndex, qIndex) }}</span>
              <div class="question-badges">
                <span class="arce-badge" :class="question.arceFocus">{{ getArceLabel(question.arceFocus) }}</span>
                <span class="type-badge">{{ getTypeLabel(question.type) }}</span>
                <span class="score-badge">{{ question.maxScore }} คะแนน</span>
              </div>
              <div class="question-actions">
                <button class="btn-icon" @click="moveQuestion(sIndex, qIndex, -1)" :disabled="qIndex === 0" title="ย้ายขึ้น">
                  <span class="material-icons">arrow_upward</span>
                </button>
                <button class="btn-icon" @click="moveQuestion(sIndex, qIndex, 1)" :disabled="qIndex === section.questions.length - 1" title="ย้ายลง">
                  <span class="material-icons">arrow_downward</span>
                </button>
                <button class="btn-icon danger" @click="removeQuestion(sIndex, qIndex)" title="ลบคำถาม">
                  <span class="material-icons">delete</span>
                </button>
              </div>
            </div>

            <div class="question-body">
              <!-- Question Type -->
              <div class="form-row">
                <div class="form-group third">
                  <label>ประเภทคำถาม</label>
                  <select v-model="question.type">
                    <option value="open_ended">เขียนตอบ</option>
                    <option value="short_text">ตอบสั้นๆ</option>
                    <option value="multiple_choice">เลือกตอบ</option>
                    <option value="multi_choice">เลือกหลายข้อ</option>
                    <option value="table">ตาราง</option>
                    <option value="rating_scale">Rating Scale</option>
                  </select>
                </div>
                <div class="form-group third">
                  <label>A.R.C.E. Focus</label>
                  <select v-model="question.arceFocus">
                    <option value="analysis">🔍 วิเคราะห์</option>
                    <option value="reasoning">🧠 เหตุผล</option>
                    <option value="creativity">💡 สร้างสรรค์</option>
                    <option value="evidence">📚 หลักฐาน</option>
                  </select>
                </div>
                <div class="form-group third">
                  <label>คะแนน</label>
                  <input type="number" v-model.number="question.maxScore" min="1" max="20">
                </div>
              </div>

              <!-- Question Prompt -->
              <div class="form-group">
                <label>คำถาม *</label>
                <textarea v-model="question.prompt" rows="2" placeholder="พิมพ์คำถาม..."></textarea>
              </div>

              <!-- Context (optional) -->
              <div class="form-group">
                <label>บริบท/สถานการณ์ (ไม่บังคับ)</label>
                <textarea v-model="question.context" rows="2" placeholder="บริบทหรือสถานการณ์ประกอบคำถาม"></textarea>
              </div>

              <!-- Multiple Choice Options -->
              <div v-if="question.type === 'multiple_choice' || question.type === 'multi_choice'" class="options-editor">
                <label>ตัวเลือก</label>
                <div v-for="(opt, oIndex) in question.options" :key="opt.id" class="option-row">
                  <input type="radio" v-if="question.type === 'multiple_choice'" 
                         :name="`correct_${question.id}`" 
                         :value="opt.id" 
                         v-model="question.correctAnswer">
                  <input type="checkbox" v-else 
                         :value="opt.id" 
                         v-model="question.correctAnswers">
                  <input type="text" v-model="opt.text" :placeholder="`ตัวเลือก ${String.fromCharCode(65 + oIndex)}`">
                  <button class="btn-icon mini" @click="removeOption(question, oIndex)" v-if="question.options.length > 2">
                    <span class="material-icons">close</span>
                  </button>
                </div>
                <button class="btn btn-sm btn-outline" @click="addOption(question)">
                  <span class="material-icons">add</span>
                  เพิ่มตัวเลือก
                </button>
              </div>

              <!-- Table Settings -->
              <div v-if="question.type === 'table'" class="table-editor">
                <label>การตั้งค่าตาราง</label>
                <div class="form-row">
                  <div class="form-group">
                    <label>หัวตาราง (คั่นด้วย ,)</label>
                    <input type="text" :value="question.table?.headers?.join(', ')" 
                           @input="updateTableHeaders(question, $event.target.value)"
                           placeholder="หัวข้อ 1, หัวข้อ 2, หัวข้อ 3">
                  </div>
                  <div class="form-group half">
                    <label>จำนวนแถว</label>
                    <input type="number" v-model.number="question.table.rows" min="1" max="20">
                  </div>
                </div>
              </div>

              <!-- Rating Scale Settings -->
              <div v-if="question.type === 'rating_scale'" class="rating-editor">
                <div class="form-row">
                  <div class="form-group half">
                    <label>คะแนนต่ำสุด</label>
                    <input type="number" v-model.number="question.scale.min" min="0" max="10">
                  </div>
                  <div class="form-group half">
                    <label>คะแนนสูงสุด</label>
                    <input type="number" v-model.number="question.scale.max" min="1" max="10">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group half">
                    <label>Label ต่ำสุด</label>
                    <input type="text" v-model="question.scale.minLabel" placeholder="น้อยที่สุด">
                  </div>
                  <div class="form-group half">
                    <label>Label สูงสุด</label>
                    <input type="text" v-model="question.scale.maxLabel" placeholder="มากที่สุด">
                  </div>
                </div>
              </div>

              <!-- Open-ended Settings -->
              <div v-if="question.type === 'open_ended'" class="open-ended-settings">
                <div class="form-row">
                  <div class="form-group half">
                    <label>ตัวอักษรขั้นต่ำ</label>
                    <input type="number" v-model.number="question.minCharacters" min="0" max="1000">
                  </div>
                  <div class="form-group">
                    <label>Hints (แยกด้วย |)</label>
                    <input type="text" :value="question.hints?.join(' | ')" 
                           @input="updateHints(question, $event.target.value)"
                           placeholder="คำแนะนำ 1 | คำแนะนำ 2">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Add Question Button -->
          <button class="btn btn-outline add-question-btn" @click="addQuestion(sIndex)">
            <span class="material-icons">add</span>
            เพิ่มคำถามในส่วนนี้
          </button>
        </div>

        <!-- Add Section Button -->
        <button class="btn btn-outline add-section-btn" @click="addSection">
          <span class="material-icons">add</span>
          เพิ่มส่วนใหม่
        </button>
      </section>

      <!-- Self Reflection Section -->
      <section class="editor-section">
        <h2 class="section-title">
          <span class="material-icons">psychology</span>
          คำถามสะท้อนคิด
          <label class="toggle-switch">
            <input type="checkbox" v-model="worksheet.selfReflection.enabled">
            <span class="slider"></span>
          </label>
        </h2>
        <div v-if="worksheet.selfReflection.enabled" class="reflection-editor">
          <div class="form-group">
            <label>คำถามนำ</label>
            <input type="text" v-model="worksheet.selfReflection.prompt" placeholder="สะท้อนความคิดของคุณจากการทำใบงานนี้">
          </div>
          <div class="form-group">
            <label>คำถามย่อย (แยกด้วย |)</label>
            <textarea :value="worksheet.selfReflection.questions?.join(' | ')" 
                      @input="updateReflectionQuestions($event.target.value)"
                      rows="3" 
                      placeholder="สิ่งที่ได้เรียนรู้วันนี้คือ... | สิ่งที่ยังไม่เข้าใจคือ..."></textarea>
          </div>
        </div>
      </section>

      <!-- Settings Section -->
      <section class="editor-section">
        <h2 class="section-title">
          <span class="material-icons">settings</span>
          การตั้งค่า
        </h2>
        <div class="settings-grid">
          <label class="setting-item">
            <input type="checkbox" v-model="worksheet.settings.shuffleQuestions">
            <span>สลับลำดับคำถาม</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="worksheet.settings.shuffleOptions">
            <span>สลับลำดับตัวเลือก</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="worksheet.settings.showHints">
            <span>แสดง Hints</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="worksheet.settings.blockCopyPaste">
            <span>บล็อก Copy/Paste</span>
          </label>
          <label class="setting-item">
            <input type="checkbox" v-model="worksheet.settings.allowLateSubmission">
            <span>อนุญาตส่งหลังเวลา</span>
          </label>
        </div>
        <div class="form-group half">
          <label>จำกัดเวลา (นาที, 0 = ไม่จำกัด)</label>
          <input type="number" v-model.number="worksheet.settings.timeLimit" min="0" max="300">
        </div>
      </section>
    </div>

    <!-- Preview Modal -->
    <div v-if="showPreview" class="modal-overlay" @click.self="showPreview = false">
      <div class="preview-modal">
        <div class="modal-header">
          <h3>ตัวอย่างใบงาน</h3>
          <button class="btn-icon" @click="showPreview = false">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="preview-content">
            <h2>{{ worksheet.metadata?.title }}</h2>
            <p class="preview-desc">{{ worksheet.metadata?.description }}</p>
            <div class="preview-info">
              <span>⏱️ {{ worksheet.metadata?.duration }} นาที</span>
              <span>📝 {{ getTotalQuestions }} คำถาม</span>
              <span>💯 {{ getTotalScore }} คะแนน</span>
            </div>
            <hr>
            <p class="preview-instructions">{{ worksheet.instructions }}</p>
            <div v-for="section in worksheet.sections" :key="section.id" class="preview-section">
              <h4>{{ section.title }}</h4>
              <p class="section-desc">{{ section.description }}</p>
              <div v-for="(q, idx) in section.questions" :key="q.id" class="preview-question">
                <strong>{{ idx + 1 }}. {{ q.prompt }}</strong>
                <p v-if="q.context" class="q-context">💡 {{ q.context }}</p>
                <div v-if="q.type === 'multiple_choice' || q.type === 'multi_choice'" class="preview-options">
                  <div v-for="opt in q.options" :key="opt.id" class="preview-option">
                    {{ opt.id }}. {{ opt.text }}
                  </div>
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
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// State
const worksheet = ref(null)
const loading = ref(true)
const saving = ref(false)
const error = ref(null)
const showPreview = ref(false)

// Computed
const getTotalQuestions = computed(() => {
  if (!worksheet.value?.sections) return 0
  return worksheet.value.sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0)
})

const getTotalScore = computed(() => {
  if (!worksheet.value?.sections) return 0
  return worksheet.value.sections.reduce((sum, s) => 
    sum + (s.questions?.reduce((qSum, q) => qSum + (q.maxScore || 0), 0) || 0), 0)
})

// Methods
function getPhaseEmoji(phase) {
  const emojis = {
    engagement: '🎯',
    exploration: '🔍',
    explanation: '💡',
    elaboration: '🚀',
    evaluation: '📊'
  }
  return emojis[phase] || '📝'
}

function getArceLabel(arce) {
  const labels = {
    analysis: '🔍 วิเคราะห์',
    reasoning: '🧠 เหตุผล',
    creativity: '💡 สร้างสรรค์',
    evidence: '📚 หลักฐาน'
  }
  return labels[arce] || arce
}

function getTypeLabel(type) {
  const labels = {
    open_ended: 'เขียนตอบ',
    short_text: 'ตอบสั้น',
    multiple_choice: 'เลือกตอบ',
    multi_choice: 'เลือกหลายข้อ',
    table: 'ตาราง',
    rating_scale: 'Rating'
  }
  return labels[type] || type
}

function getGlobalQuestionNumber(sIndex, qIndex) {
  let num = qIndex + 1
  for (let i = 0; i < sIndex; i++) {
    num += worksheet.value.sections[i].questions?.length || 0
  }
  return num
}

function addSection() {
  const newId = `section_${Date.now()}`
  worksheet.value.sections.push({
    id: newId,
    title: 'ส่วนใหม่',
    description: '',
    phase: 'evaluation',
    arceFocus: ['analysis'],
    questions: []
  })
}

function removeSection(sIndex) {
  if (confirm('ต้องการลบส่วนนี้และคำถามทั้งหมดใช่ไหม?')) {
    worksheet.value.sections.splice(sIndex, 1)
  }
}

function addQuestion(sIndex) {
  const section = worksheet.value.sections[sIndex]
  const newId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
  section.questions.push({
    id: newId,
    type: 'open_ended',
    prompt: '',
    context: '',
    arceFocus: section.arceFocus?.[0] || 'analysis',
    bloomLevel: 'analyze',
    required: true,
    minCharacters: 50,
    maxScore: 5,
    hints: [],
    rubric: {
      '5': 'ตอบครบถ้วน วิเคราะห์ลึกซึ้ง',
      '4': 'ตอบได้ดี วิเคราะห์ได้',
      '3': 'ตอบพอใช้',
      '2': 'ตอบไม่ครบ',
      '1': 'พยายามตอบ',
      '0': 'ไม่ตอบ'
    }
  })
}

function removeQuestion(sIndex, qIndex) {
  if (confirm('ต้องการลบคำถามนี้ใช่ไหม?')) {
    worksheet.value.sections[sIndex].questions.splice(qIndex, 1)
  }
}

function moveQuestion(sIndex, qIndex, direction) {
  const questions = worksheet.value.sections[sIndex].questions
  const newIndex = qIndex + direction
  if (newIndex < 0 || newIndex >= questions.length) return
  const temp = questions[qIndex]
  questions[qIndex] = questions[newIndex]
  questions[newIndex] = temp
}

function addOption(question) {
  if (!question.options) question.options = []
  const nextLetter = String.fromCharCode(97 + question.options.length) // a, b, c, d...
  question.options.push({
    id: nextLetter,
    text: ''
  })
}

function removeOption(question, oIndex) {
  question.options.splice(oIndex, 1)
  // Re-assign IDs
  question.options.forEach((opt, idx) => {
    opt.id = String.fromCharCode(97 + idx)
  })
}

function updateTableHeaders(question, value) {
  if (!question.table) question.table = { headers: [], rows: 3, editable: true }
  question.table.headers = value.split(',').map(h => h.trim()).filter(h => h)
}

function updateHints(question, value) {
  question.hints = value.split('|').map(h => h.trim()).filter(h => h)
}

function updateReflectionQuestions(value) {
  worksheet.value.selfReflection.questions = value.split('|').map(q => q.trim()).filter(q => q)
}

function previewWorksheet() {
  showPreview.value = true
}

async function saveWorksheet() {
  if (!worksheet.value?.metadata?.title) {
    alert('กรุณาใส่ชื่อใบงาน')
    return
  }

  saving.value = true
  try {
    // Recalculate totals
    const totalQuestions = getTotalQuestions.value
    const maxScore = getTotalScore.value
    
    worksheet.value.metadata.totalQuestions = totalQuestions
    worksheet.value.metadata.maxScore = maxScore
    if (worksheet.value.scoring) {
      worksheet.value.scoring.totalPoints = maxScore
    }

    // Update Firestore
    const wsRef = doc(db, 'eWorksheets', route.params.id)
    await updateDoc(wsRef, {
      ...worksheet.value,
      // Also update top-level fields
      title: worksheet.value.metadata.title,
      updatedAt: serverTimestamp()
    })

    alert('บันทึกใบงานสำเร็จ!')
  } catch (err) {
    console.error('Error saving worksheet:', err)
    alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message)
  } finally {
    saving.value = false
  }
}

async function loadWorksheet() {
  try {
    const wsRef = doc(db, 'eWorksheets', route.params.id)
    const wsDoc = await getDoc(wsRef)

    if (!wsDoc.exists()) {
      error.value = 'ไม่พบใบงานที่ต้องการแก้ไข'
      return
    }

    const data = wsDoc.data()
    
    // Check ownership
    const teacherId = data.teacherId || data.metadata?.teacherId
    if (teacherId !== authStore.user?.uid) {
      error.value = 'คุณไม่มีสิทธิ์แก้ไขใบงานนี้'
      return
    }

    // Initialize missing fields
    worksheet.value = {
      ...data,
      metadata: data.metadata || {},
      instructions: data.instructions || '',
      sections: data.sections || [],
      settings: data.settings || {
        shuffleQuestions: false,
        shuffleOptions: true,
        showHints: true,
        blockCopyPaste: true,
        timeLimit: 50,
        allowLateSubmission: false
      },
      // 🔄 Retry Settings
      retrySettings: data.retrySettings || {
        allowRetry: true,
        maxAttempts: 3,
        scoreMode: 'best',
        cooldownMinutes: 0,
        showPreviousScore: true,
        showPreviousFeedback: true
      },
      selfReflection: data.selfReflection || {
        enabled: false,
        prompt: '',
        questions: []
      },
      scoring: data.scoring || {}
    }

    // Initialize scale/table for existing questions
    worksheet.value.sections.forEach(section => {
      section.questions?.forEach(q => {
        if (q.type === 'rating_scale' && !q.scale) {
          q.scale = { min: 1, max: 5, minLabel: 'น้อยที่สุด', maxLabel: 'มากที่สุด' }
        }
        if (q.type === 'table' && !q.table) {
          q.table = { headers: [], rows: 3, editable: true }
        }
        if (q.type === 'multiple_choice' && !q.correctAnswers) {
          q.correctAnswers = []
        }
      })
    })
  } catch (err) {
    console.error('Error loading worksheet:', err)
    error.value = 'เกิดข้อผิดพลาดในการโหลดใบงาน: ' + err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadWorksheet()
})
</script>

<style scoped>
.worksheet-editor-view {
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
  color: var(--text-secondary);
  text-decoration: none;
}

.back-link:hover { color: var(--primary); }

.brand-icon { font-size: 1.5rem; }
.brand-text { font-size: 1.25rem; font-weight: 600; }

.nav-actions {
  display: flex;
  gap: 0.75rem;
}

/* Loading & Error */
.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.error-container .material-icons {
  font-size: 4rem;
  color: var(--danger);
  margin-bottom: 1rem;
}

/* Editor Container */
.editor-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

/* Editor Sections */
.editor-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-color);
}

/* 🔄 Retry Settings Section */
.retry-section {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%);
  border: 2px solid rgba(16, 185, 129, 0.3);
}

.retry-settings {
  padding: 0.5rem 0;
}

.retry-options {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px dashed var(--border-color);
}

.toggle-group {
  margin-bottom: 0.75rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
}

.toggle-input {
  display: none;
}

.toggle-slider {
  width: 48px;
  height: 26px;
  background: #94a3b8;
  border-radius: 13px;
  position: relative;
  transition: background 0.3s;
  flex-shrink: 0;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  background: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.toggle-input:checked + .toggle-slider {
  background: #10b981;
}

.toggle-input:checked + .toggle-slider::after {
  transform: translateX(22px);
}

.toggle-text {
  font-size: 0.95rem;
  color: var(--text-primary);
}

.input-with-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input-with-hint .hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.form-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.form-group.third {
  flex: 1;
  min-width: 150px;
}

/* Instructions Section - Highlighted */
.instructions-section {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border: 2px solid rgba(59, 130, 246, 0.3);
  position: relative;
}

.instructions-section::before {
  content: '📝';
  position: absolute;
  top: -12px;
  left: 20px;
  background: var(--bg-secondary);
  padding: 0 8px;
  font-size: 1.25rem;
}

.instructions-box {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 1rem;
  border: 1px dashed var(--border-color);
}

.instructions-box textarea {
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.6;
  resize: vertical;
  min-height: 100px;
}

.instructions-box textarea:focus {
  outline: none;
  background: rgba(59, 130, 246, 0.05);
}

.instructions-box textarea::placeholder {
  color: var(--text-secondary);
  font-style: italic;
}

.instructions-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.instructions-hint .material-icons {
  font-size: 1rem;
  color: #f59e0b;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.section-title .material-icons {
  color: var(--primary);
}

/* Form Elements */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group.half {
  grid-column: span 1;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group.third {
  flex: 1;
}

/* Question Section */
.question-section {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.section-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.phase-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 1.25rem;
}

.section-title-input {
  border: none;
  background: transparent;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  padding: 0.25rem;
}

.section-title-input:focus {
  outline: none;
  border-bottom: 2px solid var(--primary);
}

.section-description input {
  width: 100%;
  padding: 0.5rem;
  border: 1px dashed var(--border-color);
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.section-actions {
  display: flex;
  gap: 0.5rem;
}

/* Question Card */
.question-card {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 1rem;
  margin: 0.75rem 0;
  border: 1px solid var(--border-color);
}

.question-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.question-number {
  font-weight: 600;
  color: var(--primary);
}

.question-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.arce-badge,
.type-badge,
.score-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: var(--bg-primary);
}

.arce-badge.analysis { color: #3b82f6; }
.arce-badge.reasoning { color: #8b5cf6; }
.arce-badge.creativity { color: #f59e0b; }
.arce-badge.evidence { color: #10b981; }

.question-actions {
  margin-left: auto;
  display: flex;
  gap: 0.25rem;
}

/* Options Editor */
.options-editor {
  margin-top: 1rem;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.option-row input[type="text"] {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-outline:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover:not(:disabled) {
  background: var(--bg-primary);
  color: var(--primary);
}

.btn-icon.danger:hover {
  color: var(--danger);
}

.btn-icon.mini {
  width: 28px;
  height: 28px;
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.add-question-btn,
.add-section-btn {
  width: 100%;
  justify-content: center;
  margin-top: 0.75rem;
}

/* Settings */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.setting-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  margin-left: auto;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-color);
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--primary);
}

input:checked + .slider:before {
  transform: translateX(24px);
}

/* Preview Modal */
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
  padding: 2rem;
}

.preview-modal {
  background: var(--bg-secondary);
  border-radius: 12px;
  width: 100%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.preview-content h2 {
  margin-bottom: 0.5rem;
}

.preview-desc {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.preview-info {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.preview-instructions {
  font-style: italic;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.preview-section {
  margin-bottom: 1.5rem;
}

.preview-section h4 {
  color: var(--primary);
  margin-bottom: 0.5rem;
}

.preview-question {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
}

.q-context {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.preview-options {
  margin-top: 0.75rem;
}

.preview-option {
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  background: var(--bg-secondary);
  border-radius: 4px;
}

/* Spin animation */
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .top-navbar {
    padding: 1rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .editor-container {
    padding: 1rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    flex-direction: column;
  }

  .question-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .question-actions {
    margin-left: 0;
    margin-top: 0.5rem;
  }
}
</style>
