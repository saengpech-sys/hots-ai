<template>
  <div class="national-dashboard">
    <div class="header">
      <h1>🇹🇭 Dashboard ระดับประเทศ</h1>
      <p class="ministry-name">สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)</p>
    </div>

    <!-- National Overview Stats -->
    <div class="stats-grid">
      <div class="stat-card highlight">
        <div class="stat-icon">🏫</div>
        <div class="stat-content">
          <h3>{{ stats.totalSchools.toLocaleString() }}</h3>
          <p>โรงเรียนทั้งหมด</p>
          <small class="trend">+{{ stats.newSchools }} โรงเรียนใหม่</small>
        </div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-icon">👨‍🎓</div>
        <div class="stat-content">
          <h3>{{ (stats.totalStudents / 1000000).toFixed(2) }}M</h3>
          <p>นักเรียนทั้งหมด</p>
          <small class="trend">{{ stats.activePercentage }}% กำลังใช้งาน</small>
        </div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <h3>{{ stats.nationalAvgHOTS.toFixed(2) }}</h3>
          <p>คะแนน HOTS เฉลี่ยประเทศ</p>
          <small :class="stats.hotsGrowth >= 0 ? 'trend-up' : 'trend-down'">
            {{ stats.hotsGrowth >= 0 ? '▲' : '▼' }} {{ Math.abs(stats.hotsGrowth).toFixed(2) }}%
          </small>
        </div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-icon">📝</div>
        <div class="stat-content">
          <h3>{{ (stats.totalAssessments / 1000000).toFixed(1) }}M</h3>
          <p>การประเมินทั้งหมด</p>
          <small class="trend">{{ stats.assessmentsThisMonth.toLocaleString() }} เดือนนี้</small>
        </div>
      </div>
      <div class="stat-card highlight talent-card">
        <div class="stat-icon">🌟</div>
        <div class="stat-content">
          <h3>{{ stats.talentCount.toLocaleString() }}</h3>
          <p>นักเรียนกลุ่ม Talent</p>
          <small class="trend">Research & Innovation Tracks</small>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions-bar">
      <button @click="$router.push('/curriculum-management')" class="quick-btn">
        <span>📚</span> จัดการหลักสูตรแกนกลาง
      </button>
      <button @click="$router.push('/research/export')" class="quick-btn highlight">
        <span>📦</span> Research Data Export
      </button>
      <button @click="$router.push('/research/expert-validation')" class="quick-btn">
        <span>🔬</span> Expert Validation
      </button>
      <button @click="$router.push('/leaderboard')" class="quick-btn">
        <span>🏆</span> National Leaderboard
      </button>
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
      <!-- Export Tab -->
      <div v-if="activeTab === 'export'" class="export-section">
        <div class="card">
          <h2>📤 ส่งออกข้อมูลมาตรฐาน (Data Interoperability)</h2>
          <p class="subtitle">ส่งออกข้อมูลตามมาตรฐานกระทรวงศึกษาธิการ (MOE Standard Data Exchange)</p>
          
          <div class="export-options">
            <div class="export-card">
              <div class="export-icon">📊</div>
              <h3>รายงานผลสัมฤทธิ์รายปี (Annual Report)</h3>
              <p>ข้อมูลสรุปผลการประเมิน HOTS รายโรงเรียนและเขตพื้นที่</p>
              <button @click="exportData('annual')" class="btn btn-primary" :disabled="exporting">
                {{ exporting ? 'กำลังส่งออก...' : 'ดาวน์โหลด CSV' }}
              </button>
            </div>

            <div class="export-card">
              <div class="export-icon">🌟</div>
              <h3>รายชื่อนักเรียนกลุ่ม Talent (Talent Pool)</h3>
              <p>ข้อมูลนักเรียนที่มีความสามารถพิเศษเพื่อการส่งต่อ</p>
              <button @click="exportData('talent')" class="btn btn-primary" :disabled="exporting">
                {{ exporting ? 'กำลังส่งออก...' : 'ดาวน์โหลด JSON' }}
              </button>
            </div>

            <div class="export-card">
              <div class="export-icon">🏫</div>
              <h3>ข้อมูลสารสนเทศโรงเรียน (School Info)</h3>
              <p>สถิติการใช้งานและโครงสร้างพื้นฐานรายโรงเรียน</p>
              <button @click="exportData('school')" class="btn btn-primary" :disabled="exporting">
                {{ exporting ? 'กำลังส่งออก...' : 'ดาวน์โหลด XML' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Map Tab -->
      <div v-if="activeTab === 'map'" class="map-section">
        <h2>แผนที่ประเทศ - คะแนน HOTS ตามภูมิภาค</h2>
        
        <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>
        
        <div v-else class="regions-grid">
          <div v-for="region in regions" :key="region.name" class="region-card">
            <div class="region-header">
              <h3>{{ region.name }}</h3>
              <span class="region-badge" :class="getRegionClass(region.avgHOTS)">
                {{ region.avgHOTS.toFixed(2) }}
              </span>
            </div>
            <div class="region-stats">
              <div class="stat-item">
                <span>เขตพื้นที่:</span>
                <strong>{{ region.esaCount }}</strong>
              </div>
              <div class="stat-item">
                <span>โรงเรียน:</span>
                <strong>{{ region.schoolCount }}</strong>
              </div>
              <div class="stat-item">
                <span>นักเรียน:</span>
                <strong>{{ region.studentCount.toLocaleString() }}</strong>
              </div>
            </div>
            <div class="hots-breakdown-mini">
              <div v-for="dim in ['analysis', 'reasoning', 'creativity', 'evidence']" 
                   :key="dim" 
                   class="mini-bar">
                <span class="mini-label">{{ getDimLabel(dim) }}</span>
                <div class="mini-progress">
                  <div class="mini-fill" :style="{ width: (region.hotsBreakdown[dim] * 20) + '%' }"></div>
                </div>
              </div>
            </div>
            <button @click="viewRegionDetails(region)" class="btn-view">
              ดูรายละเอียด →
            </button>
          </div>
        </div>
      </div>

      <!-- ESA Rankings Tab -->
      <div v-if="activeTab === 'rankings'" class="rankings-section">
        <h2>อันดับเขตพื้นที่การศึกษา</h2>
        
        <div class="ranking-filters">
          <select v-model="rankingCriteria" class="form-select">
            <option value="hots">เรียงตามคะแนน HOTS</option>
            <option value="growth">เรียงตามการเติบโต</option>
            <option value="participation">เรียงตามการมีส่วนร่วม</option>
          </select>
        </div>
        
        <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>
        
        <table v-else class="rankings-table">
          <thead>
            <tr>
              <th>อันดับ</th>
              <th>เขตพื้นที่</th>
              <th>ภูมิภาค</th>
              <th>โรงเรียน</th>
              <th>วิเคราะห์</th>
              <th>ให้เหตุผล</th>
              <th>สร้างสรรค์</th>
              <th>หลักฐาน</th>
              <th>เฉลี่ย</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(esa, index) in rankedESAs" :key="esa.id" 
                :class="{ 'top-performer': index < 3 }">
              <td>
                <span class="rank-badge" :class="getRankClass(index)">
                  {{ index + 1 }}
                </span>
              </td>
              <td><strong>{{ esa.name }}</strong></td>
              <td>{{ esa.region }}</td>
              <td>{{ esa.schoolCount }}</td>
              <td>{{ esa.hotsBreakdown?.analysis?.toFixed(2) || '-' }}</td>
              <td>{{ esa.hotsBreakdown?.reasoning?.toFixed(2) || '-' }}</td>
              <td>{{ esa.hotsBreakdown?.creativity?.toFixed(2) || '-' }}</td>
              <td>{{ esa.hotsBreakdown?.evidence?.toFixed(2) || '-' }}</td>
              <td>
                <strong class="score" :class="getScoreClass(esa.avgHOTS)">
                  {{ esa.avgHOTS.toFixed(2) }}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Curriculum Tab -->
      <div v-if="activeTab === 'curriculum'" class="curriculum-section">
        <div class="section-header">
          <h2>📚 หลักสูตรมาตรฐาน</h2>
          <button @click="showCreateCurriculumDialog = true" class="btn-primary">
            ➕ สร้างหลักสูตรใหม่
          </button>
        </div>
        
        <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>
        
        <div v-else class="curriculum-grid">
          <div v-for="curriculum in curriculums" :key="curriculum.id" class="curriculum-card">
            <div class="curriculum-header">
              <h3>{{ curriculum.subjectName }}</h3>
              <span class="grade-badge">{{ curriculum.gradeLevel.toUpperCase() }}</span>
            </div>
            <div class="curriculum-info">
              <p><strong>รหัสวิชา:</strong> {{ curriculum.subjectCode }}</p>
              <p><strong>ปีหลักสูตร:</strong> {{ curriculum.curriculumYear }}</p>
              <p><strong>จำนวน LOs:</strong> {{ curriculum.learningOutcomes?.length || 0 }}</p>
            </div>
            <div class="curriculum-actions">
              <button @click="viewCurriculum(curriculum)" class="btn-secondary">
                ดูรายละเอียด
              </button>
              <button @click="editCurriculum(curriculum)" class="btn-edit">
                แก้ไข
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Analytics Tab -->
      <div v-if="activeTab === 'analytics'" class="analytics-section">
        <h2>การวิเคราะห์ระดับประเทศ</h2>
        
        <div class="analytics-controls">
          <select v-model="analyticsYear" class="form-select">
            <option value="2568">ปีการศึกษา 2568</option>
            <option value="2567">ปีการศึกษา 2567</option>
          </select>
          <button @click="exportNationalData" class="btn-export">
            📊 Export ข้อมูล
          </button>
        </div>
        
        <div v-if="analyticsLoading" class="loading">กำลังโหลดข้อมูล...</div>
        
        <div v-else class="analytics-grid">
          <!-- Trend Chart -->
          <div class="analytics-card full-width">
            <h3>แนวโน้มคะแนน HOTS รายเดือน</h3>
            <canvas ref="trendChart"></canvas>
          </div>

          <!-- LO Mastery -->
          <div class="analytics-card">
            <h3>การบรรลุ Learning Outcomes</h3>
            <div class="lo-list">
              <div v-for="lo in topLOs" :key="lo.code" class="lo-item">
                <div class="lo-header">
                  <strong>{{ lo.code }}</strong>
                  <span class="mastery-badge" :class="getMasteryClass(lo.masteryRate)">
                    {{ (lo.masteryRate * 100).toFixed(0) }}%
                  </span>
                </div>
                <p class="lo-desc">{{ lo.description }}</p>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: (lo.masteryRate * 100) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Subject Performance -->
          <div class="analytics-card">
            <h3>ผลการเรียนแยกตามวิชา</h3>
            <canvas ref="subjectChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Policy Insights Tab -->
      <div v-if="activeTab === 'policy'" class="policy-section">
        <PolicyInsights />
      </div>

      <!-- Talent Pipeline Tab -->
      <div v-if="activeTab === 'talent'" class="talent-section">
        <TalentPipeline />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import PolicyInsights from '@/components/PolicyInsights.vue'
import TalentPipeline from '@/components/TalentPipeline.vue'

const authStore = useAuthStore()
const router = useRouter()

const tabs = [
  { id: 'map', label: 'แผนที่ประเทศ', icon: '🗺️' },
  { id: 'esa', label: 'เขตพื้นที่ (ESA)', icon: '📍' },
  { id: 'schools', label: 'โรงเรียน', icon: '🏫' },
  { id: 'curriculum', label: 'หลักสูตร', icon: '📚' },
  { id: 'policy', label: 'นโยบาย AI', icon: '🎯' },
  { id: 'talent', label: 'Talent Pipeline', icon: '🌟' },
  { id: 'export', label: 'ส่งออกข้อมูล', icon: '📤' }
]

const activeTab = ref('map')
const loading = ref(false)
const analyticsLoading = ref(false)
const showCreateCurriculumDialog = ref(false)
const exporting = ref(false)

const rankingCriteria = ref('hots')
const analyticsYear = ref('2568')

const regions = ref([])
const esaList = ref([])
const curriculums = ref([])
const analytics = ref({})

const stats = computed(() => ({
  totalSchools: regions.value.reduce((sum, r) => sum + r.schoolCount, 0),
  totalStudents: regions.value.reduce((sum, r) => sum + r.studentCount, 0),
  nationalAvgHOTS: regions.value.length > 0
    ? regions.value.reduce((sum, r) => sum + r.avgHOTS, 0) / regions.value.length
    : 0,
  totalAssessments: analytics.value.totalAssessments || 0,
  newSchools: 25, // Mock data
  activePercentage: 78, // Mock data
  hotsGrowth: 2.5, // Mock data
  assessmentsThisMonth: 125000, // Mock data
  talentCount: 15420 // Mock data
}))

const rankedESAs = computed(() => {
  return [...esaList.value]
    .filter(esa => esa.avgHOTS > 0)
    .sort((a, b) => (b.avgHOTS || 0) - (a.avgHOTS || 0))
})

const topLOs = computed(() => {
  return analytics.value.loMastery?.slice(0, 10) || []
})

onMounted(async () => {
  await loadRegionalData()
  await loadESAs()
  await loadCurriculums()
  await loadNationalAnalytics()
})

async function loadRegionalData() {
  try {
    loading.value = true
    
    // Mock regional data (in production, aggregate from ESAs)
    regions.value = [
      {
        name: 'กรุงเทพมหานคร',
        esaCount: 4,
        schoolCount: 850,
        studentCount: 450000,
        avgHOTS: 3.8,
        hotsBreakdown: { analysis: 3.9, reasoning: 3.7, creativity: 4.0, evidence: 3.6 }
      },
      {
        name: 'ภาคกลาง',
        esaCount: 28,
        schoolCount: 3200,
        studentCount: 980000,
        avgHOTS: 3.4,
        hotsBreakdown: { analysis: 3.5, reasoning: 3.3, creativity: 3.6, evidence: 3.2 }
      },
      {
        name: 'ภาคเหนือ',
        esaCount: 45,
        schoolCount: 4100,
        studentCount: 1200000,
        avgHOTS: 3.2,
        hotsBreakdown: { analysis: 3.3, reasoning: 3.1, creativity: 3.4, evidence: 3.0 }
      },
      {
        name: 'ภาคตะวันออกเฉียงเหนือ',
        esaCount: 82,
        schoolCount: 8500,
        studentCount: 2800000,
        avgHOTS: 3.0,
        hotsBreakdown: { analysis: 3.1, reasoning: 2.9, creativity: 3.2, evidence: 2.8 }
      },
      {
        name: 'ภาคใต้',
        esaCount: 36,
        schoolCount: 3600,
        studentCount: 950000,
        avgHOTS: 3.3,
        hotsBreakdown: { analysis: 3.4, reasoning: 3.2, creativity: 3.5, evidence: 3.1 }
      },
      {
        name: 'ภาคตะวันออก',
        esaCount: 18,
        schoolCount: 1800,
        studentCount: 520000,
        avgHOTS: 3.5,
        hotsBreakdown: { analysis: 3.6, reasoning: 3.4, creativity: 3.7, evidence: 3.3 }
      }
    ]
  } catch (error) {
    console.error('Error loading regional data:', error)
  } finally {
    loading.value = false
  }
}

async function loadESAs() {
  try {
    const q = query(
      collection(db, 'organizations'),
      where('type', '==', 'esa')
    )
    const snapshot = await getDocs(q)
    
    esaList.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      avgHOTS: Math.random() * 2 + 2.5, // Mock data
      hotsBreakdown: {
        analysis: Math.random() * 2 + 2.5,
        reasoning: Math.random() * 2 + 2.5,
        creativity: Math.random() * 2 + 2.5,
        evidence: Math.random() * 2 + 2.5
      }
    }))
  } catch (error) {
    console.error('Error loading ESAs:', error)
  }
}

