# 🔬 Research Data Pipeline - HOTS AI

## Overview

ระบบเก็บข้อมูลเพื่องานวิจัยตลอดการทำงานอย่างยั่งยืน ออกแบบให้สร้าง Impact ได้จริง ชัดเจน แม่นยำ และน่าเชื่อถือ

**Schema Version: 3.0** (December 2025)

### 🆕 What's New in v3.0
- **Time on Task Metrics**: ตัวแปรเวลาในการทำงาน
- **Scaffolding Metrics**: ข้อมูลการขอ hint และ probing questions
- **Baseline Data**: Pre-test และ prior experience
- **Sequential Pattern Mining**: วิเคราะห์ลำดับพฤติกรรมการเรียนรู้
- **K-Anonymity Export**: Privacy-preserving data export
- **Research Readiness v2**: Power Analysis และ Statistical Requirements

---

## 🎯 Design Principles

### 1. **Flat Schema Design**
ข้อมูลถูกออกแบบให้เป็น Flat Structure เพื่อ:
- Export ตรงไป SPSS/Stata/Python ได้ทันที
- ไม่ต้อง flatten nested JSON
- รองรับ Pandas DataFrame โดยตรง

### 2. **Automatic Collection**
ทุก Learning Event ถูกบันทึกอัตโนมัติ:
- ไม่ต้อง manual logging
- ไม่กระทบ performance (non-blocking)
- ครบถ้วนทุก interaction

### 3. **Longitudinal Ready**
รองรับการวิเคราะห์ระยะยาว:
- Time series data
- Growth tracking
- Pre/Post intervention

---

## 📊 Collections & Schema

### 1. `learningEvents` - Learning Event Log
```javascript
{
  // Identifiers (Flat)
  studentId: "uid123",
  courseId: "course456",
  eventType: "CHAT_ASSESSMENT", // enum
  timestamp: "2024-01-15T10:30:00.000Z",
  
  // Scores (Flat for SPSS)
  score_analysis: 4,
  score_reasoning: 3,
  score_creativity: 5,
  score_evidence: 4,
  score_average: 4.0,
  score_total: 16,
  score_max: 20,
  
  // LO Data (Flat)
  lo_passed_count: 2,
  lo_passed_ids: "LO1,LO2",  // comma-separated for CSV
  
  // Context
  questionId: "q789",
  sessionId: "sess123",
  worksheetId: null,
  
  // 🔴 NEW v3.0: Time on Task (Required for Scaffolding Research)
  timeOnTask_seconds: 180,              // Total time on question
  thinkingTime_seconds: 45,             // Time before first keystroke
  typingTime_seconds: 120,              // Active typing time
  
  // 🔴 NEW v3.0: Scaffolding Metrics
  scaffolding_hintRequests: 2,          // Number of hints requested
  scaffolding_probingQuestions: 1,      // AI probing questions shown
  scaffolding_levelReceived: 'explicit', // none | implicit | explicit
  
  // 🔴 NEW v3.0: Revision Metrics
  revision_count: 3,                    // Number of answer edits
  revision_charHistory: [50, 120, 180], // Character count at each save
  
  // 🔴 NEW v3.0: Baseline Control Variables
  baseline_priorAverage: 2.5,           // Average before this assessment
  baseline_pretestScore: 8,             // Pre-test score (if available)
  
  // 🔴 NEW v3.0: Context Variables
  context_deviceType: 'mobile',         // desktop | tablet | mobile
  context_questionPosition: 3,          // Question # in session
  context_hourOfDay: 14,                // 0-23
  context_dayOfWeek: 3,                 // 0-6 (Sunday = 0)
  
  // 🔴 NEW v3.0: Question Characteristics
  question_difficulty: 3,               // 1-5 estimated
  question_type: 'open_ended',          // multiple_choice | open_ended
  question_targetDimension: 'analysis', // Primary HOTS dimension
  
  // 🔴 NEW v3.0: Integrity Checks
  copyPasteDetected: false,             // Anti-cheat flag
  tabSwitchCount: 1,                    // Tab/window switches
  
  // Metadata
  schemaVersion: '3.0',
  createdAt: Timestamp
}
```

