# 냉장고 메뉴 추천

주부를 위한 "냉장고에 남은 재료로 만들 수 있는 메뉴" 추천 웹 앱입니다.

## 기능

- **인스타그램 스타일 UI**: 카드 그리드, 둥근 모서리, 깔끔한 레이아웃
- **메뉴 상세**: 유튜브 영상(최근 1년·조회수 순 1개), 필요 재료, 요리 순서
- **YouTube 연동**: `app.youtube.api-key` 설정 시 메뉴명으로 검색해 관련 영상 표시
- **실시간 조합 검색**: `app.spoonacular.api-key` 설정 시 선택한 재료로 Spoonacular API를 호출해 매번 새 레시피 조합 검색 (DB에 일일이 넣지 않음)

## 기술 스택

- **Backend**: Spring Boot (JDK 17), REST API, H2 (로컬)
- **Frontend**: React, Vite
- **Database**: H2 in-memory, 시드 데이터(주/부 카테고리, 요리 순서 포함)

## 로컬 실행

### Docker로 백엔드만 실행

Docker가 설치되어 있다면 프로젝트 루트에서:

```bash
docker compose up -d
```

API: http://localhost:8080/api/ingredients  
상세: [docs/DOCKER.md](docs/DOCKER.md)

---

### 1. 백엔드 (Maven으로 직접 실행)

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

**JAVA_HOME**: JDK 17 이상 필요.  

**API 키 (배포/저장소에 포함하지 말 것)**  
- **로컬**: `backend/application-local.properties` 파일을 만들고 아래만 넣어 사용. (이 파일은 `.gitignore`에 있어 커밋되지 않음.)  
  ```properties
  app.youtube.api-key=여기에_YouTube_키
  app.spoonacular.api-key=여기에_Spoonacular_키
  ```
- **배포**(Railway, Render 등): 환경변수로 설정.  
  - `APP_YOUTUBE_API_KEY`, `APP_SPOONACULAR_API_KEY` (Spring이 `app.youtube.api-key` 등으로 매핑)

**YouTube (썸네일·관련 영상)**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 API 키 생성 후 **YouTube Data API v3** 사용 설정. 키가 없으면 카드 썸네일과 상세 모달의 "관련 영상"이 표시되지 않습니다.

