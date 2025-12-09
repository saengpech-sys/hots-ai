<template>
  <div class="question-bank-container">
    <!-- Top Navigation -->
    <nav class="navbar card">
      <div class="nav-content">
        <h1 class="nav-title">💡 คลังคำถาม HOTS</h1>
        <div class="nav-actions">
          <button @click="$router.push('/teacher')" class="btn btn-secondary btn-sm">
            ← กลับ Dashboard
          </button>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="content-wrapper">
      <!-- Tabs -->
      <div class="library-tabs">
        <button 
          :class="['tab-btn', { active: activeTab === 'my-questions' }]"
          @click="switchTab('my-questions')"
        >
          🏫 คำถามของฉัน
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'national' }]"
          @click="switchTab('national')"
        >
          🌐 National PLC (แบ่งปัน)
        </button>
      </div>

      <!-- Course Selection -->
      <div class="card">
        <h2>📚 เลือกรายวิชา</h2>
        <select v-model="selectedCourseId" @change="loadQuestions" class="form-select">
          <option value="">-- เลือกรายวิชา --</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.courseCode }} - {{ course.courseName }}
          </option>
        </select>
      </div>

      <!-- Actions -->
      <div v-if="selectedCourseId && activeTab === 'my-questions'" class="actions-bar">
        <button @click="openGenerateModal" class="btn btn-primary" :disabled="generating">
          <span v-if="generating">⏳ กำลังสร้าง...</span>
          <span v-else>🤖 AI สร้างคำถาม</span>
        </button>
        <button @click="openCreateModal" class="btn btn-secondary">
          ✏️ สร้างคำถามเอง
        </button>
      </div>

      <!-- Questions List -->
      <div v-if="selectedCourseId || activeTab === 'national'" class="questions-section">
        <div class="section-header">
          <h2>📝 {{ activeTab === 'national' ? 'คำถามแบ่งปันจากครูทั่วประเทศ' : 'คำถามทั้งหมด' }} ({{ questions.length }} ข้อ)</h2>
          <div class="filter-bar">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="ค้นหาคำถาม..."
              class="search-input"
            >
          </div>
        </div>

        <div v-if="loading" class="loading-state">กำลังโหลด...</div>
        <div v-else-if="filteredQuestions.length === 0" class="empty-state">
          <p>ยังไม่มีคำถาม</p>
          <button @click="openGenerateModal" class="btn btn-primary">สร้างคำถามด้วย AI</button>
        </div>
        <div v-else class="questions-grid">
          <div v-for="(question, index) in filteredQuestions" :key="question.id" class="question-card card">
            <div class="question-header">
              <span class="question-number">คำถามที่ {{ index + 1 }}</span>
              <div class="question-actions">
                <button 
                  v-if="question.hasSolution" 
                  @click="viewSolution(question)" 
                  class="icon-btn solution-btn" 
                  title="ดูเฉลย"
                >
                  📖
                </button>
                <button 
                  @click="generateSolution(question)" 
                  class="icon-btn" 
                  :title="question.hasSolution ? 'สร้างเฉลยใหม่' : 'สร้างเฉลย'"
                  :disabled="generatingSolution === question.id"
                >
                  {{ generatingSolution === question.id ? '⏳' : (question.hasSolution ? '🔄' : '🤖') }}
                </button>
                <button @click="editQuestion(question)" class="icon-btn" title="แก้ไข">✏️</button>
                <button @click="deleteQuestion(question)" class="icon-btn" title="ลบ">🗑️</button>
              </div>
            </div>
            
            <div class="question-body">
              <p class="question-text">{{ question.question }}</p>
              <div class="question-meta">
                <span class="badge">{{ question.category }}</span>
                <span v-if="question.relatedLOs" class="related-los">
                  🎯 {{ question.relatedLOs.join(', ') }}
                </span>
                <span v-if="question.isPublic" class="public-badge" title="Public">🌐</span>
              </div>
              <p v-if="question.hint" class="question-hint">💡 {{ question.hint }}</p>
            </div>

            <div class="question-stats">
              <span>📊 ใช้แล้ว: {{ question.usageCount || 0 }} ครั้ง</span>
              <span>📅 {{ formatDate(question.createdAt) }}</span>
              <span v-if="activeTab === 'national'" class="author-name">
                👤 {{ question.teacherName || 'Unknown Teacher' }}
              </span>
            </div>
            
            <!-- Import Button for National Tab -->
            <div v-if="activeTab === 'national'" class="import-action">
              <button @click="importQuestion(question)" class="btn btn-sm btn-outline-primary">
                📥 นำเข้าสู่รายวิชาของฉัน
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Generate Modal -->
    <div v-if="showGenerateModal" class="modal" @click.self="closeGenerateModal">
      <div class="modal-content card">
        <div class="modal-header">
          <h2>🤖 AI สร้างคำถาม HOTS</h2>
          <button @click="closeGenerateModal" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <p>AI จะสร้างคำถามที่เหมาะสมกับ Learning Outcomes ของรายวิชานี้</p>
          
          <div class="form-group">
            <label>จำนวนคำถามที่ต้องการ</label>
            <input 
              v-model.number="generateCount" 
              type="number" 
              min="1" 
              max="10"
              class="form-input"
            >
          </div>

          <div class="form-actions">
            <button @click="generateQuestions" class="btn btn-primary" :disabled="generating">
              <span v-if="generating">⏳ กำลังสร้าง...</span>
              <span v-else>สร้างคำถาม</span>
            </button>
            <button @click="closeGenerateModal" class="btn btn-secondary" :disabled="generating">
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    </div>


    <!-- Create/Edit Modal -->
    <div v-if="showEditModal" class="modal" @click.self="closeEditModal">
      <div class="modal-content card large">
        <div class="modal-header">
          <h2>{{ isEditing ? '✏️ แก้ไขคำถาม' : '➕ สร้างคำถามใหม่' }}</h2>
          <button @click="closeEditModal" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <form id="question-form" @submit.prevent="saveQuestion">
          <div class="form-group">
            <label>คำถาม <span class="required">*</span></label>
            <textarea 
              v-model="formData.question" 
              rows="4" 
              class="form-input"
              placeholder="พิมพ์คำถามที่นี่..."
              required
            ></textarea>
          </div>

          <div class="form-group">
            <label>คำใบ้ (Hint)</label>
            <input 
              v-model="formData.hint" 
              type="text" 
              class="form-input"
              placeholder="คำใบ้สำหรับนักเรียนเมื่อตอบผิด"
            >
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>หมวดหมู่ HOTS</label>
              <select v-model="formData.category" class="form-select">
                <option value="วิเคราะห์">วิเคราะห์ (Analysis)</option>
                <option value="ประเมินค่า">ประเมินค่า (Evaluation)</option>
                <option value="สร้างสรรค์">สร้างสรรค์ (Creativity)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Learning Outcomes ที่เกี่ยวข้อง</label>
            <div class="lo-selection">
              <div v-if="selectedCourseLOs.length === 0" class="no-lo">
                ยังไม่มี LO ในรายวิชานี้
              </div>
              <label v-for="lo in selectedCourseLOs" :key="lo.code" class="checkbox-label">
                <input 
                  type="checkbox" 
                  :value="lo.code" 
                  v-model="formData.relatedLOs"
                >
                <span class="lo-code">{{ lo.code }}</span>
                <span class="lo-desc">{{ lo.description }}</span>
              </label>
            </div>
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.isPublic" />
              🌐 แบ่งปันสู่ National PLC (Public)
            </label>
            <p class="help-text">อนุญาตให้ครูท่านอื่นเห็นและนำคำถามนี้ไปใช้ได้</p>
          </div>
          </form>
        </div>

        <div class="modal-footer">
          <button type="submit" form="question-form" class="btn btn-primary" :disabled="saving">
            <span v-if="saving">⏳ กำลังบันทึก...</span>
            <span v-else>{{ isEditing ? 'บันทึกการแก้ไข' : 'สร้างคำถาม' }}</span>
          </button>
          <button type="button" @click="closeEditModal" class="btn btn-secondary">
            ยกเลิก
          </button>
        </div>
      </div>
    </div>


    <!-- Solution Modal -->
    <div v-if="showSolutionModal && currentSolution" class="modal" @click.self="closeSolutionModal">
      <div class="modal-content card solution-modal">
        <div class="modal-header">
          <h2>📖 เฉลยคำตอบ</h2>
          <button @click="closeSolutionModal" class="close-btn">✕</button>
        </div>

        <div class="modal-body solution-content">
          <div class="solution-section">
            <h3 class="section-title">❓ คำถาม</h3>
            <div class="question-display">
              {{ currentSolution.questionText }}
            </div>
          </div>

          <div class="solution-section highlight-section">
            <h3 class="section-title">✅ คำตอบที่ได้คะแนนเต็ม (20/20 คะแนน)</h3>
            <div class="answer-display">
              {{ currentSolution.answer }}
            </div>
          </div>

          <div class="solution-section">
            <h3 class="section-title">📊 การวิเคราะห์คะแนน</h3>
            <div class="score-grid">
              <div class="score-card">
                <div class="score-header">
                  <span class="score-label">🔍 การวิเคราะห์</span>
                  <span class="score-value">{{ currentSolution.analysis?.analysisScore || 5 }}/5</span>
                </div>
                <p class="score-explanation">{{ currentSolution.analysis?.analysisExplanation || '-' }}</p>
              </div>

              <div class="score-card">
                <div class="score-header">
                  <span class="score-label">🧠 การให้เหตุผล</span>
                  <span class="score-value">{{ currentSolution.analysis?.reasoningScore || 5 }}/5</span>
                </div>
                <p class="score-explanation">{{ currentSolution.analysis?.reasoningExplanation || '-' }}</p>
              </div>

              <div class="score-card">
                <div class="score-header">
                  <span class="score-label">💡 ความคิดสร้างสรรค์</span>
                  <span class="score-value">{{ currentSolution.analysis?.creativityScore || 5 }}/5</span>
                </div>
                <p class="score-explanation">{{ currentSolution.analysis?.creativityExplanation || '-' }}</p>
              </div>

              <div class="score-card">
                <div class="score-header">
                  <span class="score-label">📚 การใช้หลักฐาน</span>
                  <span class="score-value">{{ currentSolution.analysis?.evidenceScore || 5 }}/5</span>
                </div>
                <p class="score-explanation">{{ currentSolution.analysis?.evidenceExplanation || '-' }}</p>
              </div>
            </div>
          </div>

          <div class="solution-section" v-if="currentSolution.keyPoints?.length">
            <h3 class="section-title">🎯 ประเด็นสำคัญที่ควรมีในคำตอบ</h3>
            <ul class="key-points-list">
              <li v-for="(point, index) in currentSolution.keyPoints" :key="index">
                {{ point }}
              </li>
            </ul>
          </div>

          <div v-if="currentSolution.teacherNotes" class="solution-section teacher-notes">
            <h3 class="section-title">👨‍🏫 คำแนะนำสำหรับครู</h3>
            <p>{{ currentSolution.teacherNotes }}</p>
          </div>

          <div class="solution-footer">
            <small>
              🤖 สร้างโดย AI 
              <span v-if="currentSolution.generatedAt">
                • {{ formatDate(currentSolution.generatedAt) }}
              </span>
            </small>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeSolutionModal" class="btn btn-primary">
            ปิด
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const courses = ref([])
const selectedCourseId = ref('')
const questions = ref([])
const loading = ref(false)
const searchQuery = ref('')

