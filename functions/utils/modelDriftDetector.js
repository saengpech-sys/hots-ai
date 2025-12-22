/**
 * 🔍 Model Drift Detector Module
 * 
 * ตรวจจับการเปลี่ยนแปลงของ OpenAI model version
 * เพื่อรักษา reproducibility ในงานวิจัย
 * 
 * Features:
 * 1. Track system_fingerprint changes
 * 2. Alert on model drift
 * 3. Maintain fingerprint history
 * 4. Score reproducibility analysis
 * 
 * @module modelDriftDetector
 * @version 1.0.0
 */

const admin = require('firebase-admin')

/**
 * Configuration
 */
const DRIFT_CONFIG = {
  // Alert thresholds
  alertOnNewFingerprint: true,
  maxFingerprintsToStore: 100,
  
  // Analysis settings
  minSamplesForAnalysis: 50,
  scoreDeviationThreshold: 0.5,  // Flag if avg score changes by 0.5+
  
  // Collections
  fingerprintCollection: 'modelFingerprints',
  driftAlertsCollection: 'modelDriftAlerts'
}

/**
 * 📊 Record Model Fingerprint
 * บันทึก fingerprint ทุกครั้งที่ประเมิน
 * 
 * @param {Object} db - Firestore instance
 * @param {Object} completionData - OpenAI completion response data
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Recording result
 */
async function recordModelFingerprint(db, completionData, metadata = {}) {
  const {
    systemFingerprint,
    completionId,
    modelSnapshot,
    modelRequested
  } = completionData
  
  if (!systemFingerprint) {
    return { recorded: false, reason: 'No fingerprint provided' }
  }
  
  const now = admin.firestore.FieldValue.serverTimestamp()
  const fingerprintRef = db.collection(DRIFT_CONFIG.fingerprintCollection).doc(systemFingerprint)
  
  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(fingerprintRef)
      
      if (!doc.exists) {
        // New fingerprint detected!
        const newRecord = {
          fingerprint: systemFingerprint,
          modelSnapshot,
          modelRequested,
          firstSeen: now,
          lastSeen: now,
          usageCount: 1,
          scores: metadata.rubricScores ? [metadata.overallScore] : [],
          avgScore: metadata.overallScore || null,
          isNew: true
        }
        
        transaction.set(fingerprintRef, newRecord)
        
        // Create drift alert
        if (DRIFT_CONFIG.alertOnNewFingerprint) {
          const alertRef = db.collection(DRIFT_CONFIG.driftAlertsCollection).doc()
          transaction.set(alertRef, {
            type: 'NEW_FINGERPRINT',
            fingerprint: systemFingerprint,
            modelSnapshot,
            previousFingerprints: await getPreviousFingerprints(db),
            timestamp: now,
            resolved: false,
            metadata
          })
        }
        
        return { isNew: true, fingerprint: systemFingerprint }
      } else {
        // Existing fingerprint - update usage
        const data = doc.data()
        const newScores = metadata.overallScore 
          ? [...(data.scores || []).slice(-99), metadata.overallScore]
          : data.scores
        
        transaction.update(fingerprintRef, {
          lastSeen: now,
          usageCount: admin.firestore.FieldValue.increment(1),
          scores: newScores,
          avgScore: newScores.length > 0 
            ? newScores.reduce((a, b) => a + b, 0) / newScores.length 
            : null
        })
        
        return { isNew: false, fingerprint: systemFingerprint }
      }
    })
    
    return { recorded: true, ...result }
  } catch (error) {
    console.error('Error recording fingerprint:', error)
    return { recorded: false, error: error.message }
  }
}

/**
 * 📋 Get Previous Fingerprints
 */
async function getPreviousFingerprints(db, limit = 5) {
  try {
    const snapshot = await db.collection(DRIFT_CONFIG.fingerprintCollection)
      .orderBy('lastSeen', 'desc')
      .limit(limit)
      .get()
    
    return snapshot.docs.map(doc => ({
      fingerprint: doc.id,
      lastSeen: doc.data().lastSeen,
      usageCount: doc.data().usageCount
    }))
  } catch (error) {
    return []
  }
}

/**
 * 🔍 Detect Model Drift
 * วิเคราะห์ว่า model drift มีผลต่อคะแนนหรือไม่
 * 
 * @param {Object} db - Firestore instance
 * @returns {Object} Drift analysis
 */
