-- =============================================================================
-- tasks · 生活记录字段（life_records / drink_goal_ml）
-- 对齐本地 Task.lifeRecords、Task.drinkGoalMl；下载仍走 get_full_tasks
--
-- 你怎么用（控制台）：
--   1. Supabase → SQL Editor → 整份粘贴 → Run
--   2. 成功后再做 gen types / 前端 taskSync 适配
--
-- 本文件 2/4 参数 RPC 主体已按线上 pg_get_functiondef 对齐后加列：
--   - projectName = NULL::text
--   - LEFT JOIN activities
--   - last_modified > p_last_modified
--   - 2 参数版 p_last_modified 默认 1970-01-01
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 表：加列（可重复执行）
-- -----------------------------------------------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS life_records jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS drink_goal_ml integer;

COMMENT ON COLUMN public.tasks.life_records IS '生活记录数组（对齐本地 Task.lifeRecords）';
COMMENT ON COLUMN public.tasks.drink_goal_ml IS '当日喝水目标 ml（对齐本地 Task.drinkGoalMl；非 drink 可为空）';

-- -----------------------------------------------------------------------------
-- 2. 去掉旧 RPC（返回类型要变，必须 DROP；先 4 参再 2 参）
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_full_tasks(uuid, timestamptz, int, int);
DROP FUNCTION IF EXISTS public.get_full_tasks(uuid, timestamptz);

-- -----------------------------------------------------------------------------
-- 3. 2 参数 get_full_tasks（与线上一致 + lifeRecords / drinkGoalMl）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_full_tasks(
  p_user_id uuid,
  p_last_modified timestamptz DEFAULT '1970-01-01 00:00:00+00'::timestamptz
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
  "lifeRecords" jsonb,
  "drinkGoalMl" integer,
  starred boolean,
  last_modified timestamptz,
  deleted boolean
)
LANGUAGE sql
AS $$
  SELECT
    t.timestamp_id AS id,
    t.activity_id AS "activityId",
    a.title AS "activityTitle",
    NULL::text AS "projectName",
    t.description AS description,
    t.energy_records AS "energyRecords",
    t.reward_records AS "rewardRecords",
    t.interruption_records AS "interruptionRecords",
    COALESCE(t.life_records, '[]'::jsonb) AS "lifeRecords",
    t.drink_goal_ml AS "drinkGoalMl",
    t.starred AS starred,
    t.last_modified AS last_modified,
    t.deleted AS deleted
  FROM
    tasks t
  LEFT JOIN
    activities a ON t.activity_id = a.timestamp_id AND t.user_id = a.user_id
  WHERE
    t.user_id = p_user_id
    AND t.last_modified > p_last_modified;
$$;

-- -----------------------------------------------------------------------------
-- 4. 4 参数重载：分页（内部调 2 参数版）
-- -----------------------------------------------------------------------------
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
  "lifeRecords" jsonb,
  "drinkGoalMl" integer,
  starred boolean,
  last_modified timestamptz,
  deleted boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    t.id,
    t."activityId",
    t."activityTitle",
    t."projectName",
    t.description,
    t."energyRecords",
    t."rewardRecords",
    t."interruptionRecords",
    t."lifeRecords",
    t."drinkGoalMl",
    t.starred,
    t.last_modified,
    t.deleted
  FROM public.get_full_tasks(p_user_id, p_last_modified) AS t
  ORDER BY t.last_modified
  LIMIT p_limit OFFSET p_offset;
$$;
