/**
 * Generation Controller
 * AI Generation Functions (Lesson Plans, Worksheets, Questions, Solutions, etc.)
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
const { verifyTeacherRole } = require('../utils/authMiddleware')

const getDb = () => admin.firestore()
const getOpenAI = () => getOpenAIClient()

/**
 * Generate Lesson Plan
 * Updated: 2026-01-02 - Fixed CORS handling
 */
exports.generateLessonPlan = functions.runWith({ 
  secrets: [openaiApiKeySecret],
  timeoutSeconds: 540,
  memory: '2GB'
}).https.onRequest(async (req, res) => {
  // 🔐 Handle CORS preflight FIRST - before any auth checks!
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.set('Access-Control-Max-Age', '3600')
  
  if (req.method === 'OPTIONS') {
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
        unitArceDistribution,  // การกระจาย ARCE ระดับหน่วย
        unitArceFocus,         // ARCE หลักของหน่วย
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

      // 🔧 FIX: Use getOpenAIClient() instead of undefined 'openai'
      let openaiClient
      try {
        openaiClient = getOpenAIClient()
      } catch (err) {
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
        // อาจเป็น string เดี่ยว ให้แปลงเป็น array
        if (typeof effectiveArce === 'string') {
          effectiveArce = [effectiveArce]
        } else {
          effectiveArce = ['analysis', 'reasoning', 'creativity', 'evidence']
        }
      }
      const arceMap = {
        'analysis': 'การวิเคราะห์ (Analysis)',
        'reasoning': 'การให้เหตุผล (Reasoning)',
        'creativity': 'ความคิดสร้างสรรค์ (Creativity)',
        'evidence': 'การใช้หลักฐาน (Evidence)'
      }
      const arceText = effectiveArce.map(a => arceMap[a] || a).join(', ')

      // Build unit ARCE context
      let unitArceContext = ''
      if (unitArceFocus || unitArceDistribution) {
        unitArceContext = '\n📊 บริบท A.R.C.E. ของหน่วยการเรียนรู้:\n'
        if (unitArceFocus && Array.isArray(unitArceFocus)) {
          unitArceContext += `- ด้าน A.R.C.E. หลักของหน่วย: ${unitArceFocus.map(a => arceMap[a] || a).join(', ')}\n`
        }
        if (unitArceDistribution && typeof unitArceDistribution === 'object') {
          unitArceContext += `- การกระจายน้ำหนัก: ${Object.entries(unitArceDistribution).map(([k, v]) => `${arceMap[k] || k}: ${v}`).join(', ')}\n`
        }
        unitArceContext += `- แผนนี้เน้น: ${arceText}\n`
        unitArceContext += `⚠️ ต้องออกแบบกิจกรรมให้สอดคล้องกับ A.R.C.E. ที่กำหนดในแผนนี้ และส่งเสริมเป้าหมาย A.R.C.E. ระดับหน่วย`
      }

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
${unitArceContext}
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

      const completion = await openaiClient.chat.completions.create({
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
