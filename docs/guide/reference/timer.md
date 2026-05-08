# 番茄时钟使用说明

::: tip
与其他区域的协作关系见 [模块联动](./workflow.md)。
:::

## 快速导航

- 我想用单次计时：见 [单次计时模式](#单次计时模式-pomodoro-mode)
- 我想配置连续序列：见 [连续计时模式](#连续计时模式-pizza-mode)
- 我想使用简洁悬浮窗口：见 [迷你计时器模式](#迷你计时器模式-on-top-mode)
- 我想看限制条件：见 [限制与说明](#限制与说明)

## 单次计时模式 (Pomodoro Mode)

适用于单次专注或单次休息。  
<img src="/pomodoro-mode.png" alt="Pomodoro Mode" width="200">

- **开始工作**：点击 `Wind up` 启动工作周期。
- **取消工作**：点击 `Squash` 终止当前工作计时。
- **开始休息**：点击 `Break` 启动休息计时。
- **结束休息**：点击 `Stop` 可提前结束休息。
- **调整休息时长**：支持 `02` / `05` / `10` / `15` / `30` / `60` 分钟。

### 声音提示节奏（25 分钟示例）

- 工作开始提示；
- `Review` 阶段（2 分钟）提示；
- 两段 `Work` 阶段（各约 10.5 分钟）提示；
- `Review` 阶段（1 分钟）提示；
- `Track` 阶段（1 分钟）无声音提示；
- 周期结束提示。

### 休息提示

- 开始；
- 1/5；
- 2/5；
- 3/5；
- 结束。

## 连续计时模式 (Pizza Mode)

适用于多个工作/休息周期连续执行。  
<img src="/pizza-mode.png" alt="Pizza Mode" width="200">

- **模式切换**：点击 🍅🍕 切换单次/连续模式；运行中不可切换。
- **自定义序列**：在输入框中填写序列指令：
  - `🍅+05`：一个工作周期后自动休息 5 分钟。
  - `05+05`：连续两个 5 分钟休息段。
- **修改默认工作时长**：通过 `🍅=25min` 调整，支持 `15min` 到 `59min`。
- **白噪音**：点击 🔈 开关背景音，点击红点切换滴答/雨声。

## 迷你计时器模式 (On top Mode)

为低干扰专注场景设计：

1. 点击菜单栏 <img src="/icons/Pin24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px"> 进入置顶迷你模式。
2. 点击计时器界面 <img src="/icons/ArrowExpand24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> 退出迷你模式。
3. 支持多实例同时运行，并可分别设置是否迷你显示。
4. macOS 可结合 Sidecar 将迷你计时器放到 iPad 等扩展屏。

## 限制与说明

- 计时运行时不能切换 `单次/连续` 模式。
- 某些平台可能偶发窗口尺寸计算异常，重新进入迷你模式可触发自动修正。
