# Ledger · 蓝图

> **ledger 开发的唯一核心参考** — 边界、语法、tag 归属、数据模型、分关路线。  
> 进度与验收见 [`current.md`](../current.md)；代码分层见 [`architecture-layering.md`](./architecture-layering.md)。

---

## 1. 目标与边界

### 做什么

Pomotention **不做**专业记账 App。目标：把日常消费等行为从 Todo title 里 **结构化抽出来**，便于查看与后续展示；**「买」** 是注意力/奖赏相关指标（写在 memo/日记自然语言里，展示层再聚合）。

典型场景：日视图编辑 todo title → 顺手记一笔 → 保存后 title 保留可读日记 + 汇总括号 → Gift 看明细。

### 不做什么

| 不做 | 说明 |
|------|------|
| 余额 / 对账 / 多账套 | 不是 beancount/Fava 替代 |
| 报表 / 税表 / 合规 | 外部工具负责 |
| v1 云同步 | v2；v1 仅 **localStorage** |
| IndexedDB | 与全实体 data 层一并迁移 |
| beancount/hledger 导出 | vision 可选远期 |

---

## 2. v1 范围与状态

| 项 | 状态 |
|----|------|
| §4 语法 + 汇总括号回写 | **已实现** |
| §3 tag 分区（方案 A） | **已实现** |
| `LedgerEntry` 类型（`categoryTagIds[]`、`sourceActivityId`） | **已实现** |
| localStorage `ledgerEntries` | **已实现** |
| Gift 只读 + **删** 条目 | **已实现** |
| **改** 条目 | 未做 |
| 最小汇总/列表展示（独立视图） | 未做 |
| Supabase 同步 | v2 |

---

## 3. Tag 与 `#`（已定稿）

同一套 TagSelector；**按光标位置**决定选中后行为：

| 位置 | 输入 `#` | 选中 tag 后 |
|------|----------|-------------|
| **记账段内**（` -/+金额` 触发符 → `￥`/`$` 结尾符，含未闭合） | 弹出选择器 | 把 `#query` **换成 `#tagName `**（**末尾带空格**）插入 title；**不**写 `activity.tagIds` |
| **结尾符之后** 或 **段外**（含 title 开头） | 弹出选择器 | 现有 Activity TagPicker：写入 `activity.tagIds`，剥掉末尾 `#` |

实现：[`getTitleTagPickerMode`](../../../src/core/ledger/parseLedgerSegments.ts) + [`DayTodo`](../../../src/components/DayPlanner/DayTodo.vue) `handleTagSelected` / `handleTagCreate`。

示例：

- `买菜 -30#gro` → 选 `grocery` → title 变 `买菜 -30#grocery`（保存后入账分类）
- `买菜 -30￥ #urg` → 选 `urgent` → activity 标签
- `开会 #urgent 买菜 -30￥` → 第一个 `#` 在段外 → activity

保存时记账段内 `#` 仍解析为 `categoryTagIds[]`（`resolveOrCreateTagByName`）。

---

## 4. 书写语法（v1 · 已实现）

### 4.1 符号

| 符号 | 含义 |
|------|------|
| ` -数字` / ` +数字` | 记账段开始（**前有空格**；金额后须接空格、`#`、`;`、`￥`、`$` 或段尾，避免 `-3度` 误触） |
| `￥` 或 `$` | **记账段结束**（表达入账意图） |
| `;` / `；` | 同段多笔分隔（可省略，见 4.3） |

**有意图才入账**：无结尾 `￥`/`$` → **不解析**（全文当普通 title）。

**解析时机**：**退出 title 编辑**（blur / Enter）时扫描；输入 `￥`/`$` 当下不单独入账。

### 4.2 单笔

```
[+-]金额 [memo] [#分类]…
```

- 默认支出；leading `+` 为收入
- 金额：正数，最多两位小数

### 4.3 多笔

- 显式：` -30买菜; -15地铁#grocery￥`
- 隐式：` -30买菜 -15地铁#grocery￥`（段内再次出现 ` [+-]金额` 自动分段）

### 4.4 示例

| 保存前（编辑框） | 保存后 title |
|------------------|--------------|
| `买菜 -30 西瓜 -25#grocery 喝的￥` | `买菜 西瓜 喝的（-55）` |
| `奖金 +5000; 午饭 -30￥` | `奖金 午饭（-30 +5000）` |
| ` -10 早餐￥` | `早餐（-10）` |
| `开会 -30买菜`（无结尾符） | **不入账**，原文保留 |
| `今天 -3度出门`（无结尾符） | **不入账**（`3` 后非合法定界） |

### 4.5 保存后 title 结构

```
[日记正文][汇总括号]
```

