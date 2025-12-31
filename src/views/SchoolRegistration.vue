<template>
  <div class="school-registration">
    <!-- Header -->
    <div class="registration-header">
      <div class="logo-section">
        <span class="logo">🎓</span>
        <div class="title-section">
          <h1>HOTS AI ChatLoop</h1>
          <p>ลงทะเบียนโรงเรียน</p>
        </div>
      </div>
    </div>

    <!-- Progress Steps -->
    <div class="progress-steps">
      <div 
        v-for="(step, index) in steps" 
        :key="step.id"
        class="step"
        :class="{ 
          active: currentStep === index,
          completed: currentStep > index
        }"
      >
        <div class="step-indicator">
          <span v-if="currentStep > index">✓</span>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <span class="step-label">{{ step.label }}</span>
      </div>
    </div>

    <!-- Form Container -->
    <div class="form-container">
      <!-- Step 1: School Information -->
      <div v-if="currentStep === 0" class="step-content">
        <h2>📚 ข้อมูลโรงเรียน</h2>
        
        <div class="form-group">
          <label class="required">ชื่อโรงเรียน</label>
          <input 
            v-model="form.schoolName" 
            type="text" 
            placeholder="เช่น โรงเรียนอนุบาลสุรินทร์"
            :class="{ error: errors.schoolName }"
          />
          <span v-if="errors.schoolName" class="error-text">{{ errors.schoolName }}</span>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="required">รหัสโรงเรียน (OBEC)</label>
            <input 
              v-model="form.schoolCode" 
              type="text" 
              placeholder="เช่น 1032000001"
              :class="{ error: errors.schoolCode }"
            />
            <span v-if="errors.schoolCode" class="error-text">{{ errors.schoolCode }}</span>
          </div>

          <div class="form-group">
            <label class="required">ประเภทโรงเรียน</label>
            <select v-model="form.schoolType">
              <option value="primary">ประถมศึกษา</option>
              <option value="secondary">มัธยมศึกษา</option>
              <option value="combined">ประถม-มัธยม</option>
              <option value="vocational">อาชีวศึกษา</option>
              <option value="special">การศึกษาพิเศษ</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="required">เขตพื้นที่การศึกษา</label>
            <select 
              v-model="form.esaId"
              :class="{ error: errors.esaId }"
            >
              <option value="">-- เลือกเขตพื้นที่ --</option>
              <option v-for="esa in esaList" :key="esa.id" :value="esa.id">
                {{ esa.name }}
              </option>
            </select>
            <span v-if="errors.esaId" class="error-text">{{ errors.esaId }}</span>
          </div>

          <div class="form-group">
            <label>จังหวัด</label>
            <input v-model="form.province" type="text" placeholder="จังหวัด" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>อำเภอ</label>
            <input v-model="form.district" type="text" placeholder="อำเภอ" />
          </div>

          <div class="form-group">
            <label>ตำบล</label>
            <input v-model="form.subdistrict" type="text" placeholder="ตำบล" />
          </div>
        </div>

        <div class="form-group">
          <label>ที่อยู่</label>
          <textarea 
            v-model="form.address" 
            rows="2" 
            placeholder="ที่อยู่โรงเรียน"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>รหัสไปรษณีย์</label>
            <input v-model="form.postalCode" type="text" placeholder="รหัสไปรษณีย์" />
          </div>

          <div class="form-group">
            <label>โทรศัพท์</label>
            <input v-model="form.phoneNumber" type="tel" placeholder="เบอร์โทรศัพท์" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>อีเมลโรงเรียน</label>
            <input v-model="form.email" type="email" placeholder="email@school.ac.th" />
          </div>

          <div class="form-group">
            <label>เว็บไซต์</label>
            <input v-model="form.website" type="url" placeholder="https://..." />
          </div>
        </div>
      </div>

      <!-- Step 2: Director & Stats -->
      <div v-if="currentStep === 1" class="step-content">
        <h2>👨‍💼 ข้อมูลผู้อำนวยการและสถิติ</h2>
        
        <div class="section-title">ข้อมูลผู้อำนวยการ</div>
        
        <div class="form-group">
          <label>ชื่อผู้อำนวยการ</label>
          <input v-model="form.directorName" type="text" placeholder="ชื่อ-สกุล" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>อีเมลผู้อำนวยการ</label>
            <input v-model="form.directorEmail" type="email" placeholder="director@school.ac.th" />
          </div>

          <div class="form-group">
            <label>โทรศัพท์</label>
            <input v-model="form.directorPhone" type="tel" placeholder="เบอร์โทรศัพท์" />
          </div>
        </div>

        <div class="section-title">สถิติโรงเรียน</div>

        <div class="form-row">
          <div class="form-group">
            <label>จำนวนนักเรียน</label>
            <input v-model.number="form.studentCount" type="number" min="0" placeholder="0" />
          </div>

          <div class="form-group">
            <label>จำนวนครู</label>
            <input v-model.number="form.teacherCount" type="number" min="0" placeholder="0" />
          </div>
        </div>

        <div class="form-group">
          <label>ระดับชั้นที่เปิดสอน</label>
          <input v-model="form.gradeRange" type="text" placeholder="เช่น ป.1-ป.6 หรือ ม.1-ม.6" />
        </div>
      </div>

      <!-- Step 3: Registrant Info -->
      <div v-if="currentStep === 2" class="step-content">
        <h2>👤 ข้อมูลผู้ลงทะเบียน</h2>
        
        <p class="info-text">
          ผู้ลงทะเบียนจะเป็นผู้ดูแลระบบของโรงเรียน (School Admin)
        </p>

        <div class="form-group">
          <label class="required">ชื่อผู้ลงทะเบียน</label>
          <input 
            v-model="form.registrantName" 
            type="text" 
            placeholder="ชื่อ-สกุล"
            :class="{ error: errors.registrantName }"
          />
          <span v-if="errors.registrantName" class="error-text">{{ errors.registrantName }}</span>
        </div>

        <div class="form-group">
          <label class="required">อีเมล (สำหรับเข้าใช้งาน)</label>
          <input 
            v-model="form.registrantEmail" 
            type="email" 
            placeholder="your.email@gmail.com"
            :class="{ error: errors.registrantEmail }"
          />
          <span v-if="errors.registrantEmail" class="error-text">{{ errors.registrantEmail }}</span>
          <small class="help-text">ใช้อีเมล Google ที่จะใช้ในการเข้าสู่ระบบ</small>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>ตำแหน่ง</label>
            <select v-model="form.registrantRole">
              <option value="teacher">ครู</option>
              <option value="head">หัวหน้ากลุ่มสาระ</option>
              <option value="vice_director">รองผู้อำนวยการ</option>
              <option value="director">ผู้อำนวยการ</option>
            </select>
          </div>

          <div class="form-group">
            <label>โทรศัพท์</label>
            <input v-model="form.registrantPhone" type="tel" placeholder="เบอร์โทรศัพท์" />
          </div>
        </div>
      </div>

      <!-- Step 4: Review & Submit -->
      <div v-if="currentStep === 3" class="step-content">
        <h2>📋 ตรวจสอบข้อมูล</h2>

        <div class="review-section">
          <h3>ข้อมูลโรงเรียน</h3>
          <div class="review-grid">
            <div class="review-item">
              <span class="label">ชื่อโรงเรียน:</span>
              <span class="value">{{ form.schoolName }}</span>
            </div>
            <div class="review-item">
              <span class="label">รหัสโรงเรียน:</span>
              <span class="value">{{ form.schoolCode }}</span>
            </div>
            <div class="review-item">
              <span class="label">ประเภท:</span>
              <span class="value">{{ getSchoolTypeLabel(form.schoolType) }}</span>
            </div>
            <div class="review-item">
              <span class="label">เขตพื้นที่:</span>
              <span class="value">{{ getESAName(form.esaId) }}</span>
            </div>
            <div class="review-item">
              <span class="label">จังหวัด:</span>
              <span class="value">{{ form.province || '-' }}</span>
            </div>
          </div>
        </div>

        <div class="review-section">
          <h3>สถิติ</h3>
          <div class="review-grid">
            <div class="review-item">
              <span class="label">นักเรียน:</span>
              <span class="value">{{ form.studentCount || 0 }} คน</span>
            </div>
            <div class="review-item">
              <span class="label">ครู:</span>
              <span class="value">{{ form.teacherCount || 0 }} คน</span>
            </div>
            <div class="review-item">
              <span class="label">ระดับชั้น:</span>
              <span class="value">{{ form.gradeRange || '-' }}</span>
            </div>
          </div>
        </div>

        <div class="review-section">
          <h3>ผู้ลงทะเบียน</h3>
          <div class="review-grid">
            <div class="review-item">
              <span class="label">ชื่อ:</span>
              <span class="value">{{ form.registrantName }}</span>
            </div>
            <div class="review-item">
              <span class="label">อีเมล:</span>
              <span class="value">{{ form.registrantEmail }}</span>
            </div>
          </div>
        </div>

        <div class="terms-checkbox">
          <label>
            <input type="checkbox" v-model="acceptedTerms" />
            <span>ข้าพเจ้ายืนยันว่าข้อมูลทั้งหมดเป็นความจริง และยินยอมให้ใช้ข้อมูลเพื่อการลงทะเบียนระบบ HOTS AI ChatLoop</span>
          </label>
        </div>
      </div>

      <!-- Step 5: Verification -->
      <div v-if="currentStep === 4" class="step-content">
        <h2>✉️ ยืนยันอีเมล</h2>
        
        <div class="verification-info">
          <div class="icon">📧</div>
          <p>เราได้ส่งรหัสยืนยัน 6 หลักไปที่</p>
          <p class="email">{{ form.registrantEmail }}</p>
        </div>

        <div class="form-group verification-code">
          <label>รหัสยืนยัน</label>
          <input 
            v-model="verificationCode" 
            type="text" 
            maxlength="6"
            placeholder="XXXXXX"
            class="code-input"
            :class="{ error: verificationError }"
          />
          <span v-if="verificationError" class="error-text">{{ verificationError }}</span>
        </div>

        <button 
          class="resend-btn" 
          @click="resendVerification"
          :disabled="resendCooldown > 0"
        >
          {{ resendCooldown > 0 ? `ส่งใหม่ใน ${resendCooldown}s` : 'ส่งรหัสใหม่' }}
        </button>
      </div>

      <!-- Step 6: Success -->
      <div v-if="currentStep === 5" class="step-content success-step">
        <div class="success-icon">✅</div>
        <h2>ลงทะเบียนสำเร็จ!</h2>
        
        <div class="success-info">
          <p>หมายเลขการลงทะเบียน: <strong>{{ registrationId }}</strong></p>
          <p>การลงทะเบียนของท่านอยู่ระหว่างการพิจารณาจากเขตพื้นที่การศึกษา</p>
        </div>

        <div class="next-steps">
          <h3>ขั้นตอนถัดไป</h3>
          <ol>
            <li>รอการอนุมัติจากเขตพื้นที่การศึกษา (3-5 วันทำการ)</li>
            <li>เมื่ออนุมัติแล้ว จะได้รับแจ้งทางอีเมล</li>
            <li>ลงชื่อเข้าใช้ด้วย Google Account ที่ลงทะเบียน</li>
            <li>เริ่มใช้งานระบบ HOTS AI ChatLoop!</li>
          </ol>
        </div>

        <div class="action-buttons">
          <button class="primary-btn" @click="checkStatus">
            ตรวจสอบสถานะ
          </button>
          <router-link to="/" class="secondary-btn">
            กลับหน้าหลัก
          </router-link>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div v-if="currentStep < 5" class="navigation-buttons">
        <button 
          v-if="currentStep > 0 && currentStep < 4" 
          class="back-btn"
          @click="prevStep"
        >
          ← ย้อนกลับ
        </button>
        
        <button 
          v-if="currentStep < 3"
          class="next-btn"
          @click="nextStep"
          :disabled="!canProceed"
        >
          ถัดไป →
        </button>

        <button 
          v-if="currentStep === 3"
          class="submit-btn"
          @click="submitRegistration"
          :disabled="!acceptedTerms || isSubmitting"
        >
          <span v-if="isSubmitting">กำลังส่ง...</span>
          <span v-else>ส่งการลงทะเบียน</span>
        </button>

        <button 
          v-if="currentStep === 4"
          class="verify-btn"
          @click="verifyEmail"
          :disabled="verificationCode.length !== 6 || isVerifying"
        >
          <span v-if="isVerifying">กำลังยืนยัน...</span>
          <span v-else>ยืนยัน</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Steps configuration
