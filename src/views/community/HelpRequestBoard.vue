<template>
  <div class="help-board">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="$router.back()">← กลับ</button>
        <h1>🆘 กระดานขอความช่วยเหลือ</h1>
      </div>
      <button class="request-btn" @click="showRequestModal = true">
        ✋ ขอความช่วยเหลือ
      </button>
    </div>

    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat-card">
        <span class="stat-icon">🆘</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.openRequests }}</span>
          <span class="stat-label">รอช่วยเหลือ</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">🤝</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.helpedToday }}</span>
          <span class="stat-label">ช่วยวันนี้</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">⭐</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.topHelpers }}</span>
          <span class="stat-label">ผู้ช่วยยอดเยี่ยม</span>
        </div>
      </div>
      <div class="stat-card highlight">
        <span class="stat-icon">🎖️</span>
        <div class="stat-info">
          <span class="stat-value">{{ myHelpCount }}</span>
          <span class="stat-label">ฉันช่วยไปแล้ว</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input v-model="searchQuery" type="text" placeholder="ค้นหาหัวข้อ..." />
      </div>
      <select v-model="filterUrgency" class="filter-select">
        <option value="">ทุกความเร่งด่วน</option>
        <option value="high">🔴 เร่งด่วนมาก</option>
        <option value="medium">🟡 ปานกลาง</option>
        <option value="low">🟢 ไม่เร่งด่วน</option>
      </select>
      <select v-model="filterLO" class="filter-select">
        <option value="">ทุก LO</option>
        <option v-for="lo in availableLOs" :key="lo.code" :value="lo.code">
          {{ lo.code }}
        </option>
      </select>
      <select v-model="filterStatus" class="filter-select">
        <option value="open">🆘 รอช่วยเหลือ</option>
        <option value="in_progress">🤝 กำลังช่วย</option>
        <option value="resolved">✅ แก้ไขแล้ว</option>
        <option value="">ทั้งหมด</option>
      </select>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button 
        :class="['tab', { active: activeTab === 'all' }]"
        @click="activeTab = 'all'"
      >
        🌐 ทั้งหมด
      </button>
      <button 
        :class="['tab', { active: activeTab === 'my-lo' }]"
        @click="activeTab = 'my-lo'"
      >
        🎯 LO ที่ฉันเก่ง
      </button>
      <button 
        :class="['tab', { active: activeTab === 'my-requests' }]"
        @click="activeTab = 'my-requests'"
      >
        📤 คำขอของฉัน
      </button>
      <button 
        :class="['tab', { active: activeTab === 'my-offers' }]"
        @click="activeTab = 'my-offers'"
      >
        🤝 ที่ฉันเสนอช่วย
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Help Requests List -->
    <div v-else class="requests-list">
      <div v-if="filteredRequests.length === 0" class="empty-state">
        <span class="empty-icon">🆘</span>
        <p v-if="activeTab === 'my-requests'">คุณยังไม่ได้ขอความช่วยเหลือ</p>
        <p v-else-if="activeTab === 'my-offers'">คุณยังไม่ได้เสนอช่วยใคร</p>
        <p v-else>ไม่มีคำขอความช่วยเหลือในตอนนี้</p>
      </div>

      <div 
        v-for="request in filteredRequests" 
        :key="request.id" 
        class="request-card"
        :class="[request.urgency, request.status]"
      >
        <!-- Urgency Badge -->
        <div class="urgency-badge" :class="request.urgency">
          {{ getUrgencyBadge(request.urgency) }}
        </div>

        <!-- Request Content -->
        <div class="request-main">
          <div class="request-header">
            <img :src="request.requesterPhoto || '/default-avatar.png'" class="requester-avatar" />
            <div class="requester-info">
              <span class="requester-name">{{ request.requesterName }}</span>
              <span class="request-time">{{ formatTime(request.createdAt) }}</span>
            </div>
            <span class="status-badge" :class="request.status">
              {{ getStatusBadge(request.status) }}
            </span>
          </div>

          <h3 class="request-topic">{{ request.topic }}</h3>
          <p class="request-desc">{{ request.description }}</p>

          <div class="request-meta">
            <span v-if="request.loCode" class="meta-item lo">
              🎯 {{ request.loCode }} {{ request.loName ? `- ${truncate(request.loName, 30)}` : '' }}
            </span>
            <span v-if="request.courseName" class="meta-item course">
              📚 {{ request.courseName }}
            </span>
            <span class="meta-item offers">
              🤝 {{ request.offerCount || 0 }} คนเสนอช่วย
            </span>
          </div>

          <!-- Offers Preview (if any) -->
          <div v-if="request.offers?.length" class="offers-preview">
            <p class="offers-title">ผู้เสนอช่วยเหลือ:</p>
            <div class="offers-avatars">
              <img 
                v-for="offer in request.offers.slice(0, 5)" 
                :key="offer.id"
                :src="offer.helperPhoto || '/default-avatar.png'"
                :title="offer.helperName"
                class="offer-avatar"
              />
              <span v-if="request.offers.length > 5" class="more-offers">
                +{{ request.offers.length - 5 }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="request-actions">
            <template v-if="isMyRequest(request)">
              <button 
                v-if="request.status === 'open'" 
                class="btn-cancel"
                @click="cancelRequest(request)"
              >
                ยกเลิก
              </button>
              <button 
                v-if="request.offers?.length" 
                class="btn-view-offers"
                @click="viewOffers(request)"
              >
                ดูผู้เสนอช่วย ({{ request.offers.length }})
              </button>
              <button 
                v-if="request.status === 'in_progress'"
                class="btn-resolve"
                @click="resolveRequest(request)"
              >
                ✅ แก้ไขแล้ว
              </button>
            </template>
            <template v-else>
              <button 
                v-if="request.status === 'open' && !hasOffered(request)"
                class="btn-offer"
                @click="offerHelp(request)"
              >
                🤝 ฉันช่วยได้
              </button>
              <span v-if="hasOffered(request)" class="offered-badge">
                ✅ เสนอช่วยแล้ว
              </span>
            </template>
            <button class="btn-detail" @click="viewDetail(request)">
              ดูรายละเอียด
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Request Modal -->
    <div v-if="showRequestModal" class="modal-overlay" @click.self="showRequestModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>✋ ขอความช่วยเหลือ</h2>
          <button class="close-btn" @click="showRequestModal = false">×</button>
        </div>
        <form @submit.prevent="submitRequest" class="modal-form">
          <div class="form-group">
            <label>หัวข้อที่ต้องการความช่วยเหลือ *</label>
            <input 
              v-model="newRequest.topic" 
              type="text" 
              placeholder="เช่น ไม่เข้าใจการคำนวณพื้นที่วงกลม"
              required
            />
          </div>

          <div class="form-group">
            <label>รายละเอียด *</label>
            <textarea 
              v-model="newRequest.description" 
              rows="4"
              placeholder="อธิบายว่าติดปัญหาตรงไหน ลองทำอะไรไปแล้วบ้าง..."
              required
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group half">
              <label>รายวิชา <span class="required">*</span></label>
              <select v-model="newRequest.courseId" required @change="onCourseChangeRequest">
                <option value="" disabled>-- เลือกรายวิชา --</option>
                <option v-for="course in courses" :key="course.id" :value="course.id">
                  {{ course.name }}
                </option>
              </select>
            </div>
            <div class="form-group half">
              <label>ความเร่งด่วน</label>
              <select v-model="newRequest.urgency">
                <option value="low">🟢 ไม่เร่งด่วน</option>
                <option value="medium">🟡 ปานกลาง</option>
                <option value="high">🔴 เร่งด่วนมาก</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>LO ที่เกี่ยวข้อง (เฉพาะ LO ที่ยังไม่ผ่าน)</label>
            <div v-if="!newRequest.courseId" class="lo-disabled">
              <p>🔒 เลือกรายวิชาก่อนจึงจะเลือก LO ได้</p>
            </div>
            <select v-else v-model="newRequest.loCode">
              <option value="">-- เลือก LO --</option>
              <option v-for="lo in courseWeakLOs" :key="lo.code" :value="lo.code">
                {{ lo.code }} ({{ lo.progress }}%) - {{ truncate(lo.name || '', 25) }}
              </option>
            </select>
            <p v-if="newRequest.courseId && courseWeakLOs.length === 0" class="field-hint">
              🎉 คุณผ่าน LO ทั้งหมดในวิชานี้แล้ว!
            </p>
          </div>

          <!-- Failed Assessments -->
          <div v-if="failedAssessments.length > 0" class="form-group">
            <label>📝 คำถามที่ยังไม่ผ่านเกณฑ์</label>
            <div class="failed-assessments">
              <div 
                v-for="assess in failedAssessments" 
                :key="assess.id" 
                class="failed-item"
                :class="{ selected: selectedAssessmentId === assess.id }"
                @click="selectAssessment(assess)"
              >
                <span class="failed-score">{{ assess.totalScore }}/20</span>
                <span class="failed-question">{{ truncate(assess.questionText, 60) }}</span>
              </div>
            </div>
            <p class="field-hint">💡 คลิกเลือกคำถามที่ต้องการความช่วยเหลือ</p>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showRequestModal = false">
              ยกเลิก
            </button>
            <button type="submit" class="btn-primary" :disabled="submitting">
              {{ submitting ? 'กำลังส่ง...' : 'ส่งคำขอ' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Offer Help Modal -->
    <div v-if="showOfferModal" class="modal-overlay" @click.self="showOfferModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>🤝 เสนอความช่วยเหลือ</h2>
          <button class="close-btn" @click="showOfferModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="offer-request-info">
            <p class="offer-label">คุณกำลังจะช่วย:</p>
            <h3>{{ selectedRequest?.topic }}</h3>
            <p>โดย {{ selectedRequest?.requesterName }}</p>
          </div>
          <form @submit.prevent="submitOffer">
            <div class="form-group">
              <label>ข้อความถึงผู้ขอ (ไม่บังคับ)</label>
              <textarea 
                v-model="offerMessage" 
                rows="3"
                placeholder="บอกว่าคุณจะช่วยได้อย่างไร..."
              ></textarea>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="showOfferModal = false">
                ยกเลิก
              </button>
              <button type="submit" class="btn-primary" :disabled="submittingOffer">
                {{ submittingOffer ? 'กำลังส่ง...' : 'ยืนยันเสนอช่วย' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- View Offers Modal -->
    <div v-if="showOffersListModal" class="modal-overlay" @click.self="showOffersListModal = false">
      <div class="modal-content large">
        <div class="modal-header">
          <h2>🤝 ผู้เสนอช่วยเหลือ</h2>
          <button class="close-btn" @click="showOffersListModal = false">×</button>
        </div>
        <div class="modal-body">
          <div v-if="selectedRequest?.offers?.length === 0" class="empty-state small">
            <p>ยังไม่มีผู้เสนอช่วยเหลือ</p>
          </div>
          <div v-else class="offers-list">
            <div 
              v-for="offer in selectedRequest?.offers" 
              :key="offer.id" 
              class="offer-card"
            >
              <img :src="offer.helperPhoto || '/default-avatar.png'" class="offer-avatar-large" />
              <div class="offer-info">
                <span class="offer-name">{{ offer.helperName }}</span>
                <p class="offer-message">{{ offer.message || 'ไม่มีข้อความ' }}</p>
                <span class="offer-time">{{ formatTime(offer.createdAt) }}</span>
              </div>
              <div class="offer-actions">
                <button 
                  v-if="offer.status === 'pending'"
                  class="btn-accept"
                  @click="acceptOffer(offer)"
                >
                  ✅ ยอมรับ
                </button>
                <span v-else-if="offer.status === 'accepted'" class="accepted-badge">
                  ✅ ยอมรับแล้ว
                </span>
              </div>
            </div>
          </div>
        </div>
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
  getDocs, addDoc, updateDoc, doc, serverTimestamp, increment 
} from 'firebase/firestore'
import { db } from '@/firebase/config'

const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(true)
const activeTab = ref('all')
const searchQuery = ref('')
const filterUrgency = ref('')
const filterLO = ref('')
const filterStatus = ref('open')

// Data
const helpRequests = ref([])
const courses = ref([])
const availableLOs = ref([])
const weakLOs = ref([])
const strongLOs = ref([])
const myOffers = ref([])
const myHelpCount = ref(0)
const failedAssessments = ref([])
const selectedAssessmentId = ref(null)

// Computed - course weak LOs
const courseWeakLOs = computed(() => {
  if (!newRequest.courseId) return []
  const course = courses.value.find(c => c.id === newRequest.courseId)
  if (!course?.learningOutcomes) return []
  
  // Filter weak LOs for this course
  return weakLOs.value.filter(weak => 
    course.learningOutcomes.some(lo => (lo.code || lo) === weak.code)
  ).map(weak => {
    const courseLO = course.learningOutcomes.find(lo => (lo.code || lo) === weak.code)
    return {
      ...weak,
      name: courseLO?.name || courseLO?.description || ''
    }
  })
})

// Stats
const stats = reactive({
  openRequests: 0,
  helpedToday: 0,
  topHelpers: 0
})

// Modals
const showRequestModal = ref(false)
const showOfferModal = ref(false)
const showOffersListModal = ref(false)
const submitting = ref(false)
const submittingOffer = ref(false)
const selectedRequest = ref(null)
const offerMessage = ref('')

// New request form
const newRequest = reactive({
  topic: '',
  description: '',
  loCode: '',
  urgency: 'medium',
  courseId: ''
})

// Computed
const filteredRequests = computed(() => {
  let result = helpRequests.value

  // Tab filter
  if (activeTab.value === 'my-requests') {
    result = result.filter(r => r.requesterId === authStore.user?.uid)
  } else if (activeTab.value === 'my-offers') {
    const myOfferIds = myOffers.value.map(o => o.requestId)
    result = result.filter(r => myOfferIds.includes(r.id))
  } else if (activeTab.value === 'my-lo') {
    result = result.filter(r => 
      r.loCode && strongLOs.value.includes(r.loCode)
    )
  }

  // Search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(r => 
      r.topic.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    )
  }

  // Urgency filter
  if (filterUrgency.value) {
    result = result.filter(r => r.urgency === filterUrgency.value)
  }

  // LO filter
  if (filterLO.value) {
    result = result.filter(r => r.loCode === filterLO.value)
  }

  // Status filter
  if (filterStatus.value) {
    result = result.filter(r => r.status === filterStatus.value)
  }

  return result
})

// Methods
const onCourseChangeRequest = async () => {
  // Clear LO selection
  newRequest.loCode = ''
  selectedAssessmentId.value = null
  
  // Load failed assessments for this course
  if (newRequest.courseId && authStore.user?.uid) {
    await loadFailedAssessments(newRequest.courseId)
  } else {
    failedAssessments.value = []
  }
}

const selectAssessment = (assess) => {
  selectedAssessmentId.value = assess.id
  // Pre-fill topic with question
  if (!newRequest.topic) {
    newRequest.topic = `ขอความช่วยเหลือ: ${truncate(assess.questionText, 50)}`
  }
  // Select matching LO if available
  if (assess.loCode && courseWeakLOs.value.some(lo => lo.code === assess.loCode)) {
    newRequest.loCode = assess.loCode
  }
}

const loadFailedAssessments = async (courseId) => {
  try {
    const assessQuery = query(
      collection(db, 'assessments'),
      where('studentId', '==', authStore.user.uid),
      where('courseId', '==', courseId),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    const snapshot = await getDocs(assessQuery)
    
    // Filter assessments with score < 16
    failedAssessments.value = snapshot.docs
      .map(doc => {
        const data = doc.data()
        const totalScore = (data.rubricScores?.analysis || 0) + 
                          (data.rubricScores?.reasoning || 0) + 
                          (data.rubricScores?.creativity || 0) + 
                          (data.rubricScores?.evidence || 0)
        return {
          id: doc.id,
          ...data,
          totalScore,
          loCode: data.loAssessment?.passedLOs?.[0] || data.targetLO || null
        }
      })
      .filter(a => a.totalScore < 16)
      .slice(0, 5) // Show max 5 recent failed assessments
  } catch (error) {
    console.error('Error loading failed assessments:', error)
    failedAssessments.value = []
  }
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return 'เมื่อกี้'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชม.ที่แล้ว`
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

const truncate = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const getUrgencyBadge = (urgency) => {
  const badges = {
    high: '🔴 เร่งด่วน',
    medium: '🟡 ปานกลาง',
    low: '🟢 ไม่เร่งด่วน'
  }
  return badges[urgency] || '🟡 ปานกลาง'
}

const getStatusBadge = (status) => {
  const badges = {
    open: '🆘 รอช่วยเหลือ',
    in_progress: '🤝 กำลังช่วย',
    resolved: '✅ แก้ไขแล้ว'
  }
  return badges[status] || '🆘 รอช่วยเหลือ'
}

const isMyRequest = (request) => {
  return request.requesterId === authStore.user?.uid
}

const hasOffered = (request) => {
  return myOffers.value.some(o => o.requestId === request.id)
}

const viewDetail = (request) => {
  router.push(`/community/help-board/${request.id}`)
}

const offerHelp = (request) => {
  selectedRequest.value = request
  offerMessage.value = ''
  showOfferModal.value = true
}

const viewOffers = async (request) => {
  selectedRequest.value = request
  // Load offers for this request
  try {
    const offersQuery = query(
      collection(db, 'helpRequests', request.id, 'offers'),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(offersQuery)
    selectedRequest.value.offers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading offers:', error)
  }
  showOffersListModal.value = true
}

const submitRequest = async () => {
  if (!newRequest.topic.trim() || !newRequest.description.trim()) {
    alert('กรุณากรอกหัวข้อและรายละเอียด')
    return
  }
  if (!newRequest.courseId) {
    alert('กรุณาเลือกรายวิชา')
    return
  }
  
  submitting.value = true
  try {
    const selectedCourse = courses.value.find(c => c.id === newRequest.courseId)
    const loData = courseWeakLOs.value.find(lo => lo.code === newRequest.loCode)
    const linkedAssessment = failedAssessments.value.find(a => a.id === selectedAssessmentId.value)

    await addDoc(collection(db, 'helpRequests'), {
      topic: newRequest.topic.trim(),
      description: newRequest.description.trim(),
      loCode: newRequest.loCode || null,
      loName: loData?.name || null,
      urgency: newRequest.urgency,
      courseId: newRequest.courseId,
      courseName: selectedCourse?.name || null,
      // Link to assessment if selected
      linkedAssessmentId: selectedAssessmentId.value || null,
      linkedQuestionText: linkedAssessment?.questionText || null,
      linkedScore: linkedAssessment?.totalScore || null,
      requesterId: authStore.user.uid,
      requesterName: authStore.user.displayName || 'นักเรียน',
      requesterPhoto: authStore.user.photoURL || null,
      status: 'open',
      offerCount: 0,
      createdAt: serverTimestamp()
    })

    showRequestModal.value = false
    newRequest.topic = ''
    newRequest.description = ''
    newRequest.loCode = ''
    newRequest.urgency = 'medium'
    newRequest.courseId = ''
    selectedAssessmentId.value = null
    failedAssessments.value = []
    
    loadHelpRequests()
    alert('ส่งคำขอความช่วยเหลือแล้ว!')
  } catch (error) {
    console.error('Error submitting request:', error)
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
  } finally {
    submitting.value = false
  }
}

const submitOffer = async () => {
  if (!selectedRequest.value) return
  
  submittingOffer.value = true
  try {
    await addDoc(collection(db, 'helpRequests', selectedRequest.value.id, 'offers'), {
      helperId: authStore.user.uid,
      helperName: authStore.user.displayName || 'นักเรียน',
      helperPhoto: authStore.user.photoURL || null,
      message: offerMessage.value.trim(),
      status: 'pending',
      createdAt: serverTimestamp()
    })

    // Update offer count
    await updateDoc(doc(db, 'helpRequests', selectedRequest.value.id), {
      offerCount: increment(1)
    })

    showOfferModal.value = false
    myOffers.value.push({ requestId: selectedRequest.value.id })
    loadHelpRequests()
    alert('เสนอความช่วยเหลือแล้ว! รอผู้ขอตอบรับ')
  } catch (error) {
    console.error('Error submitting offer:', error)
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
  } finally {
    submittingOffer.value = false
  }
}

const acceptOffer = async (offer) => {
  try {
    // Update offer status
    await updateDoc(
      doc(db, 'helpRequests', selectedRequest.value.id, 'offers', offer.id),
      { status: 'accepted' }
    )

    // Update request status
    await updateDoc(doc(db, 'helpRequests', selectedRequest.value.id), {
      status: 'in_progress',
      helperId: offer.helperId,
      helperName: offer.helperName
    })

    offer.status = 'accepted'
    alert('ยอมรับผู้ช่วยเหลือแล้ว!')
    loadHelpRequests()
  } catch (error) {
    console.error('Error accepting offer:', error)
    alert('เกิดข้อผิดพลาด')
  }
}

const cancelRequest = async (request) => {
  if (!confirm('ยืนยันยกเลิกคำขอนี้?')) return
  
  try {
    await updateDoc(doc(db, 'helpRequests', request.id), {
      status: 'cancelled'
    })
    loadHelpRequests()
  } catch (error) {
    console.error('Error cancelling request:', error)
  }
}

const resolveRequest = async (request) => {
  try {
    await updateDoc(doc(db, 'helpRequests', request.id), {
      status: 'resolved',
      resolvedAt: serverTimestamp()
    })
    loadHelpRequests()
    alert('ขอบคุณ! บันทึกว่าแก้ไขปัญหาแล้ว')
  } catch (error) {
    console.error('Error resolving request:', error)
  }
}

// Load Data
const loadHelpRequests = async () => {
  try {
    const requestsQuery = query(
      collection(db, 'helpRequests'),
      orderBy('createdAt', 'desc'),
      limit(100)
    )
    const snapshot = await getDocs(requestsQuery)
    helpRequests.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Count stats
    stats.openRequests = helpRequests.value.filter(r => r.status === 'open').length
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    stats.helpedToday = helpRequests.value.filter(r => {
      const resolved = r.resolvedAt?.toDate?.()
      return resolved && resolved >= today
    }).length
  } catch (error) {
    console.error('Error loading help requests:', error)
  }
}

const loadMyOffers = async () => {
  if (!authStore.user?.uid) return
  try {
    // This is a simplified approach - in production you'd want a better query
    const offersQuery = query(
      collection(db, 'helpRequests'),
      limit(100)
    )
    const snapshot = await getDocs(offersQuery)
    
    const offers = []
    for (const docSnap of snapshot.docs) {
      const offersSubQuery = query(
        collection(db, 'helpRequests', docSnap.id, 'offers'),
        where('helperId', '==', authStore.user.uid)
      )
      const offersSnap = await getDocs(offersSubQuery)
      offersSnap.docs.forEach(o => {
        offers.push({ id: o.id, requestId: docSnap.id, ...o.data() })
      })
    }
    myOffers.value = offers
    myHelpCount.value = offers.filter(o => o.status === 'accepted').length
  } catch (error) {
    console.error('Error loading my offers:', error)
  }
}

const loadCourses = async () => {
  try {
    const coursesQuery = query(collection(db, 'courses'), limit(20))
    const snapshot = await getDocs(coursesQuery)
    courses.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Extract LOs
    const los = []
    courses.value.forEach(course => {
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

const loadStudentLOs = async () => {
  if (!authStore.user?.uid) return
  try {
    const progressQuery = query(
      collection(db, 'studentProgress'),
      where('studentId', '==', authStore.user.uid)
    )
    const snapshot = await getDocs(progressQuery)
    
    const weak = []
    const strong = []
    
    snapshot.docs.forEach(doc => {
      const data = doc.data()
      if (data.loProgress) {
        Object.entries(data.loProgress).forEach(([code, progress]) => {
          if (progress < 60) {
            weak.push({ code, progress })
          } else if (progress >= 80) {
            strong.push(code)
          }
        })
      }
    })
    
    weakLOs.value = weak
    strongLOs.value = strong
  } catch (error) {
    console.error('Error loading student LOs:', error)
  }
}

// Initialize
onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      loadHelpRequests(),
      loadCourses(),
      loadStudentLOs(),
      loadMyOffers()
    ])
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.help-board {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;

  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  padding: 8px 16px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-primary);
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
}

.request-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}

/* Stats Bar */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow);
}

.stat-card.highlight {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-icon {
  font-size: 28px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
}

/* Filters */
.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 200px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.search-box input {
  width: 100%;
  padding: 12px 12px 12px 40px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 14px;
  box-sizing: border-box;
  background: var(--input-bg);
  color: var(--text-primary);
}

.filter-select {
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 14px;
  background: var(--card-bg);
  color: var(--text-primary);
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: var(--card-bg);
  padding: 8px;
  border-radius: 12px;
  box-shadow: var(--shadow);
  overflow-x: auto;
}

.tab {
  padding: 10px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
}

.tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* Requests List */
.requests-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.request-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow);
  position: relative;
  border-left: 4px solid #ccc;
}

.request-card.high { border-left-color: #f44336; }
.request-card.medium { border-left-color: #ff9800; }
.request-card.low { border-left-color: #4caf50; }

.request-card.resolved {
  opacity: 0.7;
  background: var(--bg-tertiary);
}

.urgency-badge {
  position: absolute;
  top: -8px;
  right: 20px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.urgency-badge.high { background: #ffebee; color: #c62828; }
.urgency-badge.medium { background: #fff3e0; color: #ef6c00; }
.urgency-badge.low { background: #e8f5e9; color: #2e7d32; }

.request-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.requester-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.requester-info {
  flex: 1;
}

.requester-name {
  display: block;
  font-weight: 600;
}

.request-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
}

.status-badge.open { background: #fff3e0; color: #ef6c00; }
.status-badge.in_progress { background: #e3f2fd; color: #1976d2; }
.status-badge.resolved { background: #e8f5e9; color: #2e7d32; }

.request-topic {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.request-desc {
  margin: 0 0 16px 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.request-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.meta-item {
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.meta-item.lo { background: #e8eaf6; color: #3f51b5; }
.meta-item.course { background: #e0f2f1; color: #00796b; }

/* Offers Preview */
.offers-preview {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 10px;
  margin-bottom: 16px;
}

.offers-title {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.offers-avatars {
  display: flex;
  align-items: center;
}

.offer-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid white;
  margin-left: -8px;
}

.offer-avatar:first-child {
  margin-left: 0;
}

.more-offers {
  margin-left: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* Request Actions */
.request-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-offer {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-view-offers, .btn-detail {
  padding: 10px 16px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-resolve {
  padding: 10px 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-cancel {
  padding: 10px 16px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.offered-badge {
  padding: 10px 16px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 8px;
  font-size: 13px;
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

.modal-content.large {
  max-width: 600px;
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

.modal-form, .modal-body {
  padding: 20px;
}

.offer-request-info {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 10px;
  margin-bottom: 16px;
}

.offer-label {
  margin: 0 0 8px 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.offer-request-info h3 {
  margin: 0 0 4px 0;
}

/* Offers List in Modal */
.offers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.offer-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.offer-avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.offer-info {
  flex: 1;
}

.offer-name {
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.offer-message {
  margin: 0 0 4px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.offer-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.btn-accept {
  padding: 8px 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  align-self: center;
}

.accepted-badge {
  color: #4caf50;
  font-size: 13px;
}

/* Form */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
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

.btn-primary {
  padding: 12px 24px;
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
  padding: 12px 24px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* States */
.empty-state, .loading-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state.small {
  padding: 30px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}

/* LO Disabled & Required */
.lo-disabled {
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  text-align: center;
}

.lo-disabled p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.required {
  color: #ef5350;
}

.field-hint {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

/* Failed Assessments */
.failed-assessments {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.failed-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.failed-item:hover {
  background: var(--bg-secondary);
}

.failed-item.selected {
  border-color: #667eea;
  background: #e8eaf6;
}

.failed-score {
  padding: 4px 8px;
  background: #ffebee;
  color: #c62828;
  border-radius: 6px;
  font-weight: bold;
  font-size: 13px;
  white-space: nowrap;
}

.failed-question {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
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
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }

  .filters-bar {
    flex-direction: column;
  }

  .tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }
}

</style>