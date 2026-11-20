---
title: 附录：按钮速查表
description: 各区域主要按钮与控件的集中速查；细节仍以对应模块文档为准。
---

# 附录：按钮

::: tip

- 本页为**速查表**，适合已大致了解布局、需要快速确认图标含义时使用。
- `Activity`、`Todo`、`Task` 等术语见 [附录：术语对照](./glossary.md)。
- 细节与步骤以各模块文档为准；本表只列「图标 ↔ 含义」。
  :::

## 目录

- [顶栏与布局切换](#顶栏与布局切换)
- [活动清单按钮](#活动清单按钮)
- [计划表按钮](#计划表按钮)
- [时间表按钮](#时间表按钮)
- [任务追踪按钮](#任务追踪按钮)
- [数据页按钮](#数据页按钮)
- [番茄钟主要控件](#番茄钟)
- [生活记录](#生活记录)
- [手机 FAB](#手机-fab)

---

## 顶栏与布局切换 {#顶栏与布局切换}

主工作区顶栏：分区入口与计时器开关。完整布局见 [软件界面](../reference/interface.md)。

|                                                        按钮图标                                                        | 功能说明                                                        |
| :--------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------- |
|      <img src="/icons/List24Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">       | 手机：收缩 / 展开侧栏菜单                                       |
|    <img src="/icons/Timeline20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">    | 切换时间表                                                      |
|    <img src="/icons/TasksApp20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">    | 切换计划表                                                      |
| <img src="/icons/CalligraphyPen20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 切换任务追踪                                                    |
|   <img src="/icons/BookLetter20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">   | 切换活动清单                                                    |
|     <img src="/icons/Timer24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">      | 打开 / 关闭番茄钟悬浮层                                         |
|      <img src="/icons/Pin24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">       | 计时器置顶迷你模式（桌面端）                                    |
| <img src="/icons/DatabasePerson20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 数据库导入 / 导出（全量 JSON）                                  |
|     <img src="/icons/Person20Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">      | 未登录：登录 / 注册                                             |
|     <img src="/icons/Person20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 已登录：账号菜单（同步状态 / 退出）；同步中可能显示为云同步图标 |
|   <img src="/icons/CloudSync20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">    | 正在与云端同步（替代人物图标）                                  |
|   <img src="/icons/DrinkCoffee24Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">   | 订购云同步 / 打赏（「请我喝杯咖啡」）                           |

账号与同步色态细节见 [账号与数据](../intro/account-and-data.md#按钮与状态)；价目见 [支持与订阅](../intro/support.md)。

---

## 活动清单按钮 {#活动清单按钮}

首页右侧活动清单。工具栏在列头；选中行后的操作为圆形按钮组。详见 [活动清单](../reference/activity.md)。

### 列头 / 视图

|                                                          按钮图标                                                           | 功能说明                         |
| :-------------------------------------------------------------------------------------------------------------------------: | :------------------------------- |
| <img src="/icons/DocumentTableSearch24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 筛选预设（今日 / 待办 / 已删等） |
| <img src="/icons/ArrowSortDownLines24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">  | 排序方式                         |
|        <img src="/icons/Grid20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">         | 四象限布局开 / 关                |
|  <img src="/icons/ColumnArrowRight20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">   | 看板增加一列（最多 6）           |
|  <img src="/icons/TableDeleteColumn20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">  | 删除当前看板列（第一列不可删）   |
|         <img src="/icons/Tag16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">         | 显示 / 隐藏标签列                |

### 选中行操作

|                                                           按钮图标                                                            | 功能说明                                   |
| :---------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------- |
|   <img src="/icons/ChevronCircleLeft48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">   | 待办：选入今日计划并跳转；预约：跳到执行日 |
|        <img src="/icons/Delete24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">         | 删除所选活动                               |
|     <img src="/icons/DeleteDismiss24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 恢复已删活动（删按钮变红态时）             |
| <img src="/icons/TextGrammarArrowRight24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 生成子活动（仅一级）                       |
| <img src="/icons/TextGrammarArrowLeft24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">  | 子活动升级为兄弟                           |
|    <img src="/icons/ArrowRepeatAll24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 重复 / 复制活动                            |
|       <img src="/icons/AddCircle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">       | 添加待办 `Todo`                            |
|      <img src="/icons/CalendarAdd24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">      | 添加预约 `Schedule`                        |
|       <img src="/icons/CloudAdd20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">        | 添加无所事事 `Untaetigkeit`                |

番茄子类型 🍅/🍒/🍇：在预估番茄输入框 **双击** 切换（不是工具栏单独按钮）。

---

## 计划表按钮 {#计划表按钮}

日 / 周 / 月 / 年导航与行内操作。详见 [计划表](../reference/planner.md)。

|                                                                                                                      按钮图标                                                                                                                       | 功能说明                         |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------- |
|                                                                 <img src="/icons/ChevronLeft20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                                 | 上一周期（日 / 周 / 月 / 年）    |
|                                                                <img src="/icons/ChevronRight20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                                 | 下一周期                         |
|                                                              <img src="/icons/CalendarSettings20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                               | 日 ↔ 周 ↔ 月 ↔ 年循环切换        |
|                                                                  <img src="/icons/TagSearch20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                                  | 按标签筛选计划行                 |
|                                                                  <img src="/icons/TagReset20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                                   | 清除标签筛选                     |
|                                                               <img src="/icons/ArrowRepeatAll24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                                | 复制选中行到选中日期             |
|                                                                     <img src="/icons/Add16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                                     | 日视图：当天快速添加             |
|                                                                    <img src="/icons/Play20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                                     | 记录开始时间                     |
|                                                                 <img src="/icons/RecordStop20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                                  | 记录结束时间                     |
| <img src="/icons/CheckboxUnchecked20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> / <img src="/icons/CheckboxChecked20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 完成勾选（当天勾选会记结束时间） |
|                                                                <img src="/icons/DismissCircle20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                                | 取消待办（桌面；手机见 FAB）     |
|                                                             <img src="/icons/ChevronCircleRight48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                              | 撤销选中任务、退回活动清单       |
|                                                                   <img src="/icons/QrCode24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                                    | 导出日程二维码                   |

周视图还可 **横拖复制到其他日**、**纵拖改时段**（手机请长按再拖）。

---

## 时间表按钮 {#时间表按钮}

工作 / 娱乐时间表切换与块编辑。详见 [时间表](../reference/timetable.md)。

|                                                      按钮图标                                                      | 功能说明                           |
| :----------------------------------------------------------------------------------------------------------------: | :--------------------------------- |
|  <img src="/icons/Backpack24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">  | 切换到工作时间表                   |
|   <img src="/icons/Beach24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">    | 切换到娱乐时间表                   |
|  <img src="/icons/Settings24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">  | 进入 / 退出编辑模式                |
| <img src="/icons/ArrowReset48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 重置为默认时间表                   |
| <img src="/icons/AddCircle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">  | 末尾增加 2h 时间块（上限 `24:00`） |
|   <img src="/icons/Delete24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">   | 删除末尾时间块                     |

---

## 任务追踪按钮 {#任务追踪按钮}

任务区状态录入与书写。批注语法见 [批注与高亮](../reference/task.md#批注与高亮)。

|                                                                                                          按钮图标                                                                                                          | 功能说明                |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------- |
| <img src="/icons/Star20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> / <img src="/icons/Star20Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 取消 / 加星             |
|                                                    <img src="/icons/BatterySaver20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                    | 记录能量（1–10）        |
|                                                       <img src="/icons/Trophy20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                       | 记录奖赏（1–10）        |
|                                                 <img src="/icons/CalendarAssistant20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                  | 记录打扰（内部 / 外部） |
|                                                   <img src="/icons/CalligraphyPen20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                   | 打开书写模板            |

---

## 数据页按钮 {#数据页按钮}

搜索、Project、导出与详情批注。详见 [数据查看](../reference/search.md)。

|                                                         按钮图标                                                         | 功能说明                     |
| :----------------------------------------------------------------------------------------------------------------------: | :--------------------------- |
|      <img src="/icons/Search20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">      | 搜索框：关键字或 `#` 选标签  |
|   <img src="/icons/DismissCircle16Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">   | 清空搜索框                   |
|       <img src="/icons/Star20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">       | 仅显示有加星任务的条目       |
|      <img src="/icons/Folder20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">      | 新建根 Project               |
| <img src="/icons/FolderArrowRight20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 在当前选中下新建子文件夹     |
|  <img src="/icons/ArrowDownload20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">   | 导出当前筛选命中             |
|  <img src="/icons/ChevronUpDown20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">   | 手机：列表整理 / 分屏 / 上满 |
|  <img src="/icons/FolderArrowUp20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">   | 文件夹升一层                 |
| <img src="/icons/ArrowCollapseAll20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 收起该文件夹整棵子树         |
|   <img src="/icons/CalendarLtr20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">    | 按月分组（无子文件夹时）     |
|    <img src="/icons/TagSearch20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 绑定智能标签                 |
|     <img src="/icons/TagReset20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 清除智能标签                 |
|      <img src="/icons/Delete20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">      | 删除文件夹（条目只移出）     |
|       <img src="/icons/Note20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">       | 详情：Note 编辑模式          |
|    <img src="/icons/Highlight20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 详情：后批高亮笔（含擦除）   |

---

## 番茄钟主要控件 {#番茄钟}

番茄钟为**悬浮层**，可拖动位置；也可切换迷你置顶模式。控件标签以界面英文为准。

| 控件 / 区域                                                                                                         | 作用                                             |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `Wind up`                                                                                                           | 单次模式下开始一个标准工作周期                   |
| `Squash`                                                                                                            | 取消当前工作计时                                 |
| `Break`                                                                                                             | 开始休息计时                                     |
| 数字时长区                                                                                                          | 展开并选择休息分钟数                             |
| `Stop`                                                                                                              | 休息中提前结束休息                               |
| 🍅🍕                                                                                                                | 单次计时 ⟷ 连续计时（Pizza）模式；运行中不可切换 |
| 序列文本框                                                                                                          | 连续模式自定义序列，如 `🍅+05`                   |
| 🔈 / 红点                                                                                                           | 白噪音开关与种类                                 |
| <img src="/icons/Pin24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">（顶栏） | 进入迷你计时模式                                 |
| <img src="/icons/ArrowExpand24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 退出迷你模式                                     |

---

## 生活记录 {#生活记录}

计划表顶栏宫格；日视图打开录入，周 / 月 / 年打开图层。详见 [生活记录](../reference/life.md)。

| 按钮图标 | 功能说明 |
| :---: | :--- |
| <img src="/icons/AppsAddIn20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 日视图、当天无记录：打开录入 |
| <img src="/icons/ChannelAdd20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 日视图、当天已有记录：打开录入 |
| <img src="/icons/Apps20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 周 / 月 / 年：生活可视化图层开关（再点关掉；开着时图标会变实心并偏蓝） |

---

## 手机 FAB {#手机-fab}

首页右下角圆形快捷钮（仅手机）。点开后向左 / 向上展开；任务区编辑中会变成「完成编辑」。

|                                                           按钮图标                                                            | 功能说明                           |
| :---------------------------------------------------------------------------------------------------------------------------: | :--------------------------------- |
|          <img src="/icons/Add24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">          | 主钮：展开 / 收起面板              |
|       <img src="/icons/Checkmark20Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">        | 任务正文编辑中：完成并保存         |
|        <img src="/icons/ArrowUp20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">        | 选中上一行（活动清单或计划行）     |
|       <img src="/icons/ArrowDown20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">       | 选中下一行                         |
|       <img src="/icons/CloudAdd20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">        | 快速添加无所事事                   |
|      <img src="/icons/CalendarAdd24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">      | 快速添加预约                       |
|       <img src="/icons/AddCircle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">       | 快速添加待办                       |
|     <img src="/icons/DismissCircle20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 取消计划行待办（计划表态）         |
|  <img src="/icons/ChevronCircleRight48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">   | 撤销选中任务、退回活动清单         |
|   <img src="/icons/ChevronCircleLeft48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">   | 活动清单态：选入计划 / 跳转日期    |
| <img src="/icons/TextGrammarArrowRight24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 生成子活动                         |
| <img src="/icons/TextGrammarArrowLeft24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">  | 升级为兄弟                         |
|        <img src="/icons/Delete24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">         | 删除活动                           |
|     <img src="/icons/DeleteDismiss24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 恢复已删活动                       |
|    <img src="/icons/ArrowRepeatAll24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 重复活动                           |
|     <img src="/icons/AnimalTurtle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">      | 回到当下（今日 + 日视图 + 清筛选） |
