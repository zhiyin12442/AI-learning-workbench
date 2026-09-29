import React from 'react'
import { Folder, CalendarDays, ListChecks } from 'lucide-react'

/**
 * ProjectOverviewCards —— 参考截图 1:1 复刻的三张横向项目卡片
 *
 * 严格按参考图实现（不重新设计）：
 *  - 画布 1015 × 249 px，背景 #F7F7F7，3 卡等距横排
 *  - 白底、圆角 15px、极浅灰阴影、无描边、现代 SaaS Dashboard 风格
 *  - 每张卡结构完全一致，仅 文字 / 颜色 / 头像 / 进度数据 不同
 *  - 内部顺序（从上到下）：文件夹图标 → 项目名 → 头像 → Deadline+Tasks → 进度条+百分比
 *
 * 配色沿用应用主题：绿 #84CC16 / 紫 #A78BFA / 浅蓝 #38BDF8
 * 注意：参考图中「进度条填充」(progress) 与「右侧百分比数字」(percent) 数值不同，
 *       二者分别传入，按参考图原样显示，不做二次计算。
 */

// 参考图默认样例数据（与截图逐字一致）
const SAMPLE_PROJECTS = [
  {
    title: 'SamCart Web Design',
    color: '#84CC16',
    deadline: '10 Dec, 2025',
    tasks: 24,
    progress: 68,
    percent: 80,
    avatars: [
      'https://i.pravatar.cc/64?img=11',
      'https://i.pravatar.cc/64?img=12',
      'https://i.pravatar.cc/64?img=13',
    ],
  },
  {
    title: 'InstaSupply App Design',
    color: '#A78BFA',
    deadline: '25 Dec, 2025',
    tasks: 18,
    progress: 53,
    percent: 60,
    avatars: [
      'https://i.pravatar.cc/64?img=21',
      'https://i.pravatar.cc/64?img=22',
      'https://i.pravatar.cc/64?img=23',
    ],
  },
  {
    title: 'Kuppl Dashboard Design',
    color: '#38BDF8',
    deadline: '16 Jan, 2026',
    tasks: 28,
    progress: 32,
    percent: 20,
    avatars: [
      'https://i.pravatar.cc/64?img=31',
      'https://i.pravatar.cc/64?img=32',
      'https://i.pravatar.cc/64?img=33',
    ],
  },
]

function ProjectOverviewCard({ title, color, deadline, tasks, progress, percent, avatars = [] }) {
  return (
    <div className="flex h-full flex-col rounded-[15px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* 1. 顶部文件夹图标（约 24×20px，扁平实心，主题色） */}
      <Folder className="h-5 w-6" style={{ color }} fill={color} strokeWidth={1.5} />

      {/* 2. 项目名称（距图标 12px，左对齐，黑，600，22px） */}
      <h3 className="mt-3 text-[22px] font-semibold leading-tight text-gray-900">{title}</h3>

      {/* 3. 头像（重叠圆形，白边；结构占位，数据可换） */}
      <div className="mt-3 flex -space-x-2">
        {avatars.slice(0, 4).map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="h-8 w-8 rounded-full border-2 border-white object-cover"
          />
        ))}
      </div>

      {/* 4+5. Deadline（左，日历图标） + Tasks（右，同级垂直位置，clipboard 图标） */}
      <div className="mt-4 flex items-center justify-between text-[13px] text-gray-400">
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={14} /> Deadline: {deadline}
        </span>
        <span className="inline-flex items-center gap-1">
          <ListChecks size={14} /> {tasks} tasks
        </span>
      </div>

      {/* 6+7. 底部进度条（约 245×7px，胶囊形，浅灰底+主题色填充）+ 百分比（右，黑，16px） */}
      <div className="mt-auto flex items-center gap-3 pt-5">
        <div className="h-[7px] w-[245px] overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: color }} />
        </div>
        <span className="text-[16px] font-semibold text-gray-900">{percent}</span>
      </div>
    </div>
  )
}

export default function ProjectOverviewCards({ projects = SAMPLE_PROJECTS }) {
  return (
    <div className="flex h-[249px] w-[1015px] gap-5 bg-[#F7F7F7] px-[15px]">
      {projects.map((p, i) => (
        <ProjectOverviewCard key={i} {...p} />
      ))}
    </div>
  )
}
