# 当前这一关

> **搞不清要干嘛、干到哪了 → 只看这个文件。**  
> 开新功能：填下面各节；收工：更新「停在哪」；做完：打勾到第 6 步后清空或归档。

---

## 快照

| 项         | 内容                                                                 |
| ---------- | -------------------------------------------------------------------- |
| **主题**   | ledger v1 · 本地结构化收支（语法 + tag + 回写 + CRUD）               |
| **来自**   | [roadmap · 执行顺序 #1](../../guide/intro/roadmap.md)                |
| **蓝图**   | [`blueprint/ledger.md`](./blueprint/ledger.md)（§4～§6 已定稿）      |
| **存储**   | v1 **localStorage**；Supabase 属 v2                                  |
| **分支**   | _步 1 开 `feat ledger-v1`_                                           |
| **更新**   | 2026-06-25                                                           |
| **停在哪** | parser/service/Gift删条/TagPicker分区已实现；18 测试绿；待手动验收；最小展示未做 |

---

## 这一关要干嘛（一句话）

按 [`blueprint/ledger.md`](./blueprint/ledger.md) 实现 ` -/+` 触发 + 结尾符入账、title 回写（日记 + `（-55 +1000）`）、tag 分区、本地 CRUD 与最小展示。

---

## 已定稿要点（详见 blueprint）

- 触发：` -3` / ` +3` 或行首 `-3` / `+3`；结束：`￥` 或 `$`（**无结尾符 = 不入账**）
- 解析：**退出 title 编辑**时扫描整段
- `#`：记账段内 → ledger 多分类；段外 → activity
- 保存后：剥 grammar，保留日记字 + **重写**汇总括号（仅非零整数项）
- 删条目：尽量删 `rawSegment` 对应文字并重写括号；对不上则静默

---

## 验收标准（3 条）

1. ≥3 组样例（含 `买菜 …￥`、多笔、`#` 分类）保存后 title、ledger 行、activity tag **符合 blueprint §4～§5**
2. Gift（或面板）可 **改/删** 条目；删后 title 与括号正确；有 **最小展示**
3. `pnpm build:fast`；`parseLedgerSegments` / `ledgerService` 测试覆盖主路径

---

## 风险评估

- **[S2 C1 UV1]**
- **最小证据**：
  - [ ] 测试：parser + service + CRUD
  - [ ] `contracts.md`：title 保存 / 汇总括号 / tag 分区
  - [ ] `ui-checks.md`：Gift / 展示若有 UI 变更

---

## 进度

- [x] **0.** 文档关：blueprint + current
- [x] **0b.** 语法 review + `LedgerEntry` 类型修订（`categoryTagIds[]` 等）
- [ ] **1.** `pnpm new:branch feat ledger-v1`
- [x] **2.** 重写 parser + title 回写 + TagPicker 分区 + Gift 删条
- [ ] **3.** service 追加/汇总括号/删条反写
- [ ] **4.** CRUD UI + 最小展示
- [ ] **5.** 证据
- [ ] **6.** PR 合并 → roadmap / CHANGELOG

---

## 备注

- 实现以 **blueprint §4～§6** 为准；PR #119 的 `￥…￥` 代码待替换。
- 与 AI 开聊：「先读 `current.md` + `blueprint/ledger.md`。」

---

## 归档

做完后归档快照与验收，再重置本模板或移入 `current-archive/`。
