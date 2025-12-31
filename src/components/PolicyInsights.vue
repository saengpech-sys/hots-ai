<template>
  <div class="policy-insights">
    <div class="header">
      <h2>💡 Policy Insights</h2>
      <p class="subtitle">คำแนะนำเชิงนโยบายจากการวิเคราะห์ข้อมูล AI</p>
      <button class="refresh-btn" @click="loadInsights" :disabled="isLoading">
        🔄 รีเฟรช
      </button>
    </div>

    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>กำลังวิเคราะห์ข้อมูล...</p>
    </div>

    <div v-else class="insights-content">
      <!-- Data Snapshot -->
      <div class="data-snapshot">
        <div class="snapshot-item">
          <span class="icon">🏫</span>
          <span class="value">{{ dataSnapshot.totalSchools?.toLocaleString() || 0 }}</span>
          <span class="label">โรงเรียน</span>
        </div>
        <div class="snapshot-item">
          <span class="icon">📝</span>
          <span class="value">{{ dataSnapshot.totalAssessments?.toLocaleString() || 0 }}</span>
          <span class="label">การประเมิน</span>
        </div>
        <div class="snapshot-item weakest">
          <span class="icon">⚠️</span>
          <span class="value">{{ dataSnapshot.weakestDimension?.name || '-' }}</span>
          <span class="label">มิติที่ต้องปรับปรุง</span>
        </div>
      </div>

      <!-- Dimension Averages -->
      <div class="dimension-card">
        <h3>📐 A.R.C.E. Dimension Averages (ระดับประเทศ)</h3>
        <div class="dimension-grid">
          <div class="dimension-item analysis">
            <span class="dim-name">Analysis</span>
            <div class="dim-bar">
              <div 
                class="dim-fill" 
                :style="{ width: ((dataSnapshot.dimensionAverages?.analysis || 0) / 5 * 100) + '%' }"
              ></div>
            </div>
            <span class="dim-score">{{ dataSnapshot.dimensionAverages?.analysis?.toFixed(2) || 0 }}</span>
          </div>
          <div class="dimension-item reasoning">
            <span class="dim-name">Reasoning</span>
            <div class="dim-bar">
              <div 
                class="dim-fill" 
                :style="{ width: ((dataSnapshot.dimensionAverages?.reasoning || 0) / 5 * 100) + '%' }"
              ></div>
            </div>
            <span class="dim-score">{{ dataSnapshot.dimensionAverages?.reasoning?.toFixed(2) || 0 }}</span>
          </div>
          <div class="dimension-item creativity">
            <span class="dim-name">Creativity</span>
            <div class="dim-bar">
              <div 
                class="dim-fill" 
                :style="{ width: ((dataSnapshot.dimensionAverages?.creativity || 0) / 5 * 100) + '%' }"
              ></div>
            </div>
            <span class="dim-score">{{ dataSnapshot.dimensionAverages?.creativity?.toFixed(2) || 0 }}</span>
          </div>
          <div class="dimension-item evidence">
            <span class="dim-name">Evidence</span>
            <div class="dim-bar">
              <div 
                class="dim-fill" 
                :style="{ width: ((dataSnapshot.dimensionAverages?.evidence || 0) / 5 * 100) + '%' }"
              ></div>
            </div>
            <span class="dim-score">{{ dataSnapshot.dimensionAverages?.evidence?.toFixed(2) || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Insights List -->
      <div class="insights-list">
        <div 
          v-for="(insight, index) in insights" 
          :key="index"
          class="insight-card"
          :class="insight.category"
        >
          <div class="insight-header">
            <span class="category-badge" :class="insight.category">
              {{ getCategoryIcon(insight.category) }} {{ getCategoryLabel(insight.category) }}
            </span>
            <span class="impact-badge" :class="insight.impact">
              {{ getImpactLabel(insight.impact) }}
            </span>
          </div>
          
          <h4 class="insight-title">{{ insight.title }}</h4>
          <p class="insight-description">{{ insight.description }}</p>
          
          <div class="insight-meta">
            <span class="effort">
              ⚡ ความยาก: {{ getEffortLabel(insight.effort) }}
            </span>
            <span class="timeline">
              ⏱️ {{ insight.timeline }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// State
const isLoading = ref(false)
const insights = ref([])
const dataSnapshot = ref({})

// Methods
async function loadInsights() {
  try {
    isLoading.value = true
    
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL
    const response = await fetch(`${functionsUrl}/getPolicyInsights`)
    const data = await response.json()
    
    if (data.success) {
      insights.value = data.insights
      dataSnapshot.value = data.dataSnapshot
    }
  } catch (error) {
    console.error('Error loading policy insights:', error)
    // Use mock data if API fails
    insights.value = getMockInsights()
    dataSnapshot.value = getMockDataSnapshot()
  } finally {
    isLoading.value = false
  }
}

function getMockInsights() {
  return [
    {
      category: 'curriculum',
      title: 'ปรับปรุงหลักสูตรด้านความคิดสร้างสรรค์',
      description: 'คะแนนเฉลี่ยด้าน Creativity อยู่ที่ 2.85/5 ซึ่งต่ำที่สุดในทุกมิติ ควรเพิ่มกิจกรรม Project-Based Learning ในหลักสูตร',
      impact: 'high',
      effort: 'medium',
      timeline: '6-12 เดือน'
    },
    {
      category: 'teacher_development',
      title: 'พัฒนาครูด้านการสอนทักษะคิดขั้นสูง',
      description: 'ความแตกต่างระหว่างโรงเรียนมีมาก ควรจัดอบรมครูให้มีความเข้าใจ HOTS และ A.R.C.E. Framework',
      impact: 'high',
      effort: 'high',
      timeline: '3-6 เดือน'
    },
    {
      category: 'resource_allocation',
      title: 'จัดสรรทรัพยากรตามระดับความต้องการ',
      description: 'ใช้ข้อมูล Gap Analysis เพื่อจัดสรรงบประมาณและบุคลากรสนับสนุนไปยังโรงเรียนที่ต้องการความช่วยเหลือมากที่สุด',
      impact: 'medium',
      effort: 'medium',
      timeline: '1-3 เดือน'
    },
    {
      category: 'equity',
      title: 'ลดช่องว่างคุณภาพการศึกษา',
      description: 'ให้ความสำคัญกับโรงเรียนในพื้นที่ห่างไกลและด้อยโอกาส โดยใช้ข้อมูลจาก Equity Report ในการวางแผน',
      impact: 'high',
      effort: 'high',
      timeline: '12+ เดือน'
    }
  ]
}

function getMockDataSnapshot() {
  return {
    totalSchools: 200,
    totalAssessments: 15000,
    dimensionAverages: {
      analysis: 3.12,
      reasoning: 2.98,
      creativity: 2.85,
      evidence: 3.05
    },
    weakestDimension: {
      name: 'Creativity',
      score: '2.85'
    }
  }
}

function getCategoryIcon(category) {
  const icons = {
    curriculum: '📚',
    teacher_development: '👨‍🏫',
    resource_allocation: '💰',
    assessment: '📊',
    equity: '⚖️'
  }
  return icons[category] || '📋'
}

function getCategoryLabel(category) {
  const labels = {
    curriculum: 'หลักสูตร',
    teacher_development: 'พัฒนาครู',
    resource_allocation: 'ทรัพยากร',
    assessment: 'การประเมิน',
    equity: 'ความเสมอภาค'
  }
  return labels[category] || category
}

function getImpactLabel(impact) {
  const labels = {
    high: '🔴 ผลกระทบสูง',
    medium: '🟡 ผลกระทบปานกลาง',
    low: '🟢 ผลกระทบต่ำ'
  }
  return labels[impact] || impact
}

function getEffortLabel(effort) {
  const labels = {
    high: 'สูง',
    medium: 'ปานกลาง',
    low: 'ต่ำ'
  }
  return labels[effort] || effort
}

onMounted(() => {
  loadInsights()
})
</script>

<style scoped>
.policy-insights {
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

/* Data Snapshot */
.data-snapshot {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}

.snapshot-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-4);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  min-width: 120px;
}

.snapshot-item .icon {
  font-size: var(--text-2xl);
  margin-bottom: var(--space-1);
}

.snapshot-item .value {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
}

.snapshot-item .label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.snapshot-item.weakest {
  background: var(--warning-50);
  border: 1px solid var(--warning-200);
}

/* Dimension Card */
.dimension-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-6);
}

