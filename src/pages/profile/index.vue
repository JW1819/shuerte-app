<template>
  <view class="profile-page">
    <view class="user-header">
      <view class="user-info">
        <view class="avatar-wrap">
          <view v-if="userStore.isLogin && userStore.userInfo.avatarUrl && !avatarLoadError" class="avatar avatar-url">
            <image class="avatar-img" :src="userStore.userInfo.avatarUrl" mode="aspectFill" @error="handleAvatarError" />
          </view>
          <view v-else class="avatar avatar-emoji-wrap">
            <text class="avatar-emoji-text">👤</text>
          </view>
        </view>
        <view class="user-detail">
          <text class="nickname">{{ typeof userStore.userInfo.nickName === 'string' && userStore.userInfo.nickName ? userStore.userInfo.nickName : '游客' }}</text>
          <text class="user-status">{{ userStore.isLogin ? '已登录' : '游客模式' }}</text>
        </view>
      </view>
      <view class="login-btn" @tap="handleLoginAction">
        <text class="login-text">{{ userStore.isLogin ? '退出登录' : '去登录' }}</text>
      </view>
    </view>

    <view class="stats-area">
      <view class="stat-item">
        <view class="stat-icon-wrap sign-icon">
          <text class="stat-icon">🔥</text>
        </view>
        <text class="stat-value text-orange">{{ userStore.continuousSign }}</text>
        <text class="stat-label">连续签到(天)</text>
      </view>
      <view class="stat-item">
        <view class="stat-icon-wrap game-icon">
          <text class="stat-icon">🎮</text>
        </view>
        <text class="stat-value" style="color: #5B9BD5">{{ userStore.totalGameCount }}</text>
        <text class="stat-label">累计对局(局)</text>
      </view>
      <view class="stat-item">
        <view class="stat-icon-wrap time-icon">
          <text class="stat-icon">⏱️</text>
        </view>
        <text class="stat-value text-green">{{ formatDuration(userStore.totalTime) }}</text>
        <text class="stat-label">总训练时长</text>
      </view>
    </view>

    <view class="points-card">
      <view class="points-header">
        <text class="points-title">我的积分</text>
        <text class="points-value">{{ userStore.points }}<text class="points-unit"> 分</text></text>
      </view>
      <view class="points-stats">
        <view class="points-stat-item">
          <text class="points-stat-num">{{ userStore.totalEarned }}</text>
          <text class="points-stat-label">累计获得</text>
        </view>
        <view class="points-stat-divider"></view>
        <view class="points-stat-item">
          <text class="points-stat-num">{{ userStore.totalSpent }}</text>
          <text class="points-stat-label">累计消耗</text>
        </view>
      </view>
      <view class="points-actions">
        <view class="points-btn points-btn-primary" @tap="goLottery">
          <text class="points-btn-text">🎰 去抽奖</text>
        </view>
        <view class="points-btn points-btn-secondary" @tap="goShop">
          <text class="points-btn-text">🛍️ 积分商城</text>
        </view>
      </view>
    </view>

    <view class="best-area">
      <text class="section-title">各难度历史最佳</text>
      <view class="best-grid">
        <view
          v-for="rec in bestRecords"
          :key="rec.level"
          class="best-card card"
          :style="{ backgroundColor: levelConfig[rec.level].bgColor }"
          @tap="handleBestCardTap(rec.level)"
        >
          <text class="best-level" :style="{ color: levelConfig[rec.level].textColor }">{{ rec.level }}×{{ rec.level }}</text>
          <view v-if="rec.has">
            <text class="best-time">{{ formatTime(rec.bestTime) }}秒</text>
            <view class="best-bottom">
              <text class="best-error">{{ rec.bestError }}次错误</text>
              <text class="best-rating" :class="rec.ratingClass">{{ rec.rating }}</text>
            </view>
          </view>
          <view v-else>
            <text class="best-time">-</text>
            <text class="best-no-record">暂无记录</text>
          </view>
        </view>
      </view>
    </view>

    <Modal
      :visible="showLogoutModal"
      title="确定退出登录？"
      desc="退出后本地数据不丢失"
      @close="showLogoutModal = false"
    >
      <template #actions>
        <view class="btn btn-gray" @tap="showLogoutModal = false">
          <text>取消</text>
        </view>
        <view class="btn btn-pink" @tap="confirmLogout">
          <text>确定</text>
        </view>
      </template>
    </Modal>

    <LoginDialog />
  </view>
</template>

<script setup>
import LoginDialog from '@/components/LoginDialog.vue'
import Modal from '@/components/Modal.vue'
import { ref, computed, watch } from 'vue'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import { LEVEL_CONFIG, LEVELS, formatTime, formatDuration, getRating as getRatingUtil } from '@/utils/index'
import { useLogin } from '@/utils/useLogin'

