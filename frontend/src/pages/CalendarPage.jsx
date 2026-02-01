import { useState, useRef, useEffect } from 'react'
import { toPng } from 'html-to-image'
import { Pencil } from 'lucide-react'
import CalendarGrid from '../components/calendar/CalendarGrid'
import DatePickerField from '../components/calendar/DatePickerField'
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
  const [calendarImageDataUrl, setCalendarImageDataUrl] = useState(null)
  /** 이미지 생성 시점에만 세팅. null이면 export용 DOM을 아예 안 그려서 입력/클릭 시 리렌더 비용 제거 */
  const [exportSnapshot, setExportSnapshot] = useState(null)
  const exportRef = useRef(null)
  const nextIdRef = useRef(1)
  const colorDropdownRef = useRef(null)
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [editDate, setEditDate] = useState(getDefaultDate())
  const [editEndDate, setEditEndDate] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editColor, setEditColor] = useState(PRESET_COLORS[0])

  /* 색상 드롭다운: 열린 직후 같은 탭이 바깥 클릭으로 처리되지 않도록 지연 후 pointerdown 등록 */
  useEffect(() => {
    if (!colorDropdownOpen) return
    const handleOutside = (e) => {
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(e.target)) {
        setColorDropdownOpen(false)
      }
    }
    const t = setTimeout(() => {
      document.addEventListener('pointerdown', handleOutside)
    }, 150)
    return () => {
      clearTimeout(t)
      document.removeEventListener('pointerdown', handleOutside)
    }
  }, [colorDropdownOpen])

  /* 달력 이미지 생성: 디바운스 후 export용 DOM을 잠깐만 마운트해 toPng 실행. 평소에는 export DOM이 없어서 입력/클릭 시 리렌더로 멈춤 방지 */
  useEffect(() => {
    let cancelled = false
    let idleId = null
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const debounceMs = isMobile ? 2000 : 1500
    const pixelRatio = isMobile ? 1 : 2
    const t = setTimeout(() => {
      if (cancelled) return
      setExportSnapshot({ year, month, events: [...events], styleId })
    }, debounceMs)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [year, month, events, styleId])

  useEffect(() => {
    if (!exportSnapshot) return
    let cancelled = false
    let idleId = null
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const pixelRatio = isMobile ? 1 : 2
    const runExport = () => {
      if (!exportRef.current || cancelled) {
        if (!cancelled) setExportSnapshot(null)
        return
      }
      const opt = {
        pixelRatio,
        width: EXPORT_WIDTH,
        height: EXPORT_HEIGHT,
        style: { width: EXPORT_WIDTH, height: EXPORT_HEIGHT },
      }
      toPng(exportRef.current, opt)
        .then((url) => {
          if (!cancelled) {
            setCalendarImageDataUrl(url)
            setExportSnapshot(null)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setCalendarImageDataUrl(null)
            setExportSnapshot(null)
          }
        })
    }
    const rafId = requestAnimationFrame(() => {
      if (cancelled) return
      if (typeof requestIdleCallback !== 'undefined') {
        idleId = requestIdleCallback(runExport, { timeout: 1500 })
      } else {
        setTimeout(runExport, 0)
      }
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      if (idleId != null && typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(idleId)
    }
  }, [exportSnapshot])

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

  const startEditEvent = (ev) => {
    setEditingEventId(ev.id)
    setEditDate(ev.date)
    setEditEndDate(ev.endDate && ev.endDate !== ev.date ? ev.endDate : '')
    setEditContent(ev.content)
    setEditColor(ev.color || PRESET_COLORS[0])
  }

  const saveEditEvent = () => {
    const content = editContent.trim()
    if (!content) return
    const endDate = editEndDate && editEndDate >= editDate ? editEndDate : editDate
    setEvents((prev) =>
      prev.map((e) =>
        e.id === editingEventId ? { ...e, date: editDate, endDate, content, color: editColor } : e
      )
    )
    setEditingEventId(null)
  }

  const cancelEditEvent = () => {
    setEditingEventId(null)
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
              <DatePickerField
                value={eventDate}
                onChange={setEventDate}
                placeholder="날짜 선택"
                className="event-input"
              />
            </label>
            <label className="event-field">
              <span className="event-field-label">종료일</span>
              <DatePickerField
                value={eventEndDate}
                onChange={setEventEndDate}
                min={eventDate}
                placeholder="같은 날이면 비움"
                className="event-input"
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
                onPointerDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setColorDropdownOpen((v) => !v)
                }}
                aria-expanded={colorDropdownOpen}
                aria-haspopup="listbox"
                aria-label="색상 선택"
                title={eventColor}
              />
              {colorDropdownOpen && (
                <div className="color-dropdown" role="listbox" aria-label="색상 목록" onPointerDown={(e) => e.stopPropagation()}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="option"
                      aria-selected={eventColor === c}
                      className={`color-dropdown-swatch ${eventColor === c ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
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
                      onChange={(e) => setEventColor(e.target.value)}
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
                  {editingEventId === ev.id ? (
                    <div className="event-item-edit">
                      <div className="event-item-edit-dates">
                        <label className="event-item-edit-date-field">
                          <span className="event-item-edit-date-label">시작일</span>
                          <DatePickerField
                            value={editDate}
                            onChange={setEditDate}
                            placeholder="날짜 선택"
                            className="event-input event-item-edit-input"
                          />
                        </label>
                        <label className="event-item-edit-date-field">
                          <span className="event-item-edit-date-label">종료일</span>
                          <DatePickerField
                            value={editEndDate}
                            onChange={setEditEndDate}
                            min={editDate}
                            placeholder="같은 날이면 비움"
                            className="event-input event-item-edit-input"
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="event-input event-item-edit-input"
                        placeholder="내용"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditEvent()
                          if (e.key === 'Escape') cancelEditEvent()
                        }}
                      />
                      <div className="event-item-edit-colors">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`event-item-edit-swatch ${editColor === c ? 'active' : ''}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setEditColor(c)}
                            title={c}
                          />
                        ))}
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="event-item-edit-color-native"
                          title="직접 선택"
                        />
                      </div>
                      <div className="event-item-edit-actions">
                        <button type="button" className="event-item-edit-cancel" onClick={cancelEditEvent}>
                          취소
                        </button>
                        <button type="button" className="event-item-edit-save" onClick={saveEditEvent}>
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="event-item-content" style={{ borderLeftColor: ev.color }}>{ev.content}</span>
                      <button
                        type="button"
                        className="event-item-edit-btn"
                        onClick={() => startEditEvent(ev)}
                        aria-label="수정"
                      >
                        <Pencil size={16} strokeWidth={2} />
                      </button>
                      <button type="button" className="event-item-remove" onClick={() => removeEvent(ev.id)} aria-label="삭제">×</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {exportSnapshot && (
        <div
          ref={exportRef}
          className="calendar-export-target"
          style={{ width: EXPORT_WIDTH, height: EXPORT_HEIGHT }}
          aria-hidden
        >
          <div className={`calendar-style-${exportSnapshot.styleId}`}>
            <div className="cal-export-title">{exportSnapshot.month}월</div>
            <CalendarGrid
              year={exportSnapshot.year}
              month={exportSnapshot.month}
              events={exportSnapshot.events}
              styleId={exportSnapshot.styleId}
              className="cal-export-grid"
              monthLabel={`${exportSnapshot.month}월`}
            />
          </div>
        </div>
      )}
    </div>
  )
}
