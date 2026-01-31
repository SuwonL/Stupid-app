# Docker로 실행하기

백엔드(Spring Boot API)를 Docker로 빌드·실행하는 방법입니다.

> **Docker Cloud**는 2021년에 서비스가 종료되었습니다. 대신 **Docker Hub**에 이미지를 올린 뒤, Render·Fly.io·Railway 등 클라우드에서 그 이미지로 배포할 수 있습니다.

---

## 준비

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 (Windows/Mac)
- 또는 Docker Engine + Docker Compose 설치 (Linux)

---

## 방법 1: Docker Compose로 한 번에 실행 (권장)

프로젝트 루트에서:

```bash
docker compose up -d
```

- **첫 실행**: `backend/` 기준으로 이미지 빌드 후 컨테이너 실행 (몇 분 소요)
- **API 주소**: http://localhost:8080
- **재료 목록**: http://localhost:8080/api/ingredients

### 환경 변수 (선택)

YouTube 추천·CORS를 쓰려면 환경 변수를 넘깁니다.

**Windows (PowerShell)**

```powershell
$env:APP_YOUTUBE_API_KEY="여기에_YouTube_API_키"
$env:APP_CORS_ALLOWED_ORIGINS="http://localhost:5173"
docker compose up -d
```

**Linux / Mac**

```bash
export APP_YOUTUBE_API_KEY=여기에_YouTube_API_키
export APP_CORS_ALLOWED_ORIGINS=http://localhost:5173
docker compose up -d
```

또는 프로젝트 루트에 `.env` 파일을 만들고:

```env
APP_YOUTUBE_API_KEY=여기에_YouTube_API_키
APP_CORS_ALLOWED_ORIGINS=http://localhost:5173
```

저장한 뒤 `docker compose up -d` 하면 자동으로 적용됩니다.

### 로그 보기 / 중지

```bash
# 로그 보기
docker compose logs -f api

# 중지
docker compose down
```

---

## 방법 2: Docker만 사용 (이미지 직접 빌드·실행)

### 1. 이미지 빌드

`backend` 폴더로 이동한 뒤 빌드:

```bash
cd backend
docker build -t fridge-menu-api .
```

### 2. 컨테이너 실행

```bash
docker run -d -p 8080:8080 --name fridge-api fridge-menu-api
```

환경 변수 넘기기:

```bash
docker run -d -p 8080:8080 \
  -e APP_YOUTUBE_API_KEY=키값 \
  -e APP_CORS_ALLOWED_ORIGINS=http://localhost:5173 \
  --name fridge-api fridge-menu-api
```

### 3. 중지·삭제

```bash
docker stop fridge-api
docker rm fridge-api
```

---

## 프론트엔드와 함께 쓰기

1. **백엔드**: `docker compose up -d` 로 API 실행 (위처럼)
2. **프론트엔드**: 로컬에서 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 http://localhost:5173 접속.  
프론트는 기본값으로 `VITE_API_URL` 없이 `/api`를 쓰므로, Vite 프록시를 쓰지 않으면 **같은 호스트**에서 API를 호출할 수 없습니다.  
로컬에서는 보통 프론트만 5173, 백엔드만 8080에서 띄우므로, 프론트에서 API 주소를 8080으로 지정해야 합니다.

**방법 A**: `frontend/.env` (또는 `.env.local`) 에 추가

```env
VITE_API_URL=http://localhost:8080/api
```

**방법 B**: `frontend/vite.config.js` 에 프록시 설정

```js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
```

이후 `npm run dev` 하면 프론트가 `/api` 요청을 8080으로 넘깁니다.

---

## Docker 이미지 배포 (Render, Fly.io 등)

- **Render**: 저장소에 `backend/Dockerfile` 이 있으면, 서비스에서 Root Directory = `backend`, Runtime = **Docker** 로 선택 후 배포.
- **Fly.io**: `backend/` 에서 `fly launch` → `fly deploy`.
- **Railway**: GitHub 연동 후 Root Directory = `backend`, Dockerfile 자동 인식 후 배포.

자세한 내용은 [docs/DEPLOY_BACKEND.md](DEPLOY_BACKEND.md) 를 참고하세요.

---

## Docker Hub에 올리고 클라우드에서 쓰기

**Docker Cloud**는 없지만, **Docker Hub**에 이미지를 푸시해 두면 다른 PC나 클라우드(Render, Fly.io, Railway 등)에서 같은 이미지로 실행할 수 있습니다.

### 1. Docker Hub 가입·로그인

1. [hub.docker.com](https://hub.docker.com) 가입
2. 터미널에서 로그인:

```bash
docker login
```

(사용자명·비밀번호 입력)

### 2. 이미지 빌드 후 태그

Docker Hub 사용자명이 `myuser` 라고 할 때:

```bash
cd backend
docker build -t fridge-menu-api .
docker tag fridge-menu-api myuser/fridge-menu-api:latest
```

### 3. Docker Hub에 푸시

```bash
docker push myuser/fridge-menu-api:latest
```

이후 [hub.docker.com](https://hub.docker.com) → Repositories에서 `myuser/fridge-menu-api` 가 보이면 성공입니다.

### 4. 클라우드에서 이 이미지로 배포

- **Render**: New Web Service → **Deploy an existing image from a registry** → Image URL에 `myuser/fridge-menu-api:latest` 입력. 환경 변수(API 키, CORS)는 Render 대시보드에서 설정.
- **Railway**: New → **Deploy from Docker image** → `myuser/fridge-menu-api:latest` 입력 후 환경 변수 설정.
- **Fly.io**: `fly launch --image myuser/fridge-menu-api:latest` 로 기존 이미지로 앱 생성 후 `fly deploy` 생략하고 `fly secrets set` 만 하면 됩니다.

이미지를 Docker Hub에 올려두면, 로컬에서 Docker가 없어도 클라우드가 그 이미지를 pull 해서 실행해 줍니다.
