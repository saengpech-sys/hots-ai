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

    <!-- Empty State for Following Tab -->
    <EmptyState 
      v-else-if="activeTab === 'following' && followingIds.length === 0"
      icon="👥"
      title="ยังไม่ได้ติดตามใคร"
      description="ติดตามเพื่อนเพื่อดูโพสต์ของพวกเขา"
      actionText="🌐 ดูโพสต์ทั้งหมด"
      @action="activeTab = 'all'"
    />

    <!-- Empty State for No Posts -->
    <EmptyState 
      v-else-if="filteredPosts.length === 0 && activeTab === 'following'"
      icon="📭"
      title="ยังไม่มีโพสต์จากคนที่ติดตาม"
      description="คนที่คุณติดตามยังไม่ได้โพสต์อะไร"
      actionText="🌐 ดูโพสต์ทั้งหมด"
      @action="activeTab = 'all'"
    />

    <!-- General Empty State -->
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
        @delete="handleDelete"
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
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, limit, deleteDoc, doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import EmptyState from '@/components/EmptyState.vue'
import PostCard from '@/components/social/PostCard.vue'

const authStore = useAuthStore()

// State
const loading = ref(true)
const posts = ref([])
const myGroups = ref([])
const activeTab = ref('all')
const followingIds = ref([])  // List of user IDs that current user follows

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
    // Filter posts from followed users
    if (followingIds.value.length === 0) return []
    return posts.value.filter(p => followingIds.value.includes(p.authorId))
  }
  return posts.value.filter(p => p.type === activeTab.value)
})

// Methods
async function loadFollowing() {
  if (!authStore.user?.uid) return
  
  try {
    const followQuery = query(
      collection(db, 'following'),
      where('followerId', '==', authStore.user.uid)
    )
    const snapshot = await getDocs(followQuery)
    followingIds.value = snapshot.docs.map(d => d.data().followingId)
  } catch (error) {
    console.error('Error loading following:', error)
  }
}

async function loadFeed() {
  loading.value = true
  try {
    // Load who the user is following
    await loadFollowing()
    
    // Load posts directly from Firestore
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc')
    )
    const postsSnapshot = await getDocs(postsQuery)
    posts.value = postsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    
    // Load user's groups
    try {
      const groupsQuery = query(
        collection(db, 'groups'),
        where('memberIds', 'array-contains', authStore.user.uid)
      )
      const groupsSnapshot = await getDocs(groupsQuery)
      myGroups.value = groupsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (e) {
      console.log('No groups found')
    }
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
    // Create post directly in Firestore
    await addDoc(collection(db, 'posts'), {
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName || 'ผู้ใช้',
      authorPhoto: authStore.user.photoURL,
      type: newPost.value.type,
      content: newPost.value.content,
      groupId: newPost.value.groupId || null,
      tags: newPost.value.tags.split(',').map(t => t.trim()).filter(Boolean),
      reactionCount: 0,
      commentCount: 0,
      createdAt: serverTimestamp()
    })
    
    closePostModal()
    await loadFeed()
    alert('✅ โพสต์สำเร็จ!')
  } catch (error) {
    console.error('Error creating post:', error)
    alert('เกิดข้อผิดพลาด: ' + error.message)
  } finally {
    posting.value = false
  }
}

async function handleReaction(postId, reactionType) {
  try {
    const post = posts.value.find(p => p.id === postId)
    if (!post) return
    
    if (reactionType === 'like') {
      // Check if already liked (prevent duplicate)
      const existingQuery = query(
        collection(db, 'reactions'),
        where('postId', '==', postId),
        where('userId', '==', authStore.user.uid)
      )
      const existingSnapshot = await getDocs(existingQuery)
      
      // If already liked, don't add again
      if (!existingSnapshot.empty) {
        console.log('Already liked this post')
        return
      }
      
      // Add reaction
      await addDoc(collection(db, 'reactions'), {
        postId,
        userId: authStore.user.uid,
        type: 'like',
        createdAt: serverTimestamp()
      })
      
      // Update post reaction count
      await updateDoc(doc(db, 'posts', postId), {
        reactionCount: increment(1)
      })
      
      post.reactionCount = (post.reactionCount || 0) + 1
    } else {
      // Remove reaction - find and delete
      const reactionsQuery = query(
        collection(db, 'reactions'),
        where('postId', '==', postId),
        where('userId', '==', authStore.user.uid)
      )
      const snapshot = await getDocs(reactionsQuery)
      
      // Only decrement if actually had a reaction
      if (snapshot.empty) {
        console.log('No reaction to remove')
        return
      }
      
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'reactions', docSnap.id))
      }
      
      // Update post reaction count
      await updateDoc(doc(db, 'posts', postId), {
        reactionCount: increment(-1)
      })
      
      post.reactionCount = Math.max(0, (post.reactionCount || 0) - 1)
    }
  } catch (error) {
    console.error('Error reacting:', error)
  }
}

async function handleComment(postId, commentText, parentId = null) {
  try {
    await addDoc(collection(db, 'comments'), {
      postId,
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName,
      authorPhoto: authStore.user.photoURL,
      content: commentText,
      parentId: parentId,
      createdAt: serverTimestamp()
    })
    
    // Update post comment count in Firestore
    await updateDoc(doc(db, 'posts', postId), {
      commentCount: increment(1)
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

async function handleDelete(postId) {
  try {
    // Delete the post
    await deleteDoc(doc(db, 'posts', postId))
    
    // Delete associated comments
    const commentsQuery = query(collection(db, 'comments'), where('postId', '==', postId))
    const commentsSnapshot = await getDocs(commentsQuery)
    for (const docSnap of commentsSnapshot.docs) {
      await deleteDoc(doc(db, 'comments', docSnap.id))
    }
    
    // Delete associated reactions
    const reactionsQuery = query(collection(db, 'reactions'), where('postId', '==', postId))
    const reactionsSnapshot = await getDocs(reactionsQuery)
    for (const docSnap of reactionsSnapshot.docs) {
      await deleteDoc(doc(db, 'reactions', docSnap.id))
    }
    
    // Remove from local state
    posts.value = posts.value.filter(p => p.id !== postId)
    
    alert('✅ ลบโพสต์สำเร็จ')
  } catch (error) {
    console.error('Error deleting post:', error)
    alert('เกิดข้อผิดพลาดในการลบโพสต์')
  }
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
  color: var(--text-primary);
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
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 1rem;
}

.form-group select {
  cursor: pointer;
}

.form-group select option {
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 8px;
}

.form-group textarea {
  resize: vertical;
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
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
