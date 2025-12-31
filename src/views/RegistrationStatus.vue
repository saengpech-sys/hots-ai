<template>
  <div class="registration-status-page">
    <div class="status-container">
      <!-- Header -->
      <div class="status-header">
        <span class="logo">🎓</span>
        <h1>ตรวจสอบสถานะการลงทะเบียน</h1>
      </div>

      <!-- Search Form -->
      <div v-if="!registration" class="search-form">
        <div class="form-group">
          <label>หมายเลขการลงทะเบียน</label>
          <input 
            v-model="registrationId"
            type="text"
            placeholder="REG-XXXXX-XXXX"
            @keyup.enter="checkStatus"
          />
        </div>
        
        <button 
          class="check-btn" 
          @click="checkStatus"
          :disabled="!registrationId || isLoading"
        >
          <span v-if="isLoading">กำลังตรวจสอบ...</span>
          <span v-else>ตรวจสอบสถานะ</span>
        </button>

        <p v-if="error" class="error-message">{{ error }}</p>
      </div>

      <!-- Status Display -->
      <div v-else class="status-display">
        <div class="status-card" :class="registration.status">
          <div class="status-icon">
            <span v-if="registration.status === 'pending'">⏳</span>
            <span v-else-if="registration.status === 'verifying'">🔍</span>
            <span v-else-if="registration.status === 'approved'">✅</span>
            <span v-else-if="registration.status === 'rejected'">❌</span>
            <span v-else-if="registration.status === 'provisioned'">🎉</span>
          </div>
          
          <div class="status-info">
            <span class="status-label">{{ statusInfo.title }}</span>
            <span class="status-description">{{ statusInfo.description }}</span>
          </div>
        </div>

        <div class="registration-details">
          <h3>ข้อมูลการลงทะเบียน</h3>
          
          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">หมายเลข:</span>
              <span class="value">{{ registration.registrationId }}</span>
            </div>
            <div class="detail-item">
              <span class="label">โรงเรียน:</span>
              <span class="value">{{ registration.schoolName }}</span>
            </div>
            <div class="detail-item">
              <span class="label">รหัสโรงเรียน:</span>
              <span class="value">{{ registration.schoolCode }}</span>
            </div>
            <div class="detail-item">
              <span class="label">วันที่ลงทะเบียน:</span>
              <span class="value">{{ formatDate(registration.submittedAt) }}</span>
            </div>
            <div v-if="registration.verifiedAt" class="detail-item">
              <span class="label">ยืนยันอีเมลเมื่อ:</span>
              <span class="value">{{ formatDate(registration.verifiedAt) }}</span>
            </div>
            <div v-if="registration.approvedAt" class="detail-item">
              <span class="label">อนุมัติเมื่อ:</span>
              <span class="value">{{ formatDate(registration.approvedAt) }}</span>
            </div>
          </div>

          <div v-if="registration.rejectionReason" class="rejection-reason">
            <h4>เหตุผลที่ไม่ผ่านการอนุมัติ</h4>
            <p>{{ registration.rejectionReason }}</p>
          </div>
        </div>

        <!-- Progress Timeline -->
        <div class="progress-timeline">
          <div class="timeline-item" :class="{ completed: isStepCompleted('pending') }">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <span class="timeline-title">ลงทะเบียน</span>
              <span class="timeline-date">{{ formatDate(registration.submittedAt) }}</span>
            </div>
          </div>
          
          <div class="timeline-item" :class="{ 
            completed: isStepCompleted('verifying'), 
            active: registration.status === 'pending'
          }">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <span class="timeline-title">ยืนยันอีเมล</span>
              <span class="timeline-date">{{ registration.verifiedAt ? formatDate(registration.verifiedAt) : 'รอดำเนินการ' }}</span>
            </div>
          </div>
          
          <div class="timeline-item" :class="{ 
            completed: isStepCompleted('approved'), 
            active: registration.status === 'verifying',
            rejected: registration.status === 'rejected'
          }">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <span class="timeline-title">อนุมัติจาก สพท.</span>
              <span class="timeline-date">{{ registration.approvedAt ? formatDate(registration.approvedAt) : 'รอดำเนินการ' }}</span>
            </div>
          </div>
          
          <div class="timeline-item" :class="{ 
            completed: isStepCompleted('provisioned'), 
            active: registration.status === 'approved'
          }">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <span class="timeline-title">พร้อมใช้งาน</span>
              <span class="timeline-date">{{ registration.provisionedAt ? formatDate(registration.provisionedAt) : 'รอดำเนินการ' }}</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="status-actions">
          <button class="secondary-btn" @click="resetSearch">
            ตรวจสอบหมายเลขอื่น
          </button>
          
          <router-link v-if="registration.status === 'provisioned'" to="/login" class="primary-btn">
            เข้าสู่ระบบ
          </router-link>
          
          <router-link v-else to="/" class="secondary-btn">
            กลับหน้าหลัก
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// State
const registrationId = ref('')
const registration = ref(null)
const statusInfo = ref({})
const isLoading = ref(false)
const error = ref('')

