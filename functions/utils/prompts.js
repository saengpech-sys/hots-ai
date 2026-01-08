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
</fluffy_content_detection>

<scoring_rubric>
หลักการให้คะแนน (0–5 เป็นจำนวนเต็ม)
⚠️ สำคัญ: ให้คะแนนตาม "สมอคะแนน (Anchors)" และเลือกคะแนนที่ "ต่ำสุดที่อธิบายพฤติกรรมของคำตอบครบถ้วน"
⚠️ ความเคร่งครัด: หากพฤติกรรมอยู่ระหว่างสองระดับ → เลือกระดับ "ต่ำกว่า" เสมอ (conservative scoring)

1) การวิเคราะห์ (Analysis) - แยกส่วน หาความสัมพันธ์ จัดหมวดหมู่
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 5 │ แยกประเด็น/องค์ประกอบสำคัญ "ครบถ้วน" (≥3 องค์ประกอบ)                    ║
║   │ + โครงสร้างความสัมพันธ์ชัดเจน (เหตุ→ผล หรือส่วน→ทั้งหมด)                ║
║   │ + เชื่อมโยงระหว่างองค์ประกอบอย่างเป็นระบบ                                ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 4 │ แยกประเด็นหลัก "ส่วนใหญ่" (2-3 องค์ประกอบ)                              ║
║   │ + มีโครงสร้างการเชื่อมโยงที่ถูกต้อง แต่อาจขาดบางจุด                      ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 3 │ แยกได้ "บางส่วน" (1-2 องค์ประกอบหลัก)                                   ║
║   │ + เห็นโครงร่างการวิเคราะห์ แต่ขาดความลึกหรือขาดประเด็นสำคัญ              ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 2 │ วิเคราะห์ตื้น - "อธิบาย" มากกว่า "แยกส่วน"                              ║
║   │ + เล่าเรื่อง/บรรยายโดยไม่จัดหมวดหมู่                                    ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 1 │ ระบุข้อเท็จจริงกระจัดกระจาย ไร้โครงสร้าง ไม่จัดกลุ่ม                    ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 0 │ ไม่มีการวิเคราะห์ / นอกเรื่องทั้งหมด / ว่างเปล่า                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝

2) การให้เหตุผล (Reasoning) - ตรรกะ การอนุมาน ข้อสรุป
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 5 │ เหตุผลเป็นลำดับขั้นตอนชัดเจน (Premise → Inference → Conclusion)         ║
║   │ + ตรรกะถูกต้อง ไม่มีช่องว่าง + สรุปสอดคล้องกับข้อมูลที่ให้              ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 4 │ ลำดับคิดดี มีการอนุมาน "ส่วนใหญ่" ถูกต้อง                               ║
║   │ + มีจุดสะดุดเล็กน้อย 1-2 จุด แต่ไม่กระทบข้อสรุปหลัก                     ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 3 │ มีเหตุผลพื้นฐาน แต่ยังมีช่องโหว่/สรุปก้าวกระโดด "บางช่วง"               ║
║   │ + เห็นความพยายามให้เหตุผล แต่ไม่สมบูรณ์                                 ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 2 │ เหตุผลคลุมเครือ ใช้ความเชื่อ/สัญชาตญาณ มากกว่าตรรกะ                     ║
║   │ + "รู้สึกว่า..." / "น่าจะ..." โดยไม่อธิบายที่มา                         ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 1 │ ตรรกะผิดพลาดบ่อย (fallacies) / สรุปไม่ตามเหตุผลที่ให้                   ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 0 │ ไม่มีเหตุผลที่ตรวจสอบได้ / ตอบสั้นมากไม่มีการอธิบาย                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

