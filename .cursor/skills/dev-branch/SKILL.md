---
name: dev-branch
description: >-
  Recreates `dev` from latest `main` after merge-delete: verify with
  `git fetch origin --prune`, confirm `origin/dev` gone or merged into main,
  checkout main, pull --prune, force-move local `dev` to `main` (`branch -f`),
  fetch --prune, checkout dev, verify main===dev, push -u. No force-push.
  Use for dev-branch / 重建 dev.
---

# 重建并发布 `dev` 分支

## 前提（本流程默认成立）

- 上一支 **`dev` 已通过 PR 合并进 `main`**，且托管平台已开启 **合并后删除分支**，因此 **远端不再有 `origin/dev`**（或等价地：`origin/dev` 上的提交已全部在 `origin/main` 中）。
- 本地只是在 `main` 最新基础上 **新建同名 `dev` 并首次推送**，**不需要、也不使用强推**。

若远端仍残留 **独立提交** 的 `dev`（未进 `main`），应先 **合并 PR** 或在托管端处理后再继续；**勿**对 `dev` 做 `--force`。

## 为何不用「删分支再 `checkout -b`」（重要）

旧版流程里若 **`git branch -d dev` 失败**（Git 认为旧 `dev` 未合并进当前 `HEAD`），后续 **`git checkout -b dev` 也会失败**（本地 `dev` 仍存在），但若脚本**继续执行** `git push -u origin dev`，会把**仍指向合并前提交**的本地 `dev` 推上去，等于把「已合进 main 的旧历史」又发布到远端。

**正确做法**：在 `main` 更新到最新后，用 **`git branch -f dev main`（或不存在时 `git branch dev main`）** 把本地 `dev` **强制指向与 `main` 相同的提交**，再 `checkout` 与 `push`。这样不依赖「删除分支是否成功」，也不会误推旧指针。

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
git fetch origin --prune
git branch -f dev main || git branch dev main
git checkout dev
# 推送前校验：main 与 dev 必须为同一提交，否则禁止 push
test "$(git rev-parse main)" = "$(git rev-parse dev)"
git push -u origin dev
```

说明：

- **`git pull --prune`**：在 `main` 上快进更新；`--prune` 有助于同步远端已删除分支的跟踪引用。
- **`git fetch origin --prune`**：清掉托管已删分支对应的 `origin/*`，避免误判远端是否还有 `dev`。
- **`git branch -f dev main || git branch dev main`**：已有本地 `dev` 时用 `-f` 把它移到 `main` 当前提交；若本地尚无 `dev`，`-f` 会失败，用第二条命令创建与 `main` 同提交的 `dev`。**不要用 `git branch -d dev` 作为唯一手段**，以免删失败后误推旧指针。
- **`test "$(git rev-parse main)" = "$(git rev-parse dev)"`**：Agent 或脚本在 push 前必须满足；失败则**停止**，检查是否未切到 `dev`、或 `branch -f` 未执行成功。**Windows CMD** 无 `test`，可改用 PowerShell：`if ((git rev-parse main) -ne (git rev-parse dev)) { exit 1 }`。
- **`git push -u origin dev`**：远端无同名分支时即创建并设置上游；此时本地 `dev` 已与 `main` 同提交，推送的是**最新 main 线**，不是旧的合并前 `dev`。

## 可选：仍希望删掉旧本地 `dev` 再重建

在已确认 **`git merge-base --is-ancestor dev main`**（旧 `dev` 已在 `main` 历史内）或确认无独有提交后，可在 **`git branch -f dev main` 之前**执行 `git branch -D dev`，再 `git branch dev main`。这是锦上添花；**核心安全绳仍是 `-f`/`branch dev main` + rev-parse 校验**。

## 常见异常

- **`git pull` 报错**：`Your configuration specifies to merge with the ref 'refs/heads/dev' from the remote, but no such ref was fetched.`  
  **原因**：当前在 **`dev`** 上，且上游仍指向托管端**已删除**的 `dev`。  
  **处理**：**先 `git checkout main`**，更新 `main`，再按标准命令把 `dev` 指到 `main`；不要停在 `dev` 上反复 `pull`。

- **当前在 `dev` 上**：先 `git checkout main`，再执行标准命令。
- **`main` 名不同**：`checkout` / `pull` 改为实际默认分支名。
- **remote 非 `origin`**：凡写 `origin` 处替换为实际 remote。
- **PowerShell 串联命令**：旧版 PowerShell 可能不支持 `&&`；可分行执行，或用 `;` 分隔（注意失败时仍会继续执行后续命令，关键步骤建议单独跑并看退出码）。

## 反例

- 在「合并后删除」未生效、远端 `dev` 仍有未进 `main` 的提交时，强行用「从 `main` 新建的 dev」去覆盖远端。
- 工作区有未保存修改就切分支、改分支指针。
- **`git branch -d dev` / `checkout -b dev` 任一步失败后仍执行 `git push -u origin dev`**（未先把 `dev` 对齐到 `main`）。
