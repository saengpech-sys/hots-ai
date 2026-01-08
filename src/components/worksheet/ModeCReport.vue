<template>
  <!-- 🔍 Mode C: Per-Question Assessment Report - ละเอียดทุกข้อ -->
  <div class="mode-c-report">
    <!-- Mode Header with distinctive branding -->
    <div class="mode-header per-question">
      <div class="mode-icon-wrapper">
        <span class="mode-main-icon">🔍</span>
        <span class="mode-sub-icon">{{ totalQuestions }}Q</span>
      </div>
      <div class="mode-info">
        <h3 class="mode-title">โหมด C: Per-Question Assessment</h3>
        <p class="mode-subtitle">ประเมินแยกทีละข้อ + Summary Agent - แม่นยำสูง</p>
        <div class="mode-benefits">
          <span class="benefit-tag">🎯 แม่นยำสูงมาก</span>
          <span class="benefit-tag">📋 Feedback ทุกข้อ</span>
          <span class="benefit-tag">🔬 วิเคราะห์เชิงลึก</span>
        </div>
      </div>
    </div>

    <!-- Assessment Process Flow -->
    <div class="process-flow-panel">
      <h4>🔄 กระบวนการประเมิน Per-Question</h4>
      <div class="process-timeline">
        <div class="timeline-step">
          <div class="step-marker active">1</div>
          <div class="step-content">
            <h5>รับคำตอบ</h5>
            <p>{{ totalQuestions }} ข้อ</p>
          </div>
        </div>
        <div class="timeline-connector"></div>
        <div class="timeline-step">
          <div class="step-marker active">2</div>
          <div class="step-content">
            <h5>ประเมินแยกข้อ</h5>
            <p>AI วิเคราะห์ทีละข้อ</p>
          </div>
        </div>
        <div class="timeline-connector"></div>
        <div class="timeline-step">
          <div class="step-marker active">3</div>
          <div class="step-content">
            <h5>Summary Agent</h5>
            <p>รวมผลทุกข้อ</p>
          </div>
        </div>
        <div class="timeline-connector"></div>
        <div class="timeline-step">
          <div class="step-marker result">✓</div>
          <div class="step-content">
            <h5>ผลการประเมิน</h5>
            <p>{{ percentage }}% (PA{{ effectiveSummary?.paLevel || 1 }})</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Score Summary -->
    <div class="score-summary-panel">
      <div class="main-score">
        <div class="score-circle" :class="scoreLevel">
          <div class="circle-progress">
            <svg viewBox="0 0 100 100">
              <circle class="bg" cx="50" cy="50" r="45"/>
              <circle class="fill" cx="50" cy="50" r="45" 
                      :stroke-dasharray="circumference"
                      :stroke-dashoffset="scoreOffset"/>
            </svg>
          </div>
          <div class="score-text">
            <span class="score-num">{{ percentage }}</span>
            <span class="score-unit">%</span>
          </div>
        </div>
        <div class="pa-level-badge" :class="'pa' + (effectiveSummary?.paLevel || 1)">
          {{ effectiveSummary?.paLevelText || 'ระดับ 1: ต้องปรับปรุง' }}
        </div>
      </div>
      <div class="score-metrics">
        <div class="metric-card">
          <span class="metric-icon">📝</span>
          <span class="metric-value">{{ effectiveSummary?.totalScore || 0 }}/{{ effectiveSummary?.maxScore || 0 }}</span>
          <span class="metric-label">คะแนนรวม</span>
        </div>
        <div class="metric-card">
          <span class="metric-icon">✅</span>
          <span class="metric-value passed">{{ passedCount }}</span>
          <span class="metric-label">ผ่านเกณฑ์</span>
        </div>
        <div class="metric-card">
          <span class="metric-icon">❌</span>
          <span class="metric-value failed">{{ failedCount }}</span>
          <span class="metric-label">ไม่ผ่าน</span>
        </div>
        <div class="metric-card">
          <span class="metric-icon">📊</span>
          <span class="metric-value">{{ passRate.toFixed(0) }}%</span>
          <span class="metric-label">อัตราผ่าน</span>
        </div>
      </div>
    </div>

    <!-- Per-Question Results Gallery -->
    <div class="question-gallery-section">
      <div class="gallery-header">
        <h4>📋 ผลการประเมินรายข้อ ({{ totalQuestions }} ข้อ)</h4>
        <div class="gallery-legend">
          <span class="legend pass">✅ ผ่าน</span>
          <span class="legend fail">❌ ไม่ผ่าน</span>
        </div>
      </div>
      
      <!-- Question Mini Cards Overview -->
      <div class="question-overview-grid">
        <div v-for="(q, idx) in questionResults" :key="idx" 
             class="question-mini-card" 
             :class="{ passed: q.passed, failed: !q.passed, active: selectedQuestion === idx }"
             @click="selectQuestion(idx)">
          <span class="q-number">{{ idx + 1 }}</span>
          <span class="q-score">{{ q.score || q.totalScore || 0 }}/{{ q.maxScore || 5 }}</span>
          <span class="q-status">{{ q.passed ? '✅' : '❌' }}</span>
        </div>
      </div>

      <!-- Selected Question Detail -->
      <div class="question-detail-panel" v-if="selectedQuestionData">
        <div class="detail-header">
          <div class="q-info">
            <span class="q-badge">ข้อ {{ selectedQuestion + 1 }}</span>
            <span class="bloom-badge" :class="'bloom-' + (selectedQuestionData.bloomLevel || 4)">
              {{ getBloomLabel(selectedQuestionData.bloomLevel) }}
            </span>
            <span class="arce-tag" :class="getArceFocusClass(selectedQuestionData.arceFocus)">
              {{ getArceEmoji(selectedQuestionData.arceFocus) }} {{ getArceLabel(selectedQuestionData.arceFocus) }}
            </span>
          </div>
          <div class="q-score-display" :class="{ pass: selectedQuestionData.passed }">
            <span class="score">{{ selectedQuestionData.score || selectedQuestionData.totalScore || 0 }}</span>
            <span class="max">/{{ selectedQuestionData.maxScore || 5 }}</span>
            <span class="percent">({{ getQuestionPercent(selectedQuestionData) }}%)</span>
          </div>
        </div>

        <div class="detail-body">
          <!-- Situation/Context -->
          <div class="detail-section context-section" v-if="selectedQuestionData.context || selectedQuestionData.situation">
            <label>📖 สถานการณ์:</label>
            <div class="context-box">
              <p>{{ selectedQuestionData.context || selectedQuestionData.situation }}</p>
            </div>
          </div>

          <!-- Question Text -->
          <div class="detail-section question-text">
            <label>❓ คำถาม:</label>
            <div class="question-box">
              <p>{{ selectedQuestionData.question || selectedQuestionData.prompt || 'ไม่มีข้อมูล' }}</p>
            </div>
          </div>

          <!-- Student Answer -->
          <div class="detail-section student-answer">
            <label>✏️ คำตอบของนักเรียน:</label>
            <div class="answer-box" :class="{ 'has-answer': selectedQuestionData.studentAnswer, 'no-answer': !selectedQuestionData.studentAnswer }">
              <template v-if="selectedQuestionData.studentAnswer">
                <p class="answer-text">{{ formatStudentAnswer(selectedQuestionData.studentAnswer) }}</p>
              </template>
              <template v-else>
                <p class="empty-answer">⚠️ ไม่ได้ตอบคำถามนี้</p>
              </template>
            </div>
          </div>

          <!-- AI Feedback -->
          <div class="detail-section ai-feedback">
            <label>🤖 ผลการประเมินจาก AI:</label>
            <div class="feedback-content">
              <p>{{ selectedQuestionData.feedback || 'ไม่มีข้อมูล' }}</p>
            </div>
          </div>

          <!-- Suggestion -->
          <div class="detail-section suggestion" v-if="selectedQuestionData.suggestion">
            <label>💡 คำแนะนำเพื่อพัฒนา:</label>
            <div class="suggestion-content">
              <p>{{ selectedQuestionData.suggestion }}</p>
            </div>
          </div>

          <!-- Per-Question ARCE Scores -->
          <div class="detail-section arce-scores" v-if="selectedQuestionData.arceScores || selectedQuestionData.arceBreakdown">
            <label>🎯 คะแนน A.R.C.E. ของข้อนี้:</label>
            <div class="mini-arce-grid">
              <div v-for="key in arceOrder" :key="key" class="mini-arce-item" :class="key">
                <span class="arce-emoji">{{ getArceEmoji(key) }}</span>
                <span class="arce-score">{{ getQuestionArceScore(key) }}/5</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <div class="detail-nav">
          <button class="nav-btn prev" @click="prevQuestion" :disabled="selectedQuestion === 0">
            ← ข้อก่อนหน้า
          </button>
          <span class="nav-info">{{ selectedQuestion + 1 }} / {{ totalQuestions }}</span>
          <button class="nav-btn next" @click="nextQuestion" :disabled="selectedQuestion === totalQuestions - 1">
            ข้อถัดไป →
          </button>
        </div>
      </div>
    </div>

    <!-- All Questions Summary View -->
    <div class="all-questions-section">
      <h4>📋 คำตอบและการประเมินรายข้อ</h4>
      <div class="all-questions-list">
        <div v-for="(q, idx) in questionResults" :key="idx" 
             class="full-question-card" :class="{ passed: q.passed, failed: !q.passed }">
          <div class="fq-header">
            <div class="fq-left">
              <span class="fq-number">ข้อ {{ idx + 1 }}</span>
              <span class="fq-arce-badge" :class="getArceFocusClass(q.arceFocus)">
                {{ getArceLabel(q.arceFocus) }}
              </span>
            </div>
            <div class="fq-right">
              <span class="fq-score">{{ q.score || q.totalScore || 0 }}/{{ q.maxScore || 20 }}</span>
              <span class="fq-percent">({{ getQuestionPercent(q) }}%)</span>
              <span class="fq-status" :class="q.passed ? 'pass' : 'fail'">
                {{ q.passed ? '✅ ผ่าน' : '❌ ไม่ผ่าน' }}
              </span>
            </div>
          </div>
          
          <div class="fq-body">
            <!-- Context -->
            <div class="fq-section context" v-if="q.context || q.situation">
              <span class="fq-label">📖 สถานการณ์:</span>
              <p>{{ q.context || q.situation }}</p>
            </div>
            
            <!-- Question -->
            <div class="fq-section question" v-if="q.question || q.prompt">
              <span class="fq-label">❓ คำถาม:</span>
              <p>{{ q.question || q.prompt }}</p>
            </div>
            
            <!-- Student Answer -->
            <div class="fq-section answer">
              <span class="fq-label">✏️ คำตอบของนักเรียน:</span>
              <p :class="{ 'no-answer': !q.studentAnswer }">
                {{ q.studentAnswer ? formatStudentAnswer(q.studentAnswer) : '⚠️ ไม่ได้ตอบคำถามนี้' }}
              </p>
            </div>
            
            <!-- AI Feedback -->
            <div class="fq-section feedback">
              <span class="fq-label">🤖 ความเห็น AI:</span>
              <p>{{ q.feedback || 'ไม่มีข้อมูล' }}</p>
            </div>
            
            <!-- Suggestion -->
            <div class="fq-section suggestion" v-if="q.suggestion">
              <span class="fq-label">💡 ข้อเสนอแนะ:</span>
              <p>{{ q.suggestion }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ARCE Deep Analysis -->
    <div class="arce-deep-section">
      <h4>🎯 การวิเคราะห์เชิงลึก A.R.C.E.</h4>
      <div class="arce-analysis-grid">
        <div v-for="key in arceOrder" :key="key" class="arce-analysis-card" :class="key">
          <div class="analysis-header">
            <span class="arce-big-emoji">{{ getArceEmoji(key) }}</span>
            <div class="arce-title">
              <h5>{{ getArceName(key) }}</h5>
              <p class="arce-english">{{ getArceEnglish(key) }}</p>
            </div>
            <div class="arce-score-badge">
              <span class="score-value">{{ getArceScore(key) }}</span>
              <span class="score-max">/5</span>
            </div>
          </div>
          <div class="analysis-bar">
            <div class="bar-fill" :style="{ width: getArcePercent(key) + '%' }"></div>
          </div>
          <p class="analysis-feedback">{{ getArceFeedback(key) || getArceDefaultFeedback(key, getArceScore(key)) }}</p>
        </div>
      </div>
    </div>

    <!-- Summary Agent Analysis -->
    <div class="summary-analysis-section">
      <div class="analysis-header">
        <span class="analysis-icon">🤖</span>
        <h4>Summary Agent: การวิเคราะห์รวม</h4>
      </div>
      
      <div class="analysis-content">
        <!-- Overall Feedback -->
        <div class="analysis-block overall">
          <h5>📝 สรุปภาพรวมผลการประเมิน</h5>
          <p>{{ effectiveSummary?.overallFeedback || assessment?.overallFeedback || 'ไม่มีข้อมูล' }}</p>
        </div>

        <!-- Strengths & Weaknesses -->
        <div class="sw-grid">
          <div class="sw-block strengths">
            <h5>✅ จุดเด่นที่พบ</h5>
            <ul v-if="assessment?.strengths?.length">
              <li v-for="(s, i) in assessment.strengths" :key="i">{{ s }}</li>
            </ul>
            <p v-else class="no-data">ไม่มีข้อมูล</p>
          </div>
          <div class="sw-block weaknesses">
            <h5>📈 จุดที่ควรพัฒนา</h5>
            <ul v-if="assessment?.weaknesses?.length">
              <li v-for="(w, i) in assessment.weaknesses" :key="i">{{ w }}</li>
            </ul>
            <p v-else class="no-data">ไม่มีข้อมูล</p>
          </div>
        </div>

        <!-- Recommendation -->
        <div class="analysis-block recommendation" v-if="effectiveSummary?.recommendation">
          <h5>💡 ข้อเสนอแนะหลัก</h5>
          <p>{{ effectiveSummary.recommendation }}</p>
        </div>

        <!-- Next Steps -->
        <div class="analysis-block next-steps" v-if="assessment?.nextSteps?.length">
          <h5>🚀 ขั้นตอนการพัฒนาถัดไป</h5>
          <ol>
            <li v-for="(step, i) in assessment.nextSteps" :key="i">{{ step }}</li>
          </ol>
        </div>
      </div>
    </div>

    <!-- Mode C Advantages -->
    <div class="mode-advantages">
      <h5>🎯 ข้อดีของโหมด Per-Question Assessment</h5>
      <div class="advantages-grid">
        <div class="advantage-card">
          <span class="adv-icon">🎯</span>
          <div class="adv-content">
            <h6>ความแม่นยำสูงสุด</h6>
            <p>AI ประเมินแยกทีละข้อ ได้ feedback ละเอียดทุกข้อ</p>
          </div>
        </div>
        <div class="advantage-card">
          <span class="adv-icon">🔍</span>
          <div class="adv-content">
            <h6>วิเคราะห์เชิงลึก</h6>
            <p>เห็นจุดอ่อนจุดแข็งในแต่ละคำถามอย่างชัดเจน</p>
          </div>
        </div>
        <div class="advantage-card">
          <span class="adv-icon">📋</span>
          <div class="adv-content">
            <h6>Feedback ครบถ้วน</h6>
            <p>คำแนะนำเฉพาะข้อ ช่วยพัฒนาได้ตรงจุด</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  assessment: { type: Object, default: () => ({}) },
  summary: { type: Object, default: () => ({}) },
  perQuestionDetails: { type: Object, default: () => ({}) }
})

