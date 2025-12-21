/**
 * 📚 Curriculum Designer Composable
 * 
 * Shared state and logic for CurriculumDesigner steps
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
  
  // AI generation
  isGenerating: ref(false),
  generationProgress: ref(0),
  
  // Description editing
  editingDescription: ref(false),
  editedDescription: ref('')
}

// Step definitions
export const STEPS = [
  { title: 'เลือกรายวิชา', desc: 'เลือกรายวิชาที่ต้องการสร้างหลักสูตร' },
  { title: 'โครงสร้างหลักสูตร', desc: 'สร้างหน่วยการเรียนรู้' },
  { title: 'เนื้อหา', desc: 'เพิ่มเนื้อหาและกิจกรรม' },
  { title: 'ใบความรู้', desc: 'สร้าง Knowledge Sheets' },
  { title: 'ตรวจสอบ', desc: 'Preview และเผยแพร่' }
]

export function useCurriculumDesigner() {
  const router = useRouter()
  const authStore = useAuthStore()
  const notifications = useNotificationsStore()
  
  // Computed
  const getCourseDescription = computed(() => {
    return state.selectedCourse.value?.description || 
           state.selectedCourse.value?.courseDescription || ''
  })
  
  const isStepValid = computed(() => {
    switch (state.currentStep.value) {
      case 0: return !!state.selectedCourseId.value
      case 1: return state.units.value.length > 0
      case 2: return state.units.value.every(u => u.lessons?.length > 0)
      case 3: return true
      case 4: return true
      default: return false
    }
  })
  
  // Methods
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
      lessons: [],
      knowledgeSheets: []
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
  
  return {
    // State
    ...state,
    steps: STEPS,
    
    // Computed
    getCourseDescription,
    isStepValid,
    
    // Methods
    loadCourses,
    selectCourse,
    saveCurriculum,
    resetCurriculum,
    goToStep,
    nextStep,
    prevStep,
    
    // Description
    startEditDescription,
    saveDescription,
    cancelEditDescription,
    
    // Units
    addUnit,
    updateUnit,
    removeUnit,
    reorderUnits
  }
}

export default useCurriculumDesigner
