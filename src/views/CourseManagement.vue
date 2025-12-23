<template>
  <div class="course-management-container">
    <!-- Top Navigation -->
    <nav class="navbar card">
      <div class="nav-content">
        <h1 class="nav-title">📚 จัดการรายวิชา</h1>
        <div class="nav-actions">
          <button @click="$router.push('/teacher')" class="btn btn-secondary btn-sm">
            ← กลับ Dashboard
          </button>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="content-wrapper">
      <!-- Create Course Button -->
      <div class="actions-bar">
        <button @click="openCreateModal" class="btn btn-primary">
          ➕ สร้างรายวิชาใหม่
        </button>
      </div>

      <!-- Courses List -->
      <div class="courses-grid">
        <div v-if="loading" class="loading-state">กำลังโหลด...</div>
        <div v-else-if="courses.length === 0" class="empty-state">
          <p>📚 ยังไม่มีรายวิชา</p>
          <button @click="openCreateModal" class="btn btn-primary">สร้างรายวิชาแรก</button>
        </div>
        <div v-else v-for="course in courses" :key="course.id" class="course-card card">
          <div class="course-header">
            <h3>{{ course.courseCode }}</h3>
            <div class="course-actions">
              <button @click="viewCourse(course)" class="icon-btn" title="ดูรายละเอียด">👁️</button>
              <button @click="editCourse(course)" class="icon-btn" title="แก้ไข">✏️</button>
              <button @click="deleteCourse(course)" class="icon-btn" title="ลบ">🗑️</button>
            </div>
          </div>
          <h4 class="course-name">{{ course.courseName }}</h4>
          <p class="course-description">{{ course.courseDescription }}</p>
          <div class="course-stats">
            <span>📝 {{ course.learningOutcomes?.length || 0 }} LO</span>
            <span>👥 {{ course.studentCount || 0 }} นักเรียน</span>
          </div>
          
          <!-- Curriculum Actions -->
          <div class="curriculum-actions">
            <button 
              v-if="course.curriculum"
              @click="viewCurriculum(course)" 
              class="btn btn-outline btn-sm"
            >
              📋 ดูโครงสร้าง
            </button>
            <router-link 
              :to="{ path: '/curriculum-designer', query: { courseId: course.id } }"
              class="btn btn-primary btn-sm"
            >
              {{ course.curriculum ? '✏️ แก้ไข Curriculum' : '🎯 สร้าง Curriculum' }}
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Curriculum View Modal -->
    <div v-if="showCurriculumModal" class="modal" @click.self="closeCurriculumModal">
      <div class="modal-content card modal-large">
        <div class="modal-header">
          <h2>📋 โครงสร้างรายวิชา: {{ selectedCurriculumCourse?.courseCode }}</h2>
          <button @click="closeCurriculumModal" class="close-btn">✕</button>
        </div>
        
        <div v-if="selectedCurriculumCourse?.curriculum" class="curriculum-view">
          <!-- Settings -->
          <div class="curriculum-section">
            <h3>⚙️ การตั้งค่า</h3>
            <div class="settings-grid">
              <div class="setting-item">
                <span class="label">ภาคเรียน:</span>
                <span class="value">{{ selectedCurriculumCourse.curriculum.settings?.semester }}</span>
              </div>
              <div class="setting-item">
                <span class="label">ปีการศึกษา:</span>
                <span class="value">{{ selectedCurriculumCourse.curriculum.settings?.academicYear }}</span>
              </div>
              <div class="setting-item">
                <span class="label">หน่วยกิต:</span>
                <span class="value">{{ selectedCurriculumCourse.curriculum.settings?.credits }} น.ก.</span>
              </div>
              <div class="setting-item">
                <span class="label">ชั่วโมงรวม:</span>
                <span class="value">{{ selectedCurriculumCourse.curriculum.settings?.totalHours }} ชม.</span>
              </div>
            </div>
          </div>
          
          <!-- Units -->
          <div class="curriculum-section">
            <h3>📚 หน่วยการเรียนรู้ ({{ selectedCurriculumCourse.curriculum.units?.length || 0 }} หน่วย)</h3>
            <div class="units-list">
              <div v-for="(unit, idx) in selectedCurriculumCourse.curriculum.units" :key="idx" class="unit-card">
                <div class="unit-header">
                  <h4>หน่วยที่ {{ idx + 1 }}: {{ stripRedundantPrefix(unit.name) }}</h4>
                  <span class="unit-periods">{{ unit.periods }} คาบ</span>
                </div>
                <div class="unit-los" v-if="unit.los?.length">
                  <span class="los-label">LOs:</span>
                  <span v-for="lo in unit.los" :key="lo" class="lo-badge">{{ lo }}</span>
                </div>
                <div class="unit-essential" v-if="unit.essentialContent">
                  <strong>สาระสำคัญ:</strong> {{ unit.essentialContent }}
                </div>
                <div class="plans-summary" v-if="unit.plans?.length">
                  <strong>แผนการสอน ({{ unit.plans.length }} แผน):</strong>
                  <ul class="plans-list-mini">
                    <li v-for="(plan, pIdx) in unit.plans" :key="pIdx">
                      <span :class="['status-dot', plan.status]"></span>
                      {{ plan.topic }} ({{ plan.periods || 2 }} คาบ)
                      <span v-if="plan.id" class="plan-link" @click="goToLessonPlan(plan.id)">ดูแผน →</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <router-link 
            :to="{ path: '/curriculum-designer', query: { courseId: selectedCurriculumCourse?.id } }"
            class="btn btn-primary"
          >
            ✏️ แก้ไข Curriculum
          </router-link>
          <button @click="closeCurriculumModal" class="btn btn-secondary">ปิด</button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-content card modal-large">
        <div class="modal-header">
          <h2>{{ isEditing ? 'แก้ไขรายวิชา' : 'สร้างรายวิชาใหม่' }}</h2>
          <button @click="closeModal" class="close-btn">✕</button>
        </div>

        <!-- Preset Course Selector (เฉพาะสร้างใหม่) -->
        <div v-if="!isEditing" class="preset-section">
          <div class="preset-header">
            <h3>📋 เลือกรายวิชาตามหลักสูตรแกนกลาง</h3>
            <p class="preset-subtitle">เลือกรายวิชาสำเร็จรูปที่ตรงกับหลักสูตรแกนกลาง พ.ศ. 2551 (ฉบับปรับปรุง 2560)</p>
          </div>
          
          <div class="preset-filters">
            <div class="filter-group">
              <label>ระดับการศึกษา</label>
              <select v-model="presetEducationLevel" @change="onPresetLevelChange" class="form-select">
                <option value="">-- เลือกระดับ --</option>
                <option v-for="level in educationLevels" :key="level" :value="level">{{ level }}</option>
              </select>
            </div>
            <div class="filter-group">
              <label>กลุ่มสาระ</label>
              <select v-model="presetSubjectGroup" @change="loadPresetCourses" class="form-select" :disabled="!presetEducationLevel">
                <option value="">-- เลือกกลุ่มสาระ --</option>
                <option v-for="group in presetSubjectGroups" :key="group" :value="group">{{ group }}</option>
              </select>
            </div>
          </div>

          <!-- รายวิชาสำเร็จรูป -->
          <div v-if="presetCoursesList.length > 0" class="preset-courses-list">
            <div 
              v-for="preset in presetCoursesList" 
              :key="preset.courseCode"
              class="preset-course-item"
              :class="{ selected: selectedPreset?.courseCode === preset.courseCode }"
              @click="selectPresetCourse(preset)"
            >
              <div class="preset-info">
                <span class="preset-code">{{ preset.courseCode }}</span>
                <span class="preset-name">{{ preset.courseName }}</span>
                <span class="preset-grade">{{ preset.gradeLevel }}</span>
                <span v-if="preset.semester" class="preset-semester">ภาคเรียนที่ {{ preset.semester }}</span>
              </div>
              <div class="preset-meta">
                <span v-if="preset.credits" class="preset-credits">{{ preset.credits }} หน่วยกิต</span>
                <span class="preset-hours">{{ preset.totalHours }} ชม.</span>
              </div>
            </div>
          </div>

          <div class="preset-divider">
            <span>หรือ กรอกข้อมูลเอง</span>
          </div>
        </div>

        <form @submit.prevent="saveCourse" class="course-form">
          <!-- ประเภทรายวิชา -->
          <div class="form-group course-type-section">
            <label>ประเภทรายวิชา <span class="required">*</span></label>
            <div class="course-type-options">
              <label class="course-type-option" :class="{ active: formData.courseType === 'basic' }">
                <input type="radio" v-model="formData.courseType" value="basic" />
                <div class="option-content">
                  <span class="option-icon">📘</span>
                  <div class="option-text">
                    <span class="option-title">รายวิชาพื้นฐาน</span>
                    <span class="option-desc">ตามหลักสูตรแกนกลางฯ - ทุกคนต้องเรียน</span>
                  </div>
                </div>
              </label>
              <label class="course-type-option" :class="{ active: formData.courseType === 'elective' }">
                <input type="radio" v-model="formData.courseType" value="elective" />
                <div class="option-content">
                  <span class="option-icon">📗</span>
                  <div class="option-text">
                    <span class="option-title">รายวิชาเพิ่มเติม</span>
                    <span class="option-desc">ครูออกแบบเอง - ยืดหยุ่นได้</span>
                  </div>
                </div>
              </label>
            </div>
            <p v-if="formData.courseType === 'basic'" class="form-hint hint-warning">
              ⚠️ รายวิชาพื้นฐาน: ต้องใช้มาตรฐาน/ตัวชี้วัดตามหลักสูตรแกนกลางฯ อย่างเคร่งครัด
            </p>
            <p v-else class="form-hint hint-info">
              💡 รายวิชาเพิ่มเติม: ครูสามารถกำหนดเนื้อหาและตัวชี้วัดได้เอง
            </p>
          </div>

          <!-- รหัสวิชา -->
          <div class="form-group">
            <label>รหัสวิชา <span class="required">*</span></label>
            <input
              v-model="formData.courseCode"
              type="text"
              placeholder="เช่น ว30297"
              required
              class="form-input"
            />
          </div>

          <!-- ชื่อวิชา -->
          <div class="form-group">
            <label>ชื่อวิชา <span class="required">*</span></label>
            <input
              v-model="formData.courseName"
              type="text"
              placeholder="เช่น วิทยาการคำนวณ"
              required
              class="form-input"
            />
          </div>

          <!-- ระดับชั้น + กลุ่มสาระ -->
          <div class="form-row">
            <div class="form-group">
              <label>ระดับชั้น <span class="required">*</span></label>
              <select v-model="formData.gradeLevel" required class="form-select">
                <option value="">เลือกระดับชั้น</option>
                <option value="ป.1">ป.1</option>
                <option value="ป.2">ป.2</option>
                <option value="ป.3">ป.3</option>
                <option value="ป.4">ป.4</option>
                <option value="ป.5">ป.5</option>
                <option value="ป.6">ป.6</option>
                <option value="ม.1">ม.1</option>
                <option value="ม.2">ม.2</option>
                <option value="ม.3">ม.3</option>
                <option value="ม.4">ม.4</option>
                <option value="ม.5">ม.5</option>
                <option value="ม.6">ม.6</option>
              </select>
            </div>
            <div class="form-group">
              <label>กลุ่มสาระ <span class="required">*</span></label>
              <select v-model="formData.subjectGroup" required class="form-select" @change="onSubjectGroupChange">
                <option value="">เลือกกลุ่มสาระ</option>
                <option value="ภาษาไทย">ภาษาไทย</option>
                <option value="คณิตศาสตร์">คณิตศาสตร์</option>
                <option value="วิทยาศาสตร์และเทคโนโลยี">วิทยาศาสตร์และเทคโนโลยี</option>
                <option value="วิทยาศาสตร์และเทคโนโลยี(งานคอมพิวเตอร์)">วิทยาศาสตร์และเทคโนโลยี (งานคอมพิวเตอร์)</option>
                <option value="สังคมศึกษา ศาสนา และวัฒนธรรม">สังคมศึกษา ศาสนา และวัฒนธรรม</option>
                <option value="สุขศึกษาและพลศึกษา">สุขศึกษาและพลศึกษา</option>
                <option value="ศิลปะ">ศิลปะ</option>
                <option value="การงานอาชีพ">การงานอาชีพ</option>
                <option value="ภาษาต่างประเทศ">ภาษาต่างประเทศ</option>
              </select>
            </div>
          </div>

          <!-- มาตรฐานการเรียนรู้ (ตามหลักสูตรแกนกลางฯ) -->
          <div class="form-group" v-if="formData.subjectGroup">
            <label>มาตรฐานการเรียนรู้ <span class="required">*</span></label>
            <div class="standards-selection">
              <div v-for="standard in availableStandards" :key="standard.code" 
                   class="standard-checkbox"
                   :class="{ selected: formData.selectedStandards?.includes(standard.code) }">
                <label>
                  <input 
                    type="checkbox" 
                    :value="standard.code" 
                    v-model="formData.selectedStandards"
                    @change="onStandardOrGradeChange"
                  />
                  <span class="standard-code">{{ standard.code }}</span>
                  <span class="standard-name">{{ standard.name }}</span>
                </label>
                <p class="standard-desc">{{ standard.description }}</p>
              </div>
            </div>
            <p class="form-hint">เลือกมาตรฐานที่เกี่ยวข้องกับรายวิชานี้ (เลือกได้หลายมาตรฐาน)</p>
          </div>

          <!-- ตัวชี้วัด (ตามหลักสูตรแกนกลางฯ) - บังคับสำหรับรายวิชาพื้นฐาน -->
          <div class="form-group" v-if="formData.selectedStandards?.length && formData.gradeLevel">
            <label>
              ตัวชี้วัด 
              <span v-if="formData.courseType === 'basic'" class="required">*</span>
              <span class="indicator-type-badge">ตามหลักสูตรแกนกลาง {{ formData.gradeLevel }}</span>
            </label>
            
            <div v-if="availableIndicators.length === 0" class="no-indicators-warning">
              <span class="material-icons">info</span>
              <span>ยังไม่มีข้อมูลตัวชี้วัดสำหรับมาตรฐานและระดับชั้นที่เลือก</span>
            </div>
            
            <div v-else class="indicators-selection">
              <div v-for="group in availableIndicators" :key="group.standardCode" class="indicator-group">
                <h5 class="indicator-group-title">{{ group.standardCode }}</h5>
                <div class="indicator-list">
                  <label v-for="indicator in group.indicators" :key="indicator.code" 
                         class="indicator-checkbox"
                         :class="{ selected: formData.selectedIndicators?.includes(indicator.code) }">
                    <input 
                      type="checkbox" 
                      :value="indicator.code" 
                      v-model="formData.selectedIndicators"
                    />
                    <span class="indicator-code">{{ indicator.code }}</span>
                    <span class="indicator-desc">{{ indicator.description }}</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div class="indicator-actions" v-if="availableIndicators.length > 0">
              <button type="button" class="btn btn-outline btn-sm" @click="selectAllIndicators">
                เลือกทั้งหมด
              </button>
              <button type="button" class="btn btn-outline btn-sm" @click="clearAllIndicators">
                ล้างทั้งหมด
              </button>
            </div>
            
            <p v-if="formData.courseType === 'basic'" class="form-hint hint-warning">
              ⚠️ รายวิชาพื้นฐาน: ต้องเลือกตัวชี้วัดตามหลักสูตรแกนกลางอย่างเคร่งครัด
            </p>
            <p v-else class="form-hint">
              💡 รายวิชาเพิ่มเติม: สามารถเลือกตัวชี้วัดที่เกี่ยวข้องได้ตามความเหมาะสม
            </p>
          </div>

          <!-- สมรรถนะสำคัญของผู้เรียน -->
          <div class="form-group">
            <label>สมรรถนะสำคัญของผู้เรียน <span v-if="formData.courseType === 'basic'" class="required">*</span></label>
            <div class="competencies-grid">
              <label v-for="(comp, key) in KEY_COMPETENCIES" :key="key" 
                     class="competency-checkbox"
                     :class="{ selected: formData.keyCompetencies?.includes(key) }">
                <input 
                  type="checkbox" 
                  :value="key" 
                  v-model="formData.keyCompetencies"
                />
                <span class="comp-icon">{{ comp.icon }}</span>
                <span class="comp-name">{{ comp.name }}</span>
              </label>
            </div>
            <p class="form-hint">ตามหลักสูตรแกนกลางฯ กำหนด 5 สมรรถนะสำคัญ</p>
          </div>

          <!-- คุณลักษณะอันพึงประสงค์ -->
          <div class="form-group">
            <label>คุณลักษณะอันพึงประสงค์ <span v-if="formData.courseType === 'basic'" class="required">*</span></label>
            <div class="characteristics-grid">
              <label v-for="(char, key) in DESIRED_CHARACTERISTICS" :key="key" 
                     class="characteristic-checkbox"
                     :class="{ selected: formData.desiredCharacteristics?.includes(key) }">
                <input 
                  type="checkbox" 
                  :value="key" 
                  v-model="formData.desiredCharacteristics"
                />
                <span class="char-icon">{{ char.icon }}</span>
                <span class="char-name">{{ char.name }}</span>
              </label>
            </div>
            <p class="form-hint">ตามหลักสูตรแกนกลางฯ กำหนด 8 คุณลักษณะอันพึงประสงค์</p>
          </div>

          <!-- หน่วยกิต + ชั่วโมง -->
          <div class="form-row">
            <div class="form-group">
              <label>หน่วยกิต <span class="required">*</span></label>
              <select v-model="formData.credits" required class="form-select" @change="onCreditsChange">
                <option value="">เลือก</option>
                <option :value="0.5">0.5 น.ก.</option>
                <option :value="1">1.0 น.ก.</option>
                <option :value="1.5">1.5 น.ก.</option>
                <option :value="2">2.0 น.ก.</option>
                <option :value="2.5">2.5 น.ก.</option>
                <option :value="3">3.0 น.ก.</option>
              </select>
            </div>
            <div class="form-group">
              <label>ชั่วโมงเรียน <span class="required">*</span></label>
              <select v-model="formData.totalHours" required class="form-select">
                <option value="">เลือก</option>
                <option :value="20">20 ชม./ภาคเรียน</option>
                <option :value="40">40 ชม./ภาคเรียน</option>
                <option :value="60">60 ชม./ภาคเรียน</option>
                <option :value="80">80 ชม./ภาคเรียน</option>
                <option :value="120">120 ชม./ภาคเรียน</option>
              </select>
            </div>
          </div>

          <!-- คำอธิบายรายวิชา -->
          <div class="form-group">
            <label>คำอธิบายรายวิชา <span class="required">*</span></label>
            <textarea
              v-model="formData.courseDescription"
              rows="4"
              placeholder="อธิบายเนื้อหาและวัตถุประสงค์ของรายวิชา"
              required
              class="form-textarea"
            ></textarea>
          </div>

          <!-- Generate LO Button -->
          <div class="generate-section">
            <button
              type="button"
              @click="generateLO"
              :disabled="generatingLO || !formData.courseDescription || !formData.selectedStandards?.length"
              class="btn btn-secondary btn-block"
            >
              {{ generatingLO ? '🤖 กำลัง Generate LO...' : '🤖 Generate Learning Outcomes (LO) ด้วย AI' }}
            </button>
            <p class="form-hint" v-if="!formData.selectedStandards?.length">⚠️ กรุณาเลือกมาตรฐานการเรียนรู้ก่อน</p>
          </div>

          <!-- Learning Outcomes -->
          <div v-if="formData.learningOutcomes.length > 0" class="lo-section">
            <h3>📋 Learning Outcomes (LO)</h3>
            <div v-for="(lo, index) in formData.learningOutcomes" :key="index" class="lo-item">
              <div class="lo-header">
                <strong>{{ lo.code }}</strong>
                <button type="button" @click="removeLO(index)" class="icon-btn-small">✕</button>
              </div>
              <p>{{ lo.description }}</p>
              <div class="lo-meta">
                <span class="badge">{{ lo.category }}</span>
                <span class="badge">{{ lo.bloomLevel }}</span>
              </div>
            </div>

            <!-- Add Custom LO -->
            <button type="button" @click="addCustomLO" class="btn btn-secondary btn-sm">
              ➕ เพิ่ม LO เอง
            </button>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="error-message">⚠️ {{ error }}</div>

          <!-- Submit Buttons -->
          <div class="form-actions">
            <button type="button" @click="closeModal" class="btn btn-secondary">
              ยกเลิก
            </button>
            <button
              type="submit"
              :disabled="saving || formData.learningOutcomes.length === 0"
              class="btn btn-primary"
            >
              {{ saving ? 'กำลังบันทึก...' : (isEditing ? 'บันทึกการแก้ไข' : 'สร้างรายวิชา') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- View Course Modal -->
    <div v-if="viewingCourse" class="modal" @click.self="viewingCourse = null">
      <div class="modal-content card">
        <div class="modal-header">
          <h2>{{ viewingCourse.courseCode }} - {{ viewingCourse.courseName }}</h2>
          <button @click="viewingCourse = null" class="close-btn">✕</button>
        </div>
        <div class="course-details">
          <section>
            <h3>📖 คำอธิบายรายวิชา</h3>
            <p>{{ viewingCourse.courseDescription }}</p>
          </section>
          <section>
            <h3>🎯 มาตรฐานการเรียนรู้</h3>
            <p>{{ viewingCourse.learningStandards }}</p>
          </section>
          <section>
            <h3>📋 Learning Outcomes ({{ viewingCourse.learningOutcomes?.length || 0 }} ข้อ)</h3>
            <div v-for="(lo, index) in viewingCourse.learningOutcomes" :key="index" class="lo-item">
              <strong>{{ lo.code }}</strong>
              <p>{{ lo.description }}</p>
              <div class="lo-meta">
                <span class="badge">{{ lo.category }}</span>
                <span class="badge">{{ lo.bloomLevel }}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- Custom LO Modal -->
    <div v-if="showCustomLOModal" class="modal" @click.self="showCustomLOModal = false">
      <div class="modal-content card modal-sm">
        <div class="modal-header">
          <h2>เพิ่ม Learning Outcome</h2>
          <button @click="showCustomLOModal = false" class="close-btn">✕</button>
        </div>
        <form @submit.prevent="saveCustomLO" class="course-form">
          <div class="form-group">
            <label>รหัส LO</label>
            <input v-model="customLO.code" type="text" placeholder="LO1" required class="form-input" />
          </div>
          <div class="form-group">
            <label>คำอธิบาย</label>
            <textarea v-model="customLO.description" rows="3" required class="form-textarea"></textarea>
          </div>
          <div class="form-group">
            <label>หมวดหมู่</label>
            <select v-model="customLO.category" required class="form-select">
              <option value="ความรู้">ความรู้</option>
              <option value="ทักษะ">ทักษะ</option>
              <option value="คุณลักษณะ">คุณลักษณะ</option>
            </select>
          </div>
          <div class="form-group">
            <label>Bloom's Level</label>
            <select v-model="customLO.bloomLevel" required class="form-select">
              <option value="จำ">จำ (Remember)</option>
              <option value="เข้าใจ">เข้าใจ (Understand)</option>
              <option value="ประยุกต์">ประยุกต์ (Apply)</option>
              <option value="วิเคราะห์">วิเคราะห์ (Analyze)</option>
              <option value="ประเมิน">ประเมิน (Evaluate)</option>
              <option value="สร้างสรรค์">สร้างสรรค์ (Create)</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" @click="showCustomLOModal = false" class="btn btn-secondary">ยกเลิก</button>
            <button type="submit" class="btn btn-primary">เพิ่ม</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { getStandardsBySubjectGroup, getPresetCourses, getEducationLevels, getSubjectGroupsByLevel, COURSE_TYPES, KEY_COMPETENCIES, DESIRED_CHARACTERISTICS, getIndicators } from '@/constants/curriculumStandards'

const router = useRouter()
const authStore = useAuthStore()

const courses = ref([])
const loading = ref(false)
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const viewingCourse = ref(null)
const showCustomLOModal = ref(false)
const generatingLO = ref(false)
const saving = ref(false)
const error = ref('')

// Curriculum Modal
const showCurriculumModal = ref(false)
const selectedCurriculumCourse = ref(null)

// Preset Course Selection
const presetEducationLevel = ref('')
const presetSubjectGroup = ref('')
const presetCoursesList = ref([])
const selectedPreset = ref(null)

// Computed: ระดับการศึกษาทั้งหมด
const educationLevels = computed(() => getEducationLevels())

// Computed: กลุ่มสาระตามระดับการศึกษา
const presetSubjectGroups = computed(() => {
  if (!presetEducationLevel.value) return []
  return getSubjectGroupsByLevel(presetEducationLevel.value)
})

const formData = ref({
  courseCode: '',
  courseName: '',
  gradeLevel: '',
  subjectGroup: '',
  credits: '',
  totalHours: '',
  courseDescription: '',
  learningStandards: '',
  selectedStandards: [],
  selectedIndicators: [], // ตัวชี้วัดที่เลือก
  learningOutcomes: [],
  courseType: 'basic', // 'basic' = รายวิชาพื้นฐาน, 'elective' = รายวิชาเพิ่มเติม
  keyCompetencies: [], // สมรรถนะสำคัญของผู้เรียน
  desiredCharacteristics: [] // คุณลักษณะอันพึงประสงค์
})

// Computed: มาตรฐานที่สามารถเลือกได้ตามกลุ่มสาระ
const availableStandards = computed(() => {
  if (!formData.value.subjectGroup) return []
  return getStandardsBySubjectGroup(formData.value.subjectGroup)
})

// Computed: ตัวชี้วัดที่สามารถเลือกได้ตามมาตรฐานและระดับชั้น
const availableIndicators = computed(() => {
  if (!formData.value.selectedStandards?.length || !formData.value.gradeLevel) return []
  
  const allIndicators = []
  for (const stdCode of formData.value.selectedStandards) {
    const indicators = getIndicators(stdCode, formData.value.gradeLevel)
    if (indicators?.length) {
      allIndicators.push({
        standardCode: stdCode,
        indicators: indicators
      })
    }
  }
  return allIndicators
})

// เมื่อเปลี่ยนกลุ่มสาระ ให้ล้างมาตรฐานและตัวชี้วัดที่เลือกไว้
function onSubjectGroupChange() {
  formData.value.selectedStandards = []
  formData.value.selectedIndicators = []
}

// เมื่อเปลี่ยนมาตรฐาน/ระดับชั้น ให้ล้างตัวชี้วัดที่เลือกไว้
function onStandardOrGradeChange() {
  formData.value.selectedIndicators = []
}

// เลือกตัวชี้วัดทั้งหมด
function selectAllIndicators() {
  const allCodes = []
  for (const group of availableIndicators.value) {
    for (const indicator of group.indicators) {
      allCodes.push(indicator.code)
    }
  }
  formData.value.selectedIndicators = allCodes
}

// ล้างตัวชี้วัดทั้งหมด
function clearAllIndicators() {
  formData.value.selectedIndicators = []
}

const customLO = ref({
  code: '',
  description: '',
  category: 'ความรู้',
  bloomLevel: 'วิเคราะห์'
})

onMounted(() => {
  loadCourses()
})

async function loadCourses() {
  try {
    loading.value = true
    const coursesQuery = query(
      collection(db, 'courses'),
      where('teacherId', '==', authStore.user.uid)
    )
    const snapshot = await getDocs(coursesQuery)
    courses.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (err) {
    console.error('Load courses error:', err)
    error.value = 'ไม่สามารถโหลดรายวิชาได้'
  } finally {
    loading.value = false
  }
}

// Auto-update hours when credits change
function onCreditsChange() {
  const creditHoursMap = { 0.5: 20, 1: 40, 1.5: 60, 2: 80, 2.5: 100, 3: 120 }
  if (formData.value.credits && !formData.value.totalHours) {
    formData.value.totalHours = creditHoursMap[formData.value.credits] || 40
  }
}

function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  formData.value = {
    courseCode: '',
    courseName: '',
    gradeLevel: '',
    subjectGroup: '',
    credits: '',
    totalHours: '',
    courseDescription: '',
    learningStandards: '',
    selectedStandards: [],
    selectedIndicators: [],
    learningOutcomes: [],
    courseType: 'basic',
    keyCompetencies: [],
    desiredCharacteristics: []
  }
  // Reset preset selection
  presetEducationLevel.value = ''
  presetSubjectGroup.value = ''
  presetCoursesList.value = []
  selectedPreset.value = null
  showModal.value = true
}

// Preset Course Functions
function onPresetLevelChange() {
  presetSubjectGroup.value = ''
  presetCoursesList.value = []
  selectedPreset.value = null
}

function loadPresetCourses() {
  if (presetEducationLevel.value && presetSubjectGroup.value) {
    presetCoursesList.value = getPresetCourses(presetEducationLevel.value, presetSubjectGroup.value)
  } else {
    presetCoursesList.value = []
  }
  selectedPreset.value = null
}

function selectPresetCourse(preset) {
  selectedPreset.value = preset
  
  // กรอกข้อมูลลงฟอร์มอัตโนมัติ
  formData.value.courseCode = preset.courseCode
  formData.value.courseName = preset.courseName
  formData.value.gradeLevel = preset.gradeLevel
  formData.value.subjectGroup = presetSubjectGroup.value
  formData.value.credits = preset.credits || ''
  formData.value.totalHours = preset.totalHours || ''
  formData.value.selectedStandards = preset.standards || []
  
  // กำหนดประเภทรายวิชา: preset courses ทั้งหมดเป็นรายวิชาพื้นฐาน
  formData.value.courseType = preset.courseType || 'basic'
  
  // สำหรับรายวิชาพื้นฐาน เลือกสมรรถนะและคุณลักษณะทั้งหมดโดยอัตโนมัติ
  if (formData.value.courseType === 'basic') {
    formData.value.keyCompetencies = Object.keys(KEY_COMPETENCIES)
    formData.value.desiredCharacteristics = Object.keys(DESIRED_CHARACTERISTICS)
    
    // เลือกตัวชี้วัดทั้งหมดตามมาตรฐานและระดับชั้น
    const allIndicators = []
    for (const stdCode of (preset.standards || [])) {
      const indicators = getIndicators(stdCode, preset.gradeLevel)
      for (const ind of indicators) {
        allIndicators.push(ind.code)
      }
    }
    formData.value.selectedIndicators = allIndicators
  }
  
  // สร้าง learningStandards string
  if (preset.standards && preset.standards.length > 0) {
    formData.value.learningStandards = preset.standards.join(', ')
  }
}

function editCourse(course) {
  isEditing.value = true
  editingId.value = course.id
  formData.value = {
    courseCode: course.courseCode,
    courseName: course.courseName,
    gradeLevel: course.gradeLevel || '',
    subjectGroup: course.subjectGroup || '',
    credits: course.credits || '',
    totalHours: course.totalHours || '',
    courseDescription: course.courseDescription,
    learningStandards: course.learningStandards,
    selectedStandards: course.selectedStandards || [],
    selectedIndicators: course.selectedIndicators || [],
    learningOutcomes: [...course.learningOutcomes],
    courseType: course.courseType || 'basic',
    keyCompetencies: course.keyCompetencies || [],
    desiredCharacteristics: course.desiredCharacteristics || []
  }
  showModal.value = true
}

function viewCourse(course) {
  viewingCourse.value = course
}

// ฟังก์ชันลบเอกสารทั้งหมดใน collection ที่มี courseId ตรงกัน
async function deleteCollectionByCourseId(collectionName, courseId) {
  const q = query(collection(db, collectionName), where('courseId', '==', courseId))
  const snapshot = await getDocs(q)
  const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, collectionName, docSnap.id)))
  await Promise.all(deletePromises)
  return snapshot.size
}

