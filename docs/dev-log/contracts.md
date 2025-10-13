# Contracts

## Contract #1: 单条任务生成 QR 码（通用约束）

### Given

- 版本 0.4.1；日期：2025-09-12
- 数据来源：Todo 或 Schedule
- 必备字段：`id`，`dueRange[0]`（若为 Schedule）或 `startTime`（若为 Todo）
- 可选字段：`location` / `priority` / `activityTitle` / `startTime` / `doneTime` / `estPomo[]` / `dueRange[1]`
- 时区：Asia/Shanghai（+08:00）

### When

- 选择该条任务
- 点击 `QrCode24Regular` 按钮生成二维码
- 使用手机相机或系统扫码工具扫描，解析得到 ICS 文本

### Then

- 生成的 ICS 满足本场景的时间规则与字段要求
- 字段名大写，时间含时区或 UTC；行长遵循软换行
- UID 稳定且唯一（规则建议：`<type>-<id>@your.domain` 或 UUIDv5），不依赖时间戳
- `SUMMARY` 映射 `activityTitle`（若缺失，回退到 `Schedule.activityTitle` 或 `Todo.activityTitle` 任一存在者）
- `DESCRIPTION` 可包含 `location`、`priority`（格式参见“字段映射与校验清单”）

---

## Contract #2: 单条任务生成 QR 码（Todo 无开始/结束时间 → 全天）

### Given

- 数据：Todo
- 必备字段：`Todo.id`，`Todo.activityTitle`
- 时间：无 `startTime`、无 `doneTime`

### When

- 如 Contract #1

### Then

- 导出为全天事件：`DTSTART;VALUE=DATE=<YYYYMMDD>`，`DTEND;VALUE=DATE=<YYYYMMDD+1>`
- `SUMMARY=<Todo.activityTitle>`
- `DESCRIPTION` 可包含 `priority`

---

## Contract #3: 单条任务生成 QR 码（Todo 有 startTime + estPomo）

### Given

- 数据：Todo
- 必备字段：`Todo.id`，`Todo.activityTitle`，`Todo.startTime（含时区）`，`Todo.estPomo[]`
- 说明：时长 \(N = \max(1, \sum estPomo)\)，总时长 = \(N \times 30\) 分钟

### When

- 如 Contract #1

### Then

- `DTSTART = startTime`
- `DTEND = startTime + N×30min`
- 其他字段映射同 Contract #2

---

## Contract #4: 单条任务生成 QR 码（Todo 有 startTime + doneTime）

### Given

- 数据：Todo
- 必备字段：`Todo.id`，`Todo.activityTitle`，`Todo.startTime`，`Todo.doneTime`
- 说明：不使用 `estPomo` 计算

### When

- 如 Contract #1

### Then

- `DTSTART = startTime`
- `DTEND = doneTime`
- 其他字段映射同 Contract #2

---

## Contract #5: 单条任务生成 QR 码（Schedule 有 dueRange[0], dueRange[1]）

### Given

- 数据：Schedule
- 必备字段：`Schedule.id`，`Schedule.activityTitle`，`Schedule.dueRange[0]`（开始），`Schedule.dueRange[1]`（结束）
- 可选字段：`Schedule.location`

### When

- 如 Contract #1

### Then

- `DTSTART = dueRange[0]`
- `DTEND = dueRange[1]`
- `SUMMARY = Schedule.activityTitle`
- `DESCRIPTION` 可包含 `location`

---

## Contract #6: 单条任务生成 QR 码（Schedule 仅有 dueRange[0] 无时长 → 系统默认）

### Given

- 数据：Schedule
- 必备字段：`Schedule.id`，`Schedule.activityTitle`，`Schedule.dueRange[0]`
- 无 `dueRange[1]`

### When

- 如 Contract #1

### Then

- `DTSTART = dueRange[0]`
- `DTEND = dueRange[0] + 默认时长`
- 兼容性说明：不同系统可能显示为与开始时间相同或 +1 小时
- 其他字段映射同 Contract #5

---

## Contract #6（S2 C1 UV1）：数据页面右侧内容“加星”显示与编辑

### Goals

- 在右侧内容区域显示星标并可点击切换，使用现有数据与接口，不修改字段语义或可选值。
- 与左侧列表联动：依赖既有订阅/刷新机制自然同步，不新增状态机或接口规则。

### Given

- 实体：`Task`
  - 字段：`task.id: string`（必备）
  - 字段：`task.starred?: boolean | undefined`（沿用现有语义，不做收敛或变更）
- 页面：数据页面，左右分栏；右侧显示所选 `Task` 的内容区域。
- 左侧列表可能启用“仅显示加星”筛选（联动基于既有 store/订阅机制，无新增契约）。
- 已存在可用的“切换星标”的调用能力（接口或 action）；本次变更仅调用，不调整其请求/响应结构与字段语义。

