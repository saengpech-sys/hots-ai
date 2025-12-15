<template>
  <div class="peer-mentor">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="$router.back()">← กลับ</button>
        <h1>🌟 Peer Mentorship</h1>
      </div>
    </div>

    <!-- Intro Section -->
    <div class="intro-section">
      <div class="intro-content">
        <h2>เรียนรู้จากเพื่อน ช่วยเหลือกัน</h2>
        <p>ระบบจับคู่ Mentor-Mentee อัตโนมัติตาม LO ที่เก่งและที่ต้องพัฒนา</p>
      </div>
      <div class="intro-stats">
        <div class="stat">
          <span class="stat-value">{{ stats.totalMentors }}</span>
          <span class="stat-label">Mentor</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ stats.activeMatches }}</span>
          <span class="stat-label">คู่จับคู่</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ stats.helpedCount }}</span>
          <span class="stat-label">ช่วยแล้ว</span>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button 
        :class="['tab', { active: activeTab === 'find' }]"
        @click="activeTab = 'find'"
      >
        🔍 หา Mentor
      </button>
      <button 
        :class="['tab', { active: activeTab === 'my-mentors' }]"
        @click="activeTab = 'my-mentors'"
      >
        🎓 Mentor ของฉัน
      </button>
      <button 
        :class="['tab', { active: activeTab === 'my-mentees' }]"
        @click="activeTab = 'my-mentees'"
      >
        👥 Mentee ของฉัน
      </button>
      <button 
        :class="['tab', { active: activeTab === 'requests' }]"
        @click="activeTab = 'requests'"
      >
        📬 คำขอ 
        <span v-if="pendingRequests.length" class="badge">{{ pendingRequests.length }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Find Mentor Tab -->
    <div v-else-if="activeTab === 'find'" class="tab-content">
      <!-- My Weak LOs -->
      <div class="weak-los-section">
        <h3>🎯 LO ที่ฉันต้องพัฒนา</h3>
        <div v-if="weakLOs.length === 0" class="no-weak-los">
          <p>🎉 เก่งมาก! ไม่มี LO ที่ต้องปรับปรุง</p>
        </div>
        <div v-else class="lo-chips">
          <button 
            v-for="lo in weakLOs" 
            :key="lo.code"
            :class="['lo-chip', { selected: selectedLO === lo.code }]"
            @click="selectLO(lo.code)"
          >
            {{ lo.code }}
            <span class="lo-progress">{{ lo.progress }}%</span>
          </button>
        </div>
      </div>

      <!-- Suggested Mentors -->
      <div class="mentors-section">
        <h3>💡 Mentor แนะนำ {{ selectedLO ? `สำหรับ ${selectedLO}` : '' }}</h3>
        
        <div v-if="suggestedMentors.length === 0" class="empty-state">
          <span class="empty-icon">🔍</span>
          <p v-if="selectedLO">ไม่พบ Mentor สำหรับ LO นี้</p>
          <p v-else>เลือก LO ที่ต้องการความช่วยเหลือ</p>
        </div>

        <div v-else class="mentors-grid">
          <div v-for="mentor in suggestedMentors" :key="mentor.id" class="mentor-card">
            <div class="mentor-header">
              <img :src="mentor.photoURL || '/default-avatar.png'" class="mentor-avatar" />
              <div class="mentor-info">
                <span class="mentor-name">{{ mentor.displayName }}</span>
                <span class="mentor-grade">{{ mentor.grade || 'ม.4' }}</span>
              </div>
              <div class="match-score">
                <span class="score-value">{{ mentor.matchScore || 85 }}%</span>
                <span class="score-label">ตรงกัน</span>
              </div>
            </div>

            <div class="mentor-strengths">
              <p class="strengths-label">💪 เก่ง:</p>
              <div class="strength-tags">
                <span v-for="lo in mentor.strongLOs?.slice(0, 4)" :key="lo" class="strength-tag">
                  {{ lo }}
                </span>
              </div>
            </div>

            <div class="mentor-stats">
              <span class="stat-item">🎓 ช่วยไปแล้ว {{ mentor.helpedCount || 0 }} คน</span>
              <span class="stat-item">⭐ {{ mentor.rating || 4.5 }}/5</span>
            </div>

            <div class="mentor-actions">
              <button 
                v-if="!hasPendingRequest(mentor.id)"
                class="btn-request"
                @click="requestMentor(mentor)"
              >
                ขอเป็น Mentor
              </button>
              <span v-else class="pending-badge">⏳ รอตอบรับ</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- My Mentors Tab -->
    <div v-else-if="activeTab === 'my-mentors'" class="tab-content">
      <div v-if="myMentors.length === 0" class="empty-state">
        <span class="empty-icon">🎓</span>
        <p>ยังไม่มี Mentor</p>
        <button class="btn-primary" @click="activeTab = 'find'">หา Mentor</button>
      </div>

      <div v-else class="relationships-list">
        <div v-for="rel in myMentors" :key="rel.id" class="relationship-card">
          <img :src="rel.mentorPhoto || '/default-avatar.png'" class="rel-avatar" />
          <div class="rel-info">
            <span class="rel-name">{{ rel.mentorName }}</span>
            <span class="rel-lo">ช่วยเรื่อง: {{ rel.matchedLOs?.join(', ') || 'ทั่วไป' }}</span>
            <span class="rel-since">เริ่ม {{ formatDate(rel.createdAt) }}</span>
          </div>
          <div class="rel-actions">
            <button class="btn-chat" @click="openChat(rel)">💬 แชท</button>
            <button class="btn-end" @click="endRelationship(rel)">จบการ Mentor</button>
          </div>
        </div>
      </div>
    </div>

    <!-- My Mentees Tab -->
    <div v-else-if="activeTab === 'my-mentees'" class="tab-content">
      <div class="become-mentor-section" v-if="!isMentor">
        <h3>🌟 เป็น Mentor ช่วยเพื่อน</h3>
        <p>คุณเก่ง LO เหล่านี้ ลองช่วยเพื่อนดูไหม?</p>
        <div class="strong-lo-chips">
          <span v-for="lo in strongLOs.slice(0, 6)" :key="lo" class="strong-lo-chip">
            {{ lo }}
          </span>
        </div>
        <button class="btn-become-mentor" @click="becomeMentor">
          ✅ เป็น Mentor
        </button>
      </div>

      <div v-else>
        <div v-if="myMentees.length === 0" class="empty-state">
          <span class="empty-icon">👥</span>
          <p>ยังไม่มี Mentee</p>
          <p class="hint">รอเพื่อนขอให้คุณเป็น Mentor</p>
        </div>

        <div v-else class="relationships-list">
          <div v-for="rel in myMentees" :key="rel.id" class="relationship-card">
            <img :src="rel.menteePhoto || '/default-avatar.png'" class="rel-avatar" />
            <div class="rel-info">
              <span class="rel-name">{{ rel.menteeName }}</span>
              <span class="rel-lo">ช่วยเรื่อง: {{ rel.matchedLOs?.join(', ') || 'ทั่วไป' }}</span>
              <span class="rel-since">เริ่ม {{ formatDate(rel.createdAt) }}</span>
            </div>
            <div class="rel-actions">
              <button class="btn-chat" @click="openChat(rel)">💬 แชท</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Requests Tab -->
    <div v-else-if="activeTab === 'requests'" class="tab-content">
      <h3>📬 คำขอที่ได้รับ</h3>
      
      <div v-if="pendingRequests.length === 0" class="empty-state small">
        <p>ไม่มีคำขอใหม่</p>
      </div>

      <div v-else class="requests-list">
        <div v-for="req in pendingRequests" :key="req.id" class="request-card">
          <img :src="req.menteePhoto || '/default-avatar.png'" class="req-avatar" />
          <div class="req-info">
            <span class="req-name">{{ req.menteeName }}</span>
            <span class="req-lo">ต้องการความช่วยเหลือเรื่อง: {{ req.matchedLOs?.join(', ') || 'ทั่วไป' }}</span>
            <span class="req-time">{{ formatDate(req.createdAt) }}</span>
          </div>
          <div class="req-actions">
            <button class="btn-accept" @click="acceptRequest(req)">✅ รับ</button>
            <button class="btn-decline" @click="declineRequest(req)">❌ ปฏิเสธ</button>
          </div>
        </div>
      </div>

      <h3 class="mt-24">📤 คำขอที่ฉันส่งไป</h3>
      
      <div v-if="sentRequests.length === 0" class="empty-state small">
        <p>ไม่มีคำขอที่รอดำเนินการ</p>
      </div>

      <div v-else class="requests-list">
        <div v-for="req in sentRequests" :key="req.id" class="request-card sent">
          <img :src="req.mentorPhoto || '/default-avatar.png'" class="req-avatar" />
          <div class="req-info">
            <span class="req-name">{{ req.mentorName }}</span>
            <span class="req-lo">ขอช่วยเรื่อง: {{ req.matchedLOs?.join(', ') || 'ทั่วไป' }}</span>
            <span class="req-time">ส่งเมื่อ {{ formatDate(req.createdAt) }}</span>
          </div>
          <div class="req-status">
            <span class="status-badge pending">⏳ รอตอบรับ</span>
            <button class="btn-cancel" @click="cancelRequest(req)">ยกเลิก</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Modal -->
    <div v-if="showChatModal" class="modal-overlay" @click.self="showChatModal = false">
      <div class="modal-content chat-modal">
        <div class="modal-header">
          <h2>💬 แชทกับ {{ chatPartner?.name }}</h2>
          <button class="close-btn" @click="showChatModal = false">×</button>
        </div>
        <div class="chat-container" ref="chatContainer">
          <div v-for="msg in chatMessages" :key="msg.id" class="chat-message" :class="{ mine: isMyMessage(msg) }">
            <div class="msg-bubble">{{ msg.content }}</div>
            <span class="msg-time">{{ formatTime(msg.createdAt) }}</span>
          </div>
        </div>
        <div class="chat-input">
          <input 
            v-model="newChatMessage" 
            type="text" 
            placeholder="พิมพ์ข้อความ..."
            @keyup.enter="sendChatMessage"
          />
          <button @click="sendChatMessage" :disabled="!newChatMessage.trim()">ส่ง</button>
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
  getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp 
} from 'firebase/firestore'
import { db } from '@/firebase/config'

