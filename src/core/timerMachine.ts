import type { Settings, TimerEvent, TimerState } from '../types'
import { getPhaseDurationMs, nextPhase } from './phase'

/** reduce 的返回值：除新状态外，附带本次事件产生的"事实"，供 hooks 层执行副作用 */
export interface ReduceOutcome {
  state: TimerState
  /** 本次事件中完成的专注阶段数（休眠补跑一次 tick 可能 > 1） */
  focusCompleted: number
  /** 本次事件中是否有阶段自然结束（SKIP 不算），用于提示音/通知 */
  phaseEnded: boolean
}

const noEffect = (state: TimerState): ReduceOutcome => ({
  state,
  focusCompleted: 0,
  phaseEnded: false,
})

export function createInitialState(settings: Settings): TimerState {
  return {
    phase: 'focus',
    status: 'idle',
    endAt: null,
    remainingMs: getPhaseDurationMs('focus', settings),
    completedFocusCount: 0,
  }
}

/**
 * 计时核心状态机（纯函数，不依赖 React 与浏览器 API）。
 *
 * 不可违反的规则：
 * 1. running 期间剩余时间永远由 endAt - now 推导，不做递减计数；
 * 2. 到期流转用 while 循环推进，一次 tick 可跨多个阶段（后台休眠补跑）；
 * 3. 阶段推导只调用 core/phase.nextPhase。
 */
export function reduce(
  state: TimerState,
  event: TimerEvent,
  ctx: { now: number; settings: Settings },
): ReduceOutcome {
  const { now, settings } = ctx

  switch (event.type) {
    case 'START': {
      if (state.status === 'running') return noEffect(state)
      // idle 时 remainingMs 由 RESET/APPLY_SETTINGS 保持为满时长；paused 时为暂停瞬间冻结的剩余值
      return {
        state: { ...state, status: 'running', endAt: now + state.remainingMs },
        focusCompleted: 0,
        phaseEnded: false,
      }
    }

    case 'PAUSE': {
      if (state.status !== 'running' || state.endAt === null) return noEffect(state)
      return {
        state: {
          ...state,
          status: 'paused',
          endAt: null,
          remainingMs: Math.max(0, state.endAt - now),
        },
        focusCompleted: 0,
        phaseEnded: false,
      }
    }

    case 'RESET': {
      // 重置当前阶段：恢复满时长并停止计时，不影响已完成计数（TECH_DESIGN 3.3）
      return {
        state: {
          ...state,
          status: 'idle',
          endAt: null,
          remainingMs: getPhaseDurationMs(state.phase, settings),
        },
        focusCompleted: 0,
        phaseEnded: false,
      }
    }

    case 'SKIP': {
      // 跳过是用户的主动行为：推进阶段但不计完成数、不记统计、不触发提示音/通知
      const phase = nextPhase(state.phase, state.completedFocusCount, settings)
      const duration = getPhaseDurationMs(phase, settings)
      const next: TimerState = settings.autoStartNext
        ? { phase, status: 'running', endAt: now + duration, remainingMs: duration, completedFocusCount: state.completedFocusCount }
        : { phase, status: 'idle', endAt: null, remainingMs: duration, completedFocusCount: state.completedFocusCount }
      return { state: next, focusCompleted: 0, phaseEnded: false }
    }

    case 'APPLY_SETTINGS': {
      // 仅在 idle 时把当前阶段时长同步为新设置；running/paused 不打断当前阶段，新设置对后续阶段生效
      if (state.status !== 'idle') return noEffect(state)
      return {
        state: { ...state, remainingMs: getPhaseDurationMs(state.phase, settings) },
        focusCompleted: 0,
        phaseEnded: false,
      }
    }

    case 'TICK': {
      if (state.status !== 'running' || state.endAt === null) return noEffect(state)

      // 未到期：仅当显示秒数变化时才返回新 state（按需渲染，避免 250ms tick 引发频繁重渲染）
      if (now < state.endAt) {
        const remainingMs = state.endAt - now
        if (Math.ceil(remainingMs / 1000) !== Math.ceil(state.remainingMs / 1000)) {
          return { state: { ...state, remainingMs }, focusCompleted: 0, phaseEnded: false }
        }
        return noEffect(state)
      }

      // 到期：while 循环补跑，休眠多久都能落到正确阶段
      let current: TimerState = state
      let endAt: number | null = state.endAt
      let focusCompleted = 0

      while (current.status === 'running' && endAt !== null && now >= endAt) {
        const isFocus = current.phase === 'focus'
        if (isFocus) focusCompleted += 1
        const completedFocusCount = current.completedFocusCount + (isFocus ? 1 : 0)
        const phase = nextPhase(current.phase, completedFocusCount, settings)
        const duration = getPhaseDurationMs(phase, settings)

        if (settings.autoStartNext) {
          // 下一阶段 endAt 在上一个 endAt 基础上顺延，保证跨阶段补跑后时刻表不漂移
          const nextEndAt: number = endAt + duration
          current = {
            phase,
            status: 'running',
            endAt: nextEndAt,
            remainingMs: Math.max(0, nextEndAt - now),
            completedFocusCount,
          }
          endAt = nextEndAt
        } else {
          current = { phase, status: 'idle', endAt: null, remainingMs: duration, completedFocusCount }
          endAt = null
        }
      }

      return { state: current, focusCompleted, phaseEnded: true }
    }
  }
}
