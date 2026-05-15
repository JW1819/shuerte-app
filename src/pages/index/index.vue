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
          v-for="(level, idx) in levels"
          :key="level"
          class="level-card card"
          :style="{ 
            backgroundColor: levelConfig[level].bgColor, 
            borderColor: levelConfig[level].borderColor,
            '--delay': (idx * 0.3) + 's'
          }"
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
import { ref, onMounted } from 'vue'
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

onMounted(() => {
  userStore.initStore()
})

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
</script>

<style lang="scss">
@import '@/styles/variables.scss';

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-6rpx) rotate(0.8deg);
  }
  75% {
    transform: translateY(6rpx) rotate(-0.8deg);
  }
}

.home-page {
  min-height: 100vh;
  background-color: $bg-color;
  display: flex;
  flex-direction: column;
  justify-content: start;
  box-sizing: border-box;
}

.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10rpx $spacing-lg;
  height: 32rpx;
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
    padding: 0 0 $spacing-md; 
    margin-top: -10rpx;

    .welcome-title {
      font-size: 56rpx;
      font-weight: bold;
      color: $purple-deep;
    }

    .welcome-subtitle {
      font-size: 28rpx;
      color: $purple-light;
      margin-top: $spacing-xs;
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

  .level-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-md;
    max-width: 420rpx;
    margin: 0 auto;
  }

  .level-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $spacing-md $spacing-sm;
    aspect-ratio: 5 / 4;
    border: 2rpx solid transparent;
    border-radius: $radius-card;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-sizing: border-box;
    animation: float 4s ease-in-out infinite;
    animation-delay: calc(var(--delay, 0s));

    &:active {
      transform: scale(0.95);
      box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
    }

    .level-id {
      font-size: 36rpx;
      font-weight: 700;
      letter-spacing: -1rpx;
    }

    .level-name {
      font-size: 22rpx;
      color: $gray-text;
      margin-top: $spacing-xs;
    }

    .level-best {
      font-size: 20rpx;
      color: $gray-text;
      margin-top: $spacing-xs;
      white-space: nowrap;
      display: inline-block;
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
  background-color: #FFFFFF;
  border-top: 1rpx solid #F0E8E0;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.04);

  .guest-text {
    font-size: 24rpx;
    color: $gray-text;
    flex: 1;
  }

  .guest-btn {
    margin-left: $spacing-md;

    .guest-btn-text {
      font-size: 24rpx;
      color: white;
    }
  }
}

</style>
