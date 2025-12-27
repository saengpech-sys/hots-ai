/**
 * 📝 Research Draft Generator
 * 
 * ระบบร่างรายงานวิจัยกึ่งอัตโนมัติ (Academic Publication Pipeline)
 * สร้างร่างบทความวิชาการจากข้อมูลสถิติ
 * 
 * Features:
 * 1. Statistical Narrative Generation - สร้างข้อความจากสถิติ
 * 2. TCI/Scopus Format Templates - เทมเพลตตามมาตรฐานวารสาร
 * 3. APA 7th Edition Formatting - จัดรูปแบบตาม APA
 * 4. Results Section Draft - ร่างผลการวิจัย
 * 5. Discussion Points Generator - สร้างประเด็นอภิปราย
 * 6. Multi-language Support (Thai/English)
 * 
 * Impact for C10:
 * - ช่วยผลิตผลงานวิชาการได้รวดเร็ว
 * - Scalability of Research
 * 
 * @version 1.0.0
 * @author HOTS-AI Research Team
 */

/**
 * 🎯 Publication Standards
 */
const PUBLICATION_STANDARDS = {
  TCI_1: {
    name: 'TCI กลุ่ม 1',
    language: 'thai',
    abstractWordLimit: 350,
    keywordLimit: 5,
    sections: ['บทนำ', 'วัตถุประสงค์', 'วิธีดำเนินการวิจัย', 'ผลการวิจัย', 'อภิปรายผล', 'ข้อเสนอแนะ']
  },
  TCI_2: {
    name: 'TCI กลุ่ม 2',
    language: 'thai',
    abstractWordLimit: 300,
    keywordLimit: 5,
    sections: ['บทนำ', 'วัตถุประสงค์', 'วิธีการวิจัย', 'ผลการวิจัย', 'สรุปและอภิปราย']
  },
  SCOPUS: {
    name: 'Scopus/ISI',
    language: 'english',
    abstractWordLimit: 250,
    keywordLimit: 6,
    sections: ['Introduction', 'Literature Review', 'Methodology', 'Results', 'Discussion', 'Conclusion']
  }
}

/**
 * 📊 Statistical Interpretation Templates
 */
const STAT_INTERPRETATIONS = {
  kappa: {
    excellent: { min: 0.81, text_th: 'มีความสอดคล้องอย่างดีเยี่ยม', text_en: 'excellent agreement' },
    good: { min: 0.61, text_th: 'มีความสอดคล้องดี', text_en: 'substantial agreement' },
    moderate: { min: 0.41, text_th: 'มีความสอดคล้องปานกลาง', text_en: 'moderate agreement' },
    fair: { min: 0.21, text_th: 'มีความสอดคล้องพอใช้', text_en: 'fair agreement' },
    poor: { min: 0, text_th: 'มีความสอดคล้องต่ำ', text_en: 'slight agreement' }
  },
  effectSize: {
    large: { min: 0.8, text_th: 'ขนาดอิทธิพลใหญ่', text_en: 'large effect size' },
    medium: { min: 0.5, text_th: 'ขนาดอิทธิพลปานกลาง', text_en: 'medium effect size' },
    small: { min: 0.2, text_th: 'ขนาดอิทธิพลเล็ก', text_en: 'small effect size' },
    negligible: { min: 0, text_th: 'ขนาดอิทธิพลน้อยมาก', text_en: 'negligible effect size' }
  },
  semFit: {
    cfi: { good: 0.95, acceptable: 0.90, text_th: 'ค่าดัชนีความสอดคล้อง CFI', text_en: 'CFI' },
    tli: { good: 0.95, acceptable: 0.90, text_th: 'ค่าดัชนี TLI', text_en: 'TLI' },
    rmsea: { good: 0.06, acceptable: 0.08, text_th: 'ค่า RMSEA', text_en: 'RMSEA' },
    srmr: { good: 0.08, acceptable: 0.10, text_th: 'ค่า SRMR', text_en: 'SRMR' }
  }
}