const showGenerateModal = ref(false)
const generateCount = ref(3)
const generating = ref(false)

const showEditModal = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const editingQuestion = ref(null)
const formData = ref({
  question: '',
  hint: '',
  category: 'วิเคราะห์',
  relatedLOs: [],
  isPublic: false
})

const generatingSolution = ref(null)
const showSolutionModal = ref(false)
const currentSolution = ref(null)

const activeTab = ref('my-questions')

// Load courses
onMounted(async () => {
  try {
    const coursesRef = collection(db, 'courses')
    const q = query(coursesRef, where('teacherId', '==', authStore.user.uid))
    const snapshot = await getDocs(q)
    
    courses.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading courses:', error)
    alert('เกิดข้อผิดพลาดในการโหลดรายวิชา')
  }
})

function switchTab(tab) {
  activeTab.value = tab
  selectedCourseId.value = ''
  if (tab === 'national') {
    loadQuestions()
  } else {
    questions.value = []
  }
}

// Load questions
async function loadQuestions() {
  if (!selectedCourseId.value && activeTab.value !== 'national') return

  loading.value = true
  try {
    let q
    if (activeTab.value === 'national') {
      q = query(
        collection(db, 'questions'),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(50)
      )
    } else {
      q = query(
        collection(db, 'questions'),
        where('courseId', '==', selectedCourseId.value),
        orderBy('createdAt', 'desc')
      )
    }

    const snapshot = await getDocs(q)
    questions.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading questions:', error)
    // alert('เกิดข้อผิดพลาดในการโหลดคำถาม')
  } finally {
    loading.value = false
  }
}

