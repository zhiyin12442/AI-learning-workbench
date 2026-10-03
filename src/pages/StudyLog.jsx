import { useMemo, useState } from 'react'
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Download, Flame } from 'lucide-react'
import { useData, computeStats } from '../lib/store'
import { Header } from '../components/Header'
import { StatCard, Modal, Field, TagPill, EmptyState, ConfirmDialog, SwipeRow, RecordDetailModal } from '../components/ui'

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

export default function StudyLog() {
  const { data, upsert, remove, canDelete, showToast } = useData()
  const logs = (data.study_logs || []).filter((l) => !l.deleted)
  const stats = computeStats(data)
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [selDay, setSelDay] = useState(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null) // 编辑中的记录
  const [detail, setDetail] = useState(null) // 点击某条记录弹出的详情卡片
  const [confirm, setConfirm] = useState(null) // { id, name }

  const monthDate = new Date(month + '-01')
  const monthLogs = useMemo(
    () => logs.filter((l) => l.study_date?.startsWith(month)).sort((a, b) => (a.study_date < b.study_date ? 1 : -1)),
    [logs, month]
  )

  // 当月日历网格（交付要求 四.1）
  const { leading, days } = useMemo(() => {
    const start = startOfMonth(monthDate)
    const end = endOfMonth(monthDate)
    const byDate = {}
    logs.forEach((l) => { byDate[l.study_date] = (byDate[l.study_date] || 0) + 1 })
    const arr = []
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const ds = format(dt, 'yyyy-MM-dd')
      arr.push({ date: ds, day: dt.getDate(), count: byDate[ds] || 0 })
    }
    return { leading: start.getDay(), days: arr }
  }, [logs, month])

  const dayLogs = useMemo(() => logs.filter((l) => l.study_date === selDay), [logs, selDay])

  const shiftMonth = (n) => {
    setMonth(format(addMonths(monthDate, n), 'yyyy-MM'))
    setSelDay(null)
  }

  const exportCSV = () => {
    const header = '日期,今日操作,时长(分钟),笔记'
    const rows = monthLogs.map((l) =>
      [l.study_date, l.video_name, l.duration_minutes, (l.note || '').replace(/[\n,]/g, ' ')].join(',')
    )
    const blob = new Blob(['\ufeff' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `学习记录-${month}.csv`
    a.click()
    showToast(`${month} 的学习记录已导出为 CSV。`)
  }

  const save = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const name = fd.get('video_name')
    const prevStreak = stats.streak
    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')
    const hadYesterday = logs.some((l) => l.study_date === yesterday)
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const isToday = fd.get('study_date') === todayStr
    const newStreak = hadYesterday || isToday ? prevStreak + 1 : 1
    upsert('study_logs', {
      video_name: name,
      study_date: fd.get('study_date'),
      duration_minutes: Number(fd.get('duration_minutes')) || null,
      note: fd.get('note'),
    })
    setAdding(false)
    showToast(
      hadYesterday || isToday
        ? `已记录「${name}」，这是你连续学习的第 ${newStreak} 天 🔥`
        : '第一条已记下，坚持就是最好的开始。'
    )
  }

  return (
    <div>
      <Header title="学习记录" />

      {/* 统计卡 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="连续学习天数" value={stats.streak} icon={Flame} delta="keep going" deltaLabel="坚持就是胜利" />
        <StatCard label="累计视频" value={stats.totalVideos} delta="+7%" />
        <StatCard label="本周视频" value={stats.weekVideos} delta="+2" deltaLabel="vs 上周" />
        <StatCard label="本月视频" value={stats.monthVideos} delta="+5" deltaLabel="vs 上月" />
      </div>

      {/* 当月打卡日历（交付要求 四.1） */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-800">打卡日历</p>
          <p className="text-xs text-ink-faint flex items-center gap-1">少 <span className="w-2.5 h-2.5 rounded-[2px] bg-gray-100 inline-block" /><span className="w-2.5 h-2.5 rounded-[2px] bg-success/40 inline-block" /><span className="w-2.5 h-2.5 rounded-[2px] bg-success/70 inline-block" /><span className="w-2.5 h-2.5 rounded-[2px] bg-success inline-block" /> 多</p>
        </div>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => shiftMonth(-1)} className="p-2 hover:bg-gray-100 rounded-[10px] text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="上个月"><ChevronLeft size={16} /></button>
          <p className="text-sm font-semibold text-gray-800">
            {format(monthDate, 'yyyy 年 M 月', { locale: zhCN })}
          </p>
          <button onClick={() => shiftMonth(1)} className="p-2 hover:bg-gray-100 rounded-[10px] text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="下个月"><ChevronRight size={16} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-ink-faint mb-1">
          {WEEK.map((w) => <span key={w} className="py-1">{w}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: leading }).map((_, i) => <span key={'b' + i} />)}
          {days.map((d) => {
            const cls = d.count === 0 ? 'bg-gray-100 text-ink-faint' : d.count === 1 ? 'bg-success/40 text-gray-800' : d.count === 2 ? 'bg-success/70 text-white' : 'bg-success text-white'
            const active = selDay === d.date
            return (
              <button
                key={d.date}
                onClick={() => setSelDay(d.date)}
                className={'aspect-square rounded-[10px] flex flex-col items-center justify-center text-sm transition-colors duration-150 ' + cls + (active ? ' ring-2 ring-primary' : ' hover:opacity-80')}
              >
                {d.day}
                {d.count > 0 && <span className="text-[10px] mt-0.5 opacity-90">{d.count} 条</span>}
              </button>
            )
          })}
        </div>
        {/* 点击某天查看当日视频（交付要求 四.1.4） */}
        {selDay && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-xs text-ink-faint mb-2">{selDay} 的学习记录</p>
            {dayLogs.length === 0 ? (
              <p className="text-sm text-ink-soft">这一天还没有学习记录。</p>
            ) : (
              <ul className="space-y-2">
                {dayLogs.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-gray-800 truncate">{l.video_name}</span>
                    <span className="text-xs text-ink-faint shrink-0 whitespace-nowrap">{l.duration_minutes ? l.duration_minutes + ' 分钟' : '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* 月度表格（滑动编辑/删除，交付要求 四.2） */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm font-semibold text-gray-800">{format(monthDate, 'yyyy 年 M 月', { locale: zhCN })}记录</p>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="btn-ghost flex items-center gap-1.5 min-h-[44px]"><Download size={15} /> 导出 CSV</button>
            <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5 min-h-[44px]"><Plus size={16} /> 新增记录</button>
          </div>
        </div>

        {monthLogs.length === 0 ? (
          <EmptyState text="这个月还没有学习记录，从今天的第一条开始吧。" action={<button onClick={() => setAdding(true)} className="btn-primary min-h-[44px]">+ 新增记录</button>} />
        ) : (
          <div className="overflow-x-auto">
            {/* 表头 */}
            <div className="grid grid-cols-[100px_1fr_90px_1fr] gap-3 px-3 py-2.5 text-xs text-ink-faint border-b border-line min-w-[560px]">
              <span>日期</span><span>今日操作</span><span>时长</span><span>笔记</span>
            </div>
            {monthLogs.map((l) => (
              <SwipeRow
                key={l.id}
                onEdit={() => setEditing(l)}
                onDelete={canDelete ? () => setConfirm({ id: l.id, name: l.video_name }) : undefined}
                onTap={() => setDetail(l)}
                editLabel="编辑"
                deleteLabel="删除"
              >
                <div className="grid grid-cols-[100px_1fr_90px_1fr] gap-3 items-center py-3 px-3 border-b border-line last:border-0 cursor-pointer min-w-[560px]">
                  <span className="text-ink-soft whitespace-nowrap text-sm">{l.study_date}</span>
                  <span className="font-medium text-gray-800 truncate">{l.video_name}</span>
                  <span className="text-ink-soft whitespace-nowrap text-sm">{l.duration_minutes ? l.duration_minutes + ' 分钟' : '—'}</span>
                  <span className="text-ink-soft truncate">{l.note || '—'}</span>
                </div>
              </SwipeRow>
            ))}
          </div>
        )}
      </div>

      {adding && (
        <Modal title="新增学习记录" onClose={() => setAdding(false)}>
          <form onSubmit={save}>
            <Field label="今日操作">
              <select name="video_name" required defaultValue="视频学习" className="w-full">
                <option value="视频学习">视频学习</option>
                <option value="实操学习">实操学习</option>
              </select>
            </Field>
            <Field label="学习日期"><input name="study_date" type="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')} className="w-full" /></Field>
            <Field label="学习时长（分钟，可选）"><input name="duration_minutes" type="number" min="0" className="w-full" /></Field>
            <Field label="一句话笔记"><textarea name="note" rows={3} className="w-full" /></Field>
            <button type="submit" className="btn-primary w-full min-h-[44px]">保存</button>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirm}
        title="删除学习记录"
        message="删除后无法恢复，确定要删除这条学习记录吗？"
        itemName={confirm?.name}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { remove('study_logs', confirm.id); showToast('学习记录已删除。'); setConfirm(null) }}
      />

      {editing && (
        <Modal title="编辑学习记录" onClose={() => setEditing(null)}>
          <form onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.target)
            upsert('study_logs', {
              id: editing.id,
              video_name: fd.get('video_name'),
              study_date: fd.get('study_date'),
              duration_minutes: Number(fd.get('duration_minutes')) || null,
              note: fd.get('note'),
            })
            setEditing(null)
            showToast('学习记录已更新。')
          }}>
            <Field label="今日操作">
              <select name="video_name" required defaultValue={editing.video_name} className="w-full">
                <option value="视频学习">视频学习</option>
                <option value="实操学习">实操学习</option>
              </select>
            </Field>
            <Field label="学习日期"><input name="study_date" type="date" required defaultValue={editing.study_date} className="w-full" /></Field>
            <Field label="学习时长（分钟，可选）"><input name="duration_minutes" type="number" min="0" defaultValue={editing.duration_minutes || ''} className="w-full" /></Field>
            <Field label="一句话笔记"><textarea name="note" rows={3} defaultValue={editing.note || ''} className="w-full" /></Field>
            <button type="submit" className="btn-primary w-full min-h-[44px]">保存</button>
          </form>
        </Modal>
      )}

      {/* 点击学习记录条目弹出的完整详情卡片 */}
      <RecordDetailModal
        open={!!detail}
        title={detail?.video_name || '学习记录详情'}
        onClose={() => setDetail(null)}
        fields={detail ? [
          { label: '今日操作', value: detail.video_name },
          { label: '学习日期', value: detail.study_date },
          { label: '学习时长', value: detail.duration_minutes ? detail.duration_minutes + ' 分钟' : '—' },
          { label: '一句话笔记', value: detail.note },
        ] : []}
      />
    </div>
  )
}
