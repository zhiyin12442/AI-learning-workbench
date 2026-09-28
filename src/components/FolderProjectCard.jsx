import React, { useState } from 'react';
import { Folder, CalendarDays, ListChecks } from 'lucide-react';

/**
 * FolderProjectCard —— 「文件夹样式」项目卡片（高度复刻设计稿）
 *
 * 视觉要点：
 *  - 右上角用 clip-path 切出 40px 缺角（文件夹折角效果）
 *  - 因为 box-shadow 会被 clip-path 裁掉，所以阴影改用外层容器的
 *    filter: drop-shadow(...) 实现，这样阴影会贴合缺角形状
 *  - 悬停：整体上浮 -4px + 阴影加深
 *
 * Props：
 *  - title:        项目标题
 *  - color:        主题色（默认亮绿 #84CC16，同时驱动文件夹图标与进度条）
 *  - deadline:     截止日期字符串（如 "2026-10-15"）
 *  - tasksCount:   任务数量
 *  - progress:     进度数值 0–100（显示在进度条右下角）
 *  - showAvatars:  是否显示头像排（默认 false）
 *  - avatars:      头像 URL 数组（最多显示 4 个，重叠 + 白边）
 *  - onClick:     整卡点击回调（可选）
 */
export default function FolderProjectCard({
  title,
  color = '#84CC16',
  deadline,
  tasksCount = 0,
  progress = 0,
  showAvatars = false,
  avatars = [],
  onClick,
}) {
  const [hover, setHover] = useState(false);
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="cursor-pointer rounded-2xl"
      style={{
        transform: hover ? 'translateY(-4px)' : 'none',
        filter: hover
          ? 'drop-shadow(0 10px 22px rgba(0,0,0,0.12))'
          : 'drop-shadow(0 2px 8px rgba(0,0,0,0.05))',
        transition: 'transform 200ms ease, filter 200ms ease',
      }}
    >
      {/* 内层卡片：白底 + 切角。clip-path 必须放在这里，外层负责阴影 */}
      <div
        className="relative overflow-hidden bg-white p-5"
        style={{
          clipPath:
            'polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 0 100%)',
        }}
      >
        {/* 3. 左上角亮绿色实心文件夹图标 */}
        <Folder
          className="h-8 w-8"
          style={{ color }}
          fill={color}
          strokeWidth={1.5}
        />

        {/* 4. 标题：黑色粗体大字 */}
        <h3 className="mt-3 text-xl font-bold text-gray-900">{title}</h3>

        {/* 5. 头像区域（可选渲染） */}
        {showAvatars && (
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
        )}

        {/* 6. 底部元数据：两端对齐 */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {deadline ?? '—'}
          </span>
          <span className="flex items-center gap-1">
            <ListChecks className="h-3.5 w-3.5" />
            {tasksCount} 个任务
          </span>
        </div>

        {/* 7. 进度条 + 右下角进度数值 */}
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-1.5 rounded-full"
              style={{ width: `${clamped}%`, backgroundColor: color }}
            />
          </div>
          <div className="mt-1 text-right text-xs font-semibold text-gray-500">
            {clamped}%
          </div>
        </div>
      </div>
    </div>
  );
}
