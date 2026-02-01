import { getHoliday } from './holidays'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function getDaysInMonth(year, month) {
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const days = last.getDate()
  const startWeekday = first.getDay()
  return { days, startWeekday }
}

/** 일정이 있는 날짜에 숫자 주변 투명 불규칙 동그라미용 border-radius 값 (일정별로 조금씩 다르게) */
function irregularRadius(index) {
  const bases = ['52% 48% 55% 45%', '48% 52% 45% 55%', '55% 45% 48% 52%', '45% 55% 52% 48%']
  return bases[index % bases.length]
}

/** 이벤트를 날짜별로 펼침. date~endDate(없으면 date만) 기간 내 해당 월에 속한 날짜에 모두 표시 */
function eventsByDate(events, year, month) {
  const byDate = {}
  if (!events || !events.length) return byDate
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0)

  events.forEach((ev) => {
    const start = parseDate(ev.date)
    const end = ev.endDate ? parseDate(ev.endDate) : start
    if (!start || !end || end < start) {
      const d = ev.date
      if (!byDate[d]) byDate[d] = []
      byDate[d].push(ev)
      return
    }
    const from = start < monthStart ? monthStart : start
    const to = end > monthEnd ? monthEnd : end
    const fromTime = from.getTime()
    const toTime = to.getTime()
    for (let t = fromTime; t <= toTime; t += 86400000) {
      const d = new Date(t)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!byDate[key]) byDate[key] = []
      byDate[key].push(ev)
    }
  })
  return byDate
}

function parseDate(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null
  return new Date(y, m - 1, d)
}

export default function CalendarGrid({ year, month, events = [], styleId = 'default', className = '', monthLabel }) {
  const { days, startWeekday } = getDaysInMonth(year, month)
  const byDate = eventsByDate(events, year, month)
  const title = monthLabel != null ? monthLabel : `${month}월`
  const cells = []
  for (let i = 0; i < startWeekday; i++) {
    cells.push(<div key={`empty-${i}`} className="cal-cell cal-cell-empty" aria-hidden />)
  }
  for (let d = 1; d <= days; d++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayEvents = byDate[dateKey] || []
    const weekday = (startWeekday + (d - 1)) % 7
    const holiday = getHoliday(year, month, d)
    const isSun = weekday === 0
    const isSat = weekday === 6
    const dayClasses = [
      'cal-cell',
      'cal-cell-day',
      isSun && 'cal-sun',
      isSat && 'cal-sat',
      holiday && 'cal-holiday',
    ].filter(Boolean).join(' ')
    const eventColor = dayEvents.length > 0 ? (dayEvents[0].color || '#3b82f6') : null
    cells.push(
      <div key={d} className={dayClasses}>
        {holiday?.lunar && <span className="cal-cell-lunar">{holiday.lunar}</span>}
        <span className="cal-cell-num-wrap">
          <span
            className={`cal-cell-num${eventColor ? ' has-event' : ''}`}
            style={
              eventColor
                ? {
                    '--event-color': eventColor,
                    '--event-radius': irregularRadius(dayEvents[0].id ?? 0),
                  }
                : undefined
            }
          >
            {d}
          </span>
        </span>
        {holiday && <span className="cal-cell-holiday-name">{holiday.name}</span>}
        {dayEvents.length > 0 && (
          <span className="cal-cell-events-aria" title={dayEvents.map((e) => e.content).join(', ')} aria-hidden />
        )}
      </div>
    )
  }

  return (
    <div className={`calendar-grid calendar-style-${styleId} ${className}`.trim()} role="grid" aria-label={`${year}년 ${month}월 달력`}>
      <div className="cal-month-title">{title}</div>
      <div className="cal-head" role="row">
        {WEEKDAYS.map((w) => (
          <div key={w} className="cal-head-cell" role="columnheader">{w}</div>
        ))}
      </div>
      <div className="cal-body">
        {cells}
      </div>
    </div>
  )
}
