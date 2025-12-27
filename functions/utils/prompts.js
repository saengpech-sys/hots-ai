/**
 * 📝 AI Prompts Module
 * 
 * รวม prompts ทั้งหมดสำหรับ OpenAI API
 * - Assessment prompts (HOTS scoring)
 * - LO assessment prompts
 * - Generation prompts (questions, worksheets, etc.)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📚 OPERATIONAL DEFINITIONS & KNOWN LIMITATIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This module assesses TEXTUAL MANIFESTATIONS of thinking skills, NOT the 
 * underlying cognitive processes themselves. Key distinctions:
 * 
 * 🔬 WHAT WE MEASURE (Operational Definitions):
 * 
 * 1. ANALYSIS (การวิเคราะห์)
 *    - Theory: "Breaking material into constituent parts"
 *    - Operationalized as: "Identifying distinct claims/components in written text"
 *    - Limitation: Cannot assess visual/spatial/kinesthetic analysis
 * 
 * 2. REASONING (การให้เหตุผล)
 *    - Theory: "Drawing logical conclusions from premises"
 *    - Operationalized as: "Presence of if-then structures, causal language in text"
 *    - Limitation: Valid reasoning with unstated premises may be underscored
 * 
 * 3. CREATIVITY (ความคิดสร้างสรรค์) ⚠️ CRITICAL LIMITATION
 *    - Theory (Guilford): "Divergent production of novel, useful ideas"
 *    - Operationalized as: "TEXTUAL NOVELTY - presence of perspectives not 
 *      commonly found in typical responses to similar questions"
 *    - What we CAN assess: Novel framing, unexpected examples, unique connections
 *    - What we CANNOT assess: 
 *      * Genuine creative production (art, inventions, designs)
 *      * Process creativity (brainstorming, iteration)
 *      * Domain-specific creative expertise
 *      * Real-world novelty (only compared to training data)
 * 
 * 4. EVIDENCE (การใช้หลักฐาน)
 *    - Theory: "Supporting claims with verifiable information"
 *    - Operationalized as: "Presence of specific examples, data, citations in text"
 *    - Limitation: Cannot verify factual accuracy of cited evidence
 * 
 * 🎯 VALIDITY SCOPE:
 * - This assessment is valid for "Written Expression of HOTS"
 * - NOT valid for "General Cognitive Ability" or "Intelligence"
 * - Scores indicate DEMONSTRATED skills in THIS RESPONSE, not trait-level abilities
 * 
 * 📊 MEASUREMENT PROPERTIES:
 * - Scale type: ORDINAL (0-5), not interval
 * - Score of 3 is NOT "twice as good" as 1.5
 * - Meaningful comparisons: "higher/lower than", NOT "how much higher"
 * - Arithmetic mean of ordinal data should be interpreted cautiously
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * 🛡️ Sanitize student input to prevent prompt injection
 * @param {string} text - Raw student input
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized text
 */
