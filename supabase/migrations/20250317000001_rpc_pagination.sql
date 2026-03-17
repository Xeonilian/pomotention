-- RPC 分页：为 get_full_tasks / get_full_todos / get_full_schedules 增加 p_limit、p_offset 重载
-- 同步流程说明：每次下载是「先查库拿到一批行 → 再在本地用这批行做比对合并」。查库阶段若被 1000 行截断，多出的行不会参与比对，所以会少数据。本迁移让 RPC 支持分页，客户端即可拉全量。
--
-- 若执行报错「column "activityId" does not exist」等：说明你库里原有 RPC 返回的是 snake_case 列名，
-- 请把 SELECT 里的 t."activityId" 改为 t.activity_id AS "activityId" 等，与原有 RPC 的返回列一致。

-- 1. get_full_tasks：4 参数重载，内部调用原有 2 参数版本并做 LIMIT/OFFSET
-- 不加 p_limit/p_offset 默认值，避免 2 参数调用时与原有 2 参数函数歧义
CREATE OR REPLACE FUNCTION public.get_full_tasks(
  p_user_id uuid,
  p_last_modified timestamptz,
  p_limit int,
  p_offset int
)
RETURNS TABLE (
  id bigint,
  "activityId" bigint,
  "activityTitle" text,
  "projectName" text,
  description text,
  "energyRecords" jsonb,
  "rewardRecords" jsonb,
  "interruptionRecords" jsonb,
  starred boolean,
  last_modified timestamptz,
  deleted boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT t.id, t."activityId", t."activityTitle", t."projectName", t.description,
         t."energyRecords", t."rewardRecords", t."interruptionRecords", t.starred, t.last_modified, t.deleted
  FROM public.get_full_tasks(p_user_id, p_last_modified) AS t
  ORDER BY t.last_modified
  LIMIT p_limit OFFSET p_offset;
$$;

-- 2. get_full_todos：4 参数重载
CREATE OR REPLACE FUNCTION public.get_full_todos(
  p_user_id uuid,
  p_last_modified timestamptz,
  p_limit int,
  p_offset int
)
RETURNS TABLE (
  id bigint,
  "activityId" bigint,
  "activityTitle" text,
  "projectName" text,
  "taskId" bigint,
  "estPomo" bigint[],
  "realPomo" bigint[],
  status text,
  priority bigint,
  "pomoType" text,
  "dueDate" bigint,
  "doneTime" bigint,
  "startTime" bigint,
  interruption text,
  "globalIndex" bigint,
  last_modified timestamptz,
  deleted boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT t.id, t."activityId", t."activityTitle", t."projectName", t."taskId", t."estPomo", t."realPomo",
         t.status, t.priority, t."pomoType", t."dueDate", t."doneTime", t."startTime", t.interruption, t."globalIndex", t.last_modified, t.deleted
  FROM public.get_full_todos(p_user_id, p_last_modified) AS t
  ORDER BY t.last_modified
  LIMIT p_limit OFFSET p_offset;
$$;

-- 3. get_full_schedules：4 参数重载
CREATE OR REPLACE FUNCTION public.get_full_schedules(
  p_user_id uuid,
  p_last_modified timestamptz,
  p_limit int,  -- 不加 p_limit/p_offset 默认值，避免 2 参数调用时与原有 2 参数函数歧义
  p_offset int
)
RETURNS TABLE (
  id bigint,
  "activityId" bigint,
  "activityTitle" text,
  "activityDueRange" jsonb,
  "taskId" bigint,
  status text,
  location text,
  "doneTime" bigint,
  "isUntaetigkeit" boolean,
  interruption text,
  "projectName" text,
  deleted boolean,
  last_modified timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT t.id, t."activityId", t."activityTitle", t."activityDueRange", t."taskId", t.status, t.location,
         t."doneTime", t."isUntaetigkeit", t.interruption, t."projectName", t.deleted, t.last_modified
  FROM public.get_full_schedules(p_user_id, p_last_modified) AS t
  ORDER BY t.last_modified
  LIMIT p_limit OFFSET p_offset;
$$;
