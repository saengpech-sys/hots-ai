<template>
  <div class="research-export">
    <!-- Animated Background Orbs -->
    <div class="orb-container">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <!-- Hero Header -->
    <div class="hero-header">
      <router-link to="/teacher" class="back-btn glass-btn">
        <span class="material-icons">arrow_back</span>
      </router-link>
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-icon">📊</span>
          <span>Research Data Hub</span>
        </div>
        <h1 class="hero-title">
          <span class="gradient-text">Research Data Export</span>
        </h1>
        <p class="hero-subtitle">
          ส่งออกข้อมูลสำหรับการวิเคราะห์ทางสถิติ • RQ1-RQ4 • Privacy-Preserving
        </p>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="tab-nav glass-panel">
      <button 
        v-for="tab in tabs" 
        :key="tab.id" 
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Tab: Data Export (Original) -->
    <div v-show="activeTab === 'export'" class="tab-content">
    <!-- Export Options -->
    <div class="export-grid">
      <!-- RQ1: Effectiveness Data -->
      <div class="export-card glass-card">
        <div class="card-header">
          <div class="card-icon-wrap rq1">
            <span class="card-icon">📊</span>
          </div>
          <div>
            <h3>RQ1: Effectiveness Data</h3>
            <p>ข้อมูลเปรียบเทียบ Pre-test/Post-test</p>
          </div>
        </div>
        <div class="card-body">
          <div class="data-preview">
            <strong>Fields:</strong>
            <ul>
              <li>StudentID (anonymized)</li>
              <li>ExperimentGroup (control/treatment)</li>
              <li>Pretest_A, Pretest_R, Pretest_C, Pretest_E</li>
              <li>Posttest_A, Posttest_R, Posttest_C, Posttest_E</li>
              <li>SystemUsage (session count)</li>
              <li>TotalTimeMinutes</li>
            </ul>
          </div>
          <div class="export-options">
            <label>ช่วงเวลา:</label>
            <select v-model="rq1DateRange" class="form-control">
              <option value="all">ทั้งหมด</option>
              <option value="semester">เทอมนี้</option>
              <option value="month">เดือนนี้</option>
            </select>
          </div>
        </div>
        <div class="card-footer">
          <button class="btn btn-primary" @click="exportRQ1" :disabled="exporting">
            <span class="material-icons">download</span>
            Export CSV
          </button>
          <span class="record-count">{{ rq1RecordCount }} records</span>
        </div>
      </div>

      <!-- RQ2: Validity Data -->
      <div class="export-card glass-card">
        <div class="card-header">
          <div class="card-icon-wrap rq2">
            <span class="card-icon">🔬</span>
          </div>
          <div>
            <h3>RQ2: Validity Data</h3>
            <p>เปรียบเทียบคะแนน AI vs Expert</p>
          </div>
        </div>
        <div class="card-body">
          <div class="data-preview">
            <strong>Fields:</strong>
            <ul>
              <li>AssessmentID</li>
              <li>AI_A, AI_R, AI_C, AI_E, AI_Total</li>
              <li>Expert_A, Expert_R, Expert_C, Expert_E, Expert_Total</li>
              <li>AgreementScore</li>
              <li>PromptVersion</li>
              <li>ModelVersion</li>
              <li>AnswerWordCount</li>
            </ul>
          </div>
          <div class="export-options">
            <label>เฉพาะที่ Validated:</label>
            <input type="checkbox" v-model="rq2ValidatedOnly" />
          </div>
        </div>
        <div class="card-footer">
          <button class="btn btn-primary" @click="exportRQ2" :disabled="exporting">
            <span class="material-icons">download</span>
            Export CSV
          </button>
          <span class="record-count">{{ rq2RecordCount }} records</span>
        </div>
      </div>

      <!-- RQ3: Learning Analytics Data -->
      <div class="export-card glass-card">
        <div class="card-header">
          <div class="card-icon-wrap rq3">
            <span class="card-icon">📈</span>
          </div>
          <div>
            <h3>RQ3: Learning Analytics</h3>
            <p>Interaction patterns & Trajectory</p>
          </div>
        </div>
        <div class="card-body">
          <div class="data-preview">
            <strong>Fields:</strong>
            <ul>
              <li>StudentID, SessionID, AssessmentID</li>
              <li>Timestamp, WeekOfTerm</li>
              <li>WordCount, CharCount, SentenceCount</li>
              <li>AnswerDurationMs, FirstKeystrokeMs</li>
              <li>RevisionCount, ThinkingPauseCount</li>
              <li>Score_A, Score_R, Score_C, Score_E</li>
              <li>LO_Passed (comma-separated)</li>
            </ul>
          </div>
          <div class="export-options">
            <label>เลือกรายวิชา:</label>
            <select v-model="rq3CourseId" class="form-control">
              <option value="">ทุกรายวิชา</option>
              <option v-for="course in courses" :key="course.id" :value="course.id">
                {{ course.courseCode }} - {{ course.courseName }}
              </option>
            </select>
          </div>
        </div>
        <div class="card-footer">
          <button class="btn btn-primary" @click="exportRQ3" :disabled="exporting">
            <span class="material-icons">download</span>
            Export CSV
          </button>
          <span class="record-count">{{ rq3RecordCount }} records</span>
        </div>
      </div>

      <!-- RQ4: Teacher Actions Data -->
      <div class="export-card glass-card">
        <div class="card-header">
          <div class="card-icon-wrap rq4">
            <span class="card-icon">👩‍🏫</span>
          </div>
          <div>
            <h3>RQ4: Teacher Actions</h3>
            <p>Dashboard usage & Interventions</p>
          </div>
        </div>
        <div class="card-body">
          <div class="data-preview">
            <strong>Fields:</strong>
            <ul>
              <li>TeacherID (anonymized)</li>
              <li>ActionType, ActionCategory</li>
              <li>TargetType, TargetID</li>
              <li>ViewDurationMs</li>
              <li>WasAIRecommended</li>
              <li>TeacherAccepted</li>
              <li>Timestamp</li>
            </ul>
          </div>
        </div>
        <div class="card-footer">
          <button class="btn btn-primary" @click="exportRQ4" :disabled="exporting">
            <span class="material-icons">download</span>
            Export CSV
          </button>
          <span class="record-count">{{ rq4RecordCount }} records</span>
        </div>
      </div>
    </div>

    <!-- Combined Export -->
    <div class="combined-export glass-card highlight-card">
      <div class="highlight-glow"></div>
      <h3>📁 Export ทั้งหมด (ZIP)</h3>
      <p>ดาวน์โหลดข้อมูลทั้ง 4 RQ blocks พร้อม Data Dictionary</p>
      <div class="combined-options">
        <label class="checkbox-label">
          <input type="checkbox" v-model="includeDataDict" />
          <span class="checkbox-custom"></span>
          รวม Data Dictionary (PDF)
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="anonymizeData" checked />
          <span class="checkbox-custom"></span>
          Anonymize ข้อมูล (แนะนำ)
        </label>
      </div>
      <button class="btn btn-lg btn-glow" @click="exportAll" :disabled="exporting">
        <span class="material-icons">folder_zip</span>
        {{ exporting ? 'กำลัง Export...' : 'Export All (ZIP)' }}
      </button>
    </div>

    <!-- Data Summary -->
    <div class="data-summary glass-card">
      <h3><span class="gradient-text">📊 สรุปข้อมูลในระบบ</span></h3>
      <div class="summary-grid">
        <div class="summary-item glass-stat">
          <span class="summary-value">{{ totalAssessments }}</span>
          <span class="summary-label">Total Assessments</span>
        </div>
        <div class="summary-item glass-stat">
          <span class="summary-value">{{ totalStudents }}</span>
          <span class="summary-label">Students</span>
        </div>
        <div class="summary-item glass-stat">
          <span class="summary-value">{{ totalSessions }}</span>
          <span class="summary-label">Sessions</span>
        </div>
        <div class="summary-item glass-stat">
          <span class="summary-value">{{ validatedAssessments }}</span>
          <span class="summary-label">Expert Validated</span>
        </div>
        <div class="summary-item glass-stat">
          <span class="summary-value">{{ teacherActions }}</span>
          <span class="summary-label">Teacher Actions</span>
        </div>
        <div class="summary-item glass-stat">
          <span class="summary-value">{{ dateRange }}</span>
          <span class="summary-label">Date Range</span>
        </div>
      </div>
    </div>
    </div><!-- End Tab: Data Export -->

    <!-- Tab: IRR Analysis -->
    <div v-show="activeTab === 'irr'" class="tab-content">
      <div class="glass-card">
        <h3 class="gradient-text">📏 Inter-Rater Reliability (IRR)</h3>
        <p class="section-desc">คำนวณความสอดคล้องระหว่างการให้คะแนนของ AI และ Expert</p>
        
        <div class="action-bar">
          <button class="btn btn-glow" @click="calculateIRR" :disabled="irrLoading">
            {{ irrLoading ? '⏳ กำลังคำนวณ...' : '🔄 คำนวณ IRR' }}
          </button>
          <button class="btn btn-glass" @click="getIRRReport" :disabled="irrLoading">
            📊 ดูรายงาน IRR
          </button>
        </div>

        <div v-if="irrResult" class="result-card glass-result">
          <h4>ผลการคำนวณ IRR</h4>
          <div class="metrics-grid">
            <div class="metric-item glass-metric">
              <span class="metric-value">{{ irrResult.cohensKappa?.toFixed(3) || 'N/A' }}</span>
              <span class="metric-label">Cohen's Kappa</span>
            </div>
            <div class="metric-item glass-metric">
              <span class="metric-value">{{ irrResult.spearmanRho?.toFixed(3) || 'N/A' }}</span>
              <span class="metric-label">Spearman's ρ</span>
            </div>
            <div class="metric-item glass-metric">
              <span class="metric-value">{{ irrResult.percentAgreement?.toFixed(1) || 'N/A' }}%</span>
              <span class="metric-label">% Agreement</span>
            </div>
            <div class="metric-item glass-metric">
              <span class="metric-value">{{ irrResult.sampleSize || 0 }}</span>
              <span class="metric-label">Sample Size</span>
            </div>
          </div>
          <p class="interpretation">{{ irrResult.interpretation }}</p>
        </div>
      </div>
    </div>

    <!-- Tab: Effect Size -->
    <div v-show="activeTab === 'effectsize'" class="tab-content">
      <div class="card">
        <h3>📈 Effect Size Analysis</h3>
        <p class="section-desc">วัดขนาดผลกระทบของ HOTS Intervention (Pretest vs Posttest)</p>
        
        <div class="form-group">
          <label>เลือกรายวิชา:</label>
          <select v-model="effectSizeCourseId" class="form-control">
            <option value="">-- ทุกรายวิชา --</option>
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.courseCode }} - {{ course.courseName }}
            </option>
          </select>
        </div>

        <button class="btn btn-primary" @click="calculateEffectSize" :disabled="effectSizeLoading">
          {{ effectSizeLoading ? '⏳ กำลังคำนวณ...' : '📊 คำนวณ Effect Size' }}
        </button>

        <div v-if="effectSizeResult" class="result-card">
          <h4>ผลการคำนวณ Effect Size</h4>
          <div class="metrics-grid">
            <div class="metric-item" v-for="dim in ['analysis', 'reasoning', 'creativity', 'evidence']" :key="dim">
              <span class="metric-value" :class="getEffectSizeClass(effectSizeResult.dimensions?.[dim]?.cohensD)">
                {{ effectSizeResult.dimensions?.[dim]?.cohensD?.toFixed(2) || 'N/A' }}
              </span>
              <span class="metric-label">{{ getDimensionName(dim) }} (d)</span>
            </div>
          </div>
          <div class="overall-result">
            <strong>Overall Effect:</strong> {{ effectSizeResult.interpretation }}
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Correlations -->
    <div v-show="activeTab === 'correlations'" class="tab-content">
      <div class="card">
        <h3>🔗 Correlation Analysis</h3>
        <p class="section-desc">วิเคราะห์ความสัมพันธ์ระหว่างตัวแปรต่างๆ</p>
        
        <button class="btn btn-primary" @click="runCorrelationAnalysis" :disabled="correlationLoading">
          {{ correlationLoading ? '⏳ กำลังวิเคราะห์...' : '🔄 วิเคราะห์ Correlation' }}
        </button>

        <div v-if="correlationResult" class="result-card">
          <h4>Correlation Matrix</h4>
          <div class="correlation-table-container">
            <table class="correlation-table">
              <thead>
                <tr>
                  <th></th>
                  <th v-for="variable in correlationResult.variables" :key="variable">{{ variable }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowVar) in correlationResult.matrix" :key="rowVar">
                  <td class="row-header">{{ rowVar }}</td>
                  <td 
                    v-for="(value, colVar) in row" 
                    :key="colVar"
                    :class="getCorrelationClass(value)"
                  >
                    {{ value?.toFixed(2) || '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: K-Anonymity -->
    <div v-show="activeTab === 'kanonymity'" class="tab-content">
      <div class="card">
        <h3>🔒 K-Anonymity Export</h3>
        <p class="section-desc">ส่งออกข้อมูลแบบ Privacy-Preserving ตามมาตรฐาน K-Anonymity</p>
        
        <div class="form-group">
          <label>ค่า K (ขั้นต่ำ):</label>
          <input type="number" v-model.number="kValue" min="2" max="10" class="form-control" style="width: 100px;">
          <small>ค่า K หมายถึง แต่ละกลุ่มต้องมีอย่างน้อย K records</small>
        </div>

        <div class="action-bar">
          <button class="btn btn-secondary" @click="assessReidentificationRisk" :disabled="kAnonymityLoading">
            🔍 ประเมินความเสี่ยง Re-identification
          </button>
          <button class="btn btn-primary" @click="exportKAnonymous" :disabled="kAnonymityLoading">
            {{ kAnonymityLoading ? '⏳ กำลังประมวลผล...' : '📦 Export K-Anonymous Data' }}
          </button>
        </div>

        <div v-if="reidentificationRisk" class="result-card warning">
          <h4>⚠️ ผลประเมินความเสี่ยง Re-identification</h4>
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-value" :class="getRiskClass(reidentificationRisk.overallRisk)">
                {{ reidentificationRisk.overallRisk }}
              </span>
              <span class="metric-label">Overall Risk Level</span>
            </div>
            <div class="metric-item">
              <span class="metric-value">{{ reidentificationRisk.uniqueRecords }}</span>
              <span class="metric-label">Unique Records</span>
            </div>
            <div class="metric-item">
              <span class="metric-value">{{ reidentificationRisk.kActual }}</span>
              <span class="metric-label">Actual K</span>
            </div>
          </div>
          <p v-if="reidentificationRisk.recommendations" class="recommendations">
            <strong>คำแนะนำ:</strong> {{ reidentificationRisk.recommendations }}
          </p>
        </div>
      </div>
    </div>

    <!-- Tab: Research Readiness -->
    <div v-show="activeTab === 'readiness'" class="tab-content">
      <div class="card">
        <h3>✅ Research Readiness v2</h3>
        <p class="section-desc">ตรวจสอบความพร้อมของข้อมูลสำหรับการวิจัย</p>
        
        <button class="btn btn-primary" @click="checkResearchReadiness" :disabled="readinessLoading">
          {{ readinessLoading ? '⏳ กำลังตรวจสอบ...' : '🔍 ตรวจสอบความพร้อม' }}
        </button>

        <div v-if="readinessResult" class="result-card">
          <h4>ผลการตรวจสอบความพร้อม</h4>
          
          <div class="readiness-score" :class="getReadinessClass(readinessResult.overallScore)">
            <span class="score-value">{{ readinessResult.overallScore }}%</span>
            <span class="score-label">Research Readiness Score</span>
          </div>

          <div class="checklist">
            <div 
              v-for="check in readinessResult.checks" 
              :key="check.name"
              class="check-item"
              :class="{ passed: check.passed, failed: !check.passed }"
            >
              <span class="check-icon">{{ check.passed ? '✅' : '❌' }}</span>
              <span class="check-name">{{ check.name }}</span>
              <span class="check-detail">{{ check.detail }}</span>
            </div>
          </div>

          <div v-if="readinessResult.powerAnalysis" class="power-analysis">
            <h5>📊 Statistical Power Analysis</h5>
            <div class="metrics-grid">
              <div class="metric-item">
                <span class="metric-value">{{ readinessResult.powerAnalysis.currentN }}</span>
                <span class="metric-label">Current N</span>
              </div>
              <div class="metric-item">
                <span class="metric-value">{{ readinessResult.powerAnalysis.requiredN }}</span>
                <span class="metric-label">Required N</span>
              </div>
              <div class="metric-item">
                <span class="metric-value">{{ readinessResult.powerAnalysis.power?.toFixed(2) }}</span>
                <span class="metric-label">Statistical Power</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Learning Sequences -->
    <div v-show="activeTab === 'sequences'" class="tab-content">
      <div class="card">
        <h3>📈 Learning Sequences</h3>
        <p class="section-desc">วิเคราะห์รูปแบบการเรียนรู้ตามลำดับ (Sequential Pattern Mining)</p>
        
        <div class="form-group">
          <label>เลือกรายวิชา:</label>
          <select v-model="sequenceCourseId" class="form-control">
            <option value="">-- ทุกรายวิชา --</option>
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.courseCode }} - {{ course.courseName }}
            </option>
          </select>
        </div>

        <button class="btn btn-primary" @click="getLearningSequences" :disabled="sequenceLoading">
          {{ sequenceLoading ? '⏳ กำลังโหลด...' : '📊 ดู Learning Sequences' }}
        </button>

        <div v-if="sequenceResult" class="result-card">
          <h4>Learning Sequence Patterns</h4>
          <div class="sequence-stats">
            <span>Total Sequences: {{ sequenceResult.totalSequences }}</span>
            <span>Avg Length: {{ sequenceResult.avgLength?.toFixed(1) }}</span>
          </div>
          
          <div class="sequence-patterns">
            <div 
              v-for="(pattern, idx) in sequenceResult.topPatterns?.slice(0, 10)" 
              :key="idx"
              class="pattern-item"
            >
              <span class="pattern-rank">#{{ idx + 1 }}</span>
              <span class="pattern-sequence">{{ pattern.sequence?.join(' → ') }}</span>
              <span class="pattern-count">{{ pattern.count }} ครั้ง</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Data Quality -->
    <div v-show="activeTab === 'quality'" class="tab-content">
      <div class="card">
        <h3>🔬 Data Quality Assessment</h3>
        <p class="section-desc">ประเมินคุณภาพและความครบถ้วนของข้อมูล</p>
        
        <button class="btn btn-primary" @click="checkDataQuality" :disabled="qualityLoading">
          {{ qualityLoading ? '⏳ กำลังตรวจสอบ...' : '🔍 ประเมินคุณภาพข้อมูล' }}
        </button>

        <div v-if="qualityResult" class="result-card">
          <h4>Data Quality Report</h4>
          
          <div class="quality-score" :class="getQualityClass(qualityResult.overallQuality)">
            <span class="score-value">{{ qualityResult.overallQuality }}%</span>
            <span class="score-label">Data Quality Score</span>
          </div>

          <div class="quality-metrics">
            <div class="quality-item">
              <span class="quality-label">Completeness:</span>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: qualityResult.completeness + '%' }"></div>
              </div>
              <span class="quality-value">{{ qualityResult.completeness }}%</span>
            </div>
            <div class="quality-item">
              <span class="quality-label">Consistency:</span>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: qualityResult.consistency + '%' }"></div>
              </div>
              <span class="quality-value">{{ qualityResult.consistency }}%</span>
            </div>
            <div class="quality-item">
              <span class="quality-label">Validity:</span>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: qualityResult.validity + '%' }"></div>
              </div>
              <span class="quality-value">{{ qualityResult.validity }}%</span>
            </div>
          </div>

          <div v-if="qualityResult.issues?.length > 0" class="quality-issues">
            <h5>⚠️ Issues Found:</h5>
            <ul>
              <li v-for="(issue, idx) in qualityResult.issues" :key="idx">{{ issue }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL

// Tab Navigation
const tabs = [
  { id: 'export', icon: '📦', label: 'Data Export' },
  { id: 'irr', icon: '📏', label: 'IRR Analysis' },
  { id: 'effectsize', icon: '📈', label: 'Effect Size' },
  { id: 'correlations', icon: '🔗', label: 'Correlations' },
  { id: 'kanonymity', icon: '🔒', label: 'K-Anonymity' },
  { id: 'readiness', icon: '✅', label: 'Readiness' },
  { id: 'sequences', icon: '📈', label: 'Sequences' },
  { id: 'quality', icon: '🔬', label: 'Data Quality' }
]
const activeTab = ref('export')

// State
const exporting = ref(false)
const courses = ref([])

// Options
const rq1DateRange = ref('all')
const rq2ValidatedOnly = ref(true)
const rq3CourseId = ref('')
const includeDataDict = ref(true)
const anonymizeData = ref(true)

// Research API States
const irrLoading = ref(false)
const irrResult = ref(null)
const effectSizeLoading = ref(false)
const effectSizeResult = ref(null)
const effectSizeCourseId = ref('')
const correlationLoading = ref(false)
const correlationResult = ref(null)
const kAnonymityLoading = ref(false)
const kValue = ref(5)
const reidentificationRisk = ref(null)
const readinessLoading = ref(false)
const readinessResult = ref(null)
const sequenceLoading = ref(false)
const sequenceResult = ref(null)
const sequenceCourseId = ref('')
const qualityLoading = ref(false)
const qualityResult = ref(null)

// Stats
const totalAssessments = ref(0)
const totalStudents = ref(0)
const totalSessions = ref(0)
const validatedAssessments = ref(0)
const teacherActions = ref(0)
const dateRange = ref('-')

// Record counts
const rq1RecordCount = ref(0)
const rq2RecordCount = ref(0)
const rq3RecordCount = ref(0)
const rq4RecordCount = ref(0)

// Helper: Create anonymized ID
function anonymizeId(id, prefix = 'S') {
  const hash = id.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
  return `${prefix}${Math.abs(hash).toString().padStart(5, '0').slice(0, 5)}`
}

// Helper functions for UI
function getDimensionName(dim) {
  const names = { analysis: 'วิเคราะห์', reasoning: 'เหตุผล', creativity: 'สร้างสรรค์', evidence: 'หลักฐาน' }
  return names[dim] || dim
}

function getEffectSizeClass(d) {
  if (!d) return ''
  if (d >= 0.8) return 'effect-large'
  if (d >= 0.5) return 'effect-medium'
  if (d >= 0.2) return 'effect-small'
  return 'effect-negligible'
}

function getCorrelationClass(value) {
  if (!value) return ''
  const abs = Math.abs(value)
  if (abs >= 0.7) return 'correlation-strong'
  if (abs >= 0.4) return 'correlation-moderate'
  return 'correlation-weak'
}

function getRiskClass(risk) {
  if (risk === 'HIGH') return 'risk-high'
  if (risk === 'MEDIUM') return 'risk-medium'
  return 'risk-low'
}

function getReadinessClass(score) {
  if (score >= 80) return 'readiness-good'
  if (score >= 60) return 'readiness-moderate'
  return 'readiness-poor'
}

function getQualityClass(score) {
  if (score >= 80) return 'quality-good'
  if (score >= 60) return 'quality-moderate'
  return 'quality-poor'
}

// Research API Functions
async function calculateIRR() {
  irrLoading.value = true
  try {
    const response = await fetch(`${functionsUrl}/calculateIRR`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()
    irrResult.value = data
  } catch (error) {
    console.error('IRR calculation error:', error)
    alert('เกิดข้อผิดพลาดในการคำนวณ IRR')
  } finally {
    irrLoading.value = false
  }
}

async function getIRRReport() {
  irrLoading.value = true
  try {
    const response = await fetch(`${functionsUrl}/irrReport`)
    const data = await response.json()
    irrResult.value = data
  } catch (error) {
    console.error('IRR report error:', error)
    alert('เกิดข้อผิดพลาดในการดึงรายงาน IRR')
  } finally {
    irrLoading.value = false
  }
}

async function calculateEffectSize() {
  effectSizeLoading.value = true
  try {
    const response = await fetch(`${functionsUrl}/calculateEffectSize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: effectSizeCourseId.value || undefined })
    })
    const data = await response.json()
    effectSizeResult.value = data
  } catch (error) {
    console.error('Effect size error:', error)
    alert('เกิดข้อผิดพลาดในการคำนวณ Effect Size')
  } finally {
    effectSizeLoading.value = false
  }
}

async function runCorrelationAnalysis() {
  correlationLoading.value = true
  try {
    const response = await fetch(`${functionsUrl}/correlationAnalysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()
    correlationResult.value = data
  } catch (error) {
    console.error('Correlation error:', error)
    alert('เกิดข้อผิดพลาดในการวิเคราะห์ Correlation')
  } finally {
    correlationLoading.value = false
  }
}

async function assessReidentificationRisk() {
  kAnonymityLoading.value = true
  try {
    const response = await fetch(`${functionsUrl}/assessReidentificationRiskAPI`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ k: kValue.value })
    })
    const data = await response.json()
    reidentificationRisk.value = data
  } catch (error) {
    console.error('Reidentification risk error:', error)
    alert('เกิดข้อผิดพลาดในการประเมินความเสี่ยง')
  } finally {
    kAnonymityLoading.value = false
  }
}

