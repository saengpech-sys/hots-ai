<template>
  <div class="parent-weekly-report-view">
    <WeeklyReport />
  </div>
</template>

<script setup>
import WeeklyReport from '@/components/parent/WeeklyReport.vue'
</script>

<style scoped>
.parent-weekly-report-view {
  min-height: 100vh;
  background: var(--bg-primary);
}
</style>
