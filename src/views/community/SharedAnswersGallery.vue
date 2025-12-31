<template>
  <div class="shared-gallery">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="$router.push('/community')">← กลับ</button>
        <h1>🌟 คลังคำตอบยอดเยี่ยม</h1>
      </div>
      <div class="header-actions">
        <select v-model="selectedCourseId" class="course-select" @change="onCourseChange">
          <option value="">ทุกรายวิชา</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.name }}
          </option>
        </select>
        <select v-model="sortBy" class="sort-select">
          <option value="recent">ล่าสุด</option>
          <option value="score">คะแนนสูง</option>
          <option value="likes">ถูกใจมาก</option>
          <option value="bookmarks">บันทึกมาก</option>
        </select>
      </div>
    </div>

    <!-- Info Banner -->
    <div class="info-banner">
      <span class="info-icon">💡</span>
      <p>คำตอบในคลังนี้ดึงจากระบบประเมิน HOTS โดยตรง เฉพาะคำตอบที่ได้คะแนน ≥ 16/20 เท่านั้น</p>
    </div>

    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-icon">📚</span>
        <span class="stat-value">{{ stats.totalAnswers }}</span>
        <span class="stat-label">คำตอบทั้งหมด</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">⭐</span>
        <span class="stat-value">{{ stats.avgScore }}</span>
        <span class="stat-label">คะแนนเฉลี่ย</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">🎯</span>
        <span class="stat-value">{{ stats.losCount }}</span>
        <span class="stat-label">LO ที่มี</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">💡</span>
        <span class="stat-value">{{ stats.contributors }}</span>
        <span class="stat-label">ผู้ร่วมแชร์</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="search-box">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="🔍 ค้นหาคำตอบ, LO..."
          class="search-input"
        />
      </div>
      
      <div class="filter-chips">
        <button 
          :class="['filter-chip', { active: selectedLO === '' }]"
          @click="selectedLO = ''"
        >
          ทั้งหมด
        </button>
        <button 
          v-for="lo in availableLOs" 
          :key="lo"
          :class="['filter-chip', { active: selectedLO === lo }]"
          @click="selectedLO = lo"
        >
          {{ lo }}
        </button>
      </div>

      <div class="score-filter">
        <label>คะแนนขั้นต่ำ:</label>
        <div class="score-buttons">
          <button 
            v-for="score in [16, 17, 18, 19, 20]" 
            :key="score"
            :class="['score-btn', { active: minScore === score }]"
            @click="minScore = minScore === score ? 0 : score"
          >
            {{ score }}+
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดคำตอบยอดเยี่ยม...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredAnswers.length === 0" class="empty-state">
      <span class="empty-icon">📝</span>
      <p>ไม่พบคำตอบที่ตรงกับเงื่อนไข</p>
      <button class="btn-reset" @click="resetFilters">ล้างตัวกรอง</button>
    </div>

    <!-- Answers Grid -->
    <div v-else class="answers-grid">
      <div v-for="answer in filteredAnswers" :key="answer.id" class="answer-card">
        <div class="card-header">
          <div class="author-info">
            <img :src="answer.authorPhoto || '/default-avatar.png'" class="author-avatar" />
            <div class="author-details">
              <span class="author-name">{{ answer.authorName || 'นักเรียน' }}</span>
              <span class="answer-date">{{ formatDate(answer.createdAt) }}</span>
            </div>
          </div>
          <div class="score-badge" :class="getScoreClass(answer.totalScore)">
            {{ answer.totalScore }}/20
          </div>
        </div>

        <!-- Question Preview -->
        <div class="question-preview" v-if="answer.questionText">
          <span class="question-label">❓ คำถาม:</span>
          <p>{{ truncateText(answer.questionText, 100) }}</p>
        </div>

        <!-- Answer Content -->
        <div class="answer-content">
          <p>{{ truncateText(answer.content, 200) }}</p>
          <button class="btn-expand" @click="viewAnswer(answer)">
            อ่านเพิ่มเติม →
          </button>
        </div>

        <!-- Rubric Scores -->
        <div class="rubric-scores">
          <div class="rubric-item" :class="{ highlight: answer.analysis >= 4 }">
            <span class="rubric-label">🔍 A</span>
            <span class="rubric-value">{{ answer.analysis }}</span>
          </div>
          <div class="rubric-item" :class="{ highlight: answer.reasoning >= 4 }">
            <span class="rubric-label">🧠 R</span>
            <span class="rubric-value">{{ answer.reasoning }}</span>
          </div>
          <div class="rubric-item" :class="{ highlight: answer.creativity >= 4 }">
            <span class="rubric-label">💡 C</span>
            <span class="rubric-value">{{ answer.creativity }}</span>
          </div>
          <div class="rubric-item" :class="{ highlight: answer.evidence >= 4 }">
            <span class="rubric-label">📊 E</span>
            <span class="rubric-value">{{ answer.evidence }}</span>
          </div>
        </div>

        <!-- LO Tags -->
        <div class="lo-tags" v-if="answer.passedLOs?.length">
          <span v-for="lo in answer.passedLOs" :key="lo" class="lo-tag">{{ lo }}</span>
        </div>

        <!-- AI Feedback Preview -->
        <div class="feedback-preview" v-if="answer.feedback">
          <span class="feedback-label">💬 AI Feedback:</span>
          <p>{{ truncateText(answer.feedback, 100) }}</p>
        </div>

        <!-- Card Actions -->
        <div class="card-actions">
          <button 
            :class="['action-btn', { active: answer.isLiked }]"
            @click="toggleLike(answer)"
          >
            ❤️ {{ answer.likesCount || 0 }}
          </button>
          <button 
            :class="['action-btn', { active: answer.isBookmarked }]"
            @click="toggleBookmark(answer)"
          >
            🔖 {{ answer.bookmarksCount || 0 }}
          </button>
          <button class="action-btn" @click="shareAnswer(answer)">
            📤 แชร์
          </button>
        </div>
      </div>
    </div>

    <!-- Load More -->
    <div v-if="hasMore && !loading" class="load-more">
      <button @click="loadMore" class="btn-load-more">โหลดเพิ่มเติม</button>
    </div>

    <!-- Answer Detail Modal -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal-content detail-modal">
        <div class="modal-header">
          <h2>📖 รายละเอียดคำตอบ</h2>
          <button class="close-btn" @click="showDetailModal = false">×</button>
        </div>
        
        <div class="detail-content" v-if="selectedAnswer">
          <!-- Author -->
          <div class="detail-author">
            <img :src="selectedAnswer.authorPhoto || '/default-avatar.png'" class="detail-avatar" />
            <div>
              <span class="detail-name">{{ selectedAnswer.authorName }}</span>
              <span class="detail-date">{{ formatDate(selectedAnswer.createdAt) }}</span>
            </div>
            <div class="detail-score" :class="getScoreClass(selectedAnswer.totalScore)">
              {{ selectedAnswer.totalScore }}/20
            </div>
          </div>

          <!-- Full Question -->
          <div class="detail-section">
            <h4>❓ คำถาม</h4>
            <p>{{ selectedAnswer.questionText }}</p>
          </div>

          <!-- Full Answer -->
          <div class="detail-section">
            <h4>✍️ คำตอบ</h4>
            <p class="full-answer">{{ selectedAnswer.content }}</p>
          </div>

          <!-- Rubric Breakdown -->
          <div class="detail-section">
            <h4>📊 คะแนน A.R.C.E.</h4>
            <div class="detail-rubrics">
              <div class="detail-rubric">
                <div class="rubric-header">
                  <span>🔍 Analysis (วิเคราะห์)</span>
                  <span class="rubric-score">{{ selectedAnswer.analysis }}/5</span>
                </div>
                <div class="rubric-bar">
                  <div class="rubric-fill" :style="{ width: (selectedAnswer.analysis * 20) + '%' }"></div>
                </div>
              </div>
              <div class="detail-rubric">
                <div class="rubric-header">
                  <span>🧠 Reasoning (ให้เหตุผล)</span>
                  <span class="rubric-score">{{ selectedAnswer.reasoning }}/5</span>
                </div>
                <div class="rubric-bar">
                  <div class="rubric-fill" :style="{ width: (selectedAnswer.reasoning * 20) + '%' }"></div>
                </div>
              </div>
              <div class="detail-rubric">
                <div class="rubric-header">
                  <span>💡 Creativity (สร้างสรรค์)</span>
                  <span class="rubric-score">{{ selectedAnswer.creativity }}/5</span>
                </div>
                <div class="rubric-bar">
                  <div class="rubric-fill" :style="{ width: (selectedAnswer.creativity * 20) + '%' }"></div>
                </div>
              </div>
              <div class="detail-rubric">
                <div class="rubric-header">
                  <span>📊 Evidence (หลักฐาน)</span>
                  <span class="rubric-score">{{ selectedAnswer.evidence }}/5</span>
                </div>
                <div class="rubric-bar">
                  <div class="rubric-fill" :style="{ width: (selectedAnswer.evidence * 20) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Passed LOs -->
          <div class="detail-section" v-if="selectedAnswer.passedLOs?.length">
            <h4>🎯 LO ที่ผ่าน</h4>
            <div class="detail-los">
              <span v-for="lo in selectedAnswer.passedLOs" :key="lo" class="detail-lo">{{ lo }}</span>
            </div>
          </div>

          <!-- Full Feedback -->
          <div class="detail-section" v-if="selectedAnswer.feedback">
            <h4>💬 AI Feedback</h4>
            <div class="feedback-box">
              {{ selectedAnswer.feedback }}
            </div>
          </div>

          <!-- Tips from this answer -->
          <div class="detail-section tips-section">
            <h4>💡 บทเรียนจากคำตอบนี้</h4>
            <ul class="tips-list">
              <li v-if="selectedAnswer.analysis >= 4">✓ มีการวิเคราะห์อย่างลึกซึ้ง</li>
              <li v-if="selectedAnswer.reasoning >= 4">✓ ให้เหตุผลได้ดีมาก</li>
              <li v-if="selectedAnswer.creativity >= 4">✓ มีมุมมองใหม่ที่น่าสนใจ</li>
              <li v-if="selectedAnswer.evidence >= 4">✓ อ้างอิงหลักฐานชัดเจน</li>
            </ul>
          </div>

          <!-- Actions -->
          <div class="detail-actions">
            <button 
              :class="['btn-action', { active: selectedAnswer.isLiked }]"
              @click="toggleLike(selectedAnswer)"
            >
              ❤️ ถูกใจ {{ selectedAnswer.likesCount || 0 }}
            </button>
            <button 
              :class="['btn-action', { active: selectedAnswer.isBookmarked }]"
              @click="toggleBookmark(selectedAnswer)"
            >
              🔖 บันทึก {{ selectedAnswer.bookmarksCount || 0 }}
            </button>
            <button class="btn-action" @click="copyAnswer(selectedAnswer)">
              📋 คัดลอก
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { 
  collection, query, where, orderBy, limit, 
  getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
  increment, startAfter
} from 'firebase/firestore'
import { db } from '@/firebase/config'

