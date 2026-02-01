// Vercel 배포 시 환경 변수 VITE_API_URL 또는 VITE_API_BASE_URL 필수 (예: https://xxx.onrender.com/api)
const raw = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''
const API_BASE = raw ? (raw.replace(/\/$/, '') + (raw.endsWith('/api') ? '' : '/api')) : '/api'

const FETCH_TIMEOUT_MS = 15000

function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS, abortSignal = null) {
  const controller = new AbortController()
  if (abortSignal) abortSignal.addEventListener('abort', () => controller.abort())
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId))
}

async function parseJsonUtf8(res, url) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`JSON 아님. URL: ${url}\n본문 앞 200자: ${text.slice(0, 200)}`)
  }
}

/**
 * 재료 목록. signal 전달 시 해당 시그널로 요청 취소 가능.
 */
export async function getIngredients(abortSignal = null) {
  const url = `${API_BASE}/ingredients`
  let res
  try {
    res = await fetchWithTimeout(
      url,
      { headers: { Accept: 'application/json;charset=UTF-8' } },
      FETCH_TIMEOUT_MS,
      abortSignal
    )
  } catch (e) {
    const msg = e.name === 'AbortError'
      ? `서버 응답 없음 (${FETCH_TIMEOUT_MS / 1000}초). URL: ${url}`
      : `연결 실패. URL: ${url} — ${e.message}`
    throw new Error(msg)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}. URL: ${url}`)
  return parseJsonUtf8(res, url)
}

export async function recommendRecipes({ ingredientIds, ingredientNames, strictOnly }, abortSignal = null) {
  const url = `${API_BASE}/recipes/recommend`
  const body = {}
  if (ingredientIds?.length) body.ingredientIds = ingredientIds
  if (ingredientNames?.length) body.ingredientNames = ingredientNames
  if (strictOnly === true) body.strictOnly = true
  let res
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        body: JSON.stringify(body),
      },
      FETCH_TIMEOUT_MS,
      abortSignal
    )
  } catch (e) {
    const msg = e.name === 'AbortError'
      ? `서버 응답 없음 (${FETCH_TIMEOUT_MS / 1000}초). 백엔드 URL 확인: ${url}`
      : `연결 실패. URL: ${url} — ${e.message}`
    throw new Error(msg)
  }
  if (!res.ok) throw new Error(`메뉴 추천 실패 (${res.status}). URL: ${url}`)
  return parseJsonUtf8(res, url)
}

export async function getRecipeDetail(id) {
  const url = `${API_BASE}/recipes/${id}/detail`
  const res = await fetch(url, { headers: { Accept: 'application/json;charset=UTF-8' } })
  if (!res.ok) throw new Error(`상세 실패 (${res.status}). URL: ${url}`)
  return parseJsonUtf8(res, url)
}

export async function getYoutubeRecipeSteps(videoId, title) {
  const params = new URLSearchParams()
  if (title) params.set('title', title)
  const qs = params.toString()
  const url = `${API_BASE}/youtube/${encodeURIComponent(videoId)}/recipe-steps${qs ? `?${qs}` : ''}`
  const res = await fetch(url, { headers: { Accept: 'application/json;charset=UTF-8' } })
  if (!res.ok) throw new Error(`자막 실패 (${res.status}). URL: ${url}`)
  return parseJsonUtf8(res, url)
}
