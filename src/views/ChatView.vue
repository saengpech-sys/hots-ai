<template>
  <div class="chat-container">
    <!-- Badge Notification -->
    <BadgeNotification
      :badge="gamificationStore.newBadge"
      :show="gamificationStore.showBadgeNotification"
      @close="gamificationStore.closeBadgeNotification"
    />
    
    <!-- Points Notification -->
    <PointsNotification
      :points="gamificationStore.pointsEarned"
      :show="gamificationStore.showPointsNotification"
      @close="gamificationStore.closePointsNotification"
    />
    
    <!-- Reflection Journal -->
    <ReflectionJournal
      :show="showReflectionModal"
      :sessionId="chatStore.currentSession?.id || ''"
      :courseId="chatStore.currentSession?.courseId || null"
      :sessionSummary="sessionSummary"
      @close="showReflectionModal = false"
      @saved="onReflectionSaved"
    />
    
    <!-- Adaptive Learning Path Banner -->
      <!-- 🆕 Adaptive Learning Path Banner -->
      <div v-if="activePath" class="adaptive-path-banner">
        <div class="path-info">
          <span class="path-icon">🎯</span>
          <span class="path-label">Adaptive Learning Mode</span>
          <span class="path-progress">{{ completedSteps }}/{{ totalSteps }} steps</span>
        </div>
        <div class="path-actions">
          <button @click="viewFullPath" class="btn btn-sm btn-outline">View Path</button>
          <button @click="exitPath" class="btn btn-sm btn-secondary">Exit Path</button>
        </div>
      </div>

    <!-- ✨ HERO QUESTION SECTION -->
    <div class="hero-question-section">
      <!-- Header Bar -->
      <div class="top-bar">
        <h1 class="app-title">🧠 HOTS Assessment</h1>
        <div class="top-actions">
          <button @click="toggleTheme" class="icon-btn">{{ isDarkMode ? '☀️' : '🌙' }}</button>
          <button @click="handleEndSession" class="btn-end">จบการสนทนา</button>
        </div>
      </div>

      <!-- BIG QUESTION CARD -->
      <div v-if="chatStore.currentQuestion" class="hero-question-card">
        <div class="question-label">
          <span class="pulse-dot"></span>
          คำถามที่ต้องตอบ
        </div>
        <h2 class="hero-question-text">{{ chatStore.currentQuestion.question }}</h2>
        <div class="question-meta">
          <span v-if="chatStore.currentQuestion.category" class="meta-tag category">
            📚 {{ chatStore.currentQuestion.category }}
          </span>
          <span v-if="chatStore.currentQuestion.difficulty" class="meta-tag difficulty">
            ⭐ {{ chatStore.currentQuestion.difficulty }}
          </span>
          <button @click="requestNextQuestion" class="skip-btn">
            ⏭️ ข้าม
          </button>
        </div>
      </div>
      
      <!-- No Question State -->
      <div v-else class="hero-question-card empty">
        <div class="empty-state">
          <span class="empty-icon">📝</span>
          <p>กำลังโหลดคำถาม...</p>
        </div>
      </div>
    </div>

    <!-- ✨ ANSWER INPUT SECTION -->
    <div class="answer-section">
      <!-- Error Banner -->
      <div v-if="sendError" class="error-banner">
        <span>⚠️ {{ sendError }}</span>
        <button @click="sendError = null">✕</button>
      </div>

      <!-- Mode Toggle -->
      <div class="mode-toggle">
        <button 
          :class="['mode-btn', { active: !structuredMode }]"
          @click="structuredMode = false"
        >
          ✍️ พิมพ์อิสระ
        </button>
        <button 
          :class="['mode-btn', { active: structuredMode }]"
          @click="structuredMode = true"
        >
          🧩 แยกประเด็น
        </button>
      </div>

      <!-- FREE-FORM INPUT -->
      <div v-if="!structuredMode" class="answer-input-wrapper">
        <textarea
          v-model="inputText"
          @keydown.enter.exact.prevent="handleSend"
          @keydown="handleKeyDown"
          @input="handleInputChange"
          @paste.prevent="handlePaste"
          @copy.prevent="handleCopy"
          @cut.prevent="handleCut"
          @contextmenu.prevent
          @dragover.prevent
          @drop.prevent
          class="answer-textarea"
          placeholder="พิมพ์คำตอบของคุณที่นี่... ✍️"
          rows="4"
          :disabled="loading"
        ></textarea>
        
        <div class="input-footer">
          <span class="char-count" :class="{ warning: inputText.length < 20 && inputText.length > 0 }">
            {{ inputText.length }} ตัวอักษร
            <span v-if="inputText.length < 20 && inputText.length > 0">(ขั้นต่ำ 20)</span>
          </span>
          <button 
            @click="handleSend" 
            class="send-btn"
            :disabled="loading || inputText.trim().length < 1"
          >
            <span v-if="loading" class="loading-spinner"></span>
            <span v-else>ส่งคำตอบ 🚀</span>
          </button>
        </div>
      </div>

      <!-- STRUCTURED INPUT -->
      <div v-else class="structured-input">
        <!-- Analysis -->
        <div class="dimension-box analysis">
          <div class="dim-header">
            <span class="dim-icon">🔍</span>
            <span class="dim-title">การวิเคราะห์</span>
            <span class="dim-count">{{ structuredAnswer.analysis.filter(x => x.trim()).length }}</span>
          </div>
          <div class="dim-items">
            <div v-for="(item, idx) in structuredAnswer.analysis" :key="'a'+idx" class="dim-item">
              <input 
                v-model="structuredAnswer.analysis[idx]"
                type="text"
                placeholder="เขียนการวิเคราะห์..."
                @paste.prevent="handlePaste"
              >
              <button v-if="structuredAnswer.analysis.length > 1" @click="removeItem('analysis', idx)" class="remove-btn">✕</button>
            </div>
            <button @click="addItem('analysis')" class="add-btn">+ เพิ่ม</button>
          </div>
        </div>

        <!-- Reasoning -->
        <div class="dimension-box reasoning">
          <div class="dim-header">
            <span class="dim-icon">🧠</span>
            <span class="dim-title">การให้เหตุผล</span>
            <span class="dim-count">{{ structuredAnswer.reasoning.filter(x => x.trim()).length }}</span>
          </div>
          <div class="dim-items">
            <div v-for="(item, idx) in structuredAnswer.reasoning" :key="'r'+idx" class="dim-item">
              <input 
                v-model="structuredAnswer.reasoning[idx]"
                type="text"
                placeholder="เขียนเหตุผล..."
                @paste.prevent="handlePaste"
              >
              <button v-if="structuredAnswer.reasoning.length > 1" @click="removeItem('reasoning', idx)" class="remove-btn">✕</button>
            </div>
            <button @click="addItem('reasoning')" class="add-btn">+ เพิ่ม</button>
          </div>
        </div>

        <!-- Creativity -->
        <div class="dimension-box creativity">
          <div class="dim-header">
            <span class="dim-icon">💡</span>
            <span class="dim-title">ความคิดสร้างสรรค์</span>
            <span class="dim-count">{{ structuredAnswer.creativity.filter(x => x.trim()).length }}</span>
          </div>
          <div class="dim-items">
            <div v-for="(item, idx) in structuredAnswer.creativity" :key="'c'+idx" class="dim-item">
              <input 
                v-model="structuredAnswer.creativity[idx]"
                type="text"
                placeholder="เขียนไอเดียสร้างสรรค์..."
                @paste.prevent="handlePaste"
              >
              <button v-if="structuredAnswer.creativity.length > 1" @click="removeItem('creativity', idx)" class="remove-btn">✕</button>
            </div>
            <button @click="addItem('creativity')" class="add-btn">+ เพิ่ม</button>
          </div>
        </div>

        <!-- Evidence -->
        <div class="dimension-box evidence">
          <div class="dim-header">
            <span class="dim-icon">📚</span>
            <span class="dim-title">หลักฐาน/ตัวอย่าง</span>
            <span class="dim-count">{{ structuredAnswer.evidence.filter(x => x.trim()).length }}</span>
          </div>
          <div class="dim-items">
            <div v-for="(item, idx) in structuredAnswer.evidence" :key="'e'+idx" class="dim-item">
              <input 
                v-model="structuredAnswer.evidence[idx]"
                type="text"
                placeholder="เขียนหลักฐาน/ตัวอย่าง..."
                @paste.prevent="handlePaste"
              >
              <button v-if="structuredAnswer.evidence.length > 1" @click="removeItem('evidence', idx)" class="remove-btn">✕</button>
            </div>
            <button @click="addItem('evidence')" class="add-btn">+ เพิ่ม</button>
          </div>
        </div>

        <!-- Structured Footer -->
        <div class="structured-footer">
          <div class="struct-stats">
            <span>{{ totalStructuredItems }} ประเด็น</span>
            <span>{{ structuredCharCount }} ตัวอักษร</span>
          </div>
          <button 
            @click="handleSend" 
            class="send-btn"
            :disabled="loading || totalStructuredItems === 0"
          >
            <span v-if="loading" class="loading-spinner"></span>
            <span v-else>ส่งคำตอบ 🚀</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ✨ COLLAPSIBLE HISTORY (hidden by default) -->
    <details class="history-section">
      <summary class="history-toggle">
        📜 ดูประวัติการสนทนา ({{ messages.length }} ข้อความ)
      </summary>
      <div class="messages-container" ref="messagesContainer">
        <div 
          v-for="message in messages" 
          :key="message.id"
          :class="['message', `message-${message.from}`]"
        >
      >
        <div class="message-bubble">
          <div class="message-header">
            <span class="message-sender">
              {{ getSenderName(message.from) }}
            </span>
            <span class="message-time">
              {{ formatTime(message.timestamp) }}
            </span>
          </div>
          <div class="message-text" v-html="formatMessageText(message.text)"></div>
          
          <!-- Assessment scores if available -->
          <div v-if="message.assessmentId && getAssessment(message.assessmentId)" class="assessment-scores">
            <div class="score-grid">
              <div class="score-item">
                <span class="score-label">วิเคราะห์</span>
                <span class="score-value">{{ getAssessment(message.assessmentId).rubricScores.analysis }}/5</span>
              </div>
              <div class="score-item">
                <span class="score-label">เหตุผล</span>
                <span class="score-value">{{ getAssessment(message.assessmentId).rubricScores.reasoning }}/5</span>
              </div>
              <div class="score-item">
                <span class="score-label">สร้างสรรค์</span>
                <span class="score-value">{{ getAssessment(message.assessmentId).rubricScores.creativity }}/5</span>
              </div>
              <div class="score-item">
                <span class="score-label">หลักฐาน</span>
                <span class="score-value">{{ getAssessment(message.assessmentId).rubricScores.evidence }}/5</span>
              </div>
            </div>
            <div class="overall-score">
              คะแนนรวม: {{ getAssessment(message.assessmentId).overallScore }}/20
            </div>
            
            <!-- Gamification Info -->
            <div v-if="getAssessment(message.assessmentId).gamification" class="gamification-info">
              <div class="points-earned">
                ⭐ +{{ getAssessment(message.assessmentId).gamification.pointsEarned }} แต้ม
              </div>
              <div v-if="getAssessment(message.assessmentId).gamification.newBadges?.length > 0" class="new-badges">
                🏆 เหรียญใหม่: 
                <span v-for="badgeId in getAssessment(message.assessmentId).gamification.newBadges" :key="badgeId" class="badge-mini">
                  {{ getBadgeName(badgeId) }}
                </span>
              </div>
            </div>
            
            <!-- LO Assessment if available -->
            <div v-if="getAssessment(message.assessmentId).loAssessment" class="lo-assessment">
              <div class="lo-header">🎯 Learning Outcomes ที่ผ่าน:</div>
              <div v-if="getAssessment(message.assessmentId).loAssessment.passedLOs?.length > 0" class="lo-badges">
                <span 
                  v-for="loCode in getAssessment(message.assessmentId).loAssessment.passedLOs" 
                  :key="loCode"
                  class="lo-badge"
                >
                  ✅ {{ loCode }}
                </span>
              </div>
              <div v-else class="no-lo-passed">
                ⚠️ ยังไม่ผ่าน LO ในคำตอบนี้ - ลองตอบให้สอดคล้องกับ Learning Outcomes มากขึ้น! 💪
              </div>
              <div v-if="getAssessment(message.assessmentId).loAssessment.analysis" class="lo-analysis">
                💡 {{ getAssessment(message.assessmentId).loAssessment.analysis }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loading" class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
      </div>
    </details>

    <!-- Confirmation Dialog -->
    <div v-if="showConfirmDialog" class="modal-overlay" @click.self="cancelSend">
      <div class="confirm-dialog card">
        <div class="dialog-header">
          <h3>⚠️ ยืนยันการส่งคำตอบ</h3>
        </div>
        
        <div class="dialog-body">
          <p class="dialog-message">
            คุณต้องการส่งคำตอบนี้หรือไม่? กรุณาตรวจสอบคำตอบของคุณก่อนส่ง
          </p>
          
          <div class="answer-preview">
            <div class="preview-header">📝 คำตอบของคุณ:</div>
            <div class="preview-content">{{ pendingMessage }}</div>
            <div class="preview-stats">
              <span>ความยาว: {{ pendingMessage.length }} ตัวอักษร</span>
              <span>จำนวนคำ: {{ pendingMessage.split(/\s+/).length }} คำ</span>
            </div>
          </div>

          <div class="dialog-tips">
            💡 <strong>เคล็ดลับ:</strong> คำตอบที่ดีควรมี:
            <ul>
              <li>✓ การวิเคราะห์ที่ชัดเจน</li>
              <li>✓ เหตุผลที่สมเหตุสมผล</li>
              <li>✓ ตัวอย่างหรือหลักฐานประกอบ</li>
              <li>✓ ความคิดสร้างสรรค์</li>
            </ul>
          </div>
        </div>

        <div class="dialog-actions">
          <button @click="editMessage" class="btn btn-secondary">
            ✏️ แก้ไขคำตอบ
          </button>
          <button @click="cancelSend" class="btn btn-outline">
            ❌ ยกเลิก
          </button>
          <button @click="sendMessageConfirmed()" class="btn btn-primary">
            ✅ ยืนยันส่ง
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useThemeStore } from '@/stores/theme'
import { useGamificationStore } from '@/stores/gamification'
import BadgeNotification from '@/components/BadgeNotification.vue'
import PointsNotification from '@/components/PointsNotification.vue'
import ReflectionJournal from '@/components/ReflectionJournal.vue'
import { collection, query, where, getDocs, doc, updateDoc, orderBy, limit } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
// 🆕 Anti-Cheat System
import { TypingTracker, createTypingFingerprint, detectTextPatterns, getDeviceInfo, isMobileDevice } from '@/utils/antiCheat'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const chatStore = useChatStore()
const themeStore = useThemeStore()
const gamificationStore = useGamificationStore()

