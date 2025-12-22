<template>
  <div class="ai-teacher-comparison">
    <div class="page-header">
      <h1>📊 AI vs Teacher Comparison Dashboard</h1>
      <p class="subtitle">Inter-Rater Reliability Analysis</p>
    </div>

    <!-- Summary Cards -->
    <div class="summary-grid">
      <div class="summary-card">
        <div class="card-icon">🎯</div>
        <div class="card-content">
          <div class="card-value">{{ stats.totalPairs }}</div>
          <div class="card-label">Paired Assessments</div>
        </div>
      </div>
      <div class="summary-card highlight-green">
        <div class="card-icon">📈</div>
        <div class="card-content">
          <div class="card-value">{{ stats.pearsonR }}</div>
          <div class="card-label">Pearson Correlation</div>
        </div>
      </div>
      <div class="summary-card highlight-blue">
        <div class="card-icon">🔢</div>
        <div class="card-content">
          <div class="card-value">{{ stats.cohensKappa }}</div>
          <div class="card-label">Cohen's Kappa</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="card-icon">📉</div>
        <div class="card-content">
          <div class="card-value">{{ stats.mae }}</div>
          <div class="card-label">Mean Abs. Error</div>
        </div>
      </div>
    </div>

    <!-- Interpretation Guide -->
    <div class="interpretation-card">
      <h3>📖 Interpretation Guide</h3>
      <div class="interpretation-grid">
        <div class="interp-item">
          <strong>Pearson r:</strong>
          <span :class="getCorrelationClass(stats.pearsonR)">
            {{ interpretCorrelation(stats.pearsonR) }}
          </span>
        </div>
        <div class="interp-item">
          <strong>Cohen's κ:</strong>
          <span :class="getKappaClass(stats.cohensKappa)">
            {{ interpretKappa(stats.cohensKappa) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Dimension Breakdown -->
    <div class="section">
      <h2>By ARCE Dimension</h2>
      <div class="dimension-grid">
        <div 
          v-for="dim in dimensionStats" 
          :key="dim.key" 
          class="dimension-card"
        >
          <h4>{{ dim.label }}</h4>
          <div class="dim-stats">
            <div class="stat-row">
              <span>AI Mean:</span>
              <span>{{ dim.aiMean }}</span>
            </div>
            <div class="stat-row">
              <span>Expert Mean:</span>
              <span>{{ dim.expertMean }}</span>
            </div>
            <div class="stat-row">
              <span>Correlation:</span>
              <span :class="getCorrelationClass(dim.correlation)">
                {{ dim.correlation }}
              </span>
            </div>
            <div class="stat-row">
              <span>Bias:</span>
              <span :class="getBiasClass(dim.bias)">
                {{ dim.bias > 0 ? '+' : '' }}{{ dim.bias }}
              </span>
            </div>
          </div>
          <!-- Mini Bar Chart -->
          <div class="comparison-bars">
            <div class="bar-group">
              <div class="bar ai-bar" :style="{ width: `${dim.aiMean * 20}%` }"></div>
              <div class="bar expert-bar" :style="{ width: `${dim.expertMean * 20}%` }"></div>
            </div>
            <div class="bar-legend">
              <span class="legend-ai">🤖 AI</span>
              <span class="legend-expert">👩‍🏫 Expert</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scatter Plot Section -->
    <div class="section">
      <h2>Score Distribution</h2>
      <div class="chart-container">
        <div class="scatter-plot">
          <div class="plot-axis y-axis">
            <span>Expert Score</span>
          </div>
          <div class="plot-area">
            <div 
              v-for="(point, idx) in scatterData" 
              :key="idx"
              class="plot-point"
              :style="{
                left: `${point.aiScore * 5}%`,
                bottom: `${point.expertScore * 5}%`
              }"
              :title="`AI: ${point.aiScore}, Expert: ${point.expertScore}`"
            ></div>
            <!-- Perfect agreement line -->
            <div class="agreement-line"></div>
          </div>
          <div class="plot-axis x-axis">
            <span>AI Score</span>
          </div>
        </div>
        <div class="chart-legend">
          <div class="legend-item">
            <span class="point-sample"></span>
            Assessment pairs
          </div>
          <div class="legend-item">
            <span class="line-sample"></span>
            Perfect agreement
          </div>
        </div>
      </div>
    </div>

    <!-- Discrepancy Analysis -->
    <div class="section">
      <h2>Discrepancy Analysis</h2>
      <div class="discrepancy-summary">
        <div class="disc-stat">
          <div class="disc-value perfect">{{ discrepancyData.perfect }}</div>
          <div class="disc-label">Perfect Match (0)</div>
        </div>
        <div class="disc-stat">
          <div class="disc-value minor">{{ discrepancyData.minor }}</div>
          <div class="disc-label">Minor (1-2)</div>
        </div>
        <div class="disc-stat">
          <div class="disc-value moderate">{{ discrepancyData.moderate }}</div>
          <div class="disc-label">Moderate (3-4)</div>
        </div>
        <div class="disc-stat">
          <div class="disc-value major">{{ discrepancyData.major }}</div>
          <div class="disc-label">Major (5+)</div>
        </div>
      </div>
    </div>

    <!-- Trend Over Time -->
    <div class="section">
      <h2>Agreement Trend Over Time</h2>
      <div class="trend-chart">
        <div v-for="week in trendData" :key="week.week" class="trend-bar-container">
          <div 
            class="trend-bar" 
            :style="{ height: `${week.agreement * 100}%` }"
            :class="{ 'low': week.agreement < 0.6, 'medium': week.agreement >= 0.6 && week.agreement < 0.8, 'high': week.agreement >= 0.8 }"
          ></div>
          <div class="trend-label">{{ week.label }}</div>
        </div>
      </div>
    </div>

    <!-- Problematic Cases -->
    <div class="section">
      <h2>🚩 Cases Requiring Review</h2>
      <div class="cases-table">
        <table>
          <thead>
            <tr>
              <th>Assessment</th>
              <th>AI Total</th>
              <th>Expert Total</th>
              <th>Difference</th>
              <th>Main Dimension</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="case_ in problematicCases" :key="case_.id">
              <td class="id-cell">{{ case_.id.slice(0, 8) }}</td>
              <td>{{ case_.aiTotal }}/20</td>
              <td>{{ case_.expertTotal }}/20</td>
              <td :class="getDiffClass(case_.diff)">{{ case_.diff > 0 ? '+' : '' }}{{ case_.diff }}</td>
              <td>{{ case_.mainDimension }}</td>
              <td>
                <button class="btn-small" @click="viewCase(case_)">View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Export & Reports -->
    <div class="section">
      <h2>📤 Export Reports</h2>
      <div class="export-buttons">
        <button class="btn btn-primary" @click="generateIRRReport">
          📊 Generate IRR Report
        </button>
        <button class="btn btn-secondary" @click="exportForSPSS">
          📈 Export for SPSS
        </button>
        <button class="btn btn-secondary" @click="exportForR">
          📉 Export for R
        </button>
        <button class="btn btn-outline" @click="downloadFullReport">
          📄 Full PDF Report
        </button>
      </div>
    </div>

    <!-- Case Detail Modal -->
    <div v-if="selectedCase" class="modal-overlay" @click.self="selectedCase = null">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Assessment Detail #{{ selectedCase.id.slice(0, 8) }}</h3>
          <button class="close-btn" @click="selectedCase = null">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-section">
            <label>Question:</label>
            <p>{{ selectedCase.question }}</p>
          </div>
          <div class="detail-section">
            <label>Student Answer:</label>
            <p>{{ selectedCase.studentAnswer }}</p>
          </div>
          <div class="scores-side-by-side">
            <div class="score-panel">
              <h4>🤖 AI Scores</h4>
              <div v-for="dim in dimensions" :key="dim.key" class="score-row">
                <span>{{ dim.label }}:</span>
                <span>{{ selectedCase.rubricScores?.[dim.key] || 0 }}</span>
              </div>
              <div class="score-total">Total: {{ selectedCase.aiTotal }}/20</div>
            </div>
            <div class="score-panel">
              <h4>👩‍🏫 Expert Scores</h4>
              <div v-for="dim in dimensions" :key="dim.key" class="score-row">
                <span>{{ dim.label }}:</span>
                <span>{{ selectedCase.expertScores?.[dim.key] || 0 }}</span>
              </div>
              <div class="score-total">Total: {{ selectedCase.expertTotal }}/20</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/config'

const dimensions = [
  { key: 'analysis', label: 'Analysis' },
  { key: 'reasoning', label: 'Reasoning' },
  { key: 'creativity', label: 'Creativity' },
  { key: 'evidence', label: 'Evidence' }
]

const stats = ref({
  totalPairs: 0,
  pearsonR: '0.00',
  cohensKappa: '0.00',
  mae: '0.00'
})

const dimensionStats = ref([])
const scatterData = ref([])
const discrepancyData = ref({
  perfect: 0,
  minor: 0,
  moderate: 0,
  major: 0
})
const trendData = ref([])
const problematicCases = ref([])
const selectedCase = ref(null)
const loading = ref(false)

onMounted(async () => {
  await fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    // Fetch calibrated assessments
    const q = query(
      collection(db, 'assessments'),
      where('expertScores', '!=', null),
      orderBy('calibratedAt', 'desc'),
      limit(500)
    )
    
    const snapshot = await getDocs(q)
    const assessments = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))

    calculateStats(assessments)
    generateScatterData(assessments)
    calculateDimensionStats(assessments)
    calculateDiscrepancies(assessments)
    generateTrendData(assessments)
    findProblematicCases(assessments)

  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    loading.value = false
  }
}

