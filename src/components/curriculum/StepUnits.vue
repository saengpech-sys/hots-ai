<template>
  <div class="step-content">
    <div class="step-header">
      <h2>📋 โครงสร้างหลักสูตร</h2>
      <p>สร้างหน่วยการเรียนรู้และจัด Learning Outcomes ให้เหมาะสมกับแต่ละหน่วย</p>
    </div>

    <!-- AI Generate Units Button -->
    <div class="ai-generate-section">
      <button 
        class="btn btn-primary btn-lg" 
        @click="$emit('generate-units')"
        :disabled="isGenerating"
      >
        <span v-if="isGenerating" class="spinner-sm"></span>
        <span v-else class="material-icons">auto_awesome</span>
        {{ isGenerating ? 'กำลังสร้าง...' : '✨ สร้างหน่วยการเรียนรู้ด้วย AI' }}
      </button>
      <p class="ai-hint">AI จะวิเคราะห์ Learning Outcomes และคำอธิบายรายวิชาเพื่อแนะนำโครงสร้างหลักสูตร</p>
    </div>

    <!-- Units List -->
    <div class="units-container">
      <div 
        v-for="(unit, idx) in units" 
        :key="unit.id" 
        class="unit-card card"
        draggable="true"
        @dragstart="onDragStart($event, idx)"
        @dragover.prevent
        @drop="onDrop($event, idx)"
      >
        <div class="unit-header">
          <div class="unit-number">
            <span class="material-icons drag-handle">drag_indicator</span>
            หน่วยที่ {{ idx + 1 }}
          </div>
          <div class="unit-actions">
            <button class="btn-icon" @click="$emit('edit-unit', unit)" title="แก้ไข">
              <span class="material-icons">edit</span>
            </button>
            <button class="btn-icon btn-danger" @click="$emit('delete-unit', unit.id)" title="ลบ">
              <span class="material-icons">delete</span>
            </button>
          </div>
        </div>

        <h3 class="unit-title">{{ unit.title }}</h3>
        <p class="unit-description">{{ unit.description }}</p>

        <!-- Unit LOs -->
        <div v-if="unit.learningOutcomes?.length" class="unit-los">
          <span class="lo-label">Learning Outcomes:</span>
          <div class="lo-chips">
            <span v-for="lo in unit.learningOutcomes" :key="lo" class="lo-chip">
              {{ lo }}
            </span>
          </div>
        </div>

        <!-- Unit Stats -->
        <div class="unit-stats">
          <span class="stat">
            <span class="material-icons">menu_book</span>
            {{ unit.lessons?.length || 0 }} บทเรียน
          </span>
          <span class="stat">
            <span class="material-icons">description</span>
            {{ unit.knowledgeSheets?.length || 0 }} ใบความรู้
          </span>
          <span class="stat">
            <span class="material-icons">schedule</span>
            {{ unit.hours || 0 }} ชั่วโมง
          </span>
        </div>
      </div>

      <!-- Add Unit Button -->
      <button class="add-unit-btn" @click="$emit('add-unit')">
        <span class="material-icons">add</span>
        เพิ่มหน่วยการเรียนรู้
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="units.length === 0" class="empty-state">
      <span class="material-icons">folder_open</span>
      <h3>ยังไม่มีหน่วยการเรียนรู้</h3>
      <p>ใช้ AI สร้างอัตโนมัติ หรือเพิ่มหน่วยด้วยตัวเอง</p>
    </div>

    <!-- Step Navigation -->
    <div class="step-actions">
      <button class="btn btn-outline" @click="$emit('prev')">
        <span class="material-icons">arrow_back</span>
        ย้อนกลับ
      </button>
      <button 
        class="btn btn-primary" 
        :disabled="units.length === 0"
        @click="$emit('next')"
      >
        ถัดไป
        <span class="material-icons">arrow_forward</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  units: {
    type: Array,
    required: true
  },
  isGenerating: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'generate-units',
  'add-unit',
  'edit-unit',
  'delete-unit',
  'reorder-units',
  'prev',
  'next'
])

// Drag and drop
const dragIndex = ref(null)

function onDragStart(event, idx) {
  dragIndex.value = idx
  event.dataTransfer.effectAllowed = 'move'
}

function onDrop(event, targetIdx) {
  if (dragIndex.value !== null && dragIndex.value !== targetIdx) {
    emit('reorder-units', dragIndex.value, targetIdx)
  }
  dragIndex.value = null
}
</script>

<style scoped>
.step-header {
  text-align: center;
  margin-bottom: 2rem;
}

.step-header h2 {
  margin-bottom: 0.5rem;
}

.step-header p {
  color: var(--text-secondary);
}

.ai-generate-section {
  text-align: center;
  padding: 2rem;
  background: linear-gradient(135deg, var(--primary-light) 0%, var(--secondary-light) 100%);
  border-radius: 1rem;
  margin-bottom: 2rem;
}

.ai-hint {
  margin-top: 0.75rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.units-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.unit-card {
  padding: 1.25rem;
  cursor: grab;
  transition: all 0.2s ease;
}

.unit-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.unit-card:active {
  cursor: grabbing;
}

.unit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.unit-number {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.drag-handle {
  cursor: grab;
  color: var(--text-muted);
}

.unit-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-icon {
  padding: 0.375rem;
  background: transparent;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.btn-icon:hover {
  background: var(--bg-secondary);
  color: var(--primary-color);
}

.btn-icon.btn-danger:hover {
  background: var(--danger-bg);
  color: var(--danger-color);
}

.unit-title {
  font-size: 1.125rem;
  margin-bottom: 0.5rem;
}

.unit-description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.unit-los {
  margin-bottom: 1rem;
}

.lo-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.lo-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.lo-chip {
  padding: 0.25rem 0.5rem;
  background: var(--primary-light);
  color: var(--primary-color);
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.unit-stats {
  display: flex;
  gap: 1.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.stat {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.stat .material-icons {
  font-size: 1rem;
}

.add-unit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background: transparent;
  border: 2px dashed var(--border-color);
  border-radius: 0.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-unit-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--primary-light);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.empty-state .material-icons {
  font-size: 4rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin-bottom: 0.5rem;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.spinner-sm {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
