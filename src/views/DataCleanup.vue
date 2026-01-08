<template>
  <div class="data-cleanup">
    <div class="page-header">
      <h1>
        <span class="material-icons">cleaning_services</span>
        จัดการข้อมูลตกค้าง
      </h1>
      <p class="subtitle">ตรวจสอบและลบข้อมูลที่ไม่ได้ใช้งานแล้ว เพื่อประหยัดพื้นที่จัดเก็บ</p>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button 
        class="tab" 
        :class="{ active: activeTab === 'inaccessible' }"
        @click="activeTab = 'inaccessible'"
      >
        👻 ข้อมูลเข้าไม่ถึง
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'orphaned' }"
        @click="activeTab = 'orphaned'"
      >
        🔍 ข้อมูลตกค้าง
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'reset' }"
        @click="activeTab = 'reset'"
      >
        🗑️ Reset รายวิชา
      </button>
    </div>

    <!-- Tab: Inaccessible Data (NEW - มีอยู่ในฐานข้อมูลแต่ไม่แสดงใน frontend) -->
    <div v-show="activeTab === 'inaccessible'">
      <div class="info-box">
        <span class="material-icons">info</span>
        <div>
          <h4>ข้อมูลเข้าไม่ถึงคืออะไร?</h4>
          <p>ข้อมูลที่อยู่ในฐานข้อมูลแต่ <strong>ไม่แสดงในหน้าใดของระบบ</strong> เนื่องจาก:</p>
          <ul>
            <li>แผนการสอนที่ไม่มี teacherId หรือ teacherId ไม่ตรง</li>
            <li>ใบความรู้/ใบงานที่เชื่อมกับแผนการสอนที่เข้าถึงไม่ได้</li>
          </ul>
        </div>
      </div>

      <div class="filter-section">
        <label>เลือกรายวิชา:</label>
        <select v-model="inaccessibleCourseId" class="form-control">
          <option value="">ทุกรายวิชา</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.courseCode }} - {{ course.courseName }}
          </option>
        </select>
        <button class="btn btn-primary" @click="scanInaccessibleData" :disabled="scanningInaccessible">
          <span v-if="scanningInaccessible" class="spinner"></span>
          <span class="material-icons" v-else>search</span>
          {{ scanningInaccessible ? 'กำลังสแกน...' : 'สแกนข้อมูลเข้าไม่ถึง' }}
        </button>
      </div>

      <!-- Inaccessible Results -->
      <div class="results-section" v-if="inaccessibleResult">
        <h3>👻 ผลการสแกน</h3>
        
        <div class="summary-alert" :class="inaccessibleResult.summary.total > 0 ? 'warning' : 'success'">
          <span class="material-icons">{{ inaccessibleResult.summary.total > 0 ? 'visibility_off' : 'check_circle' }}</span>
          <div>
            <strong v-if="inaccessibleResult.summary.total > 0">
              พบข้อมูลเข้าไม่ถึง {{ inaccessibleResult.summary.total }} รายการ
            </strong>
            <strong v-else>ไม่พบข้อมูลเข้าไม่ถึง</strong>
            <p v-if="inaccessibleResult.summary.total > 0">
              แผนการสอน: {{ inaccessibleResult.summary.byType.lessonPlans }} |
              ใบความรู้: {{ inaccessibleResult.summary.byType.knowledgeSheets }} |
              ใบงาน: {{ inaccessibleResult.summary.byType.worksheets }}
            </p>
          </div>
        </div>

        <!-- Inaccessible Lesson Plans -->
        <div class="orphan-section" v-if="inaccessibleResult.inaccessibleLessonPlans?.length > 0">
          <h4>
            <span class="material-icons">description</span>
            แผนการสอนเข้าไม่ถึง ({{ inaccessibleResult.inaccessibleLessonPlans.length }})
          </h4>
          <div class="orphan-list">
            <div v-for="item in inaccessibleResult.inaccessibleLessonPlans" :key="item.id" class="orphan-item">
              <div class="orphan-info">
                <span class="orphan-topic">{{ item.topic || 'ไม่ระบุหัวข้อ' }}</span>
                <span class="orphan-meta">
                  หน่วย {{ item.unitNumber }} แผน {{ item.planNumber }} | 
                  <span class="reason-tag">{{ item.reason }}</span>
                </span>
              </div>
              <span class="orphan-id">{{ item.id.substring(0, 8) }}...</span>
            </div>
          </div>
        </div>

        <!-- Inaccessible Knowledge Sheets -->
        <div class="orphan-section" v-if="inaccessibleResult.inaccessibleKnowledgeSheets?.length > 0">
          <h4>
            <span class="material-icons">menu_book</span>
            ใบความรู้เข้าไม่ถึง ({{ inaccessibleResult.inaccessibleKnowledgeSheets.length }})
          </h4>
          <div class="orphan-list">
            <div v-for="item in inaccessibleResult.inaccessibleKnowledgeSheets" :key="item.id" class="orphan-item">
              <div class="orphan-info">
                <span class="orphan-topic">{{ item.title || 'ไม่ระบุชื่อ' }}</span>
                <span class="orphan-meta">
                  <span class="reason-tag">{{ item.reason }}</span>
                </span>
              </div>
              <span class="orphan-id">{{ item.id.substring(0, 8) }}...</span>
            </div>
          </div>
        </div>

        <!-- Inaccessible Worksheets -->
        <div class="orphan-section" v-if="inaccessibleResult.inaccessibleWorksheets?.length > 0">
          <h4>
            <span class="material-icons">assignment</span>
            ใบงานเข้าไม่ถึง ({{ inaccessibleResult.inaccessibleWorksheets.length }})
          </h4>
          <div class="orphan-list">
            <div v-for="item in inaccessibleResult.inaccessibleWorksheets" :key="item.id" class="orphan-item">
              <div class="orphan-info">
                <span class="orphan-topic">{{ item.title || 'ไม่ระบุชื่อ' }}</span>
                <span class="orphan-meta">
                  <span class="reason-tag">{{ item.reason }}</span>
                </span>
              </div>
              <span class="orphan-id">{{ item.id.substring(0, 8) }}...</span>
            </div>
          </div>
        </div>

        <!-- Cleanup Actions -->
        <div class="cleanup-actions" v-if="inaccessibleResult.summary.total > 0">
          <div class="action-warning">
            <span class="material-icons">info</span>
            <p>การลบข้อมูลจะไม่สามารถกู้คืนได้ กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ</p>
          </div>
          
          <div class="action-buttons">
            <button class="btn btn-outline" @click="previewInaccessibleCleanup" :disabled="cleaningInaccessible">
              <span class="material-icons">preview</span>
              Preview (Dry Run)
            </button>
            <button class="btn btn-danger" @click="confirmInaccessibleCleanup" :disabled="cleaningInaccessible">
              <span v-if="cleaningInaccessible" class="spinner"></span>
              <span class="material-icons" v-else>delete_sweep</span>
              {{ cleaningInaccessible ? 'กำลังลบ...' : 'ลบข้อมูลเข้าไม่ถึงทั้งหมด' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Cleanup Result -->
      <div class="cleanup-result" v-if="inaccessibleCleanupResult">
        <h3>🧹 ผลการลบข้อมูล</h3>
        <div class="result-summary" :class="inaccessibleCleanupResult.dryRun ? 'preview' : 'executed'">
          <span class="material-icons">{{ inaccessibleCleanupResult.dryRun ? 'preview' : 'check_circle' }}</span>
          <div>
            <strong>{{ inaccessibleCleanupResult.dryRun ? 'Preview Mode' : 'ลบเรียบร้อยแล้ว' }}</strong>
            <p>
              {{ inaccessibleCleanupResult.dryRun ? 'จะลบ' : 'ลบแล้ว' }} {{ inaccessibleCleanupResult.summary.total }} รายการ
            </p>
            <ul v-if="inaccessibleCleanupResult.summary.total > 0">
              <li v-if="inaccessibleCleanupResult.summary.byType.lessonPlans > 0">
                แผนการสอน: {{ inaccessibleCleanupResult.summary.byType.lessonPlans }}
              </li>
              <li v-if="inaccessibleCleanupResult.summary.byType.knowledgeSheets > 0">
                ใบความรู้: {{ inaccessibleCleanupResult.summary.byType.knowledgeSheets }}
              </li>
              <li v-if="inaccessibleCleanupResult.summary.byType.worksheets > 0">
                ใบงาน: {{ inaccessibleCleanupResult.summary.byType.worksheets }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Orphaned Data -->
    <div v-show="activeTab === 'orphaned'">
      <!-- Course Selector -->
      <div class="filter-section">
        <label>เลือกรายวิชา:</label>
        <select v-model="selectedCourseId" class="form-control" @change="loadStorageStats">
          <option value="">ทุกรายวิชา</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.courseCode }} - {{ course.courseName }}
          </option>
        </select>
        <button class="btn btn-primary" @click="scanOrphanedData" :disabled="scanning">
          <span v-if="scanning" class="spinner"></span>
          <span class="material-icons" v-else>search</span>
          {{ scanning ? 'กำลังสแกน...' : 'สแกนข้อมูลตกค้าง' }}
        </button>
      </div>

      <!-- Storage Stats -->
      <div class="stats-section" v-if="storageStats">
        <h3>📊 สถิติการใช้พื้นที่</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">{{ storageStats.lessonPlans }}</span>
            <span class="stat-label">แผนการสอน</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ storageStats.knowledgeSheets }}</span>
            <span class="stat-label">ใบความรู้</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ storageStats.worksheets }}</span>
            <span class="stat-label">ใบงาน</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ storageStats.unitKnowledgeSheets }}</span>
            <span class="stat-label">ใบความรู้หน่วย</span>
          </div>
        </div>
      </div>

      <!-- Scan Results -->
      <div class="results-section" v-if="scanResult">
        <h3>🔍 ผลการสแกน</h3>
        
        <div class="summary-alert" :class="scanResult.summary.total > 0 ? 'warning' : 'success'">
          <span class="material-icons">{{ scanResult.summary.total > 0 ? 'warning' : 'check_circle' }}</span>
          <div>
            <strong v-if="scanResult.summary.total > 0">
              พบข้อมูลตกค้าง {{ scanResult.summary.total }} รายการ
            </strong>
            <strong v-else>ไม่พบข้อมูลตกค้าง</strong>
            <p v-if="scanResult.summary.total > 0">
              แผนการสอน: {{ scanResult.summary.byType.lessonPlans }} |
              ใบความรู้: {{ scanResult.summary.byType.knowledgeSheets }} |
              ใบงาน: {{ scanResult.summary.byType.worksheets }} |
              ใบความรู้หน่วย: {{ scanResult.summary.byType.unitKnowledgeSheets }}
            </p>
          </div>
        </div>

        <!-- Orphaned Lesson Plans -->
        <div class="orphan-section" v-if="scanResult.orphanedLessonPlans.length > 0">
          <h4>
            <span class="material-icons">description</span>
            แผนการสอนตกค้าง ({{ scanResult.orphanedLessonPlans.length }})
          </h4>
          <div class="orphan-list">
            <div v-for="item in scanResult.orphanedLessonPlans" :key="item.id" class="orphan-item">
              <div class="orphan-info">
                <span class="orphan-topic">{{ item.topic || 'ไม่ระบุหัวข้อ' }}</span>
                <span class="orphan-meta">
                  หน่วย {{ item.unitNumber }} แผน {{ item.planNumber }}
                </span>
              </div>
              <span class="orphan-id">{{ item.id.substring(0, 8) }}...</span>
            </div>
          </div>
        </div>

        <!-- Orphaned Knowledge Sheets -->
        <div class="orphan-section" v-if="scanResult.orphanedKnowledgeSheets.length > 0">
          <h4>
            <span class="material-icons">menu_book</span>
            ใบความรู้ตกค้าง ({{ scanResult.orphanedKnowledgeSheets.length }})
          </h4>
          <div class="orphan-list">
            <div v-for="item in scanResult.orphanedKnowledgeSheets" :key="item.id" class="orphan-item">
              <div class="orphan-info">
                <span class="orphan-topic">{{ item.title || 'ไม่ระบุชื่อ' }}</span>
                <span class="orphan-meta">
                  Plan ID: {{ item.lessonPlanId?.substring(0, 8) }}...
              </span>
            </div>
            <span class="orphan-id">{{ item.id.substring(0, 8) }}...</span>
          </div>
        </div>
      </div>

      <!-- Orphaned Worksheets -->
      <div class="orphan-section" v-if="scanResult.orphanedWorksheets.length > 0">
        <h4>
          <span class="material-icons">assignment</span>
          ใบงานตกค้าง ({{ scanResult.orphanedWorksheets.length }})
        </h4>
        <div class="orphan-list">
          <div v-for="item in scanResult.orphanedWorksheets" :key="item.id" class="orphan-item">
            <div class="orphan-info">
              <span class="orphan-topic">{{ item.title || 'ไม่ระบุชื่อ' }}</span>
              <span class="orphan-meta">
                Plan ID: {{ item.lessonPlanId?.substring(0, 8) }}...
              </span>
            </div>
            <span class="orphan-id">{{ item.id.substring(0, 8) }}...</span>
          </div>
        </div>
      </div>

      <!-- Cleanup Actions -->
      <div class="cleanup-actions" v-if="scanResult.summary.total > 0">
        <div class="action-warning">
          <span class="material-icons">info</span>
          <p>การลบข้อมูลจะไม่สามารถกู้คืนได้ กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ</p>
        </div>
        
        <div class="action-buttons">
          <button class="btn btn-outline" @click="previewCleanup" :disabled="cleaning">
            <span class="material-icons">preview</span>
            Preview (Dry Run)
          </button>
          <button class="btn btn-danger" @click="confirmCleanup" :disabled="cleaning">
            <span v-if="cleaning" class="spinner"></span>
            <span class="material-icons" v-else>delete_sweep</span>
            {{ cleaning ? 'กำลังลบ...' : 'ลบข้อมูลตกค้างทั้งหมด' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Cleanup Result -->
    <div class="cleanup-result" v-if="cleanupResult">
      <h3>🧹 ผลการลบข้อมูล</h3>
      <div class="result-summary" :class="cleanupResult.dryRun ? 'preview' : 'executed'">
        <span class="material-icons">{{ cleanupResult.dryRun ? 'preview' : 'check_circle' }}</span>
        <div>
          <strong>{{ cleanupResult.dryRun ? 'Preview Mode' : 'ลบเรียบร้อยแล้ว' }}</strong>
          <p>
            {{ cleanupResult.dryRun ? 'จะลบ' : 'ลบแล้ว' }} {{ cleanupResult.summary.total }} รายการ
          </p>
          <ul v-if="cleanupResult.summary.total > 0">
            <li v-if="cleanupResult.summary.byType.lessonPlans > 0">
              แผนการสอน: {{ cleanupResult.summary.byType.lessonPlans }}
            </li>
            <li v-if="cleanupResult.summary.byType.knowledgeSheets > 0">
              ใบความรู้: {{ cleanupResult.summary.byType.knowledgeSheets }}
            </li>
            <li v-if="cleanupResult.summary.byType.worksheets > 0">
              ใบงาน: {{ cleanupResult.summary.byType.worksheets }}
            </li>
            <li v-if="cleanupResult.summary.byType.unitKnowledgeSheets > 0">
              ใบความรู้หน่วย: {{ cleanupResult.summary.byType.unitKnowledgeSheets }}
            </li>
          </ul>
        </div>
      </div>
      
      <div v-if="cleanupResult.errors?.length > 0" class="error-list">
        <h4>⚠️ Errors:</h4>
        <ul>
          <li v-for="(err, i) in cleanupResult.errors" :key="i">
            {{ err.type }}: {{ err.id }} - {{ err.error }}
          </li>
        </ul>
      </div>
    </div>
    </div>

    <!-- Tab: Reset Course -->
    <div v-show="activeTab === 'reset'">
      <div class="reset-warning-box">
        <span class="material-icons warning-icon">warning</span>
        <div>
          <h4>⚠️ คำเตือน: Reset รายวิชา</h4>
          <p>ฟังก์ชันนี้จะลบ <strong>ข้อมูลทั้งหมด</strong> ของรายวิชาที่เลือก:</p>
          <ul>
            <li>แผนการสอนทั้งหมด</li>
            <li>ใบความรู้ทั้งหมด</li>
            <li>ใบงานทั้งหมด</li>
            <li>ใบความรู้หน่วยทั้งหมด</li>
          </ul>
          <p><strong>การดำเนินการนี้ไม่สามารถยกเลิกได้!</strong></p>
        </div>
      </div>

      <div class="reset-form">
        <label>เลือกรายวิชาที่ต้องการ Reset:</label>
        <select v-model="resetCourseId" class="form-control" @change="loadResetPreview">
          <option value="">-- กรุณาเลือกรายวิชา --</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.courseCode }} - {{ course.courseName }}
          </option>
        </select>

        <div class="checkbox-group">
          <label>
            <input type="checkbox" v-model="clearCurriculum">
            <span>ล้างโครงสร้างหลักสูตรด้วย (Curriculum Structure)</span>
          </label>
        </div>

        <button 
          class="btn btn-outline" 
          @click="previewReset" 
          :disabled="!resetCourseId || resetting"
        >
          <span class="material-icons">preview</span>
          Preview ข้อมูลที่จะถูกลบ
        </button>
      </div>

      <!-- Reset Preview -->
      <div class="reset-preview" v-if="resetPreview">
        <h3>📋 ข้อมูลที่จะถูกลบ</h3>
        <div class="preview-stats">
          <div class="preview-stat">
            <span class="preview-value">{{ resetPreview.summary.lessonPlans }}</span>
            <span class="preview-label">แผนการสอน</span>
          </div>
          <div class="preview-stat">
            <span class="preview-value">{{ resetPreview.summary.knowledgeSheets }}</span>
            <span class="preview-label">ใบความรู้</span>
          </div>
          <div class="preview-stat">
            <span class="preview-value">{{ resetPreview.summary.worksheets }}</span>
            <span class="preview-label">ใบงาน</span>
          </div>
          <div class="preview-stat">
            <span class="preview-value">{{ resetPreview.summary.unitKnowledgeSheets }}</span>
            <span class="preview-label">ใบความรู้หน่วย</span>
          </div>
          <div class="preview-stat total">
            <span class="preview-value">{{ resetPreview.summary.total }}</span>
            <span class="preview-label">รวมทั้งหมด</span>
          </div>
        </div>

        <!-- List of items to delete -->
        <div class="preview-items" v-if="resetPreview.deleted.lessonPlans.length > 0">
          <h4>แผนการสอน ({{ resetPreview.deleted.lessonPlans.length }})</h4>
          <div class="preview-list">
            <div v-for="item in resetPreview.deleted.lessonPlans.slice(0, 10)" :key="item.id" class="preview-item">
              {{ item.topic || `หน่วย ${item.unitNumber} แผน ${item.planNumber}` }}
            </div>
            <div v-if="resetPreview.deleted.lessonPlans.length > 10" class="preview-more">
              และอีก {{ resetPreview.deleted.lessonPlans.length - 10 }} รายการ...
            </div>
          </div>
        </div>

        <div class="reset-confirm" v-if="resetPreview.summary.total > 0">
          <div class="confirm-input">
            <label>พิมพ์ "<strong>RESET</strong>" เพื่อยืนยัน:</label>
            <input 
              type="text" 
              v-model="resetConfirmText" 
              placeholder="RESET"
              class="form-control"
            >
          </div>
          <button 
            class="btn btn-danger" 
            @click="executeReset"
            :disabled="resetConfirmText !== 'RESET' || resetting"
          >
            <span v-if="resetting" class="spinner"></span>
            <span class="material-icons" v-else>delete_forever</span>
            {{ resetting ? 'กำลังลบ...' : 'ยืนยัน Reset รายวิชา' }}
          </button>
        </div>
      </div>

      <!-- Reset Result -->
      <div class="reset-result" v-if="resetResult && !resetResult.dryRun">
        <div class="result-success">
          <span class="material-icons">check_circle</span>
          <div>
            <strong>Reset สำเร็จ!</strong>
            <p>ลบข้อมูลทั้งหมด {{ resetResult.summary.total }} รายการ</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/firebase/config'

