<template>
  <view class="training-page">
    <view class="top-bar">
      <view class="top-left" @tap="handleExit">
        <text class="back-icon">←</text>
      </view>
      <view class="top-center">
        <text class="level-label">{{ level }}×{{ level }} {{ levelConfig[level].name }}</text>
      </view>
      <view class="top-right">
        <text class="error-count">错误：{{ errorCount }}</text>
      </view>
    </view>

    <view class="timer-area">
      <text v-if="phase === 'countdown'" class="countdown-num" :style="{ color: countdownColor }" :key="countdown">{{ countdown }}</text>
      <text v-else class="timer-text">{{ displayTime }}</text>
    </view>

    <view v-if="phase === 'playing'" class="progress-area">
      <text class="progress-text">{{ currentTarget - 1 }} / {{ totalCells }}</text>
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
      </view>
    </view>

    <view class="grid-area">
      <view class="grid-container" :style="gridStyle">
        <view
          v-for="(cell, idx) in flatGrid"
          :key="idx"
          class="grid-cell"
          :class="{ 'cell-clicked': cell.clicked }"
          :style="cellStyle(cell)"
          @tap="handleCellTap(cell)"
        >
          <text class="cell-number" :style="{ color: cell.clicked ? '#FFFFFF' : cell.color }">{{ cell.number }}</text>
        </view>
      </view>
    </view>

    <view class="action-area">
      <view class="btn btn-pink" @tap="handleReset">
        <text>重置本局</text>
      </view>
      <view class="btn btn-gray" @tap="handleExit">
        <text>退出对局</text>
      </view>
    </view>

    <view class="ad-area">
      <text class="ad-placeholder">广告区域</text>
    </view>

    <view v-if="showExitModal" class="modal-mask" @tap="showExitModal = false">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">确定退出对局？</text>
        <text class="modal-desc">退出后不保存本次成绩</text>
        <view class="modal-actions">
          <view class="btn btn-gray" @tap="showExitModal = false">
            <text>取消</text>
          </view>
          <view class="btn btn-pink" @tap="confirmExit">
            <text>确定</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import { LEVEL_CONFIG, generateGrid, MACARON_COLORS, validateLevel } from '@/utils/index'

const router = useRouter()
const userStore = useUserStore()

const level = ref(3)
const levelConfig = LEVEL_CONFIG
const grid = ref([])
const errorCount = ref(0)
const currentTarget = ref(1)
const phase = ref('countdown')
const countdown = ref(3)
const startTime = ref(0)
const elapsedMs = ref(0)
const timerInterval = ref(null)
const cdIntervalRef = ref(null)
const showExitModal = ref(false)

const countdownColor = computed(() => {
  return MACARON_COLORS[countdown.value % MACARON_COLORS.length]
})

const flatGrid = computed(() => {
  return grid.value.flat()
})

const gridStyle = computed(() => {
  const size = level.value
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${size}, 1fr)`,
    gap: '8rpx',
    width: '100%',
    maxWidth: size <= 5 ? '560rpx' : '640rpx'
  }
})

const displayTime = computed(() => {
  const seconds = elapsedMs.value / 1000
  return seconds.toFixed(3)
})

const totalCells = computed(() => {
  return level.value * level.value
})

const progressPercent = computed(() => {
  return ((currentTarget.value - 1) / totalCells.value) * 100
})

function cellStyle(cell) {
  const size = level.value
  const cellSize = size <= 5 ? '100rpx' : '72rpx'
  const baseStyle = {
    width: '100%',
    aspectRatio: '1',
    borderRadius: '12rpx',
    backgroundColor: cell.clicked ? cell.color : '#FFFFFF',
    border: `2rpx solid ${LEVEL_CONFIG[level.value].borderColor}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  }
  return baseStyle
}

function initGame() {
  const l = validateLevel(Number(router.params.level) || 3)
  level.value = l
  grid.value = generateGrid(l)
  errorCount.value = 0
  currentTarget.value = 1
  elapsedMs.value = 0
  phase.value = 'countdown'
  countdown.value = 3
  startCountdown()
}

function startCountdown() {
  phase.value = 'countdown'
  countdown.value = 3
  if (cdIntervalRef.value) clearInterval(cdIntervalRef.value)
  cdIntervalRef.value = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearInterval(cdIntervalRef.value)
      cdIntervalRef.value = null
      phase.value = 'playing'
      startTime.value = Date.now()
      startTimer()
    }
  }, 1000)
}

function startTimer() {
  timerInterval.value = setInterval(() => {
    elapsedMs.value = Date.now() - startTime.value
  }, 16)
}

