/**
 * 🧪 Quality Assurance Module Tests
 * Tests for Phase 2+ QA features: Fairness, Scaffolding, Human-in-the-Loop, Validation
 */

const { 
  calculateCohensD, 
  performPairwiseFairnessAnalysis, 
  generateFairnessReport 
} = require('../utils/fairnessAudit')

const {
  generateAdaptiveScaffolding,
  formatScaffoldingMessage,
  analyzeScaffoldingEffectiveness,
  SCAFFOLDING_LEVELS
} = require('../utils/adaptiveScaffolding')

const {
  shouldFlagForReview,
  REVIEW_PRIORITY
} = require('../utils/humanInTheLoop')

const {
  getCognitiveStage,
  getExpectedScoreRange,
  generateGradeCalibrationContext,
  getAdjustedThresholds,
  checkScoreAppropriateness
} = require('../utils/gradeLevelCalibration')

const {
  calculateCVR,
  calculateCVI,
  calculateCronbachsAlpha
} = require('../utils/validationStudy')

// ============================================================
// FAIRNESS AUDIT TESTS
// ============================================================

describe('Fairness Audit Module', () => {
  describe('calculateCohensD', () => {
    it('should return d=0 for identical groups', () => {
      const groupA = [3, 3, 3, 3, 3]
      const groupB = [3, 3, 3, 3, 3]
      const result = calculateCohensD(groupA, groupB)
      expect(result.d).toBe(0)
      expect(result.interpretation).toBe('No variance')
    })

    it('should return positive d when groupA > groupB', () => {
      const groupA = [4, 4, 5, 5, 5]
      const groupB = [2, 2, 3, 3, 3]
      const result = calculateCohensD(groupA, groupB)
      expect(result.d).toBeGreaterThan(0)
      expect(result.favoredGroup).toBe('group1')
    })

    it('should return negative d when groupA < groupB', () => {
      const groupA = [2, 2, 2, 3, 3]
      const groupB = [4, 4, 5, 5, 5]
      const result = calculateCohensD(groupA, groupB)
      expect(result.d).toBeLessThan(0)
      expect(result.favoredGroup).toBe('group2')
    })

    it('should interpret effect size correctly', () => {
      // Large effect with some variance
      const groupA = [5, 5, 4, 5, 4]
      const groupB = [1, 2, 1, 2, 1]
      const result = calculateCohensD(groupA, groupB)
      expect(result.interpretation).toBe('large')
    })

    it('should handle insufficient data gracefully', () => {
      const result = calculateCohensD([], [])
      expect(result.d).toBe(null)
      expect(result.interpretation).toBe('Insufficient data')
    })
  })

  describe('performPairwiseFairnessAnalysis', () => {
    it('should return analysis object', () => {
      const assessments = [
        { studentId: 's1', rubricScores: { analysis: 4 }, studentData: { gender: 'male' } },
        { studentId: 's2', rubricScores: { analysis: 4 }, studentData: { gender: 'male' } },
        { studentId: 's3', rubricScores: { analysis: 3 }, studentData: { gender: 'female' } },
        { studentId: 's4', rubricScores: { analysis: 3 }, studentData: { gender: 'female' } },
      ]
      
      const analysis = performPairwiseFairnessAnalysis(assessments, 'gender')
      expect(analysis).toBeDefined()
      expect(typeof analysis).toBe('object')
    })
  })
})

// ============================================================
// ADAPTIVE SCAFFOLDING TESTS
// ============================================================

