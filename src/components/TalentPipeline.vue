<template>
  <div class="talent-pipeline">
    <div class="header">
      <h2>🌟 Talent Pipeline</h2>
      <p class="subtitle">ระบบติดตามนักเรียนที่มีศักยภาพสูง</p>
      <button class="refresh-btn" @click="loadTalents" :disabled="isLoading">
        🔄 รีเฟรช
      </button>
    </div>

    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <div v-else class="talent-content">
      <!-- Category Summary -->
      <div class="category-summary">
        <div class="category-card exceptional">
          <span class="category-icon">🏆</span>
          <span class="count">{{ categories.exceptional?.count || 0 }}</span>
          <span class="label">Exceptional</span>
          <span class="desc">คะแนน 18+ (ดีเยี่ยม)</span>
        </div>
        <div class="category-card excellent">
          <span class="category-icon">⭐</span>
          <span class="count">{{ categories.excellent?.count || 0 }}</span>
          <span class="label">Excellent</span>
          <span class="desc">คะแนน 16-17 (ดีมาก)</span>
        </div>
        <div class="category-card promising">
          <span class="category-icon">💫</span>
          <span class="count">{{ categories.promising?.count || 0 }}</span>
          <span class="label">Promising</span>
          <span class="desc">คะแนน 14-15 (มีศักยภาพ)</span>
        </div>
      </div>

      <!-- Dimension Champions -->
      <div class="champions-section">
        <h3>🥇 Dimension Champions</h3>
        <div class="champions-grid">
          <div class="champion-card analysis">
            <span class="dim-icon">🔍</span>
            <span class="dim-name">Analysis</span>
            <span class="champion-count">{{ champions.analysis?.length || 0 }} คน</span>
          </div>
          <div class="champion-card reasoning">
            <span class="dim-icon">🧠</span>
            <span class="dim-name">Reasoning</span>
            <span class="champion-count">{{ champions.reasoning?.length || 0 }} คน</span>
          </div>
          <div class="champion-card creativity">
            <span class="dim-icon">💡</span>
            <span class="dim-name">Creativity</span>
            <span class="champion-count">{{ champions.creativity?.length || 0 }} คน</span>
          </div>
          <div class="champion-card evidence">
            <span class="dim-icon">📚</span>
            <span class="dim-name">Evidence</span>
            <span class="champion-count">{{ champions.evidence?.length || 0 }} คน</span>
          </div>
        </div>
      </div>

      <!-- Top Talents Table -->
      <div class="talents-table-section">
        <h3>🌟 Top Talents (คะแนนสูงสุด)</h3>
        
        <div class="table-wrapper">
          <table class="talents-table">
            <thead>
              <tr>
                <th>อันดับ</th>
                <th>รหัสนักเรียน</th>
                <th>คะแนนเฉลี่ย</th>
                <th>Analysis</th>
                <th>Reasoning</th>
                <th>Creativity</th>
                <th>Evidence</th>
                <th>จุดเด่น</th>
                <th>จำนวนประเมิน</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(talent, index) in topTalents" :key="talent.userId">
                <td>
                  <span class="rank-badge" :class="getRankClass(index)">
                    {{ index + 1 }}
                  </span>
                </td>
                <td>{{ maskUserId(talent.userId) }}</td>
                <td>
                  <span class="score-badge" :class="getScoreClass(talent.avgScore)">
                    {{ talent.avgScore?.toFixed(2) || 0 }}
                  </span>
                </td>
                <td>{{ talent.dimensions?.analysis?.toFixed(2) || 0 }}</td>
                <td>{{ talent.dimensions?.reasoning?.toFixed(2) || 0 }}</td>
                <td>{{ talent.dimensions?.creativity?.toFixed(2) || 0 }}</td>
                <td>{{ talent.dimensions?.evidence?.toFixed(2) || 0 }}</td>
                <td>
                  <span class="strength-badge" :class="talent.strongestDimension">
                    {{ getDimensionLabel(talent.strongestDimension) }}
                  </span>
                </td>
                <td>{{ talent.assessmentCount || 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Export Button -->
      <div class="export-section">
        <button class="export-btn" @click="exportTalents">
          📤 Export Talent List (CSV)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// State
const isLoading = ref(false)
const totalTalents = ref(0)
const categories = ref({})
const champions = ref({})
const topTalents = ref([])

// Methods
async function loadTalents() {
  try {
    isLoading.value = true
    
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL
    const response = await fetch(`${functionsUrl}/getTalentPipeline?minScore=14&limit=50`)
    const data = await response.json()
    
    if (data.success) {
      totalTalents.value = data.talentPipeline.totalTalents
      categories.value = data.talentPipeline.categories
      champions.value = data.talentPipeline.champions
      topTalents.value = data.talentPipeline.topTalents
    }
  } catch (error) {
    console.error('Error loading talent pipeline:', error)
    // Use mock data
    loadMockData()
  } finally {
    isLoading.value = false
  }
}

function loadMockData() {
  totalTalents.value = 150
  
  categories.value = {
    exceptional: { count: 25, description: 'คะแนนเฉลี่ย 18+ (ดีเยี่ยม)' },
    excellent: { count: 65, description: 'คะแนนเฉลี่ย 16-17 (ดีมาก)' },
    promising: { count: 60, description: 'คะแนนเฉลี่ย 14-15 (มีศักยภาพ)' }
  }
  
  champions.value = {
    analysis: Array(15).fill({ userId: 'mock' }),
    reasoning: Array(12).fill({ userId: 'mock' }),
    creativity: Array(8).fill({ userId: 'mock' }),
    evidence: Array(10).fill({ userId: 'mock' })
  }
  
  topTalents.value = Array(10).fill(null).map((_, i) => ({
    userId: `student-demo-${i + 1}`,
    avgScore: 19 - i * 0.3,
    highestScore: 20 - i * 0.2,
    assessmentCount: 10 - i,
    dimensions: {
      analysis: 4.5 - i * 0.1,
      reasoning: 4.3 - i * 0.1,
      creativity: 4.2 - i * 0.1,
      evidence: 4.4 - i * 0.1
    },
    strongestDimension: ['analysis', 'reasoning', 'creativity', 'evidence'][i % 4]
  }))
}

function maskUserId(userId) {
  if (!userId) return '-'
  // Privacy: show partial ID
  return userId.slice(0, 8) + '***'
}

function getRankClass(index) {
  if (index === 0) return 'gold'
  if (index === 1) return 'silver'
  if (index === 2) return 'bronze'
  return 'normal'
}

function getScoreClass(score) {
  if (score >= 18) return 'exceptional'
  if (score >= 16) return 'excellent'
  if (score >= 14) return 'promising'
  return 'normal'
}

function getDimensionLabel(dim) {
  const labels = {
    analysis: '🔍 Analysis',
    reasoning: '🧠 Reasoning',
    creativity: '💡 Creativity',
    evidence: '📚 Evidence'
  }
  return labels[dim] || dim
}

function exportTalents() {
  // Generate CSV
  const BOM = '\uFEFF'
  const headers = ['อันดับ', 'รหัสนักเรียน', 'คะแนนเฉลี่ย', 'Analysis', 'Reasoning', 'Creativity', 'Evidence', 'จุดเด่น', 'จำนวนประเมิน']
  
  const rows = topTalents.value.map((t, i) => [
    i + 1,
    maskUserId(t.userId),
    t.avgScore?.toFixed(2),
    t.dimensions?.analysis?.toFixed(2),
    t.dimensions?.reasoning?.toFixed(2),
    t.dimensions?.creativity?.toFixed(2),
    t.dimensions?.evidence?.toFixed(2),
    t.strongestDimension,
    t.assessmentCount
  ])
  
  const csvContent = BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `talent_pipeline_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
}

onMounted(() => {
  loadTalents()
})
</script>

<style scoped>
.talent-pipeline {
  background: var(--surface-card);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  margin-bottom: var(--space-6);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}

.header h2 {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin: 0;
}

.subtitle {
  color: var(--text-secondary);
  margin: 0;
  flex: 1;
}

.refresh-btn {
  padding: var(--space-2) var(--space-3);
  background: var(--primary-100);
  color: var(--primary-700);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-8);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-default);
  border-top-color: var(--primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Category Summary */
.category-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-5);
  border-radius: var(--radius-xl);
  text-align: center;
}

.category-card.exceptional {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 2px solid #f59e0b;
}

.category-card.excellent {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  border: 2px solid #3b82f6;
}

.category-card.promising {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  border: 2px solid #10b981;
}

.category-icon {
  font-size: 32px;
  margin-bottom: var(--space-2);
}

.category-card .count {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
}

.category-card .label {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.category-card .desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-top: var(--space-1);
}

/* Champions Section */
.champions-section {
  margin-bottom: var(--space-6);
}

.champions-section h3 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-4);
}

.champions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
}

@media (max-width: 768px) {
  .champions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.champion-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
}

.champion-card.analysis { border-top: 3px solid var(--arce-analysis, #3b82f6); }
.champion-card.reasoning { border-top: 3px solid var(--arce-reasoning, #8b5cf6); }
.champion-card.creativity { border-top: 3px solid var(--arce-creativity, #f59e0b); }
.champion-card.evidence { border-top: 3px solid var(--arce-evidence, #10b981); }

.dim-icon {
  font-size: var(--text-2xl);
  margin-bottom: var(--space-1);
}

.dim-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
}

.champion-count {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--text-primary);
}

/* Talents Table */
.talents-table-section h3 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-4);
}

.table-wrapper {
  overflow-x: auto;
}

.talents-table {
  width: 100%;
  border-collapse: collapse;
}

.talents-table th,
.talents-table td {
  padding: var(--space-3);
  text-align: center;
  border-bottom: 1px solid var(--border-default);
}

.talents-table th {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--text-secondary);
  background: var(--bg-secondary);
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
}

.rank-badge.gold { background: #fef3c7; color: #92400e; }
.rank-badge.silver { background: #e5e7eb; color: #374151; }
.rank-badge.bronze { background: #fed7aa; color: #9a3412; }
.rank-badge.normal { background: var(--bg-secondary); color: var(--text-secondary); }

.score-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.score-badge.exceptional { background: #fef3c7; color: #92400e; }
.score-badge.excellent { background: #dbeafe; color: #1d4ed8; }
.score-badge.promising { background: #d1fae5; color: #047857; }

.strength-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  background: var(--bg-secondary);
}

.strength-badge.analysis { background: #dbeafe; color: #1d4ed8; }
.strength-badge.reasoning { background: #ede9fe; color: #6d28d9; }
.strength-badge.creativity { background: #fef3c7; color: #92400e; }
.strength-badge.evidence { background: #d1fae5; color: #047857; }

/* Export Section */
.export-section {
  margin-top: var(--space-6);
  text-align: center;
}

.export-btn {
  padding: var(--space-3) var(--space-6);
  background: var(--primary-500);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-weight: var(--font-semibold);
  cursor: pointer;
}

.export-btn:hover {
  background: var(--primary-600);
}
</style>
