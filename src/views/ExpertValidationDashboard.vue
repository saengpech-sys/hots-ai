<template>
  <div class="expert-validation-dashboard">
    <!-- Animated Background Orbs -->
    <div class="orb-container">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <!-- Hero Header -->
    <div class="hero-header glass-panel">
      <div class="header-content">
        <div class="hero-badge">
          <span class="badge-icon">🔬</span>
          <span>Expert Calibration</span>
        </div>
        <h1 class="hero-title">
          <span class="gradient-text">Expert Validation Dashboard</span>
        </h1>
        <p class="subtitle">ระบบตรวจสอบความเที่ยงตรงอัตโนมัติสำหรับงานวิจัย • IRR Metrics • Golden Dataset</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-glow" @click="refreshIRR">
          <span class="icon">🔄</span> รีเฟรช IRR
        </button>
        <button class="btn btn-glass" @click="exportReport">
          <span class="icon">📤</span> Export Report
        </button>
      </div>
    </div>

    <!-- IRR Summary Cards -->
    <div class="irr-summary">
      <div class="summary-card glass-card" :class="getStatusClass(irrStatus.status)">
        <div class="card-icon-wrap irr-icon">
          <span class="card-icon">📊</span>
        </div>
        <div class="card-content">
          <h3>สถานะ IRR โดยรวม</h3>
          <div class="status-value">{{ irrStatus.message }}</div>
          <div class="kappa-value" v-if="irrStatus.avgKappa">
            κ = {{ irrStatus.avgKappa?.toFixed(3) }}
          </div>
        </div>
      </div>

      <div class="summary-card glass-card">
        <div class="card-icon-wrap golden-icon">
          <span class="card-icon">📚</span>
        </div>
        <div class="card-content">
          <h3>Golden Dataset</h3>
          <div class="dataset-stats">
            <span class="stat">{{ goldenStats.counts?.total || 0 }} samples</span>
            <span class="stat badge-pill" :class="goldenStats.isBalanced?.balanced ? 'balanced' : 'imbalanced'">
              {{ goldenStats.isBalanced?.balanced ? '✓ Balanced' : '⚠ Imbalanced' }}
            </span>
          </div>
        </div>
      </div>

      <div class="summary-card glass-card">
        <div class="card-icon-wrap pub-icon">
          <span class="card-icon">🎯</span>
        </div>
        <div class="card-content">
          <h3>Publication Ready</h3>
          <div class="ready-status" :class="publicationReady ? 'ready' : 'not-ready'">
            {{ publicationReady ? '✓ พร้อมตีพิมพ์' : '✗ ยังไม่พร้อม' }}
          </div>
        </div>
      </div>

      <div class="summary-card glass-card">
        <div class="card-icon-wrap pending-icon">
          <span class="card-icon">⏳</span>
        </div>
        <div class="card-content">
          <h3>รอการตรวจสอบ</h3>
          <div class="pending-count">{{ pendingSamples.length }} samples</div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="dashboard-tabs glass-panel">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content glass-card">
      <!-- IRR Metrics Tab -->
      <div v-if="activeTab === 'irr'" class="irr-metrics">
        <h2 class="gradient-text">📈 Inter-Rater Reliability Metrics</h2>
        
        <!-- Dimension-wise IRR -->
        <div class="dimension-irr">
          <div 
            v-for="(data, dimension) in irrByDimension" 
            :key="dimension"
            class="dimension-card glass-metric-card"
          >
            <h4>{{ getDimensionLabel(dimension) }}</h4>
            <div v-if="data.success !== false" class="irr-values">
              <div class="irr-metric">
                <label>Weighted Kappa</label>
                <span :class="getKappaClass(data.kappa)">
                  {{ data.kappa?.toFixed(3) || 'N/A' }}
                </span>
                <small>{{ data.status }}</small>
              </div>
              <div class="irr-metric">
                <label>Spearman ρ</label>
                <span :class="getICCClass(data.spearman)">
                  {{ data.spearman?.toFixed(3) || 'N/A' }}
                </span>
              </div>
              <div class="irr-metric">
                <label>Agreement</label>
                <span>{{ data.agreement?.toFixed(1) || 'N/A' }}%</span>
              </div>
            </div>
            <div v-else class="error-msg">
              {{ data.error || 'ยังไม่มีข้อมูล' }}
            </div>
          </div>
        </div>

        <!-- Report Text -->
        <div v-if="irrByDimension.total?.reportText" class="report-text">
          <h3>📝 Citation-Ready Text</h3>
          <blockquote>{{ irrByDimension.total?.reportText }}</blockquote>
          <button class="btn btn-small" @click="copyReportText">
            📋 Copy
          </button>
        </div>
      </div>

      <!-- Validation Queue Tab -->
      <div v-if="activeTab === 'validation'" class="validation-queue">
        <h2>✅ Expert Validation Queue</h2>
        
        <div class="validation-controls">
          <button class="btn btn-primary" @click="getNewSamples" :disabled="loadingQueue">
            {{ loadingQueue ? 'กำลังโหลด...' : '🔄 ดึง Samples ใหม่' }}
          </button>
          <span class="sample-count">{{ pendingSamples.length }} samples พร้อมตรวจ</span>
        </div>

        <div v-if="pendingSamples.length === 0" class="empty-queue">
          <p>ไม่มี samples ที่รอตรวจสอบ</p>
          <button class="btn" @click="getNewSamples">ดึง Samples ใหม่</button>
        </div>

        <div v-else class="sample-list">
          <div 
            v-for="(sample, index) in pendingSamples" 
            :key="sample.assessmentId"
            class="sample-card"
            :class="{ active: currentSampleIndex === index }"
            @click="selectSample(index)"
          >
            <div class="sample-header">
              <span class="sample-num">#{{ index + 1 }}</span>
              <span class="stratum-badge" :class="sample.stratum">
                {{ sample.stratum }}
              </span>
              <span class="ai-score">AI: {{ sample.totalScore }}/20</span>
            </div>
            <p class="sample-preview">{{ truncate(sample.studentAnswer, 100) }}</p>
          </div>
        </div>

        <!-- Validation Form -->
        <div v-if="currentSample" class="validation-form">
          <h3>📝 ตรวจสอบ Sample #{{ currentSampleIndex + 1 }}</h3>
          
          <div class="sample-detail">
            <div class="detail-section">
              <label>คำถาม:</label>
              <p>{{ currentSample.questionContext }}</p>
            </div>
            <div class="detail-section">
              <label>คำตอบนักเรียน:</label>
              <p class="student-answer">{{ currentSample.studentAnswer }}</p>
            </div>
          </div>

          <div class="scores-comparison">
            <div class="ai-scores">
              <h4>🤖 AI Scores</h4>
              <div v-for="dim in dimensions" :key="dim.key" class="score-row">
                <span>{{ dim.label }}:</span>
                <span class="score">{{ currentSample.rubricScores?.[dim.key] || 0 }}</span>
              </div>
              <div class="score-row total">
                <span>รวม:</span>
                <span class="score">{{ currentSample.totalScore }}/20</span>
              </div>
            </div>

            <div class="expert-scores">
              <h4>👨‍🏫 Expert Scores</h4>
              <div v-for="dim in dimensions" :key="dim.key" class="score-row">
                <label>{{ dim.label }}:</label>
                <select v-model="expertScores[dim.key]">
                  <option v-for="s in [0,1,2,3,4,5]" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div class="score-row total">
                <span>รวม:</span>
                <span class="score">{{ expertTotal }}/20</span>
              </div>
            </div>
          </div>

          <div class="agreement-preview">
            <h4>📊 Agreement Preview</h4>
            <div class="agreement-stats">
              <div class="stat">
                <label>Exact Match:</label>
                <span>{{ exactMatches }}/4</span>
              </div>
              <div class="stat">
                <label>Within 1:</label>
                <span>{{ withinOne }}/4</span>
              </div>
              <div class="stat">
                <label>Total Diff:</label>
                <span :class="totalDiff <= 2 ? 'good' : 'bad'">
                  {{ Math.abs(totalDiff) }}
                </span>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn btn-secondary" @click="skipSample">
              ข้าม
            </button>
            <button class="btn btn-primary" @click="submitValidation" :disabled="submitting">
              {{ submitting ? 'กำลังบันทึก...' : '✓ บันทึกการตรวจสอบ' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Bias Analysis Tab -->
      <div v-if="activeTab === 'bias'" class="bias-analysis">
        <h2>⚠️ Bias Detection Report</h2>
        
        <div v-if="!biasReport" class="no-data">
          <p>ยังไม่มีข้อมูล Bias Analysis</p>
          <button class="btn btn-primary" @click="runBiasAnalysis" :disabled="analyzingBias">
            {{ analyzingBias ? 'กำลังวิเคราะห์...' : '🔍 วิเคราะห์ Bias' }}
          </button>
        </div>

        <div v-else class="bias-results">
          <!-- Overall Risk -->
          <div class="risk-summary" :class="biasReport.overallRisk?.level">
            <h3>ระดับความเสี่ยง: {{ biasReport.overallRisk?.level?.toUpperCase() }}</h3>
            <p>{{ biasReport.overallRisk?.interpretation }}</p>
            <div class="risk-factors" v-if="biasReport.overallRisk?.factors?.length">
              <span v-for="factor in biasReport.overallRisk.factors" :key="factor" class="factor-tag">
                {{ factor }}
              </span>
            </div>
          </div>

          <!-- Bias Details -->
          <div class="bias-grid">
            <!-- Length Bias -->
            <div class="bias-card" :class="{ detected: biasReport.biases?.length?.detected }">
              <h4>📏 Length Bias</h4>
              <div class="bias-status">
                {{ biasReport.biases?.length?.detected ? '⚠️ Detected' : '✓ Not detected' }}
              </div>
              <div class="bias-details">
                <p>Correlation: r = {{ biasReport.biases?.length?.correlation?.toFixed(3) }}</p>
                <small>{{ biasReport.biases?.length?.interpretation }}</small>
              </div>
            </div>

            <!-- Vocabulary Bias -->
            <div class="bias-card" :class="{ detected: biasReport.biases?.vocabulary?.detected }">
              <h4>📖 Vocabulary Bias</h4>
              <div class="bias-status">
                {{ biasReport.biases?.vocabulary?.detected ? '⚠️ Detected' : '✓ Not detected' }}
              </div>
              <div class="bias-details">
                <p>Correlation: r = {{ biasReport.biases?.vocabulary?.correlation?.toFixed(3) }}</p>
              </div>
            </div>

            <!-- Scoring Patterns -->
            <div class="bias-card">
              <h4>📊 Scoring Patterns</h4>
              <div class="pattern-checks">
                <div class="pattern-item" 
                     :class="{ detected: biasReport.biases?.scoringPatterns?.patterns?.leniency?.detected }">
                  <span>Leniency:</span>
                  <span>{{ biasReport.biases?.scoringPatterns?.patterns?.leniency?.detected ? '⚠️' : '✓' }}</span>
                </div>
                <div class="pattern-item"
                     :class="{ detected: biasReport.biases?.scoringPatterns?.patterns?.severity?.detected }">
                  <span>Severity:</span>
                  <span>{{ biasReport.biases?.scoringPatterns?.patterns?.severity?.detected ? '⚠️' : '✓' }}</span>
                </div>
                <div class="pattern-item"
                     :class="{ detected: biasReport.biases?.scoringPatterns?.patterns?.centralTendency?.detected }">
                  <span>Central Tendency:</span>
                  <span>{{ biasReport.biases?.scoringPatterns?.patterns?.centralTendency?.detected ? '⚠️' : '✓' }}</span>
                </div>
              </div>
            </div>

            <!-- Dimension Bias -->
            <div class="bias-card" :class="{ detected: biasReport.biases?.dimension?.detected }">
              <h4>🎯 Dimension Bias</h4>
              <div class="bias-status">
                {{ biasReport.biases?.dimension?.detected ? '⚠️ Detected' : '✓ Not detected' }}
              </div>
              <div class="bias-details" v-if="biasReport.biases?.dimension?.detected">
                <p>Highest: {{ biasReport.biases?.dimension?.highestDimension }}</p>
                <p>Lowest: {{ biasReport.biases?.dimension?.lowestDimension }}</p>
                <p>Ratio: {{ biasReport.biases?.dimension?.imbalanceRatio }}</p>
              </div>
            </div>
          </div>

          <!-- Recommendations -->
          <div class="recommendations">
            <h3>📋 Recommendations</h3>
            <div 
              v-for="(rec, index) in biasReport.recommendations" 
              :key="index"
              class="recommendation-item"
              :class="rec.priority?.toLowerCase()"
            >
              <span class="priority-badge">{{ rec.priority }}</span>
              <div class="rec-content">
                <strong>{{ rec.issue }}</strong>
                <p>{{ rec.action }}</p>
                <small>{{ rec.metric }}</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Golden Dataset Tab -->
      <div v-if="activeTab === 'golden'" class="golden-dataset">
        <h2>🏆 Golden Dataset Management</h2>

        <div class="dataset-overview">
          <div class="stratum-cards">
            <div 
              v-for="stratum in ['low', 'medium', 'high']" 
              :key="stratum"
              class="stratum-card"
              :class="stratum"
            >
              <h4>{{ getStratumLabel(stratum) }}</h4>
              <div class="count">{{ goldenStats.counts?.[stratum] || 0 }}</div>
              <div class="target">
                เป้าหมาย: {{ getStratumTarget(stratum) }}
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill"
                  :style="{ width: getStratumProgress(stratum) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="dataset-actions">
          <button class="btn" @click="exportGoldenDataset">
            📥 Export Dataset
          </button>
          <button class="btn btn-secondary" @click="refreshGoldenStats">
            🔄 Refresh Stats
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div v-if="toast.show" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore'
import { db, functions } from '@/firebase/config'
import { httpsCallable } from 'firebase/functions'

const authStore = useAuthStore()

// Tabs configuration
const tabs = [
  { id: 'irr', icon: '📈', label: 'IRR Metrics' },
  { id: 'validation', icon: '✅', label: 'Validation Queue' },
  { id: 'bias', icon: '⚠️', label: 'Bias Analysis' },
  { id: 'golden', icon: '🏆', label: 'Golden Dataset' }
]

const activeTab = ref('irr')

// Dimensions
const dimensions = [
  { key: 'analysis', label: 'การวิเคราะห์', icon: '🔍' },
  { key: 'reasoning', label: 'การให้เหตุผล', icon: '🧠' },
  { key: 'creativity', label: 'ความคิดสร้างสรรค์', icon: '💡' },
  { key: 'evidence', label: 'การใช้หลักฐาน', icon: '📚' }
]

// State
const irrByDimension = ref({})
const irrStatus = ref({ status: 'loading', message: 'กำลังโหลด...' })
const goldenStats = ref({ total: 0, counts: {}, isBalanced: {} })
const publicationReady = ref(false)
const pendingSamples = ref([])
const currentSampleIndex = ref(-1)
const expertScores = ref({ analysis: 0, reasoning: 0, creativity: 0, evidence: 0 })
const biasReport = ref(null)

const loadingQueue = ref(false)
const submitting = ref(false)
const analyzingBias = ref(false)

const toast = ref({ show: false, message: '', type: 'info' })

// Computed
const currentSample = computed(() => {
  if (currentSampleIndex.value >= 0 && currentSampleIndex.value < pendingSamples.value.length) {
    return pendingSamples.value[currentSampleIndex.value]
  }
  return null
})

const expertTotal = computed(() => {
  return Object.values(expertScores.value).reduce((a, b) => a + b, 0)
})

const exactMatches = computed(() => {
  if (!currentSample.value) return 0
  let matches = 0
  for (const dim of dimensions) {
    if ((currentSample.value.rubricScores?.[dim.key] || 0) === expertScores.value[dim.key]) {
      matches++
    }
  }
  return matches
})

const withinOne = computed(() => {
  if (!currentSample.value) return 0
  let matches = 0
  for (const dim of dimensions) {
    const aiScore = currentSample.value.rubricScores?.[dim.key] || 0
    const expertScore = expertScores.value[dim.key]
    if (Math.abs(aiScore - expertScore) <= 1) {
      matches++
    }
  }
  return matches
})

const totalDiff = computed(() => {
  if (!currentSample.value) return 0
  return expertTotal.value - currentSample.value.totalScore
})

// Methods
const showToast = (message, type = 'info') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3000)
}

