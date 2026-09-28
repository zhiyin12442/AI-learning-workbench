import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured, TABLES } from './supabase'
import { SEED } from './seed'

const LS_DATA = 'nexdo-data'
const LS_PENDING = 'nexdo-pending'
const LS_DELETES = 'nexdo-deletes'
// 升级 key 以丢弃旧版本的随机同步码，强制所有设备回到共享工作区，开箱即自动同步
const LS_WS = 'nexdo-wsid-v2'
// 只读模式：开启后禁止删除任何内容（防误删 / 权限控制）
const LS_READONLY = 'nexdo-readonly'

const DataCtx = createContext(null)
export const useData = () => useContext(DataCtx)

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)

// 共享工作区 ID：写死在代码/环境变量里，所有设备默认使用同一个，装好即自动同步，
// 不再需要手动复制粘贴同步码。仅在「切换工作区」时才会被本地覆盖。
const DEFAULT_WSID = import.meta.env.VITE_WORKSPACE_ID || 'nexdo-shared-0001'

function getWorkspaceId() {
  try {
    return localStorage.getItem(LS_WS) || DEFAULT_WSID
  } catch {
    return DEFAULT_WSID
  }
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
      // 云端有数据则以云端为准；云端为空则保留本地/示例数据（避免误清空）
      setData((prev) => {
        const merged = { ...prev }
        for (const t of TABLES) if (cloud[t] && cloud[t].length) merged[t] = cloud[t]
        return merged
      })
      flushPending(wsId)
      flushDeletes(wsId)
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
      const { error } = await supabase.from(it.table).upsert({ ...it.row, user_id: workspaceId })
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

  // ---------- 持久化（防抖 1.5s） ----------
  const flush = useCallback(async (tables) => {
    // 始终写入本地缓存，保证离线/无网络也不丢
    localStorage.setItem(LS_DATA, JSON.stringify(data))
    if (!isSupabaseConfigured) return
    for (const t of tables) {
      const rows = (data[t] || []).map((r) => ({ ...r, user_id: wsId }))
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

  // ---------- 删除（真实后端删除 + 关联数据清理） ----------
  const remove = useCallback(async (table, id) => {
    // 权限门：只读模式下任何删除都被拦截
    if (readOnly) return

    // 关联数据清理（关联以数组/文本内嵌、并非数据库外键，故在应用层联级处理）
    setData((prev) => {
      const rows = prev[table] || []
      const target = rows.find((r) => r.id === id)
      const merged = { ...prev, [table]: rows.filter((r) => r.id !== id) }
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

    // 后端真实删除：按 id + 工作区隔离，避免误删其它工作区数据
    if (!isSupabaseConfigured) return
    const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', wsId)
    if (error) {
      // 删除失败（弱网/离线）则入队，待恢复后由 flushDeletes 补发
      const pend = readDeletes()
      pend.push({ table, id })
      localStorage.setItem(LS_DELETES, JSON.stringify(pend))
    }
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
  const logs = data.study_logs || []
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
    activeProjects: (data.project_ideas || []).filter((p) => !p.archived && p.status === '进行中').length,
    doneConcepts: (data.concepts || []).length,
  }
}
