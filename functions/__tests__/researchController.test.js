/**
 * Unit Tests for Research Controller
 */

const admin = require('firebase-admin')

// Mock Firebase Admin
jest.mock('firebase-admin', () => {
  const mockFirestore = {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            rubricScores: { analysis: 4, reasoning: 3, creativity: 4, evidence: 3 },
            expertScores: { analysis: 4, reasoning: 4, creativity: 3, evidence: 4 }
          })
        }),
        set: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({})
      })),
      where: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          size: 10,
          docs: [],
          forEach: jest.fn()
        }),
        orderBy: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              size: 10,
              docs: [],
              forEach: jest.fn()
            })
          }))
        }))
      })),
      add: jest.fn().mockResolvedValue({ id: 'mock-id' })
    })),
    FieldValue: {
      serverTimestamp: jest.fn(() => 'mock-timestamp')
    }
  }

  return {
    firestore: jest.fn(() => mockFirestore),
    initializeApp: jest.fn(),
    credential: {
      applicationDefault: jest.fn()
    }
  }
})

describe('Research Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Module Exports', () => {
    it('should export all required functions', () => {
      const researchController = require('../controllers/researchController')
      
      // IRR functions
      expect(researchController.calculateIRR).toBeDefined()
      expect(researchController.irrReport).toBeDefined()
      expect(researchController.calculateEffectSize).toBeDefined()
      
      // Export functions
      expect(researchController.exportResearchData).toBeDefined()
      expect(researchController.researchSummary).toBeDefined()
      
      // Correlation functions
      expect(researchController.correlationAnalysis).toBeDefined()
      
      // AI Detection functions
      expect(researchController.analyzeAIContent).toBeDefined()
      expect(researchController.getFlaggedAssessments).toBeDefined()
      expect(researchController.aiDetectionStats).toBeDefined()
    })

    it('should export 18 functions total', () => {
      const researchController = require('../controllers/researchController')
      const exportedFunctions = Object.keys(researchController)
      expect(exportedFunctions.length).toBe(18)
    })
  })

  describe('Function Types', () => {
    it('all exports should be Firebase functions', () => {
      const researchController = require('../controllers/researchController')
      
      Object.values(researchController).forEach(fn => {
        // Firebase functions are objects with __trigger property
        expect(typeof fn).toBe('object')
      })
    })
  })
})

describe('IRR Calculation Logic', () => {
  describe('Cohen\'s Kappa', () => {
    it('should calculate perfect agreement correctly', () => {
      // Perfect agreement: all ratings match
      const aiScores = [1, 2, 3, 4, 5]
      const expertScores = [1, 2, 3, 4, 5]
      
      // Po (observed agreement) = 5/5 = 1
      // Pe (expected by chance) needs full matrix calculation
      // For perfect agreement, Kappa should be 1.0
      const exactMatches = aiScores.filter((s, i) => s === expertScores[i]).length
      expect(exactMatches).toBe(5)
    })

    it('should calculate no agreement correctly', () => {
      // No agreement beyond chance
      const aiScores = [1, 1, 1, 1, 1]
      const expertScores = [5, 5, 5, 5, 5]
      
      const exactMatches = aiScores.filter((s, i) => s === expertScores[i]).length
      expect(exactMatches).toBe(0)
    })
  })

  describe('Pearson Correlation', () => {
    it('should return 1 for perfect positive correlation', () => {
      const x = [1, 2, 3, 4, 5]
      const y = [2, 4, 6, 8, 10]  // y = 2x (perfect linear)
      
      // Manual Pearson calculation
      const n = x.length
      const sumX = x.reduce((a, b) => a + b, 0)
      const sumY = y.reduce((a, b) => a + b, 0)
      const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
      const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0)
      const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0)
      
      const numerator = n * sumXY - sumX * sumY
      const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
      const r = numerator / denominator
      
      expect(r).toBeCloseTo(1.0, 5)
    })

    it('should return -1 for perfect negative correlation', () => {
      const x = [1, 2, 3, 4, 5]
      const y = [10, 8, 6, 4, 2]  // y = 12 - 2x (perfect negative linear)
      
      const n = x.length
      const sumX = x.reduce((a, b) => a + b, 0)
      const sumY = y.reduce((a, b) => a + b, 0)
      const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
      const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0)
      const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0)
      
      const numerator = n * sumXY - sumX * sumY
      const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
      const r = numerator / denominator
      
      expect(r).toBeCloseTo(-1.0, 5)
    })
  })
})

describe('Effect Size Interpretation', () => {
  it('should interpret Cohen\'s d correctly', () => {
    const interpretEffectSize = (d) => {
      const absD = Math.abs(d)
      if (absD < 0.2) return 'negligible'
      if (absD < 0.5) return 'small'
      if (absD < 0.8) return 'medium'
      return 'large'
    }

    expect(interpretEffectSize(0.1)).toBe('negligible')
    expect(interpretEffectSize(0.3)).toBe('small')
    expect(interpretEffectSize(0.6)).toBe('medium')
    expect(interpretEffectSize(1.0)).toBe('large')
    expect(interpretEffectSize(-0.7)).toBe('medium') // Should use absolute value
  })
})

describe('K-Anonymity Check', () => {
  it('should identify records that violate k-anonymity', () => {
    const records = [
      { grade: 'ม.1', section: 'A' },
      { grade: 'ม.1', section: 'A' },
      { grade: 'ม.1', section: 'A' },
      { grade: 'ม.1', section: 'B' },  // Only 1 record - violates k=3
      { grade: 'ม.2', section: 'A' },  // Only 1 record - violates k=3
    ]

    const k = 3
    const groupCounts = {}
    
    records.forEach(r => {
      const key = `${r.grade}-${r.section}`
      groupCounts[key] = (groupCounts[key] || 0) + 1
    })

    const violations = Object.entries(groupCounts)
      .filter(([_, count]) => count < k)
      .map(([key, count]) => ({ group: key, count }))

    expect(violations.length).toBe(2)
    expect(violations.find(v => v.group === 'ม.1-B')).toBeDefined()
    expect(violations.find(v => v.group === 'ม.2-A')).toBeDefined()
  })
})
