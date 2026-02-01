/**
 * 프로젝트 전체 인덱스·구성도 모달.
 * 기능·구성이 바뀌면 이 파일만 수정하면 됨.
 */

const PROJECT_INDEX = [
  { id: 'fridge', name: '냉장고 메뉴', path: '/fridge', desc: '재료 선택 → 메뉴 추천(유튜브·DB 레시피), 상세·자막 보기' },
  { id: 'calendar', name: '자동 달력', path: '/calendar', desc: '일정 추가·수정, 스타일 선택, 9:16 이미지 다운로드(우클릭 저장)' },
]

const PROJECT_STRUCTURE = {
  frontend: {
    stack: 'React, Vite, react-router-dom',
    entry: 'main.jsx → App.jsx',
    pages: ['FridgePage (냉장고 메뉴)', 'CalendarPage (자동 달력)'],
    components: ['calendar/CalendarGrid', 'calendar/DatePickerField', 'calendar/holidays'],
    api: 'api.js (getIngredients, recommendRecipes, getYoutubeRecipeSteps, getRecipeDetail)',
  },
  backend: {
    stack: 'Spring Boot, JDK 17, H2',
    entry: 'FridgeMenuApplication',
    web: 'RecipeController (/api/ingredients, /api/recipes/recommend, /api/recipes/{id}/detail, /api/youtube/{videoId}/recipe-steps)',
    services: ['RecipeRecommendService', 'RecipeDetailService', 'YouTubeService', 'YoutubeTranscriptService', 'SpoonacularService'],
    repository: 'IngredientRepository, RecipeRepository, RecipeIngredientRepository, RecipeStepRepository',
  },
}

export default function ProjectInfoModal({ onClose, version, buildTime }) {
  return (
    <div className="modal-backdrop project-info-backdrop" onClick={onClose} role="presentation">
      <div className="modal card project-info-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">×</button>
        <h2 className="project-info-title">프로젝트 인덱스 · 구성도</h2>
        {buildTime && <p className="project-info-build">빌드: {buildTime}</p>}
        {version && <p className="project-info-version">버전: v{version}</p>}

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
            </div>
          </div>
        </section>

        <p className="project-info-hint">기능·구성 변경 시 이 화면 내용을 업데이트하세요. (frontend/src/components/ProjectInfoModal.jsx)</p>
      </div>
    </div>
  )
}
