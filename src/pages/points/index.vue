<template>
  <view class="points-page">
    <view class="points-header">
      <view class="points-info">
        <text class="user-name">{{ userStore.userInfo.nickName || '游客' }}</text>
        <text class="user-tip">连续签到第 {{ userStore.cycleDay }}/7 天</text>
      </view>
      <view class="points-display">
        <text class="points-label">当前积分</text>
        <text class="points-value">{{ userStore.points }}<text class="points-unit">分</text></text>
      </view>
    </view>

    <view class="content">
      <view class="wheel-section">
        <view class="section-title-row">
          <text class="section-title">幸运大转盘</text>
          <text class="section-tip">消耗 50 积分 / 次</text>
        </view>

        <view class="wheel-stage">
          <view class="wheel-outer">
            <view class="wheel-pointer"></view>
            <view class="wheel" :style="{ transform: `rotate(${rotation}deg)` }">
              <!-- 6 个扇区底色:用 conic-gradient 实现,微信小程序下渲染稳定,SVG <path fill> 在部分环境下不显示 -->
              <view class="wheel-sectors"></view>
              <!-- 文字层:绝对定位,按 demo 中心点位置(200x200 viewBox 比例) -->
              <view class="wheel-labels">
                <view class="wheel-label wheel-label-0">
                  <text class="label-line">谢谢</text>
                  <text class="label-line">惠顾</text>
                </view>
                <view class="wheel-label wheel-label-1">
                  <text class="label-big">30</text>
                  <text class="label-small">积分</text>
                </view>
                <view class="wheel-label wheel-label-2">
                  <text class="label-big">50</text>
                  <text class="label-small">积分</text>
                </view>
                <view class="wheel-label wheel-label-3">
                  <text class="label-big">100</text>
                  <text class="label-small">积分</text>
                </view>
                <view class="wheel-label wheel-label-4">
                  <text class="label-big">150</text>
                  <text class="label-small">积分</text>
                </view>
                <view class="wheel-label wheel-label-5">
                  <text class="label-crown">👑</text>
                  <text class="label-jackpot">300</text>
                  <text class="label-small">积分</text>
                </view>
              </view>
            </view>
            <view class="wheel-center" :class="{ disabled: spinning }" @tap="handleDraw">
              <text class="wheel-center-big">GO</text>
              <text class="wheel-center-small">{{ spinning ? '抽奖中' : '抽奖' }}</text>
            </view>
          </view>

          <view class="action-row">
            <view class="lottery-btn" :class="{ disabled: spinning || userStore.points < 50 }" @tap="handleDraw">
              <text class="lottery-btn-text">🎯 立即抽奖</text>
            </view>
          </view>
          <view class="lottery-meta">
            <text class="lottery-meta-text">单次消耗 {{ COST }} 积分</text>
          </view>
        </view>
      </view>

      <view class="shortcut-section">
        <view class="shortcut-item" @tap="goShop">
          <view class="shortcut-icon shortcut-icon-1">🛍️</view>
          <text class="shortcut-label">积分商城</text>
        </view>
        <view class="shortcut-item" @tap="rulesVisible = true">
          <view class="shortcut-icon shortcut-icon-4">📋</view>
          <text class="shortcut-label">规则</text>
        </view>
      </view>

      <!-- 每日 Top 3 奖励入口 -->
      <view v-if="top3Banner.visible" class="top3-banner" :class="`top3-banner-${top3Banner.type}`" @tap="handleClaimTop3">
        <view class="top3-banner-icon">{{ top3Banner.icon }}</view>
        <view class="top3-banner-info">
          <text class="top3-banner-title">{{ top3Banner.title }}</text>
          <text class="top3-banner-desc">{{ top3Banner.desc }}</text>
        </view>
        <view v-if="top3Banner.type === 'eligible'" class="top3-banner-claim">
          <text class="top3-banner-claim-text">+10 领取</text>
        </view>
        <view v-else class="top3-banner-claimed">
          <text class="top3-banner-claimed-text">已领取</text>
        </view>
      </view>

      <view v-if="lotteryHistory.length > 0" class="history-section">
        <text class="history-title">抽奖记录</text>
        <view
          v-for="(rec, idx) in lotteryHistory.slice(0, 8)"
          :key="idx"
          class="history-row"
        >
          <text class="history-emoji">{{ getPrizeEmoji(rec.prize) }}</text>
          <view class="history-info">
            <text class="history-name">{{ getPrizeName(rec.prize) }}</text>
            <text class="history-time">{{ formatTimeAgo(rec.time) }}</text>
          </view>
          <text :class="['history-points', getPrizeValue(rec.prize) > 0 ? 'text-orange' : 'text-gray']">
            {{ getPrizeValue(rec.prize) > 0 ? '+' + getPrizeValue(rec.prize) : '未中' }}
          </text>
        </view>
      </view>
    </view>

    <Modal
      :visible="resultVisible"
      :title="resultPrize?.isLose ? '很遗憾' : '恭喜中奖!'"
      :desc="resultPrize?.isLose ? '再接再厉~' : '已存入账户'"
      @close="resultVisible = false"
    >
      <view class="result-emoji">{{ resultPrize?.isLose ? '😢' : (resultPrize?.value >= 100 ? '🏆' : '🎉') }}</view>
      <view class="result-prize">
        <text v-if="resultPrize?.isLose" class="result-lose">未中奖</text>
        <text v-else class="result-amount">+{{ resultPrize?.value }}<text class="result-unit"> 积分</text></text>
      </view>
      <template #actions>
        <view class="btn btn-gray" @tap="resultVisible = false">
          <text>查看记录</text>
        </view>
        <view class="btn btn-pink" @tap="handleDrawAgain">
          <text>再抽一次</text>
        </view>
      </template>
    </Modal>

    <Modal
      :visible="rulesVisible"
      title="积分规则"
      @close="rulesVisible = false"
    >
      <view class="rules-content">
        <view class="rules-section">
          <text class="rules-section-title">📈 获取积分</text>
          <view class="rules-item">
            <text class="rules-item-title">每日签到</text>
            <text class="rules-item-desc">7 天周期递增:第 1 天 +1,第 2 天 +2,...,第 7 天 +7,第 8 天重置为 +1</text>
          </view>
          <view class="rules-item">
            <text class="rules-item-title">完成训练</text>
            <text class="rules-item-desc">每完成一局 +1 积分</text>
          </view>
          <view class="rules-item">
            <text class="rules-item-title">刷新个人记录</text>
            <text class="rules-item-desc">任意难度打破个人最佳成绩,额外 +1 积分(可与完成奖励叠加)</text>
          </view>
          <view class="rules-item rules-item-highlight">
            <text class="rules-item-title">🏆 每日排行榜前 3 名</text>
            <text class="rules-item-desc">当天在任意难度榜排名前 3 位,可领取 +10 积分(每日限领 1 次)</text>
          </view>
        </view>

        <view class="rules-section">
          <text class="rules-section-title">💸 消耗积分</text>
          <view class="rules-item">
            <text class="rules-item-title">积分抽奖</text>
            <text class="rules-item-desc">每次 50 积分,每日最多 10 次</text>
          </view>
          <view class="rules-item">
            <text class="rules-item-title">兑换商品</text>
            <text class="rules-item-desc">500 ~ 3500 积分不等(详见积分商城)</text>
          </view>
        </view>

        <view class="rules-section">
          <text class="rules-section-title">⏰ 有效期</text>
          <view class="rules-item">
            <text class="rules-item-desc">积分长期有效,登出 / 切换账号不会清空</text>
          </view>
        </view>
      </view>
      <template #actions>
        <view class="btn btn-pink" @tap="rulesVisible = false">
          <text>我知道了</text>
        </view>
      </template>
    </Modal>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import Taro, { useDidShow } from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import { cloudCall } from '@/utils/index'
