# dev-log · 内部开发知识库

Pomotention **工程侧**文档：蓝图、过程、验收、进度。对外用户说明在 [`docs/guide/`](../guide/)。

---

## 迷路了？先看这里

| 你的问题                     | 打开                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------- |
| **我现在要干嘛？干到哪了？** | **[`current.md`](./current.md)** ← 最重要                                    |
| 产品大方向、关间队列         | [`guide/intro/roadmap.md`](../guide/intro/roadmap.md)（仅顶部几条）          |
| 更长产品构想                 | [`meta/notes/vision.md`](./meta/notes/vision.md)                             |
| 最近发了什么                 | [`CHANGELOG.md`](./CHANGELOG.md) 最新 1～2 版                                |
| 这次改动怎么提交、要什么证据 | [`SOP/PR.md`](./SOP/PR.md)                                                   |
| 代码怎么分层                 | [`blueprint/architecture-layering.md`](./blueprint/architecture-layering.md) |
| ledger 边界与语法            | [`blueprint/ledger.md`](./blueprint/ledger.md)                               |

**开新功能固定动作（3 分钟）：**

1. 打开 [`current.md`](./current.md)，填「一句话 + 3 条验收 + S/C/UV」
2. `pnpm new:branch <type> <topic>`
3. 收工前写「停在哪」一行

---

## AI 阅读顺序

1. [`current.md`](./current.md) — **必读**；当前关与进度
2. [`blueprint/architecture-layering.md`](./blueprint/architecture-layering.md) — 写/改代码时
   - ledger 相关同时读 [`blueprint/ledger.md`](./blueprint/ledger.md)
3. [`README.md`](./README.md) — 迷路、找文件时
4. [`SOP/PR.md`](./SOP/PR.md) — 要提交、定证据时
5. 按需：[`CHANGELOG.md`](./CHANGELOG.md)、[`contracts.md`](./contracts.md)、[`blueprint/reference/`](./blueprint/reference/)、[`meta/`](./meta/)
6. [`roadmap.md`](../guide/intro/roadmap.md) — **仅**开下一关或问队列/方向；**不要**排在 current 之前或替代 current

仓库根 [`AGENTS.md`](../../AGENTS.md) 有精简版入口。

---

## 文件夹地图

```
dev-log/
├── README.md          ← 本文件
├── current.md         ← 当前这一关（高频改）
├── CHANGELOG.md       ← 发版记录
├── contracts.md       ← 行为契约 Given/When/Then
├── ui-checks.md       ← UI 回归证据
├── ui-checks/         ← 截图
│
├── blueprint/         ← 蓝图：架构约定、技术参考
│   ├── architecture-layering.md
│   ├── ledger.md        ← ledger 边界、语法、tag、路线图
│   └── reference/     ← 现状说明（sync、手势盘点、SQL）
│
├── meta/              ← 个人纪律、协作观、历史备忘
│   └── notes/         ← 个人 note、vision 想法池
│
└── SOP/               ← 过程：分支、PR、发布、工具链
```

**三层语义**

- **蓝图** — 改得慢；回答「架构约定、技术现状参考」
- **过程** — 改得中；回答「怎么做、发了什么」
- **验收** — 改得频；回答「怎么证明没搞砸」（contracts + ui-checks + 测试）

---

## 维护契约

| 文档                       | 何时更新             | 怎么做                         |
| -------------------------- | -------------------- | ------------------------------ |
| **`current.md`**           | 开票 / 收工 / 做完   | 你手动；收工必写「停在哪」     |
| `roadmap.md`               | 通关一关           | 队列删/移一行；**不维护 ✅ 细表** |
| `meta/notes/vision.md`     | 有长想法时         | 随手记；与 current 不一致正常     |
| `meta/notes/*`（除 vision） | 一次性备忘         | 历史参考；**活跃进度仍只写 current** |
| `CHANGELOG.md`             | 打 tag / 发版        | skill-changelog                |
| `contracts.md`             | UV1 或契约变更       | skill-contract、`pnpm new:ctt` |
| `ui-checks.md`             | UV1 / S2 UI 变更     | skill-ui-checks、`pnpm sshot`  |
| `architecture-layering.md` | 分层策略变           | 手动                           |
| `blueprint/reference/*`    | 大改 sync / 手势后   | 手动，文首注明「现状盘点」     |
| `meta/*`                   | 日程或协作方式变     | 低频手动                       |
| `SOP/*`                    | 工具链或流程变       | 改脚本/CI 时同步               |

---

## 与 VitePress

dev-log 整树 **不进** 站内搜索（见 `docs/.vitepress/config.mts`）；仅 [`CHANGELOG.md`](./CHANGELOG.md) 在指南侧有链接。此处可写得更 raw。

---

## Skills（重复劳动交给 Agent）

| Skill                                                            | 用途                  |
| ---------------------------------------------------------------- | --------------------- |
| [skill-changelog](../../.cursor/skills/skill-changelog/SKILL.md) | 写 CHANGELOG          |
| [skill-contract](../../.cursor/skills/skill-contract/SKILL.md)   | 追加/更新 contracts |
| [skill-ui-checks](../../.cursor/skills/skill-ui-checks/SKILL.md) | 追加 ui-checks 条目   |
| [dev-branch](../../.cursor/skills/dev-branch/SKILL.md)           | 合并后重建 `dev` 分支 |

Agent 默认见仓库根 [`AGENTS.md`](../../AGENTS.md) 与 [`.cursor/rules/`](../../.cursor/rules/)。
