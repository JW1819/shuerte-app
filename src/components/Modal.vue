<template>
  <view v-if="visible" class="modal-mask" @tap="handleMaskTap">
    <view class="modal-content" :class="{ 'modal-confirm': variant === 'confirm' }" @tap.stop>
      <text v-if="title" class="modal-title">{{ title }}</text>
      <text v-if="desc" class="modal-desc">{{ desc }}</text>
      <slot />
      <view v-if="$slots.actions" class="modal-actions">
        <slot name="actions" />
      </view>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  desc: { type: String, default: '' },
  variant: { type: String, default: 'default' },
  maskClosable: { type: Boolean, default: true }
})

const emit = defineEmits(['close'])

function handleMaskTap() {
  if (props.maskClosable) emit('close')
}
</script>

<style lang="scss">
@use '@/styles/variables' as *;

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
    box-sizing: border-box;
  }

  .modal-title {
    font-size: 28rpx;
    font-weight: bold;
    color: $text-dark;
    margin-bottom: 16rpx;
    text-align: center;
  }

  .modal-desc {
    font-size: 24rpx;
    color: $gray-text;
    margin-bottom: 32rpx;
    text-align: center;
  }

  .modal-actions {
    display: flex;
    gap: 24rpx;
    margin-top: 20rpx;
  }
}
</style>
