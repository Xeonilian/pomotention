# Capture · 一句记 · 蓝图

> **一句记要做成什么、怎么做成** — 最外层输入口、文字映射、AI 协助（含与收费关系）、写入已有记录。  
> **本关做哪一段** 由 [`current.md`](../current.md) 定；本文件描述完整能力，不替代 current 的选型。  
> 构想池 [`0-vision.md`](./0-vision.md)；分层 [`1-architecture-layering.md`](./1-architecture-layering.md)。

---

## 1. 名字与一句话

| 层 | 定稿 |
|----|------|
| 用户向 | **一句记** |
| 域名 / 代码 | `capture` |
| 本文件 | `7-capture.md` |

> 用户在 **App 最外层** 提交一句自然语言，由 **LLM 映射** 成某类已有记录（含新建一条 todo）并写入；写错了在原界面改。**capture 是付费功能**。

---

## 2. 功能是什么

一条流水线（**纯 LLM 映射，无规则路径、无兜底**）：

```text
最外层输入口（得到一段文字）
  → AiMapper：一次 LLM 调用（结构化输出 / Zod 校验）
       一句可产出多条意图：每条 { op, kind, target, fields, confidence }
  → Validator：schema 不过 / confidence 低 / target 锁不住 → 不写
  → Writer[kind] 写入对应 type 的已有数据
  → Reporter：成功/失败提示；原界面查看与改错
```
（映射由 LLM 完成见 §4.3；新建 vs 修改见 §4.4；模块拆分见 §4.5；付费门闩见 §5。）

---

## 3. 输入：全部可能

一句记 **只消费文本**。凡能把字送进同一输入框（或同一提交 API）的，都算合法输入。

| 输入方式 | 说明 |
|----------|------|
| **键盘打字** | 主路径；用户在一句记框里输入后提交 |
| **系统输入法语音** | 手机/系统 IME 自带语音识别，把结果填进同一输入框。**本 App 不做自研语音识别**；做到框可聚焦、可接收 IME 结果即可（必要时引导系统语音键） |
| **粘贴** | 剪贴板贴入同一框再提交 |
| **程序化提交** | 同一套「提交一句文本」API（供测试、快捷指令、以后其它入口复用） |

提交后一律变成 `string` → §4 映射。

---

## 4. 文字映射（核心怎么实现）

### 4.1 产物

映射成功时产出结构化意图，例如：

```text
{ op: "create" | "update" | "delete",   // 默认可视为 create
  kind: "<下表 kind>",
  target: null | { …如何锁定已有条目… },  // create 时为 null
  fields: { …要写入或要改的字段… },
  confidence: "high" | "low" }
```

- `confidence` 低或不识别 → **不写入**，提示改写或去原界面手记。  
- **`op: update` / `delete` 时必须能解析出 `target`**；锁不住唯一条目 → 不写，提示说得更具体或去列表里改。  
- 本关开放哪些 `kind` / 是否开改删：**只看 current**；下表按 [`src/core/types/`](../../src/core/types/) 与身体蓝图枚举能力。

### 4.2 可映射种类（能力清单）

来源：`Todo` / `Schedule` / `Activity` / `Task` 子记录 / `LedgerEntry` / `Tag` / `Project` / `Template` / `Pomo`，以及 [`6-body.md`](./6-body.md) 身体字段意向。  
**不同步、图表配置、AI 配置、Dialog 状态等**不作为一句记目标。

#### 计划与日程

| kind | 对应类型（types） | 映射常落到的字段 | 改错界面 |
|------|-------------------|------------------|----------|
| `todo` | `Todo` + 常伴 `Activity`（class `T`） | `activityTitle` / title；`dueDate`；`estPomo`；`priority`；`pomoType`；`status`；`projectName` / projectId；tagIds | 日视图 |
| `schedule` | `Schedule` + `Activity`（class `S`） | `activityTitle`；`activityDueRange`（开始 + 时长 min）；`location`；`status`；`isUntaetigkeit`；project / tags | 日/周日程 |
| `activity` | `Activity` / `ActivityV2` | 当句意是「活动本身」而非已落到 T/S 行时：title、dueDate/dueRange、location、parentId、category/fourZone、repeatParams 等 | Activity 列表 |