const authStore = useAuthStore()

const courses = ref([])
const selectedCourseId = ref('')
const scanning = ref(false)
const cleaning = ref(false)
const scanResult = ref(null)
const cleanupResult = ref(null)
const storageStats = ref(null)

// Tabs
const activeTab = ref('inaccessible')

// Inaccessible data tab state
const inaccessibleCourseId = ref('')
const scanningInaccessible = ref(false)
const cleaningInaccessible = ref(false)
const inaccessibleResult = ref(null)
const inaccessibleCleanupResult = ref(null)

// Reset tab state
const resetCourseId = ref('')
const clearCurriculum = ref(false)
const resetPreview = ref(null)
const resetResult = ref(null)
const resetConfirmText = ref('')
const resetting = ref(false)

const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL

onMounted(async () => {
  await loadCourses()
  await loadStorageStats()
})

async function loadCourses() {
  try {
    const q = query(
      collection(db, 'courses'),
      where('teacherId', '==', authStore.user.uid)
    )
    const snap = await getDocs(q)
    courses.value = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading courses:', error)
  }
}

async function loadStorageStats() {
  try {
    const token = await authStore.getIdToken()
    const url = new URL(`${functionsUrl}/getDataStorageStats`)
    if (selectedCourseId.value) {
      url.searchParams.set('courseId', selectedCourseId.value)
    }
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await response.json()
    
    if (data.success) {
      storageStats.value = data.stats
    }
  } catch (error) {
    console.error('Error loading storage stats:', error)
  }
}