/**
 * 📝 Research Draft Generator Engine
 */
class ResearchDraftGenerator {
  constructor(options = {}) {
    this.language = options.language || 'thai'
    this.standard = options.standard || 'TCI_1'
  }

  /**
   * Generate complete research draft from statistics
   */
  generateResearchDraft(researchData) {
    const {
      title,
      authors,
      statistics,
      sampleSize,
      methodology,
      hypothesis
    } = researchData

    const draft = {
      metadata: {
        title,
        authors,
        generatedAt: new Date().toISOString(),
        standard: this.standard,
        language: this.language
      },
      sections: {}
    }

    // Generate each section
    draft.sections.abstract = this.generateAbstract(researchData)
    draft.sections.results = this.generateResultsSection(statistics, sampleSize)
    draft.sections.discussion = this.generateDiscussionSection(statistics, hypothesis)
    draft.sections.tables = this.generateStatisticalTables(statistics)
    draft.sections.references = this.generateReferenceTemplates()

    return draft
  }

  /**
   * Generate abstract
   */
  generateAbstract(researchData) {
    const { title, sampleSize, statistics, methodology } = researchData
    const isThai = this.language === 'thai'

    if (isThai) {
      return {
        title: 'บทคัดย่อ',
        content: `การวิจัยครั้งนี้มีวัตถุประสงค์เพื่อพัฒนาและศึกษาประสิทธิภาพของ${title} ` +
          `กลุ่มตัวอย่างเป็นนักเรียน จำนวน ${sampleSize} คน ` +
          `เครื่องมือที่ใช้ในการวิจัย ได้แก่ ${methodology || 'ระบบประเมิน HOTS'} ` +
          `ผลการวิจัยพบว่า ${this.summarizeResults(statistics, 'thai')}`
      }
    }

    return {
      title: 'Abstract',
      content: `This study aimed to develop and evaluate the effectiveness of ${title}. ` +
        `The sample consisted of ${sampleSize} students. ` +
        `Research instruments included ${methodology || 'HOTS assessment system'}. ` +
        `Results indicated that ${this.summarizeResults(statistics, 'english')}`
    }
  }

  /**
   * Summarize results for abstract
   */
  summarizeResults(statistics, lang) {
    const parts = []
    
    if (statistics.irr?.kappa) {
      const interp = this.interpretKappa(statistics.irr.kappa)
      if (lang === 'thai') {
        parts.push(`ความเชื่อมั่นระหว่างผู้ประเมิน${interp.text_th} (κ = ${statistics.irr.kappa.toFixed(2)})`)
      } else {
        parts.push(`inter-rater reliability showed ${interp.text_en} (κ = ${statistics.irr.kappa.toFixed(2)})`)
      }
    }

    if (statistics.effectSize?.d) {
      const interp = this.interpretEffectSize(statistics.effectSize.d)
      if (lang === 'thai') {
        parts.push(`มี${interp.text_th} (d = ${statistics.effectSize.d.toFixed(2)})`)
      } else {
        parts.push(`with ${interp.text_en} (d = ${statistics.effectSize.d.toFixed(2)})`)
      }
    }

    return parts.join(lang === 'thai' ? ' และ' : ' and ') || (lang === 'thai' ? 'ระบบมีประสิทธิภาพตามเกณฑ์' : 'the system met effectiveness criteria')
  }

