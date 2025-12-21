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
      <button 
        v-if="!isOwner" 
        :class="['btn-follow', { following: isFollowing }]"
        @click="toggleFollow"
        :disabled="isFollowLoading"
      >
        {{ isFollowing ? '✓ ติดตามแล้ว' : '+ ติดตาม' }}
      </button>
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
      <span v-if="post.reactionCount > 0">❤️ {{ post.reactionCount }}</span>
      <span v-if="post.commentCount > 0">💬 {{ post.commentCount }} ความคิดเห็น</span>
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
        <template v-for="comment in rootComments" :key="comment.id">
          <CommentItem 
            :comment="comment" 
            :all-comments="comments"
            :depth="0"
            @reply="replyToComment"
            @delete="deleteComment"
          />
        </template>
        <div v-if="loadingComments" class="loading-comments">
          กำลังโหลด...
        </div>
      </div>

      <!-- Reply indicator -->
      <div v-if="replyingTo" class="reply-indicator">
        <span>ตอบกลับ <strong>{{ replyingTo.authorName }}</strong></span>
        <button @click="cancelReply" class="cancel-reply">✕</button>
      </div>

      <!-- Comment Input -->
      <div class="comment-input">
        <img :src="currentUserPhoto" class="comment-avatar">
        <input 
          type="text"
          v-model="commentText"
          :placeholder="replyingTo ? `ตอบกลับ ${replyingTo.authorName}...` : 'เขียนความคิดเห็น...'"
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
import { ref, computed, inject, onMounted } from 'vue'
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['react', 'comment', 'share', 'edit', 'delete', 'deleteComment'])

const authStore = useAuthStore()

