<template>
  <div class="step-content step-structure">
    <!-- Animated Background -->
    <div class="step-bg-effects">
      <div class="floating-orb orb-1"></div>
      <div class="floating-orb orb-2"></div>
      <div class="floating-orb orb-3"></div>
    </div>

    <div class="step-header">
      <h2>🏗️ โครงสร้างรายวิชา</h2>
      <p>AI จะวิเคราะห์และสร้างโครงสร้างรายวิชาที่สอดคล้องกับ A.R.C.E. Framework</p>
    </div>

    <!-- Settings -->
    <div class="settings-card card">
      <h3><span class="material-icons">settings</span> ตั้งค่าการสร้าง</h3>
      <div class="settings-grid">
        <div class="form-group">
          <label>ภาคเรียน</label>
          <select v-model="localSettings.semester" class="form-control">
            <option :value="1">ภาคเรียนที่ 1</option>
            <option :value="2">ภาคเรียนที่ 2</option>
          </select>
        </div>
        <div class="form-group">
          <label>ปีการศึกษา</label>
          <select v-model="localSettings.academicYear" class="form-control">
            <option v-for="year in academicYears" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>จำนวนหน่วยกิต</label>
          <select v-model="localSettings.credits" class="form-control" @change="onCreditsChange">
            <option :value="0.5">0.5 หน่วยกิต (20 ชม.)</option>
            <option :value="1">1.0 หน่วยกิต (40 ชม.)</option>
            <option :value="1.5">1.5 หน่วยกิต (60 ชม.)</option>
            <option :value="2">2.0 หน่วยกิต (80 ชม.)</option>
          </select>
        </div>
        <div class="form-group">
          <label>จำนวนชั่วโมงรวม</label>
          <div class="auto-value">
            <span class="value-display">{{ localSettings.totalHours }} ชั่วโมง</span>
            <span class="auto-badge">คำนวณจากหน่วยกิต</span>
          </div>
        </div>
        
        <!-- Research: Intervention Type -->
        <div class="form-group full-width">
          <label>
            🔬 รูปแบบการสอน (สำหรับงานวิจัย)
            <span class="research-badge">Research Metadata</span>
          </label>
          <select v-model="localSettings.interventionType" class="form-control">
            <option v-for="type in interventionTypes" :key="type.id" :value="type.id">
              {{ type.name }} - {{ type.description }}
            </option>
          </select>
          <p class="hint">ข้อมูลนี้จะถูกบันทึกเพื่อใช้ในการวิเคราะห์ผลงานวิจัย</p>
        </div>
      </div>
    </div>

    <!-- Generate Button -->
    <div v-if="!courseStructure && !isGenerating" class="generate-section">
      <div class="generate-card">
        <div class="ai-glow-icon">
          <span class="material-icons">auto_awesome</span>
        </div>
        <h3>พร้อมสร้างโครงสร้างรายวิชา</h3>
        <p>AI จะวิเคราะห์ LO ทั้ง {{ loCount }} ตัว และออกแบบโครงสร้างที่เหมาะสม</p>
        <button class="btn btn-ai btn-xl" @click="$emit('generate')">
          <span class="material-icons">auto_awesome</span>
          สร้างโครงสร้างรายวิชาด้วย AI
        </button>
      </div>
    </div>

    <!-- Generating State -->
    <div v-if="isGenerating" class="generating-state card">
      <div class="generating-animation">
        <span class="ai-icon">🤖</span>
        <div class="pulse-ring"></div>
        <div class="pulse-ring delay-1"></div>
        <div class="pulse-ring delay-2"></div>
      </div>
      <h3>AI กำลังวิเคราะห์และออกแบบโครงสร้างรายวิชา...</h3>
      <p>{{ generatingText }}</p>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: generatingProgress + '%' }"></div>
      </div>
    </div>

    <!-- Structure Result -->
    <div v-if="courseStructure && !isGenerating" class="structure-result">
      <div class="result-header">
        <h3>✅ โครงสร้างรายวิชา</h3>
        <button class="btn btn-outline btn-sm" @click="$emit('regenerate')">
          <span class="material-icons">refresh</span>
          สร้างใหม่
        </button>
      </div>

      <!-- Overview -->
      <div class="structure-overview card">
        <h4>📊 ภาพรวม</h4>
        <div class="overview-grid">
          <div class="overview-item">
            <span class="overview-value">{{ courseStructure.totalUnits }}</span>
            <span class="overview-label">หน่วยการเรียนรู้</span>
          </div>
          <div class="overview-item">
            <span class="overview-value">{{ courseStructure.totalPlans }}</span>
            <span class="overview-label">แผนการจัดการเรียนรู้</span>
          </div>
          <div class="overview-item">
            <span class="overview-value">{{ localSettings.totalHours }}</span>
            <span class="overview-label">ชั่วโมงรวม</span>
          </div>
          <div class="overview-item research-item">
            <span class="overview-value">{{ getInterventionName(localSettings.interventionType) }}</span>
            <span class="overview-label">🔬 Intervention</span>
          </div>
        </div>
      </div>

      <!-- ARCE Strategy -->
      <div class="structure-section card">
        <h4>🎯 กลยุทธ์ A.R.C.E.</h4>
        <div class="arce-strategy">
          <div v-for="arce in courseStructure.arceStrategy" :key="arce.dimension" class="arce-item" :class="arce.dimension">
            <div class="arce-header">
              <span class="arce-icon">{{ arce.icon }}</span>
              <span class="arce-name">{{ arce.name }}</span>
              <span class="arce-weight">{{ arce.weight }}%</span>
            </div>
            <p class="arce-focus">{{ arce.focusAreas }}</p>
          </div>
        </div>
      </div>

      <!-- Units Preview -->
      <div class="structure-section card">
        <h4>📚 หน่วยการเรียนรู้ (Preview)</h4>
        <div class="units-preview">
          <div v-for="(unit, idx) in courseStructure.unitsPreview" :key="idx" class="unit-preview-item">
            <div class="unit-number">{{ idx + 1 }}</div>
            <div class="unit-info">
              <span class="unit-name">{{ unit.name }}</span>
              <span class="unit-meta">{{ unit.periods || unit.hours }} คาบ | {{ unit.plans }} แผน | LO: {{ unit.los.join(', ') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="step-actions">
      <button class="btn btn-outline" @click="$emit('prev')">
        <span class="material-icons">arrow_back</span>
        ย้อนกลับ
      </button>
      <button 
        v-if="courseStructure"
        class="btn btn-primary btn-lg" 
        @click="$emit('save-and-next')"
      >
        บันทึกและไปขั้นตอนถัดไป
        <span class="material-icons">arrow_forward</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  },
  courseStructure: {
    type: Object,
    default: null
  },
  isGenerating: {
    type: Boolean,
    default: false
  },
  generatingText: {
    type: String,
    default: ''
  },
  generatingProgress: {
    type: Number,
    default: 0
  },
  loCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits([
  'update:settings',
  'generate',
  'regenerate',
  'save-and-next',
  'prev'
])

// Local copy of settings for v-model
const localSettings = ref({ ...props.settings })

// Watch for external changes
watch(() => props.settings, (newVal) => {
  localSettings.value = { ...newVal }
}, { deep: true })

// Emit changes
watch(localSettings, (newVal) => {
  emit('update:settings', newVal)
}, { deep: true })

// Academic years
const currentYear = new Date().getFullYear() + 543
const academicYears = [currentYear, currentYear - 1, currentYear + 1]

// Intervention types for research
const interventionTypes = [
  { id: '5e', name: '5E Model', description: 'Engage-Explore-Explain-Elaborate-Evaluate' },
  { id: 'inquiry', name: 'Inquiry-Based', description: 'การเรียนรู้แบบสืบเสาะ' },
  { id: 'pbl', name: 'Project-Based', description: 'การเรียนรู้แบบโครงงาน' },
  { id: 'cbl', name: 'Case-Based', description: 'การเรียนรู้จากกรณีศึกษา' },
  { id: 'direct', name: 'Direct Instruction', description: 'การสอนตรง' }
]

function onCreditsChange() {
  const creditHoursMap = { 0.5: 20, 1: 40, 1.5: 60, 2: 80 }
  localSettings.value.totalHours = creditHoursMap[localSettings.value.credits] || 40
}

function getInterventionName(id) {
  const type = interventionTypes.find(t => t.id === id)
  return type?.name || id
}
</script>

<style scoped>
@import './step-styles.css';

/* Step 2 Specific Styles */
.step-structure {
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
  padding: 2rem;
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
  opacity: 0.25;
}

.orb-1 {
  width: 350px;
  height: 350px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  top: -150px;
  left: -100px;
  animation: floatOrb 18s ease-in-out infinite;
}

.orb-2 {
  width: 250px;
  height: 250px;
  background: linear-gradient(135deg, #10b981, #06b6d4);
  bottom: 100px;
  right: -80px;
  animation: floatOrb 22s ease-in-out infinite reverse;
}

.orb-3 {
  width: 180px;
  height: 180px;
  background: linear-gradient(135deg, #f59e0b, #ec4899);
  top: 50%;
  left: 30%;
  animation: floatOrb 15s ease-in-out infinite;
}

@keyframes floatOrb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(40px, -40px) scale(1.15); }
}

/* Settings Card */
.settings-card {
  padding: 1.75rem;
  margin-bottom: 1.75rem;
  position: relative;
  z-index: 1;
}

.settings-card h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  font-size: 1.15rem;
  color: #fff;
}

