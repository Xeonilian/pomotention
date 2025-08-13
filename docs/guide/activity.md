# 活动清单使用说明

## 1 显示说明

### 1.1 活动分类

活动 `Activity` ，指所有显示在清单内的条目包括：
| 图标 | 名称 | 英语|定义 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --|---------------------- | -------------------------------------------------------------------------------------- |
| <img src="/icons/ApprovalsApp24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> | 待办|`Todo` | 以原子时间块拆分但不一定有固定截止日期的任务<br>分三种子类型：<br> 🍅 分配为工作的`25min`<br>🍒 分配为工作的`4×15min`<br>🍇 分配到生活的 `25min` |
| <img src="/icons/CalendarCheckmark20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> | 预约|`Schedule` | 与他人约定具体地点、日期和持续时间的事件。 |
| <img src="/icons/Cloud24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> | 无所事事 |`Untaetigkei` | 与自己约定留白或发呆的时间段 |
|<img src="/icons/Chat24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> |内部打扰|`Internal Interruption`|来自个人情绪、想法和感受|
| <img src="/icons/VideoPersonCall24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> |外部打扰|`External Interruption`|来自他人信息、电话等|

### 1.2 任务状态配色

| 任务状态 | 颜色                                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 新添加   | <span style="display:inline-block; background:#888; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">灰色</span>    |
| 进行中   | <span style="display:inline-block; background:#e55151; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">红色</span> |
| 延期     | <span style="display:inline-block; background:#4287f5; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">蓝色</span> |
| 退回     | <span style="display:inline-block; background:#f59b23; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">橙色</span> |
| 取消     | <span style="display:inline-block; background:#222; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">黑色</span>    |

### 1.3 截止日期配色

| 截止日期 | 颜色                                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 今天到期 | <span style="display:inline-block; background:#e55151; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">红色</span> |
| 后天到期 | <span style="display:inline-block; background:#ffe066; color:#222; padding:0 8px; border-radius:4px; font-size:90%;">黄色</span> |
| 明天到期 | <span style="display:inline-block; background:#f59b23; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">橙色</span> |
| 已过期   | <span style="display:inline-block; background:#4287f5; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">蓝色</span> |

### 1.4 选中与高亮

- 在`活动清单视图`中选中：活动行边框高亮为<span style="display:inline-block; background:#e55151; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">红色</span>
- 从`今日活动视图`中选中对应的活动：整行背景显示为<span style="display:inline-block; background:#ffe066; color:#222; padding:0 8px; border-radius:4px; font-size:90%;">黄色</span>

## 2 活动清单功能

- 选择、跳转、增加、删除、编辑活动
- 输入区支持编辑：描述、地点、持续时间、开始时间、预估番茄数、标签
- 调整父子层级
- 拖拽调整活动顺序
- 筛选显示：基于内部关键词/输入关键词
- 以多列看板显示活动清单

### 2.1 按钮一览表

|                                                                                    按钮图标                                                                                    | 功能说明                                                                                                                                                            |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   <img src="/icons/ChevronCircleLeft48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(248, 179, 167);border-radius: 6px;">   | 选择活动：将 `Todo` 活动设为今日待办，跳转`今日活动视图`到活动执行的日期                                                                                            |
|   <img src="/icons/ChevronCircleDown48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(248, 179, 167);border-radius: 6px;">   | 追踪任务：记录当前活动相关的 Task 想法                                                                                                                              |
|      <img src="/icons/CalendarAdd24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">      | 添加预约：新增 `Schedule` 活动，设置日期后自动添加相应日期的待办                                                                                                    |
|       <img src="/icons/CloudAdd20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">        | 添加无所事事：新增 `Untaetigkeit`，默认时间为当前                                                                                                                   |
|       <img src="/icons/AddCircle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">       | 添加任务：新增一个 `Todo` 活动；点击 右上角<img src="/icons/DotMark.svg" width="18" style="display:inline-block;vertical-align:middle;margin:0;">可打开二级操作菜单 |
| <img src="/icons/TextGrammarArrowRight24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> | 生成子活动（二级菜单）：为当前 `Todo` 类活动生成子活动）                                                                                                            |
| <img src="/icons/TextGrammarArrowLeft24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">  | 升级为兄弟（二级菜单）：将当前`Todo` 类子活动变为兄弟活动                                                                                                           |
|        <img src="/icons/LeafTwo24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">        | 切换番茄类型（二级菜单）：切换 `Todo` 活动的类型，工作 🍅/生活 🍇/沉浸 🍒                                                                                           |
|    <img src="/icons/ArrowRepeatAll24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">     | 复制/重复活动：快速复制所选活动，默认不复制标签                                                                                                                     |
|        <img src="/icons/Delete24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">         | 删除活动：移除选中活动                                                                                                                                              |
|  <img src="/icons/DocumentTableSearch24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">  | 筛选：弹出预设筛选方案                                                                                                                                              |
|          <img src="/icons/Add16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">          | 增加新列：在看板多分区视图下新增一列                                                                                                                                |
|       <img src="/icons/Subtract16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">        | 删除当前列：移除选中分区                                                                                                                                            |
|          <img src="/icons/Tag16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">          | 打开标签编辑器：编辑全局标签、给当前活动增加标签、以及切换标签显示状态                                                                                              |