#### 任务追踪（挂在 Task 上）

| kind | 对应类型 | 映射常落到的字段 | 改错界面 |
|------|----------|------------------|----------|
| `energy` | `EnergyRecord`（`Task.energyRecords`） | `value`（1–10）；`description`；`recordedAt`；需能关联到哪个 task/source | 任务追踪 / 精力录入 |
| `reward` | `RewardRecord` | 同上结构，奖赏值 1–10 | 任务追踪 |
| `interruption` | `InterruptionRecord` | `interruptionType`（`E`/`I`）；`description`；`recordedAt`；`activityType`（`T`/`S`） | 任务追踪 |

#### 账本

| kind | 对应类型 | 映射常落到的字段 | 改错界面 |
|------|----------|------------------|----------|
| `ledger` | `LedgerEntry` | `amount`；`direction`（income/expense）；`currency`；`memo`；`categoryTagIds` / 分类名 | Gift / 明细 |

#### 标签与项目

| kind | 对应类型 | 映射常落到的字段 | 改错界面 |
|------|----------|------------------|----------|
| `tag` | `Tag` | `name`；可选 `color` / `backgroundColor`（多与其它 kind 一并「打上某标签」） | 标签管理 |
| `project` | `Project` | `title`；`description`；`status`；`dueDate` | 项目相关 UI |

#### 模板与番茄片段

| kind | 对应类型 | 映射常落到的字段 | 改错界面 |
|------|----------|------------------|----------|
| `template` | `Template` | `title`；`content`（「存成模板」类句子） | 模板列表 |
| `pomo` | `Pomo` | `start` / `end`；`status`；`intention`（补记一段番茄时） | Timer / 相关记录 |

#### 身体（类型尚未进 `core/types`，字段见 6-body）

| kind | 意向实体 | 映射常落到的字段 | 改错界面 |
|------|----------|------------------|----------|
| `hydration` | `HydrationEntry`（蓝图） | `loggedAt`；`amountMl`；`beverage` | 日后 Body 水页 |
| `sleep` | 睡眠记录 | 上床/起床/入睡/醒来；中途醒来；梦；醒来精力等 | 日后 Body |
| `exercise` | 运动记录 | 种类；时间；时长；匹配计划 | 日后 Body |
| `meal` | 进食记录 | 时间；餐次；描述；饥饿/饱足 | 日后 Body |
| `bowel` | 排便记录 | 时间；状态；颜色 | 日后 Body |

#### 图表指标名里已出现、尚无独立录入类型的（仅占位）

`Chart` 的 `MetricName` 含 `weight`、`sleep` 等：一句记可预留 `weight` 等 kind，**待有正式 type/存储后再接写入**；不单独当本关实现依据。

### 4.3 映射由 LLM 完成（不做规则路径）

一句记的「文字 → 意图」**整体交给 LLM**，不自建词典/口令/抽取器/TargetResolver 等规则基础设施。

| 项 | 说明 |
|----|------|
| 输入 | 用户原句 + 当前允许的 kind/字段说明 + 候选条目摘要（改删时） |
| 输出 | 一条或多条 `{ op, kind, target, fields, confidence }`，受 Zod schema 约束 |
| 约束 | 提示词禁止瞎编 kind；`update/delete` 必须给 `target`；锁不住 → `confidence: low` |
| 校验 | schema 不过 / `confidence` 低 / `target` 不唯一 → **不写**，提示改写或去原界面 |
| 依赖 | 需网络；超时/失败 → 不写并明确报错（不降级为规则） |

