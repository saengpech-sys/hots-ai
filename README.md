# HOTS AI ChatLoop 🎓🤖

> **AI-Powered Educational Ecosystem for Higher-Order Thinking Skills Assessment**
> *ระบบประเมินทักษะการคิดขั้นสูง (HOTS) ด้วย AI สำหรับการศึกษาไทย*

🌐 **Live Demo**: https://hots-ai-d028b.web.app  
📊 **System Status**: Phase 4+ Complete (Production Ready)  
📅 **Last Updated**: December 20, 2025  
🧪 **Test Coverage**: 123 tests (Backend: 48, Frontend: 75)

---

## 📋 สารบัญ

- [🌟 ภาพรวมระบบ](#-ภาพรวมระบบ)
- [✨ คุณสมบัติหลัก](#-คุณสมบัติหลัก)
- [🏗️ สถาปัตยกรรม](#️-สถาปัตยกรรม)
- [🚀 การติดตั้ง](#-การติดตั้ง)
- [📱 การใช้งาน](#-การใช้งาน)
- [🔬 A.R.C.E. Framework](#-arce-framework)
- [📊 Gamification System](#-gamification-system)
- [🔒 ความปลอดภัย](#-ความปลอดภัย)
- [🧪 Testing](#-testing)
- [📚 เอกสารเพิ่มเติม](#-เอกสารเพิ่มเติม)

---

## 🌟 ภาพรวมระบบ

HOTS AI ChatLoop เป็น **ระบบนิเวศการศึกษาแบบครบวงจร** ที่ใช้ AI ประเมินทักษะการคิดขั้นสูง (Higher-Order Thinking Skills) ตาม **A.R.C.E. Framework**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    🏛️ NATIONAL ECOSYSTEM                       │
│    Ministry Dashboard → ESA Analytics → School Management       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   👨‍🏫 TEACHER                           🎓 STUDENT              │
│   ┌─────────────────┐                 ┌─────────────────┐       │
│   │ • Course Mgmt   │                 │ • AI Assessment │       │
│   │ • Question Bank │    Assigns      │ • Worksheets    │       │
│   │ • Lesson Plans  │───────────────▶│ • Learning Path │       │
│   │ • Worksheets    │                 │ • Gamification  │       │
│   │ • Analytics     │◀───────────────│ • Portfolio     │       │
│   └─────────────────┘    Reports      └─────────────────┘       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    ⚙️ AI ENGINE (GPT-4o-mini)                   │
│   Assessment • LO Generation • Lesson Plans • Worksheets        │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ คุณสมบัติหลัก

### 🎓 สำหรับนักเรียน (9 เมนูหลัก)

| Route | Feature | Description |
|-------|---------|-------------|
| `/chat` | 🚀 Assessment Chat | ประเมิน HOTS แบบ real-time ด้วย AI |
| `/learning-rooms` | 🏫 ห้องกิจกรรม | ทำใบงานอิเล็กทรอนิกส์ |
| `/my-progress` | 📈 ความคืบหน้า | ติดตาม LO และพัฒนาการ |
| `/progress-analytics` | 📊 Analytics | กราฟและสถิติละเอียด |
| `/adaptive-learning` | 🎯 Adaptive Path | เส้นทางเรียนรู้ส่วนตัว AI |
| `/goal-setting` | 🎯 Goals | ตั้งเป้าหมายการเรียนรู้ |
| `/leaderboard` | 🏆 Leaderboard | อันดับและการแข่งขัน |
| `/progress-map` | 🗺️ Progress Map | แผนที่ LO แบบ Visual |
| `/profile` | 👤 Profile | ข้อมูลส่วนตัวและ Settings |

### 👨‍🏫 สำหรับครู (14+ เมนูหลัก)

| Route | Feature | Description |
|-------|---------|-------------|
| `/courses` | 📚 รายวิชา | จัดการรายวิชาและ LO |
| `/questions` | 💡 คลังคำถาม | Question Bank + AI Generation |
| `/lesson-plans` | 📝 แผนการสอน | 5E Lesson Plans + A.R.C.E. |
| `/teacher/worksheets` | 📋 ใบงาน | สร้างและจัดการใบงาน |
| `/teacher/worksheet-reports` | 📊 รายงานใบงาน | วิเคราะห์ผลใบงาน |
| `/class-analytics` | 📊 วิเคราะห์ห้อง | ภาพรวมและ Export |
| `/lo-reports` | 🎯 รายงาน LO | Heatmap ความสำเร็จ LO |
| `/teacher-analytics` | 🔮 AI Predictions | พยากรณ์นักเรียนเสี่ยง |
| `/realtime-monitor` | 📡 Real-time | ติดตามกิจกรรมสด |
| `/micro-lessons` | 📖 Micro Lessons | บทเรียนสั้นเสริม |
| `/student-detail/:id` | 👥 รายละเอียดนักเรียน | ประวัติและ Analytics |
| `/curriculum-designer` | 🎨 Curriculum AI | ออกแบบหลักสูตรด้วย AI |

### 🏛️ สำหรับผู้บริหาร

| Route | Feature | Description |
|-------|---------|-------------|
| `/national-dashboard` | 🇹🇭 National | Dashboard ระดับกระทรวง |
| `/esa-dashboard` | 🏢 ESA | Dashboard สพท. |
| `/school-management` | 🏫 School | จัดการโรงเรียน |
| `/research-export` | 📤 Research Data | Export ข้อมูลวิจัย |

---

## 🏗️ สถาปัตยกรรม

### Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                               │
│  Vue 3.4 + Vite 5 + Pinia + Vue Router 4 + Vitest          │
│  80+ Vue Components | Dark Mode | PWA Support               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND                                │
│  Firebase Cloud Functions (Node.js 20)                      │
│  41 HTTP Functions | 9,200+ lines | Modular Architecture    │
├─────────────────────────────────────────────────────────────┤
│  📦 Modules:                                                │
│  • utils/prompts.js       - AI Prompt Engineering           │
│  • utils/loAssessment.js  - LO Assessment Logic             │
│  • utils/aiParser.js      - JSON Response Cleaning          │
│  • utils/reliability.js   - Schema Validation               │
│  • utils/aiDetection.js   - AI-Generated Content Detection  │
│  • utils/rateLimiter.js   - Rate Limiting                   │
│  • services/assessmentService.js - Assessment Core          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE                               │
│  Cloud Firestore (25+ Collections)                          │
├─────────────────────────────────────────────────────────────┤
│  Core: users, courses, questions, sessions, messages        │
│  Assessment: assessments, studentProgress, worksheetSubmissions │
│  Content: lessonPlans, eWorksheets, learningRooms          │
│  Gamification: badges, leaderboard, streaks                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI ENGINE                              │
│  OpenAI GPT-4o-mini (15-20x cheaper than GPT-4o)           │
│  Phase 2: temperature=0, seed=42, Chain of Thought         │
└─────────────────────────────────────────────────────────────┘
```

### Key Cloud Functions (41 Functions)

| Category | Functions | Description |
|----------|-----------|-------------|
| **Assessment** | `assessAnswer`, `assessWorksheetSubmission` | AI HOTS Assessment |
| **Generation** | `generateLearningOutcomes`, `generateHOTSQuestion`, `generateSolution` | AI Content Generation |
| **Lesson Plans** | `generateLessonPlan`, `generateCourseStructure`, `generateLearningUnit` | 5E + A.R.C.E. |
| **Worksheets** | `generateElectronicWorksheet`, `generateWorksheet`, `getWorksheetReports` | E-Worksheet System |
| **Knowledge** | `generateKnowledgeSheet`, `generateUnitKnowledgeSheet`, `generateBatchKnowledgeSheets` | Pre-learning Content |
| **Gamification** | `getLeaderboard`, `getBadgeDefinitions`, `claimDailyReward` | Points & Badges |
| **Analytics** | `generateClassAnalytics`, `generateDailyReport` | Reports |
| **Adaptive** | `generateAdaptivePath`, `analyzeTalentTracks` | Personalization |
| **Research** | `calculateIRR`, `irrReport`, `calculateEffectSize`, `correlationAnalysis`, `exportResearchData` | Research Data |
| **Reliability** | `reliabilityReport`, `recalculateStudentProgress`, `dailyConsistencyCheck` | Data Quality |
| **AI Detection** | `analyzeAIContent`, `getFlaggedAssessments`, `aiDetectionStats` | Anti-Cheat |

---

## 🚀 การติดตั้ง

### Prerequisites

- Node.js 18+ 
- Firebase CLI (`npm install -g firebase-tools`)
- OpenAI API Key

### 1. Clone & Install

```bash
git clone https://github.com/saengpech-sys/hots-ai.git
cd hots-ai

# Frontend
npm install

# Backend
cd functions && npm install && cd ..
```

### 2. Environment Setup

**Frontend (.env)**
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FUNCTIONS_URL=https://us-central1-your-project.cloudfunctions.net
```

**Backend (functions/.env)**
```env
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
```

### 3. Run Development

```bash
# Frontend (port 5173)
npm run dev

# Functions emulator (optional)
cd functions && npm run serve
```

### 4. Deploy

```bash
# Build & Deploy all
npm run build
firebase deploy

# Deploy specific
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
```

---

## 📱 การใช้งาน

### Flow หลัก: Assessment Chat

```
1. นักเรียนพิมพ์คำตอบ (ป้องกัน copy-paste)
2. Confirmation Dialog: ตรวจสอบ ≥20 ตัวอักษร
3. ส่งไป Cloud Function → OpenAI
4. AI ประเมินตาม A.R.C.E. Framework (0-5 คะแนนต่อมิติ)
5. Chain of Thought reasoning + Confidence Score
6. บันทึก assessment + อัพเดท studentProgress
7. แสดงผลและให้ feedback ทันที
```

### Flow หลัก: Electronic Worksheet

```
1. ครูสร้าง Lesson Plan (5E Model)
2. AI สร้าง Worksheet จาก Lesson Plan
3. ครูเปิด Learning Room → assign นักเรียน
4. นักเรียนทำใบงาน → ส่งคำตอบ
5. AI ประเมินแต่ละข้อ + LO Assessment
6. อัพเดท passedLOs ในทุก view ให้ consistent
```

---

## 🔬 A.R.C.E. Framework

### 4 มิติการประเมิน

| Dimension | Icon | Description | Thai |
|-----------|------|-------------|------|
| **A**nalysis | 🔍 | การวิเคราะห์ แยกแยะ เปรียบเทียบ | วิเคราะห์ |
| **R**easoning | 🧠 | การให้เหตุผล อ้างหลักการ | เหตุผล |
| **C**reativity | 💡 | ความคิดสร้างสรรค์ มุมมองใหม่ | สร้างสรรค์ |
| **E**vidence | 📚 | การใช้หลักฐาน ข้อมูลสนับสนุน | หลักฐาน |

### Rubric Scoring (0-5)

| Score | Level | Description |
|-------|-------|-------------|
| 5 | Excellent | แสดงทักษะอย่างโดดเด่น มีความลึกซึ้ง |
| 4 | Good | แสดงทักษะได้ดี มีรายละเอียดเพียงพอ |
| 3 | Satisfactory | แสดงทักษะพื้นฐานได้ |
| 2 | Developing | เริ่มแสดงทักษะแต่ยังไม่ชัดเจน |
| 1 | Beginning | มีร่องรอยทักษะเล็กน้อย |
| 0 | Not Evident | ไม่พบหลักฐานทักษะ |

### LO Passing Criteria

LO ถือว่า "ผ่าน" เมื่อครบ 3 เงื่อนไข:
1. ✅ เนื้อหาตรงกับจุดประสงค์ของ LO
2. ✅ แสดงระดับทักษะที่คาดหวัง
3. ✅ คะแนน HOTS dimension ที่เกี่ยวข้อง ≥ 3/5

---

## 📊 Gamification System

### Points System

| Action | Points | Bonus |
|--------|--------|-------|
| Submit Assessment | 10-50 | ตามคะแนน HOTS |
| Perfect Score (20/20) | +50 | 🎯 Perfect Bonus |
| Complete Worksheet | 10-100 | ตามคะแนนรวม |
| Daily Login | 5 | Streak Multiplier |
| Pass LO | 20 | per LO |

### Levels

| Level | XP Required | Title |
|-------|-------------|-------|
| 1 | 0 | 🌱 ผู้เริ่มต้น |
| 2 | 100 | 📚 นักเรียนรู้ |
| 3 | 300 | 🎯 นักคิด |
| 4 | 600 | 🧠 นักวิเคราะห์ |
| 5+ | 1000+ | ⭐ ผู้เชี่ยวชาญ |

### Badges (20+)

- **Skill Badges**: นักวิเคราะห์, นักให้เหตุผล, นักคิดสร้างสรรค์, นักใช้หลักฐาน
- **LO Badges**: ครบ LO, นักเก็บ LO, LO Master
- **Streak Badges**: 🔥 3 วัน, 7 วัน, 30 วัน
- **Special**: เพอร์เฟกต์, อัจฉริยะ, Top Contributor

---

## 🔒 ความปลอดภัย

### Client-Side Protection

```vue
<!-- Copy-paste prevention -->
@paste.prevent @copy.prevent @cut.prevent @contextmenu.prevent
```

### Server-Side Detection

- Unusual spacing patterns
- Very long words (>25 chars)
- Mixed script detection
- AI-generated content analysis

### Firestore Rules

```javascript
// Role-based access
function isTeacher() {
  return get(/databases/.../users/$(request.auth.uid)).data.role == 'teacher';
}

// School isolation
function isSameSchool(schoolId) {
  return request.auth.token.schoolId == schoolId;
}
```

### Phase 2 AI Enhancements

- `temperature: 0` - Deterministic scoring
- `seed: 42` - Reproducibility
- Chain of Thought reasoning
- AI Confidence Score (0-100%)
- Grade-Level Calibration
- Prompt Injection Defense

---

## 🧪 Testing

### Run Tests

```bash
# Frontend tests (Vitest)
npm test

# Backend tests (Jest)
cd functions && npm test

# All tests
npm test && cd functions && npm test
```

### Test Coverage

| Category | Tests | Framework |
|----------|-------|-----------|
| **Frontend** | 75 | Vitest |
| - auth.test.js | 17 | Pinia store tests |
| - gamification.test.js | 26 | Level, badges, streaks |
| - errorHandler.test.js | 18 | Thai error messages |
| - loProgress.test.js | 14 | LO counting |
| **Backend** | 48 | Jest |
| - prompts.test.js | 10 | AI prompts |
| - loAssessment.test.js | 10 | LO assessment |
| - aiParser.test.js | 18 | JSON cleaning |
| - rateLimiter.test.js | 10 | Rate limiting |
| **Total** | **123** | |

---

## 📚 เอกสารเพิ่มเติม

| Document | Description |
|----------|-------------|
| [DOCS.md](./DOCS.md) | Technical Documentation |
| [.github/copilot-instructions.md](./.github/copilot-instructions.md) | AI Coding Agent Instructions |
| [RESEARCH_DATA_PIPELINE.md](./RESEARCH_DATA_PIPELINE.md) | Research Data Export Guide |
| [firestore.rules](./firestore.rules) | Security Rules |
| [firestore.indexes.json](./firestore.indexes.json) | Database Indexes |

---

## 🔧 Development Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview build

# Testing
npm test             # Run frontend tests
npm run test:watch   # Watch mode

# Firebase
firebase deploy                    # Deploy all
firebase deploy --only hosting     # Deploy frontend
firebase deploy --only functions   # Deploy backend
firebase emulators:start           # Local emulators

# Functions
cd functions
npm run serve        # Local function server
npm run deploy       # Deploy functions only
npm test             # Run function tests
```

---

## 📈 Project Stats

| Metric | Value |
|--------|-------|
| **Vue Components** | 80+ |
| **Cloud Functions** | 41 |
| **Backend Code** | 9,200+ lines |
| **Firestore Collections** | 25+ |
| **Test Cases** | 123 |
| **Supported Grades** | ม.1 - ม.6 |

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**Developed by Saengpech-Sys Team**

---

*🇹🇭 พัฒนาเพื่อการศึกษาไทย | Built for Thai Education*
