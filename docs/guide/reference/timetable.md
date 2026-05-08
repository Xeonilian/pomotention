# 时间表日程构建操作说明

::: tip
与其他区域的协作关系见 [模块联动](./workflow.md)。
:::

## 快速导航

- 我想切换工作/娱乐时间表：见 [时间表切换](#时间表切换)
- 我想编辑时间块：见 [时间表编辑](#时间表编辑)
- 我想把任务排进当天：见 [任务占位与拖拽](#任务占位与拖拽)
- 我想恢复默认配置：见 [重置时间表](#重置时间表)

## 常用按钮

|                                                                              按钮图标                                                                               | 功能说明                           |
| :-----------------------------------------------------------------------------------------------------------------------------------------------------------------: | :--------------------------------- |
|  <img src="/icons/Backpack24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">  | 切换到工作时间表                   |
|   <img src="/icons/Beach24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">    | 切换到娱乐时间表                   |
|  <img src="/icons/Settings24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">  | 进入/退出编辑模式                  |
| <img src="/icons/ArrowReset48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> | 重置为默认时间表                   |
|      <img src="/icons/AddCircle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:#d9fccc;border-radius: 10px;">       | 末尾增加 2h 时间块（上限 `24:00`） |
|        <img src="/icons/Delete24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:#f8b3a7;border-radius: 10px;">        | 删除末尾时间块                     |

## 视图显示

- 垂直时间轴展示 24 小时刻度。
- 时间分类包括：生活 `live`、工作 `work`、睡眠 `sleep`、预约 `S`、无所事事 `U`。
- 当 `任务计划` 日期为今天时，显示当前时间指示：<span style="display:inline-block; color:yellow;background:lightgrey;border-radius:4px;">——🍅——</span>。
- 任务占位支持拖拽，冲突位置不可拖动。  
  <img src="/timetable-example.png" alt="Timetable" width="200">

## 时间表切换

- 点击 <img src="/icons/Backpack24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 查看工作时间安排。
- 点击 <img src="/icons/Beach24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 查看娱乐时间安排。

## 时间表编辑

1. 点击 <img src="/icons/Settings24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 进入编辑模式。
2. 编辑时间块的开始时间、结束时间、类型（睡眠/工作/娱乐）。
3. 需要时使用新增/删除按钮调整块数量。
4. 再次点击 <img src="/icons/Settings24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 退出编辑模式。  
   <img src="/timetable-edit.png" alt="Timetable" width="150">

## 任务占位与拖拽

- 第一列显示优先级标记，可拖拽到合适时段。
- 初次加入时：
  - 番茄任务优先填充 `work` 区域；
  - 葡萄任务优先填充 `live` 区域；
  - 樱桃可视化为 `4` 个优先级标签，占用约 `60min`。
- 手动拖拽后，不再受初次分配规则限制。

## 重置时间表

- 点击 <img src="/icons/ArrowReset48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 可恢复系统预设时间表。
- 重置前会弹出确认，避免误操作。

## 限制与说明

- 工作时间表与娱乐时间表独立保存。
- 时间表配置是全局配置，不按天保存，修改后影响每天。
- 版本 `0.4.0` 前的历史数据可能存在当日定位不精确的情况。
