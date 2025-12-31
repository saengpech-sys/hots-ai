/**
 * Demo Data Seeder for Ministry Demo
 * Creates realistic sample data for demonstrating HOTS AI ChatLoop
 * Phase 6: Ministry Demo Preparation
 * 
 * Usage: node scripts/seed-demo-data.js
 */

const admin = require('firebase-admin')

// Initialize Firebase Admin (use service account in production)
if (!admin.apps.length) {
  const serviceAccount = require('../functions/serviceAccountKey.json')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

const db = admin.firestore()

// Thai names for realistic data
const THAI_FIRST_NAMES = [
  'สมชาย', 'สมหญิง', 'วิชัย', 'สุภาพ', 'ประยุทธ', 'พรทิพย์', 'นภา', 'กิตติ',
  'ธนา', 'ปิยะ', 'สุรศักดิ์', 'รัตนา', 'วรรณา', 'ชัยวัฒน์', 'พิมพ์', 'อรุณ',
  'มานพ', 'สุดา', 'ณัฐ', 'กมล', 'ศิริ', 'วิไล', 'สมศักดิ์', 'ปราณี'
]

const THAI_LAST_NAMES = [
  'สุขใจ', 'รักเรียน', 'ใจดี', 'มีชัย', 'ศรีสุข', 'พงษ์พิพัฒน์', 'วงศ์วาน',
  'ชัยชนะ', 'ประเสริฐ', 'มงคล', 'สว่างวงศ์', 'เจริญสุข', 'ทรงพล', 'ภักดี'
]

const THAI_PROVINCES = [
  { name: 'กรุงเทพมหานคร', region: 'ภาคกลาง' },
  { name: 'เชียงใหม่', region: 'ภาคเหนือ' },
  { name: 'นครราชสีมา', region: 'ภาคอีสาน' },
  { name: 'สุรินทร์', region: 'ภาคอีสาน' },
  { name: 'ขอนแก่น', region: 'ภาคอีสาน' },
  { name: 'ชลบุรี', region: 'ภาคตะวันออก' },
  { name: 'สงขลา', region: 'ภาคใต้' },
  { name: 'ภูเก็ต', region: 'ภาคใต้' },
  { name: 'อุบลราชธานี', region: 'ภาคอีสาน' },
  { name: 'เชียงราย', region: 'ภาคเหนือ' }
]

const SCHOOL_PREFIXES = [
  'โรงเรียนอนุบาล', 'โรงเรียนประชา', 'โรงเรียนวิทย์', 'โรงเรียนบ้าน',
  'โรงเรียนชุมชน', 'โรงเรียนเทศบาล', 'โรงเรียนราช', 'โรงเรียนวัด'
]

// Configuration
const CONFIG = {
  esaCount: 10,          // Number of ESAs
  schoolsPerESA: 20,     // Schools per ESA
  studentsPerSchool: 50, // Students per school
  teachersPerSchool: 10, // Teachers per school
  assessmentsPerStudent: 5 // Assessments per student
}

/**
 * Generate random Thai name
 */
function generateThaiName() {
  const firstName = THAI_FIRST_NAMES[Math.floor(Math.random() * THAI_FIRST_NAMES.length)]
  const lastName = THAI_LAST_NAMES[Math.floor(Math.random() * THAI_LAST_NAMES.length)]
  return `${firstName} ${lastName}`
}

/**
 * Generate random school name
 */
function generateSchoolName(province) {
  const prefix = SCHOOL_PREFIXES[Math.floor(Math.random() * SCHOOL_PREFIXES.length)]
  return `${prefix}${province.slice(0, 4)}${Math.floor(Math.random() * 100)}`
}

/**
 * Generate random HOTS score (0-5 per dimension)
 */
function generateHOTSScore(performanceLevel = 'medium') {
  const baseRange = {
    high: { min: 3.5, max: 5 },
    medium: { min: 2, max: 4 },
    low: { min: 0.5, max: 2.5 }
  }
  
  const range = baseRange[performanceLevel]
  
  const generateDimScore = () => {
    const score = range.min + Math.random() * (range.max - range.min)
    return Math.min(5, Math.max(0, Math.round(score * 2) / 2)) // Round to 0.5
  }
  
  return {
    analysis: generateDimScore(),
    reasoning: generateDimScore(),
    creativity: generateDimScore(),
    evidence: generateDimScore()
  }
}

/**
 * Seed ESAs (Educational Service Areas)
 */
async function seedESAs() {
  console.log('🏛️ Seeding ESAs...')
  const esaIds = []
  
  for (let i = 0; i < CONFIG.esaCount; i++) {
    const province = THAI_PROVINCES[i % THAI_PROVINCES.length]
    const esaNumber = Math.floor(i / THAI_PROVINCES.length) + 1
    
    const esaId = `esa-${province.name.slice(0, 2)}-${esaNumber}`
    const esaData = {
      type: 'esa',
      name: `สพป.${province.name} เขต ${esaNumber}`,
      code: esaId,
      province: province.name,
      region: province.region,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      stats: {
        schoolCount: 0,
        studentCount: 0,
        teacherCount: 0,
        avgScore: 0
      }
    }
    
    await db.collection('organizations').doc(esaId).set(esaData)
    esaIds.push({ id: esaId, province: province.name, region: province.region })
    console.log(`  ✓ Created ESA: ${esaData.name}`)
  }
  
  return esaIds
}

/**
 * Seed Schools
 */
async function seedSchools(esaIds) {
  console.log('🏫 Seeding Schools...')
  const schoolIds = []
  
  for (const esa of esaIds) {
    for (let i = 0; i < CONFIG.schoolsPerESA; i++) {
      const schoolCode = `${esa.id.slice(4, 6)}${String(i + 1).padStart(4, '0')}`
      const schoolId = `SCHOOL-${schoolCode}`
      
      // Determine performance level (distribution: 20% high, 60% medium, 20% low)
      const rand = Math.random()
      const performanceLevel = rand < 0.2 ? 'high' : rand < 0.8 ? 'medium' : 'low'
      const baseScore = generateHOTSScore(performanceLevel)
      const avgScore = (baseScore.analysis + baseScore.reasoning + baseScore.creativity + baseScore.evidence)
      
      const schoolData = {
        id: schoolId,
        name: generateSchoolName(esa.province),
        schoolCode,
        schoolType: Math.random() > 0.3 ? 'primary' : 'secondary',
        esaId: esa.id,
        province: esa.province,
        region: esa.region,
        status: 'active',
        tier: Math.random() > 0.7 ? 'premium' : 'free',
        
        studentCount: CONFIG.studentsPerSchool + Math.floor(Math.random() * 100),
        teacherCount: CONFIG.teachersPerSchool + Math.floor(Math.random() * 5),
        
        avgScore: avgScore,
        dimensionAvg: baseScore,
        performanceLevel,
        
        totalAssessments: 0,
        lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
      
      await db.collection('schools').doc(schoolId).set(schoolData)
      schoolIds.push({ 
        id: schoolId, 
        esaId: esa.id, 
        province: esa.province,
        performanceLevel 
      })
    }
    console.log(`  ✓ Created ${CONFIG.schoolsPerESA} schools for ESA: ${esa.id}`)
  }
  
  return schoolIds
}

/**
 * Seed Students and Teachers
 */
async function seedUsers(schoolIds) {
  console.log('👥 Seeding Users...')
  const userIds = []
  
  // Sample subset of schools for detailed user data
  const sampledSchools = schoolIds.filter(() => Math.random() > 0.7)
  
  for (const school of sampledSchools) {
    // Create students
    for (let i = 0; i < Math.min(CONFIG.studentsPerSchool, 20); i++) {
      const userId = `student-${school.id}-${i}`
      const grade = Math.floor(Math.random() * 6) + 1
      
      const userData = {
        email: `student${i}@${school.id.toLowerCase()}.demo`,
        displayName: generateThaiName(),
        role: 'student',
        schoolId: school.id,
        esaId: school.esaId,
        grade: `ป.${grade}`,
        studentId: String(10000 + i),
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
      
      await db.collection('users').doc(userId).set(userData)
      userIds.push({ id: userId, schoolId: school.id, performanceLevel: school.performanceLevel })
    }
    
    // Create teachers
    for (let i = 0; i < Math.min(CONFIG.teachersPerSchool, 3); i++) {
      const userId = `teacher-${school.id}-${i}`
      
      const userData = {
        email: `teacher${i}@${school.id.toLowerCase()}.demo`,
        displayName: generateThaiName(),
        role: 'teacher',
        schoolId: school.id,
        esaId: school.esaId,
        subjects: ['วิทยาศาสตร์', 'คณิตศาสตร์'][i % 2],
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
      
      await db.collection('users').doc(userId).set(userData)
    }
    
    console.log(`  ✓ Created users for school: ${school.id}`)
  }
  
  return userIds
}

/**
 * Seed Assessments
 */
async function seedAssessments(userIds) {
  console.log('📝 Seeding Assessments...')
  let assessmentCount = 0
  
  const sampleQuestions = [
    'วิเคราะห์สาเหตุของปัญหาสิ่งแวดล้อมในชุมชนของนักเรียน',
    'อธิบายความสัมพันธ์ระหว่างการเปลี่ยนแปลงภูมิอากาศกับระบบนิเวศ',
    'เสนอแนวทางแก้ไขปัญหาขยะพลาสติกอย่างยั่งยืน',
    'วิเคราะห์ผลกระทบของเทคโนโลยีต่อสังคมไทย'
  ]
  
  for (const user of userIds) {
    const numAssessments = Math.floor(Math.random() * CONFIG.assessmentsPerStudent) + 1
    
    for (let i = 0; i < numAssessments; i++) {
      const scores = generateHOTSScore(user.performanceLevel)
      const totalScore = scores.analysis + scores.reasoning + scores.creativity + scores.evidence
      
      const assessmentData = {
        userId: user.id,
        schoolId: user.schoolId,
        questionText: sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)],
        answerText: `[คำตอบตัวอย่างของนักเรียน ${user.id}]`,
        
        rubricScores: scores,
        totalScore,
        confidenceScore: 0.7 + Math.random() * 0.25,
        
        feedback: `นักเรียนแสดงทักษะการวิเคราะห์ได้${scores.analysis >= 3 ? 'ดี' : 'พอใช้'}`,
        
        assessedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
      
      await db.collection('assessments').add(assessmentData)
      assessmentCount++
    }
  }
  
  console.log(`  ✓ Created ${assessmentCount} assessments`)
  return assessmentCount
}

/**
 * Update aggregated stats
 */
async function updateStats(esaIds) {
  console.log('📊 Updating aggregated stats...')
  
  for (const esa of esaIds) {
    const schoolsSnap = await db.collection('schools')
      .where('esaId', '==', esa.id)
      .get()
    
    let totalStudents = 0
    let totalTeachers = 0
    let totalScore = 0
    
    schoolsSnap.forEach(doc => {
      const d = doc.data()
      totalStudents += d.studentCount || 0
      totalTeachers += d.teacherCount || 0
      totalScore += d.avgScore || 0
    })
    
    await db.collection('organizations').doc(esa.id).update({
      'stats.schoolCount': schoolsSnap.size,
      'stats.studentCount': totalStudents,
      'stats.teacherCount': totalTeachers,
      'stats.avgScore': schoolsSnap.size > 0 ? (totalScore / schoolsSnap.size).toFixed(2) : 0
    })
  }
  
  console.log('  ✓ Updated all ESA stats')
}

/**
 * Main seed function
 */
async function seedDemoData() {
  console.log('🚀 Starting Demo Data Seed...\n')
  console.log(`Configuration:`)
  console.log(`  - ESAs: ${CONFIG.esaCount}`)
  console.log(`  - Schools per ESA: ${CONFIG.schoolsPerESA}`)
  console.log(`  - Total Schools: ${CONFIG.esaCount * CONFIG.schoolsPerESA}`)
  console.log('')
  
  try {
    // 1. Seed ESAs
    const esaIds = await seedESAs()
    
    // 2. Seed Schools
    const schoolIds = await seedSchools(esaIds)
    
    // 3. Seed Users (sampled)
    const userIds = await seedUsers(schoolIds)
    
    // 4. Seed Assessments
    const assessmentCount = await seedAssessments(userIds)
    
    // 5. Update aggregated stats
    await updateStats(esaIds)
    
    console.log('\n✅ Demo data seeding complete!')
    console.log(`Summary:`)
    console.log(`  - ESAs: ${esaIds.length}`)
    console.log(`  - Schools: ${schoolIds.length}`)
    console.log(`  - Users: ${userIds.length}`)
    console.log(`  - Assessments: ${assessmentCount}`)
    
  } catch (error) {
    console.error('❌ Error seeding data:', error)
    process.exit(1)
  }
  
  process.exit(0)
}

// Run if called directly
if (require.main === module) {
  seedDemoData()
}

module.exports = { seedDemoData, CONFIG }
