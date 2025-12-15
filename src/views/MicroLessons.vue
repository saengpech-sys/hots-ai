<template>
  <div class="micro-lessons-container">
    <div class="header">
      <h1>📚 Micro-Lessons Management</h1>
      <p>Create bite-sized learning content for adaptive learning paths</p>
    </div>

    <!-- Course Selection -->
    <div class="course-selector">
      <label>Select Course:</label>
      <select v-model="selectedCourseId" @change="loadMicroLessons">
        <option value="">-- Select Course --</option>
        <option v-for="course in courses" :key="course.id" :value="course.id">
          {{ course.courseCode }} - {{ course.courseName }}
        </option>
      </select>
    </div>

    <div v-if="selectedCourseId" class="content">
      <!-- Actions -->
      <div class="actions">
        <button @click="showCreateDialog = true" class="btn-primary">
          ➕ Create Micro-Lesson
        </button>
        <button @click="generateWithAI" class="btn-ai" :disabled="loading">
          🤖 Generate with AI
        </button>
      </div>

      <!-- Micro-Lessons List -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Loading micro-lessons...</p>
      </div>

      <div v-else-if="microLessons.length === 0" class="empty-state">
        <p>📝 No micro-lessons yet. Create your first one!</p>
      </div>

      <div v-else class="lessons-grid">
        <div v-for="lesson in microLessons" :key="lesson.id" class="lesson-card">
          <div class="lesson-header">
            <h3>{{ lesson.title }}</h3>
            <div class="lesson-meta">
              <span class="time">⏱️ {{ lesson.estimatedMinutes || 5 }} min</span>
              <span class="lo-tags">
                <span v-for="lo in lesson.relatedLOs" :key="lo" class="lo-tag">
                  {{ lo }}
                </span>
              </span>
            </div>
          </div>

          <div class="lesson-content">
            <div v-if="lesson.contentType === 'text'" class="content-text">
              {{ lesson.content.substring(0, 200) }}{{ lesson.content.length > 200 ? '...' : '' }}
            </div>
            <div v-else-if="lesson.contentType === 'video'" class="content-video">
              🎥 Video: {{ lesson.videoUrl }}
            </div>
            <div v-else-if="lesson.contentType === 'mixed'" class="content-mixed">
              📝 Text + 🎥 Video
            </div>
          </div>

          <div class="lesson-actions">
            <button @click="editLesson(lesson)" class="btn-edit">✏️ Edit</button>
            <button @click="viewLesson(lesson)" class="btn-view">👁️ View</button>
            <button @click="deleteLesson(lesson.id)" class="btn-delete">🗑️ Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <div v-if="showCreateDialog || editingLesson" class="modal-overlay" @click.self="closeDialog">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editingLesson ? 'Edit' : 'Create' }} Micro-Lesson</h2>
          <button @click="closeDialog" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Title *</label>
            <input v-model="lessonForm.title" type="text" placeholder="e.g., Introduction to Python Loops" />
          </div>

          <div class="form-group">
            <label>Content Type *</label>
            <select v-model="lessonForm.contentType">
              <option value="text">Text Only</option>
              <option value="video">Video Only</option>
              <option value="mixed">Text + Video</option>
            </select>
          </div>

          <div v-if="lessonForm.contentType === 'text' || lessonForm.contentType === 'mixed'" class="form-group">
            <label>Text Content *</label>
            <textarea v-model="lessonForm.content" rows="10" 
                      placeholder="Write the lesson content here..."></textarea>
          </div>

          <div v-if="lessonForm.contentType === 'video' || lessonForm.contentType === 'mixed'" class="form-group">
            <label>Video URL</label>
            <input v-model="lessonForm.videoUrl" type="url" 
                   placeholder="https://youtube.com/watch?v=..." />
          </div>

          <div class="form-group">
            <label>Related Learning Outcomes *</label>
            <div class="lo-checkboxes">
              <label v-for="lo in currentCourseLOs" :key="lo.code" class="checkbox-label">
                <input type="checkbox" :value="lo.code" v-model="lessonForm.relatedLOs" />
                {{ lo.code }}: {{ lo.description }}
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Estimated Time (minutes)</label>
            <input v-model.number="lessonForm.estimatedMinutes" type="number" min="1" max="60" />
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="lessonForm.isPublic" />
              🌐 Share to National PLC Library (Public)
            </label>
            <p class="help-text">Allow other teachers to view and use this lesson.</p>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeDialog" class="btn-secondary">Cancel</button>
          <button @click="saveLesson" class="btn-primary" :disabled="!isFormValid">
            {{ editingLesson ? 'Update' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

    <!-- View Lesson Modal -->
    <div v-if="viewingLesson" class="modal-overlay" @click.self="viewingLesson = null">
      <div class="modal-content modal-view">
        <div class="modal-header">
          <h2>{{ viewingLesson.title }}</h2>
          <button @click="viewingLesson = null" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <div class="view-meta">
            <span>⏱️ {{ viewingLesson.estimatedMinutes }} minutes</span>
            <span>📚 LOs: {{ viewingLesson.relatedLOs.join(', ') }}</span>
          </div>

          <div v-if="viewingLesson.contentType === 'text' || viewingLesson.contentType === 'mixed'" 
               class="view-content">
            <h3>Content</h3>
            <div class="content-text" v-html="formatContent(viewingLesson.content)"></div>
          </div>

          <div v-if="viewingLesson.contentType === 'video' || viewingLesson.contentType === 'mixed'" 
               class="view-video">
            <h3>Video</h3>
            <a :href="viewingLesson.videoUrl" target="_blank">{{ viewingLesson.videoUrl }}</a>
          </div>
        </div>

        <div class="modal-footer">
          <!-- 🆕 Completion Tracking for Students -->
          <div v-if="isStudent && viewingLesson" class="completion-actions">
            <button 
              v-if="!isLessonCompleted(viewingLesson.id)"
              @click="markLessonComplete(viewingLesson.id)"
              class="btn-success"
              :disabled="completingLesson"
            >
              ✅ {{ completingLesson ? 'กำลังบันทึก...' : 'ทำเสร็จแล้ว' }}
            </button>
            <div v-else class="completed-badge">
              <span class="checkmark">✓</span>
              <span>เสร็จเรียบร้อย</span>
            </div>
            <div class="lesson-rating">
              <span>ให้คะแนน:</span>
              <button 
                v-for="star in 5" 
                :key="star"
                @click="rateLesson(viewingLesson.id, star)"
                class="star-btn"
                :class="{ active: star <= (getLessonRating(viewingLesson.id) || 0) }"
              >
                ⭐
              </button>
            </div>
          </div>
          <button @click="viewingLesson = null" class="btn-primary">ปิด</button>
        </div>
      </div>
    </div>

    <!-- AI Generate Modal -->
    <div v-if="showAIDialog" class="modal-overlay" @click.self="showAIDialog = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>🤖 Generate Micro-Lessons with AI</h2>
          <button @click="showAIDialog = false" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Select Learning Outcomes to generate lessons for:</label>
            <div class="lo-checkboxes">
              <label v-for="lo in currentCourseLOs" :key="lo.code" class="checkbox-label">
                <input type="checkbox" :value="lo.code" v-model="aiGenerateLOs" />
                {{ lo.code }}: {{ lo.description }}
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Additional Instructions (optional):</label>
            <textarea v-model="aiInstructions" rows="4" 
                      placeholder="e.g., Focus on beginners, include examples..."></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="showAIDialog = false" class="btn-secondary">Cancel</button>
          <button @click="executeAIGenerate" class="btn-ai" :disabled="aiGenerating || aiGenerateLOs.length === 0">
            {{ aiGenerating ? 'Generating...' : 'Generate' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'MicroLessons',
  setup() {
    const authStore = useAuthStore()
    const courses = ref([])
    const selectedCourseId = ref('')
    const microLessons = ref([])
    const loading = ref(false)
    const showCreateDialog = ref(false)
    const editingLesson = ref(null)
    const viewingLesson = ref(null)
    const showAIDialog = ref(false)
    const aiGenerating = ref(false)
    const aiGenerateLOs = ref([])
    const aiInstructions = ref('')
    
    // 🆕 Lesson Completion Tracking
    const completedLessons = ref([])
    const lessonRatings = ref({})
    const completingLesson = ref(false)
    const lessonStartTime = ref(null)

    const lessonForm = ref({
      title: '',
      contentType: 'text',
      content: '',
      videoUrl: '',
      relatedLOs: [],
      estimatedMinutes: 5,
      isPublic: false
    })    // Check if user is student
    const isStudent = computed(() => authStore.userProfile?.role === 'student')

    const currentCourseLOs = computed(() => {
      const course = courses.value.find(c => c.id === selectedCourseId.value)
      return course?.learningOutcomes || []
    })

    const isFormValid = computed(() => {
      return lessonForm.value.title && 
             lessonForm.value.relatedLOs.length > 0 &&
             (lessonForm.value.contentType === 'text' ? lessonForm.value.content : true) &&
             (lessonForm.value.contentType === 'video' ? lessonForm.value.videoUrl : true)
    })

    const loadCourses = async () => {
      try {
        const q = query(collection(db, 'courses'), where('teacherId', '==', authStore.user.uid))
        const snapshot = await getDocs(q)
        courses.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      } catch (error) {
        console.error('Error loading courses:', error)
      }
    }

    const loadMicroLessons = async () => {
      if (!selectedCourseId.value) return
      
      loading.value = true
      try {
        const q = query(collection(db, 'microLessons'), where('courseId', '==', selectedCourseId.value))
        const snapshot = await getDocs(q)
        microLessons.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      } catch (error) {
        console.error('Error loading micro-lessons:', error)
      } finally {
        loading.value = false
      }
    }

    const closeDialog = () => {
      showCreateDialog.value = false
      editingLesson.value = null
      lessonForm.value = {
        title: '',
        contentType: 'text',
        content: '',
        videoUrl: '',
        relatedLOs: [],
        estimatedMinutes: 5,
        isPublic: false
      }
    }

    const editLesson = (lesson) => {
      editingLesson.value = lesson
      lessonForm.value = {
        title: lesson.title,
        contentType: lesson.contentType,
        content: lesson.content || '',
        videoUrl: lesson.videoUrl || '',
        relatedLOs: [...lesson.relatedLOs],
        estimatedMinutes: lesson.estimatedMinutes || 5,
        isPublic: lesson.isPublic || false
      }
    }

    const viewLesson = (lesson) => {
      viewingLesson.value = lesson
    }

    const saveLesson = async () => {
      try {
        const lessonData = {
          ...lessonForm.value,
          courseId: selectedCourseId.value,
          teacherId: authStore.user.uid,
          updatedAt: serverTimestamp(),
          schoolName: authStore.userProfile?.organizationName || '',
          teacherName: authStore.userProfile?.displayName || authStore.user?.displayName || 'Unknown Teacher'
        }

        if (editingLesson.value) {
          await updateDoc(doc(db, 'microLessons', editingLesson.value.id), lessonData)
          alert('Micro-lesson updated successfully!')
        } else {
          lessonData.createdAt = serverTimestamp()
          await addDoc(collection(db, 'microLessons'), lessonData)
          alert('Micro-lesson created successfully!')
        }

        closeDialog()
        loadMicroLessons()
      } catch (error) {
        console.error('Error saving lesson:', error)
        alert('Error: ' + error.message)
      }
    }

    const deleteLesson = async (lessonId) => {
      if (!confirm('Are you sure you want to delete this micro-lesson?')) return

      try {
        await deleteDoc(doc(db, 'microLessons', lessonId))
        alert('Micro-lesson deleted successfully!')
        loadMicroLessons()
      } catch (error) {
        console.error('Error deleting lesson:', error)
        alert('Error: ' + error.message)
      }
    }

    const generateWithAI = () => {
      showAIDialog.value = true
      aiGenerateLOs.value = []
      aiInstructions.value = ''
    }

    const executeAIGenerate = async () => {
      if (aiGenerateLOs.value.length === 0) {
        alert('กรุณาเลือก Learning Outcomes อย่างน้อย 1 ข้อ')
        return
      }

      aiGenerating.value = true
      try {
        const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-chatloop.cloudfunctions.net'
        
        const response = await fetch(`${functionsUrl}/generateMicroLesson`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            courseId: selectedCourseId.value,
            learningOutcomes: aiGenerateLOs.value,
            additionalInstructions: aiInstructions.value,
            teacherId: authStore.user.uid
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'การสร้าง Micro-Lesson ล้มเหลว')
        }

        alert(`✨ สร้าง ${data.count} Micro-Lessons สำเร็จ!`)
        showAIDialog.value = false
        aiGenerateLOs.value = []
        aiInstructions.value = ''
        loadMicroLessons()

      } catch (error) {
        console.error('AI Generate error:', error)
        alert('เกิดข้อผิดพลาด: ' + error.message)
      } finally {
        aiGenerating.value = false
      }
    }

    const formatContent = (content) => {
      return content.replace(/\n/g, '<br>')
    }
    
    // 🆕 Lesson Completion Functions
    const loadLessonCompletions = async () => {
      if (!isStudent.value || !authStore.user?.uid) return
      
      try {
        const q = query(
          collection(db, 'lessonCompletions'),
          where('studentId', '==', authStore.user.uid)
        )
        const snapshot = await getDocs(q)
        completedLessons.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        // Build ratings map
        completedLessons.value.forEach(completion => {
          if (completion.rating) {
            lessonRatings.value[completion.lessonId] = completion.rating
          }
        })
      } catch (error) {
        console.error('Error loading completions:', error)
      }
    }
    
    const isLessonCompleted = (lessonId) => {
      return completedLessons.value.some(c => c.lessonId === lessonId)
    }
    
    const getLessonRating = (lessonId) => {
      return lessonRatings.value[lessonId] || 0
    }
    
    const markLessonComplete = async (lessonId) => {
      if (!isStudent.value || !authStore.user?.uid) return
      
      completingLesson.value = true
      try {
        const lesson = microLessons.value.find(l => l.id === lessonId)
        if (!lesson) return
        
        // Calculate time spent (if tracking started)
        let timeSpent = lesson.estimatedMinutes || 5
        if (lessonStartTime.value) {
          timeSpent = Math.round((Date.now() - lessonStartTime.value) / 60000) // minutes
        }
        
        // Create completion record
        await addDoc(collection(db, 'lessonCompletions'), {
          studentId: authStore.user.uid,
          lessonId: lessonId,
          courseId: selectedCourseId.value,
          loCode: lesson.relatedLOs[0] || null, // Primary LO
          completedAt: serverTimestamp(),
          timeSpentMinutes: timeSpent,
          rating: null
        })
        
        // Reload completions
        await loadLessonCompletions()
        
        // Show success message
        alert('✅ บันทึกการเรียนจบเรียบร้อย! เยี่ยมมาก! 🎉')
        
      } catch (error) {
        console.error('Error marking lesson complete:', error)
        alert('เกิดข้อผิดพลาดในการบันทึก')
      } finally {
        completingLesson.value = false
      }
    }
    
    const rateLesson = async (lessonId, rating) => {
      if (!isStudent.value || !authStore.user?.uid) return
      
      try {
        // Find completion record
        const completion = completedLessons.value.find(c => c.lessonId === lessonId)
        if (!completion) {
          alert('กรุณาทำเครื่องหมายบทเรียนเป็นเสร็จก่อนให้คะแนน')
          return
        }
        
        // Update rating
        await updateDoc(doc(db, 'lessonCompletions', completion.id), {
          rating: rating
        })
        
        lessonRatings.value[lessonId] = rating
        alert(`⭐ ให้คะแนน ${rating} ดาวเรียบร้อย! ขอบคุณสำหรับความคิดเห็น`)
        
      } catch (error) {
        console.error('Error rating lesson:', error)
        alert('เกิดข้อผิดพลาดในการให้คะแนน')
      }
    }
    
    // Override viewLesson to track start time
    const originalViewLesson = viewLesson
    const trackViewLesson = (lesson) => {
      if (isStudent.value) {
        lessonStartTime.value = Date.now()
      }
      originalViewLesson(lesson)
    }

    onMounted(() => {
      loadCourses()
      if (isStudent.value) {
        loadLessonCompletions()
      }
    })

    return {
      courses,
      selectedCourseId,
      microLessons,
      loading,
      showCreateDialog,
      editingLesson,
      viewingLesson,
      showAIDialog,
      aiGenerating,
      aiGenerateLOs,
      aiInstructions,
      lessonForm,
      currentCourseLOs,
      isFormValid,
      isStudent,
      completingLesson,
      loadMicroLessons,
      closeDialog,
      editLesson,
      viewLesson: trackViewLesson,
      saveLesson,
      deleteLesson,
      generateWithAI,
      executeAIGenerate,
      formatContent,
      isLessonCompleted,
      getLessonRating,
      markLessonComplete,
      rateLesson
    }
  }
}
</script>

<style scoped>
.micro-lessons-container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;

  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.header {
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.header p {
  color: var(--text-secondary);
}

.course-selector {
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.course-selector label {
  font-weight: 600;
}

.course-selector select {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  min-width: 300px;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.btn-primary, .btn-ai, .btn-secondary, .btn-edit, .btn-view, .btn-delete {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-ai {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-secondary {
  background: #f0f0f0;
  color: var(--text-primary);
}

.btn-edit {
  background: #ffc107;
  color: white;
  padding: 0.5rem 1rem;
}

.btn-view {
  background: #17a2b8;
  color: white;
  padding: 0.5rem 1rem;
}

.btn-delete {
  background: #dc3545;
  color: white;
  padding: 0.5rem 1rem;
}

.btn-primary:hover, .btn-ai:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.btn-primary:disabled, .btn-ai:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 3rem;
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

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
  font-size: 1.2rem;
}

.lessons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.lesson-card {
  background: var(--card-bg);
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s;
}

.lesson-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-4px);
}

.lesson-header h3 {
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.lesson-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.time {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.lo-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.lo-tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
}

.lesson-content {
  margin: 1rem 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.lesson-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
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
  background: var(--card-bg);
  border-radius: 12px;
  max-width: 700px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-view {
  max-width: 900px;
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
  color: var(--text-secondary);
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

.lo-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input {
  width: auto;
}

.view-meta {
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.view-content,
.view-video {
  margin-top: 1.5rem;
}

.view-content h3,
.view-video h3 {
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.content-text {
  line-height: 1.8;
  color: var(--text-primary);
}

/* Dark mode support */
.dark-mode .lesson-card,
.dark-mode .modal-content {
  background: #2d3748;
  border-color: #4a5568;
}

.dark-mode .lesson-card h3,
.dark-mode .modal-header h2,
.dark-mode .view-content h3,
.dark-mode .view-video h3 {
  color: #e2e8f0;
}

.dark-mode .lesson-content,
.dark-mode .content-text {
  color: #cbd5e0;
}

.dark-mode .form-group input,
.dark-mode .form-group textarea,
.dark-mode .form-group select {
  background: #1a202c;
  border-color: #4a5568;
  color: #e2e8f0;
}

.dark-mode .view-meta {
  background: #1a202c;
  color: #cbd5e0;
}

.dark-mode .view-meta span {
  color: #e2e8f0;
}

.dark-mode .modal-header,
.dark-mode .modal-footer {
  border-color: #4a5568;
}

.dark-mode .close-btn {
  color: #cbd5e0;
}

/* 🆕 Lesson Completion Styles */
.completion-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-right: auto;
  flex-wrap: wrap;
}

.btn-success {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-success:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-success:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.completed-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2));
  border: 2px solid #10b981;
  border-radius: 8px;
  font-weight: 600;
  color: #10b981;
}

.completed-badge .checkmark {
  font-size: 1.5rem;
  animation: checkmark-pop 0.4s ease;
}

@keyframes checkmark-pop {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.lesson-rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.lesson-rating span {
  font-weight: 600;
  color: var(--text-secondary);
}

.star-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.3;
  filter: grayscale(1);
}

.star-btn.active {
  opacity: 1;
  filter: grayscale(0);
  transform: scale(1.1);
}

.star-btn:hover {
  transform: scale(1.2);
  opacity: 1;
  filter: grayscale(0);
}

.dark-mode .completed-badge {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15));
  color: #34d399;
  border-color: #34d399;
}
</style>
