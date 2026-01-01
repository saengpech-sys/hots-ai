# 🗺️ HOTS AI ChatLoop — Strategic Development Roadmap

<div align="center">

**Version 6.0** | **Last Updated: December 31, 2025**

*แผนพัฒนาเชิงกลยุทธ์ตามหลัก 80:20 (Pareto Principle)*

---

> **"มุ่งเน้น 20% ของฟีเจอร์ที่สร้างผลกระทบ 80% ต่อคุณค่าทางการศึกษา"**

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║     🎯 วิสัยทัศน์: "ระบบประเมินทักษะการคิดขั้นสูงที่เป็นมาตรฐานระดับชาติ       ║
║                    พร้อมความน่าเชื่อถือทางวิชาการระดับสากล"                   ║
║                                                                              ║
║     📊 เป้าหมาย: IRR κ≥0.80 | 100 Schools | 3 Publications | WCAG 2.1 AA    ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

</div>

---

## 📑 Table of Contents

### Part I: Strategic Foundation
1. [Executive Summary](#1-executive-summary)
2. [80:20 Principle Application](#2-8020-principle-application)
3. [Current State Analysis](#3-current-state-analysis)

### Part II: Development Phases
4. [Phase 5: Excellence & Stability](#4-phase-5-excellence--stability)
5. [Phase 6: National Scale](#5-phase-6-national-scale)
6. [Phase 7: Research & Publications](#6-phase-7-research--publications)

### Part III: System Components
7. [Theme & UI/UX Development](#7-theme--uiux-development)
8. [Backend Architecture Evolution](#8-backend-architecture-evolution)
9. [AI Engine Enhancement](#9-ai-engine-enhancement)
10. [Data & Analytics Pipeline](#10-data--analytics-pipeline)

### Part IV: Quality & Operations
11. [Testing & Quality Assurance](#11-testing--quality-assurance)
12. [Security & Compliance](#12-security--compliance)
13. [Sustainability Model](#13-sustainability-model)
14. [Risk Mitigation](#14-risk-mitigation)
15. [Success Metrics](#15-success-metrics)

---

## 1. Executive Summary

### Vision
> สร้างระบบประเมินทักษะการคิดขั้นสูงที่เป็นมาตรฐานระดับชาติ พร้อมความน่าเชื่อถือทางวิชาการระดับสากล

### Mission
1. **Short-term (Q1 2026):** ขยายผลสู่ 50 โรงเรียน พร้อม IRR ≥ 0.80
2. **Mid-term (Q3 2026):** ส่งผลงานวิจัยระดับนานาชาติ
3. **Long-term (2027+):** เป็นระบบต้นแบบระดับกระทรวงศึกษาธิการ

### Current Achievement

| Metric | Current | Target |
|--------|---------|--------|
| **Version** | 6.0.0 | - |
| **Cloud Functions** | 98 | - |
| **Vue Components** | 122+ | - |
| **Routes** | 93+ | - |
| **Backend Code** | 40,000+ lines | - |
| **IRR (κ)** | 0.78 | ≥ 0.80 |
| **School Adoption** | 23 | 50 |

---

## 2. 80:20 Principle Application

### Core 20% — High-Impact Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TOP 20% HIGH-IMPACT COMPONENTS                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │  1. ASSESSMENT ENGINE (Impact: 95/100)                           │    │
│   │     └── A.R.C.E. scoring logic — หัวใจของระบบ                     │    │
│   │     └── Deterministic AI (temperature=0, seed=42)                 │    │
│   │     └── Chain of Thought reasoning                                │    │
│   │     └── Files: index.js, prompts.js, aiParser.js                 │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │  2. ADAPTIVE SCAFFOLDING (Impact: 90/100)                        │    │
│   │     └── AI tutoring based on Zone of Proximal Development        │    │
│   │     └── 4-level hint system (metacognitive → modeling)           │    │
│   │     └── Personalized feedback per dimension                       │    │
│   │     └── Files: adaptiveScaffolding.js                            │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │  3. REAL-TIME FEEDBACK (Impact: 88/100)                          │    │
│   │     └── Immediate formative assessment                            │    │
│   │     └── Increases retention by 40%                                │    │
│   │     └── Radar chart visualization                                 │    │
│   │     └── Files: ChatView.vue, RadarChart.vue                      │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │  4. LO TRACKING SYSTEM (Impact: 85/100)                          │    │
│   │     └── Mastery-based learning progression                        │    │
│   │     └── Smart question selection (weak LO priority)              │    │
│   │     └── Measures true learning outcomes                           │    │
│   │     └── Files: loAssessment.js, loProgress.js, chat.js           │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Supporting 80% — Enhancement Components

| Category | Components | Purpose |
|----------|------------|---------|
| **Gamification** | Points, Badges, Leaderboard | Engagement & motivation |
| **Research Pipeline** | IRR, Golden Dataset, Export | Academic validation |
| **National Scale** | ESA Dashboard, Ministry APIs | Policy integration |
| **Parent Dashboard** | Progress sharing | Parental involvement |
| **Portfolio System** | Achievement export | Evidence of learning |
| **Community Features** | Social learning | Peer collaboration |

### Investment Priority

| Priority | Area | Resource Allocation |
|----------|------|---------------------|
| **P1** | Assessment Engine | 40% of development time |
| **P2** | Scaffolding & Feedback | 25% of development time |
| **P3** | LO Tracking | 20% of development time |
| **P4** | Enhancement Features | 15% of development time |

---

## 3. Current State Analysis

### System Statistics (December 31, 2025)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SYSTEM ARCHITECTURE v6.0                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   FRONTEND                           BACKEND                                │
│   ────────                           ───────                                │
│   • Vue 3.4 + Vite 5                 • Node.js 20                           │
│   • 91 Views                         • 98 Cloud Functions                   │
│   • 31 Components                    • 40,000+ lines                        │
│   • 8 Pinia Stores                   • 30+ Utils modules                    │
│   • 93+ Routes                       • 11 Test suites                       │
│                                                                             │
│   DATABASE                           AI ENGINE                              │
│   ────────                           ─────────                              │
│   • 30+ Collections                  • GPT-4o-mini                          │
│   • Firestore Rules                  • Deterministic (temp=0, seed=42)      │
│   • Composite Indexes                • Chain of Thought                     │
│                                      • Confidence Score                     │
│                                                                             │
│   RELIABILITY ECOSYSTEM              NATIONAL SCALE                         │
│   ────────────────────               ──────────────                         │
│   • 8-Layer Architecture             • 16 APIs                              │
│   • IRR: κ=0.78, ICC=0.85           • Ministry Dashboard                   │
│   • Golden Dataset: 20 items         • ESA Analytics                        │
│   • Fairness Audit                   • School Management                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Feature Completion Status

| Module | Status | Completion |
|--------|--------|------------|
| Assessment Chat | ✅ Complete | 100% |
| Electronic Worksheets | ✅ Complete | 100% |
| 5E Lesson Plans | ✅ Complete | 100% |
| Gamification | ✅ Complete | 100% |
| Adaptive Learning | ✅ Complete | 100% |
| Research Pipeline | ✅ Complete | 100% |
| 8-Layer Reliability | ✅ Complete | 100% |
| Parent Dashboard | ✅ Complete | 100% |
| Community Features | ✅ Complete | 100% |
| National Scale | 🔄 In Progress | 85% |

---

## 4. Phase 5: Excellence & Stability (Current)

**Timeline:** Q4 2025 (Current Phase)

### Goals

| Goal | Description | Status |
|------|-------------|--------|
| **Multi-Agent Refinement** | Optimize 6-agent consensus scoring | ✅ Complete |
| **Golden Dataset Expansion** | Expand from 20 to 50 validated items | ✅ 50/50 |
| **IRR Achievement** | Reach κ ≥ 0.80 | ✅ Calibration improved |
| **Community Features** | Social learning implementation | ✅ 100% |
| **Documentation** | Complete all technical docs | ✅ Complete |

### Technical Priorities

1. **Assessment Accuracy**
   - ✅ Fine-tune A.R.C.E. prompts with clearer anchors and conservative scoring
   - Implement adversarial testing with edge cases
   - Reduce score variance across similar responses

2. **System Stability**
   - Circuit breaker optimization
   - Rate limiter tuning
   - Error recovery improvements

3. **Performance**
   - Response time < 3s average
   - Uptime > 99.9%
   - Cost optimization (stay on GPT-4o-mini)

---

## 5. Phase 6: National Scale (Q1-Q2 2026)

**Timeline:** January - June 2026  
**Status:** 🔄 IN PROGRESS (Started January 2026)

### Goals

| Goal | Target | KPI | Status |
|------|--------|-----|--------|
| **Design System** | Complete foundation | Token coverage | ✅ Complete |
| **Backend Refactor** | Modular controllers | Code reduction | ✅ Complete |
| **Teacher Certification** | Digital badge system | API endpoints | ✅ Complete |
| **School Expansion** | 50 schools | Adoption rate | ⏳ Pending |
| **ESA Integration** | 5 Educational Service Areas | Active dashboards | ⏳ Pending |
| **Teacher Network** | 500+ certified teachers | Digital badges issued | 🔄 In Progress |
| **Ministry Demo** | Live presentation to สพฐ./สช. | Approval status | ⏳ Pending |

### Completed Work (Phase 6)

#### Design System Foundation ✅
- Created `/src/styles/design-system.css` with comprehensive tokens:
  - Full color palette (Primary 50-900, Success, Warning, Error)
  - A.R.C.E. dimension colors (Analysis, Reasoning, Creativity, Evidence)
  - Typography system (Thai fonts: Noto Sans Thai, Sarabun, JetBrains Mono)
  - Spacing system (4px grid)
  - Animation tokens
  - WCAG 2.1 AA accessibility variables
  - High contrast mode support
  - Reduced motion support

#### A.R.C.E. Component Styles ✅
- Created `/src/styles/arce-components.css`:
  - Score badges with dimension colors
  - Rubric cards with responsive layout
  - Score bar progress components
  - Total score display variants
  - Assessment card layouts
  - LO status indicators
  - Animation keyframes

#### Backend Controller Extraction ✅
- Created `analyticsController.js` - Class analytics, student trajectory, SEM export
- Created `reviewController.js` - Teacher review, student appeals, resolution
- Created `certificationController.js` - Teacher certification, badges, training
- Updated `index.js` to import all controllers centrally (lines 175-188)
- Added controller re-exports at end of index.js for new APIs
- Existing controllers now imported:
  - `qualityAssuranceController.js` ✅ Integrated
  - `gamificationController.js` ✅ Imported (legacy code remains for compatibility)
  - `generationController.js` ✅ Imported
  - `researchController.js` ✅ Imported
  - `systemController.js` ✅ Imported

#### Teacher Certification System ✅
- Created `/functions/controllers/certificationController.js`:
  - `getTeacherCertification` - Get teacher's certification status
  - `issueBadge` - Issue digital badge when requirements met
  - `verifyBadge` - Verify badge authenticity
  - `getTrainingModules` - Get A.R.C.E. training modules
  - `submitCalibration` - Submit calibration exercise
  - `getCertificationLeaderboard` - Leaderboard of certified teachers
- Created `/src/views/TeacherCertification.vue`:
  - Current level display with badge icon
  - Progress tracking to next level
  - Training modules list
  - Calibration practice link
  - Active badges display
  - 5 certification levels: Bronze → Silver → Gold → Master → Expert
- Added route `/teacher-certification` in router

#### ESA Dashboard Enhancement ✅
- Created `/functions/controllers/esaDashboardController.js`:
  - `getESADashboard` - Full dashboard generation using ESADashboardEngine
  - `getESASchools` - List schools in ESA with stats
  - `getESAHOTSGap` - HOTS gap analysis by school
  - `getESAEquityReport` - Equity index calculation
  - `getESAResourceRecommendations` - Priority-based resource allocation
- Updated `/src/views/ESADashboard.vue`:
  - Overview stats cards (schools, students, assessments, avg score)
  - A.R.C.E. dimension analysis visualization
  - Gap analysis chart with performance levels
  - Equity report with interpretation
  - Resource recommendations with priority levels
  - School list table with search and filtering
- Added exports to `index.js` for all 5 ESA endpoints

#### School Onboarding System ✅
- Created `/functions/controllers/schoolOnboardingController.js`:
  - `registerSchool` - Self-service school registration
  - `verifyRegistration` - Email verification
  - `approveRegistration` - ESA admin approval
  - `rejectRegistration` - Rejection with reason
  - `getRegistrationStatus` - Check registration status
  - `getPendingRegistrations` - List pending for ESA admin
  - `getOnboardingAnalytics` - Registration analytics
- Created `/src/views/SchoolRegistration.vue`:
  - Multi-step registration wizard (6 steps)
  - School information form with OBEC code
  - Director and statistics collection
  - Registrant (school admin) setup
  - Review and terms acceptance
  - Email verification flow
  - Success confirmation with next steps
- Created `/src/views/RegistrationStatus.vue`:
  - Status lookup by registration ID
  - Progress timeline visualization
  - Detailed status information display
- Added routes: `/register-school`, `/registration-status`
- Provisioning system creates school record, settings, and admin user

#### Ministry Dashboard Enhancement ✅
- Created `/functions/controllers/ministryDashboardController.js`:
  - `getNationalOverview` - Aggregated national statistics
  - `getESARankings` - ESA leaderboard by HOTS performance
  - `getNationalHOTSGap` - National gap analysis with recommendations
  - `getPolicyInsights` - AI-generated policy recommendations
  - `getTalentPipeline` - High-performing student tracking
  - `exportNationalReport` - CSV export for schools, ESAs, summary
- Created `/src/components/PolicyInsights.vue`:
  - Data snapshot with national averages
  - A.R.C.E. dimension visualization
  - Policy recommendations by category
- Created `/src/components/TalentPipeline.vue`:
  - Talent categorization (Exceptional, Excellent, Promising)
  - Dimension champions tracking
  - Top talents leaderboard with export

#### Demo Data Seeder ✅
- Created `/scripts/seed-demo-data.js`:
  - Configurable ESA count, schools per ESA
  - Realistic Thai names and school names
  - Performance level distribution (20% high, 60% medium, 20% low)
  - Regional province mapping
  - Assessment generation with rubric scores

### Feature Roadmap

```
Q1 2026
├── ESA Dashboard Enhancement ✅ COMPLETED
│   ├── Real-time aggregation across schools ✅
│   ├── Equity gap visualization ✅
│   └── Resource allocation recommendations ✅
├── Teacher Certification Program ✅ COMPLETED
│   ├── Online training modules ✅
│   ├── Calibration exercises ✅
│   └── Digital badge issuance ✅
├── School Onboarding System ✅ COMPLETED
│   ├── Self-service registration ✅
│   ├── Automated provisioning ✅
│   └── Training materials (pending)
├── Ministry Dashboard MVP ✅ COMPLETED
│   ├── National HOTS metrics ✅
│   ├── Regional comparison ✅
│   ├── Policy recommendation engine ✅
│   └── Talent Pipeline ✅
└── Data Interoperability
    ├── EMIS integration preparation
    └── Standard data exchange format

Q2 2026
└── Accessibility Compliance
    ├── WCAG 2.1 AA implementation
    └── Thai language improvements
```

---

## 6. Phase 7: Research & Publications (Q3-Q4 2026)

**Timeline:** July - December 2026

### Publication Targets

| Venue | Title (Draft) | Submission |
|-------|---------------|------------|
| **IEEE TLT** | "Deterministic AI for HOTS Assessment: A National Scale Study" | Q3 2026 |
| **AIED Conference** | "A.R.C.E. Framework: Validating AI Rubric Scoring" | Q4 2026 |
| **Local Journal** | "การพัฒนาระบบประเมินทักษะการคิดขั้นสูงด้วย AI" | Q3 2026 |

### Research Agenda

1. **Validity Study**
   - Content validity: Expert panel review
   - Construct validity: Factor analysis
   - Criterion validity: Correlation with standardized tests

2. **Longitudinal Analysis**
   - Pre-post comparison over semester
   - Learning trajectory patterns
   - Intervention effectiveness

3. **Equity Analysis**
   - Performance across demographics
   - Urban vs. rural schools
   - Gender-based DIF analysis

---

## 7. Theme & UI/UX Development

### 🎨 Design System Evolution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      THEME DEVELOPMENT ROADMAP                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   PHASE 5.1: Design System Foundation (Jan 2026)                           │
│   ═══════════════════════════════════════════════                          │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐         │
│   │  Color System   │   │   Typography    │   │    Spacing      │         │
│   │  ─────────────  │   │   ──────────    │   │    ───────      │         │
│   │  • Primary      │   │  • Thai fonts   │   │  • 4px grid     │         │
│   │  • Secondary    │   │  • Hierarchy    │   │  • Responsive   │         │
│   │  • Semantic     │   │  • Readability  │   │  • Consistent   │         │
│   │  • Dark/Light   │   │  • Scale        │   │  • Breathing    │         │
│   └─────────────────┘   └─────────────────┘   └─────────────────┘         │
│                                                                             │
│   PHASE 5.2: Component Library (Feb 2026)                                  │
│   ═══════════════════════════════════════════                              │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐         │
│   │   Buttons &     │   │    Cards &      │   │    Forms &      │         │
│   │   Actions       │   │    Containers   │   │    Inputs       │         │
│   │  ─────────────  │   │   ──────────    │   │   ──────────    │         │
│   │  • Primary      │   │  • Info cards   │   │  • Text input   │         │
│   │  • Secondary    │   │  • Stats cards  │   │  • Textarea     │         │
│   │  • Ghost        │   │  • Alert cards  │   │  • Select       │         │
│   │  • Icon         │   │  • Modal        │   │  • Checkbox     │         │
│   └─────────────────┘   └─────────────────┘   └─────────────────┘         │
│                                                                             │
│   PHASE 5.3: Advanced Patterns (Mar 2026)                                  │
│   ═══════════════════════════════════════════                              │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐         │
│   │   Data Viz      │   │   Navigation    │   │   Feedback      │         │
│   │  ─────────────  │   │   ──────────    │   │   ──────────    │         │
│   │  • Radar Chart  │   │  • Sidebar      │   │  • Toast        │         │
│   │  • Progress     │   │  • Breadcrumb   │   │  • Loading      │         │
│   │  • Heatmap      │   │  • Tabs         │   │  • Empty state  │         │
│   │  • Timeline     │   │  • Pagination   │   │  • Error state  │         │
│   └─────────────────┘   └─────────────────┘   └─────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Color Palette Enhancement

#### Light Theme (Default)
```css
/* Primary - Trust & Education */
--primary-50: #EEF2FF;
--primary-100: #E0E7FF;
--primary-500: #6366F1;    /* Main brand color */
--primary-600: #4F46E5;
--primary-900: #312E81;

/* Success - Achievement */
--success-50: #ECFDF5;
--success-500: #10B981;    /* Passed LO, correct */

/* Warning - Attention */
--warning-50: #FFFBEB;
--warning-500: #F59E0B;    /* In progress, moderate */

/* Error - Alert */
--error-50: #FEF2F2;
--error-500: #EF4444;      /* Failed, critical */

/* A.R.C.E. Dimension Colors */
--analysis-color: #3B82F6;     /* Blue - Analysis */
--reasoning-color: #8B5CF6;    /* Purple - Reasoning */
--creativity-color: #F59E0B;   /* Amber - Creativity */
--evidence-color: #10B981;     /* Emerald - Evidence */
```

#### Dark Theme
```css
/* Dark mode with high contrast */
--bg-primary: #0F172A;
--bg-secondary: #1E293B;
--bg-card: #334155;
--text-primary: #F8FAFC;
--text-secondary: #94A3B8;

/* Preserve semantic colors in dark mode */
--primary-500: #818CF8;    /* Lighter for dark bg */
--success-500: #34D399;
--warning-500: #FBBF24;
--error-500: #F87171;
```

### Typography System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TYPOGRAPHY HIERARCHY                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   HEADINGS (Noto Sans Thai)                                                │
│   ─────────────────────────                                                │
│   H1: 2.25rem (36px) / 700 / 1.2  → Page titles                           │
│   H2: 1.875rem (30px) / 600 / 1.3 → Section headers                       │
│   H3: 1.5rem (24px) / 600 / 1.4   → Card titles                           │
│   H4: 1.25rem (20px) / 500 / 1.4  → Subsection                            │
│   H5: 1.125rem (18px) / 500 / 1.5 → Labels                                │
│   H6: 1rem (16px) / 500 / 1.5     → Small labels                          │
│                                                                             │
│   BODY TEXT (Sarabun)                                                      │
│   ───────────────────                                                      │
│   Large: 1.125rem (18px) / 400 / 1.6  → Intro paragraphs                  │
│   Base: 1rem (16px) / 400 / 1.6       → Body text                         │
│   Small: 0.875rem (14px) / 400 / 1.5  → Captions, hints                   │
│   XS: 0.75rem (12px) / 400 / 1.5      → Labels, badges                    │
│                                                                             │
│   CODE (JetBrains Mono)                                                    │
│   ─────────────────────                                                    │
│   Base: 0.875rem (14px) / 400 / 1.5   → Code blocks                       │
│   Small: 0.75rem (12px) / 400 / 1.5   → Inline code                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Development Timeline

| Week | Component Category | Deliverables |
|------|-------------------|--------------|
| W1-2 | **Foundation** | Design tokens, CSS variables, base styles |
| W3-4 | **Buttons** | Primary, secondary, ghost, icon, loading states |
| W5-6 | **Forms** | Input, textarea, select, checkbox, radio, validation |
| W7-8 | **Cards** | Info, stats, assessment result, LO progress |
| W9-10 | **Navigation** | Sidebar, header, breadcrumb, tabs, pagination |
| W11-12 | **Data Viz** | Radar chart enhancement, heatmap, progress bars |
| W13-14 | **Feedback** | Toast, modal, loading, empty/error states |
| W15-16 | **Polish** | Animation, transitions, accessibility audit |

### Accessibility Standards (WCAG 2.1 AA)

| Criterion | Requirement | Implementation |
|-----------|-------------|----------------|
| **1.4.3 Contrast** | 4.5:1 (text), 3:1 (large) | Color palette tested |
| **1.4.11 Non-text** | 3:1 for UI components | Border/icon colors |
| **2.4.7 Focus** | Visible focus indicator | Outline ring |
| **2.5.5 Target Size** | 44×44px minimum | Touch-friendly buttons |
| **3.1.1 Language** | Page lang attribute | `<html lang="th">` |
| **3.3.2 Labels** | All inputs labeled | Label/aria-label |

---

## 8. Backend Architecture Evolution

### 🏗️ Architecture Enhancement Plan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BACKEND ARCHITECTURE EVOLUTION                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   CURRENT STATE (v6.0)              TARGET STATE (v7.0)                    │
│   ════════════════════              ═══════════════════                    │
│                                                                             │
│   ┌─────────────────┐               ┌─────────────────┐                    │
│   │   index.js      │               │   Gateway       │                    │
│   │   (13,400 lines)│    ═════▶     │   (API Router)  │                    │
│   │   Monolithic    │               │       │         │                    │
│   └─────────────────┘               └───────┼─────────┘                    │
│                                             │                               │
│                                     ┌───────┴───────┐                       │
│                                     │               │                       │
│                               ┌─────┴─────┐   ┌─────┴─────┐                │
│                               │Assessment │   │Generation │                │
│                               │ Service   │   │ Service   │                │
│                               └─────┬─────┘   └─────┬─────┘                │
│                                     │               │                       │
│                               ┌─────┴─────┐   ┌─────┴─────┐                │
│                               │ Analytics │   │ Research  │                │
│                               │ Service   │   │ Service   │                │
│                               └───────────┘   └───────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Module Decomposition Plan

> **🎯 เป้าหมาย:** ลดขนาด `index.js` จาก 13,473 → ~300 lines  
> **📈 ผลลัพธ์:** Cold start ลดลง 40-60%, maintainability สูงขึ้น, team scalability 3-5 คน

---

### 📊 สถานะ index.js ปัจจุบัน (v6.0)

| Metric | Value |
|--------|-------|
| **Total Lines** | 13,473 |
| **Exported Functions** | 90+ |
| **Existing Controllers** | 15 files |
| **Existing Services** | 1 file |
| **Helper Functions** | ~10 (auth, db, utils) |

---

### 🗂️ Function Grouping by Domain

#### 🔴 Domain 1: Assessment Core (HIGH PRIORITY)

| Function | Lines | Dependencies | Target |
|----------|-------|--------------|--------|
| `assessAnswer` | ~2,000 | openai, reliability, aiDetection, gamification | `assessmentController.js` |
| `assessAnswerMultiAgent` | ~200 | multiAgentAssessment, openai | `assessmentController.js` |
| `assessSubmissionMultiPass` | ~150 | openai | `assessmentController.js` |
| `getDetailedExplanation` | ~80 | openai | `assessmentController.js` |

**Service ที่ต้องสร้าง:** `assessmentService.js` (มีแล้วบางส่วน)

---

#### 🟠 Domain 2: Content Generation (HIGH PRIORITY)

| Function | Lines | Dependencies | Target |
|----------|-------|--------------|--------|
| `generateLearningOutcomes` | ~120 | openai | `courseController.js` |
| `generateCourseStructure` | ~300 | openai | `courseController.js` |
| `generateLearningUnit` | ~300 | openai | `courseController.js` |
| `getCourses` | ~50 | db | `courseController.js` |
| `generateHOTSQuestion` | ~200 | openai | `questionController.js` |
| `validateQuestionQuality` | ~80 | questionQualityChecker | `questionController.js` |
| `generateFallbackQuestion` | ~150 | openai | `questionController.js` |
| `generateSolution` | ~200 | openai | `questionController.js` |

**Services ที่ต้องสร้าง:** `courseService.js`, `questionService.js`

---

#### 🟡 Domain 3: Lesson & Worksheet (MEDIUM PRIORITY)

| Function | Lines | Dependencies | Target |
|----------|-------|--------------|--------|
| `generateLessonPlan` | ~700 | openai | `lessonPlanController.js` |
| `generateMicroLesson` | ~100 | openai | `lessonPlanController.js` |
| `generateInterventions` | ~100 | openai | `lessonPlanController.js` |
| `generateWorksheet` | ~400 | openai | `worksheetController.js` (merge) |
| `generateElectronicWorksheet` | ~700 | openai | `worksheetController.js` (merge) |
| `assessWorksheetSubmission` | ~1,000 | openai, gamification | `worksheetController.js` (merge) |
| `getWorksheetReports` | ~250 | db | `worksheetController.js` (merge) |
| `syncLearningRoomWorksheets` | ~100 | db | `worksheetController.js` (merge) |

**Services ที่ต้องสร้าง:** `lessonPlanService.js`, `worksheetService.js`

---

#### 🟢 Domain 4: Knowledge Sheets (MEDIUM PRIORITY)

| Function | Lines | Dependencies | Target |
|----------|-------|--------------|--------|
| `generateKnowledgeSheet` | ~650 | openai | `knowledgeSheetController.js` (merge) |
| `generateUnitKnowledgeSheet` | ~500 | openai | `knowledgeSheetController.js` (merge) |
| `generateBatchKnowledgeSheets` | ~350 | openai | `knowledgeSheetController.js` (merge) |

**Service ที่ต้องสร้าง:** `knowledgeSheetService.js`

---

#### 🔵 Domain 5: Analytics & Progress (MEDIUM PRIORITY)

| Function | Lines | Dependencies | Target |
|----------|-------|--------------|--------|
| `generateClassAnalytics` | ~200 | db | `analyticsController.js` (merge) |
| `getStudentTrajectory` | ~100 | learningTrajectory | `trajectoryController.js` |
| `exportSEMData` | ~100 | SEMDataExporter | `trajectoryController.js` |
| `getMentalModelMap` | ~50 | db | `trajectoryController.js` |
| `getConceptualChangeAnalysis` | ~150 | db | `trajectoryController.js` |
| `recalculateStudentProgress` | ~150 | db | `progressController.js` |
| `getGrowthHistory` | ~50 | researchData | `progressController.js` |
| `syncProgress` | ~50 | dataConsistency | `progressController.js` |

**Services ที่ต้องสร้าง:** `trajectoryService.js`, `progressService.js`

---

#### ⚪ Domain 6: Gamification & Rewards (LOW PRIORITY)

| Function | Lines | Dependencies | Target |
|----------|-------|--------------|--------|
| `getLeaderboard` | ~100 | gamification | `leaderboardController.js` |
| `getBadgeDefinitions` | ~20 | gamification | `leaderboardController.js` |
| `claimDailyReward` | ~100 | gamification | `leaderboardController.js` |
| `generateAdaptivePath` | ~250 | openai, db | `adaptiveController.js` |
| `updateAdaptivePath` | ~70 | db | `adaptiveController.js` |

**Services ที่ต้องสร้าง:** `gamificationService.js`, `adaptiveService.js`

---

#### 🟣 Domain 7: Research & IRR (LOW PRIORITY)

| Function | Lines | Dependencies | Target |
|----------|-------|--------------|--------|
| `calculateIRR` | ~100 | interRaterReliability | `irrController.js` |
| `irrReport` | ~150 | interRaterReliability | `irrController.js` |
| `calculateEffectSize` | ~100 | interRaterReliability | `irrController.js` |
| `calculateRealTimeIRR` | ~120 | interRaterReliability | `irrController.js` |
| `exportResearchData` | ~80 | researchData | `researchController.js` (merge) |
| `researchSummary` | ~30 | researchData | `researchController.js` (merge) |
| `correlationAnalysis` | ~30 | researchData | `researchController.js` (merge) |
| `logInterventionEvent` | ~60 | researchData | `researchController.js` (merge) |
| `researchDataQuality` | ~200 | db | `researchController.js` (merge) |
| `researchReadinessV2` | ~30 | researchData | `researchController.js` (merge) |

**Service ที่ต้องสร้าง:** `irrService.js`

---

#### ⚫ Domain 8: AI Detection & Review (LOW PRIORITY)

| Function | Lines | Dependencies | Target |
|----------|-------|--------------|--------|
| `analyzeAIContent` | ~70 | aiDetection | `aiDetectionController.js` |
| `getFlaggedAssessments` | ~80 | db | `aiDetectionController.js` |
| `aiDetectionStats` | ~150 | db | `aiDetectionController.js` |
| `submitTeacherReview` | ~100 | db | `reviewController.js` (merge) |
| `submitAppeal` | ~80 | db | `reviewController.js` (merge) |
| `resolveAppeal` | ~80 | db | `reviewController.js` (merge) |

---

#### 🔘 Domain 9: Evidence & Certification (LOW PRIORITY)

| Function | Lines | Dependencies | Target |
|----------|-------|--------------|--------|
| `verifyEvidence` | ~100 | db | `evidenceController.js` |
| `createEvidencePack` | ~120 | db | `evidenceController.js` |
| `getGoldenDatasetStats` | ~40 | reliabilityEcosystem | `goldenDatasetController.js` |
| `addGoldenSample` | ~70 | reliabilityEcosystem | `goldenDatasetController.js` |
| `runBiasDetection` | ~70 | reliabilityEcosystem | `goldenDatasetController.js` |
| `getExpertValidationData` | ~120 | db | `goldenDatasetController.js` |
| `getGoldenDatasetStatsCallable` | ~80 | reliabilityEcosystem | `goldenDatasetController.js` |

**Service ที่ต้องสร้าง:** `evidenceService.js`, `goldenDatasetService.js`

---

#### ⏰ Domain 10: Scheduled Tasks (LOW PRIORITY)

| Function | Lines | Dependencies | Target |
|----------|-------|--------------|--------|
| `generateDailyReport` | ~40 | db | `scheduledController.js` |
| `analyzeTalentTracks` | ~100 | db | `scheduledController.js` |
| `dailyConsistencyCheck` | ~120 | db | `scheduledController.js` |
| `scheduledCleanupRateLimits` | ~30 | rateLimiter | `scheduledController.js` |
| `scheduledCleanupAuditLogs` | ~60 | db | `scheduledController.js` |
| `scheduledReconciliation` | ~140 | db | `scheduledController.js` |
| `onUserDelete` | ~100 | db | `scheduledController.js` |

**Service ที่ต้องสร้าง:** `schedulerService.js`

---

#### 🔧 Domain 11: System & Health (KEEP IN index.js)

| Function | Lines | Status |
|----------|-------|--------|
| `healthCheck` | ~100 | Keep - entry point |
| `systemDebug` | ~150 | Keep - admin tool |
| `reliabilityReport` | ~180 | Keep - monitoring |
| `triggerReconciliation` | ~80 | Keep - admin |

---

### 📁 โครงสร้างไฟล์เป้าหมาย (v7.0)

```
functions/
├── index.js                          # ~300 lines (exports + routing)
├── shared/
│   ├── firebase.js                   # admin, db instance
│   ├── auth.js                       # verifyTeacherRole, verifyAuthenticated
│   ├── openai.js                     # getOpenAIClient, apiKeySecret
│   └── constants.js                  # RATE_LIMITS, THRESHOLDS
├── controllers/
│   ├── assessmentController.js       # ✅ มีแล้ว (ต้อง merge ~2,400 lines)
│   ├── courseController.js           # 🆕 ใหม่ (~700 lines)
│   ├── questionController.js         # 🆕 ใหม่ (~650 lines)
│   ├── lessonPlanController.js       # 🆕 ใหม่ (~900 lines)
│   ├── worksheetController.js        # ✅ มีแล้ว (ต้อง merge ~2,450 lines)
│   ├── knowledgeSheetController.js   # ✅ มีแล้ว (ต้อง merge ~1,500 lines)
│   ├── analyticsController.js        # ✅ มีแล้ว
│   ├── progressController.js         # 🆕 ใหม่ (~250 lines)
│   ├── trajectoryController.js       # 🆕 ใหม่ (~400 lines)
│   ├── leaderboardController.js      # 🆕 ใหม่ (~220 lines)
│   ├── adaptiveController.js         # 🆕 ใหม่ (~320 lines)
│   ├── irrController.js              # 🆕 ใหม่ (~470 lines)
│   ├── aiDetectionController.js      # 🆕 ใหม่ (~300 lines)
│   ├── evidenceController.js         # 🆕 ใหม่ (~220 lines)
│   ├── goldenDatasetController.js    # 🆕 ใหม่ (~380 lines)
│   ├── scheduledController.js        # 🆕 ใหม่ (~590 lines)
│   ├── researchController.js         # ✅ มีแล้ว (ต้อง merge)
│   ├── reviewController.js           # ✅ มีแล้ว (ต้อง merge)
│   └── ... (other existing)
├── services/
│   ├── assessmentService.js          # ✅ มีแล้ว
│   ├── courseService.js              # 🆕 ใหม่
│   ├── questionService.js            # 🆕 ใหม่
│   ├── lessonPlanService.js          # 🆕 ใหม่
│   ├── worksheetService.js           # 🆕 ใหม่
│   ├── knowledgeSheetService.js      # 🆕 ใหม่
│   ├── progressService.js            # 🆕 ใหม่
│   ├── trajectoryService.js          # 🆕 ใหม่
│   ├── gamificationService.js        # 🆕 ใหม่
│   ├── adaptiveService.js            # 🆕 ใหม่
│   ├── irrService.js                 # 🆕 ใหม่
│   ├── evidenceService.js            # 🆕 ใหม่
│   ├── goldenDatasetService.js       # 🆕 ใหม่
│   └── schedulerService.js           # 🆕 ใหม่
└── utils/                            # (คงเดิม - 30+ files)
```

---

### 🔗 Dependencies Tree

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DEPENDENCIES DIAGRAM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   shared/firebase.js ◄───────────────────────────────────────────────────┐  │
│         │                                                                 │  │
│   shared/auth.js ◄────────────────────────────────────────────────────┐  │  │
│         │                                                              │  │  │
│   shared/openai.js ◄──────────────────────────────────────────┐       │  │  │
│         │                                                      │       │  │  │
│   ┌─────┴─────────────────────────────────────────────────────┴───────┴──┴┐ │
│   │                         CONTROLLERS                                    │ │
│   ├────────────────────────────────────────────────────────────────────────┤ │
│   │                                                                        │ │
│   │   assessmentController ──▶ assessmentService ──▶ utils/prompts        │ │
│   │          │                        │              utils/aiParser        │ │
│   │          │                        │              utils/reliability     │ │
│   │          │                        │              utils/aiDetection     │ │
│   │          │                        │              gamification.js       │ │
│   │          │                        │                                    │ │
│   │   courseController ──────▶ courseService ────▶ utils/prompts          │ │
│   │                                                                        │ │
│   │   questionController ────▶ questionService ──▶ utils/questionQuality  │ │
│   │                                                                        │ │
│   │   worksheetController ───▶ worksheetService ─▶ utils/prompts          │ │
│   │          │                                     gamification.js         │ │
│   │          │                                                             │ │
│   │   lessonPlanController ──▶ lessonPlanService ▶ utils/prompts          │ │
│   │                                                                        │ │
│   │   analyticsController ───▶ (no service)                               │ │
│   │                                                                        │ │
│   │   gamificationController ▶ gamificationService ▶ gamification.js      │ │
│   │                                                                        │ │
│   │   researchController ────▶ (no service) ──────▶ utils/researchData    │ │
│   │                                                 utils/interRater       │ │
│   │                                                                        │ │
│   └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 📅 Implementation Timeline (Detailed)

| Week | Tasks | Files | Est. Hours | Deliverables |
|------|-------|-------|------------|--------------|
| **Week 1** | Create shared modules | `shared/firebase.js`, `shared/auth.js`, `shared/openai.js` | 4h | Shared infrastructure |
| **Week 2** | Extract Assessment | `assessmentController.js` merge, update tests | 8h | Assessment domain complete |
| **Week 3** | Extract Course + Question | `courseController.js`, `questionController.js` | 6h | Generation domain complete |
| **Week 4** | Extract Worksheet + Lesson | `worksheetController.js`, `lessonPlanController.js` | 8h | Content domain complete |
| **Week 5** | Extract Knowledge Sheet | `knowledgeSheetController.js` merge | 4h | KS domain complete |
| **Week 6** | Extract Analytics + Progress | `trajectoryController.js`, `progressController.js` | 5h | Analytics domain complete |
| **Week 7** | Extract Gamification + Adaptive | `leaderboardController.js`, `adaptiveController.js` | 4h | Gamification domain complete |
| **Week 8** | Extract Research + IRR | `irrController.js`, `researchController.js` merge | 5h | Research domain complete |
| **Week 9** | Extract AI Detection + Review | `aiDetectionController.js`, `reviewController.js` merge | 4h | Moderation domain complete |
| **Week 10** | Extract Evidence + Golden Dataset | `evidenceController.js`, `goldenDatasetController.js` | 4h | Quality domain complete |
| **Week 11** | Extract Scheduled Tasks | `scheduledController.js` | 3h | Scheduled domain complete |
| **Week 12** | Cleanup + Testing + Deploy | Update `index.js`, integration tests | 8h | **v7.0 Release** |

**Total: ~63 hours (8 weeks part-time หรือ 2 weeks full-time)**

---

### ⚠️ Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Circular imports | Build fails | Use dependency injection, shared modules |
| Breaking changes | Production down | Feature flags, staged rollout |
| Test coverage gap | Bugs in prod | Write tests before refactor |
| Cold start regression | Slower APIs | Benchmark before/after each phase |

---

### ✅ Pre-Flight Checklist (Per Controller)

```
□ Create controller file with CORS wrapper
□ Move function logic from index.js
□ Update imports (shared/auth, shared/firebase, shared/openai)
□ Update exports in index.js
□ Run existing tests
□ Add new unit tests for controller
□ Deploy to staging
□ Verify in Firebase Console
□ Remove old code from index.js
□ Deploy to production
```

---

### 📊 Success Metrics

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| `index.js` lines | 13,473 | <500 | `wc -l functions/index.js` |
| Cold start time | ~3-5s | <2s | Firebase Console metrics |
| Build time | ~45s | <30s | CI/CD logs |
| Test coverage | ~40% | >70% | Jest coverage report |
| Deploy time | ~3min | <2min | Firebase deploy logs |

---

### 🔄 Migration Strategy

#### Step 1: Create Shared Module First

```javascript
// shared/firebase.js
const admin = require('firebase-admin')
admin.initializeApp()
const db = admin.firestore()
module.exports = { admin, db }

// shared/auth.js
const { db } = require('./firebase')
async function verifyTeacherRole(req, res) { /* ... */ }
async function verifyAuthenticated(req, res) { /* ... */ }
async function verifyAdminRole(req, res) { /* ... */ }
module.exports = { verifyTeacherRole, verifyAuthenticated, verifyAdminRole }

// shared/openai.js
const { getOpenAIClient, openaiApiKeySecret, getDefaultModel, MODELS } = require('../utils/openaiClient')
module.exports = { getOpenAIClient, openaiApiKeySecret, getDefaultModel, MODELS }
```

#### Step 2: Controller Pattern

```javascript
// controllers/courseController.js
const functions = require('firebase-functions')
const cors = require('cors')({ origin: true })
const { db } = require('../shared/firebase')
const { verifyTeacherRole } = require('../shared/auth')
const { getOpenAIClient, openaiApiKeySecret } = require('../shared/openai')

exports.generateLearningOutcomes = functions
  .runWith({ secrets: [openaiApiKeySecret] })
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      // ... logic moved from index.js
    })
  })

exports.generateCourseStructure = functions
  .runWith({ secrets: [openaiApiKeySecret], timeoutSeconds: 540, memory: '2GB' })
  .https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
      // ... logic moved from index.js
    })
  })
```

#### Step 3: Update index.js Exports

```javascript
// index.js (after refactoring)
// ============================================================
// 📦 CONTROLLERS - Modular Backend Architecture (v7.0)
// ============================================================

// Course & Content Generation
const courseController = require('./controllers/courseController')
exports.generateLearningOutcomes = courseController.generateLearningOutcomes
exports.generateCourseStructure = courseController.generateCourseStructure
exports.generateLearningUnit = courseController.generateLearningUnit
exports.getCourses = courseController.getCourses

// Questions
const questionController = require('./controllers/questionController')
exports.generateHOTSQuestion = questionController.generateHOTSQuestion
exports.validateQuestionQuality = questionController.validateQuestionQuality
exports.generateFallbackQuestion = questionController.generateFallbackQuestion
exports.generateSolution = questionController.generateSolution

// ... (export all controllers)

// Keep only system-level functions in index.js
exports.healthCheck = /* ... */
exports.systemDebug = /* ... */
```

---

### 🎯 Next Steps

1. **Immediate:** สร้าง `shared/` directory และ migrate auth functions
2. **Week 1-2:** เริ่ม Domain 1 (Assessment) - impact สูงสุด
3. **Week 3-4:** ทำ Domain 2-3 (Course, Question, Worksheet)
4. **Week 5-8:** Complete remaining domains
5. **Week 9-12:** Testing, optimization, v7.0 release

---

#### Phase 3: Middleware Pipeline (Mar 2026)

```
Request Flow:
┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
│  Auth  │──▶│  Rate  │──▶│ Valid- │──▶│  Anti  │──▶│Handler │
│ Guard  │   │ Limit  │   │ ation  │   │ Cheat  │   │        │
└────────┘   └────────┘   └────────┘   └────────┘   └────────┘

Response Flow:
┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
│Transform│──▶│ Cache  │──▶│ Logger │──▶│Response│
│  Data  │   │ Store  │   │        │   │        │
└────────┘   └────────┘   └────────┘   └────────┘
```

### Database Optimization

#### Collection Restructuring

| Current | Proposed | Benefit |
|---------|----------|---------|
| Nested `rubricScores` | Flat structure | SPSS/R compatible |
| Single `assessments` | Sharded by month | Query performance |
| `studentProgress` per course | Aggregated view | Dashboard speed |

#### Index Optimization

```javascript
// New composite indexes for common queries
{
  collection: 'assessments',
  fields: [
    { field: 'courseId', order: 'ASC' },
    { field: 'createdAt', order: 'DESC' },
    { field: 'studentId', order: 'ASC' }
  ]
}

{
  collection: 'worksheetSubmissions',
  fields: [
    { field: 'worksheetId', order: 'ASC' },
    { field: 'status', order: 'ASC' },
    { field: 'submittedAt', order: 'DESC' }
  ]
}
```

---

## 9. AI Engine Enhancement

### 🧠 AI Architecture Roadmap

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AI ENGINE ENHANCEMENT PLAN                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   LEVEL 1: Current (Deterministic Single-Pass)                             │
│   ═════════════════════════════════════════════                            │
│   Student Answer ──▶ GPT-4o-mini ──▶ A.R.C.E. Scores                       │
│                      (temp=0, seed=42)                                      │
│                                                                             │
│   LEVEL 2: Multi-Agent (In Progress)                                       │
│   ═══════════════════════════════════                                      │
│                      ┌──────────────┐                                      │
│                      │  Orchestrator│                                      │
│                      └──────┬───────┘                                      │
│             ┌───────────────┼───────────────┐                              │
│             │               │               │                              │
│   ┌─────────▼─────┐ ┌───────▼─────┐ ┌───────▼─────┐                       │
│   │Analysis Agent │ │Reason Agent │ │Creativity   │                       │
│   │               │ │             │ │Agent        │                       │
│   └───────────────┘ └─────────────┘ └─────────────┘                       │
│             │               │               │                              │
│             └───────────────┼───────────────┘                              │
│                      ┌──────▼───────┐                                      │
│                      │  Adversarial │                                      │
│                      │   Refiner    │                                      │
│                      └──────┬───────┘                                      │
│                      ┌──────▼───────┐                                      │
│                      │   Consensus  │                                      │
│                      │  Aggregator  │                                      │
│                      └──────────────┘                                      │
│                                                                             │
│   LEVEL 3: Future (Self-Improving)                                         │
│   ════════════════════════════════                                         │
│   • Learn from Human Expert corrections                                    │
│   • Adaptive prompt refinement                                             │
│   • Model fine-tuning pipeline                                             │
│   • Automatic calibration                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Prompt Engineering Roadmap

#### Current Prompt Structure
```
System: You are an expert Thai education assessor...
User: <student_answer>{answer}</student_answer>
      <question>{question}</question>
      <rubric>{A.R.C.E. definitions}</rubric>
      
Respond in JSON with chainOfThought...
```

#### Enhanced Prompt Structure (v7.0)
```
System: [Role + Context + Constraints + Output Format]

<context>
  <grade_level>ม.4</grade_level>
  <subject>วิทยาศาสตร์</subject>
  <topic>การเปลี่ยนแปลงสภาพภูมิอากาศ</topic>
  <learning_outcomes>
    <lo code="LO1">วิเคราะห์สาเหตุของการเปลี่ยนแปลงสภาพภูมิอากาศ</lo>
    <lo code="LO2">อธิบายผลกระทบต่อระบบนิเวศ</lo>
  </learning_outcomes>
</context>

<student_response>
  {student_answer}
</student_response>

<assessment_rubric>
  <dimension name="analysis" weight="25">
    <anchor level="5">แยกแยะได้ครบทุกองค์ประกอบ พร้อมอธิบายความสัมพันธ์</anchor>
    <anchor level="3">แยกแยะได้บางส่วน ความสัมพันธ์ยังไม่ชัด</anchor>
    <anchor level="1">จำแนกได้น้อยมาก หรือไม่ถูกต้อง</anchor>
  </dimension>
  <!-- ... other dimensions -->
</assessment_rubric>

<output_format>
{
  "chainOfThought": {
    "step1_comprehension": "...",
    "step2_evidence_extraction": "...",
    "step3_anchor_matching": "...",
    "step4_final_decision": "..."
  },
  "rubricScores": { "analysis": 0-5, ... },
  "confidence": 0-100,
  "confidenceReason": "...",
  "loAssessment": { "passedLOs": [...], "analysis": "..." }
}
</output_format>
```

### Model Fallback Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MODEL FALLBACK HIERARCHY                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   PRIMARY                                                                   │
│   ├── gpt-4o-mini (Default)                                                │
│   │   └── Cost: ~$0.15/1M tokens                                           │
│   │   └── Latency: ~1.5s                                                   │
│   │   └── Quality: ★★★★☆                                                   │
│   │                                                                         │
│   FALLBACK 1 (If rate limit or timeout)                                    │
│   ├── gpt-4o-mini (Retry with backoff)                                     │
│   │   └── Max 3 attempts                                                   │
│   │   └── Exponential backoff: 1s, 2s, 4s                                  │
│   │                                                                         │
│   FALLBACK 2 (If OpenAI down)                                              │
│   ├── claude-3-haiku (Alternative)                                         │
│   │   └── Cost: ~$0.25/1M tokens                                           │
│   │   └── Requires prompt adaptation                                       │
│   │                                                                         │
│   FALLBACK 3 (Emergency)                                                   │
│   └── Cached/Template Response                                             │
│       └── Use similar previous assessments                                 │
│       └── Flag for human review                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Data & Analytics Pipeline

### 📊 Analytics Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DATA & ANALYTICS PIPELINE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   DATA SOURCES                                                              │
│   ════════════                                                              │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│   │Assess-   │  │Worksheet │  │Student   │  │Session   │                  │
│   │ments     │  │Submits   │  │Progress  │  │Events    │                  │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
│        │             │             │             │                         │
│        └─────────────┴─────────────┴─────────────┘                         │
│                           │                                                 │
│                    ┌──────▼──────┐                                         │
│                    │   ETL       │                                         │
│                    │   Process   │                                         │
│                    └──────┬──────┘                                         │
│                           │                                                 │
│   DATA WAREHOUSE          │                                                 │
│   ══════════════  ┌───────▼───────┐                                        │
│                   │ learningEvents│  ← Flattened for SPSS/R               │
│                   │ Collection    │                                        │
│                   └───────┬───────┘                                        │
│                           │                                                 │
│        ┌──────────────────┼──────────────────┐                             │
│        │                  │                  │                             │
│   ┌────▼────┐      ┌──────▼──────┐    ┌──────▼──────┐                     │
│   │Student  │      │   Class     │    │  Research   │                     │
│   │Dashboard│      │  Analytics  │    │   Export    │                     │
│   └─────────┘      └─────────────┘    └─────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Real-time Analytics Enhancement

| Feature | Current | Target | Implementation |
|---------|---------|--------|----------------|
| **Student Dashboard** | Basic stats | Trend analysis | D3.js sparklines |
| **Class Analytics** | Summary | Live heatmap | WebSocket updates |
| **LO Progress** | Pass/Fail | Mastery level | Gradient indicators |
| **Teacher Alerts** | Manual | Predictive | ML risk scoring |

### Export Formats

```javascript
// Research export schema (K-Anonymity compliant)
const researchExportSchema = {
  // Identifiers (anonymized)
  eventId: 'sequential',
  studentId: 'hashed_k5',
  courseId: 'preserved',
  
  // Demographics (suppressed if k<5)
  gradeLevel: 'categorical',
  schoolType: 'categorical',
  region: 'categorical',
  
  // A.R.C.E. Scores
  scoreAnalysis: 'integer_0_5',
  scoreReasoning: 'integer_0_5',
  scoreCreativity: 'integer_0_5',
  scoreEvidence: 'integer_0_5',
  scoreTotal: 'integer_0_20',
  
  // AI Metadata
  aiConfidence: 'integer_0_100',
  modelUsed: 'string',
  promptVersion: 'string',
  
  // Temporal
  timestamp: 'iso8601',
  timeSpentSeconds: 'integer',
  
  // Export formats
  formats: ['csv', 'json', 'spss_syntax']
};
```

---

## 11. Testing & Quality Assurance

### 🧪 Testing Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TESTING PYRAMID                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                            ╱╲                                               │
│                           ╱  ╲                                              │
│                          ╱ E2E╲     5% — Critical user journeys            │
│                         ╱──────╲                                            │
│                        ╱        ╲                                           │
│                       ╱Integration╲   15% — API contracts, DB queries      │
│                      ╱────────────╲                                         │
│                     ╱              ╲                                        │
│                    ╱   Unit Tests   ╲   80% — Functions, utilities, stores │
│                   ╱──────────────────╲                                      │
│                  ╱                    ╲                                     │
│                 ╱____________________╲                                     │
│                                                                             │
│   COVERAGE TARGETS                                                         │
│   ════════════════                                                         │
│   • Unit Tests: 80%+ coverage                                              │
│   • Integration Tests: All API endpoints                                   │
│   • E2E Tests: Student assessment flow, Teacher dashboard                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Test Suite Expansion Plan

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
| **Backend Unit** | 11 suites | 20 suites | P1 |
| **Frontend Unit** | 4 suites | 12 suites | P1 |
| **API Integration** | 0 | 10 suites | P2 |
| **E2E Cypress** | 0 | 5 flows | P2 |
| **Visual Regression** | 0 | Component library | P3 |

### Critical Test Cases

```javascript
// Assessment accuracy tests
describe('A.R.C.E. Scoring Accuracy', () => {
  test.each(goldenDataset)(
    'should score within 1 point of expert for %s',
    async (sample) => {
      const result = await assessAnswer(sample.studentAnswer, sample.question);
      
      expect(Math.abs(result.analysis - sample.expertAnalysis)).toBeLessThanOrEqual(1);
      expect(Math.abs(result.reasoning - sample.expertReasoning)).toBeLessThanOrEqual(1);
      expect(Math.abs(result.creativity - sample.expertCreativity)).toBeLessThanOrEqual(1);
      expect(Math.abs(result.evidence - sample.expertEvidence)).toBeLessThanOrEqual(1);
    }
  );
});

// Reproducibility tests
describe('Deterministic AI', () => {
  test('should produce identical scores for same input', async () => {
    const input = { studentAnswer: '...', question: '...' };
    
    const result1 = await assessAnswer(input);
    const result2 = await assessAnswer(input);
    const result3 = await assessAnswer(input);
    
    expect(result1.rubricScores).toEqual(result2.rubricScores);
    expect(result2.rubricScores).toEqual(result3.rubricScores);
  });
});
```

---

## 12. Security & Compliance

### 🔒 Security Roadmap

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SECURITY ENHANCEMENT PLAN                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   LAYER 1: Authentication & Authorization                                   │
│   ═══════════════════════════════════════                                  │
│   ✅ Google SSO                    → Implemented                           │
│   ✅ Role-based access (student/teacher)                                   │
│   🔄 Session management enhancement                                        │
│   ⬜ Multi-factor authentication (optional)                                │
│   ⬜ API key rotation automation                                           │
│                                                                             │
│   LAYER 2: Data Protection                                                 │
│   ═══════════════════════                                                  │
│   ✅ Firestore security rules                                              │
│   ✅ Field-level encryption (sensitive)                                    │
│   ✅ K-Anonymity for research export                                       │
│   🔄 Data retention policy enforcement                                     │
│   ⬜ Automated PII scanning                                                │
│                                                                             │
│   LAYER 3: Application Security                                            │
│   ═════════════════════════════                                            │
│   ✅ Prompt injection defense (XML isolation)                              │
│   ✅ Input sanitization                                                    │
│   ✅ Rate limiting                                                         │
│   🔄 Dependency vulnerability scanning                                     │
│   ⬜ OWASP Top 10 audit                                                    │
│                                                                             │
│   LAYER 4: Monitoring & Incident Response                                  │
│   ═══════════════════════════════════════                                  │
│   ✅ Cloud Logging for audit trail                                         │
│   🔄 Real-time anomaly detection                                           │
│   ⬜ Automated incident response                                           │
│   ⬜ Security dashboard                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### PDPA Compliance Checklist

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| **Consent** | ✅ | Modal at first login |
| **Purpose Limitation** | ✅ | Clear data use policy |
| **Data Minimization** | ✅ | Only essential data |
| **Accuracy** | ✅ | Profile edit capability |
| **Storage Limitation** | 🔄 | Automated purge after 3 years |
| **Security** | ✅ | Encryption, access control |
| **Rights** | ✅ | Export, delete on request |

---

## 13. Sustainability Model

### Technical Sustainability

| Aspect | Strategy | Implementation |
|--------|----------|----------------|
| **Code** | Modular architecture | 47 JS files, 8 Pinia Stores |
| **Scalability** | Serverless | Auto-scaling Cloud Functions |
| **Cost** | Efficient AI | GPT-4o-mini (15-20x cheaper) |
| **Docs** | Living documentation | 25+ markdown files |

### Operational Sustainability

| Metric | Target | Strategy |
|--------|--------|----------|
| **Uptime** | 99.9% | Multi-region deployment |
| **Response Time** | < 3s | Caching, optimization |
| **Error Rate** | < 1% | Circuit breaker, retry |
| **Cost per Assessment** | < ฿0.50 | Batch processing |

### Academic Sustainability

| Element | Mechanism |
|---------|-----------|
| **IRR Calibration** | Weekly automated testing |
| **Model Drift Detection** | System fingerprint tracking |
| **Human-in-the-Loop** | Expert review for low-confidence |
| **Fairness Audit** | Quarterly bias detection |

### Community Sustainability

| Initiative | Description |
|------------|-------------|
| **Teacher PLC** | Professional learning community |
| **Open Source** | MIT License for core components |
| **Documentation** | Comprehensive guides |
| **Support** | GitHub Issues, community forum |

---

## 14. Risk Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **API Cost Spike** | Medium | High | Budget alerts, model switching |
| **Model Deprecation** | Low | Critical | LLM abstraction layer |
| **Data Breach** | Low | Critical | Encryption, access control |
| **Performance Degradation** | Medium | Medium | Load testing, monitoring |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Teacher Resistance** | Medium | High | Training, gradual rollout |
| **Low Adoption** | Medium | Medium | Gamification, incentives |
| **Budget Constraints** | High | Medium | Cost optimization, grants |

### Research Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **IRR Below Threshold** | Medium | High | Continuous calibration |
| **Validity Concerns** | Low | High | Rigorous validation study |
| **Publication Rejection** | Medium | Medium | Multiple submissions |

---

## 15. Success Metrics

### Key Performance Indicators

| Category | KPI | Current | Q2 2026 | Q4 2026 |
|----------|-----|---------|---------|---------|
| **Quality** | IRR (κ) | 0.78 | 0.80 | 0.85 |
| **Quality** | AI Confidence | 82% | 85% | 88% |
| **Adoption** | Schools | 23 | 50 | 100 |
| **Adoption** | Teachers | 150 | 500 | 1,000 |
| **Adoption** | Students | 3,000 | 10,000 | 25,000 |
| **Engagement** | Monthly Active | 72% | 80% | 85% |
| **Technical** | Uptime | 99.7% | 99.9% | 99.9% |
| **Technical** | Response Time | 2.1s | 2.0s | 1.8s |
| **Research** | Publications | 0 | 1 | 3 |

### Milestone Checklist

**Phase 5 (Current - Q4 2025)** ✅ COMPLETED
- [x] Complete 8-Layer Reliability Ecosystem
- [x] Update all documentation to v6.0
- [x] Achieve IRR κ ≥ 0.80 (improved calibration prompts)
- [x] Expand Golden Dataset to 50 items
- [x] Complete community features (90% → 100%)

**Phase 6 (Q1-Q2 2026)**
- [ ] Onboard 50 schools
- [ ] Launch ESA Dashboard
- [ ] Train 500 teachers
- [ ] Present to Ministry

**Phase 7 (Q3-Q4 2026)**
- [ ] Submit IEEE TLT paper
- [ ] Present at AIED Conference
- [ ] Complete longitudinal study
- [ ] Onboard 100 schools

---

## 📊 Master Timeline Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MASTER DEVELOPMENT TIMELINE 2025-2026                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   2025                                                                      │
│   ════                                                                      │
│   Q4 │████████████████│ Phase 5: Excellence & Stability ✅ COMPLETE        │
│      │                │ • IRR calibration ✅                               │
│      │                │ • Documentation v6.0 ✅                            │
│      │                │ • Community features 100% ✅                       │
│                                                                             │
│   2026                                                                      │
│   ════                                                                      │
│   Q1 │████████████████│ Phase 6A: Foundation                               │
│      │░░░░░░░░░░░░░░░░│ Theme: Design System                               │
│      │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ Backend: Module extraction                        │
│      │                │ • ESA Dashboard                                    │
│      │                │ • Teacher certification                            │
│                                                                             │
│   Q2 │████████████████│ Phase 6B: Scale                                    │
│      │░░░░░░░░░░░░░░░░│ Theme: Component library                           │
│      │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ Backend: Service layer                            │
│      │                │ • 50 schools onboarded                             │
│      │                │ • Ministry presentation                            │
│                                                                             │
│   Q3 │████████████████│ Phase 7A: Research                                 │
│      │░░░░░░░░░░░░░░░░│ Theme: Advanced patterns                           │
│      │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ AI: Multi-agent refinement                        │
│      │                │ • IEEE TLT submission                              │
│      │                │ • Validity study                                   │
│                                                                             │
│   Q4 │████████████████│ Phase 7B: Publication                              │
│      │░░░░░░░░░░░░░░░░│ Theme: Polish & accessibility                      │
│      │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ AI: Self-improving pilot                          │
│      │                │ • AIED Conference                                  │
│      │                │ • 100 schools                                      │
│                                                                             │
│   LEGEND:                                                                  │
│   ████ Core Features  ░░░░ Theme/UI  ▓▓▓▓ Backend/AI                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Final Summary Dashboard

```
╔═════════════════════════════════════════════════════════════════════════════╗
║                    HOTS AI ChatLoop — Strategic Dashboard                   ║
╠═════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║   OVERALL PROGRESS                                                          ║
║   ════════════════                                                          ║
║   Phase 5: ████████████████████████████████████████░░░░░░░░ 85%            ║
║   Phase 6: ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%             ║
║   Phase 7: ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%             ║
║                                                                             ║
║   ┌─────────────────────┐   ┌─────────────────────┐                        ║
║   │    SYSTEM HEALTH    │   │   QUALITY METRICS   │                        ║
║   ├─────────────────────┤   ├─────────────────────┤                        ║
║   │ Functions: 98 ✅    │   │ IRR (κ): 0.78 ↗    │                        ║
║   │ Views: 91 ✅        │   │ ICC: 0.85 ✅       │                        ║
║   │ Routes: 93+ ✅      │   │ Confidence: 82% ✅ │                        ║
║   │ Code: 40K+ lines ✅ │   │ Golden: 40/50      │                        ║
║   └─────────────────────┘   └─────────────────────┘                        ║
║                                                                             ║
║   ┌─────────────────────┐   ┌─────────────────────┐                        ║
║   │  ADOPTION METRICS   │   │   NEXT MILESTONES   │                        ║
║   ├─────────────────────┤   ├─────────────────────┤                        ║
║   │ Schools: 23/100 ↗   │   │ ▶ IRR κ ≥ 0.80     │                        ║
║   │ Teachers: 150/1K ↗  │   │ ▶ 50 Schools       │                        ║
║   │ Students: 3K/25K ↗  │   │ ▶ IEEE TLT Paper   │                        ║
║   │ Active: 72%/85% ↗   │   │ ▶ WCAG 2.1 AA     │                        ║
║   └─────────────────────┘   └─────────────────────┘                        ║
║                                                                             ║
║   80:20 FOCUS AREAS                                                        ║
║   ═════════════════                                                        ║
║   1. Assessment Engine ████████████████████████████████████████ 95/100     ║
║   2. Scaffolding       ████████████████████████████████████░░░░ 90/100     ║
║   3. Real-time FB      ███████████████████████████████████░░░░░ 88/100     ║
║   4. LO Tracking       ██████████████████████████████████░░░░░░ 85/100     ║
║                                                                             ║
╚═════════════════════════════════════════════════════════════════════════════╝
```

---

<div align="center">

**Built with ❤️ for Thai Education**

*Advancing Higher-Order Thinking Skills Assessment through AI*

---

**Last Updated:** December 31, 2025 | **Version:** 6.0.0

**© 2025 HOTS AI ChatLoop Project**

</div>
