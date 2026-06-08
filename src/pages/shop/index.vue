<template>
  <view class="shop-page">
    <view class="points-bar">
      <text class="points-label">我的积分</text>
      <text class="points-num">{{ userStore.points }}<text class="points-unit"> 分</text></text>
    </view>

    <view class="items-grid">
      <view
        v-for="item in SHOP_ITEMS"
        :key="item.id"
        class="item-card"
      >
        <view class="item-cover" :style="{ background: item.bgGradient }">
          <image class="item-image" :src="item.image" mode="aspectFit" />
          <view class="item-tag">
            <text class="item-tag-text">{{ item.tag }}</text>
          </view>
        </view>
        <view class="item-body">
          <text class="item-name">{{ item.name }}</text>
          <view class="item-bottom">
            <view class="item-price-wrap">
              <text class="item-price">{{ item.points }}</text>
              <text class="item-price-unit">积分</text>
            </view>
            <view
              class="item-exchange-btn"
              :class="{ 'item-exchange-disabled': userStore.points < item.points || !userStore.isLogin }"
              @tap="handleExchange(item)"
            >
              <text class="item-exchange-text">兑换</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="exchangeHistory.length > 0" class="history-area">
      <text class="history-title">兑换记录</text>
      <view
        v-for="(rec, idx) in exchangeHistory.slice(0, 10)"
        :key="idx"
        class="history-row"
      >
        <text class="history-emoji">{{ getItemEmoji(rec.itemId) }}</text>
        <view class="history-info">
          <text class="history-name">{{ rec.itemName }}</text>
          <text class="history-time">{{ formatTimeAgo(rec.time) }}</text>
        </view>
        <text class="history-points">-{{ rec.points }}</text>
      </view>
    </view>

    <Modal
      :visible="confirmVisible"
      :title="`确认兑换 ${pendingItem?.name || ''}?`"
      :desc="`将消耗 ${pendingItem?.points || 0} 积分,请填写收货信息`"
      @close="closeExchangeModal"
    >
      <view class="shipping-form">
        <view class="form-row">
          <text class="form-label">收货人</text>
          <input
            class="form-input"
            v-model="shipping.name"
            placeholder="请输入姓名"
            maxlength="20"
            placeholder-class="form-placeholder"
          />
        </view>
        <view class="form-row">
          <text class="form-label">联系电话</text>
          <input
            class="form-input"
            v-model="shipping.phone"
            type="number"
            placeholder="请输入手机号"
            maxlength="11"
            placeholder-class="form-placeholder"
          />
        </view>
        <view class="form-row">
          <text class="form-label">省/市/区</text>
          <input
            class="form-input"
            v-model="shipping.region"
            placeholder="如:浙江省杭州市西湖区"
            maxlength="50"
            placeholder-class="form-placeholder"
          />
        </view>
        <view class="form-row">
          <text class="form-label">详细地址</text>
          <input
            class="form-input"
            v-model="shipping.address"
            placeholder="街道、楼栋、门牌号等"
            maxlength="100"
            placeholder-class="form-placeholder"
          />
        </view>
      </view>
      <template #actions>
        <view class="btn btn-gray" @tap="closeExchangeModal">
          <text>取消</text>
        </view>
        <view class="btn btn-pink" @tap="confirmExchange">
          <text>确认兑换</text>
        </view>
      </template>
    </Modal>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import Taro, { useDidShow } from '@tarojs/taro'
import { useUserStore } from '@/store/user'
import { SHOP_ITEMS, ITEM_MAP } from '@/data/shopItems'
import Modal from '@/components/Modal.vue'

const userStore = useUserStore()
const confirmVisible = ref(false)
const pendingItem = ref(null)
// 收货信息表单(每次打开弹窗重置)
const defaultShipping = () => ({ name: '', phone: '', region: '', address: '' })
const shipping = ref(defaultShipping())

const exchangeHistory = computed(() => userStore.exchangeHistory || [])

