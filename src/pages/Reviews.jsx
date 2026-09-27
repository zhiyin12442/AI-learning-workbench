import { Link, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Plus, Pencil, ArrowLeft } from 'lucide-react'
import { useData } from '../lib/store'
import { Header } from '../components/Header'
import { Field, EmptyState, TagPill } from '../components/ui'

const MOODS = ['收获很大', '有触动', '一般', '待改进']
const SOURCES = ['自己', '他人']

export default function Reviews() {
  const { data } = useData()
  const list = [...(data.reviews || [])].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  return (
    <div>
      <Header title="经验复盘" />
      <div className="flex justify-end mb-4">
        <Link to="/reviews/new" className="btn-primary flex items-center gap-1.5 min-h-[44px]"><Plus size={16} /> 写复盘</Link>
      </div>

      {list.length === 0 ? (
        <div className="card">
          <EmptyState
            text="这里还是空的，点击右上角「写复盘」，把刚学到的经验沉淀下来。"
            action={<Link to="/reviews/new" className="btn-primary min-h-[44px]">写第一篇复盘</Link>}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((r) => (
            <Link key={r.id} to={`/reviews/${r.id}/edit`} className="card p-5 block hover:shadow-nav-active transition-shadow duration-200">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h3 className="font-semibold text-gray-900">{r.title}</h3>
                <TagPill className={r.source === '自己' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}>{r.source === '自己' ? '自己的经验' : '他人的经验'}</TagPill>
                {(r.tags || []).map((t) => <TagPill key={t}>#{t}</TagPill>)}
              </div>
              <p className="text-sm text-ink-soft line-clamp-2">{r.body}</p>
              <p className="text-xs text-ink-faint mt-2.5">
                {r.created_at ? format(new Date(r.created_at), 'yyyy年M月d日 HH:mm', { locale: zhCN }) : ''}
                {r.mood ? ' · ' + r.mood : ''}
                {(r.linked_items || []).length ? ' · 关联：' + r.linked_items.join('、') : ''}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function ReviewEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, upsert, showToast } = useData()
  const existing = id ? (data.reviews || []).find((r) => r.id === id) : null

  const save = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const title = fd.get('title')
    const now = new Date().toISOString()
    upsert('reviews', {
      id: existing?.id,
      title,
      body: fd.get('body'),
      source: fd.get('source'),
      linked_items: (fd.get('linked_items') || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      tags: (fd.get('tags') || '').split(/[,，\s]+/).map((s) => s.trim().replace(/^#/, '')).filter(Boolean),
      mood: fd.get('mood'),
    })
    showToast(existing ? `复盘已更新 · ${format(new Date(), 'HH:mm')}，持续迭代才有长期价值。` : `复盘已保存 · ${format(new Date(), 'HH:mm')}，坚持记录是成长最快的方式。`)
    nav('/reviews')
  }

  return (
    <div>
      <Link to="/reviews" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-primary mb-4 min-h-[44px]">
        <ArrowLeft size={15} /> 返回复盘列表
      </Link>

      <div className="card p-6 max-w-3xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">{existing ? '编辑复盘' : '写复盘'}</h2>
        <form onSubmit={save}>
          <Field label="标题"><input name="title" required defaultValue={existing?.title || ''} className="w-full" autoFocus /></Field>
          <Field label="正文"><textarea name="body" rows={8} defaultValue={existing?.body || ''} placeholder="发生了什么？学到了什么？下次怎么做得更好？" className="w-full" /></Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <Field label="来源">
              <select name="source" defaultValue={existing?.source || '自己'} className="w-full">
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="收获程度">
              <select name="mood" defaultValue={existing?.mood || '有触动'} className="w-full">
                {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="关联板块与项目（逗号分隔）"><input name="linked_items" defaultValue={(existing?.linked_items || []).join(', ')} placeholder="学习记录, AI 学习工作台" className="w-full" /></Field>
            <Field label="标签（逗号分隔）"><input name="tags" defaultValue={(existing?.tags || []).join(', ')} className="w-full" /></Field>
          </div>
          <p className="text-xs text-ink-faint mb-5">保存后自动写入创建时间；再次编辑会自动更新修改时间。</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => nav('/reviews')} className="btn-ghost min-h-[44px]">取消</button>
            <button type="submit" className="btn-primary flex-1 min-h-[44px]">保存复盘</button>
          </div>
        </form>
      </div>
    </div>
  )
}
