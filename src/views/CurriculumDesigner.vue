<template>
  <ErrorBoundary context="CurriculumDesigner">
  <div class="curriculum-designer">
    <!-- Top Navigation -->
    <nav class="top-navbar">
      <div class="nav-brand">
        <router-link to="/teacher" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <span class="brand-icon">🎯</span>
        <span class="brand-text">AI Curriculum Designer</span>
      </div>
      <div class="nav-actions">
        <span class="arce-badge">
          <span class="material-icons">auto_awesome</span>
          A.R.C.E. Strategy
        </span>
      </div>
    </nav>

    <div class="page-content">
      <!-- Step Indicator -->
      <div class="steps-container">
        <div 
          v-for="(s, idx) in steps" 
          :key="idx"
          :class="['step-item', { active: currentStep === idx, completed: currentStep > idx }]"
          @click="goToStep(idx)"
        >
          <div class="step-number">
            <span v-if="currentStep > idx" class="material-icons">check</span>
            <span v-else>{{ idx + 1 }}</span>
          </div>
          <div class="step-info">
            <span class="step-title">{{ s.title }}</span>
            <span class="step-desc">{{ s.desc }}</span>
          </div>
        </div>
      </div>

      <!-- Step 0: Select Course -->
      <div v-if="currentStep === 0" class="step-content">
        <div class="step-header">
          <h2>📚 เลือกรายวิชา</h2>
          <p>เลือกรายวิชาที่ต้องการสร้างหลักสูตร AI จะวิเคราะห์คำอธิบายรายวิชาและ Learning Outcomes ทั้งหมด</p>
        </div>

        <div class="course-selection">
          <div class="form-group">
            <label>รายวิชา <span class="required">*</span></label>
            <select v-model="selectedCourseId" class="form-control" @change="onCourseSelect">
              <option value="">-- เลือกรายวิชา --</option>
              <option v-for="course in courses" :key="course.id" :value="course.id">
                {{ course.courseCode }} - {{ course.courseName }}
              </option>
            </select>
          </div>

          <!-- Loading Curriculum -->
          <div v-if="loadingCurriculum" class="loading-curriculum">
            <div class="spinner"></div>
            <span>กำลังโหลด Curriculum...</span>
          </div>

          <!-- Existing Curriculum Notice -->
          <div v-else-if="hasExistingCurriculum && selectedCourse" class="existing-curriculum-notice">
            <div class="notice-content">
              <span class="material-icons">history</span>
              <div class="notice-text">
                <strong>พบ Curriculum ที่สร้างไว้แล้ว</strong>
                <p>ขั้นตอนปัจจุบัน: {{ steps[currentStep]?.title || 'เริ่มต้น' }} | หน่วย: {{ units.length }} หน่วย</p>
              </div>
            </div>
            <div class="notice-actions">
              <button class="btn btn-outline-primary" @click="currentStep = Math.max(1, currentStep)">
                <span class="material-icons">play_arrow</span>
                ทำต่อ
              </button>
              <button class="btn btn-outline-danger" @click="resetCurriculum">
                <span class="material-icons">refresh</span>
                เริ่มใหม่
              </button>
            </div>
          </div>

          <!-- Course Preview -->
          <div v-if="selectedCourse" class="course-preview card">
            <div class="preview-header">
              <h3>{{ selectedCourse.courseCode }} {{ selectedCourse.courseName }}</h3>
              <span class="grade-badge">{{ selectedCourse.gradeLevel || 'ม.4' }}</span>
            </div>
            
            <!-- คำอธิบายรายวิชา - สำคัญมากสำหรับการสร้างหลักสูตรคุณภาพ -->
            <div class="preview-section">
              <h4>📝 คำอธิบายรายวิชา <span class="required">*</span></h4>
              
              <!-- Warning ถ้าไม่มีหรือสั้นเกินไป -->
              <div v-if="!getCourseDescription || getCourseDescription.length < 50" class="description-warning">
                <span class="material-icons">warning</span>
                <span>คำอธิบายรายวิชาสำคัญมากสำหรับการสร้างหลักสูตรคุณภาพ กรุณาระบุรายละเอียดให้ครบถ้วน</span>
              </div>
              
              <!-- ถ้ายังไม่แก้ไข -->
              <div v-if="!editingDescription">
                <p v-if="getCourseDescription" class="description">{{ getCourseDescription }}</p>
                <p v-else class="description empty-text">ยังไม่มีคำอธิบายรายวิชา</p>
                <button class="btn btn-outline btn-sm" @click="startEditDescription">
                  <span class="material-icons">edit</span>
                  {{ getCourseDescription ? 'แก้ไขคำอธิบาย' : 'เพิ่มคำอธิบาย' }}
                </button>
              </div>
              
              <!-- ฟอร์มแก้ไขคำอธิบาย -->
              <div v-else class="description-edit-form">
                <textarea 
                  v-model="editedDescription" 
                  class="form-control description-textarea"
                  placeholder="อธิบายรายละเอียดของรายวิชา เช่น\n- เนื้อหาหลักที่จะเรียน\n- ทักษะที่นักเรียนจะได้รับ\n- ความสัมพันธ์กับวิชาอื่น\n- การนำไปใช้ในชีวิตจริง"
                  rows="5"
                ></textarea>
                <div class="char-counter" :class="{ 'warning': editedDescription.length < 50, 'good': editedDescription.length >= 100 }">
                  {{ editedDescription.length }} ตัวอักษร (แนะนำ 100+ ตัวอักษร)
                </div>
                <div class="edit-actions">
                  <button class="btn btn-primary" @click="saveDescription" :disabled="!editedDescription.trim()">
                    <span class="material-icons">save</span> บันทึก
                  </button>
                  <button class="btn btn-outline" @click="cancelEditDescription">ยกเลิก</button>
                </div>
              </div>
            </div>

            <div class="preview-section">
              <h4>🎯 Learning Outcomes ({{ selectedCourse.learningOutcomes?.length || 0 }})</h4>
              <div v-if="selectedCourse.learningOutcomes?.length" class="lo-list">
                <div v-for="lo in selectedCourse.learningOutcomes" :key="lo.code" class="lo-item">
                  <span class="lo-code">{{ lo.code }}</span>
                  <span class="lo-desc">{{ lo.description }}</span>
                </div>
              </div>
              <p v-else class="empty-text">ยังไม่มี Learning Outcomes</p>
            </div>

            <div class="preview-section">
              <h4>⚙️ ข้อมูลเพิ่มเติม</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">กลุ่มสาระ:</span>
                  <span class="value">{{ selectedCourse.subjectGroup || 'ไม่ระบุ' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">หน่วยกิต:</span>
                  <span v-if="selectedCourse.credits" class="value">{{ selectedCourse.credits }} น.ก.</span>
                  <span v-else class="value not-set">ยังไม่กำหนด</span>
                </div>
                <div class="info-item">
                  <span class="label">เวลาเรียน:</span>
                  <span v-if="selectedCourse.totalHours" class="value">{{ selectedCourse.totalHours }} ชม./ภาคเรียน</span>
                  <span v-else class="value not-set">ยังไม่กำหนด</span>
                </div>
              </div>
              
              <!-- ปุ่มกำหนดหน่วยกิต/ชั่วโมง ถ้ายังไม่มี -->
              <div v-if="!selectedCourse.credits || !selectedCourse.totalHours" class="set-credits-section">
                <p class="hint-text">💡 กรุณากำหนดหน่วยกิตและเวลาเรียนเพื่อให้ AI คำนวณจำนวนหน่วยและแผนได้แม่นยำ</p>
                <div class="credits-form">
                  <div class="form-group-inline">
                    <label>หน่วยกิต:</label>
                    <select v-model="tempCredits" class="form-control-sm">
                      <option value="">เลือก</option>
                      <option value="0.5">0.5 น.ก.</option>
                      <option value="1.0">1.0 น.ก.</option>
                      <option value="1.5">1.5 น.ก.</option>
                      <option value="2.0">2.0 น.ก.</option>
                      <option value="2.5">2.5 น.ก.</option>
                      <option value="3.0">3.0 น.ก.</option>
                    </select>
                  </div>
                  <div class="form-group-inline">
                    <label>ชั่วโมง:</label>
                    <select v-model="tempTotalHours" class="form-control-sm">
                      <option value="">เลือก</option>
                      <option value="20">20 ชม.</option>
                      <option value="40">40 ชม.</option>
                      <option value="60">60 ชม.</option>
                      <option value="80">80 ชม.</option>
                      <option value="120">120 ชม.</option>
                    </select>
                  </div>
                  <button class="btn btn-sm btn-primary" @click="saveCreditsAndHours" :disabled="!tempCredits && !tempTotalHours">
                    <span class="material-icons">save</span>
                    บันทึก
                  </button>
                </div>
              </div>
            </div>
            
            <!-- คำแนะนำจำนวนหน่วยการเรียนรู้ -->
            <div class="preview-section units-recommendation">
              <h4>📊 การแนะนำจำนวนหน่วย</h4>
              <div class="recommendation-info">
                <div class="recommendation-item">
                  <span class="rec-label">จำนวนคาบรวม:</span>
                  <span class="rec-value">{{ totalPeriods }} คาบ</span>
                </div>
                <div class="recommendation-item">
                  <span class="rec-label">หน่วยการเรียนรู้แนะนำ:</span>
                  <span class="rec-value highlight">{{ recommendedUnits.min }}-{{ recommendedUnits.max }} หน่วย</span>
                </div>
                <div class="recommendation-item">
                  <span class="rec-label">แผนต่อหน่วย:</span>
                  <span class="rec-value">4-8 แผน (สูงสุดที่ AI สร้างได้คุณภาพ)</span>
                </div>
              </div>
              <p class="recommendation-note">
                💡 <strong>เคล็ดลับ:</strong> หน่วยการเรียนรู้ที่มี 4-8 แผน จะทำให้ AI สร้างเนื้อหาได้ครบถ้วนและมีคุณภาพ
                ถ้าหน่วยใหญ่เกินไป (>10 แผน) AI จะสร้างไม่ครบและต้องเติมชื่อแผนอัตโนมัติ
              </p>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button 
            class="btn btn-primary btn-lg"
            :disabled="!selectedCourse || !selectedCourse.learningOutcomes?.length"
            @click="nextStep"
          >
            ถัดไป: สร้างโครงสร้างรายวิชา
            <span class="material-icons">arrow_forward</span>
          </button>
        </div>
      </div>

      <!-- Step 1: Course Structure -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="step-header">
          <h2>🏗️ โครงสร้างรายวิชา</h2>
          <p>AI จะวิเคราะห์และสร้างโครงสร้างรายวิชาที่สอดคล้องกับ A.R.C.E. Framework</p>
        </div>

        <!-- Settings -->
        <div class="settings-card card">
          <h3>⚙️ ตั้งค่าการสร้าง</h3>
          <div class="settings-grid">
            <div class="form-group">
              <label>ภาคเรียน</label>
              <select v-model="settings.semester" class="form-control">
                <option :value="1">ภาคเรียนที่ 1</option>
                <option :value="2">ภาคเรียนที่ 2</option>
              </select>
            </div>
            <div class="form-group">
              <label>ปีการศึกษา</label>
              <select v-model="settings.academicYear" class="form-control">
                <option v-for="year in academicYears" :key="year" :value="year">{{ year }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>จำนวนหน่วยกิต</label>
              <select v-model="settings.credits" class="form-control" @change="onCreditsChange">
                <option :value="0.5">0.5 หน่วยกิต (20 ชม.)</option>
                <option :value="1">1.0 หน่วยกิต (40 ชม.)</option>
                <option :value="1.5">1.5 หน่วยกิต (60 ชม.)</option>
                <option :value="2">2.0 หน่วยกิต (80 ชม.)</option>
              </select>
            </div>
            <div class="form-group">
              <label>จำนวนชั่วโมงรวม</label>
              <div class="auto-value">
                <span class="value-display">{{ settings.totalHours }} ชั่วโมง</span>
                <span class="auto-badge">คำนวณจากหน่วยกิต</span>
              </div>
            </div>
            <div class="form-group">
              <label>คาบเรียน/สัปดาห์</label>
              <div class="auto-value">
                <span class="value-display">{{ settings.periodsPerWeek }} คาบ/สัปดาห์</span>
                <span class="auto-badge">คำนวณจากหน่วยกิต</span>
              </div>
            </div>
            <div class="form-group">
              <label>สัดส่วน HOTS Assessment</label>
              <select v-model="settings.hotsRatio" class="form-control">
                <option value="30">30% (เริ่มต้น)</option>
                <option value="40">40% (ปานกลาง)</option>
                <option value="50">50% (เข้มข้น)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Generate Button -->
        <div v-if="!courseStructure && !generatingStructure" class="generate-section">
          <button class="btn btn-ai btn-xl" @click="generateCourseStructure">
            <span class="material-icons">auto_awesome</span>
            สร้างโครงสร้างรายวิชาด้วย AI
          </button>
          <p class="hint">AI จะวิเคราะห์ LO ทั้ง {{ selectedCourse?.learningOutcomes?.length || 0 }} ตัว และออกแบบโครงสร้างที่เหมาะสม</p>
        </div>

        <!-- Generating -->
        <div v-if="generatingStructure" class="generating-state card">
          <div class="generating-animation">
            <span class="ai-icon">🤖</span>
            <div class="pulse-ring"></div>
          </div>
          <h3>AI กำลังวิเคราะห์และออกแบบโครงสร้างรายวิชา...</h3>
          <p>{{ generatingText }}</p>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: generatingProgress + '%' }"></div>
          </div>
        </div>

        <!-- Structure Result -->
        <div v-if="courseStructure" class="structure-result">
          <div class="result-header">
            <h3>✅ โครงสร้างรายวิชา</h3>
            <button class="btn btn-outline btn-sm" @click="regenerateStructure">
              <span class="material-icons">refresh</span>
              สร้างใหม่
            </button>
          </div>

          <!-- Overview -->
          <div class="structure-overview card">
            <h4>📊 ภาพรวม</h4>
            <div class="overview-grid">
              <div class="overview-item">
                <span class="overview-value">{{ courseStructure.totalUnits }}</span>
                <span class="overview-label">หน่วยการเรียนรู้</span>
              </div>
              <div class="overview-item">
                <span class="overview-value">{{ courseStructure.totalPlans }}</span>
                <span class="overview-label">แผนการจัดการเรียนรู้</span>
              </div>
              <div class="overview-item">
                <span class="overview-value">{{ settings.totalHours }}</span>
                <span class="overview-label">ชั่วโมงรวม</span>
              </div>
              <div class="overview-item">
                <span class="overview-value">{{ settings.hotsRatio }}%</span>
                <span class="overview-label">HOTS Assessment</span>
              </div>
            </div>
          </div>

          <!-- Standards & Indicators -->
          <div class="structure-section card">
            <div class="section-header-with-action">
              <h4>📋 มาตรฐานและตัวชี้วัด</h4>
              <button v-if="!hasSelectedStandards" class="btn-define-standards" @click="goToCourseSettings">
                <span class="material-icons">edit</span>
                กำหนดมาตรฐาน
              </button>
            </div>
            
            <!-- Warning if no standards selected but have in database -->
            <div v-if="!hasSelectedStandards && hasStandardsInDatabase" class="standards-warning">
              <span class="material-icons">info</span>
              <div class="warning-content">
                <strong>📚 มาตรฐานที่มีในฐานข้อมูลสำหรับกลุ่มสาระนี้</strong>
                <div class="available-standards-list">
                  <div v-for="std in availableStandards" :key="std.code" class="available-standard">
                    <span class="std-code">{{ std.code }}</span>
                    <span class="std-name">{{ std.name }}</span>
                  </div>
                </div>
                <p class="mt-2">กรุณาเลือกมาตรฐานในการตั้งค่ารายวิชาเพื่อใช้ข้อมูลอย่างเป็นทางการ</p>
                <button class="btn-go-settings" @click="goToCourseSettings">
                  <span class="material-icons">settings</span>
                  ไปเลือกมาตรฐานในการตั้งค่ารายวิชา
                </button>
              </div>
            </div>
            
            <!-- Warning if no standards in database -->
            <div v-else-if="!hasSelectedStandards && !hasStandardsInDatabase" class="standards-warning">
              <span class="material-icons">warning</span>
              <div class="warning-content">
                <strong>⚠️ ยังไม่มีข้อมูลมาตรฐานสำหรับกลุ่มสาระนี้ในฐานข้อมูล</strong>
                <p>กรุณากำหนดมาตรฐานและตัวชี้วัดด้วยตนเองในการตั้งค่ารายวิชา</p>
                <button class="btn-go-settings" @click="goToCourseSettings">
                  <span class="material-icons">settings</span>
                  ไปกำหนดมาตรฐานในการตั้งค่ารายวิชา
                </button>
              </div>
            </div>
            
            <!-- Show selected standards from course -->
            <div v-else class="standards-list">
              <div v-for="std in getStandardsWithDetails()" :key="std.code" class="standard-item">
                <div class="std-header">
                  <span class="std-code">{{ std.code }}</span>
                  <span class="std-desc">{{ std.name || std.description }}</span>
                </div>
                <div v-if="std.indicators?.length" class="indicators">
                  <span v-for="ind in std.indicators" :key="ind.code || ind" class="indicator-tag">
                    {{ ind.code || ind }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- ARCE Strategy -->
          <div class="structure-section card">
            <h4>🎯 กลยุทธ์ A.R.C.E.</h4>
            <div class="arce-strategy">
              <div v-for="arce in courseStructure.arceStrategy" :key="arce.dimension" class="arce-item">
                <div class="arce-header">
                  <span class="arce-icon">{{ arce.icon }}</span>
                  <span class="arce-name">{{ arce.name }}</span>
                  <span class="arce-weight">{{ arce.weight }}%</span>
                </div>
                <p class="arce-focus">{{ arce.focusAreas }}</p>
                
                <!-- Sample Questions -->
                <div v-if="arce.sampleQuestions?.length" class="arce-details">
                  <div class="arce-detail-section">
                    <span class="detail-label">❓ ตัวอย่างคำถาม:</span>
                    <ul class="detail-list">
                      <li v-for="(q, qIdx) in arce.sampleQuestions.slice(0, 2)" :key="qIdx">{{ q }}</li>
                    </ul>
                  </div>
                </div>
                
                <!-- Activities -->
                <div v-if="arce.activities?.length" class="arce-details">
                  <div class="arce-detail-section">
                    <span class="detail-label">📝 กิจกรรม:</span>
                    <ul class="detail-list">
                      <li v-for="(act, aIdx) in arce.activities.slice(0, 2)" :key="aIdx">{{ act }}</li>
                    </ul>
                  </div>
                </div>
                
                <!-- Units Emphasis -->
                <div v-if="arce.unitsEmphasis?.length" class="arce-units-emphasis">
                  <span class="detail-label">📦 หน่วยที่เน้น:</span>
                  <span v-for="(u, uIdx) in arce.unitsEmphasis" :key="uIdx" class="unit-emphasis-tag">{{ u }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Units Preview -->
          <div class="structure-section card">
            <h4>📚 หน่วยการเรียนรู้ (Preview)</h4>
            <div class="units-preview">
              <div v-for="(unit, idx) in courseStructure.unitsPreview" :key="idx" class="unit-preview-item">
                <div class="unit-number">{{ idx + 1 }}</div>
                <div class="unit-info">
                  <span class="unit-name">{{ unit.name }}</span>
                  <span class="unit-meta">{{ unit.periods || unit.hours }} คาบ | {{ unit.plans }} แผน | LO: {{ unit.los.join(', ') }}</span>
                  
                  <!-- Unit ARCE Focus (sorted A R C E) -->
                  <div v-if="unit.arceFocus?.length" class="unit-arce-focus">
                    <span v-for="arce in sortArce(unit.arceFocus)" :key="arce" :class="['arce-tag', arce]">
                      {{ arceLabels[arce] || arce }}
                    </span>
                  </div>
                  
                  <!-- Plans Preview with ARCE -->
                  <div v-if="unit.plansPreview?.length" class="plans-mini-preview">
                    <div v-for="(plan, pIdx) in unit.plansPreview.slice(0, 3)" :key="pIdx" class="plan-mini">
                      <span class="plan-mini-num">{{ pIdx + 1 }}</span>
                      <span class="plan-mini-topic">{{ plan.topic }}</span>
                      <span v-if="plan.arceFocus" :class="['arce-mini-tag', plan.arceFocus]">
                        {{ arceShortLabels[plan.arceFocus] }}
                      </span>
                    </div>
                    <div v-if="unit.plansPreview.length > 3" class="plans-more">
                      +{{ unit.plansPreview.length - 3 }} แผน
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Save Button -->
          <div class="save-section">
            <button class="btn btn-success btn-lg" @click="saveCourseStructure">
              <span class="material-icons">save</span>
              บันทึกโครงสร้างและไปขั้นตอนถัดไป
            </button>
          </div>
        </div>

        <div class="step-actions">
          <button class="btn btn-outline" @click="prevStep">
            <span class="material-icons">arrow_back</span>
            ย้อนกลับ
          </button>
        </div>
      </div>

      <!-- Step 2: Learning Units -->
      <div v-if="currentStep === 2" class="step-content">
        <div class="step-header">
          <h2>📦 หน่วยการเรียนรู้</h2>
          <p>สร้างรายละเอียดหน่วยการเรียนรู้แต่ละหน่วย พร้อมการจัดสรร LO และเวลา</p>
        </div>

        <!-- Units List -->
        <div class="units-container">
          <div v-for="(unit, idx) in units" :key="unit.id" class="unit-card card">
            <div class="unit-header">
              <div class="unit-title">
                <span class="unit-badge">หน่วยที่ {{ idx + 1 }}</span>
                <!-- Editable Unit Name -->
                <input 
                  v-model="unit.name" 
                  class="unit-name-input"
                  placeholder="ชื่อหน่วยการเรียนรู้"
                />
              </div>
              <div class="unit-actions">
                <button 
                  v-if="!unit.generated"
                  class="btn btn-ai btn-sm" 
                  @click="generateUnit(idx)"
                  :disabled="generatingUnitIndex !== null"
                >
                  <span class="material-icons">auto_awesome</span>
                  สร้างรายละเอียด
                </button>
                <button 
                  v-else
                  class="btn btn-outline btn-sm" 
                  @click="regenerateUnit(idx)"
                  :disabled="generatingUnitIndex !== null"
                >
                  <span class="material-icons">refresh</span>
                  สร้างใหม่
                </button>
                <button 
                  class="btn btn-danger btn-sm" 
                  @click="deleteUnit(idx)"
                  :disabled="units.length <= 1"
                  title="ลบหน่วย"
                >
                  <span class="material-icons">delete</span>
                </button>
              </div>
            </div>

            <!-- Editable Basic Info -->
            <div class="unit-edit-row">
              <div class="edit-field">
                <label>จำนวนแผน (1 แผน = 50 นาที)</label>
                <input type="number" v-model.number="unit.periods" min="1" max="20" class="form-control small" @change="onPeriodsChange(idx)" />
              </div>
              <div class="edit-field wide">
                <label>LO ที่เกี่ยวข้อง</label>
                <div class="lo-selector">
                  <label v-for="lo in availableLOs" :key="lo.code" class="lo-checkbox">
                    <input type="checkbox" :value="lo.code" v-model="unit.los" />
                    <span>{{ lo.code }}</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Generating -->
            <div v-if="generatingUnitIndex === idx" class="unit-generating">
              <div class="spinner"></div>
              <span>AI กำลังสร้างรายละเอียดหน่วยที่ {{ idx + 1 }}...</span>
            </div>

            <!-- Unit Details (Generated) -->
            <div v-else-if="unit.generated" class="unit-details">
              <div class="unit-description">
                <h4>สาระสำคัญ</h4>
                <textarea v-model="unit.essentialContent" class="form-control" rows="2" placeholder="สาระสำคัญของหน่วย"></textarea>
              </div>

              <!-- Unit ARCE Distribution - แสดงเด่นชัด -->
              <div v-if="unit.arce || unit.arceDistribution || unit.arceFocus?.length" class="unit-arce-section">
                <h4>
                  <span class="arce-icon">🎯</span>
                  A.R.C.E. ของหน่วยนี้
                </h4>
                
                <!-- แสดง arceFocus badges ถ้ามี (sorted A R C E) -->
                <div v-if="unit.arceFocus?.length" class="arce-focus-badges">
                  <span v-for="focus in sortArce(unit.arceFocus)" :key="focus" class="arce-focus-tag" :class="focus">
                    <span class="arce-letter">{{ arceShortLabels[focus] }}</span>
                    <span class="arce-name">{{ arceLabels[focus] }}</span>
                  </span>
                </div>

                <!-- แสดงรายละเอียด arceDistribution (sorted A R C E) -->
                <div v-if="unit.arceDistribution || unit.arce" class="arce-distribution-grid">
                  <template v-for="key in arceOrder" :key="key">
                    <div v-if="(unit.arceDistribution || unit.arce)?.[key]" class="arce-distribution-item" :class="key">
                      <div class="arce-item-header">
                        <span class="arce-item-icon" :class="key">{{ arceShortLabels[key] }}</span>
                        <span class="arce-item-label">{{ arceLabels[key] }}</span>
                      </div>
                      <p class="arce-item-desc">{{ (unit.arceDistribution || unit.arce)[key] }}</p>
                    </div>
                  </template>
                </div>

                <!-- ถ้าไม่มีข้อมูลละเอียด แสดงข้อความแนะนำ -->
                <div v-if="!unit.arceDistribution && !unit.arce && unit.arceFocus?.length" class="arce-hint">
                  <p>หน่วยนี้เน้นทักษะ HOTS ด้าน: {{ sortArce(unit.arceFocus).map(f => arceLabels[f]).join(', ') }}</p>
                </div>
              </div>

              <!-- ถ้าไม่มี ARCE เลย แสดง placeholder -->
              <div v-else class="unit-arce-placeholder">
                <div class="arce-placeholder-content">
                  <span class="arce-placeholder-icon">🎯</span>
                  <span class="arce-placeholder-text">A.R.C.E. Strategy</span>
                  <p>กด "สร้างรายละเอียด" เพื่อให้ AI ออกแบบกลยุทธ์ A.R.C.E. สำหรับหน่วยนี้</p>
                </div>
              </div>

              <div class="unit-plans-preview">
                <h4>แผนการจัดการเรียนรู้ ({{ unit.plans?.length || 0 }} แผน)</h4>
                <div class="plans-list editable">
                  <div v-for="(plan, pIdx) in unit.plans" :key="pIdx" class="plan-preview-item editable">
                    <span class="plan-number">{{ pIdx + 1 }}</span>
                    <input v-model="plan.topic" class="plan-topic-input" placeholder="หัวข้อแผน" />
                    <input type="number" v-model.number="plan.periods" class="plan-duration-input" min="1" max="6" />
                    <span class="duration-label">คาบ</span>
                    
                    <!-- Plan ARCE Focus -->
                    <span v-if="plan.arceFocus" :class="['arce-mini-badge', plan.arceFocus]" :title="'เน้น: ' + (arceLabels[plan.arceFocus] || plan.arceFocus)">
                      {{ arceShortLabels[plan.arceFocus] || plan.arceFocus }}
                    </span>
                    
                    <button class="btn-icon" @click="removePlan(idx, pIdx)" title="ลบแผน">
                      <span class="material-icons">close</span>
                    </button>
                  </div>
                  <button class="btn btn-outline btn-sm add-plan-btn" @click="addPlanToUnit(idx)">
                    <span class="material-icons">add</span>
                    เพิ่มแผน
                  </button>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else class="unit-empty">
              <p>กดปุ่ม "สร้างรายละเอียด" เพื่อให้ AI ออกแบบหน่วยการเรียนรู้นี้ หรือแก้ไขข้อมูลด้านบนก่อน</p>
            </div>
          </div>

          <!-- Add Unit Button -->
          <button class="btn btn-outline add-unit-btn" @click="addUnit">
            <span class="material-icons">add</span>
            เพิ่มหน่วยการเรียนรู้
          </button>
        </div>

        <div class="step-actions">
          <button class="btn btn-outline" @click="prevStep">
            <span class="material-icons">arrow_back</span>
            ย้อนกลับ
          </button>
          <button 
            class="btn btn-primary btn-lg"
            :disabled="!allUnitsGenerated"
            @click="nextStep"
          >
            ถัดไป: สร้างแผนการจัดการเรียนรู้
            <span class="material-icons">arrow_forward</span>
          </button>
        </div>
      </div>

      <!-- Step 3: Lesson Plans -->
      <div v-if="currentStep === 3" class="step-content">
        <div class="step-header">
          <h2>📝 แผนการจัดการเรียนรู้</h2>
          <p>สร้างแผนการจัดการเรียนรู้แต่ละแผนด้วย 5E Model และ A.R.C.E. Assessment</p>
        </div>

        <!-- Units Tabs -->
        <div class="units-tabs">
          <button 
            v-for="(unit, idx) in units"
            :key="unit.id"
            :class="['tab-btn', { active: selectedUnitIndex === idx }]"
            @click="selectedUnitIndex = idx"
          >
            หน่วยที่ {{ idx + 1 }}
            <span class="plan-count">{{ unit.plans?.length || 0 }} แผน</span>
          </button>
        </div>

        <!-- Plans List -->
        <div v-if="selectedUnit" class="plans-container">
          <div v-for="(plan, pIdx) in selectedUnit.plans" :key="pIdx" class="plan-card card">
            <div class="plan-header">
              <div class="plan-title">
                <span class="plan-badge">แผนที่ {{ pIdx + 1 }}</span>
                <h3>{{ plan.topic }}</h3>
              </div>
              <div class="plan-status" :class="plan.status">
                {{ plan.status === 'generated' ? '✅ สร้างแล้ว' : plan.status === 'generating' ? '⏳ กำลังสร้าง' : '📝 รอสร้าง' }}
              </div>
            </div>

            <div class="plan-meta">
              <span><span class="material-icons">schedule</span> 1 คาบ (50 นาที)</span>
              <span><span class="material-icons">flag</span> {{ plan.los?.join(', ') }}</span>
              
              <!-- Plan ARCE Focus -->
              <span v-if="plan.arceFocus" :class="['arce-focus-badge', plan.arceFocus]">
                <span class="material-icons">psychology</span>
                {{ arceLabels[plan.arceFocus] || plan.arceFocus }}
              </span>
            </div>
            
            <!-- Plan ARCE Preview (แสดงกิจกรรม A.R.C.E. แบบย่อ) -->
            <div v-if="plan.arce" class="plan-arce-preview">
              <div v-for="(desc, key) in plan.arce" :key="key" class="arce-preview-item" :class="key">
                <span class="arce-key">{{ arceShortLabels[key] }}</span>
                <span class="arce-desc-short">{{ desc.substring(0, 50) }}{{ desc.length > 50 ? '...' : '' }}</span>
              </div>
            </div>

            <div class="plan-actions">
              <button 
                v-if="plan.status !== 'generated'"
                class="btn btn-ai"
                @click="generateLessonPlan(selectedUnitIndex, pIdx)"
                :disabled="plan.status === 'generating'"
              >
                <span class="material-icons">auto_awesome</span>
                สร้างแผนการสอน
              </button>
              <button 
                v-else
                class="btn btn-primary"
                @click="viewLessonPlan(plan.id)"
              >
                <span class="material-icons">visibility</span>
                ดูแผนการสอน
              </button>
              <button 
                class="btn btn-outline" 
                @click="togglePlanSettings(selectedUnitIndex, pIdx)"
                :class="{ active: editingPlanIndex === `${selectedUnitIndex}-${pIdx}` }"
              >
                <span class="material-icons">settings</span>
              </button>
              <button 
                class="btn btn-danger btn-sm" 
                @click="deletePlanFromUnit(selectedUnitIndex, pIdx)"
                title="ลบแผน"
              >
                <span class="material-icons">delete</span>
              </button>
            </div>

            <!-- Plan Settings Dropdown -->
            <div v-if="editingPlanIndex === `${selectedUnitIndex}-${pIdx}`" class="plan-settings-panel">
              <div class="settings-row">
                <div class="setting-field">
                  <label>หัวข้อ</label>
                  <input v-model="plan.topic" class="form-control" placeholder="หัวข้อแผน" />
                </div>
                <div class="setting-field small">
                  <label>จำนวนคาบ</label>
                  <input type="number" v-model.number="plan.periods" class="form-control" min="1" max="6" />
                </div>
              </div>
              <div class="settings-row">
                <div class="setting-field">
                  <label>LO ที่เกี่ยวข้อง</label>
                  <div class="lo-selector">
                    <label v-for="lo in selectedUnit.los" :key="lo" class="lo-checkbox">
                      <input type="checkbox" :value="lo" v-model="plan.los" />
                      <span>{{ lo }}</span>
                    </label>
                  </div>
                </div>
              </div>
              <div class="arce-note">
                <span class="material-icons">info</span>
                <span>A.R.C.E. ครบ 4 ด้านทุกแผน - AI จะเลือก focus ตามบริบทเนื้อหาอัตโนมัติ</span>
              </div>
              <button class="btn btn-sm btn-primary" @click="editingPlanIndex = null">
                <span class="material-icons">check</span>
                เสร็จสิ้น
              </button>
            </div>
          </div>

          <!-- Add Plan -->
          <button class="btn btn-outline add-plan-btn" @click="addPlanToUnit(selectedUnitIndex)">
            <span class="material-icons">add</span>
            เพิ่มแผนการจัดการเรียนรู้
          </button>
        </div>

        <!-- Batch Generate -->
        <div class="batch-actions card">
          <h4>⚡ สร้างแบบรวดเร็ว</h4>
          <p>สร้างแผนการจัดการเรียนรู้ทั้งหมดในหน่วยนี้พร้อมกัน</p>
          <button 
            class="btn btn-ai btn-lg"
            @click="generateAllPlansInUnit(selectedUnitIndex)"
            :disabled="generatingAllPlans"
          >
            <span class="material-icons">bolt</span>
            สร้างทุกแผนในหน่วยนี้
          </button>
        </div>

        <div class="step-actions">
          <button class="btn btn-outline" @click="prevStep">
            <span class="material-icons">arrow_back</span>
            ย้อนกลับ
          </button>
          <button class="btn btn-primary btn-lg" @click="nextStep">
            <span class="material-icons">arrow_forward</span>
            ต่อไป: สื่อการเรียนรู้
          </button>
        </div>
      </div>

      <!-- Step 4: Learning Materials (Worksheets & Knowledge Sheets) -->
      <div v-if="currentStep === 4" class="step-content">
        <div class="step-header">
          <h2>📚 สื่อการเรียนรู้</h2>
          <p class="subtitle">สร้างใบความรู้และใบงานสำหรับนักเรียน</p>
        </div>

        <div class="materials-intro card">
          <div class="intro-icon">
            <span class="material-icons">auto_awesome</span>
          </div>
          <div class="intro-content">
            <h3>พร้อมสร้างสื่อการเรียนรู้</h3>
            <p>คุณได้ออกแบบโครงสร้างหลักสูตรครบถ้วนแล้ว ตอนนี้สามารถสร้างสื่อการเรียนรู้เพิ่มเติมได้:</p>
            <ul class="materials-list">
              <li><span class="material-icons">library_books</span> <strong>ใบความรู้:</strong> สรุปเนื้อหา Concept Map และ Big Ideas</li>
              <li><span class="material-icons">assignment</span> <strong>ใบงาน:</strong> กิจกรรมฝึกทักษะ HOTS พร้อมประเมิน A.R.C.E.</li>
            </ul>
          </div>
        </div>

        <div class="summary-section">
          <h3>📊 สรุปโครงสร้างที่ออกแบบ</h3>
          
          <div class="summary-stats">
            <div class="stat-card">
              <span class="stat-value">{{ units.length }}</span>
              <span class="stat-label">หน่วยการเรียนรู้</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ totalPlansCount }}</span>
              <span class="stat-label">แผนการสอน</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ settings.totalHours || 40 }}</span>
              <span class="stat-label">ชั่วโมงรวม</span>
            </div>
          </div>

          <div class="units-summary">
            <div v-for="(unit, idx) in units" :key="idx" class="unit-summary-item">
              <div class="unit-summary-header">
                <span class="unit-number">หน่วยที่ {{ idx + 1 }}</span>
                <span class="unit-name">{{ unit.name }}</span>
                <span class="plan-count-badge">{{ unit.plans?.length || 0 }} แผน</span>
              </div>
              <div class="unit-plans-list">
                <div v-for="(plan, pIdx) in unit.plans" :key="pIdx" class="plan-mini-item">
                  <span class="plan-number">{{ pIdx + 1 }}.</span>
                  <span class="plan-topic">{{ plan.topic }}</span>
                  <span v-if="plan.arceFocus" class="arce-badge">{{ plan.arceFocus }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="materials-actions card">
          <h3>🎯 สร้างสื่อการเรียนรู้</h3>
          <p class="materials-desc">เลือกสร้างสื่อการเรียนรู้ที่ต้องการ หรือไปจัดการที่หน้าแผนการสอนภายหลัง</p>
          
          <div class="action-buttons">
            <button class="btn btn-primary btn-lg" @click="goToLessonPlans">
              <span class="material-icons">school</span>
              ไปหน้าแผนการสอน
              <small>สร้างใบความรู้/ใบงานทีหลัง</small>
            </button>
            <button class="btn btn-outline btn-lg" @click="goToTeacherWorksheets">
              <span class="material-icons">assignment</span>
              จัดการใบงาน
            </button>
          </div>
        </div>

        <div class="step-actions">
          <button class="btn btn-outline" @click="prevStep">
            <span class="material-icons">arrow_back</span>
            ย้อนกลับ
          </button>
          <button class="btn btn-success btn-lg" @click="finishCurriculum">
            <span class="material-icons">check_circle</span>
            เสร็จสิ้นการออกแบบ
          </button>
        </div>
      </div>
    </div>
  </div>
  </ErrorBoundary>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { db } from '@/firebase/config'
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { getStandardsBySubjectGroup, getIndicators, CURRICULUM_STANDARDS } from '@/constants/curriculumStandards'

const router = useRouter()
const authStore = useAuthStore()

// State
const courses = ref([])
const selectedCourseId = ref('')
const selectedCourse = ref(null)
const currentStep = ref(0)
const hasExistingCurriculum = ref(false) // มี curriculum เดิมหรือไม่
const loadingCurriculum = ref(false) // กำลังโหลด curriculum
const savingProgress = ref(false) // กำลังบันทึก

// Description editing
const editingDescription = ref(false)
const editedDescription = ref('')

// Credits/Hours editing
const tempCredits = ref('')
const tempTotalHours = ref('')

// Computed: Get courseDescription (handle both 'description' and 'courseDescription' fields)
const getCourseDescription = computed(() => {
  if (!selectedCourse.value) return ''
  return selectedCourse.value.courseDescription || selectedCourse.value.description || ''
})

// ARCE Labels
const arceLabels = {
  analysis: 'A-วิเคราะห์',
  reasoning: 'R-เหตุผล',
  creativity: 'C-สร้างสรรค์',
  evidence: 'E-หลักฐาน'
}

const arceShortLabels = {
  analysis: 'A',
  reasoning: 'R',
  creativity: 'C',
  evidence: 'E'
}

// ARCE Order (A R C E)
const arceOrder = ['analysis', 'reasoning', 'creativity', 'evidence']

// Helper function to sort ARCE array
const sortArce = (arceArray) => {
  if (!arceArray || !Array.isArray(arceArray)) return []
  return arceOrder.filter(a => arceArray.includes(a))
}

// Settings
const currentYear = new Date().getFullYear() + 543
const academicYears = [currentYear, currentYear - 1, currentYear + 1]
const settings = ref({
  semester: 2,
  academicYear: currentYear,
  credits: 1,
  totalHours: 40,
  periodsPerWeek: 2,
  hotsRatio: '40'
})

// Auto-update hours and periods per week when credits change
function onCreditsChange() {
  const creditHoursMap = { 0.5: 20, 1: 40, 1.5: 60, 2: 80 }
  // คำนวณชั่วโมงรวม
  settings.value.totalHours = creditHoursMap[settings.value.credits] || 40
  
  // คำนวณคาบเรียน/สัปดาห์ (20 สัปดาห์/ภาคเรียน)
  // 0.5 หน่วยกิต = 20 ชม. = 1 คาบ/สัปดาห์
  // 1.0 หน่วยกิต = 40 ชม. = 2 คาบ/สัปดาห์
  // 1.5 หน่วยกิต = 60 ชม. = 3 คาบ/สัปดาห์
  // 2.0 หน่วยกิต = 80 ชม. = 4 คาบ/สัปดาห์
  const creditPeriodsMap = { 0.5: 1, 1: 2, 1.5: 3, 2: 4 }
  settings.value.periodsPerWeek = creditPeriodsMap[settings.value.credits] || 2
}

// Helper function to get hours from credits
function getHoursFromCredits(credits) {
  const creditHoursMap = { 0.5: 20, 1: 40, 1.5: 60, 2: 80 }
  return creditHoursMap[credits] || 40
}

// Course Structure
const courseStructure = ref(null)
const generatingStructure = ref(false)
const generatingText = ref('')
const generatingProgress = ref(0)

// Units
const units = ref([])
const generatingUnitIndex = ref(null)

// Plans
const selectedUnitIndex = ref(0)
const generatingAllPlans = ref(false)
const editingPlanIndex = ref(null) // Format: "unitIdx-planIdx"

const steps = [
  { title: 'เลือกรายวิชา', desc: 'เลือกวิชาและตรวจสอบ LO' },
  { title: 'โครงสร้างรายวิชา', desc: 'AI วิเคราะห์และออกแบบ' },
  { title: 'หน่วยการเรียนรู้', desc: 'สร้างรายละเอียดแต่ละหน่วย' },
  { title: 'แผนการจัดการเรียนรู้', desc: 'สร้างแผนการสอน 5E + ARCE' },
  { title: 'สื่อการเรียนรู้', desc: 'ใบความรู้และใบงาน' }
]

const selectedUnit = computed(() => units.value[selectedUnitIndex.value])

const allUnitsGenerated = computed(() => {
  return units.value.length > 0 && units.value.every(u => u.generated)
})

// คำนวณจำนวนแผนรวมทั้งหมด
const totalPlansCount = computed(() => {
  return units.value.reduce((sum, unit) => sum + (unit.plans?.length || 0), 0)
})

// ดึงมาตรฐานจากฐานข้อมูลตาม subjectGroup ของรายวิชา
const availableStandards = computed(() => {
  if (!selectedCourse.value?.subjectGroup) return []
  return getStandardsBySubjectGroup(selectedCourse.value.subjectGroup)
})

// ดึงตัวชี้วัดตามมาตรฐานที่เลือกและระดับชั้น
const availableIndicators = computed(() => {
  if (!selectedCourse.value?.selectedStandards?.length || !selectedCourse.value?.gradeLevel) return []
  
  const indicators = []
  for (const stdCode of selectedCourse.value.selectedStandards) {
    const stdIndicators = getIndicators(stdCode, selectedCourse.value.gradeLevel)
    indicators.push(...stdIndicators)
  }
  return indicators
})

// ตรวจสอบว่ามีมาตรฐานจากฐานข้อมูลหรือไม่
const hasStandardsInDatabase = computed(() => {
  return availableStandards.value.length > 0
})

// ตรวจสอบว่าครูได้เลือกมาตรฐานหรือยัง
const hasSelectedStandards = computed(() => {
  return selectedCourse.value?.selectedStandards?.length > 0
})

// คำนวณจำนวนคาบรวมและหน่วยแนะนำ
const totalPeriods = computed(() => {
  const hours = settings.value.totalHours || 40
  return hours // 1 ชั่วโมง = 1 คาบ ตามที่ user แจ้ง
})

const recommendedUnits = computed(() => {
  const periods = totalPeriods.value
  // แนะนำ 4-8 แผนต่อหน่วย เพื่อให้ AI สร้างได้คุณภาพ
  const minUnits = Math.ceil(periods / 8) // สูงสุด 8 แผนต่อหน่วย
  const maxUnits = Math.ceil(periods / 4) // ต่ำสุด 4 แผนต่อหน่วย
  return {
    min: Math.max(3, minUnits), // อย่างน้อย 3 หน่วย
    max: Math.min(12, maxUnits) // ไม่เกิน 12 หน่วย
  }
})

// Description editing functions
function startEditDescription() {
  editedDescription.value = getCourseDescription.value || ''
  editingDescription.value = true
}

function cancelEditDescription() {
  editingDescription.value = false
  editedDescription.value = ''
}

async function saveDescription() {
  if (!selectedCourse.value?.id || !editedDescription.value.trim()) return
  
  try {
    const courseRef = doc(db, 'courses', selectedCourse.value.id)
    await updateDoc(courseRef, {
      courseDescription: editedDescription.value.trim(),
      description: editedDescription.value.trim() // Keep both for compatibility
    })
    
    // Update local state
    selectedCourse.value.courseDescription = editedDescription.value.trim()
    selectedCourse.value.description = editedDescription.value.trim()
    editingDescription.value = false
    
    console.log('✅ Description saved')
  } catch (error) {
    console.error('Error saving description:', error)
    alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message)
  }
}

