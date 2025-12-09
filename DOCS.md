# 📚 HOTS AI ChatLoop - Complete Documentation

**Last Updated:** December 9, 2025 | **Version:** 4.1

> รวมเอกสารทางเทคนิคทั้งหมดในไฟล์เดียว

---

## 📑 Table of Contents

1. [System Summary](#1-system-summary)
2. [Architecture](#2-architecture)
3. [Navigation Guide](#3-navigation-guide)
4. [User Manual](#4-user-manual)
5. [Deployment Guide](#5-deployment-guide)
6. [Testing Checklist](#6-testing-checklist)
7. [Security Systems](#7-security-systems)
8. [Additional Features](#8-additional-features)

---

## 1. System Summary

### Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | Vue 3.4 + Vite 5 + Pinia (8 stores) |
| Backend | Firebase (Auth, Firestore, Cloud Functions Node.js 20) |
| AI | OpenAI `gpt-4o-mini` |
| Deploy | Firebase Hosting + Functions |

**Stats:** 45+ Views | 45+ Routes | 25+ Cloud Functions

### Core Data Collections
```
users           → Role-based (student/teacher); studentId, grade, room
courses         → Teacher-owned; learningOutcomes[]
questions       → courseId-linked; hasSolution, relatedLOs
sessions        → Chat lifecycle
messages        → References assessmentId
assessments     → rubricScores (A.R.C.E.) + LO analysis
studentProgress → {studentId}_{courseId} tracking passedLOs[]
worksheets      → Electronic worksheets with questions
lessonPlans     → 5E model lesson plans
```

### Core Patterns
```javascript
// 1. Always clean GPT markdown wrappers
let cleanedText = responseText.trim()
if (cleanedText.startsWith('```')) {
  cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
  cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
}
const result = JSON.parse(cleanedText)

// 2. Use standard LO utility (consistency across all pages)
import { getStudentPassedLOs } from '@/utils/loProgress'
const { passedLOs, assessmentCount } = await getStudentPassedLOs(studentUid, courseId)

// 3. CSV Export with Thai BOM
const BOM = '\uFEFF'
const blob = new Blob([BOM + csvContent], {type: 'text/csv;charset=utf-8'})
```

---

## 2. Architecture

### Project Structure
```
HOTS-AI-CHATLOOP/
├── src/
│   ├── views/          # 45+ Vue pages
│   ├── components/     # Reusable components
│   ├── stores/         # Pinia: auth, chat, gamification, theme, etc.
│   ├── utils/          # loProgress.js, antiCheat.js
│   ├── firebase/       # config.js
│   └── router/         # index.js (role-based guards)
├── functions/          # Cloud Functions
│   ├── index.js        # Main functions (4000+ lines)
│   ├── gamification.js # Badge logic
│   └── national-scale.js
├── firestore.rules     # Security rules
└── firestore.indexes.json
```

### Key Stores (Pinia)
| Store | Purpose |
|-------|---------|
| `auth.js` | Google Sign-In, user profile, role checking |
| `chat.js` | Session lifecycle, question selection, LO tracking |
| `gamification.js` | Points, badges, streaks, actualPassedLOs |
| `theme.js` | Dark mode with localStorage |
| `lessonPlan.js` | Lesson plan CRUD |
| `learningPath.js` | Adaptive learning |

### Question Selection Algorithm
1. Get weak LOs from `studentProgress`
2. Filter unused questions (not in `usedQuestionIds`)
3. Exclude `hasSolution: true` (teacher solutions)
4. Priority: Questions targeting weak LOs
5. Fallback: Random unused or least-used

---

## 3. Navigation Guide

### 🎓 Student Features (9 Menus)
| # | Feature | Route |
|---|---------|-------|
| 1 | เริ่มทำ Assessment | `/chat` |
| 2 | ห้องกิจกรรม (Worksheets) | `/learning-rooms` |
| 3 | ความคืบหน้า LO | `/my-progress` |
| 4 | Progress Analytics | `/progress-analytics` |
| 5 | Adaptive Learning | `/adaptive-learning` |
| 6 | Goal Setting | `/goal-setting` |
| 7 | Leaderboard | `/leaderboard` |
| 8 | Progress Map | `/progress-map` |
| 9 | โปรไฟล์ | `/profile` |

### 👨‍🏫 Teacher Features (13 Menus)
| # | Feature | Route |
|---|---------|-------|
| 1 | จัดการรายวิชา | `/courses` |
| 2 | คลังคำถาม | `/questions` |
| 3 | วิเคราะห์ห้องเรียน | `/class-analytics` |
| 4 | รายงาน LO | `/lo-reports` |
| 5 | AI Predictive Analytics | `/teacher-analytics` |
| 6 | Real-time Monitor | `/realtime-monitor` |
| 7 | แผนการจัดการเรียนรู้ | `/lesson-plans` |
| 8 | ใบงานอิเล็กทรอนิกส์ | `/teacher/worksheets` |
| 9 | รายงานใบงาน | `/teacher/worksheet-reports` |
| 10 | Micro Lessons | `/micro-lessons` |
| 11 | คลัง Micro Lessons | `/micro-lesson-library` |
| 12 | รายละเอียดนักเรียน | `/student-detail/:id` |
| 13 | **Admin: จัดการ LO** | `/admin-lo-manager` |

### Worksheet System Flow
```
Teacher: /lesson-plans → Create 5E Plan → Generate Worksheet → /teacher/worksheets → Publish
Student: /learning-rooms → Select Room → /worksheet/:id → Submit → /worksheet-result/:id
```

---

## 4. User Manual

### สำหรับนักเรียน

**การเข้าสู่ระบบ:**
1. เปิด https://hots-ai-chatloop.web.app
2. คลิก "เข้าสู่ระบบด้วย Google"
3. กรอกข้อมูลโปรไฟล์ครั้งแรก (รหัส, ชั้น, ห้อง, เลขที่)

**การทำ Assessment:**
1. เลือกรายวิชาจาก Dashboard
2. คลิก "เริ่มทำ Assessment"
3. อ่านคำถาม → พิมพ์คำตอบ (≥20 ตัวอักษร)
4. คลิก "ส่งคำตอบ" → ยืนยันในกล่อง Dialog
5. รอ AI ประเมิน → ดูคะแนน 4 มิติ (A.R.C.E.)

**การทำใบงาน:**
1. ไปที่ "ห้องกิจกรรม" (`/learning-rooms`)
2. เลือกห้องที่ต้องการ
3. ทำใบงานทีละข้อ → ส่งคำตอบ
4. ดูผลประเมิน A.R.C.E. และ feedback

### สำหรับครู

**การสร้างรายวิชา:**
1. ไปที่ `/courses` → "สร้างรายวิชาใหม่"
2. กรอกข้อมูล → "AI สร้าง Learning Outcomes"
3. ตรวจสอบและบันทึก

**การสร้างคำถาม:**
1. ไปที่ `/questions` → เลือกวิชา
2. "เพิ่มคำถามใหม่" หรือ "AI สร้างคำถาม"
3. เชื่อม LO ที่เกี่ยวข้อง
4. (Optional) "สร้าง Solution" สำหรับเฉลย

**การสร้างใบงาน:**
1. ไปที่ `/lesson-plans` → สร้างแผนการสอน 5E
2. คลิก "สร้างใบงาน" → AI สร้างอัตโนมัติ
3. แก้ไขที่ `/teacher/worksheets` → เผยแพร่

**การจัดการ LO ของนักเรียน:**
1. ไปที่ `/admin-lo-manager`
2. เลือกวิชา → ค้นหานักเรียน
3. Quick Add: เพิ่ม LO ที่ขาด
4. แก้ไข: ปรับ LO ในแต่ละ Assessment

---

## 5. Deployment Guide

### Prerequisites
- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- OpenAI API Key
- Firebase Blaze Plan (for Cloud Functions)

### Quick Deploy
```bash
# 1. Install dependencies
npm install
cd functions && npm install && cd ..

# 2. Setup environment
cp .env.example .env                    # Edit VITE_FIREBASE_*
cp functions/.env.example functions/.env # Edit OPENAI_API_KEY

# 3. Login & Link Project
firebase login
firebase use --add  # Select your project

# 4. Deploy
firebase deploy     # Deploy all
# OR selective:
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
```

### Environment Variables

**Frontend (.env):**
```
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
VITE_FUNCTIONS_URL=https://us-central1-xxx.cloudfunctions.net
```

**Functions (functions/.env):**
```
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o-mini
```

### Local Development
```bash
# Frontend (port 5173)
npm run dev

# Functions emulator
cd functions && npm run serve

# Build for production
npm run build
```

---

## 6. Testing Checklist

### Authentication
- [ ] Login ด้วย Google สำเร็จ
- [ ] Redirect ตาม role (student/teacher)
- [ ] Route guard ทำงานถูกต้อง
- [ ] Profile Setup แสดงครั้งแรก

### Student Features
- [ ] Dashboard แสดงข้อมูลถูกต้อง
- [ ] เลือกวิชาและเริ่ม session ได้
- [ ] ส่งคำตอบ (≥20 chars) + กล่องยืนยัน
- [ ] ไม่สามารถ copy-paste ได้
- [ ] รับ feedback และคะแนน real-time
- [ ] Gamification: แต้ม, Badge, Streak

### Teacher Features
- [ ] Course/Question CRUD
- [ ] AI Generate: LO, Question, Solution
- [ ] Class Analytics + Export CSV
- [ ] LO Reports Heatmap
- [ ] Real-time Monitor
- [ ] Lesson Plan (5E) + Worksheet

### LO Consistency
- [ ] นักเรียนเห็น LO = ครูเห็น LO (ใช้ `loProgress.js`)
- [ ] Admin LO Manager แก้ไขได้

---

## 7. Security Systems

### Role-Based Access (Firestore Rules)
```javascript
function isTeacher() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
}
// Teacher-only: courses, questions, reports
// Student: own data + session messages + assessments
```

### Anti-Cheat System
**Client-side:**
- `@paste.prevent`, `@copy.prevent`, `@cut.prevent` on textareas
- `@contextmenu.prevent`

**Server-side (`detectCopyPaste()`):**
- Unusual spacing patterns
- Very long words (>25 chars)
- Mixed script detection (Thai + unexpected)
- Suspicious character ratios

### PDPA Compliance
- Consent modal on first login
- Data anonymization for research export
- User can request data deletion
- Minimal data collection policy

---

## 8. Additional Features

### Gamification System
- **Points:** 10-100 per assessment based on score
- **Badges:** 20+ types (First Answer, Perfect Score, Streak Master, etc.)
- **Streaks:** Daily login tracking
- **Leaderboard:** Course-based ranking

### AI Scaffolding (Assessment Feedback)
| Score | Level | Feedback Style |
|-------|-------|----------------|
| ≤4 | 1 | ให้คำใบ้ชัดเจน + ตัวอย่าง |
| 5-8 | 2 | แนะนำแนวคิด |
| 9-12 | 3 | ถามคำถามชวนคิด |
| 13-16 | 4 | ท้าทายเพิ่มเติม |
| 17-20 | 5 | ยกย่อง + ขยายความ |

### PWA Support
- Installable on mobile/desktop
- Offline capability (basic)
- Push notifications ready

### National Scale Architecture
```
Ministry (กระทรวง)
    └── ESA (เขตพื้นที่การศึกษา)
            └── School (โรงเรียน)
                    └── Teacher → Students
```
Dashboards: `/national-dashboard`, `/esa-dashboard`, `/school-management`

### Research Data Export
- `/research/export` - Export anonymized data
- `/research/pretest-posttest` - Pre/Post test management
- `/research/expert-validation` - AI scoring validation

---

## 🔑 Key Files Reference

| File | Purpose |
|------|---------|
| `functions/index.js` | All Cloud Functions, AI prompts (4000+ lines) |
| `src/stores/chat.js` | Question selection, LO tracking (600+ lines) |
| `src/utils/loProgress.js` | **Standard LO counting** - ใช้ทุกหน้า รวม assessments + worksheetSubmissions |
| `src/views/ChatView.vue` | Confirmation dialog, copy-paste blocking |
| `src/views/AdminLOManager.vue` | Admin tool for LO management |
| `src/views/WorksheetResult.vue` | Worksheet result with LO section |
| `src/views/WorksheetReports.vue` | Teacher worksheet reports with LO column |
| `firestore.rules` | Role-based security |

---

## 🎯 Worksheet LO System (NEW)

### How it works:
1. **generateElectronicWorksheet** - เก็บ `learningOutcomes` ใน metadata ของ worksheet
2. **assessWorksheetSubmission** - เรียก `assessLearningOutcomesInternal` เพื่อประเมิน LO
3. **loProgress.js** - ดึงข้อมูลจากทั้ง `assessments` และ `worksheetSubmissions` collections
4. **WorksheetResult.vue** - แสดง LO section ให้นักเรียนเห็น
5. **WorksheetReports.vue** - แสดงคอลัมน์ LO ในตารางรายงาน

### Data stored:
```javascript
// worksheetSubmissions document
{
  loAssessment: {
    passedLOs: ["LO1", "LO2"],
    analysis: "..."
  }
}

// studentProgress document
{
  passedLOs: ["LO1", "LO2", "LO3"], // merged from all sources
  worksheetAssessments: [{
    worksheetId,
    passedLOs: ["LO1"],
    ...
  }]
}
```

---

## ⚠️ Anti-Patterns to Avoid

- ❌ `JSON.parse()` directly on GPT response (markdown wrappers!)
- ❌ Multiple `where()` + `orderBy()` without composite index
- ❌ Update counts without `FieldValue.increment(1)`
- ❌ Send `hasSolution: true` questions to students
- ❌ Export Thai CSV without BOM (`\uFEFF`)
- ❌ Different LO counting logic on different pages

---

*Document consolidated: December 9, 2025*

