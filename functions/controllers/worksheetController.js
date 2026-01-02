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
const { verifyTeacherRole } = require('../utils/authMiddleware')
const { calculatePointsSimple, calculateStreak, checkBadges } = require('../gamification')
const { 
  logLearningEvent, 
  updateGrowthHistory, 
  EVENT_TYPES 
} = require('../utils/researchData')
const { runMultiAgentAssessment } = require('../utils/multiAgentAssessment')
const { assessLearningOutcomes } = require('../utils/loAssessment')

const openaiApiKey = openaiApiKeySecret

// Get Firestore instance
const getDb = () => admin.firestore()

// Get OpenAI instance - use centralized client
const getOpenAI = () => getOpenAIClient()

/**
 * Generate Electronic Worksheet
 */
exports.generateElectronicWorksheet = functions.runWith({ 
  secrets: [openaiApiKeySecret],
  timeoutSeconds: 540,  // เพิ่มเป็น 9 นาที สำหรับ AI generation ที่ซับซ้อน
  memory: '2GB'
}).https.onRequest(async (req, res) => {
  // Handle CORS preflight first
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

      // 🔐 RBAC: Verify teacher/admin role
      const caller = await verifyTeacherRole(req, res)
      if (!caller) return // Response already sent

      const db = getDb()

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

      // 🔧 FIX: Use getOpenAIClient() instead of undefined 'openai'
      let openaiClient
      try {
        openaiClient = getOpenAIClient()
      } catch (err) {
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
        quick: 'คำถามสั้นกระชับ ทำได้เร็ว เน้นความเข้าใจพื้นฐาน',
        arce_evaluate: 'ใบงานวัดผล ARCE (ขั้น Evaluate) - ใช้โครงสร้าง Situation-Task-Expected_ARCE'
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

      // Check if this is ARCE Evaluate worksheet type
      const isArceEvaluate = worksheetType === 'arce_evaluate'
      
      // Extract Evaluate phase content from activities5E for ARCE Evaluate worksheets
      let evaluateContent = ''
      if (isArceEvaluate && activities5E) {
        evaluateContent = activities5E.evaluation || activities5E.evaluate || ''
        if (typeof evaluateContent === 'object') {
          evaluateContent = JSON.stringify(evaluateContent, null, 2)
        }
      }

      // Build prompt based on worksheet type
      let prompt
      
      if (isArceEvaluate) {
        // 🎯 Special prompt for ARCE Evaluate worksheet (Situation-Task-Expected format)
        prompt = `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบ "ใบงานวัดผล ARCE" สำหรับขั้น Evaluate ในแผนการสอน 5E

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

🔄 กิจกรรมขั้น Evaluate จากแผนการสอน:
${evaluateContent || activitiesContext}

✨ A.R.C.E. Framework ที่ต้องประเมิน:
${arceContext}

📋 โครงสร้างใบงานวัดผล ARCE (Situation-Task-Expected):
ใบงานนี้ใช้โครงสร้างพิเศษที่ช่วยให้นักเรียนเข้าใจชัดเจนว่าต้องตอบอะไร และช่วยให้ AI ประเมินได้แม่นยำ:

1. **Situation (สถานการณ์)**: บริบท/ปัญหาที่สอดคล้องกับแผนการสอน ต้องน่าสนใจและเกี่ยวข้องกับชีวิตจริง
2. **Task (ภารกิจ)**: คำสั่งที่ชัดเจนว่านักเรียนต้องทำอะไร ใช้ภาษาที่เข้าใจง่าย
3. **Expected_A (การวิเคราะห์ที่คาดหวัง)**: แนวทางการวิเคราะห์ที่ถูกต้อง - ใช้สำหรับ AI ประเมิน
4. **Expected_R (เหตุผลที่คาดหวัง)**: หลักการ/ทฤษฎีที่นักเรียนควรอ้างถึง - ใช้สำหรับ AI ประเมิน
5. **Expected_C (ผลงานที่คาดหวัง)**: ลักษณะชิ้นงาน/โค้ด/การออกแบบที่ควรได้ - ใช้สำหรับ AI ประเมิน
6. **Expected_E (หลักฐานที่คาดหวัง)**: ผลลัพธ์/ตัวอย่าง/หลักฐานที่ยืนยันความถูกต้อง - ใช้สำหรับ AI ประเมิน

กรุณาสร้างใบงานวัดผล ARCE ที่มี ${questionCount || 3} สถานการณ์ ตอบเป็น JSON (ห้าม markdown wrapper):
{
  "metadata": {
    "title": "${topic || 'ใบงาน'}",
    "description": "ใบงานประเมินทักษะการคิดขั้นสูงตาม A.R.C.E. Framework",
    "worksheetType": "arce_evaluate",
    "lessonPlanId": "${lessonPlanId || ''}",
    "courseId": "${courseId || ''}",
    "courseName": "${courseName || ''}",
    "gradeLevel": "${gradeLevel || 'ม.4'}",
    "unitNumber": ${unitNumber || 1},
    "unitName": "${unitName || ''}",
    "planNumber": ${planNumber || 1},
    "topic": "${topic || ''}",
    "duration": ${duration || 50},
    "totalQuestions": ${questionCount || 3},
    "maxScore": 0,
    "arceFocus": ["analysis", "reasoning", "creativity", "evidence"],
    "arceWeights": {
      "analysis": 25,
      "reasoning": 25,
      "creativity": 25,
      "evidence": 25
    }
  },
  "instructions": "อ่านสถานการณ์แต่ละข้ออย่างละเอียด แล้วทำภารกิจตามที่กำหนด โดยใช้ทักษะการคิดวิเคราะห์ การให้เหตุผล ความคิดสร้างสรรค์ และการใช้หลักฐาน",
  "settings": {
    "shuffleQuestions": false,
    "shuffleOptions": false,
    "showHints": true,
    "blockCopyPaste": true,
    "timeLimit": ${duration || 50},
    "allowLateSubmission": false
  },
  "sections": [
    {
      "id": "arce_situations",
      "title": "📋 สถานการณ์วัดผล ARCE",
      "description": "ทำภารกิจตามสถานการณ์ที่กำหนด แสดงทักษะการคิดขั้นสูงทั้ง 4 ด้าน",
      "phase": "evaluation",
      "arceFocus": ["analysis", "reasoning", "creativity", "evidence"],
      "questions": [
        // สร้าง ${questionCount || 3} สถานการณ์ โดยแต่ละสถานการณ์มีโครงสร้าง:
        {
          "id": "arce_1",
          "number": 1,
          "type": "arce_situation",
          "situation": "สถานการณ์/ปัญหาที่น่าสนใจ เกี่ยวข้องกับเนื้อหาที่เรียน (3-5 ประโยค)",
          "task": "ภารกิจที่ชัดเจน: ให้นักเรียนทำอะไร อธิบายให้ละเอียด (2-3 ประโยค)",
          "answerGuide": "แนวทางการตอบสำหรับนักเรียน: อธิบายว่าคำตอบที่ดีควรมีอะไรบ้าง",
          "expected": {
            "analysis": "แนวทางการวิเคราะห์ที่ถูกต้อง: ควรแยกแยะประเด็นอะไรบ้าง หาความสัมพันธ์อะไร",
            "reasoning": "หลักการ/เหตุผลที่ควรอ้างถึง: ทฤษฎี กฎ หลักการอะไรที่เกี่ยวข้อง",
            "creativity": "ลักษณะผลงานที่คาดหวัง: ควรนำเสนออย่างไร มีความคิดสร้างสรรค์อย่างไร",
            "evidence": "หลักฐาน/ตัวอย่างที่ยืนยันความถูกต้อง: ข้อมูล ตัวเลข ผลลัพธ์ที่ควรแสดง"
          },
          "rubric": {
            "5": "ตอบครบทุกด้าน (A-R-C-E) อย่างลึกซึ้ง มีตัวอย่างชัดเจน สร้างสรรค์",
            "4": "ตอบครบทุกด้าน มีเหตุผลดี อาจขาดตัวอย่างบ้าง",
            "3": "ตอบได้ 2-3 ด้าน มีเหตุผลพอสมควร",
            "2": "ตอบได้ 1-2 ด้าน เหตุผลยังไม่ชัดเจน",
            "1": "พยายามตอบแต่ยังไม่ตรงประเด็น",
            "0": "ไม่ตอบหรือไม่เกี่ยวข้อง"
          },
          "maxScore": 20,
          "minCharacters": 100,
          "required": true,
          "hints": [
            "อ่านสถานการณ์ให้เข้าใจก่อนตอบ",
            "ตอบให้ครบทั้ง 4 ด้าน: วิเคราะห์ เหตุผล สร้างสรรค์ หลักฐาน"
          ]
        }
        // ... สร้างเพิ่มตามจำนวนที่กำหนด
      ]
    }
  ],
  "selfReflection": {
    "enabled": ${includeReflection !== false},
    "prompt": "สะท้อนความคิดจากการทำใบงานวัดผล",
    "questions": [
      "ข้อใดที่ท้าทายที่สุด และคุณแก้ปัญหาอย่างไร?",
      "ทักษะ ARCE ด้านใดที่คุณทำได้ดี และด้านใดที่ต้องพัฒนา?"
    ]
  },
  "scoring": {
    "totalPoints": 0,
    "passingScore": 60,
    "arceDistribution": {
      "analysis": 25,
      "reasoning": 25,
      "creativity": 25,
      "evidence": 25
    }
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
1. สร้างสถานการณ์ตามจำนวนที่กำหนด: ${questionCount || 3} สถานการณ์
2. แต่ละสถานการณ์ต้องมี: situation, task, answerGuide, expected (ครบ 4 ด้าน A-R-C-E)
3. สถานการณ์ต้องสอดคล้องกับเนื้อหาจากแผนการสอน โดยเฉพาะขั้น Evaluate
4. task ต้องชัดเจน ไม่กว้างเกินไป นักเรียนต้องรู้ว่าต้องทำอะไร
5. answerGuide ช่วยบอกนักเรียนว่าคำตอบที่ดีควรมีอะไรบ้าง
6. expected แต่ละด้านต้องเฉพาะเจาะจง ใช้ประเมินคำตอบได้
7. maxScore ของแต่ละข้อ = 20 คะแนน (5 คะแนนต่อด้าน ARCE)
8. question type ต้องเป็น "arce_situation"
9. เหมาะสมกับระดับชั้น ${gradeLevel || 'ม.4'}`
      } else {
        // Regular worksheet prompt (original)
        prompt = `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบใบงานอิเล็กทรอนิกส์สำหรับการเรียนการสอน

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
      } // End of else block for regular worksheet

      // Build system message based on worksheet type
      const systemMessage = isArceEvaluate 
        ? `คุณเป็นผู้เชี่ยวชาญออกแบบ "ใบงานวัดผล ARCE" ที่:
1. เข้าใจ A.R.C.E. Framework อย่างลึกซึ้ง (Analysis, Reasoning, Creativity, Evidence)
2. สร้างสถานการณ์ปัญหาที่น่าสนใจและเกี่ยวข้องกับชีวิตจริง
3. ออกแบบภารกิจที่ชัดเจน นักเรียนเข้าใจว่าต้องทำอะไร
4. กำหนด Expected_ARCE ที่เฉพาะเจาะจง ใช้ตรวจคำตอบได้
5. ⚠️ ปฏิบัติตามจำนวนสถานการณ์ที่ระบุอย่างเคร่งครัด
ตอบเป็นภาษาไทยและ JSON เท่านั้น`
        : `คุณเป็นผู้เชี่ยวชาญออกแบบใบงานอิเล็กทรอนิกส์ที่:
1. เข้าใจ 5E Model และ A.R.C.E. Framework อย่างลึกซึ้ง
2. สร้างคำถามที่กระตุ้นทักษะคิดขั้นสูง (HOTS)
3. ออกแบบ form ที่ใช้งานง่าย หลากหลายรูปแบบ
4. สร้าง rubric ที่ชัดเจนสำหรับการประเมิน
5. ⚠️ ปฏิบัติตามจำนวนคำถามที่ระบุอย่างเคร่งครัด ห้ามสร้างเกินหรือน้อยกว่า
ตอบเป็นภาษาไทยและ JSON เท่านั้น`

      const completion = await openaiClient.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 16000  // Increased for complex worksheets
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
        
        // Try to repair truncated JSON
        try {
          worksheetData = JSON.parse(cleanedText)
        } catch (firstError) {
          console.log('First parse failed, attempting JSON repair...')
          // Try to close unclosed structures
          let repaired = cleanedText
          
          // Count brackets and try to close them
          const openBraces = (repaired.match(/\{/g) || []).length
          const closeBraces = (repaired.match(/\}/g) || []).length
          const openBrackets = (repaired.match(/\[/g) || []).length
          const closeBrackets = (repaired.match(/\]/g) || []).length
          
          // Remove trailing incomplete content after last complete property
          repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*[^,}\]]*$/s, '')
          
          // Close arrays and objects
          for (let i = 0; i < openBrackets - closeBrackets; i++) {
            repaired += ']'
          }
          for (let i = 0; i < openBraces - closeBraces; i++) {
            repaired += '}'
          }
          
          worksheetData = JSON.parse(repaired)
          console.log('✅ JSON repair successful')
        }
      } catch (parseError) {
        console.error('Failed to parse worksheet JSON:', parseError.message)
        console.error('Response text preview:', responseText.substring(0, 500))
        return res.status(500).send({ 
          error: 'Failed to parse AI response',
          details: parseError.message,
          preview: responseText.substring(0, 200)
        })
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

// Helper function to update worksheet statistics
async function updateWorksheetStats(worksheetId, summary) {
  const db = getDb()
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
 * Assess Worksheet Submission
 * ตรวจใบงานด้วย AI ให้ feedback และคะแนน HOTS A.R.C.E.
 * พร้อมจุดแข็ง จุดอ่อน ข้อเสนอแนะตามมาตรฐาน PA/DPA
 */
exports.assessWorksheetSubmission = functions.runWith({ 
  secrets: [openaiApiKeySecret],
  timeoutSeconds: 540,  // เพิ่มเป็น 9 นาที สำหรับ AI generation
  memory: '2GB'
}).https.onRequest(async (req, res) => {
  // Handle CORS preflight first
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

      const db = getDb()

      const {
        submissionId,
        worksheetId,
        courseId, // 🆕 ดึง courseId เพื่อหา assessmentMode
        answers,
        worksheetStructure,
        attemptNumber,
        previousBestScore,
        retrySettings
      } = req.body

      if (!worksheetId || !answers) {
        return res.status(400).send({
          error: 'Missing required: worksheetId, answers'
        })
      }

      // 🆕 Get course setting for assessmentMode
      let useMultiAgent = false
      if (courseId) {
        try {
          const courseDoc = await db.collection('courses').doc(courseId).get()
          if (courseDoc.exists) {
            const courseData = courseDoc.data()
            useMultiAgent = courseData.assessmentMode === 'multi-agent'
            console.log(`📚 Course ${courseId} assessmentMode: ${courseData.assessmentMode || 'single'} (Multi-Agent: ${useMultiAgent})`)
          }
        } catch (err) {
          console.warn('Could not fetch course settings:', err.message)
        }
      }

      // Get OpenAI client
      let openai
      try {
        openai = getOpenAIClient()
      } catch (err) {
        return res.status(500).send({ error: 'OpenAI not configured' })
      }

      const model = getDefaultModel()

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
            // Handle ARCE Situation question type specially
            if (q.type === 'arce_situation') {
              let formattedAnswer = studentAnswer
              // If it's a structured ARCE answer object
              if (typeof studentAnswer === 'object' && studentAnswer.type === 'arce_structured') {
                formattedAnswer = studentAnswer.fullText || JSON.stringify(studentAnswer)
              }
              
              questionsForAssessment.push({
                questionId: q.id,
                sectionId: section.id,
                phase: section.phase,
                type: q.type,
                situation: q.situation || '',
                task: q.task || '',
                expectedArce: q.expected || null, // Expected answers for each ARCE dimension
                prompt: q.task || q.prompt || '', // Use task as prompt for ARCE questions
                context: q.situation || q.context || '',
                arceFocus: ['analysis', 'reasoning', 'creativity', 'evidence'], // All 4 for ARCE Situation
                maxScore: q.maxScore || 20,
                rubric: q.rubric || null,
                studentAnswer: formattedAnswer
              })
            } else {
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
          }
        })
      })

      if (questionsForAssessment.length === 0) {
        return res.status(400).send({ error: 'No answers to assess' })
      }

      // Check if this is an ARCE Evaluate worksheet
      const isArceEvaluateWorksheet = worksheet.metadata?.worksheetType === 'arce_evaluate'
      const hasArceSituations = questionsForAssessment.some(q => q.type === 'arce_situation')

      // Build the appropriate prompt based on worksheet type
      let prompt
      
      if (isArceEvaluateWorksheet || hasArceSituations) {
        // Special assessment prompt for ARCE Evaluate worksheets
        prompt = `คุณเป็นผู้เชี่ยวชาญด้านการประเมินใบงานวัดผล ARCE (Analysis, Reasoning, Creativity, Evidence)

📚 ข้อมูลใบงาน:
- ชื่อใบงาน: ${worksheet.metadata?.title || 'ใบงานวัดผล ARCE'}
- รายวิชา: ${worksheet.metadata?.courseName || ''}
- หัวข้อ: ${worksheet.metadata?.topic || ''}
- ระดับชั้น: ${worksheet.metadata?.gradeLevel || 'ม.4'}

📋 คำตอบของนักเรียนที่ต้องประเมิน:
${questionsForAssessment.map((q, i) => {
  if (q.type === 'arce_situation') {
    return `
[สถานการณ์ที่ ${i + 1}]
📌 สถานการณ์: ${q.situation || q.context || ''}
🎯 ภารกิจ: ${q.task || q.prompt || ''}
📊 คะแนนเต็ม: ${q.maxScore} คะแนน (5 คะแนนต่อด้าน ARCE)
${q.expectedArce ? `
✅ เกณฑ์การประเมิน (Expected_ARCE):
- Expected_A (การวิเคราะห์ที่คาดหวัง): ${q.expectedArce.analysis || 'ไม่ระบุ'}
- Expected_R (เหตุผลที่คาดหวัง): ${q.expectedArce.reasoning || 'ไม่ระบุ'}
- Expected_C (ความสร้างสรรค์ที่คาดหวัง): ${q.expectedArce.creativity || 'ไม่ระบุ'}
- Expected_E (หลักฐานที่คาดหวัง): ${q.expectedArce.evidence || 'ไม่ระบุ'}` : ''}

📝 คำตอบของนักเรียน:
"""${q.studentAnswer}"""`
  } else {
    return `
[คำถามที่ ${i + 1}]
- คำถาม: ${q.prompt}
${q.context ? `- บริบท: ${q.context}` : ''}
- ประเภท: ${q.type}
- คะแนนเต็ม: ${q.maxScore}
- คำตอบนักเรียน: """${typeof q.studentAnswer === 'object' ? JSON.stringify(q.studentAnswer) : q.studentAnswer}"""`
  }
}).join('\n---\n')}

🎯 วิธีการประเมิน ARCE (แต่ละด้าน 0-5 คะแนน):
สำหรับคำถามประเภท ARCE Situation ให้ประเมินแยกแต่ละด้าน:

**A - Analysis (การวิเคราะห์):** 
- 5 = วิเคราะห์ได้ลึกซึ้ง ครอบคลุม แยกแยะประเด็นได้ครบถ้วน
- 4 = วิเคราะห์ได้ดี มีประเด็นสำคัญครบ
- 3 = วิเคราะห์ได้พอสมควร ยังขาดบางประเด็น
- 2 = วิเคราะห์ได้บางส่วน ไม่ครบถ้วน
- 1 = พยายามวิเคราะห์แต่ยังไม่ตรงประเด็น
- 0 = ไม่ได้วิเคราะห์

**R - Reasoning (การให้เหตุผล):**
- 5 = อ้างเหตุผล/หลักการได้ชัดเจน ถูกต้อง มีตรรกะดีเยี่ยม
- 4 = อ้างเหตุผลได้ดี มีหลักการสนับสนุน
- 3 = มีเหตุผลพอสมควร แต่ยังไม่ชัดเจนบางส่วน
- 2 = มีเหตุผลบ้าง แต่ยังไม่เพียงพอ
- 1 = พยายามให้เหตุผลแต่ยังไม่ถูกต้อง
- 0 = ไม่ได้ให้เหตุผล

**C - Creativity (ความคิดสร้างสรรค์):**
- 5 = มีความคิดริเริ่มโดดเด่น นำเสนอแนวทางใหม่ที่น่าสนใจมาก
- 4 = มีความคิดสร้างสรรค์ดี นำเสนอได้น่าสนใจ
- 3 = มีความคิดสร้างสรรค์พอสมควร
- 2 = มีความคิดบ้าง แต่ยังไม่โดดเด่น
- 1 = พยายามนำเสนอแต่ยังไม่ชัดเจน
- 0 = ไม่แสดงความคิดสร้างสรรค์

**E - Evidence (หลักฐาน):**
- 5 = ยกตัวอย่าง/หลักฐานได้ครบถ้วน ชัดเจน น่าเชื่อถือมาก
- 4 = มีหลักฐานดี ยกตัวอย่างได้เหมาะสม
- 3 = มีหลักฐานบางส่วน ยกตัวอย่างได้พอสมควร
- 2 = มีหลักฐานบ้าง แต่ยังไม่เพียงพอ
- 1 = พยายามยกตัวอย่างแต่ยังไม่ตรงประเด็น
- 0 = ไม่มีหลักฐานหรือตัวอย่าง

📊 มาตรฐาน PA/DPA:
- ระดับ 4 (ดีมาก): 80-100%
- ระดับ 3 (ดี): 60-79%
- ระดับ 2 (พอใช้): 40-59%
- ระดับ 1 (ต้องปรับปรุง): 0-39%

📝 ตอบเป็น JSON (ห้าม markdown wrapper):
{
  "summary": {
    "totalScore": 0,
    "maxScore": ${worksheet.scoring?.totalPoints || (questionsForAssessment.length * 20)},
    "percentage": 0,
    "paLevel": 1,
    "paLevelText": "ระดับ X: คำอธิบาย",
    "overallFeedback": "สรุปภาพรวมผลงาน กล่าวถึงจุดเด่นและสิ่งที่ควรพัฒนา",
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
      "questionId": "arce_1",
      "sectionId": "section_id",
      "type": "arce_situation",
      "situation": "สถานการณ์ที่กำหนด",
      "task": "ภารกิจที่กำหนด",
      "studentAnswer": "คำตอบของนักเรียน",
      "arceBreakdown": {
        "analysis": {
          "score": 0,
          "feedback": "ประเมินการวิเคราะห์เทียบกับ Expected_A",
          "matchLevel": "เปรียบเทียบกับ Expected_A ได้มาก/น้อยแค่ไหน"
        },
        "reasoning": {
          "score": 0,
          "feedback": "ประเมินการให้เหตุผลเทียบกับ Expected_R",
          "matchLevel": "เปรียบเทียบกับ Expected_R ได้มาก/น้อยแค่ไหน"
        },
        "creativity": {
          "score": 0,
          "feedback": "ประเมินความคิดสร้างสรรค์เทียบกับ Expected_C",
          "matchLevel": "เปรียบเทียบกับ Expected_C ได้มาก/น้อยแค่ไหน"
        },
        "evidence": {
          "score": 0,
          "feedback": "ประเมินหลักฐานเทียบกับ Expected_E",
          "matchLevel": "เปรียบเทียบกับ Expected_E ได้มาก/น้อยแค่ไหน"
        }
      },
      "totalScore": 0,
      "maxScore": 20,
      "passed": false,
      "feedback": "สรุปภาพรวมคำตอบ จุดเด่น-จุดที่ต้องพัฒนา",
      "suggestion": "คำแนะนำเพื่อพัฒนาแต่ละด้าน ARCE"
    }
  ],
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
  "teacherNotes": "บันทึกสำหรับครู"
}

⚠️ ข้อกำหนดสำคัญ:
1. สำหรับ arce_situation ให้ประเมินแยกทุกด้าน A-R-C-E และรวมคะแนน
2. เปรียบเทียบคำตอบนักเรียนกับ Expected_ARCE ที่กำหนดไว้
3. feedback ต้องเฉพาะเจาะจง อ้างอิงจากคำตอบจริง
4. ทุก feedback เป็นภาษาไทย สุภาพ สร้างสรรค์ ให้กำลังใจ

<bias_prevention>
⚠️ ข้อควรระวังเรื่องอคติในการประเมิน:
1. ภาษา ≠ การคิด: ความสามารถในการเขียนภาษาไม่ใช่ตัวชี้วัดทักษะการคิด
   - หากนักเรียนมีไอเดียดีแต่สื่อสารไม่ชัด ให้คะแนนตาม "ความคิด" ไม่ใช่ "การเขียน"
   - ตัวสะกดผิด/ไวยากรณ์ผิด ไม่หักคะแนนทักษะการคิด
2. ความยาว ≠ คุณภาพ: คำตอบสั้นที่ตรงประเด็นดีกว่าคำตอบยาวที่วนซ้ำ
3. สไตล์ ≠ สาระ: ไม่ให้คะแนนเพิ่มเพราะใช้ศัพท์ยากหรือโครงสร้างซับซ้อน
4. เป็นกลาง: ไม่มีอคติจากเพศ เชื้อชาติ หรือภูมิหลังที่อาจปรากฏในคำตอบ
</bias_prevention>

<fluffy_content_detection>
🎯 การตรวจจับคำตอบที่มีแต่ "น้ำ" (Fluffy Content):
คำตอบที่มีเฉพาะคำชมเชย/ความรู้สึกโดยไม่มีสาระ ต้องได้คะแนน 0 ใน R และ E:

ตัวอย่างคำตอบที่ "มีแต่น้ำ" (ต้องให้ R=0, E=0):
- "ผมคิดว่ามันดีมากๆ เลยครับเพราะมันสุดยอด"
- "เรื่องนี้น่าสนใจมากค่ะ ชอบมากเลย"
- "ดีมากครับ เห็นด้วยเลย"

การตรวจสอบ:
- มีการอ้างเหตุผลที่ตรวจสอบได้หรือไม่? (ถ้าไม่ R=0)
- มีการยกตัวอย่าง/หลักฐานเฉพาะเจาะจงหรือไม่? (ถ้าไม่ E=0)
- คำว่า "ดี" "สุดยอด" "น่าสนใจ" ไม่ใช่เหตุผล/หลักฐาน
</fluffy_content_detection>`
      } else {
        // Original assessment prompt for regular worksheets
        prompt = `คุณเป็นผู้เชี่ยวชาญด้านการประเมินทักษะการคิดขั้นสูง (HOTS) ตามเกณฑ์ A.R.C.E., Bloom's Taxonomy และมาตรฐาน PA/DPA

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
7. ทุก feedback เป็นภาษาไทย สุภาพ สร้างสรรค์ ให้กำลังใจ

<bias_prevention>
⚠️ ข้อควรระวังเรื่องอคติในการประเมิน:
1. ภาษา ≠ การคิด: ความสามารถในการเขียนภาษาไม่ใช่ตัวชี้วัดทักษะการคิด
   - หากนักเรียนมีไอเดียดีแต่สื่อสารไม่ชัด ให้คะแนนตาม "ความคิด" ไม่ใช่ "การเขียน"
   - ตัวสะกดผิด/ไวยากรณ์ผิด ไม่หักคะแนนทักษะการคิด
2. ความยาว ≠ คุณภาพ: คำตอบสั้นที่ตรงประเด็นดีกว่าคำตอบยาวที่วนซ้ำ
3. สไตล์ ≠ สาระ: ไม่ให้คะแนนเพิ่มเพราะใช้ศัพท์ยากหรือโครงสร้างซับซ้อน
4. เป็นกลาง: ไม่มีอคติจากเพศ เชื้อชาติ หรือภูมิหลังที่อาจปรากฏในคำตอบ
</bias_prevention>

<fluffy_content_detection>
🎯 การตรวจจับคำตอบที่มีแต่ "น้ำ" (Fluffy Content):
คำตอบที่มีเฉพาะคำชมเชย/ความรู้สึกโดยไม่มีสาระ ต้องได้คะแนน 0 ใน R และ E:

ตัวอย่างคำตอบที่ "มีแต่น้ำ" (ต้องให้ R=0, E=0):
- "ผมคิดว่ามันดีมากๆ เลยครับเพราะมันสุดยอด"
- "เรื่องนี้น่าสนใจมากค่ะ ชอบมากเลย"
- "ดีมากครับ เห็นด้วยเลย"

การตรวจสอบ:
- มีการอ้างเหตุผลที่ตรวจสอบได้หรือไม่? (ถ้าไม่ R=0)
- มีการยกตัวอย่าง/หลักฐานเฉพาะเจาะจงหรือไม่? (ถ้าไม่ E=0)
- คำว่า "ดี" "สุดยอด" "น่าสนใจ" ไม่ใช่เหตุผล/หลักฐาน
</fluffy_content_detection>`
      } // End of else block for regular worksheets

      // Use appropriate system message based on worksheet type
      const systemMessage = (isArceEvaluateWorksheet || hasArceSituations)
        ? `คุณเป็นผู้เชี่ยวชาญประเมินใบงานวัดผล ARCE ที่:
1. ประเมินแยกทุกด้าน A-R-C-E อย่างละเอียด
2. เปรียบเทียบคำตอบกับ Expected_ARCE ที่กำหนดไว้
3. ให้ feedback ที่สร้างสรรค์ เป็นกำลังใจ
4. ระบุจุดแข็ง/จุดอ่อนอย่างเฉพาะเจาะจงในแต่ละด้าน
5. แนะนำวิธีพัฒนาแต่ละด้าน ARCE อย่างเป็นรูปธรรม
ตอบเป็น JSON ภาษาไทยเท่านั้น`
        : `คุณเป็นผู้เชี่ยวชาญประเมินทักษะ HOTS ที่:
1. ประเมินอย่างยุติธรรม ตามหลักฐานในคำตอบ
2. ให้ feedback ที่สร้างสรรค์ เป็นกำลังใจ
3. ระบุจุดแข็ง/จุดอ่อนอย่างเฉพาะเจาะจง
4. แนะนำอย่างเป็นรูปธรรม ทำได้จริง
5. เข้าใจมาตรฐาน PA/DPA ของไทย
ตอบเป็น JSON ภาษาไทยเท่านั้น`

      let assessmentResult
      
      // 🤖 Multi-Agent Mode: Use 6 agents for more accurate assessment
      if (useMultiAgent && !isArceEvaluateWorksheet && !hasArceSituations) {
        console.log('🤖×6 Using Multi-Agent mode for worksheet assessment')
        
        // Combine all answers for multi-agent assessment
        const combinedAnswer = questionsForAssessment
          .map(q => `${q.prompt}: ${typeof q.studentAnswer === 'object' ? JSON.stringify(q.studentAnswer) : q.studentAnswer}`)
          .join('\n\n')
        
        const mainQuestion = questionsForAssessment[0]?.prompt || worksheet.metadata?.title || 'ใบงาน'
        
        try {
          const multiAgentResult = await runMultiAgentAssessment(
            combinedAnswer,
            mainQuestion,
            getOpenAIClient(),
            model,
            {
              gradeLevel: worksheet.metadata?.gradeLevel || 'ม.4',
              subjectArea: worksheet.metadata?.subjectGroup || 'ทั่วไป',
              expectedLOs: worksheet.metadata?.learningOutcomes || []
            }
          )
          
          // Map Multi-Agent result to worksheet assessment format
          const totalMaxScore = worksheet.scoring?.totalPoints || (questionsForAssessment.length * 5)
          const multiTotalScore = (multiAgentResult.consensus?.analysis || 0) +
                                  (multiAgentResult.consensus?.reasoning || 0) +
                                  (multiAgentResult.consensus?.creativity || 0) +
                                  (multiAgentResult.consensus?.evidence || 0)
          const percentage = Math.round((multiTotalScore / 20) * 100)
          const paLevel = percentage >= 80 ? 4 : percentage >= 60 ? 3 : percentage >= 40 ? 2 : 1
          const paLevelText = paLevel === 4 ? 'ระดับ 4: ดีมาก' : 
                              paLevel === 3 ? 'ระดับ 3: ดี' :
                              paLevel === 2 ? 'ระดับ 2: พอใช้' : 'ระดับ 1: ต้องปรับปรุง'
          
          assessmentResult = {
            summary: {
              totalScore: Math.round((percentage / 100) * totalMaxScore),
              maxScore: totalMaxScore,
              percentage,
              paLevel,
              paLevelText,
              overallFeedback: multiAgentResult.consensus?.feedback || 'การประเมินเสร็จสิ้น',
              recommendation: multiAgentResult.consensus?.recommendations?.[0] || 'ฝึกฝนต่อไป'
            },
            arceScores: {
              analysis: {
                raw: multiAgentResult.consensus?.analysis || 0,
                max: 5,
                percentage: ((multiAgentResult.consensus?.analysis || 0) / 5) * 100,
                feedback: multiAgentResult.agentResults?.analysis?.feedback || multiAgentResult.agentDetails?.analysis?.microFeedback || ''
              },
              reasoning: {
                raw: multiAgentResult.consensus?.reasoning || 0,
                max: 5,
                percentage: ((multiAgentResult.consensus?.reasoning || 0) / 5) * 100,
                feedback: multiAgentResult.agentResults?.reasoning?.feedback || multiAgentResult.agentDetails?.reasoning?.microFeedback || ''
              },
              creativity: {
                raw: multiAgentResult.consensus?.creativity || 0,
                max: 5,
                percentage: ((multiAgentResult.consensus?.creativity || 0) / 5) * 100,
                feedback: multiAgentResult.agentResults?.creativity?.feedback || multiAgentResult.agentDetails?.creativity?.microFeedback || ''
              },
              evidence: {
                raw: multiAgentResult.consensus?.evidence || 0,
                max: 5,
                percentage: ((multiAgentResult.consensus?.evidence || 0) / 5) * 100,
                feedback: multiAgentResult.agentResults?.evidence?.feedback || multiAgentResult.agentDetails?.evidence?.microFeedback || ''
              }
            },
            questionResults: questionsForAssessment.map(q => ({
              questionId: q.questionId,
              sectionId: q.sectionId,
              score: Math.round((percentage / 100) * q.maxScore),
              maxScore: q.maxScore,
              passed: percentage >= 50,
              feedback: multiAgentResult.consensus?.feedback || ''
            })),
            strengths: multiAgentResult.consensus?.strengths || multiAgentResult.strengths || [],
            weaknesses: multiAgentResult.consensus?.weaknesses || multiAgentResult.weaknesses || [],
            nextSteps: multiAgentResult.consensus?.recommendations || [],
            teacherNotes: `📊 ประเมินด้วย Multi-Agent (6 AI): ความเชื่อมั่น ${multiAgentResult.confidence || multiAgentResult.consensus?.averageConfidence || 'N/A'}%`,
            assessmentMode: 'multi-agent',
            // 🆕 เพิ่ม agentDetails ละเอียด เหมือน Chat
            agentDetails: {
              analysis: {
                agentName: 'Analysis Expert',
                score: multiAgentResult.agentDetails?.analysis?.score || 0,
                confidence: multiAgentResult.agentDetails?.analysis?.confidence || 0,
                microFeedback: multiAgentResult.agentDetails?.analysis?.microFeedback || '',
                chainOfThought: multiAgentResult.agentDetails?.analysis?.chainOfThought || ''
              },
              reasoning: {
                agentName: 'Reasoning Expert',
                score: multiAgentResult.agentDetails?.reasoning?.score || 0,
                confidence: multiAgentResult.agentDetails?.reasoning?.confidence || 0,
                microFeedback: multiAgentResult.agentDetails?.reasoning?.microFeedback || '',
                chainOfThought: multiAgentResult.agentDetails?.reasoning?.chainOfThought || ''
              },
              creativity: {
                agentName: 'Creativity Expert',
                score: multiAgentResult.agentDetails?.creativity?.score || 0,
                confidence: multiAgentResult.agentDetails?.creativity?.confidence || 0,
                microFeedback: multiAgentResult.agentDetails?.creativity?.microFeedback || '',
                chainOfThought: multiAgentResult.agentDetails?.creativity?.chainOfThought || ''
              },
              evidence: {
                agentName: 'Evidence Expert',
                score: multiAgentResult.agentDetails?.evidence?.score || 0,
                confidence: multiAgentResult.agentDetails?.evidence?.confidence || 0,
                microFeedback: multiAgentResult.agentDetails?.evidence?.microFeedback || '',
                chainOfThought: multiAgentResult.agentDetails?.evidence?.chainOfThought || ''
              },
              adversarial: multiAgentResult.agentDetails?.adversarial || {
                refinedScores: multiAgentResult.rubricScores || {},
                challenges: [],
                biasDetected: [],
                consistencyScore: 0
              },
              consensus: multiAgentResult.agentDetails?.consensus || {
                rubricScores: multiAgentResult.rubricScores || {},
                totalScore: multiAgentResult.totalScore || 0,
                confidence: multiAgentResult.confidence || 0,
                consensusLevel: 'moderate',
                feedback: multiAgentResult.feedback || ''
              }
            },
            multiAgentMetadata: {
              processingTimeMs: multiAgentResult.multiAgentMetadata?.processingTimeMs || 0,
              agentCount: 6,
              consensusLevel: multiAgentResult.agentDetails?.consensus?.consensusLevel || 'moderate'
            },
            agentDebate: multiAgentResult.adversarialRefinement || null
          }
          
          console.log('✅ Multi-Agent worksheet assessment completed:', {
            totalScore: assessmentResult.summary.totalScore,
            percentage: assessmentResult.summary.percentage
          })
          
        } catch (multiAgentError) {
          console.error('❌ Multi-Agent failed, falling back to single agent:', multiAgentError.message)
          // Fall through to single agent below
          assessmentResult = null
        }
      }
      
      // Single Agent Mode (default or fallback)
      if (!assessmentResult) {
        console.log('🤖×1 Using Single Agent mode for worksheet assessment')
        
        const completion = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'system',
              content: systemMessage
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 4000
        })

        const responseText = completion.choices[0].message.content
        try {
          let cleanedText = responseText.trim()
          if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
            cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
          }
          assessmentResult = JSON.parse(cleanedText)
          assessmentResult.assessmentMode = 'single' // Mark as single agent
        } catch (parseError) {
          console.error('Failed to parse assessment JSON:', responseText)
          return res.status(500).send({ error: 'Failed to parse AI response' })
        }
      } // End of single agent block

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
        loAssessment = await assessLearningOutcomes(getOpenAIClient(), allAnswers, worksheetLOs, { rubricScores })
        
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
          
          // Determine score mode from retrySettings
          const scoreMode = retrySettings?.scoreMode || worksheet.retrySettings?.scoreMode || 'best'
          const currentAttempt = attemptNumber || 1
          const currentScore = assessmentResult.summary.totalScore

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
            // 🔄 Retry tracking
            attemptNumber: currentAttempt,
            scoreMode: scoreMode,
            assessedAt: new Date().toISOString()
          }

          if (progressDoc.exists) {
            const currentData = progressDoc.data()
            const currentPassedLOs = currentData.passedLOs || []
            // 🎯 Merge new passed LOs with existing ones
            const newPassedLOs = loAssessment.passedLOs || []
            const updatedPassedLOs = [...new Set([...currentPassedLOs, ...newPassedLOs])]
            
            // 🔄 Calculate recorded score based on score mode
            const worksheetScores = currentData.worksheetScores || {}
            const existingScoreData = worksheetScores[worksheetId] || { 
              bestScore: 0, 
              latestScore: 0, 
              firstScore: currentScore,
              attemptCount: 0,
              totalScore: 0 
            }
            
            const newBestScore = Math.max(existingScoreData.bestScore || 0, currentScore)
            const newAttemptCount = (existingScoreData.attemptCount || 0) + 1
            const newTotalScore = (existingScoreData.totalScore || 0) + currentScore
            const avgScore = newTotalScore / newAttemptCount
            
            // Determine which score to record based on mode
            let recordedScore
            switch (scoreMode) {
              case 'best':
                recordedScore = newBestScore
                break
              case 'latest':
                recordedScore = currentScore
                break
              case 'average':
                recordedScore = avgScore
                break
              case 'first':
                recordedScore = existingScoreData.firstScore || currentScore
                break
              default:
                recordedScore = newBestScore
            }
            
            // Update worksheet scores tracking
            worksheetScores[worksheetId] = {
              bestScore: newBestScore,
              latestScore: currentScore,
              firstScore: existingScoreData.firstScore || currentScore,
              attemptCount: newAttemptCount,
              totalScore: newTotalScore,
              avgScore: avgScore,
              recordedScore: recordedScore,
              scoreMode: scoreMode,
              lastAttemptAt: new Date().toISOString()
            }
            
            await progressRef.update({
              worksheetAssessments: admin.firestore.FieldValue.arrayUnion(worksheetAssessment),
              worksheetScores: worksheetScores,
              passedLOs: updatedPassedLOs,
              lastAssessedAt: admin.firestore.FieldValue.serverTimestamp()
            })
            
            // 🎮 GAMIFICATION: เพิ่ม XP, Badge, Streak สำหรับ Worksheet (เหมือน Chat)
            const worksheetGamificationData = {
              rubricScores: worksheetAssessment.arceScores,
              overallScore: assessmentResult.summary.totalScore
            }
            const worksheetPointsEarned = calculatePointsSimple(worksheetGamificationData)
            
            // Calculate streak
            const currentDate = new Date().toISOString()
            const streakUpdate = calculateStreak(currentData.lastActiveDate, currentDate)
            
            const gamificationUpdate = {
              totalPoints: admin.firestore.FieldValue.increment(worksheetPointsEarned),
              worksheetCount: admin.firestore.FieldValue.increment(1),
              lastActiveDate: currentDate
            }
            
            // Add streak data if applicable
            if (streakUpdate && streakUpdate.increment) {
              gamificationUpdate.currentStreak = admin.firestore.FieldValue.increment(1)
              const newStreak = (currentData.currentStreak || 0) + 1
              if (newStreak > (currentData.maxStreak || 0)) {
                gamificationUpdate.maxStreak = newStreak
              }
            }
            
            await progressRef.update(gamificationUpdate)
            
            // Check for badges
            const courseDoc = await db.collection('courses').doc(submissionData.courseId).get()
            const totalLOs = courseDoc.exists ? (courseDoc.data().learningOutcomes?.length || 0) : 0
            const newBadges = checkBadges({
              ...currentData,
              totalPassed: updatedPassedLOs.length,
              totalPoints: (currentData.totalPoints || 0) + worksheetPointsEarned,
              currentStreak: streakUpdate?.increment ? (currentData.currentStreak || 0) + 1 : currentData.currentStreak,
              worksheetCount: (currentData.worksheetCount || 0) + 1
            }, totalLOs)
            
            // Update badges if new ones earned
            if (newBadges.length > 0) {
              const badgeIds = newBadges.map(b => b.id)
              const badgePoints = newBadges.reduce((sum, b) => sum + b.points, 0)
              await progressRef.update({
                badges: admin.firestore.FieldValue.arrayUnion(...badgeIds),
                totalPoints: admin.firestore.FieldValue.increment(badgePoints)
              })
              console.log(`🏆 Worksheet badges earned for ${submissionData.studentId}:`, badgeIds)
            }
            
            console.log(`🎮 Worksheet gamification: ${submissionData.studentId} earned ${worksheetPointsEarned} XP`)
          } else {
            // First submission - initialize everything
            const worksheetScores = {}
            worksheetScores[worksheetId] = {
              bestScore: currentScore,
              latestScore: currentScore,
              firstScore: currentScore,
              attemptCount: 1,
              totalScore: currentScore,
              avgScore: currentScore,
              recordedScore: currentScore,
              scoreMode: scoreMode,
              lastAttemptAt: new Date().toISOString()
            }
            
            await progressRef.set({
              studentId: submissionData.studentId,
              courseId: submissionData.courseId,
              worksheetAssessments: [worksheetAssessment],
              worksheetScores: worksheetScores,
              passedLOs: loAssessment.passedLOs || [],
              // 🎮 GAMIFICATION: Initialize for first worksheet submission
              totalPoints: calculatePointsSimple({
                rubricScores: worksheetAssessment.arceScores,
                overallScore: assessmentResult.summary.totalScore
              }),
              worksheetCount: 1,
              assessmentCount: 0,
              currentStreak: 1,
              maxStreak: 1,
              badges: [],
              lastActiveDate: new Date().toISOString(),
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              lastAssessedAt: admin.firestore.FieldValue.serverTimestamp()
            })
            
            console.log(`🎮 First worksheet: ${submissionData.studentId} started gamification`)
          }

          // 📊 Log Learning Event for research data (non-blocking)
          logLearningEvent(db, {
            studentId: submissionData.studentId,
            courseId: submissionData.courseId,
            eventType: EVENT_TYPES.WORKSHEET_SUBMISSION,
            rubricScores: worksheetAssessment.arceScores,
            passedLOs: loAssessment.passedLOs || [],
            metadata: {
              worksheetId,
              submissionId,
              score: assessmentResult.summary.totalScore,
              maxScore: assessmentResult.summary.maxScore,
              percentage: assessmentResult.summary.percentage,
              paLevel: assessmentResult.summary.paLevel,
              attemptNumber: currentAttempt,
              scoreMode: scoreMode
            }
          }).catch(err => console.error('Failed to log worksheet learning event:', err))
          
          // 📈 Update Growth History (non-blocking)
          updateGrowthHistory(db, {
            studentId: submissionData.studentId,
            courseId: submissionData.courseId,
            rubricScores: worksheetAssessment.arceScores,
            source: 'worksheet',
            metadata: { 
              worksheetId, 
              submissionId, 
              attemptNumber: currentAttempt,
              scoreMode: scoreMode
            }
          }).catch(err => console.error('Failed to update worksheet growth history:', err))
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

module.exports = exports
