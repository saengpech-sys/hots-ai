<template>
  <div class="question-collab">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="$router.push('/community')">← กลับ</button>
        <h1>💡 ร่วมสร้างคำถาม HOTS</h1>
      </div>
      <button class="btn-new" @click="showNewModal = true">+ สร้างคำถามใหม่</button>
    </div>

    <!-- Stats -->
    <div class="stats-bar">
      <div class="stat">
        <span class="stat-icon">💡</span>
        <span class="stat-value">{{ stats.totalQuestions }}</span>
        <span class="stat-label">คำถามทั้งหมด</span>
      </div>
      <div class="stat">
        <span class="stat-icon">👥</span>
        <span class="stat-value">{{ stats.contributors }}</span>
        <span class="stat-label">ผู้ร่วมสร้าง</span>
      </div>
      <div class="stat">
        <span class="stat-icon">✅</span>
        <span class="stat-value">{{ stats.approved }}</span>
        <span class="stat-label">ผ่านการรับรอง</span>
      </div>
      <div class="stat">
        <span class="stat-icon">⬇️</span>
        <span class="stat-value">{{ stats.uses }}</span>
        <span class="stat-label">นำไปใช้</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <input v-model="searchQuery" type="text" placeholder="🔍 ค้นหาคำถาม..." class="search-input" />
      <select v-model="selectedCourse">
        <option value="">ทุกรายวิชา</option>
        <option v-for="course in courses" :key="course.id" :value="course.id">
          {{ course.courseName }}
        </option>
      </select>
      <select v-model="selectedDimension">
        <option value="">ทุกมิติ</option>
        <option value="analysis">🔍 Analysis</option>
        <option value="reasoning">🧠 Reasoning</option>
        <option value="creativity">💡 Creativity</option>
        <option value="evidence">📊 Evidence</option>
      </select>
      <select v-model="selectedStatus">
        <option value="">ทุกสถานะ</option>
        <option value="draft">📝 ร่าง</option>
        <option value="review">🔄 รอรีวิว</option>
        <option value="approved">✅ รับรองแล้ว</option>
      </select>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', { active: activeTab === 'all' }]" @click="activeTab = 'all'">
        📚 ทั้งหมด
      </button>
      <button :class="['tab', { active: activeTab === 'mine' }]" @click="activeTab = 'mine'">
        ✍️ ของฉัน
      </button>
      <button :class="['tab', { active: activeTab === 'collab' }]" @click="activeTab = 'collab'">
        🤝 ร่วมสร้าง
      </button>
      <button :class="['tab', { active: activeTab === 'review' }]" @click="activeTab = 'review'">
        🔍 รอรีวิว
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Questions List -->
    <div v-else class="questions-list">
      <div v-for="q in filteredQuestions" :key="q.id" class="question-card">
        <div class="card-header">
          <div class="header-left">
            <span class="subject-badge">{{ q.courseName || 'ไม่ระบุ' }}</span>
            <span class="status-badge" :class="q.status">{{ getStatusName(q.status) }}</span>
          </div>
          <div class="dimensions">
            <span v-for="dim in q.dimensions" :key="dim" class="dim-tag" :class="dim">
              {{ getDimensionEmoji(dim) }}
            </span>
          </div>
        </div>

        <p class="question-text">{{ q.text || q.questionText }}</p>

        <div class="question-meta">
          <div class="meta-item">
            <span class="meta-label">LO:</span>
            <span v-for="lo in q.relatedLOs?.slice(0, 3)" :key="lo" class="lo-tag">{{ lo }}</span>
          </div>
          <div class="meta-item" v-if="q.expectedLevel">
            <span class="meta-label">ระดับ:</span>
            <span class="level-tag">{{ q.expectedLevel }}</span>
          </div>
        </div>

        <div class="card-footer">
          <div class="author-info">
            <img :src="q.authorPhoto || '/default-avatar.png'" class="author-avatar" />
            <span class="author-name">{{ q.authorName }}</span>
          </div>
          <div class="question-stats">
            <span>❤️ {{ q.likesCount || 0 }}</span>
            <span>💬 {{ q.commentsCount || 0 }}</span>
            <span>⬇️ {{ q.usesCount || 0 }}</span>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn-view" @click="viewQuestion(q)">👁️ ดู</button>
          <button class="btn-edit" @click="editQuestion(q)" v-if="isOwner(q)">✏️ แก้ไข</button>
          <button class="btn-review" @click="reviewQuestion(q)" v-if="q.status === 'review'">🔍 รีวิว</button>
          <button class="btn-use" @click="useQuestion(q)" v-if="q.status === 'approved'">⬇️ นำไปใช้</button>
          <button 
            :class="['btn-like', { active: q.isLiked }]" 
            @click="toggleLike(q)"
          >
            ❤️
          </button>
        </div>
      </div>

      <div v-if="filteredQuestions.length === 0" class="empty-state">
        <span class="empty-icon">💡</span>
        <p>ไม่พบคำถาม</p>
        <button @click="showNewModal = true">สร้างคำถามแรก</button>
      </div>
    </div>

    <!-- New/Edit Question Modal -->
    <div v-if="showNewModal" class="modal-overlay" @click.self="showNewModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editingQuestion ? '✏️ แก้ไขคำถาม' : '💡 สร้างคำถาม HOTS ใหม่' }}</h2>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>วิชา</label>
            <select v-model="form.subject" required>
              <option value="math">คณิตศาสตร์</option>
              <option value="science">วิทยาศาสตร์</option>
              <option value="thai">ภาษาไทย</option>
              <option value="english">ภาษาอังกฤษ</option>
              <option value="social">สังคมศึกษา</option>
            </select>
          </div>

          <div class="form-group">
            <label>คำถาม</label>
            <textarea v-model="form.text" rows="4" placeholder="พิมพ์คำถามที่กระตุ้น HOTS..."></textarea>
          </div>

          <div class="form-group">
            <label>มิติที่เน้น (A.R.C.E.)</label>
            <div class="dimension-checkboxes">
              <label class="checkbox-item">
                <input type="checkbox" value="analysis" v-model="form.dimensions" />
                🔍 Analysis
              </label>
              <label class="checkbox-item">
                <input type="checkbox" value="reasoning" v-model="form.dimensions" />
                🧠 Reasoning
              </label>
              <label class="checkbox-item">
                <input type="checkbox" value="creativity" v-model="form.dimensions" />
                💡 Creativity
              </label>
              <label class="checkbox-item">
                <input type="checkbox" value="evidence" v-model="form.dimensions" />
                📊 Evidence
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>LO ที่เกี่ยวข้อง (คั่นด้วย ,)</label>
            <input v-model="form.relatedLOs" type="text" placeholder="เช่น LO1.1, LO2.3" />
          </div>

          <div class="form-group">
            <label>ระดับความยาก</label>
            <select v-model="form.expectedLevel">
              <option value="basic">พื้นฐาน</option>
              <option value="intermediate">ปานกลาง</option>
              <option value="advanced">ท้าทาย</option>
            </select>
          </div>

          <div class="form-group">
            <label>คำตอบแนะนำ (สำหรับครู)</label>
            <textarea v-model="form.suggestedAnswer" rows="3" placeholder="แนวคำตอบที่คาดหวัง..."></textarea>
          </div>

          <div class="form-group">
            <label>Rubric สำหรับให้คะแนน</label>
            <textarea v-model="form.rubricGuideline" rows="3" placeholder="เกณฑ์การให้คะแนน..."></textarea>
          </div>

          <div class="form-group checkbox">
            <input type="checkbox" id="allowCollab" v-model="form.allowCollab" />
            <label for="allowCollab">อนุญาตให้คนอื่นแนะนำปรับปรุง</label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">ยกเลิก</button>
          <button class="btn-draft" @click="saveAsDraft">บันทึกร่าง</button>
          <button class="btn-submit" @click="submitForReview">ส่งรีวิว</button>
        </div>
      </div>
    </div>

    <!-- View Question Modal -->
    <div v-if="showViewModal" class="modal-overlay" @click.self="showViewModal = false">
      <div class="modal-content view-modal">
        <div class="modal-header">
          <h2>📄 รายละเอียดคำถาม</h2>
          <button class="close-btn" @click="showViewModal = false">×</button>
        </div>
        <div class="modal-body" v-if="selectedQuestion">
          <div class="view-badges">
            <span class="subject-badge" :class="selectedQuestion.subject">{{ getSubjectName(selectedQuestion.subject) }}</span>
            <span class="status-badge" :class="selectedQuestion.status">{{ getStatusName(selectedQuestion.status) }}</span>
            <span v-for="dim in selectedQuestion.dimensions" :key="dim" class="dim-tag" :class="dim">
              {{ getDimensionEmoji(dim) }} {{ dim }}
            </span>
          </div>

          <div class="view-section">
            <h4>❓ คำถาม</h4>
            <p class="question-full-text">{{ selectedQuestion.text }}</p>
          </div>

          <div class="view-section" v-if="selectedQuestion.relatedLOs?.length">
            <h4>🎯 LO ที่เกี่ยวข้อง</h4>
            <div class="lo-tags">
              <span v-for="lo in selectedQuestion.relatedLOs" :key="lo" class="lo-tag">{{ lo }}</span>
            </div>
          </div>

          <div class="view-section" v-if="selectedQuestion.suggestedAnswer">
            <h4>💡 แนวคำตอบ</h4>
            <p>{{ selectedQuestion.suggestedAnswer }}</p>
          </div>

          <div class="view-section" v-if="selectedQuestion.rubricGuideline">
            <h4>📊 เกณฑ์การให้คะแนน</h4>
            <p>{{ selectedQuestion.rubricGuideline }}</p>
          </div>

          <!-- Comments Section -->
          <div class="view-section">
            <h4>💬 ความคิดเห็น & คำแนะนำ</h4>
            <div class="comments-list">
              <div v-for="comment in selectedQuestion.comments || []" :key="comment.id" class="comment-item">
                <img :src="comment.authorPhoto || '/default-avatar.png'" class="comment-avatar" />
                <div class="comment-content">
                  <span class="comment-author">{{ comment.authorName }}</span>
                  <p>{{ comment.content }}</p>
                  <span class="comment-time">{{ formatDate(comment.createdAt) }}</span>
                </div>
              </div>
              <div v-if="!selectedQuestion.comments?.length" class="no-comments">
                ยังไม่มีความคิดเห็น
              </div>
            </div>
            <div class="add-comment">
              <input v-model="newComment" type="text" placeholder="เพิ่มความคิดเห็น..." />
              <button @click="addComment">ส่ง</button>
            </div>
          </div>

          <div class="view-footer">
            <div class="author-info">
              <img :src="selectedQuestion.authorPhoto || '/default-avatar.png'" class="author-avatar" />
              <div>
                <span class="author-name">{{ selectedQuestion.authorName }}</span>
                <span class="created-date">{{ formatDate(selectedQuestion.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Review Modal -->
    <div v-if="showReviewModal" class="modal-overlay" @click.self="showReviewModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>🔍 รีวิวคำถาม</h2>
          <button class="close-btn" @click="showReviewModal = false">×</button>
        </div>
        <div class="modal-body" v-if="reviewingQuestion">
          <p class="review-question">{{ reviewingQuestion.text }}</p>

          <div class="review-criteria">
            <h4>เกณฑ์การรีวิว:</h4>
            <label class="criteria-item">
              <input type="checkbox" v-model="review.isHOTS" />
              กระตุ้น HOTS จริง (ไม่ใช่แค่ recall)
            </label>
            <label class="criteria-item">
              <input type="checkbox" v-model="review.isClear" />
              คำถามชัดเจน เข้าใจง่าย
            </label>
            <label class="criteria-item">
              <input type="checkbox" v-model="review.hasLO" />
              สอดคล้องกับ LO ที่ระบุ
            </label>
            <label class="criteria-item">
              <input type="checkbox" v-model="review.hasRubric" />
              มีเกณฑ์ให้คะแนนที่ชัดเจน
            </label>
          </div>

          <div class="form-group">
            <label>ความคิดเห็นเพิ่มเติม</label>
            <textarea v-model="review.feedback" rows="3" placeholder="ข้อเสนอแนะ..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-reject" @click="rejectQuestion">❌ ไม่ผ่าน</button>
          <button class="btn-suggest" @click="suggestChanges">💭 แนะนำแก้ไข</button>
          <button class="btn-approve" @click="approveQuestion">✅ รับรอง</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { 
  collection, query, where, orderBy, limit, 
  getDocs, addDoc, updateDoc, doc, serverTimestamp, increment 
} from 'firebase/firestore'
import { db } from '@/firebase/config'

const authStore = useAuthStore()

// State
const loading = ref(true)
const activeTab = ref('all')
const searchQuery = ref('')
const selectedCourse = ref('')
const selectedDimension = ref('')
const selectedStatus = ref('')

// Data
const questions = ref([])
const courses = ref([])

// Stats
const stats = reactive({
  totalQuestions: 0,
  contributors: 0,
  approved: 0,
  uses: 0
})

// Modals
const showNewModal = ref(false)
const showViewModal = ref(false)
const showReviewModal = ref(false)
const editingQuestion = ref(null)
const selectedQuestion = ref(null)
const reviewingQuestion = ref(null)
const newComment = ref('')

// Form
const form = reactive({
  subject: 'math',
  text: '',
  dimensions: [],
  relatedLOs: '',
  expectedLevel: 'intermediate',
  suggestedAnswer: '',
  rubricGuideline: '',
  allowCollab: true
})

// Review
const review = reactive({
  isHOTS: false,
  isClear: false,
  hasLO: false,
  hasRubric: false,
  feedback: ''
})

// Computed
const filteredQuestions = computed(() => {
  let result = [...questions.value]

  // Tab filter
  if (activeTab.value === 'mine') {
    result = result.filter(q => q.authorId === authStore.user?.uid)
  } else if (activeTab.value === 'collab') {
    result = result.filter(q => q.allowCollab && q.authorId !== authStore.user?.uid)
  } else if (activeTab.value === 'review') {
    result = result.filter(q => q.status === 'review')
  }

  // Search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(item => item.text?.toLowerCase().includes(q))
  }

  // Filters
  if (selectedCourse.value) {
    result = result.filter(q => q.courseId === selectedCourse.value)
  }

  if (selectedDimension.value) {
    result = result.filter(q => q.dimensions?.includes(selectedDimension.value))
  }

  if (selectedStatus.value) {
    result = result.filter(q => q.status === selectedStatus.value)
  }

  return result
})

// Helpers
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

const getSubjectName = (subject) => {
  const names = { math: 'คณิต', science: 'วิทย์', thai: 'ไทย', english: 'อังกฤษ', social: 'สังคม' }
  return names[subject] || subject
}

const getStatusName = (status) => {
  const names = { draft: '📝 ร่าง', review: '🔄 รอรีวิว', approved: '✅ รับรอง' }
  return names[status] || status
}

const getDimensionEmoji = (dim) => {
  const emojis = { analysis: '🔍', reasoning: '🧠', creativity: '💡', evidence: '📊' }
  return emojis[dim] || '📌'
}

const isOwner = (q) => q.authorId === authStore.user?.uid

// Actions
const closeModal = () => {
  showNewModal.value = false
  editingQuestion.value = null
  resetForm()
}

const resetForm = () => {
  form.subject = 'math'
  form.text = ''
  form.dimensions = []
  form.relatedLOs = ''
  form.expectedLevel = 'intermediate'
  form.suggestedAnswer = ''
  form.rubricGuideline = ''
  form.allowCollab = true
}

const viewQuestion = (q) => {
  selectedQuestion.value = q
  showViewModal.value = true
}

const editQuestion = (q) => {
  editingQuestion.value = q
  form.subject = q.subject
  form.text = q.text
  form.dimensions = q.dimensions || []
  form.relatedLOs = q.relatedLOs?.join(', ') || ''
  form.expectedLevel = q.expectedLevel || 'intermediate'
  form.suggestedAnswer = q.suggestedAnswer || ''
  form.rubricGuideline = q.rubricGuideline || ''
  form.allowCollab = q.allowCollab !== false
  showNewModal.value = true
}

const reviewQuestion = (q) => {
  reviewingQuestion.value = q
  review.isHOTS = false
  review.isClear = false
  review.hasLO = false
  review.hasRubric = false
  review.feedback = ''
  showReviewModal.value = true
}

const useQuestion = async (q) => {
  await updateDoc(doc(db, 'questionCollabs', q.id), {
    usesCount: increment(1)
  })
  q.usesCount = (q.usesCount || 0) + 1
  
  // Copy to clipboard
  navigator.clipboard.writeText(q.text)
  alert('คัดลอกคำถามแล้ว!')
}

const toggleLike = async (q) => {
  q.isLiked = !q.isLiked
  q.likesCount = q.isLiked ? (q.likesCount || 0) + 1 : Math.max(0, (q.likesCount || 1) - 1)
  
  await updateDoc(doc(db, 'questionCollabs', q.id), {
    likesCount: increment(q.isLiked ? 1 : -1)
  })
}

const saveAsDraft = async () => {
  await saveQuestion('draft')
}

const submitForReview = async () => {
  await saveQuestion('review')
}

const saveQuestion = async (status) => {
  if (!form.text.trim()) {
    alert('กรุณาพิมพ์คำถาม')
    return
  }

  const questionData = {
    subject: form.subject,
    text: form.text,
    dimensions: form.dimensions,
    relatedLOs: form.relatedLOs.split(',').map(lo => lo.trim()).filter(lo => lo),
    expectedLevel: form.expectedLevel,
    suggestedAnswer: form.suggestedAnswer,
    rubricGuideline: form.rubricGuideline,
    allowCollab: form.allowCollab,
    status,
    authorId: authStore.user.uid,
    authorName: authStore.user.displayName || 'ครู',
    authorPhoto: authStore.user.photoURL,
    likesCount: 0,
    commentsCount: 0,
    usesCount: 0,
    updatedAt: serverTimestamp()
  }

  try {
    if (editingQuestion.value) {
      await updateDoc(doc(db, 'questionCollabs', editingQuestion.value.id), questionData)
    } else {
      questionData.createdAt = serverTimestamp()
      await addDoc(collection(db, 'questionCollabs'), questionData)
    }

    closeModal()
    loadQuestions()
    alert(status === 'draft' ? 'บันทึกร่างแล้ว' : 'ส่งรีวิวแล้ว')
  } catch (error) {
    console.error('Error saving question:', error)
    alert('เกิดข้อผิดพลาด')
  }
}

const addComment = async () => {
  if (!newComment.value.trim() || !selectedQuestion.value) return

  try {
    await addDoc(collection(db, 'questionCollabs', selectedQuestion.value.id, 'comments'), {
      content: newComment.value,
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName || 'ครู',
      authorPhoto: authStore.user.photoURL,
      createdAt: serverTimestamp()
    })

    await updateDoc(doc(db, 'questionCollabs', selectedQuestion.value.id), {
      commentsCount: increment(1)
    })

    if (!selectedQuestion.value.comments) selectedQuestion.value.comments = []
    selectedQuestion.value.comments.push({
      id: Date.now(),
      content: newComment.value,
      authorName: authStore.user.displayName,
      authorPhoto: authStore.user.photoURL
    })
    selectedQuestion.value.commentsCount = (selectedQuestion.value.commentsCount || 0) + 1
    newComment.value = ''
  } catch (error) {
    console.error('Error adding comment:', error)
  }
}

const approveQuestion = async () => {
  if (!reviewingQuestion.value) return

  await updateDoc(doc(db, 'questionCollabs', reviewingQuestion.value.id), {
    status: 'approved',
    approvedBy: authStore.user.uid,
    approvedAt: serverTimestamp(),
    reviewFeedback: review.feedback
  })

  showReviewModal.value = false
  loadQuestions()
  alert('รับรองคำถามแล้ว!')
}

const suggestChanges = async () => {
  if (!reviewingQuestion.value || !review.feedback.trim()) {
    alert('กรุณาเพิ่มข้อเสนอแนะ')
    return
  }

  await addDoc(collection(db, 'questionCollabs', reviewingQuestion.value.id, 'comments'), {
    content: `[คำแนะนำจากรีวิวเวอร์] ${review.feedback}`,
    authorId: authStore.user.uid,
    authorName: authStore.user.displayName || 'ครู',
    authorPhoto: authStore.user.photoURL,
    isReview: true,
    createdAt: serverTimestamp()
  })

  showReviewModal.value = false
  alert('ส่งคำแนะนำแล้ว')
}

const rejectQuestion = async () => {
  if (!reviewingQuestion.value) return

  await updateDoc(doc(db, 'questionCollabs', reviewingQuestion.value.id), {
    status: 'draft',
    rejectedBy: authStore.user.uid,
    rejectedAt: serverTimestamp(),
    rejectionReason: review.feedback
  })

  showReviewModal.value = false
  loadQuestions()
  alert('ส่งกลับให้แก้ไข')
}

// Load courses from system
const loadCourses = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'courses'))
    courses.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading courses:', error)
  }
}

