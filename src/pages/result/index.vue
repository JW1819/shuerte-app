<template>
  <view class="result-page">
    <view class="nav-bar">
      <view class="nav-left" @tap="goHome">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">训练结果</view>
      <view class="nav-right"></view>
    </view>

    <view v-if="!loaded" class="score-skeleton">
      <view class="skeleton-block skeleton-rating"></view>
      <view class="skeleton-block skeleton-label"></view>
      <view class="skeleton-block skeleton-time"></view>
    </view>
    <template v-else>
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

    <view v-if="beatPercent !== null" class="percent-area">
      <text class="percent-title">超越全网</text>
      <text class="percent-value">{{ beatPercent }}% 用户</text>
    </view>
    <view v-else-if="userStore.isLogin" class="percent-area">
      <text class="percent-title">超越全网</text>
      <text class="percent-value loading-text">计算中...</text>
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

    <view v-if="userStore.lastGame" class="replay-link" @tap="goReplay">
      <text class="replay-link-text">查看本局方格 →</text>
    </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import { LEVEL_CONFIG, getRating, getRatingColor, formatTime, validateLevel, cloudCall } from '@/utils/index'

const router = useRouter()
const userStore = useUserStore()

const level = ref(3)
const useTime = ref(0)
const errorCount = ref(0)
const bestTime = ref(null)
const beatPercent = ref(null)
const loaded = ref(false)

let mounted = true

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
  userStore.setPendingRankingLevel(level.value)
  Taro.switchTab({ url: '/pages/ranking/index' })
}

function goReplay() {
  Taro.navigateTo({ url: '/pages/replay/index' })
}

onMounted(() => {
  level.value = validateLevel(Number(router.params.level) || 3)
  useTime.value = Math.max(0, Number(router.params.time) || 0)
  errorCount.value = Math.max(0, Number(router.params.errors) || 0)
  bestTime.value = userStore.getBestTime(level.value)
  loaded.value = true

  if (userStore.isLogin && userStore.userInfo.openId) {
    cloudCall('getRanking', {
      level: level.value,
      myOpenId: userStore.userInfo.openId
    })
      .then(/** @param {{ success?: boolean, total?: number, myRank?: number }} res */ (res) => {
        if (!mounted) return
        if (res?.success && res.total && res.total > 0 && res.myRank && res.myRank > 0) {
          beatPercent.value = Math.round(((res.total - res.myRank) / res.total) * 100)
        } else {
          beatPercent.value = null
        }
      })
      .catch(() => {
        if (!mounted) return
        beatPercent.value = null
      })
  } else {
    beatPercent.value = null
  }
})

onUnmounted(() => {
  mounted = false
})
</script>

<style lang="scss">
@use '@/styles/variables' as *;

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

    &.loading-text {
      font-weight: normal;
      color: $gray-text;
    }
  }
}

.action-area {
  display: flex;
  justify-content: center;
  gap: 20rpx;
  padding: 20rpx 32rpx;
}

.replay-link {
  display: flex;
  justify-content: center;
  padding: 16rpx 32rpx 32rpx;

  .replay-link-text {
    font-size: 26rpx;
    color: $purple-light;
    text-decoration: underline;
  }
}

.score-skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0 40rpx;

  .skeleton-block {
    background: linear-gradient(90deg, #F0E8E0 0%, #F8F0E8 50%, #F0E8E0 100%);
    background-size: 200% 100%;
    border-radius: 12rpx;
    animation: skeletonShimmer 1.2s ease-in-out infinite;
  }

  .skeleton-rating { width: 160rpx; height: 100rpx; margin-bottom: 20rpx; }
  .skeleton-label  { width: 120rpx; height: 16rpx; margin-bottom: 12rpx; }
  .skeleton-time   { width: 220rpx; height: 40rpx; }
}

@keyframes skeletonShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
