# 番茄钟计时器 — 技术设计文档

## 1. 技术选型

| 项 | 选择 | 理由 |
|---|---|---|
| 构建工具 | Vite | 快速冷启动与 HMR |
| 框架 | React 19 + TypeScript | 组件化、类型安全 |
| 状态管理 | React Hooks（useReducer + Context） | 状态模型简单，无需引入 Redux/Zustand |
| 样式 | Tailwind CSS v4（@tailwindcss/vite 插件，CSS-first 配置，无 tailwind.config.js） | 已确定，全项目统一 |
| 持久化 | localStorage | 纯前端、零依赖 |
| 测试 | Vitest + React Testing Library | 与 Vite 生态一致 |
| 提示音 | Web Audio API / HTMLAudioElement | 原生即可，无第三方库 |

## 2. 系统架构

```
┌──────────────────────────────────────────┐
│                  App                      │
│  ┌────────────┐  ┌────────────────────┐  │
│  │  TimerView │  │  SettingsPanel     │  │
│  │ (显示+操作) │  │  (设置表单)         │  │
│  └─────┬──────┘  └─────────┬──────────┘  │
│        │                   │             │
│  ┌─────▼───────────────────▼──────────┐  │
│  │      TimerContext / useTimer        │  │
│  │  (状态机 + 调度 + 副作用协调)         │  │
│  └─────┬───────────────┬──────────────┘  │
│        │               │                 │
│  ┌─────▼─────┐   ┌─────▼──────┐  ┌──────▼───────┐
│  │ timer-core │   │  storage   │  │ notification │
│  │ (纯逻辑)   │   │(localStorage)│ │ + audio     │
│  └───────────┘   └────────────┘  └──────────────┘
└──────────────────────────────────────────┘
```

**分层原则**：
- `timer-core` 为纯函数/纯状态机，不依赖 React 与浏览器 API，可单测
- React 层只负责渲染与事件转发
- storage / notification / audio 封装为独立模块，便于降级与 mock

## 3. 核心状态机

### 3.1 阶段（Phase）与运行状态（Status）

```
Phase:  focus ──► shortBreak ──► focus ──► ... ──► longBreak ──► focus
        （每 longBreakInterval 个 focus 后进入 longBreak）

Status: idle → running ⇄ paused → (阶段结束) → 下一阶段 idle/running
```

### 3.2 状态模型

```typescript
type Phase = 'focus' | 'shortBreak' | 'longBreak';
type Status = 'idle' | 'running' | 'paused';

interface TimerState {
  phase: Phase;
  status: Status;
  /** 当前阶段结束时刻的时间戳（performance/Date），running 时有效 */
  endAt: number | null;
  /** 暂停时剩余毫秒数，paused 时有效 */
  remainingMs: number;
  /** 已完成的 focus 数量（用于长休息判断与统计） */
  completedFocusCount: number;
}

interface Settings {
  focusMinutes: number;        // 1–120，默认 25
  shortBreakMinutes: number;   // 1–30，默认 5
  longBreakMinutes: number;    // 1–60，默认 15
  longBreakInterval: number;   // 2–8，默认 4
  autoStartNext: boolean;      // 默认 true
  soundEnabled: boolean;       // 默认 true
  volume: number;              // 0–1，默认 0.8
}
```

### 3.3 状态迁移

| 事件 | 条件 | 迁移 |
|---|---|---|
| START | idle / paused | → running，设置 `endAt = now + remainingMs` |
| PAUSE | running | → paused，`remainingMs = endAt - now` |
| RESET | 任意 | → idle，`remainingMs = 当前阶段总时长`，不改 completedFocusCount |
| SKIP | 任意 | 当前阶段视为结束，走 TICK 到期同样的流转逻辑 |
| TICK 到期 | running 且 now ≥ endAt | focus 完成则 completedFocusCount+1；按规则计算下一 phase；autoStartNext 则直接 running，否则 idle |

## 4. 计时准确性设计（关键）

**问题**：`setInterval(fn, 1000)` 在后台标签页会被节流（通常降到 1 次/分钟），且累计漂移。

**方案**：
1. **以时间戳为准**：启动时记录 `endAt`，每次 tick 用 `remaining = endAt - Date.now()` 计算剩余时间，而不是每秒递减计数器。
2. **高频 tick + 按需渲染**：interval 每 250ms 触发一次，仅当显示的秒数变化时才更新 state，避免多余渲染。
3. **visibilitychange 校正**：页面从后台切回时立即执行一次 tick 校正显示；若期间已到期，按结束时间补跑阶段流转（可能跨多个阶段）。
4. **阶段流转幂等**：`advancePhase(now)` 采用 `while (now >= endAt)` 循环推进，保证休眠多久都能落到正确阶段。
5. 不引入 Web Worker（v1.0）：时间戳方案已保证准确性，Worker 只解决「后台响铃准时性」，作为 P1 增强在 M2 评估。

## 5. 模块设计

### 5.1 目录结构（已实现）