### 2. `studentGrowthHistory` - Longitudinal Growth
```javascript
{
  // Document ID: {studentId}_{courseId}
  studentId: "uid123",
  courseId: "course456",
  
  // Time Series Array
  history: [
    {
      timestamp: "2024-01-10T...",
      analysis: 2, reasoning: 2, creativity: 3, evidence: 2,
      average: 2.25,
      source: "chat",
      // 🔴 NEW v3.0: Per-entry metrics
      additionalMetrics: {
        hintRequests: 2,
        scaffoldingLevel: 'explicit',
        timeOnTask: 120,
        revisionCount: 1
      }
    }
    // ... more entries
  ],
  
  // Latest snapshot for quick access
  latestScores: { analysis: 3, reasoning: 3, creativity: 4, evidence: 3 },
  latestAverage: 3.25,
  totalEntries: 15,
  
  // 🔴 NEW v3.0: Baseline Data
  baseline: {
    pretestScore: 8,
    pretestDate: "2024-01-05T...",
    priorExperience: "none"  // none | some | extensive
  },
  
  // 🔴 NEW v3.0: Scaffolding Summary
  scaffoldingSummary: {
    totalHintRequests: 15,
    avgHintsPerSession: 1.5,
    scaffoldingDependencyTrend: "decreasing"  // increasing | stable | decreasing
  },
  
  // Metadata
  firstEntry: Timestamp,
  lastUpdated: Timestamp
}
```

### 🆕 3. `learningSequences` - Sequential Pattern Mining
```javascript
{
  // Document ID: {sessionId}_{questionId}
  sessionId: "sess123",
  studentId: "uid123",
  courseId: "course456",
  questionId: "q789",
  
  // Sequence of micro-events
  sequence: [
    { order: 1, event: "QUESTION_SHOWN", timestamp: "2024-01-15T10:30:00Z", data: {} },
    { order: 2, event: "TYPING_START", timestamp: "2024-01-15T10:30:30Z", data: {} },
    { order: 3, event: "HINT_REQUEST", timestamp: "2024-01-15T10:31:00Z", data: { hintLevel: 1 } },
    { order: 4, event: "ANSWER_REVISION", timestamp: "2024-01-15T10:32:00Z", data: { charCount: 150 } },
    { order: 5, event: "ANSWER_SUBMIT", timestamp: "2024-01-15T10:33:00Z", data: {} },
    { order: 6, event: "FEEDBACK_RECEIVED", timestamp: "2024-01-15T10:33:05Z", data: {} }
  ],
  
  // Summary (calculated on finalize)
  sequenceSummary: {
    totalEvents: 6,
    totalHints: 1,
    totalRevisions: 1,
    timeToFirstHint_sec: 60,
    timeToSubmit_sec: 180,
    pattern: "Q-T-H-R-S-F"  // Encoded pattern for mining
  },
  
  finalized: true,
  finalizedAt: Timestamp,
  createdAt: Timestamp,
  lastUpdated: Timestamp
}
```

### 3. `interventions` - Teaching Interventions
```javascript
{
  studentId: "uid123",
  courseId: "course456",
  
  // Intervention Details
  interventionType: "micro_lesson", // micro_lesson | knowledge_sheet | teacher_feedback | scaffolding
  contentId: "lesson789",
  contentTitle: "การวิเคราะห์ข้อมูล",
  targetLOs: ["LO1", "LO2"],
  
  // Pre/Post Scores (for effectiveness analysis)
  preScores: { analysis: 2, reasoning: 2, creativity: 2, evidence: 2, average: 2.0 },
  postScores: null, // Filled when next assessment happens
  
  // Engagement Metrics
  durationSec: 180,
  completionRate: 85,
  
  // Context
  teacherId: "teacher123", // if teacher-initiated
  notes: "นักเรียนมีปัญหาเรื่องการวิเคราะห์ข้อมูลเชิงปริมาณ",
  
  createdAt: Timestamp
}
```

---

## 📈 Event Types

