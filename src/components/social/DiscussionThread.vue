<template>
  <div class="discussion-thread">
    <!-- Thread Header -->
    <div class="thread-header">
      <button class="back-btn" @click="$emit('close')">
        <span class="material-icons">arrow_back</span>
        กลับ
      </button>
      <div class="thread-info">
        <span :class="['thread-badge', `type-${thread.type}`]">
          {{ getTypeBadge(thread.type) }}
        </span>
        <span class="thread-status" :class="thread.status">
          {{ getStatusLabel(thread.status) }}
        </span>
      </div>
    </div>

    <!-- Original Post -->
    <div class="original-post">
      <div class="post-author">
        <img :src="thread.authorPhoto || '/default-avatar.png'" class="author-avatar" alt="avatar">
        <div class="author-details">
          <span class="author-name">{{ thread.authorName }}</span>
          <span class="post-time">{{ formatDate(thread.createdAt) }}</span>
        </div>
        <div v-if="thread.relatedLO" class="lo-badge">
          🎯 {{ thread.relatedLO }}
        </div>
      </div>
      
      <h2 class="post-title">{{ thread.title }}</h2>
      <div class="post-content" v-html="formatContent(thread.content)"></div>
      
      <!-- Attachments -->
      <div v-if="thread.attachments?.length" class="post-attachments">
        <div v-for="att in thread.attachments" :key="att.url" class="attachment-item">
          <img v-if="isImage(att)" :src="att.url" class="attachment-image" @click="openImage(att.url)">
          <a v-else :href="att.url" target="_blank" class="attachment-link">
            📎 {{ att.name }}
          </a>
        </div>
      </div>

      <!-- Post Actions -->
      <div class="post-actions">
        <button 
          :class="['action-btn', { active: hasLiked }]"
          @click="toggleLike"
        >
          {{ hasLiked ? '❤️' : '🤍' }} {{ thread.likeCount || 0 }}
        </button>
        <button class="action-btn" @click="focusReply">
          💬 {{ replies.length }} ตอบ
        </button>
        <button class="action-btn" @click="shareThread">
          🔗 แชร์
        </button>
        <button v-if="isOwner" class="action-btn" @click="editThread">
          ✏️ แก้ไข
        </button>
        <button 
          v-if="thread.type === 'question' && !thread.resolved && canMarkResolved" 
          class="action-btn resolve-btn"
          @click="markResolved"
        >
          ✅ แก้ไขแล้ว
        </button>
      </div>
    </div>

    <!-- Replies Section -->
    <div class="replies-section">
      <h3>💬 ความคิดเห็น ({{ replies.length }})</h3>
      
      <!-- Sort Options -->
      <div class="sort-options">
        <button 
          :class="['sort-btn', { active: sortBy === 'newest' }]"
          @click="sortBy = 'newest'"
        >
          🕐 ล่าสุด
        </button>
        <button 
          :class="['sort-btn', { active: sortBy === 'oldest' }]"
          @click="sortBy = 'oldest'"
        >
          📆 เก่าสุด
        </button>
        <button 
          :class="['sort-btn', { active: sortBy === 'popular' }]"
          @click="sortBy = 'popular'"
        >
          🔥 ยอดนิยม
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loadingReplies" class="loading-state">
        <div class="spinner"></div>
        <p>กำลังโหลดความคิดเห็น...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="replies.length === 0" class="empty-replies">
        <span class="empty-icon">💬</span>
        <p>ยังไม่มีความคิดเห็น</p>
        <p class="hint">เป็นคนแรกที่ตอบกระทู้นี้!</p>
      </div>

      <!-- Replies List -->
      <div v-else class="replies-list">
        <div 
          v-for="reply in sortedReplies" 
          :key="reply.id" 
          :class="['reply-item', { 
            'is-best': reply.isBestAnswer,
            'is-teacher': reply.authorRole === 'teacher',
            'is-mentor': reply.isMentor
          }]"
        >
          <!-- Best Answer Badge -->
          <div v-if="reply.isBestAnswer" class="best-answer-badge">
            ⭐ คำตอบที่ดีที่สุด
          </div>
          
          <!-- Teacher Badge -->
          <div v-if="reply.authorRole === 'teacher'" class="teacher-badge">
            👨‍🏫 ครู
          </div>

          <!-- Mentor Badge -->
          <div v-if="reply.isMentor" class="mentor-badge">
            🌟 Peer Mentor
          </div>

          <div class="reply-header">
            <img :src="reply.authorPhoto || '/default-avatar.png'" class="reply-avatar" alt="avatar">
            <div class="reply-author-info">
              <span class="reply-author-name">{{ reply.authorName }}</span>
              <span class="reply-time">{{ formatDate(reply.createdAt) }}</span>
            </div>
          </div>

          <div class="reply-content" v-html="formatContent(reply.content)"></div>

          <!-- Reply Attachments -->
          <div v-if="reply.attachments?.length" class="reply-attachments">
            <div v-for="att in reply.attachments" :key="att.url" class="attachment-item small">
              <img v-if="isImage(att)" :src="att.url" class="attachment-thumb" @click="openImage(att.url)">
              <a v-else :href="att.url" target="_blank">📎 {{ att.name }}</a>
            </div>
          </div>

          <!-- Reply Actions -->
          <div class="reply-actions">
            <button 
              :class="['action-btn small', { active: reply.hasLiked }]"
              @click="toggleReplyLike(reply)"
            >
              {{ reply.hasLiked ? '❤️' : '🤍' }} {{ reply.likeCount || 0 }}
            </button>
            <button class="action-btn small" @click="replyTo(reply)">
              ↩️ ตอบ
            </button>
            <button 
              v-if="canMarkBestAnswer && !reply.isBestAnswer" 
              class="action-btn small"
              @click="markAsBest(reply)"
            >
              ⭐ เลือกเป็นคำตอบ
            </button>
            <button 
              v-if="reply.authorId === currentUserId" 
              class="action-btn small"
              @click="editReply(reply)"
            >
              ✏️
            </button>
            <button class="action-btn small" @click="reportReply(reply)">
              🚩
            </button>
          </div>

          <!-- Nested Replies (Thread replies) -->
          <div v-if="reply.nestedReplies?.length" class="nested-replies">
            <div v-for="nested in reply.nestedReplies" :key="nested.id" class="nested-reply">
              <img :src="nested.authorPhoto || '/default-avatar.png'" class="nested-avatar" alt="avatar">
              <div class="nested-content">
                <span class="nested-author">{{ nested.authorName }}</span>
                <span class="nested-text">{{ nested.content }}</span>
                <span class="nested-time">{{ formatDate(nested.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reply Input -->
    <div class="reply-input-section" ref="replyInputRef">
      <div v-if="replyingTo" class="replying-to">
        <span>ตอบ @{{ replyingTo.authorName }}</span>
        <button @click="replyingTo = null">✕</button>
      </div>
      
      <div class="reply-input-container">
        <img :src="currentUserPhoto" class="reply-input-avatar" alt="avatar">
        <div class="reply-input-wrapper">
          <textarea 
            ref="replyTextarea"
            v-model="replyText"
            placeholder="เขียนความคิดเห็น..."
            rows="2"
            @keydown.ctrl.enter="submitReply"
          ></textarea>
          <div class="reply-input-actions">
            <button class="attach-btn" @click="attachFile" title="แนบไฟล์">
              📎
            </button>
            <button 
              class="submit-btn" 
              @click="submitReply" 
              :disabled="!replyText.trim() || submitting"
            >
              {{ submitting ? '...' : 'ส่ง' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Attached Files Preview -->
      <div v-if="attachedFiles.length" class="attached-preview">
        <div v-for="(file, idx) in attachedFiles" :key="idx" class="attached-file">
          <span>{{ file.name }}</span>
          <button @click="removeAttachment(idx)">✕</button>
        </div>
      </div>
    </div>

    <!-- Image Lightbox -->
    <div v-if="lightboxImage" class="lightbox" @click="lightboxImage = null">
      <img :src="lightboxImage" alt="enlarged">
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { 
  collection, doc, addDoc, updateDoc, query, where, 
  orderBy, onSnapshot, increment, serverTimestamp,
  arrayUnion, arrayRemove, getDoc
} from 'firebase/firestore'
import { db } from '@/firebase/config'

const props = defineProps({
  thread: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'updated'])

const authStore = useAuthStore()
const currentUserId = computed(() => authStore.user?.uid)
const currentUserPhoto = computed(() => authStore.user?.photoURL || '/default-avatar.png')

// State
const replies = ref([])
const loadingReplies = ref(true)
const sortBy = ref('newest')
const replyText = ref('')
const replyingTo = ref(null)
const submitting = ref(false)
const attachedFiles = ref([])
const lightboxImage = ref(null)
const hasLiked = ref(false)

const replyInputRef = ref(null)
const replyTextarea = ref(null)

// Computed
const isOwner = computed(() => props.thread.authorId === currentUserId.value)
const canMarkResolved = computed(() => isOwner.value || authStore.isTeacher)
const canMarkBestAnswer = computed(() => isOwner.value && props.thread.type === 'question')

const sortedReplies = computed(() => {
  const sorted = [...replies.value]
  switch (sortBy.value) {
    case 'newest':
      return sorted.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis())
    case 'oldest':
      return sorted.sort((a, b) => a.createdAt?.toMillis() - b.createdAt?.toMillis())
    case 'popular':
      return sorted.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
    default:
      return sorted
  }
})

// Methods
function getTypeBadge(type) {
  const badges = {
    'question': '❓ คำถาม',
    'discussion': '💬 พูดคุย',
    'tip': '💡 เคล็ดลับ',
    'share': '📚 แชร์ความรู้',
    'help': '🆘 ขอความช่วยเหลือ'
  }
  return badges[type] || '📝 โพสต์'
}

function getStatusLabel(status) {
  const labels = {
    'open': '🟢 เปิด',
    'resolved': '✅ แก้ไขแล้ว',
    'closed': '🔒 ปิด'
  }
  return labels[status] || ''
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate?.() || new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return 'เมื่อกี้'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชั่วโมงที่แล้ว`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} วันที่แล้ว`
  
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function formatContent(content) {
  if (!content) return ''
  // Convert newlines to br and escape HTML
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/@(\w+)/g, '<span class="mention">@$1</span>')
}

function isImage(attachment) {
  return attachment.type?.startsWith('image/') || 
         /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.url)
}

function openImage(url) {
  lightboxImage.value = url
}

async function toggleLike() {
  const threadRef = doc(db, 'discussions', props.thread.id)
  
  if (hasLiked.value) {
    await updateDoc(threadRef, {
      likeCount: increment(-1),
      likedBy: arrayRemove(currentUserId.value)
    })
    hasLiked.value = false
  } else {
    await updateDoc(threadRef, {
      likeCount: increment(1),
      likedBy: arrayUnion(currentUserId.value)
    })
    hasLiked.value = true
  }
}

async function toggleReplyLike(reply) {
  const replyRef = doc(db, 'discussions', props.thread.id, 'replies', reply.id)
  
  if (reply.hasLiked) {
    await updateDoc(replyRef, {
      likeCount: increment(-1),
      likedBy: arrayRemove(currentUserId.value)
    })
    reply.hasLiked = false
    reply.likeCount = (reply.likeCount || 1) - 1
  } else {
    await updateDoc(replyRef, {
      likeCount: increment(1),
      likedBy: arrayUnion(currentUserId.value)
    })
    reply.hasLiked = true
    reply.likeCount = (reply.likeCount || 0) + 1
  }
}

function focusReply() {
  replyTextarea.value?.focus()
  replyInputRef.value?.scrollIntoView({ behavior: 'smooth' })
}

function replyTo(reply) {
  replyingTo.value = reply
  replyText.value = `@${reply.authorName} `
  nextTick(() => {
    replyTextarea.value?.focus()
  })
}

async function submitReply() {
  if (!replyText.value.trim() || submitting.value) return
  
  submitting.value = true
  
  try {
    const replyData = {
      content: replyText.value.trim(),
      authorId: currentUserId.value,
      authorName: authStore.user?.displayName || 'ไม่ระบุชื่อ',
      authorPhoto: authStore.user?.photoURL || null,
      authorRole: authStore.userProfile?.role || 'student',
      isMentor: authStore.userProfile?.isMentor || false,
      createdAt: serverTimestamp(),
      likeCount: 0,
      likedBy: [],
      parentReplyId: replyingTo.value?.id || null
    }
    
    await addDoc(collection(db, 'discussions', props.thread.id, 'replies'), replyData)
    
    // Update thread reply count
    await updateDoc(doc(db, 'discussions', props.thread.id), {
      replyCount: increment(1),
      lastActivityAt: serverTimestamp()
    })
    
    replyText.value = ''
    replyingTo.value = null
    attachedFiles.value = []
    
    // Award points for helping
    if (props.thread.authorId !== currentUserId.value) {
      // Could trigger gamification here
    }
    
  } catch (error) {
    console.error('Error submitting reply:', error)
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
  } finally {
    submitting.value = false
  }
}

async function markResolved() {
  if (!confirm('ต้องการทำเครื่องหมายว่าแก้ไขแล้วใช่ไหม?')) return
  
  await updateDoc(doc(db, 'discussions', props.thread.id), {
    status: 'resolved',
    resolvedAt: serverTimestamp()
  })
  
  emit('updated')
}

async function markAsBest(reply) {
  await updateDoc(doc(db, 'discussions', props.thread.id, 'replies', reply.id), {
    isBestAnswer: true
  })
  
  // Also mark thread as resolved
  await updateDoc(doc(db, 'discussions', props.thread.id), {
    status: 'resolved',
    bestAnswerId: reply.id,
    resolvedAt: serverTimestamp()
  })
  
  reply.isBestAnswer = true
  emit('updated')
}

function shareThread() {
  const url = `${window.location.origin}/community/discussion/${props.thread.id}`
  navigator.clipboard.writeText(url)
  alert('คัดลอกลิงก์แล้ว!')
}

function attachFile() {
  // File upload logic would go here
  alert('ฟีเจอร์แนบไฟล์กำลังพัฒนา')
}

function removeAttachment(idx) {
  attachedFiles.value.splice(idx, 1)
}

function editThread() {
  // Would open edit modal
  alert('ฟีเจอร์แก้ไขกำลังพัฒนา')
}

function editReply(reply) {
  replyText.value = reply.content
  // Would implement inline editing
}

function reportReply(reply) {
  if (confirm('ต้องการรายงานความคิดเห็นนี้ใช่ไหม?')) {
    // Report logic
    alert('รายงานแล้ว ขอบคุณที่ช่วยดูแลชุมชน')
  }
}

// Load replies
function loadReplies() {
  loadingReplies.value = true
  
  const repliesQuery = query(
    collection(db, 'discussions', props.thread.id, 'replies'),
    orderBy('createdAt', 'desc')
  )
  
  onSnapshot(repliesQuery, (snapshot) => {
    replies.value = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        hasLiked: data.likedBy?.includes(currentUserId.value)
      }
    })
    loadingReplies.value = false
  })
}

