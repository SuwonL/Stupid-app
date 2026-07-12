const STATUS_LABELS = {
  success: '성공',
  fail: '실패',
  caution: '주의',
  hold: '보류',
}

function formatPrice(value, code) {
  if (typeof value !== 'number') return value
  const isUs = /^[A-Z]+$/.test(code)
  return isUs ? `$${value.toLocaleString()}` : `${value.toLocaleString()}원`
}

export default function PerformanceReport({ report }) {
  if (!report) {
    return (
      <section className="performance-section card">
        <h2 className="section-title">추천 성과 분석</h2>
        <p className="stock-empty">추천 성과 분석 데이터를 준비 중입니다.</p>
      </section>
    )
  }

  return (
    <section className="performance-section card">
      <div className="performance-header">
        <h2 className="section-title">추천 성과 분석</h2>
        <span className="performance-meta">다음 거래일 검증 기준</span>
      </div>

      <div className="performance-summary">
        <div>
          <span>누적 성공률</span>
          <strong>{report.successRate}%</strong>
        </div>
        <div>
          <span>평균 수익률</span>
          <strong className={report.averageReturn >= 0 ? 'positive' : 'negative'}>{report.averageReturn}%</strong>
        </div>
        <div>
          <span>손절 발생</span>
          <strong>{report.stopLossCount}회</strong>
        </div>
      </div>

      <div className="performance-list">
        {report.previousResults.map((item) => (
          <article key={item.recommendation.recommendationId} className="performance-item">
            <div className="performance-item-top">
              <div>
                <strong>{item.recommendation.name}</strong>
                <span>{item.recommendation.code}</span>
              </div>
              <span className={`performance-status ${item.status}`}>
                {STATUS_LABELS[item.status] || item.status}
              </span>
            </div>
            <div className="performance-prices">
              <span>조회가 {formatPrice(item.recommendation.recommendedPrice, item.recommendation.code)}</span>
              <span>시가 {formatPrice(item.actualResult.nextOpen, item.recommendation.code)}</span>
              <span>고가 {formatPrice(item.actualResult.nextHigh, item.recommendation.code)}</span>
              <span>저가 {formatPrice(item.actualResult.nextLow, item.recommendation.code)}</span>
              <span>종가 {formatPrice(item.actualResult.nextClose, item.recommendation.code)}</span>
            </div>
            <div className="performance-result-line">
              <span className={item.returnRate >= 0 ? 'positive' : 'negative'}>수익률 {item.returnRate}%</span>
              <span>익절 {item.takeProfitReached ? '도달' : '미도달'}</span>
              <span>손절 {item.stopLossReached ? '도달' : '미도달'}</span>
            </div>
            {item.failureAnalysis.length > 0 && (
              <p className="performance-failure">분석: {item.failureAnalysis.join(' · ')}</p>
            )}
          </article>
        ))}
      </div>

      <div className="performance-improvements">
        <strong>가장 많이 실패한 조건</strong>
        <p>{report.mostFailedCondition}</p>
        <strong>다음 추천 반영 포인트</strong>
        <ul>
          {report.improvedPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
