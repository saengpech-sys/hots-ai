# HOTS AI ChatLoop 🎓🤖

> **AI-Powered Educational Ecosystem for Higher-Order Thinking Skills Assessment**
> *Empowering Students, Enabling Teachers, Informing Policy.*

🌐 **Live Demo**: https://hots-ai-chatloop.web.app  
📊 **System Status**: Phase 4 Complete (Electronic Worksheets & Lesson Plans)
📅 **Last Updated**: December 2025

---

## 🌟 The HOTS AI Ecosystem

HOTS AI ChatLoop is not just a chatbot; it is a comprehensive educational ecosystem designed to foster critical thinking at a national scale.

### 1. 🎓 Student Ecosystem (Learning & Growth)
*Personalized learning journey driven by AI.*
- **AI Assessment Chatbot**: Real-time evaluation of Analysis, Reasoning, Creativity, and Evidence skills.
- **Adaptive Learning Path**: AI-curated micro-lessons based on individual weaknesses.
- **Gamification Engine**: 20+ Badges, XP System, Leaderboards, and Streak tracking to boost engagement.
- **Talent Portfolio**: Automatic identification of "Innovation" and "Research" talent tracks.

### 2. 👨‍🏫 Teacher Ecosystem (Insight & Productivity)
*AI assistant for classroom management and content creation.*
- **Class Analytics Dashboard**: Real-time monitoring of student performance and HOTS growth.
- **AI Content Generator**: Create Learning Outcomes, Questions, and Solutions in seconds using GPT-4o.
- **Teacher Portfolio**: Track professional impact, student success rates, and earn teaching badges.
- **Predictive Analytics**: Identify at-risk students before they fall behind.

### 3. 🏛️ National Ecosystem (Policy & Monitoring)
*Data-driven decision making for ESAs and Ministry.*
- **National Dashboard**: Real-time aggregation of educational KPIs across 225+ districts.
- **ESA Analytics**: Monitor inequality gaps, curriculum coverage, and school performance.
- **Standardized Curriculum**: Centralized management of Learning Outcomes (Core Curriculum 2551/2560).

### 4. ⚙️ Technical Ecosystem (Scalability & Intelligence)
*Built for scale, security, and speed.*
- **Core**: Vue 3 + Vite (Frontend), Firebase (Backend/Serverless).
- **AI Engine**: OpenAI GPT-4o-mini with structured prompt engineering.
- **Data**: Firestore (NoSQL) + BigQuery (Data Warehouse roadmap).
- **Security**: Role-based access control (RBAC) for Student/Teacher/ESA/Ministry.

---

## 🚀 Key Features by Phase

### Phase 1: Foundation & Personalization ✅
- Real-time HOTS Assessment (4 Dimensions)
- Adaptive Learning Paths
- Micro-Lesson Library

### Phase 2: Gamification & Engagement ✅
- Badge System & Leaderboards
- Daily Rewards & Streaks
- Interactive Notifications

### Phase 3: Advanced Analytics & Talent ✅
- **Talent Track System**: Auto-detects specialized skills (Innovator/Researcher).
- **Teacher Portfolio**: Professional achievements for educators.
- **Real-time Class Monitor**: Live classroom activity tracking.
- **National Scale Architecture**: Hierarchy support (Ministry -> ESA -> School).

---

## 📚 Documentation

**📖 [DOCS.md](./DOCS.md)** - Complete technical documentation including:
- System Architecture & Database Schema
- Navigation Guide (Student & Teacher routes)
- User Manual (Thai)
- Deployment Guide
- Testing Checklist
- Security & Anti-Cheat Systems

---

## 🛠️ Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- Firebase CLI
- OpenAI API Key

### Installation

1. **Clone & Install**
   ```bash
   git clone https://github.com/your-repo/hots-ai.git
   cd hots-ai
   npm install
   cd functions && npm install && cd ..
   ```

2. **Environment Setup**
   - Create `.env` in root (see `.env.example`)
   - Create `functions/.env` (see `functions/.env.example`)

3. **Run Locally**
   ```bash
   # Terminal 1: Frontend
   npm run dev

   # Terminal 2: Firebase Emulators (Optional)
   firebase emulators:start
   ```

---

## 🔒 Security & Privacy
- **Copy-Paste Protection**: Prevents academic dishonesty during assessments.
- **Role-Based Access**: Strict data isolation between schools and districts.
- **Data Privacy**: Compliant with PDPA standards (planned).

---

*Developed by Saengpech-Sys Team*

- **Skill Badges**: นักวิเคราะห์, นักให้เหตุผล, นักคิดสร้างสรรค์, นักใช้หลักฐาน
- **LO Badges**: ครบ LO ทั้งหมด, นักเก็บ LO
- **Special Badges**: เพอร์เฟกต์, อัจฉริยะ

