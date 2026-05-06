<template>
  <view class="home-page">
    <view class="nav-bar">
      <view class="nav-left"></view>
      <view class="nav-right" @tap="goProfile">
        <text class="nav-icon">👤</text>
      </view>
    </view>

    <view class="welcome-area">
      <text class="welcome-title">舒尔特方格</text>
      <text class="welcome-subtitle">专注力训练 · 全年龄段适用</text>
    </view>

    <view class="sign-area" @tap="handleSignIn">
      <view class="sign-box">
        <text class="sign-text">
          连续签到 <text class="sign-days">{{ userStore.continuousSign }}</text> 天 | {{ userStore.todaySigned ? '今日已打卡' : '今日未打卡' }}
        </text>
      </view>
    </view>

    <view class="level-area">
      <view class="level-grid">
        <view
          v-for="level in levels"
          :key="level"
          class="level-card card"
          :style="{ backgroundColor: levelConfig[level].bgColor, borderColor: levelConfig[level].borderColor }"
          @tap="goTraining(level)"
        >
          <text class="level-id" :style="{ color: levelConfig[level].textColor }">{{ level }}×{{ level }}</text>
          <text class="level-name">{{ levelConfig[level].name }}</text>
          <text v-if="userStore.getBestTime(level)" class="level-best">
            最佳 {{ formatTime(userStore.getBestTime(level) || 0) }}秒
          </text>
        </view>
      </view>
    </view>

    <view class="shortcut-area">
      <view class="shortcut-item" @tap="goRanking">
        <text class="shortcut-icon">🏆</text>
        <text class="shortcut-text">排行榜1</text>
      </view>
      <view class="shortcut-item" @tap="goProfile">
        <text class="shortcut-icon">📋</text>
        <text class="shortcut-text">我的记录</text>
      </view>
    </view>

    <view class="guest-bar" v-if="!userStore.isLogin">
      <text class="guest-text">游客模式可正常训练，登录后同步成绩、参与排行</text>
      <view class="guest-btn btn btn-purple" @tap="openLoginDialog">
        <text class="guest-btn-text">去登录</text>
      </view>
    </view>

    <view v-if="showLoginDialog" class="modal-mask" @tap="cancelLogin">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">登录授权</text>
        <view class="login-form">
          <view class="avatar-section">
            <text class="form-label">选择头像</text>
            <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
              <image v-if="loginAvatarUrl" class="avatar-preview" :src="loginAvatarUrl" mode="aspectFill" />
              <view v-else class="avatar-placeholder">
                <text>👤</text>
              </view>
            </button>
          </view>
          <view class="nickname-section">
            <text class="form-label">输入昵称</text>
            <input class="nickname-input" type="nickname" :value="loginNickName" @blur="onNicknameInput" placeholder="请输入昵称" />
          </view>
        </view>
        <view class="modal-actions">
          <view class="btn btn-gray" @tap="cancelLogin">
            <text>取消</text>
          </view>
          <view class="btn btn-purple" @tap="confirmLogin">
            <text>确认登录</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { useUserStore } from '@/store/user'
import { LEVEL_CONFIG, formatTime } from '@/utils/index'
import { useLogin } from '@/utils/useLogin'
import Taro from '@tarojs/taro'

const userStore = useUserStore()
const levels = [3, 4, 5, 6, 7, 8]
const levelConfig = LEVEL_CONFIG

const {
  showLoginDialog,
  loginAvatarUrl,
  loginNickName,
  openLoginDialog,
  onChooseAvatar,
  onNicknameInput,
  confirmLogin,
  cancelLogin
} = useLogin()

function handleSignIn() {
  if (userStore.todaySigned) {
    Taro.showToast({ title: '今日已打卡', icon: 'none', duration: 3000 })
    return
  }
  userStore.signIn()
  Taro.showToast({ title: '签到成功，连续签到+1', icon: 'none', duration: 3000 })
}

function goTraining(level) {
  Taro.navigateTo({ url: `/pages/training/index?level=${level}` })
}

function goRanking() {
  Taro.navigateTo({ url: '/pages/ranking/index' })
}

function goProfile() {
  Taro.navigateTo({ url: '/pages/profile/index' })
}
</script>

<style lang="scss">
@import '@/styles/variables.scss';

.home-page {
  min-height: 100vh;
  background-color: $bg-color;
  padding-bottom: 140rpx;
}

.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx $spacing-lg;
  height: 44rpx;
}

.nav-right {
  padding: 10rpx;
  .nav-icon {
    font-size: 36rpx;
  }
}

.welcome-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-xl 0 $spacing-lg;

  .welcome-title {
    font-size: 40rpx;
    font-weight: bold;
    color: $purple-deep;
  }

  .welcome-subtitle {
    font-size: 24rpx;
    color: $purple-light;
    margin-top: $spacing-sm;
  }
}

.sign-area {
  display: flex;
  justify-content: center;
  padding: $spacing-md 0;
  margin-bottom: $spacing-md;

  .sign-box {
    background-color: $orange-bg;
    border-radius: $radius-btn;
    padding: $spacing-md $spacing-xl;

    .sign-text {
      font-size: 24rpx;
      color: $orange-light;

      .sign-days {
        font-weight: bold;
        font-size: 28rpx;
      }
    }
  }
}

.level-area {
  padding: $spacing-md $spacing-lg;
  display: flex;
  justify-content: center;

  .level-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-md;
    width: 100%;
    max-width: 560rpx;
  }

  .level-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $spacing-lg $spacing-md;
    min-height: 140rpx;
    border: 2rpx solid transparent;
    border-radius: $radius-card;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &:active {
      transform: scale(0.96);
    }

    .level-id {
      font-size: 32rpx;
      font-weight: bold;
    }

    .level-name {
      font-size: 20rpx;
      color: $gray-text;
      margin-top: $spacing-xs;
    }

    .level-best {
      font-size: 18rpx;
      color: $gray-text;
      margin-top: $spacing-xs;
    }
  }
}

.shortcut-area {
  display: flex;
  justify-content: center;
  gap: 100rpx;
  padding: $spacing-xl 0;

  .shortcut-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: $spacing-md;
    transition: transform 0.2s;

    &:active {
      transform: scale(0.96);
    }

    .shortcut-icon {
      font-size: 40rpx;
    }

    .shortcut-text {
      font-size: 14rpx;
      color: $text-dark;
      margin-top: $spacing-sm;
    }
  }
}

.guest-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md $spacing-lg;
  padding-bottom: calc(#{$spacing-md} + constant(safe-area-inset-bottom));
  padding-bottom: calc(#{$spacing-md} + env(safe-area-inset-bottom));
  background-color: $bg-color;
  border-top: 1rpx solid #F0E8E0;

  .guest-text {
    font-size: 12rpx;
    color: $gray-text;
    flex: 1;
  }

  .guest-btn {
    margin-left: $spacing-md;

    .guest-btn-text {
      font-size: 12rpx;
      color: white;
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
      margin-bottom: 20rpx;
    }

    .modal-actions {
      display: flex;
      gap: 24rpx;
      margin-top: 20rpx;
    }
  }
}
</style>
