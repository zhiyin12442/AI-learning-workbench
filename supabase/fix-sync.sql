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