// Load courses
onMounted(async () => {
  try {
    const coursesRef = collection(db, 'courses')
    const q = query(coursesRef, where('teacherId', '==', authStore.user.uid))
    const snapshot = await getDocs(q)
    
    courses.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading courses:', error)
    alert('เกิดข้อผิดพลาดในการโหลดรายวิชา')
  }
})

// Filtered questions
const filteredQuestions = computed(() => {
  if (!searchQuery.value) return questions.value
  
  const query = searchQuery.value.toLowerCase()
  return questions.value.filter(q => 
    q.question.toLowerCase().includes(query) ||
    q.category.toLowerCase().includes(query)
  )
})

// Selected course LOs
const selectedCourseLOs = computed(() => {
  const course = courses.value.find(c => c.id === selectedCourseId.value)
  return course?.learningOutcomes || []
})

// Open generate modal
function openGenerateModal() {
  showGenerateModal.value = true
}

function closeGenerateModal() {
  showGenerateModal.value = false
  generateCount.value = 3
}

// Generate questions with AI
async function generateQuestions() {
  const course = courses.value.find(c => c.id === selectedCourseId.value)
  if (!course) return

  generating.value = true
  try {
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL
    const response = await fetch(`${functionsUrl}/generateHOTSQuestion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: selectedCourseId.value,
        courseName: course.courseName,
        learningOutcomes: course.learningOutcomes,
        questionCount: generateCount.value
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      // Check for quota error
      if (response.status === 429 || errorData.type === 'quota_exceeded') {
        throw new Error(errorData.message || 'เครดิต OpenAI API หมดแล้ว กรุณาเติมเครดิตหรือใช้ "สร้างคำถามเอง" แทน')
      }
      
      throw new Error('Failed to generate questions')
    }

    const result = await response.json()
    
    // Save generated questions to Firestore
    const savePromises = result.questions.map(q => 
      addDoc(collection(db, 'questions'), {
        courseId: selectedCourseId.value,
        teacherId: authStore.user.uid,
        question: q.question,
        hint: q.hint || '',
        category: q.category || 'วิเคราะห์',
        relatedLOs: q.relatedLOs || [],
        expectedSkills: q.expectedSkills || [],
        usageCount: 0,
        createdAt: serverTimestamp(),
        createdBy: 'AI'
      })
    )

    await Promise.all(savePromises)
    
    alert(`สร้างคำถามสำเร็จ ${result.questions.length} ข้อ!`)
    closeGenerateModal()
    await loadQuestions()
  } catch (error) {
    console.error('Error generating questions:', error)
    alert(error.message || 'เกิดข้อผิดพลาดในการสร้างคำถาม')
  } finally {
    generating.value = false
  }
}

// Open create/edit modal
function openCreateModal() {
  isEditing.value = false
  editingQuestion.value = null
  formData.value = {
    question: '',
    hint: '',
    category: 'วิเคราะห์',
    relatedLOs: [],
    isPublic: false
  }
  showEditModal.value = true
}

function editQuestion(question) {
  isEditing.value = true
  editingQuestion.value = question
  formData.value = {
    question: question.question,
    hint: question.hint || '',
    category: question.category,
    relatedLOs: question.relatedLOs || [],
    isPublic: question.isPublic || false
  }
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
}

// Save question
async function saveQuestion() {
  saving.value = true
  try {
    if (isEditing.value && editingQuestion.value) {
      // Update existing question
      await updateDoc(doc(db, 'questions', editingQuestion.value.id), {
        question: formData.value.question,
        hint: formData.value.hint,
        category: formData.value.category,
        relatedLOs: formData.value.relatedLOs,
        isPublic: formData.value.isPublic,
        updatedAt: serverTimestamp()
      })
      alert('แก้ไขคำถามสำเร็จ!')
    } else {
      // Create new question
      await addDoc(collection(db, 'questions'), {
        courseId: selectedCourseId.value,
        teacherId: authStore.user.uid,
        question: formData.value.question,
        hint: formData.value.hint,
        category: formData.value.category,
        relatedLOs: formData.value.relatedLOs,
        isPublic: formData.value.isPublic,
        usageCount: 0,
        createdAt: serverTimestamp(),
        createdBy: 'Teacher'
      })
      alert('สร้างคำถามสำเร็จ!')
    }

    closeEditModal()
    await loadQuestions()
  } catch (error) {
    console.error('Error saving question:', error)
    alert('เกิดข้อผิดพลาดในการบันทึก')
  } finally {
    saving.value = false
  }
}

// Delete question
async function deleteQuestion(question) {
  if (!confirm(`ต้องการลบคำถามนี้?\n"${question.question.substring(0, 50)}..."`)) return

  try {
    await deleteDoc(doc(db, 'questions', question.id))
    alert('ลบคำถามสำเร็จ!')
    await loadQuestions()
  } catch (error) {
    console.error('Error deleting question:', error)
    alert('เกิดข้อผิดพลาดในการลบ')
  }
}

// Import question from National PLC
async function importQuestion(question) {
  const targetCourseId = prompt('กรุณาระบุ Course ID ที่ต้องการนำเข้า (หรือเลือกรายวิชาในแท็บ "คำถามของฉัน" ก่อน):', courses.value[0]?.id)
  if (!targetCourseId) return

  try {
    await addDoc(collection(db, 'questions'), {
      courseId: targetCourseId,
      teacherId: authStore.user.uid,
      question: question.question,
      hint: question.hint || '',
      category: question.category,
      relatedLOs: [], // Reset LOs
      usageCount: 0,
      createdAt: serverTimestamp(),
      createdBy: 'Imported',
      originalQuestionId: question.id,
      isPublic: false
    })
    
    alert('นำเข้าคำถามสำเร็จ!')
  } catch (error) {
    console.error('Error importing question:', error)
    alert('เกิดข้อผิดพลาดในการนำเข้า')
  }
}

// Generate solution using AI
async function generateSolution(question) {
  if (!confirm(question.hasSolution 
    ? 'คำถามนี้มีเฉลยอยู่แล้ว ต้องการสร้างใหม่?' 
    : 'สร้างเฉลยด้วย AI สำหรับคำถามนี้?')) {
    return
  }

  generatingSolution.value = question.id
  try {
    const course = courses.value.find(c => c.id === selectedCourseId.value)
    
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL
    const response = await fetch(`${functionsUrl}/generateSolution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: question.id,
        question: question.question,
        hint: question.hint,
        category: question.category,
        relatedLOs: question.relatedLOs,
        courseContext: `${course?.courseCode || ''} ${course?.courseName || ''}`
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to generate solution')
    }

    const data = await response.json()
    
    // Reload questions to get updated hasSolution flag
    await loadQuestions()
    
    // Show the solution
    currentSolution.value = {
      ...data,
      questionText: question.question
    }
    showSolutionModal.value = true
    alert('✅ สร้างเฉลยสำเร็จ!')

  } catch (error) {
    console.error('Error generating solution:', error)
    alert(`เกิดข้อผิดพลาด: ${error.message}`)
  } finally {
    generatingSolution.value = null
  }
}
// View existing solution
async function viewSolution(question) {
  if (!question.solution) {
    alert('ไม่พบข้อมูลเฉลย')
    return
  }

  currentSolution.value = {
    ...question.solution,
    questionText: question.question
  }
  showSolutionModal.value = true
}
function closeSolutionModal() {
  showSolutionModal.value = false
  currentSolution.value = null
}

