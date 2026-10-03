import { useMemo, useState } from 'react'
import { Plus, Check, Circle, Search } from 'lucide-react'
import { useData } from '../lib/store'
import { Header } from '../components/Header'
import { Modal, Field, EmptyState, ConfirmDialog, SwipeRow, RecordDetailModal } from '../components/ui'

const PRIORITIES = ['高', '中', '低']
const PRIORITY_STYLE = {
  '高': 'bg-danger/10 text-danger',
  '中': 'bg-warning/10 text-warning',
  '低': 'bg-gray-100 text-gray-500',
}

export default function Todos() {
  const { data, upsert, remove, canDelete, showToast } = useData()
  const [filter, setFilter] = useState('未完成') // 未完成 | 已完成 | 全部
  const [kw, setKw] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const todos = useMemo(
    () => (data.todos || [])
      .filter((t) => !t.deleted)
      .filter((t) => filter === '全部' || (filter === '未完成' ? !t.done : t.done))
      .filter((t) => !kw.trim() || (t.title + ' ' + (t.note || '')).toLowerCase().includes(kw.trim().toLowerCase()))
      .sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1) || (a.due_date || '').localeCompare(b.due_date || '')),
    [data.todos, filter, kw]
  )

  const toggle = (t) => {
    upsert('todos', { ...t, done: !t.done })
    showToast(t.done ? '已标记为未完成。' : '已完成，干得漂亮 ✅')
  }

  const save = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const title = fd.get('title')
    upsert('todos', {
      title,
      note: fd.get('note'),
      due_date: fd.get('due_date') || null,
      priority: fd.get('priority') || '中',
      done: false,
    })
    setAdding(false)
    showToast(`待办「${title}」已添加。`)
  }

  const update = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    upsert('todos', {
      id: editing.id,
      title: fd.get('title'),
      note: fd.get('note'),
      due_date: fd.get('due_date') || null,
      priority: fd.get('priority') || '中',
    })
    setEditing(null)
    showToast('待办已更新。')
  }

  return (
    <div>
      <Header title="待办事项" />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {['未完成', '已完成', '全部'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={'px-4 py-2 rounded-full text-sm min-h-[44px] ' + (filter === f ? 'bg-ink text-white font-medium' : 'bg-white shadow-card-shadow text-ink-soft hover:text-gray-900')}
          >{f}</button>
        ))}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="搜索待办..." className="w-full pl-10" />
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5 min-h-[44px] ml-auto"><Plus size={16} /> 新建待办</button>
      </div>

      {todos.length === 0 ? (
        <div className="card">
          <EmptyState text={kw ? `没有找到包含「${kw}」的待办。` : '这里还是空的，记下一个待办，搞定就划掉。'} action={!kw && <button onClick={() => setAdding(true)} className="btn-primary min-h-[44px]">+ 新建待办</button>} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          {todos.map((t) => (
            <SwipeRow
              key={t.id}
              onEdit={() => setEditing(t)}
              onDelete={canDelete ? () => setConfirm({ id: t.id, name: t.title }) : undefined}
              onTap={() => setDetail(t)}
              editLabel="编辑"
              deleteLabel="删除"
            >
              <div className="flex items-start gap-3 py-3.5 px-5 border-b border-line last:border-0 cursor-pointer">
                <button
                  onClick={(e) => { e.stopPropagation(); toggle(t) }}
                  className={'mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 min-h-[36px] min-w-[36px] ' + (t.done ? 'bg-success border-success text-white' : 'border-gray-300 text-transparent hover:border-primary')}
                  aria-label={t.done ? '标记为未完成' : '标记为完成'}
                >
                  <Check size={14} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={'font-medium ' + (t.done ? 'line-through text-ink-faint' : 'text-gray-800')}>{t.title}</span>
                    {t.priority && <span className={'rounded-full px-2 py-0.5 text-xs ' + (PRIORITY_STYLE[t.priority] || PRIORITY_STYLE['中'])}>{t.priority}</span>}
                  </div>
                  {t.note && <p className="text-sm text-ink-soft mt-0.5 whitespace-pre-wrap break-words">{t.note}</p>}
                  {t.due_date && <p className="text-xs text-ink-faint mt-1">截止：{t.due_date}</p>}
                </div>
              </div>
            </SwipeRow>
          ))}
        </div>
      )}

      {adding && (
        <Modal title="新建待办" onClose={() => setAdding(false)}>
          <form onSubmit={save}>
            <Field label="待办标题"><input name="title" required className="w-full" autoFocus /></Field>
            <Field label="备注（可选）"><textarea name="note" rows={3} className="w-full" /></Field>
            <Field label="截止日期（可选）"><input name="due_date" type="date" className="w-full" /></Field>
            <Field label="优先级">
              <select name="priority" defaultValue="中" className="w-full">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <button type="submit" className="btn-primary w-full min-h-[44px]">添加</button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="编辑待办" onClose={() => setEditing(null)}>
          <form onSubmit={update}>
            <Field label="待办标题"><input name="title" required defaultValue={editing.title} className="w-full" /></Field>
            <Field label="备注（可选）"><textarea name="note" rows={3} defaultValue={editing.note || ''} className="w-full" /></Field>
            <Field label="截止日期（可选）"><input name="due_date" type="date" defaultValue={editing.due_date || ''} className="w-full" /></Field>
            <Field label="优先级">
              <select name="priority" defaultValue={editing.priority || '中'} className="w-full">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <button type="submit" className="btn-primary w-full min-h-[44px]">保存</button>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirm}
        title="删除待办"
        message="删除后无法恢复，确定要删除这条待办吗？"
        itemName={confirm?.name}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { remove('todos', confirm.id); showToast('待办已删除。'); setConfirm(null) }}
      />

      <RecordDetailModal
        open={!!detail}
        title={detail?.title || '待办详情'}
        onClose={() => setDetail(null)}
        fields={detail ? [
          { label: '标题', value: detail.title },
          { label: '备注', value: detail.note },
          { label: '截止日期', value: detail.due_date || '—' },
          { label: '优先级', value: detail.priority },
          { label: '状态', value: detail.done ? '已完成' : '未完成' },
        ] : []}
      />
    </div>
  )
}
