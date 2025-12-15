<template>
  <div class="study-group-detail">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Not Found -->
    <div v-else-if="!group" class="not-found">
      <span class="not-found-icon">😕</span>
      <p>ไม่พบกลุ่มนี้</p>
      <button class="btn-back" @click="$router.push('/community/study-groups')">
        กลับไปรายการกลุ่ม
      </button>
    </div>

    <!-- Group Content -->
    <template v-else>
      <!-- Header -->
      <div class="group-header">
        <button class="back-btn" @click="$router.back()">←</button>
        <div class="header-content">
          <span class="group-emoji">{{ group.emoji || '📚' }}</span>
          <div class="group-info">
            <h1>{{ group.name }}</h1>
            <p class="group-meta">
              {{ getTypeLabel(group.type) }} · {{ group.memberCount || 0 }} สมาชิก
              <span v-if="group.isPrivate">· 🔒 ส่วนตัว</span>
            </p>
          </div>
        </div>
        <div class="header-actions">
          <button v-if="!isMember" class="btn-join" @click="joinGroup">
            เข้าร่วม
          </button>
          <button v-if="isAdmin" class="btn-settings" @click="showSettings = true">
            ⚙️
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          :class="['tab', { active: activeTab === 'chat' }]"
          @click="activeTab = 'chat'"
        >
          💬 แชท
        </button>
        <button 
          :class="['tab', { active: activeTab === 'members' }]"
          @click="activeTab = 'members'"
        >
          👥 สมาชิก ({{ members.length }})
        </button>
        <button 
          :class="['tab', { active: activeTab === 'resources' }]"
          @click="activeTab = 'resources'"
        >
          📁 ไฟล์/ลิงก์
        </button>
        <button 
          :class="['tab', { active: activeTab === 'sessions' }]"
          @click="activeTab = 'sessions'"
        >
          📅 นัดเรียน
        </button>
      </div>

      <!-- Chat Tab -->
      <div v-if="activeTab === 'chat'" class="tab-content chat-tab">
        <div class="chat-container" ref="chatContainer">
          <div v-if="messages.length === 0" class="empty-chat">
            <span class="empty-icon">💬</span>
            <p>ยังไม่มีข้อความในกลุ่ม</p>
            <p class="hint">เริ่มพูดคุยกันเลย!</p>
          </div>

          <div 
            v-for="(msg, index) in messages" 
            :key="msg.id" 
            class="message"
            :class="{ mine: isMyMessage(msg), 'show-avatar': shouldShowAvatar(index) }"
          >
            <img 
              v-if="shouldShowAvatar(index) && !isMyMessage(msg)"
              :src="msg.senderPhoto || '/default-avatar.png'" 
              class="msg-avatar"
            />
            <div class="msg-content">
              <span v-if="shouldShowAvatar(index) && !isMyMessage(msg)" class="msg-sender">
                {{ msg.senderName }}
              </span>
              <div class="msg-bubble" :class="{ mine: isMyMessage(msg) }">
                <p v-if="msg.type === 'text'">{{ msg.content }}</p>
                <div v-else-if="msg.type === 'resource'" class="msg-resource">
                  📎 <a :href="msg.resourceUrl" target="_blank">{{ msg.content }}</a>
                </div>
              </div>
              <span class="msg-time">{{ formatTime(msg.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Chat Input -->
        <div v-if="isMember" class="chat-input">
          <button class="attach-btn" @click="showResourceModal = true">📎</button>
          <input 
            v-model="newMessage" 
            type="text"
            placeholder="พิมพ์ข้อความ..."
            @keyup.enter="sendMessage"
          />
          <button class="send-btn" @click="sendMessage" :disabled="!newMessage.trim()">
            ส่ง
          </button>
        </div>
        <div v-else class="join-prompt">
          <p>เข้าร่วมกลุ่มเพื่อพูดคุย</p>
          <button class="btn-join" @click="joinGroup">เข้าร่วม</button>
        </div>
      </div>

      <!-- Members Tab -->
      <div v-if="activeTab === 'members'" class="tab-content members-tab">
        <div class="members-list">
          <div 
            v-for="member in members" 
            :key="member.odId" 
            class="member-card"
          >
            <img :src="member.photoURL || '/default-avatar.png'" class="member-avatar" />
            <div class="member-info">
              <span class="member-name">
                {{ member.displayName }}
                <span v-if="member.role === 'admin'" class="role-badge admin">👑 Admin</span>
                <span v-else-if="member.role === 'moderator'" class="role-badge mod">🛡️ Mod</span>
              </span>
              <span class="member-joined">เข้าร่วม {{ formatDate(member.joinedAt) }}</span>
            </div>
            <div v-if="isAdmin && member.odId !== authStore.user?.uid" class="member-actions">
              <button v-if="member.role === 'member'" @click="promoteMember(member)">
                เลื่อนเป็น Mod
              </button>
              <button class="btn-remove" @click="removeMember(member)">
                ลบออก
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Resources Tab -->
      <div v-if="activeTab === 'resources'" class="tab-content resources-tab">
        <div class="resources-header">
          <h3>📁 ไฟล์และลิงก์ที่แชร์</h3>
          <button v-if="isMember" class="btn-add" @click="showResourceModal = true">
            ➕ เพิ่มไฟล์/ลิงก์
          </button>
        </div>

        <div v-if="resources.length === 0" class="empty-state small">
          <p>ยังไม่มีไฟล์หรือลิงก์ที่แชร์</p>
        </div>

        <div v-else class="resources-list">
          <div v-for="resource in resources" :key="resource.id" class="resource-card">
            <span class="resource-icon">{{ getResourceIcon(resource.type) }}</span>
            <div class="resource-info">
              <a :href="resource.url" target="_blank" class="resource-name">
                {{ resource.name }}
              </a>
              <span class="resource-meta">
                โดย {{ resource.uploaderName }} · {{ formatDate(resource.createdAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sessions Tab -->
      <div v-if="activeTab === 'sessions'" class="tab-content sessions-tab">
        <div class="sessions-header">
          <h3>📅 นัดเรียนร่วมกัน</h3>
          <button v-if="isMember" class="btn-add" @click="showSessionModal = true">
            ➕ สร้างนัดเรียน
          </button>
        </div>

        <div v-if="sessions.length === 0" class="empty-state small">
          <p>ยังไม่มีนัดเรียน</p>
        </div>

        <div v-else class="sessions-list">
          <div 
            v-for="session in sessions" 
            :key="session.id" 
            class="session-card"
            :class="{ past: isPast(session.scheduledAt) }"
          >
            <div class="session-date">
              <span class="date-day">{{ getDay(session.scheduledAt) }}</span>
              <span class="date-month">{{ getMonth(session.scheduledAt) }}</span>
            </div>
            <div class="session-info">
              <h4 class="session-title">{{ session.title }}</h4>
              <p class="session-time">
                🕐 {{ formatSessionTime(session.scheduledAt) }} ({{ session.duration }} นาที)
              </p>
              <p v-if="session.location" class="session-location">
                📍 {{ session.location }}
              </p>
              <div class="session-attendees">
                <span>{{ session.attendeeCount || 0 }} คนเข้าร่วม</span>
              </div>
            </div>
            <div class="session-actions">
              <button 
                v-if="!isPast(session.scheduledAt) && !hasJoinedSession(session)"
                class="btn-attend"
                @click="attendSession(session)"
              >
                เข้าร่วม
              </button>
              <span v-if="hasJoinedSession(session)" class="attending-badge">
                ✅ เข้าร่วมแล้ว
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Add Resource Modal -->
    <div v-if="showResourceModal" class="modal-overlay" @click.self="showResourceModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>📎 เพิ่มไฟล์/ลิงก์</h2>
          <button class="close-btn" @click="showResourceModal = false">×</button>
        </div>
        <form @submit.prevent="addResource" class="modal-form">
          <div class="form-group">
            <label>ชื่อ</label>
            <input v-model="newResource.name" type="text" placeholder="ชื่อไฟล์หรือลิงก์" required />
          </div>
          <div class="form-group">
            <label>URL</label>
            <input v-model="newResource.url" type="url" placeholder="https://..." required />
          </div>
          <div class="form-group">
            <label>ประเภท</label>
            <select v-model="newResource.type">
              <option value="link">🔗 ลิงก์</option>
              <option value="document">📄 เอกสาร</option>
              <option value="video">🎬 วิดีโอ</option>
              <option value="image">🖼️ รูปภาพ</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showResourceModal = false">ยกเลิก</button>
            <button type="submit" class="btn-primary">เพิ่ม</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create Session Modal -->
    <div v-if="showSessionModal" class="modal-overlay" @click.self="showSessionModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>📅 สร้างนัดเรียน</h2>
          <button class="close-btn" @click="showSessionModal = false">×</button>
        </div>
        <form @submit.prevent="createSession" class="modal-form">
          <div class="form-group">
            <label>หัวข้อ</label>
            <input v-model="newSession.title" type="text" placeholder="เช่น ติวคณิต บทที่ 3" required />
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label>วันที่</label>
              <input v-model="newSession.date" type="date" required />
            </div>
            <div class="form-group half">
              <label>เวลา</label>
              <input v-model="newSession.time" type="time" required />
            </div>
          </div>
          <div class="form-group">
            <label>ระยะเวลา (นาที)</label>
            <select v-model="newSession.duration">
              <option value="30">30 นาที</option>
              <option value="60">1 ชั่วโมง</option>
              <option value="90">1.5 ชั่วโมง</option>
              <option value="120">2 ชั่วโมง</option>
            </select>
          </div>
          <div class="form-group">
            <label>สถานที่ (ไม่บังคับ)</label>
            <input v-model="newSession.location" type="text" placeholder="เช่น Zoom, ห้องสมุด" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showSessionModal = false">ยกเลิก</button>
            <button type="submit" class="btn-primary">สร้าง</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  doc, getDoc, collection, query, orderBy, limit, 
  getDocs, addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, 
  increment, serverTimestamp, onSnapshot 
} from 'firebase/firestore'
import { db } from '@/firebase/config'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(true)
const activeTab = ref('chat')
const group = ref(null)
const members = ref([])
const messages = ref([])
const resources = ref([])
const sessions = ref([])
const newMessage = ref('')
const chatContainer = ref(null)

// Modals
const showSettings = ref(false)
const showResourceModal = ref(false)
const showSessionModal = ref(false)

// Forms
const newResource = reactive({ name: '', url: '', type: 'link' })
const newSession = reactive({ title: '', date: '', time: '', duration: '60', location: '' })

// Computed
const isMember = computed(() => {
  return group.value?.memberIds?.includes(authStore.user?.uid)
})

const isAdmin = computed(() => {
  return group.value?.moderatorIds?.includes(authStore.user?.uid)
})

// Methods
const getTypeLabel = (type) => {
  const labels = {
    study: '📚 กลุ่มติว',
    homework: '📝 การบ้าน',
    project: '🎯 โปรเจค',
    exam: '📋 สอบ',
    general: '💬 ทั่วไป'
  }
  return labels[type] || '📚 กลุ่ม'
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

const formatSessionTime = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleString('th-TH', { 
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit'
  })
}

const getDay = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.getDate()
}

const getMonth = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', { month: 'short' })
}

const isPast = (timestamp) => {
  if (!timestamp) return false
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date < new Date()
}

const getResourceIcon = (type) => {
  const icons = {
    link: '🔗',
    document: '📄',
    video: '🎬',
    image: '🖼️'
  }
  return icons[type] || '📎'
}

const isMyMessage = (msg) => {
  return msg.senderId === authStore.user?.uid
}

const shouldShowAvatar = (index) => {
  if (index === 0) return true
  const prev = messages.value[index - 1]
  const curr = messages.value[index]
  return prev.senderId !== curr.senderId
}

const hasJoinedSession = (session) => {
  return session.attendeeIds?.includes(authStore.user?.uid)
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

const joinGroup = async () => {
  if (!authStore.user?.uid || !group.value) return
  
  try {
    if (group.value.isPrivate) {
      // Request to join
      await addDoc(collection(db, 'communities', group.value.id, 'joinRequests'), {
        userId: authStore.user.uid,
        userName: authStore.user.displayName,
        userPhoto: authStore.user.photoURL,
        status: 'pending',
        createdAt: serverTimestamp()
      })
      alert('ส่งคำขอเข้าร่วมแล้ว!')
    } else {
      // Direct join
      const groupRef = doc(db, 'communities', group.value.id)
      await updateDoc(groupRef, {
        memberIds: arrayUnion(authStore.user.uid),
        memberCount: increment(1)
      })

      await addDoc(collection(db, 'communities', group.value.id, 'members'), {
        odId: authStore.user.uid,
        displayName: authStore.user.displayName,
        photoURL: authStore.user.photoURL,
        role: 'member',
        joinedAt: serverTimestamp()
      })

      group.value.memberIds = [...(group.value.memberIds || []), authStore.user.uid]
      group.value.memberCount = (group.value.memberCount || 0) + 1
      loadMembers()
    }
  } catch (error) {
    console.error('Error joining group:', error)
    alert('เกิดข้อผิดพลาด')
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || !isMember.value) return
  
  try {
    await addDoc(collection(db, 'communities', group.value.id, 'messages'), {
      content: newMessage.value.trim(),
      type: 'text',
      senderId: authStore.user.uid,
      senderName: authStore.user.displayName || 'นักเรียน',
      senderPhoto: authStore.user.photoURL,
      createdAt: serverTimestamp()
    })

    await updateDoc(doc(db, 'communities', group.value.id), {
      messageCount: increment(1),
      updatedAt: serverTimestamp()
    })

    newMessage.value = ''
  } catch (error) {
    console.error('Error sending message:', error)
  }
}

const addResource = async () => {
  if (!newResource.name || !newResource.url) return
  
  try {
    await addDoc(collection(db, 'communities', group.value.id, 'resources'), {
      name: newResource.name,
      url: newResource.url,
      type: newResource.type,
      uploaderId: authStore.user.uid,
      uploaderName: authStore.user.displayName,
      createdAt: serverTimestamp()
    })

    showResourceModal.value = false
    newResource.name = ''
    newResource.url = ''
    newResource.type = 'link'
    loadResources()
  } catch (error) {
    console.error('Error adding resource:', error)
  }
}

const createSession = async () => {
  if (!newSession.title || !newSession.date || !newSession.time) return
  
  try {
    const scheduledAt = new Date(`${newSession.date}T${newSession.time}`)
    
    await addDoc(collection(db, 'communities', group.value.id, 'sessions'), {
      title: newSession.title,
      scheduledAt,
      duration: parseInt(newSession.duration),
      location: newSession.location || null,
      hostId: authStore.user.uid,
      hostName: authStore.user.displayName,
      attendeeIds: [authStore.user.uid],
      attendeeCount: 1,
      createdAt: serverTimestamp()
    })

    showSessionModal.value = false
    newSession.title = ''
    newSession.date = ''
    newSession.time = ''
    newSession.duration = '60'
    newSession.location = ''
    loadSessions()
  } catch (error) {
    console.error('Error creating session:', error)
  }
}

const attendSession = async (session) => {
  try {
    await updateDoc(doc(db, 'communities', group.value.id, 'sessions', session.id), {
      attendeeIds: arrayUnion(authStore.user.uid),
      attendeeCount: increment(1)
    })
    session.attendeeIds = [...(session.attendeeIds || []), authStore.user.uid]
    session.attendeeCount = (session.attendeeCount || 0) + 1
  } catch (error) {
    console.error('Error attending session:', error)
  }
}

const promoteMember = async (member) => {
  try {
    const memberDoc = members.value.find(m => m.odId === member.odId)
    if (memberDoc?.docId) {
      await updateDoc(doc(db, 'communities', group.value.id, 'members', memberDoc.docId), {
        role: 'moderator'
      })
    }
    await updateDoc(doc(db, 'communities', group.value.id), {
      moderatorIds: arrayUnion(member.odId)
    })
    member.role = 'moderator'
  } catch (error) {
    console.error('Error promoting member:', error)
  }
}

const removeMember = async (member) => {
  if (!confirm(`ลบ ${member.displayName} ออกจากกลุ่ม?`)) return
  
  try {
    await updateDoc(doc(db, 'communities', group.value.id), {
      memberIds: arrayRemove(member.odId),
      memberCount: increment(-1)
    })
    members.value = members.value.filter(m => m.odId !== member.odId)
  } catch (error) {
    console.error('Error removing member:', error)
  }
}

// Load Data
const loadGroup = async () => {
  const groupId = route.params.id
  try {
    const docSnap = await getDoc(doc(db, 'communities', groupId))
    if (docSnap.exists()) {
      group.value = { id: docSnap.id, ...docSnap.data() }
    }
  } catch (error) {
    console.error('Error loading group:', error)
  }
}

const loadMembers = async () => {
  if (!group.value) return
  try {
    const membersQuery = query(
      collection(db, 'communities', group.value.id, 'members'),
      orderBy('joinedAt', 'desc')
    )
    const snapshot = await getDocs(membersQuery)
    members.value = snapshot.docs.map(doc => ({
      docId: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading members:', error)
  }
}

const loadMessages = () => {
  if (!group.value) return
  
  const messagesQuery = query(
    collection(db, 'communities', group.value.id, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100)
  )
  
  onSnapshot(messagesQuery, (snapshot) => {
    messages.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    scrollToBottom()
  })
}

const loadResources = async () => {
  if (!group.value) return
  try {
    const resourcesQuery = query(
      collection(db, 'communities', group.value.id, 'resources'),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(resourcesQuery)
    resources.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading resources:', error)
  }
}

const loadSessions = async () => {
  if (!group.value) return
  try {
    const sessionsQuery = query(
      collection(db, 'communities', group.value.id, 'sessions'),
      orderBy('scheduledAt', 'asc')
    )
    const snapshot = await getDocs(sessionsQuery)
    sessions.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading sessions:', error)
  }
}

// Initialize
onMounted(async () => {
  loading.value = true
  try {
    await loadGroup()
    if (group.value) {
      await Promise.all([
        loadMembers(),
        loadResources(),
        loadSessions()
      ])
      loadMessages()
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.study-group-detail {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Header */
.group-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  margin-bottom: 16px;
}

.back-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255,255,255,0.2);
  color: white;
  border-radius: 10px;
  font-size: 20px;
  cursor: pointer;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.group-emoji {
  font-size: 48px;
}

.group-info h1 {
  margin: 0;
  font-size: 24px;
}

.group-meta {
  margin: 4px 0 0 0;
  opacity: 0.9;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-join {
  padding: 10px 20px;
  background: var(--card-bg);
  color: #667eea;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-settings {
  width: 40px;
  height: 40px;
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 10px;
  font-size: 20px;
  cursor: pointer;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: var(--card-bg);
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: var(--shadow);
}

.tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
}

.tab.active {
  background: #667eea;
  color: white;
}

/* Tab Content */
.tab-content {
  flex: 1;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Chat Tab */
.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-chat {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.hint {
  font-size: 13px;
  color: var(--text-secondary);
}

.message {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.message.mine {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}

.message:not(.show-avatar) {
  margin-left: 40px;
}

.message.mine:not(.show-avatar) {
  margin-right: 40px;
  margin-left: 0;
}

.msg-content {
  max-width: 70%;
}

.msg-sender {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  display: block;
}

.msg-bubble {
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-radius: 16px;
  border-top-left-radius: 4px;
  color: var(--text-primary);
}

.msg-bubble.mine {
  background: #667eea;
  color: white;
  border-radius: 16px;
  border-top-right-radius: 4px;
  border-top-left-radius: 16px;
}

.msg-bubble p {
  margin: 0;
  line-height: 1.4;
}

.msg-time {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
  display: block;
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--border-color);
}

.attach-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--bg-tertiary);
  border-radius: 10px;
  font-size: 18px;
  cursor: pointer;
}

.chat-input input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 14px;
  background: var(--input-bg);
  color: var(--text-primary);
}

.send-btn {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.join-prompt {
  padding: 20px;
  text-align: center;
  border-top: 1px solid var(--border-color);
}

.join-prompt p {
  margin: 0 0 12px 0;
  color: var(--text-secondary);
}

/* Members Tab */
.members-tab {
  padding: 16px;
  overflow-y: auto;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 10px;
}

.member-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.member-info {
  flex: 1;
}

.member-name {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.role-badge.admin {
  background: #fff3e0;
  color: #e65100;
}

.role-badge.mod {
  background: #e3f2fd;
  color: #1565c0;
}

.member-joined {
  font-size: 12px;
  color: var(--text-secondary);
}

.member-actions {
  display: flex;
  gap: 8px;
}

.member-actions button {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-remove {
  background: #ffebee !important;
  color: #c62828;
}

/* Resources Tab */
.resources-tab, .sessions-tab {
  padding: 16px;
  overflow-y: auto;
}

.resources-header, .sessions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.resources-header h3, .sessions-header h3 {
  margin: 0;
}

.btn-add {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.resources-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.resource-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 10px;
}

.resource-icon {
  font-size: 24px;
}

.resource-info {
  flex: 1;
}

.resource-name {
  display: block;
  font-weight: 500;
  color: #667eea;
  text-decoration: none;
}

.resource-name:hover {
  text-decoration: underline;
}

.resource-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Sessions */
.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.session-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.session-card.past {
  opacity: 0.6;
}

.session-date {
  text-align: center;
  padding: 12px;
  background: #667eea;
  color: white;
  border-radius: 10px;
  min-width: 60px;
}

.date-day {
  display: block;
  font-size: 24px;
  font-weight: bold;
}

.date-month {
  font-size: 12px;
}

.session-info {
  flex: 1;
}

.session-title {
  margin: 0 0 8px 0;
}

.session-time, .session-location {
  margin: 0 0 4px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.session-attendees {
  font-size: 12px;
  color: var(--text-secondary);
}

.session-actions {
  display: flex;
  align-items: center;
}

.btn-attend {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.attending-badge {
  color: #4caf50;
  font-size: 13px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.empty-state.small {
  padding: 30px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--modal-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-tertiary);
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-primary);
}

.modal-form {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-sizing: border-box;
  background: var(--input-bg);
  color: var(--text-primary);
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-group.half {
  flex: 1;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-primary {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-secondary {
  padding: 10px 20px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* Loading & Not Found */
.loading-state, .not-found {
  text-align: center;
  padding: 100px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--bg-tertiary);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.not-found-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}

.btn-back {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 16px;
}

/* Responsive */
@media (max-width: 768px) {
  .group-header {
    flex-direction: column;
    text-align: center;
  }

  .header-content {
    flex-direction: column;
  }

  .tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .tab {
    white-space: nowrap;
    font-size: 13px;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }
}

</style>