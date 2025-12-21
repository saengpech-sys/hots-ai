<template>
  <div :class="['app-container', { 'dark-mode': isDarkMode }]">
    <ErrorBoundary context="App">
      <router-view />
    </ErrorBoundary>
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
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import { usePresence } from '@/composables/usePresence'
import { logger, setGlobalContext } from '@/utils/logger'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const isDarkMode = computed(() => themeStore.isDarkMode)

// Initialize presence tracking for students
// This will automatically send heartbeats every 30 seconds
const { isTracking } = usePresence()

// Set global logger context when user is authenticated
watch(() => authStore.user, (user) => {
  if (user) {
    setGlobalContext({
      userId: user.uid,
      userRole: authStore.userProfile?.role
    })
    logger.info('User authenticated', { 
      role: authStore.userProfile?.role 
    })
  }
})

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
