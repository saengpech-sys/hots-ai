/**
 * 👥 Human Calibration Pipeline Module
 * 
 * ระบบ Calibration สำหรับ Human Raters ในงานวิจัย IRR
 * เพื่อสร้าง Gold Standard Dataset และตรวจสอบ AI Accuracy
 * 
 * Features:
 * 1. Rater Training Program
 * 2. Calibration Exercises
 * 3. Inter-Human Agreement Calculation
 * 4. Gold Standard Management
 * 5. Drift Detection
 * 
 * References:
 * - Stemler (2004). Overview of Content Analysis
 * - Hallgren (2012). Computing Inter-Rater Reliability
 * - Krippendorff (2011). Content Analysis
 * 
 * @module humanCalibration
 * @version 1.0.0
 */

const admin = require('firebase-admin')

/**
 * Calibration Configuration
 */
const CALIBRATION_CONFIG = {
  // Training requirements
  training: {
    minExercises: 20,           // ต้องทำ 20 ข้อก่อน certify
    passingAgreement: 0.70,     // ต้อง agree กับ standard 70%+
    maxAttemptsPerExercise: 3,  // ทำซ้ำได้ 3 ครั้ง
    certificationValidDays: 90  // ต้อง recertify ทุก 90 วัน
  },
  
  // Inter-rater reliability thresholds
  irr: {
    minKappa: 0.60,             // Cohen's Kappa ขั้นต่ำ
    minICC: 0.70,               // ICC ขั้นต่ำ
    maxMAE: 1.0,                // MAE สูงสุด
    minAgreement: 0.75          // Percent Agreement ขั้นต่ำ
  },
  
  // Gold Standard requirements
  goldStandard: {
    minExperts: 3,              // ต้องมีผู้เชี่ยวชาญอย่างน้อย 3 คน
    agreementThreshold: 0.80,   // ต้อง agree 80%+ เพื่อเป็น gold
    maxScoreVariance: 1.0       // คะแนนต่างกันไม่เกิน 1
  },
  
  // Drift detection
  drift: {
    checkInterval: 50,          // ตรวจทุก 50 assessments
    driftThreshold: 0.15,       // ถ้า agreement ลดลง 15%+ = drift
    recalibrationTrigger: 3     // drift 3 ครั้งติดต่อกัน = ต้อง recalibrate
  }
}

/**
 * Rater Certification Status
 */
const CERTIFICATION_STATUS = {
  UNCERTIFIED: 'uncertified',
  IN_TRAINING: 'in_training',
  CERTIFIED: 'certified',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended'
}

/**
 * 📚 Create Calibration Exercise Set
 * สร้างชุดฝึกหัด Calibration จาก Gold Standard
 * 
 * @param {Array} goldStandardItems - Items with expert consensus
 * @param {number} count - Number of exercises to create
 * @returns {Array} Calibration exercises
 */
function createCalibrationExercises(goldStandardItems, count = 20) {
  if (!goldStandardItems || goldStandardItems.length < count) {
    console.warn(`Not enough gold standard items. Have: ${goldStandardItems?.length}, Need: ${count}`)
    count = goldStandardItems?.length || 0
  }

  // Stratified sampling by difficulty and dimension
  const exercises = []
  const difficulties = [1, 2, 3, 4, 5]
  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  
  // Try to get balanced representation
  const itemsPerStratum = Math.ceil(count / (difficulties.length * dimensions.length))
  
  for (const difficulty of difficulties) {
    for (const dimension of dimensions) {
      const matching = goldStandardItems.filter(item => 
        item.difficulty === difficulty && 
        item.primaryDimension === dimension &&
        !exercises.includes(item)
      )
      
      const selected = matching.slice(0, itemsPerStratum)
      exercises.push(...selected)
      
      if (exercises.length >= count) break
    }
    if (exercises.length >= count) break
  }

  // Fill remaining with random if needed
  if (exercises.length < count) {
    const remaining = goldStandardItems.filter(item => !exercises.includes(item))
    const needed = count - exercises.length
    exercises.push(...remaining.slice(0, needed))
  }

  // Shuffle
  for (let i = exercises.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [exercises[i], exercises[j]] = [exercises[j], exercises[i]]
  }

  return exercises.slice(0, count).map((item, index) => ({
    id: `calibration_${Date.now()}_${index}`,
    exerciseNumber: index + 1,
    questionContext: item.questionContext,
    studentAnswer: item.studentAnswer,
    goldStandardScores: item.consensusScores,
    goldStandardFeedback: item.consensusFeedback,
    difficulty: item.difficulty,
    primaryDimension: item.primaryDimension,
    // Hide gold standard from rater until after scoring
    showFeedbackAfter: true
  }))
}

