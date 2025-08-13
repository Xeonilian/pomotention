# 任务追踪操作说明

## 1 术语及图标

- **任务 `Task`**：指从活动清单中选择执行的具体工作项目，包含以下要素：
  - **任务描述**：详细的任务内容和执行记录
  - **书写模板**：结构化书写的提示
  - **能量记录**：<span style="display:inline-block; background:#ff6b6b; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">🔋</span> 记录执行任务时的精力水平（1-10 分）
  - **愉悦记录**：<span style="display:inline-block; background:#4ecdc4; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">😜</span> 记录执行任务时的愉悦程度（1-10 分）
  - **打扰记录**：记录执行过程中的内部和外部干扰
    - <span style="display:inline-block; background:#666666; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">🌚</span> **内部打扰**：来自个人情绪、想法和感受
    - <span style="display:inline-block; background:#fff; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">🌝</span> **外部打扰**：来自他人信息、电话等

## 2 任务追踪功能

- 记录任务执行过程中的能量变化
- 记录任务执行过程中的愉悦感受
- 记录内部和外部打扰情况
- 支持 Markdown 格式的任务描述
- 时间轴显示所有记录的时间点
- 任务书写模板快速创建

### 2.1 按钮一览表

|                                                            按钮图标                                                            | 功能说明                                         |
| :----------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------- |
| <span style="display:inline-block; background:#ff6b6b; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">🔋</span> | 记录能量：记录当前任务的精力水平（1-10 分）      |
| <span style="display:inline-block; background:#4ecdc4; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">😜</span> | 记录愉悦：记录当前任务的愉悦程度（1-10 分）      |
| <span style="display:inline-block; background:#666666; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">🌚</span> | 记录内部打扰：记录来自个人情绪、想法和感受的干扰 |
| <span style="display:inline-block; background:#999999; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">🌝</span> | 记录外部打扰：记录来自他人信息、电话等的干扰     |

### 2.2 任务记录操作

- **选择任务**：从活动清单中选择任务，进入任务追踪页面
- **记录能量**：点击 <img src="/icons/BatterySaver20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 按钮，输入当前精力水平（1-10 分）
- **记录愉悦**：点击 <img src="/icons/Emoji24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> 按钮，输入当前愉悦程度（1-10 分）
- **记录打扰**：点击 <img src="/icons/CalendarAssistant20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 按钮，描述内部干扰内容，并可选择生成 `Activity`
- **编辑任务描述**：在文本区域点击切换到编辑模式，鼠标在激活位置闪烁，技术原因仅模糊定位。
- **markdown 识别**：编辑器识别通用 `markdown` 语法，以及：
  - `-[ ]` 显示模式下可直接勾选
  - `== ==` 黄色高亮

### 2.3 时间轴显示

- **能量记录**：显示为 <span style="display:inline-block; background:#ff6b6b; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">🔋</span> 图标，颜色根据分数变化
- **愉悦记录**：显示为 <span style="display:inline-block; background:#4ecdc4; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">😜</span> 图标，颜色根据分数变化
- **内部打扰**：显示为 <span style="display:inline-block; background:#666666; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">🌚</span> 图标
- **外部打扰**：显示为 <span style="display:inline-block; background:#999999; color:#fff; padding:0 8px; border-radius:4px; font-size:90%;">🌝</span> 图标
- **时间显示**：每个记录点显示具体的时间戳
- **记录显示**：鼠标悬浮显示具体的感受记录

### 2.4 书写模板功能

- **打开模板**：点击 <img src="/icons/CalligraphyPen20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> 按钮
- **创建模板**：将当前任务保存为模板，方便重复使用
- **应用模板**：点击模板标题，快速复制模版到剪贴板
- **模板管理**：编辑、删除已保存的任务模板

## 3 重要说明

- 任务追踪数据与活动清单数据同步
- 标签仅显示，无法从 `任务追踪视图` 修改，标签使用说明见 [标签系统](tag.md)
