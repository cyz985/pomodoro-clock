/** 阶段：专注 / 短休息 / 长休息 */
export type Phase = 'focus' | 'shortBreak' | 'longBreak'

/** 运行状态：待启动 / 计时中 / 已暂停 */
export type Status = 'idle' | 'running' | 'paused'

export interface Settings {
  /** 专注时长（分钟），1–120，默认 25 */
  focusMinutes: number
  /** 短休息时长（分钟），1–30，默认 5 */
  shortBreakMinutes: number
  /** 长休息时长（分钟），1–60，默认 15 */
  longBreakMinutes: number
  /** 每完成多少个专注进入一次长休息，2–8，默认 4 */
  longBreakInterval: number
  /** 阶段结束后是否自动开始下一阶段，默认 true */
  autoStartNext: boolean
  /** 提示音开关，默认 true */
  soundEnabled: boolean
  /** 提示音音量 0–1，默认 0.8 */
  volume: number
}

export interface TimerState {
  phase: Phase
  status: Status
  /** running 时有效：当前阶段结束时刻的时间戳（Date.now 基准） */
  endAt: number | null
  /** 展示用剩余毫秒数；paused/idle 时为冻结值，running 时由 tick 按秒刷新 */
  remainingMs: number
  /** 已完成的专注数量（驱动长休息判断与统计） */
  completedFocusCount: number
}

export type TimerEvent =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESET' }
  | { type: 'SKIP' }
  | { type: 'TICK' }
  | { type: 'APPLY_SETTINGS' }

/** 按天聚合的统计记录，date 为本地时区 YYYY-MM-DD */
export interface DailyStats {
  date: string
  focusCount: number
}
