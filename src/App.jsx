import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar, { MobileTabBar } from './components/Sidebar'
import { Toast } from './components/ui'
import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Concepts from './pages/Concepts'
import StudyLog from './pages/StudyLog'
import Resources from './pages/Resources'
import ProjectIdeas from './pages/ProjectIdeas'
import ProjectIdeaDetail from './pages/ProjectIdeaDetail'
import Reviews, { ReviewEditor } from './pages/Reviews'

function Shell() {
  const [mobileNav, setMobileNav] = useState(false)
  return (
    <div className="app-bg min-h-screen flex justify-center p-0 md:p-5 pb-20 lg:pb-5">
      <div className="app-container w-full max-w-[1400px] bg-workspace-bg rounded-app shadow-app flex overflow-hidden h-auto xl:h-[860px] md:min-h-[calc(100vh-2.5rem)]">
        <Sidebar />
        {/* 平板窄屏抽屉导航 */}
        {mobileNav && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileNav(false)} />
            <div className="relative bg-workspace-bg h-full shadow-app overflow-y-auto">
              <Sidebar mobile onNavigate={() => setMobileNav(false)} />
            </div>
          </div>
        )}
        <main className="flex-1 p-5 md:p-6 md:pl-8 md:pr-8 overflow-y-auto">
          {/* 小屏顶部汉堡 */}
          <button
            onClick={() => setMobileNav(true)}
            className="lg:hidden mb-4 bg-white shadow-card rounded-[10px] px-4 py-2.5 text-sm text-gray-600 min-h-[44px]"
          >☰ 菜单</button>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/concepts" element={<Concepts />} />
            <Route path="/studylog" element={<StudyLog />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/projects" element={<ProjectIdeas />} />
            <Route path="/projects/:id" element={<ProjectIdeaDetail />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/reviews/new" element={<ReviewEditor />} />
            <Route path="/reviews/:id/edit" element={<ReviewEditor />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <MobileTabBar />
      <Toast msg={toast} />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<Shell />} />
    </Routes>
  )
}
