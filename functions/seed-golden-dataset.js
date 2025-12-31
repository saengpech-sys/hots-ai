/**
 * Seed Golden Dataset for IRR Calibration
 * Creates 10 new validated samples with diverse score ranges
 * 
 * Usage: node seed-golden-dataset.js
 * 
 * These samples are pre-validated by experts and used for:
 * 1. AI calibration testing
 * 2. IRR (Inter-Rater Reliability) calculation
 * 3. Model drift detection
 */

const admin = require('firebase-admin')
const serviceAccount = require('./serviceAccountKey.json')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

const db = admin.firestore()

// 10 new Golden Dataset samples with stratified score ranges
const goldenSamples = [
  // LOW STRATUM (Total 0-6) - 3 samples (30%)
  {
    id: 'golden_41',
    stratum: 'low',
    gradeLevel: 'ม.1',
    subject: 'วิทยาศาสตร์',
    questionContext: 'จงวิเคราะห์สาเหตุที่ทำให้เกิดปรากฏการณ์เรือนกระจก (Greenhouse Effect) และผลกระทบต่อสิ่งแวดล้อม',
    studentAnswer: 'เรือนกระจกเกิดจากควันและมลพิษ ทำให้โลกร้อน',
    aiScores: { analysis: 1, reasoning: 1, creativity: 1, evidence: 0 },
    expertScores: { analysis: 1, reasoning: 1, creativity: 1, evidence: 0 },
    expertNotes: 'คำตอบสั้นมาก ไม่มีการแยกแยะองค์ประกอบ ไม่มีตัวอย่างหรือหลักฐาน ให้คะแนนต่ำเพราะขาดความลึกในการวิเคราะห์'
  },
  {
    id: 'golden_42',
    stratum: 'low',
    gradeLevel: 'ม.2',
    subject: 'สังคมศึกษา',
    questionContext: 'อธิบายความสัมพันธ์ระหว่างการพัฒนาเศรษฐกิจกับปัญหาสิ่งแวดล้อม พร้อมยกตัวอย่างประกอบ',
    studentAnswer: 'การพัฒนาเศรษฐกิจทำให้มลพิษมากขึ้น เพราะมีโรงงานเยอะ',
    aiScores: { analysis: 2, reasoning: 1, creativity: 1, evidence: 1 },
    expertScores: { analysis: 2, reasoning: 1, creativity: 1, evidence: 1 },
    expertNotes: 'มีความพยายามเชื่อมโยงเศรษฐกิจกับสิ่งแวดล้อม แต่ยังตื้น ตัวอย่างกว้างเกินไป (โรงงาน) ไม่เจาะจง'
  },
  {
    id: 'golden_43',
    stratum: 'low',
    gradeLevel: 'ป.6',
    subject: 'ภาษาไทย',
    questionContext: 'วิเคราะห์ลักษณะของตัวละครเอกในวรรณคดีไทยเรื่องที่เรียน และความสำคัญต่อเรื่อง',
    studentAnswer: 'พระอภัยมณีเป็นคนดี ช่วยคนอื่น',
    aiScores: { analysis: 1, reasoning: 1, creativity: 0, evidence: 1 },
    expertScores: { analysis: 1, reasoning: 1, creativity: 1, evidence: 1 },
    expertNotes: 'คำตอบสั้นมาก ไม่มีการวิเคราะห์ลักษณะนิสัย ไม่เชื่อมโยงกับความสำคัญต่อเรื่อง'
  },

  // MEDIUM STRATUM (Total 7-13) - 5 samples (50%)
  {
    id: 'golden_44',
    stratum: 'medium',
    gradeLevel: 'ม.3',
    subject: 'วิทยาศาสตร์',
    questionContext: 'วิเคราะห์กระบวนการสังเคราะห์ด้วยแสง (Photosynthesis) และความสำคัญต่อระบบนิเวศ',
    studentAnswer: 'การสังเคราะห์ด้วยแสงคือกระบวนการที่พืชใช้แสงอาทิตย์ คาร์บอนไดออกไซด์ และน้ำ เพื่อสร้างกลูโคสและปล่อยออกซิเจน สูตรคือ 6CO2 + 6H2O + แสง → C6H12O6 + 6O2 กระบวนการนี้สำคัญเพราะเป็นแหล่งอาหารของสัตว์ และผลิตออกซิเจนให้เราหายใจ',
    aiScores: { analysis: 3, reasoning: 3, creativity: 2, evidence: 3 },
    expertScores: { analysis: 3, reasoning: 3, creativity: 2, evidence: 3 },
    expertNotes: 'วิเคราะห์องค์ประกอบได้ดี มีสูตรเคมีสนับสนุน แต่ยังขาดการเชื่อมโยงกับห่วงโซ่อาหารอย่างลึกซึ้ง'
  },
  {
    id: 'golden_45',
    stratum: 'medium',
    gradeLevel: 'ม.4',
    subject: 'คณิตศาสตร์',
    questionContext: 'อธิบายความสัมพันธ์ระหว่างฟังก์ชันเลขชี้กำลังกับฟังก์ชันลอการิทึม พร้อมยกตัวอย่าง',
    studentAnswer: 'ฟังก์ชันเลขชี้กำลังและลอการิทึมเป็นฟังก์ชันผกผันกัน ถ้า y = a^x แล้ว x = log_a(y) เช่น 2^3 = 8 ดังนั้น log_2(8) = 3 ฟังก์ชันทั้งสองมีประโยชน์ในการคำนวณการเติบโตของประชากร อัตราดอกเบี้ย และการสลายตัวของกัมมันตรังสี',
    aiScores: { analysis: 3, reasoning: 4, creativity: 2, evidence: 3 },
    expertScores: { analysis: 3, reasoning: 4, creativity: 2, evidence: 3 },
    expertNotes: 'เข้าใจความสัมพันธ์ผกผัน ให้เหตุผลดี ตัวอย่างเลขถูกต้อง แต่การประยุกต์ยังเป็นการยกตัวอย่างทั่วไป'
  },
  {
    id: 'golden_46',
    stratum: 'medium',
    gradeLevel: 'ม.2',
    subject: 'สังคมศึกษา',
    questionContext: 'วิเคราะห์สาเหตุและผลกระทบของสงครามโลกครั้งที่ 2 ต่อประเทศไทย',
    studentAnswer: 'สงครามโลกครั้งที่ 2 มีสาเหตุหลายอย่าง เช่น ความไม่พอใจของเยอรมนีต่อสนธิสัญญาแวร์ซายส์ การขยายอำนาจของญี่ปุ่นในเอเชีย ผลกระทบต่อไทยคือต้องเลือกข้างฝ่ายญี่ปุ่น มีการทิ้งระเบิดที่กรุงเทพฯ เศรษฐกิจตกต่ำเพราะขาดการค้ากับตะวันตก หลังสงครามไทยต้องเจรจาเพื่อไม่ให้ถูกลงโทษในฐานะผู้แพ้',
    aiScores: { analysis: 3, reasoning: 3, creativity: 2, evidence: 3 },
    expertScores: { analysis: 3, reasoning: 3, creativity: 2, evidence: 3 },
    expertNotes: 'แยกแยะสาเหตุและผลกระทบได้ มีตัวอย่างเฉพาะเจาะจง แต่ขาดการวิเคราะห์เชิงลึกว่าทำไมไทยต้องเลือกข้างญี่ปุ่น'
  },
  {
    id: 'golden_47',
    stratum: 'medium',
    gradeLevel: 'ม.5',
    subject: 'ชีววิทยา',
    questionContext: 'วิเคราะห์กลไกการป้องกันตัวเองของร่างกายมนุษย์จากเชื้อโรค',
    studentAnswer: 'ร่างกายมีระบบภูมิคุ้มกัน 2 แบบ คือ ภูมิคุ้มกันโดยกำเนิด (ผิวหนัง เยื่อเมือก) และภูมิคุ้มกันแบบจำเพาะ (เซลล์เม็ดเลือดขาว แอนติบอดี) เมื่อเชื้อโรคเข้าสู่ร่างกาย เซลล์ macrophage จะกินเชื้อโรค ส่งสัญญาณให้ T cell และ B cell สร้างแอนติบอดีจำเพาะ หลังหายป่วยจะมี memory cell จำเชื้อไว้',
    aiScores: { analysis: 4, reasoning: 3, creativity: 2, evidence: 3 },
    expertScores: { analysis: 4, reasoning: 3, creativity: 2, evidence: 3 },
    expertNotes: 'วิเคราะห์แยกประเภทภูมิคุ้มกันได้ดี มีลำดับขั้นตอนชัดเจน แต่ยังไม่มีตัวอย่างโรคจริงมาประกอบ'
  },
  {
    id: 'golden_48',
    stratum: 'medium',
    gradeLevel: 'ม.3',
    subject: 'เคมี',
    questionContext: 'เปรียบเทียบความแตกต่างระหว่างพันธะโคเวเลนต์และพันธะไอออนิก พร้อมยกตัวอย่าง',
    studentAnswer: 'พันธะโคเวเลนต์เกิดจากการใช้อิเล็กตรอนร่วมกันระหว่างอะตอม มักเกิดระหว่างอโลหะ เช่น H2O, CO2 พันธะไอออนิกเกิดจากการให้และรับอิเล็กตรอน มักเกิดระหว่างโลหะกับอโลหะ เช่น NaCl, MgO สารที่มีพันธะไอออนิกมักเปราะ นำไฟฟ้าได้เมื่อละลายน้ำ ส่วนพันธะโคเวเลนต์มักไม่นำไฟฟ้า',
    aiScores: { analysis: 3, reasoning: 3, creativity: 2, evidence: 4 },
    expertScores: { analysis: 3, reasoning: 3, creativity: 2, evidence: 4 },
    expertNotes: 'เปรียบเทียบได้ครบถ้วน มีตัวอย่างเฉพาะเจาะจงหลายตัว แต่การอธิบายกลไกยังไม่ลึก'
  },

  // HIGH STRATUM (Total 14-20) - 2 samples (20%)
  {
    id: 'golden_49',
    stratum: 'high',
    gradeLevel: 'ม.6',
    subject: 'ฟิสิกส์',
    questionContext: 'วิเคราะห์หลักการทำงานของกล้องโทรทรรศน์อวกาศฮับเบิล และข้อได้เปรียบเหนือกล้องภาคพื้นดิน',
    studentAnswer: 'กล้องฮับเบิลโคจรรอบโลกที่ระยะ 547 กม. ใช้กระจกหลักเส้นผ่านศูนย์กลาง 2.4 เมตร รวมแสงไปยังเซนเซอร์ CCD ข้อได้เปรียบคือ: 1) ไม่มีชั้นบรรยากาศรบกวน ทำให้ภาพคมชัดกว่า 10 เท่า เพราะไม่มี atmospheric turbulence 2) สามารถสังเกตแสงอินฟราเรดและอัลตราไวโอเลตที่ถูกชั้นบรรยากาศดูดซับ 3) สังเกตได้ 24 ชม. ไม่มีกลางวัน ฮับเบิลช่วยค้นพบว่าจักรวาลขยายตัวเร็วขึ้น (Dark Energy) และวัดระยะทางกาแล็กซีได้แม่นยำขึ้น นำไปสู่การคำนวณอายุจักรวาลที่ 13.8 พันล้านปี',
    aiScores: { analysis: 5, reasoning: 4, creativity: 3, evidence: 5 },
    expertScores: { analysis: 5, reasoning: 4, creativity: 4, evidence: 5 },
    expertNotes: 'วิเคราะห์ครบทุกองค์ประกอบ มีตัวเลขเฉพาะเจาะจง เชื่อมโยงกับการค้นพบทางวิทยาศาสตร์ที่สำคัญ'
  },
  {
    id: 'golden_50',
    stratum: 'high',
    gradeLevel: 'ม.5',
    subject: 'เศรษฐศาสตร์',
    questionContext: 'วิเคราะห์ผลกระทบของนโยบายดอกเบี้ยต่อเศรษฐกิจไทย และเสนอแนวทางรับมือกับภาวะเงินเฟ้อ',
    studentAnswer: 'นโยบายดอกเบี้ยเป็นเครื่องมือสำคัญของธนาคารกลาง เมื่อเงินเฟ้อสูง ธปท. จะขึ้นดอกเบี้ยนโยบายเพื่อ: 1) ลดการกู้ยืม ทำให้ปริมาณเงินในระบบลดลง 2) เพิ่มแรงจูงใจในการออม 3) ค่าเงินบาทแข็งขึ้น ทำให้นำเข้าสินค้าถูกลง ผลกระทบต่อไทยคือ: ผู้กู้ซื้อบ้าน/รถต้องจ่ายดอกเบี้ยมากขึ้น SME เข้าถึงสินเชื่อยากขึ้น ตลาดหุ้นอาจปรับตัวลดลง แนวทางรับมือ: 1) รัฐควรใช้มาตรการกำกับราคาสินค้าจำเป็นควบคู่ 2) สนับสนุนสินเชื่อดอกเบี้ยต่ำสำหรับ SME 3) ประชาชนควรจัดสรรหนี้ใหม่ หาแหล่งรายได้เพิ่ม หรือลงทุนในพันธบัตรที่ได้ประโยชน์จากดอกเบี้ยขาขึ้น',
    aiScores: { analysis: 4, reasoning: 5, creativity: 4, evidence: 4 },
    expertScores: { analysis: 4, reasoning: 5, creativity: 4, evidence: 4 },
    expertNotes: 'วิเคราะห์กลไกเศรษฐกิจได้ครบถ้วน เหตุผลเป็นขั้นตอน มีข้อเสนอสร้างสรรค์ทั้งระดับรัฐและประชาชน'
  }
]

