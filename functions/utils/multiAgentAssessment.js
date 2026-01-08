/**
 * 🤖 Multi-Agent HOTS Assessment System
 * 
 * ระบบประเมิน HOTS แบบ Multi-Agent สำหรับงานวิจัยระดับ C10
 * แยก Agent เฉพาะทางตามมิติ A.R.C.E. พร้อม Adversarial Refinement
 * 
 * Architecture:
 * 1. Analysis Agent - โฟกัสเฉพาะการแยกแยะ Taxonomy (Bloom's Analyze)
 * 2. Reasoning Agent - ตรวจสอบ Logical Fallacy และตรรกะ
 * 3. Creativity Agent - ประเมินความคิดริเริ่มและนวัตกรรม
 * 4. Evidence Agent - ตรวจสอบการใช้หลักฐาน
 * 5. Adversarial Refiner - คัดค้านและปรับคะแนนให้เที่ยงตรง
 * 6. Consensus Aggregator - รวมผลและสรุปคะแนนสุดท้าย
 * 
 * Features:
 * - Chain-of-Thought (CoT) reasoning per agent
 * - Adversarial prompting for score refinement
 * - Confidence calibration per dimension
 * - Anchor-based scoring with evidence citations
 * - Bias detection and mitigation
 * 
 * References:
 * - Wang et al. (2023). Self-Consistency in Chain-of-Thought
 * - Madaan et al. (2023). Self-Refine: Iterative Refinement with Self-Feedback
 * - Du et al. (2023). Improving Factuality with Multi-Agent Debate
 * 
 * @version 2.0.0
 * @author HOTS-AI Research Team
 */

const { 
  sanitizeStudentInput,
  ARCE_SCORING_ANCHORS,
  BIAS_PREVENTION_PROMPT,
  FLUFFY_DETECTION_PROMPT,
  CONSERVATIVE_SCORING_PROMPT,
  CONFIDENCE_GUIDELINES_PROMPT
} = require('./prompts')

/**
 * 🎯 Agent Configuration
 */
const AGENT_CONFIG = {
  analysis: {
    id: 'ANALYSIS_AGENT',
    name: 'Analysis Agent',
    icon: '🔍',
    bloomLevel: 'Analyze (L4)',
    focusAreas: ['การแยกแยะองค์ประกอบ', 'การจัดโครงสร้าง', 'การเชื่อมความสัมพันธ์'],
    taxonomyVerbs: ['แยกแยะ', 'จำแนก', 'เปรียบเทียบ', 'วิเคราะห์', 'จัดระเบียบ'],
    expertiseDescription: 'ผู้เชี่ยวชาญด้านการวิเคราะห์เชิงโครงสร้างตาม Bloom\'s Taxonomy ระดับ Analyze'
  },
  reasoning: {
    id: 'REASONING_AGENT',
    name: 'Reasoning Agent',
    icon: '🧠',
    bloomLevel: 'Evaluate (L5)',
    focusAreas: ['ตรรกศาสตร์', 'Logical Fallacies', 'การอนุมาน', 'ความสอดคล้อง'],
    taxonomyVerbs: ['ให้เหตุผล', 'อนุมาน', 'สรุป', 'ตัดสิน', 'พิสูจน์'],
    expertiseDescription: 'ผู้เชี่ยวชาญด้านตรรกศาสตร์และการตรวจจับ Logical Fallacies'
  },
  creativity: {
    id: 'CREATIVITY_AGENT',
    name: 'Creativity Agent',
    icon: '💡',
    bloomLevel: 'Create (L6)',
    focusAreas: ['ความคิดริเริ่ม', 'การสร้างสรรค์', 'มุมมองใหม่', 'การประยุกต์'],
    taxonomyVerbs: ['สร้าง', 'ออกแบบ', 'ประดิษฐ์', 'พัฒนา', 'เสนอ'],
    expertiseDescription: 'ผู้เชี่ยวชาญด้านความคิดสร้างสรรค์และนวัตกรรมตาม Guilford\'s SOI Model'
  },
  evidence: {
    id: 'EVIDENCE_AGENT',
    name: 'Evidence Agent',
    icon: '📚',
    bloomLevel: 'Apply (L3)',
    focusAreas: ['หลักฐานเชิงประจักษ์', 'การอ้างอิง', 'ตัวอย่างเฉพาะเจาะจง'],
    taxonomyVerbs: ['ยกตัวอย่าง', 'อ้างอิง', 'สนับสนุน', 'พิสูจน์', 'แสดง'],
    expertiseDescription: 'ผู้เชี่ยวชาญด้านการประเมินหลักฐานและการอ้างอิงทางวิชาการ'
  }
}

/**
 * 🔍 Logical Fallacies Database for Reasoning Agent
 */
const LOGICAL_FALLACIES = {
  formal: [
    { name: 'Affirming the Consequent', thai: 'ยืนยันผลลัพธ์', pattern: 'ถ้า A แล้ว B, B จริง ดังนั้น A จริง' },
    { name: 'Denying the Antecedent', thai: 'ปฏิเสธเหตุ', pattern: 'ถ้า A แล้ว B, A ไม่จริง ดังนั้น B ไม่จริง' },
    { name: 'False Dilemma', thai: 'ทางเลือกเท็จ', pattern: 'มีแค่ 2 ทาง ทั้งที่มีทางอื่น' }
  ],
  informal: [
    { name: 'Ad Hominem', thai: 'โจมตีตัวบุคคล', pattern: 'โจมตีผู้พูดแทนประเด็น' },
    { name: 'Appeal to Authority', thai: 'อ้างผู้มีอำนาจ', pattern: 'อ้างคนดังโดยไม่มีหลักฐาน' },
    { name: 'Circular Reasoning', thai: 'เหตุผลวนรอบ', pattern: 'ใช้ข้อสรุปเป็นเหตุผล' },
    { name: 'Hasty Generalization', thai: 'สรุปเร็วเกินไป', pattern: 'สรุปจากตัวอย่างน้อย' },
    { name: 'Red Herring', thai: 'หลีกเลี่ยงประเด็น', pattern: 'เบี่ยงประเด็นไปเรื่องอื่น' },
    { name: 'Slippery Slope', thai: 'ทางลาดชัน', pattern: 'คาดการณ์ผลเลวร้ายเกินจริง' },
    { name: 'Straw Man', thai: 'หุ่นฟาง', pattern: 'บิดเบือนคู่โต้แย้ง' }
  ]
}

/**
 * 📊 Anchor Scoring Matrix - ใช้ shared constants จาก prompts.js
 * แปลงจาก ARCE_SCORING_ANCHORS เป็น format สำหรับ Multi-Agent
 */
function getAnchorScoringMatrix() {
  const matrix = {}
  for (const [dim, config] of Object.entries(ARCE_SCORING_ANCHORS)) {
    matrix[dim] = {}
    for (const [score, anchor] of Object.entries(config.anchors)) {
      matrix[dim][score] = {
        description: anchor.description,
        requiredEvidence: anchor.evidence,
        cognitiveIndicators: anchor.cognitiveIndicators
      }
    }
  }
  return matrix
}

// Use shared anchors
const ANCHOR_SCORING_MATRIX = getAnchorScoringMatrix()

/**
 * 🔍 Create Analysis Agent Prompt
 */
