<template>
  <div class="analytics-insights">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="$router.back()">← กลับ</button>
        <h1>📊 Analytics Insights</h1>
      </div>
      <button class="btn-share" @click="showNewModal = true">+ แชร์ Insight</button>
    </div>

    <!-- Stats Overview -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-icon">💡</span>
        <div class="stat-content">
          <span class="stat-value">{{ insights.length }}</span>
          <span class="stat-label">Insights ทั้งหมด</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">🔥</span>
        <div class="stat-content">
          <span class="stat-value">{{ trendingCount }}</span>
          <span class="stat-label">Trending</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">✅</span>
        <div class="stat-content">
          <span class="stat-value">{{ verifiedCount }}</span>
          <span class="stat-label">ยืนยันแล้ว</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <div class="filter-tabs">
        <button 
          v-for="type in insightTypes" 
          :key="type.id"
          :class="['filter-tab', { active: selectedType === type.id }]"
          @click="selectedType = selectedType === type.id ? '' : type.id"
        >
          {{ type.icon }} {{ type.name }}
        </button>
      </div>
      <div class="filter-right">
        <select v-model="sortBy" class="sort-select">
          <option value="recent">ล่าสุด</option>
          <option value="upvotes">Upvotes สูงสุด</option>
          <option value="discussed">ความคิดเห็นมาก</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Insights Feed -->
    <div v-else class="insights-feed">
      <div v-for="insight in filteredInsights" :key="insight.id" class="insight-card">
        <!-- Type Badge -->
        <div class="card-top">
          <span class="type-badge" :class="insight.insightType">
            {{ getTypeIcon(insight.insightType) }} {{ getTypeName(insight.insightType) }}
          </span>
          <span v-if="insight.isVerified" class="verified-badge">✅ ยืนยันแล้ว</span>
          <span v-if="insight.isTrending" class="trending-badge">🔥 Trending</span>
        </div>

        <!-- Title -->
        <h3 class="insight-title">{{ insight.title }}</h3>

        <!-- Key Finding -->
        <div class="key-finding">
          <span class="finding-label">🎯 Key Finding:</span>
          <p>{{ insight.keyFinding }}</p>
        </div>

        <!-- Data Summary -->
        <div class="data-summary" v-if="insight.dataSummary">
          <span class="summary-label">📈 ข้อมูลสนับสนุน:</span>
          <div class="summary-stats">
            <div v-for="(value, key) in insight.dataSummary" :key="key" class="summary-item">
              <span class="summary-key">{{ formatKey(key) }}:</span>
              <span class="summary-value">{{ value }}</span>
            </div>
          </div>
        </div>

        <!-- Context -->
        <div class="context-info" v-if="insight.context">
          <span class="context-label">📋 บริบท:</span>
          <p>{{ insight.context }}</p>
        </div>

        <!-- Affected Dimensions -->
        <div class="affected-dims" v-if="insight.affectedDimensions?.length">
          <span class="dims-label">มิติที่เกี่ยวข้อง:</span>
          <div class="dims-list">
            <span v-for="dim in insight.affectedDimensions" :key="dim" class="dim-badge" :class="dim">
              {{ getDimEmoji(dim) }} {{ getDimName(dim) }}
            </span>
          </div>
        </div>

        <!-- Tags -->
        <div class="insight-tags" v-if="insight.tags?.length">
          <span v-for="tag in insight.tags" :key="tag" class="tag">#{{ tag }}</span>
        </div>

        <!-- Author & Actions -->
        <div class="card-footer">
          <div class="author-section">
            <img :src="insight.authorPhoto || '/default-avatar.png'" class="author-avatar" />
            <div class="author-info">
              <span class="author-name">{{ insight.authorName }}</span>
              <span class="post-time">{{ formatTimeAgo(insight.createdAt) }}</span>
            </div>
          </div>
          <div class="card-actions">
            <button 
              :class="['action-btn', { active: insight.hasUpvoted }]"
              @click="toggleUpvote(insight)"
            >
              👍 {{ insight.upvotes || 0 }}
            </button>
            <button class="action-btn" @click="viewInsight(insight)">
              💬 {{ insight.commentsCount || 0 }}
            </button>
            <button 
              :class="['action-btn', { active: insight.hasSaved }]"
              @click="toggleSave(insight)"
            >
              🔖
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredInsights.length === 0" class="empty-state">
        <span class="empty-icon">📊</span>
        <p>ยังไม่มี Insight</p>
        <button @click="showNewModal = true">แชร์ Insight แรก</button>
      </div>
    </div>

    <!-- Insight Detail Modal -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal-content detail-modal">
        <div class="modal-header">
          <span class="type-badge" :class="selectedInsight?.insightType">
            {{ getTypeIcon(selectedInsight?.insightType) }} {{ getTypeName(selectedInsight?.insightType) }}
          </span>
          <button class="close-btn" @click="showDetailModal = false">×</button>
        </div>

        <div class="modal-body" v-if="selectedInsight">
          <h2>{{ selectedInsight.title }}</h2>

          <!-- Verification & Trending -->
          <div class="status-badges">
            <span v-if="selectedInsight.isVerified" class="verified-badge">✅ ยืนยันโดยครูอื่น</span>
            <span v-if="selectedInsight.isTrending" class="trending-badge">🔥 Trending</span>
          </div>

          <!-- Key Finding -->
          <div class="detail-section">
            <h4>🎯 Key Finding</h4>
            <div class="finding-box">{{ selectedInsight.keyFinding }}</div>
          </div>

          <!-- Full Description -->
          <div class="detail-section" v-if="selectedInsight.description">
            <h4>📝 รายละเอียด</h4>
            <div class="description-content" v-html="formatContent(selectedInsight.description)"></div>
          </div>

          <!-- Data Evidence -->
          <div class="detail-section" v-if="selectedInsight.dataSummary">
            <h4>📈 หลักฐานจากข้อมูล</h4>
            <div class="data-grid">
              <div v-for="(value, key) in selectedInsight.dataSummary" :key="key" class="data-item">
                <span class="data-label">{{ formatKey(key) }}</span>
                <span class="data-value">{{ value }}</span>
              </div>
            </div>
          </div>

          <!-- Context -->
          <div class="detail-section" v-if="selectedInsight.context">
            <h4>📋 บริบท</h4>
            <p class="context-text">{{ selectedInsight.context }}</p>
          </div>

          <!-- Implications -->
          <div class="detail-section" v-if="selectedInsight.implications?.length">
            <h4>💡 นัยสำคัญสำหรับการสอน</h4>
            <ul class="implications-list">
              <li v-for="(imp, i) in selectedInsight.implications" :key="i">{{ imp }}</li>
            </ul>
          </div>

          <!-- Suggested Actions -->
          <div class="detail-section" v-if="selectedInsight.suggestedActions?.length">
            <h4>✅ การดำเนินการที่แนะนำ</h4>
            <div class="actions-list">
              <div v-for="(action, i) in selectedInsight.suggestedActions" :key="i" class="action-item">
                <span class="action-number">{{ i + 1 }}</span>
                <span>{{ action }}</span>
              </div>
            </div>
          </div>

          <!-- Affected Dimensions -->
          <div class="detail-section" v-if="selectedInsight.affectedDimensions?.length">
            <h4>🎯 มิติ A.R.C.E. ที่เกี่ยวข้อง</h4>
            <div class="dims-detail">
              <div v-for="dim in selectedInsight.affectedDimensions" :key="dim" class="dim-detail" :class="dim">
                <span class="dim-emoji">{{ getDimEmoji(dim) }}</span>
                <span class="dim-name">{{ getDimName(dim) }}</span>
              </div>
            </div>
          </div>

          <!-- Author -->
          <div class="author-box">
            <img :src="selectedInsight.authorPhoto || '/default-avatar.png'" class="author-avatar-lg" />
            <div class="author-details">
              <span class="author-name-lg">{{ selectedInsight.authorName }}</span>
              <span class="author-school">{{ selectedInsight.schoolName || 'โรงเรียน' }}</span>
              <span class="post-date">{{ formatDate(selectedInsight.createdAt) }}</span>
            </div>
          </div>

          <!-- Comments Section -->
          <div class="comments-section">
            <h4>💬 ความคิดเห็น ({{ comments.length }})</h4>
            
            <div class="comment-input">
              <textarea v-model="newComment" placeholder="แสดงความคิดเห็น..." rows="2"></textarea>
              <button @click="submitComment">ส่ง</button>
            </div>

            <div class="comments-list">
              <div v-for="comment in comments" :key="comment.id" class="comment-item">
                <img :src="comment.authorPhoto || '/default-avatar.png'" class="comment-avatar" />
                <div class="comment-content">
                  <div class="comment-header">
                    <span class="comment-author">{{ comment.authorName }}</span>
                    <span class="comment-time">{{ formatTimeAgo(comment.createdAt) }}</span>
                  </div>
                  <p class="comment-text">{{ comment.text }}</p>
                </div>
              </div>

              <p v-if="comments.length === 0" class="no-comments">ยังไม่มีความคิดเห็น</p>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button 
            :class="['btn-action', { active: selectedInsight?.hasUpvoted }]"
            @click="toggleUpvote(selectedInsight)"
          >
            👍 {{ selectedInsight?.hasUpvoted ? 'Upvoted' : 'Upvote' }}
          </button>
          <button 
            :class="['btn-action', { active: selectedInsight?.hasSaved }]"
            @click="toggleSave(selectedInsight)"
          >
            🔖 {{ selectedInsight?.hasSaved ? 'บันทึกแล้ว' : 'บันทึก' }}
          </button>
          <button class="btn-action" @click="verifyInsight(selectedInsight)">
            ✅ ยืนยัน Insight
          </button>
        </div>
      </div>
    </div>

    <!-- New Insight Modal -->
    <div v-if="showNewModal" class="modal-overlay" @click.self="showNewModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>📊 แชร์ Analytics Insight</h2>
          <button class="close-btn" @click="showNewModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>ประเภท Insight</label>
            <select v-model="form.insightType" required>
              <option v-for="type in insightTypes" :key="type.id" :value="type.id">
                {{ type.icon }} {{ type.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>หัวข้อ</label>
            <input v-model="form.title" type="text" placeholder="สรุป Insight ในหนึ่งบรรทัด" />
          </div>

          <div class="form-group">
            <label>🎯 Key Finding (สิ่งที่ค้นพบสำคัญ)</label>
            <textarea v-model="form.keyFinding" rows="3" placeholder="สิ่งที่ค้นพบหลัก..."></textarea>
          </div>

          <div class="form-group">
            <label>รายละเอียดเพิ่มเติม</label>
            <textarea v-model="form.description" rows="4" placeholder="อธิบายเพิ่มเติม..."></textarea>
          </div>

          <div class="form-group">
            <label>📈 ข้อมูลสนับสนุน (ถ้ามี)</label>
            <div class="data-inputs">
              <input v-model="form.sampleSize" type="text" placeholder="ขนาดกลุ่มตัวอย่าง เช่น 120 นักเรียน" />
              <input v-model="form.percentage" type="text" placeholder="เปอร์เซ็นต์ เช่น 75% พัฒนาขึ้น" />
            </div>
          </div>

          <div class="form-group">
            <label>📋 บริบท</label>
            <input v-model="form.context" type="text" placeholder="เช่น วิชาคณิตศาสตร์ ม.3 เทอม 2/2567" />
          </div>

          <div class="form-group">
            <label>💡 นัยสำคัญสำหรับการสอน (แยกบรรทัด)</label>
            <textarea v-model="form.implicationsText" rows="3" placeholder="- นัยสำคัญข้อ 1&#10;- นัยสำคัญข้อ 2"></textarea>
          </div>

          <div class="form-group">
            <label>มิติ A.R.C.E. ที่เกี่ยวข้อง</label>
            <div class="dim-checkboxes">
              <label class="checkbox-item">
                <input type="checkbox" value="analysis" v-model="form.affectedDimensions" />
                🔍 Analysis
              </label>
              <label class="checkbox-item">
                <input type="checkbox" value="reasoning" v-model="form.affectedDimensions" />
                🧠 Reasoning
              </label>
              <label class="checkbox-item">
                <input type="checkbox" value="creativity" v-model="form.affectedDimensions" />
                💡 Creativity
              </label>
              <label class="checkbox-item">
                <input type="checkbox" value="evidence" v-model="form.affectedDimensions" />
                📊 Evidence
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>แท็ก (คั่นด้วย ,)</label>
            <input v-model="form.tags" type="text" placeholder="เช่น HOTS, คณิตศาสตร์, วิเคราะห์" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showNewModal = false">ยกเลิก</button>
          <button class="btn-submit" @click="submitInsight">แชร์ Insight</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { 
  collection, query, where, orderBy, limit, 
  getDocs, addDoc, updateDoc, doc, serverTimestamp, increment 
} from 'firebase/firestore'
import { db } from '@/firebase/config'

const authStore = useAuthStore()

// Insight Types
const insightTypes = [
  { id: 'pattern', icon: '📈', name: 'Pattern ที่พบ' },
  { id: 'correlation', icon: '🔗', name: 'ความสัมพันธ์' },
  { id: 'improvement', icon: '📊', name: 'การพัฒนา' },
  { id: 'challenge', icon: '⚠️', name: 'ความท้าทาย' },
  { id: 'success', icon: '🏆', name: 'Success Story' },
  { id: 'technique', icon: '💡', name: 'เทคนิคที่ได้ผล' }
]

// State
const loading = ref(true)
const selectedType = ref('')
const sortBy = ref('recent')

// Data
const insights = ref([])
const comments = ref([])
const newComment = ref('')

// Modals
const showDetailModal = ref(false)
const showNewModal = ref(false)
const selectedInsight = ref(null)

// Form
const form = reactive({
  insightType: 'pattern',
  title: '',
  keyFinding: '',
  description: '',
  sampleSize: '',
  percentage: '',
  context: '',
  implicationsText: '',
  affectedDimensions: [],
  tags: ''
})

// Computed
const trendingCount = computed(() => insights.value.filter(i => i.isTrending).length)
const verifiedCount = computed(() => insights.value.filter(i => i.isVerified).length)

const filteredInsights = computed(() => {
  let result = [...insights.value]

  if (selectedType.value) {
    result = result.filter(i => i.insightType === selectedType.value)
  }

  // Sort
  switch (sortBy.value) {
    case 'upvotes':
      result.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))
      break
    case 'discussed':
      result.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0))
      break
    default:
      result.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || new Date(0)
        return dateB - dateA
      })
  }

  return result
})

