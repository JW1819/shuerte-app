import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Taro from '@tarojs/taro'
import { getToday, cloudCall } from '@/utils/index'
import type { GridCell2D } from '@/utils/index'

const STORAGE_KEYS = {
  USER: 'shuerte_user',
  SCORES: 'shuerte_scores',
  SIGN_LOG: 'shuerte_sign_log',
  GAME_LOG: 'shuerte_game_log',
  IS_LOGIN: 'shuerte_is_login',
  USER_INFO: 'shuerte_user_info',
  LAST_GAME: 'shuerte_last_game',
  POINTS: 'shuerte_points',
  TOTAL_EARNED: 'shuerte_total_earned',
  TOTAL_SPENT: 'shuerte_total_spent',
  LOTTERY_STATE: 'shuerte_lottery_state',
  LOTTERY_HISTORY: 'shuerte_lottery_history',
  EXCHANGE_HISTORY: 'shuerte_exchange_history',
  LAST_SIGN_REWARD: 'shuerte_last_sign_reward',
  LAST_TOP3_BONUS_DATE: 'shuerte_last_top3_bonus_date'
}

interface LastGame {
  level: number
  useTime: number
  errorCount: number
  grid: GridCell2D
  createTime: string
}

interface LotteryState {
  totalDraws: number
  honeyBag: number[]
  harvestState: 'loss' | 'win' | null
  burstSize: number
  burstCounter: number
}

interface LotteryHistoryItem {
  prize: number
  time: string
}

interface ShippingInfo {
  name: string
  phone: string
  region: string
  address: string
}

interface ExchangeHistoryItem {
  itemId: string
  itemName: string
  points: number
  time: string
  shipping?: ShippingInfo
}

const DEFAULT_LOTTERY_STATE: LotteryState = {
  totalDraws: 0,
  honeyBag: [],
  harvestState: null,
  burstSize: 0,
  burstCounter: 0
}

const MAX_HISTORY = 50
const MAX_GAME_LOG = 200
const SYNC_DEBOUNCE_MS = 3000
let syncTimer: ReturnType<typeof setTimeout> | null = null
let lastSyncedData: string | null = null
let initialized = false

function stringFingerprint(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0
  }
  return h >>> 0
}

function computeSyncSignature(data: {
  nickName: string
  avatarUrl: string
  continuousSign: number
  totalGameCount: number
  totalTime: number
  signLog: string[]
  scores: Record<number, { bestTime: number; bestError: number }>
}): string {
  const scoreKeys = Object.keys(data.scores).sort()
  const scoreSig = scoreKeys
    .map(k => `${k}:${data.scores[Number(k)].bestTime}:${data.scores[Number(k)].bestError}`)
    .join(',')
  return [
    stringFingerprint(data.nickName),
    stringFingerprint(data.avatarUrl),
    data.continuousSign,
    data.totalGameCount,
    data.totalTime,
    data.signLog.length,
    stringFingerprint(scoreSig)
  ].join('#')
}

function safeArray<T>(val: unknown, max: number): T[] {
  if (!Array.isArray(val)) return []
  return val.slice(-max) as T[]
}

function safeObject<T>(val: unknown, fallback: T): T {
  return val && typeof val === 'object' ? (val as T) : fallback
}