// ดึงข้อมูลมาตรฐานพร้อมรายละเอียดจากฐานข้อมูล
function getStandardsWithDetails() {
  if (!selectedCourse.value?.selectedStandards?.length) return []
  
  const result = []
  for (const stdCode of selectedCourse.value.selectedStandards) {
    // หาข้อมูลมาตรฐานจากฐานข้อมูล
    const stdInfo = availableStandards.value.find(s => s.code === stdCode)
    
    // หาตัวชี้วัดตามมาตรฐานและระดับชั้น
    const indicators = getIndicators(stdCode, selectedCourse.value.gradeLevel)
    
    result.push({
      code: stdCode,
      name: stdInfo?.name || '',
      description: stdInfo?.description || '',
      indicators: indicators
    })
  }
  return result
}

// Save credits and hours
async function saveCreditsAndHours() {
  if (!selectedCourse.value?.id) return
  if (!tempCredits.value && !tempTotalHours.value) return
  
  try {
    const updateData = {}
    
    if (tempCredits.value) {
      updateData.credits = parseFloat(tempCredits.value)
    }
    
    if (tempTotalHours.value) {
      updateData.totalHours = parseInt(tempTotalHours.value)
    } else if (tempCredits.value) {
      // Auto-calculate hours from credits
      updateData.totalHours = getHoursFromCredits(parseFloat(tempCredits.value))
    }
    
    const courseRef = doc(db, 'courses', selectedCourse.value.id)
    await updateDoc(courseRef, updateData)
    
    // Update local state
    if (updateData.credits) {
      selectedCourse.value.credits = updateData.credits
      settings.value.credits = updateData.credits
    }
    if (updateData.totalHours) {
      selectedCourse.value.totalHours = updateData.totalHours
      settings.value.totalHours = updateData.totalHours
    }
    
    // Clear temp values
    tempCredits.value = ''
    tempTotalHours.value = ''
    
    console.log('✅ Credits and hours saved')
  } catch (error) {
    console.error('Error saving credits:', error)
    alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message)
  }
}

