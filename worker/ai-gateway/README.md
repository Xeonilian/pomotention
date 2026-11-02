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
npx wrangler secret put AFDIAN_WEBHOOK_TOKEN
npx wrangler deploy
```

生产自定义域：`https://gateway.pomotention.com`（Worker Custom Domain；旧 `*.workers.dev` 可留作回退）。浏览器打开 `GET /health` 应返回 `ok`。

正式前端：`VITE_AI_WORKER_URL=https://gateway.pomotention.com`（无末尾斜杠），然后重新部署 Pages / 打桌面包。

可选 vars（`wrangler.toml` `[vars]`）：`FREE_MONTHLY_QUOTA`、`PREMIUM_MONTHLY_QUOTA`、`AFDIAN_SYNC_PLAN_MONTH`、`AFDIAN_SYNC_PLAN_YEAR`、`AFDIAN_TIP_PLAN_IDS`。

## 路由

| 方法 | 路径 | 鉴权 |
|------|------|------|
| POST | `/v1/chat/completions` | Supabase JWT |
| POST | `/capture/map` | Supabase JWT（本关透传 chat，供以后 AiMapper） |
| GET | `/v1/entitlement` | Supabase JWT |
| POST | `/admin/entitlement` | `Authorization: Bearer <ADMIN_TOKEN>` |
| GET | `/admin/afdian-order` | `Authorization: Bearer <ADMIN_TOKEN>`；`?out_trade_no=` 或 `?user_id=` |
| POST | `/webhooks/afdian?k=...` | 查询参数 `k` = `AFDIAN_WEBHOOK_TOKEN` |
| GET | `/health` | 无 |

### 爱发电 Webhook

1. 部署 Worker，并配置 `AFDIAN_WEBHOOK_TOKEN` + 同步 `plan_id` vars（与前端一致）。
2. 爱发电开发者后台通知地址填：  
   `https://gateway.pomotention.com/webhooks/afdian?k=<你的 token>`
3. 软件内下单（带 `custom_order_id`）→ 先写 KV 留痕 `afdian:order:<订单号>`（固定 `until`）再写 `entitlement:sync:<uuid>`；重试只补齐不叠月。打赏 plan 仅记单不开通。
4. 本地冒烟：

```bash
curl -s -X POST "http://127.0.0.1:8787/webhooks/afdian?k=$AFDIAN_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"ec\":200,\"em\":\"ok\",\"data\":{\"type\":\"order\",\"order\":{\"out_trade_no\":\"test-1\",\"custom_order_id\":\"<uuid>\",\"plan_id\":\"<同步plan>\",\"month\":1,\"status\":2,\"total_amount\":\"9.00\"}}}"
```

应返回 `{"ec":200,"em":"ok"}`（或 `duplicate`）。

查留痕（按订单号或用户 uuid）：

```bash
curl -s "$WORKER_URL/admin/afdian-order?out_trade_no=test-1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
curl -s "$WORKER_URL/admin/afdian-order?user_id=<uuid>" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

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