```javascript
const EVENT_TYPES = {
  // Core Assessment
  CHAT_ASSESSMENT: 'CHAT_ASSESSMENT',
  WORKSHEET_SUBMISSION: 'WORKSHEET_SUBMISSION',
  
  // Testing
  PRETEST: 'PRETEST',
  POSTTEST: 'POSTTEST',
  
  // Learning Activities
  MICRO_LESSON_VIEW: 'MICRO_LESSON_VIEW',
  KNOWLEDGE_SHEET_VIEW: 'KNOWLEDGE_SHEET_VIEW',
  
  // Progress Milestones
  LO_PASSED: 'LO_PASSED',
  LEVEL_UP: 'LEVEL_UP',
  BADGE_EARNED: 'BADGE_EARNED',
  
  // Engagement
  SESSION_START: 'SESSION_START',
  SESSION_END: 'SESSION_END'
}
```

---

## 🔌 API Endpoints

### 1. `GET /exportResearchData`
Export ข้อมูลเป็น CSV สำหรับงานวิจัย

**Parameters:**
- `courseId` (required): รหัสวิชา
- `format`: `csv` (default) หรือ `json`
- `dateFrom`: YYYY-MM-DD
- `dateTo`: YYYY-MM-DD

**Response (CSV):**
```csv
studentId,courseId,eventType,timestamp,score_analysis,score_reasoning,score_creativity,score_evidence,score_average,lo_passed_count,lo_passed_ids
uid123,course456,CHAT_ASSESSMENT,2024-01-15T10:30:00.000Z,4,3,5,4,4.0,2,"LO1,LO2"
```

### 2. `GET /researchSummary`
สรุปสถิติเชิงพรรณนา

**Parameters:**
- `courseId` (required)

**Response:**
```json
{
  "courseId": "course456",
  "totalEvents": 150,
  "uniqueStudents": 30,
  "dateRange": {
    "from": "2024-01-01",
    "to": "2024-01-31"
  },
  "statistics": {
    "analysis": { "n": 150, "mean": 3.2, "sd": 1.1, "min": 1, "max": 5 },
    "reasoning": { "n": 150, "mean": 3.0, "sd": 1.2, "min": 1, "max": 5 },
    "creativity": { "n": 150, "mean": 3.5, "sd": 0.9, "min": 1, "max": 5 },
    "evidence": { "n": 150, "mean": 3.1, "sd": 1.0, "min": 1, "max": 5 }
  },
  "correlation": {
    "chatVsWorksheet": {
      "r": 0.75,
      "n": 30,
      "interpretation": "Strong positive correlation"
    }
  }
}
```

### 3. `GET /correlationAnalysis`
วิเคราะห์ความสัมพันธ์ระหว่าง Assessment Modes

**Parameters:**
- `courseId` (required)

**Response:**
```json
{
  "chatVsWorksheet": {
    "analysis": { "r": 0.72, "p": 0.001, "n": 30 },
    "reasoning": { "r": 0.68, "p": 0.002, "n": 30 },
    "creativity": { "r": 0.81, "p": 0.0001, "n": 30 },
    "evidence": { "r": 0.65, "p": 0.003, "n": 30 }
  },
  "interpretation": "ผลการประเมินจาก Chat และ Worksheet มีความสอดคล้องกัน แสดงว่าทั้งสองระบบวัดทักษะเดียวกัน"
}
```

### 4. `POST /logInterventionEvent`
บันทึกการเรียนเสริม/แทรกแซง

**Body:**
```json
{
  "studentId": "uid123",
  "courseId": "course456",
  "interventionType": "micro_lesson",
  "contentId": "lesson789",
  "contentTitle": "การวิเคราะห์ข้อมูล",
  "targetLOs": ["LO1", "LO2"],
  "durationSec": 180,
  "completionRate": 85
}
```

### 5. `GET /getGrowthHistory`
ดึงประวัติพัฒนาการของนักเรียน

**Parameters:**
- `studentId` (required)
- `courseId` (required)

**Response:**
```json
{
  "studentId": "uid123",
  "courseId": "course456",
  "history": [
    { "timestamp": "2024-01-10", "average": 2.25, "source": "chat" },
    { "timestamp": "2024-01-15", "average": 3.25, "source": "worksheet" },
    { "timestamp": "2024-01-20", "average": 3.75, "source": "chat" }
  ],
  "latestAverage": 3.75,
  "totalEntries": 3
}
```

### 6. `GET /researchDataQuality`
ตรวจสอบคุณภาพข้อมูลวิจัย

