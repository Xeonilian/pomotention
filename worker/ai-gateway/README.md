# AI Gateway（Cloudflare Worker）

按 [`docs/dev-log/blueprint/8-ai-gateway.md`](../../docs/dev-log/blueprint/8-ai-gateway.md) 实现。

## 本地

```bash
# 仓库根目录
pnpm install
pnpm gateway:dev
# → http://127.0.0.1:8787
```

前端：把 [`frontend-env.example`](./frontend-env.example) 内容拷到根目录 `.env.development.local`，再 `pnpm dev`。

`.dev.vars` 填真实密钥（旧 Moonshot key 已作废，只用新 key）。

## 路由

| 方法 | 路径 | 鉴权 |
|------|------|------|
| POST | `/v1/chat/completions` | Supabase JWT |
| POST | `/capture/map` | Supabase JWT（本关透传 chat，供以后 AiMapper） |
| POST | `/admin/entitlement` | `Authorization: Bearer <ADMIN_TOKEN>` |
| GET | `/health` | 无 |

模型固定 `moonshot-v1-8k`，忽略请求里的 `model`。
