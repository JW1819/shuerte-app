<template>
  <view class="content-page">
    <view class="nav-bar">
      <view class="nav-left" @tap="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="nav-title">关于我们</text>
      <view class="nav-right"></view>
    </view>
    <scroll-view class="content-body" scroll-y>
      <view class="about-header">
        <text class="app-icon">🧩</text>
        <text class="app-name">舒尔特方格</text>
        <text class="app-version">版本 1.0.0</text>
      </view>
      <view class="content-section">
        <text class="section-heading">关于舒尔特方格</text>
        <text class="section-text">舒尔特方格是全球最简单、最有效的注意力训练方法之一。由德国心理治疗师沃尔特·舒尔特发明，通过在方格内按顺序寻找数字，锻炼视觉注意力、专注力和反应速度。</text>
      </view>
      <view class="content-section">
        <text class="section-heading">训练方法</text>
        <text class="section-text">1. 选择适合的难度等级（3×3 到 8×8）</text>
        <text class="section-text">2. 眼睛注视方格中心，用余光寻找数字</text>
        <text class="section-text">3. 按从 1 到 N 的顺序依次点击</text>
        <text class="section-text">4. 尽量减少错误，提高速度</text>
        <text class="section-text">5. 每天坚持训练 10-15 分钟</text>
      </view>
      <view class="content-section">
        <text class="section-heading">评级标准</text>
        <text class="section-text">S 级：卓越水平，专注力极强</text>
        <text class="section-text">A 级：优秀水平，专注力良好</text>
        <text class="section-text">B 级：一般水平，仍有提升空间</text>
        <text class="section-text">C 级：需要加强训练</text>
      </view>
      <view class="content-section">
        <text class="section-heading">联系我们</text>
        <text class="section-text">如有任何问题或建议，欢迎通过"意见反馈"功能与我们联系。</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import Taro from '@tarojs/taro'
function goBack() {
  Taro.navigateBack()
}
</script>

<style lang="scss">
@import '@/styles/variables.scss';
.content-page {
  min-height: 100vh;
  background-color: $bg-color;
  box-sizing: border-box;
}
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx $spacing-lg;
  height: 44rpx;
  .nav-left { .back-icon { font-size: 40rpx; color: $gray-light; } }
  .nav-title { font-size: 32rpx; font-weight: bold; color: $purple-deep; }
  .nav-right { width: 40rpx; }
}
.content-body {
  padding: $spacing-lg;
  height: calc(100vh - 84rpx);
  box-sizing: border-box;
  overflow-x: hidden;
}
.about-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-xl 0;
  margin-bottom: $spacing-lg;
  .app-icon { font-size: 80rpx; margin-bottom: $spacing-md; }
  .app-name { font-size: 36rpx; font-weight: bold; color: $purple-deep; }
  .app-version { font-size: 24rpx; color: $gray-text; margin-top: $spacing-xs; }
}
.content-section {
  margin-bottom: $spacing-xl;
  .section-heading {
    font-size: 30rpx;
    font-weight: bold;
    color: $purple-deep;
    display: block;
    margin-bottom: $spacing-md;
  }
  .section-text {
    font-size: 28rpx;
    color: $text-dark;
    line-height: 2;
    display: block;
    white-space: pre-line;
  }
}
</style>
