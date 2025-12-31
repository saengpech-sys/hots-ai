/**
 * 📚 Curriculum Designer Composable
 * 
 * Shared state and logic for CurriculumDesigner steps
 * 
 * Features:
 * - Course selection and validation
 * - Units management (CRUD + AI generation)
 * - Lesson plans management
 * - Research metadata tagging (Intervention types, LO integrity)
 * - Auto-save and persistence
 */

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { db } from '@/firebase/config'
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore'

// ============================================================================
// CONSTANTS
// ============================================================================

// Research intervention types for tagging
export const INTERVENTION_TYPES = [
  { id: '5e', name: '5E Model', description: 'Engage-Explore-Explain-Elaborate-Evaluate' },
  { id: 'inquiry', name: 'Inquiry-Based', description: 'การเรียนรู้แบบสืบเสาะ' },
  { id: 'pbl', name: 'Project-Based Learning', description: 'การเรียนรู้แบบโครงงาน' },
  { id: 'cbl', name: 'Case-Based Learning', description: 'การเรียนรู้จากกรณีศึกษา' },
  { id: 'direct', name: 'Direct Instruction', description: 'การสอนตรง' }
]

export const ARCE_LABELS = {
  analysis: 'A-วิเคราะห์',
  reasoning: 'R-เหตุผล',
  creativity: 'C-สร้างสรรค์',
  evidence: 'E-หลักฐาน'
}

export const ARCE_SHORT_LABELS = {
  analysis: 'A',
  reasoning: 'R',
  creativity: 'C',
  evidence: 'E'
}

// Shared state (singleton pattern)
const state = {
  // Course selection
  courses: ref([]),
  selectedCourseId: ref(''),
  selectedCourse: ref(null),
  loadingCurriculum: ref(false),
  hasExistingCurriculum: ref(false),
  
  // Curriculum data
  units: ref([]),
  currentStep: ref(0),
  curriculumId: ref(null),
  
  // Settings (including research metadata)
  settings: ref({
    semester: 2,
    academicYear: new Date().getFullYear() + 543,
    credits: 1,
    totalHours: 40,
    periodsPerWeek: 2,
    hotsRatio: '40',
    interventionType: '5e' // Default to 5E Model for research tracking
  }),
  
  // Course structure from AI
  courseStructure: ref(null),
  
  // AI generation
  isGenerating: ref(false),
  generationProgress: ref(0),
  generatingText: ref(''),
  generatingUnitIndex: ref(null),
  generatingAllPlans: ref(false),
  
  // Description editing
  editingDescription: ref(false),
  editedDescription: ref('')
}

// Step definitions
export const STEPS = [
  { id: 0, key: 'course', title: 'เลือกรายวิชา', desc: 'เลือกรายวิชาที่ต้องการสร้างหลักสูตร' },
  { id: 1, key: 'structure', title: 'โครงสร้างหลักสูตร', desc: 'AI วิเคราะห์และออกแบบ' },
  { id: 2, key: 'units', title: 'หน่วยการเรียนรู้', desc: 'สร้างรายละเอียดแต่ละหน่วย' },
  { id: 3, key: 'plans', title: 'แผนการจัดการเรียนรู้', desc: 'สร้างแผนการสอน 5E + ARCE' },
  { id: 4, key: 'materials', title: 'สื่อการเรียนรู้', desc: 'ใบความรู้และใบงาน' }
]

