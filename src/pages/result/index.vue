<template>
  <view class="result-page">
    <view class="nav-bar">
    <view class="nav-left" @tap="goHome">
      <text class="back-icon">←</text>
    </view>
    <view class="nav-title">训练结果</view>
    <view class="nav-right"></view>
  </view>

    <view class="score-area">
      <text class="rating" :style="{ color: ratingColor }">{{ rating }}</text>
      <text class="score-label">本局用时</text>
      <text class="score-time">{{ formatTime(useTime) }} 秒</text>
      <text class="score-errors">错误次数：{{ errorCount }} 次</text>
    </view>

    <view class="compare-area">
      <text class="compare-title">对比历史最佳</text>
      <template v-if="bestTime !== null">
        <view class="compare-content">
          <text class="compare-current">{{ formatTime(useTime) }} 秒</text>
          <text class="compare-vs">vs</text>
          <text class="compare-best">{{ formatTime(bestTime) }} 秒</text>
        </view>
        <text v-if="diff > 0" class="compare-diff text-green">更快了{{ formatTime(diff) }}秒</text>
        <text v-else-if="diff < 0" class="compare-diff text-red">慢了{{ formatTime(Math.abs(diff)) }}秒</text>
        <text v-else class="compare-diff text-gray">持平</text>
      </template>
      <text v-else class="compare-hint">暂无历史记录，继续加油</text>
    </view>

    <view class="percent-area">
      <text class="percent-title">超越全网</text>
      <text class="percent-value">{{ beatPercent }}% 用户</text>
      <text v-if="!userStore.isLogin" class="percent-hint">登录后可参与全网排行</text>
    </view>

    <view class="action-area">
      <view class="btn btn-pink" @tap="playAgain">
        <text>再来一局</text>
      </view>
      <view class="btn btn-gray" @tap="goHome">
        <text>返回首页</text>
      </view>
      <view class="btn btn-green" @tap="goRanking">
        <text>查看排行</text>
      </view>
    </view>

    <view class="ad-area">
      <text class="ad-placeholder">广告区域</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import { LEVEL_CONFIG, getRating, getRatingColor, formatTime } from '@/utils/index'

const router = useRouter()
const userStore = useUserStore()

const level = ref(3)
const useTime = ref(0)
const errorCount = ref(0)
const bestTime = ref(null)
const beatPercent = ref(0)

const rating = computed(() => getRating(level.value, useTime.value))
const ratingColor = computed(() => getRatingColor(rating.value))
const diff = computed(() => {
  if (bestTime.value === null) return 0
  return bestTime.value - useTime.value
})

function playAgain() {
  Taro.redirectTo({ url: `/pages/training/index?level=${level.value}` })
}

function goHome() {
  Taro.switchTab({ url: '/pages/index/index' })
}

function goRanking() {
  if (!userStore.isLogin) {
    Taro.showToast({ title: '请登录后查看排行', icon: 'none' })
    return
  }
  Taro.setStorageSync('pendingRankingLevel', level.value)
  Taro.switchTab({ url: '/pages/ranking/index' })
}

onMounted(() => {
  level.value = Number(router.params.level) || 3
  useTime.value = Number(router.params.time) || 0
  errorCount.value = Number(router.params.errors) || 0
  bestTime.value = userStore.getBestTime(level.value)
  const total = level.value * level.value
  const avgTime = useTime.value / total
  const thresholds = {
    3: { s: 800, a: 1200, b: 2000, c: 3500 },
    4: { s: 1500, a: 2500, b: 4000, c: 7000 },
    5: { s: 3000, a: 5000, b: 8000, c: 14000 },
    6: { s: 5000, a: 8000, b: 13000, c: 22000 },
    7: { s: 8000, a: 13000, b: 20000, c: 35000 },
    8: { s: 12000, a: 20000, b: 32000, c: 55000 }
  }
  const t = thresholds[level.value] || thresholds[5]
  let pct = 95
  if (avgTime <= t.s) pct = 95
  else if (avgTime <= t.a) pct = 80
  else if (avgTime <= t.b) pct = 60
  else if (avgTime <= t.c) pct = 35
  else pct = 15
  const offset = Math.floor(avgTime) % 5 - 2
  beatPercent.value = Math.max(5, Math.min(99, pct + offset))
})
</script>

<style lang="scss">
@import '@/styles/variables.scss';

@keyframes ratingGlow {
  0%, 100% { filter: drop-shadow(0 0 15rpx currentColor); }
  50% { filter: drop-shadow(0 0 30rpx currentColor); }
}

@keyframes ratingBounce {
  0% { transform: scale(0.5); opacity: 0; }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.result-page {
  min-height: 100vh;
  background-color: $bg-color;
  display: flex;
  flex-direction: column;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx $spacing-lg;
  height: 44rpx;

  .nav-left {
    .back-icon {
      font-size: 32rpx;
      color: $gray-light;
    }
  }

  .nav-title {
    font-size: 32rpx;
    font-weight: bold;
    color: $purple-deep;
  }

  .nav-right {
    width: 32rpx;
  }
}

.score-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0 40rpx;

  .rating {
    font-size: 100rpx;
    font-weight: bold;
    animation: ratingBounce 0.6s ease-out forwards, ratingGlow 2s ease-in-out infinite;
    margin-bottom: 20rpx;
  }

  .score-label {
    font-size: 16rpx;
    color: $gray-text;
  }

  .score-time {
    font-size: 40rpx;
    font-weight: bold;
    color: $purple-deep;
    margin-top: 8rpx;
  }

  .score-errors {
    font-size: 16rpx;
    color: $red-light;
    margin-top: 8rpx;
  }
}

.compare-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 32rpx;

  .compare-title {
    font-size: 14rpx;
    color: $gray-text;
    margin-bottom: 12rpx;
  }

  .compare-content {
    display: flex;
    align-items: center;
    gap: 16rpx;

    .compare-current {
      font-size: 16rpx;
      color: $purple-deep;
    }

    .compare-vs {
      font-size: 14rpx;
      color: $gray-text;
    }

    .compare-best {
      font-size: 16rpx;
      color: $green-light;
    }
  }

  .compare-diff {
    font-size: 14rpx;
    margin-top: 8rpx;
  }

  .compare-hint {
    font-size: 12rpx;
    color: $gray-text;
  }
}

.percent-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 32rpx;

  .percent-title {
    font-size: 14rpx;
    color: $gray-text;
  }

  .percent-value {
    font-size: 24rpx;
    font-weight: bold;
    color: $orange-light;
    margin-top: 4rpx;
  }

  .percent-hint {
    font-size: 12rpx;
    color: $gray-text;
    margin-top: 4rpx;
  }
}

.action-area {
  display: flex;
  justify-content: center;
  gap: 20rpx;
  padding: 20rpx 32rpx;
}

.ad-area {
  padding: 16rpx 32rpx;
  margin-top: auto;

  .ad-placeholder {
    width: 100%;
    height: 80rpx;
    background-color: #F0F0F0;
    border-radius: 8rpx;
    text-align: center;
    line-height: 80rpx;
    font-size: 14rpx;
    color: $gray-text;
    display: block;
  }
}
</style>
