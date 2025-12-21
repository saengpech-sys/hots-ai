/**
 * 🧪 Unit Tests for Auth Store
 * 
 * ทดสอบ authentication logic และ role-based access
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock Firebase
vi.mock('@/firebase/config', () => ({
  auth: {},
  db: {},
  googleProvider: {}
}))

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn()
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn()
}))

import { useAuthStore } from '@/stores/auth'

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    test('should have null user initially', () => {
      const store = useAuthStore()
      expect(store.user).toBeNull()
    })

    test('should have null userProfile initially', () => {
      const store = useAuthStore()
      expect(store.userProfile).toBeNull()
    })

    test('should be loading initially', () => {
      const store = useAuthStore()
      expect(store.loading).toBe(true)
    })

    test('should not be authenticated initially', () => {
      const store = useAuthStore()
      expect(store.isAuthenticated).toBe(false)
    })
  })

  describe('Role Checks', () => {
    test('isStudent should return true for student role', () => {
      const store = useAuthStore()
      store.userProfile = { role: 'student' }
      expect(store.isStudent).toBe(true)
      expect(store.isTeacher).toBe(false)
    })

    test('isTeacher should return true for teacher role', () => {
      const store = useAuthStore()
      store.userProfile = { role: 'teacher' }
      expect(store.isTeacher).toBe(true)
      expect(store.isStudent).toBe(false)
    })

    test('isParent should return true for parent role', () => {
      const store = useAuthStore()
      store.userProfile = { role: 'parent' }
      expect(store.isParent).toBe(true)
    })

    test('isAnyAdmin should return true for any admin role', () => {
      const store = useAuthStore()
      
      store.userProfile = { role: 'school_admin' }
      expect(store.isAnyAdmin).toBe(true)
      
      store.userProfile = { role: 'esa_admin' }
      expect(store.isAnyAdmin).toBe(true)
      
      store.userProfile = { role: 'ministry_admin' }
      expect(store.isAnyAdmin).toBe(true)
      
      store.userProfile = { role: 'student' }
      expect(store.isAnyAdmin).toBe(false)
    })
  })

  describe('Organization Context', () => {
    test('schoolId should return school ID from profile', () => {
      const store = useAuthStore()
      store.userProfile = { schoolId: 'school123' }
      expect(store.schoolId).toBe('school123')
    })

    test('schoolId should return null if not set', () => {
      const store = useAuthStore()
      store.userProfile = {}
      expect(store.schoolId).toBeNull()
    })

    test('esaId should return ESA ID from profile', () => {
      const store = useAuthStore()
      store.userProfile = { esaId: 'esa456' }
      expect(store.esaId).toBe('esa456')
    })

    test('organizationName should return organization name', () => {
      const store = useAuthStore()
      store.userProfile = { organizationName: 'Test School' }
      expect(store.organizationName).toBe('Test School')
    })

    test('organizationName should return empty string if not set', () => {
      const store = useAuthStore()
      store.userProfile = {}
      expect(store.organizationName).toBe('')
    })
  })

  describe('Authentication State', () => {
    test('isAuthenticated should be true when user exists', () => {
      const store = useAuthStore()
      store.user = { uid: '123', email: 'test@test.com' }
      expect(store.isAuthenticated).toBe(true)
    })

    test('isAuthenticated should be false when user is null', () => {
      const store = useAuthStore()
      store.user = null
      expect(store.isAuthenticated).toBe(false)
    })
  })

  describe('Consent', () => {
    test('consentAccepted should be false initially', () => {
      const store = useAuthStore()
      expect(store.consentAccepted).toBe(false)
    })

    test('showConsentModal should be false initially', () => {
      const store = useAuthStore()
      expect(store.showConsentModal).toBe(false)
    })
  })
})
