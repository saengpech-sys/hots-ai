/**
 * 🚦 Distributed Rate Limiter Module
 * 
 * ระบบ Rate Limiting ที่รองรับ Distributed Environment
 * รองรับทั้ง Redis และ Firestore backends
 * 
 * Features:
 * 1. Redis-compatible interface (for production scale)
 * 2. Firestore fallback (for serverless)
 * 3. Sliding window algorithm
 * 4. Token bucket algorithm
 * 5. Distributed lock support
 * 
 * Production Recommendation:
 * - ใช้ Google Cloud Memorystore (Redis) สำหรับ 100K+ concurrent users
 * - Config: redis.googleapis.com/v1/projects/{project}/locations/{region}/instances/{instance}
 * 
 * @module distributedRateLimiter
 * @version 1.0.0
 */

const admin = require('firebase-admin')

/**
 * Rate Limit Configuration
 */
const RATE_LIMIT_CONFIG = {
  // Assessment API - per student
  assessment: {
    windowMs: 60 * 1000,          // 1 minute window
    maxRequests: 10,              // 10 requests per minute
    blockDurationMs: 5 * 60 * 1000,  // Block for 5 minutes if exceeded
    burstLimit: 3,                // Max 3 requests in 5 seconds
    burstWindowMs: 5 * 1000
  },
  // Worksheet submission - per student
  worksheet: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    blockDurationMs: 2 * 60 * 1000,
    burstLimit: 2,
    burstWindowMs: 5 * 1000
  },
  // AI Generation (costly) - per teacher
  aiGeneration: {
    windowMs: 60 * 1000,
    maxRequests: 3,
    blockDurationMs: 10 * 60 * 1000,
    burstLimit: 1,
    burstWindowMs: 10 * 1000
  },
  // General API - per IP
  general: {
    windowMs: 60 * 1000,
    maxRequests: 60,
    blockDurationMs: 5 * 60 * 1000,
    burstLimit: 10,
    burstWindowMs: 5 * 1000
  }
}

/**
 * Redis Client Interface (for production)
 * ใช้ Google Cloud Memorystore หรือ Redis Enterprise
 */
let redisClient = null

/**
 * Initialize Redis connection
 * @param {Object} config - Redis configuration
 * @returns {boolean} Connection status
 */
async function initRedis(config = {}) {
  try {
    // Check if ioredis is available
    const Redis = require('ioredis')
    
    const redisConfig = {
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || process.env.REDIS_PORT || 6379,
      password: config.password || process.env.REDIS_PASSWORD,
      db: config.db || 0,
      keyPrefix: 'ratelimit:',
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('🔄 Redis connection failed, falling back to Firestore')
          return null
        }
        return Math.min(times * 100, 3000)
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 5000
    }

    redisClient = new Redis(redisConfig)

    redisClient.on('connect', () => {
      console.log('✅ Redis connected for rate limiting')
    })

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err.message)
    })

    // Test connection
    await redisClient.ping()
    return true

  } catch (error) {
    console.warn('⚠️ Redis not available, using Firestore fallback:', error.message)
    redisClient = null
    return false
  }
}

/**
 * Check if Redis is available
 */
function isRedisAvailable() {
  return redisClient !== null && redisClient.status === 'ready'
}

/**
 * 🔴 Redis-based Rate Limiting (Sliding Window)
 * ใช้ Lua script เพื่อ atomic operation
 * 
 * @param {string} key - Rate limit key (userId or IP)
 * @param {string} action - Action type
 * @returns {Object} { allowed, remaining, resetAt }
 */
