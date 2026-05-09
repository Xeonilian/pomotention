# Pomotention 分层约定（工作版）

## 目标

- 降低单文件体积，避免 `view` 持续膨胀。
- 统一 `view / component / composable / service / action` 的职责边界。
- 给键盘、点击、后续 AI/CLI 提供同一命令入口。

## 分层定义

- `views/`
  - 路由页面编排层，只做组装与接线。
  - 不承载复杂业务流程与长逻辑函数。
- `components/`
  - 可渲染 UI 单元，负责局部交互与输入体验。
  - 通过 `emit` 上抛意图，不直接耦合全局命令。
- `composables/`
  - 可复用的有状态行为模块，组织跨组件流程。
  - 推荐按域分组，例如 `composables/home/*`。
- `services/`
  - 纯业务函数和数据处理逻辑，尽量无 Vue 依赖。
  - 便于独立测试和复用。
- `actions/`
  - 统一命令层（Action Layer），管理 `canRun/run`。
  - 键盘、点击、AI/CLI 都应汇聚到此层。

## 约束规则

- 超过约 800 行的 `view` 或 `component`，优先拆分。
- 新增中复杂逻辑默认进入 `composable` 或 `service`，不要直接塞进 `view`。
- `MainLayout` 负责全局输入路由，不承担业务细节。
- 命令触发路径优先走 `actions`，避免旁路调用。

## 当前执行策略

- 先将 `HomeView` 的 planner 键盘与行编辑逻辑迁移到 `composables/home/`。
- 保留旧路径兼容导出，逐步迁移引用。
- 每次功能迭代同步执行“拆分 + 接线”而非继续堆积。
