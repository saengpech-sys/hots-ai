<template>
  <div class="lesson-library">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="$router.push('/community')">← กลับ</button>
        <h1>📚 คลังแผนการสอน</h1>
      </div>
      <div class="header-actions">
        <button class="btn-share" @click="showShareModal = true">+ แชร์แผน</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-bar">
      <div class="stat">
        <span class="stat-value">{{ stats.totalPlans }}</span>
        <span class="stat-label">แผนทั้งหมด</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ stats.courses }}</span>
        <span class="stat-label">รายวิชา</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ stats.contributors }}</span>
        <span class="stat-label">ผู้แชร์</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ stats.downloads }}</span>
        <span class="stat-label">ดาวน์โหลด</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="search-box">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="🔍 ค้นหาแผนการสอน..."
        />
      </div>
      
      <div class="filter-row">
        <select v-model="selectedCourse">
          <option value="">ทุกรายวิชา</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.courseName }}
          </option>
        </select>

        <select v-model="selectedGrade">
          <option value="">ทุกระดับชั้น</option>
          <option v-for="grade in availableGrades" :key="grade" :value="grade">
            {{ grade }}
          </option>
        </select>

        <select v-model="selectedModel">
          <option value="">ทุกรูปแบบ</option>
          <option value="5e">5E Model</option>
          <option value="traditional">แบบดั้งเดิม</option>
          <option value="pbl">PBL</option>
          <option value="flipped">Flipped Classroom</option>
        </select>

        <select v-model="sortBy">
          <option value="recent">ล่าสุด</option>
          <option value="popular">ยอดนิยม</option>
          <option value="rating">คะแนนสูง</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredPlans.length === 0" class="empty-state">
      <span class="empty-icon">📚</span>
      <p>ไม่พบแผนการสอน</p>
      <button @click="resetFilters">ล้างตัวกรอง</button>
    </div>

    <!-- Plans Grid -->
    <div v-else class="plans-grid">
      <div v-for="plan in filteredPlans" :key="plan.id" class="plan-card">
        <div class="card-header">
          <span class="subject-badge" :class="plan.subject">{{ plan.courseName }}</span>
          <span class="grade-badge">{{ plan.grade || plan.gradeLevel || '' }}</span>
        </div>

        <h3 class="plan-title">{{ plan.title || plan.topicName }}</h3>
        <p class="plan-desc">{{ truncateText(plan.description || plan.overview, 100) }}</p>

        <!-- Plan Info -->
        <div class="plan-info">
          <div class="info-item">
            <span class="info-label">รูปแบบ:</span>
            <span class="info-value">{{ getModelName(plan.model) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">เวลา:</span>
            <span class="info-value">{{ plan.duration || 50 }} นาที</span>
          </div>
          <div class="info-item">
            <span class="info-label">LO:</span>
            <span class="info-value">{{ plan.loCount || 0 }} ข้อ</span>
          </div>
        </div>

        <!-- A.R.C.E. Focus -->
        <div class="arce-focus" v-if="plan.arceFocus?.length">
          <span class="arce-label">เน้น:</span>
          <div class="arce-tags">
            <span v-for="arce in plan.arceFocus" :key="arce" class="arce-tag">{{ arce }}</span>
          </div>
        </div>

        <!-- Author -->
        <div class="plan-author">
          <img :src="plan.authorPhoto || '/default-avatar.png'" class="author-avatar" />
          <div class="author-info">
            <span class="author-name">{{ plan.authorName }}</span>
            <span class="author-school">{{ plan.schoolName || 'โรงเรียน' }}</span>
          </div>
        </div>

        <!-- Stats -->
        <div class="plan-stats">
          <span class="stat-item">⬇️ {{ plan.downloadsCount || 0 }}</span>
          <span class="stat-item">❤️ {{ plan.likesCount || 0 }}</span>
          <span class="stat-item">⭐ {{ plan.rating || 0 }}/5</span>
        </div>

        <!-- Actions -->
        <div class="plan-actions">
          <button class="btn-preview" @click="previewPlan(plan)">👁️ ดู</button>
          <button class="btn-download" @click="downloadPlan(plan)">⬇️ ดาวน์โหลด</button>
          <button 
            :class="['btn-like', { active: plan.isLiked }]"
            @click="toggleLike(plan)"
          >❤️</button>
        </div>
      </div>
    </div>

    <!-- Share Modal -->
    <div v-if="showShareModal" class="modal-overlay" @click.self="showShareModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>📤 แชร์แผนการสอน</h2>
          <button class="close-btn" @click="showShareModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>เลือกแผนการสอน</label>
            <select v-model="shareForm.lessonPlanId">
              <option value="">-- เลือก --</option>
              <option v-for="plan in myPlans" :key="plan.id" :value="plan.id">
                {{ plan.title }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>คำอธิบายเพิ่มเติม</label>
            <textarea v-model="shareForm.description" rows="3" placeholder="แนะนำแผนการสอนนี้..."></textarea>
          </div>
          <div class="form-group">
            <label>แท็ก (คั่นด้วย ,)</label>
            <input v-model="shareForm.tags" type="text" placeholder="เช่น HOTS, 5E, ม.4" />
          </div>
          <div class="form-group checkbox">
            <input type="checkbox" id="allowComments" v-model="shareForm.allowComments" />
            <label for="allowComments">อนุญาตให้แสดงความคิดเห็น</label>
          </div>
          <div class="form-group checkbox">
            <input type="checkbox" id="allowDownload" v-model="shareForm.allowDownload" />
            <label for="allowDownload">อนุญาตให้ดาวน์โหลด</label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showShareModal = false">ยกเลิก</button>
          <button class="btn-submit" @click="sharePlan">แชร์</button>
        </div>
      </div>
    </div>

    <!-- Preview Modal -->
    <div v-if="showPreviewModal" class="modal-overlay" @click.self="showPreviewModal = false">
      <div class="modal-content preview-modal">
        <div class="modal-header">
          <h2>📄 {{ selectedPlan?.title }}</h2>
          <button class="close-btn" @click="showPreviewModal = false">×</button>
        </div>
        <div class="modal-body" v-if="selectedPlan">
          <!-- Plan Details -->
          <div class="preview-section">
            <h4>📝 รายละเอียด</h4>
            <p>{{ selectedPlan.description }}</p>
          </div>

          <div class="preview-section">
            <h4>🎯 วัตถุประสงค์การเรียนรู้</h4>
            <ul v-if="selectedPlan.learningOutcomes?.length">
              <li v-for="(lo, i) in selectedPlan.learningOutcomes" :key="i">{{ lo }}</li>
            </ul>
            <p v-else class="no-data">ไม่ระบุ</p>
          </div>

          <div class="preview-section" v-if="selectedPlan.model === '5e'">
            <h4>📚 ขั้นตอน 5E</h4>
            <div class="phases-list">
              <div v-for="phase in ['engage', 'explore', 'explain', 'elaborate', 'evaluate']" :key="phase" class="phase-item">
                <span class="phase-name">{{ getPhaseEmoji(phase) }} {{ getPhaseName(phase) }}</span>
                <p>{{ selectedPlan.phases?.[phase] || 'ไม่ระบุ' }}</p>
              </div>
            </div>
          </div>

          <div class="preview-section">
            <h4>📊 A.R.C.E. Focus</h4>
            <div class="arce-breakdown" v-if="selectedPlan.arceFocus?.length">
              <span v-for="arce in selectedPlan.arceFocus" :key="arce" class="arce-badge">{{ arce }}</span>
            </div>
            <p v-else class="no-data">ไม่ระบุ</p>
          </div>

          <!-- Author & Stats -->
          <div class="preview-footer">
            <div class="preview-author">
              <img :src="selectedPlan.authorPhoto || '/default-avatar.png'" class="author-avatar" />
              <div>
                <span class="author-name">{{ selectedPlan.authorName }}</span>
                <span class="author-date">แชร์เมื่อ {{ formatDate(selectedPlan.createdAt) }}</span>
              </div>
            </div>
            <div class="preview-stats">
              <span>⬇️ {{ selectedPlan.downloadsCount || 0 }} ดาวน์โหลด</span>
              <span>❤️ {{ selectedPlan.likesCount || 0 }} ถูกใจ</span>
            </div>
          </div>
        </div>
        <div class="modal-actions" v-if="selectedPlan">
          <button class="btn-download-full" @click="downloadPlan(selectedPlan)">⬇️ ดาวน์โหลดแผน</button>
          <button class="btn-fork" @click="forkPlan(selectedPlan)">🔀 คัดลอกไปแก้ไข</button>
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
const searchQuery = ref('')
const selectedCourse = ref('')
const selectedGrade = ref('')
const selectedModel = ref('')
const sortBy = ref('recent')

// Real data from system
const courses = ref([])

// Data
const plans = ref([])
const myPlans = ref([])

// Available grades from actual data
const availableGrades = computed(() => {
  const grades = new Set()
  plans.value.forEach(p => {
    if (p.gradeLevel) grades.add(p.gradeLevel)
    if (p.grade) grades.add(p.grade)
  })
  courses.value.forEach(c => {
    if (c.gradeLevel) grades.add(c.gradeLevel)
  })
  return Array.from(grades).sort()
})

// Stats
const stats = reactive({
  totalPlans: 0,
  courses: 0,
  contributors: 0,
  downloads: 0
})

// Modals
const showShareModal = ref(false)
const showPreviewModal = ref(false)
const selectedPlan = ref(null)

const shareForm = reactive({
  lessonPlanId: '',
  description: '',
  tags: '',
  allowComments: true,
  allowDownload: true
})

// Computed
const filteredPlans = computed(() => {
  let result = [...plans.value]

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.topicName?.toLowerCase().includes(q) ||
      p.courseName?.toLowerCase().includes(q)
    )
  }

  if (selectedCourse.value) {
    result = result.filter(p => p.courseId === selectedCourse.value)
  }

  if (selectedGrade.value) {
    result = result.filter(p => (p.gradeLevel || p.grade) === selectedGrade.value)
  }

  if (selectedModel.value) {
    result = result.filter(p => p.model === selectedModel.value)
  }

  // Sort
  switch (sortBy.value) {
    case 'popular':
      result.sort((a, b) => (b.downloadsCount || 0) - (a.downloadsCount || 0))
      break
    case 'rating':
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0))
      break
    default:
      result.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || new Date(0)
        return dateB - dateA
      })
  }

  return result
})

