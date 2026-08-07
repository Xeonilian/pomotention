# Capture · 一句记 · 怎么实现

> **一句记怎么做成** — 流水线、意图形状、LLM 映射、校验与写入、付费门闩、代码落点。  
> **能映射哪些种类 / 字段** → [`7-capture-instances.md`](./7-capture-instances.md)。  
> **本关做哪一段** → [`current.md`](../current.md)。  
> **藏 key / 配额 / 鉴权** → [`8-ai-gateway.md`](./8-ai-gateway.md)。  
> 分层 → [`1-architecture-layering.md`](./1-architecture-layering.md)。

---

## 1. 名字与一句话

| 层 | 定稿 |
|----|------|
| 用户向 | **一句记** |
| 域名 / 代码 | `capture` |
| 本文件 | `7-capture.md`（实现） |
| 能力清单 | [`7-capture-instances.md`](./7-capture-instances.md) |

> 用户在 **App 最外层** 提交一句自然语言 → 经 **LLM**（大语言模型，外部服务）映射成结构化意图 → 校验通过后写入 **已有** 记录；写错了在原界面改。**capture 是付费功能**。

---

## 2. 流水线（白话）

用户打一句话 → 问云端 AI「要记成什么」→ AI 按我们规定的 JSON 字段回答 → 咱们代码检查格式 → 通过才写入 → 短提示成功/失败。  
**纯 LLM 映射**：无词典/口令规则引擎；失败不降级为规则硬猜。

```text
输入口（得到一段文字）          ← App 功能（如 CapturePanel）
  → AiMapper：调 LLM，拿到意图字符串  ← App 模块名；LLM = 外部服务
  → Validator：对照说明书检查能否写   ← App 步骤；多用 Zod（外部库）
  → Writer[kind]：写入已有 store     ← App 薄适配器
  → Reporter：成功/失败提示          ← App（可就在面板上）
```

| 名字 | 是什么 | 外部技术 or App 自拼 |
|------|--------|----------------------|
| **LLM** | 大语言模型（如 Kimi / Moonshot） | 外部服务 |
| **结构化输出** | 要求 AI 只按固定 JSON 字段回答，不闲聊 | 做法：靠 **提示词** 约束 |
| **Zod** | 检查「数据长得对不对」的 TS 库 | 外部 npm 包 |
| **schema** | 允许的数据形状说明书 | App 约定（如 `schema.ts`） |
| **AiMapper / Validator / Writer / Reporter** | 流水线四站的绰号 | App 自拼模块名 |
| **kind / op / confidence / target** | 意图字段名 | App 约定，见 §4 |

一句可产出 **多条** 意图；默认 **能写的写、失败的回报**（细节由 current 定）。

---

## 3. 输入：全部可能

一句记 **只消费文本**。凡能把字送进同一输入框（或同一提交 API）的，都算合法输入。

| 输入方式 | 说明 |
|----------|------|
| **键盘打字** | 主路径 |
| **系统输入法语音** | 手机/系统 IME 识别后填进同一框。**本 App 不做自研语音识别** |
| **粘贴** | 剪贴板贴入同一框再提交 |
| **程序化提交** | 同一套「提交一句文本」API（测试、快捷指令等） |

提交后一律变成 `string` → §5 映射。

---

## 4. 意图形状（产物）

映射成功时产出一条或多条结构化意图，例如：

```text
{ op: "create" | "update" | "delete",
  kind: "<见 instances 清单>",
  target: null | { …锁定已有条目… },   // create 时为 null
  fields: { …要写入或要改的字段… },
  confidence: "high" | "low" }
```

| 字段 | 含义 |
|------|------|
| `op` | 操作：新建 / 改 / 删 |
| `kind` | 记哪一类；全集见 [`7-capture-instances.md`](./7-capture-instances.md) |
| `fields` | 要写或要改的字段（update 只带补丁） |
| `target` | 改删时「改哪一条」；create 为 null |
| `confidence` | AI 自评把握；`low` → **不写** |

- schema 不过 / `confidence` 低 / `target` 锁不住 → **不写入**，提示改写或去原界面。  
- 本关开放哪些 kind、是否开改删：**只看 current**。

---

## 5. 映射怎么做（LLM + 校验）

「文字 → 意图」**整体交给 LLM**，不自建词典/口令/抽取器等规则基础设施。

| 项 | 说明 |
|----|------|
| 输入 | 用户原句 + 当前允许的 kind/字段说明（来自 instances / current）+ 改删时的候选摘要 |
| 输出 | 一条或多条 §4 形状的意图；受 Zod schema 约束 |
| 约束 | **提示词**禁止瞎编 kind；`update/delete` 必须给 `target`；锁不住 → `confidence: low` |
| 校验 | schema 不过 / `confidence` 低 / `target` 不唯一 → **不写** |
| 依赖 | 需网络；超时/失败 → 不写并明确报错（**不降级为规则**） |

