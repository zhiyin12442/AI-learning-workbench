import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft } from 'lucide-react'
import { useData } from '../lib/store'

// 搜索范围定义：板块 → 字段
const SOURCES = [
  { table: 'concepts', board: '概念学习', path: '/concepts', fields: ['name', 'description', 'tags'] },
  { table: 'study_logs', board: '学习记录', path: '/studylog', fields: ['video_name', 'topic', 'note'] },
  { table: 'resources', board: '项目搜集', path: '/resources', fields: ['name', 'description'] },
  { table: 'project_ideas', board: '项目灵感', path: '/projects', fields: ['name', 'goal', 'stack'] },
  { table: 'reviews', board: '经验复盘', path: '/reviews', fields: ['title', 'body', 'tags'] },
]

const searchAll = (data, q) => {
  const kw = q.trim().toLowerCase()
  if (!kw) return []
  const out = []
  for (const s of SOURCES) {
    for (const item of data[s.table] || []) {
      const text = s.fields.map((f) => (Array.isArray(item[f]) ? item[f].join(' ') : item[f] || '')).join(' ').toLowerCase()
      if (text.includes(kw)) out.push({ board: s.board, path: s.path, id: item.id, title: item.name || item.video_name || item.title, snippet: text.slice(Math.max(0, text.indexOf(kw) - 20), text.indexOf(kw) + 40) })
    }
  }
  return out.slice(0, 12)
}

export function GlobalSearch({ autoFocusHint = true }) {
  const { data } = useData()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)
  const inputRef = useRef(null)
  const boxRef = useRef(null)
  const nav = useNavigate()
  const results = searchAll(data, q)

  // ⌘K / Ctrl+K 聚焦
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onClick) }
  }, [])

  const go = (r) => {
    setOpen(false); setQ('')
    nav(r.path, { state: { highlight: r.id } })
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative w-full md:w-[320px]">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setIdx(0) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
            else if (e.key === 'Enter' && results[idx]) go(results[idx])
            else if (e.key === 'Escape') setOpen(false)
          }}
          placeholder="快速查找"
          className="w-full rounded-[16px] bg-white border border-gray-200 pl-10 pr-4 py-2 text-sm"
        />
      </div>
      {open && q.trim() && (
        <div className="absolute z-50 mt-2 w-full md:w-[380px] card p-2 max-h-[360px] overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-sm text-ink-soft">没有找到包含「{q}」的内容，要不要新建一条？</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.board + r.id}
                onMouseEnter={() => setIdx(i)}
                onClick={() => go(r)}
                className={'w-full text-left px-3 py-2.5 rounded-[10px] min-h-[44px] ' + (i === idx ? 'bg-gray-50' : '')}
              >
                <p className="text-[11px] text-ink-faint flex items-center gap-1">
                  {r.board}
                  {i === idx && <CornerDownLeft size={11} className="ml-auto" />}
                </p>
                <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                <p className="text-xs text-ink-soft truncate">{r.snippet}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function Header({ title }) {
  return (
    <header className="mb-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      </div>
    </header>
  )
}
