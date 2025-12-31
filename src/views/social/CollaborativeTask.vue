<template>
  <div class="collaborative-task">
    <!-- Header -->
    <div class="task-header">
      <div class="header-top">
        <button class="back-btn" @click="$router.push('/student')">← กลับ</button>
        <div class="task-status-badge" :class="task.status">
          {{ getStatusLabel(task.status) }}
        </div>
      </div>
      
      <h1>{{ task.title }}</h1>
      <div class="task-meta">
        <span class="lo-badge" v-if="task.relatedLO">🎯 {{ task.relatedLO }}</span>
        <span class="deadline" v-if="task.deadline">
          ⏰ {{ formatDeadline(task.deadline) }}
        </span>
        <span class="team-size">👥 {{ team.length }}/{{ task.maxTeamSize }} คน</span>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Left: Task Content -->
      <div class="task-content">
        <!-- Task Description -->
        <div class="content-section">
          <h3>📋 รายละเอียดงาน</h3>
          <div class="task-description" v-html="formatDescription(task.description)"></div>
          
          <!-- Attached Resources -->
          <div v-if="task.resources?.length" class="resources">
            <h4>📚 เอกสารประกอบ</h4>
            <div class="resource-list">
              <a 
                v-for="res in task.resources" 
                :key="res.url" 
                :href="res.url" 
                target="_blank"
                class="resource-link"
              >
                {{ getResourceIcon(res.type) }} {{ res.name }}
              </a>
            </div>
          </div>
        </div>

        <!-- Subtasks / Milestones -->
        <div class="content-section">
          <div class="section-header">
            <h3>✅ รายการงานย่อย</h3>
            <span class="progress-text">{{ completedSubtasks }}/{{ task.subtasks?.length || 0 }}</span>
          </div>
          
          <div class="subtasks-list">
            <div 
              v-for="subtask in task.subtasks" 
              :key="subtask.id"
              :class="['subtask-item', { completed: subtask.completed }]"
            >
              <button 
                class="check-btn" 
                @click="toggleSubtask(subtask)"
                :disabled="!isTeamMember"
              >
                {{ subtask.completed ? '✓' : '' }}
              </button>
              <div class="subtask-content">
                <span class="subtask-title">{{ subtask.title }}</span>
                <span v-if="subtask.assignee" class="subtask-assignee">
                  👤 {{ getAssigneeName(subtask.assignee) }}
                </span>
              </div>
              <button 
                v-if="isTeamMember && !subtask.assignee"
                class="claim-btn"
                @click="claimSubtask(subtask)"
              >
                รับงาน
              </button>
            </div>
          </div>
          
          <button 
            v-if="isTeamLeader" 
            class="add-subtask-btn"
            @click="showAddSubtask = true"
          >
            ➕ เพิ่มงานย่อย
          </button>
        </div>

        <!-- Shared Workspace -->
        <div class="content-section">
          <h3>📝 พื้นที่ทำงานร่วม</h3>
          
          <!-- Collaborative Editor -->
          <div class="collab-editor">
            <div class="editor-toolbar">
              <button @click="formatText('bold')">B</button>
              <button @click="formatText('italic')">I</button>
              <button @click="formatText('list')">•</button>
              <span class="editing-indicator" v-if="othersEditing.length">
                ✏️ {{ othersEditing.join(', ') }} กำลังแก้ไข
              </span>
            </div>
            <textarea 
              ref="sharedEditor"
              v-model="sharedContent"
              placeholder="เขียนเนื้อหาร่วมกันที่นี่..."
              @input="onContentChange"
              :disabled="!isTeamMember"
            ></textarea>
            <div class="editor-footer">
              <span class="auto-save" v-if="lastSaved">
                💾 บันทึกอัตโนมัติ {{ formatTime(lastSaved) }}
              </span>
              <span class="word-count">{{ wordCount }} คำ</span>
            </div>
          </div>

          <!-- File Attachments -->
          <div class="file-section">
            <h4>📎 ไฟล์แนบ</h4>
            <div class="files-grid">
              <div 
                v-for="file in sharedFiles" 
                :key="file.id"
                class="file-card"
              >
                <span class="file-icon">{{ getFileIcon(file.type) }}</span>
                <span class="file-name">{{ file.name }}</span>
                <span class="file-uploader">โดย {{ file.uploaderName }}</span>
                <div class="file-actions">
                  <a :href="file.url" target="_blank" class="btn-icon">⬇️</a>
                  <button 
                    v-if="file.uploaderId === currentUserId"
                    class="btn-icon" 
                    @click="deleteFile(file)"
                  >🗑️</button>
                </div>
              </div>
              
              <div 
                v-if="isTeamMember"
                class="file-upload-zone"
                @click="triggerFileUpload"
                @dragover.prevent
                @drop.prevent="handleFileDrop"
              >
                <span>📤 อัพโหลดไฟล์</span>
                <input 
                  ref="fileInput"
                  type="file" 
                  multiple 
                  hidden
                  @change="handleFileSelect"
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Team & Activity -->
      <div class="sidebar">
        <!-- Team Members -->
        <div class="sidebar-section">
          <h3>👥 ทีม</h3>
          <div class="team-list">
            <div 
              v-for="member in team" 
              :key="member.id"
              class="team-member"
            >
              <img :src="member.photoURL || '/default-avatar.png'" class="member-avatar" alt="avatar">
              <div class="member-info">
                <span class="member-name">
                  {{ member.name }}
                  <span v-if="member.isLeader" class="leader-badge">👑</span>
                </span>
                <span class="member-role">{{ member.role || 'สมาชิก' }}</span>
              </div>
              <span :class="['status-dot', member.online ? 'online' : 'offline']"></span>
            </div>
          </div>
          
          <button 
            v-if="!isTeamMember && team.length < task.maxTeamSize"
            class="join-btn"
            @click="joinTeam"
          >
            ➕ เข้าร่วมทีม
          </button>
          
          <button 
            v-if="isTeamMember && !isTeamLeader"
            class="leave-btn"
            @click="leaveTeam"
          >
            ออกจากทีม
          </button>
        </div>

        <!-- Team Chat -->
        <div class="sidebar-section chat-section">
          <h3>💬 แชททีม</h3>
          <div class="chat-messages" ref="chatContainer">
            <div 
              v-for="msg in chatMessages" 
              :key="msg.id"
              :class="['chat-message', { mine: msg.senderId === currentUserId }]"
            >
              <img v-if="msg.senderId !== currentUserId" :src="msg.senderPhoto || '/default-avatar.png'" class="chat-avatar" alt="avatar">
              <div class="message-content">
                <span v-if="msg.senderId !== currentUserId" class="sender-name">{{ msg.senderName }}</span>
                <p>{{ msg.text }}</p>
                <span class="message-time">{{ formatTime(msg.createdAt) }}</span>
              </div>
            </div>
          </div>
          
          <div class="chat-input">
            <input 
              v-model="messageText"
              placeholder="พิมพ์ข้อความ..."
              @keyup.enter="sendMessage"
              :disabled="!isTeamMember"
            >
            <button @click="sendMessage" :disabled="!messageText.trim() || !isTeamMember">
              ส่ง
            </button>
          </div>
        </div>

        <!-- Activity Feed -->
        <div class="sidebar-section">
          <h3>📜 กิจกรรมล่าสุด</h3>
          <div class="activity-list">
            <div 
              v-for="activity in recentActivities" 
              :key="activity.id"
              class="activity-item"
            >
              <span class="activity-icon">{{ activity.icon }}</span>
              <div class="activity-content">
                <span class="activity-text">{{ activity.text }}</span>
                <span class="activity-time">{{ formatTime(activity.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Submit Section -->
    <div v-if="isTeamMember && task.status !== 'completed'" class="submit-section">
      <div class="submit-checklist">
        <h4>📋 รายการตรวจสอบก่อนส่ง</h4>
        <div class="checklist">
          <label>
            <input type="checkbox" v-model="submitChecklist.allSubtasksDone">
            ทำงานย่อยครบทุกรายการ
          </label>
          <label>
            <input type="checkbox" v-model="submitChecklist.contentReviewed">
            ตรวจสอบเนื้อหาแล้ว
          </label>
          <label>
            <input type="checkbox" v-model="submitChecklist.teamAgreed">
            สมาชิกทีมเห็นพ้องกัน
          </label>
        </div>
      </div>
      
      <button 
        class="submit-btn"
        @click="submitTask"
        :disabled="!canSubmit"
      >
        ✅ ส่งงาน
      </button>
    </div>

    <!-- Completed Badge -->
    <div v-if="task.status === 'completed'" class="completed-banner">
      <span class="completed-icon">🎉</span>
      <div class="completed-text">
        <h3>ส่งงานเรียบร้อย!</h3>
        <p>ส่งเมื่อ {{ formatDate(task.submittedAt) }}</p>
      </div>
      <div v-if="task.score" class="score-badge">
        <span class="score-value">{{ task.score }}</span>
        <span class="score-max">/{{ task.maxScore }}</span>
      </div>
    </div>

    <!-- Add Subtask Modal -->
    <div v-if="showAddSubtask" class="modal-overlay" @click.self="showAddSubtask = false">
      <div class="add-subtask-modal">
        <h3>➕ เพิ่มงานย่อย</h3>
        <input 
          v-model="newSubtaskTitle"
          placeholder="ชื่องานย่อย..."
          @keyup.enter="addSubtask"
        >
        <div class="modal-actions">
          <button class="btn-secondary" @click="showAddSubtask = false">ยกเลิก</button>
          <button class="btn-primary" @click="addSubtask" :disabled="!newSubtaskTitle.trim()">
            เพิ่ม
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  doc, collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove,
  serverTimestamp, limit, getDoc
} from 'firebase/firestore'
import { db } from '@/firebase/config'

const route = useRoute()
const authStore = useAuthStore()
const currentUserId = computed(() => authStore.user?.uid)

// State
const task = ref({
  title: '',
  description: '',
  status: 'in_progress',
  subtasks: [],
  maxTeamSize: 4,
  resources: []
})
const team = ref([])
const chatMessages = ref([])
const recentActivities = ref([])
const sharedContent = ref('')
const sharedFiles = ref([])
const messageText = ref('')
const lastSaved = ref(null)
const othersEditing = ref([])

// Modal
const showAddSubtask = ref(false)
const newSubtaskTitle = ref('')

// Submit checklist
const submitChecklist = ref({
  allSubtasksDone: false,
  contentReviewed: false,
  teamAgreed: false
})

// Refs
const chatContainer = ref(null)
const sharedEditor = ref(null)
const fileInput = ref(null)

// Computed
const isTeamMember = computed(() => 
  team.value.some(m => m.id === currentUserId.value)
)

const isTeamLeader = computed(() => 
  team.value.find(m => m.id === currentUserId.value)?.isLeader
)

const completedSubtasks = computed(() => 
  task.value.subtasks?.filter(s => s.completed).length || 0
)

const wordCount = computed(() => {
  if (!sharedContent.value) return 0
  return sharedContent.value.trim().split(/\s+/).filter(w => w).length
})

const canSubmit = computed(() => {
  return submitChecklist.value.allSubtasksDone &&
         submitChecklist.value.contentReviewed &&
         submitChecklist.value.teamAgreed &&
         isTeamMember.value
})

// Methods
function getStatusLabel(status) {
  const labels = {
    'draft': '📝 ร่าง',
    'in_progress': '🔄 กำลังทำ',
    'review': '👀 รอตรวจ',
    'completed': '✅ เสร็จสิ้น'
  }
  return labels[status] || status
}

function formatDeadline(deadline) {
  const date = deadline.toDate?.() || new Date(deadline)
  const now = new Date()
  const diff = date - now
  
  if (diff < 0) return '⚠️ เลยกำหนด'
  
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  
  if (days > 0) return `อีก ${days} วัน ${hours} ชั่วโมง`
  if (hours > 0) return `อีก ${hours} ชั่วโมง`
  return 'ใกล้หมดเวลา'
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate?.() || new Date(timestamp)
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate?.() || new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return 'เมื่อกี้'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} น. ที่แล้ว`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชม. ที่แล้ว`
  
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

function formatDescription(desc) {
  if (!desc) return ''
  return desc.replace(/\n/g, '<br>')
}

function getResourceIcon(type) {
  const icons = {
    'pdf': '📄',
    'video': '🎬',
    'link': '🔗',
    'doc': '📝'
  }
  return icons[type] || '📁'
}

function getFileIcon(type) {
  if (type?.startsWith('image')) return '🖼️'
  if (type?.includes('pdf')) return '📄'
  if (type?.includes('word')) return '📝'
  if (type?.includes('excel')) return '📊'
  return '📁'
}

function getAssigneeName(assigneeId) {
  const member = team.value.find(m => m.id === assigneeId)
  return member?.name || 'ไม่ระบุ'
}

async function toggleSubtask(subtask) {
  subtask.completed = !subtask.completed
  
  const taskRef = doc(db, 'collaborativeTasks', route.params.id)
  await updateDoc(taskRef, {
    subtasks: task.value.subtasks
  })
  
  // Log activity
  await addActivity(
    subtask.completed ? '✅' : '↩️',
    `${subtask.completed ? 'ทำเสร็จ' : 'ยกเลิก'}: ${subtask.title}`
  )
}

async function claimSubtask(subtask) {
  subtask.assignee = currentUserId.value
  
  const taskRef = doc(db, 'collaborativeTasks', route.params.id)
  await updateDoc(taskRef, {
    subtasks: task.value.subtasks
  })
  
  await addActivity('🙋', `รับงาน: ${subtask.title}`)
}

async function addSubtask() {
  if (!newSubtaskTitle.value.trim()) return
  
  const newSubtask = {
    id: Date.now().toString(),
    title: newSubtaskTitle.value.trim(),
    completed: false,
    assignee: null
  }
  
  task.value.subtasks = task.value.subtasks || []
  task.value.subtasks.push(newSubtask)
  
  const taskRef = doc(db, 'collaborativeTasks', route.params.id)
  await updateDoc(taskRef, {
    subtasks: task.value.subtasks
  })
  
  await addActivity('➕', `เพิ่มงานย่อย: ${newSubtask.title}`)
  
  newSubtaskTitle.value = ''
  showAddSubtask.value = false
}

// Content editing
let saveTimeout = null
function onContentChange() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(saveContent, 2000)
}

async function saveContent() {
  const taskRef = doc(db, 'collaborativeTasks', route.params.id)
  await updateDoc(taskRef, {
    sharedContent: sharedContent.value,
    lastEditedBy: currentUserId.value,
    lastEditedAt: serverTimestamp()
  })
  lastSaved.value = new Date()
}

function formatText(type) {
  // Simple text formatting
  const textarea = sharedEditor.value
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = sharedContent.value.substring(start, end)
  
  let formatted = selected
  switch (type) {
    case 'bold':
      formatted = `**${selected}**`
      break
    case 'italic':
      formatted = `*${selected}*`
      break
    case 'list':
      formatted = `\n• ${selected}`
      break
  }
  
  sharedContent.value = sharedContent.value.substring(0, start) + 
                        formatted + 
                        sharedContent.value.substring(end)
}

// File handling
function triggerFileUpload() {
  fileInput.value?.click()
}

async function handleFileSelect(event) {
  const files = event.target.files
  // Would upload to storage and add to sharedFiles
  console.log('Files selected:', files)
}

function handleFileDrop(event) {
  const files = event.dataTransfer.files
  // Would upload to storage and add to sharedFiles
  console.log('Files dropped:', files)
}

async function deleteFile(file) {
  if (!confirm('ลบไฟล์นี้?')) return
  // Delete from storage and Firestore
  sharedFiles.value = sharedFiles.value.filter(f => f.id !== file.id)
}

// Team management
async function joinTeam() {
  const taskRef = doc(db, 'collaborativeTasks', route.params.id)
  
  const newMember = {
    id: currentUserId.value,
    name: authStore.user?.displayName || 'ไม่ระบุชื่อ',
    photoURL: authStore.user?.photoURL,
    isLeader: team.value.length === 0,
    role: 'สมาชิก',
    joinedAt: new Date()
  }
  
  await updateDoc(taskRef, {
    teamMembers: arrayUnion(newMember)
  })
  
  team.value.push(newMember)
  
  await addActivity('👋', `${newMember.name} เข้าร่วมทีม`)
}

async function leaveTeam() {
  if (!confirm('ออกจากทีม?')) return
  
  const member = team.value.find(m => m.id === currentUserId.value)
  if (!member) return
  
  const taskRef = doc(db, 'collaborativeTasks', route.params.id)
  await updateDoc(taskRef, {
    teamMembers: arrayRemove(member)
  })
  
  team.value = team.value.filter(m => m.id !== currentUserId.value)
  
  await addActivity('👋', `${member.name} ออกจากทีม`)
}

// Chat
async function sendMessage() {
  if (!messageText.value.trim() || !isTeamMember.value) return
  
  const msg = {
    text: messageText.value.trim(),
    senderId: currentUserId.value,
    senderName: authStore.user?.displayName || 'ไม่ระบุชื่อ',
    senderPhoto: authStore.user?.photoURL,
    createdAt: serverTimestamp()
  }
  
  await addDoc(
    collection(db, 'collaborativeTasks', route.params.id, 'chat'),
    msg
  )
  
  messageText.value = ''
  
  nextTick(() => {
    chatContainer.value?.scrollTo({
      top: chatContainer.value.scrollHeight,
      behavior: 'smooth'
    })
  })
}

// Activity logging
async function addActivity(icon, text) {
  await addDoc(
    collection(db, 'collaborativeTasks', route.params.id, 'activities'),
    {
      icon,
      text,
      userId: currentUserId.value,
      createdAt: serverTimestamp()
    }
  )
}

// Submit task
async function submitTask() {
  if (!canSubmit.value) return
  
  if (!confirm('ยืนยันการส่งงาน? ไม่สามารถแก้ไขได้หลังส่ง')) return
  
  const taskRef = doc(db, 'collaborativeTasks', route.params.id)
  await updateDoc(taskRef, {
    status: 'review',
    submittedAt: serverTimestamp(),
    submittedBy: currentUserId.value,
    sharedContent: sharedContent.value
  })
  
  await addActivity('🎉', 'ส่งงานแล้ว!')
  
  task.value.status = 'review'
  task.value.submittedAt = new Date()
}

// Load data
let unsubscribeTask = null
let unsubscribeChat = null
let unsubscribeActivities = null

function loadTask() {
  const taskRef = doc(db, 'collaborativeTasks', route.params.id)
  
  unsubscribeTask = onSnapshot(taskRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data()
      task.value = { id: doc.id, ...data }
      team.value = data.teamMembers || []
      sharedContent.value = data.sharedContent || ''
      sharedFiles.value = data.sharedFiles || []
    }
  })
}