function sanitizeStudentInput(text, maxLength = 3000) {
  if (!text || typeof text !== 'string') return ''
  
  return text
    .replace(/```/g, "'''")  // Escape code blocks
    .replace(/<\/?[a-zA-Z_][^>]*>/g, '')  // Remove XML-like tags
    .replace(/\{\{[^}]*\}\}/g, '')  // Remove template expressions
    .substring(0, maxLength)
}

/**
 * Create assessment prompt for OpenAI with optional scaffolding support
 * 
 * 🔬 PHASE 2 IMPROVEMENTS:
 * - Chain of Thought (CoT): AI reasons step-by-step before scoring
 * - AI Confidence Score: Self-reported confidence with reasoning
 * - Language Bias Prevention: Grade language separately, don't penalize
 * - Prompt Injection Defense: XML tags isolate student input
 * - Grade-Level Calibration: Context about expected student level
 * 
 * @param {string} context - Question context
 * @param {string} answer - Student's answer (will be sanitized)
 * @param {object} options - Configuration options
 * @returns {string} Complete prompt for OpenAI
 */
function createAssessmentPrompt(context, answer, options = {}) {
  const { 
    isScaffolding, 
    scaffoldingAttempts, 
    previousAnswer,
    gradeLevel,
    subject
  } = options
  
  // 🛡️ Sanitize student input
  const sanitizedAnswer = sanitizeStudentInput(answer, 3000)
  
  let scaffoldingInstructions = ''
  if (isScaffolding && previousAnswer) {
    const sanitizedPreviousAnswer = sanitizeStudentInput(previousAnswer, 1500)
    
    scaffoldingInstructions = `

🔄 SCAFFOLDING MODE (ครั้งที่ ${scaffoldingAttempts + 1}/2):
นี่คือคำตอบครั้งที่ ${scaffoldingAttempts + 1} หลังจากถูกถามคำถามชี้แนะ
<previous_answer>${sanitizedPreviousAnswer}</previous_answer>
ให้ประเมินว่านักเรียนพัฒนาขึ้นหรือไม่ และให้คะแนนตามคำตอบปัจจุบัน`
  }

  // 🎓 Grade-level calibration context
  let gradeContext = ''
  if (gradeLevel) {
    gradeContext = `
📚 ระดับชั้น: ${gradeLevel}${subject ? ` | วิชา: ${subject}` : ''}
⚖️ การปรับระดับ: ปรับความคาดหวังตามวุฒิภาวะของนักเรียนระดับ ${gradeLevel}
- สำหรับ ป.4-6: คาดหวังการคิดพื้นฐาน ตัวอย่างง่ายๆ
- สำหรับ ม.1-3: คาดหวังความเชื่อมโยงที่ซับซ้อนขึ้น
- สำหรับ ม.4-6: คาดหวังการวิเคราะห์เชิงลึก เชื่อมโยงข้ามศาสตร์
`
  }

  const needsProbingQuestion = !isScaffolding && scaffoldingAttempts === 0
  
  // 🔬 PHASE 2: Enhanced prompt with CoT, Confidence, and Bias Prevention
  return `
<system_instruction>
ประเมินคำตอบปลายเปิดของนักเรียนอย่างเป็นกลาง ตรวจสอบได้ และเป็นระบบ
ใช้ Chain-of-Thought reasoning ก่อนให้คะแนน
</system_instruction>

<objective>
- ให้คะแนนคำตอบของนักเรียนตามทักษะการคิดขั้นสูง (HOTS) 4 ด้าน
- คิดทีละขั้นตอน (Chain of Thought) ก่อนสรุปคะแนน
- รายงานระดับความมั่นใจในการประเมิน (0-100%)
- ส่งคืน "JSON เท่านั้น" ตามสคีมาที่กำหนด
</objective>

<input>
<context>${context || 'การประเมินทักษะการคิดทั่วไป'}</context>
${gradeContext}
<student_answer>${sanitizedAnswer}</student_answer>
</input>
${scaffoldingInstructions}

<bias_prevention>
⚠️ ข้อควรระวังเรื่องอคติในการประเมิน:
1. ภาษา ≠ การคิด: ความสามารถในการเขียนภาษาไม่ใช่ตัวชี้วัดทักษะการคิด
   - หากนักเรียนมีไอเดียดีแต่สื่อสารไม่ชัด ให้คะแนนตาม "ความคิด" ไม่ใช่ "การเขียน"
   - ตัวสะกดผิด/ไวยากรณ์ผิด ไม่หักคะแนนทักษะการคิด
2. ความยาว ≠ คุณภาพ: คำตอบสั้นที่ตรงประเด็นดีกว่าคำตอบยาวที่วนซ้ำ
3. สไตล์ ≠ สาระ: ไม่ให้คะแนนเพิ่มเพราะใช้ศัพท์ยากหรือโครงสร้างซับซ้อน
4. เป็นกลาง: ไม่มีอคติจากเพศ เชื้อชาติ หรือภูมิหลังที่อาจปรากฏในคำตอบ
</bias_prevention>

<scoring_rubric>
หลักการให้คะแนน (0–5 เป็นจำนวนเต็ม)
ให้คะแนนตาม "สมอคะแนน (Anchors)" และเลือกคะแนนที่ "ต่ำสุดที่อธิบายพฤติกรรมของคำตอบครบถ้วน"

1) การวิเคราะห์ (Analysis)
- 5: แยกแยะประเด็น/องค์ประกอบครบถ้วน โครงสร้างชัด เชื่อมความสัมพันธ์ซับซ้อน พบรูปแบบ/แนวโน้มที่ซ่อนอยู่
- 4: แยกประเด็นหลักชัด มีโครงสร้างและความเชื่อมโยงส่วนใหญ่ถูกต้อง
- 3: แยกบางส่วนได้ เห็นโครงร่างการวิเคราะห์ แต่ขาดบางประเด็นสำคัญ
- 2: วิเคราะห์ตื้น อธิบายแบบเล่าเรื่องมากกว่าแยกส่วน
- 1: ระบุข้อเท็จจริงกระจัดกระจาย ไร้โครงสร้าง
- 0: ไม่วิเคราะห์/นอกเรื่อง

2) การให้เหตุผล (Reasoning)
- 5: เหตุผลเป็นลำดับ มีตรรกะสมบูรณ์ อ้างหลักการถูกต้อง มีข้อโต้แย้ง/ข้อจำกัด สรุปสอดคล้องกับเหตุผล
- 4: ลำดับคิดดี มีการอนุมานส่วนใหญ่ถูกต้อง อ้างหลักการได้ มีจุดสะดุดเล็กน้อย
- 3: มีเหตุผลพื้นฐาน แต่ยังมีช่องโหว่/สรุปก้าวกระโดดบางช่วง
- 2: เหตุผลคลุมเครือ พิงความเชื่อมากกว่าตรรกะ
- 1: ตรรกะผิดพลาดบ่อย สรุปไม่ตามเหตุผล
- 0: ไม่มีเหตุผลที่ตรวจสอบได้