function calculateStats(assessments) {
  const n = assessments.length
  if (n === 0) return

  const aiScores = assessments.map(a => calculateTotal(a.rubricScores))
  const expertScores = assessments.map(a => calculateTotal(a.expertScores))

  // Pearson correlation
  const meanAI = aiScores.reduce((a, b) => a + b, 0) / n
  const meanExpert = expertScores.reduce((a, b) => a + b, 0) / n
  
  let numerator = 0
  let denomAI = 0
  let denomExpert = 0
  
  for (let i = 0; i < n; i++) {
    const diffAI = aiScores[i] - meanAI
    const diffExpert = expertScores[i] - meanExpert
    numerator += diffAI * diffExpert
    denomAI += diffAI * diffAI
    denomExpert += diffExpert * diffExpert
  }
  
  const r = numerator / Math.sqrt(denomAI * denomExpert)

  // Cohen's Kappa (simplified)
  const exactMatches = aiScores.filter((s, i) => s === expertScores[i]).length
  const po = exactMatches / n
  const pe = 0.2 // Expected by chance for 5-point scale
  const kappa = (po - pe) / (1 - pe)

  // Mean Absolute Error
  const mae = aiScores.reduce((sum, s, i) => 
    sum + Math.abs(s - expertScores[i]), 0) / n

  stats.value = {
    totalPairs: n,
    pearsonR: r.toFixed(2),
    cohensKappa: kappa.toFixed(2),
    mae: mae.toFixed(2)
  }
}

