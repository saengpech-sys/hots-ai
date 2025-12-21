/**
 * 🧪 Unit Tests for LO Progress Utility (Frontend)
 * 
 * ทดสอบ loProgress.js utilities
 * 
 * Run: npm test -- --testPathPattern=loProgress
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'

// Mock Firebase
vi.mock('@/firebase/config', () => ({
  db: {}
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn()
}))

import { getDocs } from 'firebase/firestore'

// Import after mocking
import {
  calculateLOProgress,
  getLOStatus,
  formatPassedLOsDisplay,
  mergeLOSets
} from '@/utils/loProgress'

describe('calculateLOProgress', () => {
  test('should calculate 0% for empty arrays', () => {
    const result = calculateLOProgress([], [])
    expect(result).toBe(0)
  })

  test('should calculate correct percentage', () => {
    const passedLOs = ['LO001', 'LO002']
    const totalLOs = [
      { id: 'LO001' },
      { id: 'LO002' },
      { id: 'LO003' },
      { id: 'LO004' }
    ]
    
    const result = calculateLOProgress(passedLOs, totalLOs)
    expect(result).toBe(50)
  })

  test('should handle 100% completion', () => {
    const passedLOs = ['LO001', 'LO002']
    const totalLOs = [
      { id: 'LO001' },
      { id: 'LO002' }
    ]
    
    const result = calculateLOProgress(passedLOs, totalLOs)
    expect(result).toBe(100)
  })

  test('should handle more passed than total gracefully', () => {
    const passedLOs = ['LO001', 'LO002', 'LO003']
    const totalLOs = [{ id: 'LO001' }]
    
    const result = calculateLOProgress(passedLOs, totalLOs)
    expect(result).toBe(100) // Cap at 100
  })
})

describe('getLOStatus', () => {
  test('should return "passed" for LO in passedLOs', () => {
    const status = getLOStatus('LO001', ['LO001', 'LO002'])
    expect(status).toBe('passed')
  })

  test('should return "not-passed" for LO not in passedLOs', () => {
    const status = getLOStatus('LO003', ['LO001', 'LO002'])
    expect(status).toBe('not-passed')
  })

  test('should handle empty passedLOs array', () => {
    const status = getLOStatus('LO001', [])
    expect(status).toBe('not-passed')
  })
})

describe('formatPassedLOsDisplay', () => {
  test('should format single LO', () => {
    const display = formatPassedLOsDisplay(['LO001'])
    expect(display).toBe('LO001')
  })

  test('should format multiple LOs with comma', () => {
    const display = formatPassedLOsDisplay(['LO001', 'LO002'])
    expect(display).toContain('LO001')
    expect(display).toContain('LO002')
  })

  test('should return placeholder for empty array', () => {
    const display = formatPassedLOsDisplay([])
    expect(display).toBe('-')
  })

  test('should truncate long lists', () => {
    const longList = Array.from({ length: 10 }, (_, i) => `LO00${i}`)
    const display = formatPassedLOsDisplay(longList, 3)
    expect(display).toContain('...')
    expect(display).toContain('+7')
  })
})

describe('mergeLOSets', () => {
  test('should merge two arrays without duplicates', () => {
    const set1 = ['LO001', 'LO002']
    const set2 = ['LO002', 'LO003']
    
    const merged = mergeLOSets(set1, set2)
    expect(merged).toHaveLength(3)
    expect(merged).toContain('LO001')
    expect(merged).toContain('LO002')
    expect(merged).toContain('LO003')
  })

  test('should handle empty arrays', () => {
    expect(mergeLOSets([], ['LO001'])).toEqual(['LO001'])
    expect(mergeLOSets(['LO001'], [])).toEqual(['LO001'])
    expect(mergeLOSets([], [])).toEqual([])
  })

  test('should sort result', () => {
    const set1 = ['LO003', 'LO001']
    const set2 = ['LO002']
    
    const merged = mergeLOSets(set1, set2)
    expect(merged).toEqual(['LO001', 'LO002', 'LO003'])
  })
})
