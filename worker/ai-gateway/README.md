# AI Gateway（Cloudflare Worker）

按 [`docs/dev-log/blueprint/8-ai-gateway.md`](../../docs/dev-log/blueprint/8-ai-gateway.md) 实现。开通步骤见 [`docs/dev-log/current.md`](../../docs/dev-log/current.md)。

## 本地

```bash
# 仓库根目录
pnpm install
pnpm gateway:dev
# → http://127.0.0.1:8787
```

前端：把 [`frontend-env.example`](./frontend-env.example) 内容拷到根目录 `.env.development.local`，再 `pnpm dev`。

`.dev.vars` 填真实密钥（旧 Moonshot key 已作废，只用新 key）。

## 生产部署

在 `worker/ai-gateway/`：

```bash
npx wrangler login
npx wrangler kv namespace create AI_KV
# 把返回的 id 写进 wrangler.toml 的 [[kv_namespaces]] id
npx wrangler secret put MOONSHOT_API_KEY
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_JWT_SECRET
npx wrangler secret put ADMIN_TOKEN
npx wrangler deploy
```

记下生产 URL（形如 `https://pomotention-ai-gateway.<account>.workers.dev`）。浏览器打开 `GET /health` 应返回 `ok`。

正式前端根目录环境变量：`VITE_AI_WORKER_URL=<该 URL>`（无末尾斜杠），然后重新部署 Pages / 打桌面包。

可选 vars（`wrangler.toml` `[vars]`）：`FREE_MONTHLY_QUOTA`（默认 20）、`PREMIUM_MONTHLY_QUOTA`（默认 2000）。

## 路由

| 方法 | 路径 | 鉴权 |
|------|------|------|
| POST | `/v1/chat/completions` | Supabase JWT |
| POST | `/capture/map` | Supabase JWT（本关透传 chat，供以后 AiMapper） |
| POST | `/admin/entitlement` | `Authorization: Bearer <ADMIN_TOKEN>` |
| GET | `/health` | 无 |

模型固定 `moonshot-v1-8k`，忽略请求里的 `model`。  
月配额：免费 20；premium 2000。超限 402，`QUOTA_EXHAUSTED` 或 `PREMIUM_QUOTA_EXHAUSTED`。

## 人工开通 SOP

1. 用户付款后，在 [Supabase Dashboard → Authentication](https://supabase.com/dashboard) 用 **登录邮箱** 查 User UID（即 `user_id`）。
2. `until` 按付款月数加日历月（包月 +1，包年 +12），ISO8601。

```bash
curl -X POST "$WORKER_URL/admin/entitlement" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<uuid>","plan":"premium","until":"2026-09-17T00:00:00.000Z"}'
```

成功返回 `{ ok: true, user_id, entitlement }`。用户无需重装客户端，下一句记即可走 premium。
