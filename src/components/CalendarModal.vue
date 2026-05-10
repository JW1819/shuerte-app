<template>
  <view v-if="visible" class="modal-mask" @tap="handleClose">
    <view class="modal-content calendar-modal" @tap.stop>
      <view class="modal-header">
        <text class="modal-title">签到日历</text>
        <view class="modal-close" @tap="handleClose">
          <text>✕</text>
        </view>
      </view>
      <view class="calendar-body">
        <view class="calendar-nav">
          <view class="nav-btn" @tap="prevMonth">
            <text>‹</text>
          </view>
          <text class="calendar-month">{{ currentMonthText }}</text>
          <view class="nav-btn" @tap="nextMonth">
            <text>›</text>
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
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { getToday, getLast30Days } from '@/utils/index'
import Taro from '@tarojs/taro'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const userStore = useUserStore()
const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const today = getToday()
const todayParts = today.split('-')

const currentYear = ref(parseInt(todayParts[0]))
const currentMonth = ref(parseInt(todayParts[1]))

const currentMonthText = computed(() => {
  return `${currentYear.value}年${currentMonth.value}月`
})

const calendarWeeks = computed(() => {
  const totalDays = new Date(currentYear.value, currentMonth.value, 0).getDate()
  const firstDayOfMonth = new Date(currentYear.value, currentMonth.value - 1, 1)
  const startDayOfWeek = firstDayOfMonth.getDay()
  const todayDate = new Date(parseInt(todayParts[0]), parseInt(todayParts[1]) - 1, parseInt(todayParts[2]))
  const signLog = userStore.signLog

  let week = []
  const weeks = []

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
    Taro.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (day.isToday && !userStore.signLog.includes(day.date)) {
    userStore.signIn()
    Taro.showToast({ title: '签到成功', icon: 'none', duration: 3000 })
  }
}

function handleClose() {
  emit('close')
}
</script>

<style lang="scss">
@import '@/styles/variables.scss';

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.calendar-modal {
  width: 90%;
  max-width: 600rpx;
  background-color: white;
  border-radius: $radius-popup;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-lg;
  border-bottom: 1rpx solid #F0F0F0;

  .modal-title {
    font-size: 32rpx;
    font-weight: bold;
    color: $purple-deep;
  }

  .modal-close {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    text {
      font-size: 36rpx;
      color: $gray-text;
    }
  }
}

.calendar-body {
  padding: $spacing-lg;
}

.calendar-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-lg;

  .nav-btn {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    text {
      font-size: 40rpx;
      color: $purple-deep;
    }
  }

  .calendar-month {
    font-size: 30rpx;
    font-weight: bold;
    color: $purple-deep;
  }
}

.calendar-weekdays {
  display: flex;
  justify-content: space-around;
  margin-bottom: $spacing-sm;

  .weekday {
    width: 14.28%;
    text-align: center;
    font-size: 24rpx;
    color: $gray-text;
  }
}

.calendar-grid {
  margin-bottom: $spacing-lg;
}

.calendar-week {
  display: flex;
  justify-content: space-around;
  margin-bottom: $spacing-xs;
}

.calendar-day {
  width: 14.28%;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  position: relative;

  .day-text {
    font-size: 26rpx;
    color: $text-dark;
  }

  &.day-signed {
    background-color: $green-bg;
    .day-text { color: $green-light; }
  }

  &.day-today {
    background-color: $orange-bg;
    .day-text { 
      color: $orange-light;
      font-weight: bold;
    }
  }

  &.day-today-signed {
    background-color: $green-bg;
    .day-text { 
      color: $green-light;
      font-weight: bold;
    }
  }

  &.day-future {
    .day-text { color: $gray-light; }
  }

  &.day-other-month {
    .day-text { color: $gray-light; }
  }
}

.day-checkmark {
  position: absolute;
  bottom: 2rpx;
  font-size: 18rpx;
  color: $green-light;
}

.calendar-stats {
  display: flex;
  justify-content: center;
  gap: $spacing-xl;
  padding-top: $spacing-lg;
  border-top: 1rpx solid #F0F0F0;

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;

    .stat-num {
      font-size: 40rpx;
      font-weight: bold;
      color: $purple-deep;
    }

    .stat-label {
      font-size: 24rpx;
      color: $gray-text;
      margin-top: $spacing-xs;
    }
  }

  .stat-divider {
    width: 2rpx;
    background-color: #F0F0F0;
    margin: 0 $spacing-md;
  }
}
</style>