async function scanOrphanedData() {
  scanning.value = true
  scanResult.value = null
  cleanupResult.value = null
  
  try {
    const token = await authStore.getIdToken()
    const url = new URL(`${functionsUrl}/getOrphanedDataStats`)
    if (selectedCourseId.value) {
      url.searchParams.set('courseId', selectedCourseId.value)
    }
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await response.json()
    
    if (data.success) {
      scanResult.value = data
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.error)
    }
  } catch (error) {
    console.error('Error scanning:', error)
    alert('เกิดข้อผิดพลาด: ' + error.message)
  } finally {
    scanning.value = false
  }
}

async function previewCleanup() {
  await executeCleanup(true)
}

function confirmCleanup() {
  if (confirm('⚠️ คุณแน่ใจหรือไม่ที่จะลบข้อมูลตกค้างทั้งหมด?\n\nการดำเนินการนี้ไม่สามารถยกเลิกได้!')) {
    executeCleanup(false)
  }
}

async function executeCleanup(dryRun = true) {
  cleaning.value = true
  cleanupResult.value = null
  
  try {
    const token = await authStore.getIdToken()
    const response = await fetch(`${functionsUrl}/cleanupOrphanedData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        courseId: selectedCourseId.value || undefined,
        dryRun
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      cleanupResult.value = data
      
      // Refresh stats after actual cleanup
      if (!dryRun) {
        await loadStorageStats()
        await scanOrphanedData()
      }
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.error)
    }
  } catch (error) {
    console.error('Error cleaning up:', error)
    alert('เกิดข้อผิดพลาด: ' + error.message)
  } finally {
    cleaning.value = false
  }
}

// Inaccessible Data Functions
async function scanInaccessibleData() {
  scanningInaccessible.value = true
  inaccessibleResult.value = null
  inaccessibleCleanupResult.value = null
  
  try {
    const token = await authStore.getIdToken()
    const url = new URL(`${functionsUrl}/getInaccessibleData`)
    if (inaccessibleCourseId.value) {
      url.searchParams.set('courseId', inaccessibleCourseId.value)
    }
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await response.json()
    
    if (data.success) {
      inaccessibleResult.value = data
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.error)
    }
  } catch (error) {
    console.error('Error scanning inaccessible:', error)
    alert('เกิดข้อผิดพลาด: ' + error.message)
  } finally {
    scanningInaccessible.value = false
  }
}

async function previewInaccessibleCleanup() {
  await executeInaccessibleCleanup(true)
}

function confirmInaccessibleCleanup() {
  if (confirm('⚠️ คุณแน่ใจหรือไม่ที่จะลบข้อมูลเข้าไม่ถึงทั้งหมด?\n\nการดำเนินการนี้ไม่สามารถยกเลิกได้!')) {
    executeInaccessibleCleanup(false)
  }
}

async function executeInaccessibleCleanup(dryRun = true) {
  cleaningInaccessible.value = true
  inaccessibleCleanupResult.value = null
  
  try {
    const token = await authStore.getIdToken()
    const response = await fetch(`${functionsUrl}/cleanupInaccessibleData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        courseId: inaccessibleCourseId.value || undefined,
        dryRun
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      inaccessibleCleanupResult.value = data
      
      // Refresh after actual cleanup
      if (!dryRun) {
        await loadStorageStats()
        await scanInaccessibleData()
      }
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.error)
    }
  } catch (error) {
    console.error('Error cleaning inaccessible:', error)
    alert('เกิดข้อผิดพลาด: ' + error.message)
  } finally {
    cleaningInaccessible.value = false
  }
}