/**
 * 📝 Record Rater's Calibration Attempt
 * @param {Object} db - Firestore instance
 * @param {string} raterId - Rater's user ID
 * @param {Object} exercise - Calibration exercise
 * @param {Object} raterScores - Rater's scores
 * @returns {Object} Attempt result with feedback
 */
async function recordCalibrationAttempt(db, raterId, exercise, raterScores) {
  const goldScores = exercise.goldStandardScores
  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  
  // Calculate agreement per dimension
  const dimensionResults = {}
  let totalDiff = 0
  let exactMatches = 0
  
  for (const dim of dimensions) {
    const raterScore = raterScores[dim] ?? 0
    const goldScore = goldScores[dim] ?? 0
    const diff = Math.abs(raterScore - goldScore)
    
    dimensionResults[dim] = {
      raterScore,
      goldScore,
      difference: diff,
      withinTolerance: diff <= 1,
      exactMatch: diff === 0
    }
    
    totalDiff += diff
    if (diff === 0) exactMatches++
  }
  
  // Calculate overall metrics
  const mae = totalDiff / dimensions.length
  const percentExact = exactMatches / dimensions.length
  const passed = mae <= 1.0 && percentExact >= 0.5
  
  const attemptResult = {
    raterId,
    exerciseId: exercise.id,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    raterScores,
    goldStandardScores: goldScores,
    dimensionResults,
    metrics: {
      mae,
      percentExact,
      totalDifference: totalDiff
    },
    passed,
    feedback: generateCalibrationFeedback(dimensionResults, passed)
  }
  
  // Save to database
  await db.collection('calibrationAttempts').add(attemptResult)
  
  // Update rater's progress
  await updateRaterProgress(db, raterId, attemptResult)
  
  return attemptResult
}

/**
 * 💬 Generate Calibration Feedback
 */
function generateCalibrationFeedback(dimensionResults, passed) {
  const feedback = {
    overall: passed ? '✅ ผ่านเกณฑ์!' : '❌ ยังไม่ผ่านเกณฑ์',
    dimensionFeedback: [],
    suggestions: []
  }
  
  for (const [dim, result] of Object.entries(dimensionResults)) {
    const dimNames = {
      analysis: 'การวิเคราะห์',
      reasoning: 'การให้เหตุผล',
      creativity: 'ความคิดสร้างสรรค์',
      evidence: 'การใช้หลักฐาน'
    }
    
    if (result.exactMatch) {
      feedback.dimensionFeedback.push(`${dimNames[dim]}: ✓ ตรงกับมาตรฐาน`)
    } else if (result.withinTolerance) {
      feedback.dimensionFeedback.push(`${dimNames[dim]}: ≈ ใกล้เคียง (ต่าง ${result.difference})`)
    } else {
      feedback.dimensionFeedback.push(`${dimNames[dim]}: ✗ ต่างจากมาตรฐาน ${result.difference} คะแนน`)
      
      if (result.raterScore > result.goldScore) {
        feedback.suggestions.push(`${dimNames[dim]}: คุณให้คะแนนสูงกว่ามาตรฐาน ลองพิจารณาเกณฑ์ให้เข้มงวดขึ้น`)
      } else {
        feedback.suggestions.push(`${dimNames[dim]}: คุณให้คะแนนต่ำกว่ามาตรฐาน ลองพิจารณาหลักฐานในคำตอบอีกครั้ง`)
      }
    }
  }
  
  return feedback
}

/**
 * 📊 Update Rater's Progress
 */