function stopTimer() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

function handleCellTap(cell) {
  if (phase.value !== 'playing' || cell.clicked) return

  if (cell.number === currentTarget.value) {
    cell.clicked = true
    currentTarget.value += 1
    const total = level.value * level.value
    if (currentTarget.value > total) {
      stopTimer()
      elapsedMs.value = Date.now() - startTime.value
      userStore.saveGameResult(level.value, elapsedMs.value, errorCount.value)
      Taro.redirectTo({
        url: `/pages/result/index?level=${level.value}&time=${elapsedMs.value}&errors=${errorCount.value}`
      })
    }
  } else {
    errorCount.value += 1
  }
}

function handleReset() {
  stopTimer()
  initGame()
}

function handleExit() {
  if (phase.value === 'playing' || phase.value === 'countdown') {
    showExitModal.value = true
  } else {
    Taro.navigateBack()
  }
}

function confirmExit() {
  stopTimer()
  showExitModal.value = false
  Taro.navigateBack()
}

onMounted(() => {
  initGame()
})

onUnmounted(() => {
  stopTimer()
  if (cdIntervalRef.value) {
    clearInterval(cdIntervalRef.value)
    cdIntervalRef.value = null
  }
})
</script>

<style lang="scss">
@import '@/styles/variables.scss';

@keyframes countdownPulse {
  0% { transform: scale(1.8); opacity: 0; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes timerGlow {
  0%, 100% { text-shadow: 0 0 10rpx rgba(107, 93, 122, 0.3); }
  50% { text-shadow: 0 0 20rpx rgba(107, 93, 122, 0.6); }
}

.training-page {
  min-height: 100vh;
  background-color: $bg-color;
  display: flex;
  flex-direction: column;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx $spacing-lg;
  height: 44rpx;

  .top-left {
    .back-icon {
      font-size: 32rpx;
      color: $gray-light;
    }
  }

  .top-center {
    .level-label {
      font-size: 18rpx;
      font-weight: bold;
      color: $purple-deep;
    }
  }

  .top-right {
    .error-count {
      font-size: 16rpx;
      color: $red-light;
    }
  }
}

.timer-area {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30rpx 0;

  .countdown-num {
    font-size: 72rpx;
    font-weight: bold;
    animation: countdownPulse 0.8s ease-out forwards;
  }

  .timer-text {
    font-size: 48rpx;
    font-weight: bold;
    color: $purple-deep;
    font-variant-numeric: tabular-nums;
    animation: timerGlow 2s ease-in-out infinite;
  }
}

.progress-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 $spacing-lg $spacing-md;

  .progress-text {
    font-size: 16rpx;
    color: $gray-text;
    margin-bottom: $spacing-xs;
  }

  .progress-bar {
    width: 100%;
    height: 8rpx;
    background-color: #E8E8E8;
    border-radius: 4rpx;
    overflow: hidden;

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, $purple-light, $purple-deep);
      border-radius: 4rpx;
      transition: width 0.2s ease;
    }
  }
}

.grid-area {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  padding: 20rpx 32rpx;

  .grid-container {
    margin: 0 auto;
  }

  .grid-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.04);

    &:active {
      transform: scale(0.94);
    }

    .cell-number {
      font-weight: bold;
      font-size: 28rpx;
    }
  }

  .cell-clicked {
    opacity: 0.7;
    transform: scale(0.95);
  }
}

.action-area {
  display: flex;
  justify-content: center;
  gap: 40rpx;
  padding: $spacing-md $spacing-lg;
  padding-bottom: calc(#{$spacing-md} + constant(safe-area-inset-bottom));
  padding-bottom: calc(#{$spacing-md} + env(safe-area-inset-bottom));
}

.ad-area {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: $spacing-sm $spacing-lg;

  .ad-placeholder {
    width: 100%;
    height: 80rpx;
    background-color: #F0F0F0;
    border-radius: 8rpx;
    text-align: center;
    line-height: 80rpx;
    font-size: 14rpx;
    color: $gray-text;
  }
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;

  .modal-content {
    background-color: #FFFFFF;
    border-radius: $radius-popup;
    padding: 40rpx;
    width: 560rpx;
    display: flex;
    flex-direction: column;
    align-items: center;

    .modal-title {
      font-size: 18rpx;
      font-weight: bold;
      color: $text-dark;
      margin-bottom: 12rpx;
    }

    .modal-desc {
      font-size: 14rpx;
      color: $gray-text;
      margin-bottom: 32rpx;
    }

    .modal-actions {
      display: flex;
      gap: 24rpx;
    }
  }
}
</style>