const arceOrder = ['analysis', 'reasoning', 'creativity', 'evidence']
const selectedQuestion = ref(0)

// Handle summary from multiple sources
const effectiveSummary = computed(() => {
  return props.summary || props.assessment?.summary || {}
})

const questionResults = computed(() => {
  // Try multiple sources for question results
  const results = props.assessment?.questionResults 
    || props.assessment?.questions 
    || props.assessment?.perQuestionResults
    || props.assessment?.individualResults
    || props.perQuestionDetails?.results
    || []
  return results
})
const totalQuestions = computed(() => questionResults.value.length)
const passedCount = computed(() => questionResults.value.filter(q => q.passed).length)
const failedCount = computed(() => totalQuestions.value - passedCount.value)
const passRate = computed(() => totalQuestions.value > 0 ? (passedCount.value / totalQuestions.value) * 100 : 0)

const percentage = computed(() => {
  const pct = effectiveSummary.value?.percentage
  if (pct !== undefined && pct !== null) {
    return Number(pct).toFixed(0)
  }
  const total = effectiveSummary.value?.totalScore || 0
  const max = effectiveSummary.value?.maxScore || 1
  return ((total / max) * 100).toFixed(0)
})

const circumference = computed(() => 2 * Math.PI * 45)
const scoreOffset = computed(() => {
  const pct = Number(percentage.value) || 0
  return circumference.value * (1 - pct / 100)
})