const getDimensionLabel = (dim) => {
  const labels = {
    analysis: '🔍 การวิเคราะห์',
    reasoning: '🧠 การให้เหตุผล',
    creativity: '💡 ความคิดสร้างสรรค์',
    evidence: '📚 การใช้หลักฐาน',
    total: '📊 คะแนนรวม'
  }
  return labels[dim] || dim
}

const truncate = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const getStatusClass = (status) => {
  const classes = {
    excellent: 'status-excellent',
    good: 'status-good',
    moderate: 'status-moderate',
    poor: 'status-poor',
    insufficient_data: 'status-warning'
  }
  return classes[status] || ''
}

const getKappaClass = (kappa) => {
  if (kappa >= 0.8) return 'excellent'
  if (kappa >= 0.6) return 'good'
  if (kappa >= 0.4) return 'moderate'
  return 'poor'
}

const getICCClass = (icc) => {
  if (icc >= 0.9) return 'excellent'
  if (icc >= 0.75) return 'good'
  if (icc >= 0.5) return 'moderate'
  return 'poor'
}

const getStratumLabel = (stratum) => {
  const labels = { low: 'Low (0-6)', medium: 'Medium (7-13)', high: 'High (14-20)' }
  return labels[stratum] || stratum
}

const getStratumTarget = (stratum) => {
  const targets = { low: 25, medium: 50, high: 25 }
  return targets[stratum] || 0
}