// Go to course settings to define standards
function goToCourseSettings() {
  if (selectedCourseId.value) {
    router.push(`/courses?edit=${selectedCourseId.value}&tab=standards`)
  } else {
    router.push('/courses')
  }
}

// Load courses
async function loadCourses() {
  try {
    const q = query(
      collection(db, 'courses'),
      where('teacherId', '==', authStore.user?.uid)
    )
    const snapshot = await getDocs(q)
    courses.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error loading courses:', error)
  }
}

function onCourseSelect() {
  selectedCourse.value = courses.value.find(c => c.id === selectedCourseId.value) || null
  courseStructure.value = null
  units.value = []
  hasExistingCurriculum.value = false
  
  // Auto-fill settings from course if available
  if (selectedCourse.value) {
    if (selectedCourse.value.credits) {
      settings.value.credits = selectedCourse.value.credits
      settings.value.totalHours = getHoursFromCredits(selectedCourse.value.credits)
    }
    if (selectedCourse.value.totalHours) {
      settings.value.totalHours = selectedCourse.value.totalHours
    }
    
    // โหลด curriculum ที่มีอยู่ (ถ้ามี)
    loadExistingCurriculum()
  }
}

// โหลด curriculum ที่มีอยู่ใน course
async function loadExistingCurriculum() {
  if (!selectedCourse.value?.id) return
  
  loadingCurriculum.value = true
  try {
    // ดึงข้อมูล curriculum จาก course document
    const courseRef = doc(db, 'courses', selectedCourse.value.id)
    const courseDoc = await getDoc(courseRef)
    
    if (courseDoc.exists()) {
      const data = courseDoc.data()
      
      // ถ้ามี curriculum อยู่แล้ว
      if (data.curriculum) {
        hasExistingCurriculum.value = true
        
        // โหลด settings
        if (data.curriculum.settings) {
          settings.value = { ...settings.value, ...data.curriculum.settings }
        }
        
        // โหลด courseStructure
        if (data.curriculum.structure) {
          courseStructure.value = data.curriculum.structure
        }
        
        // โหลด units
        if (data.curriculum.units && data.curriculum.units.length > 0) {
          units.value = data.curriculum.units.map(u => ({
            ...u,
            generated: u.generated || false
          }))
        }
        
        // กำหนด step ที่ควรอยู่
        if (data.curriculum.currentStep !== undefined) {
          currentStep.value = data.curriculum.currentStep
        } else if (data.curriculum.units?.some(u => u.plans?.some(p => p.id))) {
          currentStep.value = 3 // มีแผนแล้ว
        } else if (data.curriculum.units?.some(u => u.generated)) {
          currentStep.value = 3 // มีหน่วยแล้ว
        } else if (data.curriculum.structure) {
          currentStep.value = 2 // มีโครงสร้างแล้ว
        } else {
          currentStep.value = 1
        }
        
        console.log('✅ Loaded existing curriculum:', {
          step: currentStep.value,
          hasStructure: !!courseStructure.value,
          unitsCount: units.value.length
        })
      }
    }
  } catch (error) {
    console.error('Error loading curriculum:', error)
  } finally {
    loadingCurriculum.value = false
  }
}

