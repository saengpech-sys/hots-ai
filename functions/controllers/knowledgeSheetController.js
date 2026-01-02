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
 * Sanitize data for Firestore - remove undefined, convert nested arrays
 */
function sanitizeForFirestore(obj, depth = 0) {
  if (depth > 10) return obj  // Prevent infinite recursion
  
  if (obj === null || obj === undefined) return null
  if (typeof obj !== 'object') return obj
  if (obj instanceof Date) return obj
  
  if (Array.isArray(obj)) {
    // Firestore doesn't support arrays of arrays well
    // Convert deeply nested arrays to strings if needed
    return obj.map(item => {
      if (Array.isArray(item)) {
        // Convert nested array to JSON string if it's too deep
        if (depth > 2) return JSON.stringify(item)
        return item.map(subItem => sanitizeForFirestore(subItem, depth + 1))
      }
      return sanitizeForFirestore(item, depth + 1)
    }).filter(item => item !== undefined)
  }
  
  const sanitized = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      sanitized[key] = sanitizeForFirestore(value, depth + 1)
    }
  }
  return sanitized
}

/**
 * Generate Knowledge Sheet
 */
exports.generateKnowledgeSheet = functions
  .runWith({ 
    secrets: [openaiApiKeySecret],
    memory: '2GB', 
    timeoutSeconds: 540 
  })
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      try {
        const { 
          // Support both old and new field names
          subject, 
          courseName,
          topic, 
          grade,
          gradeLevel,
          targetAudience = 'students',
          depth = 'standard', // basic, standard, advanced
          // New fields from LessonPlanDetail
          unitName,
          unitNumber,
          planNumber,
          keyConcepts,
          learningContent,
          essentialContent,
          objectives,
          arceFocus,
          activities5E,
          // 🆕 Full options from KnowledgeSheetGeneratorModal
          style = 'standard',
          language = 'thai',
          includeIntroduction = true,
          includeExamples = true,
          includeDiagrams = true,
          includeVocabulary = true,
          includeHOTS = true,
          includeSummary = true,
          includeSelfCheck = true,
          includeResources = true
        } = req.body

        // Support both old (subject, grade) and new (courseName, gradeLevel) field names
        const subjectName = subject || courseName
        const gradeValue = grade || gradeLevel
        const topicName = topic || (keyConcepts && keyConcepts[0]) || ''

        if (!subjectName || !topicName || !gradeValue) {
          return res.status(400).send({ 
            error: 'Missing required fields',
            required: 'subject/courseName, topic, grade/gradeLevel',
            received: { subject: subjectName, topic: topicName, grade: gradeValue }
          })
        }

        // 🔒 Check if lessonPlanId already has a knowledge sheet (prevent duplicates)
        const lessonPlanId = req.body.lessonPlanId
        if (lessonPlanId) {
          const db = getDb()
          const existingKS = await db.collection('knowledgeSheets')
            .where('metadata.lessonPlanId', '==', lessonPlanId)
            .limit(1)
            .get()
          
          if (!existingKS.empty) {
            const existingDoc = existingKS.docs[0]
            return res.status(409).send({
              error: 'Knowledge sheet already exists for this lesson plan',
              existingKnowledgeSheetId: existingDoc.id,
              message: 'แผนการสอนนี้มีใบความรู้อยู่แล้ว ไม่สามารถสร้างซ้ำได้'
            })
          }
        }

        const openai = getOpenAI()
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

        // Build rich context from LessonPlan data
        const courseCode = req.body.courseCode || ''
        const courseNameDisplay = subjectName  // Use different name to avoid conflict
        const objectivesText = objectives?.length ? objectives.map((o, i) => `${i + 1}. ${o}`).join('\n') : 'ตามแผนการสอน'
        const learningContentText = learningContent?.length ? learningContent.join('\n') : keyConcepts?.length ? keyConcepts.join('\n') : 'ตามหัวข้อที่กำหนด'
        
        // Build 5E activities text
        let activities5EText = 'ไม่ระบุ'
        if (activities5E) {
          const parts = []
          if (activities5E.engage?.activity) parts.push(`ขั้นสร้างความสนใจ: ${activities5E.engage.activity}`)
          if (activities5E.explore?.activity) parts.push(`ขั้นสำรวจ: ${activities5E.explore.activity}`)
          if (activities5E.explain?.keyConcepts?.length) parts.push(`ขั้นอธิบาย: ${activities5E.explain.keyConcepts.join(', ')}`)
          if (activities5E.elaborate?.activity) parts.push(`ขั้นขยายความรู้: ${activities5E.elaborate.activity}`)
          if (activities5E.evaluate?.method) parts.push(`ขั้นประเมิน: ${activities5E.evaluate.method}`)
          if (parts.length > 0) activities5EText = parts.join('\n')
        }

        // Build unit context for related plans
        let unitContext = ''
        let otherPlansContext = ''
        
        // Check if there are other plans in the same unit (for context)
        if (req.body.otherPlansInUnit && req.body.otherPlansInUnit.length > 0) {
          otherPlansContext = `\n\n📚 แผนการสอนอื่นในหน่วยเดียวกัน (อ้างอิงได้แต่ไม่ต้องซ้ำเนื้อหา):\n${req.body.otherPlansInUnit.map(p => `- แผนที่ ${p.planNumber}: ${p.topic}`).join('\n')}`
        }

        // Standalone context
        const standaloneContext = req.body.isStandalone ? '\n\n⚠️ นี่คือใบความรู้แบบ Standalone - ต้องมีเนื้อหาครบถ้วนในตัวเอง ไม่ต้องอ้างอิงแผนอื่น' : ''

        const prompt = `คุณเป็นครูผู้เชี่ยวชาญด้านการสร้างใบความรู้ที่มีคุณภาพสูง

## 📋 ข้อมูลแผนการสอน

**รายวิชา:** ${courseCode} ${courseNameDisplay}
**ระดับชั้น:** ${gradeValue || 'ม.4'}
**หน่วยที่ ${unitNumber || 1}:** ${unitName || topicName}
**แผนที่ ${planNumber || 1}:** ${topicName}

**สาระสำคัญ:**
${essentialContent || 'ตามหัวข้อที่กำหนด'}

**จุดประสงค์การเรียนรู้:**
${objectivesText}

**เนื้อหาการเรียนรู้:**
${learningContentText}

**กิจกรรม 5E:**
${activities5EText}

${unitContext}

${otherPlansContext}

---

## 🎯 สร้างใบความรู้ตามโครงสร้างนี้ (JSON):

{
  "metadata": {
    "title": "ใบความรู้ที่ ${planNumber || 1}: ${topicName}",
    "courseCode": "${courseCode}",
    "courseName": "${courseNameDisplay}",
    "unitNumber": ${unitNumber || 1},
    "unitName": "${unitName || ''}",
    "planNumber": ${planNumber || 1},
    "gradeLevel": "${gradeValue || 'ม.4'}",
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
      "central": "${topicName}",
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
9. **ภาษาเหมาะกับระดับชั้น ${gradeValue || 'ม.4'}** - เข้าใจง่าย ชัดเจน
10. **ตอบเป็น JSON เท่านั้น** - ห้ามมี markdown wrapper เช่น \`\`\`json

${standaloneContext}

ตอบ JSON:`

        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { 
              role: 'system', 
              content: 'คุณเป็นครูผู้เชี่ยวชาญด้านการสร้างใบความรู้ที่มีคุณภาพสูง สร้างเนื้อหาที่ถูกต้องตามหลักวิชาการ อธิบายชัดเจน เหมาะกับระดับชั้น ตอบเป็น JSON เท่านั้น ห้ามมี markdown wrapper' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0,
          seed: 42,
          max_tokens: 10000  // Increased for comprehensive knowledge sheets
        })

        const knowledgeSheet = parseAIResponse(completion.choices[0].message.content)

        // Get Firestore instance
        const db = getDb()
        
        // Get additional fields from request (lessonPlanId already checked above for duplicates)
        const { teacherId, courseId, createRoom, roomId } = req.body

        // Sanitize for Firestore - remove undefined, handle nested arrays
        const sanitizedKnowledgeSheet = sanitizeForFirestore(knowledgeSheet)

        const knowledgeSheetDoc = {
          ...sanitizedKnowledgeSheet,
          // Add teacherId at root level for easier querying
          teacherId: teacherId || null,
          lessonPlanId: lessonPlanId || null,
          courseId: courseId || null,
          metadata: {
            ...(sanitizedKnowledgeSheet.metadata || {}),
            subject: subjectName,
            topic: topicName,
            grade: gradeValue,
            unitName: unitName || null,
            unitNumber: unitNumber || null,
            planNumber: planNumber || null,
            lessonPlanId: lessonPlanId || null,
            courseId: courseId || null,
            teacherId: teacherId || null,
            model,
            depth,
            generatedAt: new Date()
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }

        // Save to Firestore
        const docRef = await db.collection('knowledgeSheets').add(knowledgeSheetDoc)
        const knowledgeSheetId = docRef.id
        console.log(`✅ Knowledge sheet saved: ${knowledgeSheetId}`)

        // 🆕 Update lessonPlan with knowledgeSheetId reference
        if (lessonPlanId) {
          try {
            await db.collection('lessonPlans').doc(lessonPlanId).update({
              knowledgeSheetId: knowledgeSheetId,
              updatedAt: new Date()
            })
            console.log(`✅ LessonPlan ${lessonPlanId} updated with knowledgeSheetId`)
          } catch (updateError) {
            console.warn('Failed to update lessonPlan:', updateError.message)
          }
        }

        // Handle room assignment if requested
        let finalRoomId = roomId || null
        if (createRoom && teacherId && courseId) {
          try {
            const roomName = `ห้องกิจกรรม: ${topicName || subjectName}`
            const roomDoc = await db.collection('learningRooms').add({
              name: roomName,
              teacherId,
              courseId,
              knowledgeSheetIds: [knowledgeSheetId],
              worksheetIds: [],
              status: 'published',
              createdAt: new Date(),
              updatedAt: new Date()
            })
            finalRoomId = roomDoc.id
            console.log(`✅ Room created: ${finalRoomId}`)
          } catch (roomError) {
            console.warn('Failed to create room:', roomError.message)
          }
        } else if (roomId) {
          // Add to existing room
          try {
            await db.collection('learningRooms').doc(roomId).update({
              knowledgeSheetIds: admin.firestore.FieldValue.arrayUnion(knowledgeSheetId),
              updatedAt: new Date()
            })
            console.log(`✅ Added to room: ${roomId}`)
          } catch (roomError) {
            console.warn('Failed to add to room:', roomError.message)
          }
        }

        return res.status(200).send({
          success: true,
          knowledgeSheetId,
          knowledgeSheet: knowledgeSheetDoc,
          roomId: finalRoomId,
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
  .runWith({ 
    secrets: [openaiApiKeySecret],
    memory: '1GB', 
    timeoutSeconds: 300 
  })
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
  .runWith({ 
    secrets: [openaiApiKeySecret],
    memory: '2GB', 
    timeoutSeconds: 540 
  })
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
