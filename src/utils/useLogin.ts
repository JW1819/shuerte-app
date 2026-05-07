import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'

export function useLogin() {
  const userStore = useUserStore()
  const showLoginDialog = ref(false)
  const loginAvatarUrl = ref('')
  const loginNickName = ref('')

  function openLoginDialog() {
    loginAvatarUrl.value = (userStore.userInfo && userStore.userInfo.avatarUrl) || ''
    loginNickName.value = (userStore.userInfo && userStore.userInfo.nickName !== '游客') ? userStore.userInfo.nickName : ''
    showLoginDialog.value = true
  }

  function onChooseAvatar(e) {
    var detail = e.detail || {}
    var avatarUrl = detail.avatarUrl || detail.tempFilePath || ''
    if (!avatarUrl) {
      Taro.showToast({ title: '选择头像失败', icon: 'none' })
      return
    }
    if (!avatarUrl.startsWith('http') && !avatarUrl.startsWith('wxfile://')) {
      Taro.showToast({ title: '头像路径无效', icon: 'none' })
      return
    }
    async function saveAvatar(tempPath) {
      try {
        const fileInfo = await Taro.getFileInfo({ filePath: tempPath })
        if (!fileInfo.size) throw new Error('文件无效')
        const res = await Taro.saveFile({ tempFilePath: tempPath })
        loginAvatarUrl.value = res.savedFilePath
        console.log('头像保存成功:', res.savedFilePath)
      } catch (err) {
        console.error('头像保存失败:', err)
        loginAvatarUrl.value = tempPath
        Taro.showToast({ title: '头像保存失败，已使用临时路径', icon: 'none' })
        console.log('头像保存失败，使用临时路径:', tempPath)
      }
    }
    saveAvatar(avatarUrl)
  }

  function onNicknameInput(e) {
    loginNickName.value = e.detail.value
  }

  function confirmLogin() {
    if (!loginNickName.value.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' })
      return false
    }
    console.log('登录头像URL:', loginAvatarUrl.value)
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
