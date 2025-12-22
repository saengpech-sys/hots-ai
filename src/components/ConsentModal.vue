<template>
  <div v-if="show" class="consent-modal-overlay" @click.self="closeIfNotRequired">
    <div class="consent-modal-card">
      <div class="consent-header">
        <h2>🔒 การให้ความยินยอมและนโยบายความเป็นส่วนตัว</h2>
        <p class="consent-subtitle">ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</p>
      </div>

      <div class="consent-body">
        <div class="consent-section">
          <h3>📋 วัตถุประสงค์การเก็บรวบรวมข้อมูล</h3>
          <p>ระบบ HOTS AI ChatLoop เก็บรวบรวมข้อมูลของท่านเพื่อ:</p>
          <ul>
            <li>ประเมินและพัฒนาทักษะการคิดขั้นสูง (Higher-Order Thinking Skills)</li>
            <li>วิเคราะห์ความก้าวหน้าในการเรียนรู้และจัดทำรายงาน</li>
            <li>ปรับปรุงคุณภาพการเรียนการสอนด้วยปัญญาประดิษฐ์</li>
            <li>แชร์ข้อมูลกับครูและผู้ปกครอง (เฉพาะข้อมูลทางการศึกษา)</li>
          </ul>
        </div>

        <div class="consent-section">
          <h3>🔐 ข้อมูลที่เก็บรวบรวม</h3>
          <ul>
            <li><strong>ข้อมูลพื้นฐาน:</strong> ชื่อ-นามสกุล อีเมล รหัสนักเรียน ห้องเรียน</li>
            <li><strong>ข้อมูลการเรียน:</strong> คำตอบ คะแนนประเมิน ผลการเรียน ความคืบหน้า LO</li>
            <li><strong>ข้อมูลเทคนิค:</strong> IP Address, Session logs, การใช้งานระบบ</li>
          </ul>
        </div>

        <div class="consent-section">
          <h3>👥 การแบ่งปันข้อมูล</h3>
          <p>ข้อมูลของท่านจะถูกแบ่งปันกับ:</p>
          <ul>
            <li>ครูผู้สอนในรายวิชาที่ท่านลงทะเบียน</li>
            <li>ผู้ปกครอง (ผ่าน Parent Access Code)</li>
            <li>ผู้บริหารโรงเรียนและเขตพื้นที่การศึกษา (ข้อมูลรวม ไม่ระบุตัวตน)</li>
            <li><strong>ไม่มีการขายหรือโอนข้อมูลให้บุคคลภายนอก</strong></li>
          </ul>
        </div>

        <div class="consent-section highlight-box">
          <h3>⚖️ สิทธิของท่าน</h3>
          <p>ท่านมีสิทธิ์ตามกฎหมาย PDPA ดังนี้:</p>
          <ul>
            <li><strong>เข้าถึง:</strong> ดูและดาวน์โหลดข้อมูลของท่านได้ตลอดเวลา</li>
            <li><strong>แก้ไข:</strong> ขอแก้ไขข้อมูลที่ไม่ถูกต้อง</li>
            <li><strong>ลบข้อมูล:</strong> ขอลบบัญชีและข้อมูลทั้งหมด (ภายใน 30 วัน)</li>
            <li><strong>คัดค้าน:</strong> คัดค้านการประมวลผลข้อมูลบางอย่าง</li>
            <li><strong>ถอนความยินยอม:</strong> สามารถถอนความยินยอมได้ทุกเมื่อ</li>
          </ul>
        </div>

        <div v-if="userRole === 'student'" class="consent-section warning-box">
          <h3>👨‍👩‍👧‍👦 สำหรับนักเรียนที่อายุต่ำกว่า 20 ปี</h3>
          <p>หากท่านอายุต่ำกว่า 20 ปี กรุณาให้ <strong>ผู้ปกครอง</strong> อ่านและให้ความยินยอมแทนท่าน หรือแจ้ง Parent Access Code ให้ผู้ปกครองเข้าตรวจสอบข้อมูลได้</p>
        </div>

        <div class="consent-section">
          <h3>📞 ติดต่อเรา</h3>
          <p>หากมีคำถามหรือต้องการใช้สิทธิ์ กรุณาติดต่อ:</p>
          <p><strong>เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO)</strong></p>
          <p>อีเมล: <a href="mailto:dpo@hots-ai.edu">dpo@hots-ai.edu</a></p>
        </div>

        <!-- Research Consent Section - IRB Ready -->
        <div class="consent-section research-box">
          <h3>🔬 การยินยอมสำหรับการวิจัย (Research Consent)</h3>
          <p>ข้อมูลจากการประเมินของท่านอาจถูกใช้เพื่อการวิจัยทางการศึกษา โดย:</p>
          <ul>
            <li>ข้อมูลจะถูก <strong>ลบชื่อและตัวระบุตัวตน (Anonymization)</strong> ก่อนนำไปวิเคราะห์</li>
            <li>ผลการวิจัยจะเผยแพร่ในรูปแบบสถิติรวมเท่านั้น ไม่สามารถระบุตัวบุคคลได้</li>
            <li>การวิจัยผ่านการพิจารณาจากคณะกรรมการจริยธรรมการวิจัย (IRB)</li>
            <li>ท่านสามารถ <strong>ปฏิเสธ</strong> การใช้ข้อมูลเพื่อการวิจัยได้โดยไม่กระทบการใช้งานระบบ</li>
          </ul>
          
          <div class="research-options">
            <label class="consent-checkbox-label">
              <input 
                type="checkbox" 
                v-model="researchConsent" 
                class="consent-checkbox"
              />
              <span class="consent-text-optional">
                (ไม่บังคับ) ยินยอมให้ใช้ข้อมูลที่ไม่ระบุตัวตนเพื่อการวิจัยทางการศึกษา
              </span>
            </label>
            
            <label class="consent-checkbox-label">
              <input 
                type="checkbox" 
                v-model="longitudinalConsent" 
                class="consent-checkbox"
                :disabled="!researchConsent"
              />
              <span class="consent-text-optional" :class="{ disabled: !researchConsent }">
                (ไม่บังคับ) ยินยอมให้ติดตามพัฒนาการระยะยาว (Longitudinal Study)
              </span>
            </label>
          </div>
        </div>

        <div class="consent-section data-retention-box">
          <h3>📅 ระยะเวลาการเก็บรักษาข้อมูล</h3>
          <ul>
            <li><strong>ข้อมูลการใช้งาน:</strong> เก็บรักษาตลอดระยะเวลาที่ท่านใช้งานระบบ + 1 ปีการศึกษาหลังจากจบ</li>
            <li><strong>ข้อมูลการประเมิน:</strong> เก็บรักษา 5 ปีเพื่อการวิเคราะห์พัฒนาการ</li>
            <li><strong>ข้อมูลวิจัย (ไม่ระบุตัวตน):</strong> เก็บรักษาตลอดไปเพื่อการวิจัย</li>
            <li><strong>การลบข้อมูล:</strong> สามารถร้องขอลบได้ทุกเมื่อ (ดำเนินการภายใน 30 วัน)</li>
          </ul>
        </div>

        <div class="consent-checkbox-group">
          <label class="consent-checkbox-label">
            <input 
              type="checkbox" 
              v-model="consentGiven" 
              class="consent-checkbox"
            />
            <span class="consent-text">
              ข้าพเจ้าได้อ่านและเข้าใจนโยบายความเป็นส่วนตัว และยินยอมให้ระบบ HOTS AI ChatLoop 
              เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้าตามวัตถุประสงค์ที่ระบุข้างต้น
            </span>
          </label>
        </div>
      </div>

      <div class="consent-footer">
        <button 
          @click="handleAccept" 
          :disabled="!consentGiven"
          class="btn-accept"
        >
          ✅ ยอมรับและดำเนินการต่อ
        </button>
        <button 
          v-if="!required"
          @click="closeIfNotRequired" 
          class="btn-decline"
        >
          ปิด
        </button>
        <p v-if="required" class="required-notice">
          * จำเป็นต้องยอมรับเพื่อใช้งานระบบ
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: true
  },
  userRole: {
    type: String,
    default: 'student'
  }
})

