<template>
  <view class="grid-container" :style="containerStyle">
    <view
      v-for="(cell, idx) in flatGrid"
      :key="idx"
      class="grid-cell"
      :class="{ 'cell-clicked': cell.clicked, 'cell-tappable': tappable }"
      :style="cellStyleFor(cell)"
      :hover-class="tappable ? 'cell-hover' : 'none'"
      :hover-stay-time="50"
      @tap="tappable && $emit('cellTap', cell, idx)"
    >
      <text v-if="showNumber" class="cell-number" :style="{ color: cell.clicked ? '#FFFFFF' : cell.color }">{{ cell.number }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { LEVEL_CONFIG } from '@/utils/index'

const props = defineProps({
  grid: { type: Array, required: true },
  level: { type: Number, required: true },
  tappable: { type: Boolean, default: false },
  showNumber: { type: Boolean, default: true }
})

defineEmits(['cellTap'])

const flatGrid = computed(() => {
  return Array.isArray(props.grid) && props.grid.length > 0 && Array.isArray(props.grid[0])
    ? props.grid.flat()
    : (props.grid || [])
})

const containerStyle = computed(() => {
  const size = props.level
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${size}, 1fr)`,
    gap: '8rpx',
    width: '100%',
    maxWidth: size <= 5 ? '560rpx' : '640rpx'
  }
})

const FONT_SIZE_BY_LEVEL = {
  6: '40rpx',
  7: '32rpx',
  8: '28rpx'
}

function cellStyleFor(cell) {
  const size = props.level
  const fontSize = FONT_SIZE_BY_LEVEL[size] || '56rpx'
  const theme = LEVEL_CONFIG[size] || {}
  // 倒计时前:展示关卡纯色背景;游戏中:未点击为白底、点击后为彩色
  const bgColor = cell.clicked
    ? cell.color
    : (props.showNumber ? '#FFFFFF' : (theme.bgColor || '#FFFFFF'))
  return {
    width: '100%',
    aspectRatio: '1',
    borderRadius: '12rpx',
    backgroundColor: bgColor,
    border: `2rpx solid ${theme.borderColor || '#E8E0F0'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // 训练对节奏极敏感,过渡从 0.2s 砍到 0.05s,视觉上接近瞬切,
    // 减少玩家"等反馈"的感知等待,计时逻辑不受影响
    transition: 'background-color 0.05s linear, color 0.05s linear',
    fontSize
  }
}
</script>

<style lang="scss">
.cell-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.04);

  .cell-number {
    font-weight: bold;
    font-size: inherit;
  }
}

.cell-clicked {
  // 从 0.7 调到 0.55,让"已点"和"未点"区分更明显,
  // 减少眼睛在 1~16 个数字间扫视时的判断延迟
  opacity: 0.55;
}
</style>
