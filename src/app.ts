import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Taro from '@tarojs/taro'
import './app.scss'

const App = createApp({
  onLaunch() {
    if (Taro.cloud) {
      Taro.cloud.init({
        env: 'shuerte-cloud',
        traceUser: true
      })
    }
  }
})

App.use(createPinia())

export default App
