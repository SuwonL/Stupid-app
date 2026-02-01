import { useState, useEffect } from 'react'
import { Beef, Carrot, UtensilsCrossed } from 'lucide-react'
import { getIngredients, recommendRecipes, getYoutubeRecipeSteps } from './api'
import './App.css'

const THEME_KEY = 'fridge-menu-theme'
const CATEGORY_ORDER = ['고기·계란·통조림', '야채·채소', '양념·밥·면']

const CATEGORY_ICONS = {
  '고기·계란·통조림': Beef,
  '야채·채소': Carrot,
  '양념·밥·면': UtensilsCrossed,
}
function CategoryIcon({ category, size = 14, className = '' }) {
  const Icon = CATEGORY_ICONS[category] || UtensilsCrossed
  return <Icon size={size} className={className} aria-hidden />
}

function groupByCategory(ingredients) {
  const byCat = {}
  ingredients.forEach((i) => {
    const cat = i.category || '기타'
    if (!byCat[cat]) byCat[cat] = []
    byCat[cat].push(i)
  })
  const order = [...CATEGORY_ORDER]
  ingredients.forEach((i) => {
    const c = i.category || '기타'
    if (!order.includes(c)) order.push(c)
  })
  return order.filter((c) => byCat[c]?.length).map((cat) => ({ category: cat, items: byCat[cat] }))
}