// Load Data - from real questions collection
const loadQuestions = async () => {
  loading.value = true
  try {
    // Load from existing questions collection (the real question bank)
    const questionsSnapshot = await getDocs(collection(db, 'questions'))
    
    const allQuestions = questionsSnapshot.docs.map(doc => {
      const data = doc.data()
      // Find course info
      const course = courses.value.find(c => c.id === data.courseId)
      
      return {
        id: doc.id,
        ...data,
        text: data.questionText || '',
        title: data.questionText?.substring(0, 50) || 'คำถาม HOTS',
        courseName: course?.courseName || 'ไม่ระบุ',
        courseId: data.courseId,
        bloomLevel: data.bloomLevel || 'วิเคราะห์',
        status: 'approved', // existing questions are already in use
        authorId: data.teacherId || data.createdBy,
        authorName: 'ครูผู้สอน',
        usesCount: data.usageCount || 0,
        createdAt: data.createdAt,
        relatedLOs: data.relatedLOs || [],
        dimensions: data.dimensions || ['analysis'],
        source: 'system'
      }
    })
    
    // Sort by createdAt desc
    allQuestions.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0)
      const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0)
      return new Date(dateB) - new Date(dateA)
    })
    
    questions.value = allQuestions

    // Stats from real data
    stats.totalQuestions = allQuestions.length
    stats.approved = allQuestions.filter(q => q.status === 'approved').length
    stats.uses = allQuestions.reduce((sum, q) => sum + (q.usesCount || 0), 0)
    
    const authors = new Set(allQuestions.map(q => q.authorId).filter(Boolean))
    stats.contributors = authors.size
  } catch (error) {
    console.error('Error loading questions:', error)
  } finally {
    loading.value = false
  }
}

