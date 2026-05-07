---
name: skill-changelog
description: >-
  Writes or edits docs/dev-log/CHANGELOG.md for Pomotention: Chinese headings
  新增/优化/修复/其他 and English domain prefixes (timer, planner, schedule,
  task, activity, data, sync, ui, docs, timetable). Use for release notes or
  CHANGELOG updates.
---

# Pomotention CHANGELOG

## 文件

- 路径：`docs/dev-log/CHANGELOG.md`
- 新版本块插在 `# 更新日志` 之后、上一版本 `## \`v…\`` 之前；块之间空一行。

## 标题

```markdown
## `v0.6.8` · 2026-05-07
```

版本号用反引号 `` `vMAJOR.MINOR.PATCH` ``，日期 `YYYY-MM-DD`。

## 正文

1. 一级分类（顺序）：**新增** → **优化** → **修复** → **其他**（无内容可删整类）。
2. 子项：`- **{前缀}**：中文说明`；技术名词可反引号。
3. 不写内部基准/实验脚本进 CHANGELOG，除非用户明确要求。

## 领域前缀（子项粗体仅限下表）

| 前缀 | 含义 |
|------|------|
| **timer** | 番茄钟、计时 store、阶段与声音 |
| **planner** | 日/周/月/年计划视图、假日条 |
| **schedule** | `schedule` 实体与同步、日程行 |
| **task** | 任务列表、记录、模板、快捷输入 |
| **activity** | ActivitySheet、活动区 |
| **data** | store、合并、标签映射、统计结构 |
| **sync** | 云同步、会话登入登出换号、错误条 |
| **ui** | 布局、FAB、移动端壳、SW/PWA 壳层 |
| **docs** | VitePress、`docs/` 指南与帮助入口 |
| **timetable** | 时间表编辑器、`timetable` 相关 |

- 跨域：`- **timer / docs**：……`（` / ` 两侧各一空格）。
- 「认证」等表外词：归 **sync** 或 **data**，勿自造前缀。

## 与 git tag 对齐再写（squash merge 适用）

CHANGELOG 顶部的版本常落后于 **tag**。以 **相邻 tag** `A` → `B` 为一节素材，勿只盯着文件里上一段。

```bash
git fetch --tags --prune
git tag -l "v*" --sort=version:refname
git log A..B --oneline
git diff A..B --stat
# 需要时：git diff A..B   或   git show --stat <commit>
```

- 有中间 tag 则分段 `v0.6.9..v0.7.0`、`v0.7.0..v0.7.1`，勿跳版本。
- squash 后 `log` 可能很短，以 `--stat` / `show` 为准。
- 尚未打 `B`：用 `A..HEAD`；打完 `B` 再按 `A..B` 核对。

归纳后映射到上表前缀，同类合并；新写的小节遵守本表，旧小节可暂保留旧写法。

## 反例

- 分类标题写成英文。
- 子项前缀用中文领域名或表外词（如 ~~规划器~~、~~启动与缓存~~）。
