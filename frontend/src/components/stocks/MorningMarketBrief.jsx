import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react'
import { getMarketBrief } from '../../services/stockInfoService'

const TONE_ICON = {
  positive: CheckCircle2,
  neutral: Activity,
  negative: AlertTriangle,
}

export default function MorningMarketBrief() {
  const [baseTime, setBaseTime] = useState('08')
  const [brief, setBrief] = useState(null)

  useEffect(() => {
    let alive = true
    const load = () => getMarketBrief(baseTime).then((data) => alive && setBrief(data))
    setBrief(null)
    load()
    const timer = setInterval(load, 60000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [baseTime])

  if (!brief) return <p className="stock-empty">{baseTime === '15' ? '15시' : '8시'} 기준 주식 현황을 불러오는 중입니다.</p>

  return (
    <>
      <section className="stock-info-section card">
        <div className="stock-info-header">
          <div>
            <h2 className="section-title">주식현황</h2>
            <p>원하는 기준 시간을 선택하세요.</p>
          </div>
        </div>

        <div className="stock-time-option-list" role="group" aria-label="주식현황 기준 시간 선택">
          <button
            type="button"
            className={`stock-time-option-btn ${baseTime === '08' ? 'active' : ''}`}
            onClick={() => setBaseTime('08')}
          >
            8시 기준
          </button>
          <button
            type="button"
            className={`stock-time-option-btn ${baseTime === '15' ? 'active' : ''}`}
            onClick={() => setBaseTime('15')}
          >
            15시 기준
          </button>
        </div>
      </section>

      {!brief.isReady ? (
        <section className="stock-info-section card">
          <div className="stock-brief-waiting">
            <Clock3 size={24} aria-hidden />
            <div>
              <h3>준비중</h3>
              <p>{brief.basedAt} 기준 현황은 아직 도래하지 않았습니다.</p>
              <strong>남은 시간: {brief.remainingTime}</strong>
            </div>
          </div>
        </section>
      ) : (
        <section className="stock-info-section card">
          {brief.statusError ? (
            <div className="stock-brief-waiting">
              <AlertTriangle size={24} aria-hidden />
              <div>
                <h3>정식 API 연결 필요</h3>
                <p>{brief.statusError}</p>
                <strong>검증되지 않은 시장 현황은 표시하지 않습니다.</strong>
              </div>
            </div>
          ) : (
            <>
          <div className="stock-info-header">
            <div>
              <h2 className="section-title">{brief.baseTime} 기준 주식 현황</h2>
              <p>{brief.basedAt} 기준 {brief.liveSource} 요약</p>
            </div>
            <span className="stock-info-badge">{brief.marketMood}</span>
          </div>

          <h3 className="stock-info-title">공식 API 기준 지표·뉴스 확인</h3>
          <p className="stock-info-summary">아래 지표와 뉴스는 정식 API 응답이 확인된 항목만 표시합니다. 해설은 참고용이며, 공식 데이터가 부족하면 관심 종목을 표시하지 않습니다.</p>

          <div className="stock-beginner-summary">
            <strong>초보자용 쉽게 보기</strong>
            <p>숫자가 초록색이면 최근 기준 대비 우호적, 빨간색이면 약세 또는 리스크 신호로 보면 됩니다. 단, 지표 하나만 보고 매수하지 말고 뉴스와 변동성을 함께 확인해야 합니다.</p>
          </div>

          <div className="stock-info-grid">
            {brief.indices.map((item) => {
              const Icon = TONE_ICON[item.tone] || Activity
              return (
                <div key={item.name} className={`stock-info-metric ${item.tone}`}>
                  <Icon size={16} aria-hidden />
                  <span>{item.name}</span>
                  <strong>{item.value}</strong>
                </div>
              )
            })}
          </div>

          {brief.officialThemeRecommendations?.length > 0 && (
            <div className="stock-info-block">
              <strong>공식 데이터 기반 간단 관심 종목</strong>
              <div className="stock-theme-recommend-list">
                {brief.officialThemeRecommendations.map((item) => (
                  <article key={`${item.theme}-${item.code}`} className="stock-theme-recommend-card">
                    <span>{item.theme}</span>
                    <h4>{item.name}</h4>
                    <p className="stock-theme-code">{item.code}</p>
                    <p>{item.reason}</p>
                    <small>주의: {item.risk}</small>
                  </article>
                ))}
              </div>
            </div>
          )}

          {(!brief.officialThemeRecommendations || brief.officialThemeRecommendations.length === 0) && (
            <div className="stock-info-block">
              <strong>테마 기준 간단 추천</strong>
              <p className="stock-info-summary">공식 뉴스와 공식 시세가 함께 검증된 종목이 없어 간단 추천을 표시하지 않습니다.</p>
            </div>
          )}

          {brief.news?.length > 0 && (
            <div className="stock-info-block">
              <strong>실제 뉴스 헤드라인</strong>
              <div className="stock-news-list">
                {brief.news.slice(0, 5).map((item) => (
                  <a key={`${item.symbol}-${item.title}`} href={item.link} target="_blank" rel="noreferrer">
                    <span>{item.symbol}</span>
                    {item.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="stock-info-columns">
            <div className="stock-info-block">
              <strong>체크 포인트</strong>
              <ul>
                {brief.watchPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
            <div className="stock-info-block risk">
              <strong>주의할 리스크</strong>
              <ul>
                {brief.riskNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
            </>
          )}
        </section>
      )}
    </>
  )
}