async function loadCurriculums() {
  try {
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    const response = await fetch(`${functionsUrl}/getMasterCurriculums`)
    const data = await response.json()
    
    if (data.success) {
      curriculums.value = data.curriculums
    }
  } catch (error) {
    console.error('Error loading curriculums:', error)
  }
}

async function loadNationalAnalytics() {
  try {
    analyticsLoading.value = true
    
    // Mock analytics data
    analytics.value = {
      totalAssessments: 15000000,
      loMastery: [
        { code: 'ว1.2 ม.1/1', description: 'บรรยายโมเลกุลของสสาร', masteryRate: 0.72 },
        { code: 'ค1.1 ม.1/1', description: 'แก้ปัญหาจำนวนเต็ม', masteryRate: 0.68 },
        { code: 'ท1.1 ม.1/1', description: 'สื่อสารภาษาไทย', masteryRate: 0.75 }
      ]
    }
  } catch (error) {
    console.error('Error loading analytics:', error)
  } finally {
    analyticsLoading.value = false
  }
}

const exportData = async (type) => {
  exporting.value = true
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    let content = ''
    let filename = ''
    let mimeType = ''

    if (type === 'annual') {
      // CSV Format
      content = '\uFEFFSchool_ID,School_Name,ESA_ID,Total_Students,Avg_HOTS,Analysis,Reasoning,Creativity,Evidence\n'
      content += '1001,โรงเรียนเตรียมอุดม,ESA01,2500,4.2,4.1,4.3,4.0,4.4\n'
      content += '1002,โรงเรียนสวนกุหลาบ,ESA01,2400,4.1,4.0,4.2,4.1,4.1\n'
      filename = `hots_annual_report_${new Date().toISOString().slice(0,10)}.csv`
      mimeType = 'text/csv;charset=utf-8'
    } else if (type === 'talent') {
      // JSON Format
      const data = {
        generatedAt: new Date().toISOString(),
        version: "1.0",
        students: [
          { id: "ST001", track: "Innovation", hotsScore: 4.8, achievements: ["National Science Award"] },
          { id: "ST002", track: "Research", hotsScore: 4.7, achievements: ["Published Paper"] }
        ]
      }
      content = JSON.stringify(data, null, 2)
      filename = `hots_talent_pool_${new Date().toISOString().slice(0,10)}.json`
      mimeType = 'application/json'
    } else if (type === 'school') {
      // XML Format (Mock)
      content = '<?xml version="1.0" encoding="UTF-8"?>\n<Schools>\n  <School id="1001">\n    <Name>Triam Udom</Name>\n    <Stats>\n      <ActiveUsers>2500</ActiveUsers>\n    </Stats>\n  </School>\n</Schools>'
      filename = `hots_school_info_${new Date().toISOString().slice(0,10)}.xml`
      mimeType = 'application/xml'
    }

    // Trigger Download
    const blob = new Blob([content], { type: mimeType })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    
    alert('ส่งออกข้อมูลสำเร็จ!')
  } catch (error) {
    console.error('Export failed:', error)
    alert('เกิดข้อผิดพลาดในการส่งออกข้อมูล')
  } finally {
    exporting.value = false
  }
}

