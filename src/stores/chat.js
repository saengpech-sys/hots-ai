import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuthStore } from './auth'

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore()
  
  const currentSession = ref(null)
  const messages = ref([])
  const assessments = ref([])
  const loading = ref(false)
  const error = ref(null)
  const currentQuestion = ref(null)
  
  let unsubscribeMessages = null
  let unsubscribeAssessments = null

  // HOTS Starter Questions - คำถามเริ่มต้นหลากหลายหมวดหมู่
  const starterQuestions = [
    // วิทยาศาสตร์และสิ่งแวดล้อม
    {
      id: 1,
      category: 'วิทยาศาสตร์',
      question: 'ถ้าโลกไม่มีแรงโน้มถ่วง ชีวิตประจำวันของมนุษย์จะเปลี่ยนแปลงไปอย่างไร? ลองวิเคราะห์ทั้งด้านดีและด้านที่ท้าทาย',
      hint: 'คิดถึงการเคลื่อนไหว อาหาร น้ำ สุขภาพ การสื่อสาร'
    },
    {
      id: 2,
      category: 'สิ่งแวดล้อม',
      question: 'หากคุณเป็นนายกรัฐมนตรี คุณจะแก้ปัญหาขยะพลาสติกในทะเลอย่างไร? เสนอแผนที่สมเหตุสมผลและสามารถทำได้จริง',
      hint: 'พิจารณาทั้งการป้องกัน แก้ไข และการสร้างจิตสำนึก'
    },
    // สังคมและการใช้ชีวิต
    {
      id: 3,
      category: 'สังคม',
      question: 'โซเชียลมีเดียทำให้คนเราโดดเดี่ยวมากขึ้นหรือเชื่อมโยงกันมากขึ้น? ให้เหตุผลและยกตัวอย่างประกอบ',
      hint: 'พิจารณาทั้งสองมุมมอง แล้วสรุปความคิดเห็นของคุณ'
    },
    {
      id: 4,
      category: 'ชีวิตประจำวัน',
      question: 'ถ้าคุณสามารถเปลี่ยนกฎหมายอย่างหนึ่งในประเทศไทยได้ คุณจะเลือกอะไรและทำไม? จะส่งผลกระทบอย่างไร?',
      hint: 'คิดถึงผลกระทบต่อคน เศรษฐกิจ สังคม'
    },
    // เทคโนโลยีและอนาคต
    {
      id: 5,
      category: 'เทคโนโลยี',
      question: 'AI กำลังเข้ามาแทนที่งานของมนุษย์มากขึ้น คุณคิดว่าอาชีพใดที่ AI แทนที่ไม่ได้? ทำไม?',
      hint: 'พิจารณาทักษะที่เป็นเอกลักษณ์ของมนุษย์'
    },
    {
      id: 6,
      category: 'อนาคต',
      question: 'หากมีโอกาสเดินทางข้ามเวลาไปอนาคต 50 ปี คุณคิดว่าโลกจะเปลี่ยนแปลงไปอย่างไร? วิเคราะห์ 3 ด้านที่สำคัญ',
      hint: 'คิดถึงเทคโนโลยี สิ่งแวดล้อม สังคม การศึกษา'
    },
    // จริยธรรมและคุณค่า
    {
      id: 7,
      category: 'จริยธรรม',
      question: 'ในสถานการณ์ที่คุณต้องเลือกระหว่าง "ความซื่อสัตย์" กับ "ไม่ทำให้คนที่รักเสียใจ" คุณจะเลือกอย่างไร? ทำไม?',
      hint: 'ไม่มีคำตอบที่ถูกเพียงอย่างเดียว สำคัญที่เหตุผล'
    },
    {
      id: 8,
      category: 'ปรัชญา',
      question: 'ความสำเร็จในชีวิตวัดด้วยอะไร? เงิน ชื่อเสียง ความสุข หรืออย่างอื่น? อธิบายมุมมองของคุณ',
      hint: 'ไม่มีคำตอบเดียว ให้เหตุผลที่สมเหตุสมผล'
    },
    // การศึกษาและการเรียนรู้
    {
      id: 9,
      category: 'การศึกษา',
      question: 'ถ้าคุณสามารถออกแบบโรงเรียนในฝันได้ คุณจะเปลี่ยนแปลงอะไรบ้างจากโรงเรียนปัจจุบัน? ทำไม?',
      hint: 'คิดถึงการเรียนการสอน ตารางเวลา การประเมินผล'
    },
    {
      id: 10,
      category: 'ทักษะ',
      question: 'ทักษะอะไรที่สำคัญที่สุดในศตวรรษที่ 21 และเราควรเรียนรู้อย่างไร? ให้เหตุผลและวิธีการ',
      hint: 'พิจารณาทักษะที่ใช้ได้จริงในชีวิตและอาชีพ'
    }
  ]

  // เลือกคำถามแบบสุ่ม
  function getRandomQuestion() {
    const randomIndex = Math.floor(Math.random() * starterQuestions.length)
    return starterQuestions[randomIndex]
  }

  // Get unused question from Firestore (prioritize weak LOs)
  async function getUnusedQuestion(studentId, courseId) {
    try {
      const { getDocs } = await import('firebase/firestore')
      
      // 1. ดึงความก้าวหน้าของนักเรียนในรายวิชานี้
      const progressRef = collection(db, 'studentProgress')
      const progressQuery = query(
        progressRef,
        where('studentId', '==', studentId),
        where('courseId', '==', courseId)
      )
      const progressSnapshot = await getDocs(progressQuery)
      
      // หา LO ที่ยังไม่ผ่าน (mastery < 70%)
      const weakLOs = []
      if (!progressSnapshot.empty) {
        const progressData = progressSnapshot.docs[0].data()
        if (progressData.loProgress) {
          Object.entries(progressData.loProgress).forEach(([loCode, loData]) => {
            if (loData.mastery < 70) {
              weakLOs.push(loCode)
            }
          })
        }
      }
      
      // 2. ดึงคำถามทั้งหมดของ course นี้
      const questionsRef = collection(db, 'questions')
      const questionsQuery = query(
        questionsRef,
        where('courseId', '==', courseId)
      )
      const questionsSnapshot = await getDocs(questionsQuery)
      
      if (questionsSnapshot.empty) {
        return null
      }

      // 3. ดึงประวัติการทำข้อสอบของนักเรียน
      const assessmentsRef = collection(db, 'assessments')
      const assessmentsQuery = query(
        assessmentsRef,
        where('studentId', '==', studentId),
        where('courseId', '==', courseId)
      )
      const assessmentsSnapshot = await getDocs(assessmentsQuery)
      
      // สร้าง Set ของ questionId ที่ทำแล้ว
      const usedQuestionIds = new Set()
      assessmentsSnapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.questionId) {
          usedQuestionIds.add(data.questionId)
        }
      })

      // 4. หาคำถามที่ยังไม่ได้ทำ (และไม่มีเฉลย)
      const unusedQuestions = questionsSnapshot.docs
        .filter(doc => {
          const data = doc.data()
          // ต้องไม่ถูกใช้แล้ว และไม่มีเฉลย
          return !usedQuestionIds.has(doc.id) && !data.hasSolution
        })
        .map(doc => ({ id: doc.id, ...doc.data() }))

      if (unusedQuestions.length === 0) {
        // ทำหมดแล้ว หรือมีแต่คำถามที่มีเฉลย - สุ่มคำถามที่ทำน้อยที่สุด (ที่ไม่มีเฉลย)
        const allQuestionsWithoutSolution = questionsSnapshot.docs
          .filter(doc => !doc.data().hasSolution)
          .map(doc => ({ id: doc.id, ...doc.data() }))
        
        if (allQuestionsWithoutSolution.length === 0) {
          console.warn('⚠️ No questions available (all have solutions)')
          return null
        }
        
        allQuestionsWithoutSolution.sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0))
        
        // อัพเดท usageCount
        await updateDoc(doc(db, 'questions', allQuestionsWithoutSolution[0].id), {
          usageCount: (allQuestionsWithoutSolution[0].usageCount || 0) + 1
        })
        
        return allQuestionsWithoutSolution[0]
      }

      // 5. เลือกคำถามตาม priority
      let selectedQuestion = null
      
      // Priority 1: คำถามที่ตรงกับ LO ที่ยังไม่ผ่าน
      if (weakLOs.length > 0) {
        const targetQuestions = unusedQuestions.filter(q => {
          const relatedLOs = q.relatedLOs || []
          // เช็คว่าคำถามนี้เกี่ยวข้องกับ LO ที่อ่อนหรือไม่
          return relatedLOs.some(lo => weakLOs.includes(lo))
        })
        
        if (targetQuestions.length > 0) {
          // สุ่มจากคำถามที่ตรงกับ LO ที่อ่อน
          const randomIndex = Math.floor(Math.random() * targetQuestions.length)
          selectedQuestion = targetQuestions[randomIndex]
          console.log(`🎯 Selected question targeting weak LOs: ${weakLOs.join(', ')}`)
        }
      }
      
      // Priority 2: ถ้าไม่มีคำถามตรงกับ LO ที่อ่อน ให้สุ่มจากทั้งหมด
      if (!selectedQuestion) {
        const randomIndex = Math.floor(Math.random() * unusedQuestions.length)
        selectedQuestion = unusedQuestions[randomIndex]
        console.log('📝 Selected random unused question')
      }

      // อัพเดท usageCount
      await updateDoc(doc(db, 'questions', selectedQuestion.id), {
        usageCount: (selectedQuestion.usageCount || 0) + 1
      })

      return selectedQuestion
    } catch (error) {
      console.error('Error getting unused question:', error)
      return null
    }
  }

  // 🆕 Get unused question with specific Learning Outcomes (for Adaptive Learning)
  async function getUnusedQuestionWithLOs(studentId, courseId, targetLOs, difficulty = null) {
    try {
      const { getDocs } = await import('firebase/firestore')
      
      console.log('🔍 Searching for question with LOs:', targetLOs, 'difficulty:', difficulty)
      
      // 1. ดึงคำถามทั้งหมดของ course นี้
      const questionsRef = collection(db, 'questions')
      const questionsQuery = query(
        questionsRef,
        where('courseId', '==', courseId)
      )
      const questionsSnapshot = await getDocs(questionsQuery)
      
      if (questionsSnapshot.empty) {
        console.log('❌ No questions found in course')
        return null
      }

      // 2. ดึงประวัติการทำข้อสอบของนักเรียน
      const assessmentsRef = collection(db, 'assessments')
      const assessmentsQuery = query(
        assessmentsRef,
        where('studentId', '==', studentId),
        where('courseId', '==', courseId)
      )
      const assessmentsSnapshot = await getDocs(assessmentsQuery)
      
      // สร้าง Set ของ questionId ที่ทำแล้ว
      const usedQuestionIds = new Set()
      assessmentsSnapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.questionId) {
          usedQuestionIds.add(data.questionId)
        }
      })

      // 3. กรองคำถามที่ตรงเงื่อนไข
      const matchingQuestions = questionsSnapshot.docs
        .filter(doc => {
          const data = doc.data()
          
          // ต้องไม่มีเฉลย
          if (data.hasSolution) return false
          
          // ต้องมี relatedLOs ที่ตรงกับ targetLOs
          const relatedLOs = data.relatedLOs || []
          const hasMatchingLO = targetLOs.some(targetLO => relatedLOs.includes(targetLO))
          if (!hasMatchingLO) return false
          
          // ถ้าระบุ difficulty ให้เช็คด้วย (optional)
          if (difficulty && data.difficulty && data.difficulty !== difficulty) {
            return false
          }
          
          return true
        })
        .map(doc => ({ id: doc.id, ...doc.data() }))

      console.log(`✅ Found ${matchingQuestions.length} matching questions`)

      if (matchingQuestions.length === 0) {
        return null
      }

      // 4. เลือกคำถาม - ลำดับความสำคัญ
      // Priority 1: ยังไม่เคยทำ
      const unusedMatching = matchingQuestions.filter(q => !usedQuestionIds.has(q.id))
      
      let selectedQuestion
      if (unusedMatching.length > 0) {
        // สุ่มจากคำถามที่ยังไม่ทำ
        const randomIndex = Math.floor(Math.random() * unusedMatching.length)
        selectedQuestion = unusedMatching[randomIndex]
        console.log('🎯 Selected unused question with matching LOs')
      } else {
        // Priority 2: เคยทำแล้ว เลือกที่ทำน้อยที่สุด
        matchingQuestions.sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0))
        selectedQuestion = matchingQuestions[0]
        console.log('🔄 Selected least-used question (already attempted)')
      }

      // อัพเดท usageCount
      await updateDoc(doc(db, 'questions', selectedQuestion.id), {
        usageCount: (selectedQuestion.usageCount || 0) + 1
      })

      return selectedQuestion
    } catch (error) {
      console.error('Error getting unused question with LOs:', error)
      return null
    }
  }

  // Start new chat session
  async function startSession(courseId = null) {
    try {
      loading.value = true
      error.value = null

      // Get course data if courseId provided
      let courseData = null
      if (courseId) {
        const courseDoc = await getDoc(doc(db, 'courses', courseId))
        if (courseDoc.exists()) {
          courseData = { id: courseDoc.id, ...courseDoc.data() }
        }
      }

      const sessionData = {
        studentId: authStore.user.uid,
        studentName: authStore.userProfile.displayName || authStore.user.displayName,
        courseId: courseId || null,
        courseName: courseData?.courseName || null,
        startedAt: serverTimestamp(),
        endedAt: null,
        status: 'active',
        messageCount: 0
      }

      const sessionRef = await addDoc(collection(db, 'sessions'), sessionData)
      currentSession.value = {
        id: sessionRef.id,
        ...sessionData,
        courseData
      }

      // Subscribe to messages
      subscribeToMessages(sessionRef.id)
      
      // สร้าง welcome message พร้อม LO context
      let welcomeText = `สวัสดีค่ะ! 👋 ฉันคือ AI ผู้ช่วยประเมินทักษะการคิดขั้นสูง\n\n`
      
      if (courseData) {
        welcomeText += `📚 **รายวิชา:** ${courseData.courseCode} - ${courseData.courseName}\n\n`
        welcomeText += `📖 ${courseData.courseDescription}\n\n`
        
        if (courseData.learningOutcomes && courseData.learningOutcomes.length > 0) {
          welcomeText += `🎯 **Learning Outcomes ที่จะประเมิน:**\n`
          courseData.learningOutcomes.forEach(lo => {
            const code = lo.code || lo.loCode || 'LO'
            const description = lo.description || lo.loDescription || 'No description'
            welcomeText += `• ${code}: ${description}\n`
          })
          welcomeText += `\n`
        }
      }
      
      // ดึงคำถามจาก Firestore (ที่ยังไม่เคยทำ)
      let question = null
      if (courseId) {
        question = await getUnusedQuestion(authStore.user.uid, courseId)
      }
      
      // ถ้าไม่มีคำถามใน Firestore หรือทำหมดแล้ว ใช้คำถามสำรอง
      if (!question) {
        question = getRandomQuestion()
      }
      
      currentQuestion.value = question
      
      // สร้างข้อความคำถาม
      let questionText = welcomeText + `วันนี้เรามาฝึกคิดวิเคราะห์กันนะคะ\n\n📚 หมวดหมู่: ${question.category}\n\n`
      
      // แสดง LO ที่คำถามนี้วัด (ถ้ามี)
      if (question.relatedLOs && question.relatedLOs.length > 0) {
        questionText += `🎯 **คำถามนี้จะประเมิน Learning Outcomes:**\n`
        
        // ดึงรายละเอียด LO จาก courseData ถ้ามี
        if (courseData && courseData.learningOutcomes) {
          question.relatedLOs.forEach(loCode => {
            const loDetail = courseData.learningOutcomes.find(lo => 
              (lo.code || lo.loCode) === loCode
            )
            if (loDetail) {
              const description = loDetail.description || loDetail.loDescription || ''
              questionText += `• ${loCode}: ${description}\n`
            } else {
              questionText += `• ${loCode}\n`
            }
          })
        } else {
          // ถ้าไม่มี courseData แสดงแค่ code
          question.relatedLOs.forEach(loCode => {
            questionText += `• ${loCode}\n`
          })
        }
        questionText += `\n`
      }
      
      questionText += `❓ **คำถาม:**\n${question.question}\n\n💡 คำใบ้: ${question.hint}\n\n---\n\nคิดดีๆ แล้วตอบมาได้เลยค่ะ ไม่มีคำตอบที่ผิดหรือถูก สำคัญที่เหตุผลและการวิเคราะห์ของคุณ 😊`
      
      // Add welcome message with question
      await addMessage({
        sessionId: sessionRef.id,
        from: 'bot',
        text: questionText,
        type: 'question',
        questionId: question.id,
        questionContext: question.question,
        relatedLOs: question.relatedLOs || [],
        timestamp: new Date()
      })

      return sessionRef.id
    } catch (err) {
      console.error('Error starting session:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Subscribe to messages in real-time
  function subscribeToMessages(sessionId) {
    if (unsubscribeMessages) unsubscribeMessages()

    const messagesQuery = query(
      collection(db, 'messages'),
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'asc')
    )

    unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      messages.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }))
    })
  }

  // Subscribe to assessments in real-time
  function subscribeToAssessments(sessionId) {
    if (unsubscribeAssessments) unsubscribeAssessments()

    const assessmentsQuery = query(
      collection(db, 'assessments'),
      where('sessionId', '==', sessionId),
      orderBy('createdAt', 'desc')
    )

    unsubscribeAssessments = onSnapshot(assessmentsQuery, (snapshot) => {
      assessments.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }))
    })
  }

  // Add message to Firestore
  async function addMessage(messageData) {
    try {
      const messageRef = await addDoc(collection(db, 'messages'), {
        ...messageData,
        timestamp: serverTimestamp()
      })
      return messageRef.id
    } catch (err) {
      console.error('Error adding message:', err)
      throw err
    }
  }

  // Send user message and get AI assessment
  async function sendMessage(text, options = {}) {
    const { typingFingerprint, researchMetrics } = options
    
    try {
      loading.value = true
      error.value = null

      if (!currentSession.value) {
        throw new Error('No active session')
      }

      // Add user message
      await addMessage({
        sessionId: currentSession.value.id,
        from: 'student',
        text: text,
        type: 'answer'
      })

      // ตรวจสอบว่ามีคำถามอยู่หรือไม่ (ถ้าไม่มี แสดงว่ายังไม่พร้อมประเมิน)
      if (!currentQuestion.value) {
        await addMessage({
          sessionId: currentSession.value.id,
          from: 'bot',
          text: '🤔 ขออภัยค่ะ ตอนนี้ยังไม่มีคำถามให้ตอบ กรุณาเริ่มแชทใหม่เพื่อรับคำถาม HOTS ค่ะ',
          type: 'system'
        })
        return
      }

      // สร้าง context พร้อม LO ถ้ามี
      let contextText = currentQuestion.value.question
      
      if (currentSession.value.courseData?.learningOutcomes) {
        contextText += '\n\nLearning Outcomes ที่ต้องประเมิน:\n'
        currentSession.value.courseData.learningOutcomes.forEach(lo => {
          contextText += `- ${lo.code}: ${lo.description}\n`
        })
      }

      // Call Cloud Function for assessment with LO context + 🆕 Anti-Cheat fingerprint + 🔬 Research metrics
      const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL
      const response = await fetch(`${functionsUrl}/assessAnswer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: authStore.user.uid,
          sessionId: currentSession.value.id,
          courseId: currentSession.value.courseId || null,
          questionId: currentQuestion.value.id || null,
          studentAnswer: text,
          questionContext: contextText,
          learningOutcomes: currentSession.value.courseData?.learningOutcomes || [],
          // 🆕 Anti-Cheat: Send typing fingerprint
          typingFingerprint: typingFingerprint || null,
          // 🔬 Research Metrics: Send for AIED research
          answerMetrics: researchMetrics?.answerMetrics || null,
          timingMetrics: researchMetrics?.timingMetrics || null,
          revisionMetrics: researchMetrics?.revisionMetrics || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        // 🆕 Handle anti-cheat rejection
        if (errorData.error?.includes('copy-paste') || errorData.antiCheat) {
          throw new Error(`anti-cheat: ${errorData.error || 'Possible cheating detected'}`)
        }
        throw new Error('Assessment failed')
      }

      const result = await response.json()

      // 🆕 SCAFFOLDING MODE: Check if AI returned a probing question
      if (result.needsScaffolding && result.probingQuestion) {
        // Add bot message with probing question
        await addMessage({
          sessionId: currentSession.value.id,
          from: 'bot',
          text: `🤔 **ลองคิดต่อดูนะคะ...**\n\n${result.probingQuestion}\n\n💡 **ทำไมต้องปรับปรุง:**\nคำตอบของคุณยังมีจุดที่ต้องพัฒนาอีกนิดหน่อย ลองตอบคำถามเพิ่มเติมข้างบนดูนะคะ จะช่วยให้คำตอบของคุณชัดเจนและสมบูรณ์มากขึ้น!\n\n📝 **คำแนะนำ:** พิมพ์คำตอบเพิ่มเติมโดยอ้างอิงจากคำถามที่ถามเพิ่ม หรือพิมพ์ "ข้าม" เพื่อขอรับผลคะแนน`,
          type: 'probing'
        })
        
        // Update session to track scaffolding state
        await updateDoc(doc(db, 'sessions', currentSession.value.id), {
          isScaffolding: true,
          scaffoldingAttempts: (result.scaffoldingAttempts || 0) + 1,
          previousAnswer: text
        })
        
        return { needsScaffolding: true, probingQuestion: result.probingQuestion }
      }

      // สร้าง feedback message พร้อมคะแนน (final assessment)
      const assessment = result.result
      
      // สร้างส่วน LO assessment ถ้ามี
      let loFeedback = ''
      if (assessment.loAssessment && assessment.loAssessment.passedLOs) {
        const passedCount = assessment.loAssessment.passedLOs.length
        const totalCount = currentSession.value.courseData?.learningOutcomes?.length || 0
        
        loFeedback = `

🎯 **ผลการประเมิน Learning Outcomes:**

${passedCount > 0 ? '✅ **LO ที่ผ่าน:**' : '⚠️ ยังไม่ผ่าน LO ใดในครั้งนี้'}
${assessment.loAssessment.passedLOs.map(lo => `  • ${lo}`).join('\n')}

📊 ความคืบหน้า: ${passedCount}/${totalCount} LO

${assessment.loAssessment.analysis ? `💡 **การวิเคราะห์:**\n${assessment.loAssessment.analysis}` : ''}
`
      }
      
      const feedbackMessage = `
✅ **ประเมินคำตอบเสร็จแล้ว!**

📊 **คะแนนของคุณ: ${assessment.overallScore}/20**

**คะแนนรายด้าน:**
- 🔍 การวิเคราะห์: ${assessment.rubricScores.analysis}/5
- 🧠 การให้เหตุผล: ${assessment.rubricScores.reasoning}/5
- 💡 ความคิดสร้างสรรค์: ${assessment.rubricScores.creativity}/5
- 📚 การใช้หลักฐาน: ${assessment.rubricScores.evidence}/5
${loFeedback}
💬 **Feedback:**
${assessment.feedbackText}

✨ **จุดเด่นของคุณ:**
${assessment.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}

🎯 **จุดที่ควรพัฒนา:**
${assessment.weaknesses.map((w, i) => `${i + 1}. ${w}`).join('\n')}

📝 **คำแนะนำ:**
${assessment.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

---

🎲 **พร้อมสำหรับคำถามใหม่หรือไม่?** พิมพ์ "ถัดไป" หรือ "next" เพื่อรับคำถามข้อใหม่ค่ะ
      `.trim()

      // Add AI response message with assessment
      await addMessage({
        sessionId: currentSession.value.id,
        from: 'bot',
        text: feedbackMessage,
        type: 'feedback',
        assessmentId: result.id,
        scores: assessment.rubricScores
      })

      // Reset current question (รอให้ขอคำถามใหม่)
      currentQuestion.value = null

      return result
    } catch (err) {
      console.error('Error sending message:', err)
      error.value = err.message
      
      // Add error message
      await addMessage({
        sessionId: currentSession.value.id,
        from: 'system',
        text: 'ขออภัยค่ะ เกิดข้อผิดพลาดในการประเมินผล กรุณาลองใหม่อีกครั้ง',
        type: 'error'
      })
      
      throw err
    } finally {
      loading.value = false
    }
  }

  // ขอคำถามใหม่
  async function requestNewQuestion(options = {}) {
    try {
      if (!currentSession.value) {
        throw new Error('No active session')
      }

      // 🆕 If adaptive path options provided, select specific question
      let question
      if (options.relatedLOs && options.relatedLOs.length > 0) {
        // 🎯 Adaptive mode: Get question targeting specific LOs
        console.log('🎯 Adaptive mode: Looking for question with LOs:', options.relatedLOs)
        
        if (currentSession.value.courseId) {
          // Try to get unused question with matching LOs
          question = await getUnusedQuestionWithLOs(
            authStore.user.uid, 
            currentSession.value.courseId,
            options.relatedLOs,
            options.difficulty
          )
        }
        
        // Fallback: random question but mark relatedLOs
        if (!question) {
          console.log('⚠️ No matching question found, using random with marked LOs')
          question = getRandomQuestion()
          question.relatedLOs = options.relatedLOs // Manually set LOs
        }
      } else {
        // Normal mode: get question from Firestore or random
        if (currentSession.value.courseId) {
          question = await getUnusedQuestion(authStore.user.uid, currentSession.value.courseId)
        }
        
        if (!question) {
          question = getRandomQuestion()
        }
      }
      
      currentQuestion.value = question

      // สร้างข้อความคำถามใหม่
      let questionText = `🎯 **คำถามข้อใหม่!**\n\n📚 หมวดหมู่: ${question.category}\n\n`
      
      // แสดง LO ที่คำถามนี้วัด (ถ้ามี)
      if (question.relatedLOs && question.relatedLOs.length > 0) {
        questionText += `🎯 **คำถามนี้จะประเมิน Learning Outcomes:**\n`
        
        // ดึงรายละเอียด LO จาก courseData ถ้ามี
        const courseData = currentSession.value.courseData
        if (courseData && courseData.learningOutcomes) {
          question.relatedLOs.forEach(loCode => {
            const loDetail = courseData.learningOutcomes.find(lo => 
              (lo.code || lo.loCode) === loCode
            )
            if (loDetail) {
              const description = loDetail.description || loDetail.loDescription || ''
              questionText += `• ${loCode}: ${description}\n`
            } else {
              questionText += `• ${loCode}\n`
            }
          })
        } else {
          // ถ้าไม่มี courseData แสดงแค่ code
          question.relatedLOs.forEach(loCode => {
            questionText += `• ${loCode}\n`
          })
        }
        questionText += `\n`
      }
      
      questionText += `❓ **คำถาม:**\n${question.question}\n\n💡 คำใบ้: ${question.hint}\n\n---\n\nคิดดีๆ แล้วตอบมาได้เลยค่ะ 😊`

      // ส่งคำถามใหม่
      await addMessage({
        sessionId: currentSession.value.id,
        from: 'bot',
        text: questionText,
        type: 'question',
        questionId: question.id,
        questionContext: question.question,
        relatedLOs: question.relatedLOs || [],
        timestamp: new Date()
      })

      return question
    } catch (err) {
      console.error('Error requesting new question:', err)
      throw err
    }
  }

  // End current session
  async function endSession() {
    try {
      if (!currentSession.value) return

      await updateDoc(doc(db, 'sessions', currentSession.value.id), {
        endedAt: serverTimestamp(),
        status: 'completed'
      })

      if (unsubscribeMessages) unsubscribeMessages()
      if (unsubscribeAssessments) unsubscribeAssessments()

      currentSession.value = null
      messages.value = []
      assessments.value = []
      currentQuestion.value = null
    } catch (err) {
      console.error('Error ending session:', err)
      throw err
    }
  }

  // Load existing session
  async function loadSession(sessionId) {
    try {
      loading.value = true
      const sessionDoc = await getDoc(doc(db, 'sessions', sessionId))
      
      if (sessionDoc.exists()) {
        currentSession.value = {
          id: sessionDoc.id,
          ...sessionDoc.data()
        }
        subscribeToMessages(sessionId)
        subscribeToAssessments(sessionId)
      }
    } catch (err) {
      console.error('Error loading session:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    currentSession,
    messages,
    assessments,
    loading,
    error,
    currentQuestion,
    starterQuestions,
    startSession,
    sendMessage,
    requestNewQuestion,
    endSession,
    loadSession,
    subscribeToAssessments
  }
})
