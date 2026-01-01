/**
 * 🔐 Authentication & Authorization Shared Module
 * Role-Based Access Control (RBAC) helper functions
 * 
 * @module shared/auth
 * @description
 * Provides authentication and authorization utilities for Cloud Functions.
 * All controllers should use these functions for consistent security checks.
 * 
 * @example
 * const { verifyTeacherRole } = require('../shared/auth')
 * const caller = await verifyTeacherRole(req, res)
 * if (!caller) return // Response already sent
 */

const { admin, db } = require('./firebase')

// =============================================================================
// 🔐 ROLE DEFINITIONS
// =============================================================================

const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  SCHOOL_ADMIN: 'school_admin',
  ESA_ADMIN: 'esa_admin',
  MINISTRY_ADMIN: 'ministry_admin'
}

const TEACHER_ROLES = [ROLES.TEACHER, ROLES.SCHOOL_ADMIN, ROLES.ESA_ADMIN, ROLES.MINISTRY_ADMIN]
const ADMIN_ROLES = [ROLES.SCHOOL_ADMIN, ROLES.ESA_ADMIN, ROLES.MINISTRY_ADMIN]

// =============================================================================
// 🔐 AUTHENTICATION HELPERS
// =============================================================================

/**
 * Extract and verify Bearer token from request
 * @param {Request} req - Express request
 * @returns {Promise<Object|null>} Decoded token or null
 */
async function extractToken(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  
  try {
    const token = authHeader.split('Bearer ')[1]
    return await admin.auth().verifyIdToken(token)
  } catch (err) {
    console.error('🔐 Token verification failed:', err.message)
    return null
  }
}

/**
 * Get user role from Firestore
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} User data or null
 */
async function getUserData(uid) {
  try {
    const userDoc = await db.collection('users').doc(uid).get()
    if (!userDoc.exists) return null
    return userDoc.data()
  } catch (err) {
    console.error('🔐 Failed to get user data:', err.message)
    return null
  }
}

// =============================================================================
// 🔐 ROLE VERIFICATION FUNCTIONS
// =============================================================================

/**
 * 🔐 Verify that the caller has Teacher or Admin role
 * Use this for teacher-only endpoints (generateSolution, generateLessonPlan, etc.)
 * 
 * @param {Request} req - Express request with Authorization header
 * @param {Response} res - Express response
 * @returns {Promise<Object|null>} - { uid, role, email } if authorized, null if not
 */
async function verifyTeacherRole(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).send({ 
      error: 'Unauthorized', 
      message: 'Missing or invalid Authorization header. Please login again.',
      code: 'AUTH_MISSING'
    })
    return null
  }
  
  try {
    const token = authHeader.split('Bearer ')[1]
    const decoded = await admin.auth().verifyIdToken(token)
    const userDoc = await db.collection('users').doc(decoded.uid).get()
    
    if (!userDoc.exists) {
      res.status(403).send({ 
        error: 'Forbidden', 
        message: 'User profile not found',
        code: 'USER_NOT_FOUND'
      })
      return null
    }
    
    const role = userDoc.data()?.role
    
    if (!TEACHER_ROLES.includes(role)) {
      console.warn(`🚨 RBAC: User ${decoded.uid} (role: ${role}) attempted teacher-only action`)
      res.status(403).send({ 
        error: 'Forbidden', 
        message: 'This action requires teacher or admin privileges',
        code: 'INSUFFICIENT_ROLE'
      })
      return null
    }
    
    return { uid: decoded.uid, role, email: decoded.email }
  } catch (err) {
    console.error('🔐 Auth verification failed:', err.message)
    
    if (err.code === 'auth/id-token-expired') {
      res.status(401).send({ 
        error: 'Token Expired', 
        message: 'Your session has expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      })
    } else {
      res.status(401).send({ 
        error: 'Unauthorized', 
        message: 'Invalid authentication token',
        code: 'TOKEN_INVALID'
      })
    }
    return null
  }
}

/**
 * 🔐 Verify that the caller is authenticated (any role)
 * Use this for endpoints that just need login, not specific role
 * 
 * @param {Request} req - Express request with Authorization header
 * @param {Response} res - Express response
 * @returns {Promise<Object|null>} - { uid, email } if authenticated, null if not
 */
async function verifyAuthenticated(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).send({ 
      error: 'Unauthorized', 
      message: 'Authentication required',
      code: 'AUTH_MISSING'
    })
    return null
  }
  
  try {
    const token = authHeader.split('Bearer ')[1]
    const decoded = await admin.auth().verifyIdToken(token)
    return { uid: decoded.uid, email: decoded.email }
  } catch (err) {
    res.status(401).send({ 
      error: 'Unauthorized', 
      message: 'Invalid or expired token',
      code: 'TOKEN_INVALID'
    })
    return null
  }
}