function createAnalysisAgentPrompt(context, answer, gradeLevel) {
  const config = AGENT_CONFIG.analysis
  const anchors = ANCHOR_SCORING_MATRIX.analysis
  
  return `
<agent_identity>
คุณคือ ${config.name} ${config.icon}
${config.expertiseDescription}
Bloom's Level: ${config.bloomLevel}
Focus Areas: ${config.focusAreas.join(', ')}
</agent_identity>

<task>
ประเมินเฉพาะมิติ "การวิเคราะห์" (Analysis) ของคำตอบนักเรียน
ใช้ Chain-of-Thought reasoning อย่างละเอียดก่อนให้คะแนน
</task>

<input>
<context>${context || 'การประเมินทักษะการคิด'}</context>
<grade_level>${gradeLevel || 'ไม่ระบุ'}</grade_level>
<student_answer>${answer}</student_answer>
</input>

<analysis_criteria>
ตรวจสอบว่าคำตอบแสดงการวิเคราะห์ตาม Cognitive Processes ต่อไปนี้:
1. Differentiating (แยกแยะ): ระบุส่วนสำคัญ/ไม่สำคัญ
2. Organizing (จัดระเบียบ): จัดโครงสร้างความสัมพันธ์
3. Attributing (อ้างเหตุผล): ระบุสาเหตุ/แรงจูงใจ

คำกริยาที่บ่งชี้การวิเคราะห์: ${config.taxonomyVerbs.join(', ')}
</analysis_criteria>

<anchor_scoring>
ให้คะแนน 0-5 ตาม Anchor descriptions:
${Object.entries(anchors).map(([score, data]) => `
[${score} คะแนน]
- ${data.description}
- หลักฐานที่ต้องการ: ${data.requiredEvidence.join(', ')}
- Cognitive Indicators: ${data.cognitiveIndicators.join(', ') || 'ไม่พบ'}
`).join('')}
</anchor_scoring>

<conservative_scoring>
⚠️ กฎการให้คะแนนแบบ Conservative:
- หากพฤติกรรมอยู่ "ระหว่าง" สองระดับ → เลือกระดับ "ต่ำกว่า" เสมอ
- ต้องมี "หลักฐานชัดเจน" จากคำตอบจึงจะให้คะแนนระดับนั้นได้
- ไม่ "อนุมาน" หรือ "ตีความเกินจริง" จากคำตอบ
</conservative_scoring>

<fluffy_content_detection>
🎯 การตรวจจับคำตอบที่มีแต่ "น้ำ" (Fluffy Content):
คำตอบที่มีเฉพาะคำชมเชย/ความรู้สึกโดยไม่มีสาระ → คะแนน 0-1 เท่านั้น

ตัวอย่างคำตอบที่ "มีแต่น้ำ":
- "ผมคิดว่ามันดีมากๆ เลยครับ"
- "เรื่องนี้น่าสนใจมากค่ะ ชอบมากเลย"

การตรวจสอบ:
- คำว่า "ดี" "สุดยอด" "น่าสนใจ" ไม่ใช่หลักฐานของการวิเคราะห์
- ถ้าคำตอบไม่มีการแยกแยะองค์ประกอบจริง → Analysis = 0
</fluffy_content_detection>

<chain_of_thought>
ทำตามขั้นตอนนี้:
1. อ่านคำตอบและระบุส่วนที่แสดงการวิเคราะห์
2. ตรวจสอบ Cognitive Processes ที่ปรากฏ
3. จับคู่กับ Anchor ที่เหมาะสมที่สุด
4. ให้คะแนนพร้อมเหตุผล
5. ระบุหลักฐานที่อ้างอิงจากคำตอบ
</chain_of_thought>

<output_schema>
{
  "agentId": "ANALYSIS_AGENT",
  "dimension": "analysis",
  "chainOfThought": {
    "step1_identification": "ส่วนที่แสดงการวิเคราะห์...",
    "step2_cognitive_check": ["differentiating: ...", "organizing: ...", "attributing: ..."],
    "step3_anchor_match": "ตรงกับ Anchor ระดับ X เพราะ...",
    "step4_reasoning": "เหตุผลการให้คะแนน..."
  },
  "score": 0-5,
  "confidence": 0-100,
  "evidenceFromAnswer": ["หลักฐานข้อ 1 จากคำตอบ", "หลักฐานข้อ 2"],
  "anchorUsed": "Description ของ Anchor ที่ใช้",
  "cognitiveProcessesFound": ["differentiating", "organizing"],
  "missingElements": ["สิ่งที่ขาด"],
  "microFeedback": "คำอธิบายสั้นๆ ว่าทำไมได้คะแนนนี้"
}
</output_schema>

ส่งคืน JSON เท่านั้น ไม่ต้องครอบ markdown`
}

/**
 * 🧠 Create Reasoning Agent Prompt (with Logical Fallacy Detection)
 */
function createReasoningAgentPrompt(context, answer, gradeLevel) {
  const config = AGENT_CONFIG.reasoning
  const anchors = ANCHOR_SCORING_MATRIX.reasoning
  
  // Format fallacies for prompt
  const fallacyList = [...LOGICAL_FALLACIES.formal, ...LOGICAL_FALLACIES.informal]
    .map(f => `- ${f.name} (${f.thai}): ${f.pattern}`)
    .join('\n')
  
  return `
<agent_identity>
คุณคือ ${config.name} ${config.icon}
${config.expertiseDescription}
Bloom's Level: ${config.bloomLevel}
Focus Areas: ${config.focusAreas.join(', ')}
</agent_identity>

<task>
ประเมินเฉพาะมิติ "การให้เหตุผล" (Reasoning) ของคำตอบนักเรียน
ตรวจจับ Logical Fallacies และประเมินคุณภาพการอนุมาน
</task>

<input>
<context>${context || 'การประเมินทักษะการคิด'}</context>
<grade_level>${gradeLevel || 'ไม่ระบุ'}</grade_level>
<student_answer>${answer}</student_answer>
</input>

<logical_fallacies_checklist>
ตรวจสอบว่าคำตอบมี Fallacy เหล่านี้หรือไม่:
${fallacyList}
</logical_fallacies_checklist>

<reasoning_criteria>
ตรวจสอบคุณภาพการให้เหตุผล:
1. Validity: เหตุผลสนับสนุนข้อสรุปหรือไม่
2. Soundness: เหตุผลตั้งอยู่บนข้อเท็จจริงที่ถูกต้องหรือไม่
3. Completeness: ครอบคลุมประเด็นหรือมีช่องโหว่
4. Coherence: ลำดับความคิดสอดคล้องกันหรือไม่

คำกริยาที่บ่งชี้การให้เหตุผล: ${config.taxonomyVerbs.join(', ')}
</reasoning_criteria>

<anchor_scoring>
ให้คะแนน 0-5 ตาม Anchor descriptions:
${Object.entries(anchors).map(([score, data]) => `
[${score} คะแนน]
- ${data.description}
- หลักฐานที่ต้องการ: ${data.requiredEvidence.join(', ')}
`).join('')}
</anchor_scoring>

<chain_of_thought>
ทำตามขั้นตอนนี้:
1. วิเคราะห์โครงสร้างเหตุผล (Premises → Inference → Conclusion)
2. ตรวจสอบความถูกต้องของการอนุมาน
3. Scan หา Logical Fallacies ทั้งหมด
4. ประเมินความสอดคล้องของข้อสรุป
5. จับคู่กับ Anchor และให้คะแนน
</chain_of_thought>

<output_schema>
{
  "agentId": "REASONING_AGENT",
  "dimension": "reasoning",
  "chainOfThought": {
    "step1_structure": "โครงสร้างเหตุผล: Premise1 → Premise2 → Conclusion",
    "step2_validity_check": "การอนุมานถูกต้อง/ไม่ถูกต้องเพราะ...",
    "step3_fallacy_scan": ["Fallacy ที่พบ (ถ้ามี)"],
    "step4_coherence": "ความสอดคล้อง...",
    "step5_anchor_match": "ตรงกับ Anchor ระดับ X"
  },
  "score": 0-5,
  "confidence": 0-100,
  "evidenceFromAnswer": ["หลักฐานการให้เหตุผลจากคำตอบ"],
  "fallaciesDetected": [
    {"name": "Fallacy name", "thai": "ชื่อไทย", "location": "ตำแหน่งในคำตอบ"}
  ],
  "reasoningStrength": {
    "validity": "strong/moderate/weak",
    "soundness": "strong/moderate/weak",
    "completeness": "complete/partial/incomplete",
    "coherence": "coherent/partially/incoherent"
  },
  "anchorUsed": "Description ของ Anchor ที่ใช้",
  "microFeedback": "คำอธิบายสั้นๆ"
}
</output_schema>

ส่งคืน JSON เท่านั้น ไม่ต้องครอบ markdown`
}

