<template>
  <div class="learning-community-hub">
    <!-- Hero Section -->
    <div class="hero-section">
      <div class="hero-content">
        <h1>🌟 Learning Community Hub</h1>
        <p class="hero-subtitle">ศูนย์กลางการเรียนรู้ร่วมกัน - ช่วยเหลือ แบ่งปัน เติบโต</p>
        
        <div class="quick-stats">
          <div class="stat-item">
            <span class="stat-value">{{ stats.activeMembers }}</span>
            <span class="stat-label">สมาชิกออนไลน์</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.todayPosts }}</span>
            <span class="stat-label">โพสต์วันนี้</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.helpRequests }}</span>
            <span class="stat-label">ขอความช่วยเหลือ</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.studyGroups }}</span>
            <span class="stat-label">กลุ่มเรียน</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Quick Actions -->
      <div class="quick-actions">
        <h2>⚡ ดำเนินการด่วน</h2>
        <div class="action-grid">
          <button class="action-card" @click="goTo('/community/help')">
            <span class="action-icon">🆘</span>
            <span class="action-label">ขอความช่วยเหลือ</span>
            <span class="action-count" v-if="pendingHelp > 0">{{ pendingHelp }}</span>
          </button>
          
          <button class="action-card" @click="goTo('/community/study-groups')">
            <span class="action-icon">👥</span>
            <span class="action-label">เข้าร่วมกลุ่มเรียน</span>
          </button>
          
          <button class="action-card" @click="goTo('/community/mentors')">
            <span class="action-icon">🎓</span>
            <span class="action-label">ค้นหาพี่เลี้ยง</span>
          </button>
          
          <button class="action-card" @click="goTo('/social/peer-review')">
            <span class="action-icon">📝</span>
            <span class="action-label">Peer Review</span>
            <span class="action-count" v-if="pendingReviews > 0">{{ pendingReviews }}</span>
          </button>
          
          <button class="action-card" @click="goTo('/social/collaborative')">
            <span class="action-icon">🤝</span>
            <span class="action-label">งานกลุ่ม</span>
            <span class="action-count" v-if="activeTasks > 0">{{ activeTasks }}</span>
          </button>
          
          <button class="action-card" @click="goTo('/community/gallery')">
            <span class="action-icon">🖼️</span>
            <span class="action-label">ผลงานดีเด่น</span>
          </button>
        </div>
      </div>

      <!-- Two Column Layout -->
      <div class="content-columns">
        <!-- Left Column - Feed -->
        <div class="left-column">
          <!-- Create Post -->
          <div class="create-post-section">
            <div class="create-prompt" @click="showCreatePost = true">
              <img :src="userPhoto" class="user-avatar" alt="avatar">
              <span class="prompt-text">แบ่งปันอะไรกับชุมชน?</span>
            </div>
            
            <div class="post-type-buttons">
              <button @click="createPostType('question')">❓ ถามคำถาม</button>
              <button @click="createPostType('share')">📢 แบ่งปัน</button>
              <button @click="createPostType('help')">🆘 ขอช่วย</button>
            </div>
          </div>

          <!-- Feed Filter -->
          <div class="feed-filter">
            <button 
              v-for="filter in feedFilters"
              :key="filter.value"
              :class="['filter-btn', { active: activeFilter === filter.value }]"
              @click="activeFilter = filter.value"
            >
              {{ filter.icon }} {{ filter.label }}
            </button>
          </div>

          <!-- Posts Feed -->
          <div class="posts-feed">
            <div v-if="loadingFeed" class="loading-state">
              <div class="spinner"></div>
            </div>
            
            <div v-else-if="posts.length === 0" class="empty-feed">
              <span class="empty-icon">📭</span>
              <p>ยังไม่มีโพสต์ในหมวดนี้</p>
            </div>
            
            <div 
              v-else
              v-for="post in posts"
              :key="post.id"
              class="post-card"
            >
              <div class="post-header">
                <img :src="post.authorPhoto || '/default-avatar.png'" class="author-avatar" alt="avatar">
                <div class="post-meta">
                  <span class="author-name">{{ post.authorName }}</span>
                  <div class="meta-line">
                    <span class="post-time">{{ formatTime(post.createdAt) }}</span>
                    <span class="post-type-badge" :class="post.type">{{ getTypeLabel(post.type) }}</span>
                  </div>
                </div>
              </div>
              
              <p class="post-content">{{ post.content }}</p>
              
              <div v-if="post.tags?.length" class="post-tags">
                <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
              
              <div class="post-actions">
                <button :class="['action-btn', { active: post.userLiked }]" @click="toggleLike(post)">
                  {{ post.userLiked ? '❤️' : '🤍' }} {{ post.likes || 0 }}
                </button>
                <button class="action-btn" @click="openComments(post)">
                  💬 {{ post.commentCount || 0 }}
                </button>
                <button class="action-btn" @click="sharePost(post)">
                  🔗 แชร์
                </button>
                <button v-if="post.type === 'help'" class="help-btn" @click="offerHelp(post)">
                  🤝 ช่วยเหลือ
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column - Sidebar -->
        <div class="right-column">
          <!-- My Groups -->
          <div class="sidebar-section">
            <h3>📚 กลุ่มของฉัน</h3>
            <div class="my-groups">
              <div 
                v-for="group in myGroups"
                :key="group.id"
                class="group-item"
                @click="goTo(`/community/study-groups/${group.id}`)"
              >
                <span class="group-icon">{{ group.icon || '📖' }}</span>
                <div class="group-info">
                  <span class="group-name">{{ group.name }}</span>
                  <span class="group-members">{{ group.memberCount }} สมาชิก</span>
                </div>
                <span v-if="group.unread" class="unread-badge">{{ group.unread }}</span>
              </div>
              
              <button class="browse-groups-btn" @click="goTo('/community/study-groups')">
                + ค้นหากลุ่มเพิ่มเติม
              </button>
            </div>
          </div>

          <!-- Active Discussions -->
          <div class="sidebar-section">
            <h3>🔥 กระทู้ยอดนิยม</h3>
            <div class="trending-posts">
              <div 
                v-for="trending in trendingPosts"
                :key="trending.id"
                class="trending-item"
                @click="viewPost(trending)"
              >
                <span class="trending-rank">{{ trending.rank }}</span>
                <div class="trending-info">
                  <span class="trending-title">{{ trending.title }}</span>
                  <span class="trending-meta">
                    💬 {{ trending.comments }} • ❤️ {{ trending.likes }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Top Contributors -->
          <div class="sidebar-section">
            <h3>⭐ ผู้ช่วยเหลือดีเด่น</h3>
            <div class="top-contributors">
              <div 
                v-for="(contributor, index) in topContributors"
                :key="contributor.id"
                class="contributor-item"
              >
                <span class="rank-badge" :class="`rank-${index + 1}`">{{ index + 1 }}</span>
                <img :src="contributor.photoURL || '/default-avatar.png'" class="contributor-avatar" alt="avatar">
                <div class="contributor-info">
                  <span class="contributor-name">{{ contributor.name }}</span>
                  <span class="contributor-stats">
                    {{ contributor.helpCount }} ช่วยเหลือ • {{ contributor.points }} คะแนน
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Learning Challenges -->
          <div class="sidebar-section challenges">
            <h3>🎯 ท้าทายประจำสัปดาห์</h3>
            <div class="challenge-card">
              <span class="challenge-icon">🏆</span>
              <div class="challenge-content">
                <span class="challenge-title">{{ weeklyChallenge.title }}</span>
                <p class="challenge-desc">{{ weeklyChallenge.description }}</p>
                <div class="challenge-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: `${weeklyChallenge.progress}%` }"></div>
                  </div>
                  <span class="progress-text">{{ weeklyChallenge.progress }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Post Modal -->
    <div v-if="showCreatePost" class="modal-overlay" @click.self="showCreatePost = false">
      <div class="create-modal">
        <div class="modal-header">
          <h3>✏️ สร้างโพสต์ใหม่</h3>
          <button @click="showCreatePost = false" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="post-type-selector">
            <button 
              v-for="type in postTypes"
              :key="type.value"
              :class="['type-btn', { active: newPost.type === type.value }]"
              @click="newPost.type = type.value"
            >
              {{ type.icon }} {{ type.label }}
            </button>
          </div>
          
          <textarea 
            v-model="newPost.content"
            :placeholder="getPlaceholder(newPost.type)"
            class="post-textarea"
          ></textarea>
          
          <div class="tag-input">
            <span class="tag-icon">🏷️</span>
            <input 
              v-model="tagInput"
              @keydown.enter.prevent="addTag"
              placeholder="เพิ่มแท็ก (กด Enter)"
            >
          </div>
          
          <div v-if="newPost.tags.length" class="selected-tags">
            <span 
              v-for="tag in newPost.tags"
              :key="tag"
              class="selected-tag"
            >
              {{ tag }}
              <button @click="removeTag(tag)">×</button>
            </span>
          </div>
        </div>
        
        <div class="modal-footer">
          <label class="anonymous-check">
            <input type="checkbox" v-model="newPost.anonymous">
            โพสต์แบบไม่ระบุตัวตน
          </label>
          <button class="post-btn" @click="submitPost" :disabled="!newPost.content.trim()">
            โพสต์
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { collection, query, where, getDocs, addDoc, orderBy, limit, Timestamp, doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '@/firebase/config'

const router = useRouter()
const authStore = useAuthStore()

// State
const loadingFeed = ref(true)
const activeFilter = ref('all')
const showCreatePost = ref(false)
const tagInput = ref('')

const stats = ref({
  activeMembers: 0,
  todayPosts: 0,
  helpRequests: 0,
  studyGroups: 0
})

const pendingHelp = ref(0)
const pendingReviews = ref(0)
const activeTasks = ref(0)

const posts = ref([])
const myGroups = ref([])
const trendingPosts = ref([])
const topContributors = ref([])

const weeklyChallenge = ref({
  title: 'ช่วยเหลือเพื่อน 5 คน',
  description: 'ตอบคำถามหรือช่วยเหลือเพื่อนในชุมชน 5 ครั้ง',
  progress: 40
})

const newPost = ref({
  type: 'share',
  content: '',
  tags: [],
  anonymous: false
})

// Constants
const feedFilters = [
  { value: 'all', icon: '🌐', label: 'ทั้งหมด' },
  { value: 'question', icon: '❓', label: 'คำถาม' },
  { value: 'share', icon: '📢', label: 'แบ่งปัน' },
  { value: 'help', icon: '🆘', label: 'ขอช่วย' },
  { value: 'achievement', icon: '🏆', label: 'ความสำเร็จ' }
]

const postTypes = [
  { value: 'question', icon: '❓', label: 'ถามคำถาม' },
  { value: 'share', icon: '📢', label: 'แบ่งปัน' },
  { value: 'help', icon: '🆘', label: 'ขอความช่วยเหลือ' },
  { value: 'achievement', icon: '🏆', label: 'แชร์ความสำเร็จ' }
]

// Computed
const userPhoto = computed(() => authStore.user?.photoURL || '/default-avatar.png')

// Methods
function goTo(path) {
  router.push(path)
}

function getTypeLabel(type) {
  const labels = {
    question: '❓ คำถาม',
    share: '📢 แบ่งปัน',
    help: '🆘 ขอช่วย',
    achievement: '🏆 สำเร็จ'
  }
  return labels[type] || type
}

function getPlaceholder(type) {
  const placeholders = {
    question: 'ถามคำถามที่อยากรู้...',
    share: 'แบ่งปันสิ่งที่เรียนรู้หรือประสบการณ์...',
    help: 'อธิบายปัญหาที่ต้องการความช่วยเหลือ...',
    achievement: 'แชร์ความสำเร็จของคุณ...'
  }
  return placeholders[type] || 'เขียนอะไรสักอย่าง...'
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate?.() || new Date(timestamp)
  const now = new Date()
  const diff = (now - date) / 1000
  
  if (diff < 60) return 'เมื่อกี้'
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`
  if (diff < 604800) return `${Math.floor(diff / 86400)} วันที่แล้ว`
  
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function createPostType(type) {
  newPost.value.type = type
  showCreatePost.value = true
}

function addTag() {
  const tag = tagInput.value.trim()
  if (tag && !newPost.value.tags.includes(tag)) {
    newPost.value.tags.push(tag)
  }
  tagInput.value = ''
}

function removeTag(tag) {
  newPost.value.tags = newPost.value.tags.filter(t => t !== tag)
}

async function toggleLike(post) {
  try {
    const postRef = doc(db, 'communityPosts', post.id)
    if (post.userLiked) {
      await updateDoc(postRef, { likes: increment(-1) })
      post.likes--
      post.userLiked = false
    } else {
      await updateDoc(postRef, { likes: increment(1) })
      post.likes++
      post.userLiked = true
    }
  } catch (error) {
    console.error('Error toggling like:', error)
  }
}

function openComments(post) {
  // Open comments modal or navigate
  router.push(`/community/post/${post.id}`)
}

function sharePost(post) {
  // Share functionality
  navigator.clipboard.writeText(`${window.location.origin}/community/post/${post.id}`)
  alert('คัดลอกลิงก์แล้ว!')
}

function offerHelp(post) {
  // Navigate to help request
  router.push(`/community/help?post=${post.id}`)
}

function viewPost(post) {
  router.push(`/community/post/${post.id}`)
}

async function submitPost() {
  if (!newPost.value.content.trim()) return
  
  try {
    await addDoc(collection(db, 'communityPosts'), {
      type: newPost.value.type,
      content: newPost.value.content,
      tags: newPost.value.tags,
      anonymous: newPost.value.anonymous,
      authorId: authStore.user?.uid,
      authorName: newPost.value.anonymous ? 'ไม่ระบุตัวตน' : authStore.userProfile?.displayName,
      authorPhoto: newPost.value.anonymous ? null : authStore.user?.photoURL,
      likes: 0,
      commentCount: 0,
      createdAt: Timestamp.now()
    })
    
    showCreatePost.value = false
    newPost.value = { type: 'share', content: '', tags: [], anonymous: false }
    
    await loadPosts()
  } catch (error) {
    console.error('Error creating post:', error)
  }
}

async function loadPosts() {
  loadingFeed.value = true
  try {
    let q = query(
      collection(db, 'communityPosts'),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    
    if (activeFilter.value !== 'all') {
      q = query(
        collection(db, 'communityPosts'),
        where('type', '==', activeFilter.value),
        orderBy('createdAt', 'desc'),
        limit(20)
      )
    }
    
    const snapshot = await getDocs(q)
    posts.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading posts:', error)
  } finally {
    loadingFeed.value = false
  }
}

async function loadStats() {
  // Load community statistics
  stats.value = {
    activeMembers: 42,
    todayPosts: 15,
    helpRequests: 8,
    studyGroups: 12
  }
  
  pendingHelp.value = 3
  pendingReviews.value = 5
  activeTasks.value = 2
}

async function loadMyGroups() {
  // Load user's groups
  myGroups.value = [
    { id: '1', name: 'กลุ่มคณิตศาสตร์ ม.3', icon: '📐', memberCount: 15, unread: 3 },
    { id: '2', name: 'วิทยาศาสตร์พื้นฐาน', icon: '🔬', memberCount: 22, unread: 0 },
    { id: '3', name: 'เตรียมสอบ O-NET', icon: '📚', memberCount: 45, unread: 8 }
  ]
}

async function loadTrending() {
  trendingPosts.value = [
    { id: '1', rank: 1, title: 'วิธีจำสูตรฟิสิกส์แบบง่ายๆ', comments: 45, likes: 128 },
    { id: '2', rank: 2, title: 'ทำไม DNA ถึงสำคัญ?', comments: 32, likes: 89 },
    { id: '3', rank: 3, title: 'เทคนิคทำโจทย์คณิตเร็ว', comments: 28, likes: 76 }
  ]
}

async function loadTopContributors() {
  topContributors.value = [
    { id: '1', name: 'พี่เอ็ม', photoURL: null, helpCount: 45, points: 1250 },
    { id: '2', name: 'น้องบีม', photoURL: null, helpCount: 38, points: 980 },
    { id: '3', name: 'เจน', photoURL: null, helpCount: 32, points: 840 }
  ]
}

onMounted(async () => {
  await Promise.all([
    loadStats(),
    loadPosts(),
    loadMyGroups(),
    loadTrending(),
    loadTopContributors()
  ])
})
</script>

<style scoped>
.learning-community-hub {
  min-height: 100vh;
  background: var(--bg-primary);
}

/* Hero Section */
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  color: white;
}

.hero-content {
  max-width: 1200px;
  margin: 0 auto;
}

.hero-content h1 {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
}

.hero-subtitle {
  margin: 0 0 1.5rem 0;
  opacity: 0.9;
}

.quick-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.85rem;
  opacity: 0.9;
}

/* Main Content */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
}

/* Quick Actions */
.quick-actions {
  margin-bottom: 2rem;
}

.quick-actions h2 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem 1rem;
  background: var(--bg-secondary);
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.action-icon {
  font-size: 2rem;
}

.action-label {
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
}

.action-count {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: #ef4444;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 10px;
}

/* Content Columns */
.content-columns {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 2rem;
}

@media (max-width: 900px) {
  .content-columns {
    grid-template-columns: 1fr;
  }
  
  .right-column {
    order: -1;
  }
}

/* Create Post */
.create-post-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.create-prompt {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border-radius: 25px;
  cursor: pointer;
  margin-bottom: 0.75rem;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.prompt-text {
  color: var(--text-secondary);
  flex: 1;
}

.post-type-buttons {
  display: flex;
  justify-content: space-around;
}

.post-type-buttons button {
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 8px;
  font-size: 0.85rem;
}

.post-type-buttons button:hover {
  background: var(--bg-tertiary);
}

/* Feed Filter */
.feed-filter {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.filter-btn {
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.85rem;
}

.filter-btn.active {
  background: var(--primary-color);
  color: white;
}

/* Posts Feed */
.loading-state {
  text-align: center;
  padding: 2rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-feed {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.5rem;
}

.posts-feed {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.post-card {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1rem;
}

.post-header {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.author-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
}

.post-meta {
  flex: 1;
}

.author-name {
  display: block;
  font-weight: 600;
}

.meta-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.post-time {
  color: var(--text-secondary);
}

.post-type-badge {
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 0.7rem;
}

.post-type-badge.question { background: #dbeafe; color: #1e40af; }
.post-type-badge.share { background: #dcfce7; color: #166534; }
.post-type-badge.help { background: #fee2e2; color: #991b1b; }
.post-type-badge.achievement { background: #fef3c7; color: #92400e; }

.post-content {
  margin: 0 0 0.75rem 0;
  line-height: 1.6;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.tag {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  background: var(--bg-tertiary);
  border-radius: 10px;
  color: var(--text-secondary);
}

.post-actions {
  display: flex;
  gap: 0.5rem;
  border-top: 1px solid var(--border-color);
  padding-top: 0.75rem;
}

.action-btn {
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.action-btn:hover {
  background: var(--bg-tertiary);
}

.action-btn.active {
  color: #ef4444;
}

.help-btn {
  padding: 0.5rem 1rem;
  background: #dcfce7;
  color: #166534;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-left: auto;
  font-weight: 600;
  font-size: 0.85rem;
}

/* Sidebar */
.sidebar-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.sidebar-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
}

/* My Groups */
.my-groups {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border-radius: 12px;
  cursor: pointer;
}

.group-item:hover {
  background: var(--bg-tertiary);
}

.group-icon {
  font-size: 1.5rem;
}

.group-info {
  flex: 1;
}

.group-name {
  display: block;
  font-weight: 500;
  font-size: 0.9rem;
}

.group-members {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.unread-badge {
  background: var(--primary-color);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
}

.browse-groups-btn {
  width: 100%;
  padding: 0.75rem;
  background: transparent;
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

/* Trending */
.trending-posts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.trending-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 8px;
}

.trending-item:hover {
  background: var(--bg-tertiary);
}

.trending-rank {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary-color);
  width: 24px;
}

.trending-info {
  flex: 1;
}

.trending-title {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
}

.trending-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Top Contributors */
.top-contributors {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.contributor-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.rank-badge {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
}

.rank-badge.rank-1 { background: #fef3c7; color: #92400e; }
.rank-badge.rank-2 { background: #e5e7eb; color: #374151; }
.rank-badge.rank-3 { background: #fcd7bd; color: #7c2d12; }

.contributor-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.contributor-info {
  flex: 1;
}

.contributor-name {
  display: block;
  font-weight: 500;
  font-size: 0.9rem;
}

.contributor-stats {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Challenge */
.challenge-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
}

.challenge-icon {
  font-size: 2rem;
}

.challenge-content {
  flex: 1;
}

.challenge-title {
  display: block;
  font-weight: 700;
  color: #92400e;
  margin-bottom: 0.25rem;
}

.challenge-desc {
  font-size: 0.85rem;
  color: #78350f;
  margin: 0 0 0.75rem 0;
}

.challenge-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.challenge-progress .progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,0.5);
  border-radius: 4px;
  overflow: hidden;
}

.challenge-progress .progress-fill {
  height: 100%;
  background: #f59e0b;
  border-radius: 4px;
}

.progress-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: #92400e;
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
  padding: 1rem;
}

.create-modal {
  background: var(--bg-primary);
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.25rem;
}

.modal-body {
  padding: 1.5rem;
}

.post-type-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.type-btn {
  flex: 1;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8rem;
}

.type-btn.active {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

.post-textarea {
  width: 100%;
  min-height: 120px;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  resize: vertical;
  background: var(--bg-secondary);
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.tag-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 0.75rem;
}

.tag-icon {
  font-size: 1.25rem;
}

.tag-input input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  color: var(--text-primary);
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.selected-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--primary-light);
  color: var(--primary-color);
  border-radius: 15px;
  font-size: 0.85rem;
}

.selected-tag button {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
}

.anonymous-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.post-btn {
  padding: 0.75rem 2rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
}

.post-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
