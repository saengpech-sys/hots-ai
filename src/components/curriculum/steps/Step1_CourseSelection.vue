<template>
  <div class="step-content">
    <!-- Animated Background -->
    <div class="step-bg-effects">
      <div class="floating-orb orb-1"></div>
      <div class="floating-orb orb-2"></div>
    </div>

    <div class="step-header">
      <h2>📚 เลือกรายวิชา</h2>
      <p>เลือกรายวิชาที่ต้องการสร้างหลักสูตร AI จะวิเคราะห์คำอธิบายรายวิชาและ Learning Outcomes ทั้งหมด</p>
    </div>

    <div class="course-selection">
      <div class="form-group">
        <label>รายวิชา <span class="required">*</span></label>
        <select v-model="localSelectedCourseId" class="form-control" @change="onCourseSelect">
          <option value="">-- เลือกรายวิชา --</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.courseCode }} - {{ course.courseName }}
          </option>
        </select>
      </div>

      <!-- Loading Curriculum -->
      <div v-if="loadingCurriculum" class="loading-curriculum">
        <div class="spinner"></div>
        <span>กำลังโหลด Curriculum...</span>
      </div>

      <!-- Existing Curriculum Notice -->
      <div v-else-if="hasExistingCurriculum && selectedCourse" class="existing-curriculum-notice">
        <div class="notice-content">
          <span class="material-icons notice-icon">history</span>
          <div class="notice-text">
            <strong>พบ Curriculum ที่สร้างไว้แล้ว</strong>
            <p>ขั้นตอนปัจจุบัน: {{ steps[currentStep]?.title || 'เริ่มต้น' }} | หน่วย: {{ units.length }} หน่วย</p>
          </div>
        </div>
        <div class="notice-actions">
          <button class="btn btn-outline-primary" @click="$emit('continue')">
            <span class="material-icons">play_arrow</span>
            ทำต่อ
          </button>
          <button class="btn btn-outline-danger" @click="$emit('reset')">
            <span class="material-icons">refresh</span>
            เริ่มใหม่
          </button>
        </div>
      </div>

      <!-- Course Preview -->
      <div v-if="selectedCourse" class="course-preview card">
        <div class="preview-header">
          <h3>{{ selectedCourse.courseCode }} {{ selectedCourse.courseName }}</h3>
          <span class="grade-badge">{{ selectedCourse.gradeLevel || 'ม.4' }}</span>
        </div>
        
        <!-- คำอธิบายรายวิชา -->
        <div class="preview-section">
          <h4>📝 คำอธิบายรายวิชา <span class="required">*</span></h4>
          
          <div v-if="!courseDescription || courseDescription.length < 50" class="description-warning">
            <span class="material-icons">warning</span>
            <span>คำอธิบายรายวิชาสำคัญมากสำหรับการสร้างหลักสูตรคุณภาพ กรุณาระบุรายละเอียดให้ครบถ้วน</span>
          </div>
          
          <div v-if="!editingDescription">
            <p v-if="courseDescription" class="description">{{ courseDescription }}</p>
            <p v-else class="description empty-text">ยังไม่มีคำอธิบายรายวิชา</p>
            <button class="btn btn-outline btn-sm" @click="$emit('start-edit-description')">
              <span class="material-icons">edit</span>
              {{ courseDescription ? 'แก้ไขคำอธิบาย' : 'เพิ่มคำอธิบาย' }}
            </button>
          </div>
          
          <!-- ฟอร์มแก้ไขคำอธิบาย -->
          <div v-else class="description-edit-form">
            <textarea 
              v-model="localEditedDescription" 
              class="form-control description-textarea"
              placeholder="อธิบายรายละเอียดของรายวิชา เช่น&#10;- เนื้อหาหลักที่จะเรียน&#10;- ทักษะที่นักเรียนจะได้รับ&#10;- ความสัมพันธ์กับวิชาอื่น&#10;- การนำไปใช้ในชีวิตจริง"
              rows="5"
            ></textarea>
            <div class="char-counter" :class="{ 'warning': localEditedDescription.length < 50, 'good': localEditedDescription.length >= 100 }">
              {{ localEditedDescription.length }} ตัวอักษร (แนะนำ 100+ ตัวอักษร)
            </div>
            <div class="edit-actions">
              <button class="btn btn-primary" @click="saveDescription" :disabled="!localEditedDescription.trim()">
                <span class="material-icons">save</span> บันทึก
              </button>
              <button class="btn btn-outline" @click="$emit('cancel-edit-description')">ยกเลิก</button>
            </div>
          </div>
        </div>

        <!-- Learning Outcomes -->
        <div class="preview-section">
          <h4>🎯 Learning Outcomes ({{ selectedCourse.learningOutcomes?.length || 0 }})</h4>
          <div v-if="selectedCourse.learningOutcomes?.length" class="lo-list">
            <div v-for="lo in selectedCourse.learningOutcomes" :key="lo.code" class="lo-item">
              <span class="lo-code">{{ lo.code }}</span>
              <span class="lo-desc">{{ lo.description }}</span>
            </div>
          </div>
          <p v-else class="empty-text">ยังไม่มี Learning Outcomes</p>
        </div>

        <!-- ข้อมูลเพิ่มเติม -->
        <div class="preview-section">
          <h4>⚙️ ข้อมูลเพิ่มเติม</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">กลุ่มสาระ</span>
              <span class="value">{{ selectedCourse.subjectGroup || 'ไม่ระบุ' }}</span>
            </div>
            <div class="info-item">
              <span class="label">หน่วยกิต</span>
              <span v-if="selectedCourse.credits" class="value">{{ selectedCourse.credits }} น.ก.</span>
              <span v-else class="value not-set">ยังไม่กำหนด</span>
            </div>
            <div class="info-item">
              <span class="label">เวลาเรียน</span>
              <span v-if="selectedCourse.totalHours" class="value">{{ selectedCourse.totalHours }} ชม./ภาคเรียน</span>
              <span v-else class="value not-set">ยังไม่กำหนด</span>
            </div>
          </div>
          
          <div v-if="!selectedCourse.credits || !selectedCourse.totalHours" class="set-credits-section">
            <p class="hint-text">💡 กรุณากำหนดหน่วยกิตและเวลาเรียนเพื่อให้ AI คำนวณจำนวนหน่วยและแผนได้แม่นยำ</p>
            <div class="credits-form">
              <div class="form-group-inline">
                <label>หน่วยกิต:</label>
                <select v-model="localTempCredits" class="form-control small">
                  <option value="">เลือก</option>
                  <option value="0.5">0.5 น.ก.</option>
                  <option value="1.0">1.0 น.ก.</option>
                  <option value="1.5">1.5 น.ก.</option>
                  <option value="2.0">2.0 น.ก.</option>
                  <option value="2.5">2.5 น.ก.</option>
                  <option value="3.0">3.0 น.ก.</option>
                </select>
              </div>
              <div class="form-group-inline">
                <label>ชั่วโมง:</label>
                <select v-model="localTempTotalHours" class="form-control small">
                  <option value="">เลือก</option>
                  <option value="20">20 ชม.</option>
                  <option value="40">40 ชม.</option>
                  <option value="60">60 ชม.</option>
                  <option value="80">80 ชม.</option>
                  <option value="120">120 ชม.</option>
                </select>
              </div>
              <button class="btn btn-sm btn-primary" @click="saveCreditsAndHours" :disabled="!localTempCredits && !localTempTotalHours">
                <span class="material-icons">save</span>
                บันทึก
              </button>
            </div>
          </div>
        </div>
        
        <!-- คำแนะนำจำนวนหน่วย -->
        <div class="preview-section units-recommendation">
          <h4>📊 การแนะนำจำนวนหน่วย</h4>
          <div class="recommendation-info">
            <div class="recommendation-item">
              <span class="rec-label">จำนวนคาบรวม</span>
              <span class="rec-value">{{ totalPeriods }} คาบ</span>
            </div>
            <div class="recommendation-item highlight">
              <span class="rec-label">หน่วยการเรียนรู้แนะนำ</span>
              <span class="rec-value">{{ recommendedUnits.min }}-{{ recommendedUnits.max }} หน่วย</span>
            </div>
            <div class="recommendation-item">
              <span class="rec-label">แผนต่อหน่วย</span>
              <span class="rec-value">4-8 แผน</span>
            </div>
          </div>
          <p class="recommendation-note">
            💡 <strong>เคล็ดลับ:</strong> หน่วยการเรียนรู้ที่มี 4-8 แผน จะทำให้ AI สร้างเนื้อหาได้ครบถ้วนและมีคุณภาพ
          </p>
        </div>
      </div>
    </div>

    <div class="step-actions">
      <button 
        class="btn btn-primary btn-lg"
        :disabled="!selectedCourse || !selectedCourse.learningOutcomes?.length"
        @click="$emit('next')"
      >
        ถัดไป: สร้างโครงสร้างรายวิชา
        <span class="material-icons">arrow_forward</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// Props