const getStratumProgress = (stratum) => {
  const count = goldenStats.value.counts?.[stratum] || 0
  const target = getStratumTarget(stratum)
  return Math.min(100, (count / target) * 100)
}

// API calls
const refreshIRR = async () => {
  try {
    const calculateIRR = httpsCallable(functions, 'calculateRealTimeIRR')
    const result = await calculateIRR({})
    
    if (result.data.success) {
      irrByDimension.value = result.data.byDimension
      irrStatus.value = result.data.overallStatus
      publicationReady.value = result.data.overallStatus?.status === 'excellent' || 
                              result.data.overallStatus?.status === 'good'
    }
  } catch (error) {
    console.error('Error refreshing IRR:', error)
    showToast('เกิดข้อผิดพลาดในการคำนวณ IRR', 'error')
  }
}

const getNewSamples = async () => {
  loadingQueue.value = true
  try {
    const getSamples = httpsCallable(functions, 'getSamplesForValidation')
    const result = await getSamples({ count: 10 })
    
    if (result.data.samples) {
      pendingSamples.value = result.data.samples
      if (pendingSamples.value.length > 0) {
        selectSample(0)
      }
    }
  } catch (error) {
    console.error('Error getting samples:', error)
    showToast('เกิดข้อผิดพลาดในการดึง samples', 'error')
  } finally {
    loadingQueue.value = false
  }
}

