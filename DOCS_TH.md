# 📚 HOTS AI ChatLoop — คู่มือทางเทคนิคฉบับสมบูรณ์

<div align="center">

**เวอร์ชัน 5.2** | **อัปเดตล่าสุด: 22 ธันวาคม 2568**

*คู่มือทางเทคนิคสำหรับนักพัฒนา นักวิจัย และผู้ดูแลระบบ*

</div>

---

## 📑 สารบัญ

1. [สรุปภาพรวมระบบ](#1-สรุปภาพรวมระบบ)
2. [สถาปัตยกรรม](#2-สถาปัตยกรรม)
3. [คู่มือการนำทาง](#3-คู่มือการนำทาง)
4. [คู่มือผู้ใช้](#4-คู่มือผู้ใช้)
5. [คู่มือการ Deploy](#5-คู่มือการ-deploy)
6. [การทดสอบ](#6-การทดสอบ)
7. [ระบบความปลอดภัย](#7-ระบบความปลอดภัย)
8. [การนำไปใช้ของกรอบ A.R.C.E.](#8-การนำไปใช้ของกรอบ-arce)
9. [ระบบ LO ของใบงาน](#9-ระบบ-lo-ของใบงาน)
10. [อ้างอิง Cloud Functions](#10-อ้างอิง-cloud-functions)
11. [Schema ของ Firestore Collections](#11-schema-ของ-firestore-collections)
12. [รูปแบบการพัฒนา](#12-รูปแบบการพัฒนา)
13. [การแก้ไขปัญหา](#13-การแก้ไขปัญหา)
14. [ระบบนิเวศความน่าเชื่อถือ](#14-ระบบนิเวศความน่าเชื่อถือ) ⭐ ใหม่

---

## 1. สรุปภาพรวมระบบ

### Technology Stack

| ชั้น | เทคโนโลยี | เวอร์ชัน | วัตถุประสงค์ |
|------|----------|---------|-------------|
| **Frontend** | Vue 3 + Vite | 3.4 / 5.0 | Reactive UI ด้วย Composition API |
| **State Management** | Pinia | 2.x | 8 modular stores |
| **Routing** | Vue Router | 4.x | 45+ routes พร้อม guards |
| **Backend** | Firebase Cloud Functions | Node.js 20 | 41 serverless functions |
| **Database** | Cloud Firestore | - | 25+ collections, real-time sync |
| **AI Engine** | OpenAI API | GPT-4o-mini | LLM ประหยัด (ถูกกว่า 15-20 เท่า) |
| **Authentication** | Firebase Auth | - | Google Sign-In, role-based |
| **Hosting** | Firebase Hosting | - | CDN-backed static hosting |
| **PWA** | Vite PWA | - | ติดตั้งได้, offline-ready |

### สถิติโปรเจกต์

| ตัวชี้วัด | จำนวน | หมายเหตุ |
|----------|-------|----------|
| Vue Components | 80+ | รวม 45+ หน้าหลัก |
| Cloud Functions | 41 | HTTP + Scheduled + Triggers |
| โค้ด Backend | 9,200+ บรรทัด | สถาปัตยกรรม Modular |
| Firestore Collections | 25+ | Schema ปกติ |
| กรณีทดสอบ | 123 | 48 backend + 75 frontend |
| Routes | 45+ | ควบคุมสิทธิ์ตาม Role |
| Pinia Stores | 8 | auth, chat, gamification, theme, lessonPlan, learningPath, notifications, dashboard |

### ตารางอ้างอิงด่วน A.R.C.E.

| มิติ | ภาษาไทย | คำอธิบาย | ช่วงคะแนน |
|------|---------|----------|-----------|
| **A**nalysis | การวิเคราะห์ | แยกแยะประเด็น, หาความสัมพันธ์, เปรียบเทียบ | 0-5 |
| **R**easoning | การให้เหตุผล | อธิบายเหตุผล, สรุปตรรกะ, อ้างหลักการ | 0-5 |
| **C**reativity | ความคิดสร้างสรรค์ | เสนอมุมมองใหม่, คิดนอกกรอบ, ออกแบบ | 0-5 |
| **E**vidence | การใช้หลักฐาน | อ้างอิงข้อมูล, ยกตัวอย่าง, สนับสนุน | 0-5 |

**คะแนนรวม: 0-20** (รวม 4 มิติ)

---

## 2. สถาปัตยกรรม

### โครงสร้างโปรเจกต์

```
hots-ai/
├── 📁 src/                          # Frontend source
│   ├── 📁 views/                    # 45+ หน้า Vue
│   │   ├── ChatView.vue             # หน้าหลักทำแบบทดสอบ
│   │   ├── WorksheetResult.vue      # ผลใบงาน + ส่วน LO
│   │   ├── WorksheetReports.vue     # รายงานใบงานครู
│   │   ├── AdminLOManager.vue       # เครื่องมือแก้ไข LO
│   │   ├── MyProgress.vue           # ความก้าวหน้านักเรียน
│   │   ├── LOReports.vue            # รายงาน LO สำหรับครู
│   │   ├── ClassAnalytics.vue       # Dashboard วิเคราะห์ห้อง
│   │   ├── LessonPlans.vue          # จัดการแผนการสอน 5E
│   │   └── ...
│   ├── 📁 components/               # Components ที่ใช้ซ้ำ
│   │   ├── RadarChart.vue           # กราฟ A.R.C.E.
│   │   ├── LOProgressCards.vue      # แสดงความก้าวหน้า LO
│   │   ├── GamificationStats.vue    # แต้ม, เหรียญ, streak
│   │   └── ...
│   ├── 📁 stores/                   # Pinia state management
│   │   ├── auth.js                  # Authentication + role
│   │   ├── chat.js                  # Session + คำถาม
│   │   ├── gamification.js          # แต้ม, เหรียญ, streak
│   │   ├── theme.js                 # Dark mode
│   │   ├── lessonPlan.js            # CRUD แผนการสอน
│   │   ├── learningPath.js          # Adaptive learning
│   │   ├── notifications.js         # Toast messages
│   │   └── dashboard.js             # ข้อมูล Dashboard ครู
│   ├── 📁 utils/                    # Utility functions
│   │   ├── loProgress.js            # ⭐ นับ LO มาตรฐาน
│   │   ├── antiCheat.js             # ตรวจจับ copy-paste
│   │   ├── errorHandler.js          # จัดการ Error
│   │   └── logger.js                # Client-side logging
│   ├── 📁 firebase/                 # Firebase config
│   │   └── config.js
│   ├── 📁 router/                   # Vue Router พร้อม guards
│   │   └── index.js
│   └── 📁 styles/                   # Global styles
│       └── main.css
├── 📁 functions/                    # Cloud Functions
│   ├── index.js                     # ฟังก์ชันหลัก (9200+ บรรทัด)
│   ├── gamification.js              # นิยาม Badge
│   ├── national-scale.js            # ฟังก์ชันกระทรวง/สพท.
│   ├── 📁 utils/                    # Backend utilities
│   │   ├── prompts.js               # แม่แบบ AI prompt
│   │   ├── loAssessment.js          # ตรรกะประเมิน LO
│   │   ├── aiParser.js              # ทำความสะอาด JSON response
│   │   ├── aiDetection.js           # ตรวจจับเนื้อหา AI
│   │   ├── reliability.js           # Schema validation
│   │   ├── rateLimiter.js           # Rate limiting
│   │   └── researchData.js          # ตัวช่วยข้อมูลวิจัย
│   ├── 📁 services/                 # Business logic
│   │   └── assessmentService.js     # การจัดการประเมิน
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

### อ้างอิง Pinia Stores

| Store | วัตถุประสงค์ | Methods หลัก |
|-------|-------------|--------------|
| `auth.js` | Google Sign-In, user profile, ตรวจสอบ role | `signInWithGoogle()`, `signOut()`, `isTeacher` |
| `chat.js` | วงจร Session, เลือกคำถาม | `startSession()`, `sendAnswer()`, `selectQuestion()` |
| `gamification.js` | แต้ม, เหรียญ, streak, leaderboard | `awardPoints()`, `checkBadges()`, `refreshActualPassedLOs()` |
| `theme.js` | สลับ Dark mode | `toggleDarkMode()` |
| `lessonPlan.js` | CRUD แผนการสอน | `createPlan()`, `generateWithAI()` |
| `learningPath.js` | Adaptive learning | `getAdaptivePath()` |
| `notifications.js` | Toast messages | `showToast()`, `showError()` |
| `dashboard.js` | ข้อมูล Dashboard ครู | `loadClassData()` |

### อัลกอริทึมเลือกคำถาม

```javascript
// การเลือกแบบ Priority-based สำหรับ adaptive learning (chat.js)
async function selectNextQuestion(courseId, sessionId) {
  // 1. ดึง LO ที่อ่อนของนักเรียนจาก studentProgress
  const weakLOs = await getWeakLOs(studentId, courseId);
  
  // 2. กรองคำถามที่ยังไม่ใช้ (ไม่อยู่ใน usedQuestionIds ของ session)
  const unusedQuestions = questions.filter(q => !usedQuestionIds.includes(q.id));
  
  // 3. ไม่รวมคำถามที่มี hasSolution: true (เฉลยครู)
  const studentQuestions = unusedQuestions.filter(q => !q.hasSolution);
  
  // 4. ลำดับที่ 1: คำถามที่เกี่ยวกับ LO ที่อ่อน
  const priorityQuestions = studentQuestions.filter(q => 
    q.relatedLOs.some(lo => weakLOs.includes(lo))
  );
  
  if (priorityQuestions.length > 0) {
    return randomSelect(priorityQuestions);
  }
  
  // 5. ลำดับที่ 2: สุ่มคำถามที่ยังไม่ใช้
  if (studentQuestions.length > 0) {
    return randomSelect(studentQuestions);
  }
  
  // 6. Fallback: คำถามที่ถูกใช้น้อยที่สุด (ตาม usageCount)
  return questions.reduce((min, q) => q.usageCount < min.usageCount ? q : min);
}
```

---

## 3. คู่มือการนำทาง

### 🎓 คุณสมบัติสำหรับนักเรียน (9 เมนู)

| # | เส้นทาง | คุณสมบัติ | คำอธิบาย | Components หลัก |
|---|---------|----------|----------|-----------------|
| 1 | `/chat` | 🚀 แบบทดสอบ | ทำแบบทดสอบ HOTS แบบ Chat | ChatView.vue |
| 2 | `/learning-rooms` | 🏫 ห้องกิจกรรม | ห้องทำใบงานอิเล็กทรอนิกส์ | LearningRoomList.vue |
| 3 | `/my-progress` | 📈 ความคืบหน้า LO | ติดตามความก้าวหน้า LO | MyProgress.vue |
| 4 | `/progress-analytics` | 📊 วิเคราะห์ | กราฟวิเคราะห์โดยละเอียด | ProgressAnalytics.vue |
| 5 | `/adaptive-learning` | 🎯 เรียนรู้แบบปรับตัว | เส้นทางการเรียนรู้จาก AI | AdaptiveLearning.vue |
| 6 | `/goal-setting` | 🎯 ตั้งเป้าหมาย | เป้าหมายการเรียนรู้ส่วนตัว | GoalSetting.vue |
| 7 | `/leaderboard` | 🏆 ตารางอันดับ | อันดับในรายวิชา | Leaderboard.vue |
| 8 | `/progress-map` | 🗺️ แผนที่ความก้าวหน้า | แผนภาพ LO แบบภาพ | ProgressMap.vue |
| 9 | `/profile` | 👤 โปรไฟล์ | ตั้งค่าผู้ใช้ | Profile.vue |

### 👨‍🏫 คุณสมบัติสำหรับครู (14+ เมนู)

| # | เส้นทาง | คุณสมบัติ | คำอธิบาย | Components หลัก |
|---|---------|----------|----------|-----------------|
| 1 | `/courses` | 📚 จัดการรายวิชา | CRUD รายวิชา + AI สร้าง LO | CourseManagement.vue |
| 2 | `/questions` | 💡 คลังคำถาม | คลังคำถาม + AI สร้างคำถาม | QuestionBank.vue |
| 3 | `/class-analytics` | 📊 วิเคราะห์ห้องเรียน | ภาพรวมห้อง + export | ClassAnalytics.vue |
| 4 | `/lo-reports` | 🎯 รายงาน LO | Heatmap LO รายนักเรียน | LOReports.vue |
| 5 | `/teacher-analytics` | 🔮 AI คาดการณ์ | วิเคราะห์เชิงทำนาย | TeacherAnalytics.vue |
| 6 | `/realtime-monitor` | 📡 ตรวจสอบ Real-time | กิจกรรมนักเรียนแบบ Live | RealtimeMonitor.vue |
| 7 | `/lesson-plans` | 📝 แผนการสอน | แผนการสอน 5E | LessonPlans.vue |
| 8 | `/teacher/worksheets` | 📋 ใบงาน | ใบงานอิเล็กทรอนิกส์ | TeacherWorksheets.vue |
| 9 | `/teacher/worksheet-reports` | 📊 รายงานใบงาน | รายงานใบงาน + LO | WorksheetReports.vue |
| 10 | `/micro-lessons` | 📖 บทเรียนย่อย | เนื้อหาบทเรียนสั้น | MicroLessons.vue |
| 11 | `/micro-lesson-library` | 📚 คลังบทเรียน | คลังบทเรียน | MicroLessonLibrary.vue |
| 12 | `/student-detail/:id` | 👥 รายละเอียดนักเรียน | มุมมองนักเรียนรายบุคคล | StudentDetail.vue |
| 13 | `/admin-lo-manager` | 🛠️ จัดการ LO ผู้ดูแล | แก้ไขข้อมูล LO นักเรียน | AdminLOManager.vue |
| 14 | `/knowledge-sheet/:id` | 📄 ใบความรู้ | เนื้อหาเตรียมความพร้อม | KnowledgeSheet.vue |

### 🔬 คุณสมบัติสำหรับงานวิจัย

| เส้นทาง | คำอธิบาย | ฟังก์ชันหลัก |
|---------|----------|-------------|
| `/research/export` | ส่งออกข้อมูลไม่ระบุตัวตน | exportResearchData |
| `/research/pretest-posttest` | จัดการ Pre/Post test | logInterventionEvent |
| `/research/expert-validation` | ตรวจสอบคะแนน AI | calculateIRR |
| `/research/expert-calibration` | เครื่องมือ Calibration | irrReport |

---

## 4. คู่มือผู้ใช้

### สำหรับนักเรียน

#### การเข้าสู่ระบบ
1. เปิด https://hots-ai-d028b.web.app
2. คลิก "เข้าสู่ระบบด้วย Google"
3. กรอกข้อมูลโปรไฟล์ครั้งแรก (รหัสนักเรียน, ชั้น, ห้อง, เลขที่)
4. ยอมรับข้อกำหนด PDPA

#### การทำแบบทดสอบ Chat
1. เลือกรายวิชาจาก Dashboard
2. คลิก "เริ่มทำแบบทดสอบ"
3. อ่านคำถาม → พิมพ์คำตอบ (ขั้นต่ำ 20 ตัวอักษร)
4. คลิก "ส่งคำตอบ" → ยืนยันในกล่อง Dialog
5. รอ AI ประเมิน → ดูคะแนน 4 มิติ (A.R.C.E.)
6. อ่าน Feedback และคำแนะนำ Scaffolding

#### การทำใบงานอิเล็กทรอนิกส์
1. ไปที่ "ห้องกิจกรรม" (`/learning-rooms`)
2. เลือกห้องที่ครูมอบหมาย
3. ทำใบงานทีละข้อ → ส่งคำตอบ
4. ดูผลประเมิน A.R.C.E. และ LO ที่ผ่าน

### สำหรับครู

#### การสร้างรายวิชา
1. ไปที่ `/courses` → "สร้างรายวิชาใหม่"
2. กรอกข้อมูลพื้นฐาน (ชื่อ, รหัส, ระดับชั้น)
3. คลิก "AI สร้าง Learning Outcomes" หรือเพิ่มเอง
4. ตรวจสอบและบันทึก

#### การสร้างคำถาม HOTS
1. ไปที่ `/questions` → เลือกวิชา
2. "เพิ่มคำถามใหม่" หรือ "AI สร้างคำถาม"
3. เชื่อม LO ที่เกี่ยวข้อง
4. (ตัวเลือก) "สร้าง Solution" สำหรับเฉลยข้อสอบ

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

## 5. คู่มือการ Deploy

### สิ่งที่ต้องมี

| ข้อกำหนด | เวอร์ชัน | การติดตั้ง |
|----------|---------|-----------|
| Node.js | 18+ LTS | [nodejs.org](https://nodejs.org) |
| Firebase CLI | ล่าสุด | `npm install -g firebase-tools` |
| OpenAI API Key | - | [platform.openai.com](https://platform.openai.com) |
| Firebase Project | แผน Blaze | จำเป็นสำหรับ Cloud Functions |

### Deploy ด่วน

```bash
# 1. ติดตั้ง dependencies
npm install
cd functions && npm install && cd ..

# 2. ตั้งค่า environment
cp .env.example .env                    # แก้ไข VITE_FIREBASE_*
cp functions/.env.example functions/.env # แก้ไข OPENAI_API_KEY

# 3. Login และเชื่อมโปรเจกต์
firebase login
firebase use --add  # เลือกโปรเจกต์

# 4. Deploy
npm run build
firebase deploy     # Deploy ทั้งหมด

# หรือเลือก deploy:
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
```

### พัฒนาในเครื่อง

```bash
# Frontend (port 5173)
npm run dev

# Functions emulator (port 5001)
cd functions && npm run serve

# Build สำหรับ production
npm run build
```

---

## 6. การทดสอบ

### คำสั่งทดสอบ

```bash
# ทดสอบ Frontend (Vitest)
npm test                    # รัน 75 tests
npm run test:ui             # UI แบบ Interactive
npm run coverage            # รายงาน Coverage

# ทดสอบ Backend (Jest)
cd functions && npm test    # รัน 48 tests
```

### ความครอบคลุมการทดสอบ

| หมวด | ไฟล์ | Tests | โฟกัส |
|------|------|-------|-------|
| **Frontend** | auth.test.js | 17 | Pinia auth store, ตรวจสอบ role |
| | gamification.test.js | 26 | เลเวล, เหรียญ, streak, แต้ม |
| | errorHandler.test.js | 18 | ข้อความ Error ภาษาไทย |
| | loProgress.test.js | 14 | ความสอดคล้องการนับ LO |
| **Backend** | prompts.test.js | 10 | แม่แบบ AI prompt |
| | loAssessment.test.js | 10 | ตรรกะประเมิน LO |
| | aiParser.test.js | 18 | ทำความสะอาด JSON response |
| | rateLimiter.test.js | 10 | Rate limiting |
| **รวม** | | **123** | |

### รายการตรวจสอบการทดสอบด้วยมือ

#### Authentication
- [ ] Login ด้วย Google สำเร็จ
- [ ] Redirect ตาม role (student/teacher)
- [ ] Route guard ทำงานถูกต้อง
- [ ] Profile Setup แสดงครั้งแรก

#### คุณสมบัตินักเรียน
- [ ] Dashboard แสดงข้อมูลถูกต้อง
- [ ] เลือกวิชาและเริ่ม session ได้
- [ ] ส่งคำตอบ (≥20 chars) + กล่องยืนยัน
- [ ] ไม่สามารถ copy-paste ได้
- [ ] รับ feedback และคะแนน real-time
- [ ] Gamification: แต้ม, Badge, Streak

#### คุณสมบัติครู
- [ ] Course/Question CRUD
- [ ] AI Generate: LO, Question, Solution
- [ ] Class Analytics + Export CSV
- [ ] LO Reports Heatmap
- [ ] Lesson Plan (5E) + Worksheet

#### ความสอดคล้อง LO
- [ ] นักเรียนเห็น LO = ครูเห็น LO (ใช้ `loProgress.js`)
- [ ] Admin LO Manager แก้ไขได้

---

## 7. ระบบความปลอดภัย

### สถาปัตยกรรมความปลอดภัย 5 ชั้น

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    สถาปัตยกรรมความปลอดภัย                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ชั้นที่ 1: การป้องกันฝั่ง CLIENT                                  │   │
│  │ • @paste.prevent, @copy.prevent, @cut.prevent                   │   │
│  │ • @contextmenu.prevent                                          │   │
│  │ • นับตัวอักษร, ความยาวขั้นต่ำ                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ชั้นที่ 2: ตรวจสอบ INPUT ฝั่ง SERVER                              │   │
│  │ • detectCopyPaste() — รูปแบบ spacing ผิดปกติ, คำยาวมาก, script ผสม│   │
│  │ • analyzeAIContent() — ตรวจจับข้อความที่สร้างจาก AI              │   │
│  │ • Rate limiting — ป้องกันการใช้งานเกิน                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ชั้นที่ 3: ป้องกัน AI PROMPT INJECTION                            │   │
│  │ • ทำความสะอาด Input (ลบ code blocks, XML, templates)            │   │
│  │ • แยก XML tag (แยก input นักเรียนจากระบบ)                        │   │
│  │ • จำกัดความยาว (3000 ตัวอักษร)                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ชั้นที่ 4: ความปลอดภัยฐานข้อมูล                                   │   │
│  │ • Firestore security rules (ตาม role)                           │   │
│  │ • แยกข้อมูลโรงเรียน (isSameSchool helper)                       │   │
│  │ • กฎ validation ข้อมูล                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ชั้นที่ 5: ปฏิบัติตามข้อกำหนดความเป็นส่วนตัว (PDPA)                 │   │
│  │ • กล่องยินยอมเมื่อ login ครั้งแรก                                 │   │
│  │ • ไม่ส่ง PII ไป OpenAI                                          │   │
│  │ • ส่งออกข้อมูลวิจัยไม่ระบุตัวตน                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ฟังก์ชันช่วย
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
    
    // Users — ข้อมูลของตนเองเท่านั้น
    match /users/{userId} {
      allow read: if isLoggedIn() && (isOwner(userId) || isTeacher());
      allow write: if isOwner(userId);
    }
    
    // Courses — ครูเป็นเจ้าของ, นักเรียนอ่านได้
    match /courses/{courseId} {
      allow read: if isLoggedIn();
      allow write: if isTeacher() && request.resource.data.teacherId == request.auth.uid;
    }
    
    // Assessments — นักเรียนเป็นเจ้าของ, ครูอ่านได้
    match /assessments/{assessmentId} {
      allow read: if isLoggedIn() && (
        resource.data.studentId == request.auth.uid || isTeacher()
      );
      allow create: if isLoggedIn();
    }
  }
}
```

---

## 8. การนำไปใช้ของกรอบ A.R.C.E.

### Phase 2: Deterministic AI Scoring

```javascript
// functions/index.js — การตั้งค่า AI
const assessmentConfig = {
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  temperature: 0,        // ไม่มีความสุ่ม
  seed: 42,              // Seed คงที่เพื่อผลที่ทำซ้ำได้
  max_tokens: 1500,
  response_format: { type: 'json_object' }
};

// โครงสร้าง Chain of Thought (CoT)
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

### การทำความสะอาด AI Response (จำเป็น)

```javascript
// functions/utils/aiParser.js — ต้องทำความสะอาด GPT responses ก่อน JSON.parse เสมอ
function cleanAIResponse(responseText) {
  let cleanedText = responseText.trim();
  
  // GPT-4o-mini มักครอบ JSON ด้วย ```json blocks — ต้องลบออก
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '');
    cleanedText = cleanedText.replace(/\n?```\s*$/i, '');
  }
  
  cleanedText = cleanedText.trim();
  
  try {
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('JSON parse failed:', error);
    throw new Error('Invalid AI response format');
  }
}
```

---

## 9. ระบบ LO ของใบงาน

### ขั้นตอนการทำงาน

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ขั้นตอนระบบ LO ของใบงาน                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ครูสร้างแผนการสอน                                                       │
│       ↓                                                                 │
│  generateElectronicWorksheet (Cloud Function)                           │
│       ├── ดึง LOs จากแผนการสอน                                          │
│       ├── สร้างคำถามด้วย AI                                              │
│       └── เก็บ learningOutcomes[] ใน worksheet.metadata                 │
│       ↓                                                                 │
│  eWorksheets Collection                                                 │
│  {                                                                      │
│    metadata: {                                                          │
│      learningOutcomes: [                                                │
│        { loCode: "LO1", loDescription: "..." },                         │
│        { loCode: "LO2", loDescription: "..." }                          │
│      ]                                                                  │
│    }                                                                    │
│  }                                                                      │
│       ↓                                                                 │
│  นักเรียนทำใบงานเสร็จ                                                     │
│       ↓                                                                 │
│  assessWorksheetSubmission (Cloud Function)                             │
│       ├── ประเมินคะแนน A.R.C.E.                                         │
│       ├── เรียก assessLearningOutcomesInternal()                        │
│       ├── บันทึก loAssessment ไป worksheetSubmissions                   │
│       └── อัปเดต studentProgress.passedLOs (รวม)                        │
│       ↓                                                                 │
│  loProgress.js (Frontend Utility)                                       │
│       ├── Query assessments collection                                  │
│       ├── Query worksheetSubmissions collection                         │
│       └── รวม passedLOs ที่ไม่ซ้ำจากทั้งสองแหล่ง                          │
│       ↓                                                                 │
│  แสดง LO สอดคล้องกันทุกหน้า                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### loProgress.js — การนับ LO มาตรฐาน (จำเป็น)

```javascript
// src/utils/loProgress.js — ใช้ function นี้สำหรับนับ LO เสมอ
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';

/**
 * ดึง LO ที่ผ่านของนักเรียนสำหรับรายวิชาหนึ่ง
 * รวมข้อมูลจากทั้ง assessments และ worksheetSubmissions
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
```

---

## 10. อ้างอิง Cloud Functions

### ฟังก์ชันประเมิน

| ฟังก์ชัน | ประเภท | วัตถุประสงค์ | Input |
|---------|--------|-------------|-------|
| `assessAnswer` | HTTP | ประเมิน HOTS แบบ Chat | answer, questionId, courseId |
| `assessWorksheetSubmission` | HTTP | ประเมินใบงาน + LO | submissionId, worksheetId, answers |
| `assessLearningOutcomesInternal` | Internal | ประเมิน LO | studentAnswer, learningOutcomes, assessmentResult |

### ฟังก์ชันสร้างเนื้อหา

| ฟังก์ชัน | ประเภท | วัตถุประสงค์ | Input |
|---------|--------|-------------|-------|
| `generateLearningOutcomes` | HTTP | AI สร้าง LOs สำหรับรายวิชา | courseId, description |
| `generateHOTSQuestion` | HTTP | AI สร้างคำถาม HOTS | courseId, topic, difficulty |
| `generateSolution` | HTTP | AI สร้างเฉลย | questionId |
| `generateLessonPlan` | HTTP | AI สร้างแผนการสอน 5E | topic, gradeLevel, duration |
| `generateElectronicWorksheet` | HTTP | AI สร้างใบงาน | lessonPlanId, questionCount |
| `generateKnowledgeSheet` | HTTP | AI สร้างใบความรู้ | lessonPlanId |
| `generateCourseStructure` | HTTP | AI สร้างโครงสร้างรายวิชา | courseId |

### ฟังก์ชันวิเคราะห์

| ฟังก์ชัน | ประเภท | วัตถุประสงค์ | Trigger |
|---------|--------|-------------|---------|
| `generateClassAnalytics` | HTTP | สรุปผลห้องเรียน | เรียกด้วยมือ |
| `generateDailyReport` | Scheduled | รายงานกิจกรรมรายวัน | ทุกวัน 06:00 |
| `getWorksheetReports` | HTTP | รายงานส่งใบงาน | เรียกด้วยมือ |
| `analyzeTalentTracks` | Scheduled | วิเคราะห์ความสามารถพิเศษ | จันทร์ทุกสัปดาห์ |
| `generateAdaptivePath` | HTTP | เส้นทางเรียนรู้ส่วนบุคคล | เรียกด้วยมือ |

### ฟังก์ชัน Gamification

| ฟังก์ชัน | ประเภท | วัตถุประสงค์ | Input |
|---------|--------|-------------|-------|
| `getLeaderboard` | HTTP | ตารางอันดับรายวิชา | courseId, limit |
| `getBadgeDefinitions` | HTTP | เหรียญที่มี | - |
| `claimDailyReward` | HTTP | รางวัล login รายวัน | userId |

### ฟังก์ชันงานวิจัย

| ฟังก์ชัน | ประเภท | วัตถุประสงค์ | Input |
|---------|--------|-------------|-------|
| `calculateIRR` | HTTP | ความน่าเชื่อถือระหว่างผู้ประเมิน | expertScores, aiScores |
| `irrReport` | HTTP | รายงาน IRR โดยละเอียด | courseId |
| `calculateEffectSize` | HTTP | คำนวณ Cohen's d | preScores, postScores |
| `exportResearchData` | HTTP | ส่งออกข้อมูลไม่ระบุตัวตน | courseId, format |
| `correlationAnalysis` | HTTP | วิเคราะห์ความสัมพันธ์ตัวแปร | courseId |
| `exportKAnonymousDataAPI` | HTTP | ส่งออกแบบ K-Anonymity | courseId, k, level |

---

## 11. Schema ของ Firestore Collections

### users

```javascript
{
  uid: "firebase-auth-uid",          // Firebase Auth UID
  email: "student@example.com",
  displayName: "นักเรียน ทดสอบ",
  role: "student" | "teacher",
  studentId: "12345",                // รหัสนักเรียน 5 หลัก
  grade: "ม.4",
  room: "1",
  number: "15",
  section: "A",                      // ไม่บังคับ
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
    manuallyModified: false,          // ถ้าผู้ดูแลแก้ไข
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
  passedLOs: ["LO1", "LO2", "LO3"],   // รวมจากทุกแหล่ง
  loProgress: {                       // ติดตามความก้าวหน้า
    "LO1": { accumulatedScore: 15, targetScore: 20, attempts: 3, passed: true },
    "LO2": { accumulatedScore: 8, targetScore: 20, attempts: 2, passed: false }
  },
  worksheetAssessments: [             // จากใบงาน
    { worksheetId, submissionId, passedLOs, score, ... }
  ],
  lastAssessedAt: Timestamp,
  createdAt: Timestamp
}
```

---

## 12. รูปแบบการพัฒนา

### การเพิ่ม Cloud Function ใหม่

```javascript
// functions/index.js
exports.myNewFunction = functions.runWith({ 
  secrets: [openaiApiKey],
  timeoutSeconds: 60,
  memory: '512MB'
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // 1. ตรวจสอบ method
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' });
      }
      
      // 2. ดึง params
      const { param1, param2 } = req.body;
      
      // 3. ตรรกะของคุณที่นี่...
      
      // 4. ถ้าใช้ OpenAI ต้องทำความสะอาด response เสมอ
      const cleanedResult = cleanAIResponse(aiResponse);
      
      return res.status(200).send({ success: true, data: cleanedResult });
    } catch (error) {
      console.error('❌ Error:', error);
      return res.status(500).send({ error: error.message });
    }
  });
});
```

### การใช้ loProgress.js (จำเป็นสำหรับนับ LO)

```javascript
import { getStudentPassedLOs, getBatchStudentPassedLOs } from '@/utils/loProgress';

// นักเรียนคนเดียว
const { passedLOs, assessmentCount, worksheetCount } = 
  await getStudentPassedLOs(studentUid, courseId);

// หลายนักเรียน (รายงานครู)
const studentData = await getBatchStudentPassedLOs(studentUids, courseId);
// studentData[uid] = { passedLOs: [...], assessmentCount, worksheetCount }
```

### การ Export CSV กับอักขระภาษาไทย

```javascript
// ต้องใช้ BOM สำหรับ Thai CSV export เสมอ
const BOM = '\uFEFF';
const csvContent = 'ชื่อ,คะแนน\nนักเรียน1,15\nนักเรียน2,18';
const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
```

---

## 13. การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

| ปัญหา | สาเหตุ | วิธีแก้ |
|-------|-------|--------|
| JSON parse error จาก AI | GPT ครอบ JSON ด้วย markdown | ใช้ `cleanAIResponse()` |
| Firestore query ล้มเหลว | ขาด composite index | ตรวจสอบ Firebase Console → Firestore → Indexes |
| จำนวน LO ไม่ตรงกัน | ไม่ได้ใช้ loProgress.js | ใช้ `getStudentPassedLOs()` เสมอ |
| Thai CSV อ่านไม่ออก | ขาด BOM | เพิ่ม `\uFEFF` นำหน้า |
| Rate limit error | เรียก AI มากเกินไป | ตรวจสอบการตั้งค่า rate limiter |

### คำสั่ง Debug

```bash
# ดู function logs
firebase functions:log

# ดู function เฉพาะ
firebase functions:log --only assessAnswer

# เริ่ม emulators
firebase emulators:start

# ตรวจสอบ Firestore rules
firebase deploy --only firestore:rules --debug
```

### สิ่งที่ควรหลีกเลี่ยง

| ❌ อย่าทำ | ✅ ทำแทน |
|----------|---------|
| `JSON.parse(gptResponse)` โดยตรง | ใช้ `cleanAIResponse()` ก่อน |
| หลาย `where()` + `orderBy()` โดยไม่มี index | สร้าง composite index |
| `doc.data().count + 1` | ใช้ `FieldValue.increment(1)` |
| ส่ง `hasSolution: true` ให้นักเรียน | กรองในการเลือกคำถาม |
| Export Thai CSV โดยไม่มี BOM | เพิ่ม `\uFEFF` นำหน้า |
| ตรรกะนับ LO ต่างกันในแต่ละหน้า | ใช้ `loProgress.js` ทุกที่ |

---

## 14. ระบบนิเวศความน่าเชื่อถือ

### 🎯 ภาพรวม

HOTS AI ใช้ **ระบบนิเวศความน่าเชื่อถือ 8 ชั้น** เพื่อรับประกันความแม่นยำ ความสอดคล้อง และความน่าเชื่อถือของการประเมิน ออกแบบด้วยปรัชญา **ห่วงโซ่เหตุผล** ที่แต่ละชั้นตรวจสอบและเสริมชั้นถัดไป

### 📚 เอกสารประกอบ

| เอกสาร | วัตถุประสงค์ | ภาษา |
|--------|-------------|------|
| [RELIABILITY_ECOSYSTEM.md](RELIABILITY_ECOSYSTEM.md) | คู่มือทางเทคนิคฉบับสมบูรณ์ | อังกฤษ |
| [RELIABILITY_ECOSYSTEM_TH.md](RELIABILITY_ECOSYSTEM_TH.md) | คำอธิบายภาษาไทย | ไทย |

### 🔗 สถาปัตยกรรม 8 ชั้น

```
┌──────────────────────────────────────────────────────────────┐
│                   ระบบนิเวศความน่าเชื่อถือ                     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   ชั้น 1: ตรวจสอบข้อมูลนำเข้า    ─► aiParser.js              │
│   ชั้น 2: ความคงทนของ AI        ─► reliability.js           │
│   ชั้น 3: ความเที่ยงระหว่างผู้ประเมิน ─► interRaterReliability.js │
│   ชั้น 4: การศึกษาความตรง       ─► validationStudy.js       │
│   ชั้น 5: ตรวจสอบความเป็นธรรม   ─► fairnessAudit.js         │
│   ชั้น 6: ความสอดคล้องของข้อมูล  ─► dataConsistency.js       │
│   ชั้น 7: การตรวจสอบโดยมนุษย์   ─► humanInTheLoop.js        │
│   ชั้น 8: ปรับเทียบตามระดับชั้น   ─► gradeLevelCalibration.js │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 📊 ค่ามาตรฐานสำคัญ

| ตัวชี้วัด | ขั้นต่ำ | เป้าหมาย | ดีเยี่ยม |
|-----------|--------|----------|----------|
| Weighted Kappa (κw) | ≥ 0.60 | ≥ 0.70 | ≥ 0.80 |
| ICC (2,1) | ≥ 0.70 | ≥ 0.80 | ≥ 0.90 |
| MAE | ≤ 1.0 | ≤ 0.75 | ≤ 0.50 |
| Cronbach's Alpha | ≥ 0.70 | ≥ 0.80 | ≥ 0.90 |
| Effect Size (d) | ≤ 0.20 | ≤ 0.10 | ≤ 0.05 |

---

## 🔑 ไฟล์สำคัญอ้างอิง

| ไฟล์ | วัตถุประสงค์ | บรรทัด |
|------|-------------|--------|
| `functions/index.js` | Cloud Functions ทั้งหมด, AI prompts | ~9200 |
| `functions/utils/prompts.js` | แม่แบบ prompt แบบ modular | ~200 |
| `functions/utils/loAssessment.js` | ตรรกะประเมิน LO | ~150 |
| `functions/utils/aiParser.js` | ทำความสะอาด JSON response | ~100 |
| `functions/utils/reliability.js` | ความคงทน AI และ validation | ~500 |
| `functions/utils/interRaterReliability.js` | คำนวณ IRR | ~700 |
| `src/stores/chat.js` | จัดการ session, เลือกคำถาม | ~600 |
| `src/utils/loProgress.js` | **การนับ LO มาตรฐาน** | ~420 |
| `src/views/ChatView.vue` | หน้า chat หลัก | ~800 |
| `src/views/AdminLOManager.vue` | แก้ไข LO ผู้ดูแล | ~800 |
| `firestore.rules` | Security rules | ~150 |

---

## 📋 อ้างอิงด่วน

### URLs
- **Production**: https://hots-ai-d028b.web.app
- **Firebase Console**: https://console.firebase.google.com/project/hots-ai-d028b
- **Functions Region**: us-central1
- **Repository**: https://github.com/saengpech-sys/hots-ai

### คำสั่ง
```bash
# พัฒนา
npm run dev                    # Frontend dev server (5173)
cd functions && npm run serve  # Functions emulator

# Build & Deploy
npm run build                  # Build frontend
firebase deploy                # Deploy ทั้งหมด

# Debug
firebase functions:log         # ดู function logs
firebase emulators:start       # เริ่ม emulators ทั้งหมด
```

---

<div align="center">

**HOTS AI ChatLoop — คู่มือทางเทคนิค**

*เวอร์ชัน 5.2 | 22 ธันวาคม 2568*

</div>
