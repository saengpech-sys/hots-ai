# HOTS AI ChatLoop - AI Coding Agent Instructions

## Project Overview
Educational AI chatbot for assessing Higher-Order Thinking Skills (HOTS) using OpenAI GPT-4o-mini. Real-time assessment with structured rubric scoring (A.R.C.E. Framework: Analysis, Reasoning, Creativity, Evidence). Built with Vue 3 + Firebase + Cloud Functions.

**Key Features:**
- 🤖 AI-powered HOTS assessment with 4-dimensional scoring
- 📝 Electronic Worksheets with automatic LO evaluation
- 📚 5E Model Lesson Plans with A.R.C.E. integration
- 🎮 Gamification (points, badges, streaks, leaderboard)
- 📊 National Scale architecture (Ministry → ESA → School)
- 🔒 Anti-cheat system (copy-paste prevention)

## 🗺️ Navigation & Access

### Student Features (9 Menus)
| Route | Feature | Description |
|-------|---------|-------------|
| `/chat` | 🚀 Assessment | Main HOTS chat interface |
| `/learning-rooms` | 🏫 ห้องกิจกรรม | Electronic worksheet rooms |
| `/my-progress` | 📈 ความคืบหน้า | LO progress tracking |
| `/progress-analytics` | 📊 Analytics | Detailed charts |
| `/adaptive-learning` | 🎯 Adaptive | AI learning paths |
| `/goal-setting` | 🎯 Goals | Learning goals |
| `/leaderboard` | 🏆 Leaderboard | Course ranking |
| `/progress-map` | 🗺️ Progress Map | Visual LO map |
| `/profile` | 👤 Profile | User settings |

### Teacher Features (14 Menus)
| Route | Feature | Description |
|-------|---------|-------------|
| `/courses` | 📚 รายวิชา | Course management |
| `/questions` | 💡 คลังคำถาม | Question bank + AI generation |
| `/class-analytics` | 📊 วิเคราะห์ | Class overview + export |
| `/lo-reports` | 🎯 รายงาน LO | LO heatmap |
| `/teacher-analytics` | 🔮 AI Predictions | Predictive analytics |
| `/realtime-monitor` | 📡 Monitor | Live activity |
| `/lesson-plans` | 📝 แผนการสอน | 5E lesson plans |
| `/teacher/worksheets` | 📋 ใบงาน | Worksheet management |
| `/teacher/worksheet-reports` | 📊 รายงานใบงาน | Worksheet reports + LO |
| `/micro-lessons` | 📖 Micro Lessons | Short content |
| `/micro-lesson-library` | 📚 คลัง Lessons | Lesson library |
| `/student-detail/:id` | 👥 นักเรียน | Individual detail |
| `/admin-lo-manager` | 🛠️ Admin LO | Edit student LOs |
| `/knowledge-sheet/:id` | 📄 ใบความรู้ | Pre-learning content |

## Architecture & Data Flow

### Tech Stack
```
Frontend:  Vue 3.4 + Vite 5 + Pinia (8 stores)
Backend:   Firebase (Auth, Firestore, Functions Node.js 20)
AI:        OpenAI gpt-4o-mini (15-20x cheaper than gpt-4o)
Deploy:    Firebase Hosting + Functions (us-central1)
```

### Critical Flow: Assessment Chat
```
1. Student types answer in ChatView.vue (copy-paste blocked)
2. Confirmation dialog: min 20 chars + preview + debounce 2s
3. chat.js → Cloud Function assessAnswer via HTTPS
4. Function → OpenAI with structured prompt (createAssessmentPrompt)
5. AI returns JSON: rubricScores (0-5 per dimension) + feedback
6. ⚠️ Clean markdown wrappers before JSON.parse()
7. Save to assessments + update studentProgress
8. Frontend receives via Firestore listener
```

### Critical Flow: Worksheet LO
```
1. Teacher creates Lesson Plan with LOs
2. generateElectronicWorksheet → stores learningOutcomes in metadata
3. Student completes worksheet → assessWorksheetSubmission
4. Function calls assessLearningOutcomesInternal (same as chat)
5. Save loAssessment to worksheetSubmissions
6. Update studentProgress.passedLOs (merged)
7. All pages use loProgress.js for consistent LO display
```

### Key Collections
```javascript
users              // role (student/teacher), studentId, grade, room, number
courses            // teacherId, learningOutcomes[]
questions          // courseId, relatedLOs[], hasSolution, loConfigs[]
sessions           // Chat sessions
messages           // sessionId, assessmentId
assessments        // rubricScores, loAssessment{passedLOs[], analysis}
studentProgress    // {studentId}_{courseId}, passedLOs[], loProgress{}
eWorksheets        // metadata.learningOutcomes[], sections[]
worksheetSubmissions // answers, assessment, loAssessment
lessonPlans        // 5E model content
learningRooms      // Activity rooms
```

## Critical Conventions