const emit = defineEmits(['accept', 'close'])

const consentGiven = ref(false)
const researchConsent = ref(false)
const longitudinalConsent = ref(false)

function handleAccept() {
  if (!consentGiven.value) return
  emit('accept', {
    operationalConsent: true,
    researchConsent: researchConsent.value,
    longitudinalConsent: longitudinalConsent.value,
    consentTimestamp: new Date().toISOString(),
    consentVersion: '2.0-irb-ready'
  })
}

function closeIfNotRequired() {
  if (!props.required) {
    emit('close')
  }
}
</script>

<style scoped>
.consent-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  padding: 20px;
  overflow-y: auto;
}

.consent-modal-card {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.consent-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
  border-radius: 12px 12px 0 0;
}

.consent-header h2 {
  margin: 0 0 8px 0;
  font-size: 1.75rem;
}

.consent-subtitle {
  margin: 0;
  opacity: 0.95;
  font-size: 0.95rem;
}

.consent-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.consent-section {
  margin-bottom: 24px;
}

.consent-section h3 {
  color: #2d3748;
  font-size: 1.25rem;
  margin-bottom: 12px;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 8px;
}

.consent-section p {
  color: #4a5568;
  line-height: 1.6;
  margin-bottom: 8px;
}

.consent-section ul {
  color: #4a5568;
  line-height: 1.8;
  padding-left: 24px;
}

