import { useState, useEffect, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { CHILDBIRTH_CHECKLIST } from '../data/childbirthChecklistData'
import './ChildbirthChecklistPage.css'

const STORAGE_KEY = 'childbirth-checklist-v1'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { checked: {}, customItems: {} }
    const parsed = JSON.parse(raw)
    return {
      checked: parsed.checked || {},
      customItems: parsed.customItems || {},
    }
  } catch {
    return { checked: {}, customItems: {} }
  }
}

export default function ChildbirthChecklistPage() {
  const [checked, setChecked] = useState(() => loadState().checked)
  const [customItems, setCustomItems] = useState(() => loadState().customItems)
  const [newItemText, setNewItemText] = useState({})

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ checked, customItems }))
    } catch {}
  }, [checked, customItems])

  const categories = useMemo(
    () =>
      CHILDBIRTH_CHECKLIST.map((cat) => ({
        ...cat,
        items: [...cat.items, ...(customItems[cat.id] || [])],
      })),
    [customItems]
  )

  const toggleItem = (itemId) => {
    setChecked((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  const addCustomItem = (categoryId) => {
    const text = (newItemText[categoryId] || '').trim()
    if (!text) return
    const id = `custom-${categoryId}-${Date.now()}`
    setCustomItems((prev) => ({
      ...prev,
      [categoryId]: [...(prev[categoryId] || []), { id, label: text }],
    }))
    setNewItemText((prev) => ({ ...prev, [categoryId]: '' }))
  }

  const removeCustomItem = (categoryId, itemId) => {
    setCustomItems((prev) => ({
      ...prev,
      [categoryId]: (prev[categoryId] || []).filter((it) => it.id !== itemId),
    }))
    setChecked((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  const resetAll = () => {
    if (!window.confirm('체크한 내용을 모두 초기화할까요?')) return
    setChecked({})
  }

  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0)
  const totalChecked = categories.reduce(
    (sum, cat) => sum + cat.items.filter((it) => checked[it.id]).length,
    0
  )
  const overallPercent = totalItems ? Math.round((totalChecked / totalItems) * 100) : 0

  return (
    <div className="checklist-page">
      <header className="checklist-header">
        <h1>출산 준비물 체크리스트</h1>
        <p className="checklist-sub">준비물을 체크하면 자동으로 저장돼요. 다시 방문해도 그대로 남아있어요.</p>
      </header>

      <section className="checklist-progress card">
        <div className="checklist-progress-info">
          <span className="section-title">전체 진행률</span>
          <span className="checklist-progress-count">{totalChecked} / {totalItems}</span>
        </div>
        <div className="checklist-progress-bar">
          <div className="checklist-progress-fill" style={{ width: `${overallPercent}%` }} />
        </div>
        <button type="button" className="checklist-reset-btn" onClick={resetAll}>
          전체 초기화
        </button>
      </section>

      {categories.map((cat) => {
        const catChecked = cat.items.filter((it) => checked[it.id]).length
        return (
          <section key={cat.id} className="checklist-category card">
            <div className="checklist-category-header">
              <h2 className="section-title">{cat.name}</h2>
              <span className="checklist-category-count">{catChecked} / {cat.items.length}</span>
            </div>
            <ul className="checklist-items">
              {cat.items.map((item) => {
                const isCustom = item.id.startsWith('custom-')
                return (
                  <li key={item.id} className="checklist-item">
                    <label className="checklist-item-label">
                      <input
                        type="checkbox"
                        checked={!!checked[item.id]}
                        onChange={() => toggleItem(item.id)}
                      />
                      <span className={checked[item.id] ? 'checklist-item-text checked' : 'checklist-item-text'}>
                        {item.label}
                      </span>
                    </label>
                    {isCustom && (
                      <button
                        type="button"
                        className="checklist-item-remove"
                        onClick={() => removeCustomItem(cat.id, item.id)}
                        aria-label="삭제"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className="checklist-add-form">
              <input
                type="text"
                value={newItemText[cat.id] || ''}
                onChange={(e) => setNewItemText((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                placeholder="항목 추가"
                className="checklist-add-input"
                onKeyDown={(e) => e.key === 'Enter' && addCustomItem(cat.id)}
              />
              <button type="button" className="checklist-add-btn" onClick={() => addCustomItem(cat.id)}>
                추가
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
