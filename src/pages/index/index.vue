<template>
  <view class="home-page">
    <view class="nav-bar">
      <view class="nav-left"></view>
      <view class="nav-right"></view>
    </view>

    <view class="welcome-area">
      <text class="welcome-title">舒尔特方格</text>
      <text class="welcome-subtitle">专注力训练 · 全年龄段适用</text>
    </view>

    <view class="sign-area">
      <view class="sign-box">
        <view class="sign-item" @tap="handleSignIn">
          <text class="sign-text">{{ userStore.todaySigned ? '今日已打卡' : '打卡' }}</text>
        </view>
        <view class="sign-divider"></view>
        <view class="sign-item">
          <text class="sign-text">连续{{ userStore.continuousSign }}天</text>
        </view>
        <view class="sign-divider"></view>
        <view class="sign-item" @tap="showCalendar = true">
          <text class="sign-text">打卡日历</text>
        </view>
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
        <text class="shortcut-text">排行榜</text>
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

    <LoginDialog />
    <CalendarModal :visible="showCalendar" @close="showCalendar = false" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import LoginDialog from '@/components/LoginDialog.vue'
import CalendarModal from '@/components/CalendarModal.vue'
import { useUserStore } from '@/store/user'
import { LEVEL_CONFIG, formatTime } from '@/utils/index'
import { useLogin } from '@/utils/useLogin'
import Taro from '@tarojs/taro'

const userStore = useUserStore()
const levels = [3, 4, 5, 6, 7, 8]
const levelConfig = LEVEL_CONFIG
const showCalendar = ref(false)

const { openLoginDialog } = useLogin()

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
      font-size: 56rpx;
      font-weight: bold;
      color: $purple-deep;
    }

    .welcome-subtitle {
      font-size: 28rpx;
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
    padding: $spacing-md $spacing-lg;
    display: flex;
    align-items: center;

    .sign-item {
      padding: 0 $spacing-md;
      display: flex;
      align-items: center;
      justify-content: center;

      .sign-text {
        font-size: 28rpx;
        color: $orange-light;
      }
    }

    .sign-divider {
      width: 2rpx;
      height: 32rpx;
      background-color: rgba($orange-light, 0.3);
    }
  }
}

.level-area {
  padding: $spacing-md $spacing-lg;
  display: flex;
  justify-content: center;

  .level-grid {
    display: grid;
    grid-template-columns: 160rpx 160rpx 160rpx;
    gap: $spacing-md;
    justify-content: center;
  }

  .level-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $spacing-md;
    width: 160rpx;
    height: 180rpx;
    border: 2rpx solid transparent;
    border-radius: $radius-card;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &:active {
      transform: scale(0.96);
    }

    .level-id {
      font-size: 36rpx;
      font-weight: bold;
    }

    .level-name {
      font-size: 24rpx;
      color: $gray-text;
      margin-top: $spacing-xs;
    }

    .level-best {
      font-size: 22rpx;
      color: $gray-text;
      margin-top: $spacing-xs;
      white-space: nowrap;
      display: inline-block;
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

</style>
