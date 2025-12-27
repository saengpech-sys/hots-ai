# 📊 Validation Study Protocol — HOTS AI ChatLoop

<div align="center">

[![IRR](https://img.shields.io/badge/Target%20κ-%E2%89%A5%200.70-success)](../GOLDEN_DATASET_IRR.md)
[![Achieved](https://img.shields.io/badge/Achieved%20κ-0.72-blue)](../GOLDEN_DATASET_IRR.md)
[![ICC](https://img.shields.io/badge/ICC-0.81-purple)](../GOLDEN_DATASET_IRR.md)

**Version 1.1** | **Last Updated: December 25, 2025**

*Protocol for establishing construct validity and inter-rater reliability (IRR) of AI-based HOTS assessment*

**Related:** [GOLDEN_DATASET_IRR.md](../GOLDEN_DATASET_IRR.md) | [RESEARCH_PROTOCOL.md](../RESEARCH_PROTOCOL.md)

</div>

---

## 📑 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Study Rationale](#2-study-rationale)
3. [Golden Dataset Creation](#3-golden-dataset-creation)
4. [Expert Rater Selection](#4-expert-rater-selection)
5. [Training & Calibration](#5-training--calibration)
6. [Data Collection Procedure](#6-data-collection-procedure)
7. [IRR Calculation Methodology](#7-irr-calculation-methodology)
8. [Acceptance Criteria](#8-acceptance-criteria)
9. [Reporting Requirements](#9-reporting-requirements)
10. [Limitations & Scope](#10-limitations--scope)

---

## 1. Executive Summary

### Purpose

This document establishes a rigorous protocol for validating the HOTS AI ChatLoop assessment system through:

1. **Construct Validity** — Ensuring the system measures what it claims to measure (written HOTS expression)
2. **Inter-Rater Reliability (IRR)** — Demonstrating agreement between AI and expert human raters
3. **Criterion Validity** — Correlating AI scores with established measures

### Critical Clarification

> ⚠️ **What We Validate:**  
> This study validates **AI scoring of written HOTS expression**, NOT the underlying cognitive processes themselves.
>
> The system assesses how well students **demonstrate** thinking skills in text, not whether they **possess** those skills in general.

### Key Metrics

| Metric | Minimum Threshold | Target | Excellent |
|--------|-------------------|--------|-----------|
| **Weighted Kappa (κw)** | ≥ 0.60 | ≥ 0.70 | ≥ 0.80 |
| **ICC (2,1)** | ≥ 0.70 | ≥ 0.80 | ≥ 0.90 |
| **Percent Adjacent Agreement** | ≥ 85% | ≥ 90% | ≥ 95% |
| **MAE (Mean Absolute Error)** | ≤ 1.0 | ≤ 0.75 | ≤ 0.50 |

---

## 2. Study Rationale

### The Reliability ≠ Validity Problem

High IRR (reliability) does not guarantee validity:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RELIABILITY vs VALIDITY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   🎯 HIGH RELIABILITY, LOW VALIDITY                                         │
│   ├── AI and experts agree on scores consistently                          │
│   ├── BUT: May be measuring "writing quality" not "thinking quality"       │
│   └── Example: Fluent BS gets high scores, rough genius gets low           │
│                                                                             │
│   🎯 HIGH RELIABILITY, HIGH VALIDITY (Our Goal)                            │
│   ├── AI and experts agree on scores consistently                          │
│   ├── AND: Scores correlate with independent HOTS measures                 │
│   └── AND: Scores predict learning outcomes                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Operational Definitions

This study validates the following **operational definitions** (not theoretical constructs):

| Dimension | Operational Definition | What We Actually Measure |
|-----------|------------------------|--------------------------|
| **Analysis** | Identification of distinct claims/components in text | Text segmentation quality |
| **Reasoning** | Presence of if-then structures, causal language | Logical connectors in text |
| **Creativity** | **Textual novelty** — uncommon perspectives in responses | Atypical phrasing/examples |
| **Evidence** | Presence of specific examples, data, citations | Concrete details in text |

---

## 3. Golden Dataset Creation

### Dataset Specifications

| Attribute | Requirement |
|-----------|-------------|
| **Minimum Size** | 200 responses per grade band |
| **Grade Bands** | ป.4-6, ม.1-3, ม.4-6 |
| **Score Distribution** | Stratified across 0-5 per dimension |
| **Subject Coverage** | Minimum 3 subjects per grade band |
| **Question Types** | Both open-ended and scenario-based |

### Stratified Sampling Matrix

```
Grade Band: ม.4-6 (Example)
┌───────────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Score Range   │   0     │   1     │   2     │   3     │   4     │   5     │
├───────────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Analysis      │  15     │  25     │  40     │  50     │  45     │  25     │
│ Reasoning     │  15     │  25     │  40     │  50     │  45     │  25     │
│ Creativity    │  20     │  30     │  50     │  50     │  35     │  15     │
│ Evidence      │  15     │  25     │  40     │  50     │  45     │  25     │
└───────────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
Target: ~200 responses with balanced representation
```

### Selection Process

1. **Random Sampling** — Initial pool from production data
2. **AI Screening** — Pre-score with AI system
3. **Stratification** — Select to achieve balanced distribution
4. **De-identification** — Remove all PII before expert review
5. **Quality Check** — Remove incomplete/corrupted responses

### Anchor Responses

For each score level (0-5) in each dimension, identify 2-3 **anchor responses**:
- Clear examples that define the boundary
- Reviewed and agreed upon by all expert raters
- Used for training and calibration

---

## 4. Expert Rater Selection

### Eligibility Criteria

| Criterion | Requirement |
|-----------|-------------|
| **Education** | Master's degree or higher in Education, Psychology, or related field |
| **Experience** | Minimum 5 years K-12 teaching experience |
| **Specialization** | Background in assessment or educational measurement (preferred) |
| **Language** | Native Thai speaker with academic writing proficiency |
| **Availability** | Commitment to complete rating within specified timeframe |

### Minimum Panel Size

```
Primary Validation:
  - Minimum: 3 expert raters
  - Target: 5 expert raters
  - Each response rated by: At least 2 experts + 1 AI

Calibration Subset (20%):
  - Rated by: All experts + AI
  - Used for initial IRR calculation
```

### Conflict of Interest

Experts must declare:
- No involvement in HOTS AI system development
- No financial interest in the project
- No prior relationship with students in the dataset

---

## 5. Training & Calibration

### Training Protocol (Day 1)

| Session | Duration | Content |
|---------|----------|---------|
| **Session 1** | 2 hours | A.R.C.E. Framework Introduction |
| **Session 2** | 2 hours | Scoring Rubric Deep Dive |
| **Session 3** | 2 hours | Anchor Response Practice |
| **Session 4** | 2 hours | Independent Practice + Discussion |

### Training Materials

1. **A.R.C.E. Framework Guide** — Operational definitions, NOT theoretical
2. **Scoring Rubric** — Anchored with clear examples per level
3. **Operational Definition Clarification**:
   ```
   ⚠️ CRITICAL TRAINING POINT:
   
   "Creativity" in this rubric = TEXTUAL NOVELTY
   - We assess: Does this response contain uncommon perspectives/examples?
   - We do NOT assess: Is this student genuinely creative in real life?
   
   High score: Unusual framing that is nonetheless relevant and well-argued
   Low score: Common, template-like responses (even if "correct")
   ```
4. **Practice Responses** — 20 pre-scored responses for practice

### Calibration Session (Day 2)

1. **Blind Rating** — Each expert independently rates 10 calibration responses
2. **Agreement Check** — Calculate initial IRR
3. **Discrepancy Discussion** — Review any ratings that differ by >1 point
4. **Consensus Building** — Adjust understanding, NOT force agreement
5. **Re-calibration** — Rate another 10 responses
6. **Final Check** — κ ≥ 0.60 among experts before proceeding

### Calibration Acceptance Criterion

```
Expert-Expert Agreement (before AI comparison):
  - Weighted Kappa (κw) ≥ 0.65
  - Adjacent Agreement ≥ 85%
  
If not met: Additional training session required
If still not met after 2 sessions: Expert panel reconstitution
```

---

## 6. Data Collection Procedure

### Rating Interface

Experts use a standardized rating interface that displays:
- Response text only (no student identifiers)
- Question/prompt context
- Scoring rubric reference
- Input fields for 4 dimensions (0-5 each)
- Optional comment field for ambiguous cases

### Blinding Protocol

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BLINDING PROTOCOL                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Experts are BLIND to:                                                     │
│   ├── Student identity                                                      │
│   ├── School/region                                                         │
│   ├── AI scores                                                             │
│   ├── Other experts' scores                                                 │
│   └── Order of responses (randomized per expert)                           │
│                                                                             │
│   Experts CAN see:                                                          │
│   ├── Response text                                                         │
│   ├── Question/prompt                                                       │
│   ├── Grade level (for calibration context)                                │
│   └── Subject area                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Rating Schedule

| Week | Activity | Responses |
|------|----------|-----------|
| 1 | Calibration | 20 |
| 2-3 | Primary Rating (batch 1) | 80 |
| 4-5 | Primary Rating (batch 2) | 80 |
| 6 | Discrepancy Resolution | 20 |
| 7 | Analysis & Reporting | - |

### Quality Control

- **Intra-Rater Reliability** — 10% of responses rated twice by same expert (different days)
- **Drift Detection** — Compare early vs late ratings within each expert
- **Attention Checks** — 5 pre-scored "anchor" responses embedded throughout

---

## 7. IRR Calculation Methodology

### Primary Metrics

#### 1. Cohen's Weighted Kappa (κw)

For ordinal data (0-5 scale), use **quadratic weights**:

```
Weight(i,j) = 1 - [(i-j)² / (k-1)²]

Where:
  i, j = score levels being compared
  k = number of score levels (6 for 0-5 scale)
```

#### 2. Intraclass Correlation Coefficient — ICC(2,1)

Two-way random effects, single measures, absolute agreement:

```
ICC(2,1) = (MSR - MSE) / [MSR + (k-1)×MSE + (k/n)×(MSC - MSE)]

Where:
  MSR = Mean Square for Rows (subjects)
  MSC = Mean Square for Columns (raters)
  MSE = Mean Square for Error
  k = number of raters
  n = number of subjects
```

#### 3. Mean Absolute Error (MAE)

```
MAE = Σ|AIₛcore - Expertₛcore| / n

Interpretation:
  MAE ≤ 0.5: Excellent agreement
  MAE ≤ 1.0: Acceptable agreement
  MAE > 1.0: Poor agreement
```

### Dimension-Level Analysis

Calculate IRR separately for each A.R.C.E. dimension:

```javascript
const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']

dimensions.forEach(dim => {
  const result = {
    dimension: dim,
    weightedKappa: calculateWeightedKappa(ai[dim], expert[dim]),
    icc: calculateICC(ai[dim], expert[dim]),
    mae: calculateMAE(ai[dim], expert[dim]),
    percentAgreement: calculatePercentAgreement(ai[dim], expert[dim]),
    adjacentAgreement: calculateAdjacentAgreement(ai[dim], expert[dim])
  }
  console.log(`${dim}: κw=${result.weightedKappa}, ICC=${result.icc}`)
})
```

### Confidence Intervals

Report 95% confidence intervals for all metrics using:
- Bootstrap method (n=1000 resamples) for κw
- Fisher's z-transformation for ICC

---

## 8. Acceptance Criteria

### Publication-Ready Standard

| Metric | Minimum | Pass | Excellent |
|--------|---------|------|-----------|
| **κw (overall)** | ≥ 0.60 | ≥ 0.70 | ≥ 0.80 |
| **κw (per dimension)** | All ≥ 0.55 | All ≥ 0.65 | All ≥ 0.75 |
| **ICC(2,1) overall** | ≥ 0.70 | ≥ 0.80 | ≥ 0.90 |
| **MAE overall** | ≤ 1.0 | ≤ 0.75 | ≤ 0.50 |
| **Adjacent Agreement** | ≥ 85% | ≥ 90% | ≥ 95% |

### Decision Matrix

```
IF κw ≥ 0.60 AND ICC ≥ 0.70:
  → PASS: System meets publication standard
  → Report: Full IRR statistics with confidence intervals

IF κw < 0.60 OR ICC < 0.70:
  → FAIL: System requires improvement
  → Action: Identify problematic dimensions
  → Remediation: Prompt engineering, rubric refinement, or expert re-calibration
  → Re-test: After remediation, conduct new validation study

IF κw ≥ 0.60 AND ICC ≥ 0.70 BUT any single dimension κw < 0.55:
  → CONDITIONAL PASS: Report limitation clearly
  → Action: Flag dimension in all reports
  → User guidance: Interpret that dimension with caution
```

---

## 9. Reporting Requirements

### Required Disclosures

All publications and reports using this system must include:

#### 1. IRR Statistics Table

```markdown
| Metric | Analysis | Reasoning | Creativity | Evidence | Overall |
|--------|----------|-----------|------------|----------|---------|
| κw     | 0.72     | 0.68      | 0.63       | 0.70     | 0.71    |
| ICC    | 0.81     | 0.76      | 0.72       | 0.79     | 0.80    |
| MAE    | 0.65     | 0.72      | 0.85       | 0.68     | 0.68    |
| n      | 200      | 200       | 200        | 200      | 200     |
```

#### 2. Validity Scope Statement

```
This assessment measures Written Expression of Higher-Order Thinking Skills
(HOTS) in Thai language text responses. Scores reflect the quality of HOTS
demonstration in THIS SPECIFIC RESPONSE, not generalized cognitive ability.

Creativity scores measure TEXTUAL NOVELTY (atypical phrasing and perspectives)
not creative production ability in other domains (art, invention, design).
```

#### 3. Known Limitations

```
Limitations:
1. Ordinal scale (0-5): Arithmetic mean should be interpreted cautiously
2. Text-only assessment: Cannot evaluate visual/spatial/kinesthetic thinking
3. GPT-4o-mini backbone: Closed-source model, reproducibility limited
4. Thai language only: Cross-language validity not established
5. Creativity construct: Measures textual novelty, not creative production
```

### Publication Checklist

- [ ] IRR statistics with 95% CI reported
- [ ] Sample size and demographic composition described
- [ ] Expert rater qualifications listed
- [ ] Training/calibration procedure summarized
- [ ] Validity scope statement included
- [ ] Limitations section present
- [ ] Operational definitions clarified

---

## 10. Limitations & Scope

### Scope of Validation

This protocol validates:
- ✅ AI-expert agreement on scoring rubric application
- ✅ Consistency of AI scoring across responses
- ✅ Appropriate score distribution by grade level

This protocol does NOT validate:
- ❌ Whether A.R.C.E. measures "true" cognitive ability
- ❌ Whether scores predict future academic success
- ❌ Whether scores transfer to non-text domains
- ❌ Cross-cultural validity of the construct

### Criterion Validity (Future Work)

To strengthen validity claims, future studies should correlate AI scores with:
- Standardized HOTS assessments (e.g., PISA-style tasks)
- Teacher holistic ratings
- Academic performance (GPA, test scores)
- Transfer tasks in different domains

### Re-Validation Triggers

The validation study should be repeated when:
1. OpenAI model version changes (e.g., GPT-5 release)
2. Rubric or prompt undergoes major revision
3. System is deployed to new grade levels or subjects
4. More than 12 months since last validation
5. User feedback suggests scoring inconsistencies

---

## Appendix A: Statistical Formulas

### Weighted Kappa (Quadratic)

```javascript
function calculateWeightedKappa(rater1, rater2, maxScore = 5) {
  const k = maxScore + 1 // Number of categories
  const n = rater1.length
  
  // Create weight matrix (quadratic)
  const weights = []
  for (let i = 0; i < k; i++) {
    weights[i] = []
    for (let j = 0; j < k; j++) {
      weights[i][j] = 1 - Math.pow(i - j, 2) / Math.pow(k - 1, 2)
    }
  }
  
  // Create observed frequency matrix
  const observed = Array(k).fill().map(() => Array(k).fill(0))
  for (let i = 0; i < n; i++) {
    const r1 = Math.round(rater1[i])
    const r2 = Math.round(rater2[i])
    observed[r1][r2]++
  }
  
  // Calculate marginals
  const rowMarginals = observed.map(row => row.reduce((a, b) => a + b, 0) / n)
  const colMarginals = []
  for (let j = 0; j < k; j++) {
    colMarginals[j] = observed.reduce((sum, row) => sum + row[j], 0) / n
  }
  
  // Calculate Po (weighted observed agreement)
  let po = 0
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      po += weights[i][j] * observed[i][j] / n
    }
  }
  
  // Calculate Pe (weighted expected agreement)
  let pe = 0
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      pe += weights[i][j] * rowMarginals[i] * colMarginals[j]
    }
  }
  
  // Weighted Kappa
  const kappa = (po - pe) / (1 - pe)
  
  return Math.round(kappa * 1000) / 1000
}
```

### ICC(2,1)

```javascript
function calculateICC_2_1(ratings) {
  // ratings: Array of [ai_score, expert_score] pairs
  const n = ratings.length // Number of subjects
  const k = 2 // Number of raters
  
  // Calculate means
  const grandMean = ratings.flat().reduce((a, b) => a + b, 0) / (n * k)
  const subjectMeans = ratings.map(pair => (pair[0] + pair[1]) / k)
  const raterMeans = [
    ratings.reduce((sum, pair) => sum + pair[0], 0) / n,
    ratings.reduce((sum, pair) => sum + pair[1], 0) / n
  ]
  
  // Calculate sum of squares
  let SSR = 0 // Between subjects
  let SSC = 0 // Between raters
  let SSE = 0 // Residual
  
  for (let i = 0; i < n; i++) {
    SSR += k * Math.pow(subjectMeans[i] - grandMean, 2)
  }
  
  for (let j = 0; j < k; j++) {
    SSC += n * Math.pow(raterMeans[j] - grandMean, 2)
  }
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      SSE += Math.pow(ratings[i][j] - subjectMeans[i] - raterMeans[j] + grandMean, 2)
    }
  }
  
  // Mean squares
  const MSR = SSR / (n - 1)
  const MSC = SSC / (k - 1)
  const MSE = SSE / ((n - 1) * (k - 1))
  
  // ICC(2,1)
  const icc = (MSR - MSE) / (MSR + (k - 1) * MSE + (k / n) * (MSC - MSE))
  
  return Math.round(icc * 1000) / 1000
}
```

---

## Appendix B: Training Materials Template

### Expert Rater Handbook (Outline)

1. **Introduction**
   - Purpose of the study
   - Your role as expert rater
   - Compensation and timeline

2. **The A.R.C.E. Framework**
   - Analysis: What to look for
   - Reasoning: What to look for
   - Creativity: **TEXTUAL NOVELTY** clarification
   - Evidence: What to look for

3. **Scoring Rubric**
   - Score 0: Definition + 2 anchor examples
   - Score 1: Definition + 2 anchor examples
   - Score 2: Definition + 2 anchor examples
   - Score 3: Definition + 2 anchor examples
   - Score 4: Definition + 2 anchor examples
   - Score 5: Definition + 2 anchor examples

4. **Common Pitfalls**
   - Halo effect (one strong dimension inflates others)
   - Central tendency (avoiding extreme scores)
   - Writing quality bias (penalizing non-native speakers)
   - Length bias (longer ≠ better)

5. **Ambiguous Cases**
   - When to use the comment field
   - Handling off-topic responses
   - Handling multilingual responses

---

<div align="center">

**HOTS AI ChatLoop — Validation Study Protocol**

*Version 1.0 | December 25, 2025*

**This document must be followed for all validation studies.**

</div>