const scoreLevel = computed(() => {
  const pct = Number(percentage.value) || 0
  if (pct >= 80) return 'excellent'
  if (pct >= 60) return 'good'
  if (pct >= 40) return 'fair'
  return 'poor'
})

const selectedQuestionData = computed(() => questionResults.value[selectedQuestion.value] || null)

function selectQuestion(idx) {
  selectedQuestion.value = idx
}

function prevQuestion() {
  if (selectedQuestion.value > 0) selectedQuestion.value--
}

function nextQuestion() {
  if (selectedQuestion.value < totalQuestions.value - 1) selectedQuestion.value++
}

function getQuestionPercent(q) {
  const score = q.score || q.totalScore || 0
  const max = q.maxScore || 5
  return ((score / max) * 100).toFixed(0)
}

function getArceEmoji(key) {
  const emojis = { analysis: '🔍', reasoning: '🧠', creativity: '💡', evidence: '📚' }
  return emojis[key] || emojis[key?.[0]] || '📊'
}

function getArceName(key) {
  const names = { analysis: 'การวิเคราะห์', reasoning: 'การให้เหตุผล', creativity: 'ความคิดสร้างสรรค์', evidence: 'การใช้หลักฐาน' }
  return names[key] || key
}

function getArceEnglish(key) {
  const names = { analysis: 'Analysis', reasoning: 'Reasoning', creativity: 'Creativity', evidence: 'Evidence' }
  return names[key] || key
}

