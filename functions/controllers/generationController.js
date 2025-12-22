/**
 * Generation Controller
 * AI Generation Functions (Lesson Plans, Worksheets, Questions, Solutions, etc.)
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })
const OpenAI = require('openai')
const { parseAIResponse } = require('../utils/aiParser')

const getDb = () => admin.firestore()
const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Generate Lesson Plan
 */
exports.generateLessonPlan = functions
  .runWith({ memory: '1GB', timeoutSeconds: 300 })
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      try {
        const { 
          subject, 
          topic, 
          grade, 
          duration = 50,
          learningOutcomes = [],
          teachingMethod = '5E',
          customRequirements = ''
        } = req.body

        if (!subject || !topic || !grade) {
          return res.status(400).send({ error: 'Missing required fields' })
        }

        const openai = getOpenAI()
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

        const prompt = `สร้างแผนการสอนวิชา ${subject} หัวข้อ "${topic}" สำหรับชั้น ${grade} เวลา ${duration} นาที

รูปแบบการสอน: ${teachingMethod}
ผลการเรียนรู้ที่คาดหวัง: ${learningOutcomes.length > 0 ? learningOutcomes.join(', ') : 'กำหนดตามความเหมาะสม'}
${customRequirements ? `ข้อกำหนดเพิ่มเติม: ${customRequirements}` : ''}

ตอบในรูปแบบ JSON:
{
  "title": "ชื่อแผนการสอน",
  "subject": "วิชา",
  "topic": "หัวข้อ",
  "grade": "ระดับชั้น",
  "duration": จำนวนนาที,
  "objectives": ["วัตถุประสงค์ 1", "วัตถุประสงค์ 2"],
  "materials": ["สื่อการสอน 1", "สื่อการสอน 2"],
  "phases": [
    {
      "name": "ขั้นตอนที่ 1",
      "duration": จำนวนนาที,
      "activities": ["กิจกรรม 1", "กิจกรรม 2"],
      "hotsLevel": "ระดับ HOTS (วิเคราะห์/สังเคราะห์/ประเมินค่า/สร้างสรรค์)"
    }
  ],
  "assessment": {
    "formative": ["การประเมินระหว่างเรียน"],
    "summative": ["การประเมินหลังเรียน"]
  },
  "differentiation": {
    "struggling": "สำหรับนักเรียนที่ต้องการความช่วยเหลือเพิ่มเติม",
    "advanced": "สำหรับนักเรียนที่มีความสามารถสูง"
  },
  "reflection": "คำถามสะท้อนคิดสำหรับครู"
}`

        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: 'คุณเป็นผู้เชี่ยวชาญการออกแบบแผนการสอนที่เน้นทักษะการคิดขั้นสูง (HOTS) ตอบเป็น JSON เท่านั้น' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 3000
        })

        const lessonPlan = parseAIResponse(completion.choices[0].message.content)

        return res.status(200).send({
          success: true,
          lessonPlan,
          usage: {
            model,
            tokens: completion.usage?.total_tokens || 0
          }
        })

      } catch (error) {
        console.error('Error generating lesson plan:', error)
        return res.status(500).send({ error: error.message })
      }
    })
  })

/**
 * Generate Course Structure
 */
exports.generateCourseStructure = functions
  .runWith({ memory: '512MB', timeoutSeconds: 180 })
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      try {
        const { subject, grade, description } = req.body

        if (!subject || !grade) {
          return res.status(400).send({ error: 'Missing subject or grade' })
        }

        const openai = getOpenAI()
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

        const prompt = `สร้างโครงสร้างรายวิชา ${subject} สำหรับชั้น ${grade}
${description ? `คำอธิบาย: ${description}` : ''}

ตอบในรูปแบบ JSON:
{
  "courseName": "ชื่อรายวิชา",
  "description": "คำอธิบายรายวิชา",
  "units": [
    {
      "name": "หน่วยที่ 1: ชื่อหน่วย",
      "description": "คำอธิบายหน่วย",
      "topics": ["หัวข้อ 1", "หัวข้อ 2"],
      "learningOutcomes": ["ผลการเรียนรู้ 1", "ผลการเรียนรู้ 2"],
      "weeks": 3
    }
  ],
  "totalWeeks": 18
}`

        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: 'คุณเป็นผู้เชี่ยวชาญหลักสูตรการศึกษาไทย ตอบเป็น JSON เท่านั้น' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })

        const structure = parseAIResponse(completion.choices[0].message.content)

        return res.status(200).send({
          success: true,
          structure
        })

      } catch (error) {
        console.error('Error generating course structure:', error)
        return res.status(500).send({ error: error.message })
      }
    })
  })

/**
 * Generate Learning Outcomes
 */
