<template>
  <div class="library-container">
    <div class="library-header">
      <h1>📚 คลัง Micro Lessons</h1>
      <p class="subtitle">บทเรียนสั้นที่สร้างโดย AI เพื่อช่วยนักเรียนที่ดิ้นรน</p>
    </div>

    <!-- Library Tabs -->
    <div class="library-tabs">
      <button 
        :class="['tab-btn', { active: activeTab === 'my-lessons' }]"
        @click="switchTab('my-lessons')"
      >
        🏫 บทเรียนของฉัน
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'national' }]"
        @click="switchTab('national')"
      >
        🌐 National PLC (แบ่งปัน)
      </button>
    </div>

    <!-- Filters -->
    <div class="filters card">
      <div class="filter-group">
        <label>รายวิชา:</label>
        <select v-model="selectedCourse" @change="loadLessons">
          <option value="">ทั้งหมด</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.courseName }}
          </option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>เรียงตาม:</label>
        <select v-model="sortBy" @change="loadLessons">
          <option value="usageCount">ใช้บ่อยที่สุด</option>
          <option value="createdAt">สร้างล่าสุด</option>
          <option value="lastUsedAt">ใช้ล่าสุด</option>
        </select>
      </div>

      <div class="stats-summary">
        <div class="stat-item">
          <span class="stat-value">{{ lessons.length }}</span>
          <span class="stat-label">บทเรียนทั้งหมด</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ totalUsage }}</span>
          <span class="stat-label">ครั้งที่ใช้งาน</span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>กำลังโหลดบทเรียน...</p>
    </div>

    <!-- Lessons Grid -->
    <div v-else-if="lessons.length > 0" class="lessons-grid">
      <div v-for="lesson in lessons" :key="lesson.id" class="lesson-card card">
        <div class="lesson-header">
          <h3>{{ lesson.title }}</h3>
          <span v-if="!lesson.teacherId" class="ai-badge">🤖 AI Auto-Gen</span>
          <span v-else-if="lesson.aiGenerated" class="ai-badge">🤖 AI</span>
          <span v-else class="manual-badge">✍️ Manual</span>
        </div>

        <div class="lesson-meta">
          <div class="meta-item">
            <span class="icon">📖</span>
            <span>{{ lesson.relatedLOs?.join(', ') || 'ไม่ระบุ LO' }}</span>
          </div>
          <div class="meta-item">
            <span class="icon">👥</span>
            <span>ใช้งาน {{ lesson.usageCount || 0 }} ครั้ง</span>
          </div>
          <div class="meta-item">
            <span class="icon">⏱️</span>
            <span>{{ lesson.estimatedMinutes || 10 }} นาที</span>
          </div>
          <div v-if="lesson.lastUsedAt" class="meta-item">
            <span class="icon">🕐</span>
            <span>ใช้ล่าสุด: {{ formatDate(lesson.lastUsedAt) }}</span>
          </div>
        </div>

        <div v-if="lesson.strugglingDimensions?.length > 0" class="dimensions">
          <span class="dimension-label">เน้นพัฒนา:</span>
          <span 
            v-for="dim in lesson.strugglingDimensions" 
            :key="dim"
            class="dimension-tag"
          >
            {{ getDimensionName(dim) }}
          </span>
        </div>

        <div class="lesson-preview">
          <p>{{ getPreview(lesson.content) }}</p>
        </div>

        <div class="lesson-actions">
          <button @click="viewLesson(lesson)" class="btn btn-primary">
            <span>👁️</span> ดูรายละเอียด
          </button>
          <button v-if="activeTab === 'my-lessons'" @click="deleteLesson(lesson.id)" class="btn btn-danger">
            <span>🗑️</span> ลบ
          </button>
          <button v-if="activeTab === 'national'" @click="importLesson(lesson)" class="btn btn-success">
            <span>📥</span> นำเข้า
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">📚</div>
      <h3>ยังไม่มีบทเรียนในคลัง</h3>
      <p>บทเรียนจะถูกสร้างอotomaticเมื่อนักเรียนต้องการความช่วยเหลือ</p>
    </div>

    <!-- View Lesson Modal -->
    <Teleport to="body">
      <div v-if="viewingLesson" class="modal-overlay" @click.self="viewingLesson = null">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ viewingLesson.title }}</h2>
            <button @click="viewingLesson = null" class="close-btn">✕</button>
          </div>
          
          <div class="modal-body">
            <div class="lesson-section">
              <h3>📚 เนื้อหาหลัก</h3>
              <div v-html="renderMarkdown(viewingLesson.content)"></div>
            </div>

            <div v-if="viewingLesson.examples" class="lesson-section">
              <h3>💡 ตัวอย่าง</h3>
              <div v-html="renderMarkdown(viewingLesson.examples)"></div>
            </div>

            <div v-if="viewingLesson.exercises" class="lesson-section">
              <h3>✍️ แบบฝึกหัด</h3>
              <div v-html="renderMarkdown(viewingLesson.exercises)"></div>
            </div>

            <div v-if="viewingLesson.summary" class="lesson-section">
              <h3>🎯 สรุป</h3>
              <div v-html="renderMarkdown(viewingLesson.summary)"></div>
            </div>

            <div class="lesson-stats">
              <p><strong>Learning Outcomes:</strong> {{ viewingLesson.relatedLOs?.join(', ') }}</p>
              <p><strong>ใช้งาน:</strong> {{ viewingLesson.usageCount || 0 }} ครั้ง</p>
              <p><strong>สร้างเมื่อ:</strong> {{ formatDate(viewingLesson.createdAt) }}</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, addDoc, serverTimestamp, limit } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import { marked } from 'marked'

