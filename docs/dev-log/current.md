# 当前这一关

> **搞不清要干嘛、干到哪了 → 只看这个文件。**  
> 开新功能：填下面各节；收工：更新「停在哪」；做完：打勾后清空或归档到 [`history/archive/`](./history/archive/README.md)。

上一关已归档：[`history/archive/2026-11-sync-billing-webhook.md`](./history/archive/2026-11-sync-billing-webhook.md)（云同步收费 + 爱发电 webhook + `.com` 门牌；PR #143 / `v0.6.14`）。

---

## 快照

| 项 | 内容 |
|---|---|
| **主题** | Project 文件夹（主）+ 计划侧筛选结果导出 + 搜索词高亮 |
| **来自** | 收费关已收；搜索范式不重做；life / ledger 属生活底色，另线（更像仪表盘），不进本关 |
| **蓝图** | 类型 [`Project.ts`](../../src/core/types/Project.ts)；分层 [`1-architecture-layering.md`](./blueprint/1-architecture-layering.md) |
| **分支** | `dev` |
| **分级** | `[S3 C2 UV1]` |
| **更新** | 2026-11-05 |
| **停在哪** | 导出手测 A–E 通过；`projects` 表已建、gen 已刷、`projectSync` 已挂。下一步：手测上下传 / 双端。旁路权益延期见 PR #144 |

---

## 这一关要干嘛（一句话）

**大头做 Project 文件夹**；搜索仍是「先 tag → 再文字」+ Project 范围。计划侧筛选结果可导出（Markdown / JSON）。文字搜索时命中处自动高亮（清空则消）。

---

## 数据契约（已定）

- **实体**：`Project` 本地一等 + 云表 `projects` + SyncService（**镜像 Tag**；上云 ≠ 迁库）。  
- **字段**：见 [`Project.ts`](../../src/core/types/Project.ts) — `parentId` 嵌套；可选 `tagId`；`memberIds?` 预留口（本关不读写）；同步元数据同 Tag。  
- **归属**：`Activity.projectId` 多对一（一 activity 只进一处）；Task 不单独挂。  
- **跨堆主题靠 tag，Project 不承担多归属**（例：反思主堆在「反思」Project，打「咨询」tag；筛咨询 tag 即可带上，无需双挂）。  
- **删除（v1 策略）**：Project 树软删；Activity **先清 `projectId`（不删实体）**，再对这批跑一次智能归堆——tag 仍命中父/其它存活智能 P 则留在里面。  
- **冲突**：复用现有 LWW / 未同步本地优先；不另做 CRDT。  
- **智能（混合，非纯 tag 派生）**：  
  1. 手动进 / 出永远有效；`projectId` 是归属真相。  
  2. **仅当无 `projectId`** 时智能才写：加/改 tag 后，或一次性「收纳」。  
  3. 候选 = 其 `tagId ∈ activity.tagIds` 的 Project；**多个 → 树更深优先**；同深再按 `tagIds` 更靠前。  
  4. 已有 `projectId` → 智能不再改（删 tag 不自动踢出 / 换堆）。  
  5. **拖 P / 升层 / 拖 3in1 不重跑智能**；深度变化只影响以后新归堆。  
  6. 同一 `tagId` 全局最多绑一个 Project；不做路径 AND。  
  7. 按月 = **纯视图桶**（不建真子 P）；**仅当该 P 无子 P** 时提供开关。

### UI / 交互（已锁 · 2026-11-04）

- **列表**：P 行浅紫；chevron 开合（下=开，转右=合）+ 缩进层级；选中浅灰；右侧操作；末尾数字 = 当前筛选下可见 3in1 命中数（含子树合计）。  
- **3in1 行**：去掉最左类型 bar 与 emoji；todo / schedule 用右侧（或类型）icon 区分，**拖它们**进 P / 拖到根（或列表空隙）移出。  
- **改名**：双击 P 标题。  
- **P 层级**：**可拖 P 进/出另一 P**（改 `parentId`）；**不另做「移入」功能按钮**（找不到合适 icon / 易懵）。`FolderArrowUp` 作快捷：每次升一层直至 `null`。同层字母数字自然序。  
- **建 P**：搜索星旁 `Folder` = 根（有选中 P 时也可约定建子）；行内 `FolderArrowRight` = 在选中/该 P 下建子。  
- **本关不做**：P 内「加 todo」（写作复盘入口）→ 候补；「移入选中 P」类按钮。

### Icon（Fluent · 已确认）

| 槽 | Icon |
|---|---|
| 新建根 P | `Folder20Regular` |
| 新建子 P | `FolderArrowRight20Regular` |
| 升一层 | `FolderArrowUp20Regular` |
| 行开合 | `ChevronDown20Regular`（转 Right） |
| 收起子树 | `ArrowCollapseAll20Regular` |
| 删除 | `Delete20Regular` |
| 绑 tag | `TagSearch20Regular` |
| 清绑 | `TagReset20Regular` |
| 按月开关 | `CalendarLtr20Regular` |
| schedule 拖 | `CalendarEmpty20Regular` |
| todo 拖 | `TaskListSquareRtl20Regular` |

---

## 验收标准（草案）

### Project（本关主要工作量）

1. 数据页可增 / 删 / 改 Project；可将实体（a-t-t / a-s-t 等）放进 Project（拖 3in1）。  
2. Project 可展开 / 收起；展开再加载（懒加载）；可收起整棵子树；可拖进/出改层级；可升一层至根。  
3. Project 内 **可选按月分组（视图桶）**；无子 P 时才有；不是时间窗筛选、不建真子 P。  
4. 智能文件夹（混合）：无归属时按 tag **更深优先**收入；可一次性收纳；已归属不被智能覆盖；拖拽不重算。  
5. 按 tag 搜时：没有该 tag 的 Project 不显示；有的显示并带匹配条数；仍可展开收起。  

