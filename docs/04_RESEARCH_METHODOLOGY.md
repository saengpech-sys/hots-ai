# 📚 HOTS AI ChatLoop v5.2 — Academic Documentation Suite

<div align="center">

# บทที่ 4: ระเบียบวิธีวิจัย
## Research Methodology

**การประเมินความเที่ยงตรง Inter-Rater Reliability และ Golden Dataset**

---

**เอกสารฉบับ:** Academic Documentation Suite  
**ปรับปรุงล่าสุด:** มกราคม 2569 (January 2026)

</div>

---

## สารบัญ (Table of Contents)

1. [กรอบการวิจัย (Research Framework)](#1-กรอบการวิจัย-research-framework)
2. [Golden Dataset สำหรับ IRR Testing](#2-golden-dataset-สำหรับ-irr-testing)
3. [วิธีการคำนวณ Inter-Rater Reliability](#3-วิธีการคำนวณ-inter-rater-reliability)
4. [Research Data Pipeline](#4-research-data-pipeline)
5. [การคุ้มครองข้อมูลส่วนบุคคล (Privacy Protection)](#5-การคุ้มครองข้อมูลส่วนบุคคล-privacy-protection)
6. [การวิเคราะห์ทางสถิติ (Statistical Analysis)](#6-การวิเคราะห์ทางสถิติ-statistical-analysis)
7. [โปรโตคอลการ Calibration](#7-โปรโตคอลการ-calibration)

---

## 1. กรอบการวิจัย (Research Framework)

### 1.1 วัตถุประสงค์การวิจัย

การวิจัยในระบบ HOTS AI ChatLoop มุ่งตอบคำถามวิจัยหลัก 4 ข้อ:

| ลำดับ | คำถามวิจัย | วิธีการวิจัย | เกณฑ์ความสำเร็จ |
|------|-----------|-------------|----------------|
| **RQ1** | AI ให้คะแนนสอดคล้องกับผู้เชี่ยวชาญหรือไม่? | IRR Analysis | κ ≥ 0.60, ICC ≥ 0.70 |
| **RQ2** | A.R.C.E. Framework วัดทักษะ HOTS ได้จริงหรือไม่? | Construct Validity | Factor Analysis สนับสนุน 4-factor model |
| **RQ3** | ระบบ Scaffolding ช่วยพัฒนาผู้เรียนหรือไม่? | Pre-Post Design | Effect Size d ≥ 0.4 |
| **RQ4** | การประเมินมีความเป็นธรรมต่อทุกกลุ่มหรือไม่? | DIF Analysis | Effect Size < 0.2 |

### 1.2 กรอบแนวคิดการวิจัย

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      RESEARCH METHODOLOGY FRAMEWORK                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           RESEARCH DESIGN                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                                                                      │  │
│   │   Phase 1: Development                                              │  │
│   │   ├── A.R.C.E. Framework construction                               │  │
│   │   ├── Golden Dataset creation (20 items)                            │  │
│   │   └── Expert validation (3 experts)                                 │  │
│   │                                                                      │  │
│   │   Phase 2: Calibration                                              │  │
│   │   ├── Expert scoring (independent)                                  │  │
│   │   ├── AI scoring (deterministic)                                    │  │
│   │   └── IRR calculation (κ, ICC, MAE)                                 │  │
│   │                                                                      │  │
│   │   Phase 3: Validation                                               │  │
│   │   ├── Construct validity (Factor Analysis)                          │  │
│   │   ├── Criterion validity (correlation with grades)                  │  │
│   │   └── Fairness audit (DIF analysis)                                 │  │
│   │                                                                      │  │
│   │   Phase 4: Effectiveness Study                                      │  │
│   │   ├── Pre-test / Post-test design                                   │  │
│   │   ├── Control group (traditional assessment)                        │  │
│   │   └── Effect size calculation                                       │  │
│   │                                                                      │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 ประชากรและกลุ่มตัวอย่าง

| ระดับ | ประชากร | วิธีการสุ่ม | ขนาดตัวอย่าง |
|------|--------|-----------|-------------|
| **ม.1-3** | นักเรียนมัธยมต้น ทั่วประเทศ | Stratified Random | n ≥ 100 ต่อระดับ |
| **ม.4-6** | นักเรียนมัธยมปลาย ทั่วประเทศ | Stratified Random | n ≥ 100 ต่อระดับ |
| **ผู้เชี่ยวชาญ** | ครู/อาจารย์ที่มีประสบการณ์ ≥ 5 ปี | Purposive | n = 3-5 คน |

---

## 2. Golden Dataset สำหรับ IRR Testing

### 2.1 วัตถุประสงค์และวิธีการคัดเลือก

**วัตถุประสงค์:**
1. **Calibration** — ปรับเทียบการให้คะแนนระหว่าง AI และผู้เชี่ยวชาญ
2. **IRR Testing** — วัดความน่าเชื่อถือระหว่างผู้ประเมิน
3. **Quality Assurance** — ตรวจสอบคุณภาพ AI อย่างต่อเนื่อง
4. **Training** — ฝึกครูใหม่ในการประเมินตาม A.R.C.E.

**เกณฑ์การคัดเลือก:**

| เกณฑ์ | การกระจาย | จำนวน |
|-------|-----------|-------|
| **Score Range** | Low (0-6), Mid (7-13), High (14-20) | 6, 8, 6 |
| **Grade Level** | ป.4-6, ม.1-3, ม.4-6 | 6, 7, 7 |
| **Subject** | วิทย์, คณิต, ภาษาไทย, สังคม | 5, 5, 5, 5 |
| **Answer Length** | Short (<50), Medium (50-150), Long (>150) | 5, 10, 5 |
| **Quality Type** | Strong all, Weak all, Mixed | 5, 5, 10 |

### 2.2 ตัวอย่าง Golden Dataset Items

#### Item 1 — High Quality (Expected: 17-20)

> **Grade Level:** ม.5 | **Subject:** วิทยาศาสตร์ | **Topic:** การเปลี่ยนแปลงสภาพภูมิอากาศ

**คำถาม:**
> วิเคราะห์ผลกระทบของการเปลี่ยนแปลงสภาพภูมิอากาศต่อระบบนิเวศในประเทศไทย และเสนอแนวทางแก้ไขที่เป็นไปได้ในระดับท้องถิ่น

**คำตอบนักเรียน:**
> การเปลี่ยนแปลงสภาพภูมิอากาศส่งผลกระทบต่อระบบนิเวศไทยหลายด้าน ประการแรก อุณหภูมิที่สูงขึ้นทำให้ปะการังฟอกขาวในอ่าวไทยและอันดามัน จากข้อมูลกรมทรัพยากรทางทะเลฯ ปี 2567 พบปะการังฟอกขาวกว่า 30% ประการที่สอง ฤดูกาลเปลี่ยนแปลง ฝนตกหนักในบางพื้นที่แต่แล้งในบางพื้นที่ ส่งผลต่อวงจรชีวิตสัตว์ป่า เช่น นกอพยพมาถึงช้าลง
>
> สำหรับแนวทางแก้ไขในระดับท้องถิ่น ผมเสนอ 3 แนวทาง: (1) ปลูกป่าชายเลนเพื่อดูดซับคาร์บอนและป้องกันชายฝั่ง ซึ่งงานวิจัยของ IPCC ระบุว่าป่าชายเลนดูดซับคาร์บอนได้ 4 เท่าของป่าบก (2) ส่งเสริมเกษตรอินทรีย์เพื่อลดการปล่อยไนตรัสออกไซด์จากปุ๋ยเคมี (3) ใช้พลังงานหมุนเวียนในชุมชน เช่น โซลาร์เซลล์ที่มีราคาถูกลงมาก
>
> อย่างไรก็ตาม อุปสรรคคือต้นทุนเริ่มต้นสูงและประชาชนยังขาดความรู้ ดังนั้นต้องมีการให้ความรู้และสนับสนุนเงินทุนจากภาครัฐ

**Expert Scoring:**

| Dimension | Expected Score | เหตุผล |
|-----------|----------------|--------|
| Analysis | 5 | แยกแยะผลกระทบ 2 ด้าน, ชี้ความสัมพันธ์ที่ซับซ้อน |
| Reasoning | 4 | เหตุผลชัดเจน, ตรรกะดี, มีข้อโต้แย้ง (อุปสรรค) |
| Creativity | 4 | เสนอ 3 แนวทางที่เป็นรูปธรรม, มุมมองหลากหลาย |
| Evidence | 5 | อ้าง IPCC, กรมทรัพยากรฯ, ตัวอย่างเฉพาะเจาะจง |
| **Total** | **18** | |

#### Item 2 — Medium Quality (Expected: 10-13)

> **Grade Level:** ม.2 | **Subject:** สังคมศึกษา | **Topic:** ประชาธิปไตย

**คำถาม:**
> อธิบายความสำคัญของการเลือกตั้งในระบอบประชาธิปไตย และวิเคราะห์ปัญหาที่ทำให้คนรุ่นใหม่ไม่สนใจการเลือกตั้ง

**คำตอบนักเรียน:**
> การเลือกตั้งสำคัญเพราะเป็นวิธีที่ประชาชนมีส่วนร่วมในการปกครองประเทศ ถ้าไม่มีการเลือกตั้ง ผู้นำก็จะเป็นใครก็ได้โดยประชาชนไม่ได้เลือก
>
> ปัญหาที่คนรุ่นใหม่ไม่สนใจเลือกตั้งคือ พวกเขาคิดว่าเสียงของตนไม่สำคัญ และนักการเมืองไม่ได้ทำตามสัญญา ก็เลยรู้สึกเบื่อหน่าย นอกจากนี้คนรุ่นใหม่ก็ยุ่งกับโซเชียลมีเดียมากกว่าสนใจการเมือง

**Expert Scoring:**

| Dimension | Expected Score | เหตุผล |
|-----------|----------------|--------|
| Analysis | 3 | ระบุปัญหา 2-3 ประเด็น, ความสัมพันธ์พื้นฐาน |
| Reasoning | 3 | มีเหตุผลแต่ไม่ลึกซึ้ง, ตรรกะเรียบง่าย |
| Creativity | 2 | ความคิดทั่วไป, ไม่มีมุมมองใหม่ |
| Evidence | 2 | ไม่มีการอ้างอิงข้อมูลเชิงประจักษ์ |
| **Total** | **10** | |

#### Item 3 — Low Quality (Expected: 3-6)

> **Grade Level:** ป.6 | **Subject:** ภาษาไทย | **Topic:** วรรณกรรม

**คำถาม:**
> วิเคราะห์ตัวละครในเรื่อง "ขุนช้างขุนแผน" และอธิบายว่าตัวละครใดเป็นตัวอย่างที่ดีหรือไม่ดี เพราะอะไร

**คำตอบนักเรียน:**
> ขุนแผนเป็นตัวอย่างที่ดีเพราะเขารักนางวันทอง ส่วนขุนช้างไม่ดีเพราะเขาหน้าตาไม่ดี ผมชอบขุนแผนมากกว่า

**Expert Scoring:**

| Dimension | Expected Score | เหตุผล |
|-----------|----------------|--------|
| Analysis | 1 | พยายามแยกแยะแต่ไม่ครบ, ขาดลึกซึ้ง |
| Reasoning | 1 | เหตุผลผิวเผิน (หน้าตา), ไม่สมเหตุสมผล |
| Creativity | 1 | ไม่มีความคิดของตนเอง |
| Evidence | 1 | ไม่มีหลักฐานจากวรรณกรรม |
| **Total** | **4** | |

### 2.3 สรุปตาราง Golden Dataset ทั้ง 20 Items

| Item | Grade | Subject | Expected Total | Quality Type |
|------|-------|---------|----------------|--------------|
| 1 | ม.5 | วิทย์ | 17-20 | High |
| 2 | ม.2 | สังคม | 10-13 | Medium |
| 3 | ป.6 | ภาษาไทย | 3-6 | Low |
| 4 | ม.4 | คณิต | 15-17 | High |
| 5 | ม.1 | วิทย์ | 8-10 | Medium |
| 6 | ป.5 | สังคม | 5-7 | Low |
| 7 | ม.6 | ภาษาไทย | 18-20 | High |
| 8 | ม.3 | คณิต | 12-14 | Medium |
| 9 | ป.4 | วิทย์ | 3-5 | Low |
| 10 | ม.2 | สังคม | 11-13 | Medium |
| 11 | ม.5 | ภาษาไทย | 14-16 | High-Medium |
| 12 | ป.6 | คณิต | 6-8 | Low-Medium |
| 13 | ม.1 | วิทย์ | 9-11 | Medium |
| 14 | ม.4 | สังคม | 16-18 | High |
| 15 | ป.5 | ภาษาไทย | 4-6 | Low |
| 16 | ม.3 | คณิต | 13-15 | Medium-High |
| 17 | ม.6 | วิทย์ | 17-19 | High |
| 18 | ป.4 | สังคม | 2-4 | Low |
| 19 | ม.2 | ภาษาไทย | 10-12 | Medium |
| 20 | ม.5 | คณิต | 15-17 | High |

---

## 3. วิธีการคำนวณ Inter-Rater Reliability

### 3.1 IRR Testing Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        IRR TESTING WORKFLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Step 1: Expert Scoring                                                 │
│  ├── 2-3 experts score each item independently                         │
│  ├── No discussion before scoring                                      │
│  └── Use anchor descriptions strictly                                  │
│                                                                         │
│  Step 2: AI Scoring                                                     │
│  ├── Same items scored by AI system                                    │
│  ├── temperature: 0, seed: 42 (deterministic)                          │
│  └── Record chainOfThought for analysis                                │
│                                                                         │
│  Step 3: IRR Calculation                                                │
│  ├── Cohen's Kappa (for 2 raters)                                      │
│  ├── Fleiss' Kappa (for 3+ raters)                                     │
│  ├── Weighted Kappa (for ordinal scale)                                │
│  ├── ICC (for continuous scores)                                       │
│  └── Percent Agreement (simple + adjacent)                             │
│                                                                         │
│  Step 4: Discrepancy Analysis                                           │
│  ├── Identify items with >1 point difference                           │
│  ├── Discuss and reach consensus                                       │
│  └── Update anchors if needed                                          │
│                                                                         │
│  Step 5: Reporting                                                      │
│  ├── κ ≥ 0.61 — Substantial agreement (acceptable)                     │
│  ├── κ ≥ 0.81 — Almost perfect (excellent)                             │
│  └── κ < 0.61 — Needs calibration                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 สูตรการคำนวณ

#### 3.2.1 Cohen's Kappa (สำหรับ 2 ผู้ประเมิน)

$$
\kappa = \frac{P_o - P_e}{1 - P_e}
$$

โดยที่:
- $P_o$ = Observed agreement (ความสอดคล้องที่สังเกตได้)
- $P_e$ = Expected agreement by chance (ความสอดคล้องที่คาดว่าเกิดจากโอกาส)

```javascript
function calculateCohensKappa(rater1Scores, rater2Scores, maxScore = 5) {
  const n = rater1Scores.length;
  const categories = Array.from({ length: maxScore + 1 }, (_, i) => i);
  
  // Create confusion matrix
  const matrix = {};
  categories.forEach(i => {
    matrix[i] = {};
    categories.forEach(j => { matrix[i][j] = 0; });
  });
  
  // Fill confusion matrix
  for (let i = 0; i < n; i++) {
    const r1 = Math.round(rater1Scores[i]);
    const r2 = Math.round(rater2Scores[i]);
    matrix[r1][r2]++;
  }
  
  // Calculate observed agreement (Po)
  let po = 0;
  for (const cat of categories) {
    po += matrix[cat][cat];
  }
  po /= n;
  
  // Calculate expected agreement (Pe)
  let pe = 0;
  for (const cat of categories) {
    const row = categories.reduce((sum, c) => sum + matrix[cat][c], 0) / n;
    const col = categories.reduce((sum, r) => sum + matrix[r][cat], 0) / n;
    pe += row * col;
  }
  
  // Kappa
  const kappa = (po - pe) / (1 - pe);
  
  return {
    kappa: Math.round(kappa * 1000) / 1000,
    interpretation: interpretKappa(kappa),
    po, pe, n
  };
}
```

#### 3.2.2 Weighted Kappa (สำหรับ Ordinal Scale)

$$
\kappa_w = \frac{P_{o(w)} - P_{e(w)}}{1 - P_{e(w)}}
$$

โดยใช้ **Quadratic Weights**:

$$
w_{ij} = 1 - \frac{(i-j)^2}{(k-1)^2}
$$

```javascript
function calculateWeightedKappa(rater1, rater2, weightType = 'quadratic') {
  const k = 6;  // 0-5 scale
  
  // Create weight matrix
  const weights = [];
  for (let i = 0; i < k; i++) {
    weights[i] = [];
    for (let j = 0; j < k; j++) {
      if (weightType === 'linear') {
        weights[i][j] = 1 - Math.abs(i - j) / (k - 1);
      } else {  // quadratic
        weights[i][j] = 1 - Math.pow(i - j, 2) / Math.pow(k - 1, 2);
      }
    }
  }
  
  // ... calculation continues
}
```

#### 3.2.3 ICC (Intraclass Correlation Coefficient)

ใช้ **ICC(2,1)** — Two-way Random Effects, Single Measures:

$$
ICC(2,1) = \frac{MS_R - MS_E}{MS_R + (k-1)MS_E + \frac{k}{n}(MS_C - MS_E)}
$$

โดยที่:
- $MS_R$ = Mean Square for Rows (subjects)
- $MS_C$ = Mean Square for Columns (raters)
- $MS_E$ = Mean Square for Error
- $k$ = Number of raters
- $n$ = Number of subjects

#### 3.2.4 Mean Absolute Error (MAE)

$$
MAE = \frac{1}{n} \sum_{i=1}^{n} |AI_i - Expert_i|
$$

### 3.3 เกณฑ์การตีความ

#### Kappa Interpretation (Landis & Koch, 1977)

| ค่า κ | การตีความ | Status |
|-------|-----------|--------|
| < 0.00 | Poor agreement | ❌ ต้องปรับปรุง |
| 0.00 - 0.20 | Slight agreement | ❌ ต้องปรับปรุง |
| 0.21 - 0.40 | Fair agreement | ⚠️ ต้อง calibration |
| 0.41 - 0.60 | Moderate agreement | ⚠️ ยอมรับได้บางส่วน |
| **0.61 - 0.80** | **Substantial agreement** | ✅ **ยอมรับได้** |
| **0.81 - 1.00** | **Almost perfect** | ✅ **ดีเยี่ยม** |

#### ICC Interpretation (Koo & Li, 2016)

| ค่า ICC | การตีความ |
|---------|-----------|
| < 0.50 | Poor |
| 0.50 - 0.75 | Moderate |
| **0.75 - 0.90** | **Good** |
| **> 0.90** | **Excellent** |

---

## 4. Research Data Pipeline

### 4.1 Data Schema v3.1

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RESEARCH DATA PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SOURCE COLLECTIONS                                                     │
│  ├── assessments          (Chat-based A.R.C.E. scores)                 │
│  ├── worksheetSubmissions (Worksheet A.R.C.E. scores)                  │
│  ├── studentProgress      (Aggregated progress)                        │
│  ├── sessions             (Session metadata)                           │
│  └── users                (Demographics)                               │
│                                                                         │
│                    ↓                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  TRANSFORMATION LAYER                                           │   │
│  │  ├── Flatten nested objects                                     │   │
│  │  ├── Apply K-Anonymity (k=5, suppress if group < k)             │   │
│  │  ├── Remove PII (name, email, studentId)                        │   │
│  │  ├── Generate sequential IDs                                    │   │
│  │  └── Convert timestamps to ISO/epoch                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                    ↓                                                    │
│  RESEARCH COLLECTIONS                                                   │
│  ├── learningEvents       (Individual assessment events)               │
│  ├── studentGrowthHistory (Longitudinal progress)                      │
│  ├── learningSequences    (Temporal patterns)                          │
│  └── aggregatedMetrics    (Statistical summaries)                      │
│                                                                         │
│                    ↓                                                    │
│  EXPORT FORMATS                                                         │
│  ├── CSV (UTF-8 BOM for Thai)                                         │
│  ├── JSON (Flat structure)                                             │
│  └── SPSS-ready (Variable labels, value labels)                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 learningEvents Schema

```javascript
// Collection: learningEvents (Flat structure for SPSS/Stata)
{
  // === Identifiers ===
  eventId: "evt_abc123",              // Sequential research ID
  anonymousStudentId: "STU_001",      // K-Anonymous student ID
  courseId: "course_xyz",
  sessionId: "sess_123",
  
  // === Demographics (Suppressed if k < 5) ===
  gradeLevel: "ม.4",                  // Categorical: ป.4-6, ม.1-3, ม.4-6
  section: "วิทย์-คณิต",              // Suppressed if small group
  schoolId: "SCH_001",                // Anonymized school ID
  esaId: "ESA_001",                   // Educational Service Area
  
  // === Assessment Context ===
  assessmentType: "chat",             // "chat" | "worksheet"
  questionId: "q_456",
  questionDifficulty: 3,              // 1-5
  bloomLevel: "analyze",              // "analyze" | "evaluate" | "create"
  topic: "การเปลี่ยนแปลงสภาพภูมิอากาศ",
  
  // === A.R.C.E. Scores (0-5 each) ===
  scoreAnalysis: 4,
  scoreReasoning: 3,
  scoreCreativity: 4,
  scoreEvidence: 3,
  scoreTotal: 14,                     // Sum 0-20
  
  // === AI Precision ===
  aiConfidence: 85,                   // 0-100
  aiConfidenceReason: "คำตอบชัดเจน",
  chainOfThought_step1: "สรุป...",    // Flattened CoT
  chainOfThought_step2: "หลักฐาน...",
  chainOfThought_step3: "Anchor...",
  chainOfThought_step4: "ตัดสินใจ...",
  
  // === Learning Outcomes ===
  loAssessed: ["LO1", "LO2"],         // Array as JSON string
  loPassed: ["LO1"],                  // Array as JSON string
  loCount: 2,
  loPassedCount: 1,
  
  // === Behavioral Data ===
  responseLength: 247,                // Character count
  timeSpent: 180,                     // Seconds
  attemptNumber: 1,                   // 1st, 2nd, etc.
  
  // === Integrity Flags ===
  copyPasteDetected: false,
  aiGeneratedDetected: false,
  integrityScore: 100,                // 0-100
  
  // === Temporal ===
  timestamp: "2025-12-21T10:30:00Z",  // ISO 8601
  timestampEpoch: 1734778200,         // Unix timestamp
  dayOfWeek: "Saturday",
  hourOfDay: 10,
  weekOfYear: 51,
  
  // === Audit Trail ===
  modelUsed: "gpt-4o-mini-2024-07-18",
  promptVersion: "v3.0-cot-confidence",
  temperature: 0,
  seed: 42,
  
  schemaVersion: "3.1"
}
```

### 4.3 Export Formats

| Format | Use Case | Encoding | Notes |
|--------|----------|----------|-------|
| **CSV** | SPSS, Excel, R | UTF-8 + BOM | Thai characters supported |
| **JSON** | Python, JavaScript | UTF-8 | Flat structure, no nesting |
| **SPSS-ready** | SPSS syntax | - | Variable/value labels included |

```javascript
// CSV Export with Thai support
const BOM = '\uFEFF';  // UTF-8 BOM for Excel
const csvContent = BOM + headers.join(',') + '\n' + rows.join('\n');
const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
```

---

## 5. การคุ้มครองข้อมูลส่วนบุคคล (Privacy Protection)

### 5.1 K-Anonymity Implementation

**หลักการ:** ข้อมูลส่วนบุคคลต้องไม่สามารถระบุตัวบุคคลได้ เมื่อกลุ่มที่มีลักษณะเดียวกันมีสมาชิก < k คน

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    K-ANONYMITY IMPLEMENTATION (k=5)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Quasi-Identifiers (ข้อมูลกึ่งระบุตัวตน):                               │
│  ├── gradeLevel    → Generalize: ป.4, ป.5, ป.6 → "ป.4-6"               │
│  ├── section       → Suppress if group < 5                             │
│  ├── schoolId      → Anonymize: SCH_001, SCH_002, ...                  │
│  └── esaId         → Anonymize: ESA_001, ESA_002, ...                  │
│                                                                         │
│  Direct Identifiers (ข้อมูลระบุตัวตนโดยตรง):                            │
│  ├── name          → REMOVED                                           │
│  ├── email         → REMOVED                                           │
│  ├── studentId     → REMOVED (replace with anonymousStudentId)         │
│  └── uid           → REMOVED                                           │
│                                                                         │
│  Process:                                                               │
│  1. Group by quasi-identifiers                                         │
│  2. If group size < k (5):                                             │
│     - Generalize quasi-identifiers further                             │
│     - Or suppress (mark as "Other" / "Suppressed")                     │
│  3. Replace direct identifiers with sequential IDs                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 PDPA Compliance

| หลักการ | การดำเนินการ | Status |
|---------|-------------|--------|
| **Consent** | ConsentModal on first login | ✅ |
| **Data Minimization** | No PII sent to OpenAI | ✅ |
| **Right to Access** | User can view all personal data | ✅ |
| **Right to Erasure** | User can request data deletion | ✅ |
| **Anonymization** | K-Anonymity in research export | ✅ |
| **Retention Policy** | Configurable per IRB | ✅ |

### 5.3 Re-identification Risk Assessment

```javascript
// Risk assessment before export
async function assessReidentificationRisk(dataset, k = 5) {
  const quasiIdentifiers = ['gradeLevel', 'section', 'schoolId', 'esaId'];
  
  // Group by quasi-identifiers
  const groups = groupByMultiple(dataset, quasiIdentifiers);
  
  // Count groups with size < k
  const riskyGroups = Object.values(groups).filter(g => g.length < k);
  const riskyRecords = riskyGroups.reduce((sum, g) => sum + g.length, 0);
  
  const riskScore = (riskyRecords / dataset.length) * 100;
  
  return {
    totalRecords: dataset.length,
    riskyRecords,
    riskPercentage: riskScore.toFixed(2),
    recommendation: riskScore > 10 
      ? 'GENERALIZE or SUPPRESS risky records'
      : 'SAFE to export'
  };
}
```

---

## 6. การวิเคราะห์ทางสถิติ (Statistical Analysis)

### 6.1 Descriptive Statistics

```python
# Python example for research data analysis
import pandas as pd
from scipy import stats

# Load data
df = pd.read_csv('learningEvents.csv')

# Descriptive statistics
print(df[['scoreAnalysis', 'scoreReasoning', 'scoreCreativity', 'scoreEvidence', 'scoreTotal']].describe())

# Group by grade level
grade_stats = df.groupby('gradeLevel').agg({
    'scoreTotal': ['mean', 'std', 'count'],
    'aiConfidence': 'mean'
})
print(grade_stats)
```

### 6.2 Effect Size Calculation

#### Cohen's d (Pre-Post Comparison)

$$
d = \frac{M_{post} - M_{pre}}{SD_{pooled}}
$$

```python
def cohens_d(pre, post):
    n1, n2 = len(pre), len(post)
    pooled_std = np.sqrt(((pre.var() * (n1-1) + post.var() * (n2-1)) / (n1+n2-2)))
    return (post.mean() - pre.mean()) / pooled_std

# Calculate effect size
d = cohens_d(df_pre['scoreTotal'], df_post['scoreTotal'])
print(f"Effect size (Cohen's d): {d:.3f}")

# Interpretation
# d = 0.2: small effect
# d = 0.5: medium effect
# d = 0.8: large effect
```

### 6.3 Scaffolding Effectiveness Analysis

```python
# One-way ANOVA: Compare score improvement by scaffolding level
from scipy.stats import f_oneway

none = df[df['scaffoldingLevel'] == 'none']['scoreTotal']
minimal = df[df['scaffoldingLevel'] == 'minimal']['scoreTotal']
structured = df[df['scaffoldingLevel'] == 'structured']['scoreTotal']

f_stat, p_val = f_oneway(none, minimal, structured)
print(f"F = {f_stat:.3f}, p = {p_val:.4f}")

# Post-hoc: Tukey HSD
from statsmodels.stats.multicomp import pairwise_tukeyhsd
tukey = pairwise_tukeyhsd(df['scoreTotal'], df['scaffoldingLevel'])
print(tukey)
```

### 6.4 Power Analysis

```python
from statsmodels.stats.power import TTestIndPower

# Calculate required sample size
power_analysis = TTestIndPower()
sample_size = power_analysis.solve_power(
    effect_size=0.5,   # Medium effect
    alpha=0.05,        # Significance level
    power=0.80,        # Statistical power
    ratio=1.0          # Equal groups
)

print(f"Required sample size per group: {sample_size:.0f}")
# Output: ~64 per group for d=0.5, α=0.05, power=0.80
```

---

## 7. โปรโตคอลการ Calibration

### 7.1 Expert Calibration Protocol

**ก่อนการให้คะแนน (Pre-Scoring):**

1. **อ่าน Anchor ทุกระดับ** — ทบทวน 0-5 ของทั้ง 4 มิติ
2. **ศึกษาตัวอย่าง** — ดู Golden Dataset items พร้อมคำอธิบาย
3. **ฝึกให้คะแนน** — ทำ Practice items 5 ข้อ พร้อมเฉลย
4. **ตรวจสอบความเข้าใจ** — Agreement กับ Master rater ≥ 80%

**ขณะให้คะแนน (Scoring Procedure):**

```
สำหรับแต่ละคำตอบ:

1. อ่านคำตอบทั้งหมดก่อน (ไม่ให้คะแนน)

2. ให้คะแนน Analysis:
   □ มีการแยกแยะประเด็นไหม? (Yes/No)
   □ ถ้าใช่ ระบุความสัมพันธ์ไหม?
   □ Match กับ Anchor ระดับไหน?
   → เลือกคะแนน 0-5

3. ให้คะแนน Reasoning:
   □ มีการให้เหตุผลไหม? (Yes/No)
   □ ถ้าใช่ ตรรกะสมเหตุสมผลไหม?
   □ อ้างหลักการหรือทฤษฎีไหม?
   → เลือกคะแนน 0-5

4. ให้คะแนน Creativity:
   □ มีมุมมองใหม่ไหม? (Yes/No)
   □ คิดนอกกรอบไหม?
   □ เสนอทางเลือกไหม?
   → เลือกคะแนน 0-5

5. ให้คะแนน Evidence:
   □ มีการอ้างอิงไหม? (Yes/No)
   □ อ้างอิงถูกต้องไหม?
   □ มีตัวอย่างประกอบไหม?
   → เลือกคะแนน 0-5

6. รวมคะแนน (0-20)
```

### 7.2 Common Pitfalls to Avoid

| ❌ หลีกเลี่ยง | ✅ ควรทำ |
|-------------|---------|
| ให้คะแนนตามความยาวคำตอบ | ให้ตามคุณภาพเนื้อหา |
| ลำเอียงตามระดับชั้น | ใช้ Grade Calibration |
| ให้คะแนนกลางๆ เสมอ (3) | ใช้ full range 0-5 |
| คิดว่าคำตอบสวยงาม = ดี | ดูหลักฐานตาม Anchor |
| ให้คะแนนเป็นทศนิยม | ใช้ integer 0-5 เท่านั้น |

### 7.3 Discrepancy Resolution

เมื่อคะแนนต่างกัน > 1 point ในมิติใด:

1. **Review independently** — แต่ละคนทบทวนคำตอบและ Anchor อีกครั้ง
2. **Discuss evidence** — อภิปรายหลักฐานที่นำไปสู่คะแนน
3. **Reach consensus** — ตกลงคะแนนร่วม หรือใช้ค่าเฉลี่ย
4. **Document rationale** — บันทึกเหตุผลสำหรับ audit trail

---

## บรรณานุกรม (References)

Cohen, J. (1960). A coefficient of agreement for nominal scales. *Educational and Psychological Measurement*, 20(1), 37-46.

Fleiss, J. L. (1971). Measuring nominal scale agreement among many raters. *Psychological Bulletin*, 76(5), 378-382.

Koo, T. K., & Li, M. Y. (2016). A guideline of selecting and reporting intraclass correlation coefficients for reliability research. *Journal of Chiropractic Medicine*, 15(2), 155-163.

Landis, J. R., & Koch, G. G. (1977). The measurement of observer agreement for categorical data. *Biometrics*, 33(1), 159-174.

Sweeney, L. (2002). K-anonymity: A model for protecting privacy. *International Journal of Uncertainty, Fuzziness and Knowledge-Based Systems*, 10(5), 557-570.

---

<div align="center">

**เอกสารก่อนหน้า:** [03_SYSTEM_ARCHITECTURE.md](./03_SYSTEM_ARCHITECTURE.md)  
**เอกสารถัดไป:** [05_USER_MANUAL_ACADEMIC.md](./05_USER_MANUAL_ACADEMIC.md)

---

*HOTS AI ChatLoop — Academic Documentation Suite*  
*Version 6.1 | January 2026*

</div>
