const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { OpenAI } = require('openai')
const cors = require('cors')({ origin: true })
const { calculatePoints, checkBadges, calculateStreak, BADGES } = require('./gamification')
const { defineSecret } = require('firebase-functions/params')

admin.initializeApp()
const db = admin.firestore()

// Define OpenAI API Key as a secret
const openaiApiKey = defineSecret('OPENAI_API_KEY')

// Initialize OpenAI
let openai
try {
  const apiKey = process.env.OPENAI_API_KEY
  if (apiKey) {
    openai = new OpenAI({ apiKey })
    console.log('✅ OpenAI initialized successfully')
  } else {
    console.warn('⚠️ OpenAI API key not found in environment')
  }
} catch (error) {
  console.error('❌ Error initializing OpenAI:', error)
}

/**
 * Cloud Function to assess student answers using OpenAI
 * Evaluates Higher-Order Thinking Skills (HOTS)
 */
exports.assessAnswer = functions.runWith({ secrets: [openaiApiKey] }).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { 
        studentId, sessionId, courseId, questionId, questionContext, studentAnswer, 
        learningOutcomes, typingFingerprint,
        // 🔬 NEW: Research metadata fields
        answerMetrics,       // { wordCount, charCount, sentenceCount }
        timingMetrics,       // { answerDurationMs, firstKeystrokeMs }
        revisionMetrics,     // { revisionCount, majorRevisions }
        assessmentType,      // "pretest" | "posttest" | "formative"
        experimentGroup,     // "control" | "treatment" | null
        sessionNumber,       // nth session for this student
        weekOfTerm           // Week 1-20
      } = req.body

      // Validate input
      if (!studentId || !sessionId || !studentAnswer) {
        return res.status(400).send({ 
          error: 'Missing required fields: studentId, sessionId, studentAnswer' 
        })
      }

      // Check if OpenAI is configured
      if (!openai) {
        return res.status(500).send({
          error: 'OpenAI API not configured',
          message: 'Please set OpenAI API key using: firebase functions:config:set openai.key="your-key"'
        })
      }

      // 🆕 Enhanced Anti-Cheat: Server-side validation with typing fingerprint
      const antiCheatResult = validateAntiCheat(studentAnswer, typingFingerprint)
      if (!antiCheatResult.isValid) {
        console.warn(`🚨 Anti-cheat triggered for student ${studentId}:`, antiCheatResult.reasons)
        
        // Log suspicious activity
        await db.collection('antiCheatLogs').add({
          studentId,
          sessionId,
          questionId: questionId || null,
          answer: studentAnswer.substring(0, 200), // Store only first 200 chars
          typingFingerprint: typingFingerprint || null,
          reasons: antiCheatResult.reasons,
          suspiciousLevel: antiCheatResult.suspiciousLevel,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
        
        return res.status(400).send({
          error: 'Possible copy-paste detected',
          antiCheat: true,
          details: antiCheatResult.reasons,
          suspiciousLevel: antiCheatResult.suspiciousLevel
        })
      }
      
      // Log warning-level detections for review
      if (antiCheatResult.suspiciousLevel >= 30) {
        await db.collection('antiCheatLogs').add({
          studentId,
          sessionId,
          questionId: questionId || null,
          level: 'warning',
          suspiciousLevel: antiCheatResult.suspiciousLevel,
          reasons: antiCheatResult.reasons,
          warnings: antiCheatResult.warnings || [],
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      // 🆕 SCAFFOLDING: Check if this is a retry attempt
      const sessionRef = db.collection('sessions').doc(sessionId)
      const sessionDoc = await sessionRef.get()
      const sessionData = sessionDoc.data() || {}
      const scaffoldingAttempts = sessionData.scaffoldingAttempts || 0
      const previousAnswer = sessionData.previousAnswer || null
      const isScaffolding = sessionData.isScaffolding || false

      // Create assessment prompt for OpenAI
      const prompt = createAssessmentPrompt(questionContext, studentAnswer, {
        isScaffolding,
        scaffoldingAttempts,
        previousAnswer
      })

      // Get model from config or env
      const model = process.env.OPENAI_MODEL || functions.config().openai?.model || 'gpt-4o'

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational assessor specializing in Higher-Order Thinking Skills (HOTS) evaluation. You provide accurate, constructive feedback in Thai language. Always respond with valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })

      const responseText = completion.choices[0].message.content
      let assessmentResult

      try {
        // Clean markdown wrapper if present
        let cleanedText = responseText.trim()
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        assessmentResult = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', responseText)
        throw new Error('Invalid response format from AI')
      }

      // Validate assessment result structure
      if (!validateAssessmentResult(assessmentResult)) {
        throw new Error('Assessment result missing required fields')
      }

      // Calculate overall score
      const rubricScores = assessmentResult.rubricScores
      const overallScore = 
        rubricScores.analysis + 
        rubricScores.reasoning + 
        rubricScores.creativity + 
        rubricScores.evidence

      // 🆕 SCAFFOLDING LOGIC: Check if score is low and should ask probing question
      const shouldScaffold = overallScore < 10 && scaffoldingAttempts < 2 && !isScaffolding
      
      if (shouldScaffold && assessmentResult.probingQuestion) {
        // Don't save final assessment yet - return probing question
        await sessionRef.set({
          isScaffolding: true,
          scaffoldingAttempts: scaffoldingAttempts + 1,
          previousAnswer: studentAnswer,
          probingQuestion: assessmentResult.probingQuestion,
          lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true })

        return res.status(200).json({
          success: true,
          needsScaffolding: true,
          probingQuestion: assessmentResult.probingQuestion,
          currentScore: overallScore,
          attemptsRemaining: 2 - (scaffoldingAttempts + 1)
        })
      }

      // Reset scaffolding state if this is the final answer
      if (isScaffolding) {
        await sessionRef.set({
          isScaffolding: false,
          previousAnswer: null,
          probingQuestion: null
        }, { merge: true })
      }

      // ประเมิน Learning Outcomes ถ้ามี
      let loAssessment = null
      console.log('LO Assessment check:', { 
        hasLOs: !!learningOutcomes, 
        loCount: learningOutcomes?.length, 
        hasCourseId: !!courseId,
        learningOutcomes: JSON.stringify(learningOutcomes)
      })
      
      if (learningOutcomes && learningOutcomes.length > 0 && courseId) {
        console.log('Starting LO assessment...')
        loAssessment = await assessLearningOutcomesInternal(
          studentAnswer,
          learningOutcomes,
          assessmentResult
        )
        console.log('LO assessment result:', JSON.stringify(loAssessment))
      } else {
        console.log('Skipping LO assessment - missing requirements')
      }

      // 🆕 PERSONALIZED FEEDBACK 2.0: Get historical progress for comparison
      let historicalComparison = null
      let personalizedFeedback = assessmentResult.feedback
      
      try {
        const twoWeeksAgo = new Date()
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
        
        const recentAssessments = await db.collection('assessments')
          .where('studentId', '==', studentId)
          .where('courseId', '==', courseId || null)
          .where('createdAt', '>=', twoWeeksAgo)
          .orderBy('createdAt', 'desc')
          .limit(10)
          .get()
        
        if (!recentAssessments.empty) {
          const previousScores = {
            analysis: [],
            reasoning: [],
            creativity: [],
            evidence: [],
            overall: []
          }
          
          recentAssessments.forEach(doc => {
            const data = doc.data()
            if (data.rubricScores) {
              previousScores.analysis.push(data.rubricScores.analysis)
              previousScores.reasoning.push(data.rubricScores.reasoning)
              previousScores.creativity.push(data.rubricScores.creativity)
              previousScores.evidence.push(data.rubricScores.evidence)
              previousScores.overall.push(data.overallScore)
            }
          })
          
          // Calculate averages from recent history
          const calculateAvg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
          
          const avgScores = {
            analysis: calculateAvg(previousScores.analysis),
            reasoning: calculateAvg(previousScores.reasoning),
            creativity: calculateAvg(previousScores.creativity),
            evidence: calculateAvg(previousScores.evidence),
            overall: calculateAvg(previousScores.overall)
          }
          
          historicalComparison = {
            previousAverage: avgScores,
            currentScores: rubricScores,
            improvements: [],
            declines: [],
            sampleSize: previousScores.overall.length
          }
          
          // Compare each dimension
          const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
          dimensions.forEach(dim => {
            const diff = rubricScores[dim] - avgScores[dim]
            if (diff > 0.5) {
              historicalComparison.improvements.push({
                dimension: dim,
                previous: avgScores[dim].toFixed(1),
                current: rubricScores[dim],
                improvement: diff.toFixed(1)
              })
            } else if (diff < -0.5) {
              historicalComparison.declines.push({
                dimension: dim,
                previous: avgScores[dim].toFixed(1),
                current: rubricScores[dim],
                decline: Math.abs(diff).toFixed(1)
              })
            }
          })
          
          // Generate personalized feedback based on progress
          const progressFeedback = []
          
          if (historicalComparison.improvements.length > 0) {
            progressFeedback.push('\n\n🎉 **ความก้าวหน้าของคุณ:**')
            historicalComparison.improvements.forEach(imp => {
              const dimName = {
                analysis: 'การวิเคราะห์',
                reasoning: 'การให้เหตุผล',
                creativity: 'ความคิดสร้างสรรค์',
                evidence: 'การใช้หลักฐาน'
              }[imp.dimension]
              progressFeedback.push(
                `- **${dimName}** พัฒนาขึ้นเห็นได้ชัด! จาก ${imp.previous}/5 เป็น ${imp.current}/5 (+${imp.improvement}) 🚀`
              )
            })
          }
          
          if (historicalComparison.declines.length > 0) {
            progressFeedback.push('\n\n💪 **จุดที่ควรให้ความสนใจ:**')
            historicalComparison.declines.forEach(dec => {
              const dimName = {
                analysis: 'การวิเคราะห์',
                reasoning: 'การให้เหตุผล',
                creativity: 'ความคิดสร้างสรรค์',
                evidence: 'การใช้หลักฐาน'
              }[dec.dimension]
              progressFeedback.push(
                `- **${dimName}** ลดลงจากเดิมเล็กน้อย (จาก ${dec.previous}/5 เป็น ${dec.current}/5) ลองเน้นที่ด้านนี้ในครั้งถัดไปนะ`
              )
            })
          }
          
          if (overallScore > avgScores.overall + 2) {
            progressFeedback.push('\n\n⭐ **น่าทึ่ง!** คะแนนรวมของคุณสูงกว่าค่าเฉลี่ยล่าสุดของคุณเอง! คงความสม่ำเสมอแบบนี้ต่อไปนะ')
          }
          
          if (progressFeedback.length > 0) {
            personalizedFeedback += '\n\n---\n' + progressFeedback.join('\n')
          }
          
        }
      } catch (error) {
        console.error('Error generating historical comparison:', error)
        // Continue without personalized feedback if error
      }

      // 🆕 Fetch question data for progressive LO tracking
      let questionData = null
      if (questionId) {
        try {
          const questionDoc = await db.collection('questions').doc(questionId).get()
          if (questionDoc.exists) {
            questionData = questionDoc.data()
          }
        } catch (error) {
          console.error('Error fetching question data:', error)
        }
      }

      // 🆕 PERFORMANCE: Fetch student data for denormalization (prevent N+1 queries in reports)
      let studentData = null
      try {
        const studentDoc = await db.collection('users').doc(studentId).get()
        if (studentDoc.exists) {
          const data = studentDoc.data()
          studentData = {
            displayName: data.displayName || 'Unknown Student',
            studentId: data.studentId || null,
            grade: data.grade || null,
            room: data.room || null,
            section: data.section || null,
            schoolId: data.schoolId || null
          }
        }
      } catch (error) {
        console.error('Error fetching student data:', error)
      }

      // Save assessment to Firestore
      const assessmentData = {
        sessionId,
        studentId,
        courseId: courseId || null,
        questionId: questionId || null,
        questionContext: questionContext || 'General HOTS Assessment',
        rawAnswer: studentAnswer,
        rubricScores: {
          analysis: Math.min(5, Math.max(0, rubricScores.analysis)),
          reasoning: Math.min(5, Math.max(0, rubricScores.reasoning)),
          creativity: Math.min(5, Math.max(0, rubricScores.creativity)),
          evidence: Math.min(5, Math.max(0, rubricScores.evidence))
        },
        overallScore: Math.min(20, Math.max(0, overallScore)),
        feedbackText: personalizedFeedback, // 🆕 Enhanced with historical comparison
        historicalComparison: historicalComparison, // 🆕 Store comparison data
        suggestions: assessmentResult.suggestions || [],
        strengths: assessmentResult.strengths || [],
        weaknesses: assessmentResult.weaknesses || [],
        loAssessment: loAssessment || null,
        questionData: questionData, // 🆕 Store question data for progressive LO tracking
        studentData: studentData, // 🆕 DENORMALIZED: Student info for faster reports
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        aiModel: process.env.OPENAI_MODEL || 'gpt-4o',
        
        // 🔬 NEW: Research metadata for AIED studies
        promptVersion: 'v2.1-arce-thai',  // Track prompt changes
        
        // Answer metrics (RQ3: Learning Analytics)
        answerMetrics: answerMetrics ? {
          wordCount: answerMetrics.wordCount || 0,
          charCount: answerMetrics.charCount || 0,
          sentenceCount: answerMetrics.sentenceCount || 0,
          avgWordsPerSentence: answerMetrics.avgWordsPerSentence || 0,
          uniqueWordRatio: answerMetrics.uniqueWordRatio || 0
        } : null,
        
        // Timing metrics (RQ3: Learning Analytics)
        timingMetrics: timingMetrics ? {
          answerDurationMs: timingMetrics.answerDurationMs || 0,
          firstKeystrokeMs: timingMetrics.firstKeystrokeMs || 0,
          thinkingPauseCount: timingMetrics.thinkingPauseCount || 0,
          avgTypingSpeed: timingMetrics.avgTypingSpeed || 0
        } : null,
        
        // Revision metrics (RQ3: Learning Analytics)
        revisionMetrics: revisionMetrics ? {
          revisionCount: revisionMetrics.revisionCount || 0,
          majorRevisions: revisionMetrics.majorRevisions || 0
        } : null,
        
        // Assessment context (RQ1: Effectiveness)
        assessmentContext: {
          assessmentType: assessmentType || 'formative',  // pretest | posttest | formative
          experimentGroup: experimentGroup || null,        // control | treatment
          sessionNumber: sessionNumber || null,
          weekOfTerm: weekOfTerm || null,
          scaffoldingProvided: scaffoldingAttempts > 0,
          scaffoldingLevel: scaffoldingAttempts
        }
      }

      const assessmentRef = await db.collection('assessments').add(assessmentData)

      // บันทึก Student Progress ถ้ามี LO assessment (+ Gamification)
      if (loAssessment && loAssessment.passedLOs && loAssessment.passedLOs.length > 0) {
        await updateStudentProgress(studentId, courseId, loAssessment.passedLOs, assessmentData)
      } else {
        // Update progress even without new LOs (for points and streaks)
        await updateStudentProgress(studentId, courseId, [], assessmentData)
      }

      // Update or create session document (reuse sessionRef from earlier)
      const latestSessionDoc = await sessionRef.get()
      
      if (latestSessionDoc.exists) {
        // Update existing session
        await sessionRef.update({
          messageCount: admin.firestore.FieldValue.increment(1),
          lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
        })
      } else {
        // Create new session if it doesn't exist
        await sessionRef.set({
          studentId,
          messageCount: 1,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      // Return result
      return res.status(200).json({
        success: true,
        id: assessmentRef.id,
        result: assessmentData
      })

    } catch (error) {
      console.error('Assessment error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

/**
 * Create assessment prompt for OpenAI with optional scaffolding support
 */
function createAssessmentPrompt(context, answer, options = {}) {
  const { isScaffolding, scaffoldingAttempts, previousAnswer } = options
  
  let scaffoldingInstructions = ''
  if (isScaffolding && previousAnswer) {
    scaffoldingInstructions = `

🔄 SCAFFOLDING MODE (ครั้งที่ ${scaffoldingAttempts + 1}/2):
นี่คือคำตอบครั้งที่ ${scaffoldingAttempts + 1} หลังจากถูกถามคำถามชี้แนะ
คำตอบครั้งก่อน: """${previousAnswer}"""
ให้ประเมินว่านักเรียนพัฒนาขึ้นหรือไม่ และให้คะแนนตามคำตอบปัจจุบัน`
  }

  const needsProbingQuestion = !isScaffolding && scaffoldingAttempts === 0
  return `
ประเมินคำตอบปลายเปิดของนักเรียนอย่างเป็นกลางและตรวจสอบได้

วัตถุประสงค์
- ให้คะแนนคำตอบของนักเรียนตามทักษะการคิดขั้นสูง (HOTS) 4 ด้าน พร้อมข้อเสนอแนะที่สั้น กระชับ และนำไปใช้พัฒนาต่อได้จริง
- ส่งคืน “JSON เท่านั้น” ตามสคีมาที่กำหนด ห้ามมีข้อความอื่นปะปน

อินพุต
บริบท (context): ${context || 'การประเมินทักษะการคิดทั่วไป'}
คำตอบของนักเรียน (answer): """${answer}"""

ขอบเขตข้อมูลและอคติ
- ใช้เฉพาะข้อมูลจาก “บริบท” และ “คำตอบนักเรียน” เท่านั้น ห้ามอ้างความรู้/ข้อเท็จจริงภายนอก
- เป็นกลาง ไม่ให้คุณค่าตามความยาวภาษา/สำนวน เว้นแต่ส่งผลต่อ “ความชัดเจนของเหตุผล/หลักฐาน”
- หากคำตอบว่าง เปะปะ หรือไม่เกี่ยวข้อง ให้ 0 ทุกด้าน พร้อม feedback สั้น ๆ อธิบายเหตุผล

หลักการให้คะแนน (0–5 เป็นจำนวนเต็ม)
ให้คะแนนทีละด้านตาม “สมอคะแนน (Anchors)” ด้านล่างนี้ และเลือกคะแนนที่ “ต่ำสุดที่อธิบายพฤติกรรมของคำตอบครบถ้วน” (minimum mastery)

1) การวิเคราะห์ (Analysis)
- 5: แยกประเด็น/องค์ประกอบสำคัญครบ โครงสร้างชัด เชื่อมความสัมพันธ์สาเหตุ-ผลและเงื่อนไขอย่างเป็นระบบ
- 4: แยกประเด็นหลักชัด มีโครงสร้างและความเชื่อมโยงส่วนใหญ่ถูกต้อง
- 3: แยกบางส่วนได้ เห็นโครงร่างการวิเคราะห์ แต่ขาดบางประเด็นหรือความเชื่อมโยงสำคัญ
- 2: วิเคราะห์ตื้น อธิบายแบบเล่าเรื่องมากกว่าแยกส่วน
- 1: ระบุข้อเท็จจริงกระจัดกระจาย ไร้โครงสร้าง
- 0: ไม่วิเคราะห์/นอกเรื่อง

2) การให้เหตุผล (Reasoning)
- 5: เหตุผลเป็นลำดับ มีตรรกะ/การอนุมานถูกต้อง รองรับด้วยข้อเท็จจริงภายในคำตอบ สรุปสอดคล้องกับเหตุผล
- 4: ลำดับคิดดี มีการอนุมานส่วนใหญ่ถูกต้อง มีจุดสะดุดเล็กน้อย
- 3: มีเหตุผลพื้นฐาน แต่ยังมีช่องโหว่/สรุปก้าวกระโดดบางช่วง
- 2: เหตุผลคลุมเครือ พิงความเชื่อมากกว่าตรรกะ
- 1: ตรรกะผิดพลาดบ่อย สรุปไม่ตามเหตุผล
- 0: ไม่มีเหตุผลที่ตรวจสอบได้

3) ความคิดสร้างสรรค์ (Creativity)
- 5: เสนอกรอบคิด/วิธีมองใหม่ ชี้มุมไม่ชัดเจนเดิม มีตัวอย่าง/เปรียบเทียบสร้างสรรค์ที่เกี่ยวข้อง
- 4: มีมุมใหม่ชัดเจนอย่างน้อยหนึ่งจุด
- 3: ปรับ/ต่อยอดไอเดียเดิมได้บ้าง
- 2: ความคิดทั่วไป ซ้ำแพทเทิร์นคุ้นเคย
- 1: ทวนซ้ำความรู้เดิม ไร้มุมเพิ่ม
- 0: ไม่แสดงความคิดริเริ่ม

4) การใช้หลักฐาน (Evidence)
- 5: ยกหลักฐาน/ตัวอย่างเฉพาะเจาะจง ตรงประเด็น อธิบายความเชื่อมโยงกับข้อสรุปอย่างชัด
- 4: มีหลักฐานที่เกี่ยวข้องและอธิบายความเชื่อมโยงพอควร
- 3: มีตัวอย่างแต่ยังทั่วไป/เชื่อมโยงหลวม
- 2: อ้างกว้าง ๆ ไม่ชัดเจนหรือไม่สัมพันธ์กับข้อสรุป
- 1: กล่าวอ้างลอย ๆ ไร้ตัวอย่างตรวจสอบได้
- 0: ไม่มีหลักฐาน

ข้อกำหนดการให้ข้อเสนอแนะ
- ภาษาไทย สุภาพ กระชับ (2–3 ประโยค)
- “strengths/weaknesses” เป็นวลีสั้น ๆ ชี้จุดที่สังเกตได้จริง
- “suggestions” เป็นคำแนะนำเชิงปฏิบัติ ทำได้ทันที/นำไปใช้พัฒนาคำตอบรอบถัดไป

ข้อควรระวังในการตัดสิน
- ไม่ลงโทษเพียงเพราะคำตอบสั้น หากครบเกณฑ์ให้คะแนนตามคุณภาพ
- หากมีตรรกะผิด/สรุปก้าวกระโดด ให้หักที่ Reasoning ชัดเจน
- หากตัวอย่างคลุมเครือ/ไม่สอดคล้อง ให้หักที่ Evidence
- หากเล่าเรื่องยาวแต่ไม่แยกส่วน ให้หักที่ Analysis

รูปแบบผลลัพธ์ (บังคับ: JSON เท่านั้น, ไม่มีข้อความอื่น)
- ใช้ตัวเลขจำนวนเต็ม 0–5 เท่านั้น
- ห้ามใส่คอมเมนต์/ตัวอธิบายนอก JSON

${needsProbingQuestion ? `
**โหมด Scaffolding Mode (คะแนนรวมต่ำกว่า 10/20)**
เมื่อคำนวณคะแนนรวมได้น้อยกว่า 10 คะแนน ให้เพิ่มฟิลด์ "probingQuestion" ในผลลัพธ์:
- "probingQuestion": คำถามชี้ทางภาษาไทย (1-2 ประโยค) ที่ช่วยให้นักเรียนคิดลึกและปรับปรุงคำตอบ
- คำถามต้องเฉพาะเจาะจงกับจุดอ่อนในคำตอบ (ดูจาก weaknesses)
- ใช้ภาษาให้กำลังใจ เปิดโอกาสคิดต่อ ไม่ใช่แค่บอกว่าผิด
- ตัวอย่าง: "คุณลองขยายความว่า 'เหตุผลที่สำคัญ' คืออะไร และทำไมถึงมีผลต่อประเด็นนี้ได้ไหม?"
- หรือ: "ลองยกตัวอย่างเฉพาะเจาะจงมาประกอบคำอธิบายของคุณดูนะ จะช่วยทำให้คำตอบชัดเจนขึ้น"
` : ''}

สคีมาที่ต้องส่งคืน:
{
  "rubricScores": {
    "analysis": 0-5,
    "reasoning": 0-5,
    "creativity": 0-5,
    "evidence": 0-5
  },
  "feedback": "ข้อเสนอแนะโดยรวมภาษาไทย 2-3 ประโยค",
  "strengths": ["จุดเด่น 1", "จุดเด่น 2"],
  "weaknesses": ["จุดที่ควรพัฒนา 1", "จุดที่ควรพัฒนา 2"],
  "suggestions": ["คำแนะนำเชิงสร้างสรรค์ 1", "คำแนะนำ 2"]${needsProbingQuestion ? ',\n  "probingQuestion": "คำถามชี้ทางภาษาไทย (ถ้าคะแนนรวม < 10)"' : ''}
}

ให้ทำงานตอนนี้กับอินพุตที่ให้ และส่งคืนเฉพาะ JSON ตามสคีมา  

**สำคัญ**: ให้คะแนนและข้อเสนอแนะที่เป็นประโยชน์ เป็นกลาง และช่วยพัฒนาทักษะจริงๆ
`
}

/**
 * Assess which Learning Outcomes were demonstrated in student's answer
 * @param {string} studentAnswer - The student's answer text
 * @param {Array} learningOutcomes - Array of LO objects with loCode and loDescription
 * @param {Object} assessmentResult - The HOTS assessment result
 * @returns {Object} { passedLOs: [], analysis: string }
 */
async function assessLearningOutcomesInternal(studentAnswer, learningOutcomes, assessmentResult) {
  try {
    if (!openai) {
      console.warn('OpenAI not configured, skipping LO assessment')
      return { passedLOs: [], analysis: 'AI not configured' }
    }

    // 🔍 Debug logging
    console.log('🎓 LO Assessment Input:', {
      learningOutcomesCount: learningOutcomes.length,
      learningOutcomes: learningOutcomes.map(lo => ({
        code: lo.loCode || lo.code,
        description: (lo.loDescription || lo.description || '').substring(0, 50) + '...'
      })),
      rubricScores: assessmentResult.rubricScores
    })

    // สร้าง prompt สำหรับประเมิน LO (รองรับทั้ง loCode/code และ loDescription/description)
    const loList = learningOutcomes.map((lo, idx) => {
      const code = lo.loCode || lo.code || `LO${idx + 1}`
      const description = lo.loDescription || lo.description || 'No description'
      return `${idx + 1}. [${code}] ${description}`
    }).join('\n')

    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการประเมินผลการเรียนรู้ตาม Learning Outcomes (LOs) ที่เคร่งครัดเรื่องหลักฐานและความเที่ยงตรง

อินพุต
คำตอบของนักเรียน (Student Answer):
${studentAnswer}

ผลการประเมิน HOTS (0–5):
- การวิเคราะห์ (analysis): ${assessmentResult.rubricScores.analysis}
- การให้เหตุผล (reasoning): ${assessmentResult.rubricScores.reasoning}
- ความคิดสร้างสรรค์ (creativity): ${assessmentResult.rubricScores.creativity}
- การใช้หลักฐาน (evidence): ${assessmentResult.rubricScores.evidence}

รายการ Learning Outcomes (loList): ${loList}
> หมายเหตุ: แต่ละ LO ต้องมีรหัสระบุชัด เช่น "LO1: …", "LO2: …" (ใช้รหัสดังกล่าวในเอาต์พุต)

คำสั่ง (เกณฑ์การผ่าน LO)
ประเมินว่า "คำตอบของนักเรียน" แสดงให้เห็นว่า “ผ่าน” LO ใดบ้าง โดยต้องผ่านครบทั้ง 3 เงื่อนไขต่อ LO:
1) การตรงประเด็นเนื้อหา: เนื้อหา/สาระสำคัญในคำตอบครอบคลุมเจตนารมณ์ของ LO อย่างมีนัยสำคัญ (ไม่ใช่เพียงการเอ่ยถึงผิวเผิน)
2) ระดับความเข้าใจและทักษะ: มีหลักฐานเชิงคุณภาพของความเข้าใจ/ทักษะที่ LO คาดหวัง (เช่น นิยามที่ถูกต้อง ความเชื่อมโยงเหตุ–ผล การสังเคราะห์แนวคิด การประยุกต์ ฯลฯ)
3) เกณฑ์ HOTS ขั้นต่ำ: มิติ HOTS ที่ “เกี่ยวข้องกับ LO นั้น” ต้องมีคะแนนอย่างน้อย 3/5
   - แนวโยงคำกริยา–มิติ HOTS เพื่อระบุ “มิติที่เกี่ยวข้อง”:
     - วิเคราะห์/จำแนก/เปรียบเทียบ → analysis ≥ 3
     - ให้เหตุผล/อธิบายเหตุ–ผล/สรุปเชิงตรรกะ → reasoning ≥ 3
     - สร้างสรรค์/ออกแบบ/เสนอแนวคิดใหม่ → creativity ≥ 3
     - อ้างอิง/ยกตัวอย่างมีที่มา/ใช้ข้อมูลสนับสนุน → evidence ≥ 3
   - หาก LO สะท้อนหลายทักษะหลัก ให้ตรวจ ทุกมิติที่เกี่ยวข้อง ต้อง ≥ 3/5 ทั้งหมด

ข้อควรระวัง:
- ให้ "ผ่าน" เฉพาะ LO ที่มี หลักฐานชัดเจนในคำตอบ เท่านั้น ห้ามอนุมานเกินจากข้อความที่ปรากฏ
- ถ้าอินพุต HOTS ของมิติที่จำเป็น หายไป/ไม่ระบุ ให้ถือว่า ไม่ผ่าน เงื่อนไขข้อ (3)
- หากคำตอบนอกเรื่อง/สั้นมาก/ขาดสาระ ให้ถือว่าไม่ผ่านทุก LO
- หาก LO ไม่มีรหัส ให้ ละเว้น จากการพิจารณา (ไม่สร้างรหัสขึ้นเอง)

รูปแบบเอาต์พุต (เคร่งครัด)
ส่งคืน JSON เท่านั้น โดยมี 2 คีย์ และห้ามมีคีย์อื่น/ข้อความประกอบ:
{
  "passedLOs": ["LO1", "LO2"],
  "analysis": "สรุปเหตุผล 2–3 ประโยคว่าทำไม LO เหล่านี้จึงผ่าน โดยอ้างอิงหลักฐานจากคำตอบและการผ่านเกณฑ์ HOTS ที่เกี่ยวข้อง"
}

แนวทางการเขียน "analysis":
- ระบุภาพรวมของหลักฐานในคำตอบที่สอดคล้องกับ LO ที่ผ่าน (เช่น นิยามถูกต้อง เชื่อมเหตุ–ผลได้ สร้างแนวคิดใหม่ ฯลฯ)
- ระบุอย่างกระชับว่ามิติ HOTS ใดบ้างที่ถึงเกณฑ์ (≥3/5) และเชื่อมกับข้อกำหนดของ LO
- หากไม่ผ่านสัก LO ให้ "passedLOs": [] และอธิบายสั้น ๆ ว่าเหตุผลหลักคืออะไร (เช่น เนื้อหาไม่ครอบคลุม/คะแนน HOTS ไม่ถึงเกณฑ์)

ตัวอย่างรูปแบบเอาต์พุต (เป็นแม่แบบ ไม่ใช่คำตอบจริง)
{
  "passedLOs": ["LO1", "LO3"],
  "analysis": "คำตอบวิเคราะห์องค์ประกอบและเชื่อมเหตุ–ผลได้ตรงตาม LO1 และเสนอแนวคิดใหม่ที่ใช้งานได้ตาม LO3 โดยมิติ analysis และ creativity อยู่ที่ ≥3/5 พร้อมยกตัวอย่างอ้างอิงที่เหมาะสม"
}`

    const model = process.env.OPENAI_MODEL || functions.config().openai?.model || 'gpt-4o'
    
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert in learning outcome assessment. You provide accurate, evidence-based evaluations. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 500
    })

    const responseText = completion.choices[0].message.content
    
    // Clean response - remove markdown code blocks if present
    let cleanedText = responseText.trim()
    
    // Remove ```json or ``` wrapper
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
      cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
    }
    
    const loResult = JSON.parse(cleanedText)

    console.log('✅ LO Assessment Result:', {
      passedLOs: loResult.passedLOs,
      analysisPreview: (loResult.analysis || '').substring(0, 100) + '...'
    })

    return {
      passedLOs: loResult.passedLOs || [],
      analysis: loResult.analysis || 'ไม่สามารถวิเคราะห์ได้'
    }

  } catch (error) {
    console.error('LO Assessment error:', error)
    return {
      passedLOs: [],
      analysis: 'เกิดข้อผิดพลาดในการประเมิน LO'
    }
  }
}

/**
 * Update student progress in Firestore
 * @param {string} studentId - The student's ID
 * @param {string} courseId - The course ID
 * @param {Array} passedLOs - Array of LO codes that were passed
 */
async function updateStudentProgress(studentId, courseId, passedLOs, assessmentData = null) {
  try {
    const progressRef = db.collection('studentProgress')
      .doc(`${studentId}_${courseId}`)

    const progressDoc = await progressRef.get()
    const currentDate = new Date().toISOString()

    if (progressDoc.exists) {
      // อัพเดทความคืบหน้าที่มีอยู่
      const currentData = progressDoc.data()
      const currentPassed = currentData.passedLOs || []
      
      // รวม LO ใหม่ที่ผ่าน (ไม่ซ้ำ)
      const updatedPassedLOs = [...new Set([...currentPassed, ...passedLOs])]

      // 🆕 PROGRESSIVE LO TRACKING: Update accumulated scores
      const loProgress = currentData.loProgress || {}
      
      if (assessmentData && assessmentData.questionData && assessmentData.questionData.relatedLOs) {
        const relatedLOs = assessmentData.questionData.relatedLOs
        const rubricScores = assessmentData.rubricScores || {}
        const loConfigs = assessmentData.questionData.loConfigs || []
        const questionId = assessmentData.questionId

        // DYNAMIC SCORING: Fetch question psychometrics once
        let difficultyMultiplier = 1.0
        if (questionId) {
          try {
            const questionDoc = await db.collection('questions').doc(questionId).get()
            if (questionDoc.exists) {
              const qData = questionDoc.data()
              if (qData.psychometrics && qData.psychometrics.pValue) {
                const p = qData.psychometrics.pValue
                if (p < 0.4) {
                  difficultyMultiplier = 0.8 // Hard question
                  console.log(`Dynamic Scoring: Hard question (p=${p}), multiplier=0.8`)
                } else if (p > 0.8) {
                  difficultyMultiplier = 1.2 // Easy question
                  console.log(`Dynamic Scoring: Easy question (p=${p}), multiplier=1.2`)
                }
              }
            }
          } catch (err) {
            console.warn('Failed to fetch question psychometrics:', err)
          }
        }

        for (const loCode of relatedLOs) {
          // Find LO configuration to know which dimensions are relevant
          const loConfig = loConfigs.find(c => c.loCode === loCode || c.code === loCode)
          const relatedDimensions = loConfig?.relatedDimensions || ['analysis', 'reasoning', 'creativity', 'evidence']
          
          // Calculate target score
          let targetScore = Math.floor(relatedDimensions.length * 4 * difficultyMultiplier)

          // Initialize if doesn't exist
          if (!loProgress[loCode]) {
            loProgress[loCode] = {
              accumulatedScore: 0,
              targetScore: targetScore,
              attempts: 0,
              isPassed: false,
              lastAttemptDate: currentDate,
              strugglingDimensions: [],
              microLessonsViewed: []
            }
          } else {
             // Update target score if it was default or needs adjustment
             // Only update if the new target score is different and we want to adapt
             if (difficultyMultiplier !== 1.0) {
                loProgress[loCode].targetScore = targetScore
             }
          }

          const progress = loProgress[loCode]
          progress.attempts++
          progress.lastAttemptDate = currentDate

          // Accumulate scores from relevant dimensions (only if score >= 3)
          let earnedScore = 0
          const struggling = []
          
          relatedDimensions.forEach(dim => {
            const score = rubricScores[dim] || 0
            if (score >= 3) {
              earnedScore += score
            } else {
              struggling.push(dim)
            }
          })

          progress.accumulatedScore += earnedScore
          progress.strugglingDimensions = struggling

          // Check if passed threshold
          if (progress.accumulatedScore >= progress.targetScore && !progress.isPassed) {
            progress.isPassed = true
            // Add to passedLOs array if not already there
            if (!updatedPassedLOs.includes(loCode)) {
              updatedPassedLOs.push(loCode)
            }
          }
        }
      }

      // GAMIFICATION: Calculate points from this assessment
      let pointsEarned = 0
      if (assessmentData) {
        pointsEarned = calculatePoints(assessmentData)
      }

      // GAMIFICATION: Update streak
      const streakUpdate = calculateStreak(currentData.lastActiveDate, currentDate)
      let streakData = {}
      if (streakUpdate) {
        if (streakUpdate.increment) {
          streakData = {
            currentStreak: admin.firestore.FieldValue.increment(1),
            maxStreak: currentData.currentStreak + 1 > (currentData.maxStreak || 0) 
              ? currentData.currentStreak + 1 
              : currentData.maxStreak || 0,
            lastActiveDate: streakUpdate.lastActiveDate
          }
        } else if (streakUpdate.currentStreak !== undefined) {
          streakData = {
            currentStreak: streakUpdate.currentStreak,
            lastActiveDate: streakUpdate.lastActiveDate
          }
        }
      }

      // Update progress with gamification data + loProgress
      const updateData = {
        passedLOs: updatedPassedLOs,
        totalPassed: updatedPassedLOs.length,
        loProgress: loProgress, // 🆕 Progressive tracking
        lastAssessedAt: admin.firestore.FieldValue.serverTimestamp(),
        assessmentCount: admin.firestore.FieldValue.increment(1),
        totalPoints: admin.firestore.FieldValue.increment(pointsEarned),
        ...streakData
      }

      await progressRef.update(updateData)

      // GAMIFICATION: Check for new badges after update
      const updatedProgressDoc = await progressRef.get()
      const updatedStats = updatedProgressDoc.data()
      
      // Get total LOs in course for badge checking
      const courseDoc = await db.collection('courses').doc(courseId).get()
      const totalLOs = courseDoc.exists ? (courseDoc.data().learningOutcomes?.length || 0) : 0
      
      const newBadges = checkBadges(updatedStats, totalLOs)
      
      if (newBadges.length > 0) {
        const badgeIds = newBadges.map(b => b.id)
        const badgePoints = newBadges.reduce((sum, b) => sum + b.points, 0)
        
        await progressRef.update({
          badges: admin.firestore.FieldValue.arrayUnion(...badgeIds),
          totalPoints: admin.firestore.FieldValue.increment(badgePoints)
        })

        console.log(`🎖️ New badges earned by ${studentId}: ${badgeIds.join(', ')} (+${badgePoints} pts)`)
      }

      console.log(`Updated progress for ${studentId} in ${courseId}: ${updatedPassedLOs.length} LOs passed, +${pointsEarned} pts`)
    } else {
      // สร้างเอกสารใหม่
      let pointsEarned = 0
      if (assessmentData) {
        pointsEarned = calculatePoints(assessmentData)
      }

      // 🆕 Initialize loProgress for first-time assessment
      const loProgress = {}
      if (assessmentData && assessmentData.questionData && assessmentData.questionData.relatedLOs) {
        const relatedLOs = assessmentData.questionData.relatedLOs
        const rubricScores = assessmentData.rubricScores || {}
        const loConfigs = assessmentData.questionData.loConfigs || []

        relatedLOs.forEach(loCode => {
          const loConfig = loConfigs.find(c => c.loCode === loCode || c.code === loCode)
          const relatedDimensions = loConfig?.relatedDimensions || ['analysis', 'reasoning', 'creativity', 'evidence']
          
          let earnedScore = 0
          const struggling = []
          
          relatedDimensions.forEach(dim => {
            const score = rubricScores[dim] || 0
            if (score >= 3) {
              earnedScore += score
            } else {
              struggling.push(dim)
            }
          })

          loProgress[loCode] = {
            accumulatedScore: earnedScore,
            targetScore: relatedDimensions.length * 4,
            attempts: 1,
            isPassed: earnedScore >= relatedDimensions.length * 4,
            lastAttemptDate: currentDate,
            strugglingDimensions: struggling,
            microLessonsViewed: []
          }
        })
      }

      const initialData = {
        studentId,
        courseId,
        passedLOs: passedLOs,
        totalPassed: passedLOs.length,
        loProgress: loProgress, // 🆕 Progressive tracking
        assessmentCount: 1,
        firstAssessedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastAssessedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Gamification fields
        totalPoints: pointsEarned,
        currentStreak: 1,
        maxStreak: 1,
        lastActiveDate: currentDate,
        badges: [],
        achievements: []
      }

      await progressRef.set(initialData)

      // Check for first-time badges
      const courseDoc = await db.collection('courses').doc(courseId).get()
      const totalLOs = courseDoc.exists ? (courseDoc.data().learningOutcomes?.length || 0) : 0
      
      const newBadges = checkBadges(initialData, totalLOs)
      
      if (newBadges.length > 0) {
        const badgeIds = newBadges.map(b => b.id)
        const badgePoints = newBadges.reduce((sum, b) => sum + b.points, 0)
        
        await progressRef.update({
          badges: badgeIds,
          totalPoints: admin.firestore.FieldValue.increment(badgePoints)
        })

        console.log(`🎖️ Initial badges earned by ${studentId}: ${badgeIds.join(', ')} (+${badgePoints} pts)`)
      }

      console.log(`Created new progress for ${studentId} in ${courseId}: ${passedLOs.length} LOs passed, ${pointsEarned} pts`)
    }
  } catch (error) {
    console.error('Error updating student progress:', error)
    // ไม่ throw error เพื่อไม่ให้กระทบการประเมิน HOTS หลัก
  }
}

/**
 * Validate assessment result structure
 */
function validateAssessmentResult(result) {
  if (!result || typeof result !== 'object') return false
  if (!result.rubricScores) return false
  if (typeof result.rubricScores.analysis !== 'number') return false
  if (typeof result.rubricScores.reasoning !== 'number') return false
  if (typeof result.rubricScores.creativity !== 'number') return false
  if (typeof result.rubricScores.evidence !== 'number') return false
  if (typeof result.feedback !== 'string') return false
  return true
}

/**
 * Detect possible copy-paste patterns
 * This is a simple heuristic-based detection
 */
function detectCopyPaste(text) {
  const indicators = {
    isPossibleCopyPaste: false,
    reasons: []
  }

  // Check for unusual formatting (multiple spaces, tabs)
  if (/\s{4,}/.test(text) || /\t/.test(text)) {
    indicators.reasons.push('Unusual spacing detected')
  }

  // Check for very long continuous text without breaks
  const words = text.split(/\s+/)
  const avgWordLength = text.length / words.length
  if (avgWordLength > 15) {
    indicators.reasons.push('Unusually long words detected')
  }

  // Check for mixed scripts or unusual characters
  if (/[^\u0E00-\u0E7Fa-zA-Z0-9\s.,!?()"\-]/.test(text)) {
    indicators.reasons.push('Unusual characters detected')
  }

  // If multiple indicators, flag as possible copy-paste
  if (indicators.reasons.length >= 2) {
    indicators.isPossibleCopyPaste = true
  }

  return indicators
}

/**
 * 🆕 Enhanced Anti-Cheat Validation
 * ตรวจสอบทั้ง text patterns และ typing fingerprint
 * รองรับทั้ง PC และ Mobile
 */
function validateAntiCheat(text, typingFingerprint) {
  const result = {
    isValid: true,
    suspiciousLevel: 0,
    reasons: [],
    warnings: [],
    deviceType: 'unknown'
  }
  
  if (!text || text.length === 0) {
    return result
  }
  
  // === DEVICE DETECTION ===
  const deviceInfo = typingFingerprint?.deviceInfo || {}
  const isMobile = deviceInfo.isMobile || deviceInfo.isTablet || deviceInfo.type === 'mobile' || deviceInfo.type === 'tablet'
  result.deviceType = deviceInfo.type || 'desktop'
  
  // === DEVICE-SPECIFIC THRESHOLDS ===
  const thresholds = isMobile ? {
    minKeystrokeRatio: 0.5,      // Mobile: 50% (มี autocomplete)
    maxTypingSpeed: 300,         // Mobile: 300 CPM (พิมพ์ช้ากว่า)
    minKeystrokeInterval: 50,    // Mobile: 50ms
    lowKeystrokePenalty: 20,     // Mobile: penalty น้อยกว่า
    suddenJumpPenalty: 20,       // Mobile: penalty น้อยกว่า (มี autocomplete)
  } : {
    minKeystrokeRatio: 0.6,      // PC: 60%
    maxTypingSpeed: 450,         // PC: 450 CPM
    minKeystrokeInterval: 30,    // PC: 30ms
    lowKeystrokePenalty: 30,     // PC: penalty ปกติ
    suddenJumpPenalty: 30,       // PC: penalty ปกติ
  }
  
  // === 1. TEXT PATTERN ANALYSIS ===
  const textPatterns = detectCopyPaste(text)
  if (textPatterns.isPossibleCopyPaste) {
    result.suspiciousLevel += 25
    result.reasons.push(...textPatterns.reasons)
  }
  
  // Check for academic citation patterns (likely copy from paper)
  if (/\[\d+\]|\(\d{4}\)|et al\.|ibid\./i.test(text)) {
    result.suspiciousLevel += 20
    result.reasons.push('Academic citation patterns detected')
  }
  
  // Check for Wikipedia markup
  if (/\{\{.*?\}\}|\[\[.*?\]\]/.test(text)) {
    result.suspiciousLevel += 30
    result.reasons.push('Wikipedia markup detected')
  }
  
  // Check for programming code patterns (unusual for HOTS answers)
  if (/function\s+\w+\s*\(|const\s+\w+\s*=|import\s+\{|<\/?[a-z]+>/i.test(text)) {
    result.suspiciousLevel += 15
    result.warnings.push('Code-like patterns detected')
  }
  
  // === 2. TYPING FINGERPRINT ANALYSIS (if provided) ===
  if (typingFingerprint) {
    const fp = typingFingerprint
    
    // 2.1 Keystroke ratio check (ปรับตาม device)
    if (text.length > 50 && fp.totalCharactersTyped !== undefined) {
      const keystrokeRatio = fp.totalCharactersTyped / text.length
      if (keystrokeRatio < thresholds.minKeystrokeRatio) {
        result.suspiciousLevel += thresholds.lowKeystrokePenalty
        result.reasons.push(`Low keystroke ratio: ${(keystrokeRatio * 100).toFixed(1)}% (expected ≥${thresholds.minKeystrokeRatio * 100}% for ${result.deviceType})`)
      } else if (keystrokeRatio < thresholds.minKeystrokeRatio + 0.2) {
        result.suspiciousLevel += Math.floor(thresholds.lowKeystrokePenalty / 2)
        result.warnings.push(`Below-average keystroke ratio: ${(keystrokeRatio * 100).toFixed(1)}%`)
      }
    }
    
    // 2.2 Typing speed analysis (ปรับตาม device)
    if (fp.typingDurationMs && fp.typingDurationMs > 0) {
      const typingSpeedCPM = (text.length / (fp.typingDurationMs / 1000 / 60))
      if (typingSpeedCPM > thresholds.maxTypingSpeed + 100) {
        result.suspiciousLevel += 25
        result.reasons.push(`Extremely fast typing: ${typingSpeedCPM.toFixed(0)} CPM (max for ${result.deviceType}: ${thresholds.maxTypingSpeed} CPM)`)
      } else if (typingSpeedCPM > thresholds.maxTypingSpeed) {
        result.suspiciousLevel += 10
        result.warnings.push(`Fast typing speed: ${typingSpeedCPM.toFixed(0)} CPM`)
      }
    }
    
    // 2.3 Paste event detection
    if (fp.pasteEventCount && fp.pasteEventCount > 0) {
      result.suspiciousLevel += 35
      result.reasons.push(`${fp.pasteEventCount} paste event(s) detected`)
    }
    
    // 2.4 Sudden text jumps (ปรับตาม device - Mobile มี autocomplete)
    if (fp.suspiciousJumps && fp.suspiciousJumps.length > 0) {
      // Mobile: ผ่อนปรนสำหรับ small jumps (autocomplete)
      const bigJumps = fp.suspiciousJumps.filter(j => j.lengthDiff > 25)
      
      if (isMobile && bigJumps.length === 0) {
        // Mobile with only small jumps = likely autocomplete
        result.warnings.push(`${fp.suspiciousJumps.length} small text jump(s) - possible autocomplete`)
        result.suspiciousLevel += 5
      } else {
        result.suspiciousLevel += thresholds.suddenJumpPenalty
        result.reasons.push(`${fp.suspiciousJumps.length} sudden text jump(s) detected`)
      }
    }
    
    // 2.5 Keystroke interval analysis (PC focused)
    if (!isMobile && fp.keystrokeIntervals && fp.keystrokeIntervals.length > 10) {
      const intervals = fp.keystrokeIntervals
      const tooFastCount = intervals.filter(i => i < thresholds.minKeystrokeInterval).length
      const tooFastRatio = tooFastCount / intervals.length
      
      if (tooFastRatio > 0.5) {
        result.suspiciousLevel += 15
        result.warnings.push(`Unusual keystroke pattern: ${(tooFastRatio * 100).toFixed(1)}% too fast`)
      }
    }
    
    // 2.6 Correction rate (ปรับตาม device - Mobile มี autocorrect)
    if (fp.totalCharactersTyped > 50 && fp.correctionCount !== undefined) {
      const correctionRate = fp.correctionCount / fp.totalCharactersTyped
      const minCorrectionThreshold = isMobile ? 0.002 : 0.005
      
      if (correctionRate < minCorrectionThreshold) {
        const penalty = isMobile ? 5 : 10
        result.suspiciousLevel += penalty
        result.warnings.push(`Very low correction rate: ${(correctionRate * 100).toFixed(2)}%`)
      }
    }
    
    // 2.7 🆕 Mobile-specific: Focus lost และ app switch
    if (isMobile) {
      if (fp.focusLostCount && fp.focusLostCount > 5) {
        result.suspiciousLevel += 10
        result.warnings.push(`Focus lost ${fp.focusLostCount} times`)
      }
      if (fp.appSwitchCount && fp.appSwitchCount > 3) {
        result.suspiciousLevel += 15
        result.warnings.push(`App switched ${fp.appSwitchCount} times`)
      }
      
      // Mobile autocomplete ถือเป็นปกติ - don't penalize
      if (fp.autocompleteCount && fp.autocompleteCount > 0) {
        console.log(`Mobile autocomplete detected: ${fp.autocompleteCount} times (normal behavior)`)
      }
    }
  }
  
  // === 3. FINAL DETERMINATION ===
  result.suspiciousLevel = Math.min(100, result.suspiciousLevel)
  
  // Block if suspicious level >= 50
  if (result.suspiciousLevel >= 50) {
    result.isValid = false
  }
  
  return result
}

/**
 * Cloud Function to generate Learning Outcomes using AI
 */
exports.generateLearningOutcomes = functions.runWith({ secrets: [openaiApiKey] }).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { courseCode, courseName, courseDescription, learningStandards } = req.body

      if (!courseDescription || !learningStandards) {
        return res.status(400).send({ 
          error: 'Missing required fields: courseDescription, learningStandards' 
        })
      }

      if (!openai) {
        return res.status(500).send({
          error: 'OpenAI API not configured'
        })
      }

      // Create prompt for LO generation
      const prompt = `
คุณเป็นผู้เชี่ยวชาญด้านหลักสูตรการศึกษา กำลังออกแบบ Learning Outcomes (LO) สำหรับรายวิชา

รหัสวิชา: ${courseCode || 'N/A'}
ชื่อวิชา: ${courseName || 'N/A'}

คำอธิบายรายวิชา:
${courseDescription}

มาตรฐานการเรียนรู้:
${learningStandards}

กรุณาสร้าง Learning Outcomes (LO) จำนวน 5-8 ข้อ ที่:
1. สอดคล้องกับคำอธิบายรายวิชาและมาตรฐานการเรียนรู้
2. วัดผลได้ (Measurable) และชัดเจน
3. ครอบคลุมทักษะการคิดขั้นสูง (HOTS)
4. ใช้คำกริยาที่วัดได้ เช่น วิเคราะห์ สังเคราะห์ ประเมิน สร้างสรรค์

ส่งคืนเป็น JSON เท่านั้น ในรูปแบบ:
{
  "learningOutcomes": [
    {
      "code": "LO1",
      "description": "คำอธิบาย LO ข้อที่ 1",
      "category": "ความรู้/ทักษะ/คุณลักษณะ",
      "bloomLevel": "ระดับของ Bloom's Taxonomy"
    }
  ]
}
`

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert curriculum designer. Always respond with valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })

      const responseText = completion.choices[0].message.content
      let result

      try {
        // Clean response - remove markdown code blocks if present
        let cleanedText = responseText.trim()
        
        // Remove ```json or ``` wrapper
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        
        result = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', responseText)
        throw new Error('Invalid response format from AI')
      }

      return res.status(200).json({
        success: true,
        learningOutcomes: result.learningOutcomes
      })

    } catch (error) {
      console.error('Generate LO error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

/**
 * Cloud Function to generate HOTS questions using AI
 * Based on Learning Outcomes and course context
 */
exports.generateHOTSQuestion = functions.runWith({ secrets: [openaiApiKey] }).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { courseId, courseName, learningOutcomes, questionCount = 1 } = req.body

      if (!courseId || !learningOutcomes || learningOutcomes.length === 0) {
        return res.status(400).send({
          error: 'Missing required fields: courseId, learningOutcomes'
        })
      }

      if (!openai) {
        return res.status(500).send({
          error: 'OpenAI API not configured'
        })
      }

      // สร้าง prompt สำหรับ AI
      const loList = learningOutcomes.map((lo, idx) => {
        const code = lo.code || lo.loCode || `LO${idx + 1}`
        const description = lo.description || lo.loDescription || ''
        return `${code}: ${description}`
      }).join('\n')

      const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบคำถามเพื่อประเมินทักษะการคิดขั้นสูง (Higher-Order Thinking Skills)

**รายวิชา:** ${courseName || 'ไม่ระบุ'}

**Learning Outcomes ของรายวิชา:**
${loList}

**คำสั่ง:**
สร้างคำถาม HOTS จำนวน ${questionCount} ข้อ ที่:
1. เหมาะสมกับ Learning Outcomes ที่กำหนด (ครอบคลุมอย่างน้อย 1-2 LO ต่อคำถาม)
2. กระตุ้นให้นักเรียนคิดวิเคราะห์ ให้เหตุผล สร้างสรรค์ และใช้หลักฐานสนับสนุน
3. เป็นคำถามเปิด (Open-ended) ที่ไม่มีคำตอบเดียว
4. เหมาะกับระดับนักเรียนมัธยมศึกษา
5. ใช้ภาษาไทยที่เข้าใจง่าย น่าสนใจ และท้าทาย
6. มีความเป็น Constructed Response
ตอบกลับในรูปแบบ JSON:
{
  "questions": [
    {
      "question": "คำถามที่ 1",
      "hint": "คำใบ้หรือแนวทางในการตอบ",
      "category": "หมวดหมู่ของคำถาม (เช่น วิเคราะห์, สังเคราะห์, ประเมินค่า)",
      "relatedLOs": ["LO1", "LO2"],
      "expectedSkills": ["analysis", "reasoning"]
    }
  ]
}

**สำคัญ:** คำถามต้องกระตุ้นให้คิด ไม่ใช่ท่องจำ และเชื่อมโยงกับ LO ที่กำหนด`

      const model = process.env.OPENAI_MODEL || functions.config().openai?.model || 'gpt-4o'

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert in educational assessment and HOTS question design. You create engaging, thought-provoking questions in Thai language. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1500
      })

      const responseText = completion.choices[0].message.content
      let result

      try {
        // Clean response - remove markdown code blocks if present
        let cleanedText = responseText.trim()
        
        // Remove ```json or ``` wrapper
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        
        result = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', responseText)
        throw new Error('Invalid response format from AI')
      }

      return res.status(200).json({
        success: true,
        questions: result.questions || []
      })

    } catch (error) {
      console.error('Generate HOTS Question error:', error)
      
      // Check if it's an OpenAI quota error
      if (error.status === 429 || error.code === 'insufficient_quota') {
        return res.status(429).send({
          error: 'OpenAI API quota exceeded',
          message: 'เครดิต OpenAI API หมดแล้ว กรุณาเติมเครดิตที่ https://platform.openai.com/account/billing หรือใช้ "สร้างคำถามเอง" แทน',
          type: 'quota_exceeded'
        })
      }
      
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

/**
 * Cloud Function to generate solution (เฉลย) for a question using AI
 * This creates a model answer that would score maximum points
 */
exports.generateSolution = functions.runWith({ secrets: [openaiApiKey] }).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { questionId, question, hint, category, relatedLOs, courseContext } = req.body

      if (!question) {
        return res.status(400).send({
          error: 'Missing required field: question'
        })
      }

      if (!openai) {
        return res.status(500).send({
          error: 'OpenAI API not configured'
        })
      }

      // สร้าง context สำหรับ AI
      let contextInfo = `คำถาม: ${question}\n`
      if (hint) contextInfo += `คำใบ้: ${hint}\n`
      if (category) contextInfo += `หมวดหมู่: ${category}\n`
      if (relatedLOs && relatedLOs.length > 0) {
        contextInfo += `Learning Outcomes ที่เกี่ยวข้อง: ${relatedLOs.join(', ')}\n`
      }
      if (courseContext) contextInfo += `บริบทรายวิชา: ${courseContext}\n`

      const prompt = `คุณเป็นนักเรียนที่มีความสามารถสูง กำลังทำข้อสอบ HOTS (Higher-Order Thinking Skills) และต้องการตอบให้ได้คะแนนเต็ม

${contextInfo}

**เกณฑ์การให้คะแนน (รวม 20 คะแนน):**
1. การวิเคราะห์ (Analysis) - 5 คะแนน: แยกประเด็น/องค์ประกอบสำคัญ เชื่อมความสัมพันธ์อย่างเป็นระบบ
2. การให้เหตุผล (Reasoning) - 5 คะแนน: เหตุผลเป็นลำดับ มีตรรกะ อนุมานถูกต้อง สรุปสอดคล้อง
3. ความคิดสร้างสรรค์ (Creativity) - 5 คะแนน: เสนอกรอบคิด/วิธีมองใหม่ มีตัวอย่างสร้างสรรค์
4. การใช้หลักฐาน (Evidence) - 5 คะแนน: ยกหลักฐาน/ตัวอย่างเฉพาะเจาะจง อธิบายความเชื่อมโยงชัด

**คำสั่ง:**
เขียนคำตอบที่:
1. ได้คะแนนเต็มทุกด้าน (20/20 คะแนน)
2. แสดงทักษะการคิดขั้นสูงครบทั้ง 4 ด้าน
3. มีโครงสร้างชัดเจน เหตุผลสมบูรณ์
4. ยกตัวอย่างและหลักฐานที่เฉพาะเจาะจง
5. มีความคิดสร้างสรรค์และมุมมองที่น่าสนใจ
6. เขียนเป็นร้อยแก้ว เหมาะสมกับระดับนักเรียนมัธยมศึกษา
7. ความยาวประมาณ 200-400 คำ

**หลังจากเขียนคำตอบแล้ว ให้วิเคราะห์คำตอบของตัวเอง** โดยประเมินว่าได้คะแนนเท่าไรในแต่ละด้าน และอธิบายว่าทำไม

ตอบกลับในรูปแบบ JSON:
{
  "answer": "คำตอบที่ได้คะแนนเต็ม 20 คะแนน",
  "analysis": {
    "analysisScore": 5,
    "analysisExplanation": "อธิบายว่าตอบส่วนไหนที่แสดงการวิเคราะห์",
    "reasoningScore": 5,
    "reasoningExplanation": "อธิบายว่าตอบส่วนไหนที่แสดงการให้เหตุผล",
    "creativityScore": 5,
    "creativityExplanation": "อธิบายว่าตอบส่วนไหนที่แสดงความคิดสร้างสรรค์",
    "evidenceScore": 5,
    "evidenceExplanation": "อธิบายว่าตอบส่วนไหนที่แสดงการใช้หลักฐาน"
  },
  "keyPoints": [
    "ประเด็นสำคัญข้อ 1 ที่ควรมีในคำตอบ",
    "ประเด็นสำคัญข้อ 2",
    "ประเด็นสำคัญข้อ 3"
  ],
  "teacherNotes": "คำแนะนำสำหรับครูในการใช้เฉลยนี้ เช่น จุดที่ควรเน้นกับนักเรียน หรือวิธีประยุกต์ใช้"
}

**สำคัญ:** คำตอบต้องเป็นแบบอย่างที่ดีสำหรับนักเรียน แสดงให้เห็นว่าคำตอบที่ได้คะแนนเต็มควรมีองค์ประกอบอะไรบ้าง`

      const model = process.env.OPENAI_MODEL || functions.config().openai?.model || 'gpt-4o'

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert student who excels at HOTS questions. You provide exemplary answers that demonstrate all aspects of higher-order thinking. Always respond with valid JSON in Thai language.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500
      })

      const responseText = completion.choices[0].message.content
      let result

      try {
        // Clean response - remove markdown code blocks if present
        let cleanedText = responseText.trim()
        
        // Remove ```json or ``` wrapper
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        
        result = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', responseText)
        throw new Error('Invalid response format from AI')
      }

      // บันทึกเฉลยลง Firestore
      if (questionId) {
        try {
          await db.collection('questions').doc(questionId).update({
            hasSolution: true,
            solution: {
              answer: result.answer,
              analysis: result.analysis,
              keyPoints: result.keyPoints || [],
              teacherNotes: result.teacherNotes || '',
              generatedAt: admin.firestore.FieldValue.serverTimestamp(),
              aiModel: model
            }
          })
          console.log(`Solution saved for question ${questionId}`)
        } catch (error) {
          console.error('Error saving solution to Firestore:', error)
          // ไม่ throw error เพราะเฉลยที่สร้างแล้วยังใช้งานได้
        }
      }

      return res.status(200).json({
        success: true,
        solution: result
      })

    } catch (error) {
      console.error('Generate Solution error:', error)
      
      // Check if it's an OpenAI quota error
      if (error.status === 429 || error.code === 'insufficient_quota') {
        return res.status(429).send({
          error: 'OpenAI API quota exceeded',
          message: 'เครดิต OpenAI API หมดแล้ว',
          type: 'quota_exceeded'
        })
      }
      
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

/**
 * Cloud Function to generate class analytics
 * Analyzes all assessments for a specific course to create insights
 */
exports.generateClassAnalytics = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { courseId, teacherId } = req.body

      if (!courseId || !teacherId) {
        return res.status(400).send({ 
          error: 'Missing required fields: courseId, teacherId' 
        })
      }

      // Verify teacher owns this course
      const courseDoc = await db.collection('courses').doc(courseId).get()
      if (!courseDoc.exists || courseDoc.data().teacherId !== teacherId) {
        return res.status(403).send({ error: 'Unauthorized' })
      }

      const courseData = courseDoc.data()

      // Get all students in this course (via sessions)
      const sessionsSnapshot = await db.collection('sessions')
        .where('courseId', '==', courseId)
        .get()

      const studentIds = [...new Set(sessionsSnapshot.docs.map(doc => doc.data().studentId))]

      // Get all assessments for this course
      const assessmentsSnapshot = await db.collection('assessments')
        .where('courseId', '==', courseId)
        .get()

      if (assessmentsSnapshot.empty) {
        return res.status(200).send({
          courseId,
          courseName: courseData.courseName || courseData.name || 'Unknown Course',
          totalStudents: studentIds.length,
          totalAssessments: 0,
          message: 'No assessments found for this course'
        })
      }

      // Initialize analytics data
      const analytics = {
        totalAssessments: assessmentsSnapshot.size,
        totalStudents: studentIds.length,
        rubricAverages: {
          analysis: 0,
          reasoning: 0,
          creativity: 0,
          evidence: 0
        },
        studentPerformance: {},
        loMastery: {},
        strugglingStudents: [],
        topPerformers: []
      }

      // Process each assessment
      let totalScores = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
      
      assessmentsSnapshot.forEach(doc => {
        const assessment = doc.data()
        const { studentId, rubricScores, loAssessment } = assessment

        // Accumulate rubric scores
        if (rubricScores) {
          totalScores.analysis += rubricScores.analysis || 0
          totalScores.reasoning += rubricScores.reasoning || 0
          totalScores.creativity += rubricScores.creativity || 0
          totalScores.evidence += rubricScores.evidence || 0
        }

        // Track student performance
        if (!analytics.studentPerformance[studentId]) {
          analytics.studentPerformance[studentId] = {
            assessmentCount: 0,
            totalScore: 0,
            averageScore: 0,
            rubricTotals: { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 },
            passedLOs: new Set()
          }
        }

        const studentPerf = analytics.studentPerformance[studentId]
        studentPerf.assessmentCount++
        
        if (rubricScores) {
          const assessmentScore = (rubricScores.analysis + rubricScores.reasoning + 
                                   rubricScores.creativity + rubricScores.evidence) / 4
          studentPerf.totalScore += assessmentScore
          studentPerf.rubricTotals.analysis += rubricScores.analysis
          studentPerf.rubricTotals.reasoning += rubricScores.reasoning
          studentPerf.rubricTotals.creativity += rubricScores.creativity
          studentPerf.rubricTotals.evidence += rubricScores.evidence
        }

        // Track LO mastery
        if (loAssessment && loAssessment.passedLOs) {
          loAssessment.passedLOs.forEach(lo => {
            studentPerf.passedLOs.add(lo)
            analytics.loMastery[lo] = (analytics.loMastery[lo] || 0) + 1
          })
        }
      })

      // Calculate averages
      analytics.rubricAverages.analysis = totalScores.analysis / assessmentsSnapshot.size
      analytics.rubricAverages.reasoning = totalScores.reasoning / assessmentsSnapshot.size
      analytics.rubricAverages.creativity = totalScores.creativity / assessmentsSnapshot.size
      analytics.rubricAverages.evidence = totalScores.evidence / assessmentsSnapshot.size

      // Calculate student averages and identify struggling/top performers
      const studentScores = []
      
      for (const [studentId, perf] of Object.entries(analytics.studentPerformance)) {
        perf.averageScore = perf.totalScore / perf.assessmentCount
        perf.passedLOs = Array.from(perf.passedLOs)
        
        studentScores.push({
          studentId,
          averageScore: perf.averageScore,
          assessmentCount: perf.assessmentCount,
          passedLOsCount: perf.passedLOs.length
        })
      }

      // Sort by average score
      studentScores.sort((a, b) => a.averageScore - b.averageScore)

      // Identify struggling students (bottom 20% or score < 2.5)
      const strugglingThreshold = Math.max(2.5, studentScores[Math.floor(studentScores.length * 0.2)]?.averageScore || 0)
      analytics.strugglingStudents = studentScores
        .filter(s => s.averageScore < strugglingThreshold)
        .map(s => s.studentId)

      // Identify top performers (top 20% or score >= 4.0)
      const topThreshold = Math.min(4.0, studentScores[Math.floor(studentScores.length * 0.8)]?.averageScore || 5)
      analytics.topPerformers = studentScores
        .filter(s => s.averageScore >= topThreshold)
        .map(s => s.studentId)

      // Save analytics to Firestore
      const reportId = `${courseId}_${Date.now()}`
      await db.collection('classReports').doc(reportId).set({
        courseId,
        courseName: courseData.courseName || courseData.name || 'Unknown Course',
        teacherId,
        analytics,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      })

      return res.status(200).send({
        success: true,
        reportId,
        analytics
      })

    } catch (error) {
      console.error('Generate Class Analytics error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

/**
 * Scheduled function to generate daily reports (optional)
 */
exports.generateDailyReport = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    console.log('Running daily report generation...')
    
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Query assessments from yesterday
    const assessmentsSnapshot = await db.collection('assessments')
      .where('createdAt', '>=', yesterday)
      .where('createdAt', '<', today)
      .get()
    
    console.log(`Found ${assessmentsSnapshot.size} assessments from yesterday`)
    
    // Store report summary
    await db.collection('reports').add({
      date: yesterday,
      totalAssessments: assessmentsSnapshot.size,
      generatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    
    return null
  })

/**
 * Cloud Function to get leaderboard
 * Returns top students by score in a course or globally
 */
exports.getLeaderboard = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { courseId, scope = 'course', limit = 10 } = req.body

      let query = db.collection('studentProgress')

      // Filter by course if specified
      if (scope === 'course' && courseId) {
        query = query.where('courseId', '==', courseId)
      }

      const progressSnapshot = await query.get()

      if (progressSnapshot.empty) {
        return res.status(200).send({
          success: true,
          leaderboard: []
        })
      }

      // Calculate leaderboard scores
      const { calculateLeaderboardScore } = require('./gamification')
      const leaderboardData = []

      for (const doc of progressSnapshot.docs) {
        const data = doc.data()
        const studentId = data.studentId

        // Get student details
        const userDoc = await db.collection('users').doc(studentId).get()
        if (!userDoc.exists) continue

        const userData = userDoc.data()

        leaderboardData.push({
          studentId: data.studentId,
          name: userData.displayName || userData.name || 'Unknown',
          studentNumber: userData.studentId || 'N/A',
          grade: userData.grade || '',
          room: userData.room || '',
          totalPoints: data.totalPoints || 0,
          badges: data.badges || [],
          badgeCount: (data.badges || []).length,
          currentStreak: data.currentStreak || 0,
          passedLOsCount: data.totalPassed || 0,
          assessmentCount: data.assessmentCount || 0,
          leaderboardScore: calculateLeaderboardScore(data)
        })
      }

      // Sort by leaderboard score
      leaderboardData.sort((a, b) => b.leaderboardScore - a.leaderboardScore)

      // Add rank
      leaderboardData.forEach((entry, index) => {
        entry.rank = index + 1
      })

      // Limit results
      const limitedData = leaderboardData.slice(0, limit)

      return res.status(200).send({
        success: true,
        leaderboard: limitedData,
        total: leaderboardData.length
      })

    } catch (error) {
      console.error('Get Leaderboard error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

/**
 * Cloud Function to get badge definitions
 */
exports.getBadgeDefinitions = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { BADGES } = require('./gamification')
      
      return res.status(200).send({
        success: true,
        badges: Object.values(BADGES)
      })
    } catch (error) {
      console.error('Get Badge Definitions error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

// Daily Login Reward
exports.claimDailyReward = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { studentId, courseId } = req.body
      
      if (!studentId || !courseId) {
        return res.status(400).send({ 
          error: 'Missing required fields',
          message: 'studentId and courseId are required'
        })
      }
      
      const { calculateDailyReward } = require('./gamification')
      const progressId = `${studentId}_${courseId}`
      const progressRef = db.collection('studentProgress').doc(progressId)
      
      // Get current progress
      const progressDoc = await progressRef.get()
      
      if (!progressDoc.exists) {
        return res.status(404).send({
          error: 'Student progress not found'
        })
      }
      
      const progressData = progressDoc.data()
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      
      // Check if already claimed today
      if (progressData.lastDailyReward === today) {
        return res.status(200).send({
          success: false,
          alreadyClaimed: true,
          message: 'Daily reward already claimed today'
        })
      }
      
      // Calculate consecutive login days
      let consecutiveDays = progressData.consecutiveLoginDays || 0
      const lastRewardDate = progressData.lastDailyReward
      
      if (lastRewardDate) {
        const lastDate = new Date(lastRewardDate)
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        
        if (lastRewardDate === yesterdayStr) {
          // Consecutive day
          consecutiveDays += 1
        } else {
          // Streak broken
          consecutiveDays = 1
        }
      } else {
        // First time
        consecutiveDays = 1
      }
      
      // Calculate reward
      const reward = calculateDailyReward(consecutiveDays)
      
      // Update progress
      await progressRef.update({
        totalPoints: admin.firestore.FieldValue.increment(reward.points),
        lastDailyReward: today,
        consecutiveLoginDays: consecutiveDays,
        totalDailyRewards: admin.firestore.FieldValue.increment(1)
      })
      
      return res.status(200).send({
        success: true,
        reward: {
          points: reward.points,
          bonus: reward.bonus,
          message: reward.message,
          consecutiveDays: consecutiveDays
        }
      })
      
    } catch (error) {
      console.error('Claim Daily Reward error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

// ========================================
// ADAPTIVE LEARNING SYSTEM
// ========================================

/**
 * Generate Adaptive Learning Path for student
 * Analyzes weak LOs and creates personalized learning sequence
 */
exports.generateAdaptivePath = functions.runWith({ secrets: [openaiApiKey] }).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { studentId, courseId } = req.body

      if (!studentId || !courseId) {
        return res.status(400).send({ 
          error: 'Missing required fields: studentId, courseId' 
        })
      }

      // Get student progress - USE REAL ASSESSMENT DATA
      const progressRef = db.collection('studentProgress').doc(`${studentId}_${courseId}`)
      const progressDoc = await progressRef.get()
      
      if (!progressDoc.exists) {
        return res.status(404).send({ error: 'Student progress not found' })
      }
      
      // 🔧 GET ACTUAL PASSED LOs FROM ASSESSMENTS (not cached data)
      const assessmentsSnapshot = await db.collection('assessments')
        .where('studentId', '==', studentId)
        .where('courseId', '==', courseId)
        .get()
      
      // Count real passed LOs
      const realPassedLOsSet = new Set()
      assessmentsSnapshot.docs.forEach(doc => {
        const assessment = doc.data()
        if (assessment.loAssessment?.passedLOs) {
          assessment.loAssessment.passedLOs.forEach(lo => realPassedLOsSet.add(lo))
        }
      })
      
      const passedLOs = Array.from(realPassedLOsSet)
      
      // Get course and all LOs
      const courseDoc = await db.collection('courses').doc(courseId).get()
      if (!courseDoc.exists) {
        return res.status(404).send({ error: 'Course not found' })
      }
      
      const courseData = courseDoc.data()
      const allLOs = courseData.learningOutcomes || []
      
      // 🔍 Debug logging - NOW USING REAL DATA
      console.log('📊 Adaptive Path Debug (REAL DATA):', {
        studentId,
        courseId,
        allLOs: allLOs.map(lo => lo.code || lo),
        realPassedLOs: passedLOs, // Now from real assessments
        realPassedLOsCount: passedLOs.length,
        allLOsStructure: allLOs.length > 0 ? allLOs[0] : 'empty'
      })
      
      // Identify weak LOs (not passed yet) - NOW USING REAL DATA
      // Handle both string array and object array formats
      const weakLOs = allLOs.filter(lo => {
        const loCode = typeof lo === 'string' ? lo : lo.code
        const isPassed = passedLOs.includes(loCode) // Now using real assessment data
        console.log(`  LO ${loCode}: passed=${isPassed} (from real assessments)`)
        return !isPassed
      })
      
      console.log('🎯 Weak LOs found:', weakLOs.map(lo => typeof lo === 'string' ? lo : lo.code))
      
      if (weakLOs.length === 0) {
        return res.status(200).send({
          success: true,
          message: 'All Learning Outcomes mastered!',
          pathSteps: []
        })
      }
      
      // 🔧 Normalize weak LOs to object format {code, description}
      const normalizedWeakLOs = weakLOs.map(lo => {
        if (typeof lo === 'string') {
          // Find description from allLOs
          const fullLO = allLOs.find(l => (typeof l === 'string' ? l : l.code) === lo)
          return {
            code: lo,
            description: typeof fullLO === 'object' ? fullLO.description : `Learning Outcome ${lo}`
          }
        }
        return lo
      })
      
      // Get student's historical performance on each weak LO  
      const historicalAssessments = await db.collection('assessments')
        .where('studentId', '==', studentId)
        .where('courseId', '==', courseId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get()
      
      const loPerformance = {}
      normalizedWeakLOs.forEach(lo => {
        loPerformance[lo.code] = {
          attempts: 0,
          avgScore: 0,
          scores: []
        }
      })
      
      historicalAssessments.forEach(doc => {
        const assessment = doc.data()
        const loAssessment = assessment.loAssessment || {}
        const passedInThisAssessment = loAssessment.passedLOs || []
        const totalScore = assessment.totalScore || 0
        
        normalizedWeakLOs.forEach(lo => {
          if (assessment.relatedLOs && assessment.relatedLOs.includes(lo.code)) {
            loPerformance[lo.code].attempts++
            loPerformance[lo.code].scores.push(totalScore)
          }
        })
      })
      
      // Calculate average scores
      Object.keys(loPerformance).forEach(loCode => {
        const perf = loPerformance[loCode]
        if (perf.scores.length > 0) {
          perf.avgScore = perf.scores.reduce((a, b) => a + b, 0) / perf.scores.length
        }
      })
      
      // Sort weak LOs by priority (lowest avg score first, then by attempts)
      const prioritizedLOs = normalizedWeakLOs.sort((a, b) => {
        const perfA = loPerformance[a.code]
        const perfB = loPerformance[b.code]
        
        if (perfA.avgScore !== perfB.avgScore) {
          return perfA.avgScore - perfB.avgScore
        }
        return perfB.attempts - perfA.attempts // More attempts = higher priority
      })
      
      // Take top 3 weakest LOs
      const targetLOs = prioritizedLOs.slice(0, 3)
      
      console.log('🎯 Target LOs for adaptive path:', targetLOs.map(lo => lo.code))
      
      // Generate learning path for each target LO
      const pathSteps = []
      
      for (const lo of targetLOs) {
        const perf = loPerformance[lo.code]
        
        // Step 1: Micro-lesson (if available)
        const microLessonsSnapshot = await db.collection('microLessons')
          .where('courseId', '==', courseId)
          .where('relatedLOs', 'array-contains', lo.code)
          .limit(1)
          .get()
        
        if (!microLessonsSnapshot.empty) {
          const lesson = microLessonsSnapshot.docs[0].data()
          pathSteps.push({
            type: 'micro-lesson',
            loCode: lo.code,
            loDescription: lo.description,
            lessonId: microLessonsSnapshot.docs[0].id,
            title: lesson.title,
            content: lesson.content,
            estimatedMinutes: lesson.estimatedMinutes || 5,
            completed: false
          })
        }
        
        // Step 2: Easy question (difficulty 1-2)
        pathSteps.push({
          type: 'question-easy',
          loCode: lo.code,
          loDescription: lo.description,
          difficulty: perf.attempts === 0 ? 1 : 2,
          questionType: 'Analysis',
          completed: false
        })
        
        // Step 3: Micro-lesson (if available)
        pathSteps.push({
          type: 'micro-lesson',
          loCode: lo.code,
          loDescription: lo.description,
          completed: false
        })
        
        // Step 4: Challenge question (difficulty 3-4)
        pathSteps.push({
          type: 'question-hard',
          loCode: lo.code,
          loDescription: lo.description,
          difficulty: 3,
          questionType: 'Analysis',
          completed: false
        })
      }
      
      // Save path to Firestore
      const pathId = `path_${studentId}_${Date.now()}`
      await db.collection('learningPaths').doc(pathId).set({
        studentId,
        courseId,
        targetLOs: targetLOs.map(lo => lo.code),
        steps: pathSteps,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      return res.status(200).send({
        success: true,
        pathId,
        targetLOs: targetLOs.map(lo => ({
          code: lo.code,
          description: lo.description,
          performance: loPerformance[lo.code]
        })),
        pathSteps,
        message: `Created adaptive learning path with ${pathSteps.length} steps targeting ${targetLOs.length} Learning Outcomes`
      })
    } catch (error) {
      console.error('Error generating adaptive path:', error)
      return res.status(500).send({
        success: false,
        error: error.message
      })
    }
  })
})

exports.analyzeTalentTracks = functions.pubsub.schedule('every monday 00:00').timeZone('Asia/Bangkok').onRun(async (context) => {
  const db = admin.firestore()
  console.log('Starting weekly talent track analysis...')
  
  try {
    const studentsSnapshot = await db.collection('users').where('role', '==', 'student').get()
    let updateCount = 0
    
    for (const doc of studentsSnapshot.docs) {
      const studentId = doc.id
      const studentData = doc.data()
      
      // Get all assessments for this student
      const assessmentsSnapshot = await db.collection('assessments')
        .where('studentId', '==', studentId)
        .get()
        
      if (assessmentsSnapshot.empty) continue
      
      let totalScores = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
      let count = 0
      
      assessmentsSnapshot.forEach(assDoc => {
        const data = assDoc.data()
        if (data.rubricScores) {
          totalScores.analysis += data.rubricScores.analysis || 0
          totalScores.reasoning += data.rubricScores.reasoning || 0
          totalScores.creativity += data.rubricScores.creativity || 0
          totalScores.evidence += data.rubricScores.evidence || 0
          count++
        }
      })
      
      if (count < 5) continue // Need at least 5 assessments to qualify
      
      const avgScores = {
        analysis: totalScores.analysis / count,
        reasoning: totalScores.reasoning / count,
        creativity: totalScores.creativity / count,
        evidence: totalScores.evidence / count
      }
      
      const newTags = []
      
      // Research Track Criteria: High Evidence & Reasoning
      if (avgScores.evidence >= 4.0 && avgScores.reasoning >= 4.0) {
        newTags.push('research_track')
      }
      
      // Innovation Track Criteria: High Creativity & Analysis
      if (avgScores.creativity >= 4.0 && avgScores.analysis >= 4.0) {
        newTags.push('innovation_track')
      }
      
      // Update if tags found
      if (newTags.length > 0) {
        // Merge with existing tags, avoiding duplicates
        const currentTags = studentData.talentTags || []
        const updatedTags = [...new Set([...currentTags, ...newTags])]
        
        if (updatedTags.length !== currentTags.length) {
          await db.collection('users').doc(studentId).update({
            talentTags: updatedTags,
            talentAnalysisLastRun: admin.firestore.FieldValue.serverTimestamp(),
            talentScores: avgScores
          })
          
          // Create notification
          await db.collection('notifications').add({
            userId: studentId,
            type: 'talent_badge',
            title: '🎉 You have been identified for a Talent Track!',
            message: `Based on your consistent performance, you have been tagged for: ${newTags.map(t => t.replace('_', ' ').toUpperCase()).join(', ')}`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          })
          
          updateCount++
        }
      }
    }
    
    console.log(`Talent track analysis complete. Updated ${updateCount} students.`)
    return null
  } catch (error) {
    console.error('Error in analyzeTalentTracks:', error)
    return null
  }
})

// ==================== DATA INTEGRITY FUNCTIONS ====================

/**
 * CASCADE DELETE: Delete all related data when user account is deleted
 * Triggered when user document is deleted
 */
exports.onUserDelete = functions.firestore
  .document('users/{userId}')
  .onDelete(async (snap, context) => {
    const userId = context.params.userId
    const batch = db.batch()
    let deleteCount = 0

    console.log(`🗑️ Cascade delete triggered for user: ${userId}`)

    try {
      // 1. Delete assessments
      const assessmentsSnap = await db.collection('assessments')
        .where('studentId', '==', userId)
        .limit(500) // Firestore batch limit
        .get()
      
      assessmentsSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 2. Delete sessions
      const sessionsSnap = await db.collection('sessions')
        .where('studentId', '==', userId)
        .get()
      
      sessionsSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 3. Delete messages (nested in sessions, but query by from)
      const messagesSnap = await db.collection('messages')
        .where('studentId', '==', userId)
        .get()
      
      messagesSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 4. Delete studentProgress
      const progressSnap = await db.collection('studentProgress')
        .where('studentId', '==', userId)
        .get()
      
      progressSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 5. Delete reflections
      const reflectionsSnap = await db.collection('reflections')
        .where('studentId', '==', userId)
        .get()
      
      reflectionsSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 6. Delete notifications
      const notificationsSnap = await db.collection('notifications')
        .where('userId', '==', userId)
        .get()
      
      notificationsSnap.docs.forEach(doc => {
        batch.delete(doc.ref)
        deleteCount++
      })

      // 7. Audit log
      batch.set(db.collection('auditLogs').doc(), {
        userId,
        action: 'cascade_delete',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          deletedDocuments: deleteCount,
          reason: 'User account deleted'
        }
      })

      // Commit batch
      await batch.commit()
      console.log(`✅ Cascade delete completed: ${deleteCount} documents deleted for user ${userId}`)

      return { success: true, deletedDocuments: deleteCount }
    } catch (error) {
      console.error('❌ Cascade delete error:', error)
      throw error
    }
  })

/**
 * CONSISTENCY CHECK: Scheduled function to verify data integrity
 * Runs daily at 2 AM
 */
exports.dailyConsistencyCheck = functions.pubsub
  .schedule('every day 02:00')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    console.log('🔍 Starting daily consistency check...')
    
    const issues = {
      orphanedAssessments: [],
      mismatchedLOProgress: [],
      invalidScores: [],
      totalChecked: 0
    }

    try {
      // Check 1: Find orphaned assessments (student doesn't exist)
      const assessmentsSnap = await db.collection('assessments')
        .where('createdAt', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
        .limit(1000)
        .get()

      for (const assessmentDoc of assessmentsSnap.docs) {
        issues.totalChecked++
        const assessment = assessmentDoc.data()
        
        // Check if student exists
        const studentDoc = await db.collection('users').doc(assessment.studentId).get()
        if (!studentDoc.exists) {
          issues.orphanedAssessments.push({
            id: assessmentDoc.id,
            studentId: assessment.studentId,
            createdAt: assessment.createdAt
          })
        }

        // Check score validity
        if (assessment.overallScore < 0 || assessment.overallScore > 20) {
          issues.invalidScores.push({
            id: assessmentDoc.id,
            score: assessment.overallScore
          })
        }
      }

      // Check 2: Verify LO progress consistency
      const progressSnap = await db.collection('studentProgress')
        .limit(100) // Sample check
        .get()

      for (const progressDoc of progressSnap.docs) {
        const [studentId, courseId] = progressDoc.id.split('_')
        const progressData = progressDoc.data()
        
        // Get all assessments for this student-course
        const studentAssessmentsSnap = await db.collection('assessments')
          .where('studentId', '==', studentId)
          .where('courseId', '==', courseId)
          .get()

        // Collect all passed LOs from assessments
        const passedLOsFromAssessments = new Set()
        studentAssessmentsSnap.docs.forEach(doc => {
          const los = doc.data().loAssessment?.passedLOs || []
          los.forEach(lo => passedLOsFromAssessments.add(lo))
        })

        // Compare with stored progress
        const passedLOsFromProgress = new Set(progressData.passedLOs || [])
        
        const missing = [...passedLOsFromAssessments].filter(lo => !passedLOsFromProgress.has(lo))
        const extra = [...passedLOsFromProgress].filter(lo => !passedLOsFromAssessments.has(lo))

        if (missing.length > 0 || extra.length > 0) {
          issues.mismatchedLOProgress.push({
            documentId: progressDoc.id,
            studentId,
            courseId,
            missing,
            extra
          })
        }
      }

      // Log results
      console.log('📊 Consistency Check Results:', JSON.stringify(issues, null, 2))

      // Store report
      await db.collection('systemReports').add({
        type: 'consistency_check',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        issues,
        summary: {
          totalChecked: issues.totalChecked,
          orphanedCount: issues.orphanedAssessments.length,
          mismatchedCount: issues.mismatchedLOProgress.length,
          invalidScoresCount: issues.invalidScores.length
        }
      })

      // Send alert if critical issues found
      if (issues.orphanedAssessments.length > 10 || issues.invalidScores.length > 0) {
        console.warn('⚠️ CRITICAL: Major consistency issues detected!')
        // TODO: Send email to admin
      }

      return { success: true, issues }
    } catch (error) {
      console.error('❌ Consistency check error:', error)
      return { success: false, error: error.message }
    }
  })

/**
 * MANUAL CONSISTENCY FIX: Recalculate studentProgress from assessments
 * Callable function for admin
 */
exports.recalculateStudentProgress = functions.https.onCall(async (data, context) => {
  // Check if caller is admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const callerDoc = await db.collection('users').doc(context.auth.uid).get()
  const callerRole = callerDoc.data()?.role
  
  if (callerRole !== 'ministry_admin' && callerRole !== 'esa_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can run this function')
  }

  const { studentId, courseId } = data

  if (!studentId || !courseId) {
    throw new functions.https.HttpsError('invalid-argument', 'studentId and courseId required')
  }

  try {
    // Get all assessments
    const assessmentsSnap = await db.collection('assessments')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .get()

    // Collect all passed LOs
    const passedLOs = new Set()
    let totalAssessments = 0
    let totalPoints = 0

    assessmentsSnap.docs.forEach(doc => {
      const assessment = doc.data()
      totalAssessments++
      
      // LOs
      const los = assessment.loAssessment?.passedLOs || []
      los.forEach(lo => passedLOs.add(lo))
      
      // Points
      totalPoints += assessment.gamification?.pointsEarned || 0
    })

    // Update studentProgress
    const progressRef = db.collection('studentProgress').doc(`${studentId}_${courseId}`)
    await progressRef.set({
      studentId,
      courseId,
      passedLOs: Array.from(passedLOs),
      totalAssessments,
      totalPoints,
      lastRecalculated: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })

    // Audit log
    await db.collection('auditLogs').add({
      userId: context.auth.uid,
      action: 'recalculate_progress',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        targetStudent: studentId,
        courseId,
        passedLOsCount: passedLOs.size,
        totalAssessments
      }
    })

    return {
      success: true,
      passedLOs: Array.from(passedLOs),
      totalAssessments,
      totalPoints
    }
  } catch (error) {
    console.error('Recalculation error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Generate Lesson Plan using AI (5E Model with ARCE Assessment)
 * ครบถ้วนตามโครงสร้างแผนการจัดการเรียนรู้มาตรฐานกระทรวงศึกษาธิการไทย
 */
exports.generateLessonPlan = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 180,
  memory: '1GB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const {
        teacherId,
        // Course Info
        courseId,
        courseCode,
        courseName,
        courseDescription,
        subjectGroup,
        learningOutcomes,
        // ข้อมูลหลักสูตรแกนกลาง
        courseType,
        selectedStandards,
        keyCompetencies,
        desiredCharacteristics,
        // Basic Info
        gradeLevel,
        semester,
        academicYear,
        teacherName,
        schoolName,
        // Unit & Lesson
        unitNumber,
        unitName,
        unitTotalHours,
        unitTotalPeriods,        // From CurriculumDesigner
        unitEssentialContent,    // สาระสำคัญของหน่วย
        unitLearningObjectives,  // จุดประสงค์ของหน่วย
        unitLOs,                 // LOs ของหน่วย
        totalPlansInUnit,        // จำนวนแผนทั้งหมดในหน่วย
        previousPlans,           // แผนก่อนหน้าที่สร้างแล้ว
        courseStructure,         // โครงสร้างรายวิชา
        planNumber,
        topic,
        duration,
        periods,                 // จำนวนคาบของแผนนี้
        teachingMethod,
        // Standards & LOs
        standard,
        indicatorTypes,
        indicators,
        targetLOs,
        planLOs,                 // LOs ของแผนนี้
        // ARCE Focus
        arce,
        arceFocus,
        hotsFocus,
        // Options
        desirableTraits,
        competencies,
        integration,
        learningStyle,
        additionalNotes
      } = req.body

      if (!courseId || !topic || !teacherId) {
        return res.status(400).send({
          error: 'Missing required fields: courseId, topic, teacherId'
        })
      }

      if (!openai) {
        return res.status(500).send({
          error: 'OpenAI API not configured'
        })
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

      // แต่ละแผน = 1 คาบ (50 นาที) เสมอ
      const actualPeriods = periods || 1
      const actualDuration = actualPeriods * 50

      // Build Learning Outcomes text from planLOs or unitLOs or targetLOs - ensure it's an array
      let effectiveLOs = planLOs || unitLOs || targetLOs || []
      if (!Array.isArray(effectiveLOs)) {
        effectiveLOs = []
      }
      const losText = effectiveLOs.length 
        ? effectiveLOs.map(lo => {
            const loData = learningOutcomes?.find(l => l.code === lo)
            return loData ? `- ${lo}: ${loData.description}` : `- ${lo}`
          }).join('\n')
        : 'AI จะสร้าง Learning Outcomes ให้อัตโนมัติ'

      // Build desirable traits text
      const traitsMap = {
        'discipline': 'มีวินัย',
        'diligent': 'ใฝ่เรียนรู้',
        'determined': 'มุ่งมั่นในการทำงาน',
        'honest': 'ซื่อสัตย์สุจริต',
        'sufficient': 'อยู่อย่างพอเพียง',
        'patriotic': 'รักชาติ ศาสน์ กษัตริย์',
        'thai_identity': 'รักความเป็นไทย',
        'public_minded': 'มีจิตสาธารณะ',
        // เพิ่ม key ตามที่ใช้ใน desiredCharacteristics
        'patriotism': 'รักชาติ ศาสน์ กษัตริย์',
        'honesty': 'ซื่อสัตย์สุจริต',
        'curiosity': 'ใฝ่เรียนรู้',
        'sufficiency': 'อยู่อย่างพอเพียง',
        'dedication': 'มุ่งมั่นในการทำงาน',
        'thaiIdentity': 'รักความเป็นไทย',
        'publicMind': 'มีจิตสาธารณะ'
      }

      // Build competencies text
      const compMap = {
        'communication': 'ความสามารถในการสื่อสาร',
        'thinking': 'ความสามารถในการคิด',
        'problem_solving': 'ความสามารถในการแก้ปัญหา',
        'problemSolving': 'ความสามารถในการแก้ปัญหา',
        'life_skills': 'ความสามารถในการใช้ทักษะชีวิต',
        'lifeSkills': 'ความสามารถในการใช้ทักษะชีวิต',
        'technology': 'ความสามารถในการใช้เทคโนโลยี'
      }
      // ใช้ keyCompetencies จากหลักสูตรถ้ามี หรือ competencies จาก request
      const effectiveCompetencies = keyCompetencies?.length > 0 ? keyCompetencies : (Array.isArray(competencies) ? competencies : [])
      const compText = effectiveCompetencies.length > 0 
        ? effectiveCompetencies.map(c => compMap[c] || c).join(', ') 
        : 'ความสามารถในการสื่อสาร, ความสามารถในการคิด'
      
      // ใช้ desiredCharacteristics จากหลักสูตรถ้ามี หรือ desirableTraits จาก request
      const effectiveTraits = desiredCharacteristics?.length > 0 ? desiredCharacteristics : (Array.isArray(desirableTraits) ? desirableTraits : [])
      const traitsText = effectiveTraits.length > 0 
        ? effectiveTraits.map(t => traitsMap[t] || t).join(', ') 
        : 'มีวินัย, ใฝ่เรียนรู้, มุ่งมั่นในการทำงาน'
      
      // ประเภทรายวิชา
      const isBasicCourse = courseType === 'basic'
      const standardsText = selectedStandards?.length > 0 
        ? selectedStandards.join(', ') 
        : ''

      // Integration text
      let integrationText = ''
      if (integration?.worldClass) {
        integrationText += '- บูรณาการหลักสูตรโรงเรียนมาตรฐานสากล (IS1, IS2, IS3)\n'
      }
      if (integration?.sufficiencyEconomy) {
        integrationText += '- บูรณาการปรัชญาของเศรษฐกิจพอเพียง (พอประมาณ, มีเหตุผล, มีภูมิคุ้มกัน)\n'
      }

      // Build ARCE focus text - ensure it's an array
      let effectiveArce = arce || arceFocus || hotsFocus || ['analysis', 'reasoning', 'creativity', 'evidence']
      // If it's not an array, use default
      if (!Array.isArray(effectiveArce)) {
        effectiveArce = ['analysis', 'reasoning', 'creativity', 'evidence']
      }
      const arceMap = {
        'analysis': 'การวิเคราะห์ (Analysis)',
        'reasoning': 'การให้เหตุผล (Reasoning)',
        'creativity': 'ความคิดสร้างสรรค์ (Creativity)',
        'evidence': 'การใช้หลักฐาน (Evidence)'
      }
      const arceText = effectiveArce.map(a => arceMap[a] || a).join(', ')

      // Build previous plans context
      let prevPlansText = ''
      if (Array.isArray(previousPlans) && previousPlans.length > 0) {
        prevPlansText = `\n📋 แผนที่สร้างไปแล้วในหน่วยนี้:
${previousPlans.map((p, i) => `- แผนที่ ${i + 1}: "${p.topic || 'ไม่ระบุ'}" (${p.periods || 2} คาบ, LOs: ${Array.isArray(p.los) ? p.los.join(', ') : 'ไม่ระบุ'})`).join('\n')}`
      }

      const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบแผนการจัดการเรียนรู้ตามมาตรฐานกระทรวงศึกษาธิการไทย สำหรับการขอเลื่อนวิทยฐานะครูชำนาญการพิเศษ

📚 ข้อมูลรายวิชา:
- รหัสวิชา: ${courseCode || 'ไม่ระบุ'}
- ชื่อวิชา: ${courseName || 'ไม่ระบุ'}
- คำอธิบายรายวิชา: ${courseDescription || 'ไม่ระบุ'}
- กลุ่มสาระการเรียนรู้: ${subjectGroup || 'วิทยาศาสตร์และเทคโนโลยี'}
- ระดับชั้น: ${gradeLevel || 'ม.4'}
- ภาคเรียนที่: ${semester || 2} ปีการศึกษา: ${academicYear || 2568}
- ประเภทรายวิชา: ${isBasicCourse ? '📘 รายวิชาพื้นฐาน (ต้องเคร่งครัดตามหลักสูตรแกนกลาง)' : '📗 รายวิชาเพิ่มเติม'}
- ครูผู้สอน: ${teacherName || 'ไม่ระบุ'}
- โรงเรียน: ${schoolName || 'ไม่ระบุ'}

📋 ข้อมูลตามหลักสูตรแกนกลาง พ.ศ. 2551 (ฉบับปรับปรุง 2560):
${standardsText ? `- มาตรฐานการเรียนรู้ที่เลือก: ${standardsText}` : ''}
- สมรรถนะสำคัญของผู้เรียน: ${compText}
- คุณลักษณะอันพึงประสงค์: ${traitsText}
${isBasicCourse ? '⚠️ รายวิชาพื้นฐาน: ต้องออกแบบให้สอดคล้องกับมาตรฐาน/ตัวชี้วัดตามหลักสูตรแกนกลางอย่างเคร่งครัด' : ''}

📋 ข้อมูลหน่วยการเรียนรู้ (สำคัญ - ต้องสร้างแผนให้สอดคล้อง!):
- หน่วยการเรียนรู้ที่: ${unitNumber || 1}
- ชื่อหน่วย: ${unitName || topic}
- รวมเวลาหน่วย: ${unitTotalPeriods || unitTotalHours || 4} คาบ
- สาระสำคัญของหน่วย: ${unitEssentialContent || 'ไม่ระบุ'}
- จุดประสงค์การเรียนรู้ของหน่วย: ${Array.isArray(unitLearningObjectives) ? unitLearningObjectives.join(', ') : unitLearningObjectives || 'ไม่ระบุ'}
- Learning Outcomes (LOs) ของหน่วย: ${unitLOs?.join(', ') || 'ไม่ระบุ'}
- จำนวนแผนทั้งหมดในหน่วยนี้: ${totalPlansInUnit || 2} แผน
${prevPlansText}

📝 ข้อมูลแผนการจัดการเรียนรู้นี้:
- แผนการจัดการเรียนรู้ที่: ${planNumber || 1} / ${totalPlansInUnit || 2}
- เรื่อง: ${topic}
- เวลา: ${actualPeriods} คาบ (${actualDuration} นาที โดย 1 คาบ = 50 นาที)
- Learning Outcomes (LOs) ที่เน้น: ${effectiveLOs?.join(', ') || 'ทุก LO ของหน่วย'}
- HOTS Focus (A.R.C.E.): ${arceText}
- วิธีการสอน: ${teachingMethod === '5E' ? 'กระบวนการสืบเสาะหาความรู้ 5 ขั้นตอน (5E)' : teachingMethod || '5E'}

🎯 มาตรฐานและตัวชี้วัด:
${standard || 'ให้ AI สร้างมาตรฐานที่เหมาะสมกับเนื้อหา'}
${indicators ? `ตัวชี้วัด:\n${indicators}` : ''}
ประเภทตัวชี้วัด: ${indicatorTypes?.includes('during') ? '☐ ตัวชี้วัดระหว่างทาง' : ''} ${indicatorTypes?.includes('final') ? '☑ ตัวชี้วัดปลายทาง' : '☑ ตัวชี้วัดปลายทาง'}

📖 Learning Outcomes จากรายวิชา:
${losText}

✨ คุณลักษณะอันพึงประสงค์ที่ต้องการเน้น:
${traitsText}

🌟 สมรรถนะสำคัญที่ต้องการเน้น:
${compText}

🔗 การบูรณาการ:
${integrationText || 'ไม่มีการบูรณาการพิเศษ'}

⚙️ ตัวเลือกเพิ่มเติม:
- รูปแบบการเรียนรู้: ${learningStyle === 'collaborative' ? 'เรียนรู้แบบกลุ่ม' : learningStyle === 'individual' ? 'เรียนรู้รายบุคคล' : 'ผสมผสาน'}
${additionalNotes ? `- หมายเหตุเพิ่มเติม: ${additionalNotes}` : ''}

⚠️ ข้อกำหนดสำคัญ:
1. แผนนี้ต้องสอดคล้องกับ "สาระสำคัญของหน่วย" และ "จุดประสงค์การเรียนรู้ของหน่วย" ที่กำหนดไว้
2. ต้องครอบคลุม Learning Outcomes (LOs) ที่ระบุในแผนนี้
3. กิจกรรมต้องเหมาะสมกับเวลา ${actualPeriods} คาบ (${actualDuration} นาที) โดยกิจกรรม 5E ทั้ง 5 ขั้น รวมกันต้องเท่ากับ ${actualDuration} นาทีพอดี
4. ถ้ามีแผนก่อนหน้าแล้ว ให้เนื้อหาต่อเนื่องและไม่ซ้ำซ้อน
5. เน้น HOTS ด้าน ${arceText}

🎯 การออกแบบ 5E Model ให้สอดคล้องกับ A.R.C.E. (สำคัญมาก!):
แต่ละขั้นตอนของ 5E ต้องออกแบบให้ส่งเสริมทักษะ HOTS ตามเกณฑ์ A.R.C.E. ดังนี้:

📌 ขั้นที่ 1 - Engagement (กระตุ้นความสนใจ): 5-8 นาที
   - เน้น Analysis (A): ตั้งคำถามให้วิเคราะห์สถานการณ์ ปัญหา หรือกรณีศึกษา
   - กิจกรรม: นำเสนอสถานการณ์ปัญหา, ถามคำถามเพื่อให้วิเคราะห์องค์ประกอบ, แยกแยะสิ่งที่รู้และไม่รู้

📌 ขั้นที่ 2 - Exploration (สำรวจ): 15-20 นาที
   - เน้น Evidence (E): ให้ค้นหาข้อมูล หลักฐาน ทดลอง สังเกต บันทึกผล
   - เน้น Analysis (A): วิเคราะห์ข้อมูลที่ค้นพบ จำแนกประเภท เปรียบเทียบ
   - กิจกรรม: ทดลอง/สำรวจ, รวบรวมหลักฐาน, บันทึกข้อมูลอย่างเป็นระบบ

📌 ขั้นที่ 3 - Explanation (อธิบาย): 10-12 นาที
   - เน้น Reasoning (R): อธิบายเหตุผล สรุปความสัมพันธ์ เชื่อมโยงหลักการ
   - เน้น Evidence (E): อ้างอิงหลักฐานจากการสำรวจมาสนับสนุนคำอธิบาย
   - กิจกรรม: นำเสนอข้อค้นพบ, อธิบายด้วยหลักการทางวิชาการ, ตอบคำถาม "ทำไม"

📌 ขั้นที่ 4 - Elaboration (ขยายความ): 8-12 นาที
   - เน้น Creativity (C): นำความรู้ไปประยุกต์ใช้สถานการณ์ใหม่ คิดวิธีแก้ปัญหาใหม่
   - เน้น Reasoning (R): เชื่อมโยงกับความรู้เดิมและสถานการณ์อื่น
   - กิจกรรม: แก้ปัญหาใหม่, ออกแบบ/สร้างสรรค์ผลงาน, ประยุกต์ใช้จริง

📌 ขั้นที่ 5 - Evaluation (ประเมินผล): 5-8 นาที
   - ครอบคลุมทั้ง A.R.C.E.: ประเมินความสามารถด้านวิเคราะห์ เหตุผล สร้างสรรค์ และหลักฐาน
   - กิจกรรม: ทำแบบทดสอบ HOTS, สะท้อนคิด, ประเมินตนเองและเพื่อน

⏱️ เวลารวม 5E = ${actualDuration} นาที (${actualPeriods} คาบ x 50 นาที)
   - Engagement: 5-8 นาที
   - Exploration: 15-20 นาที  
   - Explanation: 10-12 นาที
   - Elaboration: 8-12 นาที
   - Evaluation: 5-8 นาที

กรุณาสร้างแผนการจัดการเรียนรู้ที่ครบถ้วนตามโครงสร้างมาตรฐาน ตอบเป็น JSON ตามโครงสร้างนี้ (ไม่ต้องมี markdown wrapper):

{
  "title": "ชื่อแผนการจัดการเรียนรู้ที่ ${planNumber || 1} เรื่อง ${topic}",
  "header": {
    "planNumber": ${planNumber || 1},
    "courseCode": "${courseCode || ''}",
    "courseName": "${courseName || ''}",
    "subjectGroup": "${subjectGroup || 'วิทยาศาสตร์และเทคโนโลยี'}",
    "gradeLevel": "${gradeLevel || 'ม.4'}",
    "semester": ${semester || 2},
    "academicYear": ${academicYear || 2568},
    "teacherName": "${teacherName || ''}",
    "schoolName": "${schoolName || ''}",
    "unitNumber": ${unitNumber || 1},
    "unitName": "${unitName || topic}",
    "unitTotalPeriods": ${unitTotalPeriods || unitTotalHours || 4},
    "totalPlansInUnit": ${totalPlansInUnit || 2},
    "topic": "${topic}",
    "periods": ${actualPeriods},
    "duration": ${actualDuration},
    "teachingMethod": "${teachingMethod || '5E'}",
    "unitEssentialContent": "${(unitEssentialContent || '').replace(/"/g, '\\"')}",
    "targetLOs": ${JSON.stringify(effectiveLOs || [])}
  },
  "standard": {
    "code": "มาตรฐาน ว X.X",
    "description": "คำอธิบายมาตรฐาน..."
  },
  "indicators": {
    "types": ["${indicatorTypes?.join('","') || 'final'}"],
    "items": [
      {
        "code": "ว X.X ม.4/1",
        "description": "ตัวชี้วัด/ผลการเรียนรู้..."
      }
    ]
  },
  "objectives": {
    "knowledge": [
      "นักเรียนสามารถระบุ/อธิบาย... (ห้ามใส่ 'ด้านความรู้ (K):' นำหน้า)"
    ],
    "process": [
      "นักเรียนสามารถปฏิบัติ/วิเคราะห์... (ห้ามใส่ 'ด้านทักษะกระบวนการ (P):' นำหน้า)"
    ],
    "attitude": [
      "นักเรียนมีความตั้งใจ/มีวินัย... (ห้ามใส่ 'ด้านคุณลักษณะ (A):' นำหน้า)"
    ]
  },
  "essentialContent": "อธิบายสาระสำคัญ... (ห้ามใส่ 'สาระสำคัญ:' นำหน้า)",
  "learningContent": [
    "สาระการเรียนรู้ข้อที่ 1",
    "สาระการเรียนรู้ข้อที่ 2"
  ],
  "desirableTraits": {
    "selected": [/* วิเคราะห์และเลือกคุณลักษณะอันพึงประสงค์ที่เหมาะกับกิจกรรม เลือก 2-4 ข้อจาก: "patriotic" (รักชาติ ศาสน์ กษัตริย์), "honesty" (ซื่อสัตย์สุจริต), "discipline" (มีวินัย), "studious" (ใฝ่เรียนรู้), "self_sufficiency" (อยู่อย่างพอเพียง), "dedicated" (มุ่งมั่นในการทำงาน), "thai_identity" (รักความเป็นไทย), "public_mind" (มีจิตสาธารณะ) */],
    "description": "อธิบายละเอียดว่ากิจกรรมในแผนนี้ส่งเสริมคุณลักษณะที่เลือกอย่างไร เชื่อมโยงกับเนื้อหา ${topic}"
  },
  "competencies": {
    "selected": [/* วิเคราะห์และเลือกสมรรถนะที่เหมาะกับกิจกรรม เลือก 2-4 ข้อจาก: "communication" (ความสามารถในการสื่อสาร), "thinking" (ความสามารถในการคิด), "problem_solving" (ความสามารถในการแก้ปัญหา), "life_skills" (ความสามารถในการใช้ทักษะชีวิต), "technology" (ความสามารถในการใช้เทคโนโลยี) */],
    "descriptions": {
      /* สำหรับแต่ละสมรรถนะที่เลือก ให้อธิบายว่ากิจกรรมส่งเสริมอย่างไร เชื่อมโยงกับเนื้อหา ${topic} โดยเฉพาะ */
      "communication": "อธิบายการส่งเสริมสมรรถนะด้านการสื่อสารเชื่อมโยงกับกิจกรรมในแผน",
      "thinking": "อธิบายการส่งเสริมสมรรถนะด้านการคิดวิเคราะห์เชื่อมโยงกับเนื้อหา",
      "problem_solving": "อธิบายการส่งเสริมสมรรถนะด้านการแก้ปัญหาจากโจทย์ในกิจกรรม",
      "life_skills": "อธิบายการส่งเสริมทักษะชีวิตจากการนำความรู้ไปใช้",
      "technology": "อธิบายการส่งเสริมสมรรถนะด้านเทคโนโลยี (ถ้าเกี่ยวข้อง)"
    }
  },
  "integration": {
    "worldClass": false,
    "worldClassItems": null,
    "sufficiencyEconomy": false,
    "sufficiencyItems": null,
    "crossSubjects": [
      /* วิเคราะห์การบูรณาการข้ามสาระที่เหมาะกับหัวข้อ ${topic} ถ้ามี ให้ระบุ subject และ description */
    ]
  },
  "tasks": [
    "ภาระงาน: อธิบายงานที่นักเรียนต้องทำ (ห้ามใส่เลขข้อหน้า)",
    "ภาระงานอื่น",
    "ภาระงานอื่น",
    "ภาระงานอื่น",
    "ภาระงานอื่น"
  ],
  "assessment": {
    "table": [
      {
        "aspect": "ด้านความรู้ (K)",
        "item": "สิ่งที่ประเมิน",
        "method": "วิธีการ",
        "tool": "เครื่องมือ",
        "criteria": "เกณฑ์การผ่าน",
        "evaluator": "ครู/นักเรียน"
      },
      {
        "aspect": "ด้านทักษะ (P)",
        "item": "สิ่งที่ประเมิน",
        "method": "วิธีการ",
        "tool": "เครื่องมือ",
        "criteria": "เกณฑ์การผ่าน",
        "evaluator": "ครู/นักเรียน"
      },
      {
        "aspect": "ด้านคุณลักษณะ (A)",
        "item": "สิ่งที่ประเมิน",
        "method": "วิธีการ",
        "tool": "เครื่องมือ",
        "criteria": "เกณฑ์การผ่าน",
        "evaluator": "ครู/นักเรียน"
      }
    ],
    "rubric": {
      "analysis": {
        "weight": 25,
        "criteria": "เกณฑ์การประเมินด้านการวิเคราะห์สำหรับเรื่องนี้โดยเฉพาะ",
        "levels": {
          "5": "ดีเยี่ยม: อธิบายระดับ 5",
          "4": "ดี: อธิบายระดับ 4",
          "3": "พอใช้: อธิบายระดับ 3",
          "2": "ต้องปรับปรุง: อธิบายระดับ 2",
          "1": "ไม่ผ่าน: อธิบายระดับ 1"
        }
      },
      "reasoning": {
        "weight": 25,
        "criteria": "เกณฑ์การประเมินด้านการให้เหตุผล",
        "levels": {
          "5": "ดีเยี่ยม: ...",
          "4": "ดี: ...",
          "3": "พอใช้: ...",
          "2": "ต้องปรับปรุง: ...",
          "1": "ไม่ผ่าน: ..."
        }
      },
      "creativity": {
        "weight": 25,
        "criteria": "เกณฑ์การประเมินด้านความคิดสร้างสรรค์",
        "levels": {
          "5": "ดีเยี่ยม: ...",
          "4": "ดี: ...",
          "3": "พอใช้: ...",
          "2": "ต้องปรับปรุง: ...",
          "1": "ไม่ผ่าน: ..."
        }
      },
      "evidence": {
        "weight": 25,
        "criteria": "เกณฑ์การประเมินด้านการใช้หลักฐาน",
        "levels": {
          "5": "ดีเยี่ยม: ...",
          "4": "ดี: ...",
          "3": "พอใช้: ...",
          "2": "ต้องปรับปรุง: ...",
          "1": "ไม่ผ่าน: ..."
        }
      }
    }
  },
  "activities": {
    "totalDuration": ${actualDuration},
    "engagement": {
      "duration": 7,
      "arceFocus": ["analysis"],
      "arceDescription": "ส่งเสริมทักษะการวิเคราะห์ผ่านการตั้งคำถามและวิเคราะห์สถานการณ์",
      "steps": [
        "กิจกรรม/สิ่งที่ครูทำในขั้นกระตุ้นความสนใจ (ห้ามใส่เลขข้อหน้า)",
        "ตั้งคำถามกระตุ้นให้วิเคราะห์สถานการณ์ปัญหา",
        "ให้นักเรียนแยกแยะสิ่งที่รู้และไม่รู้"
      ],
      "questions": [
        "คำถามวิเคราะห์: ถ้า...จะเกิดอะไรขึ้น?",
        "คำถามแยกแยะ: องค์ประกอบของ...มีอะไรบ้าง?"
      ],
      "media": ["สื่อที่ใช้กระตุ้นความสนใจ"]
    },
    "exploration": {
      "duration": 18,
      "arceFocus": ["evidence", "analysis"],
      "arceDescription": "ส่งเสริมการใช้หลักฐานและวิเคราะห์ผ่านการสำรวจ ทดลอง เก็บข้อมูล",
      "steps": [
        "กิจกรรมสำรวจ/ทดลอง (ห้ามใส่เลขข้อหน้า)",
        "ให้นักเรียนรวบรวมข้อมูล/หลักฐานอย่างเป็นระบบ",
        "บันทึกผลการสังเกต/ทดลองลงในใบงาน",
        "วิเคราะห์ข้อมูลที่ได้ จำแนกประเภท เปรียบเทียบ",
        "สรุปผลการสำรวจเบื้องต้น"
      ],
      "materials": ["วัสดุอุปกรณ์ที่ใช้ในการสำรวจ/ทดลอง"],
      "media": ["สื่อที่ใช้ประกอบการสำรวจ"]
    },
    "explanation": {
      "duration": 10,
      "arceFocus": ["reasoning", "evidence"],
      "arceDescription": "ส่งเสริมการให้เหตุผลและใช้หลักฐานผ่านการอธิบายและอ้างอิงข้อมูล",
      "steps": [
        "นักเรียนนำเสนอข้อค้นพบจากการสำรวจ (ห้ามใส่เลขข้อหน้า)",
        "อธิบายเหตุผลที่ได้ผลลัพธ์เช่นนั้น",
        "อ้างอิงหลักฐานจากการสำรวจมาสนับสนุน",
        "ครูเชื่อมโยงกับหลักการ/ทฤษฎีทางวิชาการ"
      ],
      "keyConcepts": [
        "แนวคิดหลักที่ต้องเข้าใจ 1",
        "แนวคิดหลักที่ต้องเข้าใจ 2"
      ]
    },
    "elaboration": {
      "duration": 10,
      "arceFocus": ["creativity", "reasoning"],
      "arceDescription": "ส่งเสริมความคิดสร้างสรรค์และการให้เหตุผลผ่านการประยุกต์ใช้ความรู้",
      "steps": [
        "ให้โจทย์สถานการณ์ใหม่ที่ต้องประยุกต์ใช้ความรู้ (ห้ามใส่เลขข้อหน้า)",
        "นักเรียนคิดวิธีแก้ปัญหาอย่างสร้างสรรค์",
        "เชื่อมโยงความรู้กับสถานการณ์ในชีวิตจริง",
        "นำเสนอแนวคิดใหม่และให้เหตุผลสนับสนุน"
      ],
      "hotsIntegration": "กิจกรรมนี้ส่งเสริม Creativity ผ่านการคิดวิธีใหม่ และ Reasoning ผ่านการให้เหตุผลสนับสนุน",
      "media": ["สื่อประกอบการขยายความรู้"]
    },
    "evaluation": {
      "duration": 5,
      "arceFocus": ["analysis", "reasoning", "creativity", "evidence"],
      "arceDescription": "ประเมินครบ 4 มิติ A.R.C.E. ตามเกณฑ์ที่กำหนด",
      "steps": [
        "ทำแบบทดสอบ HOTS ที่ครอบคลุม A.R.C.E. (ห้ามใส่เลขข้อหน้า)",
        "สะท้อนคิดว่าได้เรียนรู้อะไร และจะนำไปใช้อย่างไร",
        "ประเมินตนเองตามเกณฑ์ A.R.C.E.",
        "รับ feedback จากครูและเพื่อน"
      ],
      "methods": [
        "แบบทดสอบ HOTS ครบ 4 ด้าน A.R.C.E.",
        "การสะท้อนคิด (Reflection)",
        "การประเมินตนเองและเพื่อน"
      ]
    }
  },
  "media": {
    "learningMaterials": [
      "สื่อการเรียนรู้เกี่ยวกับ...",
      "ใบงาน/ใบความรู้...",
      "สื่อนำเสนอ PowerPoint...",
      "วิดีโอการสอน...",
      "อุปกรณ์/เครื่องมือ..."
    ],
    "learningSources": [
      "เว็บไซต์/แหล่งข้อมูลออนไลน์...",
      "หนังสือ/ตำรา...",
      "บทความวิชาการ...",
      "ห้องปฏิบัติการ/สถานที่...",
      "ผู้เชี่ยวชาญ/วิทยากร..."
    ]
  },
  "postTeachingRecord": {
    "results": "",
    "innovations": "",
    "problems": "",
    "suggestions": "",
    "signatures": {
      "teacher": "${teacherName || ''}",
      "teacherPosition": "ครู วิทยฐานะครู...",
      "headOfDepartment": "",
      "viceDirector": "",
      "director": ""
    }
  },
  "worksheets": [
    {
      "number": 1,
      "title": "ชื่อใบงาน (ห้ามใส่ 'ใบงานที่ 1:' นำหน้า)",
      "phase": "exploration",
      "phaseLabel": "ขั้นสำรวจ (Exploration)",
      "arceFocus": ["evidence", "analysis"],
      "arceDescription": "ใบงานนี้ส่งเสริม Evidence ผ่านการรวบรวมข้อมูล และ Analysis ผ่านการวิเคราะห์สิ่งที่สังเกต",
      "objective": "วัตถุประสงค์ของใบงานที่สอดคล้องกับกิจกรรมขั้นสำรวจ + A.R.C.E.",
      "instructions": "คำชี้แจง/วิธีทำ",
      "questions": [
        "คำถาม/กิจกรรมที่ส่งเสริม Evidence: ให้บันทึกข้อมูล/หลักฐานที่พบ",
        "คำถาม/กิจกรรมที่ส่งเสริม Analysis: ให้วิเคราะห์/จำแนก/เปรียบเทียบข้อมูล"
      ]
    },
    {
      "number": 2,
      "title": "ชื่อใบงาน (ห้ามใส่ 'ใบงานที่ 2:' นำหน้า)",
      "phase": "elaboration",
      "phaseLabel": "ขั้นขยายความ (Elaboration)",
      "arceFocus": ["creativity", "reasoning"],
      "arceDescription": "ใบงานนี้ส่งเสริม Creativity ผ่านการออกแบบวิธีแก้ปัญหาใหม่ และ Reasoning ผ่านการให้เหตุผลสนับสนุน",
      "objective": "วัตถุประสงค์ของใบงานที่สอดคล้องกับกิจกรรมขั้นขยายความ + A.R.C.E.",
      "instructions": "คำชี้แจง/วิธีทำ",
      "questions": [
        "คำถาม/กิจกรรมที่ส่งเสริม Creativity: ให้ออกแบบ/สร้างสรรค์วิธีการใหม่",
        "คำถาม/กิจกรรมที่ส่งเสริม Reasoning: ให้อธิบายเหตุผลที่เลือกวิธีนี้"
      ]
    }
  ],
  "knowledgeSheets": [
    {
      "number": 1,
      "title": "ชื่อใบความรู้ (ห้ามใส่ 'ใบความรู้ที่ 1:' นำหน้า)",
      "phase": "explanation",
      "phaseLabel": "ขั้นอธิบาย (Explanation)",
      "arceFocus": ["reasoning", "evidence"],
      "arceDescription": "ใบความรู้นี้ส่งเสริม Reasoning ผ่านการอธิบายหลักการ และ Evidence ผ่านการอ้างอิงข้อมูลทางวิชาการ",
      "content": "เนื้อหาสาระความรู้ที่อธิบายหลักการ ทฤษฎี พร้อมตัวอย่างและหลักฐานอ้างอิง (อย่างน้อย 200 คำ)"
    }
  ],
  "essentialContent": "สาระสำคัญ: ดึงมาจากสาระสำคัญของหน่วย แล้วปรับให้เฉพาะแผนนี้"
}

⚠️ ข้อกำหนดสำคัญเพิ่มเติม:
1. worksheets แต่ละใบต้องระบุ phase ที่ใช้ (exploration, elaboration, evaluation) - สำคัญ!
2. knowledgeSheets แต่ละใบต้องระบุ phase ที่ใช้ (explanation) - สำคัญ!
3. essentialContent ต้องดึงมาจาก unitEssentialContent แล้วปรับให้เฉพาะเจาะแผนนี้
4. ห้ามใส่ "ใบงานที่ 1:", "ใบความรู้ที่ 1:" นำหน้าชื่อ - เพราะมีเลขลำดับแสดงอยู่แล้ว

🎯 ข้อกำหนดสำคัญเรื่องการวิเคราะห์ตามบริบท:
5. desirableTraits.selected - ต้องวิเคราะห์จริงว่ากิจกรรมในแผนส่งเสริมคุณลักษณะใดบ้าง เลือก 2-4 ข้อที่เหมาะสมที่สุด
6. desirableTraits.description - ต้องอธิบายละเอียดว่ากิจกรรมส่งเสริมคุณลักษณะที่เลือกอย่างไร เชื่อมโยงกับเนื้อหาโดยเฉพาะ
7. competencies.selected - ต้องวิเคราะห์จริงว่ากิจกรรมส่งเสริมสมรรถนะใดบ้าง เลือก 2-4 ข้อที่เหมาะสมที่สุด
8. competencies.descriptions - สำหรับแต่ละสมรรถนะที่เลือก ต้องอธิบายว่าส่งเสริมอย่างไร เชื่อมโยงกับกิจกรรมจริง
9. integration.crossSubjects - ถ้าเนื้อหาสามารถบูรณาการกับสาระอื่นได้ ให้ระบุพร้อมอธิบายการเชื่อมโยง`

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบแผนการจัดการเรียนรู้ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551 ของไทย 
มีความเชี่ยวชาญในการออกแบบกิจกรรมตามรูปแบบ 5E และการประเมินทักษะการคิดขั้นสูง (HOTS) ด้วยเกณฑ์ A.R.C.E.
เข้าใจการบูรณาการหลักสูตรโรงเรียนมาตรฐานสากลและปรัชญาของเศรษฐกิจพอเพียง
สร้างแผนที่ละเอียด มีคุณภาพ ใช้งานได้จริง เหมาะสำหรับการขอเลื่อนวิทยฐานะครูชำนาญการพิเศษ

🧠 สำคัญมาก - การวิเคราะห์ตามบริบท:
- คุณลักษณะอันพึงประสงค์ต้องวิเคราะห์จากกิจกรรมจริง ไม่ใช่ใส่แบบสุ่ม
- สมรรถนะสำคัญต้องวิเคราะห์จากกิจกรรมจริง พร้อมอธิบายการส่งเสริมอย่างเฉพาะเจาะจง
- การบูรณาการต้องดูจากเนื้อหาว่าเชื่อมโยงกับสาระอื่นได้อย่างไร

ตอบเป็นภาษาไทยและ JSON เท่านั้น ห้ามใช้ markdown wrapper`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })

      const responseText = completion.choices[0].message.content

      let result
      try {
        let cleanedText = responseText.trim()
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        result = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse AI response:', responseText)
        return res.status(500).send({
          error: 'Failed to parse AI response',
          rawResponse: responseText.substring(0, 1000)
        })
      }

      // Log usage
      await db.collection('aiUsageLogs').add({
        teacherId,
        feature: 'generateLessonPlan',
        courseId,
        topic,
        model,
        tokensUsed: completion.usage?.total_tokens || 0,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      })

      // Save lesson plan to Firestore with complete unit context
      const lessonPlanRef = await db.collection('lessonPlans').add({
        teacherId,
        courseId,
        courseCode: courseCode || '',
        courseName: courseName || '',
        // Unit info
        unitNumber: unitNumber || 1,
        unitName: unitName || '',
        unitTotalPeriods: unitTotalPeriods || unitTotalHours || 4,
        unitEssentialContent: unitEssentialContent || '',
        unitLOs: unitLOs || [],
        totalPlansInUnit: totalPlansInUnit || 2,
        // Plan info
        planNumber: planNumber || 1,
        topic,
        periods: actualPeriods,
        duration: actualDuration,
        targetLOs: effectiveLOs || [],
        arceFocus: effectiveArce || [],
        // General
        gradeLevel: gradeLevel || 'ม.4',
        semester: semester || 1,
        academicYear: academicYear || 2568,
        teachingMethod: teachingMethod || '5E',
        content: result,
        status: 'draft',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      return res.status(200).send({
        success: true,
        planId: lessonPlanRef.id,
        data: result
      })

    } catch (error) {
      console.error('❌ Error generating lesson plan:', error)
      return res.status(500).send({
        error: 'Failed to generate lesson plan',
        message: error.message
      })
    }
  })
})