// Reset Course Functions
async function loadResetPreview() {
  resetPreview.value = null
  resetResult.value = null
  resetConfirmText.value = ''
}

async function previewReset() {
  if (!resetCourseId.value) return
  
  resetting.value = true
  resetPreview.value = null
  
  try {
    const token = await authStore.getIdToken()
    const response = await fetch(`${functionsUrl}/resetCourseData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        courseId: resetCourseId.value,
        clearCurriculum: clearCurriculum.value,
        dryRun: true
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      resetPreview.value = data
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.error)
    }
  } catch (error) {
    console.error('Error previewing reset:', error)
    alert('เกิดข้อผิดพลาด: ' + error.message)
  } finally {
    resetting.value = false
  }
}

async function executeReset() {
  if (resetConfirmText.value !== 'RESET') return
  if (!resetCourseId.value) return
  
  resetting.value = true
  
  try {
    const token = await authStore.getIdToken()
    const response = await fetch(`${functionsUrl}/resetCourseData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        courseId: resetCourseId.value,
        clearCurriculum: clearCurriculum.value,
        dryRun: false
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      resetResult.value = data
      resetPreview.value = null
      resetConfirmText.value = ''
      
      // Refresh stats
      await loadStorageStats()
      
      alert(`✅ Reset สำเร็จ! ลบข้อมูล ${data.summary.total} รายการ`)
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.error)
    }
  } catch (error) {
    console.error('Error resetting:', error)
    alert('เกิดข้อผิดพลาด: ' + error.message)
  } finally {
    resetting.value = false
  }
}
</script>

