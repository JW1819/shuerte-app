<template>
  <view class="content-page">
    <view class="nav-bar">
      <view class="nav-left" @tap="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="nav-title">隐私政策</text>
      <view class="nav-right"></view>
    </view>
    <scroll-view class="content-body" scroll-y>
      <view class="content-section">
        <text class="section-heading">一、信息收集</text>
        <text class="section-text">我们仅收集您主动提供的昵称和头像信息，用于个人展示和排行榜功能。我们不会收集您的手机号、通讯录、位置等敏感信息。</text>
      </view>
      <view class="content-section">
        <text class="section-heading">二、信息存储</text>
        <text class="section-text">您的训练数据（成绩、签到记录等）存储在本地设备中。登录后，数据将通过微信云开发同步至云端，确保数据安全。</text>
      </view>
      <view class="content-section">
        <text class="section-heading">三、信息使用</text>
        <text class="section-text">您的信息仅用于：1) 个人成绩记录与展示；2) 排行榜功能；3) 训练数据分析与建议。我们不会将您的信息出售或分享给第三方。</text>
      </view>
      <view class="content-section">
        <text class="section-heading">四、数据安全</text>
        <text class="section-text">我们采用微信云开发的安全机制保护您的数据，所有数据传输均经过加密处理。</text>
      </view>
      <view class="content-section">
        <text class="section-heading">五、您的权利</text>
        <text class="section-text">您有权随时查看、修改或删除您的个人信息。如需删除数据，请在"我的"页面退出登录，或联系开发者处理。</text>
      </view>
      <view class="content-section">
        <text class="section-heading">六、政策更新</text>
        <text class="section-text">本隐私政策可能会不时更新，更新后将在本页面公示。继续使用本应用即表示您同意更新后的政策。</text>
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
  }
}
</style>
