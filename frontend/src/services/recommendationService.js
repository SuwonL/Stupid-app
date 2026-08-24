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
import { getStockIndicators, getStockMovers, getStockNews, getStockProviderStatus, getStockQuotes } from '../api'

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

function mapCandidateToRecommendation(candidate, rank, option, basedAt, quote = null, newsItems = [], indicators = null, matchTier = 0) {
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
    matchTier,
    filterRelaxed: matchTier > 0,
    filterRelaxedNote: MATCH_TIER_LABELS[matchTier] || null,
    isDynamicMover: Boolean(candidate.isDynamicMover),
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
  // '급등 가능주'는 전략 자체가 큰 모멘텀을 쫓는 것이므로 정점을 +12%로 훨씬 뒤로 두고 완만하게 감점한다.
  // 나머지(일반주식/ETF 등)는 과도하게 이미 오른 종목을 피한다는 의미로 +4% 부근을 정점으로 둔다.
  // 이 구분이 없으면, 실시간 스캔으로 찾은 진짜 급등주가 "너무 많이 올랐다"는 이유로 오히려 감점당해
  // 정작 급등 가능주 카테고리에서 걸러지는 모순이 생긴다.
  const isSurgeStrategy = candidate.productType === 'surge'
  const momentumScore = changePercent == null
    ? 0
    : isSurgeStrategy
      ? clamp(SCORE_WEIGHTS.momentum - Math.max(0, 12 - absChange) * 1.2 - Math.max(0, absChange - 12) * 0.8, 0, SCORE_WEIGHTS.momentum)
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

// '공식 뉴스'는 필수 통과 조건(required)이 아니라 참고 신호다. 예전엔 이게 필수라서, 뉴스 제공사가
// 특정 종목(주로 해외)에서 기사를 못 찾으면(제공사 쿼터·커버리지 문제여도) 그 종목은 시세가 멀쩡해도
// 영원히 추천 후보에서 빠졌다 — "일반주식으로 하면 삼성전자·NAVER만 나온다"는 문제의 실제 원인.
// 시세(가격) 자체는 계속 필수 조건으로 남긴다 — 가격을 모르는 종목을 추천할 수는 없다.
function buildQuantChecks(candidate, quote, score, newsItems = [], indicators = null) {
  const overheating = indicators?.overheating
  const checks = [
    {
      label: '공식 시세',
      passed: Boolean(quote && !quote.error && quote.price != null),
      detail: quote?.source || '공식 API 미확인',
      required: true,
    },
    {
      label: '공식 뉴스 (참고)',
      passed: newsItems.length > 0,
      detail: newsItems.length > 0 ? `${newsItems.length}건` : '공식 뉴스 미확인 — 점수에는 반영되지만 추천 여부를 막지는 않음',
      required: false,
    },
    {
      label: '전일 대비 변화율',
      passed: quote?.changePercent != null && Math.abs(quote.changePercent) <= 20,
      detail: quote?.changePercent == null ? '등락률 없음' : `${quote.changePercent}%`,
      required: true,
    },
    {
      label: '리스크 보정 점수',
      passed: score >= 70,
      detail: `${score}점`,
      required: true,
    },
    {
      label: '과열 점검 (20일 이평 이격도 실측)',
      passed: !(overheating === true && quote?.changePercent >= 5),
      detail: overheating == null ? '과거 시세 미확인' : overheating ? '과열 신호 있음' : '과열 신호 낮음',
      required: true,
    },
  ]
  return {
    passed: checks.filter((item) => item.required).every((item) => item.passed),
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

// 시장(국내/해외)만 우선 적용해 후보군을 뽑는다. 상세옵션·투자기간까지 한번에 걸러버리면
// 후보 풀이 너무 좁아져("일반주식"만 4개뿐이던 것처럼) 조건에 맞는 게 5개가 안 될 수 있다.
// 시장은 통화·거래소가 달라 결과가 섞이면 사용자가 혼란스러우니 유일하게 항상 지키는 조건으로 두고,
// 상세옵션·투자기간은 아래 matchTier로 "우선순위"로만 반영해 부족하면 넓혀서 채운다.
function candidatesForRegion(marketScope) {
  return mockRecommendationCandidates.filter((item) => marketScope === 'all' || item.region === marketScope)
}

// 0 = 상세옵션·투자기간까지 정확히 일치, 1 = 상세옵션만 일치(투자기간 완화), 2 = 시장만 일치(둘 다 완화).
// 정렬 시 tier가 먼저 오고, 같은 tier 안에서는 점수 순으로 정렬되므로 정확히 일치하는 후보가 항상 우선한다.
function matchTierFor(candidate, productType, horizonType) {
  const matchesProduct = productType === 'all' || candidate.productType === productType
  const matchesHorizon = horizonType === 'all' || candidate.horizonType === horizonType
  if (matchesProduct && matchesHorizon) return 0
  if (matchesProduct) return 1
  return 2
}

const MATCH_TIER_LABELS = {
  0: null,
  1: '선택하신 투자 기간과는 다르지만 조건을 넓혀 포함한 후보입니다.',
  2: '선택하신 상세옵션·투자 기간과는 다르지만 조건을 넓혀 포함한 후보입니다.',
}

// 큐레이션된 32개 종목만으로는 "시장 전체에서 오르는 종목을 찾아준다"는 약속을 지킬 수 없다 —
// 그래서 국내(코스피+코스닥)·해외 증시 전체를 실시간으로 스캔한 등락률 상위 종목(getStockMovers)도
// 후보에 합친다. 이 종목들은 공식 API가 그날 실제로 찾아낸 결과이지, 미리 정해둔 목록이 아니다.
// 다만 스캔 결과에는 뉴스·과거 지표까지 개별 조회하면 API 호출량이 너무 커지므로(무료 API 쿼터 문제),
// 시세만 그대로 쓰고 뉴스·기술 지표는 비워둔다 — '공식 뉴스'는 이미 참고 신호일 뿐이라 문제없다.
function moverToCandidate(mover) {
  const isDomestic = mover.region === 'domestic'
  return {
    id: `mover-${mover.symbol}`,
    name: mover.name || mover.symbol,
    code: mover.symbol,
    symbol: mover.symbol,
    region: mover.region,
    productType: 'surge',
    horizonType: 'daytrade',
    holdingPeriod: '당일~3거래일',
    tradeStyle: '시장 전체 스캔에서 오늘 등락률 상위로 포착된 종목을 노리는 공격형 단기 매매',
    marketType: mover.region,
    currentPrice: mover.price,
    score: null,
    reason: '오늘 실시간 등락률 상위 종목으로 공식 API 스캔에서 확인됐습니다. (사전 큐레이션 종목이 아님)',
    buyRange: formatAmount(mover.price * 0.985, !isDomestic) + ' ~ ' + formatAmount(mover.price, !isDomestic),
    takeProfitRange: formatAmount(mover.price * 1.08, !isDomestic) + ' ~ ' + formatAmount(mover.price * 1.15, !isDomestic),
    stopLossRange: formatAmount(mover.price * 0.95, !isDomestic) + ' 이탈',
    riskFactors: ['실시간 스캔 종목이라 재무·이슈 배경이 확인되지 않음', '변동성 매우 높음', '손절 기준 필수'],
    criteria: ['실시간 등락률 상위(시장 전체 스캔)', '거래량 변화', '리스크'],
    isDynamicMover: true,
  }
}

// 접미사(.KS/.KQ) 유무와 무관하게 같은 종목이면 하나로 합친다 — 큐레이션 목록에 이미 있는 종목이
// 오늘의 급등 스캔에도 걸렸을 때 카드가 중복으로 뜨지 않도록.
function symbolDedupeKey(symbol) {
  return String(symbol || '').replace(/\.(KS|KQ)$/, '')
}

function dedupeCandidatesBySymbol(candidates) {
  const seen = new Set()
  const result = []
  for (const candidate of candidates) {
    const key = symbolDedupeKey(candidate.symbol)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(candidate)
  }
  return result
}

export async function getCurrentRecommendations(option = { marketScope: 'all', productType: 'all', horizonType: 'all' }) {
  await delay(450)

  const basedAt = new Date()
  const normalized = normalizeOption(option)
  // 상세옵션·투자기간이 아니라 "시장"만으로 먼저 후보군을 뽑는다 — 이 후보군 안에서 정확히 일치하는
  // 후보를 우선 랭킹하고, 5개가 안 채워지면 같은 시장 안에서 조건을 넓혀 채운다(아래 matchTierFor).
  const regionCandidates = candidatesForRegion(normalized.marketScope)
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
  // symbols/names는 반드시 같은 candidate 집합에서 같은 순서로 뽑아야 백엔드에서 1:1로 대응된다.
  const symbolCandidates = regionCandidates.filter((candidate) => candidate.symbol)
  const symbols = symbolCandidates.map((candidate) => candidate.symbol)
  const names = symbolCandidates.map((candidate) => candidate.name)
  let quotes
  let newsItems
  let indicatorsList
  let movers
  try {
    ;[quotes, newsItems, indicatorsList, movers] = await Promise.all([
      getStockQuotes(symbols),
      getStockNews(symbols, names),
      getStockIndicators(symbols),
      // 시장 전체 실시간 스캔. 프로바이더가 실패해도 빈 배열만 돌아오고 예외를 던지지 않으므로
      // (getStockMovers 구현 참고) 큐레이션 후보 검증에는 영향이 없다.
      getStockMovers(normalized.marketScope),
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

  // 실시간 스캔 결과(movers)는 상세옵션이 '전체' 또는 '급등 가능주'일 때만 후보에 합친다.
  // 예를 들어 사용자가 '레버리지 ETF'를 골랐는데 부족하다고 아무 급등주나 대신 채우면 상품 성격이
  // 완전히 달라져 오히려 혼란스럽다 — 조건 완화(matchTier)는 같은 상품군 안에서만 의미가 있다.
  const includeMovers = normalized.productType === 'all' || normalized.productType === 'surge'
  const moverCandidates = includeMovers
    ? (movers || []).filter((m) => m && !m.error && m.price != null).map(moverToCandidate)
    : []
  const combinedCandidates = dedupeCandidatesBySymbol([...regionCandidates, ...moverCandidates])
  // 큐레이션 종목은 getStockQuotes로 받은 실측 시세를 그대로 쓰고, 스캔으로만 발견된 종목은
  // 스캔 응답의 시세를 quoteMap에 채워 넣는다 — 둘 다 결국 공식 API에서 나온 실측값이다.
  for (const mover of moverCandidates.length ? movers : []) {
    if (!mover || mover.error || mover.price == null) continue
    if (quoteMap.has(mover.symbol)) continue
    quoteMap.set(mover.symbol, {
      symbol: mover.symbol,
      name: mover.name,
      price: mover.price,
      previousClose: null,
      change: null,
      changePercent: mover.changePercent ?? null,
      volume: mover.volume ?? null,
      currency: mover.region === 'domestic' ? 'KRW' : 'USD',
      source: mover.source,
    })
  }

  const { productType, horizonType } = normalized
  const verified = combinedCandidates
    .filter((candidate) => quoteMap.has(candidate.symbol))
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
      return {
        candidate,
        quote,
        indicators,
        candidateNews,
        adjustedScore: feedback.adjustedScore,
        rawAdjustedScore: feedback.rawAdjustedScore,
        matchTier: matchTierFor(candidate, productType, horizonType),
      }
    })
    .filter(({ candidate, quote, adjustedScore, candidateNews, indicators }) =>
      buildQuantChecks(candidate, quote, adjustedScore, candidateNews, indicators).passed
    )
    // tier(정확히 일치 → 조건 완화) 우선, 같은 tier 안에서는 소수점까지 유지한 실측 기반 점수
    // (rawAdjustedScore)로 정렬 — 동점 확률이 거의 없고, 남는 동점은 그날의 실측 등락률·거래량
    // 변화율 크기로, 그래도 같으면 배열 순서가 아니라 종목명으로 가른다(항상 같은 결과가 나오지 않도록).
    .sort((a, b) => {
      if (a.matchTier !== b.matchTier) return a.matchTier - b.matchTier
      if (b.rawAdjustedScore !== a.rawAdjustedScore) return b.rawAdjustedScore - a.rawAdjustedScore
      const changeDiff = Math.abs(b.quote?.changePercent ?? 0) - Math.abs(a.quote?.changePercent ?? 0)
      if (changeDiff !== 0) return changeDiff
      const volumeDiff = Math.abs(b.indicators?.volumeChangeRate ?? 0) - Math.abs(a.indicators?.volumeChangeRate ?? 0)
      if (volumeDiff !== 0) return volumeDiff
      return a.candidate.name.localeCompare(b.candidate.name)
    })

  const ranked = verified
    .slice(0, 5)
    .map(({ candidate, quote, candidateNews, indicators, matchTier }, index) =>
      mapCandidateToRecommendation(candidate, index + 1, option, basedAt, quote, candidateNews, indicators, matchTier)
    )

  if (ranked.length === 0) {
    throw createRecommendationError(
      RECOMMENDATION_ERROR_CODES.NO_VERIFIED_CANDIDATE,
      '정식 시세·리스크 검증을 통과한 종목이 없어 이번 조건에서는 추천을 생성하지 않았습니다.'
    )
  }

  return {
    option: normalized,
    optionLabel: getOptionLabel(option),
    basedAt: formatDateTime(basedAt),
    recommendations: ranked,
    // 조건을 넓혀서라도 5개를 채우려 했지만, 그 시장 안에 검증 통과 후보 자체가 5개 미만이었던 경우.
    shortOfFive: ranked.length < 5,
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
