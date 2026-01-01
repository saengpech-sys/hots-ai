/**
 * 📦 Shared Modules Index
 * Re-exports all shared modules for convenient importing
 * 
 * @module shared
 * @description
 * Central export point for all shared utilities.
 * Import individual modules for better tree-shaking, or import from here for convenience.
 * 
 * @example
 * // Import specific modules (recommended)
 * const { admin, db } = require('./shared/firebase')
 * const { verifyTeacherRole } = require('./shared/auth')
 * 
 * // Or import everything (less optimal)
 * const shared = require('./shared')
 * const { admin, db } = shared.firebase
 */

const firebase = require('./firebase')
const auth = require('./auth')
const openai = require('./openai')
const constants = require('./constants')

module.exports = {
  // Firebase
  ...firebase,
  firebase,
  
  // Auth
  ...auth,
  auth,
  
  // OpenAI
  ...openai,
  openai,
  
  // Constants
  ...constants,
  constants
}
