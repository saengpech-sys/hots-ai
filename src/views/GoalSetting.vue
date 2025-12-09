<template>
  <div class="goal-setting-container">
    <div class="header">
      <h1>🎯 เป้าหมายการเรียนรู้ของฉัน</h1>
      <p>ตั้งเป้าหมายและติดตามความก้าวหน้าของคุณ</p>
    </div>

    <!-- Create Goal Button -->
    <div class="actions">
      <button @click="showCreateDialog = true" class="btn-primary">
        ➕ ตั้งเป้าหมายใหม่
      </button>
    </div>

    <!-- Active Goals -->
    <div class="goals-section">
      <h2>🔥 เป้าหมายที่กำลังดำเนินการ</h2>
      <div v-if="activeGoals.length === 0" class="empty-state">
        <p>ยังไม่มีเป้าหมาย ตั้งเป้าหมายแรกของคุณเพื่อสร้างแรงบันดาลใจ!</p>
      </div>
      <div v-else class="goals-grid">
        <div v-for="goal in activeGoals" :key="goal.id" class="goal-card">
          <div class="goal-header">
            <h3>{{ getGoalIcon(goal.type) }} {{ goal.title }}</h3>
            <span class="goal-deadline">กำหนดเสร็จ: {{ formatDate(goal.deadline) }}</span>
          </div>

          <p class="goal-description">{{ goal.description }}</p>

          <div class="goal-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: getProgress(goal) + '%' }"></div>
            </div>
            <span class="progress-text">
              {{ goal.currentValue || 0 }} / {{ goal.targetValue }} {{ goal.unit }}
              ({{ getProgress(goal) }}%)
            </span>
          </div>

          <div class="goal-actions">
            <button @click="completeGoal(goal)" class="btn-complete" 
                    :disabled="getProgress(goal) < 100">
              ✓ ทำเสร็จแล้ว
            </button>
            <button @click="deleteGoal(goal.id)" class="btn-delete">🗑️ ลบ</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Completed Goals -->
    <div v-if="completedGoals.length > 0" class="goals-section">
      <h2>✅ เป้าหมายที่สำเร็จแล้ว</h2>
      <div class="goals-grid">
        <div v-for="goal in completedGoals" :key="goal.id" class="goal-card completed">
          <div class="goal-header">
            <h3>{{ getGoalIcon(goal.type) }} {{ goal.title }}</h3>
            <span class="completion-badge">✓ สำเร็จเมื่อ {{ formatDate(goal.completedAt) }}</span>
          </div>
          <p class="goal-description">{{ goal.description }}</p>
          <div class="goal-reward">
            🎉 ได้รับ {{ goal.rewardPoints }} คะแนน!
          </div>
        </div>
      </div>
    </div>

    <!-- Create Goal Dialog -->
    <div v-if="showCreateDialog" class="modal-overlay" @click.self="closeDialog">
      <div class="modal-content">
        <div class="modal-header">
          <h2>ตั้งเป้าหมายใหม่</h2>
          <button @click="closeDialog" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>ประเภทเป้าหมาย *</label>
            <select v-model="goalForm.type" @change="updateGoalTemplate">
              <option value="">-- เลือกประเภท --</option>
              <option value="badges">รับเหรียญตรา (Badges)</option>
              <option value="points">รับคะแนน (Points)</option>
              <option value="questions">ตอบคำถาม</option>
              <option value="lo-mastery">ทำ Learning Outcomes ให้ผ่าน</option>
              <option value="streak">สร้างสตรีค (เข้าเรียนต่อเนื่อง)</option>
              <option value="perfect-score">ได้คะแนนเต็ม 20/20</option>
            </select>
          </div>

          <div class="form-group">
            <label>ชื่อเป้าหมาย *</label>
            <input v-model="goalForm.title" type="text" 
                   placeholder="เช่น รับเหรียญทอง 3 เหรียญในสัปดาห์นี้" />
          </div>

          <div class="form-group">
            <label>รายละเอียด</label>
            <textarea v-model="goalForm.description" rows="3"
                      placeholder="ทำไมเป้าหมายนี้จึงสำคัญกับคุณ?"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>เป้าหมาย *</label>
              <input v-model.number="goalForm.targetValue" type="number" min="1" />
            </div>

            <div class="form-group">
              <label>หน่วย</label>
              <input v-model="goalForm.unit" type="text" readonly />
            </div>
          </div>

          <div class="form-group">
            <label>กำหนดเสร็จ *</label>
            <input v-model="goalForm.deadline" type="date" :min="today" />
          </div>

          <div class="goal-preview">
            <h4>🎯 ตัวอย่าง:</h4>
            <p><strong>{{ goalForm.title || 'ชื่อเป้าหมายของคุณ' }}</strong></p>
            <p>เป้าหมาย: {{ goalForm.targetValue || 0 }} {{ goalForm.unit }}</p>
            <p>กำหนดเสร็จ: {{ goalForm.deadline || 'ระบุวันที่' }}</p>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeDialog" class="btn-secondary">ยกเลิก</button>
          <button @click="createGoal" class="btn-primary" :disabled="!isFormValid">
            สร้างเป้าหมาย
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'GoalSetting',
  setup() {
    const authStore = useAuthStore()
    const goals = ref([])
    const showCreateDialog = ref(false)

    const goalForm = ref({
      type: '',
      title: '',
      description: '',
      targetValue: 1,
      currentValue: 0,
      unit: '',
      deadline: ''
    })

    const today = computed(() => {
      const date = new Date()
      date.setDate(date.getDate() + 1) // Minimum tomorrow
      return date.toISOString().split('T')[0]
    })

    const activeGoals = computed(() => 
      goals.value.filter(g => g.status === 'active')
    )

    const completedGoals = computed(() => 
      goals.value.filter(g => g.status === 'completed')
    )

    const isFormValid = computed(() => {
      return goalForm.value.type &&
             goalForm.value.title &&
             goalForm.value.targetValue > 0 &&
             goalForm.value.deadline
    })

    const goalTemplates = {
      'badges': { unit: 'เหรียญ', defaultTarget: 3 },
      'points': { unit: 'คะแนน', defaultTarget: 100 },
      'questions': { unit: 'คำถาม', defaultTarget: 10 },
      'lo-mastery': { unit: 'LOs', defaultTarget: 3 },
      'streak': { unit: 'วัน', defaultTarget: 7 },
      'perfect-score': { unit: 'ครั้ง', defaultTarget: 5 }
    }

    const loadGoals = async () => {
      try {
        const q = query(
          collection(db, 'studentGoals'),
          where('studentId', '==', authStore.user.uid)
        )
        const snapshot = await getDocs(q)
        goals.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      } catch (error) {
        console.error('Error loading goals:', error)
      }
    }

    const updateGoalTemplate = () => {
      const template = goalTemplates[goalForm.value.type]
      if (template) {
        goalForm.value.unit = template.unit
        goalForm.value.targetValue = template.defaultTarget
      }
    }

    const closeDialog = () => {
      showCreateDialog.value = false
      goalForm.value = {
        type: '',
        title: '',
        description: '',
        targetValue: 1,
        currentValue: 0,
        unit: '',
        deadline: ''
      }
    }

    const createGoal = async () => {
      try {
        const goalData = {
          ...goalForm.value,
          studentId: authStore.user.uid,
          status: 'active',
          createdAt: serverTimestamp(),
          deadline: Timestamp.fromDate(new Date(goalForm.value.deadline))
        }

        await addDoc(collection(db, 'studentGoals'), goalData)
        alert('🎯 สร้างเป้าหมายสำเร็จ!')
        closeDialog()
        loadGoals()
      } catch (error) {
        console.error('Error creating goal:', error)
        alert('เกิดข้อผิดพลาด: ' + error.message)
      }
    }

    const getProgress = (goal) => {
      if (goal.targetValue === 0) return 0
      const progress = (goal.currentValue / goal.targetValue) * 100
      return Math.min(Math.round(progress), 100)
    }

    const completeGoal = async (goal) => {
      if (getProgress(goal) < 100) {
        alert('คุณยังไม่ถึงเป้าหมาย!')
        return
      }

      try {
        const rewardPoints = calculateReward(goal)
        
        await updateDoc(doc(db, 'studentGoals', goal.id), {
          status: 'completed',
          completedAt: serverTimestamp(),
          rewardPoints
        })

        // Award points to student
        // TODO: Call cloud function to update student progress

        alert(`🎉 ยินดีด้วย! เป้าหมายสำเร็จ! คุณได้รับ ${rewardPoints} คะแนน!`)
        loadGoals()
      } catch (error) {
        console.error('Error completing goal:', error)
        alert('เกิดข้อผิดพลาด: ' + error.message)
      }
    }

    const deleteGoal = async (goalId) => {
      if (!confirm('คุณแน่ใจว่าต้องการลบเป้าหมายนี้?')) return

      try {
        await deleteDoc(doc(db, 'studentGoals', goalId))
        alert('ลบเป้าหมายสำเร็จ')
        loadGoals()
      } catch (error) {
        console.error('Error deleting goal:', error)
        alert('เกิดข้อผิดพลาด: ' + error.message)
      }
    }

    const calculateReward = (goal) => {
      const baseRewards = {
        'badges': 50,
        'points': 20,
        'questions': 30,
        'lo-mastery': 100,
        'streak': 75,
        'perfect-score': 150
      }
      return baseRewards[goal.type] || 50
    }

    const getGoalIcon = (type) => {
      const icons = {
        'badges': '🏅',
        'points': '⭐',
        'questions': '📝',
        'lo-mastery': '🎓',
        'streak': '🔥',
        'perfect-score': '💯'
      }
      return icons[type] || '🎯'
    }

    const formatDate = (timestamp) => {
      if (!timestamp) return ''
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    onMounted(() => {
      loadGoals()
    })

    return {
      goals,
      showCreateDialog,
      goalForm,
      today,
      activeGoals,
      completedGoals,
      isFormValid,
      loadGoals,
      updateGoalTemplate,
      closeDialog,
      createGoal,
      getProgress,
      completeGoal,
      deleteGoal,
      getGoalIcon,
      formatDate
    }
  }
}
</script>

