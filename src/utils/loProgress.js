/**
 * LO Progress Utility Functions
 * 
 * มาตรฐานสำหรับการนับ LO ที่ผ่านของนักเรียน
 * ใช้ function เดียวกันทุกที่เพื่อให้ข้อมูลตรงกัน 100%
 * 
 * หลักการ:
 * - ดึงข้อมูลจาก `assessments` collection (Assessment Chat)
 * - ดึงข้อมูลจาก `worksheetSubmissions` collection (Electronic Worksheets)
 * - นับ LO จาก `loAssessment.passedLOs` ในทุก assessment/submission
 * - รวม LO ที่ไม่ซ้ำกัน (unique)
 */

import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/config'

/**
 * Get unique passed LOs for a student in a specific course
 * Combines data from both assessments and worksheetSubmissions
 * @param {string} studentUid - Student's UID (auth uid)
 * @param {string} courseId - Course ID
 * @returns {Promise<{passedLOs: string[], assessmentCount: number, worksheetCount: number, assessments: Array, worksheets: Array}>}
 */
export async function getStudentPassedLOs(studentUid, courseId) {
  if (!studentUid || !courseId) {
    console.warn('[loProgress] Missing studentUid or courseId')
    return { passedLOs: [], assessmentCount: 0, worksheetCount: 0, assessments: [], worksheets: [] }
  }

  try {
    // Collect unique passed LOs from all sources
    const passedLOsSet = new Set()
    const assessments = []
    const worksheets = []
    
    // 1. Query assessments collection (Assessment Chat)
    const assessmentsRef = collection(db, 'assessments')
    const assessmentQuery = query(
      assessmentsRef,
      where('studentId', '==', studentUid),
      where('courseId', '==', courseId)
    )
    
    const assessmentSnapshot = await getDocs(assessmentQuery)
    
    assessmentSnapshot.docs.forEach(doc => {
      const assessment = doc.data()
      assessments.push({
        id: doc.id,
        type: 'assessment',
        ...assessment
      })
      
      if (assessment.loAssessment?.passedLOs) {
        assessment.loAssessment.passedLOs.forEach(lo => passedLOsSet.add(lo))
      }
    })

    // 2. Query worksheetSubmissions collection (Electronic Worksheets)
    const worksheetsRef = collection(db, 'worksheetSubmissions')
    const worksheetQuery = query(
      worksheetsRef,
      where('studentId', '==', studentUid),
      where('courseId', '==', courseId)
    )
    
    const worksheetSnapshot = await getDocs(worksheetQuery)
    
    worksheetSnapshot.docs.forEach(doc => {
      const worksheet = doc.data()
      worksheets.push({
        id: doc.id,
        type: 'worksheet',
        ...worksheet
      })
      
      // Check both loAssessment and assessment.loAssessment for passed LOs
      if (worksheet.loAssessment?.passedLOs) {
        worksheet.loAssessment.passedLOs.forEach(lo => passedLOsSet.add(lo))
      }
      if (worksheet.assessment?.loAssessment?.passedLOs) {
        worksheet.assessment.loAssessment.passedLOs.forEach(lo => passedLOsSet.add(lo))
      }
    })

    const result = {
      passedLOs: Array.from(passedLOsSet).sort(),
      assessmentCount: assessmentSnapshot.size,
      worksheetCount: worksheetSnapshot.size,
      assessments,
      worksheets
    }

    console.log(`[loProgress] Student ${studentUid} Course ${courseId}:`, {
      totalAssessments: result.assessmentCount,
      totalWorksheets: result.worksheetCount,
      uniquePassedLOs: result.passedLOs.length,
      passedLOs: result.passedLOs
    })

    return result
  } catch (error) {
    console.error('[loProgress] Error fetching student passed LOs:', error)
    return { passedLOs: [], assessmentCount: 0, worksheetCount: 0, assessments: [], worksheets: [] }
  }
}

