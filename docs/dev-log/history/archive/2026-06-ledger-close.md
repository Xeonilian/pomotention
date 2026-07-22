# 当前这一关

> **搞不清要干嘛、干到哪了 → 只看这个文件。**  
> 开新功能：填下面各节；收工：更新「停在哪」；做完：打勾后清空或归档到 [`history/archive/`](./history/archive/)。

---

## 快照

| 项 | 内容 |
|---|---|
| **主题** | dev-log 金字塔重构 |
| **来自** | 习惯清理 |
| **蓝图** | [`README.md`](./README.md) |
| **分支** | `dev` |
| **更新** | 2026-07-22 |
| **停在哪** | 去掉 now/，current 回根；引用已再对齐 |

---

## 这一关要干嘛（一句话）

`docs/dev-log` 金字塔：`current` + `ship` + `blueprint` + `history`。

---

## 分步（按顺序）

| 步 | 内容 | 产出 |
|---|---|---|
| **0–2** | 删 contracts、迁目录、引用对齐 | 已完成 |
| **3** | 去掉 now/，current 回根 | 已完成 |
| **4** | 归档本关 | — |

---

## 验收标准（3 条）

1. 根只有 `current.md` + 三层目录；无 `now/`
2. Agent/guide 链接指向 `docs/dev-log/current.md`
3. 关票在 `history/archive/`

---

## 进度

- [x] **0.–3.** 结构定稿
- [ ] **4.** 归档

---

## 归档

做完后把「快照 + 验收」复制到 CHANGELOG 或 PR，然后清空上方填写内容，或移到 `history/archive/YYYY-MM-topic.md`。