### 2.2 待办任务 `Todo` 活动操作

- **新建**：点击 <img src="/icons/AddCircle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0; background:rgb(193, 226, 255);border-radius: 6px;">
- **删除**：选中活动，点击 <img src="/icons/Delete24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">
- **复制**：选中活动，点击 <img src="/icons/ArrowRepeatAll24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">
- **选择执行日期**：选中活动，点击 <img src="/icons/ChevronCircleLeft48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(248, 179, 167);border-radius: 6px;">，活动会加入到 `今日活动页面`显示的日期中
- **跳转到执行日期**：选中活动，点击 <img src="/icons/ChevronCircleLeft48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(248, 179, 167);border-radius: 6px;">，如果活动已经选择执行日期，`今日活动页面`跳转到执行日期
- **任务追踪**：选中活动，点击 <img src="/icons/ChevronCircleDown48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(248, 179, 167);border-radius: 6px;">
- **打开二级菜单**：点击 <img src="/icons/AddCircle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0; background:rgb(193, 226, 255);border-radius: 6px;"> 右上角<img src="/icons/DotMark.svg" width="18" style="display:inline-block;vertical-align:middle;margin:0;">
- **生成子活动**：选中活动，点击二级菜单中的 <img src="/icons/TextGrammarArrowRight24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> ，仅支持一级子活动
- **升级为兄弟**：选中子活动，点击二级菜单中的 <img src="/icons/TextGrammarArrowLeft24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">
- **修改类型**：选中活动，点击二级菜单中的 <img src="/icons/LeafTwo24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 按顺序切换（🍅/🍒/🍇），切换后预估番茄数清零，樱桃默认为 4 个

### 2.3 预约 `Schedule` 活动操作

- **新建**：点击 <img src="/icons/CalendarAdd24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">
- **删除**：选中活动，点击 <img src="/icons/Delete24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">
- **复制**：选中活动，点击 <img src="/icons/ArrowRepeatAll24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">
- **选择执行日期**：修改活动时间，`Schedule` 自动添加到设置日期的`今日活动页面`
- **跳转到执行日期**：选中活动，点击 <img src="/icons/ChevronCircleLeft48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;;background:rgb(248, 179, 167);border-radius: 6px;">，`今日活动页面`跳转到执行日期
- **任务追踪**：选中活动，点击 <img src="/icons/ChevronCircleDown48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;;background:rgb(248, 179, 167);border-radius: 6px;">

### 2.5 无所事事 `Untaetigkeit` 活动操作

- **新建**：点击 <img src="/icons/CloudAdd20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">，新增后自动添加到当前时间
- **删除**：选中活动，点击 <img src="/icons/Delete24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">
- **复制**：选中活动，点击 <img src="/icons/ArrowRepeatAll24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">
- **选择执行日期**：修改日期，自动添加到设置日期的`今日活动页面`
- **跳转到执行日期**：选中活动，点击 <img src="/icons/ChevronCircleLeft48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;;background:rgb(248, 179, 167);border-radius: 6px;">，`今日活动页面`跳转到执行日期
- **任务追踪**：选中活动，点击 <img src="/icons/ChevronCircleDown48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;;background:rgb(248, 179, 167);border-radius: 6px;">

### 2.6 活动清单视图设置

- **点击筛选**：点击 <img src="/icons/DocumentTableSearch24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 显示下拉菜单中的**预设选项**，点击后完成筛选
- **录入筛选**：输入关键词进行筛选，其中**预设选项**的中英文关键词：
  - 全部活动 `all`
  - 今日到期 `today`
  - 内外打扰 `interrupt`
  - 待办活动 `todo`
  - 预约活动 `schedule`
  - 取消活动 `cancelled`
- **调整顺序**：鼠标悬浮在活动的图标上，当指针变为手型，可上下拖动顺序
- **看板增加**：点击 <img src="/icons/Add16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 增加一列活动订单，最多支持 6 列，排序在各列联动，筛选保持独立
- **看板删除**：点击 <img src="/icons/Subtract16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 删除当前列活动清单，第一列无法删除

## 3 重要说明

- 标签使用说明见 [标签系统](tag.md)