  /**
   * Generate results section
   */
  generateResultsSection(statistics, sampleSize) {
    const isThai = this.language === 'thai'
    const paragraphs = []

    // Opening
    if (isThai) {
      paragraphs.push({
        type: 'opening',
        text: `ผลการวิเคราะห์ข้อมูลจากกลุ่มตัวอย่าง ${sampleSize} คน พบผลการวิจัยดังนี้`
      })
    } else {
      paragraphs.push({
        type: 'opening',
        text: `Analysis of data from ${sampleSize} participants revealed the following results.`
      })
    }

    // IRR Results
    if (statistics.irr) {
      paragraphs.push(this.generateIRRParagraph(statistics.irr))
    }

    // Descriptive Statistics
    if (statistics.descriptive) {
      paragraphs.push(this.generateDescriptiveParagraph(statistics.descriptive))
    }

    // Effect Size
    if (statistics.effectSize) {
      paragraphs.push(this.generateEffectSizeParagraph(statistics.effectSize))
    }

    // SEM Results
    if (statistics.sem) {
      paragraphs.push(this.generateSEMParagraph(statistics.sem))
    }

    // Dimension Analysis
    if (statistics.dimensions) {
      paragraphs.push(this.generateDimensionParagraph(statistics.dimensions))
    }

    return {
      title: isThai ? 'ผลการวิจัย' : 'Results',
      paragraphs
    }
  }

  /**
   * Generate IRR paragraph
   */
  generateIRRParagraph(irr) {
    const isThai = this.language === 'thai'
    const interp = this.interpretKappa(irr.kappa)

    if (isThai) {
      return {
        type: 'irr',
        heading: '1. ความเชื่อมั่นระหว่างผู้ประเมิน (Inter-Rater Reliability)',
        text: `ผลการตรวจสอบความเชื่อมั่นระหว่างผู้ประเมินโดยใช้ค่าสัมประสิทธิ์ Cohen's Kappa ` +
          `พบว่ามีค่าเท่ากับ ${irr.kappa.toFixed(3)} ซึ่ง${interp.text_th} ` +
          `ตามเกณฑ์ของ Landis และ Koch (1977) ` +
          (irr.icc ? `และค่า ICC เท่ากับ ${irr.icc.toFixed(3)} ` : '') +
          `แสดงให้เห็นว่าระบบการประเมินมีความน่าเชื่อถือ`,
        citation: 'Landis, J. R., & Koch, G. G. (1977). The measurement of observer agreement for categorical data. Biometrics, 33(1), 159-174.'
      }
    }

    return {
      type: 'irr',
      heading: '1. Inter-Rater Reliability',
      text: `Inter-rater reliability was assessed using Cohen's Kappa coefficient. ` +
        `Results indicated ${interp.text_en} (κ = ${irr.kappa.toFixed(3)}) ` +
        `according to Landis and Koch's (1977) guidelines. ` +
        (irr.icc ? `The ICC was ${irr.icc.toFixed(3)}. ` : '') +
        `This demonstrates the reliability of the assessment system.`,
      citation: 'Landis, J. R., & Koch, G. G. (1977). The measurement of observer agreement for categorical data. Biometrics, 33(1), 159-174.'
    }
  }

  /**
   * Generate descriptive statistics paragraph
   */
  generateDescriptiveParagraph(descriptive) {
    const isThai = this.language === 'thai'
    const { mean, sd, min, max, n } = descriptive

    if (isThai) {
      return {
        type: 'descriptive',
        heading: '2. สถิติเชิงพรรณนา',
        text: `ผลการวิเคราะห์สถิติเชิงพรรณนาของคะแนน HOTS พบว่า ` +
          `ค่าเฉลี่ย (M) เท่ากับ ${mean.toFixed(2)} ส่วนเบี่ยงเบนมาตรฐาน (SD) เท่ากับ ${sd.toFixed(2)} ` +
          `คะแนนต่ำสุด ${min} คะแนนสูงสุด ${max} จากจำนวนกลุ่มตัวอย่าง ${n} คน`
      }
    }

    return {
      type: 'descriptive',
      heading: '2. Descriptive Statistics',
      text: `Descriptive analysis of HOTS scores revealed ` +
        `a mean (M) of ${mean.toFixed(2)} with a standard deviation (SD) of ${sd.toFixed(2)}. ` +
        `Scores ranged from ${min} to ${max} (N = ${n}).`
    }
  }

