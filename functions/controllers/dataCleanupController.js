/**
 * Data Cleanup Controller
 * จัดการข้อมูลตกค้าง (Orphaned Data) ในระบบ
 * 
 * Functions:
 * - cleanupOrphanedData: ลบข้อมูลที่ไม่มี reference แล้ว
 * - getOrphanedDataStats: ดูสถิติข้อมูลตกค้าง
 */

const functions = require('firebase-functions')
const { admin, db, FieldValue } = require('../shared/firebase')
const cors = require('cors')({ origin: true })
const { verifyTeacherRole } = require('../utils/authMiddleware')

/**
 * Get Orphaned Data Statistics
 * ดูสถิติข้อมูลตกค้างในระบบ (Dry Run)
 * 
 * GET /getOrphanedDataStats?courseId=xxx
 * 
 * Response: {
 *   orphanedLessonPlans: [],
 *   orphanedKnowledgeSheets: [],
 *   orphanedWorksheets: [],
 *   orphanedUnitKnowledgeSheets: [],
 *   summary: { total, byType }
 * }
 */
exports.getOrphanedDataStats = functions.runWith({
  timeoutSeconds: 300,
  memory: '1GB'
}).https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('')
  }
  
  return cors(req, res, async () => {
    try {
      // 🔐 Verify teacher role
      const caller = await verifyTeacherRole(req, res)
      if (!caller) return

      const { courseId, teacherId } = req.query
      const effectiveTeacherId = teacherId || caller.uid

      console.log('🔍 Scanning for orphaned data...', { courseId, teacherId: effectiveTeacherId })

      const result = {
        orphanedLessonPlans: [],
        orphanedKnowledgeSheets: [],
        orphanedWorksheets: [],
        orphanedUnitKnowledgeSheets: [],
        summary: {
          total: 0,
          byType: {}
        }
      }

      // 1. Get all valid courses for this teacher
      let coursesQuery = db.collection('courses').where('teacherId', '==', effectiveTeacherId)
      if (courseId) {
        coursesQuery = db.collection('courses').where('__name__', '==', courseId)
      }
      const coursesSnap = await coursesQuery.get()
      const validCourseIds = new Set(coursesSnap.docs.map(d => d.id))
      
      // Build map of valid lesson plan IDs from curriculum
      const validLessonPlanIds = new Set()
      coursesSnap.docs.forEach(courseDoc => {
        const curriculum = courseDoc.data().curriculum
        if (curriculum?.units) {
          curriculum.units.forEach(unit => {
            if (unit.plans) {
              unit.plans.forEach(plan => {
                if (plan.id) {
                  validLessonPlanIds.add(plan.id)
                }
              })
            }
          })
        }
      })

      console.log(`📊 Found ${validCourseIds.size} courses with ${validLessonPlanIds.size} valid plans`)

      // 2. Find orphaned lesson plans (plans not in any curriculum)
      let plansQuery = db.collection('lessonPlans')
      if (courseId) {
        plansQuery = plansQuery.where('courseId', '==', courseId)
      } else {
        plansQuery = plansQuery.where('teacherId', '==', effectiveTeacherId)
      }
      const plansSnap = await plansQuery.get()

      plansSnap.docs.forEach(planDoc => {
        const data = planDoc.data()
        // Check if this plan ID exists in any curriculum
        if (!validLessonPlanIds.has(planDoc.id)) {
          result.orphanedLessonPlans.push({
            id: planDoc.id,
            courseId: data.courseId,
            unitNumber: data.unitNumber,
            planNumber: data.planNumber,
            topic: data.topic,
            createdAt: data.createdAt?.toDate?.() || data.createdAt
          })
        }
      })

      // 3. Find orphaned knowledge sheets
      let ksQuery = db.collection('knowledgeSheets')
      if (courseId) {
        ksQuery = ksQuery.where('courseId', '==', courseId)
      } else {
        ksQuery = ksQuery.where('teacherId', '==', effectiveTeacherId)
      }
      const ksSnap = await ksQuery.get()

      // Get all lesson plan IDs that actually exist
      const existingPlanIds = new Set(plansSnap.docs.map(d => d.id))

      ksSnap.docs.forEach(ksDoc => {
        const data = ksDoc.data()
        const lessonPlanId = data.lessonPlanId
        
        // Orphaned if:
        // 1. lessonPlanId doesn't exist in DB anymore, OR
        // 2. lessonPlanId not in valid curriculum plans
        if (lessonPlanId && (!existingPlanIds.has(lessonPlanId) || !validLessonPlanIds.has(lessonPlanId))) {
          result.orphanedKnowledgeSheets.push({
            id: ksDoc.id,
            lessonPlanId: lessonPlanId,
            courseId: data.courseId,
            unitNumber: data.metadata?.unitNumber,
            planNumber: data.metadata?.planNumber,
            title: data.title || data.metadata?.topic,
            createdAt: data.createdAt?.toDate?.() || data.createdAt
          })
        }
      })

      // 4. Find orphaned worksheets
      let wsQuery = db.collection('worksheets')
      if (courseId) {
        wsQuery = wsQuery.where('courseId', '==', courseId)
      } else {
        wsQuery = wsQuery.where('teacherId', '==', effectiveTeacherId)
      }
      const wsSnap = await wsQuery.get()

      wsSnap.docs.forEach(wsDoc => {
        const data = wsDoc.data()
        const lessonPlanId = data.lessonPlanId
        
        if (lessonPlanId && (!existingPlanIds.has(lessonPlanId) || !validLessonPlanIds.has(lessonPlanId))) {
          result.orphanedWorksheets.push({
            id: wsDoc.id,
            lessonPlanId: lessonPlanId,
            courseId: data.courseId,
            unitNumber: data.unitNumber,
            planNumber: data.planNumber,
            title: data.title,
            createdAt: data.createdAt?.toDate?.() || data.createdAt
          })
        }
      })

      // 5. Find orphaned unit knowledge sheets
      let unitKsQuery = db.collection('unitKnowledgeSheets')
      if (courseId) {
        unitKsQuery = unitKsQuery.where('courseId', '==', courseId)
      }
      // Note: unitKnowledgeSheets might not have teacherId, check courseId instead
      const unitKsSnap = await unitKsQuery.get()

      unitKsSnap.docs.forEach(unitKsDoc => {
        const data = unitKsDoc.data()
        const docCourseId = data.courseId
        
        // Orphaned if course doesn't exist
        if (docCourseId && !validCourseIds.has(docCourseId)) {
          result.orphanedUnitKnowledgeSheets.push({
            id: unitKsDoc.id,
            courseId: docCourseId,
            unitNumber: data.unitNumber || data.metadata?.unitNumber,
            title: data.title,
            createdAt: data.createdAt?.toDate?.() || data.createdAt
          })
        }
      })

      // Calculate summary
      result.summary = {
        total: result.orphanedLessonPlans.length + 
               result.orphanedKnowledgeSheets.length + 
               result.orphanedWorksheets.length +
               result.orphanedUnitKnowledgeSheets.length,
        byType: {
          lessonPlans: result.orphanedLessonPlans.length,
          knowledgeSheets: result.orphanedKnowledgeSheets.length,
          worksheets: result.orphanedWorksheets.length,
          unitKnowledgeSheets: result.orphanedUnitKnowledgeSheets.length
        }
      }

      console.log('📊 Orphaned data summary:', result.summary)

      return res.status(200).json({
        success: true,
        ...result,
        scannedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('❌ Error scanning orphaned data:', error)
      return res.status(500).json({
        success: false,
        error: error.message
      })
    }
  })
})

