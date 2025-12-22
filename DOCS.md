# 📚 HOTS AI ChatLoop — Complete Technical Documentation

<div align="center">

**Version 5.2** | **Last Updated: December 22, 2025**

*Comprehensive technical reference for developers, researchers, and system administrators*

</div>

---

## 📑 Table of Contents

1. [System Summary](#1-system-summary)
2. [Architecture](#2-architecture)
3. [Navigation Guide](#3-navigation-guide)
4. [User Manual](#4-user-manual)
5. [Deployment Guide](#5-deployment-guide)
6. [Testing](#6-testing)
7. [Security Systems](#7-security-systems)
8. [A.R.C.E. Framework Implementation](#8-arce-framework-implementation)
9. [Worksheet LO System](#9-worksheet-lo-system)
10. [Cloud Functions Reference](#10-cloud-functions-reference)
11. [Firestore Collections Schema](#11-firestore-collections-schema)
12. [Development Patterns](#12-development-patterns)
13. [Troubleshooting](#13-troubleshooting)
14. [Reliability Ecosystem](#14-reliability-ecosystem) ⭐ NEW

---

## 1. System Summary

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | Vue 3 + Vite | 3.4 / 5.0 | Reactive UI with Composition API |
| **State Management** | Pinia | 2.x | 8 modular stores |
| **Routing** | Vue Router | 4.x | 45+ routes with guards |
| **Backend** | Firebase Cloud Functions | Node.js 20 | 41 serverless functions |
| **Database** | Cloud Firestore | - | 25+ collections, real-time sync |
| **AI Engine** | OpenAI API | GPT-4o-mini | Cost-effective LLM (15-20x cheaper than GPT-4o) |
| **Authentication** | Firebase Auth | - | Google Sign-In, role-based |
| **Hosting** | Firebase Hosting | - | CDN-backed static hosting |
| **PWA** | Vite PWA | - | Installable, offline-ready |

### Project Statistics

| Metric | Count | Notes |
|--------|-------|-------|
| Vue Components | 80+ | Including 45+ full views |
| Cloud Functions | 41 | HTTP + Scheduled + Triggers |
| Backend Code | 9,200+ lines | Modular architecture |
| Firestore Collections | 25+ | Normalized schema |
| Test Cases | 123 | 48 backend + 75 frontend |
| Routes | 45+ | Role-based access control |
| Pinia Stores | 8 | auth, chat, gamification, theme, lessonPlan, learningPath, notifications, dashboard |

### A.R.C.E. Framework Quick Reference

| Dimension | Thai | Description | Score Range |
|-----------|------|-------------|-------------|
| **A**nalysis | การวิเคราะห์ | แยกแยะประเด็น, หาความสัมพันธ์, เปรียบเทียบ | 0-5 |
| **R**easoning | การให้เหตุผล | อธิบายเหตุผล, สรุปตรรกะ, อ้างหลักการ | 0-5 |
| **C**reativity | ความคิดสร้างสรรค์ | เสนอมุมมองใหม่, คิดนอกกรอบ, ออกแบบ | 0-5 |
| **E**vidence | การใช้หลักฐาน | อ้างอิงข้อมูล, ยกตัวอย่าง, สนับสนุน | 0-5 |

**Total Score: 0-20** (sum of 4 dimensions)

---

## 2. Architecture

### Project Structure

```
hots-ai/
├── 📁 src/                          # Frontend source
│   ├── 📁 views/                    # 45+ Vue pages
│   │   ├── ChatView.vue             # Main assessment chat
│   │   ├── WorksheetResult.vue      # Worksheet results + LO section
│   │   ├── WorksheetReports.vue     # Teacher worksheet reports
│   │   ├── AdminLOManager.vue       # Admin LO editing tool
│   │   ├── MyProgress.vue           # Student progress
│   │   ├── LOReports.vue            # Teacher LO reports
│   │   ├── ClassAnalytics.vue       # Class analytics dashboard
│   │   ├── LessonPlans.vue          # 5E lesson plan management
│   │   └── ...
│   ├── 📁 components/               # Reusable components
│   │   ├── RadarChart.vue           # A.R.C.E. visualization
│   │   ├── LOProgressCards.vue      # LO progress display
│   │   ├── GamificationStats.vue    # Points, badges, streaks
│   │   └── ...
│   ├── 📁 stores/                   # Pinia state management
│   │   ├── auth.js                  # Authentication + role
│   │   ├── chat.js                  # Session + questions
│   │   ├── gamification.js          # Points, badges, streaks
│   │   ├── theme.js                 # Dark mode
│   │   ├── lessonPlan.js            # Lesson plan CRUD
│   │   ├── learningPath.js          # Adaptive learning
│   │   ├── notifications.js         # Toast messages
│   │   └── dashboard.js             # Teacher dashboard data
│   ├── 📁 utils/                    # Utility functions
│   │   ├── loProgress.js            # ⭐ Standard LO counting
│   │   ├── antiCheat.js             # Copy-paste detection
│   │   ├── errorHandler.js          # Error handling
│   │   └── logger.js                # Client-side logging
│   ├── 📁 firebase/                 # Firebase config
│   │   └── config.js
│   ├── 📁 router/                   # Vue Router with guards
│   │   └── index.js
│   └── 📁 styles/                   # Global styles
│       └── main.css
├── 📁 functions/                    # Cloud Functions
│   ├── index.js                     # Main functions (9200+ lines)
│   ├── gamification.js              # Badge definitions
│   ├── national-scale.js            # Ministry/ESA functions
│   ├── 📁 utils/                    # Backend utilities
│   │   ├── prompts.js               # AI prompt templates
│   │   ├── loAssessment.js          # LO assessment logic
│   │   ├── aiParser.js              # JSON response cleaning
│   │   ├── aiDetection.js           # AI-generated content detection
│   │   ├── reliability.js           # Schema validation
│   │   ├── rateLimiter.js           # Rate limiting
│   │   └── researchData.js          # Research data helpers
│   ├── 📁 services/                 # Business logic
│   │   └── assessmentService.js     # Assessment orchestration
│   ├── 📁 controllers/              # Request handlers
│   │   └── assessmentController.js
│   └── 📁 __tests__/                # Backend tests
│       ├── prompts.test.js
│       ├── loAssessment.test.js
│       ├── aiParser.test.js
│       └── rateLimiter.test.js
├── 📁 public/                       # Static assets
├── 📄 firestore.rules               # Security rules
├── 📄 firestore.indexes.json        # Composite indexes
├── 📄 firebase.json                 # Firebase config
├── 📄 package.json                  # Frontend dependencies
└── 📄 vite.config.js                # Vite config
```

### Pinia Stores Reference

| Store | Purpose | Key Methods |
|-------|---------|-------------|
| `auth.js` | Google Sign-In, user profile, role checking | `signInWithGoogle()`, `signOut()`, `isTeacher` |
| `chat.js` | Session lifecycle, question selection | `startSession()`, `sendAnswer()`, `selectQuestion()` |
| `gamification.js` | Points, badges, streaks, leaderboard | `awardPoints()`, `checkBadges()`, `refreshActualPassedLOs()` |
| `theme.js` | Dark mode toggle | `toggleDarkMode()` |
| `lessonPlan.js` | Lesson plan CRUD | `createPlan()`, `generateWithAI()` |
| `learningPath.js` | Adaptive learning | `getAdaptivePath()` |
| `notifications.js` | Toast messages | `showToast()`, `showError()` |
| `dashboard.js` | Teacher dashboard data | `loadClassData()` |

### Question Selection Algorithm

```javascript
// Priority-based selection for adaptive learning (chat.js)
async function selectNextQuestion(courseId, sessionId) {
  // 1. Get student's weak LOs from studentProgress
  const weakLOs = await getWeakLOs(studentId, courseId);
  
  // 2. Filter unused questions (not in session's usedQuestionIds)
  const unusedQuestions = questions.filter(q => !usedQuestionIds.includes(q.id));
  
  // 3. Exclude questions with hasSolution: true (teacher exam keys)
  const studentQuestions = unusedQuestions.filter(q => !q.hasSolution);
  
  // 4. Priority 1: Questions targeting weak LOs
  const priorityQuestions = studentQuestions.filter(q => 
    q.relatedLOs.some(lo => weakLOs.includes(lo))
  );
  
  if (priorityQuestions.length > 0) {
    return randomSelect(priorityQuestions);
  }
  
  // 5. Priority 2: Random unused questions
  if (studentQuestions.length > 0) {
    return randomSelect(studentQuestions);
  }
  
  // 6. Fallback: Least-used question (by usageCount)
  return questions.reduce((min, q) => q.usageCount < min.usageCount ? q : min);
}
```

---

## 3. Navigation Guide

### 🎓 Student Features (9 Menus)

| # | Route | Feature | Description | Key Components |
|---|-------|---------|-------------|----------------|
| 1 | `/chat` | 🚀 Assessment Chat | Chat-based HOTS assessment | ChatView.vue |
| 2 | `/learning-rooms` | 🏫 ห้องกิจกรรม | Electronic worksheet rooms | LearningRoomList.vue |
| 3 | `/my-progress` | 📈 ความคืบหน้า LO | Personal LO tracking | MyProgress.vue |
| 4 | `/progress-analytics` | 📊 Analytics | Detailed analytics charts | ProgressAnalytics.vue |
| 5 | `/adaptive-learning` | 🎯 Adaptive Learning | AI-powered learning paths | AdaptiveLearning.vue |
| 6 | `/goal-setting` | 🎯 Goal Setting | Personal learning goals | GoalSetting.vue |
| 7 | `/leaderboard` | 🏆 Leaderboard | Course-based ranking | Leaderboard.vue |
| 8 | `/progress-map` | 🗺️ Progress Map | Visual LO progress | ProgressMap.vue |
| 9 | `/profile` | 👤 โปรไฟล์ | User settings | Profile.vue |

### 👨‍🏫 Teacher Features (14+ Menus)

| # | Route | Feature | Description | Key Components |
|---|-------|---------|-------------|----------------|
| 1 | `/courses` | 📚 จัดการรายวิชา | Course CRUD + AI LO generation | CourseManagement.vue |
| 2 | `/questions` | 💡 คลังคำถาม | Question bank + AI generation | QuestionBank.vue |
| 3 | `/class-analytics` | 📊 วิเคราะห์ห้องเรียน | Class overview + export | ClassAnalytics.vue |
| 4 | `/lo-reports` | 🎯 รายงาน LO | LO heatmap by student | LOReports.vue |
| 5 | `/teacher-analytics` | 🔮 AI Predictions | Predictive analytics | TeacherAnalytics.vue |
| 6 | `/realtime-monitor` | 📡 Real-time Monitor | Live student activity | RealtimeMonitor.vue |
| 7 | `/lesson-plans` | 📝 แผนการสอน | 5E model lesson plans | LessonPlans.vue |
| 8 | `/teacher/worksheets` | 📋 ใบงาน | Electronic worksheets | TeacherWorksheets.vue |
| 9 | `/teacher/worksheet-reports` | 📊 รายงานใบงาน | Worksheet reports + LO | WorksheetReports.vue |
| 10 | `/micro-lessons` | 📖 Micro Lessons | Short lesson content | MicroLessons.vue |
| 11 | `/micro-lesson-library` | 📚 คลัง Lessons | Lesson library | MicroLessonLibrary.vue |
| 12 | `/student-detail/:id` | 👥 รายละเอียดนักเรียน | Individual student view | StudentDetail.vue |
| 13 | `/admin-lo-manager` | 🛠️ Admin LO Manager | Edit student LO data | AdminLOManager.vue |
| 14 | `/knowledge-sheet/:id` | 📄 Knowledge Sheets | Pre-learning content | KnowledgeSheet.vue |

### 🔬 Research Features

| Route | Description | Key Functions |
|-------|-------------|---------------|
| `/research/export` | Export anonymized data | exportResearchData |
| `/research/pretest-posttest` | Pre/Post test management | logInterventionEvent |
| `/research/expert-validation` | AI scoring validation | calculateIRR |
| `/research/expert-calibration` | Calibration tools | irrReport |

---

## 4. User Manual

### สำหรับนักเรียน (Student Guide)

#### การเข้าสู่ระบบ
1. เปิด https://hots-ai-d028b.web.app
2. คลิก "เข้าสู่ระบบด้วย Google"
3. กรอกข้อมูลโปรไฟล์ครั้งแรก (รหัสนักเรียน, ชั้น, ห้อง, เลขที่)
4. ยอมรับข้อกำหนด PDPA

#### การทำ Assessment Chat
1. เลือกรายวิชาจาก Dashboard
2. คลิก "เริ่มทำ Assessment"
3. อ่านคำถาม → พิมพ์คำตอบ (ขั้นต่ำ 20 ตัวอักษร)
4. คลิก "ส่งคำตอบ" → ยืนยันในกล่อง Dialog
5. รอ AI ประเมิน → ดูคะแนน 4 มิติ (A.R.C.E.)
6. อ่าน Feedback และ Scaffolding hints

#### การทำใบงานอิเล็กทรอนิกส์
1. ไปที่ "ห้องกิจกรรม" (`/learning-rooms`)
2. เลือกห้องที่ครูมอบหมาย
3. ทำใบงานทีละข้อ → ส่งคำตอบ
4. ดูผลประเมิน A.R.C.E. และ LO ที่ผ่าน

### สำหรับครู (Teacher Guide)

#### การสร้างรายวิชา
1. ไปที่ `/courses` → "สร้างรายวิชาใหม่"
2. กรอกข้อมูลพื้นฐาน (ชื่อ, รหัส, ระดับชั้น)
3. คลิก "AI สร้าง Learning Outcomes" หรือเพิ่มเอง
4. ตรวจสอบและบันทึก

#### การสร้างคำถาม HOTS
1. ไปที่ `/questions` → เลือกวิชา
2. "เพิ่มคำถามใหม่" หรือ "AI สร้างคำถาม"
3. เชื่อม LO ที่เกี่ยวข้อง
4. (Optional) "สร้าง Solution" สำหรับเฉลยข้อสอบ

#### การสร้างใบงานอิเล็กทรอนิกส์
1. ไปที่ `/lesson-plans` → สร้างแผนการสอน 5E
2. กำหนด Learning Outcomes ของแผน
3. คลิก "สร้างใบงาน" → AI สร้างอัตโนมัติ
4. แก้ไขที่ `/teacher/worksheets`
5. สร้าง Learning Room → เผยแพร่ให้นักเรียน

#### การจัดการ LO ของนักเรียน
1. ไปที่ `/admin-lo-manager`
2. เลือกวิชา → ค้นหานักเรียน
3. Quick Add: เพิ่ม LO ที่ขาด
4. แก้ไข: ปรับ LO ในแต่ละ Assessment

---

## 5. Deployment Guide

### Prerequisites

| Requirement | Version | Installation |
|-------------|---------|--------------|
| Node.js | 18+ LTS | [nodejs.org](https://nodejs.org) |
| Firebase CLI | Latest | `npm install -g firebase-tools` |
| OpenAI API Key | - | [platform.openai.com](https://platform.openai.com) |
| Firebase Project | Blaze plan | Required for Cloud Functions |

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
npm run build
firebase deploy     # Deploy all

# OR selective:
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
```

### Environment Variables

**Frontend (`.env`):**
```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FUNCTIONS_URL=https://us-central1-your-project.cloudfunctions.net
```

**Backend (`functions/.env`):**
```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

### Local Development

```bash
# Frontend (port 5173)
npm run dev

# Functions emulator (port 5001)
cd functions && npm run serve

# Build for production
npm run build
```

---

## 6. Testing

### Test Commands

```bash
# Frontend tests (Vitest)
npm test                    # Run 75 tests
npm run test:ui             # Interactive UI
npm run coverage            # Coverage report

# Backend tests (Jest)
cd functions && npm test    # Run 48 tests
```

### Test Coverage

| Category | File | Tests | Focus |
|----------|------|-------|-------|
| **Frontend** | auth.test.js | 17 | Pinia auth store, role checking |
| | gamification.test.js | 26 | Levels, badges, streaks, points |
| | errorHandler.test.js | 18 | Thai error messages |
| | loProgress.test.js | 14 | LO counting consistency |
| **Backend** | prompts.test.js | 10 | AI prompt templates |
| | loAssessment.test.js | 10 | LO evaluation logic |
| | aiParser.test.js | 18 | JSON response cleaning |
| | rateLimiter.test.js | 10 | Rate limiting |
| **Total** | | **123** | |

### Manual Testing Checklist

#### Authentication
- [ ] Login ด้วย Google สำเร็จ
- [ ] Redirect ตาม role (student/teacher)
- [ ] Route guard ทำงานถูกต้อง
- [ ] Profile Setup แสดงครั้งแรก

#### Student Features
- [ ] Dashboard แสดงข้อมูลถูกต้อง
- [ ] เลือกวิชาและเริ่ม session ได้
- [ ] ส่งคำตอบ (≥20 chars) + กล่องยืนยัน
- [ ] ไม่สามารถ copy-paste ได้
- [ ] รับ feedback และคะแนน real-time
- [ ] Gamification: แต้ม, Badge, Streak

#### Teacher Features
- [ ] Course/Question CRUD
- [ ] AI Generate: LO, Question, Solution
- [ ] Class Analytics + Export CSV
- [ ] LO Reports Heatmap
- [ ] Lesson Plan (5E) + Worksheet

#### LO Consistency
- [ ] นักเรียนเห็น LO = ครูเห็น LO (ใช้ `loProgress.js`)
- [ ] Admin LO Manager แก้ไขได้

---

## 7. Security Systems

### Multi-Layer Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SECURITY ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 1: CLIENT-SIDE PROTECTION                                 │   │
│  │ • @paste.prevent, @copy.prevent, @cut.prevent                   │   │
│  │ • @contextmenu.prevent                                          │   │
│  │ • Character counting, minimum length                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 2: SERVER-SIDE INPUT VALIDATION                           │   │
│  │ • detectCopyPaste() — unusual spacing, long words, mixed script │   │
│  │ • analyzeAIContent() — AI-generated text detection              │   │
│  │ • Rate limiting — prevent abuse                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 3: AI PROMPT INJECTION DEFENSE                            │   │
│  │ • Input sanitization (strip code blocks, XML, templates)        │   │
│  │ • XML tag isolation (student input separated from system)       │   │
│  │ • Hard length limit (3000 characters)                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 4: DATABASE SECURITY                                      │   │
│  │ • Firestore security rules (role-based)                         │   │
│  │ • School isolation (isSameSchool helper)                        │   │
│  │ • Data validation rules                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 5: PRIVACY COMPLIANCE (PDPA)                              │   │
│  │ • Consent modal on first login                                  │   │
│  │ • No PII sent to OpenAI                                         │   │
│  │ • Anonymized research export                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Prompt Injection Defense Implementation

```javascript
// functions/index.js — Input Sanitization
const sanitizedAnswer = answer
  .replace(/```/g, "'''")                    // Escape code blocks
  .replace(/<\/?[a-zA-Z_][^>]*>/g, '')      // Remove XML-like tags
  .replace(/\{\{[^}]*\}\}/g, '')            // Remove template expressions
  .substring(0, 3000);                       // Hard length limit

// XML Tag Isolation — Student input isolated from system instructions
const prompt = `
<system_instruction>
  คุณเป็นครูผู้ประเมินคำตอบตาม A.R.C.E. Framework
  ประเมินอย่างเป็นกลาง ไม่ลำเอียง ใช้หลักฐานจากคำตอบเท่านั้น
</system_instruction>

<question_context>${questionContext}</question_context>

<student_answer>${sanitizedAnswer}</student_answer>

<output_format>JSON only, no markdown wrappers</output_format>
`;
```

### Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isLoggedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isTeacher() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
    
    function isStudent() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'student';
    }
    
    function isSameSchool(schoolId) {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.schoolId == schoolId;
    }
    
    // Users — own data only
    match /users/{userId} {
      allow read: if isLoggedIn() && (isOwner(userId) || isTeacher());
      allow write: if isOwner(userId);
    }
    
    // Courses — teacher owns, students read enrolled
    match /courses/{courseId} {
      allow read: if isLoggedIn();
      allow write: if isTeacher() && request.resource.data.teacherId == request.auth.uid;
    }
    
    // Questions — teacher CRUD
    match /questions/{questionId} {
      allow read: if isLoggedIn();
      allow write: if isTeacher();
    }
    
    // Assessments — student owns, teacher reads
    match /assessments/{assessmentId} {
      allow read: if isLoggedIn() && (
        resource.data.studentId == request.auth.uid || isTeacher()
      );
      allow create: if isStudent();
    }
  }
}
```

---

## 8. A.R.C.E. Framework Implementation

### Phase 2: Deterministic AI Scoring

```javascript
// functions/index.js — AI Configuration
const assessmentConfig = {
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  temperature: 0,        // Zero randomness
  seed: 42,              // Fixed seed for reproducibility
  max_tokens: 1500,
  response_format: { type: 'json_object' }
};

// Chain of Thought (CoT) Structure
const expectedOutput = {
  chainOfThought: {
    step1_summary: "สรุปประเด็นหลักของคำตอบนักเรียน",
    step2_evidence: {
      analysis: "หลักฐานการวิเคราะห์ที่พบ...",
      reasoning: "หลักฐานการให้เหตุผลที่พบ...",
      creativity: "หลักฐานความคิดสร้างสรรค์ที่พบ...",
      evidence: "หลักฐานการอ้างอิงที่พบ..."
    },
    step3_anchor_match: "หลักฐานตรงกับ Anchor ระดับ X เนื่องจาก...",
    step4_decision: "เหตุผลในการตัดสินใจให้คะแนนสุดท้าย"
  },
  rubricScores: {
    analysis: 0-5,
    reasoning: 0-5,
    creativity: 0-5,
    evidence: 0-5
  },
  overallScore: 0-20,
  feedback: "...",
  aiConfidence: 0-100,
  aiConfidenceReason: "..."
};
```

### AI Response Cleaning (MANDATORY)

```javascript
// functions/utils/aiParser.js — ALWAYS clean GPT responses before JSON.parse
function cleanAIResponse(responseText) {
  let cleanedText = responseText.trim();
  
  // GPT-4o-mini often wraps JSON in ```json blocks — MUST strip
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '');
    cleanedText = cleanedText.replace(/\n?```\s*$/i, '');
  }
  
  // Remove any leading/trailing whitespace after stripping
  cleanedText = cleanedText.trim();
  
  try {
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('JSON parse failed:', error);
    console.error('Raw text:', cleanedText.substring(0, 200));
    throw new Error('Invalid AI response format');
  }
}
```

### Scaffolding System

| Score Range | Scaffolding Level | Feedback Style |
|-------------|-------------------|----------------|
| 0-4 | Level 1 (Explicit) | ให้คำใบ้ชัดเจน + ตัวอย่าง |
| 5-8 | Level 2 (Guided) | แนะนำแนวคิด |
| 9-12 | Level 3 (Probing) | ถามคำถามชวนคิด |
| 13-16 | Level 4 (Challenge) | ท้าทายเพิ่มเติม |
| 17-20 | Level 5 (Praise) | ยกย่อง + ขยายความ |

---

## 9. Worksheet LO System

### System Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WORKSHEET LO SYSTEM FLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TEACHER CREATES LESSON PLAN                                            │
│       ↓                                                                 │
│  generateElectronicWorksheet (Cloud Function)                           │
│       ├── Extract LOs from Lesson Plan                                  │
│       ├── Generate questions with AI                                    │
│       └── Store learningOutcomes[] in worksheet.metadata                │
│       ↓                                                                 │
│  eWorksheets Collection                                                 │
│  {                                                                      │
│    metadata: {                                                          │
│      learningOutcomes: [                                                │
│        { loCode: "LO1", loDescription: "..." },                         │
│        { loCode: "LO2", loDescription: "..." }                          │
│      ]                                                                  │
│    },                                                                   │
│    sections: [...]                                                      │
│  }                                                                      │
│       ↓                                                                 │
│  STUDENT COMPLETES WORKSHEET                                            │
│       ↓                                                                 │
│  assessWorksheetSubmission (Cloud Function)                             │
│       ├── Assess A.R.C.E. scores                                        │
│       ├── Call assessLearningOutcomesInternal()                         │
│       │      ├── Build rubric scores from A.R.C.E.                      │
│       │      ├── Evaluate each LO (same logic as Assessment Chat)       │
│       │      └── Return passedLOs[] + analysis                          │
│       ├── Save loAssessment to worksheetSubmissions                     │
│       └── Update studentProgress.passedLOs (merged)                     │
│       ↓                                                                 │
│  loProgress.js (Frontend Utility)                                       │
│       ├── Query assessments collection                                  │
│       ├── Query worksheetSubmissions collection                         │
│       └── Merge unique passedLOs from both sources                      │
│       ↓                                                                 │
│  CONSISTENT LO DISPLAY ACROSS ALL PAGES                                 │
│       ├── MyProgress.vue (Student)                                      │
│       ├── LOReports.vue (Teacher)                                       │
│       ├── WorksheetResult.vue (Student)                                 │
│       ├── WorksheetReports.vue (Teacher)                                │
│       └── gamification.js (actualPassedLOs)                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### loProgress.js — Standard LO Counting (MANDATORY)

```javascript
// src/utils/loProgress.js — ALWAYS use this for LO counting
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';

/**
 * Get student's passed LOs for a specific course
 * Combines data from BOTH assessments AND worksheetSubmissions
 */
export async function getStudentPassedLOs(studentUid, courseId) {
  const passedLOs = new Set();
  let assessmentCount = 0;
  let worksheetCount = 0;
  
  // 1. Query assessments collection
  const assessmentsQuery = query(
    collection(db, 'assessments'),
    where('studentId', '==', studentUid),
    where('courseId', '==', courseId)
  );
  const assessmentSnap = await getDocs(assessmentsQuery);
  assessmentSnap.forEach(doc => {
    const data = doc.data();
    if (data.loAssessment?.passedLOs) {
      data.loAssessment.passedLOs.forEach(lo => passedLOs.add(lo));
    }
    assessmentCount++;
  });
  
  // 2. Query worksheetSubmissions collection
  const worksheetQuery = query(
    collection(db, 'worksheetSubmissions'),
    where('studentId', '==', studentUid),
    where('courseId', '==', courseId)
  );
  const worksheetSnap = await getDocs(worksheetQuery);
  worksheetSnap.forEach(doc => {
    const data = doc.data();
    if (data.loAssessment?.passedLOs) {
      data.loAssessment.passedLOs.forEach(lo => passedLOs.add(lo));
    }
    worksheetCount++;
  });
  
  return {
    passedLOs: Array.from(passedLOs),
    assessmentCount,
    worksheetCount,
    totalSources: assessmentCount + worksheetCount
  };
}

/**
 * Batch query for multiple students (teacher reports)
 */
export async function getBatchStudentPassedLOs(studentUids, courseId) {
  const results = {};
  
  // Parallel queries for efficiency
  await Promise.all(studentUids.map(async uid => {
    results[uid] = await getStudentPassedLOs(uid, courseId);
  }));
  
  return results;
}
```

---

## 10. Cloud Functions Reference

### Assessment Functions

| Function | Type | Purpose | Input |
|----------|------|---------|-------|
| `assessAnswer` | HTTP | Chat-based HOTS assessment | answer, questionId, courseId |
| `assessWorksheetSubmission` | HTTP | Worksheet assessment + LO | submissionId, worksheetId, answers |
| `assessLearningOutcomesInternal` | Internal | LO evaluation | studentAnswer, learningOutcomes, assessmentResult |

### Generation Functions

| Function | Type | Purpose | Input |
|----------|------|---------|-------|
| `generateLearningOutcomes` | HTTP | AI generate LOs for course | courseId, description |
| `generateHOTSQuestion` | HTTP | AI generate HOTS question | courseId, topic, difficulty |
| `generateSolution` | HTTP | AI generate model answer | questionId |
| `generateLessonPlan` | HTTP | AI generate 5E lesson plan | topic, gradeLevel, duration |
| `generateElectronicWorksheet` | HTTP | AI generate worksheet | lessonPlanId, questionCount |
| `generateKnowledgeSheet` | HTTP | AI generate knowledge sheet | lessonPlanId |
| `generateCourseStructure` | HTTP | AI generate course units | courseId |

### Analytics Functions

| Function | Type | Purpose | Trigger |
|----------|------|---------|---------|
| `generateClassAnalytics` | HTTP | Class performance summary | Manual call |
| `generateDailyReport` | Scheduled | Daily activity report | Daily 06:00 |
| `getWorksheetReports` | HTTP | Worksheet submission reports | Manual call |
| `analyzeTalentTracks` | Scheduled | Talent analysis | Weekly Monday |
| `generateAdaptivePath` | HTTP | Personalized learning path | Manual call |

### Gamification Functions

| Function | Type | Purpose | Input |
|----------|------|---------|-------|
| `getLeaderboard` | HTTP | Course leaderboard | courseId, limit |
| `getBadgeDefinitions` | HTTP | Available badges | - |
| `claimDailyReward` | HTTP | Daily login reward | userId |

### Research Functions

| Function | Type | Purpose | Input |
|----------|------|---------|-------|
| `calculateIRR` | HTTP | Inter-Rater Reliability | expertScores, aiScores |
| `irrReport` | HTTP | IRR detailed report | courseId |
| `calculateEffectSize` | HTTP | Effect size calculation | preScores, postScores |
| `exportResearchData` | HTTP | Export anonymized data | courseId, format |
| `correlationAnalysis` | HTTP | Variable correlation | courseId |
| `exportKAnonymousDataAPI` | HTTP | K-Anonymity export | courseId, k, level |

### System Functions

| Function | Type | Purpose | Trigger |
|----------|------|---------|---------|
| `onUserDelete` | Trigger | Cleanup user data | Auth user deletion |
| `dailyConsistencyCheck` | Scheduled | Data integrity check | Daily 03:00 |
| `recalculateStudentProgress` | HTTP | Recalc progress | Manual call |
| `healthCheck` | HTTP | System health monitoring | Manual call |

---

## 11. Firestore Collections Schema

### users

```javascript
{
  uid: "firebase-auth-uid",          // Firebase Auth UID
  email: "student@example.com",
  displayName: "นักเรียน ทดสอบ",
  role: "student" | "teacher",
  studentId: "12345",                // 5-digit student ID
  grade: "ม.4",
  room: "1",
  number: "15",
  section: "A",                      // Optional
  photoURL: "https://...",
  createdAt: Timestamp,
  lastLoginAt: Timestamp,
  consentGiven: true,                // PDPA
  consentDate: Timestamp
}
```

### courses

```javascript
{
  id: "auto-generated",
  courseCode: "CS101",
  courseName: "วิทยาการคำนวณ",
  description: "...",
  teacherId: "teacher-uid",
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
  id: "auto-generated",
  courseId: "course-id",
  question: "คำถาม HOTS...",
  context: "บริบท...",               // Optional
  difficulty: 1-5,
  relatedLOs: ["LO1", "LO3"],
  loConfigs: [                        // LO-dimension mapping
    { loCode: "LO1", relatedDimensions: ["analysis", "reasoning"] }
  ],
  hasSolution: false,                 // true = exclude from student pool
  solution: { ... },                  // If hasSolution
  usageCount: 0,
  createdAt: Timestamp,
  createdBy: "teacher-uid"
}
```

### assessments

```javascript
{
  id: "auto-generated",
  sessionId: "session-id",
  studentId: "student-uid",           // Auth UID
  courseId: "course-id",
  questionId: "question-id",
  studentAnswer: "คำตอบนักเรียน...",
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
    manuallyModified: false,          // If admin edited
    modifiedBy: "teacher-uid",
    modifiedAt: Timestamp
  },
  chainOfThought: { ... },            // Phase 2
  aiConfidence: 85,                   // Phase 2
  aiConfidenceReason: "...",          // Phase 2
  auditTrail: { ... },                // Phase 2
  questionData: { ... },              // Snapshot
  createdAt: Timestamp
}
```

### studentProgress

```javascript
{
  id: "{studentId}_{courseId}",
  studentId: "student-uid",
  courseId: "course-id",
  passedLOs: ["LO1", "LO2", "LO3"],   // Merged from all sources
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
  id: "auto-generated",
  metadata: {
    title: "ใบงาน...",
    description: "...",
    lessonPlanId: "lesson-plan-id",
    courseId: "course-id",
    courseName: "...",
    teacherId: "teacher-uid",
    gradeLevel: "ม.4",
    topic: "...",
    duration: 50,
    totalQuestions: 8,
    maxScore: 20,
    learningOutcomes: [               // For LO assessment
      { loCode: "LO1", loDescription: "..." },
      { loCode: "LO2", loDescription: "..." }
    ],
    createdAt: "2025-12-21T..."
  },
  instructions: "คำชี้แจง...",
  sections: [
    {
      id: "section_1",
      title: "ส่วนที่ 1",
      phase: "exploration",           // 5E phase
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

### worksheetSubmissions

```javascript
{
  id: "auto-generated",
  worksheetId: "worksheet-id",
  studentId: "student-uid",
  courseId: "course-id",
  roomId: "room-id",
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
  loAssessment: {                     // LO evaluation
    passedLOs: ["LO1", "LO2"],
    analysis: "..."
  },
  status: "graded",
  timeSpent: 1800,                    // seconds
  submittedAt: Timestamp,
  gradedAt: Timestamp,
  studentData: { displayName, studentId, grade, room, number }
}
```

---

## 12. Development Patterns

### Adding a New Cloud Function

```javascript
// functions/index.js
exports.myNewFunction = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 60,
  memory: '512MB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // 1. Validate method
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' });
      }
      
      // 2. Extract params
      const { param1, param2 } = req.body;
      
      // 3. Your logic here...
      
      // 4. If using OpenAI, ALWAYS clean response
      const cleanedResult = cleanAIResponse(aiResponse);
      
      return res.status(200).send({ success: true, data: cleanedResult });
    } catch (error) {
      console.error('❌ Error:', error);
      return res.status(500).send({ error: error.message });
    }
  });
});
```

### Adding a New Vue View

```javascript
// 1. Create src/views/NewView.vue
<template>
  <div class="new-view">
    <h1>New View</h1>
    <!-- Your template -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const loading = ref(true);

onMounted(async () => {
  await loadData();
  loading.value = false;
});
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

### Using loProgress.js (MANDATORY for LO counting)

```javascript
import { getStudentPassedLOs, getBatchStudentPassedLOs } from '@/utils/loProgress';

// Single student
const { passedLOs, assessmentCount, worksheetCount } = 
  await getStudentPassedLOs(studentUid, courseId);

// Multiple students (teacher reports)
const studentData = await getBatchStudentPassedLOs(studentUids, courseId);
// studentData[uid] = { passedLOs: [...], assessmentCount, worksheetCount }
```

### CSV Export with Thai Characters

```javascript
// ALWAYS use BOM for Thai CSV export
const BOM = '\uFEFF';
const csvContent = 'ชื่อ,คะแนน\nนักเรียน1,15\nนักเรียน2,18';
const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
```

---

## 13. Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| JSON parse error from AI | GPT wraps JSON in markdown | Use `cleanAIResponse()` |
| Firestore query fails | Missing composite index | Check Firebase Console → Firestore → Indexes |
| LO counts don't match | Not using loProgress.js | Always use `getStudentPassedLOs()` |
| Thai CSV garbled | Missing BOM | Add `\uFEFF` prefix |
| Rate limit error | Too many AI calls | Check rate limiter settings |

### Debug Commands

```bash
# View function logs
firebase functions:log

# View specific function
firebase functions:log --only assessAnswer

# Start emulators
firebase emulators:start

# Check Firestore rules
firebase deploy --only firestore:rules --debug
```

### Anti-Patterns to Avoid

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| `JSON.parse(gptResponse)` directly | Use `cleanAIResponse()` first |
| Multiple `where()` + `orderBy()` without index | Create composite index |
| `doc.data().count + 1` | Use `FieldValue.increment(1)` |
| Send `hasSolution: true` to students | Filter in question selection |
| Export Thai CSV without BOM | Add `\uFEFF` prefix |
| Different LO counting logic per page | Use `loProgress.js` everywhere |

---

## 14. Reliability Ecosystem

### 🎯 Overview

HOTS AI implements a comprehensive **8-layer reliability ecosystem** to ensure assessment accuracy, consistency, and trustworthiness. This system is designed with a **Chain of Reasoning** philosophy where each layer validates and enhances the next.

### 📚 Documentation

| Document | Purpose | Language |
|----------|---------|----------|
| [RELIABILITY_ECOSYSTEM.md](RELIABILITY_ECOSYSTEM.md) | Complete technical reference | English |
| [RELIABILITY_ECOSYSTEM_TH.md](RELIABILITY_ECOSYSTEM_TH.md) | Thai explanation | ไทย |

### 🔗 8-Layer Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   RELIABILITY ECOSYSTEM                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   Layer 1: INPUT VALIDATION        ─► aiParser.js            │
│            Clean markdown, validate JSON schema               │
│                                                               │
│   Layer 2: AI RESILIENCE           ─► reliability.js         │
│            Retry mechanism, fallback assessment               │
│                                                               │
│   Layer 3: INTER-RATER RELIABILITY ─► interRaterReliability.js│
│            κ, ICC, MAE, Percent Agreement                     │
│                                                               │
│   Layer 4: VALIDATION STUDY        ─► validationStudy.js     │
│            CVR, CVI, Cronbach's α, Criterion Validity         │
│                                                               │
│   Layer 5: FAIRNESS AUDIT          ─► fairnessAudit.js       │
│            Effect size, DIF, group bias detection             │
│                                                               │
│   Layer 6: DATA CONSISTENCY        ─► dataConsistency.js     │
│            Firestore transactions, sync verification          │
│                                                               │
│   Layer 7: HUMAN-IN-THE-LOOP       ─► humanInTheLoop.js      │
│            Review queue, expert calibration                   │
│                                                               │
│   Layer 8: GRADE CALIBRATION       ─► gradeLevelCalibration.js│
│            Developmental stage anchors, age-appropriate norms │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 📊 Key Metrics & Thresholds

| Metric | Minimum | Target | Excellent |
|--------|---------|--------|-----------|
| Weighted Kappa (κw) | ≥ 0.60 | ≥ 0.70 | ≥ 0.80 |
| ICC (2,1) | ≥ 0.70 | ≥ 0.80 | ≥ 0.90 |
| MAE | ≤ 1.0 | ≤ 0.75 | ≤ 0.50 |
| Cronbach's Alpha | ≥ 0.70 | ≥ 0.80 | ≥ 0.90 |
| Effect Size (d) | ≤ 0.20 | ≤ 0.10 | ≤ 0.05 |

### 🔑 Publication Standard

```javascript
function meetsPublicationStandard(kappa, icc) {
  return kappa >= 0.60 && icc >= 0.70
}
```

### 📁 Module Reference

| File | Lines | Purpose |
|------|-------|---------|
| `aiParser.js` | ~100 | Clean markdown, parse JSON |
| `reliability.js` | ~500 | Schema validation, retry logic |
| `interRaterReliability.js` | ~700 | IRR calculations |
| `validationStudy.js` | ~580 | Validity metrics |
| `fairnessAudit.js` | ~550 | Bias detection |
| `dataConsistency.js` | ~380 | Transaction handling |
| `humanInTheLoop.js` | ~520 | Review queue |
| `gradeLevelCalibration.js` | ~550 | Grade norms |

---

## 🔑 Key Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| `functions/index.js` | All Cloud Functions, AI prompts | ~9200 |
| `functions/utils/prompts.js` | Modular prompt templates | ~200 |
| `functions/utils/loAssessment.js` | LO assessment logic | ~150 |
| `functions/utils/aiParser.js` | JSON response cleaning | ~100 |
| `functions/utils/reliability.js` | AI resilience & validation | ~500 |
| `functions/utils/interRaterReliability.js` | IRR metrics | ~700 |
| `src/stores/chat.js` | Session management, question selection | ~600 |
| `src/utils/loProgress.js` | **Standard LO counting** | ~420 |
| `src/views/ChatView.vue` | Main chat interface | ~800 |
| `src/views/AdminLOManager.vue` | Admin LO editing | ~800 |
| `firestore.rules` | Security rules | ~150 |

---

## 📋 Quick Reference

### URLs
- **Production**: https://hots-ai-d028b.web.app
- **Firebase Console**: https://console.firebase.google.com/project/hots-ai-d028b
- **Functions Region**: us-central1
- **Repository**: https://github.com/saengpech-sys/hots-ai

### Commands
```bash
# Development
npm run dev                    # Frontend dev server (5173)
cd functions && npm run serve  # Functions emulator

# Build & Deploy
npm run build                  # Build frontend
firebase deploy                # Deploy all

# Debug
firebase functions:log         # View function logs
firebase emulators:start       # Start all emulators
```

---

<div align="center">

**HOTS AI ChatLoop — Technical Documentation**

*Version 5.2 | December 22, 2025*

</div>
