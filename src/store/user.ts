import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Taro from '@tarojs/taro'
import { getToday, LEVEL_CONFIG } from '@/utils/index'

const STORAGE_KEYS = {
  USER: 'shuerte_user',
  SCORES: 'shuerte_scores',
  SIGN_LOG: 'shuerte_sign_log',
  GAME_LOG: 'shuerte_game_log',
  IS_LOGIN: 'shuerte_is_login',
  USER_INFO: 'shuerte_user_info'
}

const MAX_GAME_LOG = 200

export const useUserStore = defineStore('user', () => {
  const isLogin = ref(false)
  const userInfo = ref({ nickName: '游客', avatarUrl: '', openId: '' })
  const continuousSign = ref(0)
  const totalGameCount = ref(0)
  const totalTime = ref(0)
  const lastSignDate = ref('')
  const signLog = ref<string[]>([])
  const scores = ref<Record<number, { bestTime: number; bestError: number }>>({})
  const gameLog = ref<Array<{ level: number; useTime: number; errorCount: number; createTime: string }>>([])

  function loadFromStorage() {
    try {
      const storedIsLogin = Taro.getStorageSync(STORAGE_KEYS.IS_LOGIN)
      const storedUserInfo = Taro.getStorageSync(STORAGE_KEYS.USER_INFO)
      const storedUser = Taro.getStorageSync(STORAGE_KEYS.USER)
      const storedScores = Taro.getStorageSync(STORAGE_KEYS.SCORES)
      const storedSignLog = Taro.getStorageSync(STORAGE_KEYS.SIGN_LOG)
      const storedGameLog = Taro.getStorageSync(STORAGE_KEYS.GAME_LOG)

      if (storedIsLogin && typeof storedIsLogin === 'boolean') isLogin.value = storedIsLogin
      if (storedUserInfo && typeof storedUserInfo === 'object') {
        const storedNickName = storedUserInfo.nickName
        const storedAvatar = storedUserInfo.avatarUrl
        const storedOpenId = storedUserInfo.openId
        if (storedUser && typeof storedUser === 'object' && storedUser.openId && !storedOpenId) {
          userInfo.value = {
            nickName: String(storedNickName || storedUser.nickName || '游客'),
            avatarUrl: String(storedAvatar || storedUser.avatarUrl || ''),
            openId: String(storedUser.openId || '')
          }
        } else {
          userInfo.value = {
            nickName: String(storedNickName || '游客'),
            avatarUrl: String(storedAvatar || ''),
            openId: String(storedOpenId || '')
          }
        }
      }
      if (storedUser) {
        continuousSign.value = storedUser.continuousSign || 0
        totalGameCount.value = storedUser.totalGameCount || 0
        totalTime.value = storedUser.totalTime || 0
        lastSignDate.value = storedUser.lastSignDate || ''
      }
      if (storedScores && typeof storedScores === 'object') {
        scores.value = storedScores
      } else {
        scores.value = {}
      }
      if (Array.isArray(storedSignLog)) {
        signLog.value = storedSignLog
      } else {
        signLog.value = []
      }
      if (Array.isArray(storedGameLog)) {
        gameLog.value = storedGameLog
      } else {
        gameLog.value = []
      }
    } catch (e) {
      console.error('loadFromStorage error', e)
    }
  }

  function saveToStorage() {
    try {
      Taro.setStorageSync(STORAGE_KEYS.IS_LOGIN, isLogin.value)
      Taro.setStorageSync(STORAGE_KEYS.USER_INFO, userInfo.value)
      Taro.setStorageSync(STORAGE_KEYS.USER, {
        continuousSign: continuousSign.value,
        totalGameCount: totalGameCount.value,
        totalTime: totalTime.value,
        lastSignDate: lastSignDate.value
      })
      Taro.setStorageSync(STORAGE_KEYS.SCORES, scores.value)
      Taro.setStorageSync(STORAGE_KEYS.SIGN_LOG, signLog.value)
      Taro.setStorageSync(STORAGE_KEYS.GAME_LOG, gameLog.value)
    } catch (e) {
      console.error('saveToStorage error', e)
    }
  }

  const todaySigned = computed(() => {
    const today = getToday()
    return signLog.value.includes(today)
  })

  function signIn() {
    const today = getToday()
    if (signLog.value.includes(today)) return false
    signLog.value.push(today)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    if (lastSignDate.value === yesterdayStr) {
      continuousSign.value += 1
    } else {
      continuousSign.value = 1
    }
    lastSignDate.value = today
    saveToStorage()
    return true
  }

  function saveGameResult(level: number, useTime: number, errorCount: number) {
    totalGameCount.value += 1
    totalTime.value += useTime
    gameLog.value.push({
      level,
      useTime,
      errorCount,
      createTime: new Date().toISOString()
    })
    if (gameLog.value.length > MAX_GAME_LOG) {
      gameLog.value = gameLog.value.slice(-MAX_GAME_LOG)
    }
    const existing = scores.value[level]
    if (!existing || useTime < existing.bestTime || (useTime === existing.bestTime && errorCount < existing.bestError)) {
      scores.value[level] = { bestTime: useTime, bestError: errorCount }
    }
    saveToStorage()
    if (isLogin.value) {
      syncToCloud()
    }
  }

  function getBestTime(level: number): number | null {
    const score = scores.value[level]
    if (!score) return null
    return score.bestTime
  }

  function getBestError(level: number): number | null {
    const score = scores.value[level]
    if (!score) return null
    return score.bestError
  }

  function hasBestRecord(level: number): boolean {
    return !!scores.value[level]
  }

  async function login(nickName: string, avatarUrl: string) {
    isLogin.value = true
    userInfo.value = { nickName, avatarUrl, openId: '' }
    saveToStorage()

    try {
      if (Taro.cloud) {
        const loginRes = await Taro.cloud.callFunction({ name: 'login' })
        if (loginRes.result && loginRes.result.openId) {
          userInfo.value.openId = loginRes.result.openId
          saveToStorage()
        }
      }
    } catch (e) {
      console.error('login cloud function error', e)
    }

    syncToCloud()
  }

  async function syncToCloud() {
    if (!isLogin.value || !Taro.cloud) return

    try {
      await Taro.cloud.callFunction({
        name: 'syncData',
        data: {
          openId: userInfo.value.openId,
          nickName: userInfo.value.nickName,
          avatarUrl: userInfo.value.avatarUrl,
          scores: scores.value,
          continuousSign: continuousSign.value,
          totalGameCount: totalGameCount.value,
          totalTime: totalTime.value,
          signLog: signLog.value
        }
      })
    } catch (e) {
      console.error('syncToCloud error', e)
    }
  }

  function logout() {
    isLogin.value = false
    userInfo.value = { nickName: '游客', avatarUrl: '', openId: '' }
    saveToStorage()
  }

  function refreshUserInfo() {
    loadFromStorage()
  }

  loadFromStorage()

  return {
    isLogin,
    userInfo,
    continuousSign,
    totalGameCount,
    totalTime,
    lastSignDate,
    signLog,
    scores,
    gameLog,
    todaySigned,
    signIn,
    saveGameResult,
    getBestTime,
    getBestError,
    hasBestRecord,
    login,
    logout,
    refreshUserInfo,
    loadFromStorage,
    saveToStorage,
    syncToCloud
  }
})