// Format date
function formatDate(timestamp) {
  if (!timestamp) return '-'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}













































</script>

<style scoped>
.question-bank-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
  min-height: 100vh;
  background: var(--bg-primary);
}

.navbar {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
}

.nav-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.nav-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 10px 20px;
  font-size: 0.875rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.btn-outline-primary {
  background: transparent;
  color: var(--primary);
  border: 2px solid var(--primary);
}

.btn-outline-primary:hover {
  background: var(--primary);
  color: #fff;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.card h2 {
  color: var(--text-primary);
  margin-bottom: 12px;
}

.library-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab-btn {
  flex: 1;
  padding: 14px;
  font-size: 1rem;
  font-weight: 600;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-color: transparent;
}

.tab-btn:hover:not(.active) {
  background: var(--bg-hover);
  border-color: var(--primary);
}

.content-wrapper {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.form-select, .form-input {
  width: 100%;
  padding: 14px;
  font-size: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  margin-bottom: 16px;
  background: var(--input-bg);
  color: var(--text-primary);
  transition: border-color 0.3s ease;
}

.form-select:focus, .form-input:focus {
  border-color: var(--primary);
  outline: none;
}

.actions-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.questions-section {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  color: var(--text-primary);
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  padding: 10px 16px;
  font-size: 0.875rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--text-primary);
  min-width: 200px;
}

