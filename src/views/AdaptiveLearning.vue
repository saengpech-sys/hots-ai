<template>
  <div class="adaptive-learning-container">
    <div class="header">
      <h1>💡 แนะนำสำหรับคุณ</h1>
      <p>เรามีเนื้อหาและคำถามที่เหมาะกับคุณ มาพัฒนาทักษะกันเลย! 🚀</p>
    </div>

    <!-- Course Selection (กระชับกว่าเดิม) -->
    <div class="course-selector-compact">
      <select v-model="selectedCourseId" @change="loadLearningPath" class="course-select-modern">
        <option value="">📚 เลือกรายวิชาที่ต้องการเรียน...</option>
        <option v-for="course in availableCourses" :key="course.id" :value="course.id">
          {{ course.courseCode }} - {{ course.courseName }}
        </option>
      </select>
    </div>

    <div v-if="selectedCourseId" class="content">
      <!-- No Active Path - แสดง Learning Outcomes ให้เลือก -->
      <div v-if="!loading && !activePath" class="lo-selection-mode">
        <div class="section-intro">
          <h2>🎯 เลือก Learning Outcome ที่ต้องการฝึกฝน</h2>
          <p>คลิกเลือกจุดประสงค์การเรียนรู้ที่อยากพัฒนา แล้วระบบจะสร้างเส้นทางให้อัตโนมัติ</p>
        </div>

        <!-- Grid แสดง Learning Outcomes -->
        <div class="lo-cards-grid">
          <div 
            v-for="lo in availableLOs" 
            :key="lo.code" 
            class="lo-selection-card"
            @click="selectLOAndGenerate(lo.code)"
          >
            <div class="lo-card-header">
              <span class="lo-code-badge">{{ lo.code }}</span>
              <span v-if="lo.progress" class="lo-progress-badge" :class="getProgressClass(lo.progress)">
                {{ lo.progress.passCount }}/{{ lo.progress.totalAttempts }} ผ่าน
              </span>
            </div>
            <h3 class="lo-title">{{ lo.description }}</h3>
            <div class="lo-stats">
              <span v-if="lo.progress">
                📊 เฉลี่ย: {{ lo.progress.avgScore.toFixed(1) }}/20
              </span>
              <span v-else class="new-badge">✨ ยังไม่เคยฝึก</span>
            </div>
            <div class="lo-card-footer">
              <span class="click-hint">คลิกเพื่อเริ่มเรียน →</span>
            </div>
          </div>
        </div>

        <!-- หรือสร้างเส้นทางแบบอัตโนมัติ -->
        <div class="auto-path-section">
          <div class="divider">
            <span>หรือ</span>
          </div>
          <button @click="generateAutoPath" class="btn-auto-generate" :disabled="generating">
            {{ generating ? '🔄 กำลังวิเคราะห์...' : '🤖 ให้ AI เลือกเส้นทางที่เหมาะกับฉันอัตโนมัติ' }}
          </button>
        </div>
      </div>

      <!-- Active Path -->
      <div v-else-if="activePath" class="active-path">
        <!-- Progress Overview -->
        <div class="progress-overview">
          <div class="progress-header">
            <h2>📊 ความคืบหน้าของคุณ</h2>
            <span class="status-badge" :class="activePath.status">
              {{ activePath.status === 'active' ? '🔥 กำลังดำเนินการ' : '✅ เสร็จสมบูรณ์' }}
            </span>
          </div>

          <div class="progress-bar-container">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
            </div>
            <span class="progress-text">
              {{ completedSteps }} / {{ totalSteps }} ขั้นตอนที่เสร็จแล้ว ({{ progressPercentage }}%)
            </span>
          </div>

          <div class="target-los">
            <h3>🎯 Learning Outcomes เป้าหมาย:</h3>
            <div class="lo-chips">
              <div v-for="lo in targetLODetails" :key="lo.code" class="lo-chip">
                <span class="lo-code">{{ lo.code }}</span>
                <span class="lo-desc">{{ lo.description }}</span>
                <div class="lo-performance" v-if="lo.performance">
                  <span class="perf-attempts">{{ lo.performance.attempts }} ครั้ง</span>
                  <span class="perf-score">เฉลี่ย: {{ lo.performance.avgScore.toFixed(1) }}/20</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Current Step -->
        <div v-if="currentStep" class="current-step">
          <h2>📍 ขั้นตอนปัจจุบัน</h2>
          <div class="step-card current">
            <div class="step-icon">
              {{ getStepIcon(currentStep.type) }}
            </div>
            <div class="step-content">
              <h3>{{ getStepTitle(currentStep) }}</h3>
              <p class="step-lo">Learning Outcome: {{ currentStep.loCode }} - {{ currentStep.loDescription }}</p>
              
              <!-- Micro-Lesson Content -->
              <div v-if="currentStep.type === 'micro-lesson'" class="lesson-content">
                <div class="lesson-meta">
                  <span>⏱️ {{ currentStep.estimatedMinutes }} นาที</span>
                </div>
                <div class="lesson-text" v-html="formatContent(currentStep.content)"></div>
                <div v-if="currentStep.videoUrl" class="lesson-video">
                  <a :href="currentStep.videoUrl" target="_blank" class="video-link">
                    🎥 ดูวิดีโอ
                  </a>
                </div>
                <button @click="completeStep" class="btn-complete">
                  ✓ ฉันเรียนรู้แล้ว
                </button>
              </div>

              <!-- Question Step -->
              <div v-else class="question-step">
                <div class="difficulty-badge" :class="'difficulty-' + currentStep.difficulty">
                  ระดับความยาก: {{ currentStep.difficulty }}/5
                </div>
                <p class="question-type">ประเภท: {{ currentStep.questionType }}</p>
                <button @click="startQuestion" class="btn-primary">
                  🚀 เริ่มทำคำถาม
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Upcoming Steps -->
        <div v-if="upcomingSteps.length > 0" class="upcoming-steps">
          <h2>⏭️ ขั้นตอนถัดไป</h2>
          <div class="steps-list">
            <div v-for="(step, index) in upcomingSteps" :key="index" class="step-card upcoming">
              <div class="step-number">{{ currentStepIndex + index + 2 }}</div>
              <div class="step-icon small">{{ getStepIcon(step.type) }}</div>
              <div class="step-info">
                <span class="step-title">{{ getStepTitle(step) }}</span>
                <span class="step-lo-code">{{ step.loCode }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Completed Steps -->
        <div v-if="completedPathSteps.length > 0" class="completed-steps">
          <h2>✅ ขั้นตอนที่เสร็จแล้ว</h2>
          <div class="steps-list">
            <div v-for="(step, index) in completedPathSteps" :key="index" class="step-card completed">
              <div class="step-icon small">{{ getStepIcon(step.type) }}</div>
              <div class="step-info">
                <span class="step-title">{{ getStepTitle(step) }}</span>
                <span class="step-lo-code">{{ step.loCode }}</span>
                <span v-if="step.score !== undefined" class="step-score">
                  คะแนน: {{ step.score }}/20
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>กำลังโหลดเส้นทางการเรียนรู้ของคุณ...</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

export default {
  name: 'AdaptiveLearning',
  setup() {
    const authStore = useAuthStore()
    const router = useRouter()
    const availableCourses = ref([])
    const selectedCourseId = ref('')
    const loading = ref(false)
    const generating = ref(false)
    const activePath = ref(null)
    const availableLOs = ref([]) // เพิ่ม state สำหรับ LOs

    const currentStepIndex = computed(() => activePath.value?.currentStepIndex || 0)
    const pathSteps = computed(() => activePath.value?.pathSteps || [])
    const totalSteps = computed(() => pathSteps.value.length)
    const completedSteps = computed(() => pathSteps.value.filter(s => s.completed).length)
    const progressPercentage = computed(() => {
      return totalSteps.value > 0 ? Math.round((completedSteps.value / totalSteps.value) * 100) : 0
    })

    const currentStep = computed(() => {
      if (currentStepIndex.value < pathSteps.value.length) {
        return pathSteps.value[currentStepIndex.value]
      }
      return null
    })

    const upcomingSteps = computed(() => {
      return pathSteps.value.slice(currentStepIndex.value + 1, currentStepIndex.value + 4)
    })

    const completedPathSteps = computed(() => {
      return pathSteps.value.filter(s => s.completed)
    })

    const targetLODetails = computed(() => {
      if (!activePath.value?.targetLOs) return []
      
      // Get LO details from course data
      const selectedCourse = availableCourses.value.find(c => c.id === selectedCourseId.value)
      const courseLOs = selectedCourse?.learningOutcomes || []
      
      return activePath.value.targetLOs.map(loCode => {
        const loData = courseLOs.find(lo => lo.code === loCode || lo.loCode === loCode)
        return {
          code: loCode,
          description: loData?.description || loData?.loDescription || 'ไม่มีคำอธิบาย',
          performance: activePath.value.performance?.[loCode]
        }
      })
    })

    const loadCourses = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'courses'))
        availableCourses.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      } catch (error) {
        console.error('Error loading courses:', error)
      }
    }

    const loadLearningPath = async () => {
      if (!selectedCourseId.value) return

      loading.value = true
      try {
        // โหลด Learning Path ที่ Active
        const q = query(
          collection(db, 'learningPaths'),
          where('studentId', '==', authStore.user.uid),
          where('courseId', '==', selectedCourseId.value),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit(1)
        )

        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          activePath.value = {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data()
          }
        } else {
          activePath.value = null
          // โหลด LOs เพื่อให้เลือก
          await loadAvailableLOs()
        }
      } catch (error) {
        console.error('Error loading learning path:', error)
        // ถ้า error เกี่ยวกับ permissions ให้โหลด LOs ต่อไป
        activePath.value = null
        await loadAvailableLOs()
      } finally {
        loading.value = false
      }
    }

    // ฟังก์ชันใหม่: โหลด Learning Outcomes พร้อม progress
    const loadAvailableLOs = async () => {
      try {
        const selectedCourse = availableCourses.value.find(c => c.id === selectedCourseId.value)
        if (!selectedCourse || !selectedCourse.learningOutcomes) {
          console.log('No course or learning outcomes found')
          return
        }

        // ดึง progress ของนักเรียนคนนี้ (ถ้ามี)
        try {
          const progressDocId = `${authStore.user.uid}_${selectedCourseId.value}`
          const progressRef = collection(db, 'studentProgress')
          const progressQuery = query(progressRef, where('__name__', '==', progressDocId))
          const progressSnap = await getDocs(progressQuery)
          
          const progressData = progressSnap.empty ? null : progressSnap.docs[0].data()

          availableLOs.value = selectedCourse.learningOutcomes.map(lo => {
            const loCode = lo.code || lo.loCode
            const progress = progressData?.loProgress?.[loCode]
            
            return {
              code: loCode,
              description: lo.description || lo.loDescription || 'ไม่มีคำอธิบาย',
              progress: progress ? {
                avgScore: progress.avgScore || 0,
                totalAttempts: progress.totalAttempts || 0,
                passCount: progress.passCount || 0
              } : null
            }
          })
        } catch (progressError) {
          // ถ้าไม่มีสิทธิ์หรือไม่มีข้อมูล progress ก็แสดง LOs แบบไม่มี progress
          console.log('Could not load progress, showing LOs without progress:', progressError.message)
          availableLOs.value = selectedCourse.learningOutcomes.map(lo => ({
            code: lo.code || lo.loCode,
            description: lo.description || lo.loDescription || 'ไม่มีคำอธิบาย',
            progress: null
          }))
        }
      } catch (error) {
        console.error('Error loading LOs:', error)
      }
    }

    const getProgressClass = (progress) => {
      if (!progress || progress.totalAttempts === 0) return 'new'
      const passRate = progress.passCount / progress.totalAttempts
      if (passRate >= 0.7) return 'good'
      if (passRate >= 0.4) return 'fair'
      return 'weak'
    }

    const selectLOAndGenerate = async (loCode) => {
      generating.value = true
      try {
        const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'http://localhost:5001/hots-ai-chatloop/us-central1'
        const response = await fetch(`${functionsUrl}/generateAdaptivePath`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: authStore.user.uid,
            courseId: selectedCourseId.value,
            targetLOs: [loCode] // ส่ง LO ที่เลือก
          })
        })

        const data = await response.json()
        
        if (data.success) {
          await loadLearningPath()
        } else {
          alert('Error: ' + (data.error || 'Failed to generate path'))
        }
      } catch (error) {
        console.error('Error generating path:', error)
        alert('Error: ' + error.message)
      } finally {
        generating.value = false
      }
    }

    const generateAutoPath = async () => {
      generating.value = true
      try {
        const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'http://localhost:5001/hots-ai-chatloop/us-central1'
        const response = await fetch(`${functionsUrl}/generateAdaptivePath`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: authStore.user.uid,
            courseId: selectedCourseId.value
          })
        })

        const data = await response.json()
        
        if (data.success) {
          await loadLearningPath()
        } else {
          alert('Error: ' + (data.error || 'Failed to generate path'))
        }
      } catch (error) {
        console.error('Error generating path:', error)
        alert('Error: ' + error.message)
      } finally {
        generating.value = false
      }
    }

    const completeStep = async () => {
      if (!activePath.value || !currentStep.value) return

      try {
        const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'http://localhost:5001/hots-ai-chatloop/us-central1'
        const response = await fetch(`${functionsUrl}/updateAdaptivePath`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pathId: activePath.value.id,
            stepIndex: currentStepIndex.value,
            completed: true
          })
        })

        const data = await response.json()
        
        if (data.success) {
          await loadLearningPath()
          if (data.status === 'completed') {
            alert('🎉 Congratulations! You completed your learning path!')
          }
        }
      } catch (error) {
        console.error('Error completing step:', error)
        alert('Error: ' + error.message)
      }
    }

    const startQuestion = () => {
      // Navigate to chat with adaptive learning context
      router.push({
        name: 'Chat',
        query: {
          adaptive: 'true',
          pathId: activePath.value.id,
          stepIndex: currentStepIndex.value
        }
      })
    }

    const getStepIcon = (type) => {
      const icons = {
        'micro-lesson': '📚',
        'question-easy': '📝',
        'question-medium': '🎯',
        'question-hard': '🏆'
      }
      return icons[type] || '📌'
    }

    const getStepTitle = (step) => {
      const titles = {
        'micro-lesson': step.title || 'บทเรียนสั้น',
        'question-easy': 'คำถามฝึกหัด (ง่าย)',
        'question-medium': 'คำถามท้าทาย (ปานกลาง)',
        'question-hard': 'คำถาม HOTS ขั้นสูง (ยาก)'
      }
      return titles[step.type] || 'ขั้นตอนการเรียนรู้'
    }

    const formatContent = (content) => {
      if (!content) return ''
      return content.replace(/\n/g, '<br>')
    }

    onMounted(async () => {
      console.log('🎯 AdaptiveLearning mounted')
      await loadCourses()
      
      // ตรวจสอบว่ามี localStorage หรือ query parameters จาก Dashboard หรือไม่
      const storedCourseId = localStorage.getItem('adaptive_courseId')
      const storedTargetLO = localStorage.getItem('adaptive_targetLO')
      const route = router.currentRoute.value
      
      console.log('📦 Stored data:', { storedCourseId, storedTargetLO })
      
      // ใช้ localStorage หรือ query params
      const courseId = route.query.courseId || storedCourseId
      const targetLO = route.query.targetLO || storedTargetLO
      const autoGenerate = route.query.autoGenerate === 'true' || !!storedTargetLO
      
      console.log('🔍 Resolved values:', { courseId, targetLO, autoGenerate })
      
      if (courseId) {
        selectedCourseId.value = courseId
        
        // รอให้โหลด LOs เสร็จก่อน
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // ถ้ามีการส่ง targetLO และ autoGenerate มา ให้สร้าง path ทันที
        if (autoGenerate && targetLO) {
          console.log('🚀 Auto-generating path for LO:', targetLO)
          // Clear localStorage หลังใช้งาน
          localStorage.removeItem('adaptive_targetLO')
          localStorage.removeItem('adaptive_courseId')
          
          await selectLOAndGenerate(targetLO)
        }
      }
    })

    watch(selectedCourseId, () => {
      if (selectedCourseId.value) {
        loadLearningPath()
      }
    })

    return {
      availableCourses,
      selectedCourseId,
      loading,
      generating,
      activePath,
      availableLOs,
      currentStepIndex,
      totalSteps,
      completedSteps,
      progressPercentage,
      currentStep,
      upcomingSteps,
      completedPathSteps,
      targetLODetails,
      loadLearningPath,
      generateAutoPath,
      selectLOAndGenerate,
      getProgressClass,
      completeStep,
      startQuestion,
      getStepIcon,
      getStepTitle,
      formatContent
    }
  }
}
</script>