const inputText = ref('')
const messagesContainer = ref(null)
const sendingInProgress = ref(false)
const lastSendTime = ref(0)
const showConfirmDialog = ref(false)
const pendingMessage = ref('')

// 🆕 Auto-save draft state
const draftKey = computed(() => `chat_draft_${chatStore.currentSession?.id || 'temp'}`)
const sendError = ref(null)
const retryCount = ref(0)
const MAX_RETRIES = 3

// 🆕 Anti-Cheat: Typing Tracker
const typingTracker = ref(new TypingTracker())
const previousTextValue = ref('')
const antiCheatWarning = ref(null)
const showAntiCheatDialog = ref(false)
const antiCheatAnalysis = ref(null)

// 🔬 Research Metrics Tracking
const questionShownTime = ref(null)  // When question was displayed
const firstKeystrokeTime = ref(null) // Time of first keystroke
const revisionCount = ref(0)         // How many times answer was modified significantly
const lastAnswerSnapshot = ref('')   // For detecting major revisions
const thinkingPauseCount = ref(0)    // Pauses > 5 seconds
const lastKeyTime = ref(null)        // For pause detection
const totalKeystrokes = ref(0)       // Total keystrokes

// 🆕 Device Detection
const deviceInfo = ref(getDeviceInfo())
const isMobile = computed(() => deviceInfo.value.isMobile || deviceInfo.value.isTablet)

