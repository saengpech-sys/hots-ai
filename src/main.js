import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Global error handler - ป้องกัน alert จาก unhandled errors
app.config.errorHandler = (err, instance, info) => {
  // Log แต่ไม่แสดง alert
  console.log('App error:', err.message)
  // Suppress error display
}

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  // Log แต่ไม่แสดง alert
  console.log('Unhandled promise rejection:', event.reason?.message || event.reason)
  // Prevent default browser alert
  event.preventDefault()
})

// Initialize auth state listener
const authStore = useAuthStore()
authStore.initAuthListener()

app.mount('#app')