async function updateRaterProgress(db, raterId, attemptResult) {
  const progressRef = db.collection('raterProgress').doc(raterId)
  
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(progressRef)
    const data = doc.exists ? doc.data() : {
      raterId,
      status: CERTIFICATION_STATUS.IN_TRAINING,
      completedExercises: 0,
      passedExercises: 0,
      totalAttempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
    
    data.totalAttempts++
    
    // Check if this is a new exercise pass
    const exerciseKey = `exercise_${attemptResult.exerciseId}`
    if (attemptResult.passed && !data[exerciseKey]) {
      data[exerciseKey] = true
      data.passedExercises++
    }
    
    // Recalculate unique completed exercises
    const uniqueExercises = new Set(
      Object.keys(data)
        .filter(k => k.startsWith('exercise_'))
    )
    data.completedExercises = uniqueExercises.size
    
    // Calculate pass rate
    data.passRate = data.completedExercises > 0 
      ? data.passedExercises / data.completedExercises 
      : 0
    
    // Check for certification
    if (data.passedExercises >= CALIBRATION_CONFIG.training.minExercises &&
        data.passRate >= CALIBRATION_CONFIG.training.passingAgreement) {
      data.status = CERTIFICATION_STATUS.CERTIFIED
      data.certifiedAt = admin.firestore.FieldValue.serverTimestamp()
      data.certificationExpires = new Date(
        Date.now() + CALIBRATION_CONFIG.training.certificationValidDays * 24 * 60 * 60 * 1000
      )
    }
    
    data.lastActivity = admin.firestore.FieldValue.serverTimestamp()
    
    transaction.set(progressRef, data)
  })
}

/**
 * 🏆 Create Gold Standard Item
 * ต้องมีผู้เชี่ยวชาญอย่างน้อย 3 คนที่ agree กัน
 * 
 * @param {Object} db - Firestore instance
 * @param {string} itemId - Assessment item ID
 * @param {Array} expertRatings - Ratings from experts
 * @returns {Object} Gold standard result
 */
async function createGoldStandardItem(db, itemId, expertRatings) {
  if (expertRatings.length < CALIBRATION_CONFIG.goldStandard.minExperts) {
    return {
      success: false,
      error: `ต้องมีผู้เชี่ยวชาญอย่างน้อย ${CALIBRATION_CONFIG.goldStandard.minExperts} คน`
    }
  }
  
  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  const consensusScores = {}
  const scoreVariances = {}
  let canBeGold = true
  
  for (const dim of dimensions) {
    const scores = expertRatings.map(r => r.rubricScores[dim])
    
    // Calculate mean
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    
    // Calculate variance
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
    const stdDev = Math.sqrt(variance)
    
    // Check if experts agree enough
    const maxDiff = Math.max(...scores) - Math.min(...scores)
    
    if (maxDiff > CALIBRATION_CONFIG.goldStandard.maxScoreVariance) {
      canBeGold = false
    }
    
    consensusScores[dim] = Math.round(mean * 10) / 10
    scoreVariances[dim] = {
      mean,
      stdDev,
      min: Math.min(...scores),
      max: Math.max(...scores),
      range: maxDiff
    }
  }
  
  // Calculate overall agreement (percent of dimension-pairs within tolerance)
  let agreementCount = 0
  let totalPairs = 0
  
  for (let i = 0; i < expertRatings.length; i++) {
    for (let j = i + 1; j < expertRatings.length; j++) {
      for (const dim of dimensions) {
        totalPairs++
        if (Math.abs(expertRatings[i].rubricScores[dim] - expertRatings[j].rubricScores[dim]) <= 1) {
          agreementCount++
        }
      }
    }
  }
  
  const interExpertAgreement = agreementCount / totalPairs
  
  if (interExpertAgreement < CALIBRATION_CONFIG.goldStandard.agreementThreshold) {
    canBeGold = false
  }
  
  const result = {
    itemId,
    expertCount: expertRatings.length,
    consensusScores,
    scoreVariances,
    interExpertAgreement,
    canBeGoldStandard: canBeGold,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }
  
  if (canBeGold) {
    // Save as gold standard
    await db.collection('goldStandardItems').doc(itemId).set({
      ...result,
      expertRatings: expertRatings.map(r => ({
        expertId: r.expertId,
        rubricScores: r.rubricScores,
        rationale: r.rationale
      }))
    })
    
    result.success = true
    result.message = 'Item added to Gold Standard'
  } else {
    result.success = false
    result.message = 'Experts do not agree sufficiently'
    result.disagreements = Object.entries(scoreVariances)
      .filter(([_, v]) => v.range > CALIBRATION_CONFIG.goldStandard.maxScoreVariance)
      .map(([dim, v]) => `${dim}: range ${v.range}`)
  }
  
  return result
}

