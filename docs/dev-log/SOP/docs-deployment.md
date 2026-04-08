# 帮助文档部署与本地开发（当前口径）

## 1. 目的与范围

说明三件事，避免和旧版「站内 HelpView + 外链」混淆：

1. **应用内帮助**：主应用里点「帮助」会**整页跳转**到打包进产物里的 **VitePress 静态站**，路径为 **`{BASE_URL}docs-app/`**（根部署多为 `/docs-app/`，子路径部署则为 `/{VITE_APP_BASE}/docs-app/`）。不再使用 `HelpView.vue`。
2. **桌面 / 完整前端构建**：通过根目录 **`pnpm build:with-docs`** 把文档打进 **`public/.../docs-app`**，再随主站一起构建（Tauri 的 `beforeBuildCommand` 已配置为此命令）。
3. **独立文档站（GitHub Pages）**：仍可用 `docs/` 下的 **`docs:deploy:github`** 发布到 Pages，与「应用内嵌文档」是**两条可选链路**，按需手动维护。

## 2. 概念对照

| 名称 | 含义 |
|------|------|
| **docs-app** | 应用内文档的 **URL 路径段** 与 **`public` 下目录名**（见 `.gitignore` 中的 `public/docs-app` 等），不是单独的 npm 包名。 |
| **VITEPRESS_BASE** | VitePress 的 `base`，嵌入应用时必须与主站 `import.meta.env.BASE_URL` + `docs-app/` 一致，由脚本注入。 |
| **VITE_APP_BASE** | 主站 Vite 的 `base`（子路径部署时用）。文档脚本会读取它来计算 `VITEPRESS_BASE`。 |

## 3. 根目录脚本（仓库根 `package.json`）

常用命令：

| 命令 | 作用 |
|------|------|
| `pnpm dev` | 启动主站 Vite（默认 **1420**）。主站 **listen 之后** 会自动执行 `pnpm docs:dev:app`（VitePress，**5173**），除非下面例外。 |
| `pnpm dev:app` | 仅主站：`cross-env SKIP_DOCS_DEV=1 vite`，**不**自动起文档；点帮助会代理失败，适合只改主站、要更轻量时。 |
| `pnpm dev:with-docs` | 与 `pnpm dev` 相同（别名）。 |
| `pnpm docs:dev:app` | `node scripts/run-docs-for-app.mjs dev`：按 `VITE_APP_BASE` 设好 `VITEPRESS_BASE` 后，在 `docs/` 里跑 VitePress dev。 |
| `pnpm docs:build:for-app` | `run-docs-for-app.mjs build`：构建嵌入应用用的文档产物到 `docs/.vitepress/dist`。 |
| `pnpm build:with-docs` | `docs:build:for-app` → `node scripts/sync-docs-app.mjs`（拷贝到 `public/.../docs-app`）→ `pnpm build`。发布桌面端 / 需要自带帮助时应用此流程。 |

辅助脚本说明：

- **`scripts/run-docs-for-app.mjs`**：从环境变量或根目录 `.env*` 读取 `VITE_APP_BASE`，设置 `VITEPRESS_BASE` 为 `/{可选子路径}/docs-app/`，再在 `docs/` 执行 `docs:dev` 或 `docs:build:local`。
- **`scripts/sync-docs-app.mjs`**：把 `docs/.vitepress/dist` 同步到 `public/docs-app` 或 `public/{VITE_APP_BASE}/docs-app`，与上面 base 规则一致。

开发时主站通过 **`vite.config.ts`** 把 `/{base}/docs-app` **代理到 `http://127.0.0.1:5173`**（与 `docsDevPort` 一致）。若 **5173 上已有进程**（例如你已手动起了文档），则不会重复拉起 VitePress。

## 4. 本地开发怎么预览

### 4.1 与主应用一致（推荐，含 Tauri `tauri dev`）

在仓库根：

```bash
pnpm install
pnpm dev
```

- 主应用：`http://localhost:1420`（或你配置的 host）。
- 应用内帮助：浏览器打开 **`http://localhost:1420/docs-app/`**（若配置了 `VITE_APP_BASE`，路径前加该前缀）。

文档进程稍晚于主站启动属正常；若瞬间点帮助出现 5xx，可等终端里 VitePress 就绪后再试。

### 4.2 只起主站、不起文档

```bash
pnpm dev:app
```

### 4.3 只在 `docs/` 里改文档、独立预览（GitHub Pages 默认 base）

`docs/.vitepress/config.mts` 在未设置 `VITEPRESS_BASE` 时默认 base 偏 **GitHub Pages**（如 `/pomotention/`），本地一般为：

```bash
cd docs
pnpm install
pnpm docs:dev
```

浏览器访问控制台输出的 Local 地址（含 base 前缀，例如 `http://localhost:5173/pomotention/`）。**这与嵌入应用时的 `/docs-app/` 不是同一路径**，改「应用内帮助」请以 **4.1** 为准验证。