.consent-section li {
  margin-bottom: 8px;
}

.consent-section strong {
  color: #2d3748;
  font-weight: 600;
}

.highlight-box {
  background: #ebf8ff;
  border-left: 4px solid #3182ce;
  padding: 16px;
  border-radius: 8px;
}

.warning-box {
  background: #fff5f5;
  border-left: 4px solid #e53e3e;
  padding: 16px;
  border-radius: 8px;
}

.consent-checkbox-group {
  margin: 24px 0;
  padding: 20px;
  background: #f7fafc;
  border: 2px solid #cbd5e0;
  border-radius: 8px;
}

.consent-checkbox-label {
  display: flex;
  align-items: flex-start;
  cursor: pointer;
  user-select: none;
}

.consent-checkbox {
  margin-right: 12px;
  margin-top: 4px;
  width: 20px;
  height: 20px;
  cursor: pointer;
  flex-shrink: 0;
}

.consent-text {
  color: #2d3748;
  font-size: 1rem;
  line-height: 1.6;
  font-weight: 500;
}

.consent-text-optional {
  color: #4a5568;
  font-size: 0.95rem;
  line-height: 1.5;
}

.consent-text-optional.disabled {
  color: #a0aec0;
}

.research-box {
  background: linear-gradient(135deg, #ebf8ff 0%, #e6fffa 100%);
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #3182ce;
}

.research-options {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #90cdf4;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.data-retention-box {
  background: #faf5ff;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #805ad5;
}

.consent-footer {
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-accept {
  flex: 1;
  padding: 14px 24px;
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-accept:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(72, 187, 120, 0.4);
}

.btn-accept:disabled {
  background: #cbd5e0;
  cursor: not-allowed;
}

.btn-decline {
  padding: 14px 24px;
  background: #e2e8f0;
  color: #4a5568;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-decline:hover {
  background: #cbd5e0;
}

.required-notice {
  color: #e53e3e;
  font-size: 0.9rem;
  margin: 0;
  font-style: italic;
}

/* Dark Mode */
:global(.dark-mode) .consent-modal-card {
  background: #1a202c;
}

:global(.dark-mode) .consent-section h3 {
  color: #e2e8f0;
  border-bottom-color: #4a5568;
}

:global(.dark-mode) .consent-section p,
:global(.dark-mode) .consent-section ul {
  color: #cbd5e0;
}

:global(.dark-mode) .consent-section strong {
  color: #f7fafc;
}

:global(.dark-mode) .highlight-box {
  background: #2c5282;
  border-left-color: #63b3ed;
}

:global(.dark-mode) .warning-box {
  background: #742a2a;
  border-left-color: #fc8181;
}

:global(.dark-mode) .consent-checkbox-group {
  background: #2d3748;
  border-color: #4a5568;
}

:global(.dark-mode) .consent-text {
  color: #e2e8f0;
}

:global(.dark-mode) .consent-footer {
  border-top-color: #4a5568;
}

@media (max-width: 768px) {
  .consent-modal-card {
    margin: 0;
    border-radius: 0;
    max-height: 100vh;
  }

  .consent-header h2 {
    font-size: 1.5rem;
  }

  .consent-body {
    padding: 16px;
  }

  .consent-footer {
    flex-direction: column;
  }

  .btn-accept,
  .btn-decline {
    width: 100%;
  }
}
</style>
