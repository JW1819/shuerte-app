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

    <view class="list-header">
      <text class="col-rank">排名</text>
      <text class="col-user">用户</text>
      <text class="col-time">最佳用时</text>
    </view>

    <scroll-view class="list-body" scroll-y>
      <view v-if="rankingList.length === 0" class="empty-state">
        <text class="empty-text">暂无数据，快来成为第一个上榜的人吧～</text>
      </view>
      <view
        v-for="(item, idx) in rankingList"
        :key="idx"
        class="list-row"
        :style="{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FFF8F0' }"
      >
        <text class="col-rank rank-num" :style="{ color: getRankColor(idx + 1) }">{{ idx + 1 }}</text>
        <view class="col-user user-info">
          <view class="user-avatar-small">
            <text>👤</text>
          </view>
          <text class="user-name">{{ item.nickName }}</text>
        </view>
        <text class="col-time time-text">{{ formatTime(item.bestTime) }}秒</text>
      </view>
    </scroll-view>

    <view class="my-rank-area">
      <template v-if="userStore.isLogin">
        <view class="my-rank-box" :style="{ backgroundColor: levelConfig[currentLevel].bgColor }">
          <text class="my-rank-text">我的排名：{{ myRank > 0 ? `第 ${myRank} 名` : '未上榜' }}</text>
          <text v-if="userStore.getBestTime(currentLevel)" class="my-rank-time">
            我的最佳用时：{{ formatTime(userStore.getBestTime(currentLevel) || 0) }}秒
          </text>
        </view>
      </template>
      <template v-else>
        <view class="guest-rank-box">
          <text v-if="userStore.getBestTime(currentLevel)" class="guest-rank-text">
            本地最佳：{{ formatTime(userStore.getBestTime(currentLevel) || 0) }}秒（登录后参与排行）
          </text>
          <text v-else class="guest-rank-text">登录后可参与排行，查看个人排名</text>
          <view class="btn btn-purple" @tap="openLoginDialog">
            <text style="font-size: 12rpx; color: white;">去登录</text>
          </view>
        </view>
      </template>
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

function handleLoginConfirm() {
  if (confirmLogin()) {
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

function loadRanking() {
  // TODO: 接入微信云开发数据库后替换为真实数据
  // wx.cloud.database().collection('score')
  //   .where({ level: currentLevel.value })
  //   .orderBy('bestTime', 'asc')
  //   .limit(100)
  //   .get()
  const mockData = []
  const baseTimes = { 3: 3000, 4: 6000, 5: 12000, 6: 20000, 7: 35000, 8: 50000 }
  const base = baseTimes[currentLevel.value] || 10000
  for (let i = 0; i < 20; i++) {
    mockData.push({
      nickName: `用户${i + 1}`,
      bestTime: base + i * 800 + Math.floor(Math.random() * 500),
      errorCount: Math.floor(Math.random() * 3)
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
}

function goBack() {
  Taro.navigateBack()
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
      font-size: 32rpx;
      color: $gray-light;
    }
  }

  .nav-title {
    font-size: 18rpx;
    font-weight: bold;
    color: $purple-deep;
  }

  .nav-right {
    width: 32rpx;
  }
}

.level-tabs {
  padding: 16rpx 32rpx;

  .tabs-scroll {
    white-space: nowrap;
  }

  .tabs-inner {
    display: flex;
    gap: 12rpx;
    justify-content: center;
  }

  .tab-item {
    border-radius: $radius-btn;
    padding: 8rpx 20rpx;
    background-color: #F0F0F0;
    flex-shrink: 0;

    .tab-text {
      font-size: 14rpx;
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
  padding: 16rpx 32rpx;
  border-bottom: 1rpx solid #F0E8E0;

  text {
    font-size: 14rpx;
    color: $gray-text;
  }

  .col-rank { width: 20%; }
  .col-user { width: 40%; }
  .col-time { width: 40%; text-align: center; }
}

.list-body {
  flex: 1;
  max-height: 600rpx;

  .empty-state {
    display: flex;
    justify-content: center;
    padding: 80rpx 32rpx;

    .empty-text {
      font-size: 16rpx;
      color: $gray-text;
    }
  }

  .list-row {
    display: flex;
    align-items: center;
    padding: 12rpx 32rpx;
    height: 60rpx;

    .col-rank { width: 20%; }
    .col-user { width: 40%; }
    .col-time { width: 40%; text-align: center; }

    .rank-num {
      font-size: 14rpx;
      font-weight: bold;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 8rpx;

      .user-avatar-small {
        width: 30rpx;
        height: 30rpx;
        border-radius: 50%;
        background-color: #F0F0F0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16rpx;
      }

      .user-name {
        font-size: 14rpx;
        color: $text-dark;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 120rpx;
      }
    }

    .time-text {
      font-size: 14rpx;
      color: $purple-deep;
    }
  }
}

.my-rank-area {
  padding: 16rpx 32rpx;
  border-top: 1rpx solid #F0E8E0;

  .my-rank-box {
    border-radius: $radius-btn;
    padding: 12rpx 20rpx;
    display: flex;
    flex-direction: column;
    align-items: center;

    .my-rank-text {
      font-size: 14rpx;
      color: $purple-deep;
      font-weight: bold;
    }

    .my-rank-time {
      font-size: 12rpx;
      color: $gray-text;
      margin-top: 4rpx;
    }
  }

  .guest-rank-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12rpx 20rpx;

    .guest-rank-text {
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