const authStore = useAuthStore()

// State
const loading = ref(true)
const searchQuery = ref('')
const selectedLO = ref('')
const selectedCourseId = ref('')
const sortBy = ref('recent')
const minScore = ref(16)
const courses = ref([])

// Data
const answers = ref([])
const availableLOs = ref([])
const hasMore = ref(true)
const lastDoc = ref(null)
const pageSize = 12

// Stats
const stats = ref({
  totalAnswers: 0,
  avgScore: 0,
  losCount: 0,
  contributors: 0
})

// Modal
const showDetailModal = ref(false)
const selectedAnswer = ref(null)

// Computed
const filteredAnswers = computed(() => {
  let result = [...answers.value]

  // Search filter
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(a => 
      a.content?.toLowerCase().includes(q) ||
      a.questionText?.toLowerCase().includes(q) ||
      a.passedLOs?.some(lo => lo.toLowerCase().includes(q))
    )
  }

  // LO filter
  if (selectedLO.value) {
    result = result.filter(a => a.passedLOs?.includes(selectedLO.value))
  }

  // Score filter
  if (minScore.value > 0) {
    result = result.filter(a => a.totalScore >= minScore.value)
  }

  // Sort
  switch (sortBy.value) {
    case 'score':
      result.sort((a, b) => b.totalScore - a.totalScore)
      break
    case 'likes':
      result.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
      break
    case 'bookmarks':
      result.sort((a, b) => (b.bookmarksCount || 0) - (a.bookmarksCount || 0))
      break
    default: // recent
      result.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || new Date(0)
        return dateB - dateA
      })
  }

  return result
})

