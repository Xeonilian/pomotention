# 当前这一关

> **搞不清要干嘛、干到哪了 → 只看这个文件。**  
> 开新功能：填下面各节；收工：更新「停在哪」；做完：打勾后清空或归档到 [`history/archive/`](./history/archive/README.md)。

---

## 快照

| 项 | 内容 |
|---|---|
| **主题** | timetable 点击选中 task/行 + tag filter 下只渲染筛选后的块 |
| **来自** | `feat` 从 `main` 挑了两颗无关收费的提交；本关做 timetable 与 task / tag filter 的互动 |
| **蓝图** | [`1-architecture-layering.md`](./blueprint/1-architecture-layering.md) |
| **分支** | `feat` |
| **更新** | 2026-08-21 |
| **停在哪** | 关已收并提交 `feat`：筛选 + 点选。下一关拟做 timetable 上打扰线 + 能量/奖励 emoji，先对齐再写。收费仍在 `dev`。 |

---

## 本分支已带（cherry-pick，本关不重做）

1. **planner：** title 选 tag 后 Enter 不再要两下才退出；`pe` 无动作时 Enter 不退出，仅 Esc 退 pe。
2. **sync：** 设置里「同步数据库」——先上传，再比对未删除条数，云端更多则全量下载，补上增量 `lastSync` 漏掉的记录。

收费 / 网关仍在 `dev`，本文件不写。

---

## 这一关要干嘛（一句话）

在 **现有选中与筛选** 上，让 timetable 能点选对应 task（日/周/月视图里可见的 todo / schedule / activity 一并选中），并在 tag filter 开启时 **只渲染筛选后的数据**。最小 diff。

---

## 今日已对齐（备忘，明天勿重新绕）

### 点选

- 各列 hover 已有提示（title / popover）。本关加：**点击任一列 badge** → 选中对应 **task**（走现有 `selectedTaskId`，Tracker 会跟着 `pushTaskId`）。
- 若当前是 **day / week / month** 视图：同一套现有选中（`selectedRowId` / `selectedActivityId`，与 DayTodo / DaySchedule / `onItemChange` 同口径）。
- **仅当** 该 todo / schedule / activity **真的在当前可视范围**（当前视图日期窗 + 当前筛选列表里看得到）才选中行；看不见就只选 task、不硬选行。
- 不新开选中通道、不改键盘命令。

### tag filter

- Planner 已用 `filterTagIds` + `matchesPlannerFilter`（加星筛同一套）。
- Timetable 今日数据走 `todosForAppDate` / `schedulesForAppDate`，**尚未**过这套筛。
- 本关：筛选开启时 timetable **只渲染筛后数据**；建议同一函数喂进去，沿用现有 `recalculateTodoAllocations`（格子会按筛后集合重排，不是原地藏块）。
- 加星筛是否一并跟：与 planner 同一套（默认是）。

### 不做

- 收费、网关、改分配算法、新 store、year 视图点选行。

---

## 分步（按顺序）

| 步 | 内容 | 产出 |
|---|---|---|
| **0** | 写进本文件（本步） | 范围钉死 |
| **1** | tag filter：当日 timetable 数据与 planner 同一套筛 | 筛了就只见筛后块 |
| **2** | 点击任一列 badge → `selectedTaskId`；日/周/月且可见则选中 todo/schedule/activity | 与列表点行观感一致 |
| **3** | 手测：无筛/有筛、日周月、只有 task 面板、看不见的行 | 关可收 |

---

## 验收标准（草案）

1. 点 timetable 任一列 badge：Task Tracker 显示对应 task。
2. day / week / month 且该条在当前列表可见：todo 或 schedule（及对应 activity）呈选中；不在可视范围则不选行。
3. 有 tag filter（及加星，若跟 planner）：timetable 只出现筛后的 todo / schedule / 实际番茄块。
4. 无筛选时 timetable 与改前一致；拖拽分配仍可用。

---

## 进度

- [x] **0.** 开票（含本分支已带的 planner / sync）
- [x] **1.** timetable 跟 tag filter
- [x] **2.** 点击 badge 选中
- [x] **3.** 手测点选

---

## 归档

做完后把「快照 + 验收」复制到 CHANGELOG 或 PR，或移到 `history/archive/YYYY-MM-topic.md`。