// 🆕 Reflection Journal State
const showReflectionModal = ref(false)
const sessionSummary = ref({
  averageScore: 0,
  questionsAnswered: 0,
  totalPoints: 0
})

// 🆕 Structured Answer Mode
const structuredMode = ref(false)
const structuredAnswer = ref({
  analysis: [''],
  reasoning: [''],
  creativity: [''],
  evidence: ['']
})

// Computed: Total items in structured answer
const totalStructuredItems = computed(() => {
  return structuredAnswer.value.analysis.filter(x => x.trim()).length +
         structuredAnswer.value.reasoning.filter(x => x.trim()).length +
         structuredAnswer.value.creativity.filter(x => x.trim()).length +
         structuredAnswer.value.evidence.filter(x => x.trim()).length
})

// Computed: Total char count in structured answer
const structuredCharCount = computed(() => {
  const allText = [
    ...structuredAnswer.value.analysis,
    ...structuredAnswer.value.reasoning,
    ...structuredAnswer.value.creativity,
    ...structuredAnswer.value.evidence
  ].filter(x => x.trim()).join('')
  return allText.length
})

// 🆕 Adaptive Learning Path State
const activePath = ref(null)
const loadingPath = ref(false)

const messages = computed(() => chatStore.messages)
const assessments = computed(() => chatStore.assessments)
const loading = computed(() => chatStore.loading)
const isDarkMode = computed(() => themeStore.isDarkMode)

// 🆕 Adaptive Path Computed Properties
const currentStepIndex = computed(() => activePath.value?.currentStepIndex || 0)
const pathSteps = computed(() => activePath.value?.pathSteps || [])
const totalSteps = computed(() => pathSteps.value.length)
const completedSteps = computed(() => pathSteps.value.filter(s => s.completed).length)
const currentStep = computed(() => {
  if (currentStepIndex.value < pathSteps.value.length) {
    return pathSteps.value[currentStepIndex.value]
  }
  return null
})

// Initialize session on mount
onMounted(async () => {
  // Check if coming from adaptive learning with query params
  const adaptiveMode = route.query.adaptive === 'true'
  const pathId = route.query.pathId
  
  if (adaptiveMode && pathId) {
    await loadAdaptivePath(pathId)
  }
  
  if (!chatStore.currentSession) {
    // Get selected course from localStorage
    const selectedCourseId = localStorage.getItem('selectedCourseId')
    await chatStore.startSession(selectedCourseId)
  }
  
  // If adaptive path is active, handle current step
  if (activePath.value && currentStep.value) {
    await handleCurrentPathStep()
  }
  
  // 🆕 Restore draft from localStorage
  const savedDraft = localStorage.getItem(draftKey.value)
  if (savedDraft && savedDraft.trim().length > 0) {
    const preview = savedDraft.length > 100 ? savedDraft.substring(0, 100) + '...' : savedDraft
    const shouldRestore = confirm(
      '📝 พบคำตอบที่ยังไม่ได้ส่ง\n\n' +
      '"' + preview + '"\n\n' +
      'คุณต้องการกู้คืนคำตอบนี้หรือไม่?'
    )
    if (shouldRestore) {
      inputText.value = savedDraft
    } else {
      localStorage.removeItem(draftKey.value)
    }
  }
  
  // 🆕 Mobile Anti-Cheat: Add visibility change listener
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  // 🆕 Log device info for debugging
  console.log('📱 Device Info:', deviceInfo.value)
  
  scrollToBottom()
})