/**
 * ==========================================
 * WORKSHEET & KNOWLEDGE SHEET GENERATORS
 * สร้างใบงานและใบความรู้แยกต่างหากเพื่อความลึกซึ้ง
 * ==========================================
 */

/**
 * Generate Worksheet - สร้างใบงานจากการวิเคราะห์แผนการสอน
 * เป็นโจทย์วัดผลสัมฤทธิ์ว่านักเรียนเรียนรู้จากกิจกรรมได้หรือไม่
 */
exports.generateWorksheet = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 120,
  memory: '512MB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const {
        teacherId,
        lessonPlanId,
        // ข้อมูลจากแผน
        courseName,
        courseCode,
        gradeLevel,
        topic,
        unitName,
        unitNumber,
        planNumber,
        // Full lesson plan สำหรับวิเคราะห์
        fullLessonPlan,
        // ภาระงานที่เลือก
        task,
        taskIndex,
        // ขั้น 5E ที่ใช้
        phase,
        phaseActivity,
        // A.R.C.E. ที่เน้น
        arceFocus,
        arceDescription,
        // ข้อมูลเพิ่มเติม
        objectives,
        essentialContent,
        learningContent,
        standard,
        indicators,
        duration,
        // กิจกรรม 5E ทั้งหมด
        activities5E,
        // ใบความรู้ที่เชื่อมโยง (ถ้ามี)
        knowledgeSheet
      } = req.body

      if (!topic) {
        return res.status(400).send({
          error: 'Missing required: topic'
        })
      }

      if (!openai) {
        return res.status(500).send({ error: 'OpenAI not configured' })
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
      
      const arceMap = {
        'analysis': { name: 'การวิเคราะห์', icon: '🔍', verbs: 'วิเคราะห์ จำแนก เปรียบเทียบ แยกแยะ ตรวจสอบ' },
        'reasoning': { name: 'การให้เหตุผล', icon: '🧠', verbs: 'อธิบาย สรุป เชื่อมโยง ให้เหตุผล พิสูจน์' },
        'creativity': { name: 'ความคิดสร้างสรรค์', icon: '💡', verbs: 'ออกแบบ สร้างสรรค์ คิดค้น ประดิษฐ์ นำเสนอแนวคิดใหม่' },
        'evidence': { name: 'การใช้หลักฐาน', icon: '📚', verbs: 'รวบรวม บันทึก อ้างอิง ยืนยัน พิสูจน์ด้วยหลักฐาน' }
      }

      const phaseMap = {
        'engagement': { name: 'กระตุ้นความสนใจ', focus: 'ตรวจสอบความรู้เดิมและความสนใจ' },
        'exploration': { name: 'สำรวจ', focus: 'วัดทักษะการสืบเสาะและรวบรวมข้อมูล' },
        'explanation': { name: 'อธิบาย', focus: 'วัดความเข้าใจและทักษะการอธิบาย' },
        'elaboration': { name: 'ขยายความ', focus: 'วัดการประยุกต์ใช้ความรู้ในสถานการณ์ใหม่' },
        'evaluation': { name: 'ประเมินผล', focus: 'ประเมินผลสัมฤทธิ์การเรียนรู้ทั้งหมด' }
      }

      // แปลง arceFocus เป็น array
      const arceFocusArr = Array.isArray(arceFocus) ? arceFocus : (arceFocus ? [arceFocus] : ['reasoning'])
      const arceInfo = arceFocusArr.map(a => arceMap[a]).filter(Boolean)
      
      // สร้าง context จาก activities5E
      let activities5EContext = ''
      if (activities5E) {
        const phases = ['engagement', 'exploration', 'explanation', 'elaboration', 'evaluation']
        phases.forEach(p => {
          if (activities5E[p]) {
            const act = activities5E[p]
            activities5EContext += `\n${phaseMap[p]?.name || p}: ${act.activity || act.description || ''}`
            if (act.task) activities5EContext += ` (ภาระงาน: ${act.task})`
          }
        })
      }

      // สร้าง objectives context
      let objectivesText = ''
      if (objectives) {
        if (objectives.knowledge) {
          objectivesText += `\nด้านความรู้ (K):\n${objectives.knowledge.map((o, i) => `  ${i + 1}. ${o}`).join('\n')}`
        }
        if (objectives.process) {
          objectivesText += `\nด้านทักษะ (P):\n${objectives.process.map((o, i) => `  ${i + 1}. ${o}`).join('\n')}`
        }
        if (objectives.attitude) {
          objectivesText += `\nด้านเจตคติ (A):\n${objectives.attitude.map((o, i) => `  ${i + 1}. ${o}`).join('\n')}`
        }
      }

      // สร้าง knowledge sheet context ถ้ามี
      let knowledgeSheetContext = ''
      if (knowledgeSheet) {
        knowledgeSheetContext = `
📖 ใบความรู้ที่นักเรียนได้ศึกษา:
- หัวข้อ: ${knowledgeSheet.metadata?.title || topic}
- เนื้อหาสำคัญ: ${JSON.stringify(knowledgeSheet.contentByBloom || knowledgeSheet.sections || {}, null, 2).slice(0, 1500)}...
`
      }

      const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบเครื่องมือวัดและประเมินผล

## 🎯 งานของคุณ
**วิเคราะห์แผนการสอน** แล้วสร้าง **ใบงานวัดผลสัมฤทธิ์** ที่จะใช้ตรวจสอบว่า:
1. นักเรียนได้เรียนรู้จากกิจกรรม 5E ตามที่กำหนดหรือไม่
2. นักเรียนบรรลุจุดประสงค์การเรียนรู้หรือไม่
3. นักเรียนพัฒนาทักษะ A.R.C.E. หรือไม่

## 📚 ข้อมูลแผนการสอน

### ข้อมูลพื้นฐาน:
- รายวิชา: ${courseCode || ''} ${courseName || ''}
- ระดับชั้น: ${gradeLevel || 'ม.4'}
- หน่วยที่ ${unitNumber || 1}: ${unitName || ''}
- แผนที่ ${planNumber || 1}: ${topic}

### มาตรฐานและตัวชี้วัด:
${standard ? `มาตรฐาน: ${JSON.stringify(standard)}` : ''}
${indicators ? `ตัวชี้วัด: ${JSON.stringify(indicators)}` : ''}

### จุดประสงค์การเรียนรู้ (ที่ต้องวัด):
${objectivesText || 'ตาม LO ของแผน'}

### สาระสำคัญ:
${essentialContent || 'ตามหัวข้อที่กำหนด'}

### เนื้อหาการเรียนรู้:
${JSON.stringify(learningContent || [], null, 2).slice(0, 1000)}

### กิจกรรม 5E (ที่นักเรียนทำ - สำคัญมาก):
${activities5EContext || 'ไม่ระบุ'}

${fullLessonPlan ? `### แผนการสอนฉบับเต็ม:
${JSON.stringify(fullLessonPlan, null, 2).slice(0, 2000)}...` : ''}

${knowledgeSheetContext}

---

## ⚙️ ข้อกำหนดใบงาน

### ภาระงานที่ต้องวัด:
"${task || topic}"

### ขั้น 5E ที่ใบงานนี้ใช้: ${phaseMap[phase]?.name || phase || 'evaluation'}
- จุดเน้นการวัด: ${phaseMap[phase]?.focus || 'ประเมินผลสัมฤทธิ์'}
${phaseActivity ? `- กิจกรรมในขั้นนี้: ${phaseActivity}` : ''}

### A.R.C.E. ที่วัด: ${arceInfo.map(a => `${a.icon} ${a.name}`).join(', ') || 'Reasoning'}
${arceInfo.map(a => `- ${a.name}: ใช้คำกริยา ${a.verbs}`).join('\n')}

### เวลา: ${duration || 15} นาที

---

## 📝 หลักการออกแบบ

1. **วัดตามจุดประสงค์**: ทุกคำถามต้องเชื่อมโยงกับจุดประสงค์การเรียนรู้ที่กำหนด
2. **สะท้อนกิจกรรม**: คำถามต้องสัมพันธ์กับกิจกรรมที่นักเรียนทำ
3. **วัด A.R.C.E.**: ต้องมีคำถามที่วัดทักษะ ${arceInfo.map(a => a.name).join(' และ ')}
4. **หลากหลายระดับ Bloom's**: มีทั้งคำถามระดับล่าง (จำ/เข้าใจ) และระดับสูง (วิเคราะห์/ประเมิน/สร้างสรรค์)
5. **ให้ feedback ได้**: ต้องมีแนวคำตอบที่ชัดเจนเพื่อให้ AI ประเมินได้

---

ตอบเป็น JSON (ห้าม markdown wrapper):
{
  "title": "ชื่อใบงาน (สั้น กระชับ)",
  "purpose": "จุดประสงค์ของใบงานนี้ - วัดอะไร",
  "phase": "${phase}",
  "phaseLabel": "${phaseMap[phase]?.name || phase}",
  "arceFocus": ${JSON.stringify(arceFocus)},
  
  "alignmentAnalysis": {
    "objectivesCovered": ["จุดประสงค์ที่ 1 ที่ใบงานนี้วัด", "จุดประสงค์ที่ 2"],
    "activitiesConnected": ["กิจกรรมที่เกี่ยวข้อง 1", "กิจกรรมที่ 2"],
    "arceSkillsMeasured": {
      "analysis": "วัดการวิเคราะห์อย่างไร (ถ้าเน้น)",
      "reasoning": "วัดการให้เหตุผลอย่างไร (ถ้าเน้น)",
      "creativity": "วัดความคิดสร้างสรรค์อย่างไร (ถ้าเน้น)",
      "evidence": "วัดการใช้หลักฐานอย่างไร (ถ้าเน้น)"
    }
  },
  
  "duration": ${duration || 15},
  "instructions": "คำชี้แจงวิธีทำที่ละเอียดชัดเจน",
  
  "sections": [
    {
      "id": "section_1",
      "title": "ส่วนที่ 1: ตรวจสอบความเข้าใจ",
      "phase": "${phase || 'evaluation'}",
      "description": "อธิบายเป้าหมายของส่วนนี้",
      "type": "comprehension",
      "bloomLevel": 2,
      "arceFocus": "reasoning",
      "questions": [
        {
          "id": "q_1_1",
          "type": "open_ended",
          "arceFocus": "reasoning",
          "maxScore": 5,
          "prompt": "คำถาม (เชื่อมโยงกับกิจกรรมที่ทำ)",
          "context": "บริบทจากกิจกรรมที่นักเรียนทำ (ถ้ามี)",
          "hints": "คำแนะนำช่วยคิด",
          "expectedAnswer": "แนวคำตอบที่ดี (สำหรับ AI ประเมิน)",
          "scoringRubric": {
            "excellent": {"score": 5, "criteria": "เกณฑ์ระดับดีเยี่ยม"},
            "good": {"score": 3, "criteria": "เกณฑ์ระดับดี"},
            "developing": {"score": 1, "criteria": "เกณฑ์ระดับกำลังพัฒนา"}
          }
        },
        {
          "id": "q_1_2",
          "type": "open_ended",
          "arceFocus": "reasoning",
          "maxScore": 5,
          "prompt": "คำถามที่ 2...",
          "context": "",
          "hints": "คำแนะนำ",
          "expectedAnswer": "แนวคำตอบ"
        }
      ]
    },
    {
      "id": "section_2",
      "title": "ส่วนที่ 2: ประยุกต์ใช้และวิเคราะห์",
      "phase": "${phase || 'evaluation'}",
      "description": "อธิบายเป้าหมายของส่วนนี้",
      "type": "application",
      "bloomLevel": 4,
      "arceFocus": "analysis",
      "questions": [
        {
          "id": "q_2_1",
          "type": "open_ended",
          "arceFocus": "analysis",
          "maxScore": 5,
          "prompt": "คำถามวิเคราะห์...",
          "context": "สถานการณ์หรือข้อมูลที่ต้องวิเคราะห์",
          "hints": "คำแนะนำ",
          "expectedAnswer": "แนวคำตอบ"
        }
      ]
    },
    {
      "id": "section_3",
      "title": "ส่วนที่ 3: ประเมินและสร้างสรรค์",
      "phase": "${phase || 'evaluation'}",
      "description": "อธิบายเป้าหมายของส่วนนี้",
      "type": "higher_order",
      "bloomLevel": 5,
      "arceFocus": "creativity",
      "questions": [
        {
          "id": "q_3_1",
          "type": "open_ended",
          "arceFocus": "creativity",
          "maxScore": 5,
          "prompt": "คำถามสร้างสรรค์...",
          "context": "",
          "hints": "คำแนะนำ",
          "expectedAnswer": "แนวคำตอบ"
        }
      ]
    }
  ],
  
  "reflection": {
    "question": "คำถามสะท้อนคิดท้ายใบงาน - สิ่งที่ได้เรียนรู้จากกิจกรรม",
    "prompts": ["หัวข้อสะท้อนคิด 1", "หัวข้อ 2"],
    "connectionToActivity": "เชื่อมโยงกับกิจกรรมที่ทำอย่างไร"
  },
  
  "scoring": {
    "totalPoints": 20,
    "passingScore": 12,
    "criteria": [
      { "aspect": "ความเข้าใจเนื้อหา", "points": 6, "description": "เกณฑ์" },
      { "aspect": "ทักษะการวิเคราะห์/เหตุผล", "points": 8, "description": "เกณฑ์" },
      { "aspect": "การสร้างสรรค์/ประยุกต์ใช้", "points": 6, "description": "เกณฑ์" }
    ],
    "arceScoring": {
      "analysis": {"maxScore": 5, "weight": 0.25},
      "reasoning": {"maxScore": 5, "weight": 0.25},
      "creativity": {"maxScore": 5, "weight": 0.25},
      "evidence": {"maxScore": 5, "weight": 0.25}
    }
  },
  
  "teacherNotes": {
    "assessmentPurpose": "ใบงานนี้วัดว่านักเรียนได้เรียนรู้อะไรจากกิจกรรม",
    "commonMisconceptions": ["ความเข้าใจผิดที่พบบ่อย 1", "ความเข้าใจผิดที่ 2"],
    "feedbackGuidelines": "แนวทางการให้ feedback แก่นักเรียน",
    "remediationSuggestions": "ข้อเสนอแนะสำหรับนักเรียนที่ยังไม่บรรลุจุดประสงค์"
  }
}

## ⚠️ ข้อกำหนดสำคัญ:
1. **sections ต้องมี id** - รูปแบบ section_1, section_2, ...
2. **questions ต้องมี id** - รูปแบบ q_1_1, q_1_2, q_2_1, ...
3. **type ต้องเป็น**: open_ended, short_text, multiple_choice, multi_choice, table, rating_scale
4. **arceFocus ต้องเป็น**: analysis, reasoning, creativity, evidence
5. **maxScore ต้องเป็นตัวเลข** (ปกติ 5 ต่อข้อ)
6. **ห้ามมี markdown wrapper** เช่น \`\`\`json`

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: `คุณเป็นผู้เชี่ยวชาญด้านการวัดและประเมินผลการเรียนรู้

หลักการสำคัญ:
1. ใบงานไม่ใช่แค่แบบฝึกหัด แต่เป็นเครื่องมือ "วัดผลสัมฤทธิ์" 
2. ทุกคำถามต้องเชื่อมโยงกับ:
   - จุดประสงค์การเรียนรู้ที่ต้องการวัด
   - กิจกรรม 5E ที่นักเรียนทำ
   - ทักษะ A.R.C.E. ที่ต้องการพัฒนา
3. ต้องมีแนวคำตอบชัดเจนเพื่อให้ประเมินได้

ตอบเป็น JSON เท่านั้น ห้าม markdown wrapper`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })

      const responseText = completion.choices[0].message.content
      let result
      try {
        let cleanedText = responseText.trim()
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        result = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse worksheet:', responseText)
        return res.status(500).send({ error: 'Failed to parse AI response' })
      }

      return res.status(200).send({ success: true, worksheet: result })

    } catch (error) {
      console.error('❌ Error generating worksheet:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * ==========================================
 * AI CURRICULUM DESIGNER FUNCTIONS
 * Phase 1: Generate Course Structure
 * Phase 2: Generate Learning Units
 * ==========================================
 */

/**
 * Generate Course Structure - Phase 1
 * Analyzes course description and LOs to create curriculum structure
 */
exports.generateCourseStructure = functions.runWith({ 
  timeoutSeconds: 180,
  memory: '1GB',
  secrets: [openaiApiKey]
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { 
        courseId, courseCode, courseName, description, 
        learningOutcomes, subjectGroup, gradeLevel, settings,
        // ข้อมูลหลักสูตรแกนกลาง
        courseType, selectedStandards, keyCompetencies, desiredCharacteristics
      } = req.body

      if (!courseId || !courseName || !learningOutcomes?.length) {
        return res.status(400).send({ 
          error: 'Missing required: courseId, courseName, learningOutcomes' 
        })
      }

      if (!openai) {
        return res.status(500).send({ error: 'OpenAI not configured' })
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
      const losText = learningOutcomes.map(lo => `${lo.code}: ${lo.description}`).join('\n')
      const totalHours = settings?.totalHours || 40
      const hotsRatio = settings?.hotsRatio || 40
      
      // ข้อมูลหลักสูตรแกนกลาง
      const isBasicCourse = courseType === 'basic'
      const standardsText = selectedStandards?.length > 0 
        ? selectedStandards.join(', ') 
        : 'ไม่ระบุ'
      
      // แปลง keyCompetencies เป็นข้อความ
      const competencyNames = {
        communication: 'ความสามารถในการสื่อสาร',
        thinking: 'ความสามารถในการคิด',
        problemSolving: 'ความสามารถในการแก้ปัญหา',
        lifeSkills: 'ความสามารถในการใช้ทักษะชีวิต',
        technology: 'ความสามารถในการใช้เทคโนโลยี'
      }
      const competenciesText = keyCompetencies?.length > 0 
        ? keyCompetencies.map(k => competencyNames[k] || k).join(', ')
        : 'ทั้ง 5 สมรรถนะ'
      
      // แปลง desiredCharacteristics เป็นข้อความ
      const characteristicNames = {
        patriotism: 'รักชาติ ศาสน์ กษัตริย์',
        honesty: 'ซื่อสัตย์สุจริต',
        discipline: 'มีวินัย',
        curiosity: 'ใฝ่เรียนรู้',
        sufficiency: 'อยู่อย่างพอเพียง',
        dedication: 'มุ่งมั่นในการทำงาน',
        thaiIdentity: 'รักความเป็นไทย',
        publicMind: 'มีจิตสาธารณะ'
      }
      const characteristicsText = desiredCharacteristics?.length > 0
        ? desiredCharacteristics.map(c => characteristicNames[c] || c).join(', ')
        : 'ทั้ง 8 คุณลักษณะ'
      
      // คำนวณจำนวนหน่วยที่เหมาะสม (4-8 แผนต่อหน่วย)
      // ถ้า 40 คาบ → ต้องมี 5-10 หน่วย (เพื่อให้แต่ละหน่วยมี 4-8 แผน)
      const minUnits = Math.max(5, Math.ceil(totalHours / 8)) // ถ้า 40 คาบ = min 5 หน่วย
      const maxUnits = Math.min(12, Math.ceil(totalHours / 4)) // ถ้า 40 คาบ = max 10 หน่วย
      const recommendedUnits = Math.ceil((minUnits + maxUnits) / 2) // แนะนำกลางๆ

      const prompt = `วิเคราะห์และออกแบบโครงสร้างรายวิชาต่อไปนี้:

📚 ข้อมูลรายวิชา:
- รหัสวิชา: ${courseCode}
- ชื่อวิชา: ${courseName}
- กลุ่มสาระ: ${subjectGroup || 'วิทยาศาสตร์และเทคโนโลยี'}
- ระดับชั้น: ${gradeLevel || 'ม.4'}
- ประเภทรายวิชา: ${isBasicCourse ? '📘 รายวิชาพื้นฐาน (ต้องเคร่งครัดตามหลักสูตรแกนกลาง)' : '📗 รายวิชาเพิ่มเติม (ยืดหยุ่นได้)'}
- คำอธิบายรายวิชา: ${description || 'ไม่มี'}

📋 มาตรฐานและตัวชี้วัดที่ครูกำหนด (ห้ามเปลี่ยนแปลง!):
${selectedStandards?.length > 0 
  ? selectedStandards.map(s => `- ${s}`).join('\n')
  : '⚠️ ครูยังไม่ได้กำหนดมาตรฐาน/ตัวชี้วัด - ให้แจ้งว่าครูต้องกำหนดเอง'}

📋 ข้อมูลตามหลักสูตรแกนกลาง พ.ศ. 2551 (ฉบับปรับปรุง 2560):
- สมรรถนะสำคัญของผู้เรียน: ${competenciesText}
- คุณลักษณะอันพึงประสงค์: ${characteristicsText}

🎯 Learning Outcomes (${learningOutcomes.length} ตัว):
${losText}

⚙️ การตั้งค่า:
- เวลาเรียนรวม: ${totalHours} คาบ (1 คาบ = 50 นาที = 1 ชั่วโมง)
- สัดส่วน HOTS Assessment: ${hotsRatio}%

⚠️⚠️⚠️ ข้อกำหนดเรื่องมาตรฐานและตัวชี้วัด - สำคัญมาก! ⚠️⚠️⚠️
${selectedStandards?.length > 0 
  ? `✅ ครูได้กำหนดมาตรฐาน/ตัวชี้วัดไว้แล้ว: ใช้ข้อมูลที่ครูกำหนดในส่วน "standards" โดยตรง ห้ามสร้างใหม่!`
  : `❌ ครูยังไม่ได้กำหนดมาตรฐาน/ตัวชี้วัด: 
   - ให้ใส่ standards เป็น array ว่าง []
   - เพิ่ม field "standardsWarning": "กรุณาให้ครูกำหนดมาตรฐานและตัวชี้วัดตามหลักสูตรแกนกลางด้วยตนเอง เนื่องจากต้องตรงกับเอกสารราชการ"
   - ห้ามสร้างมาตรฐาน/ตัวชี้วัดขึ้นมาเอง เพราะอาจไม่ตรงกับหลักสูตรแกนกลางจริง`}

⚠️ กฎสำคัญมาก - อ่านให้ครบ!
1. 1 แผน = 1 คาบ = 50 นาที เสมอ
2. ${totalHours} คาบ → ต้องมี ${totalHours} แผนทั้งหมด
3. ⭐ จำนวนหน่วย: ต้องมี ${minUnits}-${maxUnits} หน่วย (แนะนำ ${recommendedUnits} หน่วย)
4. ⭐ แต่ละหน่วย: ต้องมี 4-8 แผนเท่านั้น (ไม่เกิน 8 แผน!)
   - ถ้าหน่วยมีเนื้อหามาก ให้แบ่งเป็น 2 หน่วยย่อย
   - เช่น "หน่วยที่ 1: พื้นฐาน..." และ "หน่วยที่ 2: การประยุกต์..."

📋 งานของคุณ:
1. วิเคราะห์คำอธิบายรายวิชาและความสัมพันธ์ระหว่าง LO
2. ⭐ จัดกลุ่ม LO เป็นหน่วยการเรียนรู้ ${minUnits}-${maxUnits} หน่วย (แต่ละหน่วย 4-8 แผน)
3. ⚠️ ใช้มาตรฐาน/ตัวชี้วัดที่ครูกำหนดเท่านั้น (ถ้าไม่มี ให้เป็น array ว่างและเตือนครู)
4. วางกลยุทธ์ A.R.C.E. สำหรับรายวิชานี้
5. จัดสรรคาบให้แต่ละหน่วย (รวม = ${totalHours} คาบ, แต่ละหน่วย 4-8 คาบ)
6. สร้าง plansPreview ให้ครบตามจำนวนคาบของหน่วย

ตอบเป็น JSON format นี้เท่านั้น (ห้ามใส่ markdown wrapper):
{
  "totalUnits": ${recommendedUnits},
  "totalPlans": ${totalHours},
  "totalPeriods": ${totalHours},
  ${selectedStandards?.length > 0 
    ? `"standards": [/* ใช้มาตรฐาน/ตัวชี้วัดที่ครูกำหนดข้างต้น จัดรูปแบบเป็น: {"code": "ว X.X", "description": "...", "indicators": ["ว X.X ม.4/1", ...]} */]`
    : `"standards": [],
  "standardsWarning": "⚠️ กรุณาให้ครูกำหนดมาตรฐานและตัวชี้วัดตามหลักสูตรแกนกลาง พ.ศ. 2551 ด้วยตนเอง เนื่องจากข้อมูลต้องถูกต้องตรงตามเอกสารราชการ ระบบไม่สามารถสร้างให้อัตโนมัติได้"`},
  "arceStrategy": [
    {
      "dimension": "analysis",
      "icon": "🔍",
      "name": "การวิเคราะห์",
      "weight": 25,
      "focusAreas": "อธิบายบริบทเฉพาะของวิชาที่พัฒนาทักษะวิเคราะห์",
      "sampleQuestions": ["คำถามตัวอย่างที่ใช้พัฒนาทักษะวิเคราะห์ในวิชานี้ 1", "คำถามตัวอย่าง 2"],
      "activities": ["กิจกรรมที่ส่งเสริมการวิเคราะห์ 1", "กิจกรรม 2"],
      "unitsEmphasis": ["หน่วยที่เน้นมิตินี้"]
    },
    {
      "dimension": "reasoning",
      "icon": "🧠",
      "name": "การให้เหตุผล",
      "weight": 25,
      "focusAreas": "อธิบายบริบทเฉพาะของวิชาที่พัฒนาทักษะเหตุผล",
      "sampleQuestions": ["คำถามตัวอย่างที่ใช้พัฒนาทักษะเหตุผลในวิชานี้ 1", "คำถามตัวอย่าง 2"],
      "activities": ["กิจกรรมที่ส่งเสริมการให้เหตุผล 1", "กิจกรรม 2"],
      "unitsEmphasis": ["หน่วยที่เน้นมิตินี้"]
    },
    {
      "dimension": "creativity",
      "icon": "💡",
      "name": "ความคิดสร้างสรรค์",
      "weight": 25,
      "focusAreas": "อธิบายบริบทเฉพาะของวิชาที่พัฒนาทักษะสร้างสรรค์",
      "sampleQuestions": ["คำถามตัวอย่างที่ใช้พัฒนาทักษะสร้างสรรค์ในวิชานี้ 1", "คำถามตัวอย่าง 2"],
      "activities": ["กิจกรรมที่ส่งเสริมความคิดสร้างสรรค์ 1", "กิจกรรม 2"],
      "unitsEmphasis": ["หน่วยที่เน้นมิตินี้"]
    },
    {
      "dimension": "evidence",
      "icon": "📚",
      "name": "การใช้หลักฐาน",
      "weight": 25,
      "focusAreas": "อธิบายบริบทเฉพาะของวิชาที่พัฒนาทักษะใช้หลักฐาน",
      "sampleQuestions": ["คำถามตัวอย่างที่ใช้พัฒนาทักษะใช้หลักฐานในวิชานี้ 1", "คำถามตัวอย่าง 2"],
      "activities": ["กิจกรรมที่ส่งเสริมการใช้หลักฐาน 1", "กิจกรรม 2"],
      "unitsEmphasis": ["หน่วยที่เน้นมิตินี้"]
    }
  ],
  "unitsPreview": [
    {
      "name": "ชื่อหน่วย (ห้ามใส่ 'หน่วยที่ 1:' นำหน้า เพราะมีเลขลำดับแสดงอยู่แล้ว)",
      "periods": 6,
      "plans": 6,
      "los": ["LO1", "LO2"],
      "arceFocus": ["analysis", "reasoning"],
      "arceDistribution": {
        "analysis": "กิจกรรมวิเคราะห์ที่ใช้ในหน่วยนี้",
        "reasoning": "กิจกรรมให้เหตุผลที่ใช้ในหน่วยนี้",
        "creativity": "กิจกรรมสร้างสรรค์ที่ใช้ในหน่วยนี้",
        "evidence": "กิจกรรมใช้หลักฐานที่ใช้ในหน่วยนี้"
      },
      "plansPreview": [
        { 
          "topic": "ชื่อหัวข้อเนื้อหาแผนแรก", 
          "periods": 1, 
          "los": ["LO1"], 
          "arceFocus": "analysis",
          "uniqueKeyTopics": ["หัวข้อเฉพาะของแผนนี้ที่ไม่ซ้ำกับแผนอื่น 1", "หัวข้อเฉพาะ 2"]
        },
        { 
          "topic": "ชื่อหัวข้อเนื้อหาแผนที่สอง", 
          "periods": 1, 
          "los": ["LO1", "LO2"], 
          "arceFocus": "reasoning",
          "uniqueKeyTopics": ["หัวข้อเฉพาะของแผนนี้ที่ไม่ซ้ำกับแผนอื่น"]
        }
      ],
      "essentialContent": "สาระสำคัญของหน่วยนี้",
      "knowledgeScope": {
        "mustCover": ["เนื้อหาหลักที่ต้องสอนในหน่วยนี้เท่านั้น ห้ามซ้ำกับหน่วยอื่น"],
        "excludes": ["เนื้อหาที่ไม่รวมในหน่วยนี้ (สอนในหน่วยอื่น)"],
        "prerequisites": ["ความรู้ที่นักเรียนต้องมีก่อนเข้าเรียนหน่วยนี้"],
        "leadsTo": ["ความรู้จากหน่วยนี้จะนำไปใช้ในหน่วยไหน"]
      }
    }
  ],
  "assessmentStrategy": {
    "midterm": { "weight": 30, "type": "ข้อสอบ + ชิ้นงาน" },
    "final": { "weight": 30, "type": "ข้อสอบ + โปรเจค" },
    "continuous": { "weight": 40, "type": "ใบงาน + สังเกตพฤติกรรม + แบบฝึกหัด" }
  },
  "teachingStrategy": "อธิบายภาพรวมกลยุทธ์การสอนทั้งรายวิชา"
}

⚠️ สำคัญมาก - เงื่อนไขที่ต้องทำตาม:
1. ต้องมี ${minUnits}-${maxUnits} หน่วย (แนะนำ ${recommendedUnits} หน่วย)
2. แต่ละหน่วย periods: 4-8 เท่านั้น (ถ้าเนื้อหามาก ให้แบ่งหน่วย)
3. ผลรวม periods ของทุกหน่วย = ${totalHours} คาบ
4. plansPreview ต้องมีจำนวน = periods ของหน่วยนั้น`

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบหลักสูตรระดับพรีเมียม (Premium Curriculum Designer) เชี่ยวชาญ:
1. หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551 (ฉบับปรับปรุง 2560) อย่างลึกซึ้ง
2. มาตรฐานการเรียนรู้และตัวชี้วัดของทุกกลุ่มสาระ
3. สมรรถนะสำคัญ 5 ด้าน: สื่อสาร คิด แก้ปัญหา ทักษะชีวิต เทคโนโลยี
4. คุณลักษณะอันพึงประสงค์ 8 ประการ
5. การออกแบบย้อนกลับ (Backward Design)
6. การประเมินทักษะการคิดขั้นสูง A.R.C.E. (Analysis, Reasoning, Creativity, Evidence)
7. การจัดกลุ่ม Learning Outcomes อย่างมีประสิทธิภาพ
8. การกระจายน้ำหนักการประเมินตามมาตรฐาน

⭐ กฎสำคัญ: แต่ละหน่วยต้องมี 4-8 แผนเท่านั้น (ไม่เกิน 8 แผน!)
- ถ้าเนื้อหามาก ให้แบ่งเป็นหน่วยย่อย เช่น "หน่วยที่ 1: พื้นฐาน..." และ "หน่วยที่ 2: การประยุกต์..."
- สร้างหน่วยมากขึ้น ดีกว่าหน่วยน้อยแต่แผนเยอะ

🎯 หลักการสร้างโครงสร้างแบบ Premium Quality:

📐 กฎ "Content Mapping Matrix" (ป้องกันเนื้อหาซ้ำ 100%):
1. ก่อนออกแบบหน่วยใดๆ ให้สร้าง "แผนที่เนื้อหา" ในใจ โดยแบ่งเนื้อหาทั้งหมดเป็นก้อนๆ แยกกัน
2. แต่ละหน่วยต้องมี "พื้นที่เนื้อหาเฉพาะ" (Exclusive Content Territory) ที่ไม่ทับซ้อนกับหน่วยอื่น
3. ใช้หลัก MECE (Mutually Exclusive, Collectively Exhaustive):
   - ME: ทุกหน่วยต้องไม่มีเนื้อหาซ้ำกัน
   - CE: รวมทุกหน่วยต้องครอบคลุมเนื้อหาทั้งหมด

📊 โครงสร้างการแบ่งหน่วยแบบ Premium:
- หน่วยที่ 1-2: พื้นฐาน/นิยาม/ทฤษฎีหลัก (Foundation)
- หน่วยกลาง: การวิเคราะห์/การประยุกต์เฉพาะด้าน (Specialization)
- หน่วยท้าย: การบูรณาการ/สรุป/โปรเจค (Integration)

🔒 กฎเข้มงวดป้องกันเนื้อหาซ้ำ:
1. แต่ละหน่วยต้องมี knowledgeScope.mustCover ที่เป็น "เนื้อหาเฉพาะ" ไม่ใช่ "เนื้อหาทั่วไป"
   - ❌ ไม่ดี: "การเรียนรู้พื้นฐาน", "แนวคิดสำคัญ"
   - ✅ ดี: "กฎของนิวตัน 3 ข้อ", "สมการการเคลื่อนที่"
2. แต่ละแผนต้องมี uniqueKeyTopics ที่ระบุ "เนื้อหาเฉพาะแผนนี้เท่านั้น"
   - ❌ ไม่ดี: "ทบทวนเนื้อหา", "ต่อยอดความรู้"
   - ✅ ดี: "การคำนวณแรงโน้มถ่วง", "กราฟความเร่ง-เวลา"
3. ถ้าสองหน่วย/แผนเกี่ยวข้องกัน ต้องระบุความสัมพันธ์ใน prerequisites และ leadsTo

📌 สำหรับรายวิชาพื้นฐาน: ต้องยึดมาตรฐาน/ตัวชี้วัดตามหลักสูตรแกนกลางอย่างเคร่งครัด
📌 สำหรับรายวิชาเพิ่มเติม: สามารถออกแบบเนื้อหาและตัวชี้วัดได้ตามความเหมาะสม

ตอบเป็นภาษาไทยและ JSON format เท่านั้น ห้ามใช้ markdown wrapper`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })

      const responseText = completion.choices[0].message.content
      let result
      try {
        let cleanedText = responseText.trim()
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        result = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse course structure:', responseText)
        return res.status(500).send({ error: 'Failed to parse AI response' })
      }

      return res.status(200).send({ success: true, structure: result })

    } catch (error) {
      console.error('❌ Error generating course structure:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Generate Learning Unit - Phase 2
 * Creates detailed unit structure with lesson plans outline
 */
exports.generateLearningUnit = functions.runWith({ 
  timeoutSeconds: 180,
  memory: '1GB',
  secrets: [openaiApiKey]
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { 
        courseId, courseCode, courseName, courseDescription,
        allLearningOutcomes, unitIndex, unitName, unitHours, unitPeriods,
        planCount, targetLOs, courseStructure, settings,
        // ข้อมูลหลักสูตรแกนกลาง
        courseType, selectedStandards, keyCompetencies, desiredCharacteristics
      } = req.body

      const periods = unitPeriods || unitHours || 4 // 1 คาบ = 50 นาที
      // สำคัญ: 1 แผน = 1 คาบ (50 นาที) เสมอ
      const numberOfPlans = periods
      
      // ข้อมูลหลักสูตรแกนกลาง
      const isBasicCourse = courseType === 'basic'

      if (!courseId || !unitName || !targetLOs?.length) {
        return res.status(400).send({ 
          error: 'Missing required fields' 
        })
      }

      if (!openai) {
        return res.status(500).send({ error: 'OpenAI not configured' })
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
      
      // Get relevant LO descriptions
      const relevantLOs = allLearningOutcomes
        .filter(lo => targetLOs.includes(lo.code))
        .map(lo => `${lo.code}: ${lo.description}`)
        .join('\n')

      const prompt = `ออกแบบรายละเอียดหน่วยการเรียนรู้:

📚 ข้อมูลรายวิชา:
- รหัส: ${courseCode} ${courseName}
- คำอธิบาย: ${courseDescription || 'ไม่มี'}
- ประเภทรายวิชา: ${isBasicCourse ? '📘 รายวิชาพื้นฐาน (ต้องเคร่งครัดตามหลักสูตรแกนกลาง)' : '📗 รายวิชาเพิ่มเติม'}

📋 ข้อมูลตามหลักสูตรแกนกลาง:
${selectedStandards?.length > 0 ? `- มาตรฐานที่เกี่ยวข้อง: ${selectedStandards.join(', ')}` : ''}
${keyCompetencies?.length > 0 ? `- สมรรถนะสำคัญ: ${keyCompetencies.join(', ')}` : ''}
${desiredCharacteristics?.length > 0 ? `- คุณลักษณะอันพึงประสงค์: ${desiredCharacteristics.join(', ')}` : ''}

📦 หน่วยการเรียนรู้ที่ ${unitIndex + 1}: ${unitName}
- จำนวนคาบ: ${periods} คาบ (1 คาบ = 50 นาที)
- จำนวนแผนการสอน: ${numberOfPlans} แผน (สำคัญ: 1 แผน = 1 คาบ = 50 นาที)
- Learning Outcomes ที่เกี่ยวข้อง:
${relevantLOs}

🚫 เนื้อหาจากหน่วยอื่นที่ห้ามซ้ำ (ถ้ามี):
${courseStructure?.unitsPreview?.filter((u, i) => i !== unitIndex).map((u, i) => 
  `- หน่วยที่ ${i + 1 >= unitIndex ? i + 2 : i + 1} "${u.name}": ${u.knowledgeScope?.mustCover?.join(', ') || u.essentialContent || 'ไม่มีข้อมูล'}`
).join('\n') || 'ไม่มีหน่วยอื่น'}

🎯 กลยุทธ์ A.R.C.E. ของรายวิชา:
${JSON.stringify(courseStructure?.arceStrategy || [], null, 2)}
${isBasicCourse ? '\n⚠️ เนื่องจากเป็นรายวิชาพื้นฐาน ให้ออกแบบกิจกรรมให้สอดคล้องกับมาตรฐาน/ตัวชี้วัดตามหลักสูตรแกนกลางอย่างเคร่งครัด' : ''}

📋 งานของคุณ:
1. เขียนสาระสำคัญของหน่วยนี้
2. ออกแบบแผนการจัดการเรียนรู้ จำนวน ${numberOfPlans} แผน (สำคัญ: ต้องสร้างให้ครบ ${numberOfPlans} แผน)
3. กำหนด LO ที่จะประเมินในแต่ละแผน
4. วางลำดับเนื้อหาจากง่ายไปยาก
5. เชื่อมโยงกิจกรรมให้ต่อเนื่อง (แผนที่ 2 ต่อจากแผนที่ 1, แผนที่ 3 ต่อจากแผนที่ 2 ...)
6. ทุกแผน = 1 คาบ (50 นาที) เสมอ
7. ⚠️ ห้ามซ้ำเนื้อหากับหน่วยอื่น ให้ระบุ uniqueKeyTopics สำหรับแต่ละแผน

ตอบเป็น JSON (ห้าม markdown wrapper):
{
  "name": "${unitName}",
  "periods": ${periods},
  "planCount": ${numberOfPlans},
  "essentialContent": "สาระสำคัญของหน่วย (3-5 ประโยค อธิบายว่าหน่วยนี้นักเรียนจะเรียนรู้อะไร)",
  "knowledgeScope": {
    "mustCover": ["เนื้อหาหลักที่ต้องสอนในหน่วยนี้เท่านั้น ห้ามซ้ำกับหน่วยอื่น"],
    "excludes": ["เนื้อหาที่ไม่รวมในหน่วยนี้ (สอนในหน่วยอื่น)"],
    "prerequisites": ["ความรู้ที่นักเรียนต้องมีก่อนเข้าเรียนหน่วยนี้"]
  },
  "learningObjectives": {
    "knowledge": ["จุดประสงค์ด้าน K 1", "จุดประสงค์ด้าน K 2"],
    "process": ["จุดประสงค์ด้าน P 1", "จุดประสงค์ด้าน P 2"],
    "attitude": ["จุดประสงค์ด้าน A 1"]
  },
  "los": ${JSON.stringify(targetLOs)},
  "plans": [
    // สำคัญ: ต้องมีทั้งหมด ${numberOfPlans} แผน! (1 แผน = 1 คาบ = 50 นาที)
    // ห้ามใส่ "แผนที่ 1:", "แผนที่ 2:" นำหน้า topic เพราะมีเลขลำดับแสดงอยู่แล้ว
    {
      "topic": "ชื่อหัวข้อเนื้อหาโดยตรง (ไม่ต้องมี 'แผนที่ 1:' นำหน้า)",
      "periods": 1,
      "los": ["LO code ที่เกี่ยวข้อง"],
      "uniqueKeyTopics": ["เนื้อหาเฉพาะของแผนนี้ที่ไม่ซ้ำกับแผนอื่น 1", "เนื้อหาเฉพาะ 2"],
      "arce": {
        "analysis": "กิจกรรม/คำถามพัฒนาทักษะการวิเคราะห์",
        "reasoning": "กิจกรรม/คำถามพัฒนาทักษะการให้เหตุผล",
        "creativity": "กิจกรรม/คำถามพัฒนาทักษะการคิดสร้างสรรค์",
        "evidence": "กิจกรรม/คำถามพัฒนาทักษะการใช้หลักฐาน"
      },
      "arceFocus": "ด้านที่เน้นมากที่สุดตามบริบทเนื้อหา (analysis/reasoning/creativity/evidence)",
      "activities5E": {
        "engagement": "กิจกรรมขั้นนำ",
        "exploration": "กิจกรรมสำรวจ",
        "explanation": "กิจกรรมอธิบาย",
        "elaboration": "กิจกรรมขยายความ",
        "evaluation": "กิจกรรมประเมิน"
      },
      "status": "pending"
    },
    // แผนที่ 2, 3, ... จนครบ ${numberOfPlans} แผน (แต่ละแผนต้องมี uniqueKeyTopics ที่ไม่ซ้ำกัน!)
  ],
  "assessmentPlan": {
    "formative": ["วิธีการประเมินระหว่างเรียน"],
    "summative": ["วิธีการประเมินสรุป"]
  },
  "materialsNeeded": ["อุปกรณ์/สื่อที่ต้องเตรียม"]
}

สำคัญมาก - ต้องปฏิบัติตามอย่างเคร่งครัด: 
1. ⚠️ ต้องสร้าง plans array ให้มี ${numberOfPlans} รายการครบถ้วน! ห้ามขาด!
2. ทุกแผน periods: 1 เสมอ (1 แผน = 1 คาบ = 50 นาที)
3. ทุกแผนต้องมี arce ครบ 4 ด้าน (analysis, reasoning, creativity, evidence)
4. arceFocus กระจายให้สมดุล: แผนแรกๆ เน้น analysis, แผนกลาง เน้น reasoning/evidence, แผนท้าย เน้น creativity
5. หัวข้อแผนต้องต่อเนื่องกัน: แผน 1 → แผน 2 → แผน 3 → ... → แผน ${numberOfPlans}
6. ถ้า ${numberOfPlans} คาบ ต้องสร้าง ${numberOfPlans} แผน ห้ามน้อยกว่านี้!`

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: `คุณเป็นผู้เชี่ยวชาญการออกแบบหน่วยการเรียนรู้ระดับพรีเมียม (Premium Unit Designer) เข้าใจ:
1. การจัดลำดับเนื้อหาจากง่ายไปยาก (Scaffolding)
2. การเชื่อมโยงแผนการสอนให้ต่อเนื่อง - แผนที่ 2 ต่อจากแผนที่ 1, แผนที่ 3 ต่อจากแผนที่ 2
3. A.R.C.E. Framework - ทุกแผนต้องมีครบ 4 ด้าน:
   - Analysis: วิเคราะห์ แยกแยะ เปรียบเทียบ
   - Reasoning: ให้เหตุผล อธิบาย สรุป
   - Creativity: สร้างสรรค์ ออกแบบ คิดนอกกรอบ
   - Evidence: ใช้หลักฐาน ข้อมูล พิสูจน์
4. การออกแบบกิจกรรม 5E Model

⚠️ กฎสำคัญมาก: 
- 1 แผน = 1 คาบ = 50 นาที เสมอ (ทุกแผน periods: 1)
- N คาบ = N แผน (ถ้า 3 คาบ ต้องสร้าง 3 แผน)
- แผนต้องเรียงลำดับต่อเนื่อง: แผน 1 (เนื้อหาพื้นฐาน) → แผน 2 (ต่อยอด) → แผน 3 (สรุป/ประยุกต์)
- ทุกแผนต้องมี arce ครบ 4 ด้าน พร้อมกิจกรรม/คำถามเฉพาะ
- กระจาย arceFocus ให้สมดุล: แผน 1 เน้น A, แผน 2 เน้น R/E, แผน 3 เน้น C

🎯 หลักการสร้างแผนแบบ Premium Quality:

📐 กฎ "Plan Content Mapping" (ป้องกันเนื้อหาซ้ำ 100%):
1. ก่อนออกแบบแผนใดๆ ให้สร้าง "แผนที่เนื้อหา" โดยแบ่งเนื้อหาของหน่วยเป็นก้อนๆ ตามจำนวนแผน
2. แต่ละแผนต้องมี "พื้นที่เนื้อหาเฉพาะ" (Exclusive Content) ที่ไม่ทับซ้อนกับแผนอื่น
3. ใช้หลัก "Sequential Learning Path":
   - แผนที่ 1: นิยาม/พื้นฐาน → แผนที่ 2: การวิเคราะห์ → แผนที่ 3: การประยุกต์ → แผนท้าย: สรุป/สังเคราะห์

🔒 กฎเข้มงวดป้องกันเนื้อหาซ้ำ:
1. แต่ละแผนต้องมี uniqueKeyTopics ที่เป็น "เนื้อหาเฉพาะแผนนี้เท่านั้น"
   - ❌ ไม่ดี: "ทบทวนเนื้อหา", "ความรู้พื้นฐาน", "ต่อยอดความรู้"
   - ✅ ดี: "การหาพื้นที่วงกลมด้วยสูตร πr²", "การเปรียบเทียบพื้นที่รูปทรงต่างๆ"
2. uniqueKeyTopics ต้องเป็น "หัวข้อเฉพาะ" ไม่ใช่ "กิจกรรมทั่วไป"
3. ห้ามใช้คำว่า "ต่อ", "ต่อยอด", "ทบทวน" เพียงอย่างเดียว ต้องระบุเนื้อหาชัดเจน
4. เมื่อได้รับข้อมูลหน่วยอื่น ห้ามสร้างเนื้อหาซ้ำกับหน่วยเหล่านั้นโดยเด็ดขาด

📊 รูปแบบ Topic ที่ดี:
- ระบุ "สิ่งที่นักเรียนจะทำได้" หลังเรียนแผนนี้
- ใช้คำกริยาที่วัดได้: คำนวณ, วาด, เปรียบเทียบ, อธิบาย, ออกแบบ
- ตัวอย่าง: "การคำนวณเส้นรอบวง" (ไม่ใช่ "เรื่องเส้นรอบวง")

ตอบเป็นภาษาไทย JSON เท่านั้น ห้ามใช้ markdown wrapper`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })

      const responseText = completion.choices[0].message.content
      let result
      try {
        let cleanedText = responseText.trim()
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        result = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse learning unit:', responseText)
        return res.status(500).send({ error: 'Failed to parse AI response' })
      }

      // ตรวจสอบว่า plans ครบตามจำนวนคาบหรือไม่
      if (!result.plans || result.plans.length < numberOfPlans) {
        const existingCount = result.plans?.length || 0
        console.log(`⚠️ AI สร้างแผนไม่ครบ: ได้ ${existingCount}/${numberOfPlans} แผน`)
        
        if (!result.plans) result.plans = []
        
        // ถ้าขาดมากกว่า 5 แผน แสดงว่าหน่วยใหญ่เกินไป ควรแจ้งเตือน
        const missingCount = numberOfPlans - existingCount
        if (missingCount > 5) {
          console.log(`⚠️ หน่วยนี้มี ${numberOfPlans} คาบ ซึ่งมากเกินไป แนะนำให้แบ่งเป็นหน่วยย่อย`)
        }
        
        // สร้างชื่อแผนที่สมเหตุสมผลโดยดูจาก pattern ของแผนก่อนหน้า
        const getSmartTopicName = (planNum, existingPlans, unitName) => {
          // ดูว่าเหลือกี่แผนจากท้าย
          const remainingFromEnd = numberOfPlans - planNum + 1
          
          if (remainingFromEnd === 1) {
            return `สรุปและประเมินผล${unitName ? ': ' + unitName : ''}`
          } else if (remainingFromEnd === 2) {
            return `การนำเสนอและแลกเปลี่ยนเรียนรู้`
          } else if (remainingFromEnd === 3) {
            return `การประยุกต์ใช้ความรู้`
          } else if (remainingFromEnd <= 5) {
            return `กิจกรรมเสริมและฝึกปฏิบัติ (${planNum})`
          } else {
            // ดูจากแผนก่อนหน้าว่ามี pattern อะไร
            if (existingPlans.length > 0) {
              const lastTopic = existingPlans[existingPlans.length - 1].topic
              return `${lastTopic} (ต่อ) - ส่วนที่ ${planNum - existingCount + 1}`
            }
            return `เนื้อหาเพิ่มเติม (${planNum})`
          }
        }
        
        // เติมแผนที่ขาดให้ครบ
        while (result.plans.length < numberOfPlans) {
          const planNum = result.plans.length + 1
          const arceFocusOptions = ['analysis', 'reasoning', 'creativity', 'evidence']
          const focusIndex = (planNum - 1) % 4
          
          result.plans.push({
            topic: getSmartTopicName(planNum, result.plans.slice(0, existingCount), unitName),
            periods: 1,
            los: targetLOs,
            arce: {
              analysis: 'วิเคราะห์เนื้อหาและสถานการณ์ที่เกี่ยวข้อง',
              reasoning: 'อธิบายเหตุผลและความเชื่อมโยง',
              creativity: 'ออกแบบหรือสร้างสรรค์ผลงาน',
              evidence: 'รวบรวมและใช้หลักฐานสนับสนุน'
            },
            arceFocus: arceFocusOptions[focusIndex],
            status: 'pending'
          })
        }
        
        console.log(`✅ เติมแผนครบแล้ว: ${result.plans.length} แผน`)
      }
      
      // ตรวจสอบให้ทุกแผน periods = 1
      result.plans = result.plans.map(plan => ({
        ...plan,
        periods: 1,
        status: plan.status || 'pending'
      }))
      
      // เพิ่ม warning ถ้าหน่วยใหญ่เกินไป
      if (numberOfPlans > 10) {
        result.warning = `หน่วยนี้มี ${numberOfPlans} แผน ซึ่งค่อนข้างมาก แนะนำให้พิจารณาแบ่งเป็นหน่วยย่อย (ประมาณ 4-8 แผนต่อหน่วย)`
      }

      return res.status(200).send({ success: true, unit: result })

    } catch (error) {
      console.error('❌ Error generating learning unit:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

// ==========================================
// ELECTRONIC WORKSHEET SYSTEM
// ระบบใบงานอิเล็กทรอนิกส์ที่ยืดหยุ่นตามบริบทแผนการสอน
// ==========================================

/**
 * Generate Electronic Worksheet from Lesson Plan
 * สร้างใบงานอิเล็กทรอนิกส์อัจฉริยะจากแผนการสอน 5E + A.R.C.E.
 * - วิเคราะห์กิจกรรม 5E อย่างละเอียด
 * - สร้างคำถามตาม A.R.C.E. Framework
 * - ปรับตามบริบทและเนื้อหาของแต่ละแผน
 */
exports.generateElectronicWorksheet = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 180,
  memory: '1GB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const {
        lessonPlanId,
        teacherId,
        // Lesson Plan Data
        lessonPlan,
        // Course Info
        courseId,
        courseCode,
        courseName,
        gradeLevel,
        // Unit Info
        unitNumber,
        unitName,
        planNumber,
        topic,
        // Activities 5E
        activities,
        // Learning Outcomes
        objectives,
        learningOutcomes,
        // A.R.C.E. Configuration
        arceFocus,
        arceWeights,
        // Options
        worksheetType, // 'comprehensive' | 'analysis' | 'creativity' | 'quick'
        targetPhases,  // ['engagement', 'exploration', ...] for phase-specific
        duration,
        difficulty, // 'easy' | 'medium' | 'hard' | 'mixed'
        questionCount, // Number of questions to generate
        questionTypes, // ['multiple_choice', 'short_answer', 'essay', 'matching']
        includeReflection, // Include self-reflection section
        includeRubric, // Include scoring rubric display
        // Room Assignment
        roomName,
        roomDescription,
        createRoom, // Whether to create a new room
        roomId // Existing room ID to add worksheet to
      } = req.body

      if (!lessonPlanId && !lessonPlan) {
        return res.status(400).send({
          error: 'Missing required: lessonPlanId or lessonPlan data'
        })
      }

      if (!openai) {
        return res.status(500).send({ error: 'OpenAI not configured' })
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

      // Load lesson plan if ID provided
      let planData = lessonPlan
      if (lessonPlanId && !lessonPlan) {
        const planDoc = await db.collection('lessonPlans').doc(lessonPlanId).get()
        if (!planDoc.exists) {
          return res.status(404).send({ error: 'Lesson plan not found' })
        }
        planData = { id: planDoc.id, ...planDoc.data() }
      }

      // Extract activities from plan content or direct input
      const planContent = planData.content || planData
      const activities5E = activities || planContent.activities || {}
      const planObjectives = objectives || planContent.objectives || {}
      const planLOs = learningOutcomes || planContent.targetLOs || []
      const planArce = arceFocus || planContent.arceFocus || ['analysis', 'reasoning', 'creativity', 'evidence']

      // Build comprehensive context for AI
      const activitiesContext = buildActivitiesContext(activities5E)
      const objectivesContext = buildObjectivesContext(planObjectives)
      const arceContext = buildArceContext(planArce, arceWeights)

      // Build difficulty instructions
      const difficultyInstructions = {
        easy: 'คำถามง่าย เหมาะกับผู้เรียนเริ่มต้น มีตัวอย่างและคำแนะนำช่วย',
        medium: 'คำถามปานกลาง ท้าทายพอดี ต้องใช้การวิเคราะห์',
        hard: 'คำถามยาก ต้องคิดวิเคราะห์เชิงลึก มีสถานการณ์ซับซ้อน',
        mixed: 'ผสมผสานหลายระดับ เริ่มจากง่ายไปยาก'
      }

      // Build worksheet type instructions
      const typeInstructions = {
        comprehensive: 'ครอบคลุมทุกมิติ A.R.C.E. อย่างสมดุล',
        analysis: 'เน้นการวิเคราะห์ (Analysis) เป็นหลัก มีคำถามเชิงวิเคราะห์มาก',
        creativity: 'เน้นความคิดสร้างสรรค์ (Creativity) มีคำถามให้ออกแบบ/สร้างสรรค์',
        quick: 'คำถามสั้นกระชับ ทำได้เร็ว เน้นความเข้าใจพื้นฐาน'
      }

      // Build question types instructions
      const qTypes = questionTypes || ['multiple_choice', 'short_text', 'open_ended']
      const questionTypeLabels = {
        multiple_choice: 'ปรนัย (4 ตัวเลือก)',
        short_text: 'ตอบสั้น (20-100 ตัวอักษร)',
        open_ended: 'อัตนัย/เรียงความ (100+ ตัวอักษร)',
        table: 'ตาราง (กรอกข้อมูลในตาราง)'
      }
      const allowedTypes = qTypes.map(t => questionTypeLabels[t] || t).join(', ')

      const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบใบงานอิเล็กทรอนิกส์สำหรับการเรียนการสอน

📚 ข้อมูลแผนการสอน:
- รายวิชา: ${courseCode || ''} ${courseName || ''}
- ระดับชั้น: ${gradeLevel || 'ม.4'}
- หน่วยที่ ${unitNumber || 1}: ${unitName || ''}
- แผนที่ ${planNumber || 1}: ${topic || planData.topic || ''}
- ระยะเวลา: ${duration || 50} นาที

🎯 จุดประสงค์การเรียนรู้:
${objectivesContext}

📖 Learning Outcomes:
${planLOs.map(lo => `- ${lo}`).join('\n') || 'ตามจุดประสงค์ที่กำหนด'}

🔄 กิจกรรมการเรียนรู้ 5E:
${activitiesContext}

✨ A.R.C.E. Framework:
${arceContext}

📋 การตั้งค่าใบงาน:
- ประเภท: ${typeInstructions[worksheetType] || typeInstructions.comprehensive}
- จำนวนคำถาม: ${questionCount || 8} ข้อ
- ระดับความยาก: ${difficultyInstructions[difficulty] || difficultyInstructions.mixed}
- รูปแบบคำถามที่ใช้ได้: ${allowedTypes}
${includeReflection !== false ? '- รวมคำถาม Self-Reflection ท้ายใบงาน' : ''}
${includeRubric !== false ? '- แสดงเกณฑ์การให้คะแนนในแต่ละข้อ' : ''}

กรุณาสร้างใบงานอิเล็กทรอนิกส์ที่:
1. สอดคล้องกับกิจกรรม 5E ที่กำหนดในแผน
2. ${typeInstructions[worksheetType] || 'ครอบคลุม A.R.C.E. Framework ทั้ง 4 ด้าน'}
3. ⚠️ มีคำถามรวมทั้งหมดเท่ากับ ${questionCount || 8} ข้อเท่านั้น (ห้ามเกิน ห้ามน้อยกว่า)
4. มีบริบท/กรณีศึกษาประกอบคำถามเพื่อกระตุ้นการคิด
5. ${difficultyInstructions[difficulty] || 'ผสมผสานหลายระดับความยาก'}
6. เหมาะสมกับระดับชั้น ${gradeLevel || 'ม.4'}

ตอบเป็น JSON (ห้าม markdown wrapper):
{
  "metadata": {
    "title": "ชื่อใบงาน (กระชับ ไม่ต้องมี 'ใบงานที่' นำหน้า)",
    "description": "คำอธิบายใบงาน 1-2 ประโยค",
    "lessonPlanId": "${lessonPlanId || ''}",
    "courseId": "${courseId || ''}",
    "courseName": "${courseName || ''}",
    "gradeLevel": "${gradeLevel || 'ม.4'}",
    "unitNumber": ${unitNumber || 1},
    "unitName": "${unitName || ''}",
    "planNumber": ${planNumber || 1},
    "topic": "${topic || ''}",
    "duration": ${duration || 50},
    "totalQuestions": ${questionCount || 8},
    "maxScore": 0,
    "arceFocus": ${JSON.stringify(planArce)},
    "arceWeights": {
      "analysis": ${arceWeights?.analysis || 25},
      "reasoning": ${arceWeights?.reasoning || 25},
      "creativity": ${arceWeights?.creativity || 25},
      "evidence": ${arceWeights?.evidence || 25}
    }
  },
  "instructions": "คำชี้แจงการทำใบงาน (2-3 ประโยค)",
  "settings": {
    "shuffleQuestions": false,
    "shuffleOptions": true,
    "showHints": true,
    "blockCopyPaste": true,
    "timeLimit": ${duration || 50},
    "allowLateSubmission": false
  },
  "sections": [
    // สร้าง 1-2 section ที่มีคำถามรวมกัน = ${questionCount || 8} ข้อ
    // ตัวอย่างโครงสร้าง section:
    {
      "id": "section_1",
      "title": "ส่วนที่ 1: ชื่อส่วน",
      "description": "คำอธิบาย",
      "phase": "engagement|exploration|explanation|elaboration|evaluation",
      "arceFocus": ["analysis"],
      "questions": [
        // คำถาม open_ended
        {
          "id": "q1",
          "number": 1,
          "type": "open_ended",
          "prompt": "คำถาม",
          "context": "บริบท (ถ้ามี)",
          "arceFocus": "analysis|reasoning|creativity|evidence",
          "bloomLevel": "analyze|understand|apply|create|evaluate",
          "required": true,
          "minCharacters": 50,
          "maxScore": 5,
          "rubric": { "5": "...", "4": "...", "3": "...", "2": "...", "1": "...", "0": "..." },
          "hints": ["คำแนะนำ"]
        },
        // คำถาม multiple_choice
        {
          "id": "q2",
          "number": 2,
          "type": "multiple_choice",
          "prompt": "คำถาม",
          "arceFocus": "analysis",
          "options": [
            { "id": "a", "text": "ตัวเลือก ก" },
            { "id": "b", "text": "ตัวเลือก ข" },
            { "id": "c", "text": "ตัวเลือก ค" },
            { "id": "d", "text": "ตัวเลือก ง" }
          ],
          "correctAnswer": "a",
          "maxScore": 1
        },
        // คำถาม table
        {
          "id": "q3",
          "number": 3,
          "type": "table",
          "prompt": "บันทึกข้อมูล",
          "arceFocus": "evidence",
          "required": true,
          "table": { "headers": ["หัวข้อ 1", "หัวข้อ 2"], "rows": 3, "editable": true },
          "maxScore": 5
        }
      ]
    }
  ],
  "selfReflection": {
    "enabled": ${includeReflection !== false},
    "prompt": "สะท้อนความคิดจากการทำใบงาน",
    "questions": ["สิ่งที่ได้เรียนรู้...", "จะนำไปใช้อย่างไร..."]
  },
  "scoring": {
    "totalPoints": 0,
    "passingScore": 0,
    "arceDistribution": {}
  },
  "assessmentCriteria": {
    "paStandard": {
      "level1": "ระดับ 1: ต้องปรับปรุง (0-39%)",
      "level2": "ระดับ 2: พอใช้ (40-59%)",
      "level3": "ระดับ 3: ดี (60-79%)",
      "level4": "ระดับ 4: ดีมาก (80-100%)"
    }
  }
}

⚠️ ข้อกำหนดสำคัญ (ต้องปฏิบัติตามอย่างเคร่งครัด):
1. ⚠️ จำนวนคำถามต้องเท่ากับ ${questionCount || 8} ข้อเท่านั้น (นับทุกคำถามในทุก section รวมกัน)
2. ไม่จำเป็นต้องมีครบทุกขั้น 5E - สร้าง section เฉพาะที่จำเป็นตามจำนวนคำถาม
3. กระจาย arceFocus ให้ครอบคลุม A.R.C.E. ตามที่กำหนด
4. type ของคำถาม ใช้ได้เฉพาะ: ${qTypes.join(', ')}
   - multiple_choice: มี options 4 ตัวเลือก (a,b,c,d) และ correctAnswer
   - short_text: minCharacters: 20-100
   - open_ended: minCharacters: 100+ พร้อม rubric
   - table: มี table.headers, table.rows, table.editable: true
5. ทุกคำถาม open_ended ต้องมี rubric และ hints
6. metadata.totalQuestions = ${questionCount || 8} (ต้องตรงกับจำนวนที่ระบุ)
7. ทุก question ต้องมี id ที่ไม่ซ้ำกัน (q1, q2, q3...)`

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: `คุณเป็นผู้เชี่ยวชาญออกแบบใบงานอิเล็กทรอนิกส์ที่:
1. เข้าใจ 5E Model และ A.R.C.E. Framework อย่างลึกซึ้ง
2. สร้างคำถามที่กระตุ้นทักษะคิดขั้นสูง (HOTS)
3. ออกแบบ form ที่ใช้งานง่าย หลากหลายรูปแบบ
4. สร้าง rubric ที่ชัดเจนสำหรับการประเมิน
5. ⚠️ ปฏิบัติตามจำนวนคำถามที่ระบุอย่างเคร่งครัด ห้ามสร้างเกินหรือน้อยกว่า
ตอบเป็นภาษาไทยและ JSON เท่านั้น`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })

      const responseText = completion.choices[0].message.content
      let worksheetData
      try {
        let cleanedText = responseText.trim()
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        worksheetData = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse worksheet JSON:', responseText)
        return res.status(500).send({ error: 'Failed to parse AI response' })
      }

      // Validate and fix metadata
      worksheetData.metadata = {
        ...worksheetData.metadata,
        lessonPlanId: lessonPlanId || null,
        courseId: courseId || null,
        teacherId: teacherId || null,
        createdAt: new Date().toISOString(),
        // 🎯 Store Learning Outcomes for assessment
        learningOutcomes: (planLOs || []).map((lo, idx) => {
          // Handle both string and object formats
          if (typeof lo === 'string') {
            return { loCode: `LO${idx + 1}`, loDescription: lo }
          }
          return {
            loCode: lo.loCode || lo.code || `LO${idx + 1}`,
            loDescription: lo.loDescription || lo.description || lo
          }
        })
      }

      // Calculate totals
      let totalQuestions = 0
      let maxScore = 0
      worksheetData.sections.forEach(section => {
        section.questions.forEach(q => {
          totalQuestions++
          maxScore += q.maxScore || 0
        })
      })
      worksheetData.metadata.totalQuestions = totalQuestions
      worksheetData.metadata.maxScore = maxScore
      worksheetData.scoring.totalPoints = maxScore

      // Handle Room Assignment
      let finalRoomId = null
      
      // Option 1: Use existing room ID provided
      if (roomId) {
        finalRoomId = roomId
        console.log(`✅ Using provided room ID: ${roomId}`)
      }
      // Option 2: Create room automatically or find existing for course
      else if (createRoom !== false && (roomName || roomDescription || courseId)) {
        // First, check if a room already exists for this course and teacher
        if (courseId && teacherId) {
          const existingRoomQuery = await db.collection('learningRooms')
            .where('courseId', '==', courseId)
            .where('teacherId', '==', teacherId)
            .limit(1)
            .get()
          
          if (!existingRoomQuery.empty) {
            // Use existing room
            finalRoomId = existingRoomQuery.docs[0].id
            console.log(`✅ Found existing room ${finalRoomId} for course ${courseId}`)
          }
        }
        
        // If no existing room, create a new one
        if (!finalRoomId) {
          // Build unique room name from course info
          let uniqueRoomName = roomName
          if (!uniqueRoomName) {
            if (courseCode && courseName) {
              uniqueRoomName = `${courseCode} - ${courseName}`
            } else if (courseName) {
              uniqueRoomName = courseName
            } else if (courseCode) {
              uniqueRoomName = `รายวิชา ${courseCode}`
            } else {
              uniqueRoomName = `ห้องกิจกรรม: ${topic || worksheetData.metadata.title}`
            }
          }
          
          const roomRef = await db.collection('learningRooms').add({
            name: uniqueRoomName,
            description: roomDescription || `ห้องกิจกรรมการเรียนรู้สำหรับวิชา ${courseName || topic}`,
            courseId: courseId || null,
            courseCode: courseCode || null,
            courseName: courseName || null,
            topic: topic || worksheetData.metadata.title,
            gradeLevel: gradeLevel || null,
            lessonPlanId: lessonPlanId || null,
            teacherId: teacherId || null,
            worksheetIds: [],
            status: 'published', // Published immediately so students can access
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          })
          finalRoomId = roomRef.id
          console.log(`✅ Created new room ${finalRoomId} for course ${courseId}`)
        }
      }

      // Save worksheet to Firestore
      const worksheetRef = await db.collection('eWorksheets').add({
        ...worksheetData,
        // Top-level fields for easier querying
        teacherId: teacherId || null,
        courseId: courseId || null,
        courseCode: courseCode || null,
        courseName: courseName || null,
        lessonPlanId: lessonPlanId || null,
        title: worksheetData.metadata?.title || topic || 'ใบงานไม่มีชื่อ',
        gradeLevel: gradeLevel || null,
        roomId: finalRoomId,
        status: 'draft',
        stats: {
          totalSubmitted: 0,
          averageScore: 0,
          passRate: 0
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      // Update room with worksheet ID
      if (finalRoomId) {
        await db.collection('learningRooms').doc(finalRoomId).update({
          worksheetIds: admin.firestore.FieldValue.arrayUnion(worksheetRef.id),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      // Log AI usage
      await db.collection('aiUsageLogs').add({
        teacherId,
        feature: 'generateElectronicWorksheet',
        lessonPlanId,
        model,
        tokensUsed: completion.usage?.total_tokens || 0,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      })

      return res.status(200).send({
        success: true,
        worksheetId: worksheetRef.id,
        roomId: finalRoomId,
        totalQuestions: totalQuestions,
        maxScore: maxScore,
        worksheet: worksheetData
      })

    } catch (error) {
      console.error('❌ Error generating electronic worksheet:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

// Helper functions for building context
function buildActivitiesContext(activities5E) {
  const phases = {
    engagement: { name: 'กระตุ้นความสนใจ', icon: '🔥' },
    exploration: { name: 'สำรวจค้นหา', icon: '🔍' },
    explanation: { name: 'อธิบายความรู้', icon: '💡' },
    elaboration: { name: 'ขยายความรู้', icon: '🚀' },
    evaluation: { name: 'ประเมินผล', icon: '📊' }
  }

  let context = ''
  for (const [phase, info] of Object.entries(phases)) {
    const activity = activities5E[phase]
    if (activity) {
      context += `\n${info.icon} ขั้น${info.name} (${phase}):`
      context += `\n  - เวลา: ${activity.duration || 10} นาที`
      if (activity.steps) {
        context += `\n  - กิจกรรม: ${activity.steps.slice(0, 3).join(', ')}`
      }
      if (activity.arceFocus) {
        const arce = Array.isArray(activity.arceFocus) ? activity.arceFocus.join(', ') : activity.arceFocus
        context += `\n  - A.R.C.E.: ${arce}`
      }
      if (activity.arceDescription) {
        context += `\n  - คำอธิบาย: ${activity.arceDescription}`
      }
      if (activity.questions) {
        context += `\n  - คำถาม: ${activity.questions.slice(0, 2).join(', ')}`
      }
      if (activity.keyConcepts) {
        context += `\n  - แนวคิดหลัก: ${activity.keyConcepts.join(', ')}`
      }
    }
  }
  return context || 'ไม่ระบุกิจกรรม'
}

function buildObjectivesContext(objectives) {
  let context = ''
  if (objectives.knowledge && objectives.knowledge.length) {
    context += `ด้านความรู้ (K):\n${objectives.knowledge.map(o => `  - ${o}`).join('\n')}\n`
  }
  if (objectives.process && objectives.process.length) {
    context += `ด้านทักษะ (P):\n${objectives.process.map(o => `  - ${o}`).join('\n')}\n`
  }
  if (objectives.attitude && objectives.attitude.length) {
    context += `ด้านคุณลักษณะ (A):\n${objectives.attitude.map(o => `  - ${o}`).join('\n')}\n`
  }
  return context || 'ตามแผนการสอน'
}

function buildArceContext(arceFocus, weights) {
  const arceMap = {
    analysis: { name: 'การวิเคราะห์', icon: '🔍', desc: 'แยกแยะ จำแนก เปรียบเทียบ' },
    reasoning: { name: 'การให้เหตุผล', icon: '🧠', desc: 'อธิบาย สรุป เชื่อมโยง' },
    creativity: { name: 'ความคิดสร้างสรรค์', icon: '💡', desc: 'ออกแบบ สร้างสรรค์ ประดิษฐ์' },
    evidence: { name: 'การใช้หลักฐาน', icon: '📚', desc: 'รวบรวม อ้างอิง พิสูจน์' }
  }

  const defaultWeights = { analysis: 25, reasoning: 25, creativity: 25, evidence: 25 }
  const actualWeights = weights || defaultWeights

  let context = ''
  const focusArr = Array.isArray(arceFocus) ? arceFocus : ['analysis', 'reasoning', 'creativity', 'evidence']
  
  focusArr.forEach(arce => {
    const info = arceMap[arce]
    if (info) {
      const weight = actualWeights[arce] || 25
      context += `${info.icon} ${info.name} (${weight}%): ${info.desc}\n`
    }
  })
  return context
}

/**
 * Assess Worksheet Submission
 * ตรวจใบงานด้วย AI ให้ feedback และคะแนน HOTS A.R.C.E.
 * พร้อมจุดแข็ง จุดอ่อน ข้อเสนอแนะตามมาตรฐาน PA/DPA
 */
exports.assessWorksheetSubmission = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 180,
  memory: '1GB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const {
        submissionId,
        worksheetId,
        answers,
        worksheetStructure
      } = req.body

      if (!worksheetId || !answers) {
        return res.status(400).send({
          error: 'Missing required: worksheetId, answers'
        })
      }

      if (!openai) {
        return res.status(500).send({ error: 'OpenAI not configured' })
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

      // Load worksheet structure if not provided
      let worksheet = worksheetStructure
      if (!worksheet) {
        const wsDoc = await db.collection('eWorksheets').doc(worksheetId).get()
        if (!wsDoc.exists) {
          return res.status(404).send({ error: 'Worksheet not found' })
        }
        worksheet = wsDoc.data()
      }

      // Build assessment prompt
      const questionsForAssessment = []
      worksheet.sections.forEach(section => {
        section.questions.forEach(q => {
          const answerKey = `${section.id}_${q.id}`
          const studentAnswer = answers[answerKey]
          if (studentAnswer !== undefined && studentAnswer !== '') {
            questionsForAssessment.push({
              questionId: q.id,
              sectionId: section.id,
              phase: section.phase,
              type: q.type,
              prompt: q.prompt,
              context: q.context || '',
              arceFocus: q.arceFocus,
              maxScore: q.maxScore || 5,
              rubric: q.rubric || null,
              studentAnswer: studentAnswer
            })
          }
        })
      })

      if (questionsForAssessment.length === 0) {
        return res.status(400).send({ error: 'No answers to assess' })
      }

      const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการประเมินทักษะการคิดขั้นสูง (HOTS) ตามเกณฑ์ A.R.C.E., Bloom's Taxonomy และมาตรฐาน PA/DPA

📚 ข้อมูลใบงาน:
- ชื่อใบงาน: ${worksheet.metadata?.title || 'ใบงาน'}
- รายวิชา: ${worksheet.metadata?.courseName || ''}
- หัวข้อ: ${worksheet.metadata?.topic || ''}
- ระดับชั้น: ${worksheet.metadata?.gradeLevel || 'ม.4'}

📋 คำตอบของนักเรียนที่ต้องประเมิน:
${questionsForAssessment.map((q, i) => `
[คำถามที่ ${i + 1}]
- ID: ${q.questionId}
- Section: ${q.sectionId}
- ขั้น 5E: ${q.phase}
- A.R.C.E. Focus: ${q.arceFocus}
- คำถาม: ${q.prompt}
${q.context ? `- บริบท: ${q.context}` : ''}
- ประเภท: ${q.type}
- คะแนนเต็ม: ${q.maxScore}
${q.rubric ? `- เกณฑ์: ${JSON.stringify(q.rubric)}` : ''}
- คำตอบนักเรียน: """${typeof q.studentAnswer === 'object' ? JSON.stringify(q.studentAnswer) : q.studentAnswer}"""
`).join('\n---\n')}

🎯 เกณฑ์การประเมิน A.R.C.E. (แต่ละด้าน 0-5 คะแนน):
- Analysis (การวิเคราะห์): แยกแยะประเด็น วิเคราะห์องค์ประกอบ หาความสัมพันธ์
- Reasoning (การให้เหตุผล): อธิบายเหตุผล เชื่อมโยงหลักการ สรุปอย่างมีตรรกะ
- Creativity (ความคิดสร้างสรรค์): เสนอมุมมองใหม่ ออกแบบวิธีการใหม่ คิดนอกกรอบ
- Evidence (การใช้หลักฐาน): อ้างอิงข้อมูล ยกตัวอย่าง ใช้หลักฐานสนับสนุน

🧠 ระดับ Bloom's Taxonomy (1-6):
1 = Remember (จำ): ระลึก จำได้ ท่องจำ
2 = Understand (เข้าใจ): อธิบาย ตีความ สรุปความ
3 = Apply (ประยุกต์ใช้): ใช้ความรู้ในสถานการณ์ใหม่
4 = Analyze (วิเคราะห์): แยกแยะ หาความสัมพันธ์ เปรียบเทียบ
5 = Evaluate (ประเมิน): ตัดสินคุณค่า วิพากษ์ ให้เหตุผลสนับสนุน
6 = Create (สร้างสรรค์): ออกแบบ สร้างสิ่งใหม่ ประดิษฐ์

📊 มาตรฐาน PA/DPA:
- ระดับ 4 (ดีมาก): 80-100% - แสดงความเข้าใจลึกซึ้ง มีความคิดสร้างสรรค์โดดเด่น
- ระดับ 3 (ดี): 60-79% - แสดงความเข้าใจดี มีการวิเคราะห์และประยุกต์ใช้
- ระดับ 2 (พอใช้): 40-59% - แสดงความเข้าใจพื้นฐาน ยังต้องพัฒนา
- ระดับ 1 (ต้องปรับปรุง): 0-39% - ยังไม่แสดงความเข้าใจ ต้องการการช่วยเหลือ

📝 ตอบเป็น JSON (ห้าม markdown wrapper):
{
  "summary": {
    "totalScore": 0,
    "maxScore": ${worksheet.scoring?.totalPoints || 20},
    "percentage": 0,
    "paLevel": 1,
    "paLevelText": "ระดับ X: คำอธิบาย",
    "overallFeedback": "สรุปภาพรวมผลงาน 2-3 ประโยค กล่าวถึงจุดเด่นและสิ่งที่ควรพัฒนา",
    "recommendation": "ข้อเสนอแนะเชิงปฏิบัติสำหรับการพัฒนาต่อ"
  },
  "arceScores": {
    "analysis": {
      "raw": 0,
      "max": 5,
      "percentage": 0,
      "feedback": "อธิบายทักษะการวิเคราะห์ที่แสดงออก พร้อมยกตัวอย่างจากคำตอบ"
    },
    "reasoning": {
      "raw": 0,
      "max": 5,
      "percentage": 0,
      "feedback": "อธิบายทักษะการให้เหตุผลที่แสดงออก พร้อมยกตัวอย่าง"
    },
    "creativity": {
      "raw": 0,
      "max": 5,
      "percentage": 0,
      "feedback": "อธิบายความคิดสร้างสรรค์ที่แสดงออก พร้อมยกตัวอย่าง"
    },
    "evidence": {
      "raw": 0,
      "max": 5,
      "percentage": 0,
      "feedback": "อธิบายการใช้หลักฐานที่แสดงออก พร้อมยกตัวอย่าง"
    }
  },
  "questionResults": [
    {
      "questionId": "q1",
      "sectionId": "section_id",
      "question": "ข้อความคำถาม",
      "studentAnswer": "คำตอบของนักเรียน",
      "score": 0,
      "maxScore": 5,
      "passed": false,
      "bloomLevel": 4,
      "bloomName": "Analyze (วิเคราะห์)",
      "arceFocus": "analysis",
      "feedback": "ข้อเสนอแนะเฉพาะข้อนี้ - อธิบายว่าทำได้ดีอะไร และควรปรับปรุงอะไร",
      "suggestion": "คำแนะนำเพื่อพัฒนา ถ้าไม่ผ่านเกณฑ์"
    }
  ],
  "bloomAnalysis": {
    "dominantLevel": 4,
    "levelBreakdown": {
      "1": { "count": 0, "avgScore": 0 },
      "2": { "count": 0, "avgScore": 0 },
      "3": { "count": 0, "avgScore": 0 },
      "4": { "count": 0, "avgScore": 0 },
      "5": { "count": 0, "avgScore": 0 },
      "6": { "count": 0, "avgScore": 0 }
    },
    "insight": "วิเคราะห์ระดับการคิดของนักเรียน เช่น 'นักเรียนแสดงทักษะการวิเคราะห์ได้ดี แต่ยังต้องพัฒนาการประเมินและสร้างสรรค์'"
  },
  "strengths": [
    "จุดแข็ง 1: อธิบายพร้อมยกตัวอย่างจากคำตอบ",
    "จุดแข็ง 2: ..."
  ],
  "weaknesses": [
    "จุดที่ควรพัฒนา 1: อธิบายพร้อมแนะนำวิธีปรับปรุง",
    "จุดที่ควรพัฒนา 2: ..."
  ],
  "nextSteps": [
    "ขั้นตอนต่อไป 1: คำแนะนำเชิงปฏิบัติที่ทำได้ทันที",
    "ขั้นตอนต่อไป 2: ..."
  ],
  "teacherNotes": "บันทึกสำหรับครู - ข้อสังเกตพิเศษ จุดที่ควรให้ความช่วยเหลือ หรือศักยภาพที่เห็น"
}

⚠️ ข้อกำหนดสำคัญ:
1. ประเมิน bloomLevel ของแต่ละคำถามตามลักษณะการคิดที่คำถามต้องการ (1-6)
2. questionResults ต้องมีครบทุกข้อที่นักเรียนตอบ
3. feedback ต้องเฉพาะเจาะจง อ้างอิงจากคำตอบจริง ไม่ใช่คำกว้างๆ
4. strengths/weaknesses ต้องยกตัวอย่างจากคำตอบ
5. nextSteps ต้องเป็นสิ่งที่นักเรียนทำได้จริงเพื่อพัฒนาตัวเอง
6. teacherNotes สำหรับครูใช้วางแผนช่วยเหลือนักเรียน
7. ทุก feedback เป็นภาษาไทย สุภาพ สร้างสรรค์ ให้กำลังใจ`

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: `คุณเป็นผู้เชี่ยวชาญประเมินทักษะ HOTS ที่:
1. ประเมินอย่างยุติธรรม ตามหลักฐานในคำตอบ
2. ให้ feedback ที่สร้างสรรค์ เป็นกำลังใจ
3. ระบุจุดแข็ง/จุดอ่อนอย่างเฉพาะเจาะจง
4. แนะนำอย่างเป็นรูปธรรม ทำได้จริง
5. เข้าใจมาตรฐาน PA/DPA ของไทย
ตอบเป็น JSON ภาษาไทยเท่านั้น`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })

      const responseText = completion.choices[0].message.content
      let assessmentResult
      try {
        let cleanedText = responseText.trim()
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        assessmentResult = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse assessment JSON:', responseText)
        return res.status(500).send({ error: 'Failed to parse AI response' })
      }

      // 🎯 LO Assessment: Evaluate Learning Outcomes if worksheet has LOs
      let loAssessment = { passedLOs: [], analysis: 'ไม่มี Learning Outcomes สำหรับประเมิน' }
      const worksheetLOs = worksheet.metadata?.learningOutcomes || []
      
      if (worksheetLOs.length > 0 && assessmentResult.arceScores) {
        // Combine all student answers for LO assessment
        const allAnswers = questionsForAssessment
          .map(q => `คำถาม: ${q.prompt}\nคำตอบ: ${typeof q.studentAnswer === 'object' ? JSON.stringify(q.studentAnswer) : q.studentAnswer}`)
          .join('\n\n---\n\n')
        
        // Build rubric scores for LO assessment (use average from ARCE scores)
        const rubricScores = {
          analysis: assessmentResult.arceScores.analysis?.raw || 0,
          reasoning: assessmentResult.arceScores.reasoning?.raw || 0,
          creativity: assessmentResult.arceScores.creativity?.raw || 0,
          evidence: assessmentResult.arceScores.evidence?.raw || 0
        }
        
        console.log('🎓 Worksheet LO Assessment - Input:', {
          worksheetId,
          loCount: worksheetLOs.length,
          rubricScores
        })
        
        // Call the shared LO assessment function
        loAssessment = await assessLearningOutcomesInternal(allAnswers, worksheetLOs, { rubricScores })
        
        console.log('✅ Worksheet LO Assessment - Result:', {
          passedLOs: loAssessment.passedLOs,
          analysisPreview: (loAssessment.analysis || '').substring(0, 100)
        })
      }
      
      // Add LO assessment to result
      assessmentResult.loAssessment = loAssessment

      // Save assessment to submission if submissionId provided
      if (submissionId) {
        await db.collection('worksheetSubmissions').doc(submissionId).update({
          assessment: assessmentResult,
          loAssessment: loAssessment,
          status: 'graded',
          gradedAt: admin.firestore.FieldValue.serverTimestamp()
        })

        // Get submission data for student progress update
        const submissionDoc = await db.collection('worksheetSubmissions').doc(submissionId).get()
        const submissionData = submissionDoc.data()

        // Update student progress with this assessment
        if (submissionData?.studentId && submissionData?.courseId) {
          const progressRef = db.collection('studentProgress').doc(`${submissionData.studentId}_${submissionData.courseId}`)
          const progressDoc = await progressRef.get()

          const worksheetAssessment = {
            worksheetId,
            submissionId,
            score: assessmentResult.summary.totalScore,
            maxScore: assessmentResult.summary.maxScore,
            percentage: assessmentResult.summary.percentage,
            paLevel: assessmentResult.summary.paLevel,
            arceScores: {
              analysis: assessmentResult.arceScores.analysis.raw,
              reasoning: assessmentResult.arceScores.reasoning.raw,
              creativity: assessmentResult.arceScores.creativity.raw,
              evidence: assessmentResult.arceScores.evidence.raw
            },
            // 🎯 Store LO assessment with worksheet assessment
            passedLOs: loAssessment.passedLOs || [],
            loAnalysis: loAssessment.analysis || '',
            assessedAt: new Date().toISOString()
          }

          if (progressDoc.exists) {
            const currentData = progressDoc.data()
            const currentPassedLOs = currentData.passedLOs || []
            // 🎯 Merge new passed LOs with existing ones
            const newPassedLOs = loAssessment.passedLOs || []
            const updatedPassedLOs = [...new Set([...currentPassedLOs, ...newPassedLOs])]
            
            await progressRef.update({
              worksheetAssessments: admin.firestore.FieldValue.arrayUnion(worksheetAssessment),
              passedLOs: updatedPassedLOs,
              lastAssessedAt: admin.firestore.FieldValue.serverTimestamp()
            })
          } else {
            await progressRef.set({
              studentId: submissionData.studentId,
              courseId: submissionData.courseId,
              worksheetAssessments: [worksheetAssessment],
              passedLOs: loAssessment.passedLOs || [],
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              lastAssessedAt: admin.firestore.FieldValue.serverTimestamp()
            })
          }
        }

        // Update worksheet stats
        await updateWorksheetStats(worksheetId, assessmentResult.summary)
      }

      return res.status(200).send({
        success: true,
        assessment: assessmentResult
      })

    } catch (error) {
      console.error('❌ Error assessing worksheet:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

// Helper function to update worksheet statistics
async function updateWorksheetStats(worksheetId, summary) {
  try {
    const wsRef = db.collection('eWorksheets').doc(worksheetId)
    const wsDoc = await wsRef.get()
    
    if (wsDoc.exists) {
      const currentStats = wsDoc.data().stats || { totalSubmitted: 0, averageScore: 0, passRate: 0 }
      const newTotal = currentStats.totalSubmitted + 1
      const newAverage = ((currentStats.averageScore * currentStats.totalSubmitted) + summary.percentage) / newTotal
      const passed = summary.percentage >= 60 ? 1 : 0
      const newPassRate = ((currentStats.passRate * currentStats.totalSubmitted) + (passed * 100)) / newTotal

      await wsRef.update({
        'stats.totalSubmitted': newTotal,
        'stats.averageScore': Math.round(newAverage * 100) / 100,
        'stats.passRate': Math.round(newPassRate * 100) / 100,
        'stats.lastSubmissionAt': admin.firestore.FieldValue.serverTimestamp()
      })
    }
  } catch (error) {
    console.error('Error updating worksheet stats:', error)
  }
}

/**
 * Get Teacher Worksheet Reports
 * รายงานผลการทำใบงานสำหรับครู
 */
exports.getWorksheetReports = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { teacherId, courseId, worksheetId, roomId, dateRange } = req.body

      if (!teacherId) {
        return res.status(400).send({ error: 'Missing required: teacherId' })
      }

      let query = db.collection('worksheetSubmissions')
        .where('status', '==', 'graded')

      // Apply filters
      if (worksheetId) {
        query = query.where('worksheetId', '==', worksheetId)
      }
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }

      const submissionsSnap = await query.orderBy('submittedAt', 'desc').limit(100).get()

      if (submissionsSnap.empty) {
        return res.status(200).send({
          success: true,
          report: {
            totalSubmissions: 0,
            submissions: [],
            summary: null
          }
        })
      }

      const submissions = []
      let totalScore = 0
      let totalMaxScore = 0
      const arceAggregated = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
      const paLevelCounts = { 1: 0, 2: 0, 3: 0, 4: 0 }

      for (const doc of submissionsSnap.docs) {
        const data = doc.data()
        const assessment = data.assessment

        if (assessment) {
          submissions.push({
            id: doc.id,
            studentId: data.studentId,
            studentData: data.studentData,
            worksheetId: data.worksheetId,
            score: assessment.summary.totalScore,
            maxScore: assessment.summary.maxScore,
            percentage: assessment.summary.percentage,
            paLevel: assessment.summary.paLevel,
            arceScores: assessment.arceScores,
            strengths: assessment.strengths,
            weaknesses: assessment.weaknesses,
            submittedAt: data.submittedAt,
            gradedAt: data.gradedAt
          })

          totalScore += assessment.summary.totalScore
          totalMaxScore += assessment.summary.maxScore
          
          arceAggregated.analysis += assessment.arceScores.analysis.raw || 0
          arceAggregated.reasoning += assessment.arceScores.reasoning.raw || 0
          arceAggregated.creativity += assessment.arceScores.creativity.raw || 0
          arceAggregated.evidence += assessment.arceScores.evidence.raw || 0

          if (assessment.summary.paLevel >= 1 && assessment.summary.paLevel <= 4) {
            paLevelCounts[assessment.summary.paLevel]++
          }
        }
      }

      const count = submissions.length
      const summary = count > 0 ? {
        totalSubmissions: count,
        averageScore: Math.round((totalScore / count) * 100) / 100,
        averagePercentage: Math.round(((totalScore / totalMaxScore) * 100) * 100) / 100,
        arceAverages: {
          analysis: Math.round((arceAggregated.analysis / count) * 100) / 100,
          reasoning: Math.round((arceAggregated.reasoning / count) * 100) / 100,
          creativity: Math.round((arceAggregated.creativity / count) * 100) / 100,
          evidence: Math.round((arceAggregated.evidence / count) * 100) / 100
        },
        paLevelDistribution: paLevelCounts,
        passRate: Math.round(((paLevelCounts[3] + paLevelCounts[4]) / count) * 100 * 100) / 100
      } : null

      return res.status(200).send({
        success: true,
        report: {
          totalSubmissions: count,
          submissions,
          summary
        }
      })

    } catch (error) {
      console.error('❌ Error getting worksheet reports:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

// ===== KNOWLEDGE SHEET GENERATOR =====
// ระบบสร้างใบความรู้จากการวิเคราะห์แผนการสอน
// โครงสร้างข้อมูลต้องตรงกับ KnowledgeSheetView.vue
// ✨ ปรับปรุง: รับ context จากใบความรู้หน่วยและแผนอื่นเพื่อไม่ซ้ำ
// ===== HELPER: Retry with Exponential Backoff =====
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1
      const isRetryable = error.status === 429 || error.status >= 500 || error.code === 'ECONNRESET'
      
      if (isLastAttempt || !isRetryable) {
        throw error
      }
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

// ===== HELPER: Validate Knowledge Sheet Structure =====
function validateKnowledgeSheet(data) {
  const errors = []
  const warnings = []
  
  // Required fields
  if (!data.metadata?.title) errors.push('Missing metadata.title')
  if (!data.sections || data.sections.length < 2) errors.push('Sections must have at least 2 items')
  if (!data.objectives?.mainObjective) warnings.push('Missing main objective')
  if (!data.vocabulary || data.vocabulary.length < 3) warnings.push('Should have at least 3 vocabulary items')
  if (!data.hotsIntegration?.analysisQuestions?.length) warnings.push('Missing analysis questions')
  if (!data.hotsIntegration?.reasoningQuestions?.length) warnings.push('Missing reasoning questions')
  if (!data.selfCheck?.questions?.length) warnings.push('Missing self-check questions')
  if (!data.summary?.keyTakeaways?.length) warnings.push('Missing key takeaways')
  
  // Validate sections content
  data.sections?.forEach((section, idx) => {
    if (!section.content?.mainContent || section.content.mainContent.length < 100) {
      warnings.push(`Section ${idx + 1} content is too short`)
    }
    if (!section.content?.keyPoints?.length) {
      warnings.push(`Section ${idx + 1} missing key points`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5))
  }
}

// ===== HELPER: Auto-fix Common Issues =====
function autoFixKnowledgeSheet(data, topic) {
  // Ensure metadata exists
  if (!data.metadata) {
    data.metadata = { title: `ใบความรู้: ${topic}`, generatedBy: 'AI' }
  }
  
  // Ensure objectives exists
  if (!data.objectives) {
    data.objectives = {
      mainObjective: `เพื่อให้นักเรียนเข้าใจเรื่อง ${topic}`,
      subObjectives: []
    }
  }
  
  // Ensure introduction exists
  if (!data.introduction) {
    data.introduction = {
      hook: `ทำไมเราต้องเรียนรู้เรื่อง ${topic}?`,
      overview: `ในใบความรู้นี้ เราจะเรียนรู้เกี่ยวกับ ${topic}`,
      priorKnowledge: []
    }
  }
  
  // Ensure sections is array
  if (!Array.isArray(data.sections)) {
    data.sections = []
  }
  
  // Ensure vocabulary is array with at least 3 items
  if (!Array.isArray(data.vocabulary) || data.vocabulary.length < 3) {
    data.vocabulary = data.vocabulary || []
  }
  
  // Ensure hotsIntegration exists
  if (!data.hotsIntegration) {
    data.hotsIntegration = {
      analysisQuestions: [],
      reasoningQuestions: [],
      creativityQuestions: [],
      evidenceQuestions: []
    }
  }
  
  // Ensure selfCheck exists
  if (!data.selfCheck) {
    data.selfCheck = { questions: [], trueOrFalse: [] }
  }
  
  // Ensure summary exists
  if (!data.summary) {
    data.summary = { keyTakeaways: [], mindMap: { central: topic, branches: [] } }
  }
  
  return data
}

exports.generateKnowledgeSheet = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 180,
  memory: '1GB'
}).https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
      }

      const {
        lessonPlanId,
        teacherId,
        courseId,
        courseCode,
        courseName,
        gradeLevel,
        unitNumber,
        unitName,
        planNumber,
        topic,
        objectives,
        essentialContent,
        learningContent,
        activities5E,
        targetLOs,
        standard,
        indicators,
        fullLessonPlan,
        // Options
        style = 'comprehensive',
        language = 'thai',
        createRoom = false,
        roomId = null,
        // ✨ Standalone mode: สร้างใบความรู้โดยไม่ต้องมีแผนการสอน
        standaloneMode = false,
        standaloneContent = null, // { topic, description, keyPoints, ... }
        // ✨ Context from other sheets to avoid duplication
        unitKnowledgeSheetId = null,
        otherPlansInUnit = [],
        planGuidance = null,
        // ✨ Retry settings
        maxRetries = 3
      } = req.body

      // Support standalone mode (no lesson plan required)
      const effectiveTopic = topic || standaloneContent?.topic
      
      if (!effectiveTopic) {
        return res.status(400).json({ error: 'Topic is required (either from lessonPlan or standaloneContent)' })
      }

      console.log('📖 Generating Knowledge Sheet for:', effectiveTopic, standaloneMode ? '(standalone)' : '')

      // ✨ Standalone mode: สร้าง context จาก standaloneContent
      let standaloneContext = ''
      if (standaloneMode && standaloneContent) {
        standaloneContext = `
## 📝 เนื้อหาที่ต้องการสร้างใบความรู้ (Standalone Mode):
- หัวข้อ: ${standaloneContent.topic}
- คำอธิบาย: ${standaloneContent.description || 'ไม่ระบุ'}
- ประเด็นสำคัญ: ${(standaloneContent.keyPoints || []).join(', ') || 'ไม่ระบุ'}
- ระดับ Bloom ที่ต้องการ: ${standaloneContent.bloomLevels?.join(', ') || '1-4'}
- A.R.C.E. ที่เน้น: ${standaloneContent.arceFocus?.join(', ') || 'analysis, reasoning'}
`
      }

      // ✨ ดึง context จากใบความรู้หน่วย (ถ้ามี)
      let unitContext = ''
      if (unitKnowledgeSheetId) {
        try {
          const unitKsDoc = await admin.firestore().collection('unitKnowledgeSheets').doc(unitKnowledgeSheetId).get()
          if (unitKsDoc.exists()) {
            const unitKs = unitKsDoc.data()
            const coreConcepts = typeof unitKs.coreConcepts === 'string' ? JSON.parse(unitKs.coreConcepts) : unitKs.coreConcepts
            const planGuidanceFromUnit = typeof unitKs.planGuidance === 'string' ? JSON.parse(unitKs.planGuidance) : unitKs.planGuidance
            
            // หา guidance สำหรับแผนนี้โดยเฉพาะ
            const thisGuidance = planGuidanceFromUnit?.find(g => g.planNumber === planNumber)
            
            unitContext = `
## 📚 Context จากใบความรู้รวมหน่วย:

### แนวคิดหลักของหน่วย (Core Concepts):
${coreConcepts?.map(c => `- ${c.name}: ${c.description}`).join('\n') || 'ไม่ระบุ'}

### แนวทางสำหรับแผนที่ ${planNumber}:
${thisGuidance ? `
- **เนื้อหาที่ควรเน้น**: ${thisGuidance.focusAreas?.join(', ') || '-'}
- **สิ่งที่ไม่ต้องสอนซ้ำ** (เพราะอยู่ในแผนอื่น): ${thisGuidance.avoidDuplication?.join(', ') || '-'}
- **ความรู้พื้นฐานที่ต้องอ้างอิง**: ${thisGuidance.prerequisiteFromUnit?.join(', ') || '-'}
- **จุดเด่นเฉพาะของแผนนี้**: ${thisGuidance.uniqueContribution || '-'}
` : 'ไม่มีแนวทางเฉพาะ'}
`
          }
        } catch (err) {
          console.warn('Could not fetch unit knowledge sheet:', err.message)
        }
      }

      // ✨ สร้าง context จากแผนอื่นในหน่วยเดียวกัน (เพื่อให้เน้นจุดเด่นต่างกัน ไม่ใช่ตัดเนื้อหาออก)
      let otherPlansContext = ''
      if (otherPlansInUnit?.length > 0) {
        otherPlansContext = `
## 📚 แผนอื่นในหน่วยเดียวกัน (สำหรับอ้างอิง):
${otherPlansInUnit.map(p => `- แผนที่ ${p.planNumber}: ${p.topic}`).join('\n')}

**หลักการสำคัญ**: 
1. ใบความรู้นี้ต้อง **ครบถ้วน** ตามเนื้อหาของแผนที่ ${planNumber}
2. ห้ามตัดเนื้อหาสำคัญออก แม้จะอยู่ในแผนอื่นด้วย
3. ให้เน้น "จุดเด่นเฉพาะ" และ "มุมมองที่ต่าง" จากแผนอื่น
4. ถ้ามีเนื้อหาพื้นฐานที่ต้องอ้างอิง ให้อธิบายย่อและอ้างอิงไปแผนที่เกี่ยวข้อง
`
      }

      // สร้าง context จากกิจกรรม 5E
      let activities5EText = ''
      if (activities5E) {
        const phaseNames = {
          engagement: 'กระตุ้นความสนใจ',
          exploration: 'สำรวจค้นหา',
          explanation: 'อธิบายความรู้',
          elaboration: 'ขยายความเข้าใจ',
          evaluation: 'ประเมินผล'
        }
        for (const phase of ['engagement', 'exploration', 'explanation', 'elaboration', 'evaluation']) {
          if (activities5E[phase]) {
            const act = activities5E[phase]
            activities5EText += `\n${phaseNames[phase]}: ${act.activity || act.description || JSON.stringify(act)}`
          }
        }
      }

      // สร้าง context จาก objectives
      let objectivesText = ''
      if (objectives) {
        if (typeof objectives === 'object' && !Array.isArray(objectives)) {
          if (objectives.knowledge?.length) objectivesText += `\nความรู้ (K): ${objectives.knowledge.join(', ')}`
          if (objectives.process?.length) objectivesText += `\nทักษะ (P): ${objectives.process.join(', ')}`
          if (objectives.attitude?.length) objectivesText += `\nเจตคติ (A): ${objectives.attitude.join(', ')}`
        } else if (Array.isArray(objectives)) {
          objectivesText = objectives.join(', ')
        }
      }

      // สร้าง context จาก learningContent
      let learningContentText = ''
      if (learningContent) {
        if (Array.isArray(learningContent)) {
          learningContentText = learningContent.map((c, i) => `${i + 1}. ${typeof c === 'string' ? c : c.title || c.content || JSON.stringify(c)}`).join('\n')
        } else if (typeof learningContent === 'object') {
          learningContentText = JSON.stringify(learningContent, null, 2)
        } else {
          learningContentText = learningContent
        }
      }

      const prompt = `คุณเป็นครูผู้เชี่ยวชาญด้านการสร้างใบความรู้ที่มีคุณภาพสูง

## 📋 ข้อมูลแผนการสอน

**รายวิชา:** ${courseCode || ''} ${courseName || topic}
**ระดับชั้น:** ${gradeLevel || 'ม.4'}
**หน่วยที่ ${unitNumber || 1}:** ${unitName || topic}
**แผนที่ ${planNumber || 1}:** ${topic}

**สาระสำคัญ:**
${essentialContent || 'ตามหัวข้อที่กำหนด'}

**จุดประสงค์การเรียนรู้:**
${objectivesText || 'ตามแผนการสอน'}

**เนื้อหาการเรียนรู้:**
${learningContentText || 'ตามหัวข้อที่กำหนด'}

**กิจกรรม 5E:**
${activities5EText || 'ไม่ระบุ'}

${unitContext}

${otherPlansContext}

---

## 🎯 สร้างใบความรู้ตามโครงสร้างนี้ (JSON):

{
  "metadata": {
    "title": "ใบความรู้ที่ ${planNumber || 1}: ${topic}",
    "courseCode": "${courseCode || ''}",
    "courseName": "${courseName || ''}",
    "unitNumber": ${unitNumber || 1},
    "unitName": "${unitName || ''}",
    "planNumber": ${planNumber || 1},
    "gradeLevel": "${gradeLevel || 'ม.4'}",
    "duration": "50 นาที",
    "focusedContent": true
  },

  "objectives": {
    "mainObjective": "จุดประสงค์หลักที่ชัดเจน 1 ประโยค (หลังศึกษาใบความรู้นี้แล้ว นักเรียนจะสามารถ...)",
    "subObjectives": [
      "นักเรียนสามารถอธิบาย... (ด้านความรู้ K)",
      "นักเรียนสามารถ... (ด้านทักษะ P)",
      "นักเรียนมีเจตคติที่ดีต่อ... (ด้านเจตคติ A)"
    ]
  },

  "introduction": {
    "hook": "คำถามหรือสถานการณ์ที่น่าสนใจเพื่อกระตุ้นความอยากรู้ของนักเรียน (2-3 ประโยค)",
    "overview": "ภาพรวมของเนื้อหาในใบความรู้นี้ว่าจะเรียนรู้อะไรบ้าง (2-3 ประโยค)",
    "priorKnowledge": [
      "ความรู้พื้นฐานที่นักเรียนควรมีก่อน 1",
      "ความรู้พื้นฐานที่นักเรียนควรมีก่อน 2"
    ],
    "connectionToUnit": "เนื้อหานี้เชื่อมโยงกับหน่วยการเรียนรู้อย่างไร"
  },

  "sections": [
    {
      "sectionNumber": 1,
      "title": "หัวข้อย่อยที่ 1 (ระดับ Bloom: จำ/เข้าใจ)",
      "bloomLevel": 1,
      "bloomName": "จำ (Remember)",
      "arceFocus": ["reasoning"],
      "content": {
        "mainContent": "เนื้อหาหลักอธิบายอย่างละเอียด ชัดเจน เข้าใจง่าย (อย่างน้อย 3-4 ย่อหน้า แต่ละย่อหน้า 3-4 ประโยค) เนื้อหาต้องถูกต้องตามหลักวิชาการ มีความลึกซึ้ง ครอบคลุมประเด็นสำคัญ",
        "keyPoints": [
          "ประเด็นสำคัญที่ 1 ที่ต้องจดจำ",
          "ประเด็นสำคัญที่ 2 ที่ต้องจดจำ",
          "ประเด็นสำคัญที่ 3 ที่ต้องจดจำ"
        ],
        "explanation": "คำอธิบายเพิ่มเติมหรือข้อสังเกตสำคัญ"
      },
      "examples": [
        {
          "title": "ตัวอย่างที่ 1: ชื่อตัวอย่าง",
          "scenario": "สถานการณ์ตัวอย่างที่ชัดเจน เกี่ยวข้องกับชีวิตจริง",
          "analysis": "การวิเคราะห์ตัวอย่างนี้",
          "solution": "ผลลัพธ์หรือวิธีแก้"
        }
      ],
      "diagrams": [
        {
          "type": "flowchart",
          "title": "แผนภาพแสดง...",
          "description": "ขั้นตอน: A → B → C → D (อธิบายแต่ละขั้นตอน)"
        }
      ],
      "tables": [
        {
          "title": "ตารางสรุป...",
          "headers": ["หัวข้อ 1", "หัวข้อ 2", "หัวข้อ 3"],
          "rows": [
            ["ข้อมูล 1", "ข้อมูล 2", "ข้อมูล 3"],
            ["ข้อมูล 4", "ข้อมูล 5", "ข้อมูล 6"]
          ]
        }
      ],
      "realWorldApplications": [
        "การนำไปใช้ในชีวิตจริง 1",
        "การนำไปใช้ในชีวิตจริง 2"
      ]
    },
    {
      "sectionNumber": 2,
      "title": "หัวข้อย่อยที่ 2 (ระดับ Bloom: เข้าใจ/ประยุกต์)",
      "bloomLevel": 2,
      "bloomName": "เข้าใจ (Understand)",
      "arceFocus": ["analysis", "reasoning"],
      "content": {
        "mainContent": "เนื้อหาส่วนที่ 2 อธิบายอย่างละเอียด...",
        "keyPoints": ["ประเด็นสำคัญ 1", "ประเด็นสำคัญ 2"],
        "explanation": "คำอธิบายเพิ่มเติม"
      },
      "examples": [],
      "techniques": [
        {
          "name": "เทคนิค/วิธีการที่ 1",
          "description": "คำอธิบายวิธีการ",
          "pros": ["ข้อดี 1", "ข้อดี 2"],
          "cons": ["ข้อจำกัด 1"]
        }
      ]
    },
    {
      "sectionNumber": 3,
      "title": "หัวข้อย่อยที่ 3 (ระดับ Bloom: ประยุกต์/วิเคราะห์)",
      "bloomLevel": 3,
      "bloomName": "ประยุกต์ใช้ (Apply)",
      "arceFocus": ["analysis"],
      "content": {
        "mainContent": "เนื้อหาส่วนที่ 3...",
        "keyPoints": ["ประเด็นสำคัญ 1", "ประเด็นสำคัญ 2"],
        "explanation": "คำอธิบายเพิ่มเติม"
      }
    },
    {
      "sectionNumber": 4,
      "title": "หัวข้อย่อยที่ 4 (ระดับ Bloom: วิเคราะห์/ประเมิน)",
      "bloomLevel": 4,
      "bloomName": "วิเคราะห์ (Analyze)",
      "arceFocus": ["analysis", "evidence"],
      "content": {
        "mainContent": "เนื้อหาส่วนที่ 4 เน้นการวิเคราะห์...",
        "keyPoints": ["ประเด็นสำคัญ 1", "ประเด็นสำคัญ 2"],
        "explanation": "คำอธิบายเพิ่มเติม"
      }
    }
  ],

  "vocabulary": [
    {
      "term": "English Term 1",
      "thai": "คำแปลภาษาไทย",
      "definition": "คำจำกัดความ/ความหมายโดยละเอียด"
    },
    {
      "term": "English Term 2",
      "thai": "คำแปลภาษาไทย",
      "definition": "คำจำกัดความ/ความหมายโดยละเอียด"
    }
  ],

  "hotsIntegration": {
    "analysisQuestions": [
      "คำถามวิเคราะห์ 1: จงวิเคราะห์ว่า... (เริ่มด้วย จง/ให้วิเคราะห์/เปรียบเทียบ/จำแนก)",
      "คำถามวิเคราะห์ 2: จงเปรียบเทียบความแตกต่างระหว่าง..."
    ],
    "reasoningQuestions": [
      "คำถามเหตุผล 1: เหตุใด...จึง... (เริ่มด้วย เหตุใด/ทำไม/อธิบายเหตุผล)",
      "คำถามเหตุผล 2: ถ้า...จะเกิดอะไรขึ้น เพราะเหตุใด"
    ],
    "creativityQuestions": [
      "คำถามสร้างสรรค์ 1: ให้ออกแบบ/คิดวิธีใหม่ในการ... (เริ่มด้วย ออกแบบ/สร้างสรรค์/คิดค้น)",
      "คำถามสร้างสรรค์ 2: ถ้านักเรียนเป็น... จะทำอย่างไร"
    ],
    "evidenceQuestions": [
      "คำถามหลักฐาน 1: ข้อมูลใดที่สนับสนุนว่า... (เริ่มด้วย ข้อมูล/หลักฐาน/พิสูจน์)",
      "คำถามหลักฐาน 2: จะพิสูจน์ได้อย่างไรว่า..."
    ]
  },

  "summary": {
    "keyTakeaways": [
      "สิ่งสำคัญที่ต้องจำ 1 (กระชับ ชัดเจน)",
      "สิ่งสำคัญที่ต้องจำ 2",
      "สิ่งสำคัญที่ต้องจำ 3",
      "สิ่งสำคัญที่ต้องจำ 4"
    ],
    "mindMap": {
      "central": "${topic}",
      "branches": [
        {
          "topic": "หัวข้อย่อย 1",
          "subtopics": ["รายละเอียด 1.1", "รายละเอียด 1.2"]
        },
        {
          "topic": "หัวข้อย่อย 2",
          "subtopics": ["รายละเอียด 2.1", "รายละเอียด 2.2"]
        },
        {
          "topic": "หัวข้อย่อย 3",
          "subtopics": ["รายละเอียด 3.1", "รายละเอียด 3.2"]
        }
      ]
    }
  },

  "selfCheck": {
    "questions": [
      {
        "question": "คำถามทดสอบความเข้าใจ 1 (Bloom ระดับ 1-2)",
        "type": "definition",
        "bloomLevel": 1,
        "hint": "คำใบ้ช่วยคิด",
        "answer": "คำตอบที่ถูกต้อง"
      },
      {
        "question": "คำถามทดสอบความเข้าใจ 2 (Bloom ระดับ 2-3)",
        "type": "open-ended",
        "bloomLevel": 2,
        "hint": "คำใบ้ช่วยคิด",
        "answer": "แนวคำตอบ"
      },
      {
        "question": "คำถามทดสอบความเข้าใจ 3 (Bloom ระดับ 3-4)",
        "type": "open-ended",
        "bloomLevel": 3,
        "hint": "คำใบ้ช่วยคิด"
      }
    ],
    "trueOrFalse": [
      {
        "statement": "ข้อความที่ 1 (ถูกหรือผิด)",
        "answer": true,
        "explanation": "อธิบายว่าทำไมถูก"
      },
      {
        "statement": "ข้อความที่ 2 (ถูกหรือผิด)",
        "answer": false,
        "explanation": "อธิบายว่าทำไมผิด และอะไรคือสิ่งที่ถูกต้อง"
      },
      {
        "statement": "ข้อความที่ 3 (ถูกหรือผิด)",
        "answer": true,
        "explanation": "อธิบายว่าทำไมถูก"
      }
    ]
  },

  "additionalResources": [
    {
      "type": "video",
      "title": "วิดีโอแนะนำ: ชื่อวิดีโอ",
      "description": "คำอธิบายว่าวิดีโอนี้เกี่ยวกับอะไร",
      "duration": "10 นาที"
    },
    {
      "type": "article",
      "title": "บทความ: ชื่อบทความ",
      "description": "คำอธิบายสั้นๆ ว่าบทความนี้มีเนื้อหาอะไร"
    }
  ],

  "connectionTo5E": {
    "engagement": "เนื้อหาส่วน introduction และ hook ใช้กระตุ้นความสนใจในขั้น Engagement",
    "exploration": "เนื้อหา sections ที่ 1-2 ให้ความรู้พื้นฐานสำหรับการสำรวจในขั้น Exploration",
    "explanation": "เนื้อหา sections ที่ 2-3 ช่วยอธิบายแนวคิดหลักในขั้น Explanation",
    "elaboration": "เนื้อหา sections ที่ 3-4 และ hotsIntegration ใช้ขยายความเข้าใจในขั้น Elaboration",
    "evaluation": "selfCheck และ hotsIntegration ใช้ประเมินความเข้าใจในขั้น Evaluation"
  }
}

## 📝 ข้อกำหนดสำคัญ:

1. **เนื้อหาต้องถูกต้องตามหลักวิชาการ** - ข้อมูลทั้งหมดต้องถูกต้อง แม่นยำ
2. **เนื้อหาต้องครบถ้วน** - ห้ามตัดเนื้อหาสำคัญออก แม้จะซ้ำกับแผนอื่น
3. **เน้นจุดเด่นเฉพาะ** - ถ้ามีเนื้อหาที่ซ้ำกับแผนอื่น ให้เน้นมุมมองที่ต่าง หรืออ้างอิงไปแผนที่เกี่ยวข้อง
4. **sections ต้องมีอย่างน้อย 4 หัวข้อ** - ครอบคลุมเนื้อหาสำคัญ
5. **แต่ละ section.content.mainContent ต้องมีเนื้อหาละเอียด** - อย่างน้อย 3-4 ย่อหน้า
6. **hotsIntegration ต้องมีคำถามครบทั้ง 4 ด้าน** - analysis, reasoning, creativity, evidence
7. **selfCheck ต้องมีทั้ง questions และ trueOrFalse** - พร้อมคำตอบและคำอธิบาย
8. **vocabulary ต้องมีคำศัพท์สำคัญอย่างน้อย 5 คำ** - พร้อมความหมายชัดเจน
9. **ภาษาเหมาะกับระดับชั้น ${gradeLevel || 'ม.4'}** - เข้าใจง่าย ชัดเจน
10. **ตอบเป็น JSON เท่านั้น** - ห้ามมี markdown wrapper เช่น \`\`\`json

${standaloneContext}

ตอบ JSON:`

      // ✨ Use retry with exponential backoff
      const openaiResponse = await retryWithBackoff(async () => {
        return openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `คุณเป็นผู้เชี่ยวชาญด้านการสร้างสื่อการเรียนการสอนที่มีคุณภาพสูง

หลักการสำคัญ:
1. เนื้อหาต้องถูกต้องตามหลักวิชาการ 100%
2. อธิบายละเอียด ชัดเจน เข้าใจง่าย
3. มีตัวอย่างที่เกี่ยวข้องกับชีวิตจริง
4. ครอบคลุม Bloom's Taxonomy ทุกระดับ
5. ส่งเสริมทักษะการคิดขั้นสูง (HOTS) ตามกรอบ A.R.C.E.

⚠️ สำคัญมาก: ตอบเป็น JSON ที่ถูกต้องเท่านั้น ห้ามมี markdown wrapper
- ห้ามเริ่มด้วย \`\`\`json
- ห้ามลงท้ายด้วย \`\`\`
- เริ่มต้นด้วย { และจบด้วย } เท่านั้น`
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 8000,
          temperature: 0.7
        })
      }, maxRetries)

      let responseText = openaiResponse.choices[0].message.content.trim()
      
      // ✨ Enhanced markdown wrapper cleaning
      if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```(?:json)?\s*\n?/i, '')
        responseText = responseText.replace(/\n?```\s*$/i, '')
      }
      // Also handle case where it starts with ```json\n{
      responseText = responseText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
      
      // ✨ Try to fix common JSON issues
      if (!responseText.startsWith('{')) {
        const jsonStart = responseText.indexOf('{')
        if (jsonStart > -1) {
          responseText = responseText.substring(jsonStart)
        }
      }
      if (!responseText.endsWith('}')) {
        const jsonEnd = responseText.lastIndexOf('}')
        if (jsonEnd > -1) {
          responseText = responseText.substring(0, jsonEnd + 1)
        }
      }

      let knowledgeSheetData
      try {
        knowledgeSheetData = JSON.parse(responseText)
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError.message)
        console.error('Response preview:', responseText.substring(0, 500))
        throw new Error(`Invalid JSON response: ${parseError.message}`)
      }
      
      // Handle nested structure
      if (knowledgeSheetData.knowledgeSheet) {
        knowledgeSheetData = knowledgeSheetData.knowledgeSheet
      }

      // ✨ Auto-fix common issues
      knowledgeSheetData = autoFixKnowledgeSheet(knowledgeSheetData, effectiveTopic)

      // ✨ Validate and log quality score
      const validation = validateKnowledgeSheet(knowledgeSheetData)
      console.log(`📊 Knowledge Sheet Quality Score: ${validation.score}/100`)
      if (validation.warnings.length > 0) {
        console.log('⚠️ Warnings:', validation.warnings.join(', '))
      }
      if (!validation.isValid) {
        console.error('❌ Validation errors:', validation.errors)
        // Don't throw - return with validation info for transparency
      }

      // Add metadata
      const ksId = `ks_${Date.now()}`
      if (knowledgeSheetData.metadata) {
        knowledgeSheetData.metadata.id = ksId
        knowledgeSheetData.metadata.lessonPlanId = lessonPlanId
        knowledgeSheetData.metadata.generatedBy = 'AI'
        knowledgeSheetData.metadata.generatedAt = new Date().toISOString()
      } else {
        knowledgeSheetData.metadata = {
          id: ksId,
          lessonPlanId,
          topic,
          generatedBy: 'AI',
          generatedAt: new Date().toISOString()
        }
      }

      // Flatten complex nested objects for Firestore (sections, hotsIntegration, etc. as JSON strings)
      const firestoreData = {
        ...knowledgeSheetData,
        // Store complex nested arrays/objects as JSON strings to avoid Firestore nesting limits
        sections: JSON.stringify(knowledgeSheetData.sections || []),
        vocabulary: JSON.stringify(knowledgeSheetData.vocabulary || []),
        hotsIntegration: JSON.stringify(knowledgeSheetData.hotsIntegration || {}),
        selfCheck: JSON.stringify(knowledgeSheetData.selfCheck || {}),
        summary: JSON.stringify(knowledgeSheetData.summary || {}),
        additionalResources: JSON.stringify(knowledgeSheetData.additionalResources || []),
        connectionTo5E: JSON.stringify(knowledgeSheetData.connectionTo5E || {}),
        // Flatten introduction if complex
        introduction: typeof knowledgeSheetData.introduction === 'object' 
          ? JSON.stringify(knowledgeSheetData.introduction) 
          : knowledgeSheetData.introduction,
        // Flatten objectives if complex
        objectives: typeof knowledgeSheetData.objectives === 'object'
          ? JSON.stringify(knowledgeSheetData.objectives)
          : knowledgeSheetData.objectives,
        // Keep metadata and header as objects (they're shallow)
        lessonPlanId: lessonPlanId || null,
        teacherId: teacherId || null,
        courseId: courseId || null,
        status: 'published',
        style,
        language,
        // ✨ Add quality metadata
        qualityScore: validation.score,
        validationWarnings: validation.warnings,
        standaloneMode: standaloneMode || false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }

      // Save to Firestore
      const ksRef = await admin.firestore().collection('knowledgeSheets').add(firestoreData)

      // Update lesson plan with knowledge sheet reference (only if not standalone)
      if (lessonPlanId && !standaloneMode) {
        await admin.firestore().collection('lessonPlans').doc(lessonPlanId).update({
          knowledgeSheetId: ksRef.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      // Handle room assignment
      let finalRoomId = roomId
      if (createRoom && !roomId) {
        // Create new room for this course
        const roomData = {
          name: `${courseCode} - ${courseName}`,
          description: `ห้องกิจกรรมสำหรับรายวิชา ${courseName}`,
          courseId,
          teacherId,
          status: 'active',
          knowledgeSheetIds: [ksRef.id],
          worksheetIds: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }
        const roomRef = await admin.firestore().collection('learningRooms').add(roomData)
        finalRoomId = roomRef.id
      } else if (finalRoomId) {
        // Add to existing room
        await admin.firestore().collection('learningRooms').doc(finalRoomId).update({
          knowledgeSheetIds: admin.firestore.FieldValue.arrayUnion(ksRef.id),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      console.log('✅ Knowledge sheet created:', ksRef.id)

      return res.status(200).json({
        success: true,
        knowledgeSheetId: ksRef.id,
        knowledgeSheet: knowledgeSheetData,
        roomId: finalRoomId,
        // ✨ Include quality info
        quality: {
          score: validation.score,
          warnings: validation.warnings,
          isValid: validation.isValid
        },
        standaloneMode: standaloneMode || false
      })

    } catch (error) {
      console.error('❌ Error generating knowledge sheet:', error)
      return res.status(500).json({ 
        error: 'Failed to generate knowledge sheet',
        details: error.message 
      })
    }
  })
})

// ===== UNIT KNOWLEDGE SHEET GENERATOR =====
// สร้างใบความรู้รวมระดับหน่วย - รวบรวมจากทุกแผนในหน่วย
// ป้องกันเนื้อหาซ้ำซ้อนระหว่างแผน
exports.generateUnitKnowledgeSheet = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 300,  // Longer timeout for unit-level
  memory: '1GB'
}).https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
      }

      const {
        teacherId,
        courseId,
        courseCode,
        courseName,
        gradeLevel,
        unitNumber,
        unitName,
        lessonPlans,  // Array of lesson plans in this unit (full version)
        plansSummary, // Array of plan previews (from Curriculum Designer)
        essentialContent, // Unit's essential content
        unitLOs,      // Unit's learning outcomes
        allLearningOutcomes, // All course LOs
        standard,
        indicators,
        style = 'comprehensive',
        language = 'thai',
        // Room options
        createRoom = false,
        roomId = null,
        roomName = null
      } = req.body

      // Support both full lessonPlans and plansSummary (from Curriculum Designer)
      const hasFullPlans = lessonPlans?.length > 0
      const hasPreviewPlans = plansSummary?.length > 0
      
      if (!unitName || (!hasFullPlans && !hasPreviewPlans)) {
        return res.status(400).json({ error: 'unitName and (lessonPlans or plansSummary) are required' })
      }

      const planCount = hasFullPlans ? lessonPlans.length : plansSummary.length
      console.log('📚 Generating Unit Knowledge Sheet for:', unitName, 'with', planCount, 'plans', hasFullPlans ? '(full)' : '(preview)')

      // รวบรวมข้อมูลจากทุกแผน
      let plansOverview = ''
      
      if (hasFullPlans) {
        // Full lesson plans - extract detailed info
        plansOverview = lessonPlans.map((plan, idx) => {
          const content = plan.content || plan
          let objectives = ''
          if (content.objectives) {
            if (content.objectives.knowledge?.length) objectives += `K: ${content.objectives.knowledge.join(', ')} `
            if (content.objectives.process?.length) objectives += `P: ${content.objectives.process.join(', ')} `
            if (content.objectives.attitude?.length) objectives += `A: ${content.objectives.attitude.join(', ')}`
          }
          
          return `
แผนที่ ${plan.planNumber || idx + 1}: ${plan.topic || content.header?.topic}
- สาระสำคัญ: ${content.essentialContent || plan.essentialContent || '-'}
- จุดประสงค์: ${objectives || '-'}
- เนื้อหา: ${JSON.stringify(content.learningContent || []).slice(0, 500)}`
        }).join('\n---\n')
      } else {
        // Plan previews from Curriculum Designer - use available info
        plansOverview = plansSummary.map((plan, idx) => {
          const loDescriptions = (plan.los || []).map(loCode => {
            const lo = allLearningOutcomes?.find(l => l.code === loCode)
            return lo ? `${lo.code}: ${lo.description}` : loCode
          }).join(', ')
          
          return `
แผนที่ ${plan.planNumber || idx + 1}: ${plan.topic}
- เน้น A.R.C.E.: ${plan.arceFocus || 'ไม่ระบุ'}
- LO ที่เกี่ยวข้อง: ${loDescriptions || plan.los?.join(', ') || '-'}`
        }).join('\n---\n')
      }

      // รวบรวมคำศัพท์จากทุกแผน (only if full plans available)
      const allVocabulary = []
      if (hasFullPlans) {
        lessonPlans.forEach(plan => {
          const content = plan.content || plan
          if (content.vocabulary) allVocabulary.push(...content.vocabulary)
          if (content.learningContent) {
            content.learningContent.forEach(lc => {
              if (lc.vocabulary) allVocabulary.push(...lc.vocabulary)
            })
          }
        })
      }

      // Build LO context for preview mode
      const loContext = unitLOs?.length > 0 ? `
## 🎯 Learning Outcomes ของหน่วยนี้:
${unitLOs.map(loCode => {
  const lo = allLearningOutcomes?.find(l => l.code === loCode)
  return lo ? `- ${lo.code}: ${lo.description}` : `- ${loCode}`
}).join('\n')}
` : ''

      const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบหลักสูตรและสื่อการเรียนการสอน

## 🎯 งานของคุณ
สร้าง **ใบความรู้รวมระดับหน่วย** ที่ให้ภาพรวมของเนื้อหาทั้งหมดในหน่วย
${hasFullPlans ? 'รวบรวมจากทุกแผนในหน่วยนี้ โดยไม่ให้เนื้อหาซ้ำซ้อน' : 'สร้างจากโครงร่างแผนที่วางไว้ เพื่อให้นักเรียนเห็นภาพรวมก่อนเริ่มเรียน'}

## 📚 ข้อมูลหน่วยการเรียนรู้

**รายวิชา:** ${courseCode || ''} ${courseName || unitName}
**ระดับชั้น:** ${gradeLevel || 'ม.4'}
**หน่วยที่ ${unitNumber || 1}:** ${unitName}
**จำนวนแผน:** ${planCount} แผน
${essentialContent ? `**สาระสำคัญ:** ${essentialContent}` : ''}

${loContext}

${standard ? `**มาตรฐาน:** ${JSON.stringify(standard)}` : ''}
${indicators ? `**ตัวชี้วัด:** ${JSON.stringify(indicators)}` : ''}

---

## 📋 ภาพรวมแผนการสอนทั้งหมดในหน่วย:

${plansOverview}

---

## ⚙️ หลักการออกแบบใบความรู้รวมหน่วย:

1. **ไม่ซ้ำซ้อน**: จัดกลุ่มเนื้อหาที่คล้ายกันจากหลายแผนไว้ด้วยกัน
2. **ลำดับการเรียนรู้**: เริ่มจากพื้นฐาน → ซับซ้อน ตาม Bloom's Taxonomy
3. **เชื่อมโยง**: แสดงความสัมพันธ์ระหว่างเนื้อหาในแต่ละแผน
4. **ครอบคลุม**: มีเนื้อหาครบทุกจุดประสงค์ของหน่วย
5. **อ้างอิงแผน**: ระบุว่าแต่ละส่วนเกี่ยวข้องกับแผนใด

---

ตอบเป็น JSON (ห้าม markdown wrapper):

{
  "metadata": {
    "type": "unit",
    "title": "ใบความรู้รวมหน่วยที่ ${unitNumber}: ${unitName}",
    "courseCode": "${courseCode || ''}",
    "courseName": "${courseName || ''}",
    "unitNumber": ${unitNumber || 1},
    "unitName": "${unitName}",
    "gradeLevel": "${gradeLevel || 'ม.4'}",
    "totalPlans": ${planCount},
    "estimatedDuration": "${planCount * 50} นาที"
  },

  "unitOverview": {
    "description": "ภาพรวมหน่วยการเรียนรู้นี้ 3-4 ประโยค",
    "bigIdea": "แนวคิดหลักของหน่วย (Big Idea)",
    "essentialQuestions": [
      "คำถามสำคัญที่นักเรียนควรตอบได้หลังเรียนจบหน่วย 1",
      "คำถามสำคัญ 2",
      "คำถามสำคัญ 3"
    ],
    "learningProgression": [
      {"planNumber": 1, "focus": "เน้นอะไรในแผน 1", "builds": "ต่อยอดจาก..."},
      {"planNumber": 2, "focus": "เน้นอะไรในแผน 2", "builds": "ต่อยอดจากแผน 1"},
      ...
    ]
  },

  "objectives": {
    "unitObjective": "จุดประสงค์รวมของหน่วย (เมื่อจบหน่วยนี้ นักเรียนจะสามารถ...)",
    "byPlan": [
      {"planNumber": 1, "objectives": ["จุดประสงค์แผน 1"]},
      {"planNumber": 2, "objectives": ["จุดประสงค์แผน 2"]},
      ...
    ]
  },

  "coreConcepts": [
    {
      "id": "concept_1",
      "name": "แนวคิดหลักที่ 1",
      "description": "คำอธิบายแนวคิด",
      "relatedPlans": [1, 2],
      "prerequisite": null,
      "importance": "สำคัญอย่างไร"
    },
    {
      "id": "concept_2",
      "name": "แนวคิดหลักที่ 2",
      "description": "คำอธิบาย",
      "relatedPlans": [2, 3],
      "prerequisite": "concept_1",
      "importance": "ต่อยอดจาก concept_1"
    }
  ],

  "sections": [
    {
      "sectionNumber": 1,
      "title": "ส่วนที่ 1: ความรู้พื้นฐาน",
      "relatedPlans": [1],
      "bloomLevel": 1,
      "content": {
        "mainContent": "เนื้อหาพื้นฐานที่ต้องรู้ก่อน (รวมจากแผนที่เกี่ยวข้อง ไม่ซ้ำ)",
        "keyPoints": ["จุดสำคัญ 1", "จุดสำคัญ 2"]
      },
      "examples": [{"title": "ตัวอย่าง", "scenario": "...", "analysis": "..."}],
      "diagrams": [{"type": "flowchart", "title": "...", "description": "..."}]
    },
    {
      "sectionNumber": 2,
      "title": "ส่วนที่ 2: หลักการและแนวคิด",
      "relatedPlans": [1, 2],
      "bloomLevel": 2,
      "content": {
        "mainContent": "หลักการสำคัญ (รวมจากหลายแผน จัดเรียงให้เข้าใจง่าย)",
        "keyPoints": ["หลักการ 1", "หลักการ 2"]
      }
    },
    {
      "sectionNumber": 3,
      "title": "ส่วนที่ 3: การประยุกต์ใช้",
      "relatedPlans": [2, 3],
      "bloomLevel": 3,
      "content": {
        "mainContent": "วิธีนำความรู้ไปใช้",
        "keyPoints": ["วิธีใช้ 1", "วิธีใช้ 2"]
      }
    },
    {
      "sectionNumber": 4,
      "title": "ส่วนที่ 4: การวิเคราะห์และประเมิน",
      "relatedPlans": [3],
      "bloomLevel": 4,
      "content": {
        "mainContent": "การวิเคราะห์และประเมินผล",
        "keyPoints": ["แนวทางวิเคราะห์ 1", "แนวทาง 2"]
      }
    }
  ],

  "vocabulary": [
    {
      "term": "คำศัพท์ 1",
      "thai": "คำแปล",
      "definition": "ความหมาย",
      "firstIntroducedIn": 1
    }
  ],

  "conceptMap": {
    "central": "${unitName}",
    "branches": [
      {
        "concept": "แนวคิดหลัก 1",
        "plans": [1],
        "subtopics": ["หัวข้อย่อย 1.1", "หัวข้อย่อย 1.2"],
        "connections": ["เชื่อมโยงกับแนวคิด 2"]
      },
      {
        "concept": "แนวคิดหลัก 2",
        "plans": [1, 2],
        "subtopics": ["หัวข้อย่อย 2.1"],
        "connections": ["ต่อยอดจากแนวคิด 1"]
      }
    ]
  },

  "hotsIntegration": {
    "byPlan": [
      {
        "planNumber": 1,
        "arceFocus": ["reasoning"],
        "sampleQuestions": ["คำถาม HOTS สำหรับแผน 1"]
      },
      {
        "planNumber": 2,
        "arceFocus": ["analysis", "reasoning"],
        "sampleQuestions": ["คำถาม HOTS สำหรับแผน 2"]
      }
    ],
    "unitLevel": {
      "analysisQuestions": ["คำถามวิเคราะห์ระดับหน่วย 1", "คำถาม 2"],
      "reasoningQuestions": ["คำถามเหตุผลระดับหน่วย 1"],
      "creativityQuestions": ["คำถามสร้างสรรค์ระดับหน่วย 1"],
      "evidenceQuestions": ["คำถามหลักฐานระดับหน่วย 1"]
    }
  },

  "selfCheck": {
    "byPlan": [
      {"planNumber": 1, "questions": ["คำถามตรวจสอบแผน 1"]},
      {"planNumber": 2, "questions": ["คำถามตรวจสอบแผน 2"]}
    ],
    "unitSummary": {
      "questions": [
        {"question": "คำถามสรุปความเข้าใจหน่วย 1", "answer": "แนวคำตอบ"},
        {"question": "คำถามสรุปความเข้าใจหน่วย 2", "answer": "แนวคำตอบ"}
      ],
      "trueOrFalse": [
        {"statement": "ข้อความ 1", "answer": true, "explanation": "อธิบาย"}
      ]
    }
  },

  "planGuidance": [
    {
      "planNumber": 1,
      "focusAreas": ["เนื้อหาเฉพาะที่ควรเน้นในแผน 1 (ไม่ซ้ำกับแผนอื่น)"],
      "avoidDuplication": ["เนื้อหาที่ไม่ต้องสอนซ้ำเพราะอยู่ในแผนอื่น"],
      "prerequisiteFromUnit": ["ความรู้พื้นฐานจากใบความรู้รวมหน่วยที่ต้องอ้างอิง"],
      "uniqueContribution": "สิ่งที่แผนนี้เพิ่มเติมให้หน่วยโดยเฉพาะ"
    },
    {
      "planNumber": 2,
      "focusAreas": ["เนื้อหาเฉพาะแผน 2"],
      "avoidDuplication": ["ไม่ต้องสอนซ้ำจากแผน 1"],
      "prerequisiteFromUnit": ["อ้างอิง concept_1 จากใบความรู้หน่วย"],
      "uniqueContribution": "..."
    }
  ]
}`

      const openaiResponse = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบหลักสูตร (Curriculum Design Expert)

หน้าที่หลัก: วิเคราะห์แผนการสอนทั้งหมดในหน่วย → สร้างใบความรู้รวมที่:
1. ไม่มีเนื้อหาซ้ำซ้อน
2. แสดงความเชื่อมโยงระหว่างแผน
3. จัดลำดับการเรียนรู้ตาม Bloom's Taxonomy
4. ให้ guidance ว่าแต่ละแผนควรเน้นอะไร

ตอบเป็น JSON เท่านั้น ห้ามมี markdown wrapper`
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 8000,
        temperature: 0.7
      })

      let responseText = openaiResponse.choices[0].message.content.trim()
      
      // Clean markdown wrapper
      if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```(?:json)?\s*\n?/i, '')
        responseText = responseText.replace(/\n?```\s*$/i, '')
      }

      let unitKsData = JSON.parse(responseText)
      
      // Add metadata
      const ksId = `unit_ks_${Date.now()}`
      unitKsData.metadata = {
        ...unitKsData.metadata,
        id: ksId,
        type: 'unit',
        generatedBy: 'AI',
        generatedAt: new Date().toISOString()
      }

      // Flatten for Firestore
      const firestoreData = {
        ...unitKsData,
        sections: JSON.stringify(unitKsData.sections || []),
        vocabulary: JSON.stringify(unitKsData.vocabulary || []),
        hotsIntegration: JSON.stringify(unitKsData.hotsIntegration || {}),
        selfCheck: JSON.stringify(unitKsData.selfCheck || {}),
        conceptMap: JSON.stringify(unitKsData.conceptMap || {}),
        coreConcepts: JSON.stringify(unitKsData.coreConcepts || []),
        planGuidance: JSON.stringify(unitKsData.planGuidance || []),
        unitOverview: JSON.stringify(unitKsData.unitOverview || {}),
        objectives: JSON.stringify(unitKsData.objectives || {}),
        teacherId: teacherId || null,
        courseId: courseId || null,
        status: 'published',
        style,
        language,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }

      // Save to Firestore
      const ksRef = await admin.firestore().collection('unitKnowledgeSheets').add(firestoreData)

      // Update all lesson plans with reference to unit knowledge sheet (only if full plans exist)
      if (hasFullPlans && lessonPlans?.length > 0) {
        const batch = admin.firestore().batch()
        lessonPlans.forEach(plan => {
          if (plan.id) {
            const planRef = admin.firestore().collection('lessonPlans').doc(plan.id)
            batch.update(planRef, {
              unitKnowledgeSheetId: ksRef.id,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            })
          }
        })
        await batch.commit()
      }

      // ✨ Handle Learning Room (create or update)
      let finalRoomId = roomId
      let roomInfo = null

      if (createRoom || roomId) {
        try {
          if (createRoom && !roomId) {
            // Create new learning room for the unit
            const newRoomData = {
              name: roomName || `ห้องกิจกรรม: หน่วยที่ ${unitNumber} - ${unitName}`,
              description: `ห้องกิจกรรมการเรียนรู้สำหรับหน่วยที่ ${unitNumber}: ${unitName}`,
              teacherId: teacherId || null,
              courseId: courseId || null,
              courseCode,
              courseName,
              gradeLevel,
              unitNumber,
              unitName,
              status: 'active',
              materials: [{
                type: 'unitKnowledgeSheet',
                id: ksRef.id,
                title: `ใบความรู้รวมหน่วยที่ ${unitNumber}`,
                addedAt: new Date().toISOString()
              }],
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }

            const roomRef = await admin.firestore().collection('learningRooms').add(newRoomData)
            finalRoomId = roomRef.id
            roomInfo = { id: roomRef.id, name: newRoomData.name, isNew: true }

            console.log('✅ Created new learning room:', roomRef.id)
          } else if (roomId) {
            // Add to existing room
            const roomRef = admin.firestore().collection('learningRooms').doc(roomId)
            const roomDoc = await roomRef.get()

            if (roomDoc.exists) {
              const existingMaterials = roomDoc.data().materials || []
              
              // Check if unit knowledge sheet already exists in materials
              const alreadyExists = existingMaterials.some(
                m => m.type === 'unitKnowledgeSheet' && m.id === ksRef.id
              )

              if (!alreadyExists) {
                await roomRef.update({
                  materials: admin.firestore.FieldValue.arrayUnion({
                    type: 'unitKnowledgeSheet',
                    id: ksRef.id,
                    title: `ใบความรู้รวมหน่วยที่ ${unitNumber}`,
                    addedAt: new Date().toISOString()
                  }),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                })
              }

              roomInfo = { id: roomId, name: roomDoc.data().name, isNew: false }
              console.log('✅ Added unit knowledge sheet to existing room:', roomId)
            }
          }

          // Update the unit knowledge sheet with room reference
          if (finalRoomId) {
            await ksRef.update({
              roomId: finalRoomId,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            })
          }
        } catch (roomError) {
          console.error('Warning: Could not handle learning room:', roomError)
          // Don't fail the whole operation, just log the warning
        }
      }

      console.log('✅ Unit Knowledge Sheet created:', ksRef.id)

      return res.status(200).json({
        success: true,
        unitKnowledgeSheetId: ksRef.id,
        unitKnowledgeSheet: unitKsData,
        planGuidance: unitKsData.planGuidance,
        room: roomInfo
      })

    } catch (error) {
      console.error('❌ Error generating unit knowledge sheet:', error)
      return res.status(500).json({ 
        error: 'Failed to generate unit knowledge sheet',
        details: error.message 
      })
    }
  })
})

