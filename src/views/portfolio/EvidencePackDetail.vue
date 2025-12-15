<template>
  <div class="evidence-pack-detail">
    <!-- Loading -->
    <LoadingSpinner v-if="loading" />

    <template v-else-if="pack">
      <!-- Header -->
      <div class="pack-header">
        <router-link to="/portfolio" class="back-link">← กลับ Portfolio</router-link>
        
        <div class="header-main">
          <div class="header-info">
            <h1>📦 {{ pack.title }}</h1>
            <p class="pack-desc">{{ pack.description }}</p>
            <span class="pack-purpose">🎯 {{ getPurposeLabel(pack.purpose) }}</span>
          </div>
          <div class="header-actions" v-if="isOwner">
            <button class="btn-delete" @click="confirmDelete">🗑️ ลบ</button>
          </div>
        </div>
      </div>

      <!-- Stats Banner -->
      <div class="stats-banner">
        <div class="stat">
          <span class="value">{{ pack.submissionCount }}</span>
          <span class="label">งาน</span>
        </div>
        <div class="stat">
          <span class="value">{{ pack.avgScore?.toFixed(1) || 0 }}/20</span>
          <span class="label">คะแนนเฉลี่ย</span>
        </div>
        <div class="stat">
          <span class="value">{{ pack.passedLOs?.length || 0 }}</span>
          <span class="label">LOs</span>
        </div>
      </div>

      <!-- Verification -->
      <div class="verification-card">
        <div class="verify-status">
          <span class="verify-icon">✅</span>
          <span>ยืนยันได้</span>
        </div>
        <div class="verify-link">
          <input type="text" :value="verifyUrl" readonly ref="linkInput">
          <button @click="copyVerifyLink">📋 คัดลอก</button>
        </div>
        <p class="hash-preview">Hash: {{ pack.verificationHash?.substring(0, 16) }}...</p>
      </div>

      <!-- Skills Cards -->
      <div class="section">
        <h2>🎯 ทักษะ A.R.C.E.</h2>
        <div class="skills-cards">
          <div class="skill-card" v-for="skill in skillsList" :key="skill.key">
            <span class="skill-icon">{{ skill.icon }}</span>
            <span class="skill-name">{{ skill.label }}</span>
            <div class="skill-bar-mini">
              <div 
                class="bar-fill"
                :style="{ width: `${(skill.value / 5) * 100}%` }"
              ></div>
            </div>
            <span class="skill-value">{{ skill.value.toFixed(1) }}/5</span>
          </div>
        </div>
      </div>

      <!-- Submissions -->
      <div class="section">
        <h2>📝 รายการงาน</h2>
        <div class="submissions-grid">
          <div 
            v-for="sub in pack.submissions"
            :key="sub.id"
            class="submission-card"
            @click="expandedSub = expandedSub === sub.id ? null : sub.id"
          >
            <div class="sub-header">
              <span class="sub-title">{{ sub.assignmentTitle }}</span>
              <span class="sub-score">{{ sub.finalScore }}/20</span>
            </div>
            
            <div class="sub-arce">
              <span v-for="d in dimensions" :key="d.key">
                {{ d.icon }} {{ sub.finalRubric?.[d.key] || 0 }}
              </span>
            </div>
            
            <!-- Expanded Answer -->
            <div v-if="expandedSub === sub.id" class="sub-expanded">
              <h4>คำตอบ:</h4>
              <p class="answer-text">{{ sub.answer }}</p>
              <h4 v-if="sub.feedback">Feedback:</h4>
              <p v-if="sub.feedback" class="feedback-text">{{ sub.feedback }}</p>
            </div>
            
            <span class="expand-hint">
              {{ expandedSub === sub.id ? '▲ ย่อ' : '▼ ดูเพิ่มเติม' }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- Not Found -->
    <div v-else class="not-found">
      <h2>ไม่พบ Evidence Pack</h2>
      <router-link to="/portfolio">← กลับ Portfolio</router-link>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
        <div class="modal delete-modal">
          <div class="modal-header">
            <h2>🗑️ ยืนยันการลบ</h2>
          </div>
          <div class="modal-body">
            <p>คุณต้องการลบ Evidence Pack "<strong>{{ pack?.title }}</strong>" หรือไม่?</p>
            <p class="warning">⚠️ การกระทำนี้ไม่สามารถยกเลิกได้</p>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showDeleteModal = false">ยกเลิก</button>
            <button class="btn-danger" @click="deletePack" :disabled="deleting">
              {{ deleting ? 'กำลังลบ...' : '🗑️ ยืนยันลบ' }}
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
import { doc, getDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(true)
const pack = ref(null)
const expandedSub = ref(null)
const showDeleteModal = ref(false)
const deleting = ref(false)

// Dimensions
const dimensions = [
  { key: 'analysis', icon: '🔍' },
  { key: 'reasoning', icon: '🧠' },
  { key: 'creativity', icon: '💡' },
  { key: 'evidence', icon: '📚' }
]

// Computed
const isOwner = computed(() => pack.value?.userId === authStore.user?.uid)
const verifyUrl = computed(() => `${window.location.origin}/verify/${pack.value?.verificationHash}`)

const skillsList = computed(() => {
  if (!pack.value?.avgRubric) return []
  const r = pack.value.avgRubric
  return [
    { key: 'analysis', label: 'Analysis', icon: '🔍', value: r.analysis || 0 },
    { key: 'reasoning', label: 'Reasoning', icon: '🧠', value: r.reasoning || 0 },
    { key: 'creativity', label: 'Creativity', icon: '💡', value: r.creativity || 0 },
    { key: 'evidence', label: 'Evidence', icon: '📚', value: r.evidence || 0 }
  ]
})

// Methods
async function loadPack() {
  loading.value = true
  try {
    const packDoc = await getDoc(doc(db, 'evidence_packs', route.params.id))
    if (packDoc.exists()) {
      pack.value = { id: packDoc.id, ...packDoc.data() }
    }
  } catch (error) {
    console.error('Error loading pack:', error)
  } finally {
    loading.value = false
  }
}

function getPurposeLabel(purpose) {
  const labels = {
    'university': '🎓 สมัครมหาวิทยาลัย',
    'scholarship': '💰 ทุนการศึกษา',
    'portfolio': '📁 Portfolio ทั่วไป',
    'job': '💼 สมัครงาน'
  }
  return labels[purpose] || purpose
}

function copyVerifyLink() {
  navigator.clipboard.writeText(verifyUrl.value)
  alert('✅ คัดลอกลิงก์แล้ว')
}

function confirmDelete() {
  showDeleteModal.value = true
}

async function deletePack() {
  if (deleting.value) return
  
  deleting.value = true
  try {
    await deleteDoc(doc(db, 'evidence_packs', pack.value.id))
    alert('✅ ลบ Evidence Pack แล้ว')
    router.push('/portfolio')
  } catch (error) {
    console.error('Error deleting pack:', error)
    alert('เกิดข้อผิดพลาด')
  } finally {
    deleting.value = false
    showDeleteModal.value = false
  }
}

onMounted(loadPack)
</script>

<style scoped>
.evidence-pack-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

/* Header */
.pack-header {
  margin-bottom: 24px;
}

.back-link {
  color: var(--primary-color);
  text-decoration: none;
  display: inline-block;
  margin-bottom: 16px;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
}

.header-info h1 {
  margin-bottom: 8px;
}

.pack-desc {
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.pack-purpose {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.btn-delete {
  padding: 8px 16px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* Stats Banner */
.stats-banner {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.stats-banner .stat {
  flex: 1;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stats-banner .value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
}

.stats-banner .label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Verification Card */
.verification-card {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border: 2px solid #10b981;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.verify-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #065f46;
  margin-bottom: 12px;
}

.verify-icon {
  font-size: 1.2rem;
}

.verify-link {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.verify-link input {
  flex: 1;
  padding: 10px;
  border: 1px solid #10b981;
  border-radius: 6px;
  background: var(--card-bg);
  font-size: 0.85rem;
}

.verify-link button {
  padding: 10px 16px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.hash-preview {
  font-family: monospace;
  font-size: 0.8rem;
  color: #047857;
}

/* Section */
.section {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.section h2 {
  margin-bottom: 20px;
  font-size: 1.1rem;
}

/* Skills Cards */
.skills-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.skill-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.skill-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 4px;
}

.skill-name {
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 8px;
}

.skill-bar-mini {
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  margin-bottom: 4px;
  overflow: hidden;
}

.skill-bar-mini .bar-fill {
  height: 100%;
  background: var(--primary-color);
  border-radius: 3px;
}

.skill-value {
  font-weight: 600;
  font-size: 0.9rem;
}

/* Submissions Grid */
.submissions-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.submission-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.submission-card:hover {
  background: var(--border-color);
}

.sub-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.sub-title {
  font-weight: 600;
}

.sub-score {
  font-weight: 700;
  color: var(--primary-color);
}

.sub-arce {
  display: flex;
  gap: 12px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.sub-expanded {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.sub-expanded h4 {
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.answer-text, .feedback-text {
  padding: 12px;
  background: var(--card-bg);
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-wrap;
  margin-bottom: 12px;
}

.expand-hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: block;
  text-align: center;
}

/* Not Found */
.not-found {
  text-align: center;
  padding: 60px 20px;
  background: var(--card-bg);
  border-radius: 16px;
}

.not-found a {
  color: var(--primary-color);
  margin-top: 16px;
  display: inline-block;
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
  max-width: 400px;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-body {
  padding: 20px;
}

.modal-body .warning {
  color: #dc2626;
  font-size: 0.9rem;
  margin-top: 12px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.btn-secondary {
  padding: 10px 20px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
}

.btn-danger {
  padding: 10px 20px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-danger:disabled {
  opacity: 0.5;
}

@media (max-width: 768px) {
  .skills-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