// ฟังก์ชันลบเอกสารที่มี teacherId ตรงกับครูปัจจุบันและ courseId ตรงกัน
async function deleteCollectionByTeacherAndCourse(collectionName, courseId) {
  const teacherId = authStore.user.uid
  const q = query(
    collection(db, collectionName), 
    where('courseId', '==', courseId),
    where('teacherId', '==', teacherId)
  )
  const snapshot = await getDocs(q)
  const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, collectionName, docSnap.id)))
  await Promise.all(deletePromises)
  return snapshot.size
}

// ฟังก์ชันลบ messages ที่อยู่ใน sessions
async function deleteMessagesBySessionIds(sessionIds) {
  let totalDeleted = 0
  for (const sessionId of sessionIds) {
    const q = query(collection(db, 'messages'), where('sessionId', '==', sessionId))
    const snapshot = await getDocs(q)
    const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'messages', docSnap.id)))
    await Promise.all(deletePromises)
    totalDeleted += snapshot.size
  }
  return totalDeleted
}

// ฟังก์ชันลบ studentProgress ที่มี pattern *_courseId
async function deleteStudentProgressByCourseId(courseId) {
  // studentProgress ใช้ composite ID: {studentId}_{courseId}
  // ต้อง query โดยใช้ courseId field หรือ list ทั้งหมดแล้ว filter
  const q = query(collection(db, 'studentProgress'), where('courseId', '==', courseId))
  const snapshot = await getDocs(q)
  const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'studentProgress', docSnap.id)))
  await Promise.all(deletePromises)
  return snapshot.size
}

