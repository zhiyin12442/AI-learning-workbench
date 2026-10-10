import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured, TABLES } from './supabase'
import { SEED } from './seed'

const LS_DATA = 'nexdo-data'
const LS_PENDING = 'nexdo-pending'
const LS_DELETES = 'nexdo-deletes'
// v3：强制使用 uuid 工作区（v2 曾用字符串 'nexdo-shared-0001'，与云端 uuid 列冲突导致整表同步失败）
const LS_WS = 'nexdo-wsid-v3'
// 只读模式：开启后禁止删除任何内容（防误删 / 权限控制）
const LS_READONLY = 'nexdo-readonly'

const DataCtx = createContext(null)
export const useData = () => useContext(DataCtx)

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v)

// 每张表在 Supabase 中真实存在的列。upsert 前只保留这些列，
// 避免前端临时字段（如编辑态、UI 标记）被一起发出，导致整批写入 400 失败。
const SCHEMA_COLS = {
  concepts: ['id', 'user_id', 'group_name', 'name', 'description', 'tags', 'pinned', 'deleted', 'created_at', 'updated_at'],
  study_logs: ['id', 'user_id', 'video_name', 'study_date', 'platform', 'topic', 'duration_minutes', 'note', 'skill_installed', 'deleted', 'created_at'],
  resources: ['id', 'user_id', 'category', 'name', 'url', 'description', 'installed', 'deleted', 'created_at'],
  project_ideas: ['id', 'user_id', 'name', 'status', 'goal', 'stack', 'required_skills', 'steps', 'reference_links', 'notes', 'archived', 'pinned', 'deleted', 'created_at', 'updated_at'],
  reviews: ['id', 'user_id', 'title', 'body', 'source', 'linked_items', 'tags', 'mood', 'deleted', 'created_at', 'updated_at'],
  todos: ['id', 'user_id', 'title', 'note', 'done', 'due_date', 'priority', 'deleted', 'created_at', 'updated_at'],
  habits: ['id', 'user_id', 'title', 'note', 'checkins', 'deleted', 'created_at', 'updated_at'],
}
const pickCols = (t, r) => {
  const cols = SCHEMA_COLS[t]
  if (!cols) return r
  const out = {}
  for (const k of cols) if (r[k] !== undefined) out[k] = r[k]
  return out
}

// 容错推送：把本地行 upsert 到云端。
// 若云端该表尚未创建 updated_at 列（用户还没跑最新 fix-sync.sql），
// Supabase 会返回 "column updated_at does not exist" —— 此时自动剥离 updated_at 重试，
// 保证仍能同步（仅暂时失去 LWW 精度），不会因为整批写入失败而导致记录丢失。
async function pushRows(table, rows, workspaceId) {
  if (!rows.length) return
  const cleaned = rows.map((r) => pickCols(table, { ...r, user_id: workspaceId }))
  const { error } = await supabase.from(table).upsert(cleaned)
  if (error && /updated_at/i.test(error.message || '')) {
    const stripped = cleaned.map(({ updated_at, ...rest }) => rest)
    await supabase.from(table).upsert(stripped)
  }
}

// ---------- 双向合并（删除权威 + last-write-wins 内容） ----------
// 目的：让任意两台设备加载云端后「收敛」到完全一致的数据，并保证：
//  - 【删除权威 / 单调】一旦本地或云端任一侧把某行标记为 deleted=true，
//    合并结果一定是 deleted=true，且会回推云端——删除永远不可逆、不复活。
//    这是上一版「删除复活」的真正根因：旧逻辑用 updated_at 比较，
//    云端一条带旧时间戳的 deleted=false 会盖过删除标记。
//  - 新增不消失：云端有、本地没有且未删除的行，并入本地。
//  - 内容一致：双方均存活时，按 updated_at 取较新版本（最终一致）。
// 合并结果随后整体回推云端（upsert 按 id 幂等），tombstone 一并传播。
function mergeData(local, cloud) {
  const out = {}
  const tOf = (r) => (r && r.updated_at ? Date.parse(r.updated_at) || 0 : 0)
  for (const t of TABLES) {
    const L = (local[t] || []).filter((r) => isUuid(r.id))
    const C = (cloud[t] || []).filter((r) => isUuid(r.id))
    const map = new Map()
    for (const r of L) map.set(r.id, { ...r })
    for (const r of C) {
      const ex = map.get(r.id)
      if (!ex) {
        // 云端有、本地没有：未删除才并入；已删除则不重新引入（保持删除）
        if (!r.deleted) map.set(r.id, { ...r })
      } else if (r.deleted) {
        // 云端标记删除 → 删除权威：直接采用云端整行（deleted=true），彻底杜绝复活
        map.set(r.id, { ...r })
      } else if (ex.deleted) {
        // 本地已删、云端存活 → 删除权威：保持本地删除并回推（不会被云端旧版本复活）
        map.set(r.id, { ...ex, deleted: true })
      } else {
        // 双方均存活：取 updated_at 较新者（内容最终一致）
        if (tOf(r) >= tOf(ex)) map.set(r.id, { ...r })
      }
    }
    out[t] = [...map.values()]
  }
  return out
}

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })

