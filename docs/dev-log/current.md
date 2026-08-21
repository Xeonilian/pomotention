# 当前这一关

> **搞不清要干嘛、干到哪了 → 只看这个文件。**  
> 开新功能：填下面各节；收工：更新「停在哪」；做完：打勾后清空或归档到 [`history/archive/`](./history/archive/README.md)。

---

## 快照

| 项 | 内容 |
|---|---|
| **主题** | timetable 第四列打扰刻度 + 第五列能量/奖励 emoji |
| **来自** | 筛选与点选已进 `feat`；本关把 task 上已有记录钉到时间轴 |
| **蓝图** | [`1-architecture-layering.md`](./blueprint/1-architecture-layering.md) |
| **分支** | `feat` |
| **更新** | 2026-08-21 |
| **停在哪** | 记录标记已在 `feat`：同一列 emoji、同行错开、点击 3s popover。下一步可调手机左栏宽 / 中间 padding。收费仍在 `dev`。 |

---

## 本分支已带（本关不重做）

1. planner Enter / pe Esc
2. 设置「同步数据库」
3. timetable 跟 tag filter；点击各列选中 task / 可见行

收费 / 网关仍在 `dev`。

---

## 这一关要干嘛（一句话）

在 timetable **电脑端**把当日 task 的打扰画成第四列 4px 刻度，能量和奖励画在第五列 emoji；点击看详情并选中对应 task。不走 chart 按天聚合。

---

## 今日已对齐（备忘，明天勿重新绕）

### 落点

- 只扫当日筛后的 todo / schedule 所挂 task（节点数量可控）。
- `recordedAt`（无则 `id`）**落在当天** → 用该时刻。
- **晚于当天**（后补）→ 用当天这条 todo 的 `startTime`（schedule 用 `activityDueRange[0]`）；没有可用开始时刻则不画。
- **早于当天** → 不画。
- 时刻落到表外时夹进可见 `timeRange`，避免丢在画布外。

### 样子（电脑）

- 打扰：第四列，内部 💭、外部 🗣️。同时刻上下错开。点击 popover 只出说明，不写「内部/外部打扰」。
- 能量 + 奖励：第五列，用现成 `getEnergyScoreEmoji` / `getRewardScoreEmoji`。同时刻错开。
- 点击：popover 说明（打扰类型+内容；能量/奖励：类型+分数+说明）+ 选中 task/行（复用上一关）。

### 不做

- 手机窄列适配、chart 聚合、给打扰加时长、新 store。

---

## 分步（按顺序）

| 步 | 内容 | 产出 |
|---|---|---|
| **0** | 写进本文件 | 范围钉死 |
| **1** | 纯函数：落点 + 去重 + lane | 单测覆盖当天/后补/更早 |
| **2** | 电脑端第四列刻度 + 第五列 emoji + 点击 | 可手测 |

---

## 验收标准（草案）

1. 当天记录钉在 `recordedAt`；后补钉在 start；更早的不出现。
2. 内部/外部打扰颜色可分；能量/奖励 emoji 对 1–10。
3. 同时刻不重叠；点击有详情且选中 task。
4. 无筛选时只多这些标记，原列不变。

---

## 进度

- [x] **0.** 开票
- [x] **1.** 落点 service + 单测
- [x] **2.** 电脑端渲染与点击

---

## 归档

做完后把「快照 + 验收」复制到 CHANGELOG 或 PR，或移到 `history/archive/YYYY-MM-topic.md`。
