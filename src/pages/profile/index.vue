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

    <view class="calendar-area">
      <view class="calendar-header">
        <text class="section-title">签到日历</text>
        <view class="calendar-nav">
          <view class="nav-btn" @tap="prevMonth">
            <text>‹</text>
          </view>
          <text class="calendar-month">{{ currentMonthText }}</text>
          <view class="nav-btn" @tap="nextMonth">
            <text>›</text>
          </view>
        </view>
      </view>
      <view class="calendar-weekdays">
        <text v-for="day in weekdays" :key="day" class="weekday">{{ day }}</text>
      </view>
      <view class="calendar-grid">
        <view
          v-for="(week, weekIdx) in calendarWeeks"
          :key="weekIdx"
          class="calendar-week"
        >
          <view
            v-for="day in week"
            :key="day.date"
            class="calendar-day"
            :class="{
              'day-signed': day.date && userStore.signLog.includes(day.date),
              'day-today': day.isToday && !userStore.signLog.includes(day.date),
              'day-today-signed': day.isToday && userStore.signLog.includes(day.date),
              'day-future': day.isFuture,
              'day-other-month': !day.isCurrentMonth
            }"
            @tap="handleCalendarTap(day)"
          >
            <text v-if="day.date" class="day-text">{{ day.dayNum }}</text>
            <view v-if="day.date && userStore.signLog.includes(day.date)" class="day-checkmark">✓</view>
          </view>
        </view>
      </view>
      <view class="calendar-stats">
        <view class="stat-item">
          <text class="stat-num">{{ signedCount }}</text>
          <text class="stat-label">本月签到</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-num">{{ userStore.continuousSign }}</text>
          <text class="stat-label">连续签到</text>
        </view>
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

    <view v-if="showLoginDialog" class="modal-mask" @tap="cancelLogin">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">登录授权</text>
        <view class="login-form">
          <view class="avatar-section">
            <text class="form-label">选择头像</text>
            <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
              <image v-if="loginAvatarUrl" class="avatar-preview" :src="loginAvatarUrl" mode="aspectFill" />
              <text v-else class="avatar-placeholder">👤</text>
            </button>
            <text class="avatar-hint">点击选择微信头像</text>
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
          <view 
            class="btn" 
            :class="loginNickName.trim() ? 'btn-purple' : 'btn-disabled'" 
            @tap="confirmLogin"
          >
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
const avatarLoadError = ref(false)

function handleAvatarError() {
  avatarLoadError.value = true
  if (userStore.userInfo && userStore.userInfo.avatarUrl) {
    userStore.userInfo.avatarUrl = ''
    userStore.saveToStorage()
  }
}

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const today = getToday()
const todayParts = today.split('-')
const currentYear = ref(parseInt(todayParts[0]))
const currentMonth = ref(parseInt(todayParts[1]))

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

function isUrl(str) {
  if (typeof str !== 'string') return false
  // 检查是否是 http/https URL 或者微信文件 URL
  return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('wxfile://')
}

const currentMonthText = computed(() => {
  return `${currentYear.value}年${currentMonth.value}月`
})

const calendarWeeks = computed(() => {
  const weeks = []
  const firstDay = new Date(currentYear.value, currentMonth.value - 1, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value, 0)
  const startDayOfWeek = firstDay.getDay()
  const totalDays = lastDay.getDate()
  const todayDate = new Date(parseInt(todayParts[0]), parseInt(todayParts[1]) - 1, parseInt(todayParts[2]))
  const signLog = userStore.signLog

  let week = []
  
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(currentYear.value, currentMonth.value - 1, -i)
    week.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      dayNum: d.getDate(),
      isToday: false,
      isFuture: false,
      isCurrentMonth: false
    })
  }

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(currentYear.value, currentMonth.value - 1, day)
    const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isToday = d.toDateString() === todayDate.toDateString()
    const isFuture = d > todayDate
    
    week.push({
      date: dateStr,
      dayNum: day,
      isToday,
      isFuture,
      isCurrentMonth: true
    })

    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }

  if (week.length > 0) {
    while (week.length < 7) {
      const d = new Date(currentYear.value, currentMonth.value, week.length)
      week.push({
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        dayNum: d.getDate(),
        isToday: false,
        isFuture: false,
        isCurrentMonth: false
      })
    }
    weeks.push(week)
  }

  return weeks
})

const signedCount = computed(() => {
  const year = currentYear.value
  const month = String(currentMonth.value).padStart(2, '0')
  return userStore.signLog.filter(date => date.startsWith(`${year}-${month}`)).length
})

function prevMonth() {
  if (currentMonth.value === 1) {
    currentYear.value -= 1
    currentMonth.value = 12
  } else {
    currentMonth.value -= 1
  }
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentYear.value += 1
    currentMonth.value = 1
  } else {
    currentMonth.value += 1
  }
}

