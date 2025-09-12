# Contracts

## Contract #1: 单条任务生成 QR 码（通用约束）

**Given**

- 版本 0.4.1；日期：2025-09-12
- 数据来源：Todo 或 Schedule
- 必备字段：`id`，`dueRange[0]`（若为 Schedule）或 `startTime`（若为 Todo）
- 可选字段：`location` / `priority` / `activityTitle` / `startTime` / `doneTime` / `estPomo[]` / `dueRange[1]`
- 时区：Asia/Shanghai（+08:00）

**When**

- 选择该条任务
- 点击 `QrCode24Regular` 按钮生成二维码
- 使用手机相机或系统扫码工具扫描，解析得到 ICS 文本

**Then**

- 生成的 ICS 满足本场景的时间规则与字段要求
- 字段名大写，时间含时区或 UTC；行长遵循软换行
- UID 稳定且唯一（规则建议：`<type>-<id>@your.domain` 或 UUIDv5），不依赖时间戳
- `SUMMARY` 映射 `activityTitle`（若缺失，回退到 `Schedule.activityTitle` 或 `Todo.activityTitle` 任一存在者）
- `DESCRIPTION` 可包含 `location`、`priority`（格式参见“字段映射与校验清单”）

---

## Contract #2: 单条任务生成 QR 码（Todo 无开始/结束时间 → 全天）

**Given**

- 数据：Todo
- 必备字段：`Todo.id`，`Todo.activityTitle`
- 时间：无 `startTime`、无 `doneTime`

**When**

- 如 Contract #1

**Then**

- 导出为全天事件：`DTSTART;VALUE=DATE=<YYYYMMDD>`，`DTEND;VALUE=DATE=<YYYYMMDD+1>`
- `SUMMARY=<Todo.activityTitle>`
- `DESCRIPTION` 可包含 `priority`

---

## Contract #3: 单条任务生成 QR 码（Todo 有 startTime + estPomo）

**Given**

- 数据：Todo
- 必备字段：`Todo.id`，`Todo.activityTitle`，`Todo.startTime（含时区）`，`Todo.estPomo[]`
- 说明：时长 \(N = \max(1, \sum estPomo)\)，总时长 = \(N \times 30\) 分钟

**When**

- 如 Contract #1

**Then**

- `DTSTART = startTime`
- `DTEND = startTime + N×30min`
- 其他字段映射同 Contract #2

---

## Contract #4: 单条任务生成 QR 码（Todo 有 startTime + doneTime）

**Given**

- 数据：Todo
- 必备字段：`Todo.id`，`Todo.activityTitle`，`Todo.startTime`，`Todo.doneTime`
- 说明：不使用 `estPomo` 计算

**When**

- 如 Contract #1

**Then**

- `DTSTART = startTime`
- `DTEND = doneTime`
- 其他字段映射同 Contract #2

---

## Contract #5: 单条任务生成 QR 码（Schedule 有 dueRange[0], dueRange[1]）

**Given**

- 数据：Schedule
- 必备字段：`Schedule.id`，`Schedule.activityTitle`，`Schedule.dueRange[0]`（开始），`Schedule.dueRange[1]`（结束）
- 可选字段：`Schedule.location`

**When**

- 如 Contract #1

**Then**

- `DTSTART = dueRange[0]`
- `DTEND = dueRange[1]`
- `SUMMARY = Schedule.activityTitle`
- `DESCRIPTION` 可包含 `location`

---

## Contract #6: 单条任务生成 QR 码（Schedule 仅有 dueRange[0] 无时长 → 系统默认）

**Given**

- 数据：Schedule
- 必备字段：`Schedule.id`，`Schedule.activityTitle`，`Schedule.dueRange[0]`
- 无 `dueRange[1]`

**When**

- 如 Contract #1

**Then**

- `DTSTART = dueRange[0]`
- `DTEND = dueRange[0] + 默认时长`
- 兼容性说明：不同系统可能显示为与开始时间相同或 +1 小时
- 其他字段映射同 Contract #5
