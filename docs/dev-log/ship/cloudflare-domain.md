# Cloudflare 自定义域名 · 对照与操作

与本仓库相关的域名 / DNS / Worker 门牌。帮助跳转见 [`help-docs-cloudflare.md`](./help-docs-cloudflare.md)；网关设计见 [`../blueprint/8-ai-gateway.md`](../blueprint/8-ai-gateway.md)。进度与选型仍以 [`../current.md`](../current.md) 为准。

---

## 1. 名词对照（本仓库）

| 词 | 含义 | 现状示例 |
|----|------|----------|
| 根域名 | 买到的名字本身 | `example.com`（需自购） |
| 子域名 | 根下的前缀 | `www` / `docs` / `gateway` —— 买域时不自带，DNS 自加 |
| DNS | 名字 → 指到哪 | 托管在 Cloudflare 时由控制台管 |
| Worker | 边缘上的后端小服务 | `worker/ai-gateway`，Wrangler 部署 |
| `*.workers.dev` | CF 免费入口 | `pomotention-ai-gateway.<account>.workers.dev` |
| `*.pages.dev` | Pages 免费入口 | 主站 / 文档站各一 |
| 自定义域名 | 自有名绑到 Worker 或 Pages | 解决国内打不开 `workers.dev` 时用 |

**网关：** App 先打 Worker（藏厂商 key、验 JWT、配额 / 同步权益），数据同步本身仍走 Supabase。权益查有客户端缓存；同步内容不经 Worker 转发。

**`.com` 归属：** 经注册商（含 Cloudflare Registrar）按年登记，属持有人；不是 CF 借出的后缀。停用 CF 解析 / 备案 / 转注册商，域名仍在（按时续费）。会丢掉的是 `workers.dev` / `pages.dev` 这类平台名。

---

## 2. 为啥要动域名

| 现象 | 原因 | 常见补法 |
|------|------|----------|
| 国内打不开 Worker | `workers.dev` 连通性差 | 自有域绑 Worker Custom Domain；或权益改查 Supabase（见 current 备选） |
| 查权益失败 | 前端 fail-open | 付费墙对连不上的用户形同虚设 |
| 多 Pages 门牌不一致 | 各用 `*.pages.dev` | 同一根域下分子域 |

备案：管的是「境内接入上的网站」= 主体 + 域名 + 国内接入商；不是备访客。域名只指 CF / 海外时，一般不是「先备案才能绑 Worker」。以后挂国内机房再走备案；备案不没收 `.com`。

---

## 3. 子域规划（同一根域）

| 用途 | 建议 | 绑到 |
|------|------|------|
| 主站 / PWA | apex 或 `app.` | Pages 主应用 |
| 帮助（外链方案） | `docs.` / `help.` | 文档 Pages；主站设 `VITE_HELP_DOCS_URL` |
| AI / 权益网关 | `gateway.` / `api.` | Worker `ai-gateway` |
| 预览（可选） | `dev.` | Pages Preview |

帮助也可同源 `/docs-app/`（无独立子域）——见 help-docs SOP-B。

---

## 4. 操作要点（Worker 自定义域）

1. 注册商买 **1 年**根域（按可能不退准备；下单页看退款条款）。
2. 域名 DNS 进本 Cloudflare 账号（Registrar 买的通常已在）。
3. Worker → Custom Domain → 填子域（如 `gateway.example.com`）。
4. 生产 `WORKER_URL` / 相关 env 改新 URL，**重新部署**前端。
5. 测通标准见下节。

Pages 自定义域：各 Pages 项目分别绑；与 Worker 可共用一根域、不同子域。

---

## 5. 怎么算测通

**测的是「国内用户能否打到门牌」，不是只 ping。**

| 步骤 | 通过条件 |
|------|----------|
| 免费基线 | 国内网络（各运营商 / 4G，无代理）打开现有 `…workers.dev/health` —— 确认问题仍在 |
| 自定义域 | 同上条件打开 `https://<gateway域>/health` → 与线上一致的 ok |
| 产品路径 | 前端已指新 URL：登录后权益 / 一句记请求成功，而非因网络 fail-open |