<style scoped>
/* Modern Data Cleanup Page */
.data-cleanup {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
}

/* Hero Header with Gradient */
.page-header {
  text-align: center;
  margin-bottom: 2.5rem;
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(102, 126, 234, 0.3);
}

.page-header::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 50%);
  animation: shimmer 8s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(25%, 25%); }
}

.page-header h1 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  color: white;
  font-size: 2rem;
  font-weight: 700;
  position: relative;
  z-index: 1;
}

.page-header h1 .material-icons {
  font-size: 2.5rem;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.subtitle {
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-size: 1.1rem;
  position: relative;
  z-index: 1;
}

/* Modern Tabs */
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.tab {
  flex: 1;
  padding: 1rem 1.5rem;
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-secondary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.tab:hover {
  background: rgba(102, 126, 234, 0.1);
  color: var(--text-primary);
}

.tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
  transform: translateY(-2px);
}

/* Glass Card Style */
.filter-section {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.filter-section label {
  font-weight: 600;
  color: var(--text-primary);
}

.filter-section select {
  flex: 1;
  max-width: 450px;
}

/* Stats Section */
.stats-section {
  margin-bottom: 2rem;
}

.stats-section h3 {
  margin-bottom: 1rem;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: linear-gradient(145deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  padding: 1.75rem;
  border-radius: 16px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea, #764ba2, #f093fb);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.15);
}

.stat-value {
  display: block;
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  margin-top: 0.5rem;
}

/* Results Section */
.results-section {
  margin-bottom: 2rem;
}

.results-section h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

/* Alert Boxes */
.summary-alert {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
  padding: 1.5rem 2rem;
  border-radius: 16px;
  margin-bottom: 1.5rem;
  position: relative;
  overflow: hidden;
}

.summary-alert::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
}

.summary-alert.warning {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.12) 0%, rgba(255, 152, 0, 0.08) 100%);
  border: 1px solid rgba(255, 193, 7, 0.25);
}