const selectSample = (index) => {
  currentSampleIndex.value = index
  if (pendingSamples.value[index]) {
    // Pre-fill with AI scores for comparison
    const sample = pendingSamples.value[index]
    expertScores.value = {
      analysis: sample.rubricScores?.analysis || 0,
      reasoning: sample.rubricScores?.reasoning || 0,
      creativity: sample.rubricScores?.creativity || 0,
      evidence: sample.rubricScores?.evidence || 0
    }
  }
}

const skipSample = () => {
  if (currentSampleIndex.value < pendingSamples.value.length - 1) {
    selectSample(currentSampleIndex.value + 1)
  } else {
    currentSampleIndex.value = -1
    showToast('ตรวจสอบครบทุก sample แล้ว', 'success')
  }
}

const submitValidation = async () => {
  if (!currentSample.value) return
  
  submitting.value = true
  try {
    const addGoldenSample = httpsCallable(functions, 'addGoldenSample')
    const result = await addGoldenSample({
      assessmentId: currentSample.value.assessmentId,
      studentAnswer: currentSample.value.studentAnswer,
      questionContext: currentSample.value.questionContext,
      aiScores: currentSample.value.rubricScores,
      expertScores: expertScores.value,
      expertId: authStore.user?.uid,
      gradeLevel: currentSample.value.gradeLevel
    })
    
    if (result.data.success) {
      showToast('บันทึกการตรวจสอบเรียบร้อย', 'success')
      pendingSamples.value.splice(currentSampleIndex.value, 1)
      
      if (pendingSamples.value.length > 0) {
        selectSample(Math.min(currentSampleIndex.value, pendingSamples.value.length - 1))
      } else {
        currentSampleIndex.value = -1
      }
      
      // Refresh stats
      refreshGoldenStats()
    }
  } catch (error) {
    console.error('Error submitting validation:', error)
    showToast('เกิดข้อผิดพลาดในการบันทึก', 'error')
  } finally {
    submitting.value = false
  }
}

