import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
  LayoutGrid, Bell, BookOpen, NotebookPen, FolderKanban, Lightbulb,
  History, ArrowUpRight, Cloud, CloudOff, KeyRound, X,
} from 'lucide-react'
import { useData } from '../lib/store'
import { isSupabaseConfigured } from '../lib/supabase'

const itemCls = ({ isActive }) =>
  'flex items-center gap-2 px-2 py-2 rounded-[10px] text-sm text-gray-600 hover:bg-white/50 transition-all duration-200 min-h-[44px] ' +
  'lg:gap-3 lg:px-3 lg:py-2.5 ' +
  (isActive ? ' bg-white shadow-nav-active text-gray-900 font-semibold' : '')

function SyncCard() {
  const { wsId, cloudReady, changeWorkspace, resetWorkspace, readOnly, setReadOnlyMode, canDelete } = useData()
  const [open, setOpen] = useState(false)
  const [joinVal, setJoinVal] = useState('')
  const [joinErr, setJoinErr] = useState('')
  const isShared = wsId === (import.meta.env.VITE_WORKSPACE_ID || 'nexdo-shared-0001')

  const statusText = !isSupabaseConfigured
    ? '本地模式（未配置云端）'
    : cloudReady ? '云端已同步' : '连接中…'
  const StatusIcon = !isSupabaseConfigured || !cloudReady ? CloudOff : Cloud
  const dotCls = !isSupabaseConfigured ? 'bg-gray-300' : cloudReady ? 'bg-success' : 'bg-warning'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full flex items-center gap-2.5 bg-white rounded-card shadow-card-shadow p-3 text-left"
      >
        <span className={'w-2.5 h-2.5 rounded-full ' + dotCls} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">云同步</p>
          <p className="text-xs text-gray-400 truncate flex items-center gap-1">
            <StatusIcon size={12} /> {statusText}
          </p>
        </div>
        <KeyRound size={15} className="text-gray-400" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="card w-full max-w-md p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">云同步</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 min-h-[44px] px-2">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2.5 mb-3">
              <span className={'w-2.5 h-2.5 rounded-full ' + dotCls} />
              <p className="text-sm font-medium text-gray-800">
                {isSupabaseConfigured ? (cloudReady ? '已开启，多端自动同步' : '正在连接云端…') : '本地模式（数据仅存本机）'}
              </p>
            </div>

            <p className="text-sm text-ink-soft mb-1">当前工作区</p>
            <code className="block bg-gray-50 border border-line rounded-[10px] px-3 py-2.5 text-xs break-all text-gray-700 mb-4">
              {wsId}{isShared && ' （共享默认）'}
            </code>

            <p className="text-xs text-ink-faint mb-3">
              所有设备默认使用同一个共享工作区，打开即自动共用同一份数据，无需手动交换同步码。
              只有在你想隔离出一份独立数据时，才需要切换到自定义工作区。
            </p>

            <details className="mb-2">
              <summary className="cursor-pointer text-sm text-primary select-none">高级：切换 / 重置工作区</summary>
              <div className="mt-3">
                <input
                  value={joinVal}
                  onChange={(e) => { setJoinVal(e.target.value); setJoinErr('') }}
                  placeholder="输入自定义工作区 ID"
                  className="w-full mb-2"
                />
                {joinErr && <p className="text-xs text-danger mb-2">{joinErr}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const v = joinVal.trim()
                      if (v.length < 4) { setJoinErr('工作区 ID 至少 4 个字符'); return }
                      changeWorkspace(v)
                      setOpen(false)
                      setJoinVal('')
                    }}
                    className="btn-primary flex-1 min-h-[44px]"
                  >
                    切换到此工作区
                  </button>
                  {!isShared && (
                    <button
                      onClick={() => { resetWorkspace(); setOpen(false) }}
                      className="flex-1 min-h-[44px] rounded-[10px] border border-line bg-white text-sm text-gray-600 hover:bg-gray-50"
                    >
                      重置为共享
                    </button>
                  )}
                </div>
              </div>
            </details>

            {!isSupabaseConfigured && (
              <p className="text-xs text-ink-faint mt-3">
                尚未配置 Supabase，当前为本地模式。在 .env 填入 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 后重新部署即可启用云端同步。
              </p>
            )}

            {/* 删除权限：只读模式开启后，所有模块的删除入口都会被隐藏 */}
            <label className="flex items-center justify-between gap-3 mt-4 p-3 rounded-[10px] bg-gray-50 cursor-pointer select-none">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">只读模式</p>
                <p className="text-xs text-ink-faint">开启后禁止删除任何内容（防误删）</p>
              </div>
              <input
                type="checkbox"
                checked={readOnly}
                onChange={(e) => setReadOnlyMode(e.target.checked)}
                className="w-5 h-5 accent-danger cursor-pointer shrink-0"
                aria-label="只读模式（禁止删除）"
              />
            </label>
            {!canDelete && (
              <p className="text-xs text-danger mt-2">当前为只读模式，删除功能已禁用。</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function Sidebar({ mobile = false, onNavigate }) {
  return (
    <aside className={(mobile ? 'w-full ' : 'w-[240px] md:w-[190px] lg:w-[240px] hidden md:flex ') + 'shrink-0 p-4 lg:p-6 lg:pr-4 flex-col overflow-y-auto'}>
      <Link to="/" className="flex items-center gap-2.5 mb-8" onClick={onNavigate}>
        <span className="w-9 h-9 rounded-[10px] bg-accent flex items-center justify-center">
          <ArrowUpRight size={18} className="text-white" strokeWidth={2.5} />
        </span>
        <span className="text-xl font-bold tracking-tight text-gray-900">Nexdo</span>
      </Link>

      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 px-1">概览</p>
      <nav className="flex flex-col gap-1 mb-6">
        <NavLink to="/" end className={itemCls} onClick={onNavigate}>
          <LayoutGrid size={17} /> 总览
        </NavLink>
      </nav>

      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 px-1">工具</p>
      <nav className="flex flex-col gap-1">
        <div className={itemCls({ isActive: false })}>
          <Bell size={17} /> 通知
          <span className="ml-auto w-5 h-5 rounded-full bg-danger text-white text-[11px] flex items-center justify-center">5</span>
        </div>
        <NavLink to="/concepts" className={itemCls} onClick={onNavigate}><BookOpen size={17} /> 概念学习</NavLink>
        <NavLink to="/studylog" className={itemCls} onClick={onNavigate}><NotebookPen size={17} /> 学习记录</NavLink>
        <NavLink to="/resources" className={itemCls} onClick={onNavigate}><FolderKanban size={17} /> 项目搜集</NavLink>
        <NavLink to="/projects" className={itemCls} onClick={onNavigate}><Lightbulb size={17} /> 项目灵感</NavLink>
        <NavLink to="/reviews" className={itemCls} onClick={onNavigate}><History size={17} /> 经验复盘</NavLink>
      </nav>

      <div className="mt-auto pt-8 flex flex-col gap-1">
        <SyncCard />
      </div>
    </aside>
  )
}

// 平板/手机底部 Tab 栏
export function MobileTabBar() {
  const tabs = [
    { to: '/', icon: LayoutGrid, label: '总览' },
    { to: '/concepts', icon: BookOpen, label: '概念' },
    { to: '/studylog', icon: NotebookPen, label: '记录' },
    { to: '/projects', icon: Lightbulb, label: '灵感' },
    { to: '/reviews', icon: History, label: '复盘' },
  ]
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-100 flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to} to={to} end={to === '/'}
          className={({ isActive }) =>
            'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-[10px] text-[11px] min-h-[44px] justify-center ' +
            (isActive ? 'text-primary font-semibold' : 'text-gray-500')}
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