.settings-card h3 .material-icons {
  color: #a855f7;
}

/* Generate Section */
.generate-section {
  text-align: center;
  margin-bottom: 1.75rem;
  position: relative;
  z-index: 1;
}

.generate-card {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 3rem 2rem;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.3);
}

.ai-glow-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  background: linear-gradient(135deg, #a855f7, #ec4899);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 40px rgba(168, 85, 247, 0.4);
  animation: glowPulse 3s ease-in-out infinite;
}

.ai-glow-icon .material-icons {
  font-size: 2.5rem;
  color: white;
}

@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.4); }
  50% { box-shadow: 0 0 60px rgba(168, 85, 247, 0.6); }
}

.generate-card h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.75rem;
}

.generate-card p {
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 1.5rem;
}

/* Generating Animation */
.generating-state {
  text-align: center;
  padding: 3rem;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 1;
}

.generating-animation {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 2rem;
}

.ai-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 3.5rem;
  z-index: 2;
  animation: float 2s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(-50%, -50%); }
  50% { transform: translate(-50%, -60%); }
}

.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 3px solid #a855f7;
  animation: pulse 2s ease-out infinite;
}

.pulse-ring.delay-1 {
  animation-delay: 0.5s;
}

.pulse-ring.delay-2 {
  animation-delay: 1s;
}

