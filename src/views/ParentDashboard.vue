<template>
  <div class="parent-dashboard">
    <!-- Top Navigation Bar -->
    <nav class="top-navbar">
      <div class="nav-brand">
        <span class="brand-icon">🧠</span>
        <span class="brand-text">HOTS AI</span>
      </div>
      <div class="nav-actions">
        <button class="nav-btn" @click="toggleDarkMode" title="เปลี่ยนธีม">
          <span class="material-icons">{{ isDarkMode ? 'light_mode' : 'dark_mode' }}</span>
        </button>
        <button class="nav-btn logout-btn" @click="handleLogout" title="ออกจากระบบ">
          <span class="material-icons">logout</span>
          <span class="btn-label">ออกจากระบบ</span>
        </button>
      </div>
    </nav>

    <div class="dashboard-header">
      <div>
        <h1>👨‍👩‍👧‍👦 Parent Dashboard</h1>
        <p class="subtitle">ติดตามพัฒนาการและสนับสนุนการเรียนรู้ของบุตรหลาน</p>
      </div>
    </div>

    <!-- Student Tabs (if has linked students) -->
    <div v-if="linkedStudents.length > 0" class="student-tabs-container">
      <div class="student-tabs">
        <button 
          v-for="student in linkedStudents" 
          :key="student.id"
          :class="['student-tab', { active: selectedStudentId === student.id }]"
          @click="selectStudent(student.id)"
        >
          <span class="student-avatar">{{ getInitials(student.name) }}</span>
          <span class="student-name">{{ student.name }}</span>
          <span v-if="student.grade" class="student-grade">{{ student.grade }}</span>
        </button>
        <button class="student-tab add-student-btn" @click="showAddStudent = true">
          <span class="material-icons">add</span>
          <span>เพิ่มบุตรหลาน</span>
        </button>
      </div>
    </div>

    <!-- Add Student Modal -->
    <div v-if="showAddStudent || linkedStudents.length === 0" class="link-student-card card">
      <div class="link-content">
        <div class="link-header" v-if="linkedStudents.length > 0">
          <h3>➕ เพิ่มบุตรหลานอีกคน</h3>
          <button class="close-btn" @click="showAddStudent = false">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div v-else>
          <span class="material-icons icon-large">link</span>
          <h3>เชื่อมต่อกับบัญชีนักเรียน</h3>
        </div>
        <p>กรุณากรอกรหัสนักเรียน (Student ID) และรหัสผู้ปกครอง (Parent Code)</p>
        <div class="input-group-vertical">
          <input v-model="studentIdInput" type="text" placeholder="รหัสนักเรียน 5 หลัก" maxlength="5" class="form-input">
          <input v-model="parentCodeInput" type="text" placeholder="รหัสผู้ปกครอง 6 หลัก" maxlength="6" class="form-input">
          <button @click="linkStudent" class="btn btn-primary full-width" :disabled="!studentIdInput || !parentCodeInput || linking">
            {{ linking ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อ' }}
          </button>
        </div>
        <p v-if="linkError" class="error-text">{{ linkError }}</p>
        <p v-if="linkSuccess" class="success-text">✅ {{ linkSuccess }}</p>
      </div>
    </div>

    <div v-if="linkedStudents.length > 0 && loading" class="loading-container">
      <LoadingSpinner />
    </div>

    <div v-else-if="linkedStudents.length > 0 && !showAddStudent" class="dashboard-content">
      <!-- Selected Student Info Card -->
      <div class="selected-student-card">
        <div class="student-info-header">
          <div class="student-large-avatar">{{ getInitials(currentStudent?.name) }}</div>
          <div class="student-info-details">
            <h2 class="student-display-name">{{ currentStudent?.name || 'ไม่ระบุชื่อ' }}</h2>
            <p class="student-meta">
              <span v-if="currentStudent?.grade">📚 {{ currentStudent.grade }}</span>
              <span v-if="currentStudent?.studentId">🎫 รหัส: {{ currentStudent.studentId }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Overview Cards -->
      <div class="stats-grid">
        <div class="stat-card border-blue">
          <div class="stat-content">
            <div>
              <p class="stat-label">ระดับ HOTS</p>
              <h3 class="stat-value">{{ studentStats.hotsLevel || 'Beginner' }}</h3>
            </div>
            <span class="material-icons stat-icon icon-blue">psychology</span>
          </div>
        </div>

        <div class="stat-card border-green">
          <div class="stat-content">
            <div>
              <p class="stat-label">Learning Outcomes</p>
              <h3 class="stat-value">{{ studentStats.passedLOs || 0 }}</h3>
              <p class="stat-sub">ผ่านแล้ว</p>
            </div>
            <span class="material-icons stat-icon icon-green">check_circle</span>
          </div>
        </div>

        <div class="stat-card border-purple">
          <div class="stat-content">
            <div>
              <p class="stat-label">Streak</p>
              <h3 class="stat-value">{{ studentStats.streak || 0 }} วัน</h3>
              <p class="stat-sub">ต่อเนื่อง</p>
            </div>
            <span class="material-icons stat-icon icon-purple">local_fire_department</span>
          </div>
        </div>

        <div class="stat-card border-amber">
          <div class="stat-content">
            <div>
              <p class="stat-label">Badges</p>
              <h3 class="stat-value">{{ studentStats.badges || 0 }}</h3>
              <p class="stat-sub">เหรียญรางวัล</p>
            </div>
            <span class="material-icons stat-icon icon-amber">emoji_events</span>
          </div>
        </div>
      </div>

      <div class="main-grid">
        <!-- HOTS Radar Chart -->
        <div class="card chart-section">
          <h3>📊 ทักษะการคิด 4 มิติ</h3>
          <div class="chart-container">
            <RadarChart :values="hotsValues" />
          </div>
          <div class="recommendation-box">
            <h4>💡 คำแนะนำสำหรับผู้ปกครอง</h4>
            <p>{{ aiRecommendation }}</p>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="card activity-section">
          <h3>🕒 กิจกรรมล่าสุด</h3>
          <div class="activity-list">
            <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
              <div class="activity-icon" :class="activity.type">
                <span class="material-icons">{{ getActivityIcon(activity.type) }}</span>
              </div>
              <div class="activity-details">
                <h4>{{ activity.title }}</h4>
                <p>{{ activity.description }}</p>
                <span class="activity-time">{{ formatDate(activity.timestamp) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import RadarChart from '@/components/RadarChart.vue'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const isDarkMode = computed(() => themeStore.isDarkMode)

const toggleDarkMode = () => {
  themeStore.toggleDarkMode()
}

const handleLogout = async () => {
  if (confirm('ต้องการออกจากระบบหรือไม่?')) {
    await authStore.signOut()
    router.push('/login')
  }
}

const loading = ref(false)
const linking = ref(false)
const linkedStudents = ref([])
const selectedStudentId = ref('')
const studentIdInput = ref('')
const parentCodeInput = ref('')
const linkError = ref('')
const linkSuccess = ref('')
const showAddStudent = ref(false)

// Computed: current selected student
const currentStudent = computed(() => {
  return linkedStudents.value.find(s => s.id === selectedStudentId.value) || null
})

// Get initials from name
const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return parts[0].charAt(0) + parts[1].charAt(0)
  }
  return name.substring(0, 2)
}

// Select student
const selectStudent = (studentId) => {
  selectedStudentId.value = studentId
  loadStudentData()
}

const studentStats = ref({})
const hotsValues = ref({
  analysis: 0,
  reasoning: 0,
  creativity: 0,
  evidence: 0
})
const recentActivities = ref([])
const aiRecommendation = ref('กำลังวิเคราะห์ข้อมูล...')

// Mock data for demo if no real data found
const mockData = {
  stats: { hotsLevel: 'Intermediate', passedLOs: 12, streak: 5, badges: 8 },
  hots: [3.5, 4.0, 2.5, 3.0],
  activities: [
    { id: 1, type: 'assessment', title: 'ทำแบบประเมินวิทย์', description: 'เรื่อง เซลล์พืช', timestamp: new Date() },
    { id: 2, type: 'badge', title: 'ได้รับเหรียญใหม่', description: 'Consistent Learner', timestamp: new Date(Date.now() - 86400000) }
  ]
}

const linkStudent = async () => {
  if (!studentIdInput.value || !parentCodeInput.value) return
  
  linking.value = true
  linkError.value = ''
  linkSuccess.value = ''
  
  try {
    // Check if already linked
    const alreadyLinked = linkedStudents.value.find(s => s.studentId === studentIdInput.value)
    if (alreadyLinked) {
      linkError.value = 'บุตรหลานคนนี้ถูกเชื่อมต่อแล้ว'
      linking.value = false
      return
    }

    const q = query(collection(db, 'users'), where('studentId', '==', studentIdInput.value))
    const snapshot = await getDocs(q)
    
    if (!snapshot.empty) {
      const studentDoc = snapshot.docs[0]
      const studentData = studentDoc.data()
      
      // Verify Parent Code
      if (studentData.parentCode === parentCodeInput.value) {
        const newStudent = {
          id: studentDoc.id,
          name: studentData.displayName || 'Student',
          studentId: studentData.studentId,
          grade: studentData.grade || ''
        }
        
        linkedStudents.value.push(newStudent)
        localStorage.setItem('linkedStudents', JSON.stringify(linkedStudents.value))
        selectedStudentId.value = newStudent.id
        
        // Clear inputs and show success
        studentIdInput.value = ''
        parentCodeInput.value = ''
        linkSuccess.value = `เชื่อมต่อกับ ${newStudent.name} สำเร็จแล้ว!`
        
        // Hide add form after 2 seconds
        setTimeout(() => {
          showAddStudent.value = false
          linkSuccess.value = ''
        }, 2000)
        
        await loadStudentData()
      } else {
        linkError.value = 'รหัสผู้ปกครองไม่ถูกต้อง'
      }
    } else {
      linkError.value = 'ไม่พบรหัสนักเรียนนี้ในระบบ'
    }
  } catch (error) {
    console.error('Error linking student:', error)
    linkError.value = 'เกิดข้อผิดพลาด โปรดลองใหม่'
  } finally {
    linking.value = false
  }
}

const loadStudentData = async () => {
  if (!selectedStudentId.value) return
  
  loading.value = true
  try {
    // Fetch student profile
    const studentRef = doc(db, 'users', selectedStudentId.value)
    const studentSnap = await getDoc(studentRef)
    
    if (studentSnap.exists()) {
      const data = studentSnap.data()
      
      // Calculate stats
      studentStats.value = {
        hotsLevel: calculateLevel(data.points || 0),
        passedLOs: data.passedLOCount || 0,
        streak: data.currentStreak || 0,
        badges: (data.badges || []).length
      }
      
      // HOTS Data
      if (data.hotsProfile) {
        hotsValues.value = {
          analysis: data.hotsProfile.analysis || 0,
          reasoning: data.hotsProfile.reasoning || 0,
          creativity: data.hotsProfile.creativity || 0,
          evidence: data.hotsProfile.evidence || 0
        }
        generateRecommendation(data.hotsProfile)
      } else {
        // Default values if no profile
        hotsValues.value = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
        aiRecommendation.value = 'ยังไม่มีข้อมูลการประเมิน กรุณารอให้บุตรหลานทำแบบประเมินก่อน'
      }
      
      // Recent Activities (Mock for now as we don't have a centralized activity feed collection yet)
      recentActivities.value = mockData.activities
    }
  } catch (error) {
    console.error('Error loading student data:', error)
  } finally {
    loading.value = false
  }
}

const calculateLevel = (points) => {
  if (points > 5000) return 'Master'
  if (points > 2000) return 'Expert'
  if (points > 1000) return 'Advanced'
  return 'Beginner'
}

const generateRecommendation = (profile) => {
  const scores = [
    { name: 'การวิเคราะห์', score: profile.analysis || 0 },
    { name: 'การให้เหตุผล', score: profile.reasoning || 0 },
    { name: 'ความคิดสร้างสรรค์', score: profile.creativity || 0 },
    { name: 'การใช้หลักฐาน', score: profile.evidence || 0 }
  ]
  
  scores.sort((a, b) => a.score - b.score)
  const weakness = scores[0]
  
  aiRecommendation.value = `น้องทำได้ดีในด้าน${scores[3].name} แต่ควรเสริมทักษะด้าน${weakness.name} ลองชวนคุยหรือตั้งคำถามปลายเปิดเกี่ยวกับเรื่องรอบตัวบ่อยๆ จะช่วยพัฒนาทักษะนี้ได้ครับ`
}

const getActivityIcon = (type) => {
  switch(type) {
    case 'assessment': return 'assignment'
    case 'badge': return 'emoji_events'
    case 'level_up': return 'trending_up'
    default: return 'notifications'
  }
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

onMounted(() => {
  // Check if parent has linked students in local storage
  const saved = localStorage.getItem('linkedStudents')
  if (saved) {
    linkedStudents.value = JSON.parse(saved)
    if (linkedStudents.value.length > 0) {
      selectedStudentId.value = linkedStudents.value[0].id
      loadStudentData()
    }
  }
})
</script>

<style scoped>
/* Top Navigation Bar */
.top-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  margin: -2rem -1rem 2rem -1rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand-icon {
  font-size: 1.5rem;
}

.brand-text {
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-btn:hover {
  background: var(--bg-primary);
  border-color: var(--primary);
}

.nav-btn .material-icons {
  font-size: 1.25rem;
}

.logout-btn {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}

.btn-label {
  font-weight: 500;
}

@media (max-width: 640px) {
  .btn-label {
    display: none;
  }
  
  .nav-btn {
    padding: 0.5rem;
  }
}

.parent-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  color: var(--text-primary);

  min-height: 100vh;
  background: var(--bg-primary);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-secondary);
}

.link-student-card {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem 2rem;
  text-align: center;
  background-color: var(--bg-primary);
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.link-content {
  max-width: 400px;
  width: 100%;
}

.icon-large {
  font-size: 4rem;
  color: var(--primary);
  margin-bottom: 1rem;
}

.input-group {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.input-group-vertical {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}

.input-group input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.form-input {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  width: 100%;
}

.full-width {
  width: 100%;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background-color: var(--bg-primary);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border-left: 4px solid transparent;
}

.stat-card.border-blue { border-left-color: #4299e1; }
.stat-card.border-green { border-left-color: #48bb78; }
.stat-card.border-purple { border-left-color: #9f7aea; }
.stat-card.border-amber { border-left-color: #ed8936; }

.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  margin: 0.5rem 0 0;
}

.stat-icon {
  font-size: 2.5rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
}

.icon-blue { color: #4299e1; background: rgba(66, 153, 225, 0.1); }
.icon-green { color: #48bb78; background: rgba(72, 187, 120, 0.1); }
.icon-purple { color: #9f7aea; background: rgba(159, 122, 234, 0.1); }
.icon-amber { color: #ed8936; background: rgba(237, 137, 54, 0.1); }

.main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

@media (max-width: 768px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}

.card {
  background-color: var(--bg-primary);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.recommendation-box {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: var(--bg-secondary);
  border-radius: 0.5rem;
  border-left: 4px solid var(--primary);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  display: flex;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-secondary);
}

.activity-details h4 {
  margin: 0;
  font-size: 1rem;
}

.activity-time {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.btn-primary {
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-text {
  color: var(--danger);
  margin-top: 0.5rem;
}

.success-text {
  color: #48bb78;
  margin-top: 0.5rem;
  font-weight: 600;
}

/* Student Tabs */
.student-tabs-container {
  margin-bottom: 1.5rem;
}

.student-tabs {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.student-tab {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.student-tab:hover {
  border-color: var(--primary);
  background: rgba(102, 126, 234, 0.1);
}

.student-tab.active {
  border-color: var(--primary);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.student-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  color: white;
}

.student-tab.active .student-avatar {
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.student-name {
  font-weight: 600;
  color: var(--text-primary);
}

.student-grade {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: rgba(102, 126, 234, 0.2);
  border-radius: 0.5rem;
  color: var(--primary);
}

.add-student-btn {
  border-style: dashed;
  opacity: 0.7;
}

.add-student-btn:hover {
  opacity: 1;
}

.add-student-btn .material-icons {
  font-size: 1.25rem;
  color: var(--primary);
}

/* Selected Student Card */
.selected-student-card {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.student-info-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.student-large-avatar {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.5rem;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.student-info-details {
  flex: 1;
}

.student-display-name {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
}

.student-meta {
  display: flex;
  gap: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.student-meta span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Link Student Card Adjustments */
.link-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  color: var(--text-secondary);
}

.close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .student-tabs {
    flex-wrap: nowrap;
  }
  
  .student-tab {
    padding: 0.5rem 1rem;
  }
  
  .student-name {
    display: none;
  }
  
  .student-tab.active .student-name {
    display: block;
  }
  
  .student-display-name {
    font-size: 1.25rem;
  }
  
  .student-large-avatar {
    width: 48px;
    height: 48px;
    font-size: 1.25rem;
  }
}
</style>