const props = defineProps({
  courses: { type: Array, default: () => [] },
  selectedCourseId: { type: String, default: '' },
  selectedCourse: { type: Object, default: null },
  loadingCurriculum: { type: Boolean, default: false },
  hasExistingCurriculum: { type: Boolean, default: false },
  units: { type: Array, default: () => [] },
  steps: { type: Array, default: () => [] },
  currentStep: { type: Number, default: 0 },
  courseDescription: { type: String, default: '' },
  editingDescription: { type: Boolean, default: false },
  editedDescription: { type: String, default: '' },
  tempCredits: { type: String, default: '' },
  tempTotalHours: { type: String, default: '' }
})

// Emits
const emit = defineEmits([
  'update:selectedCourseId',
  'update:editedDescription',
  'update:tempCredits',
  'update:tempTotalHours',
  'course-select',
  'continue',
  'reset',
  'start-edit-description',
  'save-description',
  'cancel-edit-description',
  'save-credits-hours',
  'next'
])

// Local state with v-model binding
const localSelectedCourseId = computed({
  get: () => props.selectedCourseId,
  set: (val) => emit('update:selectedCourseId', val)
})

const localEditedDescription = computed({
  get: () => props.editedDescription,
  set: (val) => emit('update:editedDescription', val)
})

const localTempCredits = computed({
  get: () => props.tempCredits,
  set: (val) => emit('update:tempCredits', val)
})

