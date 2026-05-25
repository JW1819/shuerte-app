<template>
  <view class="ranking-page">
    <view class="nav-bar">
      <text class="nav-title">全网排行榜</text>
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
          <view class="btn btn-purple btn-login" @tap="onLoginTap">
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
          <text class="user-name">{{ item.nickName }}</text>
        </view>
        <text class="col-time time-text">{{ formatTime(item.bestTime) }}秒</text>
      </view>
      <view class="list-footer">
        <text class="footer-text">已加载全部数据</text>
      </view>
    </scroll-view>

    <LoginDialog />
  </view>
</template>

<script setup>
import LoginDialog from '@/components/LoginDialog.vue'
import { ref, onMounted } from 'vue'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
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
const isLoading = ref(false)
const isRefreshing = ref(false)

const mockRankingData = [
  { nickName: '小明', bestTime: 4500, bestError: 0 },
  { nickName: '小红', bestTime: 5200, bestError: 1 },
  { nickName: '小华', bestTime: 6100, bestError: 0 },
  { nickName: '小李', bestTime: 7300, bestError: 2 },
  { nickName: '小张', bestTime: 8000, bestError: 1 },
]

const { openLoginDialog } = useLogin()

function onLoginTap() {
  openLoginDialog(() => loadRanking())
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

async function loadRanking() {
  isLoading.value = true

  try {
    if (Taro.cloud) {
      console.log('loadRanking: calling cloud function')
      const res = await Taro.cloud.callFunction({
        name: 'getRanking',
        data: {
          level: currentLevel.value,
          myOpenId: userStore.userInfo.openId || ''
        }
      })
      console.log('loadRanking: cloud function result', res)

      if (res && res.result) {
        if (res.result.success && res.result.data && Array.isArray(res.result.data)) {
          rankingList.value = res.result.data.map(item => ({
            nickName: item.nickName || '用户',
            bestTime: item.bestTime,
            errorCount: item.bestError || 0
          }))
          
          myRank.value = res.result.myRank || 0
        } else {
          console.log('loadRanking: no data or not success, using mock data')
          rankingList.value = mockRankingData.map(item => ({
            nickName: item.nickName,
            bestTime: item.bestTime,
            errorCount: item.bestError
          }))
          myRank.value = 0
        }
      } else {
          rankingList.value = mockRankingData.map(item => ({
            nickName: item.nickName,
            bestTime: item.bestTime,
            errorCount: item.bestError
          }))
          myRank.value = 0
      }
    } else {
      rankingList.value = mockRankingData.map(item => ({
        nickName: item.nickName,
        bestTime: item.bestTime,
        errorCount: item.bestError
      }))
      myRank.value = 0
    }
  } catch (e) {
    console.error('loadRanking error', e)
    rankingList.value = mockRankingData.map(item => ({
      nickName: item.nickName,
      bestTime: item.bestTime,
      errorCount: item.bestError
    }))
    myRank.value = 0
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
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

useDidShow(() => {
  const pendingLevel = Taro.getStorageSync('pendingRankingLevel')
  if (pendingLevel) {
    currentLevel.value = Number(pendingLevel)
    Taro.removeStorageSync('pendingRankingLevel')
    loadRanking()
  }
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
  height: 100vh;
  box-sizing: border-box;
  background-color: $bg-color;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.nav-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx $spacing-lg;
  height: 44rpx;

  .nav-title {
    font-size: 32rpx;
    font-weight: bold;
    color: $purple-deep;
  }
}

.level-tabs {
  flex-shrink: 0;
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
      font-size: 26rpx;
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
  flex-shrink: 0;
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
  flex: 1;
  height: 0;
  min-height: 160rpx;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

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

.my-rank-area {
  flex-shrink: 0;
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

</style>
