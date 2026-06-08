const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const RATE_LIMIT_PER_MIN = 10

// 商品表 - 与 src/data/shopItems.js 保持一致
const ITEMS = {
  puzzle:    { name: '舒尔特方格经典电子版', points: 500 },
  ebook:     { name: 'claude code编程电子书',   points: 600 },
  rubik:     { name: '益智魔方',               points: 1500 },
  doll:      { name: '云宝玩偶随机款',         points: 2500 },
  book:      { name: '实体书一本',             points: 3000 },
  hairdryer: { name: '小米吹风机',             points: 3500 }
}

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

function sanitizeShipping(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 50) : ''
  const phone = typeof raw.phone === 'string' ? raw.phone.trim().slice(0, 20) : ''
  const region = typeof raw.region === 'string' ? raw.region.trim().slice(0, 100) : ''
  const address = typeof raw.address === 'string' ? raw.address.trim().slice(0, 200) : ''
  if (!name || !phone || !region || !address) return null
  return { name, phone, region, address }
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

  const { itemId } = event
  if (typeof itemId !== 'string' || !ITEMS[itemId]) {
    return { success: false, error: 'invalid item' }
  }
  const item = ITEMS[itemId]
  const shipping = sanitizeShipping(event.shipping)

  try {
    const userRes = await db.collection('users').where({ openId }).get()
    if (userRes.data.length === 0) {
      return { success: false, error: 'user not found' }
    }
    const user = userRes.data[0]

    const points = typeof user.points === 'number' ? user.points : 0
    if (points < item.points) {
      return { success: false, error: 'insufficient points', need: item.points, have: points }
    }

    const newPoints = points - item.points
    const history = Array.isArray(user.exchangeHistory) ? user.exchangeHistory : []
    const newEntry = {
      itemId,
      itemName: item.name,
      points: item.points,
      time: new Date().toISOString()
    }
    if (shipping) newEntry.shipping = shipping
    const newHistory = history.concat([newEntry]).slice(-50)

    await db.collection('users').doc(user._id).update({
      data: {
        points: newPoints,
        totalSpent: _.inc(item.points),
        exchangeHistory: newHistory,
        updateTime: db.serverDate()
      }
    })

    return {
      success: true,
      item: { id: itemId, name: item.name, points: item.points },
      pointsAfter: newPoints
    }
  } catch (e) {
    console.error('exchange error', e)
    return { success: false, error: e.message }
  }
}