/**
 * 💡 Create Creativity Agent Prompt
 */
function createCreativityAgentPrompt(context, answer, gradeLevel) {
  const config = AGENT_CONFIG.creativity
  const anchors = ANCHOR_SCORING_MATRIX.creativity
  
  return `
<agent_identity>
คุณคือ ${config.name} ${config.icon}
${config.expertiseDescription}
Bloom's Level: ${config.bloomLevel}
Focus Areas: ${config.focusAreas.join(', ')}
</agent_identity>

<task>
ประเมินเฉพาะมิติ "ความคิดสร้างสรรค์" (Creativity) ของคำตอบนักเรียน
ใช้ Guilford's Structure of Intellect (SOI) และ Torrance's TTCT criteria
</task>

<input>
<context>${context || 'การประเมินทักษะการคิด'}</context>
<grade_level>${gradeLevel || 'ไม่ระบุ'}</grade_level>
<student_answer>${answer}</student_answer>
</input>

<creativity_criteria>
ตรวจสอบตาม TTCT (Torrance Tests of Creative Thinking):
1. Fluency: จำนวนไอเดีย
2. Flexibility: ความหลากหลายของมุมมอง
3. Originality: ความแปลกใหม่/ไม่ซ้ำ
4. Elaboration: รายละเอียดในการขยายไอเดีย

และ Cognitive Processes ระดับ Create:
- Generating: สร้างทางเลือก/สมมติฐาน
- Planning: วางแผนขั้นตอน
- Producing: สร้างผลงานใหม่
</creativity_criteria>

<anchor_scoring>
ให้คะแนน 0-5 ตาม Anchor descriptions:
${Object.entries(anchors).map(([score, data]) => `
[${score} คะแนน]
- ${data.description}
- หลักฐานที่ต้องการ: ${data.requiredEvidence.join(', ')}
`).join('')}
</anchor_scoring>

<bias_warning>
⚠️ อคติที่ต้องหลีกเลี่ยง:
- ไม่ให้คะแนนสูงเพราะใช้ศัพท์แปลกใหม่แต่ไม่มีสาระ
- ไม่หักคะแนนความคิดที่ไม่ตรงกับ "คำตอบมาตรฐาน"
- พิจารณาความคิดสร้างสรรค์ตามบริบทระดับชั้น
</bias_warning>

<output_schema>
{
  "agentId": "CREATIVITY_AGENT",
  "dimension": "creativity",
  "chainOfThought": {
    "step1_idea_count": "จำนวนไอเดีย: X",
    "step2_ttct_analysis": {
      "fluency": "ระดับ/หลักฐาน",
      "flexibility": "ระดับ/หลักฐาน",
      "originality": "ระดับ/หลักฐาน",
      "elaboration": "ระดับ/หลักฐาน"
    },
    "step3_novelty_check": "ความใหม่เมื่อเทียบกับคำตอบทั่วไป...",
    "step4_anchor_match": "ตรงกับ Anchor ระดับ X"
  },
  "score": 0-5,
  "confidence": 0-100,
  "evidenceFromAnswer": ["ไอเดียสร้างสรรค์ที่พบ"],
  "ttctScores": {
    "fluency": 1-5,
    "flexibility": 1-5,
    "originality": 1-5,
    "elaboration": 1-5
  },
  "novelIdeas": ["ไอเดียใหม่ที่พบ"],
  "conventionalIdeas": ["ไอเดียทั่วไป"],
  "anchorUsed": "Description ของ Anchor ที่ใช้",
  "microFeedback": "คำอธิบายสั้นๆ"
}
</output_schema>

ส่งคืน JSON เท่านั้น ไม่ต้องครอบ markdown`
}

/**
 * 📚 Create Evidence Agent Prompt
 */
function createEvidenceAgentPrompt(context, answer, gradeLevel) {
  const config = AGENT_CONFIG.evidence
  const anchors = ANCHOR_SCORING_MATRIX.evidence
  
  return `
<agent_identity>
คุณคือ ${config.name} ${config.icon}
${config.expertiseDescription}
Bloom's Level: ${config.bloomLevel}
Focus Areas: ${config.focusAreas.join(', ')}
</agent_identity>

<task>
ประเมินเฉพาะมิติ "การใช้หลักฐาน" (Evidence) ของคำตอบนักเรียน
ตรวจสอบคุณภาพของหลักฐานและการเชื่อมโยงกับข้อสรุป
</task>

<input>
<context>${context || 'การประเมินทักษะการคิด'}</context>
<grade_level>${gradeLevel || 'ไม่ระบุ'}</grade_level>
<student_answer>${answer}</student_answer>
</input>

<evidence_criteria>
ตรวจสอบคุณภาพหลักฐาน:
1. Specificity: เฉพาะเจาะจง vs ทั่วไป
2. Relevance: ตรงประเด็นกับข้อสรุป
3. Credibility: น่าเชื่อถือ/ตรวจสอบได้
4. Sufficiency: เพียงพอสนับสนุนข้อสรุป
5. Citation: มีการอ้างอิงแหล่งที่มา

ประเภทหลักฐาน:
- Personal experience (ประสบการณ์ส่วนตัว)
- Factual data (ข้อมูลเชิงประจักษ์)
- Expert testimony (คำกล่าวผู้เชี่ยวชาญ)
- Examples/Cases (ตัวอย่าง/กรณีศึกษา)
- Research/Statistics (งานวิจัย/สถิติ)
</evidence_criteria>

<anchor_scoring>
ให้คะแนน 0-5 ตาม Anchor descriptions:
${Object.entries(anchors).map(([score, data]) => `
[${score} คะแนน]
- ${data.description}
- หลักฐานที่ต้องการ: ${data.requiredEvidence.join(', ')}
`).join('')}
</anchor_scoring>

<output_schema>
{
  "agentId": "EVIDENCE_AGENT",
  "dimension": "evidence",
  "chainOfThought": {
    "step1_evidence_list": ["หลักฐานที่พบในคำตอบ"],
    "step2_quality_check": {
      "specificity": "high/medium/low",
      "relevance": "high/medium/low",
      "credibility": "high/medium/low",
      "sufficiency": "sufficient/partial/insufficient"
    },
    "step3_connection_analysis": "การเชื่อมโยงกับข้อสรุป...",
    "step4_anchor_match": "ตรงกับ Anchor ระดับ X"
  },
  "score": 0-5,
  "confidence": 0-100,
  "evidenceFromAnswer": ["หลักฐานที่นักเรียนอ้าง"],
  "evidenceTypes": [
    {"type": "personal_experience", "quote": "...", "quality": "high/medium/low"}
  ],
  "evidenceQuality": {
    "specificity": 1-5,
    "relevance": 1-5,
    "credibility": 1-5,
    "sufficiency": 1-5
  },
  "missingEvidence": ["หลักฐานที่ควรมีแต่ขาด"],
  "anchorUsed": "Description ของ Anchor ที่ใช้",
  "microFeedback": "คำอธิบายสั้นๆ"
}
</output_schema>

ส่งคืน JSON เท่านั้น ไม่ต้องครอบ markdown`
}