// Initialize
onMounted(async () => {
  await loadCourses()
  await loadQuestions()
})
</script>

<style scoped>
.question-collab {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
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
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-primary);
}

.page-header h1 {
  margin: 0;
  font-size: 26px;
  color: var(--text-primary);
}

.btn-new {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

/* Stats */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 2px 8px var(--shadow);
  border: 1px solid var(--border-color);
}

.stat-icon { font-size: 24px; margin-bottom: 8px; }
.stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
.stat-label { font-size: 12px; color: var(--text-secondary); }

/* Filters */
.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--input-bg);
  color: var(--text-primary);
}

.filters select {
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--input-bg);
  color: var(--text-primary);
}

/* Tabs */
.tabs {
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
  background: #667eea;
  color: white;
  border-color: transparent;
}

/* Questions List */
.questions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px var(--shadow);
  border: 1px solid var(--border-color);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-header .header-left {
  display: flex;
  gap: 8px;
}

.subject-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  background: var(--primary-light);
  color: #667eea;
}

.subject-badge.math { background: #e3f2fd; color: #1976d2; }
.subject-badge.science { background: #e8f5e9; color: #2e7d32; }
.subject-badge.thai { background: #fff3e0; color: #e65100; }
.subject-badge.english { background: #fce4ec; color: #c2185b; }
.subject-badge.social { background: #f3e5f5; color: #7b1fa2; }

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.status-badge.draft { background: var(--bg-tertiary); color: var(--text-secondary); }
.status-badge.review { background: #fff3e0; color: #e65100; }
.status-badge.approved { background: #e8f5e9; color: #2e7d32; }

.dimensions {
  display: flex;
  gap: 6px;
}

.dim-tag {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 14px;
}

.dim-tag.analysis { background: #e3f2fd; }
.dim-tag.reasoning { background: #f3e5f5; }
.dim-tag.creativity { background: #fff8e1; }
.dim-tag.evidence { background: #e8f5e9; }

.question-text {
  margin: 0 0 12px 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-primary);
}

.question-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.meta-label { color: var(--text-secondary); }

.lo-tag {
  padding: 2px 8px;
  background: var(--primary-light);
  color: #667eea;
  border-radius: 10px;
  font-size: 11px;
}

.level-tag {
  padding: 2px 8px;
  background: #fff8e1;
  color: #f57c00;
  border-radius: 10px;
  font-size: 11px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 12px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.author-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.question-stats {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-actions button {
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.btn-view { background: var(--bg-tertiary); color: var(--text-primary); }
.btn-edit { background: #e3f2fd; color: #1976d2; }
.btn-review { background: #fff3e0; color: #e65100; }
.btn-use { background: #667eea; color: white; }
.btn-like { background: var(--bg-tertiary); color: var(--text-primary); }
.btn-like.active { background: #ffebee; color: #f44336; }

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
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid var(--border-color);
}

.view-modal {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  background: var(--modal-bg);
  z-index: 1;
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

.dimension-checkboxes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
}

.checkbox-item input {
  width: auto;
}

.form-group.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-group.checkbox input {
  width: auto;
}

.form-group.checkbox label {
  margin: 0;
  font-weight: normal;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel { padding: 10px 20px; background: var(--bg-tertiary); color: var(--text-primary); border: none; border-radius: 8px; cursor: pointer; }
.btn-draft { padding: 10px 20px; background: var(--bg-tertiary); color: var(--text-secondary); border: none; border-radius: 8px; cursor: pointer; }
.btn-submit { padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
.btn-approve { padding: 10px 20px; background: #4caf50; color: white; border: none; border-radius: 8px; cursor: pointer; }
.btn-suggest { padding: 10px 20px; background: #ff9800; color: white; border: none; border-radius: 8px; cursor: pointer; }
.btn-reject { padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 8px; cursor: pointer; }

/* View Modal */
.view-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.view-section {
  margin-bottom: 20px;
}

.view-section h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: var(--text-primary);
}

.question-full-text {
  font-size: 16px;
  line-height: 1.7;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 10px;
  color: var(--text-primary);
}

.lo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.comments-list {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.comment-item {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.comment-content {
  flex: 1;
  background: var(--bg-secondary);
  padding: 10px 14px;
  border-radius: 12px;
}

.comment-author {
  font-weight: 600;
  font-size: 13px;
  display: block;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.comment-content p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.comment-time {
  font-size: 11px;
  color: var(--text-secondary);
}

.no-comments {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}

.add-comment {
  display: flex;
  gap: 8px;
}

.add-comment input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 14px;
  background: var(--input-bg);
  color: var(--text-primary);
}

.add-comment button {
  padding: 10px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
}

.view-footer {
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.view-footer .author-info {
  gap: 12px;
}

.view-footer .author-avatar {
  width: 40px;
  height: 40px;
}

.view-footer .created-date {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
}

/* Review */
.review-question {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 10px;
  margin-bottom: 20px;
  line-height: 1.6;
  color: var(--text-primary);
}

.review-criteria h4 {
  margin: 0 0 12px 0;
  color: var(--text-primary);
}

.criteria-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  color: var(--text-primary);
}

.criteria-item input {
  width: auto;
}

/* States */
.loading-state, .empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--card-bg);
  border-radius: 12px;
  color: var(--text-primary);
}

.empty-icon { font-size: 48px; display: block; margin-bottom: 16px; }

.empty-state button {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 16px;
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

@keyframes spin { to { transform: rotate(360deg); } }

/* Responsive */
@media (max-width: 768px) {
  .stats-bar { grid-template-columns: repeat(2, 1fr); }
  .filters { flex-direction: column; }
  .tabs { flex-wrap: wrap; }
  .dimension-checkboxes { grid-template-columns: 1fr; }
}
</style>
