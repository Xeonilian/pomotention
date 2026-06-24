---
name: skill-ui-checks
description: >-
  Appends UI regression entries to docs/dev-log/ui-checks.md for Pomotention.
  Given/When/Then format, numbered checks, screenshots under ui-checks/.
  Use when PR is UV1 or S2 UI change, after pnpm sshot, or user asks for
  visual acceptance / ui check / 截图对照.
---

# Pomotention UI Checks

## 文件

- 索引： `docs/dev-log/ui-checks.md`
- 截图： `docs/dev-log/ui-checks/YYYYMMDD-<topic>-before|after|fix.png`
- 截图命令： `pnpm sshot "<topic>"`（内部调 [`scripts/screenshot.ps1`](../../../scripts/screenshot.ps1)）

## 与 contracts 的分工

| 类型 | 文件 | 何时 |
|------|------|------|
| 行为契约（可测逻辑） | `contracts.md` | UV1、skill-contract、`pnpm new:ctt` |
| 视觉回归（长什么样） | `ui-checks.md` | UV1 必截图；S2 二选一；S1 可只写一行预期 |

**不要**在 ui-checks 里重复 contracts 的全文；可写「见 Contract #N」。

## 追加条目

1. 读 `ui-checks.md`，取最大 `## UI check #N`，新条目用 `#N+1`。
2. 追加到 **文件末尾**（保持历史顺序）。
3. 结构：

```markdown
## UI check #N <短标题>

### Given

- <前置条件>

### When

- <操作步骤>

### Then

- <可见结果>

![说明](ui-checks/YYYYMMDD-topic-after.png)
```

4. **S1+C1**：至少 Then 里 1～3 条文字预期；截图选做。
5. **S2 / C2 / UV1**：必须有 before/after（或 after + 说明）；路径相对 `ui-checks.md`。
6. 若同时发版：CHANGELOG 用 **ui** 前缀简述；本文件管回归证据。

## 截图命名

与 `screenshot.ps1` 一致：`YYYYMMDD-<topic>-<status>.png`，status 为 `before` | `after` | `fix`。

## 反例

- 只改 CHANGELOG 不写 ui-checks（UV1 UI 变更时）。
- 图片路径写成绝对路径或漏 `ui-checks/` 前缀。
- 编号重复或插入中间打乱 #N 顺序。