DNS 刚改时可能有传播延迟。本机或可访问 `workers.dev` 的环境测通，**不算**解决国内问题。

无法零成本证明「换门牌就通」；只能零成本证明「旧门牌不通」。一年域名费按基建实验预算即可。

---

## 6. 解析链路：谁在答、坑在哪、CF 改得了什么

买 `.com` / 权威区配置正确 ≠ 国内一定通。口语「解析不上」常把 **DNS 失败** 和 **解析对了但 TCP/TLS 走不通** 混在一起。

### 6.1 问了之后谁在解析

浏览器一般不直连 CF 权威，而是：

```text
浏览器 → 本机/路由 → 递归解析器（运营商 DNS 或 223.5.5.5 / 8.8.8.8 等）
  → 逐级问到该区的权威 DNS
  → workers.dev / 自有域的权威由 CF（或你指定的 DNS 托管方）作答
  ← 递归器缓存后转述给你 → 你再拿 IP 去连
```

| 角色 | 职责 | 谁控 |
|------|------|------|
| 权威 DNS | 正式答案（这名应指哪） | `workers.dev` 区在 **CF**；自有域在你选的 DNS 托管方 |
| 递归 DNS | 代查、缓存、转述 | ISP / 公共 DNS |
| 网络路径 | 按 IP 做 TCP/TLS | 运营商与中间链路 |

权威正确 ≠ 你听到的转述正确 ≠ 连得上。

### 6.2 为何像「专门整 workers.dev」

不是 CF 在权威里故意给中国错答案，也不是「没买 .com 所以 DNS 体系失效」。干扰/劣化可按 **主机名后缀或目标特征** 生效：`*.workers.dev` 是特征明显的公共免费入口，国内路径常差；`gateway.你的.com` 是另一套名字，不一定套同一规则。

```text
同一 Worker（同一栋楼）
  ├─ 门 A：*.workers.dev     → 国内常卡住（解析脏 / 或解析对但连不上）
  └─ 门 B：gateway.你的.com → 往往好走得多（仍要实测）
```

换自定义域 = **换门牌试同一栋楼**，不是 CF「终于肯解析对」。

### 6.3 国内挂时更像哪一种

| 类型 | 表现 | 优先怀疑 |
|------|------|----------|
| 转述脏了 | 权威对，递归给错 IP / 无响应 / 假失败 | 中间 DNS，不是 CF 权威写错 |
| 路不通 | 名字→正确 IP，HTTPS 超时/重置 | 链路干扰；口语也说「解析不上」 |
| CF 权威挂 | 全球都怪、状态页红 | 少见；才像 CF 自身故障 |
| 自己配错 | 仅新域不行；可访问环境下旧 `workers.dev` 仍正常 | NS / 记录 / 未绑 Custom Domain / 前端仍写旧 URL |

### 6.4 CF 能改什么、不能改什么

**能改：** `workers.dev` 权威记录、Anycast 目标、证书与 Worker 路由、产品上推自定义域。  
**改不了：** 中国递归是否忠实转发、缓存是否被污染、路径是否放行。改权威 ≠ 国内每条链路自动变好。

`.com` 解决的是门牌归谁、你能否自配指路；国内通不通取决于指路、绑定、以及该路径好不好走——要按 §5 测。

---

## 7. 相关指针

| 主题 | 去哪 |
|------|------|
| 帮助跳转 / `VITE_HELP_DOCS_URL` | [`help-docs-cloudflare.md`](./help-docs-cloudflare.md) |
| Worker 路由 / secret / 配额 | [`../blueprint/8-ai-gateway.md`](../blueprint/8-ai-gateway.md) |
| 同步权益、fail-open、是否迁 Supabase | [`../current.md`](../current.md) |
| 本地 / 部署 Worker | `worker/ai-gateway/README.md` |
