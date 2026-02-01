import { useState, useRef, useEffect } from 'react'
import { toPng } from 'html-to-image'
import CalendarGrid from '../components/calendar/CalendarGrid'
import './CalendarPage.css'

const STYLES = [
  { id: 'default', label: '기본' },
  { id: 'modern', label: '모던' },
  { id: 'dark', label: '다크' },
  { id: 'grid', label: '그리드' },
]

/** 다운로드 이미지 비율 9:16 고정 */
const EXPORT_WIDTH = 1080
const EXPORT_HEIGHT = 1920

const PRESET_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#06b6d4', '#f97316']

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

function getDefaultDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [styleId, setStyleId] = useState('default')
  const [events, setEvents] = useState([])
  const [eventDate, setEventDate] = useState(getDefaultDate())
  const [eventEndDate, setEventEndDate] = useState('')
  const [eventContent, setEventContent] = useState('')
  const [eventColor, setEventColor] = useState(PRESET_COLORS[0])
  const [exporting, setExporting] = useState(false)
  const [calendarImageDataUrl, setCalendarImageDataUrl] = useState(null)
  const exportRef = useRef(null)
  const nextIdRef = useRef(1)
  const colorDropdownRef = useRef(null)
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false)

  useEffect(() => {
    if (!colorDropdownOpen) return
    const handleClickOutside = (e) => {
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(e.target)) {
        setColorDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [colorDropdownOpen])

  /* 달력을 이미지로 렌더링해 우클릭 저장 가능하게 */
  useEffect(() => {
    const t = setTimeout(() => {
      if (!exportRef.current) return
      const opt = {
        pixelRatio: 2,
        width: EXPORT_WIDTH,
        height: EXPORT_HEIGHT,
        style: { width: EXPORT_WIDTH, height: EXPORT_HEIGHT },
      }
      toPng(exportRef.current, opt)
        .then(setCalendarImageDataUrl)
        .catch(() => setCalendarImageDataUrl(null))
    }, 200)
    return () => clearTimeout(t)
  }, [year, month, events, styleId])

  const addEvent = () => {
    const content = eventContent.trim()
    if (!content) return
    const endDate = eventEndDate && eventEndDate >= eventDate ? eventEndDate : eventDate
    const id = nextIdRef.current++
    setEvents((prev) => [...prev, { id, date: eventDate, endDate, content, color: eventColor }])
    setEventContent('')
    setEventEndDate('')
  }

  const removeEvent = (id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  const goPrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else {
      setMonth((m) => m - 1)
    }
  }
  const goNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const handleDownload = () => {
    if (!exportRef.current) return
    setExporting(true)
    const opt = {
      pixelRatio: 2,
      width: EXPORT_WIDTH,
      height: EXPORT_HEIGHT,
      style: { width: EXPORT_WIDTH, height: EXPORT_HEIGHT },
    }
    toPng(exportRef.current, opt)
      .then((dataUrl) => {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `calendar-${year}-${String(month).padStart(2, '0')}.png`
        a.click()
      })
      .catch((err) => console.error('Export failed:', err))
      .finally(() => setExporting(false))
  }

  return (
    <div className="calendar-page">
      <header className="calendar-header">
        <h1>자동 달력만들기</h1>
        <p className="calendar-sub">스타일을 고르고 일정을 넣어 인스타용 달력 이미지를 만드세요.</p>
      </header>

      <section className="calendar-control card">
        <div className="calendar-month-nav">
          <button type="button" className="month-nav-btn month-nav-prev" onClick={goPrevMonth} aria-label="이전 달">
            ‹
          </button>
          <h2 className="section-title calendar-month-title">{year}년 {MONTH_NAMES[month - 1]}</h2>
          <button type="button" className="month-nav-btn month-nav-next" onClick={goNextMonth} aria-label="다음 달">
            ›
          </button>
        </div>
        <div className="style-select">
          <span className="style-label">스타일</span>
          <div className="style-btns" role="group" aria-label="달력 스타일">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`style-btn ${styleId === s.id ? 'active' : ''}`}
                onClick={() => setStyleId(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="calendar-preview card">
        {calendarImageDataUrl ? (
          <img
            src={calendarImageDataUrl}
            alt={`${year}년 ${month}월 달력`}
            className="calendar-preview-img"
            title="우클릭 → 이미지 저장으로 다운로드"
          />
        ) : (
          <CalendarGrid year={year} month={month} events={events} styleId={styleId} monthLabel={`${month}월`} />
        )}
      </section>

      <section className="event-section card">
        <h2 className="section-title">일정 추가</h2>
        <div className="event-form">
          <div className="event-form-block">
            <label className="event-field">
              <span className="event-field-label">시작일</span>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="event-input"
              />
            </label>
            <label className="event-field">
              <span className="event-field-label">종료일</span>
              <input
                type="date"
                value={eventEndDate}
                onChange={(e) => setEventEndDate(e.target.value)}
                min={eventDate}
                className="event-input"
                placeholder="같은 날이면 비움"
              />
            </label>
          </div>
          <div className="event-form-block event-form-block-content">
            <label className="event-field event-field-content">
              <span className="event-field-label">내용</span>
              <input
                type="text"
                value={eventContent}
                onChange={(e) => setEventContent(e.target.value)}
                placeholder="일정 내용을 입력하세요"
                className="event-input"
                onKeyDown={(e) => e.key === 'Enter' && addEvent()}
              />
            </label>
            <div className="event-field event-field-color-dropdown" ref={colorDropdownRef}>
              <span className="event-field-label">색상</span>
              <button
                type="button"
                className="color-trigger"
                style={{ backgroundColor: eventColor }}
                onClick={() => setColorDropdownOpen((v) => !v)}
                aria-expanded={colorDropdownOpen}
                aria-haspopup="listbox"
                aria-label="색상 선택"
                title={eventColor}
              />
              {colorDropdownOpen && (
                <div className="color-dropdown" role="listbox" aria-label="색상 목록">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="option"
                      aria-selected={eventColor === c}
                      className={`color-dropdown-swatch ${eventColor === c ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => {
                        setEventColor(c)
                        setColorDropdownOpen(false)
                      }}
                      title={c}
                    />
                  ))}
                  <div className="color-dropdown-custom">
                    <input
                      type="color"
                      value={eventColor}
                      onChange={(e) => {
                        setEventColor(e.target.value)
                      }}
                      className="color-input-native"
                      title="직접 선택"
                    />
                    <span className="color-dropdown-custom-label">직접 선택</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="event-form-actions">
            <button
              type="button"
              className="download-btn event-download-btn"
              onClick={handleDownload}
              disabled={exporting}
            >
              {exporting ? '생성 중…' : '다운로드'}
            </button>
            <button type="button" className="add-event-btn" onClick={addEvent}>
              일정 추가
            </button>
          </div>
        </div>

        {events.length > 0 && (
          <div className="event-list-wrap">
            <h3 className="event-list-title">추가된 일정</h3>
            <ul className="event-list">
              {events.map((ev) => (
                <li key={ev.id} className="event-item">
                  <span className="event-item-date">
                    {ev.endDate && ev.endDate !== ev.date ? `${ev.date} ~ ${ev.endDate}` : ev.date}
                  </span>
                  <span className="event-item-content" style={{ borderLeftColor: ev.color }}>{ev.content}</span>
                  <button type="button" className="event-item-remove" onClick={() => removeEvent(ev.id)} aria-label="삭제">×</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div
        ref={exportRef}
        className="calendar-export-target"
        style={{ width: EXPORT_WIDTH, height: EXPORT_HEIGHT }}
        aria-hidden
      >
        <div className={`calendar-style-${styleId}`}>
          <div className="cal-export-title">{month}월</div>
          <CalendarGrid year={year} month={month} events={events} styleId={styleId} className="cal-export-grid" monthLabel={`${month}월`} />
        </div>
      </div>
    </div>
  )
}
