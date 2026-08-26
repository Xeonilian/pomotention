# 当前这一关

> **搞不清要干嘛、干到哪了 → 只看这个文件。**  
> 开新功能：填下面各节；收工：更新「停在哪」；做完：打勾后清空或归档到 [`history/archive/`](./history/archive/README.md)。

---

## 快照

| 项 | 内容 |
|---|---|
| **主题** | 收费底座第一刀 — 线上网关 + 爱发电价目/升级面 + 人工开通闭环（能卖试用） |
| **来自** | 一句记第一刀已通；目的是「有 AI 的软件能被人购买」；roadmap「收费 + 推广」 |
| **蓝图** | 底座 [`8-ai-gateway.md`](./blueprint/8-ai-gateway.md)；能力 [`7-capture.md`](./blueprint/7-capture.md) |
| **分支** | `dev` |
| **更新** | 2026-08-26 |
| **停在哪** | 爱发电认证过了；Cloudflare（Worker + Pages 变量）你说已完成。记一句 brain 按钮和设置「解锁高级功能」**先藏着**（`CAPTURE_UI_ENABLED=false`），打赏仍走顶栏咖啡。本关还没收：真付费开通你还没走通。Webhook 仍是下一关，现在不写。 |

---

## 这一关要干嘛（一句话）

让 **真用户** 能用上线上一句记，额度用尽时 **看得见怎么买（爱发电订阅）**，你收款后 **人工开通立刻生效**。  
目的 = 能卖试用；本关人工开通。Webhook 自动开通是 **下一关（B）**，设计已写在本文件，本关不写 webhook 代码。

---

## 今日已对齐（备忘，明天勿重新绕）

### 目的与边界

- **卖的是：** 登录用户的 AI 一句记额度 / premium 权益。
- **本关成功标准：** 「有人付钱 → 你开通 → 他能用」可演示；帮助 / README / 软件内能看到付费链接。
- **不绑：** 扩 capture kind、改删、CLI、大规模推广投放、爱发电 OAuth、软件内「我已赞助」。
- **付款入口：** 爱发电（撤回此前否决）。地图要先闭合、货仍按 A 发：B 的身份对账写在「下一关」，A 的开通链接已带 `custom_order_id`。
- **打赏 9 元：** 支持开发 + 每月 top3 手绘卡；**不是软件权益**，不写 premium。

### 与上一关的关系

- 本地记一句已通（`localhost:1420` → `127.0.0.1:8787`）。生产 Worker：`https://pomotention-ai-gateway.zhengws.workers.dev`。
- Cloudflare 你已完成（Worker + Pages 变量）。权益仍写 KV；开通仍走 `POST /admin/entitlement`。

### 价目与额度（开写前先定死写在本文件）

| 项 | 本关取值 |
|---|---|
| 免费月额度 `FREE_MONTHLY_QUOTA` | **20** |
| 订阅 | **19 元 / 月**（年付用爱发电自己的打折，不另定价） |
| 打赏 | 默认 **9 元**；非权益 |
| 付款入口 | **爱发电** https://afdian.com/a/xeonilian |
| premium 月上限 `PREMIUM_MONTHLY_QUOTA` | **2000**（防乱用；仍受限流） |

### 付款与开通（本关人工）

- **软件内已登录：** 「去开通」打开爱发电并带 `custom_order_id=<Supabase uuid>`（用户不用看见 uuid）。
- **站外（帮助 / 小红书 / 爱发电主页）：** 留言填 **软件登录邮箱**；你在 Supabase Authentication 用邮箱查 uuid，再 admin 开通。
- **你侧：** 到账后当日/24h 内，用 `ADMIN_TOKEN` 写 `premium` + `until`。
- **打赏：** 不当开通；只记赞助、每月 top3 寄卡。

### 升级提示

- 402 `QUOTA_EXHAUSTED` → 价（19/月）+ 爱发电 **订阅** 链接（不指向打赏）。
- 402 `PREMIUM_QUOTA_EXHAUSTED` → 本月额度用尽，不引导再付。
- 未登录 / 401 → 引导登录。
- 打赏入口在顶栏咖啡图标 + 帮助页。设置「解锁高级功能」与顶栏 brain **先藏**，走通人工开通后再开。

---

## 分步（按顺序）

| 步 | 内容 | 产出 |
|---|---|---|
| **0** | 定价目、爱发电、打赏非权益；写进本文件 | 决策已定 |
| **1** | Cloudflare 部署 `ai-gateway`：secret（Moonshot / JWT / Admin）、KV；记下生产 URL | 线上 `/health` 通 |
| **2** | 正式前端 `VITE_AI_WORKER_URL` 指向生产；打开记一句入口；冒烟：登录 → 记一句成功 | 真用户不依赖本机 8787 |
| **3** | 升级面价目 + 爱发电订阅链接（已登录带 uuid）；设置里订阅+打赏；帮助/README；admin SOP | 可卖演示剧本 |
| **4** | 端到端手测：耗尽 → 见升级 → 你开通 → 再记一句成功 | 关可收 |

**本关不做：** webhook、官方微信/支付宝商户、entitlement 迁 Supabase、扩 capture kind、改删、CLI、旧 AiChat 重开、top3 发卡片自动化。  
**本关要做：** 爱发电链接与文案 + 人工 Admin 开通；`PREMIUM_MONTHLY_QUOTA=2000`；开通 URL 带 `custom_order_id`。

### 下一关（B）· 身份对账已设计，认证通过后开票

