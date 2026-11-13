---
name: extend-sync
description: >-
  Grants or extends Pomotention cloud-sync entitlement via admin API
  (extend_months / extend_days). Use when user @mentions this skill or asks to
  开通/延期同步 with a user uuid and duration (1年 1月 1y 1m 1 year 1 month).
  Sync only — never AI premium.
---

# 云同步人工延期

给用户 **云同步**（`scope:sync`）相对延期。**不开** 一句记 AI。

## 输入

用户提供：

1. **user_id** — Supabase Auth UUID（支持弹窗「复制账号」）
2. **时长** — 见下表；缺一则先问，勿猜

| 用户写法（大小写不敏感） | API |
| --- | --- |
| `N年` / `Ny` / `N year` / `N years` | `extend_months: N*12` |
| `N月` / `Nm` / `N month` / `N months` | `extend_months: N` |
| `N天` / `Nd` / `N day` / `N days` | `extend_days: N` |

示例：`1年` `1月` `1y` `1m` `1 year` `1 month` → 年用 12 个月、月用 1 个月。

- `m` = **月**，不是分钟。
- 禁止默认写绝对 `until`；禁止同请求混 `extend_*` 与 `until`。
- 用户说清除同步权益：另议，本 skill 默认只延期。

## Token / URL

- `WORKER_URL`：`https://gateway.pomotention.com`（无末尾 `/`）
- `ADMIN_TOKEN`：读 `worker/ai-gateway/.dev.vars` 的 `ADMIN_TOKEN=`  
  **绝不**打印、写入聊天或 commit。缺 token → 停，提示补 `.dev.vars`。

## 步骤（按序）

1. 解析 uuid + 时长 → `extend_months` 或 `extend_days`（互斥）。
2. **先查**：

```powershell
# PowerShell；$tok 来自 .dev.vars，勿 echo
Invoke-RestMethod -Uri "$WORKER_URL/admin/afdian-order?user_id=$uid" `
  -Headers @{ Authorization = "Bearer $tok" }
# 记下 sync_entitlement.until / trial_until
```

3. **延期**：

```powershell
$body = @{ user_id = $uid; scope = "sync"; extend_months = 12 } | ConvertTo-Json
# 或 extend_days = N（不要同时带 months）
Invoke-RestMethod -Uri "$WORKER_URL/admin/entitlement" -Method POST `
  -Headers @{ Authorization = "Bearer $tok"; "Content-Type" = "application/json" } `
  -Body $body
```

4. **再查**核对 `sync_entitlement.until`。
5. 向用户回报：`user_id`、mode、base、旧 paid/trial、新 `until`。说明下次打开账号/Support 弹窗即可刷新。

## 安全

- 仅操作用户给出的 uuid；勿改其它人。
- 响应里若含敏感头/token，摘要时剥掉。
- 细节 SOP 见 [`worker/ai-gateway/README.md`](../../../worker/ai-gateway/README.md)「人工开通 SOP（云同步）」。