/**
 * Get unique passed LOs for a student across ALL courses
 * Combines data from both assessments and worksheetSubmissions
 * @param {string} studentUid - Student's UID (auth uid)
 * @returns {Promise<{passedLOs: string[], assessmentCount: number, worksheetCount: number, courseBreakdown: Object}>}
 */
export async function getStudentAllPassedLOs(studentUid) {
  if (!studentUid) {
    console.warn('[loProgress] Missing studentUid')
    return { passedLOs: [], assessmentCount: 0, worksheetCount: 0, courseBreakdown: {} }
  }

  try {
    // Collect unique passed LOs from all sources, grouped by course
    const allPassedLOsSet = new Set()
    const courseBreakdown = {} // courseId -> Set of passed LOs
    let totalAssessments = 0
    let totalWorksheets = 0
    
    // 1. Query all assessments for this student
    const assessmentsRef = collection(db, 'assessments')
    const assessmentQuery = query(
      assessmentsRef,
      where('studentId', '==', studentUid)
    )
    
    const assessmentSnapshot = await getDocs(assessmentQuery)
    totalAssessments = assessmentSnapshot.size
    
    assessmentSnapshot.docs.forEach(doc => {
      const assessment = doc.data()
      const courseId = assessment.courseId
      
      if (!courseBreakdown[courseId]) {
        courseBreakdown[courseId] = new Set()
      }
      
      if (assessment.loAssessment?.passedLOs) {
        assessment.loAssessment.passedLOs.forEach(lo => {
          allPassedLOsSet.add(lo)
          courseBreakdown[courseId].add(lo)
        })
      }
    })

    // 2. Query all worksheetSubmissions for this student
    const worksheetsRef = collection(db, 'worksheetSubmissions')
    const worksheetQuery = query(
      worksheetsRef,
      where('studentId', '==', studentUid)
    )
    
    const worksheetSnapshot = await getDocs(worksheetQuery)
    totalWorksheets = worksheetSnapshot.size
    
    worksheetSnapshot.docs.forEach(doc => {
      const worksheet = doc.data()
      const courseId = worksheet.courseId
      
      if (!courseBreakdown[courseId]) {
        courseBreakdown[courseId] = new Set()
      }
      
      // Check both loAssessment and assessment.loAssessment
      if (worksheet.loAssessment?.passedLOs) {
        worksheet.loAssessment.passedLOs.forEach(lo => {
          allPassedLOsSet.add(lo)
          courseBreakdown[courseId].add(lo)
        })
      }
      if (worksheet.assessment?.loAssessment?.passedLOs) {
        worksheet.assessment.loAssessment.passedLOs.forEach(lo => {
          allPassedLOsSet.add(lo)
          courseBreakdown[courseId].add(lo)
        })
      }
    })

    // Convert Sets to Arrays
    const courseBreakdownArray = {}
    Object.keys(courseBreakdown).forEach(courseId => {
      courseBreakdownArray[courseId] = Array.from(courseBreakdown[courseId]).sort()
    })

    const result = {
      passedLOs: Array.from(allPassedLOsSet).sort(),
      assessmentCount: totalAssessments,
      worksheetCount: totalWorksheets,
      courseBreakdown: courseBreakdownArray
    }

    console.log(`[loProgress] Student ${studentUid} ALL courses:`, {
      totalAssessments: result.assessmentCount,
      totalWorksheets: result.worksheetCount,
      uniquePassedLOs: result.passedLOs.length,
      coursesCount: Object.keys(result.courseBreakdown).length
    })

    return result
  } catch (error) {
    console.error('[loProgress] Error fetching all student passed LOs:', error)
    return { passedLOs: [], assessmentCount: 0, worksheetCount: 0, courseBreakdown: {} }
  }
}

/**
 * Get passed LOs for multiple students in a course (batch operation)
 * Combines data from both assessments and worksheetSubmissions
 * @param {Array<string>} studentUids - Array of student UIDs
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} - Map of studentUid -> {passedLOs, assessmentCount, worksheetCount}
 */
