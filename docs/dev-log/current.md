# 当前这一关

> **搞不清要干嘛、干到哪了 → 只看这个文件。**  
> 开新功能：填下面各节；收工：更新「停在哪」；做完：打勾到第 6 步后清空或归档。

---

## 快照

| 项 | 内容 |
|---|---|
| **主题** | ledger v3 · 收支统计明细编辑 |
| **来自** | [blueprint/ledger.md §11](./blueprint/ledger.md) |
| **蓝图** | [`blueprint/ledger.md`](./blueprint/ledger.md) |
| **分支** | `dev` |
| **更新** | 2026-07-13 |
| **停在哪** | 步 5：分批 commit → 一个 PR |

---

## 这一关要干嘛（一句话）

在 **收支统计弹窗** 明细表支持 **改 / 删 / 追加**；统计追加经 **ledger-stub 日桶** 可云同步。

---

## 分步（按顺序）

| 步 | 内容 | 产出 |
|---|---|---|
| **0** | 归档 v2 + blueprint §11 | 已对齐 |
| **1** | service + stub + query | 已入仓 |
| **2** | Aggregate UI | 已入仓 |
| **3** | Tag rank + 解析/图表 | 已入仓 |
| **4** | 测试 + 手测 + 云同步 | 已通过 |
| **5** | 分批 commit + 一个 PR | 进行中 |
| **6** | 收关 | — |

---

## 验收标准（3 条）

1. 统计弹窗编辑 → 可改/删/追加；排序/帮助/趋势点日
2. title 来源行改金额后 activity title 括号更新
3. 统计追加日桶 stub 同步；清本地重登数据可见

---

## 进度

- [x] **0.–4.** 开发与手测
- [ ] **5.** PR
- [ ] **6.** 收关

---

## 备注

- v3 归档草稿：[`current-archive/2026-07-ledger-v3.md`](./current-archive/2026-07-ledger-v3.md)
- v2 归档：[`current-archive/2026-07-ledger-v2.md`](./current-archive/2026-07-ledger-v2.md)

---

## 归档

做完后把「快照 + 验收 + 结果」复制到 CHANGELOG 或 PR，然后 **删掉上方填写的快照内容**，只保留本模板说明；或整段移到 `current-archive/YYYY-MM-topic.md`（可选，不强制）。
