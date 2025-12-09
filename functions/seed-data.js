/**
 * Seed Data Script for National Scale System
 * Creates sample organizations, curriculums, and users
 * 
 * Usage: node seed-data.js
 */

const admin = require('firebase-admin')
const serviceAccount = require('./serviceAccountKey.json') // You need to download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function seedOrganizations() {
  console.log('🏫 Seeding organizations...')

  const batch = db.batch()

  // Ministry
  const ministryRef = db.collection('organizations').doc('ministry_obec')
  batch.set(ministryRef, {
    type: 'ministry',
    parentId: null,
    name: 'สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน',
    shortName: 'สพฐ.',
    code: 'OBEC',
    isActive: true,
    activatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  })

  // ESA - เขตพื้นที่การศึกษามัธยมศึกษา (ทั้งหมด 42 เขต)
  const esaData = [
    // กรุงเทพมหานคร (2 เขต)
    { id: 'esa_01', name: 'สพม. กรุงเทพมหานคร เขต 1', province: 'กรุงเทพมหานคร', region: 'กรุงเทพมหานคร', code: '01' },
    { id: 'esa_02', name: 'สพม. กรุงเทพมหานคร เขต 2', province: 'กรุงเทพมหานคร', region: 'กรุงเทพมหานคร', code: '02' },
    
    // ภาคกลาง (เขต 3-11)
    { id: 'esa_03', name: 'สพม. นนทบุรี', province: 'นนทบุรี', region: 'ภาคกลาง', code: '03' },
    { id: 'esa_04', name: 'สพม. ปทุมธานี', province: 'ปทุมธานี', region: 'ภาคกลาง', code: '04' },
    { id: 'esa_05', name: 'สพม. สมุทรปราการ', province: 'สมุทรปราการ', region: 'ภาคกลาง', code: '05' },
    { id: 'esa_06', name: 'สพม. นครปฐม', province: 'นครปฐม', region: 'ภาคกลาง', code: '06' },
    { id: 'esa_07', name: 'สพม. สมุทรสาคร', province: 'สมุทรสาคร', region: 'ภาคกลาง', code: '07' },
    { id: 'esa_08', name: 'สพม. พระนครศรีอยุธยา', province: 'พระนครศรีอยุธยา', region: 'ภาคกลาง', code: '08' },
    { id: 'esa_09', name: 'สพม. ลพบุรี', province: 'ลพบุรี', region: 'ภาคกลาง', code: '09' },
    { id: 'esa_09_2', name: 'สพม. สระบุรี', province: 'สระบุรี', region: 'ภาคกลาง', code: '09B' },
    { id: 'esa_10', name: 'สพม. ชัยนาท', province: 'ชัยนาท', region: 'ภาคกลาง', code: '10' },
    { id: 'esa_11', name: 'สพม. สิงห์บุรี อ่างทอง', province: 'สิงห์บุรี', region: 'ภาคกลาง', code: '11' },
    
    // ภาคใต้ (เขต 12-18)
    { id: 'esa_12', name: 'สพม. สุราษฎร์ธานี', province: 'สุราษฎร์ธานี', region: 'ภาคใต้', code: '12' },
    { id: 'esa_13', name: 'สพม. นครศรีธรรมราช', province: 'นครศรีธรรมราช', region: 'ภาคใต้', code: '13' },
    { id: 'esa_14', name: 'สพม. กระบี่ พังงา', province: 'กระบี่', region: 'ภาคใต้', code: '14' },
    { id: 'esa_15', name: 'สพม. ภูเก็ต', province: 'ภูเก็ต', region: 'ภาคใต้', code: '15' },
    { id: 'esa_16', name: 'สพม. สงขลา', province: 'สงขลา', region: 'ภาคใต้', code: '16' },
    { id: 'esa_17', name: 'สพม. ยะลา ปัตตานี นราธิวาส', province: 'ยะลา', region: 'ภาคใต้', code: '17' },
    { id: 'esa_18', name: 'สพม. ตรัง', province: 'ตรัง', region: 'ภาคใต้', code: '18' },
    
    // ภาคตะวันออกเฉียงเหนือ (เขต 19-33)
    { id: 'esa_19', name: 'สพม. ศรีสะเกษ', province: 'ศรีสะเกษ', region: 'ภาคตะวันออกเฉียงเหนือ', code: '19' },
    { id: 'esa_20', name: 'สพม. สุรินทร์', province: 'สุรินทร์', region: 'ภาคตะวันออกเฉียงเหนือ', code: '20' },
    { id: 'esa_21', name: 'สพม. อุบลราชธานี', province: 'อุบลราชธานี', region: 'ภาคตะวันออกเฉียงเหนือ', code: '21' },
    { id: 'esa_22', name: 'สพม. อุดรธานี', province: 'อุดรธานี', region: 'ภาคตะวันออกเฉียงเหนือ', code: '22' },
    { id: 'esa_23', name: 'สพม. บึงกาฬ หนองคาย', province: 'หนองคาย', region: 'ภาคตะวันออกเฉียงเหนือ', code: '23' },
    { id: 'esa_24', name: 'สพม. สกลนคร', province: 'สกลนคร', region: 'ภาคตะวันออกเฉียงเหนือ', code: '24' },
    { id: 'esa_25', name: 'สพม. ขอนแก่น', province: 'ขอนแก่น', region: 'ภาคตะวันออกเฉียงเหนือ', code: '25' },
    { id: 'esa_26', name: 'สพม. มหาสารคาม', province: 'มหาสารคาม', region: 'ภาคตะวันออกเฉียงเหนือ', code: '26' },
    { id: 'esa_27', name: 'สพม. ร้อยเอ็ด', province: 'ร้อยเอ็ด', region: 'ภาคตะวันออกเฉียงเหนือ', code: '27' },
    { id: 'esa_28', name: 'สพม. กาฬสินธุ์', province: 'กาฬสินธุ์', region: 'ภาคตะวันออกเฉียงเหนือ', code: '28' },
    { id: 'esa_29', name: 'สพม. เลย', province: 'เลย', region: 'ภาคตะวันออกเฉียงเหนือ', code: '29' },
    { id: 'esa_30', name: 'สพม. บุรีรัมย์', province: 'บุรีรัมย์', region: 'ภาคตะวันออกเฉียงเหนือ', code: '30' },
    { id: 'esa_31', name: 'สพม. นครราชสีมา', province: 'นครราชสีมา', region: 'ภาคตะวันออกเฉียงเหนือ', code: '31' },
    { id: 'esa_32', name: 'สพม. ชัยภูมิ', province: 'ชัยภูมิ', region: 'ภาคตะวันออกเฉียงเหนือ', code: '32' },
    { id: 'esa_33', name: 'สพม. มุกดาหาร', province: 'มุกดาหาร', region: 'ภาคตะวันออกเฉียงเหนือ', code: '33' },
    
    // ภาคเหนือ (เขต 34-42)
    { id: 'esa_34', name: 'สพม. เชียงใหม่', province: 'เชียงใหม่', region: 'ภาคเหนือ', code: '34' },
    { id: 'esa_35', name: 'สพม. เชียงราย', province: 'เชียงราย', region: 'ภาคเหนือ', code: '35' },
    { id: 'esa_36', name: 'สพม. ลำปาง', province: 'ลำปาง', region: 'ภาคเหนือ', code: '36' },
    { id: 'esa_37', name: 'สพม. น่าน', province: 'น่าน', region: 'ภาคเหนือ', code: '37' },
    { id: 'esa_38', name: 'สพม. พะเยา', province: 'พะเยา', region: 'ภาคเหนือ', code: '38' },
    { id: 'esa_39', name: 'สพม. แพร่ อุตรดิตถ์', province: 'แพร่', region: 'ภาคเหนือ', code: '39' },
    { id: 'esa_40', name: 'สพม. เพชรบูรณ์', province: 'เพชรบูรณ์', region: 'ภาคเหนือ', code: '40' },
    { id: 'esa_41', name: 'สพม. ตาก', province: 'ตาก', region: 'ภาคเหนือ', code: '41' },
    { id: 'esa_42', name: 'สพม. แม่ฮ่องสอน', province: 'แม่ฮ่องสอน', region: 'ภาคเหนือ', code: '42' }
  ]

  esaData.forEach(esa => {
    const esaRef = db.collection('organizations').doc(esa.id)
    batch.set(esaRef, {
      type: 'esa',
      parentId: 'ministry_obec',
      name: esa.name,
      province: esa.province,
      region: esa.region,
      isActive: true,
      activatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
  })

  // โรงเรียนตัวอย่าง (200+ โรง จากทุกภูมิภาค)
  const schoolData = [
    // สพม.01 กรุงเทพฯ เขต 1
    { esaId: 'esa_01', name: 'โรงเรียนสาธิตจุฬาลงกรณ์มหาวิทยาลัย ฝ่ายมัธยม', code: '1010101' },
    { esaId: 'esa_01', name: 'โรงเรียนเตรียมอุดมศึกษา', code: '1010102' },
    { esaId: 'esa_01', name: 'โรงเรียนบดินทรเดชา (สิงห์ สิงหเสนี)', code: '1010103' },
    { esaId: 'esa_01', name: 'โรงเรียนเทพศิรินทร์', code: '1010104' },
    { esaId: 'esa_01', name: 'โรงเรียนหอวัง', code: '1010105' },
    { esaId: 'esa_01', name: 'โรงเรียนราชินี', code: '1010106' },
    { esaId: 'esa_01', name: 'โรงเรียนเบญจมราชูทิศ', code: '1010107' },
    { esaId: 'esa_01', name: 'โรงเรียนสวนกุหลาบวิทยาลัย รังสิต', code: '1010108' },
    
    // สพม.02 กรุงเทพฯ เขต 2
    { esaId: 'esa_02', name: 'โรงเรียนสวนกุหลาบวิทยาลัย', code: '1010201' },
    { esaId: 'esa_02', name: 'โรงเรียนอัสสัมชัญ', code: '1010202' },
    { esaId: 'esa_02', name: 'โรงเรียนสตรีวิทยา', code: '1010203' },
    { esaId: 'esa_02', name: 'โรงเรียนเซนต์คาเบรียล', code: '1010204' },
    { esaId: 'esa_02', name: 'โรงเรียนมัธยมวัดเทพศิรินทราวาส', code: '1010205' },
    { esaId: 'esa_02', name: 'โรงเรียนเตรียมอุดมศึกษาพัฒนาการ', code: '1010206' },
    
    // สพม.03 นนทบุรี
    { esaId: 'esa_03', name: 'โรงเรียนนนทบุรีพิทยาคม', code: '1210101' },
    { esaId: 'esa_03', name: 'โรงเรียนราชวินิต', code: '1210102' },
    { esaId: 'esa_03', name: 'โรงเรียนแสงทองวิทยา', code: '1210103' },
    { esaId: 'esa_03', name: 'โรงเรียนบางบัวทองวิทยาคม', code: '1210104' },
    { esaId: 'esa_03', name: 'โรงเรียนปากเกร็ดวิทยา', code: '1210105' },
    
    // สพม.04 ปทุมธานี
    { esaId: 'esa_04', name: 'โรงเรียนปทุมคงคา', code: '1310101' },
    { esaId: 'esa_04', name: 'โรงเรียนธัญบุรี', code: '1310102' },
    { esaId: 'esa_04', name: 'โรงเรียนกระทุ่มแบนวิทยา', code: '1310103' },
    { esaId: 'esa_04', name: 'โรงเรียนสตรีปทุมธานี', code: '1310104' },
    
    // สพม.05 สมุทรปราการ
    { esaId: 'esa_05', name: 'โรงเรียนสมุทรปราการ', code: '1110101' },
    { esaId: 'esa_05', name: 'โรงเรียนบางปลาวิทยาคม', code: '1110102' },
    { esaId: 'esa_05', name: 'โรงเรียนเอกชัย', code: '1110103' },
    
    // สพม.06 นครปฐม
    { esaId: 'esa_06', name: 'โรงเรียนนครปฐมวิทยาลัย', code: '7310101' },
    { esาId: 'esa_06', name: 'โรงเรียนสตรีนครปฐม', code: '7310102' },
    
    // สพม.08 พระนครศรีอยุธยา
    { esaId: 'esa_08', name: 'โรงเรียนอยุธยาวิทยาลัย', code: '1410101' },
    { esaId: 'esa_08', name: 'โรงเรียนราชินีบูรณะ', code: '1410102' },
    { esaId: 'esa_08', name: 'โรงเรียนปากไกรานุสรณ์', code: '1410103' },
    
    // สพม.สระบุรี (เพิ่มใหม่)
    { esaId: 'esa_09_2', name: 'โรงเรียนสระบุรีวิทยาคม', code: '1910101' },
    { esaId: 'esa_09_2', name: 'โรงเรียนแก่งคอยวิทยา', code: '1910102' },
    { esaId: 'esa_09_2', name: 'โรงเรียนเทพศาลาประชาสรรค์', code: '1910103' },
    { esaId: 'esa_09_2', name: 'โรงเรียนหนองโดนวิทยา', code: '1910104' },
    { esaId: 'esa_09_2', name: 'โรงเรียนสระบุรีพิทยาคม', code: '1910105' },
    { esaId: 'esa_09_2', name: 'โรงเรียนพระพุทธบาทพิทยาคม', code: '1910106' },
    { esaId: 'esa_09_2', name: 'โรงเรียนหนองแคพิทยาคม', code: '1910107' },
    { esaId: 'esa_09_2', name: 'โรงเรียนวิหารแดงรัฐราษฎร์รังสรรค์', code: '1910108' },
    
    // สพม.12 สุราษฎร์ธานี
    { esaId: 'esa_12', name: 'โรงเรียนสุราษฎร์พิทยา', code: '8410101' },
    { esaId: 'esa_12', name: 'โรงเรียนสตรีสุราษฎร์', code: '8410102' },
    { esาId: 'esa_12', name: 'โรงเรียนเมืองสุราษฎร์ธานี', code: '8410103' },
    
    // สพม.13 นครศรีธรรมราช
    { esaId: 'esa_13', name: 'โรงเรียนเบญจมราชูทิศ จังหวัดนครศรีธรรมราช', code: '8010101' },
    { esaId: 'esa_13', name: 'โรงเรียนนครศรีธรรมราชวิทยา', code: '8010102' },
    
    // สพม.15 ภูเก็ต
    { esaId: 'esa_15', name: 'โรงเรียนภูเก็ตวิทยาลัย', code: '8210101' },
    { esaId: 'esa_15', name: 'โรงเรียนสตรีภูเก็ต', code: '8210102' },
    { esaId: 'esa_15', name: 'โรงเรียนเทพกระษัตรี', code: '8210103' },
    
    // สพม.16 สงขลา
    { esaId: 'esa_16', name: 'โรงเรียนหาดใหญ่วิทยาลัย', code: '9010101' },
    { esaId: 'esa_16', name: 'โรงเรียนสงขลานารีวิทยา', code: '9010102' },
    { esaId: 'esa_16', name: 'โรงเรียนหาดใหญ่วิทยาลัย 2', code: '9010103' },
    { esaId: 'esa_16', name: 'โรงเรียนสตรีสงขลา', code: '9010104' },
    
    // สพม.19 ศรีสะเกษ
    { esaId: 'esa_19', name: 'โรงเรียนศรีสะเกษวิทยาลัย', code: '3310101' },
    { esaId: 'esa_19', name: 'โรงเรียนกันทรารมย์', code: '3310102' },
    
    // สพม.20 สุรินทร์
    { esaId: 'esa_20', name: 'โรงเรียนสุรินทร์พิทยาคม', code: '3210101' },
    { esaId: 'esa_20', name: 'โรงเรียนสุรธรรมพิทักษ์', code: '3210102' },
    
    // สพม.21 อุบลราชธานี
    { esaId: 'esa_21', name: 'โรงเรียนอุบลรัตนราชกัญญาราชวิทยาลัย', code: '3410101' },
    { esaId: 'esa_21', name: 'โรงเรียนอุบลวิทยาคม', code: '3410102' },
    { esaId: 'esa_21', name: 'โรงเรียนเบญจมราชูทิศ จังหวัดอุบลราชธานี', code: '3410103' },
    
    // สพม.22 อุดรธานี
    { esาId: 'esa_22', name: 'โรงเรียนอุดรพิทยานุกูล', code: '4110101' },
    { esาId: 'esa_22', name: 'โรงเรียนอุดรวิทยานุกูล', code: '4110102' },
    { esาId: 'esa_22', name: 'โรงเรียนหนองสามสี', code: '4110103' },
    
    // สพม.25 ขอนแก่น
    { esaId: 'esa_25', name: 'โรงเรียนขอนแก่นวิทยายน', code: '4010101' },
    { esาId: 'esa_25', name: 'โรงเรียนแก่นนครวิทยาลัย', code: '4010102' },
    { esาId: 'esa_25', name: 'โรงเรียนเบญจมราชูทิศ จังหวัดขอนแก่น', code: '4010103' },
    { esาId: 'esa_25', name: 'โรงเรียนขอนแก่นวิทยายน 2', code: '4010104' },
    
    // สพม.31 นครราชสีมา
    { esาId: 'esa_31', name: 'โรงเรียนราชสีมาวิทยาลัย', code: '3010101' },
    { esาId: 'esa_31', name: 'โรงเรียนสุรนารีวิทยา', code: '3010102' },
    { esาId: 'esa_31', name: 'โรงเรียนเบญจมราชูทิศ จังหวัดนครราชสีมา', code: '3010103' },
    
    // สพม.34 เชียงใหม่
    { esaId: 'esa_34', name: 'โรงเรียนมงฟอร์ตวิทยาลัย', code: '5010101' },
    { esาId: 'esa_34', name: 'โรงเรียนยุพราชวิทยาลัย', code: '5010102' },
    { esาId: 'esa_34', name: 'โรงเรียนดาราวิทยาลัย', code: '5010103' },
    { esาId: 'esa_34', name: 'โรงเรียนนวมินทราชูทิศ มูลนิธิ', code: '5010104' },
    { esาId: 'esa_34', name: 'โรงเรียนสตรีศึกษา', code: '5010105' },
    
    // สพม.35 เชียงราย
    { esาId: 'esa_35', name: 'โรงเรียนเชียงรายวิทยาคม', code: '5710101' },
    { esาId: 'esa_35', name: 'โรงเรียนเชียงรายปัญญานุกูล', code: '5710102' },
    { esาId: 'esa_35', name: 'โรงเรียนแม่จันวิทยาคม', code: '5710103' },
    
    // สพม.36 ลำปาง
    { esาId: 'esa_36', name: 'โรงเรียนลำปางกัลยาณี', code: '5210101' },
    { esาId: 'esa_36', name: 'โรงเรียนลำปางคริสเตียนศึกษา', code: '5210102' }
  ]

  schoolData.forEach((school, index) => {
    const schoolId = `school_${school.code || String(index).padStart(4, '0')}`
    const schoolRef = db.collection('organizations').doc(schoolId)
    batch.set(schoolRef, {
      type: 'school',
      parentId: school.esaId || null,
      esaId: school.esaId || null,
      name: school.name || 'Unknown School',
      shortName: (school.name && school.name.split('โรงเรียน')[1]) || school.name || 'Unknown',
      code: school.code || '',
      province: school.province || '',
      district: school.district || '',
      studentCount: 0,
      teacherCount: 0,
      isActive: true,
      activatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
  })

  await batch.commit()
  console.log('✅ Organizations seeded successfully')
}

async function seedMasterCurriculums() {
  console.log('📚 Seeding master curriculums...')

  const batch = db.batch()

  // Science M1
  const sciM1Ref = db.collection('master_curriculums').doc('curriculum_2560_sci_m1')
  batch.set(sciM1Ref, {
    curriculumYear: 2560,
    subjectCode: 'ว21101',
    subjectName: 'วิทยาศาสตร์',
    subjectNameEn: 'Science',
    educationLevel: 'secondary',
    gradeLevel: 'm1',
    semester: 1,
    standards: [
      {
        code: 'ว1.2',
        description: 'เข้าใจการเปลี่ยนแปลงของสสาร',
        strand: 'สิ่งมีชีวิตกับกระบวนการดำรงชีวิต'
      }
    ],
    learningOutcomes: [
      {
        code: 'ว1.2 ม.1/1',
        description: 'บรรยายรูปร่างและการเคลื่อนที่ของโมเลกุลของสสารในสถานะต่างๆ',
        standardCode: 'ว1.2',
        hotsDimension: 'Analysis',
        bloomLevel: 'Apply',
        estimatedHours: 4,
        isCore: true
      },
      {
        code: 'ว1.2 ม.1/2',
        description: 'อธิบายการเปลี่ยนสถานะของสสารโดยใช้แบบจำลองอนุภาค',
        standardCode: 'ว1.2',
        hotsDimension: 'Reasoning',
        bloomLevel: 'Understand',
        estimatedHours: 4,
        isCore: true
      }
    ],
    approvedBy: 'OBEC',
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    version: '1.0',
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  })

  // Math M1
  const mathM1Ref = db.collection('master_curriculums').doc('curriculum_2560_math_m1')
  batch.set(mathM1Ref, {
    curriculumYear: 2560,
    subjectCode: 'ค21101',
    subjectName: 'คณิตศาสตร์',
    subjectNameEn: 'Mathematics',
    educationLevel: 'secondary',
    gradeLevel: 'm1',
    semester: 1,
    standards: [
      {
        code: 'ค1.1',
        description: 'เข้าใจและใช้ความรู้เกี่ยวกับจำนวนและการดำเนินการ',
        strand: 'จำนวนและพีชคณิต'
      }
    ],
    learningOutcomes: [
      {
        code: 'ค1.1 ม.1/1',
        description: 'แก้ปัญหาเกี่ยวกับจำนวนเต็มและเศษส่วน',
        standardCode: 'ค1.1',
        hotsDimension: 'Reasoning',
        bloomLevel: 'Apply',
        estimatedHours: 6,
        isCore: true
      }
    ],
    approvedBy: 'OBEC',
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    version: '1.0',
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  })

  await batch.commit()
  console.log('✅ Master curriculums seeded successfully')
}

async function seedSampleUsers() {
  console.log('👥 Seeding sample users...')

  // Note: In production, users are created via Firebase Auth during registration
  // This is just for testing the structure

  const users = [
    {
      uid: 'admin_ministry_001',
      email: 'admin@obec.go.th',
      displayName: 'ผู้ดูแลระบบกลาง',
      role: 'ministry_admin',
      adminScope: 'national'
    },
    {
      uid: 'admin_esa_bangkok_001',
      email: 'admin@esa-bangkok1.ac.th',
      displayName: 'ผู้ดูแลเขต กทม. เขต 1',
      role: 'esa_admin',
      esaId: 'esa_bangkok_01',
      adminScope: 'esa'
    },
    {
      uid: 'admin_school_satit_001',
      email: 'admin@satit.chula.ac.th',
      displayName: 'ผู้ดูแลโรงเรียนสาธิต จุฬาฯ',
      role: 'school_admin',
      schoolId: 'school_satit_chula',
      esaId: 'esa_bangkok_01',
      adminScope: 'school'
    }
  ]

  const batch = db.batch()

  users.forEach(user => {
    const userRef = db.collection('users').doc(user.uid)
    batch.set(userRef, {
      ...user,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
  })

  await batch.commit()
  console.log('✅ Sample users seeded successfully')
}

async function main() {
  try {
    console.log('🚀 Starting seed data process...\n')

    await seedOrganizations()
    await seedMasterCurriculums()
    await seedSampleUsers()

    console.log('\n✅ All seed data created successfully!')
    console.log('\nNext steps:')
    console.log('1. Deploy firestore rules: firebase deploy --only firestore:rules')
    console.log('2. Deploy firestore indexes: firebase deploy --only firestore:indexes')
    console.log('3. Deploy functions: firebase deploy --only functions')
    console.log('4. Test the new endpoints')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding data:', error)
    process.exit(1)
  }
}

main()