function getArceLabel(key) {
  if (Array.isArray(key)) return key.map(k => getArceName(k)).join(', ')
  return getArceName(key)
}

function getArceFocusClass(focus) {
  if (Array.isArray(focus)) return focus[0] || 'analysis'
  return focus || 'analysis'
}

function getArceScore(key) {
  const score = props.assessment?.arceScores?.[key]
  return typeof score === 'object' ? (score.raw || 0) : (score || 0)
}

function getArcePercent(key) {
  return (getArceScore(key) / 5) * 100
}

function getArceFeedback(key) {
  const score = props.assessment?.arceScores?.[key]
  return typeof score === 'object' ? score.feedback : ''
}

function getArceDefaultFeedback(key, score) {
  const feedbacks = {
    analysis: {
      5: 'วิเคราะห์ได้อย่างลึกซึ้ง เห็นความเชื่อมโยงชัดเจน',
      4: 'วิเคราะห์ได้ดี แยกแยะประเด็นสำคัญได้',
      3: 'วิเคราะห์ได้ในระดับพอใช้',
      2: 'ต้องพัฒนาทักษะการวิเคราะห์',
      1: 'ขาดทักษะการวิเคราะห์'
    },
    reasoning: {
      5: 'ให้เหตุผลเป็นระบบ ตรรกะชัดเจน',
      4: 'ให้เหตุผลได้ดี มีลำดับขั้นตอน',
      3: 'ให้เหตุผลได้ในระดับพอใช้',
      2: 'ต้องพัฒนาทักษะการให้เหตุผล',
      1: 'ขาดทักษะการให้เหตุผล'
    },
    creativity: {
      5: 'มีความคิดสร้างสรรค์โดดเด่น',
      4: 'แสดงความคิดสร้างสรรค์ได้ดี',
      3: 'มีความคิดสร้างสรรค์ในระดับพอใช้',
      2: 'ต้องพัฒนาความคิดสร้างสรรค์',
      1: 'ขาดความคิดสร้างสรรค์'
    },
    evidence: {
      5: 'ใช้หลักฐานอ้างอิงได้อย่างยอดเยี่ยม',
      4: 'ใช้หลักฐานประกอบได้ดี',
      3: 'ใช้หลักฐานได้ในระดับพอใช้',
      2: 'ต้องพัฒนาการใช้หลักฐาน',
      1: 'ขาดการใช้หลักฐาน'
    }
  }
  const level = Math.max(1, Math.min(5, Math.round(score)))
  return feedbacks[key]?.[level] || ''
}