const authStore = useAuthStore()

// State
const loading = ref(true)
const activeTab = ref('find')
const selectedLO = ref('')

// Data
const weakLOs = ref([])
const strongLOs = ref([])
const suggestedMentors = ref([])
const myMentors = ref([])
const myMentees = ref([])
const pendingRequests = ref([])
const sentRequests = ref([])
const isMentor = ref(false)

// Stats
const stats = reactive({
  totalMentors: 0,
  activeMatches: 0,
  helpedCount: 0
})

// Chat
const showChatModal = ref(false)
const chatPartner = ref(null)
const chatMessages = ref([])
const newChatMessage = ref('')
const chatContainer = ref(null)

// Methods
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

const selectLO = (loCode) => {
  selectedLO.value = selectedLO.value === loCode ? '' : loCode
  loadSuggestedMentors()
}

const hasPendingRequest = (mentorId) => {
  return sentRequests.value.some(r => r.mentorId === mentorId)
}

const isMyMessage = (msg) => {
  return msg.senderId === authStore.user?.uid
}

const requestMentor = async (mentor) => {
  if (!authStore.user?.uid) return
  
  try {
    await addDoc(collection(db, 'mentorRelationships'), {
      mentorId: mentor.id,
      mentorName: mentor.displayName,
      mentorPhoto: mentor.photoURL,
      menteeId: authStore.user.uid,
      menteeName: authStore.user.displayName || 'นักเรียน',
      menteePhoto: authStore.user.photoURL,
      matchedLOs: selectedLO.value ? [selectedLO.value] : [],
      status: 'pending',
      createdAt: serverTimestamp()
    })

    sentRequests.value.push({
      mentorId: mentor.id,
      mentorName: mentor.displayName,
      mentorPhoto: mentor.photoURL,
      matchedLOs: selectedLO.value ? [selectedLO.value] : [],
      status: 'pending'
    })

    alert('ส่งคำขอแล้ว! รอการตอบรับ')
  } catch (error) {
    console.error('Error requesting mentor:', error)
    alert('เกิดข้อผิดพลาด')
  }
}

