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
      <text class="timer-text">{{ displayTime }}</text>
    </view>

    <view class="progress-area">
      <view v-if="phase === 'countdown'" class="countdown-content">
        <text class="countdown-num" :style="{ color: countdownColor }" :key="countdown">{{ countdown }}</text>
      </view>
      <view v-else-if="phase === 'ready'" class="countdown-content">
        <text class="countdown-num ready-num">开始</text>
      </view>
      <view v-else-if="phase === 'playing'" class="progress-content">
        <text class="progress-text">{{ currentTarget - 1 }} / {{ totalCells }}</text>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
        </view>
      </view>
      <view v-else class="progress-placeholder"></view>
    </view>

    <view class="grid-area">
      <CellGrid
        :grid="grid"
        :level="level"
        :tappable="phase === 'playing'"
        :showNumber="phase === 'playing'"
        @cellTap="handleCellTap"
      />
    </view>

    <view class="action-area">
      <view class="btn btn-pink" @tap="handleReset">
        <text>重置本局</text>
      </view>
      <view class="btn btn-gray" @tap="handleExit">
        <text>退出对局</text>
      </view>
    </view>

    <Modal
      :visible="showExitModal"
      title="确定退出对局？"
      desc="退出后不保存本次成绩"
      @close="showExitModal = false"
    >
      <template #actions>
        <view class="btn btn-gray" @tap="showExitModal = false">
          <text>取消</text>
        </view>
        <view class="btn btn-pink" @tap="confirmExit">
          <text>确定</text>
        </view>
      </template>
    </Modal>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import { LEVEL_CONFIG, generateGrid, MACARON_COLORS, validateLevel } from '@/utils/index'
import Modal from '@/components/Modal.vue'
import CellGrid from '@/components/CellGrid.vue'

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
const readyTimeoutRef = ref(null)
const showExitModal = ref(false)

const countdownColor = computed(() => {
  return MACARON_COLORS[countdown.value % MACARON_COLORS.length]
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

function initGame() {
  clearAllTimers()
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
      phase.value = 'ready'
      readyTimeoutRef.value = setTimeout(() => {
        readyTimeoutRef.value = null
        // B 档微调:startTime 提前到 phase 赋值之前。
        // 原顺序:phase='playing' → 触发 Vue 响应式 → microtask flush → 浏览器 paint → Date.now()
        //         这中间会有 0~33ms 的"隐藏时间",timer 起点比视觉首帧晚。
        // 新顺序:Date.now() 先抢下来,phase 切换和渲染在之后发生,
        //         timer 起点与首帧 paint 几乎对齐,首格 tap 不再被吞。
        startTime.value = Date.now()
        phase.value = 'playing'
        startTimer()
      }, 800)
    }
  }, 1000)
}

function clearAllTimers() {
  stopTimer()
  if (cdIntervalRef.value) {
    clearInterval(cdIntervalRef.value)
    cdIntervalRef.value = null
  }
  if (readyTimeoutRef.value) {
    clearTimeout(readyTimeoutRef.value)
    readyTimeoutRef.value = null
  }
}

function startTimer() {
  timerInterval.value = setInterval(() => {
    elapsedMs.value = Date.now() - startTime.value
  }, 100)
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
      const { isNewRecord } = userStore.saveGameResult(level.value, elapsedMs.value, errorCount.value, grid.value)
      userStore.recordGameComplete()
      if (isNewRecord) {
        userStore.recordNewRecord()
        Taro.showToast({ title: '新纪录!额外+1分', icon: 'none', duration: 2000 })
      } else {
        Taro.showToast({ title: '完成+1分', icon: 'none', duration: 1500 })
      }
      Taro.redirectTo({
        url: `/pages/result/index?level=${level.value}&time=${elapsedMs.value}&errors=${errorCount.value}`
      })
    }
  } else {
    errorCount.value += 1
  }
}

function handleReset() {
  initGame()
}

function handleExit() {
  if (phase.value === 'playing' || phase.value === 'countdown' || phase.value === 'ready') {
    showExitModal.value = true
  } else {
    Taro.navigateBack()
  }
}

function confirmExit() {
  clearAllTimers()
  showExitModal.value = false
  Taro.navigateBack()
}

onMounted(() => {
  initGame()
})

onUnmounted(() => {
  clearAllTimers()
})


</script>

<style lang="scss">
@use '@/styles/variables' as *;

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
      font-size: 28rpx;
      font-weight: bold;
      color: $purple-deep;
    }
  }

  .top-right {
    .error-count {
      font-size: 26rpx;
      color: $red-light;
    }
  }
}

.timer-area {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30rpx 0;

  .timer-text {
    font-size: 56rpx;
    font-weight: bold;
    color: $purple-deep;
    font-variant-numeric: tabular-nums;
    animation: timerGlow 2s ease-in-out infinite;
  }
}

.progress-area {
  padding: $spacing-sm $spacing-lg;
  min-height: 120rpx;
  display: flex;
  justify-content: center;
  align-items: center;

  .countdown-content {
    display: flex;
    justify-content: center;
    align-items: center;

    .countdown-num {
      font-size: 72rpx;
      font-weight: bold;
    }

    .ready-num {
      font-size: 56rpx;
      color: $purple-deep;
    }
  }

  .progress-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;

    .progress-text {
      font-size: 22rpx;
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

  .progress-placeholder {
    width: 100%;
  }
}

.grid-area {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  padding: 20rpx 32rpx;
}

.action-area {
  display: flex;
  justify-content: center;
  gap: 40rpx;
  padding: $spacing-md $spacing-lg;
  padding-bottom: calc(#{$spacing-md} + constant(safe-area-inset-bottom));
  padding-bottom: calc(#{$spacing-md} + env(safe-area-inset-bottom));
}
</style>
