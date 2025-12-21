/**
 * 🚦 Rate Limiter Module for Cloud Functions
 * 
 * ป้องกันการ spam API calls เพื่อลดค่าใช้จ่าย OpenAI
 * 
 * Features:
 * 1. Per-user rate limiting (Firestore-based)
 * 2. Per-IP rate limiting (Memory-based for fast lookup)
 * 3. Configurable windows and limits
 * 4. Automatic cleanup of old entries
 */

const admin = require('firebase-admin')

// In-memory cache for IP rate limiting (reset on cold start)
const ipRateLimitCache = new Map()

// Configuration
const RATE_LIMIT_CONFIG = {
  // Assessment API - ต่อนักเรียน
  assessment: {
    windowMs: 60 * 1000,      // 1 minute window
    maxRequests: 10,          // 10 requests per minute
    blockDurationMs: 5 * 60 * 1000  // Block for 5 minutes if exceeded
  },
  // Worksheet submission - ต่อนักเรียน
  worksheet: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 5,           // 5 submissions per minute
    blockDurationMs: 2 * 60 * 1000
  },
  // AI Generation (costly) - ต่อครู
  aiGeneration: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 3,           // 3 AI generations per minute
    blockDurationMs: 10 * 60 * 1000  // Block for 10 minutes
  },
  // General API - per IP
  general: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 60,          // 60 requests per minute per IP
    blockDurationMs: 5 * 60 * 1000
  }
}

/**
 * 🔍 Check rate limit for a user (Firestore-based)
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID to check
 * @param {string} action - Action type (assessment, worksheet, aiGeneration)
 * @returns {Object} { allowed: boolean, remaining: number, resetAt: Date, error?: string }
 */
async function checkUserRateLimit(db, userId, action = 'assessment') {
  if (!userId) {
    return { allowed: false, remaining: 0, error: 'User ID required' }
  }

  const config = RATE_LIMIT_CONFIG[action] || RATE_LIMIT_CONFIG.general
  const now = Date.now()
  const windowStart = now - config.windowMs

  const rateLimitRef = db.collection('rateLimits').doc(`${userId}_${action}`)

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef)
      const data = doc.exists ? doc.data() : null

      // Check if user is currently blocked
      if (data?.blockedUntil && data.blockedUntil.toMillis() > now) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: data.blockedUntil.toDate(),
          error: `Rate limit exceeded. Try again at ${data.blockedUntil.toDate().toLocaleTimeString('th-TH')}`
        }
      }

      // Filter requests within current window
      const requests = (data?.requests || [])
        .filter(ts => ts > windowStart)
        .slice(-config.maxRequests) // Keep only recent ones

      // Check if limit exceeded
      if (requests.length >= config.maxRequests) {
        const blockedUntil = new Date(now + config.blockDurationMs)
        
        transaction.set(rateLimitRef, {
          userId,
          action,
          requests,
          blockedUntil: admin.firestore.Timestamp.fromDate(blockedUntil),
          lastExceeded: admin.firestore.FieldValue.serverTimestamp()
        })

        // Log the rate limit event
        console.warn(`🚨 Rate limit exceeded for user ${userId} on ${action}`)

        return {
          allowed: false,
          remaining: 0,
          resetAt: blockedUntil,
          error: `คุณส่งคำขอเร็วเกินไป กรุณารอ ${Math.ceil(config.blockDurationMs / 60000)} นาที`
        }
      }

      // Add new request timestamp
      requests.push(now)

      transaction.set(rateLimitRef, {
        userId,
        action,
        requests,
        blockedUntil: null,
        lastRequest: admin.firestore.FieldValue.serverTimestamp()
      })

      return {
        allowed: true,
        remaining: config.maxRequests - requests.length,
        resetAt: new Date(windowStart + config.windowMs)
      }
    })

    return result

  } catch (error) {
    console.error('Rate limit check error:', error)
    // Allow on error to prevent blocking legitimate users
    return { allowed: true, remaining: -1, error: 'Rate limit check failed' }
  }
}

/**
 * 🌐 Check rate limit by IP (In-memory, fast)
 * @param {string} ip - IP address
 * @param {string} action - Action type
 * @returns {Object} { allowed: boolean, remaining: number }
 */
