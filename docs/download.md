---
title: 下载
description: 下载最新版本的应用程序
---

# 下载应用

获取最新版本，体验完整功能。

## 当前版本

::: info 最新发布
**版本 v0.2.3** - 2025 年 6 月 20 日发布

- 支持自动更新
- UI Bug 修复
  :::

## 系统要求

### Windows

- Windows 10 或更高版本
- 64 位系统

### macOS

- macOS 10.13 (High Sierra) 或更高版本
- Intel 或 Apple Silicon 处理器

## 下载链接

<div class="download-section">

### Windows

<a href="#" class="download-btn windows">
  <span class="platform">Windows</span>
  <span class="format">.msi 安装包</span>
  <span class="size">~50MB</span>
</a>

### macOS

<a href="#" class="download-btn macos">
  <span class="platform">macOS</span>
  <span class="format">.dmg 磁盘映像</span>
  <span class="size">~45MB</span>
</a>

</div>

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

::: warning macOS 安全设置
首次运行时，可能需要在"系统偏好设置 > 安全性与隐私"中允许应用运行。
:::

## 版本历史

- v0.1.0 `2025-06-09`

  - 首个正式版本发布 #window 🎉

- v0.2.0 `2025-06-10`

  - 🔧 Beta 测试版本
  - 🚀 性能优化
  - 🎨 界面改进

## 遇到问题？

如果下载或安装过程中遇到问题：

1. **下载失败**：请检查网络连接，或尝试使用下载工具
2. **安装报错**：确认系统版本符合要求

需要帮助请访问 [常见问题](/faq) 或 [联系我们](/contact)。

<style>
.download-section {
  display: grid;
  gap: 1rem;
  margin: 2rem 0;
}

.download-btn {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  border: 2px solid var(--vp-c-border);
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.3s ease;
  background: var(--vp-c-bg-soft);
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
