import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Folder, CalendarDays, ClipboardList } from 'lucide-react'

/**
 * ProjectOverviewCards —— 项目灵感文件夹卡片（绑定真实 project_ideas 数据）
 *
 * 交互逻辑与「项目灵感」板块一致：
 * - 卡片数量 = 活跃项目数量（1 个项目只显示 1 张卡，新增项目自动增加卡片）
 * - 每行最多 3 张，超出自动换行向下排列
 * - 每张卡的文件夹图标色 = 进度条色，卡片之间互不重复（调色板循环）
 * - 点击卡片进入该项目详情页 /projects/:id
 *
 * 造型：保留文件夹标签形切角（clip-path 动态计算），阴影用外层 drop-shadow。
 */

// 卡片固定高度（宽度自适应）
const CARD_H = 168

// 独立调色板：图标色与进度条色一一对应，卡片之间互不重复
const PALETTE = ['#84CC16', '#A78BFA', '#38BDF8', '#F59E0B', '#F472B6', '#34D399']

// 按实测宽度动态生成文件夹标签形轮廓（四角圆弧 14px，斜切落差 10px）
function folderClipPath(w, h = CARD_H) {
  const R = 14
  const DROP = 10
  const tabEnd = Math.round(w * 0.58)
  const slantEnd = Math.min(tabEnd + 16, w - R - 14)
  return `path('M ${R} 0 L ${tabEnd} 0 L ${slantEnd} ${DROP} L ${w - R} ${DROP} A ${R} ${R} 0 0 1 ${w} ${DROP + R} L ${w} ${h - R} A ${R} ${R} 0 0 1 ${w - R} ${h} L ${R} ${h} A ${R} ${R} 0 0 1 0 ${h - R} L 0 ${R} A ${R} ${R} 0 0 1 ${R} 0 Z')`
}

// 测量容器宽度（供动态 clip-path 与列数计算使用）
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

function FolderCard({ project, color, cardW, onClick }) {
  const steps = project.steps || []
  const tasks = steps.length
  const progress = tasks ? Math.round((steps.filter((s) => s.done).length / tasks) * 100) : 0
  const date = project.deadline || (project.updated_at ? project.updated_at.slice(0, 10) : '')
  const style = { height: CARD_H, clipPath: folderClipPath(cardW) }
  const cls = 'flex w-full flex-col bg-white p-4 pt-3.5'
  const inner = (
    <>
      {/* 1. 顶部文件夹图标（扁平实心，本卡专属色） */}
      <Folder className="h-[18px] w-[22px]" style={{ color }} fill={color} strokeWidth={1.5} />

      {/* 2. 项目名称（黑色，粗体，左对齐） */}
      <h3 className="mt-2.5 truncate text-[16px] font-bold leading-tight text-gray-900">{project.name}</h3>

      {/* 3. 日期（左，日历图标） + 任务数（右，剪贴板图标），同一行 */}
      <div className="mt-2.5 flex items-center justify-between text-xs text-gray-400">
        <span className="inline-flex min-w-0 items-center gap-1">
          <CalendarDays size={13} className="shrink-0" />
          <span className="truncate">{date ? `截止日期: ${date}` : '暂无截止日期'}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <ClipboardList size={13} /> {tasks} 个任务
        </span>
      </div>

      {/* 4. 底部进度条（胶囊形，本卡专属色填充） + 百分比数字（右，黑） */}
      <div className="mt-auto flex items-center gap-3">
        <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-[15px] font-semibold text-gray-900">{progress}</span>
      </div>
    </>
  )
  // 传入 onClick 时用 button（如项目灵感页：点击弹详情卡片）；否则保持 Link 跳详情页（总览）
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls + ' text-left'} style={style}>
        {inner}
      </button>
    )
  }
  return (
    <Link to={`/projects/${project.id}`} className={cls} style={style}>
      {inner}
    </Link>
  )
}

/**
 * 可复用的文件夹卡片网格（总览与「项目灵感」页共用，保证卡片样式统一）。
 * - onItemClick：可选。提供时点击卡片回调（如弹详情卡片），否则卡片为 Link 跳详情页。
 * - renderOverlay(p, i)：可选。渲染卡片上的覆盖层（如状态胶囊菜单、置顶角标）。
 * - getItemStyle(p, i)：可选。为某张卡的外层追加样式（如打开菜单时提升 zIndex）。
 */
export function FolderCardGrid({ projects = [], onItemClick, renderOverlay, getItemStyle }) {
  const { ref, width } = useContainerWidth()
  const gridCols = width === 0 ? 3 : width < 480 ? 1 : width < 780 ? 2 : 3
  const gap = 16
  const cardW = width > 0 ? Math.floor((width - gap * (gridCols - 1)) / gridCols) : 300
  if (!projects.length) return null
  return (
    <div
      ref={ref}
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
    >
      {projects.map((p, i) => (
        <div
          key={p.id}
          className="relative w-full"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))', ...(getItemStyle ? getItemStyle(p, i) : null) }}
        >
          <FolderCard
            project={p}
            color={PALETTE[i % PALETTE.length]}
            cardW={cardW}
            onClick={onItemClick ? () => onItemClick(p) : undefined}
          />
          {renderOverlay && renderOverlay(p, i)}
        </div>
      ))}
    </div>
  )
}

export default function ProjectOverviewCards({ projects = [] }) {
  if (!projects.length) {
    return (
      <div className="card flex h-32 items-center justify-center text-sm text-ink-soft">
        暂无项目，去「项目灵感」新增一个吧
      </div>
    )
  }
  return <FolderCardGrid projects={projects} />
}