.summary-alert.warning::before {
  background: linear-gradient(180deg, #ffc107, #ff9800);
}

.summary-alert.success {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(46, 125, 50, 0.08) 100%);
  border: 1px solid rgba(76, 175, 80, 0.25);
}

.summary-alert.success::before {
  background: linear-gradient(180deg, #4caf50, #2e7d32);
}

.summary-alert .material-icons {
  font-size: 2.5rem;
  padding: 0.5rem;
  border-radius: 12px;
}

.summary-alert.warning .material-icons {
  color: #ff9800;
  background: rgba(255, 152, 0, 0.15);
}

.summary-alert.success .material-icons {
  color: #4caf50;
  background: rgba(76, 175, 80, 0.15);
}

.summary-alert strong {
  font-size: 1.1rem;
}

.summary-alert p {
  margin: 0.5rem 0 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* Orphan Sections */
.orphan-section {
  margin-bottom: 1.5rem;
}

.orphan-section h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
}

.orphan-section h4 .material-icons {
  font-size: 1.3rem;
  color: #764ba2;
}

.orphan-list {
  background: var(--bg-secondary);
  border-radius: 12px;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.orphan-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.2s;
}

.orphan-item:hover {
  background: rgba(102, 126, 234, 0.05);
}

.orphan-item:last-child {
  border-bottom: none;
}

.orphan-info {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.orphan-topic {
  font-weight: 600;
  color: var(--text-primary);
}

.orphan-meta {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.orphan-id {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 0.75rem;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
}

/* Cleanup Actions */
.cleanup-actions {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px dashed var(--border-color);
}

.action-warning {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 87, 34, 0.08) 100%);
  border: 1px solid rgba(255, 152, 0, 0.2);
  border-radius: 12px;
  margin-bottom: 1.25rem;
}

.action-warning .material-icons {
  color: #ff9800;
  font-size: 1.5rem;
}

.action-warning p {
  margin: 0;
  font-size: 0.9rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

/* Cleanup Result */
.cleanup-result {
  margin-top: 2rem;
}

.result-summary {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
  padding: 1.75rem;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

.result-summary::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
}

.result-summary.preview {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.12) 0%, rgba(3, 169, 244, 0.08) 100%);
  border: 1px solid rgba(33, 150, 243, 0.25);
}

