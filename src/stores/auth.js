import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth, googleProvider } from '@/firebase/config'
import { 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const userProfile = ref(null)
  const loading = ref(true)
  const consentAccepted = ref(false)
  const showConsentModal = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value)
  const isStudent = computed(() => userProfile.value?.role === 'student')
  const isTeacher = computed(() => userProfile.value?.role === 'teacher')
  const isParent = computed(() => userProfile.value?.role === 'parent')
  const isSchoolAdmin = computed(() => userProfile.value?.role === 'school_admin')
  const isESAAdmin = computed(() => userProfile.value?.role === 'esa_admin')
  const isMinistryAdmin = computed(() => userProfile.value?.role === 'ministry_admin')
  const isAnyAdmin = computed(() => isSchoolAdmin.value || isESAAdmin.value || isMinistryAdmin.value)
  
  // Organization context
  const schoolId = computed(() => userProfile.value?.schoolId || null)
  const esaId = computed(() => userProfile.value?.esaId || null)
  const organizationName = computed(() => userProfile.value?.organizationName || '')

  // Initialize auth state listener
  function initAuthListener() {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        user.value = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        }
        await loadUserProfile(firebaseUser.uid)
      } else {
        user.value = null
        userProfile.value = null
      }
      loading.value = false
    })
  }

  // Load user profile from Firestore
  async function loadUserProfile(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (userDoc.exists()) {
        userProfile.value = userDoc.data()
        consentAccepted.value = userProfile.value.consentAccepted || false
        
        // Show consent modal if not accepted
        if (!consentAccepted.value && !userProfile.value.deletionRequested) {
          setTimeout(() => {
            showConsentModal.value = true
          }, 1000)
        }
      } else {
        // Create default profile for new user
        userProfile.value = {
          role: 'student', // default role
          createdAt: new Date().toISOString()
        }
      }
    } catch (err) {
      console.error('Error loading user profile:', err)
      error.value = err.message
    }
  }

  // Sign in with Google
  async function signInWithGoogle() {
    try {
      loading.value = true
      error.value = null
      const result = await signInWithPopup(auth, googleProvider)
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))
      
      if (!userDoc.exists()) {
        // Create new user profile
        await setDoc(doc(db, 'users', result.user.uid), {
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          role: 'student', // default role
          createdAt: new Date().toISOString(),
          
          // Student-specific fields
          studentId: '', // To be filled by teacher/admin
          grade: '',
          gradeLevel: '',
          section: '',
          room: '',
          number: '',
          
          // Organization hierarchy (to be filled in ProfileSetup)
          schoolId: null,
          esaId: null,
          classroomId: null,

          // Consents
          consents: {
            researchConsent: false,
            competitionConsent: false,
            talentTrackingConsent: false
          }
        })
      }
      
      return result.user
    } catch (err) {
      console.error('Sign in error:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Sign out
  async function signOut() {
    try {
      // 🔧 FIX: Cleanup all store listeners before signing out
      // This prevents memory leaks and orphaned Firestore listeners
      await cleanupAllStoreListeners()
      
      await firebaseSignOut(auth)
      user.value = null
      userProfile.value = null
      consentAccepted.value = false
    } catch (err) {
      console.error('Sign out error:', err)
      error.value = err.message
      throw err
    }
  }

  /**
   * 🔧 Cleanup all Pinia store listeners
   * Call this before sign out to prevent orphaned listeners
   */
  async function cleanupAllStoreListeners() {
    try {
      // Import stores dynamically to avoid circular dependencies
      const { useGamificationStore } = await import('./gamification')
      const { useChatStore } = await import('./chat')
      const { useNotificationStore } = await import('./notifications')
      const { useLearningPathStore } = await import('./learningPath')
      
      // Call cleanup on each store if available
      const gamificationStore = useGamificationStore()
      if (gamificationStore.cleanup) {
        gamificationStore.cleanup()
      }
      
      const chatStore = useChatStore()
      if (chatStore.cleanup) {
        chatStore.cleanup()
      }
      
      const notificationStore = useNotificationStore()
      if (notificationStore.cleanup) {
        notificationStore.cleanup()
      }
      
      const learningPathStore = useLearningPathStore()
      if (learningPathStore.cleanup) {
        learningPathStore.cleanup()
      }
      
      console.log('✅ All store listeners cleaned up')
    } catch (err) {
      console.warn('Warning during store cleanup:', err.message)
      // Don't throw - cleanup errors shouldn't block sign out
    }
  }

  // Update user profile
  async function updateUserProfile(data) {
    try {
      loading.value = true
      const userRef = doc(db, 'users', user.value.uid)
      await setDoc(userRef, data, { merge: true })
      
      // Update local state
      userProfile.value = { ...userProfile.value, ...data }
      return true
    } catch (err) {
      console.error('Error updating profile:', err)
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Update consents
  async function updateConsents(consents) {
    return await updateUserProfile({ consents })
  }

  // 🆕 PDPA Functions
  async function acceptConsent() {
    if (!user.value) return
    
    try {
      const { serverTimestamp, addDoc, collection } = await import('firebase/firestore')
      const userRef = doc(db, 'users', user.value.uid)
      await setDoc(userRef, {
        consentAccepted: true,
        consentAcceptedAt: serverTimestamp()
      }, { merge: true })
      
      consentAccepted.value = true
      showConsentModal.value = false
      
      // Log audit
      await addDoc(collection(db, 'auditLogs'), {
        userId: user.value.uid,
        action: 'CONSENT_ACCEPTED',
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent
      })
      
      if (userProfile.value) {
        userProfile.value.consentAccepted = true
      }
    } catch (error) {
      console.error('Error accepting consent:', error)
      throw error
    }
  }

  async function downloadUserData() {
    if (!user.value) return
    
    try {
      const { query, where, getDocs, collection } = await import('firebase/firestore')
      
      const userData = {
        profile: userProfile.value,
        assessments: [],
        progress: [],
        exportDate: new Date().toISOString()
      }
      
      // Get assessments
      const assessmentsQuery = query(
        collection(db, 'assessments'),
        where('studentId', '==', user.value.uid)
      )
      const assessmentsSnap = await getDocs(assessmentsQuery)
      userData.assessments = assessmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Get progress
      const progressQuery = query(
        collection(db, 'studentProgress'),
        where('studentId', '==', user.value.uid)
      )
      const progressSnap = await getDocs(progressQuery)
      userData.progress = progressSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Create JSON file
      const dataStr = JSON.stringify(userData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `my-hots-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      // Log audit
      const { serverTimestamp, addDoc } = await import('firebase/firestore')
      await addDoc(collection(db, 'auditLogs'), {
        userId: user.value.uid,
        action: 'DATA_DOWNLOAD',
        timestamp: serverTimestamp()
      })
      
      return true
    } catch (error) {
      console.error('Error downloading data:', error)
      throw error
    }
  }

  async function requestAccountDeletion() {
    if (!user.value) return
    
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี? ข้อมูลจะถูกลบถาวรภายใน 30 วัน')) {
      return false
    }
    
    try {
      const { serverTimestamp, addDoc, collection } = await import('firebase/firestore')
      const userRef = doc(db, 'users', user.value.uid)
      await setDoc(userRef, {
        deletionRequested: true,
        deletionRequestedAt: serverTimestamp(),
        deletionScheduledAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }, { merge: true })
      
      // Log audit
      await addDoc(collection(db, 'auditLogs'), {
        userId: user.value.uid,
        action: 'DELETION_REQUESTED',
        timestamp: serverTimestamp()
      })
      
      await signOut()
      return true
    } catch (error) {
      console.error('Error requesting deletion:', error)
      throw error
    }
  }

  /**
   * 🔐 Get Firebase ID Token for API calls
   * Use this for authenticated API requests to Cloud Functions
   * @returns {Promise<string|null>} JWT token or null if not authenticated
   */
  async function getIdToken() {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        console.warn('🔐 getIdToken: No current user')
        return null
      }
      return await currentUser.getIdToken()
    } catch (error) {
      console.error('🔐 getIdToken error:', error)
      return null
    }
  }

  return {
    user,
    userProfile,
    loading,
    error,
    consentAccepted,
    showConsentModal,
    isAuthenticated,
    isStudent,
    isTeacher,
    isParent,
    isSchoolAdmin,
    isESAAdmin,
    isMinistryAdmin,
    isAnyAdmin,
    schoolId,
    esaId,
    organizationName,
    initAuthListener,
    signInWithGoogle,
    signOut,
    updateUserProfile,
    updateConsents,
    acceptConsent,
    downloadUserData,
    requestAccountDeletion,
    getIdToken  // 🆕 For authenticated API calls
  }
})
