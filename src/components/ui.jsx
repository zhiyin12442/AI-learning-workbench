import { useEffect, useRef, useState } from 'react'
import { X, Pencil, Trash2, ExternalLink } from 'lucide-react'

export function Modal({ title, onClose, children, wide = false, maxW }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onMouseDown={onClose}>
      <div
        className={'card w-full shadow-card-shadow ' + (maxW || (wide ? 'max-w-2xl' : 'max-w-lg')) + ' p-6 max-h-[85vh] overflow-y-auto'}
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

/**
 * 通用「记录详情卡片」弹窗：点击某条记录后弹出，展示完整详细内容。
 * 支持关闭（X 按钮）/ 点击遮罩外部 / Esc 返回列表（继承自 Modal）。
 * fields 支持多种类型：
 *   - 默认/type:'text'：普通文本（正文），value 可多行
 *   - type:'link'：可点击外链（带 ExternalLink 图标）
 *   - type:'tags'：标签数组，渲染为 #xxx 圆角胶囊
 *   - type:'installed'：Skill 安装状态开关（value 为布尔，onChange 回调写回）
 *   - type:'action'：底部主操作按钮（value 为按钮文案，onClick 回调）
 */
export function RecordDetailModal({ open, title, onClose, fields = [], maxW = 'max-w-[480px]' }) {
  if (!open) return null
  return (
    <Modal title={title} onClose={onClose} maxW={maxW}>
      <div className="space-y-4">
        {fields.map((f, i) => (
          <div key={i}>
            {f.label && <p className="text-xs text-ink-faint mb-1">{f.label}</p>}
            {f.type === 'link' ? (
              f.value ? (
                <a href={f.value} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1 hover:underline break-all">
                  {f.value} <ExternalLink size={13} />
                </a>
              ) : <p className="text-sm text-gray-700">—</p>
            ) : f.type === 'tags' ? (
              <div className="flex flex-wrap gap-1.5">
                {(f.value || []).map((t, k) => (
                  <span key={k} className="rounded-full px-2.5 py-0.5 text-xs bg-gray-100 text-ink-soft">#{t}</span>
                ))}
              </div>
            ) : f.type === 'installed' ? (
              <label className="flex items-center gap-2 text-sm text-ink-soft min-h-[40px] cursor-pointer">
                <input type="checkbox" checked={!!f.value} onChange={(e) => f.onChange?.(e.target.checked)} className="w-4 h-4 accent-success" />
                {f.value ? '已安装 ✅' : '未安装'}
              </label>
            ) : f.type === 'action' ? (
              <button onClick={f.onClick} className="btn-primary w-full min-h-[44px]">{f.value}</button>
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{f.value || '—'}</p>
            )}
          </div>
        ))}
      </div>
    </Modal>
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
  const label = { 'High': '高', 'Medium': '中', 'Low': '低' }[level] || level
  return (
    <span className={'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ' + (map[level] || map['Low'])}>
      <span className={'w-1 h-1 rounded-full ' + (level === 'High' ? 'bg-danger' : level === 'Medium' ? 'bg-warning' : 'bg-gray-400')} />
      {label}
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

/**
 * 滑动操作行（交付要求 7）：从最右侧向左滑动呼出操作按钮。
 * - 露出两个图标按钮：编辑（铅笔，主色 #286ED3）+ 删除（垃圾桶，危险色 #EF4444）
 * - 按钮 32×32、圆角 8px、白色图标
 * - 动画 200ms，transform: translateX 实现；松手后保持在打开状态，点击其他区域自动收回
 * - 项目灵感板块传 disableEdit 仅显示删除图标
 */
export function SwipeRow({ children, onEdit, onDelete, onTap, editLabel = '编辑', deleteLabel = '删除', disableEdit = false }) {
  const hasEdit = !disableEdit && typeof onEdit === 'function'
  const hasDelete = typeof onDelete === 'function'
  const count = (hasEdit ? 1 : 0) + (hasDelete ? 1 : 0)
  const REVEAL_W = count * 32 + (count - 1) * 8 + 12 // 按钮 32 + 间隙 8 + 右内边距 12
  const [open, setOpen] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const startT = useRef(0)
  const endX = useRef(0)
  const endY = useRef(0)
  const moved = useRef(false)
  const suppress = useRef(false)
  const stopTap = useRef(false)
  const rootRef = useRef(null)

  // 点击空白处自动收起
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
    }
  }, [open])

  const onDown = (e) => {
    setDragging(true)
    moved.current = false
    suppress.current = false
    // 若按下起点落在交互控件（按钮/链接/输入等）内，则该手势不视为「轻点打开详情」
    const tgt = e.target
    stopTap.current = !!(tgt && tgt.closest && tgt.closest('button, a, input, select, textarea, [data-stop-tap]'))
    startX.current = e.clientX
    startY.current = e.clientY
    startT.current = Date.now()
    endX.current = e.clientX
    endY.current = e.clientY
    // 仅当按下起点在行本体（非交互控件）时才捕获指针，确保子按钮的原生 click 能正常派发（如状态菜单、展开按钮）
    if (!stopTap.current) {
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch (_) {}
    }
  }
  const onMove = (e) => {
    if (!dragging) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    endX.current = e.clientX
    endY.current = e.clientY
    if (Math.hypot(dx, dy) > 6) moved.current = true
    let x = open ? dx - REVEAL_W : Math.min(0, dx)
    x = Math.max(-REVEAL_W, Math.min(0, x))
    setDragX(x)
  }
  const onUp = () => {
    if (!dragging) return
    setDragging(false)
    const x = dragX
    // 只有「真的滑开操作按钮」才视为一次滑动手势；轻点/抖动不应抑制行内点击
    const willOpen = x < -REVEAL_W / 2
    if (willOpen) { setOpen(true); setDragX(-REVEAL_W) }
    else { setOpen(false); setDragX(0) }
    if (moved.current && willOpen) { suppress.current = true; setTimeout(() => { suppress.current = false }, 0) }
    // 轻点判定（鼠标/触屏都可靠）：
    // 1) 没有真正滑开操作区（willOpen=false）；2) 整体位移很小（<12px，区别于竖向滚动）；
    // 3) 当前未处于「已滑开」状态。命中即触发 onTap（如打开详情）。
    // 关键：SwipeRow 调用 setPointerCapture 会让子元素的原生 click 事件经常不被派发，
    // 因此这里直接判轻点并回调，确保「点击行」可靠生效，不受触屏抖动影响。
    const movedDist = Math.hypot(endX.current - startX.current, endY.current - startY.current)
    if (!willOpen && open === false && !stopTap.current && movedDist < 12 && typeof onTap === 'function') {
      onTap()
    }
  }
  // 抑制拖动后的误点击（避免滑动后触发行内链接/导航）
  const onClickCapture = (e) => { if (suppress.current) { e.preventDefault(); e.stopPropagation() } }

  const translate = open ? -REVEAL_W : dragX

  return (
    <div ref={rootRef} className="relative">
      {count > 0 && (
        <div className="absolute right-0 inset-y-0 z-0 flex items-center pr-3 gap-2">
          {hasEdit && (
            <button
              type="button"
              onClick={() => { setOpen(false); onEdit() }}
              aria-label={editLabel}
              className="w-8 h-8 rounded-[8px] bg-primary text-white flex items-center justify-center active:scale-95 shrink-0"
            ><Pencil size={16} /></button>
          )}
          {hasDelete && (
            <button
              type="button"
              onClick={() => { setOpen(false); onDelete() }}
              aria-label={deleteLabel}
              className="w-8 h-8 rounded-[8px] bg-danger text-white flex items-center justify-center active:scale-95 shrink-0"
            ><Trash2 size={16} /></button>
          )}
        </div>
      )}
      <div
        className={'relative z-10 bg-white ' + (dragging ? '' : 'transition-transform duration-200 ease-out')}
        style={{ transform: `translateX(${translate}px)`, touchAction: 'pan-y' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  )
}