const acceptRequest = async (req) => {
  try {
    await updateDoc(doc(db, 'mentorRelationships', req.id), {
      status: 'active',
      acceptedAt: serverTimestamp()
    })

    pendingRequests.value = pendingRequests.value.filter(r => r.id !== req.id)
    myMentees.value.push({ ...req, status: 'active' })
    alert('รับเป็น Mentor แล้ว!')
  } catch (error) {
    console.error('Error accepting request:', error)
  }
}

const declineRequest = async (req) => {
  if (!confirm('ปฏิเสธคำขอนี้?')) return
  
  try {
    await updateDoc(doc(db, 'mentorRelationships', req.id), {
      status: 'declined'
    })
    pendingRequests.value = pendingRequests.value.filter(r => r.id !== req.id)
  } catch (error) {
    console.error('Error declining request:', error)
  }
}

const cancelRequest = async (req) => {
  if (!confirm('ยกเลิกคำขอนี้?')) return
  
  try {
    await deleteDoc(doc(db, 'mentorRelationships', req.id))
    sentRequests.value = sentRequests.value.filter(r => r.id !== req.id)
  } catch (error) {
    console.error('Error cancelling request:', error)
  }
}

const endRelationship = async (rel) => {
  if (!confirm('จบการเป็น Mentor/Mentee?')) return
  
  try {
    await updateDoc(doc(db, 'mentorRelationships', rel.id), {
      status: 'ended',
      endedAt: serverTimestamp()
    })
    myMentors.value = myMentors.value.filter(r => r.id !== rel.id)
    myMentees.value = myMentees.value.filter(r => r.id !== rel.id)
  } catch (error) {
    console.error('Error ending relationship:', error)
  }
}

