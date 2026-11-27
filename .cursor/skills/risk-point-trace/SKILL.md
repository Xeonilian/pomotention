---
name: risk-point-trace
description: >-
  Single-anchor change-impact / light FMEA for Pomotention: upstream triggers,
  downstream persistence, invariants, failure cross-cuts. Use when user asks
  单点审查, blast radius, 上下游分析, risk-point-trace, or before release for
  S3 system-high anchors (sync, SW/PWA, timer media). Skip UI-only / copy-only.
disable-model-invocation: true
---

# 单点审查（blast radius / 轻量 FMEA）

对 **一个锚点** 做契约审查，找 release 级潜在错误。不是全仓 review，不是 Bugbot。

## 何时用 / 何时拒

- **用**：持久化、同步顺序、SW/Cache、媒体会话、状态机等 **系统高/中** 改动。
- **拒或一句跳过**：纯 UI、文案、无副作用样式。说明「无持久化波及面」即可。

## 输入

用户给出：锚点（函数名 / 消息 type / commit）+ 可选关心的不变量。一次只审一个锚点；多个则分次。

## 固定 6 步

1. **锚点** — 改动的核心符号与文件。
2. **上游** — 谁调用、何时、可否并发重叠（双端、回前台、双 tab、旧版本回退路径）。
3. **下游** — 写了哪些面：store / 游标 / localStorage / Cache Storage / SW / session 标记。
4. **不变量** — 成功与失败后必须仍成立的短句（各 1–3 条）。
5. **失败横切** — abort、超时、无 ACK、杀进程、弱网、旧客户端、顺序颠倒。每条问：半残？二次入口加重？
6. **产出** — 下表；**只把仍开放** 的写进 PR 必测。

## 输出模板（中文，可贴 PR）

```markdown
### 锚点：`<name>`

| 触发 | 可能坏结果 | 缓解 / 仍开放 |
|------|------------|---------------|
| … | … | 已缓解：… / **仍开放：手测 …** |

**建议手测：**（仅仍开放项，3–6 条）
```

已完全缓解的可一行带过，勿灌水。

## 工程对照

Change Impact / Blast Radius + 轻量 FMEA（失败模式与后果）。不替代单测；与发版 PR 的「系统风险必测」互补。
