<template>
  <!-- ⚡ Mode A: Single Agent Report - เน้นความเร็วและภาพรวม -->
  <div class="mode-a-report">
    <!-- Mode Header with distinctive branding -->
    <div class="mode-header single">
      <div class="mode-icon-wrapper">
        <span class="mode-main-icon">⚡</span>
        <span class="mode-sub-icon">🤖×1</span>
      </div>
      <div class="mode-info">
        <h3 class="mode-title">โหมด A: Single Agent Assessment</h3>
        <p class="mode-subtitle">AI 1 ตัวประเมินทั้งใบงาน - เร็วและประหยัด</p>
        <div class="mode-benefits">
          <span class="benefit-tag">⚡ ประเมินรวดเร็ว</span>
          <span class="benefit-tag">💰 ประหยัดต้นทุน</span>
          <span class="benefit-tag">📊 ภาพรวมชัดเจน</span>
        </div>
      </div>
    </div>

    <!-- Quick Score Summary -->
    <div class="quick-score-panel">
      <div class="score-ring" :class="scoreLevel">
        <svg viewBox="0 0 100 100">
          <circle class="score-bg" cx="50" cy="50" r="45"/>
          <circle class="score-fill" cx="50" cy="50" r="45" 
                  :stroke-dasharray="circumference"
                  :stroke-dashoffset="scoreOffset"/>
        </svg>
        <div class="score-center">
          <span class="score-value">{{ percentage }}</span>
          <span class="score-unit">%</span>
        </div>
      </div>
      <div class="score-details">
        <div class="score-item">
          <span class="item-icon">📝</span>
          <span class="item-label">คะแนนรวม</span>
          <span class="item-value">{{ effectiveSummary?.totalScore || 0 }} / {{ effectiveSummary?.maxScore || 0 }}</span>
        </div>
        <div class="score-item">
          <span class="item-icon">🎯</span>
          <span class="item-label">ระดับ PA</span>
          <span class="item-value pa-badge" :class="'pa' + (effectiveSummary?.paLevel || 1)">
            {{ effectiveSummary?.paLevelText || 'ระดับ 1' }}
          </span>
        </div>
        <div class="score-item">
          <span class="item-icon">⏱️</span>
          <span class="item-label">เวลาประมวลผล</span>
          <span class="item-value highlight-speed">< 5 วินาที</span>
        </div>
      </div>
    </div>

    <!-- ARCE Quick Overview -->
    <div class="arce-quick-view">
      <h4>📊 ภาพรวมทักษะ A.R.C.E.</h4>
      <div class="arce-bars">
        <div v-for="key in arceOrder" :key="key" class="arce-bar-item" :class="key">
          <span class="arce-label">{{ getArceEmoji(key) }} {{ getArceShortName(key) }}</span>
          <div class="arce-bar-track">
            <div class="arce-bar-fill" :style="{ width: getArcePercent(key) + '%' }"></div>
          </div>
          <span class="arce-value">{{ getArceScore(key) }}/5</span>
        </div>
      </div>
    </div>

    <!-- Overall Feedback - Highlighted for Single Mode -->
    <div class="single-mode-feedback">
      <div class="feedback-header">
        <span class="feedback-icon">💬</span>
        <h4>ผลการประเมินภาพรวม</h4>
      </div>
      <p class="overall-feedback-text">{{ effectiveSummary?.overallFeedback || assessment?.overallFeedback || 'ไม่มีข้อมูล' }}</p>
      <div class="recommendation-box" v-if="effectiveSummary?.recommendation || assessment?.recommendation">
        <span class="rec-icon">💡</span>
        <p>{{ effectiveSummary?.recommendation || assessment?.recommendation }}</p>
      </div>
    </div>

    <!-- Strengths & Weaknesses Quick View -->
    <div class="sw-quick-grid">
      <div class="sw-card strengths">
        <h5>✅ จุดเด่น</h5>
        <ul v-if="assessment?.strengths?.length">
          <li v-for="(s, i) in assessment.strengths.slice(0, 3)" :key="i">{{ s }}</li>
        </ul>
        <p v-else class="no-data">-</p>
      </div>
      <div class="sw-card weaknesses">
        <h5>📈 จุดที่ควรพัฒนา</h5>
        <ul v-if="assessment?.weaknesses?.length">
          <li v-for="(w, i) in assessment.weaknesses.slice(0, 3)" :key="i">{{ w }}</li>
        </ul>
        <p v-else class="no-data">-</p>
      </div>
    </div>

    <!-- 📋 Question Results Section - แสดงคำตอบและการประเมินรายข้อ -->
    <div class="question-results-section" v-if="questionResults?.length">
      <div class="section-header">
        <span class="section-icon">📋</span>
        <h4>คำตอบและการประเมินรายข้อ ({{ questionResults.length }} ข้อ)</h4>
      </div>
      
      <div class="questions-list">
        <div v-for="(q, idx) in questionResults" :key="q.questionId || idx" 
             class="question-card" :class="{ passed: q.passed, failed: !q.passed }">
          
          <!-- Question Header -->
          <div class="question-header">
            <span class="q-number">ข้อ {{ idx + 1 }}</span>
            <span class="q-arce-badge" :class="q.arceFocus || 'analysis'">
              {{ getArceEmoji(q.arceFocus) }} {{ getArceName(q.arceFocus) }}
            </span>
            <div class="q-score">
              <span class="score-num">{{ q.score || q.totalScore || 0 }}/{{ q.maxScore || 20 }}</span>
              <span class="pass-badge" :class="q.passed ? 'pass' : 'fail'">
                {{ q.passed ? '✓ ผ่าน' : '✗ ไม่ผ่าน' }}
              </span>
            </div>
          </div>
          
          <!-- Question Content -->
          <div class="question-content">
            <!-- สถานการณ์/บริบท -->
            <div class="q-context" v-if="q.context || q.situation || q.task">
              <span class="label">📖 สถานการณ์:</span>
              <p>{{ q.context || q.situation || q.task }}</p>
            </div>
            
            <!-- คำถาม -->
            <div class="q-prompt">
              <span class="label">❓ คำถาม:</span>
              <p>{{ q.question || q.prompt || q.text || '-' }}</p>
            </div>
            
            <!-- คำตอบของนักเรียน -->
            <div class="q-answer">
              <span class="label">✏️ คำตอบของนักเรียน:</span>
              <div class="answer-box" :class="{ 'has-answer': q.studentAnswer, 'no-answer': !q.studentAnswer }">
                <template v-if="q.studentAnswer">
                  {{ formatAnswer(q.studentAnswer) }}
                </template>
                <template v-else>
                  <span class="empty-answer">⚠️ ไม่ได้ตอบคำถามนี้</span>
                </template>
              </div>
            </div>
          </div>
          
          <!-- AI Feedback -->
          <div class="q-feedback">
            <span class="feedback-label">🤖 ความเห็น AI:</span>
            <p>{{ q.feedback || 'ไม่มีความเห็น' }}</p>
          </div>
          
          <!-- Suggestion if failed -->
          <div class="q-suggestion" v-if="!q.passed && q.suggestion">
            <span class="suggestion-label">💡 คำแนะนำ:</span>
            <p>{{ q.suggestion }}</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Fallback if no question results but has raw data -->
    <div class="no-question-results-notice" v-else-if="assessment">
      <div class="notice-box">
        <span class="notice-icon">ℹ️</span>
        <p>รายงานโหมด A ไม่มีข้อมูลรายข้อ เนื่องจากประเมินภาพรวมทั้งใบงานในครั้งเดียว</p>
      </div>
    </div>

    <!-- Mode A Disclaimer -->
    <div class="mode-disclaimer">
      <span class="material-icons">info</span>
      <p>โหมด A ใช้ AI 1 ตัวประเมินทั้งใบงานพร้อมกัน เหมาะสำหรับการประเมินเบื้องต้นที่ต้องการความรวดเร็ว หากต้องการผลที่ละเอียดกว่านี้ แนะนำโหมด B, C หรือ D</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  assessment: { type: Object, default: () => ({}) },
  summary: { type: Object, default: () => ({}) }
})