**Response:**
```json
{
  "courseId": "course456",
  "dataVolume": {
    "assessments": 150,
    "worksheets": 80,
    "learningEvents": 145,
    "interventions": 25,
    "growthHistories": 30
  },
  "completeness": {
    "assessmentsWithReliabilityScore": 95,
    "assessmentsWithAiConfidence": 90,
    "assessmentsWithLOAssessment": 100
  },
  "researchReadinessScore": 85,
  "recommendations": [
    {
      "priority": "MEDIUM",
      "issue": "Learning Events ไม่ครบถ้วน",
      "action": "ตรวจสอบว่าระบบบันทึก Events ทุกครั้งที่มีการประเมิน"
    }
  ]
}
```

---

## 🆕 NEW v3.0 API Endpoints

### 7. `GET /researchReadinessV2`
Research Readiness พร้อม Power Analysis

**Parameters:**
- `courseId` (required): รหัสวิชา

**Response:**
```json
{
  "success": true,
  "courseId": "course456",
  "sampleSize": {
    "total_n": 45,
    "required_n_small_effect": 199,
    "required_n_medium_effect": 34,
    "required_n_large_effect": 14,
    "verdict": "SUFFICIENT_FOR_MEDIUM_EFFECT"
  },
  "dataVolume": {
    "assessments": 150,
    "events": 140,
    "interventions": 25,
    "growthHistories": 45
  },
  "overallScore": 72,
  "scoreBreakdown": {
    "sampleSize": 30,
    "completeness": 23,
    "quality": 10,
    "statistical": 9
  },
  "recommendations": [
    {
      "priority": "HIGH",
      "issue": "ยังไม่มี Pre/Post test data",
      "action": "สร้าง Pretest/Posttest events",
      "impact": "+25 points"
    }
  ],
  "schemaVersion": "3.0"
}
```

### 8. `POST /logSequenceEventAPI`
บันทึก micro-level events สำหรับ Sequential Pattern Mining

**Body:**
```json
{
  "sessionId": "sess123",
  "studentId": "uid123",
  "courseId": "course456",
  "questionId": "q789",
  "eventType": "HINT_REQUEST",
  "data": { "hintLevel": 1 }
}
```

**Valid eventTypes:**
- `QUESTION_SHOWN` (Q)
- `HINT_REQUEST` (H)
- `TYPING_START` (T)
- `ANSWER_REVISION` (R)
- `ANSWER_SUBMIT` (S)
- `FEEDBACK_RECEIVED` (F)

### 9. `POST /finalizeSequenceAPI`
สรุป sequence เมื่อจบการตอบคำถาม

**Body:**
```json
{
  "sessionId": "sess123",
  "questionId": "q789"
}
```

**Response:**
```json
{
  "success": true,
  "pattern": "Q-T-H-R-S-F",
  "totalHints": 1,
  "totalRevisions": 1
}
```

### 10. `GET /getLearningSequences`
ดึงข้อมูล sequential patterns

**Parameters:**
- `courseId`: รหัสวิชา (optional)
- `studentId`: รหัสนักเรียน (optional)
- `sessionId`: รหัส session (optional)
- `finalizedOnly`: `true`/`false` (optional)

**Response:**
```json
{
  "success": true,
  "sequences": [...],
  "count": 150,
  "patternAnalysis": {
    "totalSequences": 150,
    "uniquePatterns": 23,
    "topPatterns": [
      { "pattern": "Q-T-S-F", "count": 45, "percentage": 30 },
      { "pattern": "Q-T-H-S-F", "count": 32, "percentage": 21 },
      { "pattern": "Q-H-T-R-S-F", "count": 18, "percentage": 12 }
    ]
  }
}
```

### 11. `GET /exportKAnonymousDataAPI`
Export ข้อมูลพร้อม K-Anonymity protection

**Parameters:**
- `courseId` (required): รหัสวิชา
- `k`: K-anonymity threshold (default: 5)
- `level`: `internal` | `research` | `publication` (default: `research`)
- `format`: `csv` | `json` (default: `json`)

**Anonymization by Level:**
| Level | Timestamp | Scores | IDs | Additional |
|-------|-----------|--------|-----|------------|
| internal | Full datetime | Exact | Sequential | All fields |
| research | Date only | Exact | Sequential | Remove session/question IDs |
| publication | Date only | Ranges | Sequential | Remove all quasi-identifiers |

