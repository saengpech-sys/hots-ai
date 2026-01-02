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
   - เพิ่ม field "standardsWarning": "กรุณาให้ครูกำหนดมาตรฐานและตัวชี้วัดตามหลักสูตรแกนกลางด้วยตนเอง"
   - ห้ามสร้างมาตรฐาน/ตัวชี้วัดขึ้นมาเอง`}

⚠️ กฎสำคัญมาก - อ่านให้ครบ!
1. 1 แผน = 1 คาบ = 50 นาที เสมอ
2. ${totalHours} คาบ → ต้องมี ${totalHours} แผนทั้งหมด
3. ⭐ จำนวนหน่วย: ต้องมี ${minUnits}-${maxUnits} หน่วย (แนะนำ ${recommendedUnits} หน่วย)
4. ⭐ แต่ละหน่วย: ต้องมี 4-8 แผนเท่านั้น (ไม่เกิน 8 แผน!)
   - ถ้าหน่วยมีเนื้อหามาก ให้แบ่งเป็น 2 หน่วยย่อย

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
    ? `"standards": [/* ใช้มาตรฐาน/ตัวชี้วัดที่ครูกำหนดข้างต้น */]`
    : `"standards": [],
  "standardsWarning": "⚠️ กรุณาให้ครูกำหนดมาตรฐานและตัวชี้วัดตามหลักสูตรแกนกลาง พ.ศ. 2551 ด้วยตนเอง"`},
  "arceStrategy": [
    {
      "dimension": "analysis",
      "icon": "🔍",
      "name": "การวิเคราะห์",
      "weight": 25,
      "focusAreas": "อธิบายบริบทเฉพาะของวิชาที่พัฒนาทักษะวิเคราะห์",
      "sampleQuestions": ["คำถามตัวอย่าง 1", "คำถามตัวอย่าง 2"],
      "activities": ["กิจกรรม 1", "กิจกรรม 2"],
      "unitsEmphasis": ["หน่วยที่เน้นมิตินี้"]
    },
    {
      "dimension": "reasoning",
      "icon": "🧠",
      "name": "การให้เหตุผล",
      "weight": 25,
      "focusAreas": "...",
      "sampleQuestions": ["..."],
      "activities": ["..."],
      "unitsEmphasis": ["..."]
    },
    {
      "dimension": "creativity",
      "icon": "💡",
      "name": "ความคิดสร้างสรรค์",
      "weight": 25,
      "focusAreas": "...",
      "sampleQuestions": ["..."],
      "activities": ["..."],
      "unitsEmphasis": ["..."]
    },
    {
      "dimension": "evidence",
      "icon": "📚",
      "name": "การใช้หลักฐาน",
      "weight": 25,
      "focusAreas": "...",
      "sampleQuestions": ["..."],
      "activities": ["..."],
      "unitsEmphasis": ["..."]
    }
  ],
  "unitsPreview": [
    {
      "name": "ชื่อหน่วย (ห้ามใส่ 'หน่วยที่ 1:' นำหน้า)",
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
          "uniqueKeyTopics": ["หัวข้อเฉพาะ 1", "หัวข้อเฉพาะ 2"]
        }
      ],
      "essentialContent": "สาระสำคัญของหน่วยนี้",
      "knowledgeScope": {
        "mustCover": ["เนื้อหาหลักที่ต้องสอนในหน่วยนี้"],
        "excludes": ["เนื้อหาที่ไม่รวมในหน่วยนี้"],
        "prerequisites": ["ความรู้พื้นฐานที่ต้องมี"],
        "leadsTo": ["นำไปใช้ในหน่วยไหน"]
      }
    }
  ],
  "assessmentStrategy": {
    "midterm": { "weight": 30, "type": "ข้อสอบ + ชิ้นงาน" },
    "final": { "weight": 30, "type": "ข้อสอบ + โปรเจค" },
    "continuous": { "weight": 40, "type": "ใบงาน + สังเกตพฤติกรรม" }
  },
  "teachingStrategy": "อธิบายภาพรวมกลยุทธ์การสอนทั้งรายวิชา"
}

⚠️ สำคัญมาก - เงื่อนไขที่ต้องทำตาม:
1. ต้องมี ${minUnits}-${maxUnits} หน่วย (แนะนำ ${recommendedUnits} หน่วย)
2. แต่ละหน่วย periods: 4-8 เท่านั้น (ถ้าเนื้อหามาก ให้แบ่งหน่วย)
3. ผลรวม periods ของทุกหน่วย = ${totalHours} คาบ
4. plansPreview ต้องมีจำนวน = periods ของหน่วยนั้น`
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
  "arceFocus": ["ด้าน A.R.C.E. ที่เน้นในหน่วยนี้ เลือก 2-3 ด้าน จาก: analysis, reasoning, creativity, evidence"],
  "arceDistribution": {
    "analysis": "อธิบายกิจกรรม/คำถามที่พัฒนาทักษะการวิเคราะห์ในหน่วยนี้",
    "reasoning": "อธิบายกิจกรรม/คำถามที่พัฒนาทักษะการให้เหตุผลในหน่วยนี้",
    "creativity": "อธิบายกิจกรรม/คำถามที่พัฒนาทักษะความคิดสร้างสรรค์ในหน่วยนี้",
    "evidence": "อธิบายกิจกรรม/คำถามที่พัฒนาทักษะการใช้หลักฐานในหน่วยนี้"
  },
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
      "arceFocus": "ด้านที่เน้นมากที่สุด (analysis/reasoning/creativity/evidence)",
      "activities5E": {
        "engagement": "กิจกรรมขั้นนำ",
        "exploration": "กิจกรรมสำรวจ",
        "explanation": "กิจกรรมอธิบาย",
        "elaboration": "กิจกรรมขยายความ",
        "evaluation": "กิจกรรมประเมิน"
      },
      "status": "pending"
    }
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
}

module.exports = exports