/**
 * Cleanup Orphaned Data
 * ลบข้อมูลตกค้างที่ไม่มี reference แล้ว
 * 
 * POST /cleanupOrphanedData
 * Body: {
 *   courseId?: string,      // Optional: cleanup specific course
 *   dryRun?: boolean,       // Default true - preview only
 *   types?: string[]        // ['lessonPlans', 'knowledgeSheets', 'worksheets', 'unitKnowledgeSheets']
 * }
 */
exports.cleanupOrphanedData = functions.runWith({
  timeoutSeconds: 540,
  memory: '2GB'
}).https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('')
  }
  
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
      }

      // 🔐 Verify teacher role
      const caller = await verifyTeacherRole(req, res)
      if (!caller) return

      const { 
        courseId, 
        dryRun = true, 
        types = ['lessonPlans', 'knowledgeSheets', 'worksheets', 'unitKnowledgeSheets']
      } = req.body

      const effectiveTeacherId = caller.uid

      console.log('🧹 Starting cleanup...', { courseId, dryRun, types, teacherId: effectiveTeacherId })

      const result = {
        deleted: {
          lessonPlans: [],
          knowledgeSheets: [],
          worksheets: [],
          unitKnowledgeSheets: []
        },
        errors: [],
        summary: {
          total: 0,
          byType: {}
        }
      }

      // 1. Get valid data (same logic as getOrphanedDataStats)
      let coursesQuery = db.collection('courses').where('teacherId', '==', effectiveTeacherId)
      if (courseId) {
        coursesQuery = db.collection('courses').where('__name__', '==', courseId)
      }
      const coursesSnap = await coursesQuery.get()
      const validCourseIds = new Set(coursesSnap.docs.map(d => d.id))
      
      const validLessonPlanIds = new Set()
      coursesSnap.docs.forEach(courseDoc => {
        const curriculum = courseDoc.data().curriculum
        if (curriculum?.units) {
          curriculum.units.forEach(unit => {
            if (unit.plans) {
              unit.plans.forEach(plan => {
                if (plan.id) {
                  validLessonPlanIds.add(plan.id)
                }
              })
            }
          })
        }
      })

      // Get existing plan IDs
      let plansQuery = db.collection('lessonPlans')
      if (courseId) {
        plansQuery = plansQuery.where('courseId', '==', courseId)
      } else {
        plansQuery = plansQuery.where('teacherId', '==', effectiveTeacherId)
      }
      const plansSnap = await plansQuery.get()
      const existingPlanIds = new Set(plansSnap.docs.map(d => d.id))

      // 2. Delete orphaned lesson plans
      if (types.includes('lessonPlans')) {
        for (const planDoc of plansSnap.docs) {
          if (!validLessonPlanIds.has(planDoc.id)) {
            const data = planDoc.data()
            if (dryRun) {
              result.deleted.lessonPlans.push({
                id: planDoc.id,
                topic: data.topic,
                action: 'would_delete'
              })
            } else {
              try {
                await planDoc.ref.delete()
                result.deleted.lessonPlans.push({
                  id: planDoc.id,
                  topic: data.topic,
                  action: 'deleted'
                })
              } catch (err) {
                result.errors.push({
                  type: 'lessonPlan',
                  id: planDoc.id,
                  error: err.message
                })
              }
            }
          }
        }
      }

      // 3. Delete orphaned knowledge sheets
      if (types.includes('knowledgeSheets')) {
        let ksQuery = db.collection('knowledgeSheets')
        if (courseId) {
          ksQuery = ksQuery.where('courseId', '==', courseId)
        } else {
          ksQuery = ksQuery.where('teacherId', '==', effectiveTeacherId)
        }
        const ksSnap = await ksQuery.get()

        for (const ksDoc of ksSnap.docs) {
          const data = ksDoc.data()
          const lessonPlanId = data.lessonPlanId
          
          if (lessonPlanId && (!existingPlanIds.has(lessonPlanId) || !validLessonPlanIds.has(lessonPlanId))) {
            if (dryRun) {
              result.deleted.knowledgeSheets.push({
                id: ksDoc.id,
                title: data.title,
                lessonPlanId,
                action: 'would_delete'
              })
            } else {
              try {
                await ksDoc.ref.delete()
                result.deleted.knowledgeSheets.push({
                  id: ksDoc.id,
                  title: data.title,
                  action: 'deleted'
                })
              } catch (err) {
                result.errors.push({
                  type: 'knowledgeSheet',
                  id: ksDoc.id,
                  error: err.message
                })
              }
            }
          }
        }
      }

      // 4. Delete orphaned worksheets
      if (types.includes('worksheets')) {
        let wsQuery = db.collection('worksheets')
        if (courseId) {
          wsQuery = wsQuery.where('courseId', '==', courseId)
        } else {
          wsQuery = wsQuery.where('teacherId', '==', effectiveTeacherId)
        }
        const wsSnap = await wsQuery.get()

        for (const wsDoc of wsSnap.docs) {
          const data = wsDoc.data()
          const lessonPlanId = data.lessonPlanId
          
          if (lessonPlanId && (!existingPlanIds.has(lessonPlanId) || !validLessonPlanIds.has(lessonPlanId))) {
            if (dryRun) {
              result.deleted.worksheets.push({
                id: wsDoc.id,
                title: data.title,
                lessonPlanId,
                action: 'would_delete'
              })
            } else {
              try {
                await wsDoc.ref.delete()
                result.deleted.worksheets.push({
                  id: wsDoc.id,
                  title: data.title,
                  action: 'deleted'
                })
              } catch (err) {
                result.errors.push({
                  type: 'worksheet',
                  id: wsDoc.id,
                  error: err.message
                })
              }
            }
          }
        }
      }

      // 5. Delete orphaned unit knowledge sheets
      if (types.includes('unitKnowledgeSheets')) {
        let unitKsQuery = db.collection('unitKnowledgeSheets')
        if (courseId) {
          unitKsQuery = unitKsQuery.where('courseId', '==', courseId)
        }
        const unitKsSnap = await unitKsQuery.get()

        for (const unitKsDoc of unitKsSnap.docs) {
          const data = unitKsDoc.data()
          const docCourseId = data.courseId
          
          if (docCourseId && !validCourseIds.has(docCourseId)) {
            if (dryRun) {
              result.deleted.unitKnowledgeSheets.push({
                id: unitKsDoc.id,
                title: data.title,
                courseId: docCourseId,
                action: 'would_delete'
              })
            } else {
              try {
                await unitKsDoc.ref.delete()
                result.deleted.unitKnowledgeSheets.push({
                  id: unitKsDoc.id,
                  title: data.title,
                  action: 'deleted'
                })
              } catch (err) {
                result.errors.push({
                  type: 'unitKnowledgeSheet',
                  id: unitKsDoc.id,
                  error: err.message
                })
              }
            }
          }
        }
      }

      // Calculate summary
      result.summary = {
        total: result.deleted.lessonPlans.length + 
               result.deleted.knowledgeSheets.length + 
               result.deleted.worksheets.length +
               result.deleted.unitKnowledgeSheets.length,
        byType: {
          lessonPlans: result.deleted.lessonPlans.length,
          knowledgeSheets: result.deleted.knowledgeSheets.length,
          worksheets: result.deleted.worksheets.length,
          unitKnowledgeSheets: result.deleted.unitKnowledgeSheets.length
        },
        errorsCount: result.errors.length
      }

      console.log(`🧹 Cleanup ${dryRun ? '(DRY RUN)' : ''} complete:`, result.summary)

      return res.status(200).json({
        success: true,
        dryRun,
        ...result,
        executedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('❌ Error cleaning up data:', error)
      return res.status(500).json({
        success: false,
        error: error.message
      })
    }
  })
})