3) ความคิดสร้างสรรค์ (Creativity) — ⚠️ หมายถึง "ความแปลกใหม่ในการนำเสนอ/มุมมอง" เท่านั้น
   📌 OPERATIONAL DEFINITION: ประเมินจากความแปลกใหม่ของมุมมอง/ตัวอย่าง/การเชื่อมโยง ที่ปรากฏในข้อความ
   ⚠️ ไม่ใช่การประเมินความสามารถในการสร้างสรรค์ผลงาน (art, invention) ในโลกจริง
- 5: เสนอกรอบคิด/วิธีมองใหม่ที่ไม่คาดคิด ชี้มุมที่ไม่ชัดเจนเดิม เสนอทางเลือกหลากหลาย มีตัวอย่างหรือการเชื่อมโยงที่แปลกใหม่
- 4: มีมุมมองใหม่ชัดเจนอย่างน้อยหนึ่งจุด แตกต่างจากคำตอบทั่วไป เสนอทางเลือก
- 3: ปรับ/ต่อยอดจากไอเดียมาตรฐานได้บ้าง มีความพยายามนำเสนอต่าง
- 2: ความคิดทั่วไป ซ้ำแพทเทิร์นที่คุ้นเคย ไม่มีมุมใหม่
- 1: ทวนซ้ำความรู้เดิม ไร้มุมเพิ่ม
- 0: ไม่แสดงความพยายามนำเสนอมุมมองใดๆ

4) การใช้หลักฐาน (Evidence)
- 5: ยกหลักฐาน/ตัวอย่างเฉพาะเจาะจงหลากหลาย ตรงประเด็น อ้างอิงถูกต้อง อธิบายความเชื่อมโยงกับข้อสรุปชัด
- 4: มีหลักฐานหลายแหล่งที่เกี่ยวข้อง อ้างอิงส่วนใหญ่ถูกต้อง อธิบายความเชื่อมโยงพอควร
- 3: มีตัวอย่างแต่ยังทั่วไป/เชื่อมโยงหลวม
- 2: อ้างกว้าง ๆ ไม่ชัดเจนหรือไม่สัมพันธ์กับข้อสรุป
- 1: กล่าวอ้างลอย ๆ ไร้ตัวอย่างตรวจสอบได้
- 0: ไม่มีหลักฐาน
</scoring_rubric>

