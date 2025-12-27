# 🧠 HOTS AI ChatLoop — Advanced Copilot Instructions v5.3

> **Deterministic AI-Powered Higher-Order Thinking Skills Assessment System**  
> Production-grade educational platform with 11,800+ lines backend, 80+ Vue components  
> **Thai National-Scale Educational Technology** — Supporting ป.4-ม.6 (Grades 4-12)

---

## 📋 Quick Reference Card

| Aspect | Value |
|--------|-------|
| **Stack** | Vue 3.4 + Vite 5 + Pinia → Firebase Functions (Node.js 20) → OpenAI GPT-4o-mini |
| **AI Model** | `gpt-4o-mini-2024-07-18` with `temperature: 0`, `seed: 42` (deterministic) |
| **Framework** | A.R.C.E. (Analysis, Reasoning, Creativity, Evidence) — 4 dimensions, 0-5 each |
| **Backend** | 11,800+ lines in `functions/index.js` + modular controllers/utils |
| **Security** | 820+ lines Firestore rules, role-based access, copy-paste prevention |
| **IRR Metrics** | Cohen's κ = 0.72 (Substantial), ICC = 0.81 (Excellent), DPA Score 11/11 |
| **Coverage** | 48 Cloud Functions, 57+ Vue views, 123 test cases |

---

## 🏗️ Architecture Overview

### Directory Structure (Critical Paths)
```
functions/                        # ⚡ Cloud Functions Backend (Node.js 20)
├── index.js                      # 11,800+ lines - Main entry, exports all Cloud Functions
├── controllers/                  # HTTP handlers - request/response logic
│   ├── assessmentController.js   # Student answer assessment flow
│   ├── generationController.js   # AI content generation (questions, LOs, solutions)
│   ├── worksheetController.js    # Electronic worksheet CRUD + submission
│   ├── researchController.js     # Research data export & IRR calculation
│   ├── gamificationController.js # Points, badges, leaderboard
│   ├── qualityAssuranceController.js # HITL review queue
│   ├── knowledgeSheetController.js   # Knowledge sheet generation
│   └── systemController.js       # Health check, diagnostics
├── services/
│   └── assessmentService.js      # Core AI assessment logic, LO evaluation
├── utils/                        # 🔧 Utilities & Helpers
│   ├── prompts.js               # ⭐ All OpenAI prompts (Chain-of-Thought)
│   ├── aiParser.js              # ⭐ JSON cleaning, tolerance bands
│   ├── loAssessment.js          # Learning Outcomes evaluation logic
│   ├── reliability.js           # Retry, fallback, schema validation
│   ├── rateLimiter.js           # Per-user rate limiting (memory-based)
│   ├── distributedRateLimiter.js # Distributed rate limiting (Firestore-backed)
│   ├── circuitBreaker.js        # OpenAI API protection
│   ├── aiDetection.js           # AI-generated content detection
│   ├── interRaterReliability.js # IRR metrics (Cohen's κ, ICC, MAE)
│   ├── adaptiveScaffolding.js   # Progressive hint system
│   ├── gradeLevelCalibration.js # Grade-specific anchors (ป.4-6, ม.1-3, ม.4-6)
│   ├── fairnessAudit.js         # Bias detection, DIF analysis
│   ├── humanInTheLoop.js        # HITL review queue management
│   ├── dataConsistency.js       # Atomic transactions, data sync
│   ├── modelDriftDetector.js    # OpenAI model fingerprint tracking
│   └── llmProvider.js           # Centralized LLM configuration
├── __tests__/                   # Jest test suites
└── national-scale.js            # Ministry → ESA → School hierarchy

src/                             # 📱 Vue 3 Frontend
├── stores/                      # Pinia state (8 stores)
│   ├── auth.js                  # Google Auth + role checking
│   ├── chat.js                  # Session + smart question selection
│   ├── gamification.js          # Points, badges, streaks, levels
│   ├── lessonPlan.js            # 5E lesson plan management
│   ├── theme.js                 # Dark mode toggle
│   ├── notifications.js         # Toast messages
│   ├── dashboard.js             # Teacher dashboard data
│   └── learningPath.js          # Adaptive learning paths
├── views/                       # 57+ Vue pages
│   ├── ChatView.vue             # ⭐ Main assessment interface
│   ├── WorksheetResult.vue      # Worksheet results + LO display
│   ├── TeacherWorksheets.vue    # Teacher worksheet management
│   ├── AdminLOManager.vue       # Admin LO editing interface
│   ├── LOReports.vue            # LO heatmap reports
│   ├── ClassAnalytics.vue       # Class analytics dashboard
│   └── ...                      # 50+ more views
├── components/                  # Reusable UI components
├── utils/
│   ├── loProgress.js            # ⭐ Standard LO aggregation (Set-based)
│   ├── antiCheat.js             # Client-side integrity checks
│   └── errorHandler.js          # Thai error messages
├── composables/                 # Vue composables
├── router/                      # Vue Router with guards
└── firebase/                    # Firebase configuration
```