/**
 * Get Data Storage Stats
 * ดูสถิติการใช้พื้นที่เก็บข้อมูลของครู
 */
exports.getDataStorageStats = functions.runWith({
  timeoutSeconds: 120,
  memory: '512MB'
}).https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('')
  }
  
  return cors(req, res, async () => {
    try {
      const caller = await verifyTeacherRole(req, res)
      if (!caller) return

      const { courseId } = req.query
      const teacherId = caller.uid

      const stats = {
        courses: 0,
        lessonPlans: 0,
        knowledgeSheets: 0,
        worksheets: 0,
        unitKnowledgeSheets: 0,
        worksheetSubmissions: 0,
        assessments: 0
      }

      // Count courses
      let coursesQuery = db.collection('courses').where('teacherId', '==', teacherId)
      if (courseId) {
        coursesQuery = db.collection('courses').where('__name__', '==', courseId)
      }
      const coursesSnap = await coursesQuery.count().get()
      stats.courses = coursesSnap.data().count

      // Count lesson plans
      let plansQuery = db.collection('lessonPlans')
      if (courseId) {
        plansQuery = plansQuery.where('courseId', '==', courseId)
      } else {
        plansQuery = plansQuery.where('teacherId', '==', teacherId)
      }
      const plansSnap = await plansQuery.count().get()
      stats.lessonPlans = plansSnap.data().count

      // Count knowledge sheets
      let ksQuery = db.collection('knowledgeSheets')
      if (courseId) {
        ksQuery = ksQuery.where('courseId', '==', courseId)
      } else {
        ksQuery = ksQuery.where('teacherId', '==', teacherId)
      }
      const ksSnap = await ksQuery.count().get()
      stats.knowledgeSheets = ksSnap.data().count

      // Count worksheets
      let wsQuery = db.collection('worksheets')
      if (courseId) {
        wsQuery = wsQuery.where('courseId', '==', courseId)
      } else {
        wsQuery = wsQuery.where('teacherId', '==', teacherId)
      }
      const wsSnap = await wsQuery.count().get()
      stats.worksheets = wsSnap.data().count

      // Count unit knowledge sheets
      if (courseId) {
        const unitKsSnap = await db.collection('unitKnowledgeSheets')
          .where('courseId', '==', courseId)
          .count().get()
        stats.unitKnowledgeSheets = unitKsSnap.data().count
      }

      return res.status(200).json({
        success: true,
        teacherId,
        courseId: courseId || 'all',
        stats,
        queriedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('❌ Error getting storage stats:', error)
      return res.status(500).json({
        success: false,
        error: error.message
      })
    }
  })
})

