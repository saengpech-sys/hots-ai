/**
 * มาตรฐานการเรียนรู้ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551 (ฉบับปรับปรุง พ.ศ. 2560)
 * อ้างอิง: สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน กระทรวงศึกษาธิการ
 */

export const SUBJECT_GROUPS = {
  THAI: 'ภาษาไทย',
  MATH: 'คณิตศาสตร์',
  SCIENCE: 'วิทยาศาสตร์และเทคโนโลยี',
  SCIENCE_COMPUTER: 'วิทยาศาสตร์และเทคโนโลยี(งานคอมพิวเตอร์)',
  SOCIAL: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
  HEALTH: 'สุขศึกษาและพลศึกษา',
  ART: 'ศิลปะ',
  CAREER: 'การงานอาชีพ',
  FOREIGN: 'ภาษาต่างประเทศ'
}

/**
 * มาตรฐานการเรียนรู้แยกตามกลุ่มสาระ
 * รูปแบบ: { code: 'รหัสมาตรฐาน', name: 'ชื่อมาตรฐาน', strands: [สาระย่อย] }
 */
export const CURRICULUM_STANDARDS = {
  // ========================
  // กลุ่มสาระภาษาไทย
  // ========================
  'ภาษาไทย': [
    {
      code: 'ท 1.1',
      name: 'การอ่าน',
      description: 'ใช้กระบวนการอ่านสร้างความรู้และความคิดเพื่อนำไปใช้ตัดสินใจ แก้ปัญหาในการดำเนินชีวิต และมีนิสัยรักการอ่าน',
      strands: [
        { code: 'ท 1.1', name: 'การอ่านออกเสียงและการอ่านในใจ' }
      ]
    },
    {
      code: 'ท 2.1',
      name: 'การเขียน',
      description: 'ใช้กระบวนการเขียนเขียนสื่อสาร เขียนเรียงความ ย่อความ และเขียนเรื่องราวในรูปแบบต่างๆ เขียนรายงานข้อมูลสารสนเทศและรายงานการศึกษาค้นคว้าอย่างมีประสิทธิภาพ',
      strands: [
        { code: 'ท 2.1', name: 'การเขียนสื่อสาร' }
      ]
    },
    {
      code: 'ท 3.1',
      name: 'การฟัง การดู และการพูด',
      description: 'สามารถเลือกฟังและดูอย่างมีวิจารณญาณ และพูดแสดงความรู้ ความคิด และความรู้สึกในโอกาสต่างๆ อย่างมีวิจารณญาณและสร้างสรรค์',
      strands: [
        { code: 'ท 3.1', name: 'การฟัง การดู และการพูด' }
      ]
    },
    {
      code: 'ท 4.1',
      name: 'หลักการใช้ภาษาไทย',
      description: 'เข้าใจธรรมชาติของภาษาและหลักภาษาไทย การเปลี่ยนแปลงของภาษาและพลังของภาษา ภูมิปัญญาทางภาษา และรักษาภาษาไทยไว้เป็นสมบัติของชาติ',
      strands: [
        { code: 'ท 4.1', name: 'หลักการใช้ภาษาไทย' }
      ]
    },
    {
      code: 'ท 5.1',
      name: 'วรรณคดีและวรรณกรรม',
      description: 'เข้าใจและแสดงความคิดเห็น วิจารณ์วรรณคดีและวรรณกรรมไทยอย่างเห็นคุณค่าและนำมาประยุกต์ใช้ในชีวิตจริง',
      strands: [
        { code: 'ท 5.1', name: 'วรรณคดีและวรรณกรรม' }
      ]
    }
  ],

  // ========================
  // กลุ่มสาระคณิตศาสตร์
  // ========================
  'คณิตศาสตร์': [
    {
      code: 'ค 1.1',
      name: 'จำนวนและการดำเนินการ',
      description: 'เข้าใจความหลากหลายของการแสดงจำนวน ระบบจำนวน การดำเนินการของจำนวน ผลที่เกิดขึ้นจากการดำเนินการ สมบัติของการดำเนินการ และนำไปใช้',
      strands: [
        { code: 'ค 1.1', name: 'จำนวนและการดำเนินการ' },
        { code: 'ค 1.2', name: 'อัตราส่วน สัดส่วน และร้อยละ' },
        { code: 'ค 1.3', name: 'จำนวนจริง' }
      ]
    },
    {
      code: 'ค 2.1',
      name: 'การวัดและเรขาคณิต',
      description: 'เข้าใจพื้นฐานเกี่ยวกับการวัด วัดและคาดคะเนขนาดของสิ่งที่ต้องการวัด และนำไปใช้',
      strands: [
        { code: 'ค 2.1', name: 'การวัด' },
        { code: 'ค 2.2', name: 'เรขาคณิต' }
      ]
    },
    {
      code: 'ค 3.1',
      name: 'สถิติและความน่าจะเป็น',
      description: 'เข้าใจกระบวนการทางสถิติ และใช้ความรู้ทางสถิติในการแก้ปัญหา',
      strands: [
        { code: 'ค 3.1', name: 'สถิติ' },
        { code: 'ค 3.2', name: 'ความน่าจะเป็น' }
      ]
    },
    {
      code: 'ค 4.1',
      name: 'พีชคณิต',
      description: 'เข้าใจและวิเคราะห์แบบรูป ความสัมพันธ์ ฟังก์ชัน ลำดับและอนุกรม และนำไปใช้',
      strands: [
        { code: 'ค 4.1', name: 'แบบรูปและความสัมพันธ์' },
        { code: 'ค 4.2', name: 'นิพจน์และสมการ' }
      ]
    }
  ],

  // ========================
  // กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี
  // ========================
  'วิทยาศาสตร์และเทคโนโลยี': [
    {
      code: 'ว 1.1',
      name: 'วิทยาศาสตร์ชีวภาพ',
      description: 'เข้าใจหน่วยพื้นฐานของสิ่งมีชีวิต ความสัมพันธ์ของโครงสร้างและหน้าที่ของระบบต่างๆ ของสิ่งมีชีวิตที่ทำงานสัมพันธ์กัน',
      strands: [
        { code: 'ว 1.1', name: 'ชีววิทยา' },
        { code: 'ว 1.2', name: 'ชีวิตกับสิ่งแวดล้อม' },
        { code: 'ว 1.3', name: 'สิ่งมีชีวิตกับกระบวนการดำรงชีวิต' }
      ]
    },
    {
      code: 'ว 2.1',
      name: 'วิทยาศาสตร์กายภาพ',
      description: 'เข้าใจสมบัติของสสาร องค์ประกอบของสสาร ความสัมพันธ์ระหว่างสมบัติของสสารกับโครงสร้างและแรงยึดเหนี่ยวระหว่างอนุภาค',
      strands: [
        { code: 'ว 2.1', name: 'สสารและสารในชีวิตประจำวัน' },
        { code: 'ว 2.2', name: 'แรงและการเคลื่อนที่' },
        { code: 'ว 2.3', name: 'พลังงาน' }
      ]
    },
    {
      code: 'ว 3.1',
      name: 'วิทยาศาสตร์โลกและอวกาศ',
      description: 'เข้าใจองค์ประกอบ ลักษณะ กระบวนการเกิด และวิวัฒนาการของเอกภพ กาแล็กซี ดาวฤกษ์ และระบบสุริยะ',
      strands: [
        { code: 'ว 3.1', name: 'โลก ดาราศาสตร์ และอวกาศ' },
        { code: 'ว 3.2', name: 'ธรณีวิทยา' }
      ]
    },
    {
      code: 'ว 4.1',
      name: 'เทคโนโลยี (การออกแบบและเทคโนโลยี)',
      description: 'เข้าใจแนวคิดหลักของเทคโนโลยี วิเคราะห์ระบบทางเทคโนโลยี ออกแบบ สร้างหรือพัฒนาผลงานสำหรับแก้ปัญหาที่เกี่ยวข้องกับชีวิตประจำวัน',
      strands: [
        { code: 'ว 4.1', name: 'การออกแบบและเทคโนโลยี' }
      ]
    },
    {
      code: 'ว 4.2',
      name: 'เทคโนโลยี (วิทยาการคำนวณ)',
      description: 'เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริงอย่างเป็นขั้นตอนและเป็นระบบ ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการเรียนรู้ การทำงาน และการแก้ปัญหาได้อย่างมีประสิทธิภาพ รู้เท่าทันและมีจริยธรรม',
      strands: [
        { code: 'ว 4.2', name: 'วิทยาการคำนวณ' }
      ]
    }
  ],

  // ========================
  // กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี (งานคอมพิวเตอร์) - ใช้เฉพาะ ว 4.2
  // ========================
  'วิทยาศาสตร์และเทคโนโลยี(งานคอมพิวเตอร์)': [
    {
      code: 'ว 4.2',
      name: 'เทคโนโลยี (วิทยาการคำนวณ)',
      description: 'เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริงอย่างเป็นขั้นตอนและเป็นระบบ ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการเรียนรู้ การทำงาน และการแก้ปัญหาได้อย่างมีประสิทธิภาพ รู้เท่าทันและมีจริยธรรม',
      strands: [
        { code: 'ว 4.2', name: 'วิทยาการคำนวณ' }
      ]
    }
  ],

  // ========================
  // กลุ่มสาระสังคมศึกษา ศาสนา และวัฒนธรรม
  // ========================
  'สังคมศึกษา ศาสนา และวัฒนธรรม': [
    {
      code: 'ส 1.1',
      name: 'ศาสนา ศีลธรรม จริยธรรม',
      description: 'รู้และเข้าใจประวัติ ความสำคัญ ศาสดา หลักธรรมของพระพุทธศาสนาหรือศาสนาที่ตนนับถือ และศาสนาอื่น',
      strands: [
        { code: 'ส 1.1', name: 'ศาสนา ศีลธรรม จริยธรรม' },
        { code: 'ส 1.2', name: 'หน้าที่ชาวพุทธ' }
      ]
    },
    {
      code: 'ส 2.1',
      name: 'หน้าที่พลเมือง วัฒนธรรม และการดำเนินชีวิตในสังคม',
      description: 'เข้าใจและปฏิบัติตนตามหน้าที่ของการเป็นพลเมืองดี มีค่านิยมที่ดีงาม และธำรงรักษาประเพณีและวัฒนธรรมไทย',
      strands: [
        { code: 'ส 2.1', name: 'หน้าที่พลเมือง วัฒนธรรม และการดำเนินชีวิตในสังคม' },
        { code: 'ส 2.2', name: 'กฎหมาย และสิทธิมนุษยชน' }
      ]
    },
    {
      code: 'ส 3.1',
      name: 'เศรษฐศาสตร์',
      description: 'เข้าใจและสามารถบริหารจัดการทรัพยากรในการผลิตและการบริโภค การใช้ทรัพยากรที่มีอยู่จำกัดได้อย่างมีประสิทธิภาพและคุ้มค่า',
      strands: [
        { code: 'ส 3.1', name: 'เศรษฐศาสตร์' },
        { code: 'ส 3.2', name: 'เศรษฐกิจพอเพียง' }
      ]
    },
    {
      code: 'ส 4.1',
      name: 'ประวัติศาสตร์',
      description: 'เข้าใจความหมาย ความสำคัญของเวลาและยุคสมัยทางประวัติศาสตร์ สามารถใช้วิธีการทางประวัติศาสตร์มาวิเคราะห์เหตุการณ์ต่างๆ อย่างเป็นระบบ',
      strands: [
        { code: 'ส 4.1', name: 'ประวัติศาสตร์ไทย' },
        { code: 'ส 4.2', name: 'ประวัติศาสตร์สากล' },
        { code: 'ส 4.3', name: 'ประวัติศาสตร์ท้องถิ่น' }
      ]
    },
    {
      code: 'ส 5.1',
      name: 'ภูมิศาสตร์',
      description: 'เข้าใจลักษณะของโลกทางกายภาพ และความสัมพันธ์ของสรรพสิ่งที่มีผลต่อกัน ใช้แผนที่และเครื่องมือทางภูมิศาสตร์ในการค้นหา วิเคราะห์ สรุป และใช้ข้อมูลภูมิสารสนเทศ',
      strands: [
        { code: 'ส 5.1', name: 'ภูมิศาสตร์' },
        { code: 'ส 5.2', name: 'สิ่งแวดล้อมและทรัพยากรธรรมชาติ' }
      ]
    }
  ],

  // ========================
  // กลุ่มสาระสุขศึกษาและพลศึกษา
  // ========================
  'สุขศึกษาและพลศึกษา': [
    {
      code: 'พ 1.1',
      name: 'การเจริญเติบโตและพัฒนาการของมนุษย์',
      description: 'เข้าใจธรรมชาติของการเจริญเติบโตและพัฒนาการของมนุษย์',
      strands: [
        { code: 'พ 1.1', name: 'การเจริญเติบโตและพัฒนาการของมนุษย์' }
      ]
    },
    {
      code: 'พ 2.1',
      name: 'ชีวิตและครอบครัว',
      description: 'เข้าใจและเห็นคุณค่าตนเอง ครอบครัว เพศศึกษา และมีทักษะในการดำเนินชีวิต',
      strands: [
        { code: 'พ 2.1', name: 'ชีวิตและครอบครัว' }
      ]
    },
    {
      code: 'พ 3.1',
      name: 'การเคลื่อนไหว การออกกำลังกาย การเล่นเกม กีฬาไทย และกีฬาสากล',
      description: 'เข้าใจ มีทักษะในการเคลื่อนไหว กิจกรรมทางกาย การเล่นเกม และกีฬา',
      strands: [
        { code: 'พ 3.1', name: 'การเคลื่อนไหว' },
        { code: 'พ 3.2', name: 'กีฬา' }
      ]
    },
    {
      code: 'พ 4.1',
      name: 'การสร้างเสริมสุขภาพ สมรรถภาพ และการป้องกันโรค',
      description: 'เห็นคุณค่าและมีทักษะในการสร้างเสริมสุขภาพ การดำรงสุขภาพ การป้องกันโรค และการสร้างเสริมสมรรถภาพเพื่อสุขภาพ',
      strands: [
        { code: 'พ 4.1', name: 'การสร้างเสริมสุขภาพ สมรรถภาพ และการป้องกันโรค' }
      ]
    },
    {
      code: 'พ 5.1',
      name: 'ความปลอดภัยในชีวิต',
      description: 'ป้องกันและหลีกเลี่ยงปัจจัยเสี่ยง พฤติกรรมเสี่ยงต่อสุขภาพ อุบัติเหตุ การใช้ยา สารเสพติด และความรุนแรง',
      strands: [
        { code: 'พ 5.1', name: 'ความปลอดภัยในชีวิต' }
      ]
    }
  ],

  // ========================
  // กลุ่มสาระศิลปะ
  // ========================
  'ศิลปะ': [
    {
      code: 'ศ 1.1',
      name: 'ทัศนศิลป์',
      description: 'สร้างสรรค์งานทัศนศิลป์ตามจินตนาการ และความคิดสร้างสรรค์ วิเคราะห์ วิพากษ์ วิจารณ์คุณค่างานทัศนศิลป์ ถ่ายทอดความรู้สึก ความคิดต่องานศิลปะอย่างอิสระ ชื่นชม และประยุกต์ใช้ในชีวิตประจำวัน',
      strands: [
        { code: 'ศ 1.1', name: 'ทัศนศิลป์' },
        { code: 'ศ 1.2', name: 'การออกแบบ' }
      ]
    },
    {
      code: 'ศ 2.1',
      name: 'ดนตรี',
      description: 'เข้าใจและแสดงออกทางดนตรีอย่างสร้างสรรค์ วิเคราะห์ วิพากษ์วิจารณ์คุณค่าดนตรี ถ่ายทอดความรู้สึก ความคิดต่อดนตรีอย่างอิสระ ชื่นชม และประยุกต์ใช้ในชีวิตประจำวัน',
      strands: [
        { code: 'ศ 2.1', name: 'ดนตรี' },
        { code: 'ศ 2.2', name: 'ดนตรีไทย' }
      ]
    },
    {
      code: 'ศ 3.1',
      name: 'นาฏศิลป์',
      description: 'เข้าใจและแสดงออกทางนาฏศิลป์อย่างสร้างสรรค์ วิเคราะห์ วิพากษ์วิจารณ์คุณค่านาฏศิลป์ ถ่ายทอดความรู้สึก ความคิดอย่างอิสระ ชื่นชมและประยุกต์ใช้ในชีวิตประจำวัน',
      strands: [
        { code: 'ศ 3.1', name: 'นาฏศิลป์' },
        { code: 'ศ 3.2', name: 'นาฏศิลป์ไทย' }
      ]
    }
  ],

  // ========================
  // กลุ่มสาระการงานอาชีพ
  // ========================
  'การงานอาชีพ': [
    {
      code: 'ง 1.1',
      name: 'การดำรงชีวิตและครอบครัว',
      description: 'เข้าใจการทำงาน มีความคิดสร้างสรรค์ มีทักษะกระบวนการทำงาน ทักษะการจัดการ ทักษะกระบวนการแก้ปัญหา ทักษะการทำงานร่วมกัน และทักษะการแสวงหาความรู้ มีคุณธรรม และลักษณะนิสัยในการทำงาน มีจิตสำนึกในการใช้พลังงาน ทรัพยากร และสิ่งแวดล้อม เพื่อการดำรงชีวิตและครอบครัว',
      strands: [
        { code: 'ง 1.1', name: 'การดำรงชีวิตและครอบครัว' }
      ]
    },
    {
      code: 'ง 2.1',
      name: 'การออกแบบและเทคโนโลยี',
      description: 'เข้าใจเทคโนโลยีและกระบวนการเทคโนโลยี ออกแบบและสร้างสิ่งของเครื่องใช้หรือวิธีการตามกระบวนการเทคโนโลยีอย่างมีความคิดสร้างสรรค์ เลือกใช้เทคโนโลยีในทางสร้างสรรค์ต่อชีวิต สังคม สิ่งแวดล้อม และมีส่วนร่วมในการจัดการเทคโนโลยีที่ยั่งยืน',
      strands: [
        { code: 'ง 2.1', name: 'การออกแบบและเทคโนโลยี' }
      ]
    },
    {
      code: 'ง 3.1',
      name: 'เทคโนโลยีสารสนเทศและการสื่อสาร',
      description: 'เข้าใจ เห็นคุณค่า และใช้กระบวนการเทคโนโลยีสารสนเทศในการสืบค้นข้อมูล การเรียนรู้ การสื่อสาร การแก้ปัญหา การทำงาน และอาชีพอย่างมีประสิทธิภาพ ประสิทธิผล และมีคุณธรรม',
      strands: [
        { code: 'ง 3.1', name: 'เทคโนโลยีสารสนเทศและการสื่อสาร' }
      ]
    },
    {
      code: 'ง 4.1',
      name: 'การอาชีพ',
      description: 'เข้าใจ มีทักษะที่จำเป็น มีประสบการณ์ เห็นแนวทางในงานอาชีพ ใช้เทคโนโลยีเพื่อพัฒนาอาชีพ มีคุณธรรม และมีเจตคติที่ดีต่ออาชีพ',
      strands: [
        { code: 'ง 4.1', name: 'การอาชีพ' }
      ]
    }
  ],

  // ========================
  // กลุ่มสาระภาษาต่างประเทศ
  // ========================
  'ภาษาต่างประเทศ': [
    {
      code: 'ต 1.1',
      name: 'ภาษาเพื่อการสื่อสาร',
      description: 'เข้าใจและตีความเรื่องที่ฟังและอ่านจากสื่อประเภทต่างๆ และแสดงความคิดเห็นอย่างมีเหตุผล',
      strands: [
        { code: 'ต 1.1', name: 'การฟังและการอ่าน' },
        { code: 'ต 1.2', name: 'การพูดและการเขียน' },
        { code: 'ต 1.3', name: 'การนำเสนอ' }
      ]
    },
    {
      code: 'ต 2.1',
      name: 'ภาษาและวัฒนธรรม',
      description: 'เข้าใจความสัมพันธ์ระหว่างภาษากับวัฒนธรรมของเจ้าของภาษา และนำไปใช้ได้อย่างเหมาะสมกับกาลเทศะ',
      strands: [
        { code: 'ต 2.1', name: 'ภาษาและวัฒนธรรม' },
        { code: 'ต 2.2', name: 'การเปรียบเทียบภาษา' }
      ]
    },
    {
      code: 'ต 3.1',
      name: 'ภาษากับความสัมพันธ์กับกลุ่มสาระการเรียนรู้อื่น',
      description: 'ใช้ภาษาต่างประเทศในการเชื่อมโยงความรู้กับกลุ่มสาระการเรียนรู้อื่น และเป็นพื้นฐานในการพัฒนา แสวงหาความรู้ และเปิดโลกทัศน์ของตน',
      strands: [
        { code: 'ต 3.1', name: 'ภาษากับความสัมพันธ์กับกลุ่มสาระการเรียนรู้อื่น' }
      ]
    },
    {
      code: 'ต 4.1',
      name: 'ภาษากับความสัมพันธ์กับชุมชนและโลก',
      description: 'ใช้ภาษาต่างประเทศในสถานการณ์ต่างๆ ทั้งในสถานศึกษา ชุมชน และสังคม',
      strands: [
        { code: 'ต 4.1', name: 'ภาษากับความสัมพันธ์กับชุมชนและโลก' },
        { code: 'ต 4.2', name: 'การใช้ภาษาต่างประเทศเพื่อการศึกษาต่อและประกอบอาชีพ' }
      ]
    }
  ]
}

