/**
 * 📝 AI Prompts Module
 * 
 * รวม prompts ทั้งหมดสำหรับ OpenAI API
 * - Assessment prompts (HOTS scoring)
 * - LO assessment prompts
 * - Generation prompts (questions, worksheets, etc.)
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
- 5: แยกประเด็น/องค์ประกอบสำคัญครบ โครงสร้างชัด เชื่อมความสัมพันธ์สาเหตุ-ผลอย่างเป็นระบบ
- 4: แยกประเด็นหลักชัด มีโครงสร้างและความเชื่อมโยงส่วนใหญ่ถูกต้อง
- 3: แยกบางส่วนได้ เห็นโครงร่างการวิเคราะห์ แต่ขาดบางประเด็นสำคัญ
- 2: วิเคราะห์ตื้น อธิบายแบบเล่าเรื่องมากกว่าแยกส่วน
- 1: ระบุข้อเท็จจริงกระจัดกระจาย ไร้โครงสร้าง
- 0: ไม่วิเคราะห์/นอกเรื่อง

2) การให้เหตุผล (Reasoning)
- 5: เหตุผลเป็นลำดับ มีตรรกะ/การอนุมานถูกต้อง สรุปสอดคล้องกับเหตุผล
- 4: ลำดับคิดดี มีการอนุมานส่วนใหญ่ถูกต้อง มีจุดสะดุดเล็กน้อย
- 3: มีเหตุผลพื้นฐาน แต่ยังมีช่องโหว่/สรุปก้าวกระโดดบางช่วง
- 2: เหตุผลคลุมเครือ พิงความเชื่อมากกว่าตรรกะ
- 1: ตรรกะผิดพลาดบ่อย สรุปไม่ตามเหตุผล
- 0: ไม่มีเหตุผลที่ตรวจสอบได้

3) ความคิดสร้างสรรค์ (Creativity)
- 5: เสนอกรอบคิด/วิธีมองใหม่ ชี้มุมไม่ชัดเจนเดิม มีตัวอย่างสร้างสรรค์ที่เกี่ยวข้อง
- 4: มีมุมใหม่ชัดเจนอย่างน้อยหนึ่งจุด
- 3: ปรับ/ต่อยอดไอเดียเดิมได้บ้าง
- 2: ความคิดทั่วไป ซ้ำแพทเทิร์นคุ้นเคย
- 1: ทวนซ้ำความรู้เดิม ไร้มุมเพิ่ม
- 0: ไม่แสดงความคิดริเริ่ม

4) การใช้หลักฐาน (Evidence)
- 5: ยกหลักฐาน/ตัวอย่างเฉพาะเจาะจง ตรงประเด็น อธิบายความเชื่อมโยงกับข้อสรุปชัด
- 4: มีหลักฐานที่เกี่ยวข้องและอธิบายความเชื่อมโยงพอควร
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
