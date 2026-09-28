import { useState } from 'react'
import { Plus, ExternalLink, Search, Trash2 } from 'lucide-react'
import { useData } from '../lib/store'
import { Header } from '../components/Header'
import { Modal, Field, EmptyState, ConfirmDialog } from '../components/ui'

const TABS = [
  { key: 'skill', label: 'Skills' },
  { key: 'project', label: '实战项目' },
  { key: 'website', label: '实用网站' },
]

export default function Resources() {
  const { data, upsert, remove, canDelete, showToast } = useData()
  const [tab, setTab] = useState('skill')
  const [onlyUninstalled, setOnlyUninstalled] = useState(false)
  const [kw, setKw] = useState('')
  const [adding, setAdding] = useState(false)
  const [confirm, setConfirm] = useState(null) // { id, name }

  const rows = (data.resources || [])
    .filter((r) => r.category === tab)
    .filter((r) => !onlyUninstalled || tab === 'skill' && !r.installed)
    .filter((r) => !kw.trim() || (r.name + ' ' + (r.description || '')).toLowerCase().includes(kw.trim().toLowerCase()))

  const save = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const category = fd.get('category')
    const name = fd.get('name')
    upsert('resources', {
      category, name,
      url: fd.get('url'),
      description: fd.get('description'),
      installed: fd.get('installed') === 'on',
    })
    setAdding(false)
    setTab(category)
    showToast(`已收录「${name}」，好资源就该被沉淀。`)
  }

  const colCls = 'py-3.5 px-4'

  return (
    <div>
      <Header title="项目搜集" />

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex gap-1 bg-white rounded-full p-1 shadow-card">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={'px-5 py-2 rounded-full text-sm min-h-[44px] ' + (tab === t.key ? 'bg-ink text-white font-medium' : 'text-ink-soft hover:text-gray-900')}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="搜索资源..." className="w-full pl-10" />
        </div>
        {tab === 'skill' && (
          <label className="flex items-center gap-2 text-sm text-ink-soft min-h-[44px] cursor-pointer select-none">
            <input type="checkbox" checked={onlyUninstalled} onChange={(e) => setOnlyUninstalled(e.target.checked)} className="w-4 h-4 accent-primary" />
            只看未安装
          </label>
        )}
        <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5 min-h-[44px] ml-auto"><Plus size={16} /> 新增资源</button>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            text={kw ? `没有找到包含「${kw}」的资源。` : '这里还是空的，遇到好用的 Skill、项目和网站，随手收录到这里。'}
            action={<button onClick={() => setAdding(true)} className="btn-primary min-h-[44px]">+ 新增资源</button>}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] px-4 py-3 text-xs text-ink-faint border-b border-line bg-gray-50/50">
            <span className="font-medium">名称</span>
            <span className="font-medium">链接</span>
            <span className="font-medium">具体概念 / 方案</span>
            {tab === 'skill' && <span className="font-medium text-center pr-1">已安装</span>}
            {canDelete && <span className="font-medium text-right pr-1">操作</span>}
          </div>
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-center border-b border-line last:border-0 hover:bg-gray-50/60">
              <span className={colCls + ' font-medium text-gray-800 truncate'}>{r.name}</span>
              <span className={colCls + ' truncate'}>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline text-sm">
                    {r.url.replace(/^https?:\/\//, '').split('/')[0]} <ExternalLink size={12} />
                  </a>
                ) : '—'}
              </span>
              <span className={colCls + ' text-ink-soft text-sm truncate'}>{r.description || '—'}</span>
              {tab === 'skill' && (
                <span className={colCls + ' flex justify-end pr-4'}>
                  <input
                    type="checkbox"
                    checked={!!r.installed}
                    onChange={(e) => upsert('resources', { ...r, installed: e.target.checked })}
                    className="w-5 h-5 accent-success cursor-pointer"
                    aria-label="是否已安装"
                  />
                </span>
              )}
              {canDelete && (
                <span className={colCls + ' flex justify-end pr-4'}>
                  <button onClick={() => setConfirm({ id: r.id, name: r.name })} className="p-2 text-ink-faint hover:text-danger min-h-[44px] min-w-[44px] inline-flex items-center justify-center" aria-label="删除"><Trash2 size={15} /></button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {adding && (
        <Modal title="新增资源" onClose={() => setAdding(false)}>
          <form onSubmit={save}>
            <Field label="分类">
              <select name="category" defaultValue={tab} className="w-full">
                <option value="skill">Skill</option>
                <option value="project">实战项目</option>
                <option value="website">实用网站</option>
              </select>
            </Field>
            <Field label="名称"><input name="name" required className="w-full" autoFocus /></Field>
            <Field label="链接"><input name="url" type="url" placeholder="https://..." className="w-full" /></Field>
            <Field label="具体概念 / 方案"><textarea name="description" rows={3} className="w-full" /></Field>
            <label className="flex items-center gap-2 text-sm text-ink-soft mb-5 min-h-[44px] cursor-pointer">
              <input type="checkbox" name="installed" className="w-4 h-4 accent-success" /> 是否已安装
            </label>
            <button type="submit" className="btn-primary w-full min-h-[44px]">保存</button>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirm}
        title="删除资源"
        message="删除后无法恢复，确定要删除这条资源吗？它也会被同时从关联项目的「所需 Skills」中移除。"
        itemName={confirm?.name}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { remove('resources', confirm.id); showToast('资源已删除。'); setConfirm(null) }}
      />
    </div>
  )
}
