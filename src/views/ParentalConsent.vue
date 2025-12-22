<template>
  <div class="parental-consent">
    <div class="page-header">
      <div class="header-icon">👨‍👩‍👧‍👦</div>
      <h1>Parental Consent Form</h1>
      <p class="subtitle">ใบยินยอมผู้ปกครองสำหรับการใช้งานระบบ HOTS AI</p>
    </div>

    <!-- Student Info Card -->
    <div class="info-card">
      <h3>📋 Student Information / ข้อมูลนักเรียน</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">Student Name / ชื่อนักเรียน:</span>
          <span class="value">{{ studentData.displayName }}</span>
        </div>
        <div class="info-item">
          <span class="label">Student ID / รหัสนักเรียน:</span>
          <span class="value">{{ studentData.studentId }}</span>
        </div>
        <div class="info-item">
          <span class="label">Grade / ระดับชั้น:</span>
          <span class="value">{{ studentData.grade }} / {{ studentData.section }}</span>
        </div>
        <div class="info-item">
          <span class="label">School / โรงเรียน:</span>
          <span class="value">{{ studentData.schoolName || 'N/A' }}</span>
        </div>
      </div>
    </div>

    <!-- Consent Form -->
    <div class="consent-form">
      <h2>📄 Consent Agreement / ข้อตกลงการยินยอม</h2>
      
      <div class="consent-sections">
        <!-- Section 1: Platform Usage -->
        <div class="consent-section">
          <h3>1. การใช้งานแพลตฟอร์ม (Platform Usage)</h3>
          <p>
            ข้าพเจ้ายินยอมให้บุตร/หลานของข้าพเจ้าใช้งานระบบ HOTS AI ChatLoop 
            เพื่อประเมินทักษะการคิดขั้นสูงผ่านระบบ AI
          </p>
          <p class="english">
            I consent to allow my child to use the HOTS AI ChatLoop system 
            for assessing higher-order thinking skills through AI.
          </p>
          <label class="checkbox-container">
            <input type="checkbox" v-model="consent.platformUsage" />
            <span class="checkmark"></span>
            <span>ยินยอม / I Consent</span>
          </label>
        </div>

        <!-- Section 2: Data Collection -->
        <div class="consent-section">
          <h3>2. การเก็บรวบรวมข้อมูล (Data Collection)</h3>
          <p>
            ระบบจะเก็บรวบรวมข้อมูลต่อไปนี้จากการใช้งานของนักเรียน:
          </p>
          <ul>
            <li>คำตอบและการประเมินทักษะ HOTS (Assessment responses)</li>
            <li>ความก้าวหน้าในการเรียนรู้ (Learning progress)</li>
            <li>บันทึกการใช้งาน (Activity logs)</li>
          </ul>
          <p class="data-purpose">
            <strong>วัตถุประสงค์:</strong> เพื่อพัฒนาการเรียนรู้ของนักเรียนและปรับปรุงระบบ
          </p>
          <label class="checkbox-container">
            <input type="checkbox" v-model="consent.dataCollection" />
            <span class="checkmark"></span>
            <span>ยินยอม / I Consent</span>
          </label>
        </div>

        <!-- Section 3: AI Assessment -->
        <div class="consent-section">
          <h3>3. การประเมินโดย AI (AI-Powered Assessment)</h3>
          <p>
            คำตอบของนักเรียนจะถูกประเมินโดยระบบ AI (GPT-4) ซึ่ง:
          </p>
          <ul>
            <li>ให้คะแนนตามเกณฑ์ A.R.C.E. (การวิเคราะห์, การให้เหตุผล, ความคิดสร้างสรรค์, หลักฐาน)</li>
            <li>ให้ข้อเสนอแนะเพื่อพัฒนา</li>
            <li>ครูผู้สอนสามารถทบทวนและปรับแก้ผลการประเมินได้</li>
          </ul>
          <label class="checkbox-container">
            <input type="checkbox" v-model="consent.aiAssessment" />
            <span class="checkmark"></span>
            <span>ยินยอม / I Consent</span>
          </label>
        </div>

        <!-- Section 4: Research Participation (Optional) -->
        <div class="consent-section optional">
          <h3>4. การเข้าร่วมงานวิจัย (Research Participation - Optional)</h3>
          <div class="optional-badge">ไม่บังคับ / Optional</div>
          <p>
            ข้อมูลที่ไม่ระบุตัวตน (Anonymized) อาจถูกนำไปใช้ในการวิจัยเชิงการศึกษา
            เพื่อพัฒนาระบบประเมินด้วย AI โดย:
          </p>
          <ul>
            <li>ข้อมูลจะถูกทำให้ไม่สามารถระบุตัวตนได้</li>
            <li>ไม่เปิดเผยชื่อหรือข้อมูลส่วนบุคคลในงานวิจัย</li>
            <li>สามารถถอนความยินยอมได้ตลอดเวลา</li>
          </ul>
          <label class="checkbox-container">
            <input type="checkbox" v-model="consent.researchParticipation" />
            <span class="checkmark"></span>
            <span>ยินยอมให้ใช้ข้อมูลเพื่อการวิจัย / I Consent to Research Use</span>
          </label>
        </div>
      </div>

      <!-- Parent/Guardian Information -->
      <div class="parent-info-section">
        <h3>👤 Parent/Guardian Information / ข้อมูลผู้ปกครอง</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>ชื่อผู้ปกครอง / Parent Name *</label>
            <input 
              type="text" 
              v-model="parentInfo.name" 
              placeholder="ชื่อ-นามสกุล"
              required
            />
          </div>
          <div class="form-group">
            <label>ความสัมพันธ์ / Relationship *</label>
            <select v-model="parentInfo.relationship" required>
              <option value="">-- เลือก --</option>
              <option value="father">บิดา / Father</option>
              <option value="mother">มารดา / Mother</option>
              <option value="guardian">ผู้ปกครอง / Legal Guardian</option>
              <option value="other">อื่นๆ / Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>เบอร์โทรศัพท์ / Phone *</label>
            <input 
              type="tel" 
              v-model="parentInfo.phone" 
              placeholder="0xx-xxx-xxxx"
              required
            />
          </div>
          <div class="form-group">
            <label>อีเมล / Email</label>
            <input 
              type="email" 
              v-model="parentInfo.email" 
              placeholder="email@example.com"
            />
          </div>
        </div>
      </div>

      <!-- Rights Information -->
      <div class="rights-section">
        <h3>⚖️ สิทธิของท่าน / Your Rights</h3>
        <ul>
          <li>
            <strong>สิทธิในการเข้าถึง:</strong> 
            ท่านสามารถขอดูข้อมูลของบุตร/หลานได้ตลอดเวลา
          </li>
          <li>
            <strong>สิทธิในการแก้ไข:</strong> 
            ท่านสามารถขอแก้ไขข้อมูลที่ไม่ถูกต้องได้
          </li>
          <li>
            <strong>สิทธิในการลบ:</strong> 
            ท่านสามารถขอลบข้อมูลได้ (อาจส่งผลต่อการใช้งานระบบ)
          </li>
          <li>
            <strong>สิทธิในการถอนความยินยอม:</strong> 
            ท่านสามารถถอนความยินยอมได้ตลอดเวลาโดยติดต่อโรงเรียน
          </li>
        </ul>
      </div>

      <!-- Digital Signature -->
      <div class="signature-section">
        <h3>✍️ Digital Signature / ลงนามอิเล็กทรอนิกส์</h3>
        <div class="signature-box">
          <label class="checkbox-container large">
            <input 
              type="checkbox" 
              v-model="consent.digitalSignature" 
            />
            <span class="checkmark"></span>
            <span class="signature-text">
              ข้าพเจ้าขอรับรองว่าข้อมูลข้างต้นเป็นความจริงและยินยอมตามข้อตกลง
              <br/>
              I certify that the above information is true and I agree to the terms.
            </span>
          </label>
        </div>
        <div class="signature-date">
          <span>วันที่ / Date: {{ today }}</span>
        </div>
      </div>

      <!-- Submit Button -->
      <div class="submit-section">
        <button 
          class="btn btn-primary btn-large"
          :disabled="!canSubmit"
          @click="submitConsent"
        >
          {{ submitting ? 'กำลังส่ง...' : 'ยืนยันและส่งใบยินยอม' }}
        </button>
        <p class="submit-note">
          เมื่อกดยืนยัน ระบบจะบันทึกความยินยอมและนักเรียนสามารถเริ่มใช้งานได้
        </p>
      </div>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccess" class="modal-overlay">
      <div class="modal-content success">
        <div class="success-icon">✅</div>
        <h2>บันทึกความยินยอมสำเร็จ!</h2>
        <p>ขอบคุณสำหรับความยินยอม</p>
        <p>นักเรียนสามารถเริ่มใช้งานระบบได้แล้ว</p>
        <button class="btn btn-primary" @click="$router.push('/student')">
          เริ่มใช้งาน
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const studentData = ref({
  displayName: '',
  studentId: '',
  grade: '',
  section: '',
  schoolName: ''
})

