import type { Phase } from '../types'

export interface PhaseTheme {
  /** 数字与标题文字色 */
  text: string
  /** 进度环 stroke（配合 stroke-current） */
  ring: string
  /** 页面背景渐变起始色 */
  gradient: string
  /** 主按钮底色 */
  button: string
  /** 阶段标签底与文字 */
  badge: string
}

/** 三阶段视觉区分（PRD F-14）：专注=番茄红，短休息=绿，长休息=蓝 */
export const PHASE_THEME: Record<Phase, PhaseTheme> = {
  focus: {
    text: 'text-tomato-600',
    ring: 'text-tomato-500',
    gradient: 'from-tomato-50 via-white to-white',
    button: 'bg-tomato-600 hover:bg-tomato-700 active:bg-tomato-800',
    badge: 'bg-tomato-100 text-tomato-700',
  },
  shortBreak: {
    text: 'text-emerald-600',
    ring: 'text-emerald-500',
    gradient: 'from-emerald-50 via-white to-white',
    button: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  longBreak: {
    text: 'text-sky-600',
    ring: 'text-sky-500',
    gradient: 'from-sky-50 via-white to-white',
    button: 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800',
    badge: 'bg-sky-100 text-sky-700',
  },
}
