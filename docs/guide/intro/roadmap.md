---
description: Pomotention 方向与开发队列（短）；细节见 current、CHANGELOG、vision 笔记。
---

# 开发地图

## Pomotention 在做什么

把 **专注计时、日程计划、任务记录** 放在同一个工具里：下午在 App 里干活、记番茄和任务，需要时用结构化方式 **导出或交给外部 AI**，而不是再做一套聊天或完整记账软件。

## 最近在推进

- **ledger v2** — Supabase `ledger_entries` + LedgerSyncService
- 完整交付记录见 [更新日志](../../dev-log/history/CHANGELOG.md)

## 长期方向

| 方向           | 一句话                                               |
| -------------- | ---------------------------------------------------- |
| **专注与计划** | 番茄、计划表、任务与活动清单                         |
| **记录与导出** | 一句话记进已有记录；结构化书写、ledger；给外部 AI 的摘要 |
| **同步与多端** | 云同步、PWA/桌面；数据层 eventual IndexedDB          |

更长的产品构想写在仓库工程笔记 blueprint（不进帮助站）。

---

## 执行顺序

> **当前这一关**（进度、验收、停在哪）：仓库 `docs/dev-log/current.md`

1. **一句话记进已有记录**（先打字、后语音；原界面改错）— **优先于**身体五类手工页平推；见 `current.md`
2. **ledger v2 云同步**（v1 本地已落地）
3. **收费 + 推广底座**
4. **结构化指标定义** → chart 改版、带走摘要给外部 AI
5. **IndexedDB 迁移**（大项，与 4 设计并行，不挡 3；**不挡**第 1 项）
6. 身体录入页 / 其余见仓库 blueprint（[`6-body.md`](../../dev-log/blueprint/6-body.md)）再排进本列表

**维护习惯：** 通关一关 → 从本列表 **删掉或下移** 该行 → `current.md` 开下一关。不在此维护 ✅ 细表。

---

## 已经交付

见 [更新日志](../../dev-log/history/CHANGELOG.md)。