// บันทึก curriculum ลง course document
async function saveCurriculumToDatabase() {
  if (!selectedCourse.value?.id) return
  
  savingProgress.value = true
  try {
    const courseRef = doc(db, 'courses', selectedCourse.value.id)
    
    // Helper function to remove undefined values
    function cleanObject(obj) {
      if (obj === null || obj === undefined) return null
      if (Array.isArray(obj)) {
        return obj.map(item => cleanObject(item)).filter(item => item !== undefined)
      }
      if (typeof obj === 'object') {
        const cleaned = {}
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            cleaned[key] = cleanObject(value)
          }
        }
        return cleaned
      }
      return obj
    }
    
    // Clean data
    const cleanUnits = units.value.map(u => {
      const cleanedUnit = {
        id: u.id || `unit_${Date.now()}`,
        name: u.name || '',
        periods: u.periods || 4,
        planCount: u.planCount || 2,
        los: u.los || [],
        essentialContent: u.essentialContent || '',
        learningObjectives: u.learningObjectives || {},
        // A.R.C.E. fields - บันทึกทั้ง 3 fields ให้ครบ!
        arce: u.arce || null,
        arceFocus: u.arceFocus || [],
        arceDistribution: u.arceDistribution || null,
        // Other fields
        knowledgeScope: u.knowledgeScope || null,
        assessmentPlan: u.assessmentPlan || null,
        materialsNeeded: u.materialsNeeded || [],
        generated: u.generated || false,
        plans: (u.plans || []).map(p => {
          const cleanedPlan = {
            topic: p.topic || '',
            periods: p.periods || 1,
            los: p.los || [],
            // A.R.C.E. fields for plan
            arceFocus: p.arceFocus || null,
            arce: p.arce || null,
            uniqueKeyTopics: p.uniqueKeyTopics || [],
            activities5E: p.activities5E || null,
            status: p.status || 'pending'
          }
          // Only add id if it exists
          if (p.id) {
            cleanedPlan.id = p.id
          }
          return cleanedPlan
        })
      }
      return cleanedUnit
    })
    
    const curriculumData = {
      settings: cleanObject(JSON.parse(JSON.stringify(settings.value))),
      units: cleanUnits,
      currentStep: currentStep.value || 0,
      updatedAt: serverTimestamp()
    }
    
    // Only add structure if it exists
    if (courseStructure.value) {
      curriculumData.structure = cleanObject(JSON.parse(JSON.stringify(courseStructure.value)))
    }
    
    await updateDoc(courseRef, {
      curriculum: curriculumData
    })
    
    hasExistingCurriculum.value = true
    console.log('💾 Curriculum saved to course document')
  } catch (error) {
    console.error('Error saving curriculum:', error)
    alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message)
  } finally {
    savingProgress.value = false
  }
}