const steps = [
  { id: 'school', label: 'ข้อมูลโรงเรียน' },
  { id: 'director', label: 'ผู้อำนวยการ' },
  { id: 'registrant', label: 'ผู้ลงทะเบียน' },
  { id: 'review', label: 'ตรวจสอบ' },
  { id: 'verify', label: 'ยืนยัน' },
  { id: 'success', label: 'เสร็จสิ้น' }
]

// State
const currentStep = ref(0)
const isSubmitting = ref(false)
const isVerifying = ref(false)
const acceptedTerms = ref(false)
const registrationId = ref('')
const verificationCode = ref('')
const verificationError = ref('')
const resendCooldown = ref(0)

const errors = ref({})

// Form data
const form = ref({
  schoolName: '',
  schoolCode: '',
  schoolType: 'combined',
  esaId: '',
  province: '',
  district: '',
  subdistrict: '',
  address: '',
  postalCode: '',
  phoneNumber: '',
  email: '',
  website: '',
  
  directorName: '',
  directorEmail: '',
  directorPhone: '',
  
  registrantName: '',
  registrantEmail: '',
  registrantRole: 'teacher',
  registrantPhone: '',
  
  studentCount: 0,
  teacherCount: 0,
  gradeRange: ''
})

// ESA list (sample - should be loaded from API)
const esaList = ref([
  { id: 'esa-bkk-1', name: 'สพป.กรุงเทพมหานคร เขต 1' },
  { id: 'esa-bkk-2', name: 'สพป.กรุงเทพมหานคร เขต 2' },
  { id: 'esa-cm-1', name: 'สพป.เชียงใหม่ เขต 1' },
  { id: 'esa-sr-1', name: 'สพป.สุรินทร์ เขต 1' },
  { id: 'esa-sr-2', name: 'สพป.สุรินทร์ เขต 2' },
  { id: 'esa-sr-3', name: 'สพป.สุรินทร์ เขต 3' },
  { id: 'esa-sk-1', name: 'สพม.ศรีสะเกษ' },
  { id: 'esa-nk-1', name: 'สพม.นครราชสีมา' }
])

