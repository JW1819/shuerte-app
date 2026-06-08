const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const VALID_LEVELS = [3, 4, 5, 6, 7, 8]
const RATE_LIMIT_PER_MIN = 10
const TOP3_BONUS = 10

// 限流
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

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  if (!openId) return { success: false, error: 'unauthenticated' }
  if (!checkRateLimit(openId)) return { success: false, error: 'rate limit exceeded' }

  const { level } = event
  if (!VALID_LEVELS.includes(Number(level))) {
    return { success: false, error: 'invalid level' }
  }
  const targetLevel = Number(level)

  try {
    const userRes = await db.collection('users').where({ openId }).get()
    if (userRes.data.length === 0) {
      return { success: false, error: 'user not found' }
    }
    const user = userRes.data[0]

    const today = getTodayStr()

    // 防刷:同一天同一用户只领一次
    if (user.lastTop3BonusDate === today) {
      return { success: false, error: 'already_claimed_today', lastDate: today }
    }

    // 查询该难度的排名
    const userScoreRes = await db.collection('scores')
      .where({ openId, level: targetLevel })
      .field({ bestTime: true })
      .get()

    if (userScoreRes.data.length === 0) {
      return { success: false, error: 'no_record_in_level', level: targetLevel }
    }

    const myBestTime = userScoreRes.data[0].bestTime
    const rankRes = await db.collection('scores')
      .where({ level: targetLevel, bestTime: _.lt(myBestTime) })
      .count()
    const myRank = rankRes.total + 1

    if (myRank > 3) {
      return { success: false, error: 'not_top3', rank: myRank, level: targetLevel }
    }

    // 校验通过,发奖
    const currentPoints = typeof user.points === 'number' ? user.points : 0
    const newPoints = currentPoints + TOP3_BONUS
    const newTotalEarned = (typeof user.totalEarned === 'number' ? user.totalEarned : 0) + TOP3_BONUS

    await db.collection('users').doc(user._id).update({
      data: {
        points: newPoints,
        totalEarned: newTotalEarned,
        lastTop3BonusDate: today,
        updateTime: db.serverDate()
      }
    })

    return {
      success: true,
      rank: myRank,
      level: targetLevel,
      bonus: TOP3_BONUS,
      pointsAfter: newPoints,
      date: today
    }
  } catch (e) {
    console.error('claimTop3Bonus error', e)
    return { success: false, error: e.message }
  }
}