  /**
   * Generate effect size paragraph
   */
  generateEffectSizeParagraph(effectSize) {
    const isThai = this.language === 'thai'
    const interp = this.interpretEffectSize(effectSize.d)

    if (isThai) {
      return {
        type: 'effectSize',
        heading: '3. ขนาดอิทธิพล (Effect Size)',
        text: `การวิเคราะห์ขนาดอิทธิพลโดยใช้ค่า Cohen's d พบว่ามีค่าเท่ากับ ${effectSize.d.toFixed(2)} ` +
          `ซึ่งจัดอยู่ในระดับ${interp.text_th} ตามเกณฑ์ของ Cohen (1988) ` +
          `แสดงให้เห็นว่าระบบมีผลต่อการพัฒนาทักษะการคิดขั้นสูงของนักเรียนอย่างมีนัยสำคัญ`,
        citation: 'Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Lawrence Erlbaum Associates.'
      }
    }

    return {
      type: 'effectSize',
      heading: '3. Effect Size',
      text: `Effect size analysis using Cohen's d yielded a value of ${effectSize.d.toFixed(2)}, ` +
        `indicating a ${interp.text_en} according to Cohen's (1988) guidelines. ` +
        `This suggests the system has a meaningful impact on students' higher-order thinking skills development.`,
      citation: 'Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Lawrence Erlbaum Associates.'
    }
  }

  /**
   * Generate SEM paragraph
   */
  generateSEMParagraph(sem) {
    const isThai = this.language === 'thai'
    const fitAssessment = this.assessSEMFit(sem)

    if (isThai) {
      return {
        type: 'sem',
        heading: '4. ผลการวิเคราะห์โมเดลสมการโครงสร้าง',
        text: `การวิเคราะห์โมเดลสมการโครงสร้าง (SEM) พบว่า ` +
          `ค่า Chi-square = ${sem.chisq?.toFixed(2) || 'N/A'}, df = ${sem.df || 'N/A'}, ` +
          `CFI = ${sem.cfi?.toFixed(3) || 'N/A'}, TLI = ${sem.tli?.toFixed(3) || 'N/A'}, ` +
          `RMSEA = ${sem.rmsea?.toFixed(3) || 'N/A'}, SRMR = ${sem.srmr?.toFixed(3) || 'N/A'} ` +
          `ซึ่ง${fitAssessment.text_th} ตามเกณฑ์ของ Hu และ Bentler (1999)`,
        citation: 'Hu, L., & Bentler, P. M. (1999). Cutoff criteria for fit indexes in covariance structure analysis. Structural Equation Modeling, 6(1), 1-55.'
      }
    }

    return {
      type: 'sem',
      heading: '4. Structural Equation Modeling Results',
      text: `Structural equation modeling (SEM) analysis revealed ` +
        `Chi-square = ${sem.chisq?.toFixed(2) || 'N/A'}, df = ${sem.df || 'N/A'}, ` +
        `CFI = ${sem.cfi?.toFixed(3) || 'N/A'}, TLI = ${sem.tli?.toFixed(3) || 'N/A'}, ` +
        `RMSEA = ${sem.rmsea?.toFixed(3) || 'N/A'}, SRMR = ${sem.srmr?.toFixed(3) || 'N/A'}. ` +
        `These indices indicate ${fitAssessment.text_en} according to Hu and Bentler's (1999) criteria.`,
      citation: 'Hu, L., & Bentler, P. M. (1999). Cutoff criteria for fit indexes in covariance structure analysis. Structural Equation Modeling, 6(1), 1-55.'
    }
  }

