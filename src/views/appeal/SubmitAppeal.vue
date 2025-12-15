<template>
  <div class="appeal-submit">
    <LoadingSpinner v-if="loading" />

    <div v-else-if="!submission" class="error-state">
      <div class="error-icon">📭</div>
      <h2>ไม่พบข้อมูลการส่งงาน</h2>
      <router-link to="/assignments" class="btn-back">← กลับหน้างาน</router-link>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="appeal-header">
        <router-link :to="`/submissions/${submissionId}`" class="back-link">
          ← กลับ
        </router-link>
        <h1>📝 ยื่นอุทธรณ์</h1>
        <span class="submission-title">{{ submission.assignmentTitle }}</span>
      </div>

      <!-- Current Score Info -->
      <div class="score-card">
        <h2>📊 คะแนนปัจจุบัน</h2>
        <div class="score-display">
          <span class="total-score">{{ submission.finalScore }}/{{ submission.maxScore || 20 }}</span>
        </div>
        <div class="arce-scores">
          <div class="arce-item">
            <span class="label">Analysis</span>
            <span class="value">{{ submission.finalRubric?.analysis || 0 }}/5</span>
          </div>
          <div class="arce-item">
            <span class="label">Reasoning</span>
            <span class="value">{{ submission.finalRubric?.reasoning || 0 }}/5</span>
          </div>
          <div class="arce-item">
            <span class="label">Creativity</span>
            <span class="value">{{ submission.finalRubric?.creativity || 0 }}/5</span>
          </div>
          <div class="arce-item">
            <span class="label">Evidence</span>
            <span class="value">{{ submission.finalRubric?.evidence || 0 }}/5</span>
          </div>
        </div>
      </div>

      <!-- Appeal Form -->
      <div class="appeal-form">
        <h2>✍️ เหตุผลในการอุทธรณ์</h2>
        
        <div class="appeal-tips">
          <h4>💡 เคล็ดลับในการยื่นอุทธรณ์:</h4>
          <ul>
            <li>อธิบายว่าคะแนนมิติใดที่คุณคิดว่าควรได้มากกว่านี้</li>
            <li>ชี้ให้เห็นส่วนของคำตอบที่แสดงทักษะนั้นๆ</li>
            <li>ยกตัวอย่างจากคำตอบของคุณเพื่อสนับสนุน</li>
            <li>เขียนอย่างสุภาพและเป็นเหตุเป็นผล</li>
          </ul>
        </div>

        <!-- Appeal Type -->
        <div class="form-group">
          <label>ประเภทการอุทธรณ์ *</label>
          <div class="appeal-types">
            <button 
              :class="['type-btn', { active: appealType === 'score_review' }]"
              @click="appealType = 'score_review'"
            >
              📊 ขอให้ทบทวนคะแนน
            </button>
            <button 
              :class="['type-btn', { active: appealType === 'technical_issue' }]"
              @click="appealType = 'technical_issue'"
            >
              🔧 ปัญหาทางเทคนิค
            </button>
            <button 
              :class="['type-btn', { active: appealType === 'unfair_assessment' }]"
              @click="appealType = 'unfair_assessment'"
            >
              ⚖️ การประเมินไม่เป็นธรรม
            </button>
          </div>
        </div>

        <!-- Specific Dimensions (if score_review) -->
        <div v-if="appealType === 'score_review'" class="form-group">
          <label>มิติที่ต้องการอุทธรณ์ (เลือกได้หลายอัน)</label>
          <div class="dimension-checkboxes">
            <label class="checkbox-item">
              <input type="checkbox" v-model="appealDimensions" value="analysis">
              🔍 Analysis
            </label>
            <label class="checkbox-item">
              <input type="checkbox" v-model="appealDimensions" value="reasoning">
              🧠 Reasoning
            </label>
            <label class="checkbox-item">
              <input type="checkbox" v-model="appealDimensions" value="creativity">
              💡 Creativity
            </label>
            <label class="checkbox-item">
              <input type="checkbox" v-model="appealDimensions" value="evidence">
              📚 Evidence
            </label>
          </div>
        </div>

        <!-- Reason -->
        <div class="form-group">
          <label>เหตุผลในการอุทธรณ์ * (อย่างน้อย 50 ตัวอักษร)</label>
          <textarea 
            v-model="appealReason"
            placeholder="อธิบายเหตุผลที่คุณคิดว่าคะแนนควรได้รับการทบทวน..."
            rows="6"
          ></textarea>
          <span class="char-count" :class="{ ok: appealReason.length >= 50 }">
            {{ appealReason.length }}/50 ตัวอักษร
          </span>
        </div>

        <!-- Evidence -->
        <div class="form-group">
          <label>หลักฐานสนับสนุน (ถ้ามี)</label>
          <textarea 
            v-model="appealEvidence"
            placeholder="ยกส่วนของคำตอบที่คุณคิดว่าแสดงทักษะที่ควรได้คะแนนมากกว่านี้..."
            rows="4"
          ></textarea>
        </div>
      </div>

      <!-- Answer Preview -->
      <div class="answer-preview">
        <h2>📄 คำตอบของคุณ (สำหรับอ้างอิง)</h2>
        <div class="answer-content">
          {{ submission.answer }}
        </div>
      </div>

      <!-- Submit Button -->
      <div class="submit-section">
        <p class="notice">
          📌 หลังจากยื่นอุทธรณ์ ครูผู้สอนจะพิจารณาและแจ้งผลภายใน 3-5 วัน
        </p>
        <div class="button-group">
          <router-link :to="`/submissions/${submissionId}`" class="btn-cancel">
            ยกเลิก
          </router-link>
          <button 
            class="btn-submit"
            @click="submitAppeal"
            :disabled="!canSubmit || submitting"
          >
            {{ submitting ? 'กำลังส่ง...' : '📤 ยื่นอุทธรณ์' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'

const submissionId = route.params.submissionId
const loading = ref(true)
const submission = ref(null)

const appealType = ref('score_review')
const appealDimensions = ref([])
const appealReason = ref('')
const appealEvidence = ref('')
const submitting = ref(false)

const canSubmit = computed(() => {
  return appealType.value && appealReason.value.length >= 50
})

async function loadSubmission() {
  loading.value = true
  try {
    const submissionDoc = await getDoc(doc(db, 'submissions', submissionId))
    if (submissionDoc.exists()) {
      submission.value = { id: submissionDoc.id, ...submissionDoc.data() }
    }
  } catch (error) {
    console.error('Error loading submission:', error)
  } finally {
    loading.value = false
  }
}

async function submitAppeal() {
  if (!canSubmit.value || submitting.value) return
  
  submitting.value = true
  try {
    const response = await fetch(`${FUNCTIONS_URL}/submitAppeal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId,
        studentId: authStore.user.uid,
        studentName: authStore.user.displayName,
        type: appealType.value,
        dimensions: appealDimensions.value,
        reason: appealReason.value,
        evidence: appealEvidence.value
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      alert('✅ ยื่นอุทธรณ์เรียบร้อยแล้ว\n\nครูจะพิจารณาและแจ้งผลภายใน 3-5 วัน')
      router.push('/my-appeals')
    } else {
      alert('เกิดข้อผิดพลาด: ' + data.error)
    }
  } catch (error) {
    console.error('Error submitting appeal:', error)
    alert('เกิดข้อผิดพลาดในการยื่นอุทธรณ์')
  } finally {
    submitting.value = false
  }
}

onMounted(loadSubmission)
</script>

<style scoped>
.appeal-submit {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

/* Error State */
.error-state {
  text-align: center;
  padding: 60px 20px;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.btn-back {
  display: inline-block;
  margin-top: 20px;
  padding: 12px 24px;
  background: var(--primary-color);
  color: white;
  text-decoration: none;
  border-radius: 8px;
}

/* Header */
.appeal-header {
  margin-bottom: 24px;
}

.back-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
}

.appeal-header h1 {
  font-size: 1.5rem;
  margin: 8px 0;
}

.submission-title {
  color: var(--text-secondary);
}

/* Score Card */
.score-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  text-align: center;
}

.score-card h2 {
  margin-bottom: 16px;
}

.score-display {
  margin-bottom: 16px;
}

.total-score {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary-color);
}

.arce-scores {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.arce-item {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.arce-item .label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.arce-item .value {
  font-weight: 600;
}

/* Appeal Form */
.appeal-form {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.appeal-form h2 {
  margin-bottom: 16px;
}

.appeal-tips {
  background: #fef3c7;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.appeal-tips h4 {
  margin-bottom: 8px;
}

.appeal-tips ul {
  margin: 0 0 0 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.appeal-types {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.type-btn {
  flex: 1;
  min-width: 150px;
  padding: 12px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  cursor: pointer;
  font-size: 0.9rem;
}

.type-btn.active {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

.dimension-checkboxes {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  resize: vertical;
  font-size: 1rem;
  line-height: 1.6;
}

.char-count {
  display: block;
  text-align: right;
  margin-top: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.char-count.ok {
  color: #10b981;
}

/* Answer Preview */
.answer-preview {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.answer-preview h2 {
  margin-bottom: 16px;
}

.answer-content {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  line-height: 1.8;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

/* Submit Section */
.submit-section {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
}

.notice {
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.button-group {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 12px 24px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  text-decoration: none;
  color: var(--text-primary);
}

.btn-submit {
  padding: 12px 24px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .arce-scores {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .appeal-types {
    flex-direction: column;
  }
  
  .type-btn {
    min-width: auto;
  }
}
</style>