// Methods
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short',
    year: 'numeric'
  })
}

const truncateText = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const getScoreClass = (score) => {
  if (score >= 19) return 'excellent'
  if (score >= 17) return 'great'
  if (score >= 16) return 'good'
  return 'normal'
}

const resetFilters = () => {
  searchQuery.value = ''
  selectedLO.value = ''
  minScore.value = 16
}

const viewAnswer = (answer) => {
  selectedAnswer.value = answer
  showDetailModal.value = true
}

const toggleLike = async (answer) => {
  if (!authStore.user?.uid) return
  
  try {
    const likesRef = collection(db, 'sharedContent', answer.id, 'likes')
    const existingLike = await getDocs(query(
      likesRef,
      where('userId', '==', authStore.user.uid)
    ))

    if (existingLike.empty) {
      await addDoc(likesRef, {
        userId: authStore.user.uid,
        createdAt: serverTimestamp()
      })
      await updateDoc(doc(db, 'sharedContent', answer.id), {
        likesCount: increment(1)
      })
      answer.likesCount = (answer.likesCount || 0) + 1
      answer.isLiked = true
    } else {
      await deleteDoc(existingLike.docs[0].ref)
      await updateDoc(doc(db, 'sharedContent', answer.id), {
        likesCount: increment(-1)
      })
      answer.likesCount = Math.max(0, (answer.likesCount || 1) - 1)
      answer.isLiked = false
    }
  } catch (error) {
    console.error('Error toggling like:', error)
  }
}

