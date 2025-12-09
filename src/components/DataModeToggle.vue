<!-- Component สำหรับสลับโหมดการแสดงข้อมูล LO -->
<template>
  <div class="data-mode-toggle">
    <div class="toggle-header">
      <h4>📊 โหมดการแสดงข้อมูล</h4>
      <p class="toggle-subtitle">เลือกระบบการประเมิน LO ที่ต้องการแสดงผล</p>
    </div>
    
    <div class="toggle-options">
      <label class="toggle-option" :class="{ active: value === 'new' }">
        <input 
          type="radio" 
          :value="'new'" 
          :checked="value === 'new'"
          @change="$emit('update:modelValue', 'new')"
        />
        <div class="option-content">
          <div class="option-icon">🔄</div>
          <div class="option-info">
            <strong>ระบบใหม่ (เข้มงวด)</strong>
            <p>เกณฑ์การประเมินเข้มงวดตามมาตรฐาน HOTS ที่สูงขึ้น</p>
            <ul class="criteria-list">
              <li>✅ คะแนน HOTS ≥ 3 คะแนน (จาก 5)</li>
              <li>✅ ตรวจสอบความสอดคล้องเนื้อหา</li>
              <li>✅ ต้องมีหลักฐานเชิงประจักษ์</li>
            </ul>
          </div>
        </div>
      </label>

      <label class="toggle-option" :class="{ active: value === 'legacy' }">
        <input 
          type="radio" 
          :value="'legacy'" 
          :checked="value === 'legacy'"
          @change="$emit('update:modelValue', 'legacy')"
        />
        <div class="option-content">
          <div class="option-icon">📚</div>
          <div class="option-info">
            <strong>ระบบเดิม (ข้อมูลเก่า)</strong>
            <p>ผลการประเมินที่บันทึกไว้ตามเกณฑ์เดิม</p>
            <ul class="criteria-list">
              <li>📊 ข้อมูลจาก totalPassed ที่บันทึกแล้ว</li>
              <li>📈 แสดงความคืบหน้าตามระบบก่อนหน้า</li>
              <li>⚠️ อาจไม่สะท้อนมาตรฐานปัจจุบัน</li>
            </ul>
          </div>
        </div>
      </label>
    </div>

    <div class="toggle-summary">
      <div v-if="value === 'new'" class="summary-badge new">
        🔄 <strong>ระบบใหม่:</strong> แสดงผลตามเกณฑ์การประเมินที่เข้มงวดขึ้น
      </div>
      <div v-else class="summary-badge legacy">
        📚 <strong>ระบบเดิม:</strong> แสดงผลตามข้อมูลที่บันทึกไว้ก่อนการปรับปรุง
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    default: 'new'
  }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.data-mode-toggle {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-color);
}

.toggle-header {
  margin-bottom: 1rem;
}

.toggle-header h4 {
  font-size: 1.125rem;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.toggle-subtitle {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0;
}

.toggle-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.toggle-option {
  cursor: pointer;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.3s ease;
  display: block;
}

.toggle-option:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.toggle-option.active {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05));
}

.toggle-option input[type="radio"] {
  display: none;
}

.option-content {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.option-icon {
  font-size: 2rem;
  min-width: 50px;
  text-align: center;
}

.option-info {
  flex: 1;
}

.option-info strong {
  color: var(--text-primary);
  font-size: 1rem;
  display: block;
  margin-bottom: 0.5rem;
}

.option-info p {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.criteria-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.criteria-list li {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
  padding-left: 1rem;
  position: relative;
}

.criteria-list li:before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.5em;
  width: 4px;
  height: 4px;
  background: var(--text-secondary);
  border-radius: 50%;
}

.toggle-summary {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.summary-badge {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  text-align: center;
}

.summary-badge.new {
  background: linear-gradient(135deg, #dbeafe, #eff6ff);
  border: 1px solid #93c5fd;
  color: #1e40af;
}

.summary-badge.legacy {
  background: linear-gradient(135deg, #fef3cd, #fff3cd);
  border: 1px solid #fbbf24;
  color: #92400e;
}

.dark-mode .summary-badge.new {
  background: linear-gradient(135deg, #1e3a8a, #1e40af);
  color: #dbeafe;
}

.dark-mode .summary-badge.legacy {
  background: linear-gradient(135deg, #92400e, #b45309);
  color: #fde68a;
}

@media (max-width: 768px) {
  .toggle-options {
    grid-template-columns: 1fr;
  }
  
  .option-content {
    flex-direction: column;
    text-align: center;
  }
  
  .option-icon {
    min-width: auto;
  }
}
</style>