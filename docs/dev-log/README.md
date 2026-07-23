# dev-log · 金字塔地图

工程侧知识库。对外用户说明在 [`docs/guide/`](../guide/)。

**自上而下 = 问得越勤 → 改得越慢。**

| 层 | 问什么 | 去哪 |
|----|--------|------|
| **1 current** | 我现在干嘛？干到哪了？ | [`current.md`](./current.md) |
| **2 ship** | 怎么分支 / PR / 发版？ | [`ship/README`](./ship/README.md)（入口 [`PR.md`](./ship/PR.md)） |
| **3 design** | 系统约定、领域、构想？ | [`blueprint/README`](./blueprint/README.md) |
| **4 history** | 发过什么？关票？视觉对照？ | [`history/README`](./history/README.md) |

与 AI 怎么协作 → 仓库 [`.cursor/docs/ai-collaboration-harness-loop.md`](https://github.com/Xeonilian/pomotention/blob/main/.cursor/docs/ai-collaboration-harness-loop.md)。

---

## 开新功能（3 分钟）

1. 打开 [`current.md`](./current.md)，填「一句话 + 3 条验收 + S/C/UV」
2. `pnpm new:branch <type> <topic>`
3. 收工前写「停在哪」一行

---

## AI 阅读顺序

1. [`current.md`](./current.md) — **必读**
2. 写代码 → [`blueprint/1-architecture-layering.md`](./blueprint/1-architecture-layering.md)
3. 迷路 → 本 README
4. 提交 / 证据 → [`ship/PR.md`](./ship/PR.md)
5. 开下一关 / 队列 → [`roadmap.md`](../guide/intro/roadmap.md)（不要替代 current）

---

## 目录树

```
dev-log/
├── README.md                 ← 本文件
├── current.md                ← 当前关（唯一必维护）
├── ship/                     ← 分支 / PR / 发版 / 工具
├── blueprint/                ← design（编号文件，见该目录 README）
└── history/
    ├── CHANGELOG.md
    ├── archive/              ← 关票归档
    └── ui-checks/            ← 可选视觉归档（大改时）
```

---

## 维护

| 文档 | 何时 |
|------|------|
| **`current.md`** | 开票 / 收工 / 通关 |
| `history/CHANGELOG.md` | 打 tag / 发版 |
| `history/archive/` | 通关后归档关票 |
| `history/ui-checks/` | **大改且想留对照时** |
| `blueprint/*` | 分层或领域边界变 |
| `ship/*` | 工具链或流程变 |

证据：`current` 验收 →（S3）单测 → PR 手测 →（可选）ui-checks。

---

## Skills

| Skill | 用途 |
|-------|------|
| [skill-changelog](https://github.com/Xeonilian/pomotention/blob/main/.cursor/skills/skill-changelog/SKILL.md) | CHANGELOG |
| [skill-ui-checks](https://github.com/Xeonilian/pomotention/blob/main/.cursor/skills/skill-ui-checks/SKILL.md) | 大改时追加 ui-checks |
| [dev-branch](https://github.com/Xeonilian/pomotention/blob/main/.cursor/skills/dev-branch/SKILL.md) | 合并后重建 `dev` |

Agent 入口：[AGENTS.md](https://github.com/Xeonilian/pomotention/blob/main/AGENTS.md)。
