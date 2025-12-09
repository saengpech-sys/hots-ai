<template>
  <Transition name="badge-notification">
    <div v-if="visible" class="badge-notification-container">
      <div class="badge-notification">
        <div class="confetti">
          <div v-for="i in 20" :key="i" class="confetti-piece" :style="getConfettiStyle(i)"></div>
        </div>
        
        <div class="notification-content">
          <div class="badge-icon-large">{{ badge.icon }}</div>
          <div class="badge-info">
            <h3>🎉 เหรียญใหม่!</h3>
            <h2>{{ badge.name }}</h2>
            <p>{{ badge.description }}</p>
            <div class="points">+{{ badge.points }} แต้ม</div>
          </div>
        </div>

        <button @click="close" class="close-notification">✕</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  badge: {
    type: Object,
    default: null
  },
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const visible = ref(false)

watch(() => props.show, (newVal) => {
  if (newVal && props.badge) {
    visible.value = true
    // Auto close after 5 seconds
    setTimeout(() => {
      close()
    }, 5000)
  }
})

function close() {
  visible.value = false
  setTimeout(() => {
    emit('close')
  }, 300)
}

function getConfettiStyle(index) {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#feca57', '#ee5a6f', '#c7ecee']
  const angle = (index * 360 / 20) + (Math.random() * 20 - 10)
  const distance = 100 + Math.random() * 50
  
  return {
    '--angle': `${angle}deg`,
    '--distance': `${distance}px`,
    '--delay': `${Math.random() * 0.3}s`,
    backgroundColor: colors[Math.floor(Math.random() * colors.length)]
  }
}
</script>

<style scoped>
.badge-notification-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  padding: 1rem;
}

.badge-notification {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24px;
  padding: 3rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.confetti {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

.confetti-piece {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  animation: confetti-fall 1.5s ease-out forwards;
  transform-origin: center;
}

@keyframes confetti-fall {
  0% {
    transform: translate(0, 0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: 
      translate(
        calc(cos(var(--angle)) * var(--distance)),
        calc(sin(var(--angle)) * var(--distance))
      )
      rotate(720deg);
    opacity: 0;
  }
}

.notification-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: white;
  animation: badge-bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes badge-bounce {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.1) rotate(10deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.badge-icon-large {
  font-size: 6rem;
  margin-bottom: 1rem;
  animation: icon-float 2s ease-in-out infinite;
}

@keyframes icon-float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.badge-info h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  opacity: 0.9;
}

.badge-info h2 {
  margin: 0 0 1rem 0;
  font-size: 2rem;
  font-weight: 700;
}

.badge-info p {
  margin: 0 0 1.5rem 0;
  font-size: 1.125rem;
  opacity: 0.95;
  line-height: 1.6;
}

.points {
  display: inline-block;
  padding: 0.75rem 2rem;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50px;
  font-size: 1.5rem;
  font-weight: 700;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.close-notification {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.close-notification:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

/* Transition */
.badge-notification-enter-active,
.badge-notification-leave-active {
  transition: all 0.4s ease;
}

.badge-notification-enter-from,
.badge-notification-leave-to {
  opacity: 0;
}

.badge-notification-enter-from .badge-notification,
.badge-notification-leave-to .badge-notification {
  transform: scale(0.8) translateY(-50px);
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .badge-notification {
    padding: 2rem 1.5rem;
  }

  .badge-icon-large {
    font-size: 4rem;
  }

  .badge-info h2 {
    font-size: 1.5rem;
  }

  .badge-info p {
    font-size: 1rem;
  }

  .points {
    font-size: 1.25rem;
    padding: 0.5rem 1.5rem;
  }
}
</style>
