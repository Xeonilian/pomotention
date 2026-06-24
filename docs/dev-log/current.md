# 当前这一关

> **搞不清要干嘛、干到哪了 → 只看这个文件。**  
> 开新功能：填下面各节；收工：更新「停在哪」；做完：打勾到第 6 步后清空或归档。

---

## 快照

| 项         | 内容                                                                 |
| ---------- | -------------------------------------------------------------------- |
| **主题**   | ledger v1（功能「记账兼容」的一小片，不是整功能）                    |
| **来自**   | [roadmap · 执行顺序 #1](../../guide/intro/roadmap.md)                |
| **规模**   | ≤2 个下午；到点验收不过就砍 scope，不拖关（本周 2～3 关节奏）       |
| **格式**   | **beancount**（v1 只这一种；hledger 放下一关）                       |
| **分支**   | _（步 1：`feat ledger-v1`，尚未开）_                                 |
| **更新**   | 2026-06-24                                                           |
| **停在哪** | 步 0 已填；dev-log harness 在 `docs/dev-log-harness` 待合 main；ledger 未开分支 |

---

## 这一关要干嘛（一句话）

从 Task 书写区样例文本解析 **beancount** ledger 行，提供 **一键复制** 到剪贴板；不做预览 UI、第二种格式、账套。

---

## 验收标准（3 条，可验证）

1. 内置 **≥3 组** Task 样例文本，解析结果均为合法 beancount 行（开做前样例写在测试里）
2. 用户触发复制后，粘贴到外部编辑器内容与预期 **逐字一致**
3. `pnpm build:fast` 通过

---

## 风险评估

- **[S2 C1 UV0]**
- **最小证据**（按矩阵，做完打勾）：
  - [ ] 测试：`__tests__/ledger` 或同级 — 覆盖 ≥3 种样例解析 + 复制输出
  - [x] `contracts.md`：不需要（UV0）
  - [x] `ui-checks.md`：不需要（UV0；若加可见按钮再议）

---

## 进度（按顺序，不要跳步）

- [x] **0.** 本文件已填：一句话 + 3 条验收 + S/C/UV
- [ ] **1.** `pnpm new:branch feat ledger-v1`（从合入 harness 后的 `main`/`dev` 开）
- [ ] **2.** 实现核心逻辑（解析 + 复制；可跨多个下午，进度写「停在哪」）
- [ ] **3.** 证据固定（测试 / contract / ui-checks，按上节矩阵）
- [ ] **4.** `pnpm new:pr` → 合并
- [ ] **5.** 清理本地分支；[roadmap 队列](../../guide/intro/roadmap.md) 删掉本关或移下一关
- [ ] **6.** 若发版：`skill-changelog` 更新 CHANGELOG；**本文件重置**开下一关

---

## 备注

- **ledger 整功能** 还多关（hledger、预览等）；本关只做 beancount + 复制。
- 更长的构想见 [`meta/notes/vision.md`](./meta/notes/vision.md)；**timer 线不进 current**。
- 与 AI 开聊前：「先读 `docs/dev-log/current.md`，告诉我下一步该做哪一步。」

---

## 归档

做完后把「快照 + 验收 + 结果」复制到 CHANGELOG 或 PR，然后 **删掉上方填写的快照内容**，只保留本模板说明；或整段移到 `current-archive/YYYY-MM-topic.md`（可选，不强制）。
