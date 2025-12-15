<template>
  <div class="teacher-hub">
    <!-- Header -->
    <div class="page-header">
      <h1>👩‍🏫 ชุมชนครู (PLC)</h1>
      <p class="subtitle">แลกเปลี่ยนเรียนรู้ ร่วมพัฒนาการสอน</p>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <router-link to="/plc/lesson-library" class="action-card">
        <span class="action-icon">📚</span>
        <span class="action-title">คลังแผนการสอน</span>
        <span class="action-count">{{ stats.lessonPlans }} แผน</span>
      </router-link>
      <router-link to="/plc/question-collab" class="action-card">
        <span class="action-icon">💡</span>
        <span class="action-title">ร่วมสร้างคำถาม</span>
        <span class="action-count">{{ stats.questions }} คำถาม</span>
      </router-link>
      <router-link to="/plc/strategies" class="action-card">
        <span class="action-icon">🎯</span>
        <span class="action-title">กลยุทธ์การสอน</span>
        <span class="action-count">{{ stats.strategies }} เทคนิค</span>
      </router-link>
      <router-link to="/plc/insights" class="action-card">
        <span class="action-icon">📊</span>
        <span class="action-title">ข้อค้นพบจากข้อมูล</span>
        <span class="action-count">{{ stats.insights }} ข้อค้นพบ</span>
      </router-link>
    </div>

    <!-- Main Layout -->
    <div class="main-layout">
      <!-- Left Content -->
      <div class="content-area">
        <!-- Tabs -->
        <div class="content-tabs">
          <button 
            :class="['tab', { active: activeTab === 'feed' }]"
            @click="activeTab = 'feed'"
          >
            📰 ฟีด
          </button>
          <button 
            :class="['tab', { active: activeTab === 'discussions' }]"
            @click="activeTab = 'discussions'"
          >
            💬 สนทนา
          </button>
          <button 
            :class="['tab', { active: activeTab === 'resources' }]"
            @click="activeTab = 'resources'"
          >
            📁 ทรัพยากร
          </button>
        </div>

        <!-- Feed Tab -->
        <div v-if="activeTab === 'feed'" class="tab-content">
          <!-- Create Post -->
          <div class="create-post">
            <div class="post-input-area">
              <img :src="authStore.user?.photoURL || '/default-avatar.png'" class="user-avatar" />
              <textarea 
                v-model="newPost" 
                placeholder="แชร์ประสบการณ์, ถามคำถาม, หรือแลกเปลี่ยนไอเดีย..."
                rows="3"
              ></textarea>
            </div>
            <div class="post-tags-input">
              <input 
                v-model="newPostTags" 
                type="text" 
                placeholder="แท็ก (คั่นด้วย , เช่น HOTS, 5E, AI)"
                class="tags-input"
              />
            </div>
            <div class="post-actions">
              <div class="post-type-btns">
                <button :class="['type-btn', { active: postType === 'share' }]" @click="postType = 'share'">
                  💡 แชร์
                </button>
                <button :class="['type-btn', { active: postType === 'question' }]" @click="postType = 'question'">
                  ❓ ถาม
                </button>
                <button :class="['type-btn', { active: postType === 'resource' }]" @click="postType = 'resource'">
                  📎 แนบไฟล์
                </button>
              </div>
              <button class="btn-post" @click="createPost" :disabled="!newPost.trim()">
                โพสต์
              </button>
            </div>
          </div>

          <!-- Feed List -->
          <div class="feed-list">
            <div v-for="post in feedPosts" :key="post.id" class="feed-card">
              <div class="post-header">
                <img :src="post.authorPhoto || '/default-avatar.png'" class="author-avatar" />
                <div class="author-info">
                  <span class="author-name">{{ post.authorName }}</span>
                  <span class="author-school">{{ post.schoolName || 'โรงเรียน' }}</span>
                  <span class="post-time">{{ formatDate(post.createdAt) }}</span>
                </div>
                <span class="post-type-badge" :class="post.type">
                  {{ getTypeBadge(post.type) }}
                </span>
              </div>

              <div class="post-content">
                <p>{{ post.content }}</p>
              </div>

              <div class="post-tags" v-if="post.tags?.length">
                <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>

              <div class="post-stats">
                <button 
                  :class="['stat-btn', { active: post.isLiked }]" 
                  @click="toggleLike(post)"
                >
                  ❤️ {{ post.likesCount || 0 }}
                </button>
                <button class="stat-btn" @click="showComments(post)">
                  💬 {{ post.commentsCount || 0 }}
                </button>
                <button class="stat-btn" @click="sharePost(post)">
                  📤 แชร์
                </button>
              </div>

              <!-- Comments Preview -->
              <div class="comments-preview" v-if="post.showComments">
                <div v-for="comment in post.comments?.slice(0, 3)" :key="comment.id" class="comment">
                  <img :src="comment.authorPhoto || '/default-avatar.png'" class="comment-avatar" />
                  <div class="comment-bubble">
                    <span class="comment-author">{{ comment.authorName }}</span>
                    <p>{{ comment.content }}</p>
                  </div>
                </div>
                <div class="add-comment">
                  <input 
                    v-model="post.newComment" 
                    type="text" 
                    placeholder="แสดงความคิดเห็น..."
                    @keyup.enter="addComment(post)"
                  />
                  <button @click="addComment(post)">ส่ง</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Discussions Tab -->
        <div v-else-if="activeTab === 'discussions'" class="tab-content">
          <div class="section-header">
            <h3>💬 หัวข้อสนทนา</h3>
            <button class="btn-new" @click="showNewDiscussionModal = true">+ สร้างหัวข้อ</button>
          </div>

          <div class="discussions-list">
            <div v-for="disc in discussions" :key="disc.id" class="discussion-card" @click="viewDiscussion(disc)">
              <div class="disc-icon">{{ getDiscussionIcon(disc.category) }}</div>
              <div class="disc-content">
                <h4>{{ disc.title }}</h4>
                <p class="disc-excerpt">{{ truncateText(disc.content, 100) }}</p>
                <div class="disc-meta">
                  <span class="disc-author">{{ disc.authorName }}</span>
                  <span class="disc-category">{{ disc.category }}</span>
                  <span class="disc-replies">💬 {{ disc.repliesCount || 0 }}</span>
                </div>
              </div>
              <div class="disc-stats">
                <span class="disc-views">👁️ {{ disc.viewsCount || 0 }}</span>
                <span class="disc-time">{{ formatDate(disc.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Resources Tab -->
        <div v-else-if="activeTab === 'resources'" class="tab-content">
          <div class="section-header">
            <h3>📁 ทรัพยากรที่แชร์</h3>
            <button class="btn-new" @click="showUploadModal = true">+ อัปโหลด</button>
          </div>

          <div class="resources-grid">
            <div v-for="res in resources" :key="res.id" class="resource-card">
              <div class="res-icon">{{ getResourceIcon(res.type) }}</div>
              <div class="res-info">
                <h4>{{ res.title }}</h4>
                <p>{{ res.description }}</p>
                <div class="res-meta">
                  <span>{{ res.authorName }}</span>
                  <span>{{ res.downloadsCount || 0 }} ดาวน์โหลด</span>
                </div>
              </div>
              <div class="res-actions">
                <button class="btn-download" @click="downloadResource(res)">⬇️</button>
                <button 
                  :class="['btn-bookmark', { active: res.isBookmarked }]"
                  @click="toggleBookmark(res)"
                >🔖</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Sidebar -->
      <div class="sidebar">
        <!-- My Groups -->
        <div class="sidebar-card">
          <h3>👥 กลุ่ม PLC ของฉัน</h3>
          <div class="groups-list">
            <div v-for="group in myGroups" :key="group.id" class="group-item" @click="viewGroup(group)">
              <span class="group-emoji">{{ group.emoji || '👥' }}</span>
              <div class="group-info">
                <span class="group-name">{{ group.name }}</span>
                <span class="group-members">{{ group.membersCount }} สมาชิก</span>
              </div>
            </div>
            <button class="btn-join-group" @click="showGroupsModal = true">+ เข้าร่วมกลุ่ม</button>
          </div>
        </div>

        <!-- Trending Topics -->
        <div class="sidebar-card">
          <h3>🔥 หัวข้อยอดนิยม</h3>
          <div class="trending-list">
            <div v-for="topic in trendingTopics" :key="topic.id" class="trending-item">
              <span class="trending-tag">#{{ topic.name }}</span>
              <span class="trending-count">{{ topic.count }} โพสต์</span>
            </div>
          </div>
        </div>

        <!-- Active Teachers -->
        <div class="sidebar-card">
          <h3>⭐ ครูที่แอคทีฟ</h3>
          <div class="teachers-list">
            <div v-for="teacher in activeTeachers" :key="teacher.id" class="teacher-item">
              <img :src="teacher.photoURL || '/default-avatar.png'" class="teacher-avatar" />
              <div class="teacher-info">
                <span class="teacher-name">{{ teacher.displayName }}</span>
                <span class="teacher-school">{{ teacher.schoolName || 'โรงเรียน' }}</span>
              </div>
              <button class="btn-follow" @click="followTeacher(teacher)">
                {{ teacher.isFollowing ? '✓' : '+' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- New Discussion Modal -->
    <div v-if="showNewDiscussionModal" class="modal-overlay" @click.self="showNewDiscussionModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>💬 สร้างหัวข้อสนทนาใหม่</h2>
          <button class="close-btn" @click="showNewDiscussionModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>หมวดหมู่</label>
            <select v-model="newDiscussion.category">
              <option value="teaching">🎓 เทคนิคการสอน</option>
              <option value="assessment">📝 การวัดประเมิน</option>
              <option value="technology">💻 เทคโนโลยี</option>
              <option value="classroom">🏫 การจัดการชั้นเรียน</option>
              <option value="general">💬 ทั่วไป</option>
            </select>
          </div>
          <div class="form-group">
            <label>หัวข้อ</label>
            <input v-model="newDiscussion.title" type="text" placeholder="หัวข้อที่ต้องการสนทนา" />
          </div>
          <div class="form-group">
            <label>รายละเอียด</label>
            <textarea v-model="newDiscussion.content" rows="5" placeholder="รายละเอียดเพิ่มเติม..."></textarea>
          </div>
          <div class="form-group">
            <label>แท็ก (คั่นด้วย ,)</label>
            <input v-model="newDiscussion.tags" type="text" placeholder="เช่น HOTS, 5E, ประเมิน" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showNewDiscussionModal = false">ยกเลิก</button>
          <button class="btn-submit" @click="createDiscussion">สร้างหัวข้อ</button>
        </div>
      </div>
    </div>

    <!-- Upload Resource Modal -->
    <div v-if="showUploadModal" class="modal-overlay" @click.self="showUploadModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>📁 อัปโหลดทรัพยากร</h2>
          <button class="close-btn" @click="showUploadModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>ชื่อทรัพยากร *</label>
            <input v-model="newResource.title" type="text" placeholder="ชื่อไฟล์หรือเอกสาร" />
          </div>
          <div class="form-group">
            <label>คำอธิบาย</label>
            <textarea v-model="newResource.description" rows="3" placeholder="อธิบายสั้นๆ เกี่ยวกับทรัพยากรนี้..."></textarea>
          </div>
          <div class="form-group">
            <label>ประเภท</label>
            <select v-model="newResource.type">
              <option value="pdf">📄 PDF</option>
              <option value="doc">📝 Word</option>
              <option value="ppt">📊 PowerPoint</option>
              <option value="video">🎬 วิดีโอ</option>
              <option value="link">🔗 ลิงก์</option>
            </select>
          </div>
          <div class="form-group">
            <label>ไฟล์ *</label>
            <div class="file-upload-area">
              <input type="file" id="file-upload" @change="handleFileSelect" style="display: none" />
              <label for="file-upload" class="file-upload-label">
                <span v-if="newResource.fileName">📎 {{ newResource.fileName }}</span>
                <span v-else>📤 คลิกเพื่อเลือกไฟล์</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showUploadModal = false">ยกเลิก</button>
          <button 
            class="btn-submit" 
            @click="uploadResource" 
            :disabled="isUploading || !newResource.title || !newResource.file"
          >
            {{ isUploading ? '⏳ กำลังอัปโหลด...' : '📤 อัปโหลด' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Groups Modal (Browse/Join) -->
    <div v-if="showGroupsModal" class="modal-overlay" @click.self="showGroupsModal = false">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>👥 กลุ่ม PLC</h2>
          <button class="close-btn" @click="showGroupsModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-actions-bar">
            <button class="btn-create" @click="showCreateGroupModal = true; showGroupsModal = false">
              ➕ สร้างกลุ่มใหม่
            </button>
          </div>
          
          <h4>🔍 กลุ่มที่เปิดรับสมัคร</h4>
          <div class="groups-browse-list">
            <div v-for="group in allGroups" :key="group.id" class="group-browse-item">
              <span class="group-emoji-large">{{ group.emoji || '👥' }}</span>
              <div class="group-browse-info">
                <span class="group-browse-name">{{ group.name }}</span>
                <span class="group-browse-desc">{{ group.description || 'ไม่มีคำอธิบาย' }}</span>
                <span class="group-browse-meta">
                  👤 {{ group.membersCount || 1 }} สมาชิก 
                  <span v-if="group.subject">• 📚 {{ group.subject }}</span>
                </span>
              </div>
              <button 
                v-if="!group.memberIds?.includes(authStore.user?.uid)"
                class="btn-join" 
                @click="joinGroup(group)"
              >
                เข้าร่วม
              </button>
              <button 
                v-else
                class="btn-leave" 
                @click="leaveGroup(group)"
              >
                ออกจากกลุ่ม
              </button>
            </div>
            <div v-if="allGroups.length === 0" class="empty-groups">
              <p>ยังไม่มีกลุ่ม PLC ที่เปิดรับสมัคร</p>
              <p>ลองสร้างกลุ่มใหม่เลย!</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Group Modal -->
    <div v-if="showCreateGroupModal" class="modal-overlay" @click.self="showCreateGroupModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>➕ สร้างกลุ่ม PLC ใหม่</h2>
          <button class="close-btn" @click="showCreateGroupModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>ไอคอน</label>
            <div class="emoji-picker">
              <button 
                v-for="emoji in ['👥', '📚', '🎯', '💡', '🔬', '📐', '🌍', '🎨', '🎵', '💻']" 
                :key="emoji"
                :class="['emoji-btn', { active: newGroup.emoji === emoji }]"
                @click="newGroup.emoji = emoji"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>ชื่อกลุ่ม *</label>
            <input v-model="newGroup.name" type="text" placeholder="เช่น กลุ่มครูคณิตศาสตร์" />
          </div>
          <div class="form-group">
            <label>คำอธิบาย</label>
            <textarea v-model="newGroup.description" rows="3" placeholder="อธิบายวัตถุประสงค์ของกลุ่ม..."></textarea>
          </div>
          <div class="form-group">
            <label>วิชา / สาระการเรียนรู้</label>
            <input v-model="newGroup.subject" type="text" placeholder="เช่น คณิตศาสตร์, วิทยาศาสตร์" />
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="newGroup.isPublic" />
              <span>เปิดให้ครูคนอื่นเข้าร่วมได้</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showCreateGroupModal = false">ยกเลิก</button>
          <button 
            class="btn-submit" 
            @click="createGroup" 
            :disabled="isCreatingGroup || !newGroup.name.trim()"
          >
            {{ isCreatingGroup ? '⏳ กำลังสร้าง...' : '✅ สร้างกลุ่ม' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  collection, query, where, orderBy, limit, 
  getDocs, addDoc, updateDoc, doc, serverTimestamp, increment, deleteDoc 
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'

const router = useRouter()
const authStore = useAuthStore()
const storage = getStorage()

// State
const activeTab = ref('feed')
const newPost = ref('')
const newPostTags = ref('')
const postType = ref('share')
const isUploading = ref(false)
const isCreatingGroup = ref(false)

// Data
const feedPosts = ref([])
const discussions = ref([])
const resources = ref([])
const myGroups = ref([])
const trendingTopics = ref([])
const activeTeachers = ref([])
const allGroups = ref([])

// Stats
const stats = reactive({
  lessonPlans: 0,
  questions: 0,
  strategies: 0,
  insights: 0
})

// Modals
const showNewDiscussionModal = ref(false)
const showUploadModal = ref(false)
const showGroupsModal = ref(false)
const showCreateGroupModal = ref(false)

const newDiscussion = reactive({
  category: 'teaching',
  title: '',
  content: '',
  tags: ''
})

const newResource = reactive({
  title: '',
  description: '',
  type: 'pdf',
  file: null,
  fileName: ''
})

const newGroup = reactive({
  name: '',
  description: '',
  emoji: '👥',
  subject: '',
  isPublic: true
})

// Methods
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  
  if (diff < 60) return 'เมื่อกี้'
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชม.ที่แล้ว`
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

const truncateText = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const getTypeBadge = (type) => {
  const badges = {
    share: '💡 แชร์',
    question: '❓ คำถาม',
    resource: '📎 ทรัพยากร'
  }
  return badges[type] || '📝 โพสต์'
}

const getDiscussionIcon = (category) => {
  const icons = {
    teaching: '🎓',
    assessment: '📝',
    technology: '💻',
    classroom: '🏫',
    general: '💬'
  }
  return icons[category] || '💬'
}

const getResourceIcon = (type) => {
  const icons = {
    pdf: '📄',
    doc: '📝',
    ppt: '📊',
    video: '🎬',
    link: '🔗'
  }
  return icons[type] || '📁'
}

// Actions
const createPost = async () => {
  if (!newPost.value.trim()) return
  
  try {
    // Parse tags
    const tags = newPostTags.value
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)
    
    await addDoc(collection(db, 'communityPosts'), {
      content: newPost.value,
      type: postType.value,
      tags: tags,
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName || 'ครู',
      authorPhoto: authStore.user.photoURL,
      communityType: 'teacher',
      likesCount: 0,
      commentsCount: 0,
      createdAt: serverTimestamp()
    })

    newPost.value = ''
    newPostTags.value = ''
    postType.value = 'share'
    loadFeed()
    loadTrending() // Update trending after new post
  } catch (error) {
    console.error('Error creating post:', error)
  }
}

const toggleLike = async (post) => {
  try {
    post.isLiked = !post.isLiked
    post.likesCount = post.isLiked ? (post.likesCount || 0) + 1 : Math.max(0, (post.likesCount || 1) - 1)
    
    await updateDoc(doc(db, 'communityPosts', post.id), {
      likesCount: increment(post.isLiked ? 1 : -1)
    })
  } catch (error) {
    console.error('Error toggling like:', error)
  }
}

const showComments = (post) => {
  post.showComments = !post.showComments
}

const addComment = async (post) => {
  if (!post.newComment?.trim()) return
  
  try {
    await addDoc(collection(db, 'communityPosts', post.id, 'comments'), {
      content: post.newComment,
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName || 'ครู',
      authorPhoto: authStore.user.photoURL,
      createdAt: serverTimestamp()
    })

    await updateDoc(doc(db, 'communityPosts', post.id), {
      commentsCount: increment(1)
    })

    if (!post.comments) post.comments = []
    post.comments.push({
      id: Date.now(),
      content: post.newComment,
      authorName: authStore.user.displayName || 'ครู',
      authorPhoto: authStore.user.photoURL
    })
    post.commentsCount = (post.commentsCount || 0) + 1
    post.newComment = ''
  } catch (error) {
    console.error('Error adding comment:', error)
  }
}

const sharePost = (post) => {
  navigator.clipboard.writeText(`${window.location.origin}/community/post/${post.id}`)
  alert('คัดลอกลิงก์แล้ว!')
}

const createDiscussion = async () => {
  if (!newDiscussion.title.trim()) return
  
  try {
    await addDoc(collection(db, 'discussions'), {
      ...newDiscussion,
      tags: newDiscussion.tags.split(',').map(t => t.trim()).filter(t => t),
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName || 'ครู',
      authorPhoto: authStore.user.photoURL,
      communityType: 'teacher',
      viewsCount: 0,
      repliesCount: 0,
      createdAt: serverTimestamp()
    })

    showNewDiscussionModal.value = false
    newDiscussion.title = ''
    newDiscussion.content = ''
    newDiscussion.tags = ''
    loadDiscussions()
  } catch (error) {
    console.error('Error creating discussion:', error)
  }
}

const viewDiscussion = (disc) => {
  router.push(`/discussion/${disc.id}`)
}

const viewGroup = (group) => {
  router.push(`/plc-group/${group.id}`)
}

const downloadResource = (res) => {
  if (res.url) {
    window.open(res.url, '_blank')
    // Update download count
    updateDoc(doc(db, 'resourceLibrary', res.id), {
      downloadsCount: increment(1)
    }).catch(() => {})
  }
}

const toggleBookmark = async (res) => {
  if (!authStore.user?.uid) return
  
  try {
    if (res.isBookmarked) {
      // Remove bookmark
      const bookmarkQuery = query(
        collection(db, 'bookmarks'),
        where('userId', '==', authStore.user.uid),
        where('resourceId', '==', res.id)
      )
      const snap = await getDocs(bookmarkQuery)
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(db, 'bookmarks', docSnap.id))
      }
    } else {
      // Add bookmark
      await addDoc(collection(db, 'bookmarks'), {
        userId: authStore.user.uid,
        resourceId: res.id,
        resourceTitle: res.title,
        createdAt: serverTimestamp()
      })
    }
    res.isBookmarked = !res.isBookmarked
  } catch (error) {
    console.error('Error toggling bookmark:', error)
  }
}

// Upload Resource
const handleFileSelect = (e) => {
  const file = e.target.files[0]
  if (file) {
    newResource.file = file
    newResource.fileName = file.name
    // Auto-detect type
    const ext = file.name.split('.').pop().toLowerCase()
    if (['pdf'].includes(ext)) newResource.type = 'pdf'
    else if (['doc', 'docx'].includes(ext)) newResource.type = 'doc'
    else if (['ppt', 'pptx'].includes(ext)) newResource.type = 'ppt'
    else if (['mp4', 'mov', 'webm'].includes(ext)) newResource.type = 'video'
    else newResource.type = 'link'
  }
}

const uploadResource = async () => {
  if (!newResource.title.trim() || !newResource.file) return
  
  isUploading.value = true
  try {
    // Upload file to Firebase Storage
    const fileRef = storageRef(storage, `plc-resources/${Date.now()}_${newResource.file.name}`)
    await uploadBytes(fileRef, newResource.file)
    const downloadURL = await getDownloadURL(fileRef)
    
    // Save metadata to Firestore
    await addDoc(collection(db, 'resourceLibrary'), {
      title: newResource.title,
      description: newResource.description,
      type: newResource.type,
      url: downloadURL,
      fileName: newResource.fileName,
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName || 'ครู',
      authorPhoto: authStore.user.photoURL,
      communityType: 'teacher',
      downloadsCount: 0,
      createdAt: serverTimestamp()
    })
    
    // Reset form
    newResource.title = ''
    newResource.description = ''
    newResource.type = 'pdf'
    newResource.file = null
    newResource.fileName = ''
    showUploadModal.value = false
    loadResources()
  } catch (error) {
    console.error('Error uploading resource:', error)
    alert('เกิดข้อผิดพลาดในการอัปโหลด')
  } finally {
    isUploading.value = false
  }
}

// Create Group
const createGroup = async () => {
  if (!newGroup.name.trim()) return
  
  isCreatingGroup.value = true
  try {
    await addDoc(collection(db, 'communities'), {
      name: newGroup.name,
      description: newGroup.description,
      emoji: newGroup.emoji || '👥',
      subject: newGroup.subject,
      type: 'plc',
      isPublic: newGroup.isPublic,
      creatorId: authStore.user.uid,
      creatorName: authStore.user.displayName || 'ครู',
      memberIds: [authStore.user.uid],
      membersCount: 1,
      createdAt: serverTimestamp()
    })
    
    // Reset form
    newGroup.name = ''
    newGroup.description = ''
    newGroup.emoji = '👥'
    newGroup.subject = ''
    newGroup.isPublic = true
    showCreateGroupModal.value = false
    loadMyGroups()
    loadAllGroups()
  } catch (error) {
    console.error('Error creating group:', error)
  } finally {
    isCreatingGroup.value = false
  }
}

// Join Group
const joinGroup = async (group) => {
  if (!authStore.user?.uid) return
  
  try {
    await updateDoc(doc(db, 'communities', group.id), {
      memberIds: [...(group.memberIds || []), authStore.user.uid],
      membersCount: increment(1)
    })
    
    group.memberIds = [...(group.memberIds || []), authStore.user.uid]
    group.membersCount = (group.membersCount || 0) + 1
    loadMyGroups()
  } catch (error) {
    console.error('Error joining group:', error)
  }
}

// Leave Group
const leaveGroup = async (group) => {
  if (!authStore.user?.uid) return
  
  try {
    const newMemberIds = (group.memberIds || []).filter(id => id !== authStore.user.uid)
    await updateDoc(doc(db, 'communities', group.id), {
      memberIds: newMemberIds,
      membersCount: increment(-1)
    })
    
    group.memberIds = newMemberIds
    group.membersCount = Math.max(0, (group.membersCount || 1) - 1)
    loadMyGroups()
  } catch (error) {
    console.error('Error leaving group:', error)
  }
}

// Load All Groups for Join modal
const loadAllGroups = async () => {
  try {
    const groupsQuery = query(
      collection(db, 'communities'),
      where('type', '==', 'plc'),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    const snapshot = await getDocs(groupsQuery)
    allGroups.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading all groups:', error)
  }
}

const followTeacher = async (teacher) => {
  if (!authStore.user?.uid) return
  
  try {
    if (teacher.isFollowing) {
      // Unfollow - find and delete the follow document
      const followQuery = query(
        collection(db, 'following'),
        where('followerId', '==', authStore.user.uid),
        where('followingId', '==', teacher.id)
      )
      const snap = await getDocs(followQuery)
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(db, 'following', docSnap.id))
      }
    } else {
      // Follow
      await addDoc(collection(db, 'following'), {
        followerId: authStore.user.uid,
        followerName: authStore.user.displayName || 'ครู',
        followingId: teacher.id,
        followingName: teacher.displayName,
        createdAt: serverTimestamp()
      })
    }
    teacher.isFollowing = !teacher.isFollowing
  } catch (error) {
    console.error('Error following teacher:', error)
  }
}

// Load Data
const loadFeed = async () => {
  try {
    const feedQuery = query(
      collection(db, 'communityPosts'),
      where('communityType', '==', 'teacher'),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    const snapshot = await getDocs(feedQuery)
    feedPosts.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      showComments: false,
      newComment: ''
    }))
  } catch (error) {
    console.error('Error loading feed:', error)
  }
}

const loadDiscussions = async () => {
  try {
    const discQuery = query(
      collection(db, 'discussions'),
      where('communityType', '==', 'teacher'),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    const snapshot = await getDocs(discQuery)
    discussions.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading discussions:', error)
  }
}

const loadResources = async () => {
  try {
    const resQuery = query(
      collection(db, 'resourceLibrary'),
      where('communityType', '==', 'teacher'),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    const snapshot = await getDocs(resQuery)
    resources.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading resources:', error)
  }
}

const loadMyGroups = async () => {
  if (!authStore.user?.uid) return
  try {
    const groupsQuery = query(
      collection(db, 'communities'),
      where('type', '==', 'plc'),
      where('memberIds', 'array-contains', authStore.user.uid),
      limit(10)
    )
    const snapshot = await getDocs(groupsQuery)
    myGroups.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading groups:', error)
  }
}

const loadTrending = async () => {
  try {
    // Calculate trending from actual posts and discussions tags
    const tagCounts = {}
    
    // Get tags from posts
    const postsSnap = await getDocs(query(
      collection(db, 'communityPosts'),
      where('communityType', '==', 'teacher'),
      orderBy('createdAt', 'desc'),
      limit(100)
    ))
    postsSnap.docs.forEach(doc => {
      const tags = doc.data().tags || []
      tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })
    
    // Get tags from discussions
    const discSnap = await getDocs(query(
      collection(db, 'discussions'),
      where('communityType', '==', 'teacher'),
      orderBy('createdAt', 'desc'),
      limit(100)
    ))
    discSnap.docs.forEach(doc => {
      const tags = doc.data().tags || []
      tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })
    
    // Sort by count and take top 5
    const sorted = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ name, count ], idx) => ({ id: idx + 1, name, count }))
    
    // If no tags, show default suggestions
    trendingTopics.value = sorted.length > 0 ? sorted : [
      { id: 1, name: 'HOTS', count: 0 },
      { id: 2, name: '5Emodel', count: 0 },
      { id: 3, name: 'AIในการสอน', count: 0 }
    ]
  } catch (error) {
    console.error('Error loading trending:', error)
    trendingTopics.value = []
  }
}

const loadActiveTeachers = async () => {
  try {
    // Get teachers with their post activity count
    const teacherPostCounts = {}
    
    // Count posts per teacher
    const postsSnap = await getDocs(query(
      collection(db, 'communityPosts'),
      where('communityType', '==', 'teacher'),
      orderBy('createdAt', 'desc'),
      limit(100)
    ))
    postsSnap.docs.forEach(doc => {
      const authorId = doc.data().authorId
      teacherPostCounts[authorId] = (teacherPostCounts[authorId] || 0) + 1
    })
    
    // Count discussions per teacher
    const discSnap = await getDocs(query(
      collection(db, 'discussions'),
      where('communityType', '==', 'teacher'),
      orderBy('createdAt', 'desc'),
      limit(100)
    ))
    discSnap.docs.forEach(doc => {
      const authorId = doc.data().authorId
      teacherPostCounts[authorId] = (teacherPostCounts[authorId] || 0) + 1
    })
    
    // Get top 5 most active teachers
    const topTeacherIds = Object.entries(teacherPostCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)
    
    if (topTeacherIds.length > 0) {
      // Fetch teacher details
      const teachersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'teacher'),
        limit(20)
      )
      const snapshot = await getDocs(teachersQuery)
      const teacherMap = {}
      snapshot.docs.forEach(doc => {
        teacherMap[doc.id] = { id: doc.id, ...doc.data() }
      })
      
      // Check if current user follows these teachers
      let followingIds = []
      if (authStore.user?.uid) {
        try {
          const followingSnap = await getDocs(query(
            collection(db, 'following'),
            where('followerId', '==', authStore.user.uid)
          ))
          followingIds = followingSnap.docs.map(d => d.data().followingId)
        } catch (e) {}
      }
      
      activeTeachers.value = topTeacherIds
        .filter(id => teacherMap[id])
        .map(id => ({
          ...teacherMap[id],
          postCount: teacherPostCounts[id],
          isFollowing: followingIds.includes(id)
        }))
    } else {
      // Fallback: just show some teachers
      const teachersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'teacher'),
        limit(5)
      )
      const snapshot = await getDocs(teachersQuery)
      activeTeachers.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    }
  } catch (error) {
    console.error('Error loading active teachers:', error)
  }
}

const loadStats = async () => {
  try {
    // Load from EXISTING collections in the system
    const [lpSnap, qSnap, stratSnap, insightSnap] = await Promise.all([
      // แผนการสอนจากระบบเดิม lessonPlans + ที่แชร์ใน PLC
      getDocs(query(collection(db, 'lessonPlans'), limit(500))),
      // คำถามจากคลังคำถามเดิม
      getDocs(query(collection(db, 'questions'), limit(500))),
      // กลยุทธ์การสอนใน PLC
      getDocs(query(collection(db, 'teachingStrategies'), limit(500))),
      // ข้อค้นพบจากข้อมูล
      getDocs(query(collection(db, 'analyticsInsights'), limit(500)))
    ])
    stats.lessonPlans = lpSnap.size
    stats.questions = qSnap.size
    stats.strategies = stratSnap.size || 0
    stats.insights = insightSnap.size || 0
  } catch (error) {
    console.error('Error loading stats:', error)
    // Fallback to 0 if error
    stats.lessonPlans = 0
    stats.questions = 0
    stats.strategies = 0
    stats.insights = 0
  }
}

// Initialize
onMounted(async () => {
  await Promise.all([
    loadFeed(),
    loadDiscussions(),
    loadResources(),
    loadMyGroups(),
    loadAllGroups(),
    loadTrending(),
    loadActiveTeachers(),
    loadStats()
  ])
})
</script>

<style scoped>
.teacher-hub {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Header */
.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 32px;
  color: var(--text-primary);
}

.subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 16px;
}

/* Quick Actions */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 30px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  background: var(--card-bg);
  border-radius: 16px;
  text-decoration: none;
  color: var(--text-primary);
  box-shadow: 0 2px 8px var(--shadow);
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid var(--border-color);
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px var(--shadow);
}

.action-icon {
  font-size: 36px;
  margin-bottom: 12px;
}

.action-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.action-count {
  font-size: 13px;
  color: #667eea;
}

/* Main Layout */
.main-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px;
}

/* Content Area */
.content-area {
  min-width: 0;
}

.content-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.tab {
  padding: 10px 20px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
}

.tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.tab-content {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px var(--shadow);
  border: 1px solid var(--border-color);
}

/* Create Post */
.create-post {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.post-input-area {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.post-input-area textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  resize: none;
  font-size: 14px;
  background: var(--input-bg);
  color: var(--text-primary);
}

.post-tags-input {
  margin: 8px 0 8px 52px;
}

.tags-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 13px;
  background: var(--input-bg);
  color: var(--text-primary);
}

.post-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-left: 52px;
}

.post-type-btns {
  display: flex;
  gap: 8px;
}

.type-btn {
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
}

.type-btn.active {
  background: var(--primary-light);
  color: #667eea;
}

.btn-post {
  padding: 10px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-post:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Feed List */
.feed-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feed-card {
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.post-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.author-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
}

.author-info {
  flex: 1;
}

.author-name {
  display: block;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.author-school {
  font-size: 12px;
  color: var(--text-secondary);
}

.post-time {
  font-size: 12px;
  color: var(--text-secondary);
  display: block;
}

.post-type-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.post-type-badge.share {
  background: #e8f5e9;
  color: #2e7d32;
}

.post-type-badge.question {
  background: #fff3e0;
  color: #e65100;
}

.post-type-badge.resource {
  background: #e3f2fd;
  color: #1976d2;
}

.post-content p {
  margin: 0;
  line-height: 1.6;
  font-size: 14px;
  color: var(--text-primary);
}

.post-tags {
  display: flex;
  gap: 6px;
  margin: 12px 0;
}

.tag {
  padding: 4px 10px;
  background: var(--primary-light);
  color: #667eea;
  border-radius: 12px;
  font-size: 12px;
}

.post-stats {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.stat-btn {
  padding: 6px 12px;
  background: var(--card-bg);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.stat-btn.active {
  background: #ffebee;
  color: #f44336;
}

/* Comments */
.comments-preview {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
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
}

.comment-bubble {
  background: var(--card-bg);
  padding: 10px 14px;
  border-radius: 12px;
}

.comment-author {
  font-weight: 600;
  font-size: 13px;
  display: block;
  margin-bottom: 4px;
}

.comment-bubble p {
  margin: 0;
  font-size: 13px;
}

.add-comment {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.add-comment input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  font-size: 13px;
}

.add-comment button {
  padding: 10px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
}

/* Discussions */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.btn-new {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}

.discussions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.discussion-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
  border: 1px solid var(--border-color);
}

.discussion-card:hover {
  background: var(--bg-hover);
}

.disc-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg);
  border-radius: 10px;
}

.disc-content {
  flex: 1;
  min-width: 0;
}

.disc-content h4 {
  margin: 0 0 6px 0;
  font-size: 15px;
  color: var(--text-primary);
}

.disc-excerpt {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.disc-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.disc-stats {
  text-align: right;
  font-size: 12px;
  color: var(--text-secondary);
}

.disc-views {
  display: block;
  margin-bottom: 4px;
}

/* Resources */
.resources-grid {
  display: grid;
  gap: 12px;
}

.resource-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.res-icon {
  font-size: 28px;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg);
  border-radius: 10px;
}

.res-info {
  flex: 1;
  min-width: 0;
}

.res-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: var(--text-primary);
}

.res-info p {
  margin: 0 0 6px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.res-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.res-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-download, .btn-bookmark {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--card-bg);
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
}

.btn-bookmark.active {
  background: #fff3e0;
}

/* Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px var(--shadow);
  border: 1px solid var(--border-color);
}

.sidebar-card h3 {
  margin: 0 0 16px 0;
  font-size: 15px;
  color: var(--text-primary);
}

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: var(--bg-secondary);
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid var(--border-color);
}

.group-emoji {
  font-size: 20px;
}

.group-info {
  flex: 1;
}

.group-name {
  display: block;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
}

.group-members {
  font-size: 11px;
  color: var(--text-secondary);
}

.btn-join-group {
  width: 100%;
  padding: 10px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #667eea;
  font-size: 13px;
}

.trending-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trending-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.trending-tag {
  color: #667eea;
  font-size: 13px;
}

.trending-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.teachers-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.teacher-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.teacher-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.teacher-info {
  flex: 1;
}

.teacher-name {
  display: block;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
}

.teacher-school {
  font-size: 11px;
  color: var(--text-secondary);
}

.btn-follow {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--bg-tertiary);
  border-radius: 50%;
  cursor: pointer;
  color: #667eea;
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-tertiary);
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--input-bg);
  color: var(--text-primary);
}

.form-group textarea {
  resize: vertical;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel {
  padding: 10px 20px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-primary);
}

.btn-submit {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

/* Empty / Loading States */
.empty-state, .loading-state {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 900px) {
  .main-layout {
    grid-template-columns: 1fr;
  }

  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .quick-actions {
    grid-template-columns: 1fr;
  }

  .post-actions {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .post-type-btns {
    justify-content: center;
  }
}

/* File Upload */
.file-upload-area {
  border: 2px dashed var(--border-color);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
}

.file-upload-area:hover {
  border-color: #667eea;
}

.file-upload-label {
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Modal Large */
.modal-large {
  max-width: 700px;
}

.modal-actions-bar {
  margin-bottom: 16px;
}

.btn-create {
  padding: 10px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

/* Groups Browse List */
.groups-browse-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.group-browse-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 10px;
}

.group-emoji-large {
  font-size: 32px;
}

.group-browse-info {
  flex: 1;
}

.group-browse-name {
  display: block;
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
}

.group-browse-desc {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0;
}

.group-browse-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.btn-join {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.btn-leave {
  padding: 8px 16px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.btn-leave:hover {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.empty-groups {
  text-align: center;
  padding: 30px;
  color: var(--text-secondary);
}

/* Emoji Picker */
.emoji-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.emoji-btn {
  width: 40px;
  height: 40px;
  font-size: 20px;
  border: 2px solid var(--border-color);
  background: var(--card-bg);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.emoji-btn.active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

/* Checkbox Label */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
}

.checkbox-label span {
  font-size: 14px;
  color: var(--text-primary);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