/**
 * ⚔️ Create Adversarial Refiner Prompt
 * Agent ที่คัดค้านคะแนนจาก Agent อื่นเพื่อหาความเที่ยงตรง
 */
function createAdversarialRefinerPrompt(context, answer, agentResults, gradeLevel) {
  return `
<agent_identity>
คุณคือ Adversarial Refiner ⚔️
บทบาท: ผู้ตรวจสอบความเที่ยงตรงของการประเมิน
หน้าที่: คัดค้าน วิพากษ์ และปรับปรุงคะแนนจาก Agent อื่น
</agent_identity>

<task>
ตรวจสอบผลประเมินจาก 4 Agents และ:
1. หาจุดอ่อนในการให้เหตุผล
2. ตรวจสอบความสอดคล้องของหลักฐาน
3. เสนอการปรับคะแนน (ถ้าจำเป็น)
4. สรุปคะแนนที่เที่ยงตรงที่สุด
</task>

<input>
<context>${context || 'การประเมินทักษะการคิด'}</context>
<grade_level>${gradeLevel || 'ไม่ระบุ'}</grade_level>
<student_answer>${answer}</student_answer>
</input>

<agent_results>
${JSON.stringify(agentResults, null, 2)}
</agent_results>

<adversarial_checklist>
สำหรับแต่ละ Agent ถามว่า:
1. หลักฐานที่อ้างมีอยู่จริงในคำตอบหรือไม่?
2. Anchor ที่เลือกเหมาะสมหรือไม่?
3. มี Bias ในการให้คะแนนหรือไม่?
4. ควรเพิ่มหรือลดคะแนนหรือไม่? เพราะอะไร?
</adversarial_checklist>

<bias_detection>
ตรวจสอบ Bias ต่อไปนี้:
1. Length Bias: ให้คะแนนสูงเพราะยาว (ไม่ใช่เพราะคุณภาพ)
2. Vocabulary Bias: ให้คะแนนสูงเพราะใช้ศัพท์ยาก
3. Format Bias: ให้คะแนนสูงเพราะรูปแบบสวย
4. Leniency Bias: ให้คะแนนสูงเกินไปทุกมิติ
5. Severity Bias: ให้คะแนนต่ำเกินไปทุกมิติ
</bias_detection>

<confidence_calculation>
คำนวณ overallConfidence (0-100) จาก:
1. Agent Agreement: ถ้า variance ของคะแนนจาก 4 agents < 1 → +30 confidence
2. Evidence Quality: ถ้าทุก agent อ้างหลักฐานที่ตรงกัน → +25 confidence
3. No Bias Detected: ถ้าไม่พบ bias ใดๆ → +25 confidence
4. Answer Clarity: ถ้าคำตอบชัดเจน ไม่กำกวม → +20 confidence

เป้าหมาย: Confidence 90+ แสดงว่าการประเมินมีความน่าเชื่อถือสูง
</confidence_calculation>

<output_schema>
{
  "agentId": "ADVERSARIAL_REFINER",
  "challenges": [
    {
      "targetAgent": "ANALYSIS_AGENT",
      "originalScore": 4,
      "challenge": "เหตุผลที่คัดค้าน...",
      "evidenceInAnswer": "หลักฐานที่ตรวจสอบ",
      "recommendation": "keep/increase/decrease",
      "suggestedScore": 4,
      "justification": "เหตุผลของคำแนะนำ"
    }
  ],
  "biasDetected": [
    {"type": "length_bias", "severity": "low/medium/high", "evidence": "..."}
  ],
  "refinedScores": {
    "analysis": {"original": 4, "refined": 4, "changed": false, "reason": "..."},
    "reasoning": {"original": 3, "refined": 3, "changed": false, "reason": "..."},
    "creativity": {"original": 3, "refined": 2, "changed": true, "reason": "..."},
    "evidence": {"original": 4, "refined": 4, "changed": false, "reason": "..."}
  },
  "consensusAchieved": true,
  "overallConfidence": 0-100,
  "refinementSummary": "สรุปการปรับปรุง"
}
</output_schema>

ส่งคืน JSON เท่านั้น ไม่ต้องครอบ markdown`
}

/**
 * 🎯 Create Consensus Aggregator Prompt
 * รวมผลจากทุก Agent และสร้าง Final Assessment
 */
