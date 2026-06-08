const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const MAX_LIMIT = 100
const VALID_LEVELS = [3, 4, 5, 6, 7, 8]
const RANKING_PAGE_SIZE = 50

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function fetchTopScores(level) {
  const countRes = await db.collection('scores').where({ level }).count()
  const total = countRes.total

  if (total === 0) return { data: [], total }

  const dataRes = await db.collection('scores')
    .where({ level })
    .orderBy('bestTime', 'asc')
    .limit(RANKING_PAGE_SIZE)
    .field({ nickName: true, bestTime: true, bestError: true, openId: true })
    .get()

  return { data: dataRes.data, total }
}

async function fetchUserRank(level, openId) {
  const userScoreRes = await db.collection('scores')
    .where({ openId, level })
    .field({ bestTime: true })
    .get()

  if (userScoreRes.data.length === 0) return 0

  const myBestTime = userScoreRes.data[0].bestTime
  const rankRes = await db.collection('scores')
    .where({ level, bestTime: _.lt(myBestTime) })
    .count()
  return rankRes.total + 1
}

// 取用户在 users 表里的 lastTop3BonusDate,并判断今日是否已领
// 让前端 banner 状态以云端为准,避免本地缓存和云端不一致时按钮"看似可点但点了报错"
async function fetchUserTop3Status(openId) {
  const userRes = await db.collection('users').where({ openId }).field({ lastTop3BonusDate: true }).get()
  if (userRes.data.length === 0) {
    return { lastTop3BonusDate: '', claimedToday: false }
  }
  const lastTop3BonusDate = userRes.data[0].lastTop3BonusDate || ''
  const today = getTodayStr()
  return { lastTop3BonusDate, claimedToday: lastTop3BonusDate === today }
}

exports.main = async (event) => {
  const { level } = event
  // 关键:从 wxContext 取调用者身份,不信任客户端传的 myOpenId
  const wxContext = cloud.getWXContext()
  const myOpenId = wxContext.OPENID || ''

  if (!VALID_LEVELS.includes(Number(level))) {
    return { success: false, error: 'invalid level', data: [], total: 0, myRank: 0, myLastTop3BonusDate: '', myClaimedToday: false }
  }

  try {
    const { data: rankingData, total } = await fetchTopScores(Number(level))
    const myRank = myOpenId ? await fetchUserRank(Number(level), myOpenId) : 0
    const top3Status = myOpenId
      ? await fetchUserTop3Status(myOpenId)
      : { lastTop3BonusDate: '', claimedToday: false }

    return {
      success: true,
      data: rankingData,
      total,
      myRank,
      myLastTop3BonusDate: top3Status.lastTop3BonusDate,
      myClaimedToday: top3Status.claimedToday
    }
  } catch (e) {
    console.error('getRanking error', e)
    return { success: false, error: e.message, data: [], total: 0, myRank: 0, myLastTop3BonusDate: '', myClaimedToday: false }
  }
}