/**
 * ดึงมาตรฐานตามกลุ่มสาระ
 * @param {string} subjectGroup - ชื่อกลุ่มสาระ
 * @returns {Array} - รายการมาตรฐาน
 */
export function getStandardsBySubjectGroup(subjectGroup) {
  return CURRICULUM_STANDARDS[subjectGroup] || []
}

/**
 * ดึงมาตรฐาน default สำหรับกลุ่มสาระ
 * @param {string} subjectGroup - ชื่อกลุ่มสาระ
 * @returns {Object|null} - มาตรฐานแรกของกลุ่มสาระ
 */
export function getDefaultStandard(subjectGroup) {
  const standards = getStandardsBySubjectGroup(subjectGroup)
  return standards.length > 0 ? standards[0] : null
}

/**
 * แปลงมาตรฐานเป็น options สำหรับ select dropdown
 * @param {string} subjectGroup - ชื่อกลุ่มสาระ
 * @returns {Array} - รายการ options
 */
export function getStandardOptions(subjectGroup) {
  const standards = getStandardsBySubjectGroup(subjectGroup)
  return standards.map(s => ({
    value: s.code,
    label: `${s.code} ${s.name}`,
    description: s.description
  }))
}

/**
 * ค้นหามาตรฐานจากรหัส
 * @param {string} code - รหัสมาตรฐาน (เช่น 'ว 4.2')
 * @returns {Object|null} - ข้อมูลมาตรฐาน
 */
