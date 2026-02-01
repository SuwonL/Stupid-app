import { Link } from 'react-router-dom'
import { Beef, Calendar } from 'lucide-react'
import './HomePage.css'

export default function HomePage() {
  return (
    <div className="home-page">
      <header className="home-header">
        <h1>Stupid-app</h1>
        <p className="home-sub">원하는 모듈을 선택하세요.</p>
      </header>
      <nav className="module-cards">
        <Link to="/fridge" className="module-card card">
          <Beef size={32} className="module-card-icon" aria-hidden />
          <h2 className="module-card-title">냉장고 메뉴 추천</h2>
          <p className="module-card-desc">남은 재료로 만들 수 있는 메뉴를 추천해 드려요.</p>
        </Link>
        <Link to="/calendar" className="module-card card">
          <Calendar size={32} className="module-card-icon" aria-hidden />
          <h2 className="module-card-title">자동 달력만들기</h2>
          <p className="module-card-desc">스타일을 고르고 일정을 넣은 뒤 화면을 캡처해서 사용하세요.</p>
        </Link>
      </nav>
    </div>
  )
}
