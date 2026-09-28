import { CalendarDays, ListTodo } from 'lucide-react'

// 文件夹标签配色：黄绿 / 紫 / 天蓝（交付要求 二.1）
const HEX = { lime: '#84CC16', violet: '#A78BFA', sky: '#38BDF8' }

/**
 * 项目文件夹卡片（交付要求 二.1）：
 * - 顶部彩色文件夹标签（圆角矩形小色块，模拟文件夹顶部）
 * - 项目名称 → 元信息行（截止日期 + 任务数，带 📅 / 📋）
 * - 进度条（h-1.5 bg-gray-100 rounded-full，填充色与文件夹标签同色）
 * - 单人工作台，已移除参与人员头像
 */
export default function ProjectCard({ project, progress, color = 'lime', tasks }) {
  const c = HEX[color] || HEX.lime
  return (
    <div className="card p-5">
      <div className="w-6 h-5 rounded-t-[4px] mb-3" style={{ background: c }} />
      <h3 className="font-semibold text-[15px] text-gray-900 leading-snug truncate">{project.name}</h3>

      {/* 元信息单行：截止日 + 任务数 */}
      <div className="mt-2.5 flex items-center justify-between text-xs text-ink-faint">
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={13} className="shrink-0" /> 截止日期 {project.deadline}
        </span>
        <span className="inline-flex items-center gap-1 shrink-0">
          <ListTodo size={13} /> {tasks} 个任务
        </span>
      </div>

      {/* 进度条 + 填充色与标签一致 */}
      <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: progress + '%', background: c }} />
      </div>
    </div>
  )
}

// 半圆环分段仪表盘（交付要求 二.2）：灰色背景环 + 彩色分段弧 + 中心总任务数
export function TasksGauge({ total = 27, segments }) {
  const R = 92
  const CX = 110
  const CY = 104
  const SW = 16
  const GAP = 3 // 段间空隙（度）
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
    <svg viewBox="0 0 220 120" className="w-full">
      {/* 灰色背景半圆环 */}
      <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} stroke="#F3F4F6" strokeWidth={SW} fill="none" />
      {arcs}
      <text x={CX} y={CY - 32} textAnchor="middle" className="fill-gray-500" fontSize="13">总任务</text>
      <text x={CX} y={CY - 4} textAnchor="middle" className="fill-gray-900" fontSize="28" fontWeight="700">{total}</text>
    </svg>
  )
}
