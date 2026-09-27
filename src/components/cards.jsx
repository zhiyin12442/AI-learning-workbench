import { CalendarDays, ListTodo, Folder } from 'lucide-react'
import { AVATARS } from '../lib/seed'

const COLORS = {
  lime: { icon: 'text-folder-lime', bar: 'bg-folder-lime' },
  violet: { icon: 'text-folder-violet', bar: 'bg-folder-violet' },
  sky: { icon: 'text-folder-sky', bar: 'bg-folder-sky' },
}

/**
 * 项目文件夹卡片 —— 逐像素对照截图：
 * - 左上角白色文件夹凸舌（72×20，上侧圆角 10px，下端伸入卡片背后被盖住）
 * - 凸舌内放彩色实心文件夹图标（lime / violet / sky）
 * - 卡片左上角为直角（与凸舌无缝衔接），其余三角 12px 圆角
 * - 标题下方一排重叠成员头像（白描边）
 * - 元信息单行：左边截止日（日历图标），右边任务数（清单图标）
 * - 底部进度条 + 右侧深色粗体数字
 * - 常驻静态右下方向阴影，无悬停变化
 */
export default function ProjectCard({ project, progress, color = 'lime', tasks }) {
  const c = COLORS[color] || COLORS.lime
  return (
    <div className="relative mt-3">
      {/* 文件夹凸舌：白色，上侧圆角 10px，底边与卡片顶边无缝衔接 */}
      <div className="absolute -top-5 left-0 h-5 w-[72px] rounded-t-[10px] bg-white z-0" />
      <div className="card relative z-10 p-5 rounded-tl-none">
        <Folder size={22} strokeWidth={0} fill="currentColor" className={c.icon + ' absolute -top-3 left-4 z-20'} />
        <h3 className="text-[17px] font-semibold text-gray-900 leading-snug truncate">{project.name}</h3>

        {/* 成员头像行 */}
        <div className="mt-3 flex -space-x-2">
          {AVATARS.slice(0, 4).map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              className="w-7 h-7 rounded-full object-cover ring-2 ring-white"
            />
          ))}
        </div>

        {/* 元信息单行：截止日 + 任务数 */}
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-ink-faint">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <CalendarDays size={13} className="shrink-0" />
            <span className="truncate">Deadline: {project.deadline}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <ListTodo size={13} />
            <span>{tasks} tasks</span>
          </span>
        </div>

        {/* 进度条 + 数字 */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-[6px] bg-gray-100 rounded-full overflow-hidden">
            <div className={'h-full rounded-full transition-all duration-500 ' + c.bar} style={{ width: progress + '%' }} />
          </div>
          <span className="text-[13px] font-bold text-gray-900 tabular-nums">{progress}</span>
        </div>
      </div>
    </div>
  )
}

// 半圆环分段仪表盘 —— 对照截图：粗环、圆头端点、段间白色细缝
export function TasksGauge({ total = 27, segments }) {
  // segments: [{label, pct, color}]，从左到右：sky, violet, yellow, lime
  const R = 84
  const CX = 110
  const CY = 116
  const SW = 30
  const GAP = 4 // 段间空隙（度）
  const polar = (deg) => {
    const a = ((180 - deg) * Math.PI) / 180
    return [CX + R * Math.cos(a), CY - R * Math.sin(a)]
  }
  let acc = 0
  const arcs = segments.map((s) => {
    const sweep = (s.pct / 100) * 180
    const start = acc + GAP / 2
    const end = acc + sweep - GAP / 2
    acc += sweep
    if (end <= start) return null
    const [x1, y1] = polar(start)
    const [x2, y2] = polar(end)
    return (
      <path
        key={s.label}
        d={`M ${x1} ${y1} A ${R} ${R} 0 ${end - start > 180 ? 1 : 0} 1 ${x2} ${y2}`}
        stroke={s.color}
        strokeWidth={SW}
        strokeLinecap="round"
        fill="none"
      />
    )
  })
  return (
    <svg viewBox="0 0 220 126" className="w-full">
      {arcs}
      <text x={CX} y={CY - 32} textAnchor="middle" className="fill-gray-500" fontSize="13">Total task</text>
      <text x={CX} y={CY - 4} textAnchor="middle" className="fill-gray-900" fontSize="28" fontWeight="700">{total}</text>
    </svg>
  )
}
