import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, ExternalLink, Pin } from 'lucide-react'
import { useData } from '../lib/store'
import { EmptyState, StatusPill, ConfirmDialog } from '../components/ui'
import { format } from 'date-fns'

export default function ProjectIdeaDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, upsert, remove, canDelete, showToast } = useData()
  const project = (data.project_ideas || []).find((p) => p.id === id)

  if (!project) {
    return (
      <div>
        <BackLink />
        <div className="card"><EmptyState text="这个项目不存在或已被删除。" action={<button onClick={() => nav('/projects')} className="btn-ghost min-h-[44px]">返回列表</button>} /></div>
      </div>
    )
  }

  const steps = project.steps || []
  const done = steps.filter((s) => s.done).length
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0
  const [newStep, setNewStep] = useState('')
  const [notes, setNotes] = useState(project.notes || '')
  const [confirm, setConfirm] = useState(null) // 删除整个项目
  const [confirmStep, setConfirmStep] = useState(null) // 删除某一步骤的索引

  const setProject = (patch) => upsert('project_ideas', { ...project, ...patch })

  const addStep = () => {
    if (!newStep.trim()) return
    setProject({ steps: [...steps, { text: newStep.trim(), done: false }] })
    setNewStep('')
  }

  const complete = () => {
    setProject({ status: '已完成' })
    showToast(`🎉 项目「${project.name}」已完成，要不要写一条复盘沉淀经验？`, 4200)
  }

  return (
    <div>
      <BackLink />

      {/* 头部 */}
      <div className="card p-6 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {project.pinned && <Pin size={15} className="text-warning" />}
              <h2 className="text-xl font-semibold text-gray-900">{project.name}</h2>
              <StatusPill status={project.status || '未开始'} />
            </div>
            <p className="text-sm text-ink-soft mt-2 max-w-xl">{project.goal || '还没有写一句话目标。'}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs text-ink-faint text-right leading-relaxed">
              <p>创建于 {project.created_at ? format(new Date(project.created_at), 'yyyy-MM-dd HH:mm') : '—'}</p>
              <p>更新于 {project.updated_at ? format(new Date(project.updated_at), 'yyyy-MM-dd HH:mm') : '—'}</p>
            </div>
            {canDelete && (
              <button
                onClick={() => setConfirm({ id: project.id, name: project.name })}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-danger/30 text-danger text-xs font-medium px-3 py-1.5 hover:bg-danger/5 min-h-[36px]"
              >
                <Trash2 size={14} /> 删除项目
              </button>
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {(project.stack || []).map((s) => (
            <span key={s} className="rounded-full px-3 py-1 text-xs bg-primary/10 text-primary">{s}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 实施步骤 */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">实施步骤</p>
            <p className="text-xs text-ink-faint">{done}/{steps.length} · {pct}%</p>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-folder-lime rounded-full transition-all duration-300" style={{ width: pct + '%' }} />
          </div>
          <ul className="space-y-1 mb-4">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-3 group">
                <input
                  type="checkbox"
                  checked={!!s.done}
                  onChange={() => setProject({ steps: steps.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) })}
                  className="w-5 h-5 accent-success cursor-pointer shrink-0"
                />
                <span className={'flex-1 text-sm py-2 min-h-[44px] flex items-center ' + (s.done ? 'text-ink-faint line-through' : 'text-gray-700')}>{s.text}</span>
                {canDelete && (
                  <button onClick={() => setConfirmStep(i)} className="p-2 text-ink-faint hover:text-danger opacity-0 group-hover:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="删除步骤"><Trash2 size={14} /></button>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input value={newStep} onChange={(e) => setNewStep(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addStep()} placeholder="添加一个步骤..." className="flex-1" />
            <button onClick={addStep} className="btn-primary min-h-[44px] flex items-center gap-1"><Plus size={15} /> 添加</button>
          </div>
          {project.status !== '已完成' && pct === 100 && steps.length > 0 && (
            <button onClick={complete} className="mt-4 w-full bg-success/10 text-success text-sm font-medium py-2.5 rounded-[10px] hover:bg-success/20 min-h-[44px]">
              🎉 全部完成！标记项目为已完成
            </button>
          )}
        </div>

        <div className="space-y-5">
          {/* 所需 Skills */}
          <div className="card p-6">
            <p className="text-sm font-semibold text-gray-800 mb-3">所需 Skills</p>
            {(project.required_skills || []).length === 0 ? (
              <p className="text-sm text-ink-faint">暂无，可在项目搜集板块中关联。</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {project.required_skills.map((s) => <span key={s} className="rounded-full px-3 py-1 text-xs bg-accent/10 text-accent">{s}</span>)}
              </div>
            )}
          </div>

          {/* 参考资料 */}
          <div className="card p-6">
            <p className="text-sm font-semibold text-gray-800 mb-3">参考资料</p>
            {(project.reference_links || []).length === 0 ? (
              <p className="text-sm text-ink-faint">暂无参考链接。</p>
            ) : (
              <ul className="space-y-2">
                {project.reference_links.map((r) => (
                  <li key={r}>
                    <a href={r} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1.5 hover:underline break-all">
                      <ExternalLink size={13} className="shrink-0" /> {r}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 进度备注 */}
          <div className="card p-6">
            <p className="text-sm font-semibold text-gray-800 mb-3">进度备注</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== (project.notes || '') && setProject({ notes })}
              rows={4}
              placeholder="记录当前进展、卡点和下一步..."
              className="w-full"
            />
            <p className="text-xs text-ink-faint mt-2">失焦后自动保存</p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title="删除项目"
        message="删除后无法恢复，项目下的步骤、参考资料、进度备注都会一并清除。确定要删除吗？"
        itemName={confirm?.name}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { remove('project_ideas', confirm.id); showToast('项目已删除。'); nav('/projects') }}
      />

      <ConfirmDialog
        open={confirmStep !== null}
        title="删除步骤"
        message="确定要删除这一步吗？"
        itemName={confirmStep !== null ? steps[confirmStep]?.text : ''}
        onCancel={() => setConfirmStep(null)}
        onConfirm={() => { setProject({ steps: steps.filter((_, j) => j !== confirmStep) }); setConfirmStep(null) }}
      />
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-primary mb-4 min-h-[44px]">
      <ArrowLeft size={15} /> 返回项目列表
    </Link>
  )
}