  /**
   * Generate dimension analysis paragraph
   */
  generateDimensionParagraph(dimensions) {
    const isThai = this.language === 'thai'
    const dimLabels = {
      analysis: { th: 'การวิเคราะห์', en: 'Analysis' },
      reasoning: { th: 'การให้เหตุผล', en: 'Reasoning' },
      creativity: { th: 'ความคิดสร้างสรรค์', en: 'Creativity' },
      evidence: { th: 'การใช้หลักฐาน', en: 'Evidence Use' }
    }

    const dimParts = Object.entries(dimensions).map(([dim, stats]) => {
      const label = dimLabels[dim] || { th: dim, en: dim }
      if (isThai) {
        return `${label.th} (M = ${stats.mean.toFixed(2)}, SD = ${stats.sd.toFixed(2)})`
      }
      return `${label.en} (M = ${stats.mean.toFixed(2)}, SD = ${stats.sd.toFixed(2)})`
    })

    if (isThai) {
      return {
        type: 'dimensions',
        heading: '5. การวิเคราะห์รายมิติ',
        text: `ผลการวิเคราะห์คะแนนแยกตามมิติการคิดขั้นสูง พบว่า ${dimParts.join(', ')} ` +
          `แสดงให้เห็นว่านักเรียนมีพัฒนาการในทุกมิติของการคิดขั้นสูง`
      }
    }

    return {
      type: 'dimensions',
      heading: '5. Dimension Analysis',
      text: `Analysis by HOTS dimensions revealed: ${dimParts.join(', ')}. ` +
        `These results indicate development across all higher-order thinking dimensions.`
    }
  }

  /**
   * Generate discussion section
   */
  generateDiscussionSection(statistics, hypothesis) {
    const isThai = this.language === 'thai'
    const points = []

    if (isThai) {
      points.push({
        heading: 'การอภิปรายผลการวิจัย',
        text: 'จากผลการวิจัยสามารถอภิปรายได้ดังนี้'
      })

      // IRR Discussion
      if (statistics.irr?.kappa) {
        const interp = this.interpretKappa(statistics.irr.kappa)
        points.push({
          point: 1,
          text: `ความเชื่อมั่นระหว่างผู้ประเมิน${interp.text_th} แสดงให้เห็นว่า ` +
            `ระบบการประเมินสามารถให้ผลที่สอดคล้องกัน ซึ่งสอดคล้องกับการศึกษาของ ... ` +
            `ทั้งนี้อาจเป็นเพราะ Rubric มีความชัดเจนและผู้ประเมินผ่านการฝึกอบรม`
        })
      }

      // Effect Size Discussion
      if (statistics.effectSize?.d) {
        const interp = this.interpretEffectSize(statistics.effectSize.d)
        points.push({
          point: 2,
          text: `${interp.text_th}บ่งชี้ว่าระบบมีผลต่อการพัฒนาทักษะอย่างมีนัยสำคัญในทางปฏิบัติ ` +
            `สอดคล้องกับทฤษฎีการเรียนรู้แบบสร้างสรรค์ที่เน้นการมีปฏิสัมพันธ์และการให้ feedback`
        })
      }

      points.push({
        point: 3,
        text: 'ผลการวิจัยครั้งนี้สนับสนุนสมมติฐานที่ว่า ' +
          (hypothesis || 'ระบบประเมินทักษะการคิดขั้นสูงด้วย AI สามารถพัฒนาทักษะของนักเรียนได้อย่างมีประสิทธิภาพ')
      })
    } else {
      points.push({
        heading: 'Discussion',
        text: 'The following discussion addresses the research findings.'
      })

      if (statistics.irr?.kappa) {
        const interp = this.interpretKappa(statistics.irr.kappa)
        points.push({
          point: 1,
          text: `The ${interp.text_en} demonstrates that the assessment system produces consistent results. ` +
            `This aligns with previous studies by ... and may be attributed to clear rubric definitions and rater training.`
        })
      }

      if (statistics.effectSize?.d) {
        const interp = this.interpretEffectSize(statistics.effectSize.d)
        points.push({
          point: 2,
          text: `The ${interp.text_en} indicates practically significant impact on skill development. ` +
            `This supports constructivist learning theory emphasizing interaction and feedback.`
        })
      }

      points.push({
        point: 3,
        text: 'These findings support the hypothesis that ' +
          (hypothesis || 'AI-powered HOTS assessment systems can effectively develop students\' skills.')
      })
    }

    return {
      title: isThai ? 'อภิปรายผล' : 'Discussion',
      points
    }
  }

