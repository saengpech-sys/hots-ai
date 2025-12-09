<!-- EmptyState Component -->
<template>
  <div class="empty-state">
    <div class="empty-icon">{{ icon }}</div>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <button v-if="actionText" @click="$emit('action')" class="btn-action">
      {{ actionText }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    default: '📭'
  },
  title: {
    type: String,
    default: 'ไม่มีข้อมูล'
  },
  description: {
    type: String,
    default: 'ยังไม่มีข้อมูลในส่วนนี้'
  },
  actionText: {
    type: String,
    default: ''
  }
})

defineEmits(['action'])
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 80px 40px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 5em;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.5em;
  margin: 0 0 15px 0;
  color: var(--text-color);
}

.empty-state p {
  font-size: 1em;
  margin: 0 0 25px 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

.btn-action {
  padding: 12px 30px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-action:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
}
</style>
