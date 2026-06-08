<template>
  <view class="replay-page">
    <view v-if="!lastGame" class="empty-state">
      <text class="empty-text">暂无本局数据</text>
      <view class="btn btn-pink" @tap="goHome">
        <text>返回首页</text>
      </view>
    </view>

    <template v-else>
      <view class="info-area">
        <text class="level-label">{{ lastGame.level }}×{{ lastGame.level }} {{ levelConfig[lastGame.level].name }}</text>
        <text class="info-row">用时 {{ formatTime(lastGame.useTime) }} 秒 · 错误 {{ lastGame.errorCount }} 次</text>
      </view>

      <view class="grid-area">
        <CellGrid :grid="lastGame.grid" :level="lastGame.level" />
      </view>

      <view class="legend-area">
        <view class="legend-item">
          <view class="legend-dot legend-dot-empty"></view>
          <text>未点击</text>
        </view>
        <view class="legend-item">
          <view class="legend-dot legend-dot-clicked"></view>
          <text>已点击</text>
        </view>
      </view>

      <view class="action-area">
        <view class="btn btn-pink" @tap="playAgain">
          <text>再来一局</text>
        </view>
        <view class="btn btn-gray" @tap="goBack">
          <text>返回</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import { LEVEL_CONFIG, formatTime } from '@/utils/index'
import CellGrid from '@/components/CellGrid.vue'

const userStore = useUserStore()
const lastGame = computed(() => userStore.lastGame)
const levelConfig = LEVEL_CONFIG

function playAgain() {
  if (!lastGame.value) return
  const lv = lastGame.value.level
  userStore.clearLastGame()
  Taro.redirectTo({ url: `/pages/training/index?level=${lv}` })
}

function goBack() {
  Taro.navigateBack()
}

function goHome() {
  Taro.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss">
@use '@/styles/variables' as *;

.replay-page {
  min-height: 100vh;
  background-color: $bg-color;
  display: flex;
  flex-direction: column;
  padding: $spacing-md $spacing-lg;
  box-sizing: border-box;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-lg;

  .empty-text {
    font-size: 28rpx;
    color: $gray-text;
  }
}

.info-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-md 0;

  .level-label {
    font-size: 32rpx;
    font-weight: bold;
    color: $purple-deep;
  }

  .info-row {
    font-size: 24rpx;
    color: $gray-text;
    margin-top: $spacing-xs;
  }
}

.grid-area {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: $spacing-md 0;
}

.legend-area {
  display: flex;
  justify-content: center;
  gap: $spacing-lg;
  padding: $spacing-md 0;

  .legend-item {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: 22rpx;
    color: $gray-text;
  }

  .legend-dot {
    width: 24rpx;
    height: 24rpx;
    border-radius: 6rpx;
    border: 2rpx solid $gray-light;

    &.legend-dot-clicked {
      background: linear-gradient(135deg, $purple-light, $purple-deep);
      border-color: transparent;
    }
  }
}

.action-area {
  display: flex;
  justify-content: center;
  gap: 40rpx;
  padding: $spacing-md 0;
}
</style>