**Spoonacular(실시간 검색)**: [spoonacular.com/food-api](https://spoonacular.com/food-api)에서 API Key 발급.  
- **무료 한도(50포인트/일)** 내에서만 호출. 일 45회 초과 시 당일 추가 호출 안 함.  
- 시드: `app.recipe.seed.enabled=false`(기본값)면 data.sql 10개만 사용.

### 2. 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

브라우저: `http://localhost:5173` (또는 터미널에 표시된 포트)

## Vercel 배포 (프론트엔드)

### 방법 A (권장): Root Directory 사용

1. **Vercel 가입**: [vercel.com](https://vercel.com) → GitHub 연동
2. **New Project** → 이 저장소 선택
3. **Root Directory**를 `frontend`로 설정 (반드시 설정)
4. **Build Command**: `npm run build` (기본값)
5. **Output Directory**: `dist` (기본값)
6. **Deploy** 클릭

### 방법 B: 저장소 루트에서 배포

Root Directory를 비운 채 두면, 루트의 `vercel.json`이 사용됩니다.  
Install/Build는 `frontend/`에서 실행되고, 출력은 `frontend/dist`로 인식됩니다.

### 404 NOT_FOUND가 나올 때

- **Root Directory**가 `frontend`인지 확인: Vercel 대시보드 → 프로젝트 → **Settings** → **General** → **Root Directory** = `frontend`
- Root Directory를 비워 두었다면, 루트에 `vercel.json`과 `package.json`이 있어야 합니다 (이미 포함됨).
- 배포 로그에서 Build가 성공했는지 확인. 실패 시 출력 폴더가 비어 있어 404가 납니다.

### "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON\" 에러가 나올 때

**원인**: 프론트만 배포하고 백엔드는 배포하지 않았을 때 발생합니다.  
배포된 사이트에서 API 요청이 같은 도메인(Vercel)으로 가고, 해당 경로에 백엔드가 없어 **HTML(index.html)** 이 내려오면서 JSON 대신 HTML을 파싱하려다 에러가 납니다.

**해결**: 백엔드를 배포하고, 프론트엔드가 그 주소를 쓰도록 설정하면 됩니다.

---

## 백엔드 배포 후 전체 연결 (프론트 + 백엔드)

**상세 가이드**: [docs/DEPLOY_BACKEND.md](docs/DEPLOY_BACKEND.md) — 무료 배포 가능한 서비스 추천(Render, Railway, Fly.io)과 단계별 설정 방법.  
**Fly.io만 상세히**: [docs/FLYIO_BACKEND.md](docs/FLYIO_BACKEND.md) — CLI 설치, launch, secrets, deploy, 프론트 연동까지.  
**AWS**: [docs/AWS_BACKEND.md](docs/AWS_BACKEND.md) — Elastic Beanstalk(JAR 업로드·EB CLI), App Runner(Docker) 배포.

### 1단계: 백엔드 배포 (Railway / Render / Fly.io 등)

**Railway 예시**

1. [railway.app](https://railway.app) 가입 → **New Project** → **Deploy from GitHub** → 이 저장소 선택
2. **Settings** → **Root Directory** = `backend` 로 설정
3. **Settings** → **Build Command**: `./mvnw -DskipTests package` (또는 Windows면 `mvnw.cmd -DskipTests package`)
4. **Settings** → **Start Command**: `java -jar target/fridge-menu-api-0.0.1-SNAPSHOT.jar`
5. **Variables**에 환경변수 추가:
   - `APP_YOUTUBE_API_KEY` = (YouTube Data API v3 키)
   - `APP_CORS_ALLOWED_ORIGINS` = `https://여기서-사용하는-vercel-도메인.vercel.app` (아래 2단계 후 확인)
6. 배포 후 **Settings** → **Networking** → **Generate Domain** 으로 URL 확인 (예: `https://xxx.up.railway.app`)

**Render 예시**

1. [render.com](https://render.com) → **New** → **Web Service** → 저장소 연결
2. **Root Directory**: `backend`
3. **Build Command**: `./mvnw -DskipTests package`
4. **Start Command**: `java -jar target/fridge-menu-api-0.0.1-SNAPSHOT.jar`
5. **Environment** 에 `APP_YOUTUBE_API_KEY`, `APP_CORS_ALLOWED_ORIGINS` 추가 (위와 동일)
6. 배포 후 생성된 URL 확인 (예: `https://xxx.onrender.com`)

### 2단계: Vercel(프론트)에서 API 주소 지정

1. Vercel 프로젝트 → **Settings** → **Environment Variables**
2. 추가:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://백엔드-배포-URL/api`  
     (예: Railway면 `https://xxx.up.railway.app/api`, Render면 `https://xxx.onrender.com/api`)
3. **Save** 후 **Deployments** → 최신 배포 **Redeploy** (환경변수 반영을 위해 한 번 다시 배포)

### 3단계: 백엔드 CORS에 프론트 주소 넣기

백엔드가 Vercel 요청을 받으려면 CORS에 프론트 주소를 넣어야 합니다.

- 배포 시 설정한 **환경변수**에 다음 추가/수정:
  - **Name**: `APP_CORS_ALLOWED_ORIGINS`
  - **Value**: `https://본인-프로젝트.vercel.app`  
    (Vercel 대시보드에서 확인한 실제 배포 URL, 쉼표로 여러 개 가능)

저장 후 백엔드 서비스를 한 번 다시 배포하면, 배포된 프론트에서 메뉴 추천이 동작합니다.

## API 요약

- `GET /api/ingredients` — 재료 목록
- `POST /api/recipes/recommend` — body: `ingredientIds`, `ingredientNames`
- `GET /api/recipes/{id}/detail` — 메뉴 상세(재료, 요리 순서, 유튜브 영상 ID)

## 사용 방법

1. 재료 **텍스트 입력** 또는 **목록에서 선택**
2. **메뉴 추천** 클릭 → 카드 그리드로 결과 표시
3. 카드 클릭 → 상세(유튜브, 재료, 요리 순서)

## 디렉터리 구조

- `backend/` — Spring Boot API, 시드(data.sql), YouTube 연동
- `frontend/` — React + Vite, 인스타 스타일 UI
- `PROJECT_PROMPT.md` — 프로젝트 기준 문서
