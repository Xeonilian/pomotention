# 时间表操作说明

## 1 时间表功能

- 编辑工作时间表和娱乐时间表
- 可视化显示时间块和活动安排
- 实时显示当前时间位置
- 支持活动拖拽到时间块

### 1.1 按钮一览表

|                                                                              按钮图标                                                                               | 功能说明                                         |
| :-----------------------------------------------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------- |
|  <img src="/icons/Backpack24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">  | 切换时间表类型：在工作时间表和娱乐时间表之间切换 |
|   <img src="/icons/Beach24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">    | 切换时间表类型：在娱乐时间表和工作时间表之间切换 |
|  <img src="/icons/Settings24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">  | 编辑时间表：进入时间表编辑模式                   |
| <img src="/icons/ArrowReset48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> | 重置时间表：恢复预设时间表                       |

### 1.2 时间表编辑操作

- **进入编辑模式**：点击 <img src="/icons/Settings24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 按钮进入编辑模式
- **添加时间块**：在编辑模式下点击按钮，只有添加才会录入 `24:00`
- **编辑时间块**：
  - **开始时间**：设置时间块的起始时间
  - **结束时间**：设置时间块的结束时间
  - **类型选择**：睡眠、工作、娱乐
- **删除时间块**：选中时间块后点击删除按钮
- **完成编辑**：点击 <img src="/icons/Settings24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 按钮退出编辑模式

### 1.3 时间表重置

- **默认设置**：<img src="/icons/ArrowReset48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 重置为系统预设的默认时间表
- **数据保护**：重置前会提示确认，防止误操作

### 1.4 时间表切换

- **切换按钮**：点击按钮在两种时间表之间切换
- **工作时间表**：<img src="/icons/Backpack24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 显示工作时间安排
- **娱乐时间表**：<img src="/icons/Beach24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 显示娱乐时间安排

## 2 时间表显示

### 2.1 基础显示

- **时间轴显示**：垂直时间轴显示 24 小时时间刻度
- **时间块可视化**：以彩色块状显示各个时间段，工作、娱乐、预约
- **当前时间指示**：红色线条指示当前时间位置

### 2.2 活动安排功能

- **活动显示**：在对应时间块中显示安排的活动的优先级，番茄数量，起始阶段
- **拖拽安排**：拖动优先级标记，能够对今日活动进行排序，时间冲突则无法拖动

## 重要说明

- 工作时间表和娱乐时间表独立保存
- 时间表不按天保存，全局影响每一天，也就是说，如果时间表改变，任务的排布会改变
- 樱桃可视化为 4 个，占据 60min
