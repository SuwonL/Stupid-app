// VITE_API_URL 또는 VITE_API_BASE_URL. 베이스만 넣었으면(끝에 /api 없으면) /api 붙임
const raw = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''
const API_BASE = raw ? (raw.replace(/\/$/, '') + (raw.endsWith('/api') ? '' : '/api')) : '/api'

const FETCH_TIMEOUT_MS = 15000

/** 타임아웃이 있는 fetch. 응답 없으면 15초 후 에러 */
function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId))
}

/**
 * 응답을 UTF-8 텍스트로 읽은 뒤 JSON 파싱.
 * 파싱 실패 시 원인 파악을 위해 요청 URL, 상태, Content-Type, 본문 앞부분을 포함한 에러를 던짐.
 */
async function parseJsonUtf8(res, requestUrl) {
  const buf = await res.arrayBuffer()
  const text = new TextDecoder('utf-8').decode(buf)
  const contentType = res.headers.get('Content-Type') || '(없음)'
  try {
    return JSON.parse(text)
  } catch (e) {
    const preview = text.slice(0, 300).replace(/\n/g, ' ')
    const detail = [
      `[API 응답이 JSON이 아님]`,
      `요청 URL: ${requestUrl}`,
      `응답 상태: ${res.status} ${res.statusText}`,
      `Content-Type: ${contentType}`,
      `본문 앞부분: ${preview}${text.length > 300 ? '...' : ''}`,
    ].join('\n')
    console.error(detail)
    throw new Error(detail)
  }
}

export async function getIngredients() {
  const url = `${API_BASE}/ingredients`
  let res
  try {
    res = await fetchWithTimeout(url, {
      headers: { Accept: 'application/json;charset=UTF-8' },
    })
  } catch (e) {
    const msg = e.name === 'AbortError'
      ? `서버 응답이 없습니다. (${FETCH_TIMEOUT_MS / 1000}초 초과)\n요청 URL: ${url}\n백엔드가 실행 중인지 확인해 주세요.`
      : `서버에 연결할 수 없습니다. 요청 URL: ${url}\n${e.message}`
    throw new Error(msg)
  }
  if (!res.ok) throw new Error(`재료 목록 실패 (${res.status}). 요청 URL: ${url}`)
  return parseJsonUtf8(res, url)
}

export async function recommendRecipes({ ingredientIds, ingredientNames }) {
  const url = `${API_BASE}/recipes/recommend`
  const body = {}
  if (ingredientIds?.length) body.ingredientIds = ingredientIds
  if (ingredientNames?.length) body.ingredientNames = ingredientNames
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    throw new Error(`서버에 연결할 수 없습니다. 요청 URL: ${url}\n${e.message}`)
  }
  if (!res.ok) {
    if (res.status === 404)
      throw new Error(`백엔드 API 없음 (404). 요청 URL: ${url}`)
    throw new Error(`메뉴 추천 실패 (${res.status}). 요청 URL: ${url}`)
  }
  return parseJsonUtf8(res, url)
}

export async function getRecipeDetail(id) {
  const url = `${API_BASE}/recipes/${id}/detail`
  const res = await fetch(url, {
    headers: { Accept: 'application/json;charset=UTF-8' },
  })
  if (!res.ok) throw new Error(`상세 정보 실패 (${res.status}). 요청 URL: ${url}`)
  return parseJsonUtf8(res, url)
}

/** 유튜브 영상 요리 레시피 (자막/영상 설명에서 추출) */
export async function getYoutubeRecipeSteps(videoId, title) {
  const params = new URLSearchParams()
  if (title) params.set('title', title)
  const qs = params.toString()
  const url = `${API_BASE}/youtube/${encodeURIComponent(videoId)}/recipe-steps${qs ? `?${qs}` : ''}`
  const res = await fetch(url, { headers: { Accept: 'application/json;charset=UTF-8' } })
  if (!res.ok) throw new Error(`자막 로드 실패 (${res.status}). 요청 URL: ${url}`)
  return parseJsonUtf8(res, url)
}
