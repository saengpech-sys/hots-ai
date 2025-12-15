<template>
  <div class="login-container">
    <div class="login-card card">
      <div class="logo-section">
        <h1 class="app-title">HOTS AI ChatLoop</h1>
        <p class="app-subtitle">เข้าสู่ระบบเพื่อเริ่มต้นใช้งาน</p>
      </div>

      <div v-if="error" class="error-message">
        <div class="error-icon">⚠️</div>
        <div class="error-text">{{ error }}</div>
        <details v-if="error.includes('ติดต่อผู้ดูแล')" class="error-details">
          <summary>ข้อมูลสำหรับแก้ไข</summary>
          <p><strong>สำหรับผู้ดูแลระบบ:</strong></p>
          <ol>
            <li>เปิด <a href="https://console.firebase.google.com/project/hots-ai-d028b/authentication/providers" target="_blank">Firebase Console</a></li>
            <li>คลิก "Google" ใน Sign-in providers</li>
            <li>เปิดใช้งาน (Enable)</li>
            <li>ใส่อีเมล Support</li>
            <li>เพิ่ม Authorized domains: <code>hots-ai-d028b.web.app</code></li>
            <li>บันทึก</li>
          </ol>
        </details>
      </div>

      <button 
        @click="handleGoogleSignIn" 
        :disabled="loading"
        class="google-signin-btn"
      >
        <svg class="google-icon" viewBox="0 0 24 24" width="24" height="24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span v-if="!loading">เข้าสู่ระบบด้วย Google</span>
        <span v-else>กำลังเข้าสู่ระบบ...</span>
      </button>

      <div class="divider">
        <span>หรือ</span>
      </div>

      <button @click="goHome" class="btn btn-secondary">
        กลับหน้าหลัก
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const error = ref(null)

async function handleGoogleSignIn() {
  try {
    loading.value = true
    error.value = null
    
    console.log('🔐 Starting Google Sign-In...')
    await authStore.signInWithGoogle()
    
    console.log('✅ Sign-In successful, user:', authStore.user)
    console.log('📋 User profile:', authStore.userProfile)
    
    // Check if profile is complete
    if (!authStore.userProfile?.profileCompleted) {
      console.log('⚠️ Profile not completed, redirecting to setup')
      router.push('/profile-setup')
      return
    }
    
    // Redirect based on role
    const role = authStore.userProfile.role
    console.log('👤 User role:', role)
    
    switch (role) {
      case 'ministry_admin':
        router.push('/national-dashboard')
        break
      case 'esa_admin':
        router.push('/esa-dashboard')
        break
      case 'school_admin':
        router.push('/school-management')
        break
      case 'teacher':
        router.push('/teacher')
        break
      case 'parent':
        router.push('/parent')
        break
      case 'student':
        router.push('/student')
        break
      default:
        router.push('/profile-setup')
    }
  } catch (err) {
    console.error('❌ Login error:', err)
    console.error('Error code:', err.code)
    console.error('Error message:', err.message)
    
    // User-friendly error messages
    if (err.code === 'auth/popup-blocked') {
      error.value = '⚠️ Popup ถูกบล็อก กรุณาอนุญาต Popup สำหรับเว็บไซต์นี้'
    } else if (err.code === 'auth/popup-closed-by-user') {
      error.value = 'คุณปิด Popup ก่อนเข้าสู่ระบบเสร็จ'
    } else if (err.code === 'auth/unauthorized-domain') {
      error.value = '❌ Domain นี้ไม่ได้รับอนุญาต กรุณาติดต่อผู้ดูแลระบบ'
    } else if (err.code === 'auth/operation-not-allowed') {
      error.value = '❌ Google Sign-In ยังไม่ได้เปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
    } else {
      error.value = `เกิดข้อผิดพลาด: ${err.message}`
    }
  } finally {
    loading.value = false
  }
}

function goHome() {
  router.push('/')
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.login-card {
  max-width: 400px;
  width: 100%;
  padding: 3rem 2rem;
}

.logo-section {
  text-align: center;
  margin-bottom: 2rem;
}

.app-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-subtitle {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.error-message {
  background: rgba(244, 67, 54, 0.1);
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  border-left: 4px solid #f44336;
  animation: shake 0.5s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.error-icon {
  font-size: 2em;
  margin-bottom: 10px;
}

.error-text {
  color: #f44336;
  font-weight: 600;
  margin-bottom: 10px;
  line-height: 1.6;
}

.error-details {
  margin-top: 15px;
  text-align: left;
  background: var(--card-bg);
  padding: 15px;
  border-radius: 8px;
}

.error-details summary {
  cursor: pointer;
  font-weight: 600;
  color: #1976D2;
  margin-bottom: 10px;
}

.error-details summary:hover {
  text-decoration: underline;
}

.error-details ol {
  margin: 10px 0 0 20px;
  color: var(--text-secondary);
}

.error-details li {
  margin: 8px 0;
  line-height: 1.6;
}

.error-details code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  color: #d32f2f;
}

.error-details a {
  color: #1976D2;
  text-decoration: none;
}

.error-details a:hover {
  text-decoration: underline;
}

.google-signin-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.875rem 1.5rem;
  background: var(--card-bg);
  color: var(--text-primary);
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 1.5rem;
}

.google-signin-btn:hover:not(:disabled) {
  background: #f8f8f8;
  border-color: #ccc;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.google-signin-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-icon {
  width: 24px;
  height: 24px;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.5rem 0;
  color: var(--text-secondary);
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--border-color);
}

.divider span {
  padding: 0 1rem;
  font-size: 0.875rem;
}

@media (max-width: 480px) {
  .login-card {
    padding: 2rem 1.5rem;
  }
  
  .app-title {
    font-size: 1.5rem;
  }
}
</style>