3) ความคิดสร้างสรรค์ (Creativity) - มุมมองใหม่ ไอเดียแปลก การประยุกต์
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 5 │ เสนอกรอบคิด/วิธีมองใหม่ที่ "ไม่ใช่คำตอบทั่วไป"                          ║
║   │ + ชี้มุมที่ไม่ชัดเจนเดิม + มีตัวอย่างสร้างสรรค์ที่เกี่ยวข้องและใช้ได้จริง║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 4 │ มีมุมมองใหม่ "อย่างน้อยหนึ่งจุด" ที่แตกต่างจากแนวคิดทั่วไป               ║
║   │ + แสดงการต่อยอดที่น่าสนใจ                                               ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 3 │ ปรับ/ต่อยอดไอเดียเดิมได้ "บ้าง"                                         ║
║   │ + มีความพยายามประยุกต์ แต่ยังไม่แตกต่างมาก                              ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 2 │ ความคิดทั่วไป ซ้ำแพทเทิร์นคุ้นเคย ไม่มีมุมใหม่                          ║
║   │ + ตอบตาม "คำตอบมาตรฐาน" ที่ใครก็ตอบได้                                  ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 1 │ ทวนซ้ำความรู้เดิม / คัดลอกจากคำถาม / ไม่มีมุมเพิ่มเติม                  ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 0 │ ไม่แสดงความคิดริเริ่มใดๆ / ว่างเปล่า                                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

4) การใช้หลักฐาน (Evidence) - ตัวอย่าง ข้อมูลสนับสนุน การอ้างอิง
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 5 │ ยกหลักฐาน/ตัวอย่าง "เฉพาะเจาะจง" (specific) ≥2 รายการ                  ║
║   │ + ตรงประเด็น + อธิบายความเชื่อมโยงกับข้อสรุปชัดเจน                       ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 4 │ มีหลักฐานที่เกี่ยวข้อง 1-2 รายการ                                       ║
║   │ + อธิบายความเชื่อมโยง "พอสมควร" (ไม่ละเอียดมาก)                         ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 3 │ มีตัวอย่างแต่ "ยังทั่วไป" / เชื่อมโยงหลวม                               ║
║   │ + เช่น "เช่น สิ่งแวดล้อม" โดยไม่ระบุว่าอะไร                             ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 2 │ อ้างกว้างๆ ไม่ชัดเจน หรือไม่สัมพันธ์กับข้อสรุป                          ║
║   │ + "มีหลายสาเหตุ..." โดยไม่ระบุว่าอะไรบ้าง                               ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 1 │ กล่าวอ้างลอยๆ ไร้ตัวอย่าง/ข้อมูลที่ตรวจสอบได้                          ║
║───┼──────────────────────────────────────────────────────────────────────────║
║ 0 │ ไม่มีหลักฐานหรือตัวอย่างใดๆ / นอกเรื่อง                                 ║
╚═══════════════════════════════════════════════════════════════════════════════╝
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

⚠️ สำคัญ: Confidence = ความมั่นใจในการตัดสิน ไม่ใช่คุณภาพคำตอบ
- คำตอบมั่ว/ไร้สาระ → ให้คะแนนต่ำ แต่ Confidence สูง (เพราะมั่นใจว่าไม่ดี)
- คำตอบดีมาก → ให้คะแนนสูง และ Confidence สูง
- คำตอบก้ำกึ่ง/คลุมเครือ → ให้คะแนนกลาง และ Confidence ต่ำ (ไม่แน่ใจ)

🎯 เกณฑ์ความมั่นใจ:
- 90-100%: ตัดสินได้ชัดเจน 
  • หลักฐาน/ไม่มีหลักฐาน ปรากฏชัด
  • ตรงกับ Anchor ระดับใดระดับหนึ่งพอดี
  • ไม่ต้องตีความเพิ่ม

- 70-89%: ค่อนข้างมั่นใจ
  • หลักฐานส่วนใหญ่ชัดเจน
  • อาจต้องตีความบางจุดเล็กน้อย
  • ไม่อยู่ borderline ระหว่างคะแนน

- 50-69%: ไม่แน่ใจ (ต้องการ Human Review)
  • คำตอบคลุมเครือ มีทั้งดีและไม่ดี
  • อยู่ borderline ระหว่าง 2 คะแนน
  • ต้องตีความมาก หรือขึ้นกับมุมมอง

- ต่ำกว่า 50%: ไม่สามารถตัดสินได้
  • คำตอบสั้นมากจนขาดบริบท
  • มีความหมายหลายนัย
  • ต้องถามครูผู้สอน

