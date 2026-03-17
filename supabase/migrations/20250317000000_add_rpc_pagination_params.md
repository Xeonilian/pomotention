# RPC 分页说明

已提供可执行迁移：**`20250317000001_rpc_pagination.sql`**。

- 为 `get_full_tasks`、`get_full_todos`、`get_full_schedules` 各增加一个 4 参数重载（原 2 参数保留），新重载内部调用原函数并对结果做 `ORDER BY last_modified LIMIT p_limit OFFSET p_offset`。
- 在 Supabase SQL Editor 中执行该迁移后，客户端的分页循环会自动生效，tasks/todos/schedules 可拉取超过 1000 条。
- 若执行报错列名不存在，见迁移文件顶部注释，按你库里实际返回列名调整 SELECT 列表。