function getItemEmoji(itemId) {
  return ITEM_MAP[itemId]?.emoji || '🎁'
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

function handleExchange(item) {
  if (!userStore.isLogin) {
    Taro.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (userStore.points < item.points) {
    Taro.showToast({ title: '积分不足', icon: 'none' })
    return
  }
  pendingItem.value = item
  shipping.value = defaultShipping()
  confirmVisible.value = true
}

function closeExchangeModal() {
  confirmVisible.value = false
  pendingItem.value = null
  shipping.value = defaultShipping()
}

function validateShipping() {
  const s = shipping.value
  // 注意:WeChat MP 下 <input type="number"> + v-model 会把值变成 Number,
  // 这里统一用 String() 强转,避免 .trim 报错
  const name = String(s.name || '').trim()
  const phone = String(s.phone || '').trim()
  const region = String(s.region || '').trim()
  const address = String(s.address || '').trim()
  if (!name) return '请填写收货人姓名'
  if (!phone) return '请填写联系电话'
  if (!/^1\d{10}$/.test(phone)) return '手机号格式不正确'
  if (!region) return '请填写省/市/区'
  if (!address) return '请填写详细地址'
  return ''
}

async function confirmExchange() {
  if (!pendingItem.value) return
  const errMsg = validateShipping()
  if (errMsg) {
    Taro.showToast({ title: errMsg, icon: 'none' })
    return
  }
  const item = pendingItem.value
  // 传给 store/云函数前统一转字符串,防止 phone 是 Number 类型
  const shipData = {
    name: String(shipping.value.name || '').trim(),
    phone: String(shipping.value.phone || '').trim(),
    region: String(shipping.value.region || '').trim(),
    address: String(shipping.value.address || '').trim()
  }
  closeExchangeModal()
  Taro.showLoading({ title: '兑换中...' })
  try {
    const result = await userStore.exchange(item.id, shipData)
    Taro.hideLoading()
    if (result && result.success) {
      Taro.showToast({ title: '兑换成功!', icon: 'success' })
    } else {
      Taro.showToast({ title: result?.error || '兑换失败', icon: 'none' })
    }
  } catch (e) {
    Taro.hideLoading()
    Taro.showToast({ title: '兑换失败', icon: 'none' })
  }
}

useDidShow(() => {
  // 每次进入刷新积分
})
</script>

<style lang="scss">
@use '@/styles/variables' as *;

.shop-page {
  min-height: 100vh;
  background-color: $bg-color;
  padding-bottom: 40rpx;
}

.points-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: $spacing-md $spacing-md;
  padding: $spacing-md $spacing-lg;
  background: linear-gradient(135deg, #FF8A3D 0%, #FFA066 100%);
  border-radius: $radius-card;
  box-shadow: 0 4rpx 12rpx rgba(255, 138, 61, 0.25);

  .points-label {
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.9);
  }

  .points-num {
    font-size: 40rpx;
    font-weight: 700;
    color: #fff;
  }

  .points-unit {
    font-size: 20rpx;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.85);
  }
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-md;
  padding: 0 $spacing-md;
}

.item-card {
  background-color: #fff;
  border-radius: $radius-card;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);

  .item-cover {
    height: 180rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .item-image {
    width: 140rpx;
    height: 140rpx;
  }

  .item-tag {
    position: absolute;
    top: 12rpx;
    left: 12rpx;
    background: rgba(255, 106, 31, 0.9);
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
  }

  .item-tag-text {
    font-size: 18rpx;
    color: #fff;
    font-weight: 500;
  }

  .item-body {
    padding: 12rpx 16rpx 16rpx;
  }

  .item-name {
    font-size: 24rpx;
    color: $text-dark;
    font-weight: 500;
    line-height: 1.3;
    margin-bottom: 6rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    min-height: 62rpx;
  }

  .item-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .item-price-wrap {
    display: flex;
    align-items: baseline;
    gap: 4rpx;
  }

  .item-price {
    font-size: 30rpx;
    font-weight: 700;
    color: #FF6A1F;
  }

  .item-price-unit {
    font-size: 20rpx;
    color: #FF6A1F;
  }

  .item-exchange-btn {
    background: linear-gradient(135deg, #FF8A3D, #FF6A1F);
    color: #fff;
    padding: 8rpx 20rpx;
    border-radius: 24rpx;
    transition: opacity 0.2s, transform 0.1s;
  }

  .item-exchange-btn:active {
    transform: scale(0.95);
  }

  .item-exchange-disabled {
    background: #D0D0D0 !important;
    color: #fff;
  }

  .item-exchange-text {
    font-size: 22rpx;
    font-weight: 500;
  }
}

.history-area {
  margin: $spacing-md;

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
    padding: 16rpx $spacing-md;
    background-color: #fff;
    border-radius: $radius-card;
    margin-bottom: 8rpx;
  }

  .history-emoji {
    font-size: 36rpx;
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
    color: $red-light;
  }
}

// 兑换弹窗里的收货信息表单
.shipping-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 8rpx;
  align-items: stretch;

  .form-row {
    display: flex;
    align-items: center;
    background-color: #F7F7F7;
    border-radius: 12rpx;
    padding: 0 16rpx;
    height: 72rpx;
  }

  .form-label {
    font-size: 24rpx;
    color: $text-dark;
    width: 140rpx;
    flex-shrink: 0;
  }

  .form-input {
    flex: 1;
    font-size: 26rpx;
    color: $text-dark;
    height: 72rpx;
    line-height: 72rpx;
    min-width: 0;
  }

  .form-placeholder {
    color: #BBB;
    font-size: 24rpx;
  }
}
</style>