**Response:**
```json
{
  "success": true,
  "data": [...],
  "format": "json",
  "recordCount": 150,
  "isKAnonymous": true,
  "kValue": 5,
  "level": "research"
}
```

### 12. `GET /assessReidentificationRiskAPI`
ประเมินความเสี่ยงในการระบุตัวตน

**Parameters:**
- `courseId` (required): รหัสวิชา

**Response:**
```json
{
  "success": true,
  "riskAssessment": {
    "totalRecords": 150,
    "uniqueCombinations": 45,
    "uniqueRate": 30.0,
    "highRiskFields": [
      {
        "field": "passedLOs",
        "uniquePatterns": 89,
        "risk": "HIGH",
        "recommendation": "Generalize to passedLOCount only"
      }
    ],
    "overallRisk": "MODERATE",
    "safeToExport": true,
    "requiredMitigations": [
      "Generalize to passedLOCount only"
    ]
  }
}
```

---

## 🔄 Data Flow

```
Student Action
     │
     ▼
┌─────────────────────────────────────────────────┐
│                Cloud Function                    │
│  (assessAnswer / assessWorksheetSubmission)     │
│                                                  │
│  1. Assess with AI (temperature=0, seed=42)     │
│  2. Save to assessments/worksheetSubmissions    │
│  3. logLearningEvent() ──────────────────────────┼──► learningEvents
│  4. updateGrowthHistory() ──────────────────────┼──► studentGrowthHistory
│  5. Update studentProgress                       │
└─────────────────────────────────────────────────┘
     │
     ▼
Teacher/Researcher
     │
     ▼
┌─────────────────────────────────────────────────┐
│           Research Data APIs                     │
│                                                  │
│  • exportResearchData → CSV for SPSS/Python     │
│  • researchSummary → Descriptive Statistics     │
│  • correlationAnalysis → Pearson r              │
│  • getGrowthHistory → Time Series Data          │
│  • researchDataQuality → Quality Check          │
└─────────────────────────────────────────────────┘
```

---

## 📊 Research Use Cases

### 1. **Pre/Post Test Analysis**
```python
import pandas as pd
from scipy import stats

# Load data
df = pd.read_csv('research_data.csv')
pretest = df[df['eventType'] == 'PRETEST']
posttest = df[df['eventType'] == 'POSTTEST']

# Paired t-test
t, p = stats.ttest_rel(pretest['score_average'], posttest['score_average'])
print(f"t = {t:.3f}, p = {p:.4f}")
```

### 2. **Intervention Effectiveness**
```python
# Group by intervention type
interventions = df[df['interventionType'].notna()]
control = df[df['interventionType'].isna()]

# Compare means
intervention_mean = interventions['score_average'].mean()
control_mean = control['score_average'].mean()

# Independent t-test
t, p = stats.ttest_ind(interventions['score_average'], control['score_average'])
```

### 3. **Growth Trajectory**
```python
import matplotlib.pyplot as plt

# Load growth history
student_data = growth_history['uid123_course456']

# Plot
plt.figure(figsize=(10, 6))
plt.plot([h['timestamp'] for h in student_data['history']], 
         [h['average'] for h in student_data['history']], 
         marker='o')
plt.xlabel('Date')
plt.ylabel('Average HOTS Score')
plt.title('Student Growth Trajectory')
plt.show()
```

### 4. **Correlation Analysis (SPSS)**
```spss
CORRELATIONS
  /VARIABLES=score_analysis score_reasoning score_creativity score_evidence
  /PRINT=TWOTAIL NOSIG FULL
  /STATISTICS DESCRIPTIVES
  /MISSING=PAIRWISE.
```

### 5. **Reliability Analysis**
```python
from scipy import stats

# Chat vs Worksheet correlation (same students)
merged = pd.merge(
    chat_data[['studentId', 'score_average']], 
    worksheet_data[['studentId', 'score_average']], 
    on='studentId', 
    suffixes=('_chat', '_worksheet')
)

r, p = stats.pearsonr(merged['score_average_chat'], merged['score_average_worksheet'])
print(f"Chat-Worksheet Correlation: r = {r:.3f}, p = {p:.4f}")
```

