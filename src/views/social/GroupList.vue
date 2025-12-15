<template>
  <div class="group-list">
    <!-- Header -->
    <div class="page-header">
      <h1>👥 กลุ่มเรียนรู้</h1>
      <button class="btn-create" @click="showCreateModal = true">
        ➕ สร้างกลุ่ม
      </button>
    </div>

    <!-- Tabs -->
    <div class="group-tabs">
      <button 
        :class="['tab-btn', { active: activeTab === 'my' }]"
        @click="activeTab = 'my'"
      >
        ⭐ กลุ่มของฉัน
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'discover' }]"
        @click="activeTab = 'discover'"
      >
        🔍 ค้นพบ
      </button>
    </div>

    <!-- Loading -->
    <LoadingSpinner v-if="loading" />

    <!-- Empty State -->
    <EmptyState 
      v-else-if="filteredGroups.length === 0"
      icon="👥"
      title="ยังไม่มีกลุ่ม"
      :description="activeTab === 'my' ? 'คุณยังไม่ได้เข้าร่วมกลุ่มใดๆ' : 'ไม่พบกลุ่มที่น่าสนใจ'"
      actionText="➕ สร้างกลุ่มใหม่"
      @action="showCreateModal = true"
    />

    <!-- Groups Grid -->
    <div class="groups-grid" v-else>
      <div 
        v-for="group in filteredGroups"
        :key="group.id"
        class="group-card"
        @click="goToGroup(group.id)"
      >
        <div class="group-icon">{{ group.icon || '📚' }}</div>
        <div class="group-info">
          <h3>{{ group.name }}</h3>
          <p class="group-desc">{{ group.description }}</p>
          <div class="group-meta">
            <span>👥 {{ group.memberCount || 0 }} สมาชิก</span>
            <span>📝 {{ group.postCount || 0 }} โพสต์</span>
          </div>
        </div>
        <div class="group-tags">
          <span v-for="tag in (group.tags || []).slice(0, 3)" :key="tag" class="tag">
            {{ tag }}
          </span>
        </div>
        <button 
          v-if="!isMember(group)"
          class="btn-join"
          @click.stop="joinGroup(group.id)"
        >
          ➕ เข้าร่วม
        </button>
        <span v-else class="member-badge">✓ สมาชิก</span>
      </div>
    </div>

    <!-- Create Group Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
        <div class="modal">
          <div class="modal-header">
            <h2>➕ สร้างกลุ่มใหม่</h2>
            <button class="close-btn" @click="closeCreateModal">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>ชื่อกลุ่ม *</label>
              <input 
                type="text" 
                v-model="newGroup.name"
                placeholder="เช่น: เรียนคณิตศาสตร์ ม.4"
              >
            </div>

            <div class="form-group">
              <label>คำอธิบาย</label>
              <textarea 
                v-model="newGroup.description"
                placeholder="อธิบายเกี่ยวกับกลุ่ม..."
                rows="3"
              ></textarea>
            </div>

            <div class="form-group">
              <label>ไอคอน</label>
              <div class="icon-picker">
                <button 
                  v-for="icon in icons"
                  :key="icon"
                  :class="['icon-btn', { active: newGroup.icon === icon }]"
                  @click="newGroup.icon = icon"
                >
                  {{ icon }}
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>ประเภท</label>
              <select v-model="newGroup.type">
                <option value="public">🌐 สาธารณะ</option>
                <option value="private">🔒 ส่วนตัว</option>
              </select>
            </div>

            <div class="form-group">
              <label>แท็ก (คั่นด้วยคอมม่า)</label>
              <input 
                type="text" 
                v-model="newGroup.tags"
                placeholder="เช่น: คณิตศาสตร์, ม.4, สอบเข้า"
              >
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="closeCreateModal">ยกเลิก</button>
            <button 
              class="btn-primary"
              @click="createGroup"
              :disabled="!newGroup.name || creating"
            >
              {{ creating ? 'กำลังสร้าง...' : '✓ สร้างกลุ่ม' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, getDocs, addDoc, updateDoc, doc, arrayUnion, serverTimestamp, increment } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import EmptyState from '@/components/EmptyState.vue'

const authStore = useAuthStore()
const router = useRouter()

// State
const loading = ref(true)
const groups = ref([])
const activeTab = ref('my')

// Modal
const showCreateModal = ref(false)
const creating = ref(false)
const newGroup = ref({
  name: '',
  description: '',
  icon: '📚',
  type: 'public',
  tags: ''
})

const icons = ['📚', '💡', '🧪', '🎨', '🎵', '🏃', '💻', '🔬', '🌍', '✏️', '📐', '🧮']

// Computed
const filteredGroups = computed(() => {
  if (activeTab.value === 'my') {
    return groups.value.filter(g => g.memberIds?.includes(authStore.user.uid))
  }
  return groups.value.filter(g => !g.memberIds?.includes(authStore.user.uid))
})

// Methods
function isMember(group) {
  return group.memberIds?.includes(authStore.user.uid)
}

async function loadGroups() {
  loading.value = true
  try {
    const groupsQuery = query(
      collection(db, 'groups'),
      where('type', '==', 'public')
    )
    const snapshot = await getDocs(groupsQuery)
    groups.value = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    
    // Also load private groups user is member of
    const myPrivateQuery = query(
      collection(db, 'groups'),
      where('memberIds', 'array-contains', authStore.user.uid)
    )
    const myPrivateSnapshot = await getDocs(myPrivateQuery)
    const myPrivate = myPrivateSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    
    // Merge without duplicates
    const allIds = new Set(groups.value.map(g => g.id))
    myPrivate.forEach(g => {
      if (!allIds.has(g.id)) {
        groups.value.push(g)
      }
    })
  } catch (error) {
    console.error('Error loading groups:', error)
  } finally {
    loading.value = false
  }
}

function closeCreateModal() {
  showCreateModal.value = false
  newGroup.value = {
    name: '',
    description: '',
    icon: '📚',
    type: 'public',
    tags: ''
  }
}

async function createGroup() {
  if (!newGroup.value.name || creating.value) return
  
  creating.value = true
  try {
    const docRef = await addDoc(collection(db, 'groups'), {
      name: newGroup.value.name,
      description: newGroup.value.description,
      icon: newGroup.value.icon,
      type: newGroup.value.type,
      tags: newGroup.value.tags.split(',').map(t => t.trim()).filter(Boolean),
      createdBy: authStore.user.uid,
      createdByName: authStore.user.displayName,
      memberIds: [authStore.user.uid],
      memberCount: 1,
      postCount: 0,
      createdAt: serverTimestamp()
    })
    
    closeCreateModal()
    router.push(`/groups/${docRef.id}`)
  } catch (error) {
    console.error('Error creating group:', error)
    alert('เกิดข้อผิดพลาด')
  } finally {
    creating.value = false
  }
}

async function joinGroup(groupId) {
  try {
    await updateDoc(doc(db, 'groups', groupId), {
      memberIds: arrayUnion(authStore.user.uid),
      memberCount: increment(1)
    })
    
    // Update local state
    const group = groups.value.find(g => g.id === groupId)
    if (group) {
      group.memberIds = [...(group.memberIds || []), authStore.user.uid]
      group.memberCount = (group.memberCount || 0) + 1
    }
  } catch (error) {
    console.error('Error joining group:', error)
    alert('เกิดข้อผิดพลาด')
  }
}

function goToGroup(groupId) {
  router.push(`/groups/${groupId}`)
}

onMounted(loadGroups)
</script>

<style scoped>
.group-list {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 1.5rem;
}

.btn-create {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* Tabs */
.group-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.tab-btn {
  padding: 10px 20px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  cursor: pointer;
}

.tab-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* Groups Grid */
.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.group-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  border: 1px solid var(--border-color);
  transition: transform 0.2s, box-shadow 0.2s;
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.group-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.group-info h3 {
  margin-bottom: 8px;
}

.group-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.group-meta {
  display: flex;
  gap: 16px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.group-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.tag {
  padding: 4px 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 0.8rem;
}

.btn-join {
  width: 100%;
  padding: 10px;
  background: var(--primary-light);
  color: var(--primary-color);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.member-badge {
  display: block;
  text-align: center;
  padding: 10px;
  background: #d1fae5;
  color: #059669;
  border-radius: 8px;
  font-weight: 600;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: var(--card-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
}

.icon-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.icon-btn {
  width: 40px;
  height: 40px;
  font-size: 1.2rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  cursor: pointer;
}

.icon-btn.active {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

.btn-primary {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.5;
}

.btn-secondary {
  padding: 10px 20px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
}
</style>
