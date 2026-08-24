import { useState } from 'react'
import { AlertTriangle, BadgeCheck, ChevronDown, ChevronUp, Clock3, Info, ShieldCheck, Target } from 'lucide-react'

function formatPrice(price, code) {
  if (typeof price !== 'number') return price
  const isUs = /^[A-Z]+$/.test(code)
  return isUs ? `$${price.toLocaleString()}` : `${price.toLocaleString()}원`
}

// 여기 나오는 수치는 전부 공식 API에서 실측한 값입니다(임의 생성 아님). 지표를 못 가져왔으면
// '확인 안 됨'으로 표시하고, 없는 값을 긍정적/부정적으로 지어내지 않습니다.
function getReasonDetails(recommendation) {
  const { indicators, officialNews, liveChangePercent } = recommendation
  const details = []

  details.push(
    liveChangePercent == null
      ? '전일 대비 등락률을 공식 시세에서 확인하지 못했습니다.'
      : `전일 대비 등락률은 공식 시세 기준 ${liveChangePercent >= 0 ? '+' : ''}${liveChangePercent}%입니다.`
  )

  details.push(
    indicators?.volumeChangeRate == null
      ? '최근 20거래일 평균 대비 거래량 변화를 확인하지 못했습니다.'
      : `최근 20거래일 평균 거래량 대비 ${indicators.volumeChangeRate >= 0 ? '+' : ''}${indicators.volumeChangeRate}% 변화했습니다.`
  )

  details.push(
    indicators?.ma20DeviationPercent == null
      ? '20일 이동평균 대비 위치를 확인하지 못했습니다.'
      : `20일 이동평균 대비 ${indicators.ma20DeviationPercent >= 0 ? '+' : ''}${indicators.ma20DeviationPercent}% 위치에 있습니다.`
  )

  details.push(`공식 뉴스 ${officialNews?.length || 0}건이 확인되었습니다.`)

  if (indicators?.overheating === true) {
    details.push('20일 이동평균 대비 이격도가 커서(과열 신호) 진입 가격과 손절 기준 확인이 필요합니다.')
  }

  return details
}

