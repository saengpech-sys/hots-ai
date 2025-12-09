<template>
  <div class="lo-progress-cards">
    <div 
      v-for="card in cards"
      :key="card.code"
      class="lo-card"
      :class="{ 
        passed: card.isPassed,
        struggling: card.needsIntervention 
      }"
    >
      <div class="card-header">
        <h3>{{ card.code }}</h3>
        <span class="status-icon">
          {{ card.isPassed ? '✅' : card.needsIntervention ? '⚠️' : '⏳' }}
        </span>
      </div>

      <div class="progress-bar-container">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: card.percentage + '%' }"
          ></div>
        </div>
        <span class="progress-percentage">{{ card.percentage }}%</span>
      </div>

      <div class="card-stats">
        <div class="stat">
          <span class="label">ขาดอีก</span>
          <span class="value">{{ card.remaining.toFixed(1) }} คะแนน</span>
        </div>
        <div class="stat">
          <span class="label">ความพยายาม</span>
          <span class="value">{{ card.attempts }} ครั้ง</span>
        </div>
      </div>

      <div v-if="card.strugglingDimensions.length > 0" class="struggling-info">
        <span class="struggling-label">💪 ควรพัฒนา:</span>
        <div class="dimension-tags">
          <span 
            v-for="dim in card.strugglingDimensions" 
            :key="dim"
            class="dimension-tag"
          >
            {{ dimensionNames[dim] }}
          </span>
        </div>
      </div>

      <button 
        v-if="card.needsIntervention" 
        @click="$emit('request-lesson', card.code)"
        class="intervention-button"
      >
        💡 เรียน Micro Lesson
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineEmits(['request-lesson'])

const props = defineProps({
  targetLos: {
    type: Array,
    required: true
  },
  loProgress: {
    type: Object,
    required: true
  }
})

const dimensionNames = {
  analysis: 'วิเคราะห์',
  reasoning: 'เหตุผล',
  creativity: 'สร้างสรรค์',
  evidence: 'หลักฐาน'
}

const cards = computed(() => {
  return props.targetLos.map(loCode => {
    const progress = props.loProgress[loCode] || {
      accumulatedScore: 0,
      targetScore: 12,
      attempts: 0,
      isPassed: false,
      strugglingDimensions: []
    }

    const percentage = Math.min(100, Math.round((progress.accumulatedScore / progress.targetScore) * 100))
    const remaining = Math.max(0, progress.targetScore - progress.accumulatedScore)
    const needsIntervention = progress.attempts >= 2 && percentage < 50 && (progress.microLessonsViewed?.length || 0) === 0

    return {
      code: loCode,
      percentage,
      remaining,
      attempts: progress.attempts,
      isPassed: progress.isPassed,
      strugglingDimensions: progress.strugglingDimensions || [],
      needsIntervention
    }
  })
})
</script>

<style scoped>
.lo-progress-cards {
  flex-shrink: 0;
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5rem 0;
  margin-bottom: 0.5rem;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 transparent;
  max-height: 320px;
}

.lo-progress-cards::-webkit-scrollbar {
  height: 6px;
}

.lo-progress-cards::-webkit-scrollbar-track {
  background: transparent;
}

.lo-progress-cards::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.lo-progress-cards::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.lo-card {
  flex: 0 0 360px;
  min-height: 260px;
  background: var(--card-bg, white);
  border-radius: 10px;
  padding: 1rem 0.85rem;
  border: 2px solid var(--border-color, #e5e7eb);
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.lo-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.lo-card.passed {
  border-color: #10b981;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%);
}

.lo-card.struggling {
  border-color: #f59e0b;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.card-header h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #1a202c);
  margin: 0;
}

.status-icon {
  font-size: 1.1rem;
}

.progress-bar-container {
  margin-bottom: 0.75rem;
}

.progress-bar {
  height: 8px;
  background: var(--progress-bg, #e5e7eb);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 999px;
}

.lo-card.struggling .progress-fill {
  background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
}

.lo-card.passed .progress-fill {
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
}

.progress-percentage {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
}

.card-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.stat .label {
  font-size: 0.8rem;
  color: var(--text-secondary, #64748b);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat .value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #1a202c);
  white-space: nowrap;
}

.struggling-info {
  background: rgba(245, 158, 11, 0.1);
  padding: 0.5rem;
  border-radius: 6px;
  margin-top: 0.75rem;
}

.struggling-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #d97706;
  margin-bottom: 0.4rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dimension-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.dimension-tag {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  background: #f59e0b;
  color: white;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
}

.intervention-button {
  margin-top: 0.75rem;
  width: 100%;
  padding: 0.65rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}

.intervention-button:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.intervention-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}

/* Dark mode */
.dark-mode .lo-card {
  background: var(--card-bg-dark, #2d3748);
  border-color: var(--border-color-dark, #4a5568);
}

.dark-mode .card-header h3 {
  color: var(--text-primary-dark, #f7fafc);
}

.dark-mode .stat .label {
  color: var(--text-secondary-dark, #cbd5e0);
}

.dark-mode .stat .value {
  color: var(--text-primary-dark, #f7fafc);
}

.dark-mode .progress-bar {
  background: var(--progress-bg-dark, #4a5568);
}

.dark-mode .progress-percentage {
  color: var(--text-secondary-dark, #cbd5e0);
}

/* Animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.lo-card {
  animation: slideIn 0.4s ease-out backwards;
}

.lo-card:nth-child(2) {
  animation-delay: 0.1s;
}

.lo-card:nth-child(3) {
  animation-delay: 0.2s;
}

.lo-card:nth-child(4) {
  animation-delay: 0.3s;
}
</style>
