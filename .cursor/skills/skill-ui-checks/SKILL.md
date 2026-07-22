---
name: skill-ui-checks
description: >-
  Appends UI regression entries to docs/dev-log/history/ui-checks/ui-checks.md
  for Pomotention. Given/When/Then format, numbered checks, screenshots in the
  same folder. Use only for large visual changes when the user wants archival
  evidence, after pnpm sshot, or user asks for ui check / 截图对照.
  Skip by default — not required for every UV1.
---

# Pomotention UI Checks

## 文件

- 索引： `docs/dev-log/history/ui-checks/ui-checks.md`
- 截图： `docs/dev-log/history/ui-checks/YYYYMMDD-<topic>-before|after|full.png`（与索引同目录）
- 截图命令： `pnpm sshot "<topic>"`（内部调 [`scripts/screenshot.ps1`](../../../scripts/screenshot.ps1)）

## 何时写 / 何时跳过

| 条件 | 行动 |
|------|------|
| **大改 UI** 且用户要留对照 | 追加条目 + 截图 |
| 日常小修 / UV1 仅手测 | **跳过** |
| 用户未提 ui-checks | **不要主动催** |

证据优先：单测 → PR Manual verification →（可选）本文件。

## 追加条目

1. 读 `ui-checks.md`，取最大 `## UI check #N`，新条目用 `#N+1`。
2. 追加到 **文件末尾**。
3. 结构：

```markdown
## UI check #N <短标题>

### Given

- <前置条件>

### When

- <操作步骤>

### Then

- <可见结果>

![说明](./YYYYMMDD-topic-after.png)
```

## 截图命名

`YYYYMMDD-<topic>-<status>.png`，status 为 `before` | `after` | `full`。

## 反例

- 每个 UV1 都强迫写 ui-checks
- 图片路径写成绝对路径或漏目录
- 编号重复或插入中间打乱 #N 顺序
