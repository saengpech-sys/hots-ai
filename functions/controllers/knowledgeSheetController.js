/**
 * Knowledge Sheet Controller
 * Generate and manage knowledge sheets for pre-learning
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })
const { 
  getOpenAIClient, 
  openaiApiKeySecret,
  getDefaultModel 
} = require('../utils/openaiClient')
const { parseAIResponse } = require('../utils/aiParser')

const getDb = () => admin.firestore()
const getOpenAI = () => getOpenAIClient()

/**
 * Generate Knowledge Sheet
 */
exports.generateKnowledgeSheet = functions
  .runWith({ memory: '1GB', timeoutSeconds: 300 })
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      try {
        const { 
          subject, 
          topic, 
          grade,
          targetAudience = 'students',
          depth = 'standard', // basic, standard, advanced
          includeExamples = true
        } = req.body

        if (!subject || !topic || !grade) {
          return res.status(400).send({ error: 'Missing required fields' })
        }

        const openai = getOpenAI()
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

        const depthInstructions = {
          basic: 'เนื้อหาพื้นฐาน ภาษาง่าย เหมาะสำหรับการทบทวน',
          standard: 'เนื้อหาครบถ้วนตามหลักสูตร พร้อมตัวอย่างประกอบ',
          advanced: 'เนื้อหาเชิงลึก มีการเชื่อมโยงความรู้ขั้นสูง'
        }

        const prompt = `สร้าง Knowledge Sheet (ใบความรู้) วิชา ${subject} หัวข้อ "${topic}" สำหรับชั้น ${grade}

ระดับความลึก: ${depthInstructions[depth] || depthInstructions.standard}
กลุ่มเป้าหมาย: ${targetAudience === 'students' ? 'นักเรียน' : 'ครูผู้สอน'}
${includeExamples ? 'ต้องมีตัวอย่างประกอบ' : ''}

ตอบในรูปแบบ JSON:
{
  "title": "ชื่อใบความรู้",
  "subject": "${subject}",
  "topic": "${topic}",
  "grade": "${grade}",
  "sections": [
    {
      "heading": "หัวข้อย่อย",
      "content": "เนื้อหา (รองรับ Markdown)",
      "keyPoints": ["ประเด็นสำคัญ 1", "ประเด็นสำคัญ 2"],
      "examples": [
        {
          "title": "ตัวอย่าง",
          "description": "คำอธิบายตัวอย่าง"
        }
      ],
      "visualSuggestion": "คำแนะนำสำหรับภาพประกอบ (ถ้ามี)"
    }
  ],
  "vocabulary": [
    {
      "term": "คำศัพท์",
      "definition": "ความหมาย",
      "example": "ตัวอย่างการใช้"
    }
  ],
  "summary": "สรุปเนื้อหาทั้งหมด",
  "prerequisites": ["ความรู้พื้นฐานที่ต้องมี"],
  "relatedTopics": ["หัวข้อที่เกี่ยวข้อง"],
  "selfCheckQuestions": [
    {
      "question": "คำถามทบทวนตนเอง",
      "hint": "คำใบ้"
    }
  ]
}`

        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { 
              role: 'system', 
              content: 'คุณเป็นผู้เชี่ยวชาญสร้างสื่อการสอนที่อธิบายเนื้อหาได้ชัดเจน น่าสนใจ และเหมาะสมกับระดับชั้น ตอบเป็น JSON เท่านั้น' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })

        const knowledgeSheet = parseAIResponse(completion.choices[0].message.content)

        return res.status(200).send({
          success: true,
          knowledgeSheet,
          metadata: {
            model,
            depth,
            generatedAt: new Date().toISOString()
          }
        })

      } catch (error) {
        console.error('Error generating knowledge sheet:', error)
        return res.status(500).send({ error: error.message })
      }
    })
  })

/**
 * Generate Unit Knowledge Sheet
 */
