<template>
  <div class="profile-container">
    <nav class="navbar card">
      <button @click="goBack" class="btn btn-secondary">← กลับ</button>
      <h1>โปรไฟล์</h1>
    </nav>

    <div class="profile-content">
      <div class="profile-card card">
        <div class="profile-header">
          <img v-if="user?.photoURL" :src="user.photoURL" class="profile-avatar" alt="Avatar" />
          <div class="profile-info">
            <h2>{{ user?.displayName }}</h2>
            <p>{{ user?.email }}</p>
            <span class="role-badge" :class="userProfile?.role">
              {{ userProfile?.role === 'teacher' ? '👨‍🏫 ครู' : '👨‍🎓 นักเรียน' }}
            </span>
          </div>
        </div>

        <form @submit.prevent="handleSave" class="profile-form">
          <div class="form-section">
            <h3>ข้อมูลส่วนตัว</h3>
            
            <div class="form-group">
              <label>ชื่อ-นามสกุล</label>
              <input 
                v-model="formData.displayName" 
                type="text" 
                class="input-field"
                placeholder="กรอกชื่อ-นามสกุล"
              />
            </div>

            <div v-if="isStudent" class="student-fields">
              <div class="form-group">
                <label>รหัสนักเรียน (5 หลัก)</label>
                <input 
                  v-model="formData.studentId" 
                  type="text" 
                  maxlength="5"
                  pattern="[0-9]{5}"
                  class="input-field"
                  placeholder="เช่น 12345"
                />
              </div>

              <!-- Parent Access Code Section -->
              <div class="form-group parent-code-section">
                <label>รหัสสำหรับผู้ปกครอง (Parent Access Code)</label>
                <div class="code-display-group">
                  <div class="code-box" :class="{ 'has-code': parentCode }">
                    {{ parentCode || 'ยังไม่มีรหัส' }}
                  </div>
                  <button 
                    type="button" 
                    @click="generateParentCode" 
                    class="btn btn-outline"
                    :disabled="generatingCode"
                  >
                    {{ parentCode ? '🔄 สร้างใหม่' : '✨ สร้างรหัส' }}
                  </button>
                </div>
                <p class="help-text">ใช้รหัสนี้ร่วมกับรหัสนักเรียนเพื่อให้ผู้ปกครองดูผลการเรียนได้</p>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>ชั้น</label>
                  <select v-model="formData.grade" class="input-field">
                    <option value="">เลือกชั้น</option>
                    <option v-for="grade in grades" :key="grade" :value="grade">{{ grade }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>ห้อง</label>
                  <select v-model="formData.room" class="input-field">
                    <option value="">เลือกห้อง</option>
                    <option v-for="room in 20" :key="room" :value="room">{{ room }}</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>เลขที่</label>
                  <input 
                    v-model="formData.number" 
                    type="number" 
                    min="1"
                    max="99"
                    class="input-field"
                    placeholder="เลขที่"
                  />
                </div>

                <div class="form-group">
                  <label>ตอน</label>
                  <select v-model="formData.section" class="input-field">
                    <option value="">ไม่มีตอน</option>
                    <option value="ก">ก</option>
                    <option value="ข">ข</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>การยินยอมข้อมูล (Data Consent)</h3>
            <p class="consent-description">
              เพื่อประโยชน์ในการพัฒนานักเรียนสู่ระดับสากล และการวิจัยเพื่อพัฒนาการศึกษา
              โปรดพิจารณาให้ความยินยอมในหัวข้อต่อไปนี้ (สามารถเปลี่ยนแปลงได้ตลอดเวลา)
            </p>

            <div class="consent-group">
              <div class="checkbox-item">
                <input 
                  type="checkbox" 
                  id="researchConsent" 
                  v-model="formData.consents.researchConsent"
                >
                <label for="researchConsent">
                  <strong>ยินยอมให้ใช้ข้อมูลเพื่อการวิจัย (Research Consent)</strong>
                  <span class="sub-label">ข้อมูลจะถูกนำไปใช้โดยไม่ระบุตัวตน (Anonymized) เพื่อวิจัยและพัฒนาระบบการศึกษา</span>
                </label>
              </div>

              <div class="checkbox-item">
                <input 
                  type="checkbox" 
                  id="competitionConsent" 
                  v-model="formData.consents.competitionConsent"
                >
                <label for="competitionConsent">
                  <strong>ยินยอมให้คัดกรองเพื่อส่งแข่งขัน (Competition Consent)</strong>
                  <span class="sub-label">อนุญาตให้ระบบแนะนำรายชื่อเพื่อเข้าร่วมการแข่งขันระดับประเทศและนานาชาติ</span>
                </label>
              </div>

              <div class="checkbox-item">
                <input 
                  type="checkbox" 
                  id="talentTrackingConsent" 
                  v-model="formData.consents.talentTrackingConsent"
                >
                <label for="talentTrackingConsent">
                  <strong>ยินยอมให้ระบุเป็นผู้มีความสามารถพิเศษ (Talent Tracking)</strong>
                  <span class="sub-label">อนุญาตให้ระบบวิเคราะห์และติดตามพัฒนาการเพื่อส่งเสริมความเป็นเลิศเฉพาะด้าน</span>
                </label>
              </div>
            </div>
          </div>

          <div v-if="error" class="error-message">{{ error }}</div>
          <div v-if="success" class="success-message">{{ success }}</div>

          <div class="form-actions">
            <button type="submit" :disabled="saving" class="btn btn-primary">
              {{ saving ? 'กำลังบันทึก...' : '💾 บันทึกข้อมูล' }}
            </button>
          </div>
        </form>

        <!-- 🆕 PDPA Data Subject Rights Section -->
        <div class="data-rights-section card" style="margin-top: 24px;">
          <h3>⚖️ สิทธิ์ตามกฎหมาย PDPA</h3>
          <p class="section-description">ท่านมีสิทธิ์ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562</p>
          
          <div class="pdpa-quick-links" style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
            <button @click="$router.push('/privacy/data-retention')" class="btn btn-outline">
              📋 นโยบายการเก็บข้อมูล
            </button>
            <button @click="$router.push('/privacy/ai-explanation')" class="btn btn-outline">
              🤖 อธิบายการทำงานของ AI
            </button>
            <button v-if="isStudent" @click="$router.push('/privacy/parental-consent')" class="btn btn-outline">
              👨‍👩‍👧 แบบยินยอมผู้ปกครอง
            </button>
          </div>

          <div class="data-rights-actions">
            <button 
              @click="handleDownloadData" 
              :disabled="downloadingData"
              class="btn btn-info"
            >
              📥 {{ downloadingData ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลดข้อมูลของฉัน' }}
            </button>
            <p class="help-text">ดาวน์โหลดข้อมูลทั้งหมดของท่านในรูปแบบ JSON</p>

            <button 
              @click="handleDeleteAccount" 
              :disabled="deletingAccount"
              class="btn btn-danger"
            >
              🗑️ {{ deletingAccount ? 'กำลังดำเนินการ...' : 'ขอลบบัญชี' }}
            </button>
            <p class="help-text warning-text">ข้อมูลจะถูกลบถาวรภายใน 30 วัน (สามารถยกเลิกได้ภายในระยะเวลาดังกล่าว)</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const user = computed(() => authStore.user)
const userProfile = computed(() => authStore.userProfile)
const isStudent = computed(() => authStore.isStudent)

const grades = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6']

const formData = ref({
  displayName: '',
  studentId: '',
  grade: '',
  room: '',
  number: '',
  section: '',
  consents: {
    researchConsent: false,
    competitionConsent: false,
    talentTrackingConsent: false
  }
})

const parentCode = ref('')
const generatingCode = ref(false)

const saving = ref(false)
const error = ref(null)
const success = ref(null)

// 🆕 PDPA Data Rights
const downloadingData = ref(false)
const deletingAccount = ref(false)

onMounted(() => {
  if (userProfile.value) {
    formData.value = {
      displayName: userProfile.value.displayName || user.value?.displayName || '',
      studentId: userProfile.value.studentId || '',
      grade: userProfile.value.grade || '',
      room: userProfile.value.room || '',
      number: userProfile.value.number || '',
      section: userProfile.value.section || '',
      consents: userProfile.value.consents || {
        researchConsent: false,
        competitionConsent: false,
        talentTrackingConsent: false
      }
    }
    parentCode.value = userProfile.value.parentCode || ''
  }
})

const generateParentCode = async () => {
  generatingCode.value = true
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    await authStore.updateUserProfile({ parentCode: code })
    parentCode.value = code
    success.value = 'สร้างรหัสผู้ปกครองเรียบร้อยแล้ว'
  } catch (err) {
    error.value = 'เกิดข้อผิดพลาดในการสร้างรหัส'
  } finally {
    generatingCode.value = false
  }
}

// 🆕 PDPA Data Rights Handlers
async function handleDownloadData() {
  downloadingData.value = true
  error.value = null
  try {
    await authStore.downloadUserData()
    success.value = 'ดาวน์โหลดข้อมูลสำเร็จ!'
    setTimeout(() => { success.value = null }, 3000)
  } catch (err) {
    error.value = 'เกิดข้อผิดพลาดในการดาวน์โหลดข้อมูล'
  } finally {
    downloadingData.value = false
  }
}

async function handleDeleteAccount() {
  deletingAccount.value = true
  error.value = null
  try {
    const confirmed = await authStore.requestAccountDeletion()
    if (confirmed) {
      // User will be signed out automatically
      router.push('/')
    }
  } catch (err) {
    error.value = 'เกิดข้อผิดพลาดในการขอลบบัญชี'
  } finally {
    deletingAccount.value = false
  }
}

async function handleSave() {
  try {
    saving.value = true
    error.value = null
    success.value = null

    // Validate student ID if provided
    if (isStudent.value && formData.value.studentId) {
      if (!/^\d{5}$/.test(formData.value.studentId)) {
        error.value = 'รหัสนักเรียนต้องเป็นตัวเลข 5 หลัก'
        return
      }
    }

    await authStore.updateUserProfile(formData.value)
    success.value = 'บันทึกข้อมูลเรียบร้อยแล้ว'

    setTimeout(() => {
      success.value = null
    }, 3000)

  } catch (err) {
    error.value = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
    console.error('Save error:', err)
  } finally {
    saving.value = false
  }
}

function goBack() {
  if (authStore.isTeacher) {
    router.push('/teacher')
  } else {
    router.push('/student')
  }
}
</script>

<style scoped>
.profile-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;

  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.navbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
}

.navbar h1 {
  margin: 0;
  font-size: 1.5rem;
}

.profile-content {
  display: flex;
  justify-content: center;
}

.profile-card {
  width: 100%;
  padding: 2rem;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid var(--border-color);
  margin-bottom: 2rem;
}

.profile-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 4px solid var(--primary);
}

