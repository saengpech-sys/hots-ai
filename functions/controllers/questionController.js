/**
 * ❓ Question Controller
 * Handles question-related operations including:
 * - HOTS question generation
 * - Question quality validation
 * - Fallback question generation
 * - Solution generation
 * 
 * @module controllers/questionController
 */

const functions = require('firebase-functions')
const cors = require('cors')({ origin: true })
const { db, FieldValue } = require('../shared/firebase')
const { verifyTeacherRole } = require('../shared/auth')
const { getOpenAIClient, openaiApiKeySecret, parseGPTJSON } = require('../shared/openai')

// Import question quality checker
const {
  analyzeQuestionQuality,
  suggestHOTSTransformation
} = require('../utils/questionQualityChecker')

// =============================================================================
// 🎯 HOTS QUESTION GENERATION
// =============================================================================

/**
 * Generate HOTS questions using AI
 * Based on Learning Outcomes and course context
 * 🔐 SECURED: Teacher/Admin only
 */
exports.generateHOTSQuestion = functions
  .runWith({ secrets: [openaiApiKeySecret] })
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      try {
        if (req.method !== 'POST') {
          return res.status(405).send({ error: 'Method not allowed' })
        }

        // 🔐 RBAC: Verify teacher/admin role
        const caller = await verifyTeacherRole(req, res)
        if (!caller) return

        const { courseId, courseName, learningOutcomes, questionCount = 1 } = req.body

        if (!courseId || !learningOutcomes || learningOutcomes.length === 0) {
          return res.status(400).send({
            error: 'Missing required fields: courseId, learningOutcomes'
          })
        }

        let openaiClient
        try {
          openaiClient = getOpenAIClient()
        } catch (err) {
          return res.status(500).send({ error: 'OpenAI API not configured' })
        }

        // Build LO list for prompt
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

        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18'

        const completion = await openaiClient.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert in educational assessment and HOTS question design. You create engaging, thought-provoking questions in Thai language. Always respond with valid JSON.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 1500
        })

        const responseText = completion.choices[0].message.content
        const result = parseGPTJSON(responseText, 'generateHOTSQuestion')

        // Validate generated questions
        const validatedQuestions = []
        for (const q of (result.questions || [])) {
          const qualityReport = analyzeQuestionQuality(q.question, {
            hint: q.hint,
            category: q.category,
            relatedLOs: q.relatedLOs
          })
          
          validatedQuestions.push({
            ...q,
            qualityMetrics: {
              bloomLevel: qualityReport.bloomsAnalysis?.level || qualityReport.bloomsLevel || 1,
              hotsScore: qualityReport.hotsScore,
              issues: qualityReport.issues?.slice(0, 3) || [],
              passesHOTSThreshold: qualityReport.hotsScore >= 70
            }
          })
        }

        return res.status(200).json({
          success: true,
          questions: validatedQuestions
        })

      } catch (error) {
        console.error('Generate HOTS Question error:', error)
        
        if (error.status === 429 || error.code === 'insufficient_quota') {
          return res.status(429).send({
            error: 'OpenAI API quota exceeded',
            message: 'เครดิต OpenAI API หมดแล้ว กรุณาใช้ "สร้างคำถามเอง" แทน',
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

// =============================================================================
// ✅ QUESTION QUALITY VALIDATION
// =============================================================================

/**
 * Validate question quality before saving
 * Checks if a question meets HOTS standards
 */
exports.validateQuestionQuality = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { question, hint, category, relatedLOs } = req.body

      if (!question) {
        return res.status(400).send({ error: 'Missing required field: question' })
      }

      const qualityReport = analyzeQuestionQuality(question, {
        hint, category, relatedLOs
      })

      const passesThreshold = qualityReport.hotsScore >= 70
      const needsImprovement = qualityReport.hotsScore < 50

      let transformationSuggestions = null
      if (needsImprovement && (qualityReport.bloomsAnalysis?.level || qualityReport.bloomsLevel || 1) <= 3) {
        transformationSuggestions = suggestHOTSTransformation(question, qualityReport)
      }

      return res.status(200).json({
        success: true,
        valid: passesThreshold,
        hotsScore: qualityReport.hotsScore,
        bloomLevel: qualityReport.bloomsAnalysis?.level || qualityReport.bloomsLevel || 1,
        bloomCategory: qualityReport.bloomsAnalysis?.levelName || 'remember',
        cognitiveComplexity: qualityReport.cognitiveComplexity,
        issues: qualityReport.issues || [],
        strengths: qualityReport.strengths || [],
        suggestions: transformationSuggestions,
        recommendation: passesThreshold 
          ? '✅ คำถามนี้เหมาะสำหรับประเมิน HOTS'
          : needsImprovement
            ? '⚠️ คำถามนี้ยังไม่ถึงมาตรฐาน HOTS แนะนำให้ปรับปรุง'
            : '📝 คำถามนี้พอใช้ได้ แต่ควรปรับให้ท้าทายขึ้น'
      })

    } catch (error) {
      console.error('Validate Question Quality error:', error)
      return res.status(500).send({
        error: 'Internal server error',
        message: error.message
      })
    }
  })
})

