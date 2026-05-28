const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const MAX_LIMIT = 100

async function fetchAllScores(level, pageSize) {
  const countRes = await db.collection('scores').where({ level }).count()
  const total = countRes.total

  if (total === 0) return { data: [], total }

  const batchSize = Math.min(pageSize, MAX_LIMIT)
  const dataPromise = db.collection('scores')
    .where({ level })
    .orderBy('bestTime', 'asc')
    .limit(batchSize)
    .field({ nickName: true, bestTime: true, bestError: true })
    .get()

  const dataRes = await dataPromise
  return { data: dataRes.data, total }
}

exports.main = async (event) => {
  const { level, myOpenId } = event

  try {
    const tasks = []

    const dataPromise = fetchAllScores(level, 50)
    tasks.push(dataPromise)

    if (myOpenId) {
      const userScorePromise = db.collection('scores')
        .where({ openId: myOpenId, level })
        .field({ bestTime: true })
        .get()
      tasks.push(userScorePromise)
    }

    const results = await Promise.all(tasks)

    const { data: rankingData, total } = results[0]
    const userScoreRes = results.length > 1 ? results[1] : undefined

    let myRank = 0
    if (myOpenId && userScoreRes && userScoreRes.data.length > 0) {
      const myBestTime = userScoreRes.data[0].bestTime
      const rankRes = await db.collection('scores')
        .where({ level, bestTime: _.lt(myBestTime) })
        .count()
      myRank = rankRes.total + 1
    }

    return {
      success: true,
      data: rankingData,
      total,
      myRank
    }
  } catch (e) {
    console.error('getRanking error', e)
    return { success: false, error: e.message, data: [], total: 0, myRank: 0 }
  }
}
