<template>
  <div class="step-content step-units">
    <!-- Animated Background -->
    <div class="step-bg-effects">
      <div class="floating-orb orb-1"></div>
      <div class="floating-orb orb-2"></div>
    </div>

    <div class="step-header">
      <h2>📦 หน่วยการเรียนรู้</h2>
      <p>สร้างรายละเอียดหน่วยการเรียนรู้แต่ละหน่วย พร้อมการจัดสรร LO และเวลา</p>
    </div>

    <!-- Research: LO Integrity Check -->
    <div v-if="showLoIntegrityWarning" class="lo-integrity-warning card">
      <div class="warning-icon">
        <span class="material-icons">warning</span>
      </div>
      <div class="warning-content">
        <h4>⚠️ ตรวจสอบ Learning Outcomes</h4>
        <p v-if="loIntegrity.unusedLOs.length > 0">
          <strong>LO ที่ยังไม่ได้ใช้:</strong> {{ loIntegrity.unusedLOs.join(', ') }}
        </p>
        <p v-if="loIntegrity.orphanedLOs.length > 0">
          <strong>LO ที่ไม่มีในรายวิชา:</strong> {{ loIntegrity.orphanedLOs.join(', ') }}
        </p>
        <p class="hint">ควรจัดสรร LO ทุกตัวลงในหน่วยการเรียนรู้ เพื่อความครบถ้วนของข้อมูลวิจัย</p>
      </div>
    </div>

    <!-- Units List -->
    <div class="units-container">
      <div 
        v-for="(unit, idx) in units" 
        :key="unit.id" 
        class="unit-card card"
        :class="{ 'generating': generatingUnitIndex === idx }"
      >
        <div class="unit-header">
          <div class="unit-title">
            <span class="unit-badge">หน่วยที่ {{ idx + 1 }}</span>
            <input 
              v-model="unit.name" 
              class="unit-name-input"
              placeholder="ชื่อหน่วยการเรียนรู้"
              @change="onUnitChange(idx)"
            />
          </div>
          <div class="unit-actions">
            <button 
              v-if="!unit.generated"
              class="btn btn-ai btn-sm" 
              @click="$emit('generate-unit', idx)"
              :disabled="generatingUnitIndex !== null"
            >
              <span class="material-icons">auto_awesome</span>
              สร้างรายละเอียด
            </button>
            <button 
              v-else
              class="btn btn-outline btn-sm" 
              @click="$emit('regenerate-unit', idx)"
              :disabled="generatingUnitIndex !== null"
            >
              <span class="material-icons">refresh</span>
              สร้างใหม่
            </button>
            <button 
              class="btn btn-danger btn-sm" 
              @click="$emit('delete-unit', idx)"
              :disabled="units.length <= 1"
              title="ลบหน่วย"
            >
              <span class="material-icons">delete</span>
            </button>
          </div>
        </div>

        <!-- Editable Basic Info -->
        <div class="unit-edit-row">
          <div class="edit-field">
            <label>จำนวนแผน (1 แผน = 50 นาที)</label>
            <input 
              type="number" 
              v-model.number="unit.periods" 
              min="1" 
              max="20" 
              class="form-control small" 
              @change="onUnitChange(idx)" 
            />
          </div>
          <div class="edit-field wide">
            <label>LO ที่เกี่ยวข้อง</label>
            <div class="lo-selector">
              <label v-for="lo in availableLOs" :key="lo.code" class="lo-checkbox">
                <input 
                  type="checkbox" 
                  :value="lo.code" 
                  v-model="unit.los"
                  @change="onUnitChange(idx)" 
                />
                <span :class="{ 'lo-used': isLoUsedElsewhere(lo.code, idx) }">
                  {{ lo.code }}
                  <span v-if="isLoUsedElsewhere(lo.code, idx)" class="lo-hint">(ใช้แล้ว)</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <!-- Generating State -->
        <div v-if="generatingUnitIndex === idx" class="unit-generating">
          <div class="spinner"></div>
          <span>AI กำลังสร้างรายละเอียดหน่วยที่ {{ idx + 1 }}...</span>
        </div>

        <!-- Unit Details (Generated) -->
        <div v-else-if="unit.generated" class="unit-details">
          <div class="unit-description">
            <h4>📝 สาระสำคัญ</h4>
            <textarea 
              v-model="unit.essentialContent" 
              class="form-control" 
              rows="2" 
              placeholder="สาระสำคัญของหน่วย"
              @change="onUnitChange(idx)"
            ></textarea>
          </div>

          <!-- Unit ARCE Distribution -->
          <div v-if="unit.arce" class="unit-arce-section">
            <h4>🎯 A.R.C.E. ของหน่วยนี้</h4>
            <div class="arce-grid">
              <div v-for="(desc, key) in unit.arce" :key="key" class="arce-unit-item" :class="key">
                <div class="arce-unit-header">
                  <span class="arce-badge" :class="key">{{ arceLabels[key] || key }}</span>
                </div>
                <p class="arce-unit-desc">{{ desc }}</p>
              </div>
            </div>
          </div>

          <!-- Plans Preview -->
          <div class="unit-plans-preview">
            <h4>📋 แผนการจัดการเรียนรู้ ({{ unit.plans?.length || 0 }} แผน)</h4>
            <div class="plans-list editable">
              <div v-for="(plan, pIdx) in unit.plans" :key="pIdx" class="plan-preview-item">
                <span class="plan-number">{{ pIdx + 1 }}</span>
                <input 
                  v-model="plan.topic" 
                  class="plan-topic-input" 
                  placeholder="หัวข้อแผน"
                  @change="onUnitChange(idx)"
                />
                <input 
                  type="number" 
                  v-model.number="plan.periods" 
                  class="plan-duration-input" 
                  min="1" 
                  max="6"
                  @change="onUnitChange(idx)"
                />
                <span class="duration-label">คาบ</span>
                
                <!-- Plan ARCE Focus -->
                <span 
                  v-if="plan.arceFocus" 
                  :class="['arce-mini-badge', plan.arceFocus]" 
                  :title="'เน้น: ' + (arceLabels[plan.arceFocus] || plan.arceFocus)"
                >
                  {{ arceShortLabels[plan.arceFocus] || plan.arceFocus }}
                </span>
                
                <button class="btn-icon" @click="$emit('remove-plan', idx, pIdx)" title="ลบแผน">
                  <span class="material-icons">close</span>
                </button>
              </div>
              <button class="btn btn-outline btn-sm add-plan-btn" @click="$emit('add-plan', idx)">
                <span class="material-icons">add</span>
                เพิ่มแผน
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="unit-empty">
          <div class="empty-icon">
            <span class="material-icons">auto_awesome</span>
          </div>
          <p>กดปุ่ม "สร้างรายละเอียด" เพื่อให้ AI ออกแบบหน่วยการเรียนรู้นี้</p>
        </div>
      </div>

      <!-- Add Unit Button -->
      <button class="btn btn-outline add-unit-btn" @click="$emit('add-unit')">
        <span class="material-icons">add</span>
        เพิ่มหน่วยการเรียนรู้
      </button>
    </div>

    <!-- Navigation -->
    <div class="step-actions">
      <button class="btn btn-outline" @click="$emit('prev')">
        <span class="material-icons">arrow_back</span>
        ย้อนกลับ
      </button>
      <button 
        class="btn btn-primary btn-lg"
        :disabled="!allUnitsGenerated"
        @click="$emit('next')"
      >
        ถัดไป: สร้างแผนการจัดการเรียนรู้
        <span class="material-icons">arrow_forward</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  units: {
    type: Array,
    required: true
  },
  availableLOs: {
    type: Array,
    default: () => []
  },
  generatingUnitIndex: {
    type: Number,
    default: null
  },
  loIntegrity: {
    type: Object,
    default: () => ({ isValid: true, unusedLOs: [], orphanedLOs: [] })
  }
})

