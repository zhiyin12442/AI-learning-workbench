import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Plus, Pin, PinOff, Archive, ArchiveRestore, ChevronDown, ChevronRight } from 'lucide-react'
import { useData } from '../lib/store'
import { Header } from '../components/Header'
import { Modal, Field, EmptyState, ConfirmDialog, SwipeRow, RecordDetailModal } from '../components/ui'

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
  const [detail, setDetail] = useState(null) // 点击某条项目弹出的详情卡片
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
            className={'px-4 py-2 rounded-full text-sm min-h-[44px] ' + (filter === s ? 'bg-ink text-white font-medium' : 'bg-white shadow-card-shadow text-ink-soft hover:text-gray-900')}
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
        <div className="card">
          {list.map((p) => {
            const done = (p.steps || []).filter((s) => s.done).length
            return (
              <SwipeRow
                key={p.id}
                disableEdit
                onDelete={canDelete ? () => setConfirm({ id: p.id, name: p.name }) : undefined}
                onTap={() => setDetail(p)}
                deleteLabel="删除"
              >
                <div className="flex items-center gap-3 px-5 py-4 border-b border-line last:border-0 hover:bg-gray-50/60 cursor-pointer min-h-[64px]">
                  {p.pinned && <Pin size={14} className="text-warning shrink-0" />}
                  <ChevronRight size={15} className="text-ink-faint shrink-0 hidden md:block" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate hover:text-primary">{p.name}</p>
                    <p className="text-xs text-ink-faint truncate mt-0.5">{p.goal || '还没有写一句话目标'}</p>
                  </div>
                  <span className="text-xs text-ink-faint hidden md:block whitespace-nowrap">{done}/{(p.steps || []).length} 步</span>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                      className={'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium min-h-[44px] ' + (STATUS_STYLE[p.status] || STATUS_STYLE['未开始'])}
                    >
                      {p.status || '未开始'} <ChevronDown size={13} />
                    </button>
                    {menuId === p.id && (
                      <div className="absolute right-0 top-full mt-4 z-50 w-full card p-1 shadow-card-shadow">
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
                      </div>
                    )}
                  </div>
                </div>
              </SwipeRow>
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

      {/* 点击项目条目弹出的完整详情卡片（保留完整详情页入口） */}
      <RecordDetailModal
        open={!!detail}
        title={detail?.name || '项目详情'}
        onClose={() => setDetail(null)}
        fields={detail ? (() => {
          const steps = detail.steps || []
          const done = steps.filter((s) => s.done).length
          return [
            { label: '一句话目标', value: detail.goal },
            { label: '当前状态', value: detail.status || '未开始' },
            { label: '技术栈', type: 'tags', value: detail.stack },
            { label: '进度', value: `${done}/${steps.length} 步完成` },
            { label: '更新时间', value: detail.updated_at ? format(new Date(detail.updated_at), 'yyyy年M月d日 HH:mm') : '—' },
            { label: '查看', type: 'action', value: '打开完整详情页', onClick: () => { setDetail(null); nav(`/projects/${detail.id}`) } },
          ]
        })() : []}
      />
    </div>
  )
}
