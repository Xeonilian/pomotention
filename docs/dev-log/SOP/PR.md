# 变更与提交流程 SOP

## 0. 核心原则

- **一个功能 = 一个分支 = 一个 PR**
- `main` 分支始终保持可部署状态。

### 以最少信息覆盖最大决策空间。先判断 \(S\)，再判断 \(C\)，最后判断 \(UV\)

- 指标集合：范围 \(S\) + 可控性 \(C\) + 用户可感知性 \(UV\)。
  - \(S\)（Scope，影响范围）
    - \(S1\)：样式或单组件/单函数的局部变更。
    - \(S2\)：跨组件或存在较多条件分支。
    - \(S3\)：影响数据流、状态机、后端接口或系统契约。
  - \(C\)（Confidence，可控性）
    - \(C1\)：变更边界清晰、完全理解代码路径。
    - \(C2\)：依赖不熟或路径复杂，难以穷尽验证。
  - \(UV\)（User-Visible，用户可感知）
    - \(UV0\)：用户不易感知。
    - \(UV1\)：用户明显能感知（分辨率错位、卡顿、核心流程变化）。
- 标注方式：在 PR/变更说明首行写 `[S? C? UV?]`。

### 行动矩阵与最小交付物

- 按指标选择最小必要行动；若条件同时满足多个规则，执行并集（叠加）。

- \(S1 \land C1\)（小改动、把握高）

  - 必做：
    - 直接修改与小步提交（原子化 commit）。
    - 在 `docs/ui-checks.md` 追加一行"视觉验收项"描述预期。
  - 选做：
    - `docs/ui-checks/<日期>-before.png/after.png` 截图对照。
  - Commit 前缀：`fix(ui): <一句话说明>`

- \(S2 \lor C2\)（跨组件/条件复杂 或 把握低）

  - 二选一（至少其一）：
    - 在 `__tests__/ui-smoke.spec.ts` 添加最小烟雾测试。
    - 在 `docs/ui-checks/` 固定"前/后"截图作为回归对照。
  - Commit 前缀：
    - `test(ui): smoke for <topic>` 或
    - `chore(docs): ui checks`

- \(S3\)（数据/状态/接口变更）

  - 必做：
    - 添加单元测试或集成测试：
      - 单元测试：验证输入输出的函数级行为（`__tests__/<feature>.spec.ts`）。
      - 集成测试：验证跨模块/流程的协同。
  - Commit 前缀：`feat(<feature>): <简述>`（附带 tests）

- \(UV1\)（用户明显可感知，覆盖层，需叠加上述规则）
  - 必做：
    - 在 `docs/contracts.md` 写 Given/When/Then 的契约描述。
    - 添加回归测试或固定截图对照：
      - `__tests__/ui-regression.spec.ts` 或
      - `docs/ui-checks/` 截图对照。
  - Commit 前缀：`fix(contract #X): <topic> + test(contract #X)`

---

## 1. 开始任务

### 正常流程

```bash
# 格式: pnpm new:branch <type> <topic>
# 示例:
pnpm new:branch feat supabase-sync
```

### 🚨 救援：如果忘记切分支，在 main 上改了代码

```bash
pnpm rescue
# 输入新分支名称，脚本会自动:
# 1. stash 你的改动
# 2. 创建并切换到新分支
# 3. 恢复改动
```

**预防措施**：Git Hook 会阻止你在 main 上提交，提醒你使用 `pnpm rescue`。

---

## 2. 开发与提交

- 遵循原子化提交，一个提交只做一件事。
- Commit Message 格式: `type(scope): message`

```bash
# 示例:
git add .
git commit -m "feat(api): create supabaseClient instance"
```

---

## 3. 风险评估与证据固定

| 评估结果                        | 最小行动       | 执行命令        |
| :------------------------------ | :------------- | :-------------- |
| **`S1` (简单 UI 修改)**         | 结构化 commit  | 无              |
| **`S2` 或 `C2` (复杂或不确定)** | 烟雾测试或截图 | `pnpm sshot`    |
| **`S3` (核心逻辑/数据)**        | 单元/集成测试  |                 |
| **`UV1` (用户能感知)**          | 编写契约文档   | `pnpm new:ctt ` |

- 视觉验收项：`docs/ui-checks.md`（单行补充 目前没有）
- 截图对照：`docs/ui-checks/<date>-before.png/after.png`
- 烟雾测试：`__tests__/ui-smoke.spec.ts`
- 单元/集成测试：`__tests__/<feature>.spec.ts`
- 回归测试：`__tests__/ui-regression.spec.ts`
- 契约文档：`docs/contracts.md`

---

## 4. 创建 PR

### 方式一：智能创建（推荐）

```bash
pnpm new:pr
```

**工作流程：**

1. 脚本自动分析 commits 并生成 PR 描述
2. 在终端预览生成的内容
3. 选择操作：
   - **选项 1**：直接创建 PR（推荐，适合生成内容准确时）
   - **选项 2**：保存到 `.pr-body.md` 后手动编辑和创建（适合需要调整描述时）
   - **选项 3**：取消

**自动完成：**
- ✅ 从 commits 自动分析 S/C/UV 指标
- ✅ 生成标准化的 PR 标题和描述
- ✅ 填充模板所有必填项
- ✅ 提供预览和编辑机会

**手动补充：**
- 在 PR 页面补充 "Manual verification" 的具体验证步骤（如需要）

### 方式二：手动创建

1.  **推送分支:**

    ```bash
    git push origin <branch-name>
    ```

2.  **创建 PR:**

    ```bash
    gh pr create
    ```

3.  **编辑 PR 描述 (使用模板):**
    - **标题**: `[S?C?UV?]: title`
    - **正文**: 填写模板要求的变更内容、风险和缓解措施。

---

## 5. 合并 PR

1.  **审查与自检:** 在 GitHub PR 页面进行 Code Review。
2.  **合并命令:**
    ```bash
    # 格式: gh pr merge <PR_number> --squash --delete-branch
    # 示例:
    gh pr merge 123 --squash --delete-branch
    ```

---

## 6. 清理本地

```bash
git checkout main
git pull
git branch -d <branch-name>
```

---

## 附录：速查表

| 任务             | 命令                                         |
| :--------------- | :------------------------------------------- |
| 创建分支         | `pnpm new:branch <type> <topic>`             |
| 救援 main 上改动 | `pnpm rescue`                                |
| 截图             | `pnpm sshot "<desc>"`                        |
| 创建契约         | `pnpm new:ctt "<name>"`                      |
| 创建 PR          | `pnpm new:pr` (推荐) 或 `gh pr create`       |
| 合并 PR          | `gh pr merge <num> --squash --delete-branch` |
| 紧急修复分支     | `pnpm new:branch hotfix <issue-id>`          |
| 回滚 Commit      | `git revert <commit-hash>`                   |