const becomeMentor = async () => {
  if (strongLOs.value.length === 0) {
    alert('คุณยังไม่มี LO ที่ผ่านเกณฑ์ (คะแนน >= 16/20)\nลองทำแบบประเมินเพิ่มเติมก่อนนะ')
    return
  }
  
  try {
    await updateDoc(doc(db, 'users', authStore.user.uid), {
      isMentor: true,
      strongLOs: strongLOs.value,
      mentorSince: serverTimestamp()
    })
    isMentor.value = true
    alert(`คุณเป็น Mentor แล้ว! เก่ง ${strongLOs.value.length} LO\nรอเพื่อนขอความช่วยเหลือ`)
  } catch (error) {
    console.error('Error becoming mentor:', error)
  }
}

const openChat = (rel) => {
  const isMyMentor = rel.mentorId !== authStore.user?.uid
  chatPartner.value = {
    id: isMyMentor ? rel.mentorId : rel.menteeId,
    name: isMyMentor ? rel.mentorName : rel.menteeName
  }
  chatMessages.value = []
  showChatModal.value = true
  // TODO: Load chat messages
}

const sendChatMessage = async () => {
  if (!newChatMessage.value.trim()) return
  
  // TODO: Implement chat functionality
  chatMessages.value.push({
    id: Date.now(),
    content: newChatMessage.value,
    senderId: authStore.user.uid,
    createdAt: new Date()
  })
  newChatMessage.value = ''
}

// Load Data
const loadWeakLOs = async () => {
  if (!authStore.user?.uid) return
  try {
    // First, get weak LOs from studentProgress (for quick filtering)
    const progressQuery = query(
      collection(db, 'studentProgress'),
      where('studentId', '==', authStore.user.uid)
    )
    const progressSnapshot = await getDocs(progressQuery)
    
    const weak = []
    const potentialStrong = []
    
    progressSnapshot.docs.forEach(doc => {
      const data = doc.data()
      if (data.loProgress) {
        Object.entries(data.loProgress).forEach(([code, progress]) => {
          if (progress < 60) {
            weak.push({ code, progress: Math.round(progress) })
          } else if (progress >= 80) {
            potentialStrong.push(code)
          }
        })
      }
    })
    
    weakLOs.value = weak.sort((a, b) => a.progress - b.progress)
    
    // Now verify strong LOs from actual assessments (score >= 16)
    const verifiedStrong = []
    if (potentialStrong.length > 0) {
      const assessQuery = query(
        collection(db, 'assessments'),
        where('studentId', '==', authStore.user.uid),
        orderBy('createdAt', 'desc'),
        limit(100)
      )
      const assessSnapshot = await getDocs(assessQuery)
      
      // Group by LO and check if any assessment for that LO has score >= 16
      const loScores = {}
      assessSnapshot.docs.forEach(doc => {
        const data = doc.data()
        const totalScore = (data.rubricScores?.analysis || 0) + 
                          (data.rubricScores?.reasoning || 0) + 
                          (data.rubricScores?.creativity || 0) + 
                          (data.rubricScores?.evidence || 0)
        
        // Check passedLOs from loAssessment
        const passedLOs = data.loAssessment?.passedLOs || []
        passedLOs.forEach(lo => {
          if (!loScores[lo] || totalScore > loScores[lo]) {
            loScores[lo] = totalScore
          }
        })
      })
      
      // Only include LOs where student has achieved score >= 16
      potentialStrong.forEach(code => {
        if (loScores[code] && loScores[code] >= 16) {
          verifiedStrong.push(code)
        }
      })
    }
    
    strongLOs.value = verifiedStrong
  } catch (error) {
    console.error('Error loading LOs:', error)
  }
}

