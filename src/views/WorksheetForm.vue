<template>
  <div class="worksheet-form-view">
    <!-- Top Navigation -->
    <nav class="top-navbar">
      <div class="nav-brand">
        <router-link :to="backRoute" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <span class="brand-icon">📝</span>
        <span class="brand-text">{{ worksheet?.title || 'ใบงาน' }}</span>
      </div>
      <div class="nav-actions">
        <div class="timer" v-if="timeRemaining !== null">
          <span class="material-icons">timer</span>
          <span>{{ formatTime(timeRemaining) }}</span>
        </div>
        <div class="progress-indicator">
          <span>{{ answeredCount }}/{{ totalQuestions }}</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
      <p>กำลังโหลดใบงาน...</p>
    </div>

    <!-- Worksheet Content -->
    <div v-else-if="worksheet" class="worksheet-container">
      <!-- Worksheet Header -->
      <header class="worksheet-header">
        <div class="ws-meta">
          <h1>{{ worksheet.title }}</h1>
          <p class="ws-description">{{ worksheet.description }}</p>
          <div class="ws-tags">
            <span class="tag phase-tag">{{ getPhaseLabel(worksheet.phase) }}</span>
            <span v-for="arce in worksheet.arceFocus" :key="arce" :class="['tag', 'arce-tag', arce]">
              {{ getArceIcon(arce) }} {{ getArceLabel(arce) }}
            </span>
          </div>
        </div>
        <div class="ws-info">
          <p><strong>รายวิชา:</strong> {{ worksheet.courseName || worksheet.metadata?.courseName }}</p>
          <p><strong>ระดับชั้น:</strong> {{ worksheet.gradeLevel || worksheet.metadata?.gradeLevel }}</p>
          <p><strong>เวลาที่ใช้:</strong> {{ worksheet.duration || worksheet.metadata?.duration || 50 }} นาที</p>
        </div>
      </header>

      <!-- Instructions -->
      <section class="instructions-section" v-if="worksheet.instructions">
        <h3>📋 คำชี้แจง</h3>
        <p>{{ worksheet.instructions }}</p>
      </section>

      <!-- Form Sections -->
      <form @submit.prevent="submitWorksheet" class="worksheet-form">
        <div v-for="(section, sIdx) in worksheet.sections" :key="section.id || sIdx" class="form-section">
          <div class="section-header">
            <h3>{{ section.title }}</h3>
            <p v-if="section.description" class="section-desc">{{ section.description }}</p>
            <div class="section-arce" v-if="section.arceFocus">
              <span v-for="arce in (Array.isArray(section.arceFocus) ? section.arceFocus : [section.arceFocus])" 
                    :key="arce" 
                    :class="['arce-mini', arce]">
                {{ getArceIcon(arce) }}
              </span>
            </div>
          </div>

          <!-- Questions -->
          <div v-for="(question, qIdx) in section.questions" 
               :key="question.id || qIdx" 
               class="question-block"
               :class="{ 'answered': isAnswered(section.id, question.id) }">
            
            <div class="question-header">
              <span class="question-number">{{ question.number || qIdx + 1 }}</span>
              <span class="question-type-badge" :class="question.type">{{ getQuestionTypeLabel(question.type) }}</span>
              <span v-if="question.required" class="required-badge">*จำเป็น</span>
              <span class="question-points">{{ question.maxScore || question.points || 5 }} คะแนน</span>
            </div>

            <div class="question-content">
              <p class="question-text">{{ question.prompt || question.question }}</p>
              
              <!-- Context/Case Study -->
              <div v-if="question.context" class="question-context">
                <div class="context-label">📖 กรณีศึกษา / บริบท</div>
                <div class="context-content">{{ question.context }}</div>
              </div>

              <!-- Media -->
              <div v-if="question.media" class="question-media">
                <img v-if="question.media.type === 'image'" :src="question.media.url" :alt="question.media.caption" />
                <video v-else-if="question.media.type === 'video'" :src="question.media.url" controls />
                <p v-if="question.media.caption" class="media-caption">{{ question.media.caption }}</p>
              </div>
            </div>

            <!-- Answer Input based on question type -->
            <div class="answer-input">
              <!-- Open-ended / Long text -->
              <template v-if="question.type === 'open_ended' || question.type === 'long_text'">
                <textarea 
                  v-model="answers[`${section.id}_${question.id}`]"
                  :placeholder="question.placeholder || 'พิมพ์คำตอบของคุณที่นี่...'"
                  :minlength="question.minCharacters || 20"
                  :rows="question.rows || 6"
                  @paste.prevent="blockPaste"
                  @copy.prevent="blockCopy"
                  @cut.prevent="blockCut"
                  @drop.prevent="blockDrop"
                  @dragover.prevent
                  @contextmenu.prevent
                  class="textarea-answer no-select"
                  autocomplete="off"
                  spellcheck="false"
                ></textarea>
                <div class="char-count">
                  {{ (answers[`${section.id}_${question.id}`] || '').length }} / {{ question.minCharacters || 20 }} ตัวอักษรขั้นต่ำ
                </div>
              </template>

              <!-- Short text -->
              <template v-else-if="question.type === 'short_text'">
                <input 
                  type="text"
                  v-model="answers[`${section.id}_${question.id}`]"
                  :placeholder="question.placeholder || 'คำตอบ'"
                  @paste.prevent="blockPaste"
                  @copy.prevent="blockCopy"
                  @cut.prevent="blockCut"
                  @drop.prevent="blockDrop"
                  @dragover.prevent
                  @contextmenu.prevent
                  class="input-answer no-select"
                  autocomplete="off"
                />
              </template>

              <!-- Multiple Choice (Single) -->
              <template v-else-if="question.type === 'multiple_choice' || question.type === 'single_choice'">
                <div class="options-list">
                  <label v-for="(option, oIdx) in shuffledOptions(question)" 
                         :key="option.id || oIdx" 
                         class="option-item"
                         :class="{ 'selected': answers[`${section.id}_${question.id}`] === option.id }">
                    <input 
                      type="radio" 
                      :name="`q_${section.id}_${question.id}`"
                      :value="option.id"
                      v-model="answers[`${section.id}_${question.id}`]"
                    />
                    <span class="option-label">{{ option.text }}</span>
                  </label>
                </div>
              </template>

              <!-- Multi-select -->
              <template v-else-if="question.type === 'multi_choice' || question.type === 'checkbox'">
                <div class="options-list multi">
                  <label v-for="(option, oIdx) in question.options" 
                         :key="option.id || oIdx" 
                         class="option-item"
                         :class="{ 'selected': (answers[`${section.id}_${question.id}`] || []).includes(option.id) }">
                    <input 
                      type="checkbox" 
                      :value="option.id"
                      v-model="answers[`${section.id}_${question.id}`]"
                    />
                    <span class="option-label">{{ option.text }}</span>
                  </label>
                </div>
              </template>

              <!-- Rating Scale -->
              <template v-else-if="question.type === 'rating_scale'">
                <div class="rating-scale">
                  <span class="scale-label">{{ question.scaleMin || 'น้อยที่สุด' }}</span>
                  <div class="scale-options">
                    <label v-for="n in (question.scaleMax || 5)" :key="n" class="scale-item">
                      <input type="radio" :name="`q_${section.id}_${question.id}`" :value="n" v-model="answers[`${section.id}_${question.id}`]" />
                      <span class="scale-number">{{ n }}</span>
                    </label>
                  </div>
                  <span class="scale-label">{{ question.scaleMaxLabel || 'มากที่สุด' }}</span>
                </div>
              </template>

              <!-- File Upload -->
              <template v-else-if="question.type === 'file_upload'">
                <div class="file-upload-area">
                  <input type="file" :accept="question.acceptedTypes || 'image/*,.pdf'" @change="handleFileUpload($event, section.id, question.id)" />
                  <div v-if="fileUploads[`${section.id}_${question.id}`]" class="uploaded-file">
                    📎 {{ fileUploads[`${section.id}_${question.id}`].name }}
                  </div>
                </div>
              </template>

              <!-- Table Input -->
              <template v-else-if="question.type === 'table' && question.table">
                <div class="table-input">
                  <table>
                    <thead>
                      <tr>
                        <th v-for="h in question.table.headers" :key="h">{{ h }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="rowIdx in question.table.rows" :key="rowIdx">
                        <td v-for="(h, colIdx) in question.table.headers" :key="h">
                          <input 
                            type="text" 
                            v-model="tableAnswers[`${section.id}_${question.id}_${rowIdx}_${colIdx}`]"
                            class="table-cell-input"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>

              <!-- Default: Text area -->
              <template v-else>
                <textarea 
                  v-model="answers[`${section.id}_${question.id}`]"
                  placeholder="พิมพ์คำตอบของคุณ..."
                  rows="4"
                  @paste.prevent="blockPaste"
                  @copy.prevent="blockCopy"
                  @cut.prevent="blockCut"
                  @drop.prevent="blockDrop"
                  @dragover.prevent
                  @contextmenu.prevent
                  class="textarea-answer no-select"
                  autocomplete="off"
                ></textarea>
              </template>
            </div>

            <!-- Hints (Scaffolding) -->
            <div v-if="question.hints && showHints[`${section.id}_${question.id}`]" class="question-hints">
              <div class="hint-toggle" @click="toggleHint(section.id, question.id)">
                <span class="material-icons">lightbulb</span>
                <span>{{ hintsVisible[`${section.id}_${question.id}`] ? 'ซ่อนคำแนะนำ' : 'ดูคำแนะนำ' }}</span>
              </div>
              <div v-if="hintsVisible[`${section.id}_${question.id}`]" class="hints-content">
                <p v-for="(hint, hIdx) in (Array.isArray(question.hints) ? question.hints : [question.hints])" :key="hIdx">
                  💡 {{ hint }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Self Reflection Section -->
        <section v-if="worksheet.selfReflection" class="reflection-section">
          <h3>🪞 การสะท้อนตนเอง</h3>
          <p class="reflection-prompt">{{ worksheet.selfReflection.prompt || 'สิ่งที่ได้เรียนรู้จากใบงานนี้คือ...' }}</p>
          <textarea 
            v-model="selfReflection"
            placeholder="เขียนสะท้อนความคิดของคุณ..."
            rows="4"
            @paste.prevent="blockPaste"
            @copy.prevent="blockCopy"
            @cut.prevent="blockCut"
            @drop.prevent="blockDrop"
            @dragover.prevent
            @contextmenu.prevent
            class="no-select"
            autocomplete="off"
          ></textarea>
        </section>

        <!-- Submit Section -->
        <div class="submit-section">
          <div class="submit-warning" v-if="!canSubmit">
            <span class="material-icons">warning</span>
            <span>กรุณาตอบคำถามที่จำเป็น (*) ให้ครบก่อนส่ง</span>
          </div>
          <div class="submit-actions">
            <button type="button" class="btn btn-outline" @click="saveDraft">
              <span class="material-icons">save</span>
              บันทึกฉบับร่าง
            </button>
            <button type="submit" class="btn btn-primary btn-lg" :disabled="!canSubmit || submitting">
              <span class="material-icons">{{ submitting ? 'hourglass_empty' : 'send' }}</span>
              {{ submitting ? 'กำลังส่ง...' : 'ส่งใบงาน' }}
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- Error State -->
    <div v-else class="error-container">
      <span class="material-icons">error_outline</span>
      <p>ไม่พบใบงานที่ต้องการ</p>
      <router-link :to="backRoute" class="btn btn-primary">กลับหน้าหลัก</router-link>
    </div>

    <!-- AI Feedback Modal -->
    <div v-if="showFeedbackModal" class="modal-overlay" @click.self="closeFeedbackModal">
      <div class="modal-content feedback-modal">
        <div class="modal-header">
          <h2>📊 ผลการประเมินใบงาน</h2>
          <button class="btn-close" @click="closeFeedbackModal">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body" v-if="assessmentResult">
          <!-- Overall Score -->
          <div class="overall-score">
            <div class="score-circle" :class="getScoreClass(assessmentResult.summary.percentage)">
              <span class="score-value">{{ assessmentResult.summary.percentage.toFixed(0) }}%</span>
              <span class="score-label">คะแนนรวม</span>
            </div>
            <div class="score-breakdown">
              <p><strong>{{ assessmentResult.summary.totalScore }}</strong> / {{ assessmentResult.summary.maxScore }} คะแนน</p>
              <p class="pa-level">ระดับ PA: {{ assessmentResult.summary.paLevel }}</p>
            </div>
          </div>

          <!-- A.R.C.E. Scores -->
          <div class="arce-scores">
            <h3>คะแนน A.R.C.E.</h3>
            <div class="arce-grid">
              <div v-for="(score, key) in assessmentResult.arceScores" :key="key" class="arce-item" :class="key">
                <div class="arce-icon">{{ getArceIcon(key) }}</div>
                <div class="arce-name">{{ getArceLabel(key) }}</div>
                <div class="arce-score">{{ score.weighted.toFixed(1) }} / {{ score.max }}</div>
                <div class="arce-bar">
                  <div class="arce-fill" :style="{ width: (score.weighted / score.max * 100) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Strengths & Weaknesses -->
          <div class="feedback-sections">
            <div class="feedback-section strengths">
              <h4>💪 จุดแข็ง</h4>
              <ul>
                <li v-for="(s, i) in assessmentResult.strengths" :key="i">{{ s }}</li>
              </ul>
            </div>
            <div class="feedback-section weaknesses">
              <h4>🎯 จุดที่ควรพัฒนา</h4>
              <ul>
                <li v-for="(w, i) in assessmentResult.weaknesses" :key="i">{{ w }}</li>
              </ul>
            </div>
          </div>

          <!-- Suggestions -->
          <div class="suggestions-section">
            <h4>📝 ข้อเสนอแนะ</h4>
            <ul>
              <li v-for="(s, i) in assessmentResult.suggestions" :key="i">{{ s }}</li>
            </ul>
          </div>

          <!-- LO Progress -->
          <div class="lo-progress" v-if="assessmentResult.loProgress">
            <h4>📈 ผลการเรียนรู้ที่ผ่าน</h4>
            <div class="lo-list">
              <span v-for="lo in assessmentResult.loProgress.passed" :key="lo" class="lo-badge passed">✅ {{ lo }}</span>
              <span v-for="lo in assessmentResult.loProgress.failed" :key="lo" class="lo-badge failed">❌ {{ lo }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="viewDetailedReport">
            <span class="material-icons">description</span>
            ดูรายงานละเอียด
          </button>
          <button class="btn btn-primary" @click="closeFeedbackModal">
            ตกลง
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp, increment } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(true)
const submitting = ref(false)
const worksheet = ref(null)
const answers = ref({})
const tableAnswers = ref({})
const fileUploads = ref({})
const selfReflection = ref('')
const hintsVisible = ref({})
const showHints = ref({})
const timeRemaining = ref(null)
const timerInterval = ref(null)
const showFeedbackModal = ref(false)
const assessmentResult = ref(null)
const typingFingerprint = ref({})
const startTime = ref(null)
const shuffledOptionsCache = ref({}) // Cache shuffled options to prevent re-shuffle on re-render
const autoSaveInterval = ref(null)
const lastSavedAt = ref(null)

// Auto-save key for localStorage
const getStorageKey = () => `worksheet_draft_${route.params.id}_${authStore.user?.uid || 'guest'}`

// Computed
const backRoute = computed(() => {
  if (route.query.roomId) return `/learning-room/${route.query.roomId}`
  if (route.query.courseId) return `/courses/${route.query.courseId}`
  return '/student'
})

const totalQuestions = computed(() => {
  if (!worksheet.value?.sections) return 0
  return worksheet.value.sections.reduce((total, section) => {
    return total + (section.questions?.length || 0)
  }, 0)
})

const answeredCount = computed(() => {
  if (!worksheet.value?.sections) return 0
  
  let count = 0
  for (const section of worksheet.value.sections) {
    for (const question of section.questions || []) {
      const sectionId = section.id
      const questionId = question.id
      
      // Check if this is a table question
      if (question.type === 'table' && question.table) {
        // For table questions, check if at least one cell is filled
        const tableRows = question.table.rows || 0
        const tableHeaders = question.table.headers || []
        let hasTableAnswer = false
        
        for (let rowIdx = 1; rowIdx <= tableRows; rowIdx++) {
          for (let colIdx = 0; colIdx < tableHeaders.length; colIdx++) {
            const cellKey = `${sectionId}_${questionId}_${rowIdx}_${colIdx}`
            if (tableAnswers.value[cellKey]?.trim()) {
              hasTableAnswer = true
              break
            }
          }
          if (hasTableAnswer) break
        }
        
        if (hasTableAnswer) count++
      } else {
        // Regular answer check
        const val = answers.value[`${sectionId}_${questionId}`]
        if (val) {
          if (typeof val === 'string' && val.trim().length > 0) count++
          else if (Array.isArray(val) && val.length > 0) count++
          else if (val && typeof val !== 'string' && !Array.isArray(val)) count++
        }
      }
    }
  }
  return count
})

const progressPercent = computed(() => {
  if (totalQuestions.value === 0) return 0
  return (answeredCount.value / totalQuestions.value) * 100
})

const canSubmit = computed(() => {
  if (!worksheet.value?.sections) return false
  
  // Check all required questions
  for (const section of worksheet.value.sections) {
    for (const question of section.questions || []) {
      if (question.required) {
        // Handle table questions
        if (question.type === 'table' && question.table) {
          const tableRows = question.table.rows || 0
          const tableHeaders = question.table.headers || []
          let hasTableAnswer = false
          
          for (let rowIdx = 1; rowIdx <= tableRows; rowIdx++) {
            for (let colIdx = 0; colIdx < tableHeaders.length; colIdx++) {
              const cellKey = `${section.id}_${question.id}_${rowIdx}_${colIdx}`
              if (tableAnswers.value[cellKey]?.trim()) {
                hasTableAnswer = true
                break
              }
            }
            if (hasTableAnswer) break
          }
          
          if (!hasTableAnswer) return false
        } else {
          // Regular answer check
          const answer = answers.value[`${section.id}_${question.id}`]
          if (!answer || (typeof answer === 'string' && !answer.trim())) {
            return false
          }
          // Check minimum characters for open-ended
          if ((question.type === 'open_ended' || question.type === 'long_text') && question.minCharacters) {
            if (answer.length < question.minCharacters) return false
          }
        }
      }
    }
  }
  return true
})

// Methods
function isAnswered(sectionId, questionId) {
  // Find the question to check if it's a table type
  const section = worksheet.value?.sections?.find(s => s.id === sectionId)
  const question = section?.questions?.find(q => q.id === questionId)
  
  // Check table questions
  if (question?.type === 'table' && question.table) {
    const tableRows = question.table.rows || 0
    const tableHeaders = question.table.headers || []
    
    for (let rowIdx = 1; rowIdx <= tableRows; rowIdx++) {
      for (let colIdx = 0; colIdx < tableHeaders.length; colIdx++) {
        const cellKey = `${sectionId}_${questionId}_${rowIdx}_${colIdx}`
        if (tableAnswers.value[cellKey]?.trim()) {
          return true
        }
      }
    }
    return false
  }
  
  // Regular answer check
  const val = answers.value[`${sectionId}_${questionId}`]
  if (!val) return false
  if (typeof val === 'string') return val.trim().length > 0
  if (Array.isArray(val)) return val.length > 0
  return true
}

function getPhaseLabel(phase) {
  const labels = {
    engagement: 'Engage - กระตุ้นความสนใจ',
    exploration: 'Explore - สำรวจค้นหา',
    explanation: 'Explain - อธิบายความรู้',
    elaboration: 'Elaborate - ขยายความเข้าใจ',
    evaluation: 'Evaluate - ประเมินผล'
  }
  return labels[phase] || phase
}

function getArceLabel(arce) {
  const labels = {
    analysis: 'การวิเคราะห์',
    reasoning: 'การให้เหตุผล',
    creativity: 'ความคิดสร้างสรรค์',
    evidence: 'การใช้หลักฐาน'
  }
  return labels[arce] || arce
}

function getArceIcon(arce) {
  const icons = {
    analysis: '🔍',
    reasoning: '🧠',
    creativity: '💡',
    evidence: '📚'
  }
  return icons[arce] || '📝'
}

function getQuestionTypeLabel(type) {
  const labels = {
    open_ended: 'เขียนตอบ',
    long_text: 'เขียนตอบยาว',
    short_text: 'ตอบสั้น',
    multiple_choice: 'เลือกตอบ',
    single_choice: 'เลือกตอบ',
    multi_choice: 'เลือกหลายข้อ',
    checkbox: 'เลือกหลายข้อ',
    rating_scale: 'ระดับความคิดเห็น',
    file_upload: 'อัปโหลดไฟล์',
    table: 'กรอกตาราง'
  }
  return labels[type] || 'ตอบคำถาม'
}

function getScoreClass(percent) {
  if (percent >= 80) return 'excellent'
  if (percent >= 60) return 'good'
  if (percent >= 40) return 'fair'
  return 'needs-improvement'
}

function shuffledOptions(question) {
  if (!question.options) return []
  if (!worksheet.value?.settings?.shuffleOptions) return question.options
  
  // Use cached version if exists to prevent re-shuffling on re-render
  const cacheKey = question.id || question.number
  if (shuffledOptionsCache.value[cacheKey]) {
    return shuffledOptionsCache.value[cacheKey]
  }
  
  // Shuffle options only once
  const shuffled = [...question.options]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  // Cache the result
  shuffledOptionsCache.value[cacheKey] = shuffled
  return shuffled
}

function toggleHint(sectionId, questionId) {
  const key = `${sectionId}_${questionId}`
  hintsVisible.value[key] = !hintsVisible.value[key]
}

// Anti-cheat: Block all copy/paste/cut/drop methods
function blockPaste(event) {
  event.preventDefault()
  showAntiCheatWarning('วาง (Paste)')
}

function blockCopy(event) {
  event.preventDefault()
  showAntiCheatWarning('คัดลอก (Copy)')
}

function blockCut(event) {
  event.preventDefault()
  showAntiCheatWarning('ตัด (Cut)')
}

function blockDrop(event) {
  event.preventDefault()
  showAntiCheatWarning('ลากวาง (Drag & Drop)')
}

let antiCheatWarningTimeout = null
function showAntiCheatWarning(action) {
  // Debounce warnings
  if (antiCheatWarningTimeout) return
  
  antiCheatWarningTimeout = setTimeout(() => {
    antiCheatWarningTimeout = null
  }, 2000)
  
  // Show toast notification instead of alert
  const toast = document.createElement('div')
  toast.className = 'anti-cheat-toast'
  toast.innerHTML = `
    <span class="material-icons">block</span>
    <span>ไม่อนุญาตให้${action} กรุณาพิมพ์คำตอบด้วยตัวเอง</span>
  `
  document.body.appendChild(toast)
  
  setTimeout(() => {
    toast.classList.add('fade-out')
    setTimeout(() => toast.remove(), 300)
  }, 2500)
}

// Global clipboard blocking for mobile
function blockGlobalClipboard(event) {
  // Block if focus is on any input/textarea in worksheet
  const activeEl = document.activeElement
  if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
    if (activeEl.closest('.worksheet-form')) {
      event.preventDefault()
      showAntiCheatWarning(event.type === 'paste' ? 'วาง' : event.type === 'copy' ? 'คัดลอก' : 'ตัด')
    }
  }
}

function handleFileUpload(event, sectionId, questionId) {
  const file = event.target.files[0]
  if (file) {
    fileUploads.value[`${sectionId}_${questionId}`] = file
    answers.value[`${sectionId}_${questionId}`] = file.name
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

async function loadWorksheet() {
  try {
    loading.value = true
    const worksheetId = route.params.id
    
    const docRef = doc(db, 'eWorksheets', worksheetId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      worksheet.value = { id: docSnap.id, ...docSnap.data() }
      
      // Initialize answers object
      if (worksheet.value.sections) {
        worksheet.value.sections.forEach((section, sIdx) => {
          // Ensure section has an id
          if (!section.id) section.id = `section_${sIdx}`
          
          section.questions?.forEach((question, qIdx) => {
            // Ensure question has an id
            if (!question.id) question.id = `q_${qIdx}`
            
            const key = `${section.id}_${question.id}`
            if (question.type === 'multi_choice' || question.type === 'checkbox') {
              answers.value[key] = []
            } else {
              answers.value[key] = ''
            }
            // Show hints after certain attempts
            showHints.value[key] = question.hints && question.showHintsAfterAttempts !== undefined
          })
        })
      }
      
      // Start timer if duration specified
      const duration = worksheet.value.duration || worksheet.value.metadata?.duration
      if (duration) {
        timeRemaining.value = duration * 60
        startTimer()
      }
      
      startTime.value = Date.now()
      
      // Restore saved answers from localStorage
      restoreSavedAnswers()
      
      // Start auto-save interval (every 10 seconds)
      startAutoSave()
    }
  } catch (error) {
    console.error('Error loading worksheet:', error)
  } finally {
    loading.value = false
  }
}

// Auto-save functions
function restoreSavedAnswers() {
  try {
    const saved = localStorage.getItem(getStorageKey())
    if (saved) {
      const data = JSON.parse(saved)
      
      // Restore answers
      if (data.answers) {
        Object.keys(data.answers).forEach(key => {
          if (answers.value.hasOwnProperty(key)) {
            answers.value[key] = data.answers[key]
          }
        })
      }
      
      // Restore table answers
      if (data.tableAnswers) {
        tableAnswers.value = { ...tableAnswers.value, ...data.tableAnswers }
      }
      
      // Restore self reflection
      if (data.selfReflection) {
        selfReflection.value = data.selfReflection
      }
      
      // Restore time remaining if still valid
      if (data.timeRemaining && data.savedAt) {
        const elapsed = Math.floor((Date.now() - data.savedAt) / 1000)
        const remaining = data.timeRemaining - elapsed
        if (remaining > 0) {
          timeRemaining.value = remaining
        }
      }
      
      console.log('✅ Restored saved answers from localStorage')
      
      // Show restoration notice
      showRestorationNotice()
    }
  } catch (error) {
    console.error('Error restoring saved answers:', error)
  }
}

function showRestorationNotice() {
  const toast = document.createElement('div')
  toast.className = 'restore-toast'
  toast.innerHTML = `
    <span class="material-icons">restore</span>
    <span>กู้คืนคำตอบที่บันทึกไว้แล้ว</span>
  `
  document.body.appendChild(toast)
  
  setTimeout(() => {
    toast.classList.add('fade-out')
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

function saveAnswersToStorage() {
  try {
    const data = {
      answers: answers.value,
      tableAnswers: tableAnswers.value,
      selfReflection: selfReflection.value,
      timeRemaining: timeRemaining.value,
      savedAt: Date.now()
    }
    localStorage.setItem(getStorageKey(), JSON.stringify(data))
    lastSavedAt.value = new Date()
  } catch (error) {
    console.error('Error saving answers to localStorage:', error)
  }
}

function startAutoSave() {
  // Save immediately when answers change (debounced)
  watch([answers, tableAnswers, selfReflection], () => {
    saveAnswersToStorage()
  }, { deep: true })
  
  // Also save periodically as backup
  autoSaveInterval.value = setInterval(() => {
    saveAnswersToStorage()
  }, 10000) // Every 10 seconds
}

function clearSavedAnswers() {
  try {
    localStorage.removeItem(getStorageKey())
  } catch (error) {
    console.error('Error clearing saved answers:', error)
  }
}

function startTimer() {
  timerInterval.value = setInterval(() => {
    if (timeRemaining.value > 0) {
      timeRemaining.value--
    } else {
      clearInterval(timerInterval.value)
      // Auto-submit when time runs out
      submitWorksheet()
    }
  }, 1000)
}

async function saveDraft() {
  try {
    const draftData = {
      worksheetId: worksheet.value.id,
      studentId: authStore.user?.uid,
      answers: answers.value,
      tableAnswers: tableAnswers.value,
      selfReflection: selfReflection.value,
      status: 'draft',
      updatedAt: serverTimestamp()
    }
    
    const draftId = `${authStore.user?.uid}_${worksheet.value.id}`
    await setDoc(doc(db, 'worksheetDrafts', draftId), draftData, { merge: true })
    
    alert('บันทึกฉบับร่างเรียบร้อยแล้ว')
  } catch (error) {
    console.error('Error saving draft:', error)
    alert('เกิดข้อผิดพลาดในการบันทึก')
  }
}

async function submitWorksheet() {
  if (!canSubmit.value) {
    alert('กรุณาตอบคำถามที่จำเป็นให้ครบก่อนส่ง')
    return
  }
  
  submitting.value = true
  
  try {
    const timeSpent = Math.floor((Date.now() - startTime.value) / 1000)
    
    // Prepare submission data
    const submissionData = {
      worksheetId: worksheet.value.id,
      courseId: worksheet.value.courseId,
      lessonPlanId: worksheet.value.lessonPlanId,
      studentId: authStore.user?.uid,
      studentName: authStore.user?.displayName || authStore.userProfile?.displayName || '',
      studentData: {
        displayName: authStore.user?.displayName || authStore.userProfile?.displayName || '',
        studentId: authStore.userProfile?.studentId || '', // รหัสนักเรียน 5 หลัก
        grade: authStore.userProfile?.grade || '',
        room: authStore.userProfile?.room || '',
        number: authStore.userProfile?.number || '', // เลขที่
        section: authStore.userProfile?.section || '' // ตอน
      },
      answers: answers.value,
      tableAnswers: tableAnswers.value,
      selfReflection: selfReflection.value,
      typingFingerprint: typingFingerprint.value,
      timeSpent: timeSpent,
      status: 'submitted',
      submittedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }
    
    // Save submission
    const submissionRef = await addDoc(collection(db, 'worksheetSubmissions'), submissionData)
    
    // Call AI assessment
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    const response = await fetch(`${functionsUrl}/assessWorksheetSubmission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId: submissionRef.id,
        worksheetId: worksheet.value.id,
        answers: answers.value,
        worksheetStructure: worksheet.value
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      assessmentResult.value = result.assessment
      
      // Update submission with assessment
      await updateDoc(submissionRef, {
        assessment: result.assessment,
        status: 'graded',
        gradedAt: serverTimestamp()
      })
      
      // Update worksheet stats
      await updateDoc(doc(db, 'eWorksheets', worksheet.value.id), {
        'stats.totalSubmitted': increment(1)
      })
      
      // Clear saved answers after successful submission
      clearSavedAnswers()
      
      showFeedbackModal.value = true
    } else {
      // Clear saved answers after successful submission
      clearSavedAnswers()
      
      alert('ส่งใบงานสำเร็จ รอการตรวจจากครู')
      router.push(backRoute.value)
    }
    
  } catch (error) {
    console.error('Error submitting worksheet:', error)
    alert('เกิดข้อผิดพลาดในการส่งใบงาน: ' + error.message)
  } finally {
    submitting.value = false
  }
}

function closeFeedbackModal() {
  showFeedbackModal.value = false
  router.push(backRoute.value)
}

function viewDetailedReport() {
  // Navigate to detailed report view
  router.push(`/worksheet-result/${worksheet.value.id}`)
}

// Lifecycle
onMounted(() => {
  loadWorksheet()
  
  // Add global clipboard event listeners for mobile
  document.addEventListener('paste', blockGlobalClipboard, true)
  document.addEventListener('copy', blockGlobalClipboard, true)
  document.addEventListener('cut', blockGlobalClipboard, true)
})

onBeforeUnmount(() => {
  // Save before leaving
  saveAnswersToStorage()
})

onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
  
  if (autoSaveInterval.value) {
    clearInterval(autoSaveInterval.value)
  }
  
  // Remove global clipboard listeners
  document.removeEventListener('paste', blockGlobalClipboard, true)
  document.removeEventListener('copy', blockGlobalClipboard, true)
  document.removeEventListener('cut', blockGlobalClipboard, true)
})
</script>

<style scoped>
.worksheet-form-view {
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
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.timer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: 8px;
  font-weight: 600;
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar {
  width: 100px;
  height: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  transition: width 0.3s;
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

/* Worksheet Container */
.worksheet-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

/* Header */
.worksheet-header {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border-color);
}

.ws-meta h1 {
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
}

.ws-description {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.ws-tags {
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

.phase-tag {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

.arce-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.arce-tag.analysis { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.arce-tag.reasoning { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.arce-tag.creativity { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.arce-tag.evidence { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

.ws-info {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.ws-info p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Instructions */
.instructions-section {
  background: rgba(99, 102, 241, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border-left: 4px solid #6366f1;
}

.instructions-section h3 {
  margin-bottom: 0.75rem;
  color: #6366f1;
}

/* Form Sections */
.form-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-color);
}

.section-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.section-header h3 {
  margin-bottom: 0.5rem;
}

.section-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.section-arce {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.arce-mini {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
}

.arce-mini.analysis { background: rgba(59, 130, 246, 0.2); }
.arce-mini.reasoning { background: rgba(16, 185, 129, 0.2); }
.arce-mini.creativity { background: rgba(245, 158, 11, 0.2); }
.arce-mini.evidence { background: rgba(239, 68, 68, 0.2); }

/* Question Block */
.question-block {
  padding: 1.5rem;
  background: var(--bg-primary);
  border-radius: 12px;
  margin-bottom: 1rem;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.question-block.answered {
  border-color: rgba(16, 185, 129, 0.3);
}

.question-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.question-number {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.question-type-badge {
  padding: 0.25rem 0.5rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.required-badge {
  color: #ef4444;
  font-size: 0.75rem;
}

.question-points {
  margin-left: auto;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.question-text {
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.question-context {
  background: rgba(99, 102, 241, 0.05);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.context-label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #6366f1;
}

.context-content {
  line-height: 1.7;
  color: var(--text-secondary);
}

/* Answer Inputs */
.answer-input {
  margin-top: 1rem;
}

.textarea-answer {
  width: 100%;
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.2s;
}

.textarea-answer:focus {
  outline: none;
  border-color: #6366f1;
}

.input-answer {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1rem;
}

.char-count {
  text-align: right;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

/* Options */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-item:hover {
  border-color: #6366f1;
}

.option-item.selected {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
}

.option-item input {
  accent-color: #6366f1;
}

/* Rating Scale */
.rating-scale {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.scale-options {
  display: flex;
  gap: 0.5rem;
}

.scale-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.scale-item:has(input:checked) {
  background: #6366f1;
  border-color: #6366f1;
  color: white;
}

.scale-item input {
  display: none;
}

.scale-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Table Input */
.table-input table {
  width: 100%;
  border-collapse: collapse;
}

.table-input th, .table-input td {
  border: 1px solid var(--border-color);
  padding: 0.5rem;
}

.table-input th {
  background: var(--bg-secondary);
  font-weight: 600;
}

.table-cell-input {
  width: 100%;
  padding: 0.5rem;
  border: none;
  background: transparent;
  color: var(--text-primary);
}

/* Hints */
.question-hints {
  margin-top: 1rem;
}

.hint-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #f59e0b;
  cursor: pointer;
  font-size: 0.875rem;
}

.hints-content {
  margin-top: 0.75rem;
  padding: 1rem;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 8px;
}

.hints-content p {
  margin: 0.5rem 0;
}

/* Reflection */
.reflection-section {
  background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  border: 2px solid #60a5fa;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.15);
  position: relative;
  overflow: hidden;
}

.reflection-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
}

.reflection-section h3 {
  color: #1e40af;
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.reflection-prompt {
  margin-bottom: 1rem;
  color: #1e3a8a;
  font-weight: 500;
  font-size: 1.1rem;
}

.reflection-section textarea {
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #93c5fd;
  border-radius: 12px;
  padding: 1rem;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.reflection-section textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
  outline: none;
}

/* Dark mode reflection */
.dark-mode .reflection-section {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
  border-color: #60a5fa;
}

.dark-mode .reflection-section h3 {
  color: #93c5fd;
}

.dark-mode .reflection-prompt {
  color: #e0f2fe;
  font-weight: 500;
}

.dark-mode .reflection-section textarea {
  background: rgba(30, 41, 59, 0.8);
  border-color: #60a5fa;
  color: #f1f5f9;
}

.dark-mode .reflection-section textarea::placeholder {
  color: #94a3b8;
}

/* Submit Section */
.submit-section {
  padding: 2rem 0;
}

.submit-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  color: #ef4444;
  margin-bottom: 1rem;
}

.submit-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
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

/* Score Display */
.overall-score {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1.5rem;
  background: var(--bg-primary);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.score-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 4px solid;
}

.score-circle.excellent { border-color: #10b981; color: #10b981; }
.score-circle.good { border-color: #3b82f6; color: #3b82f6; }
.score-circle.fair { border-color: #f59e0b; color: #f59e0b; }
.score-circle.needs-improvement { border-color: #ef4444; color: #ef4444; }

.score-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.score-label {
  font-size: 0.75rem;
}

.pa-level {
  color: #6366f1;
  font-weight: 600;
}

/* ARCE Scores Grid */
.arce-scores {
  margin-bottom: 1.5rem;
}

.arce-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1rem;
}

.arce-item {
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.arce-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.arce-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.arce-score {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.arce-bar {
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  margin-top: 0.5rem;
  overflow: hidden;
}

.arce-fill {
  height: 100%;
  border-radius: 3px;
}

.arce-item.analysis .arce-fill { background: #3b82f6; }
.arce-item.reasoning .arce-fill { background: #10b981; }
.arce-item.creativity .arce-fill { background: #f59e0b; }
.arce-item.evidence .arce-fill { background: #ef4444; }

/* Feedback Sections */
.feedback-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.feedback-section {
  padding: 1rem;
  border-radius: 8px;
}

.feedback-section.strengths {
  background: rgba(16, 185, 129, 0.1);
}

.feedback-section.weaknesses {
  background: rgba(239, 68, 68, 0.1);
}

.feedback-section h4 {
  margin-bottom: 0.75rem;
}

.feedback-section ul {
  margin: 0;
  padding-left: 1.25rem;
}

.feedback-section li {
  margin-bottom: 0.25rem;
}

.suggestions-section {
  padding: 1rem;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.lo-progress {
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.lo-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.lo-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
}

.lo-badge.passed {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.lo-badge.failed {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
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

.btn-lg {
  padding: 1rem 2rem;
  font-size: 1rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .worksheet-container {
    padding: 1rem;
  }
  
  .top-navbar {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .arce-grid {
    grid-template-columns: 1fr;
  }
  
  .feedback-sections {
    grid-template-columns: 1fr;
  }
  
  .submit-actions {
    flex-direction: column;
  }
  
  .submit-actions .btn {
    width: 100%;
    justify-content: center;
  }
}

/* Anti-cheat: Disable text selection */
.no-select {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

/* Allow typing but prevent selection */
.textarea-answer.no-select,
.input-answer.no-select {
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}
</style>

<!-- Global styles for toast notifications -->
<style>
/* Anti-cheat warning toast */
.anti-cheat-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 8px 32px rgba(239, 68, 68, 0.4);
  z-index: 10000;
  animation: slideUp 0.3s ease-out;
  font-weight: 500;
}

.anti-cheat-toast .material-icons {
  font-size: 20px;
}

/* Restore toast */
.restore-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4);
  z-index: 10000;
  animation: slideUp 0.3s ease-out;
  font-weight: 500;
}

.restore-toast .material-icons {
  font-size: 20px;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.anti-cheat-toast.fade-out,
.restore-toast.fade-out {
  animation: fadeOut 0.3s ease-out forwards;
}

@keyframes fadeOut {
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
}
</style>