📝 ต้องระบุเหตุผลใน "confidenceReason" เสมอ โดยอ้างอิงเกณฑ์ข้างต้น
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

// =============================================================================
// 📊 SHARED SCORING RUBRIC - ใช้ร่วมกันระหว่าง Chat, Worksheet, Multi-Agent
// =============================================================================

/**
 * 🎯 A.R.C.E. Scoring Anchors (0-5 scale)
 * ใช้เป็นมาตรฐานเดียวกันทุกที่
 */
const ARCE_SCORING_ANCHORS = {
  analysis: {
    name: 'การวิเคราะห์ (Analysis)',
    icon: '🔍',
    bloomLevel: 'Analyze (L4)',
    anchors: {
      5: {
        description: 'แยกประเด็น/องค์ประกอบสำคัญครบ (≥3 องค์ประกอบ) + โครงสร้างความสัมพันธ์ชัดเจน + เชื่อมโยงเหตุ-ผลอย่างเป็นระบบ',
        evidence: ['แยกประเด็นหลัก ≥3 ข้อ', 'แสดงโครงสร้างความสัมพันธ์', 'เชื่อมเหตุ-ผลชัดเจน'],
        cognitiveIndicators: ['differentiating', 'organizing', 'attributing']
      },
      4: {
        description: 'แยกประเด็นหลักชัด (2-3 องค์ประกอบ) + มีโครงสร้างและความเชื่อมโยงส่วนใหญ่ถูกต้อง',
        evidence: ['แยกประเด็นหลัก ≥2 ข้อ', 'มีโครงสร้างบางส่วน'],
        cognitiveIndicators: ['differentiating', 'organizing']
      },
      3: {
        description: 'แยกบางส่วนได้ (1-2 องค์ประกอบหลัก) + เห็นโครงร่างการวิเคราะห์ แต่ขาดบางประเด็นสำคัญ',
        evidence: ['ระบุประเด็นได้บ้าง', 'มีแนวโน้มการจัดกลุ่ม'],
        cognitiveIndicators: ['differentiating']
      },
      2: {
        description: 'วิเคราะห์ตื้น - อธิบายแบบเล่าเรื่องมากกว่าแยกส่วน ไม่มีการจำแนก',
        evidence: ['อธิบายทั่วไป', 'ไม่มีการจำแนก'],
        cognitiveIndicators: []
      },
      1: {
        description: 'ระบุข้อเท็จจริงกระจัดกระจาย ไร้โครงสร้าง ไม่จัดกลุ่ม',
        evidence: ['ข้อมูลกระจัดกระจาย'],
        cognitiveIndicators: []
      },
      0: {
        description: 'ไม่มีการวิเคราะห์ / นอกเรื่องทั้งหมด / ว่างเปล่า',
        evidence: ['ไม่มีการวิเคราะห์'],
        cognitiveIndicators: []
      }
    }
  },
  reasoning: {
    name: 'การให้เหตุผล (Reasoning)',
    icon: '🧠',
    bloomLevel: 'Evaluate (L5)',
    anchors: {
      5: {
        description: 'เหตุผลเป็นลำดับขั้นตอนชัดเจน (Premise → Inference → Conclusion) + ตรรกะถูกต้อง ไม่มีช่องว่าง + สรุปสอดคล้องกับข้อมูล',
        evidence: ['ลำดับเหตุผลชัด ≥3 ขั้น', 'การอนุมานถูกต้อง', 'ไม่มี Logical Fallacy'],
        cognitiveIndicators: ['checking', 'critiquing', 'inferring']
      },
      4: {
        description: 'ลำดับคิดดี มีการอนุมานส่วนใหญ่ถูกต้อง + มีจุดสะดุดเล็กน้อย 1-2 จุด แต่ไม่กระทบข้อสรุปหลัก',
        evidence: ['ลำดับเหตุผลชัด ≥2 ขั้น', 'อนุมานส่วนใหญ่ถูก'],
        cognitiveIndicators: ['checking', 'inferring']
      },
      3: {
        description: 'มีเหตุผลพื้นฐาน แต่ยังมีช่องโหว่/สรุปก้าวกระโดดบางช่วง',
        evidence: ['มีเหตุผลบางส่วน', 'มีช่องโหว่ตรรกะ 1-2 จุด'],
        cognitiveIndicators: ['inferring']
      },
      2: {
        description: 'เหตุผลคลุมเครือ ใช้ความเชื่อ/สัญชาตญาณ มากกว่าตรรกะ',
        evidence: ['อ้างความเชื่อ/ความรู้สึก', 'ขาดหลักตรรกะ'],
        cognitiveIndicators: []
      },
      1: {
        description: 'ตรรกะผิดพลาดบ่อย (fallacies) / สรุปไม่ตามเหตุผลที่ให้',
        evidence: ['พบ Logical Fallacy', 'สรุปไม่สัมพันธ์'],
        cognitiveIndicators: []
      },
      0: {
        description: 'ไม่มีเหตุผลที่ตรวจสอบได้ / ตอบสั้นมากไม่มีการอธิบาย',
        evidence: ['ไม่มีการให้เหตุผล'],
        cognitiveIndicators: []
      }
    }
  },
  creativity: {
    name: 'ความคิดสร้างสรรค์ (Creativity)',
    icon: '💡',
    bloomLevel: 'Create (L6)',
    anchors: {
      5: {
        description: 'เสนอกรอบคิด/วิธีมองใหม่ที่ไม่ใช่คำตอบทั่วไป + ชี้มุมที่ไม่ชัดเจนเดิม + มีตัวอย่างสร้างสรรค์ที่เกี่ยวข้องและใช้ได้จริง',
        evidence: ['ไอเดียใหม่ที่ไม่ซ้ำ', 'มุมมองไม่เคยเห็น', 'ตัวอย่างสร้างสรรค์'],
        cognitiveIndicators: ['generating', 'planning', 'producing']
      },
      4: {
        description: 'มีมุมมองใหม่อย่างน้อยหนึ่งจุดที่แตกต่างจากแนวคิดทั่วไป + แสดงการต่อยอดที่น่าสนใจ',
        evidence: ['มุมมองใหม่ ≥1 จุด', 'ประยุกต์ความรู้'],
        cognitiveIndicators: ['generating', 'planning']
      },
      3: {
        description: 'ปรับ/ต่อยอดไอเดียเดิมได้บ้าง + มีความพยายามประยุกต์ แต่ยังไม่แตกต่างมาก',
        evidence: ['ต่อยอดจากเดิม', 'ปรับประยุกต์'],
        cognitiveIndicators: ['generating']
      },
      2: {
        description: 'ความคิดทั่วไป ซ้ำแพทเทิร์นคุ้นเคย ไม่มีมุมใหม่',
        evidence: ['ความคิดทั่วไป', 'ไม่มีสิ่งใหม่'],
        cognitiveIndicators: []
      },
      1: {
        description: 'ทวนซ้ำความรู้เดิม / คัดลอกจากคำถาม / ไม่มีมุมเพิ่มเติม',
        evidence: ['ทวนซ้ำ', 'คัดลอก'],
        cognitiveIndicators: []
      },
      0: {
        description: 'ไม่แสดงความคิดริเริ่มใดๆ / ว่างเปล่า',
        evidence: ['ไม่มีความคิดริเริ่ม'],
        cognitiveIndicators: []
      }
    }
  },
  evidence: {
    name: 'การใช้หลักฐาน (Evidence)',
    icon: '📚',
    bloomLevel: 'Apply (L3)',
    anchors: {
      5: {
        description: 'ยกหลักฐาน/ตัวอย่างเฉพาะเจาะจง (specific) ≥2 รายการ + ตรงประเด็น + อธิบายความเชื่อมโยงกับข้อสรุปชัดเจน',
        evidence: ['ตัวอย่างเฉพาะเจาะจง ≥2', 'อธิบายความเชื่อมโยง', 'แหล่งที่มาชัด'],
        cognitiveIndicators: ['implementing', 'executing']
      },
      4: {
        description: 'มีหลักฐานที่เกี่ยวข้อง 1-2 รายการ + อธิบายความเชื่อมโยงพอสมควร (ไม่ละเอียดมาก)',
        evidence: ['ตัวอย่าง ≥1 เฉพาะเจาะจง', 'เชื่อมโยงบางส่วน'],
        cognitiveIndicators: ['implementing']
      },
      3: {
        description: 'มีตัวอย่างแต่ยังทั่วไป / เชื่อมโยงหลวม เช่น "เช่น สิ่งแวดล้อม" โดยไม่ระบุว่าอะไร',
        evidence: ['ตัวอย่างทั่วไป', 'เชื่อมโยงหลวม'],
        cognitiveIndicators: []
      },
      2: {
        description: 'อ้างกว้างๆ ไม่ชัดเจน หรือไม่สัมพันธ์กับข้อสรุป',
        evidence: ['อ้างกว้างๆ', 'ไม่มีรายละเอียด'],
        cognitiveIndicators: []
      },
      1: {
        description: 'กล่าวอ้างลอยๆ ไร้ตัวอย่าง/ข้อมูลที่ตรวจสอบได้',
        evidence: ['กล่าวอ้างลอยๆ'],
        cognitiveIndicators: []
      },
      0: {
        description: 'ไม่มีหลักฐานหรือตัวอย่างใดๆ / นอกเรื่อง',
        evidence: ['ไม่มีหลักฐาน'],
        cognitiveIndicators: []
      }
    }
  }
}