function createConsensusAggregatorPrompt(context, answer, refinedResults, gradeLevel, options = {}) {
  const { isScaffolding, scaffoldingAttempts } = options
  
  return `
<agent_identity>
คุณคือ Consensus Aggregator 🎯
บทบาท: ผู้รวบรวมและสรุปผลประเมินขั้นสุดท้าย
หน้าที่: สร้าง Final Assessment ที่สมบูรณ์สำหรับนักเรียน
</agent_identity>

<task>
รวบรวมผลจาก Multi-Agent Assessment และสร้างผลลัพธ์สุดท้าย:
1. คะแนน HOTS 4 มิติ
2. Feedback ที่เป็นประโยชน์
3. จุดแข็ง/จุดอ่อน
4. คำแนะนำเชิงปฏิบัติ
${isScaffolding ? '5. คำถามชี้ทาง (Scaffolding)' : ''}
</task>

<input>
<context>${context || 'การประเมินทักษะการคิด'}</context>
<grade_level>${gradeLevel || 'ไม่ระบุ'}</grade_level>
<student_answer>${answer}</student_answer>
</input>

<refined_results>
${JSON.stringify(refinedResults, null, 2)}
</refined_results>

<aggregation_rules>
1. ใช้คะแนนจาก Adversarial Refiner (refined scores)
2. รวม Micro-feedback จากแต่ละ Agent
3. สร้าง Overall feedback ที่เชื่อมโยงทุกมิติ
4. ความยาว Feedback: 2-3 ประโยค
5. ใช้ภาษาไทยที่เข้าใจง่าย เป็นกำลังใจ
</aggregation_rules>

${isScaffolding ? `
<scaffolding_mode>
นี่คือการประเมินครั้งที่ ${(scaffoldingAttempts || 0) + 1}
ถ้าคะแนนรวม < 10/20 ให้สร้าง probingQuestion:
- ระบุมิติที่อ่อนที่สุด
- ถามคำถามที่ช่วยให้คิดต่อ
- ใช้ภาษาให้กำลังใจ
</scaffolding_mode>
` : ''}

<right_to_explanation>
สร้าง "explanationDetails" สำหรับ Right to Explanation:
- อธิบายเหตุผลของแต่ละคะแนนโดยอ้าง Anchor
- ยกหลักฐานจากคำตอบที่สนับสนุนคะแนน
- อธิบายสิ่งที่ต้องทำเพื่อได้คะแนนสูงขึ้น
</right_to_explanation>

<confidence_calibration>
การกำหนด Confidence Score (0-100):

ความมั่นใจสูง (90-100):
- Agent ทุกตัวให้คะแนนไปในทิศทางเดียวกัน (variance < 1)
- คำตอบมีความชัดเจน ไม่กำกวม
- มีหลักฐานชัดเจนในคำตอบสนับสนุนคะแนน
- Adversarial Refiner ไม่พบ bias หรือปัญหาสำคัญ
- คำตอบยาวเพียงพอให้ประเมินได้ครบถ้วน (>50 คำ)

ความมั่นใจปานกลาง (70-89):
- Agent ส่วนใหญ่เห็นตรงกัน (variance < 2)
- คำตอบค่อนข้างชัดเจน แต่อาจมีส่วนที่กำกวมบ้าง
- มีหลักฐานบางส่วนในคำตอบ

ความมั่นใจต่ำ (50-69):
- Agent มีความเห็นแตกต่าง (variance >= 2)
- คำตอบกำกวม ตีความได้หลายทาง
- ขาดหลักฐานชัดเจน
- คำตอบสั้นเกินไป

ความมั่นใจต่ำมาก (<50):
- คำตอบไม่เกี่ยวข้องหรือไม่สามารถประเมินได้
- มี bias ชัดเจนในการประเมิน
</confidence_calibration>

<output_schema>
{
  "rubricScores": {
    "analysis": 0-5,
    "reasoning": 0-5,
    "creativity": 0-5,
    "evidence": 0-5
  },
  "totalScore": 0-20,
  "confidence": 0-100,
  "confidenceReason": "เหตุผลความมั่นใจ",
  
  "feedback": "Feedback โดยรวม 2-3 ประโยค",
  "strengths": ["จุดเด่น 1", "จุดเด่น 2"],
  "weaknesses": ["จุดที่ควรพัฒนา 1"],
  "suggestions": ["คำแนะนำ 1", "คำแนะนำ 2"],
  
  "explanationDetails": {
    "analysis": {
      "score": 0-5,
      "anchorDescription": "Anchor ที่ใช้",
      "evidenceFromAnswer": ["หลักฐาน"],
      "howToImprove": "วิธีเพิ่มคะแนน"
    },
    "reasoning": { ... },
    "creativity": { ... },
    "evidence": { ... }
  },
  
  "multiAgentMetadata": {
    "agentsUsed": ["ANALYSIS_AGENT", "REASONING_AGENT", "CREATIVITY_AGENT", "EVIDENCE_AGENT", "ADVERSARIAL_REFINER"],
    "consensusLevel": "high/medium/low",
    "refinementsMade": 0,
    "biasesDetected": []
  }
  
  ${isScaffolding ? ',"probingQuestion": "คำถามชี้ทาง (ถ้าคะแนนรวม < 10)"' : ''}
}
</output_schema>

ส่งคืน JSON เท่านั้น ไม่ต้องครอบ markdown`
}

/**
 * 🚀 Multi-Agent Assessment Orchestrator
 * 
 * ฟังก์ชันหลักที่ควบคุมการทำงานของ Multi-Agent System
 * 
 * @param {Object} llmProvider - LLM provider instance
 * @param {string} context - Question context
 * @param {string} answer - Student's answer
 * @param {Object} options - Assessment options
 * @returns {Object} Complete assessment result
 */
async function runMultiAgentAssessment(llmProvider, context, answer, options = {}) {
  const {
    gradeLevel,
    subject,
    isScaffolding = false,
    scaffoldingAttempts = 0,
    parallelAgents = true, // Run agents in parallel for speed
    includeAdversarial = true, // Include adversarial refinement
    detailedLogging = false
  } = options
  
  // Sanitize input
  const sanitizedAnswer = sanitizeStudentInput(answer, 3000)
  
  const startTime = Date.now()
  const agentResults = {}
  const logs = []
  
  const log = (msg) => {
    if (detailedLogging) {
      logs.push({ timestamp: Date.now() - startTime, message: msg })
    }
  }
  
  try {
    // Phase 1: Run 4 dimension agents (parallel or sequential)
    log('Phase 1: Running dimension agents')
    
    const agentPrompts = {
      analysis: createAnalysisAgentPrompt(context, sanitizedAnswer, gradeLevel),
      reasoning: createReasoningAgentPrompt(context, sanitizedAnswer, gradeLevel),
      creativity: createCreativityAgentPrompt(context, sanitizedAnswer, gradeLevel),
      evidence: createEvidenceAgentPrompt(context, sanitizedAnswer, gradeLevel)
    }
    
    if (parallelAgents) {
      // Run all agents in parallel
      const results = await Promise.all([
        llmProvider.complete(agentPrompts.analysis, { temperature: 0.3 }),
        llmProvider.complete(agentPrompts.reasoning, { temperature: 0.3 }),
        llmProvider.complete(agentPrompts.creativity, { temperature: 0.3 }),
        llmProvider.complete(agentPrompts.evidence, { temperature: 0.3 })
      ])
      
      agentResults.analysis = parseAgentResponse(results[0])
      agentResults.reasoning = parseAgentResponse(results[1])
      agentResults.creativity = parseAgentResponse(results[2])
      agentResults.evidence = parseAgentResponse(results[3])
    } else {
      // Run agents sequentially
      for (const [dimension, prompt] of Object.entries(agentPrompts)) {
        log(`Running ${dimension} agent`)
        const result = await llmProvider.complete(prompt, { temperature: 0.3 })
        agentResults[dimension] = parseAgentResponse(result)
      }
    }
    
    log('Phase 1 complete')
    
    // Phase 2: Adversarial Refinement (optional)
    let refinedResults = agentResults
    
    if (includeAdversarial) {
      log('Phase 2: Running adversarial refiner')
      
      const adversarialPrompt = createAdversarialRefinerPrompt(
        context, sanitizedAnswer, agentResults, gradeLevel
      )
      
      const adversarialResult = await llmProvider.complete(adversarialPrompt, { temperature: 0.2 })
      const parsedAdversarial = parseAgentResponse(adversarialResult)
      
      // Apply refinements
      if (parsedAdversarial.refinedScores) {
        refinedResults = {
          ...agentResults,
          adversarial: parsedAdversarial,
          refinedScores: parsedAdversarial.refinedScores
        }
      }
      
      log('Phase 2 complete')
    }
    
    // Phase 3: Consensus Aggregation
    log('Phase 3: Running consensus aggregator')
    
    const aggregatorPrompt = createConsensusAggregatorPrompt(
      context, sanitizedAnswer, refinedResults, gradeLevel,
      { isScaffolding, scaffoldingAttempts }
    )
    
    const finalResult = await llmProvider.complete(aggregatorPrompt, { temperature: 0.2 })
    const parsedFinal = parseAgentResponse(finalResult)
    
    log('Phase 3 complete')
    
    // Calculate total score if not present
    if (!parsedFinal.totalScore && parsedFinal.rubricScores) {
      parsedFinal.totalScore = Object.values(parsedFinal.rubricScores).reduce((a, b) => a + b, 0)
    }
    
    // Add metadata
    parsedFinal.multiAgentMetadata = {
      ...parsedFinal.multiAgentMetadata,
      processingTimeMs: Date.now() - startTime,
      agentsRun: ['ANALYSIS', 'REASONING', 'CREATIVITY', 'EVIDENCE', 
                  ...(includeAdversarial ? ['ADVERSARIAL'] : []), 'AGGREGATOR'],
      parallelExecution: parallelAgents,
      ...(detailedLogging ? { logs } : {})
    }
    
    // Store individual agent results for research
    parsedFinal.agentDetails = {
      analysis: agentResults.analysis,
      reasoning: agentResults.reasoning,
      creativity: agentResults.creativity,
      evidence: agentResults.evidence,
      ...(includeAdversarial && refinedResults.adversarial ? { 
        adversarial: {
          refinedScores: refinedResults.adversarial.refinedScores || {},
          challenges: refinedResults.adversarial.challenges || [],
          biasDetected: refinedResults.adversarial.biasDetected || [],
          overallConfidence: refinedResults.adversarial.overallConfidence || 0,
          refinementSummary: refinedResults.adversarial.refinementSummary || '',
          consensusAchieved: refinedResults.adversarial.consensusAchieved || false
        }
      } : {}),
      // Add consensus aggregator results
      consensus: {
        rubricScores: parsedFinal.rubricScores || {},
        totalScore: parsedFinal.totalScore || 0,
        confidence: parsedFinal.confidence || 0,
        confidenceReason: parsedFinal.confidenceReason || '',
        consensusLevel: parsedFinal.multiAgentMetadata?.consensusLevel || 'medium',
        feedback: parsedFinal.feedback || ''
      }
    }
    
    return {
      success: true,
      ...parsedFinal
    }
    
  } catch (error) {
    log(`Error: ${error.message}`)
    
    return {
      success: false,
      error: error.message,
      logs,
      fallbackScores: {
        analysis: 0,
        reasoning: 0,
        creativity: 0,
        evidence: 0
      }
    }
  }
}

