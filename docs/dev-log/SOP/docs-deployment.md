# 帮助文档部署流程

## 概述

帮助文档使用 VitePress 构建，支持三路部署方案：

1. **GitHub Pages**：部署到 `gh-pages` 分支，base: `/pomotention/`
2. **Cloudflare Pages**：部署到 `pomotention.pages.dev/help`，base: `/help`
3. **本地 APP**：Tauri 应用内嵌文档，使用相对路径 base: `/`

每次推送到 GitHub 仓库的 `main` 分支时，GitHub Pages 和 Cloudflare Pages 会自动检测并部署更新。

**重要说明**：

- **网页版**：优先使用 Cloudflare Pages 在线文档（始终最新）
- **桌面版（Tauri）**：优先使用本地打包的文档（离线可用），fallback 到在线版本
- **版本信息**：直接写在页面上，不需要动态获取

## 文档结构

- **文档目录**：`docs/`
- **配置文件**：`docs/.vitepress/config.mts`
- **构建输出**：`docs/.vitepress/dist/`
- **访问地址**：
  - GitHub Pages: https://xeonilian.github.io/pomotention/
  - Cloudflare Pages: https://pomotention.pages.dev/help/
  - 本地 APP: `./docs/index.html` (相对路径)

## 多环境配置

### VitePress 配置

文档通过环境变量 `VITEPRESS_BASE` 动态设置 base 路径：

```typescript
// docs/.vitepress/config.mts
const base = process.env.VITEPRESS_BASE || "/pomotention/";
```

各环境的 base 配置：
- **GitHub Pages**: `/pomotention/` (默认)
- **Cloudflare Pages**: `/help`
- **本地 APP**: `/` (相对路径)

### 构建脚本

`docs/package.json` 中提供了多个构建脚本：

```json
{
  "scripts": {
    "docs:dev": "vitepress dev",
    "docs:build": "vitepress build",                    // GitHub Pages (base: /pomotention/)
    "docs:build:cloudflare": "vitepress build",         // Cloudflare Pages (base: /help)
    "docs:build:local": "vitepress build",              // 本地 APP (base: /)
    "docs:preview": "vitepress preview",
    "docs:deploy:github": "vitepress build && npx gh-pages -d .vitepress/dist"
  }
}
```

构建命令示例：

```bash
# GitHub Pages (默认)
cd docs && pnpm docs:build

# Cloudflare Pages
cd docs && VITEPRESS_BASE=/help pnpm docs:build:cloudflare

# 本地 APP
cd docs && VITEPRESS_BASE=/ pnpm docs:build:local
```

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
# 预览 GitHub Pages 版本
pnpm docs:build
pnpm docs:preview

# 预览 Cloudflare Pages 版本
VITEPRESS_BASE=/help pnpm docs:build:cloudflare
pnpm docs:preview

# 预览本地 APP 版本
VITEPRESS_BASE=/ pnpm docs:build:local
pnpm docs:preview
```

## 部署流程

### 1. GitHub Pages 部署

**自动部署（推荐）**：

- 推送到 `main` 分支的 `docs/` 目录变更时，GitHub Actions 会自动触发
- 工作流文件：`.github/workflows/docs-deploy.yml`
- 构建命令：`cd docs && pnpm install && pnpm docs:build` (base: `/pomotention/`)
- 自动推送到 `gh-pages` 分支
- 访问地址：https://xeonilian.github.io/pomotention/

**手动部署**：

```bash
cd docs
pnpm docs:deploy:github
```

### 2. Cloudflare Pages 部署

**自动部署（推荐）**：

- 推送到 `main` 分支时，Cloudflare Pages 会自动检测并部署
- 在 Cloudflare Dashboard 中配置：
  - **构建命令**：`cd docs && pnpm install && VITEPRESS_BASE=/help pnpm docs:build:cloudflare`
  - **构建输出目录**：`docs/.vitepress/dist`
  - **根目录**：`/` (项目根目录)
  - **Node 版本**：20
  - **环境变量**：`VITEPRESS_BASE=/help`
  - **自动部署触发**：推送到 `main` 分支
- 访问地址：https://pomotention.pages.dev/help/

**手动部署**：

```bash
cd docs
VITEPRESS_BASE=/help pnpm docs:build:cloudflare
# 然后通过 Cloudflare Dashboard 或 wrangler 手动上传
```

### 3. 本地 APP 内嵌文档

**构建流程**：

1. 在 Tauri 构建前，先构建文档（base: `/`）
2. 将构建产物复制到 `public/docs/` 或 `dist/docs/`
3. 应用中的 `useDocsUrl.ts` 会自动使用本地文档路径

**构建命令**：

```bash
# 构建本地文档
cd docs
VITEPRESS_BASE=/ pnpm docs:build:local