describe('Adaptive Scaffolding Module', () => {
  describe('generateAdaptiveScaffolding', () => {
    it('should identify weakest dimension correctly', () => {
      const assessmentResult = {
        rubricScores: {
          analysis: 2,
          reasoning: 1, // Weakest - below threshold
          creativity: 2,
          evidence: 2
        }
      }
      
      const result = generateAdaptiveScaffolding(assessmentResult, 1)
      expect(result.needed).toBe(true)
      expect(result.primaryDimension).toBe('reasoning')
    })

    it('should not scaffold if passing score', () => {
      const assessmentResult = {
        rubricScores: { analysis: 4, reasoning: 4, creativity: 4, evidence: 4 } // 16 >= 12
      }
      
      const result = generateAdaptiveScaffolding(assessmentResult, 1)
      expect(result.needed).toBe(false)
    })

    it('should escalate scaffolding level based on attempt', () => {
      const assessmentResult = {
        rubricScores: { analysis: 2, reasoning: 2, creativity: 2, evidence: 2 }
      }
      
      const attempt1 = generateAdaptiveScaffolding(assessmentResult, 1)
      const attempt2 = generateAdaptiveScaffolding(assessmentResult, 2)
      const attempt3 = generateAdaptiveScaffolding(assessmentResult, 3)
      
      // Later attempts should have higher scaffolding level
      expect(attempt1.scaffoldingLevel).toBeLessThanOrEqual(attempt2.scaffoldingLevel)
      expect(attempt2.scaffoldingLevel).toBeLessThanOrEqual(attempt3.scaffoldingLevel)
    })

    it('should include prompt in Thai language', () => {
      const assessmentResult = {
        rubricScores: { analysis: 1, reasoning: 3, creativity: 3, evidence: 3 }
      }
      const result = generateAdaptiveScaffolding(assessmentResult, 1)
      
      expect(result.prompt).toBeDefined()
      expect(typeof result.prompt).toBe('string')
      // Thai characters present
      expect(result.prompt).toMatch(/[ก-๙]/)
    })

    it('should have all scaffolding levels defined', () => {
      expect(SCAFFOLDING_LEVELS).toBeDefined()
      expect(SCAFFOLDING_LEVELS.METACOGNITIVE).toBeDefined()
      expect(SCAFFOLDING_LEVELS.EXPLICIT).toBeDefined()
      expect(SCAFFOLDING_LEVELS.MODELING).toBeDefined()
    })
  })

  describe('formatScaffoldingMessage', () => {
    it('should format scaffolding for display', () => {
      const scaffolding = {
        needed: true,
        primaryDimension: 'analysis',
        scaffoldingLevel: 1,
        prompt: 'ลองคิดดูว่าปัญหานี้เกี่ยวข้องกับอะไรบ้าง?',
        dimensionName: 'การวิเคราะห์'
      }
      
      const formatted = formatScaffoldingMessage(scaffolding)
      expect(formatted).toBeDefined()
    })
  })
})

// ============================================================
// HUMAN-IN-THE-LOOP TESTS
// ============================================================

describe('Human-in-the-Loop Module', () => {
  describe('shouldFlagForReview', () => {
    it('should flag low confidence assessments', () => {
      const assessment = {
        aiConfidence: 40, // Low confidence (percentage)
        rubricScores: { analysis: 3, reasoning: 3, creativity: 3, evidence: 3 },
        overallScore: 12
      }
      
      const result = shouldFlagForReview(assessment)
      expect(result).toBeDefined()
      expect(result.needsReview).toBe(true)
      expect(result.flags.some(f => f.reason === 'low_confidence')).toBe(true)
    })

    it('should flag extreme scores with high variance', () => {
      const assessment = {
        aiConfidence: 90,
        rubricScores: { analysis: 5, reasoning: 0, creativity: 5, evidence: 0 }, // High variance > 3
        overallScore: 10
      }
      
      const result = shouldFlagForReview(assessment)
      expect(result.needsReview).toBe(true)
      expect(result.flags.some(f => f.reason === 'dimension_mismatch')).toBe(true)
    })

    it('should flag borderline scores near passing threshold', () => {
      const assessment = {
        aiConfidence: 85,
        rubricScores: { analysis: 3, reasoning: 2.8, creativity: 3.2, evidence: 3 }, // Near threshold 3
        overallScore: 12
      }
      
      const result = shouldFlagForReview(assessment)
      expect(result.needsReview).toBe(true)
      expect(result.flags.some(f => f.reason === 'borderline_score')).toBe(true)
    })

    it('should not flag normal assessments with high confidence', () => {
      const assessment = {
        aiConfidence: 90,
        rubricScores: { analysis: 4, reasoning: 4, creativity: 4, evidence: 4 }, // No borderline, no variance
        overallScore: 16
      }
      
      const result = shouldFlagForReview(assessment)
      // May still flag for calibration randomly, but should have no mandatory flags
      const mandatoryFlags = result.flags.filter(f => f.reason !== 'calibration_sample')
      expect(mandatoryFlags.length).toBe(0)
    })

    it('should assign correct priority levels', () => {
      expect(REVIEW_PRIORITY.HIGH).toBeDefined()
      expect(REVIEW_PRIORITY.MEDIUM).toBeDefined()
      expect(REVIEW_PRIORITY.LOW).toBeDefined()
      expect(REVIEW_PRIORITY.URGENT).toBeDefined()
    })
  })
})

