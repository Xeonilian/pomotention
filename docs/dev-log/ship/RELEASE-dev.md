# 发布与日常流程

## 日常流程

1. **开发分支**
   - 从最新 `dev` 开分支：`pnpm new:branch feat my-topic`（脚本会自动：更新 `dev` → 基于 `dev` 创建 `feat/my-topic`）。
   - 开发完成后，推到远程：`git push -u origin feat/my-topic`。

2. **合并到 dev（通过 PR）**
   - 创建 PR：`gh pr create --base dev --head feat/my-topic`。
   - 在 GitHub 上或命令行确认无误后合并：`gh pr merge --squash` 或 `gh pr merge --merge`。
   - 删除远程分支：`git push origin --delete feat/my-topic`（可选）。

3. **测试**
   - `dev` 被合并更新后，Cloudflare 会自动为 `dev` 部署 Preview。
   - 在 Preview 站自用约 3 天，走完整一天的真实流程。

4. **上线（dev → main，通过 PR）**
   - 创建发布 PR：`gh pr create --base main --head dev`。
   - 确认 changelog / 差异后，通过 `gh pr merge` 合并。
   - 合并后 `main` 会触发生产站部署，Cloudflare 上线新版本。

## 仅 dev 才有的功能

- 在 Cloudflare Pages 的 **Preview** 环境变量里增加：`VITE_APP_DEV` = `true`（Production 不配置）。
- 代码里用 `import.meta.env.VITE_APP_DEV` 判断，为真时显示「开发工具」等入口（例如设置页的「清除本地数据」）。
- 正式站不设该变量，这些功能不会出现。
