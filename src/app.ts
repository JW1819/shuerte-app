import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Taro from '@tarojs/taro'
import { CLOUD_ENV_ID } from '@/utils/index'
import { useUserStore } from '@/store/user'
import './app.scss'

const DEFAULT_SHARE_TITLE = '舒尔特方格 - 专注力训练'
const DEFAULT_SHARE_PATH = '/pages/index/index'

function resolveShareConfig(instance: any) {
  const custom = instance?.shareConfig
  return {
    title: custom?.title || DEFAULT_SHARE_TITLE,
    path: custom?.path || DEFAULT_SHARE_PATH
  }
}

const App = createApp({
  onLaunch() {
    if (Taro.cloud) {
      Taro.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      })
    }
  },
  onHide() {
    // 小程序切后台时立即 flush 待同步数据,避免 3s 防抖期间被杀进程
    try {
      useUserStore().flushSync()
    } catch (e) {
      // store 尚未初始化
    }
  },
  onShareAppMessage() {
    return { title: DEFAULT_SHARE_TITLE, path: DEFAULT_SHARE_PATH }
  },
  onShareTimeline() {
    return { title: DEFAULT_SHARE_TITLE }
  }
})

App.mixin({
  onShareAppMessage() {
    return resolveShareConfig(this)
  },
  onShareTimeline() {
    return { title: resolveShareConfig(this).title }
  }
})

const pinia = createPinia()
App.use(pinia)

export default App
