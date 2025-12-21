<template>
  <div class="achievement-sharing">
    <!-- Header -->
    <div class="page-header">
      <h1>🏆 Achievement Sharing</h1>
      <p class="subtitle">แบ่งปันความสำเร็จและฉลองร่วมกับเพื่อนๆ</p>
    </div>

    <!-- Quick Share -->
    <div class="quick-share-section" v-if="recentAchievements.length">
      <h2>⚡ ความสำเร็จล่าสุดของคุณ</h2>
      <p class="section-hint">เลือกความสำเร็จที่ต้องการแชร์</p>
      
      <div class="achievements-to-share">
        <div 
          v-for="achievement in recentAchievements"
          :key="achievement.id"
          class="shareable-achievement"
          :class="{ selected: selectedToShare?.id === achievement.id }"
          @click="selectAchievement(achievement)"
        >
          <div class="achievement-badge" :class="achievement.rarity">
            <span class="badge-icon">{{ achievement.icon }}</span>
          </div>
          <div class="achievement-info">
            <span class="achievement-name">{{ achievement.name }}</span>
            <span class="achievement-date">{{ formatDate(achievement.earnedAt) }}</span>
          </div>
          <div v-if="!achievement.shared" class="new-tag">ใหม่!</div>
          <div v-if="selectedToShare?.id === achievement.id" class="selected-indicator">✓</div>
        </div>
      </div>

      <!-- Share Form -->
      <div v-if="selectedToShare" class="share-form">
        <textarea 
          v-model="shareMessage"
          placeholder="เขียนข้อความแบ่งปันความรู้สึก..."
          class="share-textarea"
        ></textarea>
        
        <div class="share-options">
          <label class="option">
            <input type="checkbox" v-model="shareOptions.includeStats">
            แสดงสถิติการเรียน
          </label>
          <label class="option">
            <input type="checkbox" v-model="shareOptions.includeTips">
            แชร์เคล็ดลับ
          </label>
        </div>
        
        <div class="share-actions">
          <button class="cancel-btn" @click="selectedToShare = null">ยกเลิก</button>
          <button class="share-btn" @click="shareAchievement">
            🎉 แชร์ความสำเร็จ
          </button>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button 
        :class="['tab', { active: activeTab === 'feed' }]"
        @click="activeTab = 'feed'"
      >
        🌟 ฟีด
      </button>
      <button 
        :class="['tab', { active: activeTab === 'trending' }]"
        @click="activeTab = 'trending'"
      >
        🔥 ยอดนิยม
      </button>
      <button 
        :class="['tab', { active: activeTab === 'friends' }]"
        @click="activeTab = 'friends'"
      >
        👥 เพื่อน
      </button>
      <button 
        :class="['tab', { active: activeTab === 'mine' }]"
        @click="activeTab = 'mine'"
      >
        🎖️ ของฉัน
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Feed -->
    <div v-else class="achievement-feed">
      <div v-if="sharedAchievements.length === 0" class="empty-state">
        <span class="empty-icon">🏅</span>
        <h3>ยังไม่มีความสำเร็จที่แชร์</h3>
        <p>เป็นคนแรกที่แชร์ความสำเร็จ!</p>
      </div>

      <div 
        v-else
        v-for="shared in sharedAchievements"
        :key="shared.id"
        class="shared-card"
      >
        <!-- Card Header -->
        <div class="card-header">
          <img :src="shared.userPhoto || '/default-avatar.png'" class="user-avatar" alt="avatar">
          <div class="user-info">
            <span class="user-name">{{ shared.userName }}</span>
            <span class="share-time">{{ formatTime(shared.sharedAt) }}</span>
          </div>
          <button 
            class="follow-btn" 
            v-if="shared.userId !== currentUserId"
            :class="{ following: followingIds.includes(shared.userId) }"
            @click="toggleFollow(shared)"
            :disabled="followLoading[shared.userId]"
          >
            {{ followingIds.includes(shared.userId) ? '✓ ติดตามแล้ว' : '+ ติดตาม' }}
          </button>
        </div>

        <!-- Achievement Display -->
        <div class="achievement-display" :class="shared.achievement.rarity">
          <div class="display-background">
            <div class="confetti-effect"></div>
          </div>
          <div class="display-content">
            <div class="big-badge">
              <span class="badge-icon">{{ shared.achievement.icon }}</span>
            </div>
            <h3 class="achievement-title">{{ shared.achievement.name }}</h3>
            <p class="achievement-desc">{{ shared.achievement.description }}</p>
            
            <div v-if="shared.includeStats" class="stats-display">
              <div class="stat">
                <span class="stat-value">{{ shared.stats.streak }}</span>
                <span class="stat-label">🔥 Streak</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ shared.stats.totalPoints }}</span>
                <span class="stat-label">⭐ Points</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ shared.stats.rank }}</span>
                <span class="stat-label">🏆 Rank</span>
              </div>
            </div>
          </div>
        </div>

        <!-- User Message -->
        <p v-if="shared.message" class="share-message">{{ shared.message }}</p>

        <!-- Tips Section -->
        <div v-if="shared.tips" class="tips-section">
          <h4>💡 เคล็ดลับจากผู้สำเร็จ</h4>
          <p>{{ shared.tips }}</p>
        </div>

        <!-- Reactions -->
        <div class="reactions-bar">
          <div class="reaction-counts">
            <span 
              v-for="(count, emoji) in shared.reactionCounts"
              :key="emoji"
              class="reaction-count"
              v-if="count > 0"
            >
              {{ emoji }} {{ count }}
            </span>
          </div>
          <span class="comment-count" v-if="shared.commentCount > 0">
            💬 {{ shared.commentCount }} ความเห็น
          </span>
        </div>

        <!-- Action Bar -->
        <div class="action-bar">
          <div class="reaction-picker" v-if="showReactionPicker === shared.id">
            <button 
              v-for="reaction in reactions"
              :key="reaction"
              @click="addReaction(shared, reaction)"
              class="reaction-btn"
            >
              {{ reaction }}
            </button>
          </div>
          
          <button 
            class="action-btn"
            @click="toggleReactionPicker(shared.id)"
          >
            {{ shared.userReaction || '👏' }} ปรบมือ
          </button>
          <button class="action-btn" @click="openComments(shared)">
            💬 ความเห็น
          </button>
          <button class="action-btn" @click="shareExternal(shared)">
            🔗 แชร์
          </button>
        </div>

        <!-- Comments Preview -->
        <div v-if="shared.topComments?.length" class="comments-preview">
          <div 
            v-for="comment in shared.topComments.slice(0, 2)"
            :key="comment.id"
            class="preview-comment"
          >
            <img :src="comment.userPhoto || '/default-avatar.png'" class="comment-avatar" alt="avatar">
            <div class="comment-content">
              <span class="comment-author">{{ comment.userName }}</span>
              <span class="comment-text">{{ comment.text }}</span>
            </div>
          </div>
          <button 
            v-if="shared.commentCount > 2"
            class="view-all-comments"
            @click="openComments(shared)"
          >
            ดูความเห็นทั้งหมด ({{ shared.commentCount }})
          </button>
        </div>
      </div>
    </div>

    <!-- Comments Modal -->
    <div v-if="showComments" class="modal-overlay" @click.self="showComments = null">
      <div class="comments-modal">
        <div class="modal-header">
          <h3>💬 ความเห็น</h3>
          <button @click="showComments = null" class="close-btn">✕</button>
        </div>
        
        <div class="comments-list">
          <div 
            v-for="comment in comments"
            :key="comment.id"
            class="comment-item"
          >
            <img :src="comment.userPhoto || '/default-avatar.png'" class="comment-avatar" alt="avatar">
            <div class="comment-body">
              <div class="comment-header">
                <span class="comment-author">{{ comment.userName }}</span>
                <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
              </div>
              <p class="comment-text">{{ comment.text }}</p>
              <div class="comment-actions">
                <button @click="likeComment(comment)">
                  {{ comment.userLiked ? '❤️' : '🤍' }} {{ comment.likes || 0 }}
                </button>
                <button @click="replyTo(comment)">ตอบกลับ</button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="comment-input">
          <input 
            v-model="newComment"
            @keydown.enter="submitComment"
            placeholder="เขียนความเห็น..."
          >
          <button @click="submitComment" :disabled="!newComment.trim()">
            ส่ง
          </button>
        </div>
      </div>
    </div>

    <!-- Achievement Gallery (All Badges) -->
    <div v-if="activeTab === 'mine'" class="badge-gallery">
      <h2>🎖️ Badge Collection ของคุณ</h2>
      <div class="badges-grid">
        <div 
          v-for="badge in allBadges"
          :key="badge.id"
          :class="['badge-card', badge.rarity, { locked: !badge.earned }]"
          @click="badge.earned && selectAchievementFromGallery(badge)"
        >
          <div class="badge-image">
            <span v-if="badge.earned">{{ badge.icon }}</span>
            <span v-else class="locked-icon">🔒</span>
          </div>
          <span class="badge-name">{{ badge.name }}</span>
          <span class="badge-progress" v-if="!badge.earned">
            {{ badge.progress || 0 }}/{{ badge.requirement }}
          </span>
          <span v-if="badge.earned && !badge.shared" class="share-prompt">
            แชร์ได้!
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGamificationStore } from '@/stores/gamification'
import { collection, query, where, getDocs, addDoc, orderBy, limit, Timestamp, doc, updateDoc, increment, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'

const authStore = useAuthStore()
const gamificationStore = useGamificationStore()

// State
const loading = ref(true)
const activeTab = ref('feed')
const selectedToShare = ref(null)
const shareMessage = ref('')
const shareOptions = ref({
  includeStats: true,
  includeTips: false
})
const showReactionPicker = ref(null)
const showComments = ref(null)
const comments = ref([])
const newComment = ref('')

const recentAchievements = ref([])
const sharedAchievements = ref([])
const allBadges = ref([])
const followingIds = ref([])  // List of user IDs that current user follows
const followLoading = ref({})  // Track loading state per user

// Constants
const reactions = ['👏', '🎉', '🔥', '💪', '❤️', '🌟']

// Computed
const currentUserId = computed(() => authStore.user?.uid)

// Methods
function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate?.() || new Date(timestamp)
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate?.() || new Date(timestamp)
  const now = new Date()
  const diff = (now - date) / 1000
  
  if (diff < 60) return 'เมื่อกี้'
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชม. ที่แล้ว`
  if (diff < 604800) return `${Math.floor(diff / 86400)} วันที่แล้ว`
  
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function selectAchievement(achievement) {
  if (selectedToShare.value?.id === achievement.id) {
    selectedToShare.value = null
  } else {
    selectedToShare.value = achievement
    shareMessage.value = ''
  }
}

function selectAchievementFromGallery(badge) {
  selectedToShare.value = badge
  shareMessage.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function shareAchievement() {
  if (!selectedToShare.value) return
  
  try {
    await addDoc(collection(db, 'sharedAchievements'), {
      achievement: {
        id: selectedToShare.value.id,
        name: selectedToShare.value.name,
        icon: selectedToShare.value.icon,
        description: selectedToShare.value.description,
        rarity: selectedToShare.value.rarity
      },
      userId: currentUserId.value,
      userName: authStore.userProfile?.displayName,
      userPhoto: authStore.user?.photoURL,
      message: shareMessage.value,
      includeStats: shareOptions.value.includeStats,
      tips: shareOptions.value.includeTips ? shareMessage.value : null,
      stats: shareOptions.value.includeStats ? {
        streak: gamificationStore.currentStreak,
        totalPoints: gamificationStore.totalPoints,
        rank: gamificationStore.leaderboardRank || '-'
      } : null,
      reactionCounts: { '👏': 0, '🎉': 0, '🔥': 0, '💪': 0, '❤️': 0, '🌟': 0 },
      commentCount: 0,
      sharedAt: Timestamp.now()
    })
    
    // Mark as shared
    selectedToShare.value.shared = true
    selectedToShare.value = null
    shareMessage.value = ''
    
    await loadSharedAchievements()
  } catch (error) {
    console.error('Error sharing achievement:', error)
  }
}

function toggleReactionPicker(sharedId) {
  if (showReactionPicker.value === sharedId) {
    showReactionPicker.value = null
  } else {
    showReactionPicker.value = sharedId
  }
}

async function addReaction(shared, reaction) {
  try {
    const sharedRef = doc(db, 'sharedAchievements', shared.id)
    
    // Remove old reaction if exists
    if (shared.userReaction) {
      await updateDoc(sharedRef, {
        [`reactionCounts.${shared.userReaction}`]: increment(-1)
      })
    }
    
    // Add new reaction
    await updateDoc(sharedRef, {
      [`reactionCounts.${reaction}`]: increment(1)
    })
    
    // Update local state
    if (shared.userReaction) {
      shared.reactionCounts[shared.userReaction]--
    }
    shared.reactionCounts[reaction] = (shared.reactionCounts[reaction] || 0) + 1
    shared.userReaction = reaction
    
    showReactionPicker.value = null
  } catch (error) {
    console.error('Error adding reaction:', error)
  }
}

async function openComments(shared) {
  showComments.value = shared.id
  
  // Load comments
  const q = query(
    collection(db, 'sharedAchievements', shared.id, 'comments'),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  
  const snapshot = await getDocs(q)
  comments.value = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}

async function submitComment() {
  if (!newComment.value.trim() || !showComments.value) return
  
  try {
    await addDoc(collection(db, 'sharedAchievements', showComments.value, 'comments'), {
      text: newComment.value,
      userId: currentUserId.value,
      userName: authStore.userProfile?.displayName,
      userPhoto: authStore.user?.photoURL,
      likes: 0,
      createdAt: Timestamp.now()
    })
    
    // Update comment count
    const sharedRef = doc(db, 'sharedAchievements', showComments.value)
    await updateDoc(sharedRef, {
      commentCount: increment(1)
    })
    
    // Reload comments
    await openComments({ id: showComments.value })
    newComment.value = ''
  } catch (error) {
    console.error('Error submitting comment:', error)
  }
}

async function likeComment(comment) {
  // Toggle like
  comment.userLiked = !comment.userLiked
  comment.likes += comment.userLiked ? 1 : -1
}

function replyTo(comment) {
  newComment.value = `@${comment.userName} `
}

function shareExternal(shared) {
  const url = `${window.location.origin}/achievement/${shared.id}`
  navigator.clipboard.writeText(url)
  alert('คัดลอกลิงก์แล้ว!')
}

// Follow functions
async function loadFollowingIds() {
  if (!currentUserId.value) return
  
  try {
    const followQuery = query(
      collection(db, 'following'),
      where('followerId', '==', currentUserId.value)
    )
    const snapshot = await getDocs(followQuery)
    followingIds.value = snapshot.docs.map(d => d.data().followingId)
  } catch (error) {
    console.error('Error loading following:', error)
  }
}

async function toggleFollow(shared) {
  if (!currentUserId.value || followLoading.value[shared.userId]) return
  
  followLoading.value[shared.userId] = true
  try {
    const isFollowing = followingIds.value.includes(shared.userId)
    
    if (isFollowing) {
      // Unfollow
      const followQuery = query(
        collection(db, 'following'),
        where('followerId', '==', currentUserId.value),
        where('followingId', '==', shared.userId)
      )
      const snapshot = await getDocs(followQuery)
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'following', docSnap.id))
      }
      followingIds.value = followingIds.value.filter(id => id !== shared.userId)
    } else {
      // Follow
      await addDoc(collection(db, 'following'), {
        followerId: currentUserId.value,
        followerName: authStore.userProfile?.displayName || 'ผู้ใช้',
        followingId: shared.userId,
        followingName: shared.userName,
        createdAt: serverTimestamp()
      })
      followingIds.value.push(shared.userId)
    }
  } catch (error) {
    console.error('Error toggling follow:', error)
  } finally {
    followLoading.value[shared.userId] = false
  }
}

async function loadRecentAchievements() {
  // Load from gamification store
  const badges = gamificationStore.earnedBadges || []
  recentAchievements.value = badges
    .filter(b => b.earnedAt)
    .sort((a, b) => b.earnedAt - a.earnedAt)
    .slice(0, 5)
    .map(b => ({
      ...b,
      shared: false // Check if already shared
    }))
}

async function loadSharedAchievements() {
  try {
    let q
    
    if (activeTab.value === 'friends') {
      // TODO: Filter by friends
      q = query(
        collection(db, 'sharedAchievements'),
        orderBy('sharedAt', 'desc'),
        limit(20)
      )
    } else if (activeTab.value === 'trending') {
      q = query(
        collection(db, 'sharedAchievements'),
        orderBy('reactionCounts.👏', 'desc'),
        limit(20)
      )
    } else if (activeTab.value === 'mine') {
      q = query(
        collection(db, 'sharedAchievements'),
        where('userId', '==', currentUserId.value),
        orderBy('sharedAt', 'desc'),
        limit(20)
      )
    } else {
      q = query(
        collection(db, 'sharedAchievements'),
        orderBy('sharedAt', 'desc'),
        limit(20)
      )
    }
    
    const snapshot = await getDocs(q)
    sharedAchievements.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading shared achievements:', error)
  }
}

async function loadAllBadges() {
  // All available badges with progress
  allBadges.value = [
    { id: 'first-answer', name: 'คำตอบแรก', icon: '📝', rarity: 'common', earned: true, description: 'ส่งคำตอบครั้งแรก' },
    { id: 'streak-7', name: 'เรียน 7 วันติด', icon: '🔥', rarity: 'uncommon', earned: true, description: 'เข้าเรียนติดต่อกัน 7 วัน' },
    { id: 'streak-30', name: 'เรียน 30 วันติด', icon: '🏆', rarity: 'rare', earned: false, progress: 15, requirement: 30, description: 'เข้าเรียนติดต่อกัน 30 วัน' },
    { id: 'perfect-score', name: 'คะแนนเต็ม', icon: '⭐', rarity: 'rare', earned: true, description: 'ได้คะแนน HOTS 20/20' },
    { id: 'helper', name: 'ผู้ช่วยเหลือ', icon: '🤝', rarity: 'uncommon', earned: false, progress: 3, requirement: 10, description: 'ช่วยเพื่อน 10 ครั้ง' },
    { id: 'lo-master', name: 'LO Master', icon: '🎯', rarity: 'legendary', earned: false, progress: 8, requirement: 20, description: 'ผ่าน LO 20 ข้อ' },
    { id: 'early-bird', name: 'นกรู้', icon: '🐦', rarity: 'common', earned: true, description: 'เข้าเรียนก่อน 7 โมงเช้า' },
    { id: 'night-owl', name: 'นกฮูก', icon: '🦉', rarity: 'common', earned: false, progress: 2, requirement: 5, description: 'เรียนหลัง 3 ทุ่ม 5 ครั้ง' }
  ]
}

watch(activeTab, async () => {
  loading.value = true
  await loadSharedAchievements()
  loading.value = false
})

onMounted(async () => {
  await Promise.all([
    loadFollowingIds(),
    loadRecentAchievements(),
    loadSharedAchievements(),
    loadAllBadges()
  ])
  loading.value = false
})
</script>

<style scoped>
.achievement-sharing {
  padding: 1rem;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  margin: 0;
  font-size: 1.75rem;
}

.subtitle {
  color: var(--text-secondary);
  margin: 0.5rem 0 0;
}

/* Quick Share Section */
.quick-share-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.quick-share-section h2 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
}

.section-hint {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin: 0 0 1rem 0;
}

.achievements-to-share {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.shareable-achievement {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  min-width: 200px;
  position: relative;
  transition: all 0.2s;
}

.shareable-achievement.selected {
  border-color: var(--primary-color);
}

.shareable-achievement:hover {
  transform: translateY(-2px);
}

.achievement-badge {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 1.5rem;
}

.achievement-badge.common { background: #e5e7eb; }
.achievement-badge.uncommon { background: #dcfce7; }
.achievement-badge.rare { background: #dbeafe; }
.achievement-badge.legendary { background: #fef3c7; }

.achievement-info {
  flex: 1;
}

.achievement-name {
  display: block;
  font-weight: 600;
  font-size: 0.9rem;
}

.achievement-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.new-tag {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: white;
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
  border-radius: 8px;
}

.selected-indicator {
  position: absolute;
  bottom: 4px;
  right: 8px;
  color: var(--primary-color);
  font-weight: bold;
}

/* Share Form */
.share-form {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.share-textarea {
  width: 100%;
  min-height: 80px;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  resize: vertical;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.share-options {
  display: flex;
  gap: 1rem;
  margin: 0.75rem 0;
}

.option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.share-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.cancel-btn {
  padding: 0.75rem 1.5rem;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 10px;
  cursor: pointer;
}

.share-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  overflow-x: auto;
}

.tab {
  padding: 0.75rem 1.25rem;
  background: var(--bg-secondary);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 500;
}

.tab.active {
  background: var(--primary-color);
  color: white;
}

/* Loading & Empty */
.loading-state, .empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

/* Shared Card */
.achievement-feed {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.shared-card {
  background: var(--bg-secondary);
  border-radius: 16px;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
}

.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
}

.user-info {
  flex: 1;
}

.user-name {
  display: block;
  font-weight: 600;
}

.share-time {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.follow-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.follow-btn:hover {
  background: var(--primary-color);
  color: white;
}

.follow-btn.following {
  background: var(--bg-secondary);
  border-color: var(--border-color);
  color: var(--text-secondary);
}

.follow-btn.following:hover {
  background: #fee2e2;
  border-color: #ef4444;
  color: #ef4444;
}

.follow-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Achievement Display */
.achievement-display {
  position: relative;
  padding: 2rem;
  text-align: center;
  overflow: hidden;
}

.achievement-display.common { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); }
.achievement-display.uncommon { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); }
.achievement-display.rare { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); }
.achievement-display.legendary { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); }

.display-background {
  position: absolute;
  inset: 0;
  opacity: 0.5;
}

.display-content {
  position: relative;
}

.big-badge {
  width: 80px;
  height: 80px;
  margin: 0 auto 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.big-badge .badge-icon {
  font-size: 3rem;
}

.achievement-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.achievement-desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.stats-display {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1.5rem;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Message & Tips */
.share-message {
  padding: 1rem;
  margin: 0;
  line-height: 1.6;
}

.tips-section {
  padding: 1rem;
  margin: 0 1rem;
  background: #fef3c7;
  border-radius: 12px;
}

.tips-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #92400e;
}

.tips-section p {
  margin: 0;
  color: #78350f;
  font-size: 0.9rem;
}

/* Reactions */
.reactions-bar {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border-color);
}

.reaction-counts {
  display: flex;
  gap: 0.5rem;
}

.reaction-count {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.comment-count {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Action Bar */
.action-bar {
  display: flex;
  padding: 0.5rem;
  position: relative;
}

.action-btn {
  flex: 1;
  padding: 0.75rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 8px;
}

.action-btn:hover {
  background: var(--bg-tertiary);
}

.reaction-picker {
  position: absolute;
  bottom: 100%;
  left: 0;
  display: flex;
  gap: 0.25rem;
  background: var(--bg-primary);
  padding: 0.5rem;
  border-radius: 25px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.reaction-btn {
  font-size: 1.5rem;
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: transform 0.2s;
}

.reaction-btn:hover {
  transform: scale(1.2);
}

/* Comments Preview */
.comments-preview {
  padding: 0.75rem 1rem 1rem;
}

.preview-comment {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.comment-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.comment-content {
  flex: 1;
  background: var(--bg-tertiary);
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
}

.comment-author {
  font-weight: 600;
  font-size: 0.85rem;
  margin-right: 0.5rem;
}

.comment-text {
  font-size: 0.9rem;
}

.view-all-comments {
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.85rem;
}

/* Comments Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.comments-modal {
  background: var(--bg-primary);
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.25rem;
}

.comments-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.comment-item {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.comment-item .comment-avatar {
  width: 36px;
  height: 36px;
}

.comment-body {
  flex: 1;
}

.comment-header {
  margin-bottom: 0.25rem;
}

.comment-item .comment-author {
  font-weight: 600;
}

.comment-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-left: 0.5rem;
}

.comment-item .comment-text {
  margin: 0 0 0.5rem 0;
}

.comment-actions {
  display: flex;
  gap: 1rem;
}

.comment-actions button {
  padding: 0;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.8rem;
}

.comment-input {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid var(--border-color);
}

.comment-input input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 25px;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.comment-input button {
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-weight: 600;
}

.comment-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Badge Gallery */
.badge-gallery {
  margin-top: 2rem;
}

.badge-gallery h2 {
  margin: 0 0 1rem 0;
}

.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
}

.badge-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: 16px;
  cursor: pointer;
  position: relative;
  transition: transform 0.2s;
}

.badge-card:hover:not(.locked) {
  transform: translateY(-2px);
}

.badge-card.common { background: #f3f4f6; }
.badge-card.uncommon { background: #dcfce7; }
.badge-card.rare { background: #dbeafe; }
.badge-card.legendary { background: #fef3c7; }

.badge-card.locked {
  opacity: 0.5;
  cursor: default;
}

.badge-image {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.locked-icon {
  font-size: 2rem;
}

.badge-name {
  font-weight: 600;
  font-size: 0.85rem;
  text-align: center;
}

.badge-progress {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.share-prompt {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #10b981;
  color: white;
  font-size: 0.6rem;
  padding: 0.15rem 0.4rem;
  border-radius: 8px;
}
</style>