const toggleBookmark = async (answer) => {
  if (!authStore.user?.uid) return
  
  try {
    const bookmarksRef = collection(db, 'sharedContent', answer.id, 'bookmarks')
    const existingBookmark = await getDocs(query(
      bookmarksRef,
      where('userId', '==', authStore.user.uid)
    ))

    if (existingBookmark.empty) {
      await addDoc(bookmarksRef, {
        userId: authStore.user.uid,
        createdAt: serverTimestamp()
      })
      await updateDoc(doc(db, 'sharedContent', answer.id), {
        bookmarksCount: increment(1)
      })
      answer.bookmarksCount = (answer.bookmarksCount || 0) + 1
      answer.isBookmarked = true
    } else {
      await deleteDoc(existingBookmark.docs[0].ref)
      await updateDoc(doc(db, 'sharedContent', answer.id), {
        bookmarksCount: increment(-1)
      })
      answer.bookmarksCount = Math.max(0, (answer.bookmarksCount || 1) - 1)
      answer.isBookmarked = false
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error)
  }
}

const shareAnswer = async (answer) => {
  try {
    await navigator.share({
      title: 'คำตอบยอดเยี่ยม - HOTS AI',
      text: `ดูคำตอบที่ได้ ${answer.totalScore}/20 คะแนน!`,
      url: `${window.location.origin}/shared-answer/${answer.id}`
    })
  } catch (error) {
    // Fallback: copy link
    navigator.clipboard.writeText(`${window.location.origin}/shared-answer/${answer.id}`)
    alert('คัดลอกลิงก์แล้ว!')
  }
}

const copyAnswer = (answer) => {
  const text = `คำถาม: ${answer.questionText}\n\nคำตอบ: ${answer.content}\n\nคะแนน: ${answer.totalScore}/20`
  navigator.clipboard.writeText(text)
  alert('คัดลอกคำตอบแล้ว!')
}

// Course change handler
const onCourseChange = () => {
  selectedLO.value = ''
  lastDoc.value = null
  loadAnswers()
  loadStats()
}