const emit = defineEmits([
  'update-unit',
  'add-unit',
  'delete-unit',
  'generate-unit',
  'regenerate-unit',
  'add-plan',
  'remove-plan',
  'prev',
  'next'
])

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

// Computed
const allUnitsGenerated = computed(() => {
  return props.units.length > 0 && props.units.every(u => u.generated)
})

const showLoIntegrityWarning = computed(() => {
  return !props.loIntegrity.isValid && 
         (props.loIntegrity.unusedLOs.length > 0 || props.loIntegrity.orphanedLOs.length > 0)
})

// Methods
function onUnitChange(idx) {
  emit('update-unit', idx, props.units[idx])
}

function isLoUsedElsewhere(loCode, currentUnitIdx) {
  return props.units.some((unit, idx) => 
    idx !== currentUnitIdx && unit.los?.includes(loCode)
  )
}
</script>

<style scoped>
@import './step-styles.css';

/* Step 3 Specific Styles */
.step-units {
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
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #f59e0b, #ec4899);
  top: -100px;
  right: -80px;
  animation: floatOrb 20s ease-in-out infinite;
}

.orb-2 {
  width: 220px;
  height: 220px;
  background: linear-gradient(135deg, #10b981, #3b82f6);
  bottom: 50px;
  left: -60px;
  animation: floatOrb 16s ease-in-out infinite reverse;
}

@keyframes floatOrb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, -30px) scale(1.1); }
}

