---
title: 附录：按钮速查表
description: 各区域主要按钮与控件的集中速查；细节仍以对应模块文档为准。
---

# 附录：按钮

本页为**速查表**，与界面一一对应的说明仍以各模块文档为主（见文末链接）。适合已大致了解布局、需要快速确认图标含义时使用。`Activity`、`Todo`、`Task` 等与「活动清单 / ActivitySheet」的区分见 [附录：术语对照](./glossary.md)。

---

## 活动清单工具栏 {#活动清单工具栏}

位于首页**右侧面板**的活动清单顶部工具栏（桌面端；移动端入口可能收纳在 FAB 菜单中）。

|                                                                                    按钮图标                                                                                    | 功能说明                                                                                                                                |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------- |
|   <img src="/icons/ChevronCircleLeft48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">   | 选择活动：将 `Todo` 设为今日待办并跳转到执行日期的计划表                                                                                |
|   <img src="/icons/ChevronCircleDown48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">   | 追踪任务：记录与当前活动相关的 Task                                                                                                     |
|    <img src="/icons/ArrowRepeatAll24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">     | 复制/重复活动，默认不复制标签                                                                                                           |
|        <img src="/icons/Delete24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">         | 删除所选活动                                                                                                                            |
|      <img src="/icons/CalendarAdd24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">      | 添加预约 `Schedule`                                                                                                                     |
|       <img src="/icons/CloudAdd20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">        | 添加无所事事                                                                                                                            |
|       <img src="/icons/AddCircle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">       | 添加 `Todo`；右上角 <img src="/icons/DotMark.svg" width="18" style="display:inline-block;vertical-align:middle;margin:0;"> 打开二级菜单 |
| <img src="/icons/TextGrammarArrowRight24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;"> | 生成子活动（二级菜单）                                                                                                                  |
| <img src="/icons/TextGrammarArrowLeft24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">  | 升级为兄弟（二级菜单）                                                                                                                  |
|        <img src="/icons/LeafTwo24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">        | 切换番茄类型 🍅/🍒/🍇（二级菜单）                                                                                                       |
|  <img src="/icons/DocumentTableSearch24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">  | 筛选预设                                                                                                                                |
|          <img src="/icons/Add16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">          | 看板增加一列                                                                                                                            |
|       <img src="/icons/Subtract16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">        | 删除当前看板列                                                                                                                          |
|          <img src="/icons/Tag16Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">          | 标签编辑器                                                                                                                              |

活动类型图标、状态配色与拖拽等说明见 [活动清单](../reference/activity.md)。

---

## 常用按钮

|                                                                              按钮图标                                                                               | 功能说明                           |
| :-----------------------------------------------------------------------------------------------------------------------------------------------------------------: | :--------------------------------- |
|  <img src="/icons/Backpack24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">  | 切换到工作时间表                   |
|   <img src="/icons/Beach24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(193, 226, 255);border-radius: 6px;">    | 切换到娱乐时间表                   |
|  <img src="/icons/Settings24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">  | 进入/退出编辑模式                  |
| <img src="/icons/ArrowReset48Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;"> | 重置为默认时间表                   |
|      <img src="/icons/AddCircle24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:#d9fccc;border-radius: 10px;">       | 末尾增加 2h 时间块（上限 `24:00`） |
|        <img src="/icons/Delete24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:#f8b3a7;border-radius: 10px;">        | 删除末尾时间块                     |

## 番茄钟主要控件 {#番茄钟}

番茄钟为**悬浮层**，可拖动位置；也可切换迷你置顶模式。控件标签以界面英文为准。

| 控件 / 区域                                                                                                                                                          | 作用                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `Wind up`                                                                                                                                                            | 单次模式下开始一个标准工作周期                   |
| `Squash`                                                                                                                                                             | 取消当前工作计时                                 |
| `Break`                                                                                                                                                              | 开始休息计时                                     |
| 数字时长区                                                                                                                                                           | 展开并选择休息分钟数                             |
| `Stop`                                                                                                                                                               | 休息中提前结束休息                               |
| 🍅🍕                                                                                                                                                                 | 单次计时 ⟷ 连续计时（Pizza）模式；运行中不可切换 |
| 序列文本框                                                                                                                                                           | 连续模式自定义序列，如 `🍅+05`                   |
| 🔈 / 红点                                                                                                                                                            | 白噪音开关与种类                                 |
| <img src="/icons/Pin24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">（顶栏） | 进入迷你计时模式                                 |
| <img src="/icons/ArrowExpand24Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;">                                                  | 退出迷你模式                                     |