// Helpers
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`
  return formatDate(timestamp)
}

const formatContent = (text) => {
  if (!text) return ''
  return text.replace(/\n/g, '<br>')
}

const formatKey = (key) => {
  const translations = {
    sampleSize: 'กลุ่มตัวอย่าง',
    percentage: 'เปอร์เซ็นต์',
    avgScore: 'คะแนนเฉลี่ย',
    improvement: 'พัฒนาขึ้น'
  }
  return translations[key] || key
}

const getTypeIcon = (typeId) => {
  return insightTypes.find(t => t.id === typeId)?.icon || '📊'
}

const getTypeName = (typeId) => {
  return insightTypes.find(t => t.id === typeId)?.name || typeId
}

const getDimEmoji = (dim) => {
  const emojis = { analysis: '🔍', reasoning: '🧠', creativity: '💡', evidence: '📊' }
  return emojis[dim] || '📌'
}

const getDimName = (dim) => {
  const names = { analysis: 'Analysis', reasoning: 'Reasoning', creativity: 'Creativity', evidence: 'Evidence' }
  return names[dim] || dim
}

// Actions
const viewInsight = async (insight) => {
  selectedInsight.value = insight
  showDetailModal.value = true
  comments.value = []

  // Load comments
  try {
    const commentsQuery = query(
      collection(db, 'analyticsInsights', insight.id, 'comments'),
      orderBy('createdAt', 'asc'),
      limit(50)
    )
    const snapshot = await getDocs(commentsQuery)
    comments.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading comments:', error)
  }
}

const toggleUpvote = async (insight) => {
  if (!insight) return
  insight.hasUpvoted = !insight.hasUpvoted
  insight.upvotes = (insight.upvotes || 0) + (insight.hasUpvoted ? 1 : -1)

  await updateDoc(doc(db, 'analyticsInsights', insight.id), {
    upvotes: increment(insight.hasUpvoted ? 1 : -1)
  })
}

const toggleSave = async (insight) => {
  if (!insight) return
  insight.hasSaved = !insight.hasSaved
}

const verifyInsight = async (insight) => {
  if (!insight) return
  
  await updateDoc(doc(db, 'analyticsInsights', insight.id), {
    isVerified: true,
    verifiedBy: authStore.user.uid,
    verifiedAt: serverTimestamp()
  })
  insight.isVerified = true
  alert('ยืนยัน Insight สำเร็จ!')
}

const submitComment = async () => {
  if (!newComment.value.trim() || !selectedInsight.value) return

  try {
    await addDoc(collection(db, 'analyticsInsights', selectedInsight.value.id, 'comments'), {
      text: newComment.value,
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName || 'ครู',
      authorPhoto: authStore.user.photoURL,
      createdAt: serverTimestamp()
    })

    comments.value.push({
      id: Date.now().toString(),
      text: newComment.value,
      authorName: authStore.user.displayName || 'ครู',
      authorPhoto: authStore.user.photoURL,
      createdAt: new Date()
    })

    await updateDoc(doc(db, 'analyticsInsights', selectedInsight.value.id), {
      commentsCount: increment(1)
    })
    selectedInsight.value.commentsCount = (selectedInsight.value.commentsCount || 0) + 1

    newComment.value = ''
  } catch (error) {
    console.error('Error submitting comment:', error)
  }
}

const submitInsight = async () => {
  if (!form.title.trim() || !form.keyFinding.trim()) {
    alert('กรุณากรอกหัวข้อและ Key Finding')
    return
  }

  try {
    const dataSummary = {}
    if (form.sampleSize) dataSummary.sampleSize = form.sampleSize
    if (form.percentage) dataSummary.percentage = form.percentage

    await addDoc(collection(db, 'analyticsInsights'), {
      insightType: form.insightType,
      title: form.title,
      keyFinding: form.keyFinding,
      description: form.description,
      dataSummary: Object.keys(dataSummary).length > 0 ? dataSummary : null,
      context: form.context,
      implications: form.implicationsText.split('\n').map(s => s.replace(/^-\s*/, '').trim()).filter(s => s),
      affectedDimensions: form.affectedDimensions,
      tags: form.tags.split(',').map(t => t.trim()).filter(t => t),
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName || 'ครู',
      authorPhoto: authStore.user.photoURL,
      upvotes: 0,
      commentsCount: 0,
      isVerified: false,
      isTrending: false,
      createdAt: serverTimestamp()
    })

    showNewModal.value = false
    resetForm()
    loadInsights()
    alert('แชร์ Insight สำเร็จ!')
  } catch (error) {
    console.error('Error submitting insight:', error)
    alert('เกิดข้อผิดพลาด')
  }
}

const resetForm = () => {
  form.insightType = 'pattern'
  form.title = ''
  form.keyFinding = ''
  form.description = ''
  form.sampleSize = ''
  form.percentage = ''
  form.context = ''
  form.implicationsText = ''
  form.affectedDimensions = []
  form.tags = ''
}

// Load Data
const loadInsights = async () => {
  loading.value = true
  try {
    const insightsQuery = query(
      collection(db, 'analyticsInsights'),
      orderBy('createdAt', 'desc'),
      limit(100)
    )
    const snapshot = await getDocs(insightsQuery)
    insights.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading insights:', error)
  } finally {
    loading.value = false
  }
}

// Initialize
onMounted(() => {
  loadInsights()
})
</script>

<style scoped>
.analytics-insights {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  color: var(--text-primary);
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  padding: 8px 16px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-primary);
}

.page-header h1 {
  margin: 0;
  font-size: 26px;
  color: var(--text-primary);
}

.btn-share {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 2px 8px var(--shadow);
  border: 1px solid var(--border-color);
}

.stat-icon { font-size: 28px; }
.stat-value { font-size: 24px; font-weight: 700; display: block; color: var(--text-primary); }
.stat-label { font-size: 13px; color: var(--text-secondary); }

/* Filters */
.filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 8px 16px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  color: var(--text-primary);
}

.filter-tab:hover { background: var(--bg-tertiary); }
.filter-tab.active { background: #667eea; color: white; border-color: #667eea; }

.sort-select {
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 14px;
  background: var(--input-bg);
  color: var(--text-primary);
}

/* Insights Feed */
.insights-feed {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.insight-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px var(--shadow);
  border: 1px solid var(--border-color);
}

.card-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.type-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.type-badge.pattern { background: #e3f2fd; color: #1976d2; }
.type-badge.correlation { background: #fce4ec; color: #c2185b; }
.type-badge.improvement { background: #e8f5e9; color: #2e7d32; }
.type-badge.challenge { background: #fff3e0; color: #ef6c00; }
.type-badge.success { background: #f3e5f5; color: #7b1fa2; }
.type-badge.technique { background: #fff8e1; color: #f9a825; }

.verified-badge {
  padding: 4px 10px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 10px;
  font-size: 11px;
}

.trending-badge {
  padding: 4px 10px;
  background: #fff3e0;
  color: #ef6c00;
  border-radius: 10px;
  font-size: 11px;
}

.insight-title {
  margin: 0 0 12px 0;
  font-size: 18px;
  line-height: 1.4;
  color: var(--text-primary);
}

.key-finding {
  margin-bottom: 14px;
  padding: 14px;
  background: linear-gradient(135deg, #f0f4ff 0%, #faf0ff 100%);
  border-radius: 12px;
}

.finding-label {
  font-size: 12px;
  font-weight: 600;
  color: #667eea;
  display: block;
  margin-bottom: 6px;
}

.key-finding p {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-primary);
}

.data-summary {
  margin-bottom: 14px;
}

.summary-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 8px;
}

.summary-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.summary-item {
  padding: 8px 14px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  font-size: 13px;
}

.summary-key { color: var(--text-secondary); }
.summary-value { font-weight: 600; margin-left: 4px; color: var(--text-primary); }

.context-info {
  margin-bottom: 14px;
}

.context-label {
  font-size: 12px;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 4px;
}

.context-info p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.affected-dims {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.dims-label { font-size: 12px; color: var(--text-secondary); }

.dims-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.dim-badge {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
}

.dim-badge.analysis { background: #e3f2fd; color: #1976d2; }
.dim-badge.reasoning { background: #f3e5f5; color: #7b1fa2; }
.dim-badge.creativity { background: #fff8e1; color: #f57c00; }
.dim-badge.evidence { background: #e8f5e9; color: #2e7d32; }

.insight-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.tag {
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 14px;
  border-top: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 12px;
}

.author-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.author-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.author-name { font-size: 14px; font-weight: 500; display: block; color: var(--text-primary); }
.post-time { font-size: 12px; color: var(--text-secondary); display: block; }

.card-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 14px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  color: var(--text-primary);
}

.action-btn:hover { background: var(--bg-secondary); }
.action-btn.active { background: #e3f2fd; color: #1976d2; }

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--modal-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid var(--border-color);
}

.detail-modal { max-width: 700px; }

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  background: var(--modal-bg);
  z-index: 1;
}

.modal-header h2 { margin: 0; font-size: 18px; color: var(--text-primary); }

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-tertiary);
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-body {
  padding: 20px;
}

.modal-body h2 {
  margin: 0 0 16px 0;
  font-size: 22px;
  color: var(--text-primary);
}

.status-badges {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: var(--text-primary);
}

.finding-box {
  padding: 16px;
  background: linear-gradient(135deg, #f0f4ff 0%, #faf0ff 100%);
  border-radius: 12px;
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-primary);
}

.description-content {
  line-height: 1.7;
  font-size: 15px;
  color: var(--text-primary);
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.data-item {
  padding: 14px;
  background: var(--bg-secondary);
  border-radius: 10px;
}

.data-label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
.data-value { font-size: 18px; font-weight: 600; color: var(--text-primary); }

.context-text {
  margin: 0;
  padding: 14px;
  background: var(--bg-secondary);
  border-radius: 10px;
  line-height: 1.5;
  color: var(--text-primary);
}

.implications-list {
  margin: 0;
  padding-left: 20px;
  color: var(--text-primary);
}

.implications-list li {
  margin-bottom: 10px;
  line-height: 1.5;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 10px;
  color: var(--text-primary);
}

.action-number {
  width: 24px;
  height: 24px;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.dims-detail {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.dim-detail {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
}

.dim-detail.analysis { background: #e3f2fd; }
.dim-detail.reasoning { background: #f3e5f5; }
.dim-detail.creativity { background: #fff8e1; }
.dim-detail.evidence { background: #e8f5e9; }

.dim-emoji { font-size: 20px; }
.dim-name { font-weight: 500; }

.author-box {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  margin-bottom: 24px;
}

.author-avatar-lg {
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.author-details { flex: 1; }
.author-name-lg { font-weight: 600; font-size: 15px; display: block; color: var(--text-primary); }
.author-school, .post-date { font-size: 12px; color: var(--text-secondary); display: block; }

/* Comments */
.comments-section h4 {
  margin: 0 0 16px 0;
  font-size: 15px;
  color: var(--text-primary);
}

.comment-input {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.comment-input textarea {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  resize: none;
  background: var(--input-bg);
  color: var(--text-primary);
}

.comment-input button {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.comment-item {
  display: flex;
  gap: 10px;
}

.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.comment-content {
  flex: 1;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.comment-author { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.comment-time { font-size: 11px; color: var(--text-secondary); }
.comment-text { margin: 0; font-size: 14px; color: var(--text-primary); }

.no-comments {
  text-align: center;
  color: var(--text-secondary);
  padding: 20px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.btn-action {
  flex: 1;
  padding: 12px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
}

.btn-action.active {
  background: #e3f2fd;
  color: #1976d2;
}

/* Form */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--input-bg);
  color: var(--text-primary);
}

.data-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.dim-checkboxes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-primary);
}

.checkbox-item input { width: auto; }

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel {
  padding: 10px 20px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-primary);
}

.btn-submit {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

/* States */
.loading-state, .empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--card-bg);
  border-radius: 12px;
  color: var(--text-primary);
}

.empty-icon { font-size: 48px; display: block; margin-bottom: 16px; }

.empty-state button {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Responsive */
@media (max-width: 768px) {
  .stats-row { grid-template-columns: 1fr; }
  .filters { flex-direction: column; align-items: stretch; }
  .filter-tabs { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 8px; }
  .data-grid { grid-template-columns: 1fr; }
  .data-inputs { grid-template-columns: 1fr; }
  .dim-checkboxes { grid-template-columns: 1fr; }
}
</style>