const runBiasAnalysis = async () => {
  analyzingBias.value = true
  try {
    const analyzeBias = httpsCallable(functions, 'analyzeBias')
    const result = await analyzeBias()
    
    if (result.data.success) {
      biasReport.value = result.data.report
    }
  } catch (error) {
    console.error('Error analyzing bias:', error)
    showToast('เกิดข้อผิดพลาดในการวิเคราะห์ Bias', 'error')
  } finally {
    analyzingBias.value = false
  }
}

const refreshGoldenStats = async () => {
  try {
    const getStats = httpsCallable(functions, 'getGoldenDatasetStatsCallable')
    const result = await getStats({})
    
    if (result.data && result.data.stats) {
      goldenStats.value = result.data.stats
    }
  } catch (error) {
    console.error('Error getting golden stats:', error)
  }
}

const exportGoldenDataset = async () => {
  try {
    const exportData = httpsCallable(functions, 'exportGoldenDataset')
    const result = await exportData()
    
    if (result.data) {
      // Download as JSON
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `golden_dataset_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      showToast('Export สำเร็จ', 'success')
    }
  } catch (error) {
    console.error('Error exporting:', error)
    showToast('เกิดข้อผิดพลาดในการ Export', 'error')
  }
}

const exportReport = async () => {
  const report = {
    generatedAt: new Date().toISOString(),
    irrMetrics: irrByDimension.value,
    goldenDatasetStats: goldenStats.value,
    biasAnalysis: biasReport.value,
    publicationReady: publicationReady.value
  }
  
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `irr_report_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  showToast('Export Report สำเร็จ', 'success')
}

const copyReportText = () => {
  if (irrByDimension.value.total?.reportText) {
    navigator.clipboard.writeText(irrByDimension.value.total.reportText)
    showToast('คัดลอกแล้ว', 'success')
  }
}

// Lifecycle
onMounted(() => {
  refreshIRR()
  refreshGoldenStats()
})
</script>

<style scoped>
.expert-validation-dashboard {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d1421 100%);
  position: relative;
  overflow: hidden;
}

/* Animated Orbs */
.orb-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  animation: float 20s ease-in-out infinite;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  top: -200px;
  right: -200px;
  animation-delay: 0s;
}

