import {
  HORIZON_LABELS,
  INVESTMENT_HORIZON_OPTIONS,
  MARKET_SCOPE_OPTIONS,
  PRODUCT_LABELS,
  PRODUCT_TYPE_OPTIONS,
  REGION_LABELS,
  mockRecommendationCandidates,
} from '../data/mockRecommendations'
import { mockFeedbackRules } from '../data/mockEvaluationResults'
import { getStockIndicators, getStockNews, getStockProviderStatus, getStockQuotes } from '../api'

const SCORE_WEIGHTS = {
  officialQuote: 25,
  officialNews: 15,
  momentum: 20,
  volume: 10,
  risk: 20,
  strategyFit: 10,
}

export const RECOMMENDATION_ERROR_CODES = {
  API_NOT_CONFIGURED: 'API_NOT_CONFIGURED',
  NO_VERIFIED_CANDIDATE: 'NO_VERIFIED_CANDIDATE',
  NETWORK_OR_PROVIDER: 'NETWORK_OR_PROVIDER',
}

function createRecommendationError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatDateTime(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}:${s}`
}

function createRecommendationId(code, timestamp) {
  return `${timestamp}-${code}`.replace(/[^a-zA-Z0-9-]/g, '')
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function parseAmount(text) {
  const match = String(text).replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : null
}

function formatAmount(value, isUsd) {
  if (isUsd) {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }
  return `${Math.round(value).toLocaleString('ko-KR')}원`
}

// mock 데이터의 매수/익절/손절 값은 mock currentPrice 기준 상대적 비율(%)로 설계되어 있음.
// 실시간 시세가 mock 기준가와 다르면 문자열을 그대로 쓰지 않고, 같은 비율을 실시간가에 다시 적용해 재계산한다.
function scaleRangeString(rangeText, ratio) {
  if (!rangeText || !Number.isFinite(ratio)) return rangeText
  const isUsd = rangeText.includes('$')
  if (rangeText.includes('~')) {
    const [lowText, highText] = rangeText.split('~')
    const low = parseAmount(lowText)
    const high = parseAmount(highText)
    if (low == null || high == null) return rangeText
    return `${formatAmount(low * ratio, isUsd)} ~ ${formatAmount(high * ratio, isUsd)}`
  }
  const value = parseAmount(rangeText)
  if (value == null) return rangeText
  const suffix = rangeText.includes('이탈') ? ' 이탈' : ''
  return `${formatAmount(value * ratio, isUsd)}${suffix}`
}

function buildLiveRanges(candidate, livePrice) {
  if (!livePrice || !candidate.currentPrice) {
    return {
      buyRange: candidate.buyRange,
      takeProfitRange: candidate.takeProfitRange,
      stopLossRange: candidate.stopLossRange,
    }
  }
  const ratio = livePrice / candidate.currentPrice
  return {
    buyRange: scaleRangeString(candidate.buyRange, ratio),
    takeProfitRange: scaleRangeString(candidate.takeProfitRange, ratio),
    stopLossRange: scaleRangeString(candidate.stopLossRange, ratio),
  }
}

function normalizeOption(option) {
  if (typeof option === 'string') {
    return { marketScope: option, productType: 'all' }
  }
  return {
    marketScope: option?.marketScope || 'all',
    productType: option?.productType || 'all',
    horizonType: option?.horizonType || 'all',
  }
}

function getOptionLabel(option) {
  const normalized = normalizeOption(option)
  const marketLabel = MARKET_SCOPE_OPTIONS.find((item) => item.value === normalized.marketScope)?.label || '전체'
  const productLabel = PRODUCT_TYPE_OPTIONS.find((item) => item.value === normalized.productType)?.label || '전체'
  const horizonLabel = INVESTMENT_HORIZON_OPTIONS.find((item) => item.value === normalized.horizonType)?.label || '전체'
  return `${marketLabel} · ${productLabel} · ${horizonLabel}`
}

function mapCandidateToRecommendation(candidate, rank, option, basedAt, quote = null, newsItems = [], indicators = null) {
  const quantScore = calculateQuantScore(candidate, quote, newsItems, indicators)
  const feedback = applyFeedbackToRecommendationScore(candidate, quantScore.rawTotal, quote, indicators, newsItems)
  const regionLabel = REGION_LABELS[candidate.region] || candidate.region
  const productLabel = PRODUCT_LABELS[candidate.productType] || candidate.productType
  const horizonLabel = HORIZON_LABELS[candidate.horizonType] || candidate.horizonType
  const livePrice = quote?.price ?? candidate.currentPrice
  const liveRanges = buildLiveRanges(candidate, livePrice)
  return {
    recommendationId: createRecommendationId(candidate.code, basedAt.getTime()),
    rank,
    name: candidate.name,
    code: candidate.code,
    symbol: candidate.symbol,
    marketType: candidate.marketType,
    region: candidate.region,
    productType: candidate.productType,
    horizonType: candidate.horizonType,
    marketLabel: `${regionLabel} / ${productLabel}`,
    regionLabel,
    productLabel,
    horizonLabel,
    holdingPeriod: candidate.holdingPeriod,
    tradeStyle: candidate.tradeStyle,
    surgePotential: candidate.surgePotential,
    recommendationBase: '공식 데이터 검증',
    recommendedPrice: livePrice,
    previousClose: quote?.previousClose ?? null,
    liveChange: quote?.change ?? null,
    liveChangePercent: quote?.changePercent ?? null,
    quoteSource: quote?.source || '공식 시세 미확인',
    quoteError: quote?.error || null,
    officialNews: newsItems,
    quantScore,
    quantChecks: buildQuantChecks(candidate, quote, feedback.adjustedScore, newsItems, indicators),
    score: feedback.adjustedScore,
    originalScore: candidate.score,
    reason: candidate.reason,
    buyRange: liveRanges.buyRange,
    takeProfitRange: liveRanges.takeProfitRange,
    stopLossRange: liveRanges.stopLossRange,
    riskFactors: candidate.riskFactors,
    criteria: candidate.criteria,
    indicators,
    basedAt: formatDateTime(basedAt),
    selectedOption: option,
    selectedOptionLabel: getOptionLabel(option),
    feedbackReasons: feedback.feedbackReasons,
    sourceCandidateId: candidate.id,
  }
}

// 점수 계산 원칙: 항목마다 "구간을 넘기면 만점"인 계단식 조건을 쓰면, 평소 등락폭이 크지 않은 날엔
// 후보 대부분이 같은 만점을 받아 동점이 되고, 그 동점은 결국 배열에 적힌 순서로 갈린다 —
// 이것이 "언제 돌려도 같은 종목만 추천되는" 현상의 실제 원인이었다. 그래서 모멘텀·거래량·리스크는
// 실측값(등락률·거래량 변화율·이동평균 이격도)에 비례해 연속적으로 움직이도록 바꿨다.
function calculateQuantScore(candidate, quote, newsItems, indicators) {
  const changePercent = quote?.changePercent
  const absChange = Math.abs(changePercent ?? 0)
  const volumeChangeRate = indicators?.volumeChangeRate
  const ma20DeviationPercent = indicators?.ma20DeviationPercent

  const officialQuoteScore = quote && !quote.error && quote.price != null ? SCORE_WEIGHTS.officialQuote : 0

  // 뉴스 건수(최대 3건)에 비례. 있고 없고만 보던 기존 로직은 뉴스가 걸린 후보 전부를 동점 처리했다.
  const officialNewsScore = newsItems.length > 0
    ? clamp(SCORE_WEIGHTS.officialNews * (newsItems.length / 3), 0, SCORE_WEIGHTS.officialNews)
    : 0

  // 등락률이 없으면 0점. 있으면 +4% 부근(적당한 상승 모멘텀)을 정점으로 양방향으로 연속 감점 —
  // 예전처럼 "8% 이내면 전부 만점"인 평평한 구간이 없어 종목마다 실제 등락률 차이가 그대로 점수 차이로 남는다.
  const momentumScore = changePercent == null
    ? 0
    : clamp(SCORE_WEIGHTS.momentum - Math.abs(absChange - 4) * 1.6, 0, SCORE_WEIGHTS.momentum)

  // 거래량 자체 존재 여부(사실상 항상 true)가 아니라, 20일 평균 대비 실제 거래량 변화율로 채점.
  // 평균 대비 그대로(0%)면 절반 점수, +100%면 만점, 감소하면 절반 아래로 내려간다.
  const volumeScore = volumeChangeRate == null
    ? Math.round(SCORE_WEIGHTS.volume * 0.4)
    : clamp(SCORE_WEIGHTS.volume / 2 + (volumeChangeRate / 100) * (SCORE_WEIGHTS.volume / 2), 0, SCORE_WEIGHTS.volume)

  // 이동평균 이격도(실측)가 클수록 연속적으로 감점. 과거엔 15% 초과 여부(boolean)만 보고 -10점 고정이라
  // 이격도가 6%든 14%든 동일하게 만점 처리됐다. 과열 여부(overheating) 자체는 아래 체크리스트에서
  // 여전히 하드 게이트로 쓰되, 점수는 이격도 크기에 비례해 움직이게 한다.
  const riskScore = ma20DeviationPercent == null
    ? SCORE_WEIGHTS.risk
    : clamp(SCORE_WEIGHTS.risk - Math.max(0, ma20DeviationPercent - 5) * 1.2, 0, SCORE_WEIGHTS.risk)

  const strategyFitScore = candidate.productType === 'leveraged' && candidate.horizonType === 'longterm'
    ? 0
    : SCORE_WEIGHTS.strategyFit

  const rawTotal = officialQuoteScore + officialNewsScore + momentumScore + volumeScore + riskScore + strategyFitScore
  const total = Math.round(rawTotal)

  return {
    total,
    rawTotal,
    weights: SCORE_WEIGHTS,
    breakdown: [
      { label: '공식 시세 검증', score: officialQuoteScore, max: SCORE_WEIGHTS.officialQuote },
      { label: '공식 뉴스 확인', score: Math.round(officialNewsScore), max: SCORE_WEIGHTS.officialNews },
      { label: '가격 모멘텀', score: Math.round(momentumScore), max: SCORE_WEIGHTS.momentum },
      { label: '거래량 확인', score: Math.round(volumeScore), max: SCORE_WEIGHTS.volume },
      { label: '리스크 감점 반영', score: Math.round(riskScore), max: SCORE_WEIGHTS.risk },
      { label: '투자 기간 적합성', score: strategyFitScore, max: SCORE_WEIGHTS.strategyFit },
    ],
  }
}

// quote/indicators는 모두 공식 API에서 가져온 실측값. 값을 확인할 수 없으면(null) 해당 규칙은 건너뛴다 —
// 확인 안 된 상태를 임의로 '긍정' 또는 '부정'으로 단정하지 않는다.
export function applyFeedbackToRecommendationScore(candidate, baseScore, quote = null, indicators = null, newsItems = [], feedbackRules = mockFeedbackRules) {
  let adjustedScore = typeof baseScore === 'number' ? baseScore : candidate.score
  const reasons = []
  const changePercent = quote?.changePercent
  const volumeChangeRate = indicators?.volumeChangeRate
  const overheating = indicators?.overheating

  if (changePercent != null && changePercent >= 1.5 && volumeChangeRate != null && volumeChangeRate < 10) {
    adjustedScore -= feedbackRules.gapUpVolumeDropPenalty
    reasons.push('전일 대비 상승폭 대비 거래량 증가 부족 감점 (실측 거래량 기준)')
  }

  if (newsItems.length >= 3 && overheating === true) {
    adjustedScore -= feedbackRules.hotNewsOnlyPenalty
    reasons.push('공식 뉴스 다수 + 이동평균 이격 과열 감점')
  }

  if (candidate.productType === 'leveraged' || candidate.productType === 'inverse') {
    adjustedScore -= feedbackRules.leveragedVolatilityPenalty
    reasons.push('레버리지/인버스 변동성 가중치')
  }

  if (changePercent != null && changePercent >= 4) {
    adjustedScore -= feedbackRules.excessivePreviousRisePenalty
    reasons.push('전일 대비 급등 과도 감점 (실측 등락률 기준)')
  }

  return {
    // 순위 정렬은 rawAdjustedScore(소수점 유지)로 하고, 화면 표시용 adjustedScore만 반올림한다.
    // baseScore가 이미 정수로 반올림되어 있으면(예전 호출부) 여기서도 정수만 나오지만,
    // calculateQuantScore의 rawTotal을 baseScore로 넘기면 동점이 크게 줄어든다.
    adjustedScore: Math.max(0, Math.round(adjustedScore)),
    rawAdjustedScore: Math.max(0, adjustedScore),
    feedbackReasons: reasons,
  }
}

function buildQuantChecks(candidate, quote, score, newsItems = [], indicators = null) {
  const overheating = indicators?.overheating
  const checks = [
    {
      label: '공식 시세',
      passed: Boolean(quote && !quote.error && quote.price != null),
      detail: quote?.source || '공식 API 미확인',
    },
    {
      label: '공식 뉴스',
      passed: newsItems.length > 0,
      detail: newsItems.length > 0 ? `${newsItems.length}건` : '공식 뉴스 미확인',
    },
    {
      label: '전일 대비 변화율',
      passed: quote?.changePercent != null && Math.abs(quote.changePercent) <= 20,
      detail: quote?.changePercent == null ? '등락률 없음' : `${quote.changePercent}%`,
    },
    {
      label: '리스크 보정 점수',
      passed: score >= 70,
      detail: `${score}점`,
    },
    {
      label: '과열 점검 (20일 이평 이격도 실측)',
      passed: !(overheating === true && quote?.changePercent >= 5),
      detail: overheating == null ? '과거 시세 미확인' : overheating ? '과열 신호 있음' : '과열 신호 낮음',
    },
  ]
  return {
    passed: checks.every((item) => item.passed),
    checks,
  }
}

function groupNewsBySymbol(newsItems) {
  return newsItems.reduce((acc, item) => {
    if (!item?.symbol) return acc
    if (!acc.has(item.symbol)) acc.set(item.symbol, [])
    acc.get(item.symbol).push(item)
    return acc
  }, new Map())
}

function filterCandidates(option) {
  const { marketScope, productType, horizonType } = normalizeOption(option)
  return mockRecommendationCandidates.filter((item) => {
    const matchesMarket = marketScope === 'all' || item.region === marketScope
    const matchesProduct = productType === 'all' || item.productType === productType
    const matchesHorizon = horizonType === 'all' || item.horizonType === horizonType
    return matchesMarket && matchesProduct && matchesHorizon
  })
}

export async function getCurrentRecommendations(option = { marketScope: 'all', productType: 'all', horizonType: 'all' }) {
  await delay(450)

  const basedAt = new Date()
  const normalized = normalizeOption(option)
  const filtered = filterCandidates(option)
  let providerStatus
  try {
    providerStatus = await getStockProviderStatus()
  } catch (e) {
    throw createRecommendationError(
      RECOMMENDATION_ERROR_CODES.NETWORK_OR_PROVIDER,
      `주식 API 상태 확인에 실패했습니다. 백엔드 연결과 네트워크 상태를 확인해 주세요. (${e.message})`
    )
  }
  if (!providerStatus.kisConfigured && !providerStatus.polygonConfigured && !providerStatus.finnhubConfigured) {
    throw createRecommendationError(
      RECOMMENDATION_ERROR_CODES.API_NOT_CONFIGURED,
      '정식 시세 API가 설정되지 않아 실시간 추천을 생성하지 않았습니다. KIS/Polygon/Finnhub API 키를 먼저 설정해 주세요.'
    )
  }
  const symbols = filtered.map((candidate) => candidate.symbol).filter(Boolean)
  let quotes
  let newsItems
  let indicatorsList
  try {
    ;[quotes, newsItems, indicatorsList] = await Promise.all([
      getStockQuotes(symbols),
      getStockNews(symbols),
      getStockIndicators(symbols),
    ])
  } catch (e) {
    throw createRecommendationError(
      RECOMMENDATION_ERROR_CODES.NETWORK_OR_PROVIDER,
      `공식 시세 또는 뉴스 조회에 실패했습니다. 잠시 후 다시 시도해 주세요. (${e.message})`
    )
  }
  const quoteMap = new Map(
    quotes
      .filter((quote) => quote && !quote.error && quote.price != null && quote.source !== 'mock')
      .map((quote) => [quote.symbol, quote])
  )
  const newsMap = groupNewsBySymbol(newsItems)
  const indicatorsMap = new Map(
    (indicatorsList || [])
      .filter((item) => item && !item.error)
      .map((item) => [item.symbol, item])
  )
  const ranked = filtered
    .filter((candidate) => quoteMap.has(candidate.symbol) && (newsMap.get(candidate.symbol)?.length || 0) > 0)
    .map((candidate) => {
      const quote = quoteMap.get(candidate.symbol)
      const indicators = indicatorsMap.get(candidate.symbol)
      const candidateNews = newsMap.get(candidate.symbol) || []
      const feedback = applyFeedbackToRecommendationScore(
        candidate,
        calculateQuantScore(candidate, quote, candidateNews, indicators).rawTotal,
        quote,
        indicators,
        candidateNews
      )
      return { candidate, quote, indicators, candidateNews, adjustedScore: feedback.adjustedScore, rawAdjustedScore: feedback.rawAdjustedScore }
    })
    .filter(({ candidate, quote, adjustedScore, candidateNews, indicators }) =>
      buildQuantChecks(candidate, quote, adjustedScore, candidateNews, indicators).passed
    )
    // 1순위는 소수점까지 유지한 실측 기반 점수(rawAdjustedScore) — 동점 확률이 거의 없다.
    // 그래도 남는 동점은 후보 배열 순서가 아니라, 그날의 실측 등락률·거래량 변화율 크기로 가른다.
    .sort((a, b) => {
      if (b.rawAdjustedScore !== a.rawAdjustedScore) return b.rawAdjustedScore - a.rawAdjustedScore
      const changeDiff = Math.abs(b.quote?.changePercent ?? 0) - Math.abs(a.quote?.changePercent ?? 0)
      if (changeDiff !== 0) return changeDiff
      return Math.abs(b.indicators?.volumeChangeRate ?? 0) - Math.abs(a.indicators?.volumeChangeRate ?? 0)
    })
    .slice(0, 5)
    .map(({ candidate, quote, candidateNews, indicators }, index) =>
      mapCandidateToRecommendation(candidate, index + 1, option, basedAt, quote, candidateNews, indicators)
    )

  if (ranked.length === 0) {
    throw createRecommendationError(
      RECOMMENDATION_ERROR_CODES.NO_VERIFIED_CANDIDATE,
      '정식 시세·뉴스·리스크 검증을 모두 통과한 종목이 없어 이번 조건에서는 추천을 생성하지 않았습니다.'
    )
  }

  return {
    option: normalized,
    optionLabel: getOptionLabel(option),
    basedAt: formatDateTime(basedAt),
    recommendations: ranked,
  }
}

export function updateRecommendationRules(previousRules, analysisResults) {
  const failedCount = analysisResults.filter((item) => item.status === 'fail').length
  return {
    ...previousRules,
    repeatedFailurePenalty: previousRules.repeatedFailurePenalty + (failedCount > 1 ? 1 : 0),
    improvedPoints: [
      ...previousRules.improvedPoints,
      failedCount > 0 ? '실패 후보의 과열·수급 조건을 다음 추천 점수에 추가 반영' : '현재 룰 유지',
    ].slice(-5),
  }
}
