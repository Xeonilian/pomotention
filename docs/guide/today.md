# 今日活动操作说明

## 1 `今日活动视图`说明

### 1.1 按钮一览表

|                                                                                  按钮图标                                                                                   | 功能说明                                               |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------- |
| <img src="/icons/ChevronCircleRight48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(248, 179, 167);border-radius: 6px;"> | 退回活动：选中活动从`今日活动视图`退回到`活动清单视图` |
| <img src="/icons/ChevronCircleDown48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(248, 179, 167);border-radius: 6px;">  | 任务追踪：进入任务追踪页面，记录当前活动的执行情况     |
|   <img src="/icons/ArrowRepeatAll24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">   | 重复活动：将当前活动复制到明天                         |
|   <img src="/icons/DismissCircle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">    | 取消活动：将活动标记为取消状态                         |
|     <img src="/icons/Previous24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 10px;">      | 跳转到前一天                                           |
|       <img src="/icons/Next24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(233, 233, 233);border-radius: 10px;">        | 跳转到后一天                                           |
|                               <img src="/icons/Search24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                | 跳转到今天/跳转到指定日期                              |
|                           <img src="/icons/ArrowExportLtr20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                            | 增加预估番茄数                                         |
|                           <img src="/icons/ArrowExportRtl20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                            | 减少预估番茄数                                         |

### 1.2 界面说明

<img src="/today-raw.png" alt="Today View without Content" width="500">

- **今日信息**：选择日期的信息，当天累积番茄数量，全局累积番茄数。
- **日期跳转按钮**：快速跳转到今天、前一天、后一天以及选择日期。
- **今日待办**：
  - 复选框：是否执行完毕；
  - 开始：开始时间，任务追踪时间【可编辑】；
  - 结束：结束时间，复选框勾选时间【可编辑】；
  - 排序：待办优先级【可编辑】；
  - 描述：标题【可编辑】；
  - 番茄：三阶段预估任务所需番茄时钟数量【可编辑】；
  - 操作：任务追踪、重复活动、取消活动、退回活动。
- **今日预约**
  - 复选框：是否执行完毕；
  - 开始：开始时间【不可编辑】；
  - 结束：结束时间，复选框勾选时间【可编辑】；
  - 时长：预估所需时间【不可编辑】；
  - 描述：标题【可编辑】；
  - 地点：任务执行地点【可编辑】；
  - 操作：任务追踪、重复活动、取消活动。
- **今日无所事事**
  - 复选框：是否执行完毕；
  - 开始：开始时间【不可编辑】；
  - 结束：结束时间，复选框勾选时间【可编辑】；
  - 时长：预估所需时间【不可编辑】；
  - 描述：标题【可编辑】；
  - 地点：任务执行地点【可编辑】；
  - 操作：任务追踪。

## 2 今日活动功能

- 显示不同日期的活动安排
- 管理活动的执行过程

### 2.1 待办任务 `Todo` 操作

- **开始执行**：点击待办任务前的复选框开始执行
- **完成执行**：再次点击复选框标记为已完成
- **暂停任务**：点击暂停按钮暂时停止任务执行
- **编辑时间**：点击时间字段编辑开始时间
- **编辑标题**：点击标题字段编辑任务描述
- **调整番茄数**：点击番茄数调整预估番茄数量
- **查看进度**：显示已完成的番茄数和总番茄数
- **任务追踪**：点击 <img src="/icons/ChevronCircleDown48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(248, 179, 167);border-radius: 6px;"> 进入任务追踪页面
- **优先级排序**：按优先级自动排序

### 2.3 预约活动操作

- **开始执行**：点击预约活动前的复选框开始执行
- **完成执行**：再次点击复选框标记为已完成
- **编辑时间**：点击时间字段编辑预约时间
- **编辑标题**：点击标题字段编辑预约描述
- **编辑地点**：点击地点字段编辑预约地点
- **查看详情**：显示预约的完整信息
- **任务追踪**：点击 <img src="/icons/ChevronCircleDown48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(248, 179, 167);border-radius: 6px;"> 进入任务追踪页面

### 2.4 时间编辑功能

- **开始时间**：Todo 启动任务记录活动的开始时间，双击显示，可编辑；Schedule 不可编辑，从`活动清单视图`编辑
- **结束时间**：打钩记录活动的结束时间，支持双击编辑
- **持续时间**：基于开始和结束时间计算
- **时间格式**：支持 24 小时制时间格式

## 3 重要说明

- 今日活动数据与活动清单数据实时同步
- 活动取消，从今日活动中筛选取消活动可以查看以及恢复
- 标签不在该区域显示
