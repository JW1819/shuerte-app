<template>
  <view v-if="showLoginDialog" class="login-modal-mask" @tap="cancelLogin">
    <view class="login-modal-content" @tap.stop>
      <text class="login-modal-title">登录授权</text>
      <view class="login-form">
        <view class="avatar-section">
          <text class="form-label">选择头像</text>
          <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
            <image v-if="loginAvatarUrl" class="avatar-preview" :src="loginAvatarUrl" mode="aspectFill" />
            <view v-else class="avatar-placeholder">
              <text>👤</text>
            </view>
          </button>
          <text class="avatar-hint">点击选择微信头像</text>
        </view>
        <view class="nickname-section">
          <text class="form-label">输入昵称</text>
          <input
            class="nickname-input"
            type="nickname"
            :value="loginNickName"
            @blur="onNicknameInput"
            placeholder="请输入昵称"
          />
        </view>
      </view>
      <view class="login-modal-actions">
        <view class="btn btn-gray" @tap="cancelLogin">
          <text>取消</text>
        </view>
        <view
          class="btn"
          :class="loginNickName.trim() ? 'btn-purple' : 'btn-disabled'"
          @tap="confirmLogin"
        >
          <text>确认登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { useLogin } from '@/utils/useLogin'

const { showLoginDialog, loginAvatarUrl, loginNickName, cancelLogin, confirmLogin, onChooseAvatar, onNicknameInput } =
  useLogin()
</script>

<style lang="scss">
@import '@/styles/variables.scss';

.login-modal-mask {
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
}

.login-modal-content {
  background-color: #ffffff;
  border-radius: $radius-popup;
  padding: 40rpx;
  width: 560rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-modal-title {
  font-size: 18rpx;
  font-weight: bold;
  color: $text-dark;
  margin-bottom: 20rpx;
}

.login-modal-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 20rpx;
}

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
    padding: 0;
    margin: 0;
    border: none;
    background: linear-gradient(135deg, #e8e0f0, #f0e8f8);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    line-height: normal;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);

    &::after {
      border: none;
    }

    .avatar-preview {
      width: 100rpx;
      height: 100rpx;
      border-radius: 50%;
    }

    .avatar-placeholder {
      font-size: 44rpx;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .avatar-hint {
    font-size: 12rpx;
    color: $gray-light;
    margin-top: 8rpx;
  }
}

.nickname-section {
  width: 100%;
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
    background-color: #f8f8f8;
    padding: 0 24rpx;
    font-size: 16rpx;
    border: 2rpx solid #f0e8e0;
    box-sizing: border-box;

    &:focus {
      border-color: $purple-light;
      background-color: #ffffff;
    }
  }
}
</style>