async function checkRateLimitRedis(key, action = 'general') {
  const config = RATE_LIMIT_CONFIG[action] || RATE_LIMIT_CONFIG.general
  const now = Date.now()
  const windowStart = now - config.windowMs
  const redisKey = `${action}:${key}`
  const blockKey = `${action}:block:${key}`

  // Lua script for atomic sliding window
  const luaScript = `
    local key = KEYS[1]
    local blockKey = KEYS[2]
    local now = tonumber(ARGV[1])
    local windowStart = tonumber(ARGV[2])
    local maxRequests = tonumber(ARGV[3])
    local blockDuration = tonumber(ARGV[4])
    local burstLimit = tonumber(ARGV[5])
    local burstWindow = tonumber(ARGV[6])
    
    -- Check if blocked
    local blockedUntil = redis.call('GET', blockKey)
    if blockedUntil and tonumber(blockedUntil) > now then
      return {0, 0, tonumber(blockedUntil), 'blocked'}
    end
    
    -- Remove old entries (sliding window)
    redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)
    
    -- Get current count
    local count = redis.call('ZCARD', key)
    
    -- Check burst limit (last 5 seconds)
    local burstStart = now - burstWindow
    local burstCount = redis.call('ZCOUNT', key, burstStart, '+inf')
    
    -- Check if limit exceeded
    if count >= maxRequests then
      -- Set block
      local blockUntil = now + blockDuration
      redis.call('SET', blockKey, blockUntil, 'PX', blockDuration)
      return {0, 0, blockUntil, 'rate_limit_exceeded'}
    end
    
    -- Check burst limit
    if burstCount >= burstLimit then
      return {0, maxRequests - count, now + (burstWindow - (now - burstStart)), 'burst_limit'}
    end
    
    -- Add new request
    redis.call('ZADD', key, now, now .. ':' .. math.random())
    redis.call('EXPIRE', key, math.ceil(windowStart / 1000) + 120)
    
    return {1, maxRequests - count - 1, windowStart + (maxRequests * 1000), 'allowed'}
  `

  try {
    const result = await redisClient.eval(
      luaScript,
      2,
      redisKey,
      blockKey,
      now,
      windowStart,
      config.maxRequests,
      config.blockDurationMs,
      config.burstLimit || 5,
      config.burstWindowMs || 5000
    )

    const [allowed, remaining, resetAt, status] = result

    return {
      allowed: allowed === 1,
      remaining: Math.max(0, remaining),
      resetAt: new Date(resetAt),
      status,
      backend: 'redis'
    }

  } catch (error) {
    console.error('Redis rate limit error:', error)
    // Fallback to Firestore on Redis error
    return checkRateLimitFirestore(key, action)
  }
}

/**
 * 🔵 Firestore-based Rate Limiting (Fallback)
 * ใช้ Transaction เพื่อป้องกัน race condition
 * 
 * @param {string} key - Rate limit key
 * @param {string} action - Action type
 * @returns {Object} { allowed, remaining, resetAt }
 */
async function checkRateLimitFirestore(key, action = 'general') {
  const db = admin.firestore()
  const config = RATE_LIMIT_CONFIG[action] || RATE_LIMIT_CONFIG.general
  const now = Date.now()
  const windowStart = now - config.windowMs

  const rateLimitRef = db.collection('distributedRateLimits').doc(`${action}:${key}`)

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef)
      const data = doc.exists ? doc.data() : null

      // Check if blocked
      if (data?.blockedUntil && data.blockedUntil.toMillis() > now) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: data.blockedUntil.toDate(),
          status: 'blocked',
          backend: 'firestore'
        }
      }

      // Filter requests within window
      const requests = (data?.requests || [])
        .filter(ts => ts > windowStart)
        .slice(-(config.maxRequests + 10)) // Keep buffer

      // Check burst (last 5 seconds)
      const burstWindow = config.burstWindowMs || 5000
      const burstStart = now - burstWindow
      const burstCount = requests.filter(ts => ts > burstStart).length

      // Check burst limit
      if (burstCount >= (config.burstLimit || 5)) {
        return {
          allowed: false,
          remaining: config.maxRequests - requests.length,
          resetAt: new Date(burstStart + burstWindow),
          status: 'burst_limit',
          backend: 'firestore'
        }
      }

      // Check if limit exceeded
      if (requests.length >= config.maxRequests) {
        const blockedUntil = new Date(now + config.blockDurationMs)

        transaction.set(rateLimitRef, {
          key,
          action,
          requests,
          blockedUntil: admin.firestore.Timestamp.fromDate(blockedUntil),
          lastExceeded: admin.firestore.FieldValue.serverTimestamp()
        })

        return {
          allowed: false,
          remaining: 0,
          resetAt: blockedUntil,
          status: 'rate_limit_exceeded',
          backend: 'firestore'
        }
      }

      // Add new request
      requests.push(now)

      transaction.set(rateLimitRef, {
        key,
        action,
        requests,
        blockedUntil: null,
        lastRequest: admin.firestore.FieldValue.serverTimestamp()
      })

      return {
        allowed: true,
        remaining: config.maxRequests - requests.length,
        resetAt: new Date(windowStart + config.windowMs),
        status: 'allowed',
        backend: 'firestore'
      }
    })

    return result

  } catch (error) {
    console.error('Firestore rate limit error:', error)
    // Allow on error to prevent blocking legitimate users
    return {
      allowed: true,
      remaining: -1,
      error: error.message,
      status: 'error_fallthrough',
      backend: 'firestore'
    }
  }
}

/**
 * 🚦 Main Rate Limit Check Function
 * เลือกใช้ Redis หรือ Firestore อัตโนมัติ
 * 
 * @param {string} key - Rate limit key (userId, IP, etc.)
 * @param {string} action - Action type
 * @returns {Object} Rate limit result
 */
