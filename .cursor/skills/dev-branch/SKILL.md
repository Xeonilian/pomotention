---
name: dev-branch
description: >-
  Recreates `dev` from latest `main` after the previous `dev` was merged and the
  remote branch was deleted (merge-delete). Checkout main, pull --prune, delete
  local dev, new dev, push -u. No force-push. Use for dev-branch / 重建 dev.
---

# 重建并发布 `dev` 分支

## 前提（本流程默认成立）

- 上一支 **`dev` 已通过 PR 合并进 `main`**，且托管平台已开启 **合并后删除分支**，因此 **远端不再有 `origin/dev`**。
- 本地只是在 `main` 最新基础上 **新建同名 `dev` 并首次推送**，**不需要、也不使用强推**。

若远端仍残留 `dev`，应先处理托管端删除或同步策略，**勿**对 `dev` 做 `--force`。

## 前置检查

- 工作区干净，或已 `commit` / `stash`。
- 分支名默认 **`dev`**；若不同则全文替换。

## 标准命令（顺序执行）

```bash
git checkout main
git pull --prune
git branch -d dev
git checkout -b dev
git push -u origin dev
```

- `git branch -d dev`：上一支已合并进 `main` 时通常可删；若 Git 提示未合并、但你确认无保留价值，再改用 `git branch -D dev`。
- `git push -u origin dev`：远端无同名分支时即创建并设置上游。

## 常见异常

- **当前在 `dev` 上**：先 `git checkout main`，再删 `dev`。
- **`main` 名不同**：前两行改为实际默认分支名。
- **remote 非 `origin`**：最后一行替换为实际 remote。

## 反例

- 在「合并后删除」未生效、远端仍有旧 `dev` 时强行覆盖推送。
- 工作区有未保存修改就删分支、切分支。