  /**
   * Generate statistical tables
   */
  generateStatisticalTables(statistics) {
    const tables = []

    // Descriptive Statistics Table
    if (statistics.descriptive || statistics.dimensions) {
      tables.push(this.generateDescriptiveTable(statistics))
    }

    // IRR Table
    if (statistics.irr) {
      tables.push(this.generateIRRTable(statistics.irr))
    }

    // SEM Fit Indices Table
    if (statistics.sem) {
      tables.push(this.generateSEMTable(statistics.sem))
    }

    return tables
  }

  /**
   * Generate descriptive statistics table
   */
  generateDescriptiveTable(statistics) {
    const isThai = this.language === 'thai'
    
    const headers = isThai
      ? ['ตัวแปร', 'N', 'M', 'SD', 'Min', 'Max']
      : ['Variable', 'N', 'M', 'SD', 'Min', 'Max']

    const rows = []
    
    if (statistics.descriptive) {
      rows.push([
        isThai ? 'คะแนนรวม HOTS' : 'Total HOTS Score',
        statistics.descriptive.n,
        statistics.descriptive.mean.toFixed(2),
        statistics.descriptive.sd.toFixed(2),
        statistics.descriptive.min,
        statistics.descriptive.max
      ])
    }

    if (statistics.dimensions) {
      const dimLabels = {
        analysis: { th: 'การวิเคราะห์', en: 'Analysis' },
        reasoning: { th: 'การให้เหตุผล', en: 'Reasoning' },
        creativity: { th: 'ความคิดสร้างสรรค์', en: 'Creativity' },
        evidence: { th: 'การใช้หลักฐาน', en: 'Evidence Use' }
      }

      for (const [dim, stats] of Object.entries(statistics.dimensions)) {
        const label = dimLabels[dim] || { th: dim, en: dim }
        rows.push([
          isThai ? label.th : label.en,
          stats.n || '-',
          stats.mean.toFixed(2),
          stats.sd.toFixed(2),
          stats.min || '-',
          stats.max || '-'
        ])
      }
    }

    return {
      type: 'descriptive',
      title: isThai ? 'ตารางที่ 1 สถิติเชิงพรรณนาของคะแนน HOTS' : 'Table 1. Descriptive Statistics of HOTS Scores',
      headers,
      rows,
      note: isThai ? 'หมายเหตุ: M = ค่าเฉลี่ย, SD = ส่วนเบี่ยงเบนมาตรฐาน' : 'Note: M = Mean, SD = Standard Deviation'
    }
  }

  /**
   * Generate IRR table
   */
  generateIRRTable(irr) {
    const isThai = this.language === 'thai'

    return {
      type: 'irr',
      title: isThai ? 'ตารางที่ 2 ค่าความเชื่อมั่นระหว่างผู้ประเมิน' : 'Table 2. Inter-Rater Reliability Indices',
      headers: isThai ? ['ดัชนี', 'ค่า', 'การแปลผล'] : ['Index', 'Value', 'Interpretation'],
      rows: [
        [
          "Cohen's Kappa (κ)",
          irr.kappa?.toFixed(3) || '-',
          this.interpretKappa(irr.kappa)[isThai ? 'text_th' : 'text_en']
        ],
        [
          'ICC',
          irr.icc?.toFixed(3) || '-',
          irr.icc >= 0.75 ? (isThai ? 'ดี' : 'Good') : (isThai ? 'ยอมรับได้' : 'Acceptable')
        ],
        [
          'Percent Agreement',
          irr.percentAgreement ? `${irr.percentAgreement.toFixed(1)}%` : '-',
          '-'
        ]
      ]
    }
  }

