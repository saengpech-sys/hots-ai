<template>
  <div class="step-content">
    <div class="step-header">
      <h2>📚 เลือกรายวิชา</h2>
      <p>เลือกรายวิชาที่ต้องการสร้างหลักสูตร AI จะวิเคราะห์คำอธิบายรายวิชาและ Learning Outcomes ทั้งหมด</p>
    </div>

    <div class="course-selection">
      <div class="form-group">
        <label>รายวิชา <span class="required">*</span></label>
        <select 
          :value="selectedCourseId" 
          class="form-control" 
          @change="$emit('select-course', ($event.target as HTMLSelectElement).value)"
        >
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
          <span class="material-icons">history</span>
          <div class="notice-text">
            <strong>พบ Curriculum ที่สร้างไว้แล้ว</strong>
            <p>หน่วย: {{ unitCount }} หน่วย</p>
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
        
        <!-- Course Description -->
        <CourseDescription 
          :description="courseDescription"
          :editing="editingDescription"
          :edited-description="editedDescription"
          @start-edit="$emit('start-edit-description')"
          @save="$emit('save-description', $event)"
          @cancel="$emit('cancel-edit-description')"
          @update:edited-description="$emit('update:edited-description', $event)"
        />

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
      </div>
    </div>

    <!-- Next Button -->
    <div class="step-actions">
      <button 
        class="btn btn-primary btn-lg" 
        :disabled="!selectedCourseId"
        @click="$emit('next')"
      >
        <span class="material-icons">arrow_forward</span>
        ถัดไป
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CourseDescription from './CourseDescription.vue'

const props = defineProps({
  courses: {
    type: Array,
    required: true
  },
  selectedCourseId: {
    type: String,
    default: ''
  },
  selectedCourse: {
    type: Object,
    default: null
  },
  loadingCurriculum: {
    type: Boolean,
    default: false
  },
  hasExistingCurriculum: {
    type: Boolean,
    default: false
  },
  unitCount: {
    type: Number,
    default: 0
  },
  courseDescription: {
    type: String,
    default: ''
  },
  editingDescription: {
    type: Boolean,
    default: false
  },
  editedDescription: {
    type: String,
    default: ''
  }
})

defineEmits([
  'select-course',
  'continue',
  'reset',
  'next',
  'start-edit-description',
  'save-description',
  'cancel-edit-description',
  'update:edited-description'
])
</script>

<style scoped>
.course-selection {
  max-width: 800px;
  margin: 0 auto;
}

.course-preview {
  margin-top: 1.5rem;
  padding: 1.5rem;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.preview-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.grade-badge {
  background: var(--primary-color);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
}

.preview-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.preview-section h4 {
  margin-bottom: 0.75rem;
  font-size: 1rem;
  color: var(--text-secondary);
}

.lo-list {
  max-height: 200px;
  overflow-y: auto;
}

.lo-item {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
  margin-bottom: 0.25rem;
}

.lo-item:nth-child(odd) {
  background: var(--bg-secondary);
}

.lo-code {
  font-weight: 600;
  color: var(--primary-color);
  white-space: nowrap;
}

.lo-desc {
  color: var(--text-primary);
}

.loading-curriculum {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  margin-top: 1rem;
}

.existing-curriculum-notice {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--info-bg);
  border: 1px solid var(--info-border);
  border-radius: 0.5rem;
  margin-top: 1rem;
}

.notice-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.notice-content .material-icons {
  color: var(--info-color);
  font-size: 2rem;
}

.notice-actions {
  display: flex;
  gap: 0.5rem;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.empty-text {
  color: var(--text-muted);
  font-style: italic;
}

.required {
  color: var(--danger-color);
}
</style>
