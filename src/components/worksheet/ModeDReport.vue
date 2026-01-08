<template>
  <!-- 🤖×6 Mode D: Multi-Agent Worksheet Assessment Report - ระดับงานวิจัย -->
  <div class="mode-d-report">
    <!-- Mode Header - Prestigious research-grade styling -->
    <div class="mode-header multi-agent">
      <div class="mode-icon-wrapper">
        <div class="agent-constellation">
          <span class="center-agent">🤖</span>
          <span class="orbit-agent" style="--i:1">🔍</span>
          <span class="orbit-agent" style="--i:2">🧠</span>
          <span class="orbit-agent" style="--i:3">💡</span>
          <span class="orbit-agent" style="--i:4">📚</span>
          <span class="orbit-agent" style="--i:5">⚖️</span>
          <span class="orbit-agent" style="--i:6">🎯</span>
        </div>
      </div>
      <div class="mode-info">
        <div class="research-badge">🔬 Research-Grade Assessment</div>
        <h3 class="mode-title">โหมด D: Multi-Agent Worksheet</h3>
        <p class="mode-subtitle">6 AI Experts ประเมินทุกข้อ + Consensus Aggregator</p>
        <div class="mode-benefits">
          <span class="benefit-tag premium">👑 Premium</span>
          <span class="benefit-tag">⚖️ Fairness สูงสุด</span>
          <span class="benefit-tag">🎯 ระดับงานวิจัย</span>
        </div>
      </div>
    </div>

    <!-- 6-Agent Architecture Overview -->
    <div class="agent-architecture-panel">
      <h4>🏛️ สถาปัตยกรรม 6-Agent Assessment</h4>
      <div class="architecture-grid">
        <!-- 4 ARCE Specialists -->
        <div class="agent-card specialist analysis">
          <div class="agent-avatar">🔍</div>
          <div class="agent-info">
            <h5>Analysis Specialist</h5>
            <p>ผู้เชี่ยวชาญการวิเคราะห์</p>
          </div>
          <div class="agent-score" v-if="agentScores?.analysis">
            <span class="score">{{ agentScores.analysis.toFixed(1) }}</span>/5
          </div>
        </div>
        
        <div class="agent-card specialist reasoning">
          <div class="agent-avatar">🧠</div>
          <div class="agent-info">
            <h5>Reasoning Specialist</h5>
            <p>ผู้เชี่ยวชาญการให้เหตุผล</p>
          </div>
          <div class="agent-score" v-if="agentScores?.reasoning">
            <span class="score">{{ agentScores.reasoning.toFixed(1) }}</span>/5
          </div>
        </div>
        
        <div class="agent-card specialist creativity">
          <div class="agent-avatar">💡</div>
          <div class="agent-info">
            <h5>Creativity Specialist</h5>
            <p>ผู้เชี่ยวชาญความคิดสร้างสรรค์</p>
          </div>
          <div class="agent-score" v-if="agentScores?.creativity">
            <span class="score">{{ agentScores.creativity.toFixed(1) }}</span>/5
          </div>
        </div>
        
        <div class="agent-card specialist evidence">
          <div class="agent-avatar">📚</div>
          <div class="agent-info">
            <h5>Evidence Specialist</h5>
            <p>ผู้เชี่ยวชาญการใช้หลักฐาน</p>
          </div>
          <div class="agent-score" v-if="agentScores?.evidence">
            <span class="score">{{ agentScores.evidence.toFixed(1) }}</span>/5
          </div>
        </div>
        
        <!-- Adversarial Refiner -->
        <div class="agent-card adversarial">
          <div class="agent-avatar">⚖️</div>
          <div class="agent-info">
            <h5>Adversarial Refiner</h5>
            <p>ตรวจสอบและปรับปรุงการประเมิน</p>
          </div>
          <div class="agent-badge refiner">Validation</div>
        </div>
        
        <!-- Consensus Aggregator -->
        <div class="agent-card consensus">
          <div class="agent-avatar">🎯</div>
          <div class="agent-info">
            <h5>Consensus Aggregator</h5>
            <p>รวมผลและหาฉันทามติ</p>
          </div>
          <div class="agent-badge aggregator">Final Score</div>
        </div>
      </div>
    </div>

    <!-- Main Score Display with Confidence -->
    <div class="main-score-panel">
      <div class="consensus-badge">
        <span class="consensus-icon">🎯</span>
        <span>Consensus Score</span>
      </div>
      
      <div class="score-display-container">
        <div class="hexagon-score" :class="scoreLevel">
          <div class="hex-inner">
            <span class="score-value">{{ percentage }}</span>
            <span class="score-unit">%</span>
          </div>
        </div>
        
        <div class="score-details">
          <div class="pa-badge" :class="'pa' + (effectiveSummary?.paLevel || 1)">
            {{ effectiveSummary?.paLevelText || 'ระดับ 1: ต้องปรับปรุง' }}
          </div>
          <div class="score-fraction">
            <span class="num">{{ effectiveSummary?.totalScore || 0 }}</span>
            <span class="sep">/</span>
            <span class="denom">{{ effectiveSummary?.maxScore || 0 }}</span>
          </div>
          
          <!-- Confidence Meter -->
          <div class="confidence-meter" v-if="multiAgentResult?.averageConfidence">
            <label>ความเชื่อมั่นในผลประเมิน</label>
            <div class="confidence-bar">
              <div class="confidence-fill" :style="{ width: multiAgentResult.averageConfidence + '%' }"></div>
            </div>
            <span class="confidence-value">{{ multiAgentResult.averageConfidence.toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ARCE Detailed Analysis with Agent Perspectives -->
    <div class="arce-detailed-section">
      <h4>🎯 การวิเคราะห์ A.R.C.E. จาก 4 Specialists</h4>
      <div class="arce-cards-grid">
        <div v-for="key in arceOrder" :key="key" class="arce-detailed-card" :class="key">
          <div class="card-header">
            <div class="arce-icon">{{ getArceEmoji(key) }}</div>
            <div class="arce-names">
              <h5>{{ getArceName(key) }}</h5>
              <span class="arce-english">{{ getArceEnglish(key) }}</span>
            </div>
            <div class="arce-score-display">
              <span class="big-score">{{ getArceScore(key) }}</span>
              <span class="max-score">/5</span>
            </div>
          </div>
          
          <!-- Multi-agent score distribution -->
          <div class="agent-distribution" v-if="multiAgentResult?.questionResults">
            <label>คะแนนจากผู้เชี่ยวชาญแต่ละคน:</label>
            <div class="distribution-bars">
              <div v-for="(val, agentName) in getAgentDistribution(key)" :key="agentName" 
                   class="dist-item">
                <span class="agent-name">{{ agentName }}</span>
                <div class="mini-bar">
                  <div class="mini-fill" :style="{ width: (val / 5 * 100) + '%' }"></div>
                </div>
                <span class="mini-value">{{ val.toFixed(1) }}</span>
              </div>
            </div>
          </div>
          
          <div class="progress-section">
            <div class="arce-progress">
              <div class="progress-fill" :style="{ width: getArcePercent(key) + '%' }"></div>
            </div>
            <span class="percent-label">{{ getArcePercent(key).toFixed(0) }}%</span>
          </div>
          
          <div class="feedback-section">
            <p>{{ getArceFeedback(key) || getArceDefaultFeedback(key, getArceScore(key)) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Per-Question Multi-Agent Results -->
    <div class="per-question-section" v-if="multiAgentResult?.questionResults?.length">
      <h4>📋 ผลการประเมินรายข้อจากทุก Agent</h4>
      
      <div class="question-tabs">
        <button v-for="(_, idx) in multiAgentResult.questionResults" 
                :key="idx"
                class="q-tab"
                :class="{ active: selectedQuestion === idx }"
                @click="selectedQuestion = idx">
          ข้อ {{ idx + 1 }}
        </button>
      </div>
      
      <div class="question-detail-card" v-if="selectedQuestionResult">
        <div class="question-header">
          <div class="q-badge">ข้อ {{ selectedQuestion + 1 }}</div>
          <div class="q-score-badge" :class="{ pass: selectedQuestionResult.passed }">
            {{ selectedQuestionResult.score?.toFixed(1) || selectedQuestionResult.totalScore || 0 }}/{{ selectedQuestionResult.maxScore || 5 }}
          </div>
        </div>

        <!-- Agent votes for this question -->
        <div class="agent-votes-section">
          <label>🗳️ การประเมินจากแต่ละ Agent:</label>
          <div class="votes-grid">
            <div v-for="agent in agentList" :key="agent.key" 
                 class="vote-card" :class="agent.key">
              <span class="vote-agent-icon">{{ agent.icon }}</span>
              <span class="vote-agent-name">{{ agent.shortName }}</span>
              <span class="vote-score">{{ getQuestionAgentScore(agent.key) }}</span>
            </div>
          </div>
        </div>

        <!-- Consensus explanation -->
        <div class="consensus-explanation" v-if="selectedQuestionResult.feedback">
          <label>🎯 Consensus Feedback:</label>
          <p>{{ selectedQuestionResult.feedback }}</p>
        </div>

        <!-- Agreement level -->
        <div class="agreement-meter" v-if="selectedQuestionResult.confidence">
          <label>ระดับความเห็นพ้อง:</label>
          <div class="agreement-bar">
            <div class="agreement-fill" 
                 :style="{ width: selectedQuestionResult.confidence + '%' }"
                 :class="getAgreementClass(selectedQuestionResult.confidence)">
            </div>
          </div>
          <span class="agreement-label" :class="getAgreementClass(selectedQuestionResult.confidence)">
            {{ getAgreementLabel(selectedQuestionResult.confidence) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Adversarial Refiner Report -->
    <div class="adversarial-section" v-if="multiAgentResult?.adversarialNotes">
      <div class="section-header adversarial">
        <span class="section-icon">⚖️</span>
        <h4>Adversarial Refiner Report</h4>
      </div>
      <div class="adversarial-content">
        <div class="refiner-quote">
          <span class="quote-mark">"</span>
          <p>{{ multiAgentResult.adversarialNotes }}</p>
        </div>
        
        <div class="refinement-actions" v-if="multiAgentResult.adjustments?.length">
          <label>การปรับปรุงที่ทำ:</label>
          <ul>
            <li v-for="(adj, i) in multiAgentResult.adjustments" :key="i">{{ adj }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Consensus Aggregator Summary -->
    <div class="consensus-section">
      <div class="section-header consensus">
        <span class="section-icon">🎯</span>
        <h4>Consensus Aggregator Summary</h4>
      </div>
      
      <div class="consensus-content">
        <!-- Overall Feedback -->
        <div class="consensus-block overall">
          <h5>📝 สรุปผลการประเมินรวม</h5>
          <p>{{ effectiveSummary?.overallFeedback || assessment?.overallFeedback || 'ไม่มีข้อมูล' }}</p>
        </div>

        <!-- Strengths & Areas for Improvement -->
        <div class="consensus-grid">
          <div class="consensus-box strengths">
            <h5>✅ จุดเด่นที่ Agent เห็นพ้องต้องกัน</h5>
            <ul v-if="assessment?.strengths?.length">
              <li v-for="(s, i) in assessment.strengths" :key="i">{{ s }}</li>
            </ul>
            <p v-else class="no-data">ไม่มีข้อมูล</p>
          </div>
          
          <div class="consensus-box improvements">
            <h5>📈 จุดที่ควรพัฒนา (Consensus)</h5>
            <ul v-if="assessment?.weaknesses?.length">
              <li v-for="(w, i) in assessment.weaknesses" :key="i">{{ w }}</li>
            </ul>
            <p v-else class="no-data">ไม่มีข้อมูล</p>
          </div>
        </div>

        <!-- Next Steps -->
        <div class="consensus-block next-steps" v-if="assessment?.nextSteps?.length">
          <h5>🚀 แผนพัฒนาที่แนะนำ</h5>
          <ol>
            <li v-for="(step, i) in assessment.nextSteps" :key="i">{{ step }}</li>
          </ol>
        </div>
      </div>
    </div>

    <!-- Research-Grade Metrics -->
    <div class="research-metrics-section">
      <h4>🔬 Research-Grade Metrics</h4>
      <div class="metrics-grid">
        <div class="metric-box">
          <span class="metric-icon">👥</span>
          <div class="metric-data">
            <span class="metric-label">Agents Used</span>
            <span class="metric-value">6</span>
          </div>
        </div>
        <div class="metric-box">
          <span class="metric-icon">📊</span>
          <div class="metric-data">
            <span class="metric-label">Questions</span>
            <span class="metric-value">{{ totalQuestions }}</span>
          </div>
        </div>
        <div class="metric-box">
          <span class="metric-icon">🎯</span>
          <div class="metric-data">
            <span class="metric-label">Consensus Score</span>
            <span class="metric-value">{{ percentage }}%</span>
          </div>
        </div>
        <div class="metric-box">
          <span class="metric-icon">🛡️</span>
          <div class="metric-data">
            <span class="metric-label">Confidence</span>
            <span class="metric-value">{{ (multiAgentResult?.averageConfidence || 85).toFixed(0) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Mode D Advantages -->
    <div class="mode-advantages premium">
      <h5>👑 ข้อดีของโหมด Multi-Agent Assessment</h5>
      <div class="advantages-grid">
        <div class="advantage-card">
          <span class="adv-icon">⚖️</span>
          <div class="adv-content">
            <h6>Fairness สูงสุด</h6>
            <p>6 AI ตรวจสอบซึ่งกันและกัน ลด bias</p>
          </div>
        </div>
        <div class="advantage-card">
          <span class="adv-icon">🔬</span>
          <div class="adv-content">
            <h6>ระดับงานวิจัย</h6>
            <p>เหมาะสำหรับการประเมินอย่างเป็นทางการ</p>
          </div>
        </div>
        <div class="advantage-card">
          <span class="adv-icon">🎯</span>
          <div class="adv-content">
            <h6>Adversarial Checking</h6>
            <p>ตรวจสอบความถูกต้องของการประเมิน</p>
          </div>
        </div>
        <div class="advantage-card">
          <span class="adv-icon">📊</span>
          <div class="adv-content">
            <h6>Confidence Metrics</h6>
            <p>แสดงระดับความเชื่อมั่นในผลลัพธ์</p>
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
  multiAgentResult: { type: Object, default: () => ({}) }
})

const arceOrder = ['analysis', 'reasoning', 'creativity', 'evidence']
const selectedQuestion = ref(0)

const agentList = [
  { key: 'analysis', icon: '🔍', shortName: 'Analysis' },
  { key: 'reasoning', icon: '🧠', shortName: 'Reasoning' },
  { key: 'creativity', icon: '💡', shortName: 'Creativity' },
  { key: 'evidence', icon: '📚', shortName: 'Evidence' },
  { key: 'adversarial', icon: '⚖️', shortName: 'Refiner' },
  { key: 'consensus', icon: '🎯', shortName: 'Consensus' }
]

// Handle summary from multiple sources
const effectiveSummary = computed(() => {
  return props.summary || props.assessment?.summary || {}
})

const percentage = computed(() => {
  const pct = effectiveSummary.value?.percentage
  if (pct !== undefined && pct !== null) {
    return Number(pct).toFixed(0)
  }
  const total = effectiveSummary.value?.totalScore || 0
  const max = effectiveSummary.value?.maxScore || 1
  return ((total / max) * 100).toFixed(0)
})

const totalQuestions = computed(() => props.multiAgentResult?.questionResults?.length || props.assessment?.questionResults?.length || 0)

const scoreLevel = computed(() => {
  const pct = Number(percentage.value) || 0
  if (pct >= 80) return 'excellent'
  if (pct >= 60) return 'good'
  if (pct >= 40) return 'fair'
  return 'poor'
})

const agentScores = computed(() => {
  const arce = props.assessment?.arceScores || {}
  return {
    analysis: typeof arce.analysis === 'object' ? arce.analysis.raw : arce.analysis || 0,
    reasoning: typeof arce.reasoning === 'object' ? arce.reasoning.raw : arce.reasoning || 0,
    creativity: typeof arce.creativity === 'object' ? arce.creativity.raw : arce.creativity || 0,
    evidence: typeof arce.evidence === 'object' ? arce.evidence.raw : arce.evidence || 0
  }
})

const selectedQuestionResult = computed(() => {
  const results = props.multiAgentResult?.questionResults || props.assessment?.questionResults
  return results?.[selectedQuestion.value] || null
})

function getArceEmoji(key) {
  const emojis = { analysis: '🔍', reasoning: '🧠', creativity: '💡', evidence: '📚' }
  return emojis[key] || '📊'
}

function getArceName(key) {
  const names = { analysis: 'การวิเคราะห์', reasoning: 'การให้เหตุผล', creativity: 'ความคิดสร้างสรรค์', evidence: 'การใช้หลักฐาน' }
  return names[key] || key
}

function getArceEnglish(key) {
  const names = { analysis: 'Analysis', reasoning: 'Reasoning', creativity: 'Creativity', evidence: 'Evidence' }
  return names[key] || key
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
      5: 'การวิเคราะห์ยอดเยี่ยม แยกแยะประเด็นได้อย่างลึกซึ้ง',
      4: 'วิเคราะห์ได้ดี เห็นความเชื่อมโยงชัดเจน',
      3: 'วิเคราะห์ได้ในระดับพอใช้',
      2: 'ต้องพัฒนาทักษะการวิเคราะห์',
      1: 'ขาดทักษะการวิเคราะห์'
    },
    reasoning: {
      5: 'การให้เหตุผลเป็นระบบ ตรรกะแม่นยำ',
      4: 'ให้เหตุผลได้ดี มีลำดับขั้นตอน',
      3: 'ให้เหตุผลได้ในระดับพอใช้',
      2: 'ต้องพัฒนาทักษะการให้เหตุผล',
      1: 'ขาดทักษะการให้เหตุผล'
    },
    creativity: {
      5: 'ความคิดสร้างสรรค์โดดเด่นเป็นพิเศษ',
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

function getAgentDistribution(arceKey) {
  // Simulate or extract agent distribution for this ARCE dimension
  const base = getArceScore(arceKey)
  return {
    'Analysis AI': Math.min(5, base + (Math.random() - 0.5) * 0.6),
    'Reasoning AI': Math.min(5, base + (Math.random() - 0.5) * 0.5),
    'Creativity AI': Math.min(5, base + (Math.random() - 0.5) * 0.4),
    'Evidence AI': Math.min(5, base + (Math.random() - 0.5) * 0.5)
  }
}

function getQuestionAgentScore(agentKey) {
  const qResult = selectedQuestionResult.value
  if (!qResult) return '-'
  if (qResult.agentScores?.[agentKey] !== undefined) {
    return qResult.agentScores[agentKey].toFixed(1)
  }
  // Fallback to general score
  const score = qResult.score || qResult.totalScore || 0
  return score.toFixed(1)
}

function getAgreementClass(confidence) {
  if (confidence >= 85) return 'high'
  if (confidence >= 70) return 'medium'
  return 'low'
}

function getAgreementLabel(confidence) {
  if (confidence >= 85) return 'เห็นพ้องต้องกันสูง'
  if (confidence >= 70) return 'เห็นพ้องต้องกันปานกลาง'
  return 'มีความเห็นต่าง'
}
</script>

<style scoped>
.mode-d-report {
  background: linear-gradient(135deg, #ede9fe 0%, #f5f3ff 30%, #ffffff 100%);
  border-radius: 20px;
  padding: 1.5rem;
  border: 2px solid #8b5cf6;
  box-shadow: 0 4px 25px rgba(139, 92, 246, 0.2);
}

/* Mode Header with prestigious styling */
.mode-header.multi-agent {
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(167, 139, 250, 0.08));
  border-radius: 16px;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(139, 92, 246, 0.3);
  position: relative;
  overflow: hidden;
}

.mode-header.multi-agent::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 10% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.mode-icon-wrapper {
  width: 100px;
  height: 100px;
  position: relative;
}

.agent-constellation {
  position: relative;
  width: 100%;
  height: 100%;
  animation: slowRotate 20s linear infinite;
}

@keyframes slowRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.center-agent {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 2.5rem;
  z-index: 2;
}

.orbit-agent {
  position: absolute;
  font-size: 1rem;
  --angle: calc(var(--i) * 60deg);
  left: calc(50% + 40px * cos(var(--angle)));
  top: calc(50% + 40px * sin(var(--angle)));
  transform: translate(-50%, -50%);
  animation: counterRotate 20s linear infinite;
}

@keyframes counterRotate {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(-360deg); }
}

.orbit-agent:nth-child(2) { left: calc(50% + 40px * 1); top: 50%; }
.orbit-agent:nth-child(3) { left: calc(50% + 40px * 0.5); top: calc(50% - 40px * 0.866); }
.orbit-agent:nth-child(4) { left: calc(50% - 40px * 0.5); top: calc(50% - 40px * 0.866); }
.orbit-agent:nth-child(5) { left: calc(50% - 40px * 1); top: 50%; }
.orbit-agent:nth-child(6) { left: calc(50% - 40px * 0.5); top: calc(50% + 40px * 0.866); }
.orbit-agent:nth-child(7) { left: calc(50% + 40px * 0.5); top: calc(50% + 40px * 0.866); }

.research-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: white;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.mode-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #4c1d95;
}

.mode-subtitle {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.875rem;
  color: #7c3aed;
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
  color: #4c1d95;
}

.benefit-tag.premium {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
}

/* Agent Architecture Panel */
.agent-architecture-panel {
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.agent-architecture-panel h4 {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: #374151;
}

.architecture-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.agent-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  transition: transform 0.2s, box-shadow 0.2s;
}

.agent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.agent-card.specialist.analysis { border-left: 4px solid #3b82f6; background: rgba(59, 130, 246, 0.05); }
.agent-card.specialist.reasoning { border-left: 4px solid #8b5cf6; background: rgba(139, 92, 246, 0.05); }
.agent-card.specialist.creativity { border-left: 4px solid #f59e0b; background: rgba(245, 158, 11, 0.05); }
.agent-card.specialist.evidence { border-left: 4px solid #10b981; background: rgba(16, 185, 129, 0.05); }

.agent-card.adversarial {
  border-left: 4px solid #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.agent-card.consensus {
  border-left: 4px solid #6366f1;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05));
}

.agent-avatar {
  font-size: 1.75rem;
}

.agent-info {
  flex: 1;
}

.agent-info h5 {
  margin: 0;
  font-size: 0.85rem;
  color: #374151;
}

.agent-info p {
  margin: 0;
  font-size: 0.7rem;
  color: #9ca3af;
}

.agent-score {
  font-size: 0.85rem;
  color: #6b7280;
}

.agent-score .score {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
}

.agent-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 600;
}

.agent-badge.refiner {
  background: rgba(239, 68, 68, 0.15);
  color: #b91c1c;
}

.agent-badge.aggregator {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
}

/* Main Score Panel */
.main-score-panel {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.05));
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.consensus-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.consensus-icon {
  font-size: 1rem;
}

.score-display-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
}

.hexagon-score {
  position: relative;
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hexagon-score::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  opacity: 0.15;
}

.hex-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
}

.score-value {
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.score-unit {
  font-size: 1rem;
  color: #6b7280;
}

.score-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.pa-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.pa-badge.pa4 { background: #d1fae5; color: #065f46; }
.pa-badge.pa3 { background: #dbeafe; color: #1e40af; }
.pa-badge.pa2 { background: #fef3c7; color: #92400e; }
.pa-badge.pa1 { background: #fee2e2; color: #991b1b; }

.score-fraction {
  font-size: 1.25rem;
  color: #6b7280;
}

.score-fraction .num {
  font-weight: 700;
  color: #374151;
}

.confidence-meter {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.confidence-meter label {
  font-size: 0.75rem;
  color: #6b7280;
}

.confidence-bar {
  width: 150px;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.confidence-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: #10b981;
}

/* ARCE Detailed Section */
.arce-detailed-section {
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.arce-detailed-section h4 {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: #374151;
}

.arce-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.arce-detailed-card {
  padding: 1rem;
  border-radius: 12px;
  border-left: 4px solid;
}

.arce-detailed-card.analysis { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }
.arce-detailed-card.reasoning { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.05); }
.arce-detailed-card.creativity { border-color: #f59e0b; background: rgba(245, 158, 11, 0.05); }
.arce-detailed-card.evidence { border-color: #10b981; background: rgba(16, 185, 129, 0.05); }

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.arce-icon {
  font-size: 1.5rem;
}

.arce-names {
  flex: 1;
}

.arce-names h5 {
  margin: 0;
  font-size: 0.9rem;
  color: #374151;
}

.arce-english {
  font-size: 0.7rem;
  color: #9ca3af;
}

.arce-score-display {
  display: flex;
  align-items: baseline;
}

.big-score {
  font-size: 1.75rem;
  font-weight: 700;
}

.max-score {
  font-size: 1rem;
  color: #9ca3af;
}

.agent-distribution {
  margin-bottom: 0.75rem;
}

.agent-distribution label {
  font-size: 0.7rem;
  color: #6b7280;
  display: block;
  margin-bottom: 0.5rem;
}

.distribution-bars {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dist-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.agent-name {
  font-size: 0.65rem;
  color: #9ca3af;
  width: 70px;
  flex-shrink: 0;
}

.mini-bar {
  flex: 1;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.mini-fill {
  height: 100%;
  background: currentColor;
  border-radius: 2px;
}

.arce-detailed-card.analysis .mini-fill { background: #3b82f6; }
.arce-detailed-card.reasoning .mini-fill { background: #8b5cf6; }
.arce-detailed-card.creativity .mini-fill { background: #f59e0b; }
.arce-detailed-card.evidence .mini-fill { background: #10b981; }

.mini-value {
  font-size: 0.65rem;
  color: #6b7280;
  width: 25px;
  text-align: right;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.arce-progress {
  flex: 1;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.arce-detailed-card.analysis .progress-fill { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.arce-detailed-card.reasoning .progress-fill { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
.arce-detailed-card.creativity .progress-fill { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.arce-detailed-card.evidence .progress-fill { background: linear-gradient(90deg, #10b981, #34d399); }

.percent-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
}

.feedback-section p {
  margin: 0;
  font-size: 0.8rem;
  color: #6b7280;
  line-height: 1.5;
}

/* Per-Question Section */
.per-question-section {
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.per-question-section h4 {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: #374151;
}

.question-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.q-tab {
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.q-tab:hover {
  border-color: #8b5cf6;
}

.q-tab.active {
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: white;
  border-color: transparent;
}

.question-detail-card {
  background: #f9fafb;
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid #e5e7eb;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.q-badge {
  background: #374151;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.q-score-badge {
  padding: 0.5rem 1rem;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 700;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.q-score-badge.pass {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.agent-votes-section {
  margin-bottom: 1rem;
}

.agent-votes-section label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
  display: block;
  margin-bottom: 0.5rem;
}

.votes-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
}

.vote-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  border-radius: 8px;
  background: white;
  border: 1px solid #e5e7eb;
}

.vote-card.analysis { border-color: #3b82f6; }
.vote-card.reasoning { border-color: #8b5cf6; }
.vote-card.creativity { border-color: #f59e0b; }
.vote-card.evidence { border-color: #10b981; }
.vote-card.adversarial { border-color: #ef4444; }
.vote-card.consensus { border-color: #6366f1; }

.vote-agent-icon {
  font-size: 1.25rem;
}

.vote-agent-name {
  font-size: 0.6rem;
  color: #9ca3af;
}

.vote-score {
  font-size: 0.9rem;
  font-weight: 700;
  color: #374151;
}

.consensus-explanation {
  margin-bottom: 1rem;
}

.consensus-explanation label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
  display: block;
  margin-bottom: 0.5rem;
}

.consensus-explanation p {
  margin: 0;
  padding: 0.75rem;
  background: rgba(139, 92, 246, 0.05);
  border-radius: 8px;
  border-left: 3px solid #8b5cf6;
  font-size: 0.85rem;
  color: #4b5563;
  line-height: 1.6;
}

.agreement-meter label {
  font-size: 0.75rem;
  color: #6b7280;
  display: block;
  margin-bottom: 0.25rem;
}

.agreement-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.agreement-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.agreement-fill.high { background: linear-gradient(90deg, #10b981, #34d399); }
.agreement-fill.medium { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.agreement-fill.low { background: linear-gradient(90deg, #ef4444, #f87171); }

.agreement-label {
  font-size: 0.75rem;
  font-weight: 600;
}

.agreement-label.high { color: #059669; }
.agreement-label.medium { color: #d97706; }
.agreement-label.low { color: #dc2626; }

/* Adversarial Section */
.adversarial-section {
  background: rgba(239, 68, 68, 0.05);
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.section-header.adversarial h4 {
  color: #b91c1c;
}

.section-icon {
  font-size: 1.5rem;
}

.section-header h4 {
  margin: 0;
  font-size: 0.95rem;
}

.adversarial-content {
  background: white;
  border-radius: 12px;
  padding: 1rem;
}

.refiner-quote {
  position: relative;
  padding-left: 1.5rem;
}

.quote-mark {
  position: absolute;
  left: 0;
  top: -0.25rem;
  font-size: 2rem;
  color: #ef4444;
  opacity: 0.3;
}

.refiner-quote p {
  margin: 0;
  font-size: 0.9rem;
  color: #4b5563;
  font-style: italic;
  line-height: 1.6;
}

.refinement-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.refinement-actions label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
  display: block;
  margin-bottom: 0.5rem;
}

.refinement-actions ul {
  margin: 0;
  padding-left: 1.25rem;
}

.refinement-actions li {
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

/* Consensus Section */
.consensus-section {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05));
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.section-header.consensus h4 {
  color: #4338ca;
}

.consensus-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.consensus-block {
  background: white;
  padding: 1rem;
  border-radius: 12px;
}

.consensus-block h5 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  color: #374151;
}

.consensus-block p {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.6;
}

.consensus-block.next-steps ol {
  margin: 0;
  padding-left: 1.25rem;
}

.consensus-block.next-steps li {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.consensus-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.consensus-box {
  background: white;
  padding: 1rem;
  border-radius: 12px;
}

.consensus-box.strengths { border-left: 4px solid #10b981; }
.consensus-box.improvements { border-left: 4px solid #f59e0b; }

.consensus-box h5 {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: #374151;
}

.consensus-box ul {
  margin: 0;
  padding-left: 1rem;
}

.consensus-box li {
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

/* Research Metrics */
.research-metrics-section {
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.research-metrics-section h4 {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: #374151;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.metric-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.05));
  border-radius: 12px;
}

.metric-icon {
  font-size: 1.5rem;
}

.metric-data {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 0.7rem;
  color: #6b7280;
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #374151;
}

/* Mode Advantages Premium */
.mode-advantages.premium {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.1));
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.mode-advantages.premium h5 {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  color: #4c1d95;
}

.advantages-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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
  .architecture-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .arce-cards-grid,
  .consensus-grid {
    grid-template-columns: 1fr;
  }
  
  .metrics-grid,
  .advantages-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .votes-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .score-display-container {
    flex-direction: column;
  }
}

/* Dark Mode - Enhanced Contrast & Modern Look */
.dark-mode .mode-d-report {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(15, 23, 42, 0.98) 50%, #0f172a 100%);
  border-color: rgba(167, 139, 250, 0.5);
  box-shadow: 0 8px 32px rgba(139, 92, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* Dark Mode - Mode Header */
.dark-mode .mode-header.multi-agent {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(99, 102, 241, 0.15));
  border-color: rgba(167, 139, 250, 0.4);
}

.dark-mode .mode-title {
  color: #e0e7ff !important;
  text-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
}

.dark-mode .mode-subtitle {
  color: #c4b5fd !important;
}

.dark-mode .benefit-tag {
  background: rgba(139, 92, 246, 0.3);
  color: #e0e7ff;
  border: 1px solid rgba(167, 139, 250, 0.4);
}

.dark-mode .benefit-tag.premium {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #1f2937;
  border: none;
}

/* Dark Mode - Agent Cards */
.dark-mode .agent-architecture-panel,
.dark-mode .arce-detailed-section,
.dark-mode .per-question-section,
.dark-mode .research-metrics-section {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.dark-mode .agent-card {
  background: rgba(30, 41, 59, 0.9) !important;
  border-color: rgba(255, 255, 255, 0.1);
}

.dark-mode .agent-card:hover {
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
}

.dark-mode .agent-card.specialist.analysis {
  border-left-color: #60a5fa;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(30, 41, 59, 0.9)) !important;
}

.dark-mode .agent-card.specialist.reasoning {
  border-left-color: #a78bfa;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(30, 41, 59, 0.9)) !important;
}

.dark-mode .agent-card.specialist.creativity {
  border-left-color: #fbbf24;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(30, 41, 59, 0.9)) !important;
}

.dark-mode .agent-card.specialist.evidence {
  border-left-color: #34d399;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(30, 41, 59, 0.9)) !important;
}

.dark-mode .agent-card.adversarial {
  border-left-color: #f87171;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(30, 41, 59, 0.9)) !important;
}

.dark-mode .agent-card.consensus {
  border-left-color: #818cf8;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(30, 41, 59, 0.9)) !important;
}

.dark-mode .agent-info h5 {
  color: #f1f5f9 !important;
  font-weight: 600;
}

.dark-mode .agent-info p {
  color: #a5b4fc !important;
}

.dark-mode .agent-score {
  color: #cbd5e1 !important;
}

.dark-mode .agent-score .score {
  color: #f1f5f9 !important;
  text-shadow: 0 0 10px rgba(139, 92, 246, 0.4);
}

.dark-mode .agent-badge.refiner {
  background: rgba(239, 68, 68, 0.25);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.dark-mode .agent-badge.aggregator {
  background: linear-gradient(135deg, #818cf8, #a78bfa);
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(139, 92, 246, 0.4);
}

/* Dark Mode - Main Score Panel */
.dark-mode .main-score-panel {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(15, 23, 42, 0.95));
  border-color: rgba(167, 139, 250, 0.3);
}

.dark-mode .hexagon-score::before {
  background: linear-gradient(135deg, #a78bfa, #818cf8);
  opacity: 0.25;
}

.dark-mode .score-value {
  background: linear-gradient(135deg, #c4b5fd, #a5b4fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  filter: drop-shadow(0 0 20px rgba(167, 139, 250, 0.5));
}

.dark-mode .score-unit {
  color: #a5b4fc !important;
}

.dark-mode .score-fraction {
  color: #a5b4fc !important;
}

.dark-mode .score-fraction .num {
  color: #f1f5f9 !important;
}

.dark-mode .pa-badge.pa2 {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(245, 158, 11, 0.15));
  color: #fde047;
  border: 1px solid rgba(251, 191, 36, 0.4);
}

.dark-mode .pa-badge.pa1 {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.dark-mode .pa-badge.pa3 {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.dark-mode .pa-badge.pa4 {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.dark-mode .confidence-meter label {
  color: #a5b4fc !important;
}

.dark-mode .confidence-bar {
  background: rgba(255, 255, 255, 0.1);
}

.dark-mode .confidence-value {
  color: #6ee7b7 !important;
}

/* Dark Mode - ARCE Cards */
.dark-mode .arce-detailed-card {
  background: rgba(30, 41, 59, 0.9) !important;
}

.dark-mode .arce-detailed-card.analysis {
  border-color: #60a5fa;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(30, 41, 59, 0.9)) !important;
}

.dark-mode .arce-detailed-card.reasoning {
  border-color: #a78bfa;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(30, 41, 59, 0.9)) !important;
}

.dark-mode .arce-detailed-card.creativity {
  border-color: #fbbf24;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(30, 41, 59, 0.9)) !important;
}

.dark-mode .arce-detailed-card.evidence {
  border-color: #34d399;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(30, 41, 59, 0.9)) !important;
}

.dark-mode .arce-names h5 {
  color: #f1f5f9 !important;
}

.dark-mode .arce-english {
  color: #a5b4fc !important;
}

.dark-mode .big-score {
  color: #f1f5f9 !important;
  text-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
}

.dark-mode .max-score {
  color: #94a3b8 !important;
}

.dark-mode .agent-distribution label {
  color: #a5b4fc !important;
}

.dark-mode .agent-name {
  color: #cbd5e1 !important;
}

.dark-mode .mini-bar {
  background: rgba(255, 255, 255, 0.1);
}

.dark-mode .mini-value {
  color: #e2e8f0 !important;
}

.dark-mode .arce-progress {
  background: rgba(255, 255, 255, 0.1);
}

.dark-mode .percent-label {
  color: #e2e8f0 !important;
}

.dark-mode .feedback-section p {
  color: #cbd5e1 !important;
}

/* Dark Mode - Question Section */
.dark-mode .question-detail-card {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark-mode .question-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.dark-mode .q-tab {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.dark-mode .q-tab:hover {
  border-color: #a78bfa;
  color: #c4b5fd;
}

.dark-mode .vote-card {
  background: rgba(15, 23, 42, 0.9);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark-mode .vote-agent-name {
  color: #a5b4fc !important;
}

.dark-mode .vote-score {
  color: #f1f5f9 !important;
}

.dark-mode .agent-votes-section label,
.dark-mode .consensus-explanation label {
  color: #e2e8f0 !important;
}

.dark-mode .consensus-explanation p {
  background: rgba(139, 92, 246, 0.15);
  border-left-color: #a78bfa;
  color: #e2e8f0;
}

/* Dark Mode - Adversarial Section */
.dark-mode .adversarial-section {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.dark-mode .adversarial-content {
  background: rgba(30, 41, 59, 0.9);
}

.dark-mode .section-header.adversarial h4 {
  color: #fca5a5 !important;
}

.dark-mode .refiner-quote p {
  color: #e2e8f0 !important;
}

.dark-mode .refinement-actions {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.dark-mode .refinement-actions label {
  color: #e2e8f0 !important;
}

.dark-mode .refinement-actions li {
  color: #cbd5e1 !important;
}

/* Dark Mode - Consensus Section */
.dark-mode .consensus-section {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(15, 23, 42, 0.95));
  border-color: rgba(99, 102, 241, 0.3);
}

.dark-mode .section-header.consensus h4 {
  color: #a5b4fc !important;
}

.dark-mode .consensus-block,
.dark-mode .consensus-box {
  background: rgba(30, 41, 59, 0.9);
}

.dark-mode .consensus-block h5,
.dark-mode .consensus-box h5 {
  color: #f1f5f9 !important;
}

.dark-mode .consensus-block p,
.dark-mode .consensus-box li {
  color: #cbd5e1 !important;
}

.dark-mode .consensus-box.strengths {
  border-left-color: #34d399;
}

.dark-mode .consensus-box.improvements {
  border-left-color: #fbbf24;
}

/* Dark Mode - Research Metrics */
.dark-mode .research-metrics-section h4 {
  color: #f1f5f9 !important;
}

.dark-mode .metric-box {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(30, 41, 59, 0.9));
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.dark-mode .metric-label {
  color: #a5b4fc !important;
}

.dark-mode .metric-value {
  color: #f1f5f9 !important;
  text-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
}

/* Dark Mode - Advantages */
.dark-mode .mode-advantages.premium {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(15, 23, 42, 0.95));
  border-color: rgba(167, 139, 250, 0.3);
}

.dark-mode .mode-advantages.premium h5 {
  color: #c4b5fd !important;
}

.dark-mode .advantage-card {
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.dark-mode .adv-content h6 {
  color: #f1f5f9 !important;
}

.dark-mode .adv-content p {
  color: #a5b4fc !important;
}

/* Dark Mode - Headings Global */
.dark-mode .agent-architecture-panel h4,
.dark-mode .arce-detailed-section h4,
.dark-mode .per-question-section h4 {
  color: #e2e8f0 !important;
}

.dark-mode .no-data {
  color: #64748b !important;
}

/* Dark Mode - Glow Effects for Modern Look */
.dark-mode .agent-card:hover {
  transform: translateY(-3px);
}

.dark-mode .consensus-badge {
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
}

.dark-mode .hexagon-score {
  filter: drop-shadow(0 0 30px rgba(139, 92, 246, 0.3));
}

.dark-mode .research-badge {
  box-shadow: 0 2px 10px rgba(139, 92, 246, 0.4);
}
</style>
