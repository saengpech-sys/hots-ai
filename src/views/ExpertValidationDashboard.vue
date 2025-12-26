<template>
  <div class="expert-validation-dashboard">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>🔬 Expert Validation Dashboard</h1>
        <p class="subtitle">ระบบตรวจสอบความเที่ยงตรงอัตโนมัติสำหรับงานวิจัย</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" @click="refreshIRR">
          <span class="icon">🔄</span> รีเฟรช IRR
        </button>
        <button class="btn btn-secondary" @click="exportReport">
          <span class="icon">📤</span> Export Report
        </button>
      </div>
    </div>

    <!-- IRR Summary Cards -->
    <div class="irr-summary">
      <div class="summary-card" :class="getStatusClass(irrStatus.status)">
        <div class="card-icon">📊</div>
        <div class="card-content">
          <h3>สถานะ IRR โดยรวม</h3>
          <div class="status-value">{{ irrStatus.message }}</div>
          <div class="kappa-value" v-if="irrStatus.avgKappa">
            κ = {{ irrStatus.avgKappa?.toFixed(3) }}
          </div>
        </div>
      </div>

      <div class="summary-card">
        <div class="card-icon">📚</div>
        <div class="card-content">
          <h3>Golden Dataset</h3>
          <div class="dataset-stats">
            <span class="stat">{{ goldenStats.total || 0 }} samples</span>
            <span class="stat" :class="goldenStats.isBalanced?.balanced ? 'balanced' : 'imbalanced'">
              {{ goldenStats.isBalanced?.balanced ? '✓ Balanced' : '⚠ Imbalanced' }}
            </span>
          </div>
        </div>
      </div>

      <div class="summary-card">
        <div class="card-icon">🎯</div>
        <div class="card-content">
          <h3>Publication Ready</h3>
          <div class="ready-status" :class="publicationReady ? 'ready' : 'not-ready'">
            {{ publicationReady ? '✓ พร้อมตีพิมพ์' : '✗ ยังไม่พร้อม' }}
          </div>
        </div>
      </div>

      <div class="summary-card">
        <div class="card-icon">⏳</div>
        <div class="card-content">
          <h3>รอการตรวจสอบ</h3>
          <div class="pending-count">{{ pendingSamples.length }} samples</div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="dashboard-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- IRR Metrics Tab -->
      <div v-if="activeTab === 'irr'" class="irr-metrics">
        <h2>📈 Inter-Rater Reliability Metrics</h2>
        
        <!-- Dimension-wise IRR -->
        <div class="dimension-irr">
          <div 
            v-for="(data, dimension) in irrByDimension" 
            :key="dimension"
            class="dimension-card"
          >
            <h4>{{ getDimensionLabel(dimension) }}</h4>
            <div v-if="data.success" class="irr-values">
              <div class="irr-metric">
                <label>Weighted Kappa</label>
                <span :class="getKappaClass(data.weightedKappa?.weightedKappa)">
                  {{ data.weightedKappa?.weightedKappa?.toFixed(3) || 'N/A' }}
                </span>
                <small>{{ data.weightedKappa?.interpretation }}</small>
              </div>
              <div class="irr-metric">
                <label>ICC (2,1)</label>
                <span :class="getICCClass(data.icc?.icc)">
                  {{ data.icc?.icc?.toFixed(3) || 'N/A' }}
                </span>
                <small>{{ data.icc?.interpretation }}</small>
              </div>
              <div class="irr-metric">
                <label>Pearson r</label>
                <span>{{ data.pearsonR?.r?.toFixed(3) || 'N/A' }}</span>
              </div>
              <div class="irr-metric">
                <label>MAE</label>
                <span>{{ data.mae?.mae?.toFixed(2) || 'N/A' }}</span>
              </div>
            </div>
            <div v-else class="error-msg">
              {{ data.error }}
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
    const result = await calculateIRR()
    
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
    const getStats = httpsCallable(functions, 'getGoldenDatasetStats')
    const result = await getStats()
    
    if (result.data) {
      goldenStats.value = result.data
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
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.75rem;
  margin: 0;
}

.subtitle {
  color: var(--text-secondary);
  margin: 0.5rem 0 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

/* IRR Summary Cards */
.irr-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  border: 1px solid var(--border-color);
}

.summary-card .card-icon {
  font-size: 2rem;
}

.summary-card h3 {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.status-value {
  font-weight: 600;
}

.kappa-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
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
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-secondary);
  border-radius: 8px 8px 0 0;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: var(--bg-secondary);
}