function handleCalendarTap(day) {
  if (!userStore.isLogin) {
    openLoginDialog()
    return
  }
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

.calendar-area {
  padding: $spacing-md $spacing-lg;
  background-color: #FFFFFF;
  margin: 0 $spacing-md $spacing-md;
  border-radius: $radius-card;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-sm 0;
  }

  .section-title {
    font-size: 30rpx;
    font-weight: bold;
    color: $purple-deep;
    display: block;
  }

  .calendar-nav {
    display: flex;
    align-items: center;
    gap: $spacing-md;

    .nav-btn {
      width: 44rpx;
      height: 44rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background-color: $purple-bg;
      transition: all 0.2s;

      &:active {
        transform: scale(0.9);
        background-color: $purple-light;
      }

      text {
        font-size: 32rpx;
        color: $purple-deep;
        line-height: 1;
      }
    }

    .calendar-month {
      font-size: 28rpx;
      color: $text-dark;
      font-weight: bold;
      min-width: 160rpx;
      text-align: center;
    }
  }

  .calendar-weekdays {
    display: flex;
    padding: $spacing-sm 0;
    border-bottom: 1rpx solid #F0E8E0;

    .weekday {
      flex: 1;
      text-align: center;
      font-size: 26rpx;
      color: $gray-text;
      font-weight: bold;
    }
  }

  .calendar-grid {
    padding: $spacing-sm 0;

    .calendar-week {
      display: flex;

      .calendar-day {
        flex: 1;
        height: 80rpx;
        border-radius: $radius-btn;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: transparent;
        border: 2rpx solid transparent;
        transition: all 0.2s ease;
        position: relative;

        .day-text {
          font-size: 28rpx;
          color: $text-dark;
        }

        .day-checkmark {
          position: absolute;
          bottom: 4rpx;
          right: 8rpx;
          font-size: 18rpx;
          color: white;
          font-weight: bold;
        }

        &.day-signed {
          background: linear-gradient(135deg, $orange-bg, #FF9A6B);
          border-color: $orange-bg;
          animation: signSuccess 0.6s ease-out;

          .day-text {
            color: white;
            font-weight: bold;
          }
        }

        &.day-today {
          background-color: $purple-bg;
          border-color: $purple-light;

          .day-text {
            color: white;
            font-weight: bold;
          }
        }

        &.day-today-signed {
          background: linear-gradient(135deg, $orange-bg, #FF9A6B);
          border-color: $orange-bg;
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

        &.day-other-month {
          opacity: 0.3;

          .day-text {
            color: $gray-light;
          }
        }

        &:active:not(.day-signed):not(.day-future):not(.day-other-month) {
          transform: scale(0.95);
          background-color: $purple-bg;
          border-color: $purple-bg;

          .day-text {
            color: white;
          }
        }
      }
    }
  }

  .calendar-stats {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: $spacing-lg;
    padding: $spacing-md 0 $spacing-sm;
    margin-top: $spacing-sm;
    border-top: 1rpx solid #F0E8E0;

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;

      .stat-num {
        font-size: 32rpx;
        font-weight: bold;
        color: $purple-deep;
      }

      .stat-label {
        font-size: 18rpx;
        color: $gray-text;
        margin-top: 4rpx;
      }
    }

    .stat-divider {
      width: 1rpx;
      height: 40rpx;
      background-color: #F0E8E0;
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

    .login-form {
      width: 100%;

      .avatar-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 32rpx;

        .form-label {
          font-size: 14rpx;
          color: $gray-text;
          margin-bottom: 16rpx;
        }

        .avatar-btn {
          width: 100rpx;
          height: 100rpx;
          border-radius: 50%;
          background: linear-gradient(135deg, #E8E0F0, #F0E8F8);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 4rpx solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
          transition: all 0.2s;

          &:active {
            transform: scale(0.95);
          }

          .avatar-emoji {
            font-size: 48rpx;
          }
        }

        .avatar-hint {
          font-size: 12rpx;
          color: $gray-light;
          margin-top: 8rpx;
        }
      }

      .nickname-section {
        display: flex;
        flex-direction: column;

        .form-label {
          font-size: 14rpx;
          color: $gray-text;
          margin-bottom: 12rpx;
        }

        .nickname-input {
          width: 100%;
          height: 80rpx;
          border-radius: $radius-btn;
          background-color: #F8F8F8;
          padding: 0 24rpx;
          font-size: 16rpx;
          border: 2rpx solid #F0E8E0;
          box-sizing: border-box;

          &:focus {
            border-color: $purple-light;
            background-color: #FFFFFF;
          }
        }
      }
    }
  }
}
</style>
