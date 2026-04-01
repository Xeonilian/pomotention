# 帮助文档部署流程（收敛版）

## 1. 目的与范围

本文档只描述当前已经生效、可复现的流程，并补充后续收敛目标。

- 主站（Web/PWA）部署：Cloudflare Pages
- 帮助文档（VitePress）部署：`docs:deploy:github` 发布到 GitHub Pages
- 应用内 `HelpView`：站内页面，文档按钮外链到文档站点

## 2. 当前生效流程（As-Is）

### 2.1 谁在部署什么

1. **Cloudflare Pages** 部署的是主站应用（`https://pomotention.pages.dev/`）。
2. `/help` 当前是应用路由页面（`HelpView`），不是独立的 VitePress 文档站。
3. **帮助文档更新** 通过手动命令发布到 GitHub Pages。

### 2.2 文档发布命令（当前唯一可用口径）

文档项目脚本位于 `docs/package.json`：

```json
{
  "scripts": {
    "docs:deploy:github": "vitepress build && npx gh-pages -d .vitepress/dist"
  }
}
```

执行方式：

```bash
cd docs
pnpm install
pnpm docs:deploy:github
```

发布成功后，文档站地址为：<https://xeonilian.github.io/pomotention/>

## 3. 为什么会出现“主站更新但帮助不更新”

因为当前是两条独立链路：

- 链路 A：`main` 变更触发 Cloudflare 自动部署主站
- 链路 B：手动执行 `docs:deploy:github` 才会更新文档站

所以即使主站已更新，帮助文档也可能保持旧版本。

## 4. 日常操作 SOP（初学者简版）

### 4.1 更新帮助文档

在 `docs/` 下修改 Markdown 或 VitePress 配置。

### 4.2 本地预览（可选但推荐）

```bash
cd docs
pnpm install
pnpm docs:dev
```

本地访问：<http://localhost:5173>

### 4.3 发布到线上文档站

```bash
cd docs
pnpm docs:deploy:github
```

### 4.4 发布后验证

1. 打开 <https://xeonilian.github.io/pomotention/>，确认修改已出现。
2. 打开主站 `https://pomotention.pages.dev/` 的帮助入口，确认跳转到文档站正常。
3. 如未更新，先强制刷新（`Ctrl + F5`）再检查一次。

## 5. 故障排查（按当前流程）

### 5.1 `docs:deploy:github` 执行失败

- 检查 Node.js 与 pnpm 是否可用
- 在 `docs/` 目录重新安装依赖：

```bash
cd docs
pnpm install
```

- 确认网络可访问 npm 与 GitHub

### 5.2 命令成功但线上文档没变化

- 检查本次变更是否已保存并参与构建
- 等待 1-3 分钟后再刷新
- 强制刷新浏览器缓存
- 直接访问文档 URL 验证，不通过应用内缓存页面判断

### 5.3 主站帮助入口与文档地址不一致

当前 `HelpView` 中文档地址为常量配置，若后续修改文档域名，需要同步更新：

- `src/views/HelpView.vue`
- （如有）`src/views/SettingView.vue` 中的文档链接常量

## 6. 当前不再作为默认事实的内容

以下内容历史上可能尝试过，但**不作为当前默认流程**：

- “PR 合并后 GitHub Actions 自动部署 docs”
- “Cloudflare 自动部署 `/help` 下的 VitePress 文档”
- “主站与帮助文档始终同一时刻自动更新”

只有当对应自动化配置在平台侧确认启用并验证通过后，才应写回本 SOP 的 As-Is 部分。

## 7. 后续收敛目标（To-Be）

目标：将帮助文档并入 Cloudflare 的单链路发布，减少手动步骤。

### 7.1 目标状态

- 对外统一入口：Cloudflare（主域名）
- 主站和帮助文档由同一套发布策略管理
- `gh-pages` 仅作为备份或历史镜像，不再作为主要发布依赖

### 7.2 迁移前提

1. 明确文档最终路径（例如 `/help/` 或独立 docs 子域名）
2. 在 Cloudflare Pages 中确认构建命令、输出目录、分支触发规则
3. 应用内帮助入口改为 Cloudflare 文档地址
4. 全链路验证通过后，再将本节提升为 As-Is

## 8. 相关文件

- `docs/package.json`：文档脚本（含 `docs:deploy:github`）
- `docs/.vitepress/config.mts`：VitePress 配置
- `src/views/HelpView.vue`：应用内帮助页与文档外链入口
- `src/views/SettingView.vue`：设置页中的文档相关链接（如存在）
- `docs/dev-log/SOP/release.md`：桌面端应用发布流程
