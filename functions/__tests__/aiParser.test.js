/**
 * 🧪 Unit Tests for AI Response Parser
 * 
 * ทดสอบการ clean และ parse AI responses
 * 
 * Run: npm test -- --testPathPattern=aiParser
 */

const {
  cleanAIResponse,
  safeParseJSON,
  validateRubricScores,
  createFallbackAssessment
} = require('../utils/aiParser')

describe('cleanAIResponse', () => {
  test('should remove ```json wrapper', () => {
    const input = '```json\n{"test": "value"}\n```'
    const result = cleanAIResponse(input)
    expect(result).toBe('{"test": "value"}')
  })

  test('should remove ``` wrapper without json label', () => {
    const input = '```\n{"test": "value"}\n```'
    const result = cleanAIResponse(input)
    expect(result).toBe('{"test": "value"}')
  })

  test('should handle clean JSON input', () => {
    const input = '{"test": "value"}'
    const result = cleanAIResponse(input)
    expect(result).toBe('{"test": "value"}')
  })

  test('should handle whitespace around JSON', () => {
    const input = '   {"test": "value"}   '
    const result = cleanAIResponse(input)
    expect(result).toBe('{"test": "value"}')
  })

  test('should extract JSON from text with extra content', () => {
    const input = 'Here is the result: {"test": "value"} end'
    const result = cleanAIResponse(input)
    expect(result).toBe('{"test": "value"}')
  })

  test('should handle complex nested JSON', () => {
    const input = '```json\n{"rubricScores": {"analysis": 4, "reasoning": 3}, "feedback": "ดี"}\n```'
    const result = cleanAIResponse(input)
    expect(JSON.parse(result)).toEqual({
      rubricScores: { analysis: 4, reasoning: 3 },
      feedback: "ดี"
    })
  })

  test('should handle empty input', () => {
    expect(cleanAIResponse('')).toBe('')
    expect(cleanAIResponse(null)).toBe('')
    expect(cleanAIResponse(undefined)).toBe('')
  })
})

describe('safeParseJSON', () => {
  test('should parse valid JSON', () => {
    const input = '{"test": "value"}'
    const result = safeParseJSON(input)
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ test: 'value' })
  })

  test('should parse JSON with markdown wrapper', () => {
    const input = '```json\n{"test": "value"}\n```'
    const result = safeParseJSON(input)
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ test: 'value' })
  })

  test('should return fallback on invalid JSON', () => {
    const input = 'not valid json'
    const fallback = { default: true }
    const result = safeParseJSON(input, fallback)
    expect(result.success).toBe(false)
    expect(result.data).toEqual(fallback)
    expect(result.error).toBeDefined()
  })

  test('should handle Thai content in JSON', () => {
    const input = '{"feedback": "คำตอบดีมาก ควรเพิ่มรายละเอียด"}'
    const result = safeParseJSON(input)
    expect(result.success).toBe(true)
    expect(result.data.feedback).toBe('คำตอบดีมาก ควรเพิ่มรายละเอียด')
  })

  test('should parse typical AI assessment response', () => {
    const input = `\`\`\`json
{
  "rubricScores": {
    "analysis": 4,
    "reasoning": 3,
    "creativity": 4,
    "evidence": 3
  },
  "feedback": "นักเรียนแสดงความเข้าใจที่ดี",
  "passedLOs": ["LO001", "LO002"]
}
\`\`\``
    
    const result = safeParseJSON(input)
    expect(result.success).toBe(true)
    expect(result.data.rubricScores.analysis).toBe(4)
    expect(result.data.passedLOs).toContain('LO001')
  })
})

describe('validateRubricScores', () => {
  test('should validate complete valid scores', () => {
    const scores = { analysis: 4, reasoning: 3, creativity: 5, evidence: 2 }
    const result = validateRubricScores(scores)
    expect(result.valid).toBe(true)
    expect(result.scores).toEqual(scores)
    expect(result.warnings).toHaveLength(0)
  })

  test('should fill missing dimensions with default', () => {
    const scores = { analysis: 4 }
    const result = validateRubricScores(scores)
    expect(result.valid).toBe(false)
    expect(result.scores.analysis).toBe(4)
    expect(result.scores.reasoning).toBe(2) // default
    expect(result.scores.creativity).toBe(2) // default
    expect(result.scores.evidence).toBe(2) // default
    expect(result.warnings.length).toBe(3)
  })

  test('should clamp out-of-range scores', () => {
    const scores = { analysis: 10, reasoning: -5, creativity: 3, evidence: 4 }
    const result = validateRubricScores(scores)
    expect(result.valid).toBe(false)
    expect(result.scores.analysis).toBe(5) // clamped to max
    expect(result.scores.reasoning).toBe(0) // clamped to min
    expect(result.warnings.length).toBe(2)
  })

  test('should convert string scores to numbers', () => {
    const scores = { analysis: "4", reasoning: "3", creativity: "5", evidence: "2" }
    const result = validateRubricScores(scores)
    expect(result.scores.analysis).toBe(4)
    expect(typeof result.scores.analysis).toBe('number')
  })

  test('should handle null/undefined scores', () => {
    const result = validateRubricScores(null)
    expect(result.valid).toBe(false)
    expect(result.scores).toEqual({
      analysis: 2,
      reasoning: 2,
      creativity: 2,
      evidence: 2
    })
  })

  test('should round decimal scores', () => {
    const scores = { analysis: 4.7, reasoning: 2.3, creativity: 3.5, evidence: 1.1 }
    const result = validateRubricScores(scores)
    expect(result.scores.analysis).toBe(5)
    expect(result.scores.reasoning).toBe(2)
    expect(result.scores.creativity).toBe(4)
    expect(result.scores.evidence).toBe(1)
  })
})

describe('createFallbackAssessment', () => {
  test('should create valid fallback structure', () => {
    const result = createFallbackAssessment('Test reason')
    
    expect(result.rubricScores).toBeDefined()
    expect(result.rubricScores.analysis).toBe(2)
    expect(result.rubricScores.reasoning).toBe(2)
    expect(result.rubricScores.creativity).toBe(2)
    expect(result.rubricScores.evidence).toBe(2)
    expect(result.feedback).toContain('Test reason')
    expect(result.isFallback).toBe(true)
    expect(result.fallbackReason).toBe('Test reason')
  })

  test('should handle empty reason', () => {
    const result = createFallbackAssessment()
    expect(result.fallbackReason).toBe('Unknown error')
  })
})
