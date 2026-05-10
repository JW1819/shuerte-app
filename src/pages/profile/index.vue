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

    <view class="best-area">
      <text class="section-title">各难度历史最佳</text>
      <view class="best-grid">
        <view
          v-for="lv in levels"
          :key="lv"
          class="best-card card"
          :style="{ backgroundColor: levelConfig[lv].bgColor }"
          @tap="handleBestCardTap(lv)"
        >
          <text class="best-level" :style="{ color: levelConfig[lv].textColor }">{{ lv }}×{{ lv }}</text>
          <view v-if="userStore.hasBestRecord(lv)">
            <text class="best-time">{{ formatTime(userStore.getBestTime(lv) || 0) }}秒</text>
            <view class="best-bottom">
              <text class="best-error">{{ userStore.getBestError(lv) }}次错误</text>
              <text class="best-rating" :class="getRatingClass(userStore.getBestTime(lv) || 0, lv)">{{ getRating(userStore.getBestTime(lv) || 0, lv) }}</text>
            </view>
          </view>
          <view v-else>
            <text class="best-time">-</text>
            <text class="best-no-record">暂无记录</text>
          </view>
        </view>
      </view>
    </view>

    <view class="footer-area">
      <view class="footer-item" @tap="goPrivacy">
        <text class="footer-icon">📝</text>
        <text class="footer-text">隐私政策</text>
      </view>
      <view class="footer-item" @tap="goAbout">
        <text class="footer-icon">ℹ️</text>
        <text class="footer-text">关于我们</text>
      </view>
      <view class="footer-item" @tap="goFeedback">
        <text class="footer-icon">💬</text>
        <text class="footer-text">意见反馈</text>
      </view>
    </view>

    <view v-if="showLogoutModal" class="modal-mask" @tap="showLogoutModal = false">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">确定退出登录？</text>
        <text class="modal-desc">退出后本地数据不丢失</text>
        <view class="modal-actions">
          <view class="btn btn-gray" @tap="showLogoutModal = false">
            <text>取消</text>
          </view>
          <view class="btn btn-pink" @tap="confirmLogout">
            <text>确定</text>
          </view>
        </view>
      </view>
    </view>

    <LoginDialog />
  </view>
</template>

<script setup>
import LoginDialog from '@/components/LoginDialog.vue'
import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import { LEVEL_CONFIG, formatTime, formatDuration, getRating as getRatingUtil } from '@/utils/index'
import { useLogin } from '@/utils/useLogin'

const userStore = useUserStore()
const levels = [3, 4, 5, 6, 7, 8]
const levelConfig = LEVEL_CONFIG
const showLogoutModal = ref(false)
const avatarLoadError = ref(false)

function handleAvatarError() {
  avatarLoadError.value = true
  if (userStore.userInfo && userStore.userInfo.avatarUrl) {
    userStore.userInfo.avatarUrl = ''
    userStore.saveToStorage()
  }
}

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

function handleLoginAction() {
  if (userStore.isLogin) {
    showLogoutModal.value = true
  } else {
    openLoginDialog()
  }
}

function confirmLogout() {
  userStore.logout()
  showLogoutModal.value = false
  Taro.showToast({ title: '已退出登录', icon: 'none' })
}

function goPrivacy() {
  Taro.navigateTo({ url: '/pages/privacy/index' })
}

function goAbout() {
  Taro.navigateTo({ url: '/pages/about/index' })
}

function goFeedback() {
  Taro.navigateTo({ url: '/pages/feedback/index' })
}

function getRating(time, level) {
  if (!time || time <= 0) return '-'
  return getRatingUtil(level, time)
}

function getRatingClass(time, level) {
  const rating = getRating(time, level)
  return `rating-${rating}`
}
</script>

<style lang="scss">
@import '@/styles/variables.scss';

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

.footer-area {
  display: flex;
  justify-content: space-around;
  padding: $spacing-xl $spacing-lg;
  padding-bottom: calc(#{$spacing-xl} + constant(safe-area-inset-bottom));
  padding-bottom: calc(#{$spacing-xl} + env(safe-area-inset-bottom));

  .footer-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-xs;
    transition: all 0.2s;

    &:active {
      transform: scale(0.96);
      opacity: 0.7;
    }

    .footer-icon {
      font-size: 32rpx;
    }

    .footer-text {
      font-size: 14rpx;
      color: $gray-text;
    }
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
      margin-top: 20rpx;
    }
  }
}
</style>