// Load Data - Now from assessments collection (score >= 16)
const loadAnswers = async (loadMore = false) => {
  if (!loadMore) loading.value = true
  
  try {
    // Build query for assessments with high scores
    let baseQuery
    if (selectedCourseId.value) {
      baseQuery = query(
        collection(db, 'assessments'),
        where('courseId', '==', selectedCourseId.value),
        orderBy('createdAt', 'desc'),
        limit(100)
      )
    } else {
      baseQuery = query(
        collection(db, 'assessments'),
        orderBy('createdAt', 'desc'),
        limit(100)
      )
    }

    const snapshot = await getDocs(baseQuery)
    
    // Filter by score >= 16 and map to display format
    const excellentAnswers = snapshot.docs
      .map(docSnap => {
        const data = docSnap.data()
        const totalScore = (data.rubricScores?.analysis || 0) + 
                          (data.rubricScores?.reasoning || 0) + 
                          (data.rubricScores?.creativity || 0) + 
                          (data.rubricScores?.evidence || 0)
        return {
          id: docSnap.id,
          ...data,
          totalScore,
          analysis: data.rubricScores?.analysis || 0,
          reasoning: data.rubricScores?.reasoning || 0,
          creativity: data.rubricScores?.creativity || 0,
          evidence: data.rubricScores?.evidence || 0,
          content: data.studentAnswer || '',
          questionText: data.questionText || '',
          passedLOs: data.loAssessment?.passedLOs || [],
          authorId: data.studentId,
          authorName: data.studentName || 'นักเรียน',
          authorPhoto: data.studentPhoto || null,
          courseName: data.courseName || '',
          feedback: data.feedback || '',
          // For likes/bookmarks - use assessments subcollection
          likesCount: data.likesCount || 0,
          bookmarksCount: data.bookmarksCount || 0,
          isLiked: false,
          isBookmarked: false
        }
      })
      .filter(a => a.totalScore >= 16) // Only show excellent answers
      .slice(0, 50) // Limit results

    answers.value = excellentAnswers
    hasMore.value = excellentAnswers.length === 50

    // Extract available LOs from results
    const loSet = new Set()
    excellentAnswers.forEach(a => {
      a.passedLOs?.forEach(lo => loSet.add(lo))
    })
    availableLOs.value = Array.from(loSet).sort()
  } catch (error) {
    console.error('Error loading answers:', error)
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  // For simplicity, not implementing pagination from assessments
  // Could be enhanced later
}

const loadCourses = async () => {
  try {
    const coursesQuery = query(collection(db, 'courses'), limit(20))
    const snapshot = await getDocs(coursesQuery)
    courses.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading courses:', error)
  }
}

const loadStats = async () => {
  try {
    // Query assessments instead of sharedContent
    let baseQuery
    if (selectedCourseId.value) {
      baseQuery = query(
        collection(db, 'assessments'),
        where('courseId', '==', selectedCourseId.value),
        limit(500)
      )
    } else {
      baseQuery = query(
        collection(db, 'assessments'),
        limit(500)
      )
    }
    
    const snapshot = await getDocs(baseQuery)

    const allAnswers = snapshot.docs
      .map(d => {
        const data = d.data()
        const totalScore = (data.rubricScores?.analysis || 0) + 
                          (data.rubricScores?.reasoning || 0) + 
                          (data.rubricScores?.creativity || 0) + 
                          (data.rubricScores?.evidence || 0)
        return { ...data, totalScore }
      })
      .filter(a => a.totalScore >= 16)
    
    stats.value.totalAnswers = allAnswers.length
    
    const totalScore = allAnswers.reduce((sum, a) => sum + a.totalScore, 0)
    stats.value.avgScore = allAnswers.length ? (totalScore / allAnswers.length).toFixed(1) : 0

    const loSet = new Set()
    allAnswers.forEach(a => a.loAssessment?.passedLOs?.forEach(lo => loSet.add(lo)))
    stats.value.losCount = loSet.size

    const authorSet = new Set()
    allAnswers.forEach(a => a.studentId && authorSet.add(a.studentId))
    stats.value.contributors = authorSet.size
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

// Watch sort changes
watch(sortBy, () => {
  lastDoc.value = null
  loadAnswers()
})

// Initialize
onMounted(async () => {
  await Promise.all([loadCourses(), loadAnswers(), loadStats()])
})
</script>

<style scoped>
.shared-gallery {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
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
  font-size: 28px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.course-select,
.sort-select {
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--card-bg);
  color: var(--text-primary);
}

.course-select {
  min-width: 150px;
}

/* Info Banner */
.info-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #e8eaf6 0%, #e3f2fd 100%);
  border-radius: 12px;
  margin-bottom: 20px;
}

.info-icon {
  font-size: 24px;
}

.info-banner p {
  margin: 0;
  color: #3f51b5;
  font-size: 14px;
}

/* Stats Bar */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow);
}

.stat-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #667eea;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Filters */
.filters-section {
  background: var(--card-bg);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: var(--shadow);
}

.search-box {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 15px;
  background: var(--input-bg);
  color: var(--text-primary);
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.filter-chip {
  padding: 8px 16px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
}

.filter-chip.active {
  background: #667eea;
  color: white;
}

.score-filter {
  display: flex;
  align-items: center;
  gap: 12px;
}

.score-filter label {
  font-size: 14px;
  color: var(--text-secondary);
}

.score-buttons {
  display: flex;
  gap: 8px;
}

.score-btn {
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
}

.score-btn.active {
  background: #ffc107;
  color: var(--text-primary);
}

/* Answers Grid */
.answers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.answer-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow);
  transition: transform 0.2s;
}

