import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register-school',
    name: 'SchoolRegistration',
    component: () => import('@/views/SchoolRegistration.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/registration-status',
    name: 'RegistrationStatus',
    component: () => import('@/views/RegistrationStatus.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/student',
    name: 'StudentDashboard',
    component: () => import('@/views/StudentDashboard.vue'),
    meta: { requiresAuth: true, role: 'student' }
  },
  {
    path: '/teacher',
    name: 'TeacherDashboard',
    component: () => import('@/views/TeacherDashboard.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/parent',
    name: 'ParentDashboard',
    component: () => import('@/views/ParentDashboard.vue'),
    meta: { requiresAuth: true, role: 'parent' }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/ChatView.vue'),
    meta: { requiresAuth: true, role: 'student' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile-setup',
    name: 'ProfileSetup',
    component: () => import('@/views/ProfileSetup.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/courses',
    name: 'CourseManagement',
    component: () => import('@/views/CourseManagement.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/expert-calibration',
    name: 'ExpertCalibration',
    component: () => import('@/views/ExpertCalibration.vue'),
    meta: { requiresAuth: true, role: 'teacher' } // In real app, restrict to expert role
  },
  {
    path: '/questions',
    name: 'QuestionBank',
    component: () => import('@/views/QuestionBank.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/school-management',
    name: 'SchoolManagement',
    component: () => import('@/views/SchoolManagement.vue'),
    meta: { requiresAuth: true, role: 'school_admin' }
  },
  {
    path: '/esa-dashboard',
    name: 'ESADashboard',
    component: () => import('@/views/ESADashboard.vue'),
    meta: { requiresAuth: true, role: 'esa_admin' }
  },
  {
    path: '/national-dashboard',
    name: 'NationalDashboard',
    component: () => import('@/views/NationalDashboard.vue'),
    meta: { requiresAuth: true, role: 'ministry_admin' }
  },
  {
    path: '/curriculum-management',
    name: 'CurriculumManagement',
    component: () => import('@/views/CurriculumManagement.vue'),
    meta: { requiresAuth: true, role: 'ministry_admin' }
  },
  // Redirect old student-portfolio to portfolio
  {
    path: '/student-portfolio/:studentId?',
    redirect: to => to.params.studentId ? `/portfolio/${to.params.studentId}` : '/portfolio'
  },
  {
    path: '/lo-reports',
    name: 'LOReports',
    component: () => import('@/views/LOReports.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/my-progress',
    name: 'StudentLOHistory',
    component: () => import('@/views/StudentLOHistory.vue'),
    meta: { requiresAuth: true, role: 'student' }
  },
  {
    path: '/student-detail/:studentId',
    name: 'StudentDetail',
    component: () => import('@/views/StudentDetail.vue'),
    meta: { requiresAuth: true }  // Allow teacher and parent to view
  },
  {
    path: '/class-analytics',
    name: 'ClassAnalytics',
    component: () => import('@/views/ClassAnalytics.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/leaderboard',
    name: 'Leaderboard',
    component: () => import('@/views/Leaderboard.vue'),
    meta: { requiresAuth: true }
  },
  // Redirect old progress-map to my-progress
  {
    path: '/progress-map',
    redirect: '/my-progress'
  },
  {
    path: '/micro-lessons',
    name: 'MicroLessons',
    component: () => import('@/views/MicroLessons.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/micro-lesson-library',
    name: 'MicroLessonLibrary',
    component: () => import('@/views/MicroLessonLibrary.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/adaptive-learning',
    name: 'AdaptiveLearning',
    component: () => import('@/views/AdaptiveLearning.vue'),
    meta: { requiresAuth: true, role: 'student' }
  },
  {
    path: '/goal-setting',
    name: 'GoalSetting',
    component: () => import('@/views/GoalSetting.vue'),
    meta: { requiresAuth: true, role: 'student' }
  },
  {
    path: '/progress-analytics',
    redirect: '/my-progress'
  },
  {
    path: '/teacher-analytics',
    name: 'TeacherAnalyticsDashboard',
    component: () => import('@/views/TeacherAnalyticsDashboard.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/realtime-monitor',
    name: 'RealtimeMonitor',
    component: () => import('@/views/RealtimeMonitor.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/quality-assurance',
    name: 'QualityAssurance',
    component: () => import('@/views/QualityAssurance.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/teacher-portfolio',
    name: 'TeacherPortfolio',
    component: () => import('@/views/TeacherPortfolio.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/teacher-certification',
    name: 'TeacherCertification',
    component: () => import('@/views/TeacherCertification.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/lesson-plans',
    name: 'LessonPlans',
    component: () => import('@/views/LessonPlans.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/lesson-plans/:id',
    name: 'LessonPlanDetail',
    component: () => import('@/views/LessonPlanDetail.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/lesson-plans/:id/edit',
    name: 'LessonPlanEdit',
    component: () => import('@/views/LessonPlanEditor.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/lesson-plans/new',
    name: 'LessonPlanNew',
    component: () => import('@/views/LessonPlanEditor.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/curriculum-designer',
    name: 'CurriculumDesigner',
    component: () => import('@/views/CurriculumDesigner.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  // Electronic Worksheet System
  {
    path: '/worksheet/:id',
    name: 'WorksheetForm',
    component: () => import('@/views/WorksheetForm.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/worksheet-result/:id',
    name: 'WorksheetResult',
    component: () => import('@/views/WorksheetResult.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/worksheet-history/:id',
    name: 'WorksheetHistory',
    component: () => import('@/views/WorksheetHistory.vue'),
    meta: { requiresAuth: true, role: 'student' }
  },
  {
    path: '/learning-room/:id',
    name: 'LearningRoom',
    component: () => import('@/views/LearningRoom.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/learning-rooms',
    name: 'LearningRoomList',
    component: () => import('@/views/LearningRoomList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/teacher/worksheets',
    name: 'TeacherWorksheets',
    component: () => import('@/views/TeacherWorksheets.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/teacher/worksheets/edit/:id',
    name: 'WorksheetEditor',
    component: () => import('@/views/WorksheetEditor.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/teacher/worksheet-reports/:id?',
    name: 'WorksheetReports',
    component: () => import('@/views/WorksheetReports.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  // Knowledge Sheet System
  {
    path: '/knowledge-sheet/:id',
    name: 'KnowledgeSheetView',
    component: () => import('@/views/KnowledgeSheetView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/unit-knowledge-sheet/:id',
    name: 'UnitKnowledgeSheetView',
    component: () => import('@/views/UnitKnowledgeSheetView.vue'),
    meta: { requiresAuth: true }
  },
  // Admin Tools
  {
    path: '/admin-lo-manager',
    name: 'AdminLOManager',
    component: () => import('@/views/AdminLOManager.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/admin/system-check',
    name: 'AdminSystemCheck',
    component: () => import('@/views/AdminSystemCheck.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  
  // PDPA Compliance & Privacy
  {
    path: '/privacy/data-retention',
    name: 'DataRetentionPolicy',
    component: () => import('@/views/DataRetentionPolicy.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/privacy/parental-consent',
    name: 'ParentalConsent',
    component: () => import('@/views/ParentalConsent.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/privacy/ai-explanation',
    name: 'RightToExplanation',
    component: () => import('@/views/RightToExplanation.vue'),
    meta: { requiresAuth: true }
  },
  // Research Tools
  {
    path: '/research/export',
    name: 'ResearchExport',
    component: () => import('@/views/ResearchExport.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/research/pretest-posttest',
    name: 'PretestPosttest',
    component: () => import('@/views/PretestPosttest.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/research/expert-validation',
    name: 'ExpertValidation',
    component: () => import('@/views/ExpertValidation.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/research/ground-truth',
    name: 'GroundTruthValidation',
    component: () => import('@/views/GroundTruthValidation.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/research/ai-comparison',
    name: 'AITeacherComparison',
    component: () => import('@/views/AITeacherComparison.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/research/expert-validation-dashboard',
    name: 'ExpertValidationDashboard',
    component: () => import('@/views/ExpertValidationDashboard.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/learning-trajectory',
    name: 'LearningTrajectory',
    component: () => import('@/views/LearningTrajectoryView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/learning-trajectory/:studentId',
    name: 'LearningTrajectoryStudent',
    component: () => import('@/views/LearningTrajectoryView.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/mental-model-map',
    name: 'MentalModelMap',
    component: () => import('@/views/MentalModelMap.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/mental-model-map/:studentId',
    name: 'MentalModelMapStudent',
    component: () => import('@/views/MentalModelMap.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  
  // ==========================================
  // Learning Social Network Routes
  // ==========================================
  
  // Social - Feed & Posts
  {
    path: '/feed',
    name: 'Feed',
    component: () => import('@/views/social/FeedView.vue'),
    meta: { requiresAuth: true }
  },
  
  // Social - Groups (redirect to SLC)
  {
    path: '/groups',
    redirect: '/community/study-groups'
  },
  {
    path: '/groups/:id',
    redirect: to => `/community/study-groups/${to.params.id}`
  },
  
  // Trust Layer - Teacher Inbox
  {
    path: '/teacher/inbox',
    name: 'TeacherInbox',
    component: () => import('@/views/trust/TeacherInbox.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  
  // Portfolio System
  {
    path: '/portfolio/:userId?',
    name: 'Portfolio',
    component: () => import('@/views/portfolio/PortfolioView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/verify/:hash',
    name: 'Verify',
    component: () => import('@/views/portfolio/VerifyPage.vue'),
    meta: { requiresAuth: false }  // Public verification
  },
  {
    path: '/evidence/:id',
    name: 'EvidencePack',
    component: () => import('@/views/portfolio/EvidencePackDetail.vue'),
    meta: { requiresAuth: true }
  },
  
  // Assignment System
  {
    path: '/assignments',
    name: 'Assignments',
    component: () => import('@/views/assignment/AssignmentList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/assignments/:id',
    name: 'AssignmentDetail',
    component: () => import('@/views/assignment/AssignmentDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/assignments/:id/submit',
    name: 'AssignmentSubmit',
    component: () => import('@/views/assignment/AssignmentSubmit.vue'),
    meta: { requiresAuth: true, role: 'student' }
  },
  {
    path: '/submissions/:id',
    name: 'SubmissionDetail',
    component: () => import('@/views/assignment/SubmissionDetail.vue'),
    meta: { requiresAuth: true }
  },
  
  // Appeal System
  {
    path: '/appeals/submit/:submissionId',
    name: 'SubmitAppeal',
    component: () => import('@/views/appeal/SubmitAppeal.vue'),
    meta: { requiresAuth: true, role: 'student' }
  },
  {
    path: '/appeals/my',
    name: 'MyAppeals',
    component: () => import('@/views/appeal/MyAppeals.vue'),
    meta: { requiresAuth: true, role: 'student' }
  },
  {
    path: '/teacher/appeals',
    name: 'AppealsManagement',
    component: () => import('@/views/appeal/AppealsManagement.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  
  // ==========================================
  // SLC - Student Learning Community Routes
  // ==========================================
  {
    path: '/community',
    name: 'StudentCommunityHub',
    component: () => import('@/views/community/StudentCommunityHub.vue'),
    meta: { requiresAuth: true, role: 'student' }
  },
  {
    path: '/community/study-groups',
    name: 'StudyGroupList',
    component: () => import('@/views/community/StudyGroupList.vue'),
    meta: { requiresAuth: true, role: 'student' }
  },
  {
    path: '/community/study-groups/:id',
    name: 'StudyGroupDetail',
    component: () => import('@/views/community/StudyGroupDetail.vue'),
    meta: { requiresAuth: true, role: 'student' }
  },
  {
    path: '/community/help',
    name: 'HelpRequestBoard',
    component: () => import('@/views/community/HelpRequestBoard.vue'),
    meta: { requiresAuth: true, role: 'student' }
  },
  {
    path: '/community/mentors',
    name: 'PeerMentorMatch',
    component: () => import('@/views/community/PeerMentorMatch.vue'),
    meta: { requiresAuth: true, role: 'student' }
  },
  {
    path: '/community/gallery',
    name: 'SharedAnswersGallery',
    component: () => import('@/views/community/SharedAnswersGallery.vue'),
    meta: { requiresAuth: true, role: 'student' }
  },
  
  // ==========================================
  // PLC - Professional Learning Community Routes
  // ==========================================
  {
    path: '/plc',
    name: 'TeacherCommunityHub',
    component: () => import('@/views/community/TeacherCommunityHub.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/plc/lesson-library',
    name: 'LessonPlanLibrary',
    component: () => import('@/views/community/LessonPlanLibrary.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/plc/question-collab',
    name: 'QuestionBankCollab',
    component: () => import('@/views/community/QuestionBankCollab.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/plc/strategies',
    name: 'TeachingStrategies',
    component: () => import('@/views/community/TeachingStrategies.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/plc/insights',
    name: 'AnalyticsInsights',
    component: () => import('@/views/community/AnalyticsInsights.vue'),
    meta: { requiresAuth: true, role: 'teacher' }
  },
  
  // ==========================================
  // Enhanced Social Learning Routes
  // ==========================================
  
  // Peer Review System
  {
    path: '/social/peer-review',
    name: 'PeerReviewSystem',
    component: () => import('@/views/social/PeerReviewSystem.vue'),
    meta: { requiresAuth: true, role: 'student' }
  },
  
  // Collaborative Tasks
  {
    path: '/social/collaborative/:id',
    name: 'CollaborativeTask',
    component: () => import('@/views/social/CollaborativeTask.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/social/collaborative',
    name: 'CollaborativeTaskList',
    component: () => import('@/views/social/CollaborativeTaskList.vue'),
    meta: { requiresAuth: true }
  },
  
  // ==========================================
  // Parent Portal Routes
  // ==========================================
  
  // Weekly Report
  {
    path: '/parent/weekly-report',
    name: 'ParentWeeklyReport',
    component: () => import('@/views/parent/ParentWeeklyReportView.vue'),
    meta: { requiresAuth: true, role: 'parent' }
  },
  
  // Parent Notifications Settings
  {
    path: '/parent/notifications',
    name: 'ParentNotifications',
    component: () => import('@/views/parent/ParentNotificationsView.vue'),
    meta: { requiresAuth: true, role: 'parent' }
  },
  
  // Achievement Sharing
  {
    path: '/social/achievements',
    name: 'AchievementSharing',
    component: () => import('@/views/social/AchievementSharing.vue'),
    meta: { requiresAuth: true }
  },
  
  // Learning Community Hub (unified entry point)
  {
    path: '/learning-hub',
    name: 'LearningCommunityHub',
    component: () => import('@/views/community/LearningCommunityHub.vue'),
    meta: { requiresAuth: true }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Always wait for auth to initialize first
  if (authStore.loading) {
    await new Promise(resolve => {
      const unwatch = authStore.$subscribe(() => {
        if (!authStore.loading) {
          unwatch()
          resolve()
        }
      })
    })
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiredRole = to.meta.role

  // If user is authenticated and goes to Home or Login, redirect to their dashboard
  if ((to.name === 'Home' || to.name === 'Login') && authStore.isAuthenticated) {
    // Check if profile is completed
    if (!authStore.userProfile?.profileCompleted) {
      next('/profile-setup')
      return
    }
    
    // Redirect to appropriate dashboard based on role
    if (authStore.isMinistryAdmin) {
      next('/national-dashboard')
    } else if (authStore.isESAAdmin) {
      next('/esa-dashboard')
    } else if (authStore.isSchoolAdmin) {
      next('/school-management')
    } else if (authStore.isTeacher) {
      next('/teacher')
    } else if (authStore.isParent) {
      next('/parent')
    } else if (authStore.isStudent) {
      next('/student')
    } else {
      next('/profile-setup')
    }
    return
  }

  if (requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (requiresAuth && authStore.isAuthenticated) {
    // Check if profile is completed (skip for profile-setup page)
    if (to.name !== 'ProfileSetup' && !authStore.userProfile?.profileCompleted) {
      next('/profile-setup')
      return
    }

    // Check role-based access
    if (requiredRole) {
      const userRole = authStore.userProfile?.role
      
      // Allow access if user has the required role
      if (userRole === requiredRole) {
        next()
      } else {
        // Redirect to appropriate dashboard based on role
        if (authStore.isMinistryAdmin) {
          next('/national-dashboard')
        } else if (authStore.isESAAdmin) {
          next('/esa-dashboard')
        } else if (authStore.isSchoolAdmin) {
          next('/school-management')
        } else if (authStore.isTeacher) {
          next('/teacher')
        } else if (authStore.isParent) {
          next('/parent')
        } else if (authStore.isStudent) {
          next('/student')
        } else {
          next('/profile-setup') // No role assigned yet
        }
      }
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