.tab-btn.active {
  background: var(--primary);
  color: white;
}

/* Tab Content */
.tab-content {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
}

.tab-content h2 {
  margin: 0 0 1.5rem;
  font-size: 1.25rem;
}

/* IRR Metrics */
.dimension-irr {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.dimension-card {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid var(--border-color);
}

.dimension-card h4 {
  margin: 0 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.irr-values {
  display: grid;
  gap: 0.75rem;
}

.irr-metric {
  display: flex;
  flex-direction: column;
}

.irr-metric label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.irr-metric span {
  font-size: 1.25rem;
  font-weight: 600;
}

.irr-metric span.excellent { color: #10b981; }
.irr-metric span.good { color: #22c55e; }
.irr-metric span.moderate { color: #f97316; }
.irr-metric span.poor { color: #ef4444; }

.report-text {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.report-text blockquote {
  margin: 1rem 0;
  padding: 1rem;
  background: var(--bg-secondary);
  border-left: 3px solid var(--primary);
  font-style: italic;
}

/* Validation Queue */
.validation-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.sample-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.sample-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.sample-card:hover {
  border-color: var(--primary);
}

.sample-card.active {
  border-color: var(--primary);
  background: var(--primary-light);
}

.sample-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.stratum-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.stratum-badge.low { background: #fecaca; color: #991b1b; }
.stratum-badge.medium { background: #fed7aa; color: #9a3412; }
.stratum-badge.high { background: #bbf7d0; color: #166534; }

.sample-preview {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
}

.validation-form {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 1.5rem;
}

.sample-detail {
  margin-bottom: 1.5rem;
}

.detail-section {
  margin-bottom: 1rem;
}

.detail-section label {
  font-weight: 600;
  display: block;
  margin-bottom: 0.25rem;
}

.student-answer {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  white-space: pre-wrap;
}

.scores-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.ai-scores, .expert-scores {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
}

.ai-scores h4, .expert-scores h4 {
  margin: 0 0 1rem;
}

.score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.score-row.total {
  font-weight: 600;
  border-bottom: none;
  margin-top: 0.5rem;
}

.expert-scores select {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.agreement-preview {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
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

.agreement-stats .good { color: #22c55e; }
.agreement-stats .bad { color: #ef4444; }

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

/* Bias Analysis */
.risk-summary {
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.risk-summary.low { background: #dcfce7; border: 1px solid #22c55e; }
.risk-summary.medium { background: #fef3c7; border: 1px solid #f59e0b; }
.risk-summary.high { background: #fecaca; border: 1px solid #ef4444; }

.risk-factors {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.factor-tag {
  background: rgba(0,0,0,0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.bias-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.bias-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
}

.bias-card.detected {
  border-color: #f97316;
  background: #fff7ed;
}

.bias-status {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.pattern-checks {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pattern-item {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.pattern-item.detected {
  color: #f97316;
}

.recommendations {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 8px;
}

.recommendation-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.recommendation-item:last-child {
  border-bottom: none;
}

.priority-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  height: fit-content;
}

.recommendation-item.high .priority-badge { background: #fecaca; color: #991b1b; }
.recommendation-item.medium .priority-badge { background: #fed7aa; color: #9a3412; }
.recommendation-item.low .priority-badge { background: #fef3c7; color: #854d0e; }
.recommendation-item.info .priority-badge { background: #dbeafe; color: #1e40af; }

/* Golden Dataset */
.stratum-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stratum-card {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  border: 2px solid transparent;
}

.stratum-card.low { border-color: #fca5a5; }
.stratum-card.medium { border-color: #fdba74; }
.stratum-card.high { border-color: #86efac; }

.stratum-card .count {
  font-size: 2rem;
  font-weight: 700;
  margin: 0.5rem 0;
}

.stratum-card .target {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.progress-bar {
  height: 4px;
  background: var(--bg-secondary);
  border-radius: 2px;
  margin-top: 0.5rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 2px;
  transition: width 0.3s;
}

.dataset-actions {
  display: flex;
  gap: 1rem;
}

/* Buttons */
.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-secondary {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-primary);
}

.btn-small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  background: var(--bg-primary);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  animation: slideIn 0.3s ease;
}

.toast.success { border-left: 4px solid #22c55e; }
.toast.error { border-left: 4px solid #ef4444; }
.toast.info { border-left: 4px solid #3b82f6; }

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .scores-comparison {
    grid-template-columns: 1fr;
  }
  
  .stratum-cards {
    grid-template-columns: 1fr;
  }
}
</style>
