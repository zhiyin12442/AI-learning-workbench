import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onMouseDown={onClose}>
      <div
        className={'card w-full shadow-modal ' + (wide ? 'max-w-2xl' : 'max-w-lg') + ' p-6 max-h-[85vh] overflow-y-auto'}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-[10px] text-gray-400 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-medium text-ink-soft mb-1.5">{label}</span>
      {children}
    </label>
  )
}

export function StatCard({ label, value, icon: Icon, delta, deltaLabel = 'from last month', up = true, color = 'text-success' }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {Icon && <Icon size={16} className="text-gray-400 mt-0.5" />}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
        {delta && (
          <p className={'text-xs leading-tight text-right ' + color}>
            <span className="font-medium">{up ? '↑' : '↓'} {delta}</span>
            <span className="block text-ink-faint mt-0.5">{deltaLabel}</span>
          </p>
        )}
      </div>
    </div>
  )
}

// 优先级胶囊：Medium=黄 High=红 Low=灰（对照截图 Tasks overview）
export function PriorityPill({ level }) {
  const map = {
    'High': 'bg-danger/10 text-danger',
    'Medium': 'bg-warning/10 text-warning',
    'Low': 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ' + (map[level] || map['Low'])}>
      <span className={'w-1 h-1 rounded-full ' + (level === 'High' ? 'bg-danger' : level === 'Medium' ? 'bg-warning' : 'bg-gray-400')} />
      {level}
    </span>
  )
}

// 彩色状态文字：Completed=绿 On progress=紫 On review=黄 Not Started=灰（对照截图，非胶囊）
export function StatusText({ status }) {
  const map = {
    '已完成': 'text-success',
    '进行中': 'text-folder-violet',
    'On progress': 'text-folder-violet',
    'On review': 'text-warning',
    '复查中': 'text-warning',
    '未开始': 'text-gray-500',
    'Not Started': 'text-gray-700',
  }
  return <span className={'text-xs font-semibold whitespace-nowrap ' + (map[status] || 'text-gray-500')}>{status}</span>
}

// 状态胶囊：已完成=绿 进行中=黄 未开始=灰/红
export function StatusPill({ status }) {
  const map = {
    '已完成': 'bg-success/10 text-success',
    '进行中': 'bg-warning/10 text-warning',
    '未开始': 'bg-gray-100 text-gray-500',
    '逾期': 'bg-danger/10 text-danger',
  }
  return (
    <span className={'rounded-full px-2.5 py-1 text-xs font-medium ' + (map[status] || 'bg-gray-100 text-gray-500')}>
      {status}
    </span>
  )
}

export function TagPill({ children, className = 'bg-gray-100 text-ink-soft' }) {
  return <span className={'rounded-full px-2.5 py-1 text-xs whitespace-nowrap ' + className}>{children}</span>
}

// 搜索关键词高亮
export function Highlight({ text, kw }) {
  if (!kw || !text) return text
  const parts = String(text).split(new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((p, i) =>
    p.toLowerCase() === kw.toLowerCase()
      ? <mark key={i} className="bg-yellow-100 text-inherit rounded px-0.5">{p}</mark>
      : p
  )
}

// 跳转目标条目：滚动 + 2 秒高亮
export function useHighlightTarget(listKey = 'highlight') {
  const [id, setId] = useState(null)
  const timer = useRef(null)
  useEffect(() => {
    const target = window.history.state?.usr?.[listKey]
    if (!target) return
    setId(target)
    setTimeout(() => {
      document.getElementById('item-' + target)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
    timer.current = setTimeout(() => setId(null), 2000)
    // 用完即清，避免刷新后残留
    window.history.replaceState({}, '')
    return () => clearTimeout(timer.current)
  }, [listKey])
  return id
}

export function EmptyState({ text, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">🌱</div>
      <p className="text-sm text-ink-soft max-w-xs">{text}</p>
      {action}
    </div>
  )
}

export function Toast({ msg }) {
  if (!msg) return null
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-ink text-white text-sm px-5 py-3 rounded-[12px] shadow-app max-w-[90vw]">
      {msg}
    </div>
  )
}

// 删除确认弹窗：统一所有模块的「删除前确认」机制，避免误删
export function ConfirmDialog({ open, title = '确认删除', message, itemName, confirmText = '删除', onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30" onMouseDown={onCancel}>
      <div
        className="card w-full max-w-sm p-6 relative z-10"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="w-9 h-9 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        </div>
        {message && <p className="text-sm text-ink-soft mb-1">{message}</p>}
        {itemName && (
          <p className="text-sm font-medium text-gray-800 bg-gray-50 border border-line rounded-[10px] px-3 py-2 mb-5 truncate">「{itemName}」</p>
        )}
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-ghost flex-1 min-h-[44px]">取消</button>
          <button
            onClick={onConfirm}
            className="flex-1 min-h-[44px] rounded-[10px] bg-danger text-white text-sm font-medium hover:bg-danger/90 active:scale-[0.98] flex items-center justify-center"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
