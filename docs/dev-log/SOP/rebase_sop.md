# Git Rebase 简要 SOP（适用于“分支落后于 main，想变基后继续开发”的场景）

## 目标

- 将工作分支（示例：`feature`）变基到最新的 `main` 上，保持线性、干净历史。
- 处理冲突并安全推送。

## 前置条件

- 本地已配置远程 `origin`
- 当前工作已保存；若有未提交变更，先暂存：`git stash -u`

## 步骤一：同步主分支

```bash
git fetch origin
git checkout main
git pull origin main
```

## 步骤二：切到功能分支并开始变基

```bash
git checkout feature
git rebase main
```

- 若遇到冲突：
  - 解决冲突文件后：
    ```bash
    git add <file>  # 重复对每个冲突文件
    git rebase --continue
    ```
  - 放弃本次变基：
    ```bash
    git rebase --abort
    ```
  - 暂时跳过当前冲突提交（不常用，慎用）：
    ```bash
    git rebase --skip
    ```

## 步骤三：验证与自测

- 运行测试/构建，确保变基后功能正常
- 查看提交历史是否线性清晰：
  ```bash
  git log --oneline --graph --decorate -20
  ```

## 步骤四：推送远程（如需）

- 若该分支之前已推送过，变基会改写历史，需要带保护的强推：
  ```bash
  git push origin feature --force-with-lease
  ```
  - `--force-with-lease` 能避免误覆盖他人新提交

## 附加：交互式整理提交（可选）

- 在变基前或过程中清理提交信息/合并碎片提交：
  ```bash
  git rebase -i main
  ```
  - 在交互界面用 `pick/squash/reword` 等指令整理历史

## 常见问题与处理

- **冲突太多**：考虑改用 `git merge main` 先集成，再按需 rebase；或分批 rebase（分段提交）。
- **误删/想回退**：通过 `git reflog` 找到变基前的分支指针，恢复：
  ```bash
  git reflog
  git branch recover <commit>
  ```
- **远端也有对应分支需要清理**：合并完成后删除远端过时分支：
  ```bash
  git push origin --delete <branch>
  git fetch --prune
  ```

## 简版命令清单（可复制）

```bash
git fetch origin
git checkout main && git pull origin main
git checkout feature
git rebase main
# 解决冲突 -> git add <file> ; git rebase --continue
# 验证后推送
git push origin feature --force-with-lease
```
