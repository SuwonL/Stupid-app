# Fly.io 안 될 때 → Render로 백엔드 옮기기

브라우저에서 `https://backend-little-cloud-7780.fly.dev/api/ingredients` 가 안 열리고, 다른 기기에서도 로드가 안 되면 **당신 네트워크/지역에서 Fly.io 접속이 안 되는 것**입니다. **Render**로 백엔드를 옮기면 해결되는 경우가 많습니다.

---

## 1. Render에서 백엔드 배포 (한 번만)

1. **[render.com](https://render.com)** 가입 (GitHub 연동 추천).
2. **Dashboard** → **New +** → **Web Service**.
3. **Connect a repository** → 이 GitHub 저장소(**Stupid-app**) 선택 → **Connect**.
4. 아래처럼 설정합니다.

| 항목 | 값 |
|------|-----|
| **Name** | `fridge-menu-api` (원하는 이름) |
| **Region** | **Singapore** (한국에서 상대적으로 가까움) 또는 Oregon |
| **Root Directory** | `backend` **반드시 입력** |
| **Runtime** | **Docker** |
| **Instance Type** | **Free** |

5. **Build Command** / **Start Command** 는 **비워 둡니다** (Docker 사용 시 무시됨).
6. **Advanced** → **Add Environment Variable** 에서:

| Key | Value |
|-----|--------|
| `APP_CORS_ALLOWED_ORIGINS` | `https://stupid-app.vercel.app` |

(실제 사용 중인 Vercel 주소로 바꾸세요. 여러 개면 쉼표로 구분.)

7. **Create Web Service** 클릭.
8. 빌드·배포가 끝날 때까지 기다립니다 (몇 분). **Logs**에서 "Your service is live at ..." 확인.
9. **Settings** → **Public URL** 복사.  
   예: `https://fridge-menu-api-xxxx.onrender.com`

---

## 2. 브라우저에서 Render 백엔드 확인

주소창에 아래 주소 입력 (위에서 복사한 URL로 바꾸기):

```text
https://본인-서비스이름.onrender.com/api/ingredients
```

**JSON(재료 목록)** 이 보이면 Render 백엔드는 정상입니다.

---

## 3. Vercel에서 API 주소를 Render로 변경

1. **Vercel** 대시보드 → 이 프로젝트 → **Settings** → **Environment Variables**.
2. **VITE_API_BASE_URL** (또는 **VITE_API_URL**) 값을 아래처럼 수정합니다.
   - **기존**: `https://backend-little-cloud-7780.fly.dev/api` (또는 비슷한 Fly 주소)
   - **변경**: `https://본인-서비스이름.onrender.com/api`  
     (Render Public URL + `/api`, 끝에 슬래시 없이)
3. **Save** 후 **Deployments** → 최신 배포에서 **Redeploy** 한 번 실행.

(Vite는 빌드 시점에 환경 변수를 넣기 때문에, 값을 바꾼 뒤 **한 번 더 배포**해야 적용됩니다.)

---

## 4. Render CORS에 Vercel 주소 확인

Render 서비스 → **Environment** 탭에서:

- `APP_CORS_ALLOWED_ORIGINS` = `https://본인-vercel-도메인.vercel.app`  
  (Vercel에서 실제로 접속하는 주소와 정확히 일치해야 함)

저장 후 재배포는 필요 없고, 다음 요청부터 적용됩니다.

---

## 5. 동작 확인

1. Vercel 사이트 새로고침 (또는 Redeploy 완료 후 접속).
2. 재료 목록이 로드되는지 확인.
3. 재료 선택 후 **메뉴 추천**이 되는지 확인.

---

## 참고

- **Render 무료**: 15분 동안 요청이 없으면 슬립. 첫 요청 시 30초~1분 걸릴 수 있음. 그때는 재시도 버튼 한 번 더 누르면 됨.
- Fly.io는 그대로 두어도 됩니다. Vercel이 Render 주소로만 요청하므로 Fly는 더 이상 쓰이지 않습니다.
