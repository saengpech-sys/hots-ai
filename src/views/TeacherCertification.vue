<template>
  <div class="teacher-certification">
    <!-- Header -->
    <div class="cert-header">
      <h1>🎓 ระบบรับรองผู้ประเมิน HOTS</h1>
      <p class="subtitle">Teacher Certification Program</p>
    </div>

    <!-- Current Status Card -->
    <div class="status-card" :class="currentLevel?.id || 'none'">
      <div class="badge-display">
        <span class="badge-icon">{{ currentLevel?.icon || '📋' }}</span>
        <div class="badge-info">
          <h2>{{ currentLevel?.nameTh || 'ยังไม่ได้รับการรับรอง' }}</h2>
          <p>{{ currentLevel?.name || 'Not Certified' }}</p>
        </div>
      </div>
      
      <div class="progress-metrics">
        <div class="metric">
          <span class="metric-value">{{ certification.progress?.calibrations || 0 }}</span>
          <span class="metric-label">การ Calibrate</span>
        </div>
        <div class="metric">
          <span class="metric-value">{{ (certification.progress?.avgKappa * 100).toFixed(0) || 0 }}%</span>
          <span class="metric-label">ค่า Kappa</span>
        </div>
        <div class="metric">
          <span class="metric-value">{{ certification.progress?.avgAccuracy?.toFixed(0) || 0 }}%</span>
          <span class="metric-label">ความแม่นยำ</span>
        </div>
      </div>
    </div>

    <!-- Next Level Progress -->
    <div v-if="nextLevel" class="next-level-card">
      <h3>🎯 เป้าหมายถัดไป: {{ nextLevel.nameTh }}</h3>
      
      <div class="requirement-list">
        <div class="requirement" :class="{ met: calibrationsMet }">
          <span class="req-icon">{{ calibrationsMet ? '✅' : '⏳' }}</span>
          <div class="req-info">
            <span class="req-label">จำนวน Calibration</span>
            <div class="progress-bar">
              <div 
                class="progress-fill"
                :style="{ width: calibrationsProgress + '%' }"
              ></div>
            </div>
            <span class="req-status">
              {{ certification.progress?.calibrations || 0 }} / {{ nextLevel.requirements.minCalibrations }}
            </span>
          </div>
        </div>

        <div class="requirement" :class="{ met: kappaMet }">
          <span class="req-icon">{{ kappaMet ? '✅' : '⏳' }}</span>
          <div class="req-info">
            <span class="req-label">ค่า Kappa</span>
            <div class="progress-bar">
              <div 
                class="progress-fill kappa"
                :style="{ width: kappaProgress + '%' }"
              ></div>
            </div>
            <span class="req-status">
              {{ ((certification.progress?.avgKappa || 0) * 100).toFixed(0) }}% / {{ nextLevel.requirements.minKappa * 100 }}%
            </span>
          </div>
        </div>

        <div class="requirement" :class="{ met: accuracyMet }">
          <span class="req-icon">{{ accuracyMet ? '✅' : '⏳' }}</span>
          <div class="req-info">
            <span class="req-label">ความแม่นยำ</span>
            <div class="progress-bar">
              <div 
                class="progress-fill accuracy"
                :style="{ width: accuracyProgress + '%' }"
              ></div>
            </div>
            <span class="req-status">
              {{ certification.progress?.avgAccuracy?.toFixed(0) || 0 }}% / {{ nextLevel.requirements.minAccuracy }}%
            </span>
          </div>
        </div>
      </div>

      <button 
        v-if="canClaimBadge"
        class="claim-badge-btn"
        @click="claimBadge"
        :disabled="isClaimingBadge"
      >
        {{ isClaimingBadge ? 'กำลังดำเนินการ...' : '🏆 รับ Badge' }}
      </button>
    </div>

    <!-- Training Modules -->
    <div class="training-section">
      <h3>📚 โมดูลอบรม</h3>
      <p class="section-desc">เรียนรู้การประเมินตามกรอบ A.R.C.E. เพื่อพัฒนาทักษะ</p>

      <div class="modules-grid">
        <div 
          v-for="module in trainingModules" 
          :key="module.id"
          class="module-card"
          :class="{ completed: isModuleCompleted(module.id) }"
          @click="openModule(module)"
        >
          <div class="module-icon">
            {{ getModuleIcon(module.type) }}
          </div>
          <div class="module-info">
            <h4>{{ module.title }}</h4>
            <p>{{ module.description }}</p>
            <div class="module-meta">
              <span>⏱️ {{ module.duration }} นาที</span>
              <span v-if="isModuleCompleted(module.id)" class="completed-badge">✓ เรียนแล้ว</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Calibration Practice -->
    <div class="calibration-section">
      <h3>🎯 ฝึก Calibration</h3>
      <p class="section-desc">ประเมินตัวอย่างและเปรียบเทียบกับผู้เชี่ยวชาญ</p>

      <button class="start-calibration-btn" @click="startCalibration">
        เริ่มฝึก Calibration
      </button>
    </div>

    <!-- Certification Levels -->
    <div class="levels-section">
      <h3>🏅 ระดับการรับรอง</h3>
      
      <div class="levels-list">
        <div 
          v-for="level in certificationLevels" 
          :key="level.id"
          class="level-card"
          :class="{ 
            current: currentLevel?.id === level.id,
            achieved: isLevelAchieved(level.id)
          }"
        >
          <span class="level-icon" :style="{ color: level.color }">{{ level.icon }}</span>
          <div class="level-info">
            <h4>{{ level.nameTh }}</h4>
            <p>{{ level.name }}</p>
            <ul class="level-reqs">
              <li>Calibration: {{ level.requirements.minCalibrations }}+</li>
              <li>Kappa: {{ (level.requirements.minKappa * 100) }}%+</li>
              <li>ความแม่นยำ: {{ level.requirements.minAccuracy }}%+</li>
            </ul>
          </div>
          <span v-if="currentLevel?.id === level.id" class="current-badge">ปัจจุบัน</span>
        </div>
      </div>
    </div>

    <!-- Active Badges -->
    <div v-if="certification.activeBadges?.length" class="badges-section">
      <h3>🎖️ Badge ที่ได้รับ</h3>
      
      <div class="badges-grid">
        <div 
          v-for="badge in certification.activeBadges" 
          :key="badge.id"
          class="badge-card"
        >
          <span class="badge-icon-lg">{{ badge.icon }}</span>
          <div class="badge-details">
            <h4>{{ badge.levelNameTh }}</h4>
            <p>ออกเมื่อ: {{ formatDate(badge.issuedAt) }}</p>
            <p>หมดอายุ: {{ formatDate(badge.expiresAt) }}</p>
            <span class="verify-code">{{ badge.verificationCode }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading & Error States -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <div v-if="error" class="error-toast">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'

const authStore = useAuthStore()
const functions = getFunctions()

// State
const certification = ref({})
const trainingModules = ref([])
const completedModules = ref([])
const isLoading = ref(true)
const error = ref(null)
const isClaimingBadge = ref(false)

// Certification levels
const certificationLevels = [
  {
    id: 'bronze',
    name: 'Bronze Assessor',
    nameTh: 'ผู้ประเมินระดับทองแดง',
    requirements: { minCalibrations: 10, minKappa: 0.60, minAccuracy: 70 },
    color: '#CD7F32',
    icon: '🥉'
  },
  {
    id: 'silver',
    name: 'Silver Assessor',
    nameTh: 'ผู้ประเมินระดับเงิน',
    requirements: { minCalibrations: 30, minKappa: 0.70, minAccuracy: 80 },
    color: '#C0C0C0',
    icon: '🥈'
  },
  {
    id: 'gold',
    name: 'Gold Assessor',
    nameTh: 'ผู้ประเมินระดับทอง',
    requirements: { minCalibrations: 50, minKappa: 0.80, minAccuracy: 85 },
    color: '#FFD700',
    icon: '🥇'
  },
  {
    id: 'master',
    name: 'Master Assessor',
    nameTh: 'ผู้เชี่ยวชาญการประเมิน',
    requirements: { minCalibrations: 100, minKappa: 0.85, minAccuracy: 90 },
    color: '#E5E4E2',
    icon: '🏆'
  },
  {
    id: 'expert',
    name: 'Expert Assessor',
    nameTh: 'ผู้ทรงคุณวุฒิการประเมิน HOTS',
    requirements: { minCalibrations: 200, minKappa: 0.90, minAccuracy: 95 },
    color: '#B9F2FF',
    icon: '💎'
  }
]

// Computed
const currentLevel = computed(() => certification.value.currentLevel)
const nextLevel = computed(() => certification.value.nextLevel)

const calibrationsProgress = computed(() => {
  if (!nextLevel.value) return 100
  const current = certification.value.progress?.calibrations || 0
  const target = nextLevel.value.requirements.minCalibrations
  return Math.min(100, (current / target) * 100)
})

const kappaProgress = computed(() => {
  if (!nextLevel.value) return 100
  const current = certification.value.progress?.avgKappa || 0
  const target = nextLevel.value.requirements.minKappa
  return Math.min(100, (current / target) * 100)
})

const accuracyProgress = computed(() => {
  if (!nextLevel.value) return 100
  const current = certification.value.progress?.avgAccuracy || 0
  const target = nextLevel.value.requirements.minAccuracy
  return Math.min(100, (current / target) * 100)
})

const calibrationsMet = computed(() => {
  if (!nextLevel.value) return true
  return (certification.value.progress?.calibrations || 0) >= nextLevel.value.requirements.minCalibrations
})

const kappaMet = computed(() => {
  if (!nextLevel.value) return true
  return (certification.value.progress?.avgKappa || 0) >= nextLevel.value.requirements.minKappa
})

const accuracyMet = computed(() => {
  if (!nextLevel.value) return true
  return (certification.value.progress?.avgAccuracy || 0) >= nextLevel.value.requirements.minAccuracy
})

const canClaimBadge = computed(() => {
  return calibrationsMet.value && kappaMet.value && accuracyMet.value
})

// Methods
async function loadCertification() {
  try {
    isLoading.value = true
    const response = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/getTeacherCertification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId: authStore.user.uid })
    })
    const data = await response.json()
    if (data.success) {
      certification.value = data.certification
    }
  } catch (err) {
    error.value = 'ไม่สามารถโหลดข้อมูลการรับรองได้'
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

async function loadTrainingModules() {
  try {
    const response = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/getTrainingModules`)
    const data = await response.json()
    if (data.success) {
      trainingModules.value = data.modules
    }
  } catch (err) {
    console.error('Error loading training modules:', err)
  }
}

async function claimBadge() {
  if (!nextLevel.value || !canClaimBadge.value) return
  
  try {
    isClaimingBadge.value = true
    const response = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/issueBadge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: authStore.user.uid,
        badgeType: nextLevel.value.id
      })
    })
    const data = await response.json()
    if (data.success) {
      alert(data.message)
      await loadCertification()
    } else {
      error.value = data.error
    }
  } catch (err) {
    error.value = 'ไม่สามารถรับ Badge ได้'
    console.error(err)
  } finally {
    isClaimingBadge.value = false
  }
}

function isModuleCompleted(moduleId) {
  return completedModules.value.includes(moduleId)
}

function isLevelAchieved(levelId) {
  if (!currentLevel.value) return false
  const levels = ['bronze', 'silver', 'gold', 'master', 'expert']
  const currentIndex = levels.indexOf(currentLevel.value.id)
  const checkIndex = levels.indexOf(levelId)
  return checkIndex <= currentIndex
}

function getModuleIcon(type) {
  const icons = {
    video: '🎬',
    interactive: '🖱️',
    practice: '🎯',
    assessment: '📝'
  }
  return icons[type] || '📚'
}

function openModule(module) {
  // Navigate to module or open modal
  console.log('Opening module:', module)
}

function startCalibration() {
  // Navigate to calibration practice
  window.location.href = '/calibration-practice'
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

onMounted(() => {
  loadCertification()
  loadTrainingModules()
})
</script>

<style scoped>
.teacher-certification {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--space-6);
}

.cert-header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.cert-header h1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.subtitle {
  color: var(--text-secondary);
  font-size: var(--text-lg);
}

/* Status Card */
.status-card {
  background: linear-gradient(135deg, var(--primary-500), var(--secondary-500));
  border-radius: var(--radius-2xl);
  padding: var(--space-6);
  color: white;
  margin-bottom: var(--space-6);
}

.status-card.bronze { background: linear-gradient(135deg, #CD7F32, #8B4513); }
.status-card.silver { background: linear-gradient(135deg, #C0C0C0, #808080); }
.status-card.gold { background: linear-gradient(135deg, #FFD700, #FFA500); }
.status-card.master { background: linear-gradient(135deg, #E5E4E2, #B0B0B0); }
.status-card.expert { background: linear-gradient(135deg, #B9F2FF, #00CED1); }

.badge-display {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.badge-icon {
  font-size: 4rem;
}

.badge-info h2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--space-1);
}

.badge-info p {
  opacity: 0.9;
}

.progress-metrics {
  display: flex;
  gap: var(--space-6);
}

.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.metric-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
}

.metric-label {
  font-size: var(--text-sm);
  opacity: 0.9;
}

/* Next Level Card */
.next-level-card {
  background: var(--surface-card);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  margin-bottom: var(--space-6);
  box-shadow: var(--shadow-md);
}

.next-level-card h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-4);
}

.requirement-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.requirement {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
}

.requirement.met {
  background: var(--success-100);
}

.req-icon {
  font-size: var(--text-xl);
}

.req-info {
  flex: 1;
}

.req-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  display: block;
  margin-bottom: var(--space-1);
}

.progress-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--space-1);
}

.progress-fill {
  height: 100%;
  background: var(--primary-500);
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.progress-fill.kappa { background: var(--arce-reasoning); }
.progress-fill.accuracy { background: var(--arce-evidence); }

.req-status {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

.claim-badge-btn {
  width: 100%;
  margin-top: var(--space-4);
  padding: var(--space-4);
  background: linear-gradient(135deg, var(--success-500), var(--success-600));
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all 0.3s ease;
}

.claim-badge-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.claim-badge-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Training Section */
.training-section,
.calibration-section,
.levels-section,
.badges-section {
  margin-bottom: var(--space-8);
}

.training-section h3,
.calibration-section h3,
.levels-section h3,
.badges-section h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.section-desc {
  color: var(--text-secondary);
  margin-bottom: var(--space-4);
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.module-card {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--surface-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-default);
  cursor: pointer;
  transition: all 0.2s ease;
}

.module-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.module-card.completed {
  border-color: var(--success-500);
  background: var(--success-50);
}

.module-icon {
  font-size: var(--text-2xl);
}

.module-info h4 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.module-info p {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.module-meta {
  display: flex;
  gap: var(--space-3);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.completed-badge {
  color: var(--success-600);
  font-weight: var(--font-medium);
}

/* Calibration Section */
.start-calibration-btn {
  padding: var(--space-4) var(--space-6);
  background: var(--primary-500);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all 0.2s ease;
}

.start-calibration-btn:hover {
  background: var(--primary-600);
}

/* Levels Section */
.levels-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.level-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--surface-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-default);
  position: relative;
}

.level-card.current {
  border-color: var(--primary-500);
  background: var(--primary-50);
}

.level-card.achieved {
  opacity: 0.7;
}

.level-icon {
  font-size: var(--text-3xl);
}

.level-info h4 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.level-info p {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.level-reqs {
  margin-top: var(--space-2);
  padding-left: var(--space-4);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.current-badge {
  position: absolute;
  right: var(--space-4);
  top: 50%;
  transform: translateY(-50%);
  background: var(--primary-500);
  color: white;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

/* Badges Section */
.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-4);
}

.badge-card {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--surface-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-default);
}

.badge-icon-lg {
  font-size: var(--text-4xl);
}

.badge-details h4 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.badge-details p {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.verify-code {
  display: inline-block;
  margin-top: var(--space-2);
  padding: var(--space-1) var(--space-2);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-primary);
}

/* Loading & Error */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: var(--z-modal);
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-toast {
  position: fixed;
  bottom: var(--space-6);
  left: 50%;
  transform: translateX(-50%);
  background: var(--error-500);
  color: white;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-lg);
  z-index: var(--z-toast);
}

/* Responsive */
@media (max-width: 768px) {
  .progress-metrics {
    flex-wrap: wrap;
  }
  
  .modules-grid {
    grid-template-columns: 1fr;
  }
}
</style>
