# HOTS AI ChatLoop - Research Protocol Document

## Study Title
**Validating AI-Based Assessment of Higher-Order Thinking Skills (HOTS) in Thai Secondary Education**

## Version Information
- **Protocol Version:** 2.0
- **Date:** December 2024
- **Principal Investigator:** [School/Institution Name]
- **IRB Status:** [Pending/Approved - IRB#: ________]

---

## 1. Abstract

This research protocol outlines the methodology for validating an AI-powered assessment system that evaluates students' Higher-Order Thinking Skills (HOTS) using the A.R.C.E. rubric framework (Analysis, Reasoning, Creativity, Evidence). The study aims to establish inter-rater reliability between AI assessments and expert human evaluators, while ensuring ethical data handling and privacy protection for minor participants.

---

## 2. Study Objectives

### 2.1 Primary Objectives
1. Validate the reliability of GPT-4o-mini based HOTS assessment against expert human evaluation
2. Establish inter-rater reliability metrics (Cohen's Kappa ≥ 0.7, Pearson r ≥ 0.8)
3. Identify systematic biases in AI assessment across different HOTS dimensions

### 2.2 Secondary Objectives
1. Measure effect size of AI feedback on student HOTS development
2. Analyze learning outcome achievement patterns
3. Develop guidelines for AI-assisted educational assessment

---

## 3. Study Design

### 3.1 Design Type
- **Type:** Prospective observational study with embedded validation cohort
- **Duration:** One academic year (2 semesters)
- **Setting:** Thai secondary schools (grades ม.1 - ม.6)

### 3.2 Participant Groups
| Group | Description | N (Target) |
|-------|-------------|------------|
| Students | Regular platform users | 500-1000 |
| Teachers | Content creators, expert calibrators | 20-50 |
| Expert Panel | HOTS assessment specialists | 5-10 |

---

## 4. Methodology

### 4.1 Data Collection

#### 4.1.1 Assessment Data
```
Collection Points:
- Student responses to HOTS questions
- AI-generated rubric scores (A.R.C.E. 0-5 each)
- AI-generated feedback
- Response timestamps
- Session metadata (duration, word count)
```

#### 4.1.2 Calibration Data
```
Expert Calibration Protocol:
1. Random sampling of assessments (n=200 per semester)
2. Stratified by: grade level, subject, AI confidence level
3. Double-blind expert evaluation
4. Discrepancy resolution process
```

### 4.2 Assessment Framework

#### A.R.C.E. Rubric Dimensions
| Dimension | Description | Scoring |
|-----------|-------------|---------|
| **A**nalysis | Breaking down concepts, identifying patterns | 0-5 |
| **R**easoning | Logical argumentation, causal connections | 0-5 |
| **C**reativity | Novel ideas, alternative perspectives | 0-5 |
| **E**vidence | Use of facts, examples, citations | 0-5 |

### 4.3 Statistical Analysis Plan

#### Primary Analyses
1. **Inter-Rater Reliability**
   - Cohen's Kappa (categorical agreement)
   - Pearson correlation (continuous scores)
   - Intraclass Correlation Coefficient (ICC)

2. **Bias Analysis**
   - Bland-Altman plots
   - Mean bias per dimension
   - Systematic over/under-scoring patterns

#### Secondary Analyses
1. **Effect Size** (Cohen's d) for pre/post comparisons
2. **Regression models** for predictors of HOTS development
3. **Cluster analysis** for learning outcome patterns

---

## 5. Ethical Considerations

### 5.1 Informed Consent

#### For Students Under 18
1. **Parental Consent Required** (see `/views/ParentalConsent.vue`)
2. Student assent obtained
3. Bilingual consent forms (Thai/English)
4. Right to withdraw at any time

#### For Teachers
1. Standard informed consent
2. Data usage agreement
3. Confidentiality agreement for expert calibration

### 5.2 Data Protection (PDPA Compliance)

| Principle | Implementation |
|-----------|----------------|
| Purpose Limitation | Data used only for assessment and research |
| Data Minimization | Collect only necessary fields |
| Accuracy | Rectification rights available |
| Storage Limitation | 2-year retention, then anonymization |
| Integrity | Encrypted storage, audit trails |
| Confidentiality | Role-based access control |

### 5.3 Anonymization Protocol

For research data export:
1. Remove direct identifiers (name, email, student ID)
2. Replace with random research IDs
3. Apply k-anonymity (k ≥ 5) for quasi-identifiers
4. Aggregate data by grade/school level

---

## 6. AI System Specifications

### 6.1 Model Details
- **Model:** OpenAI GPT-4o-mini
- **Temperature:** 0.3 (for consistency)
- **Prompt Version:** 2.0 (documented)

### 6.2 Audit Trail
Each assessment records:
- Model version
- Prompt version
- Processing time
- Retry count
- Confidence score

### 6.3 Transparency Measures
- Right to Explanation feature (see `/views/RightToExplanation.vue`)
- Appeal mechanism for students
- Teacher override capability

---

## 7. Quality Assurance

### 7.1 Data Quality Checks
- Automated consistency validation
- Weekly reliability reports
- Monthly expert calibration sessions

### 7.2 System Monitoring
- API response logging
- Error tracking and alerting
- Performance metrics dashboard

---

## 8. Data Sharing and Publication

### 8.1 Open Data Commitment
- Anonymized dataset will be shared upon study completion
- Code and methodology publicly available
- Pre-registration on appropriate registry

### 8.2 Publication Plan
1. Technical validation paper (target: Q2 2025)
2. Educational impact study (target: Q4 2025)
3. Methodology guidelines (target: 2026)

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI bias affecting student grades | Medium | High | Expert calibration, appeal process |
| Data breach | Low | High | Encryption, access controls |
| Low consent rate | Medium | Medium | Clear communication, incentives |
| API service disruption | Low | Medium | Fallback procedures, caching |

---

## 10. Timeline

```
Month 1-2:   Setup, consent collection
Month 3-6:   Data collection (Semester 1)
Month 7:     Mid-study analysis
Month 8-11:  Data collection (Semester 2)
Month 12:    Final analysis, reporting
```

---

## 11. Budget and Resources

| Item | Estimated Cost |
|------|----------------|
| OpenAI API usage | $XXX/year |
| Firebase hosting | $XXX/year |
| Expert panel compensation | $XXX |
| Research assistant | $XXX |
| Publication fees | $XXX |

---

## 12. Contact Information

**Principal Investigator:**
- Name: [Name]
- Email: [email]
- Phone: [phone]

**Data Protection Officer:**
- Email: dpo@school.ac.th

**Ethics Committee:**
- IRB Contact: [contact information]

---

## 13. Appendices

### Appendix A: Consent Forms
- See `/src/views/ParentalConsent.vue`
- See `/src/views/DataRetentionPolicy.vue`

### Appendix B: A.R.C.E. Rubric Details
- Full rubric specification in `/functions/utils/prompts.js`

### Appendix C: System Architecture
- See `/ARCHITECTURE.md`

### Appendix D: IRR Calculation Methods
- See `/functions/utils/interRaterReliability.js`

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Nov 2024 | Initial draft | - |
| 2.0 | Dec 2024 | Added PDPA compliance, Right to Explanation | - |

---

*This protocol has been prepared in accordance with the Declaration of Helsinki and Thai PDPA requirements.*
