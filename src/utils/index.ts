import Taro from '@tarojs/taro'

type LevelType = 3 | 4 | 5 | 6 | 7 | 8
type RatingType = 'S' | 'A' | 'B' | 'C'

const CLOUD_ENV_ID = 'cloud1-d7g92q5ti56030287'

interface LevelConfigItem {
  name: string
  size: number
  bgColor: string
  textColor: string
  borderColor: string
}

interface RatingConfigItem {
  S: number
  A: number
  B: number
  C: number
}

interface GridCell {
  number: number
  color: string
  clicked: boolean
}

type GridCell2D = GridCell[][]

interface CloudFunctionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  errMsg?: string
}

interface RankingItem {
  nickName: string
  bestTime: number
  bestError?: number
}

interface RankingResult extends CloudFunctionResult<RankingItem[]> {
  total?: number
  myRank?: number
}

const LEVEL_CONFIG: Record<LevelType, LevelConfigItem> = {
  3: { name: '入门', size: 3, bgColor: '#E0F0FF', textColor: '#5B9BD5', borderColor: '#A8D4F0' },
  4: { name: '初级', size: 4, bgColor: '#FFE0EC', textColor: '#D4739A', borderColor: '#F0A8C4' },
  5: { name: '经典', size: 5, bgColor: '#FFF8E0', textColor: '#C4A830', borderColor: '#F0E0A0' },
  6: { name: '高级', size: 6, bgColor: '#E0F8E8', textColor: '#5BAA6F', borderColor: '#A0D8B0' },
  7: { name: '专家', size: 7, bgColor: '#E8E0F0', textColor: '#8B7DA8', borderColor: '#C4B5D9' },
  8: { name: '大神', size: 8, bgColor: '#FFF0E0', textColor: '#C88540', borderColor: '#F5C89A' }
}

const LEVELS: LevelType[] = Object.keys(LEVEL_CONFIG).map(Number) as LevelType[]

const RATING_CONFIG: Record<LevelType, RatingConfigItem> = {
  3: { S: 5000, A: 8000, B: 12000, C: Infinity },
  4: { S: 10000, A: 16000, B: 24000, C: Infinity },
  5: { S: 18000, A: 28000, B: 40000, C: Infinity },
  6: { S: 30000, A: 45000, B: 65000, C: Infinity },
  7: { S: 45000, A: 65000, B: 90000, C: Infinity },
  8: { S: 65000, A: 95000, B: 130000, C: Infinity }
}

const MACARON_COLORS: string[] = Array.from(new Set([
  '#7EB5D6', '#D4739A', '#C4A830', '#5BAA6F',
  '#8B7DA8', '#C88540', '#D68F7E', '#7EB5A8',
  '#A88BD6', '#D6B07E', '#7E9ED6', '#B0D67E',
  '#D67EA8', '#7ED6C4', '#D6A87E', '#8B9ED6',
  '#A8D67E', '#D67E7E', '#C4D67E',
  '#D67EB5', '#7ED6A8', '#B5D67E', '#7E8BD6',
  '#D6C47E', '#7ED6D6', '#D67EC4', '#8BD67E',
  '#9E7ED6', '#D6D67E', '#7ED67E', '#D67E9E',
  '#7EC4D6', '#C47ED6', '#7ED6B5', '#D6B57E',
  '#B57ED6', '#7ED69E', '#D69E7E',
  '#A87ED6', '#7ED68B', '#D68B7E',
  '#7EA8D6', '#9ED67E'
]))

function generateGrid(level: LevelType): GridCell2D {
  const size = LEVEL_CONFIG[level].size
  const total = size * size
  const numbers = Array.from({ length: total }, (_, i) => i + 1)
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]]
  }
  const grid: GridCell[][] = []
  for (let i = 0; i < size; i++) {
    const row: GridCell[] = []
    for (let j = 0; j < size; j++) {
      const num = numbers[i * size + j]
      row.push({
        number: num,
        color: MACARON_COLORS[num % MACARON_COLORS.length],
        clicked: false
      })
    }
    grid.push(row)
  }
  return grid
}

function getRating(level: number, timeMs: number): RatingType {
  const safeLevel = validateLevel(level)
  const config = RATING_CONFIG[safeLevel]
  if (timeMs <= config.S) return 'S'
  if (timeMs <= config.A) return 'A'
  if (timeMs <= config.B) return 'B'
  return 'C'
}

function getRatingColor(rating: RatingType): string {
  const colors: Record<RatingType, string> = { S: '#5BAA6F', A: '#5B9BD5', B: '#C4A830', C: '#D4739A' }
  return colors[rating] || '#999999'
}

function formatTime(ms: number): string {
  const seconds = ms / 1000
  return seconds.toFixed(3)
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function validateLevel(level: number): LevelType {
  const l = Number(level) || 3
  return (l >= 3 && l <= 8) ? l as LevelType : 3
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs)
    promise.then(resolve, reject).finally(() => clearTimeout(timer))
  })
}

function cloudCall<T = unknown>(name: string, data?: Record<string, unknown>): Promise<T> {
  if (!Taro.cloud) {
    return Promise.reject(new Error('cloud not available'))
  }
  return withTimeout(
    Taro.cloud.callFunction({ name, data: data || {} }).then(res => res.result as T),
    10000
  )
}

function safeParseJSON(str: string, fallback: unknown = null): unknown {
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export {
  CLOUD_ENV_ID,
  LEVEL_CONFIG,
  LEVELS,
  RATING_CONFIG,
  MACARON_COLORS,
  generateGrid,
  getRating,
  getRatingColor,
  formatTime,
  formatDuration,
  getToday,
  validateLevel,
  withTimeout,
  cloudCall,
  safeParseJSON,
  deepEqual
}

export type { LevelType, RatingType, LevelConfigItem, GridCell, GridCell2D, CloudFunctionResult, RankingItem }
