import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, auth } from '@/firebase/config'
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDoc } from 'firebase/firestore'

export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const currentReport = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const studentDetails = ref({}) // Cache student info by studentId

  // Computed
  const hasReport = computed(() => currentReport.value !== null)
  
  const rubricAverages = computed(() => {
    if (!currentReport.value?.analytics?.rubricAverages) return null
    return currentReport.value.analytics.rubricAverages
  })

  const studentPerformance = computed(() => {
    if (!currentReport.value?.analytics?.studentPerformance) return {}
    return currentReport.value.analytics.studentPerformance
  })

  const loMastery = computed(() => {
    if (!currentReport.value?.analytics?.loMastery) return {}
    return currentReport.value.analytics.loMastery
  })

  const strugglingStudents = computed(() => {
    if (!currentReport.value?.analytics?.strugglingStudents) return []
    return currentReport.value.analytics.strugglingStudents
  })

  const topPerformers = computed(() => {
    if (!currentReport.value?.analytics?.topPerformers) return []
    return currentReport.value.analytics.topPerformers
  })

  const totalStudents = computed(() => {
    if (!currentReport.value?.analytics?.totalStudents) return 0
    return currentReport.value.analytics.totalStudents
  })

  const totalAssessments = computed(() => {
    if (!currentReport.value?.analytics?.totalAssessments) return 0
    return currentReport.value.analytics.totalAssessments
  })

  // Actions
  async function generateReport(courseId, teacherId) {
    loading.value = true
    error.value = null

    try {
      const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'http://localhost:5001/hots-ai-chatloop/us-central1'
      
      // 🔐 Get Firebase ID Token for authentication
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('Not authenticated. Please login again.')
      }
      
      const response = await fetch(`${functionsUrl}/generateClassAnalytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId,
          teacherId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate report')
      }

      const data = await response.json()
      
      if (data.success) {
        // Load the generated report
        await loadReport(data.reportId)
        return data
      } else {
        throw new Error('Report generation failed')
      }

    } catch (err) {
      console.error('Generate report error:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadReport(reportId) {
    loading.value = true
    error.value = null

    try {
      const reportDoc = await getDoc(doc(db, 'classReports', reportId))
      
      if (reportDoc.exists()) {
        currentReport.value = {
          id: reportDoc.id,
          ...reportDoc.data()
        }
      } else {
        throw new Error('Report not found')
      }

    } catch (err) {
      console.error('Load report error:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadLatestReport(courseId) {
    loading.value = true
    error.value = null

    try {
      const reportsRef = collection(db, 'classReports')
      const q = query(
        reportsRef,
        where('courseId', '==', courseId),
        orderBy('generatedAt', 'desc'),
        limit(1)
      )

      return new Promise((resolve, reject) => {
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const reportDoc = snapshot.docs[0]
              currentReport.value = {
                id: reportDoc.id,
                ...reportDoc.data()
              }
              loading.value = false
              resolve(currentReport.value)
            } else {
              currentReport.value = null
              loading.value = false
              resolve(null)
            }
          },
          (err) => {
            console.error('Load latest report error:', err)
            error.value = err.message
            loading.value = false
            reject(err)
          }
        )

        // Return unsubscribe function for cleanup
        return unsubscribe
      })

    } catch (err) {
      console.error('Load latest report error:', err)
      error.value = err.message
      loading.value = false
      throw err
    }
  }

  async function fetchStudentDetails(studentId) {
    // Check cache first
    if (studentDetails.value[studentId]) {
      return studentDetails.value[studentId]
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', studentId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        studentDetails.value[studentId] = {
          studentId: userData.studentId || 'N/A',
          name: userData.displayName || userData.name || 'ไม่ระบุชื่อ',
          grade: userData.grade || '',
          room: userData.room || '',
          number: userData.number || ''
        }
        return studentDetails.value[studentId]
      }
      return null
    } catch (err) {
      console.error('Fetch student details error:', err)
      return null
    }
  }

  async function fetchAllStudentDetails(studentIds) {
    const promises = studentIds.map(id => fetchStudentDetails(id))
    await Promise.all(promises)
  }

  function clearReport() {
    currentReport.value = null
    error.value = null
  }

  function clearStudentCache() {
    studentDetails.value = {}
  }

  return {
    // State
    currentReport,
    loading,
    error,
    studentDetails,
    
    // Computed
    hasReport,
    rubricAverages,
    studentPerformance,
    loMastery,
    strugglingStudents,
    topPerformers,
    totalStudents,
    totalAssessments,
    
    // Actions
    generateReport,
    loadReport,
    loadLatestReport,
    fetchStudentDetails,
    fetchAllStudentDetails,
    clearReport,
    clearStudentCache
  }
})