function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'light'
    } catch {
      return 'light'
    }
  })
  const [ingredients, setIngredients] = useState([])
  const [ingredientsLoading, setIngredientsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [recommendResult, setRecommendResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [youtubeDialog, setYoutubeDialog] = useState(null)
  const [youtubeSteps, setYoutubeSteps] = useState({ loading: false, error: null, steps: [], title: '' })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {}
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  useEffect(() => {
    setIngredientsLoading(true)
    setError(null)
    getIngredients()
      .then(setIngredients)
      .catch((e) => setError(e.message))
      .finally(() => setIngredientsLoading(false))
  }, [])

  const MAX_INGREDIENTS = 10
  const toggleIngredient = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_INGREDIENTS) next.add(id)
      return next
    })
  }

  const handleRecommend = () => {
    setError(null)
    setRecommendResult(null)
    const selectedIdList = Array.from(selectedIds)
    if (selectedIdList.length === 0) {
      setError('재료를 선택해 주세요.')
      return
    }
    const requestedTagNames = ingredients
      .filter((i) => selectedIdList.includes(i.id))
      .map((i) => i.name)
    setHasSearched(true)
    setLoading(true)
    setRecommendResult(null)
    recommendRecipes({
      ingredientIds: selectedIdList,
    })
      .then((res) => setRecommendResult({
        youtubeRecommendations: res.youtubeRecommendations || [],
        recipeRecommendations: res.recipeRecommendations || [],
        requestedTagNames,
      }))
      .catch((e) => setError(e.message || '메뉴 추천 요청에 실패했습니다.'))
      .finally(() => setLoading(false))
  }

  const handleResetSelection = () => {
    setSelectedIds(new Set())
    setError(null)
  }

  const openYoutubeDialog = (v) => {
    setYoutubeDialog({ videoId: v.videoId, title: v.title || '영상' })
    setYoutubeSteps({ loading: true, error: null, steps: [], title: v.title || '' })
  }
  const closeYoutubeDialog = () => {
    setYoutubeDialog(null)
    setYoutubeSteps({ loading: false, error: null, steps: [], title: '' })
  }

  useEffect(() => {
    if (!youtubeDialog?.videoId) return
    getYoutubeRecipeSteps(youtubeDialog.videoId, youtubeDialog.title)
      .then((res) => setYoutubeSteps({ loading: false, error: null, steps: res.steps || [], title: res.title || youtubeDialog.title }))
      .catch((e) => setYoutubeSteps((prev) => ({ ...prev, loading: false, error: e.message || '자막을 불러오지 못했습니다.', steps: [] })))
  }, [youtubeDialog?.videoId])

  return (
    <div className="app">
      <button
        type="button"
        className="theme-toggle"
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
      <header className="header">
        <h1>냉장고 메뉴</h1>
        <p className="sub">남은 재료로 만들 수 있는 메뉴를 추천해 드려요.</p>
      </header>

      <section className="input-section card">
        <h2 className="section-title">재료 선택 (최대 {MAX_INGREDIENTS}개)</h2>
        {ingredientsLoading && (
          <p className="ingredients-loading"><span className="spinner-inline" /> 재료 목록 불러오는 중…</p>
        )}
        {!ingredientsLoading && ingredients.length === 0 && error && (
          <p className="ingredients-error">재료 목록을 불러오지 못했습니다. 새로고침해 보세요.<br /><small>{error}</small></p>
        )}
        {!ingredientsLoading && ingredients.length === 0 && !error && (
          <p className="ingredients-empty">재료 목록이 없습니다.</p>
        )}
        <div className="ingredient-groups">
          {groupByCategory(ingredients).map(({ category, items }) => (
            <div key={category} className="ingredient-group">
              <span className="ingredient-group-label">
                <CategoryIcon category={category} className="ingredient-group-icon" />
                {category}
              </span>
              <div className="chips">
                {items.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className={`chip ${selectedIds.has(i.id) ? 'selected' : ''}`}
                    onClick={() => toggleIngredient(i.id)}
                  >
                    <CategoryIcon category={i.category} size={12} className="chip-icon" />
                    {i.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="action-buttons">
          <button type="button" className="recommend-btn" onClick={handleRecommend} disabled={loading}>
            {loading ? '추천 중…' : '메뉴 추천'}
          </button>
          <button type="button" className="reset-btn" onClick={handleResetSelection} disabled={loading}>
            선택 초기화
          </button>
        </div>
      </section>

      {error && <div className="error-msg">{error}</div>}

      <section className="result-section">
        <h2 className="section-title">추천 메뉴</h2>
        {hasSearched && !loading && !error && recommendResult && recommendResult.youtubeRecommendations.length === 0 && (
          <p className="empty">추천 결과가 없습니다. 다른 재료를 선택해 보세요.</p>
        )}
        {!hasSearched && !loading && !error && (
          <p className="empty">재료를 선택한 뒤 메뉴 추천을 눌러 주세요.</p>
        )}

        {recommendResult?.youtubeRecommendations?.length > 0 && (() => {
          const requestedTagNames = recommendResult.requestedTagNames || []
          return (
            <div className="recommend-group">
              <div className="recipe-grid">
                {recommendResult.youtubeRecommendations.map((v) => (
                  <article
                    key={v.videoId}
                    role="button"
                    tabIndex={0}
                    className="recipe-card card youtube-card"
                    onClick={() => openYoutubeDialog(v)}
                    onKeyDown={(e) => e.key === 'Enter' && openYoutubeDialog(v)}
                  >
                    <div className="card-image-placeholder">
                      <img src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`} alt="" />
                    </div>
                    <div className="card-body">
                      <h3 className="card-title">{v.title || '영상 보기'}</h3>
                      {requestedTagNames.length > 0 && (
                        <p className="card-tags">검색: {requestedTagNames.join(' · ')}</p>
                      )}
                      <p className="card-hint">클릭하면 영상 + 자막 레시피 보기</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )
        })()}
      </section>

      {youtubeDialog && (
        <div className="modal-backdrop" onClick={closeYoutubeDialog} role="presentation">
          <div className="modal card youtube-recipe-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={closeYoutubeDialog} aria-label="닫기">×</button>
            <h2 className="modal-title">{youtubeDialog.title}</h2>
            <div className="youtube-wrap">
              <iframe
                title={youtubeDialog.title}
                src={`https://www.youtube.com/embed/${youtubeDialog.videoId}`}
                className="youtube-embed"
                allowFullScreen
              />
            </div>
            <div className="detail-block youtube-steps-block">
              <h3>요리 레시피</h3>
              {youtubeSteps.loading && (
                <div className="youtube-steps-loading"><span className="spinner-inline" /> 자막 불러오는 중…</div>
              )}
              {!youtubeSteps.loading && youtubeSteps.error && (
                <p className="youtube-steps-error">{youtubeSteps.error}</p>
              )}
              {!youtubeSteps.loading && !youtubeSteps.error && youtubeSteps.steps.length === 0 && (
                <p className="youtube-steps-empty">이 영상에는 자막이 없거나 추출할 수 없습니다.</p>
              )}
              {!youtubeSteps.loading && !youtubeSteps.error && youtubeSteps.steps.length > 0 && (
                <ol className="steps-list">
                  {youtubeSteps.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
