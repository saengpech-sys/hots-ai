<template>
  <div class="verify-page">
    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <LoadingSpinner message="กำลังตรวจสอบ..." />
    </div>

    <!-- Invalid/Not Found -->
    <div v-else-if="!pack" class="verify-result invalid">
      <div class="result-icon">❌</div>
      <h1>ไม่พบข้อมูล</h1>
      <p>ไม่พบ Evidence Pack ที่ตรงกับ hash นี้</p>
      <p class="hash-display">Hash: {{ hash }}</p>
    </div>

    <!-- Valid -->
    <template v-else>
      <!-- Verification Badge -->
      <div class="verify-badge valid">
        <span class="badge-icon">✅</span>
        <div class="badge-info">
          <h2>ข้อมูลถูกต้อง</h2>
          <p>Evidence Pack นี้ได้รับการยืนยันและไม่ถูกแก้ไข</p>
        </div>
      </div>

      <!-- Student Info -->
      <div class="student-card">
        <img :src="pack.userPhoto || '/default-avatar.png'" class="student-avatar">
        <div class="student-info">
          <h1>{{ pack.userName }}</h1>
          <p class="pack-title">📦 {{ pack.title }}</p>
          <p class="pack-purpose">🎯 {{ getPurposeLabel(pack.purpose) }}</p>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-icon">📝</span>
          <span class="stat-value">{{ pack.submissionCount }}</span>
          <span class="stat-label">งานที่รวม</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">📊</span>
          <span class="stat-value">{{ pack.avgScore?.toFixed(1) || 0 }}</span>
          <span class="stat-label">คะแนนเฉลี่ย</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">🎯</span>
          <span class="stat-value">{{ pack.passedLOs?.length || 0 }}</span>
          <span class="stat-label">LO ที่ผ่าน</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">📅</span>
          <span class="stat-value">{{ formatDate(pack.createdAt) }}</span>
          <span class="stat-label">สร้างเมื่อ</span>
        </div>
      </div>

      <!-- Skills -->
      <div class="section">
        <h2>🎯 ทักษะ A.R.C.E.</h2>
        <div class="skills-bars">
          <div class="skill-bar" v-for="skill in skillsList" :key="skill.key">
            <div class="skill-header">
              <span>{{ skill.icon }} {{ skill.label }}</span>
              <span>{{ skill.value.toFixed(1) }}/5</span>
            </div>
            <div class="bar-track">
              <div 
                class="bar-fill"
                :style="{ width: `${(skill.value / 5) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Submissions List -->
      <div class="section">
        <h2>📝 รายการงาน</h2>
        <div class="submissions-list">
          <div 
            v-for="sub in pack.submissions"
            :key="sub.id"
            class="submission-item"
          >
            <div class="sub-header">
              <span class="sub-title">{{ sub.assignmentTitle }}</span>
              <span class="sub-score">{{ sub.finalScore }}/20</span>
            </div>
            <div class="sub-arce">
              <span>🔍 {{ sub.finalRubric?.analysis || 0 }}</span>
              <span>🧠 {{ sub.finalRubric?.reasoning || 0 }}</span>
              <span>💡 {{ sub.finalRubric?.creativity || 0 }}</span>
              <span>📚 {{ sub.finalRubric?.evidence || 0 }}</span>
            </div>
            <div class="sub-date">
              📅 {{ formatDate(sub.submittedAt) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Verification Details -->
      <div class="section verification-details">
        <h2>🔐 ข้อมูลการยืนยัน</h2>
        <div class="detail-row">
          <span class="label">Hash:</span>
          <code class="hash-code">{{ pack.verificationHash }}</code>
        </div>
        <div class="detail-row">
          <span class="label">สร้างเมื่อ:</span>
          <span>{{ formatDateTime(pack.createdAt) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">ยืนยันล่าสุด:</span>
          <span>{{ formatDateTime(pack.lastVerifiedAt || pack.createdAt) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">ยืนยันไปแล้ว:</span>
          <span>{{ pack.verificationCount || 1 }} ครั้ง</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button class="btn-share" @click="shareLink">
          🔗 แชร์ลิงก์
        </button>
        <button class="btn-print" @click="printPage">
          🖨️ พิมพ์
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'

// State
const loading = ref(true)
const pack = ref(null)
const hash = computed(() => route.params.hash)

// Skills computed
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
async function loadVerification() {
  loading.value = true
  try {
    const response = await fetch(`${FUNCTIONS_URL}/verifyEvidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: hash.value })
    })
    
    const data = await response.json()
    if (data.success && data.pack) {
      pack.value = data.pack
    }
  } catch (error) {
    console.error('Error verifying:', error)
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

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp)
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatDateTime(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp)
  return date.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function shareLink() {
  const url = window.location.href
  navigator.clipboard.writeText(url)
  alert('✅ คัดลอกลิงก์แล้ว')
}

function printPage() {
  window.print()
}

onMounted(loadVerification)
</script>

<style scoped>
.verify-page {
  max-width: 700px;
  margin: 0 auto;
  padding: 20px;
}

/* Loading */
.loading-container {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Invalid Result */
.verify-result.invalid {
  text-align: center;
  padding: 60px 20px;
  background: var(--card-bg);
  border-radius: 16px;
}

.verify-result .result-icon {
  font-size: 5rem;
  margin-bottom: 20px;
}

.hash-display {
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 16px;
  word-break: break-all;
}

/* Verify Badge */
.verify-badge {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.verify-badge.valid {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border: 2px solid #10b981;
}

.badge-icon {
  font-size: 3rem;
}

.badge-info h2 {
  color: #065f46;
  margin-bottom: 4px;
}

.badge-info p {
  color: #047857;
  font-size: 0.9rem;
}

/* Student Card */
.student-card {
  display: flex;
  align-items: center;
  gap: 20px;
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.student-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.student-info h1 {
  margin-bottom: 8px;
}

.pack-title, .pack-purpose {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
  display: block;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
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

/* Skills Bars */
.skills-bars {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skill-bar {
  width: 100%;
}

.skill-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.bar-track {
  height: 10px;
  background: var(--border-color);
  border-radius: 5px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--primary-color);
  border-radius: 5px;
  transition: width 0.5s ease;
}

/* Submissions List */
.submissions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.submission-item {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
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
  gap: 16px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.sub-date {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Verification Details */
.verification-details {
  background: #f8fafc;
}

.detail-row {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  min-width: 120px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.hash-code {
  font-family: monospace;
  font-size: 0.85rem;
  background: var(--card-bg);
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-all;
}

/* Actions */
.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-share, .btn-print {
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

.btn-share {
  background: var(--primary-color);
  color: white;
  border: none;
}

.btn-print {
  background: transparent;
  border: 1px solid var(--border-color);
}

/* Responsive */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .student-card {
    flex-direction: column;
    text-align: center;
  }
}

/* Print Styles */
@media print {
  .actions {
    display: none;
  }
  
  .verify-page {
    max-width: 100%;
  }
}
</style>
