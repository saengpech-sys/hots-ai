/**
 * Tests for prompts.js module
 */

const { 
  sanitizeStudentInput,
  createAssessmentPrompt,
  createLOAssessmentPrompt 
} = require('../utils/prompts')

describe('sanitizeStudentInput', () => {
  test('should remove code blocks', () => {
    const input = 'Hello ```code``` world'
    const result = sanitizeStudentInput(input)
    expect(result).not.toContain('```')
    expect(result).toContain("'''")
  })

  test('should remove XML-like tags', () => {
    const input = 'Hello <script>alert(1)</script> world'
    const result = sanitizeStudentInput(input)
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('</script>')
  })

  test('should remove template expressions', () => {
    const input = 'Hello {{injection}} world'
    const result = sanitizeStudentInput(input)
    expect(result).not.toContain('{{')
    expect(result).not.toContain('}}')
  })

  test('should truncate long input', () => {
    const input = 'a'.repeat(5000)
    const result = sanitizeStudentInput(input, 100)
    expect(result.length).toBe(100)
  })

  test('should handle empty input', () => {
    expect(sanitizeStudentInput('')).toBe('')
    expect(sanitizeStudentInput(null)).toBe('')
    expect(sanitizeStudentInput(undefined)).toBe('')
  })
})

describe('createAssessmentPrompt', () => {
  test('should create basic prompt', () => {
    const prompt = createAssessmentPrompt('Test context', 'Student answer')
    
    expect(prompt).toContain('Test context')
    expect(prompt).toContain('Student answer')
    expect(prompt).toContain('rubricScores')
    expect(prompt).toContain('chainOfThought')
  })

  test('should include grade level context when provided', () => {
    const prompt = createAssessmentPrompt('Context', 'Answer', {
      gradeLevel: 'ม.3',
      subject: 'วิทยาศาสตร์'
    })
    
    expect(prompt).toContain('ม.3')
    expect(prompt).toContain('วิทยาศาสตร์')
    expect(prompt).toContain('ระดับชั้น')
  })

  test('should include scaffolding instructions when in scaffolding mode', () => {
    const prompt = createAssessmentPrompt('Context', 'New answer', {
      isScaffolding: true,
      scaffoldingAttempts: 1,
      previousAnswer: 'Previous answer'
    })
    
    expect(prompt).toContain('SCAFFOLDING MODE')
    expect(prompt).toContain('previous_answer')
    expect(prompt).toContain('Previous answer')
  })

  test('should sanitize student answer', () => {
    const prompt = createAssessmentPrompt('Context', '<script>evil</script>')
    expect(prompt).not.toContain('<script>')
  })

  test('should include probing question instruction for first attempt', () => {
    const prompt = createAssessmentPrompt('Context', 'Answer', {
      scaffoldingAttempts: 0
    })
    expect(prompt).toContain('probingQuestion')
  })
})

describe('createLOAssessmentPrompt', () => {
  const mockLOs = [
    { loCode: 'LO1', loDescription: 'วิเคราะห์ปัญหาได้' },
    { loCode: 'LO2', loDescription: 'สรุปผลได้' }
  ]

  const mockScores = {
    analysis: 4,
    reasoning: 3,
    creativity: 2,
    evidence: 4
  }

  test('should create LO assessment prompt', () => {
    const prompt = createLOAssessmentPrompt('Student answer', mockLOs, mockScores)
    
    expect(prompt).toContain('Student answer')
    expect(prompt).toContain('LO1')
    expect(prompt).toContain('LO2')
    expect(prompt).toContain('วิเคราะห์ปัญหาได้')
  })

  test('should include HOTS scores', () => {
    const prompt = createLOAssessmentPrompt('Answer', mockLOs, mockScores)
    
    expect(prompt).toContain('analysis')
    expect(prompt).toContain('4')
    expect(prompt).toContain('reasoning')
    expect(prompt).toContain('3')
  })

  test('should support alternate LO field names', () => {
    const altLOs = [
      { code: 'LO1', description: 'Desc 1' },
      { code: 'LO2', description: 'Desc 2' }
    ]
    
    const prompt = createLOAssessmentPrompt('Answer', altLOs, mockScores)
    
    expect(prompt).toContain('LO1')
    expect(prompt).toContain('LO2')
    expect(prompt).toContain('Desc 1')
  })

  test('should include passing criteria', () => {
    const prompt = createLOAssessmentPrompt('Answer', mockLOs, mockScores)
    
    expect(prompt).toContain('เกณฑ์การผ่าน LO')
    expect(prompt).toContain('≥ 3')
    expect(prompt).toContain('passedLOs')
  })
})
