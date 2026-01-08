/**
 * Learning Progress Store
 * 
 * ติดตาม Learning Journey ของนักเรียน:
 * - Level 1: Soft Guidance (แนะนำให้อ่าน/ทำ)
 * - Level 2: Gated Progression (ต้องผ่านก่อนถึงจะไปต่อได้)
 * - Level 3: Smart Adaptive (AI เลือกคำถามตาม weak points)
 * 
 * Flow: Knowledge Sheet → Worksheet → Assessment
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '@/firebase/config'
import { 
  doc, setDoc, getDoc, getDocs, updateDoc,
  collection, query, where, serverTimestamp,
  orderBy, limit
} from 'firebase/firestore'
import { useAuthStore } from './auth'

export const useLearningProgressStore = defineStore('learningProgress', () => {
  const authStore = useAuthStore()
  
  // ================== STATE ==================
  
  // Knowledge Sheet Progress: { ksId: { readPercent, readAt, timeSpent, completed } }
  const knowledgeSheetProgress = ref({})
  
  // Worksheet Progress: { wsId: { score, passedLOs, completedAt, arceScores } }
  const worksheetProgress = ref({})
  
  // Unit Progress: { unitKey: { ksRead, wsPassed, wsScore, weakLOs } }
  const unitProgress = ref({})
  
  // Course Readiness: { courseId: { unitsCompleted, totalUnits, ready, weakLOs } }
  const courseReadiness = ref({})
  
  // Settings for each level
  const journeySettings = ref({
    level: 2, // Default to Level 2: Gated Progression
    // Level 1: Soft Guidance
    softGuidance: {
      showWarnings: true,
      allowSkip: true
    },
    // Level 2: Gated Progression
    gatedProgression: {
      requireKSRead: true,
      ksReadThreshold: 80, // ต้องอ่าน >= 80%
      requireWSPass: true,
      wsPassThreshold: 60, // ต้องได้ >= 60%
      requireUnitsForAssessment: 0.5 // ต้องผ่าน 50% ของหน่วยถึงจะ Assessment ได้
    },
    // Level 3: Smart Adaptive
    smartAdaptive: {
      enabled: true,
      personalizeQuestions: true,
      targetWeakLOs: true,
      scaffoldBasedOnWorksheet: true
    }
  })

  // Loading states
  const loading = ref(false)
  const error = ref(null)

  // ================== GETTERS ==================
  
  /**
   * ตรวจสอบว่าอ่าน Knowledge Sheet แล้วหรือยัง
   */
  const isKnowledgeSheetRead = computed(() => (ksId) => {
    const progress = knowledgeSheetProgress.value[ksId]
    if (!progress) return false
    
    const threshold = journeySettings.value.gatedProgression.ksReadThreshold
    return (progress.readPercent || 0) >= threshold
  })

  /**
   * ตรวจสอบว่าผ่าน Worksheet หรือยัง
   */
  const isWorksheetPassed = computed(() => (wsId) => {
    const progress = worksheetProgress.value[wsId]
    if (!progress) return false
    
    const threshold = journeySettings.value.gatedProgression.wsPassThreshold
    return (progress.score || 0) >= threshold
  })

  /**
   * ตรวจสอบความพร้อมสำหรับ Worksheet (ต้องอ่าน KS ก่อน)
   */
  const canStartWorksheet = computed(() => (wsId, relatedKsId) => {
    const level = journeySettings.value.level
    
    // Level 1: แค่แนะนำ ไม่บังคับ
    if (level === 1) return { allowed: true, reason: null }
    
    // Level 2-3: ต้องอ่าน KS ก่อน (ถ้ามี)
    if (!relatedKsId) return { allowed: true, reason: null }
    
    if (!journeySettings.value.gatedProgression.requireKSRead) {
      return { allowed: true, reason: null }
    }
    
    const ksRead = isKnowledgeSheetRead.value(relatedKsId)
    if (!ksRead) {
      return { 
        allowed: false, 
        reason: 'ต้องอ่านใบความรู้ก่อนถึงจะทำใบงานได้',
        requiredKsId: relatedKsId
      }
    }
    
    return { allowed: true, reason: null }
  })

  /**
   * ตรวจสอบความพร้อมสำหรับ Assessment (ต้องผ่าน Worksheet ก่อน)
   */
  const assessmentReadiness = computed(() => (courseId, requiredUnits = null) => {
    const level = journeySettings.value.level
    const progress = courseReadiness.value[courseId] || {}
    
    const unitsCompleted = progress.unitsCompleted || 0
    const totalUnits = progress.totalUnits || requiredUnits || 3
    const percent = totalUnits > 0 ? Math.round((unitsCompleted / totalUnits) * 100) : 0
    
    // Level 1: แค่แนะนำ
    if (level === 1) {
      return {
        ready: true,
        softWarning: unitsCompleted < totalUnits,
        unitsCompleted,
        totalUnits,
        percent,
        weakLOs: progress.weakLOs || [],
        message: unitsCompleted < totalUnits 
          ? `แนะนำให้เรียนครบทุกหน่วยก่อน (${unitsCompleted}/${totalUnits})` 
          : 'พร้อมแล้ว!'
      }
    }
    
    // Level 2-3: ต้องผ่านตามเกณฑ์
    const requiredPercent = journeySettings.value.gatedProgression.requireUnitsForAssessment * 100
    const ready = percent >= requiredPercent
    
    return {
      ready,
      unitsCompleted,
      totalUnits,
      percent,
      requiredPercent,
      weakLOs: progress.weakLOs || [],
      message: ready 
        ? 'พร้อมแล้ว! ไปประเมินกันเลย 🚀' 
        : `ต้องผ่านอย่างน้อย ${Math.ceil(totalUnits * journeySettings.value.gatedProgression.requireUnitsForAssessment)} หน่วย`
    }
  })

  /**
   * ดึงรายละเอียดความคืบหน้าแต่ละหน่วย
   */
  const getUnitProgressList = computed(() => (courseId) => {
    const units = []
    
    // รวบรวมข้อมูลจาก unitProgress ที่ตรงกับ course
    for (const [key, data] of Object.entries(unitProgress.value)) {
      if (key.startsWith(`${courseId}_`) || data.courseId === courseId) {
        units.push({
          unitKey: key,
          unitNumber: data.unitNumber || key.split('_')[1],
          unitName: data.unitName || `หน่วยที่ ${data.unitNumber || '?'}`,
          ksId: data.ksId,
          ksRead: data.ksRead || false,
          ksReadPercent: data.ksReadPercent || 0,
          wsId: data.wsId,
          wsPassed: data.wsPassed || false,
          wsScore: data.wsScore || 0,
          weakLOs: data.weakLOs || [],
          completedAt: data.completedAt
        })
      }
    }
    
    // เรียงตาม unit number
    return units.sort((a, b) => (a.unitNumber || 0) - (b.unitNumber || 0))
  })

  /**
   * ดึง Weak LOs จาก Worksheet ทั้งหมดสำหรับ Assessment
   */
  const getWeakLOsForAssessment = computed(() => (courseId) => {
    const weakLOs = new Set()
    
    for (const [wsId, progress] of Object.entries(worksheetProgress.value)) {
      if (progress.courseId === courseId && progress.weakLOs) {
        progress.weakLOs.forEach(lo => weakLOs.add(lo))
      }
    }
    
    // รวมจาก course readiness ด้วย
    const courseData = courseReadiness.value[courseId]
    if (courseData?.weakLOs) {
      courseData.weakLOs.forEach(lo => weakLOs.add(lo))
    }
    
    return Array.from(weakLOs)
  })

  // ================== ACTIONS ==================

  /**
   * โหลด Progress ทั้งหมดจาก Firestore
   */
  async function loadAllProgress() {
    const userId = authStore.user?.uid
    if (!userId) return
    
    loading.value = true
    error.value = null
    
    try {
      // โหลด Knowledge Sheet Progress
      const ksQuery = query(
        collection(db, 'learningProgress'),
        where('userId', '==', userId),
        where('type', '==', 'knowledgeSheet')
      )
      const ksSnap = await getDocs(ksQuery)
      ksSnap.forEach(doc => {
        const data = doc.data()
        knowledgeSheetProgress.value[data.ksId] = {
          readPercent: data.readPercent,
          readAt: data.readAt,
          timeSpent: data.timeSpent,
          completed: data.completed
        }
      })
      
      // โหลด Worksheet Progress
      const wsQuery = query(
        collection(db, 'learningProgress'),
        where('userId', '==', userId),
        where('type', '==', 'worksheet')
      )
      const wsSnap = await getDocs(wsQuery)
      wsSnap.forEach(doc => {
        const data = doc.data()
        worksheetProgress.value[data.wsId] = {
          score: data.score,
          passedLOs: data.passedLOs,
          weakLOs: data.weakLOs,
          arceScores: data.arceScores,
          completedAt: data.completedAt,
          courseId: data.courseId
        }
      })
      
      // โหลด Unit Progress
      const unitQuery = query(
        collection(db, 'learningProgress'),
        where('userId', '==', userId),
        where('type', '==', 'unit')
      )
      const unitSnap = await getDocs(unitQuery)
      unitSnap.forEach(doc => {
        const data = doc.data()
        // เก็บเฉพาะ field ที่มีค่า (ไม่ใช่ undefined)
        const unitData = {
          courseId: data.courseId,
          unitNumber: data.unitNumber,
          ksId: data.ksId,
          ksRead: data.ksRead,
          ksReadPercent: data.ksReadPercent,
          wsId: data.wsId,
          wsPassed: data.wsPassed,
          wsScore: data.wsScore,
          weakLOs: data.weakLOs,
          completedAt: data.completedAt
        }
        // เพิ่ม unitName เฉพาะเมื่อมีค่า
        if (data.unitName !== undefined) {
          unitData.unitName = data.unitName
        }
        unitProgress.value[data.unitKey] = unitData
      })
      
      // โหลด Course Readiness
      const courseQuery = query(
        collection(db, 'learningProgress'),
        where('userId', '==', userId),
        where('type', '==', 'courseReadiness')
      )
      const courseSnap = await getDocs(courseQuery)
      courseSnap.forEach(doc => {
        const data = doc.data()
        courseReadiness.value[data.courseId] = {
          unitsCompleted: data.unitsCompleted,
          totalUnits: data.totalUnits,
          weakLOs: data.weakLOs,
          lastUpdated: data.lastUpdated
        }
      })
      
      // โหลด Settings
      const settingsDoc = await getDoc(doc(db, 'userSettings', userId))
      if (settingsDoc.exists() && settingsDoc.data().journeySettings) {
        journeySettings.value = { ...journeySettings.value, ...settingsDoc.data().journeySettings }
      }
      
    } catch (err) {
      console.error('Error loading learning progress:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  /**
   * บันทึกว่าอ่าน Knowledge Sheet
   */
  async function markKnowledgeSheetRead(ksId, readPercent, timeSpent, metadata = {}) {
    const userId = authStore.user?.uid
    console.log('🔵 markKnowledgeSheetRead called:', { userId, ksId, readPercent })
    
    if (!userId || !ksId) {
      console.error('❌ Missing userId or ksId:', { userId, ksId })
      return null
    }
    
    const completed = readPercent >= journeySettings.value.gatedProgression.ksReadThreshold
    console.log('🔵 Completed:', completed, 'Threshold:', journeySettings.value.gatedProgression.ksReadThreshold)
    
    // อัพเดท local state
    knowledgeSheetProgress.value[ksId] = {
      readPercent,
      timeSpent,
      readAt: new Date(),
      completed
    }
    console.log('🔵 Local state updated:', knowledgeSheetProgress.value[ksId])
    
    // บันทึกลง Firestore
    const docId = `${userId}_ks_${ksId}`
    console.log('🔵 Saving to Firestore with docId:', docId)
    
    try {
      await setDoc(doc(db, 'learningProgress', docId), {
        userId,
        type: 'knowledgeSheet',
        ksId,
        readPercent,
        timeSpent,
        completed,
        readAt: serverTimestamp(),
        metadata: {
          ...metadata,
          courseId: metadata.courseId,
          unitNumber: metadata.unitNumber,
          planNumber: metadata.planNumber
        }
      }, { merge: true })
      
      console.log('✅ Firestore save success!')
    } catch (err) {
      console.error('❌ Firestore save error:', err)
      throw err
    }
    
    // อัพเดท Unit Progress ถ้ามี
    if (metadata.courseId && metadata.unitNumber) {
      await updateUnitProgress(metadata.courseId, metadata.unitNumber, {
        ksId,
        ksRead: completed,
        ksReadPercent: readPercent
      })
    }
    
    return { completed, readPercent }
  }

  /**
   * บันทึกผล Worksheet
   */
  async function recordWorksheetResult(wsId, result, metadata = {}) {
    const userId = authStore.user?.uid
    if (!userId || !wsId) return
    
    const score = result.score || result.percentage || 0
    const passed = score >= journeySettings.value.gatedProgression.wsPassThreshold
    
    // หา Weak LOs จาก ARCE scores
    const weakLOs = []
    if (result.arceScores) {
      const threshold = 3 // คะแนน < 3 ถือว่า weak
      if (result.arceScores.analysis < threshold) weakLOs.push('analysis')
      if (result.arceScores.reasoning < threshold) weakLOs.push('reasoning')
      if (result.arceScores.creativity < threshold) weakLOs.push('creativity')
      if (result.arceScores.evidence < threshold) weakLOs.push('evidence')
    }
    
    // เพิ่ม failed LOs จาก result
    if (result.failedLOs) {
      result.failedLOs.forEach(lo => {
        if (!weakLOs.includes(lo)) weakLOs.push(lo)
      })
    }
    
    // อัพเดท local state
    worksheetProgress.value[wsId] = {
      score,
      passedLOs: result.passedLOs || [],
      weakLOs,
      arceScores: result.arceScores,
      completedAt: new Date(),
      courseId: metadata.courseId
    }
    
    // บันทึกลง Firestore
    const docId = `${userId}_ws_${wsId}`
    await setDoc(doc(db, 'learningProgress', docId), {
      userId,
      type: 'worksheet',
      wsId,
      score,
      passed,
      passedLOs: result.passedLOs || [],
      weakLOs,
      arceScores: result.arceScores,
      completedAt: serverTimestamp(),
      courseId: metadata.courseId,
      metadata
    }, { merge: true })
    
    // อัพเดท Unit Progress
    if (metadata.courseId && metadata.unitNumber) {
      await updateUnitProgress(metadata.courseId, metadata.unitNumber, {
        wsId,
        wsPassed: passed,
        wsScore: score,
        weakLOs
      })
    }
    
    // อัพเดท Course Readiness
    if (metadata.courseId) {
      await recalculateCourseReadiness(metadata.courseId)
    }
    
    return { passed, score, weakLOs }
  }

  /**
   * อัพเดท Unit Progress
   */
  async function updateUnitProgress(courseId, unitNumber, updates) {
    const userId = authStore.user?.uid
    if (!userId) return
    
    const unitKey = `${courseId}_unit_${unitNumber}`
    
    // รวมกับข้อมูลเดิม
    const existing = unitProgress.value[unitKey] || {}
    const newData = {
      ...existing,
      ...updates,
      courseId,
      unitNumber
    }
    
    // ตรวจสอบว่าผ่านหน่วยนี้แล้วหรือยัง
    const ksRequired = journeySettings.value.gatedProgression.requireKSRead
    const ksOk = !ksRequired || newData.ksRead
    const wsOk = newData.wsPassed
    
    if (ksOk && wsOk) {
      newData.completedAt = new Date()
    }
    
    // อัพเดท local state
    unitProgress.value[unitKey] = newData
    
    // บันทึกลง Firestore - กรอง undefined values ออก
    const docId = `${userId}_unit_${unitKey}`
    const firestoreData = {
      userId,
      type: 'unit',
      unitKey,
      ...newData,
      updatedAt: serverTimestamp()
    }
    
    // ลบ field ที่มีค่า undefined ออก (Firestore ไม่รับ undefined)
    Object.keys(firestoreData).forEach(key => {
      if (firestoreData[key] === undefined) {
        delete firestoreData[key]
      }
    })
    
    await setDoc(doc(db, 'learningProgress', docId), firestoreData, { merge: true })
  }

  /**
   * คำนวณ Course Readiness ใหม่
   */
  async function recalculateCourseReadiness(courseId) {
    const userId = authStore.user?.uid
    if (!userId) return
    
    // นับหน่วยที่ผ่านแล้ว
    let unitsCompleted = 0
    let totalUnits = 0
    const allWeakLOs = new Set()
    
    for (const [key, data] of Object.entries(unitProgress.value)) {
      if (data.courseId === courseId) {
        totalUnits++
        
        const ksRequired = journeySettings.value.gatedProgression.requireKSRead
        const ksOk = !ksRequired || data.ksRead
        const wsOk = data.wsPassed
        
        if (ksOk && wsOk) {
          unitsCompleted++
        }
        
        // รวบรวม weak LOs
        if (data.weakLOs) {
          data.weakLOs.forEach(lo => allWeakLOs.add(lo))
        }
      }
    }
    
    // ถ้าไม่มี unit ให้ลองนับจาก worksheet progress
    if (totalUnits === 0) {
      for (const [wsId, data] of Object.entries(worksheetProgress.value)) {
        if (data.courseId === courseId) {
          totalUnits++
          if (data.score >= journeySettings.value.gatedProgression.wsPassThreshold) {
            unitsCompleted++
          }
          if (data.weakLOs) {
            data.weakLOs.forEach(lo => allWeakLOs.add(lo))
          }
        }
      }
    }
    
    // อัพเดท local state
    courseReadiness.value[courseId] = {
      unitsCompleted,
      totalUnits: totalUnits || 3, // default 3 หน่วย
      weakLOs: Array.from(allWeakLOs),
      lastUpdated: new Date()
    }
    
    // บันทึกลง Firestore
    const docId = `${userId}_course_${courseId}`
    await setDoc(doc(db, 'learningProgress', docId), {
      userId,
      type: 'courseReadiness',
      courseId,
      unitsCompleted,
      totalUnits: totalUnits || 3,
      weakLOs: Array.from(allWeakLOs),
      lastUpdated: serverTimestamp()
    }, { merge: true })
    
    return courseReadiness.value[courseId]
  }

  /**
   * อัพเดท Journey Settings
   */
  async function updateJourneySettings(newSettings) {
    const userId = authStore.user?.uid
    if (!userId) return
    
    journeySettings.value = { ...journeySettings.value, ...newSettings }
    
    await setDoc(doc(db, 'userSettings', userId), {
      journeySettings: journeySettings.value,
      updatedAt: serverTimestamp()
    }, { merge: true })
  }

  /**
   * ตั้งค่า Level (1, 2, หรือ 3)
   */
  async function setJourneyLevel(level) {
    if (level < 1 || level > 3) return
    await updateJourneySettings({ level })
  }

  /**
   * ดึงข้อมูลสำหรับ Assessment (Smart Adaptive - Level 3)
   */
  function getAssessmentContext(courseId) {
    if (journeySettings.value.level < 3 || !journeySettings.value.smartAdaptive.enabled) {
      return null
    }
    
    const weakLOs = getWeakLOsForAssessment.value(courseId)
    const unitProgressList = getUnitProgressList.value(courseId)
    
    // หา weak ARCE dimensions
    const weakDimensions = new Set()
    for (const unit of unitProgressList) {
      if (unit.weakLOs) {
        unit.weakLOs.forEach(lo => weakDimensions.add(lo))
      }
    }
    
    // รวบรวม ARCE scores เฉลี่ย
    let totalArce = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
    let arceCount = 0
    
    for (const [wsId, progress] of Object.entries(worksheetProgress.value)) {
      if (progress.courseId === courseId && progress.arceScores) {
        totalArce.analysis += progress.arceScores.analysis || 0
        totalArce.reasoning += progress.arceScores.reasoning || 0
        totalArce.creativity += progress.arceScores.creativity || 0
        totalArce.evidence += progress.arceScores.evidence || 0
        arceCount++
      }
    }
    
    const avgArce = arceCount > 0 ? {
      analysis: totalArce.analysis / arceCount,
      reasoning: totalArce.reasoning / arceCount,
      creativity: totalArce.creativity / arceCount,
      evidence: totalArce.evidence / arceCount
    } : null
    
    // หา weakest dimension
    let weakestDimension = null
    if (avgArce) {
      const dims = Object.entries(avgArce).sort((a, b) => a[1] - b[1])
      weakestDimension = dims[0][0]
    }
    
    return {
      weakLOs,
      weakDimensions: Array.from(weakDimensions),
      avgArceScores: avgArce,
      weakestDimension,
      shouldPersonalize: journeySettings.value.smartAdaptive.personalizeQuestions,
      shouldTargetWeakLOs: journeySettings.value.smartAdaptive.targetWeakLOs,
      shouldScaffold: journeySettings.value.smartAdaptive.scaffoldBasedOnWorksheet,
      unitProgressList
    }
  }

  /**
   * Reset progress (สำหรับ dev/testing)
   */
  async function resetProgress(courseId = null) {
    if (courseId) {
      // Reset specific course
      for (const key of Object.keys(unitProgress.value)) {
        if (key.startsWith(`${courseId}_`)) {
          delete unitProgress.value[key]
        }
      }
      for (const key of Object.keys(worksheetProgress.value)) {
        if (worksheetProgress.value[key]?.courseId === courseId) {
          delete worksheetProgress.value[key]
        }
      }
      delete courseReadiness.value[courseId]
    } else {
      // Reset all
      knowledgeSheetProgress.value = {}
      worksheetProgress.value = {}
      unitProgress.value = {}
      courseReadiness.value = {}
    }
  }

  return {
    // State
    knowledgeSheetProgress,
    worksheetProgress,
    unitProgress,
    courseReadiness,
    journeySettings,
    loading,
    error,
    
    // Getters
    isKnowledgeSheetRead,
    isWorksheetPassed,
    canStartWorksheet,
    assessmentReadiness,
    getUnitProgressList,
    getWeakLOsForAssessment,
    
    // Actions
    loadAllProgress,
    markKnowledgeSheetRead,
    recordWorksheetResult,
    updateUnitProgress,
    recalculateCourseReadiness,
    updateJourneySettings,
    setJourneyLevel,
    getAssessmentContext,
    resetProgress
  }
})