<style scoped>
.adaptive-learning-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.header {
  margin-bottom: 2rem;
  text-align: center;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header p {
  color: var(--text-secondary);
  font-size: 1.1rem;
  font-weight: 500;
}

/* Course Selector แบบใหม่ - กระชับ */
.course-selector-compact {
  margin-bottom: 2rem;
  display: flex;
  justify-content: center;
}

.course-select-modern {
  padding: 1rem 2rem;
  border: 2px solid #667eea;
  border-radius: 12px;
  font-size: 1.05rem;
  min-width: 400px;
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 600;
}

.course-select-modern:hover {
  border-color: #764ba2;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.course-select-modern:focus {
  outline: none;
  border-color: #764ba2;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* LO Selection Mode */
.lo-selection-mode {
  margin-top: 2rem;
}

.section-intro {
  text-align: center;
  margin-bottom: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 16px;
}

.section-intro h2 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: #fff;
}

.section-intro p {
  color: #cbd5e0;
  font-size: 1.1rem;
}

/* LO Cards Grid */
.lo-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.lo-selection-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.lo-selection-card:hover {
  transform: translateY(-4px);
  border-color: #667eea;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.25);
}

.lo-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.lo-code-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.9rem;
}

.lo-progress-badge {
  padding: 0.3rem 0.6rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.lo-progress-badge.good {
  background: #00b894;
  color: white;
}

.lo-progress-badge.fair {
  background: #fdcb6e;
  color: var(--text-primary);
}

.lo-progress-badge.weak {
  background: #ff7675;
  color: white;
}

.lo-progress-badge.new {
  background: #74b9ff;
  color: white;
}

.lo-title {
  color: #1a202c;
  font-size: 1.1rem;
  margin-bottom: 1rem;
  line-height: 1.5;
  min-height: 3.3em;
  font-weight: 600;
}

.lo-stats {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  color: #2d3748;
  font-size: 0.95rem;
  font-weight: 600;
}

.new-badge {
  color: #667eea;
  font-weight: 700;
}

.lo-card-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
}