.result-summary.preview::before {
  background: linear-gradient(180deg, #2196f3, #03a9f4);
}

.result-summary.executed {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(46, 125, 50, 0.08) 100%);
  border: 1px solid rgba(76, 175, 80, 0.25);
}

.result-summary.executed::before {
  background: linear-gradient(180deg, #4caf50, #2e7d32);
}

.result-summary .material-icons {
  font-size: 2.5rem;
  padding: 0.5rem;
  border-radius: 12px;
}

.result-summary.preview .material-icons {
  color: #2196f3;
  background: rgba(33, 150, 243, 0.15);
}

.result-summary.executed .material-icons {
  color: #4caf50;
  background: rgba(76, 175, 80, 0.15);
}

.result-summary ul {
  margin: 0.75rem 0 0;
  padding-left: 1.5rem;
}

.result-summary li {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

/* Error List */
.error-list {
  margin-top: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(229, 57, 53, 0.08) 100%);
  border: 1px solid rgba(244, 67, 54, 0.2);
  border-radius: 12px;
}

.error-list h4 {
  margin: 0 0 0.75rem;
  color: #f44336;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.error-list ul {
  margin: 0;
  padding-left: 1.5rem;
}

.error-list li {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Reset Tab Styles */
.reset-warning-box {
  display: flex;
  gap: 1.25rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(229, 57, 53, 0.06) 100%);
  border: 2px solid rgba(244, 67, 54, 0.25);
  border-radius: 16px;
  margin-bottom: 2rem;
  position: relative;
  overflow: hidden;
}

.reset-warning-box::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  background: linear-gradient(180deg, #f44336, #d32f2f);
}

.reset-warning-box .warning-icon {
  font-size: 3.5rem;
  color: #f44336;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
}

.reset-warning-box h4 {
  margin: 0 0 0.75rem;
  color: #f44336;
  font-size: 1.1rem;
}

.reset-warning-box ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  color: var(--text-secondary);
}

.reset-warning-box p {
  margin: 0.75rem 0 0;
}

