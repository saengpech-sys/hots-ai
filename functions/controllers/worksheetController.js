/**
 * Worksheet Controller
 * จัดการ Electronic Worksheet, Assessment, Reports
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })
const { 
  getOpenAIClient, 
  openaiApiKeySecret, 
  getDefaultModel 
} = require('../utils/openaiClient')

const openaiApiKey = openaiApiKeySecret

// Get Firestore instance
const getDb = () => admin.firestore()

// Get OpenAI instance - use centralized client
const getOpenAI = () => getOpenAIClient()

/**
 * Generate Electronic Worksheet
 */
exports.generateElectronicWorksheet = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 300,
  memory: '1GB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const {
        lessonPlanId,
        courseId,
        phase,
        topic,
        gradeLevel,
        duration = 50,
        arceFocus = ['analysis', 'reasoning'],
        learningOutcomes = [],
        courseName
      } = req.body

      if (!topic || !gradeLevel) {
        return res.status(400).send({
          error: 'Missing required: topic, gradeLevel'
        })
      }

      const openai = getOpenAI()
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

      const prompt = `สร้างใบงานอิเล็กทรอนิกส์สำหรับการเรียนการสอน โดยเน้นการพัฒนาทักษะการคิดขั้นสูง (HOTS)

📚 ข้อมูลใบงาน:
- หัวข้อ: ${topic}
- ระดับชั้น: ${gradeLevel}
- ระยะเวลา: ${duration} นาที
- ขั้น 5E: ${phase || 'exploration'}
- A.R.C.E. ที่เน้น: ${arceFocus.join(', ')}
${learningOutcomes.length > 0 ? `- Learning Outcomes: ${learningOutcomes.map(lo => lo.loCode + ': ' + lo.loDescription).join('; ')}` : ''}

📋 สร้างใบงานในรูปแบบ JSON ดังนี้:
{
  "title": "ชื่อใบงาน",
  "description": "คำอธิบายสั้นๆ",
  "instructions": "คำชี้แจงสำหรับนักเรียน",
  "sections": [
    {
      "id": "section_1",
      "title": "ส่วนที่ 1: ชื่อส่วน",
      "description": "คำอธิบายส่วนนี้",
      "phase": "${phase || 'exploration'}",
      "arceFocus": ["analysis"],
      "questions": [
        {
          "id": "q1",
          "number": 1,
          "type": "open_ended",
          "prompt": "คำถามที่กระตุ้นการคิดวิเคราะห์...",
          "context": "บริบทหรือกรณีศึกษา (ถ้ามี)",
          "arceFocus": "analysis",
          "maxScore": 5,
          "required": true,
          "rubric": {
            "5": "เกณฑ์คะแนน 5 คะแนน",
            "4": "เกณฑ์คะแนน 4 คะแนน",
            "3": "เกณฑ์คะแนน 3 คะแนน",
            "2": "เกณฑ์คะแนน 2 คะแนน",
            "1": "เกณฑ์คะแนน 1 คะแนน"
          },
          "hints": ["คำใบ้ 1", "คำใบ้ 2"]
        }
      ]
    }
  ],
  "selfReflection": {
    "enabled": true,
    "questions": [
      "สิ่งที่ฉันเรียนรู้จากใบงานนี้คือ...",
      "สิ่งที่ยังสงสัยหรืออยากเรียนรู้เพิ่มเติมคือ..."
    ]
  },
  "metadata": {
    "totalQuestions": 5,
    "estimatedTime": ${duration},
    "maxScore": 25,
    "bloomsLevel": ["วิเคราะห์", "ประเมิน"]
  }
}

กฎการสร้าง:
1. คำถามต้องเป็นคำถามปลายเปิดที่ต้องคิดวิเคราะห์
2. แต่ละคำถามต้องมี rubric ชัดเจน
3. ควรมี 3-5 ส่วน (sections) ตาม 5E Model
4. รวมคำถามประมาณ 5-8 ข้อ
5. ใช้ภาษาไทยทั้งหมด
6. เน้น A.R.C.E. ตามที่กำหนด

ตอบเป็น JSON เท่านั้น`

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { 
            role: 'system', 
            content: 'คุณเป็นผู้เชี่ยวชาญด้านการออกแบบใบงานที่เน้นทักษะการคิดขั้นสูง (HOTS) ตอบเป็น JSON ภาษาไทยเท่านั้น'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })

      const responseText = completion.choices[0].message.content
      let worksheetData
      
      try {
        // Enhanced markdown wrapper cleaning
        let cleanedText = responseText.trim()
        
        // Remove markdown code block wrappers
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
          cleanedText = cleanedText.trim()
        }
        
        // Try to find JSON object if there's extra text
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          cleanedText = jsonMatch[0]
        }
        
        worksheetData = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse worksheet JSON:', parseError.message)
        console.error('Response text:', responseText.substring(0, 500))
        return res.status(500).send({ 
          error: 'Failed to parse AI response',
          details: parseError.message,
          preview: responseText.substring(0, 200)
        })
      }

      // Add metadata
      worksheetData.metadata = {
        ...worksheetData.metadata,
        lessonPlanId,
        courseId,
        courseName,
        topic,
        gradeLevel,
        phase,
        arceFocus,
        learningOutcomes,
        createdAt: new Date().toISOString(),
        generatedBy: 'AI'
      }

      return res.status(200).send({
        success: true,
        worksheet: worksheetData
      })

    } catch (error) {
      console.error('Error generating worksheet:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Get Worksheet Reports for Teachers
 */
exports.getWorksheetReports = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { teacherId, courseId, worksheetId, roomId, dateRange } = req.body
      const db = getDb()

      let query = db.collection('worksheetSubmissions')

      if (worksheetId) {
        query = query.where('worksheetId', '==', worksheetId)
      }

      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }

      if (roomId) {
        query = query.where('roomId', '==', roomId)
      }

      if (dateRange?.start) {
        query = query.where('submittedAt', '>=', new Date(dateRange.start))
      }

      if (dateRange?.end) {
        query = query.where('submittedAt', '<=', new Date(dateRange.end))
      }

      const snapshot = await query.orderBy('submittedAt', 'desc').limit(500).get()

      const submissions = []
      snapshot.forEach(doc => {
        submissions.push({ id: doc.id, ...doc.data() })
      })

      // Calculate aggregates
      const totalSubmissions = submissions.length
      const gradedSubmissions = submissions.filter(s => s.status === 'graded')
      const averageScore = gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, s) => sum + (s.assessment?.summary?.percentage || 0), 0) / gradedSubmissions.length
        : 0

      // PA Level distribution
      const paDistribution = { PA1: 0, PA2: 0, PA3: 0, PA4: 0 }
      gradedSubmissions.forEach(s => {
        const paLevel = s.assessment?.summary?.paLevel
        if (paLevel >= 1 && paLevel <= 4) {
          paDistribution[`PA${paLevel}`]++
        }
      })

      // ARCE averages
      const arceAverages = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
      let arceCount = 0
      gradedSubmissions.forEach(s => {
        if (s.assessment?.arceScores) {
          arceCount++
          Object.keys(arceAverages).forEach(key => {
            const score = s.assessment.arceScores[key]
            arceAverages[key] += typeof score === 'object' ? score.raw : score
          })
        }
      })
      if (arceCount > 0) {
        Object.keys(arceAverages).forEach(key => {
          arceAverages[key] = Math.round((arceAverages[key] / arceCount) * 100) / 100
        })
      }

      return res.status(200).send({
        success: true,
        data: {
          submissions: submissions.slice(0, 100), // Limit to 100 for response size
          summary: {
            totalSubmissions,
            gradedSubmissions: gradedSubmissions.length,
            averageScore: Math.round(averageScore * 100) / 100,
            paDistribution,
            arceAverages
          }
        }
      })

    } catch (error) {
      console.error('Error getting worksheet reports:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

/**
 * Sync Learning Room Worksheets
 */
exports.syncLearningRoomWorksheets = functions.runWith({
  timeoutSeconds: 120
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { lessonPlanId, roomId } = req.body
      const db = getDb()

      if (!lessonPlanId) {
        return res.status(400).send({ error: 'Missing lessonPlanId' })
      }

      // Get worksheets linked to this lesson plan
      const worksheetsSnapshot = await db.collection('eWorksheets')
        .where('lessonPlanId', '==', lessonPlanId)
        .get()

      const worksheets = []
      worksheetsSnapshot.forEach(doc => {
        worksheets.push({
          id: doc.id,
          ...doc.data()
        })
      })

      // If roomId provided, update room's worksheet list
      if (roomId) {
        await db.collection('learningRooms').doc(roomId).update({
          worksheets: worksheets.map(w => ({
            id: w.id,
            title: w.title || w.metadata?.title,
            phase: w.phase || w.metadata?.phase
          })),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      return res.status(200).send({
        success: true,
        worksheets: worksheets.length,
        data: worksheets
      })

    } catch (error) {
      console.error('Error syncing worksheets:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

module.exports = exports