function getDimLabel(dim) {
  const labels = {
    analysis: 'วิเคราะห์',
    reasoning: 'เหตุผล',
    creativity: 'สร้างสรรค์',
    evidence: 'หลักฐาน'
  }
  return labels[dim] || dim
}

function getRegionClass(score) {
  if (score >= 3.5) return 'region-high'
  if (score >= 3.0) return 'region-medium'
  return 'region-low'
}

function getScoreClass(score) {
  if (score >= 4) return 'score-high'
  if (score >= 3) return 'score-medium'
  return 'score-low'
}

function getRankClass(index) {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return 'rank-normal'
}

function getMasteryClass(rate) {
  if (rate >= 0.7) return 'mastery-high'
  if (rate >= 0.5) return 'mastery-medium'
  return 'mastery-low'
}

function viewRegionDetails(region) {
  console.log('View region:', region)
}

function viewCurriculum(curriculum) {
  router.push(`/curriculum-management?id=${curriculum.id}`)
}

function editCurriculum(curriculum) {
  router.push(`/curriculum-management?id=${curriculum.id}&mode=edit`)
}

function exportNationalData() {
  alert('กำลัง Export ข้อมูลระดับประเทศ...')
}
</script>

<style scoped>
.national-dashboard {
  padding: 20px;
  max-width: 1800px;
  margin: 0 auto;
  color: var(--text-primary);

  min-height: 100vh;
  background: var(--bg-primary);
}

