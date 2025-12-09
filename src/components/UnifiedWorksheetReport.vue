<template>
  <div class="unified-report" :class="{ 'print-mode': printMode }">
    <!-- Report Header -->
    <header class="report-header">
      <div class="report-title-section">
        <div class="report-logo">📊</div>
        <div class="report-title">
          <h1>รายงานผลการประเมินใบงาน</h1>
          <p class="subtitle">{{ worksheetTitle }}</p>
        </div>
      </div>
      <div class="report-actions" v-if="!printMode">
        <button class="btn btn-outline btn-sm" @click="printReport">
          <span class="material-icons">print</span>
          พิมพ์
        </button>
        <button class="btn btn-outline btn-sm" @click="downloadPDF">
          <span class="material-icons">download</span>
          PDF
        </button>
        <button class="btn btn-outline btn-sm" @click="downloadCSV">
          <span class="material-icons">table_chart</span>
          CSV
        </button>
      </div>
    </header>

    <!-- Student Info Card -->
    <section class="student-card">
      <div class="student-avatar">
        <span class="material-icons">person</span>
      </div>
      <div class="student-info-grid">
        <div class="info-item">
          <span class="info-label">รหัสนักเรียน</span>
          <span class="info-value highlight">{{ studentData.studentId || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">ชื่อ-นามสกุล</span>
          <span class="info-value">{{ studentData.displayName || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">ชั้น</span>
          <span class="info-value">{{ studentData.grade || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">ห้อง</span>
          <span class="info-value">{{ studentData.room || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">เลขที่</span>
          <span class="info-value">{{ studentData.number || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">ตอน</span>
          <span class="info-value">{{ studentData.section || '-' }}</span>
        </div>
      </div>
      <div class="score-summary-card">
        <div class="main-score" :class="getScoreClass(assessment?.summary?.percentage)">
          <span class="score-value">{{ assessment?.summary?.percentage?.toFixed(0) || 0 }}</span>
          <span class="score-unit">%</span>
        </div>
        <div class="pa-level" :class="'pa' + (assessment?.summary?.paLevel || 1)">
          {{ assessment?.summary?.paLevelText || 'ระดับ 1' }}
        </div>
      </div>
    </section>

    <!-- Assessment Summary -->
    <section class="summary-section">
      <h2 class="section-title">📋 สรุปผลการประเมิน</h2>
      <div class="summary-content">
        <p class="overall-feedback">{{ assessment?.summary?.overallFeedback || 'ยังไม่มีข้อเสนอแนะ' }}</p>
        <div class="summary-stats">
          <div class="stat-item">
            <span class="stat-icon">📝</span>
            <span class="stat-value">{{ assessment?.summary?.totalScore || 0 }}/{{ assessment?.summary?.maxScore || 20 }}</span>
            <span class="stat-label">คะแนนรวม</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">⏱️</span>
            <span class="stat-value">{{ formatTime(timeSpent) }}</span>
            <span class="stat-label">เวลาที่ใช้</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">✅</span>
            <span class="stat-value">{{ passedQuestions }}/{{ totalQuestions }}</span>
            <span class="stat-label">ข้อที่ผ่าน</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">📅</span>
            <span class="stat-value">{{ formatDate(submittedAt) }}</span>
            <span class="stat-label">วันที่ส่ง</span>
          </div>
        </div>
      </div>
    </section>

    <!-- A.R.C.E. Analysis -->
    <section class="arce-section">
      <h2 class="section-title">🎯 ทักษะการคิดขั้นสูง (A.R.C.E.)</h2>
      <div class="arce-grid">
        <div v-for="(data, key) in arceData" :key="key" class="arce-card" :class="key">
          <div class="arce-header">
            <span class="arce-icon">{{ data.icon }}</span>
            <span class="arce-name">{{ data.name }}</span>
            <span class="arce-score">{{ data.score }}/5</span>
          </div>
          <div class="arce-bar-container">
            <div class="arce-bar" :style="{ width: (data.score / 5 * 100) + '%' }"></div>
          </div>
          <p class="arce-feedback">{{ data.feedback }}</p>
          <div class="arce-level">
            <span :class="getLevelClass(data.score)">{{ getLevelText(data.score) }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Bloom's Taxonomy Analysis -->
    <section class="bloom-section" v-if="assessment?.bloomAnalysis">
      <h2 class="section-title">🧠 ระดับการคิด (Bloom's Taxonomy)</h2>
      <div class="bloom-content">
        <div class="bloom-chart">
          <div v-for="level in 6" :key="level" class="bloom-level-row">
            <div class="bloom-level-info">
              <span class="bloom-icon">{{ getBloomIcon(level) }}</span>
              <span class="bloom-name">{{ getBloomName(level) }}</span>
            </div>
            <div class="bloom-bar-container">
              <div 
                class="bloom-bar" 
                :class="'bloom-' + level"
                :style="{ width: getBloomWidth(level) + '%' }"
              ></div>
            </div>
            <span class="bloom-stats">
              {{ getBloomCount(level) }} ข้อ | {{ getBloomAvg(level) }}/5
            </span>
          </div>
        </div>
        <div class="bloom-insight">
          <h4>💡 การวิเคราะห์ระดับการคิด</h4>
          <p>{{ assessment?.bloomAnalysis?.insight || 'ยังไม่มีข้อมูลการวิเคราะห์' }}</p>
        </div>
      </div>
    </section>

    <!-- Question Results -->
    <section class="questions-section">
      <h2 class="section-title">📝 ผลการประเมินรายข้อ</h2>
      <div class="questions-list">
        <div 
          v-for="(q, idx) in questionResults" 
          :key="q.questionId" 
          class="question-card"
          :class="{ passed: q.passed, failed: !q.passed }"
        >
          <div class="question-header">
            <div class="question-number">
              <span class="q-num">ข้อ {{ idx + 1 }}</span>
              <span class="q-bloom" :class="'bloom-' + q.bloomLevel">
                {{ getBloomName(q.bloomLevel) }}
              </span>
              <span class="q-arce" :class="q.arceFocus">
                {{ getArceName(q.arceFocus) }}
              </span>
            </div>
            <div class="question-score">
              <span class="score" :class="q.passed ? 'pass' : 'fail'">
                {{ q.score }}/{{ q.maxScore }}
              </span>
              <span class="status">{{ q.passed ? '✅ ผ่าน' : '❌ ไม่ผ่าน' }}</span>
            </div>
          </div>
          
          <div class="question-content">
            <div class="question-text">
              <label>คำถาม:</label>
              <p>{{ q.question }}</p>
            </div>
            
            <div class="student-answer">
              <label>คำตอบของนักเรียน:</label>
              <p v-if="typeof q.studentAnswer === 'string'">{{ q.studentAnswer || '-' }}</p>
              <div v-else-if="typeof q.studentAnswer === 'object'" class="table-answer">
                <table v-if="Array.isArray(q.studentAnswer)">
                  <tr v-for="(row, rIdx) in q.studentAnswer" :key="rIdx">
                    <td v-for="(cell, cIdx) in row" :key="cIdx">{{ cell }}</td>
                  </tr>
                </table>
                <pre v-else>{{ JSON.stringify(q.studentAnswer, null, 2) }}</pre>
              </div>
            </div>
            
            <div class="ai-feedback">
              <label>🤖 ความเห็นจากระบบ:</label>
              <p>{{ q.feedback }}</p>
            </div>
            
            <div v-if="!q.passed && q.suggestion" class="improvement-suggestion">
              <label>📚 คำแนะนำเพื่อพัฒนา:</label>
              <p>{{ q.suggestion }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Strengths & Weaknesses -->
    <section class="feedback-section">
      <div class="feedback-grid">
        <div class="feedback-card strengths">
          <h3>✅ จุดแข็งของนักเรียน</h3>
          <ul v-if="assessment?.strengths?.length">
            <li v-for="(s, idx) in assessment.strengths" :key="idx">{{ s }}</li>
          </ul>
          <p v-else class="no-data">ยังไม่มีข้อมูล</p>
        </div>
        
        <div class="feedback-card weaknesses">
          <h3>💡 สิ่งที่ควรพัฒนา</h3>
          <ul v-if="assessment?.weaknesses?.length">
            <li v-for="(w, idx) in assessment.weaknesses" :key="idx">{{ w }}</li>
          </ul>
          <p v-else class="no-data">ยังไม่มีข้อมูล</p>
        </div>
      </div>
    </section>

    <!-- Next Steps -->
    <section class="next-steps-section" v-if="assessment?.nextSteps?.length">
      <h2 class="section-title">🚀 ขั้นตอนต่อไปเพื่อพัฒนาตนเอง</h2>
      <div class="next-steps-list">
        <div v-for="(step, idx) in assessment.nextSteps" :key="idx" class="step-item">
          <span class="step-number">{{ idx + 1 }}</span>
          <p>{{ step }}</p>
        </div>
      </div>
    </section>

    <!-- Teacher Notes (only visible to teacher) -->
    <section class="teacher-notes-section" v-if="isTeacher && assessment?.teacherNotes">
      <h2 class="section-title">👨‍🏫 บันทึกสำหรับครู</h2>
      <div class="teacher-notes-content">
        <p>{{ assessment.teacherNotes }}</p>
      </div>
    </section>

    <!-- Recommendation -->
    <section class="recommendation-section" v-if="assessment?.summary?.recommendation">
      <h2 class="section-title">📌 ข้อเสนอแนะจากระบบ</h2>
      <div class="recommendation-content">
        <p>{{ assessment.summary.recommendation }}</p>
      </div>
    </section>

    <!-- Report Footer -->
    <footer class="report-footer">
      <div class="footer-info">
        <p>รายงานนี้สร้างโดยระบบ HOTS AI ChatLoop</p>
        <p>วันที่สร้างรายงาน: {{ formatDate(new Date()) }}</p>
      </div>
      <div class="footer-qr" v-if="printMode">
        <!-- QR Code placeholder -->
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  worksheetTitle: { type: String, default: 'ใบงาน' },
  studentData: { type: Object, default: () => ({}) },
  assessment: { type: Object, default: () => ({}) },
  timeSpent: { type: Number, default: 0 },
  submittedAt: { type: [Date, Object], default: null },
  isTeacher: { type: Boolean, default: false },
  printMode: { type: Boolean, default: false }
})

const emit = defineEmits(['print', 'download-pdf', 'download-csv'])

// Computed
const questionResults = computed(() => {
  return props.assessment?.questionResults || []
})

const totalQuestions = computed(() => questionResults.value.length)

const passedQuestions = computed(() => {
  return questionResults.value.filter(q => q.passed).length
})

const arceData = computed(() => {
  const scores = props.assessment?.arceScores || {}
  return {
    analysis: {
      icon: '🔍',
      name: 'การวิเคราะห์ (Analysis)',
      score: getArceScore(scores.analysis),
      feedback: scores.analysis?.feedback || 'ยังไม่มีข้อมูล'
    },
    reasoning: {
      icon: '🧠',
      name: 'การให้เหตุผล (Reasoning)',
      score: getArceScore(scores.reasoning),
      feedback: scores.reasoning?.feedback || 'ยังไม่มีข้อมูล'
    },
    creativity: {
      icon: '💡',
      name: 'ความคิดสร้างสรรค์ (Creativity)',
      score: getArceScore(scores.creativity),
      feedback: scores.creativity?.feedback || 'ยังไม่มีข้อมูล'
    },
    evidence: {
      icon: '📚',
      name: 'การใช้หลักฐาน (Evidence)',
      score: getArceScore(scores.evidence),
      feedback: scores.evidence?.feedback || 'ยังไม่มีข้อมูล'
    }
  }
})

// Methods
function getArceScore(data) {
  if (typeof data === 'object') return data?.raw || 0
  return data || 0
}

function getScoreClass(percentage) {
  const pct = parseFloat(percentage) || 0
  if (pct >= 80) return 'excellent'
  if (pct >= 60) return 'good'
  if (pct >= 40) return 'fair'
  return 'poor'
}

function getLevelClass(score) {
  if (score >= 4) return 'level-high'
  if (score >= 3) return 'level-medium'
  return 'level-low'
}

function getLevelText(score) {
  if (score >= 4.5) return 'ยอดเยี่ยม'
  if (score >= 4) return 'ดีมาก'
  if (score >= 3) return 'ดี'
  if (score >= 2) return 'พอใช้'
  return 'ต้องพัฒนา'
}

function getBloomIcon(level) {
  const icons = { 1: '📚', 2: '💡', 3: '🔧', 4: '🔬', 5: '⚖️', 6: '🎨' }
  return icons[level] || '📝'
}

function getBloomName(level) {
  const names = {
    1: 'Remember (จำ)',
    2: 'Understand (เข้าใจ)',
    3: 'Apply (ประยุกต์)',
    4: 'Analyze (วิเคราะห์)',
    5: 'Evaluate (ประเมิน)',
    6: 'Create (สร้างสรรค์)'
  }
  return names[level] || `Level ${level}`
}

function getArceName(key) {
  const names = {
    analysis: 'A',
    reasoning: 'R',
    creativity: 'C',
    evidence: 'E'
  }
  return names[key] || key
}

function getBloomCount(level) {
  return props.assessment?.bloomAnalysis?.levelBreakdown?.[level]?.count || 0
}

function getBloomAvg(level) {
  return props.assessment?.bloomAnalysis?.levelBreakdown?.[level]?.avgScore?.toFixed(1) || '0.0'
}

function getBloomWidth(level) {
  const avg = props.assessment?.bloomAnalysis?.levelBreakdown?.[level]?.avgScore || 0
  return (avg / 5) * 100
}

function formatTime(seconds) {
  if (!seconds) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) return `${mins} นาที ${secs} วินาที`
  return `${secs} วินาที`
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function printReport() {
  emit('print')
  window.print()
}

function downloadPDF() {
  emit('download-pdf')
}

function downloadCSV() {
  emit('download-csv')
}
</script>

<style scoped>
.unified-report {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Print Mode */
.unified-report.print-mode {
  max-width: 100%;
  padding: 1rem;
}

@media print {
  .unified-report {
    padding: 0;
    background: white;
    color: black;
  }
  
  .report-actions {
    display: none !important;
  }
  
  .section-title {
    color: black !important;
  }
}

/* Header */
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid var(--border-color);
  margin-bottom: 2rem;
}

.report-title-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.report-logo {
  font-size: 2.5rem;
}

.report-title h1 {
  margin: 0;
  font-size: 1.5rem;
}

.report-title .subtitle {
  margin: 0.25rem 0 0;
  color: var(--text-secondary);
}

.report-actions {
  display: flex;
  gap: 0.5rem;
}

/* Student Card */
.student-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  color: white;
}

.student-avatar {
  width: 70px;
  height: 70px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.student-avatar .material-icons {
  font-size: 2.5rem;
}

.student-info-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 0.7rem;
  opacity: 0.8;
  margin-bottom: 0.25rem;
}

.info-value {
  font-size: 1rem;
  font-weight: 600;
}

.info-value.highlight {
  font-size: 1.25rem;
  font-family: monospace;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.score-summary-card {
  text-align: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 1rem 1.5rem;
}

.main-score {
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
}

.main-score .score-unit {
  font-size: 1.5rem;
}

.main-score.excellent { color: #a7f3d0; }
.main-score.good { color: #93c5fd; }
.main-score.fair { color: #fcd34d; }
.main-score.poor { color: #fca5a5; }

.pa-level {
  margin-top: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-block;
}

.pa-level.pa1 { background: rgba(239, 68, 68, 0.3); }
.pa-level.pa2 { background: rgba(245, 158, 11, 0.3); }
.pa-level.pa3 { background: rgba(59, 130, 246, 0.3); }
.pa-level.pa4 { background: rgba(16, 185, 129, 0.3); }

/* Section Title */
.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--border-color);
}

/* Summary Section */
.summary-section {
  margin-bottom: 2rem;
}

.summary-content {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
}

.overall-feedback {
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
  border-left: 4px solid var(--primary);
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.stat-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.25rem;
}

.stat-item .stat-value {
  display: block;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.stat-item .stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* ARCE Section */
.arce-section {
  margin-bottom: 2rem;
}

.arce-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.arce-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.25rem;
  border-left: 4px solid;
}

.arce-card.analysis { border-left-color: #3b82f6; }
.arce-card.reasoning { border-left-color: #10b981; }
.arce-card.creativity { border-left-color: #f59e0b; }
.arce-card.evidence { border-left-color: #ef4444; }

.arce-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.arce-icon {
  font-size: 1.25rem;
}

.arce-name {
  flex: 1;
  font-weight: 500;
  font-size: 0.9rem;
}

.arce-score {
  font-weight: 700;
  font-size: 1.1rem;
}

.arce-bar-container {
  height: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.arce-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.arce-card.analysis .arce-bar { background: #3b82f6; }
.arce-card.reasoning .arce-bar { background: #10b981; }
.arce-card.creativity .arce-bar { background: #f59e0b; }
.arce-card.evidence .arce-bar { background: #ef4444; }

.arce-feedback {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 0.5rem;
}

.arce-level span {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.level-high { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.level-medium { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.level-low { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

/* Bloom Section */
.bloom-section {
  margin-bottom: 2rem;
}

.bloom-content {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
}

.bloom-chart {
  margin-bottom: 1rem;
}

.bloom-level-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.bloom-level-row:last-child {
  border-bottom: none;
}

.bloom-level-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 180px;
}

.bloom-icon {
  font-size: 1.25rem;
}

.bloom-name {
  font-size: 0.85rem;
  font-weight: 500;
}

.bloom-bar-container {
  flex: 1;
  height: 10px;
  background: var(--bg-primary);
  border-radius: 5px;
  overflow: hidden;
}

.bloom-bar {
  height: 100%;
  border-radius: 5px;
  transition: width 0.5s ease;
}

.bloom-bar.bloom-1 { background: #3b82f6; }
.bloom-bar.bloom-2 { background: #10b981; }
.bloom-bar.bloom-3 { background: #f59e0b; }
.bloom-bar.bloom-4 { background: #ef4444; }
.bloom-bar.bloom-5 { background: #8b5cf6; }
.bloom-bar.bloom-6 { background: #ec4899; }

.bloom-stats {
  font-size: 0.8rem;
  color: var(--text-secondary);
  width: 100px;
  text-align: right;
}

.bloom-insight {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 1rem;
  border-left: 4px solid var(--primary);
}

.bloom-insight h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
}

.bloom-insight p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Questions Section */
.questions-section {
  margin-bottom: 2rem;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  overflow: hidden;
  border-left: 4px solid var(--border-color);
}

.question-card.passed { border-left-color: #10b981; }
.question-card.failed { border-left-color: #ef4444; }

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: var(--bg-primary);
}

.question-number {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.q-num {
  font-weight: 600;
}

.q-bloom, .q-arce {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
}

.q-bloom.bloom-1 { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.q-bloom.bloom-2 { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.q-bloom.bloom-3 { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.q-bloom.bloom-4 { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.q-bloom.bloom-5 { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
.q-bloom.bloom-6 { background: rgba(236, 72, 153, 0.15); color: #ec4899; }

.q-arce.analysis { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.q-arce.reasoning { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.q-arce.creativity { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.q-arce.evidence { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

.question-score {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.question-score .score {
  font-size: 1.1rem;
  font-weight: 700;
}

.question-score .score.pass { color: #10b981; }
.question-score .score.fail { color: #ef4444; }

.question-score .status {
  font-size: 0.8rem;
}

.question-content {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-content label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.question-content p {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

.question-text p {
  font-weight: 500;
}

.student-answer {
  background: var(--bg-primary);
  padding: 0.75rem;
  border-radius: 8px;
}

.table-answer table {
  width: 100%;
  border-collapse: collapse;
}

.table-answer td {
  border: 1px solid var(--border-color);
  padding: 0.5rem;
  font-size: 0.85rem;
}

.ai-feedback {
  background: var(--bg-primary);
  padding: 0.75rem;
  border-radius: 8px;
  border-left: 3px solid var(--primary);
}

.improvement-suggestion {
  background: rgba(245, 158, 11, 0.1);
  padding: 0.75rem;
  border-radius: 8px;
  border-left: 3px solid #f59e0b;
}

/* Feedback Section */
.feedback-section {
  margin-bottom: 2rem;
}

.feedback-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.feedback-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.25rem;
}

.feedback-card.strengths { border-left: 4px solid #10b981; }
.feedback-card.weaknesses { border-left: 4px solid #f59e0b; }

.feedback-card h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
}

.feedback-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feedback-card li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.9rem;
  line-height: 1.5;
}

.feedback-card li:last-child {
  border-bottom: none;
}

.feedback-card li::before {
  content: '•';
  color: var(--primary);
  margin-right: 0.5rem;
}

.no-data {
  color: var(--text-secondary);
  font-style: italic;
}

/* Next Steps */
.next-steps-section {
  margin-bottom: 2rem;
}

.next-steps-list {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.25rem;
}

.step-item {
  display: flex;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.step-item:last-child {
  border-bottom: none;
}

.step-number {
  width: 28px;
  height: 28px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.step-item p {
  margin: 0;
  line-height: 1.5;
}

/* Teacher Notes */
.teacher-notes-section {
  margin-bottom: 2rem;
}

.teacher-notes-content {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border-radius: 12px;
  padding: 1.25rem;
  border-left: 4px solid #667eea;
}

.teacher-notes-content p {
  margin: 0;
  line-height: 1.6;
}

/* Recommendation */
.recommendation-section {
  margin-bottom: 2rem;
}

.recommendation-content {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.25rem;
  border-left: 4px solid var(--primary);
}

.recommendation-content p {
  margin: 0;
  line-height: 1.6;
  font-size: 1rem;
}

/* Footer */
.report-footer {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid var(--border-color);
  text-align: center;
}

.footer-info p {
  margin: 0.25rem 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 0.875rem;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8rem;
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
  .unified-report {
    padding: 1rem;
  }
  
  .report-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .student-card {
    flex-direction: column;
    text-align: center;
  }
  
  .student-info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .summary-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .arce-grid {
    grid-template-columns: 1fr;
  }
  
  .feedback-grid {
    grid-template-columns: 1fr;
  }
  
  .bloom-level-row {
    flex-wrap: wrap;
  }
  
  .bloom-level-info {
    width: 100%;
    margin-bottom: 0.5rem;
  }
  
  .bloom-stats {
    width: 100%;
    text-align: left;
    margin-top: 0.5rem;
  }
}
</style>
