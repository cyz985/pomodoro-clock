# AGENTS.md — AI 协作者指南

本文件面向在本仓库中工作的 AI 编码助手，说明项目背景、约定与边界。

## 1. 项目一句话

纯前端番茄钟计时器 SPA：Vite 8 + React 19 + TypeScript 7 + Tailwind CSS v4，无后端、无账号，所有数据存 localStorage。

## 2. 权威文档

| 文档 | 作用 |
|---|---|
| [PRD.md](./PRD.md) | 功能需求与验收标准（做什么） |
| [TECH_DESIGN.md](./TECH_DESIGN.md) | 架构、状态机、模块接口（怎么做） |

需求或设计与代码冲突时，以上述文档为准；修改行为前先更新文档。

## 3. 常用命令

```bash
npm run dev        # 启动开发服务器
npm run build      # 生产构建（须零 TypeScript 错误）
npm run test       # 运行 Vitest
npm run test -- --watch   # 监听模式
```

## 4. 代码约定

- TypeScript 严格模式，禁止 `any`（确需时用 `unknown` + 收窄）
- 组件一律函数组件 + Hooks；逻辑优先下沉到 `core/` 纯函数，组件保持「薄」
- 计时核心规则（不可违反）：
  - 剩余时间必须由 `endAt - Date.now()` 推导，**禁止**用 `setInterval` 递减计数
  - 阶段流转逻辑只存在于 `core/timerMachine.ts`，组件不得自行判断阶段切换
  - `advancePhase` 必须支持一次 tick 跨多个阶段（while 循环推进）
- localStorage 读写只能经由 `services/storage.ts`，键名带版本后缀（`.v1`）
- 浏览器 API（Notification / Audio）调用必须经 `services/` 封装并做降级，组件不直接调用
- 样式方案已确定为 Tailwind CSS v4（`@tailwindcss/vite` 插件），全项目统一，禁止引入 CSS Modules

## 5. 测试要求

- 修改 `core/` 下任何逻辑，必须同步更新对应单测并通过
- 状态机变更需补充迁移路径用例（见 TECH_DESIGN.md 第 7 节）
- 提交前 `npm run build && npm run test` 全绿

## 6. 边界（不要做的事）

- 不引入后端、数据库、账号体系、网络请求（PRD 非目标）
- 不添加路由 —— 单页应用，设置用面板/弹层实现
- 不引入重型状态库（Redux 等），当前 useReducer + Context 足够
- 不把「进行中的计时状态」持久化 —— 刷新即重置当前阶段是既定设计
- 不为 v1.0 非目标功能（任务清单、白噪音等）预留抽象

## 7. 完成定义（DoD）

1. 行为符合 PRD 验收标准
2. `npm run build` 零错误、`npm run test` 全通过
3. 新逻辑有对应单测
4. 涉及需求/设计变更时，PRD.md 或 TECH_DESIGN.md 已同步更新
