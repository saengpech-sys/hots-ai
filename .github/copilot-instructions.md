# HOTS AI ChatLoop - AI Coding Agent Instructions

## Project Overview
Educational AI chatbot for assessing Higher-Order Thinking Skills (HOTS) using OpenAI GPT-4o-mini. Real-time assessment with structured rubric scoring (Analysis, Reasoning, Creativity, Evidence). Built with Vue 3 + Firebase + Cloud Functions. Now includes Electronic Worksheets, Lesson Plans, and National Scale features.

## 🗺️ Navigation & Access
**Complete Guide**: See [NAVIGATION_GUIDE.md](../NAVIGATION_GUIDE.md)

### Student Features (9 Menus)
All accessible from `/student` Dashboard Quick Actions:
- 🚀 `/chat` - Start Assessment (Primary highlighted button)
- 🏫 `/learning-rooms` - Learning activity rooms (✨ NEW - Worksheets)
- 📈 `/my-progress` - LO Progress tracking
- 📊 `/progress-analytics` - Detailed analytics
- 🎯 `/adaptive-learning` - Personalized paths
- 🎯 `/goal-setting` - Set learning goals
- 🏆 `/leaderboard` - Compete with peers
- 🗺️ `/progress-map` - LO visualization
- 👤 `/profile` - User profile

### Teacher Features (12 Menus)
All accessible from `/teacher` Dashboard Quick Actions:
- 📚 `/courses` - Course management
- 💡 `/questions` - Question bank
- 📊 `/class-analytics` - Class overview
- 🎯 `/lo-reports` - LO reports
- 🔮 `/teacher-analytics` - AI Predictions
- 📡 `/realtime-monitor` - Live monitoring
- 📝 `/lesson-plans` - Lesson plan management (✨ NEW - 5E + A.R.C.E.)
- 📋 `/teacher/worksheets` - Electronic worksheets (✨ NEW)
- 📊 `/teacher/worksheet-reports` - Worksheet reports (✨ NEW)
- 📖 `/micro-lessons` - Lesson management
- 📚 `/micro-lesson-library` - Lesson library
- 👥 `/student-detail/:id` - Student details

## Architecture & Data Flow

### Tech Stack
- **Frontend**: Vue 3.4 + Vite 5 + Pinia (Composition API pattern)
- **Backend**: Firebase (Auth, Firestore, Cloud Functions Node.js 20)
- **AI**: OpenAI GPT-4o-mini (switched from gpt-4o for cost savings)
- **Deployment**: Firebase Hosting + Functions

### Critical Flow: Student Answer Assessment
1. Student types answer in `ChatView.vue` (copy-paste blocked)
2. Confirmation dialog validates minimum 20 characters + debounce (2s)
3. `chat.js` store calls Cloud Function `assessAnswer` via HTTPS
4. Function sends to OpenAI with structured prompt (`createAssessmentPrompt`)
5. AI returns JSON with `rubricScores` (0-5 per dimension) + feedback
6. **Markdown wrapper cleaning**: GPT-4o-mini wraps JSON in ```json blocks - must strip before `JSON.parse()`
7. Function saves to `assessments` collection, updates `studentProgress` for LO tracking
8. Frontend receives real-time update via Firestore listeners

### Key Collections Schema
```javascript
// users: role-based (student/teacher), includes studentId (5 digits), grade, room, number, section
// courses: teacher-owned, contains learningOutcomes[] with {code, description}
// questions: courseId-linked, has hasSolution flag (excludes from student pool)
// sessions: tracks active chats, messageCount
// messages: sessionId-linked, references assessmentId
// assessments: stores rubricScores{analysis, reasoning, creativity, evidence}, loAssessment{passedLOs[], analysis}
// studentProgress: {studentId}_${courseId} doc tracking cumulative passedLOs[]
```

## Critical Conventions

### 1. AI Response Handling Pattern
**ALWAYS clean markdown wrappers from GPT responses before parsing:**
```javascript
let cleanedText = responseText.trim()
if (cleanedText.startsWith('```')) {
  cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
  cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
}
const result = JSON.parse(cleanedText)
```
Applied in: `assessAnswer`, `generateLearningOutcomes`, `generateHOTSQuestion`, `generateSolution`

### 2. Learning Outcomes (LO) System
- Questions tagged with `relatedLOs: ["LO1", "LO3"]`
- Smart question selection prioritizes weak LOs (from `studentProgress`)
- Questions with `hasSolution: true` are EXCLUDED from student pool (teacher exam keys)
- LO assessment requires: content match + skill level + HOTS score ≥3 for relevant dimension

### 3. Security & Copy-Paste Prevention
Client-side: `@paste.prevent`, `@copy.prevent`, `@cut.prevent`, `@contextmenu.prevent` on textareas
Server-side: Detection heuristics in `detectCopyPaste()` (unusual spacing, long words, mixed scripts)

### 4. Firestore Security Pattern
```javascript
function isTeacher() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
}
```
Teacher-only: courses, questions, reports, full student data
Student: own data + session messages + assessments

### 5. State Management (Pinia)
- `auth.js`: Google Sign-In, user profile with role checking
- `chat.js`: Session lifecycle, message streaming, question selection algorithm
- `theme.js`: Dark mode toggle with localStorage persistence
- `gamification.js`: Points, badges, streaks, leaderboard
- `learningPath.js`: Adaptive learning path management
- `lessonPlan.js`: Lesson plan CRUD and AI generation
- `notifications.js`: Toast and badge notifications
- `dashboard.js`: Aggregated student data for teachers

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

## Model Preference
Use **gpt-4o-mini** for all operations (15-20x cheaper than gpt-4o). Already configured in functions/.env as `OPENAI_MODEL=gpt-4o-mini`.

