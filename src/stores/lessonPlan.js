import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '@/firebase/config'
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore'
import { useAuthStore } from './auth'

export const useLessonPlanStore = defineStore('lessonPlan', () => {
  const authStore = useAuthStore()
  
  // State
  const lessonPlans = ref([])
  const currentPlan = ref(null)
  const loading = ref(false)
  const generating = ref(false)
  const error = ref(null)

  // Getters
  const plansByCourse = computed(() => {
    return (courseId) => lessonPlans.value.filter(p => p.courseId === courseId)
  })

  const publishedPlans = computed(() => {
    return lessonPlans.value.filter(p => p.status === 'published')
  })

  const draftPlans = computed(() => {
    return lessonPlans.value.filter(p => p.status === 'draft')
  })

  // Actions
  async function fetchLessonPlans(courseId = null) {
    loading.value = true
    error.value = null
    
    try {
      let q
      if (courseId) {
        q = query(
          collection(db, 'lessonPlans'),
          where('courseId', '==', courseId),
          where('teacherId', '==', authStore.user?.uid),
          orderBy('createdAt', 'desc')
        )
      } else {
        q = query(
          collection(db, 'lessonPlans'),
          where('teacherId', '==', authStore.user?.uid),
          orderBy('createdAt', 'desc')
        )
      }
      
      const snapshot = await getDocs(q)
      lessonPlans.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (err) {
      console.error('Error fetching lesson plans:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function fetchPlanById(planId) {
    loading.value = true
    error.value = null
    
    try {
      const docRef = doc(db, 'lessonPlans', planId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        currentPlan.value = {
          id: docSnap.id,
          ...docSnap.data()
        }
        return currentPlan.value
      } else {
        throw new Error('Lesson plan not found')
      }
    } catch (err) {
      console.error('Error fetching lesson plan:', err)
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function generateLessonPlan(options = {}) {
    generating.value = true
    error.value = null
    
    try {
      const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL
      
      const response = await fetch(`${functionsUrl}/generateLessonPlan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: authStore.user?.uid,
          
          // Course Info
          courseId: options.courseId,
          courseCode: options.courseCode || '',
          courseName: options.courseName || '',
          courseDescription: options.courseDescription || '',
          subjectGroup: options.subjectGroup || 'วิทยาศาสตร์และเทคโนโลยี',
          learningOutcomes: options.learningOutcomes || [],
          
          // Basic Info
          gradeLevel: options.gradeLevel || 'ม.4',
          semester: options.semester || 2,
          academicYear: options.academicYear || (new Date().getFullYear() + 543),
          teacherName: options.teacherName || '',
          schoolName: options.schoolName || '',
          
          // Unit & Lesson
          unitNumber: options.unitNumber || 1,
          unitName: options.unitName || '',
          unitTotalHours: options.unitTotalHours || 16,
          planNumber: options.planNumber || 1,
          topic: options.topic || '',
          duration: options.duration || 50,
          teachingMethod: options.teachingMethod || '5E',
          
          // Standards & LOs
          standard: options.standard || '',
          indicatorTypes: options.indicatorTypes || ['final'],
          indicators: options.indicators || '',
          targetLOs: options.targetLOs || [],
          
          // Options
          hotsFocus: options.hotsFocus || ['analysis', 'reasoning', 'creativity', 'evidence'],
          desirableTraits: options.desirableTraits || ['discipline', 'diligent', 'determined'],
          competencies: options.competencies || ['communication', 'thinking', 'problem_solving', 'technology'],
          integration: options.integration || { worldClass: false, sufficiencyEconomy: false },
          learningStyle: options.learningStyle || 'mixed',
          additionalNotes: options.additionalNotes || ''
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Save to Firestore with complete course info
        const planData = {
          ...result.data,
          
          // Course Reference
          courseId: options.courseId,
          courseCode: options.courseCode || '',
          courseName: options.courseName || '',
          courseDescription: options.courseDescription || '',
          subjectGroup: options.subjectGroup || 'วิทยาศาสตร์และเทคโนโลยี',
          
          // Basic Info
          gradeLevel: options.gradeLevel || 'ม.4',
          semester: options.semester || 2,
          academicYear: options.academicYear,
          teacherName: options.teacherName || '',
          schoolName: options.schoolName || '',
          
          // Unit & Lesson
          unitNumber: options.unitNumber || 1,
          unitName: options.unitName || '',
          unitTotalHours: options.unitTotalHours || 16,
          planNumber: options.planNumber || 1,
          topic: options.topic || '',
          duration: options.duration || 50,
          teachingMethod: options.teachingMethod || '5E',
          
          // Standards
          standard: options.standard || '',
          indicatorTypes: options.indicatorTypes || ['final'],
          indicators: options.indicators || '',
          targetLOs: options.targetLOs || [],
          
          // Options
          hotsFocus: options.hotsFocus,
          desirableTraits: options.desirableTraits,
          competencies: options.competencies,
          integration: options.integration,
          learningStyle: options.learningStyle,
          
          // Meta
          teacherId: authStore.user?.uid,
          status: 'draft',
          aiGenerated: true,
          aiModel: 'gpt-4o-mini',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        
        const docRef = await addDoc(collection(db, 'lessonPlans'), planData)
        
        const newPlan = {
          id: docRef.id,
          ...planData,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        lessonPlans.value.unshift(newPlan)
        currentPlan.value = newPlan
        
        return newPlan
      } else {
        throw new Error(result.error || 'Failed to generate lesson plan')
      }
    } catch (err) {
      console.error('Error generating lesson plan:', err)
      error.value = err.message
      throw err
    } finally {
      generating.value = false
    }
  }

  // Alias for generateLessonPlan with cleaner API
  async function generateWithAI(options) {
    return await generateLessonPlan(options)
  }

  async function saveLessonPlan(planData) {
    loading.value = true
    error.value = null
    
    try {
      if (planData.id) {
        // Update existing
        const docRef = doc(db, 'lessonPlans', planData.id)
        await updateDoc(docRef, {
          ...planData,
          updatedAt: serverTimestamp()
        })
        
        const index = lessonPlans.value.findIndex(p => p.id === planData.id)
        if (index !== -1) {
          lessonPlans.value[index] = { ...planData, updatedAt: new Date() }
        }
      } else {
        // Create new
        const newPlan = {
          ...planData,
          teacherId: authStore.user?.uid,
          status: 'draft',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        
        const docRef = await addDoc(collection(db, 'lessonPlans'), newPlan)
        lessonPlans.value.unshift({
          id: docRef.id,
          ...newPlan,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    } catch (err) {
      console.error('Error saving lesson plan:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Create a new lesson plan
  async function createPlan(planData) {
    loading.value = true
    error.value = null
    
    try {
      const newPlan = {
        ...planData,
        teacherId: authStore.user?.uid,
        status: planData.status || 'draft',
        aiGenerated: planData.aiGenerated || false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      const docRef = await addDoc(collection(db, 'lessonPlans'), newPlan)
      
      const savedPlan = {
        id: docRef.id,
        ...newPlan,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      lessonPlans.value.unshift(savedPlan)
      currentPlan.value = savedPlan
      
      return savedPlan
    } catch (err) {
      console.error('Error creating lesson plan:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update an existing lesson plan
  async function updatePlan(planId, planData) {
    loading.value = true
    error.value = null
    
    try {
      const docRef = doc(db, 'lessonPlans', planId)
      await updateDoc(docRef, {
        ...planData,
        updatedAt: serverTimestamp()
      })
      
      const index = lessonPlans.value.findIndex(p => p.id === planId)
      if (index !== -1) {
        lessonPlans.value[index] = { 
          ...lessonPlans.value[index], 
          ...planData, 
          updatedAt: new Date() 
        }
      }
      
      if (currentPlan.value?.id === planId) {
        currentPlan.value = { ...currentPlan.value, ...planData, updatedAt: new Date() }
      }
    } catch (err) {
      console.error('Error updating lesson plan:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function publishPlan(planId) {
    try {
      const docRef = doc(db, 'lessonPlans', planId)
      await updateDoc(docRef, {
        status: 'published',
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      const index = lessonPlans.value.findIndex(p => p.id === planId)
      if (index !== -1) {
        lessonPlans.value[index].status = 'published'
        lessonPlans.value[index].publishedAt = new Date()
      }
    } catch (err) {
      console.error('Error publishing lesson plan:', err)
      error.value = err.message
      throw err
    }
  }

  async function deletePlan(planId) {
    try {
      // ก่อนลบ ดึงข้อมูลแผนเพื่อหา courseId
      const planDoc = await getDoc(doc(db, 'lessonPlans', planId))
      const planData = planDoc.exists() ? planDoc.data() : null
      
      // ลบจาก lessonPlans collection
      await deleteDoc(doc(db, 'lessonPlans', planId))
      lessonPlans.value = lessonPlans.value.filter(p => p.id !== planId)
      
      if (currentPlan.value?.id === planId) {
        currentPlan.value = null
      }
      
      // Sync กลับไปที่ course.curriculum ถ้ามี courseId
      if (planData?.courseId) {
        await removePlanFromCurriculum(planData.courseId, planId)
      }
      
      console.log('✅ Plan deleted and curriculum synced:', planId)
    } catch (err) {
      console.error('Error deleting lesson plan:', err)
      error.value = err.message
      throw err
    }
  }

  // ลบ planId ออกจาก course.curriculum
  async function removePlanFromCurriculum(courseId, planId) {
    try {
      const courseRef = doc(db, 'courses', courseId)
      const courseDoc = await getDoc(courseRef)
      
      if (courseDoc.exists()) {
        const courseData = courseDoc.data()
        const curriculum = courseData.curriculum
        
        if (curriculum?.units) {
          let updated = false
          
          // วนหาและลบ planId จากทุก unit
          curriculum.units.forEach(unit => {
            if (unit.plans) {
              unit.plans.forEach(plan => {
                if (plan.id === planId) {
                  // ลบ planId และ reset status
                  delete plan.id
                  plan.status = 'pending'
                  updated = true
                  console.log('🔄 Removed planId from curriculum:', planId)
                }
              })
            }
          })
          
          if (updated) {
            curriculum.updatedAt = new Date().toISOString()
            await updateDoc(courseRef, { curriculum })
            console.log('✅ Course curriculum synced')
          }
        }
      }
    } catch (error) {
      console.error('Error syncing curriculum:', error)
      // ไม่ throw เพราะการลบหลักสำเร็จแล้ว
    }
  }

  async function duplicatePlan(planId) {
    try {
      const original = lessonPlans.value.find(p => p.id === planId)
      if (!original) throw new Error('Plan not found')
      
      const { id, createdAt, updatedAt, publishedAt, ...planData } = original
      
      const newPlan = {
        ...planData,
        title: `${original.title} (สำเนา)`,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      const docRef = await addDoc(collection(db, 'lessonPlans'), newPlan)
      
      lessonPlans.value.unshift({
        id: docRef.id,
        ...newPlan,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      return docRef.id
    } catch (err) {
      console.error('Error duplicating lesson plan:', err)
      error.value = err.message
      throw err
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    lessonPlans,
    currentPlan,
    loading,
    generating,
    error,
    
    // Getters
    plansByCourse,
    publishedPlans,
    draftPlans,
    
    // Actions
    fetchLessonPlans,
    fetchPlanById,
    generateLessonPlan,
    generateWithAI,
    saveLessonPlan,
    createPlan,
    updatePlan,
    publishPlan,
    deletePlan,
    duplicatePlan,
    clearError
  }
})