async function analyzeModelDrift(db) {
  try {
    const fingerprintsSnapshot = await db.collection(DRIFT_CONFIG.fingerprintCollection)
      .orderBy('firstSeen', 'desc')
      .limit(10)
      .get()
    
    if (fingerprintsSnapshot.empty) {
      return { hasDrift: false, message: 'No fingerprint data available' }
    }
    
    const fingerprints = fingerprintsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Check for multiple fingerprints (indicates model updates)
    const uniqueFingerprints = fingerprints.length
    
    if (uniqueFingerprints === 1) {
      return {
        hasDrift: false,
        message: 'Only one model version detected',
        currentFingerprint: fingerprints[0].fingerprint,
        stability: 'STABLE'
      }
    }
    
    // Analyze score differences between fingerprints
    const scoresByFingerprint = fingerprints
      .filter(f => f.avgScore !== null && f.usageCount >= 10)
      .map(f => ({
        fingerprint: f.fingerprint.substring(0, 12) + '...',
        avgScore: Math.round(f.avgScore * 100) / 100,
        usageCount: f.usageCount,
        firstSeen: f.firstSeen
      }))
    
    if (scoresByFingerprint.length < 2) {
      return {
        hasDrift: true,
        severity: 'LOW',
        message: 'Multiple fingerprints detected but insufficient data for score comparison',
        fingerprints: scoresByFingerprint,
        stability: 'UNCERTAIN'
      }
    }
    
    // Calculate score deviation
    const scores = scoresByFingerprint.map(s => s.avgScore)
    const maxScore = Math.max(...scores)
    const minScore = Math.min(...scores)
    const deviation = maxScore - minScore
    
    const hasMeaningfulDrift = deviation > DRIFT_CONFIG.scoreDeviationThreshold
    
    return {
      hasDrift: uniqueFingerprints > 1,
      hasMeaningfulDrift,
      severity: hasMeaningfulDrift ? 'HIGH' : 'LOW',
      scoreDeviation: Math.round(deviation * 100) / 100,
      fingerprints: scoresByFingerprint,
      stability: hasMeaningfulDrift ? 'UNSTABLE' : 'ACCEPTABLE',
      recommendation: hasMeaningfulDrift 
        ? '⚠️ คะแนนเฉลี่ยต่างกันมากระหว่าง model versions - ควรพิจารณาในการวิเคราะห์ผลวิจัย'
        : '✅ ความแตกต่างของคะแนนอยู่ในเกณฑ์ที่ยอมรับได้',
      analysis: {
        totalFingerprints: uniqueFingerprints,
        scoredFingerprints: scoresByFingerprint.length,
        avgScoreRange: { min: minScore, max: maxScore }
      }
    }
  } catch (error) {
    return { error: error.message }
  }
}

/**
 * 🔔 Check for Recent Drift Alerts
 */
async function getRecentDriftAlerts(db, limit = 10) {
  try {
    const snapshot = await db.collection(DRIFT_CONFIG.driftAlertsCollection)
      .where('resolved', '==', false)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get()
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    return []
  }
}

/**
 * ✅ Resolve Drift Alert
 */
async function resolveDriftAlert(db, alertId, resolution) {
  await db.collection(DRIFT_CONFIG.driftAlertsCollection).doc(alertId).update({
    resolved: true,
    resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    resolution
  })
}

/**
 * 📊 Get Reproducibility Report
 * รายงานสำหรับงานวิจัย
 */
async function getReproducibilityReport(db, options = {}) {
  const driftAnalysis = await analyzeModelDrift(db)
  const alerts = await getRecentDriftAlerts(db)
  
  // Get assessment count per fingerprint
  const fingerprintsSnapshot = await db.collection(DRIFT_CONFIG.fingerprintCollection)
    .orderBy('usageCount', 'desc')
    .limit(20)
    .get()
  
  const fingerprints = fingerprintsSnapshot.docs.map(doc => {
    const data = doc.data()
    return {
      fingerprint: doc.id.substring(0, 16) + '...',
      usageCount: data.usageCount,
      avgScore: data.avgScore ? Math.round(data.avgScore * 100) / 100 : null,
      scoreStdDev: data.scores?.length > 1 
        ? Math.round(calculateStdDev(data.scores) * 100) / 100 
        : null,
      period: {
        firstSeen: data.firstSeen,
        lastSeen: data.lastSeen
      }
    }
  })
  
  // Dominant fingerprint
  const dominant = fingerprints[0]
  const totalUsage = fingerprints.reduce((sum, f) => sum + f.usageCount, 0)
  const dominanceRatio = dominant ? (dominant.usageCount / totalUsage) : 0
  
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalFingerprints: fingerprints.length,
      totalAssessments: totalUsage,
      dominantFingerprint: dominant?.fingerprint,
      dominanceRatio: Math.round(dominanceRatio * 100) + '%',
      overallStability: driftAnalysis.stability
    },
    driftAnalysis,
    unresolvedAlerts: alerts.length,
    fingerprints,
    researchImplications: generateResearchImplications(driftAnalysis, dominanceRatio)
  }
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values) {
  if (!values || values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length)
}

/**
 * Generate research implications
 */
function generateResearchImplications(driftAnalysis, dominanceRatio) {
  const implications = []
  
  if (driftAnalysis.hasMeaningfulDrift) {
    implications.push({
      severity: 'HIGH',
      issue: 'Score drift detected across model versions',
      recommendation: 'Include model version as covariate in analysis or filter by dominant fingerprint'
    })
  }
  
  if (dominanceRatio < 0.8) {
    implications.push({
      severity: 'MEDIUM',
      issue: 'Multiple model versions contributed significantly to data',
      recommendation: 'Report model version distribution in methodology section'
    })
  }
  
  if (implications.length === 0) {
    implications.push({
      severity: 'LOW',
      issue: 'No significant reproducibility concerns',
      recommendation: 'Document dominant model fingerprint for future reference'
    })
  }
  
  return implications
}

module.exports = {
  DRIFT_CONFIG,
  recordModelFingerprint,
  analyzeModelDrift,
  getRecentDriftAlerts,
  resolveDriftAlert,
  getReproducibilityReport
}