/**
 * 🚫 Bias Prevention Guidelines - ใช้ร่วมกันทุก prompt
 */
const BIAS_PREVENTION_PROMPT = `
<bias_prevention>
⚠️ ข้อควรระวังเรื่องอคติในการประเมิน:
1. ภาษา ≠ การคิด: ความสามารถในการเขียนภาษาไม่ใช่ตัวชี้วัดทักษะการคิด
   - หากนักเรียนมีไอเดียดีแต่สื่อสารไม่ชัด ให้คะแนนตาม "ความคิด" ไม่ใช่ "การเขียน"
   - ตัวสะกดผิด/ไวยากรณ์ผิด ไม่หักคะแนนทักษะการคิด
2. ความยาว ≠ คุณภาพ: คำตอบสั้นที่ตรงประเด็นดีกว่าคำตอบยาวที่วนซ้ำ
3. สไตล์ ≠ สาระ: ไม่ให้คะแนนเพิ่มเพราะใช้ศัพท์ยากหรือโครงสร้างซับซ้อน
4. เป็นกลาง: ไม่มีอคติจากเพศ เชื้อชาติ หรือภูมิหลังที่อาจปรากฏในคำตอบ
</bias_prevention>`

/**
 * 🎯 Fluffy Content Detection - ตรวจจับคำตอบที่มีแต่ "น้ำ"
 */
