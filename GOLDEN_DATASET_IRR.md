# 🎯 Golden Dataset for Inter-Rater Reliability (IRR) Testing

<div align="center">

**Version 3.0** | **Last Updated: December 21, 2025**

*ชุดข้อมูลมาตรฐานสำหรับการทดสอบความน่าเชื่อถือระหว่างผู้ประเมิน (AI vs Expert)*

</div>

---

## 📑 Table of Contents

1. [Purpose & Methodology](#1-purpose--methodology)
2. [A.R.C.E. Scoring Anchors](#2-arce-scoring-anchors)
3. [Golden Dataset (20 Items)](#3-golden-dataset-20-items)
4. [Expert Scoring Guidelines](#4-expert-scoring-guidelines)
5. [IRR Calculation Methods](#5-irr-calculation-methods)
6. [Interpretation Guide](#6-interpretation-guide)
7. [Calibration Session Protocol](#7-calibration-session-protocol)

---

## 1. Purpose & Methodology

### Purpose

ชุดข้อมูลนี้ใช้สำหรับ:
1. **Calibration** — ปรับเทียบการให้คะแนนระหว่าง AI และผู้เชี่ยวชาญ
2. **IRR Testing** — วัดความน่าเชื่อถือระหว่างผู้ประเมิน (Inter-Rater Reliability)
3. **Quality Assurance** — ตรวจสอบคุณภาพการให้คะแนนของ AI อย่างต่อเนื่อง
4. **Training** — ฝึกครูใหม่ในการประเมินตาม A.R.C.E. Framework

### Methodology

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
│  └── Percent Agreement (simple)                                        │
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

### Selection Criteria

ข้อมูลถูกคัดเลือกให้ครอบคลุม:

| Criterion | Distribution | Count |
|-----------|-------------|-------|
| **Score Range** | Low (0-6), Mid (7-13), High (14-20) | 6, 8, 6 |
| **Grade Level** | ป.4-6, ม.1-3, ม.4-6 | 6, 7, 7 |
| **Subject** | วิทย์, คณิต, ภาษาไทย, สังคม | 5, 5, 5, 5 |
| **Answer Length** | Short (<50), Medium (50-150), Long (>150) | 5, 10, 5 |
| **Quality Type** | Strong all, Weak all, Mixed | 5, 5, 10 |

---

## 2. A.R.C.E. Scoring Anchors

### Analysis (การวิเคราะห์) — 0-5 Points

| Score | Thai Description | English Description |
|-------|------------------|---------------------|
| **5** | แยกแยะประเด็นครบถ้วน ชี้ความสัมพันธ์ซับซ้อน พบรูปแบบ/แนวโน้ม | Complete breakdown, complex relationships, patterns identified |
| **4** | แยกแยะประเด็นส่วนใหญ่ ชี้ความสัมพันธ์ได้ดี มีบางส่วนขาด | Most components identified, good relationships, minor gaps |
| **3** | แยกแยะประเด็นหลักได้ ชี้ความสัมพันธ์พื้นฐาน | Main components identified, basic relationships |
| **2** | แยกแยะบางประเด็น ขาดความสัมพันธ์ | Some components, lacks relationships |
| **1** | พยายามแยกแยะแต่ยังไม่ชัดเจน | Attempts breakdown but unclear |
| **0** | ไม่มีหลักฐานการวิเคราะห์ | No evidence of analysis |

### Reasoning (การให้เหตุผล) — 0-5 Points

| Score | Thai Description | English Description |
|-------|------------------|---------------------|
| **5** | เหตุผลชัดเจน ตรรกะสมบูรณ์ อ้างหลักการถูกต้อง มีข้อโต้แย้ง | Clear reasoning, complete logic, correct principles, counterarguments |
| **4** | เหตุผลดี ตรรกะส่วนใหญ่ถูกต้อง อ้างหลักการได้ | Good reasoning, mostly correct logic, principles cited |
| **3** | มีเหตุผลพื้นฐาน ตรรกะเรียบง่าย | Basic reasoning, simple logic |
| **2** | เหตุผลบางส่วน มีช่องโหว่ในตรรกะ | Partial reasoning, logical gaps |
| **1** | พยายามให้เหตุผลแต่ไม่สมเหตุสมผล | Attempts reasoning but illogical |
| **0** | ไม่มีการให้เหตุผล | No reasoning provided |

### Creativity (ความคิดสร้างสรรค์) — 0-5 Points

| Score | Thai Description | English Description |
|-------|------------------|---------------------|
| **5** | มุมมองใหม่โดดเด่น คิดนอกกรอบ เสนอทางเลือกหลากหลาย | Outstanding new perspective, thinks outside box, multiple alternatives |
| **4** | มุมมองน่าสนใจ มีความคิดสร้างสรรค์ เสนอทางเลือก | Interesting perspective, creative, offers alternatives |
| **3** | มีความคิดของตนเอง บางส่วนสร้างสรรค์ | Has own ideas, somewhat creative |
| **2** | ความคิดทั่วไป ไม่มีมุมมองใหม่ | General ideas, no new perspectives |
| **1** | คิดตามแนวทางเดิม ไม่มีความคิดของตน | Follows existing patterns, no original thought |
| **0** | ไม่มีหลักฐานความคิดสร้างสรรค์ | No evidence of creativity |

### Evidence (การใช้หลักฐาน) — 0-5 Points

| Score | Thai Description | English Description |
|-------|------------------|---------------------|
| **5** | หลักฐานครบถ้วน หลากหลาย อ้างอิงถูกต้อง ตัวอย่างชัดเจน | Complete evidence, diverse, correct citations, clear examples |
| **4** | หลักฐานดี อ้างอิงส่วนใหญ่ถูกต้อง มีตัวอย่าง | Good evidence, mostly correct citations, examples |
| **3** | มีหลักฐานพื้นฐาน บางส่วนอ้างอิงได้ | Basic evidence, some citations |
| **2** | หลักฐานน้อย หรืออ้างไม่ถูกต้อง | Little evidence, incorrect citations |
| **1** | พยายามอ้างหลักฐานแต่ไม่เหมาะสม | Attempts evidence but inappropriate |
| **0** | ไม่มีหลักฐานสนับสนุน | No supporting evidence |

---

## 3. Golden Dataset (20 Items)

### Item 1 — High Quality (Expected: 17-20)

**Grade Level:** ม.5 | **Subject:** วิทยาศาสตร์ | **Topic:** การเปลี่ยนแปลงสภาพภูมิอากาศ

**Question:**
> วิเคราะห์ผลกระทบของการเปลี่ยนแปลงสภาพภูมิอากาศต่อระบบนิเวศในประเทศไทย และเสนอแนวทางแก้ไขที่เป็นไปได้ในระดับท้องถิ่น

**Student Answer:**
> การเปลี่ยนแปลงสภาพภูมิอากาศส่งผลกระทบต่อระบบนิเวศไทยหลายด้าน ประการแรก อุณหภูมิที่สูงขึ้นทำให้ปะการังฟอกขาวในอ่าวไทยและอันดามัน จากข้อมูลกรมทรัพยากรทางทะเลฯ ปี 2567 พบปะการังฟอกขาวกว่า 30% ประการที่สอง ฤดูกาลเปลี่ยนแปลง ฝนตกหนักในบางพื้นที่แต่แล้งในบางพื้นที่ ส่งผลต่อวงจรชีวิตสัตว์ป่า เช่น นกอพยพมาถึงช้าลง
>
> สำหรับแนวทางแก้ไขในระดับท้องถิ่น ผมเสนอ 3 แนวทาง: (1) ปลูกป่าชายเลนเพื่อดูดซับคาร์บอนและป้องกันชายฝั่ง ซึ่งงานวิจัยของ IPCC ระบุว่าป่าชายเลนดูดซับคาร์บอนได้ 4 เท่าของป่าบก (2) ส่งเสริมเกษตรอินทรีย์เพื่อลดการปล่อยไนตรัสออกไซด์จากปุ๋ยเคมี (3) ใช้พลังงานหมุนเวียนในชุมชน เช่น โซลาร์เซลล์ที่มีราคาถูกลงมาก
>
> อย่างไรก็ตาม อุปสรรคคือต้นทุนเริ่มต้นสูงและประชาชนยังขาดความรู้ ดังนั้นต้องมีการให้ความรู้และสนับสนุนเงินทุนจากภาครัฐ

| Dimension | Expected Score | Justification |
|-----------|----------------|---------------|
| Analysis | 5 | แยกแยะผลกระทบ 2 ด้าน, ชี้ความสัมพันธ์ที่ซับซ้อน |
| Reasoning | 4 | เหตุผลชัดเจน, ตรรกะดี, มีข้อโต้แย้ง (อุปสรรค) |
| Creativity | 4 | เสนอ 3 แนวทางที่เป็นรูปธรรม, มุมมองหลากหลาย |
| Evidence | 5 | อ้าง IPCC, กรมทรัพยากรฯ, ตัวอย่างเฉพาะเจาะจง |
| **Total** | **18** | |

---

### Item 2 — Medium Quality (Expected: 10-13)

**Grade Level:** ม.2 | **Subject:** สังคมศึกษา | **Topic:** ประชาธิปไตย

**Question:**
> อธิบายความสำคัญของการเลือกตั้งในระบอบประชาธิปไตย และวิเคราะห์ปัญหาที่ทำให้คนรุ่นใหม่ไม่สนใจการเลือกตั้ง

**Student Answer:**
> การเลือกตั้งสำคัญเพราะเป็นวิธีที่ประชาชนมีส่วนร่วมในการปกครองประเทศ ถ้าไม่มีการเลือกตั้ง ผู้นำก็จะเป็นใครก็ได้โดยประชาชนไม่ได้เลือก
>
> ปัญหาที่คนรุ่นใหม่ไม่สนใจเลือกตั้งคือ พวกเขาคิดว่าเสียงของตนไม่สำคัญ และนักการเมืองไม่ได้ทำตามสัญญา ก็เลยรู้สึกเบื่อหน่าย นอกจากนี้คนรุ่นใหม่ก็ยุ่งกับโซเชียลมีเดียมากกว่าสนใจการเมือง

| Dimension | Expected Score | Justification |
|-----------|----------------|---------------|
| Analysis | 3 | ระบุปัญหา 2-3 ประเด็น, ความสัมพันธ์พื้นฐาน |
| Reasoning | 3 | มีเหตุผลแต่ไม่ลึกซึ้ง, ตรรกะเรียบง่าย |
| Creativity | 2 | ความคิดทั่วไป, ไม่มีมุมมองใหม่ |
| Evidence | 2 | ไม่มีการอ้างอิงข้อมูลเชิงประจักษ์ |
| **Total** | **10** | |

---

### Item 3 — Low Quality (Expected: 3-6)

**Grade Level:** ป.6 | **Subject:** ภาษาไทย | **Topic:** วรรณกรรม

**Question:**
> วิเคราะห์ตัวละครในเรื่อง "ขุนช้างขุนแผน" และอธิบายว่าตัวละครใดเป็นตัวอย่างที่ดีหรือไม่ดี เพราะอะไร

**Student Answer:**
> ขุนแผนเป็นตัวอย่างที่ดีเพราะเขารักนางวันทอง ส่วนขุนช้างไม่ดีเพราะเขาหน้าตาไม่ดี ผมชอบขุนแผนมากกว่า

| Dimension | Expected Score | Justification |
|-----------|----------------|---------------|
| Analysis | 1 | พยายามแยกแยะแต่ไม่ครบ, ขาดลึกซึ้ง |
| Reasoning | 1 | เหตุผลผิวเผิน (หน้าตา), ไม่สมเหตุสมผล |
| Creativity | 1 | ไม่มีความคิดของตนเอง |
| Evidence | 1 | ไม่มีหลักฐานจากวรรณกรรม |
| **Total** | **4** | |

---

### Items 4-20 — Summary Table

| Item | Grade | Subject | Expected Total | Quality Type |
|------|-------|---------|----------------|--------------|
| 4 | ม.4 | คณิตศาสตร์ | 15-17 | High |
| 5 | ม.1 | วิทยาศาสตร์ | 8-10 | Medium |
| 6 | ป.5 | สังคมศึกษา | 5-7 | Low |
| 7 | ม.6 | ภาษาไทย | 18-20 | High |
| 8 | ม.3 | คณิตศาสตร์ | 12-14 | Medium |
| 9 | ป.4 | วิทยาศาสตร์ | 3-5 | Low |
| 10 | ม.2 | สังคมศึกษา | 11-13 | Medium |
| 11 | ม.5 | ภาษาไทย | 14-16 | High-Medium |
| 12 | ป.6 | คณิตศาสตร์ | 6-8 | Low-Medium |
| 13 | ม.1 | วิทยาศาสตร์ | 9-11 | Medium |
| 14 | ม.4 | สังคมศึกษา | 16-18 | High |
| 15 | ป.5 | ภาษาไทย | 4-6 | Low |
| 16 | ม.3 | คณิตศาสตร์ | 13-15 | Medium-High |
| 17 | ม.6 | วิทยาศาสตร์ | 17-19 | High |
| 18 | ป.4 | สังคมศึกษา | 2-4 | Low |
| 19 | ม.2 | ภาษาไทย | 10-12 | Medium |
| 20 | ม.5 | คณิตศาสตร์ | 15-17 | High |

---

## 4. Expert Scoring Guidelines

### Pre-Scoring Preparation

1. **อ่าน Anchor ทุกระดับ** — ทบทวน 0-5 ของทั้ง 4 มิติ
2. **อ่านคำถามก่อน** — เข้าใจบริบทและความคาดหวัง
3. **ให้คะแนนทีละมิติ** — อย่าให้คะแนนรวมแล้วแยก
4. **ใช้ Anchor อย่างเคร่งครัด** — อย่าใช้ความรู้สึก

### Scoring Procedure

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

### Common Pitfalls

| ❌ Avoid | ✅ Do Instead |
|----------|---------------|
| ให้คะแนนตามความยาวคำตอบ | ให้ตามคุณภาพเนื้อหา |
| ลำเอียงตามระดับชั้น | ใช้ Grade Calibration |
| ให้คะแนนกลางๆ เสมอ (3) | ใช้ full range 0-5 |
| คิดว่าคำตอบสวยงาม = ดี | ดูหลักฐานตาม Anchor |
| ให้คะแนนเป็นทศนิยม | ใช้ integer 0-5 เท่านั้น |

---

## 5. IRR Calculation Methods

### Cohen's Kappa (2 Raters)

```javascript
// functions/utils/interRaterReliability.js
function calculateCohensKappa(scores1, scores2) {
  const n = scores1.length;
  
  // Create confusion matrix
  const matrix = createConfusionMatrix(scores1, scores2, 6); // 0-5
  
  // Calculate observed agreement (Po)
  let Po = 0;
  for (let i = 0; i < 6; i++) {
    Po += matrix[i][i];
  }
  Po /= n;
  
  // Calculate expected agreement (Pe)
  let Pe = 0;
  for (let i = 0; i < 6; i++) {
    const row_i = matrix[i].reduce((a, b) => a + b, 0);
    const col_i = matrix.reduce((sum, row) => sum + row[i], 0);
    Pe += (row_i * col_i);
  }
  Pe /= (n * n);
  
  // Cohen's Kappa
  const kappa = (Po - Pe) / (1 - Pe);
  
  return kappa;
}
```

### Weighted Kappa (Ordinal Scale)

```javascript
function calculateWeightedKappa(scores1, scores2, weights = 'linear') {
  const n = scores1.length;
  const categories = 6; // 0-5
  
  // Weight matrix
  const w = [];
  for (let i = 0; i < categories; i++) {
    w[i] = [];
    for (let j = 0; j < categories; j++) {
      if (weights === 'linear') {
        w[i][j] = 1 - Math.abs(i - j) / (categories - 1);
      } else if (weights === 'quadratic') {
        w[i][j] = 1 - Math.pow(i - j, 2) / Math.pow(categories - 1, 2);
      }
    }
  }
  
  // Calculate weighted Po and Pe
  // ... (similar to Cohen's Kappa with weights)
  
  return weightedKappa;
}
```

### Fleiss' Kappa (3+ Raters)

```javascript
function calculateFleissKappa(allScores) {
  // allScores[i][j] = rater j's score for item i
  const n = allScores.length;      // Number of items
  const k = allScores[0].length;   // Number of raters
  const categories = 6;            // 0-5
  
  // Count how many raters assigned each category to each item
  const ratings = allScores.map(item => {
    const counts = new Array(categories).fill(0);
    item.forEach(score => counts[score]++);
    return counts;
  });
  
  // Calculate P_i (agreement for each item)
  const P_i = ratings.map(counts => {
    let sum = 0;
    counts.forEach(count => sum += count * (count - 1));
    return sum / (k * (k - 1));
  });
  
  // Calculate P_bar (mean agreement)
  const P_bar = P_i.reduce((a, b) => a + b, 0) / n;
  
  // Calculate P_e (expected agreement)
  const p_j = new Array(categories).fill(0);
  ratings.forEach(counts => {
    counts.forEach((count, j) => p_j[j] += count);
  });
  p_j.forEach((_, j) => p_j[j] /= (n * k));
  
  const P_e = p_j.reduce((sum, p) => sum + p * p, 0);
  
  // Fleiss' Kappa
  const kappa = (P_bar - P_e) / (1 - P_e);
  
  return kappa;
}
```

### Percent Agreement (Simple)

```javascript
function calculatePercentAgreement(scores1, scores2, tolerance = 0) {
  let agree = 0;
  for (let i = 0; i < scores1.length; i++) {
    if (Math.abs(scores1[i] - scores2[i]) <= tolerance) {
      agree++;
    }
  }
  return (agree / scores1.length) * 100;
}

// Exact agreement
const exact = calculatePercentAgreement(scores1, scores2, 0);
// Adjacent agreement (within 1 point)
const adjacent = calculatePercentAgreement(scores1, scores2, 1);
```

---

## 6. Interpretation Guide

### Cohen's Kappa Interpretation

| Kappa Range | Agreement Level | Action |
|-------------|-----------------|--------|
| κ < 0.00 | Less than chance | ❌ Re-training required |
| 0.00 - 0.20 | Slight | ❌ Major calibration needed |
| 0.21 - 0.40 | Fair | ⚠️ Significant calibration needed |
| 0.41 - 0.60 | Moderate | ⚠️ Some calibration needed |
| 0.61 - 0.80 | Substantial | ✅ Acceptable |
| 0.81 - 1.00 | Almost Perfect | ✅ Excellent |

### Per-Dimension Thresholds

| Dimension | Minimum κ | Target κ |
|-----------|-----------|----------|
| Analysis | 0.60 | 0.75+ |
| Reasoning | 0.55 | 0.70+ |
| Creativity | 0.50 | 0.65+ |
| Evidence | 0.60 | 0.75+ |
| **Overall** | **0.60** | **0.70+** |

### Sample IRR Report

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        IRR REPORT                                       │
│                    Generated: December 21, 2025                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Raters:         Expert 1 (Teacher A), Expert 2 (Teacher B), AI        │
│  Items Scored:   20                                                     │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  DIMENSION        │ κ (E1-E2) │ κ (E1-AI) │ κ (E2-AI) │ Status   │ │
│  ├───────────────────┼───────────┼───────────┼───────────┼──────────┤ │
│  │  Analysis         │   0.78    │   0.72    │   0.74    │ ✅ Pass  │ │
│  │  Reasoning        │   0.71    │   0.68    │   0.65    │ ✅ Pass  │ │
│  │  Creativity       │   0.65    │   0.58    │   0.61    │ ⚠️ Low  │ │
│  │  Evidence         │   0.82    │   0.76    │   0.79    │ ✅ Pass  │ │
│  ├───────────────────┼───────────┼───────────┼───────────┼──────────┤ │
│  │  OVERALL          │   0.74    │   0.69    │   0.70    │ ✅ Pass  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Percent Agreement:                                                     │
│  • Exact:    65% (E1-E2), 58% (E1-AI), 60% (E2-AI)                     │
│  • Adjacent: 92% (E1-E2), 88% (E1-AI), 89% (E2-AI)                     │
│                                                                         │
│  Discrepancy Items (>2 points):                                        │
│  • Item 7:  E1=15, E2=12, AI=14 — Discussed, consensus=14             │
│  • Item 15: E1=5,  E2=8,  AI=6  — Anchor clarification needed          │
│                                                                         │
│  Recommendations:                                                       │
│  1. Creativity dimension needs anchor refinement                       │
│  2. Schedule calibration session for borderline cases (8-12)           │
│  3. AI meets threshold — approved for production                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Calibration Session Protocol

### Pre-Session (30 min before)

1. ส่ง 5 items ให้ผู้เชี่ยวชาญ score ล่วงหน้า
2. เตรียม Anchor descriptions ให้ทุกคน
3. AI score 5 items เดียวกัน

### Session Agenda (2 hours)

| Time | Activity | Output |
|------|----------|--------|
| 0:00-0:15 | Review Anchors | Common understanding |
| 0:15-0:45 | Discuss pre-scored items | Identify discrepancies |
| 0:45-1:15 | Score new items together | Calibrated scoring |
| 1:15-1:45 | Compare with AI scores | AI validation |
| 1:45-2:00 | Document decisions | Updated guidelines |

### Post-Session

1. Update Anchor descriptions if needed
2. Re-train AI prompt if κ < 0.60
3. Schedule follow-up in 4 weeks
4. Distribute session notes to all raters

---

## 📎 Appendix: Full Dataset Access

ชุดข้อมูลเต็ม (20 items with complete questions and answers) สามารถขอได้ที่:

- **Firestore Collection**: `goldenDataset`
- **Function**: `generateGoldenDataset()` → `GET /generateGoldenDataset`
- **Excel Export**: Available via Admin Panel

---

<div align="center">

**HOTS AI ChatLoop — Golden Dataset for IRR Testing**

*Version 3.0 | December 21, 2025*

</div>