const loadSuggestedMentors = async () => {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('isMentor', '==', true),
      limit(20)
    )
    const snapshot = await getDocs(usersQuery)
    
    let mentors = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(u => u.id !== authStore.user?.uid)

    // Filter by selected LO
    if (selectedLO.value) {
      mentors = mentors.filter(m => 
        m.strongLOs?.includes(selectedLO.value)
      )
    }

    // Calculate match score
    mentors = mentors.map(m => ({
      ...m,
      matchScore: calculateMatchScore(m)
    })).sort((a, b) => b.matchScore - a.matchScore)

    suggestedMentors.value = mentors
  } catch (error) {
    console.error('Error loading mentors:', error)
  }
}

const calculateMatchScore = (mentor) => {
  if (!mentor.strongLOs || weakLOs.value.length === 0) return 50
  
  const weakLOCodes = weakLOs.value.map(lo => lo.code)
  const matches = mentor.strongLOs.filter(lo => weakLOCodes.includes(lo)).length
  return Math.min(100, 50 + matches * 15)
}

const loadRelationships = async () => {
  if (!authStore.user?.uid) return
  
  try {
    // Load where I'm mentee
    const mentorQuery = query(
      collection(db, 'mentorRelationships'),
      where('menteeId', '==', authStore.user.uid),
      where('status', '==', 'active')
    )
    const mentorSnap = await getDocs(mentorQuery)
    myMentors.value = mentorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Load where I'm mentor
    const menteeQuery = query(
      collection(db, 'mentorRelationships'),
      where('mentorId', '==', authStore.user.uid),
      where('status', '==', 'active')
    )
    const menteeSnap = await getDocs(menteeQuery)
    myMentees.value = menteeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Load pending requests (where I'm mentor)
    const pendingQuery = query(
      collection(db, 'mentorRelationships'),
      where('mentorId', '==', authStore.user.uid),
      where('status', '==', 'pending')
    )
    const pendingSnap = await getDocs(pendingQuery)
    pendingRequests.value = pendingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Load sent requests
    const sentQuery = query(
      collection(db, 'mentorRelationships'),
      where('menteeId', '==', authStore.user.uid),
      where('status', '==', 'pending')
    )
    const sentSnap = await getDocs(sentQuery)
    sentRequests.value = sentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading relationships:', error)
  }
}

const loadStats = async () => {
  try {
    const mentorsSnap = await getDocs(query(
      collection(db, 'users'),
      where('isMentor', '==', true),
      limit(1000)
    ))
    stats.totalMentors = mentorsSnap.size

    const activeSnap = await getDocs(query(
      collection(db, 'mentorRelationships'),
      where('status', '==', 'active'),
      limit(1000)
    ))
    stats.activeMatches = activeSnap.size
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

const checkMentorStatus = async () => {
  if (!authStore.user?.uid) return
  try {
    const userDoc = await getDocs(query(
      collection(db, 'users'),
      where('__name__', '==', authStore.user.uid)
    ))
    if (userDoc.docs[0]) {
      isMentor.value = userDoc.docs[0].data().isMentor || false
    }
  } catch (error) {
    console.error('Error checking mentor status:', error)
  }
}

// Initialize
onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      loadWeakLOs(),
      loadRelationships(),
      loadStats(),
      checkMentorStatus()
    ])
    await loadSuggestedMentors()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.peer-mentor {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
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
  font-size: 28px;
}

/* Intro Section */
.intro-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  margin-bottom: 24px;
}

.intro-content h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
}

.intro-content p {
  margin: 0;
  opacity: 0.9;
}

.intro-stats {
  display: flex;
  gap: 30px;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: bold;
}

.stat-label {
  font-size: 12px;
  opacity: 0.9;
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
  font-size: 14px;
  color: var(--text-secondary);
  position: relative;
}

.tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.tab .badge {
  position: absolute;
  top: 8px;
  right: 12px;
  background: #f44336;
  color: white;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Tab Content */
.tab-content {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow);
}

/* Weak LOs Section */
.weak-los-section {
  margin-bottom: 32px;
}

.weak-los-section h3 {
  margin: 0 0 16px 0;
}

.no-weak-los {
  text-align: center;
  padding: 20px;
  background: #e8f5e9;
  border-radius: 10px;
  color: #2e7d32;
}

.lo-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.lo-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.lo-chip:hover {
  background: var(--primary-light);
}

