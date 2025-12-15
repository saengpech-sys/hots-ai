<template>
  <div class="feed-view">
    <!-- Header -->
    <div class="page-header">
      <h1>📰 ฟีดกิจกรรม</h1>
      <button class="btn-create" @click="showPostModal = true">
        ✍️ โพสต์ใหม่
      </button>
    </div>

    <!-- Tabs -->
    <div class="feed-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.value"
        :class="['tab-btn', { active: activeTab === tab.value }]"
        @click="activeTab = tab.value"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- Loading -->
    <LoadingSpinner v-if="loading" />

    <!-- Empty State -->
    <EmptyState 
      v-else-if="filteredPosts.length === 0"
      icon="📭"
      title="ยังไม่มีโพสต์"
      description="เริ่มต้นแชร์ความรู้กับชุมชน"
      actionText="✍️ สร้างโพสต์แรก"
      @action="showPostModal = true"
    />

    <!-- Posts List -->
    <div class="posts-list" v-else>
      <PostCard 
        v-for="post in filteredPosts"
        :key="post.id"
        :post="post"
        @react="handleReaction"
        @comment="handleComment"
        @share="handleShare"
      />
    </div>

    <!-- Create Post Modal -->
    <Teleport to="body">
      <div v-if="showPostModal" class="modal-overlay" @click.self="closePostModal">
        <div class="modal post-modal">
          <div class="modal-header">
            <h2>✍️ สร้างโพสต์ใหม่</h2>
            <button class="close-btn" @click="closePostModal">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>ประเภทโพสต์</label>
              <select v-model="newPost.type">
                <option value="discussion">💬 การสนทนา</option>
                <option value="question">❓ คำถาม</option>
                <option value="achievement">🏆 ความสำเร็จ</option>
                <option value="resource">📚 แหล่งข้อมูล</option>
              </select>
            </div>

            <div class="form-group">
              <label>เนื้อหา *</label>
              <textarea 
                v-model="newPost.content"
                placeholder="แชร์ความคิด คำถาม หรือความรู้ของคุณ..."
                rows="5"
              ></textarea>
            </div>

            <div class="form-group">
              <label>กลุ่ม (ไม่บังคับ)</label>
              <select v-model="newPost.groupId">
                <option value="">📢 โพสต์สาธารณะ</option>
                <option v-for="group in myGroups" :key="group.id" :value="group.id">
                  {{ group.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>แท็ก</label>
              <input 
                type="text" 
                v-model="newPost.tags"
                placeholder="เช่น: การเรียนรู้, เทคนิค, HOTS"
              >
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="closePostModal">ยกเลิก</button>
            <button 
              class="btn-primary"
              @click="createPost"
              :disabled="!newPost.content || posting"
            >
              {{ posting ? 'กำลังโพสต์...' : '📤 โพสต์' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import EmptyState from '@/components/EmptyState.vue'
import PostCard from '@/components/social/PostCard.vue'

const authStore = useAuthStore()
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'

// State
const loading = ref(true)
const posts = ref([])
const myGroups = ref([])
const activeTab = ref('all')

// Modal
const showPostModal = ref(false)
const posting = ref(false)
const newPost = ref({
  type: 'discussion',
  content: '',
  groupId: '',
  tags: ''
})

// Tabs
const tabs = [
  { value: 'all', label: 'ทั้งหมด', icon: '🌐' },
  { value: 'following', label: 'ติดตาม', icon: '👥' },
  { value: 'discussion', label: 'การสนทนา', icon: '💬' },
  { value: 'question', label: 'คำถาม', icon: '❓' },
  { value: 'achievement', label: 'ความสำเร็จ', icon: '🏆' }
]

// Computed
const filteredPosts = computed(() => {
  if (activeTab.value === 'all') return posts.value
  if (activeTab.value === 'following') {
    // Filter posts from followed users (mock for now)
    return posts.value.slice(0, 5)
  }
  return posts.value.filter(p => p.type === activeTab.value)
})

// Methods
async function loadFeed() {
  loading.value = true
  try {
    // Load posts
    const response = await fetch(`${FUNCTIONS_URL}/getFeed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: authStore.user.uid,
        limit: 50
      })
    })
    
    const data = await response.json()
    if (data.success) {
      posts.value = data.posts
    }
    
    // Load user's groups
    const groupsQuery = query(
      collection(db, 'groups'),
      where('memberIds', 'array-contains', authStore.user.uid)
    )
    const groupsSnapshot = await getDocs(groupsQuery)
    myGroups.value = groupsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (error) {
    console.error('Error loading feed:', error)
  } finally {
    loading.value = false
  }
}

function closePostModal() {
  showPostModal.value = false
  newPost.value = {
    type: 'discussion',
    content: '',
    groupId: '',
    tags: ''
  }
}

async function createPost() {
  if (!newPost.value.content || posting.value) return
  
  posting.value = true
  try {
    const response = await fetch(`${FUNCTIONS_URL}/createPost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorId: authStore.user.uid,
        authorName: authStore.user.displayName,
        authorPhoto: authStore.user.photoURL,
        type: newPost.value.type,
        content: newPost.value.content,
        groupId: newPost.value.groupId || null,
        tags: newPost.value.tags.split(',').map(t => t.trim()).filter(Boolean)
      })
    })
    
    const data = await response.json()
    if (data.success) {
      closePostModal()
      await loadFeed()
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.error)
    }
  } catch (error) {
    console.error('Error creating post:', error)
    alert('เกิดข้อผิดพลาด')
  } finally {
    posting.value = false
  }
}

async function handleReaction(postId, reactionType) {
  try {
    await addDoc(collection(db, 'reactions'), {
      postId,
      userId: authStore.user.uid,
      type: reactionType,
      createdAt: serverTimestamp()
    })
    
    // Update local state
    const post = posts.value.find(p => p.id === postId)
    if (post) {
      post.reactionCount = (post.reactionCount || 0) + 1
    }
  } catch (error) {
    console.error('Error reacting:', error)
  }
}

async function handleComment(postId, commentText) {
  try {
    await addDoc(collection(db, 'comments'), {
      postId,
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName,
      authorPhoto: authStore.user.photoURL,
      content: commentText,
      createdAt: serverTimestamp()
    })
    
    // Update local state
    const post = posts.value.find(p => p.id === postId)
    if (post) {
      post.commentCount = (post.commentCount || 0) + 1
    }
  } catch (error) {
    console.error('Error commenting:', error)
  }
}

function handleShare(postId) {
  const url = `${window.location.origin}/feed?post=${postId}`
  navigator.clipboard.writeText(url)
  alert('✅ คัดลอกลิงก์แล้ว')
}

onMounted(loadFeed)
</script>

<style scoped>
.feed-view {
  max-width: 700px;
  margin: 0 auto;
  padding: 20px;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 1.5rem;
}

.btn-create {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

/* Tabs */
.feed-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.tab-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  background: var(--card-bg);
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.9rem;
}

.tab-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* Posts List */
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: var(--card-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group select,
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
}

.form-group textarea {
  resize: vertical;
}

.btn-primary {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.5;
}

.btn-secondary {
  padding: 10px 20px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
}
</style>
