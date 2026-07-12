import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import DailyStockKnowledge from '../components/stocks/DailyStockKnowledge'
import MorningMarketBrief from '../components/stocks/MorningMarketBrief'
import RecommendationCard from '../components/stocks/RecommendationCard'
import RecommendationFilter from '../components/stocks/RecommendationFilter'
import { RECOMMENDATION_ERROR_CODES, getCurrentRecommendations } from '../services/recommendationService'
import './StockPage.css'

const ERROR_TITLES = {
  [RECOMMENDATION_ERROR_CODES.API_NOT_CONFIGURED]: '정식 시세 API 설정 필요',
  [RECOMMENDATION_ERROR_CODES.NO_VERIFIED_CANDIDATE]: '검증 통과 종목 없음',
  [RECOMMENDATION_ERROR_CODES.NETWORK_OR_PROVIDER]: '공식 데이터 조회 실패',
}

export default function StockRecommendationPage() {
  const [activeTab, setActiveTab] = useState('recommend')
  const [marketScope, setMarketScope] = useState('all')
  const [productType, setProductType] = useState('all')
  const [horizonType, setHorizonType] = useState('all')
  const [recommendations, setRecommendations] = useState([])
  const [basedAt, setBasedAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasRequested, setHasRequested] = useState(false)

  const handleRecommend = async () => {
    setLoading(true)
    setError(null)
    setHasRequested(true)

    try {
      const result = await getCurrentRecommendations({ marketScope, productType, horizonType })
      setRecommendations(result.recommendations)
      setBasedAt(result.basedAt)
    } catch (e) {
      setRecommendations([])
      setError({
        code: e.code || RECOMMENDATION_ERROR_CODES.NETWORK_OR_PROVIDER,
        message: e.message || '실시간 추천 데이터를 불러올 수 없습니다.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stock-page">
      <header className="stock-header">
        <h1>주식 추천</h1>
        <p className="stock-sub">공식 시세·뉴스 검증을 통과한 매수 후보와 리스크 기준을 확인합니다.</p>
      </header>

      <nav className="stock-sub-nav" aria-label="주식 추천 하위 메뉴">
        <button
          type="button"
          className={`stock-sub-nav-btn ${activeTab === 'recommend' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommend')}
        >
          실시간 추천
        </button>
        <button
          type="button"
          className={`stock-sub-nav-btn ${activeTab === 'brief' ? 'active' : ''}`}
          onClick={() => setActiveTab('brief')}
        >
          주식현황
        </button>
        <button
          type="button"
          className={`stock-sub-nav-btn ${activeTab === 'knowledge' ? 'active' : ''}`}
          onClick={() => setActiveTab('knowledge')}
        >
          오늘의 주식 지식
        </button>
      </nav>

      {activeTab === 'brief' && <MorningMarketBrief />}

      {activeTab === 'knowledge' && <DailyStockKnowledge />}

      {activeTab === 'recommend' && (
        <>
          <RecommendationFilter
            marketScope={marketScope}
            productType={productType}
            horizonType={horizonType}
            onMarketChange={setMarketScope}
            onProductChange={setProductType}
            onHorizonChange={setHorizonType}
            disabled={loading}
          />

          <section className="stock-action-panel card">
            <div>
              <h2 className="section-title">실시간 추천</h2>
              <p>{basedAt ? `마지막 추천 시각: ${basedAt}` : '버튼을 누르면 공식 데이터 기준 매수 후보 TOP3를 생성합니다.'}</p>
            </div>
            <button type="button" className="stock-primary-btn" onClick={handleRecommend} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-inline" />
                  검증 중
                </>
              ) : (
                <>
                  <RefreshCw size={16} aria-hidden />
                  실시간 추천
                </>
              )}
            </button>
          </section>

          {error && (
            <div className={`stock-error ${error.code === RECOMMENDATION_ERROR_CODES.NO_VERIFIED_CANDIDATE ? 'caution' : ''}`}>
              <strong>{ERROR_TITLES[error.code] || '실시간 추천 실패'}</strong>
              <p>{error.message}</p>
            </div>
          )}

          <section className="stock-result-section">
            <div className="result-section-header">
              <h2 className="section-title">추천 TOP3</h2>
              {recommendations.length > 0 && <span className="stock-result-meta">{recommendations.length}개 표시</span>}
            </div>

            {loading && (
              <p className="stock-empty">
                <span className="spinner-inline" />
                공식 시세·뉴스·리스크 조건을 검증 중입니다.
              </p>
            )}

            {!loading && hasRequested && !error && recommendations.length === 0 && (
              <p className="stock-empty">이번 조건에서 표시할 추천 종목이 없습니다.</p>
            )}

            {!loading && !hasRequested && (
              <p className="stock-empty">시장·상세 옵션·투자 기간을 선택한 뒤 실시간 추천을 눌러 주세요.</p>
            )}

            {recommendations.length > 0 && (
              <div className="recommendation-card-list">
                {recommendations.map((recommendation) => (
                  <RecommendationCard key={recommendation.recommendationId} recommendation={recommendation} />
                ))}
              </div>
            )}
          </section>

          <section className="performance-section card">
            <h2 className="section-title">추천 성과 분석</h2>
            <p className="stock-empty">
              실제 성과 분석은 추천 이력 DB와 다음 거래일 공식 가격 조회가 연결된 뒤 표시됩니다.
              검증되지 않은 성과 데이터는 표시하지 않습니다.
            </p>
          </section>
        </>
      )}

      <section className="stock-disclaimer card">
        <p>본 추천은 공식 데이터와 룰 기반 검증을 활용한 투자 참고 정보입니다. 최종 매수·매도 책임은 본인에게 있으며 수익을 보장하지 않습니다.</p>
      </section>
    </div>
  )
}
