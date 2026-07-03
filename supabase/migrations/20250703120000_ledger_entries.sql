-- =============================================================================
-- ledger_entries · 账本行云表
-- 对齐 tasks / todos / schedules：公共同步列 + 仅 activity_id FK，无 JOIN 冗余字段
-- 下载：App 直查表（BaseSyncService），不用 RPC
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 触发器函数 update_last_modified（tasks 等表现有表已在用；本地从零建库时需要）
--    作用：任意 UPDATE 该行时，自动把 last_modified 设为当前时间
--    为何需要：增量同步靠 last_modified > 上次同步时间 拉变更；不用 App 手填
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
-- 2. 建表 ledger_entries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  -- 云侧主键（Postgres uuid）；与业务 id 无关
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 所属用户；删账号时级联删该用户所有账本行
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- 客户端行 id（localStorage LedgerEntry.id = Date.now()）；与 tasks.timestamp_id 同义
  timestamp_id bigint NOT NULL,

  -- 业务字段（对应本地 LedgerEntry；不存 activity 标题等 JOIN 冗余）
  amount numeric(15, 2) NOT NULL,
  direction text NOT NULL CHECK (direction IN ('income', 'expense')),
  currency text NOT NULL DEFAULT 'CNY',
  memo text,
  category_tag_ids jsonb NOT NULL DEFAULT '[]'::jsonb,  -- tag id 数组，不存 tag 名
  raw_segment text NOT NULL,   -- 解析时该笔原文（删条反查 title 用）
  segment_index integer NOT NULL,
  activity_id bigint NOT NULL, -- FK → activities；与 todo 1:1，故不另存 todo_id

  -- 同步字段（与 tasks / todos 相同）
  deleted boolean NOT NULL DEFAULT false,       -- 软删；true 时下载端标记本地 deleted
  last_modified timestamptz NOT NULL DEFAULT now(),

  -- 同一用户下客户端 id 唯一（upsert 冲突键）
  UNIQUE (user_id, timestamp_id)
);

-- -----------------------------------------------------------------------------
-- 3. 外键：账本行必须挂在已存在的 activity 上
--    (user_id, activity_id) → activities(user_id, timestamp_id)
--    ON DELETE CASCADE：删 activity 树时，关联 ledger 行一并物理删除
--    命名 fk_* 与 fk_tasks_activity / fk_todos_activity 一致
-- -----------------------------------------------------------------------------
ALTER TABLE public.ledger_entries
  ADD CONSTRAINT fk_ledger_entries_activity
  FOREIGN KEY (user_id, activity_id)
  REFERENCES public.activities(user_id, timestamp_id)
  ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- 4. 索引（加速同步与按用户查询；tasks 表同款组合）
--    - user_id：按用户筛
--    - (user_id, last_modified)：增量下载 WHERE last_modified > ?
--    - (user_id, timestamp_id)：upsert / 按客户端 id 查
--    - partial index deleted=false：常用「未删行」列表
--    - (user_id, activity_id)：按 activity 查账、级联相关
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON public.ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_last_modified ON public.ledger_entries(user_id, last_modified);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_timestamp_id ON public.ledger_entries(user_id, timestamp_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_active ON public.ledger_entries(user_id, deleted, last_modified) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_ledger_entries_activity_id ON public.ledger_entries(user_id, activity_id);

-- -----------------------------------------------------------------------------
-- 5. 触发器：绑到表上，UPDATE 前自动调 update_last_modified()
--    DROP IF EXISTS：重复执行 migration 时不报错
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_last_modified ON public.ledger_entries;
CREATE TRIGGER set_last_modified
  BEFORE UPDATE ON public.ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_modified();

-- -----------------------------------------------------------------------------
-- 6. RLS（Row Level Security · 行级安全）
--    开启后：默认拒绝所有访问，仅 POLICY 允许的行可操作
--    auth.uid() = user_id：只能读写自己的数据（JWT 里的用户 id）
--    四条分别对应 SELECT / INSERT / UPDATE / DELETE
-- -----------------------------------------------------------------------------
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own ledger entries" ON public.ledger_entries;
CREATE POLICY "Users can view their own ledger entries"
  ON public.ledger_entries FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own ledger entries" ON public.ledger_entries;
CREATE POLICY "Users can insert their own ledger entries"
  ON public.ledger_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own ledger entries" ON public.ledger_entries;
CREATE POLICY "Users can update their own ledger entries"
  ON public.ledger_entries FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own ledger entries" ON public.ledger_entries;
CREATE POLICY "Users can delete their own ledger entries"
  ON public.ledger_entries FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 7. GRANT：允许 Supabase API 角色访问该表（经 RLS 再过滤到本人）
--    anon / authenticated：前端登录态；service_role：服务端绕过 RLS（一般不用在前端）
-- -----------------------------------------------------------------------------
GRANT ALL ON TABLE public.ledger_entries TO anon, authenticated, service_role;