exports.generateUnitKnowledgeSheet = functions
  .runWith({ memory: '1GB', timeoutSeconds: 300 })
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      try {
        const { courseId, unitId, topics = [] } = req.body
        const db = getDb()

        if (!courseId || !unitId) {
          return res.status(400).send({ error: 'Missing courseId or unitId' })
        }

        // Get course info
        const courseDoc = await db.collection('courses').doc(courseId).get()
        if (!courseDoc.exists) {
          return res.status(404).send({ error: 'Course not found' })
        }

        const course = courseDoc.data()
        
        // Get unit info if stored
        const unitData = course.units?.find(u => u.id === unitId) || { name: unitId }

        const openai = getOpenAI()
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

        const topicList = topics.length > 0 ? topics.join(', ') : 'ตามความเหมาะสมของหน่วยการเรียนรู้'

        const prompt = `สร้าง Unit Knowledge Sheet (ใบความรู้รวมหน่วย) สำหรับ:
วิชา: ${course.name || course.subject}
ระดับชั้น: ${course.grade}
หน่วย: ${unitData.name}
หัวข้อที่ครอบคลุม: ${topicList}

ตอบในรูปแบบ JSON:
{
  "title": "ใบความรู้หน่วย ${unitData.name}",
  "unit": "${unitData.name}",
  "overview": "ภาพรวมของหน่วยการเรียนรู้",
  "objectives": ["วัตถุประสงค์การเรียนรู้"],
  "conceptMap": {
    "central": "แนวคิดหลัก",
    "branches": [
      {
        "concept": "แนวคิดย่อย 1",
        "subConcepts": ["รายละเอียด 1", "รายละเอียด 2"]
      }
    ]
  },
  "topics": [
    {
      "name": "หัวข้อย่อย",
      "keyContent": "เนื้อหาสำคัญ",
      "examples": ["ตัวอย่าง"]
    }
  ],
  "vocabulary": [
    {"term": "คำศัพท์", "definition": "ความหมาย"}
  ],
  "connections": {
    "previousKnowledge": ["ความรู้เดิมที่เชื่อมโยง"],
    "futureTopics": ["หัวข้อที่จะเรียนต่อไป"],
    "realWorldApplications": ["การนำไปใช้จริง"]
  },
  "assessmentPreview": {
    "hotsSkills": ["ทักษะ HOTS ที่จะประเมิน"],
    "sampleQuestions": ["ตัวอย่างคำถาม"]
  },
  "studyTips": ["เทคนิคการเรียน"]
}`

        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { 
              role: 'system', 
              content: 'คุณเป็นผู้เชี่ยวชาญออกแบบสื่อการเรียนรู้ สร้างใบความรู้ที่ครอบคลุมเนื้อหาทั้งหน่วย ตอบเป็น JSON เท่านั้น' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })

        const unitSheet = parseAIResponse(completion.choices[0].message.content)

        // Save to database
        await db.collection('knowledgeSheets').add({
          courseId,
          unitId,
          type: 'unit',
          content: unitSheet,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        })

        return res.status(200).send({
          success: true,
          knowledgeSheet: unitSheet
        })

      } catch (error) {
        console.error('Error generating unit knowledge sheet:', error)
        return res.status(500).send({ error: error.message })
      }
    })
  })

/**
 * Generate Batch Knowledge Sheets
 */
exports.generateBatchKnowledgeSheets = functions
  .runWith({ memory: '2GB', timeoutSeconds: 540 })
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      try {
        const { courseId, topics } = req.body
        const db = getDb()

        if (!courseId || !topics || !Array.isArray(topics) || topics.length === 0) {
          return res.status(400).send({ error: 'Missing courseId or topics array' })
        }

        // Get course info
        const courseDoc = await db.collection('courses').doc(courseId).get()
        if (!courseDoc.exists) {
          return res.status(404).send({ error: 'Course not found' })
        }

        const course = courseDoc.data()
        const openai = getOpenAI()
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

        const results = []
        const errors = []

        // Process in batches of 3 to avoid rate limits
        for (let i = 0; i < topics.length; i += 3) {
          const batch = topics.slice(i, i + 3)
          
          const promises = batch.map(async (topic) => {
            try {
              const prompt = `สร้างใบความรู้สั้นๆ วิชา ${course.name || course.subject} ชั้น ${course.grade} หัวข้อ "${topic}"

ตอบในรูปแบบ JSON:
{
  "title": "ใบความรู้: ${topic}",
  "topic": "${topic}",
  "content": "เนื้อหาหลัก (Markdown)",
  "keyPoints": ["ประเด็นสำคัญ"],
  "vocabulary": [{"term": "คำศัพท์", "definition": "ความหมาย"}],
  "examples": ["ตัวอย่าง"],
  "practiceQuestions": ["คำถามฝึกคิด"]
}`

              const completion = await openai.chat.completions.create({
                model,
                messages: [
                  { role: 'system', content: 'สร้างใบความรู้กระชับและครบถ้วน ตอบเป็น JSON เท่านั้น' },
                  { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
              })

              const sheet = parseAIResponse(completion.choices[0].message.content)
              
              // Save to database
              const docRef = await db.collection('knowledgeSheets').add({
                courseId,
                topic,
                type: 'topic',
                content: sheet,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
              })

              return { 
                success: true, 
                topic, 
                id: docRef.id,
                sheet 
              }
            } catch (err) {
              return { 
                success: false, 
                topic, 
                error: err.message 
              }
            }
          })

          const batchResults = await Promise.all(promises)
          
          batchResults.forEach(result => {
            if (result.success) {
              results.push(result)
            } else {
              errors.push(result)
            }
          })

          // Small delay between batches
          if (i + 3 < topics.length) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }

        return res.status(200).send({
          success: true,
          generated: results.length,
          failed: errors.length,
          results,
          errors
        })

      } catch (error) {
        console.error('Error generating batch knowledge sheets:', error)
        return res.status(500).send({ error: error.message })
      }
    })
  })

/**
 * Get Knowledge Sheets by Course
 */
exports.getKnowledgeSheets = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { courseId, type } = req.query
      const db = getDb()

      if (!courseId) {
        return res.status(400).send({ error: 'Missing courseId' })
      }

      let query = db.collection('knowledgeSheets')
        .where('courseId', '==', courseId)
        .orderBy('createdAt', 'desc')

      if (type) {
        query = query.where('type', '==', type)
      }

      const snapshot = await query.limit(50).get()

      const sheets = []
      snapshot.forEach(doc => {
        sheets.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
        })
      })

      return res.status(200).send({
        success: true,
        count: sheets.length,
        sheets
      })

    } catch (error) {
      console.error('Error getting knowledge sheets:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

module.exports = exports
