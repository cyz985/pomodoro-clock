import { useCallback, useEffect, useRef, useState } from 'react'
import type { Settings, TimerEvent, TimerState } from '../types'
import { createInitialState, reduce } from '../core/timerMachine'
import { PHASE_LABEL } from '../core/phase'
import { formatMs } from '../core/format'
import { playAlert, unlockAudio } from '../services/audio'
import { notifyPhaseEnd } from '../services/notify'
import { recordFocusComplete } from '../services/storage'

export interface UseTimerReturn {
  state: TimerState
  start: () => void
  pause: () => void
  reset: () => void
  skip: () => void
  /** 设置变更后调用：idle 状态下同步当前阶段时长 */
  applySettings: () => void
}

/**
 * 连接状态机与浏览器副作用的 Hook：
 * - 250ms 高频 tick，仅显示秒数变化时才产生新 state（按需渲染）
 * - visibilitychange 切回前台立即校正（后台休眠补跑由状态机 while 循环保证）
 * - 阶段结束副作用：提示音 + 系统通知 + 统计记录
 * - 页面标题实时同步倒计时
 */
export function useTimer(settings: Settings): UseTimerReturn {
  const [state, setState] = useState<TimerState>(() => createInitialState(settings))

  // ref 镜像最新 state / settings，保证事件回调读到的不是过期闭包值
  const stateRef = useRef(state)
  stateRef.current = state
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const apply = useCallback((event: TimerEvent) => {
    const now = Date.now()
    const outcome = reduce(stateRef.current, event, { now, settings: settingsRef.current })
    stateRef.current = outcome.state
    setState(outcome.state)

    // 首次用户手势（点击开始）解锁音频，满足浏览器自动播放策略
    if (event.type === 'START') unlockAudio()

    if (outcome.phaseEnded) {
      if (settingsRef.current.soundEnabled) playAlert(settingsRef.current.volume)
      notifyPhaseEnd()
    }
    for (let i = 0; i < outcome.focusCompleted; i++) {
      recordFocusComplete(now)
    }
  }, [])

  // 高频 tick + 切回前台立即校正一次
  useEffect(() => {
    if (state.status !== 'running') return
    const id = window.setInterval(() => apply({ type: 'TICK' }), 250)
    const onVisibility = () => {
      if (!document.hidden) apply({ type: 'TICK' })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [state.status, apply])

  // 标题同步：切标签页也能看到剩余时间（PRD F-3）
  const displaySec = Math.ceil(state.remainingMs / 1000)
  useEffect(() => {
    document.title = `${formatMs(state.remainingMs)} ${PHASE_LABEL[state.phase]} · 番茄钟`
    return () => {
      document.title = '番茄钟'
    }
    // displaySec 变化才需要改标题；remainingMs 与其同频
  }, [displaySec, state.phase, state.remainingMs])

  return {
    state,
    start: useCallback(() => apply({ type: 'START' }), [apply]),
    pause: useCallback(() => apply({ type: 'PAUSE' }), [apply]),
    reset: useCallback(() => apply({ type: 'RESET' }), [apply]),
    skip: useCallback(() => apply({ type: 'SKIP' }), [apply]),
    applySettings: useCallback(() => apply({ type: 'APPLY_SETTINGS' }), [apply]),
  }
}
