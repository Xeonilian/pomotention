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
| POST | `/admin/entitlement` | `Authorization: Bearer <ADMIN_TOKEN>`；sync 优先 `extend_days` / `extend_months`（叠试用） |
| GET | `/admin/afdian-order` | `Authorization: Bearer <ADMIN_TOKEN>`；`?out_trade_no=` 或 `?user_id=`；含 `trial_until` |
| POST | `/webhooks/afdian?k=...` | 查询参数 `k` = `AFDIAN_WEBHOOK_TOKEN` |
| GET | `/health` | 无 |

### 爱发电 Webhook

1. 部署 Worker，并配置 `AFDIAN_WEBHOOK_TOKEN` + 同步 `plan_id` vars（与前端一致）。
2. 爱发电开发者后台通知地址填：  
   `https://gateway.pomotention.com/webhooks/afdian?k=<你的 token>`
3. 软件内下单（带 `custom_order_id`）→ 先写 KV 留痕 `afdian:order:<订单号>`（固定 `until`）再写 `entitlement:sync:<uuid>`；`until` 从 `max(现在, 付费, 试用终点)` 起加日历月；重试只补齐不叠月。打赏 plan 仅记单不开通。
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

## 人工开通 SOP（云同步）

1. 用户付款后，在 [Supabase Dashboard → Authentication](https://supabase.com/dashboard) 用 **登录邮箱** 查 User UID（即 `user_id`）。
2. **先查**现有付费与试用终点（勿盲写绝对 `until`，会吞试用剩余）：

```bash
curl -s "$WORKER_URL/admin/afdian-order?user_id=<uuid>" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# → sync_entitlement.until / trial_until
```

3. **相对延期**（推荐）：服务端起点 = `max(现在, 付费 until, 试用终点)`，再叠天数或日历月。包月 `extend_months:1`，年付 `12`，或按天 `extend_days`。

```bash
curl -X POST "$WORKER_URL/admin/entitlement" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<uuid>","scope":"sync","extend_months":12}'
# 或 {"user_id":"<uuid>","scope":"sync","extend_days":365}
```

成功返回含 `mode` / `base` / `from.trial_until` / `entitlement.until`。用户无需重装，下次拉权益即可。

- **禁止**同请求混用 `extend_*` 与 `until`。
- 绝对 `until`（`mode: absolute`）仅用于纠错覆盖；爱发电 webhook 开通同样从试用/付费终点起算，不吞试用。
- 只发 `scope:sync` 且不带 `extend_*`/`until` → 清除付费同步权益。

## 人工开通 SOP（一句记 AI）

```bash
curl -X POST "$WORKER_URL/admin/entitlement" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<uuid>","plan":"premium","until":"2026-09-17T00:00:00.000Z"}'
```

成功返回 `{ ok: true, user_id, entitlement }`。下一句记即可走 premium。
