<template>
  <div class="esa-dashboard">
    <div class="header">
      <h1>🏛️ Dashboard เขตพื้นที่การศึกษา</h1>
      <p class="esa-name">{{ esaInfo?.name || 'กำลังโหลด...' }}</p>
    </div>

    <!-- Quick Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🏫</div>
        <div class="stat-content">
          <h3>{{ stats.schoolCount }}</h3>
          <p>โรงเรียนในสังกัด</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👨‍🎓</div>
        <div class="stat-content">
          <h3>{{ stats.totalStudents.toLocaleString() }}</h3>
          <p>นักเรียนทั้งหมด</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <h3>{{ stats.averageHOTS.toFixed(2) }}</h3>
          <p>คะแนน HOTS เฉลี่ยของเขต</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏆</div>
        <div class="stat-content">
          <h3>{{ stats.topSchools }}</h3>
          <p>โรงเรียนยอดเยี่ยม</p>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="{ active: activeTab === tab.id }"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Schools Tab -->
      <div v-if="activeTab === 'schools'" class="schools-section">
        <div class="section-header">
          <h2>โรงเรียนในสังกัด</h2>
          <div class="filters">
            <select v-model="sortBy" class="form-select">
              <option value="name">เรียงตามชื่อ</option>
              <option value="students">จำนวนนักเรียน</option>
              <option value="hots">คะแนน HOTS</option>
            </select>
          </div>
        </div>
        
        <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>
        
        <div v-else class="schools-grid">
          <div v-for="school in sortedSchools" :key="school.id" class="school-card">
            <div class="school-header">
              <h3>{{ school.name }}</h3>
              <span class="school-code">{{ school.code }}</span>
            </div>
            <div class="school-stats">
              <div class="stat-row">
                <span>👨‍🎓 นักเรียน:</span>
                <strong>{{ school.studentCount || 0 }}</strong>
              </div>
              <div class="stat-row">
                <span>👨‍🏫 ครู:</span>
                <strong>{{ school.teacherCount || 0 }}</strong>
              </div>
              <div class="stat-row">
                <span>📊 HOTS เฉลี่ย:</span>
                <strong :class="getScoreClass(school.averageHOTS)">
                  {{ school.averageHOTS?.toFixed(2) || 'N/A' }}
                </strong>
              </div>
            </div>
            <div class="school-actions">
              <button @click="viewSchoolDetails(school)" class="btn-primary">
                ดูรายละเอียด
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Comparison Tab -->
      <div v-if="activeTab === 'comparison'" class="comparison-section">
        <h2>เปรียบเทียบผลการเรียน</h2>
        
        <div v-if="analyticsLoading" class="loading">กำลังโหลดข้อมูล...</div>
        
        <div v-else class="comparison-content">
          <!-- HOTS Comparison Chart -->
          <div class="chart-card">
            <h3>คะแนน HOTS แยกตามโรงเรียน (Top 10)</h3>
            <canvas ref="schoolComparisonChart"></canvas>
          </div>

          <!-- Performance Table -->
          <div class="performance-table-card">
            <h3>ตารางเปรียบเทียบ</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>อันดับ</th>
                  <th>โรงเรียน</th>
                  <th>วิเคราะห์</th>
                  <th>ให้เหตุผล</th>
                  <th>สร้างสรรค์</th>
                  <th>หลักฐาน</th>
                  <th>เฉลี่ย</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(school, index) in rankedSchools" :key="school.id">
                  <td>{{ index + 1 }}</td>
                  <td>{{ school.name }}</td>
                  <td>{{ school.hotsBreakdown?.analysis?.toFixed(2) || '-' }}</td>
                  <td>{{ school.hotsBreakdown?.reasoning?.toFixed(2) || '-' }}</td>
                  <td>{{ school.hotsBreakdown?.creativity?.toFixed(2) || '-' }}</td>
                  <td>{{ school.hotsBreakdown?.evidence?.toFixed(2) || '-' }}</td>
                  <td>
                    <strong :class="getScoreClass(school.averageHOTS)">
                      {{ school.averageHOTS?.toFixed(2) || '-' }}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Reports Tab -->
      <div v-if="activeTab === 'reports'" class="reports-section">
        <h2>รายงานและเอกสาร</h2>
        
        <div class="reports-grid">
          <div class="report-card">
            <h3>📊 รายงานประจำเดือน</h3>
            <p>สรุปผลการประเมิน HOTS รายเดือน</p>
            <select v-model="selectedMonth" class="form-select">
              <option value="2025-11">พฤศจิกายน 2568</option>
              <option value="2025-10">ตุลาคม 2568</option>
              <option value="2025-09">กันยายน 2568</option>
            </select>
            <button @click="generateMonthlyReport" class="btn-primary">
              สร้างรายงาน
            </button>
          </div>

          <div class="report-card">
            <h3>📈 รายงานเปรียบเทียบโรงเรียน</h3>
            <p>เปรียบเทียบผลการเรียนระหว่างโรงเรียน</p>
            <button @click="generateComparisonReport" class="btn-primary">
              สร้างรายงาน
            </button>
          </div>

          <div class="report-card">
            <h3>🎯 รายงาน LO Mastery</h3>
            <p>สรุปการบรรลุ Learning Outcomes</p>
            <button @click="generateLOReport" class="btn-primary">
              สร้างรายงาน
            </button>
          </div>

          <div class="report-card">
            <h3>📤 ส่งรายงานต่อกระทรวง</h3>
            <p>รายงานสรุปผลการดำเนินงานของเขต</p>
            <button @click="submitToMinistry" class="btn-secondary">
              ส่งรายงาน
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { collection, query, where, getDocs } from 'firebase/firestore'

