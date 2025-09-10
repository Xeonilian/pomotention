# 多台电脑开发新分支的标准操作流程(SOP)

## 🖥️ **电脑 A（创建分支的电脑）**

### 1. 创建并切换到新分支

```bash
# 确保在最新的主分支
git checkout main
git pull origin main

# 创建并切换到新分支
git checkout -b feature/your-branch-name
```

### 2. 推送新分支到远程

```bash
# 首次推送新分支到远程仓库
git push -u origin feature/your-branch-name
```

## 💻 **电脑 B（另一台电脑）**

### 1. 更新远程分支信息

```bash
# 获取最新的远程分支信息
git fetch origin
```

### 2. 检出远程分支

```bash
# 切换到新分支（会自动创建本地分支并跟踪远程分支）
git checkout feature/your-branch-name

# 或者使用更明确的命令
git checkout -b feature/your-branch-name origin/feature/your-branch-name
```

## 🔄 **日常开发同步流程**

### 开始工作前

```bash
git pull origin feature/your-branch-name
```

### 提交工作后

```bash
git add .
git commit -m "your commit message"
git push origin feature/your-branch-name
```

### 清理远程已删除的分支引用

`git remote prune origin`

### 或者在 fetch 时自动清理

`git fetch origin --prune`

### 删除和强制删除

git branch -d branch-name
git branch -D branch-name

## ⚠️ **常见问题解答**

**Q: 为什么不会自动切换？**

- Git 不会自动切换分支，需要手动使用`git checkout`命令
- 新创建的分支只存在于创建它的电脑上，其他电脑需要先`fetch`然后`checkout`

**Q: 如果忘记推送怎么办？**

```bash
# 在电脑B上会看不到新分支
git branch -r  # 查看远程分支列表
```

**Q: 两台电脑同时修改怎么处理冲突？**

```bash
# 先拉取最新代码
git pull origin feature/your-branch-name
# 如果有冲突，解决后再提交
```

## 📋 **最佳实践**

1. **命名规范**：使用描述性的分支名，如`feature/user-authentication`
2. **频繁同步**：每天开始和结束工作时都要 pull/push
3. **小步提交**：频繁提交小的改动，便于追踪和回滚
4. **分支保护**：重要分支设置保护规则，避免直接推送
