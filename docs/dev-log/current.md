# 当前这一关

> **搞不清要干嘛、干到哪了 → 只看这个文件。**  
> 开新功能：填下面各节；收工：更新「停在哪」；做完：打勾后清空或归档到 [`history/archive/`](./history/archive/README.md)。

---

## 快照

| 项 | 内容 |
|---|---|
| **主题** | 一句记（capture）— 打字 + LLM → ledger |
| **来自** | AI 网关本关已验收（Worker 藏 key、登录配额、premium 人工开通）；复用网关做映射 |
| **蓝图** | [`7-capture.md`](./blueprint/7-capture.md)；底座 [`8-ai-gateway.md`](./blueprint/8-ai-gateway.md) |
| **分支** | `dev` |
| **更新** | 2026-07-30 |
| **停在哪** | **上一关 ai-gateway 已 OK**（本地验通 + 自己账号 premium）。本关尚未编码：下一动收窄并实现「打字提交 → Worker `/capture/map` → 写入 ledger → Gift 可见」 |

---

## 这一关要干嘛（一句话）

按 [`7-capture.md`](./blueprint/7-capture.md)：最外层输入一句 → 经已有 AI 网关 LLM 映射 → 写入 **ledger** → Gift/明细可见；映射失败不写。

---

## 分步（按顺序）

| 步 | 内容 | 产出 |
|---|---|---|
| **0** | （前置）AI 网关可用 | `worker/ai-gateway/` 已验收 |
| **1** | 收窄交互：入口 UI + 只开放 ledger kind | 方案确认 / 小改蓝图若需要 |
| **2** | AiMapper → Validator → Writer[ledger] 调网关 | `src/core/capture/` 等 |
| **3** | 联调：典型记账句写入并可在原界面改删 | 可演示 |

**本关不做：** 全 kind、真实支付渠道、身体记录。

---

## 验收标准（草案，编码前可再收窄）

1. 一句记入口可打字提交  
2. 典型记账句经 Worker 映射并写入 ledger  
3. Gift/明细可见；可在原界面改删  
4. schema / confidence / 网关 401·402·失败 → 不写，有提示  

---

## 进度

- [x] **0.** AI 网关（藏 key、配额、entitlement）本地验收通过  
- [ ] **1.** 收窄入口与 ledger-only  
- [ ] **2.** capture 核心接线  
- [ ] **3.** 联调演示  

---

## 归档

上一关（ai-gateway）快照摘要：CF Worker + 前端去 key + 月配额 + admin premium；旧 Moonshot key 已作废；模型写死 `moonshot-v1-8k`。细节见 [`8-ai-gateway.md`](./blueprint/8-ai-gateway.md)。

做完本关后把「快照 + 验收」复制到 CHANGELOG 或 PR，或移到 `history/archive/YYYY-MM-topic.md`。