// =============================================================================
// 🔄 FALLBACK QUESTION GENERATION
// =============================================================================

/**
 * Generate a fallback question when question pool is exhausted
 * Uses weak LOs to create a targeted HOTS question on-the-fly
 */
exports.generateFallbackQuestion = functions
  .runWith({ secrets: [openaiApiKeySecret] })
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      try {
        if (req.method !== 'POST') {
          return res.status(405).send({ error: 'Method not allowed' })
        }

        const { courseId, courseName, weakLOs, studentGrade, learningOutcomes } = req.body

        if (!courseId || !weakLOs || weakLOs.length === 0) {
          return res.status(400).send({
            error: 'Missing required fields: courseId, weakLOs (array of LO codes)'
          })
        }

        let openaiClient
        try {
          openaiClient = getOpenAIClient()
        } catch (err) {
          return res.status(500).send({ error: 'OpenAI API not configured' })
        }

        // Get LO details
        const loDetails = (learningOutcomes || [])
          .filter(lo => weakLOs.includes(lo.code))
          .map(lo => `${lo.code}: ${lo.description}`)
          .join('\n')

        const prompt = `สร้างคำถาม HOTS 1 ข้อ สำหรับนักเรียนที่ยังไม่ผ่าน Learning Outcomes ต่อไปนี้:

รายวิชา: ${courseName || 'ไม่ระบุ'}
ระดับชั้น: ${studentGrade || 'มัธยมศึกษา'}

Learning Outcomes ที่ยังไม่ผ่าน:
${loDetails || weakLOs.join(', ')}

สร้างคำถามที่:
1. เน้น LO ที่นักเรียนยังอ่อน
2. ท้าทายแต่ไม่ยากเกินไป
3. กระตุ้นให้คิดวิเคราะห์และให้เหตุผล
4. ใช้ภาษาไทยที่เข้าใจง่าย

ตอบเป็น JSON:
{
  "question": "คำถาม",
  "hint": "คำใบ้",
  "category": "หมวดหมู่",
  "relatedLOs": ["LO codes"],
  "difficulty": "medium",
  "expectedSkills": ["analysis", "reasoning"]
}`

        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18'

        const completion = await openaiClient.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert educator creating adaptive HOTS questions. Always respond with valid JSON in Thai.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 1000
        })

        const responseText = completion.choices[0].message.content
        const result = parseGPTJSON(responseText, 'generateFallbackQuestion')

        // Validate the generated question
        const qualityReport = analyzeQuestionQuality(result.question, {
          hint: result.hint,
          category: result.category,
          relatedLOs: result.relatedLOs
        })

        return res.status(200).json({
          success: true,
          question: {
            ...result,
            qualityMetrics: {
              bloomLevel: qualityReport.bloomsAnalysis?.level || qualityReport.bloomsLevel || 1,
              hotsScore: qualityReport.hotsScore,
              issues: qualityReport.issues?.slice(0, 3) || [],
              passesHOTSThreshold: qualityReport.hotsScore >= 70
            }
          },
          source: 'ai_fallback',
          reason: 'question_pool_exhausted_for_weak_los'
        })

      } catch (error) {
        console.error('Generate Fallback Question error:', error)
        return res.status(500).send({
          error: 'Internal server error',
          message: error.message
        })
      }
    })
  })