### 🆕 6. **Scaffolding Effect Analysis (NEW v3.0)**
```python
# RQ: Does AI scaffolding improve HOTS scores?
import pandas as pd
from scipy import stats

df = pd.read_csv('research_data.csv')

# Group by scaffolding level
no_scaffold = df[df['scaffolding_levelReceived'] == 'none']
implicit = df[df['scaffolding_levelReceived'] == 'implicit']
explicit = df[df['scaffolding_levelReceived'] == 'explicit']

# One-way ANOVA
f_stat, p_val = stats.f_oneway(
    no_scaffold['score_average'],
    implicit['score_average'],
    explicit['score_average']
)
print(f"F = {f_stat:.3f}, p = {p_val:.4f}")

# Effect size (Cohen's d for pairwise)
def cohens_d(g1, g2):
    n1, n2 = len(g1), len(g2)
    var1, var2 = g1.var(), g2.var()
    pooled_std = ((var1 * (n1-1) + var2 * (n2-1)) / (n1+n2-2)) ** 0.5
    return (g1.mean() - g2.mean()) / pooled_std

d_explicit_vs_none = cohens_d(explicit['score_average'], no_scaffold['score_average'])
print(f"Effect size (explicit vs none): d = {d_explicit_vs_none:.3f}")
```

### 🆕 7. **Sequential Pattern Mining (NEW v3.0)**
```python
# RQ: What learning sequences lead to better outcomes?
from mlxtend.frequent_patterns import apriori, association_rules

# Load sequence patterns
sequences = pd.DataFrame(...)  # From getLearningSequences API

# Convert patterns to transactions
# Pattern: "Q-T-H-R-S-F" → ['Q', 'T', 'H', 'R', 'S', 'F']
def pattern_to_set(p):
    return set(p.split('-'))

sequences['pattern_set'] = sequences['pattern'].apply(pattern_to_set)

# One-hot encode
all_events = {'Q', 'T', 'H', 'R', 'S', 'F'}
for event in all_events:
    sequences[event] = sequences['pattern_set'].apply(lambda x: event in x)

# Find frequent itemsets
frequent = apriori(sequences[list(all_events)], min_support=0.1, use_colnames=True)
rules = association_rules(frequent, metric="lift", min_threshold=1.2)

# High-score patterns
high_score = sequences[sequences['score'] >= 16]
print("Most common patterns in high scorers:")
print(high_score['pattern'].value_counts().head(5))
```

### 🆕 8. **Time on Task Analysis (NEW v3.0)**
```python
# RQ: Is there an optimal time-on-task for HOTS performance?
import numpy as np
import matplotlib.pyplot as plt

df = pd.read_csv('research_data.csv')

# Remove outliers (IQR method)
Q1 = df['timeOnTask_seconds'].quantile(0.25)
Q3 = df['timeOnTask_seconds'].quantile(0.75)
IQR = Q3 - Q1
df_clean = df[(df['timeOnTask_seconds'] >= Q1 - 1.5*IQR) & 
              (df['timeOnTask_seconds'] <= Q3 + 1.5*IQR)]

# Correlation
r, p = stats.pearsonr(df_clean['timeOnTask_seconds'], df_clean['score_average'])
print(f"Time-Score Correlation: r = {r:.3f}, p = {p:.4f}")

# Polynomial regression (check for optimal point)
from numpy.polynomial import polynomial as P
z = np.polyfit(df_clean['timeOnTask_seconds'], df_clean['score_average'], 2)
p = np.poly1d(z)

# Plot
x_line = np.linspace(df_clean['timeOnTask_seconds'].min(), 
                      df_clean['timeOnTask_seconds'].max(), 100)
plt.scatter(df_clean['timeOnTask_seconds'], df_clean['score_average'], alpha=0.5)
plt.plot(x_line, p(x_line), 'r-', label=f'Quadratic fit')
plt.xlabel('Time on Task (seconds)')
plt.ylabel('HOTS Score')
plt.legend()
plt.show()
```

