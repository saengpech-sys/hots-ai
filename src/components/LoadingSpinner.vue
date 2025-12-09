<!-- LoadingSpinner Component -->
<template>
  <div class="loading-spinner" :class="{ fullscreen: fullscreen }">
    <div class="spinner-container">
      <div class="spinner" :style="{ width: size, height: size }"></div>
      <p v-if="message" class="loading-message">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: 'กำลังโหลด...'
  },
  size: {
    type: String,
    default: '60px'
  },
  fullscreen: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
}

.loading-spinner.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 9999;
}

.spinner-container {
  text-align: center;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid #1976D2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-message {
  margin-top: 15px;
  color: var(--text-color);
  font-size: 1.1em;
}

.loading-spinner.fullscreen .loading-message {
  color: white;
}
</style>