const userStore = useUserStore()
const levels = LEVELS
const levelConfig = LEVEL_CONFIG
const showLogoutModal = ref(false)
const avatarLoadError = ref(false)

const bestRecords = computed(() => {
  return levels.map(lv => {
    const bestTime = userStore.getBestTime(lv)
    const has = bestTime != null
    const rating = has ? getRatingUtil(lv, bestTime) : '-'
    return {
      level: lv,
      has,
      bestTime: bestTime || 0,
      bestError: userStore.getBestError(lv),
      rating,
      ratingClass: `rating-${rating}`
    }
  })
})

function handleAvatarError() {
  avatarLoadError.value = true
  if (userStore.userInfo && userStore.userInfo.avatarUrl) {
    userStore.clearAvatarUrl()
  }
}

watch(() => userStore.userInfo.avatarUrl, (newUrl) => {
  // 头像 URL 变更(重新登录/重置)时清掉错误标志,让新头像有机会显示
  if (newUrl) avatarLoadError.value = false
})

const { openLoginDialog } = useLogin()

function handleBestCardTap(lv) {
  if (!userStore.isLogin) {
    openLoginDialog()
    return
  }
  Taro.navigateTo({
    url: `/pages/training/index?level=${lv}`
  })
}

function goLottery() {
  if (!userStore.isLogin) {
    openLoginDialog()
    return
  }
  Taro.navigateTo({ url: '/pages/points/index' })
}

function goShop() {
  Taro.navigateTo({ url: '/pages/shop/index' })
}

function handleLoginAction() {
  if (userStore.isLogin) {
    showLogoutModal.value = true
  } else {
    openLoginDialog()
  }
}

function confirmLogout() {
  userStore.logout()
  avatarLoadError.value = false
  showLogoutModal.value = false
  Taro.showToast({ title: '已退出登录', icon: 'none' })
}
</script>

<style lang="scss">
@use '@/styles/variables' as *;

@keyframes signSuccess {
  0% { transform: scale(1); }
  30% { transform: scale(1.4); }
  50% { transform: scale(0.9); }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8rpx); }
}

.profile-page {
  min-height: 100vh;
  background-color: $bg-color;
  box-sizing: border-box;
}

.user-header {
  background: linear-gradient(135deg, #E8E0F0, #F0E8F8);
  border-radius: 0 0 40rpx 40rpx;
  padding: 60rpx $spacing-lg $spacing-xl;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .user-info {
    display: flex;
    align-items: center;
    gap: $spacing-lg;

    .avatar-wrap {
      .avatar {
        width: 80rpx;
        height: 80rpx;
        border-radius: 50%;
        border: 4rpx solid rgba(255, 255, 255, 0.6);
        box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);

        &.avatar-url {
          overflow: hidden;
          background-color: transparent;

          .avatar-img {
            width: 100%;
            height: 100%;
          }
        }

        &.avatar-emoji-wrap {
          background-color: rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;

          .avatar-emoji-text {
            font-size: 40rpx;
          }
        }
      }
    }

    .user-detail {
      display: flex;
      flex-direction: column;

      .nickname {
        font-size: 32rpx;
        font-weight: bold;
        color: $purple-deep;
      }

      .user-status {
        font-size: 22rpx;
        color: $purple-light;
        margin-top: $spacing-xs;
      }
    }
  }

  .login-btn {
    padding: $spacing-sm $spacing-lg;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: $radius-btn;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;

    &:active {
      transform: scale(0.96);
    }

    .login-text {
      font-size: 24rpx;
      font-weight: bold;
      color: $purple-light;
    }
  }
}

