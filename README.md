# Pomotention - 番茄意图

🍅 **基于番茄工作法的深度专注与效率管理系统**

一个集成了完整番茄工作法理念的桌面应用，不仅仅是简单的计时器，而是帮助用户建立高效工作习惯的综合工具。

## 🎯 核心理念

**Pomotention** = **Pomodoro** + **Intention**，强调在番茄工作法的基础上加入"意图"管理，让每个番茄周期都有明确的目标和反思。

## 🚀 番茄工作法六大核心目标

- Objective I: Find Out How Much Effort an Activity Requires
  > 利用番茄钟来准确测量和了解各类任务的真实耗时
- Objective II: Cut Down on Interruptions
  > 识别、标记内外打扰事件，并建立有效的处理机制
- Objective III: Estimate the Effort for Activities
  > 事先估计任务耗时，通过对比实际执行情况提升预估准确性
- Objective IV: Make the Pomodoro More Effective
  > 在番茄周期内引入目标回忆机制，将多个番茄组织成有机整体
- Objective V: Set Up a Timetable
  > 将一天规划为多组番茄，实现时间的精细化管理
- Objective VI: Leverage AI and Tools for Efficient Activity Tracking and Goal Management
  > 利用数据记录和分析工具，优化任务执行和目标管理

## 🔧 功能模块

### 📅 **日程管理模块 (Daily Schedule Module)**

- ✅ 创建和保存日程模板
- ✅ 应用日程模板到具体日期
- ✅ 智能计算可用番茄时间块

### 📋 **活动管理模块 (Activity Management Module)**

- ✅ 创建、编辑、删除活动
- ✅ 设置活动重复周期
- ✅ 项目关联和标签筛选
- ✅ 支持特殊类型活动（如"无所事事"）

### 📝 **今日待办模块 (Today's Todo Module)**

- ✅ 自动提取当日计划活动
- ✅ 任务分配和调度
- ✅ 未完成任务流转机制

### ⏰ **番茄时钟模块 (Pomodoro Timer Module)**

- ✅ 完整的计时控制（开始/暂停/停止）
- ✅ 自动保存计时记录
- 🚧 自定义专注/休息循环
- 🚧 关键时间点提示音（2 分钟/12 分钟/23 分钟）

### 📊 **执行管理模块 (Task Execution Module)**

- ✅ 预估 vs 实际执行误差追踪
- 🚧 打扰事件记录系统
- 🚧 精力值记录和分析

### ✍️ **表达书写模块 (Expressive Writing Module)**

- 🚧 任务关联的反思记录功能

### 📈 **可视化模块 (Data Visualization Module)**

- ✅ 时间轴和任务分布展示
- ✅ 番茄累计统计
- 🚧 打扰记录可视化
- 🚧 历史数据浏览

## 🎓 相关服务

本项目基于以下专业课程和服务：

- **[拖延深度改善两阶段课程](https://ebp.gesedna.com/product/delay_multi/?rd=%2F)** - 系统性解决拖延问题
- **[番茄列车](https://ebp.gesedna.com/pa-group-info-pomo/?rd=%2FEBPTsundoku%2F%3Frd%3D%2F)** - 社群化专注实践
- **[番茄工作法官方理念](https://www.pomodorotechnique.com/)**，计时器设计和核心逻辑均基于官方标准实现。

## 🛠️ 技术栈

- **前端**: Vue.js + TypeScript
- **UI 组件**: Naive UI + Xicons
- **后端**: Tauri (Rust)
- **跨平台**: Windows / macOS [马上] / Linux [马上上]

## 📦 安装和使用

- 克隆项目 `git clone https://github.com/Xeonilian/pomotention.git`

## 数据说明

- 历史记录安全存储在你的电脑中，卸载应用不会删除数据
- 数据位置：%LOCALAPPDATA%\com.pomotention.app\EBWebView\Default\Local Storage\leveldb
- 数据以加密格式存储，不是普通文本文件
- 后续版本将提供数据导出功能，方便您备份和迁移数据