// ========================================
// 📄 Batch Generate Knowledge Sheets for Multiple Plans
// ========================================
exports.generateBatchKnowledgeSheets = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 540,  // 9 minutes for multiple plans
  memory: '2GB'
}).https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
      }

      const {
        teacherId,
        courseId,
        courseCode,
        courseName,
        gradeLevel,
        unitNumber,
        unitName,
        lessonPlans,  // Array of lesson plans to generate knowledge sheets for
        style = 'comprehensive',
        language = 'thai',
        // ✨ NEW: Parallel processing options
        parallelLimit = 2,  // Process 2 at a time to balance speed vs rate limits
        maxRetries = 2
      } = req.body

      if (!lessonPlans || lessonPlans.length === 0) {
        return res.status(400).json({ error: 'Lesson plans are required' })
      }

      console.log(`📚 Batch generating ${lessonPlans.length} knowledge sheets for unit ${unitNumber} (parallel: ${parallelLimit})`)

      const results = []
      const errors = []

      // ✨ Helper function to generate a single knowledge sheet
      async function generateSingleSheet(plan, index, otherPlans) {
        console.log(`📖 Generating sheet ${index + 1}/${lessonPlans.length}: ${plan.topic}`)

        // สร้าง context จากแผนอื่นในหน่วย
        const otherPlansContext = otherPlans.length > 0 ? `
## 📚 แผนอื่นในหน่วยเดียวกัน:
${otherPlans.map(p => `- แผนที่ ${p.planNumber}: ${p.topic}`).join('\n')}

**หลักการสำคัญ**: 
1. ใบความรู้นี้ต้อง **ครบถ้วน** ตามเนื้อหาของแผนที่ ${plan.planNumber}
2. ห้ามตัดเนื้อหาสำคัญออก แม้จะอยู่ในแผนอื่นด้วย
3. ให้เน้น "จุดเด่นเฉพาะ" และ "มุมมองที่ต่าง" จากแผนอื่น
` : ''

        // สร้าง context จากกิจกรรม 5E
        let activities5EText = ''
        const activities5E = plan.activities5E || plan.content?.activities5E
        if (activities5E) {
          const phaseNames = {
            engagement: 'กระตุ้นความสนใจ',
            exploration: 'สำรวจค้นหา', 
            explanation: 'อธิบายความรู้',
            elaboration: 'ขยายความเข้าใจ',
            evaluation: 'ประเมินผล'
          }
          for (const phase of ['engagement', 'exploration', 'explanation', 'elaboration', 'evaluation']) {
            if (activities5E[phase]) {
              const act = activities5E[phase]
              activities5EText += `\n${phaseNames[phase]}: ${act.activity || act.description || JSON.stringify(act)}`
            }
          }
        }

        // สร้าง context จาก objectives
        let objectivesText = ''
        const objectives = plan.objectives || plan.content?.objectives
        if (objectives) {
          if (typeof objectives === 'object' && !Array.isArray(objectives)) {
            if (objectives.knowledge?.length) objectivesText += `\nความรู้ (K): ${objectives.knowledge.join(', ')}`
            if (objectives.process?.length) objectivesText += `\nทักษะ (P): ${objectives.process.join(', ')}`
            if (objectives.attitude?.length) objectivesText += `\nเจตคติ (A): ${objectives.attitude.join(', ')}`
          } else if (Array.isArray(objectives)) {
            objectivesText = objectives.join(', ')
          }
        }

        // สร้าง context จาก learningContent
        let learningContentText = ''
        const learningContent = plan.learningContent || plan.content?.learningContent
        if (learningContent) {
          if (Array.isArray(learningContent)) {
            learningContentText = learningContent.map((c, idx) => `${idx + 1}. ${typeof c === 'string' ? c : c.title || c.content || JSON.stringify(c)}`).join('\n')
          } else if (typeof learningContent === 'object') {
            learningContentText = JSON.stringify(learningContent, null, 2)
          } else {
            learningContentText = learningContent
          }
        }

        const essentialContent = plan.essentialContent || plan.content?.essentialContent
        const topic = plan.topic || plan.title

        const prompt = `คุณเป็นครูผู้เชี่ยวชาญด้านการสร้างใบความรู้ที่มีคุณภาพสูง

## 📋 ข้อมูลแผนการสอน

**รายวิชา:** ${courseCode || ''} ${courseName || topic}
**ระดับชั้น:** ${gradeLevel || 'ม.4'}
**หน่วยที่ ${unitNumber || 1}:** ${unitName || topic}
**แผนที่ ${plan.planNumber || 1}:** ${topic}

**สาระสำคัญ:**
${essentialContent || 'ตามหัวข้อที่กำหนด'}

**จุดประสงค์การเรียนรู้:**
${objectivesText || 'ตามแผนการสอน'}

**เนื้อหาการเรียนรู้:**
${learningContentText || 'ตามหัวข้อที่กำหนด'}

**กิจกรรม 5E:**
${activities5EText || 'ไม่ระบุ'}

${otherPlansContext}

---

## 🎯 สร้างใบความรู้ที่ครบถ้วนตาม JSON Schema นี้:

{
  "metadata": {
    "title": "ใบความรู้ที่ ${plan.planNumber || 1}: ${topic}",
    "courseCode": "${courseCode || ''}",
    "courseName": "${courseName || ''}",
    "unitNumber": ${unitNumber || 1},
    "unitName": "${unitName || ''}",
    "planNumber": ${plan.planNumber || 1},
    "gradeLevel": "${gradeLevel || 'ม.4'}",
    "duration": "50 นาที"
  },

  "objectives": {
    "mainObjective": "จุดประสงค์หลักที่ชัดเจน 1 ประโยค",
    "subObjectives": ["K objective", "P objective", "A objective"]
  },

  "introduction": {
    "hook": "คำถามหรือสถานการณ์กระตุ้นความอยากรู้",
    "overview": "ภาพรวมของเนื้อหา",
    "priorKnowledge": ["ความรู้พื้นฐานที่ควรมี"],
    "connectionToUnit": "เชื่อมโยงกับหน่วยการเรียนรู้อย่างไร"
  },

  "sections": [
    {
      "sectionNumber": 1,
      "title": "หัวข้อที่ 1",
      "bloomLevel": 1,
      "content": {
        "mainContent": "เนื้อหาหลัก 3-4 ย่อหน้า ครบถ้วนตามหลักวิชาการ",
        "keyPoints": ["ประเด็นสำคัญ 1", "ประเด็นสำคัญ 2", "ประเด็นสำคัญ 3"],
        "explanation": "คำอธิบายเพิ่มเติม"
      },
      "examples": [{"title": "", "scenario": "", "analysis": ""}],
      "diagrams": [{"type": "flowchart", "title": "", "description": ""}],
      "realWorldApplications": ["การใช้ในชีวิตจริง"]
    }
  ],

  "vocabulary": [
    {"term": "English Term", "thai": "คำแปล", "definition": "คำจำกัดความ"}
  ],

  "hotsIntegration": {
    "analysisQuestions": ["คำถามวิเคราะห์ (A)"],
    "reasoningQuestions": ["คำถามเหตุผล (R)"],
    "creativityQuestions": ["คำถามสร้างสรรค์ (C)"],
    "evidenceQuestions": ["คำถามหลักฐาน (E)"]
  },

  "summary": {
    "keyTakeaways": ["สิ่งสำคัญที่ต้องจำ 1", "สิ่งสำคัญ 2", "สิ่งสำคัญ 3"],
    "mindMap": {
      "central": "${topic}",
      "branches": [{"topic": "หัวข้อย่อย", "subtopics": ["รายละเอียด"]}]
    }
  },

  "selfCheck": {
    "questions": [
      {"question": "คำถามทดสอบ", "bloomLevel": 1, "hint": "คำใบ้", "answer": "คำตอบ"}
    ],
    "trueOrFalse": [
      {"statement": "ข้อความ", "answer": true, "explanation": "อธิบาย"}
    ]
  }
}

**สำคัญมาก**: 
- ใบความรู้ต้องครบถ้วนตามหลักวิชาการ ไม่ตัดเนื้อหาสำคัญออก
- ควรมี sections อย่างน้อย 3-4 sections ครอบคลุมเนื้อหาทั้งหมด
- แต่ละ section ต้องมี mainContent ที่อธิบายละเอียด

ตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown code block`

        // ✨ Call OpenAI with retry
        const openaiResponse = await retryWithBackoff(async () => {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey.value()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'คุณเป็นผู้เชี่ยวชาญด้านการศึกษาและการสร้างสื่อการสอน ตอบเป็น JSON เท่านั้น ห้ามมี markdown wrapper' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 8000
            })
          })
          
          if (!response.ok) {
            const err = new Error(`OpenAI error: ${response.status}`)
            err.status = response.status
            throw err
          }
          return response
        }, maxRetries)

        const openaiData = await openaiResponse.json()
        let responseText = openaiData.choices?.[0]?.message?.content

        // ✨ Enhanced cleaning
        let cleanedText = responseText.trim()
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
        }
        if (!cleanedText.startsWith('{')) {
          const jsonStart = cleanedText.indexOf('{')
          if (jsonStart > -1) cleanedText = cleanedText.substring(jsonStart)
        }
        if (!cleanedText.endsWith('}')) {
          const jsonEnd = cleanedText.lastIndexOf('}')
          if (jsonEnd > -1) cleanedText = cleanedText.substring(0, jsonEnd + 1)
        }

        const knowledgeSheet = JSON.parse(cleanedText)
        
        // ✨ Auto-fix and validate
        const fixedSheet = autoFixKnowledgeSheet(knowledgeSheet, topic)
        const validation = validateKnowledgeSheet(fixedSheet)

        // Save to Firestore
        const ksRef = await admin.firestore().collection('knowledgeSheets').add({
          lessonPlanId: plan.id,
          teacherId,
          courseId,
          courseCode,
          courseName,
          gradeLevel,
          unitNumber,
          unitName,
          planNumber: plan.planNumber,
          topic: topic,
          content: fixedSheet,
          status: 'published',
          style,
          language,
          batchGenerated: true,
          qualityScore: validation.score,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })

        // Update lesson plan with reference
        if (plan.id) {
          await admin.firestore().collection('lessonPlans').doc(plan.id).update({
            knowledgeSheetId: ksRef.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          })
        }

        console.log(`✅ Sheet ${index + 1} created: ${ksRef.id} (quality: ${validation.score})`)
        
        return {
          planId: plan.id,
          planNumber: plan.planNumber,
          topic: topic,
          knowledgeSheetId: ksRef.id,
          qualityScore: validation.score,
          success: true
        }
      }

      // ✨ Process in parallel batches
      async function processBatch(batch, startIndex) {
        return Promise.all(
          batch.map((plan, batchIndex) => {
            const globalIndex = startIndex + batchIndex
            const otherPlans = lessonPlans.filter((_, idx) => idx !== globalIndex)
            return generateSingleSheet(plan, globalIndex, otherPlans)
              .catch(err => ({
                planId: plan.id,
                planNumber: plan.planNumber,
                topic: plan.topic || plan.title,
                error: err.message,
                success: false
              }))
          })
        )
      }

      // Split into batches and process
      for (let i = 0; i < lessonPlans.length; i += parallelLimit) {
        const batch = lessonPlans.slice(i, i + parallelLimit)
        const batchResults = await processBatch(batch, i)
        
        batchResults.forEach(result => {
          if (result.success) {
            results.push(result)
          } else {
            errors.push(result)
          }
        })
        
        // Small delay between batches to avoid rate limiting
        if (i + parallelLimit < lessonPlans.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      console.log(`📚 Batch complete: ${results.length} success, ${errors.length} errors`)

      return res.status(200).json({
        success: true,
        totalPlans: lessonPlans.length,
        successCount: results.length,
        errorCount: errors.length,
        averageQuality: results.length > 0 
          ? Math.round(results.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / results.length)
          : 0,
        results,
        errors
      })

    } catch (error) {
      console.error('❌ Error in batch generation:', error)
      return res.status(500).json({ 
        error: 'Failed to batch generate knowledge sheets',
        details: error.message 
      })
    }
  })
})
