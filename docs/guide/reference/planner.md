# 任务计划操作说明

::: tip
与其他区域的协作关系见 [模块联动](./workflow.md)。
:::

## 快速导航

- 我想切换日期或视图：见 [导航与视图切换](#导航与视图切换)
- 我想处理当天条目：见 [通用操作](#通用操作)
- 我想看 `Todo`/`Schedule`/`Untaetigkeit` 差异：见 [类型差异](#类型差异)
- 我想了解显示字段：见 [显示规则](#显示规则)
- 我想导出到日历：见 [日程导出](./ics.md)

## 导航与视图切换

- <img src="/icons/Previous24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 10px;"> / <img src="/icons/Next24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 10px;">：跳转到前后一天/周/月。
- <img src="/icons/CalendarSettings20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 6px;">：在日、周、月视图中切换。
- <img src="/icons/Search24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">：跳转到今天或指定日期。
- 点击日期标题可快速跳转到月视图。

## 显示规则

- 日视图：展示当天详情、当天累积番茄、全局累积番茄与记录统计。  
  <img src="/planner-day.png" alt="日视图" width="600">
- 周视图：展示一周日期、每日累积番茄/葡萄与全局累计。  
  <img src="/planner-week.png" alt="周视图" width="600">
- 月视图：展示日期与累计番茄分布。  
  <img src="/planner-month.png" alt="月视图" width="600">

## 通用操作

- **进入任务追踪**：点击 <img src="/icons/ChevronCircleDown48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">，每个活动仅可执行一次追踪。
- **完成执行**：勾选复选框标记完成；当天任务会记录当前时间。
- **取消活动**：点击 <img src="/icons/DismissCircle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">，活动保留，可在筛选中查看和恢复。
- **编辑字段**：双击可编辑字段（如标题、结束时间、地点等）。

## 类型差异

### `Todo`

- 可编辑：`开始`、`结束`、`排序`、`意图`。
- 番茄预估：<img src="/icons/CaretRight12Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> 增加预估；<img src="/icons/CaretLeft12Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> 减少预估；完成后不再提供预估。
- 退回活动：点击 <img src="/icons/ChevronCircleRight48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 退回到 `活动清单`，状态为 `suspended`。

### `Schedule`

- 可编辑：`结束`、`意图`、`地点`。
- 无退回操作；如需调整排程，请回到 `活动清单` 修改预约时间。

### `Untaetigkeit`

- 可编辑：`结束`、`意图`、`地点`。
- 开始与时长在 `活动清单` 中调整。

## 限制与说明

- 任务计划数据与活动清单实时同步。
- 取消活动可在任务计划筛选中查看并恢复。
- 标签不在本区域直接展示，标签说明见 [标签系统](tag.md)。
