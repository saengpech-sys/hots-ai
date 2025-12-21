<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-content">
      <div class="error-icon">{{ errorIcon }}</div>
      <h2>{{ errorTitle }}</h2>
      <p class="error-message">{{ errorMessage }}</p>
      
      <div class="error-actions">
        <button @click="retry" class="btn-primary" v-if="canRetry">
          🔄 ลองใหม่อีกครั้ง
        </button>
        <button @click="goHome" class="btn-secondary">
          🏠 กลับหน้าหลัก
        </button>
        <button @click="reportError" class="btn-outline" v-if="showReport">
          📝 รายงานปัญหา
        </button>
      </div>
      
      <details class="error-details" v-if="isDev">
        <summary>🔧 ข้อมูลทางเทคนิค (สำหรับ Developer)</summary>
        <pre>{{ technicalDetails }}</pre>
      </details>
    </div>
  </div>
  <slot v-else />
</template>

<script setup>
import { ref, computed, onErrorCaptured, watch } from 'vue'
import { useRouter } from 'vue-router'
import { classifyError, getUserFriendlyMessage, ERROR_TYPES, logError } from '@/utils/errorHandler'

const props = defineProps({
  // Custom fallback UI
  fallbackTitle: {
    type: String,
    default: 'เกิดข้อผิดพลาด'
  },
  // Context for error logging
  context: {
    type: String,
    default: 'Component'
  },
  // Show report button
  showReport: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['error', 'retry', 'reset'])

const router = useRouter()
const hasError = ref(false)
const error = ref(null)
const errorInfo = ref(null)
const retryCount = ref(0)
const maxRetries = 3

const isDev = computed(() => import.meta.env.DEV)

const errorType = computed(() => {
  return error.value ? classifyError(error.value) : ERROR_TYPES.UNKNOWN
})

const errorIcon = computed(() => {
  const icons = {
    [ERROR_TYPES.NETWORK]: '🌐',
    [ERROR_TYPES.AUTH]: '🔐',
    [ERROR_TYPES.PERMISSION]: '🚫',
    [ERROR_TYPES.VALIDATION]: '⚠️',
    [ERROR_TYPES.RATE_LIMIT]: '⏳',
    [ERROR_TYPES.AI]: '🤖',
    [ERROR_TYPES.ANTI_CHEAT]: '🚨',
    [ERROR_TYPES.UNKNOWN]: '❌'
  }
  return icons[errorType.value] || '❌'
})

const errorTitle = computed(() => {
  const titles = {
    [ERROR_TYPES.NETWORK]: 'ไม่สามารถเชื่อมต่อได้',
    [ERROR_TYPES.AUTH]: 'กรุณาเข้าสู่ระบบใหม่',
    [ERROR_TYPES.PERMISSION]: 'ไม่มีสิทธิ์เข้าถึง',
    [ERROR_TYPES.VALIDATION]: 'ข้อมูลไม่ถูกต้อง',
    [ERROR_TYPES.RATE_LIMIT]: 'กรุณารอสักครู่',
    [ERROR_TYPES.AI]: 'ระบบ AI ขัดข้อง',
    [ERROR_TYPES.ANTI_CHEAT]: 'ตรวจพบกิจกรรมที่น่าสงสัย',
    [ERROR_TYPES.UNKNOWN]: props.fallbackTitle
  }
  return titles[errorType.value] || props.fallbackTitle
})

const errorMessage = computed(() => {
  return error.value ? getUserFriendlyMessage(error.value) : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
})

const canRetry = computed(() => {
  if (retryCount.value >= maxRetries) return false
  return [ERROR_TYPES.NETWORK, ERROR_TYPES.AI, ERROR_TYPES.UNKNOWN].includes(errorType.value)
})

const technicalDetails = computed(() => {
  if (!error.value) return ''
  return JSON.stringify({
    name: error.value.name,
    message: error.value.message,
    stack: error.value.stack,
    component: props.context,
    type: errorType.value,
    retryCount: retryCount.value,
    timestamp: new Date().toISOString()
  }, null, 2)
})

// Capture errors from child components
onErrorCaptured((err, instance, info) => {
  error.value = err
  errorInfo.value = info
  hasError.value = true
  
  // Log the error
  logError(`ErrorBoundary:${props.context}`, err, {
    componentInfo: info,
    component: instance?.$options?.name || 'Unknown'
  })
  
  // Emit error event
  emit('error', { error: err, info, context: props.context })
  
  // Prevent error from propagating
  return false
})

// Watch for route changes to reset error state
watch(() => router.currentRoute.value.path, () => {
  reset()
})

function retry() {
  retryCount.value++
  hasError.value = false
  error.value = null
  errorInfo.value = null
  emit('retry', { retryCount: retryCount.value })
}

function reset() {
  hasError.value = false
  error.value = null
  errorInfo.value = null
  retryCount.value = 0
  emit('reset')
}

function goHome() {
  reset()
  router.push('/')
}

function reportError() {
  // Could integrate with error reporting service
  const subject = encodeURIComponent(`Error Report: ${errorTitle.value}`)
  const body = encodeURIComponent(`
ข้อผิดพลาด: ${errorMessage.value}
หน้า: ${window.location.href}
เวลา: ${new Date().toLocaleString('th-TH')}

รายละเอียดเพิ่มเติม:
${technicalDetails.value}
  `)
  
  // Open mailto link
  window.open(`mailto:support@example.com?subject=${subject}&body=${body}`)
}

// Expose reset method for parent components
defineExpose({ reset, retry })
</script>

<style scoped>
.error-boundary {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.error-content {
  text-align: center;
  max-width: 500px;
  padding: 2rem;
  background: var(--card-bg, #fff);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.dark-mode .error-content {
  background: var(--dark-card-bg, #1e293b);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

h2 {
  color: var(--text-primary, #1a202c);
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
}

.dark-mode h2 {
  color: var(--dark-text-primary, #f1f5f9);
}

.error-message {
  color: var(--text-secondary, #64748b);
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

button {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #e2e8f0;
  color: #334155;
}

.dark-mode .btn-secondary {
  background: #334155;
  color: #e2e8f0;
}

.btn-secondary:hover {
  background: #cbd5e1;
}

.dark-mode .btn-secondary:hover {
  background: #475569;
}

.btn-outline {
  background: transparent;
  border: 2px solid #e2e8f0;
  color: #64748b;
}

.dark-mode .btn-outline {
  border-color: #475569;
  color: #94a3b8;
}

.btn-outline:hover {
  border-color: #667eea;
  color: #667eea;
}

.error-details {
  margin-top: 1.5rem;
  text-align: left;
}

.error-details summary {
  cursor: pointer;
  color: #64748b;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.error-details pre {
  background: #f1f5f9;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 0.75rem;
  color: #334155;
}

.dark-mode .error-details pre {
  background: #0f172a;
  color: #94a3b8;
}
</style>