const consent = ref({
  platformUsage: false,
  dataCollection: false,
  aiAssessment: false,
  researchParticipation: false,
  digitalSignature: false
})

const parentInfo = ref({
  name: '',
  relationship: '',
  phone: '',
  email: ''
})

const submitting = ref(false)
const showSuccess = ref(false)

const today = computed(() => {
  return new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const canSubmit = computed(() => {
  return (
    consent.value.platformUsage &&
    consent.value.dataCollection &&
    consent.value.aiAssessment &&
    consent.value.digitalSignature &&
    parentInfo.value.name &&
    parentInfo.value.relationship &&
    parentInfo.value.phone
  )
})

onMounted(async () => {
  await fetchStudentData()
})

async function fetchStudentData() {
  try {
    const userDoc = await getDoc(doc(db, 'users', authStore.user.uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      studentData.value = {
        displayName: data.displayName || authStore.user.displayName,
        studentId: data.studentId || 'N/A',
        grade: data.grade || 'N/A',
        section: data.section || '',
        schoolName: data.schoolName || ''
      }
    }
  } catch (error) {
    console.error('Error fetching student data:', error)
  }
}

async function submitConsent() {
  if (!canSubmit.value) return
  
  submitting.value = true
  
  try {
    await updateDoc(doc(db, 'users', authStore.user.uid), {
      parentalConsent: {
        platformUsage: consent.value.platformUsage,
        dataCollection: consent.value.dataCollection,
        aiAssessment: consent.value.aiAssessment,
        researchParticipation: consent.value.researchParticipation,
        parentName: parentInfo.value.name,
        parentRelationship: parentInfo.value.relationship,
        parentPhone: parentInfo.value.phone,
        parentEmail: parentInfo.value.email,
        consentDate: new Date().toISOString(),
        ipAddress: await getClientIP()
      },
      consentGiven: true,
      consentGivenAt: serverTimestamp()
    })
    
    showSuccess.value = true
    
  } catch (error) {
    console.error('Error submitting consent:', error)
    alert('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง')
  } finally {
    submitting.value = false
  }
}

async function getClientIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip
  } catch {
    return 'unknown'
  }
}
</script>

<style scoped>
.parental-consent {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  background: var(--bg-primary);
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.header-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.page-header h1 {
  margin: 0;
  color: var(--primary-color);
}

.subtitle {
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.info-card {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  border-left: 4px solid var(--primary-color);
}

.info-card h3 {
  margin: 0 0 1rem 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-item .label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.info-item .value {
  font-weight: 600;
  font-size: 1.1rem;
}

.consent-form {
  background: var(--card-bg);
  padding: 2rem;
  border-radius: 12px;
}

.consent-form h2 {
  margin: 0 0 1.5rem 0;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--border-color);
}

.consent-section {
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 1.5rem;
  position: relative;
}

.consent-section.optional {
  border: 2px dashed var(--border-color);
}

.optional-badge {
  position: absolute;
  top: -10px;
  right: 20px;
  background: var(--warning-color);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.consent-section h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.consent-section p {
  margin: 0 0 1rem 0;
  line-height: 1.6;
}

.consent-section .english {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-style: italic;
}

.consent-section ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.consent-section li {
  margin-bottom: 0.5rem;
}

.data-purpose {
  background: var(--primary-bg);
  padding: 0.75rem;
  border-radius: 4px;
  color: var(--primary-color);
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.75rem;
  background: var(--card-bg);
  border-radius: 8px;
  border: 2px solid var(--border-color);
  transition: all 0.2s;
}

.checkbox-container:hover {
  border-color: var(--primary-color);
}

.checkbox-container input {
  display: none;
}

.checkmark {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  position: relative;
  flex-shrink: 0;
}

.checkbox-container input:checked + .checkmark {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.checkbox-container input:checked + .checkmark::after {
  content: '✓';
  position: absolute;
  color: white;
  font-weight: bold;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.parent-info-section,
.rights-section,
.signature-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
}

.parent-info-section h3,
.rights-section h3,
.signature-section h3 {
  margin: 0 0 1.5rem 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group select {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--card-bg);
}

.rights-section ul {
  list-style: none;
  padding: 0;
}

.rights-section li {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 0.75rem;
}

.signature-box {
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid var(--border-color);
}

.checkbox-container.large {
  padding: 1rem;
}

.signature-text {
  line-height: 1.6;
}

.signature-date {
  margin-top: 1rem;
  text-align: right;
  color: var(--text-secondary);
}

.submit-section {
  margin-top: 2rem;
  text-align: center;
}

.btn-large {
  padding: 1rem 3rem;
  font-size: 1.1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-note {
  margin-top: 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  max-width: 400px;
}

.modal-content.success {
  border-top: 4px solid var(--success-color);
}

.success-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.modal-content h2 {
  margin: 0 0 1rem 0;
  color: var(--success-color);
}

.modal-content p {
  margin: 0.5rem 0;
  color: var(--text-secondary);
}

.modal-content .btn {
  margin-top: 1.5rem;
}

@media (max-width: 768px) {
  .info-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
