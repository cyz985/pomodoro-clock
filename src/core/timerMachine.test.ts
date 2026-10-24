import { describe, expect, it } from 'vitest'
import { createInitialState, reduce } from './timerMachine'
import { DEFAULT_SETTINGS } from './phase'
import type { Settings, TimerEvent, TimerState } from '../types'

const S: Settings = { ...DEFAULT_SETTINGS }
const t0 = 1_000_000_000

function run(state: TimerState, event: TimerEvent, now: number, settings: Settings = S) {
  return reduce(state, event, { now, settings })
}

describe('timerMachine', () => {
  it('初始状态：focus / idle，剩余 25 分钟', () => {
    const s = createInitialState(S)
    expect(s.phase).toBe('focus')
    expect(s.status).toBe('idle')
    expect(s.remainingMs).toBe(25 * 60_000)
    expect(s.completedFocusCount).toBe(0)
  })

  it('START：进入 running，endAt = now + remainingMs', () => {
    const s0 = createInitialState(S)
    const { state } = run(s0, { type: 'START' }, t0)
    expect(state.status).toBe('running')
    expect(state.endAt).toBe(t0 + 25 * 60_000)
  })

  it('PAUSE 冻结剩余时间，再次 START 后总时长不变', () => {
    let s = run(createInitialState(S), { type: 'START' }, t0).state
    s = run(s, { type: 'TICK' }, t0 + 60_000).state // 过了 1 分钟
    const paused = run(s, { type: 'PAUSE' }, t0 + 60_500).state
    expect(paused.status).toBe('paused')
    expect(paused.remainingMs).toBe(24 * 60_000 - 500)

    const resumed = run(paused, { type: 'START' }, t0 + 600_000).state // 暂停很久后恢复
    expect(resumed.endAt).toBe(t0 + 600_000 + (24 * 60_000 - 500))
  })

  it('RESET：恢复当前阶段满时长并停止，不影响完成计数', () => {
    let s = run(createInitialState(S), { type: 'START' }, t0).state
    s = run(s, { type: 'TICK' }, t0 + 25 * 60_000).state // focus 到期 → shortBreak
    expect(s.completedFocusCount).toBe(1)
    const r = run(s, { type: 'RESET' }, t0 + 26 * 60_000).state
    expect(r.status).toBe('idle')
    expect(r.phase).toBe('shortBreak')
    expect(r.remainingMs).toBe(5 * 60_000)
    expect(r.completedFocusCount).toBe(1)
  })

  it('TICK 到期边界：now 恰好等于 endAt 时即流转', () => {
    const s = run(createInitialState(S), { type: 'START' }, t0).state
    const out = run(s, { type: 'TICK' }, t0 + 25 * 60_000)
    expect(out.phaseEnded).toBe(true)
    expect(out.focusCompleted).toBe(1)
    expect(out.state.phase).toBe('shortBreak')
    expect(out.state.status).toBe('running') // autoStartNext 默认开
  })

  it('TICK 未到期时剩余时间由 endAt - now 推导，且同秒内不更新 state', () => {
    const s = run(createInitialState(S), { type: 'START' }, t0).state
    // 过 100ms：显示秒数仍是 25:00，state 引用不变 → 不触发重渲染
    const a = run(s, { type: 'TICK' }, t0 + 100)
    expect(a.state).toBe(s)
    // 过 1100ms：显示跳到 24:58，remainingMs 由 endAt - now 推导更新
    const b = run(s, { type: 'TICK' }, t0 + 1100).state
    expect(b.remainingMs).toBe(25 * 60_000 - 1100)
  })

  it('完成 4 个专注后进入长休息，而非短休息', () => {
    let s = run(createInitialState(S), { type: 'START' }, t0).state
    let now = t0
    // 依次走完 focus→shortBreak ×3，再走第 4 个 focus
    for (let i = 0; i < 3; i++) {
      now += 25 * 60_000
      s = run(s, { type: 'TICK' }, now).state
      expect(s.phase).toBe('shortBreak')
      now += 5 * 60_000
      s = run(s, { type: 'TICK' }, now).state
      expect(s.phase).toBe('focus')
    }
    now += 25 * 60_000
    const out = run(s, { type: 'TICK' }, now)
    expect(out.state.completedFocusCount).toBe(4)
    expect(out.state.phase).toBe('longBreak')
    expect(out.state.remainingMs).toBe(15 * 60_000)
  })

  it('一次 tick 跨多个阶段（后台休眠补跑）', () => {
    const s = run(createInitialState(S), { type: 'START' }, t0).state
    // 31 分钟后回来：focus(25m) → shortBreak(5m) → focus 已进行 1m
    const out = run(s, { type: 'TICK' }, t0 + 31 * 60_000)
    expect(out.focusCompleted).toBe(1)
    expect(out.state.phase).toBe('focus')
    expect(out.state.status).toBe('running')
    expect(out.state.remainingMs).toBe(24 * 60_000)
  })

  it('autoStartNext 关闭时：阶段结束后进入 idle 并停在新阶段满时长', () => {
    const settings: Settings = { ...S, autoStartNext: false }
    const s = run(createInitialState(settings), { type: 'START' }, t0, settings).state
    const out = run(s, { type: 'TICK' }, t0 + 25 * 60_000, settings)
    expect(out.state.status).toBe('idle')
    expect(out.state.phase).toBe('shortBreak')
    expect(out.state.remainingMs).toBe(5 * 60_000)
    expect(out.state.endAt).toBeNull()
  })

  it('SKIP：推进阶段但不计完成数、不触发阶段结束副作用', () => {
    const s0 = createInitialState(S)
    const out = run(s0, { type: 'SKIP' }, t0)
    expect(out.state.phase).toBe('shortBreak')
    expect(out.state.completedFocusCount).toBe(0)
    expect(out.focusCompleted).toBe(0)
    expect(out.phaseEnded).toBe(false)
  })

  it('APPLY_SETTINGS：idle 时同步当前阶段新时长；running 时不打断', () => {
    const custom: Settings = { ...S, focusMinutes: 50 }
    const idle = run(createInitialState(S), { type: 'APPLY_SETTINGS' }, t0, custom).state
    expect(idle.remainingMs).toBe(50 * 60_000)

    const running = run(createInitialState(S), { type: 'START' }, t0).state
    const same = run(running, { type: 'APPLY_SETTINGS' }, t0 + 1000, custom)
    expect(same.state).toBe(running) // 无变化
  })
})
