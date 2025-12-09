<template>
  <div class="research-export">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <router-link to="/teacher" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <div class="header-text">
          <h1>📦 Research Data Export</h1>
          <p>ส่งออกข้อมูลสำหรับการวิเคราะห์ทางสถิติ</p>
        </div>
      </div>
    </div>

    <!-- Export Options -->
    <div class="export-grid">
      <!-- RQ1: Effectiveness Data -->
      <div class="export-card card">
        <div class="card-header">
          <span class="card-icon">📊</span>
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
      <div class="export-card card">
        <div class="card-header">
          <span class="card-icon">🔬</span>
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
      <div class="export-card card">
        <div class="card-header">
          <span class="card-icon">📈</span>
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
      <div class="export-card card">
        <div class="card-header">
          <span class="card-icon">👩‍🏫</span>
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
    <div class="combined-export card">
      <h3>📁 Export ทั้งหมด (ZIP)</h3>
      <p>ดาวน์โหลดข้อมูลทั้ง 4 RQ blocks พร้อม Data Dictionary</p>
      <div class="combined-options">
        <label>
          <input type="checkbox" v-model="includeDataDict" />
          รวม Data Dictionary (PDF)
        </label>
        <label>
          <input type="checkbox" v-model="anonymizeData" checked />
          Anonymize ข้อมูล (แนะนำ)
        </label>
      </div>
      <button class="btn btn-lg btn-primary" @click="exportAll" :disabled="exporting">
        <span class="material-icons">folder_zip</span>
        {{ exporting ? 'กำลัง Export...' : 'Export All (ZIP)' }}
      </button>
    </div>

    <!-- Data Summary -->
    <div class="data-summary card">
      <h3>📊 สรุปข้อมูลในระบบ</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-value">{{ totalAssessments }}</span>
          <span class="summary-label">Total Assessments</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">{{ totalStudents }}</span>
          <span class="summary-label">Students</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">{{ totalSessions }}</span>
          <span class="summary-label">Sessions</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">{{ validatedAssessments }}</span>
          <span class="summary-label">Expert Validated</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">{{ teacherActions }}</span>
          <span class="summary-label">Teacher Actions</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">{{ dateRange }}</span>
          <span class="summary-label">Date Range</span>
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

// State
const exporting = ref(false)
const courses = ref([])

// Options
const rq1DateRange = ref('all')
const rq2ValidatedOnly = ref(true)
const rq3CourseId = ref('')
const includeDataDict = ref(true)
const anonymizeData = ref(true)

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
  background: var(--bg-primary);
  padding: 1.5rem;
}

.page-header {
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  text-decoration: none;
}

.header-text h1 {
  margin: 0;
  font-size: 1.5rem;
}

.header-text p {
  margin: 0.25rem 0 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.card {
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

/* Export Grid */
.export-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.export-card {
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.card-icon {
  font-size: 2rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1rem;
}

.card-header p {
  margin: 0.25rem 0 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.card-body {
  flex: 1;
  padding: 1.25rem;
}

.data-preview {
  margin-bottom: 1rem;
}

.data-preview strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.data-preview ul {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.data-preview li {
  margin-bottom: 0.25rem;
}

.export-options {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.export-options label {
  font-size: 0.875rem;
  white-space: nowrap;
}

.form-control {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-color);
}

.record-count {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Combined Export */
.combined-export {
  text-align: center;
  padding: 2rem;
  margin-bottom: 2rem;
}

.combined-export h3 {
  margin: 0 0 0.5rem;
}

.combined-export > p {
  color: var(--text-secondary);
  margin: 0 0 1.5rem;
}

.combined-options {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.combined-options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

/* Data Summary */
.data-summary {
  padding: 1.5rem;
}

.data-summary h3 {
  margin: 0 0 1rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.summary-item {
  text-align: center;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.summary-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #3b82f6;
}

.summary-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-lg {
  padding: 1rem 2rem;
  font-size: 1rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