// Helpers
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

const truncateText = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const getSubjectName = (subject) => {
  const names = {
    math: 'คณิต',
    science: 'วิทย์',
    thai: 'ไทย',
    english: 'อังกฤษ',
    social: 'สังคม',
    other: 'อื่นๆ'
  }
  return names[subject] || 'อื่นๆ'
}

const getModelName = (model) => {
  const names = {
    '5e': '5E Model',
    traditional: 'แบบดั้งเดิม',
    pbl: 'PBL',
    flipped: 'Flipped'
  }
  return names[model] || model
}

const getPhaseName = (phase) => {
  const names = {
    engage: 'Engage',
    explore: 'Explore',
    explain: 'Explain',
    elaborate: 'Elaborate',
    evaluate: 'Evaluate'
  }
  return names[phase] || phase
}

const getPhaseEmoji = (phase) => {
  const emojis = {
    engage: '🎯',
    explore: '🔍',
    explain: '📝',
    elaborate: '🚀',
    evaluate: '✅'
  }
  return emojis[phase] || '📌'
}

const resetFilters = () => {
  searchQuery.value = ''
  selectedSubject.value = ''
  selectedGrade.value = ''
  selectedModel.value = ''
}

// Actions
const previewPlan = (plan) => {
  selectedPlan.value = plan
  showPreviewModal.value = true
}

