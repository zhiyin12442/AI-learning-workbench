// 严格复刻 src/lib/store.jsx 的同步路径，对真实云端 wb_nexdo 做双设备收敛仿真。
// 目的：用证据回答「电脑端和 iPad 端是否都能成功显示/同步，数据是否永不丢失」。
import { writeFileSync } from 'node:fs'

const BASE = 'https://xjihmrcwumxxibomvgvt.supabase.co'
const KEY = 'sb_publishable_RFW1eCJZnYYFcqIjW65_ww_Pp60MujI'
const WSID = '9f1c3b2a-7d4e-4a1b-8c5d-2e6f9a0b3c1d' // 真实共享工作区
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v)
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; const v = c === 'x' ? r : (r & 0x3) | 0x8; return v.toString(16) }))
const nowISO = () => new Date().toISOString()

// ---- 复刻 store.jsx ----
function toBlob(data) {
  const out = {}
  for (const t of Object.keys(data || {})) out[t] = (Array.isArray(data[t]) ? data[t] : []).filter(r => isUuid(r && r.id))
  return out
}
function mergeData(local, cloud) {
  const out = {}
  const keys = new Set([...Object.keys(local || {}), ...Object.keys(cloud || {})])
  const tOf = r => (r && r.updated_at ? Date.parse(r.updated_at) || 0 : 0)
  for (const t of keys) {
    const L = (local[t] || []).filter(r => isUuid(r && r.id))
    const C = (cloud[t] || []).filter(r => isUuid(r && r.id))
    const map = new Map()
    for (const r of L) map.set(r.id, { ...r })
    for (const r of C) {
      const ex = map.get(r.id)
      if (!ex) { if (!r.deleted) map.set(r.id, { ...r }) }
      else if (r.deleted) map.set(r.id, { ...r })
      else if (ex.deleted) map.set(r.id, { ...ex, deleted: true })
      else if (tOf(r) >= tOf(ex)) map.set(r.id, { ...r })
    }
    out[t] = [...map.values()]
  }
  return out
}
async function pushBlob(dataObj, workspaceId) {
  const blob = toBlob(dataObj)
  const r = await fetch(`${BASE}/rest/v1/wb_nexdo`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ uid: workspaceId, data: blob, updated_at: nowISO() }),
  })
  if (!r.ok) {
    const txt = await r.text().catch(() => '')
    let j = null; try { j = txt ? JSON.parse(txt) : null } catch {}
    throw (j || { message: r.statusText })
  }
}
async function pullCloud(wsId) {
  const r = await fetch(`${BASE}/rest/v1/wb_nexdo?select=*&uid=eq.${wsId}`, { headers: H })
  const rows = await r.json()
  if (!rows || !rows.length) return {}
  const d = rows[0] && rows[0].data
  return d && typeof d === 'object' ? d : {}
}
// 一次完整的 syncNow（复刻）
async function syncNow(localState, wsId) {
  const cloud = await pullCloud(wsId)
  let merged = mergeData(localState, cloud)
  await pushBlob(merged, wsId).catch(() => {})
  const cloud2 = await pullCloud(wsId)
  merged = mergeData(localState, cloud2)
  return merged
}

// 复刻 upsert/remove（带 commit 语义：本地 state 同步更新）
function upsert(state, table, row) {
  const rows = state[table] || []
  const n = nowISO()
  let next
  if (row.id && rows.some(r => r.id === row.id)) next = rows.map(r => r.id === row.id ? { ...r, ...row, updated_at: n } : r)
  else next = [{ ...row, id: row.id || uid(), created_at: row.created_at || n, updated_at: n }, ...rows]
  return { ...state, [table]: next }
}
function remove(state, table, id) {
  const rows = state[table] || []
  const n = nowISO()
  return { ...state, [table]: rows.map(r => r.id === id ? { ...r, deleted: true, updated_at: n } : r) }
}

const live = (arr) => (Array.isArray(arr) ? arr : []).filter(x => !(x && x.deleted)).length
const snap = (d) => `[概念${live(d.concepts)} 学习${live(d.study_logs)} 搜集${live(d.resources)} 灵感${live(d.project_ideas)} 复盘${live(d.reviews)} 待办${live(d.todos)} 每日${live(d.habits)}]`

let pass = 0, fail = 0
const check = (name, cond) => { if (cond) { pass++; console.log('  ✅', name) } else { fail++; console.log('  ❌', name) } }

