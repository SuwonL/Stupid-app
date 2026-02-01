# GitHub push 시 자동 배포 (Vercel + Fly.io, 무료)

이 저장소를 GitHub에 push하면 **프론트엔드는 Vercel**, **백엔드는 Fly.io**에 자동으로 배포되도록 설정하는 방법입니다.  
두 서비스 모두 **무료 티어**로 운영할 수 있습니다.

---

## 전체 흐름

| 단계 | 대상 | 하는 일 |
|------|------|----------|
| 1 | Vercel | GitHub 저장소 연결 → **push할 때마다 프론트 자동 배포** |
| 2 | Fly.io | GitHub Secrets에 `FLY_API_TOKEN` 추가 → **push할 때마다 백엔드 자동 배포** (`.github/workflows/deploy.yml`) |

---

## 1. Vercel: push 시 프론트 자동 배포 (무료)

Vercel은 GitHub 저장소를 **한 번만 연결**하면, 이후 `main` 브랜치에 push할 때마다 자동으로 빌드·배포합니다. 별도 워크플로 없이 무료로 사용 가능합니다.

### 설정 순서

1. **[vercel.com](https://vercel.com)** 가입 후 **GitHub 연동**
2. **Add New** → **Project** → 이 저장소(**Stupid-app**) 선택
3. **Configure Project** 에서:
   - **Root Directory**: `frontend` (또는 비워 두면 루트 `vercel.json` 사용)
   - **Build Command**: `npm run build` (Root가 `frontend`인 경우 기본값)
   - **Output Directory**: `dist`
4. **Deploy** 클릭

이후 **`main` 브랜치에 push할 때마다** Vercel이 자동으로 새 배포를 만듭니다.

### 환경 변수 (백엔드 연동 시)

- **Settings** → **Environment Variables**
- `VITE_API_URL` = `https://본인-fly앱이름.fly.dev/api`  
  (Fly.io 배포 후 아래 2단계에서 확인한 URL + `/api`)

---

## 2. Fly.io: push 시 백엔드 자동 배포 (무료)

이 저장소에는 **`.github/workflows/deploy.yml`** 이 들어 있습니다.  
`main` 브랜치에 push되면 GitHub Actions가 **Fly CLI**로 `backend/`를 Fly.io에 배포합니다.  
동작하려면 **GitHub Secrets**에 Fly API 토큰만 넣으면 됩니다.

### 2-1. Fly.io 앱이 아직 없다면 (최초 1회)

로컬에서 한 번만 실행해 앱을 만들고 `fly.toml`을 커밋해 두었으면, 이후에는 워크플로만 돌면 됩니다.

```powershell
cd backend
fly auth login
fly launch   # 앱 이름, 리전 등 질문에 답함 (이미 fly.toml 있으면 skip 가능)
```

`backend/fly.toml` 이 이미 있으면 `fly launch` 없이 바로 2-2로 가도 됩니다.

### 2-2. Fly API 토큰 생성

터미널에서:

```bash
fly auth token
```

또는 **Deploy 전용 토큰** (권장):

```bash
fly tokens create deploy -x 999999h
```

출력된 토큰 값을 복사합니다.

### 2-3. GitHub Secrets에 토큰 등록

1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. **Name**: `FLY_API_TOKEN`
4. **Value**: 위에서 복사한 Fly API 토큰
5. **Add secret** 저장

이후 **`main` 브랜치에 push할 때마다** `.github/workflows/deploy.yml` 이 실행되어 `backend/`가 Fly.io에 자동 배포됩니다.

### Fly.io 환경 변수 (API 키 등)

배포된 앱에 API 키를 넣으려면 Fly CLI로 설정합니다:

```bash
cd backend
fly secrets set APP_YOUTUBE_API_KEY=키값
fly secrets set APP_SPOONACULAR_API_KEY=키값
fly secrets set APP_CORS_ALLOWED_ORIGINS=https://본인-프로젝트.vercel.app
```

---

## 3. 무료 한도 정리

| 서비스 | 무료 내용 |
|--------|-----------|
| **Vercel** | Hobby 플랜: 개인/소규모 프로젝트 무료, GitHub push 시 자동 배포 |
| **Fly.io** | 소규모 VM 무료 할당(월 제한 있음). 무료 한도 내로 쓰려면 `fly.toml`의 `[[vm]]`에서 `memory_mb = 256` 사용 권장. `min_machines_running = 0` 이면 유휴 시 중지되어 절약 |
| **GitHub Actions** | 퍼블릭 저장소 무제한, 프라이빗은 월 2,000분 무료 |

---

## 4. 동작 확인

1. **Vercel**: 저장소 연결 후 `main`에 push → Vercel 대시보드 **Deployments**에 새 배포 생성
2. **Fly.io**: `FLY_API_TOKEN` 설정 후 `main`에 push → GitHub **Actions** 탭에서 "Deploy to Fly.io" 워크플로 성공 여부 확인
3. **연동**: Vercel 환경변수 `VITE_API_URL`을 Fly.io URL(`https://xxx.fly.dev/api`)로 두고, Fly.io `APP_CORS_ALLOWED_ORIGINS`에 Vercel URL 넣으면 배포된 사이트에서 API 호출이 동작합니다.

문제가 있으면 [Fly.io - Continuous Deployment](https://fly.io/docs/app-guides/continuous-deployment-with-github-actions/), [Vercel - Git](https://vercel.com/docs/concepts/git) 문서를 참고하세요.
