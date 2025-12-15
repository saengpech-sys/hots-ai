<template>
  <div class="student-community-hub">
    <!-- Header -->
    <div class="hub-header">
      <div class="header-content">
        <h1>🎓 ชุมชนการเรียนรู้</h1>
        <p class="subtitle">Student Learning Community (SLC)</p>
      </div>
      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-value">{{ stats.totalMembers }}</span>
          <span class="stat-label">สมาชิก</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.activeDiscussions }}</span>
          <span class="stat-label">กระทู้วันนี้</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.helpRequests }}</span>
          <span class="stat-label">ขอความช่วยเหลือ</span>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <button class="action-btn primary" @click="showCreateDiscussion = true">
        💬 สร้างกระทู้ใหม่
      </button>
      <button class="action-btn secondary" @click="showHelpRequest = true">
        🆘 ขอความช่วยเหลือ
      </button>
      <button class="action-btn secondary" @click="$router.push('/community/study-groups')">
        👥 กลุ่มเรียน
      </button>
      <button class="action-btn secondary" @click="$router.push('/community/mentors')">
        🌟 หา Mentor
      </button>
    </div>

    <!-- Main Content Grid -->
    <div class="hub-content">
      <!-- Left Column: Feed & Discussions -->
      <div class="main-column">
        <!-- Tabs -->
        <div class="content-tabs">
          <button 
            :class="['tab-btn', { active: activeTab === 'feed' }]"
            @click="activeTab = 'feed'"
          >
            📰 ฟีด
          </button>
          <button 
            :class="['tab-btn', { active: activeTab === 'discussions' }]"
            @click="activeTab = 'discussions'"
          >
            💬 กระทู้
          </button>
          <button 
            :class="['tab-btn', { active: activeTab === 'shared' }]"
            @click="activeTab = 'shared'"
          >
            📚 คำตอบดีๆ
          </button>
        </div>

        <!-- Feed Tab -->
        <div v-if="activeTab === 'feed'" class="tab-content">
          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <p>กำลังโหลด...</p>
          </div>
          
          <div v-else-if="feedItems.length === 0" class="empty-state">
            <span class="empty-icon">📭</span>
            <p>ยังไม่มีกิจกรรมในฟีด</p>
            <button class="btn-primary" @click="showCreateDiscussion = true">
              เริ่มสร้างกระทู้แรก
            </button>
          </div>

          <div v-else class="feed-list">
            <div 
              v-for="item in feedItems" 
              :key="item.id" 
              class="feed-item"
              @click="openItem(item)"
            >
              <div class="feed-avatar">
                <img :src="item.authorPhoto || '/default-avatar.png'" :alt="item.authorName" />
              </div>
              <div class="feed-content">
                <div class="feed-header">
                  <span class="author-name">{{ item.authorName }}</span>
                  <span class="feed-time">{{ formatTime(item.createdAt) }}</span>
                </div>
                <div class="feed-type-badge" :class="item.type">
                  {{ getTypeBadge(item.type) }}
                </div>
                <p class="feed-text">{{ item.title || item.content }}</p>
                <div class="feed-meta">
                  <span v-if="item.loTags?.length" class="lo-tags">
                    🎯 {{ item.loTags.slice(0, 2).join(', ') }}
                    <span v-if="item.loTags.length > 2">+{{ item.loTags.length - 2 }}</span>
                  </span>
                  <span class="reactions">
                    ❤️ {{ item.likes || 0 }} · 💬 {{ item.replyCount || 0 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Discussions Tab -->
        <div v-if="activeTab === 'discussions'" class="tab-content">
          <div class="filter-bar">
            <select v-model="discussionFilter" class="filter-select">
              <option value="all">ทั้งหมด</option>
              <option value="my-lo">เกี่ยวกับ LO ของฉัน</option>
              <option value="unanswered">ยังไม่มีคำตอบ</option>
              <option value="popular">ยอดนิยม</option>
            </select>
            <select v-model="courseFilter" class="filter-select">
              <option value="">ทุกรายวิชา</option>
              <option v-for="course in myCourses" :key="course.id" :value="course.id">
                {{ course.name }}
              </option>
            </select>
          </div>

          <div v-if="filteredDiscussions.length === 0" class="empty-state">
            <span class="empty-icon">💬</span>
            <p>ไม่พบกระทู้ที่ตรงกับตัวกรอง</p>
          </div>

          <div v-else class="discussions-list">
            <div 
              v-for="disc in filteredDiscussions" 
              :key="disc.id" 
              class="discussion-card"
              @click="openDiscussion(disc.id)"
            >
              <div class="disc-status" :class="{ resolved: disc.isResolved }">
                {{ disc.isResolved ? '✅' : '❓' }}
              </div>
              <div class="disc-content">
                <h3 class="disc-title">{{ disc.title }}</h3>
                <p class="disc-preview">{{ truncate(disc.content, 100) }}</p>
                <div class="disc-meta">
                  <span class="disc-author">
                    <img :src="disc.authorPhoto || '/default-avatar.png'" />
                    {{ disc.authorName }}
                  </span>
                  <span class="disc-stats">
                    💬 {{ disc.replyCount || 0 }} · 👁️ {{ disc.viewCount || 0 }}
                  </span>
                  <span class="disc-time">{{ formatTime(disc.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Shared Answers Tab -->
        <div v-if="activeTab === 'shared'" class="tab-content">
          <div class="shared-header">
            <p class="shared-description">
              คำตอบคุณภาพสูงจากเพื่อนๆ ที่ได้คะแนน ARCE สูง 🌟
            </p>
          </div>

          <div v-if="sharedAnswers.length === 0" class="empty-state">
            <span class="empty-icon">📚</span>
            <p>ยังไม่มีคำตอบที่แชร์</p>
          </div>

          <div v-else class="shared-list">
            <div 
              v-for="answer in sharedAnswers" 
              :key="answer.id" 
              class="shared-card"
            >
              <div class="shared-score">
                <span class="score-value">{{ answer.totalScore }}/20</span>
                <span class="score-label">ARCE</span>
              </div>
              <div class="shared-content">
                <div class="shared-question">
                  <span class="q-label">คำถาม:</span>
                  {{ truncate(answer.questionText, 80) }}
                </div>
                <div class="shared-answer">
                  <span class="a-label">คำตอบ:</span>
                  {{ truncate(answer.answerText, 150) }}
                </div>
                <div class="shared-meta">
                  <span class="shared-author">
                    โดย {{ answer.authorName }} · {{ answer.courseName }}
                  </span>
                  <button class="btn-view" @click="viewFullAnswer(answer)">
                    ดูเต็ม
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Sidebar -->
      <div class="sidebar-column">
        <!-- My Study Groups -->
        <div class="sidebar-card">
          <h3 class="card-title">👥 กลุ่มเรียนของฉัน</h3>
          <div v-if="myGroups.length === 0" class="card-empty">
            <p>ยังไม่ได้เข้าร่วมกลุ่มใด</p>
            <button class="btn-small" @click="$router.push('/community/study-groups')">
              ค้นหากลุ่ม
            </button>
          </div>
          <div v-else class="groups-list">
            <div 
              v-for="group in myGroups.slice(0, 3)" 
              :key="group.id" 
              class="group-item"
              @click="$router.push(`/community/study-groups/${group.id}`)"
            >
              <span class="group-emoji">{{ group.emoji || '📚' }}</span>
              <div class="group-info">
                <span class="group-name">{{ group.name }}</span>
                <span class="group-members">{{ group.memberCount }} สมาชิก</span>
              </div>
              <span v-if="group.unreadCount" class="unread-badge">{{ group.unreadCount }}</span>
            </div>
          </div>
          <router-link to="/community/study-groups" class="card-link">
            ดูทั้งหมด →
          </router-link>
        </div>

        <!-- Help Requests Nearby -->
        <div class="sidebar-card">
          <h3 class="card-title">🆘 ขอความช่วยเหลือ</h3>
          <div v-if="nearbyHelpRequests.length === 0" class="card-empty">
            <p>ไม่มีคำขอในตอนนี้</p>
          </div>
          <div v-else class="help-list">
            <div 
              v-for="req in nearbyHelpRequests.slice(0, 3)" 
              :key="req.id" 
              class="help-item"
              @click="openHelpRequest(req.id)"
            >
              <div class="help-urgency" :class="req.urgency">
                {{ req.urgency === 'high' ? '🔴' : req.urgency === 'medium' ? '🟡' : '🟢' }}
              </div>
              <div class="help-info">
                <span class="help-topic">{{ truncate(req.topic, 40) }}</span>
                <span class="help-lo">🎯 {{ req.loName || 'ทั่วไป' }}</span>
              </div>
            </div>
          </div>
          <router-link to="/community/help-board" class="card-link">
            ดูทั้งหมด →
          </router-link>
        </div>

        <!-- Suggested Mentors -->
        <div class="sidebar-card">
          <h3 class="card-title">🌟 Mentor แนะนำ</h3>
          <div v-if="suggestedMentors.length === 0" class="card-empty">
            <p>กำลังหา Mentor ที่เหมาะกับคุณ...</p>
          </div>
          <div v-else class="mentors-list">
            <div 
              v-for="mentor in suggestedMentors.slice(0, 3)" 
              :key="mentor.id" 
              class="mentor-item"
            >
              <img :src="mentor.photoURL || '/default-avatar.png'" class="mentor-avatar" />
              <div class="mentor-info">
                <span class="mentor-name">{{ mentor.displayName }}</span>
                <span class="mentor-strength">💪 {{ mentor.strongLOs?.slice(0, 2).join(', ') }}</span>
              </div>
              <button class="btn-connect" @click="requestMentor(mentor)">
                ขอเป็น Mentor
              </button>
            </div>
          </div>
          <router-link to="/community/mentors" class="card-link">
            ค้นหาเพิ่ม →
          </router-link>
        </div>

        <!-- My Weak LOs -->
        <div class="sidebar-card highlight">
          <h3 class="card-title">🎯 LO ที่ต้องพัฒนา</h3>
          <div v-if="weakLOs.length === 0" class="card-empty">
            <p>เก่งมาก! ไม่มี LO ที่ต้องปรับปรุง</p>
          </div>
          <div v-else class="weak-lo-list">
            <div 
              v-for="lo in weakLOs.slice(0, 5)" 
              :key="lo.code" 
              class="weak-lo-item"
            >
              <span class="lo-code">{{ lo.code }}</span>
              <div class="lo-bar">
                <div class="lo-progress" :style="{ width: lo.progress + '%' }"></div>
              </div>
              <button class="btn-find-help" @click="findHelpForLO(lo)">
                หาช่วย
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Discussion Modal -->
    <div v-if="showCreateDiscussion" class="modal-overlay" @click.self="showCreateDiscussion = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>💬 สร้างกระทู้ใหม่</h2>
          <button class="close-btn" @click="showCreateDiscussion = false">×</button>
        </div>
        <form @submit.prevent="createDiscussion" class="modal-form">
          <div class="form-group">
            <label>หัวข้อ</label>
            <input 
              v-model="newDiscussion.title" 
              type="text" 
              placeholder="เขียนหัวข้อคำถามหรือเรื่องที่ต้องการพูดคุย"
              required
            />
          </div>
          <div class="form-group">
            <label>รายละเอียด</label>
            <textarea 
              v-model="newDiscussion.content" 
              rows="5"
              placeholder="อธิบายรายละเอียด หรือคำถามที่ต้องการถาม..."
              required
            ></textarea>
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label>รายวิชา</label>
              <select v-model="newDiscussion.courseId">
                <option value="">เลือกรายวิชา</option>
                <option v-for="course in myCourses" :key="course.id" :value="course.id">
                  {{ course.name }}
                </option>
              </select>
            </div>
            <div class="form-group half">
              <label>LO ที่เกี่ยวข้อง</label>
              <select v-model="newDiscussion.loCode">
                <option value="">เลือก LO (ถ้ามี)</option>
                <option v-for="lo in availableLOs" :key="lo.code" :value="lo.code">
                  {{ lo.code }} - {{ truncate(lo.name, 30) }}
                </option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showCreateDiscussion = false">
              ยกเลิก
            </button>
            <button type="submit" class="btn-primary" :disabled="creatingDiscussion">
              {{ creatingDiscussion ? 'กำลังสร้าง...' : 'สร้างกระทู้' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Help Request Modal -->
    <div v-if="showHelpRequest" class="modal-overlay" @click.self="showHelpRequest = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>🆘 ขอความช่วยเหลือ</h2>
          <button class="close-btn" @click="showHelpRequest = false">×</button>
        </div>
        <form @submit.prevent="submitHelpRequest" class="modal-form">
          <div class="form-group">
            <label>หัวข้อที่ต้องการความช่วยเหลือ</label>
            <input 
              v-model="newHelpRequest.topic" 
              type="text" 
              placeholder="เช่น ไม่เข้าใจการวิเคราะห์ข้อมูล"
              required
            />
          </div>
          <div class="form-group">
            <label>รายละเอียด</label>
            <textarea 
              v-model="newHelpRequest.description" 
              rows="4"
              placeholder="อธิบายว่าต้องการความช่วยเหลือเรื่องอะไร ติดปัญหาตรงไหน..."
              required
            ></textarea>
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label>LO ที่เกี่ยวข้อง</label>
              <select v-model="newHelpRequest.loCode">
                <option value="">เลือก LO</option>
                <option v-for="lo in weakLOs" :key="lo.code" :value="lo.code">
                  {{ lo.code }} - {{ truncate(lo.name, 30) }}
                </option>
              </select>
            </div>
            <div class="form-group half">
              <label>ความเร่งด่วน</label>
              <select v-model="newHelpRequest.urgency">
                <option value="low">🟢 ไม่เร่งด่วน</option>
                <option value="medium">🟡 ปานกลาง</option>
                <option value="high">🔴 เร่งด่วน</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showHelpRequest = false">
              ยกเลิก
            </button>
            <button type="submit" class="btn-primary" :disabled="submittingHelp">
              {{ submittingHelp ? 'กำลังส่ง...' : 'ส่งคำขอ' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  collection, query, where, orderBy, limit, 
  getDocs, addDoc, serverTimestamp, onSnapshot 
} from 'firebase/firestore'
import { db } from '@/firebase/config'

const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(true)
const activeTab = ref('feed')
const discussionFilter = ref('all')
const courseFilter = ref('')

// Data
const feedItems = ref([])
const discussions = ref([])
const sharedAnswers = ref([])
const myGroups = ref([])
const nearbyHelpRequests = ref([])
const suggestedMentors = ref([])
const weakLOs = ref([])
const myCourses = ref([])
const availableLOs = ref([])

// Stats
const stats = reactive({
  totalMembers: 0,
  activeDiscussions: 0,
  helpRequests: 0
})

// Modals
const showCreateDiscussion = ref(false)
const showHelpRequest = ref(false)
const creatingDiscussion = ref(false)
const submittingHelp = ref(false)

// New discussion form
const newDiscussion = reactive({
  title: '',
  content: '',
  courseId: '',
  loCode: ''
})

// New help request form
const newHelpRequest = reactive({
  topic: '',
  description: '',
  loCode: '',
  urgency: 'medium'
})

// Computed
const filteredDiscussions = computed(() => {
  let result = discussions.value

  if (courseFilter.value) {
    result = result.filter(d => d.courseId === courseFilter.value)
  }

  switch (discussionFilter.value) {
    case 'my-lo':
      const myWeakLOCodes = weakLOs.value.map(lo => lo.code)
      result = result.filter(d => d.loTags?.some(tag => myWeakLOCodes.includes(tag)))
      break
    case 'unanswered':
      result = result.filter(d => !d.replyCount || d.replyCount === 0)
      break
    case 'popular':
      result = [...result].sort((a, b) => (b.likes || 0) - (a.likes || 0))
      break
  }

  return result
})

// Methods
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return 'เมื่อกี้'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชม.ที่แล้ว`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} วันที่แล้ว`
  return date.toLocaleDateString('th-TH')
}

const truncate = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const getTypeBadge = (type) => {
  const badges = {
    discussion: '💬 กระทู้',
    help_request: '🆘 ขอช่วย',
    shared_answer: '📚 คำตอบดี',
    study_session: '📅 นัดเรียน',
    achievement: '🏆 ความสำเร็จ'
  }
  return badges[type] || '📝 โพสต์'
}

const openItem = (item) => {
  switch (item.type) {
    case 'discussion':
      router.push(`/community/discussions/${item.id}`)
      break
    case 'help_request':
      router.push(`/community/help-board/${item.id}`)
      break
    case 'shared_answer':
      viewFullAnswer(item)
      break
    default:
      router.push(`/community/discussions/${item.id}`)
  }
}

const openDiscussion = (id) => {
  router.push(`/community/discussions/${id}`)
}

const openHelpRequest = (id) => {
  router.push(`/community/help-board/${id}`)
}

const viewFullAnswer = (answer) => {
  router.push(`/community/shared/${answer.id}`)
}

const findHelpForLO = (lo) => {
  newHelpRequest.loCode = lo.code
  newHelpRequest.topic = `ต้องการความช่วยเหลือเรื่อง ${lo.code}`
  showHelpRequest.value = true
}

const requestMentor = async (mentor) => {
  try {
    await addDoc(collection(db, 'mentorRelationships'), {
      mentorId: mentor.id,
      menteeId: authStore.user.uid,
      status: 'pending',
      createdAt: serverTimestamp(),
      matchedLOs: mentor.strongLOs?.filter(lo => 
        weakLOs.value.some(weak => weak.code === lo)
      ) || []
    })
    alert('ส่งคำขอเป็น Mentor แล้ว! รอการตอบรับ')
  } catch (error) {
    console.error('Error requesting mentor:', error)
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
  }
}

const createDiscussion = async () => {
  if (!newDiscussion.title.trim() || !newDiscussion.content.trim()) return
  
  creatingDiscussion.value = true
  try {
    const docRef = await addDoc(collection(db, 'discussions'), {
      title: newDiscussion.title.trim(),
      content: newDiscussion.content.trim(),
      courseId: newDiscussion.courseId || null,
      loTags: newDiscussion.loCode ? [newDiscussion.loCode] : [],
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName || 'นักเรียน',
      authorPhoto: authStore.user.photoURL || null,
      type: 'discussion',
      status: 'open',
      isResolved: false,
      likes: 0,
      replyCount: 0,
      viewCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    // Also add to activity feed
    await addDoc(collection(db, 'activityFeed'), {
      type: 'discussion',
      referenceId: docRef.id,
      title: newDiscussion.title.trim(),
      content: truncate(newDiscussion.content.trim(), 100),
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName || 'นักเรียน',
      authorPhoto: authStore.user.photoURL || null,
      loTags: newDiscussion.loCode ? [newDiscussion.loCode] : [],
      courseId: newDiscussion.courseId || null,
      createdAt: serverTimestamp()
    })

    showCreateDiscussion.value = false
    newDiscussion.title = ''
    newDiscussion.content = ''
    newDiscussion.courseId = ''
    newDiscussion.loCode = ''
    
    // Refresh feed
    loadFeed()
  } catch (error) {
    console.error('Error creating discussion:', error)
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
  } finally {
    creatingDiscussion.value = false
  }
}

const submitHelpRequest = async () => {
  if (!newHelpRequest.topic.trim() || !newHelpRequest.description.trim()) return
  
  submittingHelp.value = true
  try {
    const docRef = await addDoc(collection(db, 'helpRequests'), {
      topic: newHelpRequest.topic.trim(),
      description: newHelpRequest.description.trim(),
      loCode: newHelpRequest.loCode || null,
      loName: weakLOs.value.find(lo => lo.code === newHelpRequest.loCode)?.name || null,
      urgency: newHelpRequest.urgency,
      requesterId: authStore.user.uid,
      requesterName: authStore.user.displayName || 'นักเรียน',
      requesterPhoto: authStore.user.photoURL || null,
      status: 'open',
      offerCount: 0,
      createdAt: serverTimestamp()
    })

    // Also add to activity feed
    await addDoc(collection(db, 'activityFeed'), {
      type: 'help_request',
      referenceId: docRef.id,
      title: newHelpRequest.topic.trim(),
      content: truncate(newHelpRequest.description.trim(), 100),
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName || 'นักเรียน',
      authorPhoto: authStore.user.photoURL || null,
      loTags: newHelpRequest.loCode ? [newHelpRequest.loCode] : [],
      urgency: newHelpRequest.urgency,
      createdAt: serverTimestamp()
    })

    showHelpRequest.value = false
    newHelpRequest.topic = ''
    newHelpRequest.description = ''
    newHelpRequest.loCode = ''
    newHelpRequest.urgency = 'medium'
    
    alert('ส่งคำขอความช่วยเหลือแล้ว! รอผู้ช่วยเหลือ')
    loadFeed()
  } catch (error) {
    console.error('Error submitting help request:', error)
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
  } finally {
    submittingHelp.value = false
  }
}

// Data Loading
const loadFeed = async () => {
  try {
    const feedQuery = query(
      collection(db, 'activityFeed'),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    const snapshot = await getDocs(feedQuery)
    feedItems.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading feed:', error)
  }
}

const loadDiscussions = async () => {
  try {
    const discQuery = query(
      collection(db, 'discussions'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    const snapshot = await getDocs(discQuery)
    discussions.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading discussions:', error)
  }
}

const loadSharedAnswers = async () => {
  try {
    const sharedQuery = query(
      collection(db, 'sharedContent'),
      where('type', '==', 'answer'),
      orderBy('totalScore', 'desc'),
      limit(20)
    )
    const snapshot = await getDocs(sharedQuery)
    sharedAnswers.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading shared answers:', error)
  }
}

const loadMyGroups = async () => {
  if (!authStore.user?.uid) return
  try {
    const groupsQuery = query(
      collection(db, 'communities'),
      where('memberIds', 'array-contains', authStore.user.uid),
      where('type', '==', 'study_group'),
      limit(10)
    )
    const snapshot = await getDocs(groupsQuery)
    myGroups.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading groups:', error)
  }
}

const loadHelpRequests = async () => {
  try {
    const helpQuery = query(
      collection(db, 'helpRequests'),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc'),
      limit(10)
    )
    const snapshot = await getDocs(helpQuery)
    nearbyHelpRequests.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading help requests:', error)
  }
}

const loadWeakLOs = async () => {
  if (!authStore.user?.uid) return
  try {
    // Get student progress to find weak LOs
    const progressQuery = query(
      collection(db, 'studentProgress'),
      where('studentId', '==', authStore.user.uid)
    )
    const snapshot = await getDocs(progressQuery)
    
    const allWeakLOs = []
    snapshot.docs.forEach(doc => {
      const data = doc.data()
      if (data.loProgress) {
        Object.entries(data.loProgress).forEach(([code, progress]) => {
          if (progress < 60) { // Less than 60% is weak
            allWeakLOs.push({
              code,
              name: code, // Would need to look up actual name
              progress: progress
            })
          }
        })
      }
    })
    
    weakLOs.value = allWeakLOs.sort((a, b) => a.progress - b.progress).slice(0, 10)
  } catch (error) {
    console.error('Error loading weak LOs:', error)
  }
}

const loadMyCourses = async () => {
  if (!authStore.user?.uid) return
  try {
    const coursesQuery = query(
      collection(db, 'courses'),
      limit(20)
    )
    const snapshot = await getDocs(coursesQuery)
    myCourses.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Extract LOs from courses
    const los = []
    myCourses.value.forEach(course => {
      if (course.learningOutcomes) {
        course.learningOutcomes.forEach(lo => {
          los.push({
            code: lo.code || lo,
            name: lo.name || lo.description || lo
          })
        })
      }
    })
    availableLOs.value = los
  } catch (error) {
    console.error('Error loading courses:', error)
  }
}

const loadSuggestedMentors = async () => {
  if (!authStore.user?.uid || weakLOs.value.length === 0) return
  try {
    // Find students with high scores in the weak LOs
    const weakLOCodes = weakLOs.value.map(lo => lo.code)
    
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      limit(20)
    )
    const snapshot = await getDocs(usersQuery)
    
    const potentialMentors = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => user.id !== authStore.user.uid)
      .filter(user => user.strongLOs?.some(lo => weakLOCodes.includes(lo)))
      .slice(0, 5)
    
    suggestedMentors.value = potentialMentors
  } catch (error) {
    console.error('Error loading mentors:', error)
  }
}

const loadStats = async () => {
  try {
    // Count active users (simplified)
    const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student'), limit(1000)))
    stats.totalMembers = usersSnap.size

    // Count today's discussions
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const discSnap = await getDocs(query(
      collection(db, 'discussions'),
      where('createdAt', '>=', today),
      limit(100)
    ))
    stats.activeDiscussions = discSnap.size

    // Count open help requests
    const helpSnap = await getDocs(query(
      collection(db, 'helpRequests'),
      where('status', '==', 'open'),
      limit(100)
    ))
    stats.helpRequests = helpSnap.size
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

// Initialize
onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      loadFeed(),
      loadDiscussions(),
      loadSharedAnswers(),
      loadMyGroups(),
      loadHelpRequests(),
      loadMyCourses(),
      loadWeakLOs(),
      loadStats()
    ])
    
    // Load mentors after we have weak LOs
    await loadSuggestedMentors()
  } catch (error) {
    console.error('Error initializing hub:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.student-community-hub {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Header */
.hub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  border-radius: 16px;
  margin-bottom: 24px;
}

.hub-header h1 {
  font-size: 28px;
  margin: 0;
}

.subtitle {
  opacity: 0.9;
  margin: 4px 0 0 0;
}

.header-stats {
  display: flex;
  gap: 30px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: bold;
}

.stat-label {
  font-size: 12px;
  opacity: 0.9;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.action-btn.secondary {
  background: var(--card-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.action-btn.secondary:hover {
  background: var(--bg-tertiary);
  border-color: #667eea;
}

/* Main Content */
.hub-content {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 24px;
}

.main-column {
  min-width: 0;
}

/* Tabs */
.content-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  background: var(--card-bg);
  padding: 8px;
  border-radius: 12px;
  box-shadow: var(--shadow);
}

.tab-btn {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.tab-btn:hover:not(.active) {
  background: var(--bg-tertiary);
}

/* Tab Content */
.tab-content {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow);
}

/* Feed */
.feed-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feed-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-radius: 10px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.feed-item:hover {
  background: var(--bg-tertiary);
  transform: translateX(4px);
}

.feed-avatar img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.feed-content {
  flex: 1;
  min-width: 0;
}

.feed-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.author-name {
  font-weight: 600;
  color: var(--text-primary);
}

.feed-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.feed-type-badge {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  margin-bottom: 8px;
}

.feed-type-badge.discussion { background: #e3f2fd; color: #1976d2; }
.feed-type-badge.help_request { background: #ffebee; color: #c62828; }
.feed-type-badge.shared_answer { background: #e8f5e9; color: #2e7d32; }
.feed-type-badge.study_session { background: #fff3e0; color: #ef6c00; }
.feed-type-badge.achievement { background: #fce4ec; color: #c2185b; }

.feed-text {
  margin: 0 0 8px 0;
  color: var(--text-primary);
  line-height: 1.5;
}

.feed-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}

.lo-tags {
  color: #667eea;
}

/* Discussions */
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--card-bg);
  color: var(--text-primary);
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
  border-radius: 10px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.discussion-card:hover {
  background: var(--bg-tertiary);
}

.disc-status {
  font-size: 20px;
}

.disc-content {
  flex: 1;
}

.disc-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.disc-preview {
  margin: 0 0 12px 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.disc-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary);
}

.disc-author {
  display: flex;
  align-items: center;
  gap: 6px;
}

.disc-author img {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

/* Shared Answers */
.shared-header {
  margin-bottom: 16px;
}

.shared-description {
  color: var(--text-secondary);
  margin: 0;
}

.shared-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.shared-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.shared-score {
  text-align: center;
  padding: 12px;
  background: var(--card-bg);
  border-radius: 10px;
  min-width: 70px;
}

.score-value {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: #667eea;
}

.score-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.shared-content {
  flex: 1;
}

.shared-question, .shared-answer {
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.q-label, .a-label {
  font-weight: 600;
  color: #667eea;
}

.shared-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shared-author {
  font-size: 12px;
  color: var(--text-secondary);
}

.btn-view {
  padding: 6px 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

/* Sidebar */
.sidebar-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow);
}

.sidebar-card.highlight {
  background: linear-gradient(135deg, #fff9c4 0%, #fff59d 100%);
}

.card-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.card-empty {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}

.card-empty p {
  margin: 0 0 12px 0;
}

.card-link {
  display: block;
  text-align: center;
  margin-top: 12px;
  color: #667eea;
  text-decoration: none;
  font-size: 14px;
}

/* Groups List */
.groups-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.group-item:hover {
  background: var(--bg-tertiary);
}

.group-emoji {
  font-size: 24px;
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-name {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
}

.group-members {
  font-size: 12px;
  color: var(--text-secondary);
}

.unread-badge {
  background: #f44336;
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

/* Help List */
.help-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.help-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.help-item:hover {
  background: var(--bg-tertiary);
}

.help-urgency {
  font-size: 18px;
}

.help-info {
  flex: 1;
}

.help-topic {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
}

.help-lo {
  font-size: 12px;
  color: #667eea;
}

/* Mentors List */
.mentors-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mentor-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  background: var(--bg-secondary);
}

.mentor-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.mentor-info {
  flex: 1;
  min-width: 0;
}

.mentor-name {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
}

.mentor-strength {
  font-size: 12px;
  color: var(--text-secondary);
}

.btn-connect {
  padding: 6px 10px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  white-space: nowrap;
}

/* Weak LO List */
.weak-lo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.weak-lo-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lo-code {
  font-weight: 600;
  color: var(--text-primary);
  min-width: 60px;
  font-size: 13px;
}

.lo-bar {
  flex: 1;
  height: 8px;
  background: rgba(0,0,0,0.1);
  border-radius: 4px;
  overflow: hidden;
}

.lo-progress {
  height: 100%;
  background: linear-gradient(90deg, #f44336, #ff9800);
  border-radius: 4px;
}

.btn-find-help {
  padding: 4px 8px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  white-space: nowrap;
}

/* Buttons */
.btn-small {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.btn-primary {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 10px 20px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
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
  font-size: 20px;
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
  color: var(--text-primary);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  background: var(--input-bg);
  color: var(--text-primary);
}

.form-group textarea {
  resize: vertical;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-group.half {
  flex: 1;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

/* Empty & Loading States */
.empty-state, .loading-state {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
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

/* Responsive */
@media (max-width: 1024px) {
  .hub-content {
    grid-template-columns: 1fr;
  }
  
  .sidebar-column {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .hub-header {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }
  
  .quick-actions {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
  }
  
  .sidebar-column {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}

</style>