/**
 * 📈 Check Rater Drift
 * ตรวจสอบว่า rater มี drift ในการให้คะแนนหรือไม่
 * 
 * @param {Object} db - Firestore instance
 * @param {string} raterId - Rater ID
 * @returns {Object} Drift analysis
 */
async function checkRaterDrift(db, raterId) {
  // Get recent calibration attempts (last 50)
  const attemptsSnapshot = await db.collection('calibrationAttempts')
    .where('raterId', '==', raterId)
    .orderBy('timestamp', 'desc')
    .limit(100)
    .get()
  
  if (attemptsSnapshot.empty || attemptsSnapshot.size < 20) {
    return { hasDrift: false, message: 'Not enough data for drift analysis' }
  }
  
  const attempts = attemptsSnapshot.docs.map(d => d.data())
  
  // Split into early vs recent
  const midpoint = Math.floor(attempts.length / 2)
  const recentAttempts = attempts.slice(0, midpoint)
  const earlierAttempts = attempts.slice(midpoint)
  
  // Calculate MAE for each period
  const recentMAE = recentAttempts.reduce((sum, a) => sum + a.metrics.mae, 0) / recentAttempts.length
  const earlierMAE = earlierAttempts.reduce((sum, a) => sum + a.metrics.mae, 0) / earlierAttempts.length
  
  // Calculate pass rate for each period
  const recentPassRate = recentAttempts.filter(a => a.passed).length / recentAttempts.length
  const earlierPassRate = earlierAttempts.filter(a => a.passed).length / earlierAttempts.length
  
  // Check for drift
  const maeIncrease = recentMAE - earlierMAE
  const passRateDrop = earlierPassRate - recentPassRate
  
  const hasDrift = maeIncrease > 0.5 || passRateDrop > CALIBRATION_CONFIG.drift.driftThreshold
  
  // Per-dimension drift
  const dimensionDrift = {}
  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  
  for (const dim of dimensions) {
    const recentBias = recentAttempts.reduce((sum, a) => {
      return sum + (a.raterScores[dim] - a.goldStandardScores[dim])
    }, 0) / recentAttempts.length
    
    const earlierBias = earlierAttempts.reduce((sum, a) => {
      return sum + (a.raterScores[dim] - a.goldStandardScores[dim])
    }, 0) / earlierAttempts.length
    
    dimensionDrift[dim] = {
      recentBias: Math.round(recentBias * 100) / 100,
      earlierBias: Math.round(earlierBias * 100) / 100,
      driftDirection: recentBias > earlierBias ? 'lenient' : 'strict'
    }
  }
  
  return {
    hasDrift,
    metrics: {
      recentMAE: Math.round(recentMAE * 100) / 100,
      earlierMAE: Math.round(earlierMAE * 100) / 100,
      maeIncrease: Math.round(maeIncrease * 100) / 100,
      recentPassRate: Math.round(recentPassRate * 100),
      earlierPassRate: Math.round(earlierPassRate * 100),
      passRateDrop: Math.round(passRateDrop * 100)
    },
    dimensionDrift,
    recommendation: hasDrift 
      ? '⚠️ แนะนำให้ทำ Recalibration Training' 
      : '✅ การให้คะแนนสม่ำเสมอดี',
    samplesAnalyzed: attempts.length
  }
}

/**
 * 🎓 Get Rater Certification Status
 */
