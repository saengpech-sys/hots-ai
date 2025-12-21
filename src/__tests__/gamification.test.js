/**
 * 🧪 Unit Tests for Gamification Store
 * 
 * ทดสอบ gamification logic: points, badges, levels, streaks
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock Firebase
vi.mock('@/firebase/config', () => ({
  db: {}
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn()
}))

vi.mock('@/utils/loProgress', () => ({
  getStudentPassedLOs: vi.fn().mockResolvedValue({
    passedLOs: [],
    assessmentCount: 0,
    worksheetCount: 0
  })
}))

import { useGamificationStore } from '@/stores/gamification'

describe('Gamification Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    test('should have 0 total points initially', () => {
      const store = useGamificationStore()
      expect(store.totalPoints).toBe(0)
    })

    test('should have 0 current streak initially', () => {
      const store = useGamificationStore()
      expect(store.currentStreak).toBe(0)
    })

    test('should have empty badges initially', () => {
      const store = useGamificationStore()
      expect(store.earnedBadges).toEqual([])
    })

    test('should be at level 1 initially', () => {
      const store = useGamificationStore()
      expect(store.level).toBe(1)
    })
  })

  describe('Level Calculation', () => {
    test('should be level 1 with less than 100 points', () => {
      const store = useGamificationStore()
      store.studentProgress = { totalPoints: 50 }
      expect(store.level).toBe(1)
    })

    test('should be level 2 with 100-249 points', () => {
      const store = useGamificationStore()
      store.studentProgress = { totalPoints: 150 }
      expect(store.level).toBe(2)
    })

    test('should be level 3 with 250-499 points', () => {
      const store = useGamificationStore()
      store.studentProgress = { totalPoints: 300 }
      expect(store.level).toBe(3)
    })

    test('should be level 4 with 500-999 points', () => {
      const store = useGamificationStore()
      store.studentProgress = { totalPoints: 750 }
      expect(store.level).toBe(4)
    })

    test('should be level 5 with 1000-1999 points', () => {
      const store = useGamificationStore()
      store.studentProgress = { totalPoints: 1500 }
      expect(store.level).toBe(5)
    })

    test('should calculate higher levels correctly', () => {
      const store = useGamificationStore()
      store.studentProgress = { totalPoints: 3000 }
      expect(store.level).toBe(7) // Math.floor(3000/500) + 1 = 7
    })
  })

  describe('Points to Next Level', () => {
    test('should calculate points needed for level 2', () => {
      const store = useGamificationStore()
      store.studentProgress = { totalPoints: 50 }
      expect(store.pointsToNextLevel).toBe(50) // 100 - 50
    })

    test('should calculate points needed for level 3', () => {
      const store = useGamificationStore()
      store.studentProgress = { totalPoints: 150 }
      expect(store.pointsToNextLevel).toBe(100) // 250 - 150
    })
  })

  describe('Level Progress', () => {
    test('should be 50% progress towards level 2', () => {
      const store = useGamificationStore()
      store.studentProgress = { totalPoints: 50 }
      expect(store.levelProgress).toBe(50) // 50/100 * 100
    })

    test('should be 0% progress at level boundary', () => {
      const store = useGamificationStore()
      store.studentProgress = { totalPoints: 100 }
      expect(store.levelProgress).toBe(0) // Just reached level 2
    })

    test('should cap progress at 100%', () => {
      const store = useGamificationStore()
      store.studentProgress = { totalPoints: 99 }
      expect(store.levelProgress).toBeLessThanOrEqual(100)
    })
  })

  describe('Badge Tracking', () => {
    test('should count badges correctly', () => {
      const store = useGamificationStore()
      store.studentProgress = { badges: ['badge1', 'badge2', 'badge3'] }
      expect(store.badgeCount).toBe(3)
    })

    test('should handle empty badges', () => {
      const store = useGamificationStore()
      store.studentProgress = { badges: [] }
      expect(store.badgeCount).toBe(0)
    })

    test('should identify unearned badges', () => {
      const store = useGamificationStore()
      store.badgeDefinitions = [
        { id: 'badge1', name: 'Badge 1' },
        { id: 'badge2', name: 'Badge 2' },
        { id: 'badge3', name: 'Badge 3' }
      ]
      store.studentProgress = { badges: ['badge1'] }
      
      expect(store.unearnedBadges).toHaveLength(2)
      expect(store.unearnedBadges.map(b => b.id)).toContain('badge2')
      expect(store.unearnedBadges.map(b => b.id)).toContain('badge3')
    })
  })

  describe('Streak Tracking', () => {
    test('should track current streak', () => {
      const store = useGamificationStore()
      store.studentProgress = { currentStreak: 5 }
      expect(store.currentStreak).toBe(5)
    })

    test('should track max streak', () => {
      const store = useGamificationStore()
      store.studentProgress = { maxStreak: 10 }
      expect(store.maxStreak).toBe(10)
    })
  })

  describe('Assessment Count', () => {
    test('should track assessment count', () => {
      const store = useGamificationStore()
      store.studentProgress = { assessmentCount: 25 }
      expect(store.assessmentCount).toBe(25)
    })

    test('should default to 0 when not set', () => {
      const store = useGamificationStore()
      store.studentProgress = {}
      expect(store.assessmentCount).toBe(0)
    })
  })

  describe('LO Progress', () => {
    test('should track passed LOs count', () => {
      const store = useGamificationStore()
      store.studentProgress = { totalPassed: 15 }
      expect(store.passedLOsCount).toBe(15)
    })

    test('should track actual passed LOs', () => {
      const store = useGamificationStore()
      store.actualPassedLOsData = { 
        passedLOs: ['LO1', 'LO2', 'LO3'] 
      }
      expect(store.actualPassedLOsCount).toBe(3)
      expect(store.actualPassedLOs).toEqual(['LO1', 'LO2', 'LO3'])
    })
  })

  describe('Notification State', () => {
    test('should handle badge notifications', () => {
      const store = useGamificationStore()
      expect(store.showBadgeNotification).toBe(false)
      expect(store.newBadge).toBeNull()
    })

    test('should handle points notifications', () => {
      const store = useGamificationStore()
      expect(store.showPointsNotification).toBe(false)
      expect(store.pointsEarned).toBe(0)
    })
  })
})
