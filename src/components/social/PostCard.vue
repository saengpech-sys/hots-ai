<template>
  <div class="post-card" :class="[`type-${post.type}`]">
    <!-- Post Header -->
    <div class="post-header">
      <img :src="post.authorPhoto || '/default-avatar.png'" class="author-avatar" alt="avatar">
      <div class="author-info">
        <span class="author-name">{{ post.authorName }}</span>
        <span class="post-meta">
          <span class="post-type">{{ getTypeLabel(post.type) }}</span>
          •
          <span class="post-date">{{ formatDate(post.createdAt) }}</span>
        </span>
      </div>
      <button class="btn-more" @click="showMenu = !showMenu">⋯</button>
      
      <!-- Dropdown Menu -->
      <div v-if="showMenu" class="dropdown-menu" v-click-outside="closeMenu">
        <button @click="handleShare">🔗 แชร์</button>
        <button v-if="isOwner" @click="handleEdit">✏️ แก้ไข</button>
        <button v-if="isOwner" class="danger" @click="handleDelete">🗑️ ลบ</button>
        <button @click="handleReport">🚩 รายงาน</button>
      </div>
    </div>

    <!-- Post Content -->
    <div class="post-content">
      <p>{{ post.content }}</p>
    </div>

    <!-- Tags -->
    <div v-if="post.tags?.length" class="post-tags">
      <span v-for="tag in post.tags" :key="tag" class="tag">#{{ tag }}</span>
    </div>

    <!-- Attachments (if any) -->
    <div v-if="post.attachments?.length" class="post-attachments">
      <div v-for="att in post.attachments" :key="att.url" class="attachment">
        <img v-if="att.type === 'image'" :src="att.url" alt="attachment">
        <a v-else :href="att.url" target="_blank">📎 {{ att.name }}</a>
      </div>
    </div>

    <!-- Post Stats -->
    <div class="post-stats">
      <span v-if="post.reactionCount">❤️ {{ post.reactionCount }}</span>
      <span v-if="post.commentCount">💬 {{ post.commentCount }} ความคิดเห็น</span>
    </div>

    <!-- Action Buttons -->
    <div class="post-actions">
      <button 
        :class="['action-btn', { active: hasReacted }]"
        @click="handleReaction"
      >
        {{ hasReacted ? '❤️' : '🤍' }} ถูกใจ
      </button>
      <button class="action-btn" @click="toggleComments">
        💬 ความคิดเห็น
      </button>
      <button class="action-btn" @click="handleShare">
        🔗 แชร์
      </button>
    </div>

    <!-- Comments Section -->
    <div v-if="showComments" class="comments-section">
      <!-- Existing Comments -->
      <div class="comments-list">
        <div v-for="comment in comments" :key="comment.id" class="comment">
          <img :src="comment.authorPhoto || '/default-avatar.png'" class="comment-avatar">
          <div class="comment-bubble">
            <span class="comment-author">{{ comment.authorName }}</span>
            <p>{{ comment.content }}</p>
            <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
          </div>
        </div>
        <div v-if="loadingComments" class="loading-comments">
          กำลังโหลด...
        </div>
      </div>

      <!-- Comment Input -->
      <div class="comment-input">
        <img :src="currentUserPhoto" class="comment-avatar">
        <input 
          type="text"
          v-model="commentText"
          placeholder="เขียนความคิดเห็น..."
          @keyup.enter="submitComment"
        >
        <button @click="submitComment" :disabled="!commentText.trim()">
          ส่ง
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['react', 'comment', 'share', 'edit', 'delete'])

const authStore = useAuthStore()

// State
const showMenu = ref(false)
const showComments = ref(false)
const comments = ref([])
const loadingComments = ref(false)
const commentText = ref('')
const hasReacted = ref(false)

// Computed
const isOwner = computed(() => props.post.authorId === authStore.user?.uid)
const currentUserPhoto = computed(() => authStore.user?.photoURL || '/default-avatar.png')

// Methods
function getTypeLabel(type) {
  const labels = {
    'discussion': '💬 การสนทนา',
    'question': '❓ คำถาม',
    'achievement': '🏆 ความสำเร็จ',
    'resource': '📚 แหล่งข้อมูล'
  }
  return labels[type] || type
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000)
  const now = new Date()
  const diff = now - date
  
  // Less than 1 hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000)
    return `${mins} นาทีที่แล้ว`
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours} ชั่วโมงที่แล้ว`
  }
  
  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days} วันที่แล้ว`
  }
  
  // Default format
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short'
  })
}

