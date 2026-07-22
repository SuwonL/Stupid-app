/**
 * 프로젝트 전체 인덱스·구성도 모달.
 * 배포·기능·구성이 바뀌면 이 파일만 수정하면 됨.
 */

const PROJECT_INDEX = [
  { id: 'fridge', name: '냉장고 메뉴', path: '/fridge', desc: '재료 선택 → 메뉴 추천(유튜브·DB 레시피), 상세·자막 보기' },
  { id: 'calendar', name: '자동 달력', path: '/calendar', desc: '일정 추가·수정·삭제, 스타일 선택. 화면 캡처로 저장해 사용' },
  { id: 'stocks', name: '주식 추천', path: '/stocks', desc: '실시간 추천 TOP5(펼치기/접기), 주식현황, 오늘의 주식 지식 하위 메뉴' },
  { id: 'memes', name: '최신 밈', path: '/memes', desc: 'Giphy 실시간 트렌딩 밈 20가지, 클릭 시 관련 인기 영상' },
  { id: 'childbirth-checklist', name: '출산 준비물', path: '/childbirth-checklist', desc: '카테고리별 출산 준비물 체크리스트, 체크 상태·추가 항목을 브라우저에 자동 저장' },
]

const PROJECT_STRUCTURE = {
  frontend: {
    stack: 'React, Vite, react-router-dom',
    entry: 'main.jsx → App.jsx',
    pages: ['FridgePage (냉장고 메뉴)', 'CalendarPage (자동 달력)', 'StockPage/StockRecommendationPage (주식 추천)', 'MemePage (최신 밈)', 'ChildbirthChecklistPage (출산 준비물)'],
    components: ['calendar/CalendarGrid', 'calendar/DatePickerField', 'stocks/RecommendationFilter', 'stocks/RecommendationCard', 'stocks/PerformanceReport', 'stocks/MorningMarketBrief', 'stocks/DailyStockKnowledge', 'ProjectInfoModal'],
    api: 'api.js + services/recommendationService, services/evaluationService, services/stockInfoService (공식 데이터·실측 기술 지표 기반 검증, 가짜 신호 없음)',
  },
  backend: {
    stack: 'Spring Boot, JDK 17, H2',
    entry: 'FridgeMenuApplication',
    web: 'RecipeController (/api/ingredients, /api/recipes/recommend, /api/recipes/{id}/detail), StockController (/api/stocks/*), MemeController (/api/memes/*)',
    services: ['RecipeRecommendService', 'RecipeDetailService', 'YouTubeService', 'YoutubeTranscriptService', 'YoutubeQuotaTracker', 'SpoonacularService', 'StockMarketService', 'MemeService'],
    config: 'RestTemplateConfig(타임아웃), WebConfig(CORS)',
    repository: 'IngredientRepository, RecipeRepository, RecipeIngredientRepository, RecipeStepRepository',
  },
}

export default function ProjectInfoModal({ onClose, version, deployCount, buildTime }) {
  return (
    <div className="modal-backdrop project-info-backdrop" onClick={onClose} role="presentation">
      <div className="modal card project-info-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">×</button>
        <h2 className="project-info-title">프로젝트 인덱스 · 구성도</h2>
        {buildTime && <p className="project-info-build">빌드: {buildTime}</p>}
        {version && <p className="project-info-version">버전: v{version}{deployCount ? ` · 배포 #${deployCount}` : ''}</p>}

        <section className="project-info-section">
          <h3 className="project-info-heading">기능 인덱스</h3>
          <ul className="project-info-index">
            {PROJECT_INDEX.map((item) => (
              <li key={item.id} className="project-info-index-item">
                <strong>{item.name}</strong>
                <span className="project-info-path">{item.path}</span>
                <span className="project-info-desc">{item.desc}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="project-info-section">
          <h3 className="project-info-heading">프로젝트 구성도</h3>
          <div className="project-info-structure">
            <div className="project-info-block">
              <h4>Frontend</h4>
              <p className="project-info-stack">{PROJECT_STRUCTURE.frontend.stack}</p>
              <p><strong>진입:</strong> {PROJECT_STRUCTURE.frontend.entry}</p>
              <p><strong>페이지:</strong> {PROJECT_STRUCTURE.frontend.pages.join(', ')}</p>
              <p><strong>컴포넌트:</strong> {PROJECT_STRUCTURE.frontend.components.join(', ')}</p>
              <p><strong>API:</strong> {PROJECT_STRUCTURE.frontend.api}</p>
            </div>
            <div className="project-info-block">
              <h4>Backend</h4>
              <p className="project-info-stack">{PROJECT_STRUCTURE.backend.stack}</p>
              <p><strong>진입:</strong> {PROJECT_STRUCTURE.backend.entry}</p>
              <p><strong>API:</strong> {PROJECT_STRUCTURE.backend.web}</p>
              <p><strong>서비스:</strong> {PROJECT_STRUCTURE.backend.services.join(', ')}</p>
              <p><strong>리포지토리:</strong> {PROJECT_STRUCTURE.backend.repository}</p>
              {PROJECT_STRUCTURE.backend.config && <p><strong>설정:</strong> {PROJECT_STRUCTURE.backend.config}</p>}
            </div>
          </div>
        </section>

        <p className="project-info-hint">배포·기능·구성 변경 시 이 화면 내용을 업데이트하세요. (frontend/src/components/ProjectInfoModal.jsx)</p>
      </div>
    </div>
  )
}