const arceOrder = ['analysis', 'reasoning', 'creativity', 'evidence']

// Support both direct summary and nested assessment.summary
const effectiveSummary = computed(() => {
  return props.summary || props.assessment?.summary || {}
})

// Get question results from multiple possible locations
const questionResults = computed(() => {
  // Try multiple sources for question results
  const results = props.assessment?.questionResults 
    || props.assessment?.questions 
    || props.assessment?.perQuestionResults
    || props.assessment?.results
    || []
  
  // If still empty, try to construct from worksheet data
  if (results.length === 0 && props.assessment?.worksheetData?.questions) {
    const questions = props.assessment.worksheetData.questions
    const answers = props.assessment?.answers || props.assessment?.studentAnswers || {}
    const feedbacks = props.assessment?.feedbacks || props.assessment?.questionFeedbacks || {}
    
    return questions.map((q, idx) => ({
      questionId: q.id || `q${idx + 1}`,
      context: q.context || q.situation || '',
      question: q.question || q.prompt || q.text || '',
      prompt: q.prompt || q.question || q.text || '',
      arceFocus: q.arceFocus || q.arce || 'analysis',
      studentAnswer: answers[q.id] || answers[idx] || answers[`q${idx + 1}`] || '',
      score: feedbacks[q.id]?.score || feedbacks[idx]?.score || 0,
      maxScore: q.maxScore || 5,
      passed: (feedbacks[q.id]?.score || feedbacks[idx]?.score || 0) >= 3,
      feedback: feedbacks[q.id]?.feedback || feedbacks[idx]?.feedback || '',
      suggestion: feedbacks[q.id]?.suggestion || feedbacks[idx]?.suggestion || ''
    }))
  }
  
  return results
})