// ลบ curriculum ทั้งหมดและเริ่มใหม่
async function resetCurriculum() {
  if (!confirm('ต้องการลบ Curriculum ทั้งหมดและเริ่มใหม่หรือไม่?\n\nแผนการสอนที่สร้างไว้จะถูกลบด้วย')) {
    return
  }
  
  try {
    // ลบแผนการสอนที่เกี่ยวข้องจาก lessonPlans collection
    for (const unit of units.value) {
      if (unit.plans) {
        for (const plan of unit.plans) {
          if (plan.id) {
            await deleteDoc(doc(db, 'lessonPlans', plan.id))
            console.log('🗑️ Deleted plan:', plan.id)
          }
        }
      }
    }
    
    // ลบ curriculum จาก course
    const courseRef = doc(db, 'courses', selectedCourse.value.id)
    await updateDoc(courseRef, {
      curriculum: null
    })
    
    // Reset state
    courseStructure.value = null
    units.value = []
    currentStep.value = 0
    hasExistingCurriculum.value = false
    
    console.log('✅ Curriculum reset complete')
    alert('ลบ Curriculum เรียบร้อยแล้ว')
  } catch (error) {
    console.error('Error resetting curriculum:', error)
    alert('เกิดข้อผิดพลาด: ' + error.message)
  }
}

function goToStep(idx) {
  if (idx < currentStep.value) {
    currentStep.value = idx
  }
}

function nextStep() {
  currentStep.value++
}

function prevStep() {
  currentStep.value--
}

// Generate Course Structure
async function generateCourseStructure() {
  generatingStructure.value = true
  generatingProgress.value = 0
  
  const progressSteps = [
    { progress: 10, text: 'กำลังวิเคราะห์คำอธิบายรายวิชา...' },
    { progress: 25, text: 'กำลังจัดกลุ่ม Learning Outcomes...' },
    { progress: 40, text: 'กำลังออกแบบมาตรฐานและตัวชี้วัด...' },
    { progress: 55, text: 'กำลังวางกลยุทธ์ A.R.C.E...' },
    { progress: 70, text: 'กำลังแบ่งหน่วยการเรียนรู้...' },
    { progress: 85, text: 'กำลังจัดสรรเวลาและแผน...' },
    { progress: 95, text: 'กำลังตรวจสอบความสอดคล้อง...' }
  ]

  let progressIdx = 0
  const progressInterval = setInterval(() => {
    if (progressIdx < progressSteps.length) {
      generatingProgress.value = progressSteps[progressIdx].progress
      generatingText.value = progressSteps[progressIdx].text
      progressIdx++
    }
  }, 1500)

  try {
    const response = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/generateCourseStructure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: selectedCourse.value.id,
        courseCode: selectedCourse.value.courseCode,
        courseName: selectedCourse.value.courseName,
        description: selectedCourse.value.description,
        learningOutcomes: selectedCourse.value.learningOutcomes,
        subjectGroup: selectedCourse.value.subjectGroup,
        gradeLevel: selectedCourse.value.gradeLevel,
        settings: settings.value,
        // ข้อมูลหลักสูตรแกนกลาง
        courseType: selectedCourse.value.courseType || 'basic',
        selectedStandards: selectedCourse.value.selectedStandards || [],
        keyCompetencies: selectedCourse.value.keyCompetencies || [],
        desiredCharacteristics: selectedCourse.value.desiredCharacteristics || []
      })
    })

    const data = await response.json()
    
    if (data.success) {
      courseStructure.value = data.structure
      
      // Validate unitsPreview exists
      if (!data.structure.unitsPreview || !Array.isArray(data.structure.unitsPreview)) {
        throw new Error('AI ไม่ได้ส่งข้อมูลหน่วยการเรียนรู้กลับมา กรุณาลองใหม่อีกครั้ง')
      }
      
      // Initialize units from preview - 1 แผน = 1 คาบ
      units.value = data.structure.unitsPreview.map((u, idx) => {
        const periodCount = u.periods || u.hours || 4
        return {
          id: `unit_${idx + 1}`,
          name: u.name,
          periods: periodCount, // คาบ (1 คาบ = 50 นาที)
          planCount: periodCount, // แผน = คาบ
          los: u.los,
          plans: u.plansPreview || [],
          arceFocus: u.arceFocus || [],
          arceDistribution: u.arceDistribution || null,
          essentialContent: '',
          generated: false
        }
      })
      
      // บันทึกลง course document ทันที
      await saveCurriculumToDatabase()
    } else {
      throw new Error(data.error || 'Failed to generate structure')
    }

    clearInterval(progressInterval)
    generatingProgress.value = 100
    generatingText.value = 'เสร็จสิ้น!'
  } catch (error) {
    console.error('Error generating structure:', error)
    alert('เกิดข้อผิดพลาด: ' + error.message)
    clearInterval(progressInterval)
  } finally {
    setTimeout(() => {
      generatingStructure.value = false
    }, 500)
  }
}

async function regenerateStructure() {
  if (!confirm('⚠️ ต้องการสร้างโครงสร้างใหม่?\n\nข้อมูลต่อไปนี้จะถูกลบ:\n- หน่วยการเรียนรู้ทั้งหมด\n- แผนการสอนทั้งหมด\n- ใบความรู้ทั้งหมด\n- ใบงานทั้งหมด\n\nการดำเนินการนี้ไม่สามารถย้อนกลับได้!')) {
    return
  }

  // แสดง loading
  generatingStructure.value = true
  generatingText.value = 'กำลังลบข้อมูลเดิม...'
  generatingProgress.value = 0

  try {
    const courseId = selectedCourse.value.id

    // 1. ลบแผนการสอนทั้งหมดของรายวิชานี้
    generatingText.value = 'กำลังลบแผนการสอน...'
    generatingProgress.value = 10
    const plansQuery = query(
      collection(db, 'lessonPlans'),
      where('courseId', '==', courseId)
    )
    const plansSnap = await getDocs(plansQuery)
    console.log(`🗑️ Deleting ${plansSnap.docs.length} lesson plans...`)
    for (const planDoc of plansSnap.docs) {
      await deleteDoc(doc(db, 'lessonPlans', planDoc.id))
    }

    // 2. ลบใบความรู้ทั้งหมดของรายวิชานี้
    generatingText.value = 'กำลังลบใบความรู้...'
    generatingProgress.value = 30
    const ksQuery = query(
      collection(db, 'knowledgeSheets'),
      where('courseId', '==', courseId)
    )
    const ksSnap = await getDocs(ksQuery)
    console.log(`🗑️ Deleting ${ksSnap.docs.length} knowledge sheets...`)
    for (const ksDoc of ksSnap.docs) {
      await deleteDoc(doc(db, 'knowledgeSheets', ksDoc.id))
    }

    // 3. ลบใบความรู้หน่วยทั้งหมดของรายวิชานี้
    generatingText.value = 'กำลังลบใบความรู้หน่วย...'
    generatingProgress.value = 45
    const unitKsQuery = query(
      collection(db, 'unitKnowledgeSheets'),
      where('courseId', '==', courseId)
    )
    const unitKsSnap = await getDocs(unitKsQuery)
    console.log(`🗑️ Deleting ${unitKsSnap.docs.length} unit knowledge sheets...`)
    for (const unitKsDoc of unitKsSnap.docs) {
      await deleteDoc(doc(db, 'unitKnowledgeSheets', unitKsDoc.id))
    }

    // 4. ลบใบงานทั้งหมดของรายวิชานี้
    generatingText.value = 'กำลังลบใบงาน...'
    generatingProgress.value = 60
    const wsQuery = query(
      collection(db, 'worksheets'),
      where('courseId', '==', courseId)
    )
    const wsSnap = await getDocs(wsQuery)
    console.log(`🗑️ Deleting ${wsSnap.docs.length} worksheets...`)
    for (const wsDoc of wsSnap.docs) {
      await deleteDoc(doc(db, 'worksheets', wsDoc.id))
    }

    // 5. ลบห้องกิจกรรมที่เกี่ยวข้อง (optional - อาจจะไม่ลบ)
    generatingText.value = 'กำลังลบห้องกิจกรรม...'
    generatingProgress.value = 75
    const roomsQuery = query(
      collection(db, 'learningRooms'),
      where('courseId', '==', courseId)
    )
    const roomsSnap = await getDocs(roomsQuery)
    console.log(`🗑️ Deleting ${roomsSnap.docs.length} learning rooms...`)
    for (const roomDoc of roomsSnap.docs) {
      await deleteDoc(doc(db, 'learningRooms', roomDoc.id))
    }

    // 6. Clear local state
    generatingText.value = 'กำลังรีเซ็ตข้อมูล...'
    generatingProgress.value = 90
    courseStructure.value = null
    units.value = []

    // 7. Clear curriculum in course document
    if (selectedCourse.value?.id) {
      await updateDoc(doc(db, 'courses', selectedCourse.value.id), {
        curriculum: null,
        updatedAt: serverTimestamp()
      })
      hasExistingCurriculum.value = false
    }

    console.log('✅ All old data deleted successfully')
    generatingProgress.value = 100
    generatingText.value = 'ลบข้อมูลเดิมเสร็จแล้ว กำลังสร้างใหม่...'

    // Small delay before generating new structure
    await new Promise(resolve => setTimeout(resolve, 500))
    generatingStructure.value = false

    // Generate new structure
    await generateCourseStructure()

  } catch (error) {
    console.error('❌ Error in regenerateStructure:', error)
    alert('เกิดข้อผิดพลาดในการลบข้อมูลเดิม: ' + error.message)
    generatingStructure.value = false
  }
}