async function seedGoldenDataset() {
  console.log('🏆 Seeding Golden Dataset (10 new items)...')
  console.log('═'.repeat(50))
  
  const batch = db.batch()
  const timestamp = new Date().toISOString()
  
  for (const sample of goldenSamples) {
    const docRef = db.collection('goldenDataset').doc(sample.id)
    
    // Calculate agreement metrics
    const dimensions = ['analysis', 'reasoning', 'creativity', 'evidence']
    const totalAI = dimensions.reduce((sum, d) => sum + sample.aiScores[d], 0)
    const totalExpert = dimensions.reduce((sum, d) => sum + sample.expertScores[d], 0)
    
    // Calculate dimension-wise agreement
    const dimensionAgreement = {}
    let perfectMatch = 0
    let withinOne = 0
    
    for (const dim of dimensions) {
      const diff = Math.abs(sample.aiScores[dim] - sample.expertScores[dim])
      dimensionAgreement[dim] = {
        aiScore: sample.aiScores[dim],
        expertScore: sample.expertScores[dim],
        difference: diff,
        agree: diff === 0,
        withinOne: diff <= 1
      }
      if (diff === 0) perfectMatch++
      if (diff <= 1) withinOne++
    }
    
    batch.set(docRef, {
      assessmentId: sample.id,
      questionContext: sample.questionContext,
      studentAnswer: sample.studentAnswer,
      gradeLevel: sample.gradeLevel,
      subject: sample.subject,
      aiScores: sample.aiScores,
      expertScores: sample.expertScores,
      expertId: 'expert_phase5_calibration',
      expertNotes: sample.expertNotes,
      validationDate: timestamp,
      stratum: sample.stratum,
      totalAIScore: totalAI,
      totalExpertScore: totalExpert,
      agreement: {
        dimensions: dimensionAgreement,
        perfectMatchCount: perfectMatch,
        withinOneCount: withinOne,
        perfectMatchRate: perfectMatch / 4,
        withinOneRate: withinOne / 4,
        totalDifference: Math.abs(totalAI - totalExpert)
      },
      metadata: {
        addedAt: timestamp,
        version: '2.0',
        isActive: true,
        source: 'phase5_calibration',
        validated: true
      }
    })
    
    console.log(`✅ ${sample.id} (${sample.stratum}) - AI: ${totalAI}/20, Expert: ${totalExpert}/20`)
  }
  
  await batch.commit()
  console.log('═'.repeat(50))
  console.log('✅ Successfully added 10 Golden Dataset samples')
  
  // Update stats
  console.log('\n📊 Updating Golden Dataset stats...')
  
  const snapshot = await db.collection('goldenDataset')
    .where('metadata.isActive', '==', true)
    .get()
  
  const counts = { low: 0, medium: 0, high: 0, total: 0 }
  snapshot.forEach(doc => {
    const data = doc.data()
    counts[data.stratum] = (counts[data.stratum] || 0) + 1
    counts.total++
  })
  
  await db.collection('systemConfig').doc('goldenDatasetStats').set({
    counts,
    lastUpdated: timestamp,
    targetSamples: 50,
    minimumSamples: 50,
    isBalanced: {
      balanced: counts.total >= 50,
      lowPercent: (counts.low / counts.total * 100).toFixed(1) + '%',
      mediumPercent: (counts.medium / counts.total * 100).toFixed(1) + '%',
      highPercent: (counts.high / counts.total * 100).toFixed(1) + '%'
    }
  }, { merge: true })
  
  console.log(`\n📈 Golden Dataset Stats:`)
  console.log(`   Total: ${counts.total}/50 samples`)
  console.log(`   Low (0-6): ${counts.low} (${(counts.low/counts.total*100).toFixed(1)}%)`)
  console.log(`   Medium (7-13): ${counts.medium} (${(counts.medium/counts.total*100).toFixed(1)}%)`)
  console.log(`   High (14-20): ${counts.high} (${(counts.high/counts.total*100).toFixed(1)}%)`)
  
  console.log('\n🎉 Phase 5: Golden Dataset expansion complete!')
}

// Run if called directly
if (require.main === module) {
  seedGoldenDataset()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

module.exports = { seedGoldenDataset, goldenSamples }