async function getRaterCertification(db, raterId) {
  const progressDoc = await db.collection('raterProgress').doc(raterId).get()
  
  if (!progressDoc.exists) {
    return {
      status: CERTIFICATION_STATUS.UNCERTIFIED,
      message: 'ยังไม่เคยทำ Calibration Training'
    }
  }
  
  const data = progressDoc.data()
  
  // Check expiration
  if (data.status === CERTIFICATION_STATUS.CERTIFIED && data.certificationExpires) {
    const expiry = data.certificationExpires.toDate ? data.certificationExpires.toDate() : data.certificationExpires
    if (new Date() > expiry) {
      return {
        status: CERTIFICATION_STATUS.EXPIRED,
        expiredAt: expiry,
        message: 'Certification หมดอายุแล้ว กรุณาทำ Recertification'
      }
    }
  }
  
  return {
    status: data.status,
    completedExercises: data.completedExercises,
    passedExercises: data.passedExercises,
    passRate: data.passRate,
    certifiedAt: data.certifiedAt,
    certificationExpires: data.certificationExpires,
    canRate: data.status === CERTIFICATION_STATUS.CERTIFIED
  }
}

/**
 * 📊 Calculate Inter-Human Agreement
 * สำหรับเปรียบเทียบก่อนเทียบกับ AI
 * 
 * @param {Array} humanRatings - Array of { raterId, itemId, rubricScores }
 * @returns {Object} Inter-human reliability metrics
 */
function calculateInterHumanAgreement(humanRatings) {
  // Group ratings by item
  const itemRatings = {}
  for (const rating of humanRatings) {
    if (!itemRatings[rating.itemId]) {
      itemRatings[rating.itemId] = []
    }
    itemRatings[rating.itemId].push(rating)
  }
  
  // Filter items with 2+ ratings
  const multiRatedItems = Object.values(itemRatings).filter(r => r.length >= 2)
  
  if (multiRatedItems.length < 10) {
    return { error: 'Need at least 10 items with multiple ratings' }
  }
  
  const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
  const results = {
    itemCount: multiRatedItems.length,
    raterCount: new Set(humanRatings.map(r => r.raterId)).size,
    perDimension: {}
  }
  
  // Calculate per dimension
  for (const dim of dimensions) {
    let agreements = 0
    let exactAgreements = 0
    let totalPairs = 0
    let sumAbsDiff = 0
    
    for (const itemRates of multiRatedItems) {
      const scores = itemRates.map(r => r.rubricScores[dim])
      
      // Compare all pairs
      for (let i = 0; i < scores.length; i++) {
        for (let j = i + 1; j < scores.length; j++) {
          totalPairs++
          const diff = Math.abs(scores[i] - scores[j])
          sumAbsDiff += diff
          
          if (diff === 0) exactAgreements++
          if (diff <= 1) agreements++
        }
      }
    }
    
    results.perDimension[dim] = {
      exactAgreement: Math.round((exactAgreements / totalPairs) * 100) / 100,
      withinOne: Math.round((agreements / totalPairs) * 100) / 100,
      mae: Math.round((sumAbsDiff / totalPairs) * 100) / 100,
      pairs: totalPairs
    }
  }
  
  // Overall metrics
  const overallExact = Object.values(results.perDimension).reduce((s, d) => s + d.exactAgreement, 0) / 4
  const overallWithinOne = Object.values(results.perDimension).reduce((s, d) => s + d.withinOne, 0) / 4
  const overallMAE = Object.values(results.perDimension).reduce((s, d) => s + d.mae, 0) / 4
  
  results.overall = {
    exactAgreement: Math.round(overallExact * 100) / 100,
    withinOneAgreement: Math.round(overallWithinOne * 100) / 100,
    mae: Math.round(overallMAE * 100) / 100,
    meetsThreshold: overallWithinOne >= CALIBRATION_CONFIG.irr.minAgreement,
    thresholdUsed: CALIBRATION_CONFIG.irr.minAgreement
  }
  
  results.interpretation = overallWithinOne >= 0.80 
    ? 'Excellent agreement between human raters'
    : overallWithinOne >= 0.60
    ? 'Acceptable agreement - can proceed with caution'
    : 'Poor agreement - need more calibration'
  
  return results
}

module.exports = {
  CALIBRATION_CONFIG,
  CERTIFICATION_STATUS,
  createCalibrationExercises,
  recordCalibrationAttempt,
  updateRaterProgress,
  createGoldStandardItem,
  checkRaterDrift,
  getRaterCertification,
  calculateInterHumanAgreement
}