// CommentItem component for recursive rendering
const CommentItem = {
  name: 'CommentItem',
  props: {
    comment: Object,
    allComments: Array,
    depth: { type: Number, default: 0 }
  },
  emits: ['reply', 'delete'],
  setup(props, { emit }) {
    const authStore = useAuthStore()
    const currentUserId = computed(() => authStore.user?.uid)
    
    const getChildComments = (parentId) => {
      return props.allComments.filter(c => c.parentId === parentId)
    }
    
    const formatCommentDate = (timestamp) => {
      if (!timestamp) return ''
      let date
      if (timestamp.toDate) date = timestamp.toDate()
      else if (timestamp.seconds) date = new Date(timestamp.seconds * 1000)
      else date = new Date(timestamp)
      
      if (isNaN(date.getTime())) return 'เมื่อสักครู่'
      
      const now = new Date()
      const diff = now - date
      
      if (diff < 60000) return 'เมื่อสักครู่'
      if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชั่วโมงที่แล้ว`
      if (diff < 604800000) return `${Math.floor(diff / 86400000)} วันที่แล้ว`
      return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    }
    
    return { currentUserId, getChildComments, formatCommentDate }
  },
  template: `
    <div>
      <div class="comment" :style="{ marginLeft: (depth * 24) + 'px' }">
        <img :src="comment.authorPhoto || '/default-avatar.png'" class="comment-avatar">
        <div class="comment-bubble">
          <span class="comment-author">{{ comment.authorName }}</span>
          <p>{{ comment.content }}</p>
          <div class="comment-actions">
            <span class="comment-date">{{ formatCommentDate(comment.createdAt) }}</span>
            <button class="reply-btn" @click="$emit('reply', comment)">ตอบกลับ</button>
            <button 
              v-if="comment.authorId === currentUserId"
              class="delete-comment-btn" 
              @click="$emit('delete', comment.id)"
            >ลบ</button>
          </div>
        </div>
      </div>
      <CommentItem 
        v-for="reply in getChildComments(comment.id)" 
        :key="reply.id"
        :comment="reply" 
        :all-comments="allComments"
        :depth="depth + 1"
        @reply="(c) => $emit('reply', c)"
        @delete="(id) => $emit('delete', id)"
      />
    </div>
  `
}

// State
const showMenu = ref(false)
const showComments = ref(false)
const comments = ref([])
const loadingComments = ref(false)
const commentText = ref('')
const hasReacted = ref(false)
const replyingTo = ref(null)
const isLiking = ref(false)  // Prevent double-click
const isFollowing = ref(false)
const isFollowLoading = ref(false)

// Check if user already liked this post on mount
onMounted(async () => {
  if (authStore.user?.uid) {
    await checkIfLiked()
    await checkIfFollowing()
  }
})

async function checkIfFollowing() {
  if (!authStore.user?.uid || props.post.authorId === authStore.user.uid) return
  
  try {
    const followQuery = query(
      collection(db, 'following'),
      where('followerId', '==', authStore.user.uid),
      where('followingId', '==', props.post.authorId)
    )
    const snapshot = await getDocs(followQuery)
    isFollowing.value = !snapshot.empty
  } catch (error) {
    console.error('Error checking follow status:', error)
  }
}

async function toggleFollow() {
  if (!authStore.user?.uid || isFollowLoading.value) return
  
  isFollowLoading.value = true
  try {
    if (isFollowing.value) {
      // Unfollow
      const followQuery = query(
        collection(db, 'following'),
        where('followerId', '==', authStore.user.uid),
        where('followingId', '==', props.post.authorId)
      )
      const snapshot = await getDocs(followQuery)
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'following', docSnap.id))
      }
      isFollowing.value = false
    } else {
      // Follow
      await addDoc(collection(db, 'following'), {
        followerId: authStore.user.uid,
        followerName: authStore.user.displayName || 'ผู้ใช้',
        followingId: props.post.authorId,
        followingName: props.post.authorName,
        createdAt: serverTimestamp()
      })
      isFollowing.value = true
    }
  } catch (error) {
    console.error('Error toggling follow:', error)
  } finally {
    isFollowLoading.value = false
  }
}

async function checkIfLiked() {
  try {
    const reactionsQuery = query(
      collection(db, 'reactions'),
      where('postId', '==', props.post.id),
      where('userId', '==', authStore.user.uid)
    )
    const snapshot = await getDocs(reactionsQuery)
    hasReacted.value = !snapshot.empty
  } catch (error) {
    console.error('Error checking like status:', error)
  }
}

// Computed
const isOwner = computed(() => props.post.authorId === authStore.user?.uid)
const currentUserPhoto = computed(() => authStore.user?.photoURL || '/default-avatar.png')
const rootComments = computed(() => comments.value.filter(c => !c.parentId))

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
  
  let date
  if (timestamp.toDate) {
    // Firestore Timestamp
    date = timestamp.toDate()
  } else if (timestamp.seconds) {
    // Firestore Timestamp as plain object
    date = new Date(timestamp.seconds * 1000)
  } else if (timestamp instanceof Date) {
    // JavaScript Date object
    date = timestamp
  } else if (typeof timestamp === 'number') {
    // Unix timestamp
    date = new Date(timestamp)
  } else {
    // Try to parse as string
    date = new Date(timestamp)
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'เมื่อสักครู่'
  }
  
  const now = new Date()
  const diff = now - date
  
  // Less than 1 minute
  if (diff < 60000) {
    return 'เมื่อสักครู่'
  }
  
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
  // Prevent double-click
  if (isLiking.value) return
  
  isLiking.value = true
  const willLike = !hasReacted.value
  
  // Optimistic update
  hasReacted.value = willLike
  
  // Emit to parent to handle DB operation
  emit('react', props.post.id, willLike ? 'like' : 'unlike')
  
  // Reset after a short delay
  setTimeout(() => {
    isLiking.value = false
  }, 500)
}

function submitComment() {
  if (!commentText.value.trim()) return
  
  const parentId = replyingTo.value?.id || null
  
  const newComment = {
    id: 'temp-' + Date.now().toString(),
    authorId: authStore.user.uid,
    authorName: authStore.user.displayName,
    authorPhoto: authStore.user.photoURL,
    content: commentText.value,
    createdAt: new Date(),
    parentId: parentId
  }
  
  // Optimistic update
  comments.value.push(newComment)
  
  // Emit with parentId for proper nesting
  emit('comment', props.post.id, commentText.value, parentId)
  commentText.value = ''
  replyingTo.value = null
}

function replyToComment(comment) {
  replyingTo.value = comment
  commentText.value = ''
}

function cancelReply() {
  replyingTo.value = null
  commentText.value = ''
}

async function deleteComment(commentId) {
  if (!confirm('คุณต้องการลบความคิดเห็นนี้หรือไม่?')) return
  
  try {
    await deleteDoc(doc(db, 'comments', commentId))
    
    // Update post comment count
    await updateDoc(doc(db, 'posts', props.post.id), {
      commentCount: increment(-1)
    })
    
    // Remove from local state
    comments.value = comments.value.filter(c => c.id !== commentId)
    
  } catch (error) {
    console.error('Error deleting comment:', error)
    alert('เกิดข้อผิดพลาดในการลบความคิดเห็น')
  }
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

.btn-follow {
  padding: 6px 12px;
  border: 1px solid var(--primary-color);
  background: transparent;
  color: var(--primary-color);
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-follow:hover {
  background: var(--primary-color);
  color: white;
}

.btn-follow.following {
  background: var(--bg-secondary);
  border-color: var(--border-color);
  color: var(--text-secondary);
}

.btn-follow.following:hover {
  background: #fee2e2;
  border-color: #ef4444;
  color: #ef4444;
}

.btn-follow:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-more {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
  border-radius: 50%;
  color: var(--text-secondary);
}

.btn-more:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
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
  color: var(--text-primary);
  cursor: pointer;
}

.dropdown-menu button:hover {
  background: var(--bg-secondary);
}

.dropdown-menu button.danger {
  color: #ef4444;
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
  color: var(--text-primary);
}

.comment-bubble p {
  font-size: 0.9rem;
  margin: 4px 0;
  color: var(--text-primary);
}

.comment-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Comment Actions */
.comment-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 4px;
}

.reply-btn,
.delete-comment-btn {
  background: none;
  border: none;
  font-size: 0.75rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
}

.reply-btn:hover {
  color: var(--primary-color);
}

.delete-comment-btn:hover {
  color: #ef4444;
}

/* Reply Indicator */
.reply-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.reply-indicator strong {
  color: var(--text-primary);
}

.cancel-reply {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
  padding: 0 4px;
}

.cancel-reply:hover {
  color: var(--text-primary);
}

/* Nested Comments */
.comment {
  transition: margin-left 0.2s ease;
}

.comment[style*="margin-left"] .comment-avatar {
  width: 28px;
  height: 28px;
}

.comment[style*="margin-left"] .comment-bubble {
  font-size: 0.9em;
}

.reply {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.reply-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.reply-content {
  flex: 1;
}

.reply-author {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--text-primary);
}

.reply-content p {
  font-size: 0.85rem;
  margin: 2px 0;
  color: var(--text-primary);
}

.reply-date {
  font-size: 0.7rem;
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
  color: var(--text-primary);
}

.comment-input input::placeholder {
  color: var(--text-secondary);
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
