<template>
  <div class="radar-chart">
    <svg :viewBox="`0 0 ${viewBoxSize} ${viewBoxSize}`" :width="size" :height="size">
      <!-- Background grid -->
      <g :transform="`translate(${padding}, ${padding})`">
        <g v-for="level in 5" :key="'grid-' + level">
          <polygon
            :points="getPolygonPoints(level / 5)"
            fill="none"
            :stroke="gridColor"
            :stroke-width="level === 5 ? 2 : 1"
            :opacity="level === 5 ? 0.5 : 0.2"
          />
        </g>
        
        <!-- Axis lines -->
        <g v-for="(dimension, idx) in dimensions" :key="'axis-' + idx">
          <line
            :x1="center"
            :y1="center"
            :x2="getPoint(idx, 1).x"
            :y2="getPoint(idx, 1).y"
            :stroke="gridColor"
            stroke-width="1"
            opacity="0.3"
          />
        </g>
        
        <!-- Data polygon -->
        <polygon
          :points="getDataPoints()"
          :fill="fillColor"
          :fill-opacity="fillOpacity"
          :stroke="strokeColor"
          :stroke-width="strokeWidth"
          stroke-linejoin="round"
        />
        
        <!-- Data points -->
        <circle
          v-for="(dimension, idx) in dimensions"
          :key="'point-' + idx"
          :cx="getPoint(idx, (safeValues[dimension.key] || 0) / maxValue).x"
          :cy="getPoint(idx, (safeValues[dimension.key] || 0) / maxValue).y"
          :r="pointRadius"
          :fill="strokeColor"
          stroke="white"
          stroke-width="2"
          class="data-point"
        >
          <title>{{ dimension.label }}: {{ (safeValues[dimension.key] || 0).toFixed(1) }}</title>
        </circle>
        
        <!-- Labels (rendered last to be on top) -->
        <text
          v-for="(dimension, idx) in dimensions"
          :key="'label-' + idx"
          :x="getLabelPosition(idx).x"
          :y="getLabelPosition(idx).y"
          :text-anchor="getLabelAnchor(idx)"
          :dominant-baseline="getLabelBaseline(idx)"
          :class="['dimension-label']"
          :fill="labelColor"
        >
          {{ dimension.label }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  values: {
    type: Object,
    required: true,
    default: () => ({ analysis: 0, reasoning: 0, creativity: 0, evidence: 0 })
  },
  dimensions: {
    type: Array,
    default: () => [
      { key: 'analysis', label: '🔍 Analysis' },
      { key: 'reasoning', label: '🧠 Reasoning' },
      { key: 'creativity', label: '💡 Creativity' },
      { key: 'evidence', label: '📚 Evidence' }
    ]
  },
  size: {
    type: Number,
    default: 300
  },
  maxValue: {
    type: Number,
    default: 5
  },
  fillColor: {
    type: String,
    default: '#667eea'
  },
  fillOpacity: {
    type: Number,
    default: 0.3
  },
  strokeColor: {
    type: String,
    default: '#667eea'
  },
  strokeWidth: {
    type: Number,
    default: 3
  },
  pointRadius: {
    type: Number,
    default: 5
  },
  gridColor: {
    type: String,
    default: '#cbd5e1'
  },
  labelColor: {
    type: String,
    default: '#64748b'
  }
})

const center = computed(() => props.size / 2)
const radius = computed(() => props.size * 0.32)
const padding = 60  // Space for labels
const viewBoxSize = computed(() => props.size + padding * 2)

// Safe values with defaults
const safeValues = computed(() => {
  const defaultValues = { analysis: 0, reasoning: 0, creativity: 0, evidence: 0 }
  if (!props.values || typeof props.values !== 'object') {
    return defaultValues
  }
  return {
    analysis: Number(props.values?.analysis) || 0,
    reasoning: Number(props.values?.reasoning) || 0,
    creativity: Number(props.values?.creativity) || 0,
    evidence: Number(props.values?.evidence) || 0
  }
})

function getAngle(index) {
  return (Math.PI * 2 * index) / props.dimensions.length - Math.PI / 2
}

function getPoint(index, ratio) {
  const angle = getAngle(index)
  return {
    x: center.value + Math.cos(angle) * radius.value * ratio,
    y: center.value + Math.sin(angle) * radius.value * ratio
  }
}

function getPolygonPoints(ratio) {
  return props.dimensions
    .map((_, idx) => {
      const point = getPoint(idx, ratio)
      return `${point.x},${point.y}`
    })
    .join(' ')
}

function getDataPoints() {
  return props.dimensions
    .map((dim, idx) => {
      const value = safeValues.value[dim.key] || 0
      const point = getPoint(idx, value / props.maxValue)
      return `${point.x},${point.y}`
    })
    .join(' ')
}

function getLabelPosition(index) {
  const angle = getAngle(index)
  const labelDistance = radius.value * 1.35
  return {
    x: center.value + Math.cos(angle) * labelDistance,
    y: center.value + Math.sin(angle) * labelDistance
  }
}

function getLabelAnchor(index) {
  const angle = getAngle(index)
  const x = Math.cos(angle)
  if (Math.abs(x) < 0.1) return 'middle'
  return x > 0 ? 'start' : 'end'
}

function getLabelBaseline(index) {
  const angle = getAngle(index)
  const y = Math.sin(angle)
  if (Math.abs(y) < 0.1) return 'middle'
  return y > 0 ? 'hanging' : 'baseline'
}
</script>

<style scoped>
.radar-chart {
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible;
}

.radar-chart svg {
  overflow: visible;
}

.dimension-label {
  font-size: 13px;
  font-weight: 600;
  user-select: none;
}

.data-point {
  cursor: pointer;
  transition: r 0.2s ease;
}

.data-point:hover {
  r: 8;
}
</style>