### 1. AI Response Handling (MANDATORY)
```javascript
// ⚠️ GPT-4o-mini wraps JSON in ```json blocks - MUST strip first
let cleanedText = responseText.trim()
if (cleanedText.startsWith('```')) {
  cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
  cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
}
const result = JSON.parse(cleanedText)
```
**Used in:** assessAnswer, assessWorksheetSubmission, generateLearningOutcomes, generateHOTSQuestion, generateSolution, generateElectronicWorksheet

### 2. LO Progress Utility (MANDATORY)
```javascript
// ⚠️ Always use loProgress.js for LO counting - ensures consistency
import { getStudentPassedLOs } from '@/utils/loProgress'
const { passedLOs, assessmentCount, worksheetCount } = 
  await getStudentPassedLOs(studentUid, courseId)

// This queries BOTH assessments AND worksheetSubmissions
```

### 3. LO Passing Criteria
```
An LO is "passed" when ALL 3 conditions are met:
1. Content Match: Answer covers LO's intent substantially
2. Skill Level: Evidence of expected understanding/skill
3. HOTS Score ≥ 3: Related dimension(s) must score ≥ 3/5
   - Analysis verbs → analysis ≥ 3
   - Reasoning verbs → reasoning ≥ 3
   - Creative verbs → creativity ≥ 3
   - Evidence verbs → evidence ≥ 3
```

### 4. Security Patterns
```javascript
// Client-side copy-paste prevention
@paste.prevent @copy.prevent @cut.prevent @contextmenu.prevent

// Server-side detection (detectCopyPaste function)
- Unusual spacing patterns
- Very long words (>25 chars)
- Mixed script detection
- Suspicious character ratios

// Firestore rules
function isTeacher() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
}
```

### 5. Question Selection Algorithm (chat.js)
```javascript
1. Get weak LOs from studentProgress
2. Filter unused questions (not in usedQuestionIds)
3. Exclude hasSolution: true (teacher exam keys)
4. Priority 1: Questions targeting weak LOs
5. Priority 2: Random unused
6. Fallback: Least-used (by usageCount)
```

### 6. State Management (Pinia)
| Store | Purpose |
|-------|---------|
| `auth.js` | Google Sign-In, role checking |
| `chat.js` | Session, questions, LO tracking |
| `gamification.js` | Points, badges, streaks, actualPassedLOs |
| `theme.js` | Dark mode (localStorage) |
| `lessonPlan.js` | Lesson plan CRUD |
| `learningPath.js` | Adaptive learning |
| `notifications.js` | Toast messages |
| `dashboard.js` | Teacher dashboard data |

## Development Workflow

### Setup & Build
```bash
# Frontend dev server (port 5173)
npm run dev

# Build for production
npm run build

# Functions local emulator
cd functions && npm run serve

