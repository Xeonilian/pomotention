# 时间表操作说明

## 1 `时间表视图`说明

### 1.1 按钮一览表

|                                                                              按钮图标                                                                               | 功能说明                                           |
| :-----------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------- |
|  <img src="/icons/Backpack24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">  | 切换时间表类型：在工作时间表和娱乐时间表之间切换   |
|   <img src="/icons/Beach24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">    | 切换时间表类型：在娱乐时间表和工作时间表之间切换   |
|  <img src="/icons/Settings24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">  | 编辑时间表：进入时间表编辑模式                     |
| <img src="/icons/ArrowReset48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> | 重置时间表：恢复预设时间表                         |
| <img src="/icons/AddCircle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(217, 252, 204);border-radius: 10px;"> | 增加时间块：末尾增加 2h 时间区块（最大值 `24:00`） |
|  <img src="/icons/Delete24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(248, 179, 167);border-radius: 10px;">   | 删除时间块：删除末尾时间块                         |

### 1.2 显示说明

- **时间轴**：垂直时间轴显示 24 小时时间刻度；
- **时间分类**：生活 `live` <span style="display:inline-block; background:#4287f5; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">1</span>，工作 `work` <span style="display:inline-block; background:rgb(248, 179, 167); color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">1</span>，睡眠`sleep`，预约 `S`，无所事事 `U`；
- **当前时间**： 当`今日活动视图`的日期为当天，动态显示 <span style="display:inline-block; color:yellow;background:lightgrey;border-radius:4px;">——🍅——</span> 当前时间位置；
- **活动显示**：活动的优先级标记，番茄数量，起始阶段；
- **拖拽安排**：拖动优先级标记，能够对今日活动进行排序，时间冲突的位置无法拖动。
  <img src="/timetable-example.png" alt="Timetable" width="100">

## 2 时间表功能操作

- 可视化显示时间块和活动安排
- 编辑工作时间表和娱乐时间表
- 支持活动拖拽到时间块

### 2.1 时间表切换

- **切换工作时间表**：<img src="/icons/Backpack24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 显示工作时间安排
- **切换娱乐时间表**：<img src="/icons/Beach24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 显示娱乐时间安排

### 2.2 时间表编辑操作

- **进入编辑模式**：点击 <img src="/icons/Settings24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 按钮进入编辑模式
- **添加时间块**：在编辑模式下点击按钮，只有添加才会录入 `24:00`
- **编辑时间块**：
  - **开始时间**：设置时间块的起始时间
  - **结束时间**：设置时间块的结束时间
  - **类型选择**：睡眠、工作、娱乐
- **删除时间块**：选中时间块后点击删除按钮
- **完成编辑**：点击 <img src="/icons/Settings24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 按钮退出编辑模式
  <img src="/timetable-edit.png" alt="Timetable" width="150">

### 2.3 时间表重置

- **默认设置**：<img src="/icons/ArrowReset48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 重置为系统预设的默认时间表
- **数据保护**：重置前会提示确认，防止误操作

## 3 重要说明

- 工作时间表和娱乐时间表独立保存；
- 时间表不按天保存，设置后影响每一天，也就是说，时间表改变，任务的排布会改变；
- 樱桃可视化为`4`个优先级标签，占据 `60min`。