// Status step order
const statusOrder = ['pending', 'verifying', 'approved', 'provisioned']

// Methods
async function checkStatus() {
  if (!registrationId.value) return
  
  try {
    isLoading.value = true
    error.value = ''
    
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL
    const response = await fetch(
      `${functionsUrl}/getRegistrationStatus?registrationId=${registrationId.value}`
    )
    
    const data = await response.json()
    
    if (data.success) {
      registration.value = data.registration
      statusInfo.value = data.statusInfo
    } else {
      error.value = data.error || 'ไม่พบข้อมูลการลงทะเบียน'
    }
  } catch (err) {
    console.error('Error checking status:', err)
    error.value = 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่'
  } finally {
    isLoading.value = false
  }
}

function isStepCompleted(status) {
  const currentIndex = statusOrder.indexOf(registration.value?.status)
  const stepIndex = statusOrder.indexOf(status)
  return stepIndex <= currentIndex
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  
  let date
  if (timestamp._seconds) {
    date = new Date(timestamp._seconds * 1000)
  } else if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000)
  } else {
    date = new Date(timestamp)
  }
  
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function resetSearch() {
  registration.value = null
  registrationId.value = ''
  error.value = ''
}

onMounted(() => {
  // Check if ID is in query params
  if (route.query.id) {
    registrationId.value = route.query.id
    checkStatus()
  }
})
</script>

<style scoped>
.registration-status-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: var(--space-6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-container {
  background: white;
  border-radius: var(--radius-2xl);
  padding: var(--space-8);
  max-width: 600px;
  width: 100%;
  box-shadow: var(--shadow-xl);
}

.status-header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.logo {
  font-size: 48px;
  display: block;
  margin-bottom: var(--space-3);
}

.status-header h1 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin: 0;
}

/* Search Form */
.search-form {
  text-align: center;
}

.form-group {
  margin-bottom: var(--space-4);
  text-align: left;
}

.form-group label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
  margin-bottom: var(--space-1);
}

.form-group input {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  text-align: center;
  letter-spacing: 0.05em;
}

.check-btn {
  padding: var(--space-3) var(--space-6);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-weight: var(--font-semibold);
  cursor: pointer;
}

.check-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: var(--error-500);
  margin-top: var(--space-4);
}

/* Status Display */
.status-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  border-radius: var(--radius-xl);
  margin-bottom: var(--space-6);
}

.status-card.pending { background: var(--warning-50); }
.status-card.verifying { background: var(--info-50); }
.status-card.approved { background: var(--success-50); }
.status-card.rejected { background: var(--error-50); }
.status-card.provisioned { background: var(--success-50); }

.status-icon {
  font-size: 40px;
}

.status-info {
  display: flex;
  flex-direction: column;
}

.status-label {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.status-description {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* Registration Details */
.registration-details {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  margin-bottom: var(--space-6);
}

.registration-details h3 {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-secondary);
  margin-bottom: var(--space-4);
}

.detail-grid {
  display: grid;
  gap: var(--space-2);
}

.detail-item {
  display: flex;
  gap: var(--space-2);
}

.detail-item .label {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  min-width: 120px;
}

.detail-item .value {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

.rejection-reason {
  margin-top: var(--space-4);
  padding: var(--space-3);
  background: var(--error-50);
  border-radius: var(--radius-md);
}

.rejection-reason h4 {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--error-700);
  margin: 0 0 var(--space-2);
}

.rejection-reason p {
  font-size: var(--text-sm);
  color: var(--error-600);
  margin: 0;
}

/* Progress Timeline */
.progress-timeline {
  position: relative;
  padding-left: var(--space-6);
  margin-bottom: var(--space-6);
}

.progress-timeline::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--border-default);
}

.timeline-item {
  position: relative;
  padding-bottom: var(--space-4);
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-marker {
  position: absolute;
  left: -20px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  border: 2px solid var(--border-default);
}

.timeline-item.completed .timeline-marker {
  background: var(--success-500);
  border-color: var(--success-500);
}

.timeline-item.active .timeline-marker {
  background: var(--primary-500);
  border-color: var(--primary-500);
  animation: pulse 1.5s infinite;
}

.timeline-item.rejected .timeline-marker {
  background: var(--error-500);
  border-color: var(--error-500);
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
}

.timeline-content {
  display: flex;
  flex-direction: column;
}

.timeline-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

.timeline-date {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

/* Actions */
.status-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
}

.primary-btn {
  padding: var(--space-3) var(--space-5);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-weight: var(--font-semibold);
  text-decoration: none;
  cursor: pointer;
}

.secondary-btn {
  padding: var(--space-3) var(--space-5);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  text-decoration: none;
  cursor: pointer;
}
</style>
