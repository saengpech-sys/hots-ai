# 🎯 ระบบนิเวศความน่าเชื่อถือ — ฉบับภาษาไทย

<div align="center">

**เวอร์ชัน 1.0** | **อัปเดตล่าสุด: 22 ธันวาคม 2568**

*เอกสารอธิบายห่วงโซ่เหตุผลเชิงระบบ — ความเสถียรภาพ ความแม่นยำ ความน่าเชื่อถือ*

</div>

---

## 📑 สารบัญ

1. [ปรัชญาการออกแบบระบบ](#1-ปรัชญาการออกแบบระบบ)
2. [ชั้นที่ 1: การตรวจสอบข้อมูลนำเข้า](#2-ชั้นที่-1-การตรวจสอบข้อมูลนำเข้า)
3. [ชั้นที่ 2: ความคงทนของระบบ AI](#3-ชั้นที่-2-ความคงทนของระบบ-ai)
4. [ชั้นที่ 3: ความเที่ยงตรงระหว่างผู้ประเมิน](#4-ชั้นที่-3-ความเที่ยงตรงระหว่างผู้ประเมิน)
5. [ชั้นที่ 4: กรอบการศึกษาความตรง](#5-ชั้นที่-4-กรอบการศึกษาความตรง)
6. [ชั้นที่ 5: การตรวจสอบความเป็นธรรม](#6-ชั้นที่-5-การตรวจสอบความเป็นธรรม)
7. [ชั้นที่ 6: ความสอดคล้องของข้อมูล](#7-ชั้นที่-6-ความสอดคล้องของข้อมูล)
8. [ชั้นที่ 7: การตรวจสอบโดยมนุษย์](#8-ชั้นที่-7-การตรวจสอบโดยมนุษย์)
9. [ชั้นที่ 8: การปรับเทียบตามระดับชั้น](#9-ชั้นที่-8-การปรับเทียบตามระดับชั้น)
10. [ค่ามาตรฐานและเกณฑ์ตัดสิน](#10-ค่ามาตรฐานและเกณฑ์ตัดสิน)
11. [กระบวนการห่วงโซ่เหตุผล](#11-กระบวนการห่วงโซ่เหตุผล)

---

## 1. ปรัชญาการออกแบบระบบ

### 🎯 แนวคิดหลัก: ห่วงโซ่เหตุผล (Chain of Reasoning)

ระบบ HOTS AI ไม่ได้ออกแบบให้ AI ทำงานแบบ "กล่องดำ" (Black Box) แต่ใช้แนวคิด **ห่วงโซ่เหตุผล** ที่:

1. **ติดตามได้** — ทุกขั้นตอนมีบันทึก (Audit Trail)
2. **ตรวจสอบได้** — สามารถทวนสอบการตัดสินใจย้อนหลัง
3. **ปรับปรุงได้** — มี Feedback Loop กลับมาพัฒนาระบบ
4. **สำรองได้** — มีแผนสำรองเมื่อระบบล้มเหลว

```
┌─────────────────────────────────────────────────────────────────┐
│                    ห่วงโซ่ความน่าเชื่อถือ                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   นักเรียนตอบ → ตรวจสอบ → AI ประเมิน → ตรวจคุณภาพ → บันทึก      │
│       ↑              ↓           ↓            ↓          ↓       │
│       │         ป้องกัน     Retry      HITL      Transaction    │
│       │         Copy-Paste  Fallback   Review    Atomic         │
│       │              ↓           ↓            ↓          ↓       │
│       └──────────────────── Feedback Loop ───────────────────   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 🔑 หลักการออกแบบ 5 ประการ

| หลักการ | คำอธิบาย | การนำไปใช้ |
|---------|----------|------------|
| **ความเป็นเหตุเป็นผล** | ผลลัพธ์ทุกอย่างมีที่มาที่ไป | Chain of Thought ใน AI response |
| **ความสามารถติดตาม** | บันทึกทุกขั้นตอน | Audit trail ในทุก assessment |
| **การตอบกลับ** | ข้อมูลย้อนกลับปรับปรุงระบบ | Expert review → AI calibration |
| **ความซ้ำซ้อน** | มีทางสำรองเสมอ | Fallback assessment |
| **ความโปร่งใส** | เปิดเผยวิธีการ | Right to Explanation |

---

## 2. ชั้นที่ 1: การตรวจสอบข้อมูลนำเข้า

### 🧹 ปัญหาที่พบ

GPT-4o-mini มักจะ "ห่อ" คำตอบ JSON ด้วย markdown code blocks:

```
```json
{
  "feedback": "คำตอบดี...",
  "rubricScores": { "analysis": 4, ... }
}
```                           ← ปัญหา: JSON.parse() ไม่ได้!
```

### ✅ วิธีแก้: ล้าง Markdown ก่อน Parse

```javascript
// ไฟล์: functions/utils/aiParser.js

function cleanAIResponse(responseText) {
  let cleanedText = responseText.trim()
  
  // 1. ลบ markdown code blocks
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
    cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
  }
  
  // 2. หาขอบเขต JSON
  const jsonStart = cleanedText.indexOf('{')
  const jsonEnd = cleanedText.lastIndexOf('}')
  
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1)
  }
  
  return cleanedText
}
```

### 📋 การตรวจสอบ Schema

ระบบตรวจสอบว่า AI response มีโครงสร้างถูกต้อง:

```javascript
// ไฟล์: functions/utils/reliability.js

const ASSESSMENT_SCHEMA = {
  required: ['feedback', 'rubricScores'],  // ต้องมี
  rubricScores: {
    required: ['analysis', 'reasoning', 'creativity', 'evidence'],
    type: 'number',
    min: 0,
    max: 5
  },
  optional: ['suggestions', 'confidence', 'chainOfThought']  // มีก็ดี
}
```

### 🔍 ผลลัพธ์การตรวจสอบ

```javascript
{
  isValid: true,                    // ผ่านหรือไม่
  errors: [],                       // ข้อผิดพลาดร้ายแรง
  warnings: ['analysis แปลงจาก string เป็น number'],
  sanitized: {                      // ข้อมูลที่ล้างแล้ว
    feedback: '...',
    rubricScores: { analysis: 4, reasoning: 3, creativity: 4, evidence: 3 }
  }
}
```

---

## 3. ชั้นที่ 2: ความคงทนของระบบ AI

### 🔄 กลไกลองใหม่ (Retry Mechanism)

เมื่อ API call ล้มเหลว ระบบจะลองใหม่อัตโนมัติ:

```
ครั้งที่ 1  ──► เรียก OpenAI API
    │
    ▼ (ล้มเหลว)
รอ 1 วินาที (1000ms × 2^0)
    │
    ▼
ครั้งที่ 2  ──► เรียก OpenAI API
    │
    ▼ (ล้มเหลว)
รอ 2 วินาที (1000ms × 2^1)
    │
    ▼
ครั้งที่ 3  ──► เรียก OpenAI API
    │
    ▼ (ล้มเหลวอีก)
ใช้ Fallback Assessment
```

### ⚙️ การตั้งค่า Retry

```javascript
const RETRY_CONFIG = {
  maxRetries: 3,              // ลองสูงสุด 3 ครั้ง
  initialDelayMs: 1000,       // รอเริ่มต้น 1 วินาที
  maxDelayMs: 10000,          // รอสูงสุด 10 วินาที
  backoffMultiplier: 2,       // เพิ่มเวลารอ 2 เท่าทุกครั้ง
  retryableErrors: [          // Error ที่ลองใหม่ได้
    'ECONNRESET', 'ETIMEDOUT', 'rate_limit_exceeded',
    '429', '500', '502', '503', '504'
  ]
}
```

### 🆘 Fallback Assessment (ทางสำรอง)

เมื่อ AI ไม่สามารถประเมินได้ ระบบใช้การให้คะแนนอัตโนมัติแบบง่าย:

```javascript
function getFallbackAssessment(studentAnswer, reason) {
  // คำนวณคะแนนจากความยาว (เป็นทางเลือกสุดท้าย)
  const wordCount = studentAnswer.split(/\s+/).length
  
  let baseScore = 1                          // เริ่มต้น 1 คะแนน
  if (wordCount >= 20) baseScore += 0.5     // มีความยาวพอสมควร
  if (wordCount >= 50) baseScore += 0.5     // ยาวขึ้นอีก
  baseScore = Math.min(2.5, baseScore)      // จำกัดสูงสุด 2.5
  
  return {
    feedback: `⚠️ ระบบประเมินชั่วคราว - กรุณาลองใหม่`,
    rubricScores: {
      analysis: baseScore,
      reasoning: baseScore,
      creativity: baseScore,
      evidence: baseScore
    },
    isFallback: true,         // ระบุว่าเป็นทางสำรอง
    confidence: 0             // ความมั่นใจ = 0%
  }
}
```

### 📊 คะแนนความน่าเชื่อถือ (Reliability Score)

```javascript
function calculateReliabilityScore(assessment, parseResult, retryAttempts) {
  let score = 100
  
  // หักคะแนนตามปัญหาที่เจอ
  score -= (parseResult.errors?.length || 0) * 10      // มี error
  score -= (parseResult.warnings?.length || 0) * 2    // มี warning
  score -= (retryAttempts - 1) * 5                    // ต้อง retry
  score -= parseResult.usedFallback ? 30 : 0          // ใช้ fallback parsing
  score -= assessment?.isFallback ? 50 : 0            // ใช้ fallback assessment
  
  return Math.max(0, Math.min(100, score))
  // คะแนน 100 = ดีที่สุด, ต่ำกว่า 70 = ควรตรวจสอบ
}
```

---

## 4. ชั้นที่ 3: ความเที่ยงตรงระหว่างผู้ประเมิน

### 📊 Inter-Rater Reliability (IRR) คืออะไร?

IRR วัดว่า AI ให้คะแนน**สอดคล้อง**กับผู้เชี่ยวชาญมากแค่ไหน

```
ผู้เชี่ยวชาญให้:  4  3  5  2  4  3  4  5  2  3
AI ให้:         4  4  5  2  3  3  4  4  2  3
                ✓  ≈  ✓  ✓  ≈  ✓  ✓  ≈  ✓  ✓

✓ = ตรงกันเป๊ะ (Exact Agreement)
≈ = ต่างกัน 1 คะแนน (Adjacent Agreement)
```

### 📐 ตัวชี้วัดหลัก 6 ตัว

| ตัวชี้วัด | ความหมาย | สูตร | เป้าหมาย |
|-----------|----------|------|----------|
| **Cohen's Kappa (κ)** | ความสอดคล้องหักโอกาส | κ = (Po - Pe) / (1 - Pe) | ≥ 0.60 |
| **Weighted Kappa (κw)** | Kappa สำหรับ ordinal scale | คำนึงน้ำหนักความต่าง | ≥ 0.60 |
| **ICC** | สหสัมพันธ์ภายในชั้น | ANOVA-based | ≥ 0.70 |
| **Pearson r** | ความสัมพันธ์เชิงเส้น | Σ(x-x̄)(y-ȳ) / ... | ≥ 0.80 |
| **MAE** | ความคลาดเคลื่อนเฉลี่ย | Σ\|AI - Expert\| / n | ≤ 1.0 |
| **% Agreement** | ร้อยละตรงกัน | Exact matches / n | ≥ 80% |

### 📈 การตีความ Cohen's Kappa

| ค่า Kappa | การตีความ | ภาษาไทย |
|-----------|-----------|---------|
| < 0 | Poor | แย่กว่าสุ่ม |
| 0.00 - 0.20 | Slight | เล็กน้อย |
| 0.21 - 0.40 | Fair | พอใช้ |
| 0.41 - 0.60 | Moderate | ปานกลาง |
| **0.61 - 0.80** | **Substantial** | **ดี** (เป้าหมาย) |
| 0.81 - 1.00 | Almost Perfect | ดีเยี่ยม |

### 📈 การตีความ ICC

| ค่า ICC | การตีความ | ภาษาไทย |
|---------|-----------|---------|
| < 0.50 | Poor | ต่ำ |
| 0.50 - 0.74 | Moderate | ปานกลาง |
| **0.75 - 0.89** | **Good** | **ดี** (เป้าหมาย) |
| ≥ 0.90 | Excellent | ดีเยี่ยม |

### 🔍 การวิเคราะห์แบบครบถ้วน

```javascript
// ไฟล์: functions/utils/interRaterReliability.js

function comprehensiveIRRAnalysis(validations, dimension) {
  const aiScores = validations.map(v => v.aiScore)
  const expertScores = validations.map(v => v.expertScore)
  
  return {
    n: validations.length,
    
    // ตัวชี้วัดความสอดคล้อง
    cohensKappa: calculateCohensKappa(aiScores, expertScores),
    weightedKappa: calculateWeightedKappa(aiScores, expertScores),
    percentAgreement: calculatePercentAgreement(aiScores, expertScores),
    
    // ตัวชี้วัดความสัมพันธ์
    icc: calculateICC(ratingsForICC, '2,1'),
    pearsonR: calculatePearsonCorrelation(aiScores, expertScores),
    
    // ตัวชี้วัดความคลาดเคลื่อน
    mae: calculateMAE(aiScores, expertScores),
    
    // สรุป
    summary: {
      overallReliability: 'Good',
      meetsPublicationStandard: true,  // κ ≥ 0.60 && ICC ≥ 0.70
      recommendations: [...]
    }
  }
}
```

---

## 5. ชั้นที่ 4: กรอบการศึกษาความตรง

### 📚 ประเภทความตรง (Validity Types)

| ประเภท | ความหมาย | วิธีการวัด | เกณฑ์ |
|--------|----------|------------|-------|
| **Content Validity** | วัดสิ่งที่ควรวัดครบ | Expert Panel Review (CVR, CVI) | CVI ≥ 0.80 |
| **Construct Validity** | วัดโครงสร้างที่ตั้งใจ | Factor Analysis (CFA) | Factor loadings ≥ 0.40 |
| **Criterion Validity** | สอดคล้องกับเกณฑ์ภายนอก | Correlation with Experts | r ≥ 0.70 |
| **Reliability** | ความคงเส้นคงวาภายใน | Cronbach's Alpha | α ≥ 0.70 |

### 📐 Content Validity Ratio (CVR)

ผู้เชี่ยวชาญประเมินว่าข้อใดจำเป็น:

```javascript
function calculateCVR(essentialCount, totalExperts) {
  // สูตร Lawshe: CVR = (ne - N/2) / (N/2)
  // ne = จำนวนที่ตอบว่า "จำเป็น"
  // N = จำนวนผู้เชี่ยวชาญทั้งหมด
  
  const cvr = (essentialCount - (totalExperts / 2)) / (totalExperts / 2)
  
  return {
    cvr,
    isSignificant: cvr >= criticalValue,
    interpretation: cvr >= 0.99 ? 'จำเป็น' :
                    cvr >= 0.50 ? 'มีประโยชน์' :
                    cvr >= 0 ? 'พอใช้' : 'ไม่จำเป็น'
  }
}
```

### 📐 Cronbach's Alpha

วัดความสอดคล้องภายในของ 4 มิติ A.R.C.E.:

```javascript
function calculateCronbachsAlpha(itemScores) {
  // itemScores = [[A, R, C, E], [A, R, C, E], ...] สำหรับแต่ละคำตอบ
  
  const k = 4  // จำนวนมิติ (items)
  
  // 1. คำนวณ variance ของแต่ละมิติ
  const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0)
  
  // 2. คำนวณ variance ของคะแนนรวม
  const totalVariance = variance(totalScores)
  
  // 3. Cronbach's Alpha
  const alpha = (k / (k - 1)) * (1 - sumItemVariances / totalVariance)
  
  return {
    alpha,
    interpretation: alpha >= 0.9 ? 'ดีเยี่ยม' :
                    alpha >= 0.8 ? 'ดี' :
                    alpha >= 0.7 ? 'ยอมรับได้' :
                    alpha >= 0.6 ? 'น่าสงสัย' : 'ไม่ยอมรับ'
  }
}
```

---

## 6. ชั้นที่ 5: การตรวจสอบความเป็นธรรม

### ⚖️ Protected Attributes (คุณลักษณะที่ต้องปกป้อง)

ระบบตรวจสอบว่าการให้คะแนนไม่เบี่ยงเอียงตาม:

- เพศ (Gender)
- ประเภทโรงเรียน (รัฐ/เอกชน)
- ภูมิภาค
- ระดับชั้น
- สถานะทางเศรษฐกิจสังคม

### 📊 Effect Size (ขนาดผลกระทบ)

วัดว่าคะแนนต่างกันระหว่างกลุ่ม**มากน้อยแค่ไหน**:

```javascript
function calculateCohensD(group1, group2) {
  const mean1 = mean(group1)
  const mean2 = mean(group2)
  
  // Pooled standard deviation
  const pooledStd = Math.sqrt(
    ((n1 - 1) * std1² + (n2 - 1) * std2²) / (n1 + n2 - 2)
  )
  
  const d = (mean1 - mean2) / pooledStd
  
  return {
    d,
    interpretation: Math.abs(d) < 0.2 ? 'เล็กน้อยมาก (ไม่มีอคติ)' :
                    Math.abs(d) < 0.5 ? 'เล็กน้อย' :
                    Math.abs(d) < 0.8 ? 'ปานกลาง' : 'มาก (อาจมีอคติ)'
  }
}
```

### 🎯 เกณฑ์ความเป็นธรรม

| ตัวชี้วัด | เกณฑ์ | ความหมาย |
|-----------|-------|----------|
| Effect Size (d) | < 0.20 | ความแตกต่างระหว่างกลุ่มเล็กน้อยมาก |
| DIF | < 5% | ข้อสอบทำหน้าที่เหมือนกันทุกกลุ่ม |
| Min Group Size | ≥ 30 | ต้องมีตัวอย่างเพียงพอต่อกลุ่ม |

---

## 7. ชั้นที่ 6: ความสอดคล้องของข้อมูล

### 🔒 Transaction Pattern

บันทึก assessment และ update progress แบบ **Atomic** (ทำพร้อมกันหรือไม่ทำเลย):

```javascript
async function saveAssessmentWithTransaction(db, assessmentData, studentId, courseId, newPassedLOs) {
  
  await db.runTransaction(async (transaction) => {
    // 1. อ่านข้อมูล progress ปัจจุบัน
    const progressDoc = await transaction.get(progressRef)
    
    // 2. คำนวณ progress ใหม่
    const mergedLOs = [...existingLOs, ...newPassedLOs]
    
    // 3. เขียน assessment
    transaction.set(assessmentRef, assessmentData)
    
    // 4. อัพเดท progress
    transaction.update(progressRef, { passedLOs: mergedLOs })
  })
  
  // ถ้าล้มเหลว ทั้งสองอย่างจะไม่ถูกบันทึก (rollback)
}
```

### 🔄 การ Sync ข้อมูล

ตรวจสอบและซิงค์ข้อมูลจากหลายแหล่ง:

```javascript
async function syncStudentProgress(db, studentId, courseId) {
  // รวบรวม LO ที่ผ่านจาก:
  // 1. assessments collection (Chat)
  // 2. worksheetSubmissions collection (Worksheet)
  
  const allPassedLOs = new Set()
  
  assessmentsSnap.forEach(doc => {
    doc.data().loAssessment?.passedLOs?.forEach(lo => allPassedLOs.add(lo))
  })
  
  worksheetsSnap.forEach(doc => {
    doc.data().loAssessment?.passedLOs?.forEach(lo => allPassedLOs.add(lo))
  })
  
  // อัพเดท studentProgress ให้ตรงกับความจริง
  await progressRef.set({ passedLOs: Array.from(allPassedLOs) }, { merge: true })
}
```

### 🔍 การตรวจสอบความสอดคล้อง

```javascript
async function verifyDataConsistency(db, studentId, courseId) {
  // เปรียบเทียบ passedLOs ใน studentProgress
  // กับ passedLOs จริงในเอกสาร assessment + worksheet
  
  const issues = []
  
  if (missingInProgress.length > 0) {
    issues.push({
      type: 'MISSING_LOS',
      message: 'มี LO ที่ผ่านแต่ไม่ถูกบันทึกใน progress'
    })
  }
  
  if (extraInProgress.length > 0) {
    issues.push({
      type: 'EXTRA_LOS',
      message: 'มี LO ใน progress ที่ไม่พบในเอกสารจริง'
    })
  }
  
  return { consistent: issues.length === 0, issues }
}
```

---

## 8. ชั้นที่ 7: การตรวจสอบโดยมนุษย์

### 👥 Human-in-the-Loop (HITL)

ไม่ได้ปล่อยให้ AI ตัดสินใจทุกอย่าง — มีระบบส่งให้คนตรวจสอบเมื่อ:

| เหตุการณ์ | ความสำคัญ | ต้องตรวจภายใน |
|-----------|----------|--------------|
| AI ความมั่นใจต่ำ (< 70%) | สูง | 24 ชั่วโมง |
| คะแนนใกล้เกณฑ์ (±0.3) | ปานกลาง | 3 วัน |
| ตรวจพบ AI-generated | สูง | 24 ชั่วโมง |
| มิติต่างกันมาก (> 3) | ปานกลาง | 3 วัน |
| นักเรียนอุทธรณ์ | สูง | 24 ชั่วโมง |
| High-stakes | เร่งด่วน | 1 ชั่วโมง |
| Calibration sample (5%) | ต่ำ | 14 วัน |

### 🚨 การตรวจสอบอัตโนมัติ

```javascript
function shouldFlagForReview(assessment) {
  const flags = []
  
  // 1. AI ความมั่นใจต่ำ
  if (assessment.aiConfidence < 70) {
    flags.push({ reason: 'LOW_CONFIDENCE', priority: 'HIGH' })
  }
  
  // 2. คะแนนใกล้เกณฑ์ผ่าน (3)
  for (const [dim, score] of Object.entries(assessment.rubricScores)) {
    if (Math.abs(score - 3) <= 0.3) {
      flags.push({ reason: 'BORDERLINE_SCORE', dimension: dim })
    }
  }
  
  // 3. มิติคะแนนต่างกันมาก
  const scores = Object.values(assessment.rubricScores)
  if (Math.max(...scores) - Math.min(...scores) > 3) {
    flags.push({ reason: 'DIMENSION_MISMATCH', priority: 'MEDIUM' })
  }
  
  // 4. Random sampling 5%
  if (Math.random() < 0.05) {
    flags.push({ reason: 'CALIBRATION_SAMPLE' })
  }
  
  return { needsReview: flags.length > 0, flags }
}
```

### 📝 ผลการตรวจสอบโดยผู้เชี่ยวชาญ

```javascript
function createExpertReview(originalAssessment, expertScores, expertId) {
  // เปรียบเทียบคะแนน AI กับผู้เชี่ยวชาญ
  const differences = {}
  
  for (const dim of ['analysis', 'reasoning', 'creativity', 'evidence']) {
    differences[dim] = {
      ai: originalAssessment.rubricScores[dim],
      expert: expertScores[dim],
      difference: expertScores[dim] - originalAssessment.rubricScores[dim]
    }
  }
  
  return {
    agreement: {
      averageAbsoluteDifference,
      agreementLevel: avgDiff <= 0.5 ? 'สูง' :
                      avgDiff <= 1.0 ? 'ปานกลาง' : 'ต่ำ'
    },
    decision: 'confirm' | 'override' | 'partial_override',
    finalScores: expertScores  // หรือ AI scores ถ้า confirm
  }
}
```

---

## 9. ชั้นที่ 8: การปรับเทียบตามระดับชั้น

### 🎓 ทฤษฎีพัฒนาการทางปัญญา

อิงตาม Piaget และ Case:

| ขั้นพัฒนาการ | ระดับชั้น | A.R.C.E. คาดหวัง |
|--------------|-----------|-----------------|
| Preoperational | ป.1-2 | สูงสุด 2, ทั่วไป 1 |
| Concrete | ป.3-5 | สูงสุด 3, ทั่วไป 2 |
| Concrete Late | ป.6 | สูงสุด 4, ทั่วไป 3 |
| Transition | ม.1 | สูงสุด 4, ทั่วไป 3 |
| Formal Early | ม.2-3 | สูงสุด 5, ทั่วไป 4 |
| Formal | ม.4-5 | สูงสุด 5, ทั่วไป 4 |
| Formal Mature | ม.6 | สูงสุด 5, ทั่วไป 5 |

### 📝 ตัวอย่าง Anchor ตามระดับ

**ระดับ ป.4-6:**
> **Analysis 5:** "แยกเรื่องออกเป็น 2-3 ส่วนหลักได้ชัดเจน และอธิบายความเกี่ยวข้องกันได้"

**ระดับ ม.1-3:**
> **Analysis 5:** "แยกแยะองค์ประกอบได้ครบ เห็นโครงสร้างและความสัมพันธ์เชิงเหตุ-ผล"

**ระดับ ม.4-6:**
> **Analysis 5:** "แยกแยะประเด็นซับซ้อน เห็นความสัมพันธ์หลายระดับ เชื่อมโยงข้ามศาสตร์ได้"

---

## 10. ค่ามาตรฐานและเกณฑ์ตัดสิน

### 📊 เกณฑ์สำหรับงานวิจัย

| ตัวชี้วัด | ขั้นต่ำ | เป้าหมาย | ดีเยี่ยม |
|-----------|--------|----------|----------|
| **Weighted Kappa** | ≥ 0.60 | ≥ 0.70 | ≥ 0.80 |
| **ICC (2,1)** | ≥ 0.70 | ≥ 0.80 | ≥ 0.90 |
| **Pearson r** | ≥ 0.70 | ≥ 0.80 | ≥ 0.90 |
| **MAE** | ≤ 1.0 | ≤ 0.75 | ≤ 0.50 |
| **Percent Agreement** | ≥ 70% | ≥ 80% | ≥ 90% |
| **Adjacent Agreement** | ≥ 85% | ≥ 90% | ≥ 95% |
| **Cronbach's Alpha** | ≥ 0.70 | ≥ 0.80 | ≥ 0.90 |
| **CVI** | ≥ 0.80 | ≥ 0.90 | ≥ 0.95 |
| **Effect Size** | ≤ 0.20 | ≤ 0.10 | ≤ 0.05 |
| **Sample Size** | ≥ 30 | ≥ 100 | ≥ 200 |

### ✅ เกณฑ์พร้อมตีพิมพ์

```javascript
function meetsPublicationStandard(kappa, icc) {
  // ตีพิมพ์ได้ถ้า:
  // Weighted Kappa ≥ 0.60 (Substantial agreement)
  // AND ICC ≥ 0.70 (Good reliability)
  return kappa >= 0.60 && icc >= 0.70
}
```

---

## 11. กระบวนการห่วงโซ่เหตุผล

### 🔗 กระบวนการประเมินครบวงจร

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      กระบวนการห่วงโซ่เหตุผลครบวงจร                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. นักเรียนส่งคำตอบ                                                         │
│      │                                                                       │
│      ├─► ตรวจ Copy-Paste                                                     │
│      ├─► ตรวจความยาวขั้นต่ำ (≥ 20 ตัวอักษร)                                   │
│      └─► แสดง Dialog ยืนยัน                                                  │
│                                                                              │
│   2. AI ประเมิน                                                               │
│      │                                                                       │
│      ├─► สร้าง Prompt (รวม Grade-level anchors)                              │
│      ├─► เรียก API (พร้อม retry 3 ครั้ง)                                     │
│      ├─► ล้าง Markdown wrappers                                              │
│      └─► ตรวจสอบ Schema                                                      │
│                                                                              │
│   3. ควบคุมคุณภาพ                                                             │
│      │                                                                       │
│      ├─► ตรวจ HITL flags                                                     │
│      │   ├── ความมั่นใจต่ำ?                                                   │
│      │   ├── Borderline?                                                     │
│      │   └── Calibration sample?                                             │
│      │                                                                       │
│      └─► ตรวจ Fairness (scheduled)                                           │
│                                                                              │
│   4. บันทึกข้อมูล                                                             │
│      │                                                                       │
│      ├─► Transaction (Atomic)                                                │
│      │   ├── บันทึก assessment                                               │
│      │   └── อัพเดท studentProgress                                          │
│      │                                                                       │
│      └─► บันทึก Audit Trail                                                  │
│          ├── Model version                                                   │
│          ├── Prompt version                                                  │
│          └── Reliability score                                               │
│                                                                              │
│   5. Research Pipeline                                                       │
│      │                                                                       │
│      ├─► คำนวณ IRR (รายสัปดาห์)                                               │
│      ├─► รวบรวม Validation data                                              │
│      └─► Export (anonymized, K-anonymity)                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📚 อ้างอิง

### วิธีการทางสถิติ
- Cohen, J. (1960). A coefficient of agreement for nominal scales
- Shrout, P. E., & Fleiss, J. L. (1979). Intraclass correlations
- Cronbach, L. J. (1951). Coefficient alpha

### ทฤษฎีความตรง
- Messick, S. (1989). Validity
- Lawshe, C. H. (1975). Content Validity Ratio

### พัฒนาการทางปัญญา
- Piaget, J. (1952). The Origins of Intelligence in Children
- Case, R. (1985). Intellectual Development

---

## 📁 ไฟล์อ้างอิง

| ไฟล์ | วัตถุประสงค์ |
|------|-------------|
| `aiParser.js` | ล้างและ parse AI response |
| `reliability.js` | Schema validation, retry mechanism |
| `interRaterReliability.js` | คำนวณ IRR metrics |
| `validationStudy.js` | คำนวณ validity metrics |
| `fairnessAudit.js` | ตรวจสอบความเป็นธรรม |
| `dataConsistency.js` | Transaction, sync data |
| `humanInTheLoop.js` | Review queue system |
| `gradeLevelCalibration.js` | Grade-level anchors |

---

**อัปเดตล่าสุด:** 22 ธันวาคม 2568  
**เวอร์ชัน:** 1.0  
**ผู้ดูแล:** ทีมพัฒนา HOTS AI
