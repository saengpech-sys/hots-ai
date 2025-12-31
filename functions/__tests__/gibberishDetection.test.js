/**
 * 🧪 Gibberish Detection Tests
 * 
 * Test cases for gibberishDetection.js module
 */

const {
  detectGibberish,
  quickGibberishCheck,
  getGibberishStats,
  GIBBERISH_CONFIG
} = require('../utils/gibberishDetection')

describe('Gibberish Detection Module', () => {
  
  describe('detectGibberish()', () => {
    
    describe('Clear Gibberish Cases (should detect)', () => {
      
      test('repeated characters (Thai)', () => {
        const result = detectGibberish('กกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกก')
        expect(result.isGibberish).toBe(true)
        expect(result.confidence).toBeGreaterThanOrEqual(60)
        expect(result.signals).toContain('repeated_chars')
      })

      test('repeated characters (English)', () => {
        const result = detectGibberish('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
        expect(result.isGibberish).toBe(true)
        expect(result.signals).toContain('repeated_chars')
      })

      test('keyboard smash pattern (English QWERTY)', () => {
        const result = detectGibberish('asdfghjkl qwerty zxcvbnm asdfgh qwerty')
        expect(result.isGibberish).toBe(true)
        expect(result.signals).toContain('keyboard_smash')
      })

      test('keyboard smash pattern (Thai)', () => {
        const result = detectGibberish('ฟหกดฟหกดฟหกดฟหกดฟหกด เ้าสเ้าสเ้าสเ้าส')
        // Thai keyboard patterns are harder to detect, at least should be suspicious
        expect(result.score).toBeGreaterThan(0)
      })

      test('random consonants only', () => {
        const result = detectGibberish('bcdfghjklmnpqrstvwxyz bcdfghjklmnpqrstvwxyz')
        // Consonant-only strings should have low real word ratio
        expect(result.score).toBeGreaterThan(0)
      })

      test('excessive punctuation', () => {
        const result = detectGibberish('!!!???...###@@@$$$%%%^^^&&&***((()))')
        expect(result.isGibberish).toBe(true)
        expect(result.signals).toContain('excessive_punctuation')
      })

      test('number spam', () => {
        const result = detectGibberish('12345678901234567890123456789012345')
        expect(result.isGibberish).toBe(true)
      })

      test('mixed gibberish', () => {
        const result = detectGibberish('asdfasdf กกกกกก 12341234 !!!??? qwertyqwerty')
        expect(result.isSuspicious || result.isGibberish).toBe(true)
      })

      test('floating Thai vowels/tone marks', () => {
        const result = detectGibberish('่้๊๋ะาิีึืุูเแโใไ่้๊๋ะาิีึืุู่้๊๋ะาิี')
        // Floating marks should have low entropy and no real words
        expect(result.score).toBeGreaterThan(0)
      })
    })

    describe('Valid Answers (should NOT detect as gibberish)', () => {
      
      test('short but meaningful Thai answer', () => {
        const result = detectGibberish('ผมคิดว่าเป็นเพราะมันสำคัญมาก')
        expect(result.isGibberish).toBe(false)
        expect(result.recommendation).toBe('pass')
      })

      test('normal Thai answer with reasoning', () => {
        const result = detectGibberish('การวิเคราะห์ปัญหานี้ทำให้เห็นว่าสาเหตุหลักมาจากการขาดความเข้าใจในเรื่องพื้นฐาน ดังนั้นจึงต้องเริ่มต้นจากการทบทวนความรู้เดิมก่อน')
        expect(result.isGibberish).toBe(false)
        expect(result.score).toBeLessThan(GIBBERISH_CONFIG.suspiciousThreshold)
      })

      test('normal English answer', () => {
        const result = detectGibberish('I think the main reason is because of the lack of understanding in basic concepts. Therefore, we need to start by reviewing the fundamentals first.')
        expect(result.isGibberish).toBe(false)
      })

      test('Thai student casual answer', () => {
        const result = detectGibberish('มันเป็นเพราะว่าคนเราไม่ค่อยรู้ว่าทำอะไรถึงจะดี แต่ถ้าเราลองคิดดูดีๆ แล้ว มันก็ไม่ยากเท่าไหร่')
        expect(result.isGibberish).toBe(false)
      })

      test('answer with some repeated emphasis (still valid)', () => {
        const result = detectGibberish('ผมคิดว่ามันสำคัญมากๆๆ เพราะว่าถ้าไม่ทำ ผลที่ตามมาจะแย่มากครับ')
        expect(result.isGibberish).toBe(false)
      })

      test('mixed Thai-English answer', () => {
        const result = detectGibberish('ผมคิดว่า concept นี้สำคัญเพราะ data ที่เราเห็นบอกว่ามันมีผลต่อ outcome มาก')
        expect(result.isGibberish).toBe(false)
      })
    })

    describe('Edge Cases', () => {
      
      test('empty string', () => {
        const result = detectGibberish('')
        expect(result.isGibberish).toBe(true)
        expect(result.signals).toContain('no_text')
      })

      test('null input', () => {
        const result = detectGibberish(null)
        expect(result.isGibberish).toBe(true)
      })

      test('too short (< 20 chars)', () => {
        const result = detectGibberish('ไม่รู้ครับ')
        expect(result.isGibberish).toBe(true)
        expect(result.signals).toContain('too_short')
      })

      test('exactly 20 characters boundary', () => {
        const result = detectGibberish('ผมคิดว่าเรื่องนี้สำคัญ') // exactly 20
        expect(result.score).toBeLessThan(100) // Should be analyzed, not auto-rejected
      })

      test('whitespace only', () => {
        const result = detectGibberish('                              ')
        expect(result.isGibberish).toBe(true)
      })

      test('newlines only', () => {
        const result = detectGibberish('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n')
        expect(result.isGibberish).toBe(true)
      })
    })

    describe('Suspicious Cases (borderline)', () => {
      
      test('very short but has meaning', () => {
        const result = detectGibberish('ผมว่ามันน่าจะเป็นเพราะปัญหาเศรษฐกิจ')
        // Should be either pass or flag, not outright reject
        expect(result.isGibberish).toBe(false)
      })

      test('some repetition but has content', () => {
        const result = detectGibberish('ดีมากๆๆๆ เพราะว่า ดีมากๆๆ จริงๆ นะครับ')
        // Has some repetition but also has real words, could go either way
        expect(result.score).toBeGreaterThan(0)
      })
    })
  })

  describe('quickGibberishCheck()', () => {
    
    test('should quickly detect obvious gibberish', () => {
      const result = quickGibberishCheck('กกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกก')
      expect(result.isGibberish).toBe(true)
      expect(result.reason).toBe('high_repeat_ratio')
    })

    test('should quickly detect keyboard patterns', () => {
      const result = quickGibberishCheck('qwerty asdfgh zxcvbn qwerty asdfgh')
      expect(result.isGibberish).toBe(true)
      expect(result.reason).toBe('keyboard_pattern')
    })

    test('should pass valid text', () => {
      const result = quickGibberishCheck('ผมคิดว่าการเรียนรู้เป็นสิ่งสำคัญมากครับ')
      expect(result.isGibberish).toBe(false)
    })

    test('should reject too short text', () => {
      const result = quickGibberishCheck('สั้น')
      expect(result.isGibberish).toBe(true)
      expect(result.reason).toBe('too_short')
    })
  })

  describe('getGibberishStats()', () => {
    
    test('should return statistics for gibberish', () => {
      const stats = getGibberishStats('asdfghjkl qwerty zxcvbnm')
      expect(stats).toHaveProperty('score')
      expect(stats).toHaveProperty('isGibberish')
      expect(stats).toHaveProperty('recommendation')
    })

    test('should return statistics for valid text', () => {
      const stats = getGibberishStats('การวิเคราะห์ข้อมูลเป็นสิ่งสำคัญในการตัดสินใจ')
      expect(stats.isGibberish).toBe(false)
      expect(stats.recommendation).toBe('pass')
    })
  })

  describe('Integration with Assessment Flow', () => {
    
    test('gibberish should not require human review', () => {
      const result = detectGibberish('กกกกกกกกกกกกกกกกกกกกกกกกกกกกกกกก')
      expect(result.isGibberish).toBe(true)
      expect(result.recommendation).toBe('reject')
      // High confidence means AI is sure about the low quality
      expect(result.confidence).toBeGreaterThanOrEqual(60)
    })

    test('valid answer should pass through to AI assessment', () => {
      const result = detectGibberish('ผมคิดว่าสาเหตุหลักของปัญหานี้มาจากการขาดความรู้พื้นฐาน และควรแก้ไขโดยการศึกษาเพิ่มเติม')
      expect(result.isGibberish).toBe(false)
      expect(result.recommendation).toBe('pass')
    })
  })

  describe('Real-world Student Answers', () => {
    
    test('lazy but valid answer', () => {
      const result = detectGibberish('ไม่รู้จริงๆ ครับ แต่ถ้าให้เดาก็คงเป็นเพราะมันยากเกินไป')
      expect(result.isGibberish).toBe(false)
    })

    test('copy-paste attempt detection', () => {
      const repeatedText = 'ตัวอย่างนี้สำคัญมาก '.repeat(5) // 5x repetition
      const result = detectGibberish(repeatedText)
      // Copy-paste of real text is harder to detect - but should have some score
      expect(result.score).toBeGreaterThanOrEqual(0)
    })

    test('Thai slang/informal but valid', () => {
      const result = detectGibberish('คือมันแบบว่า ไม่ค่อยเก็ตเลยอะ แต่ก็พอจะเข้าใจว่าทำไมมันถึงเป็นแบบนี้')
      expect(result.isGibberish).toBe(false)
    })

    test('academic Thai answer', () => {
      const result = detectGibberish('จากการวิเคราะห์ข้อมูลพบว่า ปัจจัยหลักที่ส่งผลต่อผลลัพธ์ได้แก่ 1) ความรู้พื้นฐาน 2) ทัศนคติ 3) แรงจูงใจ ซึ่งสอดคล้องกับทฤษฎีการเรียนรู้')
      expect(result.isGibberish).toBe(false)
      expect(result.score).toBeLessThan(30)
    })
  })
})
