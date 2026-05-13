const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const MAX_LIMIT = 100

exports.main = async (event) => {
  const { level, page = 0, pageSize = 50, myOpenId } = event

  try {
    const countRes = await db.collection('scores')
      .where({ level })
      .count()

    const total = countRes.total
    const skip = page * pageSize

    let rankingData = []
    if (total <= MAX_LIMIT) {
      const res = await db.collection('scores')
        .where({ level })
        .orderBy('bestTime', 'asc')
        .skip(skip)
        .limit(Math.min(pageSize, MAX_LIMIT))
        .field({ nickName: true, avatarUrl: true, bestTime: true, bestError: true, openId: true })
        .get()
      rankingData = res.data
    } else {
      const batchTimes = Math.ceil(total / MAX_LIMIT)
      const tasks = []
      for (let i = 0; i < batchTimes; i++) {
        const promise = db.collection('scores')
          .where({ level })
          .orderBy('bestTime', 'asc')
          .skip(i * MAX_LIMIT)
          .limit(MAX_LIMIT)
          .field({ nickName: true, avatarUrl: true, bestTime: true, bestError: true, openId: true })
          .get()
        tasks.push(promise)
      }
      const allRes = await Promise.all(tasks)
      let allData = []
      for (const res of allRes) {
        allData = allData.concat(res.data)
      }
      allData.sort((a, b) => a.bestTime - b.bestTime)
      rankingData = allData.slice(skip, skip + pageSize)
    }

    let myRank = 0
    if (myOpenId) {
      const myScoreRes = await db.collection('scores')
        .where({ openId: myOpenId, level })
        .get()

      if (myScoreRes.data.length > 0) {
        const myBestTime = myScoreRes.data[0].bestTime
        const rankRes = await db.collection('scores')
          .where({ level, bestTime: _.lt(myBestTime) })
          .count()
        myRank = rankRes.total + 1
      }
    }

    const openIds = rankingData.map(item => item.openId).filter(Boolean)
    if (openIds.length > 0) {
      const usersRes = await db.collection('users')
        .where({ openId: _.in(openIds) })
        .field({ openId: true, avatarUrl: true, nickName: true })
        .get()

      const userMap = {}
      usersRes.data.forEach(user => {
        userMap[user.openId] = user
      })

      rankingData = rankingData.map(item => {
        const userInfo = userMap[item.openId]
        if (userInfo) {
          return {
            ...item,
            avatarUrl: userInfo.avatarUrl || item.avatarUrl,
            nickName: userInfo.nickName || item.nickName
          }
        }
        return item
      })
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
