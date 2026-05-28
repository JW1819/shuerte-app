import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Taro from '@tarojs/taro'
import { CLOUD_ENV_ID } from '@/utils/index'
import './app.scss'

const App = createApp({
  onLaunch() {
    if (Taro.cloud) {
      Taro.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      })
    }
  }
})

const pinia = createPinia()
App.use(pinia)

export default App
