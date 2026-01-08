<template>
  <!-- 📦 Mode B: Batch Assessment Report - แสดง Batch Analysis -->
  <div class="mode-b-report">
    <!-- Mode Header with distinctive branding -->
    <div class="mode-header batch">
      <div class="mode-icon-wrapper">
        <span class="mode-main-icon">📦</span>
        <span class="mode-sub-icon">×{{ batchCount }} batches</span>
      </div>
      <div class="mode-info">
        <h3 class="mode-title">โหมด B: Batch Assessment</h3>
        <p class="mode-subtitle">แบ่งกลุ่มละ {{ questionsPerBatch }} ข้อ + Summary Agent</p>
        <div class="mode-benefits">
          <span class="benefit-tag">📊 สมดุลความแม่นยำ</span>
          <span class="benefit-tag">💰 ต้นทุนปานกลาง</span>
          <span class="benefit-tag">📈 วิเคราะห์กลุ่ม</span>
        </div>
      </div>
    </div>

    <!-- Batch Overview Panel -->
    <div class="batch-overview-panel">
      <h4>📦 ภาพรวมการประเมินแบบ Batch</h4>
      <div class="batch-flow">
        <div class="batch-step questions">
          <div class="step-icon">📝</div>
          <div class="step-info">
            <span class="step-number">{{ totalQuestions }}</span>
            <span class="step-label">คำถามทั้งหมด</span>
          </div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="batch-step batches">
          <div class="step-icon">📦</div>
          <div class="step-info">
            <span class="step-number">{{ batchCount }}</span>
            <span class="step-label">Batch</span>
          </div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="batch-step summary">
          <div class="step-icon">🤖</div>
          <div class="step-info">
            <span class="step-number">1</span>
            <span class="step-label">Summary Agent</span>
          </div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="batch-step result">
          <div class="step-icon">✅</div>
          <div class="step-info">
            <span class="step-number">{{ percentage }}%</span>
            <span class="step-label">คะแนนรวม</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Batch Results Grid -->
    <div class="batch-results-section">
      <h4>📊 ผลการประเมินแยกตาม Batch</h4>
      <div class="batch-cards-grid">
        <div v-for="(batch, idx) in batchResults" :key="idx" 
             class="batch-card" :class="getBatchClass(batch)">
          <div class="batch-card-header">
            <span class="batch-number">Batch {{ idx + 1 }}</span>
            <span class="batch-score" :class="getBatchScoreClass(batch)">
              {{ batch.batchSummary?.totalScore || batch.totalScore || 0 }}/{{ batch.batchSummary?.maxScore || batch.maxScore || 25 }}
            </span>
          </div>
          <div class="batch-card-body">
            <div class="batch-stat">
              <span class="stat-label">คำถาม</span>
              <span class="stat-value">{{ batch.questionResults?.length || questionsPerBatch }}</span>
            </div>
            <div class="batch-stat">
              <span class="stat-label">ผ่าน</span>
              <span class="stat-value passed">{{ batch.batchSummary?.passedCount || countPassed(batch) }}</span>
            </div>
            <div class="batch-stat">
              <span class="stat-label">เฉลี่ย</span>
              <span class="stat-value">{{ calculateBatchAvg(batch) }}%</span>
            </div>
          </div>
          <div class="batch-progress-bar">
            <div class="batch-progress-fill" :style="{ width: calculateBatchPercent(batch) + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Score Summary with Batch Comparison -->
    <div class="batch-score-summary">
      <div class="summary-main">
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
        <div class="summary-details">
          <div class="detail-row">
            <span class="detail-label">คะแนนรวม</span>
            <span class="detail-value">{{ effectiveSummary?.totalScore || 0 }} / {{ effectiveSummary?.maxScore || 0 }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">ระดับ PA</span>
            <span class="detail-value pa-badge" :class="'pa' + (effectiveSummary?.paLevel || 1)">
              {{ effectiveSummary?.paLevelText || 'ระดับ 1' }}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Batch เฉลี่ย</span>
            <span class="detail-value">{{ averageBatchScore.toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Batch Performance Chart -->
    <div class="batch-performance-chart">
      <h4>📈 Performance ของแต่ละ Batch</h4>
      <div class="chart-container">
        <div v-for="(batch, idx) in batchResults" :key="idx" class="chart-bar-wrapper">
          <div class="chart-bar" :style="{ height: calculateBatchPercent(batch) + '%' }" 
               :class="getBatchScoreClass(batch)">
            <span class="bar-value">{{ calculateBatchPercent(batch).toFixed(0) }}%</span>
          </div>
          <span class="bar-label">B{{ idx + 1 }}</span>
        </div>
      </div>
      <div class="chart-legend">
        <span class="legend-item excellent">≥80% ดีมาก</span>
        <span class="legend-item good">≥60% ดี</span>
        <span class="legend-item fair">≥40% พอใช้</span>
        <span class="legend-item poor"><40% ต้องปรับปรุง</span>
      </div>
    </div>

    <!-- ARCE Scores with Batch Context -->
    <div class="arce-batch-section">
      <h4>🎯 คะแนน A.R.C.E. (รวมจากทุก Batch)</h4>
      <div class="arce-grid">
        <div v-for="key in arceOrder" :key="key" class="arce-card" :class="key">
          <div class="arce-header">
            <span class="arce-emoji">{{ getArceEmoji(key) }}</span>
            <span class="arce-name">{{ getArceName(key) }}</span>
          </div>
          <div class="arce-score-ring">
            <span class="arce-value">{{ getArceScore(key) }}</span>
            <span class="arce-max">/5</span>
          </div>
          <p class="arce-feedback" v-if="getArceFeedback(key)">{{ getArceFeedback(key) }}</p>
        </div>
      </div>
    </div>

    <!-- Summary Agent Feedback -->
    <div class="summary-agent-section">
      <div class="agent-header">
        <span class="agent-icon">🤖</span>
        <h4>Summary Agent: ผลการรวมข้อมูลจากทุก Batch</h4>
      </div>
      <div class="agent-content">
        <div class="feedback-block">
          <h5>📝 สรุปภาพรวม</h5>
          <p>{{ effectiveSummary?.overallFeedback || 'ไม่มีข้อมูล' }}</p>
        </div>
        <div class="feedback-block recommendation" v-if="effectiveSummary?.recommendation">
          <h5>💡 ข้อเสนอแนะ</h5>
          <p>{{ effectiveSummary.recommendation }}</p>
        </div>
      </div>
    </div>

    <!-- Strengths & Weaknesses from Batch Analysis -->
    <div class="sw-batch-grid">
      <div class="sw-card strengths">
        <h5>✅ จุดเด่นจากการวิเคราะห์</h5>
        <ul v-if="assessment?.strengths?.length">
          <li v-for="(s, i) in assessment.strengths" :key="i">{{ s }}</li>
        </ul>
        <p v-else class="no-data">ไม่มีข้อมูล</p>
      </div>
      <div class="sw-card weaknesses">
        <h5>📈 จุดที่ควรพัฒนา</h5>
        <ul v-if="assessment?.weaknesses?.length">
          <li v-for="(w, i) in assessment.weaknesses" :key="i">{{ w }}</li>
        </ul>
        <p v-else class="no-data">ไม่มีข้อมูล</p>
      </div>
    </div>

    <!-- Mode B Advantages -->
    <div class="mode-advantages">
      <h5>🎯 ข้อดีของโหมด Batch Assessment</h5>
      <div class="advantages-grid">
        <div class="advantage-item">
          <span class="adv-icon">📊</span>
          <span class="adv-text">วิเคราะห์เชิงลึกแต่ละกลุ่มคำถาม</span>
        </div>
        <div class="advantage-item">
          <span class="adv-icon">⚖️</span>
          <span class="adv-text">สมดุลระหว่างความแม่นยำและต้นทุน</span>
        </div>
        <div class="advantage-item">
          <span class="adv-icon">🔍</span>
          <span class="adv-text">เห็นจุดอ่อนเฉพาะส่วนของใบงาน</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  assessment: { type: Object, default: () => ({}) },
  summary: { type: Object, default: () => ({}) },
  batchDetails: { type: Object, default: () => ({}) }
})

const arceOrder = ['analysis', 'reasoning', 'creativity', 'evidence']

// Support both direct summary and nested assessment.summary
const effectiveSummary = computed(() => {
  return props.summary || props.assessment?.summary || {}
})

const batchCount = computed(() => props.batchDetails?.batchCount || 1)
const questionsPerBatch = computed(() => props.batchDetails?.questionsPerBatch || 5)
const totalQuestions = computed(() => props.assessment?.questionResults?.length || 0)
const batchResults = computed(() => {
  // Build batch results from question results
  const results = props.assessment?.questionResults || []
  const batches = []
  const batchSize = questionsPerBatch.value
  
  for (let i = 0; i < results.length; i += batchSize) {
    const batchQuestions = results.slice(i, i + batchSize)
    const totalScore = batchQuestions.reduce((sum, q) => sum + (q.score || q.totalScore || 0), 0)
    const maxScore = batchQuestions.reduce((sum, q) => sum + (q.maxScore || 5), 0)
    const passedCount = batchQuestions.filter(q => q.passed).length
    
    batches.push({
      questionResults: batchQuestions,
      batchSummary: {
        totalScore,
        maxScore,
        passedCount
      }
    })
  }
  
  return batches
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

const averageBatchScore = computed(() => {
  const batches = batchResults.value
  if (!batches.length) return 0
  const total = batches.reduce((sum, b) => {
    const score = (b.batchSummary?.totalScore || 0) / (b.batchSummary?.maxScore || 1) * 100
    return sum + score
  }, 0)
  return total / batches.length
})

function getBatchClass(batch) {
  const pct = calculateBatchPercent(batch)
  if (pct >= 80) return 'excellent'
  if (pct >= 60) return 'good'
  if (pct >= 40) return 'fair'
  return 'poor'
}

function getBatchScoreClass(batch) {
  return getBatchClass(batch)
}

function calculateBatchPercent(batch) {
  const total = batch.batchSummary?.totalScore || batch.totalScore || 0
  const max = batch.batchSummary?.maxScore || batch.maxScore || 25
  return max > 0 ? (total / max) * 100 : 0
}

function calculateBatchAvg(batch) {
  return calculateBatchPercent(batch).toFixed(0)
}

function countPassed(batch) {
  return batch.questionResults?.filter(q => q.passed).length || 0
}

function getArceEmoji(key) {
  const emojis = { analysis: '🔍', reasoning: '🧠', creativity: '💡', evidence: '📚' }
  return emojis[key] || ''
}

function getArceName(key) {
  const names = { analysis: 'การวิเคราะห์', reasoning: 'การให้เหตุผล', creativity: 'ความคิดสร้างสรรค์', evidence: 'การใช้หลักฐาน' }
  return names[key] || key
}

function getArceScore(key) {
  const score = props.assessment?.arceScores?.[key]
  return typeof score === 'object' ? (score.raw || 0) : (score || 0)
}

function getArceFeedback(key) {
  const score = props.assessment?.arceScores?.[key]
  return typeof score === 'object' ? score.feedback : ''
}
</script>

<style scoped>
.mode-b-report {
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 50%, #ffffff 100%);
  border-radius: 20px;
  padding: 1.5rem;
  border: 2px solid #3b82f6;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.15);
}

.mode-header.batch {
  display: flex;
  gap: 1.25rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(96, 165, 250, 0.1));
  border-radius: 16px;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.mode-icon-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.mode-main-icon {
  font-size: 2.5rem;
}

.mode-sub-icon {
  position: absolute;
  bottom: -8px;
  right: -12px;
  font-size: 0.65rem;
  background: white;
  padding: 0.25rem 0.5rem;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  white-space: nowrap;
}

.mode-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e40af;
}

.mode-subtitle {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.875rem;
  color: #3b82f6;
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
  color: #1e40af;
}

/* Batch Overview Panel */
.batch-overview-panel {
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.batch-overview-panel h4 {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: #374151;
}

.batch-flow {
  display: flex;
  align-items: center;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.batch-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: 12px;
  min-width: 80px;
}

.batch-step.questions { background: rgba(59, 130, 246, 0.1); }
.batch-step.batches { background: rgba(139, 92, 246, 0.1); }
.batch-step.summary { background: rgba(245, 158, 11, 0.1); }
.batch-step.result { background: rgba(16, 185, 129, 0.1); }

.step-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.step-number {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
}

.step-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.flow-arrow {
  font-size: 1.5rem;
  color: #9ca3af;
}

/* Batch Results Grid */
.batch-results-section {
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.batch-results-section h4 {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: #374151;
}

.batch-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.batch-card {
  border-radius: 12px;
  padding: 1rem;
  border: 2px solid;
}

.batch-card.excellent { border-color: #10b981; background: rgba(16, 185, 129, 0.05); }
.batch-card.good { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }
.batch-card.fair { border-color: #f59e0b; background: rgba(245, 158, 11, 0.05); }
.batch-card.poor { border-color: #ef4444; background: rgba(239, 68, 68, 0.05); }

.batch-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.batch-number {
  font-weight: 600;
  font-size: 0.9rem;
}

.batch-score {
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
}

.batch-score.excellent { background: rgba(16, 185, 129, 0.2); color: #065f46; }
.batch-score.good { background: rgba(59, 130, 246, 0.2); color: #1e40af; }
.batch-score.fair { background: rgba(245, 158, 11, 0.2); color: #92400e; }
.batch-score.poor { background: rgba(239, 68, 68, 0.2); color: #991b1b; }

.batch-card-body {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.batch-stat {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.65rem;
  color: #9ca3af;
}

.stat-value {
  font-size: 0.9rem;
  font-weight: 600;
}

.stat-value.passed {
  color: #10b981;
}

.batch-progress-bar {
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.batch-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  transition: width 0.3s ease;
}

/* Score Summary */
.batch-score-summary {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.summary-main {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.score-ring {
  position: relative;
  width: 100px;
  height: 100px;
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
  font-size: 1.5rem;
  font-weight: 800;
  color: #1f2937;
}

.score-center .score-unit {
  font-size: 0.75rem;
  color: #6b7280;
}

.summary-details {
  flex: 1;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.detail-value {
  font-weight: 600;
  color: #1f2937;
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

/* Performance Chart */
.batch-performance-chart {
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.batch-performance-chart h4 {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: #374151;
}

.chart-container {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 150px;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 2px solid #e5e7eb;
}

.chart-bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.chart-bar {
  width: 40px;
  min-height: 20px;
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 0.25rem;
  transition: height 0.5s ease;
}

.chart-bar.excellent { background: linear-gradient(180deg, #10b981, #34d399); }
.chart-bar.good { background: linear-gradient(180deg, #3b82f6, #60a5fa); }
.chart-bar.fair { background: linear-gradient(180deg, #f59e0b, #fbbf24); }
.chart-bar.poor { background: linear-gradient(180deg, #ef4444, #f87171); }

.bar-value {
  font-size: 0.65rem;
  font-weight: 600;
  color: white;
}

.bar-label {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.legend-item {
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.legend-item.excellent { background: rgba(16, 185, 129, 0.1); color: #065f46; }
.legend-item.good { background: rgba(59, 130, 246, 0.1); color: #1e40af; }
.legend-item.fair { background: rgba(245, 158, 11, 0.1); color: #92400e; }
.legend-item.poor { background: rgba(239, 68, 68, 0.1); color: #991b1b; }

/* ARCE Section */
.arce-batch-section {
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.arce-batch-section h4 {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: #374151;
}

.arce-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.arce-card {
  padding: 1rem;
  border-radius: 12px;
  border-left: 4px solid;
}

.arce-card.analysis { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }
.arce-card.reasoning { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.05); }
.arce-card.creativity { border-color: #f59e0b; background: rgba(245, 158, 11, 0.05); }
.arce-card.evidence { border-color: #10b981; background: rgba(16, 185, 129, 0.05); }

.arce-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.arce-emoji {
  font-size: 1.25rem;
}

.arce-name {
  font-weight: 600;
  font-size: 0.85rem;
}

.arce-score-ring {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.arce-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.arce-max {
  font-size: 0.875rem;
  color: #9ca3af;
}

.arce-feedback {
  font-size: 0.8rem;
  color: #6b7280;
  line-height: 1.5;
  margin: 0;
}

/* Summary Agent Section */
.summary-agent-section {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.05));
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.agent-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.agent-icon {
  font-size: 1.5rem;
}

.agent-header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: #1e40af;
}

.agent-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.feedback-block {
  background: white;
  padding: 1rem;
  border-radius: 10px;
}

.feedback-block h5 {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: #374151;
}

.feedback-block p {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.6;
}

.feedback-block.recommendation {
  border-left: 3px solid #f59e0b;
}

/* Strengths & Weaknesses */
.sw-batch-grid {
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

.sw-card.strengths { border-left: 4px solid #10b981; }
.sw-card.weaknesses { border-left: 4px solid #f59e0b; }

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

/* Mode Advantages */
.mode-advantages {
  background: rgba(59, 130, 246, 0.1);
  border-radius: 12px;
  padding: 1rem;
}

.mode-advantages h5 {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  color: #1e40af;
}

.advantages-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.advantage-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: white;
  border-radius: 8px;
}

.adv-icon {
  font-size: 1.25rem;
}

.adv-text {
  font-size: 0.75rem;
  color: #374151;
}

/* Responsive */
@media (max-width: 768px) {
  .batch-flow {
    flex-direction: column;
  }
  
  .flow-arrow {
    transform: rotate(90deg);
  }
  
  .summary-main {
    flex-direction: column;
  }
  
  .arce-grid,
  .sw-batch-grid {
    grid-template-columns: 1fr;
  }
  
  .advantages-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-container {
    overflow-x: auto;
  }
}

/* Dark Mode */
.dark-mode .mode-b-report {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(30, 41, 59, 0.95) 50%, #1e293b 100%);
  border-color: rgba(59, 130, 246, 0.4);
}

.dark-mode .batch-overview-panel,
.dark-mode .batch-results-section,
.dark-mode .batch-score-summary,
.dark-mode .batch-performance-chart,
.dark-mode .arce-batch-section,
.dark-mode .sw-card,
.dark-mode .feedback-block,
.dark-mode .advantage-item {
  background: rgba(30, 41, 59, 0.8);
}

.dark-mode .mode-title,
.dark-mode .step-number,
.dark-mode h4,
.dark-mode h5,
.dark-mode .arce-name,
.dark-mode .arce-value {
  color: #f1f5f9;
}

.dark-mode .mode-subtitle,
.dark-mode .step-label,
.dark-mode .detail-label,
.dark-mode .arce-feedback,
.dark-mode .sw-card li,
.dark-mode .feedback-block p,
.dark-mode .adv-text {
  color: #94a3b8;
}
</style>
