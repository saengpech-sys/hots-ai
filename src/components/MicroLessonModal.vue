<template>
  <Teleport to="body">
    <div v-if="show" class="micro-lesson-overlay" @click.self="$emit('close')">
      <div class="micro-lesson-modal">
        <div class="modal-header">
          <h2>{{ steps[currentStep].icon }} {{ steps[currentStep].title }}</h2>
          <button @click="$emit('close')" class="close-btn">✕</button>
        </div>

        <div class="lesson-content">
          <div v-html="renderedContent"></div>
        </div>

        <div class="modal-footer">
          <div class="progress-dots">
            <span 
              v-for="(step, idx) in steps" 
              :key="idx"
              :class="{ active: idx === currentStep, done: idx < currentStep }"
            ></span>
          </div>
          
          <button @click="nextStep" class="btn-next">
            {{ currentStep === steps.length - 1 ? 'เสร็จสิ้น ✓' : 'ถัดไป →' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  content: {
    type: Object,
    required: true
  },
  loCode: {
    type: String,
    required: true
  },
  show: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close', 'complete'])

const currentStep = ref(0)

const steps = [
  { key: 'content', title: 'แนวคิดสำคัญ', icon: '📚' },
  { key: 'examples', title: 'ตัวอย่าง', icon: '💡' },
  { key: 'exercises', title: 'แบบฝึกหัด', icon: '✍️' },
  { key: 'summary', title: 'สรุป', icon: '🎯' }
]

const renderedContent = computed(() => {
  const stepKey = steps[currentStep.value].key
  let content = props.content[stepKey]
  
  // Check for empty or placeholder content
  if (!content || 
      content === 'ยังไม่มีตัวอย่าง' || 
      content === 'ยังไม่มีแบบฝึกหัด' || 
      content === 'ยังไม่มีสรุป') {
    const messages = {
      examples: '💡 ยังไม่มีตัวอย่างเพิ่มเติม',
      exercises: '✍️ ยังไม่มีแบบฝึกหัด',
      summary: '🎯 ยังไม่มีสรุป',
      content: 'ไม่มีเนื้อหา'
    }
    return `<div style="text-align: center; padding: 3rem; color: #6b7280;">
      <p style="font-size: 1.2rem; margin: 0;">${messages[stepKey] || 'ไม่มีเนื้อหา'}</p>
      <p style="font-size: 0.9rem; margin-top: 0.5rem;">กดถัดไปเพื่อดูส่วนอื่น</p>
    </div>`
  }
  
  // Convert array/object to string
  if (Array.isArray(content)) {
    content = content.join('\n\n')
  } else if (typeof content === 'object') {
    content = JSON.stringify(content, null, 2)
  }
  
  // Ensure it's a string before parsing
  const text = String(content)
  
  // Parse markdown to HTML
  return marked(text)
})

function nextStep() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  } else {
    // Completed all steps
    emit('complete', {
      loCode: props.loCode,
      lessonId: props.content?.lessonId || `lesson-${props.loCode}-${Date.now()}`
    })
    emit('close')
  }
}

// Reset when modal opens
watch(() => props.show, (newShow) => {
  if (newShow) {
    currentStep.value = 0
  }
})
</script>

<style scoped>
.micro-lesson-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
  padding: 2rem;
}

.micro-lesson-modal {
  background: white;
  border-radius: 24px;
  padding: 0;
  max-width: 800px;
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 2.5rem;
  border-bottom: 2px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0;
}

.close-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #1f2937;
  transform: rotate(90deg);
}

.lesson-content {
  flex: 1;
  overflow-y: auto;
  padding: 2.5rem;
  line-height: 1.8;
  color: #1a202c;
}

.lesson-content :deep(h1),
.lesson-content :deep(h2),
.lesson-content :deep(h3) {
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  color: #1a202c;
  font-weight: 700;
}

.lesson-content :deep(h1) {
  font-size: 1.875rem;
}

.lesson-content :deep(h2) {
  font-size: 1.5rem;
}

.lesson-content :deep(h3) {
  font-size: 1.25rem;
}

.lesson-content :deep(p) {
  margin-bottom: 1rem;
}

.lesson-content :deep(ul),
.lesson-content :deep(ol) {
  margin-left: 2rem;
  margin-bottom: 1rem;
}

.lesson-content :deep(li) {
  margin-bottom: 0.5rem;
}

.lesson-content :deep(code) {
  background: #f3f4f6;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  color: #dc2626;
}

.lesson-content :deep(pre) {
  background: #1f2937;
  color: #f3f4f6;
  padding: 1.5rem;
  border-radius: 12px;
  overflow-x: auto;
  margin-bottom: 1rem;
}

.lesson-content :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

.lesson-content :deep(blockquote) {
  border-left: 4px solid #3b82f6;
  padding-left: 1.5rem;
  margin: 1.5rem 0;
  color: #4b5563;
  font-style: italic;
}

.lesson-content :deep(strong) {
  font-weight: 700;
  color: #1f2937;
}

.lesson-content :deep(em) {
  font-style: italic;
  color: #4b5563;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 2.5rem;
  border-top: 2px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 0 0 24px 24px;
}

.progress-dots {
  display: flex;
  gap: 0.75rem;
}

.progress-dots span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #d1d5db;
  transition: all 0.3s ease;
}

.progress-dots span.active {
  background: #3b82f6;
  transform: scale(1.4);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
}

.progress-dots span.done {
  background: #10b981;
}

.btn-next {
  padding: 0.875rem 2rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-next:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.btn-next:active {
  transform: translateY(0);
}

/* Dark mode */
.dark-mode .micro-lesson-modal {
  background: #1a202c;
}

.dark-mode .modal-header {
  border-bottom-color: #4a5568;
}

.dark-mode .modal-header h2 {
  color: #f7fafc;
}

.dark-mode .close-btn {
  background: #2d3748;
  color: #cbd5e0;
}

.dark-mode .close-btn:hover {
  background: #4a5568;
  color: #f7fafc;
}

.dark-mode .lesson-content {
  color: #e2e8f0;
}

.dark-mode .lesson-content :deep(h1),
.dark-mode .lesson-content :deep(h2),
.dark-mode .lesson-content :deep(h3) {
  color: #f7fafc;
}

.dark-mode .lesson-content :deep(code) {
  background: #2d3748;
  color: #f87171;
}

.dark-mode .modal-footer {
  background: #2d3748;
  border-top-color: #4a5568;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scrollbar styling */
.lesson-content::-webkit-scrollbar {
  width: 8px;
}

.lesson-content::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 4px;
}

.lesson-content::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}

.lesson-content::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* Responsive */
@media (max-width: 768px) {
  .micro-lesson-overlay {
    padding: 1rem;
  }

  .modal-header,
  .lesson-content,
  .modal-footer {
    padding: 1.5rem;
  }

  .modal-header h2 {
    font-size: 1.5rem;
  }

  .lesson-content {
    font-size: 0.95rem;
  }
}
</style>