const FLUFFY_DETECTION_PROMPT = `
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

/**
 * 📊 Conservative Scoring Instructions
 */
const CONSERVATIVE_SCORING_PROMPT = `
<conservative_scoring>
⚠️ กฎการให้คะแนนแบบ Conservative (เคร่งครัด):
- ให้คะแนนตาม "สมอคะแนน (Anchors)" เท่านั้น
- เลือกคะแนนที่ "ต่ำสุดที่อธิบายพฤติกรรมของคำตอบครบถ้วน"
- หากพฤติกรรมอยู่ "ระหว่าง" สองระดับ → เลือกระดับ "ต่ำกว่า" เสมอ
- ต้องมี "หลักฐานชัดเจน" จากคำตอบจึงจะให้คะแนนระดับนั้นได้
- ไม่ "อนุมาน" หรือ "ตีความเกินจริง" จากคำตอบ
</conservative_scoring>`

/**
 * 📝 Confidence Score Guidelines
 */
const CONFIDENCE_GUIDELINES_PROMPT = `
<confidence_instructions>
📊 ระดับความมั่นใจในการประเมิน (Confidence Score):

⚠️ สำคัญ: Confidence = ความมั่นใจในการตัดสิน ไม่ใช่คุณภาพคำตอบ
- คำตอบมั่ว/ไร้สาระ → ให้คะแนนต่ำ แต่ Confidence สูง (เพราะมั่นใจว่าไม่ดี)
- คำตอบดีมาก → ให้คะแนนสูง และ Confidence สูง
- คำตอบก้ำกึ่ง/คลุมเครือ → ให้คะแนนกลาง และ Confidence ต่ำ (ไม่แน่ใจ)