const downloadPlan = async (plan) => {
  // Update download count
  await updateDoc(doc(db, 'lessonPlanShares', plan.id), {
    downloadsCount: increment(1)
  })
  plan.downloadsCount = (plan.downloadsCount || 0) + 1

  // Create download
  const content = JSON.stringify(plan, null, 2)
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${plan.title}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const toggleLike = async (plan) => {
  plan.isLiked = !plan.isLiked
  plan.likesCount = plan.isLiked ? (plan.likesCount || 0) + 1 : Math.max(0, (plan.likesCount || 1) - 1)
  
  await updateDoc(doc(db, 'lessonPlanShares', plan.id), {
    likesCount: increment(plan.isLiked ? 1 : -1)
  })
}

const forkPlan = (plan) => {
  // Navigate to lesson plan editor with forked data
  localStorage.setItem('forkedLessonPlan', JSON.stringify(plan))
  showPreviewModal.value = false
  alert('คัดลอกแผนแล้ว! ไปที่หน้าสร้างแผนการสอนเพื่อแก้ไข')
}

const sharePlan = async () => {
  if (!shareForm.lessonPlanId) {
    alert('กรุณาเลือกแผนการสอน')
    return
  }

  const selectedMyPlan = myPlans.value.find(p => p.id === shareForm.lessonPlanId)
  if (!selectedMyPlan) return

  try {
    await addDoc(collection(db, 'lessonPlanShares'), {
      ...selectedMyPlan,
      sharedDescription: shareForm.description,
      tags: shareForm.tags.split(',').map(t => t.trim()).filter(t => t),
      allowComments: shareForm.allowComments,
      allowDownload: shareForm.allowDownload,
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName || 'ครู',
      authorPhoto: authStore.user.photoURL,
      downloadsCount: 0,
      likesCount: 0,
      rating: 0,
      createdAt: serverTimestamp()
    })

    showShareModal.value = false
    shareForm.lessonPlanId = ''
    shareForm.description = ''
    shareForm.tags = ''
    loadPlans()
    alert('แชร์แผนการสอนสำเร็จ!')
  } catch (error) {
    console.error('Error sharing plan:', error)
    alert('เกิดข้อผิดพลาด')
  }
}

// Helper to detect subject from course name
const detectSubject = (courseName) => {
  const name = (courseName || '').toLowerCase()
  if (name.includes('คณิต') || name.includes('math')) return 'math'
  if (name.includes('วิทย') || name.includes('science')) return 'science'
  if (name.includes('ไทย') || name.includes('thai')) return 'thai'
  if (name.includes('อังกฤษ') || name.includes('english')) return 'english'
  if (name.includes('สังคม') || name.includes('social')) return 'social'
  return 'other'
}

// Load courses from system
const loadCourses = async () => {
  try {
    const coursesSnapshot = await getDocs(collection(db, 'courses'))
    courses.value = coursesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading courses:', error)
  }
}

// Load Data - from real lessonPlans collection
const loadPlans = async () => {
  loading.value = true
  try {
    // Load ALL lesson plans from the system (not filtered by teacherId for PLC)
    const plansSnapshot = await getDocs(collection(db, 'lessonPlans'))
    
    const allPlans = plansSnapshot.docs.map(doc => {
      const data = doc.data()
      // Find course info
      const course = courses.value.find(c => c.id === data.courseId)
      
      return {
        id: doc.id,
        ...data,
        // Map to display fields
        title: data.title || data.topicName || 'แผนการสอน',
        description: data.description || data.overview || '',
        subject: detectSubject(course?.courseName || data.courseName || ''),
        courseName: course?.courseName || data.courseName || 'ไม่ระบุ',
        grade: data.gradeLevel || course?.gradeLevel || '',
        model: data.model || '5e',
        authorName: data.teacherName || 'ครูผู้สอน',
        authorId: data.teacherId,
        loCount: data.learningOutcomes?.length || 0,
        duration: data.duration || 50,
        likesCount: data.likesCount || 0,
        downloadsCount: data.downloadsCount || 0,
        source: 'system'
      }
    })
    
    // Sort by createdAt desc
    allPlans.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0)
      const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0)
      return new Date(dateB) - new Date(dateA)
    })
    
    plans.value = allPlans
  } catch (error) {
    console.error('Error loading plans:', error)
  } finally {
    loading.value = false
  }
}

