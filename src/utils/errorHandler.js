/**
 * 🔧 Error Handler Utility
 * 
 * แปลง technical errors เป็น user-friendly messages ภาษาไทย
 * และจัดการ error logging อย่างเป็นระบบ
 */

// Error code to Thai message mapping
const ERROR_MESSAGES = {
  // Network Errors
  'NETWORK_ERROR': 'ไม่สามารถเชื่อมต่อเครือข่ายได้ กรุณาตรวจสอบอินเทอร์เน็ต',
  'TIMEOUT': 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่',
  'OFFLINE': 'คุณกำลังออฟไลน์ กรุณาตรวจสอบการเชื่อมต่อ',
  
  // Authentication Errors
  'auth/user-not-found': 'ไม่พบบัญชีผู้ใช้นี้',
  'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
  'auth/email-already-in-use': 'อีเมลนี้มีผู้ใช้งานแล้ว',
  'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
  'auth/popup-closed-by-user': 'คุณปิดหน้าต่างเข้าสู่ระบบ กรุณาลองใหม่',
  'auth/network-request-failed': 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ต',
  
  // Firestore Errors
  'permission-denied': 'คุณไม่มีสิทธิ์ดำเนินการนี้',
  'not-found': 'ไม่พบข้อมูลที่ต้องการ',
  'already-exists': 'ข้อมูลนี้มีอยู่แล้ว',
  'unavailable': 'ระบบไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่ภายหลัง',
  'resource-exhausted': 'คุณดำเนินการเกินโควต้า กรุณารอสักครู่',
  
  // Rate Limit Errors
  'RATE_LIMIT': 'คุณส่งคำขอเร็วเกินไป กรุณารอสักครู่',
  '429': 'คุณส่งคำขอเร็วเกินไป กรุณารอ 1 นาที',
  
  // AI/Assessment Errors
  'AI_UNAVAILABLE': 'ระบบ AI ไม่พร้อมใช้งาน กรุณาลองใหม่',
  'ASSESSMENT_FAILED': 'ไม่สามารถประเมินคำตอบได้ กรุณาลองใหม่',
  'INVALID_RESPONSE': 'คำตอบไม่ถูกต้อง กรุณาตรวจสอบ',
  
  // Anti-Cheat Errors
  'COPY_PASTE_DETECTED': '🚨 ตรวจพบการคัดลอกข้อความ กรุณาพิมพ์คำตอบด้วยตัวเอง',
  'SUSPICIOUS_ACTIVITY': '⚠️ ตรวจพบกิจกรรมที่น่าสงสัย',
  
  // General Errors
  'UNKNOWN': 'เกิดข้อผิดพลาด กรุณาลองใหม่',
  'INTERNAL': 'เกิดข้อผิดพลาดภายในระบบ',
}

// Error types for categorization
export const ERROR_TYPES = {
  NETWORK: 'network',
  AUTH: 'auth',
  PERMISSION: 'permission',
  VALIDATION: 'validation',
  RATE_LIMIT: 'rate_limit',
  AI: 'ai',
  ANTI_CHEAT: 'anti_cheat',
  UNKNOWN: 'unknown'
}

/**
 * Classify error type from error object or message
 * @param {Error|string} error 
 * @returns {string} Error type
 */
export function classifyError(error) {
  const message = error?.message || error?.code || String(error)
  const messageLower = message.toLowerCase()
  
  if (messageLower.includes('network') || messageLower.includes('offline') || messageLower.includes('fetch')) {
    return ERROR_TYPES.NETWORK
  }
  if (messageLower.includes('auth/') || messageLower.includes('authentication')) {
    return ERROR_TYPES.AUTH
  }
  if (messageLower.includes('permission') || messageLower.includes('denied')) {
    return ERROR_TYPES.PERMISSION
  }
  if (messageLower.includes('rate') || messageLower.includes('429') || messageLower.includes('เร็วเกินไป')) {
    return ERROR_TYPES.RATE_LIMIT
  }
  if (messageLower.includes('copy') || messageLower.includes('paste') || messageLower.includes('cheat')) {
    return ERROR_TYPES.ANTI_CHEAT
  }
  if (messageLower.includes('ai') || messageLower.includes('openai') || messageLower.includes('assessment')) {
    return ERROR_TYPES.AI
  }
  if (messageLower.includes('valid') || messageLower.includes('required')) {
    return ERROR_TYPES.VALIDATION
  }
  
  return ERROR_TYPES.UNKNOWN
}

/**
 * Get user-friendly Thai error message
 * @param {Error|string} error 
 * @returns {string} Thai error message
 */
export function getUserFriendlyMessage(error) {
  const code = error?.code || ''
  const message = error?.message || String(error)
  
  // Check for exact code match first
  if (ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code]
  }
  
  // Check for partial matches in message
  for (const [key, thaiMessage] of Object.entries(ERROR_MESSAGES)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return thaiMessage
    }
  }
  
  // Check error type
  const errorType = classifyError(error)
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
      return ERROR_MESSAGES['NETWORK_ERROR']
    case ERROR_TYPES.RATE_LIMIT:
      return ERROR_MESSAGES['RATE_LIMIT']
    case ERROR_TYPES.ANTI_CHEAT:
      return ERROR_MESSAGES['COPY_PASTE_DETECTED']
    case ERROR_TYPES.AI:
      return ERROR_MESSAGES['AI_UNAVAILABLE']
    default:
      return ERROR_MESSAGES['UNKNOWN']
  }
}

/**
 * Format error for display with icon
 * @param {Error|string} error 
 * @returns {object} { icon: string, message: string, type: string }
 */
export function formatError(error) {
  const type = classifyError(error)
  const message = getUserFriendlyMessage(error)
  
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
  
  return {
    icon: icons[type] || '❌',
    message,
    type,
    canRetry: [ERROR_TYPES.NETWORK, ERROR_TYPES.AI, ERROR_TYPES.UNKNOWN].includes(type)
  }
}

/**
 * Log error with context (for debugging, not shown to user)
 * @param {string} context - Where the error occurred
 * @param {Error} error - The error object
 * @param {object} metadata - Additional context
 */
export function logError(context, error, metadata = {}) {
  const errorInfo = {
    context,
    type: classifyError(error),
    message: error?.message || String(error),
    code: error?.code,
    stack: error?.stack,
    metadata,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
  }
  
  // In development, log full error
  if (import.meta.env.DEV) {
    console.error(`[${context}] Error:`, errorInfo)
  } else {
    // In production, log minimal info
    console.error(`[${context}] ${errorInfo.type}: ${errorInfo.message}`)
  }
  
  return errorInfo
}

/**
 * Create error handler wrapper for async functions
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context name for logging
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn, context) {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      logError(context, error)
      throw error
    }
  }
}

/**
 * Check if error is retryable
 * @param {Error} error 
 * @returns {boolean}
 */
export function isRetryableError(error) {
  const type = classifyError(error)
  return [ERROR_TYPES.NETWORK, ERROR_TYPES.AI, ERROR_TYPES.UNKNOWN].includes(type)
}

/**
 * Get retry delay based on attempt number (exponential backoff)
 * @param {number} attempt - Current attempt number (1-based)
 * @returns {number} Delay in milliseconds
 */
export function getRetryDelay(attempt) {
  return Math.min(1000 * Math.pow(2, attempt - 1), 30000) // Max 30 seconds
}

export default {
  ERROR_MESSAGES,
  ERROR_TYPES,
  classifyError,
  getUserFriendlyMessage,
  formatError,
  logError,
  withErrorHandling,
  isRetryableError,
  getRetryDelay
}