/**
 * Reset Course Data
 * ลบข้อมูลทั้งหมดของรายวิชา (แผนการสอน, ใบความรู้, ใบงาน)
 * 
 * POST /resetCourseData
 * Body: { courseId, dryRun: true/false }
 * 
 * ⚠️ คำเตือน: ฟังก์ชันนี้จะลบข้อมูลถาวร!
 */
exports.resetCourseData = functions.runWith({
  timeoutSeconds: 540,
  memory: '2GB'
}).https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('')
  }
  
  return cors(req, res, async () => {
    try {
      // 🔐 Verify teacher role
      const caller = await verifyTeacherRole(req, res)
      if (!caller) return

      const { courseId, dryRun = true, clearCurriculum = false } = req.body

      if (!courseId) {
        return res.status(400).json({
          success: false,
          error: 'courseId is required'
        })
      }

      console.log('🗑️ Reset course data request:', { courseId, dryRun, clearCurriculum, teacherId: caller.uid })

      // Verify course ownership
      const courseDoc = await db.collection('courses').doc(courseId).get()
      if (!courseDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Course not found'
        })
      }

      if (courseDoc.data().teacherId !== caller.uid) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to reset this course'
        })
      }

      const result = {
        deleted: {
          lessonPlans: [],
          knowledgeSheets: [],
          worksheets: [],
          unitKnowledgeSheets: []
        },
        summary: {
          lessonPlans: 0,
          knowledgeSheets: 0,
          worksheets: 0,
          unitKnowledgeSheets: 0,
          total: 0
        },
        errors: [],
        dryRun,
        clearCurriculum
      }

      // 1. Get all lesson plans for this course
      const plansSnap = await db.collection('lessonPlans')
        .where('courseId', '==', courseId)
        .get()

      plansSnap.docs.forEach(doc => {
        result.deleted.lessonPlans.push({
          id: doc.id,
          topic: doc.data().topic,
          unitNumber: doc.data().unitNumber,
          planNumber: doc.data().planNumber
        })
      })
      result.summary.lessonPlans = plansSnap.docs.length

      // 2. Get all knowledge sheets for this course
      const ksSnap = await db.collection('knowledgeSheets')
        .where('courseId', '==', courseId)
        .get()

      ksSnap.docs.forEach(doc => {
        result.deleted.knowledgeSheets.push({
          id: doc.id,
          title: doc.data().title || doc.data().metadata?.topic
        })
      })
      result.summary.knowledgeSheets = ksSnap.docs.length

      // 3. Get all worksheets for this course
      const wsSnap = await db.collection('worksheets')
        .where('courseId', '==', courseId)
        .get()

      wsSnap.docs.forEach(doc => {
        result.deleted.worksheets.push({
          id: doc.id,
          title: doc.data().title
        })
      })
      result.summary.worksheets = wsSnap.docs.length

      // 4. Get all unit knowledge sheets for this course
      const unitKsSnap = await db.collection('unitKnowledgeSheets')
        .where('courseId', '==', courseId)
        .get()

      unitKsSnap.docs.forEach(doc => {
        result.deleted.unitKnowledgeSheets.push({
          id: doc.id,
          title: doc.data().title
        })
      })
      result.summary.unitKnowledgeSheets = unitKsSnap.docs.length

      result.summary.total = result.summary.lessonPlans + 
                             result.summary.knowledgeSheets + 
                             result.summary.worksheets + 
                             result.summary.unitKnowledgeSheets

      // If not dry run, actually delete
      if (!dryRun) {
        const batch = db.batch()
        let batchCount = 0
        const MAX_BATCH = 500

        const commitBatch = async () => {
          if (batchCount > 0) {
            await batch.commit()
            batchCount = 0
          }
        }

        // Delete lesson plans
        for (const plan of plansSnap.docs) {
          try {
            batch.delete(plan.ref)
            batchCount++
            if (batchCount >= MAX_BATCH) {
              await commitBatch()
            }
          } catch (err) {
            result.errors.push({ type: 'lessonPlan', id: plan.id, error: err.message })
          }
        }

        // Delete knowledge sheets
        for (const ks of ksSnap.docs) {
          try {
            batch.delete(ks.ref)
            batchCount++
            if (batchCount >= MAX_BATCH) {
              await commitBatch()
            }
          } catch (err) {
            result.errors.push({ type: 'knowledgeSheet', id: ks.id, error: err.message })
          }
        }

        // Delete worksheets
        for (const ws of wsSnap.docs) {
          try {
            batch.delete(ws.ref)
            batchCount++
            if (batchCount >= MAX_BATCH) {
              await commitBatch()
            }
          } catch (err) {
            result.errors.push({ type: 'worksheet', id: ws.id, error: err.message })
          }
        }

        // Delete unit knowledge sheets
        for (const uks of unitKsSnap.docs) {
          try {
            batch.delete(uks.ref)
            batchCount++
            if (batchCount >= MAX_BATCH) {
              await commitBatch()
            }
          } catch (err) {
            result.errors.push({ type: 'unitKnowledgeSheet', id: uks.id, error: err.message })
          }
        }

        // Commit remaining
        await commitBatch()

        // Optionally clear curriculum structure
        if (clearCurriculum) {
          await db.collection('courses').doc(courseId).update({
            curriculum: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp()
          })
          result.curriculumCleared = true
        }

        console.log('✅ Course data reset complete:', result.summary)
      }

      return res.status(200).json({
        success: true,
        ...result
      })

    } catch (error) {
      console.error('❌ Error resetting course data:', error)
      return res.status(500).json({
        success: false,
        error: error.message
      })
    }
  })
})

