<template>
  <div class="gamification-stats" :class="{ compact: compact }">
    <!-- Compact Mode - Horizontal -->
    <div v-if="compact" class="stats-compact">
      <div class="stat-item">
        <span class="stat-icon">🎮</span>
        <span class="stat-value">Lv.{{ level }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">⭐</span>
        <span class="stat-value">{{ formatNumber(points) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">🔥</span>
        <span class="stat-value">{{ streak }}</span>
      </div>
      <div v-if="showBadges" class="stat-item">
        <span class="stat-icon">🏆</span>
        <span class="stat-value">{{ badgeCount }}</span>
      </div>
      <div v-if="showLOs" class="stat-item">
        <span class="stat-icon">✅</span>
        <span class="stat-value">{{ passedLOs }}</span>
      </div>
    </div>

    <!-- Full Mode - Cards -->
    <div v-else class="stats-grid">
      <!-- Level Card -->
      <div class="stat-card level-card">
        <div class="stat-header">
          <span class="stat-emoji">🎮</span>
          <span class="stat-label">Level</span>
        </div>
        <div class="stat-main">{{ level }}</div>
        <div v-if="showProgress" class="progress-bar">
          <div class="progress-fill" :style="{ width: levelProgress + '%' }"></div>
        </div>
        <div v-if="showProgress" class="stat-sub">
          อีก {{ pointsToNextLevel }} แต้มถึง Lv.{{ level + 1 }}
        </div>
      </div>

      <!-- Points Card -->
      <div class="stat-card points-card">
        <div class="stat-header">
          <span class="stat-emoji">⭐</span>
          <span class="stat-label">แต้มสะสม</span>
        </div>
        <div class="stat-main">{{ formatNumber(points) }}</div>
        <div class="stat-sub">คะแนนรวม</div>
      </div>

      <!-- Streak Card -->
      <div class="stat-card streak-card">
        <div class="stat-header">
          <span class="stat-emoji">🔥</span>
          <span class="stat-label">Streak</span>
        </div>
        <div class="stat-main">{{ streak }} <span class="unit">วัน</span></div>
        <div class="stat-sub">ต่อเนื่อง</div>
      </div>

      <!-- Badges Card -->
      <div v-if="showBadges" class="stat-card badges-card">
        <div class="stat-header">
          <span class="stat-emoji">🏆</span>
          <span class="stat-label">Badges</span>
        </div>
        <div class="stat-main">{{ badgeCount }}</div>
        <div class="stat-sub">เหรียญรางวัล</div>
      </div>

      <!-- LO Card -->
      <div v-if="showLOs" class="stat-card lo-card">
        <div class="stat-header">
          <span class="stat-emoji">✅</span>
          <span class="stat-label">LO ที่ผ่าน</span>
        </div>
        <div class="stat-main">{{ passedLOs }}</div>
        <div class="stat-sub">Learning Outcomes</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGamificationStore } from '@/stores/gamification'

const props = defineProps({
  compact: {
    type: Boolean,
    default: false
  },
  showProgress: {
    type: Boolean,
    default: true
  },
  showBadges: {
    type: Boolean,
    default: true
  },
  showLOs: {
    type: Boolean,
    default: false
  }
})

const gamificationStore = useGamificationStore()

const level = computed(() => gamificationStore.level || 1)
const points = computed(() => gamificationStore.totalPoints || 0)
const streak = computed(() => gamificationStore.streak || 0)
const badgeCount = computed(() => gamificationStore.badges?.length || 0)
const passedLOs = computed(() => gamificationStore.actualPassedLOs?.length || 0)
const levelProgress = computed(() => gamificationStore.levelProgress || 0)
const pointsToNextLevel = computed(() => gamificationStore.pointsToNextLevel || 100)

function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num
}
</script>

<style scoped>
.gamification-stats {
  width: 100%;
}

/* Compact Mode */
.stats-compact {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--bg-tertiary, #f5f5f5);
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  font-size: 0.9rem;
}

.stat-icon {
  font-size: 1rem;
}

.stat-value {
  font-weight: 600;
  color: var(--text-primary, #333);
}

/* Full Mode */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: var(--card-bg, white);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.stat-emoji {
  font-size: 1.25rem;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary, #666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-main {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary, #333);
}

.stat-main .unit {
  font-size: 0.9rem;
  font-weight: 400;
  color: var(--text-secondary, #666);
}

.stat-sub {
  font-size: 0.75rem;
  color: var(--text-secondary, #666);
  margin-top: 0.25rem;
}

/* Progress bar in level card */
.progress-bar {
  height: 6px;
  background: var(--border-color, #e0e0e0);
  border-radius: 3px;
  margin: 0.5rem 0;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* Card accent colors */
.level-card {
  border-left: 4px solid #667eea;
}

.points-card {
  border-left: 4px solid #f59e0b;
}

.streak-card {
  border-left: 4px solid #ef4444;
}

.badges-card {
  border-left: 4px solid #10b981;
}

.lo-card {
  border-left: 4px solid #8b5cf6;
}

/* Responsive */
@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stats-compact {
    justify-content: center;
  }
}
</style>