### Data Flow: Student Assessment
```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│ ChatView.vue│───▶│ chat.js store│───▶│ assessAnswer    │───▶│ OpenAI API   │
│ (copy-paste │    │ (validation) │    │ Cloud Function  │    │ GPT-4o-mini  │
│  blocked)   │    └──────────────┘    └─────────────────┘    └──────────────┘
└─────────────┘                               │                       │
                                              │  ┌─────────────────┐  │
                                              │◀─│ aiParser.js     │◀─┘
                                              │  │ (clean markdown)│
                                              ▼  └─────────────────┘
                                   ┌─────────────────────┐
                                   │ Firestore           │
                                   │ • assessments       │
                                   │ • studentProgress   │
                                   │ • learningEvents    │
                                   └─────────────────────┘
```

---

## 🔧 Critical Code Patterns

### 1. AI Response Parsing (MANDATORY)
GPT-4o-mini wraps JSON in markdown blocks. **Always use `aiParser.js`:**
```javascript
// ✅ CORRECT - Use utility function
const { cleanAIResponse, safeParseJSON } = require('./utils/aiParser')
const { success, data, error } = safeParseJSON(responseText, {
  maxRetries: 2,
  fallback: getFallbackAssessment()
})

// ❌ WRONG - Never do this
const result = JSON.parse(responseText) // Will fail on ```json blocks
```

### 2. OpenAI Call Pattern (With Circuit Breaker)
```javascript
const { CircuitBreaker } = require('./utils/circuitBreaker')
const circuitBreaker = new CircuitBreaker('openai-assessment', {
  failureThreshold: 5,
  timeout: 30000
})

// Execute with protection
const response = await circuitBreaker.execute(async () => {
  return openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0,  // Deterministic
    seed: 42,        // Reproducible
    messages: [...]
  })
})
```

### 3. Prompt Engineering (Chain-of-Thought)
All prompts use structured XML tags for clarity and injection prevention:
```javascript
// From functions/utils/prompts.js
const prompt = `
<system_instruction>
ประเมินคำตอบปลายเปิดของนักเรียนอย่างเป็นกลาง
ใช้ Chain-of-Thought reasoning ก่อนให้คะแนน
</system_instruction>

<student_answer>${sanitizeStudentInput(answer)}</student_answer>

<output_schema>
{
  "chainOfThought": "...",
  "rubricScores": { "analysis": 0-5, "reasoning": 0-5, ... },
  "aiConfidence": 0-100,
  "feedback": "..."
}
</output_schema>
`
```

### 4. Firestore Security Rules Pattern
```javascript
// firestore.rules (820+ lines)
function isTeacher() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
}

function isOwner(studentId) {
  return request.auth.uid == studentId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.studentId == studentId;
}

match /assessments/{docId} {
  allow read: if isOwner(resource.data.studentId) || isTeacher();
  allow write: if false; // Server-only writes
}
```

### 5. Rate Limiting (Multi-layer)
```javascript
// Layer 1: IP-based (quick rejection)
const ipResult = checkIPRateLimit(ip, 'assessment') // 60/min

// Layer 2: User-based (Firestore-backed)
const userResult = await checkUserRateLimit(db, studentId, 'assessment') // 20/5min