// Computed
const canProceed = computed(() => {
  if (currentStep.value === 0) {
    return form.value.schoolName && form.value.schoolCode && form.value.esaId
  }
  if (currentStep.value === 2) {
    return form.value.registrantName && form.value.registrantEmail
  }
  return true
})

// Methods
function validateStep(step) {
  errors.value = {}
  
  if (step === 0) {
    if (!form.value.schoolName) errors.value.schoolName = 'กรุณากรอกชื่อโรงเรียน'
    if (!form.value.schoolCode) errors.value.schoolCode = 'กรุณากรอกรหัสโรงเรียน'
    if (!form.value.esaId) errors.value.esaId = 'กรุณาเลือกเขตพื้นที่การศึกษา'
  }
  
  if (step === 2) {
    if (!form.value.registrantName) errors.value.registrantName = 'กรุณากรอกชื่อผู้ลงทะเบียน'
    if (!form.value.registrantEmail) errors.value.registrantEmail = 'กรุณากรอกอีเมล'
    else if (!isValidEmail(form.value.registrantEmail)) {
      errors.value.registrantEmail = 'รูปแบบอีเมลไม่ถูกต้อง'
    }
  }
  
  return Object.keys(errors.value).length === 0
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function nextStep() {
  if (validateStep(currentStep.value)) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

async function submitRegistration() {
  try {
    isSubmitting.value = true
    
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL
    const response = await fetch(`${functionsUrl}/registerSchool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    
    const data = await response.json()
    
    if (data.success) {
      registrationId.value = data.registrationId
      currentStep.value = 4  // Go to verification step
    } else {
      alert(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    }
  } catch (error) {
    console.error('Registration error:', error)
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่')
  } finally {
    isSubmitting.value = false
  }
}

async function verifyEmail() {
  try {
    isVerifying.value = true
    verificationError.value = ''
    
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL
    const response = await fetch(`${functionsUrl}/verifyRegistration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationId: registrationId.value,
        verificationCode: verificationCode.value.toUpperCase()
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      currentStep.value = 5  // Success step
    } else {
      verificationError.value = data.error || 'รหัสยืนยันไม่ถูกต้อง'
    }
  } catch (error) {
    console.error('Verification error:', error)
    verificationError.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    isVerifying.value = false
  }
}

function resendVerification() {
  // TODO: Call resend API
  resendCooldown.value = 60
  const timer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

async function checkStatus() {
  // Navigate to status check page
  window.location.href = `/registration-status?id=${registrationId.value}`
}

function getSchoolTypeLabel(type) {
  const labels = {
    primary: 'ประถมศึกษา',
    secondary: 'มัธยมศึกษา',
    combined: 'ประถม-มัธยม',
    vocational: 'อาชีวศึกษา',
    special: 'การศึกษาพิเศษ'
  }
  return labels[type] || type
}

function getESAName(esaId) {
  const esa = esaList.value.find(e => e.id === esaId)
  return esa?.name || esaId
}

onMounted(() => {
  // Load ESA list from API if needed
})
</script>

<style scoped>
.school-registration {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: var(--space-6);
}

/* Header */
.registration-header {
  text-align: center;
  margin-bottom: var(--space-8);
  color: white;
}

.logo-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
}

.logo {
  font-size: 48px;
}

.title-section h1 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin: 0;
}

.title-section p {
  margin: 0;
  opacity: 0.9;
}

/* Progress Steps */
.progress-steps {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}

.step {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: rgba(255, 255, 255, 0.6);
}

.step.active,
.step.completed {
  color: white;
}

.step-indicator {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.step.active .step-indicator {
  background: white;
  color: #667eea;
}

.step.completed .step-indicator {
  background: #22c55e;
  color: white;
}

.step-label {
  font-size: var(--text-sm);
}

@media (max-width: 768px) {
  .step-label {
    display: none;
  }
}

/* Form Container */
.form-container {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  border-radius: var(--radius-2xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-xl);
}

.step-content h2 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-6);
}