🎯 เกณฑ์ความมั่นใจ:
- 90-100%: ตัดสินได้ชัดเจน (หลักฐานชัด/ตรงกับ Anchor พอดี)
- 70-89%: ค่อนข้างมั่นใจ (ต้องตีความบางจุดเล็กน้อย)
- 50-69%: ไม่แน่ใจ (คำตอบคลุมเครือ/borderline)
- ต่ำกว่า 50%: ไม่สามารถตัดสินได้ (ต้องถามครูผู้สอน)

📝 ต้องระบุเหตุผลใน "confidenceReason" เสมอ
</confidence_instructions>`

/**
 * 🔧 Generate Scoring Rubric Text for Prompts
 * @param {Array} dimensions - ['analysis', 'reasoning', 'creativity', 'evidence'] หรือ subset
 * @returns {string} Formatted rubric text for prompt
 */
function generateScoringRubricText(dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']) {
  let rubricText = `<scoring_rubric>
หลักการให้คะแนน (0–5 เป็นจำนวนเต็ม)
⚠️ สำคัญ: ให้คะแนนตาม "สมอคะแนน (Anchors)" และเลือกคะแนนที่ "ต่ำสุดที่อธิบายพฤติกรรมของคำตอบครบถ้วน"
⚠️ ความเคร่งครัด: หากพฤติกรรมอยู่ระหว่างสองระดับ → เลือกระดับ "ต่ำกว่า" เสมอ (conservative scoring)
`

  dimensions.forEach((dim, idx) => {
    const config = ARCE_SCORING_ANCHORS[dim]
    if (!config) return
    
    rubricText += `
${idx + 1}) ${config.name} - ${config.icon}
╔═══════════════════════════════════════════════════════════════════════════════╗`
    
    for (let score = 5; score >= 0; score--) {
      const anchor = config.anchors[score]
      rubricText += `
║ ${score} │ ${anchor.description}`
      if (score > 0) {
        rubricText += `
║───┼──────────────────────────────────────────────────────────────────────────║`
      }
    }
    
    rubricText += `
╚═══════════════════════════════════════════════════════════════════════════════╝
`
  })
  
  rubricText += '</scoring_rubric>'
  return rubricText
}

/**
 * 🔧 Generate Simple Scoring Guide (for worksheets)
 * @param {Array} dimensions - dimensions to include
 * @returns {string} Simplified scoring guide
 */
function generateSimpleScoringGuide(dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']) {
  let guideText = ''
  
  dimensions.forEach(dim => {
    const config = ARCE_SCORING_ANCHORS[dim]
    if (!config) return
    
    guideText += `
**${config.icon} ${config.name.split(' ')[0]} (${dim.charAt(0).toUpperCase()}):**`
    
    for (let score = 5; score >= 0; score--) {
      const anchor = config.anchors[score]
      guideText += `
- ${score} = ${anchor.description}`
    }
    guideText += '\n'
  })
  
  return guideText
}

module.exports = {
  sanitizeStudentInput,
  createAssessmentPrompt,
  createLOAssessmentPrompt,
  LO_ASSESSMENT_SYSTEM_MESSAGE,
  // 🆕 Shared Scoring Components
  ARCE_SCORING_ANCHORS,
  BIAS_PREVENTION_PROMPT,
  FLUFFY_DETECTION_PROMPT,
  CONSERVATIVE_SCORING_PROMPT,
  CONFIDENCE_GUIDELINES_PROMPT,
  generateScoringRubricText,
  generateSimpleScoringGuide
}