  /**
   * Generate SEM fit table
   */
  generateSEMTable(sem) {
    const isThai = this.language === 'thai'
    const fit = this.assessSEMFit(sem)

    return {
      type: 'sem',
      title: isThai ? 'ตารางที่ 3 ค่าดัชนีความสอดคล้องของโมเดล' : 'Table 3. Model Fit Indices',
      headers: isThai ? ['ดัชนี', 'ค่าที่ได้', 'เกณฑ์', 'ผลการประเมิน'] : ['Index', 'Value', 'Criterion', 'Assessment'],
      rows: [
        ['χ²/df', sem.chisqDf?.toFixed(2) || '-', '< 3.00', sem.chisqDf < 3 ? '✓' : '✗'],
        ['CFI', sem.cfi?.toFixed(3) || '-', '≥ 0.95', sem.cfi >= 0.95 ? '✓' : (sem.cfi >= 0.90 ? '~' : '✗')],
        ['TLI', sem.tli?.toFixed(3) || '-', '≥ 0.95', sem.tli >= 0.95 ? '✓' : (sem.tli >= 0.90 ? '~' : '✗')],
        ['RMSEA', sem.rmsea?.toFixed(3) || '-', '≤ 0.06', sem.rmsea <= 0.06 ? '✓' : (sem.rmsea <= 0.08 ? '~' : '✗')],
        ['SRMR', sem.srmr?.toFixed(3) || '-', '≤ 0.08', sem.srmr <= 0.08 ? '✓' : '✗']
      ],
      note: isThai ? 'หมายเหตุ: ✓ = ผ่านเกณฑ์, ~ = พอรับได้, ✗ = ไม่ผ่านเกณฑ์' : 'Note: ✓ = Meets criterion, ~ = Acceptable, ✗ = Does not meet criterion'
    }
  }

  /**
   * Generate reference templates
   */
  generateReferenceTemplates() {
    const isThai = this.language === 'thai'

    return {
      title: isThai ? 'รายการอ้างอิง' : 'References',
      suggested: [
        {
          category: isThai ? 'การคิดขั้นสูง' : 'Higher-Order Thinking',
          references: [
            'Anderson, L. W., & Krathwohl, D. R. (2001). A taxonomy for learning, teaching, and assessing. Longman.',
            'Bloom, B. S. (1956). Taxonomy of educational objectives: The classification of educational goals. Longmans, Green.'
          ]
        },
        {
          category: isThai ? 'ความเชื่อมั่น' : 'Reliability',
          references: [
            'Cohen, J. (1960). A coefficient of agreement for nominal scales. Educational and Psychological Measurement, 20(1), 37-46.',
            'Landis, J. R., & Koch, G. G. (1977). The measurement of observer agreement for categorical data. Biometrics, 33(1), 159-174.'
          ]
        },
        {
          category: isThai ? 'ขนาดอิทธิพล' : 'Effect Size',
          references: [
            'Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.). Lawrence Erlbaum Associates.'
          ]
        },
        {
          category: 'SEM',
          references: [
            'Hu, L., & Bentler, P. M. (1999). Cutoff criteria for fit indexes in covariance structure analysis. Structural Equation Modeling, 6(1), 1-55.',
            'Kline, R. B. (2015). Principles and practice of structural equation modeling (4th ed.). Guilford Press.'
          ]
        }
      ]
    }
  }

  // === Interpretation Helper Methods ===

  interpretKappa(kappa) {
    if (kappa === null || kappa === undefined) {
      return { text_th: 'ไม่สามารถคำนวณได้', text_en: 'cannot be calculated' }
    }
    for (const [, config] of Object.entries(STAT_INTERPRETATIONS.kappa)) {
      if (kappa >= config.min) {
        return config
      }
    }
    return STAT_INTERPRETATIONS.kappa.poor
  }