// ฟังก์ชันลบ worksheetSubmissions ที่เกี่ยวข้องกับ worksheets
async function deleteWorksheetSubmissions(worksheetIds) {
  let totalDeleted = 0
  for (const wsId of worksheetIds) {
    const q = query(collection(db, 'worksheetSubmissions'), where('worksheetId', '==', wsId))
    const snapshot = await getDocs(q)
    const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'worksheetSubmissions', docSnap.id)))
    await Promise.all(deletePromises)
    totalDeleted += snapshot.size
  }
  return totalDeleted
}

async function deleteCourse(course) {
  const confirmMsg = `⚠️ ต้องการลบรายวิชา "${course.courseCode} - ${course.courseName}" ?\n\n` +
    `การลบจะรวมถึง:\n` +
    `• คำถามทั้งหมดในคลังคำถาม\n` +
    `• แผนการสอนและหน่วยการเรียนรู้\n` +
    `• ใบงานอิเล็กทรอนิกส์และผลส่ง\n` +
    `• ใบความรู้\n` +
    `• ประวัติการประเมินนักเรียน\n` +
    `• ความคืบหน้า LO ของนักเรียน\n\n` +
    `⛔ การดำเนินการนี้ไม่สามารถย้อนกลับได้!`
  
  if (!confirm(confirmMsg)) return
  
  // ยืนยันอีกครั้ง
  if (!confirm(`ยืนยันอีกครั้ง: ลบรายวิชา "${course.courseName}" และข้อมูลทั้งหมดที่เกี่ยวข้อง?`)) return
  
  try {
    loading.value = true
    error.value = ''
    const courseId = course.id
    const deletionLog = []
    console.log('🗑️ Starting cascade delete for course:', courseId)

    // 1. ลบ questions
    const questionsDeleted = await deleteCollectionByCourseId('questions', courseId)
    deletionLog.push(`คำถาม: ${questionsDeleted}`)
    console.log(`🗑️ Deleted questions: ${questionsDeleted}`)

    // 2. ลบ sessions และ messages
    const sessionsQuery = query(collection(db, 'sessions'), where('courseId', '==', courseId))
    const sessionsSnapshot = await getDocs(sessionsQuery)
    const sessionIds = sessionsSnapshot.docs.map(d => d.id)
    
    if (sessionIds.length > 0) {
      const messagesDeleted = await deleteMessagesBySessionIds(sessionIds)
      deletionLog.push(`ข้อความ: ${messagesDeleted}`)
      console.log(`🗑️ Deleted messages: ${messagesDeleted}`)
      
      // ลบ sessions
      const sessionDeletePromises = sessionsSnapshot.docs.map(docSnap => 
        deleteDoc(doc(db, 'sessions', docSnap.id))
      )
      await Promise.all(sessionDeletePromises)
      deletionLog.push(`เซสชัน: ${sessionIds.length}`)
      console.log(`🗑️ Deleted sessions: ${sessionIds.length}`)
    }

    // 3. ลบ assessments
    const assessmentsDeleted = await deleteCollectionByCourseId('assessments', courseId)
    deletionLog.push(`การประเมิน: ${assessmentsDeleted}`)
    console.log(`🗑️ Deleted assessments: ${assessmentsDeleted}`)

    // 4. ลบ studentProgress
    const progressDeleted = await deleteStudentProgressByCourseId(courseId)
    deletionLog.push(`ความคืบหน้า: ${progressDeleted}`)
    console.log(`🗑️ Deleted studentProgress: ${progressDeleted}`)

    // 5. ลบ lessonPlans (ต้องใช้ teacherId เพราะ rules ต้องการ)
    const lessonPlansDeleted = await deleteCollectionByTeacherAndCourse('lessonPlans', courseId)
    deletionLog.push(`แผนการสอน: ${lessonPlansDeleted}`)
    console.log(`🗑️ Deleted lessonPlans: ${lessonPlansDeleted}`)

    // 6. ลบ eWorksheets และ worksheetSubmissions (ต้องใช้ teacherId)
    const teacherId = authStore.user.uid
    const worksheetsQuery = query(
      collection(db, 'eWorksheets'), 
      where('courseId', '==', courseId),
      where('teacherId', '==', teacherId)
    )
    const worksheetsSnapshot = await getDocs(worksheetsQuery)
    const worksheetIds = worksheetsSnapshot.docs.map(d => d.id)
    
    if (worksheetIds.length > 0) {
      const submissionsDeleted = await deleteWorksheetSubmissions(worksheetIds)
      deletionLog.push(`ผลส่งใบงาน: ${submissionsDeleted}`)
      console.log(`🗑️ Deleted worksheetSubmissions: ${submissionsDeleted}`)
      
      // ลบ worksheets
      const wsDeletePromises = worksheetsSnapshot.docs.map(docSnap => 
        deleteDoc(doc(db, 'eWorksheets', docSnap.id))
      )
      await Promise.all(wsDeletePromises)
      deletionLog.push(`ใบงาน: ${worksheetIds.length}`)
      console.log(`🗑️ Deleted eWorksheets: ${worksheetIds.length}`)
    }

    // 7. ลบ knowledgeSheets (ต้องใช้ teacherId)
    const ksDeleted = await deleteCollectionByTeacherAndCourse('knowledgeSheets', courseId)
    deletionLog.push(`ใบความรู้: ${ksDeleted}`)
    console.log(`🗑️ Deleted knowledgeSheets: ${ksDeleted}`)

    // 8. ลบ learningRooms (ห้องกิจกรรม - ต้องใช้ teacherId)
    const roomsDeleted = await deleteCollectionByTeacherAndCourse('learningRooms', courseId)
    deletionLog.push(`ห้องกิจกรรม: ${roomsDeleted}`)
    console.log(`🗑️ Deleted learningRooms: ${roomsDeleted}`)

    // 9. ลบ reflections (บันทึกการสะท้อนคิด) - ใช้ try-catch เพราะอาจไม่มี rules
    try {
      const reflectionsDeleted = await deleteCollectionByCourseId('reflections', courseId)
      deletionLog.push(`บันทึกสะท้อนคิด: ${reflectionsDeleted}`)
    } catch (e) {
      console.log('⚠️ Could not delete reflections (may not exist or no permission)')
    }

    // 10. สุดท้าย ลบ course
    await deleteDoc(doc(db, 'courses', courseId))

    console.log('🗑️ Course deletion complete:', deletionLog.join(', '))
    
    await loadCourses()
    alert(`✅ ลบรายวิชาและข้อมูลที่เกี่ยวข้องเรียบร้อยแล้ว\n\n${deletionLog.join('\n')}`)
  } catch (err) {
    console.error('Delete course error:', err)
    error.value = 'ไม่สามารถลบรายวิชาได้: ' + err.message
  } finally {
    loading.value = false
  }
}