const authStore = useAuthStore()

const courses = ref([])
const lessons = ref([])
const loading = ref(false)
const selectedCourse = ref('')
const sortBy = ref('usageCount')
const viewingLesson = ref(null)
const activeTab = ref('my-lessons')

const totalUsage = computed(() => {
  return lessons.value.reduce((sum, lesson) => sum + (lesson.usageCount || 0), 0)
})

onMounted(async () => {
  await loadCourses()
  await loadLessons()
})

function switchTab(tab) {
  activeTab.value = tab
  selectedCourse.value = '' // Reset filter
  loadLessons()
}

async function loadCourses() {
  try {
    const q = query(
      collection(db, 'courses'),
      where('teacherId', '==', authStore.user.uid)
    )
    const snapshot = await getDocs(q)
    courses.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading courses:', error)
  }
}

async function loadLessons() {
  loading.value = true
  try {
    let lessonsList = []

    if (activeTab.value === 'national') {
      // Load public lessons
      const q = query(
        collection(db, 'microLessons'),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(50)
      )
      const snapshot = await getDocs(q)
      lessonsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        usageCount: doc.data().usageCount || 0,
        lastUsedAt: doc.data().lastUsedAt || doc.data().createdAt
      }))
    } else {
      // My Lessons (Existing Logic)
      const teacherCourseIds = courses.value.map(c => c.id)
      
      let q
      if (selectedCourse.value) {
        q = query(
          collection(db, 'microLessons'),
          where('courseId', '==', selectedCourse.value)
        )
      } else {
        q = query(collection(db, 'microLessons'))
      }
      
      const snapshot = await getDocs(q)
      lessonsList = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          usageCount: doc.data().usageCount || 0,
          lastUsedAt: doc.data().lastUsedAt || doc.data().createdAt
        }))
        .filter(lesson => {
          return lesson.teacherId === authStore.user.uid || 
                 (!lesson.teacherId && teacherCourseIds.includes(lesson.courseId))
        })
    }
    
    // Sort in JavaScript (client-side)
    const sortField = sortBy.value
    lessonsList.sort((a, b) => {
      if (sortField === 'usageCount') {
        return (b.usageCount || 0) - (a.usageCount || 0)
      } else if (sortField === 'createdAt') {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
        return bTime - aTime
      } else { // lastUsedAt
        const aTime = a.lastUsedAt?.toMillis ? a.lastUsedAt.toMillis() : 0
        const bTime = b.lastUsedAt?.toMillis ? b.lastUsedAt.toMillis() : 0
        return bTime - aTime
      }
    })
    
    lessons.value = lessonsList
  } catch (error) {
    console.error('Error loading lessons:', error)
    alert('เกิดข้อผิดพลาดในการโหลดบทเรียน: ' + error.message)
  } finally {
    loading.value = false
  }
}

function viewLesson(lesson) {
  viewingLesson.value = lesson
}

async function deleteLesson(lessonId) {
  if (!confirm('ต้องการลบบทเรียนนี้หรือไม่?')) return
  
  try {
    await deleteDoc(doc(db, 'microLessons', lessonId))
    lessons.value = lessons.value.filter(l => l.id !== lessonId)
    alert('ลบบทเรียนสำเร็จ')
  } catch (error) {
    console.error('Error deleting lesson:', error)
    alert('เกิดข้อผิดพลาดในการลบ')
  }
}

