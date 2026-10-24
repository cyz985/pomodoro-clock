import type { Status } from '../types'

interface ControlsProps {
  status: Status
  /** 主按钮配色（随阶段切换主题色） */
  primaryClass: string
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onSkip: () => void
}

/** 操作按钮：开始/暂停(继续)、重置、跳过（PRD F-1 / F-2，布局见 PRD §5） */
export default function Controls({ status, primaryClass, onStart, onPause, onReset, onSkip }: ControlsProps) {
  const isRunning = status === 'running'
  const primaryLabel = isRunning ? '暂停' : status === 'paused' ? '继续' : '开始'

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        onClick={isRunning ? onPause : onStart}
        className={`min-w-28 rounded-full px-8 py-3 text-lg font-semibold text-white shadow-md transition-colors ${primaryClass}`}
      >
        {primaryLabel}
      </button>
      <button
        type="button"
        onClick={onReset}
        className="rounded-full border border-neutral-300 bg-white px-6 py-3 text-base font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
      >
        重置
      </button>
      <button
        type="button"
        onClick={onSkip}
        className="rounded-full border border-neutral-300 bg-white px-6 py-3 text-base font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
      >
        跳过
      </button>
    </div>
  )
}
