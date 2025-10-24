# Commit SOP（提交规范与流程）

本 SOP 旨在让提交信息清晰、可检索、可复盘，支持自动化与团队协作。按此规范书写与检查 commit。

---

## 目标

- 用提交信息表达「意图」与「影响」，而非仅描述「改了什么」。
- 提升检索能力：按类型、范围、日期、版本快速定位变更。
- 降低认知负担：固定格式、固定类型、固定范围。
- 支持自动化：可用于生成变更日志、触发 CI/CD、审查与回滚。
- 每个 commit 只做一件事
- 都是可编译/可运行的（原子性）

---

## 提交信息结构

- 标题（必填）：`type(scope): subject`
- 正文（推荐）：`Why / What / How / Tests / Notes / Breaking`
- 页脚（可选）：`Refs: #issue-id`、`BREAKING CHANGE: ...`

示例：

```text
fix(activity-select): 处理 activeId 空值导致的崩溃

Why
- 删除后立即激活场景下，activeId 短暂为空，访问属性抛错


What
- 空值短路处理
- 默认选中首项


Tests
- 手测回归路径：删除 -> 立即激活 -> 列表切换
- 新增用例 tests/activity-select.spec.ts

Refs
- #123
```

## 类型（type）

建议集合（精简但覆盖常见场景）：

- `feat`：新增功能（对用户可见的新能力）
- `fix`：缺陷修复（更正错误行为）
- `refactor`：重构（不改变外部行为，改善内部结构/命名/解耦）
- `ui`：视觉/布局/微交互（不涉及业务逻辑变更）
- `perf`：性能优化（速度、内存、耗时）
- `docs`：文档（README、帮助、设计说明、变更日志）
- `test`：测试（新增/完善/修复测试）
- `build`：构建/依赖（构建脚本、打包配置、依赖升级）
- `ci`：CI/CD 流水线（工作流、检查、发布流程）
- `chore`：杂项（脚手架、脚本、重命名、搬文件、不影响运行时行为）
- `release`：发布记录（如 `release: v0.3.6`）
- `revert`：回滚（指向被回滚的哈希）
- `hack`：权宜实现（需在正文说明风险与后续替代方案）

可选扩展（按项目需要启用）：

- `i18n`：国际化/本地化
- `data`：数据契约/迁移
- `sec`：安全相关

## 范围（scope）

使用模块/页面/功能域作为 `scope`，长度 1–2 个词，统一小写，避免缩写歧义。

建议候选：

- 业务域：`schedule` `timetable` `today` `activity` `task` `tags`
- UI 域：`layout` `ui-theme` `scrollbar` `modal` `header` `color`
- 技术域：`webdav` `sync` `storage` `date-service` `store` `router`
- 工程域：`build` `packaging` `gh-pages` `updater` `deps` `script`
- 文档域：`help` `guide` `changelog`

示例：

- `feat(webdav): 单向上传完成`
- `ui(layout): 调整 today 视图的左右分栏宽度`
- `refactor(date-service): 抽离日期转换工具并统一入口`
- `build(deps): 安装依赖`

---

## 标题（subject）规范

- 使用简洁动词短句，描述意图与影响。
- 不以句号结尾；不包含无意义词（如 “一些修改”）。
- 统一半角冒号 `:`；英文/中文皆可，但风格一致。
- 建议 ≤ 72 字符，便于日志/工具显示。

动词建议（参考）：添加/支持/移除/重命名/抽离/统一/优化/修复/避免/改进/对齐/升级/降级/回滚

---

## 正文（body）建议结构

在需要时补充，提升审阅和复盘效率。

- Why：动机/问题症状/背景链接
- What：关键改动点（要点列表）
- How：实现要点/方案取舍（可选）
- Tests：测试方式/用例位置/覆盖路径
- Notes：已知限制、迁移指引、风险点
- Breaking：破坏性变更提示与迁移方案

---

## 粒度与拆分

- 一次提交只做一件事：功能、修复、重构、UI 分开提交。
- 先重命名/搬文件，再逻辑修改，保持 diff 干净。
- 大型重构拆成数个可运行的小步提交，每步可回滚。
- 勿将 `refactor` 与行为变更混合；行为变更归 `feat`/`fix`。

