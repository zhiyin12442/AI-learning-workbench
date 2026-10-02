-- Nexdo 多端同步修复：关闭 5 张表的行级安全（RLS），允许匿名 key 读写。
-- 应用用「不可猜测的 workspace UUID」做数据隔离，不依赖登录，因此关闭 RLS 是预期设计
-- （详见 schema.sql 第 82-90 行）。当前线上库的 RLS 是开启状态，导致所有写入被拦截（401），
-- 各设备只保留各自 localStorage、无法互相同步。
--
-- 在 Supabase 后台 → 左侧 SQL Editor → 粘贴本文件全部内容 → 「Run」执行一次即可（可重复执行，幂等）。

alter table concepts disable row level security;
alter table study_logs disable row level security;
alter table resources disable row level security;
alter table project_ideas disable row level security;
alter table reviews disable row level security;

drop policy if exists "own_concepts" on concepts;
drop policy if exists "own_study_logs" on study_logs;
drop policy if exists "own_resources" on resources;
drop policy if exists "own_project_ideas" on project_ideas;
drop policy if exists "own_reviews" on reviews;
