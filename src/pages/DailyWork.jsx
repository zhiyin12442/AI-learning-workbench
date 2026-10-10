import { useMemo, useState } from 'react'
import { Plus, Check, Flame, Pencil, CalendarCheck, Trash2 } from 'lucide-react'
import { useData } from '../lib/store'
import { Header } from '../components/Header'
import { Modal, Field, EmptyState, ConfirmDialog, SwipeRow } from '../components/ui'

// 本地日期（YYYY-MM-DD），避免 toISOString 受时区影响
const fmt = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const todayStr = () => fmt(new Date())

// 连续打卡天数：从今天（若今天未打卡则从昨天）往前数连续命中
function computeStreak(checkins) {
  const set = new Set(checkins || [])
  if (set.size === 0) return 0
  let cur = new Date()
  if (!set.has(todayStr())) cur.setDate(cur.getDate() - 1)
  let streak = 0
  while (set.has(fmt(cur))) {
    streak++
    cur.setDate(cur.getDate() - 1)
  }
  return streak
}

// 最近 N 天（旧→新）的日期数组，用于历史热力图
function lastNDates(n) {
  const base = new Date()
  const arr = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    arr.push(fmt(d))
  }
  return arr
}

export default function DailyWork() {
  const { data, upsert, remove, canDelete, showToast } = useData()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [kw, setKw] = useState('')

  const habits = useMemo(
    () => (data.habits || [])
      .filter((h) => !h.deleted)
      .filter((h) => !kw.trim() || (h.title + ' ' + (h.note || '')).toLowerCase().includes(kw.trim().toLowerCase())),
    [data.habits, kw]
  )

  const today = todayStr()
  const stats = useMemo(() => {
    const total = habits.length
    const doneToday = habits.filter((h) => (h.checkins || []).includes(today)).length
    const best = habits.reduce((m, h) => Math.max(m, computeStreak(h.checkins)), 0)
    return { total, doneToday, best }
  }, [habits, today])

  const toggleToday = (h) => {
    const set = new Set(h.checkins || [])
    const isOn = set.has(today)
    if (isOn) set.delete(today)
    else set.add(today)
    upsert('habits', { ...h, checkins: [...set] })
    showToast(isOn ? '已取消今日打卡。' : '打卡成功，坚持就是胜利 🔥')
  }

  const save = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const title = fd.get('title')?.toString().trim()
    if (!title) return
    upsert('habits', { title, note: fd.get('note') || '' })
    setAdding(false)
    showToast(`已添加「${title}」`)
  }

  const update = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    upsert('habits', { id: editing.id, title: fd.get('title'), note: fd.get('note') || '' })
    setEditing(null)
    showToast('已更新')
  }

  const history = lastNDates(21)

  return (
    <div>
      <Header title="每日工作" />

      {/* 概览统计 */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.doneToday}/{stats.total}</p>
          <p className="text-xs text-ink-faint mt-1">今日已打卡</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.best}</p>
          <p className="text-xs text-ink-faint mt-1">最长连续(天)</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-ink-faint mt-1">习惯条目</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="搜索习惯..." className="w-full pl-4" />
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5 min-h-[44px] ml-auto">
          <Plus size={16} /> 新建习惯
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="card">
          <EmptyState
            text={kw ? `没有找到包含「${kw}」的习惯。` : '还没有习惯条目，添加一个开始每日打卡吧。'}
            action={!kw && <button onClick={() => setAdding(true)} className="btn-primary min-h-[44px]">+ 新建习惯</button>}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((h) => {
            const on = (h.checkins || []).includes(today)
            const streak = computeStreak(h.checkins)
            const total = (h.checkins || []).length
            return (
              <SwipeRow
                key={h.id}
                onEdit={() => setEditing(h)}
                onDelete={canDelete ? () => setConfirm({ id: h.id, name: h.title }) : undefined}
                onTap={() => toggleToday(h)}
                editLabel="编辑"
                deleteLabel="删除"
              >
                <div className="card p-5">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleToday(h) }}
                      className={'mt-0.5 w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px] transition-colors ' +
                        (on ? 'bg-success border-success text-white' : 'border-gray-300 text-transparent hover:border-primary')}
                      aria-label={on ? '取消今日打卡' : '今日打卡'}
                    >
                      <Check size={22} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={'font-semibold text-base ' + (on ? 'text-gray-500' : 'text-gray-900')}>{h.title}</span>
                        {streak > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-danger/10 text-danger font-medium">
                            <Flame size={12} /> 连续 {streak} 天
                          </span>
                        )}
                      </div>
                      {h.note && <p className="text-sm text-ink-soft mt-0.5 whitespace-pre-wrap break-words">{h.note}</p>}
                      <p className="text-xs text-ink-faint mt-1">
                        {on ? '今天已打卡 ✓' : '今天还没打卡'} · 累计打卡 {total} 次
                      </p>
                    </div>
                  </div>

                  {/* 历史打卡记录（最近 21 天） */}
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">历史打卡（最近 21 天）</p>
                    <div className="grid grid-cols-7 gap-1.5">
                      {history.map((day) => {
                        const hit = (h.checkins || []).includes(day)
                        const isToday = day === today
                        return (
                          <div
                            key={day}
                            title={day}
                            className={'aspect-square rounded-[6px] ' + (hit ? 'bg-success' : 'bg-gray-100') + (isToday ? ' ring-2 ring-primary' : '')}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              </SwipeRow>
            )
          })}
        </div>
      )}

      {adding && (
        <Modal title="新建习惯" onClose={() => setAdding(false)}>
          <form onSubmit={save}>
            <Field label="习惯名称（任意内容）"><input name="title" required className="w-full" autoFocus placeholder="例如：阅读 30 分钟" /></Field>
            <Field label="备注（可选）"><textarea name="note" rows={3} className="w-full" placeholder="例如：每天固定读技术书" /></Field>
            <button type="submit" className="btn-primary w-full min-h-[44px]">添加</button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="编辑习惯" onClose={() => setEditing(null)}>
          <form onSubmit={update}>
            <Field label="习惯名称"><input name="title" required defaultValue={editing.title} className="w-full" /></Field>
            <Field label="备注（可选）"><textarea name="note" rows={3} defaultValue={editing.note || ''} className="w-full" /></Field>
            <button type="submit" className="btn-primary w-full min-h-[44px]">保存</button>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirm}
        title="删除习惯"
        message="删除后该习惯及其打卡记录将永久移除，确定吗？"
        itemName={confirm?.name}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { remove('habits', confirm.id); showToast('习惯已删除。'); setConfirm(null) }}
      />
    </div>
  )
}