export default function RecommendationCard({ recommendation }) {
  const [expanded, setExpanded] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const reasonDetails = getReasonDetails(recommendation)
  // '공식 뉴스'는 필수 통과 조건이 아니라 참고 신호이므로, 못 찾았다고 해서 뭔가 실패한 것처럼
  // 빨간색으로 보여주지 않는다(neutral) — 시세(필수)와는 시각적으로 구분한다.
  const verificationBadges = [
    { label: '공식 시세', state: recommendation.recommendedPrice && recommendation.quoteSource !== '공식 시세 미확인' ? 'passed' : 'failed' },
    { label: '공식 뉴스(참고)', state: recommendation.officialNews?.length > 0 ? 'passed' : 'neutral' },
    { label: '후보군 검증', state: 'passed' },
  ]
  const primaryRisks = recommendation.riskFactors.slice(0, 2)

  return (
    <article className="recommendation-card card">
      <button
        type="button"
        className="recommendation-summary-toggle"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <div className="recommendation-card-head">
          <div className="recommendation-rank">TOP {recommendation.rank}</div>
          <span className="recommendation-market">{recommendation.marketLabel}</span>
        </div>

        <div className="recommendation-main">
          <div>
            <h3 className="recommendation-name">{recommendation.name}</h3>
            <p className="recommendation-code">
              {recommendation.code} · {formatPrice(recommendation.recommendedPrice, recommendation.code)}
              {recommendation.liveChangePercent != null && (
                <span className={recommendation.liveChangePercent >= 0 ? 'positive' : 'negative'}>
                  {' '}
                  {recommendation.liveChangePercent >= 0 ? '+' : ''}{recommendation.liveChangePercent}%
                </span>
              )}
            </p>
          </div>
          <div className="recommendation-summary-right">
            <div className="recommendation-score">
              <span>{recommendation.score}</span>
              <small>추천점수</small>
            </div>
            {expanded ? <ChevronUp size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
          </div>
        </div>
      </button>

      {expanded && (
        <>
      <div className="recommendation-verification" aria-label="추천 검증 상태">
        {verificationBadges.map((badge) => (
          <span key={badge.label} className={badge.state}>
            <ShieldCheck size={13} aria-hidden />
            {badge.label}
          </span>
        ))}
      </div>

      {recommendation.filterRelaxed && (
        <div className="recommendation-relaxed-note">
          <Info size={14} aria-hidden />
          <span>{recommendation.filterRelaxedNote}</span>
        </div>
      )}

      <dl className="recommendation-facts recommendation-facts-primary">
        <div>
          <dt>현재가격</dt>
          <dd>{formatPrice(recommendation.recommendedPrice, recommendation.code)}</dd>
        </div>
        <div>
          <dt>등락률</dt>
          <dd className={recommendation.liveChangePercent >= 0 ? 'positive' : 'negative'}>
            {recommendation.liveChangePercent == null ? '확인 필요' : `${recommendation.liveChangePercent >= 0 ? '+' : ''}${recommendation.liveChangePercent}%`}
          </dd>
        </div>
        <div>
          <dt>투자 기간</dt>
          <dd>{recommendation.horizonLabel}</dd>
        </div>
        <div>
          <dt>권장 보유 기간</dt>
          <dd>{recommendation.holdingPeriod}</dd>
        </div>
      </dl>

      <div className="recommendation-ranges">
        <div>
          <span>매수 구간</span>
          <strong>{recommendation.buyRange}</strong>
        </div>
        <div>
          <span>익절 목표</span>
          <strong>{recommendation.takeProfitRange}</strong>
        </div>
        <div>
          <span>손절 기준</span>
          <strong>{recommendation.stopLossRange}</strong>
        </div>
      </div>

      <div className="recommendation-risk primary">
        <AlertTriangle size={15} aria-hidden />
        <span>{primaryRisks.join(' · ')}</span>
      </div>

      <p className="recommendation-style">
        <strong>추천 성격</strong>
        <span>{recommendation.tradeStyle}</span>
      </p>

      <p className="recommendation-reason">
        <BadgeCheck size={16} aria-hidden />
        {recommendation.reason}
      </p>

      <div className="recommendation-criteria">
        {recommendation.criteria.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      {recommendation.feedbackReasons.length > 0 && (
        <div className="recommendation-feedback">
          <Target size={15} aria-hidden />
          <span>{recommendation.feedbackReasons.join(' · ')}</span>
        </div>
      )}

      <button type="button" className="recommendation-detail-toggle" onClick={() => setShowDetails((value) => !value)}>
        {showDetails ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
        {showDetails ? '상세 근거 접기' : '상세 근거 보기'}
      </button>

      {showDetails && (
        <div className="recommendation-detail-panel">
          <dl className="recommendation-facts">
            <div>
              <dt>추천 기준</dt>
              <dd>{recommendation.recommendationBase}</dd>
            </div>
            <div>
              <dt>기준 시각</dt>
              <dd>{recommendation.basedAt}</dd>
            </div>
            <div>
              <dt>데이터 출처</dt>
              <dd>{recommendation.quoteSource}</dd>
            </div>
          </dl>

          <div className="recommendation-reason-detail">
            <strong>추천 사유 상세</strong>
            <ul>
              {reasonDetails.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </div>

          {recommendation.surgePotential && (
            <div className="recommendation-surge">
              <strong>급등 가능성: {recommendation.surgePotential.level}</strong>
              <ul>
                <li>규모: {recommendation.surgePotential.marketCap}</li>
                <li>거래량: {recommendation.surgePotential.volumeSpike}</li>
                <li>차트: {recommendation.surgePotential.breakout}</li>
                <li>재료: {recommendation.surgePotential.catalyst}</li>
                <li>위험도: {recommendation.surgePotential.riskLevel}</li>
              </ul>
            </div>
          )}

          <div className="recommendation-risk">
            <AlertTriangle size={15} aria-hidden />
            <span>{recommendation.riskFactors.join(' · ')}</span>
          </div>

          {recommendation.quantChecks && (
            <div className={`recommendation-quant ${recommendation.quantChecks.passed ? 'passed' : 'failed'}`}>
              <strong>검증 체크 {recommendation.quantChecks.passed ? '통과' : '확인 필요'}</strong>
              <ul>
                {recommendation.quantChecks.checks.map((check) => (
                  <li key={check.label}>
                    <span>{check.passed ? '통과' : '실패'}</span>
                    {check.label}: {check.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendation.quantScore?.breakdown?.length > 0 && (
            <div className="recommendation-score-breakdown">
              <strong>추천 점수 산식</strong>
              <ul>
                {recommendation.quantScore.breakdown.map((item) => (
                  <li key={item.label}>
                    {item.label}: {item.score}/{item.max}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendation.officialNews?.length > 0 && (
            <div className="recommendation-news">
              <strong>공식 뉴스 근거</strong>
              {recommendation.officialNews.slice(0, 3).map((item) => (
                <a key={`${item.source}-${item.title}`} href={item.link} target="_blank" rel="noreferrer">
                  <span>{item.source}</span>
                  {item.title}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="recommendation-time">
        <Clock3 size={14} aria-hidden />
        {recommendation.quoteSource} 기반 실시간 추천
      </div>
        </>
      )}
    </article>
  )
}
