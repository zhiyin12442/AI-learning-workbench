#!/usr/bin/env node
/**
 * 单表模型合并逻辑验证（复刻 store.jsx 的 mergeData，双设备并发模拟）
 * 目标：证明把传输层换成「单表 JSON-blob」后，同步语义与已验证的多表模型一致：
 *   ① 删除权威 → 删除不复活
 *   ② 新增不消失 → 两端收敛到完全一致
 *   ③ 同记录并发编辑 → updated_at 取最新（LWW）
 */
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v)

// ---- 与 store.jsx 完全一致的 mergeData（按 blob 内所有 key 合并） ----
function mergeData(local, cloud) {
  const out = {}
  const keys = new Set([...Object.keys(local || {}), ...Object.keys(cloud || {})])
  const tOf = (r) => (r && r.updated_at ? Date.parse(r.updated_at) || 0 : 0)
  for (const t of keys) {
    const L = (local[t] || []).filter((r) => isUuid(r && r.id))
    const C = (cloud[t] || []).filter((r) => isUuid(r && r.id))
    const map = new Map()
    for (const r of L) map.set(r.id, { ...r })
    for (const r of C) {
      const ex = map.get(r.id)
      if (!ex) { if (!r.deleted) map.set(r.id, { ...r }) }
      else if (r.deleted) { map.set(r.id, { ...r }) }
      else if (ex.deleted) { map.set(r.id, { ...ex, deleted: true }) }
      else { if (tOf(r) >= tOf(ex)) map.set(r.id, { ...r }) }
    }
    out[t] = [...map.values()]
  }
  return out
}

// ---- 模拟云端单表（一个工作区一行） ----
let CLOCK = 0
const now = () => { CLOCK += 1; return new Date(CLOCK * 1000).toISOString() }
const clone = (o) => JSON.parse(JSON.stringify(o))
let CLOUD = {}

function syncNow(dev) {
  const cloud = clone(CLOUD)
  let merged = mergeData(dev.local, cloud)
  CLOUD = clone(merged)                 // pushBlob（整份 upsert）
  const cloud2 = clone(CLOUD)
  dev.local = mergeData(dev.local, cloud2) // 二次合并 + commit
}