function calculateDimensionStats(assessments) {
  dimensionStats.value = dimensions.map(dim => {
    const aiVals = assessments.map(a => a.rubricScores?.[dim.key] || 0)
    const expertVals = assessments.map(a => a.expertScores?.[dim.key] || 0)
    
    const aiMean = aiVals.reduce((a, b) => a + b, 0) / aiVals.length
    const expertMean = expertVals.reduce((a, b) => a + b, 0) / expertVals.length
    
    // Correlation for this dimension
    const n = aiVals.length
    let num = 0, dAI = 0, dExp = 0
    for (let i = 0; i < n; i++) {
      const da = aiVals[i] - aiMean
      const de = expertVals[i] - expertMean
      num += da * de
      dAI += da * da
      dExp += de * de
    }
    const corr = num / Math.sqrt(dAI * dExp)
    
    return {
      key: dim.key,
      label: dim.label,
      aiMean: aiMean.toFixed(2),
      expertMean: expertMean.toFixed(2),
      correlation: corr.toFixed(2),
      bias: (aiMean - expertMean).toFixed(2)
    }
  })
}

function generateScatterData(assessments) {
  scatterData.value = assessments.map(a => ({
    aiScore: calculateTotal(a.rubricScores),
    expertScore: calculateTotal(a.expertScores)
  }))
}

