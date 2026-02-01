import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import './App.css'
import FridgePage from './pages/FridgePage'
import CalendarPage from './pages/CalendarPage'

export default function App() {
  return (
    <div className="app-layout">
      <nav className="app-nav" aria-label="메인 메뉴">
        <NavLink to="/fridge" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`} end>
          냉장고 메뉴
        </NavLink>
        <NavLink to="/calendar" className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`} end>
          자동 달력
        </NavLink>
      </nav>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/fridge" replace />} />
          <Route path="/fridge" element={<FridgePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Routes>
      </main>
    </div>
  )
}
