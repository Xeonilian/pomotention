# 当前这一关

> **搞不清要干嘛、干到哪了 → 只看这个文件。**  
> 开新功能：填下面各节；收工：更新「停在哪」；做完：打勾到第 6 步后清空或归档。

---

## 快照

| 项 | 内容 |
|---|---|
| **主题** | ledger v2 · Supabase `ledger_entries` + LedgerSyncService |
| **来自** | [blueprint/ledger.md §10](./blueprint/ledger.md) · [roadmap #1](../../guide/intro/roadmap.md) |
| **蓝图** | [`blueprint/ledger.md`](./blueprint/ledger.md) |
| **规模** | migration + 前端同步接入 |
| **存储** | **仍 localStorage 主存**；云为增量备份 / 多端 |
| **分支** | `dev`（feat ledger-v2-supabase） |
| **更新** | 2026-07-03 |
| **停在哪** | 步 1：Supabase 跑 migration → regen `Database.ts` → 冒烟同步 |

---

## 这一关要干嘛（一句话）

把已有 **本地 `LedgerEntry`** 接到 Supabase（表 + LedgerSyncService），**云表不存 JOIN 冗余**；下载直查表（同 tags）。

---

## 分步（按顺序）

| 步 | 内容 | 产出 |
|---|---|---|
| **0** | blueprint §10 + 本文件 | 已对齐 |
| **1** | Supabase 跑 migration | `ledger_entries` 表（无 RPC） |
| **2** | regen 类型 | `Database.ts` |
| **3** | 同步服务 | `ledgerSync.ts` + `initSyncServices` + `_ledgerById` |
| **4** | 冒烟 | 登录 → 入账 → 同步 → 另一端可见；软删增量 |
| **5** | 测试 + 文档 | `ledgerSync.test.ts`；`sync-mechanism.md` |
| **6** | PR 合并 | — |
| **7** | 收关 | roadmap/blueprint 状态；归档本文件 |

---

## 验收标准（3 条）

1. migration 远程可应用；RLS 仅本人可读写 `ledger_entries`
2. 登录后：本地新建/软删 ledger 行能 upsert；直查表增量下载含 `deleted=true`；行为与 tags 一致
3. `pnpm build:fast` 通过；`ledgerSync` 单测覆盖 map 往返

---

## 风险评估

- **[S1]** — 仅数据层 + 同步；UI 不变
- **FK：** ledger 依赖 activity 已上传（Activities 先上传，与 tasks 同）
- **最小证据：**
  - [ ] 测试：`ledgerSync.test.ts`
  - [ ] `sync-mechanism.md` 补 ledger 一行
  - [ ] contract / ui-checks：**本关不需要**

---

## 不做

- 改 title 解析规则（§4）、TagPicker、Gift / Aggregate UI
- IndexedDB 迁移
- 入账行 **改**（产品设计：删 + 重录）

---

## 进度

- [x] **0.** blueprint §10 + current 对齐
- [x] **1.** migration SQL 入仓
- [ ] **2.** Supabase 跑 SQL + regen `Database.ts`
- [x] **3.** LedgerSyncService 接入
- [x] **5.** ledgerSync 单测 + sync-mechanism（冒烟待步 4）
- [ ] **6.** PR 合并
- [ ] **7.** 收关归档

---

## 备注

- v1 归档：[`current-archive/2026-06-ledger-v1.md`](./current-archive/2026-06-ledger-v1.md)
- SQL 文件：[`supabase/migrations/20250703120000_ledger_entries.sql`](../../supabase/migrations/20250703120000_ledger_entries.sql)
- 与 AI 开聊：「先读 `current.md` 和 `blueprint/ledger.md` §10，告诉我下一步。」

---

## 归档

做完后把「快照 + 验收 + 结果」复制到 CHANGELOG 或 PR，然后 **删掉上方填写的快照内容**，只保留本模板说明；或整段移到 `current-archive/YYYY-MM-topic.md`（可选，不强制）。