// ============================================================
// GRADE-LEVEL CALIBRATION TESTS
// ============================================================

describe('Grade-Level Calibration Module', () => {
  describe('getCognitiveStage', () => {
    it('should return cognitive stage for elementary grades', () => {
      const stage = getCognitiveStage('ป.4')
      expect(stage).toBeDefined()
      expect(stage.stage).toBeDefined()
    })

    it('should return cognitive stage for middle school', () => {
      const stage = getCognitiveStage('ม.1')
      expect(stage).toBeDefined()
    })

    it('should return cognitive stage for high school', () => {
      const stage = getCognitiveStage('ม.6')
      expect(stage).toBeDefined()
    })
  })

  describe('getExpectedScoreRange', () => {
    it('should return ranges for all dimensions', () => {
      const range = getExpectedScoreRange('ม.3')
      expect(range).toBeDefined()
      expect(typeof range).toBe('object')
    })
  })

  describe('getAdjustedThresholds', () => {
    it('should return thresholds object', () => {
      const thresholds = getAdjustedThresholds('ป.4')
      expect(thresholds).toBeDefined()
      expect(typeof thresholds).toBe('object')
    })
  })

  describe('checkScoreAppropriateness', () => {
    it('should return appropriateness check result', () => {
      const scores = { analysis: 5, reasoning: 5, creativity: 5, evidence: 5 }
      const result = checkScoreAppropriateness(scores, 'ป.4')
      expect(result).toBeDefined()
    })
  })

  describe('generateGradeCalibrationContext', () => {
    it('should generate prompt context for AI', () => {
      const context = generateGradeCalibrationContext('ม.3', 'วิทยาศาสตร์')
      
      expect(context).toBeDefined()
      expect(typeof context).toBe('string')
      expect(context.length).toBeGreaterThan(50)
    })
  })
})

// ============================================================
// VALIDATION STUDY TESTS
// ============================================================

describe('Validation Study Module', () => {
  describe('calculateCVR', () => {
    it('should return CVR object for expert ratings', () => {
      const expertRatings = [
        { expert: 'e1', itemId: 'item1', rating: 'essential' },
        { expert: 'e2', itemId: 'item1', rating: 'essential' },
        { expert: 'e3', itemId: 'item1', rating: 'essential' },
        { expert: 'e4', itemId: 'item1', rating: 'essential' },
        { expert: 'e5', itemId: 'item1', rating: 'essential' },
      ]
      
      const result = calculateCVR(expertRatings, 'item1', 5)
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })
  })

  describe('calculateCVI', () => {
    it('should calculate CVI from array of CVR values', () => {
      const itemCVRs = [1.0, 0.8, 0.6]
      
      const result = calculateCVI(itemCVRs)
      expect(result).toBeDefined()
    })
  })

  describe('calculateCronbachsAlpha', () => {
    it('should return alpha calculation result', () => {
      // Need 10+ respondents for valid calculation
      const itemScores = Array(15).fill([4, 4, 5, 5, 4])
      
      const result = calculateCronbachsAlpha(itemScores)
      expect(result).toBeDefined()
    })
  })
})

// ============================================================
// INTEGRATION TESTS
// ============================================================

describe('QA Module Integration', () => {
  it('should have all modules available', () => {
    expect(calculateCohensD).toBeDefined()
    expect(generateAdaptiveScaffolding).toBeDefined()
    expect(shouldFlagForReview).toBeDefined()
    expect(getCognitiveStage).toBeDefined()
    expect(calculateCVR).toBeDefined()
  })
})