两个 ID 不要混：软件 uuid = Supabase `sub`；爱发电 `user_id` 不能当软件 uuid。

爱发电文档：[Webhook 与 API](https://ifdian.net/p/9c65d9cc617011ed81c352540025c377)（同 [guide.afdian.com](https://guide.afdian.com/creator/developer)）。平台 **没有**「拿激活码换你们软件权益」的接口；激活码是创作者自己写的一行字，付款后用 **随机自动回复** 私信发出。核销要自己做。另：`redeem_id` 是爱发电自己的会员兑换码（订单金额可为 0），不是给 App 填的码。

三条履约（推荐组合）：

1. **已绑定（主路径）：** 软件内跳转带 `custom_order_id=uuid` → webhook 写 `premium`，`until` = 现在 + `order.month`。用户不用填码。
2. **未绑定认领：** 站外付款后，已登录用户在设置里粘贴 **订单号 `out_trade_no`**（或私信里那一行）。Worker 用 `query-order` 验 `status=2` + 订阅 `plan_id`，按 `out_trade_no` 幂等绑到当前 JWT。不要预生成一堆游戏式激活码再进「随机自动回复」——订阅按月续费，库存和年付月数都难管；`query-random-reply` / `update-plan-reply` 是发码补货用的，留给真·序列号商品。
3. **打赏 `plan_id`：** webhook 直接 200，不写权益。

Worker：`POST /webhooks/afdian` 验签；`POST /v1/redeem` 需 JWT。保留 admin。

本关仍不做 webhook / 填码页 / OAuth / 按邮箱自动查用户。

---

## 验收标准（草案）

1. 生产 Worker 可被正式前端调用；登录用户能完成至少一次一句记（不靠本地 wrangler）。  
2. 额度用尽时：提示含 **19 元/月 + 爱发电订阅链接**，不是空泛「请升级」；打赏不出现在这条升级按钮上。  
3. 用 `ADMIN_TOKEN` 给指定 `user_id` 写 `premium` + `until` 后，该账号立刻可继续用。  
4. 帮助、README、设置里能看到订阅与打赏；包月文案写清「现在买到什么 / 还在做的」。  
5. 有一份开通 SOP：别人付款后你能在几分钟内开通。  

---

## 进度

- [x] **0.** 价目 19/月、打赏非权益、爱发电重开，写入本文件
- [x] **1.** Worker 部署上云 + secret；KV；`/health` 通
- [x] **2.** Cloudflare 完成（你确认）；预览站记一句若不熟，手测时顺带点一次
- [x] **3.** 升级文案 + 设置支持开发 + 帮助/README + 开通 SOP（仓库已有）
- [ ] **4.** 认路 + 端到端「付钱→你人工开通→能用」（认证已过；自动开通仍是下一关）
- [x] 对外入口先藏：brain + 设置「解锁高级功能」（`CAPTURE_UI_ENABLED=false`）；打赏咖啡仍开
- （下一关 B）爱发电 webhook — 认证过了可以开票，但本关先走通人工

---

## 现有页面（仓库已有，认路用，不是新做）

付钱之后软件不会自己变 premium。本关是：**用户去爱发电付 → 你按 SOP curl 开通 → 他再记一句。**

| 用户看见 | 在哪 | 干什么 |
|---|---|---|
| 解锁高级功能 | 设置 | **先藏。** 代码还在，开 `CAPTURE_UI_ENABLED` 后：订阅 19 元/月，带登录 uuid 去爱发电 |
| 记一句 | 顶栏 brain | **先藏。** 同一开关 |
| 打赏 | 顶栏咖啡图标 | 默认 9 元下单页；**不** 开通额度；手绘卡 |
| 升级 | 一句记额度用尽（402） | 入口藏着时用户走不到；开入口后只给 19 元/月订阅链接，不指向打赏 |
| 说明 | 帮助 [`support.md`](../../guide/intro/support.md) | 买到什么、站外怎么对邮箱 |
| 你开通 | 终端 `POST /admin/entitlement` | 下面 SOP；没有「后台点一下」的页面 |

下一关才做：webhook 自动开通、设置里填订单号。本关不要开始写那些。

---

## 你要做的（手工，按顺序）

1. **爱发电两档**（认证已过）：19 元/月订阅；打赏默认 9 元。帮助页「买到什么 / 还在做的」贴到订阅说明。
2. **手测步 4：** 要测记一句/订阅时先把 `CAPTURE_UI_ENABLED` 设回 `true`。登录 → 耗尽试用（或自己打满）→ 见升级 → 点订阅 → 按 SOP 开通 → 再记一句成功。顺带点开顶栏咖啡和帮助页，对上表。
3. 预览站 [https://dev.pomotention.pages.dev](https://dev.pomotention.pages.dev) 若还没点过记一句，手测时一起。
4. 小红书 / 爱发电主页贴帮助页可复制段落（可手测后再贴）。

开通 SOP 摘要：Supabase Dashboard → Authentication → 用登录邮箱查 User UID →  
`WORKER_URL=https://pomotention-ai-gateway.zhengws.workers.dev`

```bash
curl -X POST "$WORKER_URL/admin/entitlement" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<uuid>","plan":"premium","until":"2026-09-17T00:00:00.000Z"}'
```

`until` 按付款月数加日历月（包月 +1 月，包年 +12 月）。

---

## 归档

做完后把「快照 + 验收」复制到 CHANGELOG 或 PR，或移到 `history/archive/YYYY-MM-topic.md`。