export function findStandardByCode(code) {
  for (const [group, standards] of Object.entries(CURRICULUM_STANDARDS)) {
    const found = standards.find(s => s.code === code)
    if (found) {
      return { ...found, subjectGroup: group }
    }
  }
  return null
}

/**
 * รายวิชาตัวอย่างตามหลักสูตรแกนกลาง พ.ศ. 2551 (ฉบับปรับปรุง 2560)
 * อ้างอิง: โครงสร้างเวลาเรียนตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน
 */
export const PRESET_COURSES = {
  // ========================
  // ระดับประถมศึกษา (ป.1-6)
  // ========================
  'ประถมศึกษา': {
    'ภาษาไทย': [
      { courseCode: 'ท11101', courseName: 'ภาษาไทย', gradeLevel: 'ป.1', credits: '', totalHours: 200, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'] },
      { courseCode: 'ท12101', courseName: 'ภาษาไทย', gradeLevel: 'ป.2', credits: '', totalHours: 200, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'] },
      { courseCode: 'ท13101', courseName: 'ภาษาไทย', gradeLevel: 'ป.3', credits: '', totalHours: 200, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'] },
      { courseCode: 'ท14101', courseName: 'ภาษาไทย', gradeLevel: 'ป.4', credits: '', totalHours: 160, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'] },
      { courseCode: 'ท15101', courseName: 'ภาษาไทย', gradeLevel: 'ป.5', credits: '', totalHours: 160, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'] },
      { courseCode: 'ท16101', courseName: 'ภาษาไทย', gradeLevel: 'ป.6', credits: '', totalHours: 160, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'] }
    ],
    'คณิตศาสตร์': [
      { courseCode: 'ค11101', courseName: 'คณิตศาสตร์', gradeLevel: 'ป.1', credits: '', totalHours: 200, standards: ['ค 1.1', 'ค 2.1', 'ค 2.2', 'ค 3.1'] },
      { courseCode: 'ค12101', courseName: 'คณิตศาสตร์', gradeLevel: 'ป.2', credits: '', totalHours: 200, standards: ['ค 1.1', 'ค 2.1', 'ค 2.2', 'ค 3.1'] },
      { courseCode: 'ค13101', courseName: 'คณิตศาสตร์', gradeLevel: 'ป.3', credits: '', totalHours: 200, standards: ['ค 1.1', 'ค 2.1', 'ค 2.2', 'ค 3.1'] },
      { courseCode: 'ค14101', courseName: 'คณิตศาสตร์', gradeLevel: 'ป.4', credits: '', totalHours: 160, standards: ['ค 1.1', 'ค 2.1', 'ค 2.2', 'ค 3.1'] },
      { courseCode: 'ค15101', courseName: 'คณิตศาสตร์', gradeLevel: 'ป.5', credits: '', totalHours: 160, standards: ['ค 1.1', 'ค 2.1', 'ค 2.2', 'ค 3.1'] },
      { courseCode: 'ค16101', courseName: 'คณิตศาสตร์', gradeLevel: 'ป.6', credits: '', totalHours: 160, standards: ['ค 1.1', 'ค 2.1', 'ค 2.2', 'ค 3.1'] }
    ],
    'วิทยาศาสตร์และเทคโนโลยี': [
      { courseCode: 'ว11101', courseName: 'วิทยาศาสตร์และเทคโนโลยี', gradeLevel: 'ป.1', credits: '', totalHours: 80, standards: ['ว 1.1', 'ว 1.2', 'ว 1.3', 'ว 2.1', 'ว 2.2', 'ว 2.3', 'ว 3.1', 'ว 3.2'] },
      { courseCode: 'ว12101', courseName: 'วิทยาศาสตร์และเทคโนโลยี', gradeLevel: 'ป.2', credits: '', totalHours: 80, standards: ['ว 1.1', 'ว 1.2', 'ว 1.3', 'ว 2.1', 'ว 2.2', 'ว 2.3', 'ว 3.1', 'ว 3.2'] },
      { courseCode: 'ว13101', courseName: 'วิทยาศาสตร์และเทคโนโลยี', gradeLevel: 'ป.3', credits: '', totalHours: 80, standards: ['ว 1.1', 'ว 1.2', 'ว 1.3', 'ว 2.1', 'ว 2.2', 'ว 2.3', 'ว 3.1', 'ว 3.2'] },
      { courseCode: 'ว14101', courseName: 'วิทยาศาสตร์และเทคโนโลยี', gradeLevel: 'ป.4', credits: '', totalHours: 80, standards: ['ว 1.1', 'ว 1.2', 'ว 1.3', 'ว 2.1', 'ว 2.2', 'ว 2.3', 'ว 3.1', 'ว 3.2'] },
      { courseCode: 'ว15101', courseName: 'วิทยาศาสตร์และเทคโนโลยี', gradeLevel: 'ป.5', credits: '', totalHours: 80, standards: ['ว 1.1', 'ว 1.2', 'ว 1.3', 'ว 2.1', 'ว 2.2', 'ว 2.3', 'ว 3.1', 'ว 3.2'] },
      { courseCode: 'ว16101', courseName: 'วิทยาศาสตร์และเทคโนโลยี', gradeLevel: 'ป.6', credits: '', totalHours: 80, standards: ['ว 1.1', 'ว 1.2', 'ว 1.3', 'ว 2.1', 'ว 2.2', 'ว 2.3', 'ว 3.1', 'ว 3.2'] }
    ],
    'วิทยาศาสตร์และเทคโนโลยี(งานคอมพิวเตอร์)': [
      { courseCode: 'ว11201', courseName: 'วิทยาการคำนวณ', gradeLevel: 'ป.1', credits: '', totalHours: 40, standards: ['ว 4.2'] },
      { courseCode: 'ว12201', courseName: 'วิทยาการคำนวณ', gradeLevel: 'ป.2', credits: '', totalHours: 40, standards: ['ว 4.2'] },
      { courseCode: 'ว13201', courseName: 'วิทยาการคำนวณ', gradeLevel: 'ป.3', credits: '', totalHours: 40, standards: ['ว 4.2'] },
      { courseCode: 'ว14201', courseName: 'วิทยาการคำนวณ', gradeLevel: 'ป.4', credits: '', totalHours: 40, standards: ['ว 4.2'] },
      { courseCode: 'ว15201', courseName: 'วิทยาการคำนวณ', gradeLevel: 'ป.5', credits: '', totalHours: 40, standards: ['ว 4.2'] },
      { courseCode: 'ว16201', courseName: 'วิทยาการคำนวณ', gradeLevel: 'ป.6', credits: '', totalHours: 40, standards: ['ว 4.2'] }
    ],
    'สังคมศึกษา ศาสนา และวัฒนธรรม': [
      { courseCode: 'ส11101', courseName: 'สังคมศึกษา ศาสนา และวัฒนธรรม', gradeLevel: 'ป.1', credits: '', totalHours: 80, standards: ['ส 1.1', 'ส 1.2', 'ส 2.1', 'ส 2.2', 'ส 3.1', 'ส 3.2', 'ส 4.1', 'ส 4.2', 'ส 4.3', 'ส 5.1', 'ส 5.2'] },
      { courseCode: 'ส12101', courseName: 'สังคมศึกษา ศาสนา และวัฒนธรรม', gradeLevel: 'ป.2', credits: '', totalHours: 80, standards: ['ส 1.1', 'ส 1.2', 'ส 2.1', 'ส 2.2', 'ส 3.1', 'ส 3.2', 'ส 4.1', 'ส 4.2', 'ส 4.3', 'ส 5.1', 'ส 5.2'] },
      { courseCode: 'ส13101', courseName: 'สังคมศึกษา ศาสนา และวัฒนธรรม', gradeLevel: 'ป.3', credits: '', totalHours: 80, standards: ['ส 1.1', 'ส 1.2', 'ส 2.1', 'ส 2.2', 'ส 3.1', 'ส 3.2', 'ส 4.1', 'ส 4.2', 'ส 4.3', 'ส 5.1', 'ส 5.2'] },
      { courseCode: 'ส14101', courseName: 'สังคมศึกษา ศาสนา และวัฒนธรรม', gradeLevel: 'ป.4', credits: '', totalHours: 80, standards: ['ส 1.1', 'ส 1.2', 'ส 2.1', 'ส 2.2', 'ส 3.1', 'ส 3.2', 'ส 4.1', 'ส 4.2', 'ส 4.3', 'ส 5.1', 'ส 5.2'] },
      { courseCode: 'ส15101', courseName: 'สังคมศึกษา ศาสนา และวัฒนธรรม', gradeLevel: 'ป.5', credits: '', totalHours: 80, standards: ['ส 1.1', 'ส 1.2', 'ส 2.1', 'ส 2.2', 'ส 3.1', 'ส 3.2', 'ส 4.1', 'ส 4.2', 'ส 4.3', 'ส 5.1', 'ส 5.2'] },
      { courseCode: 'ส16101', courseName: 'สังคมศึกษา ศาสนา และวัฒนธรรม', gradeLevel: 'ป.6', credits: '', totalHours: 80, standards: ['ส 1.1', 'ส 1.2', 'ส 2.1', 'ส 2.2', 'ส 3.1', 'ส 3.2', 'ส 4.1', 'ส 4.2', 'ส 4.3', 'ส 5.1', 'ส 5.2'] }
    ],
    'ภาษาต่างประเทศ': [
      { courseCode: 'อ11101', courseName: 'ภาษาอังกฤษ', gradeLevel: 'ป.1', credits: '', totalHours: 40, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'] },
      { courseCode: 'อ12101', courseName: 'ภาษาอังกฤษ', gradeLevel: 'ป.2', credits: '', totalHours: 40, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'] },
      { courseCode: 'อ13101', courseName: 'ภาษาอังกฤษ', gradeLevel: 'ป.3', credits: '', totalHours: 40, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'] },
      { courseCode: 'อ14101', courseName: 'ภาษาอังกฤษ', gradeLevel: 'ป.4', credits: '', totalHours: 80, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'] },
      { courseCode: 'อ15101', courseName: 'ภาษาอังกฤษ', gradeLevel: 'ป.5', credits: '', totalHours: 80, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'] },
      { courseCode: 'อ16101', courseName: 'ภาษาอังกฤษ', gradeLevel: 'ป.6', credits: '', totalHours: 80, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'] }
    ]
  },

  // ========================
  // ระดับมัธยมศึกษาตอนต้น (ม.1-3)
  // ========================
  'มัธยมศึกษาตอนต้น': {
    'ภาษาไทย': [
      { courseCode: 'ท21101', courseName: 'ภาษาไทย 1', gradeLevel: 'ม.1', credits: 1.5, totalHours: 60, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'], semester: 1 },
      { courseCode: 'ท21102', courseName: 'ภาษาไทย 2', gradeLevel: 'ม.1', credits: 1.5, totalHours: 60, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'], semester: 2 },
      { courseCode: 'ท22101', courseName: 'ภาษาไทย 3', gradeLevel: 'ม.2', credits: 1.5, totalHours: 60, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'], semester: 1 },
      { courseCode: 'ท22102', courseName: 'ภาษาไทย 4', gradeLevel: 'ม.2', credits: 1.5, totalHours: 60, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'], semester: 2 },
      { courseCode: 'ท23101', courseName: 'ภาษาไทย 5', gradeLevel: 'ม.3', credits: 1.5, totalHours: 60, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'], semester: 1 },
      { courseCode: 'ท23102', courseName: 'ภาษาไทย 6', gradeLevel: 'ม.3', credits: 1.5, totalHours: 60, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'], semester: 2 }
    ],
    'คณิตศาสตร์': [
      { courseCode: 'ค21101', courseName: 'คณิตศาสตร์ 1', gradeLevel: 'ม.1', credits: 1.5, totalHours: 60, standards: ['ค 1.1', 'ค 1.2', 'ค 2.1', 'ค 2.2', 'ค 3.1'], semester: 1 },
      { courseCode: 'ค21102', courseName: 'คณิตศาสตร์ 2', gradeLevel: 'ม.1', credits: 1.5, totalHours: 60, standards: ['ค 1.1', 'ค 1.2', 'ค 2.1', 'ค 2.2', 'ค 3.1'], semester: 2 },
      { courseCode: 'ค22101', courseName: 'คณิตศาสตร์ 3', gradeLevel: 'ม.2', credits: 1.5, totalHours: 60, standards: ['ค 1.1', 'ค 1.2', 'ค 2.1', 'ค 2.2', 'ค 3.1'], semester: 1 },
      { courseCode: 'ค22102', courseName: 'คณิตศาสตร์ 4', gradeLevel: 'ม.2', credits: 1.5, totalHours: 60, standards: ['ค 1.1', 'ค 1.2', 'ค 2.1', 'ค 2.2', 'ค 3.1'], semester: 2 },
      { courseCode: 'ค23101', courseName: 'คณิตศาสตร์ 5', gradeLevel: 'ม.3', credits: 1.5, totalHours: 60, standards: ['ค 1.1', 'ค 1.2', 'ค 2.1', 'ค 2.2', 'ค 3.1', 'ค 3.2'], semester: 1 },
      { courseCode: 'ค23102', courseName: 'คณิตศาสตร์ 6', gradeLevel: 'ม.3', credits: 1.5, totalHours: 60, standards: ['ค 1.1', 'ค 1.2', 'ค 2.1', 'ค 2.2', 'ค 3.1', 'ค 3.2'], semester: 2 }
    ],
    'วิทยาศาสตร์และเทคโนโลยี': [
      { courseCode: 'ว21101', courseName: 'วิทยาศาสตร์ 1', gradeLevel: 'ม.1', credits: 1.5, totalHours: 60, standards: ['ว 1.1', 'ว 1.2', 'ว 1.3', 'ว 2.1', 'ว 2.2', 'ว 2.3', 'ว 3.1', 'ว 3.2'], semester: 1 },
      { courseCode: 'ว21102', courseName: 'วิทยาศาสตร์ 2', gradeLevel: 'ม.1', credits: 1.5, totalHours: 60, standards: ['ว 1.1', 'ว 1.2', 'ว 1.3', 'ว 2.1', 'ว 2.2', 'ว 2.3', 'ว 3.1', 'ว 3.2'], semester: 2 },
      { courseCode: 'ว22101', courseName: 'วิทยาศาสตร์ 3', gradeLevel: 'ม.2', credits: 1.5, totalHours: 60, standards: ['ว 1.1', 'ว 1.2', 'ว 1.3', 'ว 2.1', 'ว 2.2', 'ว 2.3', 'ว 3.1', 'ว 3.2'], semester: 1 },
      { courseCode: 'ว22102', courseName: 'วิทยาศาสตร์ 4', gradeLevel: 'ม.2', credits: 1.5, totalHours: 60, standards: ['ว 1.1', 'ว 1.2', 'ว 1.3', 'ว 2.1', 'ว 2.2', 'ว 2.3', 'ว 3.1', 'ว 3.2'], semester: 2 },
      { courseCode: 'ว23101', courseName: 'วิทยาศาสตร์ 5', gradeLevel: 'ม.3', credits: 1.5, totalHours: 60, standards: ['ว 1.1', 'ว 1.2', 'ว 1.3', 'ว 2.1', 'ว 2.2', 'ว 2.3', 'ว 3.1', 'ว 3.2'], semester: 1 },
      { courseCode: 'ว23102', courseName: 'วิทยาศาสตร์ 6', gradeLevel: 'ม.3', credits: 1.5, totalHours: 60, standards: ['ว 1.1', 'ว 1.2', 'ว 1.3', 'ว 2.1', 'ว 2.2', 'ว 2.3', 'ว 3.1', 'ว 3.2'], semester: 2 }
    ],
    'วิทยาศาสตร์และเทคโนโลยี(งานคอมพิวเตอร์)': [
      { courseCode: 'ว21103', courseName: 'วิทยาการคำนวณ 1', gradeLevel: 'ม.1', credits: 0.5, totalHours: 20, standards: ['ว 4.2'], semester: 1 },
      { courseCode: 'ว21104', courseName: 'การออกแบบและเทคโนโลยี 1', gradeLevel: 'ม.1', credits: 0.5, totalHours: 20, standards: ['ว 4.1'], semester: 2 },
      { courseCode: 'ว22103', courseName: 'วิทยาการคำนวณ 2', gradeLevel: 'ม.2', credits: 0.5, totalHours: 20, standards: ['ว 4.2'], semester: 1 },
      { courseCode: 'ว22104', courseName: 'การออกแบบและเทคโนโลยี 2', gradeLevel: 'ม.2', credits: 0.5, totalHours: 20, standards: ['ว 4.1'], semester: 2 },
      { courseCode: 'ว23103', courseName: 'วิทยาการคำนวณ 3', gradeLevel: 'ม.3', credits: 0.5, totalHours: 20, standards: ['ว 4.2'], semester: 1 },
      { courseCode: 'ว23104', courseName: 'การออกแบบและเทคโนโลยี 3', gradeLevel: 'ม.3', credits: 0.5, totalHours: 20, standards: ['ว 4.1'], semester: 2 }
    ],
    'สังคมศึกษา ศาสนา และวัฒนธรรม': [
      { courseCode: 'ส21101', courseName: 'สังคมศึกษา 1', gradeLevel: 'ม.1', credits: 1.5, totalHours: 60, standards: ['ส 1.1', 'ส 1.2', 'ส 2.1', 'ส 2.2', 'ส 3.1', 'ส 3.2', 'ส 4.1', 'ส 4.2', 'ส 4.3', 'ส 5.1', 'ส 5.2'], semester: 1 },
      { courseCode: 'ส21102', courseName: 'สังคมศึกษา 2', gradeLevel: 'ม.1', credits: 1.5, totalHours: 60, standards: ['ส 1.1', 'ส 1.2', 'ส 2.1', 'ส 2.2', 'ส 3.1', 'ส 3.2', 'ส 4.1', 'ส 4.2', 'ส 4.3', 'ส 5.1', 'ส 5.2'], semester: 2 },
      { courseCode: 'ส22101', courseName: 'สังคมศึกษา 3', gradeLevel: 'ม.2', credits: 1.5, totalHours: 60, standards: ['ส 1.1', 'ส 1.2', 'ส 2.1', 'ส 2.2', 'ส 3.1', 'ส 3.2', 'ส 4.1', 'ส 4.2', 'ส 4.3', 'ส 5.1', 'ส 5.2'], semester: 1 },
      { courseCode: 'ส22102', courseName: 'สังคมศึกษา 4', gradeLevel: 'ม.2', credits: 1.5, totalHours: 60, standards: ['ส 1.1', 'ส 1.2', 'ส 2.1', 'ส 2.2', 'ส 3.1', 'ส 3.2', 'ส 4.1', 'ส 4.2', 'ส 4.3', 'ส 5.1', 'ส 5.2'], semester: 2 },
      { courseCode: 'ส23101', courseName: 'สังคมศึกษา 5', gradeLevel: 'ม.3', credits: 1.5, totalHours: 60, standards: ['ส 1.1', 'ส 1.2', 'ส 2.1', 'ส 2.2', 'ส 3.1', 'ส 3.2', 'ส 4.1', 'ส 4.2', 'ส 4.3', 'ส 5.1', 'ส 5.2'], semester: 1 },
      { courseCode: 'ส23102', courseName: 'สังคมศึกษา 6', gradeLevel: 'ม.3', credits: 1.5, totalHours: 60, standards: ['ส 1.1', 'ส 1.2', 'ส 2.1', 'ส 2.2', 'ส 3.1', 'ส 3.2', 'ส 4.1', 'ส 4.2', 'ส 4.3', 'ส 5.1', 'ส 5.2'], semester: 2 }
    ],
    'สุขศึกษาและพลศึกษา': [
      { courseCode: 'พ21101', courseName: 'สุขศึกษา 1', gradeLevel: 'ม.1', credits: 0.5, totalHours: 20, standards: ['พ 1.1', 'พ 2.1', 'พ 3.1', 'พ 3.2', 'พ 4.1'], semester: 1 },
      { courseCode: 'พ21102', courseName: 'พลศึกษา 1', gradeLevel: 'ม.1', credits: 0.5, totalHours: 20, standards: ['พ 1.1', 'พ 2.1', 'พ 3.1', 'พ 3.2', 'พ 4.1'], semester: 2 },
      { courseCode: 'พ22101', courseName: 'สุขศึกษา 2', gradeLevel: 'ม.2', credits: 0.5, totalHours: 20, standards: ['พ 1.1', 'พ 2.1', 'พ 3.1', 'พ 3.2', 'พ 4.1'], semester: 1 },
      { courseCode: 'พ22102', courseName: 'พลศึกษา 2', gradeLevel: 'ม.2', credits: 0.5, totalHours: 20, standards: ['พ 1.1', 'พ 2.1', 'พ 3.1', 'พ 3.2', 'พ 4.1'], semester: 2 },
      { courseCode: 'พ23101', courseName: 'สุขศึกษา 3', gradeLevel: 'ม.3', credits: 0.5, totalHours: 20, standards: ['พ 1.1', 'พ 2.1', 'พ 3.1', 'พ 3.2', 'พ 4.1'], semester: 1 },
      { courseCode: 'พ23102', courseName: 'พลศึกษา 3', gradeLevel: 'ม.3', credits: 0.5, totalHours: 20, standards: ['พ 1.1', 'พ 2.1', 'พ 3.1', 'พ 3.2', 'พ 4.1'], semester: 2 }
    ],
    'ศิลปะ': [
      { courseCode: 'ศ21101', courseName: 'ศิลปะ 1', gradeLevel: 'ม.1', credits: 0.5, totalHours: 20, standards: ['ศ 1.1', 'ศ 1.2', 'ศ 2.1', 'ศ 2.2', 'ศ 3.1', 'ศ 3.2'], semester: 1 },
      { courseCode: 'ศ21102', courseName: 'ศิลปะ 2', gradeLevel: 'ม.1', credits: 0.5, totalHours: 20, standards: ['ศ 1.1', 'ศ 1.2', 'ศ 2.1', 'ศ 2.2', 'ศ 3.1', 'ศ 3.2'], semester: 2 },
      { courseCode: 'ศ22101', courseName: 'ศิลปะ 3', gradeLevel: 'ม.2', credits: 0.5, totalHours: 20, standards: ['ศ 1.1', 'ศ 1.2', 'ศ 2.1', 'ศ 2.2', 'ศ 3.1', 'ศ 3.2'], semester: 1 },
      { courseCode: 'ศ22102', courseName: 'ศิลปะ 4', gradeLevel: 'ม.2', credits: 0.5, totalHours: 20, standards: ['ศ 1.1', 'ศ 1.2', 'ศ 2.1', 'ศ 2.2', 'ศ 3.1', 'ศ 3.2'], semester: 2 },
      { courseCode: 'ศ23101', courseName: 'ศิลปะ 5', gradeLevel: 'ม.3', credits: 0.5, totalHours: 20, standards: ['ศ 1.1', 'ศ 1.2', 'ศ 2.1', 'ศ 2.2', 'ศ 3.1', 'ศ 3.2'], semester: 1 },
      { courseCode: 'ศ23102', courseName: 'ศิลปะ 6', gradeLevel: 'ม.3', credits: 0.5, totalHours: 20, standards: ['ศ 1.1', 'ศ 1.2', 'ศ 2.1', 'ศ 2.2', 'ศ 3.1', 'ศ 3.2'], semester: 2 }
    ],
    'การงานอาชีพ': [
      { courseCode: 'ง21101', courseName: 'การงานอาชีพ 1', gradeLevel: 'ม.1', credits: 0.5, totalHours: 20, standards: ['ง 1.1', 'ง 2.1', 'ง 3.1'], semester: 1 },
      { courseCode: 'ง21102', courseName: 'การงานอาชีพ 2', gradeLevel: 'ม.1', credits: 0.5, totalHours: 20, standards: ['ง 1.1', 'ง 2.1', 'ง 3.1'], semester: 2 },
      { courseCode: 'ง22101', courseName: 'การงานอาชีพ 3', gradeLevel: 'ม.2', credits: 0.5, totalHours: 20, standards: ['ง 1.1', 'ง 2.1', 'ง 3.1'], semester: 1 },
      { courseCode: 'ง22102', courseName: 'การงานอาชีพ 4', gradeLevel: 'ม.2', credits: 0.5, totalHours: 20, standards: ['ง 1.1', 'ง 2.1', 'ง 3.1'], semester: 2 },
      { courseCode: 'ง23101', courseName: 'การงานอาชีพ 5', gradeLevel: 'ม.3', credits: 0.5, totalHours: 20, standards: ['ง 1.1', 'ง 2.1', 'ง 3.1'], semester: 1 },
      { courseCode: 'ง23102', courseName: 'การงานอาชีพ 6', gradeLevel: 'ม.3', credits: 0.5, totalHours: 20, standards: ['ง 1.1', 'ง 2.1', 'ง 3.1'], semester: 2 }
    ],
    'ภาษาต่างประเทศ': [
      { courseCode: 'อ21101', courseName: 'ภาษาอังกฤษ 1', gradeLevel: 'ม.1', credits: 1.5, totalHours: 60, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'], semester: 1 },
      { courseCode: 'อ21102', courseName: 'ภาษาอังกฤษ 2', gradeLevel: 'ม.1', credits: 1.5, totalHours: 60, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'], semester: 2 },
      { courseCode: 'อ22101', courseName: 'ภาษาอังกฤษ 3', gradeLevel: 'ม.2', credits: 1.5, totalHours: 60, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'], semester: 1 },
      { courseCode: 'อ22102', courseName: 'ภาษาอังกฤษ 4', gradeLevel: 'ม.2', credits: 1.5, totalHours: 60, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'], semester: 2 },
      { courseCode: 'อ23101', courseName: 'ภาษาอังกฤษ 5', gradeLevel: 'ม.3', credits: 1.5, totalHours: 60, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'], semester: 1 },
      { courseCode: 'อ23102', courseName: 'ภาษาอังกฤษ 6', gradeLevel: 'ม.3', credits: 1.5, totalHours: 60, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'], semester: 2 }
    ]
  },

  // ========================
  // ระดับมัธยมศึกษาตอนปลาย (ม.4-6)
  // ========================
  'มัธยมศึกษาตอนปลาย': {
    'ภาษาไทย': [
      { courseCode: 'ท31101', courseName: 'ภาษาไทย 1', gradeLevel: 'ม.4', credits: 1.0, totalHours: 40, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'], semester: 1 },
      { courseCode: 'ท31102', courseName: 'ภาษาไทย 2', gradeLevel: 'ม.4', credits: 1.0, totalHours: 40, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'], semester: 2 },
      { courseCode: 'ท32101', courseName: 'ภาษาไทย 3', gradeLevel: 'ม.5', credits: 1.0, totalHours: 40, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'], semester: 1 },
      { courseCode: 'ท32102', courseName: 'ภาษาไทย 4', gradeLevel: 'ม.5', credits: 1.0, totalHours: 40, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'], semester: 2 },
      { courseCode: 'ท33101', courseName: 'ภาษาไทย 5', gradeLevel: 'ม.6', credits: 1.0, totalHours: 40, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'], semester: 1 },
      { courseCode: 'ท33102', courseName: 'ภาษาไทย 6', gradeLevel: 'ม.6', credits: 1.0, totalHours: 40, standards: ['ท 1.1', 'ท 2.1', 'ท 3.1', 'ท 4.1', 'ท 5.1'], semester: 2 }
    ],
    'คณิตศาสตร์': [
      { courseCode: 'ค31101', courseName: 'คณิตศาสตร์ 1', gradeLevel: 'ม.4', credits: 1.0, totalHours: 40, standards: ['ค 1.1', 'ค 1.2', 'ค 1.3', 'ค 2.1', 'ค 2.2', 'ค 3.1', 'ค 3.2'], semester: 1 },
      { courseCode: 'ค31102', courseName: 'คณิตศาสตร์ 2', gradeLevel: 'ม.4', credits: 1.0, totalHours: 40, standards: ['ค 1.1', 'ค 1.2', 'ค 1.3', 'ค 2.1', 'ค 2.2', 'ค 3.1', 'ค 3.2'], semester: 2 },
      { courseCode: 'ค32101', courseName: 'คณิตศาสตร์ 3', gradeLevel: 'ม.5', credits: 1.0, totalHours: 40, standards: ['ค 1.1', 'ค 1.2', 'ค 1.3', 'ค 2.1', 'ค 2.2', 'ค 3.1', 'ค 3.2'], semester: 1 },
      { courseCode: 'ค32102', courseName: 'คณิตศาสตร์ 4', gradeLevel: 'ม.5', credits: 1.0, totalHours: 40, standards: ['ค 1.1', 'ค 1.2', 'ค 1.3', 'ค 2.1', 'ค 2.2', 'ค 3.1', 'ค 3.2'], semester: 2 },
      { courseCode: 'ค33101', courseName: 'คณิตศาสตร์ 5', gradeLevel: 'ม.6', credits: 1.0, totalHours: 40, standards: ['ค 1.1', 'ค 1.2', 'ค 1.3', 'ค 2.1', 'ค 2.2', 'ค 3.1', 'ค 3.2'], semester: 1 },
      { courseCode: 'ค33102', courseName: 'คณิตศาสตร์ 6', gradeLevel: 'ม.6', credits: 1.0, totalHours: 40, standards: ['ค 1.1', 'ค 1.2', 'ค 1.3', 'ค 2.1', 'ค 2.2', 'ค 3.1', 'ค 3.2'], semester: 2 }
    ],
    'วิทยาศาสตร์และเทคโนโลยี': [
      { courseCode: 'ว31101', courseName: 'ฟิสิกส์พื้นฐาน', gradeLevel: 'ม.4', credits: 1.5, totalHours: 60, standards: ['ว 2.1', 'ว 2.2', 'ว 2.3'], semester: 1 },
      { courseCode: 'ว31102', courseName: 'เคมีพื้นฐาน', gradeLevel: 'ม.4', credits: 1.5, totalHours: 60, standards: ['ว 2.1', 'ว 2.2', 'ว 2.3'], semester: 2 },
      { courseCode: 'ว31103', courseName: 'ชีววิทยาพื้นฐาน', gradeLevel: 'ม.4', credits: 1.5, totalHours: 60, standards: ['ว 1.1', 'ว 1.2', 'ว 1.3'], semester: 1 },
      { courseCode: 'ว31104', courseName: 'โลก ดาราศาสตร์ และอวกาศ', gradeLevel: 'ม.4', credits: 1.0, totalHours: 40, standards: ['ว 3.1', 'ว 3.2'], semester: 2 }
    ],
    'วิทยาศาสตร์และเทคโนโลยี(งานคอมพิวเตอร์)': [
      { courseCode: 'ว31181', courseName: 'วิทยาการคำนวณ 1', gradeLevel: 'ม.4', credits: 1.0, totalHours: 40, standards: ['ว 4.2'], semester: 1 },
      { courseCode: 'ว31182', courseName: 'การออกแบบและเทคโนโลยี 1', gradeLevel: 'ม.4', credits: 1.0, totalHours: 40, standards: ['ว 4.1'], semester: 2 },
      { courseCode: 'ว32181', courseName: 'วิทยาการคำนวณ 2', gradeLevel: 'ม.5', credits: 1.0, totalHours: 40, standards: ['ว 4.2'], semester: 1 },
      { courseCode: 'ว33181', courseName: 'วิทยาการคำนวณ 3', gradeLevel: 'ม.6', credits: 1.0, totalHours: 40, standards: ['ว 4.2'], semester: 1 }
    ],
    'ภาษาต่างประเทศ': [
      { courseCode: 'อ31101', courseName: 'ภาษาอังกฤษ 1', gradeLevel: 'ม.4', credits: 1.0, totalHours: 40, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'], semester: 1 },
      { courseCode: 'อ31102', courseName: 'ภาษาอังกฤษ 2', gradeLevel: 'ม.4', credits: 1.0, totalHours: 40, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'], semester: 2 },
      { courseCode: 'อ32101', courseName: 'ภาษาอังกฤษ 3', gradeLevel: 'ม.5', credits: 1.0, totalHours: 40, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'], semester: 1 },
      { courseCode: 'อ32102', courseName: 'ภาษาอังกฤษ 4', gradeLevel: 'ม.5', credits: 1.0, totalHours: 40, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'], semester: 2 },
      { courseCode: 'อ33101', courseName: 'ภาษาอังกฤษ 5', gradeLevel: 'ม.6', credits: 1.0, totalHours: 40, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'], semester: 1 },
      { courseCode: 'อ33102', courseName: 'ภาษาอังกฤษ 6', gradeLevel: 'ม.6', credits: 1.0, totalHours: 40, standards: ['ต 1.1', 'ต 1.2', 'ต 1.3', 'ต 2.1', 'ต 2.2', 'ต 3.1', 'ต 4.1', 'ต 4.2'], semester: 2 }
    ]
  }
}

/**
 * ดึงรายวิชาตามระดับการศึกษาและกลุ่มสาระ
 * @param {string} educationLevel - ระดับการศึกษา (ประถมศึกษา, มัธยมศึกษาตอนต้น, มัธยมศึกษาตอนปลาย)
 * @param {string} subjectGroup - กลุ่มสาระ (optional)
 * @returns {Array} - รายวิชาที่ตรงกัน
 */
export function getPresetCourses(educationLevel, subjectGroup = null) {
  const levelCourses = PRESET_COURSES[educationLevel]
  if (!levelCourses) return []
  
  if (subjectGroup) {
    return levelCourses[subjectGroup] || []
  }
  
  // รวมทุกกลุ่มสาระ
  return Object.values(levelCourses).flat()
}

/**
 * ดึงรายชื่อระดับการศึกษาที่มี
 */
export function getEducationLevels() {
  return Object.keys(PRESET_COURSES)
}

/**
 * ดึงกลุ่มสาระตามระดับการศึกษา
 */
export function getSubjectGroupsByLevel(educationLevel) {
  const levelCourses = PRESET_COURSES[educationLevel]
  return levelCourses ? Object.keys(levelCourses) : []
}

// ==========================================
// ส่วนเพิ่มเติม: ข้อมูลหลักสูตรแกนกลางแบบครบถ้วน
// ==========================================

/**
 * สมรรถนะสำคัญของผู้เรียน 5 ประการ
 * อ้างอิง: หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551
 */
export const KEY_COMPETENCIES = [
  {
    code: 'C1',
    name: 'ความสามารถในการสื่อสาร',
    description: 'ความสามารถในการรับและส่งสาร มีวัฒนธรรมในการใช้ภาษาถ่ายทอดความคิด ความรู้ ความเข้าใจ ความรู้สึก และทัศนะของตนเองเพื่อแลกเปลี่ยนข้อมูลข่าวสารและประสบการณ์อันจะเป็นประโยชน์ต่อการพัฒนาตนเองและสังคม รวมทั้งการเจรจาต่อรองเพื่อขจัดและลดปัญหาความขัดแย้งต่างๆ การเลือกรับหรือไม่รับข้อมูลข่าวสารด้วยหลักเหตุผลและความถูกต้อง ตลอดจนการเลือกใช้วิธีการสื่อสารที่มีประสิทธิภาพโดยคำนึงถึงผลกระทบที่มีต่อตนเองและสังคม'
  },
  {
    code: 'C2',
    name: 'ความสามารถในการคิด',
    description: 'ความสามารถในการคิดวิเคราะห์ การคิดสังเคราะห์ การคิดอย่างสร้างสรรค์ การคิดอย่างมีวิจารณญาณ และการคิดเป็นระบบ เพื่อนำไปสู่การสร้างองค์ความรู้หรือสารสนเทศเพื่อการตัดสินใจเกี่ยวกับตนเองและสังคมได้อย่างเหมาะสม'
  },
  {
    code: 'C3',
    name: 'ความสามารถในการแก้ปัญหา',
    description: 'ความสามารถในการแก้ปัญหาและอุปสรรคต่างๆ ที่เผชิญได้อย่างถูกต้องเหมาะสมบนพื้นฐานของหลักเหตุผล คุณธรรม และข้อมูลสารสนเทศ เข้าใจความสัมพันธ์และการเปลี่ยนแปลงของเหตุการณ์ต่างๆ ในสังคม แสวงหาความรู้ ประยุกต์ความรู้มาใช้ในการป้องกันและแก้ไขปัญหา และมีการตัดสินใจที่มีประสิทธิภาพโดยคำนึงถึงผลกระทบที่เกิดขึ้นต่อตนเอง สังคม และสิ่งแวดล้อม'
  },
  {
    code: 'C4',
    name: 'ความสามารถในการใช้ทักษะชีวิต',
    description: 'ความสามารถในการนำกระบวนการต่างๆ ไปใช้ในการดำเนินชีวิตประจำวัน การเรียนรู้ด้วยตนเอง การเรียนรู้อย่างต่อเนื่อง การทำงาน และการอยู่ร่วมกันในสังคมด้วยการสร้างเสริมความสัมพันธ์อันดีระหว่างบุคคล การจัดการปัญหาและความขัดแย้งต่างๆ อย่างเหมาะสม การปรับตัวให้ทันกับการเปลี่ยนแปลงของสังคมและสภาพแวดล้อม และการรู้จักหลีกเลี่ยงพฤติกรรมไม่พึงประสงค์ที่ส่งผลกระทบต่อตนเองและผู้อื่น'
  },
  {
    code: 'C5',
    name: 'ความสามารถในการใช้เทคโนโลยี',
    description: 'ความสามารถในการเลือก และใช้เทคโนโลยีด้านต่างๆ และมีทักษะกระบวนการทางเทคโนโลยี เพื่อการพัฒนาตนเองและสังคม ในด้านการเรียนรู้ การสื่อสาร การทำงาน การแก้ปัญหาอย่างสร้างสรรค์ ถูกต้อง เหมาะสม และมีคุณธรรม'
  }
]

/**
 * คุณลักษณะอันพึงประสงค์ 8 ประการ
 * อ้างอิง: หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551
 */
export const DESIRED_CHARACTERISTICS = {
  patriotism: { 
    code: 'D1', 
    name: 'รักชาติ ศาสน์ กษัตริย์', 
    icon: '🇹🇭',
    description: 'มีความรักและภูมิใจในชาติ ศาสนา และพระมหากษัตริย์' 
  },
  honesty: { 
    code: 'D2', 
    name: 'ซื่อสัตย์สุจริต', 
    icon: '💎',
    description: 'ประพฤติตรงตามความเป็นจริงต่อตนเองและผู้อื่นทั้งทางกาย วาจา ใจ' 
  },
  discipline: { 
    code: 'D3', 
    name: 'มีวินัย', 
    icon: '⏰',
    description: 'ปฏิบัติตามข้อตกลง กฎเกณฑ์ ระเบียบ ข้อบังคับของครอบครัว โรงเรียน และสังคม' 
  },
  curiosity: { 
    code: 'D4', 
    name: 'ใฝ่เรียนรู้', 
    icon: '📚',
    description: 'มีความตั้งใจ เพียรพยายามในการเรียน แสวงหาความรู้จากแหล่งเรียนรู้ต่างๆ' 
  },
  sufficiency: { 
    code: 'D5', 
    name: 'อยู่อย่างพอเพียง', 
    icon: '🌱',
    description: 'ดำรงชีวิตอย่างพอประมาณ มีเหตุผล รอบคอบ มีคุณธรรม' 
  },
  dedication: { 
    code: 'D6', 
    name: 'มุ่งมั่นในการทำงาน', 
    icon: '💪',
    description: 'ตั้งใจและรับผิดชอบในการปฏิบัติหน้าที่การงาน' 
  },
  thaiIdentity: { 
    code: 'D7', 
    name: 'รักความเป็นไทย', 
    icon: '🎭',
    description: 'มีความภูมิใจ เห็นคุณค่า ร่วมอนุรักษ์ สืบทอดภูมิปัญญาไทย' 
  },
  publicMind: { 
    code: 'D8', 
    name: 'มีจิตสาธารณะ', 
    icon: '🤝',
    description: 'มีส่วนร่วมในกิจกรรมที่เป็นประโยชน์ต่อโรงเรียน ชุมชน สังคม' 
  }
}

/**
 * ประเภทรายวิชา
 */
export const COURSE_TYPES = {
  BASIC: 'basic',        // รายวิชาพื้นฐาน - ใช้ตามหลักสูตรแกนกลางอย่างเคร่งครัด
  ELECTIVE: 'elective'   // รายวิชาเพิ่มเติม - ครูกำหนดเอง
}

/**
 * ตัวชี้วัดตามมาตรฐานและระดับชั้น
 * อ้างอิง: กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี (ฉบับปรับปรุง พ.ศ. 2560)
 * สาระที่ 4 เทคโนโลยี
 */
export const INDICATORS = {
  // ===================================
  // มาตรฐาน ว 4.1 การออกแบบและเทคโนโลยี
  // ===================================
  'ว 4.1': {
    'ม.1': [
      { code: 'ว 4.1 ม.1/1', type: 'during', description: 'อธิบายแนวคิดหลักของเทคโนโลยีในชีวิตประจำวันและวิเคราะห์สาเหตุหรือปัจจัยที่ส่งผลต่อการเปลี่ยนแปลงของเทคโนโลยี' },
      { code: 'ว 4.1 ม.1/2', type: 'during', description: 'ระบุปัญหาหรือความต้องการในชีวิตประจำวัน รวบรวม วิเคราะห์ข้อมูลและแนวคิดที่เกี่ยวข้องกับปัญหา' },
      { code: 'ว 4.1 ม.1/3', type: 'during', description: 'ออกแบบวิธีการแก้ปัญหาโดยวิเคราะห์ เปรียบเทียบ และตัดสินใจเลือกข้อมูลที่จำเป็น นำเสนอแนวทางการแก้ปัญหาให้ผู้อื่นเข้าใจ วางแผนและดำเนินการแก้ปัญหา' },
      { code: 'ว 4.1 ม.1/4', type: 'during', description: 'ทดสอบ ประเมินผล และระบุข้อบกพร่องที่เกิดขึ้น พร้อมทั้งหาแนวทางการปรับปรุงแก้ไขและนำเสนอผลการแก้ปัญหา' },
      { code: 'ว 4.1 ม.1/5', type: 'final', description: 'ใช้ความรู้และทักษะเกี่ยวกับวัสดุ อุปกรณ์ เครื่องมือ กลไก ไฟฟ้า หรืออิเล็กทรอนิกส์ เพื่อแก้ปัญหาได้อย่างถูกต้อง เหมาะสม และปลอดภัย' }
    ],
    'ม.2': [
      { code: 'ว 4.1 ม.2/1', type: 'final', description: 'คาดการณ์แนวโน้มเทคโนโลยีที่จะเกิดขึ้นโดยพิจารณาจากสาเหตุหรือปัจจัยที่ส่งผลต่อการเปลี่ยนแปลงของเทคโนโลยี และวิเคราะห์ เปรียบเทียบตัดสินใจเลือกใช้เทคโนโลยีโดยคำนึงถึงผลกระทบที่เกิดขึ้นต่อชีวิต สังคม และสิ่งแวดล้อม' },
      { code: 'ว 4.1 ม.2/2', type: 'during', description: 'ระบุปัญหาหรือความต้องการในชุมชนหรือท้องถิ่น สรุปกรอบของปัญหา รวบรวม วิเคราะห์ข้อมูลและแนวคิดที่เกี่ยวข้องกับปัญหา' },
      { code: 'ว 4.1 ม.2/3', type: 'during', description: 'ออกแบบวิธีการแก้ปัญหา โดยวิเคราะห์เปรียบเทียบ และตัดสินใจเลือกข้อมูลที่จำเป็นภายใต้เงื่อนไขและทรัพยากรที่มีอยู่ นำเสนอแนวทางการแก้ปัญหาให้ผู้อื่นเข้าใจ วางแผนขั้นตอนการทำงานและดำเนินการแก้ปัญหาอย่างเป็นขั้นตอน' },
      { code: 'ว 4.1 ม.2/4', type: 'during', description: 'ทดสอบ ประเมินผล และอธิบายปัญหาหรือข้อบกพร่องที่เกิดขึ้น ภายใต้กรอบเงื่อนไข พร้อมทั้งหาแนวทางการปรับปรุงแก้ไขและนำเสนอผลการแก้ปัญหา' },
      { code: 'ว 4.1 ม.2/5', type: 'during', description: 'ใช้ความรู้ และทักษะเกี่ยวกับวัสดุ อุปกรณ์ เครื่องมือ กลไก ไฟฟ้า และอิเล็กทรอนิกส์ เพื่อแก้ปัญหาหรือพัฒนางานได้อย่างถูกต้อง เหมาะสม และปลอดภัย' }
    ],
    'ม.3': [
      { code: 'ว 4.1 ม.3/1', type: 'during', description: 'วิเคราะห์สาเหตุ หรือปัจจัยที่ส่งผลต่อการเปลี่ยนแปลงของเทคโนโลยี และความสัมพันธ์ของเทคโนโลยีกับศาสตร์อื่น โดยเฉพาะวิทยาศาสตร์ หรือคณิตศาสตร์ เพื่อเป็นแนวทางการแก้ปัญหาหรือพัฒนางาน' },
      { code: 'ว 4.1 ม.3/2', type: 'during', description: 'ระบุปัญหาหรือความต้องการของชุมชนหรือท้องถิ่น เพื่อพัฒนางานอาชีพ สรุปกรอบของปัญหา รวบรวม วิเคราะห์ข้อมูลและแนวคิดที่เกี่ยวข้องกับปัญหา โดยคำนึงถึงความถูกต้องด้านทรัพย์สินทางปัญญา' },
      { code: 'ว 4.1 ม.3/3', type: 'during', description: 'ออกแบบวิธีการแก้ปัญหา โดยวิเคราะห์ เปรียบเทียบ และตัดสินใจเลือกข้อมูลที่จำเป็นภายใต้เงื่อนไขและทรัพยากรที่มีอยู่ นำเสนอแนวทางการแก้ปัญหาให้ผู้อื่นเข้าใจด้วยเทคนิคหรือวิธีการที่หลากหลาย วางแผนขั้นตอนการทำงานและดำเนินการแก้ปัญหาอย่างเป็นขั้นตอน' },
      { code: 'ว 4.1 ม.3/4', type: 'during', description: 'ทดสอบ ประเมินผล วิเคราะห์ และให้เหตุผลของปัญหาหรือข้อบกพร่องที่เกิดขึ้นภายใต้กรอบเงื่อนไข พร้อมทั้งหาแนวทางการปรับปรุงแก้ไข และนำเสนอผลการแก้ปัญหา' },
      { code: 'ว 4.1 ม.3/5', type: 'final', description: 'ใช้ความรู้ และทักษะเกี่ยวกับวัสดุ อุปกรณ์ เครื่องมือ กลไก ไฟฟ้าและอิเล็กทรอนิกส์ให้ถูกต้องกับลักษณะของงาน และปลอดภัย เพื่อแก้ปัญหาหรือพัฒนางาน' }
    ],
    'ม.4': [
      { code: 'ว 4.1 ม.4/1', type: 'final', description: 'วิเคราะห์แนวคิดหลักของเทคโนโลยี ความสัมพันธ์กับศาสตร์อื่น โดยเฉพาะวิทยาศาสตร์ หรือคณิตศาสตร์ รวมทั้งประเมินผลกระทบที่จะเกิดขึ้นต่อมนุษย์ สังคม เศรษฐกิจ และสิ่งแวดล้อม เพื่อเป็นแนวทางในการพัฒนาเทคโนโลยี' },
      { code: 'ว 4.1 ม.4/2', type: 'during', description: 'ระบุปัญหาหรือความต้องการที่มีผลกระทบต่อสังคม รวบรวม วิเคราะห์ข้อมูลและแนวคิดที่เกี่ยวข้องกับปัญหาที่มีความซับซ้อน เพื่อสังเคราะห์วิธีการ เทคนิคในการแก้ปัญหา โดยคำนึงถึงความถูกต้องด้านทรัพย์สินทางปัญญา' },
      { code: 'ว 4.1 ม.4/3', type: 'during', description: 'ออกแบบวิธีการแก้ปัญหา โดยวิเคราะห์ เปรียบเทียบ และตัดสินใจเลือกข้อมูลที่จำเป็นภายใต้เงื่อนไขและทรัพยากรที่มีอยู่ นำเสนอแนวทางการแก้ปัญหาให้ผู้อื่นเข้าใจด้วยเทคนิคหรือวิธีการที่หลากหลาย โดยใช้ซอฟต์แวร์ช่วยในการออกแบบ วางแผนขั้นตอนการทำงานและดำเนินการแก้ปัญหา' },
      { code: 'ว 4.1 ม.4/4', type: 'during', description: 'ทดสอบ ประเมินผล วิเคราะห์ และให้เหตุผลของปัญหาหรือข้อบกพร่องที่เกิดขึ้นภายใต้กรอบเงื่อนไข หาแนวทางการปรับปรุงแก้ไขและนำเสนอผลการแก้ปัญหาพร้อมทั้งเสนอแนวทางการพัฒนาต่อยอด' },
      { code: 'ว 4.1 ม.4/5', type: 'during', description: 'ใช้ความรู้และทักษะเกี่ยวกับวัสดุ อุปกรณ์ เครื่องมือ กลไก ไฟฟ้าและอิเล็กทรอนิกส์ และเทคโนโลยีที่ซับซ้อนในการแก้ปัญหาหรือพัฒนางานได้อย่างถูกต้อง เหมาะสมและปลอดภัย' }
    ],
    'ม.5': [
      { code: 'ว 4.1 ม.5/1', type: 'final', description: 'ประยุกต์ใช้ความรู้และทักษะจากศาสตร์ต่าง ๆ รวมทั้งทรัพยากรในการทำโครงงานเพื่อแก้ปัญหาหรือพัฒนางาน' }
    ]
  },

  // ===================================
  // มาตรฐาน ว 4.2 วิทยาการคำนวณ
  // ===================================
  'ว 4.2': {
    'ป.1': [
      { code: 'ว 4.2 ป.1/1', type: 'final', description: 'แก้ปัญหาอย่างง่ายโดยใช้การลองผิดลองถูก การเปรียบเทียบ' },
      { code: 'ว 4.2 ป.1/2', type: 'final', description: 'แสดงลำดับขั้นตอนการทำงานหรือการแก้ปัญหาอย่างง่ายโดยใช้ภาพ สัญลักษณ์ หรือข้อความ' },
      { code: 'ว 4.2 ป.1/3', type: 'during', description: 'เขียนโปรแกรมอย่างง่าย โดยใช้ซอฟต์แวร์หรือสื่อ' },
      { code: 'ว 4.2 ป.1/4', type: 'during', description: 'ใช้เทคโนโลยีในการสร้าง จัดเก็บ เรียกใช้ข้อมูลตามวัตถุประสงค์' },
      { code: 'ว 4.2 ป.1/5', type: 'during', description: 'ใช้เทคโนโลยีสารสนเทศอย่างปลอดภัย ปฏิบัติตามข้อตกลงในการใช้คอมพิวเตอร์ร่วมกัน ดูแลรักษาอุปกรณ์เบื้องต้น ใช้งานอย่างเหมาะสม' }
    ],
    'ป.2': [
      { code: 'ว 4.2 ป.2/1', type: 'final', description: 'แสดงลำดับขั้นตอนการทำงานหรือการแก้ปัญหาอย่างง่ายโดยใช้ภาพ สัญลักษณ์ หรือข้อความ' },
      { code: 'ว 4.2 ป.2/2', type: 'during', description: 'เขียนโปรแกรมอย่างง่าย โดยใช้ซอฟต์แวร์หรือสื่อ และตรวจหาข้อผิดพลาดของโปรแกรม' },
      { code: 'ว 4.2 ป.2/3', type: 'during', description: 'ใช้เทคโนโลยีในการสร้าง จัดหมวดหมู่ ค้นหา จัดเก็บ เรียกใช้ข้อมูลตามวัตถุประสงค์' },
      { code: 'ว 4.2 ป.2/4', type: 'during', description: 'ใช้เทคโนโลยีสารสนเทศอย่างปลอดภัย ปฏิบัติตามข้อตกลงในการใช้คอมพิวเตอร์ร่วมกัน ดูแลรักษาอุปกรณ์เบื้องต้น ใช้งานอย่างเหมาะสม' }
    ],
    'ป.3': [
      { code: 'ว 4.2 ป.3/1', type: 'final', description: 'แสดงอัลกอริทึมในการทำงานหรือการแก้ปัญหาอย่างง่าย โดยใช้ภาพ สัญลักษณ์ หรือข้อความ' },
      { code: 'ว 4.2 ป.3/2', type: 'during', description: 'เขียนโปรแกรมอย่างง่าย โดยใช้ซอฟต์แวร์หรือสื่อ และตรวจหาข้อผิดพลาดของโปรแกรม' },
      { code: 'ว 4.2 ป.3/3', type: 'during', description: 'ใช้อินเทอร์เน็ตค้นหาความรู้' },
      { code: 'ว 4.2 ป.3/4', type: 'during', description: 'รวบรวม ประมวลผล และนำเสนอข้อมูล โดยใช้ซอฟต์แวร์ตามวัตถุประสงค์' },
      { code: 'ว 4.2 ป.3/5', type: 'during', description: 'ใช้เทคโนโลยีสารสนเทศอย่างปลอดภัย ปฏิบัติตามข้อตกลงในการใช้อินเทอร์เน็ต' }
    ],
    'ป.4': [
      { code: 'ว 4.2 ป.4/1', type: 'final', description: 'ใช้เหตุผลเชิงตรรกะในการแก้ปัญหา การอธิบายการทำงาน การคาดการณ์ผลลัพธ์ จากปัญหาอย่างง่าย' },
      { code: 'ว 4.2 ป.4/2', type: 'during', description: 'ออกแบบ และเขียนโปรแกรมอย่างง่าย โดยใช้ซอฟต์แวร์หรือสื่อ และตรวจหาข้อผิดพลาดและแก้ไข' },
      { code: 'ว 4.2 ป.4/3', type: 'during', description: 'ใช้อินเทอร์เน็ตค้นหาความรู้ และประเมินความน่าเชื่อถือของข้อมูล' },
      { code: 'ว 4.2 ป.4/4', type: 'during', description: 'รวบรวม ประเมิน นำเสนอข้อมูลและสารสนเทศ โดยใช้ซอฟต์แวร์ที่หลากหลาย เพื่อแก้ปัญหาในชีวิตประจำวัน' },
      { code: 'ว 4.2 ป.4/5', type: 'during', description: 'ใช้เทคโนโลยีสารสนเทศอย่างปลอดภัย เข้าใจสิทธิและหน้าที่ของตน เคารพในสิทธิของผู้อื่น แจ้งผู้เกี่ยวข้องเมื่อพบข้อมูลหรือบุคคลที่ไม่เหมาะสม' }
    ],
    'ป.5': [
      { code: 'ว 4.2 ป.5/1', type: 'final', description: 'ใช้เหตุผลเชิงตรรกะในการแก้ปัญหา การอธิบายการทำงาน การคาดการณ์ผลลัพธ์ จากปัญหาอย่างง่าย' },
      { code: 'ว 4.2 ป.5/2', type: 'during', description: 'ออกแบบและเขียนโปรแกรมที่มีการใช้เหตุผลเชิงตรรกะอย่างง่าย ตรวจหาข้อผิดพลาดและแก้ไข' },
      { code: 'ว 4.2 ป.5/3', type: 'during', description: 'ใช้อินเทอร์เน็ตค้นหาข้อมูล ติดต่อสื่อสารและทำงานร่วมกัน ประเมินความน่าเชื่อถือของข้อมูล' },
      { code: 'ว 4.2 ป.5/4', type: 'during', description: 'รวบรวม ประเมิน นำเสนอข้อมูลและสารสนเทศตามวัตถุประสงค์โดยใช้ซอฟต์แวร์หรือบริการบนอินเทอร์เน็ตที่หลากหลาย เพื่อแก้ปัญหาในชีวิตประจำวัน' },
      { code: 'ว 4.2 ป.5/5', type: 'during', description: 'ใช้เทคโนโลยีสารสนเทศอย่างปลอดภัย มีมารยาท เข้าใจสิทธิและหน้าที่ของตน เคารพในสิทธิของผู้อื่น แจ้งผู้เกี่ยวข้องเมื่อพบข้อมูลหรือบุคคลที่ไม่เหมาะสม' }
    ],
    'ป.6': [
      { code: 'ว 4.2 ป.6/1', type: 'final', description: 'ใช้เหตุผลเชิงตรรกะในการอธิบายและออกแบบวิธีการแก้ปัญหาที่พบในชีวิตประจำวัน' },
      { code: 'ว 4.2 ป.6/2', type: 'during', description: 'ออกแบบและเขียนโปรแกรมอย่างง่าย เพื่อใช้แก้ปัญหาในชีวิตประจำวัน ตรวจหาข้อผิดพลาดของโปรแกรมและแก้ไข' },
      { code: 'ว 4.2 ป.6/3', type: 'during', description: 'ใช้อินเทอร์เน็ตในการค้นหาข้อมูลอย่างมีประสิทธิภาพ' },
      { code: 'ว 4.2 ป.6/4', type: 'during', description: 'ใช้เทคโนโลยีสารสนเทศทำงานร่วมกันอย่างปลอดภัย เข้าใจสิทธิและหน้าที่ของตน เคารพในสิทธิของผู้อื่น แจ้งผู้เกี่ยวข้องเมื่อพบข้อมูลหรือบุคคลที่ไม่เหมาะสม' }
    ],
    'ม.1': [
      { code: 'ว 4.2 ม.1/1', type: 'final', description: 'ออกแบบอัลกอริทึมที่ใช้ในแนวคิดเชิงนามธรรมเพื่อแก้ปัญหาหรืออธิบายการทำงานที่พบในชีวิตจริง' },
      { code: 'ว 4.2 ม.1/2', type: 'during', description: 'ออกแบบและเขียนโปรแกรมอย่างง่าย เพื่อใช้แก้ปัญหาทางคณิตศาสตร์หรือวิทยาศาสตร์' },
      { code: 'ว 4.2 ม.1/3', type: 'during', description: 'รวบรวมข้อมูลปฐมภูมิ ประมวลผล ประเมินผล นำเสนอข้อมูลและสารสนเทศตามวัตถุประสงค์ โดยใช้ซอฟต์แวร์หรือบริการบนอินเทอร์เน็ตที่หลากหลาย' },
      { code: 'ว 4.2 ม.1/4', type: 'during', description: 'ใช้เทคโนโลยีสารสนเทศอย่างปลอดภัย ใช้สื่อและแหล่งข้อมูลตามข้อกำหนดและข้อตกลง' }
    ],
    'ม.2': [
      { code: 'ว 4.2 ม.2/1', type: 'final', description: 'ออกแบบอัลกอริทึมที่ใช้ในแนวคิดเชิงคำนวณในการแก้ปัญหาหรือการทำงานที่พบในชีวิตจริง' },
      { code: 'ว 4.2 ม.2/2', type: 'during', description: 'ออกแบบและเขียนโปรแกรมที่ใช้ตรรกะและฟังก์ชันในการแก้ปัญหา' },
      { code: 'ว 4.2 ม.2/3', type: 'during', description: 'อภิปรายองค์ประกอบและหลักการทำงานของระบบคอมพิวเตอร์และเทคโนโลยีการสื่อสาร เพื่อประยุกต์ใช้งานหรือแก้ปัญหาเบื้องต้น' },
      { code: 'ว 4.2 ม.2/4', type: 'during', description: 'ใช้เทคโนโลยีสารสนเทศอย่างปลอดภัย มีความรับผิดชอบ สร้างและแสดงสิทธิในการเผยแพร่ผลงาน' }
    ],
    'ม.3': [
      { code: 'ว 4.2 ม.3/1', type: 'during', description: 'พัฒนาแอปพลิเคชันที่มีการบูรณาการกับวิชาอื่นอย่างสร้างสรรค์' },
      { code: 'ว 4.2 ม.3/2', type: 'during', description: 'รวบรวมข้อมูล ประมวลผล ประเมินผล นำเสนอข้อมูลและสารสนเทศตามวัตถุประสงค์ โดยใช้ซอฟต์แวร์หรือบริการบนอินเทอร์เน็ตที่หลากหลาย' },
      { code: 'ว 4.2 ม.3/3', type: 'during', description: 'ประเมินความน่าเชื่อถือของข้อมูล วิเคราะห์สื่อและผลกระทบจากการให้ข่าวสารที่ผิด เพื่อการใช้งานอย่างรู้เท่าทัน' },
      { code: 'ว 4.2 ม.3/4', type: 'final', description: 'ใช้เทคโนโลยีสารสนเทศอย่างปลอดภัย และมีความรับผิดชอบต่อสังคม ปฏิบัติตามกฎหมายเกี่ยวกับคอมพิวเตอร์ ใช้ลิขสิทธิ์ของผู้อื่นโดยชอบธรรม' }
    ],
    'ม.4': [
      { code: 'ว 4.2 ม.4/1', type: 'during', description: 'ประยุกต์ใช้แนวคิดเชิงคำนวณในการพัฒนาโครงงานที่มีการบูรณาการกับวิชาอื่นอย่างสร้างสรรค์และเชื่อมโยงกับชีวิตจริง' }
    ],
    'ม.5': [
      { code: 'ว 4.2 ม.5/1', type: 'final', description: 'รวบรวม วิเคราะห์ข้อมูล และใช้ความรู้ด้านวิทยาการคอมพิวเตอร์ สื่อดิจิทัล เทคโนโลยีสารสนเทศในการแก้ปัญหาหรือเพิ่มมูลค่าให้กับบริการหรือผลิตภัณฑ์ที่ใช้ในชีวิตจริงอย่างสร้างสรรค์' }
    ],
    'ม.6': [
      { code: 'ว 4.2 ม.6/1', type: 'during', description: 'ใช้เทคโนโลยีสารสนเทศในการนำเสนอและแบ่งปันข้อมูลอย่างปลอดภัย มีจริยธรรม และวิเคราะห์การเปลี่ยนแปลงเทคโนโลยีสารสนเทศที่มีผลต่อการดำเนินชีวิต อาชีพ สังคม และวัฒนธรรม' }
    ]
  }
}

/**
 * ดึงตัวชี้วัดตามมาตรฐานและระดับชั้น
 * @param {string} standardCode - รหัสมาตรฐาน เช่น 'ว 4.2'
 * @param {string} gradeLevel - ระดับชั้น เช่น 'ม.4', 'ป.1'
 * @returns {Array} รายการตัวชี้วัด
 */
export function getIndicators(standardCode, gradeLevel) {
  const standardIndicators = INDICATORS[standardCode]
  if (!standardIndicators) return []
  return standardIndicators[gradeLevel] || []
}

/**
 * ดึงเฉพาะตัวชี้วัดระหว่างทาง
 */
export function getDuringIndicators(standardCode, gradeLevel) {
  return getIndicators(standardCode, gradeLevel).filter(i => i.type === 'during')
}

/**
 * ดึงเฉพาะตัวชี้วัดปลายทาง
 */
export function getFinalIndicators(standardCode, gradeLevel) {
  return getIndicators(standardCode, gradeLevel).filter(i => i.type === 'final')
}

/**
 * ดึงข้อมูลรายวิชาพื้นฐานแบบครบถ้วน
 */
export function getBasicCourseFullData(courseCode) {
  // ค้นหาจาก PRESET_COURSES
  for (const level of Object.keys(PRESET_COURSES)) {
    for (const group of Object.keys(PRESET_COURSES[level])) {
      const course = PRESET_COURSES[level][group].find(c => c.courseCode === courseCode)
      if (course) {
        // เพิ่มข้อมูลเต็ม
        const indicators = []
        for (const std of (course.standards || [])) {
          const stdIndicators = getIndicators(std, course.gradeLevel)
          indicators.push(...stdIndicators)
        }
        
        return {
          ...course,
          courseType: COURSE_TYPES.BASIC,
          educationLevel: level,
          subjectGroup: group,
          keyCompetencies: KEY_COMPETENCIES,
          desiredCharacteristics: DESIRED_CHARACTERISTICS,
          indicators,
          // ข้อมูลสำหรับสร้างโครงสร้างรายวิชา/แผนการสอน
          curriculumGuidelines: {
            mustFollowIndicators: true,  // ต้องใช้ตัวชี้วัดตามหลักสูตร
            mustUseStandards: true,      // ต้องใช้มาตรฐานตามหลักสูตร
            flexibleContent: false,       // เนื้อหาไม่ยืดหยุ่น
            flexibleActivities: true      // กิจกรรมยืดหยุ่นได้
          }
        }
      }
    }
  }
  return null
}

/**
 * สร้างข้อมูลรายวิชาเพิ่มเติม (ครูกำหนดเอง)
 */
export function createElectiveCourseData(courseData) {
  return {
    ...courseData,
    courseType: COURSE_TYPES.ELECTIVE,
    keyCompetencies: KEY_COMPETENCIES,
    desiredCharacteristics: DESIRED_CHARACTERISTICS,
    curriculumGuidelines: {
      mustFollowIndicators: false,  // ไม่บังคับใช้ตัวชี้วัด
      mustUseStandards: false,      // ไม่บังคับใช้มาตรฐาน
      flexibleContent: true,        // เนื้อหายืดหยุ่น
      flexibleActivities: true      // กิจกรรมยืดหยุ่น
    }
  }
}

/**
 * ตรวจสอบว่ารายวิชาเป็นพื้นฐานหรือเพิ่มเติม จากรหัสวิชา
 * กฎ: รหัสวิชาลงท้ายด้วย 01-99 = พื้นฐาน, 201-299 = เพิ่มเติม
 */
export function detectCourseType(courseCode) {
  const match = courseCode.match(/\d+$/)
  if (!match) return COURSE_TYPES.ELECTIVE
  
  const lastNumber = parseInt(match[0])
  // รหัสวิชา 101, 102, 103, 104 = พื้นฐาน
  // รหัสวิชา 201, 202, 203 = เพิ่มเติม (แต่วิทยาการคำนวณ 201 เป็นพื้นฐานในระดับประถม)
  if (lastNumber >= 101 && lastNumber <= 199) return COURSE_TYPES.BASIC
  if (lastNumber >= 201 && lastNumber <= 299) {
    // ตรวจสอบกรณีพิเศษ: วิทยาการคำนวณประถม (ว11201-ว16201) เป็นพื้นฐาน
    if (courseCode.match(/^ว[1][1-6]201$/)) return COURSE_TYPES.BASIC
    return COURSE_TYPES.ELECTIVE
  }
  return COURSE_TYPES.ELECTIVE
}

export default {
  SUBJECT_GROUPS,
  CURRICULUM_STANDARDS,
  PRESET_COURSES,
  KEY_COMPETENCIES,
  DESIRED_CHARACTERISTICS,
  COURSE_TYPES,
  INDICATORS,
  getStandardsBySubjectGroup,
  getDefaultStandard,
  getStandardOptions,
  findStandardByCode,
  getPresetCourses,
  getEducationLevels,
  getSubjectGroupsByLevel,
  getIndicators,
  getBasicCourseFullData,
  createElectiveCourseData,
  detectCourseType
}