async function importLesson(lesson) {
  const targetCourseId = prompt('กรุณาระบุ Course ID ที่ต้องการนำเข้า (หรือเลือกรายวิชาในแท็บ "บทเรียนของฉัน" ก่อน):', courses.value[0]?.id)
  if (!targetCourseId) return

  try {
    await addDoc(collection(db, 'microLessons'), {
      ...lesson,
      courseId: targetCourseId,
      teacherId: authStore.user.uid,
      usageCount: 0,
      createdAt: serverTimestamp(),
      lastUsedAt: null,
      isPublic: false, // Imported lessons are private by default
      originalLessonId: lesson.id,
      aiGenerated: false // Treat as manual import
    })
    
    alert('นำเข้าบทเรียนสำเร็จ!')
  } catch (error) {
    console.error('Error importing lesson:', error)
    alert('เกิดข้อผิดพลาดในการนำเข้า')
  }
}

function getDimensionName(dim) {
  const names = {
    analysis: 'การวิเคราะห์',
    reasoning: 'การให้เหตุผล',
    creativity: 'ความคิดสร้างสรรค์',
    evidence: 'การใช้หลักฐาน'
  }
  return names[dim] || dim
}

function getPreview(content) {
  if (!content) return 'ไม่มีเนื้อหา'
  const text = typeof content === 'string' ? content : JSON.stringify(content)
  return text.substring(0, 150) + (text.length > 150 ? '...' : '')
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function renderMarkdown(content) {
  if (!content) return '<p>ไม่มีเนื้อหา</p>'
  
  let text = content
  if (Array.isArray(content)) {
    text = content.join('\n\n')
  } else if (typeof content === 'object') {
    text = JSON.stringify(content, null, 2)
  }
  
  return marked(String(text))
}
</script>

<style scoped>
.library-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;

  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.library-header {
  text-align: center;
  margin-bottom: 2rem;
}

.library-header h1 {
  font-size: 2.5rem;
  color: #1a202c;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #6b7280;
  font-size: 1.1rem;
}

.library-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  justify-content: center;
}

.tab-btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: 2px solid transparent;
  border-radius: 12px;
  background: #f3f4f6;
  color: #1f2937;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn.active {
  border-color: #3b82f6;
  background: var(--card-bg);
  font-weight: 600;
}

.filters {
  display: flex;
  gap: 2rem;
  align-items: center;
  padding: 1.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-group label {
  font-weight: 600;
  color: #4b5563;
}

.filter-group select {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  background: var(--card-bg);
  cursor: pointer;
}

.stats-summary {
  display: flex;
  gap: 2rem;
  margin-left: auto;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #3b82f6;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.loading {
  text-align: center;
  padding: 4rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.lessons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
}

.lesson-card {
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.lesson-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.lesson-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
}

.lesson-header h3 {
  font-size: 1.25rem;
  color: #1a202c;
  margin: 0;
  flex: 1;
}

.ai-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.manual-badge {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.lesson-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.meta-item .icon {
  font-size: 1rem;
}

.dimensions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
}

.dimension-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 600;
}

.dimension-tag {
  background: #fef3c7;
  color: #92400e;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.lesson-preview {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.lesson-preview p {
  margin: 0;
  color: #4b5563;
  font-size: 0.875rem;
  line-height: 1.6;
}

.lesson-actions {
  display: flex;
  gap: 0.75rem;
}

.lesson-actions button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: #1a202c;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #6b7280;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 2rem;
  overflow-y: auto;
}

.modal-content {
  background: var(--card-bg);
  border-radius: 16px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  border-bottom: 2px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  color: #1a202c;
}

.close-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #1f2937;
  transform: rotate(90deg);
}

.modal-body {
  padding: 2rem;
}

.lesson-section {
  margin-bottom: 2rem;
}

.lesson-section h3 {
  color: #1a202c;
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

.lesson-section :deep(p) {
  line-height: 1.8;
  color: #4b5563;
}

.lesson-section :deep(ul),
.lesson-section :deep(ol) {
  margin-left: 2rem;
  line-height: 1.8;
}

.lesson-stats {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 12px;
  margin-top: 2rem;
}

.lesson-stats p {
  margin: 0.5rem 0;
  color: #4b5563;
}

.btn-success {
  background-color: var(--success);
  color: white;
}

.btn-success:hover {
  background-color: #38a169;
}

/* Dark mode */
.dark-mode .library-header h1,
.dark-mode .lesson-header h3,
.dark-mode .modal-header h2 {
  color: #f7fafc;
}

.dark-mode .subtitle,
.dark-mode .meta-item,
.dark-mode .lesson-preview p {
  color: #cbd5e0;
}

.dark-mode .lesson-card,
.dark-mode .modal-content {
  background: #1a202c;
}

.dark-mode .lesson-preview,
.dark-mode .lesson-stats {
  background: #2d3748;
}

@media (max-width: 768px) {
  .lessons-grid {
    grid-template-columns: 1fr;
  }
  
  .filters {
    flex-direction: column;
    align-items: stretch;
  }
  
  .stats-summary {
    margin-left: 0;
    width: 100%;
    justify-content: center;
  }
}
</style>
