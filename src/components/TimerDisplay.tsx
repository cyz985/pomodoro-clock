import type { Phase } from '../types'
import { formatMs } from '../core/format'
import { PHASE_THEME } from './phaseTheme'

interface TimerDisplayProps {
  remainingMs: number
  totalMs: number
  phase: Phase
}

const R = 118
const CIRCUMFERENCE = 2 * Math.PI * R

/** 大号 MM:SS 倒计时 + 环形进度（PRD F-3 / F-17） */
export default function TimerDisplay({ remainingMs, totalMs, phase }: TimerDisplayProps) {
  const theme = PHASE_THEME[phase]
  const progress = totalMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / totalMs)) : 0

  return (
    <div
      className="relative flex items-center justify-center"
      role="timer"
      aria-live="polite"
      aria-label={`剩余时间 ${formatMs(remainingMs)}`}
    >
      <svg viewBox="0 0 260 260" className="h-64 w-64 -rotate-90 sm:h-80 sm:w-80">
        {/* 底环 */}
        <circle
          cx="130"
          cy="130"
          r={R}
          fill="none"
          strokeWidth="10"
          className="stroke-neutral-200"
        />
        {/* 进度环：strokeDashoffset 随进度减小 */}
        <circle
          cx="130"
          cy="130"
          r={R}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke="currentColor"
          className={`${theme.ring} transition-[stroke-dashoffset] duration-300 ease-linear`}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-mono text-6xl font-bold tabular-nums sm:text-7xl ${theme.text}`}>
          {formatMs(remainingMs)}
        </span>
      </div>
    </div>
  )
}
