---
description: 下载最新版本的应用程序
---

# 快速开始

获取最新版本，体验完整功能，
**关于 AI**： 由于没有想好合适的 API 发放机制，暂时不可用，下一步将优先开发 Dashboard，让历史数据可视化，然后发酵 AI 部分
如果你想[支持 AI 模块开发](https://docs.qq.com/form/page/DZWtGeVpKUkNuQnVL)

## 当前版本

::: info 最新发布
**版本 v0.4.3** - 2025 年 10 月 13 日发布

- **新增**

  - **标签筛选系统**：现在可以点击标签对左侧列表或右侧内容进行筛选，支持多个标签叠加筛选（与逻辑），并可一键清除。
  - **搜索结果标星**：在搜索结果的内容区，可以直接为条目添加或取消星标，状态会与左侧列表实时同步。
  - **搜索结果管理**：新增“一键关闭全部”功能，方便快速清空搜索结果。
  - **编辑标签**：新增搜索页面 Activity 添加删除标签。
  - **编辑标星**：新增搜索页面 Task 标星。

- **优化**

  - **UI 界面重构**：
    - 重构了任务（Task）的书写模版 UI。
    - 优化了 Planner 中任务优先级的数字显示样式。
  - **代码结构优化**：
    - 将活动（Activity）中的标签拖拽功能重构为可复用的 Composable (`useTagDrag`)，提升了代码的模块化和可维护性。
  - **性能与逻辑**：
    - 优化了任务内容（Task-Content）的获取算法，使其更加精准。
    - 统一了任务（Task）的数据来源 Activity，修正了因此产生的 Tab 计算错误。

- **修复**
  - 修复了因任务数据被存储两次，导致修改后无法正确提取的 Bug。
  - 修复了在 Mac 设备上 Emoji 跑马灯显示不正常的问题（通过增加空格）。
  - 修复了时间表（Timetable）中会错误地包含已取消（Cancelled）日程和待办的问题。

:::

- [更新日志](dev-log/CHANGELOG.md)

## 系统要求

### Windows

- Windows 10 或更高版本
- 64 位系统

### macOS

- macOS 13.0 (Ventura) 或更高版本
- webkit 支持不完全导致 macOS 12.0 可安装，部分渲染失败
- Intel 或 Apple Silicon 处理器

## 下载链接

- Windows

  - [.msi 安装包](https://github.com/Xeonilian/pomotention/releases/download/v0.4.2/pomotention_0.4.2_x64_en-US.msi)
  - [.exe](https://github.com/Xeonilian/pomotention/releases/download/v0.4.2/pomotention_0.4.2_x64-setup.exe)

- macOS
  - [.dmg 安装包](https://github.com/Xeonilian/pomotention/releases/download/v0.4.2/pomotention_0.4.2_x64.dmg)
  - [app.tar.gz](https://github.com/Xeonilian/pomotention/releases/download/v0.4.2/pomotention.app.tar.gz)

## 安装指南

### Windows 安装

1. 下载 `.msi` 安装包
2. 双击运行安装程序
3. 按照向导完成安装
4. 从开始菜单启动应用

### macOS 安装

1. 下载 `.dmg` 文件
2. 双击打开磁盘映像
3. 将应用拖拽到 Applications 文件夹
4. 从 Launchpad 或 Applications 启动

::: warning 安全设置

- macOS 首次运行时，需要在"系统偏好设置 > 安全性与隐私"中允许应用运行
- Windows 安装时，可能会出现安全警告，请选择“运行”或“更多信息”->“仍然运行”

:::

## 自动更新

- 软件提供自动更新检测，由于网络原因可能下载失败
- 软件帮助页面：
  - 比较本地和云端版本
  - 打开和关闭自动更新
  - 点击下载最新版本，进入最新版本页面
    ![更新页](public/update-page.png)

## 遇到问题

如果下载或安装过程中遇到问题：

1. **下载失败**：请检查网络连接，或尝试使用下载工具
2. **安装报错**：确认系统版本符合要求，windows7 暂不支持
3. **安装中断**：从`任务管理器`关闭进程后重试安装
