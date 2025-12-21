# HOTS AI ChatLoop 🎓🤖

<div align="center">

![Version](https://img.shields.io/badge/Version-5.1.0-blue)
![Phase](https://img.shields.io/badge/Phase-4%2B%20Production-green)
![Tests](https://img.shields.io/badge/Tests-123%20Passed-success)
![License](https://img.shields.io/badge/License-MIT-yellow)
![DPA](https://img.shields.io/badge/DPA%20Score-11%2F11-brightgreen)

**AI-Powered Educational Ecosystem for Higher-Order Thinking Skills Assessment**

*ระบบประเมินทักษะการคิดขั้นสูง (HOTS) ด้วยปัญญาประดิษฐ์ สำหรับการศึกษาไทยระดับชาติ*

🌐 [Live Demo](https://hots-ai-d028b.web.app) | 📚 [Documentation](./DOCS.md) | 🔬 [Research Pipeline](./RESEARCH_DATA_PIPELINE.md) | 🏆 [DPA Assessment](./DPA_ASSESSMENT_CHECKLIST.md)

**Last Updated:** December 21, 2025

</div>

---

## 📖 Abstract

**HOTS AI ChatLoop** เป็นระบบนิเวศการศึกษาแบบบูรณาการ (Integrated Educational Ecosystem) ที่ประยุกต์ใช้ Large Language Model (LLM) ในการประเมินทักษะการคิดขั้นสูง (Higher-Order Thinking Skills) ตามกรอบแนวคิด **A.R.C.E. Framework** (Analysis, Reasoning, Creativity, Evidence) ซึ่งพัฒนาขึ้นโดยอ้างอิงจาก:

- **Bloom's Revised Taxonomy** (Anderson & Krathwohl, 2001) - โครงสร้างลำดับขั้นของทักษะทางปัญญา
- **Critical Thinking Assessment Framework** (Facione, 1990) - กรอบการประเมินการคิดอย่างมีวิจารณญาณ
- **Zone of Proximal Development** (Vygotsky, 1978) - ทฤษฎีการช่วยเหลือตามลำดับขั้น (Scaffolding)
- **Formative Assessment Principles** (Black & Wiliam, 1998) - หลักการประเมินเพื่อพัฒนา

**Key Research Contributions:**
1. 🔬 **Deterministic AI Scoring** — การให้คะแนนที่คงเส้นคงวาด้วย `temperature: 0` + `seed: 42`
2. 🧠 **Chain of Thought (CoT) Reasoning** — AI แสดงกระบวนการคิดก่อนตัดสินใจ เพิ่มความโปร่งใส (Explainability)
3. 📊 **Multi-modal Assessment** — การประเมินผ่านทั้ง Chat-based และ Electronic Worksheets
4. 🎯 **Adaptive Learning Paths** — เส้นทางการเรียนรู้ส่วนบุคคลตาม Mastery-based Learning
5. 🏛️ **National Scale Architecture** — สถาปัตยกรรมรองรับระดับประเทศ (Ministry → ESA → School)

---

## 📋 Table of Contents

- [Theoretical Framework](#-theoretical-framework)
- [A.R.C.E. Framework](#-arce-framework)
- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Recent Developments](#-recent-developments-phase-4)
- [Installation](#-installation)
- [Usage Guide](#-usage-guide)
- [Gamification System](#-gamification-system)
- [Security & Privacy](#-security--privacy)
- [Research Capabilities](#-research-capabilities)
- [Testing](#-testing)
- [Documentation](#-documentation)
- [Project Metrics](#-project-metrics)

---

## 🎓 Theoretical Framework

### Foundational Theories

| Theory | Author(s) | Year | Application in HOTS AI |
|--------|-----------|------|------------------------|
| **Bloom's Revised Taxonomy** | Anderson & Krathwohl | 2001 | Hierarchical cognitive skill dimensions (A.R.C.E.) |
| **Zone of Proximal Development** | Vygotsky | 1978 | AI Scaffolding — progressive hint system |
| **Formative Assessment** | Black & Wiliam | 1998 | Real-time feedback loops, immediate correction |
| **Self-Determination Theory** | Deci & Ryan | 1985 | Gamification design (autonomy, competence, relatedness) |
| **Constructive Alignment** | Biggs | 1996 | Learning Outcomes ↔ Assessment ↔ Activities alignment |
| **Mastery Learning** | Bloom | 1968 | LO-based progression, adaptive paths |

### Pedagogical Design Principles

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    CONSTRUCTIVE ALIGNMENT MODEL                            │
│                         (Biggs, 1996)                                      │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   Learning Outcomes (LO)                                                   │
│          │                                                                 │
│          ├─────────────────────────────────────────────────────────┐       │
│          │                                                         │       │
│          ▼                                                         ▼       │
│   ┌─────────────────┐                               ┌─────────────────┐   │
│   │  Teaching &     │                               │   Assessment    │   │
│   │  Learning       │◄─────────────────────────────▶│   Tasks         │   │
│   │  Activities     │        Aligned                │   (A.R.C.E.)    │   │
│   │  (5E Model)     │                               │                 │   │
│   └─────────────────┘                               └─────────────────┘   │
│                                                                            │
│   In HOTS AI ChatLoop:                                                     │
│   • LO → Defined in Course Management                                      │
│   • Activities → 5E Lesson Plans + Knowledge Sheets                        │
│   • Assessment → AI-powered A.R.C.E. rubric scoring                       │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 A.R.C.E. Framework

### Framework Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          A.R.C.E. FRAMEWORK                                 │
│              Higher-Order Thinking Skills Assessment Model                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │   ANALYSIS   │   │  REASONING   │   │  CREATIVITY  │   │   EVIDENCE   │ │
│  │      (A)     │   │      (R)     │   │      (C)     │   │      (E)     │ │
│  ├──────────────┤   ├──────────────┤   ├──────────────┤   ├──────────────┤ │
│  │ การวิเคราะห์  │   │ การให้เหตุผล  │   │ความคิดสร้างสรรค์│   │ การใช้หลักฐาน │ │
│  ├──────────────┤   ├──────────────┤   ├──────────────┤   ├──────────────┤ │
│  │ • แยกแยะ      │   │ • อธิบาย     │   │ • สร้างใหม่   │   │ • อ้างอิง    │ │
│  │ • เปรียบเทียบ  │   │ • พิสูจน์     │   │ • ออกแบบ     │   │ • ยกตัวอย่าง  │ │
│  │ • จำแนก       │   │ • สรุป       │   │ • ประยุกต์    │   │ • สนับสนุน   │ │
│  │ • ตรวจสอบ     │   │ • อนุมาน     │   │ • ดัดแปลง    │   │ • พิสูจน์    │ │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘ │
│         │                  │                  │                  │         │
│         │    Score: 0-5    │    Score: 0-5    │    Score: 0-5    │         │
│         │                  │                  │                  │         │
│         └──────────────────┴─────────┬────────┴──────────────────┘         │
│                                      │                                      │
│                              ┌───────▼───────┐                             │
│                              │  TOTAL SCORE  │                             │
│                              │   0 - 20      │                             │
│                              │  (4 × 5 max)  │                             │
│                              └───────────────┘                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Four Dimensions of Assessment

| Dimension | Icon | Thai Translation | Bloom's Level | Key Cognitive Processes |
|-----------|------|------------------|---------------|------------------------|
| **Analysis** | 🔍 | การวิเคราะห์ | Analyze (L4) | Differentiating, Organizing, Attributing |
| **Reasoning** | 🧠 | การให้เหตุผล | Evaluate (L5) | Checking, Critiquing, Judging |
| **Creativity** | 💡 | ความคิดสร้างสรรค์ | Create (L6) | Generating, Planning, Producing |
| **Evidence** | 📚 | การใช้หลักฐาน | Apply (L3) | Executing, Implementing, Supporting |

### Scoring Rubric (Analytical Rubric 0-5 Scale)

| Level | Score | Performance Descriptor | Behavioral Indicators |
|-------|-------|------------------------|----------------------|
| **Exemplary** | 5 | Outstanding mastery; exceeds expectations | Complex multi-factor analysis, novel insights, multiple credible evidence sources, sophisticated synthesis |
| **Proficient** | 4 | Strong competence; meets all criteria | Clear causal reasoning, original perspectives, relevant examples with explanation |
| **Developing** | 3 | Adequate understanding; meets basic criteria | Basic pattern recognition, logical flow, some supporting evidence |
| **Emerging** | 2 | Partial grasp; approaches criteria | Surface-level comparison, limited justification, minimal examples |
| **Beginning** | 1 | Minimal evidence; below criteria | Fragmented response, unclear logic, vague references |
| **Not Evident** | 0 | No demonstration of skill | Off-topic, missing, or completely irrelevant response |

### Learning Outcome (LO) Passing Criteria

An LO is considered **"passed"** when **ALL 3 conditions** are simultaneously met:

```
┌────────────────────────────────────────────────────────────────────────┐
│                    LO PASSING CRITERIA (Conjunctive)                   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ✅ Condition 1: CONTENT ALIGNMENT                                     │
│     └── Student's response substantially addresses the LO's intent     │
│                                                                        │
│  ✅ Condition 2: SKILL DEMONSTRATION                                   │
│     └── Evidence of expected understanding/skill at required level     │
│                                                                        │
│  ✅ Condition 3: HOTS THRESHOLD (Score ≥ 3)                           │
│     └── Relevant dimension(s) must achieve minimum score:              │
│         • Analysis verbs (วิเคราะห์, เปรียบเทียบ) → analysis ≥ 3      │
│         • Reasoning verbs (อธิบาย, สรุป) → reasoning ≥ 3               │
│         • Creative verbs (ออกแบบ, สร้างสรรค์) → creativity ≥ 3        │
│         • Evidence verbs (อ้างอิง, พิสูจน์) → evidence ≥ 3             │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        🏛️ NATIONAL EDUCATION ECOSYSTEM                      │
│           Ministry Dashboard → ESA Analytics → School Management            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   👨‍🏫 TEACHER MODULE                        🎓 STUDENT MODULE                │
│   ┌─────────────────────────┐            ┌─────────────────────────┐       │
│   │ • Course Management     │            │ • AI Assessment Chat    │       │
│   │ • Question Bank (AI Gen)│   Assigns  │ • Electronic Worksheets │       │
│   │ • 5E Lesson Plans       │──────────▶│ • Adaptive Learning     │       │
│   │ • Electronic Worksheets │            │ • Gamification System   │       │
│   │ • Analytics Dashboard   │◀──────────│ • Learning Portfolio    │       │
│   │ • LO Progress Reports   │   Reports  │ • Goal Setting          │       │
│   │ • Admin LO Manager      │            │ • Progress Tracking     │       │
│   └─────────────────────────┘            └─────────────────────────┘       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                          ⚙️ AI ENGINE LAYER (Phase 2)                       │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │  OpenAI GPT-4o-mini (Cost-effective: 15-20x cheaper than GPT-4o)  │    │
│   │  ┌──────────────────────────────────────────────────────────────┐ │    │
│   │  │ • Deterministic: temperature=0, seed=42                      │ │    │
│   │  │ • Chain of Thought (CoT) Reasoning                          │ │    │
│   │  │ • AI Confidence Score (0-100%)                              │ │    │
│   │  │ • Prompt Injection Defense (XML isolation)                  │ │    │
│   │  │ • Full Audit Trail                                          │ │    │
│   │  │ • Grade-Level Calibration (ป.4-6, ม.1-3, ม.4-6)             │ │    │
│   │  └──────────────────────────────────────────────────────────────┘ │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                            💾 DATA LAYER                                    │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│   │ Cloud Firestore │  │ Firebase Auth   │  │ Cloud Storage   │           │
│   │ (25+ Collections)│  │ (Google SSO)    │  │ (Files/Media)   │           │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | Vue 3 + Vite | 3.4 / 5.0 | Reactive UI with Composition API |
| **State Management** | Pinia | 2.x | 8 modular stores |
| **Routing** | Vue Router | 4.x | 45+ routes with guards |
| **Backend** | Firebase Functions | Node.js 20 | 41 serverless functions |
| **Database** | Cloud Firestore | - | 25+ collections, real-time sync |
| **AI Engine** | OpenAI API | GPT-4o-mini | Cost-effective LLM inference |
| **Authentication** | Firebase Auth | - | Google Sign-In, role-based |
| **Hosting** | Firebase Hosting | - | CDN-backed static hosting |
| **PWA** | Vite PWA | - | Installable, offline-ready |

---

## ✨ Key Features

### 🎓 Student Features (9 Core Modules)

| Route | Module | Description | Key Functions |
|-------|--------|-------------|---------------|
| `/chat` | 🚀 **Assessment Chat** | Real-time AI-powered HOTS assessment | Chat interface, scaffolding, immediate feedback |
| `/learning-rooms` | 🏫 **Learning Rooms** | Electronic worksheet completion | Room selection, worksheet access |
| `/my-progress` | 📈 **Progress Tracker** | LO progress visualization | LO cards, completion status |
| `/progress-analytics` | 📊 **Analytics** | Detailed performance charts | Radar charts, trend lines |
| `/adaptive-learning` | 🎯 **Adaptive Path** | Personalized AI learning paths | Weak area identification, recommendations |
| `/goal-setting` | 🎯 **Goal Setting** | Personal learning objectives | Goal CRUD, progress tracking |
| `/leaderboard` | 🏆 **Leaderboard** | Course-based competitive ranking | Points, badges, positions |
| `/progress-map` | 🗺️ **Progress Map** | Visual LO achievement map | Interactive LO visualization |
| `/profile` | 👤 **Profile** | User settings and preferences | Personal info, theme toggle |

### 👨‍🏫 Teacher Features (14+ Modules)

| Route | Module | Description | Key Functions |
|-------|--------|-------------|---------------|
| `/courses` | 📚 **Course Management** | Create courses with AI-generated LOs | CRUD, AI LO generation |
| `/questions` | 💡 **Question Bank** | HOTS questions with AI generation | Question CRUD, AI generation, solution generation |
| `/class-analytics` | 📊 **Class Analytics** | Performance overview + CSV export | Charts, student list, export |
| `/lo-reports` | 🎯 **LO Reports** | Heatmap of LO achievement | Visual heatmap, student breakdown |
| `/teacher-analytics` | 🔮 **AI Predictions** | At-risk student identification | Predictive models, alerts |
| `/realtime-monitor` | 📡 **Real-time Monitor** | Live student activity tracking | Activity feed, online status |
| `/lesson-plans` | 📝 **Lesson Plans** | 5E model + A.R.C.E. integration | 5E phases, AI generation |
| `/teacher/worksheets` | 📋 **Worksheets** | Electronic worksheet management | CRUD, section management |
| `/teacher/worksheet-reports` | 📊 **Worksheet Reports** | Submission analysis + LO tracking | Score distribution, LO column |
| `/micro-lessons` | 📖 **Micro Lessons** | Short supplementary content | Content management |
| `/student-detail/:id` | 👥 **Student Detail** | Individual assessment history | Full history, export |
| `/admin-lo-manager` | 🛠️ **Admin LO** | Manual LO editing capability | Quick add, edit LOs |
| `/knowledge-sheet/:id` | 📄 **Knowledge Sheets** | Pre-learning content preparation | View, generation |
| `/curriculum-designer` | 🎨 **Curriculum AI** | AI-assisted curriculum design | Unit generation |

### 🏛️ Administrator Features

| Route | Module | Description |
|-------|--------|-------------|
| `/national-dashboard` | 🇹🇭 **National Dashboard** | Ministry-level aggregated analytics |
| `/esa-dashboard` | 🏢 **ESA Dashboard** | Education Service Area analytics |
| `/school-management` | 🏫 **School Management** | School administration panel |
| `/research-export` | 📤 **Research Data** | Anonymized data export for research |

---

## 🚀 Recent Developments (Phase 4+)

### 🔬 Phase 2: AI Precision & Integrity

```javascript
// ═══════════════════════════════════════════════════════════════════════
// PHASE 2: AI CONFIGURATION FOR DETERMINISTIC SCORING
// ═══════════════════════════════════════════════════════════════════════

const assessmentConfig = {
  // Deterministic AI Settings
  temperature: 0,       // Zero randomness — same input yields same output
  seed: 42,            // Fixed seed for reproducibility across sessions
  
  // Chain of Thought (CoT) Reasoning Structure
  chainOfThought: {
    step1_summary: "สรุปประเด็นหลักของคำตอบนักเรียน",
    step2_evidence: {
      analysis: "หลักฐานการวิเคราะห์ที่พบ...",
      reasoning: "หลักฐานการให้เหตุผลที่พบ...",
      creativity: "หลักฐานความคิดสร้างสรรค์ที่พบ...",
      evidence: "หลักฐานการอ้างอิงที่พบ..."
    },
    step3_anchor_match: "หลักฐานตรงกับ Anchor ระดับ 4 เนื่องจาก...",
    step4_decision: "เหตุผลในการตัดสินใจให้คะแนนสุดท้าย"
  },
  
  // AI Confidence Reporting
  aiConfidence: 85,                          // 0-100%
  aiConfidenceReason: "คำตอบชัดเจน มีตัวอย่างเฉพาะเจาะจง ไม่มีความกำกวม",
  
  // Full Audit Trail for Reproducibility & Accountability
  auditTrail: {
    modelUsed: 'gpt-4o-mini',
    promptVersion: 'v3.0-cot-confidence',
    temperature: 0,
    seed: 42,
    maxTokens: 1500,
    rawResponseLength: 1234,
    parseAttempts: 1,
    timestamp: '2025-12-21T14:30:00.000Z'
  }
};
```

### 📋 Worksheet LO System

ระบบ Electronic Worksheet ประเมินและบันทึก Learning Outcomes คู่ขนานกับ Assessment Chat:

```
┌────────────────────────────────────────────────────────────────────────┐
│                    WORKSHEET LO SYSTEM FLOW                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  1. Teacher creates Lesson Plan with Learning Outcomes                 │
│                              ↓                                         │
│  2. generateElectronicWorksheet → stores LOs in metadata               │
│                              ↓                                         │
│  3. Student completes worksheet → assessWorksheetSubmission            │
│                              ↓                                         │
│  4. Function calls assessLearningOutcomesInternal (same logic as chat) │
│                              ↓                                         │
│  5. Save loAssessment to worksheetSubmissions collection               │
│                              ↓                                         │
│  6. Update studentProgress.passedLOs (merged from all sources)         │
│                              ↓                                         │
│  7. loProgress.js ensures consistent LO display across ALL views       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 🛠️ Additional Phase 4+ Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Admin LO Manager** | Teachers can manually adjust student LO progress | ✅ Complete |
| **5E Lesson Plan Builder** | Full integration with A.R.C.E. framework | ✅ Complete |
| **Learning Rooms** | Student-facing activity rooms for worksheet access | ✅ Complete |
| **Knowledge Sheets** | Unit-level pre-learning content generation | ✅ Complete |
| **Anti-Cheat System** | Copy-paste prevention + AI detection | ✅ Complete |
| **Research Data v3.0** | K-Anonymity, Sequential patterns, Time metrics | ✅ Complete |

---

## 🔧 Installation

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 18+ | LTS recommended |
| **Firebase CLI** | Latest | `npm install -g firebase-tools` |
| **OpenAI API Key** | - | GPT-4o-mini access required |
| **Firebase Project** | Blaze | Cloud Functions require paid plan |

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/saengpech-sys/hots-ai.git
cd hots-ai

# 2. Install dependencies
npm install                    # Frontend dependencies
cd functions && npm install    # Backend dependencies
cd ..

# 3. Configure environment
cp .env.example .env                        # Frontend config
cp functions/.env.example functions/.env    # Backend config

# 4. Edit environment files (see below)

# 5. Login to Firebase
firebase login
firebase use --add  # Select your project

# 6. Start development server
npm run dev  # Frontend at http://localhost:5173
```

### Environment Configuration

**Frontend (`.env`):**
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FUNCTIONS_URL=https://us-central1-your-project.cloudfunctions.net
```

**Backend (`functions/.env`):**
```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

### Deployment

```bash
# Full deployment (recommended for first deploy)
npm run build
firebase deploy

# Selective deployment
firebase deploy --only hosting           # Frontend only
firebase deploy --only functions         # Backend only
firebase deploy --only firestore:rules   # Security rules only
firebase deploy --only functions:assessAnswer  # Single function
```

---

## 📱 Usage Guide

### Assessment Chat Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      ASSESSMENT CHAT USER JOURNEY                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. 📝 Student types answer                                              │
│     • Copy-paste blocked (client-side + server-side detection)          │
│     • Minimum 20 characters required                                     │
│                              ↓                                           │
│  2. ✅ Confirmation dialog appears                                       │
│     • Answer preview                                                     │
│     • Character count statistics                                         │
│     • Tips for better answers                                            │
│                              ↓                                           │
│  3. 🚀 Submit → Cloud Function (assessAnswer)                           │
│                              ↓                                           │
│  4. 🤖 AI Assessment Processing                                         │
│     • A.R.C.E. scoring (0-5 per dimension)                              │
│     • Chain of Thought reasoning                                         │
│     • Confidence score calculation                                       │
│     • LO evaluation                                                      │
│                              ↓                                           │
│  5. 💾 Data Persistence                                                  │
│     • Save to assessments collection                                     │
│     • Update studentProgress                                             │
│     • Log to learningEvents (research data)                             │
│                              ↓                                           │
│  6. 📊 Real-time Feedback Display                                       │
│     • Radar chart visualization                                          │
│     • Dimension-specific feedback                                        │
│     • Scaffolding hints (if score < threshold)                          │
│     • Gamification rewards (points, badges)                             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Electronic Worksheet Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    ELECTRONIC WORKSHEET USER JOURNEY                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TEACHER WORKFLOW:                                                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  /lesson-plans → Create 5E Lesson Plan with LOs                    │ │
│  │       ↓                                                             │ │
│  │  "Generate Worksheet" → AI creates sections & questions            │ │
│  │       ↓                                                             │ │
│  │  /teacher/worksheets → Edit sections → Set scoring rubric          │ │
│  │       ↓                                                             │ │
│  │  Create Learning Room → Assign students → Publish                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              ↓                                           │
│  STUDENT WORKFLOW:                                                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  /learning-rooms → Select assigned room                            │ │
│  │       ↓                                                             │ │
│  │  /worksheet/:id → Complete sections one-by-one                     │ │
│  │       ↓                                                             │ │
│  │  Submit answers → AI Assessment (A.R.C.E. + LO)                    │ │
│  │       ↓                                                             │ │
│  │  /worksheet-result/:id → View results + LO progress section        │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🎮 Gamification System

### Points Economy (Self-Determination Theory-Based)

| Action | Base Points | Multiplier | Max | SDT Dimension |
|--------|-------------|------------|-----|---------------|
| Submit Assessment | 10-50 | Score-based | 50 | Competence |
| Perfect Score (20/20) | +50 | Bonus | 100 | Competence |
| Complete Worksheet | 10-100 | Score % | 100 | Competence |
| Daily Login | 5 | Streak × | 25 | Relatedness |
| Pass Learning Outcome | 20 | Per LO | - | Autonomy |
| Help Peer (future) | 10 | - | - | Relatedness |

### Progression System

| Level | XP Required | Title (Thai) | Title (English) |
|-------|-------------|--------------|-----------------|
| 1 | 0 | 🌱 ผู้เริ่มต้น | Beginner |
| 2 | 100 | 📚 นักเรียนรู้ | Learner |
| 3 | 300 | 🎯 นักคิด | Thinker |
| 4 | 600 | 🧠 นักวิเคราะห์ | Analyst |
| 5 | 1000 | ⭐ ผู้เชี่ยวชาญ | Expert |
| 6+ | 1500+ | 🏆 ปรมาจารย์ | Master |

### Badge Categories (20+)

| Category | Examples | Criteria |
|----------|----------|----------|
| **Skill Badges** | นักวิเคราะห์, นักให้เหตุผล, นักคิดสร้างสรรค์, นักใช้หลักฐาน | Dimension score ≥ 4 consistently |
| **LO Mastery** | ครบ LO, นักเก็บ LO, LO Master | Pass X LOs in course |
| **Streak Badges** | 🔥 3 วัน, 🔥 7 วัน, 🔥 30 วัน | Consecutive daily logins |
| **Achievement** | เพอร์เฟกต์, อัจฉริยะ | Perfect score, top of class |
| **Social** | Top Contributor, Helper | Future: peer help features |

---

## 🔒 Security & Privacy

### Multi-Layer Security Architecture

| Layer | Protection Mechanism | Implementation |
|-------|----------------------|----------------|
| **Client-Side** | Copy-paste prevention | `@paste.prevent`, `@copy.prevent`, `@contextmenu.prevent` |
| **Server-Side** | Input sanitization | Strip code blocks, XML tags, template expressions |
| **AI Layer** | Prompt injection defense | XML tag isolation, hard length limits (3000 chars) |
| **Database** | Role-based access control | Firestore security rules with helper functions |
| **Privacy** | PDPA compliance | No PII sent to AI, consent tracking, anonymized export |

### Prompt Injection Defense (Phase 2)

```javascript
// ═══════════════════════════════════════════════════════════════════════
// PROMPT INJECTION DEFENSE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════

// 1. Input Sanitization
const sanitizedAnswer = studentAnswer
  .replace(/```/g, "'''")                    // Escape code blocks
  .replace(/<\/?[a-zA-Z_][^>]*>/g, '')      // Remove XML-like tags
  .replace(/\{\{[^}]*\}\}/g, '')            // Remove template expressions
  .substring(0, 3000);                       // Hard length limit

// 2. XML Tag Isolation (Student input isolated from system instructions)
const prompt = `
<system_instruction>
  คุณเป็นครูผู้ประเมินคำตอบตาม A.R.C.E. Framework
  ประเมินอย่างเป็นกลาง ไม่ลำเอียง ใช้หลักฐานจากคำตอบเท่านั้น
</system_instruction>

<question_context>${questionContext}</question_context>

<student_answer>${sanitizedAnswer}</student_answer>

<output_format>JSON only, no markdown</output_format>
`;

// 3. Response Validation
function validateAIResponse(response) {
  const required = ['rubricScores', 'feedback', 'overallScore'];
  const hasRequired = required.every(field => field in response);
  const scoresValid = Object.values(response.rubricScores)
    .every(score => score >= 0 && score <= 5);
  return hasRequired && scoresValid;
}
```

### PDPA Compliance Checklist

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **Consent** | ConsentModal on first login | ✅ |
| **Data Minimization** | No PII sent to OpenAI (only grade level, subject) | ✅ |
| **Right to Access** | User can view all personal data | ✅ |
| **Right to Erasure** | User can request data deletion | ✅ |
| **Anonymization** | Research export uses sequential IDs | ✅ |
| **Retention Policy** | Configurable per IRB requirements | ✅ |

---

## 🔬 Research Capabilities

### Research Data Schema v3.1

```javascript
// ═══════════════════════════════════════════════════════════════════════
// RESEARCH DATA SCHEMA v3.1 — Flat Structure for SPSS/Stata/Python
// ═══════════════════════════════════════════════════════════════════════

const learningEvent = {
  // Identifiers (Flat — no nesting)
  studentId: "uid123",            // Anonymized sequential ID in export
  courseId: "course456",
  eventType: "CHAT_ASSESSMENT",   // Enum: CHAT_ASSESSMENT, WORKSHEET_SUBMISSION, etc.
  timestamp: "2025-12-21T10:30:00.000Z",
  
  // A.R.C.E. Scores (Direct columns for SPSS)
  score_analysis: 4,
  score_reasoning: 3,
  score_creativity: 5,
  score_evidence: 4,
  score_average: 4.0,
  score_total: 16,
  score_max: 20,
  
  // LO Data
  lo_passed_count: 2,
  lo_passed_ids: "LO1,LO2",       // Comma-separated for CSV compatibility
  
  // v3.0: Time on Task Metrics
  timeOnTask_seconds: 180,        // Total time on question
  thinkingTime_seconds: 45,       // Time before first keystroke
  typingTime_seconds: 120,        // Active typing time
  
  // v3.0: Scaffolding Metrics
  scaffolding_hintRequests: 2,
  scaffolding_probingQuestions: 1,
  scaffolding_levelReceived: 'explicit',  // none | implicit | explicit
  
  // v3.0: Context Variables (for regression control)
  context_deviceType: 'mobile',
  context_questionPosition: 3,
  context_hourOfDay: 14,
  context_dayOfWeek: 3,
  
  // Integrity
  copyPasteDetected: false,
  aiGeneratedSuspected: false,
  
  schemaVersion: '3.1'
};
```

### Research API Endpoints

| API | Purpose | Output |
|-----|---------|--------|
| `exportResearchData` | Export anonymized data | CSV/JSON |
| `researchSummary` | Descriptive statistics | JSON with M, SD, n |
| `correlationAnalysis` | Inter-mode correlation | Pearson r matrix |
| `calculateIRR` | Inter-Rater Reliability | Cohen's κ, ICC |
| `calculateEffectSize` | Effect size calculation | Cohen's d, r |
| `exportKAnonymousDataAPI` | K-Anonymity protected export | CSV with generalized quasi-identifiers |
| `assessReidentificationRiskAPI` | Re-identification risk assessment | Risk report |
| `researchReadinessV2` | Power analysis + readiness score | Recommendations |
| `getLearningSequences` | Sequential pattern data | Pattern analysis |

### Statistical Analysis Support

```python
# Example: Scaffolding Effect Analysis
import pandas as pd
from scipy import stats

df = pd.read_csv('research_data.csv')

# Group by scaffolding level
none = df[df['scaffolding_levelReceived'] == 'none']
implicit = df[df['scaffolding_levelReceived'] == 'implicit']
explicit = df[df['scaffolding_levelReceived'] == 'explicit']

# One-way ANOVA
f_stat, p_val = stats.f_oneway(
    none['score_average'],
    implicit['score_average'],
    explicit['score_average']
)
print(f"F = {f_stat:.3f}, p = {p_val:.4f}")

# Cohen's d for pairwise comparison
def cohens_d(g1, g2):
    n1, n2 = len(g1), len(g2)
    pooled_std = ((g1.var() * (n1-1) + g2.var() * (n2-1)) / (n1+n2-2)) ** 0.5
    return (g1.mean() - g2.mean()) / pooled_std

d = cohens_d(explicit['score_average'], none['score_average'])
print(f"Effect size (explicit vs none): d = {d:.3f}")
```

📖 **Full Research Documentation**: [RESEARCH_DATA_PIPELINE.md](./RESEARCH_DATA_PIPELINE.md)

---

## 🧪 Testing

### Test Commands

```bash
# Frontend Tests (Vitest) — 75 test cases
npm test                 # Run all tests
npm run test:ui          # Interactive UI mode
npm run coverage         # Generate coverage report

# Backend Tests (Jest) — 48 test cases
cd functions && npm test # Run all backend tests
```

### Test Coverage Summary

| Category | Test File | Tests | Focus Areas |
|----------|-----------|-------|-------------|
| **Frontend** | | **75** | |
| | auth.test.js | 17 | Pinia auth store, role checking |
| | gamification.test.js | 26 | Levels, badges, streaks, points |
| | errorHandler.test.js | 18 | Thai error messages, graceful degradation |
| | loProgress.test.js | 14 | LO counting consistency |
| **Backend** | | **48** | |
| | prompts.test.js | 10 | AI prompt template generation |
| | loAssessment.test.js | 10 | LO evaluation logic |
| | aiParser.test.js | 18 | JSON response cleaning |
| | rateLimiter.test.js | 10 | Rate limiting logic |
| **Total** | | **123** | |

---

## 📚 Documentation

| Document | Description | Target Audience |
|----------|-------------|-----------------|
| [DOCS.md](./DOCS.md) | Complete Technical Documentation | Developers |
| [RESEARCH_DATA_PIPELINE.md](./RESEARCH_DATA_PIPELINE.md) | Research Data Export Guide | Researchers |
| [DPA_ASSESSMENT_CHECKLIST.md](./DPA_ASSESSMENT_CHECKLIST.md) | DPA Competition Evaluation | Evaluators |
| [GOLDEN_DATASET_IRR.md](./GOLDEN_DATASET_IRR.md) | IRR Testing Dataset | Researchers |
| [CODE_AUDIT_REPORT.md](./CODE_AUDIT_REPORT.md) | Function Integration Status | Developers |
| [.github/copilot-instructions.md](./.github/copilot-instructions.md) | AI Agent Instructions | AI Assistants |

---

## 📈 Project Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| **Vue Components** | 80+ | Including 45+ full views |
| **Cloud Functions** | 41 | HTTP + Scheduled + Triggers |
| **Backend Code Lines** | 9,200+ | Modular architecture |
| **Firestore Collections** | 25+ | Normalized schema |
| **Test Cases** | 123 | 48 backend + 75 frontend |
| **Routes** | 45+ | Role-based access control |
| **Supported Grades** | ม.1 - ม.6 | Thai secondary education |
| **DPA Assessment Score** | **11/11** ✅ | All criteria passed |

---

## 🏆 DPA Competition Compliance

ระบบผ่านการประเมินตามเกณฑ์ **Digital Platform Award** ทั้ง 4 มิติ:

| Dimension | Assessment Criteria | Result |
|-----------|---------------------|--------|
| **1. Pedagogical Intelligence** | AI Scaffolding, A.R.C.E. Alignment, HOTS Verification | ✅ 3/3 |
| **2. Technical Robustness** | Prompt Security, Error Handling, Data Integrity | ✅ 3/3 |
| **3. Measurement & Evidence** | Rubric Consistency, Learning Analytics, Traceability | ✅ 3/3 |
| **4. Scalability & Privacy** | Universal Design, PDPA Compliance | ✅ 2/2 |

**ผลรวม: 11/11 ผ่านทุกข้อ** ✅

📖 **รายละเอียดการประเมิน**: [DPA_ASSESSMENT_CHECKLIST.md](./DPA_ASSESSMENT_CHECKLIST.md)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 📞 Contact & Links

| Resource | Link |
|----------|------|
| **Repository** | [github.com/saengpech-sys/hots-ai](https://github.com/saengpech-sys/hots-ai) |
| **Live Demo** | [hots-ai-d028b.web.app](https://hots-ai-d028b.web.app) |
| **Issues** | [GitHub Issues](https://github.com/saengpech-sys/hots-ai/issues) |
| **Firebase Console** | [console.firebase.google.com](https://console.firebase.google.com/project/hots-ai-d028b) |

---

<div align="center">

**Built with ❤️ for Thai Education**

*Advancing Higher-Order Thinking Skills Assessment through AI*

---

**Last Updated:** December 21, 2025 | **Version:** 5.1.0

**© 2025 HOTS AI ChatLoop Project**

</div>
