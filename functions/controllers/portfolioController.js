/**
 * Portfolio Controller
 * Handles portfolio evidence and verification
 * 
 * Functions:
 * - verifyEvidence: Verify portfolio evidence authenticity
 * - createEvidencePack: Bundle portfolio evidence for sharing
 * - getDetailedExplanation: Get AI explanation for assessment
 */

const functions = require('firebase-functions')
const { getDb, FieldValue } = require('../shared/firebase')
const { getOpenAIClient, openaiApiKeySecret } = require('../shared/openai')
const cors = require('cors')({ origin: true })

/**
 * Verify Evidence - Verify portfolio evidence authenticity
 * POST { evidenceId?, verificationCode? }
 */
const verifyEvidence = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const db = getDb()
      const { evidenceId, verificationCode } = req.body

      if (!evidenceId && !verificationCode) {
        return res.status(400).send({ 
          error: 'Provide either evidenceId or verificationCode' 
        })
      }

      let evidenceDoc
      
      if (verificationCode) {
        const snapshot = await db.collection('portfolioEvidence')
          .where('verificationCode', '==', verificationCode)
          .limit(1)
          .get()
        
        if (snapshot.empty) {
          return res.status(404).send({ 
            success: false, 
            verified: false,
            error: 'Evidence not found' 
          })
        }
        evidenceDoc = snapshot.docs[0]
      } else {
        const doc = await db.collection('portfolioEvidence').doc(evidenceId).get()
        if (!doc.exists) {
          return res.status(404).send({ 
            success: false, 
            verified: false,
            error: 'Evidence not found' 
          })
        }
        evidenceDoc = doc
      }

      const evidence = evidenceDoc.data()

      // Log verification attempt
      await db.collection('verificationLogs').add({
        evidenceId: evidenceDoc.id,
        verificationCode,
        verifiedAt: FieldValue.serverTimestamp(),
        ip: req.ip || 'unknown'
      })

      return res.status(200).send({
        success: true,
        verified: true,
        evidence: {
          id: evidenceDoc.id,
          studentId: evidence.studentId,
          type: evidence.type,
          title: evidence.title,
          score: evidence.score,
          createdAt: evidence.createdAt,
          courseId: evidence.courseId,
          courseName: evidence.courseName
        }
      })
    } catch (error) {
      console.error('Error verifying evidence:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

/**
 * Create Evidence Pack - Bundle portfolio evidence for sharing
 * POST { studentId, evidenceIds, title?, description?, isPublic? }
 */
const createEvidencePack = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const db = getDb()
      const { studentId, evidenceIds, title, description, isPublic } = req.body

      if (!studentId || !evidenceIds || evidenceIds.length === 0) {
        return res.status(400).send({ 
          error: 'Missing required fields: studentId, evidenceIds' 
        })
      }

      // Fetch evidence documents
      const evidencePromises = evidenceIds.map(id => 
        db.collection('portfolioEvidence').doc(id).get()
      )
      const evidenceDocs = await Promise.all(evidencePromises)

      const evidenceData = evidenceDocs
        .filter(doc => doc.exists)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

      if (evidenceData.length === 0) {
        return res.status(404).send({ error: 'No valid evidence found' })
      }

      // Generate verification code
      const verificationCode = `EP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      // Create evidence pack
      const packRef = await db.collection('evidencePacks').add({
        studentId,
        title: title || 'Evidence Pack',
        description: description || '',
        evidenceIds,
        evidenceCount: evidenceData.length,
        verificationCode,
        isPublic: isPublic || false,
        totalScore: evidenceData.reduce((sum, e) => sum + (e.score || 0), 0),
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: null
      })

      return res.status(200).send({
        success: true,
        packId: packRef.id,
        verificationCode,
        evidenceCount: evidenceData.length,
        shareUrl: `${req.headers.origin || ''}/portfolio/verify?code=${verificationCode}`
      })
    } catch (error) {
      console.error('Error creating evidence pack:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

/**
 * Get Detailed Explanation - AI generates detailed score explanation
 * POST { assessmentId }
 */
const getDetailedExplanation = functions.runWith({ 
  secrets: [openaiApiKeySecret] 
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const db = getDb()
      const { assessmentId } = req.body

      if (!assessmentId) {
        return res.status(400).send({ error: 'Missing assessmentId' })
      }

      const assessmentDoc = await db.collection('assessments').doc(assessmentId).get()
      if (!assessmentDoc.exists) {
        return res.status(404).send({ error: 'Assessment not found' })
      }

      const assessment = assessmentDoc.data()
      const modelToUse = process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18'

      const response = await getOpenAIClient().chat.completions.create({
        model: modelToUse,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are an educational expert explaining assessment scores to students.
Provide detailed, constructive explanations in Thai language.
Be encouraging while being honest about areas for improvement.`
          },
          {
            role: 'user',
            content: `Explain this assessment in detail:
Question: ${assessment.questionText || 'N/A'}
Student Answer: ${assessment.studentAnswer || 'N/A'}
Scores: ${JSON.stringify(assessment.rubricScores)}
Total: ${assessment.totalScore}/20

Explain:
1. Why each dimension received its score
2. What was done well
3. Specific suggestions for improvement
4. How to improve each weak area`
          }
        ]
      })

      const explanation = response.choices[0].message.content

      // Cache explanation
      await db.collection('assessments').doc(assessmentId).update({
        detailedExplanation: explanation,
        explanationGeneratedAt: FieldValue.serverTimestamp()
      })

      return res.status(200).send({
        success: true,
        explanation,
        assessment: {
          rubricScores: assessment.rubricScores,
          totalScore: assessment.totalScore,
          feedback: assessment.feedback
        }
      })
    } catch (error) {
      console.error('Error getting detailed explanation:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

module.exports = {
  verifyEvidence,
  createEvidencePack,
  getDetailedExplanation
}
