# 当前这一关

> **搞不清要干嘛、干到哪了 → 只看这个文件。**  
> 开新功能：填下面各节；收工：更新「停在哪」；做完：打勾到第 6 步后清空或归档。

---

## 快照

| 项         | 内容                                                                 |
| ---------- | -------------------------------------------------------------------- |
| **主题**   | ledger v1 · 本地结构化收支（语法 + tag + 回写 + 聚合展示）           |
| **来自**   | [roadmap · 执行顺序 #1](../../guide/intro/roadmap.md)                |
| **蓝图**   | [`blueprint/ledger.md`](./blueprint/ledger.md)（§4～§6 已定稿）      |
| **存储**   | v1 **localStorage**；Supabase 属 v2                                  |
| **分支**   | `feat ledger-v1` / `dev`                                             |
| **更新**   | 2026-06-25                                                           |
| **停在哪** | 聚合面板已实现（Gift 入口 + 随日/周/月/年视图 + tag 筛选）；待手动验收；改条未做 |

---

## 这一关要干嘛（一句话）

按 [`blueprint/ledger.md`](./blueprint/ledger.md) 实现记账语法、title 回写、tag 分区、删条，以及 **随 Planner 视图尺度的收支聚合展示**（统计 / 饼图 / 趋势 / 明细表）。

---

## 已定稿要点（详见 blueprint）

- 触发：` -3` / ` +3` 或行首 `-3` / `+3`；结束：`￥` 或 `$`（**无结尾符 = 不入账**）
- 解析：**退出 title 编辑**时扫描整段
- `#`：记账段内 → ledger 多分类；段外 → activity
- 保存后：剥 grammar，保留日记字 + **重写**汇总括号（仅非零整数项）
- 删条目：尽量删 `rawSegment` 对应文字并重写括号；对不上则静默
- **聚合**：`sourceTodoId` → `todo.id` 筛 `visibleRange` 与分桶；`id` 仅行标识

---

## 验收标准（3 条）

1. ≥3 组样例保存后 title、ledger 行、activity tag **符合 blueprint §4～§5**
2. Gift（todo 行）可删条；**头部 Gift** 打开聚合：笔数/收支/饼图/趋势/表；tag 筛选后统计范围同步
3. `pnpm build:fast`；`parseLedgerSegments` / `ledgerService` / `ledgerQueryService` 测试绿

---

## 风险评估

- **[S2 C1 UV1]**
- **最小证据**：
  - [x] 测试：parser + service + query
  - [ ] `contracts.md`：title 保存 / 汇总括号 / tag 分区 / 聚合范围
  - [ ] `ui-checks.md`：聚合面板截图

---

## 进度

- [x] **0.** 文档关：blueprint + current
- [x] **0b.** 语法 review + `LedgerEntry` 类型（`id` 时间戳、`categoryTagIds[]`）
- [x] **2.** parser + title 回写 + TagPicker 分区 + Gift 删条
- [x] **3.** service 追加/汇总括号/删条反写
- [x] **4.** 聚合 query + 头部 Gift 面板（统计/饼/趋势/表）
- [ ] **5.** 证据（contract + ui-check + 手动验收）
- [ ] **6.** PR 合并 → roadmap / CHANGELOG

---

## 备注

- 实现以 **blueprint §4～§6** 为准。
- v1 **未做**：改条、Supabase、IndexedDB。
- 与 AI 开聊：「先读 `current.md` + `blueprint/ledger.md`。」

---

## 归档

做完后归档快照与验收，再重置本模板或移入 `current-archive/`。
