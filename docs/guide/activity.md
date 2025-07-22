# 活动清单操作说明

## 术语一览

- **活动 Activity**：指所有显示在清单内的条目，包括以下类型：
  - **预约（Schedule）**：与他人约定具体地点、日期和持续时间的事件。
  - **无所事事（Untaetigkeit）**：与自己约定留白或发呆的时间段。
  - **待办任务（Todo）**：以原子时间块拆分但不一定有固定截止日期的任务，分三种子类型：
    - **🍅（Tomato ）**：工作时间的番茄钟`25min`
    - **🍒（Cherry）**：沉浸式工作法，`4×15min`
    - **🍇（Grape）**：生活时间的番茄钟 `25min`
  - **打扰（Interruption）**：以对话（内部打扰）或电话（外部打扰）的方式打断活动，可归属于任务或预约。
    - <img src="/icons/Chat24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">：内部打扰
    - <img src="/icons/VideoPersonCall24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">：外部打扰

---

## 任务状态与颜色

### 任务状态

- **新添加**：<span style="display:inline-block; background:#888; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">灰色</span>
- **进行中**：<span style="display:inline-block; background:#e55151; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">红色</span>
- **延期**： <span style="display:inline-block; background:#4287f5; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">蓝色</span>
- **退回**： <span style="display:inline-block; background:#f59b23; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">橙色</span>
- **取消**： <span style="display:inline-block; background:#222; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">黑色</span>

### 截止日期配色

- 今天到期：<span style="display:inline-block; background:#e55151; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">红色</span>
- 明天到期：<span style="display:inline-block; background:#f59b23; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">橙色</span>
- 后天到期：<span style="display:inline-block; background:#ffe066; color:#222; padding:0 8px; border-radius:4px; font-size:90%;">黄色</span>
- 已过期：<span style="display:inline-block; background:#4287f5; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">蓝色</span>

---

### 选中与高亮

- 选中时：活动行边框高亮为<span style="display:inline-block; background:#e55151; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">红色</span>
- 若被今日待办同步选中，整行背景显示为<span style="display:inline-block; background:#ffe066; color:#222; padding:0 8px; border-radius:4px; font-size:90%;">黄色</span>

## 活动清单功能

- 选择、增加、删除、编辑多类型活动
- 拖拽调整顺序与父子层级
- 筛选显示：仅今日、仅未完成、仅待办、仅预约、内外打扰
- 任意待办可加入“今日待办清单”
- 通用输入区支持：描述、地点、持续时间、开始时间、预估番茄钟/组

### 按钮一览表

|                                                           按钮图标                                                            | 功能说明                                                                |
| :---------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------- |
|   <img src="/icons/ChevronCircleLeft48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">   | 选择活动：将某一活动设为当前主操作或推送到今日待办栏                    |
|   <img src="/icons/ChevronCircleDown48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">   | 追踪任务：将当前活动转为待办任务并接受追踪                              |
|      <img src="/icons/CalendarAdd24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">      | 添加预约：新增一项带开始时间和地点的预约活动                            |
|       <img src="/icons/CloudAdd20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">        | 添加无所事事：新增一项发呆/休息时间                                     |
|       <img src="/icons/AddCircle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">       | 添加任务：新增一个待办任务；右上角蓝色 Badge 红点点击可打开二级操作菜单 |
| <img src="/icons/TextGrammarArrowRight24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 生成子活动：为当前任务生成子任务（可在二级菜单中点选）                  |
| <img src="/icons/TextGrammarArrowLeft24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">  | 升级为兄弟：将当前子任务上移为兄弟节点（也在二级菜单）                  |
|        <img src="/icons/LeafTwo24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">        | 切换番茄类型：工作 🍅/生活 🍇/沉浸 🍒 切换（只对番茄任务适用）          |
|    <img src="/icons/ArrowRepeatAll24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 复制/重复活动：快速复制现有活动或将历史活动再次添加                     |
|        <img src="/icons/Delete24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">         | 删除活动：移除选中条目                                                  |
|  <img src="/icons/DocumentTableSearch24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">  | 筛选：弹出类型筛选菜单                                                  |
|          <img src="/icons/Add16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">          | 增加新列：在看板多分区视图下新增一列                                    |
|       <img src="/icons/Subtract16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">        | 删除当前列：移除选中分区                                                |

### 活动管理流程示例

1. 点击**添加任务/预约/无所事事**按钮，新建活动。
2. 直接在清单编辑内容（任务类型、估算时间、开始时间/持续时长等）。
   - 待办类任务：支持切换番茄类型（🍅/🍒/🍇）
   - 预约/无所事事：填写描述和具体地点、时间
3. 选中任意行，点击**删除**或**复制**或**生成子活动**或**升级为兄弟**等操作。
4. 点击**筛选**图标，选取“今日到期”、“内外打扰”、“全部”等视图。
5. 点击+-，增加或删除一列活动清单，与筛选组成`Kanban`。
6. 通过操作区按钮，将活动加入“今日待办区域”。
7. 通过操作区按钮，为活动关联任务。

---

### 预期效果

- 新建、删除、编辑活动简单直观
- 各类活动、状态一目了然（可配合标签高亮，详见标签系统说明）
- 同类活动和不同执行状态通过图标和配色实现高识别度
- 满足日程、待办、发呆或临时打扰等复杂多元场景管理
