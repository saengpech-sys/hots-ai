<template>
  <div class="step-content step-materials">
    <!-- Animated Background -->
    <div class="step-bg-effects">
      <div class="floating-orb orb-1"></div>
      <div class="floating-orb orb-2"></div>
      <div class="floating-orb orb-3"></div>
    </div>

    <div class="step-header">
      <h2>🎉 สื่อการเรียนรู้</h2>
      <p class="subtitle">สร้างใบความรู้และใบงานสำหรับนักเรียน</p>
    </div>

    <!-- Introduction -->
    <div class="materials-intro card">
      <div class="intro-glow">
        <div class="intro-icon">
          <span class="material-icons">auto_awesome</span>
        </div>
      </div>
      <div class="intro-content">
        <h3>🎉 พร้อมสร้างสื่อการเรียนรู้</h3>
        <p>คุณได้ออกแบบโครงสร้างหลักสูตรครบถ้วนแล้ว ตอนนี้สามารถสร้างสื่อการเรียนรู้เพิ่มเติมได้:</p>
        <ul class="materials-list">
          <li>
            <span class="material-icon-wrapper blue">
              <span class="material-icons">library_books</span>
            </span>
            <div>
              <strong>ใบความรู้</strong>
              <span>สรุปเนื้อหา Concept Map และ Big Ideas</span>
            </div>
          </li>
          <li>
            <span class="material-icon-wrapper purple">
              <span class="material-icons">assignment</span>
            </span>
            <div>
              <strong>ใบงาน</strong>
              <span>กิจกรรมฝึกทักษะ HOTS พร้อมประเมิน A.R.C.E.</span>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Summary Section -->
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
          <span class="stat-value">{{ totalHours }}</span>
          <span class="stat-label">ชั่วโมงรวม</span>
        </div>
        <div class="stat-card research">
          <span class="stat-value">{{ interventionType }}</span>
          <span class="stat-label">🔬 Intervention</span>
        </div>
      </div>

      <!-- LO Coverage Summary -->
      <div class="lo-coverage-section card">
        <h4>🎯 ความครอบคลุม Learning Outcomes</h4>
        <div class="lo-coverage-grid">
          <div 
            v-for="lo in losCoverage" 
            :key="lo.code" 
            class="lo-coverage-item"
            :class="{ 'covered': lo.unitCount > 0, 'uncovered': lo.unitCount === 0 }"
          >
            <span class="lo-code">{{ lo.code }}</span>
            <span class="lo-coverage-badge">{{ lo.unitCount }} หน่วย</span>
          </div>
        </div>
        <div v-if="hasUncoveredLOs" class="lo-warning">
          <span class="material-icons">warning</span>
          <span>มี LO ที่ยังไม่ได้จัดสรรลงหน่วยใด</span>
        </div>
      </div>

      <!-- Units Summary -->
      <div class="units-summary">
        <div v-for="(unit, idx) in units" :key="idx" class="unit-summary-item card">
          <div class="unit-summary-header">
            <span class="unit-number">หน่วยที่ {{ idx + 1 }}</span>
            <span class="unit-name">{{ unit.name }}</span>
            <span class="plan-count-badge">{{ unit.plans?.length || 0 }} แผน</span>
          </div>
          <div class="unit-los-list">
            <span v-for="lo in unit.los" :key="lo" class="lo-tag">{{ lo }}</span>
          </div>
          <div class="unit-plans-list">
            <div v-for="(plan, pIdx) in (unit.plans || []).slice(0, 5)" :key="pIdx" class="plan-mini-item">
              <span class="plan-number">{{ pIdx + 1 }}.</span>
              <span class="plan-topic">{{ plan.topic }}</span>
              <span v-if="plan.arceFocus" :class="['arce-badge', plan.arceFocus]">
                {{ arceShortLabels[plan.arceFocus] }}
              </span>
            </div>
            <div v-if="(unit.plans?.length || 0) > 5" class="plans-more">
              +{{ unit.plans.length - 5 }} แผน
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="materials-actions card">
      <h3>🎯 สร้างสื่อการเรียนรู้</h3>
      <p class="materials-desc">เลือกสร้างสื่อการเรียนรู้ที่ต้องการ หรือไปจัดการที่หน้าแผนการสอนภายหลัง</p>
      
      <div class="action-buttons">
        <button class="btn btn-primary btn-action" @click="$emit('go-to-lesson-plans')">
          <span class="btn-icon-wrap">
            <span class="material-icons">school</span>
          </span>
          <div class="btn-content">
            <span class="btn-main">ไปหน้าแผนการสอน</span>
            <small>สร้างใบความรู้/ใบงานทีหลัง</small>
          </div>
        </button>
        <button class="btn btn-outline btn-action" @click="$emit('go-to-worksheets')">
          <span class="btn-icon-wrap outline">
            <span class="material-icons">assignment</span>
          </span>
          <div class="btn-content">
            <span class="btn-main">จัดการใบงาน</span>
            <small>Electronic Worksheets</small>
          </div>
        </button>
      </div>
    </div>

    <!-- Research Export -->
    <div class="research-export card">
      <div class="export-icon">
        <span class="material-icons">science</span>
      </div>
      <div class="export-content">
        <h4>🔬 Export ข้อมูลสำหรับงานวิจัย</h4>
        <p>ส่งออกข้อมูลโครงสร้างหลักสูตรในรูปแบบที่พร้อมใช้วิเคราะห์</p>
      </div>
      <div class="export-buttons">
        <button class="btn btn-outline btn-sm" @click="$emit('export-json')">
          <span class="material-icons">code</span>
          JSON
        </button>
        <button class="btn btn-outline btn-sm" @click="$emit('export-csv')">
          <span class="material-icons">table_chart</span>
          CSV
        </button>
      </div>
    </div>

    <!-- Navigation -->
    <div class="step-actions">
      <button class="btn btn-outline" @click="$emit('prev')">
        <span class="material-icons">arrow_back</span>
        ย้อนกลับ
      </button>
      <button class="btn btn-success btn-lg" @click="$emit('finish')">
        <span class="material-icons">check_circle</span>
        เสร็จสิ้นการออกแบบ
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  units: {
    type: Array,
    required: true
  },
  totalHours: {
    type: Number,
    default: 40
  },
  interventionType: {
    type: String,
    default: '5E Model'
  },
  availableLOs: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'go-to-lesson-plans',
  'go-to-worksheets',
  'export-json',
  'export-csv',
  'prev',
  'finish'
])