### 🆕 9. **Scaffolding Dependency Trend (NEW v3.0)**
```python
# RQ: Do students become less dependent on scaffolding over time?
import pandas as pd

# Load growth history with scaffolding data
growth_data = pd.DataFrame(...)  # From getGrowthHistory API

# Calculate per-student trends
def get_trend(history):
    if len(history) < 4:
        return 'insufficient'
    hints = [h.get('additionalMetrics', {}).get('hintRequests', 0) for h in history]
    mid = len(hints) // 2
    first_half = sum(hints[:mid]) / mid
    second_half = sum(hints[mid:]) / (len(hints) - mid)
    
    if second_half < first_half * 0.7:
        return 'decreasing'
    elif second_half > first_half * 1.3:
        return 'increasing'
    return 'stable'

students['scaffolding_trend'] = students['history'].apply(get_trend)

# Chi-square: Is trend related to final performance?
contingency = pd.crosstab(students['scaffolding_trend'], 
                          students['final_performance_quartile'])
chi2, p, dof, expected = stats.chi2_contingency(contingency)
print(f"Chi-square = {chi2:.3f}, p = {p:.4f}")
```

---

## 🔒 Data Privacy

### PDPA Compliance
1. **Consent**: นักเรียนยินยอมผ่าน ConsentModal ก่อนใช้งาน
2. **Anonymization**: Export สำหรับงานวิจัยใช้ studentId แทนชื่อจริง
3. **Data Minimization**: เก็บเฉพาะข้อมูลที่จำเป็นสำหรับการวิจัย
4. **Retention**: กำหนดระยะเวลาเก็บรักษาตาม IRB

### Export Options
```javascript
// Anonymous export (for publication)
const anonymousData = await exportResearchCSV(db, courseId, { 
  anonymize: true  // Replace real IDs with sequential numbers
})

// Full export (for internal research)
const fullData = await exportResearchCSV(db, courseId, { 
  anonymize: false 
})
```

---

## 📈 Quality Metrics

### Research Readiness Score (0-100)

| Score | Interpretation | Action |
|-------|---------------|--------|
| 90-100 | พร้อมวิเคราะห์ทันที | สามารถเริ่มวิเคราะห์ได้เลย |
| 70-89 | ใกล้พร้อม | เก็บข้อมูลเพิ่มอีกเล็กน้อย |
| 50-69 | ต้องปรับปรุง | ตรวจสอบการบันทึก Event |
| < 50 | ไม่พร้อม | รอสะสมข้อมูลเพิ่มเติม |

### Minimum Requirements for Publication

| Requirement | Threshold |
|------------|-----------|
| Sample Size (N) | ≥ 30 |
| Event Logging Rate | ≥ 90% |
| Growth History Coverage | ≥ 80% |
| Intervention Data | ≥ 10 records |
| Data Completeness | ≥ 95% |

---

## 🚀 Getting Started

### 1. Verify Data Collection
```bash
# Check if events are being logged
curl "https://us-central1-YOUR_PROJECT.cloudfunctions.net/researchDataQuality?courseId=YOUR_COURSE_ID"
```

### 2. Export Data
```bash
# CSV Export
curl "https://us-central1-YOUR_PROJECT.cloudfunctions.net/exportResearchData?courseId=YOUR_COURSE_ID&format=csv" > research_data.csv
```

### 3. Get Summary Statistics
```bash
curl "https://us-central1-YOUR_PROJECT.cloudfunctions.net/researchSummary?courseId=YOUR_COURSE_ID"
```

### 4. Analyze in Python
```python
import pandas as pd

df = pd.read_csv('research_data.csv')
print(df.describe())
```

---

## 📚 Related Documentation

- [DATA_FLOW_REPORT.md](DATA_FLOW_REPORT.md) - ภาพรวมการไหลของข้อมูล
- [RELIABILITY_MODULE.md](RELIABILITY_MODULE.md) - ระบบความน่าเชื่อถือ 95%+
- [PDPA_IMPLEMENTATION.md](PDPA_IMPLEMENTATION.md) - การปฏิบัติตาม PDPA
- [AI_SCAFFOLDING_IMPLEMENTATION.md](AI_SCAFFOLDING_IMPLEMENTATION.md) - ระบบ AI Assessment

---

*Last Updated: December 2025*
*Version: 3.0.0*

### Changelog
- **v3.0.0**: Added Time on Task, Scaffolding Metrics, Baseline Data, Sequential Pattern Mining, K-Anonymity Export, Research Readiness v2 with Power Analysis
- **v2.0.0**: Added AI Confidence, Chain of Thought, Reliability Score
- **v1.0.0**: Initial release with basic event logging and export
