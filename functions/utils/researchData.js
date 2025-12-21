/**
 * 📊 HOTS AI Research Data Module
 * 
 * ระบบจัดการข้อมูลเพื่อการวิจัย (Research-Grade Data)
 * 
 * Features:
 * 1. Learning Event Logging - บันทึกทุก event การเรียนรู้
 * 2. Growth Tracking - ติดตามพัฒนาการตามเวลา
 * 3. Intervention Logging - บันทึกการแทรกแซง/สอนเสริม
 * 4. Data Export - ส่งออกข้อมูลรูปแบบ CSV/JSON สำหรับ SPSS, Python
 * 5. Correlation Analysis - วิเคราะห์ความสัมพันธ์ระหว่างข้อมูล
 * 6. 🔴 NEW: Sequential Pattern Mining - วิเคราะห์ลำดับการเรียนรู้
 * 7. 🔴 NEW: K-Anonymity Export - ป้องกัน Re-identification
 * 
 * Research Questions ที่รองรับ:
 * - RQ1: ประสิทธิผลของ AI Assessment (Pre/Post comparison)
 * - RQ2: ความเที่ยงตรงของเครื่องมือ (Chat vs Worksheet correlation)
 * - RQ3: ผลของ Micro-lessons ต่อการพัฒนา HOTS
 * - RQ4: ปัจจัยที่ส่งผลต่อคะแนน HOTS (Demographics, Time, etc.)
 * - RQ5: 🔴 NEW: ผลของ AI Scaffolding ต่อ HOTS (Scaffolding Metrics)
 * - RQ6: 🔴 NEW: Sequential Learning Patterns
 * 
 * Schema Version: 3.0 (Dec 2025)
 */

const admin = require('firebase-admin')

/**
 * 📝 Learning Event Types
 */
const EVENT_TYPES = {
  // Assessment Events
  CHAT_ASSESSMENT: 'CHAT_ASSESSMENT',
  WORKSHEET_SUBMISSION: 'WORKSHEET_SUBMISSION',
  PRETEST: 'PRETEST',
  POSTTEST: 'POSTTEST',
  
  // Intervention Events
  MICRO_LESSON_VIEW: 'MICRO_LESSON_VIEW',
  MICRO_LESSON_COMPLETE: 'MICRO_LESSON_COMPLETE',
  KNOWLEDGE_SHEET_VIEW: 'KNOWLEDGE_SHEET_VIEW',
  TEACHER_FEEDBACK: 'TEACHER_FEEDBACK',
  SCAFFOLDING_PROVIDED: 'SCAFFOLDING_PROVIDED',
  
  // 🔴 NEW: Micro-level events for Sequential Pattern Mining
  QUESTION_SHOWN: 'QUESTION_SHOWN',
  HINT_REQUEST: 'HINT_REQUEST',
  TYPING_START: 'TYPING_START',
  ANSWER_REVISION: 'ANSWER_REVISION',
  ANSWER_SUBMIT: 'ANSWER_SUBMIT',
  FEEDBACK_RECEIVED: 'FEEDBACK_RECEIVED',
  
  // Progress Events
  LO_PASSED: 'LO_PASSED',
  BADGE_EARNED: 'BADGE_EARNED',
  STREAK_MILESTONE: 'STREAK_MILESTONE',
  
  // System Events
  SESSION_START: 'SESSION_START',
  SESSION_END: 'SESSION_END'
}

/**
 * 🔴 NEW: Sequence Event Types (for learningSequences collection)
 */
const SEQUENCE_EVENT_TYPES = {
  Q: 'QUESTION_SHOWN',
  H: 'HINT_REQUEST',
  T: 'TYPING_START',
  R: 'ANSWER_REVISION',
  S: 'ANSWER_SUBMIT',
  F: 'FEEDBACK_RECEIVED'
}

/**
 * 📊 Log Learning Event (Core function)
 * บันทึกทุก event ไปที่ learningEvents collection
 * ใช้ structure แบบ flat เพื่อง่ายต่อการ export
 * 
 * @param {Object} db - Firestore instance
 * @param {Object} eventData - Event data
 */
