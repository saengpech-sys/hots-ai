<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content ks-generator-modal">
      <div class="modal-header">
        <h2>📖 สร้างใบความรู้อัตโนมัติ</h2>
        <button class="close-btn" @click="$emit('close')">
          <span class="material-icons">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Step indicator -->
        <div class="step-indicator">
          <div class="step" :class="{ active: currentStep === 0, completed: currentStep > 0 }">
            <span class="step-number">1</span>
            <span class="step-label">ประเภท</span>
          </div>
          <div class="step-line" :class="{ completed: currentStep > 0 }"></div>
          <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
            <span class="step-number">2</span>
            <span class="step-label">เลือกแผน</span>
          </div>
          <div class="step-line" :class="{ completed: currentStep > 1 }"></div>
          <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
            <span class="step-number">3</span>
            <span class="step-label">ตั้งค่า</span>
          </div>
          <div class="step-line" :class="{ completed: currentStep > 2 }"></div>
          <div class="step" :class="{ active: currentStep === 3 }">
            <span class="step-number">4</span>
            <span class="step-label">ยืนยัน</span>
          </div>
        </div>

        <!-- Step 0: Select Type -->
        <div v-if="currentStep === 0" class="step-content">
          <h3>📋 เลือกประเภทใบความรู้</h3>
          
          <div class="type-selection">
            <div 
              class="type-card" 
              :class="{ selected: sheetType === 'plan' }"
              @click="sheetType = 'plan'"
            >
              <div class="type-icon">📄</div>
              <h4>ใบความรู้รายแผน</h4>
              <p>สร้างใบความรู้สำหรับแผนการสอน 1 แผน</p>
              <ul class="type-features">
                <li>✓ เนื้อหาเฉพาะเจาะจง</li>
                <li>✓ เหมาะสำหรับแต่ละคาบเรียน</li>
                <li>✓ เชื่อมโยงกับกิจกรรม 5E</li>
              </ul>
            </div>
            
            <div 
              class="type-card batch-card" 
              :class="{ selected: sheetType === 'batch' }"
              @click="sheetType = 'batch'"
            >
              <div class="type-icon">📑</div>
              <div class="new-badge">✨ แนะนำ!</div>
              <h4>สร้างทั้งหน่วยอัตโนมัติ</h4>
              <p>สร้างใบความรู้ต่อเนื่องทุกแผนในหน่วย</p>
              <ul class="type-features">
                <li>✓ ครบถ้วนตามองค์ความรู้</li>
                <li>✓ แต่ละแผนเน้นจุดเด่นต่างกัน</li>
                <li>✓ สร้างอัตโนมัติต่อเนื่อง</li>
                <li>✓ ประหยัดเวลา</li>
              </ul>
            </div>
            
            <div 
              class="type-card unit-card" 
              :class="{ selected: sheetType === 'unit' }"
              @click="sheetType = 'unit'"
            >
              <div class="type-icon">📚</div>
              <h4>ใบความรู้รวมหน่วย</h4>
              <p>สรุปภาพรวมของทั้งหน่วยการเรียนรู้</p>
              <ul class="type-features">
                <li>✓ Concept Map ภาพรวม</li>
                <li>✓ แนวคิดหลักของหน่วย</li>
                <li>✓ เหมาะใช้ก่อนเริ่มหน่วย</li>
              </ul>
            </div>

            <!-- ✨ NEW: Standalone Mode -->
            <div 
              class="type-card standalone-card" 
              :class="{ selected: sheetType === 'standalone' }"
              @click="sheetType = 'standalone'"
            >
              <div class="type-icon">🆕</div>
              <div class="new-badge">✨ ใหม่!</div>
              <h4>สร้างอิสระ (ไม่ต้องมีแผน)</h4>
              <p>สร้างใบความรู้โดยไม่ต้องมีแผนการสอน</p>
              <ul class="type-features">
                <li>✓ กำหนดหัวข้อเอง</li>
                <li>✓ ยืดหยุ่นสูง</li>
                <li>✓ เหมาะสำหรับเนื้อหาเสริม</li>
                <li>✓ รวดเร็วทันใจ</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Step 1: Select Lesson Plan(s) -->
        <div v-if="currentStep === 1" class="step-content">
          <h3 v-if="sheetType === 'plan'">📚 เลือกแผนการสอน</h3>
          <h3 v-else-if="sheetType === 'batch'">📑 เลือกหน่วยสำหรับสร้างใบความรู้ทั้งหมด</h3>
          <h3 v-else-if="sheetType === 'standalone'">🆕 กำหนดหัวข้อใบความรู้</h3>
          <h3 v-else>📚 เลือกหน่วยการเรียนรู้</h3>
          
          <!-- ✨ Standalone Mode Input -->
          <div v-if="sheetType === 'standalone'" class="standalone-form">
            <div class="form-group">
              <label>📌 หัวข้อใบความรู้ <span class="required">*</span></label>
              <input 
                type="text" 
                v-model="standaloneData.topic" 
                class="form-control"
                placeholder="เช่น การสังเคราะห์ด้วยแสง, กฎของนิวตัน, สมการเชิงเส้น"
              >
            </div>
            
            <div class="form-group">
              <label>📝 คำอธิบายเพิ่มเติม</label>
              <textarea 
                v-model="standaloneData.description" 
                class="form-control"
                rows="3"
                placeholder="อธิบายเนื้อหาที่ต้องการให้ AI สร้าง (ถ้ามี)"
              ></textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group half">
                <label>🎓 ระดับชั้น</label>
                <select v-model="standaloneData.gradeLevel" class="form-control">
                  <option value="ม.1">มัธยมศึกษาปีที่ 1</option>
                  <option value="ม.2">มัธยมศึกษาปีที่ 2</option>
                  <option value="ม.3">มัธยมศึกษาปีที่ 3</option>
                  <option value="ม.4">มัธยมศึกษาปีที่ 4</option>
                  <option value="ม.5">มัธยมศึกษาปีที่ 5</option>
                  <option value="ม.6">มัธยมศึกษาปีที่ 6</option>
                </select>
              </div>
              <div class="form-group half">
                <label>📚 กลุ่มสาระ</label>
                <select v-model="standaloneData.subjectGroup" class="form-control">
                  <option value="วิทยาศาสตร์">วิทยาศาสตร์และเทคโนโลยี</option>
                  <option value="คณิตศาสตร์">คณิตศาสตร์</option>
                  <option value="ภาษาไทย">ภาษาไทย</option>
                  <option value="สังคมศึกษา">สังคมศึกษา</option>
                  <option value="ภาษาอังกฤษ">ภาษาต่างประเทศ</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label>🎯 ประเด็นสำคัญที่ต้องครอบคลุม</label>
              <div class="key-points-input">
                <div v-for="(point, idx) in standaloneData.keyPoints" :key="idx" class="key-point-item">
                  <input 
                    type="text" 
                    v-model="standaloneData.keyPoints[idx]" 
                    class="form-control"
                    :placeholder="`ประเด็นที่ ${idx + 1}`"
                  >
                  <button 
                    v-if="standaloneData.keyPoints.length > 1" 
                    class="btn-remove" 
                    @click="standaloneData.keyPoints.splice(idx, 1)"
                  >
                    <span class="material-icons">close</span>
                  </button>
                </div>
                <button class="btn-add" @click="standaloneData.keyPoints.push('')">
                  <span class="material-icons">add</span> เพิ่มประเด็น
                </button>
              </div>
            </div>

            <div class="ai-note info">
              <span class="material-icons">lightbulb</span>
              <p>ยิ่งให้รายละเอียดมาก AI จะสร้างเนื้อหาได้ตรงใจมากขึ้น<br>
              สามารถปรับแก้ได้หลังจากสร้างเสร็จ</p>
            </div>
          </div>
          
          <!-- Unit/Batch Selection Mode -->
          <div v-if="sheetType === 'unit' || sheetType === 'batch'" class="unit-selection">
            <div class="filter-row">
              <label>เลือกรายวิชา:</label>
              <select v-model="filterCourseId" @change="loadUnitsForCourse" class="form-control">
                <option value="">-- เลือกรายวิชา --</option>
                <option v-for="c in courses" :key="c.id" :value="c.id">
                  {{ c.courseCode }} - {{ c.courseName || c.name }}
                </option>
              </select>
            </div>

            <div v-if="loadingUnits" class="loading-state">
              <span class="material-icons spin">sync</span>
              กำลังโหลดหน่วยการเรียนรู้...
            </div>

            <div v-else-if="filterCourseId && unitsWithPlans.length === 0" class="empty-state">
              <span class="material-icons">info</span>
              <p>ไม่พบหน่วยการเรียนรู้ในรายวิชานี้</p>
            </div>

            <div v-else-if="unitsWithPlans.length > 0" class="units-grid">
              <div 
                v-for="unit in unitsWithPlans" 
                :key="unit.unitNumber"
                class="unit-card-select"
                :class="{ 
                  selected: selectedUnit?.unitNumber === unit.unitNumber,
                  'has-sheet': unit.hasUnitSheet
                }"
                @click="selectUnit(unit)"
              >
                <div class="unit-header">
                  <span class="unit-number">หน่วยที่ {{ unit.unitNumber }}</span>
                  <span v-if="unit.hasUnitSheet" class="badge exists">มีใบความรู้รวมแล้ว</span>
                </div>
                <h4>{{ unit.unitName }}</h4>
                <div class="unit-stats">
                  <span>📝 {{ unit.plans.length }} แผน</span>
                  <span>📖 {{ unit.sheetsCount }}/{{ unit.plans.length }} มีใบความรู้</span>
                </div>
                <div class="plans-preview">
                  <div v-for="p in unit.plans.slice(0, 3)" :key="p.id" class="plan-mini">
                    แผนที่ {{ p.planNumber }}: {{ p.topic?.substring(0, 20) }}...
                  </div>
                  <div v-if="unit.plans.length > 3" class="more-plans">
                    +{{ unit.plans.length - 3 }} แผน
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Single Plan Selection Mode -->
          <div v-else>
            <!-- Pre-selected plan -->
            <div v-if="preSelectedPlan" class="preselected-plan">
              <div v-if="hasKnowledgeSheet(preSelectedPlan.id)" class="existing-warning">
                <span class="material-icons">warning</span>
                <div>
                  <strong>แผนนี้มีใบความรู้แล้ว!</strong>
                  <p>กรุณาลบใบความรู้เดิมก่อนสร้างใหม่</p>
                </div>
              </div>
              <div class="plan-card selected" :class="{ disabled: hasKnowledgeSheet(preSelectedPlan.id) }">
                <div class="plan-badges">
                  <span class="badge unit">หน่วยที่ {{ preSelectedPlan.unitNumber || 1 }}</span>
                  <span class="badge plan-num">แผนที่ {{ preSelectedPlan.planNumber || 1 }}</span>
                  <span v-if="hasKnowledgeSheet(preSelectedPlan.id)" class="badge exists">มีใบความรู้แล้ว</span>
                </div>
                <h4>{{ preSelectedPlan.topic || preSelectedPlan.title }}</h4>
                <p class="course">📚 {{ preSelectedPlan.courseName }}</p>
                <div class="plan-meta">
                  <span>⏱️ {{ preSelectedPlan.duration || 50 }} นาที</span>
                  <span>🎓 {{ preSelectedPlan.gradeLevel || 'ม.4' }}</span>
                </div>
              </div>
            </div>

            <!-- Plan selection list -->
            <div v-else class="plan-selection">
            <div class="filter-row">
              <label>กรองรายวิชา:</label>
              <select v-model="filterCourseId" class="form-control">
                <option value="">ทั้งหมด</option>
                <option v-for="c in courses" :key="c.id" :value="c.id">
                  {{ c.courseCode }} - {{ c.courseName || c.name }}
                </option>
              </select>
            </div>

            <div v-if="loading" class="loading-state">
              <span class="material-icons spin">sync</span>
              กำลังโหลด...
            </div>

            <div v-else-if="filteredPlans.length === 0" class="empty-state">
              <span class="material-icons">info</span>
              <p>ไม่พบแผนการสอน</p>
            </div>

            <div v-else class="plans-grid">
              <div 
                v-for="plan in filteredPlans" 
                :key="plan.id"
                class="plan-card"
                :class="{ 
                  selected: selectedPlan?.id === plan.id,
                  disabled: hasKnowledgeSheet(plan.id)
                }"
                @click="selectPlan(plan)"
              >
                <div class="plan-badges">
                  <span class="badge unit">หน่วยที่ {{ plan.unitNumber || 1 }}</span>
                  <span class="badge plan-num">แผนที่ {{ plan.planNumber || 1 }}</span>
                  <span v-if="hasKnowledgeSheet(plan.id)" class="badge exists">มีใบความรู้แล้ว</span>
                </div>
                <h4>{{ plan.topic || plan.title }}</h4>
                <p class="course">📚 {{ plan.courseName || plan.courseCode }}</p>
                <div class="plan-meta">
                  <span>⏱️ {{ plan.duration || 50 }} นาที</span>
                  <span>🎓 {{ plan.gradeLevel || 'ม.4' }}</span>
                </div>
                <div v-if="selectedPlan?.id === plan.id" class="check-mark">
                  <span class="material-icons">check_circle</span>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        <!-- Step 2: Options -->
        <div v-if="currentStep === 2" class="step-content">
          <h3>⚙️ ตั้งค่าใบความรู้</h3>
          
          <div class="options-form">
            <!-- Style -->
            <div class="option-group">
              <label>📐 รูปแบบเนื้อหา</label>
              <div class="style-cards">
                <div 
                  class="style-card" 
                  :class="{ selected: options.style === 'standard' }"
                  @click="options.style = 'standard'"
                >
                  <span class="icon">📝</span>
                  <strong>มาตรฐาน</strong>
                  <small>สมดุลทุกส่วน</small>
                </div>
                <div 
                  class="style-card" 
                  :class="{ selected: options.style === 'concise' }"
                  @click="options.style = 'concise'"
                >
                  <span class="icon">📋</span>
                  <strong>กระชับ</strong>
                  <small>เน้นสาระสำคัญ</small>
                </div>
                <div 
                  class="style-card" 
                  :class="{ selected: options.style === 'detailed' }"
                  @click="options.style = 'detailed'"
                >
                  <span class="icon">📚</span>
                  <strong>ละเอียด</strong>
                  <small>อธิบายครบถ้วน</small>
                </div>
              </div>
            </div>

            <!-- Language -->
            <div class="option-group">
              <label>🌐 ภาษา</label>
              <div class="toggle-btns">
                <button 
                  :class="{ active: options.language === 'thai' }"
                  @click="options.language = 'thai'"
                >
                  🇹🇭 ภาษาไทย
                </button>
                <button 
                  :class="{ active: options.language === 'bilingual' }"
                  @click="options.language = 'bilingual'"
                >
                  🌐 ไทย-อังกฤษ
                </button>
              </div>
            </div>

            <!-- Include sections -->
            <div class="option-group">
              <label>📦 ส่วนประกอบที่ต้องการ</label>
              <div class="checkbox-list">
                <label class="checkbox-item">
                  <input type="checkbox" v-model="options.includeIntroduction" checked>
                  <span>🎯 บทนำและจุดประสงค์</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="options.includeExamples">
                  <span>📌 ตัวอย่างและกรณีศึกษา</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="options.includeDiagrams">
                  <span>📊 แผนภาพและตาราง</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="options.includeVocabulary">
                  <span>📚 คำศัพท์สำคัญ</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="options.includeHOTS" disabled checked>
                  <span>🧠 คำถาม HOTS (A.R.C.E.) <em class="required">*จำเป็น</em></span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="options.includeSummary">
                  <span>📝 สรุปและ Mind Map</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="options.includeSelfCheck">
                  <span>✅ แบบทดสอบตนเอง</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="options.includeResources">
                  <span>🔗 แหล่งเรียนรู้เพิ่มเติม</span>
                </label>
              </div>
            </div>

            <!-- Room assignment -->
            <div v-if="!existingRoomId" class="option-group">
              <label>🏫 ห้องกิจกรรม</label>
              <div class="room-options">
                <label class="radio-item">
                  <input type="radio" v-model="options.roomOption" value="auto">
                  <span>สร้างห้องอัตโนมัติ (ใช้ชื่อรายวิชา)</span>
                </label>
                <label class="radio-item">
                  <input type="radio" v-model="options.roomOption" value="existing">
                  <span>เลือกห้องที่มีอยู่</span>
                </label>
                <label class="radio-item">
                  <input type="radio" v-model="options.roomOption" value="none">
                  <span>ไม่เพิ่มเข้าห้อง</span>
                </label>
              </div>
              <div v-if="options.roomOption === 'existing'" class="room-select">
                <select v-model="options.selectedRoomId" class="form-control">
                  <option value="">-- เลือกห้อง --</option>
                  <option v-for="room in existingRooms" :key="room.id" :value="room.id">
                    {{ room.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Confirm -->
        <div v-if="currentStep === 3" class="step-content">
          <h3>✅ ยืนยันการสร้าง</h3>

          <!-- ✨ NEW: Standalone Mode Summary -->
          <div v-if="sheetType === 'standalone'" class="summary-box standalone-summary">
            <div class="summary-header">
              <span class="icon">🆕</span>
              <div>
                <h4>ใบความรู้อิสระ</h4>
                <p>{{ standaloneData.topic }}</p>
              </div>
            </div>

            <div class="summary-details">
              <div class="detail-item">
                <span class="label">หัวข้อ:</span>
                <span class="value">{{ standaloneData.topic }}</span>
              </div>
              <div v-if="standaloneData.description" class="detail-item">
                <span class="label">คำอธิบาย:</span>
                <span class="value">{{ standaloneData.description }}</span>
              </div>
              <div class="detail-item">
                <span class="label">ระดับชั้น:</span>
                <span class="value">{{ standaloneData.gradeLevel }}</span>
              </div>
              <div class="detail-item">
                <span class="label">กลุ่มสาระ:</span>
                <span class="value">{{ standaloneData.subjectGroup }}</span>
              </div>
              <div class="detail-item">
                <span class="label">รูปแบบ:</span>
                <span class="value">{{ getStyleLabel(options.style) }}</span>
              </div>
            </div>

            <div v-if="standaloneData.keyPoints.filter(p => p.trim()).length > 0" class="key-points-preview">
              <strong>ประเด็นสำคัญ:</strong>
              <ul>
                <li v-for="(point, idx) in standaloneData.keyPoints.filter(p => p.trim())" :key="idx">
                  {{ point }}
                </li>
              </ul>
            </div>

            <div class="included-sections">
              <strong>โครงสร้างใบความรู้:</strong>
              <div class="section-tags">
                <span v-if="options.includeIntroduction" class="tag">🎯 บทนำ</span>
                <span class="tag">📌 จุดประสงค์</span>
                <span class="tag">📖 เนื้อหาสาระ</span>
                <span v-if="options.includeExamples" class="tag">💡 ตัวอย่าง</span>
                <span v-if="options.includeDiagrams" class="tag">📊 แผนภาพ</span>
                <span v-if="options.includeVocabulary" class="tag">📚 คำศัพท์</span>
                <span class="tag">🧠 HOTS A.R.C.E.</span>
                <span v-if="options.includeSummary" class="tag">📝 สรุป</span>
                <span v-if="options.includeSelfCheck" class="tag">✅ ทดสอบตนเอง</span>
                <span v-if="options.includeResources" class="tag">🔗 แหล่งเรียนรู้</span>
              </div>
            </div>

            <div class="ai-note info">
              <span class="material-icons">auto_awesome</span>
              <p>AI จะสร้างใบความรู้ครบถ้วนพร้อม <strong>การตรวจสอบคุณภาพอัตโนมัติ</strong><br>
              ระบบจะแจ้งหากพบข้อควรปรับปรุง</p>
            </div>
          </div>

          <!-- Batch Generation Summary -->
          <div v-if="sheetType === 'batch'" class="summary-box batch-summary">
            <div class="summary-header">
              <span class="icon">📑</span>
              <div>
                <h4>สร้างใบความรู้ทั้งหน่วยอัตโนมัติ</h4>
                <p>หน่วยที่ {{ selectedUnit?.unitNumber }} - {{ selectedUnit?.unitName }}</p>
              </div>
            </div>

            <div class="batch-plans-preview">
              <strong>แผนที่จะสร้างใบความรู้:</strong>
              <div class="plans-list">
                <div 
                  v-for="plan in selectedUnit?.plans" 
                  :key="plan.id"
                  class="plan-item"
                  :class="{ 'has-sheet': hasKnowledgeSheet(plan.id) }"
                >
                  <span class="plan-number">แผนที่ {{ plan.planNumber }}</span>
                  <span class="plan-topic">{{ plan.topic }}</span>
                  <span v-if="hasKnowledgeSheet(plan.id)" class="badge skip">มีแล้ว</span>
                  <span v-else class="badge pending">จะสร้าง</span>
                </div>
              </div>
              <div class="batch-stats">
                <span class="stat">
                  📝 สร้างใหม่: <strong>{{ selectedUnit?.plans?.filter(p => !hasKnowledgeSheet(p.id)).length || 0 }}</strong> แผน
                </span>
                <span class="stat">
                  ✓ มีแล้ว: <strong>{{ selectedUnit?.plans?.filter(p => hasKnowledgeSheet(p.id)).length || 0 }}</strong> แผน
                </span>
              </div>
            </div>

            <div class="ai-note warning">
              <span class="material-icons">schedule</span>
              <p>การสร้างใบความรู้หลายแผนใช้เวลาประมาณ <strong>30-60 วินาที/แผน</strong><br>
              กรุณารอจนกว่าจะเสร็จสิ้น (ไม่ต้องปิดหน้าต่าง)</p>
            </div>
          </div>

          <!-- Unit Summary -->
          <div v-else-if="sheetType === 'unit'" class="summary-box">
            <div class="summary-header">
              <span class="icon">📚</span>
              <div>
                <h4>ใบความรู้รวมหน่วยที่ {{ selectedUnit?.unitNumber }}</h4>
                <p>{{ selectedUnit?.unitName }}</p>
              </div>
            </div>

            <div class="summary-details">
              <div class="detail-item">
                <span class="label">รายวิชา:</span>
                <span class="value">{{ selectedUnit?.courseCode }} - {{ selectedUnit?.courseName }}</span>
              </div>
              <div class="detail-item">
                <span class="label">จำนวนแผน:</span>
                <span class="value">{{ selectedUnit?.plans?.length || 0 }} แผน</span>
              </div>
              <div class="detail-item">
                <span class="label">รูปแบบ:</span>
                <span class="value">{{ getStyleLabel(options.style) }}</span>
              </div>
            </div>

            <div v-if="!existingRoomId" class="room-info">
              <strong>🏫 ห้องกิจกรรม:</strong>
              <span>{{ getUnitRoomLabel() }}</span>
            </div>
          </div>

          <!-- Single Plan Summary -->
          <div v-else class="summary-box">
            <div class="summary-header">
              <span class="icon">📖</span>
              <div>
                <h4>ใบความรู้ที่ {{ activePlan?.planNumber || 1 }}</h4>
                <p>{{ activePlan?.topic || activePlan?.title }}</p>
              </div>
            </div>

            <div class="summary-details">
              <div class="detail-item">
                <span class="label">รายวิชา:</span>
                <span class="value">{{ activePlan?.courseCode }} - {{ activePlan?.courseName }}</span>
              </div>
              <div class="detail-item">
                <span class="label">หน่วยที่:</span>
                <span class="value">{{ activePlan?.unitNumber || 1 }} - {{ activePlan?.unitName }}</span>
              </div>
              <div class="detail-item">
                <span class="label">ระดับชั้น:</span>
                <span class="value">{{ activePlan?.gradeLevel || 'ม.4' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">รูปแบบ:</span>
                <span class="value">{{ getStyleLabel(options.style) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">ภาษา:</span>
                <span class="value">{{ options.language === 'bilingual' ? 'ไทย-อังกฤษ' : 'ไทย' }}</span>
              </div>
            </div>

            <div class="included-sections">
              <strong>โครงสร้างใบความรู้มาตรฐาน:</strong>
              <div class="section-tags">
                <span v-if="options.includeIntroduction" class="tag">🎯 บทนำ</span>
                <span class="tag">📌 จุดประสงค์</span>
                <span class="tag">📖 เนื้อหาสาระ</span>
                <span v-if="options.includeExamples" class="tag">💡 ตัวอย่าง</span>
                <span v-if="options.includeDiagrams" class="tag">📊 แผนภาพ</span>
                <span v-if="options.includeVocabulary" class="tag">📚 คำศัพท์</span>
                <span class="tag">🧠 HOTS A.R.C.E.</span>
                <span v-if="options.includeSummary" class="tag">📝 สรุป</span>
                <span v-if="options.includeSelfCheck" class="tag">✅ ทดสอบตนเอง</span>
                <span v-if="options.includeResources" class="tag">🔗 แหล่งเรียนรู้</span>
              </div>
            </div>

            <div v-if="!existingRoomId" class="room-info">
              <strong>ห้องกิจกรรม:</strong>
              <span>{{ getRoomLabel() }}</span>
            </div>
          </div>

          <div v-if="sheetType === 'plan'" class="ai-note">
            <span class="material-icons">auto_awesome</span>
            <p>AI จะสร้างใบความรู้ตามโครงสร้างมาตรฐานที่กำหนด<br>ใช้เวลาประมาณ 30-60 วินาที</p>
          </div>
        </div>

        <!-- Generating overlay -->
        <div v-if="generating" class="generating-overlay">
          <div class="generating-content">
            <div class="spinner-large"></div>
            <h3>🤖 {{ sheetType === 'batch' ? 'กำลังสร้างใบความรู้ทั้งหน่วย...' : 'กำลังสร้างใบความรู้...' }}</h3>
            <p>{{ generatingMessage }}</p>
            <div v-if="sheetType === 'batch' && batchProgress.total > 0" class="batch-progress">
              <p class="current-plan">📖 {{ batchProgress.currentPlan }}</p>
              <p class="progress-text">{{ batchProgress.current }} / {{ batchProgress.total }} แผน</p>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button v-if="currentStep > 0" class="btn btn-secondary" @click="currentStep--" :disabled="generating">
          <span class="material-icons">arrow_back</span> ย้อนกลับ
        </button>
        <div class="spacer"></div>
        <button class="btn btn-secondary" @click="$emit('close')" :disabled="generating">
          ยกเลิก
        </button>
        <button v-if="currentStep < 3" class="btn btn-primary" @click="nextStep" :disabled="!canProceed">
          ถัดไป <span class="material-icons">arrow_forward</span>
        </button>
        <button v-else class="btn btn-ai" @click="generate" :disabled="generating">
          <span v-if="generating" class="material-icons spin">sync</span>
          <span v-else class="material-icons">auto_awesome</span>
          {{ getGenerateButtonLabel() }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { db } from '@/firebase/config'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  preSelectedPlan: { type: Object, default: null },
  existingRoomId: { type: String, default: null },
  existingRoomName: { type: String, default: '' },
  roomCourseId: { type: String, default: null }
})

const emit = defineEmits(['close', 'generated'])
const authStore = useAuthStore()

// State
const currentStep = ref(0)  // Start at step 0 (type selection)
const sheetType = ref('plan')  // 'plan', 'unit', 'batch', or 'standalone'
const loading = ref(false)
const loadingUnits = ref(false)
const generating = ref(false)
const generatingMessage = ref('')
const progressPercent = ref(0)
const lessonPlans = ref([])
const courses = ref([])
const existingRooms = ref([])
const existingKnowledgeSheets = ref([])
const existingUnitSheets = ref([])
const selectedPlan = ref(null)
const selectedUnit = ref(null)
const unitsWithPlans = ref([])
const filterCourseId = ref(props.roomCourseId || '')

// ✨ NEW: Standalone mode data
const standaloneData = ref({
  topic: '',
  description: '',
  gradeLevel: 'ม.4',
  subjectGroup: 'วิทยาศาสตร์',
  keyPoints: ['', '']
})

// ✨ NEW: Generation result with validation feedback
const generationResult = ref(null)

// Options
const options = ref({
  style: 'standard',
  language: 'thai',
  includeIntroduction: true,
  includeExamples: true,
  includeDiagrams: true,
  includeVocabulary: true,
  includeHOTS: true,
  includeSummary: true,
  includeSelfCheck: true,
  includeResources: true,
  roomOption: props.existingRoomId ? 'existing' : 'auto',
  selectedRoomId: props.existingRoomId || ''
})

// Computed
const activePlan = computed(() => props.preSelectedPlan || selectedPlan.value)

const filteredPlans = computed(() => {
  let plans = lessonPlans.value
  if (props.roomCourseId) {
    plans = plans.filter(p => p.courseId === props.roomCourseId)
  } else if (filterCourseId.value) {
    plans = plans.filter(p => p.courseId === filterCourseId.value)
  }
  return plans.sort((a, b) => {
    const uA = a.unitNumber || 1, uB = b.unitNumber || 1
    if (uA !== uB) return uA - uB
    return (a.planNumber || 1) - (b.planNumber || 1)
  })
})

const canProceed = computed(() => {
  if (currentStep.value === 0) {
    return sheetType.value !== ''
  }
  if (currentStep.value === 1) {
    // ✨ NEW: Standalone mode validation
    if (sheetType.value === 'standalone') {
      return standaloneData.value.topic.trim().length >= 5
    }
    if (sheetType.value === 'unit') {
      return selectedUnit.value && !selectedUnit.value.hasUnitSheet
    }
    if (sheetType.value === 'batch') {
      // For batch mode, check if there are any plans without knowledge sheets
      return selectedUnit.value && selectedUnit.value.plans.some(p => !hasKnowledgeSheet(p.id))
    }
    const plan = activePlan.value
    return plan && !hasKnowledgeSheet(plan.id)
  }
  return true
})

// Methods
function hasKnowledgeSheet(planId) {
  return existingKnowledgeSheets.value.some(ks => ks.lessonPlanId === planId)
}

function getExistingKnowledgeSheet(planId) {
  return existingKnowledgeSheets.value.find(ks => ks.lessonPlanId === planId)
}

function selectPlan(plan) {
  if (hasKnowledgeSheet(plan.id)) return
  selectedPlan.value = plan
}

function nextStep() {
  if (canProceed.value && currentStep.value < 3) currentStep.value++
}

function getStyleLabel(style) {
  const labels = { standard: '📝 มาตรฐาน', concise: '📋 กระชับ', detailed: '📚 ละเอียด' }
  return labels[style] || style
}

function getGenerateButtonLabel() {
  if (generating.value) return 'กำลังสร้าง...'
  if (sheetType.value === 'batch') {
    const count = selectedUnit.value?.plans?.filter(p => !hasKnowledgeSheet(p.id)).length || 0
    return `สร้างใบความรู้ ${count} แผน`
  }
  if (sheetType.value === 'unit') return 'สร้างใบความรู้รวมหน่วย'
  if (sheetType.value === 'standalone') return 'สร้างใบความรู้อิสระ'
  return 'สร้างใบความรู้ด้วย AI'
}

function getRoomLabel() {
  if (props.existingRoomId) return props.existingRoomName || 'ห้องปัจจุบัน'
  if (options.value.roomOption === 'auto') return 'สร้างอัตโนมัติ'
  if (options.value.roomOption === 'existing') {
    const room = existingRooms.value.find(r => r.id === options.value.selectedRoomId)
    return room?.name || 'เลือกห้อง'
  }
  return 'ไม่เพิ่มเข้าห้อง'
}

function getUnitRoomLabel() {
  if (props.existingRoomId) return props.existingRoomName || 'ห้องปัจจุบัน'
  if (options.value.roomOption === 'auto') {
    return `สร้างห้องใหม่: ห้องกิจกรรม หน่วยที่ ${selectedUnit.value?.unitNumber} - ${selectedUnit.value?.unitName}`
  }
  if (options.value.roomOption === 'existing') {
    const room = existingRooms.value.find(r => r.id === options.value.selectedRoomId)
    return room?.name || 'เลือกห้อง'
  }
  return 'ไม่เพิ่มเข้าห้อง'
}

async function loadData() {
  loading.value = true
  try {
    // Load lesson plans
    const plansQuery = query(
      collection(db, 'lessonPlans'),
      where('teacherId', '==', authStore.user?.uid),
      orderBy('createdAt', 'desc')
    )
    const plansSnap = await getDocs(plansQuery)
    lessonPlans.value = plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Load courses
    const coursesQuery = query(
      collection(db, 'courses'),
      where('teacherId', '==', authStore.user?.uid)
    )
    const coursesSnap = await getDocs(coursesQuery)
    courses.value = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Load existing rooms
    const roomsQuery = query(
      collection(db, 'learningRooms'),
      where('teacherId', '==', authStore.user?.uid)
    )
    const roomsSnap = await getDocs(roomsQuery)
    existingRooms.value = roomsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Load existing knowledge sheets
    const ksQuery = query(
      collection(db, 'knowledgeSheets'),
      where('teacherId', '==', authStore.user?.uid)
    )
    const ksSnap = await getDocs(ksQuery)
    existingKnowledgeSheets.value = ksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

  } catch (error) {
    console.error('Error loading data:', error)
  } finally {
    loading.value = false
  }
}

// ===== UNIT KNOWLEDGE SHEET METHODS =====

function getOtherPlansInUnit(plan) {
  // หาแผนอื่นในหน่วยเดียวกัน
  return lessonPlans.value
    .filter(p => p.courseId === plan.courseId && 
                 p.unitNumber === plan.unitNumber && 
                 p.id !== plan.id)
    .map(p => ({
      planNumber: p.planNumber,
      topic: p.topic,
      hasKnowledgeSheet: hasKnowledgeSheet(p.id)
    }))
}

async function loadUnitsForCourse() {
  if (!filterCourseId.value) {
    unitsWithPlans.value = []
    return
  }

  loadingUnits.value = true
  try {
    // กรองแผนตามรายวิชาที่เลือก
    const coursePlans = lessonPlans.value.filter(p => p.courseId === filterCourseId.value)
    
    // จัดกลุ่มตามหน่วย
    const unitMap = new Map()
    coursePlans.forEach(plan => {
      const unitNum = plan.unitNumber || 1
      if (!unitMap.has(unitNum)) {
        unitMap.set(unitNum, {
          unitNumber: unitNum,
          unitName: plan.unitName || `หน่วยที่ ${unitNum}`,
          plans: [],
          sheetsCount: 0,
          hasUnitSheet: false,
          courseId: plan.courseId,
          courseCode: plan.courseCode,
          courseName: plan.courseName,
          gradeLevel: plan.gradeLevel
        })
      }
      unitMap.get(unitNum).plans.push(plan)
      if (hasKnowledgeSheet(plan.id)) {
        unitMap.get(unitNum).sheetsCount++
      }
    })

    // เช็คว่ามีใบความรู้รวมหน่วยหรือยัง
    for (const unit of unitMap.values()) {
      const existing = existingUnitSheets.value.find(
        us => us.courseId === filterCourseId.value && us.metadata?.unitNumber === unit.unitNumber
      )
      unit.hasUnitSheet = !!existing
    }

    unitsWithPlans.value = Array.from(unitMap.values()).sort((a, b) => a.unitNumber - b.unitNumber)
  } catch (error) {
    console.error('Error loading units:', error)
  } finally {
    loadingUnits.value = false
  }
}

function selectUnit(unit) {
  if (unit.hasUnitSheet) return
  selectedUnit.value = unit
}

async function generateUnitSheet() {
  if (!selectedUnit.value || generating.value) return
  generating.value = true
  progressPercent.value = 0

  const messages = [
    '🔍 วิเคราะห์แผนการสอนทั้งหมดในหน่วย...',
    '📊 จัดกลุ่มเนื้อหาให้ไม่ซ้ำซ้อน...',
    '🔗 สร้างความเชื่อมโยงระหว่างแผน...',
    '🗺️ ออกแบบ Concept Map...',
    '📝 สร้างคำแนะนำสำหรับแต่ละแผน...',
    '🏫 เพิ่มเข้าห้องกิจกรรม...',
    '✨ ตรวจสอบและจัดรูปแบบ...'
  ]

  let msgIndex = 0
  const interval = setInterval(() => {
    generatingMessage.value = messages[msgIndex % messages.length]
    progressPercent.value = Math.min(90, progressPercent.value + 15)
    msgIndex++
  }, 3000)

  try {
    const unit = selectedUnit.value
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'

    // Determine room settings
    let roomId = null
    let createRoom = false
    let roomName = null
    
    if (props.existingRoomId) {
      roomId = props.existingRoomId
    } else if (options.value.roomOption === 'existing' && options.value.selectedRoomId) {
      roomId = options.value.selectedRoomId
    } else if (options.value.roomOption === 'auto') {
      createRoom = true
      roomName = `ห้องกิจกรรม: หน่วยที่ ${unit.unitNumber} - ${unit.unitName}`
    }
    
    const response = await fetch(`${functionsUrl}/generateUnitKnowledgeSheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: authStore.user?.uid,
        courseId: unit.courseId,
        courseCode: unit.courseCode,
        courseName: unit.courseName,
        gradeLevel: unit.gradeLevel,
        unitNumber: unit.unitNumber,
        unitName: unit.unitName,
        lessonPlans: unit.plans.map(p => ({
          id: p.id,
          planNumber: p.planNumber,
          topic: p.topic,
          content: p.content || p,
          essentialContent: p.essentialContent || p.content?.essentialContent,
          objectives: p.objectives || p.content?.objectives,
          learningContent: p.learningContent || p.content?.learningContent
        })),
        style: options.value.style,
        language: options.value.language,
        // Room options
        createRoom,
        roomId,
        roomName
      })
    })

    clearInterval(interval)
    progressPercent.value = 100

    const result = await response.json()
    if (result.success) {
      emit('generated', { 
        unitKnowledgeSheetId: result.unitKnowledgeSheetId, 
        unitKnowledgeSheet: result.unitKnowledgeSheet,
        planGuidance: result.planGuidance,
        isUnitSheet: true,
        room: result.room
      })
    } else {
      throw new Error(result.error || 'Failed to generate unit knowledge sheet')
    }
  } catch (error) {
    clearInterval(interval)
    console.error('Error:', error)
    alert('เกิดข้อผิดพลาด: ' + error.message)
  } finally {
    generating.value = false
  }
}

// ✨ NEW: Batch generate knowledge sheets for all plans in a unit
const batchProgress = ref({ current: 0, total: 0, currentPlan: '' })

async function generateBatchSheets() {
  if (!selectedUnit.value || generating.value) return
  generating.value = true
  progressPercent.value = 0

  const unit = selectedUnit.value
  // Filter plans that don't have knowledge sheets yet
  const plansToGenerate = unit.plans.filter(p => !hasKnowledgeSheet(p.id))
  
  if (plansToGenerate.length === 0) {
    alert('ทุกแผนในหน่วยนี้มีใบความรู้แล้ว')
    generating.value = false
    return
  }

  batchProgress.value = { 
    current: 0, 
    total: plansToGenerate.length, 
    currentPlan: plansToGenerate[0]?.topic || ''
  }

  const messages = [
    `📚 กำลังเตรียมสร้างใบความรู้ ${plansToGenerate.length} แผน...`,
    '🔍 วิเคราะห์เนื้อหาทุกแผน...',
    '📝 สร้างใบความรู้ทีละแผน...',
    '✨ ตรวจสอบความครบถ้วน...'
  ]

  let msgIndex = 0
  const interval = setInterval(() => {
    generatingMessage.value = messages[msgIndex % messages.length]
    msgIndex++
  }, 4000)

  try {
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    
    // Prepare lesson plans data
    const lessonPlansData = plansToGenerate.map(p => ({
      id: p.id,
      planNumber: p.planNumber,
      topic: p.topic || p.title,
      content: p.content || p,
      essentialContent: p.essentialContent || p.content?.essentialContent,
      objectives: p.objectives || p.content?.objectives,
      learningContent: p.learningContent || p.content?.learningContent,
      activities5E: p.activities5E || p.content?.activities5E
    }))

    const response = await fetch(`${functionsUrl}/generateBatchKnowledgeSheets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: authStore.user?.uid,
        courseId: unit.courseId,
        courseCode: unit.courseCode,
        courseName: unit.courseName,
        gradeLevel: unit.gradeLevel,
        unitNumber: unit.unitNumber,
        unitName: unit.unitName,
        lessonPlans: lessonPlansData,
        style: options.value.style,
        language: options.value.language
      })
    })

    clearInterval(interval)
    progressPercent.value = 100

    const result = await response.json()
    if (result.success) {
      emit('generated', { 
        isBatch: true,
        totalPlans: result.totalPlans,
        successCount: result.successCount,
        errorCount: result.errorCount,
        results: result.results,
        errors: result.errors
      })
    } else {
      throw new Error(result.error || 'Failed to batch generate knowledge sheets')
    }
  } catch (error) {
    clearInterval(interval)
    console.error('Error:', error)
    alert('เกิดข้อผิดพลาด: ' + error.message)
  } finally {
    generating.value = false
    batchProgress.value = { current: 0, total: 0, currentPlan: '' }
  }
}

// Modified generate to handle all types
async function generate() {
  if (sheetType.value === 'unit') {
    await generateUnitSheet()
  } else if (sheetType.value === 'batch') {
    await generateBatchSheets()
  } else if (sheetType.value === 'standalone') {
    await generateStandaloneSheet()
  } else {
    await generatePlanSheet()
  }
}

// ✨ NEW: Generate standalone knowledge sheet without lesson plan
async function generateStandaloneSheet() {
  if (!standaloneData.value.topic.trim() || generating.value) return
  generating.value = true
  progressPercent.value = 0
  generationResult.value = null

  const messages = [
    '🔍 วิเคราะห์หัวข้อที่กำหนด...',
    '📚 รวบรวมเนื้อหาสาระ...',
    '💡 สร้างตัวอย่างประกอบ...',
    '🧠 สร้างคำถาม HOTS A.R.C.E...',
    '📊 ออกแบบแผนภาพและตาราง...',
    '📝 สรุปและจัด Mind Map...',
    '✅ ตรวจสอบคุณภาพ...',
    '✨ จัดรูปแบบให้สวยงาม...'
  ]

  let msgIndex = 0
  const interval = setInterval(() => {
    generatingMessage.value = messages[msgIndex % messages.length]
    progressPercent.value = Math.min(90, progressPercent.value + 10)
    msgIndex++
  }, 2500)

  try {
    // Prepare standalone content
    const standaloneContent = {
      topic: standaloneData.value.topic.trim(),
      description: standaloneData.value.description.trim(),
      gradeLevel: standaloneData.value.gradeLevel,
      subjectGroup: standaloneData.value.subjectGroup,
      keyPoints: standaloneData.value.keyPoints.filter(p => p.trim())
    }

    // Determine room settings
    let roomId = null
    let createRoom = false
    if (props.existingRoomId) {
      roomId = props.existingRoomId
    } else if (options.value.roomOption === 'existing' && options.value.selectedRoomId) {
      roomId = options.value.selectedRoomId
    } else if (options.value.roomOption === 'auto') {
      createRoom = true
    }

    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    const response = await fetch(`${functionsUrl}/generateKnowledgeSheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: authStore.user?.uid,
        // Standalone mode flag
        standaloneMode: true,
        standaloneContent,
        // Options
        style: options.value.style,
        language: options.value.language,
        includeIntroduction: options.value.includeIntroduction,
        includeExamples: options.value.includeExamples,
        includeDiagrams: options.value.includeDiagrams,
        includeVocabulary: options.value.includeVocabulary,
        includeHOTS: true,
        includeSummary: options.value.includeSummary,
        includeSelfCheck: options.value.includeSelfCheck,
        includeResources: options.value.includeResources,
        // Room options
        createRoom,
        roomId,
        // Request validation feedback
        returnValidation: true
      })
    })

    clearInterval(interval)
    progressPercent.value = 100

    const result = await response.json()
    generationResult.value = result

    if (result.success) {
      // Show validation feedback if any issues
      if (result.validation && !result.validation.isValid) {
        console.warn('Knowledge sheet has quality issues:', result.validation.issues)
      }

      emit('generated', { 
        knowledgeSheetId: result.knowledgeSheetId, 
        knowledgeSheet: result.knowledgeSheet,
        roomId: result.roomId,
        isStandalone: true,
        validation: result.validation,
        qualityScore: result.qualityScore,
        generationMetrics: result.generationMetrics
      })
    } else {
      throw new Error(result.error || 'Failed to generate')
    }
  } catch (error) {
    clearInterval(interval)
    console.error('Error:', error)
    alert('เกิดข้อผิดพลาด: ' + error.message)
  } finally {
    generating.value = false
  }
}

// Renamed original generate to generatePlanSheet
async function generatePlanSheet() {
  if (!activePlan.value || generating.value) return
  generating.value = true
  progressPercent.value = 0

  const messages = [
    '🔍 วิเคราะห์แผนการสอน...',
    '📚 รวบรวมเนื้อหาสาระ...',
    '💡 สร้างตัวอย่างและกรณีศึกษา...',
    '🧠 สร้างคำถาม HOTS...',
    '📊 ออกแบบแผนภาพ...',
    '📝 สรุปและจัด Mind Map...',
    '✨ ตรวจสอบและจัดรูปแบบ...'
  ]

  let msgIndex = 0
  const interval = setInterval(() => {
    generatingMessage.value = messages[msgIndex % messages.length]
    progressPercent.value = Math.min(90, progressPercent.value + 12)
    msgIndex++
  }, 2500)

  try {
    const plan = activePlan.value
    const content = plan.content || plan

    // Determine room settings
    let roomId = null
    let createRoom = false
    if (props.existingRoomId) {
      roomId = props.existingRoomId
    } else if (options.value.roomOption === 'existing' && options.value.selectedRoomId) {
      roomId = options.value.selectedRoomId
    } else if (options.value.roomOption === 'auto') {
      createRoom = true
    }

    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-hots-ai-d028b.cloudfunctions.net'
    const response = await fetch(`${functionsUrl}/generateKnowledgeSheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonPlanId: plan.id,
        teacherId: authStore.user?.uid,
        courseId: plan.courseId,
        courseCode: plan.courseCode || content.header?.courseCode,
        courseName: plan.courseName || content.header?.courseName,
        gradeLevel: plan.gradeLevel || content.header?.gradeLevel,
        unitNumber: plan.unitNumber || content.header?.unitNumber,
        unitName: plan.unitName || content.header?.unitName,
        planNumber: plan.planNumber || content.header?.planNumber,
        topic: plan.topic || content.header?.topic,
        objectives: content.objectives || plan.objectives,
        essentialContent: content.essentialContent || plan.essentialContent,
        learningContent: content.learningContent,
        activities5E: content.activities || content.activities5E,
        targetLOs: plan.targetLOs || content.header?.targetLOs,
        // Options
        style: options.value.style,
        language: options.value.language,
        includeIntroduction: options.value.includeIntroduction,
        includeExamples: options.value.includeExamples,
        includeDiagrams: options.value.includeDiagrams,
        includeVocabulary: options.value.includeVocabulary,
        includeHOTS: true,
        includeSummary: options.value.includeSummary,
        includeSelfCheck: options.value.includeSelfCheck,
        includeResources: options.value.includeResources,
        // Room options
        createRoom,
        roomId,
        // Context to avoid duplication
        otherPlansInUnit: getOtherPlansInUnit(plan)
      })
    })

    clearInterval(interval)
    progressPercent.value = 100

    const result = await response.json()
    if (result.success) {
      emit('generated', { 
        knowledgeSheetId: result.knowledgeSheetId, 
        knowledgeSheet: result.knowledgeSheet,
        roomId: result.roomId
      })
    } else {
      throw new Error(result.error || 'Failed to generate')
    }
  } catch (error) {
    clearInterval(interval)
    console.error('Error:', error)
    alert('เกิดข้อผิดพลาด: ' + error.message)
  } finally {
    generating.value = false
  }
}