/**
 * Parse agent response with markdown cleaning
 */
function parseAgentResponse(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    return { error: 'Empty response' }
  }
  
  let cleanedText = responseText.trim()
  
  // Remove markdown wrappers
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
    cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
  }
  
  try {
    return JSON.parse(cleanedText)
  } catch (e) {
    // Try to extract JSON from response
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch (e2) {
        return { error: 'Failed to parse JSON', raw: cleanedText.substring(0, 500) }
      }
    }
    return { error: 'No JSON found', raw: cleanedText.substring(0, 500) }
  }
}

/**
 * 🎯📝 Multi-Agent Per-Question Assessment for Worksheets
 * 
 * ประเมินแต่ละคำถามด้วย 6 Agents อย่างเต็มรูปแบบ
 * เหมาะสำหรับ worksheet ที่มี 1-15 คำถาม
 * 
 * API Calls: 6 calls × N questions + 1 summary = 6N + 1 calls
 * - 3 questions = 19 API calls
 * - 5 questions = 31 API calls
 * - 10 questions = 61 API calls
 * - 15 questions = 91 API calls
 * 
 * @param {Object} llmProvider - LLM provider instance
 * @param {Array} questions - Array of question objects with studentAnswer
 * @param {Object} worksheetMeta - Worksheet metadata
 * @param {Object} options - Assessment options
 * @returns {Object} Complete worksheet assessment with per-question details
 */
