<template>
  <div class="worksheet-result-view">
    <!-- Top Navigation -->
    <nav class="top-navbar">
      <div class="nav-brand">
        <router-link :to="backRoute" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <span class="brand-icon">📊</span>
        <span class="brand-text">ผลการประเมินใบงาน</span>
      </div>
      <div class="nav-actions">
        <button class="btn btn-outline btn-sm" @click="downloadReport">
          <span class="material-icons">download</span>
          ดาวน์โหลด
        </button>
      </div>
    </nav>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
      <p>กำลังโหลดผลการประเมิน...</p>
    </div>

    <!-- Result Content -->
    <div v-else-if="submission" class="result-container">
      
      <!-- Student Info Card -->
      <section class="student-info-section">
        <div class="student-info-card">
          <div class="student-avatar">
            <img v-if="studentInfo.photoURL" :src="studentInfo.photoURL" :alt="studentInfo.displayName" />
            <span v-else class="avatar-placeholder">{{ studentInfo.initials }}</span>
          </div>
          <div class="student-details">
            <h2>{{ studentInfo.displayName }}</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">รหัสนักเรียน</span>
                <span class="value">{{ studentInfo.studentId || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">ชั้น</span>
                <span class="value">{{ studentInfo.grade || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">ห้อง</span>
                <span class="value">{{ studentInfo.room || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">เลขที่</span>
                <span class="value">{{ studentInfo.number || '-' }}</span>
              </div>
              <div class="info-item" v-if="studentInfo.section">
                <span class="label">ตอน</span>
                <span class="value">{{ studentInfo.section }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Summary Card -->
      <section class="summary-section">
        <div class="summary-card">
          <!-- Score Circle -->
          <div class="score-area">
            <div class="score-circle" :class="scoreClass">
              <span class="score-value">{{ summary.percentage?.toFixed(0) || 0 }}</span>
              <span class="score-unit">%</span>
            </div>
            <div class="pa-badge" :class="paClass">
              {{ summary.paLevelText || 'ไม่ระบุ' }}
            </div>
          </div>
          
          <!-- Summary Info -->
          <div class="summary-info">
            <h1>{{ worksheet?.metadata?.title || 'ใบงาน' }}</h1>
            <p class="topic">{{ worksheet?.metadata?.topic }}</p>
            <p class="course-info">รายวิชา: {{ worksheet?.metadata?.courseName || '-' }} | ระดับชั้น: {{ worksheet?.metadata?.gradeLevel || '-' }}</p>
            
            <div class="score-breakdown">
              <div class="breakdown-item highlight">
                <span class="label">คะแนนที่ได้</span>
                <span class="value big">{{ summary.totalScore || 0 }} / {{ summary.maxScore || 0 }}</span>
              </div>
              <div class="breakdown-item">
                <span class="label">เปอร์เซ็นต์</span>
                <span class="value">{{ summary.percentage?.toFixed(1) || 0 }}%</span>
              </div>
              <div class="breakdown-item">
                <span class="label">ระดับ PA</span>
                <span class="value">{{ summary.paLevel || '-' }}</span>
              </div>
              <div class="breakdown-item">
                <span class="label">เวลาที่ใช้</span>
                <span class="value">{{ formatDuration(submission.timeSpent) }}</span>
              </div>
              <div class="breakdown-item">
                <span class="label">ส่งเมื่อ</span>
                <span class="value">{{ formatDate(submission.submittedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Learning Outcomes Section -->
      <section class="lo-section" v-if="loAssessment">
        <h2 class="section-title">🎓 Learning Outcomes ที่ผ่าน</h2>
        <div class="lo-content">
          <!-- LO Progress Summary -->
          <div class="lo-summary">
            <div class="lo-stat passed">
              <span class="lo-number">{{ loAssessment.passedLOs?.length || 0 }}</span>
              <span class="lo-label">LO ที่ผ่าน</span>
            </div>
            <div class="lo-stat total">
              <span class="lo-number">{{ totalLOs }}</span>
              <span class="lo-label">LO ทั้งหมด</span>
            </div>
            <div class="lo-stat percentage">
              <span class="lo-number">{{ loPercentage }}%</span>
              <span class="lo-label">ความก้าวหน้า</span>
            </div>
          </div>
          
          <!-- Passed LOs List -->
          <div v-if="loAssessment.passedLOs?.length" class="lo-list passed-list">
            <h4><span class="material-icons">check_circle</span> LO ที่ผ่านในใบงานนี้</h4>
            <div class="lo-tags">
              <span v-for="lo in loAssessment.passedLOs" :key="lo" class="lo-tag passed">
                {{ lo }}
              </span>
            </div>
          </div>
          
          <!-- All Worksheet LOs -->
          <div v-if="worksheetLOs?.length" class="lo-list all-los">
            <h4><span class="material-icons">list</span> Learning Outcomes ของใบงาน</h4>
            <ul class="lo-details">
              <li v-for="lo in worksheetLOs" :key="lo.loCode" class="lo-item"
                  :class="{ passed: isLOPassed(lo.loCode) }">
                <span class="lo-code">{{ lo.loCode }}</span>
                <span class="lo-desc">{{ lo.loDescription }}</span>
                <span class="lo-status">
                  <span v-if="isLOPassed(lo.loCode)" class="material-icons passed">check_circle</span>
                  <span v-else class="material-icons pending">pending</span>
                </span>
              </li>
            </ul>
          </div>
          
          <!-- LO Analysis -->
          <div v-if="loAssessment.analysis" class="lo-analysis">
            <h4><span class="material-icons">analytics</span> การวิเคราะห์</h4>
            <p>{{ loAssessment.analysis }}</p>
          </div>
        </div>
      </section>

      <!-- Cognitive Level Analysis -->
      <section class="cognitive-section">
        <h2 class="section-title">🧠 การวิเคราะห์ระดับปัญญา (Bloom's Taxonomy)</h2>
        <div class="cognitive-analysis">
          <div class="bloom-levels">
            <div v-for="level in bloomLevels" :key="level.key" 
                 class="bloom-item" :class="{ active: level.achieved }">
              <div class="bloom-icon">{{ level.icon }}</div>
              <div class="bloom-info">
                <h4>{{ level.label }}</h4>
                <p>{{ level.description }}</p>
              </div>
              <div class="bloom-status">
                <span class="material-icons">{{ level.achieved ? 'check_circle' : 'radio_button_unchecked' }}</span>
              </div>
            </div>
          </div>
          <div class="cognitive-summary">
            <p><strong>ระดับการคิดที่แสดงออก:</strong> {{ cognitiveLevel }}</p>
            <p class="cognitive-feedback">{{ cognitiveFeedback }}</p>
          </div>
        </div>
      </section>

      <!-- ARCE Scores -->
      <section class="arce-section">
        <h2 class="section-title">🎯 คะแนน HOTS A.R.C.E.</h2>
        <div class="arce-cards">
          <div v-for="(score, key) in assessment.arceScores" :key="key" 
               class="arce-card" :class="key">
            <div class="arce-icon">{{ getArceIcon(key) }}</div>
            <div class="arce-info">
              <h3>{{ getArceLabel(key) }}</h3>
              <div class="arce-bar">
                <div class="arce-fill" :style="{ width: (getArceRaw(score) / 5 * 100) + '%' }"></div>
              </div>
              <span class="arce-score">{{ getArceRaw(score) }} / 5</span>
              <p v-if="getArceFeedback(score)" class="arce-feedback">{{ getArceFeedback(score) }}</p>
            </div>
          </div>
        </div>
        
        <!-- Radar Chart -->
        <div class="radar-container" v-if="hasRadarData">
          <RadarChart :data="radarData" />
        </div>
      </section>

      <!-- Strengths & Weaknesses -->
      <section class="feedback-section">
        <div class="feedback-grid">
          <!-- Strengths -->
          <div class="feedback-card strengths">
            <div class="feedback-header">
              <span class="material-icons">thumb_up</span>
              <h3>จุดเด่น</h3>
            </div>
            <ul v-if="assessment.strengths?.length">
              <li v-for="(strength, idx) in assessment.strengths" :key="idx">
                {{ strength }}
              </li>
            </ul>
            <p v-else class="no-data">ไม่มีข้อมูล</p>
          </div>

          <!-- Weaknesses -->
          <div class="feedback-card weaknesses">
            <div class="feedback-header">
              <span class="material-icons">lightbulb</span>
              <h3>จุดที่ควรพัฒนา</h3>
            </div>
            <ul v-if="assessment.weaknesses?.length">
              <li v-for="(weakness, idx) in assessment.weaknesses" :key="idx">
                {{ weakness }}
              </li>
            </ul>
            <p v-else class="no-data">ไม่มีข้อมูล</p>
          </div>
        </div>
      </section>

      <!-- Suggestions -->
      <section class="suggestions-section" v-if="assessment.suggestions?.length">
        <h2 class="section-title">💡 ข้อเสนอแนะในการพัฒนา</h2>
        <div class="suggestions-list">
          <div v-for="(suggestion, idx) in assessment.suggestions" :key="idx" class="suggestion-item">
            <span class="suggestion-number">{{ idx + 1 }}</span>
            <p>{{ suggestion }}</p>
          </div>
        </div>
      </section>

      <!-- Question Results -->
      <section class="questions-section">
        <h2 class="section-title">📝 รายละเอียดคำตอบแต่ละข้อ</h2>
        
        <div class="questions-summary">
          <div class="qs-stat">
            <span class="qs-number">{{ questionStats.total }}</span>
            <span class="qs-label">ข้อทั้งหมด</span>
          </div>
          <div class="qs-stat correct">
            <span class="qs-number">{{ questionStats.correct }}</span>
            <span class="qs-label">ตอบถูก/ดี</span>
          </div>
          <div class="qs-stat partial">
            <span class="qs-number">{{ questionStats.partial }}</span>
            <span class="qs-label">ตอบได้บางส่วน</span>
          </div>
          <div class="qs-stat incorrect">
            <span class="qs-number">{{ questionStats.incorrect }}</span>
            <span class="qs-label">ต้องปรับปรุง</span>
          </div>
        </div>
        
        <div class="questions-list">
          <div v-for="(result, idx) in assessment.questionResults" :key="idx" 
               class="question-result-card" :class="getQuestionClass(result)">
            <div class="question-header">
              <div class="question-number">ข้อ {{ idx + 1 }}</div>
              <div class="question-score" :class="getScoreClass(result)">
                {{ result.score || 0 }} / {{ result.maxScore || 5 }} คะแนน
                <span class="score-percent">({{ ((result.score / result.maxScore) * 100).toFixed(0) }}%)</span>
              </div>
            </div>
            
            <div class="question-content">
              <h4 class="question-prompt">{{ result.question }}</h4>
              <div class="question-meta">
                <span class="phase-tag">{{ getPhaseLabel(result.phase) }}</span>
                <span class="bloom-tag">{{ getBloomLabel(result.bloomLevel) }}</span>
                <span v-for="arce in (Array.isArray(result.arceFocus) ? result.arceFocus : [result.arceFocus])" 
                      :key="arce" :class="['arce-tag', arce]">
                  {{ getArceIcon(arce) }} {{ getArceLabel(arce) }}
                </span>
              </div>
            </div>

            <div class="answer-comparison">
              <div class="answer-block student-answer">
                <label>📝 คำตอบของนักเรียน:</label>
                <div class="answer-content">
                  <template v-if="typeof result.studentAnswer === 'object'">
                    <pre>{{ JSON.stringify(result.studentAnswer, null, 2) }}</pre>
                  </template>
                  <template v-else>
                    {{ result.studentAnswer || '(ไม่ได้ตอบ)' }}
                  </template>
                </div>
                <div class="char-count" v-if="typeof result.studentAnswer === 'string'">
                  ความยาว: {{ result.studentAnswer?.length || 0 }} ตัวอักษร
                </div>
              </div>
              
              <div class="feedback-block" v-if="result.feedback">
                <label>💬 ผลการประเมินและข้อเสนอแนะ:</label>
                <div class="feedback-content">{{ result.feedback }}</div>
              </div>

              <div class="rubric-block" v-if="result.rubricLevel">
                <label>📊 ระดับตาม Rubric:</label>
                <div class="rubric-level" :class="'level-' + result.rubricLevel">
                  ระดับ {{ result.rubricLevel }}: {{ result.rubricDescription || '' }}
                </div>
              </div>
            </div>

            <div class="arce-breakdown" v-if="result.arceScores">
              <label>คะแนน A.R.C.E. ของข้อนี้:</label>
              <div class="mini-arce-scores">
                <span v-for="(score, key) in result.arceScores" :key="key" :class="['mini-score', key]">
                  {{ getArceIcon(key) }} {{ typeof score === 'object' ? score.raw : score }}/5
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Learning Outcomes -->
      <section class="lo-section" v-if="assessment.learningOutcomes?.length">
        <h2 class="section-title">🎯 ผลลัพธ์การเรียนรู้ (LO)</h2>
        <div class="lo-cards">
          <div v-for="lo in assessment.learningOutcomes" :key="lo.code" 
               class="lo-card" :class="{ achieved: lo.achieved }">
            <div class="lo-status">
              <span class="material-icons">{{ lo.achieved ? 'check_circle' : 'radio_button_unchecked' }}</span>
            </div>
            <div class="lo-info">
              <h4>{{ lo.code }}</h4>
              <p>{{ lo.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Overall Feedback -->
      <section class="overall-section" v-if="assessment.overallFeedback">
        <h2 class="section-title">📋 สรุปผลการประเมินภาพรวม</h2>
        <div class="overall-card">
          <p>{{ assessment.overallFeedback }}</p>
        </div>
      </section>

      <!-- Actions -->
      <section class="actions-section">
        <router-link :to="backRoute" class="btn btn-outline">
          <span class="material-icons">arrow_back</span>
          กลับห้องกิจกรรม
        </router-link>
        <button class="btn btn-primary" @click="retryWorksheet" v-if="canRetry">
          <span class="material-icons">refresh</span>
          ทำใหม่อีกครั้ง
        </button>
      </section>
    </div>

    <!-- Not Found -->
    <div v-else class="error-container">
      <span class="material-icons">error_outline</span>
      <p>ไม่พบผลการประเมินที่ต้องการ</p>
      <router-link to="/student" class="btn btn-primary">กลับหน้าหลัก</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import RadarChart from '@/components/RadarChart.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(true)
const submission = ref(null)
const worksheet = ref(null)

// Computed
const assessment = computed(() => submission.value?.assessment || {})
const summary = computed(() => assessment.value?.summary || {})

// Student Info
const studentInfo = computed(() => {
  const data = submission.value?.studentData || {}
  const user = authStore.userProfile || authStore.user || {}
  return {
    displayName: data.displayName || user.displayName || 'นักเรียน',
    studentId: data.studentId || data.studentNumber || user.studentId || '-',
    grade: data.grade || user.grade || '-',
    room: data.room || user.room || '-',
    number: data.number || user.number || '-',
    section: data.section || user.section || '',
    photoURL: user.photoURL || null,
    initials: (data.displayName || user.displayName || 'N')[0].toUpperCase()
  }
})

// Question Statistics
const questionStats = computed(() => {
  const results = assessment.value?.questionResults || []
  const total = results.length
  let correct = 0, partial = 0, incorrect = 0
  
  results.forEach(r => {
    const pct = (r.score / (r.maxScore || 5)) * 100
    if (pct >= 80) correct++
    else if (pct >= 40) partial++
    else incorrect++
  })
  
  return { total, correct, partial, incorrect }
})

// Bloom's Taxonomy Levels
const bloomLevels = computed(() => {
  const results = assessment.value?.questionResults || []
  const arceScores = assessment.value?.arceScores || {}
  
  // Calculate achieved levels based on ARCE scores
  const avgAnalysis = getArceRaw(arceScores.analysis)
  const avgReasoning = getArceRaw(arceScores.reasoning)
  const avgCreativity = getArceRaw(arceScores.creativity)
  const avgEvidence = getArceRaw(arceScores.evidence)
  
  return [
    { key: 'remember', icon: '📚', label: 'จำ (Remember)', description: 'ระลึก ทบทวน จดจำข้อมูล', achieved: true },
    { key: 'understand', icon: '💡', label: 'เข้าใจ (Understand)', description: 'อธิบาย ตีความ สรุปความ', achieved: avgReasoning >= 2 },
    { key: 'apply', icon: '🔧', label: 'ประยุกต์ (Apply)', description: 'นำไปใช้ ปฏิบัติ แก้ปัญหา', achieved: avgEvidence >= 2 },
    { key: 'analyze', icon: '🔍', label: 'วิเคราะห์ (Analyze)', description: 'แยกแยะ จำแนก เปรียบเทียบ', achieved: avgAnalysis >= 3 },
    { key: 'evaluate', icon: '⚖️', label: 'ประเมิน (Evaluate)', description: 'ตัดสิน วิจารณ์ ให้เหตุผล', achieved: avgReasoning >= 3 && avgAnalysis >= 3 },
    { key: 'create', icon: '🎨', label: 'สร้างสรรค์ (Create)', description: 'ออกแบบ สร้าง คิดค้นใหม่', achieved: avgCreativity >= 3 }
  ]
})

const cognitiveLevel = computed(() => {
  const levels = bloomLevels.value
  const achieved = levels.filter(l => l.achieved)
  if (achieved.length >= 6) return 'สร้างสรรค์ (Create) - ระดับสูงสุด'
  if (achieved.length >= 5) return 'ประเมิน (Evaluate) - ระดับสูง'
  if (achieved.length >= 4) return 'วิเคราะห์ (Analyze) - ระดับกลาง-สูง'
  if (achieved.length >= 3) return 'ประยุกต์ (Apply) - ระดับกลาง'
  if (achieved.length >= 2) return 'เข้าใจ (Understand) - ระดับพื้นฐาน'
  return 'จำ (Remember) - ระดับเริ่มต้น'
})

const cognitiveFeedback = computed(() => {
  const levels = bloomLevels.value
  const achieved = levels.filter(l => l.achieved).length
  if (achieved >= 5) return 'ยอดเยี่ยม! คุณแสดงทักษะการคิดขั้นสูงได้อย่างดี สามารถวิเคราะห์ ประเมิน และสร้างสรรค์ได้'
  if (achieved >= 4) return 'ดีมาก! คุณแสดงความสามารถในการวิเคราะห์ได้ดี ควรฝึกฝนการประเมินและสร้างสรรค์เพิ่มเติม'
  if (achieved >= 3) return 'ดี! คุณสามารถนำความรู้ไปประยุกต์ใช้ได้ ควรพัฒนาทักษะการวิเคราะห์เพิ่มเติม'
  if (achieved >= 2) return 'พอใช้ คุณเข้าใจเนื้อหาได้ดี ควรฝึกฝนการนำไปประยุกต์ใช้มากขึ้น'
  return 'ควรทบทวนเนื้อหาและฝึกฝนทักษะการคิดวิเคราะห์เพิ่มเติม'
})

const backRoute = computed(() => {
  if (submission.value?.roomId) return `/learning-room/${submission.value.roomId}`
  return '/student'
})

const scoreClass = computed(() => {
  const pct = summary.value?.percentage || 0
  if (pct >= 80) return 'excellent'
  if (pct >= 60) return 'good'
  if (pct >= 40) return 'fair'
  return 'poor'
})

const paClass = computed(() => {
  const level = summary.value?.paLevel || 0
  if (level >= 4) return 'pa4'
  if (level >= 3) return 'pa3'
  if (level >= 2) return 'pa2'
  return 'pa1'
})

// Learning Outcomes computed properties
const loAssessment = computed(() => {
  // Check both locations where LO assessment could be stored
  return submission.value?.loAssessment || 
         submission.value?.assessment?.loAssessment || 
         null
})

const worksheetLOs = computed(() => {
  return worksheet.value?.metadata?.learningOutcomes || []
})

const totalLOs = computed(() => {
  return worksheetLOs.value?.length || 0
})

const loPercentage = computed(() => {
  if (!totalLOs.value) return 0
  const passed = loAssessment.value?.passedLOs?.length || 0
  return Math.round((passed / totalLOs.value) * 100)
})

function isLOPassed(loCode) {
  return loAssessment.value?.passedLOs?.includes(loCode) || false
}

const hasRadarData = computed(() => {
  return assessment.value?.arceScores && Object.keys(assessment.value.arceScores).length > 0
})

const radarData = computed(() => {
  if (!assessment.value?.arceScores) return null
  const scores = assessment.value.arceScores
  return {
    labels: ['วิเคราะห์', 'เหตุผล', 'สร้างสรรค์', 'หลักฐาน'],
    datasets: [{
      label: 'คะแนน A.R.C.E.',
      data: [
        getArceRawValue(scores.analysis),
        getArceRawValue(scores.reasoning),
        getArceRawValue(scores.creativity),
        getArceRawValue(scores.evidence)
      ],
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      borderColor: '#6366f1',
      borderWidth: 2
    }]
  }
})

const canRetry = computed(() => {
  return worksheet.value?.allowRetry && (summary.value?.percentage || 0) < 80
})

// Methods
function getArceIcon(arce) {
  const icons = { analysis: '🔍', reasoning: '🧠', creativity: '💡', evidence: '📚' }
  return icons[arce] || '📝'
}

function getArceLabel(arce) {
  const labels = { analysis: 'วิเคราะห์', reasoning: 'เหตุผล', creativity: 'สร้างสรรค์', evidence: 'หลักฐาน' }
  return labels[arce] || arce
}

// Helper to extract raw score from arce score (handles both object and number format)
function getArceRaw(score) {
  if (score === null || score === undefined) return 0
  if (typeof score === 'object') return score.raw || 0
  return score
}

function getArceFeedback(score) {
  if (typeof score === 'object' && score.feedback) return score.feedback
  return null
}

function getArceRawValue(score) {
  return getArceRaw(score)
}

function getPhaseLabel(phase) {
  const labels = {
    engagement: '🎯 Engagement',
    exploration: '🔬 Exploration',
    explanation: '📖 Explanation',
    elaboration: '🚀 Elaboration',
    evaluation: '📊 Evaluation'
  }
  return labels[phase] || phase
}

function getBloomLabel(level) {
  const labels = {
    remember: '📚 จำ',
    understand: '💡 เข้าใจ',
    apply: '🔧 ประยุกต์',
    analyze: '🔍 วิเคราะห์',
    evaluate: '⚖️ ประเมิน',
    create: '🎨 สร้างสรรค์'
  }
  return labels[level] || level || ''
}

function getQuestionClass(result) {
  const pct = (result.score / (result.maxScore || 5)) * 100
  if (pct >= 80) return 'excellent'
  if (pct >= 60) return 'good'
  if (pct >= 40) return 'fair'
  return 'poor'
}

function getScoreClass(result) {
  const pct = (result.score / (result.maxScore || 5)) * 100
  if (pct >= 80) return 'pass'
  if (pct >= 60) return 'good'
  if (pct >= 40) return 'partial'
  return 'fail'
}

function formatDuration(seconds) {
  if (!seconds) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')} นาที`
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function downloadReport() {
  const info = studentInfo.value
  const reportData = {
    title: worksheet.value?.metadata?.title,
    courseName: worksheet.value?.metadata?.courseName,
    gradeLevel: worksheet.value?.metadata?.gradeLevel,
    student: info.displayName,
    studentId: info.studentId,
    grade: info.grade,
    room: info.room,
    number: info.number,
    section: info.section,
    submittedAt: formatDate(submission.value?.submittedAt),
    timeSpent: formatDuration(submission.value?.timeSpent),
    summary: summary.value,
    arceScores: assessment.value?.arceScores,
    strengths: assessment.value?.strengths,
    weaknesses: assessment.value?.weaknesses,
    suggestions: assessment.value?.suggestions,
    questionResults: assessment.value?.questionResults
  }
  
  const BOM = '\uFEFF'
  let csvContent = BOM
  csvContent += '=== รายงานผลการประเมินใบงาน ===\n\n'
  
  // ข้อมูลใบงาน
  csvContent += '📚 ข้อมูลใบงาน\n'
  csvContent += `ชื่อใบงาน,${reportData.title}\n`
  csvContent += `รายวิชา,${reportData.courseName}\n`
  csvContent += `ระดับชั้น,${reportData.gradeLevel}\n\n`
  
  // ข้อมูลนักเรียน
  csvContent += '👤 ข้อมูลนักเรียน\n'
  csvContent += `ชื่อ-นามสกุล,${reportData.student}\n`
  csvContent += `รหัสนักเรียน,${reportData.studentId}\n`
  csvContent += `ชั้น,${reportData.grade}\n`
  csvContent += `ห้อง,${reportData.room}\n`
  csvContent += `เลขที่,${reportData.number}\n`
  if (reportData.section) csvContent += `ตอน,${reportData.section}\n`
  csvContent += `วันที่ส่ง,${reportData.submittedAt}\n`
  csvContent += `เวลาที่ใช้,${reportData.timeSpent}\n\n`
  
  // สรุปคะแนน
  csvContent += '📊 สรุปผลคะแนน\n'
  csvContent += `คะแนนรวม,${reportData.summary?.totalScore}/${reportData.summary?.maxScore}\n`
  csvContent += `เปอร์เซ็นต์,${reportData.summary?.percentage?.toFixed(1)}%\n`
  csvContent += `ระดับ PA,${reportData.summary?.paLevelText}\n\n`
  
  // คะแนน ARCE
  csvContent += '🎯 คะแนน A.R.C.E.\n'
  csvContent += `วิเคราะห์ (Analysis),${getArceRaw(reportData.arceScores?.analysis)}/5\n`
  csvContent += `เหตุผล (Reasoning),${getArceRaw(reportData.arceScores?.reasoning)}/5\n`
  csvContent += `สร้างสรรค์ (Creativity),${getArceRaw(reportData.arceScores?.creativity)}/5\n`
  csvContent += `หลักฐาน (Evidence),${getArceRaw(reportData.arceScores?.evidence)}/5\n\n`
  
  // ระดับปัญญา
  csvContent += '🧠 ระดับปัญญา (Bloom\'s Taxonomy)\n'
  csvContent += `ระดับที่แสดงออก,${cognitiveLevel.value}\n`
  csvContent += `ข้อเสนอแนะ,${cognitiveFeedback.value}\n\n`
  
  // จุดเด่น
  csvContent += '✅ จุดเด่น\n'
  reportData.strengths?.forEach((s, i) => {
    csvContent += `${i + 1}. ${s}\n`
  })
  csvContent += '\n'
  
  // จุดที่ควรพัฒนา
  csvContent += '💡 จุดที่ควรพัฒนา\n'
  reportData.weaknesses?.forEach((w, i) => {
    csvContent += `${i + 1}. ${w}\n`
  })
  csvContent += '\n'
  
  // ข้อเสนอแนะ
  csvContent += '📝 ข้อเสนอแนะในการพัฒนา\n'
  reportData.suggestions?.forEach((s, i) => {
    csvContent += `${i + 1}. ${s}\n`
  })
  csvContent += '\n'
  
  // รายละเอียดแต่ละข้อ
  csvContent += '📋 รายละเอียดคำตอบแต่ละข้อ\n'
  csvContent += 'ข้อ,คำถาม,คำตอบ,คะแนน,ผลประเมิน\n'
  reportData.questionResults?.forEach((r, i) => {
    const answer = typeof r.studentAnswer === 'object' ? JSON.stringify(r.studentAnswer) : r.studentAnswer
    csvContent += `${i + 1},"${r.question}","${answer?.replace(/"/g, '""') || '-'}",${r.score}/${r.maxScore},"${r.feedback?.replace(/"/g, '""') || '-'}"\n`
  })
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `รายงานผล-${info.studentId}-${reportData.title}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function retryWorksheet() {
  if (submission.value?.worksheetId) {
    router.push(`/worksheet/${submission.value.worksheetId}?retry=true`)
  }
}

async function loadResult() {
  try {
    loading.value = true
    const submissionId = route.params.id
    
    // Load submission
    const subDoc = await getDoc(doc(db, 'worksheetSubmissions', submissionId))
    if (subDoc.exists()) {
      submission.value = { id: subDoc.id, ...subDoc.data() }
      
      // Load worksheet
      if (submission.value.worksheetId) {
        const wsDoc = await getDoc(doc(db, 'eWorksheets', submission.value.worksheetId))
        if (wsDoc.exists()) {
          worksheet.value = { id: wsDoc.id, ...wsDoc.data() }
        }
      }
    }
  } catch (error) {
    console.error('Error loading result:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadResult()
})
</script>

<style scoped>
.worksheet-result-view {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Navbar */
.top-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.back-link:hover {
  background: var(--bg-primary);
  color: var(--primary);
}

.brand-icon {
  font-size: 1.5rem;
}

.brand-text {
  font-size: 1rem;
  font-weight: 600;
}

/* Loading & Error */
.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;
}

.error-container .material-icons {
  font-size: 4rem;
  color: var(--text-secondary);
}

/* Result Container */
.result-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

/* Section Title */
.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

/* Student Info Section */
.student-info-section {
  margin-bottom: 2rem;
}

.student-info-card {
  background: linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  gap: 1.5rem;
  align-items: center;
  color: white;
}

.student-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255,255,255,0.3);
  flex-shrink: 0;
}

.student-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.2);
  font-size: 2rem;
  font-weight: 700;
}

.student-details h2 {
  margin-bottom: 0.75rem;
  font-size: 1.5rem;
}

.student-details .info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.student-details .info-item {
  display: flex;
  flex-direction: column;
  background: rgba(255,255,255,0.1);
  padding: 0.5rem 1rem;
  border-radius: 8px;
}

.student-details .info-item .label {
  font-size: 0.7rem;
  opacity: 0.8;
}

.student-details .info-item .value {
  font-weight: 600;
  font-size: 1rem;
}

/* Summary Section */
.summary-section {
  margin-bottom: 2rem;
}

.summary-card {
  background: var(--bg-secondary);
  border-radius: 20px;
  padding: 2rem;
  display: flex;
  gap: 2rem;
  border: 1px solid var(--border-color);
}

.course-info {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.breakdown-item.highlight {
  background: var(--primary);
  color: white;
  padding: 0.75rem;
  border-radius: 8px;
}

.breakdown-item .value.big {
  font-size: 1.5rem;
  font-weight: 700;
}

/* Learning Outcomes Section */
.lo-section {
  margin-bottom: 2rem;
}

.lo-content {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
}

.lo-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.lo-stat {
  text-align: center;
  padding: 1rem;
  border-radius: 12px;
  background: var(--bg-primary);
}

.lo-stat.passed {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.lo-stat.total {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(79, 70, 229, 0.1));
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.lo-stat.percentage {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1));
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.lo-number {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
}

.lo-label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.lo-list {
  margin-bottom: 1.5rem;
}

.lo-list h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.lo-list h4 .material-icons {
  font-size: 1.2rem;
}

.lo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lo-tag {
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.lo-tag.passed {
  background: linear-gradient(135deg, #10B981, #059669);
  color: white;
}

.lo-tag.pending {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.lo-details {
  list-style: none;
  padding: 0;
  margin: 0;
}

.lo-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.lo-item.passed {
  background: rgba(16, 185, 129, 0.05);
  border-color: rgba(16, 185, 129, 0.3);
}

.lo-code {
  font-weight: 600;
  color: var(--color-primary);
  min-width: 60px;
}

.lo-desc {
  flex: 1;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.lo-status .material-icons {
  font-size: 1.25rem;
}

.lo-status .material-icons.passed {
  color: #10B981;
}

.lo-status .material-icons.pending {
  color: var(--text-muted);
}

.lo-analysis {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid var(--border-color);
}

.lo-analysis h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.lo-analysis p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* Cognitive Section */
.cognitive-section {
  margin-bottom: 2rem;
}

.cognitive-analysis {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
}

.bloom-levels {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.bloom-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--bg-primary);
  border-radius: 10px;
  opacity: 0.5;
  transition: all 0.3s;
}

.bloom-item.active {
  opacity: 1;
  border-left: 4px solid var(--primary);
}

.bloom-icon {
  font-size: 1.5rem;
}

.bloom-info {
  flex: 1;
}

.bloom-info h4 {
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.bloom-info p {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.bloom-status .material-icons {
  color: var(--text-secondary);
}

.bloom-item.active .bloom-status .material-icons {
  color: #10b981;
}

.cognitive-summary {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 10px;
}

.cognitive-summary p {
  margin-bottom: 0.5rem;
}

.cognitive-feedback {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Questions Section */
.questions-summary {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.qs-stat {
  flex: 1;
  min-width: 100px;
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  border: 1px solid var(--border-color);
}

.qs-stat .qs-number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
}

.qs-stat .qs-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.qs-stat.correct .qs-number { color: #10b981; }
.qs-stat.partial .qs-number { color: #f59e0b; }
.qs-stat.incorrect .qs-number { color: #ef4444; }

.question-result-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
  border-left: 4px solid var(--border-color);
}

.question-result-card.excellent { border-left-color: #10b981; }
.question-result-card.good { border-left-color: #3b82f6; }
.question-result-card.fair { border-left-color: #f59e0b; }
.question-result-card.poor { border-left-color: #ef4444; }

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.question-number {
  background: var(--primary);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.question-score {
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
}

.question-score.pass { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.question-score.good { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.question-score.partial { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.question-score.fail { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

.score-percent {
  font-size: 0.8rem;
  opacity: 0.8;
  margin-left: 0.25rem;
}

.question-prompt {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.question-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.phase-tag, .bloom-tag, .arce-tag {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: var(--bg-primary);
}

.arce-tag.analysis { border-left: 2px solid #3b82f6; }
.arce-tag.reasoning { border-left: 2px solid #10b981; }
.arce-tag.creativity { border-left: 2px solid #f59e0b; }
.arce-tag.evidence { border-left: 2px solid #ef4444; }

.answer-comparison {
  margin-top: 1rem;
}

.answer-block, .feedback-block, .rubric-block {
  margin-bottom: 1rem;
}

.answer-block label, .feedback-block label, .rubric-block label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.answer-content, .feedback-content {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
}

.answer-content pre {
  white-space: pre-wrap;
  font-family: inherit;
  margin: 0;
}

.char-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.feedback-content {
  border-left: 3px solid var(--primary);
}

.rubric-level {
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.rubric-level.level-5 { background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; }
.rubric-level.level-4 { background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; }
.rubric-level.level-3 { background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; }
.rubric-level.level-2 { background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; }
.rubric-level.level-1 { background: rgba(239, 68, 68, 0.2); border-left: 3px solid #ef4444; }

.score-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 6px solid;
}

.score-circle.excellent { border-color: #10b981; background: rgba(16, 185, 129, 0.1); }
.score-circle.good { border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
.score-circle.fair { border-color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
.score-circle.poor { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }

.score-value {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
}

.score-unit {
  font-size: 1rem;
  color: var(--text-secondary);
}

.pa-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.875rem;
}

.pa-badge.pa4 { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.pa-badge.pa3 { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.pa-badge.pa2 { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.pa-badge.pa1 { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.summary-info {
  flex: 1;
}

.summary-info h1 {
  margin-bottom: 0.25rem;
  font-size: 1.5rem;
}

.summary-info .topic {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.score-breakdown {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.breakdown-item .label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.breakdown-item .value {
  font-weight: 600;
}

/* ARCE Section */
.arce-section {
  margin-bottom: 2rem;
}

.arce-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.arce-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  border: 2px solid transparent;
}

.arce-card.analysis { border-color: rgba(59, 130, 246, 0.3); }
.arce-card.reasoning { border-color: rgba(16, 185, 129, 0.3); }
.arce-card.creativity { border-color: rgba(245, 158, 11, 0.3); }
.arce-card.evidence { border-color: rgba(239, 68, 68, 0.3); }

.arce-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.arce-info h3 {
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.arce-bar {
  height: 6px;
  background: var(--bg-primary);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.arce-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.arce-card.analysis .arce-fill { background: #3b82f6; }
.arce-card.reasoning .arce-fill { background: #10b981; }
.arce-card.creativity .arce-fill { background: #f59e0b; }
.arce-card.evidence .arce-fill { background: #ef4444; }

.arce-score {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.arce-feedback {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
  line-height: 1.4;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.radar-container {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 400px;
  margin: 0 auto;
}

/* Feedback Section */
.feedback-section {
  margin-bottom: 2rem;
}

.feedback-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.feedback-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
}

.feedback-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.feedback-card.strengths .feedback-header .material-icons { color: #10b981; }
.feedback-card.weaknesses .feedback-header .material-icons { color: #f59e0b; }

.feedback-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feedback-card li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
  border-bottom: 1px solid var(--border-color);
}

.feedback-card li:last-child {
  border-bottom: none;
}

.feedback-card li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--primary);
}

.no-data {
  color: var(--text-secondary);
  font-style: italic;
}

/* Suggestions Section */
.suggestions-section {
  margin-bottom: 2rem;
}

.suggestions-list {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
}

.suggestion-item {
  display: flex;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-number {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
}

.suggestion-item p {
  margin: 0;
  line-height: 1.6;
}

/* Questions Section */
.questions-section {
  margin-bottom: 2rem;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.question-result-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 2px solid var(--border-color);
  overflow: hidden;
}

.question-result-card.passed {
  border-color: rgba(16, 185, 129, 0.3);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: var(--bg-primary);
}

.question-number {
  font-weight: 600;
}

.question-score {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.question-score.pass {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.question-score.fail {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.question-content {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.question-content h4 {
  margin-bottom: 0.75rem;
}

.question-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.phase-tag {
  padding: 0.25rem 0.5rem;
  background: var(--bg-primary);
  border-radius: 4px;
  font-size: 0.75rem;
}

.arce-tag {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.arce-tag.analysis { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.arce-tag.reasoning { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.arce-tag.creativity { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.arce-tag.evidence { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

.answer-section {
  padding: 1.5rem;
}

.answer-block, .feedback-block {
  margin-bottom: 1rem;
}

.answer-block:last-child, .feedback-block:last-child {
  margin-bottom: 0;
}

.answer-block label, .feedback-block label, .arce-breakdown label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.answer-text {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 8px;
  line-height: 1.6;
}

.feedback-text {
  padding: 1rem;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  border-left: 3px solid var(--primary);
  line-height: 1.6;
}

.arce-breakdown {
  padding: 0 1.5rem 1.5rem;
}

.mini-arce-scores {
  display: flex;
  gap: 0.5rem;
}

.mini-score {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.mini-score.analysis { background: rgba(59, 130, 246, 0.15); }
.mini-score.reasoning { background: rgba(16, 185, 129, 0.15); }
.mini-score.creativity { background: rgba(245, 158, 11, 0.15); }
.mini-score.evidence { background: rgba(239, 68, 68, 0.15); }

/* LO Section */
.lo-section {
  margin-bottom: 2rem;
}

.lo-cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lo-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  border: 2px solid var(--border-color);
}

.lo-card.achieved {
  border-color: rgba(16, 185, 129, 0.3);
}

.lo-status .material-icons {
  font-size: 1.5rem;
  color: var(--text-secondary);
}

.lo-card.achieved .lo-status .material-icons {
  color: #10b981;
}

.lo-info h4 {
  margin: 0 0 0.25rem 0;
  font-size: 0.875rem;
}

.lo-info p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Overall Section */
.overall-section {
  margin-bottom: 2rem;
}

.overall-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  border-left: 4px solid var(--primary);
}

.overall-card p {
  margin: 0;
  line-height: 1.8;
}

/* Actions Section */
.actions-section {
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding-top: 1rem;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  text-decoration: none;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-outline {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-outline:hover {
  border-color: var(--primary);
  color: var(--primary);
}

/* Responsive */
@media (max-width: 768px) {
  .result-container {
    padding: 1rem;
  }
  
  .summary-card {
    flex-direction: column;
    text-align: center;
  }
  
  .score-breakdown {
    grid-template-columns: 1fr;
  }
  
  .arce-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .feedback-grid {
    grid-template-columns: 1fr;
  }
  
  .actions-section {
    flex-direction: column;
  }
}
</style>