/* Unit Card Override */
.unit-card {
  padding: 1.75rem;
  border-left: 4px solid #a855f7;
  border-radius: 16px 20px 20px 16px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
}

.unit-card:hover {
  transform: translateX(4px);
  border-left-color: #ec4899;
  box-shadow: 0 15px 50px rgba(168, 85, 247, 0.25);
}

.unit-card.generating {
  border-left-color: #f59e0b;
  animation: pulseGlow 2s ease-in-out infinite;
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 25px rgba(245, 158, 11, 0.2); }
  50% { box-shadow: 0 0 45px rgba(245, 158, 11, 0.4); }
}

/* Unit Header */
.unit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.unit-title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 250px;
}

.unit-badge {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #a855f7, #ec4899);
  color: white;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
  white-space: nowrap;
}

.unit-name-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0.65rem 1rem;
  color: #fff;
  font-size: 1.05rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.unit-name-input:hover {
  border-color: rgba(168, 85, 247, 0.3);
}

.unit-name-input:focus {
  outline: none;
  border-color: #a855f7;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.2);
}

/* Unit Actions */
.unit-actions {
  display: flex;
  gap: 0.75rem;
}

/* Unit Generating State */
.unit-generating {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2.5rem;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 14px;
  margin-top: 1rem;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(245, 158, 11, 0.2);
  border-top-color: #f59e0b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Unit Details */
.unit-details {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.unit-description h4,
.unit-arce-section h4,
.unit-plans-preview h4 {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
}

.unit-description textarea {
  width: 100%;
  resize: vertical;
  min-height: 80px;
}

/* ARCE Grid */
.unit-arce-section {
  margin-top: 1.25rem;
}

.arce-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.arce-unit-item {
  padding: 1rem;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  border-left: 3px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.arce-unit-item:hover {
  transform: translateX(4px);
}

.arce-unit-item.analysis { border-left-color: #3b82f6; background: rgba(59, 130, 246, 0.08); }
.arce-unit-item.reasoning { border-left-color: #10b981; background: rgba(16, 185, 129, 0.08); }
.arce-unit-item.creativity { border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
.arce-unit-item.evidence { border-left-color: #8b5cf6; background: rgba(139, 92, 246, 0.08); }

.arce-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
}

.arce-badge.analysis { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.arce-badge.reasoning { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.arce-badge.creativity { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.arce-badge.evidence { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }

.arce-unit-desc {
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
}

/* Plans Preview */
.unit-plans-preview {
  margin-top: 1.25rem;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.plan-preview-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.plan-preview-item:hover {
  background: rgba(168, 85, 247, 0.1);
}

.plan-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  font-size: 0.8rem;
  font-weight: 600;
}

.plan-topic-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.35rem;
  font-size: 0.95rem;
  color: #fff;
}

.plan-topic-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.plan-duration-input {
  width: 55px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.6);
  color: #fff;
  border-radius: 6px;
  padding: 0.35rem;
  font-size: 0.9rem;
}

.plan-duration-input:focus {
  outline: none;
  border-color: #a855f7;
}

.duration-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.arce-mini-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 5px;
  font-size: 0.7rem;
  font-weight: 700;
}

.arce-mini-badge.analysis { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.arce-mini-badge.reasoning { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.arce-mini-badge.creativity { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.arce-mini-badge.evidence { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }

.btn-icon {
  background: transparent;
  border: none;
  padding: 0.35rem;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.2s;
  border-radius: 6px;
}

.btn-icon:hover {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
}

.add-plan-btn {
  margin-top: 0.75rem;
}

/* Unit Empty State */
.unit-empty {
  padding: 2.5rem;
  text-align: center;
  background: rgba(15, 23, 42, 0.4);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  margin-top: 1rem;
}

.empty-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 1rem;
  background: rgba(168, 85, 247, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon .material-icons {
  font-size: 1.75rem;
  color: #a855f7;
}

.unit-empty p {
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

/* Add Unit Button */
.add-unit-btn {
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

.add-unit-btn:hover {
  border-color: #a855f7;
  color: #d8b4fe;
  background: rgba(168, 85, 247, 0.1);
}

/* Responsive */
@media (max-width: 768px) {
  .unit-header {
    flex-direction: column;
  }
  
  .unit-title {
    width: 100%;
  }
  
  .unit-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .arce-grid {
    grid-template-columns: 1fr;
  }
}
</style>