<chain_of_thought_instructions>
🧠 ขั้นตอนการคิด (Chain of Thought) - ต้องทำก่อนให้คะแนน:

Step 1: อ่านคำตอบทั้งหมดและสรุปประเด็นหลัก (1-2 ประโยค)
Step 2: ระบุหลักฐานที่เห็นในแต่ละมิติ HOTS
Step 3: เปรียบเทียบหลักฐานกับ Anchor descriptions
Step 4: ตัดสินใจให้คะแนนพร้อมเหตุผลสั้นๆ
Step 5: ประเมินความมั่นใจโดยรวม

บันทึกการคิดทั้งหมดใน "chainOfThought" object ในผลลัพธ์
</chain_of_thought_instructions>

<confidence_instructions>
📊 ระดับความมั่นใจในการประเมิน (Confidence Score):
- 90-100%: คำตอบชัดเจน หลักฐานมาก ตรงกับ Anchors พอดี
- 70-89%: คำตอบค่อนข้างชัด มีบางจุดคลุมเครือเล็กน้อย
- 50-69%: คำตอบคลุมเครือ ต้องตีความมาก หรือ borderline ระหว่างคะแนน
- ต่ำกว่า 50%: คำตอบไม่ชัดเจน/สั้นมาก/ยากต่อการประเมิน

ต้องระบุเหตุผลใน "confidenceReason" เสมอ
</confidence_instructions>

<calibration_examples>
📚 ตัวอย่างการให้คะแนนที่ผ่านการ Calibrate (ใช้เป็นแนวทาง):

【ตัวอย่างที่ 1: คะแนนต่ำ】
คำถาม: "วิเคราะห์ผลกระทบของภาวะโลกร้อน"
คำตอบ: "โลกร้อนทำให้น้ำแข็งละลาย ทำให้ระดับน้ำทะเลสูงขึ้น"
คะแนน: A=2, R=2, C=1, E=1 (รวม 6)
เหตุผล:
- Analysis=2: ระบุ 2 ประเด็น (น้ำแข็ง, น้ำทะเล) แต่ไม่มีโครงสร้าง ไม่แยกส่วน
- Reasoning=2: มีความเชื่อมโยงง่ายๆ (เหตุ→ผล) แต่ไม่ลึก ไม่อ้างหลักการ
- Creativity=1: ทวนซ้ำข้อมูลทั่วไป ไม่มีมุมมองใหม่
- Evidence=1: ไม่มีตัวอย่าง/ตัวเลข/แหล่งอ้างอิงเฉพาะ

【ตัวอย่างที่ 2: คะแนนกลาง】
คำถาม: "วิเคราะห์ผลกระทบของภาวะโลกร้อน"
คำตอบ: "ภาวะโลกร้อนส่งผลกระทบ 3 ด้าน: 1) สิ่งแวดล้อม - น้ำแข็งขั้วโลกละลาย ระดับน้ำทะเลสูงขึ้น 2) เศรษฐกิจ - พืชผลเสียหาย ต้นทุนการผลิตสูงขึ้น 3) สุขภาพ - โรคระบาดแพร่กระจายง่ายขึ้น ทั้งสามด้านมีความเกี่ยวข้องกัน"
คะแนน: A=3, R=3, C=2, E=2 (รวม 10)
เหตุผล:
- Analysis=3: แยก 3 ประเด็นชัด แต่ยังขาดความสัมพันธ์เชิงลึก
- Reasoning=3: มีโครงสร้างเหตุผล แต่ยังไม่อ้างหลักการ
- Creativity=2: ใช้กรอบคิดทั่วไป (3 ด้าน) ไม่มีมุมใหม่
- Evidence=2: อ้างกว้างๆ ไม่มีตัวเลข/แหล่งอ้างอิงเฉพาะ

