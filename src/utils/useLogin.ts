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
    loginAvatarUrl.value = e.detail.avatarUrl
  }

  function onNicknameInput(e) {
    loginNickName.value = e.detail.value
  }

  function confirmLogin() {
    if (!loginNickName.value.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' })
      return false
    }
    userStore.login(loginNickName.value.trim(), loginAvatarUrl.value)
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