.answer-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.author-details {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-weight: 600;
  font-size: 14px;
}

.answer-date {
  font-size: 12px;
  color: var(--text-secondary);
}

.score-badge {
  padding: 6px 12px;
  border-radius: 8px;
  font-weight: bold;
  font-size: 14px;
}

.score-badge.excellent {
  background: linear-gradient(135deg, #ffd700, #ffb300);
  color: var(--text-primary);
}

.score-badge.great {
  background: #e8f5e9;
  color: #2e7d32;
}

.score-badge.good {
  background: #e3f2fd;
  color: #1976d2;
}

.question-preview {
  margin-bottom: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.question-label {
  font-size: 12px;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 4px;
}

.question-preview p {
  margin: 0;
  font-size: 13px;
  color: var(--text-primary);
}

.answer-content {
  margin-bottom: 16px;
}

.answer-content p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

.btn-expand {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  font-size: 13px;
  padding: 0;
  margin-top: 8px;
}

/* Rubric Scores */
.rubric-scores {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.rubric-item {
  flex: 1;
  text-align: center;
  padding: 8px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.rubric-item.highlight {
  background: #e8f5e9;
}

.rubric-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
}

.rubric-value {
  font-size: 18px;
  font-weight: bold;
}

/* LO Tags */
.lo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.lo-tag {
  padding: 4px 10px;
  background: #e8eaf6;
  color: #667eea;
  border-radius: 12px;
  font-size: 12px;
}

/* Feedback Preview */
.feedback-preview {
  padding: 12px;
  background: #fff8e1;
  border-radius: 8px;
  margin-bottom: 12px;
}

.feedback-label {
  font-size: 12px;
  color: #e65100;
  display: block;
  margin-bottom: 4px;
}

.feedback-preview p {
  margin: 0;
  font-size: 13px;
  color: var(--text-primary);
}

/* Card Actions */
.card-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.action-btn {
  flex: 1;
  padding: 8px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
}

.action-btn.active {
  background: #ffebee;
  color: #f44336;
}

/* Load More */
.load-more {
  text-align: center;
  padding: 30px;
}

.btn-load-more {
  padding: 12px 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
}

/* States */
.loading-state, .empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--card-bg);
  border-radius: 12px;
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

.btn-reset {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 16px;
}

/* Detail Modal */
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
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
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

.detail-content {
  padding: 20px;
}

.detail-author {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.detail-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.detail-name {
  display: block;
  font-weight: 600;
  font-size: 16px;
}

.detail-date {
  font-size: 13px;
  color: var(--text-secondary);
}

.detail-score {
  margin-left: auto;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 18px;
  font-weight: bold;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: var(--text-primary);
}

.detail-section p {
  margin: 0;
  line-height: 1.7;
}

.full-answer {
  white-space: pre-wrap;
  background: var(--bg-secondary);
  padding: 16px;
  border-radius: 10px;
  color: var(--text-primary);
}

/* Rubric Breakdown */
.detail-rubrics {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-rubric {
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 10px;
}

.rubric-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.rubric-score {
  font-weight: bold;
  color: #667eea;
}

.rubric-bar {
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.rubric-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 4px;
}

.detail-los {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-lo {
  padding: 8px 14px;
  background: #e8eaf6;
  color: #667eea;
  border-radius: 20px;
  font-size: 13px;
}

.feedback-box {
  padding: 16px;
  background: #fff8e1;
  border-radius: 10px;
  line-height: 1.6;
}

.tips-section {
  background: #e8f5e9;
  padding: 16px;
  border-radius: 10px;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
}

.tips-list li {
  margin-bottom: 6px;
  color: #2e7d32;
}

.detail-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.btn-action {
  flex: 1;
  padding: 12px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
}

.btn-action.active {
  background: #ffebee;
  color: #f44336;
}

/* Responsive */
@media (max-width: 768px) {
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }

  .answers-grid {
    grid-template-columns: 1fr;
  }

  .score-filter {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-actions {
    flex-wrap: wrap;
  }

  .btn-action {
    flex: 1 1 calc(50% - 6px);
  }
}

</style>
