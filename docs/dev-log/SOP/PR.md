# 变更与提交流程 SOP

本 SOP 将复杂建议压缩为「2 轴 + 1 开关」的决策机制，并映射到 MEMC 流程。适用于个人或小型团队的前端/全栈开发。

---

## 0. 术语与目标

- \(PR\)：Pull Request／Merge Request，用于代码评审与合并的变更请求。
- 目标：以 2–3 个指标快速归类变更，并给出必做与选做项，降低回归风险，提升可追溯性。

---

## 1. 决策指标标注（必做）

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

说明：以最少信息覆盖最大决策空间。先判断 \(S\)，再判断 \(C\)，最后判断 \(UV\)。

---

## 2. 行动矩阵与最小交付物

按指标选择最小必要行动；若条件同时满足多个规则，执行并集（叠加）。

- \(S1 \land C1\)（小改动、把握高）

  - 必做：
    - 直接修改与小步提交（原子化 commit）。
    - 在 `docs/ui-checks.md` 追加一行“视觉验收项”描述预期。
  - 选做：
    - `docs/ui-checks/<日期>-before.png/after.png` 截图对照。
  - Commit 前缀：`fix(ui): <一句话说明>`

- \(S2 \lor C2\)（跨组件/条件复杂 或 把握低）

  - 二选一（至少其一）：
    - 在 `__tests__/ui-smoke.spec.ts` 添加最小烟雾测试。
    - 在 `docs/ui-checks/` 固定“前/后”截图作为回归对照。
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

说明：此矩阵确保在复杂度升高或风险增大时，最少增加一条验证或证据链。

---

## 3. MEMC 映射（流程卡）

- Measure（衡量）
  - 标注 `[S? C? UV?]`。
  - 在变更描述中列出影响面与风险点（1–3 条）。
- Estimate（预估）
  - \(S1C1\)：< 30 分钟。
  - \(S2\) 或 \(C2\)：1–3 小时（含烟雾测/截图）。
  - \(S3\)：> 3 小时（含单/集成测试）。
  - \(UV1\)：额外 +30 分钟（契约与回归）。
- Mitigate（缓解）
  - \(S1C1\)：视觉验收项 + 小步提交。
  - \(S2\) 或 \(C2\)：烟雾测试或视觉回归。
  - \(S3\)：单元/集成测试。
  - \(UV1\)：契约 + 回归测试/截图。
- Communicate（沟通）
  - PR/变更说明模板包含：
    - `Scope/Confidence/UserVisible: [S? C? UV?]`
    - `Mitigation: <tests/docs/screenshots>`
    - `Contract (if UV1): Given/When/Then`

说明：MEMC 绑定决策指标，让评审者无需上下文也能还原风险与对策。

---

## 4. 提交与 PR 规范

- Commit 规范
  - 前缀采用语义化：`feat` / `fix` / `test` / `chore(docs)`。
  - 单次提交仅覆盖单一意图；避免混合格式化与逻辑调整。
- PR 规范
  - 标题：`[S? C? UV?] <type(scope): summary>`
  - 描述必含：
    - Changes（变更要点，3–7 条）。
    - Mitigation（所加测试/文档/截图）。
    - Contract（若 \(UV1\)）。
    - Risk（低/中/高 + 理由）。

说明：统一格式提高可检索性，并为自动化检查提供钩子。

---

## 5. 文件落点速查表

- 视觉验收项：`docs/ui-checks.md`（单行补充）
- 截图对照：`docs/ui-checks/<date>-before.png/after.png`
- 烟雾测试：`__tests__/ui-smoke.spec.ts`
- 单元/集成测试：`__tests__/<feature>.spec.ts`
- 回归测试：`__tests__/ui-regression.spec.ts`
- 契约文档：`docs/contracts.md`

说明：固定落点降低检索成本，便于历史对照和自动化收集。

---

## 6. 模板与脚手架（可选但推荐）

- PR 模板

  ```
  Title: [S? C? UV?] <type(scope): summary>

  Changes:
  - <bullet points>

  Mitigation:
  - Tests: <unit/integration/smoke/regression/none>
  - Docs: <ui-checks.md/contract #X/screenshots/none>

  Contract (only if UV1):
  Given:
  When:
  Then:

  Risk:
  - <low/medium/high> because <reason>
  ```

- 契约片段模板（`docs/contracts.md`）
  ```
  ## Contract #<id>: <topic>
  Given:
  - <preconditions>
  When:
  - <action>
  Then:
  - <expected outcome>
  ```
- 命名与脚本（示例）
  - 截图命名：`YYYYMMDD-<topic>-before.png/after.png`
  - 脚本：`pnpm new:contract` 生成契约片段；`scripts/screenshot.sh` 生成标准命名。

说明：模板降低启动摩擦，促使习惯定型。

---

## 7. 审查清单（提交前自检）

- 指标：是否正确标注 `[S? C? UV?]`。
- 覆盖：是否命中对应最小行动（测试/文档/截图/契约）。
- 提交：是否原子化、前缀语义正确。
- 证据：是否提供可复现实验（测试通过、截图对照、契约 Given/When/Then）。
- 风险：是否在 PR 描述中陈述影响面与回滚策略（如需要）。

说明：5 项自检覆盖变更可控性、可验证性与可沟通性。

---

## 8. 例外与回滚

- 紧急线上修复（Hotfix）
  - 允许跳过部分文档，但需：
    - 最小复现与修复验证步骤写入 PR 描述。
    - 24 小时内补齐契约/测试/截图（依据 \(S,C,UV\)）。
- 回滚策略
  - 回滚 commit 使用 `revert: <orig commit header>`。
  - 回滚 PR 须附上：
    - 回滚原因与影响范围。
    - 后续补救计划（测试/监控/阈值）。

说明：为不可避免的异常提供流程兜底，保证记录与追踪闭环。

---

## 9. 采用与推广

- 在根目录置 `CONTRIBUTING.md`，嵌入本 SOP 的“决策指标 + 行动矩阵 + MEMC 卡”。
- 在 CI 中校验：
  - PR 标题包含 `[S? C? UV?]`。
  - \(S3\) 变更必须存在测试 delta。
  - \(UV1\) 必须存在契约或截图证据。
- 在代码评审 Checklist 中使用第 7 节的自检项。

说明：流程化落地，减少个体记忆负担，让工具强制执行最小保障。