const newId = (n) => {
  const h = n.toString(16).padStart(12, '0')
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(0,3)}-8${h.slice(0,3)}-${h}${'0'.repeat(12 - h.length)}`.slice(0, 36)
}

let pass = 0, fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log('  ✅', name) }
  else { fail++; console.log('  ❌', name) }
}
function canonical(blob) {
  const o = {}
  for (const t of Object.keys(blob || {})) {
    o[t] = (blob[t] || []).map((r) => ({ id: r.id, deleted: !!r.deleted, name: r.name }))
      .sort((a, b) => (a.id < b.id ? -1 : 1))
  }
  return JSON.stringify(o)
}

// ============ 场景 1：删除权威，绝不复活 ============
console.log('\n[场景1] 删除权威：iPad 删除后，电脑端不能把它复活')
{
  const u1 = newId(1)
  CLOUD = { concepts: [{ id: u1, name: 'X', updated_at: now() }] }
  const A = { local: clone(CLOUD) }  // iPad
  const B = { local: clone(CLOUD) }  // 电脑
  // iPad 删除 X（软删，updated_at 推进）
  A.local.concepts = A.local.concepts.map((r) => (r.id === u1 ? { ...r, deleted: true, updated_at: now() } : r))
  syncNow(A)                          // iPad 把 tombstone 推上云
  // 电脑端在“旧版本”上又编辑了 X（updated_at 比 tombstone 更新），然后同步
  B.local.concepts = B.local.concepts.map((r) => (r.id === u1 ? { ...r, name: 'X- edited', updated_at: now() } : r))
  syncNow(B)
  check('云端 X 仍为 deleted', (CLOUD.concepts.find((r) => r.id === u1) || {}).deleted === true)
  check('电脑端 X 被标记为 deleted（未复活）', (B.local.concepts.find((r) => r.id === u1) || {}).deleted === true)
  check('iPad 端 X 仍为 deleted', (A.local.concepts.find((r) => r.id === u1) || {}).deleted === true)
}

// ============ 场景 2：两端各加记录，最终全部保留并一致 ============
console.log('\n[场景2] 新增不消失：两端各加一条，全部保留且收敛')
{
  CLOUD = {}
  const A = { local: { concepts: [] } }
  const B = { local: { concepts: [] } }
  A.local.concepts.push({ id: newId(11), name: 'A加的', updated_at: now() })
  B.local.concepts.push({ id: newId(22), name: 'B加的', updated_at: now() })
  syncNow(A); syncNow(B); syncNow(A); syncNow(B) // 多轮保证收敛
  check('云端含 2 条', (CLOUD.concepts || []).length === 2)
  check('iPad 含 2 条', (A.local.concepts || []).length === 2)
  check('电脑含 2 条', (B.local.concepts || []).length === 2)
  check('两端 canonical 完全一致', canonical(A.local) === canonical(B.local))
  check('两端 == 云端', canonical(A.local) === canonical(CLOUD))
}

// ============ 场景 3：同记录并发编辑 → LWW 取最新 ============
console.log('\n[场景3] 同记录并发编辑：按 updated_at 取最新版本')
{
  const u1 = newId(3)
  CLOUD = { concepts: [{ id: u1, name: 'orig', updated_at: now() }] }
  const A = { local: clone(CLOUD) }
  const B = { local: clone(CLOUD) }
  A.local.concepts = A.local.concepts.map((r) => (r.id === u1 ? { ...r, name: 'A版', updated_at: now() } : r))
  B.local.concepts = B.local.concepts.map((r) => (r.id === u1 ? { ...r, name: 'B版', updated_at: now() } : r))
  syncNow(A); syncNow(B); syncNow(A)
  const finalName = (CLOUD.concepts.find((r) => r.id === u1) || {}).name
  check('最终收敛为较晚编辑的 B版', finalName === 'B版')
  check('两端均为 B版', (A.local.concepts.find((r) => r.id === u1) || {}).name === 'B版' && (B.local.concepts.find((r) => r.id === u1) || {}).name === 'B版')
}

// ============ 场景 4：多表混合压力（删/增/改交错）===========
console.log('\n[场景4] 多表混合：删概念+加待办+改灵感，多轮后完全一致')
{
  CLOUD = {}
  const A = { local: { concepts: [], todos: [], project_ideas: [] } }
  const B = { local: { concepts: [], todos: [], project_ideas: [] } }
  const c1 = newId(101), t1 = newId(102), p1 = newId(103)
  A.local.concepts.push({ id: c1, name: '概念1', updated_at: now() })
  A.local.todos.push({ id: t1, title: '待办1', updated_at: now() })
  syncNow(A)
  B.local = clone(CLOUD)
  // B 删除概念1、加灵感、改待办
  B.local.concepts = B.local.concepts.map((r) => (r.id === c1 ? { ...r, deleted: true, updated_at: now() } : r))
  B.local.project_ideas.push({ id: p1, name: '灵感1', updated_at: now() })
  B.local.todos = B.local.todos.map((r) => (r.id === t1 ? { ...r, title: '待办1-改', updated_at: now() } : r))
  syncNow(B)
  // A 又加一条待办
  A.local.todos.push({ id: newId(104), title: '待办2', updated_at: now() })
  syncNow(A); syncNow(B); syncNow(A); syncNow(B)
  check('概念1 在两端均 deleted', (A.local.concepts.find((r) => r.id === c1) || {}).deleted && (B.local.concepts.find((r) => r.id === c1) || {}).deleted)
  check('待办含 2 条且待办1已改为新标题', (A.local.todos || []).length === 2 && (A.local.todos.find((r) => r.id === t1) || {}).title === '待办1-改')
  check('灵感1 在两端均存在', (A.local.project_ideas || []).some((r) => r.id === p1) && (B.local.project_ideas || []).some((r) => r.id === p1))
  check('两端完全一致', canonical(A.local) === canonical(B.local))
  check('两端 == 云端', canonical(A.local) === canonical(CLOUD))
}

console.log(`\n==== 结果：${pass} 通过 / ${fail} 失败 ====`)
process.exit(fail ? 1 : 0)
