<template>
  <div class="portfolio-view">
    <!-- Loading -->
    <LoadingSpinner v-if="loading" />

    <template v-else>
      <!-- Header -->
      <div class="portfolio-header">
        <div class="header-top">
          <router-link v-if="!isOwner" to="/portfolio" class="back-link">← กลับ</router-link>
        </div>
        <div class="profile-section">
          <img :src="portfolio.photoURL || '/default-avatar.png'" class="profile-avatar">
          <div class="profile-info">
            <h1>{{ portfolio.displayName }}</h1>
            <p class="profile-subtitle">{{ portfolio.school || 'โรงเรียน' }} | {{ portfolio.grade || 'ระดับชั้น' }}</p>
          </div>
          <button v-if="isOwner" class="btn-edit" @click="showEditProfile = true">
            ✏️ แก้ไข
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-icon">📊</span>
          <span class="stat-value">{{ stats.avgScore.toFixed(1) }}</span>
          <span class="stat-label">คะแนนเฉลี่ย</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">📝</span>
          <span class="stat-value">{{ stats.totalSubmissions }}</span>
          <span class="stat-label">งานส่ง</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">🎯</span>
          <span class="stat-value">{{ stats.passedLOs }}</span>
          <span class="stat-label">LO ผ่าน</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">📦</span>
          <span class="stat-value">{{ evidencePacks.length }}</span>
          <span class="stat-label">Evidence Packs</span>
        </div>
      </div>

      <!-- Skills Radar -->
      <div class="section">
        <h2>🎯 ทักษะ A.R.C.E.</h2>
        <div class="radar-container">
          <RadarChart :values="skills" :size="280" />
        </div>
        <div class="skills-legend">
          <div class="legend-item">
            <span class="legend-icon">🔍</span>
            <span>Analysis: {{ skills.analysis.toFixed(1) }}</span>
          </div>
          <div class="legend-item">
            <span class="legend-icon">🧠</span>
            <span>Reasoning: {{ skills.reasoning.toFixed(1) }}</span>
          </div>
          <div class="legend-item">
            <span class="legend-icon">💡</span>
            <span>Creativity: {{ skills.creativity.toFixed(1) }}</span>
          </div>
          <div class="legend-item">
            <span class="legend-icon">📚</span>
            <span>Evidence: {{ skills.evidence.toFixed(1) }}</span>
          </div>
        </div>
      </div>

      <!-- Evidence Packs -->
      <div class="section">
        <div class="section-header">
          <h2>📦 Evidence Packs</h2>
          <button v-if="isOwner" class="btn-create" @click="showCreatePackModal = true">
            ➕ สร้าง Pack
          </button>
        </div>
        
        <div v-if="evidencePacks.length === 0" class="empty-packs">
          <span class="icon">📦</span>
          <p>ยังไม่มี Evidence Pack</p>
          <button v-if="isOwner" class="btn-primary" @click="showCreatePackModal = true">
            สร้าง Pack แรก
          </button>
        </div>

        <div class="packs-grid" v-else>
          <div 
            v-for="pack in evidencePacks"
            :key="pack.id"
            class="pack-card"
            @click="viewPack(pack.id)"
          >
            <div class="pack-header">
              <span class="pack-title">{{ pack.title }}</span>
              <span class="pack-status" :class="pack.status">
                {{ pack.status === 'active' ? '✅ Active' : '📝 Draft' }}
              </span>
            </div>
            <p class="pack-desc">{{ pack.description }}</p>
            <div class="pack-meta">
              <span>📝 {{ pack.submissionCount || 0 }} งาน</span>
              <span>📊 {{ pack.avgScore?.toFixed(1) || 0 }}/20</span>
            </div>
            <div class="pack-actions">
              <button class="btn-copy" @click.stop="copyVerifyLink(pack)">
                🔗 คัดลอก
              </button>
              <button class="btn-qr" @click.stop="showQR(pack)">
                📱 QR
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Achievements -->
      <div class="section">
        <h2>🏆 ความสำเร็จ</h2>
        <div class="achievements-list">
          <div 
            v-for="achievement in achievements"
            :key="achievement.id"
            class="achievement-badge"
          >
            <span class="badge-icon">{{ achievement.icon }}</span>
            <span class="badge-name">{{ achievement.name }}</span>
          </div>
          <div v-if="achievements.length === 0" class="empty-achievements">
            <p>ยังไม่มีความสำเร็จ</p>
          </div>
        </div>
      </div>

      <!-- Learning Journey -->
      <div class="section">
        <h2>📈 เส้นทางการเรียนรู้</h2>
        <div class="journey-timeline">
          <div 
            v-for="item in journeyItems.slice(0, 5)"
            :key="item.id"
            class="journey-item"
          >
            <div class="journey-dot"></div>
            <div class="journey-content">
              <span class="journey-date">{{ formatDate(item.date) }}</span>
              <span class="journey-title">{{ item.title }}</span>
              <span class="journey-score">{{ item.score }}/20</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Create Pack Modal -->
    <Teleport to="body">
      <div v-if="showCreatePackModal" class="modal-overlay" @click.self="closeCreatePackModal">
        <div class="modal">
          <div class="modal-header">
            <h2>📦 สร้าง Evidence Pack</h2>
            <button class="close-btn" @click="closeCreatePackModal">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>ชื่อ Pack *</label>
              <input 
                type="text" 
                v-model="newPack.title"
                placeholder="เช่น: ทักษะการวิเคราะห์ คณิตศาสตร์"
              >
            </div>

            <div class="form-group">
              <label>คำอธิบาย</label>
              <textarea 
                v-model="newPack.description"
                placeholder="อธิบายเกี่ยวกับ Pack นี้..."
                rows="3"
              ></textarea>
            </div>

            <div class="form-group">
              <label>วัตถุประสงค์</label>
              <select v-model="newPack.purpose">
                <option value="university">🎓 สมัครมหาวิทยาลัย</option>
                <option value="scholarship">💰 ทุนการศึกษา</option>
                <option value="portfolio">📁 Portfolio ทั่วไป</option>
                <option value="job">💼 สมัครงาน</option>
              </select>
            </div>

            <div class="form-group">
              <label>เลือกงานที่จะรวม</label>
              <div class="submissions-select">
                <div 
                  v-for="sub in availableSubmissions"
                  :key="sub.id"
                  class="submission-option"
                  :class="{ selected: newPack.selectedSubmissions.includes(sub.id) }"
                  @click="toggleSubmission(sub.id)"
                >
                  <input 
                    type="checkbox"
                    :checked="newPack.selectedSubmissions.includes(sub.id)"
                  >
                  <div class="option-info">
                    <span class="option-title">{{ sub.assignmentTitle }}</span>
                    <span class="option-score">{{ sub.finalScore }}/20</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="closeCreatePackModal">ยกเลิก</button>
            <button 
              class="btn-primary"
              @click="createPack"
              :disabled="!newPack.title || newPack.selectedSubmissions.length === 0 || creating"
            >
              {{ creating ? 'กำลังสร้าง...' : '✅ สร้าง Pack' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import RadarChart from '@/components/RadarChart.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'

// State
const loading = ref(true)
const portfolio = ref({})
const evidencePacks = ref([])
const achievements = ref([])
const journeyItems = ref([])
const availableSubmissions = ref([])

// Modal
const showCreatePackModal = ref(false)
const showEditProfile = ref(false)
const creating = ref(false)
const newPack = ref({
  title: '',
  description: '',
  purpose: 'portfolio',
  selectedSubmissions: []
})

// Computed
const userId = computed(() => route.params.userId || authStore.user?.uid)
const isOwner = computed(() => userId.value === authStore.user?.uid)

const stats = computed(() => {
  const submissions = journeyItems.value
  return {
    avgScore: submissions.length > 0 
      ? submissions.reduce((sum, s) => sum + (s.score || 0), 0) / submissions.length 
      : 0,
    totalSubmissions: submissions.length,
    passedLOs: portfolio.value.passedLOs?.length || 0
  }
})

const skills = computed(() => {
  const items = journeyItems.value
  if (items.length === 0) {
    return { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
  }
  
  const totals = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
  items.forEach(item => {
    if (item.rubric) {
      totals.analysis += item.rubric.analysis || 0
      totals.reasoning += item.rubric.reasoning || 0
      totals.creativity += item.rubric.creativity || 0
      totals.evidence += item.rubric.evidence || 0
    }
  })
  
  const count = items.length
  return {
    analysis: totals.analysis / count,
    reasoning: totals.reasoning / count,
    creativity: totals.creativity / count,
    evidence: totals.evidence / count
  }
})

// Methods
async function loadPortfolio() {
  loading.value = true
  try {
    // Load user profile
    const userDoc = await getDoc(doc(db, 'users', userId.value))
    if (userDoc.exists()) {
      portfolio.value = { id: userDoc.id, ...userDoc.data() }
    }
    
    // Load evidence packs
    const packsQuery = query(
      collection(db, 'evidence_packs'),
      where('userId', '==', userId.value),
      orderBy('createdAt', 'desc')
    )
    const packsSnapshot = await getDocs(packsQuery)
    evidencePacks.value = packsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    
    // Load submissions for journey
    const subsQuery = query(
      collection(db, 'submissions'),
      where('studentId', '==', userId.value),
      where('status', '==', 'APPROVED'),
      orderBy('submittedAt', 'desc')
    )
    const subsSnapshot = await getDocs(subsQuery)
    journeyItems.value = subsSnapshot.docs.map(d => {
      const data = d.data()
      return {
        id: d.id,
        title: data.assignmentTitle,
        score: data.finalScore,
        rubric: data.finalRubric,
        date: data.submittedAt
      }
    })
    
    // For creating pack - approved submissions
    availableSubmissions.value = subsSnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))
    
    // Mock achievements
    achievements.value = [
      { id: 1, icon: '🎯', name: 'นักวิเคราะห์' },
      { id: 2, icon: '🔥', name: 'ส่งงาน 10 วันติด' },
      { id: 3, icon: '⭐', name: 'คะแนนสูงสุด' }
    ].filter(() => Math.random() > 0.5)
    
  } catch (error) {
    console.error('Error loading portfolio:', error)
  } finally {
    loading.value = false
  }
}

function viewPack(packId) {
  router.push(`/evidence/${packId}`)
}

function copyVerifyLink(pack) {
  const url = `${window.location.origin}/verify/${pack.verificationHash}`
  navigator.clipboard.writeText(url)
  alert('✅ คัดลอกลิงก์แล้ว')
}

function showQR(pack) {
  // In real implementation, show QR code modal
  alert('📱 QR Code สำหรับ: ' + pack.title)
}

function closeCreatePackModal() {
  showCreatePackModal.value = false
  newPack.value = {
    title: '',
    description: '',
    purpose: 'portfolio',
    selectedSubmissions: []
  }
}

function toggleSubmission(subId) {
  const idx = newPack.value.selectedSubmissions.indexOf(subId)
  if (idx === -1) {
    newPack.value.selectedSubmissions.push(subId)
  } else {
    newPack.value.selectedSubmissions.splice(idx, 1)
  }
}

async function createPack() {
  if (!newPack.value.title || newPack.value.selectedSubmissions.length === 0 || creating.value) return
  
  creating.value = true
  try {
    const response = await fetch(`${FUNCTIONS_URL}/createEvidencePack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: authStore.user.uid,
        userName: authStore.user.displayName,
        title: newPack.value.title,
        description: newPack.value.description,
        purpose: newPack.value.purpose,
        submissionIds: newPack.value.selectedSubmissions
      })
    })
    
    const data = await response.json()
    if (data.success) {
      alert('✅ สร้าง Evidence Pack สำเร็จ')
      closeCreatePackModal()
      await loadPortfolio()
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.error)
    }
  } catch (error) {
    console.error('Error creating pack:', error)
    alert('เกิดข้อผิดพลาด')
  } finally {
    creating.value = false
  }
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000)
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

onMounted(loadPortfolio)
</script>

<style scoped>
.portfolio-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

/* Header */
.portfolio-header {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.back-link {
  color: var(--primary-color);
  text-decoration: none;
  display: inline-block;
  margin-bottom: 16px;
}

.profile-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.profile-info {
  flex: 1;
}

.profile-info h1 {
  margin-bottom: 4px;
}

.profile-subtitle {
  color: var(--text-secondary);
}

.btn-edit {
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stat-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
  display: block;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Sections */
.section {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.section h2 {
  margin-bottom: 20px;
  font-size: 1.2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  margin-bottom: 0;
}

/* Radar */
.radar-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.skills-legend {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Evidence Packs */
.empty-packs {
  text-align: center;
  padding: 40px;
}

.empty-packs .icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 16px;
}

.packs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.pack-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

.pack-card:hover {
  transform: translateY(-2px);
}

.pack-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.pack-title {
  font-weight: 600;
}

.pack-status {
  font-size: 0.85rem;
}

.pack-status.active {
  color: #059669;
}

.pack-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.pack-meta {
  display: flex;
  gap: 16px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.pack-actions {
  display: flex;
  gap: 8px;
}

.pack-actions button {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--card-bg);
  cursor: pointer;
  font-size: 0.85rem;
}

/* Achievements */
.achievements-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.achievement-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-radius: 20px;
}

.badge-icon {
  font-size: 1.2rem;
}

.empty-achievements {
  color: var(--text-secondary);
  font-style: italic;
}

/* Journey Timeline */
.journey-timeline {
  position: relative;
  padding-left: 20px;
}

.journey-item {
  position: relative;
  padding-bottom: 20px;
  padding-left: 20px;
  border-left: 2px solid var(--border-color);
}

.journey-item:last-child {
  border-left-color: transparent;
}

.journey-dot {
  position: absolute;
  left: -7px;
  top: 0;
  width: 12px;
  height: 12px;
  background: var(--primary-color);
  border-radius: 50%;
}

.journey-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.journey-date {
  font-size: 0.85rem;
  color: var(--text-secondary);
  min-width: 80px;
}

.journey-title {
  flex: 1;
}

.journey-score {
  font-weight: 600;
  color: var(--primary-color);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: var(--card-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
}

.submissions-select {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.submission-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color);
}

.submission-option:last-child {
  border-bottom: none;
}

.submission-option.selected {
  background: var(--primary-light);
}

.option-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
}

.option-score {
  font-weight: 600;
  color: var(--primary-color);
}

.btn-primary {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.5;
}

.btn-secondary {
  padding: 10px 20px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
}

.btn-create {
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .profile-section {
    flex-direction: column;
    text-align: center;
  }
}
</style>