function calculateDiscrepancies(assessments) {
  const disc = { perfect: 0, minor: 0, moderate: 0, major: 0 }
  
  assessments.forEach(a => {
    const diff = Math.abs(
      calculateTotal(a.rubricScores) - calculateTotal(a.expertScores)
    )
    
    if (diff === 0) disc.perfect++
    else if (diff <= 2) disc.minor++
    else if (diff <= 4) disc.moderate++
    else disc.major++
  })
  
  discrepancyData.value = disc
}

function generateTrendData(assessments) {
  // Group by week
  const weekMap = {}
  
  assessments.forEach(a => {
    const date = a.calibratedAt?.toDate?.() || new Date()
    const weekStart = new Date(date)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const key = weekStart.toISOString().split('T')[0]
    
    if (!weekMap[key]) {
      weekMap[key] = { aiScores: [], expertScores: [] }
    }
    
    weekMap[key].aiScores.push(calculateTotal(a.rubricScores))
    weekMap[key].expertScores.push(calculateTotal(a.expertScores))
  })
  
  trendData.value = Object.entries(weekMap)
    .slice(-8)
    .map(([key, data]) => {
      const matches = data.aiScores.filter((s, i) => 
        Math.abs(s - data.expertScores[i]) <= 2
      ).length
      
      return {
        week: key,
        label: new Date(key).toLocaleDateString('th-TH', { 
          month: 'short', 
          day: 'numeric' 
        }),
        agreement: matches / data.aiScores.length
      }
    })
}

function findProblematicCases(assessments) {
  problematicCases.value = assessments
    .map(a => {
      const aiTotal = calculateTotal(a.rubricScores)
      const expertTotal = calculateTotal(a.expertScores)
      const diff = aiTotal - expertTotal
      
      // Find dimension with biggest difference
      let maxDiff = 0
      let mainDim = ''
      dimensions.forEach(d => {
        const dimDiff = Math.abs(
          (a.rubricScores?.[d.key] || 0) - (a.expertScores?.[d.key] || 0)
        )
        if (dimDiff > maxDiff) {
          maxDiff = dimDiff
          mainDim = d.label
        }
      })
      
      return {
        id: a.id,
        question: a.question,
        studentAnswer: a.studentAnswer,
        rubricScores: a.rubricScores,
        expertScores: a.expertScores,
        aiTotal,
        expertTotal,
        diff,
        mainDimension: mainDim
      }
    })
    .filter(c => Math.abs(c.diff) >= 4)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 10)
}

function calculateTotal(scores) {
  if (!scores) return 0
  return Object.values(scores).reduce((sum, s) => sum + (s || 0), 0)
}

function interpretCorrelation(r) {
  const val = parseFloat(r)
  if (val >= 0.9) return 'Very Strong'
  if (val >= 0.7) return 'Strong'
  if (val >= 0.5) return 'Moderate'
  if (val >= 0.3) return 'Weak'
  return 'Very Weak'
}

function interpretKappa(k) {
  const val = parseFloat(k)
  if (val >= 0.81) return 'Almost Perfect'
  if (val >= 0.61) return 'Substantial'
  if (val >= 0.41) return 'Moderate'
  if (val >= 0.21) return 'Fair'
  return 'Poor'
}

function getCorrelationClass(r) {
  const val = parseFloat(r)
  if (val >= 0.7) return 'high'
  if (val >= 0.5) return 'medium'
  return 'low'
}

