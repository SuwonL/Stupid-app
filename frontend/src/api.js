// VITE_API_URL 또는 VITE_API_BASE_URL. 베이스만 넣었으면(끝에 /api 없으면) /api 붙임
const raw = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''
const API_BASE = raw ? (raw.replace(/\/$/, '') + (raw.endsWith('/api') ? '' : '/api')) : '/api'

/** 응답 바이트를 UTF-8로 강제 해석 후 JSON 파싱 (한글 깨짐 방지) */
async function parseJsonUtf8(res) {
  const buf = await res.arrayBuffer()
  const text = new TextDecoder('utf-8').decode(buf)
  return JSON.parse(text)
}

export async function getIngredients() {
  let res
  try {
    res = await fetch(`${API_BASE}/ingredients`, {
      headers: { Accept: 'application/json;charset=UTF-8' },
    })
  } catch (e) {
    throw new Error('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해 주세요.')
  }
  if (!res.ok) throw new Error('재료 목록을 불러오지 못했습니다.')
  return parseJsonUtf8(res)
}

export async function recommendRecipes({ ingredientIds, ingredientNames }) {
  const body = {}
  if (ingredientIds?.length) body.ingredientIds = ingredientIds
  if (ingredientNames?.length) body.ingredientNames = ingredientNames
  let res
  try {
    res = await fetch(`${API_BASE}/recipes/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    throw new Error('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해 주세요.')
  }
  if (!res.ok) {
    if (res.status === 404)
      throw new Error('백엔드 API를 찾을 수 없습니다. 서버 주소와 실행 여부를 확인해 주세요.')
    throw new Error('메뉴 추천 요청에 실패했습니다.')
  }
  return parseJsonUtf8(res)
}

export async function getRecipeDetail(id) {
  const res = await fetch(`${API_BASE}/recipes/${id}/detail`, {
    headers: { Accept: 'application/json;charset=UTF-8' },
  })
  if (!res.ok) throw new Error('상세 정보를 불러오지 못했습니다.')
  return parseJsonUtf8(res)
}

/** 유튜브 영상 요리 레시피 (자막/영상 설명에서 추출) */
export async function getYoutubeRecipeSteps(videoId, title) {
  const params = new URLSearchParams()
  if (title) params.set('title', title)
  const qs = params.toString()
  const url = `${API_BASE}/youtube/${encodeURIComponent(videoId)}/recipe-steps${qs ? `?${qs}` : ''}`
  const res = await fetch(url, { headers: { Accept: 'application/json;charset=UTF-8' } })
  if (!res.ok) throw new Error('자막을 불러오지 못했습니다.')
  return parseJsonUtf8(res)
}