async function saveCourseStructure() {
  try {
    console.log('📝 Saving course structure...')
    
    // บันทึกลง course document
    await saveCurriculumToDatabase()

    console.log('✅ Structure saved successfully!')
    nextStep()
  } catch (error) {
    console.error('❌ Error saving structure:', error)
    alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message)
  }
}

// Generate Unit
async function generateUnit(idx) {
  generatingUnitIndex.value = idx
  const unit = units.value[idx]

  try {
    console.log('🚀 Generating unit:', idx, unit.name)
    console.log('📤 Sending data:', {
      courseId: selectedCourse.value.id,
      unitName: unit.name,
      targetLOs: unit.los
    })

    const response = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/generateLearningUnit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: selectedCourse.value.id,
        courseCode: selectedCourse.value.courseCode,
        courseName: selectedCourse.value.courseName,
        courseDescription: selectedCourse.value.description,
        allLearningOutcomes: selectedCourse.value.learningOutcomes,
        unitIndex: idx,
        unitName: unit.name,
        unitPeriods: unit.periods || 4, // จำนวนคาบ = จำนวนแผน (1 แผน = 1 คาบ = 50 นาที)
        targetLOs: unit.los,
        courseStructure: courseStructure.value,
        settings: settings.value,
        // ข้อมูลหลักสูตรแกนกลาง
        courseType: selectedCourse.value.courseType || 'basic',
        selectedStandards: selectedCourse.value.selectedStandards || [],
        keyCompetencies: selectedCourse.value.keyCompetencies || [],
        desiredCharacteristics: selectedCourse.value.desiredCharacteristics || []
      })
    })

    console.log('📥 Response status:', response.status)
    const data = await response.json()
    console.log('📥 Response data:', data)
    
    if (data.success && data.unit) {
      // Merge data
      const generatedUnit = {
        ...units.value[idx],
        ...data.unit,
        generated: true
      }
      units.value[idx] = generatedUnit
      
      // แสดง warning ถ้าหน่วยใหญ่เกินไป
      if (data.unit.warning) {
        alert(`⚠️ คำแนะนำ:\n${data.unit.warning}`)
      }
      
      // บันทึกลง course document ทันที
      await saveCurriculumToDatabase()
      
      console.log('✅ Unit generated and saved successfully')
    } else {
      throw new Error(data.error || 'ไม่สามารถสร้างหน่วยการเรียนรู้ได้')
    }
  } catch (error) {
    console.error('❌ Error generating unit:', error)
    alert('เกิดข้อผิดพลาด: ' + (error.message || 'Unknown error'))
  } finally {
    generatingUnitIndex.value = null
  }
}

function editUnit(idx) {
  // TODO: Open edit modal
}

// เมื่อเปลี่ยนคาบ จำนวนแผนต้องเท่ากับคาบ (1 แผน = 1 คาบ = 50 นาที)
function onPeriodsChange(idx) {
  const unit = units.value[idx]
  unit.planCount = unit.periods // sync planCount กับ periods
  console.log(`📝 Unit ${idx + 1}: ${unit.periods} คาบ = ${unit.periods} แผน`)
}

function addUnit() {
  const newIdx = units.value.length + 1
  const defaultPeriods = 4 // 4 คาบ = 4 แผน
  units.value.push({
    id: `unit_${Date.now()}`,
    name: `หน่วยที่ ${newIdx}`,
    periods: defaultPeriods, // คาบ (1 คาบ = 50 นาที)
    planCount: defaultPeriods, // แผน = คาบ
    los: [],
    plans: [],
    essentialContent: '',
    generated: false
  })
}

function deleteUnit(idx) {
  if (units.value.length > 1 && confirm('ต้องการลบหน่วยการเรียนรู้นี้? แผนการสอนที่เกี่ยวข้องจะถูกลบด้วย')) {
    // ลบแผนจาก lessonPlans collection
    deleteUnitPlans(idx)
    units.value.splice(idx, 1)
    // บันทึกลง course document
    saveCurriculumToDatabase()
  }
}

// ลบแผนของหน่วยจาก lessonPlans collection พร้อมใบความรู้และใบงานที่เกี่ยวข้อง
async function deleteUnitPlans(unitIdx) {
  try {
    const unit = units.value[unitIdx]
    const unitNumber = unitIdx + 1
    const courseId = selectedCourse.value?.id

    if (unit.plans) {
      for (const plan of unit.plans) {
        if (plan.id) {
          // 1. ลบใบความรู้ของแผนนี้
          const ksQuery = query(
            collection(db, 'knowledgeSheets'),
            where('lessonPlanId', '==', plan.id)
          )
          const ksSnap = await getDocs(ksQuery)
          for (const ksDoc of ksSnap.docs) {
            await deleteDoc(doc(db, 'knowledgeSheets', ksDoc.id))
            console.log('🗑️ Deleted knowledge sheet:', ksDoc.id)
          }

          // 2. ลบใบงานของแผนนี้
          const wsQuery = query(
            collection(db, 'worksheets'),
            where('lessonPlanId', '==', plan.id)
          )
          const wsSnap = await getDocs(wsQuery)
          for (const wsDoc of wsSnap.docs) {
            await deleteDoc(doc(db, 'worksheets', wsDoc.id))
            console.log('🗑️ Deleted worksheet:', wsDoc.id)
          }

          // 3. ลบแผนการสอน
          await deleteDoc(doc(db, 'lessonPlans', plan.id))
          console.log('🗑️ Deleted plan:', plan.id)
        }
      }
    }

    // 4. ลบใบความรู้รวมหน่วยของหน่วยนี้ (ถ้ามี)
    if (courseId) {
      const unitKsQuery = query(
        collection(db, 'unitKnowledgeSheets'),
        where('courseId', '==', courseId)
      )
      const unitKsSnap = await getDocs(unitKsQuery)
      for (const unitKsDoc of unitKsSnap.docs) {
        const data = unitKsDoc.data()
        // ตรวจสอบว่าเป็นหน่วยเดียวกัน
        if (data.metadata?.unitNumber === unitNumber || data.unitNumber === unitNumber) {
          await deleteDoc(doc(db, 'unitKnowledgeSheets', unitKsDoc.id))
          console.log('🗑️ Deleted unit knowledge sheet:', unitKsDoc.id)
        }
      }
    }

    console.log('✅ All related data for unit', unitNumber, 'deleted')
  } catch (error) {
    console.error('Error deleting unit plans:', error)
  }
}

async function regenerateUnit(idx) {
  if (confirm('ต้องการให้ AI สร้างรายละเอียดใหม่? แผนการสอนที่สร้างไว้จะถูกลบ')) {
    // ลบแผนเก่าก่อน
    await deleteUnitPlans(idx)
    
    units.value[idx].generated = false
    units.value[idx].plans = []
    units.value[idx].essentialContent = ''
    
    // บันทึกการลบ
    await saveCurriculumToDatabase()
    
    generateUnit(idx)
  }
}

function updatePlanCount(idx) {
  const unit = units.value[idx]
  const targetCount = unit.planCount || 2
  
  // Adjust plans array to match planCount
  while (unit.plans.length < targetCount) {
    unit.plans.push({
      topic: `แผนที่ ${unit.plans.length + 1}`,
      duration: 100,
      status: 'pending'
    })
  }
  while (unit.plans.length > targetCount) {
    unit.plans.pop()
  }
}

function addPlanToUnit(idx) {
  const unit = units.value[idx]
  if (!unit.plans) unit.plans = []
  unit.plans.push({
    topic: `แผนที่ ${unit.plans.length + 1}`,
    periods: 2, // คาบ
    status: 'pending'
  })
  unit.planCount = unit.plans.length
}

function removePlan(unitIdx, planIdx) {
  const unit = units.value[unitIdx]
  if (unit.plans.length > 1) {
    unit.plans.splice(planIdx, 1)
    unit.planCount = unit.plans.length
  }
}

// Computed: Available LOs from course
const availableLOs = computed(() => {
  return selectedCourse.value?.learningOutcomes || []
})

// Generate Lesson Plan
async function generateLessonPlan(unitIdx, planIdx) {
  const unit = units.value[unitIdx]
  const plan = unit.plans[planIdx]
  
  plan.status = 'generating'

  try {
    // 🔐 Get auth token for secured endpoint
    const token = await authStore.getIdToken()
    if (!token) {
      throw new Error('กรุณาเข้าสู่ระบบใหม่')
    }
    
    // ส่งข้อมูลหน่วยที่สมบูรณ์ไปให้ AI
    const response = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/generateLessonPlan`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`  // 🔐 Auth required
      },
      body: JSON.stringify({
        // ข้อมูลรายวิชา
        courseId: selectedCourse.value.id,
        courseCode: selectedCourse.value.courseCode,
        courseName: selectedCourse.value.courseName,
        courseDescription: selectedCourse.value.description,
        subjectGroup: selectedCourse.value.subjectGroup || 'วิทยาศาสตร์และเทคโนโลยี',
        learningOutcomes: selectedCourse.value.learningOutcomes,
        gradeLevel: selectedCourse.value.gradeLevel || 'ม.4',
        
        // ข้อมูลหลักสูตรแกนกลาง
        courseType: selectedCourse.value.courseType || 'basic',
        selectedStandards: selectedCourse.value.selectedStandards || [],
        keyCompetencies: selectedCourse.value.keyCompetencies || [],
        desiredCharacteristics: selectedCourse.value.desiredCharacteristics || [],
        
        // ข้อมูลการตั้งค่า
        semester: settings.value.semester,
        academicYear: settings.value.academicYear,
        
        // ข้อมูลหน่วยการเรียนรู้ (สำคัญ!)
        unitNumber: unitIdx + 1,
        unitName: unit.name,
        unitEssentialContent: unit.essentialContent,
        unitLearningObjectives: unit.learningObjectives,
        unitTotalPeriods: unit.periods,
        unitLOs: unit.los,
        
        // ข้อมูลแผน - แต่ละแผน = 1 คาบ (50 นาที)
        planNumber: planIdx + 1,
        totalPlansInUnit: unit.plans?.length || unit.planCount,
        topic: plan.topic,
        periods: 1, // 1 คาบต่อแผน
        planLOs: plan.los || unit.los,
        
        // ข้อมูล ARCE จากหน่วย (ถ้ามี) - ส่งทั้ง arceFocus และ arceDistribution เพื่อความสอดคล้อง
        arce: plan.arce || unit.arce,
        arceFocus: plan.arceFocus || unit.arceFocus?.[planIdx] || unit.arceFocus?.[0],
        unitArceDistribution: unit.arceDistribution,  // การกระจาย ARCE ของหน่วย
        unitArceFocus: unit.arceFocus,                // ARCE หลักของหน่วย
        
        // ข้อมูลอื่นๆ
        teacherId: authStore.user?.uid,
        teachingMethod: '5E',
        
        // โครงสร้างรายวิชาและแผนก่อนหน้า
        courseStructure: courseStructure.value,
        previousPlans: unit.plans.slice(0, planIdx)
          .filter(p => p.status === 'generated')
          .map(p => ({ topic: p.topic, periods: p.periods, los: p.los }))
      })
    })

    const data = await response.json()
    console.log('📥 Lesson plan response:', data)
    
    if (data.success && data.planId) {
      plan.status = 'generated'
      plan.id = data.planId
      console.log('✅ Lesson plan created with ID:', data.planId)
      
      // บันทึกลง course document ทันที
      await saveCurriculumToDatabase()
    } else {
      throw new Error(data.error || 'ไม่ได้รับ planId')
    }
  } catch (error) {
    console.error('❌ Error generating plan:', error)
    plan.status = 'pending'
    alert('เกิดข้อผิดพลาด: ' + error.message)
  }
}

