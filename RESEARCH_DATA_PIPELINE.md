# 🔬 Research Data Pipeline — Complete Documentation

<div align="center">

**Schema Version 3.1** | **Last Updated: December 31, 2025**

*Comprehensive guide for exporting and analyzing research data from HOTS AI ChatLoop*

</div>

---

## 📑 Table of Contents

1. [Overview](#1-overview)
2. [Data Schema v3.1](#2-data-schema-v31)
3. [Collections Reference](#3-collections-reference)
4. [API Endpoints](#4-api-endpoints)
5. [Export Formats](#5-export-formats)
6. [Privacy & Anonymization](#6-privacy--anonymization)
7. [Analysis Examples](#7-analysis-examples)
8. [Statistical Methods](#8-statistical-methods)
9. [Data Dictionary](#9-data-dictionary)

---

## 1. Overview

### Purpose

ระบบ Research Data Pipeline ออกแบบมาเพื่อ:

1. **Academic Research** — วิจัยเชิงปริมาณ/คุณภาพด้านการประเมินการคิดขั้นสูง
2. **Policy Decision** — ข้อมูลสนับสนุนการตัดสินใจระดับนโยบาย
3. **System Improvement** — พัฒนาความแม่นยำของ AI
4. **Learning Analytics** — วิเคราะห์พฤติกรรมการเรียนรู้

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Flat Structure** | No nested objects in export — compatible with SPSS, Stata |
| **Privacy by Design** | K-Anonymity, no PII in exports |
| **Reproducibility** | Deterministic AI (temperature=0, seed=42) |
| **Auditability** | Full audit trail in every assessment |
| **Interoperability** | CSV, JSON, SPSS-ready formats |

### Architecture

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

---

## 2. Data Schema v3.1

### Schema Changes Log

| Version | Date | Changes |
|---------|------|---------|
| v3.1 | 2025-12-21 | Added chainOfThought, aiConfidence fields |
| v3.0 | 2025-11-15 | Added worksheetSubmissions integration |
| v2.0 | 2025-09-01 | Flat structure for SPSS compatibility |
| v1.0 | 2025-06-01 | Initial schema |

### Core Schema: learningEvents

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
  assessmentType: "chat" | "worksheet",
  questionId: "q_456",
  questionDifficulty: 1-5,
  bloomLevel: "analyze" | "evaluate" | "create",
  topic: "การเปลี่ยนแปลงสภาพภูมิอากาศ",
  
  // === A.R.C.E. Scores (0-5 each) ===
  scoreAnalysis: 4,
  scoreReasoning: 3,
  scoreCreativity: 4,
  scoreEvidence: 3,
  scoreTotal: 14,                     // Sum 0-20
  
  // === Phase 2: AI Precision ===
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
  modelUsed: "gpt-4o-mini",
  promptVersion: "v3.0-cot-confidence",
  temperature: 0,
  seed: 42
}
```

### Growth Schema: studentGrowthHistory

```javascript
// Collection: studentGrowthHistory (Longitudinal data)
{
  growthId: "grw_001",
  anonymousStudentId: "STU_001",
  courseId: "course_xyz",
  
  // === Time Period ===
  periodStart: "2025-09-01",
  periodEnd: "2025-12-21",
  periodWeek: 15,                     // Week number in course
  
  // === Cumulative Scores ===
  avgAnalysis: 3.5,
  avgReasoning: 3.2,
  avgCreativity: 3.8,
  avgEvidence: 3.4,
  avgTotal: 13.9,
  
  // === Growth Metrics ===
  analysisGrowth: 0.8,                // Change from previous period
  reasoningGrowth: 0.5,
  creativityGrowth: 1.2,
  evidenceGrowth: 0.6,
  totalGrowth: 3.1,
  
  // === Learning Outcomes ===
  totalLOsInCourse: 10,
  losPassed: 7,
  losPassedRate: 70,
  newLosPassed: 2,                    // New this period
  
  // === Engagement Metrics ===
  assessmentCount: 15,
  worksheetCount: 3,
  totalActivities: 18,
  avgResponseLength: 185,
  avgTimeSpent: 165,
  
  // === Streak & Gamification ===
  currentStreak: 5,
  maxStreak: 12,
  totalPoints: 450,
  level: 8
}
```

### Sequential Schema: learningSequences

```javascript
// Collection: learningSequences (Temporal pattern analysis)
{
  sequenceId: "seq_001",
  anonymousStudentId: "STU_001",
  courseId: "course_xyz",
  
  // === Sequence Pattern ===
  eventSequence: ["chat", "chat", "worksheet", "chat"],
  scoreSequence: [12, 14, 16, 15],
  loSequence: [0, 1, 2, 2],           // Cumulative LOs passed
  
  // === Transition Matrix ===
  transitionChatToChat: 0.6,
  transitionChatToWorksheet: 0.4,
  transitionWorksheetToChat: 0.8,
  transitionWorksheetToWorksheet: 0.2,
  
  // === Pattern Metrics ===
  sequenceLength: 4,
  avgScoreTrend: 0.75,                // Positive = improving
  variability: 1.5,                   // Standard deviation
  longestImprovementStreak: 3,
  
  // === Time Patterns ===
  avgTimeBetweenEvents: 86400,        // Seconds (1 day)
  preferredDayOfWeek: "Monday",
  preferredHourOfDay: 16,
  regularityScore: 75                 // 0-100
}
```

---

## 3. Collections Reference

### Source Collections

| Collection | Records | Purpose | Update Frequency |
|------------|---------|---------|------------------|
| `assessments` | ~100K+ | Chat A.R.C.E. scores | Real-time |
| `worksheetSubmissions` | ~50K+ | Worksheet A.R.C.E. scores | Real-time |
| `studentProgress` | ~10K+ | Aggregated progress | On assessment |
| `sessions` | ~30K+ | Session metadata | On session end |
| `users` | ~5K+ | Demographics | On profile update |
| `courses` | ~500+ | Course & LO definitions | On course edit |
| `questions` | ~5K+ | Question bank | On question edit |

### Research Collections

| Collection | Purpose | Population Method |
|------------|---------|-------------------|
| `learningEvents` | Individual assessment events | `exportResearchData` function |
| `studentGrowthHistory` | Longitudinal progress | `generateGrowthHistory` scheduled |
| `learningSequences` | Temporal patterns | `analyzeLearningSequences` scheduled |
| `aggregatedMetrics` | Statistical summaries | `dailyConsistencyCheck` scheduled |

### Collection Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    COLLECTION RELATIONSHIPS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  users                                                                  │
│    │                                                                    │
│    ├──< courses (teacherId = users.uid)                                │
│    │       │                                                           │
│    │       ├──< questions (courseId = courses.id)                      │
│    │       │                                                           │
│    │       ├──< assessments (courseId = courses.id)                    │
│    │       │       │                                                   │
│    │       │       └──< messages (assessmentId = assessments.id)       │
│    │       │                                                           │
│    │       ├──< worksheetSubmissions (courseId = courses.id)           │
│    │       │                                                           │
│    │       └──< studentProgress (courseId = courses.id)                │
│    │                                                                    │
│    └──< sessions (studentId = users.uid)                               │
│                                                                         │
│  Legend: ──< means "has many"                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. API Endpoints

### Export Functions

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/exportResearchData` | POST | Export research-ready data | Admin |
| `/exportKAnonymousDataAPI` | POST | K-Anonymity export | Admin |
| `/calculateIRR` | POST | Inter-Rater Reliability | Admin |
| `/irrReport` | POST | Detailed IRR report | Admin |
| `/calculateEffectSize` | POST | Cohen's d calculation | Admin |
| `/correlationAnalysis` | POST | Variable correlation | Admin |
| `/getResearchMetrics` | GET | Dashboard metrics | Admin |

### exportResearchData

**Request:**
```json
{
  "courseId": "course_xyz",
  "startDate": "2025-09-01",
  "endDate": "2025-12-21",
  "format": "csv" | "json" | "spss",
  "includeWorksheets": true,
  "kAnonymity": 5
}
```

**Response:**
```json
{
  "success": true,
  "recordCount": 1234,
  "downloadUrl": "https://storage.../export_20251221.csv",
  "suppressedGroups": 3,
  "schema": "v3.1"
}
```

### exportKAnonymousDataAPI

**Request:**
```json
{
  "courseId": "course_xyz",
  "k": 5,
  "level": "assessment" | "student" | "class",
  "quasiIdentifiers": ["gradeLevel", "section", "schoolId"],
  "sensitiveAttributes": ["scoreTotal", "loPassed"]
}
```

**Response:**
```json
{
  "success": true,
  "originalRecords": 1500,
  "kAnonymousRecords": 1423,
  "suppressedRecords": 77,
  "generalizationApplied": ["section → gradeLevel"],
  "downloadUrl": "https://storage.../k5_export.csv"
}
```

### calculateEffectSize

**Request:**
```json
{
  "preScores": [10, 12, 11, 13, 9, 14, 10, 12],
  "postScores": [14, 15, 13, 16, 12, 17, 14, 15],
  "method": "cohens_d" | "hedges_g"
}
```

**Response:**
```json
{
  "effectSize": 1.23,
  "interpretation": "Large",
  "confidenceInterval": [0.89, 1.57],
  "preStats": { "mean": 11.375, "sd": 1.69 },
  "postStats": { "mean": 14.5, "sd": 1.60 }
}
```

---

## 5. Export Formats

### CSV Format (SPSS/Excel Compatible)

```csv
eventId,anonymousStudentId,courseId,gradeLevel,assessmentType,scoreAnalysis,scoreReasoning,scoreCreativity,scoreEvidence,scoreTotal,aiConfidence,timestamp
evt_001,STU_001,course_xyz,ม.4,chat,4,3,4,3,14,85,2025-12-21T10:30:00Z
evt_002,STU_001,course_xyz,ม.4,worksheet,3,4,3,4,14,78,2025-12-21T14:15:00Z
evt_003,STU_002,course_xyz,ม.4,chat,5,4,5,4,18,92,2025-12-21T09:00:00Z
```

**Thai Character Support:**
```javascript
// Always include BOM for UTF-8 Thai characters
const BOM = '\uFEFF';
const csvContent = 'eventId,gradeLevel,topic\nevt_001,ม.4,การเปลี่ยนแปลงสภาพภูมิอากาศ';
const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
```

### JSON Format (Analysis Ready)

```json
{
  "schemaVersion": "3.1",
  "exportDate": "2025-12-21T12:00:00Z",
  "recordCount": 1234,
  "data": [
    {
      "eventId": "evt_001",
      "anonymousStudentId": "STU_001",
      "courseId": "course_xyz",
      "gradeLevel": "ม.4",
      "assessmentType": "chat",
      "scoreAnalysis": 4,
      "scoreReasoning": 3,
      "scoreCreativity": 4,
      "scoreEvidence": 3,
      "scoreTotal": 14,
      "aiConfidence": 85,
      "timestamp": "2025-12-21T10:30:00Z"
    }
  ]
}
```

### SPSS-Ready Format

```javascript
// Variable labels (Thai)
const variableLabels = {
  scoreAnalysis: "คะแนนการวิเคราะห์ (0-5)",
  scoreReasoning: "คะแนนการให้เหตุผล (0-5)",
  scoreCreativity: "คะแนนความคิดสร้างสรรค์ (0-5)",
  scoreEvidence: "คะแนนการใช้หลักฐาน (0-5)",
  scoreTotal: "คะแนนรวม (0-20)"
};

// Value labels
const valueLabels = {
  gradeLevel: {
    1: "ป.4-6",
    2: "ม.1-3",
    3: "ม.4-6"
  },
  assessmentType: {
    1: "chat",
    2: "worksheet"
  }
};
```

---

## 6. Privacy & Anonymization

### K-Anonymity Implementation

```javascript
// functions/utils/researchData.js
function applyKAnonymity(data, k = 5, quasiIdentifiers) {
  // Group by quasi-identifiers
  const groups = groupBy(data, quasiIdentifiers);
  
  const anonymizedData = [];
  const suppressedGroups = [];
  
  for (const [key, group] of Object.entries(groups)) {
    if (group.length >= k) {
      // Keep group — meets k threshold
      anonymizedData.push(...group);
    } else {
      // Suppress group — too small
      suppressedGroups.push({
        key,
        count: group.length,
        reason: `Group size ${group.length} < k=${k}`
      });
    }
  }
  
  return {
    data: anonymizedData,
    suppressedGroups,
    originalCount: data.length,
    anonymizedCount: anonymizedData.length
  };
}
```

### Generalization Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    GENERALIZATION HIERARCHY                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Location:                                                              │
│  schoolId → esaId → regionId → "All Schools"                           │
│                                                                         │
│  Grade:                                                                 │
│  "ม.4/1" → "ม.4" → "ม.4-6" → "มัธยม" → "All Grades"                   │
│                                                                         │
│  Time:                                                                  │
│  "2025-12-21 10:30" → "2025-12-21" → "2025-12" → "2025 Q4"            │
│                                                                         │
│  Age:                                                                   │
│  "15" → "14-16" → "มัธยมต้น" → "All Ages"                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Masking

| Field | Original | Masked |
|-------|----------|--------|
| `email` | student@example.com | ❌ Removed |
| `displayName` | นายทดสอบ | ❌ Removed |
| `studentId` | 12345 | ❌ Removed |
| `uid` | firebase-uid | → `STU_001` (sequential) |
| `schoolId` | actual-id | → `SCH_001` (random) |
| `timestamp` | 10:30:45 | → 10:00:00 (hour bucket) |

---

## 7. Analysis Examples

### Python: Load & Analyze

```python
import pandas as pd
import numpy as np
from scipy import stats

# Load data
df = pd.read_csv('learningEvents_export.csv', encoding='utf-8-sig')

# Basic statistics
print(df[['scoreAnalysis', 'scoreReasoning', 'scoreCreativity', 'scoreEvidence']].describe())

# Correlation matrix
correlation = df[['scoreAnalysis', 'scoreReasoning', 'scoreCreativity', 'scoreEvidence']].corr()
print(correlation)

# A.R.C.E. Score Distribution
import matplotlib.pyplot as plt

fig, axes = plt.subplots(2, 2, figsize=(12, 10))
dimensions = ['scoreAnalysis', 'scoreReasoning', 'scoreCreativity', 'scoreEvidence']
titles = ['Analysis', 'Reasoning', 'Creativity', 'Evidence']

for ax, dim, title in zip(axes.flat, dimensions, titles):
    ax.hist(df[dim], bins=6, range=(-0.5, 5.5), edgecolor='black')
    ax.set_xlabel('Score (0-5)')
    ax.set_ylabel('Frequency')
    ax.set_title(f'{title} Distribution')
    ax.set_xticks(range(6))

plt.tight_layout()
plt.savefig('arce_distribution.png', dpi=150)
```

### Python: Growth Analysis

```python
# Load growth data
growth_df = pd.read_csv('studentGrowthHistory_export.csv', encoding='utf-8-sig')

# Average growth by week
weekly_growth = growth_df.groupby('periodWeek').agg({
    'avgAnalysis': 'mean',
    'avgReasoning': 'mean',
    'avgCreativity': 'mean',
    'avgEvidence': 'mean',
    'avgTotal': 'mean'
}).reset_index()

# Plot growth trajectory
plt.figure(figsize=(10, 6))
plt.plot(weekly_growth['periodWeek'], weekly_growth['avgTotal'], marker='o')
plt.xlabel('Week')
plt.ylabel('Average Total Score')
plt.title('Learning Growth Trajectory')
plt.grid(True)
plt.savefig('growth_trajectory.png', dpi=150)
```

### Python: Effect Size

```python
from scipy.stats import ttest_rel

# Pre-Post comparison
pre_scores = df[df['periodWeek'] == 1]['avgTotal'].values
post_scores = df[df['periodWeek'] == 15]['avgTotal'].values

# Paired t-test
t_stat, p_value = ttest_rel(pre_scores, post_scores)
print(f"Paired t-test: t={t_stat:.3f}, p={p_value:.4f}")

# Cohen's d
def cohens_d(pre, post):
    n = len(pre)
    diff = post - pre
    return diff.mean() / diff.std()

effect = cohens_d(pre_scores, post_scores)
print(f"Cohen's d: {effect:.3f}")

# Interpretation
if abs(effect) < 0.2:
    interpretation = "Small"
elif abs(effect) < 0.5:
    interpretation = "Medium"
elif abs(effect) < 0.8:
    interpretation = "Large"
else:
    interpretation = "Very Large"
    
print(f"Effect size interpretation: {interpretation}")
```

### R: Statistical Analysis

```r
# Load data
library(tidyverse)
library(psych)

data <- read_csv("learningEvents_export.csv")

# Reliability analysis (Cronbach's alpha)
arce_items <- data %>% 
  select(scoreAnalysis, scoreReasoning, scoreCreativity, scoreEvidence)

alpha_result <- alpha(arce_items)
print(alpha_result)

# Factor analysis
fa_result <- fa(arce_items, nfactors = 1, fm = "ml")
print(fa_result)

# Mixed effects model for growth
library(lme4)

growth_data <- read_csv("studentGrowthHistory_export.csv")

model <- lmer(avgTotal ~ periodWeek + (1 + periodWeek | anonymousStudentId),
              data = growth_data)

summary(model)
```

### SPSS: Import & Analyze

```spss
* Import CSV with Thai characters
GET DATA
  /TYPE=TXT
  /FILE='learningEvents_export.csv'
  /ENCODING='UTF8'
  /DELIMITERS=","
  /QUALIFIER='"'
  /ARRANGEMENT=DELIMITED
  /FIRSTCASE=2
  /VARIABLES=
    eventId A20
    anonymousStudentId A10
    courseId A20
    gradeLevel A10
    scoreAnalysis F1
    scoreReasoning F1
    scoreCreativity F1
    scoreEvidence F1
    scoreTotal F2.
    
* Variable labels
VARIABLE LABELS
  scoreAnalysis 'คะแนนการวิเคราะห์ (0-5)'
  scoreReasoning 'คะแนนการให้เหตุผล (0-5)'
  scoreCreativity 'คะแนนความคิดสร้างสรรค์ (0-5)'
  scoreEvidence 'คะแนนการใช้หลักฐาน (0-5)'
  scoreTotal 'คะแนนรวม (0-20)'.

* Descriptive statistics
DESCRIPTIVES VARIABLES=scoreAnalysis scoreReasoning scoreCreativity scoreEvidence scoreTotal
  /STATISTICS=MEAN STDDEV MIN MAX.

* Reliability analysis
RELIABILITY
  /VARIABLES=scoreAnalysis scoreReasoning scoreCreativity scoreEvidence
  /SCALE('A.R.C.E.') ALL
  /MODEL=ALPHA.
```

---

## 8. Statistical Methods

### Inter-Rater Reliability (IRR)

| Method | Use Case | Threshold |
|--------|----------|-----------|
| Cohen's Kappa | 2 raters, nominal | κ ≥ 0.61 |
| Weighted Kappa | 2 raters, ordinal | κw ≥ 0.61 |
| Fleiss' Kappa | 3+ raters | κ ≥ 0.61 |
| ICC (2,k) | Continuous scores | ICC ≥ 0.75 |

### Effect Size

| Method | Formula | Interpretation |
|--------|---------|----------------|
| Cohen's d | (M₂ - M₁) / SD_pooled | 0.2=Small, 0.5=Medium, 0.8=Large |
| Hedges' g | (M₂ - M₁) / SD_pooled × J | Corrected for small samples |
| Glass's Δ | (M₂ - M₁) / SD₁ | Uses control group SD |

### Reliability

| Method | Purpose | Threshold |
|--------|---------|-----------|
| Cronbach's α | Internal consistency | α ≥ 0.70 |
| Split-half | Test reliability | r ≥ 0.70 |
| Test-retest | Temporal stability | r ≥ 0.70 |

### Growth Modeling

```
Linear Growth Model:
  Score_it = β₀ + β₁*Time_t + u_i + ε_it

Where:
  β₀ = Initial score (intercept)
  β₁ = Growth rate (slope)
  u_i = Random effect for student i
  ε_it = Residual error

Interpretation:
  β₁ > 0 indicates positive growth
  Variance(u_i) indicates individual differences in growth
```

---

## 9. Data Dictionary

### learningEvents Fields

| Field | Type | Description | Values |
|-------|------|-------------|--------|
| `eventId` | String | Unique event identifier | `evt_001`, `evt_002`, ... |
| `anonymousStudentId` | String | K-Anonymous student ID | `STU_001`, `STU_002`, ... |
| `courseId` | String | Course identifier | Firebase document ID |
| `sessionId` | String | Session identifier | Firebase document ID |
| `gradeLevel` | String | Student grade level | `ป.4-6`, `ม.1-3`, `ม.4-6` |
| `section` | String | Class section (may be suppressed) | `วิทย์-คณิต`, `ศิลป์-ภาษา` |
| `schoolId` | String | Anonymized school ID | `SCH_001`, `SCH_002`, ... |
| `esaId` | String | Educational Service Area | `ESA_001`, `ESA_002`, ... |
| `assessmentType` | String | Type of assessment | `chat`, `worksheet` |
| `questionId` | String | Question identifier | Firebase document ID |
| `questionDifficulty` | Integer | Difficulty level | 1-5 |
| `bloomLevel` | String | Bloom's Taxonomy level | `analyze`, `evaluate`, `create` |
| `topic` | String | Topic/subject matter | Free text |
| `scoreAnalysis` | Integer | Analysis dimension score | 0-5 |
| `scoreReasoning` | Integer | Reasoning dimension score | 0-5 |
| `scoreCreativity` | Integer | Creativity dimension score | 0-5 |
| `scoreEvidence` | Integer | Evidence dimension score | 0-5 |
| `scoreTotal` | Integer | Sum of 4 dimensions | 0-20 |
| `aiConfidence` | Integer | AI confidence in scoring | 0-100 |
| `aiConfidenceReason` | String | Reason for confidence level | Free text |
| `loAssessed` | String (JSON) | LOs assessed in this event | `["LO1", "LO2"]` |
| `loPassed` | String (JSON) | LOs passed in this event | `["LO1"]` |
| `loCount` | Integer | Number of LOs assessed | 0-10 |
| `loPassedCount` | Integer | Number of LOs passed | 0-10 |
| `responseLength` | Integer | Character count of response | 0-5000 |
| `timeSpent` | Integer | Seconds spent on task | 0-3600 |
| `attemptNumber` | Integer | Attempt number for question | 1, 2, 3, ... |
| `copyPasteDetected` | Boolean | Copy-paste detected | true/false |
| `aiGeneratedDetected` | Boolean | AI-generated content detected | true/false |
| `integrityScore` | Integer | Overall integrity score | 0-100 |
| `timestamp` | String | ISO 8601 timestamp | `2025-12-21T10:30:00Z` |
| `timestampEpoch` | Integer | Unix timestamp | 1734778200 |
| `dayOfWeek` | String | Day of week | `Monday`, `Tuesday`, ... |
| `hourOfDay` | Integer | Hour of day (24h) | 0-23 |
| `weekOfYear` | Integer | Week number | 1-52 |
| `modelUsed` | String | AI model used | `gpt-4o-mini` |
| `promptVersion` | String | Prompt version | `v3.0-cot-confidence` |
| `temperature` | Float | AI temperature setting | 0, 0.1, ... |
| `seed` | Integer | AI random seed | 42 |

### studentGrowthHistory Fields

| Field | Type | Description | Values |
|-------|------|-------------|--------|
| `growthId` | String | Unique growth record ID | `grw_001`, `grw_002`, ... |
| `anonymousStudentId` | String | K-Anonymous student ID | `STU_001`, `STU_002`, ... |
| `courseId` | String | Course identifier | Firebase document ID |
| `periodStart` | String | Period start date | `2025-09-01` |
| `periodEnd` | String | Period end date | `2025-12-21` |
| `periodWeek` | Integer | Week number in course | 1-20 |
| `avgAnalysis` | Float | Average analysis score | 0.0-5.0 |
| `avgReasoning` | Float | Average reasoning score | 0.0-5.0 |
| `avgCreativity` | Float | Average creativity score | 0.0-5.0 |
| `avgEvidence` | Float | Average evidence score | 0.0-5.0 |
| `avgTotal` | Float | Average total score | 0.0-20.0 |
| `analysisGrowth` | Float | Analysis growth from previous | -5.0 to 5.0 |
| `reasoningGrowth` | Float | Reasoning growth | -5.0 to 5.0 |
| `creativityGrowth` | Float | Creativity growth | -5.0 to 5.0 |
| `evidenceGrowth` | Float | Evidence growth | -5.0 to 5.0 |
| `totalGrowth` | Float | Total growth | -20.0 to 20.0 |
| `totalLOsInCourse` | Integer | Total LOs in course | 1-50 |
| `losPassed` | Integer | LOs passed cumulative | 0-50 |
| `losPassedRate` | Float | Percentage of LOs passed | 0-100 |
| `newLosPassed` | Integer | New LOs passed this period | 0-10 |
| `assessmentCount` | Integer | Assessments this period | 0-100 |
| `worksheetCount` | Integer | Worksheets this period | 0-50 |
| `totalActivities` | Integer | Total activities | 0-150 |
| `avgResponseLength` | Float | Avg response length | 0-1000 |
| `avgTimeSpent` | Float | Avg time per activity | 0-3600 |
| `currentStreak` | Integer | Current activity streak | 0-365 |
| `maxStreak` | Integer | Maximum streak achieved | 0-365 |
| `totalPoints` | Integer | Gamification points | 0-10000 |
| `level` | Integer | Gamification level | 1-100 |

---

## 📊 Quick Reference

### Export Commands

```bash
# Export via Firebase Functions
curl -X POST https://us-central1-hots-ai-d028b.cloudfunctions.net/exportResearchData \
  -H "Content-Type: application/json" \
  -d '{"courseId": "course_xyz", "format": "csv", "kAnonymity": 5}'

# Export via Admin Panel
# Go to /admin/research → Export Data → Select options → Download
```

### Recommended Workflow

```
1. Define research questions
2. Select relevant collections
3. Choose anonymization level (k=5, 10, 20)
4. Export data (CSV/JSON)
5. Validate data quality
6. Run statistical analysis
7. Document methodology
```

### Contact

For research data access requests, contact:
- **Technical**: via GitHub Issues
- **Administrative**: via project admin

---

<div align="center">

**HOTS AI ChatLoop — Research Data Pipeline**

*Schema Version 3.1 | December 31, 2025*

</div>