.lo-chip.selected {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.lo-progress {
  font-size: 12px;
  padding: 2px 6px;
  background: rgba(0,0,0,0.1);
  border-radius: 10px;
}

.lo-chip.selected .lo-progress {
  background: rgba(255,255,255,0.2);
}

/* Mentors Section */
.mentors-section h3 {
  margin: 0 0 16px 0;
}

.mentors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.mentor-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
}

.mentor-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.mentor-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.mentor-info {
  flex: 1;
}

.mentor-name {
  display: block;
  font-weight: 600;
  font-size: 16px;
}

.mentor-grade {
  font-size: 12px;
  color: var(--text-secondary);
}

.match-score {
  text-align: center;
  padding: 8px 12px;
  background: #e8f5e9;
  border-radius: 10px;
}

.match-score .score-value {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: #4caf50;
}

.match-score .score-label {
  font-size: 10px;
  color: var(--text-secondary);
}

.mentor-strengths {
  margin-bottom: 12px;
}

.strengths-label {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.strength-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.strength-tag {
  padding: 4px 10px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  font-size: 12px;
}

.mentor-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.mentor-actions {
  text-align: center;
}

.btn-request {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.pending-badge {
  display: inline-block;
  padding: 10px 20px;
  background: #fff3e0;
  color: #e65100;
  border-radius: 8px;
}

/* Relationships List */
.relationships-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.relationship-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.rel-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.rel-info {
  flex: 1;
}

.rel-name {
  display: block;
  font-weight: 600;
}

.rel-lo {
  font-size: 13px;
  color: #667eea;
}

.rel-since {
  font-size: 12px;
  color: var(--text-secondary);
}

.rel-actions {
  display: flex;
  gap: 8px;
}

.btn-chat {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-end {
  padding: 8px 16px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* Become Mentor Section */
.become-mentor-section {
  text-align: center;
  padding: 30px;
  background: linear-gradient(135deg, #fff9c4 0%, #fff59d 100%);
  border-radius: 12px;
}

.become-mentor-section h3 {
  margin: 0 0 8px 0;
}

.become-mentor-section p {
  margin: 0 0 16px 0;
  color: var(--text-secondary);
}

.strong-lo-chips {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.strong-lo-chip {
  padding: 6px 14px;
  background: var(--card-bg);
  border-radius: 16px;
  font-size: 13px;
  color: #4caf50;
}

.btn-become-mentor {
  padding: 12px 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}

/* Requests List */
.requests-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.request-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.request-card.sent {
  background: #fff8e1;
}

.req-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.req-info {
  flex: 1;
}

.req-name {
  display: block;
  font-weight: 600;
}

.req-lo {
  font-size: 13px;
  color: var(--text-secondary);
}

.req-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.req-actions {
  display: flex;
  gap: 8px;
}

.btn-accept {
  padding: 8px 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-decline, .btn-cancel {
  padding: 8px 16px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.req-status {
  text-align: center;
}

.status-badge {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
}

.status-badge.pending {
  color: #e65100;
}

.mt-24 {
  margin-top: 24px;
}

/* Chat Modal */
.chat-modal {
  max-width: 500px;
  height: 500px;
  display: flex;
  flex-direction: column;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--bg-secondary);
}

.chat-message {
  margin-bottom: 12px;
}

.chat-message.mine {
  text-align: right;
}

.chat-message .msg-bubble {
  display: inline-block;
  padding: 10px 14px;
  background: var(--card-bg);
  border-radius: 16px;
  max-width: 80%;
  color: var(--text-primary);
}

.chat-message.mine .msg-bubble {
  background: #667eea;
  color: white;
}

.chat-message .msg-time {
  display: block;
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--border-color);
}

.chat-input input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  background: var(--input-bg);
  color: var(--text-primary);
}

.chat-input button {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
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
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
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

/* States */
.empty-state, .loading-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state.small {
  padding: 30px;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.hint {
  font-size: 13px;
  color: var(--text-secondary);
}

.btn-primary {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 16px;
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
  .intro-section {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }

  .tabs {
    overflow-x: auto;
  }

  .tab {
    white-space: nowrap;
    font-size: 13px;
  }

  .mentors-grid {
    grid-template-columns: 1fr;
  }

  .relationship-card,
  .request-card {
    flex-direction: column;
    text-align: center;
  }

  .rel-actions,
  .req-actions {
    width: 100%;
    justify-content: center;
  }
}

</style>