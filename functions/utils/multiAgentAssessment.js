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

const { sanitizeStudentInput } = require('./prompts')

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
 * 📊 Anchor Scoring Matrix with Evidence Requirements
 */
const ANCHOR_SCORING_MATRIX = {
  analysis: {
    5: {
      description: 'แยกประเด็น/องค์ประกอบสำคัญครบ โครงสร้างชัด เชื่อมความสัมพันธ์สาเหตุ-ผลอย่างเป็นระบบ',
      requiredEvidence: ['แยกประเด็นหลัก ≥3 ข้อ', 'แสดงโครงสร้างความสัมพันธ์', 'เชื่อมเหตุ-ผลชัดเจน'],
      cognitiveIndicators: ['differentiating', 'organizing', 'attributing']
    },
    4: {
      description: 'แยกประเด็นหลักชัด มีโครงสร้างและความเชื่อมโยงส่วนใหญ่ถูกต้อง',
      requiredEvidence: ['แยกประเด็นหลัก ≥2 ข้อ', 'มีโครงสร้างบางส่วน'],
      cognitiveIndicators: ['differentiating', 'organizing']
    },
    3: {
      description: 'แยกบางส่วนได้ เห็นโครงร่างการวิเคราะห์ แต่ขาดบางประเด็นสำคัญ',
      requiredEvidence: ['ระบุประเด็นได้บ้าง', 'มีแนวโน้มการจัดกลุ่ม'],
      cognitiveIndicators: ['differentiating']
    },
    2: {
      description: 'วิเคราะห์ตื้น อธิบายแบบเล่าเรื่องมากกว่าแยกส่วน',
      requiredEvidence: ['อธิบายทั่วไป', 'ไม่มีการจำแนก'],
      cognitiveIndicators: []
    },
    1: {
      description: 'ระบุข้อเท็จจริงกระจัดกระจาย ไร้โครงสร้าง',
      requiredEvidence: ['ข้อมูลกระจัดกระจาย'],
      cognitiveIndicators: []
    },
    0: {
      description: 'ไม่วิเคราะห์/นอกเรื่อง',
      requiredEvidence: ['ไม่มีการวิเคราะห์'],
      cognitiveIndicators: []
    }
  },
  reasoning: {
    5: {
      description: 'เหตุผลเป็นลำดับ มีตรรกะ/การอนุมานถูกต้อง สรุปสอดคล้องกับเหตุผล ไม่มี Fallacy',
      requiredEvidence: ['ลำดับเหตุผลชัด ≥3 ขั้น', 'การอนุมานถูกต้อง', 'ไม่มี Logical Fallacy'],
      cognitiveIndicators: ['checking', 'critiquing', 'inferring']
    },
    4: {
      description: 'ลำดับคิดดี มีการอนุมานส่วนใหญ่ถูกต้อง มีจุดสะดุดเล็กน้อย',
      requiredEvidence: ['ลำดับเหตุผลชัด ≥2 ขั้น', 'อนุมานส่วนใหญ่ถูก'],
      cognitiveIndicators: ['checking', 'inferring']
    },
    3: {
      description: 'มีเหตุผลพื้นฐาน แต่ยังมีช่องโหว่/สรุปก้าวกระโดดบางช่วง',
      requiredEvidence: ['มีเหตุผลบางส่วน', 'มีช่องโหว่ตรรกะ 1-2 จุด'],
      cognitiveIndicators: ['inferring']
    },
    2: {
      description: 'เหตุผลคลุมเครือ พิงความเชื่อมากกว่าตรรกะ',
      requiredEvidence: ['อ้างความเชื่อ/ความรู้สึก', 'ขาดหลักตรรกะ'],
      cognitiveIndicators: []
    },
    1: {
      description: 'ตรรกะผิดพลาดบ่อย มี Fallacy ชัดเจน สรุปไม่ตามเหตุผล',
      requiredEvidence: ['พบ Logical Fallacy', 'สรุปไม่สัมพันธ์'],
      cognitiveIndicators: []
    },
    0: {
      description: 'ไม่มีเหตุผลที่ตรวจสอบได้',
      requiredEvidence: ['ไม่มีการให้เหตุผล'],
      cognitiveIndicators: []
    }
  },
  creativity: {
    5: {
      description: 'เสนอกรอบคิด/วิธีมองใหม่ ชี้มุมไม่ชัดเจนเดิม มีตัวอย่างสร้างสรรค์ที่เกี่ยวข้อง',
      requiredEvidence: ['ไอเดียใหม่ที่ไม่ซ้ำ', 'มุมมองไม่เคยเห็น', 'ตัวอย่างสร้างสรรค์'],
      cognitiveIndicators: ['generating', 'planning', 'producing']
    },
    4: {
      description: 'มีมุมใหม่ชัดเจนอย่างน้อยหนึ่งจุด',
      requiredEvidence: ['มุมมองใหม่ ≥1 จุด', 'ประยุกต์ความรู้'],
      cognitiveIndicators: ['generating', 'planning']
    },
    3: {
      description: 'ปรับ/ต่อยอดไอเดียเดิมได้บ้าง',
      requiredEvidence: ['ต่อยอดจากเดิม', 'ปรับประยุกต์'],
      cognitiveIndicators: ['generating']
    },
    2: {
      description: 'ความคิดทั่วไป ซ้ำแพทเทิร์นคุ้นเคย',
      requiredEvidence: ['ความคิดทั่วไป', 'ไม่มีสิ่งใหม่'],
      cognitiveIndicators: []
    },
    1: {
      description: 'ทวนซ้ำความรู้เดิม ไร้มุมเพิ่ม',
      requiredEvidence: ['ทวนซ้ำ', 'คัดลอก'],
      cognitiveIndicators: []
    },
    0: {
      description: 'ไม่แสดงความคิดริเริ่ม',
      requiredEvidence: ['ไม่มีความคิดริเริ่ม'],
      cognitiveIndicators: []
    }
  },
  evidence: {
    5: {
      description: 'ยกหลักฐาน/ตัวอย่างเฉพาะเจาะจง ตรงประเด็น อธิบายความเชื่อมโยงกับข้อสรุปชัด',
      requiredEvidence: ['ตัวอย่างเฉพาะเจาะจง ≥2', 'อธิบายความเชื่อมโยง', 'แหล่งที่มาชัด'],
      cognitiveIndicators: ['implementing', 'executing']
    },
    4: {
      description: 'มีหลักฐานที่เกี่ยวข้องและอธิบายความเชื่อมโยงพอควร',
      requiredEvidence: ['ตัวอย่าง ≥1 เฉพาะเจาะจง', 'เชื่อมโยงบางส่วน'],
      cognitiveIndicators: ['implementing']
    },
    3: {
      description: 'มีตัวอย่างแต่ยังทั่วไป/เชื่อมโยงหลวม',
      requiredEvidence: ['ตัวอย่างทั่วไป', 'เชื่อมโยงหลวม'],
      cognitiveIndicators: []
    },
    2: {
      description: 'อ้างกว้างๆ ไม่ชัดเจนหรือไม่สัมพันธ์กับข้อสรุป',
      requiredEvidence: ['อ้างกว้างๆ', 'ไม่มีรายละเอียด'],
      cognitiveIndicators: []
    },
    1: {
      description: 'กล่าวอ้างลอยๆ ไร้ตัวอย่างตรวจสอบได้',
      requiredEvidence: ['กล่าวอ้างลอยๆ'],
      cognitiveIndicators: []
    },
    0: {
      description: 'ไม่มีหลักฐาน',
      requiredEvidence: ['ไม่มีหลักฐาน'],
      cognitiveIndicators: []
    }
  }
}

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
      ...(includeAdversarial ? { adversarial: refinedResults.adversarial } : {})
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
  // Main function
  runMultiAgentAssessment,
  
  // Individual agent prompts
  createAnalysisAgentPrompt,
  createReasoningAgentPrompt,
  createCreativityAgentPrompt,
  createEvidenceAgentPrompt,
  createAdversarialRefinerPrompt,
  createConsensusAggregatorPrompt,
  
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
