# 归档 · 批注（note · 后批高亮）（2026-11）

> 自 [`current.md`](../../current.md) 移出。用户可见发版见 CHANGELOG / `v0.7.1`。

## 快照（归档时）

| 项 | 内容 |
|---|---|
| **主题** | Task 正文批注：`:::note` + 原笔黄 + 后批三色；数据页划选 / 擦除；手机长按上色 |
| **分支** | `dev` → `main`（本版 PR） |
| **版本** | `0.7.1` |
| **分级** | `[S2 C2 UV1]` |
| **停在哪** | 帮助 `task.md` / `search.md` / `planner.md` 已补；CHANGELOG / 版本号已写；待 squash 合并。 |

## 这一关做了啥

1. **共享解析**：`taskMarkdown`（原笔 + `==r|g|b:…==`）；TOC / 首页 / 数据页共用。
2. **Note**：`taskNoteBlocks` 切分与回写；`TaskNoteRegion`；数据页 Note 模式 / 首页点区编。
3. **后批**：数据页高亮笔 r/g/b + 擦除；手机复用 `usePointerDragSession` 长按划选。
4. **并行顺带**：周视图横复制 / 纵改时；拖条目统一 pointer 会话；帮助与 CHANGELOG。

## 验收（归档时）

- [x] note 成区；改 note 不搅正文
- [x] 原笔黄与后批三色两边同渲染
- [x] 数据页划选 / 擦除；失败不腐坏源文
- [x] 数据页无全文 textarea；导出带完整 description

## 本关未做（留给后续）

- 卡片跳转 / 显式引用；筛选后分析写作面
- 首页后批划选；后批任意色 / 颜色选择器
