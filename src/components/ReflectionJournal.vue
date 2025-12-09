<template>
  <div v-if="show" class="modal-overlay" @click.self="handleCancel">
    <div class="modal-content reflection-modal">
      <div class="modal-header">
        <h2>📝 บันทึกการเรียนรู้</h2>
        <p class="subtitle">ช่วงเวลาของการไตร่ตรอง (Reflection Time)</p>
      </div>

      <div class="modal-body">
        <!-- Session Summary -->
        <div v-if="sessionSummary" class="session-summary">
          <div class="summary-card">
            <div class="summary-item">
              <span class="icon">📊</span>
              <div>
                <div class="label">คะแนนเฉลี่ย</div>
                <div class="value">{{ sessionSummary.averageScore }}/20</div>
              </div>
            </div>
            <div class="summary-item">
              <span class="icon">💬</span>
              <div>
                <div class="label">จำนวนคำถาม</div>
                <div class="value">{{ sessionSummary.questionsAnswered }} ข้อ</div>
              </div>
            </div>
            <div class="summary-item">
              <span class="icon">⭐</span>
              <div>
                <div class="label">แต้มที่ได้</div>
                <div class="value">+{{ sessionSummary.totalPoints }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Reflection Questions -->
        <div class="reflection-questions">
          <div class="question-group">
            <label>
              <span class="emoji">💡</span>
              <strong>สิ่งที่เรียนรู้ใหม่วันนี้คือ...</strong>
              <span class="hint">(อธิบายสิ่งที่ค้นพบหรือเข้าใจมากขึ้น)</span>
            </label>
            <textarea 
              v-model="reflection.whatILearned"
              rows="3"
              placeholder="เช่น: ฉันเรียนรู้ว่าการวิเคราะห์ต้องแยกส่วนประกอบและอธิบายความเชื่อมโยง..."
              maxlength="500"
            ></textarea>
            <div class="char-count">{{ reflection.whatILearned.length }}/500</div>
          </div>

          <div class="question-group">
            <label>
              <span class="emoji">🤔</span>
              <strong>จุดที่ยังสงสัยหรือท้าทายคือ...</strong>
              <span class="hint">(อะไรที่ยังไม่เข้าใจหรืออยากเรียนรู้เพิ่มเติม)</span>
            </label>
            <textarea 
              v-model="reflection.challenges"
              rows="3"
              placeholder="เช่น: ฉันยังไม่แน่ใจว่าเวลาไหนควรใช้ความคิดสร้างสรรค์มากหรือน้อย..."
              maxlength="500"
            ></textarea>
            <div class="char-count">{{ reflection.challenges.length }}/500</div>
          </div>

          <div class="question-group">
            <label>
              <span class="emoji">🎯</span>
              <strong>ครั้งหน้าฉันจะปรับปรุงโดย...</strong>
              <span class="hint">(แผนปฏิบัติเพื่อพัฒนาทักษะ)</span>
            </label>
            <textarea 
              v-model="reflection.actionPlan"
              rows="3"
              placeholder="เช่น: จะฝึกยกตัวอย่างเฉพาะเจาะจงมากขึ้น และอ่านข้อเสนอแนะจาก AI อย่างละเอียด..."
              maxlength="500"
            ></textarea>
            <div class="char-count">{{ reflection.actionPlan.length }}/500</div>
          </div>

          <!-- Optional: Self-Rating -->
          <div class="question-group">
            <label>
              <span class="emoji">⭐</span>
              <strong>ฉันรู้สึกว่าวันนี้เรียนรู้ได้ดีระดับ...</strong>
            </label>
            <div class="rating-scale">
              <button 
                v-for="level in 5" 
                :key="level"
                @click="reflection.selfRating = level"
                class="rating-btn"
                :class="{ active: reflection.selfRating === level }"
              >
                {{ level }}
              </button>
            </div>
            <div class="rating-labels">
              <span>พัฒนาได้อีก</span>
              <span>ยอดเยี่ยม!</span>
            </div>
          </div>
        </div>

        <!-- Save Reminder -->
        <div class="save-reminder">
          <span class="icon">💾</span>
          <span>บันทึกการไตร่ตรองจะช่วยให้คุณติดตามความก้าวหน้าและพัฒนาทักษะการคิดได้ดีขึ้น</span>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="handleSkip" class="btn btn-outline">
          ข้ามไปก่อน
        </button>
        <button 
          @click="handleSave" 
          class="btn btn-primary"
          :disabled="!isValid || saving"
        >
          {{ saving ? 'กำลังบันทึก...' : '💾 บันทึก' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { db } from '@/firebase/config'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'ReflectionJournal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    sessionId: {
      type: String,
      required: true
    },
    courseId: {
      type: String,
      default: null
    },
    sessionSummary: {
      type: Object,
      default: () => ({
        averageScore: 0,
        questionsAnswered: 0,
        totalPoints: 0
      })
    }
  },
  emits: ['close', 'saved'],
  setup(props, { emit }) {
    const authStore = useAuthStore()
    const saving = ref(false)

    const reflection = ref({
      whatILearned: '',
      challenges: '',
      actionPlan: '',
      selfRating: 3
    })

    // Reset form when modal opens
    watch(() => props.show, (newVal) => {
      if (newVal) {
        reflection.value = {
          whatILearned: '',
          challenges: '',
          actionPlan: '',
          selfRating: 3
        }
      }
    })

    const isValid = computed(() => {
      return reflection.value.whatILearned.trim().length >= 10 ||
             reflection.value.challenges.trim().length >= 10 ||
             reflection.value.actionPlan.trim().length >= 10
    })

    const handleSave = async () => {
      if (!isValid.value || saving.value) return

      try {
        saving.value = true

        const reflectionData = {
          studentId: authStore.user.uid,
          sessionId: props.sessionId,
          courseId: props.courseId || null,
          whatILearned: reflection.value.whatILearned.trim(),
          challenges: reflection.value.challenges.trim(),
          actionPlan: reflection.value.actionPlan.trim(),
          selfRating: reflection.value.selfRating,
          sessionSummary: props.sessionSummary,
          createdAt: serverTimestamp(),
          timestamp: serverTimestamp()
        }

        await addDoc(collection(db, 'reflections'), reflectionData)

        emit('saved', reflectionData)
        emit('close')

        // Show success notification
        alert('✅ บันทึกการเรียนรู้เรียบร้อยแล้ว! ข้อมูลจะช่วยให้คุณพัฒนาทักษะได้ดีขึ้น')

      } catch (error) {
        console.error('Error saving reflection:', error)
        alert('❌ ไม่สามารถบันทึกได้ กรุณาลองอีกครั้ง')
      } finally {
        saving.value = false
      }
    }

    const handleSkip = () => {
      if (isValid.value) {
        if (confirm('คุณมีข้อความที่ยังไม่ได้บันทึก แน่ใจหรือไม่ว่าต้องการข้าม?')) {
          emit('close')
        }
      } else {
        emit('close')
      }
    }

    const handleCancel = () => {
      handleSkip()
    }

    return {
      reflection,
      saving,
      isValid,
      handleSave,
      handleSkip,
      handleCancel
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  overflow-y: auto;
}

.reflection-modal {
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 2rem 2rem 1rem;
  border-bottom: 2px solid #f0f0f0;
}

.modal-header h2 {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  color: #2c3e50;
}

.subtitle {
  margin: 0;
  color: #666;
  font-size: 0.95rem;
}

.modal-body {
  padding: 2rem;
  max-height: 60vh;
  overflow-y: auto;
}

/* Session Summary */
.session-summary {
  margin-bottom: 2rem;
}

.summary-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.summary-item .icon {
  font-size: 2rem;
  opacity: 0.9;
}

.summary-item .label {
  font-size: 0.85rem;
  opacity: 0.9;
  margin-bottom: 0.25rem;
}

.summary-item .value {
  font-size: 1.5rem;
  font-weight: 700;
}

/* Reflection Questions */
.reflection-questions {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.question-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.question-group label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.95rem;
  color: #2c3e50;
}

.question-group label .emoji {
  font-size: 1.25rem;
  margin-right: 0.5rem;
}

.question-group label .hint {
  font-size: 0.85rem;
  color: #666;
  font-weight: normal;
  margin-top: 0.25rem;
}

.question-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s;
}

.question-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.char-count {
  text-align: right;
  font-size: 0.8rem;
  color: #999;
}

/* Rating Scale */
.rating-scale {
  display: flex;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.rating-btn {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.rating-btn:hover {
  border-color: #667eea;
  background: #f7f9ff;
}

.rating-btn.active {
  border-color: #667eea;
  background: #667eea;
  color: white;
  transform: scale(1.05);
}

.rating-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #666;
}

/* Save Reminder */
.save-reminder {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #fff9e6;
  border-left: 4px solid #ffc107;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #666;
  margin-top: 1.5rem;
}

.save-reminder .icon {
  font-size: 1.5rem;
}

/* Modal Footer */
.modal-footer {
  padding: 1.5rem 2rem;
  border-top: 2px solid #f0f0f0;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-outline {
  background: white;
  border: 2px solid #ddd;
  color: #666;
}

.btn-outline:hover {
  border-color: #999;
  color: #333;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Dark Mode */
.dark-mode .modal-content {
  background: #1e1e1e;
  color: #e0e0e0;
}

.dark-mode .modal-header {
  border-bottom-color: #333;
}

.dark-mode .modal-header h2 {
  color: #e0e0e0;
}

.dark-mode .subtitle {
  color: #999;
}

.dark-mode .question-group label {
  color: #e0e0e0;
}

.dark-mode .question-group label .hint {
  color: #999;
}

.dark-mode .question-group textarea {
  background: #2a2a2a;
  border-color: #444;
  color: #e0e0e0;
}

.dark-mode .question-group textarea:focus {
  border-color: #667eea;
}

.dark-mode .rating-btn {
  background: #2a2a2a;
  border-color: #444;
  color: #e0e0e0;
}

.dark-mode .rating-btn:hover {
  background: #333;
}

.dark-mode .rating-btn.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.dark-mode .save-reminder {
  background: rgba(255, 193, 7, 0.1);
  border-left-color: #ffc107;
  color: #ccc;
}

.dark-mode .modal-footer {
  border-top-color: #333;
}

.dark-mode .btn-outline {
  background: #2a2a2a;
  border-color: #444;
  color: #ccc;
}

.dark-mode .btn-outline:hover {
  border-color: #666;
  color: #e0e0e0;
}

/* Responsive */
@media (max-width: 768px) {
  .reflection-modal {
    max-width: 100%;
    margin: 0;
    border-radius: 0;
    max-height: 100vh;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1.5rem 1rem;
  }

  .summary-card {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .modal-footer {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
