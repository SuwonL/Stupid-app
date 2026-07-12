import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import './App.css'
import FridgePage from './pages/FridgePage'
import CalendarPage from './pages/CalendarPage'
import StockPage from './pages/StockPage'
import ProjectInfoModal from './components/ProjectInfoModal'

const THEME_KEY = 'fridge-menu-theme'

function formatBuildTime(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${day} ${h}:${min}`
  } catch {
    return ''
  }
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {}
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  const [showProjectInfo, setShowProjectInfo] = useState(false)
  const buildTime = typeof __APP_BUILD_TIME__ !== 'undefined' ? formatBuildTime(__APP_BUILD_TIME__) : ''
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.1'
  const deployCount = typeof __APP_DEPLOY_COUNT__ !== 'undefined' ? __APP_DEPLOY_COUNT__ : ''

  return (
    <div className="app-layout">
      <nav className="app-nav" aria-label="메인 메뉴">
        <div className="app-nav-links">
          <NavLink to="/stocks" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`} end>
            주식 추천
          </NavLink>
          <NavLink to="/fridge" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`} end>
            냉장고 메뉴
          </NavLink>
          <NavLink to="/calendar" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`} end>
            자동 달력
          </NavLink>
        </div>
        <div className="app-nav-right">
          <span className="app-nav-meta" title={`빌드: ${buildTime}`}>
            {buildTime && <span className="app-nav-build">{buildTime}</span>}
            <button
              type="button"
              className="app-nav-version-btn"
              onClick={() => setShowProjectInfo(true)}
              title="프로젝트 인덱스·구성도"
            >
              v{version}{deployCount ? ` (#${deployCount})` : ''}
            </button>
          </span>
          <button
            type="button"
            className="app-nav-theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? '다크 모드' : '라이트 모드'}
            aria-label={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
          >
            {theme === 'light' ? (
              <span className="theme-icon" aria-hidden>🌙</span>
            ) : (
              <span className="theme-icon" aria-hidden>☀️</span>
            )}
          </button>
        </div>
      </nav>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/stocks" replace />} />
          <Route path="/fridge" element={<FridgePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/stocks" element={<StockPage />} />
        </Routes>
      </main>

      {showProjectInfo && (
        <ProjectInfoModal
          onClose={() => setShowProjectInfo(false)}
          version={version}
          deployCount={deployCount}
          buildTime={buildTime}
        />
      )}
    </div>
  )
}
