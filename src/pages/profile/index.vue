<template>
  <view class="profile-page">
    <view class="user-header">
      <view class="user-info">
        <view class="avatar-wrap">
          <image
            v-if="userStore.isLogin && userStore.userInfo.avatarUrl"
            class="avatar"
            :src="userStore.userInfo.avatarUrl"
            mode="aspectFill"
          />
          <view v-else class="avatar avatar-default">
            <text>👤</text>
          </view>
        </view>
        <view class="user-detail">
          <text class="nickname">{{ userStore.userInfo.nickName }}</text>
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

    <view class="calendar-area">
      <view class="calendar-header">
        <text class="section-title">签到日历</text>
        <text class="calendar-month">{{ currentMonth }}</text>
      </view>
      <scroll-view class="calendar-scroll" scroll-x>
        <view class="calendar-grid">
          <view
            v-for="day in last30Days"
            :key="day.date"
            class="calendar-day"
            :class="{
              'day-signed': userStore.signLog.includes(day.date),
              'day-today': day.isToday && !userStore.signLog.includes(day.date),
              'day-today-signed': day.isToday && userStore.signLog.includes(day.date),
              'day-future': day.isFuture
            }"
            @tap="handleCalendarTap(day)"
          >
            <text class="day-text">{{ day.dayNum }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="best-area">
      <text class="section-title">各难度历史最佳</text>
      <scroll-view class="best-scroll" scroll-x>
        <view
          v-for="lv in levels"
          :key="lv"
          class="best-card card"
          :style="{ backgroundColor: levelConfig[lv].bgColor }"
          @tap="handleBestCardTap(lv)"
        >
          <text class="best-level" :style="{ color: levelConfig[lv].textColor }">{{ lv }}×{{ lv }}</text>
          <template v-if="userStore.getBestTime(lv)">
            <text class="best-time">{{ formatTime(userStore.getBestTime(lv) || 0) }}秒</text>
            <view class="best-bottom">
              <text class="best-error">{{ userStore.getBestError(lv) }}次错误</text>
              <text class="best-rating" :class="getRatingClass(userStore.getBestTime(lv) || 0, lv)">{{ getRating(userStore.getBestTime(lv) || 0, lv) }}</text>
            </view>
          </template>
          <view v-else>
            <text class="best-time">-</text>
            <text class="best-no-record">暂无记录</text>
          </view>
        </view>
      </scroll-view>
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
import { ref, computed } from 'vue'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import { LEVEL_CONFIG, formatTime, formatDuration, getToday, getLast30Days, getRating as getRatingUtil } from '@/utils/index'
import { useLogin } from '@/utils/useLogin'

const userStore = useUserStore()
const levels = [3, 4, 5, 6, 7, 8]
const levelConfig = LEVEL_CONFIG
const showLogoutModal = ref(false)

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

const today = getToday()
const allDays = getLast30Days()

const currentMonth = computed(() => {
  const todayParts = today.split('-')
  return `${todayParts[0]}年${parseInt(todayParts[1])}月`
})

const last30Days = computed(() => {
  return allDays.map(date => {
    const parts = date.split('-')
    return {
      date,
      dayNum: parseInt(parts[2]),
      isToday: date === today,
      isFuture: date > today
    }
  })
})

function handleCalendarTap(day) {
  if (day.isToday && !userStore.signLog.includes(day.date)) {
    userStore.signIn()
    Taro.showToast({ title: '签到成功', icon: 'none', duration: 3000 })
  }
}

function handleBestCardTap(lv) {
  if (!userStore.isLogin) {
    openLoginDialog()
    return
  }
  Taro.showToast({
    title: `${lv}×${lv} 难度`,
    icon: 'none'
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

        &.avatar-default {
          background-color: rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 44rpx;
        }
      }
    }

    .user-detail {
      display: flex;
      flex-direction: column;

      .nickname {
        font-size: 18rpx;
        font-weight: bold;
        color: $purple-deep;
      }

      .user-status {
        font-size: 12rpx;
        color: $purple-light;
        margin-top: $spacing-xs;
      }
    }
  }

  .login-btn {
    padding: $spacing-xs $spacing-md;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: $radius-btn;
    transition: all 0.2s;

    &:active {
      transform: scale(0.96);
    }

    .login-text {
      font-size: 14rpx;
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
      font-size: 24rpx;
      font-weight: bold;
    }

    .stat-label {
      font-size: 14rpx;
      color: $gray-text;
      margin-top: $spacing-xs;
    }
  }
}

.calendar-area {
  padding: $spacing-md $spacing-lg;

  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-md;
  }

  .section-title {
    font-size: 16rpx;
    font-weight: bold;
    color: $purple-deep;
    display: block;
  }

  .calendar-month {
    font-size: 14rpx;
    color: $gray-text;
  }

  .calendar-scroll {
    white-space: nowrap;
  }

  .calendar-grid {
    display: flex;
    gap: $spacing-xs;

    .calendar-day {
      width: 40rpx;
      height: 40rpx;
      border-radius: $radius-btn;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #F0F0F0;
      flex-shrink: 0;
      transition: all 0.2s ease;

      .day-text {
        font-size: 14rpx;
        color: $gray-text;
      }

      &.day-signed {
        background-color: $orange-bg;
        animation: signSuccess 0.6s ease-out;

        .day-text {
          color: white;
        }
      }

      &.day-today {
        background-color: $purple-bg;
        border: 2rpx solid $purple-light;

        .day-text {
          color: white;
          font-weight: bold;
        }
      }

      &.day-today-signed {
        background-color: $orange-bg;
        border: 2rpx solid $orange-bg;
        animation: signSuccess 0.6s ease-out;

        .day-text {
          color: white;
          font-weight: bold;
        }
      }

      &.day-future {
        opacity: 0.4;
        pointer-events: none;

        .day-text {
          color: $gray-light;
        }
      }

      &:active:not(.day-signed):not(.day-future) {
        transform: scale(0.95);
        background-color: $purple-bg;
      }
    }
  }
}

.best-area {
  padding: $spacing-md $spacing-lg;

  .section-title {
    font-size: 16rpx;
    font-weight: bold;
    color: $purple-deep;
    margin-bottom: $spacing-md;
    display: block;
  }

  .best-scroll {
    white-space: nowrap;
  }

  .best-card {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 120rpx;
    height: 80rpx;
    padding: $spacing-md $spacing-sm;
    margin-right: $spacing-md;
    flex-shrink: 0;
    transition: all 0.2s;

    &:active {
      transform: scale(0.96);
      opacity: 0.85;
    }

    .best-level {
      font-size: 16rpx;
      font-weight: bold;
    }

    .best-time {
      font-size: 14rpx;
      color: $purple-deep;
      margin-top: $spacing-xs;
      font-weight: bold;
    }

    .best-no-record {
      font-size: 12rpx;
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
      font-size: 12rpx;
      color: $red-light;
    }

    .best-rating {
      font-size: 14rpx;
      font-weight: bold;
      padding: 2rpx 8rpx;
      border-radius: 6rpx;

      &.rating-S {
        background-color: #FFD700;
        color: #8B4513;
      }

      &.rating-A {
        background-color: #5B9BD5;
        color: white;
      }

      &.rating-B {
        background-color: #C4A830;
        color: white;
      }

      &.rating-C {
        background-color: #D45B5B;
        color: white;
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
