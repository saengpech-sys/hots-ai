<template>
  <div class="group-detail">
    <!-- Loading -->
    <LoadingSpinner v-if="loading" />

    <template v-else-if="group">
      <!-- Header -->
      <div class="group-header">
        <div class="header-top">
          <router-link to="/groups" class="back-link">← กลับ</router-link>
        </div>
        <div class="header-main">
          <div class="group-icon">{{ group.icon || '📚' }}</div>
          <div class="header-info">
            <h1>{{ group.name }}</h1>
            <p class="group-desc">{{ group.description }}</p>
            <div class="group-meta">
              <span>👥 {{ group.memberCount || 0 }} สมาชิก</span>
              <span>📝 {{ group.postCount || 0 }} โพสต์</span>
              <span>🔖 {{ group.type === 'public' ? 'สาธารณะ' : 'ส่วนตัว' }}</span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button 
            v-if="!isMember" 
            class="btn-join"
            @click="joinGroup"
          >
            ➕ เข้าร่วม
          </button>
          <button 
            v-else-if="!isOwner"
            class="btn-leave"
            @click="leaveGroup"
          >
            ← ออกจากกลุ่ม
          </button>
          <button 
            v-if="isOwner"
            class="btn-settings"
            @click="showSettings = true"
          >
            ⚙️ ตั้งค่า
          </button>
        </div>
      </div>

      <!-- Tags -->
      <div class="group-tags" v-if="group.tags?.length">
        <span v-for="tag in group.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>

      <!-- Tabs -->
      <div class="group-tabs">
        <button 
          :class="['tab-btn', { active: activeTab === 'posts' }]"
          @click="activeTab = 'posts'"
        >
          📝 โพสต์
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'members' }]"
          @click="activeTab = 'members'"
        >
          👥 สมาชิก
        </button>
        <button 
          v-if="isOwner"
          :class="['tab-btn', { active: activeTab === 'pending' }]"
          @click="activeTab = 'pending'"
        >
          ⏳ รอดำเนินการ
        </button>
      </div>

      <!-- Posts Tab -->
      <div v-if="activeTab === 'posts'" class="posts-section">
        <!-- Post Input -->
        <div v-if="isMember" class="post-input-card">
          <textarea 
            v-model="newPostContent"
            placeholder="แชร์ความคิดกับกลุ่ม..."
            rows="3"
          ></textarea>
          <div class="post-input-actions">
            <button 
              class="btn-post"
              @click="createPost"
              :disabled="!newPostContent || posting"
            >
              {{ posting ? 'กำลังโพสต์...' : '📤 โพสต์' }}
            </button>
          </div>
        </div>

        <!-- Posts List -->
        <div class="posts-list">
          <div v-if="posts.length === 0" class="empty-posts">
            <span class="icon">📭</span>
            <p>ยังไม่มีโพสต์ในกลุ่มนี้</p>
          </div>
          <div 
            v-for="post in posts"
            :key="post.id"
            class="post-card"
          >
            <div class="post-header">
              <img :src="post.authorPhoto" class="author-avatar">
              <div class="author-info">
                <span class="author-name">{{ post.authorName }}</span>
                <span class="post-date">{{ formatDate(post.createdAt) }}</span>
              </div>
            </div>
            <div class="post-content">{{ post.content }}</div>
            <div class="post-actions">
              <button @click="reactToPost(post.id)">
                ❤️ {{ post.reactionCount || 0 }}
              </button>
              <button @click="toggleComments(post.id)">
                💬 {{ post.commentCount || 0 }}
              </button>
            </div>
            
            <!-- Comments -->
            <div v-if="expandedPost === post.id" class="comments-section">
              <div v-for="comment in post.comments" :key="comment.id" class="comment">
                <img :src="comment.authorPhoto" class="comment-avatar">
                <div class="comment-content">
                  <span class="comment-author">{{ comment.authorName }}</span>
                  <p>{{ comment.content }}</p>
                </div>
              </div>
              <div class="comment-input">
                <input 
                  type="text" 
                  v-model="commentText[post.id]"
                  placeholder="เขียนความคิดเห็น..."
                  @keyup.enter="addComment(post.id)"
                >
                <button @click="addComment(post.id)">ส่ง</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Members Tab -->
      <div v-if="activeTab === 'members'" class="members-section">
        <div v-if="members.length === 0" class="empty-members">
          <p>ไม่มีสมาชิก</p>
        </div>
        <div v-else class="members-list">
          <div v-for="member in members" :key="member.id" class="member-card">
            <img :src="member.photoURL" class="member-avatar">
            <div class="member-info">
              <span class="member-name">{{ member.displayName }}</span>
              <span class="member-role">
                {{ member.id === group.createdBy ? '👑 ผู้สร้าง' : '👤 สมาชิก' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pending Tab (Owner only) -->
      <div v-if="activeTab === 'pending' && isOwner" class="pending-section">
        <p class="info-text">ยังไม่มีการขอเข้าร่วมกลุ่ม</p>
      </div>
    </template>

    <!-- Group Not Found -->
    <div v-else class="not-found">
      <h2>ไม่พบกลุ่ม</h2>
      <router-link to="/groups">← กลับไปหน้ากลุ่ม</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, arrayUnion, arrayRemove, increment, serverTimestamp, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(true)
const group = ref(null)
const posts = ref([])
const members = ref([])
const activeTab = ref('posts')
const showSettings = ref(false)
const expandedPost = ref(null)
const commentText = ref({})

// Post input
const newPostContent = ref('')
const posting = ref(false)

// Computed
const isMember = computed(() => group.value?.memberIds?.includes(authStore.user.uid))
const isOwner = computed(() => group.value?.createdBy === authStore.user.uid)

// Methods
async function loadGroup() {
  loading.value = true
  try {
    const groupDoc = await getDoc(doc(db, 'groups', route.params.id))
    if (groupDoc.exists()) {
      group.value = { id: groupDoc.id, ...groupDoc.data() }
      await loadPosts()
      await loadMembers()
    }
  } catch (error) {
    console.error('Error loading group:', error)
  } finally {
    loading.value = false
  }
}

async function loadPosts() {
  try {
    const postsQuery = query(
      collection(db, 'posts'),
      where('groupId', '==', route.params.id),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(postsQuery)
    posts.value = snapshot.docs.map(d => ({ id: d.id, ...d.data(), comments: [] }))
  } catch (error) {
    console.error('Error loading posts:', error)
  }
}

async function loadMembers() {
  if (!group.value?.memberIds?.length) return
  
  try {
    // Load member profiles (limit to 50 for performance)
    const memberIds = group.value.memberIds.slice(0, 50)
    const memberPromises = memberIds.map(id => getDoc(doc(db, 'users', id)))
    const memberDocs = await Promise.all(memberPromises)
    members.value = memberDocs
      .filter(d => d.exists())
      .map(d => ({ id: d.id, ...d.data() }))
  } catch (error) {
    console.error('Error loading members:', error)
  }
}

async function joinGroup() {
  try {
    await updateDoc(doc(db, 'groups', route.params.id), {
      memberIds: arrayUnion(authStore.user.uid),
      memberCount: increment(1)
    })
    group.value.memberIds.push(authStore.user.uid)
    group.value.memberCount++
  } catch (error) {
    console.error('Error joining group:', error)
    alert('เกิดข้อผิดพลาด')
  }
}

async function leaveGroup() {
  if (!confirm('คุณต้องการออกจากกลุ่มนี้หรือไม่?')) return
  
  try {
    await updateDoc(doc(db, 'groups', route.params.id), {
      memberIds: arrayRemove(authStore.user.uid),
      memberCount: increment(-1)
    })
    router.push('/groups')
  } catch (error) {
    console.error('Error leaving group:', error)
    alert('เกิดข้อผิดพลาด')
  }
}

async function createPost() {
  if (!newPostContent.value || posting.value) return
  
  posting.value = true
  try {
    await addDoc(collection(db, 'posts'), {
      groupId: route.params.id,
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName,
      authorPhoto: authStore.user.photoURL,
      content: newPostContent.value,
      reactionCount: 0,
      commentCount: 0,
      createdAt: serverTimestamp()
    })
    
    // Update group post count
    await updateDoc(doc(db, 'groups', route.params.id), {
      postCount: increment(1)
    })
    
    newPostContent.value = ''
    await loadPosts()
  } catch (error) {
    console.error('Error creating post:', error)
    alert('เกิดข้อผิดพลาด')
  } finally {
    posting.value = false
  }
}

async function reactToPost(postId) {
  try {
    await addDoc(collection(db, 'reactions'), {
      postId,
      userId: authStore.user.uid,
      type: 'like',
      createdAt: serverTimestamp()
    })
    
    await updateDoc(doc(db, 'posts', postId), {
      reactionCount: increment(1)
    })
    
    // Update local state
    const post = posts.value.find(p => p.id === postId)
    if (post) post.reactionCount++
  } catch (error) {
    console.error('Error reacting:', error)
  }
}

async function toggleComments(postId) {
  if (expandedPost.value === postId) {
    expandedPost.value = null
    return
  }
  
  expandedPost.value = postId
  
  // Load comments
  try {
    const commentsQuery = query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    )
    const snapshot = await getDocs(commentsQuery)
    const post = posts.value.find(p => p.id === postId)
    if (post) {
      post.comments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    }
  } catch (error) {
    console.error('Error loading comments:', error)
  }
}

async function addComment(postId) {
  const text = commentText.value[postId]
  if (!text) return
  
  try {
    await addDoc(collection(db, 'comments'), {
      postId,
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName,
      authorPhoto: authStore.user.photoURL,
      content: text,
      createdAt: serverTimestamp()
    })
    
    await updateDoc(doc(db, 'posts', postId), {
      commentCount: increment(1)
    })
    
    // Update local state
    const post = posts.value.find(p => p.id === postId)
    if (post) {
      post.comments.push({
        authorName: authStore.user.displayName,
        authorPhoto: authStore.user.photoURL,
        content: text
      })
      post.commentCount++
    }
    
    commentText.value[postId] = ''
  } catch (error) {
    console.error('Error adding comment:', error)
  }
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000)
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(loadGroup)
</script>

<style scoped>
.group-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

/* Header */
.group-header {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
}

.header-top {
  margin-bottom: 16px;
}

.back-link {
  color: var(--primary-color);
  text-decoration: none;
}

.header-main {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.group-icon {
  font-size: 4rem;
}

.header-info h1 {
  margin-bottom: 8px;
}

.group-desc {
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.group-meta {
  display: flex;
  gap: 16px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-join, .btn-settings {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-leave {
  padding: 10px 20px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
}

/* Tags */
.group-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.tag {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border-radius: 20px;
  font-size: 0.85rem;
}

/* Tabs */
.group-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 12px;
}

.tab-btn {
  padding: 10px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
}

.tab-btn.active {
  background: var(--primary-color);
  color: white;
}

/* Post Input */
.post-input-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.post-input-card textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  resize: none;
  margin-bottom: 12px;
}

.post-input-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-post {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-post:disabled {
  opacity: 0.5;
}

/* Posts List */
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-posts {
  text-align: center;
  padding: 60px 20px;
  background: var(--card-bg);
  border-radius: 12px;
}

.empty-posts .icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 16px;
}

.post-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
}

.post-header {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.author-info {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-weight: 600;
}

.post-date {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.post-content {
  margin-bottom: 16px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.post-actions {
  display: flex;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.post-actions button {
  padding: 8px 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
}

/* Comments */
.comments-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.comment {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.comment-content {
  background: var(--bg-secondary);
  padding: 8px 12px;
  border-radius: 12px;
}

.comment-author {
  font-weight: 600;
  font-size: 0.9rem;
  display: block;
}

.comment-content p {
  margin: 4px 0 0;
  font-size: 0.9rem;
}

.comment-input {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.comment-input input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  background: var(--bg-secondary);
}

.comment-input button {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
}

/* Members */
.members-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.member-card {
  display: flex;
  gap: 12px;
  align-items: center;
  background: var(--card-bg);
  padding: 12px;
  border-radius: 12px;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.member-info {
  display: flex;
  flex-direction: column;
}

.member-name {
  font-weight: 600;
}

.member-role {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Empty/Info */
.empty-members, .info-text {
  text-align: center;
  padding: 40px;
  background: var(--card-bg);
  border-radius: 12px;
  color: var(--text-secondary);
}

.not-found {
  text-align: center;
  padding: 60px;
}
</style>