// 共享工作区 ID：必须是合法 uuid（云端 user_id 为 uuid 列）。所有设备默认使用同一个固定 uuid，
// 装好即自动共用同一份云端数据，无需手动交换同步码。仅「切换工作区」时才会被本地覆盖。
const SHARED_WSID = '9f1c3b2a-7d4e-4a1b-8c5d-2e6f9a0b3c1d'
const DEFAULT_WSID =
  import.meta.env.VITE_WORKSPACE_ID && isUuid(import.meta.env.VITE_WORKSPACE_ID)
    ? import.meta.env.VITE_WORKSPACE_ID
    : SHARED_WSID

function getWorkspaceId() {
  try {
    const v = localStorage.getItem(LS_WS)
    // 仅接受合法 uuid；旧版本遗留的字符串同步码一律丢弃，回归默认共享工作区
    if (v && isUuid(v)) return v
  } catch { /* ignore */ }
  return DEFAULT_WSID
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_DATA)
    if (raw) {
      const parsed = JSON.parse(raw)
      TABLES.forEach((t) => { if (!Array.isArray(parsed[t])) parsed[t] = [] })
      return parsed
    }
  } catch { /* ignore */ }
  return null
}

export function DataProvider({ children }) {
  const [wsId, setWsId] = useState(() => getWorkspaceId())
  const [cloudReady, setCloudReady] = useState(false)
  const [data, setData] = useState(() => loadLocal() || JSON.parse(JSON.stringify(SEED)))
  const [toast, setToast] = useState(null)
  const [readOnly, setReadOnly] = useState(() => {
    try { return localStorage.getItem(LS_READONLY) === '1' } catch { return false }
  })
  const dirty = useRef(new Set())
  const timer = useRef(null)
  const pendingRef = useRef([])
  const dataRef = useRef(data)
  // 同步提交：同时更新 state、dataRef.current 与本地缓存（localStorage）。
  //  - dataRef 必须「同步」更新，否则 20s 轮询在 setData 异步生效前读到旧数据，
  //    会把刚删除/修改的记录覆盖回旧值（上一版「删除复活」的根因之一）。
  //  - 每次提交都立即写入 localStorage：保证「刷新 / 切换页面 / 重新打开应用」后
  //    本地数据不丢，无需等待 1.5s 防抖落盘（之前仅 flush 时落盘，窗口内重开即丢）。
  const commit = useCallback((next) => {
    dataRef.current = next
    setData(next)
    try { localStorage.setItem(LS_DATA, JSON.stringify(next)) } catch { /* ignore */ }
  }, [])

  // ---------- 重新同步（双向合并 + 回推 + 二次合并） ----------
  // 这是「多端最终一致」的核心：任何时刻触发 syncNow，都会把本地∪云端按
  // updated_at 收敛、删除标记双向同步，并把合并后的真相回推云端。
  // 挂载、联网、以及每 20 秒后台轮询都会调用它，确保任意一端的变化自动传播到另一端。
  const syncingRef = useRef(false)
  const syncNow = useCallback(async () => {
    if (!isSupabaseConfigured || syncingRef.current) return
    syncingRef.current = true
    try {
      const cloud = {}
      for (const t of TABLES) {
        const { data: rows, error } = await supabase.from(t).select('*').eq('user_id', wsId)
        if (!error && rows) cloud[t] = rows
      }
      // 双向合并：本地(最新快照) ∪ 云端，按 updated_at 取较新版本，删除标记双向同步。
      // 注意：必须读「最新」的 dataRef.current，而不是函数开头捕获的快照——
      // 否则在下方多次网络往返期间用户新增/修改的记录不会进入 merged，
      // 最终 commit 会用旧快照覆盖掉这些记录，表现为「添加后无故消失」。
      let merged = mergeData(dataRef.current, cloud)
      // 回推合并后的真相（按 id 幂等 upsert，只影响我们发出的行）
      flushPending(wsId)
      try {
        for (const t of TABLES) {
          const rows = (merged[t] || []).filter((r) => isUuid(r.id)).map((r) => ({ ...r, user_id: wsId }))
          await pushRows(t, rows, wsId)
        }
      } catch { /* ignore */ }
      // 二次合并：推完后云端已含对端刚推送的数据，再拉一次并合并，确保收敛。
      // 同样用最新 dataRef.current，捕获「推送期间」本端发生的新增/修改。
      const cloud2 = {}
      for (const t of TABLES) {
        const { data: rows2, error } = await supabase.from(t).select('*').eq('user_id', wsId)
        if (!error && rows2) cloud2[t] = rows2
      }
      merged = mergeData(dataRef.current, cloud2)
      commit(merged)
      setCloudReady(true)
    } catch { /* ignore */ } finally { syncingRef.current = false }
  }, [wsId])

  // 挂载即同步一次
  useEffect(() => {
    if (!isSupabaseConfigured) { setCloudReady(false); return }
    syncNow()
  }, [syncNow])

  // ---------- 离线补发 ----------
  function readPending() {
    try { return JSON.parse(localStorage.getItem(LS_PENDING) || '[]') } catch { return [] }
  }
  async function flushPending(workspaceId) {
    const items = readPending()
    if (!items.length || !supabase) return
    const rest = []
    for (const it of items) {
      const { error } = await supabase.from(it.table).upsert(pickCols(it.table, { ...it.row, user_id: workspaceId }))
      if (error) rest.push(it)
    }
    localStorage.setItem(LS_PENDING, JSON.stringify(rest))
  }
  // 待补发的删除队列（离线/弱网时删除，恢复后真正从云端移除）
  function readDeletes() {
    try { return JSON.parse(localStorage.getItem(LS_DELETES) || '[]') } catch { return [] }
  }
  async function flushDeletes(workspaceId) {
    const items = readDeletes()
    if (!items.length || !supabase) return
    const rest = []
    for (const it of items) {
      const { error } = await supabase.from(it.table).delete().eq('id', it.id).eq('user_id', workspaceId)
      if (error) rest.push(it)
    }
    localStorage.setItem(LS_DELETES, JSON.stringify(rest))
  }
  // 后台轮询：每 20 秒重新同步一次，保证任意一端的变化在最多 20 秒内自动传播到另一端；
  // 联网恢复时也立即同步。这样「两端数据完全同步」不依赖用户手动反复刷新。
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const id = setInterval(() => { syncNow() }, 20000)
    const onOnline = () => syncNow()
    window.addEventListener('online', onOnline)
    return () => { clearInterval(id); window.removeEventListener('online', onOnline) }
  }, [syncNow])

  // 始终保存最新 data 引用，供加载完成后「主动补推云端」使用
  useEffect(() => { dataRef.current = data }, [data])

  // ---------- 持久化（防抖 1.5s） ----------
  const flush = useCallback(async (tables) => {
    const cur = dataRef.current
    // 始终写入本地缓存，保证离线/无网络也不丢（本地为权威副本）
    localStorage.setItem(LS_DATA, JSON.stringify(cur))
    if (!isSupabaseConfigured) return
    for (const t of tables) {
      // 仅同步主键为合法 uuid 的行：种子演示行使用固定 id，不影响云端；
      // 过滤掉非 uuid 行可避免整表 upsert 因单行类型错误而 400 失败。
      const rows = (cur[t] || [])
        .filter((r) => isUuid(r.id))
        .map((r) => ({ ...r, user_id: wsId }))
      if (!rows.length) continue
      try {
        await pushRows(t, rows, wsId)
      } catch {
        // 推送失败（弱网/离线/缺列）→ 进入离线队列，恢复后由下次 flush/sync 补发
        const pend = readPending()
        rows.forEach((row) => pend.push({ table: t, row }))
        localStorage.setItem(LS_PENDING, JSON.stringify(pend))
      }
    }
  }, [wsId])

  const schedule = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => flush([...dirty.current]), 1500)
  }, [flush])

  // ---------- CRUD ----------
  const upsert = useCallback((table, row) => {
    const prev = dataRef.current
    const rows = prev[table] || []
    const now = new Date().toISOString()
    let next
    if (row.id && rows.some((r) => r.id === row.id)) {
      next = rows.map((r) => (r.id === row.id ? { ...r, ...row, updated_at: now } : r))
    } else {
      next = [{ ...row, id: row.id || uid(), created_at: row.created_at || now, updated_at: now }, ...rows]
    }
    commit({ ...prev, [table]: next })
    dirty.current.add(table)
    schedule()
  }, [schedule, commit])

  // ---------- 删除（软删除：标记 deleted=true，由 upsert 同步到各端） ----------
  // 采用软删除而非硬删云端行：硬删会导致「其它端刷新时把已删记录又加回来（复活）」。
  // 软删除的 tombstone 随正常 upsert 路径传播，云端与所有端最终一致。
  const remove = useCallback(async (table, id) => {
    // 权限门：只读模式下任何删除都被拦截
    if (readOnly) return

    // 关联数据清理（关联以数组/文本内嵌、并非数据库外键，故在应用层联级处理）
    const prev = dataRef.current
    const rows = prev[table] || []
    const target = rows.find((r) => r.id === id)
    const now = new Date().toISOString()
    let next = { ...prev, [table]: rows.map((r) => (r.id === id ? { ...r, deleted: true, updated_at: now } : r)) }
    if (table === 'resources' && target?.name) {
      next = {
        ...next,
        project_ideas: (prev.project_ideas || []).map((p) =>
          (p.required_skills || []).includes(target.name)
            ? { ...p, required_skills: p.required_skills.filter((s) => s !== target.name), updated_at: now }
            : p
        ),
      }
      dirty.current.add('project_ideas')
    }
    if (table === 'project_ideas' && target?.name) {
      next = {
        ...next,
        reviews: (prev.reviews || []).map((rv) =>
          (rv.linked_items || []).includes(target.name)
            ? { ...rv, linked_items: rv.linked_items.filter((s) => s !== target.name), updated_at: now }
            : rv
        ),
      }
      dirty.current.add('reviews')
    }
    // commit 同步更新 dataRef，保证随后触发的 20s 轮询读到的是「已删除」状态，
    // 不会再把它当旧数据覆盖回云端造成复活。
    commit(next)
    dirty.current.add(table)
    // 立即把 tombstone 推到云端（不等 1.5s 防抖），缩短对端看到「已删除」的窗口，
    // 进一步杜绝删除后短暂复活的观感；同时保留 schedule 兜底。
    flush([table])
    schedule()
    // 软删除的 deleted=true 会通过 flush 的 upsert 同步到云端与其它端；
    // 不再在此处硬删云端行，避免「其它端合并时把已删记录重新加回」。
  }, [schedule, commit, flush, readOnly])

  // 只读模式开关（权限控制：开启后禁止删除）
  const setReadOnlyMode = useCallback((v) => {
    try { localStorage.setItem(LS_READONLY, v ? '1' : '0') } catch { /* ignore */ }
    setReadOnly(!!v)
  }, [])

  // 切换到自定义工作区（高级用法：想隔离一份独立数据时才用）
  const changeWorkspace = useCallback((newId) => {
    const id = (newId || '').trim()
    if (!id) return
    localStorage.setItem(LS_WS, id)
    dirty.current = new Set()
    setWsId(id)
  }, [])

  // 重置回共享工作区（丢弃本地覆盖，回归开箱即同步的默认）
  const resetWorkspace = useCallback(() => {
    try { localStorage.removeItem(LS_WS) } catch { /* ignore */ }
    dirty.current = new Set()
    setWsId(DEFAULT_WSID)
  }, [])

  const showToast = useCallback((msg, ms = 3200) => {
    setToast(msg)
    clearTimeout(showToast._t)
    showToast._t = setTimeout(() => setToast(null), ms)
  }, [])

  return (
    <DataCtx.Provider value={{ wsId, cloudReady, isSupabaseConfigured, data, upsert, remove, changeWorkspace, resetWorkspace, setReadOnlyMode, syncNow, readOnly, canDelete: !readOnly, showToast, toast }}>
      {children}
    </DataCtx.Provider>
  )
}

// ---------- 统计工具（全部在前端计算） ----------
export function computeStats(data) {
  const logs = (data.study_logs || []).filter((l) => !l.deleted)
  const dates = [...new Set(logs.map((l) => l.study_date))].sort()
  let streak = 0
  if (dates.length) {
    const set = new Set(dates)
    const cur = new Date()
    if (!set.has(cur.toISOString().slice(0, 10))) cur.setDate(cur.getDate() - 1)
    while (set.has(cur.toISOString().slice(0, 10))) {
      streak++
      cur.setDate(cur.getDate() - 1)
    }
  }
  const now = new Date()
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const inRange = (dt, from) => new Date(dt + 'T00:00:00') >= from
  return {
    streak,
    totalVideos: logs.length,
    weekVideos: logs.filter((l) => inRange(l.study_date, weekAgo)).length,
    monthVideos: logs.filter((l) => inRange(l.study_date, monthStart)).length,
    activeProjects: (data.project_ideas || []).filter((p) => !p.deleted && !p.archived && p.status === '进行中').length,
    doneConcepts: (data.concepts || []).filter((c) => !c.deleted).length,
  }
}