function closeMenu() {
  showMenu.value = false
}

async function toggleComments() {
  showComments.value = !showComments.value
  
  if (showComments.value && comments.value.length === 0) {
    await loadComments()
  }
}

async function loadComments() {
  loadingComments.value = true
  try {
    const commentsQuery = query(
      collection(db, 'comments'),
      where('postId', '==', props.post.id),
      orderBy('createdAt', 'asc')
    )
    const snapshot = await getDocs(commentsQuery)
    comments.value = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (error) {
    console.error('Error loading comments:', error)
  } finally {
    loadingComments.value = false
  }
}

function handleReaction() {
  hasReacted.value = !hasReacted.value
  emit('react', props.post.id, hasReacted.value ? 'like' : 'unlike')
}

function submitComment() {
  if (!commentText.value.trim()) return
  
  // Optimistic update
  comments.value.push({
    id: Date.now().toString(),
    authorName: authStore.user.displayName,
    authorPhoto: authStore.user.photoURL,
    content: commentText.value,
    createdAt: new Date()
  })
  
  emit('comment', props.post.id, commentText.value)
  commentText.value = ''
}

function handleShare() {
  closeMenu()
  emit('share', props.post.id)
}

function handleEdit() {
  closeMenu()
  emit('edit', props.post.id)
}

function handleDelete() {
  if (confirm('คุณต้องการลบโพสต์นี้หรือไม่?')) {
    closeMenu()
    emit('delete', props.post.id)
  }
}

function handleReport() {
  closeMenu()
  alert('ขอบคุณที่รายงาน เราจะตรวจสอบโพสต์นี้')
}
</script>

<style scoped>
.post-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--border-color);
}

/* Type-specific styling */
.post-card.type-question {
  border-left: 4px solid #f59e0b;
}

.post-card.type-achievement {
  border-left: 4px solid #10b981;
}

.post-card.type-resource {
  border-left: 4px solid #3b82f6;
}

/* Header */
.post-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  position: relative;
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.author-info {
  flex: 1;
}

.author-name {
  font-weight: 600;
  display: block;
}

.post-meta {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.btn-more {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
  border-radius: 50%;
}

.btn-more:hover {
  background: var(--bg-secondary);
}

/* Dropdown */
.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  min-width: 150px;
  overflow: hidden;
}

.dropdown-menu button {
  display: block;
  width: 100%;
  padding: 10px 16px;
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
}

.dropdown-menu button:hover {
  background: var(--bg-secondary);
}

.dropdown-menu button.danger {
  color: #dc2626;
}

/* Content */
.post-content {
  margin-bottom: 12px;
}

.post-content p {
  line-height: 1.6;
  white-space: pre-wrap;
}

/* Tags */
.post-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.tag {
  padding: 4px 10px;
  background: var(--primary-light);
  color: var(--primary-color);
  border-radius: 20px;
  font-size: 0.85rem;
}

/* Attachments */
.post-attachments {
  margin-bottom: 12px;
}

.post-attachments img {
  max-width: 100%;
  border-radius: 8px;
}

/* Stats */
.post-stats {
  display: flex;
  gap: 16px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  padding: 8px 0;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 8px;
}

/* Actions */
.post-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  color: var(--text-secondary);
}

.action-btn:hover {
  background: var(--bg-secondary);
}

.action-btn.active {
  color: #ef4444;
}

/* Comments Section */
.comments-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.comments-list {
  margin-bottom: 16px;
}

.comment {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.comment-bubble {
  background: var(--bg-secondary);
  padding: 8px 12px;
  border-radius: 12px;
  flex: 1;
}

.comment-author {
  font-weight: 600;
  font-size: 0.9rem;
  display: block;
}

.comment-bubble p {
  font-size: 0.9rem;
  margin: 4px 0;
}

.comment-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.loading-comments {
  text-align: center;
  padding: 16px;
  color: var(--text-secondary);
}

/* Comment Input */
.comment-input {
  display: flex;
  gap: 10px;
  align-items: center;
}

.comment-input input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  background: var(--bg-secondary);
}

.comment-input button {
  padding: 10px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
}

.comment-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
