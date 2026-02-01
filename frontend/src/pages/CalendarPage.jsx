import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { toPng } from 'html-to-image'
import CalendarGrid from '../components/calendar/CalendarGrid'
import './CalendarPage.css'

const STYLES = [
  { id: 'modern', label: '모던' },
  { id: 'minimal', label: '미니멀' },
  { id: 'colorful', label: '컬러풀' },
  { id: 'dark', label: '다크' },
  { id: 'grid', label: '그리드' },
]

const RATIOS = [
  { id: '1_1', label: '1:1', width: 1080, height: 1080 },
  { id: '4_5', label: '4:5', width: 1080, height: 1350 },
  { id: '9_16', label: '9:16', width: 1080, height: 1920 },
]

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
  const [styleId, setStyleId] = useState('modern')
  const [events, setEvents] = useState([])
  const [eventDate, setEventDate] = useState(getDefaultDate())
  const [eventEndDate, setEventEndDate] = useState('')
  const [eventContent, setEventContent] = useState('')
  const [eventColor, setEventColor] = useState(PRESET_COLORS[0])
  const [ratioId, setRatioId] = useState('1_1')
  const [exporting, setExporting] = useState(false)
  const [appliedSnapshot, setAppliedSnapshot] = useState(null)
  const [reflectMessage, setReflectMessage] = useState('')
  const exportRef = useRef(null)
  const nextIdRef = useRef(1)

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

  const ratioConfig = RATIOS.find((r) => r.id === ratioId) || RATIOS[0]
  const snap = appliedSnapshot || { events, styleId, year, month, ratioId }
  const snapRatio = RATIOS.find((r) => r.id === snap.ratioId) || RATIOS[0]

  const handleReflect = () => {
    setAppliedSnapshot({
      events: events.map((e) => ({ ...e })),
      styleId,
      year,
      month,
      ratioId,
    })
    setReflectMessage('반영되었습니다.')
    setTimeout(() => setReflectMessage(''), 2000)
  }

  const handleDownload = () => {
    if (!exportRef.current) return
    setExporting(true)
    const opt = {
      pixelRatio: 2,
      width: snapRatio.width,
      height: snapRatio.height,
      style: { width: snapRatio.width, height: snapRatio.height },
    }
    toPng(exportRef.current, opt)
      .then((dataUrl) => {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `calendar-${snap.year}-${String(snap.month).padStart(2, '0')}.png`
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
        <Link to="/" className="back-to-home">← 홈</Link>
      </header>

      <section className="calendar-control card">
        <h2 className="section-title">{year}년 {MONTH_NAMES[month - 1]}</h2>
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
        <CalendarGrid year={year} month={month} events={events} styleId={styleId} />
      </section>

      <section className="event-section card">
        <h2 className="section-title">일정 추가</h2>
        <div className="event-form">
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
            <span className="event-field-label">종료일 (선택, 기간일 때만)</span>
            <input
              type="date"
              value={eventEndDate}
              onChange={(e) => setEventEndDate(e.target.value)}
              min={eventDate}
              className="event-input"
              placeholder="같은 날이면 비움"
            />
          </label>
          <label className="event-field">
            <span className="event-field-label">내용</span>
            <input
              type="text"
              value={eventContent}
              onChange={(e) => setEventContent(e.target.value)}
              placeholder="일정 내용"
              className="event-input"
              onKeyDown={(e) => e.key === 'Enter' && addEvent()}
            />
          </label>
          <label className="event-field">
            <span className="event-field-label">색상</span>
            <div className="color-row">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch ${eventColor === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setEventColor(c)}
                  title={c}
                  aria-label={`색상 ${c}`}
                />
              ))}
              <input
                type="color"
                value={eventColor}
                onChange={(e) => setEventColor(e.target.value)}
                className="color-input"
                title="색상 선택"
              />
            </div>
          </label>
          <button type="button" className="add-event-btn" onClick={addEvent}>
            일정 추가
          </button>
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

      <section className="export-section card">
        <h2 className="section-title">이미지 비율</h2>
        <div className="ratio-btns" role="group" aria-label="이미지 비율">
          {RATIOS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`ratio-btn ${ratioId === r.id ? 'active' : ''}`}
              onClick={() => setRatioId(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="export-actions">
          <button type="button" className="reflect-btn" onClick={handleReflect}>
            반영하기
          </button>
          <button
            type="button"
            className="download-btn"
            onClick={handleDownload}
            disabled={exporting}
          >
            {exporting ? '생성 중…' : '다운로드'}
          </button>
          {reflectMessage && <span className="reflect-message">{reflectMessage}</span>}
        </div>
      </section>

      <div
        ref={exportRef}
        className="calendar-export-target"
        style={{
          width: snapRatio.width,
          height: snapRatio.height,
        }}
        aria-hidden
      >
        <div className={`calendar-style-${snap.styleId}`}>
          <div className="cal-export-title">{snap.year}년 {MONTH_NAMES[snap.month - 1]}</div>
          <CalendarGrid year={snap.year} month={snap.month} events={snap.events} styleId={snap.styleId} className="cal-export-grid" />
        </div>
      </div>
    </div>
  )
}
