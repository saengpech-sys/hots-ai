/**
 * 🧪 Unit Tests for Research Data Module v3.0
 * 
 * Tests for:
 * - Sequential Pattern Mining (logSequenceEvent, finalizeSequence)
 * - K-Anonymity Export (exportKAnonymousData, assessReidentificationRisk)
 * - Research Readiness v2 (calculateResearchReadiness)
 * - Scaffolding Summary (calculateScaffoldingSummary)
 */

const {
  EVENT_TYPES,
  SEQUENCE_EVENT_TYPES,
  logLearningEvent,
  updateGrowthHistory,
  logSequenceEvent,
  finalizeSequence,
  exportKAnonymousData,
  assessReidentificationRisk,
  calculateResearchReadiness,
  calculateScaffoldingSummary
} = require('../utils/researchData')

// Mock Firebase Admin
const mockDoc = {
  exists: true,
  id: 'test-doc-id',
  data: () => ({
    sequence: [
      { order: 1, event: 'QUESTION_SHOWN', timestamp: '2024-01-01T10:00:00Z' },
      { order: 2, event: 'TYPING_START', timestamp: '2024-01-01T10:00:30Z' }
    ],
    sessionId: 'session-1',
    studentId: 'student-1',
    courseId: 'course-1'
  })
}

const mockCollection = {
  doc: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue(mockDoc),
  set: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue({}),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis()
}

const mockDb = {
  collection: jest.fn(() => mockCollection)
}

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
})

// ============================================================
// 📊 SEQUENCE EVENT TYPES Tests
// ============================================================

describe('SEQUENCE_EVENT_TYPES', () => {
  test('should have all required event types', () => {
    expect(SEQUENCE_EVENT_TYPES).toBeDefined()
    expect(SEQUENCE_EVENT_TYPES.Q).toBe('QUESTION_SHOWN')
    expect(SEQUENCE_EVENT_TYPES.H).toBe('HINT_REQUEST')
    expect(SEQUENCE_EVENT_TYPES.T).toBe('TYPING_START')
    expect(SEQUENCE_EVENT_TYPES.R).toBe('ANSWER_REVISION')
    expect(SEQUENCE_EVENT_TYPES.S).toBe('ANSWER_SUBMIT')
    expect(SEQUENCE_EVENT_TYPES.F).toBe('FEEDBACK_RECEIVED')
  })
})

// ============================================================
// 📊 Sequential Pattern Mining Tests
// ============================================================

describe('logSequenceEvent', () => {
  test('should create new sequence document', async () => {
    // Mock non-existing document
    mockCollection.get.mockResolvedValueOnce({ exists: false })
    
    const result = await logSequenceEvent(mockDb, {
      sessionId: 'session-new',
      studentId: 'student-1',
      courseId: 'course-1',
      questionId: 'question-1',
      eventType: 'QUESTION_SHOWN',
      data: {}
    })
    
    expect(result.success).toBe(true)
    expect(mockDb.collection).toHaveBeenCalledWith('learningSequences')
    expect(mockCollection.doc).toHaveBeenCalledWith('session-new_question-1')
    expect(mockCollection.set).toHaveBeenCalled()
  })

  test('should append to existing sequence', async () => {
    const result = await logSequenceEvent(mockDb, {
      sessionId: 'session-1',
      studentId: 'student-1',
      courseId: 'course-1',
      questionId: 'question-1',
      eventType: 'TYPING_START',
      data: {}
    })
    
    expect(result.success).toBe(true)
    expect(mockCollection.update).toHaveBeenCalled()
  })

  test('should handle errors gracefully', async () => {
    mockCollection.get.mockRejectedValueOnce(new Error('Firestore error'))
    
    const result = await logSequenceEvent(mockDb, {
      sessionId: 'session-1',
      studentId: 'student-1',
      courseId: 'course-1',
      questionId: 'question-1',
      eventType: 'TYPING_START'
    })
    
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('finalizeSequence', () => {
  test('should finalize sequence and calculate summary', async () => {
    // Mock complete sequence
    mockCollection.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        sequence: [
          { event: 'QUESTION_SHOWN', timestamp: '2024-01-01T10:00:00Z' },
          { event: 'HINT_REQUEST', timestamp: '2024-01-01T10:00:10Z' },
          { event: 'TYPING_START', timestamp: '2024-01-01T10:00:30Z' },
          { event: 'ANSWER_REVISION', timestamp: '2024-01-01T10:01:00Z' },
          { event: 'ANSWER_SUBMIT', timestamp: '2024-01-01T10:02:00Z' },
          { event: 'FEEDBACK_RECEIVED', timestamp: '2024-01-01T10:02:05Z' }
        ]
      })
    })
    
    const result = await finalizeSequence(mockDb, 'session-1', 'question-1')
    
    expect(result.success).toBe(true)
    expect(result.pattern).toBe('Q-H-T-R-S-F')
    expect(result.totalHints).toBe(1)
    expect(result.totalRevisions).toBe(1)
    expect(mockCollection.update).toHaveBeenCalled()
  })

  test('should return error for non-existing sequence', async () => {
    mockCollection.get.mockResolvedValueOnce({ exists: false })
    
    const result = await finalizeSequence(mockDb, 'non-existing', 'question-1')
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Sequence not found')
  })
})

