<template>
  <ErrorBoundary context="StudentDashboard">
  <div class="dashboard-container">
    <!-- Badge Notification -->
    <BadgeNotification
      :badge="gamificationStore.newBadge"
      :show="gamificationStore.showBadgeNotification"
      @close="gamificationStore.closeBadgeNotification"
    />
    
    <!-- Points Notification -->
    <PointsNotification
      :points="gamificationStore.pointsEarned"
      :show="gamificationStore.showPointsNotification"
      @close="gamificationStore.closePointsNotification"
    />
    
    <!-- Top Navigation -->
    <nav class="navbar card">
      <div class="nav-content">
        <h1 class="nav-title">📚 Student Dashboard</h1>
        <div class="nav-actions">
          <button @click="toggleTheme" class="icon-btn" :title="isDarkMode ? 'Light Mode' : 'Dark Mode'">
            {{ isDarkMode ? '☀️' : '🌙' }}
          </button>
          <div class="user-menu">
            <img v-if="user?.photoURL" :src="user.photoURL" class="user-avatar" alt="Avatar" />
            <span class="user-name">{{ user?.displayName }}</span>
          </div>
          <button @click="handleSignOut" class="btn btn-secondary btn-sm">
            ออกจากระบบ
          </button>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="dashboard-content">
      <!-- System Update Notice -->
      <div class="system-notice card">
        <div class="notice-icon">🔄</div>
        <div class="notice-content">
          <h4>📢 การปรับปรุงระบบประเมิน Learning Outcomes</h4>
          <p><strong>วันที่ 21 พ.ย. 2568:</strong> ระบบได้รับการอัพเกรดให้มีความแม่นยำสูงขึ้น ใช้เกณฑ์การประเมินที่เข้มงวดกว่าเดิม</p>
          <div class="notice-action">
            <button @click="$router.push('/my-progress')" class="notice-btn">
              📊 ดูความคืบหน้าของฉัน
            </button>
          </div>
        </div>
      </div>

      <!-- Welcome Section -->
      <div class="welcome-section card">
        <h2>สวัสดี, {{ userProfile?.displayName || user?.displayName }}! 👋</h2>
        <p>เลือกรายวิชาที่ต้องการฝึกทักษะการคิดขั้นสูง</p>
        
        <!-- Course Selection -->
        <div class="course-selection">
          <label for="course-select">📚 เลือกรายวิชา:</label>
          <select 
            id="course-select" 
            v-model="selectedCourseId" 
            class="course-select"
            @change="onCourseChange"
          >
            <option value="">-- เลือกรายวิชา --</option>
            <option v-for="course in availableCourses" :key="course.id" :value="course.id">
              {{ course.courseCode }} - {{ course.courseName }}
            </option>
          </select>
        </div>

        <!-- Course Info -->
        <div v-if="selectedCourse" class="course-info">
          <h4>{{ selectedCourse.courseName }}</h4>
          <p class="course-desc">{{ selectedCourse.courseDescription }}</p>
          <div class="lo-summary">
            <strong>Learning Outcomes ({{ selectedCourse.learningOutcomes?.length || 0 }} ข้อ):</strong>
            <ul class="lo-list">
              <li v-for="lo in selectedCourse.learningOutcomes" :key="lo.code">
                <strong>{{ lo.code }}:</strong> {{ lo.description }}
              </li>
            </ul>
          </div>
        </div>

        <button 
          @click="startNewChat" 
          :disabled="!selectedCourseId"
          class="btn btn-primary btn-large"
        >
          🚀 เริ่มต้น Assessment
        </button>
      </div>

      <!-- Personalized Recommendations (NEW) - แบบ LO Cards -->
      <div v-if="selectedCourseId && hasAssessmentHistory && recommendations.length > 0" class="recommendations-card card highlight-glow">
        <div class="recommendations-header">
          <h3>💡 แนะนำสำหรับคุณ</h3>
          <span class="recommendation-badge">ใหม่</span>
        </div>
        <p class="recommendations-subtitle">
          เลือก Learning Outcome ที่ต้องการพัฒนา - เรียนบทเรียนก่อนหรือไปทำข้อสอบเลยก็ได้! 📚
        </p>
        
        <!-- LO Cards Grid -->
        <div class="lo-cards-grid-dashboard">
          <div 
            v-for="rec in recommendations.slice(0, 6)" 
            :key="rec.id"
            class="lo-card-dashboard"
            :class="{ 
              'high-priority': rec.priority === 'high',
              'medium-priority': rec.priority === 'medium',
              'completed-lo': rec.isPassed
            }"
          >
            <div class="lo-card-header-dash">
              <span class="lo-code-badge-dash" :class="{ 'badge-completed': rec.isPassed }">{{ rec.loCode }}</span>
              <span class="priority-icon">{{ getPriorityIcon(rec.priority) }}</span>
            </div>
            
            <h4 class="lo-title-dash">{{ rec.loDescription }}</h4>
            
            <p class="lo-reason">{{ rec.reason }}</p>
            
            <div class="lo-stats-dash">
              <span v-if="rec.attempts > 0">
                📊 พยายามแล้ว {{ rec.attempts }} ครั้ง
              </span>
              <span v-if="rec.microLessons && rec.microLessons.length > 0" class="has-lessons">
                📚 มีบทเรียน {{ rec.microLessons.length }} บท
              </span>
            </div>
            
            <!-- ปุ่มเลือก: เรียนก่อน หรือ ทำข้อสอบเลย (ซ่อนถ้าผ่านแล้ว) -->
            <div v-if="!rec.isPassed" class="lo-card-actions">
              <button 
                v-if="rec.microLessons && rec.microLessons.length > 0"
                @click.stop="viewMicroLesson(rec.microLessons[0])"
                class="btn-action btn-lesson"
                title="เรียนบทเรียนก่อน"
              >
                📖 เรียน
              </button>
              <button 
                @click.stop="startLearningPath(rec.loCode)"
                class="btn-action btn-test"
                title="ทำข้อสอบเลย"
              >
                🎯 ทำข้อสอบ
              </button>
            </div>
            <div v-else class="lo-card-completed">
              <span class="completed-badge">✅ ผ่านแล้ว</span>
            </div>
          </div>
        </div>
        
        <!-- ดูทั้งหมดในหน้า Adaptive Learning -->
        <div class="view-all-section">
          <button @click="$router.push('/adaptive-learning')" class="btn-view-all">
            🎯 ดู Learning Outcomes ทั้งหมด
          </button>
        </div>
      </div>

      <!-- กรณียังไม่มี assessment history ในวิชานี้ - แสดงปุ่มเริ่มทำแบบทดสอบ -->
      <div v-else-if="selectedCourseId && !loadingRecommendations && !hasAssessmentHistory" class="start-assessment-card card">
        <div class="start-assessment-content">
          <div class="start-icon">🚀</div>
          <h3>พร้อมเริ่มต้นแล้วหรือยัง?</h3>
          <p>มาทำแบบทดสอบเพื่อประเมินความรู้ของคุณในวิชานี้กันเถอะ!</p>
          <button @click="startNewChat" class="btn-start-assessment">
            📝 เริ่มทำแบบทดสอบ
          </button>
        </div>
      </div>

      <!-- Quick Actions - จัดกลุ่มเป็นหมวดหมู่ -->
      <div class="quick-actions card">
        <h3>⚡ เมนูด่วน</h3>
        
        <!-- กลุ่มหลัก: การเรียนรู้ -->
        <div class="action-group">
          <span class="group-label">📚 การเรียนรู้</span>
          <div class="action-buttons">
            <button @click="$router.push('/chat')" class="action-btn highlight-primary">
              <span class="action-icon">🚀</span>
              <span class="action-label">ทำ Assessment</span>
            </button>
            <button @click="$router.push('/learning-rooms')" class="action-btn highlight-new">
              <span class="action-icon">🏫</span>
              <span class="action-label">ห้องกิจกรรม</span>
            </button>
            <button @click="$router.push('/assignments')" class="action-btn highlight-assignment">
              <span class="action-icon">📝</span>
              <span class="action-label">งานที่ได้รับ</span>
            </button>
            <button @click="$router.push('/adaptive-learning')" class="action-btn highlight-new">
              <span class="action-icon">🎯</span>
              <span class="action-label">Adaptive Learning</span>
            </button>
          </div>
        </div>

        <!-- กลุ่ม: ติดตามความก้าวหน้า -->
        <div class="action-group">
          <span class="group-label">📊 ความก้าวหน้า</span>
          <div class="action-buttons">
            <button @click="$router.push('/my-progress')" class="action-btn">
              <span class="action-icon">📈</span>
              <span class="action-label">ความคืบหน้า LO</span>
            </button>
            <button @click="$router.push('/learning-trajectory')" class="action-btn highlight-new">
              <span class="action-icon">📊</span>
              <span class="action-label">วิถีการเรียนรู้</span>
            </button>
            <button @click="$router.push('/leaderboard')" class="action-btn">
              <span class="action-icon">🏆</span>
              <span class="action-label">ลีดเดอร์บอร์ด</span>
            </button>
            <button @click="$router.push('/goal-setting')" class="action-btn">
              <span class="action-icon">🎯</span>
              <span class="action-label">ตั้งเป้าหมาย</span>
            </button>
          </div>
        </div>

        <!-- กลุ่ม: สังคม -->
        <div class="action-group">
          <span class="group-label">👥 ชุมชน & Social</span>
          <div class="action-buttons">
            <button @click="$router.push('/feed')" class="action-btn highlight-social">
              <span class="action-icon">📰</span>
              <span class="action-label">Social Feed</span>
            </button>
            <button @click="$router.push('/community')" class="action-btn highlight-social">
              <span class="action-icon">💬</span>
              <span class="action-label">ชุมชนการเรียนรู้</span>
            </button>
            <button @click="$router.push('/community/study-groups')" class="action-btn highlight-social">
              <span class="action-icon">👨‍👩‍👧‍👦</span>
              <span class="action-label">กลุ่มเรียน</span>
            </button>
            <button @click="$router.push('/community/help')" class="action-btn highlight-social">
              <span class="action-icon">🆘</span>
              <span class="action-label">ขอความช่วยเหลือ</span>
            </button>
            <button @click="$router.push('/community/mentors')" class="action-btn highlight-social">
              <span class="action-icon">🤝</span>
              <span class="action-label">หา Mentor</span>
            </button>
            <button @click="$router.push('/community/gallery')" class="action-btn highlight-social">
              <span class="action-icon">🖼️</span>
              <span class="action-label">แกลเลอรี่คำตอบ</span>
            </button>
            <button @click="$router.push('/portfolio')" class="action-btn highlight-portfolio">
              <span class="action-icon">💼</span>
              <span class="action-label">Portfolio</span>
            </button>
            <button @click="$router.push('/appeals/my')" class="action-btn highlight-appeal">
              <span class="action-icon">⚖️</span>
              <span class="action-label">อุทธรณ์ของฉัน</span>
            </button>
          </div>
        </div>

        <!-- โปรไฟล์ -->
        <div class="action-group profile-group">
          <div class="action-buttons">
            <button @click="$router.push('/profile')" class="action-btn">
              <span class="action-icon">👤</span>
              <span class="action-label">โปรไฟล์</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Gamification Stats (NEW) -->
      <div v-if="selectedCourseId && gamificationStore.studentProgress" class="gamification-section">
        <!-- Level Progress -->
        <div class="level-card card">
          <div class="level-header">
            <h3>🎮 Level {{ gamificationStore.level }}</h3>
            <span class="points-badge">⭐ {{ gamificationStore.totalPoints }} แต้ม</span>
          </div>
          <div class="level-progress-container">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${gamificationStore.levelProgress}%` }"></div>
            </div>
            <p class="progress-text">
              อีก {{ gamificationStore.pointsToNextLevel }} แต้มถึง Level {{ gamificationStore.level + 1 }}
            </p>
          </div>
        </div>

        <!-- Streak and Badges -->
        <div class="achievements-grid">
          <div class="achievement-card card">
            <div class="achievement-icon">🔥</div>
            <div class="achievement-info">
              <h4>{{ gamificationStore.currentStreak }} วัน</h4>
              <p>สตรีคปัจจุบัน</p>
              <small>สูงสุด: {{ gamificationStore.maxStreak }} วัน</small>
            </div>
          </div>

          <div class="achievement-card card">
            <div class="achievement-icon">🏅</div>
            <div class="achievement-info">
              <h4>{{ gamificationStore.badgeCount }} เหรียญ</h4>
              <p>รวบรวมแล้ว</p>
              <button @click="showBadgesModal = true" class="btn-view-badges">
                ดูเหรียญทั้งหมด
              </button>
            </div>
          </div>
        </div>

        <!-- Latest Badges -->
        <div v-if="gamificationStore.earnedBadgeDetails.length > 0" class="latest-badges card">
          <h3>🎖️ เหรียญล่าสุด</h3>
          <div class="badge-showcase">
            <div 
              v-for="badge in gamificationStore.earnedBadgeDetails.slice(-3).reverse()" 
              :key="badge.id"
              class="badge-item"
              :title="badge.description"
            >
              <span class="badge-icon">{{ badge.icon }}</span>
              <span class="badge-name">{{ badge.name }}</span>
              <span class="badge-points">+{{ badge.points }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-icon">📝</div>
          <div class="stat-info">
            <h3>{{ totalSessions }}</h3>
            <p>จำนวนครั้งที่ทำ</p>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">⭐</div>
          <div class="stat-info">
            <h3>{{ averageScore.toFixed(1) }}</h3>
            <p>คะแนนเฉลี่ย</p>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">📈</div>
          <div class="stat-info">
            <h3>{{ improvementRate }}%</h3>
            <p>อัตราการพัฒนา</p>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon">🎯</div>
          <div class="stat-info">
            <h3>{{ strongestSkill }}</h3>
            <p>ทักษะที่โดดเด่น</p>
          </div>
        </div>
      </div>

      <!-- Recent Sessions -->
      <div class="recent-sessions card">
        <h2>ประวัติการทำ Assessment</h2>
        <div v-if="loading" class="loading-state">กำลังโหลด...</div>
        <div v-else-if="recentSessions.length === 0" class="empty-state">
          <p>ยังไม่มีประวัติการทำ Assessment</p>
          <p>เริ่มต้นการประเมินเพื่อดูผลการเรียนรู้ของคุณ</p>
        </div>
        <div v-else class="sessions-list">
          <div 
            v-for="session in recentSessions" 
            :key="session.id"
            class="session-item"
          >
            <div class="session-header">
              <span class="session-date">{{ formatDate(session.startedAt) }}</span>
              <span class="session-status" :class="session.status">
                {{ session.status === 'active' ? '🟢 Active' : '✅ Completed' }}
              </span>
            </div>
            <div class="session-stats">
              <span>💬 {{ session.messageCount || 0 }} ข้อความ</span>
              <span v-if="session.averageScore">
                ⭐ คะแนน: {{ session.averageScore.toFixed(1) }}/20
              </span>
            </div>
            <button 
              v-if="session.status === 'active'"
              @click="continueSession(session.id)"
              class="btn btn-primary btn-sm"
            >
              ดำเนินการต่อ
            </button>
          </div>
        </div>
      </div>

      <!-- Skills Analysis -->
      <div class="skills-analysis card">
        <h2>การวิเคราะห์ทักษะ HOTS</h2>
        <div v-if="skillsData" class="skills-grid">
          <div class="skill-item">
            <div class="skill-header">
              <span class="skill-name">🔍 การวิเคราะห์</span>
              <span class="skill-score">{{ skillsData.analysis.toFixed(1) }}/5</span>
            </div>
            <div class="skill-bar">
              <div class="skill-progress" :style="{ width: `${(skillsData.analysis / 5) * 100}%` }"></div>
            </div>
          </div>
          <div class="skill-item">
            <div class="skill-header">
              <span class="skill-name">💡 การให้เหตุผล</span>
              <span class="skill-score">{{ skillsData.reasoning.toFixed(1) }}/5</span>
            </div>
            <div class="skill-bar">
              <div class="skill-progress" :style="{ width: `${(skillsData.reasoning / 5) * 100}%` }"></div>
            </div>
          </div>
          <div class="skill-item">
            <div class="skill-header">
              <span class="skill-name">🎨 ความคิดสร้างสรรค์</span>
              <span class="skill-score">{{ skillsData.creativity.toFixed(1) }}/5</span>
            </div>
            <div class="skill-bar">
              <div class="skill-progress" :style="{ width: `${(skillsData.creativity / 5) * 100}%` }"></div>
            </div>
          </div>
          <div class="skill-item">
            <div class="skill-header">
              <span class="skill-name">📚 การใช้หลักฐาน</span>
              <span class="skill-score">{{ skillsData.evidence.toFixed(1) }}/5</span>
            </div>
            <div class="skill-bar">
              <div class="skill-progress" :style="{ width: `${(skillsData.evidence / 5) * 100}%` }"></div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          ยังไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์
        </div>
      </div>
    </div>

    <!-- Badges Modal -->
    <div v-if="showBadgesModal" class="modal-overlay" @click.self="showBadgesModal = false">
      <div class="modal-content badges-modal">
        <div class="modal-header">
          <h2>🏅 คอลเลกชันเหรียญตรา</h2>
          <button @click="showBadgesModal = false" class="close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="badges-tabs">
            <button 
              :class="{ active: badgesTab === 'earned' }" 
              @click="badgesTab = 'earned'"
              class="tab-btn"
            >
              ได้รับแล้ว ({{ gamificationStore.earnedBadges.length }})
            </button>
            <button 
              :class="{ active: badgesTab === 'available' }" 
              @click="badgesTab = 'available'"
              class="tab-btn"
            >
              ยังไม่ได้รับ ({{ gamificationStore.unearnedBadges.length }})
            </button>
          </div>

          <!-- Earned Badges -->
          <div v-if="badgesTab === 'earned'" class="badges-collection">
            <div v-if="gamificationStore.earnedBadgeDetails.length === 0" class="empty-badges">
              <p>🎯 ยังไม่มีเหรียญ เริ่มทำ Assessment เพื่อปลดล็อกเหรียญแรก!</p>
            </div>
            <div v-else class="badge-cards">
              <div 
                v-for="badge in gamificationStore.earnedBadgeDetails" 
                :key="badge.id"
                class="badge-card earned"
              >
                <div class="badge-icon-large">{{ badge.icon }}</div>
                <div class="badge-info">
                  <h4>{{ badge.name }}</h4>
                  <p>{{ badge.description }}</p>
                  <div class="badge-points">+{{ badge.points }} แต้ม</div>
                </div>
                <div class="badge-earned-mark">✅</div>
              </div>
            </div>
          </div>

          <!-- Available Badges -->
          <div v-if="badgesTab === 'available'" class="badges-collection">
            <div v-if="gamificationStore.unearnedBadges.length === 0" class="empty-badges">
              <p>🎉 คุณได้เหรียญครบทุกอันแล้ว!</p>
            </div>
            <div v-else class="badge-cards">
              <div 
                v-for="badge in gamificationStore.unearnedBadges" 
                :key="badge.id"
                class="badge-card locked"
              >
                <div class="badge-icon-large locked-icon">🔒</div>
                <div class="badge-info">
                  <h4>{{ badge.name }}</h4>
                  <p>{{ badge.description }}</p>
                  <div class="badge-points">+{{ badge.points }} แต้ม</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </ErrorBoundary>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useChatStore } from '@/stores/chat'
import { useGamificationStore } from '@/stores/gamification'
import BadgeNotification from '@/components/BadgeNotification.vue'
import PointsNotification from '@/components/PointsNotification.vue'
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const chatStore = useChatStore()
const gamificationStore = useGamificationStore()

const user = computed(() => authStore.user)
const userProfile = computed(() => authStore.userProfile)
const isDarkMode = computed(() => themeStore.isDarkMode)

const loading = ref(false)
const recentSessions = ref([])
const assessmentsData = ref([])
const availableCourses = ref([])
const selectedCourseId = ref('')
const showBadgesModal = ref(false)
const badgesTab = ref('earned')
const recommendations = ref([])
const loadingRecommendations = ref(false)
const hasAssessmentHistory = ref(false) // เพิ่ม flag เช็คว่ามี assessment ในวิชานี้หรือไม่

const selectedCourse = computed(() => 
  availableCourses.value.find(c => c.id === selectedCourseId.value)
)

const totalSessions = computed(() => recentSessions.value.length)

const averageScore = computed(() => {
  if (assessmentsData.value.length === 0) return 0
  const sum = assessmentsData.value.reduce((acc, a) => acc + (a.overallScore || 0), 0)
  return sum / assessmentsData.value.length
})

const improvementRate = computed(() => {
  if (assessmentsData.value.length < 2) return 0
  const sorted = [...assessmentsData.value].sort((a, b) => 
    new Date(a.createdAt) - new Date(b.createdAt)
  )
  const first = sorted[0]?.overallScore || 0
  const last = sorted[sorted.length - 1]?.overallScore || 0
  if (first === 0) return 0
  return Math.round(((last - first) / first) * 100)
})

const skillsData = computed(() => {
  if (assessmentsData.value.length === 0) return null
  
  const totals = assessmentsData.value.reduce((acc, assessment) => {
    if (assessment.rubricScores) {
      acc.analysis += assessment.rubricScores.analysis || 0
      acc.reasoning += assessment.rubricScores.reasoning || 0
      acc.creativity += assessment.rubricScores.creativity || 0
      acc.evidence += assessment.rubricScores.evidence || 0
    }
    return acc
  }, { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 })
  
  const count = assessmentsData.value.length
  return {
    analysis: totals.analysis / count,
    reasoning: totals.reasoning / count,
    creativity: totals.creativity / count,
    evidence: totals.evidence / count
  }
})

const strongestSkill = computed(() => {
  if (!skillsData.value) return '-'
  const skills = skillsData.value
  const max = Math.max(skills.analysis, skills.reasoning, skills.creativity, skills.evidence)
  
  if (max === skills.analysis) return 'วิเคราะห์'
  if (max === skills.reasoning) return 'เหตุผล'
  if (max === skills.creativity) return 'สร้างสรรค์'
  return 'หลักฐาน'
})

onMounted(async () => {
  await loadDashboardData()
  // Load badge definitions so UI can show possible badges
  await gamificationStore.loadBadgeDefinitions()
  
  // Check and claim daily reward
  checkDailyReward()
})

// When student selects a course, subscribe to their progress for that course
watch(selectedCourseId, async (newCourseId) => {
  if (newCourseId && authStore.user?.uid) {
    try {
      await gamificationStore.loadStudentProgress(authStore.user.uid, newCourseId)
      // Ensure badges are loaded (in case not loaded yet)
      if (!gamificationStore.badgeDefinitions.length) {
        await gamificationStore.loadBadgeDefinitions()
      }
    } catch (error) {
      // Ignore errors from gamification - it's not critical
      console.log('Could not load gamification data:', error.message)
    }
    
    // Load personalized recommendations
    await loadRecommendations()
  }
})

onUnmounted(() => {
  // Clean up realtime listeners
  gamificationStore.cleanup()
})

async function loadDashboardData() {
  try {
    loading.value = true
    
    // Load available courses
    const coursesSnapshot = await getDocs(collection(db, 'courses'))
    availableCourses.value = coursesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Load recent sessions
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('studentId', '==', authStore.user.uid),
      orderBy('startedAt', 'desc'),
      limit(10)
    )
    
    const sessionsSnapshot = await getDocs(sessionsQuery)
    recentSessions.value = sessionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startedAt: doc.data().startedAt?.toDate()
    }))
    
    // Load assessments
    const assessmentsQuery = query(
      collection(db, 'assessments'),
      where('studentId', '==', authStore.user.uid),
      orderBy('createdAt', 'desc')
    )
    
    const assessmentsSnapshot = await getDocs(assessmentsQuery)
    assessmentsData.value = assessmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }))
    
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  } finally {
    loading.value = false
  }
}

function onCourseChange() {
  // Store selected course for chat session
  if (selectedCourseId.value) {
    localStorage.setItem('selectedCourseId', selectedCourseId.value)
  }
}

async function startNewChat() {
  if (!selectedCourseId.value) {
    alert('กรุณาเลือกรายวิชาก่อนเริ่มแชท')
    return
  }
  router.push('/chat')
}

async function continueSession(sessionId) {
  await chatStore.loadSession(sessionId)
  router.push('/chat')
}

function formatDate(date) {
  if (!date) return '-'
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('th-TH', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function toggleTheme() {
  themeStore.toggleTheme()
}

async function handleSignOut() {
  if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
    await authStore.signOut()
    router.push('/')
  }
}

async function checkDailyReward() {
  // Only claim if a course is selected
  if (!selectedCourseId.value || !authStore.user?.uid) return
  
  const reward = await gamificationStore.claimDailyReward(
    authStore.user.uid,
    selectedCourseId.value
  )
  
  if (reward && !reward.alreadyClaimed) {
    // Reward claimed successfully, notification shown by store
    console.log('Daily reward claimed:', reward)
  }
}

async function loadRecommendations() {
  if (!selectedCourseId.value || !authStore.user?.uid) return
  
  try {
    loadingRecommendations.value = true
    recommendations.value = [] // Clear first
    hasAssessmentHistory.value = false // Reset
    
    // Get course data first
    const courseDoc = await getDoc(doc(db, 'courses', selectedCourseId.value))
    if (!courseDoc.exists()) {
      console.log('Course not found')
      return
    }
    
    const courseData = courseDoc.data()
    const allLOs = courseData.learningOutcomes || []
    
    if (allLOs.length === 0) {
      console.log('No learning outcomes in course')
      return
    }
    
    // 🔧 GET REAL PASSED LOs FROM ASSESSMENTS (not cached data)
    const assessmentsQuery = query(
      collection(db, 'assessments'),
      where('studentId', '==', authStore.user.uid),
      where('courseId', '==', selectedCourseId.value)
    )
    const assessmentsSnapshot = await getDocs(assessmentsQuery)
    
    // เช็คว่ามี assessment ในวิชานี้หรือไม่
    hasAssessmentHistory.value = !assessmentsSnapshot.empty
    
    // Count real passed LOs
    const realPassedLOsSet = new Set()
    assessmentsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      if (data.loAssessment?.passedLOs) {
        data.loAssessment.passedLOs.forEach(lo => realPassedLOsSet.add(lo))
      }
    })
    
    const realPassedLOs = Array.from(realPassedLOsSet)
    
    // ถ้ามี assessment แล้ว แสดงทั้ง LOs ที่ผ่านและยังไม่ผ่าน
    const targetLOs = assessmentsSnapshot.empty 
      ? allLOs // ถ้ายังไม่มี assessment เลย แสดงทุก LO
      : allLOs // แสดงทุก LO ไม่ว่าจะผ่านหรือไม่
    
    // ไม่ต้องเช็คว่า weakLOs.length === 0 แล้ว เพราะจะแสดงทุก LO
    
    // Calculate average scores per LO from recent assessments
    const loScores = {}
    const recentAssessments = assessmentsSnapshot.docs
      .map(doc => doc.data())
      .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
      .slice(0, 20)
    
    recentAssessments.forEach(data => {
      if (data.loAssessment && data.loAssessment.analysis) {
        // Parse LO mentions from analysis
        const analysis = data.loAssessment.analysis
        targetLOs.forEach(lo => {
          const loCode = lo.code || lo.loCode
          if (analysis.includes(loCode)) {
            if (!loScores[loCode]) {
              loScores[loCode] = { total: 0, count: 0, attempts: 0 }
            }
            loScores[loCode].attempts++
            
            // Count as failed if not in passedLOs
            if (!data.loAssessment.passedLOs?.includes(loCode)) {
              loScores[loCode].total += (data.totalScore || 0)
              loScores[loCode].count++
            }
          }
        })
      }
    })
    
    // Get micro-lessons for each weak LO
    const microLessonsQuery = query(
      collection(db, 'microLessons'),
      where('courseId', '==', selectedCourseId.value)
    )
    const microLessonsSnapshot = await getDocs(microLessonsQuery)
    const allMicroLessons = microLessonsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Build recommendations
    const recs = targetLOs.map(lo => {
      const loCode = lo.code || lo.loCode
      const loDescription = lo.description || lo.loDescription || ''
      const scoreData = loScores[loCode] || { total: 0, count: 0, attempts: 0 }
      const avgScore = scoreData.count > 0 ? scoreData.total / scoreData.count : 0
      const isPassed = realPassedLOs.includes(loCode)
      
      // Find related micro-lessons
      const relatedLessons = allMicroLessons.filter(lesson => 
        lesson.relatedLOs && lesson.relatedLOs.includes(loCode)
      )
      
      // Determine priority
      let priority = 'low'
      let reason = 'คุณยังไม่ได้เรียนรู้ Learning Outcome นี้'
      
      if (isPassed) {
        priority = 'completed'
        reason = '🎉 ยินดีด้วย! คุณผ่าน LO นี้แล้ว'
      } else if (scoreData.attempts >= 3 && avgScore < 12) {
        priority = 'high'
        reason = `คุณพยายามแล้ว ${scoreData.attempts} ครั้ง แต่ยังไม่ผ่าน มาเรียนรู้เพิ่มเติมกันเถอะ!`
      } else if (scoreData.attempts >= 1) {
        priority = 'medium'
        reason = `คุณเคยลองแล้ว ${scoreData.attempts} ครั้ง มาพัฒนาต่อกันเถอะ!`
      }
      
      return {
        id: `rec_${loCode}_${Date.now()}`,
        loCode,
        loDescription,
        priority,
        reason,
        attempts: scoreData.attempts,
        avgScore,
        isPassed,
        microLessons: relatedLessons,
        dismissed: false
      }
    })
    
    // Sort by priority (high > medium > low) and attempts (more attempts = higher priority)
    recs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      return b.attempts - a.attempts
    })
    
    recommendations.value = recs
    
  } catch (error) {
    console.error('Error loading recommendations:', error)
  } finally {
    loadingRecommendations.value = false
  }
}

function getPriorityIcon(priority) {
  switch (priority) {
    case 'completed': return '✅'
    case 'high': return '🔥'
    case 'medium': return '⚡'
    case 'low': return '💡'
    default: return '📝'
  }
}

async function startLearningPath(loCode) {
  // เก็บข้อมูลใน localStorage เพื่อส่งไปหน้า Adaptive Learning
  localStorage.setItem('adaptive_courseId', selectedCourseId.value)
  localStorage.setItem('adaptive_targetLO', loCode)
  
  // ไปหน้า Adaptive Learning โดยไม่ต้องส่ง query parameters
  router.push('/adaptive-learning')
}

function viewMicroLesson(lesson) {
  // แสดง modal บทเรียน
  alert(`📚 ${lesson.title}\n\n${lesson.content || 'กำลังพัฒนา...'}\n\n⏱️ ใช้เวลาประมาณ ${lesson.estimatedMinutes || 5} นาที`)
}

function goToMicroLesson(lessonId) {
  // Navigate to micro lessons view with the lesson highlighted
  router.push(`/micro-lessons?lesson=${lessonId}`)
}

function dismissRecommendation(recId) {
  recommendations.value = recommendations.value.filter(r => r.id !== recId)
}
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

.navbar {
  margin-bottom: 1.5rem;
  padding: 1rem 1.5rem;
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.nav-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--primary);
}

.user-name {
  font-weight: 600;
  color: var(--text-primary);
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.welcome-section {
  text-align: center;
  padding: 2rem;
}

.welcome-section h2 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.welcome-section p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  font-size: 1.125rem;
}

.btn-large {
  padding: 1rem 2rem;
  font-size: 1.125rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  transition: transform 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-info h3 {
  font-size: 2rem;
  margin: 0;
  color: var(--primary);
}

.stat-info p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.recent-sessions,
.skills-analysis {
  padding: 1.5rem;
}

.recent-sessions h2,
.skills-analysis h2 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.empty-state p {
  margin: 0.5rem 0;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.session-item {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  transition: transform 0.2s ease;
}

.session-item:hover {
  transform: translateX(5px);
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.session-date {
  font-weight: 600;
  color: var(--text-primary);
}

.session-status {
  font-size: 0.875rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  background: var(--bg-primary);
}

.session-status.active {
  color: var(--success);
}

.session-status.completed {
  color: var(--info);
}

.session-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.skills-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.skill-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skill-name {
  font-weight: 600;
  color: var(--text-primary);
}

.skill-score {
  font-weight: 700;
  color: var(--primary);
}

.skill-bar {
  height: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
  overflow: hidden;
}

.skill-progress {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  transition: width 0.3s ease;
  border-radius: 6px;
}

/* Course Selection */
.course-selection {
  margin: 1.5rem 0;
}

.course-selection label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.course-select {
  width: 100%;
  padding: 0.875rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--bg-secondary);
  color: var(--text-color);
  cursor: pointer;
}

.course-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.course-info {
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  margin: 1rem 0;
}

.course-info h4 {
  margin: 0 0 0.5rem 0;
  color: var(--primary-color);
}

.course-desc {
  color: var(--text-secondary);
  margin: 0.5rem 0 1rem 0;
  font-size: 0.95rem;
}

.lo-summary {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.lo-summary strong {
  display: block;
  margin-bottom: 0.75rem;
  color: var(--text-color);
}

.lo-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.lo-list li {
  padding: 0.5rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  border-bottom: 1px solid var(--border-color);
}

.lo-list li:last-child {
  border-bottom: none;
}

.lo-list strong {
  color: var(--primary-color);
  display: inline;
}

/* Quick Actions */
.quick-actions {
  margin-bottom: 1.5rem;
}

.quick-actions h3 {
  margin-bottom: 1rem;
  color: var(--text-color);
}

/* Action Groups */
.action-group {
  margin-bottom: 1.5rem;
}

.action-group:last-child {
  margin-bottom: 0;
}

.group-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  padding-left: 0.25rem;
}

.profile-group {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.profile-group .action-buttons {
  justify-content: center;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.action-btn:hover {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.action-btn.highlight-new {
  position: relative;
  border: 2px solid var(--primary);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15));
}

.action-btn.highlight-new::after {
  content: "✨";
  position: absolute;
  top: -8px;
  right: -8px;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5);
  animation: pulse-sparkle 2s ease-in-out infinite;
}

@keyframes pulse-sparkle {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.1) rotate(180deg); }
}

.action-btn.highlight-new:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
}

.action-btn.highlight-primary {
  position: relative;
  border: 2px solid #10b981;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2));
}

.action-btn.highlight-primary::after {
  content: "🚀";
  position: absolute;
  top: -8px;
  right: -8px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
  animation: pulse-primary 2s ease-in-out infinite;
}

@keyframes pulse-primary {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.1) rotate(15deg); }
}

.action-btn.highlight-primary:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
  border-color: #059669;
}

/* Community Button - SLC */
.action-btn.community-btn {
  position: relative;
  border: 2px solid #8b5cf6;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(192, 132, 252, 0.2));
}

.action-btn.community-btn::after {
  content: "👥";
  position: absolute;
  top: -8px;
  right: -8px;
  background: linear-gradient(135deg, #8b5cf6, #c084fc);
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
  animation: pulse-community 2s ease-in-out infinite;
}

@keyframes pulse-community {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.action-btn.community-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
  border-color: #a78bfa;
}

/* Social Network Button */
.action-btn.highlight-social {
  position: relative;
  border: 2px solid #3b82f6;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(96, 165, 250, 0.2));
}

.action-btn.highlight-social:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
  border-color: #60a5fa;
}

/* Assignment Button */
.action-btn.highlight-assignment {
  position: relative;
  border: 2px solid #f59e0b;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(251, 191, 36, 0.2));
}

.action-btn.highlight-assignment:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.4);
  border-color: #fbbf24;
}

/* Portfolio Button */
.action-btn.highlight-portfolio {
  position: relative;
  border: 2px solid #ec4899;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(244, 114, 182, 0.2));
}

.action-btn.highlight-portfolio:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.4);
  border-color: #f472b6;
}

/* Appeal Button */
.action-btn.highlight-appeal {
  position: relative;
  border: 2px solid #f59e0b;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(251, 191, 36, 0.2));
}

.action-btn.highlight-appeal:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.4);
  border-color: #fbbf24;
}

.action-icon {
  font-size: 1.5rem;
}

.action-label {
  font-weight: 600;
  color: #60a5fa;
  font-size: 1.05rem;
}

/* Gamification Section */
.gamification-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.level-card {
  padding: 1.5rem;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
}

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.level-header h3 {
  margin: 0;
  font-size: 1.5rem;
}

.points-badge {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-weight: 600;
}

.level-progress-container {
  margin-top: 1rem;
}

.progress-bar {
  height: 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
  border-radius: 6px;
  transition: width 0.6s ease;
}

.progress-text {
  font-size: 0.875rem;
  opacity: 0.9;
  margin: 0;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.achievement-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
}

.achievement-icon {
  font-size: 3rem;
}

.achievement-info h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.achievement-info p {
  margin: 0 0 0.5rem 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.achievement-info small {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.btn-view-badges {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.3s;
}

.btn-view-badges:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}

.latest-badges {
  padding: 1.5rem;
}

.latest-badges h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.badge-showcase {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1));
  border: 2px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 120px;
}

.badge-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(245, 158, 11, 0.2);
  border-color: rgba(245, 158, 11, 0.6);
}

.badge-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.badge-name {
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.badge-points {
  font-size: 0.75rem;
  color: var(--primary-color);
  font-weight: 600;
}

/* Recommendations Card */
.recommendations-card {
  margin-bottom: 1.5rem;
  border: 2px solid var(--primary-color);
  position: relative;
  overflow: hidden;
}

.highlight-glow {
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.5);
  }
}

.recommendations-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.recommendations-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.5rem;
}

.recommendation-badge {
  padding: 0.25rem 0.75rem;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.recommendations-subtitle {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  font-size: 1rem;
}

/* LO Cards Grid - Dashboard Style */
.lo-cards-grid-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.lo-card-dashboard {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.lo-card-dashboard:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2);
  border-color: var(--primary-color);
}

.lo-card-dashboard.high-priority {
  border-color: #ef4444;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.02));
}

.lo-card-dashboard.high-priority:hover {
  border-color: #dc2626;
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.25);
}

.lo-card-dashboard.medium-priority {
  border-color: #f59e0b;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(245, 158, 11, 0.02));
}

.lo-card-dashboard.medium-priority:hover {
  border-color: #d97706;
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.25);
}

.lo-card-dashboard.completed-lo {
  border-color: #10b981;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.03));
  opacity: 0.85;
}

.lo-card-dashboard.completed-lo:hover {
  border-color: #059669;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.2);
  opacity: 1;
}

.lo-card-header-dash {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.lo-code-badge-dash {
  background: linear-gradient(135deg, var(--primary-color), #8b5cf6);
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
}

.lo-code-badge-dash.badge-completed {
  background: linear-gradient(135deg, #10b981, #059669);
}

.priority-icon {
  font-size: 1.5rem;
}

.lo-title-dash {
  color: var(--text-primary);
  font-size: 1rem;
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
  min-height: 2.8em;
  font-weight: 600;
}

.lo-reason {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
  font-style: italic;
  line-height: 1.4;
}

.lo-stats-dash {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.lo-stats-dash .has-lessons {
  color: var(--primary-color);
}

.lo-card-actions {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.btn-action {
  flex: 1;
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-lesson {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.btn-lesson:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-test {
  background: linear-gradient(135deg, var(--primary-color), #8b5cf6);
  color: white;
}

.btn-test:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.lo-card-completed {
  display: flex;
  justify-content: center;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.completed-badge {
  padding: 0.6rem 1.5rem;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
}

.lo-card-footer-dash {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.click-hint-dash {
  color: var(--primary-color);
  font-size: 0.85rem;
  font-weight: 600;
}

.view-all-section {
  text-align: center;
  padding-top: 1rem;
  border-top: 2px solid var(--border-color);
}

.btn-view-all {
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, var(--primary-color), #8b5cf6);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-view-all:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
}

/* Start Assessment Card - สำหรับคนใหม่ที่ยังไม่มี progress */
.start-assessment-card {
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border: 2px solid var(--primary-color);
}

.start-assessment-content {
  text-align: center;
  padding: 3rem 2rem;
}

.start-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.start-assessment-content h3 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.start-assessment-content p {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.btn-start-assessment {
  padding: 1rem 2.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-start-assessment:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recommendation-item {
  padding: 1.25rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 2px solid var(--border-color);
  transition: all 0.3s;
}

.recommendation-item.high-priority {
  border-color: #ef4444;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.02));
}

.recommendation-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.rec-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.rec-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.rec-info h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.rec-reason {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-style: italic;
}

.rec-content {
  margin-top: 1rem;
}

.rec-lessons {
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.rec-lessons strong {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.rec-lessons ul {
  margin: 0;
  padding-left: 1.5rem;
}

.rec-lessons li {
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.lesson-duration {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.rec-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.btn-dismiss {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.3s;
}

.btn-dismiss:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Badges Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 16px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: var(--text-secondary);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.badges-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--border-color);
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-secondary);
  transition: all 0.3s;
  margin-bottom: -2px;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.badges-collection {
  min-height: 300px;
}

.empty-badges {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.badge-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.badge-card {
  position: relative;
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 12px;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  transition: all 0.3s;
}

.badge-card.earned {
  border-color: rgba(34, 197, 94, 0.3);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(16, 185, 129, 0.05));
}

.badge-card.earned:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.5);
}

.badge-card.locked {
  opacity: 0.6;
  filter: grayscale(0.5);
}

.badge-icon-large {
  font-size: 3.5rem;
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.locked-icon {
  opacity: 0.5;
}

.badge-info {
  flex: 1;
}

.badge-info h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  font-size: 1.125rem;
}

.badge-info p {
  margin: 0 0 0.75rem 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
}

.badge-info .badge-points {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: var(--primary-color);
  color: white;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.badge-earned-mark {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 1.5rem;
}

/* System Notice */
.system-notice {
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #dbeafe, #eff6ff);
  border-left: 4px solid #3b82f6;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  padding: 1.25rem;
}

.dark-mode .system-notice {
  background: linear-gradient(135deg, #1e3a8a, #1e40af);
  border-left-color: #60a5fa;
}

.system-notice .notice-icon {
  font-size: 2rem;
  margin-right: 1rem;
  align-self: flex-start;
}

.notice-content {
  flex: 1;
}

.notice-content h4 {
  color: #1e40af;
  font-size: 1.05rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.dark-mode .notice-content h4 {
  color: #93c5fd;
}

.notice-content p {
  color: #1e40af;
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.dark-mode .notice-content p {
  color: #dbeafe;
}

.notice-action {
  margin-top: 0.5rem;
}

.notice-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.notice-btn:hover {
  background: #2563eb;
}

@media (max-width: 768px) {
  .nav-content {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .nav-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .welcome-section h2 {
    font-size: 1.5rem;
  }

  .achievements-grid {
    grid-template-columns: 1fr;
  }

  .badge-cards {
    grid-template-columns: 1fr;
  }

  .modal-content {
    max-height: 95vh;
  }

  .badge-showcase {
    justify-content: center;
  }
}
</style>