```
src/
├── main.tsx
├── App.tsx                  # 组装层：设置/统计/通知权限状态，组件编排
├── index.css                # Tailwind v4 入口 + @theme 番茄红色板
├── core/
│   ├── timerMachine.ts      # 状态机：reduce + 阶段流转纯函数（含跨阶段补跑）
│   ├── phase.ts             # Phase 类型、默认设置、时长计算、nextPhase
│   ├── stats.ts             # 今日/本周统计聚合（本地时区，周一起）
│   ├── format.ts            # MM:SS 格式化
│   ├── timerMachine.test.ts
│   └── stats.test.ts
├── hooks/
│   └── useTimer.ts          # 连接状态机与 interval/visibility 副作用，标题同步
├── components/
│   ├── TimerDisplay.tsx     # MM:SS + SVG 进度环
│   ├── Controls.tsx         # 开始/暂停/重置/跳过
│   ├── PhaseIndicator.tsx   # 阶段标签 + 周期圆点
│   ├── SettingsPanel.tsx    # 设置弹层（实时生效）
│   ├── StatsBar.tsx         # 今日/本周完成数
│   ├── NotificationHint.tsx # 通知被拒后的友好提示
│   └── phaseTheme.ts        # 三阶段配色映射
├── services/
│   ├── storage.ts           # settings / stats 读写、默认值合并、范围钳制
│   ├── audio.ts             # notification.wav 播放 + Web Audio 降级 + 手势解锁
│   ├── notify.ts            # Notification 权限请求与发送，失败降级
│   └── storage.test.ts
└── types.ts
public/
└── notification.wav         # 阶段结束提示音（构建脚本合成的三音 beep）
```

### 5.2 关键接口

```typescript
// core/timerMachine.ts
export function createInitialState(settings: Settings): TimerState;
export function reduce(state: TimerState, event: TimerEvent, ctx: { now: number; settings: Settings }): TimerState;
export function getPhaseDurationMs(phase: Phase, settings: Settings): number;
export function nextPhase(phase: Phase, completedFocusCount: number, settings: Settings): Phase;

// services/storage.ts
export function loadSettings(): Settings;            // 带默认值合并与 schema 校验
export function saveSettings(s: Settings): void;
export function loadStats(): DailyStats[];           // [{ date: 'YYYY-MM-DD', focusCount }]
export function recordFocusComplete(now: number): void;

// services/notify.ts
export async function ensurePermission(): Promise<boolean>;
export function notifyPhaseEnd(phase: Phase): void;  // 无权限/不支持时静默降级
```

### 5.3 localStorage 键设计

| Key | 内容 | 版本字段 |
|---|---|---|
| `pomodoro.settings.v1` | Settings JSON | 键名含 v1，破坏性变更升版本 |
| `pomodoro.stats.v1` | DailyStats[] JSON，只保留最近 30 天 | 同上 |

- 读取失败（JSON 损坏 / 字段缺失）时回退默认值，不抛异常
- 不保存「进行中的计时状态」：刷新页面视为重新开始当前阶段（简化设计，PRD 允许）

## 6. 提示音与通知（已实现）

- **提示音资源**：`public/notification.wav`（构建期脚本合成的三音 beep，约 79KB），经 HTMLAudioElement 播放；加载/播放失败时降级为 Web Audio 振荡器双音 beep
- **音频解锁**：浏览器要求用户交互后才能出声。首次点击「开始」时预加载音频并 resume AudioContext
- **通知权限**：页面加载时主动请求一次（需求要求）；用户拒绝时界面显示友好提示横幅，说明影响与开启方式
- **通知发送**：阶段结束即发送（标题「番茄钟」，正文「时间到了，该休息了！」）；不支持或未授权时静默降级，由提示音兜底

## 7. 测试策略

| 层 | 内容 | 工具 |
|---|---|---|
| 单元测试 | 状态机全部迁移路径（含连续跨阶段）、时长计算、storage 降级、统计按天聚合 | Vitest（fake timers / 注入 now） |
| 组件测试 | 开始/暂停/重置按钮行为、设置表单校验边界值 | React Testing Library |
| 手测清单 | 后台标签页 5 分钟后回来时间准确；刷新后设置保留；无通知权限时不报错 | — |

状态机测试用例必须覆盖：到期恰好落在边界、一次 tick 跨多个阶段、completedFocusCount 达到间隔后进入长休息、SKIP 与自动到期行为一致。

## 8. 构建与运行

```bash
# 项目已手工脚手架初始化（Vite 8 + React 19 + TS 7 + Tailwind v4 + Vitest 5）
npm install
npm run dev      # 开发
npm run build    # tsc -b && vite build，产物 dist/
npm run test     # Vitest（--passWithNoTests）
```

部署：纯静态站点，任意静态托管（GitHub Pages / Vercel / Nginx）即可，无环境变量。

## 9. 风险与权衡

| 风险 | 影响 | 对策 |
|---|---|---|
| 后台标签页提示音不准时 | 用户错过阶段切换 | 时间戳方案保证切回时状态正确；通知（系统级）不受节流影响，作为主要后台提醒手段 |
| localStorage 被清空 | 设置/统计丢失 | 接受，纯本地产品定位 |
| AudioContext 自动播放策略 | 首次无提示音 | 首次用户手势时初始化并解锁 |
