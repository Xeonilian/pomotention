# 当前这一关

> **搞不清要干嘛、干到哪了 → 只看这个文件。**  
> 开新功能：填下面各节；收工：更新「停在哪」；做完：打勾后清空或归档到 [`history/archive/`](./history/archive/README.md)。

上一关已归档：[`history/archive/2026-11-project-folder.md`](./history/archive/2026-11-project-folder.md)（Project 文件夹 + 导出 + 搜索词高亮；PR #145 / `v0.7.0`）。

---

## 快照

| 项         | 内容                                                                 |
| ---------- | -------------------------------------------------------------------- |
| **主题**   | 批注（note · 后批高亮）                                              |
| **来自**   | Project 关已收；材料上的批注能力，不做引用/双向链接                  |
| **蓝图**   | 分层 [`1-architecture-layering.md`](./blueprint/1-architecture-layering.md) |
| **分支**   | `dev`                                                                |
| **分级**   | `[S2 C2 UV1]`                                                        |
| **更新**   | 2026-11-18                                                           |
| **停在哪** | 步 1–3 已落地；待手测：首页 note、数据页两按钮、`==r:…==` 后批色。   |

---

## 这一关要干嘛（一句话）

**Task 正文上的批注**：`:::note` 单独成区可编；原笔黄 `== ==` + 后批三色；数据页主操作，首页可见且可改 note。

---

## 数据契约（已定）

- **存储**：全部落在现有 `Task.description`（无新表、无新 sync 实体）。
- **原笔黄**：`==text==` → `.highlight-text`（已有语义保留）。
- **后批三色**：`==r:text==` / `==g:text==` / `==b:text==` → `.highlight-post.highlight-r|g|b`；v1 不开放任意色。
- **Note**：容器 `:::note` … `:::`（可多块）；切出后在**独立 note 区**渲染；改 note **只回写该 fence 内文**，不搅正文。
- **解析**：首页与数据页共用一套 marked 扩展（含 TOC 路径）。

### UI / 交互（已锁 · 2026-11-18）

- **效果**：首页 + 数据页都渲染 note 与高亮（含后批色）。
- **Note 编辑**：两边可改。数据页可用模式按钮一次开多区编辑；首页点 note 区即改。
- **后批划选**：v1 **主入口在数据页**（激活 → 划选上色 → 再按退出）；首页只渲染，不做划选模式。
- **源正文**：仍只在首页点预览进 textarea；数据页不开放全文编辑。
- **本关不做**：卡片跳转 / 显式引用 / 双向链接；筛选后分析写作面；首页后批划选；颜色选择器。

---

## 验收标准（草案）

1. 正文含 `:::note` 时，首页与数据页均在独立 note 区展示；无 note 则不成区硬占位。
2. 在 note 区修改只改变对应 fence 内文；正文其余 markdown 不变。
3. `==text==` 两边同效为原笔黄；`==r|g|b:…==` 渲染为后批色。
4. 数据页可进入后批模式：划选成功则写入对应色标；失败不腐坏源文；退出模式后恢复普通阅读。
5. 数据页不出现全文 textarea；首页全文编辑路径仍可用。
6. 筛选导出仍带出完整 `description` 源码（含 note / 色标）。

---

## 落点（步 0）

| 点           | 路径 |
| ------------ | ---- |
| 共享 marked  | [`taskMarkdown.ts`](../../src/core/utils/taskMarkdown.ts)（新建）；[`markdownToc.ts`](../../src/core/utils/markdownToc.ts) / [`TaskRecord.vue`](../../src/components/TaskTracker/TaskRecord.vue) 改走它 |
| note 切分回写 | [`taskNoteBlocks.ts`](../../src/services/task/taskNoteBlocks.ts)（新建） |
| 划选锚定     | [`taskRecordService.ts`](../../src/services/task/taskRecordService.ts) + 数据页 composable |
| 首页 UI      | [`TaskRecord.vue`](../../src/components/TaskTracker/TaskRecord.vue)（可抽 composable 瘦身） |
| 数据页 UI    | [`TabPaneContent.vue`](../../src/components/search/TabPaneContent.vue) |

## 分步（按顺序）

