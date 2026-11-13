const MARKET_NAMES = { KOSPI: '코스피', KOSDAQ: '코스닥', US: '미국' }

export function getScanWarnings(scan) {
  return scan.markets.filter((market) => market.status !== 'success').map((market) => {
    const name = MARKET_NAMES[market.market] || '시장'
    switch (market.status) {
      case 'empty': return `${name}: 스캔 요청은 성공했지만 반환된 종목이 없습니다.`
      case 'partial': return `${name}: 응답 일부를 검증하지 못해 정상 종목만 반영했습니다.`
      case 'not_configured': return `${name}: 스캔 연결 설정이 없어 조회하지 못했습니다.`
      default: return `${name}: 시장 스캔에 실패했습니다. 잠시 후 다시 시도해 주세요.`
    }
  })
}