.search-input:focus {
  border-color: var(--primary);
  outline: none;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 40px;
  font-size: 1rem;
  color: var(--text-secondary);
}

.questions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.question-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.question-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px var(--shadow);
  border-color: var(--primary);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.question-number {
  font-weight: 700;
  color: var(--primary);
}

.question-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  background: var(--bg-tertiary);
  border: none;
  cursor: pointer;
  font-size: 1.125rem;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: var(--primary);
  transform: scale(1.1);
}

.question-body {
  margin-bottom: 12px;
}

.question-text {
  font-size: 1rem;
  color: var(--text-primary);
  line-height: 1.6;
}

.question-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.related-los {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
}

.public-badge {
  color: #10b981;
  font-size: 1.25rem;
}

.question-hint {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-style: italic;
}

.question-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-secondary);
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.import-action {
  margin-top: 12px;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: var(--modal-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 28px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  background: var(--bg-tertiary);
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--text-secondary);
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--danger);
  color: #fff;
}

.modal-body {
  margin-bottom: 20px;
}

.modal-body p {
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.modal-footer, .form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--text-primary);
}

.form-textarea {
  width: 100%;
  padding: 14px;
  font-size: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  resize: vertical;
  min-height: 120px;
  background: var(--input-bg);
  color: var(--text-primary);
  transition: border-color 0.3s ease;
}