/* Reset Form */
.reset-form {
  background: var(--bg-secondary);
  padding: 2rem;
  border-radius: 16px;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.reset-form label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.reset-form select {
  width: 100%;
  max-width: 500px;
  margin-bottom: 1.25rem;
}

.checkbox-group {
  margin: 1.25rem 0;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-weight: 500;
}

.checkbox-group input[type="checkbox"] {
  width: 20px;
  height: 20px;
  accent-color: #667eea;
}

/* Preview Stats */
.reset-preview {
  background: var(--bg-secondary);
  padding: 2rem;
  border-radius: 16px;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.reset-preview h3 {
  margin: 0 0 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preview-stats {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.preview-stat {
  text-align: center;
  padding: 1.25rem 1.75rem;
  background: var(--bg-primary);
  border-radius: 12px;
  min-width: 110px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s;
}

.preview-stat:hover {
  transform: translateY(-2px);
}

.preview-stat.total {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.15) 0%, rgba(229, 57, 53, 0.1) 100%);
  border: 2px solid rgba(244, 67, 54, 0.3);
}

.preview-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--primary-color);
}

.preview-stat.total .preview-value {
  color: #f44336;
}

.preview-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.35rem;
}

/* Preview Items */
.preview-items {
  margin-bottom: 1.5rem;
}

.preview-items h4 {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
}

.preview-list {
  max-height: 160px;
  overflow-y: auto;
  background: var(--bg-primary);
  border-radius: 10px;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
}

.preview-item {
  padding: 0.6rem 0.85rem;
  font-size: 0.9rem;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.2s;
}

.preview-item:hover {
  background: rgba(102, 126, 234, 0.05);
}

.preview-item:last-child {
  border-bottom: none;
}

.preview-more {
  padding: 0.6rem 0.85rem;
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.85rem;
}

/* Reset Confirm */
.reset-confirm {
  display: flex;
  align-items: flex-end;
  gap: 1.25rem;
  padding-top: 1.5rem;
  border-top: 2px dashed var(--border-color);
}

.confirm-input {
  flex: 1;
}

.confirm-input label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.confirm-input input {
  width: 180px;
  font-weight: 600;
  letter-spacing: 2px;
}

/* Reset Result */
.reset-result {
  margin-top: 1.5rem;
}

.result-success {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(46, 125, 50, 0.1) 100%);
  border: 2px solid rgba(76, 175, 80, 0.3);
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

.result-success::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  background: linear-gradient(180deg, #4caf50, #2e7d32);
}

.result-success .material-icons {
  font-size: 3rem;
  color: #4caf50;
  animation: checkmark 0.5s ease-out;
}

@keyframes checkmark {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

.result-success strong {
  font-size: 1.2rem;
  color: #2e7d32;
}

.result-success p {
  margin: 0.35rem 0 0;
  color: var(--text-secondary);
}

/* Spinner */
.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2.5px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modern Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.35);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.45);
}

.btn-outline {
  background: transparent;
  border: 2px solid var(--border-color);
  color: var(--text-primary);
}

.btn-outline:hover:not(:disabled) {
  border-color: #667eea;
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.btn-danger {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(244, 67, 54, 0.35);
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(244, 67, 54, 0.45);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

/* Form Controls */
.form-control {
  padding: 0.85rem 1.25rem;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: all 0.3s;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.15);
}

/* Info Box */
.info-box {
  display: flex;
  gap: 1.25rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(3, 169, 244, 0.06) 100%);
  border: 1px solid rgba(33, 150, 243, 0.25);
  border-radius: 16px;
  margin-bottom: 1.5rem;
  position: relative;
  overflow: hidden;
}

.info-box::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: linear-gradient(180deg, #2196f3, #03a9f4);
}

.info-box .material-icons {
  font-size: 2.5rem;
  color: #2196f3;
}

.info-box h4 {
  margin: 0 0 0.5rem;
  color: #2196f3;
  font-size: 1.05rem;
}

.info-box p {
  margin: 0;
  font-size: 0.9rem;
}

.info-box ul {
  margin: 0.5rem 0 0;
  padding-left: 1.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Reason Tag */
.reason-tag {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.2) 0%, rgba(255, 87, 34, 0.15) 100%);
  color: #ff9800;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(255, 152, 0, 0.3);
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #667eea, #764ba2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #5a6fd6, #6a4190);
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .data-cleanup {
    padding: 1rem;
  }

  .page-header {
    padding: 2rem 1.5rem;
  }

  .page-header h1 {
    font-size: 1.5rem;
  }

  .tabs {
    flex-direction: column;
    gap: 0.25rem;
  }

  .tab {
    padding: 0.85rem 1rem;
  }

  .filter-section {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-section select {
    max-width: 100%;
  }

  .action-buttons {
    flex-direction: column;
  }

  .reset-confirm {
    flex-direction: column;
    align-items: stretch;
  }

  .confirm-input input {
    width: 100%;
  }
}
</style>
