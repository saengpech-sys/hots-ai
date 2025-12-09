<template>
  <div class="unit-ks-view">
    <!-- Top Navigation -->
    <nav class="top-navbar">
      <div class="nav-brand">
        <router-link to="/lesson-plans" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <span class="brand-icon">📚</span>
        <span class="brand-text">ใบความรู้รวมหน่วย</span>
      </div>
      <div class="nav-actions">
        <button class="btn btn-outline" @click="exportPDF">
          <span class="material-icons">picture_as_pdf</span>
          ส่งออก PDF
        </button>
        <button class="btn btn-danger" @click="confirmDelete">
          <span class="material-icons">delete</span>
          ลบ
        </button>
      </div>
    </nav>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>กำลังโหลดใบความรู้...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-container">
      <span class="material-icons">error</span>
      <h3>เกิดข้อผิดพลาด</h3>
      <p>{{ error }}</p>
      <router-link to="/lesson-plans" class="btn btn-primary">กลับหน้าแผนการสอน</router-link>
    </div>

    <!-- Content -->
    <div v-else-if="sheet" class="ks-content">
      <!-- Header -->
      <header class="ks-header">
        <div class="header-badge">📚 ใบความรู้รวมหน่วย</div>
        <h1>{{ sheet.metadata?.title || `หน่วยที่ ${sheet.metadata?.unitNumber}` }}</h1>
        <div class="header-meta">
          <span>📖 {{ sheet.metadata?.courseCode }} {{ sheet.metadata?.courseName }}</span>
          <span>🎓 {{ sheet.metadata?.gradeLevel }}</span>
          <span>📝 {{ sheet.metadata?.totalPlans || 0 }} แผนการสอน</span>
          <span>⏱️ {{ sheet.metadata?.estimatedDuration }}</span>
        </div>
      </header>

      <!-- Unit Overview -->
      <section class="ks-section overview-section">
        <h2><span class="section-icon">🎯</span> ภาพรวมหน่วยการเรียนรู้</h2>
        <div class="overview-content">
          <div class="big-idea">
            <strong>Big Idea:</strong> {{ unitOverview?.bigIdea }}
          </div>
          <p>{{ unitOverview?.description }}</p>
          
          <div class="essential-questions">
            <h4>❓ คำถามสำคัญ (Essential Questions)</h4>
            <ul>
              <li v-for="(q, idx) in unitOverview?.essentialQuestions" :key="idx">{{ q }}</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Learning Progression -->
      <section class="ks-section progression-section">
        <h2><span class="section-icon">📈</span> ลำดับการเรียนรู้</h2>
        <div class="progression-timeline">
          <div 
            v-for="prog in unitOverview?.learningProgression" 
            :key="prog.planNumber"
            class="progression-item"
          >
            <div class="plan-number">แผนที่ {{ prog.planNumber }}</div>
            <div class="plan-focus">{{ prog.focus }}</div>
            <div class="plan-builds" v-if="prog.builds">
              <span class="material-icons">trending_up</span>
              {{ prog.builds }}
            </div>
          </div>
        </div>
      </section>

      <!-- Core Concepts -->
      <section class="ks-section concepts-section">
        <h2><span class="section-icon">💡</span> แนวคิดหลัก (Core Concepts)</h2>
        <div class="concepts-grid">
          <div 
            v-for="concept in coreConcepts" 
            :key="concept.id"
            class="concept-card"
          >
            <h4>{{ concept.name }}</h4>
            <p>{{ concept.description }}</p>
            <div class="concept-meta">
              <span class="related-plans">
                📝 แผนที่ {{ concept.relatedPlans?.join(', ') }}
              </span>
              <span v-if="concept.prerequisite" class="prerequisite">
                ⬆️ ต่อยอดจาก: {{ concept.prerequisite }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Sections (Content) -->
      <section 
        v-for="section in sections" 
        :key="section.sectionNumber"
        class="ks-section content-section"
      >
        <h2>
          <span class="section-number">{{ section.sectionNumber }}</span>
          {{ section.title }}
          <span class="bloom-badge" :class="'bloom-' + section.bloomLevel">
            Bloom {{ section.bloomLevel }}
          </span>
        </h2>
        <div class="related-plans-badge">
          📝 แผนที่ {{ section.relatedPlans?.join(', ') }}
        </div>

        <div class="section-content">
          <div class="main-content" v-html="formatContent(section.content?.mainContent)"></div>
          
          <div v-if="section.content?.keyPoints?.length" class="key-points">
            <h4>📌 ประเด็นสำคัญ</h4>
            <ul>
              <li v-for="(point, idx) in section.content.keyPoints" :key="idx">{{ point }}</li>
            </ul>
          </div>

          <!-- Examples -->
          <div v-if="section.examples?.length" class="examples">
            <h4>📋 ตัวอย่าง</h4>
            <div v-for="(ex, idx) in section.examples" :key="idx" class="example-card">
              <strong>{{ ex.title }}</strong>
              <p>{{ ex.scenario }}</p>
              <p v-if="ex.analysis"><em>วิเคราะห์: {{ ex.analysis }}</em></p>
            </div>
          </div>

          <!-- Diagrams -->
          <div v-if="section.diagrams?.length" class="diagrams">
            <h4>📊 แผนภาพ</h4>
            <div v-for="(diagram, idx) in section.diagrams" :key="idx" class="diagram-card">
              <strong>{{ diagram.title }}</strong>
              <p>{{ diagram.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Concept Map -->
      <section class="ks-section concept-map-section">
        <h2><span class="section-icon">🗺️</span> แผนผังความคิด (Concept Map)</h2>
        <div class="concept-map">
          <div class="central-node">{{ conceptMap?.central }}</div>
          <div class="branches">
            <div 
              v-for="branch in conceptMap?.branches" 
              :key="branch.concept"
              class="branch"
            >
              <div class="branch-header">
                <span class="branch-concept">{{ branch.concept }}</span>
                <span class="branch-plans">แผน {{ branch.plans?.join(', ') }}</span>
              </div>
              <ul class="branch-subtopics">
                <li v-for="(sub, idx) in branch.subtopics" :key="idx">{{ sub }}</li>
              </ul>
              <div class="branch-connections" v-if="branch.connections?.length">
                <span class="material-icons">link</span>
                {{ branch.connections.join(', ') }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Vocabulary -->
      <section v-if="vocabulary?.length" class="ks-section vocabulary-section">
        <h2><span class="section-icon">📚</span> คำศัพท์สำคัญ</h2>
        <div class="vocabulary-table">
          <table>
            <thead>
              <tr>
                <th>คำศัพท์</th>
                <th>คำแปล</th>
                <th>ความหมาย</th>
                <th>แผน</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(v, idx) in vocabulary" :key="idx">
                <td class="term">{{ v.term }}</td>
                <td>{{ v.thai }}</td>
                <td>{{ v.definition }}</td>
                <td class="plan-num">{{ v.firstIntroducedIn }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- HOTS Integration -->
      <section class="ks-section hots-section">
        <h2><span class="section-icon">🧠</span> คำถาม HOTS ระดับหน่วย</h2>
        
        <div class="hots-grid">
          <div class="hots-card analysis">
            <h4>🔍 วิเคราะห์ (Analysis)</h4>
            <ul>
              <li v-for="(q, idx) in hotsIntegration?.unitLevel?.analysisQuestions" :key="idx">{{ q }}</li>
            </ul>
          </div>
          
          <div class="hots-card reasoning">
            <h4>🧠 เหตุผล (Reasoning)</h4>
            <ul>
              <li v-for="(q, idx) in hotsIntegration?.unitLevel?.reasoningQuestions" :key="idx">{{ q }}</li>
            </ul>
          </div>
          
          <div class="hots-card creativity">
            <h4>💡 สร้างสรรค์ (Creativity)</h4>
            <ul>
              <li v-for="(q, idx) in hotsIntegration?.unitLevel?.creativityQuestions" :key="idx">{{ q }}</li>
            </ul>
          </div>
          
          <div class="hots-card evidence">
            <h4>📚 หลักฐาน (Evidence)</h4>
            <ul>
              <li v-for="(q, idx) in hotsIntegration?.unitLevel?.evidenceQuestions" :key="idx">{{ q }}</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Plan Guidance -->
      <section class="ks-section guidance-section">
        <h2><span class="section-icon">📋</span> คำแนะนำสำหรับแต่ละแผน</h2>
        <div class="guidance-list">
          <div 
            v-for="guidance in planGuidance" 
            :key="guidance.planNumber"
            class="guidance-card"
          >
            <h4>แผนที่ {{ guidance.planNumber }}</h4>
            <div class="guidance-content">
              <div class="focus-areas">
                <strong>✅ ควรเน้น:</strong>
                <ul>
                  <li v-for="(area, idx) in guidance.focusAreas" :key="idx">{{ area }}</li>
                </ul>
              </div>
              <div class="avoid-duplication" v-if="guidance.avoidDuplication?.length">
                <strong>⚠️ ไม่ต้องสอนซ้ำ:</strong>
                <ul>
                  <li v-for="(item, idx) in guidance.avoidDuplication" :key="idx">{{ item }}</li>
                </ul>
              </div>
              <div class="unique-contribution">
                <strong>⭐ จุดเด่นเฉพาะ:</strong> {{ guidance.uniqueContribution }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Self Check -->
      <section class="ks-section selfcheck-section">
        <h2><span class="section-icon">✅</span> ทดสอบความเข้าใจหน่วย</h2>
        <div class="selfcheck-questions">
          <div 
            v-for="(q, idx) in selfCheck?.unitSummary?.questions" 
            :key="idx"
            class="selfcheck-item"
          >
            <div class="question">{{ idx + 1 }}. {{ q.question }}</div>
            <div class="answer" v-if="showAnswers">
              <strong>แนวคำตอบ:</strong> {{ q.answer }}
            </div>
          </div>
        </div>
        <button class="btn btn-outline" @click="showAnswers = !showAnswers">
          {{ showAnswers ? 'ซ่อนคำตอบ' : 'แสดงคำตอบ' }}
        </button>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { doc, getDoc, deleteDoc } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const sheet = ref(null)
const showAnswers = ref(false)

// Parse JSON strings if needed
const parseIfString = (val) => {
  if (typeof val === 'string') {
    try { return JSON.parse(val) } 
    catch { return val }
  }
  return val
}

// Computed parsed data
const unitOverview = computed(() => parseIfString(sheet.value?.unitOverview))
const coreConcepts = computed(() => parseIfString(sheet.value?.coreConcepts) || [])
const sections = computed(() => parseIfString(sheet.value?.sections) || [])
const vocabulary = computed(() => parseIfString(sheet.value?.vocabulary) || [])
const conceptMap = computed(() => parseIfString(sheet.value?.conceptMap))
const hotsIntegration = computed(() => parseIfString(sheet.value?.hotsIntegration))
const planGuidance = computed(() => parseIfString(sheet.value?.planGuidance) || [])
const selfCheck = computed(() => parseIfString(sheet.value?.selfCheck))

function formatContent(text) {
  if (!text) return ''
  return text.replace(/\n/g, '<br>')
}

async function loadSheet() {
  try {
    const docRef = doc(db, 'unitKnowledgeSheets', route.params.id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      sheet.value = { id: docSnap.id, ...docSnap.data() }
    } else {
      error.value = 'ไม่พบใบความรู้รวมหน่วยนี้'
    }
  } catch (err) {
    console.error('Error loading sheet:', err)
    error.value = 'เกิดข้อผิดพลาดในการโหลด: ' + err.message
  } finally {
    loading.value = false
  }
}

function exportPDF() {
  window.print()
}

async function confirmDelete() {
  const unitName = sheet.value?.metadata?.unitName || 'หน่วยนี้'
  const confirmed = confirm(
    `⚠️ ยืนยันการลบใบความรู้รวมหน่วย\n\n` +
    `"${unitName}"\n\n` +
    `การลบนี้ไม่สามารถกู้คืนได้!`
  )
  
  if (!confirmed) return
  
  try {
    loading.value = true
    
    // Delete from Firestore
    const docRef = doc(db, 'unitKnowledgeSheets', route.params.id)
    await deleteDoc(docRef)
    
    alert('✅ ลบใบความรู้รวมหน่วยสำเร็จ')
    router.push('/lesson-plans')
  } catch (err) {
    console.error('Error deleting:', err)
    alert('❌ เกิดข้อผิดพลาด: ' + err.message)
    loading.value = false
  }
}

onMounted(() => {
  loadSheet()
})
</script>

<style scoped>
.unit-ks-view {
  min-height: 100vh;
  background: var(--bg-primary);
}

.top-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.back-link {
  color: var(--text-secondary);
  text-decoration: none;
}

.brand-icon { font-size: 1.5rem; }
.brand-text { font-weight: 600; }

.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--border-color);
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ks-content {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.ks-header {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
  border-radius: 16px;
}

.header-badge {
  display: inline-block;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 20px;
  font-weight: 600;
  margin-bottom: 1rem;
}

.ks-header h1 {
  font-size: 2rem;
  margin: 0.5rem 0 1rem;
}

.header-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
  color: var(--text-secondary);
}

.ks-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem 2rem;
  margin-bottom: 1.5rem;
}

.ks-section h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.section-icon { font-size: 1.3rem; }

.section-number {
  background: linear-gradient(135deg, #10b981, #3b82f6);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: bold;
}

.bloom-badge {
  margin-left: auto;
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  background: var(--bg-tertiary);
}

.bloom-1 { background: #fef3c7; color: #92400e; }
.bloom-2 { background: #dbeafe; color: #1e40af; }
.bloom-3 { background: #d1fae5; color: #065f46; }
.bloom-4 { background: #ede9fe; color: #5b21b6; }
.bloom-5 { background: #fce7f3; color: #9d174d; }
.bloom-6 { background: #fee2e2; color: #991b1b; }

.related-plans-badge {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

/* Overview Section */
.big-idea {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1));
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.essential-questions ul {
  list-style: none;
  padding: 0;
}

.essential-questions li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
}

.essential-questions li::before {
  content: '❓';
  position: absolute;
  left: 0;
}

/* Progression Timeline */
.progression-timeline {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.progression-item {
  flex: 1;
  min-width: 200px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 1rem;
  position: relative;
}

.progression-item::after {
  content: '→';
  position: absolute;
  right: -1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.5rem;
  color: var(--text-secondary);
}

.progression-item:last-child::after {
  content: '';
}

.plan-number {
  background: #3b82f6;
  color: white;
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.plan-focus {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.plan-builds {
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Concepts Grid */
.concepts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.concept-card {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 1rem;
  border-left: 4px solid #10b981;
}

.concept-card h4 {
  margin: 0 0 0.5rem;
  color: #10b981;
}

.concept-meta {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Content Section */
.main-content {
  line-height: 1.8;
  margin-bottom: 1rem;
}

.key-points ul {
  list-style: none;
  padding: 0;
}

.key-points li {
  padding: 0.5rem 0 0.5rem 1.5rem;
  position: relative;
}

.key-points li::before {
  content: '📌';
  position: absolute;
  left: 0;
}

.example-card, .diagram-card {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.5rem;
}

/* Concept Map */
.concept-map {
  text-align: center;
}

.central-node {
  display: inline-block;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

.branches {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  text-align: left;
}

.branch {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 1rem;
}

.branch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.branch-concept {
  font-weight: 600;
  color: #3b82f6;
}

.branch-plans {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.branch-subtopics {
  margin: 0;
  padding-left: 1.25rem;
}

.branch-connections {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Vocabulary Table */
.vocabulary-table {
  overflow-x: auto;
}

.vocabulary-table table {
  width: 100%;
  border-collapse: collapse;
}

.vocabulary-table th,
.vocabulary-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.vocabulary-table th {
  background: var(--bg-tertiary);
  font-weight: 600;
}

.vocabulary-table .term {
  font-weight: 600;
  color: #3b82f6;
}

.vocabulary-table .plan-num {
  text-align: center;
}

/* HOTS Grid */
.hots-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.hots-card {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 1rem;
}

.hots-card h4 { margin: 0 0 0.75rem; }
.hots-card ul { margin: 0; padding-left: 1.25rem; }
.hots-card li { margin-bottom: 0.5rem; }

.hots-card.analysis { border-left: 4px solid #3b82f6; }
.hots-card.reasoning { border-left: 4px solid #10b981; }
.hots-card.creativity { border-left: 4px solid #f59e0b; }
.hots-card.evidence { border-left: 4px solid #8b5cf6; }

/* Guidance Cards */
.guidance-list {
  display: grid;
  gap: 1rem;
}

.guidance-card {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 1rem;
}

.guidance-card h4 {
  margin: 0 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.guidance-content ul {
  margin: 0.5rem 0;
  padding-left: 1.25rem;
}

.unique-contribution {
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 6px;
}

/* Self Check */
.selfcheck-questions {
  margin-bottom: 1rem;
}

.selfcheck-item {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
}

.selfcheck-item .question {
  font-weight: 500;
}

.selfcheck-item .answer {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--border-color);
  color: var(--text-secondary);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-outline:hover {
  background: var(--bg-tertiary);
}

.btn-primary {
  background: #10b981;
  color: white;
}

.btn-danger {
  background: #ef4444;
  color: white;
  border: none;
}

.btn-danger:hover {
  background: #dc2626;
}

/* Print Styles */
@media print {
  .top-navbar { display: none; }
  .ks-content { max-width: 100%; padding: 0; }
  .ks-section { break-inside: avoid; }
}

/* Responsive */
@media (max-width: 768px) {
  .ks-content { padding: 1rem; }
  .header-meta { gap: 0.75rem; }
  .hots-grid { grid-template-columns: 1fr; }
  .progression-timeline { flex-direction: column; }
  .progression-item::after { display: none; }
}
</style>