#### Points System
- 10-100+ แต้มต่อการประเมิน (ขึ้นกับคะแนน HOTS)
- โบนัสสำหรับ perfect score
- โบนัสจาก streak และ LO mastery

#### Leaderboard
- แข่งขันแบบ course-specific หรือ global
- คะแนนรวมจาก: points + badges + streaks + LOs
- แสดง Top performers และอันดับส่วนตัว

---

## เอกสารประกอบ

| เอกสาร | คำอธิบาย | ลิงก์ |
|--------|----------|------|
| 📖 **คู่มือการใช้งาน** | วิธีใช้งานระบบสำหรับนักเรียนและครู (ฉบับสมบูรณ์) | [USAGE.md](./USAGE.md) |
| 🗺️ **Navigation Guide** | แผนที่การเข้าถึง Features ทั้งหมด (8+9 เมนู) | [NAVIGATION_GUIDE.md](./NAVIGATION_GUIDE.md) |
| 🏗️ **Architecture** | สถาปัตยกรรมระบบและโครงสร้างโค้ด | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| 🚀 **Deployment** | คู่มือการ Deploy และ Production Setup | [DEPLOYMENT.md](./DEPLOYMENT.md) |
| 🧪 **Testing** | คู่มือการทดสอบระบบ | [TESTING.md](./TESTING.md) |
| ⚡ **Quick Start** | เริ่มต้นใช้งานด่วน (สำหรับ Dev) | [QUICKSTART.md](./QUICKSTART.md) |
| 🔥 **Firestore Indexes** | การตั้งค่า Indexes | [FIRESTORE_INDEXES_SETUP.md](./FIRESTORE_INDEXES_SETUP.md) |

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Vue 3.4 (Composition API)
- **Build Tool**: Vite 5
- **State Management**: Pinia
- **Router**: Vue Router 4
- **Styling**: Custom CSS + Dark Mode

### Backend
- **Auth**: Firebase Authentication (Google Sign-In)
- **Database**: Cloud Firestore (21 collections)
- **Functions**: Cloud Functions (Node.js 20) - 25+ functions
- **AI**: OpenAI GPT-4o-mini (cost-effective)
- **Hosting**: Firebase Hosting

### Development
- **Package Manager**: npm
- **Version Control**: Git + GitHub
- **CI/CD**: Firebase CLI

---

## 🌐 Production URLs

**Live Application**: https://hots-ai-chatloop.web.app  
**Cloud Functions**: https://us-central1-hots-ai-chatloop.cloudfunctions.net  
**Firebase Console**: https://console.firebase.google.com/project/hots-ai-chatloop

## 📋 Prerequisites

- Node.js 18+
- Firebase CLI
- Firebase Project
- OpenAI API Key

## 🚀 Installation

### 1. Clone Repository

\`\`\`bash
git clone https://github.com/your-username/HOTS-AI-CHATLOOP.git
cd HOTS-AI-CHATLOOP
\`\`\`

### 2. Install Dependencies

\`\`\`bash
# Install frontend dependencies
npm install

# Install functions dependencies
cd functions
npm install
cd ..
\`\`\`

### 3. Setup Firebase

\`\`\`bash
# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init

# Select:
# - Firestore
# - Functions
# - Hosting
\`\`\`

### 4. Configure Environment Variables

#### Frontend (.env)

\`\`\`bash
cp .env.example .env
\`\`\`

แก้ไข `.env` ด้วยข้อมูล Firebase ของคุณ:

\`\`\`env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FUNCTIONS_URL=https://your-region-your-project.cloudfunctions.net
\`\`\`

#### Cloud Functions (functions/.env)

\`\`\`bash
cd functions
cp .env.example .env
\`\`\`

แก้ไข `functions/.env`:

\`\`\`env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
\`\`\`

**หมายเหตุ**: สำหรับ production ควรใช้ Firebase Secrets:

\`\`\`bash
firebase functions:secrets:set OPENAI_API_KEY
\`\`\`

### 5. Setup Firestore Security Rules & Indexes

Deploy Firestore rules และ indexes:

\`\`\`bash
firebase deploy --only firestore
\`\`\`

### 6. Deploy Cloud Functions

\`\`\`bash
firebase deploy --only functions
\`\`\`

**Functions ที่จะถูก deploy:**
- `assessAnswer` - AI assessment พร้อม gamification + historical comparison
- `generateLearningOutcomes` - Generate LOs จาก course info
- `generateHOTSQuestion` - Generate HOTS questions
- `generateSolution` - Generate model answers
- `generateClassAnalytics` - Class analytics dashboard
- `getLeaderboard` - Student leaderboard
- `getBadgeDefinitions` - Badge system metadata
- `claimDailyReward` - Daily login rewards
- `generateDailyReport` - Automated reports
- **Phase 1 Functions:**
  - `generateAdaptivePath` - Create personalized learning paths
  - `updateAdaptivePath` - Track path progress with loop-back
  - `generateMicroLesson` - AI-powered micro-lesson generation
- **Phase 3 Functions:**
  - `predictStudentRisk` - Calculate student failure risk (0-100)
  - `analyzeSkillGaps` - Compare student vs class performance
  - `generateInterventions` - AI intervention recommendations
  - `generateParentReport` - Comprehensive parent progress reports

หลังจาก deploy จดลิ้งค์ function URL และใส่ใน `.env` ที่ `VITE_FUNCTIONS_URL`

## 🏃‍♂️ Development

### Run Development Server

\`\`\`bash
npm run dev
\`\`\`

เปิดเบราว์เซอร์ที่ `http://localhost:3000`

