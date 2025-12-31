<template>
  <div class="journey-config-panel">
    <div class="config-header">
      <h3>🎯 การตั้งค่า Learning Journey</h3>
      <p class="config-desc">กำหนดระดับการควบคุมเส้นทางการเรียนรู้ของนักเรียน</p>
    </div>

    <div class="level-selector">
      <div 
        v-for="level in levels" 
        :key="level.value"
        class="level-option"
        :class="{ active: currentLevel === level.value }"
        @click="selectLevel(level.value)"
      >
        <div class="level-header">
          <span class="level-icon">{{ level.icon }}</span>
          <span class="level-name">Level {{ level.value }}: {{ level.name }}</span>
        </div>
        <p class="level-desc">{{ level.description }}</p>
        <ul class="level-features">
          <li v-for="(feature, idx) in level.features" :key="idx">{{ feature }}</li>
        </ul>
      </div>
    </div>

    <!-- Level 2 Settings -->
    <div v-if="currentLevel >= 2" class="level-settings">
      <h4>⚙️ การตั้งค่า Level 2: Gated Progression</h4>
      
      <div class="setting-row">
        <label>
          <input type="checkbox" v-model="settings.requireKSRead">
          ต้องอ่านใบความรู้ก่อนทำใบงาน
        </label>
      </div>
      
      <div class="setting-row" v-if="settings.requireKSRead">
        <label>เปอร์เซ็นต์การอ่านขั้นต่ำ:</label>
        <div class="slider-container">
          <input type="range" v-model.number="settings.ksReadThreshold" min="50" max="100" step="10">
          <span class="slider-value">{{ settings.ksReadThreshold }}%</span>
        </div>
      </div>
      
      <div class="setting-row">
        <label>
          <input type="checkbox" v-model="settings.requireWSPass">
          ต้องผ่านใบงานก่อน Assessment
        </label>
      </div>
      
      <div class="setting-row" v-if="settings.requireWSPass">
        <label>คะแนนขั้นต่ำที่ต้องผ่าน:</label>
        <div class="slider-container">
          <input type="range" v-model.number="settings.wsPassThreshold" min="40" max="80" step="10">
          <span class="slider-value">{{ settings.wsPassThreshold }}%</span>
        </div>
      </div>
      
      <div class="setting-row">
        <label>จำนวนหน่วยขั้นต่ำที่ต้องผ่านก่อน Assessment:</label>
        <div class="slider-container">
          <input type="range" v-model.number="settings.requireUnitsPercent" min="25" max="100" step="25">
          <span class="slider-value">{{ settings.requireUnitsPercent }}%</span>
        </div>
      </div>
    </div>

    <!-- Level 3 Settings -->
    <div v-if="currentLevel >= 3" class="level-settings">
      <h4>🧠 การตั้งค่า Level 3: Smart Adaptive</h4>
      
      <div class="setting-row">
        <label>
          <input type="checkbox" v-model="settings.personalizeQuestions">
          เลือกคำถามตามจุดอ่อนของนักเรียน
        </label>
      </div>
      
      <div class="setting-row">
        <label>
          <input type="checkbox" v-model="settings.targetWeakLOs">
          เน้นถาม Learning Outcomes ที่ยังไม่ผ่าน
        </label>
      </div>
      
      <div class="setting-row">
        <label>
          <input type="checkbox" v-model="settings.scaffoldBasedOnWorksheet">
          ปรับระดับ Scaffolding ตามผลใบงาน
        </label>
      </div>
    </div>

    <!-- Preview -->
    <div class="config-preview">
      <h4>👁️ ตัวอย่างที่นักเรียนจะเห็น</h4>
      <div class="preview-box">
        <div v-if="currentLevel === 1" class="preview-content level-1">
          <p>💡 <strong>Level 1:</strong> นักเรียนจะเห็นคำแนะนำให้อ่านใบความรู้ก่อน แต่สามารถข้ามได้</p>
        </div>
        <div v-else-if="currentLevel === 2" class="preview-content level-2">
          <p>🔒 <strong>Level 2:</strong> ใบงานจะถูกล็อคจนกว่าจะอ่านใบความรู้ครบ {{ settings.ksReadThreshold }}%</p>
          <p>📊 ต้องผ่านใบงานอย่างน้อย {{ settings.requireUnitsPercent }}% ของหน่วยทั้งหมด ถึงจะ Assessment ได้</p>
        </div>
        <div v-else-if="currentLevel === 3" class="preview-content level-3">
          <p>🤖 <strong>Level 3:</strong> AI จะวิเคราะห์จุดอ่อนจากใบงานและถามคำถามที่ตรงจุด</p>
          <p>🎯 คำถามจะเน้น Learning Outcomes ที่นักเรียนยังไม่ผ่าน</p>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="config-actions">
      <button @click="saveSettings" class="btn btn-primary" :disabled="saving">
        {{ saving ? 'กำลังบันทึก...' : '💾 บันทึกการตั้งค่า' }}
      </button>
      <button @click="resetToDefault" class="btn btn-outline">
        🔄 คืนค่าเริ่มต้น
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { useLearningProgressStore } from '@/stores/learningProgress'

const emit = defineEmits(['saved'])

const learningProgress = useLearningProgressStore()

const currentLevel = ref(2)
const saving = ref(false)

const settings = reactive({
  // Level 2
  requireKSRead: true,
  ksReadThreshold: 80,
  requireWSPass: true,
  wsPassThreshold: 60,
  requireUnitsPercent: 50,
  // Level 3
  personalizeQuestions: true,
  targetWeakLOs: true,
  scaffoldBasedOnWorksheet: true
})