// Layer 3: Circuit breaker (OpenAI protection)
if (circuitBreaker.isOpen()) {
  return res.status(503).send({ error: 'Service temporarily unavailable' })
}
```

---

## 📊 A.R.C.E. Framework Implementation

### Scoring Rubric (0-5 per dimension)
| Score | Level | Description |
|-------|-------|-------------|
| 0 | ไม่แสดง | No evidence of skill |
| 1 | เริ่มต้น | Basic attempt, major gaps |
| 2 | กำลังพัฒนา | Some understanding, inconsistent |
| 3 | ผ่านเกณฑ์ | Meets expectations, minor issues |
| 4 | ดี | Clear demonstration, thorough |
| 5 | ยอดเยี่ยม | Exceptional, insightful, creative |

### LO Assessment Logic
```javascript
// From functions/utils/loAssessment.js
function assessLearningOutcomes(rubricScores, questionLOs, answer) {
  const passedLOs = []
  
  for (const lo of questionLOs) {
    const relevantDimension = mapLOToDimension(lo) // e.g., "LO1" → "analysis"
    const score = rubricScores[relevantDimension]
    
    if (score >= 3) { // Threshold for passing
      passedLOs.push(lo)
    }
  }
  
  return { passedLOs, analysis: '...' }
}
```

### LO Aggregation Logic (Audited ✅)
> **De-duplication**: ใช้ `Set()` รวม LO จากทุกแหล่ง — ไม่นับซ้ำ

```javascript
// From src/utils/loProgress.js — STANDARD LO COUNTING
export async function getStudentPassedLOs(studentUid, courseId) {
  const passedLOsSet = new Set()  // ⭐ De-duplication via Set
  
  // Source 1: Chat Assessments
  const assessmentSnap = await getDocs(query(
    collection(db, 'assessments'),
    where('studentId', '==', studentUid),
    where('courseId', '==', courseId)
  ))
  assessmentSnap.forEach(doc => {
    doc.data().loAssessment?.passedLOs?.forEach(lo => passedLOsSet.add(lo))
  })
  
  // Source 2: Worksheet Submissions
  const worksheetSnap = await getDocs(query(
    collection(db, 'worksheetSubmissions'),
    where('studentId', '==', studentUid),
    where('courseId', '==', courseId)
  ))
  worksheetSnap.forEach(doc => {
    doc.data().loAssessment?.passedLOs?.forEach(lo => passedLOsSet.add(lo))
  })
  
  return Array.from(passedLOsSet).sort()  // Unique + Sorted
}
```

#### Calculation Example
| Source | passedLOs | After Set.add() |
|--------|-----------|-----------------|
| Chat Assessment | `["LO1", "LO2"]` | `{LO1, LO2}` |
| Worksheet | `["LO2", "LO3"]` | `{LO1, LO2, LO3}` |
| **Final Result** | — | **3 unique LOs** ✅ |

#### Passing Criteria (3-Layer Enforcement)
```
Layer 1: AI Prompt (prompts.js)
  → "มิติ HOTS ที่เกี่ยวข้อง ต้องมีคะแนนอย่างน้อย 3/5"

Layer 2: Backend Logic (loAssessment.js)
  → if (score >= 3) { earnedScore += score }

Layer 3: Admin Override (AdminLOManager.vue)
  → arrayUnion(loCode) + manuallyModified: true
```

---

## 🛡️ Security Checklist

### Copy-Paste Prevention (Client-side)
```vue
<!-- ChatView.vue -->
<textarea
  @paste.prevent="handlePasteAttempt"
  @copy.prevent
  @cut.prevent
  @contextmenu.prevent
  @dragover.prevent
  @drop.prevent
