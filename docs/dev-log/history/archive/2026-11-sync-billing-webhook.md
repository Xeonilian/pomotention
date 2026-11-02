# 归档 · 云同步收费 + 爱发电 webhook + .com 门牌（2026-11）

> 自 [`current.md`](../../current.md) 移出。用户可见发版见 CHANGELOG `v0.6.13`（收费底座）/ `v0.6.14`（webhook + 门牌）。蓝图：[`../../blueprint/8-ai-gateway.md`](../../blueprint/8-ai-gateway.md)。PR：#142（收费）、#143（webhook / com / 同步修复）。

## 快照（归档时）

| 项 | 内容 |
|---|---|
| **主题** | 收费底座：云同步试用/订购 + 爱发电 webhook 自动开通；对外切 `pomotention.com` |
| **分支** | `dev` → `main`（#143 squash） |
| **版本** | `0.6.13` / `0.6.14` |
| **停在哪** | 代码与 Worker 已通；爱发电后台填通知 URL 仍提示「功能维护中」——恢复后填 `https://gateway.pomotention.com/webhooks/afdian?k=…`。真单暂人工开通。未做：`/v1/redeem`。 |

## 这一关做了啥

1. **云同步权益**：`GET /v1/entitlement`；试用 14 天起点存 KV；到期停同步不登出；fail-open；SupportDialog 价目（月 9 / 年付 49 首年回馈）。
2. **Webhook**：`POST /webhooks/afdian` 验签开通 sync；订单键留痕幂等；`GET /admin/afdian-order` 查询；SupportDialog 可复制 uuid。
3. **门牌**：`gateway` / 主站 / docs / preview 对齐 `pomotention.com`；ship 文档。
4. **同步/UI 修复**：删日程可上传、倒计时 unwrap、日视图生活打点隐藏、触控 passive；同步失败不再弹原始错误通知（底栏红字 + 账号按钮变黄保留）。

## 进度（归档时）

- [x] 同步收费底座 + 试用 KV + 订购面
- [x] `pomotention.com` reachability
- [x] Webhook deploy + 本地 curl 冒烟
- [x] CHANGELOG / 版本号 `0.6.14` + PR #143
- [ ] 爱发电后台通知 URL（平台「功能维护中」）
- [ ] `/v1/redeem`（填订单号认领）
- [ ] 端到端真单：付钱 → 自动/人工开通 → 同步恢复

## 本关未做（留给后续）

- 爱发电通知 URL 恢复后填上并真单验收
- `POST /v1/redeem` 未绑定认领
- 年付回馈档到期（2026-11）改回 99 并改 SupportDialog 文案
- 可选：`www` / `VITE_HELP_DOCS_URL` 收尾
