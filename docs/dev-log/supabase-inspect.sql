-- Supabase 同步表数据查看（请把下面所有 '<your_user_id>' 替换为你的 user UUID）

-- 1. 各表总条数 + 未删除/已删除 分布
SELECT 'activities' AS tbl, COUNT(*) AS total, COUNT(*) FILTER (WHERE NOT deleted) AS active, COUNT(*) FILTER (WHERE deleted) AS deleted
FROM activities WHERE user_id = '<your_user_id>'
UNION ALL
SELECT 'todos',    COUNT(*), COUNT(*) FILTER (WHERE NOT deleted), COUNT(*) FILTER (WHERE deleted)
FROM todos    WHERE user_id = '<your_user_id>'
UNION ALL
SELECT 'schedules', COUNT(*), COUNT(*) FILTER (WHERE NOT deleted), COUNT(*) FILTER (WHERE deleted)
FROM schedules WHERE user_id = '<your_user_id>'
UNION ALL
SELECT 'tasks',    COUNT(*), COUNT(*) FILTER (WHERE NOT deleted), COUNT(*) FILTER (WHERE deleted)
FROM tasks    WHERE user_id = '<your_user_id>'
UNION ALL
SELECT 'tags',     COUNT(*), COUNT(*) FILTER (WHERE NOT deleted), COUNT(*) FILTER (WHERE deleted)
FROM tags     WHERE user_id = '<your_user_id>'
UNION ALL
SELECT 'templates', COUNT(*), COUNT(*) FILTER (WHERE NOT deleted), COUNT(*) FILTER (WHERE deleted)
FROM templates WHERE user_id = '<your_user_id>';

-- 2. activities 最近 20 条（含 deleted、last_modified）
-- SELECT timestamp_id, title, deleted, last_modified FROM activities WHERE user_id = '<your_user_id>' ORDER BY last_modified DESC NULLS LAST LIMIT 20;

-- 3. tasks 最近 20 条
-- SELECT timestamp_id, activity_id, description, deleted, last_modified FROM tasks WHERE user_id = '<your_user_id>' ORDER BY last_modified DESC NULLS LAST LIMIT 20;

-- 4. todos 最近 20 条
-- SELECT timestamp_id, activity_id, status, deleted, last_modified FROM todos WHERE user_id = '<your_user_id>' ORDER BY last_modified DESC NULLS LAST LIMIT 20;

-- 5. schedules 最近 20 条
-- SELECT timestamp_id, activity_id, status, deleted, last_modified FROM schedules WHERE user_id = '<your_user_id>' ORDER BY last_modified DESC NULLS LAST LIMIT 20;

-- 6. tags 全部（表通常较小）
-- SELECT timestamp_id, name, deleted, last_modified FROM tags WHERE user_id = '<your_user_id>' ORDER BY last_modified DESC NULLS LAST;

-- 7. templates 全部
-- SELECT timestamp_id, title, deleted, last_modified FROM templates WHERE user_id = '<your_user_id>' ORDER BY last_modified DESC NULLS LAST;
