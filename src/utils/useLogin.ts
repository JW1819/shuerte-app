import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'

type LoginSuccessHandler = () => void

const showLoginDialog = ref(false)
const loginAvatarUrl = ref('')
const loginNickName = ref('')
let pendingSuccessHandler: LoginSuccessHandler | null = null

export function useLogin() {
  const userStore = useUserStore()

  function openLoginDialog(onLoggedIn?: LoginSuccessHandler) {
    pendingSuccessHandler = onLoggedIn ?? null
    loginAvatarUrl.value = (userStore.userInfo && userStore.userInfo.avatarUrl) || ''
    loginNickName.value =
      userStore.userInfo && userStore.userInfo.nickName !== '游客' ? userStore.userInfo.nickName : ''
    showLoginDialog.value = true
  }

  function onChooseAvatar(e: { detail?: { avatarUrl?: string; tempFilePath?: string } }) {
    const detail = e.detail || {}
    const avatarUrl = detail.avatarUrl || detail.tempFilePath || ''
    if (!avatarUrl) {
      Taro.showToast({ title: '选择头像失败', icon: 'none' })
      return
    }
    if (!avatarUrl.startsWith('http') && !avatarUrl.startsWith('wxfile://')) {
      Taro.showToast({ title: '头像路径无效', icon: 'none' })
      return
    }
    async function saveAvatar(tempPath: string) {
      try {
        const fileInfo = await Taro.getFileInfo({ filePath: tempPath })
        if (!fileInfo.size) throw new Error('文件无效')
        const res = await Taro.saveFile({ tempFilePath: tempPath })
        loginAvatarUrl.value = res.savedFilePath
      } catch {
        loginAvatarUrl.value = tempPath
        Taro.showToast({ title: '头像保存失败，已使用临时路径', icon: 'none' })
      }
    }
    saveAvatar(avatarUrl)
  }

  function onNicknameInput(e: { detail?: { value?: string } }) {
    loginNickName.value = e.detail?.value ?? ''
  }

  function confirmLogin(): boolean {
    if (!loginNickName.value.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' })
      return false
    }
    userStore.login(loginNickName.value.trim(), loginAvatarUrl.value)
    showLoginDialog.value = false
    const cb = pendingSuccessHandler
    pendingSuccessHandler = null
    cb?.()
    Taro.showToast({ title: '登录成功', icon: 'none' })
    return true
  }

  function cancelLogin() {
    showLoginDialog.value = false
    pendingSuccessHandler = null
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
