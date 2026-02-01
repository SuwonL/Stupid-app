# Fly.io URL이 안 열릴 때 — Fly.io / Vercel 설정 체크리스트

`https://backend-little-cloud-7780.fly.dev/api/ingredients` 가 안 열리면 **Fly.io 쪽 설정/상태**를 먼저 확인해야 합니다.  
Vercel은 **프론트만** 배포하므로, **백엔드 URL을 열게 만드는 설정은 Fly.io에만** 있습니다.

---

## 1. Fly.io에서 확인할 것

### 1-1. Fly.io 대시보드

1. [fly.io](https://fly.io) 로그인 → **Apps** → `backend-little-cloud-7780` 선택
2. **Overview**
   - **Status**: "Deployed" 말고 **"Proxy not finding machines"** 같은 빨간 메시지가 있으면 → 머신이 꺼졌거나 프록시가 연결 못 함
   - **Scale**: 머신 수가 0이면 요청을 받을 수 없음
3. **Deployments**: 최근 배포가 **성공(Success)** 인지 확인. 실패면 **Redeploy** 또는 로컬에서 `fly deploy`

### 1-2. fly.toml (저장소 `backend/fly.toml`)

| 항목 | 현재 값 | 설명 |
|------|---------|------|
| `min_machines_running` | `0` | 0이면 요청 없을 때 머신이 꺼짐 → URL 접속 안 될 수 있음 |
| `internal_port` | `8080` | 백엔드(Spring Boot) 포트와 같아야 함 |
| `auto_stop_machines` | `'stop'` | 꺼두면 `min_machines_running = 0` 일 때 전부 꺼짐 |

**URL이 자주 안 열리면:**

- `min_machines_running = 1` 로 바꾼 뒤 `fly deploy`  
  → 최소 1대는 항상 켜 두므로 URL이 열릴 가능성이 높아짐 (무료 한도 내에서 비용 발생할 수 있음)

### 1-3. 앱이 올바르게 리스닝하는지

- Spring Boot는 기본적으로 `0.0.0.0` 에 바인딩됨 (Fly 요구사항 충족)
- `application.properties` 에 `server.port=${PORT:8080}` 있으면 Fly가 주는 PORT 사용 → OK

### 1-4. 로컬에서 Fly CLI로 할 일

```powershell
cd d:\Cursor\stupid-app\backend
fly auth login
fly status
fly logs
```

- **fly status**: 앱 존재 여부, 리전, 머신 수
- **fly logs**: 앱이 떠 있는지, 에러 메시지 확인
- URL이 안 열리면 한 번 **재배포**: `fly deploy`

### 1-5. "Proxy not finding machines" 일 때

- 머신이 0대이거나, 꺼져 있거나, 호스트 문제일 수 있음
- **Scale** 에서 머신 수 1 이상으로 올리거나, **Restart** / **Redeploy** 후 다시 접속 시도
- 공식 문서: [Troubleshoot apps when a host is unavailable](https://fly.io/docs/apps/trouble-host-unavailable/)

---

## 2. Vercel에서 확인할 것

Vercel은 **프론트엔드만** 배포합니다. **백엔드 URL( Fly.io )을 “열리게” 만드는 설정은 Vercel에 없습니다.**

확인할 것은 하나뿐입니다.

### 2-1. 환경 변수 (프론트가 어느 백엔드를 부르는지)

1. Vercel 대시보드 → 이 프로젝트 → **Settings** → **Environment Variables**
2. **VITE_API_BASE_URL** (또는 **VITE_API_URL**) 이 **실제로 동작하는 백엔드 주소**인지 확인
   - Fly.io 쓰는 경우: `https://backend-little-cloud-7780.fly.dev/api`
   - **Fly.io URL이 브라우저에서 안 열리면** 이 주소로 요청해도 실패함 → Fly.io를 먼저 고쳐야 함
   - Render 등 다른 백엔드로 바꾼 경우: `https://본인-서비스.onrender.com/api` 처럼 해당 서비스 URL로 설정

**정리:** Fly URL이 안 열리는 건 **Vercel 설정 때문이 아님**. Vercel에서는 “백엔드 주소를 뭘로 넣었는지”만 맞으면 됨.

---

## 3. 한 줄 요약

| 증상 | 확인할 곳 | 할 일 |
|------|-----------|--------|
| `https://backend-little-cloud-7780.fly.dev/...` 안 열림 | **Fly.io** | 대시보드에서 Status/Scale/Deployments 확인, `fly deploy` 또는 `min_machines_running = 1` 후 재배포 |
| Vercel 사이트에서 “연결 실패” / “서버 응답 없음” | **Fly.io** | 위 URL이 브라우저에서 먼저 열리는지 확인. 열리면 Vercel env만 점검 |
| Vercel env를 바꿨는데도 프론트가 예전 백엔드 호출 | **Vercel** | 환경 변수 수정 후 **Redeploy** 한 번 해야 반영됨 |

**Fly.io URL이 안 열리면 → Fly.io 설정/상태만 보면 됨. Vercel에서 “Fly를 열게” 만드는 설정은 없음.**