export async function getBatchStudentPassedLOs(studentUids, courseId) {
  if (!studentUids?.length || !courseId) {
    console.warn('[loProgress] Missing studentUids or courseId for batch operation')
    return {}
  }

  try {
    // Initialize student data
    const studentData = {}
    studentUids.forEach(uid => {
      studentData[uid] = {
        passedLOsSet: new Set(),
        assessmentCount: 0,
        worksheetCount: 0
      }
    })
    
    // 1. Query assessments for this course
    const assessmentsRef = collection(db, 'assessments')
    const assessmentQuery = query(
      assessmentsRef,
      where('courseId', '==', courseId)
    )
    
    const assessmentSnapshot = await getDocs(assessmentQuery)
    
    assessmentSnapshot.docs.forEach(doc => {
      const assessment = doc.data()
      const studentId = assessment.studentId
      
      if (studentData[studentId]) {
        studentData[studentId].assessmentCount++
        
        if (assessment.loAssessment?.passedLOs) {
          assessment.loAssessment.passedLOs.forEach(lo => {
            studentData[studentId].passedLOsSet.add(lo)
          })
        }
      }
    })

    // 2. Query worksheetSubmissions for this course
    const worksheetsRef = collection(db, 'worksheetSubmissions')
    const worksheetQuery = query(
      worksheetsRef,
      where('courseId', '==', courseId)
    )
    
    const worksheetSnapshot = await getDocs(worksheetQuery)
    
    worksheetSnapshot.docs.forEach(doc => {
      const worksheet = doc.data()
      const studentId = worksheet.studentId
      
      if (studentData[studentId]) {
        studentData[studentId].worksheetCount++
        
        // Check both loAssessment and assessment.loAssessment
        if (worksheet.loAssessment?.passedLOs) {
          worksheet.loAssessment.passedLOs.forEach(lo => {
            studentData[studentId].passedLOsSet.add(lo)
          })
        }
        if (worksheet.assessment?.loAssessment?.passedLOs) {
          worksheet.assessment.loAssessment.passedLOs.forEach(lo => {
            studentData[studentId].passedLOsSet.add(lo)
          })
        }
      }
    })

    // Convert to final format
    const result = {}
    Object.keys(studentData).forEach(uid => {
      result[uid] = {
        passedLOs: Array.from(studentData[uid].passedLOsSet).sort(),
        assessmentCount: studentData[uid].assessmentCount,
        worksheetCount: studentData[uid].worksheetCount
      }
    })

    console.log(`[loProgress] Batch query for ${studentUids.length} students in course ${courseId}`)

    return result
  } catch (error) {
    console.error('[loProgress] Error in batch query:', error)
    return {}
  }
}

/**
 * Add LO to a student's assessment (Admin function)
 * @param {string} assessmentId - Assessment document ID
 * @param {string} loCode - LO code to add
 * @param {string} modifiedBy - UID of the teacher making the change
 * @returns {Promise<boolean>}
 */
export async function addLOToAssessment(assessmentId, loCode, modifiedBy) {
  if (!assessmentId || !loCode || !modifiedBy) {
    console.warn('[loProgress] Missing required parameters for addLOToAssessment')
    return false
  }

  try {
    const { doc, updateDoc, arrayUnion, serverTimestamp } = await import('firebase/firestore')
    
    const assessmentRef = doc(db, 'assessments', assessmentId)
    
    await updateDoc(assessmentRef, {
      'loAssessment.passedLOs': arrayUnion(loCode),
      'loAssessment.manuallyModified': true,
      'loAssessment.modifiedBy': modifiedBy,
      'loAssessment.modifiedAt': serverTimestamp()
    })

    console.log(`[loProgress] Added LO ${loCode} to assessment ${assessmentId} by ${modifiedBy}`)
    return true
  } catch (error) {
    console.error('[loProgress] Error adding LO to assessment:', error)
    return false
  }
}

/**
 * Remove LO from a student's assessment (Admin function)
 * @param {string} assessmentId - Assessment document ID
 * @param {string} loCode - LO code to remove
 * @param {string} modifiedBy - UID of the teacher making the change
 * @returns {Promise<boolean>}
 */
