# 归档 · 一句记第一刀（2026-08）

> 自 [`current.md`](../../current.md) 移出。底座见 [`../../blueprint/8-ai-gateway.md`](../../blueprint/8-ai-gateway.md)；实现见 [`../../blueprint/7-capture.md`](../../blueprint/7-capture.md)；能力清单见 [`../../blueprint/7-capture-instances.md`](../../blueprint/7-capture-instances.md)。

## 快照（归档时）

| 项 | 内容 |
|---|---|
| **主题** | 一句记（capture）— 文字→写入操作；第一刀 create todo |
| **蓝图** | [`7-capture.md`](../../blueprint/7-capture.md) + [`7-capture-instances.md`](../../blueprint/7-capture-instances.md)；底座 [`8-ai-gateway.md`](../../blueprint/8-ai-gateway.md) |
| **分支** | `dev` |
| **停在哪** | 本关完成：本地联调通过（`pnpm gateway:dev` + `pnpm dev`，记一句写入日视图） |

## 这一关做了啥

用户说一句自然语言 → AI 网关映射 → **create todo**（日视图可见）；写错在原界面改。  
**只记不聊**：右栏 `CapturePanel`，不接通闲聊。

## 验收（已通过手测）

1. 右栏可提交一句；不像聊天陪聊
2. 典型「明天下午…」类句子能 create todo 并在日视图看见
3. 映射失败 / 网关 401·402 → 不写，短提示
4. 未开通权益有升级提示（人工 `/admin/entitlement`）

## 实现要点

- 入口：工具栏「记一句」→ `showAi` 右栏 → `CapturePanel`
- `src/core/capture/`：`runCapture` → AiMapper → Worker `/capture/map` → Zod → Writer create todo
- 本地：`worker/ai-gateway/.dev.vars` + `VITE_AI_WORKER_URL=http://127.0.0.1:8787`；改 `.dev.vars` 须重启 gateway

## 进度（归档时）

- [x] **0.** 网关验收 + 产品对齐
- [x] **1.** 记一句专用面（`CapturePanel`）
- [x] **2.** capture → todo Writer
- [x] **3.** 联调演示

## 本关未做（留给后续）

全 kind、改删、CLI、一问一答/模板触发 AI、自动收款渠道、Worker 云部署。
