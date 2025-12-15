<template>
  <div class="study-groups">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="$router.back()">← กลับ</button>
        <h1>👥 กลุ่มเรียน</h1>
      </div>
      <button class="create-btn" @click="showCreateModal = true">
        ➕ สร้างกลุ่มใหม่
      </button>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="ค้นหากลุ่ม..."
        />
      </div>
      <select v-model="filterSubject" class="filter-select">
        <option value="">ทุกรายวิชา</option>
        <option v-for="course in courses" :key="course.id" :value="course.id">
          {{ course.name }}
        </option>
      </select>
      <select v-model="filterType" class="filter-select">
        <option value="">ทุกประเภท</option>
        <option value="study">📚 กลุ่มติว</option>
        <option value="homework">📝 ทำการบ้าน</option>
        <option value="project">🎯 โปรเจค</option>
        <option value="exam">📋 เตรียมสอบ</option>
      </select>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button 
        :class="['tab', { active: activeTab === 'all' }]"
        @click="activeTab = 'all'"
      >
        🌐 ทั้งหมด ({{ allGroups.length }})
      </button>
      <button 
        :class="['tab', { active: activeTab === 'my' }]"
        @click="activeTab = 'my'"
      >
        ⭐ กลุ่มของฉัน ({{ myGroups.length }})
      </button>
      <button 
        :class="['tab', { active: activeTab === 'suggested' }]"
        @click="activeTab = 'suggested'"
      >
        💡 แนะนำ ({{ suggestedGroups.length }})
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Groups Grid -->
    <div v-else class="groups-grid">
      <!-- My Groups -->
      <template v-if="activeTab === 'my'">
        <div v-if="myGroups.length === 0" class="empty-state">
          <span class="empty-icon">👥</span>
          <p>ยังไม่ได้เข้าร่วมกลุ่มใดๆ</p>
          <button class="btn-primary" @click="activeTab = 'suggested'">
            ดูกลุ่มแนะนำ
          </button>
        </div>
        <div 
          v-for="group in filteredMyGroups" 
          :key="group.id" 
          class="group-card my-group"
          @click="openGroup(group.id)"
        >
          <div class="group-emoji">{{ group.emoji || '📚' }}</div>
          <div class="group-info">
            <h3 class="group-name">{{ group.name }}</h3>
            <p class="group-desc">{{ truncate(group.description, 80) }}</p>
            <div class="group-meta">
              <span class="meta-item">👥 {{ group.memberCount || 0 }} สมาชิก</span>
              <span class="meta-item">💬 {{ group.messageCount || 0 }} ข้อความ</span>
            </div>
            <div class="group-tags">
              <span v-if="group.courseName" class="tag course">{{ group.courseName }}</span>
              <span class="tag type">{{ getTypeLabel(group.type) }}</span>
            </div>
          </div>
          <div v-if="group.unreadCount" class="unread-badge">{{ group.unreadCount }}</div>
        </div>
      </template>

      <!-- Suggested Groups -->
      <template v-else-if="activeTab === 'suggested'">
        <div v-if="suggestedGroups.length === 0" class="empty-state">
          <span class="empty-icon">💡</span>
          <p>ไม่มีกลุ่มแนะนำในตอนนี้</p>
        </div>
        <div 
          v-for="group in filteredSuggestedGroups" 
          :key="group.id" 
          class="group-card suggested"
        >
          <div class="suggested-badge">💡 แนะนำเพราะ: {{ group.reason }}</div>
          <div class="group-emoji">{{ group.emoji || '📚' }}</div>
          <div class="group-info">
            <h3 class="group-name">{{ group.name }}</h3>
            <p class="group-desc">{{ truncate(group.description, 80) }}</p>
            <div class="group-meta">
              <span class="meta-item">👥 {{ group.memberCount || 0 }} สมาชิก</span>
              <span v-if="group.loTags?.length" class="meta-item">
                🎯 {{ group.loTags.slice(0, 2).join(', ') }}
              </span>
            </div>
            <div class="group-tags">
              <span v-if="group.courseName" class="tag course">{{ group.courseName }}</span>
              <span class="tag type">{{ getTypeLabel(group.type) }}</span>
            </div>
          </div>
          <div class="group-actions">
            <button class="btn-join" @click.stop="joinGroup(group)">
              เข้าร่วม
            </button>
            <button class="btn-view" @click.stop="openGroup(group.id)">
              ดูรายละเอียด
            </button>
          </div>
        </div>
      </template>

      <!-- All Groups -->
      <template v-else>
        <div v-if="allGroups.length === 0" class="empty-state">
          <span class="empty-icon">🌐</span>
          <p>ยังไม่มีกลุ่มในระบบ</p>
          <button class="btn-primary" @click="showCreateModal = true">
            สร้างกลุ่มแรก
          </button>
        </div>
        <div 
          v-for="group in filteredAllGroups" 
          :key="group.id" 
          class="group-card"
          :class="{ joined: isJoined(group.id) }"
        >
          <div class="group-emoji">{{ group.emoji || '📚' }}</div>
          <div class="group-info">
            <h3 class="group-name">{{ group.name }}</h3>
            <p class="group-desc">{{ truncate(group.description, 80) }}</p>
            <div class="group-meta">
              <span class="meta-item">👥 {{ group.memberCount || 0 }} สมาชิก</span>
              <span class="meta-item">📅 {{ formatDate(group.createdAt) }}</span>
            </div>
            <div class="group-tags">
              <span v-if="group.courseName" class="tag course">{{ group.courseName }}</span>
              <span class="tag type">{{ getTypeLabel(group.type) }}</span>
              <span v-if="group.isPrivate" class="tag private">🔒 ส่วนตัว</span>
            </div>
          </div>
          <div class="group-actions">
            <template v-if="isJoined(group.id)">
              <span class="joined-label">✅ เข้าร่วมแล้ว</span>
              <button class="btn-view" @click.stop="openGroup(group.id)">
                เข้ากลุ่ม
              </button>
            </template>
            <template v-else>
              <button class="btn-join" @click.stop="joinGroup(group)">
                เข้าร่วม
              </button>
              <button class="btn-view" @click.stop="openGroup(group.id)">
                ดูรายละเอียด
              </button>
            </template>
          </div>
        </div>
      </template>
    </div>

    <!-- Create Group Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>➕ สร้างกลุ่มเรียนใหม่</h2>
          <button class="close-btn" @click="showCreateModal = false">×</button>
        </div>
        <form @submit.prevent="createGroup" class="modal-form">
          <div class="emoji-picker">
            <label>เลือกไอคอน</label>
            <div class="emoji-grid">
              <button 
                v-for="emoji in emojis" 
                :key="emoji"
                type="button"
                :class="['emoji-btn', { selected: newGroup.emoji === emoji }]"
                @click="newGroup.emoji = emoji"
              >
                {{ emoji }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>ชื่อกลุ่ม *</label>
            <input 
              v-model="newGroup.name" 
              type="text" 
              placeholder="เช่น กลุ่มติวคณิตศาสตร์ ม.4"
              required
            />
          </div>

          <div class="form-group">
            <label>รายละเอียด</label>
            <textarea 
              v-model="newGroup.description" 
              rows="3"
              placeholder="อธิบายว่ากลุ่มนี้เกี่ยวกับอะไร..."
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group half">
              <label>ประเภท</label>
              <select v-model="newGroup.type">
                <option value="study">📚 กลุ่มติว</option>
                <option value="homework">📝 ทำการบ้าน</option>
                <option value="project">🎯 โปรเจค</option>
                <option value="exam">📋 เตรียมสอบ</option>
                <option value="general">💬 ทั่วไป</option>
              </select>
            </div>
            <div class="form-group half">
              <label>รายวิชา <span class="required">*</span></label>
              <select v-model="newGroup.courseId" required @change="onCourseChange">
                <option value="" disabled>-- เลือกรายวิชา --</option>
                <option v-for="course in courses" :key="course.id" :value="course.id">
                  {{ course.name }}
                </option>
              </select>
              <p v-if="!newGroup.courseId" class="field-hint">⚠️ กรุณาเลือกรายวิชาก่อน</p>
            </div>
          </div>

          <div class="form-group">
            <label>LO ที่เกี่ยวข้อง</label>
            <div v-if="!newGroup.courseId" class="lo-disabled">
              <p>🔒 เลือกรายวิชาก่อนจึงจะเลือก LO ได้</p>
            </div>
            <div v-else class="lo-chips">
              <span 
                v-for="lo in selectedLOs" 
                :key="lo" 
                class="lo-chip"
              >
                {{ lo }}
                <button type="button" @click="removeLO(lo)">×</button>
              </span>
              <select v-model="selectedLO" @change="addLO" class="lo-select">
                <option value="">+ เพิ่ม LO</option>
                <option v-for="lo in courseLOs" :key="lo.code" :value="lo.code">
                  {{ lo.code }} - {{ truncate(lo.name, 30) }}
                </option>
              </select>
              <p v-if="courseLOs.length === 0" class="field-hint">
                ℹ️ รายวิชานี้ยังไม่มี LO
              </p>
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="newGroup.isPrivate" />
              🔒 กลุ่มส่วนตัว (ต้องได้รับอนุมัติจึงเข้าร่วมได้)
            </label>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showCreateModal = false">
              ยกเลิก
            </button>
            <button type="submit" class="btn-primary" :disabled="creating">
              {{ creating ? 'กำลังสร้าง...' : 'สร้างกลุ่ม' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  collection, query, where, orderBy, limit, 
  getDocs, addDoc, updateDoc, doc, arrayUnion, increment, serverTimestamp 
} from 'firebase/firestore'
import { db } from '@/firebase/config'

const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(true)
const activeTab = ref('all')
const searchQuery = ref('')
const filterSubject = ref('')
const filterType = ref('')
const showCreateModal = ref(false)
const creating = ref(false)

// Data
const allGroups = ref([])
const myGroups = ref([])
const suggestedGroups = ref([])
const courses = ref([])
const availableLOs = ref([])
const courseLOs = computed(() => {
  if (!newGroup.courseId) return []
  const course = courses.value.find(c => c.id === newGroup.courseId)
  if (!course?.learningOutcomes) return []
  return course.learningOutcomes.map(lo => ({
    code: lo.code || lo,
    name: lo.name || lo.description || lo
  }))
})
const selectedLO = ref('')
const selectedLOs = ref([])

// Emojis for group icons
const emojis = ['📚', '📖', '✏️', '🎯', '💡', '🧮', '🔬', '🌍', '🎨', '🎵', '💻', '🏃', '🧪', '📐', '🌱', '🔢']

// New group form
const newGroup = reactive({
  name: '',
  description: '',
  type: 'study',
  courseId: '',
  emoji: '📚',
  isPrivate: false
})

// Computed
const filteredAllGroups = computed(() => {
  return filterGroups(allGroups.value)
})

const filteredMyGroups = computed(() => {
  return filterGroups(myGroups.value)
})

const filteredSuggestedGroups = computed(() => {
  return filterGroups(suggestedGroups.value)
})

// Methods
const filterGroups = (groups) => {
  let result = groups

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(g => 
      g.name.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q)
    )
  }

  if (filterSubject.value) {
    result = result.filter(g => g.courseId === filterSubject.value)
  }

  if (filterType.value) {
    result = result.filter(g => g.type === filterType.value)
  }

  return result
}

