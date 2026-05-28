import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/store/user'

type LoginSuccessHandler = () => void

const showLoginDialog = ref(false)
const loginAvatarUrl = ref('')
const loginAvatarFileId = ref('')
const loginNickName = ref('')
const privacyAuthorized = ref(false)
let pendingSuccessHandler: LoginSuccessHandler | null = null

const PRIVACY_AUTH_KEY = 'shuerte_privacy_auth'

function requirePrivacy(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof Taro.requirePrivacyAuthorize === 'function') {
      Taro.requirePrivacyAuthorize({
        success: () => resolve(true),
        fail: () => resolve(false)
      })
    } else {
      resolve(true)
    }
  })
}

function loadPrivacyAuth(): boolean {
  try {
    return Taro.getStorageSync(PRIVACY_AUTH_KEY) === true
  } catch {
    return false
  }
}

function savePrivacyAuth(authorized: boolean) {
  try {
    Taro.setStorageSync(PRIVACY_AUTH_KEY, authorized)
  } catch {
    // ignore
  }
}

export function useLogin() {
  const userStore = useUserStore()

  async function openLoginDialog(onLoggedIn?: LoginSuccessHandler) {
    pendingSuccessHandler = onLoggedIn ?? null
    loginAvatarUrl.value = (userStore.userInfo && userStore.userInfo.avatarUrl) || ''
    loginNickName.value =
      userStore.userInfo && userStore.userInfo.nickName !== '游客' ? userStore.userInfo.nickName : ''

    const cachedAuth = loadPrivacyAuth()
    if (cachedAuth) {
      privacyAuthorized.value = true
      showLoginDialog.value = true
      return
    }

    const authorized = await requirePrivacy()
    if (!authorized) {
      Taro.showToast({ title: '需要同意隐私协议才能登录', icon: 'none' })
      return
    }
    savePrivacyAuth(true)
    privacyAuthorized.value = true
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
        try {
          const res = await Taro.saveFile({ tempFilePath: avatarUrl })
          loginAvatarUrl.value = (res as { savedFilePath: string }).savedFilePath || avatarUrl
        } catch (err) {
          console.error('save file error', err)
          loginAvatarUrl.value = avatarUrl
        }
        Taro.hideLoading()
        return
      }

      let fileInfoSize = 0
      try {
        const fileInfo = await Taro.getFileInfo({ filePath: avatarUrl })
        fileInfoSize = (fileInfo as { size: number }).size || 0
      } catch (err) {
        console.error('getFileInfo error', err)
        fileInfoSize = 0
      }
      if (!fileInfoSize) throw new Error('文件无效')

      const cloudPath = `avatars/${Date.now()}_${Math.random().toString(36).substring(2, 11)}.png`
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
        } catch (err) {
          console.error('getTempFileURL error', err)
          loginAvatarUrl.value = uploadRes.fileID
        }
      } else {
        throw new Error('上传失败')
      }

      Taro.hideLoading()
    } catch (err) {
      console.error('avatar upload error', err)
      Taro.hideLoading()
      try {
        const res = await Taro.saveFile({ tempFilePath: avatarUrl })
        loginAvatarUrl.value = (res as { savedFilePath: string }).savedFilePath || avatarUrl
      } catch (saveErr) {
        console.error('save file fallback error', saveErr)
        loginAvatarUrl.value = avatarUrl
      }
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
    privacyAuthorized.value = false
    pendingSuccessHandler = null
  }

  return {
    showLoginDialog,
    loginAvatarUrl,
    loginNickName,
    privacyAuthorized,
    openLoginDialog,
    onChooseAvatar,
    onNicknameInput,
    confirmLogin,
    cancelLogin
  }
}