/>
```

### Input Sanitization (Server-side)
```javascript
// Always sanitize before prompt injection
const { sanitizeStudentInput } = require('./utils/prompts')
const safeAnswer = sanitizeStudentInput(rawAnswer, 3000)
  .replace(/```/g, "'''")           // Escape code blocks
  .replace(/<\/?[a-zA-Z_][^>]*>/g, '') // Remove XML tags
```

### AI Content Detection
```javascript
const { comprehensiveAIDetection } = require('./utils/aiDetection')
const result = comprehensiveAIDetection(answer, typingFingerprint)
if (result.isLikelyAI && result.confidence > 0.7) {
  // Log but don't block (pedagogical approach)
  await db.collection('aiDetectionLogs').add({ ... })
}
```

---

## 🔬 Research & Reliability Features

### Inter-Rater Reliability (IRR)
```javascript
const { comprehensiveIRRAnalysis } = require('./utils/interRaterReliability')
const irr = comprehensiveIRRAnalysis(humanScores, aiScores)
// Returns: { cohensKappa, weightedKappa, icc, mae, meetsPublicationStandard }
```

### Model Drift Detection
```javascript
const { analyzeModelDrift } = require('./utils/modelDriftDetector')
// Tracks OpenAI model fingerprints over time
// Alerts if reproducibility drops below threshold
```

### Research Data Export
```javascript
const { exportKAnonymousData } = require('./utils/researchData')
// Exports data with k-anonymity guarantees
// Removes PII, generalizes quasi-identifiers
```

---

## 📝 Common Development Tasks

### Add New Cloud Function
```javascript
// 1. In functions/index.js
exports.myNewFunction = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      // Your logic here
      // Use aiParser.js for AI responses
      // Use rateLimiter for protection
    } catch (error) {
      console.error('Error:', error)
      res.status(500).send({ error: error.message })
    }
  })
})

// 2. Deploy
// cd functions && npm run deploy -- --only functions:myNewFunction
```

### Add New Vue View
```javascript
// 1. Create src/views/MyView.vue with Composition API
// 2. Add route in src/router/index.js
{
  path: '/my-view',
  name: 'MyView',
  component: () => import('@/views/MyView.vue'),
  meta: { requiresAuth: true, role: 'teacher' }
}

// 3. Add navigation in relevant dashboard
```

### Modify AI Assessment Prompt
```javascript
// Edit functions/utils/prompts.js → createAssessmentPrompt()
// Keep structured output schema
// Test with multiple edge cases
// Check IRR metrics after changes
```

---

## ⚠️ Anti-Patterns (NEVER DO)

| ❌ Anti-Pattern | ✅ Correct Approach |
|----------------|---------------------|
| `JSON.parse(aiResponse)` directly | Use `safeParseJSON()` from aiParser.js |
| Multiple `where()` + `orderBy()` without index | Create composite index in firestore.indexes.json |
| `usageCount = usageCount + 1` | Use `FieldValue.increment(1)` |
| Send `hasSolution: true` questions to students | Filter in question selection query |
| Thai CSV without BOM | `'\uFEFF' + csvContent` |
| Hardcode `gpt-4o` model | Use `process.env.OPENAI_MODEL` (gpt-4o-mini) |
| Skip rate limiting on new endpoints | Always wrap with `checkUserRateLimit()` |

---

## 🗂️ Key Files Quick Reference

| File | Lines | Purpose |
|------|-------|---------|
| `functions/index.js` | 11,800+ | Main Cloud Functions entry |
| `functions/utils/prompts.js` | 300 | All AI prompts with CoT |
| `functions/utils/aiParser.js` | 300 | Response cleaning + parsing |
| `functions/utils/loAssessment.js` | 250 | LO evaluation + passing criteria |
| `functions/utils/reliability.js` | 400+ | Retry, fallback, validation |
| `functions/controllers/assessmentController.js` | 300 | Assessment HTTP handler |
| `src/utils/loProgress.js` | 590 | ⭐ Standard LO aggregation (Set-based) |
| `src/stores/chat.js` | 600+ | Session + question selection |
| `src/views/ChatView.vue` | 1000+ | Main student interface |
| `src/views/AdminLOManager.vue` | 1270+ | Teacher LO editing interface |
| `firestore.rules` | 820+ | Security rules |
| `firestore.indexes.json` | - | Composite indexes |

---

## 🚀 Deployment Commands

```bash
# Development
npm run dev                    # Frontend on :5173
cd functions && npm run serve  # Emulator on :5001

# Production
npm run build                  # Build frontend
firebase deploy                # Deploy all
firebase deploy --only functions:assessAnswer  # Single function
firebase deploy --only firestore:rules         # Rules only

# Debugging
firebase functions:log --only assessAnswer     # View logs
firebase emulators:start                       # Full local stack
```

---

## 🔗 Related Documentation

- [DOCS.md](../DOCS.md) — Complete technical documentation
- [RELIABILITY_ECOSYSTEM.md](../RELIABILITY_ECOSYSTEM.md) — 95%+ reliability design
- [RESEARCH_DATA_PIPELINE.md](../RESEARCH_DATA_PIPELINE.md) — Research export guide
- [DPA_ASSESSMENT_CHECKLIST.md](../DPA_ASSESSMENT_CHECKLIST.md) — Data protection compliance
- [docs/03_SYSTEM_ARCHITECTURE.md](../docs/03_SYSTEM_ARCHITECTURE.md) — Detailed architecture

---

**Last Updated:** December 24, 2025 | **Version:** 5.3.0