export function useCurriculumDesigner() {
  const router = useRouter()
  const authStore = useAuthStore()
  const notifications = useNotificationsStore()
  
  // ============================================================================
  // COMPUTED PROPERTIES
  // ============================================================================
  
  const getCourseDescription = computed(() => {
    return state.selectedCourse.value?.description || 
           state.selectedCourse.value?.courseDescription || ''
  })
  
  const availableLOs = computed(() => {
    return state.selectedCourse.value?.learningOutcomes || []
  })
  
  const isStepValid = computed(() => {
    switch (state.currentStep.value) {
      case 0: return !!state.selectedCourseId.value
      case 1: return !!state.courseStructure.value
      case 2: return state.units.value.length > 0 && state.units.value.every(u => u.generated)
      case 3: return true
      case 4: return true
      default: return false
    }
  })
  
  const totalPlansCount = computed(() => {
    return state.units.value.reduce((sum, unit) => sum + (unit.plans?.length || 0), 0)
  })
  
  const allUnitsGenerated = computed(() => {
    return state.units.value.length > 0 && state.units.value.every(u => u.generated)
  })
  
  // 🆕 Research: LO Integrity Check
  const loIntegrityStatus = computed(() => {
    const courseLOs = new Set(availableLOs.value.map(lo => lo.code))
    const usedLOs = new Set()
    const orphanedLOs = new Set()
    
    // Collect all LOs used in units and plans
    state.units.value.forEach(unit => {
      (unit.los || []).forEach(lo => {
        usedLOs.add(lo)
        if (!courseLOs.has(lo)) {
          orphanedLOs.add(lo)
        }
      })
      
      ;(unit.plans || []).forEach(plan => {
        (plan.los || []).forEach(lo => {
          usedLOs.add(lo)
          if (!courseLOs.has(lo)) {
            orphanedLOs.add(lo)
          }
        })
      })
    })
    
    const unusedLOs = [...courseLOs].filter(lo => !usedLOs.has(lo))
    
    return {
      isValid: orphanedLOs.size === 0 && unusedLOs.length === 0,
      orphanedLOs: [...orphanedLOs],
      unusedLOs,
      usedLOsCount: usedLOs.size,
      totalLOsCount: courseLOs.size
    }
  })
  
  // 🆕 Research: Get intervention type name
  const interventionTypeName = computed(() => {
    const type = INTERVENTION_TYPES.find(t => t.id === state.settings.value.interventionType)
    return type?.name || state.settings.value.interventionType
  })
  
  // ============================================================================
  // METHODS
  // ============================================================================
  
  async function loadCourses() {
    try {
      const q = query(
        collection(db, 'courses'),
        where('teacherId', '==', authStore.user?.uid),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      state.courses.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error loading courses:', error)
      notifications.showError('ไม่สามารถโหลดรายวิชาได้')
    }
  }
  
  async function selectCourse(courseId) {
    if (!courseId) {
      state.selectedCourse.value = null
      state.selectedCourseId.value = ''
      return
    }
    
    state.selectedCourseId.value = courseId
    state.loadingCurriculum.value = true
    
    try {
      // Load course
      const courseDoc = await getDoc(doc(db, 'courses', courseId))
      if (courseDoc.exists()) {
        state.selectedCourse.value = { id: courseDoc.id, ...courseDoc.data() }
      }
      
      // Check for existing curriculum
      const curriculumQ = query(
        collection(db, 'curriculums'),
        where('courseId', '==', courseId)
      )
      const curriculumSnapshot = await getDocs(curriculumQ)
      
      if (!curriculumSnapshot.empty) {
        const currDoc = curriculumSnapshot.docs[0]
        state.curriculumId.value = currDoc.id
        const data = currDoc.data()
        state.units.value = data.units || []
        state.currentStep.value = data.currentStep || 0
        state.hasExistingCurriculum.value = true
      } else {
        state.hasExistingCurriculum.value = false
        state.units.value = []
        state.curriculumId.value = null
      }
    } catch (error) {
      console.error('Error selecting course:', error)
      notifications.showError('ไม่สามารถโหลดข้อมูลรายวิชาได้')
    } finally {
      state.loadingCurriculum.value = false
    }
  }
  
  async function saveCurriculum() {
    try {
      const curriculumData = {
        courseId: state.selectedCourseId.value,
        teacherId: authStore.user?.uid,
        units: state.units.value,
        currentStep: state.currentStep.value,
        updatedAt: new Date().toISOString()
      }
      
      if (state.curriculumId.value) {
        await updateDoc(doc(db, 'curriculums', state.curriculumId.value), curriculumData)
      } else {
        const newRef = doc(collection(db, 'curriculums'))
        curriculumData.createdAt = new Date().toISOString()
        await setDoc(newRef, curriculumData)
        state.curriculumId.value = newRef.id
      }
      
      return true
    } catch (error) {
      console.error('Error saving curriculum:', error)
      notifications.showError('ไม่สามารถบันทึก Curriculum ได้')
      return false
    }
  }
  
  async function resetCurriculum() {
    if (state.curriculumId.value) {
      try {
        await deleteDoc(doc(db, 'curriculums', state.curriculumId.value))
      } catch (error) {
        console.error('Error deleting curriculum:', error)
      }
    }
    
    state.units.value = []
    state.currentStep.value = 0
    state.curriculumId.value = null
    state.hasExistingCurriculum.value = false
  }
  
  function goToStep(step) {
    if (step <= state.currentStep.value || isStepValid.value) {
      state.currentStep.value = step
      saveCurriculum()
    }
  }
  
  function nextStep() {
    if (isStepValid.value && state.currentStep.value < STEPS.length - 1) {
      state.currentStep.value++
      saveCurriculum()
    }
  }
  
  function prevStep() {
    if (state.currentStep.value > 0) {
      state.currentStep.value--
    }
  }
  
  // Description editing
  function startEditDescription() {
    state.editedDescription.value = getCourseDescription.value
    state.editingDescription.value = true
  }
  
  async function saveDescription() {
    try {
      await updateDoc(doc(db, 'courses', state.selectedCourseId.value), {
        description: state.editedDescription.value
      })
      
      if (state.selectedCourse.value) {
        state.selectedCourse.value.description = state.editedDescription.value
      }
      
      state.editingDescription.value = false
      notifications.showSuccess('บันทึกคำอธิบายแล้ว')
    } catch (error) {
      console.error('Error saving description:', error)
      notifications.showError('ไม่สามารถบันทึกคำอธิบายได้')
    }
  }
  
  function cancelEditDescription() {
    state.editingDescription.value = false
    state.editedDescription.value = ''
  }
  
  // Unit management
  function addUnit(unit) {
    state.units.value.push({
      id: Date.now().toString(),
      ...unit,
      los: unit?.los || [],
      plans: [],
      lessons: [],
      knowledgeSheets: [],
      generated: false,
      interventionType: state.settings.value.interventionType // Research metadata
    })
    saveCurriculum()
  }
  
  function updateUnit(unitId, updates) {
    const idx = state.units.value.findIndex(u => u.id === unitId)
    if (idx !== -1) {
      state.units.value[idx] = { ...state.units.value[idx], ...updates }
      saveCurriculum()
    }
  }
  
  function removeUnit(unitId) {
    state.units.value = state.units.value.filter(u => u.id !== unitId)
    saveCurriculum()
  }
  
  function reorderUnits(fromIdx, toIdx) {
    const unit = state.units.value.splice(fromIdx, 1)[0]
    state.units.value.splice(toIdx, 0, unit)
    saveCurriculum()
  }
  
  // Plan management
  function addPlanToUnit(unitIndex) {
    const unit = state.units.value[unitIndex]
    if (!unit) return
    
    const newPlan = {
      id: `plan-${Date.now()}`,
      topic: `แผนที่ ${(unit.plans?.length || 0) + 1}`,
      periods: 1,
      los: [],
      status: 'pending',
      arceFocus: null,
      interventionType: state.settings.value.interventionType // Research metadata
    }
    
    if (!unit.plans) unit.plans = []
    unit.plans.push(newPlan)
    saveCurriculum()
  }
  
  function removePlanFromUnit(unitIndex, planIndex) {
    const unit = state.units.value[unitIndex]
    if (!unit?.plans) return
    
    unit.plans.splice(planIndex, 1)
    saveCurriculum()
  }
  
  function updatePlan(unitIndex, planIndex, updates) {
    const unit = state.units.value[unitIndex]
    if (!unit?.plans?.[planIndex]) return
    
    unit.plans[planIndex] = { ...unit.plans[planIndex], ...updates }
    saveCurriculum()
  }
  
  // 🆕 Research: Export functions
  function exportToJSON() {
    const data = {
      metadata: {
        courseId: state.selectedCourseId.value,
        courseName: state.selectedCourse.value?.courseName,
        courseCode: state.selectedCourse.value?.courseCode,
        interventionType: state.settings.value.interventionType,
        exportDate: new Date().toISOString(),
        version: '1.0'
      },
      settings: state.settings.value,
      courseStructure: state.courseStructure.value,
      units: state.units.value,
      loIntegrity: loIntegrityStatus.value
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `curriculum-${state.selectedCourse.value?.courseCode || 'export'}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  function exportToCSV() {
    const BOM = '\uFEFF'
    let csv = BOM + 'หน่วย,ชื่อหน่วย,แผนที่,หัวข้อ,คาบ,LO,ARCE Focus,Intervention\n'
    
    state.units.value.forEach((unit, uIdx) => {
      (unit.plans || []).forEach((plan, pIdx) => {
        csv += `${uIdx + 1},"${unit.name}",${pIdx + 1},"${plan.topic}",${plan.periods || 1},"${(plan.los || []).join(';')}",${plan.arceFocus || ''},${plan.interventionType || state.settings.value.interventionType}\n`
      })
    })
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `curriculum-${state.selectedCourse.value?.courseCode || 'export'}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  // ============================================================================
  // RETURN
  // ============================================================================
  
  return {
    // State
    ...state,
    steps: STEPS,
    INTERVENTION_TYPES,
    ARCE_LABELS,
    ARCE_SHORT_LABELS,
    
    // Computed
    getCourseDescription,
    availableLOs,
    isStepValid,
    totalPlansCount,
    allUnitsGenerated,
    loIntegrityStatus,
    interventionTypeName,
    
    // Methods - Core
    loadCourses,
    selectCourse,
    saveCurriculum,
    resetCurriculum,
    goToStep,
    nextStep,
    prevStep,
    
    // Methods - Description
    startEditDescription,
    saveDescription,
    cancelEditDescription,
    
    // Methods - Units
    addUnit,
    updateUnit,
    removeUnit,
    reorderUnits,
    
    // Methods - Plans
    addPlanToUnit,
    removePlanFromUnit,
    updatePlan,
    
    // Methods - Research Export
    exportToJSON,
    exportToCSV
  }
}

export default useCurriculumDesigner