// ============================================================
// 🔒 K-Anonymity Export Tests
// ============================================================

describe('exportKAnonymousData', () => {
  const mockEvents = {
    docs: [
      { data: () => ({ studentId: 'student-1', timestampISO: '2024-01-01T10:00:00Z', scoreOverall: 15, studentGrade: 'ม.3', courseId: 'course-1' }) },
      { data: () => ({ studentId: 'student-2', timestampISO: '2024-01-01T11:00:00Z', scoreOverall: 12, studentGrade: 'ม.3', courseId: 'course-1' }) },
      { data: () => ({ studentId: 'student-3', timestampISO: '2024-01-01T12:00:00Z', scoreOverall: 18, studentGrade: 'ม.3', courseId: 'course-1' }) },
      { data: () => ({ studentId: 'student-4', timestampISO: '2024-01-01T13:00:00Z', scoreOverall: 10, studentGrade: 'ม.3', courseId: 'course-1' }) },
      { data: () => ({ studentId: 'student-5', timestampISO: '2024-01-01T14:00:00Z', scoreOverall: 8, studentGrade: 'ม.3', courseId: 'course-1' }) }
    ]
  }

  beforeEach(() => {
    mockCollection.get.mockResolvedValue(mockEvents)
  })

  test('should export anonymized data in JSON format', async () => {
    const result = await exportKAnonymousData(mockDb, 'course-1', {
      k: 5,
      level: 'research',
      format: 'json'
    })
    
    expect(result.success).toBe(true)
    expect(result.format).toBe('json')
    expect(result.recordCount).toBe(5)
    expect(result.kValue).toBe(5)
    expect(result.level).toBe('research')
    // Check anonymization
    expect(result.data[0].studentId).toMatch(/^S\d{4}$/)
  })

  test('should export anonymized data in CSV format', async () => {
    const result = await exportKAnonymousData(mockDb, 'course-1', {
      k: 5,
      level: 'research',
      format: 'csv'
    })
    
    expect(result.success).toBe(true)
    expect(result.format).toBe('csv')
    expect(typeof result.data).toBe('string')
    expect(result.data).toContain('studentId')
  })

  test('should generalize timestamps at research level', async () => {
    const result = await exportKAnonymousData(mockDb, 'course-1', {
      level: 'research',
      format: 'json'
    })
    
    expect(result.success).toBe(true)
    // At research level, timestamp should be date only
    expect(result.data[0].timestampISO).toBe('2024-01-01')
  })

  test('should generalize scores at publication level', async () => {
    const result = await exportKAnonymousData(mockDb, 'course-1', {
      level: 'publication',
      format: 'json'
    })
    
    expect(result.success).toBe(true)
    // At publication level, scores should be ranges
    const scores = result.data.map(d => d.scoreOverall)
    expect(scores.every(s => ['0-5', '6-10', '11-15', '16-20'].includes(s))).toBe(true)
  })

  test('should handle errors gracefully', async () => {
    mockCollection.get.mockRejectedValueOnce(new Error('Firestore error'))
    
    const result = await exportKAnonymousData(mockDb, 'course-1')
    
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('assessReidentificationRisk', () => {
  const mockEvents = {
    docs: [
      { data: () => ({ studentGrade: 'ม.3', studentRoom: '1', timestampISO: '2024-01-01T10:00:00Z', scoreOverall: 15, passedLOs: ['LO1', 'LO2'] }) },
      { data: () => ({ studentGrade: 'ม.3', studentRoom: '1', timestampISO: '2024-01-01T11:00:00Z', scoreOverall: 15, passedLOs: ['LO1', 'LO2'] }) },
      { data: () => ({ studentGrade: 'ม.3', studentRoom: '2', timestampISO: '2024-01-02T10:00:00Z', scoreOverall: 12, passedLOs: ['LO1'] }) }
    ]
  }

  beforeEach(() => {
    mockCollection.get.mockResolvedValue(mockEvents)
  })

  test('should assess re-identification risk', async () => {
    const result = await assessReidentificationRisk(mockDb, 'course-1')
    
    expect(result.success).toBe(true)
    expect(result.riskAssessment).toBeDefined()
    expect(result.riskAssessment.totalRecords).toBe(3)
    expect(result.riskAssessment.uniqueCombinations).toBeDefined()
    expect(result.riskAssessment.overallRisk).toBeDefined()
    expect(['LOW', 'MODERATE', 'HIGH']).toContain(result.riskAssessment.overallRisk)
  })

  test('should identify high-risk fields', async () => {
    const result = await assessReidentificationRisk(mockDb, 'course-1')
    
    expect(result.success).toBe(true)
    expect(Array.isArray(result.riskAssessment.highRiskFields)).toBe(true)
  })

  test('should provide required mitigations', async () => {
    const result = await assessReidentificationRisk(mockDb, 'course-1')
    
    expect(result.success).toBe(true)
    expect(Array.isArray(result.riskAssessment.requiredMitigations)).toBe(true)
  })
})

// ============================================================
// 📈 Research Readiness v2 Tests
// ============================================================

describe('calculateResearchReadiness', () => {
  const mockAssessments = { docs: [], size: 0 }
  const mockEvents = { docs: [], size: 0 }
  const mockInterventions = { docs: [], size: 0 }
  const mockGrowthHistories = { docs: [], size: 0 }

  test('should calculate readiness for empty course', async () => {
    mockCollection.get.mockResolvedValue(mockAssessments)
    
    const result = await calculateResearchReadiness(mockDb, 'course-empty')
    
    expect(result.success).toBe(true)
    expect(result.courseId).toBe('course-empty')
    expect(result.sampleSize.total_n).toBe(0)
    expect(result.overallScore).toBe(0)
    expect(result.schemaVersion).toBe('3.0')
  })

  test('should include power analysis requirements', async () => {
    mockCollection.get.mockResolvedValue({ 
      docs: [{ data: () => ({ studentId: 's1' }) }], 
      size: 1 
    })
    
    const result = await calculateResearchReadiness(mockDb, 'course-1')
    
    expect(result.success).toBe(true)
    expect(result.sampleSize.required_n_small_effect).toBe(199)
    expect(result.sampleSize.required_n_medium_effect).toBe(34)
    expect(result.sampleSize.required_n_large_effect).toBe(14)
  })

  test('should classify verdict based on sample size', async () => {
    // Mock 50 unique students
    const students = Array(50).fill(null).map((_, i) => ({
      data: () => ({ studentId: `student-${i}` })
    }))
    
    mockCollection.get.mockResolvedValue({ docs: students, size: 50 })
    
    const result = await calculateResearchReadiness(mockDb, 'course-1')
    
    expect(result.success).toBe(true)
    expect(result.sampleSize.verdict).toBe('SUFFICIENT_FOR_MEDIUM_EFFECT')
  })

  test('should provide actionable recommendations', async () => {
    mockCollection.get.mockResolvedValue({ docs: [], size: 0 })
    
    const result = await calculateResearchReadiness(mockDb, 'course-1')
    
    expect(result.success).toBe(true)
    expect(Array.isArray(result.recommendations)).toBe(true)
    expect(result.recommendations.length).toBeGreaterThan(0)
    expect(result.recommendations[0]).toHaveProperty('priority')
    expect(result.recommendations[0]).toHaveProperty('issue')
    expect(result.recommendations[0]).toHaveProperty('action')
  })

  test('should calculate score breakdown', async () => {
    mockCollection.get.mockResolvedValue({ docs: [], size: 0 })
    
    const result = await calculateResearchReadiness(mockDb, 'course-1')
    
    expect(result.success).toBe(true)
    expect(result.scoreBreakdown).toHaveProperty('sampleSize')
    expect(result.scoreBreakdown).toHaveProperty('completeness')
    expect(result.scoreBreakdown).toHaveProperty('quality')
    expect(result.scoreBreakdown).toHaveProperty('statistical')
  })
})

// ============================================================
// 📊 Scaffolding Summary Tests
// ============================================================

describe('calculateScaffoldingSummary', () => {
  test('should calculate summary from history', () => {
    // Note: calculateScaffoldingSummary expects history with hintRequests at root level
    const history = [
      { hintRequests: 2 },
      { hintRequests: 3 },
      { hintRequests: 1 }
    ]
    
    const result = calculateScaffoldingSummary(history)
    
    expect(result.totalHintRequests).toBe(6)
    expect(result.avgHintsPerSession).toBe(2)
    expect(result.scaffoldingDependencyTrend).toBeDefined()
  })

  test('should detect increasing dependency trend', () => {
    // Needs 4+ entries for trend detection
    const history = [
      { hintRequests: 1 },
      { hintRequests: 1 },
      { hintRequests: 3 },
      { hintRequests: 3 }
    ]
    
    const result = calculateScaffoldingSummary(history)
    
    expect(result.scaffoldingDependencyTrend).toBe('increasing')
  })

  test('should detect decreasing dependency trend', () => {
    // Needs 4+ entries for trend detection
    const history = [
      { hintRequests: 5 },
      { hintRequests: 5 },
      { hintRequests: 1 },
      { hintRequests: 1 }
    ]
    
    const result = calculateScaffoldingSummary(history)
    
    expect(result.scaffoldingDependencyTrend).toBe('decreasing')
  })

  test('should detect stable dependency trend', () => {
    const history = [
      { hintRequests: 2 },
      { hintRequests: 2 },
      { hintRequests: 2 },
      { hintRequests: 2 }
    ]
    
    const result = calculateScaffoldingSummary(history)
    
    expect(result.scaffoldingDependencyTrend).toBe('stable')
  })

  test('should handle empty history', () => {
    const result = calculateScaffoldingSummary([])
    
    expect(result.totalHintRequests).toBe(0)
    expect(result.avgHintsPerSession).toBe(0)
  })
})

// ============================================================
// 📝 EVENT_TYPES Tests
// ============================================================

describe('EVENT_TYPES', () => {
  test('should have chat assessment type', () => {
    expect(EVENT_TYPES.CHAT_ASSESSMENT).toBe('CHAT_ASSESSMENT')
  })

  test('should have worksheet submission type', () => {
    expect(EVENT_TYPES.WORKSHEET_SUBMISSION).toBe('WORKSHEET_SUBMISSION')
  })

  test('should have pretest type', () => {
    expect(EVENT_TYPES.PRETEST).toBe('PRETEST')
  })

  test('should have posttest type', () => {
    expect(EVENT_TYPES.POSTTEST).toBe('POSTTEST')
  })

  test('should have hint request type for sequential mining', () => {
    expect(EVENT_TYPES.HINT_REQUEST).toBe('HINT_REQUEST')
  })
})
