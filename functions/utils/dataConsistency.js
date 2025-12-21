/**
 * 🔒 Data Consistency Module
 * 
 * ใช้ Firestore Transactions เพื่อรับประกัน data consistency
 * ป้องกัน race conditions และ partial updates
 */

const admin = require('firebase-admin')

/**
 * 💾 Save Assessment with Transaction
 * บันทึก assessment และ update studentProgress แบบ atomic
 * 
 * @param {Object} db - Firestore instance
 * @param {Object} assessmentData - Assessment data to save
 * @param {string} studentId - Student UID
 * @param {string} courseId - Course ID
 * @param {Array} newPassedLOs - New LOs that student passed
 * @returns {Object} { success, assessmentId, error }
 */
async function saveAssessmentWithTransaction(db, assessmentData, studentId, courseId, newPassedLOs = []) {
  const assessmentRef = db.collection('assessments').doc()
  const progressRef = db.collection('studentProgress').doc(`${studentId}_${courseId}`)
  
  try {
    const result = await db.runTransaction(async (transaction) => {
      // 1. Read current progress (if exists)
      const progressDoc = await transaction.get(progressRef)
      const currentProgress = progressDoc.exists ? progressDoc.data() : null
      
      // 2. Calculate new progress data
      let progressUpdate
      const currentDate = new Date().toISOString().split('T')[0]
      
      if (currentProgress) {
        // Update existing progress
        const existingLOs = currentProgress.passedLOs || []
        const mergedLOs = [...new Set([...existingLOs, ...newPassedLOs])]
        
        // Calculate streak
        const lastActive = currentProgress.lastActiveDate
        let newStreak = currentProgress.currentStreak || 0
        
        if (lastActive === currentDate) {
          // Same day - no change
        } else if (isYesterday(lastActive)) {
          newStreak += 1
        } else {
          newStreak = 1 // Reset streak
        }
        
        progressUpdate = {
          passedLOs: mergedLOs,
          totalPassed: mergedLOs.length,
          assessmentCount: admin.firestore.FieldValue.increment(1),
          lastAssessedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActiveDate: currentDate,
          currentStreak: newStreak,
          maxStreak: Math.max(newStreak, currentProgress.maxStreak || 0),
          totalPoints: admin.firestore.FieldValue.increment(assessmentData.pointsEarned || 0)
        }
      } else {
        // Create new progress
        progressUpdate = {
          studentId,
          courseId,
          passedLOs: newPassedLOs,
          totalPassed: newPassedLOs.length,
          assessmentCount: 1,
          firstAssessedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastAssessedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActiveDate: currentDate,
          currentStreak: 1,
          maxStreak: 1,
          totalPoints: assessmentData.pointsEarned || 0,
          badges: [],
          loProgress: {}
        }
      }
      
      // 3. Write assessment
      transaction.set(assessmentRef, {
        ...assessmentData,
        id: assessmentRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      // 4. Write/Update progress
      if (currentProgress) {
        transaction.update(progressRef, progressUpdate)
      } else {
        transaction.set(progressRef, progressUpdate)
      }
      
      return {
        assessmentId: assessmentRef.id,
        progressUpdated: true,
        newLOsCount: newPassedLOs.length,
        isNewProgress: !currentProgress
      }
    })
    
    return {
      success: true,
      ...result
    }
    
  } catch (error) {
    console.error('Transaction failed:', error)
    
    // Fallback: Try to save assessment without transaction
    // This ensures we don't lose the assessment data
    try {
      await assessmentRef.set({
        ...assessmentData,
        id: assessmentRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        _transactionFailed: true,
        _transactionError: error.message
      })
      
      return {
        success: true,
        assessmentId: assessmentRef.id,
        progressUpdated: false,
        warning: 'Assessment saved but progress update failed - will sync later'
      }
    } catch (fallbackError) {
      return {
        success: false,
        error: error.message,
        fallbackError: fallbackError.message
      }
    }
  }
}

/**
 * 🔄 Batch Update Multiple Documents
 * ใช้สำหรับ update หลาย documents พร้อมกัน
 */
async function batchUpdateDocuments(db, updates) {
  const batch = db.batch()
  const results = []
  
  for (const update of updates) {
    const { collection, docId, data, operation = 'update' } = update
    const ref = db.collection(collection).doc(docId)
    
    if (operation === 'set') {
      batch.set(ref, data)
    } else if (operation === 'update') {
      batch.update(ref, data)
    } else if (operation === 'delete') {
      batch.delete(ref)
    }
    
    results.push({ collection, docId, operation })
  }
  
  try {
    await batch.commit()
    return { success: true, results }
  } catch (error) {
    return { success: false, error: error.message, results }
  }
}

/**
 * 🔍 Sync Student Progress
 * ตรวจสอบและ sync ข้อมูล LO จาก assessments + worksheets
 * ใช้รัน scheduled หรือ manual เพื่อแก้ไข inconsistencies
 */
async function syncStudentProgress(db, studentId, courseId) {
  const progressRef = db.collection('studentProgress').doc(`${studentId}_${courseId}`)
  
  try {
    // 1. Get all assessments with passed LOs
    const assessmentsSnap = await db.collection('assessments')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .get()
    
    // 2. Get all worksheet submissions with passed LOs
    const worksheetsSnap = await db.collection('worksheetSubmissions')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .get()
    
    // 3. Collect all passed LOs
    const allPassedLOs = new Set()
    
    assessmentsSnap.forEach(doc => {
      const data = doc.data()
      if (data.loAssessment?.passedLOs) {
        data.loAssessment.passedLOs.forEach(lo => allPassedLOs.add(lo))
      }
    })
    
    worksheetsSnap.forEach(doc => {
      const data = doc.data()
      if (data.loAssessment?.passedLOs) {
        data.loAssessment.passedLOs.forEach(lo => allPassedLOs.add(lo))
      }
    })
    
    // 4. Update progress document
    const passedLOsArray = Array.from(allPassedLOs)
    
    await progressRef.set({
      passedLOs: passedLOsArray,
      totalPassed: passedLOsArray.length,
      assessmentCount: assessmentsSnap.size,
      worksheetCount: worksheetsSnap.size,
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
      syncSource: 'syncStudentProgress'
    }, { merge: true })
    
    return {
      success: true,
      studentId,
      courseId,
      passedLOsCount: passedLOsArray.length,
      assessmentsProcessed: assessmentsSnap.size,
      worksheetsProcessed: worksheetsSnap.size
    }
    
  } catch (error) {
    console.error('Sync failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 📊 Verify Data Consistency
 * ตรวจสอบว่าข้อมูลใน studentProgress ตรงกับ source documents
 */
async function verifyDataConsistency(db, studentId, courseId) {
  const issues = []
  
  try {
    // Get progress document
    const progressDoc = await db.collection('studentProgress')
      .doc(`${studentId}_${courseId}`).get()
    
    if (!progressDoc.exists) {
      return { consistent: true, issues: [], note: 'No progress document yet' }
    }
    
    const progress = progressDoc.data()
    const storedLOs = new Set(progress.passedLOs || [])
    
    // Get actual passed LOs from assessments
    const assessmentsSnap = await db.collection('assessments')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .get()
    
    const actualLOs = new Set()
    assessmentsSnap.forEach(doc => {
      const data = doc.data()
      if (data.loAssessment?.passedLOs) {
        data.loAssessment.passedLOs.forEach(lo => actualLOs.add(lo))
      }
    })
    
    // Get from worksheets too
    const worksheetsSnap = await db.collection('worksheetSubmissions')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .get()
    
    worksheetsSnap.forEach(doc => {
      const data = doc.data()
      if (data.loAssessment?.passedLOs) {
        data.loAssessment.passedLOs.forEach(lo => actualLOs.add(lo))
      }
    })
    
    // Compare
    const missingInProgress = [...actualLOs].filter(lo => !storedLOs.has(lo))
    const extraInProgress = [...storedLOs].filter(lo => !actualLOs.has(lo))
    
    if (missingInProgress.length > 0) {
      issues.push({
        type: 'MISSING_LOS',
        message: `${missingInProgress.length} LOs missing from progress`,
        details: missingInProgress
      })
    }
    
    if (extraInProgress.length > 0) {
      issues.push({
        type: 'EXTRA_LOS',
        message: `${extraInProgress.length} extra LOs in progress (not in source)`,
        details: extraInProgress
      })
    }
    
    // Check assessment count
    if (progress.assessmentCount !== assessmentsSnap.size) {
      issues.push({
        type: 'COUNT_MISMATCH',
        message: `Assessment count mismatch: stored ${progress.assessmentCount}, actual ${assessmentsSnap.size}`
      })
    }
    
    return {
      consistent: issues.length === 0,
      issues,
      storedLOsCount: storedLOs.size,
      actualLOsCount: actualLOs.size
    }
    
  } catch (error) {
    return {
      consistent: false,
      issues: [{ type: 'ERROR', message: error.message }]
    }
  }
}

/**
 * 📅 Check if date is yesterday
 */
function isYesterday(dateString) {
  if (!dateString) return false
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return dateString === yesterday.toISOString().split('T')[0]
}

/**
 * 🔐 Idempotency Key Generator
 * ใช้ป้องกัน duplicate operations
 */
function generateIdempotencyKey(studentId, sessionId, timestamp) {
  const crypto = require('crypto')
  const data = `${studentId}-${sessionId}-${timestamp}`
  return crypto.createHash('md5').update(data).digest('hex')
}

/**
 * 🔍 Check for Duplicate Submission
 */
async function checkDuplicateSubmission(db, idempotencyKey, windowMs = 60000) {
  const cutoff = new Date(Date.now() - windowMs)
  
  const existing = await db.collection('idempotencyKeys')
    .where('key', '==', idempotencyKey)
    .where('createdAt', '>', cutoff)
    .limit(1)
    .get()
  
  if (!existing.empty) {
    return {
      isDuplicate: true,
      existingId: existing.docs[0].id
    }
  }
  
  // Store key
  await db.collection('idempotencyKeys').add({
    key: idempotencyKey,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  })
  
  return { isDuplicate: false }
}

module.exports = {
  saveAssessmentWithTransaction,
  batchUpdateDocuments,
  syncStudentProgress,
  verifyDataConsistency,
  generateIdempotencyKey,
  checkDuplicateSubmission
}
