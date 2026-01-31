# 백엔드 무료 배포 가이드

Spring Boot 백엔드(냉장고 메뉴 API)를 무료로 배포할 수 있는 서비스 추천과 단계별 설정 방법입니다.

---

## 추천 서비스 비교

| 서비스 | 무료 내용 | 비고 |
|--------|-----------|------|
| **Render** | 512MB RAM, 15분 미사용 시 슬립 → 요청 시 재기동(첫 요청 30초~1분 지연) | **가장 추천** — 크레딧 소진 없이 계속 사용 가능 |
| **Railway** | $5 크레딧(약 1개월), 이후 유료 전환 필요 | 설정 간단, 크레딧 끝나면 서비스 중단 |
| **Fly.io** | 소규모 VM 무료(월 제한 있음) | Docker 필요, 여러 리전 배포 가능 |

**이 프로젝트에는 Render를 가장 추천합니다.**  
크레딧이 없어져도 서비스가 완전히 꺼지지 않고, 15분 동안 요청이 없을 때만 슬립했다가 다음 요청 시 깨어납니다.

---

## 방법 1: Render로 배포 (권장)

### 1. 준비

- GitHub에 이 프로젝트가 올라가 있어야 합니다.
- [Render](https://render.com) 가입(이메일 또는 GitHub 연동).

### 2. Web Service 생성

1. [Render 대시보드](https://dashboard.render.com) 로그인 후 **New +** → **Web Service** 클릭.
2. **Connect a repository** 에서 사용할 저장소 선택 후 **Connect**.
3. 다음처럼 설정합니다.

| 항목 | 값 |
|------|-----|
| **Name** | `fridge-menu-api` (원하는 이름) |
| **Region** | Singapore 또는 Oregon (가까운 곳) |
| **Root Directory** | `backend` **반드시 입력** |
| **Runtime** | Docker 제거 후 **Native** (또는 Build/Start 명령으로 배포하는 방식 선택) |

Render에서 **Native** 환경이 없으면 **Build Command** / **Start Command** 만 넣어도 됩니다.

### 3. Build & Start 설정

| 항목 | 값 |
|------|-----|
| **Build Command** | `./mvnw -DskipTests package` |
| **Start Command** | `java -jar target/fridge-menu-api-0.0.1-SNAPSHOT.jar` |

- 저장소에 **Unix용 `mvnw`** 파일이 있어야 Render(Linux)에서 빌드됩니다. **`mvnw.cmd`만 있고 `mvnw`가 없다면**:
  - **방법 A**: [Maven Wrapper](https://github.com/apache/maven-wrapper) 에서 `mvnw`(Unix 스크립트)를 받아 `backend/mvnw` 로 추가 후 커밋.
  - **방법 B**: Render에서 **Docker**로 배포: `backend/` 에 아래처럼 `Dockerfile`을 만들고, Render 서비스의 **Runtime**을 **Docker**로 선택한 뒤 Build/Start는 비워 둡니다.

```dockerfile
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY pom.xml ./
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn -DskipTests package -B

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/fridge-menu-api-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

- Docker 사용 시 Render 서비스에서 **Root Directory** = `backend`, **Runtime** = **Docker** 로 두면 위 Dockerfile로 빌드·실행됩니다.

### 4. 환경 변수

**Environment** 탭에서 **Add Environment Variable** 로 아래를 추가합니다.

| Key | Value | 비고 |
|-----|--------|------|
| `APP_YOUTUBE_API_KEY` | (본인 YouTube Data API v3 키) | 유튜브 추천용 |
| `APP_CORS_ALLOWED_ORIGINS` | `https://본인-프론트.vercel.app` | Vercel 배포 주소. 쉼표로 여러 개 가능 |

- 나중에 프론트 주소가 바뀌면 `APP_CORS_ALLOWED_ORIGINS` 만 수정하면 됩니다.

### 5. 배포

1. **Create Web Service** 클릭.
2. 자동으로 빌드 후 배포됩니다. 로그에서 **Build successful**, **Your service is live at ...** 메시지를 확인합니다.
3. **Settings** → **Public URL** 에서 URL을 복사합니다.  
   예: `https://fridge-menu-api-xxxx.onrender.com`

### 6. 동작 확인

브라우저 또는 터미널에서:

```text
https://본인-서비스-이름.onrender.com/api/ingredients
```

JSON(재료 목록)이 보이면 정상입니다.  
처음 15분 미사용 후에는 첫 요청 시 30초~1분 정도 걸릴 수 있습니다(무료 슬립 해제).

---

## 방법 2: Railway로 배포 (체험용)

Railway는 초기에 **$5 크레딧**을 주고, 사용량에 따라 차감됩니다. 크레딧이 끝나면 서비스가 중단되므로 “잠깐 무료로 써보기”용으로 적합합니다.

### 1. 준비

- [Railway](https://railway.app) 가입(GitHub 연동 권장).

### 2. 프로젝트 생성

1. **New Project** → **Deploy from GitHub repo** → 이 저장소 선택.
2. 생성된 서비스 클릭 → **Settings** 이동.

### 3. 설정

| 항목 | 값 |
|------|-----|
| **Root Directory** | `backend` |
| **Build Command** | `./mvnw -DskipTests package` (또는 Railway가 Maven 감지 시 자동) |
| **Start Command** | `java -jar target/fridge-menu-api-0.0.1-SNAPSHOT.jar` |
| **Watch Paths** | `backend/**` (선택) |

### 4. 환경 변수

**Variables** 탭에서 추가:

- `APP_YOUTUBE_API_KEY` = (YouTube API 키)
- `APP_CORS_ALLOWED_ORIGINS` = `https://본인-프론트.vercel.app`

### 5. 도메인 부여

**Settings** → **Networking** → **Generate Domain** 클릭해 공개 URL을 만듭니다.  
이 URL을 프론트엔드의 `VITE_API_URL` 에 사용합니다.

---

## 방법 3: Fly.io로 배포 (Docker 사용)

Fly.io는 앱을 **Docker 이미지**로 배포합니다. 무료 할당량 안에서 사용 가능합니다.

### 1. Fly CLI 설치

- Windows (PowerShell):  
  `irm get.fly.io | iex`
- 또는 [설치 문서](https://fly.io/docs/hands-on/install-flyctl/) 참고.

### 2. 로그인

```bash
fly auth login
```

### 3. backend 폴더에 Dockerfile 추가

`backend/Dockerfile` 파일을 다음처럼 만듭니다.

```dockerfile
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/fridge-menu-api-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

로컬에서 먼저 JAR를 만든 뒤 배포하거나, Fly의 빌드 단계에서 Maven을 실행하도록 설정할 수 있습니다.  
(멀티 스테이지 Dockerfile로 `eclipse-temurin:17-jdk` 에서 `./mvnw package` 후 JAR만 복사하는 방식도 가능합니다.)

### 4. 앱 생성 및 배포

```bash
cd backend
fly launch   # 앱 이름, 리전 등 질문에 답함
fly deploy
```

### 5. 환경 변수

```bash
fly secrets set APP_YOUTUBE_API_KEY=키값
fly secrets set APP_CORS_ALLOWED_ORIGINS=https://본인-프론트.vercel.app
```

---

## 배포 후: 프론트엔드와 연결

백엔드를 어디에 올렸든, **프론트엔드(Vercel)** 가 그 주소를 쓰도록 해야 합니다.

### 1. Vercel 환경 변수

1. Vercel 프로젝트 → **Settings** → **Environment Variables**
2. 추가:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://백엔드-배포-URL/api`  
     - Render: `https://xxx.onrender.com/api`  
     - Railway: `https://xxx.up.railway.app/api`  
     - Fly: `https://xxx.fly.dev/api`
3. **Save** 후 **Deployments** 에서 최신 배포 **Redeploy** (한 번 다시 배포해야 변수 적용).

### 2. CORS 확인

백엔드의 `APP_CORS_ALLOWED_ORIGINS` 에 **실제 Vercel 주소**가 들어가 있어야 합니다.

- 예: `https://fridge-menu.vercel.app`
- 여러 개면 쉼표로: `https://aaa.vercel.app,https://bbb.vercel.app`

저장 후 백엔드 서비스를 한 번 다시 배포하면, 배포된 사이트에서 메뉴 추천이 동작합니다.

---

## 참고 사항

- **H2 DB**: 현재 설정은 **in-memory**라, 백엔드가 재시작되면(슬립 해제, 재배포 등) 재료/데이터가 초기화됩니다. “무료로 API만 올려서 프론트와 연동” 용도로는 문제 없습니다.
- **무료 슬립(Render)**: 15분 동안 요청이 없으면 슬립합니다. 다음 요청 시 자동으로 깨어나며, 첫 응답까지 30초~1분 걸릴 수 있습니다.
- **YouTube API**: 무료 할당량이 있으므로, 키만 잘 넣어두면 유튜브 추천이 동작합니다.

문제가 있으면 각 서비스 문서를 참고하세요.

- [Render - Deploy](https://render.com/docs/deploys)
- [Railway - Deploy](https://docs.railway.app/deploy/deployments)
- [Fly.io - Deploy](https://fly.io/docs/languages-and-frameworks/)
