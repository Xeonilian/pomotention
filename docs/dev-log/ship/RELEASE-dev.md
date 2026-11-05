# 发布与日常流程（一人 + 少量用户）

默认：**单线 `dev` + 偶发 `hotfix`**。不设正式 staging；Preview / 自用狗粮代替。

## 日常

1. **本关只在 `dev` 上做**（大功能不必再拆 `feat/…`，除非一次要并行两路）。
2. **自测约 2 天**（本地或 Cloudflare 对 `dev` 的 Preview），愿意给那几位生产用户碰上了，再开 **`dev → main` 发布 PR**。
3. **生产上的无关 bug** → 从最新 `main` 开 `hotfix/…`，尽快小 PR 合 `main`；**不要**揉进还没发完的本关。
4. **hotfix 合完、本关还在 `dev`：** 把 `main` **接回** `dev`（rebase / cherry-pick 本关提交），继续测。  
   **禁止**此时把 `dev` 指空成「等于 main」——会冲掉未发功能。详见 skill `dev-branch`「何时不要重建」。
5. **整关都进 `main`、发布 PR 分支已删：** 才按收工 **重建** 干净 `dev`（与 `main` 同提交）。见 [`.cursor/rules/pr-merge.mdc`](../../../.cursor/rules/pr-merge.mdc)。

## 不用单开分支的事

- **写/改 ship SOP、skill、本关 docs 顺手整理**：跟当前线（`dev` 或当次 `hotfix`）一起交，**不必**为文档单独开分支。
- **开 PR 前整理 docs / CHANGELOG / `current.md`**：同一发布 PR（或本关 `dev`）里带上即可。

## Debug

- Preview 可开 `VITE_APP_DEV=true`（Production 不配）。诊断入口挂这里，**不要**为了慌而揉进功能提交。
- 正式站不设该变量，这些入口不出现。

## 仅 Preview 才有的功能（补充）

- Cloudflare Pages **Preview** 环境变量：`VITE_APP_DEV` = `true`（Production 不配置）。
- 代码：`import.meta.env.VITE_APP_DEV` 为真时显示开发工具等（例如设置页清除本地数据）。