// Clean up on unmount
onUnmounted(() => {
  // 🆕 Remove visibility change listener
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// 🆕 Auto-save draft to localStorage whenever inputText changes
watch(inputText, (newValue) => {
  if (newValue && newValue.trim().length > 0) {
    localStorage.setItem(draftKey.value, newValue)
  } else {
    localStorage.removeItem(draftKey.value)
  }
})

// Auto-scroll when new messages arrive
watch(messages, () => {
  nextTick(() => scrollToBottom())
}, { deep: true })

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function getSenderName(from) {
  const names = {
    'student': 'คุณ',
    'bot': 'AI Assistant',
    'system': 'ระบบ'
  }
  return names[from] || from
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

function getAssessment(assessmentId) {
  if (!assessmentId) return null
  return assessments.value.find(a => a.id === assessmentId) || null
}

function getBadgeName(badgeId) {
  const badge = gamificationStore.getBadgeById(badgeId)
  return badge ? `${badge.icon} ${badge.name}` : badgeId
}

function formatMessageText(text) {
  if (!text) return ''
  
  // แปลง markdown-like syntax เป็น HTML
  let formatted = text
    // Bold (**text**)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Line breaks
    .replace(/\n/g, '<br>')
    // Numbered lists
    .replace(/^(\d+)\.\s(.+)$/gm, '<div style="margin-left: 1rem;">$1. $2</div>')
    // Separators
    .replace(/^---$/gm, '<hr style="margin: 1rem 0; border-color: var(--border-color);">')
  
  return formatted
}

// 🆕 Request next question (skip current)
async function requestNextQuestion() {
  if (loading.value) return
  
  // ส่งคำว่า "ถัดไป" เพื่อขอคำถามใหม่
  const skipMessage = 'ถัดไป'
  inputText.value = skipMessage
  
  // Reset anti-cheat tracker
  antiCheatTracker.value = {
    keystrokes: [],
    pasteCount: 0,
    typingPatterns: [],
    deletionCount: 0,
    rapidInputCount: 0,
    lastKeystrokeTime: null
  }
  
  await chatStore.sendMessage(skipMessage)
  inputText.value = ''
}

async function handleSend() {
  // 🆕 Handle Structured Mode
  if (structuredMode.value) {
    await handleStructuredSend()
    return
  }
  
  if (!inputText.value.trim() || loading.value || sendingInProgress.value) return

  const text = inputText.value.trim()
  
  // ตรวจสอบว่าเป็นการขอคำถามใหม่หรือไม่ (ตรวจสอบก่อนเช็คความยาว)
  const isRequestNewQuestion = ['ถัดไป', 'next', 'ต่อไป', 'ข้อถัดไป', 'คำถามใหม่'].some(keyword => 
    text.toLowerCase().includes(keyword)
  )
  
  // ถ้าไม่ใช่การขอคำถามใหม่ ให้ตรวจสอบความยาวขั้นต่ำ
  if (!isRequestNewQuestion) {
    const minLength = 20
    if (text.length < minLength) {
      alert(`⚠️ คำตอบสั้นเกินไป!\n\nกรุณาตอบให้ละเอียดมากกว่านี้ (อย่างน้อย ${minLength} ตัวอักษร)\nปัจจุบัน: ${text.length} ตัวอักษร\n\n💡 หรือพิมพ์ "ถัดไป" เพื่อข้ามไปคำถามถัดไป`)
      return
    }
    
    // 🆕 Anti-Cheat: Validate typing behavior
    const validation = validateTypingBehavior(text)
    
    if (!validation.valid) {
      // Block submission
      showAntiCheatDialog.value = true
      alert(validation.message)
      return
    }
    
    if (validation.warning) {
      // Show warning but allow submission with extra verification
      const proceed = confirm(
        `${validation.message}\n\nคุณยืนยันว่าพิมพ์คำตอบนี้ด้วยตัวเองใช่หรือไม่?`
      )
      if (!proceed) {
        return
      }
    }
  }
  
  // ป้องกันการกดส่งซ้ำๆ ภายใน 2 วินาที (debounce)
  const now = Date.now()
  if (now - lastSendTime.value < 2000) {
    alert('⏳ กรุณารอสักครู่ก่อนส่งข้อความถัดไป')
    return
  }
  
  // ถ้าไม่ใช่การขอคำถามใหม่ ให้แสดง confirmation dialog
  if (!isRequestNewQuestion) {
    pendingMessage.value = text
    showConfirmDialog.value = true
    return
  }
  
  // ถ้าเป็นการขอคำถามใหม่ ส่งเลยและ reset anti-cheat
  resetAntiCheat()
  await sendMessageConfirmed(text, true)
}

// 🆕 Handle Structured Answer Send
async function handleStructuredSend() {
  if (loading.value || sendingInProgress.value) return
  
  // Validate structured answer
  if (totalStructuredItems.value === 0) {
    alert('⚠️ กรุณาเพิ่มคำตอบอย่างน้อย 1 ประเด็น')
    return
  }
  
  if (structuredCharCount.value < 20) {
    alert(`⚠️ คำตอบสั้นเกินไป!\n\nกรุณาตอบให้ละเอียดมากกว่านี้ (อย่างน้อย 20 ตัวอักษร)\nปัจจุบัน: ${structuredCharCount.value} ตัวอักษร`)
    return
  }
  
  // Debounce
  const now = Date.now()
  if (now - lastSendTime.value < 2000) {
    alert('⏳ กรุณารอสักครู่ก่อนส่งข้อความถัดไป')
    return
  }
  
  // Build structured text for preview
  const structuredText = buildStructuredText()
  pendingMessage.value = structuredText
  showConfirmDialog.value = true
}

// 🆕 Build formatted text from structured answer
function buildStructuredText() {
  let text = ''
  
  const analysisItems = structuredAnswer.value.analysis.filter(x => x.trim())
  const reasoningItems = structuredAnswer.value.reasoning.filter(x => x.trim())
  const creativityItems = structuredAnswer.value.creativity.filter(x => x.trim())
  const evidenceItems = structuredAnswer.value.evidence.filter(x => x.trim())
  
  if (analysisItems.length > 0) {
    text += '【การวิเคราะห์】\n'
    analysisItems.forEach((item, i) => {
      text += `${i + 1}. ${item}\n`
    })
    text += '\n'
  }
  
  if (reasoningItems.length > 0) {
    text += '【การให้เหตุผล】\n'
    reasoningItems.forEach((item, i) => {
      text += `${i + 1}. ${item}\n`
    })
    text += '\n'
  }
  
  if (creativityItems.length > 0) {
    text += '【ความคิดสร้างสรรค์】\n'
    creativityItems.forEach((item, i) => {
      text += `${i + 1}. ${item}\n`
    })
    text += '\n'
  }
  
  if (evidenceItems.length > 0) {
    text += '【หลักฐาน/ตัวอย่าง】\n'
    evidenceItems.forEach((item, i) => {
      text += `${i + 1}. ${item}\n`
    })
  }
  
  return text.trim()
}

// 🆕 Add item to a dimension
function addItem(dimension) {
  structuredAnswer.value[dimension].push('')
}

// 🆕 Remove item from a dimension
function removeItem(dimension, index) {
  if (structuredAnswer.value[dimension].length > 1) {
    structuredAnswer.value[dimension].splice(index, 1)
  } else {
    // Keep at least one empty field
    structuredAnswer.value[dimension][0] = ''
  }
}

// 🆕 Clear all structured answer
function clearStructuredAnswer() {
  if (totalStructuredItems.value === 0) return
  
  if (confirm('🗑️ ต้องการล้างคำตอบทั้งหมดหรือไม่?')) {
    structuredAnswer.value = {
      analysis: [''],
      reasoning: [''],
      creativity: [''],
      evidence: ['']
    }
  }
}

async function sendMessageConfirmed(text = null, isRequestNewQuestion = false) {
  const messageText = text || pendingMessage.value
  
  if (!messageText) return
  
  sendingInProgress.value = true
  sendError.value = null
  retryCount.value = 0
  
  // 🆕 Anti-Cheat: Create typing fingerprint to send to server
  const typingFingerprint = !isRequestNewQuestion 
    ? createTypingFingerprint(typingTracker.value) 
    : null
  
  // 🔬 Collect research metrics before sending
  const researchMetrics = !isRequestNewQuestion ? collectResearchMetrics(messageText) : null
  
  // Save to localStorage as backup before sending
  const backupKey = `chat_backup_${Date.now()}`
  localStorage.setItem(backupKey, messageText)
  
  // Clear input and dialogs
  inputText.value = ''
  showConfirmDialog.value = false
  pendingMessage.value = ''
  lastSendTime.value = Date.now()
  
  // 🆕 Clear structured answer after successful send
  if (structuredMode.value) {
    structuredAnswer.value = {
      analysis: [''],
      reasoning: [''],
      creativity: [''],
      evidence: ['']
    }
  }

  // 🆕 Retry logic with exponential backoff
  const attemptSend = async (attemptNumber = 1) => {
    try {
      if (isRequestNewQuestion) {
        // 🆕 If in adaptive path mode, move to next step
        if (activePath.value && currentStep.value) {
          await moveToNextPathStep()
        } else {
          // Normal mode: request new question
          await chatStore.requestNewQuestion()
        }
      } else {
        // ส่งคำตอบ พร้อม typing fingerprint และ research metrics
        const assessment = await chatStore.sendMessage(messageText, { 
          typingFingerprint,
          researchMetrics
        })
        
        // 🆕 If in adaptive path and answered a question, update path progress
        if (activePath.value && currentStep.value?.type?.startsWith('question-')) {
          await updatePathProgress(assessment)
        }
      }
      
      // Success - clear backup and draft, reset anti-cheat
      localStorage.removeItem(backupKey)
      localStorage.removeItem(draftKey.value)
      sendError.value = null
      resetAntiCheat() // Reset tracker for next answer
      
    } catch (error) {
      console.error(`Send attempt ${attemptNumber} failed:`, error)
      retryCount.value = attemptNumber
      
      // 🆕 Check if error is from anti-cheat detection
      if (error.message?.includes('copy-paste') || error.message?.includes('anti-cheat')) {
        sendError.value = '🚨 ตรวจพบการทุจริต: ' + error.message
        inputText.value = messageText // Restore text
        throw error // Don't retry for cheating
      }
      
      // Retry up to MAX_RETRIES times
      if (attemptNumber < MAX_RETRIES) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attemptNumber) * 1000
        sendError.value = `เกิดข้อผิดพลาด กำลังลองใหม่... (ครั้งที่ ${attemptNumber}/${MAX_RETRIES})`
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return await attemptSend(attemptNumber + 1)
      } else {
        // All retries failed - restore input and show error
        sendError.value = 'ส่งข้อความไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'
        inputText.value = messageText // Restore text for user to retry
        
        // Keep backup for manual retry
        alert(
          '❌ ไม่สามารถส่งข้อความได้\n\n' +
          'กรุณาตรวจสอบ:\n' +
          '• การเชื่อมต่ออินเทอร์เน็ต\n' +
          '• ความเสถียรของสัญญาณ\n\n' +
          'คำตอบของคุณถูกบันทึกไว้แล้ว คุณสามารถกดส่งอีกครั้งได้เลย'
        )
        throw error
      }
    }
  }

  try {
    await attemptSend()
  } finally {
    sendingInProgress.value = false
  }
}

// 🆕 ADAPTIVE LEARNING PATH FUNCTIONS

async function loadAdaptivePath(pathId) {
  if (!pathId) return
  
  loadingPath.value = true
  try {
    const q = query(
      collection(db, 'learningPaths'),
      where('__name__', '==', pathId)
    )
    const snapshot = await getDocs(q)
    
    if (!snapshot.empty) {
      activePath.value = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      }
    }
  } catch (error) {
    console.error('Error loading adaptive path:', error)
  } finally {
    loadingPath.value = false
  }
}

