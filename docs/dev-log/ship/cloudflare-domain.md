# Cloudflare 自定义域名 · 对照与操作

与本仓库相关的域名 / DNS / Worker 门牌。帮助跳转见 [`help-docs-cloudflare.md`](./help-docs-cloudflare.md)；网关设计见 [`../blueprint/8-ai-gateway.md`](../blueprint/8-ai-gateway.md)。进度与选型仍以 [`../current.md`](../current.md) 为准。

**根域：** `pomotention.com`（阿里云注册；DNS Nameserver 指到 Cloudflare）。

---

## 1. 名词对照（本仓库）

| 词 | 含义 | 本项目 |
|----|------|--------|
| 根域名 | 买到的名字本身 | `pomotention.com`（阿里云） |
| 子域名 | 根下的前缀 | DNS 自加，见 §3 |
| DNS | 名字 → 指到哪 | Nameserver 托管在 Cloudflare |
| Worker | 边缘上的后端小服务 | `worker/ai-gateway`，Wrangler 部署 |
| `*.workers.dev` | CF 免费入口（保留作回退） | `pomotention-ai-gateway.zhengws.workers.dev` |
| `*.pages.dev` | Pages 免费入口（保留作回退） | 技术上仍通；**对外文案已不用** |
| 自定义域名 | 自有名绑到 Worker / Pages | 生产默认门牌 |

**网关：** App 先打 Worker（藏厂商 key、验 JWT、配额 / 同步权益），数据同步本身仍走 Supabase。权益查有客户端缓存；同步内容不经 Worker 转发。

**`.com` 归属：** 经注册商按年登记，属持有人。停用 CF 解析 / 备案 / 转注册商，域名仍在（按时续费）。会丢掉的是 `workers.dev` / `pages.dev` 这类平台名。

**策略：** 技术上旧门牌可通；对外信息全部置换为下表主机名，不做 301（免伤已装 PWA）。

---

## 2. 为啥要动域名

| 现象 | 原因 | 补法 |
|------|------|------|
| 国内打不开 Worker | `workers.dev` 连通性差 | `gateway.pomotention.com` 绑 Worker；生产 `VITE_AI_WORKER_URL` 改新址 |
| 查权益失败 | 前端 fail-open | 付费墙对连不上的用户形同虚设 |
| 多 Pages 门牌不一致 | 各用 `*.pages.dev` | 同一根域下分子域（见 §3） |

备案：管的是「境内接入上的网站」= 主体 + 域名 + 国内接入商。只指 CF / 海外时一般不必先备案。备案不没收 `.com`。

---

## 3. 主机名规划（已定）

| 主机名 | 绑到 |
|--------|------|
| `pomotention.com` | 主站 Pages（生产） |
| `www.pomotention.com` | 同主站；CF 跳转到 apex |
| `docs.pomotention.com` | 文档 Pages |
| `gateway.pomotention.com` | Worker `ai-gateway` |
| `dev.pomotention.com` | 主站 Pages Preview |

生产 env（改后须重部署）：`VITE_AI_WORKER_URL=https://gateway.pomotention.com`；外链帮助时 `VITE_HELP_DOCS_URL=https://docs.pomotention.com/`。

---

## 4. 操作要点（阿里云已购）

1. 阿里云 **实名认证**通过（未实名可能 Serverhold）。
2. Cloudflare Add site → `pomotention.com` → 记下两行 NS。
3. 阿里云域名控制台：DNS 服务器改成 CF 的 NS；等 CF Active。
4. Worker → Custom Domain → `gateway.pomotention.com`。
5. 主站 Pages → `pomotention.com` + `www`（www → apex）；文档 → `docs.`；Preview → `dev.`。
6. 生产 / Preview 填 `VITE_AI_WORKER_URL`（及可选 `VITE_HELP_DOCS_URL`），**重新部署**。
7. 桌面端若包内嵌了旧 Worker URL：用新 env 重打 Tauri 包。

旧 `*.workers.dev` / `*.pages.dev` 先不删。

---

## 5. 怎么算测通

**测的是「国内用户能否打到门牌」，不是只 ping。**

| 步骤 | 通过条件 |
|------|----------|
| 网关 | 国内无代理打开 `https://gateway.pomotention.com/health` → ok |
| 主站 / 帮助 | `https://pomotention.com`；帮助到 `docs.pomotention.com`（若已设 env） |
| 产品路径 | 登录后权益 / 一句记请求主机为 `gateway.pomotention.com` 且成功 |

DNS 刚改时可能有传播延迟。仅在可访问 `workers.dev` 的环境测通，**不算**解决国内问题。

---

## 6. 解析链路：谁在答、坑在哪、CF 改得了什么

买 `.com` / 权威区配置正确 ≠ 国内一定通。口语「解析不上」常把 **DNS 失败** 和 **解析对了但 TCP/TLS 走不通** 混在一起。

### 6.1 问了之后谁在解析

```text
浏览器 → 本机/路由 → 递归解析器（运营商 DNS 或公共 DNS）
  → 逐级问到该区的权威 DNS
  → 权威作答 ← 递归器缓存后转述 → 你再拿 IP 去连
```

| 角色 | 职责 | 谁控 |
|------|------|------|
| 权威 DNS | 正式答案 | `pomotention.com` 在 CF；`workers.dev` 区也在 CF |
| 递归 DNS | 代查、缓存、转述 | ISP / 公共 DNS |
| 网络路径 | TCP/TLS | 运营商与中间链路 |

### 6.2 为何像「专门整 workers.dev」

干扰可按主机名后缀生效。`*.workers.dev` 特征明显，国内路径常差；`gateway.pomotention.com` 是另一套名字。换自定义域 = 换门牌试同一 Worker，不是 CF「终于肯解析对」。

### 6.3 国内挂时更像哪一种

| 类型 | 表现 | 优先怀疑 |
|------|------|----------|
| 转述脏了 | 权威对，递归给错/无响应 | 中间 DNS |
| 路不通 | 有正确 IP，HTTPS 超时/重置 | 链路 |
| CF 权威挂 | 全球都怪、状态页红 | 少见 |
| 自己配错 | 仅新域不行 | NS / 未绑 Custom Domain / 前端未重部署 |

### 6.4 CF 能改什么、不能改什么

**能改：** 权威记录、Anycast、证书、Worker 路由。  
**改不了：** 中国递归是否忠实、路径是否放行。改权威 ≠ 国内自动变好。

---

## 7. 相关指针

| 主题 | 去哪 |
|------|------|
| 帮助跳转 / `VITE_HELP_DOCS_URL` | [`help-docs-cloudflare.md`](./help-docs-cloudflare.md) |
| Worker 路由 / secret / 配额 | [`../blueprint/8-ai-gateway.md`](../blueprint/8-ai-gateway.md) |
| 同步权益、fail-open | [`../current.md`](../current.md) |
| 本地 / 部署 Worker | `worker/ai-gateway/README.md` |
