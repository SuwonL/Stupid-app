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
import { getStockNews, getStockProviderStatus, getStockQuotes } from '../api'

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

function mapCandidateToRecommendation(candidate, rank, option, basedAt, quote = null, newsItems = []) {
  const quantScore = calculateQuantScore(candidate, quote, newsItems)
  const feedback = applyFeedbackToRecommendationScore(candidate, quantScore.total)
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
    quantChecks: buildQuantChecks(candidate, quote, feedback.adjustedScore, newsItems),
    score: feedback.adjustedScore,
    originalScore: candidate.score,
    reason: candidate.reason,
    buyRange: liveRanges.buyRange,
    takeProfitRange: liveRanges.takeProfitRange,
    stopLossRange: liveRanges.stopLossRange,
    riskFactors: candidate.riskFactors,
    criteria: candidate.criteria,
    signals: candidate.signals,
    basedAt: formatDateTime(basedAt),
    selectedOption: option,
    selectedOptionLabel: getOptionLabel(option),
    feedbackReasons: feedback.feedbackReasons,
    sourceCandidateId: candidate.id,
  }
}

function calculateQuantScore(candidate, quote, newsItems) {
  const changePercent = quote?.changePercent
  const absChange = Math.abs(changePercent ?? 0)
  const volumeScore = quote?.volume ? SCORE_WEIGHTS.volume : Math.round(SCORE_WEIGHTS.volume * 0.4)
  const momentumScore = changePercent == null
    ? 0
    : Math.max(0, SCORE_WEIGHTS.momentum - Math.max(0, absChange - 8) * 2)
  const officialQuoteScore = quote && !quote.error && quote.price != null ? SCORE_WEIGHTS.officialQuote : 0
  const officialNewsScore = newsItems.length > 0 ? SCORE_WEIGHTS.officialNews : 0
  const riskScore = candidate.signals.overheating
    ? Math.max(0, SCORE_WEIGHTS.risk - 10)
    : SCORE_WEIGHTS.risk
  const strategyFitScore = candidate.productType === 'leveraged' && candidate.horizonType === 'longterm'
    ? 0
    : SCORE_WEIGHTS.strategyFit
  const total = Math.round(officialQuoteScore + officialNewsScore + momentumScore + volumeScore + riskScore + strategyFitScore)

  return {
    total,
    weights: SCORE_WEIGHTS,
    breakdown: [
      { label: '공식 시세 검증', score: officialQuoteScore, max: SCORE_WEIGHTS.officialQuote },
      { label: '공식 뉴스 확인', score: officialNewsScore, max: SCORE_WEIGHTS.officialNews },
      { label: '가격 모멘텀', score: Math.round(momentumScore), max: SCORE_WEIGHTS.momentum },
      { label: '거래량 확인', score: volumeScore, max: SCORE_WEIGHTS.volume },
      { label: '리스크 감점 반영', score: riskScore, max: SCORE_WEIGHTS.risk },
      { label: '투자 기간 적합성', score: strategyFitScore, max: SCORE_WEIGHTS.strategyFit },
    ],
  }
}

export function applyFeedbackToRecommendationScore(candidate, baseScore, feedbackRules = mockFeedbackRules) {
  let adjustedScore = typeof baseScore === 'number' ? baseScore : candidate.score
  const reasons = []
  const { signals } = candidate

  if (signals.gapUpRate >= 1.5 && signals.volumeChangeRate < 10) {
    adjustedScore -= feedbackRules.gapUpVolumeDropPenalty
    reasons.push('갭상승 대비 거래량 부족 감점')
  }

  if (signals.newsHeat === 'hot' && signals.overheating) {
    adjustedScore -= feedbackRules.hotNewsOnlyPenalty
    reasons.push('뉴스 과열 감점')
  }

  if (signals.foreignInstitutionFlow === 'negative') {
    adjustedScore -= feedbackRules.foreignInstitutionSellPenalty
    reasons.push('수급 약화 감점')
  }

  if (candidate.productType === 'leveraged' || candidate.productType === 'inverse') {
    adjustedScore -= feedbackRules.leveragedVolatilityPenalty
    reasons.push('레버리지/인버스 변동성 가중치')
  }

  if (signals.previousDayChangeRate >= 4) {
    adjustedScore -= feedbackRules.excessivePreviousRisePenalty
    reasons.push('전일 급등 과도 감점')
  }

  return {
    adjustedScore: Math.max(0, Math.round(adjustedScore)),
    feedbackReasons: reasons,
  }
}

function buildQuantChecks(candidate, quote, score, newsItems = []) {
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
      label: '과열 점검',
      passed: !(candidate.signals.overheating && candidate.signals.gapUpRate >= 5),
      detail: candidate.signals.overheating ? '과열 신호 있음' : '과열 신호 낮음',
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
  try {
    ;[quotes, newsItems] = await Promise.all([
      getStockQuotes(symbols),
      getStockNews(symbols),
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
  const ranked = filtered
    .filter((candidate) => quoteMap.has(candidate.symbol) && (newsMap.get(candidate.symbol)?.length || 0) > 0)
    .map((candidate) => ({
      candidate,
      adjustedScore: applyFeedbackToRecommendationScore(
        candidate,
        calculateQuantScore(candidate, quoteMap.get(candidate.symbol), newsMap.get(candidate.symbol) || []).total
      ).adjustedScore,
    }))
    .filter(({ candidate, adjustedScore }) => buildQuantChecks(candidate, quoteMap.get(candidate.symbol), adjustedScore, newsMap.get(candidate.symbol) || []).passed)
    .sort((a, b) => b.adjustedScore - a.adjustedScore)
    .slice(0, 3)
    .map(({ candidate }, index) => mapCandidateToRecommendation(candidate, index + 1, option, basedAt, quoteMap.get(candidate.symbol), newsMap.get(candidate.symbol) || []))

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
