-- Nexdo 单表同步模型 ·【只需在建库时执行一次】
-- =====================================================================
-- 设计：云端只有一张表 wb_nexdo(uid, data jsonb, updated_at)，
--       整个应用状态（各功能数组）作为一个 JSON 大对象存进 data 列。
-- 此后加任何新功能 = 往 JSON 里加字段，数据库结构永远不变，
-- 因此再也不需要建表 / 改表 SQL（与生活工作台一致）。
-- ---------------------------------------------------------------------
-- 执行方式（任选其一）：
--   ①【手动·一次性】Supabase 后台 → SQL Editor → 粘贴本文件全部内容 → Run
--   ②【自动】助手在沙箱运行： node supabase/migrate.mjs
--       （凭证存于本地 supabase/.deploy-secrets.json，不进 Git，可随时撤销）
-- =====================================================================

-- 单表：一个工作区一行，data 存整份应用状态 JSON
create table if not exists wb_nexdo (
  uid         text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz default now()
);

-- 关闭行级安全：共享工作区模式下，隔离由应用层工作区 uid 完成；
-- anon 角色在 RLS 关闭时即可对该表做增改查（与生活工作台的 wb_life 一致）。
alter table wb_nexdo disable row level security;

-- 显式授权：允许匿名/已登录角色对该表做增改查（否则前端匿名 key 写入会被 RLS 拦截）。
-- 这是上一次建表漏掉的授权，导致新程序无法把数据写回云端；补上后同步即生效。
grant all on table wb_nexdo to anon, authenticated;