// =============================================================================
// 📝 SOLUTION GENERATION
// =============================================================================

/**
 * Generate solution (เฉลย) for a question using AI
 * Creates a model answer that would score maximum points
 * 🔐 SECURED: Teacher/Admin only - Students should NOT access this!
 */
exports.generateSolution = functions
  .runWith({ secrets: [openaiApiKeySecret] })
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      try {
        if (req.method !== 'POST') {
          return res.status(405).send({ error: 'Method not allowed' })
        }

        // 🔐 RBAC: Verify teacher/admin role - CRITICAL for exam security!
        const caller = await verifyTeacherRole(req, res)
        if (!caller) return
        console.log(`📝 generateSolution called by ${caller.role}: ${caller.uid}`)

        const { questionId, question, hint, category, relatedLOs, courseContext } = req.body

        if (!question) {
          return res.status(400).send({ error: 'Missing required field: question' })
        }

        let openaiClient
        try {
          openaiClient = getOpenAIClient()
        } catch (err) {
          return res.status(500).send({ error: 'OpenAI API not configured' })
        }

        // Build context
        let contextInfo = `คำถาม: ${question}\n`
        if (hint) contextInfo += `คำใบ้: ${hint}\n`
        if (category) contextInfo += `หมวดหมู่: ${category}\n`
        if (relatedLOs?.length > 0) {
          contextInfo += `Learning Outcomes: ${relatedLOs.join(', ')}\n`
        }
        if (courseContext) contextInfo += `บริบทรายวิชา: ${courseContext}\n`

        const prompt = `คุณเป็นนักเรียนที่มีความสามารถสูง กำลังทำข้อสอบ HOTS และต้องการตอบให้ได้คะแนนเต็ม

${contextInfo}

**เกณฑ์การให้คะแนน (รวม 20 คะแนน):**
1. การวิเคราะห์ (Analysis) - 5 คะแนน
2. การให้เหตุผล (Reasoning) - 5 คะแนน
3. ความคิดสร้างสรรค์ (Creativity) - 5 คะแนน
4. การใช้หลักฐาน (Evidence) - 5 คะแนน

**คำสั่ง:**
เขียนคำตอบที่ได้คะแนนเต็ม 20/20 คะแนน แสดงทักษะการคิดขั้นสูงครบทั้ง 4 ด้าน

ตอบกลับในรูปแบบ JSON:
{
  "answer": "คำตอบที่ได้คะแนนเต็ม",
  "analysis": {
    "analysisScore": 5,
    "analysisExplanation": "อธิบาย",
    "reasoningScore": 5,
    "reasoningExplanation": "อธิบาย",
    "creativityScore": 5,
    "creativityExplanation": "อธิบาย",
    "evidenceScore": 5,
    "evidenceExplanation": "อธิบาย"
  },
  "keyPoints": ["ประเด็นสำคัญ 1", "ประเด็นสำคัญ 2"],
  "teacherNotes": "คำแนะนำสำหรับครู"
}`

        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18'

        const completion = await openaiClient.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert student providing exemplary HOTS answers. Always respond with valid JSON in Thai.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2500
        })

        const responseText = completion.choices[0].message.content
        const result = parseGPTJSON(responseText, 'generateSolution')

        // Save solution to Firestore
        if (questionId) {
          try {
            await db.collection('questions').doc(questionId).update({
              hasSolution: true,
              solution: {
                answer: result.answer,
                analysis: result.analysis,
                keyPoints: result.keyPoints || [],
                teacherNotes: result.teacherNotes || '',
                generatedAt: FieldValue.serverTimestamp(),
                aiModel: model
              }
            })
            console.log(`Solution saved for question ${questionId}`)
          } catch (error) {
            console.error('Error saving solution:', error)
          }
        }

        return res.status(200).json({
          success: true,
          solution: result
        })

      } catch (error) {
        console.error('Generate Solution error:', error)
        
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

module.exports = exports
