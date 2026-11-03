# 当前这一关

> **搞不清要干嘛、干到哪了 → 只看这个文件。**  
> 开新功能：填下面各节；收工：更新「停在哪」；做完：打勾后清空或归档到 [`history/archive/`](./history/archive/README.md)。

上一关已归档：[`history/archive/2026-11-sync-billing-webhook.md`](./history/archive/2026-11-sync-billing-webhook.md)（云同步收费 + 爱发电 webhook + `.com` 门牌；PR #143 / `v0.6.14`）。

---

## 快照

| 项 | 内容 |
|---|---|
| **主题** | Project 文件夹（主）+ 计划侧筛选结果导出 |
| **来自** | 收费关已收；搜索范式不重做；life / ledger 属生活底色，另线（更像仪表盘），不进本关 |
| **蓝图** | 类型 [`Project.ts`](../../src/core/types/Project.ts)；分层 [`1-architecture-layering.md`](./blueprint/1-architecture-layering.md) |
| **分支** | `dev` |
| **分级** | `[S3 C2 UV1]` |
| **更新** | 2026-11-03 |
| **停在哪** | 本地层已落地；**Sync 暂未挂**（先单机 UI/CRUD）；Studio 建表 + 接线放单机测过后 |

---

## 这一关要干嘛（一句话）

**大头做 Project 文件夹**；搜索仍是「先 tag → 再文字」+ Project 范围。计划侧筛选结果可导出（Markdown / JSON）。

---

## 数据契约（已定）

- **实体**：`Project` 本地一等 + 云表 `projects` + SyncService（**镜像 Tag**；上云 ≠ 迁库）。  
- **字段**：见 [`Project.ts`](../../src/core/types/Project.ts) — `parentId` 嵌套；可选 `tagId`；`memberIds?` 预留口（本关不读写）；同步元数据同 Tag。  
- **归属**：`Activity.projectId` 多对一（一 activity 只进一处）；Task 不单独挂。  
- **跨堆主题靠 tag，Project 不承担多归属**（例：反思主堆在「反思」Project，打「咨询」tag；筛咨询 tag 即可带上，无需双挂）。  
- **删除（v1 策略）**：Project 树软删；Activity **只清 `projectId`**，不删 Activity。  
- **冲突**：复用现有 LWW / 未同步本地优先；不另做 CRDT。  
- **智能（混合，非纯 tag 派生）**：  
  1. 手动进 / 出永远有效；`projectId` 是归属真相。  
  2. 无 `projectId` 时加 tag：按 `tagIds` 顺序，第一个命中某 Project.`tagId` → 写入。  
  3. 已有 `projectId` → 智能不再改（删 tag 不自动踢出 / 换堆）。  
  4. 另提供一次性「收纳」；建议同一 `tagId` 全局最多绑一个智能 Project。

---

## 验收标准（草案）

### Project（本关主要工作量）

1. 数据页可增 / 删 / 改 Project；可将实体（a-t-t / a-s-t 等）放进 Project。  
2. Project 可展开 / 收起；展开再加载（懒加载）。  
3. Project 内 **可选按月分组**（长项目好翻）；不是时间窗筛选。  
4. 智能文件夹（混合）：未归类时可按 `tagId` 自动收入；可一次性收纳；已归属不被智能覆盖。  
5. 按 tag 搜时：没有该 tag 的 Project 不显示；有的显示并带匹配条数；仍可展开收起。  

### 提取与导出（仅计划侧）

6. 进 Project = 只在该堆；否则全库。常用仍是 **先 tag → 再文字**（**activity title** + **task 内容**）。  
7. 范围只含 **a-t-t / a-s-t 等计划侧**；**不含 life record、不含 ledger**。  
8. 筛选结果处可导出当前命中集（非 Sync 全量备份）；模式至少：**Markdown**、**JSON**；带范围信息（Project / tag / 关键字等）。

---

## 落点（步 0）

| 点 | 路径 |
|---|---|
| 类型 | [`Project.ts`](../../src/core/types/Project.ts) |
| 本地 | [`useProjectStore`](../../src/stores/useProjectStore.ts)；key `project`（[`STORAGE_KEYS.PROJECT`](../../src/core/constants.ts)） |
| 云表 SQL（Studio 粘贴） | [`supabase/migrations/20261103120000_projects.sql`](../../supabase/migrations/20261103120000_projects.sql)；建表后 **gen 刷新** [`Database.ts`](../../src/core/types/Database.ts)（勿手改） |
| 同步 | [`projectSync.ts`](../../src/services/sync/projectSync.ts) 已写好（云类型暂手写）；**尚未挂** sync/index（单机测过 → Studio SQL → gen → 接线） |
| 归属 | 已有 `Activity.projectId` + `activities.project_id` |
| 全量备份 | `collectLocalData` / 导入含 `project.json`；与筛选结果导出勿混 |

## 分步（按顺序）

| 步 | 内容 | 产出 |
|---|---|---|
| **0** | 认路：Project、`projectId`、数据页、现有搜索；全量导出入口（勿混） | 落点清单 |
| **1** | Project CRUD + 归入 + 展开收起 + 懒加载 | 文件夹可用 |
| **2** | 可选按月分组；tag 下 Project 显隐与数量；智能归 tag | 长列表可翻、归堆可用 |
| **3** | 计划侧 Project 范围提取；文字按 activity title / task 内容 | 范围提取可用 |
| **4** | 筛选结果导出（Markdown / JSON） | 导出可用 |
| **5** | 手测验收上表 | 关可收 |

**本关不做：** life record / ledger；时间窗筛选；重做搜索引擎 / DB 迁库；AI 接线 / 一句记扩写 / MCP；完整项目管理套件；替代现有「全量数据导出」。

**说明：** 一年量级现搜不慢；本关不改搜索范式。life / ledger 是生活底色，跟 Project 弱相关，留给仪表盘/展示线另开。

---

## 进度

- [x] **0.** 认路（契约 + 落点 + 本地 store/SQL/sync 源码；Sync 未挂、表未建）
- [ ] **1.** Project 文件夹
- [ ] **2.** 按月分组 + tag 显隐 / 智能归堆
- [ ] **3.** Project 范围提取（计划侧）
- [ ] **4.** 筛选结果导出（Markdown / JSON）
- [ ] **5.** 手测收关

---

## 候补（不进本关）

- 爱发电通知 URL 恢复后填 webhook；`/v1/redeem`
- 2026-11 年付回馈档到期：方案改回 99 + SupportDialog 文案
- 可选：`www` / `VITE_HELP_DOCS_URL`
- todo / schedule 类型筛、时间窗筛（有需要再开票）
- life record / ledger 提取与导出（生活底色；更贴近仪表盘线，另开票）

---

## 归档

做完后把「快照 + 验收」复制到 CHANGELOG 或 PR，或移到 `history/archive/YYYY-MM-topic.md`。