const authStore = useAuthStore()
const router = useRouter()

const activeTab = ref('schools')
const loading = ref(false)
const analyticsLoading = ref(false)

const esaInfo = ref(null)
const schools = ref([])
const selectedMonth = ref('2025-11')
const sortBy = ref('name')

const tabs = [
  { id: 'schools', label: 'โรงเรียน', icon: '🏫' },
  { id: 'comparison', label: 'เปรียบเทียบ', icon: '📊' },
  { id: 'reports', label: 'รายงาน', icon: '📄' }
]

const stats = computed(() => ({
  schoolCount: schools.value.length,
  totalStudents: schools.value.reduce((sum, s) => sum + (s.studentCount || 0), 0),
  averageHOTS: schools.value.length > 0
    ? schools.value.reduce((sum, s) => sum + (s.averageHOTS || 0), 0) / schools.value.length
    : 0,
  topSchools: schools.value.filter(s => (s.averageHOTS || 0) >= 4).length
}))

const sortedSchools = computed(() => {
  const sorted = [...schools.value]
  switch (sortBy.value) {
    case 'students':
      return sorted.sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0))
    case 'hots':
      return sorted.sort((a, b) => (b.averageHOTS || 0) - (a.averageHOTS || 0))
    default:
      return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }
})

const rankedSchools = computed(() => {
  return [...schools.value]
    .filter(s => s.averageHOTS > 0)
    .sort((a, b) => (b.averageHOTS || 0) - (a.averageHOTS || 0))
    .slice(0, 20)
})

onMounted(async () => {
  await loadESAData()
  await loadSchools()
})

async function loadESAData() {
  try {
    if (!authStore.esaId) return
    
    const docRef = await getDocs(query(
      collection(db, 'organizations'),
      where('__name__', '==', authStore.esaId)
    ))
    
    if (!docRef.empty) {
      esaInfo.value = docRef.docs[0].data()
    }
  } catch (error) {
    console.error('Error loading ESA data:', error)
  }
}

