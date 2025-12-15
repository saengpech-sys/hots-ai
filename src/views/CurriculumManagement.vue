<template>
  <div class="curriculum-management">
    <div class="header">
      <h1>📚 จัดการหลักสูตรมาตรฐาน</h1>
      <button @click="showCreateDialog = true" class="btn-primary">
        ➕ สร้างหลักสูตรใหม่
      </button>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="filter-group">
        <label>ระดับชั้น:</label>
        <select v-model="filters.grade" class="form-select">
          <option value="">ทั้งหมด</option>
          <option value="m1">ม.1</option>
          <option value="m2">ม.2</option>
          <option value="m3">ม.3</option>
          <option value="m4">ม.4</option>
          <option value="m5">ม.5</option>
          <option value="m6">ม.6</option>
        </select>
      </div>
      <div class="filter-group">
        <label>ปีหลักสูตร:</label>
        <select v-model="filters.year" class="form-select">
          <option value="">ทั้งหมด</option>
          <option value="2551">พ.ศ. 2551</option>
          <option value="2560">พ.ศ. 2560 (ปรับปรุง)</option>
        </select>
      </div>
      <div class="filter-group">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="🔍 ค้นหาวิชา..."
          class="form-input"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">กำลังโหลดหลักสูตร...</div>

    <!-- Curriculum List -->
    <div v-else class="curriculum-list">
      <div v-for="curriculum in filteredCurriculums" :key="curriculum.id" class="curriculum-item">
        <div class="curriculum-header">
          <div class="curriculum-title">
            <h3>{{ curriculum.subjectName }}</h3>
            <span class="subject-code">{{ curriculum.subjectCode }}</span>
          </div>
          <div class="curriculum-badges">
            <span class="badge badge-grade">{{ curriculum.gradeLevel.toUpperCase() }}</span>
            <span class="badge badge-year">{{ curriculum.curriculumYear }}</span>
          </div>
        </div>

        <div class="curriculum-stats">
          <div class="stat">
            <span class="stat-label">จำนวน LOs:</span>
            <strong>{{ curriculum.learningOutcomes?.length || 0 }}</strong>
          </div>
          <div class="stat">
            <span class="stat-label">สร้างเมื่อ:</span>
            <strong>{{ formatDate(curriculum.createdAt) }}</strong>
          </div>
        </div>

        <!-- Learning Outcomes List -->
        <div v-if="expandedCurriculum === curriculum.id" class="lo-section">
          <h4>🎯 Learning Outcomes</h4>
          <div class="lo-list">
            <div v-for="(lo, index) in curriculum.learningOutcomes" :key="index" class="lo-item">
              <div class="lo-header">
                <strong>{{ lo.code }}</strong>
                <span class="lo-type">{{ getStandardLabel(lo.standard) }}</span>
              </div>
              <p class="lo-description">{{ lo.description }}</p>
              <div v-if="lo.indicators" class="lo-indicators">
                <small>ตัวชี้วัด:</small>
                <ul>
                  <li v-for="(indicator, i) in lo.indicators" :key="i">{{ indicator }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="curriculum-actions">
          <button 
            @click="toggleExpand(curriculum.id)" 
            class="btn-secondary"
          >
            {{ expandedCurriculum === curriculum.id ? '▲ ซ่อน' : '▼ ดู LOs' }}
          </button>
          <button @click="editCurriculum(curriculum)" class="btn-edit">
            ✏️ แก้ไข
          </button>
          <button @click="copyCurriculum(curriculum)" class="btn-copy">
            📋 คัดลอก
          </button>
          <button @click="confirmDelete(curriculum)" class="btn-delete">
            🗑️ ลบ
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredCurriculums.length === 0" class="empty-state">
        <p>😕 ไม่พบหลักสูตรที่ตรงกับเงื่อนไข</p>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <div v-if="showCreateDialog" class="modal-overlay" @click.self="closeDialog">
      <div class="modal-dialog">
        <div class="modal-header">
          <h2>{{ editMode ? '✏️ แก้ไขหลักสูตร' : '➕ สร้างหลักสูตรใหม่' }}</h2>
          <button @click="closeDialog" class="btn-close">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>รหัสวิชา <span class="required">*</span></label>
            <input
              v-model="curriculumForm.subjectCode"
              type="text"
              placeholder="เช่น ว21001"
              class="form-input"
              required
            />
          </div>

          <div class="form-group">
            <label>ชื่อวิชา <span class="required">*</span></label>
            <input
              v-model="curriculumForm.subjectName"
              type="text"
              placeholder="เช่น วิทยาศาสตร์และเทคโนโลยี"
              class="form-input"
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>ระดับชั้น <span class="required">*</span></label>
              <select v-model="curriculumForm.gradeLevel" class="form-select" required>
                <option value="">เลือกระดับชั้น</option>
                <option value="m1">ม.1</option>
                <option value="m2">ม.2</option>
                <option value="m3">ม.3</option>
                <option value="m4">ม.4</option>
                <option value="m5">ม.5</option>
                <option value="m6">ม.6</option>
              </select>
            </div>

            <div class="form-group">
              <label>ปีหลักสูตร <span class="required">*</span></label>
              <select v-model="curriculumForm.curriculumYear" class="form-select" required>
                <option value="">เลือกปี</option>
                <option value="2551">พ.ศ. 2551</option>
                <option value="2560">พ.ศ. 2560 (ปรับปรุง)</option>
              </select>
            </div>
          </div>

          <!-- Learning Outcomes -->
          <div class="lo-form-section">
            <div class="section-header">
              <h3>🎯 Learning Outcomes</h3>
              <button @click="addLO" type="button" class="btn-small">+ เพิ่ม LO</button>
            </div>

            <div v-for="(lo, index) in curriculumForm.learningOutcomes" :key="index" class="lo-form-item">
              <div class="lo-form-header">
                <strong>LO #{{ index + 1 }}</strong>
                <button @click="removeLO(index)" type="button" class="btn-remove">✕</button>
              </div>
              
              <div class="form-group">
                <label>รหัส LO</label>
                <input
                  v-model="lo.code"
                  type="text"
                  placeholder="เช่น ว1.1 ม.1/1"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label>คำอธิบาย</label>
                <textarea
                  v-model="lo.description"
                  placeholder="อธิบาย Learning Outcome นี้..."
                  rows="3"
                  class="form-textarea"
                ></textarea>
              </div>

              <div class="form-group">
                <label>มาตรฐาน</label>
                <select v-model="lo.standard" class="form-select">
                  <option value="">เลือกมาตรฐาน</option>
                  <option value="content">มาตรฐานด้านเนื้อหา</option>
                  <option value="process">มาตรฐานด้านกระบวนการ</option>
                  <option value="integration">มาตรฐานด้านบูรณาการ</option>
                </select>
              </div>
            </div>

            <!-- AI Generate Button -->
            <button 
              @click="aiGenerateLOs" 
              type="button" 
              class="btn-ai"
              :disabled="generatingLOs"
            >
              {{ generatingLOs ? '🔄 กำลังสร้าง...' : '✨ สร้าง LOs ด้วย AI' }}
            </button>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeDialog" class="btn-secondary">ยกเลิก</button>
          <button 
            @click="saveCurriculum" 
            class="btn-primary"
            :disabled="saving || !isFormValid"
          >
            {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const generatingLOs = ref(false)
const showCreateDialog = ref(false)
const editMode = ref(false)
const expandedCurriculum = ref(null)

const curriculums = ref([])
const searchQuery = ref('')
const filters = ref({
  grade: '',
  year: ''
})

const curriculumForm = ref({
  subjectCode: '',
  subjectName: '',
  gradeLevel: '',
  curriculumYear: '',
  learningOutcomes: []
})

const filteredCurriculums = computed(() => {
  let result = curriculums.value

  if (filters.value.grade) {
    result = result.filter(c => c.gradeLevel === filters.value.grade)
  }

  if (filters.value.year) {
    result = result.filter(c => c.curriculumYear === filters.value.year)
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(c =>
      c.subjectName.toLowerCase().includes(query) ||
      c.subjectCode.toLowerCase().includes(query)
    )
  }

  return result
})

const isFormValid = computed(() => {
  return (
    curriculumForm.value.subjectCode.trim() &&
    curriculumForm.value.subjectName.trim() &&
    curriculumForm.value.gradeLevel &&
    curriculumForm.value.curriculumYear &&
    curriculumForm.value.learningOutcomes.length > 0
  )
})

onMounted(async () => {
  await loadCurriculums()
  
  // Check if editing from URL
  if (route.query.id) {
    const curriculum = curriculums.value.find(c => c.id === route.query.id)
    if (curriculum) {
      editCurriculum(curriculum)
    }
  }
})

async function loadCurriculums() {
  try {
    loading.value = true
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    const response = await fetch(`${functionsUrl}/getMasterCurriculums`)
    const data = await response.json()
    
    if (data.success) {
      curriculums.value = data.curriculums
    }
  } catch (error) {
    console.error('Error loading curriculums:', error)
    alert('ไม่สามารถโหลดหลักสูตรได้')
  } finally {
    loading.value = false
  }
}

function toggleExpand(id) {
  expandedCurriculum.value = expandedCurriculum.value === id ? null : id
}

function editCurriculum(curriculum) {
  editMode.value = true
  curriculumForm.value = {
    id: curriculum.id,
    subjectCode: curriculum.subjectCode,
    subjectName: curriculum.subjectName,
    gradeLevel: curriculum.gradeLevel,
    curriculumYear: curriculum.curriculumYear,
    learningOutcomes: [...(curriculum.learningOutcomes || [])]
  }
  showCreateDialog.value = true
}

function copyCurriculum(curriculum) {
  editMode.value = false
  curriculumForm.value = {
    subjectCode: curriculum.subjectCode + '_COPY',
    subjectName: curriculum.subjectName + ' (สำเนา)',
    gradeLevel: curriculum.gradeLevel,
    curriculumYear: curriculum.curriculumYear,
    learningOutcomes: [...(curriculum.learningOutcomes || [])]
  }
  showCreateDialog.value = true
}

async function confirmDelete(curriculum) {
  if (!confirm(`ต้องการลบหลักสูตร "${curriculum.subjectName}" ใช่หรือไม่?`)) return
  
  try {
    // Call delete Cloud Function (needs to be implemented)
    alert('ฟังก์ชันลบหลักสูตรยังไม่พร้อมใช้งาน')
  } catch (error) {
    console.error('Error deleting curriculum:', error)
    alert('ไม่สามารถลบหลักสูตรได้')
  }
}

function closeDialog() {
  showCreateDialog.value = false
  editMode.value = false
  curriculumForm.value = {
    subjectCode: '',
    subjectName: '',
    gradeLevel: '',
    curriculumYear: '',
    learningOutcomes: []
  }
}

function addLO() {
  curriculumForm.value.learningOutcomes.push({
    code: '',
    description: '',
    standard: '',
    indicators: []
  })
}

function removeLO(index) {
  curriculumForm.value.learningOutcomes.splice(index, 1)
}

async function aiGenerateLOs() {
  if (!curriculumForm.value.subjectName || !curriculumForm.value.gradeLevel) {
    alert('กรุณาระบุชื่อวิชาและระดับชั้นก่อน')
    return
  }

  try {
    generatingLOs.value = true
    
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    const response = await fetch(`${functionsUrl}/generateLearningOutcomes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: curriculumForm.value.subjectName,
        gradeLevel: curriculumForm.value.gradeLevel
      })
    })

    const data = await response.json()
    
    if (data.success) {
      curriculumForm.value.learningOutcomes = data.learningOutcomes
      alert('✅ สร้าง LOs ด้วย AI สำเร็จ!')
    } else {
      throw new Error(data.error)
    }
  } catch (error) {
    console.error('Error generating LOs:', error)
    alert('ไม่สามารถสร้าง LOs ด้วย AI ได้')
  } finally {
    generatingLOs.value = false
  }
}

async function saveCurriculum() {
  if (!isFormValid.value) return

  try {
    saving.value = true
    
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    const response = await fetch(`${functionsUrl}/createMasterCurriculum`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...curriculumForm.value,
        updatedBy: authStore.user.uid
      })
    })

    const data = await response.json()
    
    if (data.success) {
      alert('✅ บันทึกหลักสูตรสำเร็จ!')
      closeDialog()
      await loadCurriculums()
    } else {
      throw new Error(data.error)
    }
  } catch (error) {
    console.error('Error saving curriculum:', error)
    alert('ไม่สามารถบันทึกหลักสูตรได้')
  } finally {
    saving.value = false
  }
}

function getStandardLabel(standard) {
  const labels = {
    content: '📖 เนื้อหา',
    process: '⚙️ กระบวนการ',
    integration: '🔗 บูรณาการ'
  }
  return labels[standard] || standard
}

function formatDate(timestamp) {
  if (!timestamp) return '-'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<style scoped>
.curriculum-management {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 2em;
  color: var(--text-primary);
}

.filters-section {
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  font-weight: 600;
  color: var(--text-secondary);
}

.form-input, .form-select, .form-textarea {
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1em;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  outline: none;
  border-color: #1976D2;
}

.loading {
  text-align: center;
  padding: 60px;
  color: var(--text-secondary);
  font-size: 1.1em;
}

.curriculum-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.curriculum-item {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border-left: 4px solid #1976D2;
}

.curriculum-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.curriculum-title {
  display: flex;
  align-items: center;
  gap: 15px;
}

.curriculum-title h3 {
  margin: 0;
  color: var(--text-primary);
}

.subject-code {
  background: #e3f2fd;
  color: #1976D2;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.9em;
  font-weight: bold;
}

.curriculum-badges {
  display: flex;
  gap: 8px;
}

.badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: bold;
}

.badge-grade {
  background: #4CAF50;
  color: white;
}

.badge-year {
  background: #FF9800;
  color: white;
}

.curriculum-stats {
  display: flex;
  gap: 30px;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.stat {
  display: flex;
  gap: 8px;
}

.stat-label {
  color: var(--text-secondary);
}

.curriculum-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-primary, .btn-secondary, .btn-edit, .btn-copy, .btn-delete, .btn-ai, .btn-small {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95em;
  transition: all 0.3s;
}

.btn-primary {
  background: #1976D2;
  color: white;
}

.btn-primary:hover {
  background: #1565C0;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #4CAF50;
  color: white;
}

.btn-secondary:hover {
  background: #45a049;
}

.btn-edit {
  background: #FF9800;
  color: white;
}

.btn-edit:hover {
  background: #e68900;
}

.btn-copy {
  background: #9C27B0;
  color: white;
}

.btn-copy:hover {
  background: #7B1FA2;
}

.btn-delete {
  background: #f44336;
  color: white;
}

.btn-delete:hover {
  background: #d32f2f;
}

.btn-ai {
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: bold;
  padding: 12px;
}

.btn-ai:hover {
  opacity: 0.9;
}

.btn-ai:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-small {
  padding: 6px 12px;
  font-size: 0.85em;
  background: #2196F3;
  color: white;
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: var(--text-secondary);
  font-size: 1.1em;
}

/* LO Section */
.lo-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px dashed #e0e0e0;
}

.lo-section h4 {
  margin-bottom: 15px;
  color: var(--text-primary);
}

.lo-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.lo-item {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  border-left: 3px solid #4CAF50;
}

.lo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.lo-type {
  font-size: 0.85em;
  color: var(--text-secondary);
}

.lo-description {
  color: var(--text-primary);
  line-height: 1.6;
  margin: 8px 0;
}

.lo-indicators {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e0e0e0;
  font-size: 0.9em;
  color: var(--text-secondary);
}

.lo-indicators ul {
  margin: 5px 0 0 20px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-dialog {
  background: var(--card-bg);
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  color: var(--text-primary);
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: var(--text-secondary);
}

.btn-close:hover {
  color: #f44336;
}

.modal-body {
  padding: 25px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px 25px;
  border-top: 1px solid #e0e0e0;
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

.required {
  color: #f44336;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-textarea {
  width: 100%;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

/* LO Form Section */
.lo-form-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 2px solid #e0e0e0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.lo-form-item {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 15px;
  border-left: 3px solid #2196F3;
}

.lo-form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.btn-remove {
  background: #f44336;
  color: white;
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
}

.btn-remove:hover {
  background: #d32f2f;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .filters-section {
    flex-direction: column;
  }

  .filter-group {
    width: 100%;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