// ARCE Short Labels
const arceShortLabels = {
  analysis: 'A',
  reasoning: 'R',
  creativity: 'C',
  evidence: 'E'
}

// Computed
const totalPlansCount = computed(() => {
  return props.units.reduce((sum, unit) => sum + (unit.plans?.length || 0), 0)
})

const losCoverage = computed(() => {
  return props.availableLOs.map(lo => {
    const unitCount = props.units.filter(unit => 
      unit.los?.includes(lo.code)
    ).length
    return {
      code: lo.code,
      description: lo.description,
      unitCount
    }
  })
})

const hasUncoveredLOs = computed(() => {
  return losCoverage.value.some(lo => lo.unitCount === 0)
})
</script>

<style scoped>
@import './step-styles.css';

/* Step 5 Specific Styles */
.step-materials {
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
  padding: 2rem;
}

/* Background Effects */
.step-bg-effects {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.floating-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.25;
}

.orb-1 {
  width: 320px;
  height: 320px;
  background: linear-gradient(135deg, #10b981, #06b6d4);
  top: -100px;
  left: -100px;
  animation: floatOrb 20s ease-in-out infinite;
}

.orb-2 {
  width: 250px;
  height: 250px;
  background: linear-gradient(135deg, #a855f7, #ec4899);
  bottom: 100px;
  right: -80px;
  animation: floatOrb 18s ease-in-out infinite reverse;
}

.orb-3 {
  width: 180px;
  height: 180px;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  top: 50%;
  left: 40%;
  animation: floatOrb 15s ease-in-out infinite;
}

@keyframes floatOrb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(40px, -40px) scale(1.15); }
}

/* Subtitle */
.step-header .subtitle {
  color: rgba(255, 255, 255, 0.6);
}

/* Introduction */
.materials-intro {
  display: flex;
  gap: 2rem;
  padding: 2rem;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
  position: relative;
  z-index: 1;
}

.intro-glow {
  position: relative;
}

