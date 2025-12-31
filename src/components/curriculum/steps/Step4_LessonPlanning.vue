<template>
  <div class="step-content step-plans">
    <!-- Animated Background -->
    <div class="step-bg-effects">
      <div class="floating-orb orb-1"></div>
      <div class="floating-orb orb-2"></div>
      <div class="floating-orb orb-3"></div>
    </div>

    <div class="step-header">
      <h2>📝 แผนการจัดการเรียนรู้</h2>
      <p>สร้างแผนการจัดการเรียนรู้แต่ละแผนด้วย 5E Model และ A.R.C.E. Assessment</p>
    </div>

    <!-- Units Tabs -->
    <div class="units-tabs">
      <button 
        v-for="(unit, idx) in units"
        :key="unit.id"
        :class="['tab-btn', { active: selectedUnitIndex === idx }]"
        @click="$emit('select-unit', idx)"
      >
        <span class="tab-icon">📦</span>
        หน่วยที่ {{ idx + 1 }}
        <span class="plan-count">{{ unit.plans?.length || 0 }}</span>
      </button>
    </div>

    <!-- Plans List -->
    <div v-if="selectedUnit" class="plans-container">
      <div v-for="(plan, pIdx) in selectedUnit.plans" :key="pIdx" class="plan-card card">
        <div class="plan-header">
          <div class="plan-title">
            <span class="plan-badge">แผนที่ {{ pIdx + 1 }}</span>
            <h3>{{ plan.topic }}</h3>
          </div>
          <div class="plan-status" :class="plan.status || 'pending'">
            <span v-if="plan.status === 'generated'">✅ สร้างแล้ว</span>
            <span v-else-if="plan.status === 'generating'">⏳ กำลังสร้าง</span>
            <span v-else>📝 รอสร้าง</span>
          </div>
        </div>

        <div class="plan-meta">
          <span class="meta-item">
            <span class="material-icons">schedule</span> 
            {{ plan.periods || 1 }} คาบ ({{ (plan.periods || 1) * 50 }} นาที)
          </span>
          <span class="meta-item">
            <span class="material-icons">flag</span> 
            {{ plan.los?.join(', ') || 'ไม่ระบุ LO' }}
          </span>
          
          <!-- Plan ARCE Focus -->
          <span v-if="plan.arceFocus" :class="['arce-focus-badge', plan.arceFocus]">
            <span class="material-icons">psychology</span>
            {{ arceLabels[plan.arceFocus] || plan.arceFocus }}
          </span>
        </div>
        
        <!-- Plan ARCE Preview -->
        <div v-if="plan.arce" class="plan-arce-preview">
          <div v-for="(desc, key) in plan.arce" :key="key" class="arce-preview-item" :class="key">
            <span class="arce-key">{{ arceShortLabels[key] }}</span>
            <span class="arce-desc-short">{{ truncate(desc, 60) }}</span>
          </div>
        </div>

        <div class="plan-actions">
          <button 
            v-if="plan.status !== 'generated'"
            class="btn btn-ai"
            @click="$emit('generate-plan', selectedUnitIndex, pIdx)"
            :disabled="plan.status === 'generating'"
          >
            <span class="material-icons">auto_awesome</span>
            สร้างแผนการสอน
          </button>
          <button 
            v-else
            class="btn btn-primary"
            @click="$emit('view-plan', plan.id)"
          >
            <span class="material-icons">visibility</span>
            ดูแผนการสอน
          </button>
          <button 
            class="btn btn-outline" 
            @click="toggleSettings(pIdx)"
            :class="{ active: expandedPlanIndex === pIdx }"
          >
            <span class="material-icons">settings</span>
          </button>
          <button 
            class="btn btn-danger btn-sm" 
            @click="$emit('delete-plan', selectedUnitIndex, pIdx)"
            title="ลบแผน"
          >
            <span class="material-icons">delete</span>
          </button>
        </div>

        <!-- Plan Settings Panel -->
        <div v-if="expandedPlanIndex === pIdx" class="plan-settings-panel">
          <div class="settings-row">
            <div class="setting-field">
              <label>หัวข้อ</label>
              <input 
                v-model="plan.topic" 
                class="form-control" 
                placeholder="หัวข้อแผน"
                @change="onPlanChange(pIdx)" 
              />
            </div>
            <div class="setting-field small">
              <label>จำนวนคาบ</label>
              <input 
                type="number" 
                v-model.number="plan.periods" 
                class="form-control" 
                min="1" 
                max="6"
                @change="onPlanChange(pIdx)"
              />
            </div>
          </div>
          <div class="settings-row">
            <div class="setting-field">
              <label>LO ที่เกี่ยวข้อง</label>
              <div class="lo-selector">
                <label v-for="lo in selectedUnit.los" :key="lo" class="lo-checkbox">
                  <input 
                    type="checkbox" 
                    :value="lo" 
                    v-model="plan.los"
                    @change="onPlanChange(pIdx)"
                  />
                  <span>{{ lo }}</span>
                </label>
              </div>
            </div>
          </div>
          
          <!-- Research: Intervention Type Override -->
          <div class="settings-row">
            <div class="setting-field">
              <label>
                🔬 รูปแบบการสอนเฉพาะแผนนี้
                <span class="research-badge">Research</span>
              </label>
              <select 
                v-model="plan.interventionType" 
                class="form-control"
                @change="onPlanChange(pIdx)"
              >
                <option value="">ใช้ค่าเริ่มต้นจากรายวิชา</option>
                <option v-for="type in interventionTypes" :key="type.id" :value="type.id">
                  {{ type.name }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="arce-note">
            <span class="material-icons">info</span>
            <span>A.R.C.E. ครบ 4 ด้านทุกแผน - AI จะเลือก focus ตามบริบทเนื้อหาอัตโนมัติ</span>
          </div>
          <button class="btn btn-sm btn-primary" @click="expandedPlanIndex = null">
            <span class="material-icons">check</span>
            เสร็จสิ้น
          </button>
        </div>
      </div>

      <!-- Add Plan -->
      <button class="btn btn-outline add-plan-btn" @click="$emit('add-plan', selectedUnitIndex)">
        <span class="material-icons">add</span>
        เพิ่มแผนการจัดการเรียนรู้
      </button>
    </div>

    <!-- Batch Generate -->
    <div class="batch-actions card">
      <div class="batch-icon">
        <span class="material-icons">bolt</span>
      </div>
      <div class="batch-content">
        <h4>⚡ สร้างแบบรวดเร็ว</h4>
        <p>สร้างแผนการจัดการเรียนรู้ทั้งหมดในหน่วยนี้พร้อมกัน</p>
      </div>
      <button 
        class="btn btn-ai btn-lg"
        @click="$emit('generate-all-plans', selectedUnitIndex)"
        :disabled="generatingAllPlans"
      >
        <span v-if="generatingAllPlans" class="spinner-sm"></span>
        <span v-else class="material-icons">bolt</span>
        {{ generatingAllPlans ? 'กำลังสร้าง...' : 'สร้างทุกแผน' }}
      </button>
    </div>

    <!-- Navigation -->
    <div class="step-actions">
      <button class="btn btn-outline" @click="$emit('prev')">
        <span class="material-icons">arrow_back</span>
        ย้อนกลับ
      </button>
      <button class="btn btn-primary btn-lg" @click="$emit('next')">
        <span class="material-icons">arrow_forward</span>
        ต่อไป: สื่อการเรียนรู้
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  units: {
    type: Array,
    required: true
  },
  selectedUnitIndex: {
    type: Number,
    default: 0
  },
  generatingAllPlans: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'select-unit',
  'update-plan',
  'add-plan',
  'delete-plan',
  'generate-plan',
  'generate-all-plans',
  'view-plan',
  'prev',
  'next'
])