/**
 * 🔐 Verify Admin role (school_admin, esa_admin, ministry_admin)
 * Use this for admin-only endpoints
 * 
 * @param {Request} req - Express request with Authorization header
 * @param {Response} res - Express response
 * @returns {Promise<Object|null>} - { uid, role } if admin, null if not
 */
async function verifyAdminRole(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).send({ error: 'Unauthorized', message: 'Missing auth token' })
    return null
  }
  
  try {
    const token = authHeader.split('Bearer ')[1]
    const decoded = await admin.auth().verifyIdToken(token)
    const userDoc = await db.collection('users').doc(decoded.uid).get()
    const role = userDoc.data()?.role
    
    if (!ADMIN_ROLES.includes(role)) {
      res.status(403).send({ error: 'Forbidden', message: 'Admin access required' })
      return null
    }
    
    return { uid: decoded.uid, role }
  } catch (err) {
    res.status(401).send({ error: 'Unauthorized', message: 'Invalid token' })
    return null
  }
}

/**
 * 🔐 Verify specific role(s)
 * Flexible role checker for custom authorization needs
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {string[]} allowedRoles - Array of allowed role names
 * @returns {Promise<Object|null>} - { uid, role, email } if authorized, null if not
 */
async function verifyRoles(req, res, allowedRoles) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).send({ error: 'Unauthorized', message: 'Missing auth token' })
    return null
  }
  
  try {
    const token = authHeader.split('Bearer ')[1]
    const decoded = await admin.auth().verifyIdToken(token)
    const userDoc = await db.collection('users').doc(decoded.uid).get()
    
    if (!userDoc.exists) {
      res.status(403).send({ error: 'Forbidden', message: 'User not found' })
      return null
    }
    
    const userData = userDoc.data()
    const role = userData?.role
    
    if (!allowedRoles.includes(role)) {
      res.status(403).send({ error: 'Forbidden', message: 'Insufficient permissions' })
      return null
    }
    
    return { uid: decoded.uid, role, email: decoded.email, userData }
  } catch (err) {
    res.status(401).send({ error: 'Unauthorized', message: 'Invalid token' })
    return null
  }
}

/**
 * 🔐 Get user info without sending error response
 * Useful when you want to handle errors yourself
 * 
 * @param {Request} req - Express request
 * @returns {Promise<Object|null>} - User info or null
 */
async function getUserFromRequest(req) {
  const decoded = await extractToken(req)
  if (!decoded) return null
  
  const userData = await getUserData(decoded.uid)
  if (!userData) return null
  
  return {
    uid: decoded.uid,
    email: decoded.email,
    role: userData.role,
    userData
  }
}

module.exports = {
  // Role constants
  ROLES,
  TEACHER_ROLES,
  ADMIN_ROLES,
  
  // Verification functions
  verifyTeacherRole,
  verifyAuthenticated,
  verifyAdminRole,
  verifyRoles,
  
  // Helper functions
  extractToken,
  getUserData,
  getUserFromRequest
}
