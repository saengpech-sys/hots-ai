<template>
  <div class="collaborative-task-list">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>👥 งานกลุ่ม (Collaborative Tasks)</h1>
        <p class="subtitle">งานที่ต้องทำร่วมกับเพื่อนในทีม</p>
      </div>
      <div class="header-actions">
        <button class="create-btn" @click="showCreateModal = true" v-if="isTeacher">
          ➕ สร้างงานกลุ่มใหม่
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button 
        :class="['tab', { active: activeTab === 'active' }]"
        @click="activeTab = 'active'"
      >
        🔥 กำลังดำเนินการ ({{ activeTasks.length }})
      </button>
      <button 
        :class="['tab', { active: activeTab === 'completed' }]"
        @click="activeTab = 'completed'"
      >
        ✅ เสร็จแล้ว ({{ completedTasks.length }})
      </button>
      <button 
        :class="['tab', { active: activeTab === 'upcoming' }]"
        @click="activeTab = 'upcoming'"
      >
        📅 กำลังจะมาถึง ({{ upcomingTasks.length }})
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredTasks.length === 0" class="empty-state">
      <span class="empty-icon">📋</span>
      <h3>{{ emptyMessage }}</h3>
      <p v-if="activeTab === 'active'">ยังไม่มีงานกลุ่มที่ต้องทำตอนนี้</p>
    </div>

    <!-- Task List -->
    <div v-else class="task-list">
      <div 
        v-for="task in filteredTasks"
        :key="task.id"
        class="task-card"
        @click="goToTask(task.id)"
      >
        <div class="task-header">
          <span class="task-type" :class="task.type">{{ getTypeLabel(task.type) }}</span>
          <span :class="['task-status', task.status]">{{ getStatusLabel(task.status) }}</span>
        </div>
        
        <h3 class="task-title">{{ task.title }}</h3>
        <p class="task-desc">{{ task.description }}</p>
        
        <div class="task-meta">
          <div class="meta-item">
            <span class="meta-icon">📚</span>
            <span>{{ task.courseName }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">📅</span>
            <span>กำหนดส่ง: {{ formatDate(task.deadline) }}</span>
          </div>
        </div>
        
        <div class="task-progress">
          <div class="progress-header">
            <span>ความคืบหน้า</span>
            <span>{{ task.progress }}%</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${task.progress}%` }"
              :class="{ urgent: task.isUrgent }"
            ></div>
          </div>
        </div>
        
        <div class="task-team">
          <div class="team-avatars">
            <img 
              v-for="member in task.teamMembers?.slice(0, 4)"
              :key="member.id"
              :src="member.photoURL || '/default-avatar.png'"
              :alt="member.name"
              class="member-avatar"
              :title="member.name"
            >
            <span v-if="task.teamMembers?.length > 4" class="more-members">
              +{{ task.teamMembers.length - 4 }}
            </span>
          </div>
          <span class="team-count">{{ task.teamMembers?.length || 0 }} คนในทีม</span>
        </div>
        
        <div class="task-footer">
          <div class="task-los" v-if="task.learningOutcomes?.length">
            <span class="lo-badge" v-for="lo in task.learningOutcomes.slice(0, 2)" :key="lo.code">
              {{ lo.code }}
            </span>
            <span v-if="task.learningOutcomes.length > 2" class="more-los">
              +{{ task.learningOutcomes.length - 2 }}
            </span>
          </div>
          <button class="view-btn">
            ดูงาน →
          </button>
        </div>
      </div>
    </div>

    <!-- Create Modal (for teachers) -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="create-modal">
        <div class="modal-header">
          <h2>➕ สร้างงานกลุ่มใหม่</h2>
          <button @click="showCreateModal = false" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>ชื่องาน</label>
            <input v-model="newTask.title" type="text" placeholder="เช่น โครงงานวิทยาศาสตร์">
          </div>
          
          <div class="form-group">
            <label>รายละเอียด</label>
            <textarea v-model="newTask.description" placeholder="อธิบายรายละเอียดงาน..."></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>ประเภทงาน</label>
              <select v-model="newTask.type">
                <option value="project">โครงงาน</option>
                <option value="research">งานวิจัย</option>
                <option value="presentation">นำเสนอ</option>
                <option value="assignment">ใบงานกลุ่ม</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>กำหนดส่ง</label>
              <input v-model="newTask.deadline" type="datetime-local">
            </div>
          </div>
          
          <div class="form-group">
            <label>รายวิชา</label>
            <select v-model="newTask.courseId">
              <option v-for="course in courses" :key="course.id" :value="course.id">
                {{ course.name }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Learning Outcomes ที่เกี่ยวข้อง</label>
            <div class="lo-selector">
              <label 
                v-for="lo in availableLOs"
                :key="lo.code"
                class="lo-option"
              >
                <input type="checkbox" v-model="newTask.selectedLOs" :value="lo.code">
                <span class="lo-code">{{ lo.code }}</span>
                <span class="lo-name">{{ lo.name }}</span>
              </label>
            </div>
          </div>
          
          <div class="form-group">
            <label>จำนวนสมาชิกต่อทีม</label>
            <input v-model.number="newTask.teamSize" type="number" min="2" max="6">
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" @click="showCreateModal = false">ยกเลิก</button>
          <button class="btn-primary" @click="createTask">สร้างงาน</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { collection, query, where, getDocs, addDoc, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'

const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(true)
const activeTab = ref('active')
const tasks = ref([])
const courses = ref([])
const availableLOs = ref([])
const showCreateModal = ref(false)

const newTask = ref({
  title: '',
  description: '',
  type: 'project',
  deadline: '',
  courseId: '',
  selectedLOs: [],
  teamSize: 4
})

// Computed
const isTeacher = computed(() => authStore.isTeacher)

const activeTasks = computed(() => 
  tasks.value.filter(t => t.status === 'in-progress' || t.status === 'active')
)

const completedTasks = computed(() => 
  tasks.value.filter(t => t.status === 'completed')
)

const upcomingTasks = computed(() => 
  tasks.value.filter(t => t.status === 'upcoming' || t.status === 'not-started')
)

const filteredTasks = computed(() => {
  switch (activeTab.value) {
    case 'active': return activeTasks.value
    case 'completed': return completedTasks.value
    case 'upcoming': return upcomingTasks.value
    default: return tasks.value
  }
})

const emptyMessage = computed(() => {
  switch (activeTab.value) {
    case 'active': return 'ไม่มีงานที่กำลังทำ'
    case 'completed': return 'ยังไม่มีงานที่เสร็จแล้ว'
    case 'upcoming': return 'ไม่มีงานที่กำลังจะมาถึง'
    default: return 'ไม่มีงาน'
  }
})

// Methods
function getTypeLabel(type) {
  const labels = {
    project: '🔬 โครงงาน',
    research: '📚 งานวิจัย',
    presentation: '🎤 นำเสนอ',
    assignment: '📝 ใบงานกลุ่ม'
  }
  return labels[type] || type
}

function getStatusLabel(status) {
  const labels = {
    'in-progress': 'กำลังทำ',
    'active': 'กำลังทำ',
    'completed': 'เสร็จแล้ว',
    'upcoming': 'กำลังจะถึง',
    'not-started': 'ยังไม่เริ่ม'
  }
  return labels[status] || status
}

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

function goToTask(taskId) {
  router.push(`/social/collaborative/${taskId}`)
}

async function loadTasks() {
  loading.value = true
  try {
    const userId = authStore.user?.uid
    
    // Query tasks where user is a member or teacher
    const q = query(
      collection(db, 'collaborativeTasks'),
      orderBy('deadline', 'asc')
    )
    
    const snapshot = await getDocs(q)
    tasks.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).filter(task => {
      // Filter tasks where user is a member or is the teacher
      if (authStore.isTeacher && task.teacherId === userId) return true
      return task.teamMembers?.some(m => m.id === userId)
    })
    
  } catch (error) {
    console.error('Error loading tasks:', error)
  } finally {
    loading.value = false
  }
}

async function loadCourses() {
  if (!authStore.isTeacher) return
  
  const q = query(
    collection(db, 'courses'),
    where('teacherId', '==', authStore.user?.uid)
  )
  const snapshot = await getDocs(q)
  courses.value = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}

async function createTask() {
  try {
    await addDoc(collection(db, 'collaborativeTasks'), {
      title: newTask.value.title,
      description: newTask.value.description,
      type: newTask.value.type,
      deadline: Timestamp.fromDate(new Date(newTask.value.deadline)),
      courseId: newTask.value.courseId,
      courseName: courses.value.find(c => c.id === newTask.value.courseId)?.name || '',
      learningOutcomes: newTask.value.selectedLOs.map(code => ({ code })),
      teamSize: newTask.value.teamSize,
      teacherId: authStore.user?.uid,
      status: 'upcoming',
      progress: 0,
      teamMembers: [],
      subtasks: [],
      createdAt: Timestamp.now()
    })
    
    showCreateModal.value = false
    newTask.value = {
      title: '',
      description: '',
      type: 'project',
      deadline: '',
      courseId: '',
      selectedLOs: [],
      teamSize: 4
    }
    
    await loadTasks()
  } catch (error) {
    console.error('Error creating task:', error)
  }
}

onMounted(async () => {
  await Promise.all([loadTasks(), loadCourses()])
})
</script>

<style scoped>
.collaborative-task-list {
  padding: 1rem;
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.subtitle {
  color: var(--text-secondary);
  margin: 0.25rem 0 0;
}

.create-btn {
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  overflow-x: auto;
}

.tab {
  padding: 0.75rem 1.5rem;
  background: var(--bg-secondary);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 500;
  transition: all 0.2s;
}

.tab.active {
  background: var(--primary-color);
  color: white;
}

/* Loading & Empty */
.loading-state, .empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: var(--text-secondary);
}

/* Task List */
.task-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
}

.task-card {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.task-type {
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  background: var(--bg-tertiary);
}

.task-type.project { background: #dbeafe; color: #1e40af; }
.task-type.research { background: #f3e8ff; color: #7c3aed; }
.task-type.presentation { background: #fef3c7; color: #92400e; }
.task-type.assignment { background: #dcfce7; color: #166534; }

.task-status {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 8px;
}

.task-status.in-progress, .task-status.active {
  background: #dbeafe;
  color: #1e40af;
}

.task-status.completed {
  background: #dcfce7;
  color: #166534;
}

.task-status.upcoming, .task-status.not-started {
  background: #fef3c7;
  color: #92400e;
}

.task-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
}

.task-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0 0 1rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.meta-icon {
  font-size: 0.9rem;
}

/* Progress */
.task-progress {
  margin-bottom: 1rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
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
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-fill.urgent {
  background: #ef4444;
}

/* Team */
.task-team {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.team-avatars {
  display: flex;
}

.member-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--bg-secondary);
  margin-left: -8px;
}

.member-avatar:first-child {
  margin-left: 0;
}

.more-members {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  margin-left: -8px;
  border: 2px solid var(--bg-secondary);
}

.team-count {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Footer */
.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-los {
  display: flex;
  gap: 0.25rem;
}

.lo-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  background: var(--primary-light);
  color: var(--primary-color);
  border-radius: 10px;
}

.more-los {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  background: var(--bg-tertiary);
  border-radius: 10px;
}

.view-btn {
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
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
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
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

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.form-group textarea {
  min-height: 100px;
  resize: vertical;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.lo-selector {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.5rem;
}

.lo-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
}

.lo-option:hover {
  background: var(--bg-secondary);
  border-radius: 6px;
}

.lo-code {
  font-weight: 600;
  color: var(--primary-color);
}

.lo-name {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}
</style>
