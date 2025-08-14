# 任务追踪操作说明

## 1 `任务追踪视图`

### 1.1 术语及图标

- **任务 `Task`**：指从活动清单中选择执行的具体工作项目，包含以下要素：
  - **任务描述**：详细的任务内容和执行记录；
  - **书写模板**：结构化书写的提示；
  - **能量记录**：🔋 记录执行任务时的精力水平（1-10 分）；
  - **愉悦记录**：😜 记录执行任务时的愉悦程度（1-10 分）；
  - **打扰记录**：记录执行过程中的内部和外部干扰：
    - **内部打扰** 🌚 ：来自个人情绪、想法和感受等；
    - **外部打扰** 🌝 ：来自他人信息、电话等。

### 1.2 按钮一览表

|                                                                                  按钮图标                                                                                  | 功能说明                                    |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------ |
|   <img src="/icons/BatterySaver20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">    | 记录能量：记录当前任务的精力水平（1-10 分） |
|       <img src="/icons/Emoji24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">       | 记录愉悦：记录当前任务的愉悦程度（1-10 分） |
| <img src="/icons/CalendarAssistant20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> | 记录打扰：记录内部和外部打扰                |
|  <img src="/icons/CalligraphyPen20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">   | 书写模板：保存调用书写模板                  |

### 1.3 时间轴显示

- **能量记录**：显示为 🔋 图标，数字，颜色根据分数变化，记录时间；
- **愉悦记录**：显示为 😜 图标，数字，颜色根据分数变化，记录时间；
- **内部打扰**：显示为 🌚 图标，I，记录时间；
- **外部打扰**：显示为 🌝 图标，E，记录时间；
- **记录内容**：鼠标悬浮显示具体的感受记录。

## 2 任务追踪功能

- 记录任务执行过程中的能量变化
- 记录任务执行过程中的愉悦感受
- 记录内部和外部打扰情况
- 支持 Markdown 格式的任务描述
- 时间轴显示所有记录的时间点
- 任务书写模板快速创建

### 2.1 状态及打扰记录

- **选择任务**：从活动清单中选择任务，进入任务追踪页面
- **记录能量**：点击 <img src="/icons/BatterySaver20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 按钮，输入当前精力水平（1-10 分）
  <img src="/energy.png" alt="Energy Record" width="450">
- **记录愉悦**：点击 <img src="/icons/Emoji24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 按钮，输入当前愉悦程度（1-10 分）
  <img src="/happy.png" alt="Happy Record" width="450">
- **记录打扰**：点击 <img src="/icons/CalendarAssistant20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 按钮，描述内部干扰内容，并可选择生成 `Activity`
  <img src="/record.png" alt="Interruption Record" width="450">

### 2.2 记录与书写模板功能

- **编辑任务描述**：在文本区域点击切换到编辑模式，鼠标在激活位置闪烁，仅能模糊定位。
- **markdown 识别**：编辑器识别通用 `markdown` 语法，以及：
  - `-[ ]` 显示模式下可直接勾选
  - `== ==` 黄色高亮
    <img src="/edting-area.png" alt="Editing Aera" width="450">
- **打开模板**：点击 <img src="/icons/CalligraphyPen20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 按钮
- **创建模板**：点击`新建`，然后输入标题与内容，然后点击`确认`。
- **应用模板**：双击`左侧模板标题`或点击`复制`，快速复制模版到剪贴板。
- **编辑模版**：选择`左侧模板标题`，然后编辑左侧标题与内容，再点击`确认`。
- **删除模版**：选择`左侧模板标题`，再点击`删除`。
  <img src="/writing-template.png" alt="Writing Template" width="450">

## 3 重要说明

- 任务追踪数据与活动清单数据同步
- 标签仅显示，无法从 `任务追踪视图` 修改，标签使用说明见 [标签系统](tag.md)