function loadChat() {
  const chatQuery = query(
    collection(db, 'collaborativeTasks', route.params.id, 'chat'),
    orderBy('createdAt', 'asc'),
    limit(100)
  )
  
  unsubscribeChat = onSnapshot(chatQuery, (snapshot) => {
    chatMessages.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  })
}

function loadActivities() {
  const actQuery = query(
    collection(db, 'collaborativeTasks', route.params.id, 'activities'),
    orderBy('createdAt', 'desc'),
    limit(20)
  )
  
  unsubscribeActivities = onSnapshot(actQuery, (snapshot) => {
    recentActivities.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  })
}

onMounted(() => {
  loadTask()
  loadChat()
  loadActivities()
})

onUnmounted(() => {
  unsubscribeTask?.()
  unsubscribeChat?.()
  unsubscribeActivities?.()
  if (saveTimeout) clearTimeout(saveTimeout)
})
</script>

<style scoped>
.collaborative-task {
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

.task-header {
  margin-bottom: 1.5rem;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.back-btn {
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
}

.task-status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.85rem;
}

.task-status-badge.in_progress {
  background: #dbeafe;
  color: #1e40af;
}

.task-status-badge.completed {
  background: #dcfce7;
  color: #166534;
}

.task-status-badge.review {
  background: #fef3c7;
  color: #92400e;
}

.task-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.task-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.9rem;
}

