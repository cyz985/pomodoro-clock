import type { Phase } from '../types'
import { PHASE_LABEL } from '../core/phase'
import { PHASE_THEME } from './phaseTheme'

interface PhaseIndicatorProps {
  phase: Phase
  /** 已完成的专注总数（用于渲染本周期进度圆点） */
  completedFocusCount: number
  /** 长休息间隔（每几个专注一个长休息） */
  interval: number
}

/** 当前阶段标签 + 本周期进度圆点（每完成一个专注点亮一个） */
export default function PhaseIndicator({ phase, completedFocusCount, interval }: PhaseIndicatorProps) {
  const theme = PHASE_THEME[phase]
  // 长休息期间视为本周期全部点亮
  const filled = phase === 'longBreak' ? interval : completedFocusCount % interval

  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`rounded-full px-4 py-1 text-sm font-semibold ${theme.badge}`}>
        {PHASE_LABEL[phase]}
      </span>
      <div className="flex gap-2" aria-label={`本周期已完成 ${filled} / ${interval} 个番茄`}>
        {Array.from({ length: interval }, (_, i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              i < filled ? 'bg-tomato-500' : 'bg-neutral-300'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
