import { describe, expect, it } from 'vitest'
import { dateKey, getTodayCount, getWeekCount } from './stats'
import type { DailyStats } from '../types'

// 2026-10-24 是周六；本周一起点为 2026-10-19（周一）
const SAT = new Date(2026, 9, 24, 15, 0, 0).getTime()

const stats: DailyStats[] = [
  { date: '2026-10-18', focusCount: 3 }, // 上周日，不计入本周
  { date: '2026-10-19', focusCount: 2 }, // 本周一
  { date: '2026-10-24', focusCount: 5 }, // 今天（周六）
]

describe('stats', () => {
  it('dateKey 输出本地 YYYY-MM-DD', () => {
    expect(dateKey(SAT)).toBe('2026-10-24')
    expect(dateKey(new Date(2026, 0, 5, 9, 30).getTime())).toBe('2026-01-05')
  })

  it('getTodayCount：取当天记录，无记录为 0', () => {
    expect(getTodayCount(stats, SAT)).toBe(5)
    expect(getTodayCount(stats, new Date(2026, 9, 20).getTime())).toBe(0)
  })

  it('getWeekCount：按日历周（周一起）聚合，跨周记录不计入', () => {
    expect(getWeekCount(stats, SAT)).toBe(7)
    // 上周日视角：10-18 属于当周
    expect(getWeekCount(stats, new Date(2026, 9, 18, 12).getTime())).toBe(3)
    // 下周一视角：新的一周重新开始
    expect(getWeekCount(stats, new Date(2026, 9, 26, 9).getTime())).toBe(0)
  })
})
