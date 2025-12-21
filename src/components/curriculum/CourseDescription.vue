<template>
  <div class="preview-section course-description-section">
    <h4>📝 คำอธิบายรายวิชา <span class="required">*</span></h4>
    
    <!-- Warning if missing or too short -->
    <div v-if="!description || description.length < 50" class="description-warning">
      <span class="material-icons">warning</span>
      <span>คำอธิบายรายวิชาสำคัญมากสำหรับการสร้างหลักสูตรคุณภาพ กรุณาระบุรายละเอียดให้ครบถ้วน</span>
    </div>
    
    <!-- View mode -->
    <div v-if="!editing">
      <p v-if="description" class="description">{{ description }}</p>
      <p v-else class="description empty-text">ยังไม่มีคำอธิบายรายวิชา</p>
      <button class="btn btn-outline btn-sm" @click="$emit('start-edit')">
        <span class="material-icons">edit</span>
        {{ description ? 'แก้ไขคำอธิบาย' : 'เพิ่มคำอธิบาย' }}
      </button>
    </div>
    
    <!-- Edit mode -->
    <div v-else class="description-edit-form">
      <textarea 
        :value="editedDescription" 
        class="form-control description-textarea"
        placeholder="อธิบายรายละเอียดของรายวิชา เช่น
- เนื้อหาหลักที่จะเรียน
- ทักษะที่นักเรียนจะได้รับ
- ความสัมพันธ์กับวิชาอื่น
- การนำไปใช้ในชีวิตจริง"
        rows="5"
        @input="$emit('update:edited-description', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
      <div class="char-counter" :class="charCountClass">
        {{ editedDescription.length }} ตัวอักษร (แนะนำ 100+ ตัวอักษร)
      </div>
      <div class="edit-actions">
        <button 
          class="btn btn-primary" 
          @click="$emit('save', editedDescription)" 
          :disabled="!editedDescription.trim()"
        >
          <span class="material-icons">save</span> บันทึก
        </button>
        <button class="btn btn-outline" @click="$emit('cancel')">ยกเลิก</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  description: {
    type: String,
    default: ''
  },
  editing: {
    type: Boolean,
    default: false
  },
  editedDescription: {
    type: String,
    default: ''
  }
})

defineEmits([
  'start-edit',
  'save',
  'cancel',
  'update:edited-description'
])

const charCountClass = computed(() => ({
  'warning': props.editedDescription.length < 50,
  'good': props.editedDescription.length >= 100
}))
</script>

<style scoped>
.course-description-section {
  margin-top: 1rem;
}

.description-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--warning-bg);
  border: 1px solid var(--warning-border);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  color: var(--warning-text);
}

.description-warning .material-icons {
  color: var(--warning-color);
}

.description {
  white-space: pre-line;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
  line-height: 1.6;
}

.empty-text {
  color: var(--text-muted);
  font-style: italic;
}

.description-edit-form {
  margin-top: 0.5rem;
}

.description-textarea {
  min-height: 120px;
  resize: vertical;
}

.char-counter {
  font-size: 0.75rem;
  margin-top: 0.25rem;
  text-align: right;
}

.char-counter.warning {
  color: var(--warning-color);
}

.char-counter.good {
  color: var(--success-color);
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.required {
  color: var(--danger-color);
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
}

.btn-outline:hover {
  background: var(--bg-secondary);
}
</style>
