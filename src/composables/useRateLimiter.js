/**
 * 🚦 Client-side Rate Limiter Composable
 * 
 * ป้องกันการ spam API calls ฝั่ง client ก่อนถึง server
 * ลดภาระ network และปรับปรุง UX
 * 
 * Features:
 * 1. Per-action rate limiting
 * 2. Configurable cooldowns
 * 3. Visual feedback support
 * 4. localStorage persistence
 */

import { ref, computed, onUnmounted } from 'vue'

// Default configuration
const DEFAULT_CONFIG = {
  // Assessment - ส่งคำตอบ
  assessment: {
    maxRequests: 5,
    windowMs: 60 * 1000,      // 1 minute
    cooldownMs: 2 * 1000,     // 2 second minimum between requests
    message: 'กรุณารอสักครู่ก่อนส่งคำตอบถัดไป'
  },
  // Worksheet - ส่งใบงาน
  worksheet: {
    maxRequests: 3,
    windowMs: 60 * 1000,
    cooldownMs: 3 * 1000,
    message: 'กรุณารอสักครู่ก่อนส่งใบงานถัดไป'
  },
  // AI Generation - สร้างข้อสอบ/ใบงาน
  aiGeneration: {
    maxRequests: 2,
    windowMs: 60 * 1000,
    cooldownMs: 10 * 1000,
    message: 'กรุณารอสักครู่ ระบบกำลังประมวลผล'
  },
  // General API calls
  general: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    cooldownMs: 500,
    message: 'คุณส่งคำขอเร็วเกินไป'
  }
}

// Global rate limit state (shared across components)
const rateLimitState = new Map()

/**
 * Load persisted rate limit data from localStorage
 */
function loadPersistedState(action) {
  try {
    const stored = localStorage.getItem(`rateLimit_${action}`)
    if (stored) {
      const data = JSON.parse(stored)
      // Clean up expired entries
      const now = Date.now()
      const config = DEFAULT_CONFIG[action] || DEFAULT_CONFIG.general
      data.requests = (data.requests || []).filter(ts => now - ts < config.windowMs)
      return data
    }
  } catch (e) {
    console.warn('Failed to load rate limit state:', e)
  }
  return { requests: [], lastRequest: 0 }
}

/**
 * Persist rate limit data to localStorage
 */
function persistState(action, state) {
  try {
    localStorage.setItem(`rateLimit_${action}`, JSON.stringify(state))
  } catch (e) {
    console.warn('Failed to persist rate limit state:', e)
  }
}

/**
 * Rate Limiter Composable
 * @param {string} action - Action type (assessment, worksheet, aiGeneration, general)
 * @param {Object} customConfig - Optional custom configuration
 */
