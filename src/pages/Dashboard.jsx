import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { FileText, CheckSquare, CheckCircle2, AlertCircle, CalendarDays, BookOpen, Lightbulb, History, NotebookPen, ClipboardList } from 'lucide-react'
import { useData, computeStats } from '../lib/store'
import { Header, GlobalSearch } from '../components/Header'
import { StatCard, StatusText, PriorityPill, TagPill, RecordDetailModal } from '../components/ui'
import { TasksGauge } from '../components/cards'
import ProjectOverviewCards from '../components/ProjectOverviewCards'

export default function Dashboard() {
  const { data, upsert } = useData()
  const stats = computeStats(data)

  // 项目灵感数据（未归档、未删除），文件夹卡片与进度环均绑定此数据
  const projects = (data.project_ideas || []).filter((p) => !p.deleted && !p.archived)

  // 「项目进度」半环形：按项目灵感的状态字段实时统计
  const STATUS_COLORS = [
    { label: '未开始', color: '#60A5FA' },
    { label: '进行中', color: '#A78BFA' },
    { label: '已完成', color: '#34D399' },
  ]
  const total = projects.length
  const gaugeSegments = STATUS_COLORS.map(({ label, color }) => ({
    label,
    color,
    pct: total ? Math.round((projects.filter((p) => p.status === label).length / total) * 100) : 0,
  }))

  const recentLogs = [...(data.study_logs || [])]
    .filter((l) => !l.deleted)
    .sort((a, b) => (b.study_date > a.study_date ? 1 : -1))
    .slice(0, 8)

  // 最新动态：从真实记录聚合（按时间倒序），点击跳到对应板块——与具体记录同步
  const feed = [
    ...(data.concepts || []).filter((c) => !c.deleted).map((c) => ({ type: '概念学习', name: c.name, at: c.updated_at || c.created_at, to: '/concepts', icon: BookOpen })),
    ...(data.reviews || []).filter((r) => !r.deleted).map((r) => ({ type: '经验复盘', name: r.title, at: r.created_at, to: '/reviews', icon: History })),
    ...(data.project_ideas || []).filter((p) => !p.deleted).map((p) => ({ type: '项目灵感', name: p.name, at: p.updated_at || p.created_at, to: '/projects', icon: Lightbulb })),
    ...(data.study_logs || []).filter((l) => !l.deleted).map((l) => ({ type: '学习记录', name: l.video_name, at: l.study_date, to: '/studylog', icon: NotebookPen })),
  ]
    .filter((x) => x.at)
    .sort((a, b) => (b.at < a.at ? -1 : b.at > a.at ? 1 : 0))
    .slice(0, 6)

  // 学习记录行点开详情
  const [detail, setDetail] = useState(null)

  return (
    <div>
      <Header title="总览" />
      {/* 全局搜索框仅保留在总览页 */}
      <div className="mb-5">
        <GlobalSearch />
      </div>

      {/* 统计卡：整卡可点击跳转到对应板块（交互与记录同步） */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <NavLink to="/studylog" className="block"><StatCard label="累计学习视频" value={stats.totalVideos} icon={FileText} delta="+7%" /></NavLink>
        <NavLink to="/projects" className="block"><StatCard label="进行中项目" value={stats.activeProjects} icon={CheckSquare} delta="+3%" color="text-warning" /></NavLink>
        <NavLink to="/concepts" className="block"><StatCard label="已完成概念" value={stats.doneConcepts} icon={CheckCircle2} delta="+6%" /></NavLink>
        <NavLink to="/todos" className="block"><StatCard label="逾期任务" value={(data.todos || []).filter((t) => !t.deleted && !t.done).length} icon={AlertCircle} delta="-2%" up={false} color="text-danger" /></NavLink>
      </div>

      {/* 中部：项目灵感（文件夹卡片，点击进详情） + 项目进度 */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-5 mb-5">
        <div className="min-w-0">
          <p className="text-base font-semibold text-gray-900 mb-3">项目灵感</p>
          <ProjectOverviewCards projects={projects} />
        </div>
        <div className="card p-5 h-fit min-w-0">
          <p className="text-base font-semibold text-gray-900 mb-2">项目进度</p>
          <TasksGauge total={total} segments={gaugeSegments} label="项目" />
          <ul className="mt-3 space-y-2">
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

      {/* 底部：最近学习记录（可点击打开详情） + 最新动态（真实数据） */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-5 pb-2">
        <div className="card p-5 min-w-0">
          <p className="text-base font-semibold text-gray-900 mb-4">最近学习记录</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
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
                    <tr
                      key={l.id}
                      onClick={() => setDetail(l)}
                      className="border-b border-line last:border-0 hover:bg-gray-50/60 transition-colors duration-150 cursor-pointer"
                    >
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
            {feed.length === 0 ? (
              <p className="text-sm text-ink-soft">还没有记录，去任意板块添加第一条吧。</p>
            ) : (
              feed.map((a, i) => {
                const Icon = a.icon
                return (
                  <NavLink key={i} to={a.to} className="relative flex gap-3 pb-5 last:pb-0 group">
                    {i < feed.length - 1 && (
                      <span className="absolute left-[14px] top-7 bottom-0 border-l border-dashed border-gray-200" />
                    )}
                    <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 relative z-10 text-gray-500 group-hover:text-primary">
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-ink-soft leading-relaxed">
                        <span className="font-semibold text-gray-800">{a.name}</span>
                        <span className="text-ink-faint"> · {a.type}</span>
                      </p>
                      <p className="text-[11px] text-ink-faint mt-0.5 truncate">{a.at}</p>
                    </div>
                  </NavLink>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* 点击学习记录行弹出的完整详情卡片 */}
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
