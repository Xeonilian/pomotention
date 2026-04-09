# SOP：帮助页（VitePress）跳转与 Cloudflare

与 [docs-deployment.md](./docs-deployment.md)（部署与本地开发口径）互为补充：本文侧重 **线上点「帮助」应跳到哪里** 及 **Cloudflare 操作步骤**。

## 1. 目的与适用范围

- **目的**：主应用点「帮助」时，浏览器跳到**正确**的 VitePress 文档 URL（独立子域或主站子路径）。
- **适用**：Pomotention Web/PWA（Cloudflare Pages）、本地开发；桌面端行为见 **§7**。

## 2. 前置知识（一页）

| 项目 | 说明 |
| --- | --- |
| 触发点 | 菜单「帮助」、`/help` 路由 → `navigateToBuiltDocs()` |
| Web 逻辑 | `src/composables/useDocsUrl.ts`：`VITE_HELP_DOCS_URL` 有值则整页跳外链，否则跳 **同源** `{BASE_URL}docs-app/` |
| Tauri 逻辑 | **不读** `VITE_HELP_DOCS_URL`，只跳 `{BASE_URL}docs-app/`（打包内须有文件） |
| `BASE_URL` | 来自 `VITE_APP_BASE`（Vite `base`），根部署多为 `/` |

## 3. 先选方案

| 方案 | 何时用 | 主应用要做什么 | 文档站要做什么 |
| --- | --- | --- | --- |
| **A. 外链文档站** | 文档单独 Pages 项目（如 `*.pages.dev`） | 构建时设 `VITE_HELP_DOCS_URL` | `VITEPRESS_BASE=/`（子域根） |
| **B. 同源 docs-app** | 帮助与主站同域 | `pnpm build:with-docs` 部署完整 `dist` | 由 `run-docs-for-app` + sync 进主站，不需单独对外文档 URL |

## 4. SOP-A：Web 跳到独立文档站

**目标**：点帮助打开 `https://<你的文档域>/`，不依赖主站上的 `/docs-app/` 目录。

| 步骤 | 操作 | 通过条件 |
| --- | --- | --- |
| A1 | 打开 **主应用** Cloudflare Pages 项目 | 对应主站域名（如 `pomotention.pages.dev`） |
| A2 | Settings → Environment variables | Production（及需要的 Preview） |
| A3 | 新增：`VITE_HELP_DOCS_URL` = `https://<文档域>/` | 值与浏览器能打开的文档首页一致 |
| A4 | 触发 **重新构建并部署** | 仅改变量不重 build 无效 |
| A5 | 打开主站 → 点「帮助」 | 地址栏变为文档域，且文档页正常（非白屏） |
| A6 | （可选）仓库根 `.env.development` 写同一变量 | 本地 dev 行为与线上一致 |

**文档站构建（Cloudflare 文档项目）**

| 步骤 | 操作 |
| --- | --- |
| D1 | 构建命令中设置环境变量 `VITEPRESS_BASE=/` |
| D2 | 执行 `vitepress build`（或仓库 `docs` 下等价脚本） |
| D3 | 部署产物；浏览器直接打开文档根 URL 自检 |

**常见失败**

- 主应用未重部署 → 仍跳主站 `/docs-app/`。
- 文档站仍用默认 `base`（如 `/pomotention/`）却挂在子域根 → 资源 404 / 白屏。

## 5. SOP-B：主站同源嵌入 docs-app

**目标**：`https://<主站>/docs-app/`（或 `/<VITE_APP_BASE>/docs-app/`）可访问。

| 步骤 | 操作 | 通过条件 |
| --- | --- | --- |
| B1 | 主站 Pages **Build command** 使用 `pnpm build:with-docs`（或等价的 build → sync → vite build） | `pnpm install` 在仓库根 |
| B2 | 部署输出目录包含 `docs-app/` | 浏览器直接打开上述 URL 非 404 |
| B3 | **不**设置 `VITE_HELP_DOCS_URL`（或置空） | 点帮助跳同源路径 |

**注意**：`VITE_APP_BASE` 非空时，文档须用 `scripts/run-docs-for-app.mjs` 生成相同前缀下的 `docs-app`。

## 6. 排查速查

| 现象 | 优先查 |
| --- | --- |
| 点帮助进主站 `/docs-app/` 且 404 | 主站是否只跑了 `pnpm build`；改 **SOP-B** 或改 **SOP-A** |
| 文档子域浏览器能开，帮助仍进主站 | 主应用是否已设 `VITE_HELP_DOCS_URL` 并重部署 |
| 跳进文档域但白屏/样式炸 | 文档构建是否 `VITEPRESS_BASE=/` 与 URL 路径一致 |
| 设置里「文档站」检测失败 | `src/views/SettingView.vue` 中 `NET_DOCS` 是否与实际域名一致（如 `doc` vs `docs`） |

## 7. 桌面端（Tauri）

- 帮助始终：`{origin}{BASE_URL}docs-app/`。
- `VITE_HELP_DOCS_URL` **不生效**。
- 若要桌面也跳外链：**须改代码**（本 SOP 不覆盖）。

## 8. 可选维护

- 将 `NET_DOCS` 改成与生产文档 URL 一致，避免网络检测误导。
- 仓库内可维护 `.env.production.example` 列出 `VITE_HELP_DOCS_URL`（不提交密钥即可）。

## 9. 代码参考路径

- 跳转：`src/composables/useDocsUrl.ts`
- 路由：`/help` → `src/router/index.ts`
- 菜单：`src/views/MainLayout.vue`
- VitePress `base`：`docs/.vitepress/config.mts`（`process.env.VITEPRESS_BASE`）
