---
description: 下载最新版本的应用程序
---

# 快速开始

获取最新版本，体验完整功能，
[支持 AI 模块开发](https://docs.qq.com/form/page/DZWtGeVpKUkNuQnVL)

## 当前版本

::: info 最新发布
**版本 v0.4.2** - 2025 年 9 月 30 日发布

- **AI 对话功能初版发布**🎉

  - 新功能基于 Kimi API，内置了 免费试用额度。当额度耗尽后，AI 功能将暂时不可用。
  - 试试对它说「计划」，可体验引导式思考与行动规划。
  - 对话过长时（>8k 上下文），会自动清空并保留历史在剪贴板中，方便您继续对话。
  - 喜欢此功能？欢迎来 [支持项目](https://docs.qq.com/form/page/DZWtGeVpKUkNuQnVL)💸，你将获得更长的 API 使用许可与新功能投票权。

- **功能与优化**

  - 任务搜索功能及全新 UI。
  - Planner 计划模块新增跑马灯与自定义提示。
  - 任务追踪 (Track) 支持加星标。
  - 重构了核心数据管理模式，实现数据集中管理。
  - 重构了多个核心模块（Planner/Task/Timetable），提升了可维护性。
  - 统一并调整了多个 UI 界面，优化了布局与配色。
  - 提升了应用状态的记忆能力。

- **修复**

  - 修正了同步时出现的 emoji 格式错误。
  - 修正了计时器进度条长度不足的问题。

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
