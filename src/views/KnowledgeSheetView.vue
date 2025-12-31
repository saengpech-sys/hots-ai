<template>
  <div class="knowledge-sheet-view">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>กำลังโหลดใบความรู้...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <span class="material-icons">error_outline</span>
      <h2>ไม่พบใบความรู้</h2>
      <p>{{ error }}</p>
      <button @click="$router.push('/learning-rooms')" class="btn btn-primary">
        <span class="material-icons">arrow_back</span>
        กลับ
      </button>
    </div>

    <!-- Knowledge Sheet Content -->
    <div v-else-if="knowledgeSheet" class="ks-container">
      <!-- Header -->
      <div class="ks-header" :class="{ 'print-mode': isPrintMode }">
        <div class="header-top">
          <button v-if="!isPrintMode" @click="$router.push('/learning-rooms')" class="btn-back">
            <span class="material-icons">arrow_back</span>
          </button>
          <div class="header-badges">
            <span class="badge unit">หน่วยที่ {{ ks.metadata?.unitNumber || 1 }}</span>
            <span class="badge plan">แผนที่ {{ ks.metadata?.planNumber || 1 }}</span>
            <span class="badge grade">{{ ks.metadata?.gradeLevel || 'ม.4' }}</span>
          </div>
          <div v-if="!isPrintMode" class="header-actions">
            <button @click="printSheet" class="btn-icon" title="พิมพ์">
              <span class="material-icons">print</span>
            </button>
            <button @click="toggleBookmark" class="btn-icon" :class="{ bookmarked: isBookmarked }" title="บุ๊กมาร์ก">
              <span class="material-icons">{{ isBookmarked ? 'bookmark' : 'bookmark_border' }}</span>
            </button>
          </div>
        </div>

        <div class="header-main">
          <span class="sheet-icon">📖</span>
          <div class="header-text">
            <h1>{{ ks.metadata?.title || 'ใบความรู้' }}</h1>
            <p class="course-info">
              {{ ks.metadata?.courseCode }} - {{ ks.metadata?.courseName }}
            </p>
          </div>
        </div>

        <div class="header-meta">
          <span>⏱️ {{ ks.metadata?.duration || '50 นาที' }}</span>
          <span>📅 {{ formatDate(ks.createdAt) }}</span>
        </div>
      </div>

      <!-- Table of Contents -->
      <nav v-if="!isPrintMode" class="toc-nav">
        <h3>📑 สารบัญ</h3>
        <ul>
          <li v-if="ks.objectives" @click="scrollTo('objectives')">🎯 จุดประสงค์การเรียนรู้</li>
          <li v-if="ks.introduction" @click="scrollTo('introduction')">💡 บทนำ</li>
          <li v-for="(section, idx) in ks.sections" :key="idx" @click="scrollTo('section-' + idx)">
            📚 {{ section.title }}
          </li>
          <li v-if="ks.vocabulary?.length" @click="scrollTo('vocabulary')">📖 คำศัพท์สำคัญ</li>
          <li v-if="ks.hotsIntegration" @click="scrollTo('hots')">🧠 คำถาม HOTS</li>
          <li v-if="ks.summary" @click="scrollTo('summary')">📝 สรุป</li>
          <li v-if="ks.selfCheck" @click="scrollTo('selfcheck')">✅ ทดสอบตนเอง</li>
          <li v-if="ks.additionalResources?.length" @click="scrollTo('resources')">🔗 แหล่งเรียนรู้</li>
        </ul>
      </nav>

      <!-- Main Content -->
      <main class="ks-content">
        <!-- Objectives Section -->
        <section v-if="ks.objectives" id="objectives" class="ks-section objectives-section">
          <h2><span class="section-icon">🎯</span> จุดประสงค์การเรียนรู้</h2>
          <div class="objectives-content">
            <p v-if="ks.objectives.mainObjective" class="main-objective">
              {{ ks.objectives.mainObjective }}
            </p>
            <ul v-if="ks.objectives.subObjectives?.length" class="sub-objectives">
              <li v-for="(obj, idx) in ks.objectives.subObjectives" :key="idx">
                {{ obj }}
              </li>
            </ul>
          </div>
        </section>

        <!-- Introduction Section -->
        <section v-if="ks.introduction" id="introduction" class="ks-section intro-section">
          <h2><span class="section-icon">💡</span> บทนำ</h2>
          <div class="intro-content">
            <div v-if="ks.introduction.hook" class="hook-box">
              <span class="hook-icon">💬</span>
              <p>{{ ks.introduction.hook }}</p>
            </div>
            <p v-if="ks.introduction.overview" class="overview">
              {{ ks.introduction.overview }}
            </p>
            <div v-if="ks.introduction.priorKnowledge?.length" class="prior-knowledge">
              <h4>📚 ความรู้พื้นฐานที่ควรมี:</h4>
              <ul>
                <li v-for="(pk, idx) in ks.introduction.priorKnowledge" :key="idx">{{ pk }}</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Main Content Sections -->
        <section 
          v-for="(section, idx) in ks.sections" 
          :key="idx" 
          :id="'section-' + idx" 
          class="ks-section content-section"
        >
          <h2>
            <span class="section-number">{{ section.sectionNumber || idx + 1 }}</span>
            {{ section.title }}
          </h2>

          <!-- ARCE Focus Tags -->
          <div v-if="section.arceFocus?.length" class="arce-tags">
            <span v-for="focus in section.arceFocus" :key="focus" :class="['arce-tag', focus]">
              {{ getArceLabelIcon(focus) }} {{ getArceLabel(focus) }}
            </span>
          </div>

          <!-- Main Content -->
          <div class="section-content">
            <div v-if="section.content?.mainContent" class="main-content" v-html="formatContent(section.content.mainContent)">
            </div>

            <!-- Key Points -->
            <div v-if="section.content?.keyPoints?.length" class="key-points">
              <h4>📌 ประเด็นสำคัญ</h4>
              <ul>
                <li v-for="(point, pIdx) in section.content.keyPoints" :key="pIdx">
                  {{ point }}
                </li>
              </ul>
            </div>

            <!-- Explanation -->
            <div v-if="section.content?.explanation" class="explanation-box">
              <span class="material-icons">lightbulb</span>
              <p>{{ section.content.explanation }}</p>
            </div>
          </div>

          <!-- Examples -->
          <div v-if="section.examples?.length" class="examples-container">
            <h4>💡 ตัวอย่าง</h4>
            <div v-for="(example, eIdx) in section.examples" :key="eIdx" class="example-card">
              <h5>{{ example.title }}</h5>
              <div v-if="example.scenario" class="example-scenario">
                <strong>สถานการณ์:</strong> {{ example.scenario }}
              </div>
              <div v-if="example.analysis" class="example-analysis">
                <strong>การวิเคราะห์:</strong> {{ example.analysis }}
              </div>
              <div v-if="example.solution" class="example-solution">
                <strong>ผลลัพธ์:</strong> {{ example.solution }}
              </div>
            </div>
          </div>

          <!-- Diagrams -->
          <div v-if="section.diagrams?.length" class="diagrams-container">
            <div v-for="(diagram, dIdx) in section.diagrams" :key="dIdx" class="diagram-card">
              <h5>📊 {{ diagram.title }}</h5>
              <div class="diagram-content">
                <p>{{ diagram.description }}</p>
              </div>
            </div>
          </div>

          <!-- Tables -->
          <div v-if="section.tables?.length" class="tables-container">
            <div v-for="(table, tIdx) in section.tables" :key="tIdx" class="table-wrapper">
              <h5>📋 {{ table.title }}</h5>
              <table class="data-table">
                <thead>
                  <tr>
                    <th v-for="(header, hIdx) in table.headers" :key="hIdx">{{ header }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rIdx) in table.rows" :key="rIdx">
                    <td v-for="(cell, cIdx) in row" :key="cIdx">{{ cell }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Techniques -->
          <div v-if="section.techniques?.length" class="techniques-container">
            <h4>🛠️ เทคนิค</h4>
            <div class="techniques-grid">
              <div v-for="(tech, techIdx) in section.techniques" :key="techIdx" class="technique-card">
                <h5>{{ tech.name }}</h5>
                <p>{{ tech.description }}</p>
                <div v-if="tech.pros?.length" class="pros-cons">
                  <div class="pros">
                    <strong>✅ ข้อดี:</strong>
                    <ul><li v-for="(pro, pIdx) in tech.pros" :key="pIdx">{{ pro }}</li></ul>
                  </div>
                  <div v-if="tech.cons?.length" class="cons">
                    <strong>❌ ข้อจำกัด:</strong>
                    <ul><li v-for="(con, cIdx) in tech.cons" :key="cIdx">{{ con }}</li></ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Real World Applications -->
          <div v-if="section.realWorldApplications?.length" class="applications">
            <h4>🌍 การประยุกต์ใช้ในชีวิตจริง</h4>
            <div class="applications-list">
              <span v-for="(app, aIdx) in section.realWorldApplications" :key="aIdx" class="app-tag">
                {{ app }}
              </span>
            </div>
          </div>
        </section>

        <!-- Vocabulary Section -->
        <section v-if="ks.vocabulary?.length" id="vocabulary" class="ks-section vocab-section">
          <h2><span class="section-icon">📖</span> คำศัพท์สำคัญ</h2>
          <div class="vocab-grid">
            <div v-for="(vocab, vIdx) in ks.vocabulary" :key="vIdx" class="vocab-card">
              <div class="vocab-term">{{ vocab.term }}</div>
              <div class="vocab-thai">{{ vocab.thai }}</div>
              <div class="vocab-def">{{ vocab.definition }}</div>
            </div>
          </div>
        </section>

        <!-- HOTS Questions Section -->
        <section v-if="ks.hotsIntegration" id="hots" class="ks-section hots-section">
          <h2><span class="section-icon">🧠</span> คำถามท้าทายความคิด (HOTS)</h2>
          <p class="hots-intro">คำถามเหล่านี้ออกแบบมาเพื่อกระตุ้นการคิดขั้นสูงตามกรอบ A.R.C.E.</p>
          
          <div class="hots-grid">
            <!-- Analysis -->
            <div v-if="ks.hotsIntegration.analysisQuestions?.length" class="hots-card analysis">
              <div class="hots-header">
                <span class="hots-icon">🔍</span>
                <h4>Analysis (การวิเคราะห์)</h4>
              </div>
              <ul>
                <li v-for="(q, qIdx) in ks.hotsIntegration.analysisQuestions" :key="qIdx">{{ q }}</li>
              </ul>
            </div>

            <!-- Reasoning -->
            <div v-if="ks.hotsIntegration.reasoningQuestions?.length" class="hots-card reasoning">
              <div class="hots-header">
                <span class="hots-icon">💡</span>
                <h4>Reasoning (การให้เหตุผล)</h4>
              </div>
              <ul>
                <li v-for="(q, qIdx) in ks.hotsIntegration.reasoningQuestions" :key="qIdx">{{ q }}</li>
              </ul>
            </div>

            <!-- Creativity -->
            <div v-if="ks.hotsIntegration.creativityQuestions?.length" class="hots-card creativity">
              <div class="hots-header">
                <span class="hots-icon">✨</span>
                <h4>Creativity (ความคิดสร้างสรรค์)</h4>
              </div>
              <ul>
                <li v-for="(q, qIdx) in ks.hotsIntegration.creativityQuestions" :key="qIdx">{{ q }}</li>
              </ul>
            </div>

            <!-- Evidence -->
            <div v-if="ks.hotsIntegration.evidenceQuestions?.length" class="hots-card evidence">
              <div class="hots-header">
                <span class="hots-icon">📚</span>
                <h4>Evidence (การใช้หลักฐาน)</h4>
              </div>
              <ul>
                <li v-for="(q, qIdx) in ks.hotsIntegration.evidenceQuestions" :key="qIdx">{{ q }}</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Summary Section -->
        <section v-if="ks.summary" id="summary" class="ks-section summary-section">
          <h2><span class="section-icon">📝</span> สรุปท้ายบท</h2>
          
          <div v-if="ks.summary.keyTakeaways?.length" class="key-takeaways">
            <h4>🎯 สิ่งสำคัญที่ควรจำ</h4>
            <ul>
              <li v-for="(takeaway, tIdx) in ks.summary.keyTakeaways" :key="tIdx">
                {{ takeaway }}
              </li>
            </ul>
          </div>

          <div v-if="ks.summary.mindMap" class="mindmap-container">
            <h4>🗺️ Mind Map</h4>
            <div class="mindmap">
              <div class="mindmap-center">{{ ks.summary.mindMap.central }}</div>
              <div class="mindmap-branches">
                <div v-for="(branch, bIdx) in ks.summary.mindMap.branches" :key="bIdx" class="mindmap-branch">
                  <div class="branch-topic">{{ branch.topic }}</div>
                  <ul class="branch-subtopics">
                    <li v-for="(sub, sIdx) in branch.subtopics || branch.items" :key="sIdx">{{ sub }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Self-Check Section -->
        <section v-if="ks.selfCheck" id="selfcheck" class="ks-section selfcheck-section">
          <h2><span class="section-icon">✅</span> ทดสอบความเข้าใจ</h2>
          
          <div v-if="ks.selfCheck.questions?.length" class="selfcheck-questions">
            <div v-for="(q, qIdx) in ks.selfCheck.questions" :key="qIdx" class="selfcheck-item">
              <div class="question-header">
                <span class="q-number">{{ qIdx + 1 }}</span>
                <span class="q-type">{{ getQuestionTypeLabel(q.type) }}</span>
              </div>
              <p class="question-text">{{ q.question }}</p>
              <div v-if="q.hint && !showAnswers[qIdx]" class="hint-box">
                <span class="material-icons">tips_and_updates</span>
                คำใบ้: {{ q.hint }}
              </div>
              <div v-if="showAnswers[qIdx] && q.answer" class="answer-box">
                <span class="material-icons">check_circle</span>
                คำตอบ: {{ q.answer }}
              </div>
              <button v-if="q.answer" @click="toggleAnswer(qIdx)" class="btn-show-answer">
                {{ showAnswers[qIdx] ? 'ซ่อนคำตอบ' : 'ดูคำตอบ' }}
              </button>
            </div>
          </div>

          <div v-if="ks.selfCheck.trueOrFalse?.length" class="truefalse-section">
            <h4>ถูก หรือ ผิด?</h4>
            <div v-for="(tf, tfIdx) in ks.selfCheck.trueOrFalse" :key="tfIdx" class="truefalse-item">
              <p class="tf-statement">{{ tf.statement }}</p>
              <div class="tf-buttons">
                <button 
                  @click="checkTrueFalse(tfIdx, true)" 
                  :class="['tf-btn', { correct: tfAnswers[tfIdx] === true && tf.answer === true, wrong: tfAnswers[tfIdx] === true && tf.answer === false }]"
                >
                  ถูก
                </button>
                <button 
                  @click="checkTrueFalse(tfIdx, false)" 
                  :class="['tf-btn', { correct: tfAnswers[tfIdx] === false && tf.answer === false, wrong: tfAnswers[tfIdx] === false && tf.answer === true }]"
                >
                  ผิด
                </button>
              </div>
              <div v-if="tfAnswers[tfIdx] !== undefined" class="tf-feedback">
                <span v-if="tfAnswers[tfIdx] === tf.answer" class="correct-text">✅ ถูกต้อง!</span>
                <span v-else class="wrong-text">❌ ไม่ถูกต้อง</span>
                <p v-if="tf.explanation" class="explanation">{{ tf.explanation }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Additional Resources Section -->
        <section v-if="ks.additionalResources?.length" id="resources" class="ks-section resources-section">
          <h2><span class="section-icon">🔗</span> แหล่งเรียนรู้เพิ่มเติม</h2>
          <div class="resources-grid">
            <a 
              v-for="(res, rIdx) in ks.additionalResources" 
              :key="rIdx" 
              :href="res.url || '#'" 
              target="_blank"
              class="resource-card"
            >
              <span class="resource-icon">{{ getResourceIcon(res.type) }}</span>
              <div class="resource-info">
                <h5>{{ res.title }}</h5>
                <p v-if="res.description">{{ res.description }}</p>
                <p v-if="res.author" class="author">โดย {{ res.author }}</p>
                <p v-if="res.duration" class="duration">⏱️ {{ res.duration }}</p>
              </div>
            </a>
          </div>
        </section>

        <!-- Connection to 5E -->
        <section v-if="ks.connectionTo5E" class="ks-section connection-section">
          <h2><span class="section-icon">🔄</span> การเชื่อมโยงกับกิจกรรม 5E</h2>
          <div class="connection-grid">
            <div v-if="ks.connectionTo5E.engagement" class="connection-item engagement">
              <span class="phase-badge">E1</span>
              <h5>Engagement</h5>
              <p>{{ ks.connectionTo5E.engagement }}</p>
            </div>
            <div v-if="ks.connectionTo5E.exploration" class="connection-item exploration">
              <span class="phase-badge">E2</span>
              <h5>Exploration</h5>
              <p>{{ ks.connectionTo5E.exploration }}</p>
            </div>
            <div v-if="ks.connectionTo5E.explanation" class="connection-item explanation">
              <span class="phase-badge">E3</span>
              <h5>Explanation</h5>
              <p>{{ ks.connectionTo5E.explanation }}</p>
            </div>
            <div v-if="ks.connectionTo5E.elaboration" class="connection-item elaboration">
              <span class="phase-badge">E4</span>
              <h5>Elaboration</h5>
              <p>{{ ks.connectionTo5E.elaboration }}</p>
            </div>
            <div v-if="ks.connectionTo5E.evaluation" class="connection-item evaluation">
              <span class="phase-badge">E5</span>
              <h5>Evaluation</h5>
              <p>{{ ks.connectionTo5E.evaluation }}</p>
            </div>
          </div>
        </section>
      </main>

      <!-- 🆕 Reading Complete Banner -->
      <div v-if="isReadingComplete && !isPrintMode" class="reading-complete-banner">
        <div class="banner-content">
          <span class="banner-icon">✅</span>
          <div class="banner-text">
            <strong>อ่านจบแล้ว!</strong>
            <p>คุณพร้อมทำใบงานประกอบใบความรู้นี้แล้ว</p>
          </div>
          <button @click="goToRelatedWorksheet" class="btn btn-primary btn-sm">
            📝 ไปทำใบงาน
          </button>
        </div>
      </div>

      <!-- 🆕 Manual Confirm Button (แสดงเสมอจนกว่าจะอ่านเสร็จ) -->
      <div v-if="!isReadingComplete && !isPrintMode" class="manual-confirm-section">
        <p class="confirm-hint">📖 อ่านแล้ว {{ Math.round(readingProgress) }}%</p>
        <button @click="manualConfirmReading" class="btn btn-secondary btn-sm">
          ✅ ยืนยันว่าอ่านเสร็จแล้ว
        </button>
      </div>

      <!-- Progress Bar -->
      <div v-if="!isPrintMode" class="reading-progress">
        <div class="progress-fill" :style="{ width: readingProgress + '%' }"></div>
        <span class="progress-label">{{ Math.round(readingProgress) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import { useLearningProgressStore } from '@/stores/learningProgress'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const learningProgress = useLearningProgressStore()

const knowledgeSheet = ref(null)
const loading = ref(true)
const error = ref(null)
const isPrintMode = ref(false)
const isBookmarked = ref(false)
const showAnswers = ref({})
const tfAnswers = ref({})
const readingProgress = ref(0)

// 🆕 Reading Tracking for Learning Journey
const readingStartTime = ref(null)
const isReadingComplete = ref(false)
const hasTrackedReading = ref(false)

const ks = computed(() => knowledgeSheet.value?.knowledgeSheet || knowledgeSheet.value || {})
const isStudent = computed(() => authStore.user?.role === 'student')

function formatDate(date) {
  if (!date) return ''
  const d = date.toDate ? date.toDate() : new Date(date)
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatContent(content) {
  if (!content) return ''
  return content.replace(/\n/g, '<br>')
}

function getArceLabel(focus) {
  const labels = {
    analysis: 'การวิเคราะห์',
    reasoning: 'การให้เหตุผล',
    creativity: 'ความคิดสร้างสรรค์',
    evidence: 'การใช้หลักฐาน'
  }
  return labels[focus] || focus
}

function getArceLabelIcon(focus) {
  const icons = { analysis: '🔍', reasoning: '💡', creativity: '✨', evidence: '📚' }
  return icons[focus] || '📌'
}

function getQuestionTypeLabel(type) {
  const labels = {
    'open-ended': 'คำถามปลายเปิด',
    'definition': 'นิยาม',
    'list': 'รายการ',
    'multiple-choice': 'ปรนัย'
  }
  return labels[type] || type
}

function getResourceIcon(type) {
  const icons = { video: '🎬', article: '📄', book: '📚', website: '🌐' }
  return icons[type] || '📎'
}

function scrollTo(id) {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function toggleAnswer(idx) {
  showAnswers.value[idx] = !showAnswers.value[idx]
}

function checkTrueFalse(idx, answer) {
  tfAnswers.value[idx] = answer
}

function printSheet() {
  isPrintMode.value = true
  setTimeout(() => {
    window.print()
    isPrintMode.value = false
  }, 100)
}

async function toggleBookmark() {
  if (!authStore.user?.uid || !knowledgeSheet.value?.id) return
  
  try {
    const userRef = doc(db, 'users', authStore.user.uid)
    if (isBookmarked.value) {
      await updateDoc(userRef, {
        bookmarkedKnowledgeSheets: arrayRemove(knowledgeSheet.value.id)
      })
      isBookmarked.value = false
    } else {
      await updateDoc(userRef, {
        bookmarkedKnowledgeSheets: arrayUnion(knowledgeSheet.value.id)
      })
      isBookmarked.value = true
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error)
  }
}

function updateReadingProgress() {
  const scrollTop = window.scrollY
  const docHeight = document.documentElement.scrollHeight - window.innerHeight
  
  // ถ้าหน้าสั้นมาก (ไม่ต้อง scroll) ให้ถือว่าอ่าน 100%
  if (docHeight <= 100) {
    readingProgress.value = 100
  } else {
    readingProgress.value = Math.min(100, Math.round((scrollTop / docHeight) * 100))
  }
  
  // 🆕 Track reading completion for Learning Journey
  if (readingProgress.value >= 80 && !hasTrackedReading.value && authStore.user?.role === 'student') {
    trackReadingComplete()
  }
}

// 🆕 Track when reading is complete (>= 80%)
async function trackReadingComplete() {
  if (hasTrackedReading.value || !knowledgeSheet.value?.id) return
  
  hasTrackedReading.value = true
  isReadingComplete.value = true
  
  const timeSpent = readingStartTime.value 
    ? Math.round((Date.now() - readingStartTime.value) / 1000) 
    : 0
  
  try {
    await learningProgress.markKnowledgeSheetRead(
      knowledgeSheet.value.id,
      readingProgress.value,
      timeSpent,
      {
        courseId: knowledgeSheet.value.courseId || knowledgeSheet.value.metadata?.courseId,
        unitNumber: knowledgeSheet.value.metadata?.unitNumber,
        planNumber: knowledgeSheet.value.metadata?.planNumber,
        title: knowledgeSheet.value.metadata?.title || ks.value.metadata?.title
      }
    )
    
    console.log('✅ Reading tracked:', {
      ksId: knowledgeSheet.value.id,
      readPercent: readingProgress.value,
      timeSpent
    })
  } catch (err) {
    console.error('Error tracking reading:', err)
    hasTrackedReading.value = false // Allow retry
  }
}

// 🆕 Manual confirm reading (สำหรับกรณี scroll tracking ไม่ทำงาน)
async function manualConfirmReading() {
  console.log('🔵 manualConfirmReading called', {
    hasTracked: hasTrackedReading.value,
    ksId: knowledgeSheet.value?.id,
    role: authStore.user?.role,
    uid: authStore.user?.uid,
    user: authStore.user
  })
  
  if (hasTrackedReading.value || !knowledgeSheet.value?.id) {
    console.log('⚠️ Already tracked or no KS id')
    return
  }
  
  // Force set to 100%
  readingProgress.value = 100
  hasTrackedReading.value = true
  isReadingComplete.value = true
  
  // ถ้าไม่มี uid ให้ข้าม
  if (!authStore.user?.uid) {
    console.log('⚠️ No user uid')
    alert('⚠️ ไม่พบข้อมูลผู้ใช้ กรุณา login ใหม่')
    return
  }
  
  const timeSpent = readingStartTime.value 
    ? Math.round((Date.now() - readingStartTime.value) / 1000) 
    : 60 // Default 60 seconds if no start time
  
  try {
    console.log('🔵 Calling markKnowledgeSheetRead...', {
      ksId: knowledgeSheet.value.id,
      courseId: knowledgeSheet.value.courseId || knowledgeSheet.value.metadata?.courseId
    })
    
    const result = await learningProgress.markKnowledgeSheetRead(
      knowledgeSheet.value.id,
      100, // Force 100%
      timeSpent,
      {
        courseId: knowledgeSheet.value.courseId || knowledgeSheet.value.metadata?.courseId,
        unitNumber: knowledgeSheet.value.metadata?.unitNumber,
        planNumber: knowledgeSheet.value.metadata?.planNumber,
        title: knowledgeSheet.value.metadata?.title || ks.value.metadata?.title,
        manualConfirm: true
      }
    )
    
    console.log('✅ Manual reading confirmed:', {
      ksId: knowledgeSheet.value.id,
      timeSpent,
      result
    })
    
    alert('✅ บันทึกการอ่านสำเร็จ! กลับไปที่ห้องกิจกรรมได้เลย')
    
  } catch (err) {
    console.error('❌ Error confirming reading:', err)
    alert('❌ เกิดข้อผิดพลาด: ' + err.message)
    hasTrackedReading.value = false
    isReadingComplete.value = false
  }
}

// 🆕 Track reading on page leave if partially read
async function trackPartialReading() {
  if (hasTrackedReading.value || !knowledgeSheet.value?.id || readingProgress.value < 10) return
  if (authStore.user?.role !== 'student') return
  
  const timeSpent = readingStartTime.value 
    ? Math.round((Date.now() - readingStartTime.value) / 1000) 
    : 0
  
  try {
    await learningProgress.markKnowledgeSheetRead(
      knowledgeSheet.value.id,
      readingProgress.value,
      timeSpent,
      {
        courseId: knowledgeSheet.value.courseId || knowledgeSheet.value.metadata?.courseId,
        unitNumber: knowledgeSheet.value.metadata?.unitNumber,
        planNumber: knowledgeSheet.value.metadata?.planNumber,
        title: knowledgeSheet.value.metadata?.title || ks.value.metadata?.title
      }
    )
  } catch (err) {
    console.error('Error tracking partial reading:', err)
  }
}

// 🆕 Navigate to related worksheet
function goToRelatedWorksheet() {
  const ksData = knowledgeSheet.value
  const metadata = ksData?.metadata || ks.value?.metadata
  
  // ถ้ามี roomId ใน query params ให้กลับไปที่ห้องนั้น
  if (route.query.roomId) {
    router.push(`/learning-room/${route.query.roomId}`)
    return
  }
  
  // ถ้ามี returnTo ให้ไปตามนั้น
  if (route.query.returnTo) {
    router.push(route.query.returnTo)
    return
  }
  
  // ไปที่ Learning Rooms
  router.push('/learning-rooms')
}

async function loadKnowledgeSheet() {
  loading.value = true
  error.value = null
  
  try {
    const id = route.params.id
    if (!id) throw new Error('ไม่พบ ID ของใบความรู้')

    const docRef = doc(db, 'knowledgeSheets', id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('ไม่พบใบความรู้นี้')
    }

    const data = docSnap.data()
    
    // Parse JSON strings back to objects (stored as strings in Firestore to avoid nesting limits)
    const parseIfString = (val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val)
        } catch {
          return val
        }
      }
      return val
    }

    knowledgeSheet.value = { 
      id: docSnap.id, 
      ...data,
      // Parse stringified nested objects
      sections: parseIfString(data.sections) || [],
      vocabulary: parseIfString(data.vocabulary) || [],
      hotsIntegration: parseIfString(data.hotsIntegration) || {},
      selfCheck: parseIfString(data.selfCheck) || {},
      summary: parseIfString(data.summary) || {},
      additionalResources: parseIfString(data.additionalResources) || [],
      connectionTo5E: parseIfString(data.connectionTo5E) || {},
      introduction: parseIfString(data.introduction),
      objectives: parseIfString(data.objectives)
    }

    // Check if bookmarked
    if (authStore.user?.uid) {
      const userRef = doc(db, 'users', authStore.user.uid)
      const userSnap = await getDoc(userRef)
      if (userSnap.exists()) {
        const bookmarks = userSnap.data().bookmarkedKnowledgeSheets || []
        isBookmarked.value = bookmarks.includes(id)
      }
    }
  } catch (err) {
    console.error('Error loading knowledge sheet:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadKnowledgeSheet()
  window.addEventListener('scroll', updateReadingProgress)
  
  // 🆕 Start tracking reading time
  readingStartTime.value = Date.now()
  
  // 🆕 Load existing progress
  if (authStore.user?.role === 'student') {
    await learningProgress.loadAllProgress()
  }
  
  // 🆕 เช็คสถานะ scroll หลังโหลดเสร็จ (กรณีหน้าสั้นไม่ต้อง scroll)
  setTimeout(() => {
    updateReadingProgress()
  }, 500)
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateReadingProgress)
  
  // 🆕 Track partial reading when leaving
  trackPartialReading()
})
</script>

<style scoped>
.knowledge-sheet-view {
  min-height: 100vh;
  background: var(--bg-primary);
}

/* Loading & Error */
.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: 1rem;
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-container .material-icons {
  font-size: 4rem;
  color: #ef4444;
}

/* Container */
.ks-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1rem 3rem;
}

/* Header */
.ks-header {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.1));
  border-radius: 0 0 24px 24px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.btn-back {
  background: var(--bg-secondary);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-primary);
}

.header-badges {
  display: flex;
  gap: 0.5rem;
  flex: 1;
}

.badge {
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge.unit { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.badge.plan { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.badge.grade { background: rgba(16, 185, 129, 0.2); color: #10b981; }

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  background: var(--bg-secondary);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.btn-icon:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.btn-icon.bookmarked { color: #f59e0b; }

.header-main {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.sheet-icon { font-size: 3rem; }

.header-text h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  line-height: 1.3;
}

.course-info {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.header-meta {
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* TOC Navigation */
.toc-nav {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 2rem;
  position: sticky;
  top: 1rem;
  z-index: 10;
}

.toc-nav h3 {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
}

.toc-nav ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.toc-nav li {
  padding: 0.4rem 0.75rem;
  background: var(--bg-tertiary);
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.toc-nav li:hover {
  background: var(--primary);
  color: white;
}

/* Sections */
.ks-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.ks-section h2 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 1.25rem;
  font-size: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--border-color);
}

.section-icon { font-size: 1.25rem; }

.section-number {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #10b981, #3b82f6);
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 700;
}

/* ARCE Tags */
.arce-tags {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.arce-tag {
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.arce-tag.analysis { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.arce-tag.reasoning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.arce-tag.creativity { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.arce-tag.evidence { background: rgba(16, 185, 129, 0.2); color: #10b981; }

/* Content */
.main-content {
  line-height: 1.8;
  color: var(--text-primary);
}

.key-points {
  background: var(--bg-tertiary);
  border-radius: 10px;
  padding: 1rem;
  margin: 1rem 0;
}

.key-points h4 { margin: 0 0 0.75rem; font-size: 0.95rem; }
.key-points ul { margin: 0; padding-left: 1.25rem; }
.key-points li { margin-bottom: 0.5rem; line-height: 1.5; }

.explanation-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: rgba(245, 158, 11, 0.1);
  border-left: 4px solid #f59e0b;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 0 10px 10px 0;
}

.explanation-box .material-icons { color: #f59e0b; }
.explanation-box p { margin: 0; line-height: 1.6; }

/* Examples */
.examples-container { margin-top: 1.5rem; }
.examples-container h4 { margin: 0 0 1rem; }

.example-card {
  background: var(--bg-tertiary);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1rem;
  border-left: 4px solid #10b981;
}

.example-card h5 { margin: 0 0 0.75rem; color: #10b981; }
.example-card > div { margin-bottom: 0.5rem; line-height: 1.5; }
.example-card strong { color: var(--text-secondary); }

/* Diagrams */
.diagram-card {
  background: var(--bg-tertiary);
  border-radius: 10px;
  padding: 1rem;
  margin-top: 1rem;
}

.diagram-card h5 { margin: 0 0 0.75rem; }

/* Tables */
.table-wrapper { margin-top: 1rem; overflow-x: auto; }
.table-wrapper h5 { margin: 0 0 0.75rem; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.data-table th, .data-table td {
  padding: 0.75rem;
  text-align: left;
  border: 1px solid var(--border-color);
}

.data-table th {
  background: var(--bg-tertiary);
  font-weight: 600;
}

/* Techniques */
.techniques-grid {
  display: grid;
  gap: 1rem;
}

.technique-card {
  background: var(--bg-tertiary);
  border-radius: 10px;
  padding: 1rem;
}

.technique-card h5 { margin: 0 0 0.5rem; color: var(--primary); }
.technique-card p { margin: 0 0 0.75rem; font-size: 0.9rem; }

.pros-cons { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.pros-cons ul { margin: 0.25rem 0 0; padding-left: 1rem; font-size: 0.85rem; }

/* Applications */
.applications-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.app-tag {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  padding: 0.4rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
}

/* Vocabulary */
.vocab-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.vocab-card {
  background: var(--bg-tertiary);
  border-radius: 10px;
  padding: 1rem;
  border-left: 4px solid #8b5cf6;
}

.vocab-term { font-weight: 700; color: #8b5cf6; font-size: 1.1rem; }
.vocab-thai { font-weight: 600; margin: 0.25rem 0; }
.vocab-def { font-size: 0.85rem; color: var(--text-secondary); }

/* HOTS Section */
.hots-intro {
  margin: 0 0 1.5rem;
  color: var(--text-secondary);
}

.hots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.hots-card {
  background: var(--bg-tertiary);
  border-radius: 12px;
  padding: 1rem;
  border-top: 4px solid;
}

.hots-card.analysis { border-color: #3b82f6; }
.hots-card.reasoning { border-color: #f59e0b; }
.hots-card.creativity { border-color: #8b5cf6; }
.hots-card.evidence { border-color: #10b981; }

.hots-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.hots-icon { font-size: 1.25rem; }
.hots-header h4 { margin: 0; font-size: 0.9rem; }

.hots-card ul {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.9rem;
}

.hots-card li { margin-bottom: 0.5rem; line-height: 1.5; }

/* Summary Section */
.key-takeaways {
  background: var(--bg-tertiary);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.key-takeaways h4 { margin: 0 0 0.75rem; }
.key-takeaways ul { margin: 0; padding-left: 1.25rem; }
.key-takeaways li { margin-bottom: 0.5rem; }

/* Mind Map */
.mindmap {
  background: var(--bg-tertiary);
  border-radius: 12px;
  padding: 1.5rem;
}

.mindmap-center {
  text-align: center;
  background: linear-gradient(135deg, #10b981, #3b82f6);
  color: white;
  padding: 1rem 2rem;
  border-radius: 25px;
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
  display: inline-block;
  width: 100%;
}

.mindmap-branches {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.mindmap-branch {
  background: var(--bg-secondary);
  border-radius: 10px;
  padding: 1rem;
}

.branch-topic {
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 0.5rem;
}

.branch-subtopics {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.85rem;
}

.branch-subtopics li { margin-bottom: 0.25rem; }

/* Self-Check */
.selfcheck-item {
  background: var(--bg-tertiary);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.q-number {
  width: 28px;
  height: 28px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.85rem;
}

.q-type {
  font-size: 0.75rem;
  background: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.question-text {
  margin: 0 0 0.75rem;
  font-weight: 500;
  line-height: 1.5;
}

.hint-box, .answer-box {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.hint-box {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.answer-box {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.btn-show-answer {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: #fff;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.btn-show-answer:hover {
  background: linear-gradient(135deg, #5855eb, #7c4fe0);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

/* True/False */
.truefalse-section {
  margin-top: 2rem;
  background: var(--bg-tertiary);
  padding: 1.5rem;
  border-radius: 12px;
}

.truefalse-section h4 { 
  margin: 0 0 1.25rem; 
  font-size: 1.1rem;
  color: var(--text-primary);
}

.truefalse-item {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
}

.tf-statement {
  margin: 0 0 1rem;
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-primary);
}

.tf-buttons {
  display: flex;
  gap: 1rem;
}

.tf-btn {
  flex: 1;
  padding: 1rem 1.5rem;
  border: 2px solid transparent;
  border-radius: 10px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tf-btn:first-child {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.25));
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.4);
}

.tf-btn:first-child:hover {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(16, 185, 129, 0.35));
  border-color: #10b981;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.tf-btn:last-child {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.25));
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.4);
}

.tf-btn:last-child:hover {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.35));
  border-color: #ef4444;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.tf-btn.correct { 
  background: linear-gradient(135deg, #10b981, #059669) !important; 
  border-color: #10b981 !important; 
  color: #fff !important; 
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.tf-btn.wrong { 
  background: linear-gradient(135deg, #ef4444, #dc2626) !important; 
  border-color: #ef4444 !important; 
  color: #fff !important;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.tf-feedback {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.correct-text { color: #10b981; font-weight: 600; }
.wrong-text { color: #ef4444; font-weight: 600; }

.tf-feedback .explanation {
  margin: 0.5rem 0 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* Resources */
.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.resource-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background: var(--bg-tertiary);
  border-radius: 10px;
  padding: 1rem;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
}

.resource-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.resource-icon { font-size: 2rem; }

.resource-info h5 { margin: 0 0 0.25rem; }
.resource-info p { margin: 0; font-size: 0.85rem; color: var(--text-secondary); }
.resource-info .author, .resource-info .duration { font-size: 0.75rem; margin-top: 0.25rem; }

/* Connection to 5E */
.connection-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
}

.connection-item {
  background: var(--bg-tertiary);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
}

.phase-badge {
  display: inline-block;
  width: 32px;
  height: 32px;
  line-height: 32px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}

.connection-item.engagement .phase-badge { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.connection-item.exploration .phase-badge { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.connection-item.explanation .phase-badge { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.connection-item.elaboration .phase-badge { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.connection-item.evaluation .phase-badge { background: rgba(16, 185, 129, 0.2); color: #10b981; }

.connection-item h5 { margin: 0 0 0.5rem; font-size: 0.85rem; }
.connection-item p { margin: 0; font-size: 0.75rem; color: var(--text-secondary); }

/* Reading Progress */
.reading-progress {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: var(--border-color);
  z-index: 100;
}

.reading-progress .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #3b82f6);
  transition: width 0.1s;
}

.reading-progress .progress-label {
  position: absolute;
  right: 8px;
  top: -20px;
  font-size: 0.7rem;
  color: var(--text-secondary);
  background: var(--bg-primary);
  padding: 2px 6px;
  border-radius: 4px;
}

/* 🆕 Reading Complete Banner */
.reading-complete-banner {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 16px;
  padding: 1rem 1.5rem;
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
  z-index: 101;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.reading-complete-banner .banner-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: white;
}

.reading-complete-banner .banner-icon {
  font-size: 2rem;
}

.reading-complete-banner .banner-text {
  flex: 1;
}

.reading-complete-banner .banner-text strong {
  display: block;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.reading-complete-banner .banner-text p {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.9;
}

.reading-complete-banner .btn-primary {
  background: white;
  color: #059669;
  border: none;
  white-space: nowrap;
}

.reading-complete-banner .btn-primary:hover {
  background: #f0fdf4;
}

/* Manual Confirm Section */
.manual-confirm-section {
  margin-top: 2rem;
  margin-bottom: 80px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.confirm-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.manual-confirm-section .btn-secondary {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.manual-confirm-section .btn-secondary:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
}

/* Print Mode */
@media print {
  .ks-header { border-radius: 0; }
  .toc-nav, .btn-back, .header-actions, .reading-progress { display: none; }
  .ks-section { break-inside: avoid; }
}

/* Responsive */
@media (max-width: 768px) {
  .connection-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .hots-grid {
    grid-template-columns: 1fr;
  }
  
  .pros-cons {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .header-main {
    flex-direction: column;
    text-align: center;
  }
  
  .header-badges {
    justify-content: center;
  }
  
  .toc-nav ul {
    flex-direction: column;
  }
}
</style>
