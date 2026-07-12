export const mockActualPriceResults = {
  'kr-005930': {
    nextOpen: 78500,
    nextHigh: 82100,
    nextLow: 77400,
    nextClose: 81600,
  },
  'us-nvda': {
    nextOpen: 1058.2,
    nextHigh: 1082.4,
    nextLow: 996.2,
    nextClose: 1008.1,
  },
  'lev-tqqq': {
    nextOpen: 64.4,
    nextHigh: 66.2,
    nextLow: 60.1,
    nextClose: 61.0,
  },
  'etf-spy': {
    nextOpen: 530.1,
    nextHigh: 542.3,
    nextLow: 526.2,
    nextClose: 540.8,
  },
  'inv-sqqq': {
    nextOpen: 9.68,
    nextHigh: 10.45,
    nextLow: 9.5,
    nextClose: 10.22,
  },
}

export const mockFeedbackRules = {
  gapUpVolumeDropPenalty: 6,
  hotNewsOnlyPenalty: 5,
  foreignInstitutionSellPenalty: 7,
  leveragedVolatilityPenalty: 4,
  excessivePreviousRisePenalty: 5,
  repeatedFailurePenalty: 3,
  improvedPoints: [
    '갭상승 후 거래량 둔화 후보는 추천 점수를 낮춤',
    '레버리지 ETF에는 변동성 가중치를 적용',
    '외국인/기관 동반 매도 신호는 리스크로 반영',
  ],
}
