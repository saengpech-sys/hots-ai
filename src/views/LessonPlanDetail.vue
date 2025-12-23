<template>
  <ErrorBoundary context="LessonPlanDetail">
  <div class="lesson-plan-detail">
    <!-- Top Navigation -->
    <nav class="top-navbar">
      <div class="nav-brand">
        <router-link to="/lesson-plans" class="back-link">
          <span class="material-icons">arrow_back</span>
        </router-link>
        <span class="brand-icon">📝</span>
        <span class="brand-text">{{ plan?.title || 'แผนการจัดการเรียนรู้' }}</span>
      </div>
      <div class="nav-actions">
        <button 
          class="btn btn-outline"
          @click="printPlan"
        >
          <span class="material-icons">print</span>
          พิมพ์แผน
        </button>
        <button 
          class="btn btn-worksheet"
          @click="showCreateWorksheetModal = true"
          :disabled="generatingWorksheet"
        >
          <span class="material-icons">{{ generatingWorksheet ? 'hourglass_empty' : 'assignment' }}</span>
          {{ generatingWorksheet ? 'กำลังสร้าง...' : 'สร้างใบงาน' }}
        </button>
        <button 
          v-if="plan?.status === 'draft'"
          class="btn btn-success"
          @click="publishPlan"
          :disabled="publishing"
        >
          <span class="material-icons">publish</span>
          เผยแพร่
        </button>
        <button class="btn btn-primary" @click="editPlan">
          <span class="material-icons">edit</span>
          แก้ไข
        </button>
      </div>
    </nav>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
      <p>กำลังโหลดแผนการสอน...</p>
    </div>

    <!-- Not Found -->
    <div v-else-if="!plan" class="empty-state">
      <span class="material-icons error-icon">error_outline</span>
      <h2>ไม่พบแผนการสอน</h2>
      <p>แผนการสอนนี้อาจถูกลบหรือไม่มีอยู่ในระบบ</p>
      <router-link to="/lesson-plans" class="btn btn-primary">
        กลับหน้ารายการแผนการสอน
      </router-link>
    </div>

    <!-- Content -->
    <div v-else class="plan-detail-content" ref="printArea">
      <!-- Plan Header - Official Format -->
      <div class="official-header">
        <h1 class="plan-main-title">แผนการจัดการเรียนรู้ที่ {{ plan.header?.planNumber || plan.planNumber || 1 }}</h1>
        
        <div class="header-info-grid">
          <div class="header-row">
            <span class="label">รหัสวิชา</span>
            <span class="value">{{ plan.courseCode || plan.header?.courseCode || '-' }}</span>
            <span class="label">รายวิชา</span>
            <span class="value">{{ plan.courseName || plan.header?.courseName || '-' }}</span>
          </div>
          <div class="header-row">
            <span class="label">กลุ่มสาระการเรียนรู้</span>
            <span class="value full">{{ plan.subjectGroup || plan.header?.subjectGroup || 'วิทยาศาสตร์และเทคโนโลยี' }}</span>
          </div>
          <div class="header-row">
            <span class="label">ชั้น</span>
            <span class="value">{{ plan.gradeLevel || plan.header?.gradeLevel || 'ม.4' }}</span>
            <span class="label">ภาคเรียนที่</span>
            <span class="value">{{ plan.semester || plan.header?.semester || 2 }}</span>
            <span class="label">ปีการศึกษา</span>
            <span class="value">{{ plan.academicYear || plan.header?.academicYear || 2568 }}</span>
          </div>
          <div class="header-row">
            <span class="label">ครูผู้สอน</span>
            <span class="value full">{{ plan.teacherName || plan.header?.teacherName || '-' }}</span>
          </div>
          <div class="header-row">
            <span class="label">หน่วยการเรียนรู้ที่</span>
            <span class="value">{{ plan.unitNumber || plan.header?.unitNumber || 1 }}</span>
            <span class="label">ชื่อหน่วย</span>
            <span class="value">{{ stripRedundantPrefix(plan.unitName || plan.header?.unitName) || '-' }}</span>
            <span class="label">รวมเวลา</span>
            <span class="value">{{ plan.header?.unitTotalPeriods || plan.unitTotalPeriods || Math.ceil((plan.unitTotalHours || plan.header?.unitTotalHours || 4) / 50 * 60) }} คาบ</span>
          </div>
          <div class="header-row">
            <span class="label">เรื่อง</span>
            <span class="value">{{ plan.topic || plan.header?.topic || '-' }}</span>
            <span class="label">เวลา</span>
            <span class="value">{{ plan.header?.periods || 1 }} คาบ ({{ plan.duration || plan.header?.duration || 50 }} นาที)</span>
          </div>
          <div class="header-row">
            <span class="label">วิธีการสอน</span>
            <span class="value full">{{ getTeachingMethodText(plan.teachingMethod || plan.header?.teachingMethod) }}</span>
          </div>
        </div>

        <div v-if="plan.aiGenerated" class="ai-badge-header">
          <span class="material-icons">auto_awesome</span>
          สร้างโดย AI
        </div>
      </div>

      <!-- Standard & Indicators -->
      <section class="plan-section">
        <h2 class="section-title">📋 มาตรฐานการเรียนรู้และตัวชี้วัด</h2>
        
        <div class="content-box">
          <!-- Warning if no proper standards -->
          <div v-if="!plan.standard?.code && !plan.indicators?.items?.length" class="standards-warning-box">
            <span class="material-icons">warning</span>
            <div>
              <strong>⚠️ ยังไม่ได้กำหนดมาตรฐานและตัวชี้วัด</strong>
              <p>กรุณาให้ครูกำหนดมาตรฐานและตัวชี้วัดตามหลักสูตรแกนกลาง พ.ศ. 2551 ด้วยตนเอง เนื่องจากข้อมูลต้องถูกต้องตรงตามเอกสารราชการ</p>
            </div>
          </div>
          
          <div v-else class="standard-item">
            <h4>มาตรฐานการเรียนรู้:</h4>
            <p>{{ plan.standard?.code || '' }} {{ plan.standard?.description || plan.standard || 'ไม่ระบุมาตรฐาน' }}</p>
          </div>
          
          <div class="indicator-types" v-if="plan.indicators?.types">
            <label class="indicator-type">
              <span class="custom-checkbox" :class="{ checked: plan.indicators?.types?.includes('during') }"></span>
              ตัวชี้วัดระหว่างทาง
            </label>
            <label class="indicator-type">
              <span class="custom-checkbox" :class="{ checked: plan.indicators?.types?.includes('final') }"></span>
              ตัวชี้วัดปลายทาง
            </label>
          </div>

          <div class="indicators-list" v-if="plan.indicators?.items?.length">
            <h4>ตัวชี้วัด/ผลการเรียนรู้:</h4>
            <ul>
              <li v-for="(ind, idx) in plan.indicators.items" :key="idx">
                <strong>{{ ind.code }}</strong> {{ ind.description }}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Objectives KPA -->
      <section class="plan-section">
        <h2 class="section-title">🎯 จุดประสงค์การเรียนรู้</h2>
        
        <div class="content-box objectives-box">
          <div class="objective-group" v-if="plan.objectives?.knowledge?.length">
            <h4>📘 ด้านความรู้ (Knowledge: K)</h4>
            <ol>
              <li v-for="(obj, idx) in plan.objectives.knowledge" :key="idx">{{ stripRedundantPrefix(obj) }}</li>
            </ol>
          </div>
          
          <div class="objective-group" v-if="plan.objectives?.process?.length">
            <h4>⚙️ ด้านทักษะกระบวนการ (Process: P)</h4>
            <ol>
              <li v-for="(obj, idx) in plan.objectives.process" :key="idx">{{ stripRedundantPrefix(obj) }}</li>
            </ol>
          </div>
          
          <div class="objective-group" v-if="plan.objectives?.attitude?.length">
            <h4>💚 ด้านคุณลักษณะอันพึงประสงค์ (Attitude: A)</h4>
            <ol>
              <li v-for="(obj, idx) in plan.objectives.attitude" :key="idx">{{ stripRedundantPrefix(obj) }}</li>
            </ol>
          </div>

          <!-- Fallback for old format -->
          <div v-if="!plan.objectives?.knowledge && plan.components?.objectives?.length" class="objective-group">
            <h4>จุดประสงค์การเรียนรู้:</h4>
            <ol>
              <li v-for="(obj, idx) in plan.components.objectives" :key="idx">{{ obj }}</li>
            </ol>
          </div>
        </div>
      </section>

      <!-- Essential Content -->
      <section class="plan-section" v-if="plan.essentialContent">
        <h2 class="section-title">📌 สาระสำคัญ</h2>
        <div class="content-box">
          <p class="essential-text">{{ stripRedundantPrefix(plan.essentialContent) }}</p>
        </div>
      </section>

      <!-- Learning Content -->
      <section class="plan-section" v-if="plan.learningContent?.length">
        <h2 class="section-title">📚 สาระการเรียนรู้</h2>
        <div class="content-box">
          <ol class="learning-content-list">
            <li v-for="(content, idx) in plan.learningContent" :key="idx">{{ content }}</li>
          </ol>
        </div>
      </section>

      <!-- Desirable Traits -->
      <section class="plan-section" v-if="plan.desirableTraits">
        <h2 class="section-title">✨ คุณลักษณะอันพึงประสงค์ตามหลักสูตรแกนกลาง 2551</h2>
        <div class="content-box">
          <div class="traits-grid">
            <label v-for="trait in allTraits" :key="trait.value" class="trait-item">
              <span class="custom-checkbox" :class="{ checked: plan.desirableTraits?.selected?.includes(trait.value) }"></span>
              {{ trait.label }}
            </label>
          </div>
          <p v-if="plan.desirableTraits?.description" class="trait-description">
            {{ plan.desirableTraits.description }}
          </p>
        </div>
      </section>

      <!-- Competencies -->
      <section class="plan-section" v-if="plan.competencies">
        <h2 class="section-title">🌟 ด้านสมรรถนะสำคัญของผู้เรียน</h2>
        <div class="content-box">
          <div class="competencies-list">
            <div v-for="comp in allCompetencies" :key="comp.value" class="competency-item">
              <label class="comp-check">
                <span class="custom-checkbox" :class="{ checked: plan.competencies?.selected?.includes(comp.value) }"></span>
                {{ comp.label }}
              </label>
              <span class="comp-desc" v-if="plan.competencies?.descriptions?.[comp.value]">
                : {{ plan.competencies.descriptions[comp.value] }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Integration -->
      <section class="plan-section" v-if="plan.integration">
        <h2 class="section-title">🔗 การบูรณาการ</h2>
        <div class="content-box">
          <!-- World Class -->
          <div v-if="plan.integration?.worldClass" class="integration-block">
            <h4>📚 บูรณาการหลักสูตรโรงเรียนมาตรฐานสากล (World-Class Standard School)</h4>
            <div class="integration-items">
              <div class="int-item" v-if="plan.integration.worldClassItems?.IS1">
                <span class="int-label">☐ IS1 - การศึกษาค้นคว้าและสร้างองค์ความรู้:</span>
                <span class="int-value">{{ plan.integration.worldClassItems.IS1 }}</span>
              </div>
              <div class="int-item" v-if="plan.integration.worldClassItems?.IS2">
                <span class="int-label">☐ IS2 - การสื่อสารและการนำเสนอ:</span>
                <span class="int-value">{{ plan.integration.worldClassItems.IS2 }}</span>
              </div>
              <div class="int-item" v-if="plan.integration.worldClassItems?.IS3">
                <span class="int-label">☐ IS3 - การนำองค์ความรู้ไปใช้บริการสังคม:</span>
                <span class="int-value">{{ plan.integration.worldClassItems.IS3 }}</span>
              </div>
            </div>
          </div>

          <!-- Sufficiency Economy -->
          <div v-if="plan.integration?.sufficiencyEconomy" class="integration-block">
            <h4>🌿 บูรณาการกับปรัชญาของเศรษฐกิจพอเพียง</h4>
            <div class="integration-items">
              <div class="int-group">
                <strong>คุณลักษณะ:</strong>
                <div class="int-item" v-if="plan.integration.sufficiencyItems?.moderate">
                  <span class="int-label">☐ พอประมาณ:</span>
                  <span class="int-value">{{ plan.integration.sufficiencyItems.moderate }}</span>
                </div>
                <div class="int-item" v-if="plan.integration.sufficiencyItems?.reasonable">
                  <span class="int-label">☐ มีเหตุผล:</span>
                  <span class="int-value">{{ plan.integration.sufficiencyItems.reasonable }}</span>
                </div>
                <div class="int-item" v-if="plan.integration.sufficiencyItems?.immunity">
                  <span class="int-label">☐ มีภูมิคุ้มกัน:</span>
                  <span class="int-value">{{ plan.integration.sufficiencyItems.immunity }}</span>
                </div>
              </div>
              <div class="int-group">
                <strong>เงื่อนไข:</strong>
                <div class="int-item" v-if="plan.integration.sufficiencyItems?.knowledge">
                  <span class="int-label">☐ ความรู้:</span>
                  <span class="int-value">{{ plan.integration.sufficiencyItems.knowledge }}</span>
                </div>
                <div class="int-item" v-if="plan.integration.sufficiencyItems?.virtue">
                  <span class="int-label">☐ คุณธรรม:</span>
                  <span class="int-value">{{ plan.integration.sufficiencyItems.virtue }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Cross Subjects -->
          <div v-if="plan.integration?.crossSubjects?.length" class="integration-block">
            <h4>📖 บูรณาการข้ามกลุ่มสาระการเรียนรู้</h4>
            <ul>
              <li v-for="(subj, idx) in plan.integration.crossSubjects" :key="idx">
                <strong>{{ subj.subject }}:</strong> {{ subj.description }}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Tasks -->
      <section class="plan-section" v-if="plan.tasks?.length">
        <h2 class="section-title">📋 ภาระงาน</h2>
        <div class="content-box">
          <ol class="tasks-list">
            <li v-for="(task, idx) in plan.tasks" :key="idx">{{ task }}</li>
          </ol>
        </div>
      </section>

      <!-- Assessment Table -->
      <section class="plan-section">
        <h2 class="section-title">📊 การวัดและประเมินผล</h2>
        <div class="content-box">
          <div class="assessment-table-wrapper" v-if="plan.assessment?.table?.length">
            <table class="assessment-table">
              <thead>
                <tr>
                  <th>สิ่งที่ประเมิน</th>
                  <th>วิธีการ</th>
                  <th>เครื่องมือ</th>
                  <th>เกณฑ์</th>
                  <th>ผู้ประเมิน</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in plan.assessment.table" :key="idx">
                  <td>
                    <strong>{{ row.aspect }}</strong><br>
                    {{ row.item }}
                  </td>
                  <td>{{ row.method }}</td>
                  <td>{{ row.tool }}</td>
                  <td>{{ row.criteria }}</td>
                  <td>{{ row.evaluator }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- ARCE Rubric -->
          <div class="rubric-section" v-if="plan.assessment?.rubric">
            <h3>เกณฑ์การประเมิน A.R.C.E.</h3>
            <div class="rubric-grid">
              <div v-for="(rubric, key) in plan.assessment.rubric" :key="key" class="rubric-card">
                <div class="rubric-header">
                  <span class="rubric-icon">{{ getRubricIcon(key) }}</span>
                  <span class="rubric-name">{{ getRubricName(key) }}</span>
                  <span class="rubric-weight">{{ rubric.weight || 25 }}%</span>
                </div>
                <p class="rubric-criteria">{{ rubric.criteria }}</p>
                <div class="rubric-levels" v-if="rubric.levels">
                  <div v-for="(desc, level) in rubric.levels" :key="level" class="level-item">
                    <span class="level-score">{{ level }}</span>
                    <span class="level-desc">{{ desc }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 5E Activities -->
      <section class="plan-section">
        <h2 class="section-title">📚 กิจกรรมการเรียนรู้ (5E Model)</h2>
        
        <!-- Total Duration Summary -->
        <div v-if="plan.activities?.totalDuration" class="total-duration-bar">
          <span class="material-icons">schedule</span>
          <span>เวลารวม: {{ plan.activities.totalDuration }} นาที ({{ Math.ceil(plan.activities.totalDuration / 50) }} คาบ)</span>
          <div class="duration-breakdown">
            <span class="duration-item engagement">E1: {{ plan.activities?.engagement?.duration || 7 }}น.</span>
            <span class="duration-item exploration">E2: {{ plan.activities?.exploration?.duration || 18 }}น.</span>
            <span class="duration-item explanation">E3: {{ plan.activities?.explanation?.duration || 10 }}น.</span>
            <span class="duration-item elaboration">E4: {{ plan.activities?.elaboration?.duration || 10 }}น.</span>
            <span class="duration-item evaluation">E5: {{ plan.activities?.evaluation?.duration || 5 }}น.</span>
          </div>
        </div>
        
        <div class="activities-5e">
          <!-- Engagement -->
          <div class="activity-5e engagement">
            <div class="activity-header">
              <div class="phase-info">
                <span class="phase-icon">🔥</span>
                <div>
                  <h3>ขั้นสร้างความสนใจ (Engagement)</h3>
                  <span class="phase-duration">{{ plan.activities?.engagement?.duration || 7 }} นาที</span>
                </div>
              </div>
              <!-- ARCE Focus Badge -->
              <div v-if="plan.activities?.engagement?.arceFocus" class="arce-focus-badges">
                <span v-for="arce in plan.activities.engagement.arceFocus" :key="arce" :class="['arce-badge', arce]">
                  {{ arceLabels[arce] || arce }}
                </span>
              </div>
            </div>
            <!-- ARCE Description -->
            <div v-if="plan.activities?.engagement?.arceDescription" class="arce-description">
              <span class="material-icons">psychology</span>
              {{ plan.activities.engagement.arceDescription }}
            </div>
            <div class="activity-content">
              <ol v-if="plan.activities?.engagement?.steps?.length">
                <li v-for="(step, idx) in plan.activities.engagement.steps" :key="idx">{{ step }}</li>
              </ol>
              <div v-if="plan.activities?.engagement?.questions?.length" class="questions-box">
                <h4>❓ คำถามกระตุ้นความคิด:</h4>
                <ul>
                  <li v-for="(q, idx) in plan.activities.engagement.questions" :key="idx">{{ q }}</li>
                </ul>
              </div>
              <div v-if="plan.activities?.engagement?.media?.length" class="media-box">
                <h4>📺 สื่อที่ใช้:</h4>
                <ul>
                  <li v-for="(m, idx) in plan.activities.engagement.media" :key="idx">{{ m }}</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Exploration -->
          <div class="activity-5e exploration">
            <div class="activity-header">
              <div class="phase-info">
                <span class="phase-icon">🔍</span>
                <div>
                  <h3>ขั้นสำรวจและค้นหา (Exploration)</h3>
                  <span class="phase-duration">{{ plan.activities?.exploration?.duration || 18 }} นาที</span>
                </div>
              </div>
              <!-- ARCE Focus Badge -->
              <div v-if="plan.activities?.exploration?.arceFocus" class="arce-focus-badges">
                <span v-for="arce in plan.activities.exploration.arceFocus" :key="arce" :class="['arce-badge', arce]">
                  {{ arceLabels[arce] || arce }}
                </span>
              </div>
            </div>
            <!-- ARCE Description -->
            <div v-if="plan.activities?.exploration?.arceDescription" class="arce-description">
              <span class="material-icons">psychology</span>
              {{ plan.activities.exploration.arceDescription }}
            </div>
            <div class="activity-content">
              <ol v-if="plan.activities?.exploration?.steps?.length">
                <li v-for="(step, idx) in plan.activities.exploration.steps" :key="idx">{{ step }}</li>
              </ol>
              <div v-if="plan.activities?.exploration?.materials?.length" class="materials-box">
                <h4>🧪 วัสดุอุปกรณ์:</h4>
                <div class="materials-tags">
                  <span v-for="(m, idx) in plan.activities.exploration.materials" :key="idx" class="tag">{{ m }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Explanation -->
          <div class="activity-5e explanation">
            <div class="activity-header">
              <div class="phase-info">
                <span class="phase-icon">💡</span>
                <div>
                  <h3>ขั้นอธิบายและลงข้อสรุป (Explanation)</h3>
                  <span class="phase-duration">{{ plan.activities?.explanation?.duration || 10 }} นาที</span>
                </div>
              </div>
              <!-- ARCE Focus Badge -->
              <div v-if="plan.activities?.explanation?.arceFocus" class="arce-focus-badges">
                <span v-for="arce in plan.activities.explanation.arceFocus" :key="arce" :class="['arce-badge', arce]">
                  {{ arceLabels[arce] || arce }}
                </span>
              </div>
            </div>
            <!-- ARCE Description -->
            <div v-if="plan.activities?.explanation?.arceDescription" class="arce-description">
              <span class="material-icons">psychology</span>
              {{ plan.activities.explanation.arceDescription }}
            </div>
            <div class="activity-content">
              <ol v-if="plan.activities?.explanation?.steps?.length">
                <li v-for="(step, idx) in plan.activities.explanation.steps" :key="idx">{{ step }}</li>
              </ol>
              <div v-if="plan.activities?.explanation?.keyConcepts?.length" class="concepts-box">
                <h4>💎 แนวคิดหลัก:</h4>
                <ul>
                  <li v-for="(c, idx) in plan.activities.explanation.keyConcepts" :key="idx">{{ c }}</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Elaboration -->
          <div class="activity-5e elaboration">
            <div class="activity-header">
              <div class="phase-info">
                <span class="phase-icon">🚀</span>
                <div>
                  <h3>ขั้นขยายความรู้ (Elaboration)</h3>
                  <span class="phase-duration">{{ plan.activities?.elaboration?.duration || 10 }} นาที</span>
                </div>
              </div>
              <!-- ARCE Focus Badge -->
              <div v-if="plan.activities?.elaboration?.arceFocus" class="arce-focus-badges">
                <span v-for="arce in plan.activities.elaboration.arceFocus" :key="arce" :class="['arce-badge', arce]">
                  {{ arceLabels[arce] || arce }}
                </span>
              </div>
            </div>
            <!-- ARCE Description -->
            <div v-if="plan.activities?.elaboration?.arceDescription" class="arce-description">
              <span class="material-icons">psychology</span>
              {{ plan.activities.elaboration.arceDescription }}
            </div>
            <div class="activity-content">
              <ol v-if="plan.activities?.elaboration?.steps?.length">
                <li v-for="(step, idx) in plan.activities.elaboration.steps" :key="idx">{{ step }}</li>
              </ol>
              <div v-if="plan.activities?.elaboration?.hotsIntegration" class="hots-box">
                <h4>🧠 การบูรณาการ HOTS:</h4>
                <p>{{ plan.activities.elaboration.hotsIntegration }}</p>
              </div>
            </div>
          </div>

          <!-- Evaluation -->
          <div class="activity-5e evaluation">
            <div class="activity-header">
              <div class="phase-info">
                <span class="phase-icon">📊</span>
                <div>
                  <h3>ขั้นประเมิน (Evaluation)</h3>
                  <span class="phase-duration">{{ plan.activities?.evaluation?.duration || 5 }} นาที</span>
                </div>
              </div>
              <!-- ARCE Focus Badge -->
              <div v-if="plan.activities?.evaluation?.arceFocus" class="arce-focus-badges">
                <span v-for="arce in plan.activities.evaluation.arceFocus" :key="arce" :class="['arce-badge', arce]">
                  {{ arceLabels[arce] || arce }}
                </span>
              </div>
            </div>
            <!-- ARCE Description -->
            <div v-if="plan.activities?.evaluation?.arceDescription" class="arce-description">
              <span class="material-icons">psychology</span>
              {{ plan.activities.evaluation.arceDescription }}
            </div>
            <div class="activity-content">
              <ol v-if="plan.activities?.evaluation?.steps?.length">
                <li v-for="(step, idx) in plan.activities.evaluation.steps" :key="idx">{{ step }}</li>
              </ol>
              <div v-if="plan.activities?.evaluation?.methods?.length" class="methods-box">
                <h4>📝 วิธีการประเมิน:</h4>
                <ul>
                  <li v-for="(m, idx) in plan.activities.evaluation.methods" :key="idx">{{ m }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Media & Sources -->
      <section class="plan-section" v-if="plan.media">
        <h2 class="section-title">📦 สื่อการเรียนรู้และแหล่งการเรียนรู้</h2>
        <div class="content-box">
          <div class="media-grid">
            <div class="media-column" v-if="plan.media.learningMaterials?.length">
              <h4>สื่อการเรียนรู้:</h4>
              <ol>
                <li v-for="(item, idx) in plan.media.learningMaterials" :key="idx">{{ stripNumberPrefix(item) }}</li>
              </ol>
            </div>
            <div class="media-column" v-if="plan.media.learningSources?.length">
              <h4>แหล่งการเรียนรู้:</h4>
              <ol>
                <li v-for="(item, idx) in plan.media.learningSources" :key="idx">{{ stripNumberPrefix(item) }}</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <!-- Worksheets -->
      <section class="plan-section">
        <div class="section-header-with-btn">
          <h2 class="section-title">📄 ใบงาน</h2>
          <button class="btn btn-ai btn-sm" @click="openWorksheetGenerator" :disabled="generatingWorksheet">
            <span class="material-icons">{{ generatingWorksheet ? 'hourglass_empty' : 'auto_awesome' }}</span>
            {{ generatingWorksheet ? 'กำลังสร้าง...' : 'สร้างใบงานด้วย AI' }}
          </button>
        </div>
        <div class="worksheets-grid" v-if="plan.worksheets?.length || generatedWorksheets.length">
          <!-- Existing worksheets from plan -->
          <div v-for="ws in plan.worksheets" :key="'plan-' + ws.number" class="worksheet-card">
            <div class="ws-badge" v-if="ws.phase">
              <span class="phase-badge">{{ ws.phaseLabel || ws.phase }}</span>
              <span v-for="arce in ws.arceFocus" :key="arce" :class="['arce-mini', arce]">{{ arce[0].toUpperCase() }}</span>
            </div>
            <h4>{{ ws.title }}</h4>
            <p class="ws-objective"><strong>วัตถุประสงค์:</strong> {{ ws.objective }}</p>
            <p class="ws-instructions"><strong>คำชี้แจง:</strong> {{ ws.instructions }}</p>
            <div class="ws-questions" v-if="ws.questions?.length">
              <strong>คำถาม/กิจกรรม:</strong>
              <ol>
                <li v-for="(q, idx) in ws.questions" :key="idx">{{ q }}</li>
              </ol>
            </div>
          </div>
          
          <!-- AI Generated worksheets -->
          <div v-for="(ws, idx) in generatedWorksheets" :key="'gen-' + idx" class="worksheet-card ai-generated">
            <div class="ai-card-header">
              <div class="ai-badge">✨ AI สร้าง</div>
              <button class="btn-delete" @click="deleteWorksheet(idx)" title="ลบใบงานนี้">
                <span class="material-icons">delete</span>
              </button>
            </div>
            <div class="ws-badge" v-if="ws.phase">
              <span class="phase-badge">{{ ws.phaseLabel || ws.phase }}</span>
              <span v-for="arce in ws.arceFocus" :key="arce" :class="['arce-mini', arce]">{{ arce[0].toUpperCase() }}</span>
            </div>
            <h4>{{ ws.title }}</h4>
            <p v-if="ws.arceDescription" class="ws-arce-desc">{{ ws.arceDescription }}</p>
            <p class="ws-objective"><strong>วัตถุประสงค์:</strong> {{ ws.objective }}</p>
            <p class="ws-instructions"><strong>คำชี้แจง:</strong> {{ ws.instructions }}</p>
            
            <!-- Sections with detailed questions -->
            <div v-for="(section, sIdx) in ws.sections" :key="sIdx" class="ws-section">
              <h5>{{ section.title }}</h5>
              <div v-for="q in section.questions" :key="q.number" class="ws-question-item">
                <p class="question-text"><strong>{{ q.number }}.</strong> {{ q.question }}</p>
                <ul v-if="q.subQuestions?.length">
                  <li v-for="(sq, sqIdx) in q.subQuestions" :key="sqIdx">{{ sq }}</li>
                </ul>
                <p v-if="q.hints" class="question-hint">💡 {{ q.hints }}</p>
              </div>
              <!-- Table if exists -->
              <div v-if="section.table" class="ws-table-preview">
                <p><em>{{ section.table.description }}</em></p>
                <table class="preview-table">
                  <tr><th v-for="h in section.table.headers" :key="h">{{ h }}</th></tr>
                  <tr v-for="r in section.table.rows" :key="r"><td v-for="h in section.table.headers" :key="h"></td></tr>
                </table>
              </div>
            </div>
            
            <!-- Reflection -->
            <div v-if="ws.reflection" class="ws-reflection">
              <h5>🤔 สะท้อนคิด</h5>
              <p>{{ ws.reflection.question }}</p>
            </div>
            
            <!-- Scoring -->
            <div v-if="ws.scoring" class="ws-scoring">
              <strong>การให้คะแนน ({{ ws.scoring.totalPoints }} คะแนน)</strong>
            </div>
          </div>
        </div>
        <p v-else class="empty-text">ยังไม่มีใบงาน กดปุ่ม "สร้างใบงานด้วย AI" เพื่อสร้าง</p>
      </section>

      <!-- Knowledge Sheets -->
      <section class="plan-section">
        <div class="section-header-with-btn">
          <h2 class="section-title">📖 ใบความรู้</h2>
          <button class="btn btn-ai btn-sm" @click="showKnowledgeSheetModal = true" :disabled="generatingKnowledge">
            <span class="material-icons">{{ generatingKnowledge ? 'hourglass_empty' : 'auto_awesome' }}</span>
            {{ generatingKnowledge ? 'กำลังสร้าง...' : 'สร้างใบความรู้ด้วย AI' }}
          </button>
        </div>
        
        <!-- Link to knowledge sheet created via Modal (stored in separate collection) -->
        <div v-if="plan.knowledgeSheetId" class="knowledge-link-card">
          <div class="link-card-content">
            <span class="link-icon">📖</span>
            <div class="link-info">
              <h4>ใบความรู้ที่ {{ plan.planNumber || 1 }}: {{ plan.topic }}</h4>
              <p>สร้างจากแผนการสอนนี้ด้วย AI</p>
            </div>
          </div>
          <router-link :to="`/knowledge-sheet/${plan.knowledgeSheetId}`" class="btn btn-primary btn-sm">
            <span class="material-icons">visibility</span>
            ดูใบความรู้
          </router-link>
        </div>
        
        <div class="knowledge-sheets" v-if="plan.knowledgeSheets?.length || generatedKnowledgeSheets.length">
          <!-- Existing from plan -->
          <div v-for="ks in plan.knowledgeSheets" :key="'plan-' + ks.number" class="knowledge-card">
            <h4>{{ ks.title }}</h4>
            <div class="ks-content">{{ ks.content }}</div>
          </div>
          
          <!-- AI Generated -->
          <div v-for="(ks, idx) in generatedKnowledgeSheets" :key="'gen-' + idx" class="knowledge-card ai-generated">
            <div class="ai-card-header">
              <div class="ai-badge">✨ AI สร้าง</div>
              <button class="btn-delete" @click="deleteKnowledgeSheet(idx)" title="ลบใบความรู้นี้">
                <span class="material-icons">delete</span>
              </button>
            </div>
            <h4>{{ ks.title }}</h4>
            <p v-if="ks.arceDescription" class="ks-arce-desc">{{ ks.arceDescription }}</p>
            
            <div v-if="ks.introduction" class="ks-intro">{{ ks.introduction }}</div>
            
            <div v-for="(section, sIdx) in ks.sections" :key="sIdx" class="ks-section">
              <h5>{{ section.title }}</h5>
              <div class="ks-content">{{ section.content }}</div>
              <ul v-if="section.keyPoints?.length" class="key-points">
                <li v-for="(point, pIdx) in section.keyPoints" :key="pIdx">{{ point }}</li>
              </ul>
              <div v-if="section.example" class="ks-example">
                <strong>📌 {{ section.example.title }}</strong>
                <p>{{ section.example.description }}</p>
              </div>
              <p v-if="section.realWorldApplication" class="real-world">
                🌍 <strong>การนำไปใช้:</strong> {{ section.realWorldApplication }}
              </p>
            </div>
            
            <!-- Diagram -->
            <div v-if="ks.diagram" class="ks-diagram">
              <h5>📊 {{ ks.diagram.title }}</h5>
              <p>{{ ks.diagram.description }}</p>
            </div>
            
            <!-- Summary -->
            <div v-if="ks.summary" class="ks-summary">
              <h5>📝 สรุป</h5>
              <ul>
                <li v-for="(item, idx) in ks.summary.keyTakeaways" :key="idx">{{ item }}</li>
              </ul>
            </div>
            
            <!-- Vocabulary -->
            <div v-if="ks.vocabulary?.length" class="ks-vocab">
              <h5>📚 คำศัพท์</h5>
              <div v-for="v in ks.vocabulary" :key="v.term" class="vocab-item">
                <strong>{{ v.term }}</strong>: {{ v.definition }}
              </div>
            </div>
            
            <!-- Self Check -->
            <div v-if="ks.selfCheck?.length" class="ks-selfcheck">
              <h5>✅ ตรวจสอบความเข้าใจ</h5>
              <ol>
                <li v-for="(q, idx) in ks.selfCheck" :key="idx">{{ q }}</li>
              </ol>
            </div>
          </div>
        </div>
        <p v-else class="empty-text">ยังไม่มีใบความรู้ กดปุ่ม "สร้างใบความรู้ด้วย AI" เพื่อสร้าง</p>
      </section>

      <!-- Post Teaching Record -->
      <section class="plan-section">
        <h2 class="section-title">📝 บันทึกผลหลังการจัดการเรียนรู้</h2>
        <div class="content-box post-teaching">
          <div class="record-item">
            <h4>1. ผลการจัดการเรียนรู้</h4>
            <div class="record-content">{{ plan.postTeachingRecord?.results || '.....................................................' }}</div>
          </div>
          <div class="record-item">
            <h4>นักเรียนสร้างนวัตกรรม</h4>
            <div class="record-content">{{ plan.postTeachingRecord?.innovations || '.....................................................' }}</div>
          </div>
          <div class="record-item">
            <h4>2. ปัญหาและอุปสรรค</h4>
            <div class="record-content">{{ plan.postTeachingRecord?.problems || '.....................................................' }}</div>
          </div>
          <div class="record-item">
            <h4>3. ข้อเสนอแนะและแนวทางแก้ไข</h4>
            <div class="record-content">{{ plan.postTeachingRecord?.suggestions || '.....................................................' }}</div>
          </div>

          <!-- Signatures -->
          <div class="signatures-section">
            <div class="signature-box">
              <p>ลงชื่อ .................................................... ผู้สอน</p>
              <p>({{ plan.teacherName || plan.postTeachingRecord?.signatures?.teacher || '.........................................' }})</p>
              <p>ตำแหน่ง {{ plan.postTeachingRecord?.signatures?.teacherPosition || 'ครู วิทยฐานะครู.....................' }}</p>
            </div>

            <div class="signature-box">
              <h4>ความคิดเห็นและข้อเสนอแนะของหัวหน้ากลุ่มสาระการเรียนรู้</h4>
              <p class="comment-line">..................................................................................................................</p>
              <p>ลงชื่อ ....................................................</p>
              <p>({{ plan.postTeachingRecord?.signatures?.headOfDepartment || '.........................................' }})</p>
              <p>หัวหน้ากลุ่มสาระการเรียนรู้{{ plan.subjectGroup || 'วิทยาศาสตร์และเทคโนโลยี' }}</p>
            </div>

            <div class="signature-box">
              <h4>ความเห็นของรองผู้อำนวยการโรงเรียน ฝ่ายบริหารวิชาการ</h4>
              <p class="comment-line">..................................................................................................................</p>
              <p>ลงชื่อ ....................................................</p>
              <p>({{ plan.postTeachingRecord?.signatures?.viceDirector || '.........................................' }})</p>
              <p>รองผู้อำนวยการโรงเรียน{{ plan.schoolName || '' }}</p>
            </div>

            <div class="signature-box">
              <h4>ความเห็นของผู้อำนวยการโรงเรียน</h4>
              <p class="comment-line">..................................................................................................................</p>
              <p>ลงชื่อ ....................................................</p>
              <p>({{ plan.postTeachingRecord?.signatures?.director || '.........................................' }})</p>
              <p>ผู้อำนวยการโรงเรียน{{ plan.schoolName || '' }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Worksheet Generator Modal -->
    <WorksheetGeneratorModal
      v-if="showCreateWorksheetModal"
      :preSelectedPlan="plan"
      @close="showCreateWorksheetModal = false"
      @generated="onWorksheetGenerated"
    />

    <!-- Knowledge Sheet Generator Modal -->
    <KnowledgeSheetGeneratorModal
      v-if="showKnowledgeSheetModal"
      :preSelectedPlan="plan"
      @close="showKnowledgeSheetModal = false"
      @generated="onKnowledgeSheetGenerated"
    />
  </div>
  </ErrorBoundary>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '@/firebase/config'
import { doc, getDoc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'  // 🔐 For authenticated API calls
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import WorksheetGeneratorModal from '@/components/WorksheetGeneratorModal.vue'
import KnowledgeSheetGeneratorModal from '@/components/KnowledgeSheetGeneratorModal.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()  // 🔐 Auth store

const plan = ref(null)
const loading = ref(true)
const publishing = ref(false)
const printArea = ref(null)

// Worksheet & Knowledge Sheet AI Generation
const generatingWorksheet = ref(false)
const generatingKnowledge = ref(false)
const generatedWorksheets = ref([])
const generatedKnowledgeSheets = ref([])
const worksheetErrors = ref({})
const knowledgeErrors = ref({})

// Electronic Worksheet Modal
const showCreateWorksheetModal = ref(false)
const showKnowledgeSheetModal = ref(false)
const worksheetOptions = ref({
  type: 'comprehensive',
  questionCount: '10',
  duration: '50',
  createRoom: true,
  roomName: ''
})

// ARCE Labels for 5E activities
const arceLabels = {
  analysis: 'A-วิเคราะห์',
  reasoning: 'R-เหตุผล',
  creativity: 'C-สร้างสรรค์',
  evidence: 'E-หลักฐาน'
}

const allTraits = [
  { value: 'patriotic', label: 'รักชาติ ศาสน์ กษัตริย์' },
  { value: 'honest', label: 'ซื่อสัตย์สุจริต' },
  { value: 'discipline', label: 'มีวินัย' },
  { value: 'diligent', label: 'ใฝ่เรียนรู้' },
  { value: 'sufficient', label: 'อยู่อย่างพอเพียง' },
  { value: 'determined', label: 'มุ่งมั่นในการทำงาน' },
  { value: 'thai_identity', label: 'รักความเป็นไทย' },
  { value: 'public_minded', label: 'มีจิตสาธารณะ' }
]

const allCompetencies = [
  { value: 'communication', label: 'ความสามารถในการสื่อสาร' },
  { value: 'thinking', label: 'ความสามารถในการคิด' },
  { value: 'problem_solving', label: 'ความสามารถในการแก้ปัญหา' },
  { value: 'life_skills', label: 'ความสามารถในการใช้ทักษะชีวิต' },
  { value: 'technology', label: 'ความสามารถในการใช้เทคโนโลยี' }
]

function getTeachingMethodText(method) {
  const methods = {
    '5E': 'กระบวนการสืบเสาะหาความรู้ 5 ขั้นตอน (5E)',
    'PBL': 'การเรียนรู้โดยใช้ปัญหาเป็นฐาน (Problem-Based Learning)',
    'Cooperative': 'การเรียนรู้แบบร่วมมือ (Cooperative Learning)'
  }
  return methods[method] || method || '5E'
}

function getRubricIcon(key) {
  const icons = {
    analysis: '🔍',
    reasoning: '🧠',
    creativity: '💡',
    evidence: '📚'
  }
  return icons[key] || '📋'
}

function getRubricName(key) {
  const names = {
    analysis: 'การวิเคราะห์ (Analysis)',
    reasoning: 'การให้เหตุผล (Reasoning)',
    creativity: 'ความคิดสร้างสรรค์ (Creativity)',
    evidence: 'หลักฐานอ้างอิง (Evidence)'
  }
  return names[key] || key
}

async function loadPlan() {
  try {
    loading.value = true
    const planId = route.params.id
    
    if (!planId || planId === 'undefined') {
      console.error('Invalid plan ID:', planId)
      return
    }
    
    console.log('Loading plan:', planId)
    const docRef = doc(db, 'lessonPlans', planId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      console.log('Plan data:', data)
      
      // Merge content with top-level fields
      plan.value = { 
        id: docSnap.id, 
        ...data,
        // Spread AI-generated content if exists
        ...(data.content || {}),
        // Keep original metadata
        courseCode: data.courseCode,
        courseName: data.courseName,
        planNumber: data.planNumber,
        unitNumber: data.unitNumber,
        unitName: data.unitName,
        gradeLevel: data.gradeLevel,
        semester: data.semester,
        academicYear: data.academicYear,
        status: data.status
      }
      console.log('Merged plan:', plan.value)
      
      // โหลดใบงานและใบความรู้ที่ AI สร้างไว้
      if (data.generatedWorksheets && Array.isArray(data.generatedWorksheets)) {
        generatedWorksheets.value = data.generatedWorksheets
      }
      if (data.generatedKnowledgeSheets && Array.isArray(data.generatedKnowledgeSheets)) {
        generatedKnowledgeSheets.value = data.generatedKnowledgeSheets
      }
    } else {
      console.error('Plan not found:', planId)
    }
  } catch (error) {
    console.error('Error loading plan:', error)
  } finally {
    loading.value = false
  }
}

function editPlan() {
  router.push(`/lesson-plans/${route.params.id}/edit`)
}

async function publishPlan() {
  if (!plan.value || publishing.value) return
  
  try {
    publishing.value = true
    await updateDoc(doc(db, 'lessonPlans', plan.value.id), {
      status: 'published',
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    plan.value.status = 'published'
    alert('เผยแพร่แผนการสอนเรียบร้อยแล้ว!')
  } catch (error) {
    console.error('Error publishing plan:', error)
    alert('เกิดข้อผิดพลาดในการเผยแพร่')
  } finally {
    publishing.value = false
  }
}

function printPlan() {
  window.print()
}

// Handle worksheet generated from modal
async function onWorksheetGenerated(result) {
  showCreateWorksheetModal.value = false
  
  alert(`✅ สร้างใบงานสำเร็จ!\n\nจำนวน ${result.totalQuestions || 'หลาย'} คำถาม\nคะแนนเต็ม ${result.maxScore || '-'} คะแนน`)
  
  // Navigate to room or worksheets
  if (result.roomId) {
    if (confirm('ต้องการไปยังห้องกิจกรรมหรือไม่?')) {
      router.push(`/learning-room/${result.roomId}`)
    }
  } else {
    router.push('/teacher/worksheets')
  }
}

// Handle knowledge sheet generated from modal
async function onKnowledgeSheetGenerated(result) {
  showKnowledgeSheetModal.value = false
  
  // Check if it's a batch generation
  if (result.isBatch) {
    const successMsg = `✅ สร้างใบความรู้ทั้งหน่วยสำเร็จ!\n\n` +
      `สร้างสำเร็จ: ${result.successCount} แผน\n` +
      (result.errorCount > 0 ? `ล้มเหลว: ${result.errorCount} แผน\n` : '')
    
    alert(successMsg)
    
    // Navigate to the lesson plans page to see all generated sheets
    if (result.results?.length > 0) {
      if (confirm('ต้องการดูใบความรู้ที่สร้างหรือไม่?')) {
        // Navigate to first generated sheet
        router.push(`/knowledge-sheet/${result.results[0].knowledgeSheetId}`)
      }
    }
  }
  // Check if it's a unit knowledge sheet
  else if (result.isUnitSheet) {
    let successMsg = `✅ สร้างใบความรู้หน่วยสำเร็จ!\n\nจำนวน ${result.planGuidance?.length || 0} แผนการสอน`
    
    if (result.room) {
      successMsg += `\n\n🏫 ${result.room.isNew ? 'สร้างห้องกิจกรรมใหม่' : 'เพิ่มเข้าห้อง'}: ${result.room.name}`
    }
    
    alert(successMsg)
    
    if (result.unitKnowledgeSheetId) {
      const viewChoice = result.room 
        ? confirm('ต้องการดูใบความรู้หน่วยหรือไม่?\n\n(กด "ยกเลิก" เพื่อไปที่ห้องกิจกรรมแทน)')
        : confirm('ต้องการดูใบความรู้หน่วยหรือไม่?')
      
      if (viewChoice) {
        router.push(`/unit-knowledge-sheet/${result.unitKnowledgeSheetId}`)
      } else if (result.room) {
        router.push(`/learning-room/${result.room.id}`)
      }
    }
  } else {
    // Regular plan knowledge sheet
    alert(`✅ สร้างใบความรู้สำเร็จ!\n\nหัวข้อ: ${result.knowledgeSheet?.header?.topic || ''}\nจำนวน ${result.knowledgeSheet?.sections?.length || 0} เนื้อหาหลัก`)
    
    if (result.knowledgeSheetId) {
      if (confirm('ต้องการดูใบความรู้หรือไม่?')) {
        router.push(`/knowledge-sheet/${result.knowledgeSheetId}`)
      }
    }
  }
  
  // Reload the plan to get the updated reference
  await loadPlan()
}

// Legacy: Electronic Worksheet Generator (keep for backwards compatibility)
async function createElectronicWorksheet() {
  if (generatingWorksheet.value || !plan.value) return
  
  generatingWorksheet.value = true
  
  try {
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    const response = await fetch(`${functionsUrl}/generateElectronicWorksheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonPlanId: plan.value.id,
        teacherId: plan.value.teacherId,
        lessonPlan: plan.value,
        courseId: plan.value.courseId,
        courseCode: plan.value.courseCode || plan.value.header?.courseCode,
        courseName: plan.value.courseName || plan.value.header?.courseName,
        gradeLevel: plan.value.gradeLevel || plan.value.header?.gradeLevel,
        unitNumber: plan.value.unitNumber || plan.value.header?.unitNumber,
        unitName: plan.value.unitName || plan.value.header?.unitName,
        planNumber: plan.value.planNumber || plan.value.header?.planNumber,
        topic: plan.value.topic || plan.value.header?.topic,
        activities: plan.value.activities5E,
        objectives: plan.value.objectives,
        learningOutcomes: plan.value.targetLOs || plan.value.header?.targetLOs,
        arceFocus: plan.value.arceFocus || plan.value.header?.arceFocus,
        worksheetType: worksheetOptions.value.type,
        questionCount: parseInt(worksheetOptions.value.questionCount),
        duration: parseInt(worksheetOptions.value.duration),
        createRoom: worksheetOptions.value.createRoom,
        roomName: worksheetOptions.value.roomName || `ห้องกิจกรรม: ${plan.value.topic || plan.value.header?.topic}`
      })
    })

    const result = await response.json()
    
    if (result.success) {
      showCreateWorksheetModal.value = false
      
      // Ask to navigate to the worksheet or room
      const destination = result.roomId 
        ? confirm('สร้างใบงานและห้องกิจกรรมสำเร็จ!\n\nต้องการไปยังห้องกิจกรรมหรือไม่?')
          ? `/learning-room/${result.roomId}`
          : `/teacher/worksheets`
        : `/teacher/worksheets`
      
      alert(`✅ สร้างใบงานอิเล็กทรอนิกส์สำเร็จ!\n\nใบงานมี ${result.totalQuestions || 'หลาย'} คำถาม\nคะแนนเต็ม ${result.maxScore || '-'} คะแนน`)
      router.push(destination)
    } else {
      throw new Error(result.error || 'Failed to generate worksheet')
    }
  } catch (error) {
    console.error('Error creating electronic worksheet:', error)
    alert('เกิดข้อผิดพลาดในการสร้างใบงาน: ' + error.message)
  } finally {
    generatingWorksheet.value = false
  }
}

// AI Worksheet Generator (Legacy)
async function openWorksheetGenerator() {
  if (generatingWorksheet.value || !plan.value) return
  
  // Get task data from the plan's 5E activities (Elaboration phase typically has tasks)
  const elaboration = plan.value.activities5E?.elaboration || {}
  const task = elaboration.task || elaboration.description || plan.value.topic || ''
  const arceFocus = elaboration.arceFocus || ['reasoning']
  
  generatingWorksheet.value = true
  
  try {
    // 🔐 Get auth token for secured endpoint
    const token = await authStore.getIdToken()
    if (!token) {
      throw new Error('กรุณาเข้าสู่ระบบใหม่')
    }
    
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    const response = await fetch(`${functionsUrl}/generateWorksheet`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`  // 🔐 Auth required
      },
      body: JSON.stringify({
        // ข้อมูลรายวิชาและหน่วย
        courseName: plan.value.courseName || plan.value.courseTitle || '',
        courseCode: plan.value.courseCode || '',
        gradeLevel: plan.value.gradeLevel || 'ม.4',
        unitName: plan.value.unitName || '',
        unitNumber: plan.value.unitNumber || 1,
        planNumber: plan.value.planNumber || 1,
        topic: plan.value.topic || plan.value.title || '',
        
        // จุดประสงค์และสาระสำคัญ
        objectives: plan.value.objectives || [],
        essentialContent: plan.value.essentialContent || '',
        learningContent: plan.value.learningContent || [],
        
        // ภาระงานจาก Elaboration
        task: task,
        taskIndex: 0,
        phase: 'elaboration',
        phaseActivity: elaboration.activity || elaboration.description || '',
        arceFocus: Array.isArray(arceFocus) ? arceFocus : [arceFocus],
        arceDescription: elaboration.arceDescription || '',
        duration: elaboration.duration || 15,
        
        // กิจกรรม 5E ทั้งหมด (เพื่อให้ AI เข้าใจบริบท)
        activities5E: plan.value.activities5E || {}
      })
    })
    
    if (!response.ok) throw new Error('Failed to generate worksheet')
    
    const data = await response.json()
    if (data.success && data.worksheet) {
      // เพิ่ม timestamp และ id
      const worksheetWithMeta = {
        ...data.worksheet,
        id: `ws_${Date.now()}`,
        createdAt: new Date().toISOString(),
        generatedBy: 'AI'
      }
      
      // บันทึกลง Firestore
      await updateDoc(doc(db, 'lessonPlans', plan.value.id), {
        generatedWorksheets: arrayUnion(worksheetWithMeta),
        updatedAt: serverTimestamp()
      })
      
      // อัปเดต local state
      generatedWorksheets.value.push(worksheetWithMeta)
      
      alert('สร้างใบงานสำเร็จและบันทึกแล้ว!')
    } else {
      throw new Error(data.error || 'Failed to generate worksheet')
    }
  } catch (error) {
    console.error('Error generating worksheet:', error)
    alert('เกิดข้อผิดพลาดในการสร้างใบงาน: ' + (error.message || 'Unknown error'))
  } finally {
    generatingWorksheet.value = false
  }
}

// AI Knowledge Sheet Generator  
async function generateKnowledgeSheetAI() {
  if (generatingKnowledge.value || !plan.value) return
  
  // Get key concepts from the plan's Explanation phase
  const explanation = plan.value.activities5E?.explanation || {}
  const keyConcepts = explanation.keyConcepts || plan.value.keyConcepts || plan.value.learningContent || []
  const arceFocus = explanation.arceFocus || ['reasoning', 'evidence']
  
  generatingKnowledge.value = true
  
  try {
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    const response = await fetch(`${functionsUrl}/generateKnowledgeSheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // ข้อมูลรายวิชาและหน่วย
        courseName: plan.value.courseName || plan.value.courseTitle || '',
        courseCode: plan.value.courseCode || '',
        gradeLevel: plan.value.gradeLevel || 'ม.4',
        unitName: plan.value.unitName || '',
        unitNumber: plan.value.unitNumber || 1,
        planNumber: plan.value.planNumber || 1,
        topic: plan.value.topic || plan.value.title || '',
        
        // เนื้อหาและแนวคิดหลัก
        keyConcepts: keyConcepts,
        learningContent: plan.value.learningContent || [],
        essentialContent: plan.value.essentialContent || '',
        objectives: plan.value.objectives || [],
        
        // A.R.C.E. และข้อมูลเพิ่มเติม
        arceFocus: Array.isArray(arceFocus) ? arceFocus : [arceFocus],
        targetAudience: plan.value.gradeLevel || 'ม.4',
        
        // กิจกรรม 5E ทั้งหมด (เพื่อให้ AI เข้าใจบริบท)
        activities5E: plan.value.activities5E || {}
      })
    })
    
    if (!response.ok) throw new Error('Failed to generate knowledge sheet')
    
    const data = await response.json()
    if (data.success && data.knowledgeSheet) {
      // เพิ่ม timestamp และ id
      const knowledgeSheetWithMeta = {
        ...data.knowledgeSheet,
        id: `ks_${Date.now()}`,
        createdAt: new Date().toISOString(),
        generatedBy: 'AI'
      }
      
      // บันทึกลง Firestore
      await updateDoc(doc(db, 'lessonPlans', plan.value.id), {
        generatedKnowledgeSheets: arrayUnion(knowledgeSheetWithMeta),
        updatedAt: serverTimestamp()
      })
      
      // อัปเดต local state
      generatedKnowledgeSheets.value.push(knowledgeSheetWithMeta)
      
      alert('สร้างใบความรู้สำเร็จและบันทึกแล้ว!')
    } else {
      throw new Error(data.error || 'Failed to generate knowledge sheet')
    }
  } catch (error) {
    console.error('Error generating knowledge sheet:', error)
    alert('เกิดข้อผิดพลาดในการสร้างใบความรู้: ' + (error.message || 'Unknown error'))
  } finally {
    generatingKnowledge.value = false
  }
}

// Get phase label in Thai
function getPhaseLabel(phase) {
  const labels = {
    engagement: 'Engagement - กระตุ้นความสนใจ',
    exploration: 'Exploration - สำรวจค้นหา',
    explanation: 'Explanation - อธิบายความรู้',
    elaboration: 'Elaboration - ขยายความเข้าใจ',
    evaluation: 'Evaluation - ประเมินผล'
  }
  return labels[phase] || phase
}

// Strip number prefix from text (e.g., "1. xxx" -> "xxx", "1) xxx" -> "xxx")
function stripNumberPrefix(text) {
  if (!text) return text
  return text.replace(/^\d+[\.\)\:\-]\s*/, '')
}

// Strip redundant prefix (e.g., "ด้านความรู้ (K): xxx" -> "xxx", "หน่วยที่ 1: xxx" -> "xxx")
function stripRedundantPrefix(text) {
  if (!text) return text
  // Remove patterns like "ด้านความรู้ (K):", "ด้านทักษะกระบวนการ (P):", "สาระสำคัญ:", "หน่วยที่ X:"
  return text
    .replace(/^ด้าน(ความรู้|ทักษะ|คุณลักษณะ|ทักษะกระบวนการ|คุณลักษณะอันพึงประสงค์)\s*\([KPA]\)\s*[\:\-]?\s*/i, '')
    .replace(/^สาระสำคัญ\s*[\:\-]?\s*/i, '')
    .replace(/^หน่วยที่\s*\d+\s*[\:\-]?\s*/i, '')
    .replace(/^\d+\.\s*ด้าน/i, 'ด้าน') // Handle "1. ด้านความรู้" -> "ด้านความรู้"
}

// Get A.R.C.E. label in Thai
function getArceLabel(arceFocus) {
  const labels = {
    analysis: 'Analysis - การวิเคราะห์',
    reasoning: 'Reasoning - การให้เหตุผล',
    creativity: 'Creativity - ความคิดสร้างสรรค์',
    evidence: 'Evidence - หลักฐานสนับสนุน'
  }
  return labels[arceFocus] || arceFocus
}

// Get A.R.C.E. icon
function getArceIcon(arceFocus) {
  const icons = {
    analysis: '🔍',
    reasoning: '🧠',
    creativity: '💡',
    evidence: '📚'
  }
  return icons[arceFocus] || '📝'
}

// ลบใบงานที่ AI สร้าง
async function deleteWorksheet(index) {
  if (!confirm('ต้องการลบใบงานนี้ใช่ไหม?')) return
  
  try {
    const wsToDelete = generatedWorksheets.value[index]
    const updatedWorksheets = generatedWorksheets.value.filter((_, i) => i !== index)
    
    await updateDoc(doc(db, 'lessonPlans', plan.value.id), {
      generatedWorksheets: updatedWorksheets,
      updatedAt: serverTimestamp()
    })
    
    generatedWorksheets.value = updatedWorksheets
  } catch (error) {
    console.error('Error deleting worksheet:', error)
    alert('เกิดข้อผิดพลาดในการลบใบงาน')
  }
}

// ลบใบความรู้ที่ AI สร้าง
async function deleteKnowledgeSheet(index) {
  if (!confirm('ต้องการลบใบความรู้นี้ใช่ไหม?')) return
  
  try {
    const ksToDelete = generatedKnowledgeSheets.value[index]
    const updatedKnowledgeSheets = generatedKnowledgeSheets.value.filter((_, i) => i !== index)
    
    await updateDoc(doc(db, 'lessonPlans', plan.value.id), {
      generatedKnowledgeSheets: updatedKnowledgeSheets,
      updatedAt: serverTimestamp()
    })
    
    generatedKnowledgeSheets.value = updatedKnowledgeSheets
  } catch (error) {
    console.error('Error deleting knowledge sheet:', error)
    alert('เกิดข้อผิดพลาดในการลบใบความรู้')
  }
}

onMounted(loadPlan)
</script>

<style scoped>
.lesson-plan-detail {
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
  font-size: 1rem;
  font-weight: 600;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-actions {
  display: flex;
  gap: 0.75rem;
}

/* Loading & Error */
.loading-container, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  gap: 1rem;
}

.error-icon {
  font-size: 4rem;
}

/* Plan Content */
.plan-detail-content {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

/* Official Header */
.official-header {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  position: relative;
}

.plan-main-title {
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--primary);
}

.header-info-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.header-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
}

.header-row .label {
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 100px;
}

.header-row .value {
  color: var(--text-primary);
}

.header-row .value.full {
  flex: 1;
}

.ai-badge-header {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2));
  color: #8b5cf6;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.ai-badge-header .material-icons {
  font-size: 1rem;
}

/* Plan Sections */
.plan-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--primary);
}

.content-box {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

/* Standards Warning */
.standards-warning-box {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 2px solid #f59e0b;
  border-radius: 10px;
  color: #92400e;
}

.standards-warning-box > .material-icons {
  font-size: 1.5rem;
  color: #d97706;
}

.standards-warning-box strong {
  display: block;
  margin-bottom: 0.5rem;
}

.standards-warning-box p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Standards */
.standard-item h4 {
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.indicator-types {
  display: flex;
  gap: 1.5rem;
  margin: 1rem 0;
}

.indicator-type {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.indicators-list h4 {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

.indicators-list ul {
  list-style: none;
  padding: 0;
}

.indicators-list li {
  padding: 0.5rem 0;
  border-bottom: 1px dashed var(--border-color);
}

/* Objectives */
.objectives-box {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.objective-group h4 {
  margin-bottom: 0.75rem;
  color: var(--primary);
}

.objective-group ol {
  padding-left: 1.5rem;
  margin: 0;
}

.objective-group li {
  padding: 0.375rem 0;
}

/* Essential Content */
.essential-text {
  line-height: 1.8;
  text-indent: 2rem;
}

/* Traits */
.traits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}

.trait-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.trait-description {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-style: italic;
}

/* Custom Checkbox */
.custom-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 2px solid #6b7280;
  border-radius: 4px;
  background: transparent;
  flex-shrink: 0;
}

.custom-checkbox.checked {
  background: #8b5cf6;
  border-color: #8b5cf6;
}

.custom-checkbox.checked::after {
  content: '✓';
  color: white;
  font-size: 12px;
  font-weight: bold;
}

/* Competencies */
.competencies-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.competency-item {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.comp-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.comp-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Integration */
.integration-block {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.integration-block:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.integration-block h4 {
  margin-bottom: 1rem;
  color: var(--primary);
}

.integration-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.int-item {
  display: flex;
  gap: 0.5rem;
}

.int-label {
  color: var(--text-secondary);
  min-width: 200px;
}

.int-group {
  margin-bottom: 1rem;
}

.int-group strong {
  display: block;
  margin-bottom: 0.5rem;
}

/* Tasks */
.tasks-list {
  padding-left: 1.5rem;
}

.tasks-list li {
  padding: 0.5rem 0;
}

/* Assessment Table */
.assessment-table-wrapper {
  overflow-x: auto;
  margin-bottom: 2rem;
}

.assessment-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.assessment-table th,
.assessment-table td {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  text-align: left;
}

.assessment-table th {
  background: var(--bg-primary);
  font-weight: 600;
}

/* Rubric */
.rubric-section h3 {
  margin-bottom: 1rem;
  color: var(--primary);
}

.rubric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.rubric-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 1rem;
}

.rubric-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.rubric-icon {
  font-size: 1.25rem;
}

.rubric-name {
  font-weight: 600;
  flex: 1;
}

.rubric-weight {
  padding: 0.25rem 0.5rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 0.75rem;
}

.rubric-criteria {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.rubric-levels {
  font-size: 0.8rem;
}

.level-item {
  display: flex;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

.level-score {
  font-weight: 600;
  color: var(--primary);
  min-width: 20px;
}

.level-desc {
  color: var(--text-secondary);
}

/* 5E Activities */
.activities-5e {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-5e {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.activity-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.phase-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.phase-icon {
  font-size: 1.5rem;
}

.phase-info h3 {
  font-size: 1rem;
  margin: 0;
}

.phase-duration {
  font-size: 0.8rem;
  color: var(--text-secondary);
  background: var(--bg-primary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

/* ARCE Focus Badges */
.arce-focus-badges {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.arce-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.arce-badge.analysis {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}

.arce-badge.reasoning {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.arce-badge.creativity {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.arce-badge.evidence {
  background: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
}

/* ARCE Description */
.arce-description {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba(139, 92, 246, 0.05);
  border-bottom: 1px solid var(--border-color);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.arce-description .material-icons {
  font-size: 1rem;
  color: #8b5cf6;
}

/* Total Duration Bar */
.total-duration-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.05));
  border: 1px solid var(--border-color);
  border-radius: 12px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.total-duration-bar > .material-icons {
  color: #8b5cf6;
}

.total-duration-bar > span:nth-child(2) {
  font-weight: 600;
}

.duration-breakdown {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-left: auto;
}

.duration-item {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.duration-item.engagement { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.duration-item.exploration { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.duration-item.explanation { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.duration-item.elaboration { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.duration-item.evaluation { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }

/* Activity Colors */
.activity-5e.engagement .activity-header {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(249, 115, 22, 0.05));
}
.activity-5e.exploration .activity-header {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(14, 165, 233, 0.05));
}
.activity-5e.explanation .activity-header {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(234, 179, 8, 0.05));
}
.activity-5e.elaboration .activity-header {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.05));
}
.activity-5e.evaluation .activity-header {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.05));
}

.activity-content {
  padding: 1.5rem;
}

.activity-content ol {
  padding-left: 1.5rem;
  margin: 0 0 1rem 0;
}

.activity-content li {
  padding: 0.375rem 0;
  line-height: 1.6;
}

.questions-box, .materials-box, .concepts-box, .methods-box, .hots-box, .media-box {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

.questions-box h4, .materials-box h4, .concepts-box h4, .methods-box h4, .hots-box h4, .media-box h4 {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.materials-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  padding: 0.25rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 20px;
  font-size: 0.8rem;
}

/* Media & Sources */
.media-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.media-column h4 {
  margin-bottom: 0.75rem;
  color: var(--primary);
}

.media-column ol {
  padding-left: 1.5rem;
  margin: 0;
}

.media-column li {
  padding: 0.375rem 0;
}

/* Worksheets & Knowledge Sheets */
.worksheets-grid, .knowledge-sheets {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Knowledge Sheet Link Card */
.knowledge-link-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1));
  border: 2px solid rgba(16, 185, 129, 0.3);
  border-radius: 12px;
  margin-bottom: 1rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.link-card-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.link-icon {
  font-size: 2.5rem;
}

.link-info h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.link-info p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.worksheet-card, .knowledge-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
}

.worksheet-card h4, .knowledge-card h4 {
  margin-bottom: 1rem;
  color: var(--primary);
}

.ws-objective, .ws-instructions {
  margin-bottom: 0.75rem;
}

.ws-questions ol {
  padding-left: 1.5rem;
  margin-top: 0.5rem;
}

.ks-content {
  white-space: pre-wrap;
  line-height: 1.8;
}

/* Worksheet Badge & ARCE Mini */
.ws-badge {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.arce-mini {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
}

.arce-mini.analysis { background: #6366f1; }
.arce-mini.reasoning { background: #10b981; }
.arce-mini.creativity { background: #f59e0b; }
.arce-mini.evidence { background: #ef4444; }

/* Worksheet Section */
.ws-section {
  margin-top: 1.25rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
  border-left: 3px solid var(--primary);
}

.ws-section h5 {
  margin-bottom: 0.75rem;
  color: var(--primary);
}

.ws-question-item {
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 0.75rem;
}

.ws-question-item .question-text {
  margin-bottom: 0.5rem;
}

.ws-question-item ul {
  margin: 0.5rem 0 0.5rem 1.5rem;
  padding: 0;
}

.question-hint {
  font-size: 0.875rem;
  color: #d97706;
  background: rgba(245, 158, 11, 0.1);
  padding: 0.5rem;
  border-radius: 6px;
  margin-top: 0.5rem;
}

/* Worksheet Table Preview */
.ws-table-preview {
  margin-top: 0.75rem;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.preview-table th, .preview-table td {
  border: 1px solid var(--border-color);
  padding: 0.5rem;
  text-align: left;
}

.preview-table th {
  background: var(--bg-primary);
  font-weight: 600;
}

/* Worksheet Reflection & Scoring */
.ws-reflection {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(168, 85, 247, 0.1);
  border-radius: 8px;
  border-left: 3px solid #a855f7;
}

.ws-reflection h5 {
  margin-bottom: 0.5rem;
  color: #a855f7;
}

.ws-scoring {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  text-align: center;
  color: #6366f1;
  font-weight: 600;
}

/* Knowledge Sheet Intro & Section */
.ks-intro {
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
  border-left: 4px solid var(--primary);
  margin-bottom: 1rem;
  line-height: 1.7;
}

.ks-section {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.ks-section h5 {
  margin-bottom: 0.75rem;
  color: var(--primary);
}

.key-points {
  margin: 0.75rem 0 0 1.5rem;
  padding: 0;
}

.key-points li {
  padding: 0.25rem 0;
}

.ks-example {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 8px;
  border-left: 3px solid #10b981;
}

.ks-example strong {
  color: #10b981;
}

.real-world {
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  font-size: 0.9rem;
}

/* Knowledge Sheet Diagram, Summary, Vocab, Self-check */
.ks-diagram {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 2px dashed var(--border-color);
}

.ks-diagram h5 {
  color: var(--primary);
  margin-bottom: 0.5rem;
}

.ks-summary {
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
  border-radius: 8px;
}

.ks-summary h5 {
  color: #6366f1;
  margin-bottom: 0.75rem;
}

.ks-summary ul {
  margin: 0;
  padding-left: 1.5rem;
}

.ks-summary li {
  padding: 0.25rem 0;
}

.ks-vocab {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.ks-vocab h5 {
  color: var(--primary);
  margin-bottom: 0.75rem;
}

.ks-vocab .vocab-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.ks-vocab .vocab-item strong {
  color: #6366f1;
  min-width: 120px;
}

.ks-selfcheck {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 8px;
}

.ks-selfcheck h5 {
  color: #10b981;
  margin-bottom: 0.75rem;
}

.ks-selfcheck ol {
  margin: 0;
  padding-left: 1.5rem;
}

.ks-selfcheck li {
  padding: 0.25rem 0;
}

/* ARCE Description */
.ws-arce-desc, .ks-arce-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  background: rgba(99, 102, 241, 0.05);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  margin-bottom: 0.75rem;
  font-style: italic;
}

/* AI Card Header with Delete Button */
.ai-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.btn-delete {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
  opacity: 0.6;
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  opacity: 1;
}

.btn-delete .material-icons {
  font-size: 1.25rem;
}

/* Post Teaching Record */
.post-teaching {
  margin-top: 2rem;
}

.record-item {
  margin-bottom: 1.5rem;
}

.record-item h4 {
  margin-bottom: 0.5rem;
}

.record-content {
  padding: 0.75rem;
  background: var(--bg-primary);
  border-radius: 8px;
  min-height: 60px;
  border: 1px dashed var(--border-color);
}

/* Signatures */
.signatures-section {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.signature-box {
  padding: 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  text-align: center;
}

.signature-box h4 {
  margin-bottom: 1rem;
  color: var(--text-secondary);
}

.signature-box p {
  margin: 0.5rem 0;
}

.comment-line {
  margin: 1rem 0 !important;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  text-decoration: none;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-outline {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-outline:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover {
  background: #059669;
}

.btn-worksheet {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
}

.btn-worksheet:hover:not(:disabled) {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.btn-ai {
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: white;
}

.btn-ai:hover:not(:disabled) {
  background: linear-gradient(135deg, #e879f9, #f43f5e);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(240, 147, 251, 0.3);
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn .material-icons {
  font-size: 1.125rem;
}

/* Modal Styles */
.modal-overlay {
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
  padding: 1rem;
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.btn-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.worksheet-info {
  margin-bottom: 1.5rem;
}

.worksheet-info p {
  margin: 0 0 0.5rem 0;
}

.worksheet-info .info-note {
  font-size: 0.875rem;
  color: var(--text-secondary);
  background: var(--bg-primary);
  padding: 0.75rem;
  border-radius: 8px;
  border-left: 3px solid var(--primary);
}

.worksheet-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.option-group select,
.option-group input[type="text"] {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  outline: none;
  font-size: 0.875rem;
}

.option-group select:focus,
.option-group input[type="text"]:focus {
  border-color: var(--primary);
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
}

/* Room Option Highlight */
.room-option {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
  border: 2px dashed rgba(16, 185, 129, 0.4);
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1rem;
}

.room-checkbox-label {
  font-weight: 600;
  font-size: 1rem;
}

.checkbox-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.room-icon {
  font-size: 1.25rem;
}

.room-hint {
  margin: 0.5rem 0 0 1.75rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Print Styles */
@media print {
  .top-navbar {
    display: none;
  }
  
  .plan-detail-content {
    padding: 0;
    max-width: 100%;
  }
  
  .ai-badge-header {
    display: none;
  }
  
  .plan-section {
    break-inside: avoid;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .top-navbar {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
  }

  .nav-actions {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .plan-detail-content {
    padding: 1rem;
  }

  .official-header {
    padding: 1.5rem;
  }

  .plan-main-title {
    font-size: 1.25rem;
  }

  .media-grid {
    grid-template-columns: 1fr;
  }

  .rubric-grid {
    grid-template-columns: 1fr;
  }
}

/* AI Generated Worksheet & Knowledge Sheet Styles */
.section-header-with-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header-with-btn h3 {
  margin: 0;
}

.btn-ai-gen {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-ai-gen:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
}

.btn-ai-gen:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ws-header, .ks-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.ws-title, .ks-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary);
  margin: 0;
}

.phase-badge, .arce-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.phase-badge {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

.arce-badge {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.ws-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.ws-error, .ks-error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

/* AI Generated Content */
.ai-generated {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 2px dashed var(--primary);
  position: relative;
}

.ai-badge {
  position: absolute;
  top: -12px;
  left: 1rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.ai-gen-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 0.375rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.ai-ws-objective, .ai-ks-intro {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border-left: 4px solid var(--primary);
}

.ai-ws-sections, .ai-ks-sections {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.ai-ws-section, .ai-ks-section {
  background: var(--bg-primary);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.ai-section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(99, 102, 241, 0.1);
  font-weight: 600;
  color: var(--primary);
}

.ai-section-content {
  padding: 1rem;
}

.ai-questions-list, .ai-reflection-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ai-question-item {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border-left: 3px solid #6366f1;
}

.ai-question-text {
  font-weight: 500;
  margin-bottom: 0.75rem;
  display: flex;
  gap: 0.5rem;
}

.q-num {
  color: var(--primary);
  font-weight: 700;
}

.ai-question-table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0;
  font-size: 0.875rem;
}

.ai-question-table th, .ai-question-table td {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  text-align: left;
}

.ai-question-table th {
  background: var(--bg-primary);
  font-weight: 600;
}

.ai-hint {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(251, 191, 36, 0.1);
  border-radius: 6px;
  font-size: 0.875rem;
  color: #d97706;
  margin-top: 0.5rem;
}

.ai-expected-answer {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 6px;
  border-left: 3px solid #10b981;
}

.ai-expected-answer strong {
  color: #10b981;
  display: block;
  margin-bottom: 0.25rem;
}

/* AI Knowledge Sheet Specific */
.ai-ks-diagrams, .ai-ks-vocab, .ai-ks-selfcheck {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border-radius: 8px;
}

.ai-ks-diagrams h5, .ai-ks-vocab h5, .ai-ks-selfcheck h5 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: var(--primary);
}

.diagrams-list, .vocab-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.diagram-item {
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.diagram-title {
  font-weight: 600;
  color: var(--primary);
  min-width: 120px;
}

.vocab-item {
  padding: 0.625rem 1rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.vocab-term {
  font-weight: 600;
  color: #6366f1;
  min-width: 150px;
}

.vocab-def {
  color: var(--text-secondary);
}

.selfcheck-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.selfcheck-list li {
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.selfcheck-list li::before {
  content: "☐";
  color: var(--primary);
}

/* Scoring Section */
.ai-scoring {
  margin-top: 1.25rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.ai-scoring h5 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: #6366f1;
}

.scoring-criteria {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
}

.scoring-criteria li {
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  font-size: 0.875rem;
}

.reflection-item {
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  border-left: 3px solid #a855f7;
}
</style>
