# 📋 PDPA Compliance & Data Retention Policy

<div align="center">

[![PDPA](https://img.shields.io/badge/PDPA%202562-Compliant-success)](../DPA_ASSESSMENT_CHECKLIST.md)
[![K-Anonymity](https://img.shields.io/badge/K--Anonymity-k%E2%89%A55-blue)](../RESEARCH_DATA_PIPELINE.md)
[![Retention](https://img.shields.io/badge/Retention-Policy%20Defined-purple)](#5-นโยบายการเก็บรักษาข้อมูล)

**Version 1.1** | **Effective Date: December 25, 2025**

*นโยบายคุ้มครองข้อมูลส่วนบุคคลและการเก็บรักษาข้อมูลสำหรับระบบ HOTS AI ChatLoop*

**Related:** [DPA_ASSESSMENT_CHECKLIST.md](../DPA_ASSESSMENT_CHECKLIST.md) | [IRB_ETHICS_BRIEF.md](./IRB_ETHICS_BRIEF.md)

</div>

---

## 📑 สารบัญ (Table of Contents)

1. [ภาพรวมและขอบเขต](#1-ภาพรวมและขอบเขต)
2. [คำนิยาม](#2-คำนิยาม)
3. [ประเภทข้อมูลที่เก็บรวบรวม](#3-ประเภทข้อมูลที่เก็บรวบรวม)
4. [ฐานกฎหมายในการประมวลผล](#4-ฐานกฎหมายในการประมวลผล)
5. [นโยบายการเก็บรักษาข้อมูล](#5-นโยบายการเก็บรักษาข้อมูล)
6. [สิทธิของเจ้าของข้อมูล](#6-สิทธิของเจ้าของข้อมูล)
7. [มาตรการรักษาความปลอดภัย](#7-มาตรการรักษาความปลอดภัย)
8. [การส่งหรือโอนข้อมูล](#8-การส่งหรือโอนข้อมูล)
9. [ขั้นตอนการลบข้อมูล](#9-ขั้นตอนการลบข้อมูล)
10. [การแจ้งเหตุละเมิดข้อมูล](#10-การแจ้งเหตุละเมิดข้อมูล)
11. [ข้อมูลติดต่อ DPO](#11-ข้อมูลติดต่อ-dpo)

---

## 1. ภาพรวมและขอบเขต

### 1.1 วัตถุประสงค์ของนโยบาย

นโยบายฉบับนี้กำหนดแนวปฏิบัติสำหรับ:
- การเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของผู้ใช้ระบบ HOTS AI ChatLoop
- ระยะเวลาการเก็บรักษาข้อมูลประเภทต่างๆ
- การปฏิบัติตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)

### 1.2 ขอบเขตการบังคับใช้

นโยบายนี้ใช้กับ:
- นักเรียนทุกระดับชั้นที่ใช้ระบบ
- ครูและผู้ดูแลระบบ
- ผู้วิจัยที่เข้าถึงข้อมูลเพื่อการวิจัย
- ระบบทั้งหมดที่เก็บหรือประมวลผลข้อมูล (Firebase, OpenAI)

### 1.3 หลักการสำคัญ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PDPA CORE PRINCIPLES                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. 📊 DATA MINIMIZATION (เก็บเท่าที่จำเป็น)                                │
│      └── เก็บเฉพาะข้อมูลที่จำเป็นต่อการให้บริการและการวิจัย                   │
│                                                                             │
│   2. 🎯 PURPOSE LIMITATION (ใช้ตามวัตถุประสงค์)                              │
│      └── ใช้ข้อมูลตามที่แจ้งไว้เท่านั้น                                      │
│                                                                             │
│   3. ⏰ STORAGE LIMITATION (จำกัดระยะเวลา)                                   │
│      └── เก็บไว้เฉพาะตามระยะเวลาที่กำหนด                                     │
│                                                                             │
│   4. 🔒 SECURITY (รักษาความปลอดภัย)                                          │
│      └── ปกป้องข้อมูลด้วยมาตรการทางเทคนิคและบริหาร                           │
│                                                                             │
│   5. ✋ RIGHTS RESPECT (เคารพสิทธิ)                                          │
│      └── รับรองสิทธิของเจ้าของข้อมูลตาม PDPA                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. คำนิยาม

| คำศัพท์ | ความหมาย |
|--------|----------|
| **ข้อมูลส่วนบุคคล (PII)** | ข้อมูลที่สามารถระบุตัวบุคคลได้ ไม่ว่าทางตรงหรือทางอ้อม |
| **ข้อมูลอ่อนไหว** | ข้อมูลที่อาจก่อให้เกิดการเลือกปฏิบัติ (ไม่มีการเก็บในระบบนี้) |
| **เจ้าของข้อมูล** | นักเรียน ครู หรือผู้ใช้ที่ข้อมูลเป็นของตน |
| **ผู้ควบคุมข้อมูล** | องค์กร/สถานศึกษาที่รับผิดชอบการประมวลผล |
| **ผู้ประมวลผลข้อมูล** | บริการภายนอก (Firebase, OpenAI) |
| **การทำให้ไม่สามารถระบุตัว** | K-Anonymity หรือ Pseudonymization |

---

## 3. ประเภทข้อมูลที่เก็บรวบรวม

### 3.1 ข้อมูลส่วนบุคคล (PII)

| ข้อมูล | ตัวอย่าง | วัตถุประสงค์ | ระยะเวลาเก็บ |
|--------|---------|-------------|--------------|
| **ชื่อ-นามสกุล** | นายสมชาย ใจดี | ระบุตัวตน, แสดงผล | ตลอดการใช้งาน + 1 ปี |
| **อีเมล** | student@school.ac.th | เข้าสู่ระบบ, ติดต่อ | ตลอดการใช้งาน + 1 ปี |
| **รหัสนักเรียน** | 12345 | ระบุตัวตนในสถานศึกษา | ตลอดการใช้งาน + 1 ปี |
| **ชั้น/ห้อง/เลขที่** | ม.4/1 เลขที่ 15 | จัดกลุ่มการเรียน | ตลอดการใช้งาน + 1 ปี |
| **รูปโปรไฟล์** | URL รูปภาพ | แสดงผลบัญชี | ตลอดการใช้งาน |

### 3.2 ข้อมูลการเรียนรู้ (Learning Data)

| ข้อมูล | คำอธิบาย | วัตถุประสงค์ | ระยะเวลาเก็บ |
|--------|----------|-------------|--------------|
| **คำตอบนักเรียน** | ข้อความตอบคำถาม | ประเมิน HOTS | 3 ปี |
| **คะแนน A.R.C.E.** | 0-5 ต่อมิติ | วัดผลการเรียนรู้ | 3 ปี |
| **Feedback** | ข้อเสนอแนะ AI | ส่งเสริมการเรียน | 3 ปี |
| **LO ที่ผ่าน** | รหัส LO | ติดตามความก้าวหน้า | 3 ปี |
| **คะแนน Gamification** | แต้ม, Badge, Streak | กระตุ้นการเรียน | 3 ปี |

### 3.3 ข้อมูลสำหรับการวิจัย (Research Data)

| ข้อมูล | การประมวลผล | วัตถุประสงค์ | ระยะเวลาเก็บ |
|--------|-------------|-------------|--------------|
| **ข้อมูลรวม (Aggregated)** | ไม่มี PII | วิจัยและพัฒนา | 7 ปี |
| **ข้อมูล K-Anonymous** | ทำให้ไม่ระบุตัว (k≥5) | วิจัยเชิงสถิติ | 7 ปี |
| **Audit Trail** | Log การประเมิน | ตรวจสอบคุณภาพ | 3 ปี |

### 3.4 ข้อมูลที่ไม่เก็บ

ระบบนี้ **ไม่** เก็บรวบรวมข้อมูลต่อไปนี้:
- ❌ ข้อมูลสุขภาพ
- ❌ ข้อมูลศาสนา/ความเชื่อ
- ❌ ข้อมูลชีวภาพ (ลายนิ้วมือ, ใบหน้า)
- ❌ ข้อมูลพฤติกรรมนอกระบบ
- ❌ ข้อมูลการเงินครอบครัว

---

## 4. ฐานกฎหมายในการประมวลผล

### 4.1 สำหรับนักเรียน

| กิจกรรม | ฐานกฎหมาย | หมายเหตุ |
|---------|-----------|----------|
| **การให้บริการประเมิน** | สัญญา (Contract) | จำเป็นต่อการให้บริการ |
| **การวิเคราะห์การเรียนรู้** | ความยินยอม (Consent) | ต้องขอความยินยอมชัดแจ้ง |
| **การวิจัยโดยใช้ข้อมูลรวม** | ประโยชน์โดยชอบด้วยกฎหมาย | ข้อมูลทำให้ไม่ระบุตัวแล้ว |

### 4.2 สำหรับผู้เยาว์ (อายุต่ำกว่า 20 ปี)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONSENT FOR MINORS                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   อายุ < 10 ปี:                                                             │
│   └── ต้องได้รับความยินยอมจากผู้ปกครองเท่านั้น                                │
│                                                                             │
│   อายุ 10-19 ปี:                                                            │
│   └── ความยินยอมจากผู้ปกครอง + การรับทราบจากนักเรียน                         │
│                                                                             │
│   อายุ 20+ ปี:                                                              │
│   └── ความยินยอมจากเจ้าของข้อมูลโดยตรง                                       │
│                                                                             │
│   การดำเนินการ:                                                             │
│   1. แสดง Consent Modal เมื่อเข้าใช้ครั้งแรก                                 │
│   2. บันทึก consentGiven: true, consentDate, consentVersion                │
│   3. สำหรับผู้เยาว์ในสถานศึกษา: ถือว่าสถานศึกษาได้รับมอบหมายจากผู้ปกครอง     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Consent Form Template

```javascript
// Consent Modal Content (src/components/ConsentModal.vue)
const consentText = `
ข้าพเจ้ายินยอมให้ระบบ HOTS AI ChatLoop เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล
ของข้าพเจ้าตามนโยบายความเป็นส่วนตัว เพื่อวัตถุประสงค์ดังนี้:

1. ✅ การให้บริการประเมินทักษะการคิดขั้นสูง (HOTS)
2. ✅ การวิเคราะห์ความก้าวหน้าทางการเรียน
3. ✅ การปรับปรุงคุณภาพระบบ
4. ✅ การวิจัยทางการศึกษา (ข้อมูลรวมที่ไม่ระบุตัวตน)

ข้าพเจ้าเข้าใจว่า:
- ข้าพเจ้ามีสิทธิถอนความยินยอมได้ตลอดเวลา
- ข้าพเจ้ามีสิทธิขอลบข้อมูลส่วนบุคคลของข้าพเจ้า
- การถอนความยินยอมอาจทำให้ไม่สามารถใช้บริการบางส่วนได้
`;
```

---

## 5. นโยบายการเก็บรักษาข้อมูล

### 5.1 ตารางระยะเวลาเก็บรักษา

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATA RETENTION SCHEDULE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   CATEGORY              │ RETENTION      │ AFTER EXPIRY                     │
│   ──────────────────────┼────────────────┼────────────────────────────────  │
│   Active User Profile   │ While active   │ Delete after 1 year inactive    │
│   Assessment Data       │ 3 years        │ Anonymize → Archive 7 years     │
│   Learning Progress     │ 3 years        │ Anonymize → Archive 7 years     │
│   Gamification Data     │ 3 years        │ Delete                          │
│   Session Logs          │ 1 year         │ Delete                          │
│   Audit Trails          │ 3 years        │ Archive (security purposes)     │
│   Research Data (anon)  │ 7 years        │ Review for extension            │
│   Consent Records       │ 10 years       │ Required by law                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 เหตุผลของระยะเวลา

| ระยะเวลา | เหตุผล |
|----------|--------|
| **1 ปี** | ระยะเวลาไม่ใช้งานที่เหมาะสมก่อนถือว่าหยุดใช้ |
| **3 ปี** | ครอบคลุมระยะการศึกษา 1 ช่วงชั้น (เช่น ม.1-3) |
| **7 ปี** | มาตรฐานการเก็บข้อมูลวิจัยทางการศึกษา |
| **10 ปี** | ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (บันทึกความยินยอม) |

### 5.3 กระบวนการหมดอายุอัตโนมัติ

```javascript
// Scheduled Function: dailyDataRetentionCheck (runs at 02:00 daily)

async function processExpiredData() {
  const now = new Date();
  
  // 1. Inactive users (no login > 1 year)
  const inactiveUsers = await db.collection('users')
    .where('lastLoginAt', '<', subYears(now, 1))
    .get();
  
  for (const user of inactiveUsers.docs) {
    await scheduleAccountDeletion(user.id, 30); // 30-day grace period
  }
  
  // 2. Assessments older than 3 years
  const oldAssessments = await db.collection('assessments')
    .where('createdAt', '<', subYears(now, 3))
    .where('isAnonymized', '==', false)
    .get();
  
  for (const assessment of oldAssessments.docs) {
    await anonymizeAssessment(assessment.id);
    await moveToArchive(assessment.id);
  }
  
  // 3. Sessions older than 1 year
  const oldSessions = await db.collection('sessions')
    .where('createdAt', '<', subYears(now, 1))
    .get();
  
  await batchDelete(oldSessions);
}
```

---

## 6. สิทธิของเจ้าของข้อมูล

### 6.1 สิทธิตาม PDPA

| สิทธิ | คำอธิบาย | ช่องทางใช้สิทธิ | ระยะเวลาดำเนินการ |
|-------|----------|-----------------|-------------------|
| **สิทธิเข้าถึง** | ขอดูข้อมูลของตนเอง | Profile > ข้อมูลของฉัน | ทันที (self-service) |
| **สิทธิแก้ไข** | แก้ไขข้อมูลให้ถูกต้อง | Profile > แก้ไขโปรไฟล์ | ทันที (self-service) |
| **สิทธิลบ** | ขอลบข้อมูลส่วนบุคคล | ติดต่อ DPO | ภายใน 30 วัน |
| **สิทธิคัดค้าน** | คัดค้านการประมวลผลบางอย่าง | ติดต่อ DPO | ภายใน 15 วัน |
| **สิทธิถอนความยินยอม** | ถอนความยินยอมได้ตลอดเวลา | Profile > ตั้งค่าความเป็นส่วนตัว | ทันที |
| **สิทธิโอนย้าย** | ขอรับข้อมูลในรูปแบบที่อ่านได้ | ติดต่อ DPO | ภายใน 30 วัน |

### 6.2 การใช้สิทธิลบข้อมูล (Right to Erasure)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RIGHT TO ERASURE PROCESS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. REQUEST                                                                │
│      ├── เจ้าของข้อมูลยื่นคำขอ (แบบฟอร์ม/อีเมล)                              │
│      ├── ยืนยันตัวตน (OTP/Google Sign-in)                                   │
│      └── ระบุขอบเขตการลบ (ทั้งหมด/บางส่วน)                                   │
│                                                                             │
│   2. VERIFICATION (5 วันทำการ)                                              │
│      ├── ตรวจสอบสิทธิ์ของผู้ขอ                                              │
│      ├── ตรวจสอบข้อยกเว้นตามกฎหมาย                                          │
│      └── แจ้งผลการตรวจสอบ                                                   │
│                                                                             │
│   3. EXECUTION (25 วันทำการ)                                                │
│      ├── ลบ PII จาก Active Collections                                     │
│      ├── ลบจาก Backups (ภายใน 90 วัน)                                       │
│      ├── Anonymize ข้อมูลที่ต้องเก็บเพื่อการวิจัย                            │
│      └── บันทึก Audit Log ของการลบ                                         │
│                                                                             │
│   4. CONFIRMATION                                                           │
│      ├── แจ้งผลการดำเนินการ                                                 │
│      └── ออกหนังสือยืนยันการลบ                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 ข้อยกเว้นที่ไม่สามารถลบได้

ข้อมูลต่อไปนี้อาจไม่สามารถลบได้ตามคำขอ:
- ข้อมูลที่จำเป็นต่อการปฏิบัติตามกฎหมาย
- ข้อมูลที่ทำให้ไม่สามารถระบุตัวแล้ว (anonymized)
- Audit logs ที่จำเป็นต่อความปลอดภัย
- ข้อมูลที่เป็นส่วนหนึ่งของข้อพิพาททางกฎหมาย

---

## 7. มาตรการรักษาความปลอดภัย

### 7.1 มาตรการทางเทคนิค

| มาตรการ | รายละเอียด | สถานะ |
|---------|------------|--------|
| **Encryption in Transit** | HTTPS/TLS 1.3 | ✅ Enabled |
| **Encryption at Rest** | Firebase default encryption | ✅ Enabled |
| **Authentication** | Firebase Auth + Google Sign-in | ✅ Enabled |
| **Authorization** | Firestore Security Rules | ✅ Enabled |
| **Rate Limiting** | 60 req/min per IP, 20 req/5min per user | ✅ Enabled |
| **Input Validation** | Sanitization, length limits | ✅ Enabled |
| **Audit Logging** | Full trail in auditTrail field | ✅ Enabled |

### 7.2 มาตรการทางบริหาร

| มาตรการ | รายละเอียด |
|---------|------------|
| **Access Control** | Role-based (student, teacher, admin) |
| **Staff Training** | PDPA awareness training required |
| **Incident Response** | 72-hour notification requirement |
| **Regular Audits** | Annual security review |

### 7.3 การเข้าถึงข้อมูล

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ACCESS CONTROL MATRIX                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   DATA TYPE          │ Student │ Teacher │ Admin │ Researcher              │
│   ───────────────────┼─────────┼─────────┼───────┼────────────              │
│   Own Profile        │ R/W     │ R/W     │ R/W   │ -                       │
│   Own Assessments    │ R       │ -       │ R     │ -                       │
│   Class Assessments  │ -       │ R       │ R     │ -                       │
│   All Assessments    │ -       │ -       │ R     │ -                       │
│   Anonymous Data     │ -       │ -       │ R     │ R                       │
│   System Logs        │ -       │ -       │ R     │ -                       │
│                                                                             │
│   Legend: R = Read, W = Write, - = No Access                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. การส่งหรือโอนข้อมูล

### 8.1 ผู้ประมวลผลข้อมูลภายนอก

| ผู้ให้บริการ | ประเทศ | ข้อมูลที่ส่ง | มาตรการป้องกัน |
|-------------|--------|-------------|---------------|
| **Firebase/Google** | USA (GDPR compliant) | ทุกข้อมูล | Standard Contractual Clauses |
| **OpenAI** | USA | คำตอบนักเรียน (ไม่มี PII) | ไม่ส่งชื่อ/อีเมล/รหัสนักเรียน |

### 8.2 ข้อมูลที่ส่งไป OpenAI

```javascript
// ❌ ข้อมูลที่ไม่ส่งไป OpenAI
const neverSendToAI = [
  'studentId',
  'studentName',
  'email',
  'school',
  'photoURL',
  'uid'
];

// ✅ ข้อมูลที่ส่งไป OpenAI (anonymized context)
const sentToAI = {
  question: "คำถาม HOTS...",
  studentAnswer: "คำตอบของนักเรียน...",
  gradeLevel: "ม.4",          // General, not specific class
  subject: "วิทยาศาสตร์"       // General, not specific teacher
};
```

### 8.3 Data Processing Agreement

องค์กรต้องมี DPA กับผู้ให้บริการภายนอก:
- ✅ Firebase: มาตรฐาน Google Data Processing Terms
- ✅ OpenAI: Data Processing Addendum

---

## 9. ขั้นตอนการลบข้อมูล

### 9.1 API: deleteStudentData

```javascript
// Cloud Function: deleteStudentData
// Endpoint: POST /deleteStudentData

/**
 * Request Body:
 * {
 *   "studentId": "uid_xxx",
 *   "scope": "full" | "pii_only" | "assessments_only",
 *   "reason": "user_request" | "account_inactive" | "legal_requirement",
 *   "requestedBy": "uid_xxx" | "admin_uid",
 *   "verificationCode": "OTP_CODE"
 * }
 */

async function deleteStudentData(req, res) {
  const { studentId, scope, reason, requestedBy, verificationCode } = req.body;
  
  // 1. Verify authorization
  if (!isAuthorized(requestedBy, studentId)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // 2. Verify OTP
  if (!verifyOTP(studentId, verificationCode)) {
    return res.status(401).json({ error: 'Invalid verification code' });
  }
  
  // 3. Execute deletion based on scope
  const deletionResult = await executeDeletion(studentId, scope);
  
  // 4. Create audit record
  await createDeletionAuditLog({
    studentId: studentId,
    scope: scope,
    reason: reason,
    requestedBy: requestedBy,
    executedAt: new Date(),
    itemsDeleted: deletionResult.count,
    itemsAnonymized: deletionResult.anonymizedCount
  });
  
  // 5. Send confirmation
  return res.json({
    success: true,
    message: 'Data deletion completed',
    deletedItems: deletionResult.count,
    anonymizedItems: deletionResult.anonymizedCount
  });
}
```

### 9.2 Deletion Scope Details

| Scope | Collections Affected | Action |
|-------|---------------------|--------|
| **full** | users, assessments, sessions, studentProgress, worksheetSubmissions | Delete all + Anonymize research copies |
| **pii_only** | users (displayName, email, studentId, photoURL) | Remove PII, keep anonymous data |
| **assessments_only** | assessments, worksheetSubmissions | Delete assessments, keep user profile |

### 9.3 Post-Deletion Verification

```javascript
async function verifyDeletion(studentId) {
  const checks = [];
  
  // Check all collections
  const collections = ['users', 'assessments', 'sessions', 'studentProgress'];
  
  for (const collection of collections) {
    const docs = await db.collection(collection)
      .where('studentId', '==', studentId)
      .get();
    
    checks.push({
      collection,
      remainingDocs: docs.size,
      status: docs.size === 0 ? 'CLEAN' : 'RESIDUAL_DATA_FOUND'
    });
  }
  
  return checks;
}
```

---

## 10. การแจ้งเหตุละเมิดข้อมูล

### 10.1 ขั้นตอนการตอบสนอง

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATA BREACH RESPONSE PROCEDURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   HOUR 0-1: DETECTION & CONTAINMENT                                         │
│   ├── Detect breach (monitoring, user report, external)                    │
│   ├── Isolate affected systems                                             │
│   ├── Preserve evidence                                                    │
│   └── Notify incident response team                                        │
│                                                                             │
│   HOUR 1-24: ASSESSMENT                                                     │
│   ├── Determine scope (what data, how many users)                          │
│   ├── Identify root cause                                                  │
│   ├── Assess risk level (low/medium/high/critical)                        │
│   └── Document findings                                                    │
│                                                                             │
│   HOUR 24-72: NOTIFICATION (if required)                                    │
│   ├── Notify สำนักงานคุ้มครองข้อมูลส่วนบุคคล (if high risk)                  │
│   ├── Notify affected users (if high risk to rights)                       │
│   └── Document notifications sent                                          │
│                                                                             │
│   DAY 3+: REMEDIATION & REVIEW                                              │
│   ├── Implement fixes                                                      │
│   ├── Conduct post-incident review                                         │
│   ├── Update security measures                                             │
│   └── Archive incident report                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 เกณฑ์การแจ้ง สคส.

ต้องแจ้งภายใน 72 ชั่วโมง หากเกิดกรณี:
- ข้อมูลส่วนบุคคลรั่วไหลจำนวนมาก (>100 คน)
- ข้อมูลอ่อนไหวรั่วไหล (ไม่มีในระบบนี้)
- มีความเสี่ยงสูงต่อสิทธิและเสรีภาพของเจ้าของข้อมูล

---

## 11. ข้อมูลติดต่อ DPO

### 11.1 Data Protection Officer

```
เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO)
────────────────────────────────────────
[ระบุชื่อ-ตำแหน่ง DPO ของหน่วยงาน]

อีเมล: dpo@[organization].ac.th
โทรศัพท์: [หมายเลขโทรศัพท์]
ที่อยู่: [ที่อยู่หน่วยงาน]

เวลาทำการ: จันทร์-ศุกร์ 08:30-16:30 น.
ระยะเวลาตอบกลับ: ภายใน 3 วันทำการ
```

### 11.2 แบบฟอร์มใช้สิทธิ

ดาวน์โหลดแบบฟอร์มได้ที่:
- แบบฟอร์มขอเข้าถึงข้อมูล: [LINK]
- แบบฟอร์มขอลบข้อมูล: [LINK]
- แบบฟอร์มถอนความยินยอม: [LINK]
- แบบฟอร์มร้องเรียน: [LINK]

---

## Appendix: Consent Log Schema

```javascript
// Collection: consentLogs
{
  logId: "consent_xxx",
  userId: "uid_xxx",
  consentType: "initial" | "update" | "withdrawal",
  consentVersion: "1.0",
  
  // What was consented to
  purposes: {
    serviceProvision: true,
    learningAnalytics: true,
    researchAnonymized: true
  },
  
  // Metadata
  timestamp: Timestamp,
  ipAddress: "xxx.xxx.xxx.xxx", // Hashed
  userAgent: "...",
  method: "modal_click" | "api_call",
  
  // For minors
  isMinor: true,
  guardianConsent: true,
  schoolAuthorization: "school_xxx"
}
```

---

<div align="center">

**HOTS AI ChatLoop — PDPA Compliance & Data Retention Policy**

*Version 1.0 | Effective December 25, 2025*

**เอกสารนี้ต้องได้รับการทบทวนอย่างน้อยปีละ 1 ครั้ง**

</div>
