const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function getDaysInMonth(year, month) {
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const days = last.getDate()
  const startWeekday = first.getDay()
  return { days, startWeekday }
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

export default function CalendarGrid({ year, month, events = [], styleId = 'minimal', className = '' }) {
  const { days, startWeekday } = getDaysInMonth(year, month)
  const byDate = eventsByDate(events, year, month)
  const cells = []
  for (let i = 0; i < startWeekday; i++) {
    cells.push(<div key={`empty-${i}`} className="cal-cell cal-cell-empty" aria-hidden />)
  }
  for (let d = 1; d <= days; d++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayEvents = byDate[dateKey] || []
    cells.push(
      <div key={d} className="cal-cell cal-cell-day">
        <span className="cal-cell-num">{d}</span>
        {dayEvents.length > 0 && (
          <div className="cal-cell-events">
            {dayEvents.slice(0, 3).map((ev, i) => (
              <span
                key={ev.id != null ? ev.id : i}
                className="cal-event-dot"
                style={{ backgroundColor: ev.color || '#3b82f6' }}
                title={ev.content}
              />
            ))}
            {dayEvents.length > 3 && (
              <span className="cal-event-more">+{dayEvents.length - 3}</span>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`calendar-grid calendar-style-${styleId} ${className}`.trim()} role="grid" aria-label={`${year}년 ${month}월 달력`}>
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