**为何 AI「知道」要结构化输出：** 不是 Zod 教的，是请求里的 **system / kindsHint 提示词** 要求「只输出合法 JSON」。Zod 是回答回来之后，**App 自己再检查**有没有胡说。

**为何不做规则兜底：** capture 绑定联网+付费；失败时「重试/改写/去原界面」比硬猜更安全。规则路径要为大量 kind 各建抽取器，成本远高于它覆盖的失败率。免费尝鲜若需要，用「免费 LLM 额度」，不另建规则引擎。

调用与配额细节见 [`8-ai-gateway.md`](./8-ai-gateway.md)。第一刀落地代码：`src/core/capture/`、`src/components/Capture/`；关票摘要见 [`history/archive/2026-08-capture-v1.md`](../history/archive/2026-08-capture-v1.md)。

---

## 6. 新建 vs 改删（实现规则）

- **新建：** 映射出 `kind` + `fields` → `op: create` → Writer。  
- **改 / 删：** 还必须能解析出唯一 `target`；锁不住 → **不写**。  
- 修改时 `fields` 只带 **要改的字段**（补丁），不是整行重写。

| 匹配结果 | 行为 |
|----------|------|
| 恰好 1 条 | 执行 update/delete |
| 0 条 | 不写；提示找不到 |
| 多条 | 不写；提示补充指称（或以后做候选确认，current 定） |

语言侧说法例、指称方式表 → [`7-capture-instances.md`](./7-capture-instances.md) §4。  
一句记锁不住就不抢着改；列表点选仍可用。

---

## 7. 模块与代码落点

加新核心 = **加 kind 的 Writer 适配** + instances 补行 + prompt/schema；映射层仍是一次 LLM。

```text
rawText
  → AiMapper     一次 LLM → 意图列表
  → Validator    Zod + confidence + target 唯一性
  → Writer[kind] create/update/delete → 现有 store/service
  → Reporter     成功/失败提示
```

| 模块 | 职责 | 加新 kind 时改什么 |
|------|------|-------------------|
| **AiMapper** | 文本 → 意图（调 LLM） | prompt 里加字段说明 |
| **Validator** | 校验能否写 | 新 kind 的 schema 分支 |
| **Writer** | 调现有 API 改数据 | 薄适配器 |
| **Reporter** | 提示用户 | 一般不改 |

| 层 | 落点 |
|----|------|
| UI | `src/components/Capture/` |
| 映射与编排 | `src/core/capture/` |
| kind 适配 | `src/core/capture/kinds/<kind>/`（或同级 Writer；按落地整理） |
| 网关 | `worker/ai-gateway/` + `aiApiService`（见 8-ai-gateway） |

**数据落点：** 只改已有 `Todo` / `LedgerEntry` 等；capture **不**自建影子表。  
**不做：** Splitter / Classifier / TargetResolver 等规则模块；不引入 tasknotes-nlp / chrono-node / Costflow 规则库。

---

## 8. 付费门闩

映射消耗 LLM 额度 → 未付费不可用；**不提供规则版替代**。

| 状态 | 行为 |
|------|------|
| 未付费 | 入口禁用或提交时提示升级 |
| 付费 / 会员 | 可用；额度由收费关 / current 定 |
| 免费尝鲜（可选） | 免费 LLM 次数，不另建规则引擎 |

实现要点：

1. 组装提示（原句、允许 kind、要求 JSON；改删附候选）。  
2. 经网关调模型；Zod 校验。  
3. 通过 → Writer；失败 → 不写并提示。  
4. 网络失败明确报错，不降级规则。  
5. **入口先拦权益**，不进入 LLM。  

价目表不写死本文件。网关配额 / entitlement → [`8-ai-gateway.md`](./8-ai-gateway.md)。

---

## 9. 写入与改错

1. 按 `op` 调现有 service（update/delete 须已有唯一 `target`）。  
2. 轻提示「已新建 / 已改××」；用户到原界面核对。  
3. 列表改删仍可用；一句记不另做全屏编辑器。

---

## 10. 修订

| 日期 | 备注 |
|------|------|
| 2026-07-29 | 初稿及多轮定稿（输入、纯 LLM、付费门闩、模块拆分） |
| 2026-08-07 | 曾增运行时细讲节；同日删除（改由代码与 archive 承担） |
| 2026-08-07 | 拆出 [`7-capture-instances.md`](./7-capture-instances.md)；本文件改为「怎么实现」；流水线补外部技术/App 自拼说明 |
