import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'

export function useLogin() {
  const userStore = useUserStore()
  const showLoginDialog = ref(false)
  const loginAvatarUrl = ref('')
  const loginNickName = ref('')

  function openLoginDialog() {
    loginAvatarUrl.value = userStore.userInfo.avatarUrl || ''
    loginNickName.value = userStore.userInfo.nickName !== '游客' ? userStore.userInfo.nickName : ''
    showLoginDialog.value = true
  }

  function onChooseAvatar(e) {
    const avatarUrl = e.detail?.avatarUrl || e.detail?.tempFilePath || ''
    if (avatarUrl) {
      loginAvatarUrl.value = avatarUrl
    } else {
      Taro.showToast({ title: '选择头像失败', icon: 'none' })
    }
  }

  function onNicknameInput(e) {
    loginNickName.value = e.detail.value
  }

  function confirmLogin(avatar = '') {
    if (!loginNickName.value.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' })
      return false
    }
    const finalAvatar = avatar || loginAvatarUrl.value
    userStore.login(loginNickName.value.trim(), finalAvatar)
    showLoginDialog.value = false
    Taro.showToast({ title: '登录成功', icon: 'none' })
    return true
  }

  function cancelLogin() {
    showLoginDialog.value = false
  }

  return {
    showLoginDialog,
    loginAvatarUrl,
    loginNickName,
    openLoginDialog,
    onChooseAvatar,
    onNicknameInput,
    confirmLogin,
    cancelLogin
  }
}