## 5. 独立文档站：发布到 GitHub Pages

文档项目脚本在 **`docs/package.json`**：

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

成功后文档站地址取决于 **gh-pages 分支与仓库设置**（历史上常用：<https://xeonilian.github.io/pomotention/>）。**应用内嵌文档不依赖此步骤**；若只发桌面安装包，以 **`build:with-docs`** 为准。

## 6. 为什么会出现「主站更新但帮助不更新」

可能叠加多种情况：

- **Cloudflare 等只跑了 `pnpm build`**，未执行 **`build:with-docs`**，产物里没有新的 `public/.../docs-app`。
- **GitHub Pages 文档** 与 **应用内嵌文档** 是不同链路：前者要单独 `docs:deploy:github`，后者要跟主站构建绑在一起。

## 7. 日常操作 SOP（简版）

### 7.1 改应用内帮助（与发布包一致）

1. 编辑 `docs/` 下 Markdown 或 `docs/.vitepress/config.mts`。
2. 本地用 **`pnpm dev`** 在 **`/docs-app/`** 下自测。
3. 发版前在仓库根执行 **`pnpm build:with-docs`**（或与 CI 中 Tauri / 前端构建命令对齐）。

### 7.2 只更新 GitHub Pages 公开文档站

1. 在 `docs/` 修改并 **`pnpm docs:dev`** 按 Pages base 自测。
2. **`pnpm docs:deploy:github`**。
3. 打开 Pages URL 强制刷新验证。

### 7.3 发布后验证（应用内）

1. 用 **`build:with-docs`** 产物或安装包打开应用。
2. 点「帮助」，确认进入 **`docs-app`** 且内容为新版本。

## 8. 故障排查

### 8.1 开发时 `/docs-app/` 5xx 或打不开

- 是否用的 **`pnpm dev`**（而非仅 **`pnpm dev:app`**）？
- 终端里 VitePress 是否已启动；**5173** 是否被其它程序占用导致异常。
- 子路径部署时 **`VITE_APP_BASE`** 是否与 **`run-docs-for-app` / `sync-docs-app`** 所用一致。

### 8.2 `sync-docs-app` 报错缺少 dist

先执行 **`pnpm docs:build:for-app`**，再执行 **`node scripts/sync-docs-app.mjs`**（或直接 **`pnpm build:with-docs`**）。

### 8.3 `docs:deploy:github` 失败

- 检查 Node / pnpm、网络、GitHub 权限。
- 在 `docs/` 重新 **`pnpm install`** 后重试。

### 8.4 命令成功但线上文档没变化

- 等待 CDN / Pages 刷新，强制刷新浏览器。
- 确认你看的是 **Pages 站** 还是 **应用内 docs-app**，不要混用判断标准。

## 9. 当前不默认承诺的自动化

以下内容需平台或仓库内配置确认写入并跑通后，才可升格为「默认事实」：

- PR 合并后 GitHub Actions 自动部署 docs 到 Pages。
- Cloudflare 单流水线同时发布主站与独立文档路径。
- 主站与 GitHub Pages 文档始终同一时刻更新。

## 10. 后续收敛目标（To-Be）

- 对外入口与发布策略尽量统一（例如统一到 Cloudflare）。
- 明确「公开文档站」与「应用内嵌文档」是否继续双轨；若合并，需同步构建命令与入口 URL。

## 11. 相关文件

- 根目录 **`package.json`**：`dev`、`dev:app`、`build:with-docs`、`docs:*` 脚本。
- **`scripts/run-docs-for-app.mjs`**、**`scripts/sync-docs-app.mjs`**：嵌入应用的 base 与同步。
- **`vite.config.ts`**：`docs-app` 代理、子路径下误访问 `/docs-app` 的跳转、文档 dev 子进程逻辑。
- **`docs/.vitepress/config.mts`**：VitePress 站点配置（`base` 常由 `VITEPRESS_BASE` 覆盖）。
- **`docs/package.json`**：含 **`docs:deploy:github`**。
- **`src/composables/useDocsUrl.ts`**：`getDocsStaticPath`、`navigateToBuiltDocs`。
- **`src/router/index.ts`**、`src/views/MainLayout.vue`：`/help` 与菜单「帮助」行为。
- **`src/views/SettingView.vue`**：若存在对 GitHub Pages 文档站的连通性检测等，常量如 `NET_DOCS` 需与真实 Pages 地址一致。
- **`src-tauri/tauri.conf.json`**：`beforeDevCommand`（`pnpm dev`）、`beforeBuildCommand`（`pnpm build:with-docs`）。
- **`.gitignore`**：`public/docs-app`、`public/**/docs-app`（构建生成，一般不入库）。
- **`docs/dev-log/SOP/release.md`**：桌面端发布流程（若存在）。