async function handleCurrentPathStep() {
  if (!currentStep.value) return
  
  const step = currentStep.value
  
  // If current step is a micro-lesson, display it
  if (step.type === 'micro-lesson') {
    const lessonMessage = {
      id: `lesson-${Date.now()}`,
      from: 'system',
      text: `📚 **Micro-Lesson: ${step.title}**\n\n${step.content || ''}\n\n⏱️ Estimated time: ${step.estimatedMinutes || 5} minutes\n\n🎯 Learning Outcome: ${step.loCode} - ${step.loDescription}\n\n---\n\nเมื่อคุณพร้อมแล้ว พิมพ์ "ถัดไป" เพื่อไปยังคำถามถัดไป`,
      timestamp: new Date()
    }
    
    chatStore.messages.push(lessonMessage)
  } 
  // If current step is a question, request appropriate question
  else if (step.type?.startsWith('question-')) {
    // Request question with specific difficulty and related LO
    await chatStore.requestNewQuestion({
      difficulty: step.difficulty,
      relatedLOs: [step.loCode],
      questionType: step.questionType
    })
  }
}

async function moveToNextPathStep() {
  if (!activePath.value) return
  
  const nextIndex = currentStepIndex.value + 1
  
  if (nextIndex >= totalSteps.value) {
    // Path completed!
    alert('🎉 ยินดีด้วย! คุณทำ Learning Path สำเร็จแล้ว!\n\nคุณได้พัฒนาทักษะใน Learning Outcomes ที่อ่อนแล้ว 💪')
    activePath.value = null
    router.push('/adaptive-learning')
    return
  }
  
  // Update path in Firestore
  try {
    const pathRef = doc(db, 'learningPaths', activePath.value.id)
    await updateDoc(pathRef, {
      currentStepIndex: nextIndex
    })
    
    // Update local state
    activePath.value.currentStepIndex = nextIndex
    
    // Handle next step
    await handleCurrentPathStep()
  } catch (error) {
    console.error('Error moving to next step:', error)
    alert('เกิดข้อผิดพลาดในการไปขั้นตอนถัดไป')
  }
}

async function updatePathProgress(assessment) {
  if (!activePath.value || !currentStep.value || !assessment) return
  
  const score = assessment.overallScore || 0
  const stepIndex = currentStepIndex.value
  
  try {
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'http://localhost:5001/hots-ai-chatloop/us-central1'
    const response = await fetch(`${functionsUrl}/updateAdaptivePath`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pathId: activePath.value.id,
        stepIndex: stepIndex,
        completed: true,
        score: score
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      // Update local path state
      pathSteps.value[stepIndex].completed = true
      pathSteps.value[stepIndex].score = score
      
      if (data.shouldLoop) {
        // Loop back notification
        alert(`⚠️ คะแนนยังไม่ผ่านเกณฑ์ (${score}/20)\n\nเราจะวนกลับไปทบทวนเนื้อหาอีกครั้ง เพื่อให้คุณเข้าใจดีขึ้น 💪`)
        
        // Reload path data
        await loadAdaptivePath(activePath.value.id)
        await handleCurrentPathStep()
      } else if (data.status === 'completed') {
        // Path completed!
        alert('🎊 ยินดีด้วย! คุณทำ Adaptive Learning Path สำเร็จครบทุกขั้นตอนแล้ว!\n\nคุณได้พัฒนาทักษะอย่างเห็นได้ชัด! 🏆')
        activePath.value = null
        router.push('/adaptive-learning')
      } else {
        // Move to next step
        await moveToNextPathStep()
      }
    }
  } catch (error) {
    console.error('Error updating path progress:', error)
  }
}

function viewFullPath() {
  router.push('/adaptive-learning')
}

function exitPath() {
  if (confirm('คุณต้องการออกจาก Adaptive Learning Path หรือไม่?\n\nความคืบหน้าของคุณจะถูกบันทึกไว้')) {
    activePath.value = null
    router.push('/adaptive-learning')
  }
}

function cancelSend() {
  showConfirmDialog.value = false
  pendingMessage.value = ''
}

function editMessage() {
  inputText.value = pendingMessage.value
  showConfirmDialog.value = false
  pendingMessage.value = ''
}

async function handleEndSession() {
  if (confirm('คุณต้องการจบการสนทนานี้หรือไม่?')) {
    // Calculate session summary before ending
    await calculateSessionSummary()
    
    // Show reflection modal
    showReflectionModal.value = true
  }
}

