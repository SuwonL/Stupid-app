/**
 * 한국 공휴일 (연도별 + 고정). 키: 'YYYY-MM-DD', 값: { name, lunar? }
 * 설날·추석은 매년 달라지므로 연도별로 등록.
 */
const HOLIDAYS_BY_DATE = {
  '2025-01-01': { name: '신정', lunar: null },
  '2025-01-28': { name: '설날', lunar: '1.1' },
  '2025-01-29': { name: '설날', lunar: null },
  '2025-01-30': { name: '설날', lunar: null },
  '2025-03-01': { name: '삼일절', lunar: null },
  '2025-03-03': { name: '대통령선거일', lunar: null },
  '2025-05-05': { name: '어린이날', lunar: null },
  '2025-05-06': { name: '대체휴일', lunar: null },
  '2025-06-06': { name: '현충일', lunar: null },
  '2025-08-15': { name: '광복절', lunar: null },
  '2025-10-03': { name: '개천절', lunar: null },
  '2025-10-05': { name: '추석', lunar: null },
  '2025-10-06': { name: '추석', lunar: null },
  '2025-10-07': { name: '추석', lunar: null },
  '2025-10-09': { name: '한글날', lunar: null },
  '2025-12-25': { name: '크리스마스', lunar: null },
  '2026-01-01': { name: '신정', lunar: null },
  '2026-02-16': { name: '설날', lunar: '1.1' },
  '2026-02-17': { name: '설날', lunar: null },
  '2026-02-18': { name: '설날', lunar: null },
  '2026-03-01': { name: '삼일절', lunar: null },
  '2026-05-05': { name: '어린이날', lunar: null },
  '2026-06-06': { name: '현충일', lunar: null },
  '2026-08-15': { name: '광복절', lunar: null },
  '2026-10-03': { name: '개천절', lunar: null },
  '2026-09-24': { name: '추석', lunar: null },
  '2026-09-25': { name: '추석', lunar: null },
  '2026-09-26': { name: '추석', lunar: null },
  '2026-10-09': { name: '한글날', lunar: null },
  '2026-12-25': { name: '크리스마스', lunar: null },
}

export function getHoliday(year, month, day) {
  const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return HOLIDAYS_BY_DATE[key] || null
}
