<template>
  <div class="peer-review-system">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="$router.push('/student')">← กลับ</button>
        <h1>👥 Peer Review</h1>
        <p class="subtitle">เรียนรู้จากการประเมินเพื่อน</p>
      </div>
      <div class="header-stats">
        <div class="stat-badge">
          <span class="stat-icon">📝</span>
          <span class="stat-value">{{ myPendingReviews }}</span>
          <span class="stat-label">รอประเมิน</span>
        </div>
        <div class="stat-badge highlight">
          <span class="stat-icon">⭐</span>
          <span class="stat-value">{{ myReviewScore }}</span>
          <span class="stat-label">คะแนนรีวิว</span>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button 
        :class="['tab', { active: activeTab === 'pending' }]"
        @click="activeTab = 'pending'"
      >
        📝 รอให้ประเมิน ({{ pendingReviews.length }})
      </button>
      <button 
        :class="['tab', { active: activeTab === 'my-submissions' }]"
        @click="activeTab = 'my-submissions'"
      >
        📤 งานของฉัน
      </button>
      <button 
        :class="['tab', { active: activeTab === 'completed' }]"
        @click="activeTab = 'completed'"
      >
        ✅ ประเมินแล้ว
      </button>
      <button 
        :class="['tab', { active: activeTab === 'leaderboard' }]"
        @click="activeTab = 'leaderboard'"
      >
        🏆 Top Reviewers
      </button>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Pending Reviews Tab -->
      <div v-if="activeTab === 'pending'" class="tab-content">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>กำลังโหลด...</p>
        </div>
        
        <div v-else-if="pendingReviews.length === 0" class="empty-state">
          <span class="empty-icon">🎉</span>
          <h3>ไม่มีงานรอประเมิน</h3>
          <p>กลับมาใหม่ภายหลังเพื่อช่วยประเมินเพื่อนๆ</p>
        </div>

        <div v-else class="review-list">
          <div 
            v-for="item in pendingReviews" 
            :key="item.id" 
            class="review-card"
          >
            <div class="card-header">
              <div class="assignment-info">
                <span class="assignment-badge">📋 {{ item.assignmentTitle }}</span>
                <span class="lo-badge" v-if="item.relatedLO">🎯 {{ item.relatedLO }}</span>
              </div>
              <div class="deadline" v-if="item.reviewDeadline">
                ⏰ เหลือ {{ formatTimeLeft(item.reviewDeadline) }}
              </div>
            </div>
            
            <div class="submission-preview">
              <div class="preview-header">
                <span class="anonymous-badge">👤 นักเรียนไม่ระบุชื่อ #{{ item.anonymousId }}</span>
                <span class="submitted-at">ส่งเมื่อ {{ formatDate(item.submittedAt) }}</span>
              </div>
              
              <div class="preview-content">
                {{ truncate(item.content, 200) }}
              </div>
              
              <div v-if="item.attachments?.length" class="preview-attachments">
                <span>📎 {{ item.attachments.length }} ไฟล์แนบ</span>
              </div>
            </div>

            <div class="card-actions">
              <button class="btn-primary" @click="startReview(item)">
                ✍️ เริ่มประเมิน
              </button>
              <button class="btn-secondary" @click="skipReview(item)">
                ข้าม
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- My Submissions Tab -->
      <div v-if="activeTab === 'my-submissions'" class="tab-content">
        <div v-if="mySubmissions.length === 0" class="empty-state">
          <span class="empty-icon">📭</span>
          <h3>ยังไม่มีงานที่ส่ง</h3>
        </div>

        <div v-else class="submissions-list">
          <div 
            v-for="sub in mySubmissions" 
            :key="sub.id" 
            class="submission-card"
          >
            <div class="submission-header">
              <h4>{{ sub.assignmentTitle }}</h4>
              <span :class="['status-badge', sub.reviewStatus]">
                {{ getStatusLabel(sub.reviewStatus) }}
              </span>
            </div>
            
            <div class="review-progress" v-if="sub.totalReviews > 0">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: `${(sub.completedReviews / sub.totalReviews) * 100}%` }"
                ></div>
              </div>
              <span class="progress-text">
                {{ sub.completedReviews }}/{{ sub.totalReviews }} รีวิว
              </span>
            </div>

            <!-- Received Reviews -->
            <div v-if="sub.reviews?.length" class="received-reviews">
              <h5>📝 Feedback ที่ได้รับ:</h5>
              <div v-for="review in sub.reviews" :key="review.id" class="review-feedback">
                <div class="feedback-scores">
                  <span 
                    v-for="(score, criterion) in review.scores" 
                    :key="criterion"
                    class="score-badge"
                  >
                    {{ getCriterionEmoji(criterion) }} {{ criterion }}: {{ score }}/5
                  </span>
                </div>
                <p class="feedback-comment" v-if="review.comment">
                  "{{ review.comment }}"
                </p>
                <span class="feedback-meta">
                  👤 Reviewer #{{ review.reviewerAnonymousId }}
                </span>
              </div>
            </div>

            <div v-else class="no-reviews">
              <span>⏳ รอรับ Feedback จากเพื่อน</span>
            </div>

            <button 
              class="view-details-btn"
              @click="viewSubmissionDetails(sub)"
            >
              ดูรายละเอียด →
            </button>
          </div>
        </div>
      </div>

      <!-- Completed Reviews Tab -->
      <div v-if="activeTab === 'completed'" class="tab-content">
        <div v-if="completedReviews.length === 0" class="empty-state">
          <span class="empty-icon">📝</span>
          <h3>ยังไม่เคยประเมินงาน</h3>
          <p>ไปที่แท็บ "รอให้ประเมิน" เพื่อเริ่มช่วยเพื่อน</p>
        </div>

        <div v-else class="completed-list">
          <div 
            v-for="review in completedReviews" 
            :key="review.id" 
            class="completed-card"
          >
            <div class="completed-header">
              <span class="assignment-badge">📋 {{ review.assignmentTitle }}</span>
              <span class="completed-date">{{ formatDate(review.reviewedAt) }}</span>
            </div>
            
            <div class="review-summary">
              <div class="scores-given">
                <span 
                  v-for="(score, criterion) in review.scoresGiven" 
                  :key="criterion"
                  class="score-pill"
                >
                  {{ getCriterionEmoji(criterion) }} {{ score }}
                </span>
              </div>
              <p class="comment-preview" v-if="review.commentGiven">
                "{{ truncate(review.commentGiven, 100) }}"
              </p>
            </div>

            <div v-if="review.helpfulCount > 0" class="helpful-badge">
              👍 {{ review.helpfulCount }} คนพบว่ามีประโยชน์
            </div>
          </div>
        </div>
      </div>

      <!-- Leaderboard Tab -->
      <div v-if="activeTab === 'leaderboard'" class="tab-content">
        <div class="leaderboard">
          <div class="leaderboard-header">
            <h3>🏆 Top Peer Reviewers ประจำสัปดาห์</h3>
          </div>
          
          <div class="leaderboard-list">
            <div 
              v-for="(user, idx) in topReviewers" 
              :key="user.id"
              :class="['leaderboard-item', { 'is-me': user.id === currentUserId }]"
            >
              <span class="rank">
                {{ idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1 }}
              </span>
              <img :src="user.photoURL || '/default-avatar.png'" class="user-avatar" alt="avatar">
              <div class="user-info">
                <span class="user-name">{{ user.name }}</span>
                <span class="user-stats">
                  {{ user.reviewCount }} รีวิว • {{ user.helpfulCount }} 👍
                </span>
              </div>
              <div class="user-score">
                <span class="score-value">{{ user.score }}</span>
                <span class="score-label">คะแนน</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Review Modal -->
    <div v-if="showReviewModal" class="modal-overlay" @click.self="closeReviewModal">
      <div class="review-modal">
        <div class="modal-header">
          <h3>✍️ ประเมินงาน</h3>
          <button class="close-btn" @click="closeReviewModal">✕</button>
        </div>

        <div class="modal-content">
          <!-- Submission Content -->
          <div class="submission-full">
            <div class="submission-meta">
              <span class="anonymous-badge">👤 นักเรียนไม่ระบุชื่อ #{{ currentReview?.anonymousId }}</span>
              <span class="lo-badge" v-if="currentReview?.relatedLO">🎯 {{ currentReview.relatedLO }}</span>
            </div>
            
            <div class="submission-content-full">
              {{ currentReview?.content }}
            </div>
            
            <div v-if="currentReview?.attachments?.length" class="attachments-list">
              <a 
                v-for="att in currentReview.attachments" 
                :key="att.url" 
                :href="att.url" 
                target="_blank"
                class="attachment-link"
              >
                📎 {{ att.name }}
              </a>
            </div>
          </div>

          <!-- Rubric Scoring -->
          <div class="rubric-section">
            <h4>📊 ประเมินตามเกณฑ์ A.R.C.E.</h4>
            
            <div class="rubric-criteria">
              <div 
                v-for="criterion in rubricCriteria" 
                :key="criterion.key"
                class="criterion"
              >
                <div class="criterion-header">
                  <span class="criterion-emoji">{{ criterion.emoji }}</span>
                  <span class="criterion-name">{{ criterion.name }}</span>
                  <span class="criterion-score">{{ reviewScores[criterion.key] || 0 }}/5</span>
                </div>
                <p class="criterion-desc">{{ criterion.description }}</p>
                <div class="score-selector">
                  <button 
                    v-for="n in 5" 
                    :key="n"
                    :class="['score-btn', { active: reviewScores[criterion.key] === n }]"
                    @click="reviewScores[criterion.key] = n"
                  >
                    {{ n }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Comment -->
          <div class="comment-section">
            <h4>💬 ให้ Feedback</h4>
            <textarea 
              v-model="reviewComment"
              placeholder="เขียน feedback ที่เป็นประโยชน์ให้เพื่อน... (อย่างน้อย 20 ตัวอักษร)"
              rows="4"
            ></textarea>
            <div class="comment-tips">
              <p>💡 Tips:</p>
              <ul>
                <li>บอกจุดที่ดีก่อน</li>
                <li>แนะนำสิ่งที่ปรับปรุงได้</li>
                <li>ใช้ภาษาสุภาพและสร้างสรรค์</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="closeReviewModal">ยกเลิก</button>
          <button 
            class="btn-primary" 
            @click="submitReview"
            :disabled="!canSubmitReview || submittingReview"
          >
            {{ submittingReview ? 'กำลังส่ง...' : '✓ ส่งการประเมิน' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { 
  collection, query, where, orderBy, getDocs, addDoc, 
  updateDoc, doc, increment, serverTimestamp, limit
} from 'firebase/firestore'
import { db } from '@/firebase/config'

const authStore = useAuthStore()
const currentUserId = computed(() => authStore.user?.uid)

// State
const activeTab = ref('pending')
const loading = ref(true)
const pendingReviews = ref([])
const mySubmissions = ref([])
const completedReviews = ref([])
const topReviewers = ref([])
const myPendingReviews = ref(0)
const myReviewScore = ref(0)

// Review Modal
const showReviewModal = ref(false)
const currentReview = ref(null)
const reviewScores = ref({
  analysis: 0,
  reasoning: 0,
  creativity: 0,
  evidence: 0
})
const reviewComment = ref('')
const submittingReview = ref(false)

// Rubric criteria
const rubricCriteria = [
  { 
    key: 'analysis', 
    name: 'การวิเคราะห์', 
    emoji: '🔍',
    description: 'แยกแยะและวิเคราะห์ข้อมูลได้ดี'
  },
  { 
    key: 'reasoning', 
    name: 'การให้เหตุผล', 
    emoji: '🧩',
    description: 'มีเหตุผลและลำดับความคิดชัดเจน'
  },
  { 
    key: 'creativity', 
    name: 'ความคิดสร้างสรรค์', 
    emoji: '💡',
    description: 'มีความคิดใหม่ๆ น่าสนใจ'
  },
  { 
    key: 'evidence', 
    name: 'หลักฐานอ้างอิง', 
    emoji: '📚',
    description: 'มีตัวอย่างหรือหลักฐานสนับสนุน'
  }
]

// Computed
const canSubmitReview = computed(() => {
  const hasAllScores = Object.values(reviewScores.value).every(s => s > 0)
  const hasComment = reviewComment.value.trim().length >= 20
  return hasAllScores && hasComment
})

// Methods
function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate?.() || new Date(timestamp)
  return date.toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatTimeLeft(deadline) {
  const now = new Date()
  const end = deadline.toDate?.() || new Date(deadline)
  const diff = end - now
  
  if (diff < 0) return 'หมดเวลา'
  
  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return `${hours} ชั่วโมง`
  
  const days = Math.floor(hours / 24)
  return `${days} วัน`
}

function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

function getStatusLabel(status) {
  const labels = {
    'pending': '⏳ รอรีวิว',
    'in_progress': '📝 กำลังรีวิว',
    'completed': '✅ รีวิวครบแล้ว'
  }
  return labels[status] || status
}

function getCriterionEmoji(criterion) {
  const emojis = {
    analysis: '🔍',
    reasoning: '🧩',
    creativity: '💡',
    evidence: '📚'
  }
  return emojis[criterion] || '📊'
}

function startReview(item) {
  currentReview.value = item
  reviewScores.value = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
  reviewComment.value = ''
  showReviewModal.value = true
}

function closeReviewModal() {
  showReviewModal.value = false
  currentReview.value = null
}

async function submitReview() {
  if (!canSubmitReview.value || submittingReview.value) return
  
  submittingReview.value = true
  
  try {
    // Save the review
    const reviewData = {
      submissionId: currentReview.value.id,
      reviewerId: currentUserId.value,
      reviewerAnonymousId: Math.random().toString(36).substring(2, 8).toUpperCase(),
      scores: { ...reviewScores.value },
      comment: reviewComment.value.trim(),
      createdAt: serverTimestamp(),
      helpfulCount: 0
    }
    
    await addDoc(collection(db, 'peerReviews'), reviewData)
    
    // Update submission review count
    await updateDoc(doc(db, 'submissions', currentReview.value.id), {
      completedReviews: increment(1)
    })
    
    // Update user's review stats
    await updateDoc(doc(db, 'users', currentUserId.value), {
      'peerReviewStats.reviewCount': increment(1),
      'peerReviewStats.lastReviewAt': serverTimestamp()
    })
    
    // Remove from pending list
    pendingReviews.value = pendingReviews.value.filter(
      r => r.id !== currentReview.value.id
    )
    myPendingReviews.value = Math.max(0, myPendingReviews.value - 1)
    
    closeReviewModal()
    
    // Show success message
    alert('✅ ส่งการประเมินแล้ว! ขอบคุณที่ช่วยเพื่อน')
    
  } catch (error) {
    console.error('Error submitting review:', error)
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
  } finally {
    submittingReview.value = false
  }
}

async function skipReview(item) {
  // Move to end of queue
  pendingReviews.value = pendingReviews.value.filter(r => r.id !== item.id)
  pendingReviews.value.push(item)
}

function viewSubmissionDetails(sub) {
  // Navigate to submission detail
}

// Load data
async function loadData() {
  loading.value = true
  
  try {
    // Load pending reviews (submissions from others that need review)
    const pendingQuery = query(
      collection(db, 'submissions'),
      where('needsReview', '==', true),
      where('authorId', '!=', currentUserId.value),
      orderBy('submittedAt', 'desc'),
      limit(10)
    )
    
    const pendingSnap = await getDocs(pendingQuery)
    pendingReviews.value = pendingSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    myPendingReviews.value = pendingReviews.value.length

    // Load my submissions
    const mySubsQuery = query(
      collection(db, 'submissions'),
      where('authorId', '==', currentUserId.value),
      orderBy('submittedAt', 'desc'),
      limit(20)
    )
    
    const mySubsSnap = await getDocs(mySubsQuery)
    mySubmissions.value = mySubsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Load completed reviews by me
    const completedQuery = query(
      collection(db, 'peerReviews'),
      where('reviewerId', '==', currentUserId.value),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    
    const completedSnap = await getDocs(completedQuery)
    completedReviews.value = completedSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Load top reviewers
    const topQuery = query(
      collection(db, 'users'),
      where('peerReviewStats.reviewCount', '>', 0),
      orderBy('peerReviewStats.reviewCount', 'desc'),
      limit(10)
    )
    
    const topSnap = await getDocs(topQuery)
    topReviewers.value = topSnap.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.displayName || 'ไม่ระบุชื่อ',
        photoURL: data.photoURL,
        reviewCount: data.peerReviewStats?.reviewCount || 0,
        helpfulCount: data.peerReviewStats?.helpfulCount || 0,
        score: (data.peerReviewStats?.reviewCount || 0) * 10 + 
               (data.peerReviewStats?.helpfulCount || 0) * 5
      }
    })

  } catch (error) {
    console.error('Error loading data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.peer-review-system {
  padding: 1rem;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left h1 {
  margin: 0;
  font-size: 1.5rem;
}

.subtitle {
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.back-btn {
  display: inline-block;
  padding: 0.5rem 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.header-stats {
  display: flex;
  gap: 1rem;
}

.stat-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.stat-badge.highlight {
  background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary-color) 100%);
  color: white;
}

.stat-icon {
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.7rem;
  opacity: 0.8;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.tab {
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.tab:hover {
  background: var(--bg-tertiary);
}

.tab.active {
  background: var(--primary-color);
  color: white;
}

/* Content */
.loading-state, .empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

/* Review Cards */
.review-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.review-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.25rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.assignment-info {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.assignment-badge {
  padding: 0.25rem 0.75rem;
  background: var(--primary-light);
  color: var(--primary-color);
  border-radius: 20px;
  font-size: 0.85rem;
}

.lo-badge {
  padding: 0.25rem 0.75rem;
  background: #dcfce7;
  color: #166534;
  border-radius: 20px;
  font-size: 0.85rem;
}

.deadline {
  font-size: 0.85rem;
  color: #f59e0b;
}

.submission-preview {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
}

.anonymous-badge {
  color: var(--text-secondary);
}

.submitted-at {
  color: var(--text-secondary);
}

.preview-content {
  line-height: 1.6;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.preview-attachments {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* Submissions */
.submission-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.submission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.submission-header h4 {
  margin: 0;
  font-size: 1rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.completed {
  background: #dcfce7;
  color: #166534;
}

.review-progress {
  margin-bottom: 0.75rem;
}

.progress-bar {
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-color);
  transition: width 0.3s;
}

.progress-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.received-reviews {
  margin-top: 1rem;
}

.received-reviews h5 {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.review-feedback {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.feedback-scores {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.score-badge {
  padding: 0.2rem 0.5rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 0.75rem;
}

.feedback-comment {
  font-style: italic;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
}

.feedback-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.no-reviews {
  text-align: center;
  padding: 1rem;
  color: var(--text-secondary);
  background: var(--bg-primary);
  border-radius: 8px;
}

.view-details-btn {
  width: 100%;
  padding: 0.75rem;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
  color: var(--primary-color);
  font-weight: 500;
}

/* Leaderboard */
.leaderboard-header h3 {
  margin-bottom: 1rem;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.leaderboard-item.is-me {
  background: linear-gradient(135deg, var(--primary-light) 0%, rgba(var(--primary-rgb), 0.2) 100%);
  border: 2px solid var(--primary-color);
}

.rank {
  font-size: 1.25rem;
  min-width: 2rem;
  text-align: center;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.user-info {
  flex: 1;
}

.user-name {
  display: block;
  font-weight: 600;
}

.user-stats {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.user-score {
  text-align: center;
}

.score-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary-color);
}

.score-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
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

.review-modal {
  background: var(--bg-primary);
  border-radius: 16px;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
}

.close-btn {
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  color: var(--text-secondary);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}

.submission-full {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.submission-meta {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.submission-content-full {
  line-height: 1.7;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.attachments-list {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.attachment-link {
  padding: 0.5rem 0.75rem;
  background: var(--bg-primary);
  border-radius: 8px;
  text-decoration: none;
  color: var(--primary-color);
  font-size: 0.85rem;
}

.rubric-section h4 {
  margin-bottom: 1rem;
}

.rubric-criteria {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.criterion {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
}

.criterion-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.criterion-emoji {
  font-size: 1.25rem;
}

.criterion-name {
  font-weight: 600;
  flex: 1;
}

.criterion-score {
  font-weight: 700;
  color: var(--primary-color);
}

.criterion-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.score-selector {
  display: flex;
  gap: 0.5rem;
}

.score-btn {
  width: 40px;
  height: 40px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.score-btn:hover {
  border-color: var(--primary-color);
}

.score-btn.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.comment-section {
  margin-top: 1.5rem;
}

.comment-section h4 {
  margin-bottom: 0.75rem;
}

.comment-section textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  resize: vertical;
  font-family: inherit;
  font-size: 0.95rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.comment-section textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.comment-tips {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #fef3c7;
  border-radius: 8px;
  font-size: 0.85rem;
}

.comment-tips ul {
  margin: 0.25rem 0 0 1rem;
  padding: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-color);
}

.modal-footer .btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Spinner */
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
  }
  
  .header-stats {
    width: 100%;
    justify-content: space-around;
  }
  
  .tabs {
    flex-wrap: nowrap;
  }
  
  .tab {
    flex: 1;
    text-align: center;
    font-size: 0.8rem;
    padding: 0.6rem 0.5rem;
  }
}
</style>