function getQuestionArceScore(key) {
  const arce = selectedQuestionData.value?.arceScores || selectedQuestionData.value?.arceBreakdown
  if (!arce) return 0
  const score = arce[key]
  return typeof score === 'object' ? (score.score || score.raw || 0) : (score || 0)
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

function formatStudentAnswer(answer) {
  if (!answer) return ''
  if (typeof answer === 'string') return answer
  if (typeof answer === 'object') {
    if (answer.fullText) return answer.fullText
    if (answer.analysis || answer.reasoning) {
      const parts = []
      if (answer.analysis) parts.push(`การวิเคราะห์: ${answer.analysis}`)
      if (answer.reasoning) parts.push(`เหตุผล: ${answer.reasoning}`)
      if (answer.creativity) parts.push(`ความคิดสร้างสรรค์: ${answer.creativity}`)
      if (answer.evidence) parts.push(`หลักฐาน: ${answer.evidence}`)
      return parts.join('\n\n')
    }
    return JSON.stringify(answer, null, 2)
  }
  return String(answer)
}
</script>

<style scoped>
.mode-c-report {
  background: linear-gradient(135deg, #d1fae5 0%, #ecfdf5 50%, #ffffff 100%);
  border-radius: 20px;
  padding: 1.5rem;
  border: 2px solid #10b981;
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.15);
}

.mode-header.per-question {
  display: flex;
  gap: 1.25rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(52, 211, 153, 0.1));
  border-radius: 16px;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.mode-icon-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #10b981, #34d399);
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.mode-main-icon {
  font-size: 2.5rem;
}

.mode-sub-icon {
  position: absolute;
  bottom: -8px;
  right: -8px;
  font-size: 0.7rem;
  background: white;
  padding: 0.25rem 0.5rem;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  font-weight: 600;
}

.mode-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #065f46;
}

.mode-subtitle {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.875rem;
  color: #10b981;
}

