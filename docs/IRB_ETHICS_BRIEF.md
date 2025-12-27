# 📋 IRB/Ethics Committee Brief

<div align="center">

[![PDPA](https://img.shields.io/badge/PDPA-Compliant-success)](./PDPA_COMPLIANCE_AND_DATA_RETENTION.md)
[![Ethics](https://img.shields.io/badge/Ethics-Safeguards%20In%20Place-blue)](../RESEARCH_PROTOCOL.md)

## HOTS AI ChatLoop — Ethical Considerations for Research Use

**Version 1.1** | **December 2025**

*เอกสารสรุปสำหรับคณะกรรมการจริยธรรมการวิจัย*

**Related:** [RESEARCH_PROTOCOL.md](../RESEARCH_PROTOCOL.md) | [PDPA_COMPLIANCE_AND_DATA_RETENTION.md](./PDPA_COMPLIANCE_AND_DATA_RETENTION.md)

</div>

---

## 1. Executive Summary

**HOTS AI ChatLoop** เป็นระบบประเมินทักษะการคิดขั้นสูง (Higher-Order Thinking Skills) ด้วย AI สำหรับนักเรียนระดับ ป.4 - ม.6 โดยใช้ GPT-4o-mini ในการให้คะแนนและ feedback

### Key Ethical Safeguards

| Concern | Mitigation |
|---------|------------|
| **Informed Consent** | Consent modal ก่อนใช้งานครั้งแรก + ผู้ปกครองยินยอมสำหรับผู้เยาว์ |
| **Data Privacy** | PDPA compliant, K-Anonymity (k≥5) สำหรับข้อมูลวิจัย |
| **AI Transparency** | Chain of Thought visible, audit trail ทุก assessment |
| **Right to Erasure** | API `deleteStudentData` พร้อมใช้งาน |
| **Fairness** | Fairness audit module, DIF analysis |
| **Human Oversight** | Human-in-the-Loop สำหรับ high-stakes decisions |

---

## 2. System Purpose & Scope

### 2.1 What the System Does

- ประเมินคำตอบเขียนของนักเรียนตาม **A.R.C.E. Framework**:
  - **A**nalysis (การวิเคราะห์)
  - **R**easoning (การให้เหตุผล)
  - **C**reativity (ความแปลกใหม่ในข้อความ)*
  - **E**vidence (การใช้หลักฐาน)

- ให้ feedback และ scaffolding hints เพื่อพัฒนาทักษะ
- ติดตาม Learning Outcomes (LO) ที่ผ่าน

### 2.2 Critical Clarification*

> ⚠️ **"Creativity" Dimension**  
> ระบบวัด **"Textual Novelty"** — ความแปลกใหม่/ไม่ซ้ำแบบในข้อความที่เขียน  
> ไม่ใช่การวัดความสามารถสร้างสรรค์โดยทั่วไป (creative production ability)

### 2.3 What the System Does NOT Do

- ❌ ไม่ตัดสินผลการเรียนสุดท้าย (ครูต้องตรวจสอบ)
- ❌ ไม่ใช้สำหรับการคัดเลือก/admission โดยลำพัง
- ❌ ไม่เก็บข้อมูลอ่อนไหว (สุขภาพ, ศาสนา, ชีวภาพ)
- ❌ ไม่ส่ง PII ไปยัง OpenAI (เฉพาะคำตอบที่ anonymized)

---

## 3. AI System Transparency

### 3.1 The "Black Box" Issue

| Component | Transparency Level | Explanation |
|-----------|-------------------|-------------|
| **Prompt** | ✅ Open | เปิดเผยใน `prompts.js` ตรวจสอบได้ |
| **Output** | ✅ Open | Chain of Thought แสดงเหตุผลของ AI |
| **Model** | ❌ Closed | GPT-4o-mini เป็น proprietary ของ OpenAI |
| **Training Data** | ❌ Unknown | OpenAI ไม่เปิดเผย |

### 3.2 Mitigation Strategies

1. **Deterministic Configuration**: `temperature=0, seed=42` → ผลลัพธ์เหมือนเดิมทุกครั้ง
2. **Model Version Lock**: `gpt-4o-mini-2024-07-18` → ป้องกัน model drift
3. **Model Drift Detector**: ตรวจจับเมื่อ model เปลี่ยนพฤติกรรม
4. **Full Audit Trail**: บันทึกทุก parameter ใช้ reproduce ได้
5. **Human-in-the-Loop**: Flag สำหรับ review เมื่อ AI confidence ต่ำ

### 3.3 What We Can & Cannot Claim

| Claim | Validity |
|-------|----------|
| "AI ให้คะแนนเหมือนเดิมทุกครั้ง" | ✅ Valid (Deterministic) |
| "AI ให้คะแนนถูกต้อง" | ⚠️ Requires IRR validation study |
| "AI ให้คะแนนยุติธรรม" | ⚠️ Requires fairness audit |
| "AI อธิบายเหตุผลได้" | ⚠️ Partial (CoT shows what, not why) |

---

## 4. Data Protection (PDPA Compliance)

### 4.1 Data Collected

| Category | Data | Retention | Legal Basis |
|----------|------|-----------|-------------|
| **PII** | ชื่อ, อีเมล, รหัสนักเรียน | ใช้งาน + 1 ปี | Contract |
| **Learning Data** | คำตอบ, คะแนน, feedback | 3 ปี | Contract + Consent |
| **Research Data** | Anonymized aggregates | 7 ปี | Legitimate Interest |
| **Consent Logs** | บันทึกการยินยอม | 10 ปี | Legal Obligation |

### 4.2 Data Subject Rights

| Right | Implementation |
|-------|----------------|
| **Access** | `exportPersonalData` API |
| **Erasure** | `deleteStudentData` API (full/pii_only/assessments_only) |
| **Rectification** | Teacher can edit via Admin LO Manager |
| **Portability** | JSON/CSV export available |

### 4.3 Third-Party Processing

| Service | Purpose | Data Sent | Safeguard |
|---------|---------|-----------|-----------|
| **Firebase** | Hosting, Database | All data | Google DPA, SOC2 |
| **OpenAI** | AI Assessment | คำตอบเท่านั้น (no PII) | API Terms, no training |

---

## 5. Consent Process

### 5.1 For Minors (อายุ < 20)

```
อายุ < 10 ปี:
└── ต้องได้รับความยินยอมจากผู้ปกครองเท่านั้น

อายุ 10-19 ปี:
└── ความยินยอมจากผู้ปกครอง + การรับทราบจากนักเรียน

อายุ 20+ ปี:
└── ความยินยอมจากเจ้าของข้อมูลโดยตรง
```

### 5.2 Consent Modal Content

เมื่อเข้าใช้ครั้งแรก แสดง:
1. วัตถุประสงค์การเก็บข้อมูล
2. ประเภทข้อมูลที่เก็บ
3. ระยะเวลาเก็บรักษา
4. สิทธิ์ของเจ้าของข้อมูล
5. ช่องทางติดต่อ DPO
6. ปุ่ม "ยินยอม" / "ไม่ยินยอม"

---

## 6. Research Use Guidelines

### 6.1 Appropriate Uses

| Use Case | Appropriateness |
|----------|-----------------|
| Formative classroom practice | ✅ Excellent |
| Teacher diagnostic | ✅ Good |
| Student self-reflection | ✅ Good |
| Research data collection (with IRR) | ✅ Good |
| Graded homework | ⚠️ Caution (combine with teacher review) |
| Final exam scoring | ❌ Not recommended |
| University admission | ❌ Not appropriate |

### 6.2 Required Disclosures in Research Publications

```markdown
## Limitations

1. This system measures written expression of HOTS in Thai text, 
   not underlying cognitive ability.

2. "Creativity" scores reflect textual novelty (atypical phrasing), 
   not creative production ability.

3. GPT-4o-mini is a closed-source model; full explainability 
   is not possible.

4. Scores 0-5 are ordinal; arithmetic means are approximations.

5. IRR Metrics: κ = [value], ICC = [value], MAE = [value]
```

### 6.3 IRR Requirements for Publication

| Metric | Minimum | Recommended |
|--------|---------|-------------|
| Weighted Kappa (κw) | ≥ 0.60 | ≥ 0.70 |
| ICC (2,1) | ≥ 0.70 | ≥ 0.80 |
| MAE | ≤ 1.0 | ≤ 0.75 |
| Sample Size | ≥ 100 | ≥ 200 |

---

## 7. Risk Assessment

### 7.1 Identified Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Biased scoring** | Medium | High | Fairness audit, DIF analysis |
| **Over-reliance on AI** | Medium | High | Teacher final authority, Practice Mode |
| **Privacy breach** | Low | High | Encryption, access control, audit logs |
| **Student anxiety** | Medium | Medium | Practice Mode (no gamification) |
| **Misinterpretation of scores** | High | Medium | UI tooltips, teacher training |

### 7.2 Incident Response

| Event | Response Time | Action |
|-------|---------------|--------|
| Data breach | < 72 hours | Notify PDPC, affected users |
| AI malfunction | < 24 hours | Fallback assessment, manual review |
| Bias detection | < 7 days | Pause affected dimension, recalibrate |

---

## 8. Contact Information

| Role | Contact |
|------|---------|
| **Data Protection Officer (DPO)** | [School DPO Email] |
| **Technical Lead** | [Developer Email] |
| **Principal Investigator** | [Researcher Email] |

---

## 9. Approval Checklist

| Item | Status |
|------|--------|
| □ PDPA compliance verified | |
| □ Consent process approved | |
| □ Data retention schedule approved | |
| □ AI transparency documentation reviewed | |
| □ Fairness audit plan approved | |
| □ IRR validation study planned | |
| □ Risk assessment accepted | |

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Next Review:** June 2026