async function calculateSessionSummary() {
  try {
    const sessionAssessments = assessments.value.filter(a => 
      a.sessionId === chatStore.currentSession?.id
    )
    
    if (sessionAssessments.length > 0) {
      const totalScore = sessionAssessments.reduce((sum, a) => sum + (a.overallScore || 0), 0)
      const totalPoints = sessionAssessments.reduce((sum, a) => 
        sum + (a.gamification?.pointsEarned || 0), 0
      )
      
      sessionSummary.value = {
        averageScore: Math.round(totalScore / sessionAssessments.length),
        questionsAnswered: sessionAssessments.length,
        totalPoints: totalPoints
      }
    }
  } catch (error) {
    console.error('Error calculating session summary:', error)
  }
}

function onReflectionSaved() {
  // After saving reflection, end session and go to dashboard
  chatStore.endSession()
  router.push('/student')
}

function toggleTheme() {
  themeStore.toggleTheme()
}

// Prevent copy-paste operations
function handlePaste(e) {
  e.preventDefault()
  // 🆕 บันทึก paste event แม้จะ prevent
  typingTracker.value.recordPasteEvent(0)
  
  // ข้อความแตกต่างกันตามอุปกรณ์
  const deviceType = isMobile.value ? 'Mobile' : 'PC'
  alert(`⚠️ ไม่สามารถวางข้อความได้ (${deviceType})\n\nกรุณาพิมพ์ด้วยตนเอง\nระบบจะตรวจสอบรูปแบบการพิมพ์เพื่อความยุติธรรม`)
}

function handleCopy(e) {
  e.preventDefault()
  alert('ไม่สามารถคัดลอกข้อความได้')
}

function handleCut(e) {
  e.preventDefault()
  alert('ไม่สามารถตัดข้อความได้')
}

// 🆕 Anti-Cheat: Track keystrokes (PC)
function handleKeyDown(e) {
  // PC: track keystrokes
  if (!isMobile.value) {
    typingTracker.value.recordKeystroke(e, inputText.value.length)
  }
}

// 🆕 Anti-Cheat: Detect sudden text changes (Both PC & Mobile)
function handleInputChange(e) {
  const newText = e.target.value
  
  // 🔬 Research Metrics: Track first keystroke
  if (!firstKeystrokeTime.value && newText.length > 0) {
    firstKeystrokeTime.value = Date.now()
  }
  
  // 🔬 Research Metrics: Track thinking pauses (> 5 seconds)
  if (lastKeyTime.value) {
    const timeSinceLastKey = Date.now() - lastKeyTime.value
    if (timeSinceLastKey > 5000) {
      thinkingPauseCount.value++
    }
  }
  lastKeyTime.value = Date.now()
  totalKeystrokes.value++
  
  // 🔬 Research Metrics: Detect major revisions (> 20% change)
  if (lastAnswerSnapshot.value && newText.length > 10) {
    const prevLength = lastAnswerSnapshot.value.length
    const lengthDiff = Math.abs(newText.length - prevLength)
    if (prevLength > 0 && lengthDiff / prevLength > 0.2) {
      revisionCount.value++
      lastAnswerSnapshot.value = newText
    }
  } else if (newText.length > 20 && !lastAnswerSnapshot.value) {
    lastAnswerSnapshot.value = newText
  }
  
  // Mobile: ใช้ recordTouchInput แทน recordKeystroke
  if (isMobile.value && e.inputType) {
    typingTracker.value.recordTouchInput(e, newText.length, previousTextValue.value?.length || 0)
  }
  
  const result = typingTracker.value.recordTextChange(newText, previousTextValue.value)
  previousTextValue.value = newText
  
  if (result.suspicious) {
    console.warn('🚨 Suspicious input detected:', result)
    antiCheatWarning.value = {
      type: result.type,
      details: result.details,
      timestamp: Date.now()
    }
  }
}

// 🆕 Mobile: Track focus lost (อาจไปคัดลอกจากที่อื่น)
function handleFocusLost() {
  if (isMobile.value) {
    typingTracker.value.recordFocusLost()
    console.log('📱 Mobile focus lost - tracked')
  }
}

// 🆕 Mobile: Track visibility change (app switching)
function handleVisibilityChange() {
  if (document.hidden && isMobile.value) {
    typingTracker.value.recordAppSwitch()
    console.log('📱 App switch detected')
  }
}

// 🆕 Anti-Cheat: Reset tracker เมื่อเริ่มคำถามใหม่
function resetAntiCheat() {
  typingTracker.value = new TypingTracker() // สร้างใหม่เพื่อ detect device อีกครั้ง
  previousTextValue.value = ''
  antiCheatWarning.value = null
  antiCheatAnalysis.value = null
  
  // 🔬 Reset research metrics for new question
  questionShownTime.value = Date.now()
  firstKeystrokeTime.value = null
  revisionCount.value = 0
  lastAnswerSnapshot.value = ''
  thinkingPauseCount.value = 0
  lastKeyTime.value = null
  totalKeystrokes.value = 0
}

// 🔬 Research Metrics: Collect all metrics for analysis
function collectResearchMetrics(text) {
  const now = Date.now()
  
  // Calculate word count (Thai + English)
  const thaiWords = text.match(/[\u0E00-\u0E7F]+/g) || []
  const englishWords = text.match(/[a-zA-Z]+/g) || []
  const wordCount = thaiWords.length + englishWords.length
  
  // Calculate sentence count (rough estimate)
  const sentences = text.split(/[.!?。！？\n]+/).filter(s => s.trim().length > 0)
  const sentenceCount = sentences.length
  
  // Calculate unique word ratio (vocabulary diversity)
  const allWords = [...thaiWords, ...englishWords].map(w => w.toLowerCase())
  const uniqueWords = new Set(allWords)
  const uniqueWordRatio = allWords.length > 0 ? uniqueWords.size / allWords.length : 0
  
  // Calculate timing metrics
  const answerDurationMs = questionShownTime.value ? now - questionShownTime.value : 0
  const firstKeystrokeMs = (questionShownTime.value && firstKeystrokeTime.value) 
    ? firstKeystrokeTime.value - questionShownTime.value 
    : 0
  
  // Calculate typing speed (chars per minute)
  const typingTimeMs = firstKeystrokeTime.value ? now - firstKeystrokeTime.value : answerDurationMs
  const avgTypingSpeed = typingTimeMs > 0 ? (text.length / typingTimeMs) * 60000 : 0
  
  return {
    answerMetrics: {
      wordCount,
      charCount: text.length,
      sentenceCount,
      avgWordsPerSentence: sentenceCount > 0 ? wordCount / sentenceCount : 0,
      uniqueWordRatio: Math.round(uniqueWordRatio * 100) / 100
    },
    timingMetrics: {
      answerDurationMs,
      firstKeystrokeMs,
      thinkingPauseCount: thinkingPauseCount.value,
      avgTypingSpeed: Math.round(avgTypingSpeed)
    },
    revisionMetrics: {
      revisionCount: revisionCount.value,
      majorRevisions: revisionCount.value, // Currently same as revisionCount
      totalKeystrokes: totalKeystrokes.value
    }
  }
}

