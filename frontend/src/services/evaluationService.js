import { mockActualPriceResults, mockFeedbackRules } from '../data/mockEvaluationResults'
import { mockRecommendationCandidates } from '../data/mockRecommendations'
import { updateRecommendationRules } from './recommendationService'

function parseFirstNumber(value) {
  if (typeof value === 'number') return value
  const match = String(value).replace(/,/g, '').match(/[\d.]+/)
  return match ? Number(match[0]) : 0
}

function getTargetPrice(rangeText) {
  return parseFirstNumber(rangeText)
}

export async function fetchActualPriceResult(recommendation) {
  const mock = mockActualPriceResults[recommendation.sourceCandidateId]
  if (mock) return mock

  const base = Number(recommendation.recommendedPrice) || 100
  return {
    nextOpen: Number((base * 1.004).toFixed(2)),
    nextHigh: Number((base * 1.024).toFixed(2)),
    nextLow: Number((base * 0.988).toFixed(2)),
    nextClose: Number((base * 1.01).toFixed(2)),
  }
}

export function analyzeFailedRecommendation(recommendation, actualResult) {
  const causes = []
  const { signals } = recommendation

  if (signals?.overheating || signals?.newsHeat === 'hot') causes.push('뉴스/테마 과열 가능성')
  if (signals?.foreignInstitutionFlow === 'negative' || signals?.foreignInstitutionFlow === 'mixed') causes.push('수급 확신 부족')
  if (signals?.overseasPeerFlow === 'negative' || signals?.overseasPeerFlow === 'mixed') causes.push('관련 해외 종목 흐름 불일치')
  if (signals?.gapUpRate >= 1.5) causes.push('진입 가격이 갭상승 이후 높았을 가능성')
  if (signals?.volumeChangeRate < 10) causes.push('거래량 증가가 약함')
  if (actualResult.nextLow <= getTargetPrice(recommendation.stopLossRange)) causes.push('손절 기준 도달')
  if (recommendation.originalScore - recommendation.score >= 5) causes.push('초기 추천 점수 대비 보정 요인 큼')

  return causes.length ? causes : ['하락 원인이 명확하지 않아 추가 뉴스/수급 확인 필요']
}

export function evaluateRecommendationResult(recommendation, actualResult) {
  const takeProfitTarget = getTargetPrice(recommendation.takeProfitRange)
  const stopLossTarget = getTargetPrice(recommendation.stopLossRange)
  const recommendedPrice = Number(recommendation.recommendedPrice)
  const returnRate = recommendedPrice
    ? Number((((actualResult.nextClose - recommendedPrice) / recommendedPrice) * 100).toFixed(2))
    : 0

  const takeProfitReached = actualResult.nextHigh >= takeProfitTarget
  const stopLossReached = actualResult.nextLow <= stopLossTarget
  let status = 'hold'

  if (takeProfitReached) status = 'success'
  if (stopLossReached) status = 'fail'
  if (!takeProfitReached && !stopLossReached && returnRate < 0) status = 'caution'

  return {
    recommendation,
    actualResult,
    returnRate,
    takeProfitReached,
    stopLossReached,
    status,
    failureAnalysis: status === 'fail' || status === 'caution'
      ? analyzeFailedRecommendation(recommendation, actualResult)
      : [],
  }
}

export async function generateDailyPerformanceReport(recommendations = []) {
  const fallbackRecommendations = mockRecommendationCandidates.slice(0, 3).map((item, index) => ({
    recommendationId: `mock-prev-${item.code}`,
    rank: index + 1,
    name: item.name,
    code: item.code,
    marketType: item.marketType,
    marketLabel: item.marketType,
    recommendationBase: '현재',
    recommendedPrice: item.currentPrice,
    score: item.score,
    originalScore: item.score,
    reason: item.reason,
    buyRange: item.buyRange,
    takeProfitRange: item.takeProfitRange,
    stopLossRange: item.stopLossRange,
    riskFactors: item.riskFactors,
    criteria: item.criteria,
    signals: item.signals,
    sourceCandidateId: item.id,
  }))

  const targets = recommendations.length ? recommendations : fallbackRecommendations
  const evaluated = await Promise.all(
    targets.map(async (recommendation) => {
      const actual = await fetchActualPriceResult(recommendation)
      return evaluateRecommendationResult(recommendation, actual)
    })
  )

  const successCount = evaluated.filter((item) => item.status === 'success').length
  const failCount = evaluated.filter((item) => item.status === 'fail').length
  const stopLossCount = evaluated.filter((item) => item.stopLossReached).length
  const averageReturn = evaluated.length
    ? Number((evaluated.reduce((sum, item) => sum + item.returnRate, 0) / evaluated.length).toFixed(2))
    : 0
  const successRate = evaluated.length ? Math.round((successCount / evaluated.length) * 100) : 0
  const failureConditions = evaluated
    .flatMap((item) => item.failureAnalysis)
    .reduce((acc, cause) => {
      acc[cause] = (acc[cause] || 0) + 1
      return acc
    }, {})
  const mostFailedCondition = Object.entries(failureConditions).sort((a, b) => b[1] - a[1])[0]?.[0] || '아직 뚜렷한 실패 조건 없음'
  const updatedRules = updateRecommendationRules(mockFeedbackRules, evaluated)

  return {
    previousResults: evaluated,
    successRate,
    averageReturn,
    stopLossCount,
    failCount,
    mostFailedCondition,
    improvedPoints: updatedRules.improvedPoints,
  }
}