.header {
  margin-bottom: 30px;
  text-align: center;
}

.header h1 {
  font-size: 2.5em;
  margin-bottom: 5px;
  color: var(--primary);
}

.ministry-name {
  color: var(--text-secondary);
  font-size: 1.2em;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 12px var(--shadow);
  display: flex;
  align-items: center;
  gap: 20px;
  border: 1px solid var(--border-color);
}

.stat-card.highlight {
  border-left: 4px solid var(--primary);
}

.stat-card.talent-card {
  border-left: 4px solid #9C27B0;
}

.stat-icon {
  font-size: 3em;
}

.stat-content h3 {
  font-size: 2.2em;
  margin: 0;
  color: var(--primary);
}

.stat-content p {
  margin: 5px 0;
  color: var(--text-secondary);
  font-size: 0.95em;
}

.stat-content small {
  color: var(--text-secondary);
  font-size: 0.85em;
  opacity: 0.8;
}

.trend {
  color: var(--success);
}

.trend-up {
  color: var(--success);
}

.trend-down {
  color: var(--danger);
}

/* Quick Actions Bar */
.quick-actions-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: 2px solid var(--border-color, #e2e8f0);
  border-radius: 0.5rem;
  background: var(--bg-secondary);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.quick-btn:hover {
  border-color: #4299e1;
  background: linear-gradient(135deg, rgba(66, 153, 225, 0.1), rgba(99, 102, 241, 0.1));
  transform: translateY(-2px);
}

.quick-btn.highlight {
  border-color: #10b981;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.1));
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid var(--border-color);
  overflow-x: auto;
}

.tabs button {
  padding: 15px 30px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1em;
  color: var(--text-secondary);
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
  white-space: nowrap;
}

.tabs button:hover {
  color: var(--primary);
}

.tabs button.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: bold;
}