.orb-2 {
  width: 500px;
  height: 500px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  bottom: -150px;
  left: -150px;
  animation-delay: -7s;
}

.orb-3 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -14s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(50px, -50px) scale(1.05); }
  50% { transform: translate(-30px, 30px) scale(0.95); }
  75% { transform: translate(-50px, -30px) scale(1.02); }
}

/* Glass Panel */
.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 20px;
}

/* Glass Card */
.glass-card {
  position: relative;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

/* Gradient Text */
.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Hero Header */
.hero-header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 2rem;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 50px;
  font-size: 0.8rem;
  color: #a78bfa;
  margin-bottom: 1rem;
}

.badge-icon {
  font-size: 1rem;
}

.hero-title {
  font-size: 2rem;
  margin: 0 0 0.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.subtitle {
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  font-size: 0.95rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

/* Buttons */
.btn {
  padding: 0.85rem 1.75rem;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-glow {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  position: relative;
  overflow: hidden;
}

.btn-glow::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

.btn-glow:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.5);
}

.btn-glass {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
}

.btn-glass:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}

.btn-small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* IRR Summary Cards */
.irr-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
  position: relative;
  z-index: 1;
}

.summary-card {
  padding: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.card-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.irr-icon {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.golden-icon {
  background: linear-gradient(135deg, rgba(240, 147, 251, 0.2), rgba(245, 87, 108, 0.2));
  border: 1px solid rgba(240, 147, 251, 0.3);
}

.pub-icon {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(52, 211, 153, 0.2));
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.pending-icon {
  background: linear-gradient(135deg, rgba(79, 172, 254, 0.2), rgba(0, 242, 254, 0.2));
  border: 1px solid rgba(79, 172, 254, 0.3);
}

.card-icon {
  font-size: 1.75rem;
}

.summary-card h3 {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-value {
  font-weight: 600;
  color: #fff;
}

.kappa-value {
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.dataset-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dataset-stats .stat {
  color: #fff;
  font-weight: 600;
}

.badge-pill {
  padding: 0.25rem 0.75rem;
  border-radius: 50px;
  font-size: 0.75rem;
  width: fit-content;
}

.badge-pill.balanced {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.badge-pill.imbalanced {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.ready-status {
  font-weight: 700;
  font-size: 1.1rem;
}

.ready-status.ready {
  color: #34d399;
}

.ready-status.not-ready {
  color: #f87171;
}

.pending-count {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
}

.status-excellent { border-left: 4px solid #10b981; }
.status-good { border-left: 4px solid #22c55e; }
.status-moderate { border-left: 4px solid #f97316; }
.status-poor { border-left: 4px solid #ef4444; }

/* Tabs */
.dashboard-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding: 0.75rem;
  position: relative;
  z-index: 1;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1.25rem;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid transparent;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.tab-icon {
  font-size: 1.1rem;
}

.tab-label {
  font-weight: 500;
}

/* Tab Content */
.tab-content {
  padding: 2rem;
  position: relative;
  z-index: 1;
}

.tab-content h2 {
  margin: 0 0 1.5rem;
  font-size: 1.5rem;
}

/* IRR Metrics */
.dimension-irr {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.dimension-card,
.glass-metric-card {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.3s ease;
}

.glass-metric-card:hover {
  background: rgba(0, 0, 0, 0.3);
  transform: translateY(-2px);
}

.dimension-card h4 {
  margin: 0 0 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 1rem;
}

.irr-values {
  display: grid;
  gap: 1rem;
}

.irr-metric {
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
}

.irr-metric label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.irr-metric span {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.irr-metric small {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 0.25rem;
}

.irr-metric span.excellent { 
  background: linear-gradient(135deg, #10b981, #34d399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.irr-metric span.good { 
  background: linear-gradient(135deg, #22c55e, #4ade80);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.irr-metric span.moderate { 
  background: linear-gradient(135deg, #f97316, #fb923c);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.irr-metric span.poor { 
  background: linear-gradient(135deg, #ef4444, #f87171);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.error-msg {
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
  padding: 1rem;
  text-align: center;
}

.report-text {
  background: rgba(0, 0, 0, 0.2);
  padding: 1.5rem;
  border-radius: 14px;
  margin-top: 1.5rem;
}

.report-text h3 {
  color: #fff;
  margin: 0 0 1rem;
}

.report-text blockquote {
  margin: 1rem 0;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border-left: 3px solid #667eea;
  font-style: italic;
  color: rgba(255, 255, 255, 0.8);
  border-radius: 0 10px 10px 0;
}

/* Validation Queue */
.validation-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.sample-count {
  color: rgba(255, 255, 255, 0.6);
}

.empty-queue {
  text-align: center;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.5);
}

.sample-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  max-height: 220px;
  overflow-y: auto;
}

.sample-card {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.sample-card:hover {
  border-color: rgba(102, 126, 234, 0.4);
  background: rgba(0, 0, 0, 0.3);
}

.sample-card.active {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.15);
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.2);
}

.sample-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.sample-num {
  font-weight: 700;
  color: #667eea;
}

.stratum-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-weight: 600;
  text-transform: uppercase;
}

.stratum-badge.low { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.stratum-badge.medium { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.stratum-badge.high { background: rgba(16, 185, 129, 0.2); color: #34d399; }

.ai-score {
  margin-left: auto;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.sample-preview {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  line-height: 1.4;
}

.validation-form {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  padding: 1.75rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.validation-form h3 {
  color: #fff;
  margin: 0 0 1.5rem;
}

.sample-detail {
  margin-bottom: 1.5rem;
}

.detail-section {
  margin-bottom: 1.25rem;
}

.detail-section label {
  font-weight: 600;
  display: block;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
}

.detail-section p {
  color: rgba(255, 255, 255, 0.8);
}

.student-answer {
  background: rgba(0, 0, 0, 0.3);
  padding: 1.25rem;
  border-radius: 12px;
  white-space: pre-wrap;
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
}

.scores-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.ai-scores, .expert-scores {
  background: rgba(0, 0, 0, 0.2);
  padding: 1.25rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.ai-scores h4, .expert-scores h4 {
  margin: 0 0 1rem;
  color: #fff;
}

.score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.8);
}

.score-row.total {
  font-weight: 700;
  border-bottom: none;
  margin-top: 0.5rem;
  color: #fff;
}

.score-row .score {
  font-weight: 600;
  color: #667eea;
}

.expert-scores select {
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 0.9rem;
}

.expert-scores select:focus {
  outline: none;
  border-color: #667eea;
}

.agreement-preview {
  background: rgba(0, 0, 0, 0.2);
  padding: 1.25rem;
  border-radius: 14px;
  margin-bottom: 1.5rem;
}

.agreement-stats {
  display: flex;
  gap: 2rem;
}

.agreement-stats .stat {
  display: flex;
  flex-direction: column;
}

.agreement-stats .stat span:first-child {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.agreement-stats .stat span:last-child {
  font-weight: 700;
  font-size: 1.25rem;
}

.agreement-stats .good span:last-child { color: #34d399; }
.agreement-stats .bad span:last-child { color: #f87171; }

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

/* Bias Analysis */
.risk-summary {
  padding: 1.5rem;
  border-radius: 14px;
  margin-bottom: 1.5rem;
}

.risk-summary.low { 
  background: rgba(16, 185, 129, 0.1); 
  border: 1px solid rgba(16, 185, 129, 0.3); 
}
.risk-summary.medium { 
  background: rgba(245, 158, 11, 0.1); 
  border: 1px solid rgba(245, 158, 11, 0.3); 
}
.risk-summary.high { 
  background: rgba(239, 68, 68, 0.1); 
  border: 1px solid rgba(239, 68, 68, 0.3); 
}

.risk-factors {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.factor-tag {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
}

.bias-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.bias-card {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 1.25rem;
}

.bias-card.detected {
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.08);
}

.bias-status {
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #fff;
}

.pattern-checks {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pattern-item {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
}

.pattern-item.detected {
  color: #fbbf24;
}

.recommendations {
  background: rgba(0, 0, 0, 0.2);
  padding: 1.25rem;
  border-radius: 14px;
}

.recommendation-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.recommendation-item:last-child {
  border-bottom: none;
}

.priority-badge {
  font-size: 0.7rem;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-weight: 600;
  height: fit-content;
  text-transform: uppercase;
}

.recommendation-item.high .priority-badge { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.recommendation-item.medium .priority-badge { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.recommendation-item.low .priority-badge { background: rgba(251, 191, 36, 0.2); color: #fde68a; }
.recommendation-item.info .priority-badge { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }

.recommendation-item p {
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

/* Golden Dataset */
.stratum-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stratum-card {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  padding: 1.75rem;
  text-align: center;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.stratum-card:hover {
  transform: translateY(-2px);
}

.stratum-card.low { border-color: rgba(239, 68, 68, 0.4); }
.stratum-card.medium { border-color: rgba(245, 158, 11, 0.4); }
.stratum-card.high { border-color: rgba(16, 185, 129, 0.4); }

.stratum-card h4 {
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
}

.stratum-card .count {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0.5rem 0;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stratum-card .target {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-top: 0.75rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.dataset-actions {
  display: flex;
  gap: 1rem;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 14px;
  background: rgba(30, 30, 50, 0.95);
  backdrop-filter: blur(20px);
  box-shadow: 0 10px 40px rgba(0,0,0,0.4);
  z-index: 1000;
  animation: slideIn 0.3s ease;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.toast.success { border-left: 4px solid #10b981; }
.toast.error { border-left: 4px solid #ef4444; }
.toast.info { border-left: 4px solid #3b82f6; }

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Responsive */
@media (max-width: 768px) {
  .hero-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.5rem;
  }
  
  .header-actions {
    width: 100%;
    flex-direction: column;
  }
  
  .scores-comparison {
    grid-template-columns: 1fr;
  }
  
  .stratum-cards {
    grid-template-columns: 1fr;
  }
  
  .tab-label {
    display: none;
  }
}
</style>