const truncate = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

const getTypeLabel = (type) => {
  const labels = {
    study: '📚 กลุ่มติว',
    homework: '📝 การบ้าน',
    project: '🎯 โปรเจค',
    exam: '📋 สอบ',
    general: '💬 ทั่วไป'
  }
  return labels[type] || '📚 กลุ่มติว'
}

const isJoined = (groupId) => {
  return myGroups.value.some(g => g.id === groupId)
}

const openGroup = (groupId) => {
  router.push(`/community/study-groups/${groupId}`)
}

const joinGroup = async (group) => {
  if (!authStore.user?.uid) return
  
  try {
    const groupRef = doc(db, 'communities', group.id)
    
    if (group.isPrivate) {
      // Request to join
      await addDoc(collection(db, 'communities', group.id, 'joinRequests'), {
        userId: authStore.user.uid,
        userName: authStore.user.displayName || 'นักเรียน',
        userPhoto: authStore.user.photoURL || null,
        status: 'pending',
        createdAt: serverTimestamp()
      })
      alert('ส่งคำขอเข้าร่วมแล้ว! รอการอนุมัติจากผู้ดูแลกลุ่ม')
    } else {
      // Direct join
      await updateDoc(groupRef, {
        memberIds: arrayUnion(authStore.user.uid),
        memberCount: increment(1)
      })

      // Add member record
      await addDoc(collection(db, 'communities', group.id, 'members'), {
        odId: authStore.user.uid,
        displayName: authStore.user.displayName || 'นักเรียน',
        photoURL: authStore.user.photoURL || null,
        role: 'member',
        joinedAt: serverTimestamp()
      })

      // Refresh groups
      myGroups.value.push({ ...group, memberCount: (group.memberCount || 0) + 1 })
      alert('เข้าร่วมกลุ่มสำเร็จ!')
    }
  } catch (error) {
    console.error('Error joining group:', error)
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
  }
}