一句多条意图（「买菜 30，再记个明天开会」）由 LLM 一次切分产出多条；任一条不过校验可整批不写或只写成功的（策略由 current 定，默认 **能写的写、失败的回报**）。

**为何不做规则兜底：** capture 是云端付费功能，能调 LLM 的前提就是联网+付费；模型失败时「重试/改写/去原界面」比「规则硬猜」更安全。规则路径要为 12+ kind 各建词典/抽取器/TargetResolver，工作量远大于它解决的 0.x% 失败场景。免费尝鲜若需要，用「免费 LLM 额度」做，不另建规则引擎。

### 4.4 新建 vs 修改：语言如何指定「哪一条」

新建相对直接：映射出 `kind` + `fields` → `create`。  
**修改 / 删除**多一步：句子里要能让系统知道 **改的是已有的哪一条**，再改字段。

#### 意图判别（语言线索）

| 倾向 | 用户说法例 | 映射 |
|------|------------|------|
| 新建 | 「明天下午三点开会」「买菜花了 30」「喝了杯水」 | `op: create` |
| 修改 | 「把开会改到四点」「刚才那笔买菜改成 35」「把明天开会取消」 | `op: update` / `delete` |
| 含糊 | 「开会改到四点」但当天有多场会 | 候选 > 1 → **不写**，要求补指称或去原界面选 |

改/删动词与「把…改成…」句式由 LLM 理解；指称复杂时 LLM 仍须产出可执行的 `target`，否则 `confidence: low` 不写。

#### `target`：语言里常见的指定方式

不必一次做全；蓝图先列齐，由 current 选做哪些解析策略。

| 指定方式 | 语言例 | 解析时怎么用 |
|----------|--------|--------------|
| **标题 / 备注关键词** | 「把『开会』改到四点」 | 在对应 kind 里按 title/memo 模糊匹配 |
| **时间锚** | 「今天下午那条」「刚才喝的那杯」 | 用 dueDate / loggedAt / recordedAt 收窄 |
| **金额 / 数值锚** | 「那笔 30 块的」 | ledger 等按 amount 收窄 |
| **种类 + 最近一条** | 「上一笔账改成 35」「刚记的精力改成 4」 | 该 kind 按时间倒序取最近，**仅当唯一合理** |
| **显式 id**（少见） | 调试或复制出来的 id | 精确命中 |
| **相对日程** | 「明天第一条 todo」 | 按日列表顺序（脆弱，慎用） |

#### 匹配结果怎么处理

| 结果 | 行为 |
|------|------|
| **恰好 1 条** | 执行 update/delete |
| **0 条** | 不写；提示找不到，可改为新建或去列表找 |
| **多条** | 不写；提示补充指称（或 LLM 列候选让用户确认——若做，属交互增强，current 定） |

修改时 `fields` 只带 **要改的字段**（补丁），不是整行重写。

#### 与「原界面改错」的分工

- 一句记擅长：**说得出指称** 的快改（改时间、改金额、取消）。  
- 列表里点选更擅长：指称不清、要看上下文再改。  
两者并存；一句记锁不住就不抢着改。

### 4.5 模块怎么拆

加新核心 = **加 kind 的 Writer 适配**；映射层不变（始终是 LLM）。每一层只做一件事。

```text
[输入] rawText
    → AiMapper        一次 LLM 调用 → 一条或多条 { op, kind, target, fields, confidence }
    → Validator       Zod schema + confidence + target 唯一性；不过则本条不写
    → Writer[kind]    create/update/delete → 现有 store/service（薄适配器）
    → Reporter        成功/失败提示
```

| 模块 | 职责 | 加「新核心」时改什么 |
|------|------|----------------------|
| **AiMapper** | 文本 → 意图（一次 LLM 调用，schema 约束） | prompt 里加新 kind 的字段说明 |
| **Validator** | Zod 校验 + `target` 唯一性 + `confidence` 阈值 | 新 kind 的 schema 分支 |
| **Writer** | 调现有 API 改数据 | **薄适配器**：只转成 Todo/LedgerEntry/… 的写入调用 |
| **Reporter** | 成功/失败提示 | 一般不改 |