.intro-icon {
  width: 70px;
  height: 70px;
  background: linear-gradient(135deg, #10b981, #06b6d4);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 40px rgba(16, 185, 129, 0.4);
  flex-shrink: 0;
}

.intro-icon .material-icons {
  font-size: 2.25rem;
  color: white;
}

.intro-content h3 {
  margin: 0 0 0.75rem;
  font-size: 1.35rem;
  color: #fff;
}

.intro-content > p {
  margin: 0 0 1.25rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.95rem;
}

.materials-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.materials-list li {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.material-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.material-icon-wrapper.blue {
  background: rgba(59, 130, 246, 0.2);
}

.material-icon-wrapper.blue .material-icons {
  color: #60a5fa;
}

.material-icon-wrapper.purple {
  background: rgba(168, 85, 247, 0.2);
}

.material-icon-wrapper.purple .material-icons {
  color: #a78bfa;
}

.materials-list li div {
  display: flex;
  flex-direction: column;
}

.materials-list li strong {
  color: #fff;
  font-size: 0.95rem;
}

.materials-list li span:not(.material-icons) {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
}

/* Summary Section */
.summary-section {
  margin-bottom: 2rem;
  position: relative;
  z-index: 1;
}

.summary-section h3 {
  margin-bottom: 1.25rem;
  font-size: 1.25rem;
  color: #fff;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
  margin-bottom: 1.75rem;
}

.stat-card {
  text-align: center;
  padding: 1.25rem;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.stat-card.research {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.1));
  border-color: rgba(102, 126, 234, 0.3);
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #a855f7, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.25rem;
  display: block;
}

/* LO Coverage */
.lo-coverage-section {
  padding: 1.5rem;
  margin-bottom: 1.75rem;
}

.lo-coverage-section h4 {
  margin-bottom: 1.25rem;
  color: rgba(255, 255, 255, 0.9);
}

.lo-coverage-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-bottom: 1rem;
}

.lo-coverage-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.9rem;
  border-radius: 10px;
  font-size: 0.85rem;
  transition: all 0.3s ease;
}

.lo-coverage-item.covered {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.lo-coverage-item.covered:hover {
  background: rgba(16, 185, 129, 0.25);
}

.lo-coverage-item.uncovered {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.lo-coverage-item .lo-code {
  font-weight: 700;
  color: #fff;
}

.lo-coverage-badge {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.lo-warning {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  font-size: 0.85rem;
  color: #fbbf24;
}

/* Units Summary */
.units-summary {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.unit-summary-item {
  padding: 1.25rem;
}

.unit-summary-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.unit-number {
  font-weight: 700;
  color: #a855f7;
}

.unit-name {
  flex: 1;
  font-weight: 600;
  color: #fff;
}

.plan-count-badge {
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  background: rgba(168, 85, 247, 0.2);
  border-radius: 15px;
  color: #d8b4fe;
}

.unit-los-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.9rem;
}

.lo-tag {
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
}

.unit-plans-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.plan-mini-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.plan-number {
  color: rgba(255, 255, 255, 0.4);
  width: 22px;
}

.plan-topic {
  flex: 1;
}

.arce-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 700;
}

.arce-badge.analysis { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.arce-badge.reasoning { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.arce-badge.creativity { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.arce-badge.evidence { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }

.plans-more {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
}

/* Actions */
.materials-actions {
  text-align: center;
  padding: 2rem;
  margin-bottom: 1.75rem;
  position: relative;
  z-index: 1;
}

.materials-actions h3 {
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
  color: #fff;
}

.materials-desc {
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 1.75rem;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 2rem;
  min-width: 240px;
}

.btn-icon-wrap {
  width: 45px;
  height: 45px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-icon-wrap.outline {
  background: rgba(168, 85, 247, 0.15);
}

.btn-icon-wrap .material-icons {
  font-size: 1.4rem;
}

.btn-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.btn-main {
  font-weight: 700;
  font-size: 1rem;
}

.btn-content small {
  font-size: 0.75rem;
  opacity: 0.7;
  font-weight: 400;
}

/* Research Export */
.research-export {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  margin-bottom: 1.75rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.08) 100%);
  position: relative;
  z-index: 1;
}

.export-icon {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
}

.export-icon .material-icons {
  font-size: 1.5rem;
  color: white;
}

.export-content {
  flex: 1;
}

.export-content h4 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  color: #fff;
}

.export-content p {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
}

.export-buttons {
  display: flex;
  gap: 0.75rem;
}

/* Success Button */
.btn-success {
  background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
  color: white;
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
}

.btn-success:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(16, 185, 129, 0.5);
}

/* Responsive */
@media (max-width: 768px) {
  .materials-intro {
    flex-direction: column;
    text-align: center;
  }
  
  .intro-glow {
    margin: 0 auto;
  }
  
  .summary-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .action-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .btn-action {
    width: 100%;
    max-width: 320px;
  }
  
  .research-export {
    flex-direction: column;
    text-align: center;
  }
}
</style>
