import React, { useEffect, useRef, useState } from 'react'
import { Folder, CalendarDays, ClipboardList } from 'lucide-react'

/**
 * ProjectOverviewCards —— 项目概览三张横向文件夹卡片（自适应流式布局）
 *
 * 造型：保留文件夹标签形切角——顶部左侧为高出一段的标签区（放文件夹图标），
 * 在约 58% 宽度处斜切下 10px，右侧卡体顶边略低；四角圆角 14px。
 * 卡片宽度随容器自适应（grid 三等分），clip-path 的 path() 坐标按实测宽度动态计算；
 * 因 clip-path 会裁掉 box-shadow，阴影用外层 filter: drop-shadow 贴合形状。
 *
 * 内部顺序：文件夹图标 → 项目名 → 截止日期(左) + 任务数(右) → 进度条 + 百分比。
 * 已按需求：全中文文案、无头像、无 hover 动效（与全站静态阴影规范一致）。
 */

// 卡片固定高度（宽度自适应）
const CARD_H = 168

// 参考图默认样例数据（中文文案，无头像）
const SAMPLE_PROJECTS = [
  { title: 'SamCart 网页设计', color: '#84CC16', deadline: '2025年12月10日', tasks: 24, progress: 68, percent: 80 },
  { title: 'InstaSupply 应用设计', color: '#A78BFA', deadline: '2025年12月25日', tasks: 18, progress: 53, percent: 60 },
  { title: 'Kuppl 仪表盘设计', color: '#38BDF8', deadline: '2026年1月16日', tasks: 28, progress: 32, percent: 20 },
]

// 按实测宽度动态生成文件夹标签形轮廓（四角圆弧 14px，斜切落差 10px）
function folderClipPath(w, h = CARD_H) {
  const R = 14
  const DROP = 10
  const tabEnd = Math.round(w * 0.58)
  const slantEnd = Math.min(tabEnd + 16, w - R - 14)
  return `path('M ${R} 0 L ${tabEnd} 0 L ${slantEnd} ${DROP} L ${w - R} ${DROP} A ${R} ${R} 0 0 1 ${w} ${DROP + R} L ${w} ${h - R} A ${R} ${R} 0 0 1 ${w - R} ${h} L ${R} ${h} A ${R} ${R} 0 0 1 0 ${h - R} L 0 ${R} A ${R} ${R} 0 0 1 ${R} 0 Z')`
}

// 测量容器宽度（供动态 clip-path 使用）
function useContainerWidth() {
  const ref = useRef(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth || 0))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width: w }
}

function ProjectOverviewCard({ title, color, deadline, tasks, progress, percent, cardW }) {
  return (
    <div
      className="flex w-full flex-col bg-white p-4 pt-3.5"
      style={{ height: CARD_H, clipPath: folderClipPath(cardW) }}
    >
      {/* 1. 顶部文件夹图标（扁平实心，主题色） */}
      <Folder className="h-[18px] w-[22px]" style={{ color }} fill={color} strokeWidth={1.5} />

      {/* 2. 项目名称（黑色，粗体，左对齐） */}
      <h3 className="mt-2.5 truncate text-[16px] font-bold leading-tight text-gray-900">{title}</h3>

      {/* 3. 截止日期（左，日历图标） + 任务数（右，剪贴板图标），同一行 */}
      <div className="mt-2.5 flex items-center justify-between text-xs text-gray-400">
        <span className="inline-flex min-w-0 items-center gap-1">
          <CalendarDays size={13} className="shrink-0" />
          <span className="truncate">截止日期: {deadline}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <ClipboardList size={13} /> {tasks} 个任务
        </span>
      </div>

      {/* 4. 底部进度条（胶囊形，浅灰底+主题色填充） + 百分比数字（右，黑） */}
      <div className="mt-auto flex items-center gap-3">
        <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-[15px] font-semibold text-gray-900">{percent}</span>
      </div>
    </div>
  )
}

export default function ProjectOverviewCards({ projects = SAMPLE_PROJECTS }) {
  const { ref, width } = useContainerWidth()
  // 三等分：cardW = (容器宽 - 两个间距) / 3，间距 16px
  const cardW = width > 0 ? Math.floor((width - 32) / 3) : 300
  return (
    <div ref={ref} className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-4">
      {projects.slice(0, 3).map((p, i) => (
        <div key={i} className="w-full" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))' }}>
          <ProjectOverviewCard {...p} cardW={cardW} />
        </div>
      ))}
    </div>
  )
}