async function loadSchools() {
  try {
    loading.value = true
    const q = query(
      collection(db, 'organizations'),
      where('type', '==', 'school'),
      where('esaId', '==', authStore.esaId)
    )
    const snapshot = await getDocs(q)
    
    // Load schools and their analytics
    const schoolsData = []
    for (const doc of snapshot.docs) {
      const schoolData = { id: doc.id, ...doc.data() }
      
      // Fetch analytics for each school
      try {
        const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
        const response = await fetch(
          `${functionsUrl}/getSchoolAnalytics?schoolId=${doc.id}`
        )
        const data = await response.json()
        if (data.success) {
          schoolData.averageHOTS = data.stats.hotsAverage
            ? (data.stats.hotsAverage.analysis + data.stats.hotsAverage.reasoning + 
               data.stats.hotsAverage.creativity + data.stats.hotsAverage.evidence) / 4
            : 0
          schoolData.hotsBreakdown = data.stats.hotsAverage
        }
      } catch (error) {
        console.error(`Error loading analytics for school ${doc.id}:`, error)
      }
      
      schoolsData.push(schoolData)
    }
    
    schools.value = schoolsData
  } catch (error) {
    console.error('Error loading schools:', error)
  } finally {
    loading.value = false
  }
}

function getScoreClass(score) {
  if (!score) return 'score-none'
  if (score >= 4) return 'score-high'
  if (score >= 3) return 'score-medium'
  return 'score-low'
}

function viewSchoolDetails(school) {
  router.push(`/school-detail/${school.id}`)
}

async function generateMonthlyReport() {
  alert('กำลังสร้างรายงานประจำเดือน ' + selectedMonth.value)
  // TODO: Implement report generation
}

async function generateComparisonReport() {
  alert('กำลังสร้างรายงานเปรียบเทียบโรงเรียน')
  // TODO: Implement comparison report
}

async function generateLOReport() {
  alert('กำลังสร้างรายงาน LO Mastery')
  // TODO: Implement LO report
}

async function submitToMinistry() {
  if (confirm('ต้องการส่งรายงานต่อกระทรวงใช่หรือไม่?')) {
    alert('ส่งรายงานเรียบร้อยแล้ว')
    // TODO: Implement submission
  }
}
</script>

<style scoped>
.esa-dashboard {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;

  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.header {
  margin-bottom: 30px;
}

.header h1 {
  font-size: 2em;
  margin-bottom: 5px;
}

.esa-name {
  color: var(--text-secondary);
  font-size: 1.1em;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  font-size: 2.5em;
}

.stat-content h3 {
  font-size: 2em;
  margin: 0;
  color: #2196F3;
}

.stat-content p {
  margin: 5px 0 0 0;
  color: var(--text-secondary);
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.tabs button {
  padding: 12px 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1em;
  color: var(--text-secondary);
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
}

.tabs button:hover {
  color: #2196F3;
}

.tabs button.active {
  color: #2196F3;
  border-bottom-color: #2196F3;
  font-weight: bold;
}

.tab-content {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filters {
  display: flex;
  gap: 10px;
}

.form-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1em;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.schools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.school-card {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.school-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.school-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 15px;
}

.school-header h3 {
  margin: 0;
  font-size: 1.1em;
  flex: 1;
}

.school-code {
  background: #e0e0e0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  font-family: monospace;
}

.school-stats {
  margin-bottom: 15px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
}

.stat-row:last-child {
  border-bottom: none;
}

.score-high {
  color: #4CAF50;
}

.score-medium {
  color: #FF9800;
}

.score-low {
  color: #f44336;
}

.score-none {
  color: var(--text-secondary);
}

.school-actions {
  display: flex;
  gap: 10px;
}

.btn-primary, .btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95em;
  transition: all 0.3s;
  flex: 1;
}

.btn-primary {
  background: #2196F3;
  color: white;
}

.btn-primary:hover {
  background: #0b7dda;
}

.btn-secondary {
  background: #FF9800;
  color: white;
}

.btn-secondary:hover {
  background: #e68900;
}

.chart-card, .performance-table-card {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.chart-card h3, .performance-table-card h3 {
  margin-top: 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.data-table th {
  background: #f5f5f5;
  font-weight: bold;
  color: var(--text-primary);
}

.data-table tr:hover {
  background: #f9f9f9;
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.report-card {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.report-card h3 {
  margin-top: 0;
  color: var(--text-primary);
}

.report-card p {
  color: var(--text-secondary);
  margin-bottom: 15px;
}

.report-card button {
  width: 100%;
  margin-top: 10px;
}

@media (max-width: 768px) {
  .stats-grid, .schools-grid, .reports-grid {
    grid-template-columns: 1fr;
  }
  
  .tabs {
    flex-direction: column;
  }
}
</style>
