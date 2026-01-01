/**
 * Scheduled Tasks Controller
 * Handles all scheduled/cron-based Cloud Functions
 * 
 * Functions:
 * - generateDailyReport: Daily assessment summary report (0:00 daily)
 * - analyzeTalentTracks: Weekly talent track analysis (Monday 0:00)
 */

const functions = require('firebase-functions')
const { getDb, admin, FieldValue } = require('../shared/firebase')

/**
 * Generate Daily Report
 * Runs at midnight (Bangkok time) every day
 * Creates summary of previous day's assessments
 */
const generateDailyReport = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    const db = getDb()
    console.log('Running daily report generation...')
    
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Query assessments from yesterday
    const assessmentsSnapshot = await db.collection('assessments')
      .where('createdAt', '>=', yesterday)
      .where('createdAt', '<', today)
      .get()
    
    console.log(`Found ${assessmentsSnapshot.size} assessments from yesterday`)
    
    // Store report summary
    await db.collection('reports').add({
      date: yesterday,
      totalAssessments: assessmentsSnapshot.size,
      generatedAt: FieldValue.serverTimestamp()
    })
    
    return null
  })

/**
 * Analyze Talent Tracks
 * Runs every Monday at midnight (Bangkok time)
 * Identifies students for Research/Innovation tracks based on A.R.C.E. scores
 */
const analyzeTalentTracks = functions.pubsub
  .schedule('every monday 00:00')
  .timeZone('Asia/Bangkok')
  .onRun(async (context) => {
    const db = getDb()
    console.log('Starting weekly talent track analysis...')
    
    try {
      const studentsSnapshot = await db.collection('users').where('role', '==', 'student').get()
      let updateCount = 0
      
      for (const doc of studentsSnapshot.docs) {
        const studentId = doc.id
        const studentData = doc.data()
        
        // Get all assessments for this student
        const assessmentsSnapshot = await db.collection('assessments')
          .where('studentId', '==', studentId)
          .get()
          
        if (assessmentsSnapshot.empty) continue
        
        let totalScores = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
        let count = 0
        
        assessmentsSnapshot.forEach(assDoc => {
          const data = assDoc.data()
          if (data.rubricScores) {
            totalScores.analysis += data.rubricScores.analysis || 0
            totalScores.reasoning += data.rubricScores.reasoning || 0
            totalScores.creativity += data.rubricScores.creativity || 0
            totalScores.evidence += data.rubricScores.evidence || 0
            count++
          }
        })
        
        if (count < 5) continue // Need at least 5 assessments to qualify
        
        const avgScores = {
          analysis: totalScores.analysis / count,
          reasoning: totalScores.reasoning / count,
          creativity: totalScores.creativity / count,
          evidence: totalScores.evidence / count
        }
        
        const newTags = []
        
        // Research Track Criteria: High Evidence & Reasoning
        if (avgScores.evidence >= 4.0 && avgScores.reasoning >= 4.0) {
          newTags.push('research_track')
        }
        
        // Innovation Track Criteria: High Creativity & Analysis
        if (avgScores.creativity >= 4.0 && avgScores.analysis >= 4.0) {
          newTags.push('innovation_track')
        }
        
        // Update if tags found
        if (newTags.length > 0) {
          // Merge with existing tags, avoiding duplicates
          const currentTags = studentData.talentTags || []
          const updatedTags = [...new Set([...currentTags, ...newTags])]
          
          if (updatedTags.length !== currentTags.length) {
            await db.collection('users').doc(studentId).update({
              talentTags: updatedTags,
              talentAnalysisLastRun: FieldValue.serverTimestamp(),
              talentScores: avgScores
            })
            
            // Create notification
            await db.collection('notifications').add({
              userId: studentId,
              type: 'talent_badge',
              title: '🎉 You have been identified for a Talent Track!',
              message: `Based on your consistent performance, you have been tagged for: ${newTags.map(t => t.replace('_', ' ').toUpperCase()).join(', ')}`,
              read: false,
              createdAt: FieldValue.serverTimestamp()
            })
            
            updateCount++
          }
        }
      }
      
      console.log(`Talent track analysis complete. Updated ${updateCount} students.`)
      return null
    } catch (error) {
      console.error('Error in analyzeTalentTracks:', error)
      return null
    }
  })

module.exports = {
  generateDailyReport,
  analyzeTalentTracks
}