.profile-info h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  color: var(--text-primary);
}

.profile-info p {
  margin: 0 0 0.75rem 0;
  color: var(--text-secondary);
}

.role-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
}

.role-badge.teacher {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.role-badge.student {
  background: linear-gradient(135deg, #48bb78, #38a169);
  color: white;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-section h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.student-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.parent-code-section {
  background-color: var(--bg-secondary);
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  border: 1px dashed var(--primary);
}

.code-display-group {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 0.5rem;
}

.code-box {
  font-family: monospace;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 2px;
  padding: 0.5rem 1rem;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  min-width: 120px;
  text-align: center;
  color: var(--text-secondary);
}

.code-box.has-code {
  color: var(--primary);
  border-color: var(--primary);
}

.help-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.error-message {
  background: #fee;
  color: var(--danger);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--danger);
}

.success-message {
  background: #efe;
  color: var(--success);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--success);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

/* 🆕 Data Rights Section */
.data-rights-section {
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e2e8f0 100%);
}

:global(.dark-mode) .data-rights-section {
  background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
}

.data-rights-section h3 {
  margin-bottom: 8px;
  color: var(--text-primary);
}

.section-description {
  color: var(--text-secondary);
  margin-bottom: 20px;
  font-size: 0.95rem;
}

.data-rights-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.data-rights-actions button {
  width: 100%;
  justify-content: center;
}

.btn-info {
  background: linear-gradient(135deg, #3182ce 0%, #2c5282 100%);
  color: white;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-info:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(49, 130, 206, 0.4);
}

.btn-danger {
  background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
  color: white;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(229, 62, 62, 0.4);
}

.btn-info:disabled,
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.warning-text {
  color: #e53e3e;
  font-weight: 500;
}

.consent-description {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  line-height: 1.5;
}

.consent-group {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 8px;
}

.checkbox-item {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.checkbox-item input[type="checkbox"] {
  margin-top: 0.25rem;
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

.checkbox-item label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
}

.checkbox-item label strong {
  color: var(--text-primary);
  font-size: 1rem;
}

.sub-label {
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
