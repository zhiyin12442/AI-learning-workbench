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
}
const pickCols = (t, r) => {
  const cols = SCHEMA_COLS[t]
  if (!cols) return r
  const out = {}
  for (const k of cols) if (r[k] !== undefined) out[k] = r[k]
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

  // ---------- 加载云端数据（按同步码过滤）；未配置 Supabase 则仅本地 ----------
  useEffect(() => {
    if (!isSupabaseConfigured) { setCloudReady(false); return }
    let cancelled = false
    ;(async () => {
      const cloud = {}
      for (const t of TABLES) {
        const { data: rows, error } = await supabase.from(t).select('*').eq('user_id', wsId)
        if (!error && rows) cloud[t] = rows
      }
      if (cancelled) return
      // 本地为权威：永远保留本地的增删改结果，绝不被云端旧数据整表覆盖。
      // 仅当云端存在「本地没有」且「非用户已删除」的行时才并入（并集），
      // 从而彻底杜绝「新增被清 / 删除后复活」。
      const deletes = new Set(readDeletes().map((d) => d.id))
      setData((prev) => {
        const base = { ...prev }
        TABLES.forEach((t) => { if (!Array.isArray(base[t])) base[t] = [] })
        for (const t of TABLES) {
          const cloudRows = (cloud[t] || []).filter((r) => isUuid(r.id) && !deletes.has(r.id))
          const localIds = new Set(base[t].map((r) => r.id))
          // 把云端的「已删除」标记合并回本地：软删除跨设备生效，彻底杜绝删除后复活
          for (const cr of cloudRows) {
            if (cr.deleted && localIds.has(cr.id)) {
              base[t] = base[t].map((r) => (r.id === cr.id ? { ...r, deleted: true } : r))
            }
          }
          const additions = cloudRows.filter((r) => !r.deleted && !localIds.has(r.id))
          if (additions.length) base[t] = [...base[t], ...additions]
        }
        return base
      })
      flushPending(wsId)
      flushDeletes(wsId)
      // 云端就绪后，主动把「本地当前数据」补推到云端：覆盖 LS_PENDING 之外的遗留本地增删，
      // 保证多端真正同步（例如昨天在电脑端新增/删除、但当时因 RLS 写失败而只留在本机的记录）。
      // upsert 按 id 幂等，不会误删云端其它设备的行。
      try {
        const cur = dataRef.current
        for (const t of TABLES) {
          const rows = (cur[t] || []).filter((r) => isUuid(r.id)).map((r) => pickCols(t, { ...r, user_id: wsId }))
          if (rows.length) await supabase.from(t).upsert(rows)
        }
      } catch { /* ignore */ }
      setCloudReady(true)
    })()
    return () => { cancelled = true }
  }, [wsId])

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
  useEffect(() => {
    const onOnline = () => { if (isSupabaseConfigured) { flushPending(wsId); flushDeletes(wsId) } }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [wsId])

  // 始终保存最新 data 引用，供加载完成后「主动补推云端」使用
  useEffect(() => { dataRef.current = data }, [data])

  // ---------- 持久化（防抖 1.5s） ----------
  const flush = useCallback(async (tables) => {
    // 始终写入本地缓存，保证离线/无网络也不丢（本地为权威副本）
    localStorage.setItem(LS_DATA, JSON.stringify(data))
    if (!isSupabaseConfigured) return
    for (const t of tables) {
      // 仅同步主键为合法 uuid 的行：种子演示行使用固定 id，不影响云端；
      // 过滤掉非 uuid 行可避免整表 upsert 因单行类型错误而 400 失败。
      const rows = (data[t] || [])
        .filter((r) => isUuid(r.id))
        .map((r) => pickCols(t, { ...r, user_id: wsId }))
      if (!rows.length) continue
      const { error } = await supabase.from(t).upsert(rows)
      if (error) {
        const pend = readPending()
        rows.forEach((row) => pend.push({ table: t, row }))
        localStorage.setItem(LS_PENDING, JSON.stringify(pend))
      }
    }
  }, [data, wsId])

  const schedule = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => flush([...dirty.current]), 1500)
  }, [flush])

  // ---------- CRUD ----------
  const upsert = useCallback((table, row) => {
    setData((prev) => {
      const rows = prev[table] || []
      const now = new Date().toISOString()
      let next
      if (row.id && rows.some((r) => r.id === row.id)) {
        next = rows.map((r) => (r.id === row.id ? { ...r, ...row, updated_at: now } : r))
      } else {
        next = [{ ...row, id: row.id || uid(), created_at: row.created_at || now }, ...rows]
      }
      return { ...prev, [table]: next }
    })
    dirty.current.add(table)
    schedule()
  }, [schedule])

  // ---------- 删除（软删除：标记 deleted=true，由 upsert 同步到各端） ----------
  // 采用软删除而非硬删云端行：硬删会导致「其它端刷新时把已删记录又加回来（复活）」。
  // 软删除的 tombstone 随正常 upsert 路径传播，云端与所有端最终一致。
  const remove = useCallback(async (table, id) => {
    // 权限门：只读模式下任何删除都被拦截
    if (readOnly) return

    // 关联数据清理（关联以数组/文本内嵌、并非数据库外键，故在应用层联级处理）
    setData((prev) => {
      const rows = prev[table] || []
      const target = rows.find((r) => r.id === id)
      const merged = { ...prev, [table]: rows.map((r) => (r.id === id ? { ...r, deleted: true } : r)) }
      if (table === 'resources' && target?.name) {
        merged.project_ideas = (prev.project_ideas || []).map((p) =>
          (p.required_skills || []).includes(target.name)
            ? { ...p, required_skills: p.required_skills.filter((s) => s !== target.name) }
            : p
        )
        dirty.current.add('project_ideas')
      }
      if (table === 'project_ideas' && target?.name) {
        merged.reviews = (prev.reviews || []).map((rv) =>
          (rv.linked_items || []).includes(target.name)
            ? { ...rv, linked_items: rv.linked_items.filter((s) => s !== target.name) }
            : rv
        )
        dirty.current.add('reviews')
      }
      return merged
    })
    dirty.current.add(table)
    schedule()
    // 软删除的 deleted=true 会通过 flush 的 upsert 同步到云端与其它端；
    // 不再在此处硬删云端行，避免「其它端合并时把已删记录重新加回」。
  }, [schedule, wsId, readOnly])

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
    <DataCtx.Provider value={{ wsId, cloudReady, isSupabaseConfigured, data, upsert, remove, changeWorkspace, resetWorkspace, setReadOnlyMode, readOnly, canDelete: !readOnly, showToast, toast }}>
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