/**
 * Get Inaccessible Data
 * หาข้อมูลที่ไม่สามารถเข้าถึงได้จาก Frontend
 * - lessonPlans ที่ไม่มี courseId หรือ courseId ไม่มีอยู่
 * - lessonPlans ที่ไม่มี teacherId
 * - knowledgeSheets/worksheets ที่ lessonPlanId ไม่มีอยู่ในระบบ
 * 
 * GET /getInaccessibleData?courseId=xxx
 */
exports.getInaccessibleData = functions.runWith({
  timeoutSeconds: 300,
  memory: '1GB'
}).https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('')
  }
  
  return cors(req, res, async () => {
    try {
      // 🔐 Verify teacher role
      const caller = await verifyTeacherRole(req, res)
      if (!caller) return

      const { courseId } = req.query
      const teacherId = caller.uid

      console.log('🔍 Scanning for inaccessible data...', { courseId, teacherId })

      const result = {
        inaccessibleLessonPlans: [],
        inaccessibleKnowledgeSheets: [],
        inaccessibleWorksheets: [],
        summary: {
          total: 0,
          byType: {}
        }
      }

      // 1. Get all valid course IDs for this teacher
      const coursesSnap = await db.collection('courses')
        .where('teacherId', '==', teacherId)
        .get()
      const validCourseIds = new Set(coursesSnap.docs.map(d => d.id))

      console.log(`📊 Teacher has ${validCourseIds.size} valid courses`)

      // 2. Get ALL lesson plans (no filter) to find inaccessible ones
      let plansQuery = db.collection('lessonPlans')
      if (courseId) {
        plansQuery = plansQuery.where('courseId', '==', courseId)
      }
      const allPlansSnap = await plansQuery.get()
      
      // Find plans that are inaccessible from frontend
      const accessiblePlanIds = new Set()
      
      allPlansSnap.docs.forEach(planDoc => {
        const data = planDoc.data()
        
        // Plan is inaccessible if:
        // 1. No teacherId
        // 2. Different teacherId (not current teacher's)
        // 3. No courseId
        // 4. courseId doesn't exist in teacher's courses
        const hasValidTeacherId = data.teacherId === teacherId
        const hasValidCourseId = data.courseId && validCourseIds.has(data.courseId)
        
        if (!hasValidTeacherId || !hasValidCourseId) {
          // Only show if it SHOULD belong to this teacher (matching courseId)
          if (data.courseId && validCourseIds.has(data.courseId)) {
            result.inaccessibleLessonPlans.push({
              id: planDoc.id,
              courseId: data.courseId,
              teacherId: data.teacherId || 'MISSING',
              unitNumber: data.unitNumber,
              planNumber: data.planNumber,
              topic: data.topic,
              reason: !data.teacherId ? 'Missing teacherId' : 
                      data.teacherId !== teacherId ? 'Wrong teacherId' :
                      !data.courseId ? 'Missing courseId' : 'Invalid courseId',
              createdAt: data.createdAt?.toDate?.() || data.createdAt
            })
          }
        } else {
          accessiblePlanIds.add(planDoc.id)
        }
      })

      // 3. Get all knowledge sheets and find inaccessible ones
      let ksQuery = db.collection('knowledgeSheets')
      if (courseId) {
        ksQuery = ksQuery.where('courseId', '==', courseId)
      }
      const allKsSnap = await ksQuery.get()

      allKsSnap.docs.forEach(ksDoc => {
        const data = ksDoc.data()
        const lessonPlanId = data.lessonPlanId
        
        // Check if this belongs to teacher's course
        if (data.courseId && validCourseIds.has(data.courseId)) {
          // Inaccessible if lessonPlanId doesn't exist or isn't accessible
          if (lessonPlanId && !accessiblePlanIds.has(lessonPlanId)) {
            result.inaccessibleKnowledgeSheets.push({
              id: ksDoc.id,
              lessonPlanId: lessonPlanId,
              courseId: data.courseId,
              unitNumber: data.metadata?.unitNumber,
              planNumber: data.metadata?.planNumber,
              title: data.title || data.metadata?.topic,
              reason: 'Linked lessonPlan not accessible',
              createdAt: data.createdAt?.toDate?.() || data.createdAt
            })
          }
        }
      })

      // 4. Get all worksheets and find inaccessible ones
      let wsQuery = db.collection('worksheets')
      if (courseId) {
        wsQuery = wsQuery.where('courseId', '==', courseId)
      }
      const allWsSnap = await wsQuery.get()

      allWsSnap.docs.forEach(wsDoc => {
        const data = wsDoc.data()
        const lessonPlanId = data.lessonPlanId
        
        // Check if this belongs to teacher's course
        if (data.courseId && validCourseIds.has(data.courseId)) {
          // Inaccessible if lessonPlanId doesn't exist or isn't accessible
          if (lessonPlanId && !accessiblePlanIds.has(lessonPlanId)) {
            result.inaccessibleWorksheets.push({
              id: wsDoc.id,
              lessonPlanId: lessonPlanId,
              courseId: data.courseId,
              unitNumber: data.unitNumber,
              planNumber: data.planNumber,
              title: data.title,
              reason: 'Linked lessonPlan not accessible',
              createdAt: data.createdAt?.toDate?.() || data.createdAt
            })
          }
        }
      })

      // Calculate summary
      result.summary = {
        total: result.inaccessibleLessonPlans.length + 
               result.inaccessibleKnowledgeSheets.length + 
               result.inaccessibleWorksheets.length,
        byType: {
          lessonPlans: result.inaccessibleLessonPlans.length,
          knowledgeSheets: result.inaccessibleKnowledgeSheets.length,
          worksheets: result.inaccessibleWorksheets.length
        }
      }

      console.log('📊 Inaccessible data summary:', result.summary)

      return res.status(200).json({
        success: true,
        ...result,
        scannedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('❌ Error scanning inaccessible data:', error)
      return res.status(500).json({
        success: false,
        error: error.message
      })
    }
  })
})

