# 把工作接到新的 main 上

两种完全不同的情况。先对号，再抄命令。

| 情况 | 去哪一节 |
|------|----------|
| 功能分支只是落后 `main`，整支接上去 | [场景一](#场景一功能分支落后-main普通-rebase) |
| `dev` 上同时有「先不合的 A」和「现在要合的 B」，另开 `feat` 做 C | [场景二](#场景二dev-上有-abfeat-只带走-bc合完把-a-接回)（本次 #133 就是这个） |

---

## 场景一：功能分支落后 `main`（普通 rebase）

### 目标

- 将工作分支（示例：`feature`）变基到最新的 `main` 上，保持线性、干净历史。
- 处理冲突并安全推送。

### 前置条件

- 本地已配置远程 `origin`
- 当前工作已保存；若有未提交变更，先暂存：`git stash -u`
- 取回 stash：`git stash pop`

### 步骤一：同步主分支

```bash
git fetch origin
git checkout main
git pull origin main
```

### 步骤二：切到功能分支并开始变基

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

### 步骤三：验证与自测

- 运行测试/构建，确保变基后功能正常
- 查看提交历史是否线性清晰：

  ```bash
  git log --oneline --graph --decorate -20
  ```

### 步骤四：推送远程（如需）

- 若该分支之前已推送过，变基会改写历史，需要带保护的强推：

  ```bash
  git push origin feature --force-with-lease
  ```

  - `--force-with-lease` 能避免误覆盖他人新提交

### 附加：交互式整理提交（可选）

- 在变基前或过程中清理提交信息/合并碎片提交：

  ```bash
  git rebase -i main
  ```

  - 在交互界面用 `pick/squash/reword` 等指令整理历史

### 常见问题与处理

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

### 简版命令清单（可复制）

```bash
git fetch origin
git checkout main && git pull origin main
git checkout feature
git rebase main
# 解决冲突 -> git add <file> ; git rebase --continue
# 验证后推送
git push origin feature --force-with-lease
```

---

## 场景二：`dev` 上有 A+B，`feat` 只带走 B+C，合完把 A 接回

这次收费 / timetable 走的就是这条。**不要**用场景一的 `git rebase main` 去接整支旧 `dev`，会把已经合进 main 的 B 再放一遍。**也不要**用 [`PR.md`](./PR.md) 收工里的 `git branch -f dev main`，那会把 A 丢掉。

### 字母

- **A**：先不合（收费、网关、登录票）
- **B**：现在能合、但当时已经在 `dev` 上（planner Enter、`pe` Esc、同步数据库）
- **C**：在干净底座上新做的（timetable 筛选 / 点选 / 记录标记）

关系：

```
原来：  main
        dev  = main + A + B
        feat = main + B + C     ← 从 main 开，只拣 B，再做 C

合完：  main2 = main + B + C
        新 dev = main2 + A
```

新 `dev` **不是**原来那条 `dev`（原来没有 C）。名字还叫 `dev`，底座换成了 main2，A 的代码原样接过来。

### 1. 新建 `feat`（不要从 `dev` 开）

从 `dev` 开 `feat` 会把 A 也带上。要从 **main** 开，再只拣 B：

```bash
git checkout main
git pull
git checkout -b feat
git cherry-pick <B1> <B2>    # 只拣能合的那几笔，不要 A
```

然后在 `feat` 上做 C，PR 打向 `main`，squash 合并。

查出 B 的哈希：

```bash
git log --oneline main..dev
```

能合的是 B，留在 `dev` 上的是 A。

### 2. `feat` 合进 `main` 之后

先看清远端：

```bash
git fetch origin --prune
git checkout main
git pull --prune
```

此时 `main` 已是 main2。`origin/feat` 通常已被 `--delete-branch` 删掉。`origin/dev` **还在**，上面仍是旧的 main+A+B。

确认 `dev` 还有没进 `main` 的提交：

```bash
git log --oneline main..origin/dev
```

这里应能看到 A（以及旧的 B；B 已经在 squash 里，不要再拣）。

### 3. 把 A 接到 main2 上（新 `dev`）

```bash
git checkout -B dev main
```

本地 `dev` 先站到 main2。这一步还没有 A。

```bash
git cherry-pick <A1> <A2> <A3>
```

只拣 A，不拣 B。顺序与原来 `dev` 上相同。

### 4. 冲突时：`--theirs` 和 `git add` 是什么意思

`cherry-pick` 会停住，例如：

```
CONFLICT (content): Merge conflict in docs/dev-log/current.md
```

这时这个文件有 **两份**，Git 哪份都不算数。

在 **cherry-pick** 里（和 merge 的叫法容易反）：

| 词 | 实际是哪份 |
|----|------------|
| `--ours` | **脚下**这份 = 你现在站的 main2（这次是 timetable 的 `current.md`） |
| `--theirs` | **贴上来**这份 = 正在拣的那一笔 A（这次是收费的 `current.md`） |

整份要用收费版、不要 timetable 版时：

```bash
git checkout --theirs docs/dev-log/current.md
```

这句 **不改业务逻辑**，就是用贴上来的那一版 **整文件覆盖** 工作区里的这个文件。

覆盖完 Git 仍认为「这个文件的冲突没宣告结束」。下一句只是登记，不再改内容：

```bash
git add docs/dev-log/current.md
```

然后继续：

```bash
git cherry-pick --continue
```

后面没冲突的 A 会自动接上。想放弃整次拣：`git cherry-pick --abort`。

多个文件冲突：每个文件选好版本后都 `git add`，再 `--continue`。

若某个文件要 **两份拼在一起**（设置页既有「同步数据库」又有订阅入口），不要 `--theirs` 整份盖掉，要打开文件手动留两边，再 `git add`。

### 5. 推到远端

新 `dev` 和旧 `origin/dev` 对不上（那边没有 C，这边没有旧 B 的单独提交）。普通 `git push` 会被拒。

```bash
git push --force-with-lease origin dev
```

`--force-with-lease`：只有远端 `dev` 还是你刚才看到的那个尖，才允许换掉。有人在这期间又推了，会失败，而不是默默盖掉别人的。

### 不要做的

- `git branch -f dev main` 然后 `git push -u origin dev`：新 `dev` 和 main2 一样，**A 没了**。只适用于「整支 `dev` 已经合进 main、远端 `dev` 已删」。
- `git checkout dev`（旧的）然后 `git rebase main`：会把 B 再放一遍，和 squash 重复。
- `git push --force`（不带 lease）：可能盖掉别人刚推的。

### 实例（#133 之后）

A 三笔：`83de0112` 爱发电订阅、`da93e76b` 生产网关、`99739f9e` 登录票。  
`current.md` 冲突时用 `--theirs` 留收费那份，再 `add` + `--continue`。
