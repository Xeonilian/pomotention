# 归档 · Project 文件夹 + 计划侧导出 + 搜索词高亮（2026-11）

> 自 [`current.md`](../../current.md) 移出。用户可见发版见 CHANGELOG / `v0.7.0`。PR：#145 squash → `main`。

## 快照（归档时）

| 项 | 内容 |
|---|---|
| **主题** | Project 文件夹（主）+ 计划侧筛选结果导出 + 搜索词高亮 |
| **分支** | `dev` → `main`（#145） |
| **版本** | `0.7.0` |
| **停在哪** | 本关已合；帮助 `search.md` 已补；干净 `dev` 已从 `main` 重建。 |

## 这一关做了啥

1. **Project**：本地一等 + 云表/Sync；树 CRUD、开合懒加载、拖 3in1 进/出、升一层、按月视图桶、绑 tag、更深优先智能归堆。
2. **计划侧范围提取**：先 tag → 再文字（activity title + task 内容）；不含 life / ledger。
3. **搜索词高亮**：列表 / tab / 详情命中；清空即消。
4. **筛选结果导出**：Markdown / JSON / CSV；Tauri 与 PWA 落盘分支。

## 进度（归档时）

- [x] 0–5 全步（认路 → 文件夹 → 智能/按月 → 高亮 → 导出 → 手测 + Project Sync）

## 本关未做（留给后续）

- 卡片跳转 / 显式引用；筛选后分析写作面
- Task markdown note 块 / 多色后批（已开下一关）
- life / ledger 提取；Project 内加 todo
