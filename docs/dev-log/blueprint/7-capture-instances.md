# Capture · 可映射实例 · 清单

> **一句记能落到哪些已有记录** — kind、字段、改错界面、改删时怎么指称。  
> **怎么实现** 见 [`7-capture.md`](./7-capture.md)；**本关开哪些** 只看 [`current.md`](../current.md)。  
> 类型对照 [`src/core/types/`](../../src/core/types/)；身体字段见 [`6-body.md`](./6-body.md)。

---

## 1. 一句话

本文件 = **能力目录**：用户一句话可以映射成哪些「实例种类」。  
加新核心时：在本文件补 kind 行，再在实现侧加 Writer / schema（见 [`7-capture.md`](./7-capture.md)）。

---

## 2. 总原则

- 只映射 **已有业务类型**（或身体蓝图已写明的意向实体）。
- **不做：** 同步配置、图表配置、AI 配置、Dialog 状态等。
- 本关开放范围 **只看 current**；下表是全集意向，不是「已全部实现」。

来源类型：`Todo` / `Schedule` / `Activity` / `Task` 子记录 / `LedgerEntry` / `Tag` / `Project` / `Template` / `Pomo`，以及 [`6-body.md`](./6-body.md)。

---

## 3. 按域清单

### 3.1 计划与日程

| kind | 对应类型（types） | 映射常落到的字段 | 改错界面 |
|------|-------------------|------------------|----------|
| `todo` | `Todo` + 常伴 `Activity`（class `T`） | `activityTitle` / title；`dueDate`；`estPomo`；`priority`；`pomoType`；`status`；`projectName` / projectId；tagIds | 日视图 |
| `schedule` | `Schedule` + `Activity`（class `S`） | `activityTitle`；`activityDueRange`（开始 + 时长 min）；`location`；`status`；`isUntaetigkeit`；project / tags | 日/周日程 |
| `activity` | `Activity` / `ActivityV2` | 当句意是「活动本身」而非已落到 T/S 行时：title、dueDate/dueRange、location、parentId、category/fourZone、repeatParams 等 | Activity 列表 |

### 3.2 任务追踪（挂在 Task 上）

| kind | 对应类型 | 映射常落到的字段 | 改错界面 |
|------|----------|------------------|----------|
| `energy` | `EnergyRecord`（`Task.energyRecords`） | `value`（1–10）；`description`；`recordedAt`；需能关联到哪个 task/source | 任务追踪 / 精力录入 |
| `reward` | `RewardRecord` | 同上结构，奖赏值 1–10 | 任务追踪 |
| `interruption` | `InterruptionRecord` | `interruptionType`（`E`/`I`）；`description`；`recordedAt`；`activityType`（`T`/`S`） | 任务追踪 |

### 3.3 账本

| kind | 对应类型 | 映射常落到的字段 | 改错界面 |
|------|----------|------------------|----------|
| `ledger` | `LedgerEntry` | `amount`；`direction`（income/expense）；`currency`；`memo`；`categoryTagIds` / 分类名 | Gift / 明细 |

### 3.4 标签与项目

| kind | 对应类型 | 映射常落到的字段 | 改错界面 |
|------|----------|------------------|----------|
| `tag` | `Tag` | `name`；可选 `color` / `backgroundColor`（多与其它 kind 一并「打上某标签」） | 标签管理 |
| `project` | `Project` | `title`；`description`；`status`；`dueDate` | 项目相关 UI |

### 3.5 模板与番茄片段

| kind | 对应类型 | 映射常落到的字段 | 改错界面 |
|------|----------|------------------|------|
| `template` | `Template` | `title`；`content`（「存成模板」类句子） | 模板列表 |
| `pomo` | `Pomo` | `start` / `end`；`status`；`intention`（补记一段番茄时） | Timer / 相关记录 |

### 3.6 身体（类型尚未进 `core/types`，字段见 6-body）

| kind | 意向实体 | 映射常落到的字段 | 改错界面 |
|------|----------|------------------|------|
| `hydration` | `HydrationEntry`（蓝图） | `loggedAt`；`amountMl`；`beverage` | 日后 Body 水页 |
| `sleep` | 睡眠记录 | 上床/起床/入睡/醒来；中途醒来；梦；醒来精力等 | 日后 Body |
| `exercise` | 运动记录 | 种类；时间；时长；匹配计划 | 日后 Body |
| `meal` | 进食记录 | 时间；餐次；描述；饥饿/饱足 | 日后 Body |
| `bowel` | 排便记录 | 时间；状态；颜色 | 日后 Body |

### 3.7 占位（尚无独立录入类型）

`Chart` 的 `MetricName` 含 `weight`、`sleep` 等：可预留 `weight` 等 kind，**待有正式 type/存储后再接写入**；不单独当实现依据。

---

## 4. 改删时：语言如何指称「哪一条」

实现规则（锁不住就不写）见 [`7-capture.md`](./7-capture.md) §6。本节只列**语言侧**常见指称方式，供提示词与产品举例；不必一次做全，由 current 选做。

### 4.1 说法例 → 倾向

| 倾向 | 用户说法例 | 映射 |
|------|------------|------|
| 新建 | 「明天下午三点开会」「买菜花了 30」「喝了杯水」 | `op: create` |
| 修改 | 「把开会改到四点」「刚才那笔买菜改成 35」「把明天开会取消」 | `op: update` / `delete` |
| 含糊 | 「开会改到四点」但当天有多场会 | 候选 > 1 → **不写**，要求补指称或去原界面选 |

### 4.2 `target` 指定方式

| 指定方式 | 语言例 | 解析时怎么用 |
|----------|--------|--------------|
| **标题 / 备注关键词** | 「把『开会』改到四点」 | 在对应 kind 里按 title/memo 模糊匹配 |
| **时间锚** | 「今天下午那条」「刚才喝的那杯」 | 用 dueDate / loggedAt / recordedAt 收窄 |
| **金额 / 数值锚** | 「那笔 30 块的」 | ledger 等按 amount 收窄 |
| **种类 + 最近一条** | 「上一笔账改成 35」「刚记的精力改成 4」 | 该 kind 按时间倒序取最近，**仅当唯一合理** |
| **显式 id**（少见） | 调试或复制出来的 id | 精确命中 |
| **相对日程** | 「明天第一条 todo」 | 按日列表顺序（脆弱，慎用） |

### 4.3 与原界面改错的分工

- 一句记擅长：**说得出指称** 的快改。  
- 列表点选更擅长：指称不清、要看上下文。  
锁不住就不抢着改。

---

## 5. 修订

| 日期 | 备注 |
|------|------|
| 2026-08-07 | 自 `7-capture.md` 拆出：原 §4.2 能力清单 + §4.4 指称/说法表 |
