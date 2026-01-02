# 📊 ท่อส่งข้อมูลงานวิจัย — HOTS AI ChatLoop

<div align="center">

**เวอร์ชัน 3.2** | **อัปเดตล่าสุด: 2 มกราคม 2569**

*คู่มือการจัดเก็บ ประมวลผล และส่งออกข้อมูลสำหรับงานวิจัย*

</div>

---

## 📑 สารบัญ

1. [ภาพรวมท่อส่งข้อมูล](#1-ภาพรวมท่อส่งข้อมูล)
2. [แหล่งข้อมูล](#2-แหล่งข้อมูล)
3. [Schema ข้อมูล](#3-schema-ข้อมูล)
4. [การไม่ระบุตัวตน](#4-การไม่ระบุตัวตน)
5. [การส่งออกข้อมูล](#5-การส่งออกข้อมูล)
6. [การวิเคราะห์ทางสถิติ](#6-การวิเคราะห์ทางสถิติ)
7. [ตัวอย่างโค้ด](#7-ตัวอย่างโค้ด)
8. [การปฏิบัติตามจริยธรรม](#8-การปฏิบัติตามจริยธรรม)

---

## 1. ภาพรวมท่อส่งข้อมูล

### 1.1 สถาปัตยกรรมข้อมูล

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ท่อส่งข้อมูลงานวิจัย                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     การจัดเก็บข้อมูลดิบ                          │   │
│  │  • assessments — คะแนน A.R.C.E. + LO + Metadata                │   │
│  │  • worksheetSubmissions — ใบงาน + LO                           │   │
│  │  • sessions — Session logs                                     │   │
│  │  • studentProgress — ความก้าวหน้า LO                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                       การประมวลผล                               │   │
│  │  • Validation — ตรวจสอบความครบถ้วน                             │   │
│  │  • Cleaning — ลบข้อมูลซ้ำ/ผิดพลาด                              │   │
│  │  • Transformation — แปลงรูปแบบ                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     การไม่ระบุตัวตน                              │   │
│  │  • K-Anonymity (k ≥ 5)                                         │   │
│  │  • ID Hashing (SHA-256)                                        │   │
│  │  • Generalization (ชั้น → กลุ่มชั้น)                             │   │
│  │  • Suppression (ลบ PII)                                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         การส่งออก                               │   │
│  │  • JSON — สำหรับการวิเคราะห์โปรแกรม                            │   │
│  │  • CSV — สำหรับ SPSS, Excel                                    │   │
│  │  • Parquet — สำหรับ Big Data                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        การวิเคราะห์                              │   │
│  │  • IRR — Krippendorff's α, Cohen's κ, ICC                      │   │
│  │  • Effect Size — Cohen's d                                     │   │
│  │  • Correlation — Pearson, Spearman                             │   │
│  │  • Regression — Multiple regression                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 สถิติข้อมูล

| ตัวชี้วัด | จำนวน | อัปเดต |
|----------|-------|-------|
| การประเมินทั้งหมด | 15,000+ | รายวัน |
| นักเรียนที่ใช้งาน | 500+ | รายสัปดาห์ |
| รายวิชา | 25+ | รายเดือน |
| โรงเรียน | 10+ | รายภาคเรียน |
| คะแนน A.R.C.E. | 60,000+ | รายวัน |

---

## 2. แหล่งข้อมูล

### 2.1 Firestore Collections

| Collection | เอกสาร | Fields หลัก | ขนาดโดยประมาณ |
|------------|--------|------------|---------------|
| `assessments` | การประเมินทุกครั้ง | studentId, rubricScores, loAssessment | 500KB/เอกสาร |
| `worksheetSubmissions` | การส่งใบงาน | studentId, answers, assessment, loAssessment | 200KB/เอกสาร |
| `sessions` | Session chat | startTime, endTime, questionCount | 50KB/เอกสาร |
| `studentProgress` | ความก้าวหน้า LO | passedLOs, loProgress | 100KB/เอกสาร |
| `questions` | คลังคำถาม | content, relatedLOs, loConfigs | 20KB/เอกสาร |
| `courses` | รายวิชา | learningOutcomes, teacherId | 10KB/เอกสาร |

### 2.2 ข้อมูลที่เก็บรวบรวม

| หมวด | ข้อมูล | ใช้เพื่อ |
|------|-------|---------|
| **ข้อมูลประเมิน** | คะแนน A.R.C.E. (0-5 x 4 มิติ) | วิเคราะห์ผลสัมฤทธิ์ |
| | LO ที่ผ่าน | ติดตามการเรียนรู้ |
| | Feedback AI | วิเคราะห์คุณภาพ feedback |
| | Chain of Thought | ตรวจสอบกระบวนการ AI |
| | AI Confidence | ความน่าเชื่อถือ |
| **ข้อมูล Session** | ระยะเวลา | พฤติกรรมการเรียน |
| | จำนวนคำถาม | ความพยายาม |
| | ลำดับคำถาม | รูปแบบการเรียน |
| **ข้อมูลนักเรียน** | ระดับชั้น (generalized) | ตัวแปรควบคุม |
| | ความถี่การใช้งาน | ความมุ่งมั่น |
| **ข้อมูลครู** | วิชาที่สอน | บริบท |
| | จำนวนคำถาม | ความหลากหลาย |

---

## 3. Schema ข้อมูล

### 3.1 Schema การประเมินหลัก (v3.1)

```typescript
interface AssessmentRecord {
  // Metadata (ไม่ระบุตัวตนก่อนส่งออก)
  id: string;
  studentId: string;           // → hash ก่อน export
  courseId: string;
  questionId: string;
  sessionId: string;
  
  // คะแนน A.R.C.E.
  rubricScores: {
    analysis: number;          // 0-5
    reasoning: number;         // 0-5
    creativity: number;        // 0-5
    evidence: number;          // 0-5
  };
  totalScore: number;          // 0-20
  
  // การประเมิน LO
  loAssessment: {
    passedLOs: string[];       // ["LO1", "LO3"]
    analysis: string;          // เหตุผลจาก AI
    manuallyModified: boolean;
    modifiedBy?: string;
    modifiedAt?: Timestamp;
  };
  
  // Phase 2: AI Transparency
  chainOfThought?: {
    step1_summary: string;
    step2_evidence: {
      analysis: string;
      reasoning: string;
      creativity: string;
      evidence: string;
    };
    step3_anchor_match: string;
    step4_decision: string;
  };
  aiConfidence?: number;       // 0-100
  aiConfidenceReason?: string;
  
  // Audit Trail
  auditTrail?: {
    modelUsed: string;
    promptVersion: string;
    temperature: number;
    seed: number;
    rawResponseLength: number;
    parseAttempts: number;
    timestamp: string;
  };
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 3.2 Schema การส่งออก (ไม่ระบุตัวตน)

```typescript
interface AnonymizedExport {
  // Identifiers (hashed)
  anonStudentId: string;       // SHA-256 hash
  anonCourseId: string;        // SHA-256 hash
  
  // Demographics (generalized)
  gradeGroup: string;          // "ม.ต้น" | "ม.ปลาย"
  
  // คะแนน (preserved)
  analysis: number;
  reasoning: number;
  creativity: number;
  evidence: number;
  totalScore: number;
  
  // LO (count only)
  passedLOCount: number;
  targetLOCount: number;
  
  // AI Metrics (preserved)
  aiConfidence: number;
  
  // Temporal (generalized)
  weekOfYear: number;          // ไม่เก็บวันที่เฉพาะ
  dayOfWeek: number;           // 1-7
  hourOfDay: number;           // 0-23
}
```

---

## 4. การไม่ระบุตัวตน

### 4.1 เทคนิคที่ใช้

#### K-Anonymity

```javascript
// functions/utils/researchData.js
function ensureKAnonymity(data, k = 5) {
  // 1. Generalize quasi-identifiers
  const generalized = data.map(record => ({
    ...record,
    gradeGroup: generalizeGrade(record.grade),      // ม.2 → ม.ต้น
    ageGroup: generalizeAge(record.age),            // 14 → 13-15
    schoolRegion: generalizeLocation(record.school) // โรงเรียน → ภาค
  }));
  
  // 2. Check group sizes
  const groups = groupByQuasiIdentifiers(generalized);
  
  // 3. Suppress groups smaller than k
  return groups
    .filter(g => g.length >= k)
    .flat();
}
```

#### ID Hashing

```javascript
const crypto = require('crypto');

function hashIdentifier(id, salt) {
  return crypto
    .createHmac('sha256', salt)
    .update(id)
    .digest('hex')
    .substring(0, 16);  // Truncate for usability
}

// ตัวอย่าง
// "student123" → "a7f3b9c2d1e8f456"
```

#### Generalization Table

| ข้อมูลดั้งเดิม | Generalized | ระดับ |
|--------------|-------------|-------|
| ม.1 | ม.ต้น | 1 |
| ม.2 | ม.ต้น | 1 |
| ม.3 | ม.ต้น | 1 |
| ม.4 | ม.ปลาย | 1 |
| ม.5 | ม.ปลาย | 1 |
| ม.6 | ม.ปลาย | 1 |
| 2025-12-21 10:30:00 | Week 51, Sat, 10:00 | 2 |
| โรงเรียนวิทย์ฯ กรุงเทพ | ภาคกลาง | 2 |

### 4.2 ข้อมูลที่ลบออก (Suppression)

| ข้อมูล | เหตุผล |
|-------|-------|
| ชื่อ-นามสกุล | PII โดยตรง |
| อีเมล | PII โดยตรง |
| รหัสนักเรียน | Quasi-identifier |
| IP Address | Location identifier |
| User Agent | Device fingerprint |
| ชื่อโรงเรียน | Quasi-identifier |
| ชื่อครู | PII |

---

## 5. การส่งออกข้อมูล

### 5.1 รูปแบบที่รองรับ

| รูปแบบ | ใช้กับ | ข้อดี |
|--------|-------|-------|
| **JSON** | Python, JavaScript | โครงสร้างยืดหยุ่น |
| **CSV** | SPSS, Excel, R | ใช้ง่าย, เปิดกว้าง |
| **Parquet** | Big Data, Pandas | บีบอัดดี, เร็ว |
| **SPSS (.sav)** | SPSS โดยตรง | พร้อมใช้วิเคราะห์ |

### 5.2 ระดับการส่งออก

| ระดับ | K-Anonymity | ข้อมูลที่รวม | กลุ่มผู้ใช้ |
|-------|-------------|-------------|-----------|
| **Level 1 (Summary)** | k ≥ 20 | สถิติรวมเท่านั้น | สาธารณะ |
| **Level 2 (Aggregated)** | k ≥ 10 | รายวิชา/ห้อง | ครูทั่วไป |
| **Level 3 (Individual)** | k ≥ 5 | รายบุคคล (ไม่ระบุตัวตน) | นักวิจัย |
| **Level 4 (Full)** | ไม่ใช้ | ข้อมูลดิบ | เจ้าหน้าที่ระบบ |

### 5.3 API Endpoints

```javascript
// Cloud Functions

// Level 1: สรุปสถิติ
exports.exportSummaryStats = functions.https.onRequest(async (req, res) => {
  const { courseId, startDate, endDate } = req.body;
  
  const stats = await generateSummaryStats(courseId, startDate, endDate);
  
  return res.json({
    totalAssessments: stats.count,
    averageScores: stats.averages,
    distribution: stats.distribution
  });
});

// Level 3: ข้อมูลไม่ระบุตัวตน
exports.exportKAnonymousDataAPI = functions.https.onRequest(async (req, res) => {
  const { courseId, k = 5, format = 'json' } = req.body;
  
  // ตรวจสอบสิทธิ์
  const isAuthorized = await checkResearcherAccess(req.auth.uid);
  if (!isAuthorized) {
    return res.status(403).send({ error: 'Unauthorized' });
  }
  
  const rawData = await fetchAssessmentData(courseId);
  const anonymized = ensureKAnonymity(rawData, k);
  const exported = formatData(anonymized, format);
  
  return res.send(exported);
});
```

---

## 6. การวิเคราะห์ทางสถิติ

### 6.1 ฟังก์ชันที่มี

| ฟังก์ชัน | วัตถุประสงค์ | Output |
|---------|-------------|--------|
| `calculateIRR` | ความน่าเชื่อถือระหว่างผู้ประเมิน | α, κ, ICC |
| `calculateEffectSize` | Effect Size (Cohen's d) | d, interpretation |
| `correlationAnalysis` | ความสัมพันธ์ระหว่างตัวแปร | r, p-value, matrix |
| `descriptiveStats` | สถิติเชิงพรรณนา | mean, SD, skewness, kurtosis |
| `tTest` | เปรียบเทียบ 2 กลุ่ม | t, df, p |
| `anova` | เปรียบเทียบหลายกลุ่ม | F, df, p, effect size |

### 6.2 ตัวอย่างผลลัพธ์

#### Inter-Rater Reliability

```json
{
  "irrResults": {
    "krippendorffsAlpha": 0.82,
    "cohensKappa": {
      "analysis": 0.78,
      "reasoning": 0.75,
      "creativity": 0.68,
      "evidence": 0.81
    },
    "icc": 0.85,
    "interpretation": "ดีเยี่ยม - ยอมรับได้สำหรับการวิจัย"
  }
}
```

#### Effect Size (Pre-Post)

```json
{
  "effectSizeResults": {
    "cohensD": 0.72,
    "interpretation": "ปานกลาง-สูง",
    "confidenceInterval": [0.45, 0.99],
    "preTestMean": 10.5,
    "postTestMean": 14.2,
    "pooledSD": 5.1
  }
}
```

#### Correlation Matrix

```json
{
  "correlationMatrix": {
    "analysis_reasoning": { "r": 0.68, "p": 0.001 },
    "analysis_creativity": { "r": 0.52, "p": 0.001 },
    "analysis_evidence": { "r": 0.71, "p": 0.001 },
    "reasoning_creativity": { "r": 0.45, "p": 0.001 },
    "reasoning_evidence": { "r": 0.63, "p": 0.001 },
    "creativity_evidence": { "r": 0.38, "p": 0.001 }
  }
}
```

---

## 7. ตัวอย่างโค้ด

### 7.1 ส่งออกข้อมูลวิจัย

```javascript
// Frontend: src/views/ResearchExport.vue
import { exportResearchData } from '@/services/research';

async function handleExport() {
  const options = {
    courseId: selectedCourse.value,
    startDate: startDate.value,
    endDate: endDate.value,
    kLevel: 5,
    format: 'csv',
    includeFields: [
      'rubricScores',
      'totalScore',
      'passedLOCount',
      'aiConfidence',
      'weekOfYear'
    ]
  };
  
  try {
    const data = await exportResearchData(options);
    downloadFile(data, `research_export_${Date.now()}.csv`);
    showSuccess('ส่งออกข้อมูลสำเร็จ');
  } catch (error) {
    showError('ไม่สามารถส่งออกได้: ' + error.message);
  }
}
```

### 7.2 วิเคราะห์ IRR

```javascript
// Backend: functions/index.js
exports.calculateIRR = functions.https.onRequest(async (req, res) => {
  const { expertScores, aiScores, courseId } = req.body;
  
  // ถ้าไม่ส่ง scores มา ให้ดึงจาก golden dataset
  let expert = expertScores;
  let ai = aiScores;
  
  if (!expert || !ai) {
    const calibrationData = await getCalibrationData(courseId);
    expert = calibrationData.expertScores;
    ai = calibrationData.aiScores;
  }
  
  const results = {
    krippendorffsAlpha: calculateKrippendorffsAlpha(expert, ai),
    cohensKappa: {
      analysis: calculateWeightedKappa(expert.map(e => e.analysis), ai.map(a => a.analysis)),
      reasoning: calculateWeightedKappa(expert.map(e => e.reasoning), ai.map(a => a.reasoning)),
      creativity: calculateWeightedKappa(expert.map(e => e.creativity), ai.map(a => a.creativity)),
      evidence: calculateWeightedKappa(expert.map(e => e.evidence), ai.map(a => a.evidence))
    },
    icc: calculateICC(expert, ai),
    sampleSize: expert.length,
    timestamp: new Date().toISOString()
  };
  
  // บันทึกผลการตรวจสอบ
  await db.collection('irrReports').add(results);
  
  return res.json(results);
});
```

### 7.3 วิเคราะห์ด้วย Python

```python
# research_analysis.py
import pandas as pd
import numpy as np
from scipy import stats
import json

def load_research_data(filepath):
    """โหลดข้อมูลจากไฟล์ JSON หรือ CSV"""
    if filepath.endswith('.json'):
        return pd.read_json(filepath)
    elif filepath.endswith('.csv'):
        return pd.read_csv(filepath)
    else:
        raise ValueError("รูปแบบไฟล์ไม่รองรับ")

def analyze_arce_distribution(df):
    """วิเคราะห์การกระจายคะแนน A.R.C.E."""
    dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    
    results = {}
    for dim in dimensions:
        results[dim] = {
            'mean': df[dim].mean(),
            'std': df[dim].std(),
            'median': df[dim].median(),
            'skewness': df[dim].skew(),
            'kurtosis': df[dim].kurtosis()
        }
    
    return results

def calculate_effect_size(pre_scores, post_scores):
    """คำนวณ Cohen's d"""
    n1, n2 = len(pre_scores), len(post_scores)
    var1, var2 = pre_scores.var(), post_scores.var()
    
    # Pooled standard deviation
    pooled_std = np.sqrt(((n1-1)*var1 + (n2-1)*var2) / (n1+n2-2))
    
    # Cohen's d
    d = (post_scores.mean() - pre_scores.mean()) / pooled_std
    
    # Interpretation
    if abs(d) < 0.2:
        interpretation = "เล็กมาก"
    elif abs(d) < 0.5:
        interpretation = "เล็ก"
    elif abs(d) < 0.8:
        interpretation = "ปานกลาง"
    else:
        interpretation = "ใหญ่"
    
    return {
        'cohens_d': d,
        'interpretation': interpretation,
        'pre_mean': pre_scores.mean(),
        'post_mean': post_scores.mean(),
        'pooled_std': pooled_std
    }

def correlation_analysis(df, variables):
    """วิเคราะห์ความสัมพันธ์ระหว่างตัวแปร"""
    correlation_matrix = df[variables].corr()
    
    results = {}
    for i, var1 in enumerate(variables):
        for j, var2 in enumerate(variables):
            if i < j:  # Upper triangle only
                r, p = stats.pearsonr(df[var1], df[var2])
                results[f"{var1}_{var2}"] = {
                    'r': r,
                    'p_value': p,
                    'significant': p < 0.05
                }
    
    return results

# ตัวอย่างการใช้งาน
if __name__ == "__main__":
    # โหลดข้อมูล
    df = load_research_data('research_export.csv')
    
    # วิเคราะห์การกระจาย
    distribution = analyze_arce_distribution(df)
    print("การกระจายคะแนน A.R.C.E.:")
    print(json.dumps(distribution, indent=2, ensure_ascii=False))
    
    # วิเคราะห์ความสัมพันธ์
    variables = ['analysis', 'reasoning', 'creativity', 'evidence', 'totalScore']
    correlations = correlation_analysis(df, variables)
    print("\nความสัมพันธ์:")
    print(json.dumps(correlations, indent=2))
```

### 7.4 วิเคราะห์ด้วย R

```r
# research_analysis.R
library(tidyverse)
library(psych)
library(irr)

# โหลดข้อมูล
data <- read_csv("research_export.csv")

# สถิติเชิงพรรณนา
describe(data %>% select(analysis, reasoning, creativity, evidence))

# Cronbach's Alpha สำหรับ internal consistency
alpha_result <- alpha(data %>% select(analysis, reasoning, creativity, evidence))
print(alpha_result)

# ICC สำหรับ inter-rater reliability
icc_result <- icc(data %>% select(expert_score, ai_score), 
                   model = "twoway", 
                   type = "agreement")
print(icc_result)

# Paired t-test สำหรับ pre-post
pre_post <- t.test(data$post_score, data$pre_score, paired = TRUE)
print(pre_post)

# Cohen's d
cohens_d <- (mean(data$post_score) - mean(data$pre_score)) / 
            sd(data$post_score - data$pre_score)
print(paste("Cohen's d:", round(cohens_d, 3)))
```

---

## 8. การปฏิบัติตามจริยธรรม

### 8.1 หลักการ PDPA

| หลักการ | การนำไปใช้ | สถานะ |
|---------|-----------|-------|
| ความยินยอม | ขอความยินยอมก่อนเก็บข้อมูล | ✅ |
| วัตถุประสงค์จำกัด | ใช้เพื่อการศึกษาเท่านั้น | ✅ |
| ข้อมูลน้อยที่สุด | เก็บเฉพาะที่จำเป็น | ✅ |
| ความถูกต้อง | ตรวจสอบความถูกต้อง | ✅ |
| ความปลอดภัย | 5 ชั้นการป้องกัน | ✅ |
| สิทธิเจ้าของข้อมูล | เข้าถึง/แก้ไข/ลบได้ | ✅ |

### 8.2 ขั้นตอนขอใช้ข้อมูล

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ขั้นตอนขอใช้ข้อมูลวิจัย                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. ส่งคำขอ                                                              │
│     • ระบุวัตถุประสงค์วิจัย                                               │
│     • ระบุข้อมูลที่ต้องการ                                                │
│     • ระบุระดับการไม่ระบุตัวตน                                            │
│                              ↓                                          │
│  2. ตรวจสอบโดยคณะกรรมการ                                                 │
│     • ตรวจสอบจริยธรรมวิจัย                                               │
│     • ตรวจสอบความปลอดภัยข้อมูล                                           │
│     • อนุมัติ/ปฏิเสธ                                                     │
│                              ↓                                          │
│  3. ลงนามข้อตกลง (DUA)                                                   │
│     • ข้อจำกัดการใช้                                                     │
│     • ระยะเวลาการเก็บรักษา                                               │
│     • การทำลายข้อมูล                                                    │
│                              ↓                                          │
│  4. รับข้อมูล                                                            │
│     • ส่งทาง secure channel                                             │
│     • รูปแบบที่ร้องขอ                                                    │
│     • พร้อม data dictionary                                             │
│                              ↓                                          │
│  5. รายงานผล                                                             │
│     • ส่งผลวิจัยกลับ                                                     │
│     • ยืนยันการทำลายข้อมูล                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Data Use Agreement (DUA)

```markdown
## ข้อตกลงการใช้ข้อมูลวิจัย

**ผู้ขอใช้ข้อมูล:** ____________________
**สังกัด:** ____________________
**วัตถุประสงค์:** ____________________

### ข้อตกลง

1. **การใช้งาน**
   - ใช้เพื่อวัตถุประสงค์ที่ระบุเท่านั้น
   - ไม่พยายามระบุตัวบุคคล
   - ไม่แชร์กับบุคคลที่สาม

2. **การเก็บรักษา**
   - เก็บอย่างปลอดภัย
   - เข้าถึงเฉพาะผู้ได้รับอนุญาต
   - ลบภายใน ___ เดือนหลังเสร็จสิ้น

3. **การรายงาน**
   - ส่งผลวิจัยให้ผู้ให้ข้อมูล
   - ไม่เผยแพร่ข้อมูลดิบ

**ลงนาม:** ____________________
**วันที่:** ____________________
```

---

## 📊 สรุป

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ท่อส่งข้อมูลงานวิจัย v3.1                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  แหล่งข้อมูล:                                                         │
│  • assessments        15,000+ เอกสาร                                 │
│  • worksheetSubmissions  5,000+ เอกสาร                               │
│  • sessions           3,000+ เอกสาร                                  │
│                                                                      │
│  การไม่ระบุตัวตน:                                                      │
│  ✅ K-Anonymity (k ≥ 5)                                              │
│  ✅ ID Hashing (SHA-256)                                             │
│  ✅ Generalization                                                   │
│  ✅ Suppression                                                      │
│                                                                      │
│  รูปแบบส่งออก:                                                        │
│  ✅ JSON                                                             │
│  ✅ CSV (with BOM for Thai)                                          │
│  ✅ Parquet                                                          │
│                                                                      │
│  การวิเคราะห์:                                                        │
│  ✅ IRR (Krippendorff's α, Cohen's κ, ICC)                           │
│  ✅ Effect Size (Cohen's d)                                          │
│  ✅ Correlation                                                      │
│  ✅ Descriptive Statistics                                           │
│                                                                      │
│  สถานะ PDPA: ✅ สอดคล้อง 11/11 เกณฑ์                                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

<div align="center">

**ท่อส่งข้อมูลงานวิจัย — HOTS AI ChatLoop**

*เวอร์ชัน 3.2 | 2 มกราคม 2569*

*สำหรับนักวิจัยที่ต้องการใช้ข้อมูลเพื่อพัฒนาการศึกษา*

</div>
