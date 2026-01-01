/**
 * 🔥 Firebase Shared Module
 * Centralized Firebase Admin SDK access
 * 
 * @module shared/firebase
 * @description 
 * Single source of truth for Firebase Admin and Firestore instances.
 * Note: Firebase is initialized in index.js, this module just exports references.
 * Import this module in all controllers and services that need database access.
 * 
 * @example
 * const { admin, db } = require('../shared/firebase')
 * const doc = await db.collection('users').doc(uid).get()
 */

const admin = require('firebase-admin')

// Get Firestore instance (assumes admin is already initialized in index.js)
// Use lazy initialization pattern to avoid issues with import order
let _db = null

function getDb() {
  if (!_db) {
    _db = admin.firestore()
  }
  return _db
}

// Proxy object that lazily gets db
const db = new Proxy({}, {
  get(target, prop) {
    return getDb()[prop]
  }
})

module.exports = {
  admin,
  get db() { return getDb() },
  FieldValue: admin.firestore.FieldValue,
  Timestamp: admin.firestore.Timestamp
}
