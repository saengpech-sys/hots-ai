/**
 * 📋 Shared Constants Module
 * Centralized constants and configuration values
 * 
 * @module shared/constants
 * @description
 * Single source of truth for magic numbers, thresholds, and configuration.
 * Import specific constants as needed to avoid loading everything.
 * 
 * @example
 * const { THRESHOLDS, RATE_LIMITS } = require('../shared/constants')
 */

// =============================================================================
// 📏 VALIDATION THRESHOLDS
// =============================================================================

const THRESHOLDS = {
  // Answer validation
  MIN_ANSWER_LENGTH: 20,
  MAX_ANSWER_LENGTH: 10000,
  
  // Score thresholds
  PASSING_SCORE: 3,          // Minimum score to pass LO
  HIGH_SCORE: 4,             // High performance threshold
  PERFECT_SCORE: 5,          // Maximum score
  
  // Reliability
  MIN_RELIABILITY: 95,       // Target reliability percentage
  FALLBACK_RELIABILITY: 70,  // Fallback score reliability
  
  // AI Detection
  AI_DETECTION_THRESHOLD: 0.7,
  COPY_PASTE_THRESHOLD: 0.8,
  
  // IRR (Inter-Rater Reliability)
  IRR_PUBLICATION_STANDARD: 0.80,  // κ ≥ 0.80 for publication
  IRR_ACCEPTABLE: 0.60,            // κ ≥ 0.60 acceptable
  
  // Grade calibration
  GRADE_ADJUSTMENT_FACTOR: 0.1
}

// =============================================================================
// ⏱️ RATE LIMITING
// =============================================================================

const RATE_LIMITS = {
  // Per-user limits
  USER: {
    ASSESSMENT: {
      maxRequests: 30,
      windowMs: 60 * 60 * 1000  // 1 hour
    },
    GENERATION: {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000  // 1 hour
    }
  },
  
  // Per-IP limits
  IP: {
    maxRequests: 100,
    windowMs: 60 * 1000  // 1 minute
  },
  
  // Debounce settings
  DEBOUNCE: {
    ANSWER_SUBMIT: 2000,  // 2 seconds between submissions
    BUTTON_CLICK: 500     // 500ms for button clicks
  }
}

// =============================================================================
// 🎮 GAMIFICATION
// =============================================================================

const GAMIFICATION = {
  // Points per action
  POINTS: {
    ASSESSMENT_COMPLETE: 10,
    HIGH_SCORE_BONUS: 5,      // Bonus for score >= 4
    PERFECT_SCORE_BONUS: 10,  // Bonus for score = 5
    LO_PASSED: 20,
    DAILY_LOGIN: 5,
    STREAK_BONUS: 2,          // Per day in streak
    WORKSHEET_COMPLETE: 15
  },
  
  // Streak settings
  STREAK: {
    MAX_BONUS_DAYS: 7,        // Max streak bonus multiplier
    RESET_HOURS: 48           // Hours before streak resets
  },
  
  // Level thresholds
  LEVELS: {
    BRONZE: 0,
    SILVER: 100,
    GOLD: 500,
    PLATINUM: 1000,
    DIAMOND: 5000
  }
}

// =============================================================================
// 📊 A.R.C.E. RUBRIC
// =============================================================================

const ARCE = {
  DIMENSIONS: ['analysis', 'reasoning', 'creativity', 'evidence'],
  
  DIMENSION_LABELS: {
    analysis: 'การวิเคราะห์ (Analysis)',
    reasoning: 'การให้เหตุผล (Reasoning)',
    creativity: 'ความคิดสร้างสรรค์ (Creativity)',
    evidence: 'การใช้หลักฐาน (Evidence)'
  },
  
  SCORE_LEVELS: {
    0: 'ไม่มีหลักฐาน',
    1: 'เริ่มต้น',
    2: 'กำลังพัฒนา',
    3: 'พอใช้',
    4: 'ดี',
    5: 'ดีเยี่ยม'
  },
  
  // Default weights (equal by default)
  DEFAULT_WEIGHTS: {
    analysis: 0.25,
    reasoning: 0.25,
    creativity: 0.25,
    evidence: 0.25
  }
}

// =============================================================================
// 📝 LESSON PLAN (5E Model)
// =============================================================================

const LESSON_PLAN = {
  PHASES: ['engage', 'explore', 'explain', 'elaborate', 'evaluate'],
  
  PHASE_LABELS: {
    engage: 'ขั้นสร้างความสนใจ (Engage)',
    explore: 'ขั้นสำรวจ (Explore)',
    explain: 'ขั้นอธิบาย (Explain)',
    elaborate: 'ขั้นขยายความ (Elaborate)',
    evaluate: 'ขั้นประเมิน (Evaluate)'
  },
  
  // Time allocation (minutes) for 50-min class
  DEFAULT_TIMING: {
    engage: 5,
    explore: 15,
    explain: 10,
    elaborate: 15,
    evaluate: 5
  }
}

// =============================================================================
// 🏫 EDUCATION CONSTANTS
// =============================================================================

const EDUCATION = {
  // Grade levels
  GRADE_LEVELS: [
    'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
    'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'
  ],
  
  // Subject groups
  SUBJECT_GROUPS: [
    'ภาษาไทย',
    'คณิตศาสตร์',
    'วิทยาศาสตร์และเทคโนโลยี',
    'สังคมศึกษา',
    'ศิลปะ',
    'สุขศึกษาและพลศึกษา',
    'การงานอาชีพ',
    'ภาษาต่างประเทศ'
  ],
  
  // Key competencies (สมรรถนะสำคัญ)
  KEY_COMPETENCIES: [
    'communication',
    'thinking',
    'problemSolving',
    'lifeSkills',
    'technology'
  ],
  
  // Desirable characteristics (คุณลักษณะอันพึงประสงค์)
  DESIRABLE_CHARACTERISTICS: [
    'patriotism',
    'honesty',
    'discipline',
    'curiosity',
    'dedication',
    'sufficiency',
    'thaiIdentity',
    'publicMind'
  ]
}

// =============================================================================
// 🔧 SYSTEM CONFIGURATION
// =============================================================================

const SYSTEM = {
  // Pagination defaults
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },
  
  // Cache TTL (seconds)
  CACHE: {
    SHORT: 60,           // 1 minute
    MEDIUM: 300,         // 5 minutes
    LONG: 3600,          // 1 hour
    VERY_LONG: 86400     // 24 hours
  },
  
  // Cloud Function settings
  FUNCTIONS: {
    TIMEOUT_DEFAULT: 60,      // seconds
    TIMEOUT_LONG: 300,        // 5 minutes
    TIMEOUT_VERY_LONG: 540,   // 9 minutes
    MEMORY_DEFAULT: '256MB',
    MEMORY_HIGH: '1GB',
    MEMORY_VERY_HIGH: '2GB'
  }
}

// =============================================================================
// 📤 EXPORTS
// =============================================================================

module.exports = {
  THRESHOLDS,
  RATE_LIMITS,
  GAMIFICATION,
  ARCE,
  LESSON_PLAN,
  EDUCATION,
  SYSTEM
}
