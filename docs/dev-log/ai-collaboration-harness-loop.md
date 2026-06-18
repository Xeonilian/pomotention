# 与 AI 协作：从 Prompt 到 Harness 到 Loop

> 个人备忘。来源：与 Cursor 的对话整理；概念参考 [Prompt 该退环境了，未来属于 Loop Engineering](https://aihot.virxact.com/items/cmqesyizd05anslun0peqce57)（2026-06）。

---

## 三个词，各是什么

| 词 | 一句话 | 我现在的位置 |
|----|--------|--------------|
| **Prompt** | 每轮跟 AI 说一句，人驱动下一轮 | ✅ 主力方式 |
| **Harness（马具）** | 规则、文档、Skill，让 AI **不用每次从零猜项目** | 🟡 有 docs / roadmap / SOP，还没系统化 |
| **Loop** | 定 **可验证的目标**，AI **自己转圈直到达标** | 🔴 几乎还没用 |

**要点：** 不是「别用 Cursor 聊天了」。**聊天适合探路**；**重复、能自动验收的事，交给 Loop**。

我写的 **Timer 14 天锚定单** 已经是 Loop 思维：主指标 ≥5 次工作段、第 7 天砍 scope——**目标可验证**，只是执行还是一轮轮聊。

---

## GitHub 在其中的位置

GitHub **不是** Loop 本身，而是 Loop 的 **验收 + 隔离**：

| GitHub 能力 | 在协作里的作用 |
|-------------|----------------|
| 分支 / PR | 一次改动的边界 |
| CI（test / build） | 机器说「过没过」 |
| Release | 交付物固定下来 |

Loop 里常见的完成条件，例如 **「test 全绿 + lint 零错」**，就是挂在 CI 上的。

**结论：** GitHub 大概懂了，就够进入下一阶段；不必先成为 Git 专家。

---

## Loop 文章里的五件套（知道即可，不必一次配齐）

1. **定时 / 事件触发** — 不用每次手动踢 Agent 一脚  
2. **Worktree 隔离** — 多 Agent 各改各的，再合并  
3. **项目知识体系** — rules、docs、Skill、roadmap（Loop 自动跑时尤其重要，否则基于过期信息乱改）  
4. **MCP 连接器** — GitHub、数据库等，Agent 在真实环境里闭环  
5. **子 Agent** — 写的和验的分工  

**文章说的「道」：** 最难的不是配 Hook，而是 **把目标写准**。

| 模糊目标 | 可验证目标 |
|----------|------------|
| 「把这个应用优化一下」 | `test/auth` 全过、`tsc --noEmit` 零错、`lint` 零违规 |

---

## 对我（solo、约 3h/天、Pomotention）的升级顺序

**不要一步跳到「睡醒来几千 Agent」。**

### 阶段 A · 现在～ledger 第一版（1～2 天）

- **方式：** 继续 **聊天**  
- **原因：** 小、模糊、要快  

### 阶段 B · 接下来约 2 周（收费 + 推广）

- **方式：** 聊天 + **每次任务写清 3 条验收标准**  
- **补 Harness：**  
  - roadmap / 锚定单（已有）  
  - Cursor rules（项目惯例）  
  - 重复流程进 SOP（release、supabase、docs deploy）  

**验收示例（收费票）：**

1. 定价页 URL 可打开  
2. 手动改 Supabase `plan` 后，客户端同步行为符合说明  
3. `pnpm build:fast` 通过  

### 阶段 C · 日常功能（schema、chart、A 出口…）

- **方式：** 聊天 + **小 Loop**  
- **固定结尾指令：**

```text
目标：pnpm build:fast 通过；列出 changed files；不过就继续修，不要问我
```

- 有 CI 后改成：**「PR 上 CI 全绿」**  
- **角色变化：** 从 **司机** → **定终点的人**  

### 阶段 D · 半年以后（可选）

- GitHub Actions、Cursor Automations、`/loop`、子 Agent  
- **IndexedDB 大迁移** 不适合盲目「/goal 通宵跑」，要先拆成带测试的小步  

---

## 时间感（按每天约 3h）

| 阶段 | 协作方式 | 大约何时 |
|------|----------|----------|
| ledger 第一版 | 聊天 | 今明 2 天 |
| 收费 + 推广 | 聊天 + 验收 3 条 | +2 周 |
| 日常功能 | 聊天 + build/test 小 Loop | 之后持续 |
| Harness 整理 | rules + SOP + roadmap | 与收费并行 |
| 大 Loop / 自动化 | CI + Automations | CI 稳定后再说 |

---

## 和 Pomotention 产品计划的衔接

产品执行顺序见 [开发地图](../guide/intro/roadmap.md) 顶部「当前执行顺序」：

1. ledger 第一版（1～2 天）  
2. 收费 + 推广底座  
3. schema → chart / A  
4. IndexedDB  
5. 其余愿景  

**协作升级与产品顺序可并行：** ledger 用聊天；收费起开始练 **验收 3 条 + 小 Loop**。

---

## 只记一句

> **聊天定方向；Harness 少失忆；Loop 只管「能自动验真假」的重复活。**

---

## 下一步可练手

ledger v1 做完后，把「完成定义」写成 3 条可验证条目，当作第一个固定模板，例如：

1. 从 Task 样例文本能解析出至少 N 种合法 ledger 行  
2. 一键复制到剪贴板，粘贴到外部编辑器格式正确  
3. `pnpm build:fast` 通过  

---

## 延伸阅读

- 文章：[Prompt 该退环境了，未来属于 Loop Engineering](https://aihot.virxact.com/items/cmqesyizd05anslun0peqce57)  
- Cursor 内：`/loop`（本机定时唤醒 Agent，见 Cursor loop skill）  
- Cursor Automations（定时 / 事件触发 Agent，适合 CI、PR 看护类任务）  
