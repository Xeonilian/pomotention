# 任务追踪操作说明

::: tip
与其他区域的协作关系见 [模块联动](./workflow.md)。
:::

## 快速导航

- 我想先理解记录项：见 [记录模型](#记录模型)
- 我想快速录入状态：见 [状态记录](#状态记录)
- 我想写执行过程：见 [书写与模板](#书写与模板)
- 我想看时间轴展示：见 [时间轴显示](#时间轴显示)

## 记录模型

- **任务 `Task`**：从 `Activity` / `Todo` / `Schedule` 进入执行后形成的追踪对象。
- 每条任务可包含：
  - 任务描述（Markdown）
  - 书写模板
  - 能量记录（⚡，1-10）
  - 愉悦记录（🏵️，1-10）
  - 打扰记录（内部 💭 / 外部 🗣️）

## 常用按钮

| 按钮图标 | 功能说明 |
| :---: | :--- |
| <img src="/icons/Star20Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0; "> | 添加/取消星标 |
| <img src="/icons/BatterySaver20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> | 记录能量（1-10） |
| <img src="/icons/Emoji24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> | 记录愉悦（1-10） |
| <img src="/icons/CalendarAssistant20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> | 记录打扰（内部/外部） |
| <img src="/icons/CalligraphyPen20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> | 打开书写模板 |

## 状态记录

- **选择任务**：选择 `Activity` / `Todo` / `Schedule` 后，已开启任务会自动选中并激活录入按钮。

### 能量记录

- 点击 <img src="/icons/BatterySaver20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 按钮：
  - 快速录入：`←→` 选择能量值，回车确认。
  - 详细录入：选择能量值，输入描述后确认。
  - 点击内部 <img src="/icons/BatterySaver20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;"> 可查看能量定义。
  <img src="/task-energy.png" alt="Energy Record" width="450">

### 愉悦记录

- 点击 <img src="/icons/Emoji24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 按钮：
  - 快速录入：`←→` 选择愉悦值，回车确认。
  - 详细录入：选择愉悦值，输入描述后确认。
  - 点击内部 <img src="/icons/Beach24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;"> 可查看愉悦定义。
  <img src="/task-happy.png" alt="Happy Record" width="450">

### 打扰记录

- 点击 <img src="/icons/CalendarAssistant20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 按钮，记录内部或外部打扰并可生成 `Activity`。
- 快速录入：`Tab` 切换内部/外部打扰，回车确认。
  <img src="/record.png" alt="Interruption Record" width="450">

## 书写与模板

- **星标**：点击 <img src="/icons/Star20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0; "> / <img src="/icons/Star20Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0; "> 切换星标，用于数据页快速筛选重点任务。

### 书写记录

- 点击文本区进入编辑模式，支持常见 `markdown` 语法。
- 特殊语法：
  - `-[ ]` 在显示模式可直接勾选
  - `== ==` 黄色高亮
  <img src="/task-edting-area.png" alt="Editing Aera" width="450">
- 常用快捷键：
  - `Tab`：缩进（支持多行）
  - `Shift + Tab`：取消缩进（支持多行）
  - `Shift + Alt + ↓`：复制当前行
  - `Alt + ↓/↑`：上下移动当前行

### 书写模板

- **打开模板**：点击 <img src="/icons/CalligraphyPen20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">。
- **创建模板**：点击 `新建`，输入标题与内容后确认。
- **应用模板**：双击左侧模板标题或点击 `复制`。
- **编辑模板**：选中模板后修改标题/内容并确认。
- **删除模板**：选中模板后点击 `删除`。
  <img src="/task-writing-template.png" alt="Writing Template" width="450">

## 时间轴显示

- 能量显示：⚡ + 分数 + 时间
- 愉悦显示：🏵️ + 分数 + 时间
- 内部打扰显示：💭 / `I`
- 外部打扰显示：🗣️ / `E`
- 鼠标悬浮可查看具体记录内容

## 限制与说明

- 任务追踪数据与活动清单数据同步。
- 标签仅显示，无法在 `任务追踪视图` 直接修改，详见 [标签系统](tag.md)。
