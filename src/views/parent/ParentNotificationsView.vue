<template>
  <div class="parent-notifications-view">
    <ParentNotifications />
  </div>
</template>

<script setup>
import ParentNotifications from '@/components/parent/ParentNotifications.vue'
</script>

<style scoped>
.parent-notifications-view {
  min-height: 100vh;
  background: var(--bg-primary);
}
</style>