### Run Functions Emulator (Optional)

\`\`\`bash
cd functions
npm run serve
\`\`\`

## 📦 Build for Production

\`\`\`bash
npm run build
\`\`\`

## 🚢 Deploy to Firebase Hosting

\`\`\`bash
# Build first
npm run build

# Deploy
firebase deploy --only hosting
\`\`\`

## 📱 Usage

### สำหรับนักเรียน

1. **Login** ด้วย Google Account
2. **กรอกข้อมูลโปรไฟล์** (รหัสนักเรียน, ชั้น, ห้อง, เลขที่, ตอน)
3. **เริ่ม Chat** กับ AI
4. **พิมพ์คำตอบ** (ไม่สามารถ copy-paste ได้)
5. **รับ Feedback** พร้อมคะแนนทันที
6. **ดูประวัติ** ในหน้า Dashboard

### สำหรับครู

1. **Login** ด้วย Google Account (ต้องมีการกำหนด role เป็น teacher ใน Firestore)
2. **ดู Dashboard** ข้อมูลนักเรียนทั้งหมด
3. **กรองข้อมูล** ตามชั้น, ห้อง, ตอน
4. **ส่งออกรายงาน** เป็นไฟล์ CSV
5. **คลิกดูรายละเอียด** ของนักเรียนแต่ละคน

## 🔐 Security Features

### Client-Side Protection
- ป้องกัน copy (Ctrl+C)
- ป้องกัน paste (Ctrl+V)
- ป้องกัน cut (Ctrl+X)
- ป้องกัน context menu (right-click)
- User selection disabled

### Server-Side Validation
- ตรวจสอบ pattern copy-paste
- ตรวจสอบ unusual characters
- ตรวจสอบ formatting anomalies

### Firebase Security Rules
- Role-based access control
- User data isolation
- Teacher-only report access

## 📊 Database Structure

### Collections (16 Total)

#### Base Collections (9)

##### users
```javascript
{
  uid: "firebase_uid",
  email: "student@example.com",
  displayName: "ชื่อนักเรียน",
  photoURL: "https://...",
  role: "student" | "teacher",
  
  // Student-specific fields
  studentId: "12345", // 5 digits
  grade: "ม.1" to "ม.6",
  room: "1" to "20",
  number: "1" to "50",
  section: "ก" | "ข" | "", // optional
  
  // Gamification fields
  points: 0, // total points earned
  currentStreak: 0, // consecutive days
  longestStreak: 0,
  lastLoginDate: "2025-01-01",
  badges: [], // array of badge IDs
  
  createdAt: Timestamp,
  lastUpdated: Timestamp
}
```

##### courses
```javascript
{
  courseId: "auto_generated",
  courseCode: "CS101",
  courseName: "Computer Science Fundamentals",
  description: "Introduction to CS",
  teacherId: "teacher_uid",
  createdAt: Timestamp,
  learningOutcomes: [
    {
      code: "LO1",
      description: "Understand basic programming concepts"
    }
  ]
}
```

##### questions
```javascript
{
  questionId: "auto_generated",
  courseId: "CS101",
  questionText: "Analyze the time complexity...",
  difficulty: 1-5,
  type: "Analysis" | "Evaluation" | "Creation" | "Synthesis",
  relatedLOs: ["LO1", "LO3"], // array of LO codes
  hasSolution: false, // true = exclude from student pool
  usageCount: 0, // increment on each use
  createdAt: Timestamp
}
```

##### sessions
```javascript
{
  sessionId: "auto_generated",
  studentId: "12345",
  courseId: "CS101",
  startTime: Timestamp,
  endTime: Timestamp | null,
  messageCount: 0,
  usedQuestionIds: [] // track used questions in this session
}
```

##### messages
```javascript
{
  messageId: "auto_generated",
  sessionId: "session_id",
  sender: "student" | "ai",
  text: "Message content",
  timestamp: Timestamp,
  questionId: "question_id" | null,
  assessmentId: "assessment_id" | null
}
```

##### assessments
```javascript
{
  assessmentId: "auto_generated",
  studentId: "12345",
  questionId: "question_id",
  sessionId: "session_id",
  studentAnswer: "Student's answer text",
  rubricScores: {
    analysis: 0-5,
    reasoning: 0-5,
    creativity: 0-5,
    evidence: 0-5
  },
  totalScore: 0-20,
  feedback: "AI-generated feedback",
  strengths: ["Strong analytical thinking"],
  improvements: ["Add more evidence"],
  loAssessment: {
    passedLOs: ["LO1", "LO3"],
    analysis: "Detailed LO analysis"
  },
  timestamp: Timestamp,
  
  // Gamification
  pointsEarned: 10-100,
  badgesEarned: ["first_answer", "perfect_score"],
  
  // Copy-paste detection
  copyPasteDetected: false,
  detectionReasons: []
}
```

##### studentProgress
```javascript
{
  // Document ID: {studentId}_{courseId}
  studentId: "12345",
  courseId: "CS101",
  passedLOs: ["LO1", "LO2"], // array of passed LO codes
  loDetails: {
    "LO1": {
      passedCount: 3,
      lastPassed: Timestamp,
      avgScore: 16.5
    }
  },
  lastUpdated: Timestamp
}
```

##### classReports
```javascript
{
  reportId: "auto_generated",
  teacherId: "teacher_uid",
  courseId: "CS101",
  reportData: {
    // Generated by Cloud Function
    overall: {...},
    rubricBreakdown: {...},
    scoreDistribution: {...},
    loMastery: {...},
    topPerformers: [...],
    needsSupport: [...]
  },
  dateRange: {
    start: Timestamp,
    end: Timestamp
  },
  generatedAt: Timestamp
}
```

##### progressHistory
```javascript
{
  historyId: "auto_generated",
  studentId: "12345",
  date: "2025-01-01",
  scores: {
    analysis: 4.2,
    reasoning: 3.8,
    creativity: 4.5,
    evidence: 4.0
  },
  totalQuestions: 5,
  averageScore: 16.5,
  timestamp: Timestamp
}
```

#### Phase 1 Collections (3)

##### learningPaths
```javascript
{
  pathId: "auto_generated",
  studentId: "12345",
  courseId: "CS101",
  questionSequence: [
    {
      questionId: "q1",
      position: 1,
      completed: false,
      score: null,
      attempts: 0,
      needsRetry: false
    }
  ],
  currentPosition: 0,
  totalQuestions: 10,
  completedCount: 0,
  avgScore: 0,
  status: "active" | "completed" | "reset",
  createdAt: Timestamp,
  lastUpdated: Timestamp,
  completedAt: Timestamp | null
}
```

##### microLessons
```javascript
{
  lessonId: "auto_generated",
  courseId: "CS101",
  title: "Introduction to Loops",
  content: "Full lesson content (300-500 words)",
  relatedLO: "LO1",
  type: "text" | "video",
  videoUrl: "https://youtube.com/..." | null,
  examples: ["Example 1", "Example 2"],
  practiceActivity: "Try creating a loop...",
  estimatedTime: 15, // minutes
  createdAt: Timestamp,
  createdBy: "teacher_uid"
}
```

##### studentGoals
```javascript
{
  goalId: "auto_generated",
  studentId: "12345",
  type: "questions" | "badges" | "points" | "avgScore" | "streak" | "perfectScores",
  target: 10, // target value
  current: 5, // current progress
  reward: 50, // points to earn
  status: "active" | "completed",
  createdAt: Timestamp,
  completedAt: Timestamp | null,
  deadline: Timestamp | null
}
```

#### Phase 3 Collections (5)

##### riskPredictions
```javascript
{
  predictionId: "auto_generated",
  studentId: "12345",
  courseId: "CS101",
  riskScore: 0-100, // 0 = low risk, 100 = critical risk
  riskLevel: "low" | "moderate" | "high" | "critical",
  factors: {
    attendanceRate: 0-100,
    avgScore: 0-20,
    engagementLevel: 0-100,
    streakConsistency: 0-100,
    loMasteryRate: 0-100,
    recentTrend: "improving" | "declining" | "stable"
  },
  recommendations: ["Suggestion 1", "Suggestion 2"],
  timestamp: Timestamp,
  predictedBy: "ai" // GPT-4o-mini
}
```

##### skillGapAnalyses
```javascript
{
  analysisId: "auto_generated",
  studentId: "12345",
  courseId: "CS101",
  classAverage: {
    analysis: 3.5,
    reasoning: 3.2,
    creativity: 3.8,
    evidence: 3.4
  },
  studentAverage: {
    analysis: 2.5,
    reasoning: 2.8,
    creativity: 4.0,
    evidence: 2.0
  },
  gaps: {
    analysis: -1.0, // student - class
    reasoning: -0.4,
    creativity: 0.2,
    evidence: -1.4
  },
  gapSeverity: {
    analysis: "medium",
    reasoning: "low",
    creativity: "none",
    evidence: "high"
  },
  recommendations: [
    {
      dimension: "evidence",
      severity: "high",
      suggestedLessons: ["lesson1", "lesson2"],
      practiceQuestions: ["q1", "q2"]
    }
  ],
  timestamp: Timestamp
}
```

##### interventionPlans
```javascript
{
  interventionId: "auto_generated",
  studentId: "12345",
  courseId: "CS101",
  type: "academic" | "engagement" | "behavioral",
  status: "pending" | "in_progress" | "completed",
  riskScore: 65,
  priority: "high" | "medium" | "low",
  
  // AI-generated intervention plan (3 phases)
  immediateActions: [
    "Schedule 1-on-1 meeting",
    "Review recent assessments"
  ],
  shortTermGoals: [
    "Complete 5 practice questions on weak LOs",
    "Watch micro-lessons on Analysis"
  ],
  longTermStrategies: [
    "Weekly progress check-ins",
    "Peer study group assignment"
  ],
  
  // Parent communication template
  parentCommunication: "Dear Parent, ...",
  
  createdAt: Timestamp,
  createdBy: "teacher_uid",
  lastUpdated: Timestamp,
  completedAt: Timestamp | null
}
```

##### parentReports
```javascript
{
  reportId: "auto_generated",
  studentId: "12345",
  courseId: "CS101",
  reportPeriod: {
    start: Timestamp,
    end: Timestamp
  },
  
  summary: {
    totalQuestions: 20,
    avgScore: 14.5,
    improvementRate: 12.5, // percentage
    currentRank: 15,
    totalStudents: 30
  },
  
  rubricScores: {
    analysis: 3.5,
    reasoning: 3.2,
    creativity: 4.0,
    evidence: 3.8
  },
  
  loProgress: {
    totalLOs: 10,
    masteredLOs: 6,
    inProgressLOs: 3,
    notStartedLOs: 1
  },
  
  engagementMetrics: {
    loginDays: 18,
    currentStreak: 5,
    longestStreak: 12,
    badgesEarned: 8,
    totalPoints: 450
  },
  
  riskAssessment: {
    riskScore: 25,
    riskLevel: "low",
    concerns: []
  },
  
  teacherComments: "Student shows consistent improvement...",
  recommendations: ["Continue current pace", "Focus on Evidence dimension"],
  
  generatedAt: Timestamp,
  sentToParent: false,
  sentAt: Timestamp | null
}
```

##### notifications
```javascript
{
  notificationId: "auto_generated",
  userId: "student_uid" | "teacher_uid",
  type: "badge" | "goal" | "intervention" | "achievement" | "alert",
  title: "New Badge Earned!",
  message: "You've earned the Perfect Score badge",
  metadata: {
    badgeId: "perfect_score",
    points: 50,
    // type-specific data
  },
  read: false,
  createdAt: Timestamp,
  expiresAt: Timestamp | null
}
```
{
  uid: string,
  email: string,
  displayName: string,
  photoURL: string,
  role: "student" | "teacher",
  studentId: string, // 5 digits
  grade: string, // ม.1-ม.6
  room: number, // 1-20
  number: number, // เลขที่
  section: string, // ก, ข, หรือ ""
  createdAt: timestamp
}
\`\`\`

#### courses
\`\`\`javascript
{
  teacherId: string,
  courseCode: string, // เช่น CS101
  courseName: string,
  courseDescription: string,
  learningOutcomes: [
    {
      code: string, // LO1, LO2
      description: string
    }
  ],
  createdAt: timestamp
}
\`\`\`

#### questions
\`\`\`javascript
{
  courseId: string,
  questionText: string,
  difficulty: "easy" | "medium" | "hard",
  relatedLOs: string[], // ["LO1", "LO3"]
  hasSolution: boolean, // ถ้าเป็น true = ไม่ส่งให้นักเรียน
  solution?: {
    answer: string,
    rubricScores: object,
    analysis: string
  },
  usageCount: number,
  createdAt: timestamp
}
\`\`\`

#### sessions
\`\`\`javascript
{
  studentId: string,
  courseId: string,
  startedAt: timestamp,
  endedAt: timestamp,
  status: "active" | "completed",
  messageCount: number,
  usedQuestionIds: string[]
}
\`\`\`

#### messages
\`\`\`javascript
{
  sessionId: string,
  from: "student" | "bot" | "system",
  text: string,
  type: string,
  timestamp: timestamp,
  assessmentId?: string
}
\`\`\`

#### assessments
\`\`\`javascript
{
  sessionId: string,
  studentId: string,
  courseId: string,
  questionId: string,
  questionContext: string,
  rawAnswer: string,
  rubricScores: {
    analysis: number, // 0-5
    reasoning: number, // 0-5
    creativity: number, // 0-5
    evidence: number // 0-5
  },
  overallScore: number, // 0-20
  feedbackText: string,
  suggestions: string[],
  strengths: string[],
  weaknesses: string[],
  loAssessment: {
    passedLOs: string[], // LOs ที่ผ่าน
    analysis: string
  },
  gamification: {
    pointsEarned: number,
    newBadges: string[]
  },
  createdAt: timestamp
}
\`\`\`

#### studentProgress
\`\`\`javascript
{
  // Document ID: {studentId}_{courseId}
  studentId: string,
  courseId: string,
  passedLOs: string[],
  totalPassed: number,
  assessmentCount: number,
  totalPoints: number,
  currentStreak: number,
  maxStreak: number,
  badges: string[], // badge IDs
  lastActiveDate: string,
  lastDailyReward: string,
  consecutiveLoginDays: number,
  totalDailyRewards: number,
  lastAssessedAt: timestamp
}
\`\`\`

#### classReports
\`\`\`javascript
{
  courseId: string,
  courseName: string,
  teacherId: string,
  analytics: {
    totalStudents: number,
    totalAssessments: number,
    rubricAverages: {
      analysis: number,
      reasoning: number,
      creativity: number,
      evidence: number
    },
    studentPerformance: {
      [studentId]: {
        assessmentCount: number,
        averageScore: number,
        passedLOs: string[]
      }
    },
    loMastery: {
      [loCode]: number // จำนวนนักเรียนที่ผ่าน
    },
    strugglingStudents: string[],
    topPerformers: string[]
  },
  generatedAt: timestamp,
  lastUpdated: timestamp
}
\`\`\`

## 🎨 Customization

### Dark Mode Colors

แก้ไขใน `src/styles/main.css`:

\`\`\`css
.dark-mode {
  --bg-primary: #1a202c;
  --bg-secondary: #2d3748;
  --text-primary: #f7fafc;
  --text-secondary: #cbd5e0;
}
\`\`\`

### AI Prompt Customization

แก้ไขใน `functions/index.js` ฟังก์ชัน `createAssessmentPrompt()`:

\`\`\`javascript
function createAssessmentPrompt(context, answer) {
  return \`
    // แก้ไข prompt ตามต้องการ
  \`;
}
\`\`\`

## 🐛 Troubleshooting

### ปัญหา: Firebase Authentication ไม่ทำงาน
- ตรวจสอบ API keys ใน `.env`
- เปิดใช้งาน Google Sign-In ใน Firebase Console
- ตรวจสอบ Authorized domains
- เพิ่ม `hots-ai-chatloop.web.app` และ `localhost` ใน Authorized domains

### ปัญหา: Cloud Functions error
- ตรวจสอบ OpenAI API key: `firebase functions:secrets:access OPENAI_API_KEY`
- ดู logs: `firebase functions:log --only functionName`
- ตรวจสอบ CORS settings ใน functions/index.js
- ตรวจสอบว่า OpenAI model เป็น `gpt-4o-mini` (cost-effective)

### ปัญหา: Firestore permission denied
- Deploy security rules: `firebase deploy --only firestore:rules`
- ตรวจสอบ user role ใน Firestore Console
- ตรวจสอบว่า composite indexes ถูก deploy แล้ว

### ปัญหา: Gamification notifications ไม่แสดง
- ตรวจสอบว่า `getBadgeDefinitions` function deploy แล้ว
- เช็ค browser console สำหรับ errors
- Verify real-time Firestore listeners ทำงานปกติ

### ปัญหา: Class Analytics ไม่แสดงข้อมูล
- กด "🔄 สร้างรายงานใหม่" เพื่อ generate report
- ตรวจสอบว่ามี assessments ใน course นั้นแล้ว
- เช็ค Firestore indexes สำหรับ `classReports` collection

### ปัญหา: ชื่อวิชาหรือชื่อนักเรียนไม่แสดง
- Course: ตรวจสอบว่ามี `courseCode` และ `courseName` fields
- Student: ตรวจสอบว่ามี `displayName` field ใน users collection

## 🚀 Advanced Features

### Smart Question Selection
- ระบบเลือกคำถามตาม weak LOs ของนักเรียนโดยอัตโนมัติ
- ไม่ซ้ำคำถามใน session เดียวกัน
- Questions ที่มี `hasSolution: true` จะไม่ส่งให้นักเรียน

### Copy-Paste Detection
**Client-side:**
- Event prevention: paste, copy, cut, contextmenu
- CSS: user-select: none

**Server-side (in assessAnswer function):**
- Detect unusual spacing patterns
- Check for consecutive long words
- Identify mixed character scripts
- Alert teachers via flags

### AI Prompt Engineering
ใช้ structured JSON output จาก OpenAI:
```javascript
{
  rubricScores: { ... },
  feedbackText: "...",
  suggestions: [...],
  strengths: [...],
  weaknesses: [...],
  loAssessment: { ... }
}
```

**Critical**: GPT-4o-mini wraps JSON in markdown blocks - ต้อง clean ก่อน parse:
```javascript
let cleanedText = responseText.trim()
if (cleanedText.startsWith('```')) {
  cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '')
  cleanedText = cleanedText.replace(/\n?```\s*$/i, '')
}
const result = JSON.parse(cleanedText)
```

## 📈 Performance Optimization

### Frontend
- Lazy loading routes
- Component-level code splitting
- Debounced user input (2s confirmation dialog)
- Cached student details in dashboard store

### Backend
- Firestore composite indexes สำหรับ complex queries
- Batch operations for multiple document updates
- FieldValue.increment() สำหรับ atomic updates
- Real-time listeners แทน polling

### AI Optimization
- ใช้ `gpt-4o-mini` แทน `gpt-4o` (15-20x ถูกกว่า)
- Caching badge definitions
- Single API call per assessment

## 📝 License

MIT License - ดูไฟล์ LICENSE

## 👨‍💻 Contributors

- **Saengpech Kongmali** - Initial work and gamification system
- Built with ❤️ for education

## 🙏 Acknowledgments

- OpenAI for GPT-4o-mini API
- Firebase for backend infrastructure
- Vue.js community
- Pinia for state management
- All educators who provided feedback

## 📞 Support & Contact

หากมีปัญหาหรือข้อสงสัย:
- 🐛 เปิด Issue ใน [GitHub](https://github.com/ultimate-6159/HOTS-AI-CHATLOOP/issues)
- 📧 Email: saengpech.k@gmail.com
- 🌐 Live Demo: [https://hots-ai-chatloop.web.app](https://hots-ai-chatloop.web.app)

## 📚 Additional Documentation

- [NAVIGATION_GUIDE.md](./NAVIGATION_GUIDE.md) - 🗺️ คู่มือการเข้าถึง Features ทั้งหมด (ตารางลิงก์ครบถ้วน)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - ระบบสถาปัตยกรรมโครงการ
- [DEPLOYMENT.md](./DEPLOYMENT.md) - คู่มือการ deploy
- [DEPLOYMENT_PHASE3.md](./DEPLOYMENT_PHASE3.md) - สรุปการ deploy Phase 3
- [TESTING.md](./TESTING.md) - วิธีการทดสอบระบบ
- [USAGE.md](./USAGE.md) - คู่มือการใช้งานฉบับสมบูรณ์
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - สรุปโครงการฉบับย่อ
- [SYSTEM_STATUS.md](./SYSTEM_STATUS.md) - สถานะระบบและความคืบหน้า
- [FIRESTORE_INDEXES_SETUP.md](./FIRESTORE_INDEXES_SETUP.md) - คู่มือติดตั้ง Firestore Indexes
- [PHASE1_COMPLETION_REPORT.md](./PHASE1_COMPLETION_REPORT.md) - รายงานการทำ Phase 1 เสร็จ

## 🗺️ Navigation & Access

ดูรายละเอียดการเข้าถึง Features ทั้งหมดได้ที่ → **[NAVIGATION_GUIDE.md](./NAVIGATION_GUIDE.md)**

### 🎓 สำหรับนักเรียน (8 เมนูหลัก)

| เมนู | Route | Badge |
|------|-------|-------|
| 🚀 เริ่มทำ Assessment | `/chat` | Primary |
| 📈 ความคืบหน้า LO | `/my-progress` | - |
| 📊 Progress Analytics | `/progress-analytics` | ✨ NEW |
| 🎯 Adaptive Learning | `/adaptive-learning` | ✨ NEW |
| 🎯 Goal Setting | `/goal-setting` | ✨ NEW |
| 🏆 ลีดเดอร์บอร์ด | `/leaderboard` | - |
| 🗺️ Progress Map | `/progress-map` | - |
| 👤 โปรไฟล์ | `/profile` | - |

### 👨‍🏫 สำหรับครู (9 เมนูหลัก)

| เมนู | Route | Badge |
|------|-------|-------|
| 📚 จัดการรายวิชา | `/courses` | - |
| 💡 คลังคำถาม | `/questions` | - |
| 📊 วิเคราะห์ห้องเรียน | `/class-analytics` | - |
| 🎯 รายงาน LO | `/lo-reports` | - |
| 🔮 AI Predictive Analytics | `/teacher-analytics` | ✨ NEW |
| 📡 Real-time Monitor | `/realtime-monitor` | ✨ NEW |
| 📖 Micro Lessons | `/micro-lessons` | - |
| 📚 คลัง Micro Lessons | `/micro-lesson-library` | ✨ NEW |
| 👥 รายละเอียดนักเรียน | `/student-detail/:id` | - |

**Gamification Features:**
- 🏅 Badges Collection: Modal ใน Student Dashboard
- ⭐ Points & Levels: แสดงอัตโนมัติ
- 🎁 Daily Rewards: Auto-claim เมื่อเข้าระบบ
- 🔥 Streak Tracking: แสดงใน Achievement Card

---

## 🎯 Roadmap

### Phase 1: Adaptive Learning & Personalization (✅ Completed - Nov 2025)
- [x] Adaptive Learning Paths (personalized based on weak LOs)
- [x] Micro-Lessons Management (AI-generated content)
- [x] Loop-back Mechanism (retry if score < 10)
- [x] Goal Setting System (6 goal types with rewards)
- [x] Progress Analytics Dashboard (detailed charts + trends)
- [x] Cloud Functions: `generateAdaptivePath`, `updateAdaptivePath`, `generateMicroLesson`

### Phase 2: Core Features (✅ Completed - Oct 2025)
- [x] Core HOTS assessment system
- [x] Real-time chat interface
- [x] Copy-paste prevention
- [x] Teacher dashboard
- [x] CSV export
- [x] Dark mode
- [x] Gamification system (badges, points, streaks)
- [x] Leaderboard
- [x] Daily login rewards
- [x] Animated notifications
- [x] Class Analytics Dashboard
- [x] Course Management with AI
- [x] Question Bank with solutions
- [x] Learning Outcomes tracking

### Phase 3: Advanced Analytics & AI Predictions (✅ Completed - Nov 2025)
- [x] Predictive Analytics Engine (6-factor risk assessment)
- [x] Skill Gap Analysis (student vs class comparison)
- [x] AI Intervention Recommendations (GPT-4o-mini powered)
- [x] Teacher Analytics Dashboard (risk distribution + heatmaps)
- [x] Parent Progress Reports (comprehensive metrics)
- [x] Real-time Class Monitor (30s auto-refresh + live charts)
- [x] Notification System (smart alerts)
- [x] Cloud Functions: `predictStudentRisk`, `analyzeSkillGaps`, `generateInterventions`, `generateParentReport`

### Phase 4: Polish & Production Readiness (🔄 In Progress)
- [ ] Comprehensive Testing (unit, integration, E2E)
- [ ] Performance Optimization (code splitting, lazy loading)
- [ ] Mobile Responsive Improvements
- [ ] SEO & Accessibility Enhancements
- [ ] User Documentation & Video Tutorials
- [ ] Admin Panel for System Management
- [ ] Backup & Disaster Recovery
- [ ] Monitoring & Alerting Setup

### Future Enhancements
- [ ] Parent Portal (view student progress)
- [ ] Group Discussion Rooms (collaborative learning)
- [ ] LMS Integration (Google Classroom, Moodle)
- [ ] Intelligent Revision System (spaced repetition)
- [ ] Mobile App (React Native)
- [ ] Multilingual support (English, Thai, others)
- [ ] Voice Input/Output (speech recognition)
- [ ] Offline Mode (PWA capabilities)

## 🌟 Star History

If you find this project useful, please consider giving it a ⭐ on GitHub!

---

**Made with ❤️ for education | Powered by AI | Designed for HOTS Development**

**Current Version:** 3.0 (Phase 3 Complete - Advanced Analytics)  
**Last Updated:** November 11, 2025  
**System Score:** 9,000/10,000 (90% Complete)