// Check if user has liked
async function checkLiked() {
  const threadDoc = await getDoc(doc(db, 'discussions', props.thread.id))
  if (threadDoc.exists()) {
    hasLiked.value = threadDoc.data().likedBy?.includes(currentUserId.value)
  }
}

onMounted(() => {
  loadReplies()
  checkLiked()
})
</script>

<style scoped>
.discussion-thread {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.thread-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  background: var(--bg-primary);
  z-index: 10;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.back-btn:hover {
  color: var(--primary-color);
}

.thread-info {
  display: flex;
  gap: 0.5rem;
}

.thread-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  background: var(--bg-secondary);
}

.thread-badge.type-question { background: #fef3c7; color: #92400e; }
.thread-badge.type-discussion { background: #dbeafe; color: #1e40af; }
.thread-badge.type-tip { background: #dcfce7; color: #166534; }
.thread-badge.type-help { background: #fee2e2; color: #991b1b; }

.thread-status {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
}

.thread-status.resolved { background: #dcfce7; color: #166534; }
.thread-status.open { background: #dbeafe; color: #1e40af; }

/* Original Post */
.original-post {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.post-author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.author-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.author-details {
  flex: 1;
}

.author-name {
  display: block;
  font-weight: 600;
  color: var(--text-primary);
}

.post-time {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.lo-badge {
  padding: 0.25rem 0.75rem;
  background: var(--primary-light);
  color: var(--primary-color);
  border-radius: 20px;
  font-size: 0.8rem;
}

.post-title {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.post-content {
  line-height: 1.7;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.post-content :deep(.mention) {
  color: var(--primary-color);
  font-weight: 500;
}

.post-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.attachment-image {
  max-width: 200px;
  border-radius: 8px;
  cursor: pointer;
}

.post-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.action-btn {
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--bg-tertiary);
}

.action-btn.active {
  color: #ef4444;
}

.action-btn.resolve-btn {
  background: #dcfce7;
  color: #166534;
}

/* Replies Section */
.replies-section {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.replies-section h3 {
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.sort-options {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.sort-btn {
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.8rem;
}

.sort-btn.active {
  background: var(--primary-color);
  color: white;
}

.loading-state, .empty-replies {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.5rem;
}

.hint {
  font-size: 0.85rem;
  opacity: 0.8;
}

/* Reply Items */
.reply-item {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  position: relative;
}

.reply-item.is-best {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
}

.reply-item.is-teacher {
  border-left: 4px solid var(--primary-color);
}

.reply-item.is-mentor {
  border-left: 4px solid #8b5cf6;
}

.best-answer-badge, .teacher-badge, .mentor-badge {
  position: absolute;
  top: -10px;
  right: 10px;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.best-answer-badge {
  background: #f59e0b;
  color: white;
}

.teacher-badge {
  background: var(--primary-color);
  color: white;
}

.mentor-badge {
  background: #8b5cf6;
  color: white;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.reply-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.reply-author-name {
  font-weight: 600;
  color: var(--text-primary);
}

.reply-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-left: 0.5rem;
}

.reply-content {
  line-height: 1.6;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.reply-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn.small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

/* Nested Replies */
.nested-replies {
  margin-top: 0.75rem;
  padding-left: 1rem;
  border-left: 2px solid var(--border-color);
}

.nested-reply {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.nested-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.nested-author {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.nested-text {
  font-size: 0.85rem;
  color: var(--text-primary);
}

.nested-time {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-left: 0.5rem;
}

/* Reply Input */
.reply-input-section {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
  position: sticky;
  bottom: 0;
}

.replying-to {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.replying-to button {
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.7;
}

.reply-input-container {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.reply-input-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.reply-input-wrapper {
  flex: 1;
  position: relative;
}

.reply-input-wrapper textarea {
  width: 100%;
  padding: 0.75rem;
  padding-right: 80px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  resize: none;
  font-family: inherit;
  font-size: 0.95rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.reply-input-wrapper textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.reply-input-actions {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: flex;
  gap: 0.5rem;
}

.attach-btn {
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
}

.submit-btn {
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.attached-preview {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.attached-file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 0.85rem;
}

.attached-file button {
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.7;
}

/* Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;
}

.lightbox img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
}

/* Spinner */
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Dark mode */
.dark-mode .reply-item.is-best {
  background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
}
</style>