**一次一条或多条：** AiMapper 产出列表；Writer 按条执行；汇报按条汇总。

**数据落点：** 最终一定是改 `Todo` / `LedgerEntry` / `EnergyRecord` 等已有结构；capture 不自建另一套「影子表」。

**不做的：** Splitter / Classifier / TargetResolver / FieldExtractor / Normalizer 等规则模块——全部压进 AiMapper 一次 LLM 调用。也不引入 `tasknotes-nlp-core` / `chrono-node` / Costflow 等规则库（它们服务规则路径，本蓝图不采用）。

---

## 5. 付费门闩（capture 是付费功能）

一句记整体是 **付费 / 会员功能**：映射由 LLM 完成，LLM 调用消耗额度，因此未付费不可用。

| 状态 | 行为 |
|------|------|
| **未付费** | 一句记入口禁用，或提交时提示升级；不提供任何「规则版」替代 |
| **付费 / 会员** | 可用；消耗额度或含在会员内 — 具体价与额度由收费关 / current 定 |
| **免费尝鲜（可选）** | 若需，用「免费 LLM 额度」（如每月 N 条）实现，不另建规则引擎 |

### 5.1 实现要点

1. 组装提示：用户原句、当前允许的种类与字段说明、要求结构化意图、禁止瞎编种类；改删时附候选条目摘要。
2. 调用模型（厂商 API 或日后自选）；Zod 校验返回。
3. 校验通过 → 走 Writer；失败 → 不写并提示「重试 / 改写 / 去原界面」。
4. 需网络；超时/失败 → 明确报错，**不降级为规则**。
5. 付费门闩在入口处拦截，不进入 LLM 调用。

蓝图约定：**capture 能力绑定付费权益**；价目表不写死在本文件。收费底座见 roadmap「收费 + 推广」。

---

## 6. 写入与改错

1. 按 `op` 调用现有 service：`create` / `update` / `delete`（update 须先解析 `target`）。  
2. 成功后可轻提示「已新建 / 已改××」；用户到对应原界面核对。  
3. 列表里的改删仍可用；一句记不另做全屏编辑器。

---

## 7. 代码落点（与 §4.5 对应）

| 层 | 意向 |
|----|------|
| UI | `src/components/Capture/` — 最外层输入、提交、逐条结果、付费门闩提示 |
| 映射 | `src/core/capture/` — AiMapper（prompt + LLM 调用）、Validator（Zod）、编排 |
| kind 适配 | `src/core/capture/kinds/<kind>/` — Writer 适配（调现有 service） |
| 权益 | 会员状态门闩，入口处拦截 |

遵守 [`1-architecture-layering.md`](./1-architecture-layering.md)。

---

## 8. 修订

| 日期 | 备注 |
|------|------|
| 2026-07-29 | 初稿 |
| 2026-07-29 | 重写：输入全表、规则/AI 映射、收费关系；语音=系统 IME；范围交给 current |
| 2026-07-29 | 入口定为最外层；todo 与 ledger 同级可映射；去掉 title/ledger 语法纠缠 |
| 2026-07-29 | §4.2 按 `src/core/types` + 6-body 展开能力清单 |
| 2026-07-29 | §4.4 新建 vs 修改：语言指定 target；多候选不写 |
| 2026-07-29 | §4.3 无 AI 多手段；§4.5 模块拆分（插件化 kind） |
| 2026-07-29 | §4.6 可借库：tasknotes / chrono 怎么接；Costflow 只借思路；其余一句不采用 |
| 2026-07-29 | 转向纯 LLM 路径：删 §4.3 规则手段 / §4.6 借库；§4.5 模块简化为 AiMapper+Validator+Writer+Reporter；§5 改付费门闩（无规则兜底、无免费规则层） |