onMounted(async () => {
  await loadData()
  
  // Load unit knowledge sheets
  try {
    const unitKsQuery = query(
      collection(db, 'unitKnowledgeSheets'),
      where('teacherId', '==', authStore.user?.uid)
    )
    const unitKsSnap = await getDocs(unitKsQuery)
    existingUnitSheets.value = unitKsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (err) {
    console.error('Error loading unit sheets:', err)
  }
  
  if (props.preSelectedPlan && !hasKnowledgeSheet(props.preSelectedPlan.id)) {
    sheetType.value = 'plan'
    currentStep.value = 2  // Skip to options
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.ks-generator-modal {
  background: var(--bg-secondary);
  border-radius: 16px;
  width: 100%;
  max-width: 750px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.05));
}

.modal-header h2 { margin: 0; font-size: 1.25rem; }

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  position: relative;
}

/* Step Indicator */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.step-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  transition: all 0.3s;
}

.step.active .step-number {
  background: linear-gradient(135deg, #10b981, #3b82f6);
  color: white;
}

.step.completed .step-number {
  background: #10b981;
  color: white;
}

.step-label { font-size: 0.85rem; color: var(--text-secondary); }
.step.active .step-label { color: #10b981; font-weight: 600; }

.step-line {
  flex: 1;
  height: 2px;
  background: var(--border-color);
  margin: 0 0.75rem 1.5rem;
  max-width: 80px;
  transition: background 0.3s;
}

.step-line.completed { background: #10b981; }

.step-content h3 {
  margin: 0 0 1.5rem;
  font-size: 1.1rem;
}

/* Filter Row */
.filter-row {
  margin-bottom: 1rem;
}

.filter-row label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.form-control {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 0.95rem;
}

/* Plans Grid */
.plans-grid {
  display: grid;
  gap: 0.75rem;
  max-height: 350px;
  overflow-y: auto;
}

.plan-card {
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.plan-card:hover:not(.disabled) { 
  border-color: #10b981; 
  transform: translateX(4px);
}

.plan-card.selected { 
  border-color: #10b981; 
  background: rgba(16, 185, 129, 0.1); 
}

.plan-card.disabled { 
  opacity: 0.6; 
  cursor: not-allowed; 
}

.plan-badges { 
  display: flex; 
  gap: 0.5rem; 
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.badge.unit { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.badge.plan-num { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.badge.exists { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.plan-card h4 { margin: 0 0 0.25rem; font-size: 0.95rem; }
.plan-card .course { margin: 0 0 0.5rem; font-size: 0.8rem; color: var(--text-secondary); }

.plan-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.check-mark {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  color: #10b981;
}

/* Warning */
.existing-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.existing-warning .material-icons { color: #ef4444; font-size: 1.5rem; }
.existing-warning strong { color: #ef4444; display: block; }
.existing-warning p { margin: 0.25rem 0 0; font-size: 0.9rem; color: var(--text-secondary); }

/* Options Form */
.options-form { display: flex; flex-direction: column; gap: 1.5rem; }
.option-group { display: flex; flex-direction: column; gap: 0.75rem; }
.option-group > label { font-weight: 600; font-size: 0.9rem; }

.style-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.style-card {
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.style-card:hover { border-color: #10b981; }
.style-card.selected { border-color: #10b981; background: rgba(16, 185, 129, 0.1); }

.style-card .icon { font-size: 1.5rem; display: block; margin-bottom: 0.5rem; }
.style-card strong { display: block; font-size: 0.9rem; }
.style-card small { font-size: 0.75rem; color: var(--text-secondary); }

.toggle-btns { display: flex; gap: 0.5rem; }
.toggle-btns button {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.toggle-btns button.active {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.checkbox-list { 
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem; 
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.checkbox-item input { width: 18px; height: 18px; accent-color: #10b981; }
.checkbox-item .required { font-size: 0.7rem; color: #10b981; margin-left: 0.25rem; }

.room-options { display: flex; flex-direction: column; gap: 0.5rem; }
.radio-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
}
.radio-item input { accent-color: #10b981; }

.room-select { margin-top: 0.5rem; padding-left: 1.5rem; }

/* Summary Box */
.summary-box {
  background: var(--bg-tertiary);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.summary-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.summary-header .icon { font-size: 2.5rem; }
.summary-header h4 { margin: 0; font-size: 1.1rem; }
.summary-header p { margin: 0.25rem 0 0; color: var(--text-secondary); font-size: 0.9rem; }

.summary-details { 
  display: grid; 
  grid-template-columns: 1fr 1fr; 
  gap: 0.75rem; 
  margin-bottom: 1rem; 
}

.detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
.detail-item .label { font-size: 0.8rem; color: var(--text-secondary); }
.detail-item .value { font-weight: 600; }

.included-sections { margin-bottom: 1rem; }
.included-sections strong { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; }

.section-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.section-tags .tag {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
}

.room-info {
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.room-info strong { margin-right: 0.5rem; font-size: 0.9rem; }

.ai-note {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 10px;
  padding: 1rem;
}

.ai-note .material-icons { color: #10b981; }
.ai-note p { margin: 0; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; }

/* Generating Overlay */
.generating-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 0 16px 16px;
}

.generating-content {
  text-align: center;
  color: white;
  padding: 2rem;
}

.spinner-large {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255,255,255,0.2);
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1.5rem;
}

.generating-content h3 { margin: 0 0 0.5rem; }
.generating-content p { margin: 0 0 1rem; opacity: 0.8; }

.progress-bar {
  width: 200px;
  height: 6px;
  background: rgba(255,255,255,0.2);
  border-radius: 3px;
  margin: 0 auto;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #3b82f6);
  transition: width 0.3s;
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
}

.spacer { flex: 1; }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); }
.btn-secondary:hover:not(:disabled) { background: var(--border-color); }

.btn-primary { background: #10b981; color: white; }
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }

.btn-ai { 
  background: linear-gradient(135deg, #10b981, #3b82f6); 
  color: white; 
}
.btn-ai:hover:not(:disabled) { filter: brightness(1.1); }

.btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Loading/Empty States */
.loading-state, .empty-state { 
  text-align: center; 
  padding: 2rem; 
  color: var(--text-secondary); 
}

.loading-state .material-icons, 
.empty-state .material-icons { 
  font-size: 2rem; 
  margin-bottom: 0.5rem; 
  display: block; 
}

.spin { animation: spin 1s linear infinite; }

@keyframes spin { 
  from { transform: rotate(0deg); } 
  to { transform: rotate(360deg); } 
}

/* Responsive */
@media (max-width: 600px) {
  .style-cards { grid-template-columns: 1fr; }
  .summary-details { grid-template-columns: 1fr; }
  .checkbox-list { grid-template-columns: 1fr; }
  .step-label { display: none; }
  .type-selection { grid-template-columns: 1fr; }
}

/* ===== TYPE SELECTION STYLES ===== */
.type-selection {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1rem;
}

.type-card {
  position: relative;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.type-card:hover {
  border-color: var(--primary-color, #10b981);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.type-card.selected {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.type-card .type-icon {
  font-size: 3rem;
  margin-bottom: 0.75rem;
}

.type-card h4 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.type-card p {
  margin: 0 0 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.type-card .new-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
}

.type-features {
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
}

.type-features li {
  padding: 0.25rem 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.type-card.selected .type-features li {
  color: var(--text-primary);
}

/* ===== UNIT SELECTION STYLES ===== */
.unit-selection {
  margin-top: 1rem;
}

.units-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.unit-card-select {
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.unit-card-select:hover:not(.has-sheet) {
  border-color: #10b981;
  transform: translateY(-2px);
}

.unit-card-select.selected {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.unit-card-select.has-sheet {
  opacity: 0.6;
  cursor: not-allowed;
}

.unit-card-select .unit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.unit-card-select .unit-number {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: bold;
}

.unit-card-select h4 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: var(--text-primary);
}

.unit-card-select .unit-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.unit-card-select .plans-preview {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 0.5rem;
}

.unit-card-select .plan-mini {
  font-size: 0.8rem;
  color: var(--text-secondary);
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--border-color);
}

.unit-card-select .plan-mini:last-child {
  border-bottom: none;
}

.unit-card-select .more-plans {
  font-size: 0.8rem;
  color: var(--primary-color, #10b981);
  padding-top: 0.25rem;
  font-weight: 500;
}

/* ===== BATCH GENERATION STYLES ===== */
.type-card.batch-card.selected {
  border-color: #8b5cf6;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.05));
}

.batch-summary {
  border-color: #8b5cf6;
}

.batch-plans-preview {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.batch-plans-preview .plans-list {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 0.5rem;
}

.batch-plans-preview .plan-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 8px;
  background: var(--bg-secondary);
  margin-bottom: 0.5rem;
}

.batch-plans-preview .plan-item.has-sheet {
  opacity: 0.6;
}

.batch-plans-preview .plan-number {
  font-weight: 600;
  color: var(--primary-color);
  white-space: nowrap;
}

.batch-plans-preview .plan-topic {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-plans-preview .badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
}

.batch-plans-preview .badge.pending {
  background: #dbeafe;
  color: #1d4ed8;
}

.batch-plans-preview .badge.skip {
  background: #f3f4f6;
  color: #6b7280;
}

.batch-stats {
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.batch-stats .stat {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.batch-stats .stat strong {
  color: var(--text-primary);
}

.ai-note.warning {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-left-color: #f59e0b;
}

.batch-progress {
  text-align: center;
  margin: 1rem 0;
}

.batch-progress .current-plan {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.batch-progress .progress-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.type-selection {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

@media (max-width: 900px) {
  .type-selection {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .type-selection {
    grid-template-columns: 1fr;
  }
}

/* ===== STANDALONE MODE STYLES ===== */
.type-card.standalone-card {
  border-color: #06b6d4;
}

.type-card.standalone-card.selected {
  border-color: #06b6d4;
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.05));
}

.standalone-form {
  background: var(--bg-tertiary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1rem;
}

.standalone-form .form-group {
  margin-bottom: 1.25rem;
}

.standalone-form .form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.standalone-form .form-group label .required {
  color: #ef4444;
}

.standalone-form .form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.standalone-form .form-group.half {
  margin-bottom: 1.25rem;
}

.standalone-form .form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.95rem;
}

.standalone-form .form-control:focus {
  border-color: #06b6d4;
  outline: none;
  box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
}

.standalone-form textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.key-points-input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.key-point-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.key-point-item .form-control {
  flex: 1;
}

.key-point-item .btn-remove {
  background: #fee2e2;
  color: #ef4444;
  border: none;
  border-radius: 8px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.key-point-item .btn-remove:hover {
  background: #fecaca;
}

.btn-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-add:hover {
  border-color: #06b6d4;
  color: #06b6d4;
  background: rgba(6, 182, 212, 0.05);
}

.ai-note.info {
  background: linear-gradient(135deg, #e0f2fe, #bae6fd);
  border-left-color: #0ea5e9;
}

.standalone-summary {
  border-color: #06b6d4;
}

.key-points-preview {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.key-points-preview ul {
  margin: 0.5rem 0 0 1.5rem;
  padding: 0;
}

.key-points-preview li {
  margin-bottom: 0.25rem;
  color: var(--text-secondary);
}

/* ===== VALIDATION FEEDBACK STYLES ===== */
.validation-feedback {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 8px;
  background: var(--bg-tertiary);
}

.validation-feedback.valid {
  border-left: 4px solid #10b981;
}

.validation-feedback.invalid {
  border-left: 4px solid #f59e0b;
}

.validation-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.validation-header .material-icons {
  font-size: 1.25rem;
}

.validation-header.valid .material-icons {
  color: #10b981;
}

.validation-header.invalid .material-icons {
  color: #f59e0b;
}

.validation-issues {
  margin-left: 1.75rem;
  list-style: disc;
}

.validation-issues li {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.quality-score {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.quality-score .score-value {
  font-weight: bold;
  color: var(--text-primary);
}

.quality-score .score-bar {
  flex: 1;
  max-width: 150px;
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.quality-score .score-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.quality-score .score-fill.high {
  background: #10b981;
}

.quality-score .score-fill.medium {
  background: #f59e0b;
}

.quality-score .score-fill.low {
  background: #ef4444;
}
</style>