【ตัวอย่างที่ 3: คะแนนสูง】
คำถาม: "วิเคราะห์ผลกระทบของภาวะโลกร้อน"
คำตอบ: "ภาวะโลกร้อนสร้างผลกระทบแบบ cascade effect - รายงาน IPCC 2023 ระบุว่าอุณหภูมิโลกเพิ่ม 1.5°C จะทำให้แนวปะการังเสียหาย 70-90% ซึ่งกระทบห่วงโซ่อาหารทะเลและประมงท้องถิ่น ในไทย ชาวประมงภาคใต้รายงานผลผลิตลดลง 30% ในรอบ 10 ปี น่าสนใจว่าบางชุมชนปรับตัวโดยเปลี่ยนไปเพาะเลี้ยงสาหร่าย ซึ่งเป็นตัวดูดซับคาร์บอน - เป็นทั้งการแก้ปัญหาและการปรับตัว อย่างไรก็ตาม ต้องพิจารณาด้วยว่าต้นทุนการปรับตัวอาจสูงเกินไปสำหรับชุมชนเล็กๆ"
คะแนน: A=5, R=5, C=4, E=5 (รวม 19)
เหตุผล:
- Analysis=5: เชื่อมโยงซับซ้อน (cascade effect) พบรูปแบบ (ปรับตัว vs ผลกระทบ)
- Reasoning=5: อ้างหลักการ (cascade effect) มีข้อโต้แย้ง (ต้นทุนสูง) ตรรกะสมบูรณ์
- Creativity=4: มุมมองใหม่ (สาหร่ายเป็นทั้งแก้ปัญหาและปรับตัว) แตกต่างจากคำตอบทั่วไป
- Evidence=5: อ้าง IPCC, ตัวเลขเฉพาะ (1.5°C, 70-90%, 30%), ตัวอย่างท้องถิ่น
</calibration_examples>

${needsProbingQuestion ? `
<scaffolding_mode>
**โหมด Scaffolding (คะแนนรวมต่ำกว่า 10/20)**
เมื่อคำนวณคะแนนรวมได้น้อยกว่า 10 คะแนน:
- เพิ่มฟิลด์ "probingQuestion": คำถามชี้ทางภาษาไทย (1-2 ประโยค)
- คำถามต้องเฉพาะเจาะจงกับจุดอ่อนในคำตอบ
- ใช้ภาษาให้กำลังใจ เปิดโอกาสคิดต่อ
</scaffolding_mode>
` : ''}

<feedback_guidelines>
ข้อกำหนดการให้ข้อเสนอแนะ:
- ภาษาไทย สุภาพ กระชับ (2–3 ประโยค)
- "strengths/weaknesses" เป็นวลีสั้น ๆ ชี้จุดที่สังเกตได้จริง
- "suggestions" เป็นคำแนะนำเชิงปฏิบัติที่นำไปใช้พัฒนาได้ทันที
</feedback_guidelines>

<output_schema>
ส่งคืน JSON เท่านั้น ห้ามมี markdown wrapper (ไม่ต้องใส่ \`\`\`json):
{
  "chainOfThought": {
    "step1_summary": "สรุปประเด็นหลักของคำตอบ 1-2 ประโยค",
    "step2_evidence": {
      "analysis": "หลักฐานที่เห็นสำหรับมิตินี้",
      "reasoning": "หลักฐานที่เห็นสำหรับมิตินี้",
      "creativity": "หลักฐานที่เห็นสำหรับมิตินี้",
      "evidence": "หลักฐานที่เห็นสำหรับมิตินี้"
    },
    "step3_anchor_match": "อธิบายว่าหลักฐานตรงกับ Anchor ระดับไหน",
    "step4_decision": "เหตุผลการตัดสินใจให้คะแนน"
  },
  "rubricScores": {
    "analysis": 0-5,
    "reasoning": 0-5,
    "creativity": 0-5,
    "evidence": 0-5
  },
  "confidence": 0-100,
  "confidenceReason": "เหตุผลที่มั่นใจระดับนี้",
  "feedback": "ข้อเสนอแนะโดยรวมภาษาไทย 2-3 ประโยค",
  "strengths": ["จุดเด่น 1", "จุดเด่น 2"],
  "weaknesses": ["จุดที่ควรพัฒนา 1", "จุดที่ควรพัฒนา 2"],
  "suggestions": ["คำแนะนำ 1", "คำแนะนำ 2"]${needsProbingQuestion ? ',\n  "probingQuestion": "คำถามชี้ทาง (ถ้าคะแนนรวม < 10)"' : ''}
}
</output_schema>

<execution>
ทำงานตอนนี้กับอินพุตที่ให้ ส่งคืนเฉพาะ JSON ตามสคีมา
สำคัญ: ไม่ต้องใส่ \`\`\`json หรือ \`\`\` ครอบ JSON
</execution>
`
}

