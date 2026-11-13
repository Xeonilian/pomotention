-- =============================================================================
-- projects · 项目文件夹云表
-- 对齐 tags：公共同步列 + 业务字段；App 直查表（BaseSyncService），不用 RPC
-- 用法：可粘贴到 Supabase Studio SQL Editor 执行（本仓库不强制 db push）
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 触发器函数 update_last_modified（若库中已有可跳过；IF NOT 用 OR REPLACE）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_last_modified()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_modified = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. 建表 projects
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  timestamp_id bigint NOT NULL,

  title text NOT NULL,
  description text,
  status text,
  due_date bigint,
  parent_id bigint,          -- 本地 parentId；根为 null（不做云端 FK，软引用）
  tag_id bigint,             -- 智能文件夹绑定的 tag timestamp_id；软引用
  member_ids jsonb NOT NULL DEFAULT '[]'::jsonb,  -- 预留成员 id；本关 App 可不写

  deleted boolean NOT NULL DEFAULT false,
  last_modified timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, timestamp_id)
);

-- -----------------------------------------------------------------------------
-- 3. 索引
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_last_modified ON public.projects(user_id, last_modified);
CREATE INDEX IF NOT EXISTS idx_projects_timestamp_id ON public.projects(user_id, timestamp_id);
CREATE INDEX IF NOT EXISTS idx_projects_active ON public.projects(user_id, deleted, last_modified) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_projects_parent_id ON public.projects(user_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_projects_tag_id ON public.projects(user_id, tag_id);

-- -----------------------------------------------------------------------------
-- 4. 触发器
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_last_modified ON public.projects;
CREATE TRIGGER set_last_modified
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_modified();

-- -----------------------------------------------------------------------------
-- 5. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
CREATE POLICY "Users can insert their own projects"
  ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 6. GRANT
-- -----------------------------------------------------------------------------
GRANT ALL ON TABLE public.projects TO anon, authenticated, service_role;
