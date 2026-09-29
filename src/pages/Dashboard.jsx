import { FileText, CheckSquare, CheckCircle2, AlertCircle, CalendarDays } from 'lucide-react'
import { useData, computeStats } from '../lib/store'
import { Header, GlobalSearch } from '../components/Header'
import { StatCard, StatusText, PriorityPill, TagPill } from '../components/ui'
import { TasksGauge } from '../components/cards'
import ProjectOverviewCards from '../components/ProjectOverviewCards'
import { ACTIVITIES } from '../lib/seed'

export default function Dashboard() {
  const { data, upsert } = useData()
  const stats = computeStats(data)

  // 任务进度半环形：分段占比与配色（交付要求 二.2）
  const gaugeSegments = [
    { label: '未开始', pct: 20, color: '#60A5FA' },
    { label: '进行中', pct: 8, color: '#A78BFA' },
    { label: '审核中', pct: 12, color: '#FBBF24' },
    { label: '已完成', pct: 60, color: '#34D399' },
  ]

  const recentLogs = [...(data.study_logs || [])]
    .sort((a, b) => (b.study_date > a.study_date ? 1 : -1))
    .slice(0, 8)

  return (
    <div>
      <Header title="总览" />
      {/* 全局搜索框仅保留在总览页（交付要求 5） */}
      <div className="mb-6">
        <GlobalSearch />
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="累计学习视频" value={stats.totalVideos} icon={FileText} delta="+7%" />
        <StatCard label="进行中项目" value={stats.activeProjects} icon={CheckSquare} delta="+3%" color="text-warning" />
        <StatCard label="已完成概念" value={stats.doneConcepts} icon={CheckCircle2} delta="+6%" />
        <StatCard label="逾期任务" value={1} icon={AlertCircle} delta="-2%" up={false} color="text-danger" />
      </div>

      {/* 中部：项目概览 + 任务进度 */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 mb-6">
        <div>
          <p className="text-base font-semibold text-gray-900 mb-4">项目概览</p>
          <div className="overflow-x-auto">
            <ProjectOverviewCards />
          </div>
        </div>
        <div className="card p-5 h-fit">
          <p className="text-base font-semibold text-gray-900 mb-2">任务进度</p>
          <TasksGauge total={27} segments={gaugeSegments} />
          <ul className="mt-3 space-y-2.5">
            {gaugeSegments.map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-[13px]">
                <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: s.color }} />
                <span className="font-medium text-gray-800">{s.label}</span>
                <span className="ml-auto font-bold text-gray-900 tabular-nums">{s.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 底部：最近学习记录 + 最新动态 */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 pb-2">
        <div className="card p-5">
          <p className="text-base font-semibold text-gray-900 mb-4">任务总览</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="text-left text-xs text-ink-soft bg-gray-50 rounded-[10px]">
                  <th className="py-2.5 pl-3 pr-2 font-medium rounded-l-[10px] w-10">#</th>
                  <th className="py-2.5 pr-2 font-medium">名称</th>
                  <th className="py-2.5 pr-2 font-medium">日期</th>
                  <th className="py-2.5 pr-2 font-medium">优先级</th>
                  <th className="py-2.5 pr-2 font-medium">标签</th>
                  <th className="py-2.5 pr-3 font-medium rounded-r-[10px]">状态</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((l, i) => {
                  const stale = new Date(l.study_date + 'T00:00:00') < new Date(Date.now() - 7 * 86400000)
                  return (
                    <tr key={l.id} className="border-b border-line last:border-0 hover:bg-gray-50/60 transition-colors duration-150">
                      <td className="py-3 pl-3 pr-2 text-ink-faint">{String(i + 1).padStart(2, '0')}</td>
                      <td className="py-3 pr-2 font-medium text-gray-800 truncate max-w-[180px]">{l.video_name}</td>
                      <td className="py-3 pr-2 text-ink-soft whitespace-nowrap text-xs">
                        <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{l.study_date}</span>
                      </td>
                      <td className="py-3 pr-2"><PriorityPill level={stale ? 'High' : 'Medium'} /></td>
                      <td className="py-3 pr-2"><TagPill>{l.topic || '通用'}</TagPill></td>
                      <td className="py-3 pr-3"><StatusText status={stale ? '未开始' : '已完成'} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5 h-fit">
          <p className="text-base font-semibold text-gray-900 mb-4">最新动态</p>
          <div className="relative">
            {ACTIVITIES.map((a, i) => (
              <div key={i} className="relative flex gap-3 pb-5 last:pb-0">
                {i < ACTIVITIES.length - 1 && (
                  <span className="absolute left-[14px] top-7 bottom-0 border-l border-dashed border-gray-200" />
                )}
                <img src={a.avatar} alt={a.user} className="w-7 h-7 rounded-full object-cover shrink-0 relative z-10" />
                <div className="min-w-0">
                  <p className="text-xs text-ink-soft leading-relaxed">
                    <span className="font-semibold text-gray-800">{a.user}</span> · {a.action}
                  </p>
                  <p className="text-[11px] text-ink-faint mt-0.5 truncate">{a.project}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
