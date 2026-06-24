---
name: skill-contract
description: >-
  Writes or appends behavior contracts to docs/dev-log/contracts.md for
  Pomotention. Given/When/Then, numbered Contract #N, aligned with PR SOP UV1.
  Use when PR is UV1 or S3 user-visible behavior, changing an existing
  contracted flow, after pnpm new:ctt, or user asks for contract / 行为契约 /
  Given When Then.
---

# Pomotention Contracts

## 文件定位

- 路径：`docs/dev-log/contracts.md`
- **不是**每日维护；**不是**当前关进度（那是 [`current.md`](../../../docs/dev-log/current.md)）
- **是**用户可感知行为的 **永久回归说明**：以后改同一条流程时，按 Contract 验

## 与 current / ui-checks / 测试的分工

| 层 | 文件 | 写什么 |
|----|------|--------|
| 当前关 | `current.md` | 这一关 3 条验收（能否通关） |
| **行为契约** | **`contracts.md`** | 这条用户流程的 Given/When/Then（以后怎么回归） |
| 视觉 | `ui-checks.md` | 长什么样；见 skill-ui-checks |
| 可自动化 | `__tests__/*.spec.ts` | 能测的逻辑优先写测试；Contract 可引用测试名 |

**不要**把 current 的 3 条验收原样粘贴成 Contract；Contract 更细、可长期复用。  
**不要**在 Contract 里堆截图；UI 对照写 ui-checks，Contract 里可写「视觉见 UI check #N」。

## 何时写 / 何时跳过

| 条件 | 行动 |
|------|------|
| **UV1**（用户明显能感知） | **必追加或更新** Contract |
| **S3** 且影响对外行为 | 优先测试；若用户可感知，叠加 Contract |
| S1+C1 小 UI | **跳过** Contract |
| S2/C2 仅布局复杂 | **跳过** Contract（ui-checks 或 smoke） |
| 改 **已有 Contract** 对应的功能 | **更新该 #N** 或追加 Edge Case 小节，不要另开重复 # |

写之前读 `current.md` 的 `[S C UV]`；与 PR 矩阵不一致时，以矩阵为准并提醒用户。

---

## 流程草案（待维护者确认是否通畅）

> 框架先定；你跑通一轮后可改本节顺序或删掉「草案」标记。

1. **开票** — `current.md` 填关目标 + 3 条验收 + `[S C UV]`
2. **判定** — UV1？→ 本 skill；否则不写 Contract
3. **脚手架（可选）** — `pnpm new:ctt` 追加空 `#N`；或由 Agent 直接写满
4. **检索** — 在 `contracts.md` 搜同主题；已有则改 #N，无则新 #
5. **撰写** — 按下方正文格式填 Given/When/Then；必要时有 Edge Case
6. **证据** — UV1 叠加：测试和/或 ui-checks（skill-ui-checks）
7. **PR** — 标题/描述引用 `Contract #N`；commit：`fix(contract #N): <topic> + test`
8. **通关** — 合并后 **不必**改 Contract，除非该流程再变

---

## 正文格式（新条目统一用此格式）

`pnpm new:ctt` 模板较简；**Agent 成稿时统一为**：

```markdown
## Contract #N: [S? C? UV?] <短标题>

### Given

- <版本 / 数据 / 页面状态等前置条件>

### When

- <用户操作或系统触发，逐步列出>

### Then

- <可判定结果；用列表，一条一个可验证断言>

---

### Edge Case — <场景名>（可选）

#### Given

- …

#### When

- …

#### Then

- …
```

- 标题行保留 `[S C UV]`，与 PR 首行一致
- 编号 `#N`：**只追加在文件末尾**，不插入中间
- 确定 N：读全文最大 `## Contract #(\d+)`，新条目用 N+1（与 `new_contract.cjs` 相同规则）
- 旧条目格式（`**Given:**` 等）**不必**批量改；动到旧流程时再规范化

---

## Agent 撰写要点

1. **Then 必须可验证** — 避免「尽量」「体验更好」；写状态、文案、数据字段、跳转
2. **Given 写全边界** — 版本号、登录态、空数据、时区等
3. **一条 Contract ≈ 一条用户主流程** — 分支过多时用 Edge Case，不要拆成十个 #N
4. **与 current 对齐** — current 3 条验收应能被 Contract 的 Then **覆盖或蕴含**
5. **已知缺陷** — 若当前实现不符合期望，Then 可写「期望行为」并标注 `⚠️ 当前 / ✅ 期望`（见 #10 写法）

---

## 与 git / PR

- PR 描述 Mitigation：`Docs: contracts.md #N`
- 与 [`SOP/PR.md`](../../../docs/dev-log/SOP/PR.md) UV1 行一致：Contract + 回归测试或 ui-checks
- CHANGELOG：用户可见行为变更用合适领域前缀；Contract 全文不进 CHANGELOG

---

## 反例

- 每关都追加 Contract（非 UV1 也写）
- Contract 与 ui-checks 各写一遍相同 Given/When/Then 全文
- 不查已有 #N 就新建重复主题
- Then 只有「功能正常」一类无法判定的句子
- 编号乱序或插入文件中间

---

## 延伸阅读

- 变更矩阵：[`docs/dev-log/SOP/PR.md`](../../../docs/dev-log/SOP/PR.md)
- 视觉对照：skill-ui-checks
- 脚手架： `pnpm new:ctt` → [`scripts/new_contract.cjs`](../../../scripts/new_contract.cjs)