// Load my plans (for sharing dropdown)
const loadMyPlans = async () => {
  if (!authStore.user?.uid) return
  try {
    const myQuery = query(
      collection(db, 'lessonPlans'),
      where('teacherId', '==', authStore.user.uid)
    )
    const snapshot = await getDocs(myQuery)
    myPlans.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading my plans:', error)
  }
}

const loadStats = async () => {
  try {
    // Stats from actual plans
    stats.totalPlans = plans.value.length
    stats.courses = courses.value.length
    
    const authors = new Set(plans.value.map(p => p.authorId).filter(Boolean))
    stats.contributors = authors.size
    
    stats.downloads = plans.value.reduce((sum, p) => sum + (p.downloadsCount || 0), 0)
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

// Initialize
onMounted(async () => {
  await loadCourses()
  await loadPlans()
  await loadMyPlans()
  loadStats()
})
</script>

<style scoped>
.lesson-library {
  max-width: 1200px;
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
  font-size: 28px;
  color: var(--text-primary);
}

.btn-share {
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
  padding: 20px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 2px 8px var(--shadow);
  border: 1px solid var(--border-color);
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
  box-shadow: 0 2px 8px var(--shadow);
  border: 1px solid var(--border-color);
}

.search-box input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 15px;
  margin-bottom: 16px;
  background: var(--input-bg);
  color: var(--text-primary);
}

.filter-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-row select {
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  min-width: 120px;
  background: var(--input-bg);
  color: var(--text-primary);
}

/* Plans Grid */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.plan-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px var(--shadow);
  border: 1px solid var(--border-color);
}