import Modal from '@/components/Modal.vue'

const userStore = useUserStore()

const COST = 50

// 把 claimTop3Bonus 云函数返回的 error code 翻译成中文,
// 避免把 "not_top3" / "user not found" 这类英文 error 直接弹给用户
const TOP3_CLAIM_ERROR_MESSAGES = {
  'already_claimed_today': '今日已领取',
  'user not found': '用户信息不存在,请稍后重试',
  'not_top3': '您未进入前 3 名',
  'no_record_in_level': '暂无该难度的成绩',
  'invalid level': '参数错误',
  'unauthenticated': '请先登录',
  'rate limit exceeded': '操作太频繁,请稍后再试'
}
function getTop3ClaimErrorMessage(error) {
  if (!error) return '领取失败'
  return TOP3_CLAIM_ERROR_MESSAGES[error] || error
}

const PRIZES = [
  { id: 0, name: '谢谢惠顾', value: 0, isLose: true, emoji: '😢' },
  { id: 1, name: '30积分', value: 30, emoji: '💰' },
  { id: 2, name: '50积分', value: 50, emoji: '💵' },
  { id: 3, name: '100积分', value: 100, emoji: '💎' },
  { id: 4, name: '150积分', value: 150, emoji: '🏆' },
  { id: 5, name: '300积分', value: 300, isJackpot: true, emoji: '👑' }
]