// Local state
const expandedPlanIndex = ref(null)

// ARCE Labels
const arceLabels = {
  analysis: 'A-วิเคราะห์',
  reasoning: 'R-เหตุผล',
  creativity: 'C-สร้างสรรค์',
  evidence: 'E-หลักฐาน'
}

const arceShortLabels = {
  analysis: 'A',
  reasoning: 'R',
  creativity: 'C',
  evidence: 'E'
}

// Intervention types for research
const interventionTypes = [
  { id: '5e', name: '5E Model' },
  { id: 'inquiry', name: 'Inquiry-Based' },
  { id: 'pbl', name: 'Project-Based' },
  { id: 'cbl', name: 'Case-Based' },
  { id: 'direct', name: 'Direct Instruction' }
]

// Computed
const selectedUnit = computed(() => props.units[props.selectedUnitIndex])

// Methods
function toggleSettings(planIndex) {
  expandedPlanIndex.value = expandedPlanIndex.value === planIndex ? null : planIndex
}

function onPlanChange(planIndex) {
  emit('update-plan', props.selectedUnitIndex, planIndex, selectedUnit.value.plans[planIndex])
}

function truncate(text, length) {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}
</script>

<style scoped>
@import './step-styles.css';

/* Step 4 Specific Styles */
.step-plans {
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
  width: 280px;
  height: 280px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  top: -80px;
  left: -60px;
  animation: floatOrb 18s ease-in-out infinite;
}

