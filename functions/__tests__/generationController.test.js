/**
 * Unit Tests for Generation Controller
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
            name: 'Test Course',
            grade: 'ม.1',
            subject: 'วิทยาศาสตร์'
          })
        }),
        set: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({})
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

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                title: 'Test Lesson Plan',
                subject: 'วิทยาศาสตร์',
                topic: 'การเคลื่อนที่',
                objectives: ['เข้าใจการเคลื่อนที่'],
                phases: []
              })
            }
          }],
          usage: { total_tokens: 500 }
        })
      }
    }
  }))
})

describe('Generation Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.OPENAI_MODEL = 'gpt-4o-mini'
  })

  describe('Module Exports', () => {
    it('should export all required generation functions', () => {
      const generationController = require('../controllers/generationController')
      
      expect(generationController.generateLessonPlan).toBeDefined()
      expect(generationController.generateCourseStructure).toBeDefined()
      expect(generationController.generateLearningOutcomes).toBeDefined()
      expect(generationController.generateHOTSQuestion).toBeDefined()
      expect(generationController.generateSolution).toBeDefined()
      expect(generationController.generateAdaptivePath).toBeDefined()
      expect(generationController.generateLearningUnit).toBeDefined()
    })

    it('should export 7 functions total', () => {
      const generationController = require('../controllers/generationController')
      const exportedFunctions = Object.keys(generationController)
      expect(exportedFunctions.length).toBe(7)
    })
  })

  describe('Function Types', () => {
    it('all exports should be Firebase functions', () => {
      const generationController = require('../controllers/generationController')
      
      Object.values(generationController).forEach(fn => {
        expect(typeof fn).toBe('object')
      })
    })
  })
})

describe('AI Response Parsing', () => {
  const { parseAIResponse } = require('../utils/aiParser')

  it('should parse clean JSON', () => {
    const input = '{"key": "value"}'
    const result = parseAIResponse(input)
    expect(result).toEqual({ key: 'value' })
  })

  it('should parse JSON wrapped in markdown code blocks', () => {
    const input = '```json\n{"key": "value"}\n```'
    const result = parseAIResponse(input)
    expect(result).toEqual({ key: 'value' })
  })

  it('should parse JSON with backticks only', () => {
    const input = '```\n{"key": "value"}\n```'
    const result = parseAIResponse(input)
    expect(result).toEqual({ key: 'value' })
  })

  it('should handle nested objects', () => {
    const input = '{"outer": {"inner": "value"}}'
    const result = parseAIResponse(input)
    expect(result.outer.inner).toBe('value')
  })

  it('should handle arrays', () => {
    const input = '{"items": [1, 2, 3]}'
    const result = parseAIResponse(input)
    expect(result.items).toEqual([1, 2, 3])
  })

  it('should throw error for invalid JSON', () => {
    const input = 'not valid json'
    expect(() => parseAIResponse(input)).toThrow()
  })
})

describe('Lesson Plan Structure', () => {
  it('should have required fields in a valid lesson plan', () => {
    const validLessonPlan = {
      title: 'การเคลื่อนที่ของวัตถุ',
      subject: 'วิทยาศาสตร์',
      topic: 'การเคลื่อนที่',
      grade: 'ม.1',
      duration: 50,
      objectives: ['เข้าใจการเคลื่อนที่'],
      materials: ['หนังสือเรียน'],
      phases: [{
        name: 'ขั้นนำ',
        duration: 10,
        activities: ['กระตุ้นความสนใจ']
      }],
      assessment: {
        formative: ['สังเกต'],
        summative: ['ทดสอบ']
      }
    }

    // Check required fields exist
    expect(validLessonPlan.title).toBeDefined()
    expect(validLessonPlan.subject).toBeDefined()
    expect(validLessonPlan.objectives).toBeInstanceOf(Array)
    expect(validLessonPlan.phases).toBeInstanceOf(Array)
    expect(validLessonPlan.phases.length).toBeGreaterThan(0)
  })
})

describe('HOTS Question Validation', () => {
  it('should have required rubric dimensions', () => {
    const validQuestion = {
      question: 'วิเคราะห์สาเหตุของการเปลี่ยนแปลงสภาพอากาศ',
      hotsLevel: 'วิเคราะห์',
      scoringRubric: {
        analysis: 'เกณฑ์การวิเคราะห์',
        reasoning: 'เกณฑ์การให้เหตุผล',
        creativity: 'เกณฑ์ความคิดสร้างสรรค์',
        evidence: 'เกณฑ์การใช้หลักฐาน'
      }
    }

    const rubricDimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    rubricDimensions.forEach(dim => {
      expect(validQuestion.scoringRubric[dim]).toBeDefined()
    })
  })
})