const rotation = ref(0)
// shallowRef: 避免深响应式,rotation 只是 number 没必要追踪
const spinning = ref(false)
const rulesVisible = ref(false)
const resultVisible = ref(false)
const resultPrize = ref(null)
// 排行榜 Top 3 奖励提示
const top3Bonus = ref({ eligible: false, claimed: false, rank: 0, level: 0, message: '' })
const claimingBonus = ref(false)
// 记录待清理的 timer id,组件卸载时统一清理,避免 setState on unmounted
let spinTimerId = null
let drawAgainTimerId = null
let unmounted = false

const lotteryHistory = computed(() => userStore.lotteryHistory || [])

const top3Banner = computed(() => {
  if (!userStore.isLogin) {
    return { visible: false }
  }
  if (top3Bonus.value.rank > 0 && top3Bonus.value.rank <= 3) {
    // 以云端 myClaimedToday 为准(由 checkTop3Bonus 写入 top3Bonus.claimed),
    // 避免本地 lastTop3BonusDate 与云端不一致时,banner 显示"可领取"但点击后报错
    const claimed = !!top3Bonus.value.claimed
    return {
      visible: true,
      type: claimed ? 'claimed' : 'eligible',
      icon: '🏆',
      title: claimed
        ? `今日第 ${top3Bonus.value.rank} 名奖励已领取`
        : `恭喜!今日第 ${top3Bonus.value.rank} 名(${top3Bonus.value.level}×${top3Bonus.value.level})`,
      desc: claimed ? '明日再来挑战吧' : '点击领取 +10 积分(每日限 1 次)'
    }
  }
  return { visible: false }
})

function getPrizeEmoji(id) {
  return PRIZES[id]?.emoji || '🎁'
}
function getPrizeName(id) {
  return PRIZES[id]?.name || '未知'
}
function getPrizeValue(id) {
  return PRIZES[id]?.value || 0
}