async function runMultiAgentPerQuestion(llmProvider, questions, worksheetMeta, options = {}) {
  const {
    gradeLevel = 'ม.4',
    parallelQuestions = false, // Run questions in parallel (faster but more concurrent API calls)
    parallelAgents = true, // Run agents in parallel within each question
    includeAdversarial = true,
    detailedLogging = false,
    maxConcurrentQuestions = 3 // Limit parallel questions to avoid rate limiting
  } = options
  
  const startTime = Date.now()
  const logs = []
  const questionResults = []
  
  const log = (msg) => {
    if (detailedLogging) {
      logs.push({ timestamp: Date.now() - startTime, message: msg })
    }
    console.log(`🤖×6 [${Date.now() - startTime}ms] ${msg}`)
  }
  
  log(`Starting Multi-Agent Per-Question Assessment for ${questions.length} questions`)
  
  try {
    // Process each question with full Multi-Agent assessment
    const processQuestion = async (question, index) => {
      const questionStart = Date.now()
      log(`Question ${index + 1}/${questions.length}: Starting assessment`)
      
      // Build context for this question
      const context = buildQuestionContext(question, worksheetMeta)
      const answer = question.studentAnswer || ''
      
      // Run full Multi-Agent assessment for this question
      const result = await runMultiAgentAssessment(llmProvider, context, answer, {
        gradeLevel,
        parallelAgents,
        includeAdversarial,
        detailedLogging
      })
      
      const questionTime = Date.now() - questionStart
      log(`Question ${index + 1}: Completed in ${questionTime}ms`)
      
      return {
        questionIndex: index,
        questionId: question.questionId || question.id || `q${index + 1}`,
        sectionId: question.sectionId || '',
        question: question.prompt || question.task || '',
        prompt: question.prompt || question.task || '',
        context: question.context || question.situation || '',
        situation: question.situation || question.context || '',
        studentAnswer: answer,
        type: question.type || 'open_ended',
        phase: question.phase || '',
        arceFocus: Array.isArray(question.arceFocus) ? question.arceFocus : [question.arceFocus || 'analysis'],
        maxScore: question.maxScore || 5,
        
        // Multi-Agent assessment results
        rubricScores: result.rubricScores || {
          analysis: 0,
          reasoning: 0,
          creativity: 0,
          evidence: 0
        },
        totalScore: result.totalScore || 0,
        confidence: result.confidence || 0,
        confidenceReason: result.confidenceReason || '',
        
        feedback: result.feedback || '',
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        suggestions: result.suggestions || [],
        
        // Detailed agent results for research
        agentDetails: result.agentDetails || {},
        explanationDetails: result.explanationDetails || {},
        
        // Metadata
        processingTimeMs: questionTime,
        passed: (result.totalScore || 0) >= (question.maxScore * 0.5),
        
        // ARCE breakdown for display
        arceBreakdown: {
          analysis: {
            score: result.rubricScores?.analysis || 0,
            feedback: result.agentDetails?.analysis?.microFeedback || result.explanationDetails?.analysis?.howToImprove || ''
          },
          reasoning: {
            score: result.rubricScores?.reasoning || 0,
            feedback: result.agentDetails?.reasoning?.microFeedback || result.explanationDetails?.reasoning?.howToImprove || ''
          },
          creativity: {
            score: result.rubricScores?.creativity || 0,
            feedback: result.agentDetails?.creativity?.microFeedback || result.explanationDetails?.creativity?.howToImprove || ''
          },
          evidence: {
            score: result.rubricScores?.evidence || 0,
            feedback: result.agentDetails?.evidence?.microFeedback || result.explanationDetails?.evidence?.howToImprove || ''
          }
        }
      }
    }
    
    // Process questions (parallel or sequential)
    if (parallelQuestions && questions.length > 1) {
      log(`Processing ${questions.length} questions in parallel (max ${maxConcurrentQuestions} concurrent)`)
      
      // Process in batches to avoid rate limiting
      for (let i = 0; i < questions.length; i += maxConcurrentQuestions) {
        const batch = questions.slice(i, i + maxConcurrentQuestions)
        const batchResults = await Promise.all(
          batch.map((q, idx) => processQuestion(q, i + idx))
        )
        questionResults.push(...batchResults)
        
        // Small delay between batches to avoid rate limiting
        if (i + maxConcurrentQuestions < questions.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    } else {
      log(`Processing ${questions.length} questions sequentially`)
      for (let i = 0; i < questions.length; i++) {
        const result = await processQuestion(questions[i], i)
        questionResults.push(result)
      }
    }
    
    log(`All ${questions.length} questions assessed, generating summary...`)
    
    // Generate worksheet summary with Summary Agent
    const summaryResult = await generateWorksheetSummary(
      llmProvider, 
      questionResults, 
      worksheetMeta, 
      { gradeLevel, detailedLogging }
    )
    
    const totalTime = Date.now() - startTime
    log(`Multi-Agent Per-Question Assessment completed in ${totalTime}ms`)
    
    return {
      success: true,
      assessmentMode: 'multi-agent-per-question',
      
      // Summary from Summary Agent
      summary: summaryResult.summary || {
        totalScore: questionResults.reduce((sum, q) => sum + (q.totalScore || 0), 0),
        maxScore: questionResults.reduce((sum, q) => sum + (q.maxScore || 5), 0),
        percentage: 0,
        paLevel: 1,
        paLevelText: 'ระดับ 1: ต้องปรับปรุง',
        overallFeedback: '',
        recommendation: ''
      },
      
      // Aggregated ARCE scores
      arceScores: summaryResult.arceScores || calculateAggregatedArceScores(questionResults),
      
      // Per-question results with full agent details
      questionResults: questionResults,
      
      // Overall analysis
      strengths: summaryResult.strengths || [],
      weaknesses: summaryResult.weaknesses || [],
      nextSteps: summaryResult.nextSteps || [],
      teacherNotes: summaryResult.teacherNotes || '',
      
      // Statistics
      statistics: summaryResult.statistics || calculateStatistics(questionResults),
      arceAnalysis: summaryResult.arceAnalysis || {},
      bloomAnalysis: summaryResult.bloomAnalysis || {},
      researchInsights: summaryResult.researchInsights || {},
      
      // Metadata
      multiAgentMetadata: {
        processingTimeMs: totalTime,
        totalApiCalls: (6 * questions.length) + 1, // 6 agents per question + 1 summary
        questionsAssessed: questions.length,
        parallelExecution: parallelQuestions,
        agentsPerQuestion: includeAdversarial ? 6 : 5,
        logs: detailedLogging ? logs : undefined
      }
    }
    
  } catch (error) {
    log(`Error: ${error.message}`)
    console.error('❌ Multi-Agent Per-Question Assessment failed:', error)
    
    return {
      success: false,
      error: error.message,
      assessmentMode: 'multi-agent-per-question',
      logs,
      questionResults: questionResults // Return partial results if any
    }
  }
}

/**
 * 🔧 Build context string for a single question
 */
function buildQuestionContext(question, worksheetMeta) {
  const parts = []
  
  // Worksheet info
  if (worksheetMeta?.title) parts.push(`ใบงาน: ${worksheetMeta.title}`)
  if (worksheetMeta?.courseName) parts.push(`รายวิชา: ${worksheetMeta.courseName}`)
  if (worksheetMeta?.topic) parts.push(`หัวข้อ: ${worksheetMeta.topic}`)
  
  // Question info
  if (question.context || question.situation) {
    parts.push(`\nสถานการณ์: ${question.context || question.situation}`)
  }
  if (question.prompt || question.task) {
    parts.push(`\nคำถาม: ${question.prompt || question.task}`)
  }
  if (question.arceFocus) {
    const focus = Array.isArray(question.arceFocus) ? question.arceFocus.join(', ') : question.arceFocus
    parts.push(`\nA.R.C.E. Focus: ${focus}`)
  }
  
  // ARCE Situation expected answers
  if (question.expected || question.expectedArce) {
    const expected = question.expected || question.expectedArce
    parts.push(`\n\nเกณฑ์การประเมิน (Expected):`)
    if (expected.analysis) parts.push(`- Analysis: ${expected.analysis}`)
    if (expected.reasoning) parts.push(`- Reasoning: ${expected.reasoning}`)
    if (expected.creativity) parts.push(`- Creativity: ${expected.creativity}`)
    if (expected.evidence) parts.push(`- Evidence: ${expected.evidence}`)
  }
  
  return parts.join('\n')
}

/**
 * 📊 Generate Worksheet Summary with Summary Agent
 */
async function generateWorksheetSummary(llmProvider, questionResults, worksheetMeta, options = {}) {
  const { gradeLevel = 'ม.4', detailedLogging = false } = options
  
  // Calculate aggregated scores
  const totalScore = questionResults.reduce((sum, q) => sum + (q.totalScore || 0), 0)
  const maxScore = questionResults.reduce((sum, q) => sum + (q.maxScore || 5), 0)
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  
  const aggregatedArce = calculateAggregatedArceScores(questionResults)
  const statistics = calculateStatistics(questionResults)
  
  const summaryPrompt = `คุณเป็น Worksheet Summary Agent รวบรวมผลการประเมินใบงานจาก Multi-Agent Assessment

📚 ข้อมูลใบงาน:
- ชื่อใบงาน: ${worksheetMeta?.title || 'ใบงาน'}
- รายวิชา: ${worksheetMeta?.courseName || ''}
- หัวข้อ: ${worksheetMeta?.topic || ''}
- ระดับชั้น: ${gradeLevel}
- จำนวนข้อ: ${questionResults.length}

📊 ผลการประเมินรายข้อ:
${questionResults.map((q, i) => `
[ข้อ ${i + 1}] ${q.question?.substring(0, 100) || '...'}
- คะแนน: ${q.totalScore || 0}/${q.maxScore || 5} (${q.passed ? '✅ ผ่าน' : '❌ ไม่ผ่าน'})
- ARCE: A=${q.rubricScores?.analysis || 0} R=${q.rubricScores?.reasoning || 0} C=${q.rubricScores?.creativity || 0} E=${q.rubricScores?.evidence || 0}
- Confidence: ${q.confidence || 0}%
- Feedback: ${(q.feedback || '').substring(0, 150)}
`).join('\n---')}

📈 สรุปคะแนนรวม:
- คะแนนรวม: ${totalScore}/${maxScore} (${percentage}%)
- ARCE เฉลี่ย: A=${aggregatedArce.analysis.raw.toFixed(1)} R=${aggregatedArce.reasoning.raw.toFixed(1)} C=${aggregatedArce.creativity.raw.toFixed(1)} E=${aggregatedArce.evidence.raw.toFixed(1)}
- ข้อที่ผ่าน: ${statistics.passedQuestions}/${statistics.totalQuestions}

📝 สร้างสรุปผลการประเมินใบงานเป็น JSON (ห้าม markdown wrapper):
{
  "summary": {
    "totalScore": ${totalScore},
    "maxScore": ${maxScore},
    "percentage": ${percentage},
    "paLevel": ${percentage >= 80 ? 4 : percentage >= 60 ? 3 : percentage >= 40 ? 2 : 1},
    "paLevelText": "${percentage >= 80 ? 'ระดับ 4: ดีมาก' : percentage >= 60 ? 'ระดับ 3: ดี' : percentage >= 40 ? 'ระดับ 2: พอใช้' : 'ระดับ 1: ต้องปรับปรุง'}",
    "overallFeedback": "สรุปภาพรวมผลงาน 2-3 ประโยค อิงจากผลแต่ละข้อ",
    "recommendation": "ข้อเสนอแนะหลักสำหรับการพัฒนา"
  },
  "arceScores": {
    "analysis": { "raw": ${aggregatedArce.analysis.raw.toFixed(2)}, "max": 5, "percentage": ${aggregatedArce.analysis.percentage.toFixed(0)}, "feedback": "สรุป feedback ด้านการวิเคราะห์จากทุกข้อ" },
    "reasoning": { "raw": ${aggregatedArce.reasoning.raw.toFixed(2)}, "max": 5, "percentage": ${aggregatedArce.reasoning.percentage.toFixed(0)}, "feedback": "สรุป feedback ด้านการให้เหตุผลจากทุกข้อ" },
    "creativity": { "raw": ${aggregatedArce.creativity.raw.toFixed(2)}, "max": 5, "percentage": ${aggregatedArce.creativity.percentage.toFixed(0)}, "feedback": "สรุป feedback ด้านความคิดสร้างสรรค์จากทุกข้อ" },
    "evidence": { "raw": ${aggregatedArce.evidence.raw.toFixed(2)}, "max": 5, "percentage": ${aggregatedArce.evidence.percentage.toFixed(0)}, "feedback": "สรุป feedback ด้านการใช้หลักฐานจากทุกข้อ" }
  },
  "statistics": {
    "totalQuestions": ${statistics.totalQuestions},
    "passedQuestions": ${statistics.passedQuestions},
    "failedQuestions": ${statistics.failedQuestions},
    "passRate": ${statistics.passRate.toFixed(0)},
    "avgScorePerQuestion": ${statistics.avgScorePerQuestion.toFixed(2)},
    "avgConfidence": ${statistics.avgConfidence.toFixed(0)}
  },
  "arceAnalysis": {
    "strongestDimension": { "name": "analysis|reasoning|creativity|evidence", "score": 0, "insight": "" },
    "weakestDimension": { "name": "analysis|reasoning|creativity|evidence", "score": 0, "insight": "" },
    "dimensionComparison": "วิเคราะห์เปรียบเทียบทักษะ ARCE",
    "developmentPriority": ["ลำดับทักษะที่ควรพัฒนาก่อน"]
  },
  "bloomAnalysis": {
    "dominantLevel": 4,
    "insight": "วิเคราะห์ระดับการคิดของนักเรียน"
  },
  "strengths": ["จุดแข็ง 1 พร้อมหลักฐานจากคำตอบ", "จุดแข็ง 2"],
  "weaknesses": ["จุดที่ควรพัฒนา 1 พร้อมคำแนะนำ", "จุดที่ควรพัฒนา 2"],
  "nextSteps": ["ขั้นตอนถัดไป 1 ที่ทำได้ทันที", "ขั้นตอนถัดไป 2"],
  "teacherNotes": "บันทึกสำหรับครู - ข้อสังเกตและการช่วยเหลือที่แนะนำ",
  "researchInsights": {
    "learningPattern": "รูปแบบการเรียนรู้ที่สังเกตได้",
    "cognitiveStrengths": ["ด้านที่แข็งแกร่ง"],
    "areasForIntervention": ["ด้านที่ต้องการช่วยเหลือ"],
    "recommendedStrategies": ["กลยุทธ์การสอนที่แนะนำ"]
  }
}`

  try {
    const result = await llmProvider.complete(summaryPrompt, { temperature: 0.3 })
    return parseAgentResponse(result)
  } catch (error) {
    console.error('❌ Worksheet Summary Agent failed:', error)
    return {
      summary: {
        totalScore,
        maxScore,
        percentage,
        paLevel: percentage >= 80 ? 4 : percentage >= 60 ? 3 : percentage >= 40 ? 2 : 1,
        paLevelText: percentage >= 80 ? 'ระดับ 4: ดีมาก' : percentage >= 60 ? 'ระดับ 3: ดี' : percentage >= 40 ? 'ระดับ 2: พอใช้' : 'ระดับ 1: ต้องปรับปรุง',
        overallFeedback: 'ประเมินเสร็จสิ้น',
        recommendation: 'ฝึกฝนต่อไป'
      },
      arceScores: aggregatedArce,
      statistics
    }
  }
}

/**
 * 📊 Calculate aggregated ARCE scores from question results
 */
function calculateAggregatedArceScores(questionResults) {
  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  const result = {}
  
  for (const dim of dimensions) {
    const scores = questionResults
      .map(q => q.rubricScores?.[dim] || 0)
      .filter(s => s > 0)
    
    const avg = scores.length > 0 
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
      : 0
    
    result[dim] = {
      raw: avg,
      max: 5,
      percentage: (avg / 5) * 100,
      feedback: ''
    }
  }
  
  return result
}

/**
 * 📈 Calculate statistics from question results
 */
function calculateStatistics(questionResults) {
  const totalQuestions = questionResults.length
  const passedQuestions = questionResults.filter(q => q.passed).length
  const totalScore = questionResults.reduce((sum, q) => sum + (q.totalScore || 0), 0)
  const maxScore = questionResults.reduce((sum, q) => sum + (q.maxScore || 5), 0)
  const avgConfidence = totalQuestions > 0
    ? questionResults.reduce((sum, q) => sum + (q.confidence || 0), 0) / totalQuestions
    : 0
  
  return {
    totalQuestions,
    passedQuestions,
    failedQuestions: totalQuestions - passedQuestions,
    passRate: totalQuestions > 0 ? (passedQuestions / totalQuestions) * 100 : 0,
    avgScorePerQuestion: totalQuestions > 0 ? totalScore / totalQuestions : 0,
    totalScore,
    maxScore,
    avgConfidence
  }
}

/**
 * 📊 Get Scoring Anchors for Right to Explanation
 */
function getScoringAnchors(dimension, score) {
  if (!ANCHOR_SCORING_MATRIX[dimension]) {
    return null
  }
  return ANCHOR_SCORING_MATRIX[dimension][score] || null
}

/**
 * 📋 Get Logical Fallacies Reference
 */
function getLogicalFallacies() {
  return LOGICAL_FALLACIES
}

/**
 * ⚙️ Get Agent Configuration
 */
function getAgentConfig() {
  return AGENT_CONFIG
}

module.exports = {
  // Main functions
  runMultiAgentAssessment,
  runMultiAgentPerQuestion, // 🆕 Per-question Multi-Agent for worksheets
  
  // Individual agent prompts
  createAnalysisAgentPrompt,
  createReasoningAgentPrompt,
  createCreativityAgentPrompt,
  createEvidenceAgentPrompt,
  createAdversarialRefinerPrompt,
  createConsensusAggregatorPrompt,
  
  // Worksheet helpers
  generateWorksheetSummary,
  buildQuestionContext,
  calculateAggregatedArceScores,
  calculateStatistics,
  
  // Utilities
  parseAgentResponse,
  getScoringAnchors,
  getLogicalFallacies,
  getAgentConfig,
  
  // Constants
  AGENT_CONFIG,
  ANCHOR_SCORING_MATRIX,
  LOGICAL_FALLACIES
}