function checkIPRateLimit(ip, action = 'general') {
  if (!ip) {
    return { allowed: true, remaining: -1 }
  }

  const config = RATE_LIMIT_CONFIG[action] || RATE_LIMIT_CONFIG.general
  const now = Date.now()
  const windowStart = now - config.windowMs
  const key = `${ip}_${action}`

  // Get or create entry
  let entry = ipRateLimitCache.get(key)
  if (!entry) {
    entry = { requests: [], blockedUntil: null }
    ipRateLimitCache.set(key, entry)
  }

  // Check if blocked
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      error: 'IP rate limited'
    }
  }

  // Filter old requests
  entry.requests = entry.requests.filter(ts => ts > windowStart)

  // Check limit
  if (entry.requests.length >= config.maxRequests) {
    entry.blockedUntil = now + config.blockDurationMs
    return {
      allowed: false,
      remaining: 0,
      error: 'Too many requests from this IP'
    }
  }

  // Add request
  entry.requests.push(now)

  return {
    allowed: true,
    remaining: config.maxRequests - entry.requests.length
  }
}

/**
 * 🧹 Cleanup old rate limit entries (run periodically)
 * @param {Object} db - Firestore instance
 */
async function cleanupRateLimits(db) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

  try {
    const snapshot = await db.collection('rateLimits')
      .where('lastRequest', '<', cutoff)
      .limit(100)
      .get()

    if (snapshot.empty) {
      console.log('✅ No old rate limits to cleanup')
      return { deleted: 0 }
    }

    const batch = db.batch()
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    await batch.commit()
    console.log(`🧹 Cleaned up ${snapshot.size} old rate limit entries`)

    return { deleted: snapshot.size }

  } catch (error) {
    console.error('Rate limit cleanup error:', error)
    return { deleted: 0, error: error.message }
  }
}

/**
 * 🧹 Cleanup in-memory IP cache (call periodically)
 */
function cleanupIPCache() {
  const now = Date.now()
  const cutoff = now - 60 * 60 * 1000 // 1 hour

  let cleaned = 0
  for (const [key, entry] of ipRateLimitCache.entries()) {
    const lastRequest = entry.requests[entry.requests.length - 1] || 0
    if (lastRequest < cutoff) {
      ipRateLimitCache.delete(key)
      cleaned++
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} IP rate limit entries from memory`)
  }

  return { cleaned }
}

/**
 * 🛡️ Express-style middleware for rate limiting
 * @param {string} action - Action type
 * @param {Object} options - Additional options
 */
function rateLimitMiddleware(action = 'general', options = {}) {
  return async (req, res, next) => {
    const db = admin.firestore()
    const userId = req.body?.studentId || req.body?.teacherId || req.body?.userId
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip

    // Check IP rate limit first (fast, in-memory)
    const ipResult = checkIPRateLimit(ip, action)
    if (!ipResult.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: ipResult.error,
        retryAfter: 60
      })
    }

    // Check user rate limit if userId present
    if (userId) {
      const userResult = await checkUserRateLimit(db, userId, action)
      if (!userResult.allowed) {
        return res.status(429).json({
          error: 'Rate Limit Exceeded',
          message: userResult.error,
          remaining: userResult.remaining,
          resetAt: userResult.resetAt
        })
      }

      // Add rate limit info to headers
      res.set('X-RateLimit-Remaining', String(userResult.remaining))
      res.set('X-RateLimit-Reset', userResult.resetAt?.toISOString())
    }

    // Continue to next handler
    if (typeof next === 'function') {
      next()
    }
  }
}

/**
 * 📊 Get rate limit stats for monitoring
 */
function getRateLimitStats() {
  return {
    ipCacheSize: ipRateLimitCache.size,
    config: RATE_LIMIT_CONFIG
  }
}

module.exports = {
  checkUserRateLimit,
  checkIPRateLimit,
  cleanupRateLimits,
  cleanupIPCache,
  rateLimitMiddleware,
  getRateLimitStats,
  RATE_LIMIT_CONFIG
}