# 复制到应用目录（示例）
cp -r docs/.vitepress/dist/* public/docs/
```

**注意事项**：

- 本地 APP 使用相对路径，确保离线可用
- 文档路径：`./docs/index.html`
- 需要在 Tauri 构建流程中集成文档构建步骤

## 在应用中的使用

### 文档 URL 获取策略

应用通过 `src/composables/useDocsUrl.ts` 智能获取文档 URL：

**优先级顺序**：
1. 开发模式：本地 VitePress 开发服务器 (`http://localhost:5173`)
2. 生产模式（Tauri）：本地打包的文档 (`./docs/index.html`)
3. 生产模式（Web）：在线版本（优先 Cloudflare Pages，fallback 到 GitHub Pages）

### 网页版

- 使用 iframe 直接嵌入 Cloudflare Pages 文档
- 用户无需离开应用即可查看帮助
- 显示的是最新版本的文档

### 桌面版（Tauri）

- **优先使用本地打包的文档**（离线可用）
- 如果本地文档不可用，fallback 到在线版本
- 顶部显示当前应用版本号（从 `package.json` 读取）
- 提供"下载更新"下拉菜单，支持多个下载源：
  - GitHub Releases（默认）
  - 码云 Gitee（备用，适合无法访问 GitHub 的用户）
  - 可继续添加其他下载源
- 提供"查看源码"按钮链接到 GitHub 仓库

## 注意事项

1. **路径一致性**：确保各环境的 base 配置正确，避免资源加载失败
   - GitHub Pages: `/pomotention/`
   - Cloudflare Pages: `/help`
   - 本地 APP: `/` (相对路径)

2. **构建顺序**：本地 APP 构建时，先构建文档再构建应用

3. **缓存问题**：Cloudflare Pages 可能需要配置缓存规则

4. **相对路径**：本地 APP 使用相对路径，确保离线可用

5. **环境变量**：构建时通过 `VITEPRESS_BASE` 环境变量设置 base 路径

6. **版本信息**：
   - 不再动态获取版本号，直接从 `package.json` 读取
   - 桌面版会在帮助页面顶部显示当前应用版本
   - 版本号同步位置：`package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`

7. **下载源管理**：
   - 在 `src/views/HelpView.vue` 中的 `downloadOptions` 配置下载源
   - 目前支持：GitHub Releases、码云 Gitee
   - 添加新下载源只需在配置数组中添加新项

8. **CI 检查**：GitHub Actions 会检查文档质量
   - Markdown 语法检查
   - 死链接检测
   - 配置文件：`.github/workflows/docs-ci.yml`

## 故障排查

### 部署失败

1. **GitHub Pages**：
   - 检查 `.github/workflows/docs-deploy.yml` 工作流状态
   - 确认仓库设置中已启用 GitHub Pages
   - 检查构建日志中的错误信息

2. **Cloudflare Pages**：
   - 检查 Cloudflare Dashboard 中的构建日志
   - 确认构建命令和输出目录配置正确
   - 检查环境变量 `VITEPRESS_BASE` 是否设置正确
   - 检查 `docs/package.json` 中的依赖是否完整

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
2. 检查 GitHub Actions 和 Cloudflare Dashboard 中的部署状态
3. 清除浏览器缓存后刷新页面
4. 检查 base 路径配置是否正确

### 资源加载失败

1. 检查 `docs/.vitepress/config.mts` 中的 base 配置
2. 确认各环境的 base 路径与部署路径一致
3. 检查静态资源路径是否正确（logo、favicon 等）

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

- **GitHub Pages**：GitHub Actions 会自动检测并部署，通常 2-3 分钟内完成
- **Cloudflare Pages**：Cloudflare 会自动检测并部署，通常 1-2 分钟内完成

### 4. 本地 APP 文档更新（如需要）

如果同时发布新版本的应用：

1. 构建本地文档：
   ```bash
   cd docs
   VITEPRESS_BASE=/ pnpm docs:build:local
   ```

2. 复制文档到应用目录：
   ```bash
   cp -r docs/.vitepress/dist/* public/docs/
   ```

3. 更新应用版本号：
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`

4. 构建并发布应用：
   - 参考 `docs/dev-log/SOP/release.md`

5. 上传到多个平台：
   - GitHub Releases（必需）
   - 码云 Gitee（可选，适合国内用户）

## 相关文件

- `docs/package.json` - 文档项目的依赖和脚本
- `docs/.vitepress/config.mts` - VitePress 配置文件（支持环境变量）
- `.github/workflows/docs-deploy.yml` - GitHub Pages 部署工作流
- `src/composables/useDocsUrl.ts` - 文档 URL 获取逻辑（支持三路部署）
- `src/views/HelpView.vue` - 应用中的帮助页面组件
- `.github/workflows/docs-ci.yml` - 文档 CI 检查工作流
- `docs/dev-log/SOP/release.md` - 应用发布流程
