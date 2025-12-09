<template>
  <div class="portfolio-container">
    <div class="header-section">
      <div>
        <h1>Teacher Professional Portfolio</h1>
        <p>Track your impact on student excellence and talent development</p>
      </div>
      <button @click="generatePDF" class="btn btn-primary">
        <span class="material-icons">picture_as_pdf</span>
        Export Portfolio
      </button>
    </div>

    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
    </div>

    <div v-else class="content-wrapper">
      <!-- Impact Summary Cards -->
      <div class="stats-grid">
        <div class="stat-card border-blue">
          <div class="stat-content">
            <div>
              <p class="stat-label">Total Students</p>
              <h3 class="stat-value">{{ stats.totalStudents }}</h3>
            </div>
            <span class="material-icons stat-icon icon-blue">groups</span>
          </div>
        </div>

        <div class="stat-card border-purple">
          <div class="stat-content">
            <div>
              <p class="stat-label">Talent Track</p>
              <h3 class="stat-value">{{ stats.talentCount }}</h3>
              <p class="stat-sub text-green">
                <span class="material-icons text-xs">trending_up</span>
                {{ stats.talentPercentage }}% of class
              </p>
            </div>
            <span class="material-icons stat-icon icon-purple">stars</span>
          </div>
        </div>

        <div class="stat-card border-green">
          <div class="stat-content">
            <div>
              <p class="stat-label">HOTS Growth</p>
              <h3 class="stat-value">+{{ stats.avgGrowth }}%</h3>
            </div>
            <span class="material-icons stat-icon icon-green">show_chart</span>
          </div>
        </div>

        <div class="stat-card border-amber">
          <div class="stat-content">
            <div>
              <p class="stat-label">Teacher Level</p>
              <h3 class="stat-value text-lg">{{ teacherLevel }}</h3>
            </div>
            <span class="material-icons stat-icon icon-amber">military_tech</span>
          </div>
        </div>
      </div>

      <div class="main-grid">
        <!-- Talent Distribution -->
        <div class="card talent-section">
          <h3 class="section-title">
            <span class="material-icons text-purple">psychology</span>
            Talent Track Distribution
          </h3>
          <div class="track-list">
            <div v-for="(count, track) in stats.tracks" :key="track" class="track-item">
              <div class="track-header">
                <span class="track-badge">
                  {{ formatTrackName(track) }}
                </span>
                <span class="track-count">
                  {{ count }} students
                </span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: (count / stats.totalStudents * 100) + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Teacher Badges -->
        <div class="card badges-section">
          <h3 class="section-title">
            <span class="material-icons text-amber">workspace_premium</span>
            Professional Achievements
          </h3>
          <div class="badges-grid">
            <div v-for="badge in badges" :key="badge.id" 
                 class="badge-card"
                 :class="{ 'earned': badge.earned }">
              <div class="badge-icon">{{ badge.icon }}</div>
              <h4 class="badge-name">{{ badge.name }}</h4>
              <p class="badge-criteria">{{ badge.criteria }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Student Success Stories -->
      <div class="card students-section">
        <div class="card-header">
          <h3 class="section-title">
            <span class="material-icons text-green">emoji_events</span>
            Student Success Highlights
          </h3>
        </div>
        <div class="table-responsive">
          <table class="students-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Track</th>
                <th>Top Skill</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in topStudents" :key="student.id">
                <td>
                  <div class="student-cell">
                    <div class="avatar-circle">
                      {{ student.name.charAt(0) }}
                    </div>
                    <span class="student-name">{{ student.name }}</span>
                  </div>
                </td>
                <td>
                  <span v-for="tag in student.talentTags" :key="tag" class="tag-badge">
                    {{ formatTrackName(tag) }}
                  </span>
                </td>
                <td class="text-secondary">
                  {{ getTopSkill(student.talentScores) }}
                </td>
                <td>
                  <span class="status-badge active">Active</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const loading = ref(false)
const stats = ref({
  totalStudents: 0,
  talentCount: 0
})

onMounted(() => {
  // Load portfolio data
  loading.value = true
  setTimeout(() => {
    stats.value = {
      totalStudents: 120,
      talentCount: 45
    }
    loading.value = false
  }, 500)
})
</script>

<style scoped>
.portfolio-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.header-section {
  margin-bottom: 2rem;
}

.loading-container {
  text-align: center;
  padding: 3rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  padding: 1.5rem;
  background: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}
</style>
