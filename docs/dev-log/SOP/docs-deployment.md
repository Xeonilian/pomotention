# 帮助文档部署流程

## 概述

帮助文档使用 VitePress 构建，部署到 Cloudflare Pages。每次推送到 GitHub 仓库的 `main` 分支时，Cloudflare Pages 会自动检测并部署更新。

**重要说明**：

- **网页版**：直接使用 Cloudflare Pages 在线文档（始终最新）
- **桌面版（Tauri）**：也使用 Cloudflare Pages 在线文档（打包时的版本，后续可优化为静态打包）
- **版本信息**：直接写在页面上，不需要动态获取

## 文档结构

- **文档目录**：`docs/`
- **配置文件**：`docs/.vitepress/config.mts`
- **构建输出**：`docs/.vitepress/dist/`
- **访问地址**：https://pomotention.pages.dev/help

## 本地开发

### 安装依赖

```bash
cd docs
pnpm install
```

### 启动开发服务器

```bash
pnpm docs:dev
```

开发服务器会在 `http://localhost:5173` 启动，支持热重载。

### 预览构建结果

```bash
pnpm docs:build
pnpm docs:preview
```

这会先构建文档，然后在本地预览构建后的静态文件。

## 部署流程

### 自动部署（推荐）

1. **编辑文档**

   - 在 `docs/` 目录下编辑或创建 Markdown 文件
   - 如需修改配置，编辑 `docs/.vitepress/config.mts`

2. **提交并推送**

   ```bash
   git add docs/
   git commit -m "docs: 更新帮助文档"
   git push origin main
   ```

3. **自动部署**
   - Cloudflare Pages 会自动检测到 push 事件
   - 自动执行构建：`cd docs && pnpm install && pnpm docs:build`
   - 自动部署构建产物到 `docs/.vitepress/dist/`
   - 部署完成后，访问 https://pomotention.pages.dev/help 查看更新

### Cloudflare Pages 配置

在 Cloudflare Dashboard 中的配置：

- **构建命令**：`cd docs && pnpm install && pnpm docs:build`
- **构建输出目录**：`docs/.vitepress/dist`
- **根目录**：`/` (项目根目录)
- **Node 版本**：20
- **自动部署触发**：推送到 `main` 分支

## 在应用中的使用

### 网页版

- 使用 iframe 直接嵌入 Cloudflare Pages 文档
- 用户无需离开应用即可查看帮助
- 显示的是最新版本的文档

### 桌面版（Tauri）

- 同样使用 iframe 嵌入 Cloudflare Pages 文档
- 顶部显示当前应用版本号（从 `package.json` 读取）
- 提供"下载更新"下拉菜单，支持多个下载源：
  - GitHub Releases（默认）
  - 码云 Gitee（备用，适合无法访问 GitHub 的用户）
  - 可继续添加其他下载源
- 提供"查看源码"按钮链接到 GitHub 仓库

## 注意事项

1. **路径配置**：确保 `docs/.vitepress/config.mts` 中的 `base` 配置正确

   - 当前配置：`base: "/pomotention/"`（如果需要子路径）
   - 如果使用独立域名，应设置为 `base: "/"`

2. **链接更新**：应用中的帮助文档链接

   - 位置：`src/views/HelpView.vue`
   - 当前地址：`https://pomotention.pages.dev/help`
   - 网页版和桌面版使用相同的在线地址

3. **版本信息**：

   - 不再动态获取版本号，直接从 `package.json` 读取
   - 桌面版会在帮助页面顶部显示当前应用版本
   - 版本号同步位置：`package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`

4. **下载源管理**：

   - 在 `src/views/HelpView.vue` 中的 `downloadOptions` 配置下载源
   - 目前支持：GitHub Releases、码云 Gitee
   - 添加新下载源只需在配置数组中添加新项

5. **CI 检查**：GitHub Actions 会检查文档质量
   - Markdown 语法检查
   - 死链接检测
   - 配置文件：`.github/workflows/docs-ci.yml`

## 故障排查

### 部署失败

1. 检查 Cloudflare Dashboard 中的构建日志
2. 确认构建命令和输出目录配置正确
3. 检查 `docs/package.json` 中的依赖是否完整

### 本地构建失败

1. 确认 Node.js 版本为 20
2. 清理并重新安装依赖：
   ```bash
   cd docs
   rm -rf node_modules
   pnpm install
   ```

### 文档未更新

1. 确认代码已推送到 `main` 分支
2. 检查 Cloudflare Dashboard 中的部署状态
3. 清除浏览器缓存后刷新页面

## 发布流程总结

### 1. 更新文档内容

编辑 `docs/` 目录下的 Markdown 文件。

### 2. 提交并推送

```bash
git add docs/
git commit -m "docs: 更新帮助文档内容"
git push origin main
```

### 3. 自动部署

Cloudflare Pages 会自动检测并部署更新，通常 1-2 分钟内完成。

### 4. 更新应用版本（如需要）

如果同时发布新版本的应用：

1. 更新版本号：

   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`

2. 构建并发布应用：

   - 参考 `docs/dev-log/SOP/release.md`

3. 上传到多个平台：
   - GitHub Releases（必需）
   - 码云 Gitee（可选，适合国内用户）

## 相关文件

- `docs/package.json` - 文档项目的依赖和脚本
- `docs/.vitepress/config.mts` - VitePress 配置文件
- `src/views/HelpView.vue` - 应用中的帮助页面组件（已重构，移除动态版本检查）
- `.github/workflows/docs-ci.yml` - 文档 CI 检查工作流
- `docs/dev-log/SOP/release.md` - 应用发布流程
