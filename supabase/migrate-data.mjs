// 一次性数据迁移：把「改表前」同步在 5 张旧表(concepts/study_logs/resources/
// project_ideas/reviews)里的用户数据，组装成单表模型要求的 JSON blob，
// upsert 进 wb_nexdo(uid=共享工作区)，让新程序能读到。
// 只读取旧表 + 写入 wb_nexdo，绝不删除/改动任何旧表，源数据安全。
import { writeFileSync } from 'node:fs'

const URL = 'https://xjihmrcwumxxibomvgvt.supabase.co'
const KEY = 'sb_publishable_RFW1eCJZnYYFcqIjW65_ww_Pp60MujI'
const WSID = '9f1c3b2a-7d4e-4a1b-8c5d-2e6f9a0b3c1d'
const TABLES = ['concepts', 'study_logs', 'resources', 'project_ideas', 'reviews']

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
}

async function getAll(table) {
  const rows = []
  let offset = 0
  for (;;) {
    const r = await fetch(`${URL}/rest/v1/${table}?select=*&limit=1000&offset=${offset}`, { headers })
    if (!r.ok) throw new Error(`${table} 读取失败: ${r.status} ${await r.text()}`)
    const batch = await r.json()
    if (!batch.length) break
    rows.push(...batch)
    if (batch.length < 1000) break
    offset += 1000
  }
  return rows
}

async function main() {
  const blob = {}
  let total = 0
  for (const t of TABLES) {
    const rows = await getAll(t)
    // 仅保留主键为合法 uuid 的行（与 toBlob 行为一致，避免种子行混入）
    const uuidRe = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    blob[t] = rows.filter((r) => r && typeof r.id === 'string' && uuidRe.test(r.id))
    total += blob[t].length
    console.log(`  ${t}: 云端 ${rows.length} 行 → 纳入 blob ${blob[t].length} 行`)
  }
  // 补齐其余键（空数组），保持 blob 结构完整
  for (const k of ['todos', 'habits']) blob[k] = []

  // upsert 进 wb_nexdo（按 uid 主键幂等）
  const res = await fetch(`${URL}/rest/v1/wb_nexdo`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ uid: WSID, data: blob, updated_at: new Date().toISOString() }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`wb_nexdo upsert 失败: ${res.status} ${txt}`)
  }
  console.log(`\n✅ 已写入 wb_nexdo(uid=${WSID})，共纳入 ${total} 条记录`)

  // 回读校验
  const chk = await fetch(`${URL}/rest/v1/wb_nexdo?select=uid,updated_at&limit=1`, { headers })
  const back = await chk.json()
  console.log('回读结果:', JSON.stringify(back))
  writeFileSync(new URL('.migrate-backup.json', import.meta.url).href.replace(/^file:\/\//, ''), JSON.stringify(blob, null, 2))
  console.log('已备份迁移内容到 supabase/.migrate-backup.json')
}

main().catch((e) => {
  console.error('❌ 迁移出错:', e.message)
  process.exit(1)
})
