import type { Phase, Settings } from '../types'

export const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartNext: true,
  soundEnabled: true,
  volume: 0.8,
}

/** 设置项合法范围（PRD F-7 / F-8），UI 与 storage 共用 */
export const SETTINGS_LIMITS = {
  focusMinutes: { min: 1, max: 120 },
  shortBreakMinutes: { min: 1, max: 30 },
  longBreakMinutes: { min: 1, max: 60 },
  longBreakInterval: { min: 2, max: 8 },
} as const

export const PHASE_LABEL: Record<Phase, string> = {
  focus: '专注',
  shortBreak: '短休息',
  longBreak: '长休息',
}

export function getPhaseDurationMs(phase: Phase, settings: Settings): number {
  switch (phase) {
    case 'focus':
      return settings.focusMinutes * 60_000
    case 'shortBreak':
      return settings.shortBreakMinutes * 60_000
    case 'longBreak':
      return settings.longBreakMinutes * 60_000
  }
}

/**
 * 下一阶段推导（阶段流转的唯一规则出处）：
 * - 专注完成数达到 longBreakInterval 的整数倍 → 长休息，否则短休息
 * - 任意休息结束 → 专注
 */
export function nextPhase(phase: Phase, completedFocusCount: number, settings: Settings): Phase {
  if (phase === 'focus') {
    return completedFocusCount > 0 && completedFocusCount % settings.longBreakInterval === 0
      ? 'longBreak'
      : 'shortBreak'
  }
  return 'focus'
}
