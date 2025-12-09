<template>
  <div class="lesson-plans-page">
    <!-- Top Navigation -->
    <nav class="top-navbar">
      <div class="nav-brand">
        <router-link to="/teacher" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <span class="brand-icon">📝</span>
        <span class="brand-text">แผนการจัดการเรียนรู้</span>
      </div>
      <div class="nav-actions">
        <button class="btn btn-primary" @click="showGenerateModal = true">
          <span class="material-icons">auto_awesome</span>
          สร้างแผนด้วย AI
        </button>
      </div>
    </nav>

    <div class="page-content">
      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>รายวิชา</label>
          <select v-model="selectedCourse" @change="filterPlans" class="form-control">
            <option value="">ทั้งหมด</option>
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.courseCode || course.code || '' }} - {{ course.courseName || course.name }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label>สถานะ</label>
          <select v-model="selectedStatus" @change="filterPlans" class="form-control">
            <option value="">ทั้งหมด</option>
            <option value="draft">แบบร่าง</option>
            <option value="published">เผยแพร่แล้ว</option>
          </select>
        </div>
        <div class="search-group">
          <span class="material-icons">search</span>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="ค้นหาแผนการสอน..."
            class="form-control"
          >
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon blue">
            <span class="material-icons">description</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ lessonPlanStore.lessonPlans.length }}</span>
            <span class="stat-label">แผนทั้งหมด</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <span class="material-icons">check_circle</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ lessonPlanStore.publishedPlans.length }}</span>
            <span class="stat-label">เผยแพร่แล้ว</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">
            <span class="material-icons">edit_note</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ lessonPlanStore.draftPlans.length }}</span>
            <span class="stat-label">แบบร่าง</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">
            <span class="material-icons">auto_awesome</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ aiGeneratedCount }}</span>
            <span class="stat-label">สร้างโดย AI</span>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="lessonPlanStore.loading" class="loading-container">
        <LoadingSpinner />
        <p>กำลังโหลดแผนการสอน...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredPlans.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>ยังไม่มีแผนการสอน</h3>
        <p>เริ่มสร้างแผนการสอนแรกด้วย AI กันเลย!</p>
        <button class="btn btn-primary btn-lg" @click="showGenerateModal = true">
          <span class="material-icons">auto_awesome</span>
          สร้างแผนด้วย AI
        </button>
      </div>

      <!-- Plans Grouped by Course -->
      <div v-else class="plans-by-course">
        <div 
          v-for="group in groupedPlans" 
          :key="group.courseId" 
          class="course-group"
        >
          <!-- Course Header -->
          <div class="course-group-header">
            <div class="course-info">
              <span class="material-icons">menu_book</span>
              <span class="course-code">{{ group.courseCode }}</span>
              <span class="course-name">{{ group.courseName }}</span>
            </div>
            <span class="plan-count">{{ group.plans.length }} แผน</span>
          </div>
          
          <!-- Plans Grid for this Course -->
          <div class="plans-grid">
            <div 
              v-for="plan in group.plans" 
              :key="plan.id" 
              class="plan-card"
              @click="viewPlan(plan.id)"
            >
              <div class="plan-header">
                <div class="plan-status" :class="plan.status">
                  {{ plan.status === 'published' ? 'เผยแพร่แล้ว' : 'แบบร่าง' }}
                </div>
                <div class="plan-actions" @click.stop>
                  <button class="btn-icon" @click="duplicatePlan(plan.id)" title="คัดลอก">
                    <span class="material-icons">content_copy</span>
                  </button>
                  <button class="btn-icon" @click="editPlan(plan.id)" title="แก้ไข">
                    <span class="material-icons">edit</span>
                  </button>
                  <button class="btn-icon danger" @click="confirmDelete(plan)" title="ลบ">
                    <span class="material-icons">delete</span>
                  </button>
                </div>
              </div>
              
              <div class="plan-content">
                <!-- Unit & Plan Number Badge -->
                <div class="plan-unit-info">
                  <span class="unit-badge">
                    หน่วยที่ {{ plan.unitNumber || plan.header?.unitNumber || 1 }}
                  </span>
                  <span class="plan-number-badge">
                    แผนที่ {{ plan.planNumber || plan.header?.planNumber || 1 }}
                  </span>
                </div>
                
                <h3 class="plan-title">{{ plan.topic || plan.title || 'แผนการสอน' }}</h3>
                
                <div class="plan-meta">
                  <span class="meta-item">
                    <span class="material-icons">schedule</span>
                    {{ plan.duration || 50 }} นาที
                  </span>
                  <span class="meta-item">
                    <span class="material-icons">school</span>
                    {{ plan.gradeLevel || 'ม.4' }}
                  </span>
                  <span v-if="plan.aiGenerated" class="meta-item ai-badge">
                    <span class="material-icons">auto_awesome</span>
                    AI
                  </span>
                </div>

                <div class="plan-los" v-if="plan.targetLOs?.length">
                  <div class="los-tags">
                    <span v-for="lo in plan.targetLOs.slice(0, 3)" :key="lo" class="lo-tag">
                      {{ lo }}
                    </span>
                    <span v-if="plan.targetLOs.length > 3" class="lo-more">
                      +{{ plan.targetLOs.length - 3 }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="plan-footer">
                <span class="update-time">
                  <span class="material-icons">update</span>
                  {{ formatDate(plan.updatedAt) }}
                </span>
                <button class="btn btn-sm btn-primary" @click.stop="viewPlan(plan.id)">
                  ดูรายละเอียด
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Generate Modal -->
    <GeneratePlanModal 
      v-if="showGenerateModal"
      :courses="courses"
      @close="showGenerateModal = false"
      @generated="onPlanGenerated"
    />

    <!-- Delete Confirmation -->
    <div v-if="planToDelete" class="modal-overlay" @click="planToDelete = null">
      <div class="confirm-modal" @click.stop>
        <h3>⚠️ ยืนยันการลบ</h3>
        <p>ต้องการลบแผนการสอน "{{ planToDelete.title }}" หรือไม่?</p>
        <p class="warning-text">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="planToDelete = null">ยกเลิก</button>
          <button class="btn btn-danger" @click="deletePlan">ลบแผน</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLessonPlanStore } from '@/stores/lessonPlan'
