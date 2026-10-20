# 生活记录使用方法

::: tip

- 生活记录用来顺手记下 **喝水、吃饭、活动、睡觉**。
- 日视图写明细；周 / 月 / 年打开图层看趋势。
  :::

## 快速导航

- 我想找入口：见 [入口与按钮](#入口与按钮)
- 我想知道记什么：见 [四类记录](#四类记录)
- 我想在某一天录入：见 [日视图录入](#日视图录入)
- 我想看一周 / 一月 / 一年：见 [周月年可视化](#周月年可视化)
- 我想在手机上预览：见 [手机预览](#手机预览)
- 我想确认边界：见 [限制与说明](#限制与说明)

## 入口与按钮

入口在计划表顶栏，和 [收支账本](ledger.md) 的钱包按钮同一排。图标文件名与软件内 Fluent 组件同名。

|                                                         按钮图标                                                         | 功能说明                         |
| :----------------------------------------------------------------------------------------------------------------------: | :------------------------------- |
|    <img src="/icons/AppsAddIn20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 日视图、当天还没有记录：打开录入 |
|    <img src="/icons/ChannelAdd20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">    | 日视图、当天已有记录：打开录入   |
|   <img src="/icons/TableSimple20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">    | 切到表模式                       |
|     <img src="/icons/DataPie20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">      | 切到图模式                       |
|     <img src="/icons/Dismiss20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">      | 关闭录入表单                     |
|       <img src="/icons/Add20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">        | 表头：加一行                     |
|      <img src="/icons/Delete20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">      | 表内：删除这一条                 |
|       <img src="/icons/Play20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">       | 活动 / 睡觉：开始（当前时间）    |
|    <img src="/icons/RecordStop20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">    | 活动 / 睡觉：结束（当前时间）    |
|   <img src="/icons/BatterySaver20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">   | 精力值                           |
|     <img src="/icons/Storage24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">      | 饥饿感                           |
|     <img src="/icons/Savings20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">      | 饱足感                           |
|    <img src="/icons/DrinkBeer20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 饮品                             |
|    <img src="/icons/DrinkToGo24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 水                               |
|   <img src="/icons/DrinkCoffee20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">    | 咖啡                             |
|    <img src="/icons/DrinkWine20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 酒                               |
|    <img src="/icons/FoodPizza20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 正餐                             |
|     <img src="/icons/FoodCake20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 甜点                             |
|    <img src="/icons/FoodApple20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 水果                             |
| <img src="/icons/BriefcaseMedical20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 补剂                             |

- **日视图**：点顶栏打开录入（无记录是加号宫格，有记录是频道加号）。关掉用表单上的关闭，不是再点顶栏。手机进入日视图会默认打开图。
- **选中待办或预约**：任务区改回任务预览；再点顶栏会清掉选中并回到生活记录。

- 从周 / 月 / 年点某天的 **日期数字**：打开该日的表预览。电脑上 **双击** 日期、手机上 **连点两下** 日期，进入该日的日视图。

## 四类记录

界面上的「活动」是出门办事、如厕一类的时间段，图标是门，不是活动清单里的 Activity。

| 类   |                                                       大图标                                                       | 记什么                                                                                                         |
| ---- | :----------------------------------------------------------------------------------------------------------------: | -------------------------------------------------------------------------------------------------------------- |
| 喝水 |    <img src="/icons/Drop20Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 每一口的时间和毫升。点大水滴按当前杯量加一口（默认水）；点四种杯子改种类。种类不写进备注。当日目标可在图上改。 |
| 吃饭 |  <img src="/icons/FoodApple20Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">  | 时间、正餐 / 甜点 / 水果 / 补剂、饥饿感 / 饱足感（1–10）、吃了什么。点大苹果加一条；点四种食物图标切换类型。   |
| 活动 |    <img src="/icons/Door20Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">     | 开始、结束、精力（1–10）、去干嘛。点门开一段；未结束时点结束记下当前时间。点精力图标打分。                     |
| 睡觉 | <img src="/icons/WeatherMoon20Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;"> | 入睡、醒来、精力（1–10）、梦什么。点月亮开一段；未醒时点结束记下醒来。点精力图标打分。                         |

喝水默认杯量 **250 ml**（可改 50–1000），默认日目标 **2000 ml**。改杯量只影响之后新加的一口，已经记下的量不会跟着变。

## 日视图录入

电脑是 **2×2**，手机是上下一列。顶栏饼图 / 表格按钮一次切换四类的图或表。看 **今天** 默认图，看 **过去的一天** 默认表；两种情况下计划表都还在上面。

### 图

- 点该类的大图标加一条（喝水 = 加一口；吃饭 = 加一餐；活动 / 睡觉 = 开一段）。
- 只编辑 **最后一条**：时间、类型、备注、结束。更早的条目请切到表。
- 没有记录时，吃饭不会露出第二行编辑区。
- 活动 / 睡觉若上一段还没结束，再点大图标会问「上次结束了吗？」
- 睡觉可以跨午夜：昨晚没醒的一段，会继续出现在今天。

### 表

- 列出当天该类全部记录，可改时间、量、类型、备注。
- 表头加号增行，行内删除。
- 活动 / 睡觉表里可以点表头时钟，把开始或结束填成当前时间。

## 周月年可视化

打开图层后：

- **周**：每天一列。喝水是水位波浪；吃饭、活动、精力按位置排开；睡觉是夜间色带，月亮标在醒来。精力用和时间表同一套天气 emoji。电脑上悬停看完整信息（时刻、种类、分数、备注），手机上点标记看。
- **月**：每天四根竖条，从左到右是喝水、吃饭、活动、睡觉。喝水按 **2 L** 一杯的高度画（超过就加杯）；活动条默认按 **2 小时** 满格，当天更长时按向下取整的小时数放大。睡觉条下的时刻是**当天最长那一觉的入睡点**（跨夜只写入睡那天；夜班白天睡也写在入睡那天）。没有记录的格子不画条。单击一类竖条，整月只看该类；再点一次取消。
- **年**：当天有任一类生活记录，日期会着色。

图层开着时，时间表上的普通块会隐藏，改显示这些生活标记。关掉图层即恢复。

## 手机预览

在周 / 月 / 年打开生活图层时：

- 时间表和任务追踪区域会先藏起来，方便看计划表；关掉图层后还原。
- 顶栏里用来显示 / 隐藏这两块的按钮会跟着变成「当前看不见」的样子。再点它们：先退出预览，再打开对应区域。

## 限制与说明

- 生活记录 **不是** 活动清单里的待办 / 预约，也不会出现在标签选择器里。系统会为每天四类各准备一条任务行，记录写在这些行上。
- 系统标签（喝水 / 吃饭 / 活动 / 睡觉）不参与年视图事项圆点取色，也不进 [标签系统](tag.md) 的选择器和管理面板。跨日的活动 / 睡觉，时长记在开始那天。
- 云同步走任务字段，登录后与其它任务一起上传下载。本地备份 JSON 里同样在对应 `task` 上。
- 本软件不是医疗或营养日记：没有配餐库、没有睡眠分期，目标是在计划表旁边留下身体节律的痕迹。