export async function removeLOFromAssessment(assessmentId, loCode, modifiedBy) {
  if (!assessmentId || !loCode || !modifiedBy) {
    console.warn('[loProgress] Missing required parameters for removeLOFromAssessment')
    return false
  }

  try {
    const { doc, updateDoc, arrayRemove, serverTimestamp } = await import('firebase/firestore')
    
    const assessmentRef = doc(db, 'assessments', assessmentId)
    
    await updateDoc(assessmentRef, {
      'loAssessment.passedLOs': arrayRemove(loCode),
      'loAssessment.manuallyModified': true,
      'loAssessment.modifiedBy': modifiedBy,
      'loAssessment.modifiedAt': serverTimestamp()
    })

    console.log(`[loProgress] Removed LO ${loCode} from assessment ${assessmentId} by ${modifiedBy}`)
    return true
  } catch (error) {
    console.error('[loProgress] Error removing LO from assessment:', error)
    return false
  }
}

/**
 * Update passedLOs array in an assessment (Admin function)
 * @param {string} assessmentId - Assessment document ID
 * @param {Array<string>} passedLOs - New array of passed LOs
 * @param {string} modifiedBy - UID of the teacher making the change
 * @returns {Promise<boolean>}
 */
export async function updateAssessmentPassedLOs(assessmentId, passedLOs, modifiedBy) {
  if (!assessmentId || !modifiedBy) {
    console.warn('[loProgress] Missing required parameters for updateAssessmentPassedLOs')
    return false
  }

  try {
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
    
    const assessmentRef = doc(db, 'assessments', assessmentId)
    
    await updateDoc(assessmentRef, {
      'loAssessment.passedLOs': passedLOs || [],
      'loAssessment.manuallyModified': true,
      'loAssessment.modifiedBy': modifiedBy,
      'loAssessment.modifiedAt': serverTimestamp()
    })

    console.log(`[loProgress] Updated LOs for assessment ${assessmentId}: ${passedLOs?.join(', ')}`)
    return true
  } catch (error) {
    console.error('[loProgress] Error updating assessment LOs:', error)
    return false
  }
}

/**
 * Calculate LO progress percentage
 * @param {string[]} passedLOs - Array of passed LO IDs
 * @param {Object[]} totalLOs - Array of all LO objects with id property
 * @returns {number} Progress percentage (0-100)
 */
export function calculateLOProgress(passedLOs, totalLOs) {
  if (!totalLOs || totalLOs.length === 0) return 0
  if (!passedLOs || passedLOs.length === 0) return 0
  
  const totalCount = totalLOs.length
  const passedCount = passedLOs.filter(loId => 
    totalLOs.some(lo => lo.id === loId)
  ).length
  
  return Math.min(100, Math.round((passedCount / totalCount) * 100))
}

/**
 * Get status of a specific LO
 * @param {string} loId - LO ID to check
 * @param {string[]} passedLOs - Array of passed LO IDs
 * @returns {'passed' | 'not-passed'}
 */
export function getLOStatus(loId, passedLOs) {
  if (!passedLOs || passedLOs.length === 0) return 'not-passed'
  return passedLOs.includes(loId) ? 'passed' : 'not-passed'
}

/**
 * Format passed LOs for display
 * @param {string[]} passedLOs - Array of passed LO IDs
 * @param {number} maxShow - Maximum LOs to show before truncating
 * @returns {string} Formatted display string
 */
export function formatPassedLOsDisplay(passedLOs, maxShow = 5) {
  if (!passedLOs || passedLOs.length === 0) return '-'
  
  if (passedLOs.length <= maxShow) {
    return passedLOs.join(', ')
  }
  
  const shown = passedLOs.slice(0, maxShow)
  const remaining = passedLOs.length - maxShow
  return `${shown.join(', ')}... (+${remaining})`
}

/**
 * Merge two LO sets without duplicates
 * @param {string[]} set1 - First set of LO IDs
 * @param {string[]} set2 - Second set of LO IDs
 * @returns {string[]} Merged and sorted LO IDs
 */