.section-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: var(--space-6) 0 var(--space-4);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border-default);
}

/* Form Elements */
.form-group {
  margin-bottom: var(--space-4);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

@media (max-width: 480px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
  margin-bottom: var(--space-1);
}

label.required::after {
  content: ' *';
  color: var(--error-500);
}

input,
select,
textarea {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  color: var(--text-primary);
  background: var(--bg-primary);
  transition: border-color 0.2s, box-shadow 0.2s;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

input.error,
select.error {
  border-color: var(--error-500);
}

.error-text {
  display: block;
  font-size: var(--text-sm);
  color: var(--error-500);
  margin-top: var(--space-1);
}

.help-text {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: var(--space-1);
}

.info-text {
  background: var(--info-50);
  color: var(--info-700);
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-4);
  font-size: var(--text-sm);
}

/* Review Section */
.review-section {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}

.review-section h3 {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

.review-grid {
  display: grid;
  gap: var(--space-2);
}

.review-item {
  display: flex;
  gap: var(--space-2);
}

.review-item .label {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  min-width: 100px;
}

.review-item .value {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

.terms-checkbox {
  margin-top: var(--space-6);
}

.terms-checkbox label {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  cursor: pointer;
}

.terms-checkbox input {
  width: auto;
  margin-top: 2px;
}

.terms-checkbox span {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* Verification */
.verification-info {
  text-align: center;
  margin-bottom: var(--space-6);
}

.verification-info .icon {
  font-size: 48px;
  margin-bottom: var(--space-3);
}

.verification-info p {
  color: var(--text-secondary);
  margin: 0;
}

.verification-info .email {
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-top: var(--space-1);
}

.verification-code {
  max-width: 200px;
  margin: 0 auto var(--space-4);
}

.code-input {
  text-align: center;
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  letter-spacing: 0.3em;
  text-transform: uppercase;
}

.resend-btn {
  display: block;
  margin: 0 auto;
  background: none;
  border: none;
  color: var(--primary-500);
  font-size: var(--text-sm);
  cursor: pointer;
}

.resend-btn:disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
}

/* Success Step */
.success-step {
  text-align: center;
}

.success-icon {
  font-size: 64px;
  margin-bottom: var(--space-4);
}

.success-info {
  background: var(--success-50);
  color: var(--success-700);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-6);
}

.success-info p {
  margin: var(--space-1) 0;
}

.next-steps {
  text-align: left;
  margin-bottom: var(--space-6);
}

.next-steps h3 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-3);
}

.next-steps ol {
  padding-left: var(--space-5);
}

.next-steps li {
  margin-bottom: var(--space-2);
  color: var(--text-secondary);
}

.action-buttons {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
}

/* Navigation Buttons */
.navigation-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-8);
  padding-top: var(--space-6);
  border-top: 1px solid var(--border-default);
}

.back-btn {
  padding: var(--space-3) var(--space-5);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  cursor: pointer;
}

.next-btn,
.submit-btn,
.verify-btn,
.primary-btn {
  padding: var(--space-3) var(--space-6);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-weight: var(--font-semibold);
  cursor: pointer;
  margin-left: auto;
}

.next-btn:disabled,
.submit-btn:disabled,
.verify-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.secondary-btn {
  padding: var(--space-3) var(--space-5);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  text-decoration: none;
}
</style>
