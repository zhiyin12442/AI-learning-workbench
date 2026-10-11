#!/usr/bin/env node
/**
 * Nexdo 单表模型 · 云端结构迁移（可选 / 自动化）
 * ------------------------------------------------------------------
 * 用途：把 supabase/schema-single.sql 推送到 Supabase 云端，
 *       建好 wb_nexdo 单表并关闭 RLS（幂等，可重复执行）。
 *
 * 只需在建库时跑【一次】。之后加功能不再需要任何 SQL。
 *
 * 凭证（二选一，存本地 supabase/.deploy-secrets.json，绝不进 Git）：
 *   { "projectRef": "xjihmrcwumxxibomvgvt", "pat": "sbp_xxx" }   ← 推荐，用 Management API
 *   { "projectRef": "xjihmrcwumxxibomvgvt", "dbPassword": "***" } ← 用直连 postgres
 * 也可走环境变量：SUPABASE_PROJECT_REF / SUPABASE_PAT / SUPABASE_DB_PASSWORD
 *
 * 运行： node supabase/migrate.mjs   （或 npm run db:migrate）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadSecrets() {
  const p = path.join(ROOT, 'supabase', '.deploy-secrets.json')
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { /* ignore */ }
  }
  return {
    projectRef: process.env.SUPABASE_PROJECT_REF,
    pat: process.env.SUPABASE_PAT,
    dbPassword: process.env.SUPABASE_DB_PASSWORD,
  }
}

const secrets = loadSecrets()
const ref = secrets.projectRef || 'xjihmrcwumxxibomvgvt'
const SQL_FILE = path.join(ROOT, 'supabase', 'schema-single.sql')
const sql = fs.readFileSync(SQL_FILE, 'utf8')

async function runViaApi() {
  if (!secrets.pat) return false
  const url = `https://api.supabase.com/v1/projects/${ref}/database/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secrets.pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) { console.error('[migrate] Management API 执行失败:', res.status, text); return false }
  console.log('[migrate] ✅ 通过 Management API 建表成功')
  return true
}

async function runViaPg() {
  if (!secrets.dbPassword) return false
  let pg
  try { pg = (await import('pg')).default } catch {
    console.error('[migrate] 缺少 pg 驱动，请先：npm i pg（或改用 pat 方式）')
    return false
  }
  const client = new pg.Client({
    host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres',
    password: secrets.dbPassword, database: 'postgres', ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  await client.query(sql)
  await client.end()
  console.log('[migrate] ✅ 通过直连 postgres 建表成功')
  return true
}

async function verify() {
  const q = `select table_name from information_schema.tables where table_schema='public' and table_name='wb_nexdo';`
  try {
    if (secrets.pat) {
      const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secrets.pat}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      console.log('[migrate] 校验 wb_nexdo 表:', (await res.text()).slice(0, 200))
    }
  } catch { /* ignore */ }
}

;(async () => {
  const ok = (await runViaApi()) || (await runViaPg())
  if (!ok) {
    console.error('\n[migrate] 未检测到有效凭证。请二选一：')
    console.error('  1) 在 supabase/.deploy-secrets.json 写入 { "projectRef": "...", "pat": "sbp_..." }')
    console.error('  2) 或直接在 Supabase 后台 SQL Editor 粘贴 supabase/schema-single.sql 执行一次（手动·一次性）')
    process.exit(1)
  }
  await verify()
  console.log('[migrate] 完成。之后 Nexdo 加功能都不再需要跑 SQL。')
})()
