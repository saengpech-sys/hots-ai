<template>
  <Transition name="points-pop">
    <div v-if="visible" class="points-notification">
      <div class="points-content">
        <span class="points-icon">⭐</span>
        <span class="points-value">+{{ points }}</span>
        <span class="points-label">แต้ม</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  points: {
    type: Number,
    default: 0
  },
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const visible = ref(false)

watch(() => props.show, (newVal) => {
  if (newVal && props.points > 0) {
    visible.value = true
    setTimeout(() => {
      visible.value = false
      setTimeout(() => {
        emit('close')
      }, 500)
    }, 2000)
  }
})
</script>

<style scoped>
.points-notification {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9998;
  pointer-events: none;
}

.points-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 2.5rem;
  background: linear-gradient(135deg, #ffd89b 0%, #19547b 100%);
  border-radius: 60px;
  box-shadow: 0 10px 40px rgba(255, 215, 0, 0.4);
  animation: points-glow 1s ease-in-out infinite;
}

@keyframes points-glow {
  0%, 100% {
    box-shadow: 0 10px 40px rgba(255, 215, 0, 0.4);
  }
  50% {
    box-shadow: 0 10px 60px rgba(255, 215, 0, 0.6);
  }
}

.points-icon {
  font-size: 2.5rem;
  animation: icon-spin 1s ease-in-out;
}

@keyframes icon-spin {
  0% {
    transform: rotate(0deg) scale(0);
  }
  50% {
    transform: rotate(180deg) scale(1.2);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
}

.points-value {
  font-size: 2.5rem;
  font-weight: 800;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.points-label {
  font-size: 1.25rem;
  color: white;
  font-weight: 600;
}

/* Transition */
.points-pop-enter-active {
  animation: points-pop-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.points-pop-leave-active {
  animation: points-pop-out 0.5s ease-in;
}

@keyframes points-pop-in {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0) rotate(-180deg);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }
}

@keyframes points-pop-out {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -80%) scale(0.5);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .points-content {
    padding: 1rem 2rem;
  }

  .points-icon {
    font-size: 2rem;
  }

  .points-value {
    font-size: 2rem;
  }

  .points-label {
    font-size: 1rem;
  }
}
</style>