const localTempTotalHours = computed({
  get: () => props.tempTotalHours,
  set: (val) => emit('update:tempTotalHours', val)
})

// Computed
const totalPeriods = computed(() => {
  if (!props.selectedCourse) return 0
  const hours = props.selectedCourse.totalHours || 40
  return Math.round(hours)
})

const recommendedUnits = computed(() => {
  const periods = totalPeriods.value
  const min = Math.max(2, Math.ceil(periods / 8))
  const max = Math.max(3, Math.ceil(periods / 4))
  return { min, max }
})

// Methods
function onCourseSelect() {
  emit('course-select', localSelectedCourseId.value)
}

function saveDescription() {
  emit('save-description', localEditedDescription.value)
}

function saveCreditsAndHours() {
  emit('save-credits-hours', {
    credits: localTempCredits.value,
    totalHours: localTempTotalHours.value
  })
}
</script>

<style scoped>
@import './step-styles.css';

/* Step 1 Specific Styles */
.step-content {
  position: relative;
  padding: 2rem;
  animation: stepFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes stepFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Background Effects */
.step-bg-effects {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.floating-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.3;
}

.orb-1 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #a855f7, #ec4899);
  top: -100px;
  right: -100px;
  animation: floatOrb 20s ease-in-out infinite;
}

.orb-2 {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  bottom: -50px;
  left: -50px;
  animation: floatOrb 15s ease-in-out infinite reverse;
}

@keyframes floatOrb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, -30px) scale(1.1); }
}

/* Course Selection */
.course-selection {
  max-width: 900px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* Loading Curriculum */
.loading-curriculum {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 12px;
  margin-bottom: 1.5rem;
  color: rgba(255, 255, 255, 0.8);
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(168, 85, 247, 0.2);
  border-top-color: #a855f7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Notice Icon */
.notice-icon {
  font-size: 2.5rem;
  color: #a855f7;
  filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.5));
}

/* Preview Header */
.preview-header {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(236, 72, 153, 0.2) 100%);
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.preview-header h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

/* Description Edit Form */
.description-edit-form {
  margin-top: 1rem;
}

.description-textarea {
  min-height: 140px;
  resize: vertical;
  line-height: 1.7;
  background-image: none !important;
  padding-right: 1.25rem !important;
}

.char-counter {
  font-size: 0.85rem;
  margin-top: 0.5rem;
  color: rgba(255, 255, 255, 0.5);
}

.char-counter.warning {
  color: #f59e0b;
}

.char-counter.good {
  color: #10b981;
}

/* Set Credits Section */
.set-credits-section {
  margin-top: 1.25rem;
  padding: 1.25rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
}

.hint-text {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1rem;
}

.credits-form {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
}

.form-group-inline {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group-inline label {
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0;
}

/* Units Recommendation */
.units-recommendation {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%);
}

.recommendation-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.recommendation-item {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.recommendation-item:hover {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
}

.recommendation-item.highlight {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
}

.rec-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  display: block;
  margin-bottom: 0.35rem;
}

.rec-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: #10b981;
}

.recommendation-item.highlight .rec-value {
  background: linear-gradient(135deg, #10b981, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.recommendation-note {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
}

/* Responsive */
@media (max-width: 768px) {
  .recommendation-info {
    grid-template-columns: 1fr;
  }
  
  .credits-form {
    flex-direction: column;
  }
}
</style>
