<template>
  <view class="ranking-page">
    <view class="nav-bar">
      <view class="nav-left" @tap="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="nav-title">全网排行榜</text>
      <view class="nav-right"></view>
    </view>

    <view class="level-tabs">
      <scroll-view scroll-x class="tabs-scroll">
        <view class="tabs-inner">
          <view
            v-for="lv in levels"
            :key="lv"
            class="tab-item"
            :class="{ 'tab-active': currentLevel === lv }"
            :style="currentLevel === lv ? { backgroundColor: levelConfig[lv].bgColor, color: levelConfig[lv].textColor } : {}"
            @tap="switchLevel(lv)"
          >
            <text class="tab-text">{{ lv }}×{{ lv }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="my-rank-area">
      <template v-if="userStore.isLogin">
        <view class="my-rank-box" :style="{ backgroundColor: levelConfig[currentLevel].bgColor }">
          <view class="my-rank-content">
            <view class="my-rank-left">
              <text class="my-rank-label">我的排名</text>
              <text class="my-rank-value" :class="{ 'rank-highlight': myRank > 0 && myRank <= 10 }">
                {{ myRank > 0 ? `第 ${myRank} 名` : '未上榜' }}
              </text>
            </view>
            <view v-if="userStore.getBestTime(currentLevel)" class="my-rank-right">
              <text class="my-rank-time-label">最佳用时</text>
              <text class="my-rank-time-value">{{ formatTime(userStore.getBestTime(currentLevel) || 0) }}秒</text>
            </view>
          </view>
        </view>
      </template>
      <template v-else>
        <view class="guest-rank-box">
          <view class="guest-rank-content">
            <text v-if="userStore.getBestTime(currentLevel)" class="guest-rank-text">
              本地最佳：{{ formatTime(userStore.getBestTime(currentLevel) || 0) }}秒
            </text>
            <text v-else class="guest-rank-text">登录后可参与全网排行</text>
          </view>
          <view class="btn btn-purple btn-login" @tap="openLoginDialog">
            <text>去登录</text>
          </view>
        </view>
      </template>
    </view>

    <view class="list-header">
      <text class="col-rank">排名</text>
      <text class="col-user">用户</text>
      <text class="col-time">最佳用时</text>
    </view>

    <scroll-view 
      class="list-body" 
      scroll-y
      :style="{ height: listBodyHeight }"
      refresher-enabled
      :refresher-triggered="isRefreshing"
      refresher-default-style="none"
      @refresherrefresh="onRefresh"
    >
      <view v-if="isLoading" class="loading-state">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>
      <view v-else-if="rankingList.length === 0" class="empty-state">
        <text class="empty-text">暂无数据，快来成为第一个上榜的人吧～</text>
      </view>
      <view
        v-for="(item, idx) in rankingList"
        :key="idx"
        class="list-row"
        :class="{ 'row-top-three': idx < 3 }"
        :style="{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FFF8F0' }"
      >
        <view class="col-rank rank-wrap">
          <view v-if="idx < 3" class="rank-medal" :class="`medal-${idx + 1}`">
            <text class="medal-icon">{{ getMedalIcon(idx + 1) }}</text>
          </view>
          <text v-else class="rank-num" :style="{ color: getRankColor(idx + 1) }">{{ idx + 1 }}</text>
        </view>
        <view class="col-user user-info">
          <view class="user-avatar-small">
            <text>{{ item.avatar || '👤' }}</text>
          </view>
          <text class="user-name">{{ item.nickName }}</text>
        </view>
        <text class="col-time time-text">{{ formatTime(item.bestTime) }}秒</text>
      </view>
      <view class="list-footer">
        <text class="footer-text">已加载全部数据</text>
      </view>
    </scroll-view>

    <view v-if="showLoginDialog" class="modal-mask" @tap="cancelLogin">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">登录授权</text>
        <view class="login-form">
          <view class="avatar-section">
            <text class="form-label">选择头像</text>
            <view class="avatar-btn" @tap="switchAvatar">
              <text class="avatar-emoji">{{ avatarEmojis[currentAvatarIndex] }}</text>
            </view>
            <text class="avatar-hint">点击切换头像</text>
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
          <view class="btn btn-purple" @tap="handleLoginConfirm">
            <text>确认登录</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import { LEVEL_CONFIG, formatTime } from '@/utils/index'
import { useLogin } from '@/utils/useLogin'

const router = useRouter()
const userStore = useUserStore()

const levels = [3, 4, 5, 6, 7, 8]
const levelConfig = LEVEL_CONFIG
const currentLevel = ref(3)
const rankingList = ref([])
const myRank = ref(0)
const avatarEmojis = ['👤', '👩', '👨', '👧', '👦', '👩‍🦰', '👨‍🦰', '👩‍🦳', '👨‍🦳', '🧑']
const currentAvatarIndex = ref(0)
const isLoading = ref(false)
const isRefreshing = ref(false)

const listBodyHeight = computed(() => {
  return 'calc(100vh - 420rpx)'
})

const {
  showLoginDialog,
  loginNickName,
  openLoginDialog,
  onNicknameInput,
  confirmLogin,
  cancelLogin
} = useLogin()

function switchAvatar() {
  currentAvatarIndex.value = (currentAvatarIndex.value + 1) % avatarEmojis.length
}

function handleLoginConfirm() {
  if (confirmLogin(avatarEmojis[currentAvatarIndex.value])) {
    loadRanking()
  }
}

function switchLevel(lv) {
  currentLevel.value = lv
  loadRanking()
}

function getRankColor(rank) {
  if (rank === 1) return '#D4A840'
  if (rank === 2) return '#A8A8B0'
  if (rank === 3) return '#C08050'
  return '#4A4A5A'
}

function getMedalIcon(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return ''
}

function loadRanking() {
  isLoading.value = true
  // TODO: 接入微信云开发数据库后替换为真实数据
  // wx.cloud.database().collection('score')
  //   .where({ level: currentLevel.value })
  //   .orderBy('bestTime', 'asc')
  //   .limit(100)
  //   .get()
  setTimeout(() => {
    const mockData = []
    const baseTimes = { 3: 3000, 4: 6000, 5: 12000, 6: 20000, 7: 35000, 8: 50000 }
    const base = baseTimes[currentLevel.value] || 10000
    const avatars = ['👤', '👩', '👨', '👧', '👦', '👩‍🦰', '👨‍🦰', '👩‍🦳', '👨‍🦳', '🧑', '👨‍💼', '👩‍💼', '👨‍🔧', '👩‍🔧', '👨‍🏫', '👩‍🏫', '👨‍⚕️', '👩‍⚕️', '👨‍🎨', '👩‍🎨']
    for (let i = 0; i < 20; i++) {
      mockData.push({
        nickName: `用户${i + 1}`,
        bestTime: base + i * 800 + Math.floor(Math.random() * 500),
        errorCount: Math.floor(Math.random() * 3),
        avatar: avatars[i % avatars.length]
      })
    }
    mockData.sort((a, b) => a.bestTime - b.bestTime)
    rankingList.value = mockData

    if (userStore.isLogin && userStore.getBestTime(currentLevel.value)) {
      const myTime = userStore.getBestTime(currentLevel.value)
      const rank = mockData.filter(d => d.bestTime < myTime).length + 1
      myRank.value = rank <= 100 ? rank : 0
    } else {
      myRank.value = 0
    }
    isLoading.value = false
    isRefreshing.value = false
  }, 300)
}

function goBack() {
  Taro.navigateBack()
}

function onRefresh() {
  isRefreshing.value = true
  loadRanking()
}

onMounted(() => {
  if (router.params.level) {
    currentLevel.value = Number(router.params.level) || 3
  }
  loadRanking()
})
</script>

<style lang="scss">
@import '@/styles/variables.scss';

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8rpx); }
}

