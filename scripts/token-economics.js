/**
 * 📊 Token Economics Calculator
 * คำนวณต้นทุนการใช้ AI Assessment สำหรับการวางแผนงบประมาณ
 * 
 * Usage:
 *   node scripts/token-economics.js
 *   node scripts/token-economics.js --students 3000 --activities 20
 */

// ====== PRICING (as of Dec 2025) ======
const PRICING = {
  'gpt-4o-mini': {
    input: 0.15,   // $0.15 per 1M tokens
    output: 0.60,  // $0.60 per 1M tokens
    name: 'GPT-4o-mini (Recommended)'
  },
  'gpt-4o': {
    input: 2.50,   // $2.50 per 1M tokens
    output: 10.00, // $10 per 1M tokens
    name: 'GPT-4o (Flagship)'
  },
  'gpt-4-turbo': {
    input: 10.00,
    output: 30.00,
    name: 'GPT-4 Turbo (Legacy)'
  },
  'gpt-3.5-turbo': {
    input: 0.50,
    output: 1.50,
    name: 'GPT-3.5 Turbo (Legacy)'
  },
  'o1-mini': {
    input: 3.00,
    output: 12.00,
    name: 'o1-mini (Reasoning)'
  }
}

// ====== TOKEN ESTIMATES ======
const TOKEN_ESTIMATES = {
  // Assessment (assessAnswer function)
  assessment: {
    systemPrompt: 50,           // "You are an expert..."
    hotsPromptV4: 2000,         // Full HOTS prompt with CoT, Bias Prevention
    studentAnswer: 150,         // Average student answer
    questionContext: 100,       // Question context
    output: 500,                // JSON response with chainOfThought
    total: function() {
      return this.systemPrompt + this.hotsPromptV4 + this.studentAnswer + this.questionContext + this.output
    }
  },
  
  // LO Assessment (if learningOutcomes provided)
  loAssessment: {
    prompt: 800,
    output: 200,
    total: 1000
  },
  
  // Worksheet Generation
  worksheetGeneration: {
    input: 3000,
    output: 5000,
    total: 8000
  },
  
  // Lesson Plan Generation
  lessonPlanGeneration: {
    input: 2500,
    output: 6000,
    total: 8500
  },
  
  // Question Generation
  questionGeneration: {
    input: 1500,
    output: 1000,
    total: 2500
  }
}

// ====== CALCULATION FUNCTIONS ======

/**
 * Calculate cost for a single API call
 */
function calculateSingleCallCost(inputTokens, outputTokens, model = 'gpt-4o-mini') {
  const pricing = PRICING[model]
  if (!pricing) {
    throw new Error(`Unknown model: ${model}`)
  }
  
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    totalCostTHB: (inputCost + outputCost) * 35 // Approx THB rate
  }
}

/**
 * Calculate cost per assessment
 */
function calculateAssessmentCost(model = 'gpt-4o-mini', includeLO = true) {
  const est = TOKEN_ESTIMATES.assessment
  let inputTokens = est.systemPrompt + est.hotsPromptV4 + est.studentAnswer + est.questionContext
  let outputTokens = est.output
  
  if (includeLO) {
    inputTokens += TOKEN_ESTIMATES.loAssessment.prompt
    outputTokens += TOKEN_ESTIMATES.loAssessment.output
  }
  
  return calculateSingleCallCost(inputTokens, outputTokens, model)
}

/**
 * Calculate cost for a semester
 */
function calculateSemesterCost(options = {}) {
  const {
    students = 30,              // Number of students
    activitiesPerStudent = 20,  // Activities per student per semester
    model = 'gpt-4o-mini',
    includeLO = true,
    worksheetsPerTeacher = 5,   // Worksheets generated per teacher
    lessonPlansPerTeacher = 10, // Lesson plans generated
    teachers = 1
  } = options
  
  // Student-side costs
  const assessmentCost = calculateAssessmentCost(model, includeLO)
  const totalAssessments = students * activitiesPerStudent
  const studentCosts = assessmentCost.totalCost * totalAssessments
  
  // Teacher-side costs
  const worksheetCost = calculateSingleCallCost(
    TOKEN_ESTIMATES.worksheetGeneration.input,
    TOKEN_ESTIMATES.worksheetGeneration.output,
    model
  )
  const lessonPlanCost = calculateSingleCallCost(
    TOKEN_ESTIMATES.lessonPlanGeneration.input,
    TOKEN_ESTIMATES.lessonPlanGeneration.output,
    model
  )
  
  const teacherCosts = teachers * (
    (worksheetsPerTeacher * worksheetCost.totalCost) +
    (lessonPlansPerTeacher * lessonPlanCost.totalCost)
  )
  
  const totalCost = studentCosts + teacherCosts
  
  return {
    model,
    modelName: PRICING[model].name,
    
    // Breakdown
    students,
    activitiesPerStudent,
    totalAssessments,
    
    // Costs (USD)
    costPerAssessment: assessmentCost.totalCost,
    studentCostsUSD: studentCosts,
    teacherCostsUSD: teacherCosts,
    totalCostUSD: totalCost,
    
    // Costs (THB)
    costPerAssessmentTHB: assessmentCost.totalCostTHB,
    studentCostsTHB: studentCosts * 35,
    teacherCostsTHB: teacherCosts * 35,
    totalCostTHB: totalCost * 35,
    
    // Per student
    costPerStudentUSD: totalCost / students,
    costPerStudentTHB: (totalCost * 35) / students
  }
}