.form-textarea:focus {
  border-color: var(--primary);
  outline: none;
}

.form-check {
  display: flex;
  align-items: center;
  gap: 10px;
}

.form-check-input {
  width: 20px;
  height: 20px;
  accent-color: var(--primary);
}

.form-check-label {
  font-size: 1rem;
  color: var(--text-primary);
}

.text-danger {
  color: var(--danger);
}

.text-success {
  color: var(--success);
}

.text-muted {
  color: var(--text-secondary);
}

/* Generate Modal specific */
.modal-content .form-input {
  margin-bottom: 0;
}

/* Edit Modal Styles */
.modal-content.large {
  max-width: 700px;
}

.lo-selection {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.no-lo {
  color: var(--text-secondary);
  font-style: italic;
  padding: 8px;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.checkbox-label:hover {
  background: var(--bg-hover);
}

.checkbox-label input[type="checkbox"] {
  margin-top: 2px;
  accent-color: var(--primary);
}

.lo-code {
  font-weight: 600;
  color: var(--primary);
  white-space: nowrap;
}

.lo-desc {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.checkbox-group {
  background: var(--bg-tertiary);
  padding: 12px;
  border-radius: 8px;
}

.help-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 4px;
  margin-left: 24px;
}

.required {
  color: var(--danger);
}

/* Solution Modal Styles */
.solution-modal {
  max-width: 800px;
}

.solution-content {
  max-height: 60vh;
  overflow-y: auto;
}

.solution-section {
  margin-bottom: 24px;
}

.solution-section .section-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.question-display, .answer-display {
  background: var(--bg-tertiary);
  padding: 16px;
  border-radius: 8px;
  color: var(--text-primary);
  line-height: 1.6;
}

.highlight-section {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 12px;
  padding: 16px;
}

.highlight-section .answer-display {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.score-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
}

.score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.score-label {
  font-weight: 600;
  color: var(--text-primary);
}

.score-value {
  font-weight: 700;
  color: var(--success);
  font-size: 1.125rem;
}

.score-explanation {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.key-points-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.key-points-list li {
  background: var(--bg-tertiary);
  padding: 10px 14px;
  border-radius: 6px;
  margin-bottom: 8px;
  color: var(--text-primary);
  position: relative;
  padding-left: 28px;
}

.key-points-list li::before {
  content: "✓";
  position: absolute;
  left: 10px;
  color: var(--success);
  font-weight: bold;
}

.teacher-notes {
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 12px;
  padding: 16px;
}

.teacher-notes p {
  color: var(--text-primary);
  margin: 0;
}

.solution-footer {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.modal-actions {
  display: flex;
  justify-content: center;
  padding-top: 16px;
}

@media (max-width: 768px) {
  .score-grid {
    grid-template-columns: 1fr;
  }
}
</style>