import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // Default to dark mode
  const isDarkMode = ref(true)

  // Initialize from localStorage (default to dark if not set)
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    isDarkMode.value = savedTheme === 'dark'
  } else {
    // Default to dark mode for modern look
    isDarkMode.value = true
    localStorage.setItem('theme', 'dark')
  }

  function toggleTheme() {
    isDarkMode.value = !isDarkMode.value
    localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')
  }

  function setTheme(mode) {
    isDarkMode.value = mode === 'dark'
    localStorage.setItem('theme', mode)
  }

  return {
    isDarkMode,
    toggleTheme,
    setTheme
  }
})