export function useRateLimiter(action = 'general', customConfig = {}) {
  const config = { ...DEFAULT_CONFIG[action] || DEFAULT_CONFIG.general, ...customConfig }
  
  // Initialize state
  if (!rateLimitState.has(action)) {
    rateLimitState.set(action, loadPersistedState(action))
  }
  
  const isLimited = ref(false)
  const remainingRequests = ref(config.maxRequests)
  const cooldownRemaining = ref(0)
  const errorMessage = ref('')
  
  let cooldownInterval = null
  
  /**
   * Get current state
   */
  function getState() {
    return rateLimitState.get(action) || { requests: [], lastRequest: 0 }
  }
  
  /**
   * Update state
   */
  function setState(newState) {
    rateLimitState.set(action, newState)
    persistState(action, newState)
  }
  
  /**
   * Clean up old requests outside the window
   */
  function cleanupRequests() {
    const state = getState()
    const now = Date.now()
    state.requests = state.requests.filter(ts => now - ts < config.windowMs)
    setState(state)
  }
  
  /**
   * Check if action is allowed
   * @returns {{ allowed: boolean, reason?: string, waitMs?: number }}
   */
  function checkLimit() {
    cleanupRequests()
    const state = getState()
    const now = Date.now()
    
    // Check cooldown between requests
    const timeSinceLastRequest = now - state.lastRequest
    if (timeSinceLastRequest < config.cooldownMs) {
      const waitMs = config.cooldownMs - timeSinceLastRequest
      return {
        allowed: false,
        reason: 'cooldown',
        waitMs,
        message: config.message
      }
    }
    
    // Check request count in window
    if (state.requests.length >= config.maxRequests) {
      const oldestRequest = Math.min(...state.requests)
      const waitMs = config.windowMs - (now - oldestRequest)
      return {
        allowed: false,
        reason: 'limit_exceeded',
        waitMs,
        message: `${config.message} (รอ ${Math.ceil(waitMs / 1000)} วินาที)`
      }
    }
    
    return { allowed: true }
  }
  
  /**
   * Record a request
   */
  function recordRequest() {
    const state = getState()
    const now = Date.now()
    state.requests.push(now)
    state.lastRequest = now
    setState(state)
    updateStatus()
  }
  
  /**
   * Update reactive status
   */
  function updateStatus() {
    cleanupRequests()
    const state = getState()
    const now = Date.now()
    
    remainingRequests.value = Math.max(0, config.maxRequests - state.requests.length)
    
    const timeSinceLastRequest = now - state.lastRequest
    if (timeSinceLastRequest < config.cooldownMs) {
      isLimited.value = true
      cooldownRemaining.value = Math.ceil((config.cooldownMs - timeSinceLastRequest) / 1000)
      errorMessage.value = config.message
    } else if (remainingRequests.value === 0) {
      isLimited.value = true
      const oldestRequest = Math.min(...state.requests)
      cooldownRemaining.value = Math.ceil((config.windowMs - (now - oldestRequest)) / 1000)
      errorMessage.value = `${config.message} (รอ ${cooldownRemaining.value} วินาที)`
    } else {
      isLimited.value = false
      cooldownRemaining.value = 0
      errorMessage.value = ''
    }
  }
  
  /**
   * Execute action with rate limiting
   * @param {Function} fn - Function to execute
   * @returns {Promise} Result or throws error
   */
  async function executeWithLimit(fn) {
    const check = checkLimit()
    
    if (!check.allowed) {
      isLimited.value = true
      errorMessage.value = check.message
      cooldownRemaining.value = Math.ceil(check.waitMs / 1000)
      
      // Start countdown
      startCooldownTimer()
      
      throw new Error(check.message)
    }
    
    recordRequest()
    
    try {
      const result = await fn()
      return result
    } catch (error) {
      throw error
    }
  }
  
  /**
   * Start cooldown countdown timer
   */
  function startCooldownTimer() {
    if (cooldownInterval) clearInterval(cooldownInterval)
    
    cooldownInterval = setInterval(() => {
      if (cooldownRemaining.value > 0) {
        cooldownRemaining.value--
      } else {
        clearInterval(cooldownInterval)
        cooldownInterval = null
        updateStatus()
      }
    }, 1000)
  }
  
  /**
   * Reset rate limit (use with caution)
   */
  function reset() {
    setState({ requests: [], lastRequest: 0 })
    isLimited.value = false
    cooldownRemaining.value = 0
    errorMessage.value = ''
    remainingRequests.value = config.maxRequests
  }
  
  /**
   * Wait for rate limit to clear
   * @returns {Promise}
   */
  function waitForClear() {
    return new Promise((resolve) => {
      const check = () => {
        const result = checkLimit()
        if (result.allowed) {
          resolve()
        } else {
          setTimeout(check, 100)
        }
      }
      check()
    })
  }
  
  // Initial status update
  updateStatus()
  
  // Cleanup on unmount
  onUnmounted(() => {
    if (cooldownInterval) {
      clearInterval(cooldownInterval)
    }
  })
  
  return {
    // State
    isLimited,
    remainingRequests,
    cooldownRemaining,
    errorMessage,
    
    // Methods
    checkLimit,
    recordRequest,
    executeWithLimit,
    reset,
    waitForClear,
    
    // Config
    config: computed(() => config)
  }
}

/**
 * Composable for debouncing rapid actions
 * @param {number} delay - Debounce delay in ms
 */
export function useDebounce(delay = 300) {
  const isPending = ref(false)
  let timeoutId = null
  
  function debounce(fn) {
    return (...args) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      isPending.value = true
      
      return new Promise((resolve, reject) => {
        timeoutId = setTimeout(async () => {
          try {
            const result = await fn(...args)
            resolve(result)
          } catch (error) {
            reject(error)
          } finally {
            isPending.value = false
            timeoutId = null
          }
        }, delay)
      })
    }
  }
  
  function cancel() {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
      isPending.value = false
    }
  }
  
  onUnmounted(cancel)
  
  return {
    isPending,
    debounce,
    cancel
  }
}

/**
 * Composable for throttling rapid actions
 * @param {number} limit - Minimum ms between calls
 */
export function useThrottle(limit = 1000) {
  const isThrottled = ref(false)
  let lastCall = 0
  
  function throttle(fn) {
    return async (...args) => {
      const now = Date.now()
      
      if (now - lastCall < limit) {
        isThrottled.value = true
        const waitTime = limit - (now - lastCall)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
      
      lastCall = Date.now()
      isThrottled.value = false
      return fn(...args)
    }
  }
  
  return {
    isThrottled,
    throttle
  }
}

export default {
  useRateLimiter,
  useDebounce,
  useThrottle
}
