import { mockAfternoonBriefs, mockMorningBriefs, mockStockKnowledge } from '../data/mockStockMorningBrief'
import { getStockMarketStatus, getStockNews } from '../api'

function getDailyIndex(length) {
  const now = new Date()
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  return seed % length
}

function formatBaseTime(targetHour, now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d} ${String(targetHour).padStart(2, '0')}:00`
}

export function getBriefTargetTime(baseTime, now = new Date()) {
  const hour = baseTime === '15' ? 15 : 8
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0)
}

export function getRemainingTimeText(targetTime, now = new Date()) {
  const diffMs = targetTime.getTime() - now.getTime()
  if (diffMs <= 0) return ''
  const totalMinutes = Math.ceil(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes}분`
  return `${hours}시간 ${minutes}분`
}

export async function getMarketBrief(baseTime = '08') {
  const source = baseTime === '15' ? mockAfternoonBriefs : mockMorningBriefs
  const item = source[getDailyIndex(source.length)]
  const targetTime = getBriefTargetTime(baseTime)
  const now = new Date()
  const isReady = now >= targetTime
  const brief = {
    ...item,
    basedAt: formatBaseTime(baseTime === '15' ? 15 : 8),
    baseTime: baseTime === '15' ? '15:00' : '08:00',
    isReady,
    remainingTime: getRemainingTimeText(targetTime, now),
  }
  if (!isReady) return brief

  try {
    const status = await getStockMarketStatus(baseTime)
    let news = []
    try {
      news = await getStockNews(['005930.KS', 'NVDA', 'SPY'], ['삼성전자', 'NVIDIA', 'SPDR S&P 500 ETF'])
    } catch {
      news = []
    }
    return {
      ...brief,
      indices: mapMarketStatusToIndices(status.quotes, item.indices),
      news,
      officialThemeRecommendations: buildOfficialThemeRecommendations(status.quotes, news),
      liveSource: status.source,
    }
  } catch {
    return {
      ...brief,
      indices: [],
      news: [],
      liveSource: null,
      statusError: '정식 API로 주식현황을 검증하지 못했습니다. KIS/Polygon/Finnhub/Naver API 키를 설정해 주세요.',
    }
  }
}

function buildOfficialThemeRecommendations(quotes = [], news = []) {
  const quoteMap = new Map((quotes || []).filter((quote) => quote && !quote.error).map((quote) => [quote.symbol, quote]))
  const seen = new Set()
  return (news || [])
    .filter((item) => item?.symbol && quoteMap.has(item.symbol) && !seen.has(item.symbol))
    .map((item) => {
      seen.add(item.symbol)
      const quote = quoteMap.get(item.symbol)
      return {
        theme: '공식 뉴스 관심',
        name: quote.name || item.symbol,
        code: item.symbol,
        reason: `공식 뉴스 헤드라인과 검증된 시세가 함께 확인된 종목입니다. 현재 등락률: ${quote.changePercent == null ? '확인 필요' : `${quote.changePercent}%`}`,
        risk: '뉴스만으로 매수하지 말고 거래량, 손절 기준, 과열 여부를 함께 확인하세요.',
      }
    })
    .slice(0, 3)
}

export async function getMorningMarketBrief() {
  return getMarketBrief('08')
}

export async function getDailyStockKnowledge() {
  const startIndex = getDailyIndex(mockStockKnowledge.length)
  return Array.from({ length: Math.min(3, mockStockKnowledge.length) }, (_, offset) => ({
    ...mockStockKnowledge[(startIndex + offset) % mockStockKnowledge.length],
    basedAt: formatBaseTime(8),
  }))
}

function mapMarketStatusToIndices(quotes = [], fallback = []) {
  const labels = {
    '^KS11': 'KOSPI',
    '^KQ11': 'KOSDAQ',
    '^IXIC': 'NASDAQ',
    'KRW=X': '원/달러 환율',
  }
  const live = quotes
    .filter((quote) => quote && !quote.error && quote.price != null)
    .map((quote) => {
      const changeText = quote.changePercent == null
        ? ''
        : ` (${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent}%)`
      return {
        name: labels[quote.symbol] || quote.symbol,
        value: `${formatNumber(quote.price)}${changeText}`,
        tone: quote.changePercent > 0 ? 'positive' : quote.changePercent < 0 ? 'negative' : 'neutral',
      }
    })
  return live.length ? live : fallback
}

function formatNumber(value) {
  if (typeof value !== 'number') return value
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