const onCourseChange = () => {
  // Clear selected LOs when course changes
  selectedLOs.value = []
  selectedLO.value = ''
}

const addLO = () => {
  if (selectedLO.value && !selectedLOs.value.includes(selectedLO.value)) {
    selectedLOs.value.push(selectedLO.value)
  }
  selectedLO.value = ''
}

const removeLO = (lo) => {
  selectedLOs.value = selectedLOs.value.filter(l => l !== lo)
}

const createGroup = async () => {
  if (!newGroup.name.trim()) {
    alert('กรุณาใส่ชื่อกลุ่ม')
    return
  }
  if (!newGroup.courseId) {
    alert('กรุณาเลือกรายวิชา')
    return
  }
  
  creating.value = true
  try {
    const selectedCourse = courses.value.find(c => c.id === newGroup.courseId)
    const docRef = await addDoc(collection(db, 'communities'), {
      name: newGroup.name.trim(),
      description: newGroup.description.trim(),
      type: newGroup.type,
      courseId: newGroup.courseId,
      courseName: selectedCourse?.name || null,
      emoji: newGroup.emoji,
      isPrivate: newGroup.isPrivate,
      loTags: selectedLOs.value,
      creatorId: authStore.user.uid,
      creatorName: authStore.user.displayName || 'นักเรียน',
      moderatorIds: [authStore.user.uid],
      memberIds: [authStore.user.uid],
      memberCount: 1,
      messageCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    // Add creator as member
    await addDoc(collection(db, 'communities', docRef.id, 'members'), {
      odId: authStore.user.uid,
      displayName: authStore.user.displayName || 'นักเรียน',
      photoURL: authStore.user.photoURL || null,
      role: 'admin',
      joinedAt: serverTimestamp()
    })

    // Reset form
    showCreateModal.value = false
    newGroup.name = ''
    newGroup.description = ''
    newGroup.type = 'study'
    newGroup.courseId = ''
    newGroup.emoji = '📚'
    newGroup.isPrivate = false
    selectedLOs.value = []

    // Refresh and go to group
    router.push(`/community/study-groups/${docRef.id}`)
  } catch (error) {
    console.error('Error creating group:', error)
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
  } finally {
    creating.value = false
  }
}

// Load Data
const loadAllGroups = async () => {
  try {
    const groupsQuery = query(
      collection(db, 'communities'),
      where('type', 'in', ['study', 'homework', 'project', 'exam', 'general']),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    const snapshot = await getDocs(groupsQuery)
    allGroups.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading groups:', error)
  }
}

const loadMyGroups = async () => {
  if (!authStore.user?.uid) return
  try {
    const groupsQuery = query(
      collection(db, 'communities'),
      where('memberIds', 'array-contains', authStore.user.uid),
      limit(20)
    )
    const snapshot = await getDocs(groupsQuery)
    myGroups.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading my groups:', error)
  }
}

const loadSuggestedGroups = async () => {
  if (!authStore.user?.uid) return
  try {
    // Get student's weak LOs first
    const progressQuery = query(
      collection(db, 'studentProgress'),
      where('studentId', '==', authStore.user.uid)
    )
    const progressSnap = await getDocs(progressQuery)
    
    const weakLOs = []
    progressSnap.docs.forEach(doc => {
      const data = doc.data()
      if (data.loProgress) {
        Object.entries(data.loProgress).forEach(([code, progress]) => {
          if (progress < 60) weakLOs.push(code)
        })
      }
    })

    // Find groups matching weak LOs
    if (weakLOs.length > 0) {
      const groupsQuery = query(
        collection(db, 'communities'),
        limit(50)
      )
      const snapshot = await getDocs(groupsQuery)
      
      const myGroupIds = myGroups.value.map(g => g.id)
      const suggestions = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(g => !myGroupIds.includes(g.id))
        .filter(g => g.loTags?.some(lo => weakLOs.includes(lo)))
        .map(g => ({
          ...g,
          reason: `เกี่ยวข้องกับ LO ที่คุณต้องพัฒนา`
        }))
        .slice(0, 10)
      
      suggestedGroups.value = suggestions
    }
  } catch (error) {
    console.error('Error loading suggested groups:', error)
  }
}

const loadCourses = async () => {
  try {
    console.log('Loading courses...')
    
    // Simple query - get all courses (rules allow read for all signed-in users)
    const coursesQuery = query(collection(db, 'courses'), limit(50))
    const snapshot = await getDocs(coursesQuery)
    
    courses.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    console.log('Courses loaded:', courses.value.length, courses.value.map(c => c.name))

    // Extract LOs from all courses
    const los = []
    courses.value.forEach(course => {
      if (course.learningOutcomes) {
        course.learningOutcomes.forEach(lo => {
          los.push({
            code: lo.code || lo,
            name: lo.name || lo.description || lo
          })
        })
      }
    })
    availableLOs.value = los
  } catch (error) {
    console.error('Error loading courses:', error)
    // Show error to user
    alert('ไม่สามารถโหลดรายวิชาได้: ' + error.message)
  }
}

// Initialize
onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      loadAllGroups(),
      loadMyGroups(),
      loadCourses()
    ])
    await loadSuggestedGroups()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.study-groups {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background: var(--bg-primary);
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
  font-size: 14px;
  color: var(--text-primary);
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
}

.create-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.create-btn:hover {
  transform: translateY(-2px);
}

/* Filters */
.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 200px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.search-box input {
  width: 100%;
  padding: 12px 12px 12px 40px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 14px;
  box-sizing: border-box;
  background: var(--input-bg);
  color: var(--text-primary);
}

.filter-select {
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 14px;
  background: var(--card-bg);
  min-width: 150px;
  color: var(--text-primary);
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: var(--card-bg);
  padding: 8px;
  border-radius: 12px;
  box-shadow: var(--shadow);
}

.tab {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* Groups Grid */
.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.group-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow);
  transition: all 0.2s;
  cursor: pointer;
  position: relative;
}

