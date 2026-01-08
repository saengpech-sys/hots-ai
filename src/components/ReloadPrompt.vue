<template>
  <div v-if="offlineReady || needRefresh" class="pwa-toast" role="alert">
    <div class="message">
      <span v-if="offlineReady">
        ✅ App ready to work offline
      </span>
      <span v-else>
        🚀 New content available, click on reload button to update.
      </span>
    </div>
    <div class="buttons">
      <button v-if="needRefresh" @click="handleReload" class="reload-btn" type="button">
        Reload
      </button>
      <button @click="close" class="close-btn" type="button">
        Close
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRegisterSW } from 'virtual:pwa-register/vue'

const {
  offlineReady,
  needRefresh,
  updateServiceWorker,
} = useRegisterSW()

const handleReload = async () => {
  // Pass true to force immediate reload after service worker update
  await updateServiceWorker(true)
}

const close = async () => {
  offlineReady.value = false
  needRefresh.value = false
}
</script>

<style scoped>
.pwa-toast {
  position: fixed;
  right: 16px;
  bottom: 16px;
  margin: 0;
  padding: 16px 20px;
  border: none;
  border-radius: 12px;
  z-index: 99999;
  text-align: left;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  color: white;
  font-family: inherit;
  max-width: 400px;
  pointer-events: auto;
}

.message {
  margin-bottom: 12px;
  font-size: 14px;
  line-height: 1.5;
}

.buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.reload-btn {
  border: none;
  outline: none;
  border-radius: 8px;
  padding: 10px 24px;
  cursor: pointer;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  pointer-events: auto;
}

.reload-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
}

.reload-btn:active {
  transform: translateY(0);
}

.close-btn {
  border: 2px solid rgba(255, 255, 255, 0.3);
  outline: none;
  border-radius: 8px;
  padding: 10px 20px;
  cursor: pointer;
  background: transparent;
  color: white;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  pointer-events: auto;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}
</style>