-- Nexdo · AI 学习工作台 Supabase 建表脚本（免登录「共享同步码」模式）
-- 在 Supabase SQL Editor 中整体执行即可，可重复执行（幂等）。

-- 概念学习
create table if not exists concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  group_name text not null default '未分组',
  name text not null,
  description text,
  tags text[] default '{}',
  pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 学习记录
create table if not exists study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  video_name text not null,
  study_date date not null default current_date,
  platform text,
  topic text,
  duration_minutes int,
  note text,
  skill_installed boolean default false,
  created_at timestamptz default now()
);

-- 项目搜集
create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category text check (category in ('skill', 'project', 'website')) not null,
  name text not null,
  url text,
  description text,
  installed boolean default false,
  created_at timestamptz default now()
);

-- 项目灵感
create table if not exists project_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  status text check (status in ('未开始', '进行中', '已完成')) default '未开始',
  goal text,
  stack text[] default '{}',
  required_skills text[] default '{}',
  steps jsonb default '[]', -- [{text, done}]
  reference_links text[] default '{}',
  notes text,
  archived boolean default false,
  pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 经验复盘
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text,
  source text check (source in ('自己', '他人')) default '自己',
  linked_items text[] default '{}',
  tags text[] default '{}',
  mood text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ===== 迁移：移除对 auth.users 的外键（user_id 现在存放 workspace 同步码） =====
alter table concepts drop constraint if exists concepts_user_id_fkey;
alter table study_logs drop constraint if exists study_logs_user_id_fkey;
alter table resources drop constraint if exists resources_user_id_fkey;
alter table project_ideas drop constraint if exists project_ideas_user_id_fkey;
alter table reviews drop constraint if exists reviews_user_id_fkey;

-- ===== 免登录「共享同步码」模式 =====
-- 数据隔离不再依赖 auth.uid()，改由应用层用不可猜测的 workspace id（同步码）过滤。
-- 因此关闭基于登录的行级策略，并禁用 RLS，使匿名 key 可读写。
-- 同步码为 128 位随机 UUID，实际不可枚举；请勿向他人泄露同步码。
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

-- updated_at 自动更新
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_concepts_updated on concepts;
create trigger trg_concepts_updated before update on concepts for each row execute function set_updated_at();
drop trigger if exists trg_project_ideas_updated on project_ideas;
create trigger trg_project_ideas_updated before update on project_ideas for each row execute function set_updated_at();
drop trigger if exists trg_reviews_updated on reviews;
create trigger trg_reviews_updated before update on reviews for each row execute function set_updated_at();
