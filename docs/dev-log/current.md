# 当前这一关

> **搞不清要干嘛、干到哪了 → 只看这个文件。**  
> 开新功能：填下面各节；收工：更新「停在哪」；做完：打勾后清空或归档到 [`history/archive/`](./history/archive/README.md)。

---

## 快照

| 项 | 内容 |
|---|---|
| **主题** | AI 网关（ai-gateway） |
| **来自** | capture 要调 LLM，但旧 Kimi key 硬编码在前端被盗刷；须先藏 key + 登录配额再写一句记 |
| **蓝图** | [`8-ai-gateway.md`](./blueprint/8-ai-gateway.md)（能力全表）；下游一句记见 [`7-capture.md`](./blueprint/7-capture.md) |
| **分支** | `dev` |
| **更新** | 2026-07-30 |
| **停在哪** | 蓝图已定（含补丁）。下一动：搭 CF Worker + 删硬编码 key + 登录后经 Worker 调通 Kimi（可先用 `/v1/chat/completions` 或最小 `captureMap` 测通）。**不做** 一句记 UI / ledger 写入 / 真实支付 |

---

## 这一关要干嘛（一句话）

按 [`8-ai-gateway.md`](./blueprint/8-ai-gateway.md)：Cloudflare Worker 藏 Moonshot key，Supabase 已验证登录用户可调 LLM，有月度免费配额与 entitlement seam；前端不再持真实 key。

---

## 分步（按顺序）

| 步 | 内容 | 产出 |
|---|---|---|
| **0** | 蓝图写清（Worker、配额、付费 seam、token 保护） | `8-ai-gateway.md` |
| **1** | 搭 Worker + secrets/KV；本地 `wrangler dev` 联调 | `worker/ai-gateway/` |
| **2** | 前端去硬编码 key，经 JWT + `WORKER_URL` 调通 Kimi | 可测通的调用路径 |
| **3** | 配额计数 + 402/`QUOTA_EXHAUSTED`；admin 写 entitlement（人工开通） | 门闩可测 |

**本关不做：** capture 输入框、AiMapper→ledger、价目/微信支付宝/应用商店接入。那些是下一关或收费关。

---

## 验收标准

1. 真实 `MOONSHOT_API_KEY` 只在 Worker secret / `.dev.vars`，不在 JS bundle / 默认 settings  
2. 未登录或未验证账号 → 调不通（401）  
3. 已验证登录 → 经 Worker 能成功完成至少一次 Kimi 调用  
4. 免费配额用尽 → 402 + `QUOTA_EXHAUSTED`（可用测小号或把额度调成 1 验证）  
5. `POST /admin/entitlement` 能把某用户写成 premium（人工），之后不受免费配额限制（仍受限流）

---

## 进度

- [x] **0.** `8-ai-gateway.md` 初稿 + 补丁  
- [ ] **1.** Worker + 本地联调  
- [ ] **2.** 前端去 key、调通 Kimi  
- [ ] **3.** 配额 + entitlement 人工开通  

---

## 归档

做完后把「快照 + 验收」复制到 CHANGELOG 或 PR，然后清空上方填写内容，或移到 `history/archive/YYYY-MM-topic.md`。  
下一关再开 current：一句记（打字 + LLM → ledger），复用本关网关。
