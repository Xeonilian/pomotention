# 使用 gh-cli 进行 PR、Merge、Issue 的简要 SOP

## 前置条件

- 已完成 gh-cli 安装与认证（`gh auth status` 应为 Logged in）
- 已在目标仓库目录内执行命令（确保当前目录是该仓库）
- 已配置 Git 用户信息：`git config user.name`、`git config user.email`

## 1) Issue 管理

### 创建 Issue

- 交互式创建（推荐，支持填写标题、正文、标签、里程碑、受理人）

```bash
gh issue create
```

- 一次性命令创建（适合脚本）

```bash
gh issue create \
  --title "修复：登录页空白问题" \
  --body "复现步骤：\n1. 打开登录页\n2. 输入错误密码\n期望：提示错误\n实际：页面空白" \
  --label bug,high \
  --assignee your-username \
  --milestone "v1.2.0"
```

### 查看与筛选 Issue

```bash
# 列出打开的 Issue
gh issue list --state open --limit 20

# 查看指定 Issue 详情（编号或URL）
gh issue view 123 --web       # 在浏览器打开
gh issue view 123             # 终端查看
```

### 处理 Issue（评论、状态）

```bash
# 评论
gh issue comment 123 --body "已定位为前端渲染异常，准备修复。"

# 关闭 Issue
gh issue close 123 --comment "已通过 PR #456 修复并合并。"

# 重新打开 Issue
gh issue reopen 123
```

## 2) Pull Request（PR）工作流

### 创建分支并提交更改

```bash
git checkout -b fix/login-blank
# ...编辑代码...
git add -A
git commit -m "fix: 修复登录页错误密码导致空白的问题"
git push -u origin fix/login-blank
```

### 创建 PR

- 交互式创建（可自动推断 base/head，填写标题、正文、草稿、关联 Issue 等）

```bash
gh pr create
```

- 一次性命令创建（示例：关联 Issue、设为草稿）

```bash
gh pr create \
  --base main \
  --head fix/login-blank \
  --title "fix: 修复登录页空白(错误密码)" \
  --body "关联 Issue #123。修复渲染条件判断，新增用例。" \
  --draft
```

- 从提交消息中自动生成标题/正文

```bash
gh pr create --fill
```

### 关联 Issue（两种方式）

- 在 PR 描述中加入关键字自动关闭：`Fixes #123`、`Closes #123`
- 或手动链接：

```bash
gh issue comment 123 --body "PR #456 提供修复。"
```

### 查看/更新 PR

```bash
# 列出 PR
gh pr list --state open --limit 20

# 查看当前分支对应 PR
gh pr view --web      # 打开浏览器
gh pr view            # 终端查看

# 向 PR 追加变更（本地提交并 push）
git commit -m "test: 添加回归用例"
git push
```

### 代码评审与评论

```bash
# 在 PR 下评论
gh pr comment 456 --body "建议：将校验逻辑抽成独立函数并补充空值分支。"

# 请求评审者
gh pr edit 456 --add-reviewer alice --add-reviewer bob
```

## 3) 合并 PR（Merge）

### 预检查

- CI 通过、必需评审已批准、分支无冲突

```bash
gh pr checks 456        # 查看检查状态
gh pr status            # 当前仓库 PR 概览
```

### 执行合并

- 支持 merge/squash/rebase，默认 `merge`。常用如下：

```bash
# 普通合并（保留提交历史）
gh pr merge 456 --merge --delete-branch --auto

# Squash 合并（压缩为单一提交，推荐在杂乱提交时）
gh pr merge 456 --squash --delete-branch --auto

# Rebase 合并（保持线性历史）
gh pr merge 456 --rebase --delete-branch --auto
```

- 说明：
  - `--delete-branch`：合并后删除远端分支
  - `--auto`：当检查尚未完成时，自动等待并在满足条件后合并
  - 无编号时可在当前分支执行：`gh pr merge --squash --delete-branch`

### 合并冲突处理

```bash
# 获取最新 main 并在本地解决冲突
git fetch origin
git rebase origin/main      # 或 git merge origin/main
# 解决冲突后
git add -A
git rebase --continue       # 或继续 merge
git push --force-with-lease # 若使用 rebase 需要强推
```

## 4) 质量与合规建议

- 在 PR 描述中包含：
  - 问题背景与复现步骤
  - 解决方案说明与影响范围
  - 测试说明（用例、截图、录屏）
  - 关闭关键字：`Fixes #<issue>`、`Closes #<issue>`
- 使用最小变更集与清晰提交信息（Conventional Commits 如 `feat:`, `fix:`）
- 使用 `gh pr diff` 审阅变更：

```bash
gh pr diff 456
```

## 5) 常见问题排查

- 无权限合并：需仓库写入/维护权限，或等待必需审查通过
- 检查未通过：查看具体失败项

```bash
gh pr checks 456 --watch
```

- 目标分支不正确：创建 PR 时用 `--base` 指定
- 组织仓库受保护分支：可能需要 `workflow`、`read:org` scope，以及满足状态检查或代码所有者评审

## 6) 常用速查命令

```bash
# Issue
gh issue create --title "..." --body "..." --label bug
gh issue list --state open
gh issue close 123

# PR
gh pr create --fill --base main --head my-feature
gh pr view 456
gh pr checks 456
gh pr merge 456 --squash --delete-branch
```
