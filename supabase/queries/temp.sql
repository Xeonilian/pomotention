-- 查看当前 schema 下所有表
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- 查看当前 schema 下所有视图
SELECT table_name FROM information_schema.views WHERE table_schema = 'public';

-- 查看触发器
SELECT event_object_table, trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public';