function formatTimeAgo(iso) {
  if (!iso) return ''
  const t = new Date(iso)
  const now = Date.now()
  const diff = Math.floor((now - t.getTime()) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`
  return `${t.getMonth() + 1}-${t.getDate()}`
}

async function handleDraw() {
  if (spinning.value) return
  if (!userStore.isLogin) {
    Taro.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (userStore.points < COST) {
    Taro.showToast({ title: '积分不足', icon: 'none' })
    return
  }

  spinning.value = true
  Taro.showLoading({ title: '抽奖中...', mask: true })
  try {
    const result = await userStore.lotteryDraw()
    Taro.hideLoading()
    if (result && result.success) {
      spinToPrize(result.prize.id)
    } else {
      spinning.value = false
      Taro.showToast({ title: result?.error || '抽奖失败', icon: 'none' })
    }
  } catch (e) {
    Taro.hideLoading()
    spinning.value = false
    Taro.showToast({ title: '抽奖失败', icon: 'none' })
  }
}

function spinToPrize(prizeId) {
  // 计算旋转角度:扇形i中心位于 i*60° 顺时针
  // 要让扇形i中心对准顶部(0°),顺时针旋转 (360 - i*60)°
  const baseTarget = (360 - prizeId * 60) % 360
  const jitter = (Math.random() - 0.5) * 30
  const finalTarget = (baseTarget + jitter + 360) % 360
  const spins = 5 + Math.floor(Math.random() * 3)
  const currentMod = ((rotation.value % 360) + 360) % 360
  const diff = (finalTarget - currentMod + 360) % 360
  rotation.value += spins * 360 + diff

  // 清理可能残留的旧 timer(防止用户快速点击堆积)
  if (spinTimerId) clearTimeout(spinTimerId)
  spinTimerId = setTimeout(() => {
    spinTimerId = null
    if (unmounted) return
    spinning.value = false
    const prize = PRIZES[prizeId]
    resultPrize.value = { ...prize, id: prizeId }
    resultVisible.value = true
  }, 4200)
}

function handleDrawAgain() {
  resultVisible.value = false
  if (drawAgainTimerId) clearTimeout(drawAgainTimerId)
  drawAgainTimerId = setTimeout(() => {
    drawAgainTimerId = null
    if (unmounted) return
    handleDraw()
  }, 300)
}

async function handleClaimTop3() {
  if (claimingBonus.value) return
  if (top3Bonus.value.rank <= 0) return
  // 优先以 checkTop3Bonus 从云端同步过来的 claimed 状态为准,
  // 避免本地 lastTop3BonusDate 与云端日期格式不一致时判断错
  if (top3Bonus.value.claimed) {
    Taro.showToast({ title: '今日已领取', icon: 'none' })
    return
  }
  claimingBonus.value = true
  Taro.showLoading({ title: '领取中...', mask: true })
  try {
    const result = await userStore.claimTop3Bonus(top3Bonus.value.level)
    Taro.hideLoading()
    if (result && result.success) {
      Taro.showToast({ title: `领取成功!+${result.bonus}分`, icon: 'success' })
      top3Bonus.value = {
        eligible: false,
        claimed: true,
        rank: result.rank,
        level: result.level,
        message: ''
      }
    } else {
      Taro.showToast({ title: getTop3ClaimErrorMessage(result?.error), icon: 'none' })
    }
  } catch (e) {
    Taro.hideLoading()
    Taro.showToast({ title: '领取失败', icon: 'none' })
  } finally {
    claimingBonus.value = false
  }
}

onUnmounted(() => {
  unmounted = true
  if (spinTimerId) {
    clearTimeout(spinTimerId)
    spinTimerId = null
  }
  if (drawAgainTimerId) {
    clearTimeout(drawAgainTimerId)
    drawAgainTimerId = null
  }
})

function goShop() {
  Taro.navigateTo({ url: '/pages/shop/index' })
}
function goProfile() {
  Taro.switchTab({ url: '/pages/profile/index' })
}

async function checkTop3Bonus() {
  if (!userStore.isLogin) {
    top3Bonus.value = { eligible: false, claimed: false, rank: 0, level: 0, message: '' }
    return
  }
  // 简化:查 level 5(经典模式)的排名
  // 后续可改为查所有用户有记录的关卡,展示最优关卡的奖励
  try {
    const res = await cloudCall('getRanking', { level: 5, myOpenId: userStore.userInfo.openId || '' })
    if (res && res.success && res.myRank > 0 && res.myRank <= 3) {
      // 关键:把云端 lastTop3BonusDate 同步到本地,避免本地/云端状态不一致
      // 导致 banner 显示"可领取"但点击后云函数返回 already_claimed_today
      if (res.myLastTop3BonusDate !== undefined && res.myLastTop3BonusDate !== null) {
        userStore.lastTop3BonusDate = res.myLastTop3BonusDate
      }
      top3Bonus.value = {
        eligible: !res.myClaimedToday,
        claimed: !!res.myClaimedToday,
        rank: res.myRank,
        level: 5,
        message: `当前第 ${res.myRank} 名`
      }
    } else {
      top3Bonus.value = { eligible: false, claimed: false, rank: 0, level: 0, message: '' }
    }
  } catch (e) {
    console.error('[points] checkTop3Bonus error', e)
  }
}

useDidShow(() => {
  // 切回时检查 Top 3 奖励可领取状态
  checkTop3Bonus()
})
</script>

<style lang="scss">
@use '@/styles/variables' as *;

.points-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FF8A3D 0%, #FFA066 40%, #FFD4A8 100%);
  padding-bottom: 40rpx;
}

.points-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx $spacing-lg;

  .points-info {
    display: flex;
    flex-direction: column;
  }

  .user-name {
    font-size: 30rpx;
    font-weight: 600;
    color: #fff;
  }

  .user-tip {
    font-size: 20rpx;
    color: rgba(255, 255, 255, 0.85);
    margin-top: 4rpx;
  }

  .points-display {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .points-label {
    font-size: 20rpx;
    color: rgba(255, 255, 255, 0.85);
  }

  .points-value {
    font-size: 40rpx;
    font-weight: 700;
    color: #fff;
  }

  .points-unit {
    font-size: 20rpx;
    font-weight: 500;
  }
}

.content {
  margin-top: -20rpx;
  background-color: $bg-color;
  border-radius: 32rpx 32rpx 0 0;
  padding: $spacing-md;
  min-height: 60vh;
}

.wheel-section {
  background: linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%);
  border-radius: 20rpx;
  padding: 24rpx $spacing-md $spacing-md;
  box-shadow: 0 4rpx 16rpx rgba(255, 138, 61, 0.1);

  .section-title-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: $spacing-sm;
  }

  .section-title {
    font-size: 30rpx;
    font-weight: 700;
    color: $text-dark;
  }

  .section-tip {
    font-size: 20rpx;
    color: $gray-text;
  }
}

.wheel-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-md;
}

.wheel-outer {
  position: relative;
  width: 440rpx;
  height: 440rpx;
  padding: 16rpx;
  background: linear-gradient(135deg, #FF8A3D, #FF6A1F);
  border-radius: 50%;
  box-shadow: 0 8rpx 24rpx rgba(255, 106, 31, 0.4);
}

.wheel-pointer {
  position: absolute;
  top: -8rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 28rpx solid transparent;
  border-right: 28rpx solid transparent;
  border-top: 44rpx solid #FF3B30;
  z-index: 10;
  filter: drop-shadow(0 4rpx 8rpx rgba(0, 0, 0, 0.3));
}

.wheel {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  position: relative;
  transition: transform 4s cubic-bezier(0.17, 0.67, 0.21, 0.99);
  overflow: hidden;
  // 性能优化:提示浏览器为 transform 创建独立合成层,走 GPU
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.wheel-sectors {
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  // 6 个 60° 扇区(从 12 点顺时针),用 conic-gradient 实现,微信小程序下渲染稳定
  background: conic-gradient(
    from -90deg,
    #C8C8D0 0deg, #C8C8D0 60deg,
    #5B9BD5 60deg, #5B9BD5 120deg,
    #5BAA6F 120deg, #5BAA6F 180deg,
    #C4A830 180deg, #C4A830 240deg,
    #D4739A 240deg, #D4739A 300deg,
    #FF6A1F 300deg, #FF6A1F 360deg
  );
}

.wheel-labels {
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.wheel-label {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 1.15;
  pointer-events: none;
  text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.18);

  .label-line   { font-size: 24rpx; font-weight: 800; }
  .label-big    { font-size: 36rpx; font-weight: 900; line-height: 1; }
  .label-small  { font-size: 16rpx; font-weight: 700; opacity: 0.95; }
  .label-crown  { font-size: 20rpx; line-height: 1; }
  .label-jackpot{ font-size: 40rpx; font-weight: 900; line-height: 1; }
}

// 6 个扇区中心点(viewBox 200x200 → wheel-outer 440rpx 比例)
// 中心点 = viewBox(100,42)/(150,71)/(150,129)/(100,158)/(50,129)/(50,71)
// wheel-outer 内框 408rpx(去掉 16rpx padding),换算百分比:
//   sector 0: (100/200)=50%  (42-8)/200=17%  → 调整后 23%(考虑 16rpx padding)
// 旋转角度使"文字底部朝向圆盘中心":顺时针 0°/60°/120°/180°/240°/300°
.wheel-label-0 { left: 50%;  top: 23.1%; color: #5A5A60; transform: translate(-50%, -50%) rotate(0deg); }
.wheel-label-1 { left: 75%;  top: 35.5%; color: #FFFFFF; transform: translate(-50%, -50%) rotate(60deg); }
.wheel-label-2 { left: 75%;  top: 64.5%; color: #FFFFFF; transform: translate(-50%, -50%) rotate(120deg); }
.wheel-label-3 { left: 50%;  top: 76.9%; color: #5A4A0A; transform: translate(-50%, -50%) rotate(180deg); }
.wheel-label-4 { left: 25%;  top: 64.5%; color: #FFFFFF; transform: translate(-50%, -50%) rotate(240deg); }
.wheel-label-5 { left: 25%;  top: 35.5%; color: #FFFFFF; transform: translate(-50%, -50%) rotate(300deg); }

.wheel-center {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 120rpx; height: 120rpx;
  background: linear-gradient(135deg, #FF6A1F, #FF8A3D);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 4rpx 14rpx rgba(255, 106, 31, 0.5), inset 0 -4rpx 8rpx rgba(0, 0, 0, 0.15);
  cursor: pointer;
  z-index: 5;
  border: 6rpx solid #fff;

  &.disabled { opacity: 0.6; cursor: not-allowed; }
  &:active:not(.disabled) { transform: translate(-50%, -50%) scale(0.95); }

  .wheel-center-big { font-size: 30rpx; line-height: 1.1; }
  .wheel-center-small { font-size: 18rpx; opacity: 0.9; }
}

.action-row {
  display: flex;
  justify-content: center;
}

.lottery-btn {
  background: linear-gradient(135deg, #FF8A3D, #FF6A1F);
  color: #fff;
  padding: 18rpx 60rpx;
  border-radius: 40rpx;
  box-shadow: 0 6rpx 16rpx rgba(255, 106, 31, 0.4);
  transition: opacity 0.2s, transform 0.1s;

  &.disabled { opacity: 0.6; }
  &:active:not(.disabled) { transform: scale(0.96); }

  .lottery-btn-text {
    font-size: 28rpx;
    font-weight: 700;
  }
}

.lottery-meta {
  margin-top: 8rpx;

  .lottery-meta-text {
    font-size: 20rpx;
    color: $gray-text;
  }

  .lottery-meta-num {
    color: #FF6A1F;
    font-weight: 700;
  }
}

.shortcut-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-sm;
  margin-top: $spacing-md;
  padding: $spacing-md $spacing-sm;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  .shortcut-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
  }

  .shortcut-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40rpx;
  }

  .shortcut-icon-1 { background: linear-gradient(135deg, #FF9D5C, #FF7A28); }
  .shortcut-icon-4 { background: linear-gradient(135deg, #FFD4A8, #FFC999); }

  .shortcut-label {
    font-size: 22rpx;
    color: $text-dark;
  }
}

.history-section {
  margin-top: $spacing-md;
  padding: $spacing-md;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  .history-title {
    display: block;
    font-size: 26rpx;
    font-weight: bold;
    color: $purple-deep;
    margin-bottom: $spacing-sm;
  }

  .history-row {
    display: flex;
    align-items: center;
    padding: 12rpx 0;
    border-bottom: 1rpx solid #F5F5F5;
  }

  .history-row:last-child {
    border-bottom: none;
  }

  .history-emoji {
    font-size: 32rpx;
    margin-right: $spacing-sm;
  }

  .history-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .history-name {
    font-size: 24rpx;
    color: $text-dark;
  }

  .history-time {
    font-size: 20rpx;
    color: $gray-text;
    margin-top: 2rpx;
  }

  .history-points {
    font-size: 24rpx;
    font-weight: 600;
  }
}

.result-emoji {
  font-size: 96rpx;
  text-align: center;
  margin-bottom: $spacing-sm;
}

.result-prize {
  text-align: center;
  margin-bottom: $spacing-sm;
}

.result-amount {
  font-size: 56rpx;
  font-weight: 800;
  color: #FF3B30;
  text-shadow: 0 2rpx 8rpx rgba(255, 59, 48, 0.2);
}

.result-lose {
  font-size: 40rpx;
  color: #999;
}

.result-unit {
  font-size: 24rpx;
  color: #FF8A3D;
  font-weight: 500;
}

.rules-content {
  width: 100%;
  text-align: left;
  padding: 0 8rpx 16rpx;
  max-height: 70vh;
  overflow-y: auto;
}

.rules-section {
  margin-bottom: 20rpx;

  &:last-child { margin-bottom: 0; }
}

.rules-section-title {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #FF6A1F;
  margin-bottom: 12rpx;
  padding-left: 8rpx;
  border-left: 6rpx solid #FF6A1F;
  line-height: 1.2;
}

.rules-item {
  margin-bottom: 12rpx;
  padding: 12rpx 16rpx;
  background: rgba(255, 243, 232, 0.4);
  border-radius: 12rpx;
}

.rules-item:last-child {
  margin-bottom: 0;
}

.rules-item-highlight {
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.15), rgba(255, 138, 61, 0.15));
  border: 2rpx solid rgba(255, 215, 0, 0.4);
}

.rules-item-title {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: $text-dark;
  margin-bottom: 4rpx;
}

.rules-item-desc {
  display: block;
  font-size: 20rpx;
  color: $gray-text;
  line-height: 1.4;
}

.top3-banner {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin: $spacing-md;
  padding: $spacing-md $spacing-lg;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(255, 138, 61, 0.2);
  transition: transform 0.15s;
  position: relative;
  overflow: hidden;
}

.top3-banner:active {
  transform: scale(0.98);
}

.top3-banner-eligible {
  background: linear-gradient(135deg, #FFD700 0%, #FF8A3D 100%);
  animation: top3Pulse 2s ease-in-out infinite;
}

.top3-banner-claimed {
  background: linear-gradient(135deg, #F5F5F7 0%, #E8E8EC 100%);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

@keyframes top3Pulse {
  0%, 100% { box-shadow: 0 2rpx 12rpx rgba(255, 138, 61, 0.2); }
  50% { box-shadow: 0 4rpx 24rpx rgba(255, 138, 61, 0.45); }
}

.top3-banner-icon {
  font-size: 60rpx;
  line-height: 1;
  flex-shrink: 0;
}

.top3-banner-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.top3-banner-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
  margin-bottom: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top3-banner-claimed .top3-banner-title {
  color: $text-dark;
}

.top3-banner-desc {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.3;
}

.top3-banner-claimed .top3-banner-desc {
  color: $gray-text;
}

.top3-banner-claim {
  background: #fff;
  color: #FF6A1F;
  padding: 10rpx 20rpx;
  border-radius: 24rpx;
  flex-shrink: 0;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.top3-banner-claim-text {
  font-size: 24rpx;
  font-weight: 700;
}

.top3-banner-claimed-text {
  font-size: 22rpx;
  color: $gray-text;
  font-weight: 500;
  flex-shrink: 0;
  padding: 0 8rpx;
}
</style>
