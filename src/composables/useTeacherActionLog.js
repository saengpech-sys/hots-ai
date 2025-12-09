/**
 * Teacher Action Logging Composable
 * Tracks teacher interactions for RQ4: Teacher-AI Collaboration research
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'

export function useTeacherActionLog(pageName = 'unknown') {
  const authStore = useAuthStore()
  
  // Tracking state
  const viewStartTime = ref(null)
  const scrollDepth = ref(0)
  const interactionCount = ref(0)
  const clickedElements = ref([])
  
  /**
   * Log a teacher action to Firestore
   * @param {string} actionType - Type of action (view, click, generate, export, intervention, etc.)
   * @param {object} details - Additional action details
   */
  async function logAction(actionType, details = {}) {
    if (!authStore.user?.uid) return
    if (authStore.userRole !== 'teacher') return
    
    try {
      await addDoc(collection(db, 'teacherActions'), {
        teacherId: authStore.user.uid,
        actionType,
        actionCategory: categorizeAction(actionType),
        pageName,
        targetType: details.targetType || null,
        targetId: details.targetId || null,
        context: {
          viewDurationMs: viewStartTime.value ? Date.now() - viewStartTime.value : 0,
          scrollDepth: scrollDepth.value,
          interactionCount: interactionCount.value,
          ...details.context
        },
        aiContext: {
          wasAIRecommended: details.wasAIRecommended || false,
          aiConfidence: details.aiConfidence || null,
          teacherAccepted: details.teacherAccepted || null,
          aiFeatureUsed: details.aiFeatureUsed || null
        },
        metadata: {
          userAgent: navigator.userAgent,
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          ...details.metadata
        },
        timestamp: serverTimestamp()
      })
    } catch (error) {
      console.error('Error logging teacher action:', error)
    }
  }
  
  /**
   * Categorize action types for analysis
   */
  function categorizeAction(actionType) {
    const categories = {
      // Dashboard viewing
      view_dashboard: 'viewing',
      view_report: 'viewing',
      view_analytics: 'viewing',
      view_student_detail: 'viewing',
      
      // AI-assisted actions
      generate_lo: 'ai_generation',
      generate_question: 'ai_generation',
      generate_lesson_plan: 'ai_generation',
      generate_worksheet: 'ai_generation',
      generate_feedback: 'ai_generation',
      
      // Data export
      export_csv: 'export',
      export_pdf: 'export',
      export_report: 'export',
      
      // Student intervention
      send_feedback: 'intervention',
      flag_student: 'intervention',
      create_micro_lesson: 'intervention',
      assign_remedial: 'intervention',
      
      // Content management
      create_course: 'content_management',
      edit_question: 'content_management',
      delete_item: 'content_management',
      
      // Navigation
      navigate: 'navigation',
      search: 'navigation',
      filter: 'navigation'
    }
    
    return categories[actionType] || 'other'
  }
  
  /**
   * Track page view duration
   */
  function startViewTracking() {
    viewStartTime.value = Date.now()
    scrollDepth.value = 0
    interactionCount.value = 0
  }
  
  /**
   * End view tracking and log
   */
  async function endViewTracking() {
    if (viewStartTime.value) {
      await logAction('view_' + pageName, {
        context: {
          totalViewMs: Date.now() - viewStartTime.value,
          maxScrollDepth: scrollDepth.value,
          totalInteractions: interactionCount.value
        }
      })
    }
  }
  
  /**
   * Track scroll depth
   */
  function handleScroll() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    const currentDepth = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0
    
    if (currentDepth > scrollDepth.value) {
      scrollDepth.value = currentDepth
    }
  }
  
  /**
   * Track interaction
   */
  function trackInteraction() {
    interactionCount.value++
  }
  
  // Specific action loggers
  
  /**
   * Log when teacher views a student's detail
   */
  async function logStudentView(studentId, studentName) {
    await logAction('view_student_detail', {
      targetType: 'student',
      targetId: studentId,
      metadata: { studentName }
    })
  }
  
  /**
   * Log AI generation action
   */
  async function logAIGeneration(featureType, targetId, params = {}) {
    await logAction('generate_' + featureType, {
      targetType: featureType,
      targetId,
      aiFeatureUsed: featureType,
      context: params
    })
  }
  
  /**
   * Log when teacher accepts/rejects AI recommendation
   */
  async function logAIRecommendation(featureType, accepted, confidence = null) {
    await logAction('ai_recommendation_response', {
      aiFeatureUsed: featureType,
      wasAIRecommended: true,
      teacherAccepted: accepted,
      aiConfidence: confidence
    })
  }
  
  /**
   * Log export action
   */
  async function logExport(exportType, recordCount) {
    await logAction('export_' + exportType, {
      targetType: 'export',
      context: { recordCount, exportType }
    })
  }
  
  /**
   * Log intervention action (when teacher helps student)
   */
  async function logIntervention(interventionType, studentId, details = {}) {
    await logAction(interventionType, {
      targetType: 'student',
      targetId: studentId,
      context: details
    })
  }
  
  /**
   * Log search/filter action
   */
  async function logSearch(searchTerm, resultCount) {
    await logAction('search', {
      context: {
        searchTerm,
        resultCount
      }
    })
  }
  
  /**
   * Log navigation between pages
   */
  async function logNavigation(fromPage, toPage) {
    await logAction('navigate', {
      context: {
        fromPage,
        toPage,
        viewDurationMs: viewStartTime.value ? Date.now() - viewStartTime.value : 0
      }
    })
  }
  
  // Lifecycle hooks
  onMounted(() => {
    startViewTracking()
    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('click', trackInteraction)
  })
  
  onUnmounted(() => {
    endViewTracking()
    window.removeEventListener('scroll', handleScroll)
    document.removeEventListener('click', trackInteraction)
  })
  
  return {
    // State
    viewStartTime,
    scrollDepth,
    interactionCount,
    
    // Methods
    logAction,
    logStudentView,
    logAIGeneration,
    logAIRecommendation,
    logExport,
    logIntervention,
    logSearch,
    logNavigation,
    startViewTracking,
    endViewTracking,
    trackInteraction
  }
}