/**
 * Cleanup Inaccessible Data
 * ลบข้อมูลที่ไม่สามารถเข้าถึงได้จาก frontend
 * 
 * POST /cleanupInaccessibleData
 * Body: { courseId?, dryRun?: true }
 */
exports.cleanupInaccessibleData = functions.runWith({
  timeoutSeconds: 540,
  memory: '2GB'
}).https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('')
  }
  
  return cors(req, res, async () => {
    try {
      // 🔐 Verify teacher role
      const caller = await verifyTeacherRole(req, res)
      if (!caller) return

      const { courseId, dryRun = true } = req.body
      const teacherId = caller.uid

      console.log('🧹 Cleanup inaccessible data request:', { courseId, dryRun, teacherId })

      // First get the inaccessible data
      const coursesSnap = await db.collection('courses')
        .where('teacherId', '==', teacherId)
        .get()
      const validCourseIds = new Set(coursesSnap.docs.map(d => d.id))

      const result = {
        deleted: {
          lessonPlans: [],
          knowledgeSheets: [],
          worksheets: []
        },
        summary: { total: 0, byType: {} },
        errors: [],
        dryRun
      }

      // Get all lesson plans
      let plansQuery = db.collection('lessonPlans')
      if (courseId) {
        plansQuery = plansQuery.where('courseId', '==', courseId)
      }
      const allPlansSnap = await plansQuery.get()
      
      const accessiblePlanIds = new Set()
      const toDeletePlanIds = []
      
      allPlansSnap.docs.forEach(planDoc => {
        const data = planDoc.data()
        const hasValidTeacherId = data.teacherId === teacherId
        const hasValidCourseId = data.courseId && validCourseIds.has(data.courseId)
        
        if (data.courseId && validCourseIds.has(data.courseId)) {
          if (!hasValidTeacherId) {
            toDeletePlanIds.push(planDoc.id)
            result.deleted.lessonPlans.push({
              id: planDoc.id,
              topic: data.topic,
              reason: 'Missing or wrong teacherId'
            })
          } else {
            accessiblePlanIds.add(planDoc.id)
          }
        }
      })

      // Get knowledge sheets to delete
      let ksQuery = db.collection('knowledgeSheets')
      if (courseId) {
        ksQuery = ksQuery.where('courseId', '==', courseId)
      }
      const allKsSnap = await ksQuery.get()
      const toDeleteKsIds = []

      allKsSnap.docs.forEach(ksDoc => {
        const data = ksDoc.data()
        if (data.courseId && validCourseIds.has(data.courseId)) {
          if (data.lessonPlanId && !accessiblePlanIds.has(data.lessonPlanId)) {
            toDeleteKsIds.push(ksDoc.id)
            result.deleted.knowledgeSheets.push({
              id: ksDoc.id,
              title: data.title,
              reason: 'Linked lessonPlan not accessible'
            })
          }
        }
      })

      // Get worksheets to delete
      let wsQuery = db.collection('worksheets')
      if (courseId) {
        wsQuery = wsQuery.where('courseId', '==', courseId)
      }
      const allWsSnap = await wsQuery.get()
      const toDeleteWsIds = []

      allWsSnap.docs.forEach(wsDoc => {
        const data = wsDoc.data()
        if (data.courseId && validCourseIds.has(data.courseId)) {
          if (data.lessonPlanId && !accessiblePlanIds.has(data.lessonPlanId)) {
            toDeleteWsIds.push(wsDoc.id)
            result.deleted.worksheets.push({
              id: wsDoc.id,
              title: data.title,
              reason: 'Linked lessonPlan not accessible'
            })
          }
        }
      })

      result.summary = {
        total: result.deleted.lessonPlans.length + 
               result.deleted.knowledgeSheets.length + 
               result.deleted.worksheets.length,
        byType: {
          lessonPlans: result.deleted.lessonPlans.length,
          knowledgeSheets: result.deleted.knowledgeSheets.length,
          worksheets: result.deleted.worksheets.length
        }
      }

      // Actually delete if not dry run
      if (!dryRun) {
        const batch = db.batch()
        let batchCount = 0
        const MAX_BATCH = 500

        const commitBatch = async () => {
          if (batchCount > 0) {
            await batch.commit()
            batchCount = 0
          }
        }

        // Delete lesson plans
        for (const id of toDeletePlanIds) {
          try {
            batch.delete(db.collection('lessonPlans').doc(id))
            batchCount++
            if (batchCount >= MAX_BATCH) await commitBatch()
          } catch (err) {
            result.errors.push({ type: 'lessonPlan', id, error: err.message })
          }
        }

        // Delete knowledge sheets
        for (const id of toDeleteKsIds) {
          try {
            batch.delete(db.collection('knowledgeSheets').doc(id))
            batchCount++
            if (batchCount >= MAX_BATCH) await commitBatch()
          } catch (err) {
            result.errors.push({ type: 'knowledgeSheet', id, error: err.message })
          }
        }

        // Delete worksheets
        for (const id of toDeleteWsIds) {
          try {
            batch.delete(db.collection('worksheets').doc(id))
            batchCount++
            if (batchCount >= MAX_BATCH) await commitBatch()
          } catch (err) {
            result.errors.push({ type: 'worksheet', id, error: err.message })
          }
        }

        await commitBatch()
        console.log('✅ Inaccessible data cleanup complete:', result.summary)
      }

      return res.status(200).json({
        success: true,
        ...result
      })

    } catch (error) {
      console.error('❌ Error cleaning inaccessible data:', error)
      return res.status(500).json({
        success: false,
        error: error.message
      })
    }
  })
})

module.exports = {
  getOrphanedDataStats: exports.getOrphanedDataStats,
  cleanupOrphanedData: exports.cleanupOrphanedData,
  getDataStorageStats: exports.getDataStorageStats,
  resetCourseData: exports.resetCourseData,
  getInaccessibleData: exports.getInaccessibleData,
  cleanupInaccessibleData: exports.cleanupInaccessibleData
}