function safeNumber(val: unknown): number {
  return typeof val === 'number' && Number.isFinite(val) ? val : 0
}

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
  const lastGame = ref<LastGame | null>(null)
  const pendingRankingLevel = ref<number | null>(null)
  const loadError = ref<string | null>(null)

  // 积分系统
  const points = ref(0)
  const totalEarned = ref(0)
  const totalSpent = ref(0)
  const lotteryState = ref<LotteryState>({ ...DEFAULT_LOTTERY_STATE })
  const lotteryHistory = ref<LotteryHistoryItem[]>([])
  const exchangeHistory = ref<ExchangeHistoryItem[]>([])
  const lastSignReward = ref(0)
  const lastTop3BonusDate = ref('')

  function loadFromStorage() {
    try {
      const storedIsLogin = Taro.getStorageSync(STORAGE_KEYS.IS_LOGIN)
      const storedUserInfo = Taro.getStorageSync(STORAGE_KEYS.USER_INFO)
      const storedUser = Taro.getStorageSync(STORAGE_KEYS.USER)
      const storedScores = Taro.getStorageSync(STORAGE_KEYS.SCORES)
      const storedSignLog = Taro.getStorageSync(STORAGE_KEYS.SIGN_LOG)
      const storedGameLog = Taro.getStorageSync(STORAGE_KEYS.GAME_LOG)
      const storedLastGame = Taro.getStorageSync(STORAGE_KEYS.LAST_GAME)
      const storedPoints = Taro.getStorageSync(STORAGE_KEYS.POINTS)
      const storedTotalEarned = Taro.getStorageSync(STORAGE_KEYS.TOTAL_EARNED)
      const storedTotalSpent = Taro.getStorageSync(STORAGE_KEYS.TOTAL_SPENT)
      const storedLotteryState = Taro.getStorageSync(STORAGE_KEYS.LOTTERY_STATE)
      const storedLotteryHistory = Taro.getStorageSync(STORAGE_KEYS.LOTTERY_HISTORY)
      const storedExchangeHistory = Taro.getStorageSync(STORAGE_KEYS.EXCHANGE_HISTORY)
      const storedLastSignReward = Taro.getStorageSync(STORAGE_KEYS.LAST_SIGN_REWARD)

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
      scores.value = storedScores && typeof storedScores === 'object' ? storedScores : {}
      signLog.value = Array.isArray(storedSignLog) ? storedSignLog : []
      gameLog.value = Array.isArray(storedGameLog) ? storedGameLog : []
      if (storedLastGame && typeof storedLastGame === 'object' && Array.isArray(storedLastGame.grid)) {
        lastGame.value = storedLastGame
      }
      points.value = safeNumber(storedPoints)
      totalEarned.value = safeNumber(storedTotalEarned)
      totalSpent.value = safeNumber(storedTotalSpent)
      lotteryState.value = Object.assign({ ...DEFAULT_LOTTERY_STATE }, safeObject(storedLotteryState, DEFAULT_LOTTERY_STATE))
      lotteryHistory.value = safeArray<LotteryHistoryItem>(storedLotteryHistory, MAX_HISTORY)
      exchangeHistory.value = safeArray<ExchangeHistoryItem>(storedExchangeHistory, MAX_HISTORY)
      lastSignReward.value = safeNumber(storedLastSignReward)

      const storedTop3Date = Taro.getStorageSync(STORAGE_KEYS.LAST_TOP3_BONUS_DATE)
      if (typeof storedTop3Date === 'string') {
        lastTop3BonusDate.value = storedTop3Date
      }

      loadError.value = null
    } catch (e) {
      loadError.value = String(e)
      console.error('[userStore] loadFromStorage error', e)
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
      Taro.setStorageSync(STORAGE_KEYS.LAST_GAME, lastGame.value)
      Taro.setStorageSync(STORAGE_KEYS.POINTS, points.value)
      Taro.setStorageSync(STORAGE_KEYS.TOTAL_EARNED, totalEarned.value)
      Taro.setStorageSync(STORAGE_KEYS.TOTAL_SPENT, totalSpent.value)
      Taro.setStorageSync(STORAGE_KEYS.LOTTERY_STATE, lotteryState.value)
      Taro.setStorageSync(STORAGE_KEYS.LOTTERY_HISTORY, lotteryHistory.value)
      Taro.setStorageSync(STORAGE_KEYS.EXCHANGE_HISTORY, exchangeHistory.value)
      Taro.setStorageSync(STORAGE_KEYS.LAST_SIGN_REWARD, lastSignReward.value)
      Taro.setStorageSync(STORAGE_KEYS.LAST_TOP3_BONUS_DATE, lastTop3BonusDate.value)
    } catch (e) {
      console.error('[userStore] saveToStorage error', e)
    }
  }

  const todaySigned = computed(() => {
    const today = getToday()
    return signLog.value.includes(today)
  })

  // 7 天周期:第 1 天 +1, 第 2 天 +2, ..., 第 7 天 +7, 第 8 天重置为 +1
  const cycleDay = computed(() => {
    if (continuousSign.value <= 0) return 0
    return ((continuousSign.value - 1) % 7) + 1
  })

  // === 积分管理 ===
  function addPoints(amount: number, reason: string) {
    if (amount <= 0) return
    points.value += amount
    totalEarned.value += amount
    console.log(`[userStore] +${amount} (${reason}), total: ${points.value}`)
  }

  function spendPoints(amount: number) {
    if (amount > points.value) {
      throw new Error(`insufficient points: need ${amount}, have ${points.value}`)
    }
    points.value -= amount
    totalSpent.value += amount
  }

  function recordGameComplete() {
    addPoints(1, 'game_complete')
    saveToStorage()
  }

  function recordNewRecord() {
    addPoints(1, 'new_record')
    saveToStorage()
  }

  function applyLotteryResult(result) {
    if (!result || !result.success) return
    points.value = result.pointsAfter
    if (result.prize && result.prize.value > 0) {
      totalEarned.value += result.prize.value
    }
    if (result.prize && result.prize.isLose) {
      // 不加 totalSpent(已经在云端加了)
    }
    if (result.totalDraws != null) {
      lotteryState.value = Object.assign({}, lotteryState.value, { totalDraws: result.totalDraws })
    }
    if (result.prize) {
      lotteryHistory.value = lotteryHistory.value.concat([{
        prize: result.prize.id,
        time: new Date().toISOString()
      }]).slice(-MAX_HISTORY)
    }
    saveToStorage()
  }

  function applyExchangeResult(result, shipping?: ShippingInfo) {
    if (!result || !result.success) return
    points.value = result.pointsAfter
    totalSpent.value += result.item?.points || 0
    if (result.item) {
      const entry: ExchangeHistoryItem = {
        itemId: result.item.id,
        itemName: result.item.name,
        points: result.item.points,
        time: new Date().toISOString()
      }
      if (shipping) entry.shipping = shipping
      exchangeHistory.value = exchangeHistory.value.concat([entry]).slice(-MAX_HISTORY)
    }
    saveToStorage()
  }

  async function lotteryDraw() {
    if (!isLogin.value) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return { success: false, error: 'not logged in' }
    }
    if (points.value < 50) {
      Taro.showToast({ title: '积分不足', icon: 'none' })
      return { success: false, error: 'insufficient' }
    }
    try {
      const result = await cloudCall('lotteryDraw')
      if (result && result.success) {
        applyLotteryResult(result)
      }
      return result
    } catch (e) {
      console.error('[userStore] lotteryDraw error', e)
      Taro.showToast({ title: '抽奖失败', icon: 'none' })
      return { success: false, error: String(e) }
    }
  }

  async function exchange(itemId: string, shipping?: ShippingInfo) {
    if (!isLogin.value) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return { success: false, error: 'not logged in' }
    }
    try {
      const result = await cloudCall<{ success: boolean; error?: string } & Record<string, unknown>>(
        'exchange',
        { itemId, shipping: shipping || null }
      )
      if (result && result.success) {
        applyExchangeResult(result, shipping)
      }
      return result
    } catch (e) {
      console.error('[userStore] exchange error', e)
      Taro.showToast({ title: '兑换失败', icon: 'none' })
      return { success: false, error: String(e) }
    }
  }

  async function claimTop3Bonus(level: number) {
    if (!isLogin.value) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return { success: false, error: 'not_logged_in' }
    }
    try {
      const result = await cloudCall<{
        success: boolean
        rank?: number
        level?: number
        bonus?: number
        pointsAfter?: number
        date?: string
        error?: string
      }>('claimTop3Bonus', { level })
      if (result && result.success) {
        points.value = result.pointsAfter
        totalEarned.value += result.bonus || 0
        lastTop3BonusDate.value = result.date || ''
        saveToStorage()
      }
      return result
    } catch (e) {
      console.error('[userStore] claimTop3Bonus error', e)
      Taro.showToast({ title: '领取失败', icon: 'none' })
      return { success: false, error: String(e) }
    }
  }

  // === 签到 ===
  function signIn() {
    const today = getToday()
    if (signLog.value.includes(today)) {
      return { success: false, alreadySigned: true }
    }
    signLog.value.push(today)

    // 用 Date.parse 计算昨天日期,自动处理跨月/跨年
    const todayMs = Date.parse(today)
    const yesterdayMs = todayMs - 86400000
    const yesterdayDate = new Date(yesterdayMs)
    const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`

    if (lastSignDate.value === yesterdayStr) {
      continuousSign.value += 1
    } else {
      continuousSign.value = 1
    }
    lastSignDate.value = today

    // 7 天周期奖励
    const reward = ((continuousSign.value - 1) % 7) + 1
    addPoints(reward, `signin_day${reward}`)
    lastSignReward.value = reward
    saveToStorage()
    return { success: true, reward }
  }

  function saveGameResult(level: number, useTime: number, errorCount: number, grid?: GridCell2D) {
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
    const isNewRecord = !existing || useTime < existing.bestTime || (useTime === existing.bestTime && errorCount < existing.bestError)
    if (isNewRecord) {
      scores.value[level] = { bestTime: useTime, bestError: errorCount }
    }
    if (grid) {
      lastGame.value = {
        level,
        useTime,
        errorCount,
        grid: JSON.parse(JSON.stringify(grid)),
        createTime: new Date().toISOString()
      }
    }
    saveToStorage()
    if (isLogin.value) {
      syncToCloud()
    }
    return { isNewRecord }
  }

  function clearLastGame() {
    lastGame.value = null
  }

  function setPendingRankingLevel(lv: number) {
    pendingRankingLevel.value = lv
  }

  function consumePendingRankingLevel(): number | null {
    const lv = pendingRankingLevel.value
    pendingRankingLevel.value = null
    return lv
  }

  function getBestTime(level: number): number | null {
    const score = scores.value[level]
    if (!score) return null
    return score.bestTime
  }

  function getBestError(level: number): number {
    const score = scores.value[level]
    return score ? score.bestError : 0
  }

  function hasBestRecord(level: number): boolean {
    return !!scores.value[level]
  }

  async function login(nickName: string, avatarUrl: string) {
    isLogin.value = true
    userInfo.value = { nickName, avatarUrl, openId: '' }
    saveToStorage()

    try {
      const result = await cloudCall<{ openId?: string; errMsg?: string; error?: string }>('login')
      if (result && !result.errMsg && !result.error && result.openId) {
        userInfo.value.openId = String(result.openId)
        saveToStorage()
      } else if (result && (result.errMsg || result.error)) {
        console.error('login cloud function returned error', result)
      }
    } catch (e) {
      console.error('login cloud function error', e)
    }

    syncToCloud()
  }

  async function performSync() {
    if (!isLogin.value || !Taro.cloud) return

    const dataToSync = {
      nickName: userInfo.value.nickName,
      avatarUrl: userInfo.value.avatarUrl,
      scores: scores.value,
      continuousSign: continuousSign.value,
      totalGameCount: totalGameCount.value,
      totalTime: totalTime.value,
      signLog: signLog.value
    }

    const signature = computeSyncSignature(dataToSync)
    if (signature === lastSyncedData) {
      return
    }

    try {
      await cloudCall('syncData', dataToSync)
      lastSyncedData = signature
    } catch (e) {
      // 失败时清掉 lastSyncedData,下次重试(否则 signature 一致会被跳过)
      lastSyncedData = null
      console.error('[userStore] syncToCloud error', e)
    }
  }

  function syncToCloud() {
    if (syncTimer) {
      clearTimeout(syncTimer)
    }
    syncTimer = setTimeout(async () => {
      syncTimer = null
      await performSync()
    }, SYNC_DEBOUNCE_MS)
  }

  async function flushSync() {
    if (syncTimer) {
      clearTimeout(syncTimer)
      syncTimer = null
    }
    await performSync()
  }

  function clearAvatarUrl() {
    userInfo.value.avatarUrl = ''
    saveToStorage()
  }

  function logout() {
    isLogin.value = false
    userInfo.value = { nickName: '游客', avatarUrl: '', openId: '' }
    scores.value = {}
    signLog.value = []
    gameLog.value = []
    lastGame.value = null
    continuousSign.value = 0
    totalGameCount.value = 0
    totalTime.value = 0
    lastSignDate.value = ''
    lastSyncedData = null
    // 积分系统:登出时清空(避免跨账号混淆)
    points.value = 0
    totalEarned.value = 0
    totalSpent.value = 0
    lotteryState.value = { ...DEFAULT_LOTTERY_STATE }
    lotteryHistory.value = []
    exchangeHistory.value = []
    lastSignReward.value = 0
    lastTop3BonusDate.value = ''
    saveToStorage()
  }

  function refreshUserInfo() {
    loadFromStorage()
  }

  function initStore() {
    if (initialized) return
    initialized = true
    try {
      if (typeof Taro !== 'undefined' && typeof Taro.getStorageSync === 'function') {
        loadFromStorage()
      }
    } catch (e) {
      console.warn('Store initialization failed, will retry on first access')
      initialized = false
    }
  }

  initStore()

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
    lastGame,
    pendingRankingLevel,
    loadError,
    points,
    totalEarned,
    totalSpent,
    lotteryState,
    lotteryHistory,
    exchangeHistory,
    lastSignReward,
    lastTop3BonusDate,
    cycleDay,
    todaySigned,
    signIn,
    saveGameResult,
    clearLastGame,
    setPendingRankingLevel,
    consumePendingRankingLevel,
    getBestTime,
    getBestError,
    hasBestRecord,
    login,
    logout,
    clearAvatarUrl,
    addPoints,
    spendPoints,
    recordGameComplete,
    recordNewRecord,
    lotteryDraw,
    exchange,
    claimTop3Bonus,
    refreshUserInfo,
    loadFromStorage,
    saveToStorage,
    syncToCloud,
    flushSync,
    initStore
  }
})