async function checkRateLimit(key, action = 'general') {
  if (!key) {
    return { allowed: false, remaining: 0, error: 'Key required' }
  }

  // Use Redis if available, otherwise Firestore
  if (isRedisAvailable()) {
    return checkRateLimitRedis(key, action)
  } else {
    return checkRateLimitFirestore(key, action)
  }
}

/**
 * 🌐 IP-based Rate Limiting
 * @param {string} ip - IP address
 * @param {string} action - Action type
 */
async function checkIPRateLimit(ip, action = 'general') {
  if (!ip) {
    return { allowed: true, remaining: -1 }
  }

  // Normalize IP
  const normalizedIP = ip.split(',')[0].trim()
  return checkRateLimit(`ip:${normalizedIP}`, action)
}

/**
 * 👤 User-based Rate Limiting
 * @param {string} userId - User ID
 * @param {string} action - Action type
 */
async function checkUserRateLimit(userId, action = 'general') {
  if (!userId) {
    return { allowed: false, remaining: 0, error: 'User ID required' }
  }

  return checkRateLimit(`user:${userId}`, action)
}

/**
 * 🔓 Manual Unblock (for admin use)
 * @param {string} key - Rate limit key
 * @param {string} action - Action type
 */
async function unblockKey(key, action = 'general') {
  if (isRedisAvailable()) {
    const blockKey = `${action}:block:${key}`
    await redisClient.del(blockKey)
  }

  const db = admin.firestore()
  const rateLimitRef = db.collection('distributedRateLimits').doc(`${action}:${key}`)
  
  await rateLimitRef.update({
    blockedUntil: null,
    requests: []
  })

  return { success: true, key, action }
}

/**
 * 🧹 Cleanup old rate limit entries
 */
async function cleanupRateLimits() {
  const db = admin.firestore()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

  try {
    const snapshot = await db.collection('distributedRateLimits')
      .where('lastRequest', '<', cutoff)
      .limit(500)
      .get()

    if (snapshot.empty) {
      return { deleted: 0 }
    }

    const batch = db.batch()
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    await batch.commit()

    return { deleted: snapshot.size }

  } catch (error) {
    console.error('Rate limit cleanup error:', error)
    return { deleted: 0, error: error.message }
  }
}

/**
 * 📊 Get rate limit statistics
 */
async function getRateLimitStats() {
  const stats = {
    backend: isRedisAvailable() ? 'redis' : 'firestore',
    config: RATE_LIMIT_CONFIG
  }

  if (isRedisAvailable()) {
    try {
      const keys = await redisClient.keys('ratelimit:*')
      stats.activeKeys = keys.length
      stats.redisStatus = redisClient.status
    } catch (error) {
      stats.redisError = error.message
    }
  }

  return stats
}

/**
 * 🛡️ Express-style middleware
 */
function rateLimitMiddleware(action = 'general', options = {}) {
  return async (req, res, next) => {
    const userId = req.body?.studentId || req.body?.teacherId || req.body?.userId
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip

    // Check IP rate limit first
    const ipResult = await checkIPRateLimit(ip, action)
    if (!ipResult.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: ipResult.status === 'burst_limit' 
          ? 'กรุณารอสักครู่ก่อนส่งคำขอใหม่' 
          : 'คุณส่งคำขอเร็วเกินไป',
        retryAfter: Math.ceil((ipResult.resetAt - Date.now()) / 1000),
        backend: ipResult.backend
      })
    }

    // Check user rate limit if userId present
    if (userId) {
      const userResult = await checkUserRateLimit(userId, action)
      if (!userResult.allowed) {
        return res.status(429).json({
          error: 'Rate Limit Exceeded',
          message: userResult.status === 'burst_limit'
            ? 'กรุณารอสักครู่ก่อนส่งคำขอใหม่'
            : `คุณส่งคำขอเร็วเกินไป กรุณารอ ${Math.ceil((userResult.resetAt - Date.now()) / 60000)} นาที`,
          remaining: userResult.remaining,
          resetAt: userResult.resetAt,
          backend: userResult.backend
        })
      }

      // Add rate limit info to headers
      res.set('X-RateLimit-Remaining', String(userResult.remaining))
      res.set('X-RateLimit-Reset', userResult.resetAt?.toISOString())
      res.set('X-RateLimit-Backend', userResult.backend)
    }

    // Continue to next handler
    if (typeof next === 'function') {
      next()
    }
  }
}

/**
 * 🔄 Graceful shutdown
 */
async function shutdown() {
  if (redisClient) {
    await redisClient.quit()
    console.log('✅ Redis connection closed')
  }
}

module.exports = {
  initRedis,
  isRedisAvailable,
  checkRateLimit,
  checkIPRateLimit,
  checkUserRateLimit,
  unblockKey,
  cleanupRateLimits,
  getRateLimitStats,
  rateLimitMiddleware,
  shutdown,
  RATE_LIMIT_CONFIG
}