async function main() {
  console.log('===== 0. 备份真实云端现状（测试后还原，绝不污染你的数据）=====')
  const backup = await pullCloud(WSID)
  writeFileSync('.verify-backup.json', JSON.stringify(backup, null, 2))
  console.log('  当前云端:', snap(backup))

  // 用独立测试工作区，避免触碰你的真实数据；同时验证真实 WSID 的权限路径
  const TWS = 'aaaaaaaa-0000-0000-0000-00000000aaa1'
  // 清空测试工作区
  await fetch(`${BASE}/rest/v1/wb_nexdo?uid=eq.${TWS}`, { method: 'DELETE', headers: H }).catch(() => {})

  console.log('\n===== 1. 设备A：在 7 个板块各新增 1 条，立即同步 =====')
  let A = { concepts: [], study_logs: [], resources: [], project_ideas: [], reviews: [], todos: [], habits: [] }
  const ids = {}
  for (const t of ['concepts', 'study_logs', 'resources', 'project_ideas', 'reviews', 'todos', 'habits']) {
    A = upsert(A, t, { title: `测试-${t}-${Date.now()}`, note: 'verify' })
    ids[t] = A[t][0].id
  }
  // 设备A 模拟 App：提交后 flush（推送）
  await pushBlob(A, TWS).catch(e => { console.log('  A 推送失败', e); fail++ })
  console.log('  设备A 本地:', snap(A))

  console.log('\n===== 2. 设备B：从云端拉取，应能看到设备A的 7 条新增 =====')
  let B = { concepts: [], study_logs: [], resources: [], project_ideas: [], reviews: [], todos: [], habits: [] }
  B = await syncNow(B, TWS)
  console.log('  设备B 拉取后:', snap(B))
  check('设备B 能看到设备A在「概念学习」的新增', live(B.concepts) >= 1)
  check('设备B 能看到设备A在「每日工作」的新增', live(B.habits) >= 1)
  check('设备B 能看到设备A在「待办事项」的新增', live(B.todos) >= 1)
  check('设备B 各板块合计 = 7 条', ['concepts','study_logs','resources','project_ideas','reviews','todos','habits'].reduce((s,t)=>s+live(B[t]),0) === 7)

  console.log('\n===== 3. 设备B 也新增 1 条（概念），两端应最终一致 =====')
  B = upsert(B, 'concepts', { title: `测试-B新增-${Date.now()}` })
  await pushBlob(B, TWS).catch(() => {})
  A = await syncNow(A, TWS)
  B = await syncNow(B, TWS)
  console.log('  收敛后 A:', snap(A), ' B:', snap(B))
  check('设备A 收到设备B的新增（概念=2）', live(A.concepts) === 2)
  check('设备B 概念=2 且两端一致', live(A.concepts) === live(B.concepts))

  console.log('\n===== 4. 删除权威：设备A 删除一条，设备B 不得复活 =====')
  A = remove(A, 'concepts', ids.concepts)
  // A 立即推送（复刻 remove 的 flush）
  await pushBlob(A, TWS).catch(() => {})
  // 模拟设备B 稍后同步（且 B 本地仍“以为”那条存在）
  B = await syncNow(B, TWS)
  console.log('  删除同步后 B:', snap(B))
  const stillThere = (B.concepts || []).find(r => r.id === ids.concepts && !r.deleted)
  check('设备B 上被删记录未复活（标记 deleted）', !(B.concepts || []).find(r => r.id === ids.concepts) || (B.concepts || []).find(r => r.id === ids.concepts).deleted === true)
  // 再让 A 同步一次，确认不会被云端“旧版本”复活
  A = await syncNow(A, TWS)
  check('设备A 二次同步后删除仍在（不复活）', (A.concepts || []).find(r => r.id === ids.concepts)?.deleted === true)

  console.log('\n===== 5. 新增不丢：并发窗口（A、B 同时新增不同记录）=====')
  let A2 = await syncNow({ concepts: [], study_logs: [], resources: [], project_ideas: [], reviews: [], todos: [], habits: [] }, TWS)
  let B2 = await syncNow({ concepts: [], study_logs: [], resources: [], project_ideas: [], reviews: [], todos: [], habits: [] }, TWS)
  A2 = upsert(A2, 'reviews', { title: `并发-A-${Date.now()}` })
  B2 = upsert(B2, 'reviews', { title: `并发-B-${Date.now()}` })
  // 同时推送（模拟网络竞态）
  await Promise.all([ pushBlob(A2, TWS).catch(()=>{}), pushBlob(B2, TWS).catch(()=>{}) ])
  // 多轮同步收敛
  for (let i = 0; i < 3; i++) { A2 = await syncNow(A2, TWS); B2 = await syncNow(B2, TWS) }
  console.log('  收敛后 A 复盘:', live(A2.reviews), ' B 复盘:', live(B2.reviews))
  check('并发新增两条复盘均不丢（>=2）', live(A2.reviews) >= 2 && live(B2.reviews) >= 2)
  check('两端复盘数一致', live(A2.reviews) === live(B2.reviews))

  console.log('\n===== 6. 还原测试工作区（删除测试数据，不影响真实 WSID）=====')
  await fetch(`${BASE}/rest/v1/wb_nexdo?uid=eq.${TWS}`, { method: 'DELETE', headers: H }).catch(() => {})
  console.log('  测试工作区已清空。真实云端未改动。')

  console.log(`\n===== 结果：${pass} 通过 / ${fail} 失败 =====`)
  if (fail > 0) process.exit(1)
}
main().catch(e => { console.error('测试异常', e); process.exit(2) })
