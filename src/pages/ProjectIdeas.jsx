import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Pin, PinOff, Archive, ArchiveRestore, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { useData } from '../lib/store'
import { Header } from '../components/Header'
import { Modal, Field, EmptyState, ConfirmDialog } from '../components/ui'

const STATUS_STYLE = {
  '未开始': 'bg-gray-100 text-gray-500',
  '进行中': 'bg-warning/10 text-warning',
  '已完成': 'bg-success/10 text-success',
}

export default function ProjectIdeas() {
  const { data, upsert, remove, canDelete, showToast } = useData()
  const nav = useNavigate()
  const [filter, setFilter] = useState('全部')
  const [showArchived, setShowArchived] = useState(false)
  const [adding, setAdding] = useState(false)
  const [menuId, setMenuId] = useState(null)
  const [confirm, setConfirm] = useState(null) // { id, name }

  const all = data.project_ideas || []
  const list = all
    .filter((p) => p.archived === showArchived)
    .filter((p) => filter === '全部' || p.status === filter)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.updated_at < b.updated_at ? 1 : -1))

  const setStatus = (p, status) => {
    upsert('project_ideas', { ...p, status })
    if (status === '已完成') showToast(`🎉 项目「${p.name}」已完成，要不要写一条复盘沉淀经验？`, 4200)
  }

  const save = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const name = fd.get('name')
    upsert('project_ideas', { name, status: '未开始', goal: fd.get('goal'), stack: (fd.get('stack') || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean) })
    setAdding(false)
    showToast(`项目「${name}」已创建，万事开头难，你已经开始啦。`)
  }

  return (
    <div>
      <Header title="项目灵感" />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {['全部', '未开始', '进行中', '已完成'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={'px-4 py-2 rounded-full text-sm min-h-[44px] ' + (filter === s ? 'bg-ink text-white font-medium' : 'bg-white shadow-card text-ink-soft hover:text-gray-900')}
          >{s}</button>
        ))}
        <button onClick={() => setShowArchived(!showArchived)} className="btn-ghost min-h-[44px]">
          {showArchived ? <span className="flex items-center gap-1"><ArchiveRestore size={14} /> 查看活跃</span> : <span className="flex items-center gap-1"><Archive size={14} /> 归档箱</span>}
        </button>
        <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5 min-h-[44px] ml-auto"><Plus size={16} /> 新建项目</button>
      </div>

      {list.length === 0 ? (
        <div className="card">
          <EmptyState text={showArchived ? '归档箱是空的，先专注活跃的项目吧。' : '这里还是空的，记录下一个让你心动的项目想法。'} action={!showArchived && <button onClick={() => setAdding(true)} className="btn-primary min-h-[44px]">+ 新建项目</button>} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          {list.map((p) => {
            const done = (p.steps || []).filter((s) => s.done).length
            return (
              <div key={p.id} className="flex items-center gap-3 px-5 py-4 border-b border-line last:border-0 hover:bg-gray-50/60 min-h-[64px]">
                {p.pinned && <Pin size={14} className="text-warning shrink-0" />}
                <ChevronRight size={15} className="text-ink-faint shrink-0 hidden md:block" />
                <Link to={`/projects/${p.id}`} className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate hover:text-primary">{p.name}</p>
                  <p className="text-xs text-ink-faint truncate mt-0.5">{p.goal || '还没有写一句话目标'}</p>
                </Link>
                <span className="text-xs text-ink-faint hidden md:block whitespace-nowrap">{done}/{(p.steps || []).length} 步</span>
                <div className="relative">
                  <button
                    onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                    className={'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium min-h-[44px] ' + (STATUS_STYLE[p.status] || STATUS_STYLE['未开始'])}
                  >
                    {p.status || '未开始'} <ChevronDown size={13} />
                  </button>
                  {menuId === p.id && (
                    <div className="absolute right-0 top-full mt-1 z-20 card p-1 w-36 shadow-app">
                      {Object.keys(STATUS_STYLE).map((s) => (
                        <button key={s} onClick={() => { setStatus(p, s); setMenuId(null) }} className="w-full text-left px-3 py-2 text-sm rounded-[8px] hover:bg-gray-50 min-h-[44px]">{s}</button>
                      ))}
                      <div className="border-t border-line my-1" />
                      <button onClick={() => { upsert('project_ideas', { ...p, pinned: !p.pinned }); setMenuId(null) }} className="w-full text-left px-3 py-2 text-sm rounded-[8px] hover:bg-gray-50 flex items-center gap-2 min-h-[44px]">
                        {p.pinned ? <PinOff size={14} /> : <Pin size={14} />} {p.pinned ? '取消置顶' : '置顶'}
                      </button>
                      <button onClick={() => { upsert('project_ideas', { ...p, archived: !p.archived }); setMenuId(null); showToast(p.archived ? '已恢复到活跃列表。' : '项目已归档。') }} className="w-full text-left px-3 py-2 text-sm rounded-[8px] hover:bg-gray-50 flex items-center gap-2 min-h-[44px]">
                        <Archive size={14} /> {p.archived ? '取消归档' : '归档'}
                      </button>
                      {canDelete && (
                        <button onClick={() => { setMenuId(null); setConfirm({ id: p.id, name: p.name }) }} className="w-full text-left px-3 py-2 text-sm rounded-[8px] hover:bg-danger/5 text-danger flex items-center gap-2 min-h-[44px]">
                          <Trash2 size={14} /> 删除项目
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {adding && (
        <Modal title="新建项目灵感" onClose={() => setAdding(false)}>
          <form onSubmit={save}>
            <Field label="项目名称"><input name="name" required className="w-full" autoFocus /></Field>
            <Field label="一句话目标"><input name="goal" placeholder="这个项目要解决什么问题？" className="w-full" /></Field>
            <Field label="技术栈（逗号分隔）"><input name="stack" placeholder="React, Supabase" className="w-full" /></Field>
            <button type="submit" className="btn-primary w-full min-h-[44px]">创建</button>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirm}
        title="删除项目灵感"
        message="删除后无法恢复，项目下的步骤、参考资料等都会一并清除。确定要删除吗？"
        itemName={confirm?.name}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { remove('project_ideas', confirm.id); showToast('项目已删除。'); setConfirm(null) }}
      />
    </div>
  )
}