async function logLearningEvent(db, eventData) {
  const {
    eventType,
    studentId,
    courseId,
    
    // Assessment Data
    assessmentId = null,
    worksheetId = null,
    questionId = null,
    
    // Scores
    rubricScores = null,
    overallScore = null,
    aiConfidence = null,
    reliabilityScore = null,
    
    // LO Data
    targetLOs = [],
    passedLOs = [],
    
    // Intervention Data
    microLessonId = null,
    knowledgeSheetId = null,
    interventionType = null,
    
    // Context
    sessionId = null,
    timingMetrics = null,
    answerMetrics = null,
    
    // Metadata
    isFallback = false,
    scaffoldingLevel = 0,
    experimentGroup = null,
    weekOfTerm = null,
    
    // 🔴 NEW: Time on Task Metrics (Critical for Research)
    timeOnTask_seconds = null,       // เวลาตั้งแต่เห็นคำถามถึงส่ง
    thinkingTime_seconds = null,     // เวลาก่อนเริ่มพิมพ์ตัวแรก
    typingTime_seconds = null,       // เวลาพิมพ์จริง
    
    // 🔴 NEW: Scaffolding Metrics (Core IV for AI Scaffolding Research)
    scaffolding_hintRequests = 0,    // จำนวนครั้งขอคำใบ้
    scaffolding_probingQuestions = 0, // คำถามกระตุ้นที่ได้รับ
    scaffolding_levelReceived = 0,   // ระดับ scaffolding สุดท้าย (1-5)
    
    // 🔴 NEW: Revision Metrics (Self-regulation indicator)
    revision_count = 0,              // แก้ไขกี่ครั้งก่อนส่ง
    revision_charHistory = null,     // ความยาวแต่ละ revision "45,120,180"
    
    // 🔴 NEW: Baseline Control (Confounding Variable)
    baseline_priorAverage = null,    // คะแนนเฉลี่ยก่อนหน้า
    baseline_pretestScore = null,    // คะแนน pretest (ถ้ามี)
    
    // 🟡 NEW: Context Variables
    context_deviceType = null,       // mobile | desktop | tablet
    context_questionPosition = null, // ข้อที่เท่าไหร่ใน session
    context_hourOfDay = null,        // 0-23
    context_dayOfWeek = null,        // 0-6
    
    // 🟡 NEW: Question Metadata
    question_difficulty = null,      // 1-5
    question_type = null,            // question type
    question_targetDimension = null, // primary ARCE dimension
    
    // 🟡 NEW: Behavioral Signals
    copyPasteDetected = false,
    tabSwitchCount = 0
  } = eventData

  try {
    // Get student demographics for denormalization
    let studentData = {}
    if (studentId) {
      const studentDoc = await db.collection('users').doc(studentId).get()
      if (studentDoc.exists) {
        const data = studentDoc.data()
        studentData = {
          grade: data.grade || data.gradeLevel || null,
          room: data.room || null,
          section: data.section || null,
          gender: data.gender || null,
          schoolId: data.schoolId || null
        }
      }
    }

    // Calculate cumulative stats
    let cumulativeStats = {}
    if (studentId && courseId) {
      const progressDoc = await db.collection('studentProgress')
        .doc(`${studentId}_${courseId}`).get()
      if (progressDoc.exists) {
        const progress = progressDoc.data()
        cumulativeStats = {
          totalPassedLOs: progress.passedLOs?.length || 0,
          totalAssessments: progress.assessmentCount || 0,
          totalPoints: progress.totalPoints || 0,
          currentStreak: progress.currentStreak || 0
        }
      }
    }

    const event = {
      // Event Info
      eventType,
      eventId: `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      timestampISO: new Date().toISOString(),
      
      // Student Info (Denormalized for easy export)
      studentId,
      studentGrade: studentData.grade,
      studentRoom: studentData.room,
      studentSection: studentData.section,
      studentGender: studentData.gender,
      schoolId: studentData.schoolId,
      
      // Course & Content
      courseId,
      assessmentId,
      worksheetId,
      questionId,
      sessionId,
      
      // Scores (Flat structure)
      scoreAnalysis: rubricScores?.analysis ?? null,
      scoreReasoning: rubricScores?.reasoning ?? null,
      scoreCreativity: rubricScores?.creativity ?? null,
      scoreEvidence: rubricScores?.evidence ?? null,
      scoreOverall: overallScore,
      
      // AI Metrics
      aiConfidence,
      reliabilityScore,
      isFallback,
      
      // LO Data
      targetLOs: targetLOs.join(';'),
      passedLOs: passedLOs.join(';'),
      passedLOCount: passedLOs.length,
      
      // Intervention
      microLessonId,
      knowledgeSheetId,
      interventionType,
      scaffoldingLevel,
      
      // Timing
      answerDurationSec: timingMetrics?.answerDurationMs 
        ? Math.round(timingMetrics.answerDurationMs / 1000) 
        : null,
      thinkingPauseCount: timingMetrics?.thinkingPauseCount ?? null,
      
      // Answer Metrics
      answerWordCount: answerMetrics?.wordCount ?? null,
      answerCharCount: answerMetrics?.charCount ?? null,
      answerSentenceCount: answerMetrics?.sentenceCount ?? null,
      
      // Cumulative (for longitudinal analysis)
      cumulativePassedLOs: cumulativeStats.totalPassedLOs,
      cumulativeAssessments: cumulativeStats.totalAssessments,
      cumulativePoints: cumulativeStats.totalPoints,
      currentStreak: cumulativeStats.currentStreak,
      
      // 🔴 NEW: Time on Task (Critical Research Variables)
      timeOnTask_seconds,
      thinkingTime_seconds,
      typingTime_seconds,
      
      // 🔴 NEW: Scaffolding Metrics (Core IV)
      scaffolding_hintRequests,
      scaffolding_probingQuestions,
      scaffolding_levelReceived,
      
      // 🔴 NEW: Revision Metrics
      revision_count,
      revision_charHistory,
      
      // 🔴 NEW: Baseline Control
      baseline_priorAverage,
      baseline_pretestScore,
      
      // 🟡 NEW: Context Variables
      context_deviceType,
      context_questionPosition,
      context_hourOfDay: context_hourOfDay ?? new Date().getHours(),
      context_dayOfWeek: context_dayOfWeek ?? new Date().getDay(),
      
      // 🟡 NEW: Question Metadata
      question_difficulty,
      question_type,
      question_targetDimension,
      
      // 🟡 NEW: Behavioral Signals
      copyPasteDetected,
      tabSwitchCount,
      
      // Research Context
      experimentGroup,
      weekOfTerm,
      
      // Version (for schema migration)
      schemaVersion: '3.0'  // Updated from 2.0
    }

    await db.collection('learningEvents').add(event)
    
    return { success: true, eventId: event.eventId }
  } catch (error) {
    console.error('Error logging learning event:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 📈 Update Growth History
 * บันทึกพัฒนาการของนักเรียนเป็น time series
 * 
 * @param {Object} db - Firestore instance
 * @param {string} studentId - Student UID
 * @param {string} courseId - Course ID
 * @param {Object} scores - Current rubric scores
 * @param {string} source - 'chat' | 'worksheet'
 * @param {Object} additionalMetrics - Additional research metrics (optional)
 */
async function updateGrowthHistory(db, studentId, courseId, scores, source, additionalMetrics = {}) {
  const historyRef = db.collection('studentGrowthHistory').doc(`${studentId}_${courseId}`)
  
  const {
    // 🔴 NEW: Scaffolding metrics for this entry
    hintRequests = 0,
    scaffoldingLevel = 0,
    timeOnTask = null,
    revisionCount = 0
  } = additionalMetrics
  
  const snapshot = {
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    timestampISO: new Date().toISOString(),
    source,
    scores: {
      analysis: scores.analysis || 0,
      reasoning: scores.reasoning || 0,
      creativity: scores.creativity || 0,
      evidence: scores.evidence || 0
    },
    averageScore: (
      (scores.analysis || 0) + 
      (scores.reasoning || 0) + 
      (scores.creativity || 0) + 
      (scores.evidence || 0)
    ) / 4,
    // 🔴 NEW: Per-entry metrics
    hintRequests,
    scaffoldingLevel,
    timeOnTask,
    revisionCount
  }

  try {
    const historyDoc = await historyRef.get()
    
    if (historyDoc.exists) {
      const data = historyDoc.data()
      const history = data.history || []
      
      // Calculate growth from previous entry
      if (history.length > 0) {
        const lastEntry = history[history.length - 1]
        snapshot.growthFromLast = {
          analysis: snapshot.scores.analysis - (lastEntry.scores?.analysis || 0),
          reasoning: snapshot.scores.reasoning - (lastEntry.scores?.reasoning || 0),
          creativity: snapshot.scores.creativity - (lastEntry.scores?.creativity || 0),
          evidence: snapshot.scores.evidence - (lastEntry.scores?.evidence || 0),
          average: snapshot.averageScore - (lastEntry.averageScore || 0)
        }
      }
      
      // Keep last 100 entries to avoid document size limit
      const updatedHistory = [...history, snapshot].slice(-100)
      
      await historyRef.update({
        history: updatedHistory,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        latestScores: snapshot.scores,
        latestAverage: snapshot.averageScore,
        totalEntries: updatedHistory.length,
        // 🔴 NEW: Aggregated scaffolding summary
        scaffoldingSummary: calculateScaffoldingSummary(updatedHistory)
      })
    } else {
      // 🔴 NEW: Initialize with baseline placeholders
      await historyRef.set({
        studentId,
        courseId,
        history: [snapshot],
        firstEntry: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        latestScores: snapshot.scores,
        latestAverage: snapshot.averageScore,
        totalEntries: 1,
        // 🔴 NEW: Baseline data (to be filled manually or from pretest)
        baseline: {
          pretestScore: null,
          pretestDate: null,
          priorExperience: null
        },
        scaffoldingSummary: {
          totalHintRequests: hintRequests,
          avgHintsPerSession: hintRequests,
          scaffoldingDependencyTrend: 'unknown'
        }
      })
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error updating growth history:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 🔴 NEW: Calculate scaffolding summary from history
 */
function calculateScaffoldingSummary(history) {
  if (!history || history.length === 0) {
    return { totalHintRequests: 0, avgHintsPerSession: 0, scaffoldingDependencyTrend: 'unknown' }
  }
  
  const totalHints = history.reduce((sum, h) => sum + (h.hintRequests || 0), 0)
  const avgHints = totalHints / history.length
  
  // Calculate trend (compare first half vs second half)
  let trend = 'stable'
  if (history.length >= 4) {
    const midpoint = Math.floor(history.length / 2)
    const firstHalfHints = history.slice(0, midpoint).reduce((sum, h) => sum + (h.hintRequests || 0), 0) / midpoint
    const secondHalfHints = history.slice(midpoint).reduce((sum, h) => sum + (h.hintRequests || 0), 0) / (history.length - midpoint)
    
    if (secondHalfHints < firstHalfHints * 0.7) trend = 'decreasing'  // ดี! พึ่งพาน้อยลง
    else if (secondHalfHints > firstHalfHints * 1.3) trend = 'increasing'  // ต้องดู
    else trend = 'stable'
  }
  
  return {
    totalHintRequests: totalHints,
    avgHintsPerSession: Math.round(avgHints * 100) / 100,
    scaffoldingDependencyTrend: trend
  }
}

/**
 * 📚 Log Intervention
 * บันทึกการแทรกแซง/สอนเสริม เพื่อวัด Pre/Post effect
 * 
 * @param {Object} db - Firestore instance
 * @param {Object} interventionData - Intervention details
 */
async function logIntervention(db, interventionData) {
  const {
    studentId,
    courseId,
    interventionType, // 'micro_lesson' | 'knowledge_sheet' | 'teacher_feedback' | 'scaffolding'
    contentId,
    contentTitle,
    targetLOs = [],
    durationSec = null,
    completionRate = null,
    teacherId = null,
    notes = null
  } = interventionData

  try {
    // Get scores BEFORE intervention (latest assessment)
    const beforeAssessment = await db.collection('assessments')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()
    
    let scoresBefore = null
    if (!beforeAssessment.empty) {
      const data = beforeAssessment.docs[0].data()
      scoresBefore = data.rubricScores
    }

    const intervention = {
      studentId,
      courseId,
      interventionType,
      contentId,
      contentTitle,
      targetLOs: targetLOs.join(';'),
      
      // Pre-intervention state
      scoresBefore,
      
      // Engagement metrics
      durationSec,
      completionRate,
      
      // Teacher info (if applicable)
      teacherId,
      notes,
      
      // Status
      status: 'completed',
      
      // Timestamps
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      
      // For Post analysis
      scoresAfter: null, // Will be filled by next assessment
      effectMeasured: false
    }

    const docRef = await db.collection('interventions').add(intervention)
    
    // Also log as learning event
    await logLearningEvent(db, {
      eventType: EVENT_TYPES[`${interventionType.toUpperCase()}_COMPLETE`] || 'INTERVENTION',
      studentId,
      courseId,
      microLessonId: interventionType === 'micro_lesson' ? contentId : null,
      knowledgeSheetId: interventionType === 'knowledge_sheet' ? contentId : null,
      interventionType,
      targetLOs
    })
    
    return { success: true, interventionId: docRef.id }
  } catch (error) {
    console.error('Error logging intervention:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 📊 Calculate Correlation
 * วิเคราะห์ความสัมพันธ์ระหว่าง Chat scores และ Worksheet scores
 * 
 * @param {Object} db - Firestore instance
 * @param {string} courseId - Course ID
 * @returns {Object} Correlation coefficients per dimension
 */
async function calculateScoreCorrelation(db, courseId) {
  try {
    // Get all students with both chat and worksheet data
    const assessmentsSnap = await db.collection('assessments')
      .where('courseId', '==', courseId)
      .get()
    
    const worksheetsSnap = await db.collection('worksheetSubmissions')
      .where('courseId', '==', courseId)
      .get()
    
    // Group by student
    const studentChatScores = {}
    const studentWorksheetScores = {}
    
    assessmentsSnap.forEach(doc => {
      const data = doc.data()
      if (!studentChatScores[data.studentId]) {
        studentChatScores[data.studentId] = []
      }
      if (data.rubricScores) {
        studentChatScores[data.studentId].push(data.rubricScores)
      }
    })
    
    worksheetsSnap.forEach(doc => {
      const data = doc.data()
      if (!studentWorksheetScores[data.studentId]) {
        studentWorksheetScores[data.studentId] = []
      }
      if (data.rubricScores || data.assessment?.rubricScores) {
        studentWorksheetScores[data.studentId].push(
          data.rubricScores || data.assessment?.rubricScores
        )
      }
    })
    
    // Calculate average scores per student
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const chatAverages = {}
    const worksheetAverages = {}
    
    Object.keys(studentChatScores).forEach(studentId => {
      const scores = studentChatScores[studentId]
      chatAverages[studentId] = {}
      dimensions.forEach(dim => {
        const sum = scores.reduce((acc, s) => acc + (s[dim] || 0), 0)
        chatAverages[studentId][dim] = sum / scores.length
      })
    })
    
    Object.keys(studentWorksheetScores).forEach(studentId => {
      const scores = studentWorksheetScores[studentId]
      worksheetAverages[studentId] = {}
      dimensions.forEach(dim => {
        const sum = scores.reduce((acc, s) => acc + (s[dim] || 0), 0)
        worksheetAverages[studentId][dim] = sum / scores.length
      })
    })
    
    // Find students with both data types
    const studentsWithBoth = Object.keys(chatAverages).filter(
      id => worksheetAverages[id]
    )
    
    if (studentsWithBoth.length < 3) {
      return {
        success: false,
        error: 'Insufficient data (need at least 3 students with both chat and worksheet)',
        sampleSize: studentsWithBoth.length
      }
    }
    
    // Calculate Pearson correlation for each dimension
    const correlations = {}
    
    dimensions.forEach(dim => {
      const x = studentsWithBoth.map(id => chatAverages[id][dim])
      const y = studentsWithBoth.map(id => worksheetAverages[id][dim])
      
      correlations[dim] = pearsonCorrelation(x, y)
    })
    
    // Overall correlation
    const overallX = studentsWithBoth.map(id => 
      dimensions.reduce((sum, dim) => sum + chatAverages[id][dim], 0) / 4
    )
    const overallY = studentsWithBoth.map(id => 
      dimensions.reduce((sum, dim) => sum + worksheetAverages[id][dim], 0) / 4
    )
    correlations.overall = pearsonCorrelation(overallX, overallY)
    
    return {
      success: true,
      sampleSize: studentsWithBoth.length,
      correlations,
      interpretation: interpretCorrelation(correlations.overall)
    }
  } catch (error) {
    console.error('Error calculating correlation:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 📐 Pearson Correlation Coefficient
 */
function pearsonCorrelation(x, y) {
  const n = x.length
  if (n !== y.length || n === 0) return null
  
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0)
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0)
  
  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  )
  
  if (denominator === 0) return 0
  
  return Math.round((numerator / denominator) * 1000) / 1000
}

/**
 * 📝 Interpret Correlation
 */
function interpretCorrelation(r) {
  if (r === null) return 'ไม่สามารถคำนวณได้'
  const absR = Math.abs(r)
  
  if (absR >= 0.9) return 'สัมพันธ์กันสูงมาก (Very Strong)'
  if (absR >= 0.7) return 'สัมพันธ์กันสูง (Strong)'
  if (absR >= 0.5) return 'สัมพันธ์กันปานกลาง (Moderate)'
  if (absR >= 0.3) return 'สัมพันธ์กันต่ำ (Weak)'
  return 'แทบไม่สัมพันธ์กัน (Very Weak/None)'
}

/**
 * 📤 Export Research Data as CSV
 * ส่งออกข้อมูลรูปแบบ flat CSV สำหรับ SPSS, R, Python
 * 
 * @param {Object} db - Firestore instance
 * @param {string} courseId - Course ID
 * @param {Object} options - Export options
 */
async function exportResearchCSV(db, courseId, options = {}) {
  const { 
    includeEvents = true,
    includeGrowth = true,
    includeInterventions = true,
    dateFrom = null,
    dateTo = null
  } = options

  const BOM = '\uFEFF' // UTF-8 BOM for Excel Thai support
  const rows = []
  
  try {
    // Build query
    let query = db.collection('learningEvents')
      .where('courseId', '==', courseId)
      .orderBy('timestamp', 'asc')
    
    if (dateFrom) {
      query = query.where('timestamp', '>=', new Date(dateFrom))
    }
    if (dateTo) {
      query = query.where('timestamp', '<=', new Date(dateTo))
    }
    
    const eventsSnap = await query.limit(10000).get()
    
    // CSV Headers
    const headers = [
      'event_id', 'event_type', 'timestamp',
      'student_id', 'grade', 'room', 'section', 'gender', 'school_id',
      'course_id', 'assessment_id', 'worksheet_id', 'question_id',
      'score_analysis', 'score_reasoning', 'score_creativity', 'score_evidence', 'score_overall',
      'ai_confidence', 'reliability_score', 'is_fallback',
      'target_los', 'passed_los', 'passed_lo_count',
      'intervention_type', 'micro_lesson_id', 'scaffolding_level',
      'answer_duration_sec', 'answer_word_count',
      'cumulative_passed_los', 'cumulative_assessments', 'current_streak',
      'experiment_group', 'week_of_term'
    ]
    
    rows.push(headers.join(','))
    
    // Process events
    eventsSnap.forEach(doc => {
      const e = doc.data()
      const row = [
        e.eventId || doc.id,
        e.eventType,
        e.timestampISO || '',
        e.studentId,
        e.studentGrade || '',
        e.studentRoom || '',
        e.studentSection || '',
        e.studentGender || '',
        e.schoolId || '',
        e.courseId,
        e.assessmentId || '',
        e.worksheetId || '',
        e.questionId || '',
        e.scoreAnalysis ?? '',
        e.scoreReasoning ?? '',
        e.scoreCreativity ?? '',
        e.scoreEvidence ?? '',
        e.scoreOverall ?? '',
        e.aiConfidence ?? '',
        e.reliabilityScore ?? '',
        e.isFallback ? 'YES' : 'NO',
        e.targetLOs || '',
        e.passedLOs || '',
        e.passedLOCount ?? '',
        e.interventionType || '',
        e.microLessonId || '',
        e.scaffoldingLevel ?? '',
        e.answerDurationSec ?? '',
        e.answerWordCount ?? '',
        e.cumulativePassedLOs ?? '',
        e.cumulativeAssessments ?? '',
        e.currentStreak ?? '',
        e.experimentGroup || '',
        e.weekOfTerm ?? ''
      ]
      
      // Escape commas and quotes
      const escapedRow = row.map(val => {
        if (val === null || val === undefined) return ''
        const str = String(val)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
      
      rows.push(escapedRow.join(','))
    })
    
    return {
      success: true,
      csv: BOM + rows.join('\n'),
      rowCount: rows.length - 1, // Exclude header
      filename: `hots_research_${courseId}_${new Date().toISOString().split('T')[0]}.csv`
    }
  } catch (error) {
    console.error('Error exporting research CSV:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 📊 Generate Research Summary Statistics
 * สรุปสถิติเบื้องต้นสำหรับงานวิจัย
 */
async function generateResearchSummary(db, courseId) {
  try {
    const [assessments, worksheets, events, interventions] = await Promise.all([
      db.collection('assessments').where('courseId', '==', courseId).get(),
      db.collection('worksheetSubmissions').where('courseId', '==', courseId).get(),
      db.collection('learningEvents').where('courseId', '==', courseId).get(),
      db.collection('interventions').where('courseId', '==', courseId).get()
    ])
    
    // Calculate descriptive statistics
    const scores = {
      analysis: [],
      reasoning: [],
      creativity: [],
      evidence: [],
      overall: []
    }
    
    assessments.forEach(doc => {
      const data = doc.data()
      if (data.rubricScores) {
        scores.analysis.push(data.rubricScores.analysis || 0)
        scores.reasoning.push(data.rubricScores.reasoning || 0)
        scores.creativity.push(data.rubricScores.creativity || 0)
        scores.evidence.push(data.rubricScores.evidence || 0)
        scores.overall.push(data.overallScore || 0)
      }
    })
    
    worksheets.forEach(doc => {
      const data = doc.data()
      const rubric = data.rubricScores || data.assessment?.rubricScores
      if (rubric) {
        scores.analysis.push(rubric.analysis || 0)
        scores.reasoning.push(rubric.reasoning || 0)
        scores.creativity.push(rubric.creativity || 0)
        scores.evidence.push(rubric.evidence || 0)
      }
    })
    
    const calcStats = (arr) => {
      if (arr.length === 0) return { n: 0, mean: 0, sd: 0, min: 0, max: 0 }
      const n = arr.length
      const mean = arr.reduce((a, b) => a + b, 0) / n
      const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n
      const sd = Math.sqrt(variance)
      return {
        n,
        mean: Math.round(mean * 100) / 100,
        sd: Math.round(sd * 100) / 100,
        min: Math.min(...arr),
        max: Math.max(...arr)
      }
    }
    
    // Unique students
    const studentIds = new Set()
    assessments.forEach(doc => studentIds.add(doc.data().studentId))
    worksheets.forEach(doc => studentIds.add(doc.data().studentId))
    
    return {
      success: true,
      courseId,
      generatedAt: new Date().toISOString(),
      
      // Sample Size
      sampleSize: {
        uniqueStudents: studentIds.size,
        totalAssessments: assessments.size,
        totalWorksheets: worksheets.size,
        totalEvents: events.size,
        totalInterventions: interventions.size
      },
      
      // Descriptive Statistics
      descriptiveStatistics: {
        analysis: calcStats(scores.analysis),
        reasoning: calcStats(scores.reasoning),
        creativity: calcStats(scores.creativity),
        evidence: calcStats(scores.evidence),
        overall: calcStats(scores.overall)
      },
      
      // Data Completeness
      dataCompleteness: {
        hasLearningEvents: events.size > 0,
        hasInterventions: interventions.size > 0,
        eventToAssessmentRatio: assessments.size > 0 
          ? Math.round((events.size / assessments.size) * 100) / 100 
          : 0
      }
    }
  } catch (error) {
    console.error('Error generating research summary:', error)
    return { success: false, error: error.message }
  }
}

// ============================================================
// 🔴 NEW: Sequential Pattern Mining Functions
// ============================================================

/**
 * 📊 Log Sequence Event
 * บันทึก micro-level events สำหรับ Sequential Pattern Mining
 * 
 * @param {Object} db - Firestore instance
 * @param {Object} eventData - Sequence event data
 */
async function logSequenceEvent(db, eventData) {
  const {
    sessionId,
    studentId,
    courseId,
    questionId,
    eventType,  // Q, H, T, R, S, F
    data = {}
  } = eventData

  const sequenceRef = db.collection('learningSequences').doc(`${sessionId}_${questionId}`)
  
  try {
    const seqDoc = await sequenceRef.get()
    const timestamp = new Date().toISOString()
    
    const event = {
      order: seqDoc.exists ? (seqDoc.data().sequence?.length || 0) + 1 : 1,
      event: eventType,
      timestamp,
      data
    }
    
    if (seqDoc.exists) {
      const currentSequence = seqDoc.data().sequence || []
      await sequenceRef.update({
        sequence: [...currentSequence, event],
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      })
    } else {
      await sequenceRef.set({
        sessionId,
        studentId,
        courseId,
        questionId,
        sequence: [event],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      })
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error logging sequence event:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 📊 Finalize Sequence
 * สรุป sequence เมื่อจบการตอบคำถาม
 */
async function finalizeSequence(db, sessionId, questionId) {
  const sequenceRef = db.collection('learningSequences').doc(`${sessionId}_${questionId}`)
  
  try {
    const seqDoc = await sequenceRef.get()
    if (!seqDoc.exists) return { success: false, error: 'Sequence not found' }
    
    const sequence = seqDoc.data().sequence || []
    
    // Calculate summary
    const totalHints = sequence.filter(e => e.event === 'HINT_REQUEST').length
    const totalRevisions = sequence.filter(e => e.event === 'ANSWER_REVISION').length
    
    // Calculate time metrics
    const questionShown = sequence.find(e => e.event === 'QUESTION_SHOWN')
    const submitted = sequence.find(e => e.event === 'ANSWER_SUBMIT')
    const firstType = sequence.find(e => e.event === 'TYPING_START')
    
    let timeToSubmit = null
    let timeToFirstHint = null
    
    if (questionShown && submitted) {
      timeToSubmit = (new Date(submitted.timestamp) - new Date(questionShown.timestamp)) / 1000
    }
    
    const firstHint = sequence.find(e => e.event === 'HINT_REQUEST')
    if (questionShown && firstHint) {
      timeToFirstHint = (new Date(firstHint.timestamp) - new Date(questionShown.timestamp)) / 1000
    }
    
    // Generate pattern string
    const patternMap = {
      'QUESTION_SHOWN': 'Q',
      'HINT_REQUEST': 'H',
      'TYPING_START': 'T',
      'ANSWER_REVISION': 'R',
      'ANSWER_SUBMIT': 'S',
      'FEEDBACK_RECEIVED': 'F'
    }
    const pattern = sequence.map(e => patternMap[e.event] || '?').join('-')
    
    await sequenceRef.update({
      sequenceSummary: {
        totalEvents: sequence.length,
        totalHints,
        totalRevisions,
        timeToFirstHint_sec: timeToFirstHint,
        timeToSubmit_sec: timeToSubmit,
        pattern
      },
      finalized: true,
      finalizedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    
    return { success: true, pattern, totalHints, totalRevisions }
  } catch (error) {
    console.error('Error finalizing sequence:', error)
    return { success: false, error: error.message }
  }
}

// ============================================================
// 🔴 NEW: K-Anonymity Export Functions
// ============================================================

/**
 * 📊 Export with K-Anonymity
 * Enhanced anonymization สำหรับ publication-ready data
 * 
 * @param {Object} db - Firestore instance
 * @param {string} courseId - Course ID
 * @param {Object} options - Export options
 */
async function exportKAnonymousData(db, courseId, options = {}) {
  const {
    k = 5,                    // K-anonymity threshold
    level = 'research',       // 'internal' | 'research' | 'publication'
    format = 'csv',
    suppressSmallCells = true,
    minCellSize = 5
  } = options

  try {
    // Fetch data
    const events = await db.collection('learningEvents')
      .where('courseId', '==', courseId)
      .get()
    
    let records = events.docs.map(doc => doc.data())
    
    // Apply generalizations based on level
    records = records.map((r, idx) => {
      const anonymized = { ...r }
      
      // Replace studentId with sequential number
      anonymized.studentId = `S${String(idx + 1).padStart(4, '0')}`
      
      // Remove direct identifiers
      delete anonymized.studentGender
      delete anonymized.schoolId
      delete anonymized.studentSection
      
      // Level-based generalizations
      if (level === 'research' || level === 'publication') {
        // Generalize timestamp to date only
        if (anonymized.timestampISO) {
          anonymized.timestampISO = anonymized.timestampISO.split('T')[0]
        }
        // Generalize scores to ranges
        if (level === 'publication') {
          anonymized.scoreOverall = generalizeScore(anonymized.scoreOverall)
          // Remove quasi-identifiers
          delete anonymized.sessionId
          delete anonymized.questionId
        }
      }
      
      return anonymized
    })
    
    // Suppress small cells if needed
    if (suppressSmallCells) {
      // Group by quasi-identifiers and suppress groups < minCellSize
      const groups = {}
      records.forEach(r => {
        const key = `${r.studentGrade}_${r.courseId}`
        if (!groups[key]) groups[key] = []
        groups[key].push(r)
      })
      
      records = records.map(r => {
        const key = `${r.studentGrade}_${r.courseId}`
        if (groups[key].length < minCellSize) {
          r.studentGrade = '*SUPPRESSED*'
        }
        return r
      })
    }
    
    // Calculate k-anonymity check
    const uniquePatterns = new Set(records.map(r => 
      `${r.studentId}_${r.timestampISO}_${r.scoreOverall}`
    ))
    const isKAnonymous = records.length / uniquePatterns.size >= k
    
    // Format output
    if (format === 'csv') {
      const headers = Object.keys(records[0] || {})
      const csvRows = [
        headers.join(','),
        ...records.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
      ]
      return {
        success: true,
        data: csvRows.join('\n'),
        format: 'csv',
        recordCount: records.length,
        isKAnonymous,
        kValue: k,
        level
      }
    }
    
    return {
      success: true,
      data: records,
      format: 'json',
      recordCount: records.length,
      isKAnonymous,
      kValue: k,
      level
    }
  } catch (error) {
    console.error('Error exporting k-anonymous data:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Helper: Generalize score to range
 */
function generalizeScore(score) {
  if (score === null || score === undefined) return null
  if (score <= 5) return '0-5'
  if (score <= 10) return '6-10'
  if (score <= 15) return '11-15'
  return '16-20'
}

/**
 * 📊 Assess Re-identification Risk
 */
async function assessReidentificationRisk(db, courseId) {
  try {
    const events = await db.collection('learningEvents')
      .where('courseId', '==', courseId)
      .get()
    
    const records = events.docs.map(doc => doc.data())
    
    // Check unique combinations
    const quasiIdentifiers = ['studentGrade', 'studentRoom', 'timestampISO', 'scoreOverall']
    const combinations = records.map(r => 
      quasiIdentifiers.map(qi => r[qi]).join('|')
    )
    
    const uniqueCombinations = new Set(combinations)
    const uniqueRate = (uniqueCombinations.size / records.length) * 100
    
    // Find high-risk fields
    const highRiskFields = []
    
    // Check LO patterns
    const loPatterns = new Set(records.map(r => r.passedLOs).filter(Boolean))
    if (loPatterns.size > records.length * 0.5) {
      highRiskFields.push({
        field: 'passedLOs',
        uniquePatterns: loPatterns.size,
        risk: 'HIGH',
        recommendation: 'Generalize to passedLOCount only'
      })
    }
    
    // Check timestamp granularity
    const uniqueDates = new Set(records.map(r => r.timestampISO?.split('T')[0]))
    if (uniqueDates.size > records.length * 0.3) {
      highRiskFields.push({
        field: 'timestamp',
        uniquePatterns: uniqueDates.size,
        risk: 'MEDIUM',
        recommendation: 'Use date only, not datetime'
      })
    }
    
    const overallRisk = uniqueRate > 30 ? 'HIGH' : uniqueRate > 10 ? 'MODERATE' : 'LOW'
    
    return {
      success: true,
      riskAssessment: {
        totalRecords: records.length,
        uniqueCombinations: uniqueCombinations.size,
        uniqueRate: Math.round(uniqueRate * 100) / 100,
        highRiskFields,
        overallRisk,
        safeToExport: overallRisk !== 'HIGH',
        requiredMitigations: highRiskFields.map(f => f.recommendation)
      }
    }
  } catch (error) {
    console.error('Error assessing re-identification risk:', error)
    return { success: false, error: error.message }
  }
}

// ============================================================
// 🔴 NEW: Improved Research Readiness Score
// ============================================================

/**
 * 📊 Calculate Research Readiness Score (v2)
 * With Power Analysis and Statistical Requirements
 */
async function calculateResearchReadiness(db, courseId) {
  try {
    const [assessments, events, interventions, growthHistories] = await Promise.all([
      db.collection('assessments').where('courseId', '==', courseId).get(),
      db.collection('learningEvents').where('courseId', '==', courseId).get(),
      db.collection('interventions').where('courseId', '==', courseId).get(),
      db.collection('studentGrowthHistory').where('courseId', '==', courseId).get()
    ])
    
    const n = new Set(assessments.docs.map(d => d.data().studentId)).size
    
    // Power Analysis (for paired t-test, alpha=0.05, power=0.8)
    const requiredN = {
      smallEffect: 199,   // d = 0.2
      mediumEffect: 34,   // d = 0.5
      largeEffect: 14     // d = 0.8
    }
    
    let sampleSizeVerdict = 'INSUFFICIENT'
    if (n >= requiredN.smallEffect) sampleSizeVerdict = 'SUFFICIENT_FOR_SMALL_EFFECT'
    else if (n >= requiredN.mediumEffect) sampleSizeVerdict = 'SUFFICIENT_FOR_MEDIUM_EFFECT'
    else if (n >= requiredN.largeEffect) sampleSizeVerdict = 'SUFFICIENT_FOR_LARGE_EFFECT'
    
    // Completeness checks
    const withPretest = events.docs.filter(d => d.data().eventType === 'PRETEST').length
    const withPosttest = events.docs.filter(d => d.data().eventType === 'POSTTEST').length
    
    // Calculate scores (0-100)
    let score = 0
    const breakdown = {}
    
    // Sample Size (30 points)
    breakdown.sampleSize = Math.min(30, Math.round((n / 30) * 30))
    score += breakdown.sampleSize
    
    // Completeness (25 points)
    const loggingRate = assessments.size > 0 ? (events.size / assessments.size) : 0
    breakdown.completeness = Math.min(25, Math.round(loggingRate * 25))
    score += breakdown.completeness
    
    // Quality (20 points)
    const hasScaffolding = events.docs.some(d => d.data().scaffolding_hintRequests > 0)
    const hasTimeOnTask = events.docs.some(d => d.data().timeOnTask_seconds > 0)
    breakdown.quality = (hasScaffolding ? 10 : 0) + (hasTimeOnTask ? 10 : 0)
    score += breakdown.quality
    
    // Statistical (25 points)
    const hasPrePost = withPretest > 0 && withPosttest > 0
    breakdown.statistical = hasPrePost ? 25 : 0
    score += breakdown.statistical
    
    // Generate recommendations
    const recommendations = []
    if (n < requiredN.mediumEffect) {
      recommendations.push({
        priority: 'HIGH',
        issue: `Sample size (n=${n}) ไม่พอสำหรับ Medium Effect`,
        action: `ต้องการอีก ${requiredN.mediumEffect - n} คน`,
        impact: '+10 points'
      })
    }
    if (!hasScaffolding) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'ยังไม่มี Scaffolding Metrics',
        action: 'เรียก logLearningEvent พร้อม scaffolding_hintRequests',
        impact: '+10 points'
      })
    }
    if (!hasPrePost) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'ยังไม่มี Pre/Post test data',
        action: 'สร้าง Pretest/Posttest events',
        impact: '+25 points'
      })
    }
    
    return {
      success: true,
      courseId,
      sampleSize: {
        total_n: n,
        required_n_small_effect: requiredN.smallEffect,
        required_n_medium_effect: requiredN.mediumEffect,
        required_n_large_effect: requiredN.largeEffect,
        verdict: sampleSizeVerdict
      },
      dataVolume: {
        assessments: assessments.size,
        events: events.size,
        interventions: interventions.size,
        growthHistories: growthHistories.size
      },
      overallScore: score,
      scoreBreakdown: breakdown,
      recommendations,
      schemaVersion: '3.0'
    }
  } catch (error) {
    console.error('Error calculating research readiness:', error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  EVENT_TYPES,
  SEQUENCE_EVENT_TYPES,
  logLearningEvent,
  updateGrowthHistory,
  logIntervention,
  calculateScoreCorrelation,
  exportResearchCSV,
  generateResearchSummary,
  pearsonCorrelation,
  interpretCorrelation,
  calculateScaffoldingSummary,
  // 🔴 NEW: Sequential Pattern Mining
  logSequenceEvent,
  finalizeSequence,
  // 🔴 NEW: K-Anonymity
  exportKAnonymousData,
  assessReidentificationRisk,
  // 🔴 NEW: Research Readiness v2
  calculateResearchReadiness
}