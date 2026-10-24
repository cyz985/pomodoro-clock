import type { DailyStats } from '../types'

/** 本地时区日期键：YYYY-MM-DD */
export function dateKey(now: number): string {
  const d = new Date(now)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function getTodayCount(stats: DailyStats[], now: number): number {
  return stats.find((s) => s.date === dateKey(now))?.focusCount ?? 0
}

/** 本周完成数：按日历周统计，周一为一周起点 */
export function getWeekCount(stats: DailyStats[], now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  // getDay(): 周日=0 … 周六=6 → 换算为周一=0 … 周日=6
  const mondayOffset = (d.getDay() + 6) % 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - mondayOffset)
  const startKey = dateKey(monday.getTime())
  const todayKey = dateKey(now)
  // date 为 YYYY-MM-DD，字符串序即日期序；加上界防御异常的未来日期记录
  return stats
    .filter((s) => s.date >= startKey && s.date <= todayKey)
    .reduce((sum, s) => sum + s.focusCount, 0)
}