.orb-2 {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #ec4899, #f59e0b);
  bottom: 150px;
  right: -50px;
  animation: floatOrb 22s ease-in-out infinite reverse;
}

.orb-3 {
  width: 150px;
  height: 150px;
  background: linear-gradient(135deg, #10b981, #06b6d4);
  top: 40%;
  right: 20%;
  animation: floatOrb 15s ease-in-out infinite;
}

@keyframes floatOrb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, -30px) scale(1.1); }
}

/* Units Tabs */
.units-tabs {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.75rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  position: relative;
  z-index: 1;
}

.units-tabs::-webkit-scrollbar {
  height: 6px;
}

.units-tabs::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.units-tabs::-webkit-scrollbar-thumb {
  background: rgba(168, 85, 247, 0.3);
  border-radius: 3px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 1.25rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.tab-btn:hover {
  background: rgba(168, 85, 247, 0.15);
  border-color: rgba(168, 85, 247, 0.3);
}

.tab-btn.active {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.2));
  color: white;
  border-color: rgba(168, 85, 247, 0.5);
  box-shadow: 0 4px 20px rgba(168, 85, 247, 0.25);
}

.tab-icon {
  font-size: 1.1rem;
}

.plan-count {
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  font-weight: 600;
}

.tab-btn.active .plan-count {
  background: rgba(255, 255, 255, 0.25);
}

/* Plans Container */
.plans-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 1.75rem;
  position: relative;
  z-index: 1;
}

/* Plan Card */
.plan-card {
  padding: 1.5rem;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 50px rgba(168, 85, 247, 0.2);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.plan-title {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex: 1;
  min-width: 200px;
}

.plan-badge {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  padding: 0.3rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.plan-title h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: #fff;
}

.plan-status {
  font-size: 0.85rem;
  padding: 0.35rem 0.9rem;
  border-radius: 25px;
  font-weight: 500;
}

.plan-status.generated {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.plan-status.generating {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.plan-status.pending {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Plan Meta */
.plan-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.meta-item .material-icons {
  font-size: 1rem;
  opacity: 0.7;
}

.arce-focus-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.7rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
}

.arce-focus-badge .material-icons {
  font-size: 0.95rem;
}

.arce-focus-badge.analysis { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
.arce-focus-badge.reasoning { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
.arce-focus-badge.creativity { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
.arce-focus-badge.evidence { background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); }

/* ARCE Preview */
.plan-arce-preview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.65rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.arce-preview-item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.85rem;
}

.arce-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
}

.arce-preview-item.analysis .arce-key { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.arce-preview-item.reasoning .arce-key { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.arce-preview-item.creativity .arce-key { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.arce-preview-item.evidence .arce-key { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }

.arce-desc-short {
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
}

/* Plan Actions */
.plan-actions {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

/* Settings Panel */
.plan-settings-panel {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.settings-row {
  display: flex;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.setting-field {
  flex: 1;
  min-width: 200px;
}

.setting-field.small {
  flex: 0 0 120px;
  min-width: 120px;
}

.setting-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.arce-note {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.9rem 1rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 10px;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.arce-note .material-icons {
  color: #60a5fa;
  font-size: 1.15rem;
}

/* Add Plan Button */
.add-plan-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.25rem;
  border: 2px dashed rgba(168, 85, 247, 0.3);
  border-radius: 16px;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
}

.add-plan-btn:hover {
  border-color: #a855f7;
  color: #d8b4fe;
  background: rgba(168, 85, 247, 0.1);
}

/* Batch Actions */
.batch-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  margin-bottom: 1.75rem;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.1));
  border-color: rgba(168, 85, 247, 0.3);
  position: relative;
  z-index: 1;
}

.batch-icon {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #a855f7, #ec4899);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 20px rgba(168, 85, 247, 0.3);
}

.batch-icon .material-icons {
  font-size: 1.5rem;
  color: white;
}

.batch-content {
  flex: 1;
}

.batch-content h4 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
  color: #fff;
}

.batch-content p {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
}

.spinner-sm {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .units-tabs {
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
  }
  
  .plan-arce-preview {
    grid-template-columns: 1fr;
  }
  
  .plan-actions {
    flex-direction: column;
  }
  
  .batch-actions {
    flex-direction: column;
    text-align: center;
  }
}
</style>