.ranking-page {
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
      font-size: 40rpx;
      color: $gray-light;
    }
  }

  .nav-title {
    font-size: 28rpx;
    font-weight: bold;
    color: $purple-deep;
  }

  .nav-right {
    width: 40rpx;
  }
}

.level-tabs {
  padding: 16rpx 32rpx;

  .tabs-scroll {
    white-space: nowrap;
  }

  .tabs-inner {
    display: flex;
    gap: 16rpx;
    justify-content: center;
  }

  .tab-item {
    border-radius: $radius-btn;
    padding: 12rpx 28rpx;
    background-color: #F0F0F0;
    flex-shrink: 0;

    .tab-text {
      font-size: 22rpx;
      color: $gray-text;
    }

    &.tab-active {
      box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.06);

      .tab-text {
        font-weight: bold;
        color: inherit;
      }
    }
  }
}

.list-header {
  display: flex;
  align-items: center;
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid #F0E8E0;

  text {
    font-size: 22rpx;
    color: $gray-text;
    font-weight: bold;
  }

  .col-rank { width: 20%; }
  .col-user { width: 40%; }
  .col-time { width: 40%; text-align: center; }
}

.list-body {
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80rpx 32rpx;
    gap: 16rpx;

    .loading-spinner {
      width: 40rpx;
      height: 40rpx;
      border: 4rpx solid #F0E8E0;
      border-top-color: $purple-light;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    .loading-text {
      font-size: 22rpx;
      color: $gray-text;
    }
  }

  .empty-state {
    display: flex;
    justify-content: center;
    padding: 80rpx 32rpx;

    .empty-text {
      font-size: 24rpx;
      color: $gray-text;
    }
  }

  .list-footer {
    padding: 20rpx;
    text-align: center;

    .footer-text {
      font-size: 20rpx;
      color: $gray-light;
    }
  }
}