### 提取与导出（仅计划侧）

6. 进 Project = 只在该堆；否则全库。常用仍是 **先 tag → 再文字**（**activity title** + **task 内容**）。  
7. 范围只含 **a-t-t / a-s-t 等计划侧**；**不含 life record、不含 ledger**。  
8. 筛选结果处可导出当前命中集（非 Sync 全量备份）；模式至少：**Markdown**、**JSON**；带范围信息（Project / tag / 关键字等）。

### 搜索词高亮（数据页）

9. 搜索框有关键字时：**结果列表 title**、**已打开 tab 标题**、**详情内命中处**自动高亮（不依赖 Ctrl+H 页内搜）。  
10. **清空搜索框** → 上述高亮立刻全部消失（含早已打开的详情页）。

---

## 落点（步 0）

| 点 | 路径 |
|---|---|
| 类型 | [`Project.ts`](../../src/core/types/Project.ts) |
| 本地 | [`useProjectStore`](../../src/stores/useProjectStore.ts)；key `project`（[`STORAGE_KEYS.PROJECT`](../../src/core/constants.ts)） |
| 云表 SQL（Studio 粘贴） | [`supabase/migrations/20261103120000_projects.sql`](../../supabase/migrations/20261103120000_projects.sql)；建表后 **gen 刷新** [`Database.ts`](../../src/core/types/Database.ts)（勿手改） |
| 同步 | [`projectSync.ts`](../../src/services/sync/projectSync.ts) 已挂 sync/index；用 gen `Database.ts` 类型 |
| 归属 | 已有 `Activity.projectId` + `activities.project_id` |
| 全量备份 | `collectLocalData` / 导入含 `project.json`；与筛选结果导出勿混 |

## 分步（按顺序）

| 步 | 内容 | 产出 |
|---|---|---|
| **0** | 认路：Project、`projectId`、数据页、现有搜索；全量导出入口（勿混） | 落点清单 |
| **1** | Project 行 UI + CRUD（建根/子、双击改名、删 cascade、开合懒加载、升一层、收子树）+ 拖 3in1 进/出 | 文件夹可用 |
| **2** | 视图按月；绑/清 tag；更深优先智能 + 收纳；tag 下显隐与命中数 | 长列表可翻、归堆可用 |
| **3** | 计划侧 Project 范围提取；文字按 activity title / task 内容；**搜索词高亮**（列表/tab/详情；清空即消） | 范围提取 + 命中高亮 |
| **4** | 筛选结果导出（Markdown / JSON） | 导出可用 |
| **5** | 手测验收上表 | 关可收 |

**本关不做：** life record / ledger；时间窗筛选；重做搜索引擎 / DB 迁库；AI 接线 / 一句记扩写 / MCP；完整项目管理套件；替代现有「全量数据导出」。

**说明：** 一年量级现搜不慢；本关不改搜索范式。life / ledger 是生活底色，跟 Project 弱相关，留给仪表盘/展示线另开。

---

## 进度

- [x] **0.** 认路（契约 + 落点 + 本地 store/SQL/sync 源码；Sync 未挂、表未建）
- [x] **1.** Project 文件夹（含拖拽 Pointer；细节手测可继续）
- [x] **2.** 按月分组 + tag 显隐 / 智能归堆
- [x] **3.** Project 范围提取 + 搜索词高亮（计划侧）
- [x] **4.** 筛选结果导出（Markdown 复盘报告 / JSON / CSV；轻预览；Tauri 与 PWA 落盘分支）
- [ ] **5.** 手测收关（导出效果微调 + **Project Sync** 接线）

### 旁路（本关外已落地，勿丢）

- [x] 同步付费人工/webhook：**从试用真实终点叠期**（非再送满 14 天）；admin `extend_days` / `extend_months`；查询带回 `trial_until`；绝对 `until` 仅纠错。见 `worker/ai-gateway` README SOP；生产已部署。

---

## 候补（不进本关）

- 爱发电通知 URL 恢复后填 webhook；`/v1/redeem`
- 2026-11 年付回馈档到期：方案改回 99 + SupportDialog 文案
- 可选：`www` / `VITE_HELP_DOCS_URL`
- todo / schedule 类型筛、时间窗筛（有需要再开票）
- life record / ledger 提取与导出（生活底色；更贴近仪表盘线，另开票）
- **卡片跳转 / 显式引用**（Obsidian 式）：跨 Project 指向具体 Activity/Task；Tag 管主题，Link 管「这篇说的是哪篇」
- **筛选后分析写作面**：检索结果上的成文/归纳舞台（本关仅导出材料出门；应用内写作另开）
- **Task markdown · note 块**：正文可抽取 note（倾向 `:::note` … `:::`）；首页与数据/筛选侧均**单独成区**渲染；在 note 区修改只回写 note，不搅源正文
- **Task markdown · 多色后批高亮**：现有 `== ==` 黄为原笔；另增颜色标后画批注（与 note 区可分开做）
- **Project 内加 todo**（素材复盘书写入口）；「移入选中 P」类按钮（v1 用拖拽代替）

---

## 归档

做完后把「快照 + 验收」复制到 CHANGELOG 或 PR，或移到 `history/archive/YYYY-MM-topic.md`。
