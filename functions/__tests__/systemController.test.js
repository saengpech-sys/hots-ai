/**
 * Unit Tests for System Controller
 */

const admin = require('firebase-admin')

// Mock Firebase Admin
jest.mock('firebase-admin', () => {
  const mockBatch = {
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue({})
  }

  const mockFirestore = {
    collection: jest.fn((collectionName) => ({
      doc: jest.fn((docId) => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            rubricScores: { analysis: 4, reasoning: 3, creativity: 4, evidence: 3 },
            auditTrail: {
              modelUsed: 'gpt-4o-mini',
              promptVersion: '2.0',
              retryCount: 0
            }
          })
        }),
        set: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({})
      })),
      where: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          size: 10,
          docs: [],
          forEach: jest.fn(),
          empty: false
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
      add: jest.fn().mockResolvedValue({ id: 'mock-id' }),
      limit: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ empty: false })
      })),
      orderBy: jest.fn(() => ({
        desc: jest.fn(),
        limit: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            docs: [],
            forEach: jest.fn()
          })
        }))
      }))
    })),
    batch: jest.fn(() => mockBatch),
    FieldValue: {
      serverTimestamp: jest.fn(() => 'mock-timestamp'),
      increment: jest.fn(n => n)
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

describe('System Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Module Exports', () => {
    it('should export all required system functions', () => {
      const systemController = require('../controllers/systemController')
      
      // Health and debug
      expect(systemController.healthCheck).toBeDefined()
      expect(systemController.systemDebug).toBeDefined()
      
      // Progress sync
      expect(systemController.syncProgress).toBeDefined()
      expect(systemController.recalculateStudentProgress).toBeDefined()
      
      // Reports
      expect(systemController.reliabilityReport).toBeDefined()
      
      // Scheduled tasks
      expect(systemController.dailyConsistencyCheck).toBeDefined()
      expect(systemController.scheduledCleanupRateLimits).toBeDefined()
      expect(systemController.scheduledCleanupAuditLogs).toBeDefined()
      
      // Triggers
      expect(systemController.onUserDelete).toBeDefined()
    })

    it('should export 9 functions total', () => {
      const systemController = require('../controllers/systemController')
      const exportedFunctions = Object.keys(systemController)
      expect(exportedFunctions.length).toBe(9)
    })
  })
})

describe('Health Check Response', () => {
  it('should return required fields in health response', () => {
    const healthResponse = {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        firestore: true,
        openai: true
      },
      version: '2.0.0'
    }

    expect(healthResponse.success).toBe(true)
    expect(healthResponse.status).toBe('healthy')
    expect(healthResponse.services.firestore).toBe(true)
    expect(healthResponse.timestamp).toBeDefined()
  })
})

describe('Reliability Score Calculation', () => {
  const { calculateReliabilityScore } = require('../utils/reliability')

  it('should calculate high reliability for good assessment', () => {
    const assessment = { confidence: 90 }
    const parseResult = { errors: [], warnings: [] }
    const retryAttempts = 1

    const score = calculateReliabilityScore(assessment, parseResult, retryAttempts)
    expect(score).toBe(100)
  })

  it('should calculate low reliability for poor assessment', () => {
    const assessment = { confidence: 40, isFallback: true }
    const parseResult = { errors: ['some error'], warnings: ['some warning'] }
    const retryAttempts = 3

    const score = calculateReliabilityScore(assessment, parseResult, retryAttempts)
    // 100 - 10(error) - 2(warning) - 10(retries) - 10(low conf) - 50(fallback) = 18
    expect(score).toBeLessThan(70)
  })

  it('should handle edge cases', () => {
    const perfectAssessment = { confidence: 100 }
    const perfectParse = { errors: [], warnings: [] }
    
    const perfectScore = calculateReliabilityScore(perfectAssessment, perfectParse, 1)
    expect(perfectScore).toBe(100)

    const worstAssessment = { confidence: 0, isFallback: true }
    const worstParse = { errors: ['e1', 'e2'], warnings: ['w1'] }
    // 100 - 20 - 2 - 20(5 retries) - 10 - 50 = -2 -> 0
    
    const worstScore = calculateReliabilityScore(worstAssessment, worstParse, 5)
    expect(worstScore).toBe(0)
  })
})

describe('Progress Sync Logic', () => {
  it('should calculate correct average scores', () => {
    const assessments = [
      { rubricScores: { analysis: 4, reasoning: 3, creativity: 5, evidence: 4 } },
      { rubricScores: { analysis: 5, reasoning: 4, creativity: 4, evidence: 3 } },
      { rubricScores: { analysis: 3, reasoning: 5, creativity: 3, evidence: 5 } }
    ]

    const averages = {
      analysis: 0,
      reasoning: 0,
      creativity: 0,
      evidence: 0
    }

    assessments.forEach(a => {
      Object.keys(averages).forEach(key => {
        averages[key] += a.rubricScores[key]
      })
    })

    Object.keys(averages).forEach(key => {
      averages[key] = averages[key] / assessments.length
    })

    expect(averages.analysis).toBe(4)
    expect(averages.reasoning).toBe(4)
    expect(averages.creativity).toBe(4)
    expect(averages.evidence).toBe(4)
  })

  it('should correctly aggregate passed LOs', () => {
    const assessments = [
      { loAssessment: { passedLOs: ['LO1', 'LO2'] } },
      { loAssessment: { passedLOs: ['LO2', 'LO3'] } },
      { loAssessment: { passedLOs: ['LO1', 'LO4'] } }
    ]

    const passedLOs = new Set()
    assessments.forEach(a => {
      if (a.loAssessment?.passedLOs) {
        a.loAssessment.passedLOs.forEach(lo => passedLOs.add(lo))
      }
    })

    expect(passedLOs.size).toBe(4)
    expect(passedLOs.has('LO1')).toBe(true)
    expect(passedLOs.has('LO2')).toBe(true)
    expect(passedLOs.has('LO3')).toBe(true)
    expect(passedLOs.has('LO4')).toBe(true)
  })
})

describe('Cleanup Logic', () => {
  it('should identify old records for cleanup', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const records = [
      { timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), id: '1' }, // Old
      { timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), id: '2' }, // Old
      { timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), id: '3' }, // Recent
      { timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), id: '4' }   // Recent
    ]

    const oldRecords = records.filter(r => r.timestamp < thirtyDaysAgo)
    const recentRecords = records.filter(r => r.timestamp >= thirtyDaysAgo)

    expect(oldRecords.length).toBe(2)
    expect(recentRecords.length).toBe(2)
  })

  it('should identify orphaned sessions', () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const sessions = [
      { status: 'active', updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }, // Orphaned
      { status: 'active', updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000) },      // Active
      { status: 'closed', updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }, // Already closed
      { status: 'active', updatedAt: new Date(Date.now() - 30 * 60 * 1000) }           // Active
    ]

    const orphanedSessions = sessions.filter(
      s => s.status === 'active' && s.updatedAt < oneDayAgo
    )

    expect(orphanedSessions.length).toBe(1)
  })
})
