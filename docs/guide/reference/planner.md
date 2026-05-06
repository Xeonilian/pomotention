# 任务计划操作说明

## 1 `任务计划视图`说明

### 1.1 按钮一览表

|                                                                                  按钮图标                                                                                   | 功能说明                                                                     |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------- |
| <img src="/icons/ChevronCircleRight48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> | 退回活动：选中活动从`任务计划视图`退回到`活动清单视图`                       |
| <img src="/icons/ChevronCircleDown48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">  | 任务追踪：选中活动从`任务计划视图`进入`任务追踪视图`，记录当前活动的执行情况 |
|   <img src="/icons/DismissCircle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">    | 取消活动：将活动标记为取消状态                                               |
|     <img src="/icons/Previous24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 10px;">      | 跳转到前一天/周/月                                                           |
|       <img src="/icons/Next24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 10px;">        | 跳转到后一天/周/月                                                           |
|  <img src="/icons/CalendarSettings20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 6px;">  | 切换视图：在日、周、月视图中滚动切换                                         |
|                               <img src="/icons/Search24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                | 跳转到今天/跳转到指定日期                                                    |
|                              <img src="/icons/CaretRight12Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                              | 增加预估番茄数                                                               |
|                              <img src="/icons/CaretLeft12Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                               | 减少预估番茄数                                                               |

### 1.2 显示说明

- **视图信息**：
  - 日视图：日期信息，当天累积番茄数量，全局累积番茄数，记录统计。
    <img src="/planner-day.png" alt="日视图" width="600">
  - 周视图：日期信息，每日的当天累积番茄与葡萄数量，全局累积番茄数。
    <img src="/planner-week.png" alt="周视图" width="600">
  - 月视图：日期信息，日期数字与累积番茄数相关，全局累积番茄数。
    <img src="/planner-month.png" alt="月视图" width="600">
- **日期跳转按钮**：快速跳转到今天、前一天、后一天以及选择的日期。
- **视图切换**：
  - 按钮在日、周、月视图中滚动切换
  - 点击日期信息跳转到月视图
- **今日待办 `Todo`**：
  - 复选框：是否执行完毕；
  - 开始：开始时间，任务追踪时间`可编辑`；
  - 结束：结束时间，复选框勾选时间`可编辑`；
  - 排序：待办优先级`可编辑`；
  - 意图：标题`可编辑`；
  - 果果：三阶段预估任务所需番茄时钟数量；
  - 状态：状态数据，任务追踪、取消活动、退回活动。
- **今日预约 `Schedule`**
  - 复选框：是否执行完毕；
  - 开始：开始时间`不可编辑`；
  - 结束：结束时间，复选框勾选时间`可编辑`；
  - 时长：预估所需时间`不可编辑`；
  - 意图：标题`可编辑`；
  - 地点：任务执行地点`可编辑`；
  - 状态：任务追踪、取消活动。
- **今日无所事事 `Untaetigkeit`**
  - 复选框：是否执行完毕；
  - 开始：开始时间`不可编辑`；
  - 结束：结束时间，复选框勾选时间`可编辑`；
  - 时长：预估所需时间`不可编辑`；
  - 意图：标题`可编辑`；
  - 地点：任务执行地点`可编辑`；
  - 状态：任务追踪。

## 2 任务计划功能

- 显示指定日期的活动安排执行情况
- 管理活动的执行过程

### 2.1 选择显示日期

### 2.2 待办任务 `Todo` 操作

- **开始执行|任务追踪**：点击 <img src="/icons/ChevronCircleDown48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 执行 `任务追踪`，每个活动只能执行一次：
  - 如果活动从 `活动清单视图` 选择 `任务追踪`，双击开始处，输入时间，例如 `09:00`；
  - 如果活动从 `任务计划视图` 选择 `任务追踪`，双击开始处，会显示任务追踪时间。
- **完成执行**：勾选复选框标记为已完成，如果日期为当天，会记录当下时间。
- **编辑**：`开始`、`结束`、`排序`、`意图`，可双击启动编辑。
- **追踪预估番茄数**：
  - <img src="/icons/CaretRight12Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">：增加预估数，最多估计 3 次；
  - <img src="/icons/CaretLeft12Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> ：取消预估，如果没有勾选预估的番茄；
  - 当完成执行后，不再提供预估。
- **优先级排序**：按优先级自动排序。
- **取消活动**：点击 <img src="/icons/DismissCircle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 将活动标记为取消状态，与删除不同，这个活动会保留在 `活动清单视图` 中，可以通过 `取消活动` 筛选显示。
- **退回活动**：点击 <img src="/icons/ChevronCircleRight48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">，当前活动从`任务计划视图`退回到`活动清单视图`，状态变为 `suspended`。

### 2.3 预约任务 `Schedule` 操作

- **任务追踪**：点击 <img src="/icons/ChevronCircleDown48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 执行 `任务追踪`，每个活动只能执行一次，`Schedule`在`活动清单视图`中修改`开始`与`时长` 。
- **完成执行**：勾选复选框标记为已完成，如果日期为当天，会记录当下时间。
- **编辑**：`结束`、`意图`、`地点`，可双击启动编辑。
- **取消活动**：点击 <img src="/icons/DismissCircle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 将活动标记为取消状态，与删除不同，这个活动会保留在 `活动清单视图` 中，可以通过 `取消活动` 筛选显示。
- **退回活动**：无退回操作，通过修改`活动清单视图`中的`约定时间`。

### 2.4 无所事事 `Untaetigkeit` 操作

- **任务追踪**：点击 <img src="/icons/ChevronCircleDown48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 执行 `任务追踪`，每个活动只能执行一次，`Untaetigkeit`在`活动清单视图`中修改`开始`与`时长` 。
- **完成执行**：勾选复选框标记为已完成，如果日期为当天，会记录当下时间。
- **编辑**：`结束`、`意图`、`地点`，可双击启动编辑。

## 3 重要说明

- 任务计划数据与活动清单数据实时同步；
- 活动取消，从任务计划中筛选取消活动可以查看以及恢复；
- 标签不在该区域显示。