# Deploy everything
firebase deploy  # or --only hosting|functions|firestore
```

### Environment Variables
- Frontend: `.env` → `VITE_FIREBASE_*` + `VITE_FUNCTIONS_URL`
- Functions: `functions/.env` → `OPENAI_API_KEY=sk-...`, `OPENAI_MODEL=gpt-4o-mini`

### Common Tasks
**Add new Cloud Function:**
1. Export in `functions/index.js`: `exports.functionName = functions.https.onRequest(...)`
2. Add CORS wrapper: `return cors(req, res, async () => {...})`
3. Clean GPT responses before JSON.parse
4. Deploy: `cd functions && npm run deploy`

**Add new view:**
1. Create `src/views/NewView.vue`
2. Add route in `src/router/index.js` with meta: `{requiresAuth: true, role: 'student'|'teacher'}`
3. Import in component: `import { useAuthStore } from '@/stores/auth'`

**Modify AI prompt:**
Edit `createAssessmentPrompt()` in `functions/index.js`. Keep structured JSON schema in prompt.

### Debugging
- Functions logs: `firebase functions:log` or Firebase Console
- Firestore issues: Check `firestore.rules` and composite index requirements
- AI errors: Verify OPENAI_API_KEY, check quota, inspect response text before parse

## Project-Specific Patterns

### Confirmation Dialog Pattern (ChatView.vue)
Three-step send: length check (≥20 chars) → confirmation modal → debounce (2s). Skip for keywords "ถัดไป", "next".

### CSV Export with Thai Characters
Always use BOM for UTF-8: `const BOM = '\uFEFF'; const blob = new Blob([BOM + csvContent], {type: 'text/csv;charset=utf-8'})`

### Question Selection Algorithm (chat.js)
1. Get student's weak LOs from `studentProgress`
2. Filter unused questions (not in session's `usedQuestionIds`)
3. Exclude questions with `hasSolution: true`
4. Priority 1: Questions targeting weak LOs (`relatedLOs` intersection)
5. Priority 2: Random unused questions
6. Fallback: Least-used question

### Dark Mode Implementation
CSS variables in `src/styles/main.css`, toggled via `.dark-mode` class on `<html>`. Theme persisted in localStorage by `theme.js` store.

## Anti-Patterns to Avoid
- ❌ Don't use `JSON.parse()` directly on OpenAI responses (markdown wrappers!)
- ❌ Don't create Firestore queries with multiple `where()` + `orderBy()` without composite index
- ❌ Don't update `usageCount` without increment operator: use `FieldValue.increment(1)`
- ❌ Don't send questions with `hasSolution: true` to students
- ❌ Don't forget BOM when exporting Thai CSV

## Key Files Reference
- `functions/index.js` (4000+ lines): All Cloud Functions, AI prompts
- `functions/national-scale.js`: National-level analytics functions
- `src/stores/chat.js` (600+ lines): Question selection, LO tracking logic
- `src/stores/lessonPlan.js`: Lesson plan state management
- `src/stores/gamification.js`: Points, badges, streaks, leaderboard + actualPassedLOs
- `src/utils/loProgress.js`: **Standard LO counting utility** - รวมทั้ง assessments + worksheetSubmissions
- `src/views/ChatView.vue`: Confirmation dialog, copy-paste blocking
- `src/views/QuestionBank.vue`: Solution generation UI
- `src/views/LessonPlans.vue`: Lesson plan list and management
- `src/views/TeacherWorksheets.vue`: Worksheet management for teachers
- `src/views/LearningRoomList.vue`: Student worksheet room listing
- `src/views/WorksheetResult.vue`: Worksheet result with LO progress section
- `src/views/WorksheetReports.vue`: Teacher worksheet reports with LO column
- `src/views/StudentDetail.vue`: Comprehensive assessment history with export
- `src/views/AdminLOManager.vue`: Admin tool for editing student LO progress
- `firestore.rules`: Role-based security, helper functions

## Recent Major Features
- **🔬 Phase 2: AI Precision & Integrity** (NEW!)
  - `temperature: 0` + `seed: 42` for deterministic scoring
  - Chain of Thought (CoT) reasoning before scoring
  - AI Confidence Score (0-100%) with reason
  - Language Bias Prevention (thinking ≠ writing skill)
  - Prompt Injection Defense with XML tags
  - Grade-Level Calibration (ป.4-6, ม.1-3, ม.4-6)
  - Full Audit Trail (modelUsed, promptVersion, rawResponseLength)
  - Retry Logic (max 2 attempts for malformed JSON)
- **Worksheet LO System**: ใบงาน (Worksheet) ประเมินและบันทึก LO เหมือน Assessment Chat
  - `generateElectronicWorksheet` เก็บ learningOutcomes ใน metadata
  - `assessWorksheetSubmission` เรียก `assessLearningOutcomesInternal` 
  - `loProgress.js` รวมข้อมูลจากทั้ง assessments และ worksheetSubmissions
- **LO Progress Consistency System**: Utility function `loProgress.js` ใช้ทุกหน้าเพื่อนับ LO ที่ผ่านให้ตรงกัน 100%
- **Admin LO Manager**: ครูสามารถแก้ไข LO ที่ผ่านของนักเรียนได้ผ่าน `/admin-lo-manager`
- **Electronic Worksheet System**: AI-generated worksheets with A.R.C.E. rubric scoring (Phase 4)
- **Lesson Plan Builder**: 5E model + A.R.C.E. integration, AI generation support
- **Learning Rooms**: Student-facing activity rooms for worksheet access
- **Knowledge Sheets**: Unit-level content for pre-learning preparation
- **Solution Generation System**: Teachers generate AI model answers (20/20 score) for questions
- **Confirmation Dialog**: Anti-accidental-send with answer preview, stats, tips
- **LO-Based Assessment**: AI evaluates which Learning Outcomes student demonstrated
- **Smart Question Selection**: Prioritizes weak areas using student progress data
- **National Scale**: Ministry → ESA → School hierarchy with dashboards

## Phase 2 AI Assessment Schema (NEW!)
```javascript
// 🔬 New fields in assessmentData (Firestore: assessments collection)
{
  // Standard fields...
  rubricScores: { analysis, reasoning, creativity, evidence },
  
  // Phase 2: AI Confidence & Chain of Thought
  aiConfidence: 85,              // 0-100%
  aiConfidenceReason: "คำตอบชัดเจน มีตัวอย่างเฉพาะเจาะจง",
  chainOfThought: {
    step1_summary: "สรุปประเด็นหลักของคำตอบ",
    step2_evidence: { analysis: "...", reasoning: "...", ... },
    step3_anchor_match: "หลักฐานตรงกับ Anchor ระดับ 4",
    step4_decision: "เหตุผลการตัดสินใจ"
  },
  
  // Phase 2: Audit Trail
  promptVersion: 'v3.0-cot-confidence',
  auditTrail: {
    modelUsed: 'gpt-4o-mini',
    temperature: 0,
    seed: 42,
    maxTokens: 1500,
    rawResponseLength: 1234,
    parseAttempts: 1,
    timestamp: '2024-...'
  }
}
```
## Model Preference
Use **gpt-4o-mini** for all operations (15-20x cheaper than gpt-4o). Already configured in functions/.env as `OPENAI_MODEL=gpt-4o-mini`.

