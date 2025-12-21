/**
 * Tests for loAssessment.js module
 */

const { assessLearningOutcomes } = require('../utils/loAssessment')

// Mock OpenAI client
const createMockOpenAI = (response) => ({
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(response)
          }
        }]
      })
    }
  }
})

describe('assessLearningOutcomes', () => {
  const mockLOs = [
    { loCode: 'LO1', loDescription: 'วิเคราะห์ปัญหาได้' },
    { loCode: 'LO2', loDescription: 'สรุปผลได้' }
  ]

  const mockAssessmentResult = {
    rubricScores: {
      analysis: 4,
      reasoning: 3,
      creativity: 2,
      evidence: 4
    }
  }

  test('should return empty result when OpenAI is not configured', async () => {
    const result = await assessLearningOutcomes(
      null,
      'Student answer',
      mockLOs,
      mockAssessmentResult
    )

    expect(result.passedLOs).toEqual([])
    expect(result.analysis).toBe('AI not configured')
  })

  test('should return empty result when no LOs provided', async () => {
    const mockOpenAI = createMockOpenAI({ passedLOs: [], analysis: '' })
    
    const result = await assessLearningOutcomes(
      mockOpenAI,
      'Student answer',
      [],
      mockAssessmentResult
    )

    expect(result.passedLOs).toEqual([])
    expect(result.analysis).toBe('No learning outcomes to assess')
  })

  test('should successfully assess LOs', async () => {
    const mockResponse = {
      passedLOs: ['LO1'],
      analysis: 'นักเรียนวิเคราะห์ปัญหาได้ดี'
    }
    const mockOpenAI = createMockOpenAI(mockResponse)

    const result = await assessLearningOutcomes(
      mockOpenAI,
      'คำตอบของนักเรียนที่วิเคราะห์ปัญหาอย่างละเอียด',
      mockLOs,
      mockAssessmentResult
    )

    expect(result.passedLOs).toEqual(['LO1'])
    expect(result.analysis).toContain('วิเคราะห์')
  })

  test('should handle API errors gracefully', async () => {
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('API Error'))
        }
      }
    }

    const result = await assessLearningOutcomes(
      mockOpenAI,
      'Student answer',
      mockLOs,
      mockAssessmentResult
    )

    expect(result.passedLOs).toEqual([])
    expect(result.analysis).toContain('ข้อผิดพลาด')
  })

  test('should handle malformed AI response', async () => {
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: 'not valid json'
              }
            }]
          })
        }
      }
    }

    const result = await assessLearningOutcomes(
      mockOpenAI,
      'Student answer',
      mockLOs,
      mockAssessmentResult
    )

    expect(result.passedLOs).toEqual([])
  })

  test('should clean markdown wrapped JSON', async () => {
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: '```json\n{"passedLOs": ["LO1"], "analysis": "Good"}\n```'
              }
            }]
          })
        }
      }
    }

    const result = await assessLearningOutcomes(
      mockOpenAI,
      'Student answer',
      mockLOs,
      mockAssessmentResult
    )

    expect(result.passedLOs).toEqual(['LO1'])
    expect(result.analysis).toBe('Good')
  })
})
