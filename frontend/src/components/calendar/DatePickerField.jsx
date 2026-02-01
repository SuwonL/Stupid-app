import { useState, useRef, useEffect } from 'react'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

function getDaysInMonth(year, month) {
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  return { days: last.getDate(), startWeekday: first.getDay() }
}

function parseYMD(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null
  return { year: y, month: m, day: d }
}

function toYMD(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDisplay(str) {
  const p = parseYMD(str)
  if (!p) return ''
  return `${p.year}. ${p.month}. ${p.day}`
}

export default function DatePickerField({ value, onChange, min, max, placeholder = '날짜 선택', className = '' }) {
  const parsed = parseYMD(value)
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(parsed?.year ?? new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? new Date().getMonth() + 1)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const p = parseYMD(value)
    const minP = parseYMD(min)
    if (p) {
      setViewYear(p.year)
      setViewMonth(p.month)
    } else if (minP) {
      setViewYear(minP.year)
      setViewMonth(minP.month)
    }
  }, [open, value, min])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const t = setTimeout(() => {
      document.addEventListener('pointerdown', handleOutside)
    }, 150)
    return () => {
      clearTimeout(t)
      document.removeEventListener('pointerdown', handleOutside)
    }
  }, [open])

  const minParsed = parseYMD(min)
  const maxParsed = parseYMD(max)
  const { days, startWeekday } = getDaysInMonth(viewYear, viewMonth)

  const goPrev = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1)
      setViewMonth(12)
    } else setViewMonth((m) => m - 1)
  }
  const goNext = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1)
      setViewMonth(1)
    } else setViewMonth((m) => m + 1)
  }

  const isDisabled = (day) => {
    if (minParsed) {
      if (viewYear < minParsed.year) return true
      if (viewYear === minParsed.year && viewMonth < minParsed.month) return true
      if (viewYear === minParsed.year && viewMonth === minParsed.month && day < minParsed.day) return true
    }
    if (maxParsed) {
      if (viewYear > maxParsed.year) return true
      if (viewYear === maxParsed.year && viewMonth > maxParsed.month) return true
      if (viewYear === maxParsed.year && viewMonth === maxParsed.month && day > maxParsed.day) return true
    }
    return false
  }

  const selectDay = (day) => {
    const ymd = toYMD(viewYear, viewMonth, day)
    onChange(ymd)
    setOpen(false)
  }

  const displayValue = value ? formatDisplay(value) : ''

  return (
    <div className={`date-picker-field ${className}`.trim()} ref={ref}>
      <button
        type="button"
        className="date-picker-trigger"
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <span className={displayValue ? '' : 'date-picker-placeholder'}>{displayValue || placeholder}</span>
        <span className="date-picker-icon" aria-hidden>📅</span>
      </button>
      {open && (
        <div className="date-picker-dropdown" onPointerDown={(e) => e.stopPropagation()}>
          <div className="date-picker-header">
            <button type="button" className="date-picker-nav" onClick={goPrev} aria-label="이전 달">‹</button>
            <span className="date-picker-title">{viewYear}년 {MONTH_NAMES[viewMonth - 1]}</span>
            <button type="button" className="date-picker-nav" onClick={goNext} aria-label="다음 달">›</button>
          </div>
          <div className="date-picker-weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w} className="date-picker-weekday">{w}</span>
            ))}
          </div>
          <div className="date-picker-days">
            {Array.from({ length: startWeekday }, (_, i) => (
              <span key={`e-${i}`} className="date-picker-day date-picker-day-empty" />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const day = i + 1
              const disabled = isDisabled(day)
              const selected = parsed && parsed.year === viewYear && parsed.month === viewMonth && parsed.day === day
              const handleDaySelect = () => {
                if (!disabled) selectDay(day)
              }
              return (
                <button
                  key={day}
                  type="button"
                  className={`date-picker-day ${selected ? 'date-picker-day-selected' : ''} ${disabled ? 'date-picker-day-disabled' : ''}`}
                  disabled={disabled}
                  onClick={handleDaySelect}
                  onPointerDown={(e) => {
                    if (disabled) return
                    e.preventDefault()
                    handleDaySelect()
                  }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