---

## 特殊场景

- 回滚
  - `revert(scope): 回滚 <hash> 的 <subject>`
  - 正文写明回滚原因与后续安排
- 发布
  - `release: vX.Y.Z`
  - 正文列本次变更摘要或链接 `CHANGELOG.md`
- 权宜实现
  - `hack(scope): ...`
  - 正文写风险、替代方案、跟踪任务/截止时间
- 依赖升级
  - `build(deps): bump xxx from A to B`
  - 若含破坏性变更，正文标注 `Breaking` 和迁移步骤

---

## 质量闸门

- 书写检查（可选自动化）
  - `commitlint` 校验 `type(scope): subject` 格式与类型白名单
  - 标题长度与禁止句号收尾
- 代码检查
  - `lint-staged`：`eslint --fix`、`prettier`、`type-check`
  - 单测必须可通过（涉及逻辑）
- PR 审查
  - 变更说明是否覆盖 Why/What/Tests
  - 是否拆分为“一事一提”
  - 是否对 UI/逻辑/数据 影响面充分说明

---

## 常用模板

提交标题片段（VS Code 可配置 snippet）：

```text
feat(scope): ...
fix(scope): ...
refactor(scope): ...
ui(scope): ...
docs(scope): ...
test(scope): ...
build(scope): ...
ci(scope): ...
chore(scope): ...
release: vX.Y.Z
revert(scope): 回滚 <hash> 的 <subject>
hack(scope): ...
```

提交正文片段：

```text
Why
- ...

What
- ...

Tests
- ...
```

---

## 示例集合

- `feat(schedule): 支持日期跳转与高亮当天`
- `fix(activity-select): 处理 activeId 为空导致的崩溃`
- `refactor(store): 抽离 activity 状态流转逻辑`
- `ui(theme): 调整配色与字号层级`
- `perf(load): 缓存 chunk 提升首屏渲染`
- `docs(help): 更新使用指南与截图`
- `build(gh-pages): 配置自动部署`
- `ci(release): 自动生成 changelog`
- `chore(rename): 统一文件命名与路径`
- `release: v0.3.6`

---

## 执行流程（SOP）

1. 评估与拆分
   - 明确任务意图：功能/修复/重构/UI/构建/文档/测试
   - 拆分为“一事一提”的最小提交
2. 编码与自检
   - 本地通过 lint/format/type-check/test
3. 撰写提交信息
   - 标题：`type(scope): subject`
   - 必要时补充 Why/What/Tests/Breaking
4. 推送与 PR
   - 填写 PR 模板，说明影响范围与验证路径
   - 请求审查，回应意见迭代
5. 合并策略
   - 优先使用 Squash 合并，保持线性与整洁历史
   - 合并信息采用提交标题风格
6. 发布与记录
   - 使用 `release: vX.Y.Z` 标记发版
   - 生成/更新 `CHANGELOG.md`

---

- template

```text
从当前已暂存（staged）的改动生成一条提交信息，要求：
- 标题格式：type(scope): subject（中文，≤72 字符）
- 类型限定：feat/fix/refactor/ui/perf/docs/test/build/ci/chore/release/revert/hack
- 必须填写 scope（模块/页面/功能域，如 schedule/today/activity/webdav/ui-theme/date-service）
- 正文按需包含 Why / What / Tests；没有必要时可省略
- 不要包含 PR/issue 编号，保持简洁
- 避免空话，直接描述意图与影响
```

## 附：可选工具配置提示

- commitlint 允许的类型白名单：
  - `feat, fix, refactor, ui, perf, docs, test, build, ci, chore, release, revert, hack, i18n, data, sec`
- 校验规则：
  - 标题必须匹配正则：`^(feat|fix|refactor|ui|perf|docs|test|build|ci|chore|release|revert|hack|i18n|data|sec)(\([\w\-]+\))?: .{1,72}$`

需要时可提供 `.commitlintrc.cjs`、`husky`、`lint-staged`、VS Code snippets 与 `PR_TEMPLATE.md` 的具体内容。