.list-row {
    display: flex;
    align-items: center;
    padding: 16rpx 32rpx;
    height: 80rpx;

    .col-rank { width: 20%; }
    .col-user { width: 40%; }
    .col-time { width: 40%; text-align: center; }

    .rank-wrap {
      display: flex;
      align-items: center;
    }

    .rank-num {
      font-size: 26rpx;
      font-weight: bold;
    }

    .rank-medal {
      width: 40rpx;
      height: 40rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: bounce 0.5s ease-out;

      .medal-icon {
        font-size: 32rpx;
      }
    }

    &.row-top-three {
      background: linear-gradient(135deg, #FFF9F0, #FFFFFF) !important;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12rpx;

      .user-avatar-small {
        width: 40rpx;
        height: 40rpx;
        border-radius: 50%;
        background-color: #F0F0F0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22rpx;
      }

      .user-name {
        font-size: 24rpx;
        color: $text-dark;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 140rpx;
      }
    }

    .time-text {
      font-size: 24rpx;
      color: $purple-deep;
    }
  }

  .list-footer {
    padding: 20rpx;
    text-align: center;

    .footer-text {
      font-size: 20rpx;
      color: $gray-light;
    }
  }
}

.my-rank-area {
  padding: 16rpx 32rpx;
  background-color: #FFFFFF;
  margin: 0 24rpx;
  border-radius: $radius-card;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  .my-rank-box {
    border-radius: $radius-btn;
    padding: 16rpx 20rpx;
    background: linear-gradient(135deg, #E8E0F0, #F0E8F8);

    .my-rank-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .my-rank-left {
      display: flex;
      flex-direction: column;

      .my-rank-label {
        font-size: 18rpx;
        color: $gray-text;
        margin-bottom: 4rpx;
      }

      .my-rank-value {
        font-size: 28rpx;
        font-weight: bold;
        color: $purple-deep;

        &.rank-highlight {
          color: #D4A840;
          text-shadow: 0 2rpx 4rpx rgba(212, 168, 64, 0.3);
        }
      }
    }

    .my-rank-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;

      .my-rank-time-label {
        font-size: 18rpx;
        color: $gray-text;
        margin-bottom: 4rpx;
      }

      .my-rank-time-value {
        font-size: 24rpx;
        font-weight: bold;
        color: $purple-deep;
      }
    }
  }

  .guest-rank-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16rpx 20rpx;
    background-color: #F8F8F8;
    border-radius: $radius-btn;

    .guest-rank-content {
      display: flex;
      flex-direction: column;

      .guest-rank-text {
        font-size: 22rpx;
        color: $gray-text;
      }
    }

    .btn-login {
      padding: 12rpx 24rpx;
      font-size: 22rpx;
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

    .modal-actions {
      display: flex;
      gap: 24rpx;
      margin-top: 20rpx;
    }
  }
}
</style>