.group-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}

.group-card.my-group {
  border-left: 4px solid #667eea;
}

.group-card.joined {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.group-card.suggested {
  border: 2px dashed #667eea;
}

.suggested-badge {
  position: absolute;
  top: -10px;
  left: 20px;
  background: #667eea;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
}

.group-emoji {
  font-size: 48px;
  margin-bottom: 12px;
}

.group-info {
  flex: 1;
}

.group-name {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: var(--text-primary);
}

.group-desc {
  margin: 0 0 12px 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.group-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.group-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
}

.tag.course {
  background: #e3f2fd;
  color: #1976d2;
}

.tag.type {
  background: #f3e5f5;
  color: #7b1fa2;
}

.tag.private {
  background: #fff3e0;
  color: #e65100;
}

.group-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.btn-join {
  flex: 1;
  padding: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-view {
  padding: 10px 16px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.joined-label {
  color: #4caf50;
  font-size: 13px;
  font-weight: 500;
}

.unread-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: #f44336;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-tertiary);
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-primary);
}

.modal-form {
  padding: 20px;
}

/* Emoji Picker */
.emoji-picker {
  margin-bottom: 16px;
}

.emoji-picker label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}

.emoji-btn {
  width: 40px;
  height: 40px;
  border: 2px solid transparent;
  background: var(--bg-tertiary);
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.emoji-btn:hover {
  background: var(--border-color);
}

.emoji-btn.selected {
  border-color: #667eea;
  background: #e8eaf6;
}

/* Form */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  background: var(--input-bg);
  color: var(--text-primary);
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-group.half {
  flex: 1;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input {
  width: auto;
}

/* LO Chips */
.lo-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.lo-disabled {
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  text-align: center;
}

.lo-disabled p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.lo-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #e8eaf6;
  border-radius: 16px;
  font-size: 13px;
  color: #667eea;
}

.lo-chip button {
  width: 18px;
  height: 18px;
  border: none;
  background: #667eea;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}

.lo-select {
  padding: 6px 12px;
  border: 1px dashed #667eea;
  border-radius: 16px;
  background: transparent;
  color: #667eea;
  font-size: 13px;
}

/* Required & Hints */
.required {
  color: #ef5350;
}

.field-hint {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

/* Form Actions */
.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-primary {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 12px 24px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* Empty & Loading States */
.empty-state, .loading-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--bg-tertiary);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-left {
    justify-content: space-between;
  }

  .filters-bar {
    flex-direction: column;
  }

  .filter-select {
    width: 100%;
  }

  .groups-grid {
    grid-template-columns: 1fr;
  }

  .emoji-grid {
    grid-template-columns: repeat(6, 1fr);
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }
}

</style>