function getKappaClass(k) {
  const val = parseFloat(k)
  if (val >= 0.61) return 'high'
  if (val >= 0.41) return 'medium'
  return 'low'
}

function getBiasClass(bias) {
  const val = Math.abs(parseFloat(bias))
  if (val <= 0.2) return 'neutral'
  if (val <= 0.5) return 'slight'
  return 'significant'
}

function getDiffClass(diff) {
  const val = Math.abs(diff)
  if (val <= 2) return 'minor'
  if (val <= 4) return 'moderate'
  return 'major'
}

function viewCase(case_) {
  selectedCase.value = case_
}

async function generateIRRReport() {
  // Call Cloud Function
  try {
    const response = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/irrReport`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'detailed' })
    })
    const data = await response.json()
    console.log('IRR Report:', data)
    alert('Report generated! Check console for details.')
  } catch (error) {
    console.error('Error generating report:', error)
  }
}

function exportForSPSS() {
  const headers = [
    'id', 
    'ai_analysis', 'ai_reasoning', 'ai_creativity', 'ai_evidence', 'ai_total',
    'exp_analysis', 'exp_reasoning', 'exp_creativity', 'exp_evidence', 'exp_total'
  ]
  
  const rows = scatterData.value.map((_, i) => {
    const a = problematicCases.value[i] || {}
    return [
      i + 1,
      a.rubricScores?.analysis || 0,
      a.rubricScores?.reasoning || 0,
      a.rubricScores?.creativity || 0,
      a.rubricScores?.evidence || 0,
      a.aiTotal || 0,
      a.expertScores?.analysis || 0,
      a.expertScores?.reasoning || 0,
      a.expertScores?.creativity || 0,
      a.expertScores?.evidence || 0,
      a.expertTotal || 0
    ]
  })
  
  const BOM = '\uFEFF'
  const csv = BOM + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n')
  downloadFile(csv, 'irr_spss.csv', 'text/csv')
}

function exportForR() {
  const data = {
    ai_scores: scatterData.value.map(d => d.aiScore),
    expert_scores: scatterData.value.map(d => d.expertScore),
    dimensions: dimensionStats.value
  }
  downloadFile(JSON.stringify(data, null, 2), 'irr_r.json', 'application/json')
}

function downloadFullReport() {
  // Generate comprehensive report
  const report = {
    generated: new Date().toISOString(),
    summary: stats.value,
    dimensionAnalysis: dimensionStats.value,
    discrepancies: discrepancyData.value,
    trend: trendData.value,
    problematicCases: problematicCases.value.length
  }
  
  const content = `
# Inter-Rater Reliability Report
Generated: ${report.generated}

## Summary Statistics
- Total Paired Assessments: ${report.summary.totalPairs}
- Pearson Correlation: ${report.summary.pearsonR}
- Cohen's Kappa: ${report.summary.cohensKappa}
- Mean Absolute Error: ${report.summary.mae}

## Interpretation
- Correlation: ${interpretCorrelation(report.summary.pearsonR)}
- Agreement: ${interpretKappa(report.summary.cohensKappa)}

## Dimension Analysis
${report.dimensionAnalysis.map(d => `
### ${d.label}
- AI Mean: ${d.aiMean}
- Expert Mean: ${d.expertMean}
- Correlation: ${d.correlation}
- Bias: ${d.bias}
`).join('')}

## Discrepancy Distribution
- Perfect Match: ${report.discrepancies.perfect}
- Minor (1-2): ${report.discrepancies.minor}
- Moderate (3-4): ${report.discrepancies.moderate}
- Major (5+): ${report.discrepancies.major}

## Cases Requiring Review: ${report.problematicCases}
`

  downloadFile(content, 'irr_report.md', 'text/markdown')
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
}
</script>

<style scoped>
.ai-teacher-comparison {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  color: var(--primary-color);
}

.subtitle {
  color: var(--text-secondary);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.summary-card.highlight-green {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.summary-card.highlight-blue {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.card-icon {
  font-size: 2rem;
}

.card-value {
  font-size: 1.75rem;
  font-weight: bold;
}

.card-label {
  font-size: 0.875rem;
  opacity: 0.8;
}

.interpretation-card {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.interpretation-grid {
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
}

.interp-item span {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-weight: 500;
}

.interp-item span.high {
  background: var(--success-bg);
  color: var(--success-color);
}

.interp-item span.medium {
  background: var(--warning-bg);
  color: var(--warning-color);
}

.interp-item span.low {
  background: var(--error-bg);
  color: var(--error-color);
}

.section {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.section h2 {
  margin: 0 0 1.5rem 0;
  color: var(--text-primary);
}

.dimension-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.dimension-card {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
}

.dimension-card h4 {
  margin: 0 0 1rem 0;
  text-align: center;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  font-size: 0.875rem;
}

.comparison-bars {
  margin-top: 1rem;
}

.bar-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bar {
  height: 8px;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.ai-bar {
  background: #3b82f6;
}

.expert-bar {
  background: #10b981;
}

.bar-legend {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  margin-top: 0.5rem;
}

.scatter-plot {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: 1fr auto;
  gap: 1rem;
  height: 300px;
}

.plot-area {
  position: relative;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.plot-point {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--primary-color);
  border-radius: 50%;
  transform: translate(-50%, 50%);
  opacity: 0.7;
  cursor: pointer;
}

.plot-point:hover {
  opacity: 1;
  transform: translate(-50%, 50%) scale(1.5);
}

.agreement-line {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 141.4%;
  height: 2px;
  background: #ef4444;
  transform-origin: left bottom;
  transform: rotate(45deg);
  opacity: 0.5;
}

.plot-axis {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.y-axis {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
}

.discrepancy-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.disc-stat {
  text-align: center;
  padding: 1rem;
  border-radius: 8px;
  background: var(--bg-secondary);
}

.disc-value {
  font-size: 2rem;
  font-weight: bold;
}

.disc-value.perfect { color: #10b981; }
.disc-value.minor { color: #3b82f6; }
.disc-value.moderate { color: #f59e0b; }
.disc-value.major { color: #ef4444; }

.trend-chart {
  display: flex;
  align-items: flex-end;
  height: 200px;
  gap: 1rem;
  padding: 1rem;
}

.trend-bar-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.trend-bar {
  width: 100%;
  max-width: 40px;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
}

.trend-bar.high { background: #10b981; }
.trend-bar.medium { background: #f59e0b; }
.trend-bar.low { background: #ef4444; }

.trend-label {
  font-size: 0.75rem;
  margin-top: 0.5rem;
  color: var(--text-secondary);
}

.cases-table table {
  width: 100%;
  border-collapse: collapse;
}

.cases-table th,
.cases-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.cases-table th {
  font-weight: 600;
  color: var(--text-secondary);
}

.id-cell {
  font-family: monospace;
}

td.minor { color: #3b82f6; }
td.moderate { color: #f59e0b; }
td.major { color: #ef4444; font-weight: bold; }

.neutral { color: var(--text-secondary); }
.slight { color: #f59e0b; }
.significant { color: #ef4444; }

.btn-small {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 4px;
  background: var(--primary-color);
  color: white;
  border: none;
  cursor: pointer;
}

.export-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--card-bg);
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-body {
  padding: 1.5rem;
}

.detail-section {
  margin-bottom: 1.5rem;
}

.detail-section label {
  font-weight: 600;
  display: block;
  margin-bottom: 0.5rem;
}

.detail-section p {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  margin: 0;
}

.scores-side-by-side {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.score-panel {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
}

.score-panel h4 {
  margin: 0 0 1rem 0;
}

.score-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
}

.score-total {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  font-weight: 600;
  text-align: right;
}

@media (max-width: 768px) {
  .summary-grid,
  .dimension-grid,
  .discrepancy-summary {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .scores-side-by-side {
    grid-template-columns: 1fr;
  }
}
</style>
