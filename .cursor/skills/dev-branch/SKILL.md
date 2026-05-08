---
name: dev-branch
description: >-
  Recreates `dev` from latest `main` after merge-delete: verify with
  `git fetch origin --prune`, confirm `origin/dev` gone or merged into main,
  checkout main, pull --prune, delete local dev, fetch --prune again, new dev,
  push -u. No force-push. Use for dev-branch / 重建 dev.
---

# 重建并发布 `dev` 分支

## 前提（本流程默认成立）

- 上一支 **`dev` 已通过 PR 合并进 `main`**，且托管平台已开启 **合并后删除分支**，因此 **远端不再有 `origin/dev`**（或等价地：`origin/dev` 上的提交已全部在 `origin/main` 中）。
- 本地只是在 `main` 最新基础上 **新建同名 `dev` 并首次推送**，**不需要、也不使用强推**。

若远端仍残留 **独立提交** 的 `dev`（未进 `main`），应先 **合并 PR** 或在托管端处理后再继续；**勿**对 `dev` 做 `--force`。

## 执行前核对（Agent / 人类先做）

1. **`git fetch origin --prune`**：刷新远端引用并删掉本地已过期的 `refs/remotes/origin/*`（例如托管已删的 `dev`）。
2. **读结果**：
   - **`git branch -r` 中已无 `origin/dev`**：符合「合并后删除」，可继续 **标准命令**。
   - **仍有 `origin/dev`**：检查是否已合并进 main（示例）：

     ```bash
     git fetch origin --prune
     git merge-base --is-ancestor origin/dev origin/main && echo "dev 已在 main 历史内"
     ```

     - 若命令失败（非 0）：说明 **`dev` 上还有未进 `main` 的提交**，本流程**不得**继续「从 `main` 新建 dev 并推送覆盖」；先合并或丢弃后再做。
     - 若成功且你仍看到 `origin/dev`：多为托管侧尚未删分支；可在托管端删除后再 `fetch --prune`，或确认策略后继续（勿强推）。

## 前置检查

- 工作区干净，或已 `commit` / `stash`。
- 分支名默认 **`dev`**；若不同则全文替换。

## 标准命令（顺序执行）

```bash
git checkout main
git pull --prune
git branch -d dev
git fetch origin --prune
git checkout -b dev
git push -u origin dev
```

说明：

- **`git pull --prune`**：在 `main` 上快进更新；`--prune` 有助于同步远端已删除分支的跟踪引用，**不能**替代下面单独一次的 **`fetch --prune`**（删本地 `dev` 后清理 stale `origin/dev` 的场景）。
- **`git branch -d dev`**：上一支已合并进 `main` 时通常可删；若 Git 提示未合并、但你确认无保留价值，再改用 `git branch -D dev`。
- **`git fetch origin --prune`**（在删除本地 `dev` 之后）：若托管已删远端 `dev`，此处会移除本地的 `remotes/origin/dev`，避免后续误判。
- **`git push -u origin dev`**：远端无同名分支时即创建并设置上游。

## 常见异常

- **`git pull` 报错**：`Your configuration specifies to merge with the ref 'refs/heads/dev' from the remote, but no such ref was fetched.`  
  **原因**：当前在 **`dev`** 上，且上游仍指向托管端**已删除**的 `dev`。  
  **处理**：**先 `git checkout main`**，更新 `main`，再删本地 `dev`；不要停在 `dev` 上反复 `pull`。

- **`git branch -d dev` 警告**：deleting branch merged to `refs/remotes/origin/dev`, but not yet merged to **HEAD**。  
  **原因**：已切到 `main` 时，`main` 的 HEAD 未必包含旧跟踪分支视角下的「合并」表述；若你已确认 PR 已合入 `main`，通常可继续；执意删除可用 `-D`（确认无独有提交后再用）。

- **当前在 `dev` 上**：先 `git checkout main`，再删 `dev`。
- **`main` 名不同**：`checkout` / `pull` 改为实际默认分支名。
- **remote 非 `origin`**：凡写 `origin` 处替换为实际 remote。

## 反例

- 在「合并后删除」未生效、远端 `dev` 仍有未进 `main` 的提交时，强行用「从 `main` 新建的 dev」去覆盖远端。
- 工作区有未保存修改就删分支、切分支。
