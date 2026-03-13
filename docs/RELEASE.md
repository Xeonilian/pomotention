# 发布与日常流程

## 日常流程

1. **开发**：在 `dev` 分支上开 `feature/xxx`，改完合并回 `dev`，push。
2. **测试**：Cloudflare 自动部署 Preview（dev 分支），在预览站自用约 3 天。
3. **上线**：确认无大问题后，把 `dev` 合并到 `main`，push；Cloudflare 自动部署生产站。

## 仅 dev 才有的功能

- 在 Cloudflare Pages 的 **Preview** 环境变量里增加：`VITE_APP_DEV` = `true`（Production 不配置）。
- 代码里用 `import.meta.env.VITE_APP_DEV` 判断，为真时显示「开发工具」等入口（例如设置页的「清除本地数据」）。
- 正式站不设该变量，这些功能不会出现。