const levels = [
  {
    value: 1,
    name: 'Soft Guidance',
    icon: '💡',
    description: 'แนะนำเบาๆ ข้ามได้',
    features: [
      '✓ แสดงคำแนะนำให้อ่านใบความรู้ก่อน',
      '✓ นักเรียนสามารถข้ามได้',
      '✓ เหมาะสำหรับนักเรียนที่รับผิดชอบตัวเองได้ดี'
    ]
  },
  {
    value: 2,
    name: 'Gated Progression',
    icon: '🚦',
    description: 'ต้องผ่านก่อนถึงไปต่อได้',
    features: [
      '✓ ต้องอ่านใบความรู้ก่อนทำใบงาน',
      '✓ ต้องผ่านใบงานก่อน Assessment',
      '✓ เหมาะสำหรับการควบคุมเส้นทางการเรียนรู้'
    ]
  },
  {
    value: 3,
    name: 'Smart Adaptive',
    icon: '🧠',
    description: 'AI ปรับตามจุดอ่อน',
    features: [
      '✓ รวมทุกอย่างของ Level 2',
      '✓ AI วิเคราะห์จุดอ่อนจากใบงาน',
      '✓ คำถาม Assessment เน้นจุดที่ต้องปรับปรุง',
      '✓ Scaffolding ปรับตามความสามารถ'
    ]
  }
]

function selectLevel(level) {
  currentLevel.value = level
}

async function saveSettings() {
  saving.value = true
  
  try {
    await learningProgress.updateJourneySettings({
      level: currentLevel.value,
      gatedProgression: {
        requireKSRead: settings.requireKSRead,
        ksReadThreshold: settings.ksReadThreshold,
        requireWSPass: settings.requireWSPass,
        wsPassThreshold: settings.wsPassThreshold,
        requireUnitsForAssessment: settings.requireUnitsPercent / 100
      },
      smartAdaptive: {
        enabled: currentLevel.value >= 3,
        personalizeQuestions: settings.personalizeQuestions,
        targetWeakLOs: settings.targetWeakLOs,
        scaffoldBasedOnWorksheet: settings.scaffoldBasedOnWorksheet
      }
    })
    
    emit('saved')
    alert('บันทึกการตั้งค่าเรียบร้อยแล้ว!')
  } catch (err) {
    console.error('Error saving settings:', err)
    alert('เกิดข้อผิดพลาดในการบันทึก')
  } finally {
    saving.value = false
  }
}

function resetToDefault() {
  currentLevel.value = 2
  settings.requireKSRead = true
  settings.ksReadThreshold = 80
  settings.requireWSPass = true
  settings.wsPassThreshold = 60
  settings.requireUnitsPercent = 50
  settings.personalizeQuestions = true
  settings.targetWeakLOs = true
  settings.scaffoldBasedOnWorksheet = true
}

onMounted(() => {
  // Load current settings from store
  const current = learningProgress.journeySettings
  if (current) {
    currentLevel.value = current.level || 2
    
    if (current.gatedProgression) {
      settings.requireKSRead = current.gatedProgression.requireKSRead ?? true
      settings.ksReadThreshold = current.gatedProgression.ksReadThreshold ?? 80
      settings.requireWSPass = current.gatedProgression.requireWSPass ?? true
      settings.wsPassThreshold = current.gatedProgression.wsPassThreshold ?? 60
      settings.requireUnitsPercent = (current.gatedProgression.requireUnitsForAssessment ?? 0.5) * 100
    }
    
    if (current.smartAdaptive) {
      settings.personalizeQuestions = current.smartAdaptive.personalizeQuestions ?? true
      settings.targetWeakLOs = current.smartAdaptive.targetWeakLOs ?? true
      settings.scaffoldBasedOnWorksheet = current.smartAdaptive.scaffoldBasedOnWorksheet ?? true
    }
  }
})
</script>

<style scoped>
.journey-config-panel {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 1.5rem;
}

.config-header h3 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
}

.config-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0 0 1.5rem;
}

/* Level Selector */
.level-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.level-option {
  padding: 1rem;
  border-radius: 12px;
  border: 2px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

.level-option:hover {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.05);
}

.level-option.active {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
}

.level-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.level-icon {
  font-size: 1.5rem;
}

.level-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.level-desc {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin: 0 0 0.75rem;
}

.level-features {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.level-features li {
  padding: 0.25rem 0;
}

/* Settings */
.level-settings {
  background: var(--bg-tertiary);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}

.level-settings h4 {
  margin: 0 0 1rem;
  font-size: 1rem;
}

.setting-row {
  margin-bottom: 0.875rem;
}

.setting-row label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.setting-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
  margin-left: 1.5rem;
}

.slider-container input[type="range"] {
  flex: 1;
  cursor: pointer;
}

.slider-value {
  min-width: 45px;
  font-weight: 600;
  color: var(--primary);
}

/* Preview */
.config-preview {
  margin-bottom: 1.5rem;
}

.config-preview h4 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.preview-box {
  border: 1px dashed var(--border-color);
  border-radius: 10px;
  padding: 1rem;
  background: var(--bg-tertiary);
}

.preview-content p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.preview-content.level-1 { color: #10b981; }
.preview-content.level-2 { color: #f59e0b; }
.preview-content.level-3 { color: #8b5cf6; }

/* Actions */
.config-actions {
  display: flex;
  gap: 0.75rem;
}

/* Responsive */
@media (max-width: 768px) {
  .level-selector {
    grid-template-columns: 1fr;
  }
  
  .config-actions {
    flex-direction: column;
  }
}
</style>
