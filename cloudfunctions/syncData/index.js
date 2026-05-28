const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const { nickName, avatarUrl, scores, continuousSign, totalGameCount, totalTime, signLog } = event
  const wxContext = cloud.getWXContext()
  const userOpenId = wxContext.OPENID

  try {
    const userRes = await db.collection('users').where({ openId: userOpenId }).get()

    const userData = {
      openId: userOpenId,
      nickName: nickName || '用户',
      avatarUrl: avatarUrl || '',
      continuousSign: continuousSign || 0,
      totalGameCount: totalGameCount || 0,
      totalTime: totalTime || 0,
      signLog: signLog || [],
      updateTime: db.serverDate()
    }

    if (userRes.data.length > 0) {
      const existing = userRes.data[0]
      const hasChanges =
        userData.nickName !== existing.nickName ||
        userData.avatarUrl !== existing.avatarUrl ||
        userData.continuousSign !== existing.continuousSign ||
        userData.totalGameCount !== existing.totalGameCount ||
        userData.totalTime !== existing.totalTime

      if (hasChanges) {
        await db.collection('users').doc(existing._id).update({ data: userData })
      }
    } else {
      userData.createTime = db.serverDate()
      await db.collection('users').add({ data: userData })
    }

    if (scores && typeof scores === 'object') {
      const levelKeys = Object.keys(scores)

      const existResults = await Promise.all(
        levelKeys.map(level =>
          db.collection('scores')
            .where({ openId: userOpenId, level: Number(level) })
            .get()
        )
      )

      const updateTasks = []
      for (let i = 0; i < levelKeys.length; i++) {
        const level = levelKeys[i]
        const scoreData = scores[level]
        const existRes = existResults[i]

        const record = {
          openId: userOpenId,
          nickName: nickName || '用户',
          avatarUrl: avatarUrl || '',
          level: Number(level),
          bestTime: scoreData.bestTime,
          bestError: scoreData.bestError,
          updateTime: db.serverDate()
        }

        if (existRes.data.length > 0) {
          const existing = existRes.data[0]
          if (scoreData.bestTime < existing.bestTime) {
            updateTasks.push(
              db.collection('scores').doc(existing._id).update({ data: record })
            )
          }
        } else {
          record.createTime = db.serverDate()
          updateTasks.push(
            db.collection('scores').add({ data: record })
          )
        }
      }

      await Promise.all(updateTasks)
    }

    return { success: true }
  } catch (e) {
    console.error('syncData error', e)
    return { success: false, error: e.message }
  }
}