<style scoped>
.goal-setting-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header p {
  color: #666;
  font-size: 1.1rem;
}

.actions {
  display: flex;
  justify-content: center;
  margin-bottom: 3rem;
}

.btn-primary {
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.goals-section {
  margin-bottom: 3rem;
}

.goals-section h2 {
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 1.1rem;
}

.goals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.goal-card {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s;
}

.goal-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.goal-card.completed {
  border-color: #00b894;
  background: linear-gradient(135deg, #00b89410 0%, #00d2ff10 100%);
}

.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.goal-header h3 {
  font-size: 1.3rem;
  flex: 1;
}

.goal-deadline {
  background: #ffeaa7;
  color: #d63031;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.completion-badge {
  background: #00b894;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.goal-description {
  color: #666;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.goal-progress {
  margin-bottom: 1.5rem;
}

.progress-bar {
  height: 10px;
  background: #e0e0e0;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.5s ease;
}

.progress-text {
  color: #666;
  font-size: 0.9rem;
}

.goal-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-complete, .btn-delete, .btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-complete {
  background: #00b894;
  color: white;
  flex: 1;
}

.btn-complete:hover {
  background: #00a383;
}

.btn-complete:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-delete {
  background: #d63031;
  color: white;
}

.btn-delete:hover {
  background: #c0281f;
}

.goal-reward {
  text-align: center;
  padding: 1rem;
  background: linear-gradient(135deg, #ffeaa720 0%, #fdcb6e20 100%);
  border-radius: 8px;
  font-weight: 600;
  color: #d63031;
}

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
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
  font-family: inherit;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.goal-preview {
  background: #f8f9fa;
  border-left: 4px solid #667eea;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.goal-preview h4 {
  margin-bottom: 0.75rem;
  color: #667eea;
}

.goal-preview p {
  margin-bottom: 0.25rem;
  color: #333;
}

/* Dark mode */
.dark-mode .goal-card,
.dark-mode .modal-content {
  background: #2d3748;
  border-color: #4a5568;
}

.dark-mode .goal-card h3,
.dark-mode .modal-header h2 {
  color: #e2e8f0;
}

.dark-mode .goal-description,
.dark-mode .progress-text {
  color: #cbd5e0;
}

.dark-mode .form-group input,
.dark-mode .form-group textarea,
.dark-mode .form-group select {
  background: #1a202c;
  border-color: #4a5568;
  color: #e2e8f0;
}

.dark-mode .goal-preview {
  background: #1a202c;
}

.dark-mode .goal-preview p {
  color: #cbd5e0;
}
</style>
