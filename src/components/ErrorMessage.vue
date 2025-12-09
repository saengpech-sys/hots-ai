<!-- ErrorMessage Component -->
<template>
  <div class="error-message" :class="type">
    <div class="error-icon">
      {{ icon }}
    </div>
    <div class="error-content">
      <h3 v-if="title">{{ title }}</h3>
      <p>{{ message }}</p>
      <div v-if="details" class="error-details">
        <details>
          <summary>รายละเอียดเพิ่มเติม</summary>
          <pre>{{ details }}</pre>
        </details>
      </div>
      <div v-if="showRetry" class="error-actions">
        <button @click="$emit('retry')" class="btn-retry">
          🔄 ลองใหม่อีกครั้ง
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'error', // error, warning, info
    validator: (value) => ['error', 'warning', 'info'].includes(value)
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    required: true
  },
  details: {
    type: String,
    default: ''
  },
  showRetry: {
    type: Boolean,
    default: true
  }
})

defineEmits(['retry'])

const icon = computed(() => {
  switch (props.type) {
    case 'error': return '❌'
    case 'warning': return '⚠️'
    case 'info': return 'ℹ️'
    default: return '❌'
  }
})
</script>

<style scoped>
.error-message {
  display: flex;
  gap: 20px;
  padding: 25px;
  border-radius: 12px;
  margin: 20px 0;
  border-left: 5px solid;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-message.error {
  background: rgba(244, 67, 54, 0.1);
  border-left-color: #f44336;
}

.error-message.warning {
  background: rgba(255, 152, 0, 0.1);
  border-left-color: #FF9800;
}

.error-message.info {
  background: rgba(33, 150, 243, 0.1);
  border-left-color: #2196F3;
}

.error-icon {
  font-size: 3em;
  line-height: 1;
}

.error-content {
  flex: 1;
}

.error-content h3 {
  margin: 0 0 10px 0;
  color: var(--text-color);
  font-size: 1.2em;
}

.error-content p {
  margin: 0 0 15px 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.error-details {
  margin-top: 15px;
}

.error-details summary {
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.9em;
  padding: 8px 0;
}

.error-details summary:hover {
  color: var(--primary-color);
}

.error-details pre {
  background: rgba(0, 0, 0, 0.05);
  padding: 15px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.85em;
  margin-top: 10px;
  color: var(--text-color);
}

.error-actions {
  margin-top: 15px;
}

.btn-retry {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95em;
  transition: all 0.3s;
}

.btn-retry:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}

.btn-retry:active {
  transform: translateY(0);
}
</style>
