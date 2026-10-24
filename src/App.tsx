import { useEffect, useState } from 'react'
import type { DailyStats, Settings } from './types'
import { loadSettings, loadStats, saveSettings } from './services/storage'
import { ensurePermission, getPermission, type NotifyPermission } from './services/notify'
import { getTodayCount, getWeekCount } from './core/stats'
import { getPhaseDurationMs } from './core/phase'
import { useTimer } from './hooks/useTimer'
import TimerDisplay from './components/TimerDisplay'
import Controls from './components/Controls'
import PhaseIndicator from './components/PhaseIndicator'
import StatsBar from './components/StatsBar'
import SettingsPanel from './components/SettingsPanel'
import NotificationHint from './components/NotificationHint'
import { PHASE_THEME } from './components/phaseTheme'

export default function App() {
  // 设置：localStorage 读取 → useState；修改即保存（PRD F-11）
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const timer = useTimer(settings)
  const [stats, setStats] = useState<DailyStats[]>(loadStats)
  const [permission, setPermission] = useState<NotifyPermission>(getPermission)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // 页面加载时主动请求通知权限（需求要求）；被拒绝则显示友好提示
  useEffect(() => {
    void ensurePermission().then(setPermission)
  }, [])

  // 完成专注数变化时重新读取统计（storage 为唯一数据源）
  useEffect(() => {
    setStats(loadStats())
  }, [timer.state.completedFocusCount])

  const updateSettings = (next: Settings) => {
    setSettings(next)
    saveSettings(next)
  }

  // idle 状态下设置变更立即同步当前阶段时长
  useEffect(() => {
    timer.applySettings()
  }, [settings, timer.applySettings])

  const { phase, status, remainingMs, completedFocusCount } = timer.state
  const theme = PHASE_THEME[phase]
  const now = Date.now()

  return (
    <div className={`flex min-h-screen flex-col bg-gradient-to-b ${theme.gradient}`}>
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <h1 className="flex items-center gap-2 text-xl font-bold text-neutral-800">
          <span aria-hidden="true">🍅</span> 番茄钟
        </h1>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
        >
          设置
        </button>
      </header>

      {permission === 'denied' && <NotificationHint />}

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-10 sm:gap-8">
        <PhaseIndicator
          phase={phase}
          completedFocusCount={completedFocusCount}
          interval={settings.longBreakInterval}
        />
        <TimerDisplay
          remainingMs={remainingMs}
          totalMs={getPhaseDurationMs(phase, settings)}
          phase={phase}
        />
        <Controls
          status={status}
          primaryClass={theme.button}
          onStart={timer.start}
          onPause={timer.pause}
          onReset={timer.reset}
          onSkip={timer.skip}
        />
        <StatsBar today={getTodayCount(stats, now)} week={getWeekCount(stats, now)} />
      </main>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