.mode-benefits {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.benefit-tag {
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #065f46;
}

/* Process Flow Panel */
.process-flow-panel {
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.process-flow-panel h4 {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: #374151;
}

.process-timeline {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.timeline-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.step-marker {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #6b7280;
}

.step-marker.active {
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
}

.step-marker.result {
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  color: white;
  font-size: 1.25rem;
}

.step-content {
  text-align: center;
}

.step-content h5 {
  margin: 0;
  font-size: 0.8rem;
  color: #374151;
}

.step-content p {
  margin: 0;
  font-size: 0.7rem;
  color: #9ca3af;
}

.timeline-connector {
  flex: 1;
  height: 2px;
  background: linear-gradient(90deg, #10b981, #34d399);
  margin: 0 0.5rem;
  margin-bottom: 2rem;
}

/* Score Summary Panel */
.score-summary-panel {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  gap: 2rem;
  align-items: center;
}

.main-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.score-circle {
  position: relative;
  width: 120px;
  height: 120px;
}

.circle-progress svg {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}

.circle-progress .bg {
  fill: none;
  stroke: #e5e7eb;
  stroke-width: 8;
}

.circle-progress .fill {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease;
}

.score-circle.excellent .fill { stroke: #10b981; }
.score-circle.good .fill { stroke: #3b82f6; }
.score-circle.fair .fill { stroke: #f59e0b; }
.score-circle.poor .fill { stroke: #ef4444; }

.score-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.score-num {
  font-size: 2rem;
  font-weight: 800;
  color: #1f2937;
}

.score-unit {
  font-size: 0.875rem;
  color: #6b7280;
}

.pa-level-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.pa-level-badge.pa4 { background: #d1fae5; color: #065f46; }
.pa-level-badge.pa3 { background: #dbeafe; color: #1e40af; }
.pa-level-badge.pa2 { background: #fef3c7; color: #92400e; }
.pa-level-badge.pa1 { background: #fee2e2; color: #991b1b; }

.score-metrics {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.metric-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 12px;
}

.metric-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.metric-value.passed { color: #10b981; }
.metric-value.failed { color: #ef4444; }

.metric-label {
  font-size: 0.75rem;
  color: #6b7280;
}

/* Question Gallery */
.question-gallery-section {
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.gallery-header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: #374151;
}

.gallery-legend {
  display: flex;
  gap: 0.75rem;
}

.legend {
  font-size: 0.75rem;
}

.question-overview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.question-mini-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  min-width: 60px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.question-mini-card.passed {
  background: rgba(16, 185, 129, 0.1);
}

.question-mini-card.failed {
  background: rgba(239, 68, 68, 0.1);
}

.question-mini-card.active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.question-mini-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.q-number {
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
}

.q-score {
  font-size: 0.7rem;
  color: #6b7280;
}

.q-status {
  font-size: 0.9rem;
}

/* Question Detail Panel */
.question-detail-panel {
  background: linear-gradient(145deg, #ecfdf5, #f0fdf4);
  border-radius: 16px;
  padding: 1.5rem;
  border: 2px solid rgba(16, 185, 129, 0.3);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.1);
}

.context-section .context-box {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(52, 211, 153, 0.04));
  padding: 1rem;
  border-radius: 12px;
  border-left: 4px solid #10b981;
  margin-top: 0.5rem;
}

.context-box p {
  margin: 0;
  font-size: 0.9rem;
  color: #065f46;
  line-height: 1.7;
}

.question-text .question-box {
  background: white;
  padding: 1rem;
  border-radius: 12px;
  border: 2px solid rgba(16, 185, 129, 0.2);
  margin-top: 0.5rem;
}

.question-box p {
  margin: 0;
  font-size: 0.95rem;
  color: #1f2937;
  font-weight: 500;
  line-height: 1.7;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.q-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.q-badge {
  background: #374151;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.bloom-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 500;
}

.bloom-badge.bloom-1, .bloom-badge.bloom-2 { background: #fef3c7; color: #92400e; }
.bloom-badge.bloom-3, .bloom-badge.bloom-4 { background: #dbeafe; color: #1e40af; }
.bloom-badge.bloom-5, .bloom-badge.bloom-6 { background: #ede9fe; color: #5b21b6; }

.arce-tag {
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 500;
}

.arce-tag.analysis { background: rgba(59, 130, 246, 0.15); color: #1e40af; }
.arce-tag.reasoning { background: rgba(139, 92, 246, 0.15); color: #5b21b6; }
.arce-tag.creativity { background: rgba(245, 158, 11, 0.15); color: #92400e; }
.arce-tag.evidence { background: rgba(16, 185, 129, 0.15); color: #065f46; }

.q-score-display {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 10px;
}

.q-score-display.pass {
  background: rgba(16, 185, 129, 0.1);
}

.q-score-display .score {
  font-size: 1.5rem;
  font-weight: 700;
}

.q-score-display .max {
  font-size: 1rem;
  color: #6b7280;
}

.q-score-display .percent {
  font-size: 0.8rem;
  color: #9ca3af;
  margin-left: 0.5rem;
}

.detail-section {
  margin-bottom: 1rem;
}

.detail-section label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.detail-section p {
  margin: 0;
  font-size: 0.9rem;
  color: #4b5563;
  line-height: 1.6;
}

.answer-box {
  background: white;
  padding: 1rem;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  font-size: 0.9rem;
  line-height: 1.6;
  margin-top: 0.5rem;
  transition: all 0.3s ease;
}

.answer-box.has-answer {
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
  border-color: rgba(16, 185, 129, 0.3);
}

.answer-box.no-answer {
  background: #fef2f2;
  border-color: rgba(239, 68, 68, 0.3);
}

.answer-text {
  margin: 0;
  white-space: pre-wrap;
  color: #1f2937;
  line-height: 1.7;
}

.empty-answer {
  margin: 0;
  color: #dc2626;
  font-style: italic;
}

.answer-box pre {
  margin: 0;
  white-space: pre-wrap;
  font-size: 0.8rem;
}

.feedback-content {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05));
  padding: 1.25rem;
  border-radius: 12px;
  border-left: 4px solid #10b981;
  margin-top: 0.5rem;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
}

.feedback-content p {
  margin: 0;
  color: #065f46;
  line-height: 1.7;
}

.suggestion-content {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.05));
  padding: 1.25rem;
  border-radius: 12px;
  border-left: 4px solid #f59e0b;
  margin-top: 0.5rem;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1);
}

.suggestion-content p {
  margin: 0;
  color: #92400e;
  line-height: 1.7;
}

.mini-arce-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.mini-arce-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  border-radius: 8px;
}

.mini-arce-item.analysis { background: rgba(59, 130, 246, 0.1); }
.mini-arce-item.reasoning { background: rgba(139, 92, 246, 0.1); }
.mini-arce-item.creativity { background: rgba(245, 158, 11, 0.1); }
.mini-arce-item.evidence { background: rgba(16, 185, 129, 0.1); }

.arce-emoji {
  font-size: 1rem;
}

.arce-score {
  font-size: 0.75rem;
  font-weight: 600;
}

.detail-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  margin-top: 1rem;
}

.nav-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.nav-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #10b981;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-info {
  font-size: 0.85rem;
  color: #6b7280;
}

/* All Questions Summary Section */
.all-questions-section {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.all-questions-section h4 {
  margin: 0 0 1.25rem;
  font-size: 1rem;
  color: #065f46;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.all-questions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.full-question-card {
  background: linear-gradient(145deg, #ecfdf5, #f0fdf4);
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgba(16, 185, 129, 0.2);
  transition: all 0.3s ease;
}

.full-question-card:hover {
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
}

.full-question-card.passed {
  border-left: 5px solid #10b981;
}

.full-question-card.failed {
  border-left: 5px solid #ef4444;
  background: linear-gradient(145deg, #fef2f2, #fef2f2);
}

.fq-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(52, 211, 153, 0.08));
  border-bottom: 1px solid rgba(16, 185, 129, 0.15);
}

.full-question-card.failed .fq-header {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
  border-color: rgba(239, 68, 68, 0.15);
}

.fq-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.fq-number {
  font-weight: 700;
  color: #065f46;
  font-size: 0.95rem;
}

.fq-arce-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-weight: 600;
}

.fq-arce-badge.analysis { background: #dbeafe; color: #1e40af; }
.fq-arce-badge.reasoning { background: #ede9fe; color: #5b21b6; }
.fq-arce-badge.creativity { background: #fef3c7; color: #92400e; }
.fq-arce-badge.evidence { background: #d1fae5; color: #065f46; }

.fq-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.fq-score {
  font-weight: 700;
  font-size: 1rem;
  color: #1f2937;
}

.fq-percent {
  font-size: 0.8rem;
  color: #6b7280;
}

.fq-status {
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 600;
}

.fq-status.pass { background: #d1fae5; color: #065f46; }
.fq-status.fail { background: #fee2e2; color: #991b1b; }

.fq-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.fq-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.fq-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
}

.fq-section p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.7;
  color: #4b5563;
}

.fq-section.context {
  padding: 0.75rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(52, 211, 153, 0.04));
  border-radius: 8px;
  border-left: 3px solid #10b981;
}

.fq-section.context p {
  color: #065f46;
}

.fq-section.question {
  padding: 0.75rem;
  background: white;
  border-radius: 8px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.fq-section.question p {
  color: #1f2937;
  font-weight: 500;
}

.fq-section.answer {
  padding: 0.75rem;
  background: rgba(16, 185, 129, 0.05);
  border-radius: 8px;
  border: 1px dashed rgba(16, 185, 129, 0.3);
}

.fq-section.answer p.no-answer {
  color: #dc2626;
  font-style: italic;
}

.fq-section.feedback {
  padding: 0.75rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05));
  border-radius: 8px;
  border-left: 3px solid #10b981;
}

.fq-section.feedback p {
  color: #065f46;
}

.fq-section.suggestion {
  padding: 0.75rem;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.05));
  border-radius: 8px;
  border-left: 3px solid #f59e0b;
}

.fq-section.suggestion p {
  color: #92400e;
}

/* ARCE Deep Section */
.arce-deep-section {
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.arce-deep-section h4 {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: #374151;
}

.arce-analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.arce-analysis-card {
  padding: 1rem;
  border-radius: 12px;
  border-left: 4px solid;
}

.arce-analysis-card.analysis { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }
.arce-analysis-card.reasoning { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.05); }
.arce-analysis-card.creativity { border-color: #f59e0b; background: rgba(245, 158, 11, 0.05); }
.arce-analysis-card.evidence { border-color: #10b981; background: rgba(16, 185, 129, 0.05); }

.analysis-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.arce-big-emoji {
  font-size: 1.5rem;
}

.arce-title {
  flex: 1;
}

.arce-title h5 {
  margin: 0;
  font-size: 0.9rem;
  color: #374151;
}

.arce-english {
  margin: 0;
  font-size: 0.7rem;
  color: #9ca3af;
}

.arce-score-badge {
  display: flex;
  align-items: baseline;
  gap: 0.1rem;
}

.arce-score-badge .score-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.arce-score-badge .score-max {
  font-size: 0.9rem;
  color: #9ca3af;
}

.analysis-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.arce-analysis-card.analysis .bar-fill { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.arce-analysis-card.reasoning .bar-fill { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
.arce-analysis-card.creativity .bar-fill { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.arce-analysis-card.evidence .bar-fill { background: linear-gradient(90deg, #10b981, #34d399); }

.analysis-feedback {
  margin: 0;
  font-size: 0.8rem;
  color: #6b7280;
  line-height: 1.5;
}

/* Summary Analysis Section */
.summary-analysis-section {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05));
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.analysis-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.analysis-icon {
  font-size: 1.5rem;
}

.analysis-header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: #065f46;
}

.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.analysis-block {
  background: white;
  padding: 1rem;
  border-radius: 12px;
}

.analysis-block h5 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  color: #374151;
}

.analysis-block p {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.6;
}

.analysis-block.recommendation {
  border-left: 3px solid #f59e0b;
}

.analysis-block.next-steps ol {
  margin: 0;
  padding-left: 1.25rem;
}

.analysis-block.next-steps li {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.sw-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.sw-block {
  background: white;
  padding: 1rem;
  border-radius: 12px;
}

.sw-block.strengths { border-left: 4px solid #10b981; }
.sw-block.weaknesses { border-left: 4px solid #f59e0b; }

.sw-block h5 {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  color: #374151;
}

.sw-block ul {
  margin: 0;
  padding-left: 1rem;
}

.sw-block li {
  font-size: 0.85rem;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.no-data {
  margin: 0;
  font-size: 0.85rem;
  color: #9ca3af;
}

/* Mode Advantages */
.mode-advantages {
  background: rgba(16, 185, 129, 0.1);
  border-radius: 12px;
  padding: 1rem;
}

.mode-advantages h5 {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  color: #065f46;
}

.advantages-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.advantage-card {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: white;
  border-radius: 10px;
}

.adv-icon {
  font-size: 1.5rem;
}

.adv-content h6 {
  margin: 0 0 0.25rem;
  font-size: 0.8rem;
  color: #374151;
}

.adv-content p {
  margin: 0;
  font-size: 0.7rem;
  color: #6b7280;
}

/* Responsive */
@media (max-width: 768px) {
  .process-timeline {
    flex-direction: column;
    gap: 1rem;
  }
  
  .timeline-connector {
    width: 2px;
    height: 30px;
    margin: 0;
  }
  
  .score-summary-panel {
    flex-direction: column;
  }
  
  .score-metrics {
    width: 100%;
  }
  
  .arce-analysis-grid,
  .sw-grid {
    grid-template-columns: 1fr;
  }
  
  .advantages-grid {
    grid-template-columns: 1fr;
  }
  
  .mini-arce-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Dark Mode */
.dark-mode .mode-c-report {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(30, 41, 59, 0.95) 50%, #1e293b 100%);
  border-color: rgba(16, 185, 129, 0.4);
}

.dark-mode .process-flow-panel,
.dark-mode .score-summary-panel,
.dark-mode .question-gallery-section,
.dark-mode .arce-deep-section,
.dark-mode .analysis-block,
.dark-mode .sw-block,
.dark-mode .advantage-card {
  background: rgba(30, 41, 59, 0.8);
}

.dark-mode .question-detail-panel {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark-mode h4,
.dark-mode h5,
.dark-mode h6,
.dark-mode .mode-title,
.dark-mode .score-num,
.dark-mode .metric-value,
.dark-mode .arce-score-badge .score-value {
  color: #f1f5f9;
}

.dark-mode .mode-subtitle,
.dark-mode .step-content p,
.dark-mode .metric-label,
.dark-mode .arce-english,
.dark-mode .analysis-feedback,
.dark-mode .sw-block li {
  color: #94a3b8;
}

/* Dark Mode - Detail Section Labels */
.dark-mode .detail-section label {
  color: #e2e8f0;
}

.dark-mode .detail-section p {
  color: #cbd5e1;
}

.dark-mode .q-badge {
  background: rgba(16, 185, 129, 0.3);
  color: #a7f3d0;
}

.dark-mode .bloom-badge {
  color: #e2e8f0;
}

.dark-mode .arce-tag {
  color: #e2e8f0;
}

.dark-mode .q-score-display .score {
  color: #f1f5f9;
}

.dark-mode .q-score-display .max {
  color: #94a3b8;
}

.dark-mode .q-score-display .percent {
  color: #94a3b8;
}

/* Dark Mode - Nav Buttons */
.dark-mode .nav-btn {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(16, 185, 129, 0.3);
  color: #e2e8f0;
}

.dark-mode .nav-btn:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.5);
}

.dark-mode .nav-info {
  color: #94a3b8;
}

/* Dark Mode - Gallery Header & Legend */
.dark-mode .gallery-header h4 {
  color: #a7f3d0;
}

.dark-mode .legend {
  color: #e2e8f0;
}

/* Dark Mode - Question Mini Cards */
.dark-mode .question-mini-card {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(16, 185, 129, 0.2);
}

.dark-mode .question-mini-card.passed {
  background: rgba(16, 185, 129, 0.15);
}

.dark-mode .question-mini-card.failed {
  background: rgba(239, 68, 68, 0.15);
}

.dark-mode .question-mini-card .q-number {
  color: #f1f5f9;
}

.dark-mode .question-mini-card .q-score {
  color: #cbd5e1;
}

.dark-mode .question-detail-panel {
  background: linear-gradient(145deg, rgba(16, 185, 129, 0.1), rgba(30, 41, 59, 0.95));
  border-color: rgba(16, 185, 129, 0.4);
}

.dark-mode .context-box {
  background: rgba(16, 185, 129, 0.15);
}

.dark-mode .context-box p {
  color: #a7f3d0;
}

.dark-mode .question-box {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(16, 185, 129, 0.3);
}

.dark-mode .question-box p {
  color: #f1f5f9;
}

.dark-mode .answer-box {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark-mode .answer-box.has-answer {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

.dark-mode .answer-text {
  color: #e2e8f0;
}

.dark-mode .feedback-content {
  background: rgba(16, 185, 129, 0.15);
}

.dark-mode .feedback-content p {
  color: #a7f3d0;
}

.dark-mode .suggestion-content {
  background: rgba(245, 158, 11, 0.15);
}

.dark-mode .suggestion-content p {
  color: #fde68a;
}

/* Dark Mode - All Questions Section */
.dark-mode .all-questions-section {
  background: rgba(30, 41, 59, 0.8);
}

.dark-mode .all-questions-section h4 {
  color: #a7f3d0;
}

.dark-mode .full-question-card {
  background: linear-gradient(145deg, rgba(16, 185, 129, 0.1), rgba(30, 41, 59, 0.95));
  border-color: rgba(16, 185, 129, 0.3);
}

.dark-mode .full-question-card.failed {
  background: linear-gradient(145deg, rgba(239, 68, 68, 0.1), rgba(30, 41, 59, 0.95));
}

.dark-mode .fq-header {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.2);
}

.dark-mode .full-question-card.failed .fq-header {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.2);
}

.dark-mode .fq-number {
  color: #a7f3d0;
}

.dark-mode .fq-score {
  color: #f1f5f9;
}

.dark-mode .fq-percent {
  color: #94a3b8;
}

.dark-mode .fq-label {
  color: #94a3b8;
}

.dark-mode .fq-section p {
  color: #cbd5e1;
}

.dark-mode .fq-section.context {
  background: rgba(16, 185, 129, 0.1);
}

.dark-mode .fq-section.context p {
  color: #a7f3d0;
}

.dark-mode .fq-section.question {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(16, 185, 129, 0.3);
}

.dark-mode .fq-section.question p {
  color: #f1f5f9;
}

.dark-mode .fq-section.answer {
  background: rgba(30, 41, 59, 0.5);
  border-color: rgba(16, 185, 129, 0.3);
}

.dark-mode .fq-section.answer p {
  color: #e2e8f0;
}

.dark-mode .fq-section.feedback {
  background: rgba(16, 185, 129, 0.1);
}

.dark-mode .fq-section.feedback p {
  color: #a7f3d0;
}

.dark-mode .fq-section.suggestion {
  background: rgba(245, 158, 11, 0.1);
}

.dark-mode .fq-section.suggestion p {
  color: #fde68a;
}
</style>
