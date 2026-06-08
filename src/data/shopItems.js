// 商品配置 - 与 cloudfunctions/exchange 中的 ITEMS 保持一致
// MVP 阶段静态显示,不维护真实库存
import imgPuzzle from '@/assets/images/pic/1.png'
import imgEbook from '@/assets/images/pic/2.png'
import imgRubik from '@/assets/images/pic/3.png'
import imgDoll from '@/assets/images/pic/4.png'
import imgBook from '@/assets/images/pic/5.png'
import imgHairdryer from '@/assets/images/pic/6.png'

export const SHOP_ITEMS = [
  {
    id: 'puzzle',
    name: '舒尔特方格经典电子版',
    points: 500,
    emoji: '🧩',
    image: imgPuzzle,
    stock: '999+',
    originalPrice: 19.9,
    tag: '爆款',
    bgGradient: 'linear-gradient(135deg, #fff3e8, #ffe4cc)'
  },
  {
    id: 'ebook',
    name: 'claude code编程电子书',
    points: 600,
    emoji: '📘',
    image: imgEbook,
    stock: '524',
    originalPrice: 39,
    tag: '新品',
    bgGradient: 'linear-gradient(135deg, #ffe4cc, #ffd4a8)'
  },
  {
    id: 'rubik',
    name: '益智魔方',
    points: 1500,
    emoji: '🧊',
    image: imgRubik,
    stock: '318',
    originalPrice: 29,
    tag: '经典',
    bgGradient: 'linear-gradient(135deg, #ffd4a8, #ffc999)'
  },
  {
    id: 'doll',
    name: '云宝玩偶随机款',
    points: 2500,
    emoji: '🧸',
    image: imgDoll,
    stock: '156',
    originalPrice: 69,
    tag: '随机',
    bgGradient: 'linear-gradient(135deg, #ffc999, #ffb87a)'
  },
  {
    id: 'book',
    name: '实体书一本',
    points: 3000,
    emoji: '📚',
    image: imgBook,
    stock: '89',
    originalPrice: 45,
    tag: '精选',
    bgGradient: 'linear-gradient(135deg, #ffb87a, #ff9d5c)'
  },
  {
    id: 'hairdryer',
    name: '小米吹风机',
    points: 3500,
    emoji: '💨',
    image: imgHairdryer,
    stock: '42',
    originalPrice: 199,
    tag: '限量',
    bgGradient: 'linear-gradient(135deg, #ff9d5c, #ff7a28)'
  }
]

export const ITEM_MAP = SHOP_ITEMS.reduce((acc, item) => {
  acc[item.id] = item
  return acc
}, {})
