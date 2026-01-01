/**
 * Lesson Plan Controller
 * Handles lesson plan generation and micro-lessons
 * 
 * Functions:
 * - generateMicroLesson: Generate short learning modules
 * - generateInterventions: AI suggests personalized interventions
 */

const functions = require('firebase-functions')
const { getDb, FieldValue } = require('../shared/firebase')
const { getOpenAIClient, openaiApiKeySecret } = require('../shared/openai')
const cors = require('cors')({ origin: true })

/**
 * Generate Micro Lesson - Short learning modules (5-10 min)
 * POST { courseId?, topic, learningOutcome?, difficulty?, gradeLevel?, subject? }
 */
const generateMicroLesson = functions.runWith({ 
  secrets: [openaiApiKeySecret] 
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const db = getDb()
      const { courseId, topic, learningOutcome, difficulty, gradeLevel, subject } = req.body

      if (!topic) {
        return res.status(400).send({ error: 'Missing required field: topic' })
      }

      const modelToUse = process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18'

      const response = await getOpenAIClient().chat.completions.create({
        model: modelToUse,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are an expert educational content creator for Thai students.
Create engaging micro-lessons (5-10 minute learning modules).
Grade Level: ${gradeLevel || 'มัธยมศึกษา'}
Subject: ${subject || 'General'}

Return JSON:
{
  "title": "string",
  "objectives": ["..."],
  "content": {
    "introduction": "string",
    "mainContent": "string with markdown",
    "examples": ["..."],
    "summary": "string"
  },
  "activities": [{"type": "quiz|reflection|practice", "instruction": "string"}],
  "estimatedMinutes": number,
  "relatedLOs": ["..."]
}`
          },
          {
            role: 'user',
            content: `Create a micro-lesson about: ${topic}
${learningOutcome ? `Learning Outcome: ${learningOutcome}` : ''}
${difficulty ? `Difficulty: ${difficulty}` : ''}`
          }
        ]
      })

      const lesson = JSON.parse(
        response.choices[0].message.content
          .replace(/^```(?:json)?\s*\n?/i, '')
          .replace(/\n?```\s*$/i, '')
      )

      // Save to Firestore
      const lessonRef = await db.collection('microLessons').add({
        courseId: courseId || null,
        topic,
        learningOutcome,
        difficulty: difficulty || 'medium',
        gradeLevel,
        subject,
        ...lesson,
        status: 'active',
        createdAt: FieldValue.serverTimestamp()
      })

      return res.status(200).send({
        success: true,
        lessonId: lessonRef.id,
        ...lesson
      })
    } catch (error) {
      console.error('Error generating micro lesson:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

/**
 * Generate Interventions - AI suggests personalized interventions
 * POST { studentId, courseId? }
 */
const generateInterventions = functions.runWith({ 
  secrets: [openaiApiKeySecret] 
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' })
      }

      const db = getDb()
      const { studentId, courseId } = req.body

      if (!studentId) {
        return res.status(400).send({ error: 'Missing studentId' })
      }

      // Get student's assessment history
      let query = db.collection('assessments').where('studentId', '==', studentId)
      if (courseId) {
        query = query.where('courseId', '==', courseId)
      }
      
      const assessmentsSnapshot = await query.orderBy('timestamp', 'desc').limit(20).get()
      
      const assessments = assessmentsSnapshot.docs.map(doc => doc.data())

      if (assessments.length === 0) {
        return res.status(200).send({
          success: true,
          interventions: [],
          message: 'No assessment data available'
        })
      }

      // Calculate dimension averages
      const dimensionTotals = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
      assessments.forEach(a => {
        if (a.rubricScores) {
          Object.keys(dimensionTotals).forEach(dim => {
            dimensionTotals[dim] += a.rubricScores[dim] || 0
          })
        }
      })

      const dimensionAverages = {}
      Object.keys(dimensionTotals).forEach(dim => {
        dimensionAverages[dim] = (dimensionTotals[dim] / assessments.length).toFixed(2)
      })

      const modelToUse = process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18'

      const response = await getOpenAIClient().chat.completions.create({
        model: modelToUse,
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content: `You are an educational intervention specialist.
Based on student performance data, suggest specific interventions.
Return JSON array of interventions:
[{
  "type": "remediation|enrichment|practice|support",
  "priority": "high|medium|low",
  "targetDimension": "analysis|reasoning|creativity|evidence",
  "title": "string",
  "description": "string in Thai",
  "activities": ["specific activity suggestions"],
  "estimatedTime": "string",
  "resources": ["optional resource links"]
}]`
          },
          {
            role: 'user',
            content: `Student Performance (${assessments.length} assessments):
Dimension Averages (out of 5):
- Analysis: ${dimensionAverages.analysis}
- Reasoning: ${dimensionAverages.reasoning}
- Creativity: ${dimensionAverages.creativity}
- Evidence: ${dimensionAverages.evidence}

Suggest 3-5 targeted interventions.`
          }
        ]
      })

      const interventions = JSON.parse(
        response.choices[0].message.content
          .replace(/^```(?:json)?\s*\n?/i, '')
          .replace(/\n?```\s*$/i, '')
      )

      return res.status(200).send({
        success: true,
        studentId,
        performanceSummary: dimensionAverages,
        assessmentCount: assessments.length,
        interventions
      })
    } catch (error) {
      console.error('Error generating interventions:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

module.exports = {
  generateMicroLesson,
  generateInterventions
}