async function generateLO() {
  try {
    generatingLO.value = true
    error.value = ''

    // 🔐 Get auth token for secured endpoint
    const token = await authStore.getIdToken()
    if (!token) {
      throw new Error('กรุณาเข้าสู่ระบบใหม่')
    }

    // สร้าง learningStandards text จาก selectedStandards
    const standardsText = formData.value.selectedStandards?.length 
      ? `มาตรฐาน: ${formData.value.selectedStandards.join(', ')}`
      : ''

    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL
    const response = await fetch(`${functionsUrl}/generateLearningOutcomes`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`  // 🔐 Auth required
      },
      body: JSON.stringify({
        courseCode: formData.value.courseCode,
        courseName: formData.value.courseName,
        courseDescription: formData.value.courseDescription,
        learningStandards: standardsText,
        selectedStandards: formData.value.selectedStandards || [],
        subjectGroup: formData.value.subjectGroup,
        gradeLevel: formData.value.gradeLevel,
        courseType: formData.value.courseType
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate LO')
    }

    const result = await response.json()
    formData.value.learningOutcomes = result.learningOutcomes
    
    // Auto-fill learningStandards for backward compatibility
    formData.value.learningStandards = standardsText
  } catch (err) {
    console.error('Generate LO error:', err)
    error.value = 'ไม่สามารถ Generate LO ได้ กรุณาลองใหม่'
  } finally {
    generatingLO.value = false
  }
}

function addCustomLO() {
  customLO.value = {
    code: `LO${formData.value.learningOutcomes.length + 1}`,
    description: '',
    category: 'ความรู้',
    bloomLevel: 'วิเคราะห์'
  }
  showCustomLOModal.value = true
}

function saveCustomLO() {
  formData.value.learningOutcomes.push({ ...customLO.value })
  showCustomLOModal.value = false
}

function removeLO(index) {
  if (confirm('ต้องการลบ LO นี้?')) {
    formData.value.learningOutcomes.splice(index, 1)
  }
}

// Curriculum Modal Functions
function viewCurriculum(course) {
  selectedCurriculumCourse.value = course
  showCurriculumModal.value = true
}

function closeCurriculumModal() {
  showCurriculumModal.value = false
  selectedCurriculumCourse.value = null
}

function goToLessonPlan(planId) {
  router.push(`/lesson-plans/${planId}`)
}

// Strip redundant prefix from text
function stripRedundantPrefix(text) {
  if (!text) return text
  return text
    .replace(/^หน่วยที่\s*\d+\s*[\:\-]?\s*/i, '')
    .replace(/^แผนที่\s*\d+\s*[\:\-]?\s*/i, '')
}

async function saveCourse() {
  try {
    saving.value = true
    error.value = ''

    const courseData = {
      ...formData.value,
      teacherId: authStore.user.uid,
      teacherName: authStore.user.displayName,
      updatedAt: serverTimestamp()
    }

    if (isEditing.value) {
      await updateDoc(doc(db, 'courses', editingId.value), courseData)
    } else {
      courseData.createdAt = serverTimestamp()
      courseData.studentCount = 0
      await addDoc(collection(db, 'courses'), courseData)
    }

    await loadCourses()
    closeModal()
  } catch (err) {
    console.error('Save course error:', err)
    error.value = 'ไม่สามารถบันทึกรายวิชาได้'
  } finally {
    saving.value = false
  }
}

function closeModal() {
  showModal.value = false
  error.value = ''
}
</script>

<style scoped>
.course-management-container {
  min-height: 100vh;
  background: var(--bg-primary);
  padding-bottom: 2rem;
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  margin-bottom: 2rem;
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
}

.nav-title {
  font-size: 1.5rem;
  margin: 0;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
}

.actions-bar {
  margin-bottom: 2rem;
}

.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.course-card {
  padding: 1.5rem;
  transition: transform 0.2s;
}

.course-card:hover {
  transform: translateY(-4px);
}

.course-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.course-header h3 {
  color: var(--primary-color);
  margin: 0;
  font-size: 1.2rem;
}

.course-actions {
  display: flex;
  gap: 0.5rem;
}

.course-name {
  margin: 0.5rem 0;
  font-size: 1.1rem;
}

.course-description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 1rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.course-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  overflow-y: auto;
}

.modal-content {
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
}

.modal-sm {
  max-width: 500px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.modal-header h2 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.5rem;
}

.close-btn:hover {
  color: var(--text-color);
}

.course-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: var(--text-color);
}

.required {
  color: #ef4444;
}

.form-input,
.form-textarea,
.form-select {
  padding: 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--bg-secondary);
  color: var(--text-color);
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.generate-section {
  padding: 1rem;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 8px;
}

.btn-block {
  width: 100%;
}

.lo-section {
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.lo-section h3 {
  margin-bottom: 1rem;
}

.lo-item {
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.lo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.lo-item p {
  margin: 0.5rem 0;
  color: var(--text-secondary);
}

.lo-meta {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.badge {
  padding: 0.25rem 0.75rem;
  background: var(--primary-color);
  color: white;
  border-radius: 12px;
  font-size: 0.85rem;
}

.icon-btn-small {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.25rem;
}

.icon-btn-small:hover {
  color: #ef4444;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.error-message {
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  border-radius: 8px;
  color: #ef4444;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
}

.course-details section {
  margin-bottom: 2rem;
}

.course-details h3 {
  margin-bottom: 1rem;
  color: var(--primary-color);
}

@media (max-width: 768px) {
  .courses-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    padding: 1.5rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions button {
    width: 100%;
  }
}

/* Curriculum Actions */
.curriculum-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.curriculum-actions .btn {
  flex: 1;
  text-align: center;
  text-decoration: none;
}

/* Curriculum Modal */
.modal-large {
  max-width: 900px;
  max-height: 85vh;
  overflow-y: auto;
}

.curriculum-view {
  padding: 1rem 0;
}

.curriculum-section {
  margin-bottom: 2rem;
}

.curriculum-section h3 {
  margin-bottom: 1rem;
  color: var(--primary-color);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.setting-item .label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.setting-item .value {
  font-weight: 600;
}

.units-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.unit-card {
  padding: 1.25rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  border-left: 4px solid var(--primary-color);
}

.unit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.unit-header h4 {
  margin: 0;
  font-size: 1rem;
}

.unit-periods {
  font-size: 0.875rem;
  color: var(--text-secondary);
  background: var(--bg-primary);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.unit-los {
  margin-bottom: 0.75rem;
}

.los-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-right: 0.5rem;
}

.lo-badge {
  display: inline-block;
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  background: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
  border-radius: 8px;
  margin-right: 0.25rem;
}

.unit-essential {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.plans-summary {
  font-size: 0.875rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.plans-list-mini {
  margin: 0.5rem 0 0 1rem;
  padding: 0;
  list-style: none;
}

.plans-list-mini li {
  padding: 0.35rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6b7280;
}

.status-dot.generated {
  background: #10b981;
}

.status-dot.pending {
  background: #f59e0b;
}

.plan-link {
  color: var(--primary-color);
  cursor: pointer;
  margin-left: auto;
  font-size: 0.8rem;
}

.plan-link:hover {
  text-decoration: underline;
}

/* Standards Selection Styles */
.standards-selection {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  background: var(--bg-color);
  max-height: 250px;
  overflow-y: auto;
}

.standards-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.standard-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.standard-checkbox:hover {
  background: var(--hover-bg);
}

.standard-checkbox input[type="checkbox"] {
  margin-top: 0.15rem;
  flex-shrink: 0;
}

.standard-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.standard-code {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--primary-color);
}

.standard-name {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.no-standards {
  text-align: center;
  color: var(--text-muted);
  padding: 1rem;
  font-size: 0.9rem;
}

/* Preset Course Selection Styles */
.modal-large {
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.preset-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid var(--border-color);
}

.preset-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.preset-subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0 0 1rem 0;
}

.preset-filters {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.filter-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

.preset-courses-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
}

.preset-course-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.15s;
}

.preset-course-item:last-child {
  border-bottom: none;
}

.preset-course-item:hover {
  background: var(--hover-bg);
}

.preset-course-item.selected {
  background: rgba(16, 185, 129, 0.15);
  border-left: 3px solid #10b981;
}

.preset-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.preset-code {
  font-weight: 600;
  color: var(--primary-color);
  font-size: 0.9rem;
}

.preset-name {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.preset-grade {
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  border-radius: 4px;
}

.preset-semester {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.preset-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.preset-credits {
  color: #8b5cf6;
}

.preset-hours {
  color: #f59e0b;
}

.preset-divider {
  display: flex;
  align-items: center;
  margin-top: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.preset-divider::before,
.preset-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color);
}

.preset-divider span {
  padding: 0 1rem;
}

.modal-footer {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
  margin-top: 1rem;
}

/* Course Type Selection */
.course-type-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid var(--border-color);
}

.course-type-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 0.5rem;
}

.course-type-option {
  position: relative;
  cursor: pointer;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  transition: all 0.2s ease;
  background: var(--card-bg);
}

.course-type-option:hover {
  border-color: var(--primary);
  background: var(--hover-bg);
}

.course-type-option.active {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.1);
}

.course-type-option input[type="radio"] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.option-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.option-icon {
  font-size: 2rem;
}

.option-text {
  display: flex;
  flex-direction: column;
}

.option-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
}

.option-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.hint-warning {
  color: #f59e0b !important;
  background: rgba(245, 158, 11, 0.1);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border-left: 3px solid #f59e0b;
}

.hint-info {
  color: #3b82f6 !important;
  background: rgba(59, 130, 246, 0.1);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
}

/* Competencies Grid */
.competencies-grid,
.characteristics-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.competency-checkbox,
.characteristic-checkbox {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--card-bg);
  font-size: 0.85rem;
}

.competency-checkbox:hover,
.characteristic-checkbox:hover {
  border-color: var(--primary);
  background: var(--hover-bg);
}

.competency-checkbox.selected,
.characteristic-checkbox.selected {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.15);
  color: var(--primary);
}

.competency-checkbox input,
.characteristic-checkbox input {
  display: none;
}

.comp-icon,
.char-icon {
  font-size: 1.1rem;
}

.comp-name,
.char-name {
  font-weight: 500;
}

/* Indicators Selection */
.indicator-type-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  background: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
  border-radius: 4px;
  margin-left: 0.5rem;
  font-weight: 500;
}

.no-indicators-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  color: #f59e0b;
  font-size: 0.9rem;
}

.indicators-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.indicator-group {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
}

.indicator-group-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--primary);
  margin: 0 0 0.75rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.indicator-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.indicator-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--bg-primary);
}

.indicator-checkbox:hover {
  border-color: var(--primary);
  background: var(--hover-bg);
}

.indicator-checkbox.selected {
  border-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
}

.indicator-checkbox input[type="checkbox"] {
  margin-top: 0.2rem;
  accent-color: #8b5cf6;
}

.indicator-code {
  font-weight: 600;
  color: #8b5cf6;
  font-size: 0.8rem;
  white-space: nowrap;
  min-width: 80px;
}

.indicator-desc {
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.4;
}

.indicator-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

@media (max-width: 768px) {
  .course-type-options {
    grid-template-columns: 1fr;
  }
  
  .indicators-selection {
    max-height: 300px;
  }
}
</style>