async function exportKAnonymous() {
  kAnonymityLoading.value = true
  try {
    const response = await fetch(`${functionsUrl}/exportKAnonymousDataAPI`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ k: kValue.value })
    })
    const data = await response.json()
    
    // Download as CSV
    if (data.csv) {
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + data.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `k${kValue.value}_anonymous_data_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
    
    alert(`Export สำเร็จ! Records: ${data.recordCount}`)
  } catch (error) {
    console.error('K-Anonymity export error:', error)
    alert('เกิดข้อผิดพลาดในการ Export')
  } finally {
    kAnonymityLoading.value = false
  }
}

async function checkResearchReadiness() {
  readinessLoading.value = true
  try {
    const response = await fetch(`${functionsUrl}/researchReadinessV2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()
    readinessResult.value = data
  } catch (error) {
    console.error('Research readiness error:', error)
    alert('เกิดข้อผิดพลาดในการตรวจสอบความพร้อม')
  } finally {
    readinessLoading.value = false
  }
}

async function getLearningSequences() {
  sequenceLoading.value = true
  try {
    const response = await fetch(`${functionsUrl}/getLearningSequences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: sequenceCourseId.value || undefined })
    })
    const data = await response.json()
    sequenceResult.value = data
  } catch (error) {
    console.error('Learning sequences error:', error)
    alert('เกิดข้อผิดพลาดในการโหลด Learning Sequences')
  } finally {
    sequenceLoading.value = false
  }
}

async function checkDataQuality() {
  qualityLoading.value = true
  try {
    const response = await fetch(`${functionsUrl}/researchDataQuality`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()
    qualityResult.value = data
  } catch (error) {
    console.error('Data quality error:', error)
    alert('เกิดข้อผิดพลาดในการประเมินคุณภาพข้อมูล')
  } finally {
    qualityLoading.value = false
  }
}

// Load data
async function loadStats() {
  try {
    // Assessments
    const assessmentsSnapshot = await getDocs(collection(db, 'assessments'))
    totalAssessments.value = assessmentsSnapshot.size
    rq3RecordCount.value = assessmentsSnapshot.size
    
    // Validated assessments
    const validatedQuery = query(
      collection(db, 'assessments'),
      where('expertValidation.isValidated', '==', true)
    )
    const validatedSnapshot = await getDocs(validatedQuery)
    validatedAssessments.value = validatedSnapshot.size
    rq2RecordCount.value = validatedSnapshot.size
    
    // Students
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'))
    const studentsSnapshot = await getDocs(studentsQuery)
    totalStudents.value = studentsSnapshot.size
    rq1RecordCount.value = studentsSnapshot.size
    
    // Sessions
    const sessionsSnapshot = await getDocs(collection(db, 'sessions'))
    totalSessions.value = sessionsSnapshot.size
    
    // Teacher actions
    const actionsSnapshot = await getDocs(collection(db, 'teacherActions'))
    teacherActions.value = actionsSnapshot.size
    rq4RecordCount.value = actionsSnapshot.size
    
    // Date range
    if (assessmentsSnapshot.docs.length > 0) {
      const dates = assessmentsSnapshot.docs
        .map(d => d.data().createdAt?.toDate?.())
        .filter(d => d)
        .sort((a, b) => a - b)
      
      if (dates.length > 0) {
        const start = dates[0].toLocaleDateString('th-TH')
        const end = dates[dates.length - 1].toLocaleDateString('th-TH')
        dateRange.value = `${start} - ${end}`
      }
    }
    
    // Courses
    const coursesRef = collection(db, 'courses')
    const coursesQuery = query(coursesRef, where('teacherId', '==', authStore.user.uid))
    const coursesSnapshot = await getDocs(coursesQuery)
    courses.value = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

// Export functions
async function exportRQ1() {
  exporting.value = true
  try {
    // Get students with experiment groups
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'))
    const studentsSnapshot = await getDocs(studentsQuery)
    
    // Get assessments for pretest/posttest
    const assessmentsSnapshot = await getDocs(collection(db, 'assessments'))
    const assessmentsByStudent = {}
    
    assessmentsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      if (!assessmentsByStudent[data.studentId]) {
        assessmentsByStudent[data.studentId] = []
      }
      assessmentsByStudent[data.studentId].push(data)
    })
    
    // Build CSV
    let csv = 'StudentID,ExperimentGroup,SessionCount,TotalTimeMinutes,'
    csv += 'Pretest_A,Pretest_R,Pretest_C,Pretest_E,Pretest_Total,'
    csv += 'Posttest_A,Posttest_R,Posttest_C,Posttest_E,Posttest_Total,Gain\n'
    
    studentsSnapshot.docs.forEach(doc => {
      const student = doc.data()
      const studentId = anonymizeData.value ? anonymizeId(doc.id) : doc.id
      const group = student.experimentGroup || 'unassigned'
      const assessments = assessmentsByStudent[doc.id] || []
      const sessionCount = [...new Set(assessments.map(a => a.sessionId))].length
      
      // Calculate total time (sum of answer durations)
      const totalTimeMs = assessments.reduce((sum, a) => sum + (a.timingMetrics?.answerDurationMs || 0), 0)
      const totalTimeMinutes = Math.round(totalTimeMs / 60000)
      
      // Find pretest and posttest (first and last assessments as proxy)
      const sorted = assessments.sort((a, b) => 
        (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0)
      )
      
      const pretest = sorted[0]?.rubricScores || { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
      const posttest = sorted[sorted.length - 1]?.rubricScores || pretest
      
      const pretestTotal = pretest.analysis + pretest.reasoning + pretest.creativity + pretest.evidence
      const posttestTotal = posttest.analysis + posttest.reasoning + posttest.creativity + posttest.evidence
      const gain = posttestTotal - pretestTotal
      
      csv += `${studentId},${group},${sessionCount},${totalTimeMinutes},`
      csv += `${pretest.analysis},${pretest.reasoning},${pretest.creativity},${pretest.evidence},${pretestTotal},`
      csv += `${posttest.analysis},${posttest.reasoning},${posttest.creativity},${posttest.evidence},${posttestTotal},${gain}\n`
    })
    
    downloadCSV(csv, 'rq1_effectiveness_data')
  } catch (error) {
    console.error('Export error:', error)
    alert('เกิดข้อผิดพลาดในการ Export')
  } finally {
    exporting.value = false
  }
}

async function exportRQ2() {
  exporting.value = true
  try {
    let q = collection(db, 'assessments')
    if (rq2ValidatedOnly.value) {
      q = query(q, where('expertValidation.isValidated', '==', true))
    }
    
    const snapshot = await getDocs(q)
    
    let csv = 'AssessmentID,AI_A,AI_R,AI_C,AI_E,AI_Total,'
    csv += 'Expert_A,Expert_R,Expert_C,Expert_E,Expert_Total,'
    csv += 'AgreementScore,ScoreDifference,PromptVersion,ModelVersion,'
    csv += 'WordCount,CharCount,AnswerDurationMs\n'
    
    snapshot.docs.forEach(doc => {
      const data = doc.data()
      const assessmentId = anonymizeData.value ? anonymizeId(doc.id, 'A') : doc.id
      
      const ai = data.rubricScores || {}
      const aiTotal = (ai.analysis || 0) + (ai.reasoning || 0) + (ai.creativity || 0) + (ai.evidence || 0)
      
      const expert = data.expertValidation?.expertScores || {}
      const expertTotal = (expert.analysis || 0) + (expert.reasoning || 0) + (expert.creativity || 0) + (expert.evidence || 0)
      
      csv += `${assessmentId},`
      csv += `${ai.analysis || 0},${ai.reasoning || 0},${ai.creativity || 0},${ai.evidence || 0},${aiTotal},`
      csv += `${expert.analysis || 0},${expert.reasoning || 0},${expert.creativity || 0},${expert.evidence || 0},${expertTotal},`
      csv += `${data.expertValidation?.agreementScore || ''},${data.expertValidation?.scoreDifference || ''},`
      csv += `${data.promptVersion || ''},${data.aiModel || ''},`
      csv += `${data.answerMetrics?.wordCount || ''},${data.answerMetrics?.charCount || ''},`
      csv += `${data.timingMetrics?.answerDurationMs || ''}\n`
    })
    
    downloadCSV(csv, 'rq2_validity_data')
  } catch (error) {
    console.error('Export error:', error)
    alert('เกิดข้อผิดพลาดในการ Export')
  } finally {
    exporting.value = false
  }
}

async function exportRQ3() {
  exporting.value = true
  try {
    let q = collection(db, 'assessments')
    if (rq3CourseId.value) {
      q = query(q, where('courseId', '==', rq3CourseId.value))
    }
    
    const snapshot = await getDocs(q)
    
    let csv = 'StudentID,SessionID,AssessmentID,Timestamp,WeekOfTerm,'
    csv += 'WordCount,CharCount,SentenceCount,UniqueWordRatio,'
    csv += 'AnswerDurationMs,FirstKeystrokeMs,ThinkingPauseCount,RevisionCount,TypingSpeed,'
    csv += 'Score_A,Score_R,Score_C,Score_E,Score_Total,LO_Passed\n'
    
    snapshot.docs.forEach(doc => {
      const data = doc.data()
      const studentId = anonymizeData.value ? anonymizeId(data.studentId) : data.studentId
      const sessionId = anonymizeData.value ? anonymizeId(data.sessionId, 'SS') : data.sessionId
      const assessmentId = anonymizeData.value ? anonymizeId(doc.id, 'A') : doc.id
      
      const timestamp = data.createdAt?.toDate?.()?.toISOString() || ''
      const weekOfTerm = data.assessmentContext?.weekOfTerm || ''
      
      const metrics = data.answerMetrics || {}
      const timing = data.timingMetrics || {}
      const revision = data.revisionMetrics || {}
      const scores = data.rubricScores || {}
      const total = (scores.analysis || 0) + (scores.reasoning || 0) + (scores.creativity || 0) + (scores.evidence || 0)
      const loPassed = (data.loAssessment?.passedLOs || []).join(';')
      
      csv += `${studentId},${sessionId},${assessmentId},${timestamp},${weekOfTerm},`
      csv += `${metrics.wordCount || ''},${metrics.charCount || ''},${metrics.sentenceCount || ''},${metrics.uniqueWordRatio || ''},`
      csv += `${timing.answerDurationMs || ''},${timing.firstKeystrokeMs || ''},${timing.thinkingPauseCount || ''},${revision.revisionCount || ''},${timing.avgTypingSpeed || ''},`
      csv += `${scores.analysis || 0},${scores.reasoning || 0},${scores.creativity || 0},${scores.evidence || 0},${total},${loPassed}\n`
    })
    
    downloadCSV(csv, 'rq3_learning_analytics_data')
  } catch (error) {
    console.error('Export error:', error)
    alert('เกิดข้อผิดพลาดในการ Export')
  } finally {
    exporting.value = false
  }
}

async function exportRQ4() {
  exporting.value = true
  try {
    const snapshot = await getDocs(collection(db, 'teacherActions'))
    
    let csv = 'TeacherID,ActionType,ActionCategory,TargetType,TargetID,'
    csv += 'ViewDurationMs,ScrollDepth,InteractionCount,'
    csv += 'WasAIRecommended,TeacherAccepted,Timestamp\n'
    
    snapshot.docs.forEach(doc => {
      const data = doc.data()
      const teacherId = anonymizeData.value ? anonymizeId(data.teacherId, 'T') : data.teacherId
      const targetId = anonymizeData.value ? anonymizeId(data.targetId || '', 'X') : (data.targetId || '')
      
      const timestamp = data.timestamp?.toDate?.()?.toISOString() || ''
      const context = data.context || {}
      const ai = data.aiContext || {}
      
      csv += `${teacherId},${data.actionType || ''},${data.actionCategory || ''},`
      csv += `${data.targetType || ''},${targetId},`
      csv += `${context.viewDurationMs || ''},${context.scrollDepth || ''},${context.interactionCount || ''},`
      csv += `${ai.wasAIRecommended || false},${ai.teacherAccepted || ''},${timestamp}\n`
    })
    
    downloadCSV(csv, 'rq4_teacher_actions_data')
  } catch (error) {
    console.error('Export error:', error)
    alert('เกิดข้อผิดพลาดในการ Export')
  } finally {
    exporting.value = false
  }
}

async function exportAll() {
  exporting.value = true
  try {
    // Export all datasets
    await exportRQ1()
    await exportRQ2()
    await exportRQ3()
    await exportRQ4()
    
    alert('Export ทั้งหมดสำเร็จ! ไฟล์ถูกดาวน์โหลดแยกกัน')
  } catch (error) {
    console.error('Export error:', error)
  } finally {
    exporting.value = false
  }
}

function downloadCSV(content, filename) {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.research-export {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d1421 100%);
  padding: 1.5rem;
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

/* Hero Header */
.hero-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  text-decoration: none;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(-3px);
}

.hero-content {
  flex: 1;
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
  margin: 0 0 0.75rem;
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1rem;
  line-height: 1.6;
}

/* Glass Panel */
.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border-radius: 16px;
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

/* Legacy card override */
.card {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Export Grid */
.export-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  position: relative;
  z-index: 1;
}

.export-card {
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
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

.card-icon-wrap.rq1 {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.card-icon-wrap.rq2 {
  background: linear-gradient(135deg, rgba(240, 147, 251, 0.2), rgba(245, 87, 108, 0.2));
  border: 1px solid rgba(240, 147, 251, 0.3);
}

.card-icon-wrap.rq3 {
  background: linear-gradient(135deg, rgba(79, 172, 254, 0.2), rgba(0, 242, 254, 0.2));
  border: 1px solid rgba(79, 172, 254, 0.3);
}

.card-icon-wrap.rq4 {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(52, 211, 153, 0.2));
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.card-icon {
  font-size: 1.75rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
}

.card-header p {
  margin: 0.25rem 0 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
}

.card-body {
  flex: 1;
  padding: 1.5rem;
}

.data-preview {
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.data-preview strong {
  display: block;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.data-preview ul {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.data-preview li {
  margin-bottom: 0.35rem;
}

.export-options {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.export-options label {
  font-size: 0.875rem;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.7);
}

.form-control {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: rgba(102, 126, 234, 0.5);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.form-control option {
  background: #1a1a3e;
  color: #fff;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.1);
}

.record-count {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  padding: 0.35rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
}

/* Combined Export - Highlight Card */
.highlight-card {
  position: relative;
  z-index: 1;
}

.highlight-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(240, 147, 251, 0.1));
  border-radius: 20px;
  pointer-events: none;
}

.combined-export {
  text-align: center;
  padding: 2.5rem;
  margin-bottom: 2rem;
}

.combined-export h3 {
  margin: 0 0 0.75rem;
  font-size: 1.5rem;
  color: #fff;
}

.combined-export > p {
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 2rem;
}

.combined-options {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

/* Custom Checkbox */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  transition: color 0.2s;
}

.checkbox-label:hover {
  color: #fff;
}

.checkbox-label input {
  display: none;
}

.checkbox-custom {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  position: relative;
  transition: all 0.2s;
}

.checkbox-label input:checked + .checkbox-custom {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-color: transparent;
}

.checkbox-label input:checked + .checkbox-custom::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 12px;
  font-weight: bold;
}

.combined-options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

/* Data Summary */
.data-summary {
  padding: 2rem;
  position: relative;
  z-index: 1;
}

.data-summary h3 {
  margin: 0 0 1.5rem;
  font-size: 1.25rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.summary-item,
.glass-stat {
  text-align: center;
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.glass-stat:hover {
  background: rgba(0, 0, 0, 0.3);
  transform: translateY(-2px);
}

.summary-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.summary-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.25rem;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
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

.btn-lg {
  padding: 1.25rem 2.5rem;
  font-size: 1.1rem;
  border-radius: 16px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}

/* Tab Navigation */
.tab-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
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

.tab-content {
  animation: fadeIn 0.4s ease;
  position: relative;
  z-index: 1;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Section styling */
.section-desc {
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 1.5rem;
  font-size: 0.95rem;
  line-height: 1.6;
}

.action-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.form-group small {
  display: block;
  margin-top: 0.35rem;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
}

/* Result Cards */
.result-card,
.glass-result {
  margin-top: 1.5rem;
  padding: 1.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.result-card h4 {
  margin: 0 0 1.25rem;
  font-size: 1.1rem;
  color: #fff;
}

.result-card.warning {
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.08);
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.metric-item,
.glass-metric {
  text-align: center;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.3s ease;
}

.glass-metric:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-2px);
}

.metric-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.metric-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.25rem;
}

/* Effect Size Classes */
.effect-large { 
  background: linear-gradient(135deg, #10b981, #34d399) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}
.effect-medium { 
  background: linear-gradient(135deg, #3b82f6, #60a5fa) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}
.effect-small { 
  background: linear-gradient(135deg, #f59e0b, #fbbf24) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}
.effect-negligible { color: #6b7280 !important; }

/* Correlation Table */
.correlation-table-container {
  overflow-x: auto;
  margin-top: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.correlation-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.correlation-table th,
.correlation-table td {
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  text-align: center;
}

.correlation-table th,
.correlation-table .row-header {
  background: rgba(255, 255, 255, 0.05);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.correlation-strong { background: rgba(16, 185, 129, 0.15); }
.correlation-moderate { background: rgba(59, 130, 246, 0.15); }
.correlation-weak { background: transparent; }

/* Risk Classes */
.risk-high { color: #ef4444 !important; }
.risk-medium { color: #f59e0b !important; }
.risk-low { color: #10b981 !important; }

/* Readiness Score */
.readiness-score,
.quality-score {
  text-align: center;
  padding: 2rem;
  margin-bottom: 1.5rem;
  border-radius: 20px;
}

.readiness-good,
.quality-good { 
  background: rgba(16, 185, 129, 0.08); 
  border: 2px solid rgba(16, 185, 129, 0.5);
  box-shadow: 0 0 30px rgba(16, 185, 129, 0.15);
}
.readiness-moderate,
.quality-moderate { 
  background: rgba(245, 158, 11, 0.08); 
  border: 2px solid rgba(245, 158, 11, 0.5);
  box-shadow: 0 0 30px rgba(245, 158, 11, 0.15);
}
.readiness-poor,
.quality-poor { 
  background: rgba(239, 68, 68, 0.08); 
  border: 2px solid rgba(239, 68, 68, 0.5);
  box-shadow: 0 0 30px rgba(239, 68, 68, 0.15);
}

.score-value {
  display: block;
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.score-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.5rem;
}

/* Checklist */
.checklist {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s ease;
}

.check-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.check-item.passed { border-left: 4px solid #10b981; }
.check-item.failed { border-left: 4px solid #ef4444; }

.check-icon { font-size: 1.3rem; }
.check-name { font-weight: 600; flex: 1; color: #fff; }
.check-detail { color: rgba(255, 255, 255, 0.5); font-size: 0.85rem; }

/* Power Analysis */
.power-analysis {
  margin-top: 1.5rem;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.power-analysis h5 {
  margin: 0 0 1rem;
  color: rgba(255, 255, 255, 0.8);
}

/* Quality Metrics */
.quality-metrics {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.quality-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.quality-label {
  width: 120px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.progress-bar {
  flex: 1;
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width 0.5s ease;
  border-radius: 5px;
}

.quality-value {
  width: 50px;
  text-align: right;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
}

.quality-issues {
  margin-top: 1.5rem;
  padding: 1.25rem;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 14px;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.quality-issues h5 {
  margin: 0 0 0.75rem;
  color: #ef4444;
}

.quality-issues ul {
  margin: 0;
  padding-left: 1.5rem;
  color: rgba(255, 255, 255, 0.7);
}

.quality-issues li {
  margin-bottom: 0.5rem;
}

/* Sequence Patterns */
.sequence-stats {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
}

.sequence-patterns {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.pattern-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s ease;
}

.pattern-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.pattern-rank {
  font-weight: 800;
  font-size: 1.1rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  width: 35px;
}

.pattern-sequence {
  flex: 1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
}

.pattern-count {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
}

.interpretation {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border-left: 3px solid #667eea;
  font-style: italic;
  color: rgba(255, 255, 255, 0.7);
}

.recommendations {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border-left: 3px solid #f59e0b;
  color: rgba(255, 255, 255, 0.8);
}

.overall-result {
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border-radius: 12px;
  text-align: center;
  font-weight: 600;
  color: #fff;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .hero-header {
    flex-direction: column;
    text-align: center;
  }
  
  .hero-title {
    font-size: 1.75rem;
  }
  
  .tab-nav {
    justify-content: center;
  }
  
  .tab-label {
    display: none;
  }
  
  .export-grid {
    grid-template-columns: 1fr;
  }
  
  .combined-options {
    flex-direction: column;
    gap: 1rem;
  }
  
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
