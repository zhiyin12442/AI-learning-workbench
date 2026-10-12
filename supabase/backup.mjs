// 只读备份：把 5 张旧表的用户数据抓到本地 supabase/.recovery-backup.json
// 仅 SELECT，不写云端、不改任何表。用于极端情况下的数据兜底。
import { writeFileSync } from 'node:fs'

const BASE = 'https://xjihmrcwumxxibomvgvt.supabase.co'
const KEY = 'sb_publishable_RFW1eCJZnYYFcqIjW65_ww_Pp60MujI'
const TABLES = ['concepts', 'study_logs', 'resources', 'project_ideas', 'reviews']
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` }

async function getAll(table) {
  const rows = []
  let offset = 0
  for (;;) {
    const r = await fetch(`${BASE}/rest/v1/${table}?select=*&limit=1000&offset=${offset}`, { headers })
    if (!r.ok) throw new Error(`${table} 读取失败: ${r.status}`)
    const b = await r.json()
    if (!b.length) break
    rows.push(...b)
    if (b.length < 1000) break
    offset += 1000
  }
  return rows
}

const out = {}
let total = 0
for (const t of TABLES) {
  const rows = await getAll(t)
  out[t] = rows
  total += rows.length
  console.log(`  ${t}: ${rows.length} 行`)
}
writeFileSync(new URL('./.recovery-backup.json', import.meta.url), JSON.stringify(out, null, 2))
console.log(`\n✅ 已备份 ${total} 条到 supabase/.recovery-backup.json（本地文件，云端未被改动）`)