  interpretEffectSize(d) {
    if (d === null || d === undefined) {
      return { text_th: 'ไม่สามารถคำนวณได้', text_en: 'cannot be calculated' }
    }
    const absD = Math.abs(d)
    for (const [, config] of Object.entries(STAT_INTERPRETATIONS.effectSize)) {
      if (absD >= config.min) {
        return config
      }
    }
    return STAT_INTERPRETATIONS.effectSize.negligible
  }

  assessSEMFit(sem) {
    let goodCount = 0
    let acceptableCount = 0
    const total = 4

    if (sem.cfi >= 0.95) goodCount++
    else if (sem.cfi >= 0.90) acceptableCount++

    if (sem.tli >= 0.95) goodCount++
    else if (sem.tli >= 0.90) acceptableCount++

    if (sem.rmsea <= 0.06) goodCount++
    else if (sem.rmsea <= 0.08) acceptableCount++

    if (sem.srmr <= 0.08) goodCount++
    else if (sem.srmr <= 0.10) acceptableCount++

    if (goodCount >= 3) {
      return { text_th: 'โมเดลมีความสอดคล้องกับข้อมูลเชิงประจักษ์ดี', text_en: 'good model fit' }
    }
    if (goodCount + acceptableCount >= 3) {
      return { text_th: 'โมเดลมีความสอดคล้องกับข้อมูลเชิงประจักษ์ในระดับยอมรับได้', text_en: 'acceptable model fit' }
    }
    return { text_th: 'โมเดลมีความสอดคล้องกับข้อมูลเชิงประจักษ์ต่ำ ต้องปรับปรุง', text_en: 'poor model fit requiring modification' }
  }

  /**
   * Export draft to different formats
   */
  exportToMarkdown(draft) {
    let md = `# ${draft.metadata.title}\n\n`
    md += `**Authors:** ${draft.metadata.authors?.join(', ') || 'N/A'}\n\n`
    md += `**Generated:** ${draft.metadata.generatedAt}\n\n`
    md += `---\n\n`

    // Abstract
    if (draft.sections.abstract) {
      md += `## ${draft.sections.abstract.title}\n\n`
      md += `${draft.sections.abstract.content}\n\n`
    }

    // Results
    if (draft.sections.results) {
      md += `## ${draft.sections.results.title}\n\n`
      for (const para of draft.sections.results.paragraphs) {
        if (para.heading) md += `### ${para.heading}\n\n`
        md += `${para.text}\n\n`
        if (para.citation) md += `> *${para.citation}*\n\n`
      }
    }

    // Tables
    if (draft.sections.tables) {
      for (const table of draft.sections.tables) {
        md += `### ${table.title}\n\n`
        md += `| ${table.headers.join(' | ')} |\n`
        md += `| ${table.headers.map(() => '---').join(' | ')} |\n`
        for (const row of table.rows) {
          md += `| ${row.join(' | ')} |\n`
        }
        if (table.note) md += `\n*${table.note}*\n`
        md += '\n'
      }
    }

    // Discussion
    if (draft.sections.discussion) {
      md += `## ${draft.sections.discussion.title}\n\n`
      for (const point of draft.sections.discussion.points) {
        if (point.heading) md += `${point.text}\n\n`
        else md += `${point.point}. ${point.text}\n\n`
      }
    }

    // References
    if (draft.sections.references) {
      md += `## ${draft.sections.references.title}\n\n`
      for (const cat of draft.sections.references.suggested) {
        md += `### ${cat.category}\n\n`
        for (const ref of cat.references) {
          md += `- ${ref}\n`
        }
        md += '\n'
      }
    }

    return md
  }
}

// Export
module.exports = {
  PUBLICATION_STANDARDS,
  STAT_INTERPRETATIONS,
  ResearchDraftGenerator
}
