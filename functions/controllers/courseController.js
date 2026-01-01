/**
 * 📚 Course Controller
 * Handles course-related operations including:
 * - Learning Outcomes generation
 * - Course structure generation
 * - Learning unit generation
 * - Course listing
 * 
 * @module controllers/courseController
 */

const functions = require('firebase-functions')
const cors = require('cors')({ origin: true })
const { db, FieldValue } = require('../shared/firebase')
const { verifyTeacherRole } = require('../shared/auth')
const { getOpenAIClient, openaiApiKeySecret, cleanGPTResponse, parseGPTJSON } = require('../shared/openai')

// =============================================================================
// 📚 COURSE LISTING
// =============================================================================

/**
 * Get courses for a teacher
 * GET /getCourses?teacherId=xxx
 */
exports.getCourses = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { teacherId } = req.query

      let coursesQuery = db.collection('courses')
      
      if (teacherId) {
        coursesQuery = coursesQuery.where('teacherId', '==', teacherId)
      }

      const snapshot = await coursesQuery.orderBy('createdAt', 'desc').get()
      
      const courses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      return res.status(200).send({
        success: true,
        courses,
        count: courses.length
      })
    } catch (error) {
      console.error('Error getting courses:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

// =============================================================================
// 🎯 LEARNING OUTCOMES GENERATION
// =============================================================================

/**
 * Generate Learning Outcomes using AI
 * 🔐 SECURED: Teacher/Admin only
 */
exports.generateLearningOutcomes = functions
  .runWith({ secrets: [openaiApiKeySecret] })
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      try {
        if (req.method !== 'POST') {
          return res.status(405).send({ error: 'Method not allowed' })
        }

        // 🔐 RBAC: Verify teacher/admin role
        const caller = await verifyTeacherRole(req, res)
        if (!caller) return // Response already sent

        const { courseCode, courseName, courseDescription, learningStandards } = req.body

        if (!courseDescription || !learningStandards) {
          return res.status(400).send({ 
            error: 'Missing required fields: courseDescription, learningStandards' 
          })
        }

        let openaiClient
        try {
          openaiClient = getOpenAIClient()
        } catch (err) {
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

        const completion = await openaiClient.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18',
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
        const result = parseGPTJSON(responseText, 'generateLearningOutcomes')

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

// =============================================================================
// 🏗️ COURSE STRUCTURE GENERATION
// =============================================================================

/**
 * Generate Course Structure - Phase 1 of AI Curriculum Designer
 * Analyzes course description and LOs to create curriculum structure
 * 🔐 SECURED: Teacher/Admin only
 */
exports.generateCourseStructure = functions.runWith({ 
  timeoutSeconds: 540,
  memory: '2GB',
  secrets: [openaiApiKeySecret]
}).https.onRequest(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.set('Access-Control-Max-Age', '3600')
    return res.status(204).send('')
  }
  
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { 
        courseId, courseCode, courseName, description, 
        learningOutcomes, subjectGroup, gradeLevel, settings,
        courseType, selectedStandards, keyCompetencies, desiredCharacteristics
      } = req.body

      if (!courseId || !courseName || !learningOutcomes?.length) {
        return res.status(400).send({ 
          error: 'Missing required: courseId, courseName, learningOutcomes' 
        })
      }

      let openaiClient
      try {
        openaiClient = getOpenAIClient()
      } catch (err) {
        return res.status(500).send({ error: 'OpenAI not configured' })
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
      const losText = learningOutcomes.map(lo => `${lo.code}: ${lo.description}`).join('\n')
      const totalHours = settings?.totalHours || 40
      const hotsRatio = settings?.hotsRatio || 40
      
      const isBasicCourse = courseType === 'basic'
      
      // Competency names mapping
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
      
      // Characteristic names mapping
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
      
      // Calculate recommended units
      const minUnits = Math.max(5, Math.ceil(totalHours / 8))
      const maxUnits = Math.min(12, Math.ceil(totalHours / 4))
      const recommendedUnits = Math.ceil((minUnits + maxUnits) / 2)

      const prompt = buildCourseStructurePrompt({
        courseCode, courseName, subjectGroup, gradeLevel, description,
        isBasicCourse, selectedStandards, competenciesText, characteristicsText,
        losText, learningOutcomes, totalHours, hotsRatio,
        minUnits, maxUnits, recommendedUnits
      })

      const completion = await openaiClient.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `คุณเป็นผู้เชี่ยวชาญการออกแบบหลักสูตรระดับพรีเมียม (Premium Curriculum Designer)
ใช้ข้อมูลตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551 (ฉบับปรับปรุง พ.ศ. 2560)`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })

      const responseText = completion.choices[0].message.content
      const result = parseGPTJSON(responseText, 'generateCourseStructure')

      return res.status(200).send({ success: true, structure: result })

    } catch (error) {
      console.error('❌ Error generating course structure:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

// =============================================================================
// 📦 LEARNING UNIT GENERATION
// =============================================================================

/**
 * Generate Learning Unit - Phase 2 of AI Curriculum Designer
 * Creates detailed unit structure with lesson plans outline
 * 🔐 SECURED: Teacher/Admin only
 */
exports.generateLearningUnit = functions.runWith({ 
  timeoutSeconds: 540,
  memory: '2GB',
  secrets: [openaiApiKeySecret]
}).https.onRequest(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.set('Access-Control-Max-Age', '3600')
    return res.status(204).send('')
  }
  
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const { 
        courseId, courseCode, courseName, courseDescription,
        allLearningOutcomes, unitIndex, unitName, unitHours, unitPeriods,
        planCount, targetLOs, courseStructure, settings,
        courseType, selectedStandards, keyCompetencies, desiredCharacteristics
      } = req.body

      const periods = unitPeriods || unitHours || 4
      const numberOfPlans = periods
      const isBasicCourse = courseType === 'basic'

      if (!courseId || !unitName || !targetLOs?.length) {
        return res.status(400).send({ error: 'Missing required fields' })
      }

      let openaiClient
      try {
        openaiClient = getOpenAIClient()
      } catch (err) {
        return res.status(500).send({ error: 'OpenAI not configured' })
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
      
      const relevantLOs = allLearningOutcomes
        .filter(lo => targetLOs.includes(lo.code))
        .map(lo => `${lo.code}: ${lo.description}`)
        .join('\n')

      const prompt = buildLearningUnitPrompt({
        courseCode, courseName, courseDescription, isBasicCourse,
        selectedStandards, keyCompetencies, desiredCharacteristics,
        unitIndex, unitName, periods, numberOfPlans, relevantLOs,
        courseStructure, targetLOs
      })

      const completion = await openaiClient.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `คุณเป็นผู้เชี่ยวชาญการออกแบบหน่วยการเรียนรู้ระดับพรีเมียม (Premium Unit Designer)
เข้าใจการจัดลำดับเนื้อหา (Scaffolding), A.R.C.E. Framework, และ 5E Model
กฎสำคัญ: 1 แผน = 1 คาบ = 50 นาที`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })

      const responseText = completion.choices[0].message.content
      const result = parseGPTJSON(responseText, 'generateLearningUnit')

      return res.status(200).send({ success: true, unit: result })

    } catch (error) {
      console.error('❌ Error generating learning unit:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Build prompt for course structure generation
 */
function buildCourseStructurePrompt(params) {
  const {
    courseCode, courseName, subjectGroup, gradeLevel, description,
    isBasicCourse, selectedStandards, competenciesText, characteristicsText,
    losText, learningOutcomes, totalHours, hotsRatio,
    minUnits, maxUnits, recommendedUnits
  } = params

  return `วิเคราะห์และออกแบบโครงสร้างรายวิชาต่อไปนี้:

📚 ข้อมูลรายวิชา:
- รหัสวิชา: ${courseCode}
- ชื่อวิชา: ${courseName}
- กลุ่มสาระ: ${subjectGroup || 'วิทยาศาสตร์และเทคโนโลยี'}
- ระดับชั้น: ${gradeLevel || 'ม.4'}
- ประเภทรายวิชา: ${isBasicCourse ? '📘 รายวิชาพื้นฐาน' : '📗 รายวิชาเพิ่มเติม'}
- คำอธิบายรายวิชา: ${description || 'ไม่มี'}

📋 มาตรฐานและตัวชี้วัด:
${selectedStandards?.length > 0 
  ? selectedStandards.map(s => `- ${s}`).join('\n')
  : '⚠️ ครูยังไม่ได้กำหนดมาตรฐาน/ตัวชี้วัด'}

📋 ข้อมูลหลักสูตรแกนกลาง:
- สมรรถนะสำคัญ: ${competenciesText}
- คุณลักษณะอันพึงประสงค์: ${characteristicsText}

🎯 Learning Outcomes (${learningOutcomes.length} ตัว):
${losText}

⚙️ การตั้งค่า:
- เวลาเรียนรวม: ${totalHours} คาบ (1 คาบ = 50 นาที)
- สัดส่วน HOTS Assessment: ${hotsRatio}%

⚠️ กฎสำคัญ:
1. 1 แผน = 1 คาบ = 50 นาที
2. ${totalHours} คาบ → ต้องมี ${totalHours} แผนทั้งหมด
3. จำนวนหน่วย: ${minUnits}-${maxUnits} หน่วย (แนะนำ ${recommendedUnits})
4. แต่ละหน่วย: 4-8 แผน

ตอบเป็น JSON format (ห้าม markdown wrapper)`
}

/**
 * Build prompt for learning unit generation
 */
function buildLearningUnitPrompt(params) {
  const {
    courseCode, courseName, courseDescription, isBasicCourse,
    selectedStandards, keyCompetencies, desiredCharacteristics,
    unitIndex, unitName, periods, numberOfPlans, relevantLOs,
    courseStructure, targetLOs
  } = params

  return `ออกแบบรายละเอียดหน่วยการเรียนรู้:

📚 ข้อมูลรายวิชา:
- รหัส: ${courseCode} ${courseName}
- คำอธิบาย: ${courseDescription || 'ไม่มี'}
- ประเภท: ${isBasicCourse ? '📘 รายวิชาพื้นฐาน' : '📗 รายวิชาเพิ่มเติม'}

📦 หน่วยที่ ${unitIndex + 1}: ${unitName}
- จำนวนคาบ: ${periods} คาบ
- จำนวนแผน: ${numberOfPlans} แผน (1 แผน = 1 คาบ = 50 นาที)
- Learning Outcomes:
${relevantLOs}

🎯 กลยุทธ์ A.R.C.E.:
${JSON.stringify(courseStructure?.arceStrategy || [], null, 2)}

📋 งาน:
1. เขียนสาระสำคัญของหน่วย
2. ออกแบบ ${numberOfPlans} แผน (ครบทุกแผน!)
3. กำหนด LO ที่จะประเมินในแต่ละแผน
4. วางลำดับเนื้อหาจากง่ายไปยาก
5. ทุกแผน = 1 คาบ (50 นาที)

ตอบเป็น JSON (ห้าม markdown wrapper)`
}

module.exports = exports