const percentage = computed(() => {
  const pct = effectiveSummary.value?.percentage
  if (pct !== undefined && pct !== null) {
    return Number(pct).toFixed(0)
  }
  // Calculate from totalScore/maxScore if percentage not available
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

function getArceEmoji(key) {
  const emojis = { analysis: '🔍', reasoning: '🧠', creativity: '💡', evidence: '📚' }
  return emojis[key] || ''
}

function getArceShortName(key) {
  const names = { analysis: 'วิเคราะห์', reasoning: 'เหตุผล', creativity: 'สร้างสรรค์', evidence: 'หลักฐาน' }
  return names[key] || key
}

function getArceName(key) {
  const names = { analysis: 'การวิเคราะห์', reasoning: 'การให้เหตุผล', creativity: 'ความคิดสร้างสรรค์', evidence: 'การใช้หลักฐาน' }
  return names[key] || key
}

function getArceScore(key) {
  const score = props.assessment?.arceScores?.[key]
  return typeof score === 'object' ? (score.raw || 0) : (score || 0)
}

function getArcePercent(key) {
  return (getArceScore(key) / 5) * 100
}

function formatAnswer(answer) {
  if (!answer) return ''
  if (typeof answer === 'string') return answer
  if (typeof answer === 'object') {
    // Handle structured answers (e.g., ARCE format)
    if (answer.fullText) return answer.fullText
    if (answer.analysis || answer.reasoning) {
      const parts = []
      if (answer.analysis) parts.push(`การวิเคราะห์: ${answer.analysis}`)
      if (answer.reasoning) parts.push(`เหตุผล: ${answer.reasoning}`)
      if (answer.creativity) parts.push(`ความคิดสร้างสรรค์: ${answer.creativity}`)
      if (answer.evidence) parts.push(`หลักฐาน: ${answer.evidence}`)
      return parts.join('\n')
    }
    return JSON.stringify(answer, null, 2)
  }
  return String(answer)
}
</script>

<style scoped>
.mode-a-report {
  background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 50%, #ffffff 100%);
  border-radius: 20px;
  padding: 1.5rem;
  border: 2px solid #f59e0b;
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.15);
}

.mode-header.single {
  display: flex;
  gap: 1.25rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(251, 191, 36, 0.1));
  border-radius: 16px;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.mode-icon-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
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
}

.mode-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #92400e;
}

.mode-subtitle {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.875rem;
  color: #a16207;
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
  color: #92400e;
}

