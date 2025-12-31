# 🎯 ระบบนิเวศความน่าเชื่อถือ — Reliability Ecosystem

<div align="center">

**Version 1.0** | **Last Updated: December 31, 2025**

*ห่วงโซ่เหตุผลเชิงระบบสำหรับความเสถียรภาพ ความแม่นยำ และความน่าเชื่อถือระดับรากเง่า*

</div>

---

## 📑 สารบัญ

1. [ภาพรวมห่วงโซ่ระบบนิเวศ](#1-ภาพรวมห่วงโซ่ระบบนิเวศ)
2. [Layer 1: Input Validation & Parsing](#2-layer-1-input-validation--parsing)
3. [Layer 2: AI Reliability & Resilience](#3-layer-2-ai-reliability--resilience)
4. [Layer 3: Inter-Rater Reliability (IRR)](#4-layer-3-inter-rater-reliability-irr)
5. [Layer 4: Validation Study Framework](#5-layer-4-validation-study-framework)
6. [Layer 5: Fairness & Bias Audit](#6-layer-5-fairness--bias-audit)
7. [Layer 6: Data Consistency](#7-layer-6-data-consistency)
8. [Layer 7: Human-in-the-Loop](#8-layer-7-human-in-the-loop)
9. [Layer 8: Grade-Level Calibration](#9-layer-8-grade-level-calibration)
10. [Metrics & Thresholds](#10-metrics--thresholds)
11. [Chain of Reasoning Flow](#11-chain-of-reasoning-flow)

---

## 1. ภาพรวมห่วงโซ่ระบบนิเวศ

### 🔗 Reliability Chain Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     🎯 RELIABILITY ECOSYSTEM — ห่วงโซ่เหตุผล                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│   │ Layer 1 │───▶│ Layer 2 │───▶│ Layer 3 │───▶│ Layer 4 │───▶│ Layer 5 │      │
│   │ INPUT   │    │   AI    │    │   IRR   │    │VALIDITY │    │FAIRNESS │      │
│   │ VALID   │    │RELIABLE │    │ CHECK   │    │ STUDY   │    │ AUDIT   │      │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘      │
│        │              │              │              │              │            │
│        ▼              ▼              ▼              ▼              ▼            │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│   │ Clean   │    │ Retry   │    │ Kappa   │    │ Content │    │ Effect  │      │
│   │ Parse   │    │ Backoff │    │ ICC     │    │Construct│    │ Size    │      │
│   │ Schema  │    │Fallback │    │ MAE     │    │Criterion│    │  DIF    │      │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘      │
│                                                                                 │
│        │              │              │              │              │            │
│        └──────────────┴──────────────┴──────────────┴──────────────┘            │
│                                      │                                          │
│                                      ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐      │
│   │                     UNIFIED RELIABILITY SCORE                        │      │
│   │                                                                      │      │
│   │   Score = f(Parse Success, Retry Count, IRR Metrics, Validity,      │      │
│   │             Fairness, Data Consistency, HITL Review)                │      │
│   │                                                                      │      │
│   │   Target: ≥ 95% Reliability | κ ≥ 0.60 | ICC ≥ 0.70 | MAE ≤ 1.0    │      │
│   └─────────────────────────────────────────────────────────────────────┘      │
│                                                                                 │
│        │              │              │              │              │            │
│        ▼              ▼              ▼              ▼              ▼            │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│   │ Layer 6 │    │ Layer 7 │    │ Layer 8 │    │RESEARCH │    │PUBLISH  │      │
│   │  DATA   │    │  HITL   │    │ GRADE   │    │PIPELINE │    │  READY  │      │
│   │ CONSIST │    │ REVIEW  │    │ CALIB   │    │         │    │         │      │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 🎯 หลักการห่วงโซ่เหตุผล (Chain of Reasoning Principles)

| หลักการ | คำอธิบาย | การประยุกต์ใช้ |
|---------|----------|---------------|
| **Causality** | ทุก layer มีผลต่อ layer ถัดไป | ถ้า parsing ล้มเหลว → reliability ลด → IRR ไม่ valid |
| **Traceability** | ติดตามได้ตลอดห่วงโซ่ | Audit trail ในทุก assessment |
| **Feedback Loop** | ข้อมูลย้อนกลับปรับปรุงระบบ | HITL review → AI improvement |
| **Redundancy** | มีแผนสำรองทุก layer | Fallback assessment, retry mechanism |
| **Transparency** | เปิดเผยวิธีการทุกขั้นตอน | Chain of Thought, confidence reason |

---

## 2. Layer 1: Input Validation & Parsing

### 📋 Module: `aiParser.js`

```
┌────────────────────────────────────────────────────────────────┐
│                    INPUT VALIDATION LAYER                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Raw AI Response                                               │
│         │                                                       │
│         ▼                                                       │
│   ┌─────────────────────┐                                      │
│   │ cleanAIResponse()   │ ◄── Strip ```json blocks             │
│   │ - Remove markdown   │ ◄── Handle edge cases                │
│   │ - Find JSON bounds  │ ◄── Extract { ... }                  │
│   └──────────┬──────────┘                                      │
│              ▼                                                  │
│   ┌─────────────────────┐                                      │
│   │ safeParseJSON()     │ ◄── JSON.parse with fallback         │
│   │ - Parse cleaned     │ ◄── Return error info                │
│   │ - Error handling    │                                      │
│   └──────────┬──────────┘                                      │
│              ▼                                                  │
│   ┌─────────────────────┐                                      │
│   │ validateRubricScores│ ◄── Check A.R.C.E. dimensions        │
│   │ - Range: 0-5        │ ◄── Type conversion                  │
│   │ - Missing → default │ ◄── Clamp out-of-bounds              │
│   └──────────┬──────────┘                                      │
│              ▼                                                  │
│        Valid Object OR Fallback                                 │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 🔑 Critical Functions

```javascript
// ⚠️ CRITICAL: GPT-4o-mini wraps JSON in markdown
function cleanAIResponse(responseText) {
  if (!responseText) return ''
  
  let cleanedText = responseText.trim()
  
  // Remove markdown code blocks
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
    cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
  }
  
  // Extract JSON boundaries
  const jsonStart = cleanedText.indexOf('{')
  const jsonEnd = cleanedText.lastIndexOf('}')
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1)
  }
  
  return cleanedText
}
```

### 📊 Schema Validation (reliability.js)

```javascript
const ASSESSMENT_SCHEMA = {
  required: ['feedback', 'rubricScores'],
  rubricScores: {
    required: ['analysis', 'reasoning', 'creativity', 'evidence'],
    type: 'number',
    min: 0,
    max: 5
  },
  optional: [
    'suggestions', 'strengths', 'weaknesses', 'loAssessment',
    'probingQuestion', 'confidence', 'confidenceReason', 'chainOfThought'
  ]
}
```

### ✅ Validation Result Structure

```javascript
{
  isValid: true,
  errors: [],
  warnings: ['rubricScores.analysis converted from string to number'],
  sanitized: {
    feedback: '...',
    rubricScores: { analysis: 4, reasoning: 3, creativity: 4, evidence: 3 },
    suggestions: [...],
    // ... sanitized optional fields
  }
}
```

---

## 3. Layer 2: AI Reliability & Resilience

### 🔄 Module: `reliability.js`

```
┌────────────────────────────────────────────────────────────────┐
│                    AI RELIABILITY LAYER                         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                  RETRY MECHANISM                         │  │
│   │                                                          │  │
│   │   Attempt 1 ──▶ [OpenAI API Call]                       │  │
│   │       │                                                  │  │
│   │       ▼ (fail)                                          │  │
│   │   Wait: 1000ms × 2^0 = 1000ms                           │  │
│   │       │                                                  │  │
│   │       ▼                                                  │  │
│   │   Attempt 2 ──▶ [OpenAI API Call]                       │  │
│   │       │                                                  │  │
│   │       ▼ (fail)                                          │  │
│   │   Wait: 1000ms × 2^1 = 2000ms                           │  │
│   │       │                                                  │  │
│   │       ▼                                                  │  │
│   │   Attempt 3 ──▶ [OpenAI API Call]                       │  │
│   │       │                                                  │  │
│   │       ▼ (fail)                                          │  │
│   │   ┌───────────────────────────────────────┐             │  │
│   │   │         FALLBACK ASSESSMENT           │             │  │
│   │   │  - Heuristic scoring (length-based)   │             │  │
│   │   │  - Max score: 2.5                     │             │  │
│   │   │  - isFallback: true                   │             │  │
│   │   └───────────────────────────────────────┘             │  │
│   │                                                          │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### ⚙️ Retry Configuration

```javascript
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN',
    'rate_limit_exceeded', '429', '500', '502', '503', '504'
  ]
}
```

### 🆘 Fallback Assessment

```javascript
function getFallbackAssessment(studentAnswer, reason) {
  const wordCount = studentAnswer.split(/\s+/).filter(w => w.length > 0).length
  const charCount = studentAnswer.length
  
  let baseScore = 1
  if (wordCount >= 20) baseScore += 0.5
  if (wordCount >= 50) baseScore += 0.5
  if (charCount >= 100) baseScore += 0.5
  
  baseScore = Math.min(2.5, baseScore) // Cap at 2.5
  
  return {
    feedback: `⚠️ ระบบประเมินชั่วคราว (${reason})`,
    rubricScores: {
      analysis: baseScore,
      reasoning: baseScore,
      creativity: baseScore,
      evidence: baseScore
    },
    isFallback: true,
    fallbackReason: reason,
    confidence: 0
  }
}
```

### 🔢 Reliability Score Calculation

```javascript
function calculateReliabilityScore(assessment, parseResult, retryAttempts) {
  let score = 100
  
  // Deductions
  score -= (parseResult.errors?.length || 0) * 10      // Parse errors
  score -= (parseResult.warnings?.length || 0) * 2     // Parse warnings
  score -= (retryAttempts - 1) * 5                     // Retry attempts
  score -= parseResult.usedFallback ? 30 : 0           // Fallback parsing
  score -= (assessment?.confidence < 50) ? 10 : 0     // Low AI confidence
  score -= assessment?.isFallback ? 50 : 0             // Fallback assessment
  
  return Math.max(0, Math.min(100, score))
}
```

---

## 4. Layer 3: Inter-Rater Reliability (IRR)

### 📊 Module: `interRaterReliability.js`

```
┌────────────────────────────────────────────────────────────────┐
│                 INTER-RATER RELIABILITY LAYER                   │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │                    IRR METRICS SUITE                      │ │
│   ├──────────────────────────────────────────────────────────┤ │
│   │                                                           │ │
│   │  1. Cohen's Kappa (κ)                                    │ │
│   │     ├── Agreement: Nominal scales                        │ │
│   │     ├── Formula: κ = (Po - Pe) / (1 - Pe)               │ │
│   │     └── Target: κ ≥ 0.60 (Substantial)                  │ │
│   │                                                           │ │
│   │  2. Weighted Kappa (κw)                                  │ │
│   │     ├── Agreement: Ordinal scales (0-5)                  │ │
│   │     ├── Weights: Linear or Quadratic                     │ │
│   │     │   - Linear: w = 1 - |i-j|/(k-1)                   │ │
│   │     │   - Quadratic: w = 1 - (i-j)²/(k-1)²              │ │
│   │     └── Target: κw ≥ 0.60                               │ │
│   │                                                           │ │
│   │  3. ICC — Intraclass Correlation Coefficient             │ │
│   │     ├── Forms: ICC(1,1), ICC(2,1), ICC(3,1)             │ │
│   │     ├── Two-way Random: ICC(2,1) ← Most common          │ │
│   │     └── Target: ICC ≥ 0.70 (Good)                       │ │
│   │                                                           │ │
│   │  4. Pearson Correlation (r)                              │ │
│   │     ├── Linear relationship                              │ │
│   │     └── Target: r ≥ 0.80 (Strong)                       │ │
│   │                                                           │ │
│   │  5. Mean Absolute Error (MAE)                            │ │
│   │     ├── Average absolute difference                      │ │
│   │     └── Target: MAE ≤ 1.0 point                         │ │
│   │                                                           │ │
│   │  6. Percent Agreement                                    │ │
│   │     ├── Exact match rate                                 │ │
│   │     ├── Adjacent agreement (±1)                          │ │
│   │     └── Target: ≥ 80%                                   │ │
│   │                                                           │ │
│   └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 📐 Key IRR Functions

#### Cohen's Kappa

```javascript
function calculateCohensKappa(rater1Scores, rater2Scores, maxScore = 5) {
  const n = rater1Scores.length
  
  // Create confusion matrix
  const categories = Array.from({ length: maxScore + 1 }, (_, i) => i)
  const matrix = {}
  
  // Fill confusion matrix
  for (let i = 0; i < n; i++) {
    const r1 = Math.round(rater1Scores[i])
    const r2 = Math.round(rater2Scores[i])
    matrix[r1][r2]++
  }
  
  // Calculate observed agreement (Po)
  let po = 0
  for (const cat of categories) {
    po += matrix[cat][cat]
  }
  po /= n
  
  // Calculate expected agreement (Pe)
  let pe = 0
  for (const cat of categories) {
    const row = categories.reduce((sum, c) => sum + matrix[cat][c], 0) / n
    const col = categories.reduce((sum, r) => sum + matrix[r][cat], 0) / n
    pe += row * col
  }
  
  // Kappa
  const kappa = (po - pe) / (1 - pe)
  
  return {
    kappa: Math.round(kappa * 1000) / 1000,
    interpretation: interpretKappa(kappa),
    po, pe, n
  }
}
```

#### Weighted Kappa

```javascript
function calculateWeightedKappa(rater1Scores, rater2Scores, 
                                 weightType = 'quadratic', maxScore = 5) {
  const k = maxScore + 1
  
  // Create weight matrix
  const weights = []
  for (let i = 0; i < k; i++) {
    weights[i] = []
    for (let j = 0; j < k; j++) {
      if (weightType === 'linear') {
        weights[i][j] = 1 - Math.abs(i - j) / (k - 1)
      } else { // quadratic
        weights[i][j] = 1 - Math.pow(i - j, 2) / Math.pow(k - 1, 2)
      }
    }
  }
  
  // Calculate weighted observed & expected
  // ... weighted Po and Pe calculation
  
  return {
    weightedKappa: Math.round(kappa * 1000) / 1000,
    interpretation: interpretKappa(kappa)
  }
}
```

#### ICC (Shrout & Fleiss, 1979)

```javascript
function calculateICC(ratings, form = '2,1') {
  const n = ratings.length        // Subjects
  const k = ratings[0]?.length    // Raters
  
  // Calculate ANOVA components
  // MSR = Between subjects mean square
  // MSC = Between raters mean square
  // MSE = Residual error mean square
  
  switch (form) {
    case '1,1':  // One-way random, single rater
      icc = (MSR - MSW) / (MSR + (k - 1) * MSW)
      break
    case '2,1':  // Two-way random, single rater (absolute agreement) ← RECOMMENDED
      icc = (MSR - MSE) / (MSR + (k - 1) * MSE + (k / n) * (MSC - MSE))
      break
    case '3,1':  // Two-way mixed, single rater (consistency)
      icc = (MSR - MSE) / (MSR + (k - 1) * MSE)
      break
  }
  
  return {
    icc: Math.round(icc * 1000) / 1000,
    interpretation: interpretICC(icc),
    ci95: { lower, upper }
  }
}
```

### 🔍 Comprehensive IRR Analysis

```javascript
function comprehensiveIRRAnalysis(validations, dimension = 'total') {
  const aiScores = validations.map(v => v.aiScore)
  const expertScores = validations.map(v => v.expertScore)
  
  return {
    dimension,
    n: validations.length,
    
    // Agreement metrics
    cohensKappa: calculateCohensKappa(aiScores, expertScores),
    weightedKappa: calculateWeightedKappa(aiScores, expertScores),
    percentAgreement: calculatePercentAgreement(aiScores, expertScores),
    percentAgreementTolerance1: calculatePercentAgreement(aiScores, expertScores, 1),
    
    // Correlation metrics
    icc: calculateICC(ratingsForICC, '2,1'),
    pearsonR: calculatePearsonCorrelation(aiScores, expertScores),
    
    // Error metrics
    mae: calculateMAE(aiScores, expertScores),
    
    // Summary
    summary: {
      overallReliability: determineOverallReliability(weightedKappa, icc, pearsonR),
      meetsPublicationStandard: meetsPublicationStandard(weightedKappa, icc),
      recommendations: generateIRRRecommendations(n, kappa, icc, mae)
    }
  }
}
```

### 📈 Interpretation Tables

| Kappa | Interpretation | Thai |
|-------|----------------|------|
| < 0 | Poor (Less than chance) | ต่ำกว่าโอกาส |
| 0.00 - 0.20 | Slight | เล็กน้อย |
| 0.21 - 0.40 | Fair | พอใช้ |
| 0.41 - 0.60 | Moderate | ปานกลาง |
| 0.61 - 0.80 | Substantial | ดี |
| 0.81 - 1.00 | Almost Perfect | ดีเยี่ยม |

| ICC | Interpretation | Thai |
|-----|----------------|------|
| < 0.50 | Poor | ต่ำ |
| 0.50 - 0.74 | Moderate | ปานกลาง |
| 0.75 - 0.89 | Good | ดี |
| ≥ 0.90 | Excellent | ดีเยี่ยม |

---

## 5. Layer 4: Validation Study Framework

### 📚 Module: `validationStudy.js`

```
┌────────────────────────────────────────────────────────────────┐
│                  VALIDATION STUDY FRAMEWORK                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │              VALIDITY TYPES (Messick, 1989)               │ │
│   ├──────────────────────────────────────────────────────────┤ │
│   │                                                           │ │
│   │  1. CONTENT VALIDITY                                     │ │
│   │     ├── Method: Expert Panel Review                      │ │
│   │     ├── Metric: CVR (Content Validity Ratio)            │ │
│   │     │           Lawshe: CVR = (ne - N/2) / (N/2)        │ │
│   │     ├── Metric: CVI (Content Validity Index)            │ │
│   │     │           Average of item CVRs                     │ │
│   │     └── Target: CVI ≥ 0.80                              │ │
│   │                                                           │ │
│   │  2. CONSTRUCT VALIDITY                                   │ │
│   │     ├── Method: Factor Analysis (CFA)                    │ │
│   │     ├── Tool: Export to R/SPSS                          │ │
│   │     ├── Check: KMO ≥ 0.60                               │ │
│   │     └── Check: Factor loadings ≥ 0.40                   │ │
│   │                                                           │ │
│   │  3. CRITERION VALIDITY                                   │ │
│   │     ├── Method: Correlation with Expert                  │ │
│   │     ├── Metric: Pearson r                               │ │
│   │     ├── Metric: MAE, RMSE                               │ │
│   │     └── Target: r ≥ 0.70                                │ │
│   │                                                           │ │
│   │  4. RELIABILITY (Internal Consistency)                   │ │
│   │     ├── Metric: Cronbach's Alpha                        │ │
│   │     ├── Analysis: Item-total correlations               │ │
│   │     └── Target: α ≥ 0.70                                │ │
│   │                                                           │ │
│   └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 📐 Content Validity Ratio (CVR)

```javascript
function calculateCVR(essentialCount, totalExperts) {
  // Lawshe's formula: CVR = (ne - N/2) / (N/2)
  const cvr = (essentialCount - (totalExperts / 2)) / (totalExperts / 2)
  
  // Critical values for one-tailed test at p < .05
  const criticalValues = {
    5: 0.99, 6: 0.99, 7: 0.99, 8: 0.78, 9: 0.75, 10: 0.62,
    11: 0.59, 12: 0.56, 13: 0.54, 14: 0.51, 15: 0.49,
    20: 0.42, 25: 0.37, 30: 0.33, 35: 0.31, 40: 0.29
  }
  
  return {
    cvr,
    isSignificant: cvr >= criticalValue,
    interpretation: cvr >= 0.99 ? 'essential' :
                    cvr >= 0.50 ? 'useful' :
                    cvr >= 0 ? 'marginal' : 'not essential'
  }
}
```

### 📐 Cronbach's Alpha

```javascript
function calculateCronbachsAlpha(itemScores) {
  const n = itemScores.length  // Respondents
  const k = itemScores[0].length  // Items (4 for A.R.C.E.)
  
  // Calculate item variances
  const itemVariances = []
  for (let j = 0; j < k; j++) {
    const itemValues = itemScores.map(row => row[j])
    itemVariances.push(variance(itemValues))
  }
  const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0)
  
  // Calculate total score variance
  const totalScores = itemScores.map(row => row.reduce((a, b) => a + b, 0))
  const totalVariance = variance(totalScores)
  
  // Cronbach's Alpha formula
  const alpha = (k / (k - 1)) * (1 - sumItemVariances / totalVariance)
  
  return {
    alpha,
    interpretation: alpha >= 0.9 ? 'Excellent' :
                    alpha >= 0.8 ? 'Good' :
                    alpha >= 0.7 ? 'Acceptable' :
                    alpha >= 0.6 ? 'Questionable' :
                    alpha >= 0.5 ? 'Poor' : 'Unacceptable',
    itemTotalCorrelations,
    alphaIfDeleted
  }
}
```

---

## 6. Layer 5: Fairness & Bias Audit

### ⚖️ Module: `fairnessAudit.js`

```
┌────────────────────────────────────────────────────────────────┐
│                   FAIRNESS & BIAS AUDIT                         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Protected Attributes:                                         │
│   ├── Gender                                                    │
│   ├── School Type (public/private)                             │
│   ├── Region                                                    │
│   ├── Grade Level                                               │
│   └── Socioeconomic Status                                      │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │              FAIRNESS METRICS SUITE                       │ │
│   ├──────────────────────────────────────────────────────────┤ │
│   │                                                           │ │
│   │  1. Score Distribution Analysis                          │ │
│   │     └── Mean, SD, Min, Max, Median by group              │ │
│   │                                                           │ │
│   │  2. Effect Size (Cohen's d)                              │ │
│   │     ├── Formula: d = (M1 - M2) / pooled SD              │ │
│   │     ├── Small: d < 0.20                                  │ │
│   │     ├── Medium: 0.20 ≤ d < 0.80                         │ │
│   │     └── Large: d ≥ 0.80                                  │ │
│   │                                                           │ │
│   │  3. Differential Item Functioning (DIF)                  │ │
│   │     └── Threshold: 5% difference                         │ │
│   │                                                           │ │
│   │  4. Equalized Odds Check                                 │ │
│   │     └── Parity tolerance: 10%                            │ │
│   │                                                           │ │
│   └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│   Target: Effect Size < 0.20 (negligible) for all groups       │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### ⚖️ Fairness Thresholds

```javascript
const FAIRNESS_THRESHOLDS = {
  EFFECT_SIZE_SMALL: 0.2,      // Cohen's d < 0.2 = negligible
  EFFECT_SIZE_MEDIUM: 0.5,     // Cohen's d 0.2-0.5 = small
  EFFECT_SIZE_LARGE: 0.8,      // Cohen's d > 0.8 = large
  DIF_THRESHOLD: 0.05,         // 5% difference threshold
  MIN_GROUP_SIZE: 30,          // Minimum samples per group
  PARITY_TOLERANCE: 0.1        // 10% tolerance for rate parity
}
```

---

## 7. Layer 6: Data Consistency

### 🔒 Module: `dataConsistency.js`

```
┌────────────────────────────────────────────────────────────────┐
│                    DATA CONSISTENCY LAYER                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │            FIRESTORE TRANSACTION PATTERN                  │ │
│   │                                                           │ │
│   │   Transaction Begin                                       │ │
│   │         │                                                 │ │
│   │         ├─► 1. Read current studentProgress               │ │
│   │         │                                                 │ │
│   │         ├─► 2. Calculate new progress                     │ │
│   │         │      ├── Merge passed LOs                      │ │
│   │         │      ├── Calculate streak                       │ │
│   │         │      └── Update points                         │ │
│   │         │                                                 │ │
│   │         ├─► 3. Write assessment document                  │ │
│   │         │                                                 │ │
│   │         ├─► 4. Update progress document                   │ │
│   │         │                                                 │ │
│   │   Transaction Commit (atomic)                             │ │
│   │         │                                                 │ │
│   │         ▼ (if fails)                                      │ │
│   │   ┌─────────────────────────────────────────┐            │ │
│   │   │         FALLBACK SAVE                    │            │ │
│   │   │  - Save assessment with flag             │            │ │
│   │   │  - _transactionFailed: true              │            │ │
│   │   │  - Will sync later                       │            │ │
│   │   └─────────────────────────────────────────┘            │ │
│   │                                                           │ │
│   └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │            CONSISTENCY VERIFICATION                       │ │
│   │                                                           │ │
│   │   verifyDataConsistency()                                │ │
│   │         │                                                 │ │
│   │         ├─► Compare studentProgress.passedLOs            │ │
│   │         │   with actual assessments + worksheets         │ │
│   │         │                                                 │ │
│   │         ├─► Detect MISSING_LOS                           │ │
│   │         │                                                 │ │
│   │         ├─► Detect EXTRA_LOS                             │ │
│   │         │                                                 │ │
│   │         └─► Return issues[] for resolution               │ │
│   │                                                           │ │
│   └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 🔄 Sync Function

```javascript
async function syncStudentProgress(db, studentId, courseId) {
  // 1. Get all assessments with passed LOs
  const assessmentsSnap = await db.collection('assessments')
    .where('studentId', '==', studentId)
    .where('courseId', '==', courseId).get()
  
  // 2. Get all worksheet submissions
  const worksheetsSnap = await db.collection('worksheetSubmissions')
    .where('studentId', '==', studentId)
    .where('courseId', '==', courseId).get()
  
  // 3. Collect all passed LOs from both sources
  const allPassedLOs = new Set()
  
  assessmentsSnap.forEach(doc => {
    const data = doc.data()
    if (data.loAssessment?.passedLOs) {
      data.loAssessment.passedLOs.forEach(lo => allPassedLOs.add(lo))
    }
  })
  
  worksheetsSnap.forEach(doc => { /* same logic */ })
  
  // 4. Update progress document
  await progressRef.set({
    passedLOs: Array.from(allPassedLOs),
    totalPassed: allPassedLOs.size,
    lastSyncedAt: serverTimestamp()
  }, { merge: true })
}
```

---

## 8. Layer 7: Human-in-the-Loop

### 👥 Module: `humanInTheLoop.js`

```
┌────────────────────────────────────────────────────────────────┐
│                  HUMAN-IN-THE-LOOP REVIEW                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   AUTO-FLAG TRIGGERS                                            │
│   ├── Low AI Confidence (< 70%)         → Priority: HIGH       │
│   ├── Borderline Score (within ±0.3)    → Priority: MEDIUM     │
│   ├── AI Detection Flag                 → Priority: HIGH       │
│   ├── Dimension Variance (> 3 points)   → Priority: MEDIUM     │
│   ├── Student Appeal                    → Priority: HIGH       │
│   ├── High Stakes Assessment            → Priority: URGENT     │
│   └── Calibration Sample (5%)           → Priority: CALIBRATION│
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │                 REVIEW QUEUE FLOW                         │ │
│   │                                                           │ │
│   │   Assessment                                              │ │
│   │       │                                                   │ │
│   │       ▼                                                   │ │
│   │   shouldFlagForReview()                                   │ │
│   │       │                                                   │ │
│   │       ├─► needsReview: false → Direct to student         │ │
│   │       │                                                   │ │
│   │       └─► needsReview: true                              │ │
│   │               │                                           │ │
│   │               ▼                                           │ │
│   │   createReviewQueueItem()                                 │ │
│   │       │                                                   │ │
│   │       ├─► URGENT: Due in 1 hour                          │ │
│   │       ├─► HIGH: Due in 24 hours                          │ │
│   │       ├─► MEDIUM: Due in 3 days                          │ │
│   │       ├─► LOW: Due in 7 days                             │ │
│   │       └─► CALIBRATION: Due in 14 days                    │ │
│   │                                                           │ │
│   │   Expert Review                                           │ │
│   │       │                                                   │ │
│   │       ├─► Decision: CONFIRM (use AI scores)              │ │
│   │       ├─► Decision: OVERRIDE (use expert scores)         │ │
│   │       └─► Decision: PARTIAL_OVERRIDE                     │ │
│   │                                                           │ │
│   │   createExpertReview()                                    │ │
│   │       │                                                   │ │
│   │       └─► agreement analysis                             │ │
│   │           ├── differences per dimension                   │ │
│   │           ├── averageAbsoluteDifference                  │ │
│   │           └── agreementLevel: high/moderate/low          │ │
│   │                                                           │ │
│   └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 🚨 Auto-Flag Thresholds

```javascript
const AUTO_FLAG_THRESHOLDS = {
  LOW_CONFIDENCE: 70,           // Flag if AI confidence < 70%
  BORDERLINE_TOLERANCE: 0.3,    // Flag if score within 0.3 of threshold
  AI_DETECTION_SCORE: 50,       // Flag if AI detection score > 50
  DIMENSION_VARIANCE: 3,        // Flag if max-min dimension > 3
  CALIBRATION_SAMPLE_RATE: 0.05 // Sample 5% for calibration
}
```

---

## 9. Layer 8: Grade-Level Calibration

### 🎓 Module: `gradeLevelCalibration.js`

```
┌────────────────────────────────────────────────────────────────┐
│                  GRADE-LEVEL CALIBRATION                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Cognitive Development Stages (Piaget + Case)                  │
│                                                                 │
│   ┌────────────────────────────────────────────────────────┐   │
│   │ Stage         │ Grades    │ Expected HOTS Range        │   │
│   ├───────────────┼───────────┼────────────────────────────┤   │
│   │ Preoperational│ ป.1-2     │ max: 2, typical: 1        │   │
│   │ Concrete      │ ป.3-5     │ max: 3, typical: 2        │   │
│   │ Concrete Late │ ป.6       │ max: 4, typical: 3        │   │
│   │ Transition    │ ม.1       │ max: 4, typical: 3        │   │
│   │ Formal Early  │ ม.2-3     │ max: 5, typical: 4        │   │
│   │ Formal        │ ม.4-5     │ max: 5, typical: 4        │   │
│   │ Formal Mature │ ม.6       │ max: 5, typical: 5        │   │
│   └────────────────────────────────────────────────────────┘   │
│                                                                 │
│   Grade-Specific A.R.C.E. Anchors                               │
│                                                                 │
│   ป.4-6: "แยกเรื่องออกเป็น 2-3 ส่วนหลักได้ชัดเจน" → Analysis 5 │
│   ม.1-3: "เหตุผลเป็นลำดับขั้นตอน มีตรรกะชัดเจน" → Reasoning 5  │
│   ม.4-6: "เสนอกรอบคิดใหม่ สังเคราะห์ข้ามศาสตร์" → Creativity 5 │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 10. Metrics & Thresholds

### 📊 Publication-Ready Standards

| Metric | Minimum Threshold | Target | Excellent |
|--------|-------------------|--------|-----------|
| **Weighted Kappa (κw)** | ≥ 0.60 | ≥ 0.70 | ≥ 0.80 |
| **ICC (2,1)** | ≥ 0.70 | ≥ 0.80 | ≥ 0.90 |
| **Pearson r** | ≥ 0.70 | ≥ 0.80 | ≥ 0.90 |
| **MAE** | ≤ 1.0 | ≤ 0.75 | ≤ 0.50 |
| **Percent Agreement** | ≥ 70% | ≥ 80% | ≥ 90% |
| **Adjacent Agreement (±1)** | ≥ 85% | ≥ 90% | ≥ 95% |
| **Cronbach's Alpha** | ≥ 0.70 | ≥ 0.80 | ≥ 0.90 |
| **CVI** | ≥ 0.80 | ≥ 0.90 | ≥ 0.95 |
| **Effect Size (Fairness)** | ≤ 0.20 | ≤ 0.10 | ≤ 0.05 |
| **Sample Size (N)** | ≥ 30 | ≥ 100 | ≥ 200 |

### ✅ Publication Readiness Check

```javascript
function meetsPublicationStandard(kappa, icc) {
  // Publication typically requires:
  // κw ≥ 0.60 AND ICC ≥ 0.70
  return kappa >= 0.60 && icc >= 0.70
}
```

---

## 11. Chain of Reasoning Flow

### 🔗 Complete Assessment Chain

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     COMPLETE CHAIN OF REASONING                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   1. STUDENT INPUT                                                               │
│      │                                                                           │
│      ├─► Copy-paste detection (antiCheat.js)                                    │
│      ├─► Minimum length check (≥ 20 characters)                                 │
│      ├─► Confirmation dialog                                                     │
│      │                                                                           │
│   2. AI ASSESSMENT                                                               │
│      │                                                                           │
│      ├─► Prompt construction (prompts.js)                                       │
│      │   ├── Grade-level calibration                                            │
│      │   ├── A.R.C.E. rubric                                                    │
│      │   └── Chain of Thought instruction                                       │
│      │                                                                           │
│      ├─► API call with retry (reliability.js)                                   │
│      │   └── Max 3 attempts, exponential backoff                                │
│      │                                                                           │
│      ├─► Response parsing (aiParser.js)                                         │
│      │   ├── Clean markdown wrappers                                            │
│      │   └── JSON extraction                                                    │
│      │                                                                           │
│      ├─► Schema validation (reliability.js)                                     │
│      │   ├── Required fields check                                              │
│      │   ├── Score range validation (0-5)                                       │
│      │   └── Type conversion                                                    │
│      │                                                                           │
│   3. QUALITY ASSURANCE                                                           │
│      │                                                                           │
│      ├─► Human-in-the-Loop check                                                │
│      │   ├── Low confidence? → Flag for review                                  │
│      │   ├── Borderline? → Flag for review                                      │
│      │   └── Calibration sample? → Flag for review                              │
│      │                                                                           │
│      ├─► Fairness audit (scheduled)                                             │
│      │   └── Check for group bias                                               │
│      │                                                                           │
│   4. DATA PERSISTENCE                                                            │
│      │                                                                           │
│      ├─► Transaction (dataConsistency.js)                                       │
│      │   ├── Save assessment                                                    │
│      │   └── Update studentProgress                                             │
│      │                                                                           │
│      ├─► Audit trail                                                            │
│      │   ├── Model version                                                      │
│      │   ├── Prompt version                                                     │
│      │   ├── Reliability score                                                  │
│      │   └── Timestamp                                                          │
│      │                                                                           │
│   5. RESEARCH PIPELINE                                                           │
│      │                                                                           │
│      ├─► IRR calculation (periodic)                                             │
│      │   ├── Weighted Kappa                                                     │
│      │   ├── ICC                                                                │
│      │   └── MAE                                                                │
│      │                                                                           │
│      ├─► Validation study data                                                  │
│      │   ├── Content validity (CVR)                                             │
│      │   ├── Construct validity (CFA data)                                      │
│      │   └── Reliability (Cronbach's α)                                         │
│      │                                                                           │
│      └─► Export (anonymized)                                                    │
│          ├── K-anonymity applied                                                │
│          ├── PII removed                                                        │
│          └── SPSS-ready format                                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📚 References

### Statistical Methods
- Cohen, J. (1960). A coefficient of agreement for nominal scales. *Educational and Psychological Measurement*
- Shrout, P. E., & Fleiss, J. L. (1979). Intraclass correlations: Uses in assessing rater reliability. *Psychological Bulletin*
- Krippendorff, K. (2011). Computing Krippendorff's Alpha-Reliability
- Cronbach, L. J. (1951). Coefficient alpha and the internal structure of tests

### Validity Theory
- Messick, S. (1989). Validity. In R. L. Linn (Ed.), *Educational Measurement*
- Lawshe, C. H. (1975). A quantitative approach to content validity

### Cognitive Development
- Piaget, J. (1952). The Origins of Intelligence in Children
- Case, R. (1985). Intellectual Development: Birth to Adulthood
- Fischer, K. W. (1980). A Theory of Cognitive Development

### Fairness in AI
- Mehrabi, N., et al. (2021). A Survey on Bias and Fairness in Machine Learning
- Holland, P. W., & Thayer, D. T. (1988). Differential Item Functioning

---

## 📁 Module Reference

| File | Purpose | Key Functions |
|------|---------|---------------|
| `aiParser.js` | Response cleaning | `cleanAIResponse()`, `safeParseJSON()` |
| `reliability.js` | Schema validation, retry | `validateAssessmentSchema()`, `executeWithRetry()` |
| `interRaterReliability.js` | IRR metrics | `calculateWeightedKappa()`, `calculateICC()`, `comprehensiveIRRAnalysis()` |
| `validationStudy.js` | Validity metrics | `calculateCVR()`, `calculateCronbachsAlpha()` |
| `fairnessAudit.js` | Bias detection | `calculateCohensD()`, `analyzeScoreDistribution()` |
| `dataConsistency.js` | Data integrity | `saveAssessmentWithTransaction()`, `syncStudentProgress()` |
| `humanInTheLoop.js` | Review queue | `shouldFlagForReview()`, `createReviewQueueItem()` |
| `gradeLevelCalibration.js` | Grade norms | `getCognitiveStage()`, `getGradeExpectations()` |

---

**Last Updated:** December 31, 2025  
**Version:** 1.0  
**Maintainer:** HOTS AI Development Team
