<template>
  <div class="teaching-strategies">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="$router.back()">← กลับ</button>
        <h1>🎯 กลยุทธ์การสอน HOTS</h1>
      </div>
      <button class="btn-share" @click="showNewModal = true">+ แชร์เทคนิค</button>
    </div>

    <!-- Categories -->
    <div class="categories">
      <button 
        v-for="cat in categories" 
        :key="cat.id"
        :class="['cat-btn', { active: selectedCategory === cat.id }]"
        @click="selectedCategory = selectedCategory === cat.id ? '' : cat.id"
      >
        <span class="cat-icon">{{ cat.icon }}</span>
        <span class="cat-name">{{ cat.name }}</span>
        <span class="cat-count">{{ getCategoryCount(cat.id) }}</span>
      </button>
    </div>

    <!-- Search -->
    <div class="search-section">
      <input v-model="searchQuery" type="text" placeholder="🔍 ค้นหาเทคนิค..." class="search-input" />
      <select v-model="sortBy" class="sort-select">
        <option value="recent">ล่าสุด</option>
        <option value="popular">ยอดนิยม</option>
        <option value="rating">คะแนนสูง</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Strategies Grid -->
    <div v-else class="strategies-grid">
      <div v-for="strategy in filteredStrategies" :key="strategy.id" class="strategy-card">
        <div class="card-header">
          <span class="category-badge" :class="strategy.category">
            {{ getCategoryIcon(strategy.category) }} {{ getCategoryName(strategy.category) }}
          </span>
          <div class="rating">
            <span class="stars">⭐ {{ strategy.rating || 0 }}</span>
          </div>
        </div>

        <h3 class="strategy-title">{{ strategy.title }}</h3>
        <p class="strategy-desc">{{ truncateText(strategy.description, 150) }}</p>

        <!-- Target Dimensions -->
        <div class="target-dims">
          <span class="dims-label">เหมาะกับ:</span>
          <div class="dims-tags">
            <span v-for="dim in strategy.targetDimensions" :key="dim" class="dim-tag" :class="dim">
              {{ getDimEmoji(dim) }}
            </span>
          </div>
        </div>

        <!-- Tags -->
        <div class="strategy-tags" v-if="strategy.tags?.length">
          <span v-for="tag in strategy.tags.slice(0, 4)" :key="tag" class="tag">#{{ tag }}</span>
        </div>

        <!-- Author & Stats -->
        <div class="card-footer">
          <div class="author-info">
            <img :src="strategy.authorPhoto || '/default-avatar.png'" class="author-avatar" />
            <span class="author-name">{{ strategy.authorName }}</span>
          </div>
          <div class="stats">
            <span>❤️ {{ strategy.likesCount || 0 }}</span>
            <span>👁️ {{ strategy.viewsCount || 0 }}</span>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn-view" @click="viewStrategy(strategy)">อ่านเพิ่ม</button>
          <button 
            :class="['btn-save', { active: strategy.isSaved }]"
            @click="toggleSave(strategy)"
          >
            {{ strategy.isSaved ? '🔖 บันทึกแล้ว' : '🔖 บันทึก' }}
          </button>
        </div>
      </div>

      <div v-if="filteredStrategies.length === 0" class="empty-state">
        <span class="empty-icon">🎯</span>
        <p>ไม่พบเทคนิคการสอน</p>
        <button @click="showNewModal = true">แชร์เทคนิคแรก</button>
      </div>
    </div>

    <!-- Strategy Detail Modal -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal-content detail-modal">
        <div class="modal-header">
          <div>
            <span class="category-badge" :class="selectedStrategy?.category">
              {{ getCategoryIcon(selectedStrategy?.category) }} {{ getCategoryName(selectedStrategy?.category) }}
            </span>
          </div>
          <button class="close-btn" @click="showDetailModal = false">×</button>
        </div>
        
        <div class="modal-body" v-if="selectedStrategy">
          <h2>{{ selectedStrategy.title }}</h2>

          <div class="detail-section">
            <h4>📝 รายละเอียด</h4>
            <div class="detail-content" v-html="formatContent(selectedStrategy.description)"></div>
          </div>

          <div class="detail-section" v-if="selectedStrategy.steps?.length">
            <h4>📋 ขั้นตอน</h4>
            <ol class="steps-list">
              <li v-for="(step, i) in selectedStrategy.steps" :key="i">{{ step }}</li>
            </ol>
          </div>

          <div class="detail-section" v-if="selectedStrategy.example">
            <h4>💡 ตัวอย่าง</h4>
            <div class="example-box">{{ selectedStrategy.example }}</div>
          </div>

          <div class="detail-section" v-if="selectedStrategy.tips?.length">
            <h4>✨ เคล็ดลับ</h4>
            <ul class="tips-list">
              <li v-for="(tip, i) in selectedStrategy.tips" :key="i">{{ tip }}</li>
            </ul>
          </div>

          <div class="detail-section">
            <h4>🎯 มิติที่เหมาะสม</h4>
            <div class="target-dims-detail">
              <div v-for="dim in selectedStrategy.targetDimensions" :key="dim" class="dim-detail" :class="dim">
                <span class="dim-emoji">{{ getDimEmoji(dim) }}</span>
                <span class="dim-name">{{ getDimName(dim) }}</span>
              </div>
            </div>
          </div>

          <!-- Resources -->
          <div class="detail-section" v-if="selectedStrategy.resources?.length">
            <h4>📎 แหล่งข้อมูลเพิ่มเติม</h4>
            <div class="resources-list">
              <a v-for="res in selectedStrategy.resources" :key="res.url" :href="res.url" target="_blank" class="resource-link">
                🔗 {{ res.title }}
              </a>
            </div>
          </div>

          <!-- Author -->
          <div class="detail-author">
            <img :src="selectedStrategy.authorPhoto || '/default-avatar.png'" class="author-avatar-lg" />
            <div class="author-details">
              <span class="author-name-lg">{{ selectedStrategy.authorName }}</span>
              <span class="author-school">{{ selectedStrategy.schoolName || 'โรงเรียน' }}</span>
              <span class="created-date">{{ formatDate(selectedStrategy.createdAt) }}</span>
            </div>
          </div>

          <!-- Rate -->
          <div class="rate-section">
            <span>ให้คะแนนเทคนิคนี้:</span>
            <div class="star-rating">
              <button v-for="star in 5" :key="star" @click="rateStrategy(star)" :class="{ active: userRating >= star }">
                ⭐
              </button>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button 
            :class="['btn-action', { active: selectedStrategy?.isSaved }]"
            @click="toggleSave(selectedStrategy)"
          >
            🔖 {{ selectedStrategy?.isSaved ? 'บันทึกแล้ว' : 'บันทึก' }}
          </button>
          <button class="btn-action" @click="shareStrategy(selectedStrategy)">
            📤 แชร์
          </button>
        </div>
      </div>
    </div>

    <!-- New Strategy Modal -->
    <div v-if="showNewModal" class="modal-overlay" @click.self="showNewModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>🎯 แชร์เทคนิคการสอน</h2>
          <button class="close-btn" @click="showNewModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>หมวดหมู่</label>
            <select v-model="form.category" required>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.icon }} {{ cat.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>ชื่อเทคนิค</label>
            <input v-model="form.title" type="text" placeholder="ชื่อเทคนิคที่จดจำง่าย" />
          </div>

          <div class="form-group">
            <label>รายละเอียด</label>
            <textarea v-model="form.description" rows="4" placeholder="อธิบายเทคนิคนี้..."></textarea>
          </div>

          <div class="form-group">
            <label>ขั้นตอน (แยกบรรทัดละขั้นตอน)</label>
            <textarea v-model="form.stepsText" rows="4" placeholder="1. ขั้นตอนแรก&#10;2. ขั้นตอนที่สอง&#10;3. ..."></textarea>
          </div>

          <div class="form-group">
            <label>ตัวอย่างการใช้งาน</label>
            <textarea v-model="form.example" rows="3" placeholder="ตัวอย่างในชั้นเรียนจริง..."></textarea>
          </div>

          <div class="form-group">
            <label>มิติ A.R.C.E. ที่เหมาะสม</label>
            <div class="dim-checkboxes">
              <label class="checkbox-item">
                <input type="checkbox" value="analysis" v-model="form.targetDimensions" />
                🔍 Analysis
              </label>
              <label class="checkbox-item">
                <input type="checkbox" value="reasoning" v-model="form.targetDimensions" />
                🧠 Reasoning
              </label>
              <label class="checkbox-item">
                <input type="checkbox" value="creativity" v-model="form.targetDimensions" />
                💡 Creativity
              </label>
              <label class="checkbox-item">
                <input type="checkbox" value="evidence" v-model="form.targetDimensions" />
                📊 Evidence
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>แท็ก (คั่นด้วย ,)</label>
            <input v-model="form.tags" type="text" placeholder="เช่น 5E, ถามตอบ, กลุ่ม" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showNewModal = false">ยกเลิก</button>
          <button class="btn-submit" @click="submitStrategy">แชร์เทคนิค</button>
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

// Categories
const categories = [
  { id: 'questioning', icon: '❓', name: 'เทคนิคตั้งคำถาม' },
  { id: 'discussion', icon: '💬', name: 'การอภิปราย' },
  { id: 'thinking', icon: '🧠', name: 'กระตุ้นความคิด' },
  { id: 'assessment', icon: '📊', name: 'การประเมิน' },
  { id: 'activity', icon: '🎮', name: 'กิจกรรม' },
  { id: 'technology', icon: '💻', name: 'เทคโนโลยี' }
]

// State
const loading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('')
const sortBy = ref('recent')

// Data
const strategies = ref([])

// Modals
const showDetailModal = ref(false)
const showNewModal = ref(false)
const selectedStrategy = ref(null)
const userRating = ref(0)

// Form
const form = reactive({
  category: 'questioning',
  title: '',
  description: '',
  stepsText: '',
  example: '',
  targetDimensions: [],
  tags: ''
})

// Computed
const filteredStrategies = computed(() => {
  let result = [...strategies.value]

  if (selectedCategory.value) {
    result = result.filter(s => s.category === selectedCategory.value)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(s =>
      s.title?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.tags?.some(t => t.toLowerCase().includes(q))
    )
  }

  // Sort
  switch (sortBy.value) {
    case 'popular':
      result.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
      break
    case 'rating':
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0))
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

const truncateText = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const formatContent = (text) => {
  if (!text) return ''
  return text.replace(/\n/g, '<br>')
}

const getCategoryCount = (catId) => {
  return strategies.value.filter(s => s.category === catId).length
}

const getCategoryName = (catId) => {
  return categories.find(c => c.id === catId)?.name || catId
}

const getCategoryIcon = (catId) => {
  return categories.find(c => c.id === catId)?.icon || '📌'
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
const viewStrategy = (strategy) => {
  selectedStrategy.value = strategy
  userRating.value = 0
  showDetailModal.value = true
  
  // Update view count
  updateDoc(doc(db, 'teachingStrategies', strategy.id), {
    viewsCount: increment(1)
  })
  strategy.viewsCount = (strategy.viewsCount || 0) + 1
}

const toggleSave = async (strategy) => {
  if (!strategy) return
  strategy.isSaved = !strategy.isSaved
}

const shareStrategy = (strategy) => {
  navigator.clipboard.writeText(`${window.location.origin}/teaching-strategy/${strategy.id}`)
  alert('คัดลอกลิงก์แล้ว!')
}

const rateStrategy = async (rating) => {
  if (!selectedStrategy.value) return
  userRating.value = rating

  // Simple rating update (in real app, would track per-user)
  await updateDoc(doc(db, 'teachingStrategies', selectedStrategy.value.id), {
    rating: rating,
    ratingsCount: increment(1)
  })
  selectedStrategy.value.rating = rating
}

const submitStrategy = async () => {
  if (!form.title.trim() || !form.description.trim()) {
    alert('กรุณากรอกข้อมูลให้ครบ')
    return
  }

  try {
    await addDoc(collection(db, 'teachingStrategies'), {
      category: form.category,
      title: form.title,
      description: form.description,
      steps: form.stepsText.split('\n').map(s => s.trim()).filter(s => s),
      example: form.example,
      targetDimensions: form.targetDimensions,
      tags: form.tags.split(',').map(t => t.trim()).filter(t => t),
      authorId: authStore.user.uid,
      authorName: authStore.user.displayName || 'ครู',
      authorPhoto: authStore.user.photoURL,
      likesCount: 0,
      viewsCount: 0,
      rating: 0,
      createdAt: serverTimestamp()
    })

    showNewModal.value = false
    resetForm()
    loadStrategies()
    alert('แชร์เทคนิคสำเร็จ!')
  } catch (error) {
    console.error('Error submitting strategy:', error)
    alert('เกิดข้อผิดพลาด')
  }
}

const resetForm = () => {
  form.category = 'questioning'
  form.title = ''
  form.description = ''
  form.stepsText = ''
  form.example = ''
  form.targetDimensions = []
  form.tags = ''
}

// Load Data
const loadStrategies = async () => {
  loading.value = true
  try {
    const strategiesQuery = query(
      collection(db, 'teachingStrategies'),
      orderBy('createdAt', 'desc'),
      limit(100)
    )
    const snapshot = await getDocs(strategiesQuery)
    strategies.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading strategies:', error)
  } finally {
    loading.value = false
  }
}

// Initialize
onMounted(() => {
  loadStrategies()
})
</script>

<style scoped>
.teaching-strategies {
  max-width: 1100px;
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

/* Categories */
.categories {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.cat-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 20px;
  background: var(--card-bg);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  min-width: 100px;
  transition: all 0.2s;
  box-shadow: 0 2px 8px var(--shadow);
  color: var(--text-primary);
}

.cat-btn:hover {
  transform: translateY(-2px);
}

.cat-btn.active {
  border-color: #667eea;
  background: var(--primary-light);
}

.cat-icon { font-size: 24px; margin-bottom: 6px; }
.cat-name { font-size: 12px; font-weight: 500; margin-bottom: 4px; }
.cat-count { font-size: 11px; color: var(--text-secondary); }

/* Search */
.search-section {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 15px;
  background: var(--input-bg);
  color: var(--text-primary);
}

.sort-select {
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 14px;
  background: var(--input-bg);
  color: var(--text-primary);
}

/* Strategies Grid */
.strategies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.strategy-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px var(--shadow);
  border: 1px solid var(--border-color);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.category-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.category-badge.questioning { background: #e3f2fd; color: #1976d2; }
.category-badge.discussion { background: #fce4ec; color: #c2185b; }
.category-badge.thinking { background: #f3e5f5; color: #7b1fa2; }
.category-badge.assessment { background: #e8f5e9; color: #2e7d32; }
.category-badge.activity { background: #fff8e1; color: #f57c00; }
.category-badge.technology { background: #e0f7fa; color: #00838f; }

.rating {
  font-size: 14px;
  color: #f5a623;
}

.strategy-title {
  margin: 0 0 10px 0;
  font-size: 17px;
  line-height: 1.4;
  color: var(--text-primary);
}

.strategy-desc {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.target-dims {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.dims-label { font-size: 12px; color: var(--text-secondary); }

.dims-tags {
  display: flex;
  gap: 6px;
}

.dim-tag {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 14px;
}

.dim-tag.analysis { background: #e3f2fd; }
.dim-tag.reasoning { background: #f3e5f5; }
.dim-tag.creativity { background: #fff8e1; }
.dim-tag.evidence { background: #e8f5e9; }

.strategy-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
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
  padding: 12px 0;
  border-top: 1px solid var(--border-color);
  margin-bottom: 12px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
}

.author-name { font-size: 13px; color: var(--text-primary); }

.stats {
  display: flex;
  gap: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}

.card-actions {
  display: flex;
  gap: 8px;
}

.btn-view {
  flex: 1;
  padding: 10px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}

.btn-save {
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
}

.btn-save.active {
  background: #fff8e1;
  color: #f57c00;
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

.detail-modal {
  max-width: 700px;
}

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

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

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
  margin: 0 0 20px 0;
  font-size: 22px;
  color: var(--text-primary);
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: var(--text-primary);
}

.detail-content {
  line-height: 1.7;
  font-size: 15px;
  color: var(--text-primary);
}

.steps-list {
  margin: 0;
  padding-left: 24px;
  color: var(--text-primary);
}

.steps-list li {
  margin-bottom: 10px;
  line-height: 1.5;
}

.example-box {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 10px;
  line-height: 1.6;
  font-style: italic;
  color: var(--text-primary);
}

.tips-list {
  margin: 0;
  padding-left: 20px;
}

.tips-list li {
  margin-bottom: 8px;
  color: #4caf50;
}

.target-dims-detail {
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

.resources-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resource-link {
  padding: 10px 14px;
  background: var(--bg-secondary);
  border-radius: 8px;
  color: #1976d2;
  text-decoration: none;
}

.detail-author {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  margin-bottom: 20px;
}

.author-avatar-lg {
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.author-details {
  flex: 1;
}

.author-name-lg {
  display: block;
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
}

.author-school, .created-date {
  font-size: 12px;
  color: var(--text-secondary);
  display: block;
}

.rate-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff8e1;
  border-radius: 12px;
}

.star-rating {
  display: flex;
  gap: 4px;
}

.star-rating button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  opacity: 0.3;
  transition: opacity 0.2s;
}

.star-rating button.active,
.star-rating button:hover {
  opacity: 1;
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
  background: #fff8e1;
  color: #f57c00;
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
  .categories { flex-wrap: wrap; }
  .cat-btn { flex: 1 1 calc(33% - 10px); min-width: auto; }
  .strategies-grid { grid-template-columns: 1fr; }
  .search-section { flex-direction: column; }
  .dim-checkboxes { grid-template-columns: 1fr; }
}
</style>