- **日记正文**：记账段前的 prefix + 各笔 memo + 段后 tail（剥掉 grammar）
- **汇总括号**：整数、**仅非零项**，如 `（-55）`、`（+5000）`、`（-30 +5000）`
- 再编辑前 [`stripLedgerSummarySuffix`](../../../src/core/ledger/parseLedgerSegments.ts) 剥掉文中任意位置的旧括号（含旧版 `（账：…）`）
- `strip` 用 `trimEnd()`，**不** `trim()` 开头，以免吃掉触发所需的前导空格

### 4.6 「买」

写在 memo/日记里（如 `买菜`），不作独立解析触发词；后续展示层筛选。

---

## 5. 数据模型

### 5.1 `LedgerEntry`

| 字段 | 含义 |
|------|------|
| `id` | 本地自增 |
| `amount` / `direction` / `currency` | 金额与方向 |
| `memo` | 备注 |
| `categoryTagIds` | 分类 tag id 数组 |
| `rawSegment` | 解析时该笔原文（删条时尝试从 title 反查） |
| `segmentIndex` | 同 `sourceActivityId` 下序号 |
| `sourceActivityId` | 溯源 activity（**无** `sourceTodoId`） |
| `deleted` / `synced` / `lastModified` / `cloudModified` | 软删；v2 同步预留 |

UI 按 **`todo.activityId`** 取 [`getActiveLedgerEntriesForActivity`](../../../src/services/ledger/ledgerService.ts)。

### 5.2 `ParsedLedgerSegment`

解析中间态；`categoryTagNames[]` → service 层 resolve 为 `categoryTagIds`。

---

## 6. 写入、追加、删除

### 6.1 保存 title

```
退出编辑 → strip 旧括号 → parseLedgerFromTitle
  → 有完整记账段则 append 新行
  → diaryBase + formatLedgerSummaryBracket(该 activity 全部未删行)
  → normalizedTitle 写回 activity/todo title
  → ledgerList → localStorage
```

- **Append-only**：再次保存无新记账段 → **不删**已有行，仍 **重写**汇总括号
- 无新段时 `diaryBase` = 用户当前 title（已剥括号）

### 6.2 删条目（Gift 弹窗）

[`softDeleteLedgerEntryWithTitle`](../../../src/services/ledger/ledgerService.ts)：

1. 软删 ledger 行
2. 剥汇总括号后：若 title 仍含 `rawSegment` → 删掉；**否则**按 `entry.memo` 从日记正文去掉该词
3. 重写汇总括号
4. 对不上（用户改过 title、memo 也找不到）→ **静默**，只更新括号

**改** 条目：v1 未实现。

### 6.3 Activity 级联

删除/恢复 Activity 树 → `cascadeLedgerForActivityTree`（按 `sourceActivityId`）。

---

## 7. 分层与文件

| 层 | 路径 |
|----|------|
| 类型 | [`src/core/types/LedgerEntry.ts`](../../../src/core/types/LedgerEntry.ts) |
| 解析 | [`src/core/ledger/parseLedgerSegments.ts`](../../../src/core/ledger/parseLedgerSegments.ts) |
| 业务 | [`src/services/ledger/ledgerService.ts`](../../../src/services/ledger/ledgerService.ts) |
| 持久化 | [`localStorageService.ts`](../../../src/services/data/localStorageService.ts) · `ledgerEntries` |
| Store | [`useDataStore.ts`](../../../src/stores/useDataStore.ts) |
| 接入 | [`HomeView.vue`](../../../src/views/HomeView.vue) · `onTodoTitleSaved` |
| Tag 互斥 | [`DayTodo.vue`](../../../src/components/DayPlanner/DayTodo.vue) + [`useActivityTagEditor`](../../../src/composables/activity/useActivityTagEditor.ts) |
| UI | [`LedgerEntryPopover.vue`](../../../src/components/Ledger/LedgerEntryPopover.vue) |
| 测试 | [`parseLedgerSegments.test.ts`](../../../src/__tests__/parseLedgerSegments.test.ts)、[`ledgerService.test.ts`](../../../src/__tests__/ledgerService.test.ts) |

---

## 8. 路线图

| 关 | 内容 |
|----|------|
| **v1** | 语法/回写/tag/删条 · localStorage — **进行中**（缺：改条、最小展示） |
| **v2** | Supabase `ledger_entries` + LedgerSyncService |
| **data** | IndexedDB 大迁移 |
| **可选** | beancount/hledger 导出 |

---

## 9. 历史

- **PR #119**：`￥…￥` 成对块语法 — **已由 §4 替代**
- 曾尝试宽触发、`TAG_ID_LEDGER` 双写、Planner 筛选 toggle — 已删
- `TAG_ID_LEDGER`（127）常量仍留，未使用

---

## 修订

| 日期 | 备注 |
|------|------|
| 2026-06-25 | 初稿 |
| 2026-06-25 | 对齐实现：` -/+` 语法、汇总括号、`categoryTagIds[]`、`sourceActivityId`、方案 A |
