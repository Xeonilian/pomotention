-- 用途：在 Supabase Dashboard → SQL Editor（具备访问 public / auth 的权限）中执行。
-- 仅输出「条数」，不查询 title/description 等业务字段。
-- 用法：把下面 CTE 里的占位 UUID 换成目标用户的 auth.users.id。

WITH u AS (
  SELECT 'f7660e0b-3124-457d-87ba-1fa3421fa011'::uuid AS user_id -- 替换此处
)
SELECT 'auth.users (账号是否存在, 0/1)' AS entity,
       (SELECT COUNT(*)::bigint FROM auth.users au WHERE au.id = (SELECT user_id FROM u))
UNION ALL
SELECT 'public.activities',
       (SELECT COUNT(*)::bigint FROM public.activities t, u WHERE t.user_id = u.user_id)
UNION ALL
SELECT 'public.tasks',
       (SELECT COUNT(*)::bigint FROM public.tasks t, u WHERE t.user_id = u.user_id)
UNION ALL
SELECT 'public.todos',
       (SELECT COUNT(*)::bigint FROM public.todos t, u WHERE t.user_id = u.user_id)
UNION ALL
SELECT 'public.schedules',
       (SELECT COUNT(*)::bigint FROM public.schedules t, u WHERE t.user_id = u.user_id)
UNION ALL
SELECT 'public.tags',
       (SELECT COUNT(*)::bigint FROM public.tags t, u WHERE t.user_id = u.user_id)
UNION ALL
SELECT 'public.templates',
       (SELECT COUNT(*)::bigint FROM public.templates t, u WHERE t.user_id = u.user_id)
ORDER BY entity;