/**
 * Create LO assessment prompt
 * @param {string} studentAnswer - Student's answer text
 * @param {Array} learningOutcomes - Array of LO objects
 * @param {Object} rubricScores - HOTS rubric scores
 * @returns {string} Complete prompt for LO assessment
 */
function createLOAssessmentPrompt(studentAnswer, learningOutcomes, rubricScores) {
  // Build LO list (support both loCode/code and loDescription/description)
  const loList = learningOutcomes.map((lo, idx) => {
    const code = lo.loCode || lo.code || `LO${idx + 1}`
    const description = lo.loDescription || lo.description || 'No description'
    return `${idx + 1}. [${code}] ${description}`
  }).join('\n')

  return `คุณเป็นผู้เชี่ยวชาญด้านการประเมินผลการเรียนรู้ตาม Learning Outcomes (LOs) ที่เคร่งครัดเรื่องหลักฐานและความเที่ยงตรง

อินพุต
คำตอบของนักเรียน (Student Answer):
${studentAnswer}

ผลการประเมิน HOTS (0–5):
- การวิเคราะห์ (analysis): ${rubricScores.analysis}
- การให้เหตุผล (reasoning): ${rubricScores.reasoning}
- ความคิดสร้างสรรค์ (creativity): ${rubricScores.creativity}
- การใช้หลักฐาน (evidence): ${rubricScores.evidence}

รายการ Learning Outcomes (loList): ${loList}
> หมายเหตุ: แต่ละ LO ต้องมีรหัสระบุชัด เช่น "LO1: …", "LO2: …" (ใช้รหัสดังกล่าวในเอาต์พุต)

คำสั่ง (เกณฑ์การผ่าน LO)
ประเมินว่า "คำตอบของนักเรียน" แสดงให้เห็นว่า "ผ่าน" LO ใดบ้าง โดยต้องผ่านครบทั้ง 3 เงื่อนไขต่อ LO:
1) การตรงประเด็นเนื้อหา: เนื้อหา/สาระสำคัญในคำตอบครอบคลุมเจตนารมณ์ของ LO อย่างมีนัยสำคัญ (ไม่ใช่เพียงการเอ่ยถึงผิวเผิน)
2) ระดับความเข้าใจและทักษะ: มีหลักฐานเชิงคุณภาพของความเข้าใจ/ทักษะที่ LO คาดหวัง (เช่น นิยามที่ถูกต้อง ความเชื่อมโยงเหตุ–ผล การสังเคราะห์แนวคิด การประยุกต์ ฯลฯ)
3) เกณฑ์ HOTS ขั้นต่ำ: มิติ HOTS ที่ "เกี่ยวข้องกับ LO นั้น" ต้องมีคะแนนอย่างน้อย 3/5
   - แนวโยงคำกริยา–มิติ HOTS เพื่อระบุ "มิติที่เกี่ยวข้อง":
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
}

/**
 * System message for LO assessment
 */
const LO_ASSESSMENT_SYSTEM_MESSAGE = 'You are an expert in learning outcome assessment. You provide accurate, evidence-based evaluations. Always respond with valid JSON only, no markdown.'

module.exports = {
  sanitizeStudentInput,
  createAssessmentPrompt,
  createLOAssessmentPrompt,
  LO_ASSESSMENT_SYSTEM_MESSAGE
}
