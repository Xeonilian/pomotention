-- ========= 步骤 0: 删除旧表 (如果存在的话) =========
-- 这样可以确保我们是在一个全新的、干净的基础上开始

DROP TABLE IF EXISTS public.activities_encrypted CASCADE;


-- ========= 步骤 1: 创建全新的 activities_encrypted 表 =========
-- 该表结构根据你的 ActivityV2 类型和我们的“双ID”方案设计

CREATE TABLE public.activities_encrypted (
    -- "双ID" 系统 --
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, -- 数据库的内部主键 (前端无需关心)
    "timestamp_id" bigint NOT NULL,                            -- 你的时间戳ID (前端的核心ID)

    -- 核心关联与时间戳 --
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),

    -- 来自你的 ActivityV2 类型的字段 --
    "title" text,           -- 将被加密
    "location" text,        -- 将被加密
    "class" text,           -- "S" or "T"
    "project_id" bigint,
    "est_pomo_i" text,
    "due_date" timestamptz,  -- dueDate (JS时间戳 -> 数据库带时区时间)
    "due_range" jsonb,
    "interruption" text,
    "category" text,
    "four_zone" text,
    "repeat_params" jsonb,
    "status" text,
    "pomo_type" text,
    "is_untaetigkeit" boolean DEFAULT false,
    "task_id" bigint,
    "tag_ids" bigint[],      -- number[] -> bigint[]
    "parent_id" bigint,      -- 引用另一条记录的 timestamp_id

    -- 同步机制字段 --
    "last_modified" timestamptz, -- lastModified (JS时间戳 -> 数据库带时区时间)
    "synced" boolean DEFAULT true -- 存入数据库的记录，我们视其为已同步
);

-- 创建唯一索引，确保同一个用户不会有两条 timestamp_id 相同的记录
ALTER TABLE public.activities_encrypted
  ADD CONSTRAINT activities_encrypted_user_timestamp_id_key UNIQUE (user_id, timestamp_id);


-- ========= 步骤 2: 设置自动加密 =========
-- 告诉 pgsodium，需要用 user_id 作为密钥来自动加密 title 和 location

SECURITY LABEL FOR "pgsodium" ON COLUMN "public"."activities_encrypted"."title"
    IS 'ENCRYPT WITH KEY COLUMN user_id';

SECURITY LABEL FOR "pgsodium" ON COLUMN "public"."activities_encrypted"."location"
    IS 'ENCRYPT WITH KEY COLUMN user_id';


-- ========= 步骤 3: 启用并设置行级安全策略 (RLS) =========
-- 确保用户只能操作自己的数据

ALTER TABLE public.activities_encrypted ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own activities" ON public.activities_encrypted;
CREATE POLICY "Users can manage their own activities"
ON public.activities_encrypted
FOR ALL  -- 包括 SELECT, INSERT, UPDATE, DELETE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ========= 步骤 4: 创建自动更新 updated_at 的触发器 =========
-- 让数据库自动维护 updated_at 字段

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 将这个触发器应用到我们的表上
DROP TRIGGER IF EXISTS on_activities_encrypted_updated ON public.activities_encrypted;
CREATE TRIGGER on_activities_encrypted_updated
BEFORE UPDATE ON public.activities_encrypted
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