@keyframes pulse {
  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
}

/* Structure Result */
.structure-result {
  margin-bottom: 1.75rem;
  position: relative;
  z-index: 1;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.result-header h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: #fff;
}

/* Structure Overview */
.structure-overview {
  padding: 1.75rem;
}

.structure-overview h4 {
  margin-bottom: 1.25rem;
  color: rgba(255, 255, 255, 0.8);
}

.overview-item.research-item {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.1));
  border: 1px solid rgba(102, 126, 234, 0.3);
}

/* ARCE Strategy */
.structure-section {
  padding: 1.75rem;
  margin-top: 1.25rem;
}

.structure-section h4 {
  margin-bottom: 1.25rem;
  color: rgba(255, 255, 255, 0.9);
}

.arce-strategy {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.arce-item {
  padding: 1.25rem;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  border-left: 4px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.arce-item:hover {
  transform: translateX(4px);
}

.arce-item.analysis { border-left-color: #3b82f6; }
.arce-item.reasoning { border-left-color: #10b981; }
.arce-item.creativity { border-left-color: #f59e0b; }
.arce-item.evidence { border-left-color: #8b5cf6; }

.arce-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.arce-icon {
  font-size: 1.5rem;
}

.arce-name {
  font-weight: 600;
  color: #fff;
}

.arce-weight {
  margin-left: auto;
  padding: 0.25rem 0.75rem;
  background: rgba(168, 85, 247, 0.2);
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #d8b4fe;
}

.arce-focus {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  line-height: 1.5;
}

/* Units Preview */
.units-preview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.unit-preview-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.unit-preview-item:hover {
  background: rgba(168, 85, 247, 0.1);
  transform: translateX(4px);
}

.unit-number {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #a855f7, #ec4899);
  color: white;
  border-radius: 10px;
  font-weight: 700;
  box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
}

.unit-info {
  flex: 1;
}

.unit-name {
  display: block;
  font-weight: 600;
  color: #fff;
  margin-bottom: 0.25rem;
}

.unit-meta {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
}

/* Responsive */
@media (max-width: 768px) {
  .arce-strategy {
    grid-template-columns: 1fr;
  }
}
</style>
