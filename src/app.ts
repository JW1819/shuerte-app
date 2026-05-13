import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Taro from '@tarojs/taro'
import './app.scss'

const App = createApp({
  onLaunch() {
    if (Taro.cloud) {
      Taro.cloud.init({
        env: 'cloud1-d7g92q5ti56030287',
        traceUser: true
      })
    }
  }
})

App.use(createPinia())

export default App