.stats-area {
  display: flex;
  justify-content: space-around;
  padding: $spacing-lg $spacing-lg;

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: $spacing-md;
    border-radius: $radius-card;
    transition: all 0.2s;
    width: 140rpx;

    &:active {
      transform: scale(0.96);
      background-color: rgba(0, 0, 0, 0.03);
    }

    .stat-icon-wrap {
      width: 56rpx;
      height: 56rpx;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: $spacing-sm;

      &.sign-icon {
        background: linear-gradient(135deg, #FFF0E0, #FFE0EC);
      }

      &.game-icon {
        background: linear-gradient(135deg, #E0F0FF, #E0F8E8);
      }

      &.time-icon {
        background: linear-gradient(135deg, #E8E0F0, #F0E8F8);
      }

      .stat-icon {
        font-size: 28rpx;
      }
    }

    .stat-value {
      font-size: 36rpx;
      font-weight: bold;
    }

    .stat-label {
      font-size: 22rpx;
      color: $gray-text;
      margin-top: $spacing-xs;
    }
  }
}

.points-card {
  margin: 0 $spacing-md $spacing-md;
  padding: $spacing-md $spacing-lg;
  background: linear-gradient(135deg, #FFF3E8 0%, #FFE4CC 100%);
  border-radius: $radius-card;
  box-shadow: 0 2rpx 8rpx rgba(255, 138, 61, 0.15);

  .points-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: $spacing-sm;
  }

  .points-title {
    font-size: 26rpx;
    font-weight: bold;
    color: $text-dark;
  }

  .points-value {
    font-size: 40rpx;
    font-weight: 700;
    color: #FF6A1F;
  }

  .points-unit {
    font-size: 20rpx;
    font-weight: 500;
    color: #FF8A3D;
  }

  .points-stats {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: $spacing-lg;
    padding: $spacing-xs 0 $spacing-md;
  }

  .points-stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .points-stat-num {
    font-size: 26rpx;
    font-weight: 600;
    color: $text-dark;
  }

  .points-stat-label {
    font-size: 20rpx;
    color: $gray-text;
    margin-top: 2rpx;
  }

  .points-stat-divider {
    width: 2rpx;
    height: 32rpx;
    background-color: rgba(0, 0, 0, 0.1);
  }

  .points-actions {
    display: flex;
    gap: $spacing-sm;
  }

  .points-btn {
    flex: 1;
    padding: 16rpx 0;
    border-radius: 30rpx;
    text-align: center;
    transition: transform 0.15s;
  }

  .points-btn:active {
    transform: scale(0.96);
  }

  .points-btn-primary {
    background: linear-gradient(135deg, #FF8A3D, #FF6A1F);
    color: #fff;
    box-shadow: 0 4rpx 12rpx rgba(255, 106, 31, 0.3);
  }

  .points-btn-secondary {
    background: rgba(255, 255, 255, 0.9);
    color: $purple-deep;
    border: 2rpx solid rgba(255, 138, 61, 0.3);
  }

  .points-btn-text {
    font-size: 26rpx;
    font-weight: 600;
  }
}

.best-area {
  padding: $spacing-md $spacing-lg;
  margin-top: $spacing-md;
  background-color: #FFFFFF;
  margin: $spacing-md;
  border-radius: $radius-card;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  .section-title {
    font-size: 24rpx;
    font-weight: bold;
    color: $purple-deep;
    margin-bottom: $spacing-md;
    display: block;
  }

  .best-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-md;
  }

  .best-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 120rpx;
    padding: $spacing-sm;
    border-radius: $radius-card;
    transition: all 0.25s;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
    border: 2rpx solid transparent;

    &:active {
      transform: scale(0.96);
      opacity: 0.85;
    }

    .best-level {
      font-size: 26rpx;
      font-weight: bold;
    }

    .best-time {
      font-size: 22rpx;
      color: $purple-deep;
      margin-top: $spacing-xs;
      font-weight: bold;
    }

    .best-no-record {
      font-size: 16rpx;
      color: $gray-text;
      margin-top: $spacing-xs;
    }

    .best-bottom {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      margin-top: $spacing-xs;
      flex-wrap: wrap;
      justify-content: center;
    }

    .best-error {
      font-size: 14rpx;
      color: $red-light;
      opacity: 0.8;
    }

    .best-rating {
      font-size: 16rpx;
      font-weight: bold;
      padding: 4rpx 10rpx;
      border-radius: 8rpx;

      &.rating-S {
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: #8B4513;
        box-shadow: 0 2rpx 8rpx rgba(255, 215, 0, 0.3);
      }

      &.rating-A {
        background: linear-gradient(135deg, #5B9BD5, #3A7BC8);
        color: white;
        box-shadow: 0 2rpx 8rpx rgba(91, 155, 213, 0.3);
      }

      &.rating-B {
        background: linear-gradient(135deg, #C4A830, #A08020);
        color: white;
        box-shadow: 0 2rpx 8rpx rgba(196, 168, 48, 0.3);
      }

      &.rating-C {
        background: linear-gradient(135deg, #D45B5B, #B04040);
        color: white;
        box-shadow: 0 2rpx 8rpx rgba(212, 91, 91, 0.3);
      }

      &.rating-- {
        background-color: transparent;
        color: $gray-text;
        padding: 0;
      }
    }

    .best-hint-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: $spacing-sm;

      .best-hint-icon {
        font-size: 20rpx;
        animation: bounce 1s infinite;
      }

      .best-hint {
        font-size: 12rpx;
        color: $gray-text;
        margin-top: 4rpx;
      }
    }
  }
}


</style>