| 步    | 内容 | 产出 |
| ----- | ---- | ---- |
| **0** | 票面 + 认路（现有 `==`、首页编辑、数据只读） | 本文件 |
| **1** | 共享 `taskMarkdown`（原笔 + 后批三色）；TOC/首页共用；适当抽离 TaskRecord | 两边高亮一致 |
| **2** | note 切分/回写；首页与数据页成区；数据 note 模式 / 首页点区编 | note 可用 |
| **3** | 数据页后批划选模式（r/g/b） | 后批可画 |
| **4** | 手测验收上表 | 关可收 |

**本关不做：** 引用/双向链接；写作面；life/ledger；Project 内加 todo；新 DB/旁路 annotation 表。

---

## 进度

- [x] **0.** 票面（归档 Project；契约 + 落点）
- [x] **1.** 共享解析 + 后批色 token + TaskRecord 抽提（`taskMarkdown` / `useTaskRecordMarkdown`）
- [x] **2.** note 成区可编（首页 + 数据；`TaskNoteRegion` + `taskNoteBlocks`）
- [x] **3.** 数据页后批划选（meta 旁 Note / Highlight + r/g/b）
- [ ] **4.** 手测收关

---

## 插叙 · 云同步外键卡死（老用户上传整批失败，2026-11-19 修）

**现象**：老用户上传报 schedules / tasks 外键违规；一条脏子行毒死整表 upsert，同步永远失败。

**三段历史（谁挖的洞）**

1. **#129（正修）**：`isUploadable` 跳过「父 activity 本机缺失」的孤儿子行，避免 FK。
2. **#143（好心挖洞）**：为让级联删除的墓碑能同步，加 `if (item.deleted) return true`，删除态一律放行。隐含假设：软删模型下父行至少在一边还在。
3. **#146（点燃引信）**：下载后自动清理孤儿 → 把本会被 #129 跳过的活孤儿软删（`synced=false`）→ 正好变成 #143 放行的删除态 → 每轮上传都推 → 云端父行不存在，FK 拒整批 → 死循环。

**机制一句话**：`synced=false` 只表达「待上传」，不知道「永远传不上去」；而批次是整表 upsert，一条 FK 拒全批挂。用户点「清理数据」只会把更多无害行推进这个循环，**更卡**。

**修复（不补假父、不维护清单、不丢删除）**：todo / schedule / task / ledger 四个 `isUploadable`，把「删除态放行」挪到「父存在」检查之后：

- 父行本机不在 → 删不删都**不进批次**（过滤每轮现场算，零持久状态，行保持 `synced=false` 不撒谎）
- 父行在（含软删墓碑）→ 删除态**照传**，先传父再传子，FK 安全

**修后行为**

- 父其实在云端、只是本机丢了（如下载截断）：下次下载父回来后自动恢复上传，**自愈**。
- 父两边都没了：云端本来就没这条（FK 拦过），本机留着无害死数据（UI 不显示、上传被过滤）。
- 「全清 + 重下」可物理清残渣，但**必须等上传打通、云端含全部数据之后**才安全，否则丢未上云改动。
- 测试：`ledgerSync.test.ts` 旧用例「删除态 activity 不存在也上传」已翻转为新契约。

---

## 候补（不进本关）

- 爱发电通知 URL 恢复后填 webhook；`/v1/redeem`
- 2026-11 年付回馈档到期：方案改回 99 + SupportDialog 文案
- 可选：`www` / `VITE_HELP_DOCS_URL`
- todo / schedule 类型筛、时间窗筛（有需要再开票）
- life record / ledger 提取与导出（生活底色；更贴近仪表盘线，另开票）
- **卡片跳转 / 显式引用**（Obsidian 式）：跨 Project 指向具体 Activity/Task；Tag 管主题，Link 管「这篇说的是哪篇」
- **筛选后分析写作面**：检索结果上的成文/归纳舞台
- **Project 内加 todo**（素材复盘书写入口）；「移入选中 P」类按钮（v1 用拖拽代替）
- 首页后批划选模式；后批任意色 / 颜色选择器
- Task markdown · note / 后批的帮助文档补全

---

## 归档

做完后把「快照 + 验收」复制到 CHANGELOG 或 PR，或移到 `history/archive/YYYY-MM-topic.md`。
