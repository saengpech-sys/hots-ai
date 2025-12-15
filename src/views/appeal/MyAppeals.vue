<template>
  <div class="my-appeals">
    <!-- Header -->
    <div class="page-header">
      <h1>📝 อุทธรณ์ของฉัน</h1>
    </div>

    <!-- Status Tabs -->
    <div class="status-tabs">
      <button 
        v-for="tab in statusTabs"
        :key="tab.value"
        :class="['tab', { active: activeStatus === tab.value }]"
        @click="activeStatus = tab.value"
      >
        {{ tab.icon }} {{ tab.label }}
        <span class="count">{{ tab.count }}</span>
      </button>
    </div>

    <!-- Loading -->
    <LoadingSpinner v-if="loading" />

    <!-- Empty State -->
    <div v-else-if="filteredAppeals.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>ไม่มีอุทธรณ์</h3>
      <p>คุณยังไม่มีอุทธรณ์ในสถานะนี้</p>
    </div>

    <!-- Appeals List -->
    <div class="appeals-list" v-else>
      <div 
        v-for="appeal in filteredAppeals"
        :key="appeal.id"
        class="appeal-card"
        :class="appeal.status.toLowerCase()"
      >
        <div class="card-header">
          <span class="appeal-type">{{ getTypeLabel(appeal.type) }}</span>
          <span :class="['status-badge', appeal.status.toLowerCase()]">
            {{ getStatusLabel(appeal.status) }}
          </span>
        </div>

        <h3 class="assignment-title">{{ appeal.assignmentTitle }}</h3>

        <div class="appeal-info">
          <div class="info-row">
            <span class="info-label">ยื่นเมื่อ:</span>
            <span class="info-value">{{ formatDate(appeal.createdAt) }}</span>
          </div>
          <div class="info-row" v-if="appeal.resolvedAt">
            <span class="info-label">ตอบกลับเมื่อ:</span>
            <span class="info-value">{{ formatDate(appeal.resolvedAt) }}</span>
          </div>
        </div>

        <!-- Original & New Scores (if resolved) -->
        <div v-if="appeal.resolution" class="score-comparison">
          <div class="score-box original">
            <span class="score-label">คะแนนเดิม</span>
            <span class="score-value">{{ appeal.originalScore }}/20</span>
          </div>
          <span class="arrow">→</span>
          <div class="score-box new" :class="{ increased: appeal.resolution.newScore > appeal.originalScore }">
            <span class="score-label">คะแนนใหม่</span>
            <span class="score-value">{{ appeal.resolution.newScore }}/20</span>
          </div>
        </div>

        <!-- Reason Preview -->
        <div class="reason-preview">
          <strong>เหตุผล:</strong> {{ truncate(appeal.reason, 150) }}
        </div>

        <!-- Resolution (if exists) -->
        <div v-if="appeal.resolution" class="resolution-section">
          <h4>📋 ผลการพิจารณา</h4>
          <div class="resolution-decision" :class="appeal.resolution.decision">
            {{ getDecisionLabel(appeal.resolution.decision) }}
          </div>
          <p v-if="appeal.resolution.comment" class="resolution-comment">
            💬 {{ appeal.resolution.comment }}
          </p>
        </div>

        <!-- Actions -->
        <div class="card-actions">
          <router-link :to="`/submissions/${appeal.submissionId}`" class="btn-view">
            👁️ ดูงาน
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const authStore = useAuthStore()

const loading = ref(true)
const appeals = ref([])
const activeStatus = ref('all')

const statusTabs = computed(() => [
  { value: 'all', label: 'ทั้งหมด', icon: '📋', count: appeals.value.length },
  { value: 'pending', label: 'รอพิจารณา', icon: '⏳', count: appeals.value.filter(a => a.status === 'PENDING').length },
  { value: 'resolved', label: 'พิจารณาแล้ว', icon: '✅', count: appeals.value.filter(a => a.status === 'RESOLVED').length }
])

const filteredAppeals = computed(() => {
  if (activeStatus.value === 'all') return appeals.value
  if (activeStatus.value === 'pending') return appeals.value.filter(a => a.status === 'PENDING')
  if (activeStatus.value === 'resolved') return appeals.value.filter(a => a.status === 'RESOLVED')
  return appeals.value
})

async function loadAppeals() {
  loading.value = true
  try {
    const appealsQuery = query(
      collection(db, 'appeals'),
      where('studentId', '==', authStore.user.uid),
      orderBy('createdAt', 'desc')
    )
    
    const snapshot = await getDocs(appealsQuery)
    appeals.value = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (error) {
    console.error('Error loading appeals:', error)
  } finally {
    loading.value = false
  }
}

function getTypeLabel(type) {
  const labels = {
    'score_review': '📊 ทบทวนคะแนน',
    'technical_issue': '🔧 ปัญหาทางเทคนิค',
    'unfair_assessment': '⚖️ การประเมินไม่เป็นธรรม'
  }
  return labels[type] || type
}

function getStatusLabel(status) {
  const labels = {
    'PENDING': '⏳ รอพิจารณา',
    'RESOLVED': '✅ พิจารณาแล้ว',
    'REJECTED': '❌ ปฏิเสธ'
  }
  return labels[status] || status
}

function getDecisionLabel(decision) {
  const labels = {
    'approved': '✅ อนุมัติ - ปรับคะแนนตามที่ร้องขอ',
    'partially_approved': '⚡ อนุมัติบางส่วน',
    'rejected': '❌ ปฏิเสธ - คงคะแนนเดิม'
  }
  return labels[decision] || decision
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function truncate(text, length) {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

onMounted(loadAppeals)
</script>

<style scoped>
.my-appeals {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 1.5rem;
}

/* Status Tabs */
.status-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--card-bg);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
}

.tab.active {
  background: var(--primary-color);
  color: white;
}

.count {
  padding: 2px 8px;
  background: var(--bg-secondary);
  border-radius: 10px;
  font-size: 0.8rem;
}

.tab.active .count {
  background: rgba(255,255,255,0.2);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--card-bg);
  border-radius: 12px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

/* Appeals List */
.appeals-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.appeal-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  border-left: 4px solid var(--border-color);
}

.appeal-card.pending {
  border-left-color: #f59e0b;
}

.appeal-card.resolved {
  border-left-color: #10b981;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.appeal-type {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
}

.status-badge.pending {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.resolved {
  background: #d1fae5;
  color: #059669;
}

.assignment-title {
  font-size: 1.1rem;
  margin-bottom: 12px;
}

.appeal-info {
  display: flex;
  gap: 20px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  gap: 8px;
}

/* Score Comparison */
.score-comparison {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 16px;
}

.score-box {
  text-align: center;
}

.score-label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.score-value {
  font-size: 1.3rem;
  font-weight: 700;
}

.score-box.new.increased .score-value {
  color: #10b981;
}

.arrow {
  font-size: 1.5rem;
  color: var(--text-secondary);
}

/* Reason Preview */
.reason-preview {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 16px;
}

/* Resolution */
.resolution-section {
  padding: 16px;
  background: #f0fdf4;
  border-radius: 8px;
  margin-bottom: 16px;
}

.resolution-section h4 {
  margin-bottom: 12px;
}

.resolution-decision {
  font-weight: 600;
  margin-bottom: 8px;
}

.resolution-decision.approved {
  color: #059669;
}

.resolution-decision.partially_approved {
  color: #d97706;
}

.resolution-decision.rejected {
  color: #dc2626;
}

.resolution-comment {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* Actions */
.card-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-view {
  padding: 8px 16px;
  background: var(--primary-light);
  color: var(--primary-color);
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.9rem;
}
</style>
