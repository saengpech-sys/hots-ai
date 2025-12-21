/**
 * 🧪 Unit Tests for Rate Limiter
 * 
 * ทดสอบ rate limiting functionality
 * 
 * Run: npm test -- --testPathPattern=rateLimiter
 */

const {
  checkIPRateLimit,
  RATE_LIMIT_CONFIG
} = require('../utils/rateLimiter')

// Mock Firestore
const mockFirestore = () => {
  const data = new Map()
  
  return {
    collection: (name) => ({
      doc: (id) => ({
        get: async () => {
          const docData = data.get(`${name}/${id}`)
          return {
            exists: !!docData,
            data: () => docData
          }
        },
        set: async (newData) => {
          data.set(`${name}/${id}`, newData)
        }
      })
    }),
    runTransaction: async (fn) => {
      const transaction = {
        get: async (ref) => ref.get(),
        set: (ref, data) => ref.set(data)
      }
      return fn(transaction)
    }
  }
}

describe('IP Rate Limiting', () => {
  beforeEach(() => {
    // Clear the in-memory cache between tests
    // Note: In real implementation, you'd export a reset function
  })

  test('should allow first request from new IP', () => {
    const result = checkIPRateLimit('192.168.1.1', 'assessment')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThan(0)
  })

  test('should track requests per IP', () => {
    const ip = '192.168.1.100'
    
    // First request
    let result = checkIPRateLimit(ip, 'general')
    expect(result.allowed).toBe(true)
    const initialRemaining = result.remaining
    
    // Second request
    result = checkIPRateLimit(ip, 'general')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(initialRemaining - 1)
  })

  test('should have correct config for assessment', () => {
    expect(RATE_LIMIT_CONFIG.assessment).toBeDefined()
    expect(RATE_LIMIT_CONFIG.assessment.maxRequests).toBe(10)
    expect(RATE_LIMIT_CONFIG.assessment.windowMs).toBe(60000)
  })

  test('should have correct config for AI generation', () => {
    expect(RATE_LIMIT_CONFIG.aiGeneration).toBeDefined()
    expect(RATE_LIMIT_CONFIG.aiGeneration.maxRequests).toBe(3)
    expect(RATE_LIMIT_CONFIG.aiGeneration.blockDurationMs).toBe(600000) // 10 minutes
  })

  test('should separate limits by action type', () => {
    const ip = '192.168.1.200'
    
    const assessResult = checkIPRateLimit(ip, 'assessment')
    const generalResult = checkIPRateLimit(ip, 'general')
    
    // Different actions should have independent limits
    expect(assessResult.allowed).toBe(true)
    expect(generalResult.allowed).toBe(true)
  })
})

describe('Rate Limit Config', () => {
  test('should have all required action types', () => {
    const requiredActions = ['assessment', 'worksheet', 'aiGeneration', 'general']
    
    requiredActions.forEach(action => {
      expect(RATE_LIMIT_CONFIG[action]).toBeDefined()
      expect(RATE_LIMIT_CONFIG[action].windowMs).toBeDefined()
      expect(RATE_LIMIT_CONFIG[action].maxRequests).toBeDefined()
      expect(RATE_LIMIT_CONFIG[action].blockDurationMs).toBeDefined()
    })
  })

  test('should have reasonable limits', () => {
    // Assessment should be moderate
    expect(RATE_LIMIT_CONFIG.assessment.maxRequests).toBeGreaterThanOrEqual(5)
    expect(RATE_LIMIT_CONFIG.assessment.maxRequests).toBeLessThanOrEqual(20)
    
    // AI generation should be strict (costly operation)
    expect(RATE_LIMIT_CONFIG.aiGeneration.maxRequests).toBeLessThanOrEqual(5)
    
    // General should be lenient
    expect(RATE_LIMIT_CONFIG.general.maxRequests).toBeGreaterThanOrEqual(30)
  })

  test('should have sensible block durations', () => {
    // AI generation should have longer block (prevent abuse)
    expect(RATE_LIMIT_CONFIG.aiGeneration.blockDurationMs)
      .toBeGreaterThanOrEqual(RATE_LIMIT_CONFIG.assessment.blockDurationMs)
  })
})
