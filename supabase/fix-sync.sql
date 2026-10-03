-- Nexdo 多端同步【最终修复】脚本
-- =====================================================================
-- 根因（已用真实写入实测确认）：
--   5 张表的 user_id 仍带有指向 auth.users 的外键约束（*_user_id_fkey），
--   而应用用「工作区 UUID」作为 user_id（并非真实登录用户），
--   导致每一次 INSERT / UPSERT 都被外键以 409 拒绝：
--     violates foreign key constraint "concepts_user_id_fkey"
--     Key (user_id)=(9f1c3b2a-...) is not present in table "users".
--   云端因此永远收不到数据，iPad / 其它设备无法同步。
--
--   之前的 enable-sync.sql 只关闭了 RLS，没有删除这个外键，所以同步仍然失败。
--   本脚本补全缺漏：删除外键 + 关闭 RLS + 清理旧策略。
-- =====================================================================
-- 执行方式：Supabase 后台 → 左侧 SQL Editor → 粘贴本文件全部内容 → 「Run」
--           只需执行一次；可重复执行（幂等，带 if exists）。之后所有设备自动同步，无需再跑 SQL。
-- =====================================================================

-- 1) 删除 5 张表 user_id 上的外键约束（让 user_id 仅作工作区隔离字段，不再引用 auth.users）
alter table concepts      drop constraint if exists concepts_user_id_fkey;
alter table study_logs   drop constraint if exists study_logs_user_id_fkey;
alter table resources     drop constraint if exists resources_user_id_fkey;
alter table project_ideas drop constraint if exists project_ideas_user_id_fkey;
alter table reviews       drop constraint if exists reviews_user_id_fkey;

-- 2) 关闭行级安全（免登录「共享工作区」模式：隔离由应用层工作区 UUID 完成）
alter table concepts      disable row level security;
alter table study_logs    disable row level security;
alter table resources      disable row level security;
alter table project_ideas disable row level security;
alter table reviews        disable row level security;

-- 3) 清理旧策略（避免遗留 policy 干扰）
drop policy if exists "own_concepts"      on concepts;
drop policy if exists "own_study_logs"    on study_logs;
drop policy if exists "own_resources"     on resources;
drop policy if exists "own_project_ideas" on project_ideas;
drop policy if exists "own_reviews"        on reviews;

-- 4) 为 5 张表增加 deleted 列（软删除标记，用于跨设备同步「删除」状态，杜绝删除后复活）
--    remove() 不再硬删云端行，而是把 deleted=true 通过 upsert 同步到各端；
--    云端没有该列时 pickCols 会自动剥离该字段（应用侧优雅降级，删除仅本机生效）。
alter table concepts      add column if not exists deleted boolean default false;
alter table study_logs   add column if not exists deleted boolean default false;
alter table resources     add column if not exists deleted boolean default false;
alter table project_ideas add column if not exists deleted boolean default false;
alter table reviews       add column if not exists deleted boolean default false;

-- 5) 新建「待办事项」表（user_id 不引用 auth.users，避免再次触发外键 409）
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  note text,
  done boolean default false,
  due_date date,
  priority text check (priority in ('高', '中', '低')) default '中',
  deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table todos disable row level security;
