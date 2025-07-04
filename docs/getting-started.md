---
title: 快速开始
description: 下载最新版本的应用程序
---

# 快速开始

获取最新版本，体验完整功能。

## 当前版本

::: info 最新发布
**版本 v0.2.6** - 2025 年 7 月 4 日发布

- 功能稳定测试
- 支持 Windows macOS （ dmg + App + msi + exe）
- 简易全局搜索
- 番茄钟最小化置顶
- 自动更新
  :::

## 系统要求

### Windows

- Windows 10 或更高版本
- 64 位系统

### macOS

- macOS 10.13 (High Sierra) 或更高版本
- Intel 或 Apple Silicon 处理器

## 下载链接

### Windows

<a href="https://github.com/Xeonilian/pomotention/releases/download/v0.2.6/pomotention_0.2.6_x64_en-US.msi" class="download-btn windows">
  <span class="platform">Windows</span>
  <span class="format">.msi 安装包</span>
  <span class="size">15.7MB</span>
</a>

<a href="https://github.com/Xeonilian/pomotention/releases/download/v0.2.6/pomotention_0.2.6_x64-setup.exe" class="download-btn windows">
  <span class="platform">Windows</span>
  <span class="format">.exe </span>
  <span class="size">14.5MB</span>
</a>

### macOS

<a href="https://github.com/Xeonilian/pomotention/releases/download/v0.2.6/pomotention_0.2.6_x64.dmg" class="download-btn macos">
  <span class="platform">macOS</span>
  <span class="format">.dmg 安装包</span>
  <span class="size">18.5MB</span>
</a>

<a href="https://github.com/Xeonilian/pomotention/releases/download/v0.2.6/pomotention.app.tar.gz" class="download-btn macos">
  <span class="platform">macOS</span>
  <span class="format">app.tar.gz</span>
  <span class="size">17.1MB</span>
</a>

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
    ![更新页](更新页.png)

## 版本历史

- v0.1.0 `2025-06-09`

  - 🎉 首个正式版本发布 #window

- v0.2.0 `2025-06-10`

  - 🎉 首个 macOS 版本发布 #macOS

- v0.2.6 `2025-07-04`
  - 测试稳定版本 #macOS #window
  - 支持缩小置顶
  - 优化 UI
  - 优化互动

## 遇到问题

如果下载或安装过程中遇到问题：

1. **下载失败**：请检查网络连接，或尝试使用下载工具
2. **安装报错**：确认系统版本符合要求，windows7 暂不支持

<style>

.download-btn {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border: 2px solid var(--vp-c-border);
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.3s ease;
  background: var(--vp-c-bg-soft);
  margin-bottom: 10px;
}

.download-btn:hover {
  border-color: var(--vp-c-brand);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.download-btn .platform {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 0.5rem;
}

.download-btn .format {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

.download-btn .size {
  color: var(--vp-c-text-3);
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.windows:hover { border-color: #0078d4; }
.macos:hover { border-color: #007aff; }
.linux:hover { border-color: #ff6b35; }
</style>