.tab-content {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 8px var(--shadow);
  min-height: 600px;
  border: 1px solid var(--border-color);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.loading {
  text-align: center;
  padding: 60px;
  color: var(--text-secondary);
  font-size: 1.1em;
}

/* Regions Grid */
.regions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 25px;
}

.region-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: transform 0.2s;
}

.region-card:hover {
  transform: translateY(-4px);
}

.region-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.region-header h3 {
  margin: 0;
  font-size: 1.3em;
}

.region-badge {
  background: rgba(255,255,255,0.3);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 1.2em;
  font-weight: bold;
}

.region-stats {
  display: grid;
  gap: 10px;
  margin-bottom: 15px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.2);
}

.hots-breakdown-mini {
  margin: 15px 0;
}

.mini-bar {
  display: grid;
  grid-template-columns: 80px 1fr;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.mini-label {
  font-size: 0.85em;
  opacity: 0.9;
}

.mini-progress {
  height: 8px;
  background: rgba(255,255,255,0.3);
  border-radius: 4px;
  overflow: hidden;
}

.mini-fill {
  height: 100%;
  background: var(--card-bg);
  border-radius: 4px;
}

.btn-view {
  width: 100%;
  padding: 12px;
  background: var(--card-bg);
  color: #667eea;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
}

.btn-view:hover {
  background: #f0f0f0;
}

/* Rankings Table */
.ranking-filters {
  margin-bottom: 20px;
}

.form-select {
  padding: 10px 15px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 1em;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.rankings-table {
  width: 100%;
  border-collapse: collapse;
}

.rankings-table th,
.rankings-table td {
  padding: 15px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

.rankings-table th {
  background: var(--bg-secondary);
  font-weight: bold;
  color: var(--text-primary);
}

.rankings-table tr.top-performer {
  background: rgba(255, 243, 224, 0.5);
}

:global(.dark) .rankings-table tr.top-performer {
  background: rgba(255, 243, 224, 0.1);
}

.rank-badge {
  display: inline-block;
  width: 30px;
  height: 30px;
  line-height: 30px;
  text-align: center;
  border-radius: 50%;
  font-weight: bold;
}

.rank-gold {
  background: #FFD700;
  color: var(--text-primary);
}

.rank-silver {
  background: #C0C0C0;
  color: var(--text-primary);
}

.rank-bronze {
  background: #CD7F32;
  color: white;
}

.rank-normal {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

/* Curriculum Grid */
.curriculum-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.curriculum-card {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid var(--primary);
}

.curriculum-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.grade-badge {
  background: #1976D2;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: bold;
}

.curriculum-info p {
  margin: 8px 0;
  color: var(--text-secondary);
}

.curriculum-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.btn-primary, .btn-secondary, .btn-edit, .btn-export {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95em;
  transition: all 0.3s;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-secondary {
  background: var(--success);
  color: white;
  flex: 1;
}

.btn-secondary:hover {
  opacity: 0.9;
}

.btn-edit {
  background: var(--warning);
  color: white;
  flex: 1;
}

.btn-edit:hover {
  opacity: 0.9;
}

.btn-export {
  background: #9C27B0;
  color: white;
}

.btn-export:hover {
  background: #7B1FA2;
}

/* Analytics */
.analytics-controls {
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
}

.analytics-grid {
  display: grid;
  gap: 20px;
}

.analytics-card {
  background: var(--bg-secondary);
  padding: 25px;
  border-radius: 8px;
}

.analytics-card.full-width {
  grid-column: 1 / -1;
}

.analytics-card h3 {
  margin-top: 0;
  color: var(--text-primary);
}

.lo-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.lo-item {
  background: var(--bg-primary);
  padding: 15px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.lo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.mastery-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.9em;
  font-weight: bold;
}

.mastery-high {
  background: var(--success);
  color: white;
}

.mastery-medium {
  background: var(--warning);
  color: white;
}

.mastery-low {
  background: var(--danger);
  color: white;
}

.lo-desc {
  color: var(--text-secondary);
  font-size: 0.9em;
  margin: 8px 0;
}

.progress-bar {
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--info));
  transition: width 0.5s;
}

.score-high {
  color: var(--success);
}

.score-medium {
  color: var(--warning);
}

.score-low {
  color: var(--danger);
}

/* Export Section */
.export-section {
  padding: 1rem 0;
}

.export-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.export-card {
  background-color: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 1rem;
  text-align: center;
  border: 1px solid var(--border-color);
  transition: transform 0.2s;
}

.export-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.export-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.export-card h3 {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.export-card p {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  min-height: 40px;
}

@media (max-width: 1024px) {
  .stats-grid, .regions-grid, .curriculum-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .tabs {
    flex-wrap: wrap;
  }
  
  .stats-grid, .regions-grid, .curriculum-grid {
    grid-template-columns: 1fr;
  }
}
</style>