.click-hint {
  color: #667eea;
  font-size: 0.9rem;
  font-weight: 600;
}

/* Auto Path Section */
.auto-path-section {
  margin-top: 3rem;
}

.divider {
  text-align: center;
  margin-bottom: 1.5rem;
  position: relative;
}

.divider::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: #cbd5e0;
}

.divider span {
  background: #1a202c;
  padding: 0 1rem;
  position: relative;
  color: #cbd5e0;
  font-weight: 600;
}

.btn-auto-generate {
  display: block;
  margin: 0 auto;
  padding: 1.2rem 2.5rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-auto-generate:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(245, 87, 108, 0.3);
}

.btn-auto-generate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-primary, .btn-complete {
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover, .btn-complete:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress-overview {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
}

.status-badge.active {
  background: #ffeaa7;
  color: #d63031;
}

.status-badge.completed {
  background: #00b894;
  color: white;
}

.progress-bar-container {
  margin-bottom: 2rem;
}

.progress-bar {
  height: 12px;
  background: #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.5s ease;
}

.progress-text {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.target-los h3 {
  margin-bottom: 1rem;
}

.lo-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.lo-chip {
  background: linear-gradient(135deg, rgba(240, 147, 251, 0.25) 0%, rgba(245, 87, 108, 0.25) 100%);
  border: 2px solid #f5576c;
  border-radius: 12px;
  padding: 1rem;
  flex: 1;
  min-width: 250px;
}

.lo-code {
  font-weight: 700;
  color: #f5576c;
  font-size: 1.2rem;
  display: block;
  margin-bottom: 0.5rem;
}

.lo-desc {
  color: #1a202c;
  display: block;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.5;
}

.lo-performance {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.perf-attempts {
  color: #2d3748;
}

.perf-score {
  color: #667eea;
  font-weight: 700;
}

.current-step, .upcoming-steps, .completed-steps {
  margin-bottom: 2rem;
}

.current-step h2, .upcoming-steps h2, .completed-steps h2 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.step-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.step-card.current {
  border: 3px solid #667eea;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.step-card.upcoming {
  opacity: 0.7;
  padding: 1rem;
}

.step-card.completed {
  opacity: 0.6;
  padding: 1rem;
}

.step-icon {
  font-size: 3rem;
  flex-shrink: 0;
}

.step-icon.small {
  font-size: 1.5rem;
}

.step-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #ccc;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-content h3 {
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
}

.step-lo {
  color: #2d3748;
  margin-bottom: 1rem;
  font-weight: 600;
  font-size: 1rem;
}

.lesson-content {
  margin-top: 1.5rem;
}

.lesson-meta {
  color: #2d3748;
  margin-bottom: 1rem;
  font-weight: 600;
}

.lesson-text {
  line-height: 1.8;
  color: #1a202c;
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 12px;
  font-weight: 500;
}

.video-link {
  display: inline-block;
  margin-bottom: 1.5rem;
  padding: 0.75rem 1.5rem;
  background: #ff0000;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  transition: transform 0.2s;
}

.video-link:hover {
  transform: scale(1.05);
}

.question-step {
  margin-top: 1.5rem;
}

.difficulty-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  margin-bottom: 1rem;
}

.difficulty-1, .difficulty-2 {
  background: #00b894;
  color: white;
}

.difficulty-3 {
  background: #fdcb6e;
  color: var(--text-primary);
}

.difficulty-4, .difficulty-5 {
  background: #d63031;
  color: white;
}

.question-type {
  color: #2d3748;
  margin-bottom: 1rem;
  font-weight: 600;
}

.step-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.step-title {
  font-weight: 700;
  color: #1a202c;
  font-size: 1.05rem;
}

.step-lo-code {
  color: #667eea;
  font-size: 0.95rem;
  font-weight: 600;
}

.step-score {
  color: #00b894;
  font-weight: 600;
  font-size: 0.9rem;
}

.loading {
  text-align: center;
  padding: 4rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Dark mode */
.dark-mode .course-select-modern {
  background: #2d3748;
  color: #e2e8f0;
  border-color: #667eea;
}

.dark-mode .section-intro {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
}

.dark-mode .lo-selection-card {
  background: #2d3748;
  color: #e2e8f0;
}

.dark-mode .lo-title {
  color: #f7fafc;
}

.dark-mode .lo-stats {
  color: #cbd5e0;
}

.dark-mode .lo-card-footer {
  border-top-color: #4a5568;
}

.dark-mode .divider::before {
  background: #4a5568;
}

.dark-mode .divider span {
  background: #1a202c;
  color: #a0aec0;
}

.dark-mode .progress-overview,
.dark-mode .step-card {
  background: #2d3748;
  color: #e2e8f0;
}

.dark-mode .lo-chip {
  background: linear-gradient(135deg, rgba(240, 147, 251, 0.15) 0%, rgba(245, 87, 108, 0.15) 100%);
}

.dark-mode .lo-desc {
  color: #e2e8f0;
}

.dark-mode .perf-attempts {
  color: #cbd5e0;
}

.dark-mode .lesson-text {
  background: #1a202c;
  color: #e2e8f0;
}

.dark-mode .step-title {
  color: #f7fafc;
}

.dark-mode .step-lo,
.dark-mode .lesson-meta,
.dark-mode .question-type {
  color: #cbd5e0;
}
</style>