/**
 * Compare costs across models
 */
function compareModels(options = {}) {
  const models = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'o1-mini']
  const results = {}
  
  for (const model of models) {
    results[model] = calculateSemesterCost({ ...options, model })
  }
  
  return results
}

// ====== REPORT GENERATION ======

function generateReport(options = {}) {
  const {
    students = 30,
    activitiesPerStudent = 20,
    teachers = 1
  } = options
  
  console.log('═'.repeat(60))
  console.log('📊 HOTS-AI Token Economics Report')
  console.log('═'.repeat(60))
  console.log(`Date: ${new Date().toISOString().split('T')[0]}`)
  console.log(`Students: ${students}`)
  console.log(`Activities/Student: ${activitiesPerStudent}`)
  console.log(`Total Assessments: ${students * activitiesPerStudent}`)
  console.log('')
  
  // Token breakdown
  console.log('📝 Token Breakdown (per Assessment):')
  console.log('─'.repeat(40))
  const est = TOKEN_ESTIMATES.assessment
  console.log(`  System Prompt:     ${est.systemPrompt.toLocaleString()} tokens`)
  console.log(`  HOTS Prompt v4.0:  ${est.hotsPromptV4.toLocaleString()} tokens`)
  console.log(`  Student Answer:    ${est.studentAnswer.toLocaleString()} tokens`)
  console.log(`  Question Context:  ${est.questionContext.toLocaleString()} tokens`)
  console.log(`  ─────────────────────────────`)
  console.log(`  INPUT TOTAL:       ${(est.systemPrompt + est.hotsPromptV4 + est.studentAnswer + est.questionContext).toLocaleString()} tokens`)
  console.log(`  OUTPUT:            ${est.output.toLocaleString()} tokens`)
  console.log(`  + LO Assessment:   ${TOKEN_ESTIMATES.loAssessment.total.toLocaleString()} tokens`)
  console.log('')
  
  // Model comparison
  console.log('💰 Cost Comparison by Model:')
  console.log('─'.repeat(60))
  
  const comparison = compareModels(options)
  
  console.log('Model                    | Per Assessment | Per Student | Semester Total')
  console.log('─'.repeat(60))
  
  for (const [model, result] of Object.entries(comparison)) {
    const perAssess = `$${result.costPerAssessment.toFixed(4)}`
    const perStudent = `฿${result.costPerStudentTHB.toFixed(2)}`
    const total = `฿${result.totalCostTHB.toFixed(2)}`
    
    const modelName = result.modelName.padEnd(24)
    console.log(`${modelName} | ${perAssess.padStart(14)} | ${perStudent.padStart(11)} | ${total.padStart(14)}`)
  }
  
  console.log('')
  
  // Recommended (gpt-4o-mini)
  const recommended = comparison['gpt-4o-mini']
  console.log('✅ RECOMMENDED: gpt-4o-mini')
  console.log('─'.repeat(40))
  console.log(`  Cost per assessment:  $${recommended.costPerAssessment.toFixed(4)} (฿${recommended.costPerAssessmentTHB.toFixed(3)})`)
  console.log(`  Cost per student:     ฿${recommended.costPerStudentTHB.toFixed(2)}/semester`)
  console.log(`  Total semester cost:  ฿${recommended.totalCostTHB.toFixed(2)} ($${recommended.totalCostUSD.toFixed(2)})`)
  console.log('')
  
  // Scale projection
  console.log('📈 Scale Projections (gpt-4o-mini):')
  console.log('─'.repeat(40))
  
  const scales = [
    { name: '1 Classroom', students: 30 },
    { name: '1 Grade Level', students: 150 },
    { name: '1 School', students: 500 },
    { name: 'Large School', students: 1500 },
    { name: 'District (5 schools)', students: 3000 },
    { name: 'Province', students: 10000 }
  ]
  
  for (const scale of scales) {
    const result = calculateSemesterCost({ 
      ...options, 
      students: scale.students,
      model: 'gpt-4o-mini'
    })
    console.log(`  ${scale.name.padEnd(20)} (${scale.students.toLocaleString().padStart(6)} students): ฿${result.totalCostTHB.toFixed(2).padStart(10)}/semester`)
  }
  
  console.log('')
  console.log('═'.repeat(60))
  console.log('💡 Optimization Tips:')
  console.log('  1. Current prompt is optimized - do NOT reduce')
  console.log('  2. gpt-4o-mini is 15-17x cheaper than gpt-4o')
  console.log('  3. Temperature=0 + seed=42 ensures consistency')
  console.log('  4. Cost is negligible for most schools (<฿2,000/semester)')
  console.log('═'.repeat(60))
}

// ====== MAIN ======

// Parse command line args
const args = process.argv.slice(2)
const options = {
  students: 30,
  activitiesPerStudent: 20,
  teachers: 1
}

for (let i = 0; i < args.length; i += 2) {
  const key = args[i]?.replace('--', '')
  const value = parseInt(args[i + 1])
  
  if (key === 'students') options.students = value
  if (key === 'activities') options.activitiesPerStudent = value
  if (key === 'teachers') options.teachers = value
}

// Run report
generateReport(options)

// Export for use as module (ESM)
export {
  PRICING,
  TOKEN_ESTIMATES,
  calculateSingleCallCost,
  calculateAssessmentCost,
  calculateSemesterCost,
  compareModels,
  generateReport
}
