const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const COST = 50
const RATE_LIMIT_PER_MIN = 30
const HONEY_LIMIT = 10

// 6 个奖项(id 对应转盘扇区 0-5)
const PRIZES = [
  { id: 0, name: '谢谢惠顾', value: 0,   isLose: true },
  { id: 1, name: '30积分',   value: 30 },
  { id: 2, name: '50积分',   value: 50 },
  { id: 3, name: '100积分',  value: 100 },
  { id: 4, name: '150积分',  value: 150 },
  { id: 5, name: '300积分',  value: 300, isJackpot: true }
]

// 蜜月期奖包(共 10 次,洗牌后随机抽取)
const HONEY_BAG_TEMPLATE = [
  { id: 1 }, { id: 1 }, { id: 1 },
  { id: 2 }, { id: 2 },
  { id: 3 }, { id: 3 },
  { id: 4 },
  { id: 5 },
  { id: 0, isLose: true }
]

// 收割期波次
const HARVEST_LOSS_MIN = 3
const HARVEST_LOSS_MAX = 8
const HARVEST_WIN_MIN = 1
const HARVEST_WIN_MAX = 2

// 限流 Map
const rateLimitMap = new Map()
function checkRateLimit(openId) {
  const now = Date.now()
  const records = rateLimitMap.get(openId) || []
  const recent = records.filter(t => now - t < 60000)
  if (recent.length >= RATE_LIMIT_PER_MIN) return false
  recent.push(now)
  rateLimitMap.set(openId, recent)
  if (rateLimitMap.size > 1000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.every(t => now - t > 60000)) rateLimitMap.delete(k)
    }
  }
  return true
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDefaultLotteryState() {
  return {
    totalDraws: 0,
    honeyBag: [],
    harvestState: null,
    burstSize: 0,
    burstCounter: 0
  }
}

function ensureHoneyBag(state) {
  if (!state.honeyBag || state.honeyBag.length === 0) {
    state.honeyBag = shuffle(HONEY_BAG_TEMPLATE)
  }
}

function pickHoneyPrize(state) {
  ensureHoneyBag(state)
  const slot = state.honeyBag.pop()
  return PRIZES.find(p => p.id === (slot.isLose ? 0 : slot.id))
}

function pickHarvestPrize(state) {
  if (!state.harvestState || state.burstCounter >= state.burstSize) {
    // 开新波次
    if (state.harvestState === 'win') {
      state.harvestState = 'loss'
      state.burstSize = HARVEST_LOSS_MIN + Math.floor(Math.random() * (HARVEST_LOSS_MAX - HARVEST_LOSS_MIN + 1))
    } else {
      state.harvestState = 'loss'
      state.burstSize = HARVEST_LOSS_MIN + Math.floor(Math.random() * (HARVEST_LOSS_MAX - HARVEST_LOSS_MIN + 1))
    }
    state.burstCounter = 0
  }
  state.burstCounter++

  if (state.harvestState === 'loss') {
    return { prize: PRIZES[0], burstInfo: { state: 'loss', remain: state.burstSize - state.burstCounter, total: state.burstSize } }
  } else {
    const prize = Math.random() < 0.5 ? PRIZES[1] : PRIZES[2]
    return { prize, burstInfo: { state: 'win', remain: state.burstSize - state.burstCounter, total: state.burstSize } }
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  if (!openId) {
    return { success: false, error: 'unauthenticated' }
  }

  if (!checkRateLimit(openId)) {
    return { success: false, error: 'rate limit exceeded' }
  }

  try {
    const userRes = await db.collection('users').where({ openId }).get()
    if (userRes.data.length === 0) {
      return { success: false, error: 'user not found' }
    }
    const user = userRes.data[0]

    const points = typeof user.points === 'number' ? user.points : 0
    if (points < COST) {
      return { success: false, error: 'insufficient points', points }
    }

    const history = Array.isArray(user.lotteryHistory) ? user.lotteryHistory : []
    const state = Object.assign(getDefaultLotteryState(), user.lotteryState || {})

    let prize, burstInfo = null
    if (state.totalDraws < HONEY_LIMIT) {
      prize = pickHoneyPrize(state)
    } else {
      const result = pickHarvestPrize(state)
      prize = result.prize
      burstInfo = result.burstInfo
    }
    state.totalDraws++

    const newPoints = points - COST + (prize.value || 0)
    const newHistory = history.concat([{
      prize: prize.id,
      time: new Date().toISOString()
    }]).slice(-50)  // 保留最近 50 条

    // 用 update + 原子操作
    await db.collection('users').doc(user._id).update({
      data: {
        points: newPoints,
        totalSpent: _.inc(COST),
        totalEarned: _.inc(prize.value || 0),
        lotteryState: state,
        lotteryHistory: newHistory,
        updateTime: db.serverDate()
      }
    })

    return {
      success: true,
      prize: {
        id: prize.id,
        name: prize.name,
        value: prize.value || 0,
        isLose: !!prize.isLose
      },
      pointsAfter: newPoints,
      totalDraws: state.totalDraws,
      burstInfo
    }
  } catch (e) {
    console.error('lotteryDraw error', e)
    return { success: false, error: e.message }
  }
}