## When

- 右侧内容区域渲染所选 `Task`。
- 用户点击右侧星标控件 `toggleTaskStar`。

### Then

- 显示规则（纯 UI 展示，沿用现有语义）：
  - `task.starred === true` → 显示“实心星”
  - `task.starred === false` 或 `undefined` → 显示“空心星”
- 点击切换（调用既有能力，不改变底层契约）：
  - 切换目标值：从“当前是否为 `true`”取反，即 `next = !(task.starred === true)`
  - `toggleTaskStar` useDataStore
  - 不引入新的“状态机定义”、不声明“不可回到 undefined”等新规则；保持现有后端/Store 语义不变
- 左侧联动：
  - 左侧列表基于 pinia 刷新

好的，收到！我立刻根据你的更正信息修改 `Contract #7`。

将 `activity.tagIds: string[]` 更正为 `activity.tagIds: number[]`，并将全局筛选状态的字段名和位置更正为 `searchUi.filterTagIds`。

这是更新后的版本：

---

## Contract #7（S2 C1 UV1）：数据页面“标签”显示、编辑与筛选

### Goals

- 在右侧内容区域显示标签列表，并可管理：使用 `TagRenderer` 显示 `activity.tagIds`，并通过 `TagManager` 实现增删。
- 与左侧列表联动筛选：点击右侧标签可触发左侧列表筛选；多次点击可叠加或取消筛选，并清晰展示当前筛选条件。

### Given

- 实体与数据：
  - 实体 `Activity`，包含字段 `activity.tagIds: number[]`（存储标签 ID 的数组）。
  - 已有全局 `Tag` 数据源，可通过 `tagId: number` 获取标签的名称、颜色等信息。
- UI 组件：
  - `TagRenderer`: 用于在右侧内容区渲染只读的标签列表。
  - `TagManager`: 一个可交互的标签管理器（可能在弹窗或侧边栏中），允许用户从已有标签中选择，或从 `activity.tagIds` 中移除（点击 `×`）。
  - 左侧列表：展示 `Activity` 列表，并能响应全局的筛选状态。
- 状态管理 (State)：
  - 存在一个 `searchUi` 状态（如 Pinia Store），其中包含用于管理当前标签筛选条件的字段 `searchUi.filterTagIds: number[]`。
  - 左侧列表已订阅此状态，当 `searchUi.filterTagIds` 变更时会自动刷新显示结果。
- 既有能力：
  - 已存在更新 `activity.tagIds` 的调用能力（接口或 action）。
  - 已存在更新 `searchUi.filterTagIds` 的 action。

### When

1. 标签显示：右侧内容区域渲染所选 `Activity+Task`。
2. 标签编辑：用户点击 Tag16Regular 按钮打开 `TagManager`，并点击某个标签上的 `×` 将其移除。
3. 单标签筛选：用户直接点击右侧/左侧内容区（`TagRenderer` 中）的某个标签。
4. 取消单标签筛选：右侧用户再次点击同一个已被激活为筛选条件的标签。
5. 叠加筛选：用户在已有一个或多个标签筛选激活的状态下，点击另一个不同的标签。
6. 清除所有筛选：左侧用户点击“一键清除筛选”控件。

### Then

- 1. 显示规则 (UI 展示)：

  - `TagRenderer` 遍历 `activity.tagIds`，根据每个 `tagId: number` 从全局数据源获取信息，渲染出带颜色和名称的标签。
  - 若 `activity.tagIds` 为空，则不显示任何标签。

- 2. 编辑规则 (调用既有能力)：

  - 点击 `×` 时，调用更新 `Activity` 的 action，将对应的 `tagId` 从 `activity.tagIds` 数组中移除。
  - `TagManager` 本身不直接改变左侧列表的筛选状态。

- 3. 筛选与联动规则 (更新全局 State)：

  - 单标签筛选：调用 action，将该 `tagId` 添加到 `searchUi.filterTagIds` 数组中。左侧列表根据订阅自动刷新，仅显示同时包含所有 `filterTagIds` 中标签的 `Activity`。
  - 取消筛选：调用 action，将该 `tagId` 从 `searchUi.filterTagIds` 数组中移除。左侧列表自动刷新。
  - 叠加筛选：行为与“单标签筛选”一致，即将新的 `tagId` 追加到 `searchUi.filterTagIds` 数组中，实现“与”逻辑的叠加筛选。
  - 清除筛选：调用 action，将 `searchUi.filterTagIds` 数组置空 (`[]`)。左侧列表恢复显示所有条目。
  - 界面需要明确显示当前激活的筛选标签（例如在列表顶部或搜索栏下方）。
