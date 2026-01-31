# Fly.io로 백엔드 배포 (상세)

Spring Boot 백엔드(냉장고 메뉴 API)를 Fly.io에 Docker 이미지로 배포하는 단계별 가이드입니다.

---

## 1. 사전 준비

- [Fly.io](https://fly.io) 계정 (GitHub 또는 이메일로 가입)
- 이 프로젝트의 `backend/` 폴더에 **Dockerfile**이 있어야 함 (이미 포함됨)
- 터미널(PowerShell, CMD, WSL, Mac, Linux)

---

## 2. Fly CLI 설치

### Windows (PowerShell)

1. **PowerShell**을 연다 (관리자 권한 불필요).
2. 아래 명령을 **그대로** 실행한다.

```powershell
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

`pwsh`가 없다면 (Windows PowerShell 5만 있는 경우):

```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

3. 설치가 끝나면 **PowerShell/터미널을 완전히 닫았다가 다시 연다**.
4. `fly version` 또는 `flyctl version` 으로 확인한다.

**`fly`가 인식되지 않을 때**

- 설치 스크립트는 보통 `%USERPROFILE%\.fly\bin` 에 `fly.exe`(또는 `flyctl.exe`)를 넣고, PATH에 이 폴더를 추가한다.
- 터미널을 **새로 연 뒤**에도 `fly`가 안 되면 PATH를 수동으로 넣어 본다.

**PowerShell (현재 세션만):**

```powershell
$env:Path += ";$env:USERPROFILE\.fly\bin"
fly version
```

**영구 반영 (사용자 PATH에 추가):**

1. Windows 키 → "환경 변수" 검색 → **시스템 환경 변수 편집**
2. **환경 변수** → **사용자 변수**에서 **Path** 선택 → **편집** → **새로 만들기**
3. `%USERPROFILE%\.fly\bin` 입력 후 확인
4. 모든 터미널을 닫았다가 다시 열고 `fly version` 실행

### Mac / Linux

```bash
curl -L https://fly.io/install.sh | sh
```

설치 후 터미널을 다시 열거나 `source ~/.bashrc`(또는 사용 중인 셸 설정 파일) 후 `fly version` 으로 확인.

또는 [공식 설치 문서](https://fly.io/docs/flyctl/install/) 참고.

---

## 3. 로그인

```bash
fly auth login
```

브라우저가 열리면 Fly.io 계정으로 로그인합니다.  
(이메일 링크로 로그인하는 방식이면 터미널에 나온 링크를 브라우저에서 열면 됩니다.)

---

## 4. backend 폴더에서 앱 생성 (launch)

프로젝트 **루트**가 아니라 **backend** 폴더에서 실행해야 합니다.

```bash
cd backend
fly launch
```

### launch 시 나오는 질문에 대한 권장 답

| 질문 | 권장 입력 |
|------|-----------|
| **App Name** | `fridge-menu-api` 또는 원하는 이름 (전 세계에서 유일해야 함) |
| **Region** | `Seoul (ICN)` 또는 가까운 리전 선택 |
| **Would you like to set up a Postgresql database?** | **No** (이 프로젝트는 H2 in-memory 사용) |
| **Would you like to set up an Upstash Redis database?** | **No** |
| **Would you like to deploy now?** | **No** (먼저 secrets 설정 후 배포) |

`fly launch` 를 하면 `backend/fly.toml` 이 생성됩니다.  
내부 포트가 8080이 아니면 아래처럼 수정합니다.

---

## 5. fly.toml 확인·수정

`backend/fly.toml` 은 `fly launch` 시 자동 생성됩니다. **HTTP 서비스 포트**가 8080인지 확인합니다.

**Fly CLI 최신 형식** (`[http_service]`):

```toml
# app 이름 등은 fly launch 에서 정한 값으로 채워져 있음

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]
```

- **internal_port = 8080**: Spring Boot가 8080(또는 Fly가 주는 `PORT` 환경변수)으로 대기하므로 8080으로 맞춥니다.  
  (이 프로젝트는 `server.port=${PORT:8080}` 로 설정되어 있어 Fly가 주는 포트를 사용합니다.)
- **min_machines_running = 0**: 무료 티어에서 비용 절감. 요청 없으면 머신이 꺼졌다가 요청 시 자동 기동됩니다.

구버전 CLI는 `[[services]]` + `internal_port` 형식일 수 있습니다. 어떤 형식이든 **internal_port = 8080** 이 들어가면 됩니다.

---

## 6. 환경 변수(Secrets) 설정

YouTube API·CORS를 쓰려면 **secrets** 로 넣습니다.  
(값에 공백·특수문자가 있으면 따옴표로 감싸세요.)

```bash
fly secrets set APP_YOUTUBE_API_KEY=여기에_YouTube_Data_API_v3_키
fly secrets set APP_CORS_ALLOWED_ORIGINS=https://본인-프론트.vercel.app
```

- **APP_CORS_ALLOWED_ORIGINS**: Vercel에 배포한 프론트 주소. 여러 개면 쉼표로 구분  
  예: `https://my-app.vercel.app,https://www.example.com`
- 나중에 수정하려면 같은 명령으로 다시 `fly secrets set` 하면 됩니다.

확인:

```bash
fly secrets list
```

---

## 7. 배포

```bash
fly deploy
```

- `backend/` 기준으로 Dockerfile을 사용해 이미지를 빌드하고 Fly.io에 배포합니다.
- 첫 배포는 이미지 빌드 때문에 3~5분 정도 걸릴 수 있습니다.
- 끝나면 **배포된 URL**이 출력됩니다. 예: `https://fridge-menu-api.fly.dev`

---

## 8. 동작 확인

브라우저나 curl로 확인합니다.

```bash
# 재료 목록 API
curl https://본인-앱이름.fly.dev/api/ingredients
```

JSON 배열이 보이면 정상입니다.

- **Health check**: Fly.io는 기본적으로 HTTP 요청으로 앱 상태를 확인합니다.  
  `/api/ingredients` 같은 경로가 200을 반환하면 문제없습니다.

---

## 9. 프론트엔드(Vercel)와 연결

1. **Vercel** 프로젝트 → **Settings** → **Environment Variables**
   - **Name**: `VITE_API_URL`
   - **Value**: `https://본인-앱이름.fly.dev/api`
2. **Save** 후 **Deployments** 에서 최신 배포를 **Redeploy** 해서 환경 변수를 반영합니다.
3. 백엔드 **APP_CORS_ALLOWED_ORIGINS** 에 Vercel 주소(예: `https://xxx.vercel.app`)가 들어가 있는지 다시 확인합니다.

이후 배포된 사이트에서 재료 선택 → 메뉴 추천이 동작하면 연동 완료입니다.

---

## 10. 자주 쓰는 Fly.io 명령어

| 명령어 | 설명 |
|--------|------|
| `fly status` | 앱 상태·머신 수 확인 |
| `fly logs` | 실시간 로그 (배포·에러 확인) |
| `fly open` | 앱 URL을 브라우저로 열기 |
| `fly ssh console` | 컨테이너 안으로 SSH |
| `fly secrets set KEY=value` | Secret 한 개 설정 |
| `fly secrets list` | 설정된 Secret 목록 |
| `fly deploy` | 다시 배포 |
| `fly apps destroy 앱이름` | 앱(및 리소스) 삭제 |

---

## 11. 문제 해결

### 배포는 되는데 502 Bad Gateway

- 앱이 **8080** (또는 Fly가 준 `PORT`)에서 listen 하는지 확인.
- 이 프로젝트는 `application.properties` 에 `server.port=${PORT:8080}` 이 있어서 Fly가 준 포트를 씁니다.
- `fly logs` 로 앱이 정상 기동했는지 확인.

### CORS 에러가 브라우저에 뜸

- `fly secrets set APP_CORS_ALLOWED_ORIGINS=https://실제-프론트-주소` 로 **프로토콜(https) 포함** 정확한 주소를 넣었는지 확인.
- Vercel이 준 주소와 완전히 일치해야 합니다 (끝에 `/` 유무 등).

### 무료 한도

- Fly.io 무료 티어: 소규모 VM·대역폭 제한이 있음. [Pricing](https://fly.io/docs/about/pricing/) 참고.
- **min_machines_running = 0** 이면 요청 없을 때 머신이 꺼져서 비용이 거의 나가지 않습니다. 첫 요청 시 **콜드 스타트**로 몇 초~십초 걸릴 수 있습니다.

---

## 12. 요약 체크리스트

- [ ] Fly CLI 설치 후 `fly auth login`
- [ ] `cd backend` 후 `fly launch` (Postgres/Redis는 No, Deploy now는 No)
- [ ] `fly.toml` 에 `internal_port = 8080` 확인
- [ ] `fly secrets set APP_YOUTUBE_API_KEY=...` , `APP_CORS_ALLOWED_ORIGINS=...`
- [ ] `fly deploy`
- [ ] `https://앱이름.fly.dev/api/ingredients` 로 동작 확인
- [ ] Vercel에 `VITE_API_URL=https://앱이름.fly.dev/api` 설정 후 Redeploy

이 순서대로 하면 Fly.io에서 백엔드 구성이 완료됩니다.
