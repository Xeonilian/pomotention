---
title: 桌面客户端安装
description: Tauri 安装包、系统要求、版本说明与安装 / 更新类排错；浏览器使用见《快速安装》与《快速使用》。
---

# 桌面客户端安装

::: tip

- 软件同时支持 [PWA快速安装](./pwa-getting-started.md)。
  :::

## 当前版本

::: info 最新发布
**版本 v0.6.4** · 2026 年 4 月 2 日
:::

- [完整更新日志](../../dev-log/CHANGELOG.md)

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
  - [v0.6.4 .msi 安装包](https://github.com/Xeonilian/pomotention/releases/download/v0.6.4/Pomotention_0.6.4_x64_en-US.msi)

- macOS
  - [v0.6.4 .dmg 安装包](https://github.com/Xeonilian/pomotention/releases/download/v0.6.4/Pomotention_0.6.4_x64.dmg)

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
- Windows 下载或安装时，若出现安全警告（如“阻止下载”或“Windows 已保护您的电脑”），请点击“仍要保留”/“更多信息”→“仍要运行”，以继续下载和安装。

:::

## 自动更新

- 软件提供自动更新检测，由于网络原因可能下载失败。

- 切换更新状态：`帮助页`面提供
  - 比较本地和云端版本
  - 打开和关闭自动更新

-

## 遇到问题

### 下载与安装

1. **下载失败**：先检查网络连接，或改用下载工具。若怀疑同步或首次启动拉取失败，可稍后再试（参见更新日志中初始化顺序与同步相关修复）。`设置页`里可对当前网络环境做连通性测试。
2. **安装报错**：确认系统版本符合要求；**Windows 7** 暂不支持。
3. **安装中断**：在 **Windows** 上可从任务管理器结束相关进程后重试安装。

### 白屏、一直加载

1. **清除本地数据或重装**：需要时可到 `设置页` 中执行本地数据清除后再安装/启动。如果只在本地使用，**清除前请先导出或备份**本地数据，以免丢失。

2. 与 **浏览器缓存、网络首次拉取** 相关的问题，可先 **强制刷新**（Windows / Linux：`Ctrl + Shift + R`；macOS：`⌘ + Shift + R`）

## 数据与同步

::: tip

- 仅桌面客户端提供数据导出功能
- 同一台设备上升级安装新版本时，默认沿用已有本地数据；仅当您主动清除本地数据时才会丢失
- 登录账号后，可在多端之间同步数据
  :::

### 账号注册与云端同步

- 点击登录按钮<img src="/icons/Person20Filled.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">，按界面指引进入注册流程
- 使用邮箱完成注册后，登录即可开始与云端同步
- 若本地存在尚未上传至云端的数据，将与云端数据合并
- 登录状态会保持，直至您主动退出登录

### 离线使用

- 未登录时默认为离线模式，功能均可正常使用
- 已登录后若仅需本地、不再使用云端同步：点击账号区域 **退出登录** <img src="/icons/Person20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;border-radius: 6px;">，在 **「退出登录时是否保留本地数据？」** 中选择 **保留**

### 数据导出

#### 旧版客户端（v0.4.4）

- 在 **v0.4.4** 中打开 **帮助页**，通过 **数据同步** 执行**全量数据导出**
- 导出的 JSON 可用于迁移至当前版本客户端

#### 当前版本（v0.6.4 及以上）

- 点击 **数据按钮**，打开数据库导入/导出对话框，按需导出并保存 JSON 文件
- 导出文件请自行妥善保管

### 数据导入

- 点击数据按钮<img src="/icons/DatabasePerson20Regular.svg" width="20" style="display:inline-block;vertical-align:middle;margin:0;background:rgb(224, 224, 224);border-radius: 6px;">，进入导入流程
- 按引导预览数据并选择覆盖策略
- 导入完成后将自动登出；请在确认合并结果无误后，再登录以恢复云端同步
- 若导入结果不符合预期，可再次打开 **数据库导入导出** 对话框，点击 **恢复导入前状态**（在提供该按钮时可用）

### 切换登录账号

- 当本次登录的账号与**上一次在本机登录的账号不一致**时，客户端会清空本地业务数据并改为载入新账号的同步数据，避免多账号数据混用
- 更换账号前请先按需**导出备份**