exports.generateLearningOutcomes = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { subject, grade, topic } = req.body

      if (!subject || !grade || !topic) {
        return res.status(400).send({ error: 'Missing required fields' })
      }

      const openai = getOpenAI()
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

      const prompt = `สร้างผลการเรียนรู้ (Learning Outcomes) สำหรับวิชา ${subject} ชั้น ${grade} หัวข้อ "${topic}"

ควรมีผลการเรียนรู้ 3-5 ข้อที่ครอบคลุม:
- ความรู้ (Knowledge)
- ทักษะ (Skills)
- การนำไปใช้ (Application)
- การคิดขั้นสูง (Higher-Order Thinking)

ตอบในรูปแบบ JSON:
{
  "learningOutcomes": [
    {
      "code": "LO1",
      "description": "ผลการเรียนรู้",
      "bloomLevel": "ระดับ Bloom (Remember/Understand/Apply/Analyze/Evaluate/Create)",
      "hotsCategory": "หมวด HOTS (Analysis/Reasoning/Creativity/Evidence)"
    }
  ]
}`

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'คุณเป็นผู้เชี่ยวชาญหลักสูตรและการวัดผล ตอบเป็น JSON เท่านั้น' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })

      const result = parseAIResponse(completion.choices[0].message.content)

      return res.status(200).send({
        success: true,
        learningOutcomes: result.learningOutcomes || []
      })

    } catch (error) {
      console.error('Error generating learning outcomes:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Generate HOTS Question
 */
exports.generateHOTSQuestion = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { 
        subject, 
        topic, 
        grade, 
        hotsLevel = 'วิเคราะห์',
        questionType = 'open-ended',
        learningOutcomes = []
      } = req.body

      if (!subject || !topic || !grade) {
        return res.status(400).send({ error: 'Missing required fields' })
      }

      const openai = getOpenAI()
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

      const prompt = `สร้างคำถาม HOTS ระดับ "${hotsLevel}" สำหรับวิชา ${subject} ชั้น ${grade} หัวข้อ "${topic}"
ประเภทคำถาม: ${questionType}
${learningOutcomes.length > 0 ? `ผลการเรียนรู้ที่เกี่ยวข้อง: ${learningOutcomes.join(', ')}` : ''}

ตอบในรูปแบบ JSON:
{
  "question": "คำถามที่กระตุ้นการคิดขั้นสูง",
  "hotsLevel": "ระดับ HOTS",
  "context": "บริบทหรือสถานการณ์ (ถ้ามี)",
  "expectedAnswer": "แนวทางคำตอบที่คาดหวัง (ไม่ต้องละเอียดเกินไป)",
  "scoringRubric": {
    "analysis": "เกณฑ์การให้คะแนนด้านการวิเคราะห์",
    "reasoning": "เกณฑ์การให้คะแนนด้านการให้เหตุผล",
    "creativity": "เกณฑ์การให้คะแนนด้านความคิดสร้างสรรค์",
    "evidence": "เกณฑ์การให้คะแนนด้านการใช้หลักฐาน"
  },
  "relatedLOs": ["LO1", "LO2"]
}`

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'คุณเป็นผู้เชี่ยวชาญการออกข้อสอบ HOTS ตอบเป็น JSON เท่านั้น' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 1500
      })

      const questionData = parseAIResponse(completion.choices[0].message.content)

      return res.status(200).send({
        success: true,
        question: questionData
      })

    } catch (error) {
      console.error('Error generating HOTS question:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Generate Solution (Model Answer)
 */
exports.generateSolution = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { questionId, question, expectedAnswer, relatedLOs = [] } = req.body

      if (!question) {
        return res.status(400).send({ error: 'Missing question' })
      }

      const openai = getOpenAI()
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

      const prompt = `สร้างคำตอบตัวอย่างที่สมบูรณ์แบบ (Model Answer) ที่ได้คะแนนเต็ม 20/20 (5 คะแนนในแต่ละมิติ ARCE)

คำถาม: ${question}
${expectedAnswer ? `แนวคำตอบ: ${expectedAnswer}` : ''}
${relatedLOs.length > 0 ? `ผลการเรียนรู้ที่เกี่ยวข้อง: ${relatedLOs.join(', ')}` : ''}

ตอบในรูปแบบ JSON:
{
  "modelAnswer": "คำตอบตัวอย่างที่สมบูรณ์",
  "breakdown": {
    "analysis": {
      "score": 5,
      "demonstration": "ส่วนที่แสดงทักษะการวิเคราะห์"
    },
    "reasoning": {
      "score": 5,
      "demonstration": "ส่วนที่แสดงทักษะการให้เหตุผล"
    },
    "creativity": {
      "score": 5,
      "demonstration": "ส่วนที่แสดงความคิดสร้างสรรค์"
    },
    "evidence": {
      "score": 5,
      "demonstration": "ส่วนที่แสดงการใช้หลักฐาน"
    }
  },
  "keyPoints": ["ประเด็นสำคัญ 1", "ประเด็นสำคัญ 2"],
  "commonMistakes": ["ข้อผิดพลาดที่พบบ่อย 1", "ข้อผิดพลาดที่พบบ่อย 2"]
}`

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'คุณเป็นผู้เชี่ยวชาญการประเมิน HOTS สร้างคำตอบตัวอย่างที่ได้คะแนนเต็มทุกมิติ ตอบเป็น JSON เท่านั้น' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 2000
      })

      const solution = parseAIResponse(completion.choices[0].message.content)

      // Save to database if questionId provided
      if (questionId) {
        const db = getDb()
        await db.collection('questions').doc(questionId).update({
          hasSolution: true,
          solution,
          solutionGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      return res.status(200).send({
        success: true,
        solution
      })

    } catch (error) {
      console.error('Error generating solution:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Generate Adaptive Path
 */
exports.generateAdaptivePath = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { studentId, courseId, weakLOs = [], strongLOs = [] } = req.body
      const db = getDb()

      if (!studentId || !courseId) {
        return res.status(400).send({ error: 'Missing studentId or courseId' })
      }

      // Get student progress
      const progressDoc = await db.collection('studentProgress')
        .doc(`${studentId}_${courseId}`)
        .get()

      const progress = progressDoc.exists ? progressDoc.data() : {}

      const openai = getOpenAI()
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

      const prompt = `สร้างเส้นทางการเรียนรู้แบบปรับตัว (Adaptive Learning Path) สำหรับนักเรียน

ผลการเรียนรู้ที่อ่อน: ${weakLOs.length > 0 ? weakLOs.join(', ') : 'ไม่มีข้อมูล'}
ผลการเรียนรู้ที่เก่ง: ${strongLOs.length > 0 ? strongLOs.join(', ') : 'ไม่มีข้อมูล'}
จำนวน Assessments ที่ทำ: ${progress.totalAssessments || 0}
คะแนนเฉลี่ย: ${JSON.stringify(progress.averageScores || {})}

ตอบในรูปแบบ JSON:
{
  "recommendedPath": [
    {
      "order": 1,
      "type": "review|practice|challenge",
      "targetLO": "LO ที่เกี่ยวข้อง",
      "activity": "กิจกรรมที่แนะนำ",
      "estimatedTime": "เวลาโดยประมาณ",
      "resources": ["แหล่งเรียนรู้"]
    }
  ],
  "focusAreas": ["ด้านที่ควรเน้น 1", "ด้านที่ควรเน้น 2"],
  "strengthsToLeverage": ["จุดแข็งที่ใช้ได้"],
  "suggestions": ["คำแนะนำทั่วไป"]
}`

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'คุณเป็นผู้เชี่ยวชาญ Adaptive Learning ตอบเป็น JSON เท่านั้น' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })

      const path = parseAIResponse(completion.choices[0].message.content)

      // Save adaptive path
      await db.collection('adaptivePaths').doc(`${studentId}_${courseId}`).set({
        studentId,
        courseId,
        path,
        generatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true })

      return res.status(200).send({
        success: true,
        path
      })

    } catch (error) {
      console.error('Error generating adaptive path:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Generate Learning Unit
 */
exports.generateLearningUnit = functions
  .runWith({ memory: '1GB', timeoutSeconds: 300 })
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      try {
        const { 
          subject, 
          grade, 
          unitName,
          topics = [],
          weeks = 3
        } = req.body

        if (!subject || !grade || !unitName) {
          return res.status(400).send({ error: 'Missing required fields' })
        }

        const openai = getOpenAI()
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

        const prompt = `สร้างหน่วยการเรียนรู้วิชา ${subject} ชั้น ${grade} หน่วย "${unitName}" ระยะเวลา ${weeks} สัปดาห์
${topics.length > 0 ? `หัวข้อย่อย: ${topics.join(', ')}` : ''}

ตอบในรูปแบบ JSON:
{
  "unitName": "ชื่อหน่วยการเรียนรู้",
  "description": "คำอธิบายหน่วย",
  "weeks": ${weeks},
  "learningOutcomes": [
    {"code": "LO1", "description": "ผลการเรียนรู้"}
  ],
  "weeklyPlan": [
    {
      "week": 1,
      "topic": "หัวข้อ",
      "activities": ["กิจกรรม"],
      "assessment": "การประเมิน"
    }
  ],
  "resources": ["แหล่งเรียนรู้"],
  "culminatingTask": {
    "description": "ภาระงานหลักของหน่วย",
    "rubric": "เกณฑ์การประเมิน"
  }
}`

        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: 'คุณเป็นผู้เชี่ยวชาญหลักสูตรการศึกษาไทย ตอบเป็น JSON เท่านั้น' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2500
        })

        const unit = parseAIResponse(completion.choices[0].message.content)

        return res.status(200).send({
          success: true,
          unit
        })

      } catch (error) {
        console.error('Error generating learning unit:', error)
        return res.status(500).send({ error: error.message })
      }
    })
  })

module.exports = exports
