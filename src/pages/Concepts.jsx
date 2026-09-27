import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Link as LinkIcon, Search } from 'lucide-react'
import { useData } from '../lib/store'
import { Header } from '../components/Header'
import { Modal, Field, Highlight, EmptyState, useHighlightTarget } from '../components/ui'

const ACCENTS = ['#286ED3', '#4D3EB4', '#84CC16', '#F59E0B', '#EF4444', '#38BDF8']

export default function Concepts() {
  const { data, upsert, remove, showToast } = useData()
  const concepts = data.concepts || []
  const [kw, setKw] = useState('')
  const [openGroups, setOpenGroups] = useState(null) // null=全部展开
  const [collapsed, setCollapsed] = useState({})
  const [expanded, setExpanded] = useState({})
  const [editing, setEditing] = useState(null) // null | {} | concept
  const [renaming, setRenaming] = useState(null)
  const [activeGroup, setActiveGroup] = useState('全部')
  const hlId = useHighlightTarget()

  const groups = useMemo(() => {
    const map = {}
    for (const c of concepts) {
      const g = c.group_name || '未分组'
      ;(map[g] = map[g] || []).push(c)
    }
    return map
  }, [concepts])

  const match = (c) => {
    if (!kw.trim()) return true
    const t = (c.name + ' ' + (c.description || '') + ' ' + (c.tags || []).join(' ')).toLowerCase()
    return t.includes(kw.trim().toLowerCase())
  }

  const visibleGroups = Object.entries(groups).filter(([g]) => activeGroup === '全部' || g === activeGroup)
  const totalMatched = concepts.filter(match).length

  const save = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    upsert('concepts', {
      id: editing.id,
      group_name: fd.get('group_name') || '未分组',
      name: fd.get('name'),
      description: fd.get('description'),
      tags: (fd.get('tags') || '').split(/[,，\s]+/).filter(Boolean),
    })
    setEditing(null)
    showToast(editing.id ? '概念已更新 ✅' : `已记录《${fd.get('name')}》，知识又多了一块拼图。`)
  }

  return (
    <div>
      <Header title="概念学习" />
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* 左侧分组树 */}
        <div className="card p-4 h-fit">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">分组</p>
            <button
              onClick={() => {
                const name = prompt('新分组名称：')
                if (name) showToast(`分组「${name}」已创建，快去添加概念吧。`)
              }}
              className="p-1.5 hover:bg-gray-100 rounded-[8px] text-gray-400 hover:text-primary"
              aria-label="新增分组"
            ><Plus size={15} /></button>
          </div>
          <button
            onClick={() => setActiveGroup('全部')}
            className={'w-full text-left px-3 py-2 rounded-[10px] text-sm mb-1 min-h-[44px] ' + (activeGroup === '全部' ? 'bg-white shadow-nav-active font-semibold text-gray-900' : 'text-gray-600 hover:bg-white/60')}
          >
            全部 <span className="float-right text-ink-faint">{concepts.length}</span>
          </button>
          {visibleGroups.map(([g, items]) => {
            const isOpen = collapsed[g] !== undefined ? !collapsed[g] : true
            return (
              <div key={g} className="mb-1">
                <div className={'group flex items-center rounded-[10px] ' + (activeGroup === g ? 'bg-white shadow-nav-active' : '')}>
                  <button
                    className="flex items-center gap-1.5 px-2 py-2.5 text-sm min-h-[44px] flex-1 text-gray-600 hover:text-gray-900"
                    onClick={() => setCollapsed({ ...collapsed, [g]: isOpen })}
                  >
                    {isOpen ? <ChevronDown size={14} className="text-ink-faint" /> : <ChevronRight size={14} className="text-ink-faint" />}
                    <span className={'truncate ' + (activeGroup === g ? 'font-semibold text-gray-900' : '')}>{g}</span>
                    <span className="text-xs text-ink-faint ml-auto mr-1">{items.length}</span>
                  </button>
                  <div className="hidden group-hover:flex">
                    <button onClick={() => setRenaming({ group: g })} className="p-1 text-ink-faint hover:text-primary" aria-label="重命名分组"><Pencil size={13} /></button>
                    <button
                      onClick={() => {
                        if (confirm(`删除分组「${g}」？组内概念将归入「未分组」。`)) {
                          concepts.filter((c) => (c.group_name || '未分组') === g).forEach((c) => upsert('concepts', { ...c, group_name: '未分组' }))
                          showToast(`分组「${g}」已删除。`)
                        }
                      }}
                      className="p-1 text-ink-faint hover:text-danger" aria-label="删除分组"
                    ><Trash2 size={13} /></button>
                  </div>
                </div>
                {isOpen && (
                  <ul className="ml-4 border-l border-line pl-2 my-1">
                    {items.filter(match).slice(0, 5).map((c) => (
                      <li key={c.id}>
                        <button onClick={() => document.getElementById('item-' + c.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="w-full text-left px-2 py-1.5 text-xs text-ink-soft hover:text-primary truncate min-h-[36px]">
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>

        {/* 右侧表格 */}
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="搜索概念名称、释义、标签..." className="w-full pl-10" />
            </div>
            <button onClick={() => setEditing({})} className="btn-primary flex items-center gap-1.5 min-h-[44px]"><Plus size={16} /> 新增概念</button>
          </div>

          {totalMatched === 0 ? (
            <div className="card">
              <EmptyState
                text={kw ? `没有找到包含「${kw}」的概念。` : '这里还是空的，点击右上角「+ 新增概念」记录你的第一个知识点。'}
                action={!kw && <button onClick={() => setEditing({})} className="btn-primary min-h-[44px]">+ 新增概念</button>}
              />
            </div>
          ) : (
            <div className="space-y-5">
              {visibleGroups.map(([g, items]) => (
                <div key={g} className="card overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-line flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: ACCENTS[g.length % ACCENTS.length] }} />
                    <p className="text-sm font-semibold text-gray-800">{g}</p>
                    <span className="text-xs text-ink-faint">{items.filter(match).length} 条</span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {items.filter(match).map((c) => {
                        const open = expanded[c.id]
                        return (
                          <tr key={c.id} id={'item-' + c.id} className={'border-b border-line last:border-0 transition-colors duration-500 ' + (hlId === c.id ? 'bg-yellow-100' : '')}>
                            <td className="py-3.5 pl-5 pr-2 font-medium text-gray-800 w-[220px] align-top">
                              <Highlight text={c.name} kw={kw} />
                            </td>
                            <td className="py-3.5 pr-5 text-ink-soft align-top">
                              <p className={open ? '' : 'line-clamp-1'}>
                                <Highlight text={c.description || '（暂无释义）'} kw={kw} />
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {(c.tags || []).map((t) => <Highlight key={t} text={'#' + t} kw={kw} />).map((el, i) => (
                                  <span key={i} className="rounded-full px-2.5 py-0.5 text-xs bg-gray-100 text-ink-soft">{el}</span>
                                ))}
                                {c.description && c.description.length > 40 && (
                                  <button onClick={() => setExpanded({ ...expanded, [c.id]: !open })} className="text-xs text-primary ml-1 min-h-[36px] px-2">
                                    {open ? '收起' : '展开全文'}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 pr-4 align-top">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => setEditing(c)} className="p-2 text-ink-faint hover:text-primary min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="编辑"><Pencil size={15} /></button>
                                <button onClick={() => { remove('concepts', c.id); showToast('概念已删除。') }} className="p-2 text-ink-faint hover:text-danger min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="删除"><Trash2 size={15} /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <Modal title={editing.id ? '编辑概念' : '新增概念'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <Field label="所属分组">
              <input name="group_name" defaultValue={editing.group_name || activeGroup === '全部' ? '' : activeGroup} list="group-list" placeholder="如：前端知识" className="w-full" />
              <datalist id="group-list">{Object.keys(groups).map((g) => <option key={g} value={g} />)}</datalist>
            </Field>
            <Field label="概念名称"><input name="name" required defaultValue={editing.name || ''} className="w-full" /></Field>
            <Field label="概念释义"><textarea name="description" rows={4} defaultValue={editing.description || ''} className="w-full" /></Field>
            <Field label="标签（逗号分隔）"><input name="tags" defaultValue={(editing.tags || []).join(', ')} className="w-full" /></Field>
            <button type="submit" className="btn-primary w-full min-h-[44px]">保存</button>
          </form>
        </Modal>
      )}

      {renaming && (
        <Modal title="重命名分组" onClose={() => setRenaming(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const name = new FormData(e.target).get('name')
              concepts.filter((c) => (c.group_name || '未分组') === renaming.group).forEach((c) => upsert('concepts', { ...c, group_name: name }))
              setRenaming(null)
              showToast('分组已重命名。')
            }}
          >
            <Field label="分组名称"><input name="name" required defaultValue={renaming.group} className="w-full" autoFocus /></Field>
            <button type="submit" className="btn-primary w-full min-h-[44px]">保存</button>
          </form>
        </Modal>
      )}
    </div>
  )
}