// 🆕 Anti-Cheat: Validate before sending
function validateTypingBehavior(text) {
  const analysis = typingTracker.value.analyze(text)
  antiCheatAnalysis.value = analysis
  
  const deviceType = analysis.deviceInfo?.type || 'unknown'
  
  if (!analysis.isValid) {
    return {
      valid: false,
      message: `⚠️ ตรวจพบพฤติกรรมการพิมพ์ที่ผิดปกติ (${deviceType}):\n\n${analysis.reasons.join('\n')}\n\nกรุณาพิมพ์คำตอบด้วยตนเอง`,
      analysis
    }
  }
  
  if (analysis.suspiciousLevel >= 30) {
    return {
      valid: true,
      warning: true,
      message: `⚠️ พบรูปแบบการพิมพ์ที่น่าสงสัย (${analysis.suspiciousLevel}% - ${deviceType})\n\nคำตอบจะถูกตรวจสอบเพิ่มเติม`,
      analysis
    }
  }
  
  return { valid: true, warning: false, analysis }
}
</script>

<style scoped>
/* ========== NEW CLEAN LAYOUT ========== */
.chat-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
  gap: 1rem;
}

/* ===== TOP BAR ===== */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.app-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.top-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.icon-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 8px;
  transition: background 0.2s;
}

.icon-btn:hover {
  background: var(--bg-secondary);
}

.btn-end {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-end:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* ===== HERO QUESTION CARD ===== */
.hero-question-section {
  flex-shrink: 0;
}

.hero-question-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
}

.hero-question-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  pointer-events: none;
}

.hero-question-card.empty {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  text-align: center;
  padding: 3rem;
}

.empty-state .empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.question-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.9;
  margin-bottom: 0.75rem;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.5; }
}

.hero-question-text {
  margin: 0 0 1rem;
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1.5;
}

.question-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.meta-tag {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  backdrop-filter: blur(4px);
}

.skip-btn {
  margin-left: auto;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.skip-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* ===== ANSWER SECTION ===== */
.answer-section {
  flex: 0 0 auto;
}

.error-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
}

.error-banner button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 1.1rem;
}

/* Mode Toggle */
.mode-toggle {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.mode-btn {
  flex: 1;
  padding: 0.6rem 1rem;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 10px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn:hover {
  border-color: #667eea;
}

.mode-btn.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.1));
  border-color: #667eea;
  color: var(--text-primary);
  font-weight: 600;
}

/* Free-form Input */
.answer-input-wrapper {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  padding: 1rem;
  transition: border-color 0.2s;
}

.answer-input-wrapper:focus-within {
  border-color: #667eea;
}

.answer-textarea {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.6;
  resize: none;
  outline: none;
  font-family: inherit;
}

.answer-textarea::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