async function generateAllPlansInUnit(unitIdx) {
  generatingAllPlans.value = true
  const unit = units.value[unitIdx]
  
  for (let i = 0; i < unit.plans.length; i++) {
    if (unit.plans[i].status !== 'generated') {
      await generateLessonPlan(unitIdx, i)
    }
  }
  
  generatingAllPlans.value = false
}

function viewLessonPlan(planId) {
  router.push(`/lesson-plans/${planId}`)
}

function togglePlanSettings(unitIdx, planIdx) {
  const key = `${unitIdx}-${planIdx}`
  if (editingPlanIndex.value === key) {
    editingPlanIndex.value = null
  } else {
    editingPlanIndex.value = key
    // Initialize los array if not exists
    const plan = units.value[unitIdx].plans[planIdx]
    if (!plan.los) {
      plan.los = [...units.value[unitIdx].los]
    }
    if (!plan.focusARCE) {
      plan.focusARCE = 'analysis'
    }
  }
}

async function deletePlanFromUnit(unitIdx, planIdx) {
  const unit = units.value[unitIdx]
  if (unit.plans.length > 1) {
    if (confirm('ต้องการลบแผนนี้?')) {
      const plan = unit.plans[planIdx]
      
      // ลบจาก lessonPlans collection ถ้ามี planId
      if (plan.id) {
        try {
          await deleteDoc(doc(db, 'lessonPlans', plan.id))
          console.log('🗑️ Deleted plan from lessonPlans:', plan.id)
        } catch (error) {
          console.error('Error deleting plan from collection:', error)
        }
      }
      
      // ลบออกจาก array
      unit.plans.splice(planIdx, 1)
      unit.planCount = unit.plans.length
      editingPlanIndex.value = null
      
      // บันทึกการเปลี่ยนแปลงลง course document
      await saveCurriculumToDatabase()
      console.log('✅ Curriculum updated after deleting plan')
    }
  } else {
    alert('ต้องมีอย่างน้อย 1 แผน')
  }
}

function editPlanSettings(unitIdx, planIdx) {
  togglePlanSettings(unitIdx, planIdx)
}

// Navigation functions for Step 4
function goToLessonPlans() {
  router.push('/lesson-plans')
}

function goToTeacherWorksheets() {
  router.push('/teacher/worksheets')
}

function finishCurriculum() {
  router.push('/lesson-plans')
}

onMounted(async () => {
  await loadCourses()
  
  // Check if courseId is passed in query params
  const queryId = router.currentRoute.value.query.courseId
  if (queryId) {
    selectedCourseId.value = queryId
    onCourseSelect()
  }
})
</script>

<style scoped>
.curriculum-designer {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Navbar */
.top-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.back-link:hover {
  background: var(--bg-primary);
  color: var(--primary);
}

.brand-icon {
  font-size: 1.5rem;
}

.brand-text {
  font-size: 1.25rem;
  font-weight: 700;
}

.arce-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.1));
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #8b5cf6;
}

/* Page Content */
.page-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Steps Container */
.steps-container {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 16px;
  overflow-x: auto;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}

.step-item:hover {
  background: var(--bg-primary);
}

.step-item.active {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.1));
}

