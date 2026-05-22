# 计划表说明

::: tip
与其他模块的协作关系见 [模块联动](./workflow.md)。
:::

## 快速导航

- 我想切换日期或视图：见 [导航与视图切换](#导航与视图切换)
- 我想了解各视图显示规则：见 [显示规则](#显示规则)
- 我想复制或导出条目：见 [通用操作](#通用操作)
- 我想处理待办：见 [待办 Todo 专属操作](#待办-todo-专属操作)
- 我想处理预约与无所事事：见 [预约 Schedule 与无所事事](#预约-schedule-与无所事事)

## 导航与视图切换

- **跳转**：点击 <img src="/icons/ChevronLeft20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;"> / <img src="/icons/ChevronRight20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;"> 跳转到前/后一天、周、月或年。
- **视图切换**：
  - 点击 <img src="/icons/CalendarSettings20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">，在日、周、月、年视图间循环切换；
  - 点击头部 `日期信息`（年份、周次、月份等）在视图间跳转：日视图 ↔ 周视图，周视图 ↔ 月视图，月/周视图 ↔ 年视图。
- **跳转到今日/本周/本月/今年**：
  - 点击日期输入框；
  - 点击番茄统计信息。
- **跳转到指定日期**：在日期输入框输入日期后回车。
- **筛选标签**：点击 <img src="/icons/TagSearch20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">，选择需在视图中筛选的标签。
- **取消标签筛选**：点击 <img src="/icons/TagReset20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">，清除标签筛选。

## 显示规则

- **日视图**：展示当天详情、当天累计番茄、全局累计番茄与记录统计。  
  <img src="/planner-day.png" alt="日视图" width="600">
- **周视图**：展示一周日期、每日累计番茄/葡萄与全局累计。  
  <img src="/planner-week.png" alt="周视图" width="600">
- **月视图**：展示日期与累计番茄分布。  
  <img src="/planner-month.png" alt="月视图" width="600">
- **年视图**：4×3 月格概览；点击月份标题进入月视图，点击周编号进入周视图，点击日期进入日视图。  
  <img src="/planner-year.png" alt="年视图" width="600">
- **公共假期**：以红色字显示（如有数据）。
- **节气**：以绿色字显示（如有数据）。
- **选中日期**：周、月视图中选中日期的卡片带蓝色描边；年视图中为日期格蓝色描边与光晕。触控端选中时，日期数字为浅蓝底。
- **当天日期**：周、月、年视图中，当天日期数字以深蓝实心圆底标记。
- **预约时间**：周视图和月视图中显示预约开始时间。
- **标签（周视图）**：显示任务的前两个标签；以首个标签底色标记事项范围。无标签待办以红色标记，预约以蓝色标记。
- **标签（月视图）**：显示任务的第一个标签。
- **标签（年视图）**：日期圆点底色与数字颜色取自当日首条有效事项（按优先级与时间排序）的第一个标签；启用标签筛选时，以命中筛选的事项为准。

## 通用操作

- **复制**：在周或月视图中选中日期，并选中一条预约或待办，点击 <img src="/icons/ArrowRepeatAll24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">，可将该事项复制到选中的日期。日视图中可在当日完成复制。
- **导出日程**：选择一条预约或待办，点击 <img src="/icons/QrCode24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">，弹出二维码；用手机扫描可将该条活动导入手机。

## 待办 Todo 专属操作

- **当天快速添加**：点击 <img src="/icons/Add16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">。
- **记录开始时间**：
  - **方法 1**：选中行（黄色高亮），点击 <img src="/icons/Play20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">；若已有时间会提示是否覆盖。若待办加入时间在 1 分钟内且已设置预估番茄数，将自动打开番茄时钟。
  - **方法 2**：点击行内开始时间，激活编辑区域；支持输入格式：`700`、`0700`、`07:00`。
- **记录结束时间**：
  - **方法 1**：点击 <img src="/icons/RecordStop20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">；若已有时间会提示是否覆盖。
  - **方法 2**：当天点击 <img src="/icons/CheckboxUnchecked20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">，标记待办完成 <img src="/icons/CheckboxChecked20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">，自动记录当前时间；非当天打钩不记录时间。
  - **方法 3**：点击行内结束时间，激活编辑区域；支持输入格式：`700`、`0700`、`07:00`。
- **设置优先级默认标签**：
  - 点击 <img src="/icons/Important20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">，在弹窗中选择优先级图标，并设置各图标对应的标签。
  - 行内点击优先级 0 标签，弹出选项：1️⃣ = 设置优先级，⚪ = 重置优先级，其他 emoji = 插入预设标签；该待办不参与时间表时间区间计算。  
    <img src="/planner-rank.png" alt="优先级设置" width="150">
- **记录意图**：<img src="/icons/Thinking20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;"> 列，行内点击单元格激活编辑。
- **预估番茄**：
  - **修改类型**：未选中行时，标题显示 <img src="/icons/FoodPizza20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">；选中行后显示当前行的番茄类型，点击 emoji 切换。🍅、🍇 统计口径不同；🍒 = `4×15min`。
  - **番茄预估**：<img src="/icons/CaretRight12Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> 新增预估段（弹窗输入 1–5，最多 4 段）；<img src="/icons/CaretLeft12Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> 删除末段。待办完成后不再提供预估。
- **取消待办**：选中行且未完成时，标题行显示 <img src="/icons/DismissCircle20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">，点击后取消待办，行首显示 <img src="/icons/DismissSquare20Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">；再次点击可撤回取消。

## 预约 Schedule 与无所事事

以下操作适用于 `Schedule`、`Untaetigkeit`（未特别说明时）：

- **当天快速添加**、**取消待办**：与 `Todo` 相同。
- **可编辑单元格**：`开始时间`、`结束时间`、`持续时间`、`意图`、`地点`。
- **退回**：预约与无所事事无退回操作；如需调整排程，请回到 `活动清单` 修改预约时间。开始时间仅能修改当天的值。
- **`Untaetigkeit` 无所事事**：计划表无快速添加入口，其他操作同预约。

## 说明

- 标签不在本区域直接展示；标签说明见 [标签系统](tag.md)。
- 手机上无取消待办选项。
- 第七列展示该行待办/预约过程的：平均能量值、平均奖赏值、内部打扰次数、外部打扰次数。