export function mergeLOSets(set1, set2) {
  const merged = new Set([...(set1 || []), ...(set2 || [])])
  return Array.from(merged).sort()
}

/**
 * 🚀 OPTIMIZED: Get passed LOs from denormalized studentProgress
 * This is faster than querying assessments + worksheetSubmissions
 * Use this for dashboard displays, fallback to full query if cache is stale
 * 
 * @param {string} studentUid - Student's UID
 * @param {string} courseId - Course ID
 * @returns {Promise<{passedLOs: string[], fromCache: boolean, lastUpdated: Date|null}>}
 */
export async function getStudentPassedLOsFast(studentUid, courseId) {
  if (!studentUid || !courseId) {
    return { passedLOs: [], fromCache: false, lastUpdated: null }
  }

  try {
    const { doc, getDoc } = await import('firebase/firestore')
    
    const progressId = `${studentUid}_${courseId}`
    const progressRef = doc(db, 'studentProgress', progressId)
    const progressSnap = await getDoc(progressRef)
    
    if (progressSnap.exists()) {
      const data = progressSnap.data()
      return {
        passedLOs: data.passedLOs || [],
        fromCache: true,
        lastUpdated: data.lastUpdatedAt?.toDate() || null,
        totalAssessments: data.assessmentCount || 0,
        totalWorksheets: data.worksheetCount || 0
      }
    }
    
    // Fallback to full query if no cached data
    console.log('[loProgress] No cached data, falling back to full query')
    const fullResult = await getStudentPassedLOs(studentUid, courseId)
    return {
      ...fullResult,
      fromCache: false,
      lastUpdated: null
    }
  } catch (error) {
    console.error('[loProgress] Error in fast query:', error)
    // Fallback to full query on error
    return await getStudentPassedLOs(studentUid, courseId)
  }
}

/**
 * 🚀 OPTIMIZED: Batch get passed LOs using denormalized studentProgress
 * Uses 1 query per student instead of 2 (assessments + worksheets)
 * 
 * @param {Array<string>} studentUids - Array of student UIDs
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} - Map of studentUid -> {passedLOs, fromCache}
 */
export async function getBatchStudentPassedLOsFast(studentUids, courseId) {
  if (!studentUids?.length || !courseId) {
    return {}
  }

  try {
    const { doc, getDoc } = await import('firebase/firestore')
    
    const results = {}
    const missingStudents = []
    
    // Query studentProgress for each student
    await Promise.all(studentUids.map(async (uid) => {
      const progressId = `${uid}_${courseId}`
      const progressRef = doc(db, 'studentProgress', progressId)
      
      try {
        const progressSnap = await getDoc(progressRef)
        
        if (progressSnap.exists()) {
          const data = progressSnap.data()
          results[uid] = {
            passedLOs: data.passedLOs || [],
            assessmentCount: data.assessmentCount || 0,
            worksheetCount: data.worksheetCount || 0,
            fromCache: true
          }
        } else {
          missingStudents.push(uid)
        }
      } catch (err) {
        console.warn(`[loProgress] Error fetching progress for ${uid}:`, err.message)
        missingStudents.push(uid)
      }
    }))
    
    // Fallback to full query for students without cached data
    if (missingStudents.length > 0) {
      console.log(`[loProgress] Falling back to full query for ${missingStudents.length} students`)
      const fallbackResults = await getBatchStudentPassedLOs(missingStudents, courseId)
      Object.assign(results, fallbackResults)
    }
    
    return results
  } catch (error) {
    console.error('[loProgress] Error in batch fast query:', error)
    // Fallback to full query
    return await getBatchStudentPassedLOs(studentUids, courseId)
  }
}

export default {
  getStudentPassedLOs,
  getStudentAllPassedLOs,
  getBatchStudentPassedLOs,
  getStudentPassedLOsFast,
  getBatchStudentPassedLOsFast,
  addLOToAssessment,
  removeLOFromAssessment,
  updateAssessmentPassedLOs,
  calculateLOProgress,
  getLOStatus,
  formatPassedLOsDisplay,
  mergeLOSets
}
