# 软件界面说明

::: tip 快速查阅

- [首页区域联动](./workflow.md)
- [附录：按钮速查表](../appendix/buttons.md)
- [附录：术语对照表](../appendix/glossary.md)
  :::

![页面布局](/public/pomotention-layout.png)
![页面布局实际](/public/pomotention-app.png)

## 1 顶栏（Menu）

### 1.1 路由菜单

**核心功能**：

- 切换到`首页`
- 切换到`数据页`，查看全部活动，[详见](search.md)
- 切换到`仪表盘`，查看行为数据趋势, [详见](./chart.md)
- 切换到`帮助页`，查看软件帮助信息
- 切换到`设置页`，软件状态及调试工具
- <img src="/icons/List24Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(244, 244, 244);border-radius: 6px;">
  手机端收缩菜单按钮

### 1.2 布局切换

|                                                                                按钮图标                                                                                 | 功能说明                               |
| :---------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------- |
|    <img src="/icons/Timeline20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(255, 255, 255);border-radius: 6px;">    | 切换时间表视图 `Timetable`             |
|    <img src="/icons/TasksApp20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(255, 255, 255);border-radius: 6px;">    | 切换任务计划视图 `Planner`             |
| <img src="/icons/CalligraphyPen20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(255, 255, 255);border-radius: 6px;"> | 切换任务追踪视图 `Task Tracker`        |
|   <img src="/icons/BookLetter20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(255, 255, 255);border-radius: 6px;">   | 切换活动清单视图 `Activity Sheet`      |
|     <img src="/icons/Timer24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(255, 255, 255);border-radius: 6px;">      | 切换番茄意图计时器 `Pomotention Timer` |
|      <img src="/icons/Pin24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(255, 255, 255);border-radius: 6px;">       | 切换计时器置顶模式（仅桌面应用）       |
|                                                                                                                                                                         |

### 1.3 账号与数据

已登录时，顶栏「退出」旁的 **`CloudSync`** / **`Person`** 图标表示同步与账号状态；对照表与语义说明见 [账号与数据](../intro/account-and-data.md#按钮与状态)。

## 2 左侧面板：时间表 / 区块编辑器（Timetable / Block editor）

**核心功能**：

- 可视化一日的工作、休息分布
- 编辑工作/休闲时间表，切换显示
- 在可用时间区间内互动式安排任务
- 详见：[时间表构建](timetable.md)

## 3 中央上面板：任务计划（Planner）

**核心功能**：

- 规划管理待办 `to-dos` 、预约 `schedules`和活动 `activities`
- 显示任务追踪信息 `task`
- 日、周、月、年视图切换及导航
- 展示当前视图日期信息
- 展示累积番茄量
- 基于标签筛视图中的活动
- 滚动展示当前核心意图
- 详见：[任务计划](planner.md)

## 4 中央下面板：任务追踪（Task Tracker）

**核心功能**：

- 展示标签 `tag` 和任务状态信息
- 记录精力消耗 `energy` ，奖赏值 `reward` 情况
- 标记任务被打断情况（内部/外部打扰）`activities` 并转化为活动
- 保存和提取书写模板 `writing template`
- 详见：[任务追踪](task.md)

## 5 右侧面板：活动清单（Activity Sheet）

**核心功能**：

- 增删改活动 `activities`
- 利用筛选和拖拽功能构建看板
- 将活动加入任务计划
- 以颜色标记活动的时效和状态
- 详见：[活动清单](planner.md)

## 6 浮动区域：番茄意图计时器（Pomotention Timer）

**核心功能**：

- 单次工作或休息计时
- 连续工作或休息计时
- 自定义工作、休息时长
- 自定义工作白噪音
- 自定义工作标语
- 计时器置顶（仅桌面应用）
- 详见：[番茄意图计时器](timer.md)

各面板之间如何送数据、一条工作从清单到记录怎么走，见 [首页区域联动](./workflow.md)。
