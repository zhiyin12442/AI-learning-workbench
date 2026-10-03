import { useState } from 'react'
import { Plus, ExternalLink, Search } from 'lucide-react'
import { useData } from '../lib/store'
import { Header } from '../components/Header'
import { Modal, Field, EmptyState, ConfirmDialog, SwipeRow, RecordDetailModal } from '../components/ui'

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
  const [detail, setDetail] = useState(null) // 选中的资源
  const [confirm, setConfirm] = useState(null) // { id, name }

  const isWeb = tab === 'website'
  const isSkill = tab === 'skill'

  const rows = (data.resources || [])
    .filter((r) => !r.deleted)
    .filter((r) => r.category === tab)
    .filter((r) => !onlyUninstalled || (tab === 'skill' && !r.installed))
    .filter((r) => !kw.trim() || (r.name + ' ' + (r.description || '') + ' ' + (r.url || '')).toLowerCase().includes(kw.trim().toLowerCase()))

  const save = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const category = fd.get('category')
    const name = fd.get('name')
    upsert('resources', {
      category, name,
      url: fd.get('url'),
      description: fd.get('description'),
      field: fd.get('field'),
      installed: fd.get('installed') === 'on',
    })
    setAdding(false)
    setTab(category)
    showToast(`已收录「${name}」，好资源就该被沉淀。`)
  }

  // 详情弹窗字段（按分类显示中文标签）
  const detailFields = (r) => {
    if (!r) return []
    if (r.category === 'website') {
      return [
        { label: '链接', value: r.url, link: true },
        { label: '用途', value: r.name },
        { label: '具体概念 / 方案', value: r.description },
      ]
    }
    const f = [
      { label: '名称', value: r.name },
      { label: '链接', value: r.url, link: true },
      { label: '具体概念 / 方案', value: r.description },
    ]
    if (r.category === 'skill') {
      f.push({ label: '领域', value: r.field })
      f.push({ label: '已安装', installed: true, value: r.installed, onChange: (v) => { setDetail({ ...r, installed: v }); upsert('resources', { ...r, installed: v }) } })
    }
    return f
  }

  const gridCols = isWeb
    ? 'grid-cols-[1.4fr_1fr_1.6fr]'
    : isSkill ? 'grid-cols-[1.2fr_1.4fr_1.6fr_auto]' : 'grid-cols-[1.2fr_1.4fr_1.6fr]'

  return (
    <div>
      <Header title="项目搜集" />

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex gap-1 bg-white rounded-full p-1 shadow-card-shadow">
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
        {isSkill && (
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
          {/* 表头 */}
          <div className={'grid ' + gridCols + ' px-4 py-3 text-xs text-ink-faint border-b border-line bg-gray-50/50 min-w-[560px]'}>
            {isWeb ? (
              <><span className="font-medium">链接</span><span className="font-medium">用途</span><span className="font-medium">具体概念 / 方案</span></>
            ) : isSkill ? (
              <><span className="font-medium">名称</span><span className="font-medium">链接</span><span className="font-medium">具体概念 / 方案</span><span className="font-medium text-center">已安装</span></>
            ) : (
              <><span className="font-medium">名称</span><span className="font-medium">链接</span><span className="font-medium">具体概念 / 方案</span></>
            )}
          </div>
          {rows.map((r) => (
            <SwipeRow
              key={r.id}
              disableEdit
              onDelete={canDelete ? () => setConfirm({ id: r.id, name: r.name || r.url }) : undefined}
              onTap={() => setDetail(r)}
              deleteLabel="删除"
            >
              <div
                className={'grid ' + gridCols + ' items-center border-b border-line last:border-0 hover:bg-gray-50/60 cursor-pointer min-w-[560px]'}
              >
                {isWeb ? (
                  <>
                    <span className="py-3.5 px-4 truncate text-sm text-primary">{r.url ? r.url.replace(/^https?:\/\//, '').split('/')[0] : '—'}</span>
                    <span className="py-3.5 px-4 font-medium text-gray-800 truncate">{r.name}</span>
                    <span className="py-3.5 px-4 text-ink-soft text-sm truncate">{r.description || '—'}</span>
                  </>
                ) : isSkill ? (
                  <>
                    <span className="py-3.5 px-4 font-medium text-gray-800 truncate">{r.name}</span>
                    <span className="py-3.5 px-4 truncate text-sm text-primary">{r.url ? r.url.replace(/^https?:\/\//, '').split('/')[0] : '—'}</span>
                    <span className="py-3.5 px-4 text-ink-soft text-sm truncate">{r.description || '—'}</span>
                    <span className="py-3.5 px-4 flex justify-center">
                      <span className={'rounded-full px-2.5 py-1 text-xs font-medium ' + (r.installed ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500')}>{r.installed ? '已安装' : '未安装'}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="py-3.5 px-4 font-medium text-gray-800 truncate">{r.name}</span>
                    <span className="py-3.5 px-4 truncate text-sm text-primary">{r.url ? r.url.replace(/^https?:\/\//, '').split('/')[0] : '—'}</span>
                    <span className="py-3.5 px-4 text-ink-soft text-sm truncate">{r.description || '—'}</span>
                  </>
                )}
              </div>
            </SwipeRow>
          ))}
        </div>
      )}

      {/* 新增资源 */}
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
            {/* 实用网站：链接 / 用途 / 具体概念方案 */}
            {tab === 'website' ? (
              <>
                <Field label="链接"><input name="url" type="url" placeholder="https://..." className="w-full" /></Field>
                <Field label="用途"><input name="name" required className="w-full" autoFocus /></Field>
                <Field label="具体概念 / 方案"><textarea name="description" rows={3} className="w-full" /></Field>
              </>
            ) : (
              <>
                <Field label="名称"><input name="name" required className="w-full" autoFocus /></Field>
                <Field label="链接"><input name="url" type="url" placeholder="https://..." className="w-full" /></Field>
                <Field label="具体概念 / 方案"><textarea name="description" rows={3} className="w-full" /></Field>
              </>
            )}
            {tab === 'skill' && (
              <>
                <Field label="领域（可自由填写，如：前端 / AI / 设计）"><input name="field" placeholder="该 Skill 所属的领域" className="w-full" /></Field>
                <label className="flex items-center gap-2 text-sm text-ink-soft mb-5 min-h-[44px] cursor-pointer">
                  <input type="checkbox" name="installed" className="w-4 h-4 accent-success" /> 是否已安装
                </label>
              </>
            )}
            <button type="submit" className="btn-primary w-full min-h-[44px]">保存</button>
          </form>
        </Modal>
      )}

      {/* 详情弹窗（交付要求 五.2，改为统一 RecordDetailModal） */}
      <RecordDetailModal
        open={!!detail}
        title={detail?.name || '资源详情'}
        onClose={() => setDetail(null)}
        fields={detail ? detailFields(detail) : []}
      />

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