.step-item.completed {
  opacity: 0.7;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.step-item.active .step-number {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  border-color: transparent;
  color: white;
}

.step-item.completed .step-number {
  background: #10b981;
  border-color: transparent;
  color: white;
}

.step-info {
  display: flex;
  flex-direction: column;
}

.step-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.step-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Step Content */
.step-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.step-header {
  text-align: center;
  margin-bottom: 2rem;
}

.step-header h2 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.step-header p {
  color: var(--text-secondary);
}

/* Cards */
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

/* Course Selection */
.course-selection {
  max-width: 800px;
  margin: 0 auto;
}

/* Loading Curriculum */
.loading-curriculum {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem;
  color: var(--text-secondary);
}

.loading-curriculum .spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border-color);
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Existing Curriculum Notice */
.existing-curriculum-notice {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  padding: 1.25rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.notice-content {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.notice-content .material-icons {
  font-size: 2rem;
  color: #8b5cf6;
}

.notice-text strong {
  display: block;
  margin-bottom: 0.25rem;
  color: var(--text-primary);
}

.notice-text p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.notice-actions {
  display: flex;
  gap: 0.75rem;
}

.notice-actions .btn {
  flex: 1;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.required {
  color: #ef4444;
}

.form-control {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.form-control:focus {
  outline: none;
  border-color: #8b5cf6;
}

/* Course Preview */
.course-preview {
  margin-top: 1.5rem;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.preview-header h3 {
  font-size: 1.25rem;
  color: var(--primary);
}

.grade-badge {
  padding: 0.25rem 0.75rem;
  background: var(--bg-primary);
  border-radius: 20px;
  font-size: 0.8rem;
}

.preview-section {
  margin-bottom: 1.5rem;
}

.preview-section h4 {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

.description {
  line-height: 1.7;
}

.lo-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lo-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.lo-code {
  font-weight: 600;
  color: #8b5cf6;
  white-space: nowrap;
}

.lo-desc {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item .label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.info-item .value {
  font-weight: 500;
}

.info-item .value.not-set {
  color: var(--warning-color, #f59e0b);
  font-style: italic;
  font-weight: 400;
}

/* Credits/Hours inline form */
.set-credits-section {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-secondary, #f8fafc);
  border-radius: 8px;
  border: 1px dashed var(--border-color, #e2e8f0);
}

.set-credits-section .hint-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.credits-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.form-group-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-group-inline label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.form-control-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 6px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: var(--bg-primary);
  color: var(--text-primary);
  min-width: 100px;
}

.form-control-sm:focus {
  outline: none;
  border-color: var(--primary-color, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.empty-text {
  color: var(--text-secondary);
  font-style: italic;
}

/* Description Warning & Edit Form */
.description-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  margin-bottom: 1rem;
  color: #92400e;
  font-size: 0.875rem;
}

.description-warning .material-icons {
  color: #f59e0b;
  font-size: 1.25rem;
}

.dark-mode .description-warning {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.5);
  color: #fbbf24;
}

.description-edit-form {
  margin-top: 0.5rem;
}

.description-textarea {
  width: 100%;
  min-height: 120px;
  padding: 1rem;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
  resize: vertical;
}

.description-textarea:focus {
  border-color: var(--primary);
  outline: none;
}

.char-counter {
  font-size: 0.8rem;
  margin-top: 0.5rem;
  color: var(--text-secondary);
}

.char-counter.warning {
  color: #f59e0b;
}

.char-counter.good {
  color: #10b981;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

/* Units Recommendation */
.units-recommendation {
  background: linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%);
  padding: 1.25rem;
  border-radius: 12px;
  border: 1px solid #c7d2fe;
}

.dark-mode .units-recommendation {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border-color: rgba(139, 92, 246, 0.3);
}

.recommendation-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.recommendation-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.rec-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.rec-value {
  font-weight: 600;
  font-size: 1rem;
}

.rec-value.highlight {
  color: #8b5cf6;
  font-size: 1.1rem;
}

.recommendation-note {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.6;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border);
  margin-bottom: 0;
}

.recommendation-note strong {
  color: #f59e0b;
}

/* Settings */
.settings-card h3 {
  margin-bottom: 1rem;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

/* Auto-calculated value display */
.auto-value {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  min-height: 38px;
}

.auto-value .value-display {
  font-weight: 500;
  color: var(--text-primary);
}

.auto-value .auto-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  border-radius: 4px;
  white-space: nowrap;
}

/* Generate Section */
.generate-section {
  text-align: center;
  padding: 3rem;
}

.hint {
  margin-top: 1rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* Generating State */
.generating-state {
  text-align: center;
  padding: 3rem;
}

.generating-animation {
  position: relative;
  display: inline-block;
  margin-bottom: 1.5rem;
}

.ai-icon {
  font-size: 4rem;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  border: 3px solid rgba(139, 92, 246, 0.3);
  border-radius: 50%;
  animation: pulse 2s ease-out infinite;
}

@keyframes pulse {
  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
}

.progress-bar {
  width: 100%;
  max-width: 400px;
  height: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  margin: 1rem auto;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #ec4899);
  transition: width 0.3s ease;
}

/* Structure Result */
.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.structure-overview {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.05));
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-top: 1rem;
}

.overview-item {
  text-align: center;
}

.overview-value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #8b5cf6;
}

.overview-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Section Header with Action */
.section-header-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header-with-action h4 {
  margin: 0;
}

.btn-define-standards {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-define-standards:hover {
  background: #d97706;
}

/* Standards Warning */
.standards-warning {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 2px solid #f59e0b;
  border-radius: 12px;
  color: #92400e;
}

.standards-warning > .material-icons {
  font-size: 2rem;
  color: #d97706;
}

.warning-content {
  flex: 1;
}

.warning-content strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.warning-content p {
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

.btn-go-settings {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #d97706;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-go-settings:hover {
  background: #b45309;
}

/* Available Standards List */
.available-standards-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.75rem 0;
}

.available-standard {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid #8b5cf6;
  border-radius: 6px;
  font-size: 0.85rem;
}

.available-standard .std-code {
  font-weight: 600;
  color: #8b5cf6;
}

.available-standard .std-name {
  color: var(--text-primary);
}

.mt-2 {
  margin-top: 0.75rem;
}

/* Standards */
.standards-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.standard-item {
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 10px;
}

.std-header {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.std-code {
  font-weight: 600;
  color: #8b5cf6;
}

.indicators {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.indicator-tag {
  padding: 0.25rem 0.5rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 0.75rem;
}

/* ARCE Strategy */
.arce-strategy {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.arce-item {
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 10px;
}

.arce-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.arce-icon {
  font-size: 1.25rem;
}

.arce-name {
  font-weight: 600;
  flex: 1;
}

.arce-weight {
  padding: 0.25rem 0.5rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 0.75rem;
}

.arce-focus {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Units Preview */
.units-preview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.unit-preview-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.unit-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
}

.unit-info {
  flex: 1;
}

.unit-name {
  display: block;
  font-weight: 500;
}

.unit-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Save Section */
.save-section {
  text-align: center;
  margin-top: 2rem;
}

/* Step Actions */
.step-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

/* Units Container */
.units-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.unit-card {
  border-left: 4px solid #8b5cf6;
}

.unit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.unit-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.unit-badge {
  padding: 0.25rem 0.5rem;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.unit-generating {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border-color);
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.unit-meta-row {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.meta-item .material-icons {
  font-size: 1rem;
}

.unit-description, .unit-los, .unit-plans-preview {
  margin-bottom: 1rem;
}

.unit-description h4, .unit-los h4, .unit-plans-preview h4 {
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

.lo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lo-tag {
  padding: 0.25rem 0.75rem;
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  border-radius: 20px;
  font-size: 0.8rem;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.plan-preview-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-primary);
  border-radius: 6px;
}

.plan-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.plan-topic {
  flex: 1;
  font-size: 0.875rem;
}

.plan-duration {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.unit-empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.add-unit-btn {
  width: 100%;
  padding: 1rem;
  border-style: dashed;
}

/* Units Tabs */
.units-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: linear-gradient(135deg, #1e293b, #334155);
  border: 2px solid #475569;
  border-radius: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  font-weight: 600;
  color: #e2e8f0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.tab-btn:hover {
  border-color: #8b5cf6;
  background: linear-gradient(135deg, #334155, #475569);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(139, 92, 246, 0.3);
}

.tab-btn.active {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.plan-count {
  padding: 0.25rem 0.625rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.tab-btn:not(.active) .plan-count {
  background: rgba(139, 92, 246, 0.3);
  color: #c4b5fd;
}

/* Plans Container */
.plans-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.plan-card {
  border-left: 4px solid #10b981;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.plan-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.plan-badge {
  padding: 0.25rem 0.5rem;
  background: #10b981;
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
}

.plan-status {
  font-size: 0.8rem;
}

.plan-status.generated {
  color: #10b981;
}

.plan-status.generating {
  color: #f59e0b;
}

.plan-meta {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.plan-meta .material-icons {
  font-size: 1rem;
  margin-right: 0.25rem;
}

.plan-actions {
  display: flex;
  gap: 0.75rem;
}

.add-plan-btn {
  width: 100%;
  border-style: dashed;
}

/* Batch Actions */
.batch-actions {
  text-align: center;
  margin-top: 2rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.05));
}

.batch-actions h4 {
  margin-bottom: 0.5rem;
}

.batch-actions p {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 0.9rem;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
}

.btn-lg {
  padding: 0.875rem 1.75rem;
  font-size: 1rem;
}

.btn-xl {
  padding: 1rem 2rem;
  font-size: 1.125rem;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-outline {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-outline:hover {
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.btn-ai {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: white;
}

.btn-ai:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #059669;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-icon {
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Unit Edit Row */
.unit-edit-row {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.edit-field label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.edit-field.wide {
  flex: 1;
  min-width: 200px;
}

.edit-field.info-only {
  display: flex;
  flex-direction: column;
}

.info-value {
  padding: 0.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--text-secondary);
  min-width: 80px;
  text-align: center;
}

.form-control.small {
  width: 80px;
  padding: 0.5rem;
  font-size: 0.875rem;
}

.unit-name-input {
  background: transparent;
  border: none;
  border-bottom: 1px dashed var(--border-color);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  padding: 0.25rem 0.5rem;
  flex: 1;
  min-width: 200px;
}

.unit-name-input:focus {
  outline: none;
  border-bottom-color: #8b5cf6;
}

/* LO Selector */
.lo-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lo-checkbox {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.lo-checkbox input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: #8b5cf6;
}

/* Editable Plans */
.plans-list.editable {
  gap: 0.75rem;
}

.plan-preview-item.editable {
  background: var(--bg-secondary);
  padding: 0.75rem;
}

.plan-topic-input {
  flex: 1;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.plan-topic-input:focus {
  outline: none;
  border-color: #8b5cf6;
}

.plan-duration-input {
  width: 60px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-primary);
  text-align: center;
}

.plan-duration-input:focus {
  outline: none;
  border-color: #8b5cf6;
}

.duration-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.add-plan-btn {
  width: 100%;
  border-style: dashed;
  margin-top: 0.5rem;
}

/* Plan Settings Panel */
.plan-settings-panel {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.settings-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.setting-field {
  flex: 1;
  min-width: 150px;
}

.setting-field.small {
  flex: 0 0 100px;
  min-width: 100px;
}

.setting-field label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.setting-field .form-control {
  width: 100%;
}

.btn-outline.active {
  background: rgba(139, 92, 246, 0.1);
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.arce-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 6px;
  font-size: 0.8rem;
  color: #8b5cf6;
  margin-bottom: 1rem;
}

.arce-note .material-icons {
  font-size: 1rem;
}

/* ARCE Styling */
.arce-details {
  margin-top: 0.5rem;
  padding-left: 1rem;
}

.arce-detail-section {
  margin-bottom: 0.5rem;
}

.detail-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.detail-list {
  margin: 0.25rem 0 0 1rem;
  padding: 0;
  font-size: 0.8rem;
}

.detail-list li {
  margin-bottom: 0.25rem;
  color: var(--text-secondary);
}

.arce-units-emphasis {
  margin-top: 0.5rem;
  padding-left: 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.unit-emphasis-tag {
  padding: 0.125rem 0.5rem;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 4px;
  font-size: 0.7rem;
  color: #8b5cf6;
}

/* Unit ARCE Focus Tags */
.unit-arce-focus {
  display: flex;
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.arce-tag {
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.65rem;
  font-weight: 600;
}

.arce-tag.analysis { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.arce-tag.reasoning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.arce-tag.creativity { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.arce-tag.evidence { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }

/* Plans Mini Preview */
.plans-mini-preview {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
}

.plan-mini {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.75rem;
}

.plan-mini-num {
  width: 18px;
  height: 18px;
  background: var(--bg-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 600;
}

.plan-mini-topic {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-secondary);
}

.arce-mini-tag {
  padding: 0.125rem 0.25rem;
  border-radius: 2px;
  font-size: 0.6rem;
  font-weight: 700;
}

.arce-mini-tag.analysis { background: rgba(59, 130, 246, 0.3); color: #3b82f6; }
.arce-mini-tag.reasoning { background: rgba(245, 158, 11, 0.3); color: #f59e0b; }
.arce-mini-tag.creativity { background: rgba(16, 185, 129, 0.3); color: #10b981; }
.arce-mini-tag.evidence { background: rgba(139, 92, 246, 0.3); color: #8b5cf6; }

.plans-more {
  font-size: 0.7rem;
  color: var(--text-secondary);
  padding: 0.25rem;
}

/* Unit ARCE Section - Enhanced Design */
.unit-arce-section {
  margin-top: 1.25rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%);
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.unit-arce-section h4 {
  margin-bottom: 1rem;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
}

.unit-arce-section h4 .arce-icon {
  font-size: 1.25rem;
}

/* ARCE Focus Badges */
.arce-focus-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.arce-focus-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}

.arce-focus-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.arce-focus-tag .arce-letter {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.75rem;
}

.arce-focus-tag.analysis { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.arce-focus-tag.analysis .arce-letter { background: #3b82f6; color: white; }
.arce-focus-tag.reasoning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.arce-focus-tag.reasoning .arce-letter { background: #f59e0b; color: white; }
.arce-focus-tag.creativity { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.arce-focus-tag.creativity .arce-letter { background: #10b981; color: white; }
.arce-focus-tag.evidence { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
.arce-focus-tag.evidence .arce-letter { background: #8b5cf6; color: white; }

/* ARCE Distribution Grid */
.arce-distribution-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

@media (max-width: 768px) {
  .arce-distribution-grid {
    grid-template-columns: 1fr;
  }
}

.arce-distribution-item {
  padding: 0.875rem;
  border-radius: 10px;
  background: var(--bg-primary);
  border-left: 4px solid;
  transition: transform 0.2s, box-shadow 0.2s;
}

.arce-distribution-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.arce-distribution-item.analysis { border-left-color: #3b82f6; }
.arce-distribution-item.reasoning { border-left-color: #f59e0b; }
.arce-distribution-item.creativity { border-left-color: #10b981; }
.arce-distribution-item.evidence { border-left-color: #8b5cf6; }

.arce-item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.arce-item-icon {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.8rem;
  color: white;
}

.arce-item-icon.analysis { background: linear-gradient(135deg, #3b82f6, #60a5fa); }
.arce-item-icon.reasoning { background: linear-gradient(135deg, #f59e0b, #fbbf24); }
.arce-item-icon.creativity { background: linear-gradient(135deg, #10b981, #34d399); }
.arce-item-icon.evidence { background: linear-gradient(135deg, #8b5cf6, #a78bfa); }

.arce-item-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.arce-item-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

/* ARCE Hint */
.arce-hint {
  padding: 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 8px;
  margin-top: 0.75rem;
}

.arce-hint p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* ARCE Placeholder */
.unit-arce-placeholder {
  margin-top: 1.25rem;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 2px dashed var(--border-color);
  text-align: center;
}

.arce-placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.arce-placeholder-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.arce-placeholder-text {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.arce-placeholder-content p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.unit-arce-section h4 {
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}

.arce-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.arce-unit-item {
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--bg-secondary);
}

.arce-unit-item.analysis { border-left: 3px solid #3b82f6; }
.arce-unit-item.reasoning { border-left: 3px solid #f59e0b; }
.arce-unit-item.creativity { border-left: 3px solid #10b981; }
.arce-unit-item.evidence { border-left: 3px solid #8b5cf6; }

.arce-unit-header {
  margin-bottom: 0.5rem;
}

.arce-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.arce-badge.analysis { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.arce-badge.reasoning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.arce-badge.creativity { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.arce-badge.evidence { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }

.arce-unit-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

/* Plan ARCE Mini Badge */
.arce-mini-badge {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
}

.arce-mini-badge.analysis { background: rgba(59, 130, 246, 0.3); color: #3b82f6; }
.arce-mini-badge.reasoning { background: rgba(245, 158, 11, 0.3); color: #f59e0b; }
.arce-mini-badge.creativity { background: rgba(16, 185, 129, 0.3); color: #10b981; }
.arce-mini-badge.evidence { background: rgba(139, 92, 246, 0.3); color: #8b5cf6; }

/* Plan ARCE Focus Badge (Step 3) */
.arce-focus-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.arce-focus-badge .material-icons {
  font-size: 0.875rem;
}

.arce-focus-badge.analysis { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.arce-focus-badge.reasoning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.arce-focus-badge.creativity { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.arce-focus-badge.evidence { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }

/* Plan ARCE Preview */
.plan-arce-preview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.arce-preview-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background: var(--bg-secondary);
}

.arce-preview-item.analysis { border-left: 2px solid #3b82f6; }
.arce-preview-item.reasoning { border-left: 2px solid #f59e0b; }
.arce-preview-item.creativity { border-left: 2px solid #10b981; }
.arce-preview-item.evidence { border-left: 2px solid #8b5cf6; }

.arce-key {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 700;
  flex-shrink: 0;
}

.arce-preview-item.analysis .arce-key { background: rgba(59, 130, 246, 0.3); color: #3b82f6; }
.arce-preview-item.reasoning .arce-key { background: rgba(245, 158, 11, 0.3); color: #f59e0b; }
.arce-preview-item.creativity .arce-key { background: rgba(16, 185, 129, 0.3); color: #10b981; }
.arce-preview-item.evidence .arce-key { background: rgba(139, 92, 246, 0.3); color: #8b5cf6; }

.arce-desc-short {
  font-size: 0.7rem;
  color: var(--text-secondary);
  line-height: 1.3;
}

/* Responsive */
@media (max-width: 768px) {
  .page-content {
    padding: 1rem;
  }

  .steps-container {
    padding: 1rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .arce-grid {
    grid-template-columns: 1fr;
  }
  
  .plan-arce-preview {
    grid-template-columns: 1fr;
  }
  .arce-strategy {
    grid-template-columns: 1fr;
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }
}

/* Step 4: Learning Materials */
.materials-intro {
  display: flex;
  gap: 1.5rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(139, 92, 246, 0.05));
  border: 1px solid rgba(16, 185, 129, 0.2);
  margin-bottom: 2rem;
}

.intro-icon {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #10b981, #8b5cf6);
  border-radius: 16px;
}

.intro-icon .material-icons {
  font-size: 2rem;
  color: white;
}

.intro-content h3 {
  margin: 0 0 0.5rem;
  color: #10b981;
}

.intro-content > p {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.materials-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.materials-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
}

.materials-list .material-icons {
  font-size: 1.25rem;
  color: #8b5cf6;
}

.summary-section {
  margin-bottom: 2rem;
}

.summary-section h3 {
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #10b981;
  line-height: 1;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
  display: block;
}

.units-summary {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.unit-summary-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.unit-summary-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
}

.unit-number {
  font-size: 0.75rem;
  font-weight: 600;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.unit-name {
  font-weight: 600;
  flex: 1;
}

.plan-count-badge {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--bg-primary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.unit-plans-list {
  padding: 0.75rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.plan-mini-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.plan-number {
  color: var(--text-tertiary);
  min-width: 1.5rem;
}

.plan-topic {
  flex: 1;
}

.arce-badge {
  font-size: 0.7rem;
  font-weight: 600;
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  text-transform: uppercase;
}

.materials-actions {
  text-align: center;
  padding: 2rem;
  margin-bottom: 2rem;
}

.materials-actions h3 {
  margin: 0 0 0.5rem;
}

.materials-desc {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.action-buttons .btn-lg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1.25rem 2rem;
  min-width: 200px;
}

.action-buttons .btn-lg small {
  font-size: 0.7rem;
  opacity: 0.8;
  font-weight: normal;
}

@media (max-width: 768px) {
  .materials-intro {
    flex-direction: column;
    text-align: center;
  }
  
  .intro-icon {
    margin: 0 auto;
  }
  
  .summary-stats {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-buttons .btn-lg {
    width: 100%;
  }
}
</style>
