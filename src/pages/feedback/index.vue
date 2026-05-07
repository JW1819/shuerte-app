<template>
  <view class="content-page">
    <view class="nav-bar">
      <view class="nav-left" @tap="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="nav-title">意见反馈</text>
      <view class="nav-right"></view>
    </view>
    <scroll-view class="content-body" scroll-y>
      <view class="feedback-form">
        <view class="form-group">
          <text class="form-label">反馈类型</text>
          <view class="type-list">
            <view
              v-for="t in feedbackTypes"
              :key="t.value"
              class="type-item"
              :class="{ 'type-active': selectedType === t.value }"
              @tap="selectedType = t.value"
            >
              <text class="type-text">{{ t.label }}</text>
            </view>
          </view>
        </view>
        <view class="form-group">
          <text class="form-label">详细描述</text>
          <textarea
            class="feedback-textarea"
            v-model="feedbackContent"
            placeholder="请详细描述您的问题或建议..."
            :maxlength="500"
          />
          <text class="char-count">{{ feedbackContent.length }}/500</text>
        </view>
        <view class="form-group">
          <text class="form-label">联系方式（选填）</text>
          <input class="feedback-input" v-model="contactInfo" placeholder="微信号/手机号" />
        </view>
        <view class="submit-btn btn btn-purple" @tap="submitFeedback">
          <text style="color: white; font-size: 16rpx;">提交反馈</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import Taro from '@tarojs/taro'

const feedbackTypes = [
  { value: 'bug', label: 'Bug反馈' },
  { value: 'feature', label: '功能建议' },
  { value: 'ui', label: '界面优化' },
  { value: 'other', label: '其他' }
]
const selectedType = ref('bug')
const feedbackContent = ref('')
const contactInfo = ref('')

function submitFeedback() {
  if (!feedbackContent.value.trim()) {
    Taro.showToast({ title: '请输入反馈内容', icon: 'none' })
    return
  }
  // TODO: 接入微信云开发后实现反馈提交
  // wx.cloud.callFunction({
  //   name: 'submitFeedback',
  //   data: {
  //     type: selectedType.value,
  //     content: feedbackContent.value,
  //     contact: contactInfo.value
  //   }
  // })
  Taro.showToast({ title: '感谢您的反馈！', icon: 'none', duration: 3000 })
  feedbackContent.value = ''
  contactInfo.value = ''
}

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
  .nav-left { .back-icon { font-size: 32rpx; color: $gray-light; } }
  .nav-title { font-size: 18rpx; font-weight: bold; color: $purple-deep; }
  .nav-right { width: 32rpx; }
}
.content-body {
  padding: $spacing-lg;
  height: calc(100vh - 84rpx);
  box-sizing: border-box;
  overflow-x: hidden;
}
.feedback-form {
  .form-group {
    margin-bottom: $spacing-lg;
    .form-label {
      font-size: 16rpx;
      font-weight: bold;
      color: $purple-deep;
      display: block;
      margin-bottom: $spacing-sm;
    }
  }
  .type-list {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;
    .type-item {
      padding: 16rpx 32rpx;
      border-radius: $radius-btn;
      background-color: #F0F0F0;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      .type-text { font-size: 28rpx; color: $gray-text; }
      &.type-active {
        background-color: $purple-bg;
        .type-text { color: white; font-weight: bold; }
      }
    }
  }
  .feedback-textarea {
    width: 100%;
    height: 200rpx;
    background-color: #FFFFFF;
    border: 2rpx solid #F0E8E0;
    border-radius: $radius-card;
    padding: $spacing-md;
    font-size: 14rpx;
    color: $text-dark;
    box-sizing: border-box;
  }
  .char-count {
    font-size: 12rpx;
    color: $gray-text;
    text-align: right;
    display: block;
    margin-top: 4rpx;
  }
  .feedback-input {
    width: 100%;
    height: 60rpx;
    background-color: #FFFFFF;
    border: 2rpx solid #F0E8E0;
    border-radius: $radius-card;
    padding: 0 $spacing-md;
    font-size: 14rpx;
    color: $text-dark;
    box-sizing: border-box;
  }
  .submit-btn {
    margin-top: $spacing-xl;
    width: 100%;
    text-align: center;
    
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      
      text {
        font-size: 28rpx;
      }
    }
  }
}
</style>