/* ===== STRUCTURED INPUT ===== */
.structured-input {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dimension-box {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 0.75rem;
  border-left: 4px solid;
}

.dimension-box.analysis { border-left-color: #3b82f6; }
.dimension-box.reasoning { border-left-color: #8b5cf6; }
.dimension-box.creativity { border-left-color: #f59e0b; }
.dimension-box.evidence { border-left-color: #10b981; }

.dim-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.dim-icon { font-size: 1.1rem; }

.dim-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.dim-count {
  margin-left: auto;
  background: rgba(102, 126, 234, 0.2);
  color: #667eea;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.dim-items {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.dim-item {
  display: flex;
  gap: 0.4rem;
}

.dim-item input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.dim-item input:focus {
  outline: none;
  border-color: #667eea;
}

.remove-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.add-btn {
  padding: 0.4rem 0.75rem;
  border: 1px dashed var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8rem;
  margin-top: 0.25rem;
  transition: all 0.2s;
}

.add-btn:hover {
  border-color: #667eea;
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.structured-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  margin-top: 0.5rem;
}

.struct-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.char-count {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.char-count.warning {
  color: #f59e0b;
}

.send-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.6rem 1.5rem;
  border-radius: 25px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== TIPS SECTION ===== */
.tips-section {
  margin-top: 0.75rem;
}

.tips-section summary {
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem 0;
  user-select: none;
}

.tips-section summary:hover {
  color: var(--text-primary);
}

.tips-content {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-top: 0.5rem;
}

.tip {
  font-size: 0.8rem;
  color: var(--text-secondary);
  padding: 0.35rem;
}

@media (max-width: 600px) {
  .tips-content {
    grid-template-columns: 1fr;
  }
}

/* ===== HISTORY SECTION ===== */
.history-section {
  margin-top: 0.5rem;
}

.history-toggle {
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  user-select: none;
  display: block;
}

.history-toggle:hover {
  background: var(--bg-tertiary);
}

.messages-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--bg-tertiary);
  border-radius: 0 0 8px 8px;
  margin-top: -8px;
}

/* ===== ADAPTIVE PATH BANNER ===== */
.adaptive-path-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.path-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.path-actions {
  display: flex;
  gap: 0.5rem;
}

.path-actions .btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
}

/* Keep existing message styles */
.chat-header {
  flex-shrink: 0;
  padding: 1rem 1.5rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* 🆕 Adaptive Path Banner */
.adaptive-path-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.path-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.path-icon {
  font-size: 1.5rem;
}

.path-label {
  font-weight: 600;
  font-size: 1.1rem;
}

.path-progress {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.9rem;
}

.path-actions {
  display: flex;
  gap: 0.5rem;
}

.path-actions .btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;
}

.path-actions .btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.icon-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background 0.3s ease;
}

.icon-btn:hover {
  background: var(--bg-secondary);
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.messages-container {
  flex: 1;
  min-height: 200px;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.message {
  display: flex;
  max-width: 80%;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-student {
  align-self: flex-end;
}

.message-bot,
.message-system {
  align-self: flex-start;
}

.message-bubble {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px var(--shadow);
  border: 1px solid var(--border-color);
}

.message-student .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 1rem;
}

.message-sender {
  font-weight: 600;
  font-size: 0.875rem;
}

.message-time {
  font-size: 0.75rem;
  opacity: 0.7;
}

.message-text {
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* LO Target Highlighting in Questions */
.message-bot .message-text strong {
  color: #fbbf24;
  font-weight: 700;
}

.message-bot .message-text em {
  color: #60a5fa;
  font-style: normal;
  background: rgba(96, 165, 250, 0.15);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
}

.assessment-scores {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
}

.score-label {
  font-size: 0.875rem;
  opacity: 0.9;
}

.score-value {
  font-weight: 700;
  font-size: 1rem;
}

.overall-score {
  text-align: center;
  font-weight: 700;
  font-size: 1.125rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
}

/* LO Assessment Styles */
.lo-assessment {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(59, 130, 246, 0.15);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.gamification-info {
  margin-top: 1rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%);
  border-radius: 8px;
  border: 1px solid rgba(251, 191, 36, 0.4);
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.points-earned {
  font-weight: 700;
  font-size: 1rem;
  color: #fbbf24;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.new-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.875rem;
  color: #a78bfa;
}

.badge-mini {
  padding: 0.25rem 0.5rem;
  background: rgba(139, 92, 246, 0.2);
  border-radius: 4px;
  border: 1px solid rgba(139, 92, 246, 0.4);
  font-weight: 600;
}

.lo-header {
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #60a5fa;
}

.lo-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.lo-badge {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.no-lo-passed {
  color: #fbbf24;
  font-style: italic;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.lo-analysis {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.875rem;
  line-height: 1.5;
  opacity: 0.9;
}

.typing-indicator {
  display: flex;
  gap: 0.25rem;
  padding: 1rem;
  align-self: flex-start;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.input-container {
  flex-shrink: 0;
  padding: 1rem;
  position: relative;
  max-height: 50vh;
  overflow-y: auto;
}

/* 🆕 Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1));
  border: 2px solid rgba(239, 68, 68, 0.4);
  border-radius: 10px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.error-text {
  flex: 1;
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9rem;
}

.error-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.error-close:hover {
  opacity: 1;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  gap: 1rem;
}

.char-count {
  font-size: 0.875rem;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.char-count.warning {
  color: #f59e0b;
  font-weight: 600;
}

.chat-input {
  width: 100%;
  resize: none;
  font-family: inherit;
  font-size: 1rem;
  min-height: 80px;
}

/* Mobile-specific input styles */
.chat-input.mobile-input {
  font-size: 16px; /* Prevent iOS zoom on focus */
  -webkit-text-size-adjust: 100%;
  -webkit-appearance: none;
  appearance: none;
  touch-action: manipulation;
}

/* Disable text selection styling on mobile */
.chat-input.mobile-input::selection {
  background: var(--primary-color);
  color: white;
}

/* Mobile keyboard-friendly padding */
@media (max-width: 768px) {
  .chat-input {
    min-height: 100px;
    padding: 1rem;
    font-size: 16px;
  }
  
  .chat-input-container {
    position: sticky;
    bottom: 0;
    background: var(--card-bg);
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 100;
  }
}

.send-btn {
  padding: 0.875rem 1.5rem;
  white-space: nowrap;
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 1rem;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Confirmation Dialog */
.confirm-dialog {
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dialog-header {
  padding: 1.5rem;
  border-bottom: 2px solid var(--border-color);
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dialog-body {
  padding: 1.5rem;
}

.dialog-message {
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.answer-preview {
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.preview-header {
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #60a5fa;
  font-size: 0.95rem;
}

.preview-content {
  background: rgba(0, 0, 0, 0.2);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  font-size: 0.95rem;
}

.preview-stats {
  display: flex;
  gap: 1.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.dialog-tips {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(251, 191, 36, 0.15));
  border-left: 4px solid #f59e0b;
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
}

.dialog-tips strong {
  color: #fbbf24;
}

.dialog-tips ul {
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
}

.dialog-tips li {
  margin: 0.25rem 0;
  color: var(--text-primary);
}

.dialog-actions {
  padding: 1rem 1.5rem;
  border-top: 2px solid var(--border-color);
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.btn-outline {
  background: transparent;
  border: 2px solid var(--border-color);
  color: var(--text-primary);
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--primary-color);
}

@media (max-width: 768px) {
  .chat-container {
    padding: 0.5rem;
  }
  
  .message {
    max-width: 90%;
  }
  
  .score-grid {
    grid-template-columns: 1fr;
  }
  
  .header-content h2 {
    font-size: 1.125rem;
  }

  .confirm-dialog {
    max-width: 100%;
    margin: 0.5rem;
  }

  .dialog-actions {
    flex-direction: column;
  }

  .dialog-actions button {
    width: 100%;
  }

  .input-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .char-count {
    text-align: center;
  }
}

/* ==========================================
   🆕 STRUCTURED INPUT STYLES
   ========================================== */

.input-mode-toggle {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.25rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 2px solid var(--border-color);
}

.mode-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.mode-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.mode-btn.active {
  background: linear-gradient(135deg, var(--primary-color), #6366f1);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

/* Structured Input Container */
.structured-input {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  padding: 1rem;
  animation: fadeIn 0.3s ease;
  max-height: 45vh;
  overflow-y: auto;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Dimension Sections */
.dimension-section {
  margin-bottom: 1.25rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 1rem;
  border-left: 4px solid;
  transition: all 0.2s ease;
}

.dimension-section:hover {
  transform: translateX(4px);
}

.dimension-section.analysis {
  border-left-color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}

.dimension-section.reasoning {
  border-left-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.08);
}

.dimension-section.creativity {
  border-left-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.dimension-section.evidence {
  border-left-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}

.dimension-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.dimension-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.dimension-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.dimension-section.analysis .dimension-title { color: #60a5fa; }
.dimension-section.reasoning .dimension-title { color: #a78bfa; }
.dimension-section.creativity .dimension-title { color: #fbbf24; }
.dimension-section.evidence .dimension-title { color: #34d399; }

.dimension-hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  padding-left: 2.25rem;
  line-height: 1.4;
}

/* Items List */
.dimension-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dimension-item {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  animation: itemSlideIn 0.2s ease;
}

@keyframes itemSlideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

.item-number {
  width: 24px;
  height: 24px;
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.item-input {
  flex: 1;
  min-height: 44px;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
  resize: vertical;
  transition: all 0.2s ease;
  line-height: 1.4;
}

.item-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.dimension-section.analysis .item-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.dimension-section.reasoning .item-input:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
}

.dimension-section.creativity .item-input:focus {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
}

.dimension-section.evidence .item-input:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.item-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

.item-remove {
  width: 32px;
  height: 32px;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s ease;
  margin-top: 0.375rem;
}

.item-remove:hover {
  background: rgba(239, 68, 68, 0.3);
  transform: scale(1.1);
}

/* Add Item Button */
.add-item-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem;
  margin-top: 0.5rem;
  border: 2px dashed var(--border-color);
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-item-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: rgba(99, 102, 241, 0.05);
}

.dimension-section.analysis .add-item-btn:hover {
  border-color: #3b82f6;
  color: #60a5fa;
  background: rgba(59, 130, 246, 0.1);
}

.dimension-section.reasoning .add-item-btn:hover {
  border-color: #8b5cf6;
  color: #a78bfa;
  background: rgba(139, 92, 246, 0.1);
}

.dimension-section.creativity .add-item-btn:hover {
  border-color: #f59e0b;
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.1);
}

.dimension-section.evidence .add-item-btn:hover {
  border-color: #10b981;
  color: #34d399;
  background: rgba(16, 185, 129, 0.1);
}

/* Summary Section */
.structured-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 2px solid var(--border-color);
  margin-top: 0.5rem;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.summary-item .count {
  font-weight: 700;
  padding: 0.125rem 0.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.summary-item.analysis .count {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.summary-item.reasoning .count {
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
}

.summary-item.creativity .count {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.summary-item.evidence .count {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.summary-total {
  margin-left: auto;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.summary-total strong {
  color: var(--primary-color);
}

/* Structured Actions */
.structured-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid var(--border-color);
}

.btn-clear {
  padding: 0.75rem 1.25rem;
  border: 2px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  background: transparent;
  color: #f87171;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-clear:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.5);
}

.btn-structured-send {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-structured-send:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
}

.btn-structured-send:disabled {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: not-allowed;
  opacity: 0.6;
}

/* Mobile Responsive for Structured Input */
@media (max-width: 768px) {
  .input-mode-toggle {
    flex-direction: column;
  }
  
  .mode-btn {
    padding: 0.625rem;
  }
  
  .structured-input {
    padding: 1rem;
  }
  
  .dimension-section {
    padding: 0.75rem;
  }
  
  .dimension-header {
    flex-wrap: wrap;
  }
  
  .dimension-hint {
    padding-left: 0;
  }
  
  .item-number {
    display: none;
  }
  
  .item-remove {
    width: 28px;
    height: 28px;
    min-width: 28px;
  }
  
  .structured-summary {
    flex-direction: column;
  }
  
  .summary-total {
    margin-left: 0;
  }
  
  .structured-actions {
    flex-direction: column;
  }
  
  .btn-clear {
    justify-content: center;
  }
}
</style>
