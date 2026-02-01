import { useState, useEffect, useRef } from 'react'
import { Beef, Carrot, UtensilsCrossed, LayoutList, LayoutGrid } from 'lucide-react'
import { getIngredients, recommendRecipes, getYoutubeRecipeSteps, getRecipeDetail } from '../api'

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

export default function FridgePage() {
  const [ingredients, setIngredients] = useState([])
  const [ingredientsLoading, setIngredientsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [recommendResult, setRecommendResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [youtubeDialog, setYoutubeDialog] = useState(null)
  const [youtubeSteps, setYoutubeSteps] = useState({ loading: false, error: null, steps: [], title: '' })
  const [recipeDetail, setRecipeDetail] = useState(null)
  const [searchMode, setSearchMode] = useState('diverse')
  const [resultViewMode, setResultViewMode] = useState('grid3')
  const ingredientsAbortRef = useRef(null)

  const loadIngredients = () => {
    ingredientsAbortRef.current?.abort()
    const controller = new AbortController()
    ingredientsAbortRef.current = controller
    setIngredientsLoading(true)
    setError(null)
    getIngredients(controller.signal)
      .then(setIngredients)
      .catch((e) => setError(e.message))
      .finally(() => {
        ingredientsAbortRef.current = null
        setIngredientsLoading(false)
      })
  }

  useEffect(() => {
    loadIngredients()
    return () => ingredientsAbortRef.current?.abort()
  }, [])

  useEffect(() => {
    if (!ingredientsLoading) return
    const t = setTimeout(() => {
      if (ingredientsAbortRef.current) {
        ingredientsAbortRef.current.abort()
        ingredientsAbortRef.current = null
      }
      setError((prev) => (prev ? prev : '재료 목록 요청 시간이 초과되었습니다. 다시 시도해 주세요.'))
      setIngredientsLoading(false)
    }, 15000)
    return () => clearTimeout(t)
  }, [ingredientsLoading])

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
      strictOnly: searchMode === 'only',
    })
      .then((res) => {
        setRecommendResult({
          youtubeRecommendations: res.youtubeRecommendations || [],
          youtubeErrorReason: res.youtubeErrorReason || null,
          recipeRecommendations: res.recipeRecommendations || [],
          requestedTagNames,
          strictOnly: searchMode === 'only',
        })
      })
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

  const openRecipeDetail = (r) => setRecipeDetail({ loading: true, error: null, data: { id: r.id, name: r.name } })
  const closeRecipeDetail = () => setRecipeDetail(null)

  useEffect(() => {
    if (!recipeDetail?.loading || !recipeDetail?.data?.id) return
    const id = recipeDetail.data.id
    getRecipeDetail(id)
      .then((d) => setRecipeDetail({ loading: false, error: null, data: d }))
      .catch((e) => setRecipeDetail((prev) => ({ ...prev, loading: false, error: e.message || '상세를 불러오지 못했습니다.' })))
  }, [recipeDetail?.loading, recipeDetail?.data?.id])

  return (
    <div className="app">
      <header className="header">
        <h1>냉장고 메뉴</h1>
        <p className="sub">남은 재료로 만들 수 있는 메뉴를 추천해 드려요.</p>
      </header>

      <section className="input-section card">
        <h2 className="section-title">재료 선택 (최대 {MAX_INGREDIENTS}개)</h2>
        {ingredientsLoading && (
          <div className="ingredients-loading-wrap">
            <p className="ingredients-loading"><span className="spinner-inline" /> 재료 목록 불러오는 중… (최대 15초)</p>
            <button type="button" className="cancel-load-btn" onClick={() => ingredientsAbortRef.current?.abort()}>
              로딩 중단
            </button>
          </div>
        )}
        {!ingredientsLoading && ingredients.length === 0 && error && (
          <div className="ingredients-error">
            <p>재료 목록을 불러올 수 없습니다.</p>
            <p className="ingredients-error-detail">{error}</p>
            <button type="button" className="retry-btn" onClick={loadIngredients}>재시도</button>
          </div>
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
          <button
            type="button"
            role="switch"
            aria-checked={searchMode === 'only'}
            className={`search-mode-toggle-btn ${searchMode === 'only' ? 'on' : ''}`}
            onClick={() => setSearchMode((m) => (m === 'diverse' ? 'only' : 'diverse'))}
            disabled={loading}
            title={searchMode === 'diverse' ? '해당 재료만 검색으로 전환' : '다양하게 검색으로 전환'}
            aria-label={`검색 방식: ${searchMode === 'diverse' ? '다양하게 검색' : '해당 재료만 검색'}. 클릭하면 전환`}
          >
            <span className="toggle-track" aria-hidden>
              <span className="toggle-thumb" />
            </span>
            <span className="toggle-label">
              {searchMode === 'diverse' ? '다양하게' : '해당 재료만'}
            </span>
          </button>
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
        <div className="result-section-header">
          <h2 className="section-title">추천 메뉴</h2>
          {(recommendResult?.youtubeRecommendations?.length > 0 || recommendResult?.recipeRecommendations?.length > 0) && (
            <div className="result-view-toggle" role="group" aria-label="보기 방식">
              <button
                type="button"
                className={`result-view-btn ${resultViewMode === 'list' ? 'active' : ''}`}
                onClick={() => setResultViewMode('list')}
                title="1줄 보기"
                aria-label="1줄 보기"
                aria-pressed={resultViewMode === 'list'}
              >
                <LayoutList size={20} aria-hidden />
              </button>
              <button
                type="button"
                className={`result-view-btn ${resultViewMode === 'grid3' ? 'active' : ''}`}
                onClick={() => setResultViewMode('grid3')}
                title="3줄 보기 (그리드)"
                aria-label="3줄 보기 (그리드)"
                aria-pressed={resultViewMode === 'grid3'}
              >
                <LayoutGrid size={20} aria-hidden />
              </button>
            </div>
          )}
        </div>
        {hasSearched && loading && (
          <p className="empty result-loading"><span className="spinner-inline" /> 추천 중… (최대 15초)</p>
        )}
        {hasSearched && !loading && !error && recommendResult && recommendResult.youtubeRecommendations?.length === 0 && (recommendResult.youtubeErrorReason ? (
          <p className="youtube-error-reason">{recommendResult.youtubeErrorReason}</p>
        ) : !recommendResult.recipeRecommendations?.length && (
          <p className="empty">추천 결과가 없습니다. 재료 선택 후 다시 시도해 보세요.</p>
        ))}
        {!hasSearched && !loading && !error && (
          <p className="empty">재료를 선택한 뒤 메뉴 추천을 눌러 주세요.</p>
        )}

        {recommendResult?.youtubeRecommendations?.length > 0 && (() => {
          const requestedTagNames = recommendResult.requestedTagNames || []
          return (
            <div className="recommend-group">
              <h3 className="recommend-subtitle">
                {recommendResult.strictOnly ? '유튜브 (선택한 재료만으로 만드는 레시피)' : '유튜브 (선택 재료 포함 다양한 레시피)'}
              </h3>
              <div className={`recipe-grid recipe-grid--${resultViewMode}`}>
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
                      <img src={`https://img.youtube.com/vi/${v.videoId}/sddefault.jpg`} alt="" loading="lazy" />
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
        {recommendResult?.recipeRecommendations?.length > 0 && (
          <div className="recommend-group">
            <h3 className="recommend-subtitle">
              {recommendResult.strictOnly ? '레시피 (선택한 재료만 사용)' : '레시피 (선택 재료 포함)'}
            </h3>
            <div className={`recipe-grid recipe-grid--${resultViewMode}`}>
              {recommendResult.recipeRecommendations.map((r) => (
                <article
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  className="recipe-card card db-recipe-card"
                  onClick={() => openRecipeDetail(r)}
                  onKeyDown={(e) => e.key === 'Enter' && openRecipeDetail(r)}
                >
                  <div className="card-body">
                    <h3 className="card-title">{r.name}</h3>
                    {r.description && <p className="card-desc">{r.description}</p>}
                    {r.ingredientNames?.length > 0 && (
                      <p className="card-tags">재료: {r.ingredientNames.join(', ')}</p>
                    )}
                    <p className="card-hint">클릭하면 상세 레시피 보기</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
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

      {recipeDetail != null && (
        <div className="modal-backdrop" onClick={closeRecipeDetail} role="presentation">
          <div className="modal card recipe-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={closeRecipeDetail} aria-label="닫기">×</button>
            {recipeDetail.loading && (
              <div className="recipe-detail-loading"><span className="spinner-inline" /> 레시피 불러오는 중…</div>
            )}
            {recipeDetail.error && (
              <p className="recipe-detail-error">{recipeDetail.error}</p>
            )}
            {!recipeDetail.loading && !recipeDetail.error && recipeDetail.data && (() => {
              const d = recipeDetail.data
              const hasDetail = d.steps?.length > 0 || d.ingredientsWithAmount?.length > 0
              if (!hasDetail) return <p className="empty">상세 정보가 없습니다.</p>
              return (
                <>
                  <h2 className="modal-title">{d.name}</h2>
                  {d.description && <p className="recipe-detail-desc">{d.description}</p>}
                  {d.ingredientsWithAmount?.length > 0 && (
                    <div className="detail-block">
                      <h3>재료</h3>
                      <ul className="ingredients-list">
                        {d.ingredientsWithAmount.map((ing, i) => (
                          <li key={i}>{ing}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {d.steps?.length > 0 && (
                    <div className="detail-block">
                      <h3>조리 순서</h3>
                      <ol className="steps-list">
                        {d.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