/* Quick Score Panel */
.quick-score-panel {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 16px;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.score-ring {
  position: relative;
  width: 120px;
  height: 120px;
}

.score-ring svg {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}

.score-bg {
  fill: none;
  stroke: #e5e7eb;
  stroke-width: 8;
}

.score-fill {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease;
}

.score-ring.excellent .score-fill { stroke: #10b981; }
.score-ring.good .score-fill { stroke: #3b82f6; }
.score-ring.fair .score-fill { stroke: #f59e0b; }
.score-ring.poor .score-fill { stroke: #ef4444; }

.score-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.score-center .score-value {
  font-size: 2rem;
  font-weight: 800;
  color: #1f2937;
}

.score-center .score-unit {
  font-size: 0.875rem;
  color: #6b7280;
}

.score-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.item-icon {
  font-size: 1.25rem;
}

.item-label {
  flex: 1;
  font-size: 0.875rem;
  color: #6b7280;
}

.item-value {
  font-weight: 600;
  color: #1f2937;
}

.highlight-speed {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
}

.pa-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
}

.pa-badge.pa4 { background: #d1fae5; color: #065f46; }
.pa-badge.pa3 { background: #dbeafe; color: #1e40af; }
.pa-badge.pa2 { background: #fef3c7; color: #92400e; }
.pa-badge.pa1 { background: #fee2e2; color: #991b1b; }

/* ARCE Quick View */
.arce-quick-view {
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.arce-quick-view h4 {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: #374151;
}

.arce-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.arce-bar-item {
  display: grid;
  grid-template-columns: 100px 1fr 50px;
  align-items: center;
  gap: 0.75rem;
}

.arce-label {
  font-size: 0.85rem;
  font-weight: 500;
}

.arce-bar-track {
  height: 10px;
  background: #e5e7eb;
  border-radius: 5px;
  overflow: hidden;
}

.arce-bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.5s ease;
}

.arce-bar-item.analysis .arce-bar-fill { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.arce-bar-item.reasoning .arce-bar-fill { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
.arce-bar-item.creativity .arce-bar-fill { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.arce-bar-item.evidence .arce-bar-fill { background: linear-gradient(90deg, #10b981, #34d399); }

.arce-value {
  font-size: 0.85rem;
  font-weight: 600;
  text-align: right;
  color: #374151;
}

/* Feedback Section */
.single-mode-feedback {
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border-left: 4px solid #f59e0b;
}

.feedback-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.feedback-icon {
  font-size: 1.25rem;
}

.feedback-header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: #374151;
}

.overall-feedback-text {
  margin: 0 0 1rem;
  line-height: 1.7;
  color: #4b5563;
}

.recommendation-box {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.05));
  border-radius: 12px;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.rec-icon {
  font-size: 1.25rem;
}

.recommendation-box p {
  margin: 0;
  font-size: 0.9rem;
  color: #92400e;
  line-height: 1.6;
}

/* Strengths & Weaknesses */
.sw-quick-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.sw-card {
  background: white;
  border-radius: 12px;
  padding: 1rem;
}

.sw-card.strengths {
  border-left: 4px solid #10b981;
}

.sw-card.weaknesses {
  border-left: 4px solid #f59e0b;
}

.sw-card h5 {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  color: #374151;
}

.sw-card ul {
  margin: 0;
  padding-left: 1rem;
}

.sw-card li {
  font-size: 0.85rem;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.no-data {
  color: #9ca3af;
  font-size: 0.85rem;
  margin: 0;
}

/* Disclaimer */
.mode-disclaimer {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 12px;
  align-items: flex-start;
}

.mode-disclaimer .material-icons {
  color: #f59e0b;
  font-size: 1.25rem;
}

.mode-disclaimer p {
  margin: 0;
  font-size: 0.8rem;
  color: #92400e;
  line-height: 1.5;
}

/* Question Results Section */
.question-results-section {
  margin-bottom: 1.5rem;
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.section-icon {
  font-size: 1.25rem;
}

.question-results-section h4 {
  margin: 0;
  font-size: 1rem;
  color: #374151;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Notice Box for No Results */
.no-question-results-notice {
  margin-bottom: 1.5rem;
}

.notice-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.05));
  border-radius: 12px;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.notice-icon {
  font-size: 1.25rem;
}

.notice-box p {
  margin: 0;
  font-size: 0.85rem;
  color: #92400e;
  line-height: 1.5;
}

/* Question Header */
.question-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(251, 191, 36, 0.08));
  border-bottom: 1px solid rgba(245, 158, 11, 0.2);
}

.question-card {
  background: linear-gradient(145deg, #fffbeb, #fef9c3);
  border-radius: 12px;
  margin-bottom: 1rem;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 2px solid rgba(245, 158, 11, 0.2);
  transition: all 0.3s ease;
}

.question-card:hover {
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.4);
}

.question-card.passed {
  border-left: 5px solid #10b981;
}

.question-card.failed {
  border-left: 5px solid #ef4444;
  background: linear-gradient(145deg, #fef2f2, #fef2f2);
}

/* Question Content */
.question-content {
  padding: 1rem;
}

.question-content .label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.q-context {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.05));
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
}

.q-context p {
  margin: 0;
  font-size: 0.9rem;
  color: #92400e;
  line-height: 1.7;
}

.q-prompt {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: white;
  border-radius: 8px;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.q-prompt p {
  margin: 0;
  font-size: 0.95rem;
  color: #1f2937;
  font-weight: 500;
  line-height: 1.7;
}

.q-answer {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: rgba(245, 158, 11, 0.08);
  border-radius: 8px;
  border: 1px dashed rgba(245, 158, 11, 0.4);
}

.answer-box {
  font-size: 0.9rem;
  color: #374151;
  line-height: 1.7;
  white-space: pre-wrap;
}

.answer-box.has-answer {
  color: #1f2937;
}

.answer-box.no-answer {
  color: #dc2626;
  font-style: italic;
}

.empty-answer {
  color: #dc2626;
  font-style: italic;
}

/* Q-Feedback Section */
.q-feedback {
  padding: 0.75rem;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(251, 191, 36, 0.05));
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
  margin: 0.75rem 1rem 1rem;
}

.q-feedback .feedback-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 0.5rem;
  display: block;
}

.q-feedback p {
  margin: 0;
  font-size: 0.85rem;
  color: #4b5563;
  line-height: 1.6;
}

/* Q-Suggestion */
.q-suggestion {
  margin: 0 1rem 1rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05));
  border-radius: 8px;
  border-left: 4px solid #10b981;
}

.q-suggestion .suggestion-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #065f46;
  margin-bottom: 0.5rem;
  display: block;
}

.q-suggestion p {
  margin: 0;
  font-size: 0.85rem;
  color: #065f46;
  line-height: 1.6;
}

/* Q-Number and badges */
.q-number {
  font-weight: 700;
  color: #92400e;
  font-size: 0.95rem;
}

.q-arce-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-weight: 600;
}

.q-arce-badge.analysis { background: #dbeafe; color: #1e40af; }
.q-arce-badge.reasoning { background: #ede9fe; color: #5b21b6; }
.q-arce-badge.creativity { background: #fef3c7; color: #92400e; }
.q-arce-badge.evidence { background: #d1fae5; color: #065f46; }

.q-score {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.score-num {
  font-weight: 700;
  font-size: 0.95rem;
  color: #1f2937;
}

.pass-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-weight: 600;
}

.pass-badge.pass { background: #d1fae5; color: #065f46; }
.pass-badge.fail { background: #fee2e2; color: #991b1b; }

/* Responsive */
@media (max-width: 768px) {
  .quick-score-panel {
    flex-direction: column;
  }
  
  .sw-quick-grid {
    grid-template-columns: 1fr;
  }
  
  .arce-bar-item {
    grid-template-columns: 80px 1fr 40px;
  }
  
  .q-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .q-header-right {
    width: 100%;
    justify-content: flex-end;
  }
}

/* Dark Mode */
.dark-mode .mode-a-report {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(30, 41, 59, 0.95) 50%, #1e293b 100%);
  border-color: rgba(245, 158, 11, 0.4);
}

.dark-mode .quick-score-panel,
.dark-mode .arce-quick-view,
.dark-mode .single-mode-feedback,
.dark-mode .sw-card {
  background: rgba(30, 41, 59, 0.8);
}

.dark-mode .mode-title,
.dark-mode .score-center .score-value,
.dark-mode .arce-quick-view h4,
.dark-mode .feedback-header h4,
.dark-mode .sw-card h5,
.dark-mode .arce-value {
  color: #f1f5f9;
}

.dark-mode .mode-subtitle,
.dark-mode .item-label,
.dark-mode .overall-feedback-text,
.dark-mode .sw-card li {
  color: #94a3b8;
}

/* Dark Mode - Question Results */
.dark-mode .question-results-section {
  background: rgba(30, 41, 59, 0.8);
}

.dark-mode .question-results-section h4 {
  color: #f1f5f9;
}

.dark-mode .question-card {
  background: linear-gradient(145deg, rgba(245, 158, 11, 0.1), rgba(30, 41, 59, 0.95));
  border-color: rgba(245, 158, 11, 0.3);
}

.dark-mode .question-card.failed {
  background: linear-gradient(145deg, rgba(239, 68, 68, 0.1), rgba(30, 41, 59, 0.95));
}

.dark-mode .question-header {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.3);
}

.dark-mode .q-number {
  color: #fbbf24;
}

.dark-mode .question-content .label {
  color: #94a3b8;
}

.dark-mode .q-context {
  background: rgba(245, 158, 11, 0.1);
}

.dark-mode .q-context p {
  color: #fde68a;
}

.dark-mode .q-prompt {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(245, 158, 11, 0.3);
}

.dark-mode .q-prompt p {
  color: #f1f5f9;
}

.dark-mode .q-answer {
  background: rgba(30, 41, 59, 0.5);
  border-color: rgba(245, 158, 11, 0.3);
}

.dark-mode .answer-box {
  color: #e2e8f0;
}

.dark-mode .q-feedback {
  background: rgba(245, 158, 11, 0.1);
}

.dark-mode .q-feedback p {
  color: #cbd5e1;
}

.dark-mode .q-suggestion {
  background: rgba(16, 185, 129, 0.1);
}

.dark-mode .q-suggestion p {
  color: #a7f3d0;
}

.dark-mode .notice-box {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.4);
}

.dark-mode .notice-box p {
  color: #fde68a;
}

.dark-mode .score-num {
  color: #f1f5f9;
}
</style>
