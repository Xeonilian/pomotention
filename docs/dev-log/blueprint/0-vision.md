# 产品构想笔记

> 个人想法池；会改、会砍、会和 current 队列不一致。**做到哪了以 [`current.md`](../current.md) 与 [`CHANGELOG`](../history/CHANGELOG.md) 为准。**

---

## AI：P context → User Agent App → P info

Pomotention 不做聊天主场，而是给用户的 **主力 AI**（Kimi / Claude / Cursor 等）喂上下文、提供工具、在 App 内展示写回结果。

| 链路                  | 含义                                         |  MCP  |
| --------------------- | -------------------------------------------- | :---: |
| **A: P context**      | 上下文出口：结构化摘要导出给外部 AI          |  否   |
| **C: User Agent App** | 工具层：AI 读写 Pomotention（MCP Server 等） |  是   |
| **B: P info**         | 觉察卡片：App 内展示 AI 写回（非聊天框）     | 依赖C |

**A · 上下文出口（草案）**

- 周复盘上下文包（估时偏差、番茄节律、打断、精力/奖赏…）
- Activity 级上下文包
- 与 chart 改版共用 **结构化指标 schema**

**C · MCP（草案）**

- 读：`get_week_summary`、`export_activity_context` 等
- 写：`save_insight_card`、`create_planner_item` 等；规则可控

**B · 觉察卡片（草案）**

- Insight 卡片 UI；非实时 IM
- 可选触发节奏（每日一条、N 个番茄后一条）

侧边栏 AI 对话（v0.4.2）已实现但 **默认关闭**，不在主方向。

---

## 数据层数据库迁移

localStorage 已偏紧；chart 与 AI A 出口依赖 **稳定可聚合** 的本地读模型。

- **IndexedDB 迁移** — 大改造；与 Supabase 同步衔接单独设计
- **结构化指标 schema** — chart 与 A 共用，避免各算各的
- **chart / 数据趋势页** — 展示仍不满意，等 schema 后再改一版

---

## 记账 / ledger

Pomotention 提取title内容形成单独记账系统，实现消费收入追溯。

**边界：** 不做余额、报表、多账套。

**可能步骤（顺序未钉死）：**

- 文本 → ledger 行识别— **current 队列 #1**
- Todo 内 code block / 专用模板（可第二版）
- 解析结果或导出历史随 IndexedDB 一并考虑

书写基础已有：`useTaskRecordShortcuts`、`StateLogModal`、`recordedAt` 等（见 CHANGELOG 0.6.x）。

---

## 商业化

- 云账号与同步（0.5.x 已有一部分）
- 支付 / 会员 / 定价页 / 老用户通知 — 队列 #2

---

## 体验与效率（零散想法）

- 自定义白噪音、右键菜单、多任务并行视图
- 配色主题、每日一图、番茄动效、任务提示音
- i18n、无障碍纯键盘、CSV 导出、系统日历集成
- 应用内帮助站与文档打包对齐（`docs-app`）

全局快捷键等已落地项 **以 CHANGELOG 为准**，不在此维护状态。

---

## 一起做感（无实时沟通）

不做聊天、语音房、实时 IM。

- 匿名「同在做」聚合提示（可关）
- 可选状态文案（延伸 Timer `pomodoroStateMessage` 思路）

---

## 修订

| 日期    | 备注                                   |
| ------- | -------------------------------------- |
| 2026-06 | 自旧 roadmap 2.0 迁入；去掉 ✅/🚧 细表 |
