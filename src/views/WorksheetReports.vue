<template>
  <div class="worksheet-reports-view">
    <!-- Top Navigation -->
    <nav class="top-navbar">
      <div class="nav-brand">
        <router-link to="/teacher/worksheets" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <span class="brand-icon">📊</span>
        <span class="brand-text">รายงานใบงาน</span>
      </div>
      <div class="nav-actions">
        <button class="btn btn-outline btn-sm" @click="exportReport">
          <span class="material-icons">download</span>
          ส่งออก CSV
        </button>
      </div>
    </nav>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
      <p>กำลังโหลดรายงาน...</p>
    </div>

    <!-- Report Content -->
    <div v-else class="reports-container">
      <!-- Worksheet Selector (if viewing all) -->
      <div v-if="!worksheetId" class="worksheet-selector">
        <h2>เลือกใบงานเพื่อดูรายงาน</h2>
        <div class="worksheet-grid">
          <div v-for="ws in worksheets" :key="ws.id" class="ws-card" @click="selectWorksheet(ws.id)">
            <h3>{{ ws.metadata?.title || 'ใบงาน' }}</h3>
            <p>{{ ws.metadata?.topic }}</p>
            <div class="ws-stats">
              <span>📝 {{ ws.stats?.totalSubmitted || 0 }} ผู้ส่ง</span>
              <span>⭐ {{ ws.stats?.averageScore?.toFixed(1) || '-' }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Worksheet Report -->
      <div v-else-if="worksheet">
        <!-- Header -->
        <header class="report-header">
          <div class="header-info">
            <h1>{{ worksheet.metadata?.title }}</h1>
            <p class="topic">{{ worksheet.metadata?.topic }}</p>
            <div class="meta-tags">
              <span class="tag">📚 {{ worksheet.courseName }}</span>
              <span class="tag">⏱️ {{ worksheet.metadata?.duration || 50 }} นาที</span>
              <span class="tag">📝 {{ worksheet.metadata?.totalQuestions || 0 }} คำถาม</span>
            </div>
          </div>
          <div class="header-stats">
            <div class="stat-circle">
              <span class="stat-value">{{ stats.totalSubmissions }}</span>
              <span class="stat-label">ผู้ส่งทั้งหมด</span>
            </div>
          </div>
        </header>

        <!-- Overview Stats -->
        <section class="overview-section">
          <h2 class="section-title">📈 ภาพรวมผลการประเมิน</h2>
          <div class="overview-cards">
            <div class="overview-card">
              <div class="card-icon">📊</div>
              <div class="card-content">
                <span class="card-value">{{ stats.averageScore?.toFixed(1) || 0 }}%</span>
                <span class="card-label">คะแนนเฉลี่ย</span>
              </div>
            </div>
            <div class="overview-card">
              <div class="card-icon">🏆</div>
              <div class="card-content">
                <span class="card-value">{{ stats.highestScore || 0 }}%</span>
                <span class="card-label">คะแนนสูงสุด</span>
              </div>
            </div>
            <div class="overview-card">
              <div class="card-icon">📉</div>
              <div class="card-content">
                <span class="card-value">{{ stats.lowestScore || 0 }}%</span>
                <span class="card-label">คะแนนต่ำสุด</span>
              </div>
            </div>
            <div class="overview-card">
              <div class="card-icon">✅</div>
              <div class="card-content">
                <span class="card-value">{{ stats.passRate || 0 }}%</span>
                <span class="card-label">อัตราผ่าน (≥60%)</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ARCE Analysis -->
        <section class="arce-section">
          <h2 class="section-title">🎯 การวิเคราะห์ A.R.C.E.</h2>
          <div class="arce-analysis">
            <div v-for="(value, key) in stats.arceAverages" :key="key" class="arce-item">
              <div class="arce-header">
                <span class="arce-icon">{{ getArceIcon(key) }}</span>
                <span class="arce-name">{{ getArceLabel(key) }}</span>
              </div>
              <div class="arce-bar-container">
                <div class="arce-bar" :style="{ width: (value / 5 * 100) + '%' }" :class="key"></div>
              </div>
              <span class="arce-score">{{ value?.toFixed(2) || 0 }} / 5</span>
            </div>
          </div>
        </section>

        <!-- PA Level Distribution -->
        <section class="pa-section">
          <h2 class="section-title">📋 การกระจายตัวระดับ PA</h2>
          <div class="pa-distribution">
            <div v-for="(count, level) in stats.paDistribution" :key="level" class="pa-bar-item">
              <div class="pa-label">{{ level }}</div>
              <div class="pa-bar-container">
                <div class="pa-bar" :style="{ width: getPercentage(count, stats.totalSubmissions) + '%' }" :class="'pa' + level.slice(-1)"></div>
              </div>
              <div class="pa-count">{{ count }} คน ({{ getPercentage(count, stats.totalSubmissions) }}%)</div>
            </div>
          </div>
        </section>

        <!-- Question Analysis Section -->
        <section class="question-analysis-section">
          <h2 class="section-title">📋 การวิเคราะห์ตามคำถาม</h2>
          <div class="question-analysis-grid" v-if="stats.questionAnalysis?.length > 0">
            <div v-for="(qa, idx) in stats.questionAnalysis" :key="idx" class="question-analysis-card">
              <div class="qa-header">
                <span class="qa-number">ข้อ {{ idx + 1 }}</span>
                <span class="qa-bloom-badge" :class="'bloom-' + (qa.bloomLevel || 1)">{{ getBloomLabel(qa.bloomLevel || 1) }}</span>
              </div>
              <p class="qa-text">{{ truncateText(qa.question, 80) }}</p>
              <div class="qa-stats">
                <div class="qa-stat">
                  <span class="qa-stat-value" :class="qa.avgScore >= 3 ? 'good' : 'poor'">{{ qa.avgScore?.toFixed(1) || 0 }}</span>
                  <span class="qa-stat-label">คะแนนเฉลี่ย</span>
                </div>
                <div class="qa-stat">
                  <span class="qa-stat-value">{{ qa.passRate?.toFixed(0) || 0 }}%</span>
                  <span class="qa-stat-label">อัตราผ่าน</span>
                </div>
                <div class="qa-stat">
                  <span class="qa-stat-value">{{ qa.totalAnswered }}</span>
                  <span class="qa-stat-label">ผู้ตอบ</span>
                </div>
              </div>
              <div class="qa-bar-container">
                <div class="qa-bar" :style="{ width: (qa.avgScore / 5 * 100) + '%' }" :class="qa.avgScore >= 3 ? 'good' : 'poor'"></div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state small">
            <span class="material-icons">analytics</span>
            <p>ยังไม่มีข้อมูลการวิเคราะห์ - ต้องมีนักเรียนส่งงานอย่างน้อย 1 คน</p>
          </div>
        </section>

        <!-- Bloom's Taxonomy Overview -->
        <section class="bloom-section" v-if="Object.keys(stats.bloomAnalysis || {}).length > 0">
          <h2 class="section-title">🧠 การวิเคราะห์ระดับการคิด (Bloom's Taxonomy)</h2>
          <div class="bloom-analysis">
            <div v-for="(data, level) in stats.bloomAnalysis" :key="level" class="bloom-item">
              <div class="bloom-header">
                <span class="bloom-icon">{{ getBloomIcon(level) }}</span>
                <span class="bloom-name">{{ getBloomLabel(parseInt(level)) }}</span>
              </div>
              <div class="bloom-bar-container">
                <div class="bloom-bar" :style="{ width: (data.avgScore / 5 * 100) + '%' }" :class="'bloom-' + level"></div>
              </div>
              <span class="bloom-score">{{ data.avgScore?.toFixed(2) || 0 }} / 5</span>
              <span class="bloom-count">({{ data.count }} คำถาม)</span>
            </div>
          </div>
          <div class="bloom-insight" v-if="getBloomInsight() !== 'ยังไม่มีข้อมูลเพียงพอ'">
            <h4>💡 ข้อเสนอแนะ:</h4>
            <p>{{ getBloomInsight() }}</p>
          </div>
        </section>
        <section class="bloom-section" v-else>
          <h2 class="section-title">🧠 การวิเคราะห์ระดับการคิด (Bloom's Taxonomy)</h2>
          <div class="empty-state small">
            <span class="material-icons">psychology</span>
            <p>ยังไม่มีข้อมูลระดับ Bloom - ระบบจะวิเคราะห์จาก questionResults ของนักเรียน</p>
          </div>
        </section>

        <!-- Submissions Table -->
        <section class="submissions-section">
          <h2 class="section-title">📝 รายละเอียดการส่งงาน ({{ filteredSubmissions.length }} คน)</h2>
          
          <div class="table-filters">
            <div class="search-box">
              <span class="material-icons">search</span>
              <input type="text" v-model="searchStudent" placeholder="ค้นหานักเรียน...">
            </div>
            <select v-model="filterPa">
              <option value="">ทุกระดับ PA</option>
              <option value="1">PA 1</option>
              <option value="2">PA 2</option>
              <option value="3">PA 3</option>
              <option value="4">PA 4</option>
            </select>
            <select v-model="filterGrade">
              <option value="">ทุกชั้นเรียน</option>
              <option v-for="g in availableGrades" :key="g" :value="g">{{ g }}</option>
            </select>
            <select v-model="sortBy">
              <option value="submittedAt">เรียงตามวันที่ส่ง</option>
              <option value="score">เรียงตามคะแนน (สูง-ต่ำ)</option>
              <option value="scoreAsc">เรียงตามคะแนน (ต่ำ-สูง)</option>
              <option value="studentId">เรียงตามรหัสนักเรียน</option>
              <option value="class">เรียงตามห้องเรียน</option>
            </select>
          </div>

          <div class="submissions-table-wrapper" v-if="filteredSubmissions.length > 0">
            <table class="submissions-table-fixed">
              <thead>
                <tr>
                  <th class="col-id">รหัส</th>
                  <th class="col-name">ชื่อ-นามสกุล</th>
                  <th class="col-grade">ชั้น</th>
                  <th class="col-room">ห้อง</th>
                  <th class="col-number">เลขที่</th>
                  <th class="col-section">ตอน</th>
                  <th class="col-score">คะแนน</th>
                  <th class="col-pa">PA</th>
                  <th class="col-lo">LO</th>
                  <th class="col-arce">A.R.C.E.</th>
                  <th class="col-time">เวลา</th>
                  <th class="col-date">ส่งเมื่อ</th>
                  <th class="col-actions">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="sub in filteredSubmissions" :key="sub.id" :class="{ 'at-risk': isAtRisk(sub) }">
                  <td class="col-id">
                    <span class="student-id-badge">{{ getStudentId(sub) }}</span>
                  </td>
                  <td class="col-name">{{ getStudentName(sub) }}</td>
                  <td class="col-grade">{{ sub.studentData?.grade || '-' }}</td>
                  <td class="col-room">{{ sub.studentData?.room || '-' }}</td>
                  <td class="col-number">{{ sub.studentData?.number || '-' }}</td>
                  <td class="col-section">{{ sub.studentData?.section || '-' }}</td>
                  <td>
                    <span class="score-badge" :class="getScoreClass(sub.assessment?.summary?.percentage)">
                      {{ sub.assessment?.summary?.percentage?.toFixed(0) || 0 }}%
                    </span>
                  </td>
                  <td>
                    <span class="pa-badge" :class="'pa' + (sub.assessment?.summary?.paLevel || 1)">
                      {{ sub.assessment?.summary?.paLevelText || 'PA 1' }}
                    </span>
                  </td>
                  <td>
                    <div class="lo-mini-badge" :title="getLoTooltip(sub)">
                      <span class="lo-count" :class="{ 'has-lo': getPassedLOCount(sub) > 0 }">
                        {{ getPassedLOCount(sub) }}/{{ worksheetLOCount }}
                      </span>
                      <span class="lo-icons" v-if="getPassedLOCount(sub) > 0">
                        🎓
                      </span>
                    </div>
                  </td>
                  <td>
                    <div class="mini-arce">
                      <span v-for="(score, key) in sub.assessment?.arceScores" :key="key" :class="['mini-arce-item', key]" :title="getArceLabel(key)">
                        {{ getArceIcon(key) }}{{ typeof score === 'object' ? score.raw : score }}
                      </span>
                    </div>
                  </td>
                  <td class="time-spent">{{ formatTimeSpent(sub.timeSpent) }}</td>
                  <td>{{ formatDate(sub.submittedAt) }}</td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn-icon" @click="viewSubmission(sub)" title="ดูรายละเอียด">
                        <span class="material-icons">visibility</span>
                      </button>
                      <button class="btn-icon" @click="exportStudentReport(sub)" title="ส่งออกรายงาน">
                        <span class="material-icons">download</span>
                      </button>
                      <button class="btn-icon" @click="provideFeedback(sub)" title="ให้ข้อเสนอแนะ">
                        <span class="material-icons">comment</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="empty-state">
            <span class="material-icons">inbox</span>
            <p>ยังไม่มีการส่งงาน</p>
          </div>
        </section>

        <!-- Common Strengths & Weaknesses -->
        <section class="analysis-section" v-if="stats.commonStrengths?.length || stats.commonWeaknesses?.length">
          <h2 class="section-title">💡 การวิเคราะห์ภาพรวม</h2>
          <div class="analysis-grid">
            <div class="analysis-card strengths">
              <div class="analysis-header">
                <span class="material-icons">thumb_up</span>
                <h3>จุดเด่นที่พบบ่อย</h3>
              </div>
              <ul v-if="stats.commonStrengths?.length">
                <li v-for="(item, idx) in stats.commonStrengths" :key="idx">{{ item }}</li>
              </ul>
              <p v-else class="no-data">ยังไม่มีข้อมูล</p>
            </div>
            <div class="analysis-card weaknesses">
              <div class="analysis-header">
                <span class="material-icons">lightbulb</span>
                <h3>จุดที่ควรพัฒนาที่พบบ่อย</h3>
              </div>
              <ul v-if="stats.commonWeaknesses?.length">
                <li v-for="(item, idx) in stats.commonWeaknesses" :key="idx">{{ item }}</li>
              </ul>
              <p v-else class="no-data">ยังไม่มีข้อมูล</p>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Submission Detail Modal -->
    <div v-if="showSubmissionModal" class="modal-overlay" @click.self="showSubmissionModal = false">
      <div class="modal-content modal-xl">
        <div class="modal-header">
          <h2>📋 รายงานผลการประเมินรายบุคคล</h2>
          <div class="modal-actions">
            <button class="btn btn-sm btn-outline" @click="exportStudentReport(selectedSubmission)">
              <span class="material-icons">download</span>
              ส่งออก
            </button>
            <button class="btn-close" @click="showSubmissionModal = false">
              <span class="material-icons">close</span>
            </button>
          </div>
        </div>
        <div class="modal-body" v-if="selectedSubmission">
          <!-- Student Info Card -->
          <div class="student-info-card">
            <div class="student-avatar">
              <span class="material-icons">person</span>
            </div>
            <div class="student-details">
              <h3>{{ selectedSubmission.studentName || selectedSubmission.studentData?.displayName || 'นักเรียน' }}</h3>
              <div class="student-meta">
                <span class="meta-item">
                  <span class="material-icons">badge</span>
                  รหัส: {{ selectedSubmission.studentData?.studentId || selectedSubmission.studentId || '-' }}
                </span>
                <span class="meta-item">
                  <span class="material-icons">school</span>
                  ชั้น {{ selectedSubmission.studentData?.grade || '-' }}/{{ selectedSubmission.studentData?.room || '-' }}
                </span>
                <span class="meta-item">
                  <span class="material-icons">tag</span>
                  เลขที่ {{ selectedSubmission.studentData?.number || '-' }}
                </span>
                <span class="meta-item" v-if="selectedSubmission.studentData?.section">
                  <span class="material-icons">groups</span>
                  ตอน {{ selectedSubmission.studentData.section }}
                </span>
              </div>
            </div>
            <div class="score-summary">
              <div class="score-big" :class="getScoreClass(selectedSubmission.assessment?.summary?.percentage)">
                {{ selectedSubmission.assessment?.summary?.percentage?.toFixed(0) || 0 }}%
              </div>
              <span class="pa-badge" :class="'pa' + (selectedSubmission.assessment?.summary?.paLevel || 1)">
                {{ selectedSubmission.assessment?.summary?.paLevelText || 'PA 1' }}
              </span>
            </div>
          </div>

          <!-- Submission Stats -->
          <div class="submission-stats-grid">
            <div class="stat-item">
              <span class="stat-icon">⏱️</span>
              <span class="stat-value">{{ formatTimeSpent(selectedSubmission.timeSpent) }}</span>
              <span class="stat-label">เวลาที่ใช้</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">📝</span>
              <span class="stat-value">{{ selectedSubmission.assessment?.questionResults?.length || 0 }}</span>
              <span class="stat-label">คำถาม</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">✅</span>
              <span class="stat-value">{{ countPassedQuestions(selectedSubmission) }}</span>
              <span class="stat-label">ผ่านเกณฑ์</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">📅</span>
              <span class="stat-value">{{ formatDate(selectedSubmission.submittedAt) }}</span>
              <span class="stat-label">ส่งเมื่อ</span>
            </div>
          </div>

          <!-- ARCE Scores with Feedback -->
          <div class="submission-arce">
            <h4>🎯 คะแนน A.R.C.E. (ทักษะการคิดขั้นสูง)</h4>
            <div class="arce-scores-detailed">
              <div v-for="(score, key) in selectedSubmission.assessment?.arceScores" :key="key" class="arce-score-card" :class="key">
                <div class="arce-card-header">
                  <span class="arce-icon">{{ getArceIcon(key) }}</span>
                  <span class="arce-label">{{ getArceFullLabel(key) }}</span>
                </div>
                <div class="arce-card-score">
                  <div class="arce-bar-bg">
                    <div class="arce-bar-fill" :style="{ width: (getArceRaw(score) / 5 * 100) + '%' }"></div>
                  </div>
                  <span class="arce-value">{{ getArceRaw(score) }}/5</span>
                </div>
                <p v-if="typeof score === 'object' && score.feedback" class="arce-feedback">{{ score.feedback }}</p>
                <p v-else class="arce-feedback arce-feedback-placeholder">{{ getArceDescription(key, getArceRaw(score)) }}</p>
              </div>
            </div>
          </div>

          <!-- Cognitive Level Analysis -->
          <div class="cognitive-analysis">
            <h4>🧠 การวิเคราะห์ระดับการคิด</h4>
            <div class="cognitive-radar">
              <div v-for="level in 6" :key="level" class="cognitive-level-item">
                <div class="cognitive-level-header">
                  <span class="cognitive-icon">{{ getBloomIcon(level) }}</span>
                  <span class="cognitive-name">{{ getBloomLabel(level) }}</span>
                </div>
                <div class="cognitive-bar-container">
                  <div class="cognitive-bar" :style="{ width: getCognitiveLevelScore(selectedSubmission, level) + '%' }" :class="'bloom-' + level"></div>
                </div>
                <span class="cognitive-score">{{ getCognitiveLevelScore(selectedSubmission, level) }}%</span>
              </div>
            </div>
            <p class="cognitive-insight">{{ getCognitiveInsight(selectedSubmission) }}</p>
          </div>

          <div class="submission-feedback">
            <div class="feedback-block strengths" v-if="selectedSubmission.assessment?.strengths?.length">
              <h4>✅ จุดเด่นของนักเรียน</h4>
              <ul>
                <li v-for="(s, idx) in selectedSubmission.assessment.strengths" :key="idx">{{ s }}</li>
              </ul>
            </div>
            <div class="feedback-block weaknesses" v-if="selectedSubmission.assessment?.weaknesses?.length">
              <h4>💡 สิ่งที่ควรพัฒนา</h4>
              <ul>
                <li v-for="(w, idx) in selectedSubmission.assessment.weaknesses" :key="idx">{{ w }}</li>
              </ul>
            </div>
          </div>

          <!-- Question Results with Bloom Level -->
          <div class="submission-answers">
            <h4>📝 คำตอบและการประเมินรายข้อ</h4>
            <div v-for="(result, idx) in selectedSubmission.assessment?.questionResults" :key="idx" class="answer-card" :class="{ 'passed': result.passed, 'failed': !result.passed }">
              <div class="answer-header">
                <div class="answer-q-info">
                  <span class="q-number">ข้อ {{ idx + 1 }}</span>
                  <span class="q-bloom-badge" :class="'bloom-' + (result.bloomLevel || 1)">{{ getBloomLabel(result.bloomLevel || 1) }}</span>
                </div>
                <div class="answer-score-info">
                  <span class="q-score" :class="result.passed ? 'pass' : 'fail'">{{ result.score || 0 }}/{{ result.maxScore || 5 }}</span>
                  <span class="q-status">{{ result.passed ? '✅ ผ่าน' : '❌ ไม่ผ่าน' }}</span>
                </div>
              </div>
              <p class="q-text">{{ result.question }}</p>
              <div class="answer-content">
                <div class="student-answer-block">
                  <label>📖 คำตอบของนักเรียน:</label>
                  <p>{{ result.studentAnswer || '-' }}</p>
                </div>
                <div class="ai-feedback-block" v-if="result.feedback">
                  <label>🤖 ความเห็น AI:</label>
                  <p>{{ result.feedback }}</p>
                </div>
                <div class="improvement-block" v-if="!result.passed && result.suggestion">
                  <label>📚 คำแนะนำเพื่อการพัฒนา:</label>
                  <p>{{ result.suggestion }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Overall Recommendation -->
          <div class="overall-recommendation" v-if="selectedSubmission.assessment?.overallFeedback || selectedSubmission.assessment?.recommendation">
            <h4>📌 ข้อสรุปและข้อเสนอแนะ</h4>
            <p class="overall-text">{{ selectedSubmission.assessment?.overallFeedback || selectedSubmission.assessment?.recommendation || 'ยังไม่มีข้อเสนอแนะเพิ่มเติม' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(true)
const worksheetId = ref(route.params.id || null)
const worksheet = ref(null)
const worksheets = ref([])
const submissions = ref([])
const stats = ref({})

// Filters
const searchStudent = ref('')
const filterPa = ref('')
const filterGrade = ref('')
const sortBy = ref('submittedAt')

// Modal
const showSubmissionModal = ref(false)
const selectedSubmission = ref(null)

// Computed - Learning Outcomes count for this worksheet
const worksheetLOCount = computed(() => {
  return worksheet.value?.metadata?.learningOutcomes?.length || 0
})

// Computed - available grades
const availableGrades = computed(() => {
  const grades = new Set()
  submissions.value.forEach(sub => {
    if (sub.studentData?.grade) {
      grades.add(sub.studentData.grade)
    }
  })
  return Array.from(grades).sort()
})

// Computed
const filteredSubmissions = computed(() => {
  let result = [...submissions.value]
  
  if (searchStudent.value) {
    const q = searchStudent.value.toLowerCase()
    result = result.filter(sub => 
      sub.studentName?.toLowerCase().includes(q) ||
      sub.studentNumber?.toLowerCase().includes(q) ||
      sub.studentData?.studentId?.toLowerCase().includes(q) ||
      sub.studentData?.displayName?.toLowerCase().includes(q)
    )
  }
  
  if (filterPa.value) {
    result = result.filter(sub => sub.assessment?.summary?.paLevel === parseInt(filterPa.value))
  }

  if (filterGrade.value) {
    result = result.filter(sub => sub.studentData?.grade === filterGrade.value)
  }
  
  // Sort
  result.sort((a, b) => {
    if (sortBy.value === 'score') {
      return (b.assessment?.summary?.percentage || 0) - (a.assessment?.summary?.percentage || 0)
    } else if (sortBy.value === 'scoreAsc') {
      return (a.assessment?.summary?.percentage || 0) - (b.assessment?.summary?.percentage || 0)
    } else if (sortBy.value === 'studentId') {
      const idA = a.studentData?.studentId || a.studentId || ''
      const idB = b.studentData?.studentId || b.studentId || ''
      return idA.localeCompare(idB)
    } else if (sortBy.value === 'class') {
      const gradeA = a.studentData?.grade || ''
      const gradeB = b.studentData?.grade || ''
      if (gradeA !== gradeB) return gradeA.localeCompare(gradeB)
      const roomA = a.studentData?.room || ''
      const roomB = b.studentData?.room || ''
      if (roomA !== roomB) return roomA.localeCompare(roomB)
      const numA = parseInt(a.studentData?.number) || 0
      const numB = parseInt(b.studentData?.number) || 0
      return numA - numB
    } else {
      const dateA = a.submittedAt?.toDate?.() || new Date(0)
      const dateB = b.submittedAt?.toDate?.() || new Date(0)
      return dateB - dateA
    }
  })
  
  return result
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

// LO Helper functions
function getPassedLOCount(submission) {
  const loAssessment = submission.loAssessment || submission.assessment?.loAssessment
  return loAssessment?.passedLOs?.length || 0
}

function getLoTooltip(submission) {
  const loAssessment = submission.loAssessment || submission.assessment?.loAssessment
  const passedLOs = loAssessment?.passedLOs || []
  if (passedLOs.length === 0) return 'ยังไม่มี LO ที่ผ่าน'
  return `LO ที่ผ่าน: ${passedLOs.join(', ')}`
}

function getArceFullLabel(arce) {
  const labels = { 
    analysis: 'Analysis (การวิเคราะห์)', 
    reasoning: 'Reasoning (การให้เหตุผล)', 
    creativity: 'Creativity (ความคิดสร้างสรรค์)', 
    evidence: 'Evidence (การใช้หลักฐาน)' 
  }
  return labels[arce] || arce
}

function getArceRaw(score) {
  return typeof score === 'object' ? (score.raw || 0) : (score || 0)
}

function getArceDescription(key, score) {
  const descriptions = {
    analysis: {
      5: 'วิเคราะห์ได้อย่างลึกซึ้ง เห็นความเชื่อมโยงชัดเจน',
      4: 'วิเคราะห์ได้ดี แยกแยะประเด็นสำคัญได้',
      3: 'วิเคราะห์ได้ในระดับพอใช้',
      2: 'ต้องพัฒนาทักษะการวิเคราะห์',
      1: 'ขาดทักษะการวิเคราะห์',
    },
    reasoning: {
      5: 'ให้เหตุผลเป็นระบบ ตรรกะชัดเจน',
      4: 'ให้เหตุผลได้ดี มีลำดับขั้นตอน',
      3: 'ให้เหตุผลได้ในระดับพอใช้',
      2: 'ต้องพัฒนาทักษะการให้เหตุผล',
      1: 'ขาดทักษะการให้เหตุผล',
    },
    creativity: {
      5: 'มีความคิดสร้างสรรค์โดดเด่น',
      4: 'แสดงความคิดสร้างสรรค์ได้ดี',
      3: 'มีความคิดสร้างสรรค์ในระดับพอใช้',
      2: 'ต้องพัฒนาความคิดสร้างสรรค์',
      1: 'ขาดความคิดสร้างสรรค์',
    },
    evidence: {
      5: 'ใช้หลักฐานอ้างอิงได้อย่างยอดเยี่ยม',
      4: 'ใช้หลักฐานประกอบได้ดี',
      3: 'ใช้หลักฐานได้ในระดับพอใช้',
      2: 'ต้องพัฒนาการใช้หลักฐาน',
      1: 'ขาดการใช้หลักฐาน',
    }
  }
  const level = Math.max(1, Math.min(5, Math.round(score)))
  return descriptions[key]?.[level] || ''
}

function getBloomLabel(level) {
  const labels = {
    1: 'Remember (จำ)',
    2: 'Understand (เข้าใจ)',
    3: 'Apply (ประยุกต์)',
    4: 'Analyze (วิเคราะห์)',
    5: 'Evaluate (ประเมิน)',
    6: 'Create (สร้างสรรค์)'
  }
  return labels[level] || `Level ${level}`
}

function getBloomIcon(level) {
  const icons = { 1: '📚', 2: '💡', 3: '🔧', 4: '🔬', 5: '⚖️', 6: '🎨' }
  return icons[level] || '📝'
}

function truncateText(text, maxLength) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

function formatTimeSpent(seconds) {
  if (!seconds) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return `${mins} นาที ${secs} วินาที`
  }
  return `${secs} วินาที`
}

function isAtRisk(sub) {
  const percentage = sub.assessment?.summary?.percentage || 0
  return percentage < 50
}

function countPassedQuestions(sub) {
  if (!sub.assessment?.questionResults) return 0
  return sub.assessment.questionResults.filter(q => q.passed).length
}

function getCognitiveLevelScore(sub, level) {
  if (!sub.assessment?.questionResults) return 0
  const questions = sub.assessment.questionResults.filter(q => q.bloomLevel === level)
  if (questions.length === 0) return 0
  const avgScore = questions.reduce((sum, q) => sum + (q.score || 0), 0) / questions.length
  return Math.round((avgScore / 5) * 100)
}

function getCognitiveInsight(sub) {
  if (!sub.assessment?.questionResults) return 'ยังไม่มีข้อมูลเพียงพอ'
  
  const arce = sub.assessment?.arceScores || {}
  const analysis = getArceRaw(arce.analysis)
  const reasoning = getArceRaw(arce.reasoning)
  const creativity = getArceRaw(arce.creativity)
  const evidence = getArceRaw(arce.evidence)
  
  const strongest = Object.entries({ analysis, reasoning, creativity, evidence })
    .sort((a, b) => b[1] - a[1])[0]
  const weakest = Object.entries({ analysis, reasoning, creativity, evidence })
    .sort((a, b) => a[1] - b[1])[0]
  
  const strengthLabels = { analysis: 'การวิเคราะห์', reasoning: 'การให้เหตุผล', creativity: 'ความคิดสร้างสรรค์', evidence: 'การใช้หลักฐาน' }
  
  return `นักเรียนมีจุดแข็งด้าน${strengthLabels[strongest[0]]} (${strongest[1]}/5) ควรพัฒนาด้าน${strengthLabels[weakest[0]]} (${weakest[1]}/5) เพื่อยกระดับทักษะการคิดขั้นสูงให้ครอบคลุมยิ่งขึ้น`
}

function getBloomInsight() {
  if (!stats.value.bloomAnalysis) return 'ยังไม่มีข้อมูลเพียงพอ'
  
  const levels = Object.entries(stats.value.bloomAnalysis)
    .filter(([_, data]) => data.count > 0)
    .sort((a, b) => b[1].avgScore - a[1].avgScore)
  
  if (levels.length === 0) return 'ยังไม่มีข้อมูลเพียงพอ'
  
  const strongest = levels[0]
  const weakest = levels[levels.length - 1]
  
  return `นักเรียนส่วนใหญ่ทำได้ดีในระดับ ${getBloomLabel(parseInt(strongest[0]))} (เฉลี่ย ${strongest[1].avgScore.toFixed(1)}/5) ควรเสริมกิจกรรมระดับ ${getBloomLabel(parseInt(weakest[0]))} (เฉลี่ย ${weakest[1].avgScore.toFixed(1)}/5) เพื่อพัฒนาทักษะการคิดขั้นสูง`
}

function getScoreClass(percentage) {
  const pct = parseFloat(percentage) || 0
  if (pct >= 80) return 'excellent'
  if (pct >= 60) return 'good'
  if (pct >= 40) return 'fair'
  return 'poor'
}

function getStudentId(sub) {
  // ใช้รหัสนักเรียน 5 หลักจาก studentData เท่านั้น (ไม่ใช้ Firebase UID)
  const studentId = sub.studentData?.studentId
  if (studentId && studentId.length === 5 && /^\d{5}$/.test(studentId)) {
    return studentId
  }
  return '-'
}

function getStudentName(sub) {
  return sub.studentName || sub.studentData?.displayName || 'นักเรียน'
}

function getPercentage(count, total) {
  if (!total) return 0
  return Math.round((count / total) * 100)
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

function selectWorksheet(id) {
  worksheetId.value = id
  router.push(`/teacher/worksheet-reports/${id}`)
  loadWorksheetReport(id)
}

function viewSubmission(sub) {
  selectedSubmission.value = sub
  showSubmissionModal.value = true
}

function exportStudentReport(sub) {
  if (!sub) return
  
  const BOM = '\uFEFF'
  let csvContent = BOM
  
  // Header
  csvContent += `รายงานผลการประเมินรายบุคคล\n`
  csvContent += `ใบงาน: ${worksheet.value?.metadata?.title}\n`
  csvContent += `รายวิชา: ${worksheet.value?.courseName}\n\n`
  
  // Student Info
  csvContent += `ข้อมูลนักเรียน\n`
  csvContent += `รหัสนักเรียน,${sub.studentData?.studentId || sub.studentId || '-'}\n`
  csvContent += `ชื่อ-นามสกุล,${sub.studentName || sub.studentData?.displayName || '-'}\n`
  csvContent += `ชั้น/ห้อง,${sub.studentData?.grade || '-'}/${sub.studentData?.room || '-'}\n`
  csvContent += `เลขที่,${sub.studentData?.number || '-'}\n`
  csvContent += `ตอน,${sub.studentData?.section || '-'}\n\n`
  
  // Scores
  const assessment = sub.assessment || {}
  csvContent += `ผลคะแนน\n`
  csvContent += `คะแนนรวม,${assessment.summary?.percentage?.toFixed(1) || 0}%\n`
  csvContent += `ระดับ PA,${assessment.summary?.paLevelText || 'PA 1'}\n`
  csvContent += `เวลาที่ใช้,${formatTimeSpent(sub.timeSpent)}\n`
  csvContent += `ส่งเมื่อ,${formatDate(sub.submittedAt)}\n\n`
  
  // ARCE Scores
  csvContent += `คะแนน A.R.C.E.\n`
  csvContent += `Analysis (วิเคราะห์),${getArceRaw(assessment.arceScores?.analysis)}/5\n`
  csvContent += `Reasoning (เหตุผล),${getArceRaw(assessment.arceScores?.reasoning)}/5\n`
  csvContent += `Creativity (สร้างสรรค์),${getArceRaw(assessment.arceScores?.creativity)}/5\n`
  csvContent += `Evidence (หลักฐาน),${getArceRaw(assessment.arceScores?.evidence)}/5\n\n`
  
  // Strengths & Weaknesses
  if (assessment.strengths?.length) {
    csvContent += `จุดเด่น\n`
    assessment.strengths.forEach((s, i) => {
      csvContent += `${i + 1}. ${s}\n`
    })
    csvContent += `\n`
  }
  
  if (assessment.weaknesses?.length) {
    csvContent += `สิ่งที่ควรพัฒนา\n`
    assessment.weaknesses.forEach((w, i) => {
      csvContent += `${i + 1}. ${w}\n`
    })
    csvContent += `\n`
  }
  
  // Question Details
  csvContent += `รายละเอียดคำตอบ\n`
  csvContent += `ข้อ,ระดับ Bloom,คะแนน,สถานะ,คำถาม,คำตอบ,ความเห็น AI\n`
  assessment.questionResults?.forEach((qr, idx) => {
    csvContent += `${idx + 1},`
    csvContent += `${getBloomLabel(qr.bloomLevel || 1)},`
    csvContent += `${qr.score || 0}/${qr.maxScore || 5},`
    csvContent += `${qr.passed ? 'ผ่าน' : 'ไม่ผ่าน'},`
    csvContent += `"${(qr.question || '').replace(/"/g, '""')}",`
    csvContent += `"${(qr.studentAnswer || '').replace(/"/g, '""')}",`
    csvContent += `"${(qr.feedback || '').replace(/"/g, '""')}"\n`
  })
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `student-report-${sub.studentData?.studentId || sub.id}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function provideFeedback(sub) {
  // TODO: Implement feedback modal
  alert('ฟีเจอร์ให้ข้อเสนอแนะเพิ่มเติมกำลังพัฒนา')
}

function calculateStats() {
  if (submissions.value.length === 0) {
    stats.value = {
      totalSubmissions: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passRate: 0,
      arceAverages: { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 },
      paDistribution: { 'PA 1': 0, 'PA 2': 0, 'PA 3': 0, 'PA 4': 0 },
      commonStrengths: [],
      commonWeaknesses: [],
      questionAnalysis: [],
      bloomAnalysis: {}
    }
    return
  }

  const scores = submissions.value.map(s => s.assessment?.summary?.percentage || 0)
  const arceScores = { analysis: [], reasoning: [], creativity: [], evidence: [] }
  const paCount = { 'PA 1': 0, 'PA 2': 0, 'PA 3': 0, 'PA 4': 0 }
  const strengthsMap = new Map()
  const weaknessesMap = new Map()
  
  // Question-level analysis
  const questionStats = new Map()
  // Bloom level analysis
  const bloomStats = { 1: { scores: [], count: 0 }, 2: { scores: [], count: 0 }, 3: { scores: [], count: 0 }, 4: { scores: [], count: 0 }, 5: { scores: [], count: 0 }, 6: { scores: [], count: 0 } }

  submissions.value.forEach(sub => {
    const assessment = sub.assessment || {}
    
    // ARCE scores - handle both object format {raw, weighted, max, feedback} and simple number format
    if (assessment.arceScores) {
      Object.keys(arceScores).forEach(key => {
        if (assessment.arceScores[key] !== undefined) {
          const score = assessment.arceScores[key]
          const numericScore = typeof score === 'object' ? (score.raw || 0) : score
          arceScores[key].push(numericScore)
        }
      })
    }
    
    // PA distribution
    const paLevel = assessment.summary?.paLevel || 1
    paCount[`PA ${paLevel}`]++
    
    // Strengths & Weaknesses
    assessment.strengths?.forEach(s => {
      strengthsMap.set(s, (strengthsMap.get(s) || 0) + 1)
    })
    assessment.weaknesses?.forEach(w => {
      weaknessesMap.set(w, (weaknessesMap.get(w) || 0) + 1)
    })

    // Question-level analysis
    assessment.questionResults?.forEach((qr, idx) => {
      if (!questionStats.has(idx)) {
        questionStats.set(idx, {
          question: qr.question,
          bloomLevel: qr.bloomLevel || 1,
          scores: [],
          passed: 0,
          total: 0
        })
      }
      const qs = questionStats.get(idx)
      qs.scores.push(qr.score || 0)
      if (qr.passed) qs.passed++
      qs.total++

      // Bloom level analysis
      const bl = qr.bloomLevel || 1
      if (bloomStats[bl]) {
        bloomStats[bl].scores.push(qr.score || 0)
        bloomStats[bl].count++
      }
    })
  })

  const arceAverages = {}
  Object.keys(arceScores).forEach(key => {
    const arr = arceScores[key]
    arceAverages[key] = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  })

  const passCount = scores.filter(s => s >= 60).length

  // Calculate question analysis
  const questionAnalysis = Array.from(questionStats.entries()).map(([idx, qs]) => ({
    question: qs.question,
    bloomLevel: qs.bloomLevel,
    avgScore: qs.scores.length > 0 ? qs.scores.reduce((a, b) => a + b, 0) / qs.scores.length : 0,
    passRate: qs.total > 0 ? (qs.passed / qs.total) * 100 : 0,
    totalAnswered: qs.total
  }))

  // Calculate bloom analysis
  const bloomAnalysis = {}
  Object.entries(bloomStats).forEach(([level, data]) => {
    if (data.count > 0) {
      bloomAnalysis[level] = {
        avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        count: data.count
      }
    }
  })

  stats.value = {
    totalSubmissions: submissions.value.length,
    averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    passRate: Math.round((passCount / submissions.value.length) * 100),
    arceAverages,
    paDistribution: paCount,
    commonStrengths: Array.from(strengthsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text]) => text),
    commonWeaknesses: Array.from(weaknessesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text]) => text),
    questionAnalysis,
    bloomAnalysis
  }
}

function exportReport() {
  const BOM = '\uFEFF'
  let csvContent = BOM
  
  // Header
  csvContent += `รายงานภาพรวมใบงาน\n`
  csvContent += `ชื่อใบงาน: ${worksheet.value?.metadata?.title}\n`
  csvContent += `รายวิชา: ${worksheet.value?.courseName}\n`
  csvContent += `หัวข้อ: ${worksheet.value?.metadata?.topic || '-'}\n`
  csvContent += `วันที่สร้างรายงาน: ${new Date().toLocaleDateString('th-TH')}\n\n`
  
  // Summary Stats
  csvContent += `สรุปผลการประเมิน\n`
  csvContent += `จำนวนผู้ส่ง,${stats.value.totalSubmissions}\n`
  csvContent += `คะแนนเฉลี่ย,${stats.value.averageScore?.toFixed(2)}%\n`
  csvContent += `คะแนนสูงสุด,${stats.value.highestScore}%\n`
  csvContent += `คะแนนต่ำสุด,${stats.value.lowestScore}%\n`
  csvContent += `อัตราผ่าน (≥60%),${stats.value.passRate}%\n\n`
  
  // ARCE Averages
  csvContent += `คะแนนเฉลี่ย A.R.C.E.\n`
  csvContent += `Analysis (วิเคราะห์),${stats.value.arceAverages?.analysis?.toFixed(2) || 0}/5\n`
  csvContent += `Reasoning (เหตุผล),${stats.value.arceAverages?.reasoning?.toFixed(2) || 0}/5\n`
  csvContent += `Creativity (สร้างสรรค์),${stats.value.arceAverages?.creativity?.toFixed(2) || 0}/5\n`
  csvContent += `Evidence (หลักฐาน),${stats.value.arceAverages?.evidence?.toFixed(2) || 0}/5\n\n`
  
  // PA Distribution
  csvContent += `การกระจายตัวระดับ PA\n`
  Object.entries(stats.value.paDistribution || {}).forEach(([level, count]) => {
    csvContent += `${level},${count} คน\n`
  })
  csvContent += `\n`
  
  // Question Analysis
  if (stats.value.questionAnalysis?.length) {
    csvContent += `การวิเคราะห์ตามคำถาม\n`
    csvContent += `ข้อ,ระดับ Bloom,คะแนนเฉลี่ย,อัตราผ่าน,จำนวนผู้ตอบ\n`
    stats.value.questionAnalysis.forEach((qa, idx) => {
      csvContent += `${idx + 1},`
      csvContent += `${getBloomLabel(qa.bloomLevel)},`
      csvContent += `${qa.avgScore?.toFixed(2)}/5,`
      csvContent += `${qa.passRate?.toFixed(0)}%,`
      csvContent += `${qa.totalAnswered}\n`
    })
    csvContent += `\n`
  }
  
  // Student Details
  csvContent += `รายละเอียดนักเรียน\n`
  csvContent += `รหัสนักเรียน,ชื่อ-นามสกุล,ชั้น,ห้อง,เลขที่,คะแนน(%),ระดับ PA,วิเคราะห์,เหตุผล,สร้างสรรค์,หลักฐาน,เวลาที่ใช้,วันที่ส่ง\n`
  
  submissions.value.forEach(sub => {
    const assessment = sub.assessment || {}
    csvContent += `"${sub.studentData?.studentId || sub.studentId || ''}",`
    csvContent += `"${sub.studentName || sub.studentData?.displayName || ''}",`
    csvContent += `"${sub.studentData?.grade || ''}",`
    csvContent += `"${sub.studentData?.room || ''}",`
    csvContent += `"${sub.studentData?.number || ''}",`
    csvContent += `${assessment.summary?.percentage?.toFixed(1) || 0},`
    csvContent += `${assessment.summary?.paLevelText || 'PA 1'},`
    csvContent += `${getArceRaw(assessment.arceScores?.analysis)},`
    csvContent += `${getArceRaw(assessment.arceScores?.reasoning)},`
    csvContent += `${getArceRaw(assessment.arceScores?.creativity)},`
    csvContent += `${getArceRaw(assessment.arceScores?.evidence)},`
    csvContent += `"${formatTimeSpent(sub.timeSpent)}",`
    csvContent += `"${formatDate(sub.submittedAt)}"\n`
  })
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `worksheet-report-${worksheetId.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function loadWorksheetReport(id) {
  try {
    loading.value = true
    
    // Load worksheet
    const wsDoc = await getDoc(doc(db, 'eWorksheets', id))
    if (wsDoc.exists()) {
      worksheet.value = { id: wsDoc.id, ...wsDoc.data() }
    }
    
    // Load submissions
    const subsQuery = query(
      collection(db, 'worksheetSubmissions'),
      where('worksheetId', '==', id),
      where('status', '==', 'graded')
    )
    const subsSnapshot = await getDocs(subsQuery)
    const rawSubmissions = subsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Fetch student profiles to get studentId (5 digits)
    const enrichedSubmissions = await Promise.all(
      rawSubmissions.map(async (sub) => {
        // If studentData.studentId is already valid 5 digits, use it
        if (sub.studentData?.studentId && /^\d{5}$/.test(sub.studentData.studentId)) {
          return sub
        }
        
        // Otherwise, fetch from users collection using Firebase UID
        try {
          const userDoc = await getDoc(doc(db, 'users', sub.studentId))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            return {
              ...sub,
              studentData: {
                ...sub.studentData,
                studentId: userData.studentId || '',
                grade: sub.studentData?.grade || userData.grade || userData.gradeLevel || '',
                room: sub.studentData?.room || userData.room || '',
                number: sub.studentData?.number || userData.number || '',
                section: sub.studentData?.section || userData.section || '',
                displayName: sub.studentData?.displayName || userData.displayName || ''
              }
            }
          }
        } catch (err) {
          console.warn('Could not fetch user profile:', err)
        }
        return sub
      })
    )
    
    submissions.value = enrichedSubmissions
    
    calculateStats()
  } catch (error) {
    console.error('Error loading report:', error)
  } finally {
    loading.value = false
  }
}

async function loadAllWorksheets() {
  try {
    const q = query(
      collection(db, 'eWorksheets'),
      where('teacherId', '==', authStore.user?.uid)
    )
    const snapshot = await getDocs(q)
    worksheets.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading worksheets:', error)
  }
}

async function loadData() {
  try {
    loading.value = true
    
    if (worksheetId.value) {
      await loadWorksheetReport(worksheetId.value)
    } else {
      await loadAllWorksheets()
    }
  } catch (error) {
    console.error('Error loading data:', error)
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, (newId) => {
  worksheetId.value = newId || null
  if (newId) {
    loadWorksheetReport(newId)
  } else {
    loadAllWorksheets()
  }
})

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.worksheet-reports-view {
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

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;
}

/* Container */
.reports-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Worksheet Selector */
.worksheet-selector h2 {
  margin-bottom: 1.5rem;
}

.worksheet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.ws-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

.ws-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.ws-card h3 {
  margin-bottom: 0.5rem;
}

.ws-card p {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.ws-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Report Header */
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border-color);
}

.header-info h1 {
  margin-bottom: 0.5rem;
}

.header-info .topic {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.meta-tags {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.meta-tags .tag {
  padding: 0.375rem 0.75rem;
  background: var(--bg-primary);
  border-radius: 20px;
  font-size: 0.75rem;
}

.stat-circle {
  text-align: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 16px;
  color: white;
  min-width: 100px;
}

.stat-circle .stat-value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
}

.stat-circle .stat-label {
  font-size: 0.75rem;
  opacity: 0.9;
}

/* Section Title */
.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

/* Overview Section */
.overview-section {
  margin-bottom: 2rem;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.overview-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid var(--border-color);
}

.card-icon {
  font-size: 2rem;
}

.card-content {
  display: flex;
  flex-direction: column;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
}

.card-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* ARCE Section */
.arce-section {
  margin-bottom: 2rem;
}

.arce-analysis {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
}

.arce-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.arce-item:last-child {
  border-bottom: none;
}

.arce-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 120px;
}

.arce-icon {
  font-size: 1.25rem;
}

.arce-name {
  font-weight: 500;
}

.arce-bar-container {
  flex: 1;
  height: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  overflow: hidden;
}

.arce-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.arce-bar.analysis { background: #3b82f6; }
.arce-bar.reasoning { background: #10b981; }
.arce-bar.creativity { background: #f59e0b; }
.arce-bar.evidence { background: #ef4444; }

.arce-score {
  width: 60px;
  text-align: right;
  font-weight: 600;
  font-size: 0.875rem;
}

/* PA Section */
.pa-section {
  margin-bottom: 2rem;
}

.pa-distribution {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
}

.pa-bar-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
}

.pa-label {
  width: 50px;
  font-weight: 600;
}

.pa-bar-container {
  flex: 1;
  height: 24px;
  background: var(--bg-primary);
  border-radius: 12px;
  overflow: hidden;
}

.pa-bar {
  height: 100%;
  border-radius: 12px;
  transition: width 0.5s ease;
}

.pa-bar.pa1 { background: #ef4444; }
.pa-bar.pa2 { background: #f59e0b; }
.pa-bar.pa3 { background: #3b82f6; }
.pa-bar.pa4 { background: #10b981; }

.pa-count {
  width: 100px;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Submissions Section */
.submissions-section {
  margin-bottom: 2rem;
}

.table-filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  flex: 1;
  max-width: 300px;
}

.search-box .material-icons {
  color: var(--text-secondary);
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  color: var(--text-primary);
  width: 100%;
}

.table-filters select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  outline: none;
}

.submissions-table {
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.submissions-table table {
  width: 100%;
  border-collapse: collapse;
}

.submissions-table th,
.submissions-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.submissions-table th {
  background: var(--bg-primary);
  font-weight: 600;
  font-size: 0.875rem;
}

.student-info {
  display: flex;
  flex-direction: column;
}

.student-name {
  font-weight: 500;
}

.student-id {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.score-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.score-badge.excellent { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.score-badge.good { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.score-badge.fair { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.score-badge.poor { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

.pa-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.pa-badge.pa1 { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.pa-badge.pa2 { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.pa-badge.pa3 { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.pa-badge.pa4 { background: rgba(16, 185, 129, 0.15); color: #10b981; }

/* LO Mini Badge */
.lo-mini-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.lo-count {
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.lo-count.has-lo {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.lo-icons {
  font-size: 0.9rem;
}

.col-lo {
  min-width: 70px;
  text-align: center;
}

.mini-arce {
  display: flex;
  gap: 0.25rem;
}

.mini-arce-item {
  padding: 0.25rem 0.375rem;
  border-radius: 4px;
  font-size: 0.7rem;
}

.mini-arce-item.analysis { background: rgba(59, 130, 246, 0.15); }
.mini-arce-item.reasoning { background: rgba(16, 185, 129, 0.15); }
.mini-arce-item.creativity { background: rgba(245, 158, 11, 0.15); }
.mini-arce-item.evidence { background: rgba(239, 68, 68, 0.15); }

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-primary);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--primary);
  color: white;
}

/* Analysis Section */
.analysis-section {
  margin-bottom: 2rem;
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.analysis-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
}

.analysis-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.analysis-card.strengths .analysis-header .material-icons { color: #10b981; }
.analysis-card.weaknesses .analysis-header .material-icons { color: #f59e0b; }

.analysis-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.analysis-card li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
  border-bottom: 1px solid var(--border-color);
}

.analysis-card li:last-child {
  border-bottom: none;
}

.analysis-card li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--primary);
}

.no-data {
  color: var(--text-secondary);
  font-style: italic;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.empty-state .material-icons {
  font-size: 3rem;
  opacity: 0.5;
  margin-bottom: 0.5rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.modal-xl {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  background: var(--bg-secondary);
}

.modal-header h2 {
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
}

.modal-body {
  padding: 1.5rem;
}

/* Submission Detail Modal */
.submission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1.5rem;
}

.student-detail h3 {
  margin: 0 0 0.25rem 0;
}

.student-detail p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.score-detail {
  text-align: center;
}

.score-big {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.score-big.excellent { color: #10b981; }
.score-big.good { color: #3b82f6; }
.score-big.fair { color: #f59e0b; }
.score-big.poor { color: #ef4444; }

.submission-arce {
  margin-bottom: 1.5rem;
}

.submission-arce h4 {
  margin-bottom: 1rem;
}

.arce-scores {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.arce-score-item {
  text-align: center;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.arce-score-item .arce-icon {
  display: block;
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.arce-score-item .arce-label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.arce-score-item .arce-value {
  font-weight: 700;
}

.submission-feedback {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.feedback-block h4 {
  margin-bottom: 0.5rem;
}

.feedback-block ul {
  list-style: disc;
  padding-left: 1.25rem;
  margin: 0;
}

.feedback-block li {
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.submission-answers h4 {
  margin-bottom: 1rem;
}

.answer-item {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
}

.answer-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.q-number {
  font-weight: 600;
}

.q-score {
  font-size: 0.875rem;
  font-weight: 600;
}

.q-score.pass { color: #10b981; }
.q-score.fail { color: #ef4444; }

.q-text {
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}

.student-answer, .ai-feedback {
  margin-top: 0.75rem;
}

.student-answer label, .ai-feedback label {
  display: block;
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.student-answer p, .ai-feedback p {
  margin: 0;
  font-size: 0.875rem;
  background: var(--bg-secondary);
  padding: 0.75rem;
  border-radius: 6px;
}

.ai-feedback p {
  border-left: 3px solid var(--primary);
}

/* Question Analysis Section */
.question-analysis-section {
  margin-bottom: 2rem;
}

.question-analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.question-analysis-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid var(--border-color);
}

.qa-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.qa-number {
  font-weight: 600;
  font-size: 1rem;
}

.qa-bloom-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.qa-bloom-badge.bloom-1 { background: rgba(147, 197, 253, 0.3); color: #3b82f6; }
.qa-bloom-badge.bloom-2 { background: rgba(167, 243, 208, 0.3); color: #10b981; }
.qa-bloom-badge.bloom-3 { background: rgba(253, 230, 138, 0.3); color: #f59e0b; }
.qa-bloom-badge.bloom-4 { background: rgba(252, 165, 165, 0.3); color: #ef4444; }
.qa-bloom-badge.bloom-5 { background: rgba(196, 181, 253, 0.3); color: #8b5cf6; }
.qa-bloom-badge.bloom-6 { background: rgba(251, 207, 232, 0.3); color: #ec4899; }

.qa-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  line-height: 1.4;
}

.qa-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.qa-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qa-stat-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.qa-stat-value.good { color: #10b981; }
.qa-stat-value.poor { color: #ef4444; }

.qa-stat-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.qa-bar-container {
  height: 6px;
  background: var(--bg-primary);
  border-radius: 3px;
  overflow: hidden;
}

.qa-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.qa-bar.good { background: #10b981; }
.qa-bar.poor { background: #ef4444; }

/* Bloom Section */
.bloom-section {
  margin-bottom: 2rem;
}

.bloom-analysis {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.bloom-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.bloom-item:last-child {
  border-bottom: none;
}

.bloom-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 160px;
}

.bloom-icon {
  font-size: 1.25rem;
}

.bloom-name {
  font-weight: 500;
  font-size: 0.875rem;
}

.bloom-bar-container {
  flex: 1;
  height: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  overflow: hidden;
}

.bloom-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.bloom-bar.bloom-1 { background: #3b82f6; }
.bloom-bar.bloom-2 { background: #10b981; }
.bloom-bar.bloom-3 { background: #f59e0b; }
.bloom-bar.bloom-4 { background: #ef4444; }
.bloom-bar.bloom-5 { background: #8b5cf6; }
.bloom-bar.bloom-6 { background: #ec4899; }

.bloom-score {
  width: 60px;
  text-align: right;
  font-weight: 600;
  font-size: 0.875rem;
}

.bloom-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
  width: 80px;
}

.bloom-insight {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border-radius: 12px;
  padding: 1rem 1.5rem;
  border-left: 4px solid #667eea;
}

.bloom-insight h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
}

.bloom-insight p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Table Enhancements */
.student-id-cell {
  font-family: monospace;
  font-size: 0.875rem;
}

.class-info {
  font-size: 0.875rem;
  font-weight: 500;
}

.time-spent {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

tr.at-risk {
  background: rgba(239, 68, 68, 0.05);
}

tr.at-risk:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* Modal Enhancements */
.modal-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.student-info-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  color: white;
}

.student-avatar {
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.student-avatar .material-icons {
  font-size: 2rem;
}

.student-details {
  flex: 1;
}

.student-details h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.student-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  opacity: 0.9;
}

.meta-item .material-icons {
  font-size: 1rem;
}

.score-summary {
  text-align: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 1rem 1.5rem;
}

.score-summary .score-big {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: white;
}

.score-summary .pa-badge {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* Submission Stats Grid */
.submission-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
}

.stat-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.25rem;
}

.stat-item .stat-value {
  display: block;
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.stat-item .stat-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

/* ARCE Detailed Scores */
.arce-scores-detailed {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.arce-score-card {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 1rem;
}

.arce-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.arce-card-header .arce-icon {
  font-size: 1.5rem;
}

.arce-card-header .arce-label {
  font-size: 0.8rem;
  font-weight: 500;
}

.arce-card-score {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.arce-bar-bg {
  flex: 1;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.arce-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.arce-score-card.analysis .arce-bar-fill { background: #3b82f6; }
.arce-score-card.reasoning .arce-bar-fill { background: #10b981; }
.arce-score-card.creativity .arce-bar-fill { background: #f59e0b; }
.arce-score-card.evidence .arce-bar-fill { background: #ef4444; }

.arce-value {
  font-weight: 700;
  font-size: 0.875rem;
  min-width: 40px;
}

.arce-feedback {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.arce-feedback-placeholder {
  font-style: italic;
}

/* Cognitive Analysis */
.cognitive-analysis {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.cognitive-analysis h4 {
  margin: 0 0 1rem 0;
}

.cognitive-radar {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.cognitive-level-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cognitive-level-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 130px;
}

.cognitive-icon {
  font-size: 1rem;
}

.cognitive-name {
  font-size: 0.75rem;
  font-weight: 500;
}

.cognitive-bar-container {
  flex: 1;
  height: 6px;
  background: var(--bg-primary);
  border-radius: 3px;
  overflow: hidden;
}

.cognitive-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.cognitive-bar.bloom-1 { background: #3b82f6; }
.cognitive-bar.bloom-2 { background: #10b981; }
.cognitive-bar.bloom-3 { background: #f59e0b; }
.cognitive-bar.bloom-4 { background: #ef4444; }
.cognitive-bar.bloom-5 { background: #8b5cf6; }
.cognitive-bar.bloom-6 { background: #ec4899; }

.cognitive-score {
  font-size: 0.75rem;
  font-weight: 600;
  width: 40px;
  text-align: right;
}

.cognitive-insight {
  background: var(--bg-primary);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  color: var(--text-secondary);
  border-left: 3px solid var(--primary);
  margin: 0;
}

/* Answer Cards */
.answer-card {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  border-left: 4px solid var(--border-color);
}

.answer-card.passed {
  border-left-color: #10b981;
}

.answer-card.failed {
  border-left-color: #ef4444;
}

.answer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.answer-q-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.q-bloom-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
}

.q-bloom-badge.bloom-1 { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.q-bloom-badge.bloom-2 { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.q-bloom-badge.bloom-3 { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.q-bloom-badge.bloom-4 { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.q-bloom-badge.bloom-5 { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
.q-bloom-badge.bloom-6 { background: rgba(236, 72, 153, 0.15); color: #ec4899; }

.answer-score-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.q-status {
  font-size: 0.75rem;
}

.answer-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.student-answer-block, .ai-feedback-block, .improvement-block {
  background: var(--bg-secondary);
  padding: 0.75rem;
  border-radius: 8px;
}

.student-answer-block label, .ai-feedback-block label, .improvement-block label {
  display: block;
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.student-answer-block p, .ai-feedback-block p, .improvement-block p {
  margin: 0;
  font-size: 0.875rem;
}

.ai-feedback-block {
  border-left: 3px solid var(--primary);
}

.improvement-block {
  border-left: 3px solid #f59e0b;
  background: rgba(245, 158, 11, 0.05);
}

/* Overall Recommendation */
.overall-recommendation {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border-radius: 12px;
  padding: 1.25rem;
  border-left: 4px solid #667eea;
}

.overall-recommendation h4 {
  margin: 0 0 0.5rem 0;
}

.overall-text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
}

/* Feedback Blocks */
.submission-feedback {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.feedback-block {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 1rem;
}

.feedback-block.strengths {
  border-left: 4px solid #10b981;
}

.feedback-block.weaknesses {
  border-left: 4px solid #f59e0b;
}

.feedback-block h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
}

.feedback-block ul {
  list-style: disc;
  padding-left: 1.25rem;
  margin: 0;
}

.feedback-block li {
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
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
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
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
@media (max-width: 1024px) {
  .overview-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .arce-scores-detailed {
    grid-template-columns: 1fr;
  }
  
  .submission-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .cognitive-radar {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .reports-container {
    padding: 1rem;
  }
  
  .report-header {
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .overview-cards {
    grid-template-columns: 1fr;
  }
  
  .analysis-grid {
    grid-template-columns: 1fr;
  }
  
  .submission-feedback {
    grid-template-columns: 1fr;
  }
  
  .submission-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .student-info-card {
    flex-direction: column;
    text-align: center;
  }
  
  .student-meta {
    justify-content: center;
  }
  
  .question-analysis-grid {
    grid-template-columns: 1fr;
  }
  
  .table-filters {
    flex-direction: column;
  }
  
  .search-box {
    max-width: none;
  }

  .submissions-table {
    overflow-x: auto;
  }
  
  .submissions-table table {
    min-width: 900px;
  }
}
</style>
