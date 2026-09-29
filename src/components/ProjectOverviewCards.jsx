import React from 'react'
import { Folder, CalendarDays, ClipboardList } from 'lucide-react'

/**
 * ProjectOverviewCards —— 参考截图 1:1 复刻的三张横向项目卡片
 *
 * 卡片造型（核心）：文件夹标签形——顶部左侧为高出一段的标签区（放文件夹图标），
 * 在约 58% 宽度处斜切下 10px，右侧卡体顶边略低；四角圆角 14px。
 * 因 clip-path 会裁掉 box-shadow，阴影用外层 filter: drop-shadow 贴合形状。
 *
 * 内部顺序（从上到下）：文件夹图标(24×20 主题色) → 项目名(21px/700/黑) →
 * 重叠头像(5 个,28px 白边) → Deadline(左,日历图标) + Tasks(右,剪贴板图标) 同级 →
 * 进度条(胶囊,浅灰底+主题色填充,填充用 progress) + 百分比数字(右,黑,用 percent)。
 * progress 与 percent 数值不同，分别传入，不做二次计算（按参考图原样显示）。
 *
 * 卡片固定 315×192，无 hover 动效（与全站静态阴影规范一致）。
 */

// 卡片几何参数
const CARD_W = 315
const CARD_H = 192

// 文件夹标签形轮廓：左上标签区(y=0) → 斜切(182→200, 落差10px) → 右侧卡体顶边(y=10)，四角圆弧 14px
// 卡片尺寸固定，路径按常量预计算为静态字符串（避免模板拼接出错）
const FOLDER_CLIP =
  "path('M 14 0 L 182 0 L 200 10 L 301 10 A 14 14 0 0 1 315 24 L 315 178 A 14 14 0 0 1 301 192 L 14 192 A 14 14 0 0 1 0 178 L 0 14 A 14 14 0 0 1 14 0 Z')"

// 参考图默认样例数据（与截图逐字一致，含 5 个重叠头像）
const SAMPLE_PROJECTS = [
  {
    title: 'SamCart Web Design',
    color: '#84CC16',
    deadline: '10 Dec, 2025',
    tasks: 24,
    progress: 68,
    percent: 80,
    avatars: [11, 12, 13, 14, 15].map((n) => `https://i.pravatar.cc/64?img=${n}`),
  },
  {
    title: 'InstaSupply App Design',
    color: '#A78BFA',
    deadline: '25 Dec, 2025',
    tasks: 18,
    progress: 53,
    percent: 60,
    avatars: [21, 22, 23, 24, 25].map((n) => `https://i.pravatar.cc/64?img=${n}`),
  },
  {
    title: 'Kuppl Dashboard Design',
    color: '#38BDF8',
    deadline: '16 Jan, 2026',
    tasks: 28,
    progress: 32,
    percent: 20,
    avatars: [31, 32, 33, 34, 35].map((n) => `https://i.pravatar.cc/64?img=${n}`),
  },
]

function ProjectOverviewCard({ title, color, deadline, tasks, progress, percent, avatars = [] }) {
  return (
    <div
      className="flex w-[315px] flex-col bg-white p-5 pt-4"
      style={{ height: CARD_H, clipPath: FOLDER_CLIP }}
    >
      {/* 1. 顶部文件夹图标（约 24×20，扁平实心，主题色） */}
      <Folder className="h-5 w-6" style={{ color }} fill={color} strokeWidth={1.5} />

      {/* 2. 项目名称（黑色，粗体，左对齐） */}
      <h3 className="mt-3 text-[21px] font-bold leading-tight text-gray-900">{title}</h3>

      {/* 3. 重叠头像（5 个，白边圆形） */}
      <div className="mt-3 flex -space-x-2">
        {avatars.slice(0, 5).map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="h-7 w-7 rounded-full border-2 border-white object-cover"
          />
        ))}
      </div>

      {/* 4+5. Deadline（左，日历图标） + Tasks（右，剪贴板图标），同一行 */}
      <div className="mt-3 flex items-center justify-between text-[13px] text-gray-400">
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={14} /> Deadline: {deadline}
        </span>
        <span className="inline-flex items-center gap-1">
          <ClipboardList size={14} /> {tasks} tasks
        </span>
      </div>

      {/* 6+7. 底部进度条（胶囊形，浅灰底+主题色填充） + 百分比数字（右，黑） */}
      <div className="mt-auto flex items-center gap-4">
        <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-[16px] font-semibold text-gray-900">{percent}</span>
      </div>
    </div>
  )
}

export default function ProjectOverviewCards({ projects = SAMPLE_PROJECTS }) {
  return (
    <div className="flex gap-6 px-[15px]">
      {projects.slice(0, 3).map((p, i) => (
        <div key={i} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.05))' }}>
          <ProjectOverviewCard {...p} />
        </div>
      ))}
    </div>
  )
}
