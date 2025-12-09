# 📚 HOTS AI ChatLoop - Complete Documentation

**Last Updated:** December 9, 2025 | **Version:** 4.2

> Educational AI chatbot for assessing Higher-Order Thinking Skills (HOTS) using OpenAI GPT-4o-mini. Real-time assessment with structured rubric scoring (A.R.C.E. Framework). Built with Vue 3 + Firebase + Cloud Functions.

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
9. [Worksheet LO System](#9-worksheet-lo-system)
10. [Cloud Functions Reference](#10-cloud-functions-reference)
11. [Firestore Collections](#11-firestore-collections)
12. [Development Patterns](#12-development-patterns)

---

## 1. System Summary

### Tech Stack
| Layer | Technology | Details |
|-------|------------|---------|
| Frontend | Vue 3.4 + Vite 5 | Composition API, Pinia (8 stores) |
| Backend | Firebase | Auth, Firestore, Cloud Functions (Node.js 20) |
| AI | OpenAI | `gpt-4o-mini` (cost-effective, 15-20x cheaper than gpt-4o) |
| Deploy | Firebase | Hosting + Functions (us-central1) |
| PWA | Vite PWA | Installable, offline-ready |

**Project Stats:**
- 45+ Vue Views
- 45+ Routes
- 25+ Cloud Functions
- 8 Pinia Stores
- 15+ Firestore Collections

### A.R.C.E. Framework (HOTS Assessment)
| Dimension | Thai | Description | Score Range |
|-----------|------|-------------|-------------|
| **A**nalysis | การวิเคราะห์ | แยกแยะประเด็น, หาความสัมพันธ์ | 0-5 |
| **R**easoning | การให้เหตุผล | อธิบายเหตุผล, สรุปตรรกะ | 0-5 |
| **C**reativity | ความคิดสร้างสรรค์ | เสนอมุมมองใหม่, คิดนอกกรอบ | 0-5 |
| **E**vidence | การใช้หลักฐาน | อ้างอิงข้อมูล, ยกตัวอย่าง | 0-5 |

**Total Score: 0-20** (sum of 4 dimensions)

### Core Data Collections
```
users              → Role-based (student/teacher); studentId, grade, room, number, section
courses            → Teacher-owned; learningOutcomes[], courseCode
questions          → courseId-linked; hasSolution, relatedLOs[], loConfigs[]
sessions           → Chat lifecycle; messageCount, status
messages           → References assessmentId
assessments        → rubricScores (A.R.C.E.) + loAssessment
studentProgress    → {studentId}_{courseId} tracking passedLOs[], loProgress{}
eWorksheets        → Electronic worksheets with sections, questions, metadata.learningOutcomes
worksheetSubmissions → Student answers, assessment, loAssessment
lessonPlans        → 5E model lesson plans with A.R.C.E. integration
learningRooms      → Activity rooms for worksheets
knowledgeSheets    → Pre-learning content sheets
```

### Core Patterns
```javascript
// 1. Always clean GPT markdown wrappers before JSON.parse
let cleanedText = responseText.trim()
if (cleanedText.startsWith('```')) {
  cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
  cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
}
const result = JSON.parse(cleanedText)

// 2. Use standard LO utility (consistency across all pages)
import { getStudentPassedLOs } from '@/utils/loProgress'
const { passedLOs, assessmentCount, worksheetCount } = await getStudentPassedLOs(studentUid, courseId)

// 3. CSV Export with Thai BOM
const BOM = '\uFEFF'
const blob = new Blob([BOM + csvContent], {type: 'text/csv;charset=utf-8'})

// 4. Firestore increment pattern
await updateDoc(ref, { count: FieldValue.increment(1) })

// 5. Role checking in Vue component
const authStore = useAuthStore()
const isTeacher = computed(() => authStore.userProfile?.role === 'teacher')
```

---

## 2. Architecture

### Project Structure
```
HOTS-AI-CHATLOOP/
├── src/
│   ├── views/              # 45+ Vue pages
│   │   ├── ChatView.vue           # Main assessment chat
│   │   ├── WorksheetResult.vue    # Worksheet results + LO section
│   │   ├── WorksheetReports.vue   # Teacher reports + LO column
│   │   ├── AdminLOManager.vue     # Admin LO editing tool
│   │   ├── MyProgress.vue         # Student progress
│   │   ├── LOReports.vue          # Teacher LO reports
│   │   └── ...
│   ├── components/         # Reusable components
│   │   ├── RadarChart.vue         # ARCE visualization
│   │   ├── LOProgressCards.vue    # LO progress display
│   │   └── ...
│   ├── stores/             # Pinia state management
│   │   ├── auth.js                # Authentication + role
│   │   ├── chat.js                # Session + questions
│   │   ├── gamification.js        # Points, badges, streaks
│   │   └── ...
│   ├── utils/              # Utility functions
│   │   ├── loProgress.js          # ⭐ Standard LO counting
│   │   └── antiCheat.js           # Copy-paste detection
│   ├── firebase/           # Firebase config
│   └── router/             # Vue Router with guards
├── functions/              # Cloud Functions
│   ├── index.js            # Main functions (6900+ lines)
│   │   ├── assessAnswer           # Chat assessment
│   │   ├── assessWorksheetSubmission  # Worksheet assessment
│   │   ├── generateElectronicWorksheet
│   │   └── ... (25+ functions)
│   ├── gamification.js     # Badge definitions
│   └── national-scale.js   # Ministry/ESA functions
├── firestore.rules         # Security rules
├── firestore.indexes.json  # Composite indexes
└── DOCS.md                 # This file
```

### Key Stores (Pinia)
| Store | Purpose | Key Methods |
|-------|---------|-------------|
| `auth.js` | Google Sign-In, user profile | `signInWithGoogle()`, `signOut()` |
| `chat.js` | Session lifecycle, questions | `startSession()`, `sendAnswer()`, `selectQuestion()` |
| `gamification.js` | Points, badges, streaks | `awardPoints()`, `checkBadges()`, `refreshActualPassedLOs()` |
| `theme.js` | Dark mode toggle | `toggleDarkMode()` |
| `lessonPlan.js` | Lesson plan CRUD | `createPlan()`, `generateWithAI()` |
| `learningPath.js` | Adaptive learning | `getAdaptivePath()` |
| `notifications.js` | Toast messages | `showToast()`, `showError()` |
| `dashboard.js` | Teacher dashboard data | `loadClassData()` |

### Question Selection Algorithm (chat.js)
```javascript
// Priority-based selection for adaptive learning
1. Get student's weak LOs from `studentProgress`
2. Filter unused questions (not in session's `usedQuestionIds`)
3. Exclude questions with `hasSolution: true` (teacher exam keys)
4. Priority 1: Questions targeting weak LOs (`relatedLOs` intersection)
5. Priority 2: Random unused questions
6. Fallback: Least-used question (by `usageCount`)
```
3. Exclude `hasSolution: true` (teacher solutions)
4. Priority: Questions targeting weak LOs
5. Fallback: Random unused or least-used

---

## 3. Navigation Guide

### 🎓 Student Features (9 Menus)
| # | Feature | Route | Description |
|---|---------|-------|-------------|
| 1 | 🚀 เริ่มทำ Assessment | `/chat` | Chat-based HOTS assessment |
| 2 | 🏫 ห้องกิจกรรม | `/learning-rooms` | Electronic worksheet rooms |
| 3 | 📈 ความคืบหน้า LO | `/my-progress` | Personal LO tracking |
| 4 | 📊 Progress Analytics | `/progress-analytics` | Detailed analytics charts |
| 5 | 🎯 Adaptive Learning | `/adaptive-learning` | AI-powered learning paths |
| 6 | 🎯 Goal Setting | `/goal-setting` | Personal learning goals |
| 7 | 🏆 Leaderboard | `/leaderboard` | Course-based ranking |
| 8 | 🗺️ Progress Map | `/progress-map` | Visual LO progress |
| 9 | 👤 โปรไฟล์ | `/profile` | User settings |

### 👨‍🏫 Teacher Features (14 Menus)
| # | Feature | Route | Description |
|---|---------|-------|-------------|
| 1 | 📚 จัดการรายวิชา | `/courses` | Course CRUD + AI LO generation |
| 2 | 💡 คลังคำถาม | `/questions` | Question bank + AI generation |
| 3 | 📊 วิเคราะห์ห้องเรียน | `/class-analytics` | Class overview + export |
| 4 | 🎯 รายงาน LO | `/lo-reports` | LO heatmap by student |
| 5 | 🔮 AI Predictions | `/teacher-analytics` | Predictive analytics |
| 6 | 📡 Real-time Monitor | `/realtime-monitor` | Live student activity |
| 7 | 📝 แผนการสอน | `/lesson-plans` | 5E model lesson plans |
| 8 | 📋 ใบงาน | `/teacher/worksheets` | Electronic worksheets |
| 9 | 📊 รายงานใบงาน | `/teacher/worksheet-reports` | Worksheet reports + LO |
| 10 | 📖 Micro Lessons | `/micro-lessons` | Short lesson content |
| 11 | 📚 คลัง Lessons | `/micro-lesson-library` | Lesson library |
| 12 | 👥 รายละเอียดนักเรียน | `/student-detail/:id` | Individual student view |
| 13 | 🛠️ **Admin LO Manager** | `/admin-lo-manager` | Edit student LO data |
| 14 | 📄 Knowledge Sheets | `/knowledge-sheet/:id` | Pre-learning content |

### 🔬 Research Features
| Route | Description |
|-------|-------------|
| `/research/export` | Export anonymized data |
| `/research/pretest-posttest` | Pre/Post test management |
| `/research/expert-validation` | AI scoring validation |
| `/research/expert-calibration` | Calibration tools |

### System Flow Diagrams

**Assessment Chat Flow:**
```
Student Dashboard → Select Course → /chat → Answer Question
    ↓
AI Assessment (assessAnswer) → ARCE Scores + LO Evaluation
    ↓
Save to assessments + studentProgress → Show Feedback
```

**Worksheet Flow:**
```
Teacher: /lesson-plans → Create 5E Plan → Generate Worksheet 
    ↓
/teacher/worksheets → Edit → Publish to Learning Room
    ↓
Student: /learning-rooms → Select Room → /worksheet/:id → Submit
    ↓
AI Assessment (assessWorksheetSubmission) → ARCE + LO Evaluation
    ↓
/worksheet-result/:id → Show Results with LO Section
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

## 9. Worksheet LO System

### Overview
ระบบ Worksheet LO ทำให้ใบงานอิเล็กทรอนิกส์ประเมินและบันทึก Learning Outcomes เหมือนกับ Assessment Chat ทำให้ครูและนักเรียนเห็นข้อมูล LO ที่ตรงกัน 100%

### Architecture Flow
```
┌─────────────────────────────────────────────────────────────────────┐
│                    Worksheet LO System Flow                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Teacher Creates Lesson Plan                                        │
│       ↓                                                             │
│  generateElectronicWorksheet (Cloud Function)                       │
│       ├── Extract LOs from Lesson Plan                              │
│       ├── Generate questions with AI                                │
│       └── Store learningOutcomes[] in worksheet.metadata            │
│       ↓                                                             │
│  eWorksheets Collection                                             │
│  {                                                                  │
│    metadata: {                                                      │
│      learningOutcomes: [                                            │
│        { loCode: "LO1", loDescription: "..." },                     │
│        { loCode: "LO2", loDescription: "..." }                      │
│      ]                                                              │
│    },                                                               │
│    sections: [...]                                                  │
│  }                                                                  │
│       ↓                                                             │
│  Student Completes Worksheet                                        │
│       ↓                                                             │
│  assessWorksheetSubmission (Cloud Function)                         │
│       ├── Assess ARCE scores                                        │
│       ├── Call assessLearningOutcomesInternal()                     │
│       │      ├── Build rubric scores from ARCE                      │
│       │      ├── Evaluate each LO (same logic as Assessment Chat)   │
│       │      └── Return passedLOs[] + analysis                      │
│       ├── Save loAssessment to worksheetSubmissions                 │
│       └── Update studentProgress.passedLOs (merged)                 │
│       ↓                                                             │
│  loProgress.js (Frontend Utility)                                   │
│       ├── Query assessments collection                              │
│       ├── Query worksheetSubmissions collection                     │
│       └── Merge unique passedLOs from both sources                  │
│       ↓                                                             │
│  All pages show consistent LO data                                  │
│       ├── MyProgress.vue (Student)                                  │
│       ├── LOReports.vue (Teacher)                                   │
│       ├── WorksheetResult.vue (Student)                             │
│       ├── WorksheetReports.vue (Teacher)                            │
│       └── gamification.js (actualPassedLOs)                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Functions

**loProgress.js - Standard LO Counting:**
```javascript
// Get student's passed LOs for a specific course
// Combines data from BOTH assessments AND worksheetSubmissions
export async function getStudentPassedLOs(studentUid, courseId) {
  // Returns: { passedLOs: [], assessmentCount, worksheetCount, assessments, worksheets }
}

// Get ALL passed LOs across ALL courses
export async function getStudentAllPassedLOs(studentUid) {
  // Returns: { passedLOs: [], assessmentCount, worksheetCount, courseBreakdown }
}

// Batch query for multiple students (teacher reports)
export async function getBatchStudentPassedLOs(studentUids, courseId) {
  // Returns: { [uid]: { passedLOs, assessmentCount, worksheetCount } }
}
```

### LO Passing Criteria
An LO is considered "passed" when ALL 3 conditions are met:
1. **Content Match**: Student's answer covers the LO's intent substantially
2. **Skill Level**: Evidence of understanding/skill the LO expects
3. **HOTS Score ≥ 3**: Related dimension(s) must score at least 3/5
   - Analysis verbs → analysis ≥ 3
   - Reasoning verbs → reasoning ≥ 3
   - Creative verbs → creativity ≥ 3
   - Evidence verbs → evidence ≥ 3

---

## 10. Cloud Functions Reference

### Assessment Functions
| Function | Purpose | Input |
|----------|---------|-------|
| `assessAnswer` | Chat-based HOTS assessment | answer, questionId, courseId |
| `assessWorksheetSubmission` | Worksheet assessment + LO | submissionId, worksheetId, answers |
| `assessLearningOutcomesInternal` | Internal LO evaluation | studentAnswer, learningOutcomes, assessmentResult |

### Generation Functions
| Function | Purpose | Input |
|----------|---------|-------|
| `generateLearningOutcomes` | AI generate LOs for course | courseId, description |
| `generateHOTSQuestion` | AI generate HOTS question | courseId, topic, difficulty |
| `generateSolution` | AI generate model answer | questionId |
| `generateLessonPlan` | AI generate 5E lesson plan | topic, gradeLevel, duration |
| `generateElectronicWorksheet` | AI generate worksheet | lessonPlanId, questionCount |
| `generateKnowledgeSheet` | AI generate knowledge sheet | lessonPlanId |
| `generateCourseStructure` | AI generate course units | courseId |

### Analytics Functions
| Function | Purpose | Input |
|----------|---------|-------|
| `generateClassAnalytics` | Class performance summary | courseId |
| `generateDailyReport` | Daily activity report | date |
| `getWorksheetReports` | Worksheet submission reports | worksheetId |
| `analyzeTalentTracks` | Talent analysis | studentId |
| `generateAdaptivePath` | Personalized learning path | studentId, courseId |

### Gamification Functions
| Function | Purpose | Input |
|----------|---------|-------|
| `getLeaderboard` | Course leaderboard | courseId, limit |
| `getBadgeDefinitions` | Available badges | - |
| `claimDailyReward` | Daily login reward | userId |

### System Functions
| Function | Purpose | Trigger |
|----------|---------|---------|
| `onUserDelete` | Cleanup user data | Auth trigger |
| `dailyConsistencyCheck` | Data integrity check | Scheduled |
| `recalculateStudentProgress` | Recalc progress | Manual |

---

## 11. Firestore Collections

### users
```javascript
{
  uid: "xxx",                    // Firebase Auth UID
  email: "student@example.com",
  displayName: "นักเรียน ทดสอบ",
  role: "student" | "teacher",
  studentId: "12345",           // 5-digit student ID
  grade: "ม.4",
  room: "1",
  number: "15",
  section: "A",                  // Optional
  photoURL: "https://...",
  createdAt: Timestamp,
  lastLoginAt: Timestamp,
  consentGiven: true,           // PDPA
  consentDate: Timestamp
}
```

### courses
```javascript
{
  id: "xxx",
  courseCode: "CS101",
  courseName: "วิทยาการคำนวณ",
  description: "...",
  teacherId: "xxx",
  teacherName: "ครู ทดสอบ",
  gradeLevel: "ม.4",
  learningOutcomes: [
    { code: "LO1", description: "..." },
    { code: "LO2", description: "..." }
  ],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### questions
```javascript
{
  id: "xxx",
  courseId: "xxx",
  question: "คำถาม HOTS...",
  context: "บริบท...",          // Optional
  difficulty: 1-5,
  relatedLOs: ["LO1", "LO3"],
  loConfigs: [                   // LO-dimension mapping
    { loCode: "LO1", relatedDimensions: ["analysis", "reasoning"] }
  ],
  hasSolution: false,            // true = exclude from student pool
  solution: { ... },             // If hasSolution
  usageCount: 0,
  createdAt: Timestamp,
  createdBy: "teacherId"
}
```

### assessments
```javascript
{
  id: "xxx",
  sessionId: "xxx",
  studentId: "xxx",              // Auth UID
  courseId: "xxx",
  questionId: "xxx",
  studentAnswer: "คำตอบ...",
  rubricScores: {
    analysis: 4,
    reasoning: 3,
    creativity: 4,
    evidence: 3
  },
  totalScore: 14,
  feedback: "...",
  loAssessment: {
    passedLOs: ["LO1", "LO3"],
    analysis: "...",
    manuallyModified: false,     // If admin edited
    modifiedBy: "teacherId",
    modifiedAt: Timestamp
  },
  questionData: { ... },         // Snapshot
  createdAt: Timestamp
}
```

### worksheetSubmissions
```javascript
{
  id: "xxx",
  worksheetId: "xxx",
  studentId: "xxx",
  courseId: "xxx",
  roomId: "xxx",
  answers: {
    "section1_q1": "คำตอบ...",
    "section1_q2": ["a", "c"]
  },
  assessment: {
    summary: { totalScore, maxScore, percentage, paLevel },
    arceScores: { analysis, reasoning, creativity, evidence },
    questionResults: [...],
    strengths: [...],
    weaknesses: [...]
  },
  loAssessment: {                // NEW: LO evaluation
    passedLOs: ["LO1", "LO2"],
    analysis: "..."
  },
  status: "graded",
  timeSpent: 1800,               // seconds
  submittedAt: Timestamp,
  gradedAt: Timestamp,
  studentData: { displayName, studentId, grade, room, number }
}
```

### studentProgress
```javascript
{
  id: "{studentId}_{courseId}",
  studentId: "xxx",
  courseId: "xxx",
  passedLOs: ["LO1", "LO2", "LO3"],  // Merged from all sources
  loProgress: {                       // Progressive tracking
    "LO1": { accumulatedScore: 15, targetScore: 20, attempts: 3, passed: true },
    "LO2": { accumulatedScore: 8, targetScore: 20, attempts: 2, passed: false }
  },
  worksheetAssessments: [             // From worksheets
    { worksheetId, submissionId, passedLOs, score, ... }
  ],
  lastAssessedAt: Timestamp,
  createdAt: Timestamp
}
```

### eWorksheets
```javascript
{
  id: "xxx",
  metadata: {
    title: "ใบงาน...",
    description: "...",
    lessonPlanId: "xxx",
    courseId: "xxx",
    courseName: "...",
    teacherId: "xxx",
    gradeLevel: "ม.4",
    topic: "...",
    duration: 50,
    totalQuestions: 8,
    maxScore: 20,
    learningOutcomes: [              // NEW: For LO assessment
      { loCode: "LO1", loDescription: "..." },
      { loCode: "LO2", loDescription: "..." }
    ],
    createdAt: "2025-12-09T..."
  },
  instructions: "คำชี้แจง...",
  sections: [
    {
      id: "section_1",
      title: "ส่วนที่ 1",
      phase: "exploration",          // 5E phase
      arceFocus: ["analysis"],
      questions: [
        {
          id: "q1",
          type: "open_ended",
          prompt: "คำถาม...",
          arceFocus: "analysis",
          bloomLevel: "analyze",
          maxScore: 5,
          rubric: { "5": "...", "4": "...", ... }
        }
      ]
    }
  ],
  scoring: { totalPoints: 20, passingScore: 12 },
  stats: { totalSubmitted: 0, averageScore: 0, passRate: 0 },
  status: "published" | "draft"
}
```

---

## 12. Development Patterns

### Adding a New Cloud Function
```javascript
// 1. Export in functions/index.js
exports.myNewFunction = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 60,
  memory: '512MB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // 2. Validate method
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }
      
      // 3. Extract params
      const { param1, param2 } = req.body
      
      // 4. Your logic here...
      
      // 5. If using OpenAI, always clean response
      let cleanedText = responseText.trim()
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
        cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
      }
      const result = JSON.parse(cleanedText)
      
      return res.status(200).send({ success: true, data: result })
    } catch (error) {
      console.error('❌ Error:', error)
      return res.status(500).send({ error: error.message })
    }
  })
})
```

### Adding a New Vue View
```javascript
// 1. Create src/views/NewView.vue
<template>
  <div class="new-view">
    <!-- Your template -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const loading = ref(true)

onMounted(async () => {
  await loadData()
  loading.value = false
})
</script>

// 2. Add route in src/router/index.js
{
  path: '/new-view',
  name: 'NewView',
  component: () => import('@/views/NewView.vue'),
  meta: { 
    requiresAuth: true, 
    role: 'student'  // or 'teacher' or omit for both
  }
}
```

### Using loProgress.js
```javascript
import { getStudentPassedLOs, getBatchStudentPassedLOs } from '@/utils/loProgress'

// Single student
const { passedLOs, assessmentCount, worksheetCount } = 
  await getStudentPassedLOs(studentUid, courseId)

// Multiple students (teacher reports)
const studentData = await getBatchStudentPassedLOs(studentUids, courseId)
// studentData[uid] = { passedLOs: [...], assessmentCount, worksheetCount }
```

### Firestore Security Pattern
```javascript
// In firestore.rules
function isOwner(userId) {
  return request.auth != null && request.auth.uid == userId;
}

function isTeacher() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
}

function isStudent() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'student';
}
```

---

## ⚠️ Anti-Patterns to Avoid

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| `JSON.parse(gptResponse)` directly | Clean markdown wrappers first |
| Multiple `where()` + `orderBy()` | Create composite index |
| `doc.data().count + 1` | `FieldValue.increment(1)` |
| Send `hasSolution: true` to students | Filter in question selection |
| Export Thai CSV without BOM | Add `\uFEFF` prefix |
| Different LO counting logic per page | Use `loProgress.js` everywhere |
| Hardcode courseId in queries | Pass as parameter |
| Store sensitive data in localStorage | Use Firestore with rules |

---

## 🔑 Key Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| `functions/index.js` | All Cloud Functions, AI prompts | ~6900 |
| `src/stores/chat.js` | Question selection, session management | ~600 |
| `src/utils/loProgress.js` | **Standard LO counting** (assessments + worksheets) | ~420 |
| `src/views/ChatView.vue` | Main chat interface, copy-paste blocking | ~800 |
| `src/views/WorksheetResult.vue` | Worksheet results with LO section | ~1900 |
| `src/views/WorksheetReports.vue` | Teacher worksheet reports with LO | ~2700 |
| `src/views/AdminLOManager.vue` | Admin tool for LO editing | ~800 |
| `src/views/MyProgress.vue` | Student progress view | ~500 |
| `src/views/LOReports.vue` | Teacher LO heatmap | ~900 |
| `firestore.rules` | Security rules | ~150 |

---

## 📋 Quick Reference

### URLs
- **Production**: https://hots-ai-d028b.web.app
- **Console**: https://console.firebase.google.com/project/hots-ai-d028b
- **Functions Region**: us-central1

### Commands
```bash
# Development
npm run dev                    # Frontend dev server (5173)
cd functions && npm run serve  # Functions emulator

# Build & Deploy
npm run build                  # Build frontend
firebase deploy                # Deploy all
firebase deploy --only hosting # Deploy hosting only
firebase deploy --only functions:assessWorksheetSubmission  # Single function

# Debug
firebase functions:log         # View function logs
firebase emulators:start       # Start all emulators
```

### Environment Variables
```bash
# .env (Frontend)
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FUNCTIONS_URL=https://us-central1-xxx.cloudfunctions.net

# functions/.env (Backend)
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o-mini
```

---

*Document last updated: December 9, 2025 | Version 4.2*
*Total lines: ~700 | Covers: Architecture, Navigation, User Manual, Deployment, Security, LO System, Cloud Functions, Firestore Schema*