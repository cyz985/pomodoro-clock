interface StatsBarProps {
  today: number
  week: number
}

/** 统计展示：今日 / 本周完成番茄数（PRD F-15 / F-16） */
export default function StatsBar({ today, week }: StatsBarProps) {
  return (
    <div className="flex gap-4">
      <div className="rounded-2xl bg-white/80 px-6 py-3 text-center shadow-sm ring-1 ring-neutral-200">
        <div className="text-2xl font-bold text-tomato-600">{today}</div>
        <div className="mt-0.5 text-xs text-neutral-500">今日完成</div>
      </div>
      <div className="rounded-2xl bg-white/80 px-6 py-3 text-center shadow-sm ring-1 ring-neutral-200">
        <div className="text-2xl font-bold text-tomato-600">{week}</div>
        <div className="mt-0.5 text-xs text-neutral-500">本周完成</div>
      </div>
    </div>
  )
}