.card-header {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.subject-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: var(--primary-light);
  color: #667eea;
}

.subject-badge.math { background: #e3f2fd; color: #1976d2; }
.subject-badge.science { background: #e8f5e9; color: #2e7d32; }
.subject-badge.thai { background: #fff3e0; color: #e65100; }
.subject-badge.english { background: #fce4ec; color: #c2185b; }
.subject-badge.social { background: #f3e5f5; color: #7b1fa2; }

.grade-badge {
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.plan-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.plan-desc {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.plan-info {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 12px;
}

.info-item {
  display: flex;
  gap: 4px;
}

.info-label {
  color: var(--text-secondary);
}

.info-value {
  color: var(--text-primary);
}

.arce-focus {
  margin-bottom: 12px;
}

.arce-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-right: 8px;
}

.arce-tags {
  display: inline-flex;
  gap: 6px;
}

.arce-tag {
  padding: 3px 8px;
  background: #fff8e1;
  color: #f57c00;
  border-radius: 8px;
  font-size: 11px;
}

.plan-author {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 10px;
  background: var(--bg-secondary);
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.author-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.author-info {
  flex: 1;
}

.author-name {
  display: block;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
}

.author-school {
  font-size: 11px;
  color: var(--text-secondary);
}

.plan-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.plan-actions {
  display: flex;
  gap: 8px;
}

.btn-preview, .btn-download {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}

.btn-preview {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-download {
  background: #667eea;
  color: white;
}

.btn-like {
  width: 40px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
}

.btn-like.active {
  background: #ffebee;
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

.preview-modal {
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

/* Preview Modal */
.preview-section {
  margin-bottom: 20px;
}

.preview-section h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: var(--text-primary);
}

.preview-section p {
  color: var(--text-primary);
}

.preview-section ul {
  margin: 0;
  padding-left: 20px;
  color: var(--text-primary);
}

.preview-section li {
  margin-bottom: 6px;
}

.no-data {
  color: var(--text-secondary);
  font-style: italic;
}

.phases-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.phase-item {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.phase-name {
  font-weight: 600;
  display: block;
  margin-bottom: 6px;
  color: var(--text-primary);
}

.phase-item p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.arce-breakdown {
  display: flex;
  gap: 8px;
}

.arce-badge {
  padding: 8px 14px;
  background: var(--primary-light);
  color: #667eea;
  border-radius: 20px;
  font-size: 13px;
}

.preview-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 10px;
  margin-bottom: 16px;
  border: 1px solid var(--border-color);
}

.preview-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-author .author-avatar {
  width: 40px;
  height: 40px;
}

.preview-author .author-name {
  font-weight: 600;
  color: var(--text-primary);
}

.preview-author .author-date {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
}

.preview-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 0 20px 20px;
}

.btn-download-full, .btn-fork {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
}

.btn-download-full {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-fork {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* States */
.loading-state, .empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--card-bg);
  border-radius: 12px;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f0f0f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state button {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 16px;
}

/* Responsive */
@media (max-width: 768px) {
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-row {
    flex-direction: column;
  }

  .filter-row select {
    width: 100%;
  }

  .plans-grid {
    grid-template-columns: 1fr;
  }
}

/* Dark Mode */
:root.dark-mode .lesson-library {
  color: #e0e0e0;
}

:root.dark-mode .stat,
:root.dark-mode .filters-section,
:root.dark-mode .plan-card,
:root.dark-mode .modal-content {
  background: #1e1e1e;
}

:root.dark-mode .search-box input,
:root.dark-mode .filter-row select,
:root.dark-mode .form-group input,
:root.dark-mode .form-group select,
:root.dark-mode .form-group textarea {
  background: #2d2d2d;
  border-color: var(--text-primary);
  color: #e0e0e0;
}

:root.dark-mode .plan-author {
  background: #2d2d2d;
}
</style>
