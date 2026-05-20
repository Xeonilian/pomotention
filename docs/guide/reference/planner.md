# 计划表操作说明

::: tip
与其他区域的协作关系见 [模块联动](./workflow.md)。
:::

## 快速导航

- 我想切换日期或视图：见 [导航与视图切换](#导航与视图切换)
- 我想了解日期事项规则：见 [显示规则](#显示规则)
- 我想处理当天条目：见 [操作](#通用操作)

## 导航与视图切换

- **跳转**：点击<img src="/icons/ChevronLeft20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 10px;"> / <img src="/icons/ChevronRight20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 10px;">跳转到前后一天/周/月/年。
- **视图切换**：
  - 点击<img src="/icons/CalendarSettings20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">，在日、周、月、年视图中切换；
  - 点击 `日期信息` 在视图间跳转，周/月视图切换，日/年视图切换。
- **跳转到今日/周/月/年**：
  - 点击日期输入框；
  - 点击番茄统计信息。
- **跳转到指定日期**：输入日期后回车
- **筛选标签**：点击<img src="/icons/TagSearch20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 10px;">，选择需在视图中筛选的标签。
- **取消标签筛选**：点击<img src="/icons/TagReset20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 10px;">，消标签筛选。

## 显示规则

- **日视图**：展示当天详情、当天累积番茄、全局累积番茄与记录统计。  
  <img src="/planner-day.png" alt="日视图" width="600">
- **周视图**：展示一周日期、每日累积番茄/葡萄累计与全局累计。  
  <img src="/planner-week.png" alt="周视图" width="600">
- **月视图**：展示日期与累计番茄分布。  
  <img src="/planner-month.png" alt="月视图" width="600">
- **年视图**：快速进入日、月、天视图
  <img src="/planner-year.png" alt="年视图" width="600">
- **公共假期**：公共假期以红色字显示（如有数据）
- **节气**：绿色显示（如有数据）
- **选中日期**：周、月和年视图中选中的日期以淡蓝色底色标记
- **当天日期**：周、月和年视图中选中的日期以深蓝色底色标记
- **预约时间**：周视图和月视图中显示预约开始的时间
- **标签（周视图）**：显示任务的前两个标签，并以首个标签的底色标记事项范围，如无标签待办以红色标记，预约以蓝色标记
- **标签（月视图）**：显示任务的第一个标签
- **标签（年视图）**：日期的底色和字体颜色使用当日记录的第一件事的第一个标签

## 通用操作

- **复制**：在周或月视图中选中日期，并选中一条预约或待办，点击 <img src="/icons/ArrowRepeatAll24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">，可以将该事项复制到选中的天中。日视图中可在当日完成复制。
- **导出日程**：选择一条预约或待办，点击 <img src="/icons/QrCode24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">，弹出二维码，用手机扫描可将改条活动导入手机。

## `Todo` 待办的操作

- **快速添加当日待办**：点击<img src="/icons/Add16Regular.svg" width="20"  style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">。
- **记录开始时间**：
  - 选择行，点击<img src="/icons/Play20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">；
  - 点击行内开始时间，激活编辑

- **记录开始时间**：点击<img src="/icons/Play20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">
- **记录结束时间**：点击<img src="/icons/RecordStop20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">
- **设置优先级默认标签**：点击<img src="/icons/Important20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">，弹出窗口，选择优先级显示的图标，以及设置图标对应的标签。
- <img src="/icons/Thinking20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;"> 内容
- <img src="/icons/FoodPizza20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;"> 内容
- <img src="/icons/DismissCircle20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;"> 内容
- <img src="/icons/DismissSquare20Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;"> 内容
- 退回活动：数据行选中时，如果尚未完成，点击 <img src="/icons/ChevronCircleRight48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;"> 退回到 `活动清单`，状态为 `suspended`。
- 可编辑：`开始`、`结束`、`排序`、`意图`。
- 番茄预估：<img src="/icons/CaretRight12Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> 增加预估，最多5个；<img src="/icons/CaretLeft12Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> 减少预估；待办完成后不再提供预估。
- **完成执行**：勾选复选框标记完成；当天任务会记录当前时间。

### `Schedule` 预约的操作

- 快速增加
- 可编辑：`开始`、`结束`、`意图`、`地点`。
- 无退回操作；如需调整排程，请回到 `活动清单` 修改预约时间，开始仅能修改当天开始的时间。
- 无快速添加，其他操作同预约

## 限制与说明

- 计划表数据与活动清单实时同步。
- 取消活动可在计划表筛选中查看并恢复。
- 标签不在本区域直接展示，标签说明见 [标签系统](tag.md)。
