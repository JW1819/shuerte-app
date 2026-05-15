import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'

type LoginSuccessHandler = () => void

const showLoginDialog = ref(false)
const loginAvatarUrl = ref('')
const loginAvatarFileId = ref('')
const loginNickName = ref('')
let pendingSuccessHandler: LoginSuccessHandler | null = null

export function useLogin() {
  const userStore = useUserStore()

  function openLoginDialog(onLoggedIn?: LoginSuccessHandler) {
    pendingSuccessHandler = onLoggedIn !== null && onLoggedIn !== undefined ? onLoggedIn : null
    loginAvatarUrl.value = (userStore.userInfo && userStore.userInfo.avatarUrl) || ''
    loginNickName.value =
      userStore.userInfo && userStore.userInfo.nickName !== '游客' ? userStore.userInfo.nickName : ''
    showLoginDialog.value = true
  }

  async function onChooseAvatar(e: { detail?: { avatarUrl?: string; tempFilePath?: string } }) {
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

    try {
      Taro.showLoading({ title: '上传头像中...' })
      
      if (!Taro.cloud) {
        const res = await Taro.saveFile({ tempFilePath: avatarUrl })
          .catch(() => ({ savedFilePath: avatarUrl }))
        loginAvatarUrl.value = res.savedFilePath || avatarUrl
        Taro.hideLoading()
        return
      }

      const fileInfo = await Taro.getFileInfo({ filePath: avatarUrl })
      if (!fileInfo.size) throw new Error('文件无效')

      const cloudPath = `avatars/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`
      const uploadRes = await Taro.cloud.uploadFile({
        cloudPath,
        filePath: avatarUrl
      })

      if (uploadRes.fileID) {
        loginAvatarFileId.value = uploadRes.fileID
        try {
          const downloadRes = await Taro.cloud.getTempFileURL({
            fileList: [uploadRes.fileID]
          })
          if (downloadRes.fileList && downloadRes.fileList[0] && downloadRes.fileList[0].tempFileURL) {
            loginAvatarUrl.value = downloadRes.fileList[0].tempFileURL
          } else {
            loginAvatarUrl.value = uploadRes.fileID
          }
        } catch (e) {
          console.log('getTempFileURL failed, using fileID')
          loginAvatarUrl.value = uploadRes.fileID
        }
      } else {
        throw new Error('上传失败')
      }

      Taro.hideLoading()
    } catch (err) {
      console.error('avatar upload error', err)
      Taro.hideLoading()
      const res = await Taro.saveFile({ tempFilePath: avatarUrl }).catch(() => ({ savedFilePath: avatarUrl }))
      loginAvatarUrl.value = res.savedFilePath || avatarUrl
      Taro.showToast({ title: '头像上传失败，已使用本地路径', icon: 'none' })
    }
  }

  function onNicknameInput(e: { detail?: { value?: string } }) {
    loginNickName.value = e.detail && e.detail.value !== undefined ? e.detail.value : ''
  }

  function confirmLogin(): boolean {
    if (!loginNickName.value.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' })
      return false
    }
    const avatarToSave = loginAvatarFileId.value || loginAvatarUrl.value
    userStore.login(loginNickName.value.trim(), avatarToSave)
    loginAvatarFileId.value = ''
    showLoginDialog.value = false
    const cb = pendingSuccessHandler
    pendingSuccessHandler = null
    if (cb) {
      cb()
    }
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