.lo-badge {
  padding: 0.25rem 0.75rem;
  background: #dcfce7;
  color: #166534;
  border-radius: 20px;
}

.deadline {
  color: #f59e0b;
}

.team-size {
  color: var(--text-secondary);
}

/* Main Content */
.main-content {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 1.5rem;
}

@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}

/* Task Content */
.task-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.content-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.25rem;
}

.content-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.task-description {
  line-height: 1.7;
  color: var(--text-primary);
}

.resources {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.resources h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
}

.resource-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.resource-link {
  padding: 0.5rem 0.75rem;
  background: var(--bg-primary);
  border-radius: 8px;
  text-decoration: none;
  color: var(--primary-color);
  font-size: 0.85rem;
}

/* Subtasks */
.subtasks-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.subtask-item.completed {
  opacity: 0.7;
}

.subtask-item.completed .subtask-title {
  text-decoration: line-through;
}

.check-btn {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: var(--primary-color);
}

.subtask-item.completed .check-btn {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.subtask-content {
  flex: 1;
}

.subtask-title {
  display: block;
  font-weight: 500;
}

.subtask-assignee {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.claim-btn {
  padding: 0.25rem 0.5rem;
  background: var(--primary-light);
  color: var(--primary-color);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
}

.add-subtask-btn {
  width: 100%;
  padding: 0.75rem;
  background: var(--bg-primary);
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

/* Collaborative Editor */
.collab-editor {
  background: var(--bg-primary);
  border-radius: 8px;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.editor-toolbar button {
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.editing-indicator {
  margin-left: auto;
  font-size: 0.8rem;
  color: #10b981;
}

.collab-editor textarea {
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  border: none;
  resize: vertical;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.6;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.collab-editor textarea:focus {
  outline: none;
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  border-top: 1px solid var(--border-color);
}

/* Files */
.file-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.file-section h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
}

.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
}

.file-card {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
}

.file-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

.file-name {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  word-break: break-word;
}

.file-uploader {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.file-actions {
  margin-top: 0.5rem;
}

.btn-icon {
  padding: 0.25rem 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: none;
}

.file-upload-zone {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.file-upload-zone:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

/* Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sidebar-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
}

.sidebar-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
}

/* Team */
.team-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.team-member {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.member-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.member-info {
  flex: 1;
}

.member-name {
  display: block;
  font-weight: 500;
  font-size: 0.9rem;
}

.leader-badge {
  font-size: 0.75rem;
}

.member-role {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: #10b981;
}

.status-dot.offline {
  background: #9ca3af;
}

.join-btn, .leave-btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  margin-top: 0.5rem;
}

.join-btn {
  background: var(--primary-color);
  color: white;
}

.leave-btn {
  background: #fee2e2;
  color: #991b1b;
}

/* Chat */
.chat-section {
  display: flex;
  flex-direction: column;
  max-height: 400px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 250px;
  padding-right: 0.5rem;
}

.chat-message {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.chat-message.mine {
  flex-direction: row-reverse;
}

.chat-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.message-content {
  max-width: 80%;
  background: var(--bg-primary);
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
}

.chat-message.mine .message-content {
  background: var(--primary-color);
  color: white;
}

.sender-name {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.message-content p {
  margin: 0;
  font-size: 0.85rem;
}

.message-time {
  font-size: 0.65rem;
  opacity: 0.7;
}

.chat-input {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.chat-input input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 0.85rem;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.chat-input button {
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
}

.chat-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Activity */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.activity-icon {
  font-size: 1rem;
}

.activity-content {
  flex: 1;
}

.activity-text {
  display: block;
  font-size: 0.85rem;
}

.activity-time {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

/* Submit Section */
.submit-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.submit-checklist h4 {
  margin: 0 0 0.5rem 0;
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.checklist label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.submit-btn {
  padding: 1rem 2rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  font-size: 1rem;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Completed Banner */
.completed-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1.5rem;
}

.completed-icon {
  font-size: 3rem;
}

.completed-text h3 {
  margin: 0;
  color: #166534;
}

.completed-text p {
  margin: 0.25rem 0 0;
  color: #15803d;
  font-size: 0.9rem;
}

.score-badge {
  margin-left: auto;
  text-align: center;
}

.score-value {
  font-size: 2rem;
  font-weight: 700;
  color: #166534;
}

.score-max {
  font-size: 1rem;
  color: #15803d;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.add-subtask-modal {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
}

.add-subtask-modal h3 {
  margin: 0 0 1rem 0;
}

.add-subtask-modal input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  margin-bottom: 1rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}
</style>
