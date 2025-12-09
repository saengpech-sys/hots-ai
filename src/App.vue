<template>
  <div :class="['app-container', { 'dark-mode': isDarkMode }]">
    <router-view />
    <ReloadPrompt />
    <ConsentModal 
      :show="authStore.showConsentModal"
      :user-role="authStore.userProfile?.role || 'student'"
      @accept="authStore.acceptConsent"
      @close="authStore.showConsentModal = false"
    />
  </div>
</template>

<script setup>
import { computed, watch, onMounted } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'
import ReloadPrompt from '@/components/ReloadPrompt.vue'
import ConsentModal from '@/components/ConsentModal.vue'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const isDarkMode = computed(() => themeStore.isDarkMode)

// Sync with Tailwind's dark mode
const updateThemeClass = (dark) => {
  if (dark) {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.add('dark-mode')
    document.body.classList.add('dark-mode')
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.remove('dark-mode')
    document.body.classList.remove('dark-mode')
  }
}

watch(isDarkMode, (newVal) => {
  updateThemeClass(newVal)
})

onMounted(() => {
  updateThemeClass(isDarkMode.value)
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  min-height: 100vh;
}

.app-container {
  min-height: 100vh;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.app-container:not(.dark-mode) {
  background: #f7fafc;
  color: #1a202c;
}

.app-container.dark-mode {
  background: #0f172a;
  color: #f1f5f9;
}
</style>
