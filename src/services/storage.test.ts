import { beforeEach, describe, expect, it } from 'vitest'
import {
  loadSettings,
  loadStats,
  recordFocusComplete,
  saveSettings,
} from '../services/storage'
import { DEFAULT_SETTINGS } from '../core/phase'
import { dateKey } from '../core/stats'

beforeEach(() => {
  localStorage.clear()
})

describe('storage.settings', () => {
  it('无记录时返回默认设置', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('JSON 损坏 / 结构不符时回退默认值，不抛异常', () => {
    localStorage.setItem('pomodoro.settings.v1', '{broken')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    localStorage.setItem('pomodoro.settings.v1', '123')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('保存后可读回；越界字段被钳制到合法范围', () => {
    saveSettings({ ...DEFAULT_SETTINGS, focusMinutes: 50, volume: 0.3 })
    expect(loadSettings().focusMinutes).toBe(50)
    expect(loadSettings().volume).toBe(0.3)

    localStorage.setItem(
      'pomodoro.settings.v1',
      JSON.stringify({ focusMinutes: 9999, volume: 7 }),
    )
    expect(loadSettings().focusMinutes).toBe(120)
    expect(loadSettings().volume).toBe(1)
    expect(loadSettings().shortBreakMinutes).toBe(DEFAULT_SETTINGS.shortBreakMinutes)
  })
})

describe('storage.stats', () => {
  it('recordFocusComplete：同一天累加，跨天分列', () => {
    const day1 = new Date(2026, 9, 23, 10).getTime()
    const day2 = new Date(2026, 9, 24, 10).getTime()
    recordFocusComplete(day1)
    recordFocusComplete(day1)
    recordFocusComplete(day2)
    const stats = loadStats()
    expect(stats).toEqual([
      { date: dateKey(day1), focusCount: 2 },
      { date: dateKey(day2), focusCount: 1 },
    ])
  })

  it('只保留最近 30 天记录', () => {
    const base = new Date(2026, 0, 1, 12).getTime()
    for (let i = 0; i < 35; i++) {
      recordFocusComplete(base + i * 86_400_000)
    }
    const stats = loadStats()
    expect(stats.length).toBe(30)
    expect(stats[0].date).toBe(dateKey(base + 5 * 86_400_000)) // 最旧 5 天被裁掉
  })

  it('统计数据 JSON 损坏时返回空数组', () => {
    localStorage.setItem('pomodoro.stats.v1', 'oops')
    expect(loadStats()).toEqual([])
  })
})
