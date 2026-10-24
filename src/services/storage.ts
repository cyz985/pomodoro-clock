import type { DailyStats, Settings } from '../types'
import { DEFAULT_SETTINGS, SETTINGS_LIMITS } from '../core/phase'
import { dateKey } from '../core/stats'

const SETTINGS_KEY = 'pomodoro.settings.v1'
const STATS_KEY = 'pomodoro.stats.v1'
/** 统计只保留最近 30 天（TECH_DESIGN 5.3） */
const MAX_STATS_DAYS = 30

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function toBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/** 读取设置：任何异常（无记录 / JSON 损坏 / 字段缺失）都回退默认值并做范围钳制，不抛异常 */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETTINGS
    const p = parsed as Partial<Record<keyof Settings, unknown>>
    return {
      focusMinutes: clampInt(p.focusMinutes, SETTINGS_LIMITS.focusMinutes.min, SETTINGS_LIMITS.focusMinutes.max, DEFAULT_SETTINGS.focusMinutes),
      shortBreakMinutes: clampInt(p.shortBreakMinutes, SETTINGS_LIMITS.shortBreakMinutes.min, SETTINGS_LIMITS.shortBreakMinutes.max, DEFAULT_SETTINGS.shortBreakMinutes),
      longBreakMinutes: clampInt(p.longBreakMinutes, SETTINGS_LIMITS.longBreakMinutes.min, SETTINGS_LIMITS.longBreakMinutes.max, DEFAULT_SETTINGS.longBreakMinutes),
      longBreakInterval: clampInt(p.longBreakInterval, SETTINGS_LIMITS.longBreakInterval.min, SETTINGS_LIMITS.longBreakInterval.max, DEFAULT_SETTINGS.longBreakInterval),
      autoStartNext: toBool(p.autoStartNext, DEFAULT_SETTINGS.autoStartNext),
      soundEnabled: toBool(p.soundEnabled, DEFAULT_SETTINGS.soundEnabled),
      volume: clampNumber(p.volume, 0, 1, DEFAULT_SETTINGS.volume),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // 存储被禁用/满时静默失败，不影响计时主流程
  }
}

export function loadStats(): DailyStats[] {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is DailyStats =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as DailyStats).date === 'string' &&
        typeof (item as DailyStats).focusCount === 'number',
    )
  } catch {
    return []
  }
}

function saveStats(stats: DailyStats[]): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {
    // 同上，静默降级
  }
}

/** 记录一次专注完成（按本地日期聚合），并裁剪为最近 30 天 */
export function recordFocusComplete(now: number): void {
  const stats = loadStats()
  const key = dateKey(now)
  const idx = stats.findIndex((s) => s.date === key)
  if (idx >= 0) {
    stats[idx] = { ...stats[idx], focusCount: stats[idx].focusCount + 1 }
  } else {
    stats.push({ date: key, focusCount: 1 })
  }
  stats.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  saveStats(stats.slice(-MAX_STATS_DAYS))
}
