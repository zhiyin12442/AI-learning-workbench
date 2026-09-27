import { useMemo, useState } from 'react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Download, Flame } from 'lucide-react'
import { useData, computeStats } from '../lib/store'
import { Header } from '../components/Header'
import { StatCard, Modal, Field, TagPill, EmptyState } from '../components/ui'

export default function StudyLog() {
  const { data, upsert, showToast } = useData()
  const logs = data.study_logs || []
  const stats = computeStats(data)
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [adding, setAdding] = useState(false)

  const monthLogs = useMemo(
    () => logs.filter((l) => l.study_date?.startsWith(month)).sort((a, b) => (a.study_date < b.study_date ? 1 : -1)),
    [logs, month]
  )

  // 12 周热力图：84 天，按周列、星期行
  const heat = useMemo(() => {
    const byDate = {}
    logs.forEach((l) => { byDate[l.study_date] = (byDate[l.study_date] || 0) + 1 })
    const days = []
    let cur = new Date()
    // 让最后一列以今天结束：从 83 天前开始
    for (let i = 83; i >= 0; i--) {
      const dt = subDays(cur, i)
      days.push({ date: format(dt, 'yyyy-MM-dd'), count: byDate[format(dt, 'yyyy-MM-dd')] || 0 })
    }
    const weeks = []
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
    return weeks
  }, [logs])

  const shiftMonth = (n) => {
    const [y, m] = month.split('-').map(Number)
    const dt = new Date(y, m - 1 + n, 1)
    setMonth(format(dt, 'yyyy-MM'))
  }

  const exportCSV = () => {
    const header = '日期,视频名称,平台,主题,时长(分钟),笔记'
    const rows = monthLogs.map((l) =>
      [l.study_date, l.video_name, l.platform, l.topic, l.duration_minutes, (l.note || '').replace(/[\n,]/g, ' ')].join(',')
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
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    const hadYesterday = logs.some((l) => l.study_date === yesterday)
    const newStreak = hadYesterday || format(new Date(), 'yyyy-MM-dd') === fd.get('study_date') ? prevStreak + 1 : 1
    upsert('study_logs', {
      video_name: name,
      study_date: fd.get('study_date'),
      platform: fd.get('platform'),
      topic: fd.get('topic'),
      duration_minutes: Number(fd.get('duration_minutes')) || null,
      note: fd.get('note'),
    })
    setAdding(false)
    showToast(
      hadYesterday || format(new Date(), 'yyyy-MM-dd') === fd.get('study_date')
        ? `已记录《${name}》，这是你连续学习的第 ${newStreak} 天 🔥`
        : `中断了 ${newStreak > 0 ? '' : ''}${prevStreak ? Math.max(0, gapDays(fd.get('study_date'))) : 0} 天，重新开始就是最好的时机，今天的第一条已记下。`
    )
  }

  const gapDays = (dateStr) => {
    const last = logs.map((l) => l.study_date).sort().at(-1)
    if (!last) return 0
    return Math.round((new Date(dateStr) - new Date(last)) / 86400000) - 1
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

      {/* 热力图 */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-800">打卡日历 · 近 12 周</p>
          <p className="text-xs text-ink-faint flex items-center gap-1">少 <span className="w-2.5 h-2.5 rounded-full bg-gray-100 inline-block" /><span className="w-2.5 h-2.5 rounded-full bg-folder-lime/40 inline-block" /><span className="w-2.5 h-2.5 rounded-full bg-folder-lime/70 inline-block" /><span className="w-2.5 h-2.5 rounded-full bg-folder-lime inline-block" /> 多</p>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-[5px] min-w-max">
            {heat.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[5px]">
                {week.map((day) => {
                  const cls = day.count === 0 ? 'bg-gray-100' : day.count === 1 ? 'bg-folder-lime/40' : day.count === 2 ? 'bg-folder-lime/70' : 'bg-folder-lime'
                  return <span key={day.date} title={`${day.date} · ${day.count} 条记录`} className={'w-3.5 h-3.5 rounded-full cursor-default ' + cls} />
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 月度表格 */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => shiftMonth(-1)} className="p-2 hover:bg-gray-100 rounded-[10px] text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="上个月"><ChevronLeft size={16} /></button>
            <p className="text-sm font-semibold text-gray-800 min-w-[110px] text-center">
              {format(new Date(month + '-01'), 'yyyy 年 M 月', { locale: zhCN })}
            </p>
            <button onClick={() => shiftMonth(1)} className="p-2 hover:bg-gray-100 rounded-[10px] text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="下个月"><ChevronRight size={16} /></button>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="btn-ghost flex items-center gap-1.5 min-h-[44px]"><Download size={15} /> 导出 CSV</button>
            <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5 min-h-[44px]"><Plus size={16} /> 新增记录</button>
          </div>
        </div>

        {monthLogs.length === 0 ? (
          <EmptyState text="这个月还没有学习记录，从今天的第一条开始吧。" action={<button onClick={() => setAdding(true)} className="btn-primary min-h-[44px]">+ 新增记录</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs text-ink-faint border-b border-line">
                  <th className="py-2.5 pr-3 font-medium">日期</th>
                  <th className="py-2.5 pr-3 font-medium">视频名称</th>
                  <th className="py-2.5 pr-3 font-medium">来源</th>
                  <th className="py-2.5 pr-3 font-medium">主题</th>
                  <th className="py-2.5 pr-3 font-medium">时长</th>
                  <th className="py-2.5 font-medium">笔记</th>
                </tr>
              </thead>
              <tbody>
                {monthLogs.map((l) => (
                  <tr key={l.id} className="border-b border-line last:border-0 hover:bg-gray-50/60">
                    <td className="py-3 pr-3 text-ink-soft whitespace-nowrap">{l.study_date}</td>
                    <td className="py-3 pr-3 font-medium text-gray-800">{l.video_name}</td>
                    <td className="py-3 pr-3 text-ink-soft">{l.platform || '—'}</td>
                    <td className="py-3 pr-3"><TagPill>{l.topic || '通用'}</TagPill></td>
                    <td className="py-3 pr-3 text-ink-soft whitespace-nowrap">{l.duration_minutes ? l.duration_minutes + ' 分钟' : '—'}</td>
                    <td className="py-3 text-ink-soft truncate max-w-[220px]">{l.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding && (
        <Modal title="新增学习记录" onClose={() => setAdding(false)}>
          <form onSubmit={save}>
            <Field label="视频名称"><input name="video_name" required className="w-full" autoFocus /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="日期"><input name="study_date" type="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')} className="w-full" /></Field>
              <Field label="平台"><input name="platform" placeholder="B站 / YouTube..." className="w-full" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="主题"><input name="topic" placeholder="前端 / AI / 后端..." className="w-full" /></Field>
              <Field label="时长（分钟）"><input name="duration_minutes" type="number" min="0" className="w-full" /></Field>
            </div>
            <Field label="笔记"><textarea name="note" rows={3} className="w-full" /></Field>
            <button type="submit" className="btn-primary w-full min-h-[44px]">保存</button>
          </form>
        </Modal>
      )}
    </div>
  )
}