.dimension-card h3 {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0 0 var(--space-4);
}

.dimension-grid {
  display: grid;
  gap: var(--space-3);
}

.dimension-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.dim-name {
  width: 80px;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.dim-bar {
  flex: 1;
  height: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.dim-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.dimension-item.analysis .dim-fill { background: var(--arce-analysis, #3b82f6); }
.dimension-item.reasoning .dim-fill { background: var(--arce-reasoning, #8b5cf6); }
.dimension-item.creativity .dim-fill { background: var(--arce-creativity, #f59e0b); }
.dimension-item.evidence .dim-fill { background: var(--arce-evidence, #10b981); }

.dim-score {
  width: 40px;
  font-weight: var(--font-semibold);
  text-align: right;
}

/* Insights List */
.insights-list {
  display: grid;
  gap: var(--space-4);
}

.insight-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  border-left: 4px solid var(--primary-500);
  box-shadow: var(--shadow-sm);
}

.insight-card.curriculum { border-left-color: #3b82f6; }
.insight-card.teacher_development { border-left-color: #8b5cf6; }
.insight-card.resource_allocation { border-left-color: #f59e0b; }
.insight-card.assessment { border-left-color: #10b981; }
.insight-card.equity { border-left-color: #ec4899; }

.insight-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.category-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  background: var(--bg-secondary);
}

.impact-badge {
  font-size: var(--text-xs);
}

.insight-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
}

.insight-description {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0 0 var(--space-3);
  line-height: 1.5;
}

.insight-meta {
  display: flex;
  gap: var(--space-4);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}
</style>
