const { admin, db } = require('../shared/firebase')

// Helper function to set CORS headers
function setCorsHeaders(res) {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

/**
 * 🔐 Verify Teacher Role (includes admins)
 * Checks if the user has 'teacher', 'school_admin', 'esa_admin', or 'ministry_admin' role.
 * Returns user object if authorized, null if not (and sends response).
 */
async function verifyTeacherRole(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    setCorsHeaders(res)
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
      setCorsHeaders(res)
      res.status(403).send({ 
        error: 'Forbidden', 
        message: 'User profile not found',
        code: 'USER_NOT_FOUND'
      })
      return null
    }
    
    const role = userDoc.data()?.role
    const allowedRoles = ['teacher', 'school_admin', 'esa_admin', 'ministry_admin']
    
    if (!allowedRoles.includes(role)) {
      console.warn(`🚨 RBAC: User ${decoded.uid} (role: ${role}) attempted teacher-only action`)
      setCorsHeaders(res)
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
    setCorsHeaders(res)
    
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
 */
async function verifyAuthenticated(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    setCorsHeaders(res)
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
    setCorsHeaders(res)
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
 */
async function verifyAdminRole(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    setCorsHeaders(res)
    res.status(401).send({ error: 'Unauthorized', message: 'Missing auth token' })
    return null
  }
  
  try {
    const token = authHeader.split('Bearer ')[1]
    const decoded = await admin.auth().verifyIdToken(token)
    const userDoc = await db.collection('users').doc(decoded.uid).get()
    const role = userDoc.data()?.role
    
    const adminRoles = ['school_admin', 'esa_admin', 'ministry_admin']
    if (!adminRoles.includes(role)) {
      setCorsHeaders(res)
      res.status(403).send({ error: 'Forbidden', message: 'Admin access required' })
      return null
    }
    
    return { uid: decoded.uid, role }
  } catch (err) {
    setCorsHeaders(res)
    res.status(401).send({ error: 'Unauthorized', message: 'Invalid token' })
    return null
  }
}

module.exports = {
  verifyTeacherRole,
  verifyAuthenticated,
  verifyAdminRole,
  setCorsHeaders
}
