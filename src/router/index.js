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
  {
    path: '/student-portfolio/:studentId?',
    name: 'StudentPortfolio',
    component: () => import('@/views/StudentPortfolio.vue'),
    meta: { requiresAuth: true }
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
    meta: { requiresAuth: true, role: 'teacher' }
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
  }
  ,
  {
    path: '/progress-map',
    name: 'ProgressMap',
    component: () => import('@/views/StudentProgressMap.vue'),
    meta: { requiresAuth: true }
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
    name: 'ProgressAnalytics',
    component: () => import('@/views/ProgressAnalytics.vue'),
    meta: { requiresAuth: true, role: 'student' }
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
    path: '/teacher-portfolio',
    name: 'TeacherPortfolio',
    component: () => import('@/views/TeacherPortfolio.vue'),
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
