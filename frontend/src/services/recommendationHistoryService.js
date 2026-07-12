const HISTORY_KEY = 'stock-recommendation-history'

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeHistory(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items))
  } catch {
    // localStorage can be blocked in private mode. The UI can still show current recommendations.
  }
}

export function saveRecommendationHistory(session) {
  const history = readHistory()
  const next = [session, ...history].slice(0, 50)
  writeHistory(next)
  return next
}

export function getRecommendationHistory() {
  return readHistory()
}
