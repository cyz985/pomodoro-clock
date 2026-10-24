import type { Settings } from '../types'
import { SETTINGS_LIMITS } from '../core/phase'

interface SettingsPanelProps {
  settings: Settings
  /** 任何字段修改即回调（实时生效并持久化） */
  onChange: (next: Settings) => void
  onClose: () => void
}

interface NumberFieldProps {
  label: string
  value: number
  min: number
  max: number
  unit?: string
  onChange: (v: number) => void
}

function NumberField({ label, value, min, max, unit = '分钟', onChange }: NumberFieldProps) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm text-neutral-700">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const v = Number.parseInt(e.target.value, 10)
            if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v)))
          }}
          className="w-20 rounded-lg border border-neutral-300 px-2 py-1.5 text-right text-sm outline-none focus:border-tomato-500 focus:ring-2 focus:ring-tomato-200"
        />
        <span className="w-8 text-xs text-neutral-400">{unit}</span>
      </span>
    </label>
  )
}

/** 设置面板（PRD 4.2）：时长 / 长休息间隔 / 自动开始 / 提示音与音量 */
export default function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const patch = (partial: Partial<Settings>) => onChange({ ...settings, ...partial })

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="设置"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-800">设置</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭设置"
            className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
              <path d="M10 8.586 4.707 3.293a1 1 0 0 0-1.414 1.414L8.586 10l-5.293 5.293a1 1 0 1 0 1.414 1.414L10 11.414l5.293 5.293a1 1 0 0 0 1.414-1.414L11.414 10l5.293-5.293a1 1 0 0 0-1.414-1.414L10 8.586Z" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          <NumberField
            label="专注时长"
            value={settings.focusMinutes}
            min={SETTINGS_LIMITS.focusMinutes.min}
            max={SETTINGS_LIMITS.focusMinutes.max}
            onChange={(v) => patch({ focusMinutes: v })}
          />
          <NumberField
            label="短休息时长"
            value={settings.shortBreakMinutes}
            min={SETTINGS_LIMITS.shortBreakMinutes.min}
            max={SETTINGS_LIMITS.shortBreakMinutes.max}
            onChange={(v) => patch({ shortBreakMinutes: v })}
          />
          <NumberField
            label="长休息时长"
            value={settings.longBreakMinutes}
            min={SETTINGS_LIMITS.longBreakMinutes.min}
            max={SETTINGS_LIMITS.longBreakMinutes.max}
            onChange={(v) => patch({ longBreakMinutes: v })}
          />
          <NumberField
            label="长休息间隔"
            value={settings.longBreakInterval}
            min={SETTINGS_LIMITS.longBreakInterval.min}
            max={SETTINGS_LIMITS.longBreakInterval.max}
            unit="个"
            onChange={(v) => patch({ longBreakInterval: v })}
          />

          <hr className="border-neutral-100" />

          <label className="flex items-center justify-between text-sm text-neutral-700">
            <span>自动开始下一阶段</span>
            <input
              type="checkbox"
              checked={settings.autoStartNext}
              onChange={(e) => patch({ autoStartNext: e.target.checked })}
              className="h-4 w-4 accent-tomato-600"
            />
          </label>

          <label className="flex items-center justify-between text-sm text-neutral-700">
            <span>提示音</span>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => patch({ soundEnabled: e.target.checked })}
              className="h-4 w-4 accent-tomato-600"
            />
          </label>

          <label className="flex items-center justify-between gap-4 text-sm text-neutral-700">
            <span>音量</span>
            <span className="flex flex-1 items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.volume * 100)}
                disabled={!settings.soundEnabled}
                onChange={(e) => patch({ volume: Number(e.target.value) / 100 })}
                className="flex-1 accent-tomato-600 disabled:opacity-40"
              />
              <span className="w-10 text-right text-xs text-neutral-400">
                {Math.round(settings.volume * 100)}%
              </span>
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}