import { useAuthStore } from '@/stores/auth'
import { db } from '@/firebase/config'
import { collection, query, where, getDocs } from 'firebase/firestore'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import GeneratePlanModal from '@/components/lesson/GeneratePlanModal.vue'

const router = useRouter()
const lessonPlanStore = useLessonPlanStore()
const authStore = useAuthStore()

const courses = ref([])
const selectedCourse = ref('')
const selectedStatus = ref('')
const searchQuery = ref('')
const showGenerateModal = ref(false)
const planToDelete = ref(null)

const aiGeneratedCount = computed(() => {
  return lessonPlanStore.lessonPlans.filter(p => p.aiGenerated).length
})

const filteredPlans = computed(() => {
  let plans = lessonPlanStore.lessonPlans

  if (selectedCourse.value) {
    plans = plans.filter(p => p.courseId === selectedCourse.value)
  }

  if (selectedStatus.value) {
    plans = plans.filter(p => p.status === selectedStatus.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    plans = plans.filter(p => 
      p.title?.toLowerCase().includes(query) ||
      p.components?.objectives?.some(o => o.toLowerCase().includes(query))
    )
  }

  return plans
})

// Group plans by course, sorted by unit and plan number
const groupedPlans = computed(() => {
  const groups = {}
  
  filteredPlans.value.forEach(plan => {
    const courseId = plan.courseId || 'uncategorized'
    if (!groups[courseId]) {
      const course = courses.value.find(c => c.id === courseId)
      groups[courseId] = {
        courseId,
        courseCode: plan.courseCode || course?.courseCode || course?.code || '',
        courseName: plan.courseName || course?.courseName || course?.name || 'ไม่ระบุรายวิชา',
        plans: []
      }
    }
    groups[courseId].plans.push(plan)
  })
  
  // Sort plans within each group by unit number then plan number
  Object.values(groups).forEach(group => {
    group.plans.sort((a, b) => {
      const unitA = a.unitNumber || a.header?.unitNumber || 1
      const unitB = b.unitNumber || b.header?.unitNumber || 1
      if (unitA !== unitB) return unitA - unitB
      
      const planA = a.planNumber || a.header?.planNumber || 1
      const planB = b.planNumber || b.header?.planNumber || 1
      return planA - planB
    })
  })
  
  // Sort groups by course code
  return Object.values(groups).sort((a, b) => 
    a.courseCode.localeCompare(b.courseCode)
  )
})

function getCourseName(plan) {
  // First try to get from plan's stored course info
  if (plan.courseCode && plan.courseName) {
    return `${plan.courseCode} - ${plan.courseName}`
  }
  if (plan.courseName) {
    return plan.courseName
  }
  // Fallback to courses lookup
  const course = courses.value.find(c => c.id === plan.courseId)
  return course ? `${course.courseCode || course.code || ''} - ${course.courseName || course.name}` : 'ไม่ระบุวิชา'
}

// Strip redundant prefix from text
function stripRedundantPrefix(text) {
  if (!text) return text
  return text
    .replace(/^หน่วยที่\s*\d+\s*[\:\-]?\s*/i, '')
    .replace(/^แผนที่\s*\d+\s*[\:\-]?\s*/i, '')
}

function formatDate(date) {
  if (!date) return '-'
  const d = date.toDate ? date.toDate() : new Date(date)
  return d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function viewPlan(planId) {
  router.push(`/lesson-plans/${planId}`)
}

function editPlan(planId) {
  router.push(`/lesson-plans/${planId}/edit`)
}

async function duplicatePlan(planId) {
  try {
    const newId = await lessonPlanStore.duplicatePlan(planId)
    router.push(`/lesson-plans/${newId}/edit`)
  } catch (error) {
    alert('เกิดข้อผิดพลาดในการคัดลอกแผน')
  }
}

function confirmDelete(plan) {
  planToDelete.value = plan
}

async function deletePlan() {
  if (!planToDelete.value) return
  
  try {
    await lessonPlanStore.deletePlan(planToDelete.value.id)
    planToDelete.value = null
  } catch (error) {
    alert('เกิดข้อผิดพลาดในการลบแผน')
  }
}

function filterPlans() {
  // Filtering is handled by computed property
}

function onPlanGenerated(plan) {
  showGenerateModal.value = false
  router.push(`/lesson-plans/${plan.id}`)
}

async function loadCourses() {
  try {
    const q = query(
      collection(db, 'courses'),
      where('teacherId', '==', authStore.user?.uid)
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

onMounted(async () => {
  await loadCourses()
  await lessonPlanStore.fetchLessonPlans()
})
</script>

<style scoped>
.lesson-plans-page {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Navbar */
.top-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.back-link:hover {
  background: var(--bg-primary);
  color: var(--primary);
}

.brand-icon {
  font-size: 1.5rem;
}

.brand-text {
  font-size: 1.25rem;
  font-weight: 700;
}

.nav-actions {
  display: flex;
  gap: 0.75rem;
}

/* Page Content */
.page-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

/* Filters */
.filters-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.filter-group .form-control {
  min-width: 200px;
}

.search-group {
  flex: 1;
  display: flex;
  align-items: flex-end;
  position: relative;
}

.search-group .material-icons {
  position: absolute;
  left: 12px;
  bottom: 10px;
  color: var(--text-secondary);
}

.search-group .form-control {
  padding-left: 40px;
  width: 100%;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.blue {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.stat-icon.green {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.stat-icon.orange {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.stat-icon.purple {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Loading & Empty */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  gap: 1rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

/* Course Group Layout */
.plans-by-course {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.course-group {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
}

.course-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
  border-bottom: 1px solid var(--border-color);
}

.course-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.course-info .material-icons {
  color: var(--primary);
  font-size: 1.5rem;
}

.course-code {
  font-weight: 700;
  color: var(--primary);
  font-size: 1rem;
}

.course-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
}

.plan-count {
  background: var(--primary);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.course-group .plans-grid {
  padding: 1.5rem;
  background: var(--bg-primary);
}

/* Plans Grid */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
}

.plan-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  border-color: var(--primary);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border-bottom: 1px solid var(--border-color);
}

.plan-status {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.plan-status.draft {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.plan-status.published {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.plan-actions {
  display: flex;
  gap: 0.25rem;
}

.plan-actions .btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.plan-actions .btn-icon:hover {
  background: var(--bg-primary);
  color: var(--primary);
}

.plan-actions .btn-icon.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.plan-actions .btn-icon .material-icons {
  font-size: 1.125rem;
}

.plan-content {
  padding: 1.25rem;
}

/* Unit & Plan Number Badges */
.plan-unit-info {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.unit-badge {
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
}

.plan-number-badge {
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: white;
}

.plan-unit-name {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  font-style: italic;
}

.plan-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.plan-course {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.plan-course .material-icons {
  font-size: 1rem;
}

.plan-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  padding: 0.25rem 0.5rem;
  background: var(--bg-primary);
  border-radius: 6px;
}

.meta-item .material-icons {
  font-size: 0.875rem;
}

.meta-item.ai-badge {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2));
  color: #8b5cf6;
}

.plan-los {
  margin-top: 1rem;
}

.los-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 0.5rem;
}

.los-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lo-tag {
  padding: 0.25rem 0.5rem;
  background: rgba(102, 126, 234, 0.15);
  color: var(--primary);
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.lo-more {
  padding: 0.25rem 0.5rem;
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 0.75rem;
}

.plan-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.update-time {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.update-time .material-icons {
  font-size: 1rem;
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.confirm-modal {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
}

.confirm-modal h3 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.confirm-modal p {
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.warning-text {
  color: #ef4444 !important;
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-lg {
  padding: 0.875rem 1.75rem;
  font-size: 1rem;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  border-color: var(--primary);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn .material-icons {
  font-size: 1.125rem;
}

/* Form Controls */
.form-control {
  padding: 0.625rem 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Responsive */
@media (max-width: 768px) {
  .top-navbar {
    padding: 1rem;
  }

  .page-content {
    padding: 1rem;
  }

  .filters-section {
    flex-direction: column;
  }

  .filter-group .form-control {
    min-width: 100%;
  }

  .plans-grid {
    grid-template-columns: 1fr;
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
